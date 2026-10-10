"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from "three";
import { particlesFragment, particlesVertex } from "@/shaders/grass";
import { heightAt } from "@/lib/terrain";
import type { Atmosphere } from "@/lib/timeOfDay";

/** Pollen drifting in daylight that turns into fireflies at dusk. */
export function Particles({ count, atmosphere }: { count: number; atmosphere: Atmosphere }) {
  const material = useRef<ShaderMaterial>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 70;
      const z = 14 - Math.random() * 90;
      pos[i * 3] = x;
      pos[i * 3 + 1] = heightAt(x, z) + 0.3 + Math.random() * 4.5;
      pos[i * 3 + 2] = z;
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seed, 4));
    return geo;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDusk: { value: 0 },
      uPixelRatio: { value: 1 },
      uDayColor: { value: new Color("#fff4d6") },
      uNightColor: { value: new Color("#d9ff7a") },
    }),
    [],
  );

  useFrame((state) => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = state.clock.elapsedTime;
    u.uDusk.value = atmosphere.dusk;
    u.uPixelRatio.value = dpr;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={particlesVertex}
        fragmentShader={particlesFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
