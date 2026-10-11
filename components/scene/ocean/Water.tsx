"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, IUniform, Mesh, ShaderMaterial } from "three";
import { oceanFragment, oceanVertex } from "@/shaders/ocean";

/**
 * A disc of vertices dense at the centre and sparse at the rim. It follows the camera,
 * so detail always sits where the eye is while the sea reaches the horizon.
 */
function radialGrid(rings: number, segments: number, radius: number, innerSpacing: number) {
  // r(i) = a * (e^(b*i) - 1), with r(rings) = radius and r'(0) ≈ innerSpacing.
  let lo = 1e-4;
  let hi = 1;
  for (let k = 0; k < 60; k++) {
    const b = (lo + hi) / 2;
    const a = radius / (Math.exp(b * rings) - 1);
    if (a * b > innerSpacing) lo = b;
    else hi = b;
  }
  const b = (lo + hi) / 2;
  const a = radius / (Math.exp(b * rings) - 1);

  const positions = new Float32Array((1 + rings * segments) * 3);
  let v = 3; // vertex 0 is the centre
  for (let i = 1; i <= rings; i++) {
    const r = a * (Math.exp(b * i) - 1);
    for (let j = 0; j < segments; j++) {
      const t = (j / segments) * Math.PI * 2;
      positions[v++] = Math.cos(t) * r;
      positions[v++] = 0;
      positions[v++] = Math.sin(t) * r;
    }
  }

  const indices: number[] = [];
  const at = (ring: number, seg: number) => 1 + (ring - 1) * segments + (seg % segments);
  for (let j = 0; j < segments; j++) indices.push(0, at(1, j + 1), at(1, j));
  for (let i = 1; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a0 = at(i, j);
      const a1 = at(i, j + 1);
      const b0 = at(i + 1, j);
      const b1 = at(i + 1, j + 1);
      indices.push(a0, a1, b0, a1, b1, b0);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

export function Water({
  rings,
  segments,
  uniforms,
}: {
  rings: number;
  segments: number;
  uniforms: Record<string, IUniform>;
}) {
  const mesh = useRef<Mesh>(null);
  const geometry = useMemo(() => radialGrid(rings, segments, 5000, 0.2), [rings, segments]);
  const material = useMemo(
    () => new ShaderMaterial({ vertexShader: oceanVertex, fragmentShader: oceanFragment, uniforms }),
    [uniforms],
  );

  useFrame(({ camera }) => {
    mesh.current?.position.set(camera.position.x, 0, camera.position.z);
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />;
}
