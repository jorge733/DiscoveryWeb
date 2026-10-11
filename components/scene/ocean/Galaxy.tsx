"use client";

import { forwardRef, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, IUniform, ShaderMaterial } from "three";
import { galaxyFragment, galaxyVertex } from "@/shaders/galaxy";

export const GALAXY_RADIUS = 520;

const CORE = new Color("#ffd2a1");
const ARM = new Color("#9ab8ff");
const RIM = new Color("#5d6fe0");
const NEBULA = new Color("#ff6f9f");
const DUST = new Color("#7a5cff");

/** A procedurally generated spiral galaxy: arms, a bulging core, pink star-forming regions and dust. */
function buildGalaxy(count: number) {
  const dustCount = Math.floor(count * 0.015);
  const total = count + dustCount;
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const size = new Float32Array(total);
  const rand = new Float32Array(total);
  const arms = 4;
  const spin = 0.8;
  const c = new Color();
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  for (let i = 0; i < total; i++) {
    const isDust = i >= count;
    const core = !isDust && Math.random() < 0.18;
    const r = core ? Math.pow(Math.random(), 2.2) * GALAXY_RADIUS * 0.22 : Math.pow(Math.random(), 1.35) * GALAXY_RADIUS;
    const rn = r / GALAXY_RADIUS;
    const branch = ((i % arms) / arms) * Math.PI * 2;
    const angle = branch + rn * spin * Math.PI * 2;
    const scatter = (core ? 0.5 : 0.14 + rn * 0.14) * GALAXY_RADIUS * Math.pow(Math.random(), 2.5);
    const sa = Math.random() * Math.PI * 2;

    pos[i * 3] = Math.cos(angle) * r + Math.cos(sa) * scatter;
    pos[i * 3 + 2] = Math.sin(angle) * r + Math.sin(sa) * scatter;
    pos[i * 3 + 1] = gauss() * GALAXY_RADIUS * (core ? 0.07 * (1 - rn * 3) : 0.018);

    if (isDust) {
      c.copy(Math.random() < 0.5 ? NEBULA : DUST).multiplyScalar(0.4);
      size[i] = 40 + Math.random() * 70;
    } else {
      c.copy(CORE).lerp(ARM, Math.min(rn * 1.8, 1)).lerp(RIM, Math.max(rn - 0.55, 0) * 1.6);
      if (!core && Math.random() < 0.035) c.copy(NEBULA);
      const bright = 0.35 + Math.pow(Math.random(), 3) * 1.6 + (core ? 0.6 : 0);
      c.multiplyScalar(bright);
      size[i] = 1 + Math.pow(Math.random(), 4) * 4;
    }
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    rand[i] = Math.random();
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aColor", new BufferAttribute(col, 3));
  geo.setAttribute("aSize", new BufferAttribute(size, 1));
  geo.setAttribute("aRand", new BufferAttribute(rand, 1));
  return geo;
}

export const Galaxy = forwardRef<Group, { count: number; uniforms: Record<string, IUniform> }>(function Galaxy(
  { count, uniforms },
  ref,
) {
  const geometry = useMemo(() => buildGalaxy(count), [count]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: galaxyVertex,
        fragmentShader: galaxyFragment,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [uniforms],
  );

  return (
    <group ref={ref}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
});
