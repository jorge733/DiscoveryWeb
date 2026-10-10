"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from "three";
import { grassFragment, grassVertex } from "@/shaders/grass";
import { heightAt, mountainMask } from "@/lib/terrain";
import type { Atmosphere } from "@/lib/timeOfDay";

/** Region of the meadow that gets grass: around the camera path. */
const AREA = { minX: -42, maxX: 42, minZ: -140, maxZ: 16 };

function bladeGeometry(segments: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  const width = 0.045;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const w = width * (1 - t) * (1 - t * 0.3);
    const curve = t * t * 0.12; // slight natural lean
    if (i === segments) {
      pos.push(0, t, curve);
    } else {
      pos.push(-w, t, curve, w, t, curve);
    }
  }
  for (let i = 0; i < segments - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (segments - 1) * 2;
  idx.push(last, last + 1, last + 2);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

export interface GrassUniformsTarget {
  pointer: Vector3;
  pointerForce: number;
  gust: number;
}

export function Grass({
  count,
  atmosphere,
  interaction,
}: {
  count: number;
  atmosphere: Atmosphere;
  interaction: GrassUniformsTarget;
}) {
  const material = useRef<ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const blade = bladeGeometry(5);
    const geo = new InstancedBufferGeometry();
    geo.index = blade.index;
    geo.setAttribute("position", blade.getAttribute("position"));

    const offsets = new Float32Array(count * 3);
    const params = new Float32Array(count * 4);
    let n = 0;
    let guard = 0;
    while (n < count && guard < count * 4) {
      guard++;
      const x = AREA.minX + Math.random() * (AREA.maxX - AREA.minX);
      // Biased towards the camera start, where blades are seen up close.
      const z = AREA.maxZ - Math.pow(Math.random(), 1.9) * (AREA.maxZ - AREA.minZ);
      const m = mountainMask(x, z);
      if (m > 0.2 || Math.random() < m * 5) continue;
      // Clumping: denser patches with occasional thin spots.
      const clump = Math.sin(x * 0.35) * Math.cos(z * 0.28) + Math.sin(x * 0.9 + z * 0.6) * 0.5;
      if (clump < -0.9 && Math.random() < 0.7) continue;

      offsets[n * 3] = x;
      offsets[n * 3 + 1] = heightAt(x, z) - 0.05;
      offsets[n * 3 + 2] = z;
      params[n * 4] = (0.55 + Math.random() * 0.7) * (1 + Math.max(clump, 0) * 0.35);
      params[n * 4 + 1] = Math.random() * Math.PI * 2;
      params[n * 4 + 2] = Math.random();
      params[n * 4 + 3] = Math.random();
      n++;
    }
    geo.setAttribute("aOffset", new InstancedBufferAttribute(offsets, 3));
    geo.setAttribute("aParams", new InstancedBufferAttribute(params, 4));
    geo.instanceCount = n;
    return geo;
  }, [count]);

  const uniforms = useMemo(
    () =>
      UniformsUtils.merge([
        UniformsLib.fog,
        {
          uTime: { value: 0 },
          uPointer: { value: new Vector3(0, 0, 999) },
          uPointerForce: { value: 0 },
          uGust: { value: 0 },
          uSunDir: { value: new Vector3(0, 0.3, -1) },
          uBase: { value: new Color("#28391a") },
          uTip: { value: new Color("#7d9a3c") },
          uDry: { value: new Color("#b3a35a") },
          uSunColor: { value: new Color() },
          uSunIntensity: { value: 1 },
          uSkyColor: { value: new Color() },
        },
      ]),
    [],
  );

  useFrame((state) => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = state.clock.elapsedTime;
    u.uPointer.value.copy(interaction.pointer);
    u.uPointerForce.value = interaction.pointerForce;
    u.uGust.value = interaction.gust;
    u.uSunColor.value.copy(atmosphere.sun);
    u.uSunIntensity.value = atmosphere.sunIntensity;
    u.uSkyColor.value.copy(atmosphere.sky);
    const el = (atmosphere.elevation * Math.PI) / 180;
    const az = (atmosphere.azimuth * Math.PI) / 180;
    u.uSunDir.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
  });

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={grassVertex}
        fragmentShader={grassFragment}
        uniforms={uniforms}
        side={DoubleSide}
        fog
      />
    </mesh>
  );
}
