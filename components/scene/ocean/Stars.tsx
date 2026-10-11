"use client";

import { useMemo } from "react";
import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, IUniform, ShaderMaterial } from "three";
import { nightDomeFragment, nightDomeVertex, starsFragment, starsVertex } from "@/shaders/galaxy";

const RADIUS = 3000;

/** Background starfield plus the additive night gradient. Lives in a group that follows the camera. */
export function Stars({
  count,
  starUniforms,
  domeUniforms,
}: {
  count: number;
  starUniforms: Record<string, IUniform>;
  domeUniforms: Record<string, IUniform>;
}) {
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Uniform on the upper hemisphere (a little below the horizon to avoid a hard edge).
      const y = Math.random() * 1.05 - 0.05;
      const t = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(t) * rr * RADIUS;
      pos[i * 3 + 1] = y * RADIUS;
      pos[i * 3 + 2] = Math.sin(t) * rr * RADIUS;
      size[i] = 1 + Math.pow(Math.random(), 6) * 3.5;
      phase[i] = Math.random();
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new BufferAttribute(size, 1));
    geo.setAttribute("aPhase", new BufferAttribute(phase, 1));
    return geo;
  }, [count]);

  const starMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starsVertex,
        fragmentShader: starsFragment,
        uniforms: starUniforms,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [starUniforms],
  );
  const domeMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: nightDomeVertex,
        fragmentShader: nightDomeFragment,
        uniforms: domeUniforms,
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [domeUniforms],
  );

  return (
    <>
      <mesh material={domeMaterial} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[RADIUS + 200, 32, 16]} />
      </mesh>
      <points geometry={geometry} material={starMaterial} frustumCulled={false} />
    </>
  );
}
