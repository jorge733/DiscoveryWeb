"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, Group, MathUtils, Matrix4, PerspectiveCamera, Plane, Raycaster, Vector3, Vector4 } from "three";
import { ambience } from "@/lib/audio";
import { journey, pointer, pointerRecentlyMoved } from "@/lib/journey";
import { createOceanAtmosphere, sampleOcean } from "@/lib/oceanSky";
import { VALLEY_END } from "@/lib/worlds";
import { RIPPLE_COUNT, WAVES } from "@/shaders/ocean";
import type { Quality } from "../Nature";
import { SkyDome } from "../SkyDome";
import { createSkyUniforms, setSky } from "@/lib/skyParams";
import { Galaxy, GALAXY_RADIUS } from "./Galaxy";
import { Stars } from "./Stars";
import { Water } from "./Water";

/** Where the galaxy hangs in the sky, relative to the camera. */
const GALAXY_DIR = new Vector3(0.12, Math.sin(MathUtils.degToRad(36)), -Math.cos(MathUtils.degToRad(36))).normalize();
const GALAXY_DISTANCE = 1500;

const raycaster = new Raycaster();
const seaPlane = new Plane(new Vector3(0, 1, 0), 0);
const hitPoint = new Vector3();
const tmpLook = new Vector3();
const localOrigin = new Vector3();
const localDir = new Vector3();
const inverse = new Matrix4();

/** World 2: the open sea from sunset to a night sky crowned by an interactive galaxy. */
export function OceanWorld({ quality }: { quality: Quality }) {
  const { gl, camera, viewport } = useThree();
  const group = useRef<Group>(null);
  const skyFollow = useRef<Group>(null);
  const galaxy = useRef<Group>(null);
  const sky = useMemo(createSkyUniforms, []);
  const sunDir = useMemo(() => new Vector3(), []);
  const atmosphere = useMemo(createOceanAtmosphere, []);

  const state = useRef({
    parallax: { x: 0, y: 0 },
    ripple: 0,
    lastRipple: 0,
    lastRippleAt: new Vector3(0, 0, 1e5),
    presses: 0,
    pull: 0,
    audioTick: 0,
  });

  const water = useMemo(
    () => ({
      // uTime comes from the shared sky uniforms below.
      uWaves: { value: WAVES.map(([x, y, s, l]) => new Vector4(x, y, s, l)) },
      uRipples: { value: Array.from({ length: RIPPLE_COUNT }, () => new Vector4(0, 0, -100, 0)) },
      uSwell: { value: 1 },
      uDeep: { value: new Color() },
      uScatter: { value: new Color("#0d4d48") },
      uSunColor: { value: new Color() },
      uSunStrength: { value: 1 },
      uNight: { value: 0 },
      uNightSky: { value: new Color("#0a1430") },
      uGalaxyDir: { value: GALAXY_DIR.clone() },
      uGalaxyColor: { value: new Color("#241d48") },
      uFogDensity: { value: 0.0011 },
      ...sky,
    }),
    [],
  );
  const galaxyUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRadius: { value: GALAXY_RADIUS },
      uPointer: { value: new Vector3(0, 0, 1e5) },
      uPull: { value: 0 },
      uShock: { value: new Vector4(0, 0, -100, 0) },
      uPixelRatio: { value: 1 },
      uSizeScale: { value: 1100 },
      uOpacity: { value: 0 },
    }),
    [],
  );
  const starUniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 }, uOpacity: { value: 0 } }), []);
  const domeUniforms = useMemo(
    () => ({
      uNight: { value: 0 },
      uNightSky: water.uNightSky,
      uGalaxyDir: water.uGalaxyDir,
      uGalaxyColor: water.uGalaxyColor,
    }),
    [water],
  );

  useFrame((r3f, delta) => {
    const active = journey.world === "ocean";
    if (group.current) group.current.visible = active;
    if (!active) return;

    const st = state.current;
    const dt = Math.min(delta, 0.1);
    const t = r3f.clock.elapsedTime;
    const s = journey.s;
    sampleOcean(s, atmosphere);

    // Camera: descend out of the clouds, sail, then lift the gaze to the stars.
    st.parallax.x = MathUtils.damp(st.parallax.x, r3f.pointer.x, 2.5, dt);
    st.parallax.y = MathUtils.damp(st.parallax.y, r3f.pointer.y, 2.5, dt);
    const descend = 1 - MathUtils.smoothstep(s, VALLEY_END, VALLEY_END + 0.4);
    const rise = MathUtils.smoothstep(s, 3.7, 4.55);
    const height = 2.6 + rise * 3.5 + descend * descend * 30 + Math.sin(t * 0.7) * 0.18;
    const pitch = MathUtils.degToRad(-2.5 + rise * 30 - descend * 14 + st.parallax.y * 3);
    camera.position.set(st.parallax.x * 1.2, height, -t * 1.4 - (s - VALLEY_END) * 25);
    tmpLook.set(Math.sin(st.parallax.x * 0.12), Math.sin(pitch), -Math.cos(pitch)).add(camera.position);
    camera.lookAt(tmpLook);
    camera.rotateZ(Math.sin(t * 0.5) * 0.008);
    const cam = camera as PerspectiveCamera;
    if (Math.abs(cam.fov - 50) > 0.01) {
      cam.fov = 50;
      cam.updateProjectionMatrix();
    }

    // Sky + sun, ahead of the camera over the sea.
    const el = MathUtils.degToRad(atmosphere.elevation);
    setSky(sky, sunDir.set(0, Math.sin(el), -Math.cos(el)), atmosphere.rayleigh, atmosphere.turbidity);
    sky.uCloudCoverage.value = 0.22 * (1 - atmosphere.night);
    water.uTime.value = t;
    water.uSunColor.value.copy(atmosphere.sun);
    water.uSunStrength.value = atmosphere.sunStrength;
    water.uDeep.value.copy(atmosphere.deep);
    water.uNight.value = atmosphere.night;
    water.uSwell.value = 1 - atmosphere.night * 0.35;
    domeUniforms.uNight.value = atmosphere.night;
    gl.toneMappingExposure = atmosphere.exposure;

    // Stars and galaxy hang at "infinity": they move with the camera.
    skyFollow.current?.position.copy(camera.position);
    starUniforms.uTime.value = t;
    starUniforms.uPixelRatio.value = viewport.dpr;
    starUniforms.uOpacity.value = MathUtils.smoothstep(atmosphere.night, 0.15, 1);
    galaxyUniforms.uTime.value = t;
    galaxyUniforms.uPixelRatio.value = viewport.dpr;
    galaxyUniforms.uOpacity.value = MathUtils.smoothstep(atmosphere.night, 0.3, 1);

    raycaster.setFromCamera(r3f.pointer, camera);
    const pressed = pointer.presses !== st.presses;
    st.presses = pointer.presses;
    const starry = atmosphere.night > 0.55;

    // Pointer → galaxy gravity (pointer ray intersected with the galaxy's plane).
    let onGalaxy = false;
    if (galaxy.current && starry) {
      galaxy.current.updateMatrixWorld();
      inverse.copy(galaxy.current.matrixWorld).invert();
      localOrigin.copy(raycaster.ray.origin).applyMatrix4(inverse);
      localDir.copy(raycaster.ray.direction).transformDirection(inverse);
      if (localDir.y !== 0) {
        const k = -localOrigin.y / localDir.y;
        if (k > 0) {
          const target = galaxyUniforms.uPointer.value;
          localOrigin.addScaledVector(localDir, k);
          onGalaxy = Math.hypot(localOrigin.x, localOrigin.z) < GALAXY_RADIUS * 1.4;
          if (onGalaxy) target.copy(localOrigin);
        }
      }
    }
    st.pull = MathUtils.damp(st.pull, onGalaxy && pointerRecentlyMoved(4000) ? 1 : 0, 2.2, dt);
    galaxyUniforms.uPull.value = st.pull;
    if (pressed && starry && onGalaxy) {
      galaxyUniforms.uShock.value.set(galaxyUniforms.uPointer.value.x, galaxyUniforms.uPointer.value.z, t, 1);
      ambience.chime();
    }

    // Pointer → ripples on the water.
    if (!starry && raycaster.ray.intersectPlane(seaPlane, hitPoint) && hitPoint.distanceTo(camera.position) < 120) {
      const moved = hitPoint.distanceTo(st.lastRippleAt) > 1.6 && t - st.lastRipple > 0.09;
      if (pressed || (moved && pointerRecentlyMoved(300))) {
        const strength = pressed ? 1.6 : 0.35 + Math.min(pointer.speed / 80, 0.5);
        water.uRipples.value[st.ripple].set(hitPoint.x, hitPoint.z, t, strength);
        st.ripple = (st.ripple + 1) % RIPPLE_COUNT;
        st.lastRipple = t;
        st.lastRippleAt.copy(hitPoint);
        if (pressed) ambience.splash();
      }
    }

    if (++st.audioTick % 6 === 0) ambience.setScene("ocean", atmosphere.night);
  });

  return (
    <group ref={group} visible={false}>
      <SkyDome uniforms={sky} lowPrecision={quality.lowPrecision} />
      <group ref={skyFollow}>
        <Stars count={Math.round(quality.stars * 0.06)} starUniforms={starUniforms} domeUniforms={domeUniforms} />
        <group position={GALAXY_DIR.clone().multiplyScalar(GALAXY_DISTANCE)} rotation={[1.3, 0.15, 0.35]}>
          <Galaxy ref={galaxy} count={quality.stars} uniforms={galaxyUniforms} />
        </group>
      </group>
      <Water rings={quality.oceanRings} segments={quality.oceanSegments} uniforms={water} lowPrecision={quality.lowPrecision} />
    </group>
  );
}
