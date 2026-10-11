"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BackSide, BoxGeometry, Mesh, ShaderMaterial } from "three";
import type { SkyUniforms } from "@/lib/skyParams";
import { skyDomeFragment, skyDomeVertex } from "@/shaders/sky";

const box = new BoxGeometry(1, 1, 1);

/** Physical sky with sun disc and procedural clouds, driven by shared sky uniforms. */
export function SkyDome({
  uniforms,
  distance = 4500,
  lowPrecision = false,
}: {
  uniforms: SkyUniforms;
  distance?: number;
  lowPrecision?: boolean;
}) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyDomeVertex,
        fragmentShader: skyDomeFragment,
        uniforms,
        side: BackSide,
        depthWrite: false,
        defines: lowPrecision ? { LOW_PRECISION: 1 } : {},
      }),
    [uniforms, lowPrecision],
  );

  const mesh = useRef<Mesh>(null);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    // Centred on the camera so the dome can never be left behind.
    mesh.current?.position.copy(state.camera.position);
  });

  return <mesh ref={mesh} geometry={box} material={material} scale={distance} frustumCulled={false} />;
}
