"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useMemo } from "react";
import { Vector2 } from "three";
import { listenPointer, updateJourney, updatePointer } from "@/lib/journey";
import { useApp } from "@/lib/store";
import { Nature, type Quality } from "./Nature";
import { OceanWorld } from "./ocean/OceanWorld";

function detectQuality(): { quality: Quality; dpr: [number, number] } {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (coarse || small) {
    return {
      quality: { grass: 28000, terrainSegments: 180, particles: 350, oceanRings: 140, oceanSegments: 220, stars: 40000, postfx: "lite" },
      dpr: [1, 1.5],
    };
  }
  if (cores <= 4) {
    return {
      quality: { grass: 55000, terrainSegments: 260, particles: 600, oceanRings: 180, oceanSegments: 320, stars: 70000, postfx: "lite" },
      dpr: [1, 1.5],
    };
  }
  return {
    quality: { grass: 95000, terrainSegments: 360, particles: 900, oceanRings: 220, oceanSegments: 480, stars: 100000, postfx: "full" },
    dpr: [1, 2],
  };
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

const CA_OFFSET = new Vector2(0.00035, 0.00035);

export default function Experience() {
  const setReady = useApp((s) => s.setReady);
  const { quality, dpr } = useMemo(detectQuality, []);

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <Canvas
        dpr={dpr}
        eventSource={document.body}
        eventPrefix="client"
        camera={{ fov: 56, near: 0.1, far: 8000, position: [0, 2, 14] }}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
        onCreated={() => {
          // Let a couple of frames render (shader compile) before announcing readiness.
          requestAnimationFrame(() => requestAnimationFrame(setReady));
        }}
      >
        <Director />
        <Nature quality={quality} />
        <OceanWorld quality={quality} />
        <EffectComposer multisampling={quality.postfx === "full" ? 4 : 0}>
          <Bloom mipmapBlur intensity={0.45} luminanceThreshold={1.1} luminanceSmoothing={0.3} radius={0.6} />
          <ChromaticAberration offset={CA_OFFSET} radialModulation modulationOffset={0.35} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
