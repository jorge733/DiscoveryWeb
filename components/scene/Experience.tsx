"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { ACESFilmicToneMapping } from "three";
import { useApp } from "@/lib/store";
import { Nature, type Quality } from "./Nature";

function detectQuality(): { quality: Quality; dpr: [number, number] } {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (coarse || small) {
    return { quality: { grass: 28000, terrainSegments: 180, particles: 350 }, dpr: [1, 1.5] };
  }
  if (cores <= 4) {
    return { quality: { grass: 55000, terrainSegments: 260, particles: 600 }, dpr: [1, 1.5] };
  }
  return { quality: { grass: 95000, terrainSegments: 360, particles: 900 }, dpr: [1, 2] };
}

export default function Experience() {
  const setReady = useApp((s) => s.setReady);
  const { quality, dpr } = useMemo(detectQuality, []);

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <Canvas
        dpr={dpr}
        eventSource={document.body}
        eventPrefix="client"
        camera={{ fov: 56, near: 0.1, far: 6000, position: [0, 2, 14] }}
        gl={{ antialias: true, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping }}
        onCreated={() => {
          // Let a couple of frames render (shader compile) before announcing readiness.
          requestAnimationFrame(() => requestAnimationFrame(setReady));
        }}
      >
        <Nature quality={quality} />
      </Canvas>
    </div>
  );
}
