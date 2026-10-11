"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { Vector2 } from "three";
import { probeDevice, type DeviceInfo } from "@/lib/device";
import { journey, listenPointer, updateJourney, updatePointer } from "@/lib/journey";
import { useApp } from "@/lib/store";
import { DebugPanel, stats } from "../ui/DebugPanel";
import { Nature, type Quality } from "./Nature";
import { OceanWorld } from "./ocean/OceanWorld";

function qualityFor(device: DeviceInfo): { quality: Quality; dpr: number } {
  const lowPrecision = !device.highp;
  switch (device.tier) {
    case "low":
      return {
        quality: { grass: 14000, terrainSegments: 140, particles: 200, oceanRings: 110, oceanSegments: 180, stars: 22000, postfx: "off", lowPrecision },
        dpr: 1,
      };
    case "mid":
      return {
        quality: { grass: device.mobile ? 26000 : 55000, terrainSegments: device.mobile ? 180 : 260, particles: 400, oceanRings: 150, oceanSegments: 260, stars: device.mobile ? 40000 : 70000, postfx: "lite", lowPrecision },
        dpr: Math.min(window.devicePixelRatio, 1.5),
      };
    default:
      return {
        quality: { grass: 95000, terrainSegments: 360, particles: 900, oceanRings: 220, oceanSegments: 480, stars: 100000, postfx: "full", lowPrecision },
        dpr: Math.min(window.devicePixelRatio, 2),
      };
  }
}

/** Advances shared journey/pointer state once per frame, before the worlds read it. */
function Director() {
  const entered = useApp((s) => s.entered);
  useEffect(listenPointer, []);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    updateJourney(dt, entered);
    updatePointer(dt);
  }, -1);
  return null;
}

/**
 * Watches the real frame rate and sheds load when the device can't keep up:
 * first resolution, then post-processing.
 */
function Governor({ onDegrade }: { onDegrade: () => void }) {
  const setDpr = useThree((s) => s.setDpr);
  const dpr = useThree((s) => s.viewport.dpr);
  const acc = useRef({ frames: 0, time: 0, settle: 3 });

  useFrame((_, delta) => {
    const a = acc.current;
    if (a.settle > 0) {
      a.settle -= delta; // ignore shader compilation and world swaps
      return;
    }
    a.frames++;
    a.time += delta;
    if (a.time < 2) return;
    const fps = a.frames / a.time;
    stats.fps = fps;
    a.frames = 0;
    a.time = 0;
    if (fps < 34 && dpr > 1) {
      setDpr(Math.max(1, dpr - 0.25));
      a.settle = 1;
    } else if (fps < 26 && dpr <= 1) {
      onDegrade();
      a.settle = 2;
    }
  });

  useEffect(() => {
    stats.dpr = dpr;
  }, [dpr]);
  return null;
}

/** Builds the ocean world only once the visitor is heading there, saving memory on phones. */
function LazyOcean({ quality }: { quality: Quality }) {
  const [show, setShow] = useState(false);
  useFrame(() => {
    if (!show && journey.s > 1.5) setShow(true);
  });
  return show ? <OceanWorld quality={quality} /> : null;
}

const CA_OFFSET = new Vector2(0.00035, 0.00035);

export default function Experience() {
  const setReady = useApp((s) => s.setReady);
  const device = useMemo(probeDevice, []);
  const { quality, dpr } = useMemo(() => qualityFor(device), [device]);
  const [postfx, setPostfx] = useState(quality.postfx);

  useEffect(() => {
    stats.tier = device.tier;
    stats.postfx = postfx;
  }, [device, postfx]);

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <Canvas
        dpr={dpr}
        eventSource={document.body}
        eventPrefix="client"
        camera={{ fov: 56, near: 0.25, far: 7000, position: [0, 2, 14] }}
        gl={{ antialias: postfx === "off", powerPreference: "high-performance", stencil: false }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            stats.contextLost++;
          });
          // Let a couple of frames render (shader compile) before announcing readiness.
          requestAnimationFrame(() => requestAnimationFrame(setReady));
        }}
      >
        <Director />
        <Governor onDegrade={() => setPostfx("off")} />
        <Nature quality={quality} />
        <LazyOcean quality={quality} />
        {postfx === "full" && (
          <EffectComposer multisampling={4}>
            <Bloom mipmapBlur intensity={0.45} luminanceThreshold={1.1} luminanceSmoothing={0.3} radius={0.6} />
            <ChromaticAberration offset={CA_OFFSET} radialModulation modulationOffset={0.35} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
        {postfx === "lite" && (
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur intensity={0.4} luminanceThreshold={1.1} luminanceSmoothing={0.3} radius={0.5} levels={5} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>
      <DebugPanel device={device} />
    </div>
  );
}
