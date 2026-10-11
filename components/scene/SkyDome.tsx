"use client";

import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useMemo } from "react";
import { Sky } from "three/examples/jsm/objects/Sky.js";

export type SkyUniforms = Sky["material"]["uniforms"];

/** three's physical sky (with procedural clouds), scaled to sit behind everything. */
export const SkyDome = forwardRef<SkyUniforms, { distance?: number; clouds?: number }>(function SkyDome(
  { distance = 4500, clouds = 0.35 },
  ref,
) {
  const sky = useMemo(() => {
    const s = new Sky();
    s.scale.setScalar(distance);
    const u = s.material.uniforms;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.82;
    u.cloudCoverage.value = clouds;
    u.cloudDensity.value = 0.45;
    u.cloudElevation.value = 0.55;
    u.cloudSpeed.value = 0.00003;
    return s;
  }, [distance, clouds]);

  useImperativeHandle(ref, () => sky.material.uniforms, [sky]);

  useFrame((state) => {
    sky.material.uniforms.time.value = state.clock.elapsedTime;
  });

  return <primitive object={sky} />;
});
