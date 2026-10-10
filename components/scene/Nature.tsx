"use client";

import { Sky } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  ShaderMaterial,
  Vector3,
} from "three";
import { ambience } from "@/lib/audio";
import { frame, useApp } from "@/lib/store";
import { heightAt } from "@/lib/terrain";
import { createAtmosphere, sampleAtmosphere } from "@/lib/timeOfDay";
import { Grass, type GrassUniformsTarget } from "./Grass";
import { Particles } from "./Particles";
import { Terrain } from "./Terrain";

export interface Quality {
  grass: number;
  terrainSegments: number;
  particles: number;
}

const ground = (x: number, z: number, lift: number) => new Vector3(x, heightAt(x, z) + lift, z);

/** The camera glides through the valley as the page scrolls. */
const PATH = new CatmullRomCurve3([
  ground(0, 12, 1.75),
  ground(4.5, -2, 2.0),
  ground(-5, -17, 3.6),
  ground(2, -33, 8.5),
  ground(0, -48, 17),
]);
const LOOK = new CatmullRomCurve3([
  new Vector3(0, 3, -40),
  new Vector3(-4, 3.5, -50),
  new Vector3(7, 7, -80),
  new Vector3(0, 14, -140),
  new Vector3(0, 22, -260),
]);

const tmpPos = new Vector3();
const tmpLook = new Vector3();
const tmpRay = new Vector3();
const raycaster = new Raycaster();

/** Finds where the pointer ray meets the grass by marching against the height field. */
function marchGround(origin: Vector3, dir: Vector3, out: Vector3) {
  const step = 0.6;
  let prev = 0;
  for (let t = step; t < 75; t += step) {
    tmpRay.copy(dir).multiplyScalar(t).add(origin);
    if (tmpRay.y < heightAt(tmpRay.x, tmpRay.z) + 0.35) {
      let lo = prev;
      let hi = t;
      for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2;
        tmpRay.copy(dir).multiplyScalar(mid).add(origin);
        if (tmpRay.y < heightAt(tmpRay.x, tmpRay.z) + 0.35) hi = mid;
        else lo = mid;
      }
      out.copy(dir).multiplyScalar(hi).add(origin);
      return true;
    }
    prev = t;
  }
  return false;
}

export function Nature({ quality }: { quality: Quality }) {
  const { gl, scene, camera } = useThree();
  const entered = useApp((s) => s.entered);

  const atmosphere = useMemo(createAtmosphere, []);
  const interaction = useMemo<GrassUniformsTarget>(
    () => ({ pointer: new Vector3(0, 0, 999), pointerForce: 0, gust: 0 }),
    [],
  );

  const sky = useRef<Mesh & { material: ShaderMaterial }>(null);
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);

  const state = useRef({
    progress: 0,
    intro: 0,
    parallax: { x: 0, y: 0 },
    lastMove: -10,
    moveDistance: 0,
    lastX: 0,
    lastY: 0,
    hasPointer: false,
    audioTick: 0,
  });

  useEffect(() => {
    scene.fog = new FogExp2("#c9b9a2", 0.0038);
    const s = state.current;
    const onMove = (e: PointerEvent) => {
      if (s.hasPointer) s.moveDistance += Math.hypot(e.clientX - s.lastX, e.clientY - s.lastY);
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.hasPointer = true;
      s.lastMove = performance.now();
    };
    const onLeave = () => {
      s.hasPointer = false;
      s.lastMove = -10;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      scene.fog = null;
    };
  }, [scene]);

  useFrame((r3f, delta) => {
    const s = state.current;
    const dt = Math.min(delta, 0.1);

    // Smoothed scroll progress and intro dolly.
    s.progress = MathUtils.damp(s.progress, frame.scroll, 3, dt);
    if (entered) s.intro = MathUtils.damp(s.intro, 1, 1.1, dt);
    // Dev-only: `window.__snap = 0.5` jumps straight to a point of the journey.
    if (process.env.NODE_ENV !== "production") {
      const snap = (window as unknown as { __snap?: number }).__snap;
      if (snap !== undefined) {
        s.progress = snap;
        s.intro = 1;
      }
    }
    const p = s.progress;

    sampleAtmosphere(p, atmosphere);

    // Camera.
    s.parallax.x = MathUtils.damp(s.parallax.x, r3f.pointer.x, 2.5, dt);
    s.parallax.y = MathUtils.damp(s.parallax.y, r3f.pointer.y, 2.5, dt);
    PATH.getPointAt(p, tmpPos);
    LOOK.getPointAt(p, tmpLook);
    const intro = 1 - s.intro;
    tmpPos.y -= intro * 0.4;
    tmpPos.z += intro * 4;
    tmpPos.x += s.parallax.x * 0.35;
    tmpPos.y += s.parallax.y * 0.15 + Math.sin(r3f.clock.elapsedTime * 0.6) * 0.03;
    tmpLook.x += s.parallax.x * 4;
    tmpLook.y += s.parallax.y * 2.5 - intro * 3;
    camera.position.copy(tmpPos);
    camera.lookAt(tmpLook);
    const cam = camera as PerspectiveCamera;
    const fov = 46 + intro * 10;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    // Sun, sky, lights, fog.
    const el = MathUtils.degToRad(atmosphere.elevation);
    const az = MathUtils.degToRad(atmosphere.azimuth);
    const sunDir = tmpRay.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    if (sky.current) {
      const u = sky.current.material.uniforms;
      u.sunPosition.value.copy(sunDir);
      u.turbidity.value = atmosphere.turbidity;
      u.rayleigh.value = atmosphere.rayleigh;
    }
    if (sun.current) {
      sun.current.position.copy(sunDir).multiplyScalar(120).add(camera.position);
      sun.current.target.position.copy(camera.position);
      sun.current.target.updateMatrixWorld();
      sun.current.color.copy(atmosphere.sun);
      sun.current.intensity = atmosphere.sunIntensity;
    }
    if (hemi.current) {
      hemi.current.color.copy(atmosphere.sky);
      hemi.current.groundColor.copy(atmosphere.ground);
    }
    (scene.fog as FogExp2 | null)?.color.copy(atmosphere.fog);
    gl.toneMappingExposure = atmosphere.exposure;

    // Pointer → grass.
    raycaster.setFromCamera(r3f.pointer, camera);
    const recent = performance.now() - s.lastMove < 2500;
    const hit = s.hasPointer && recent && marchGround(raycaster.ray.origin, raycaster.ray.direction, interaction.pointer);
    interaction.pointerForce = MathUtils.damp(interaction.pointerForce, hit ? 1 : 0, 4, dt);

    // Pointer speed → gust (visual + audio).
    const speed = s.moveDistance / Math.max(dt * 60, 1);
    s.moveDistance = 0;
    frame.pointerSpeed = MathUtils.damp(frame.pointerSpeed, speed, 6, dt);
    interaction.gust = MathUtils.damp(interaction.gust, Math.min(frame.pointerSpeed / 70, 1), 2, dt);
    if (++s.audioTick % 4 === 0) ambience.setGust(interaction.gust);
  });

  return (
    <>
      <Sky ref={sky as never} distance={4500} mieCoefficient={0.005} mieDirectionalG={0.82} />
      <hemisphereLight ref={hemi} intensity={1.5} />
      <directionalLight ref={sun} />
      <Terrain segments={quality.terrainSegments} />
      <Grass count={quality.grass} atmosphere={atmosphere} interaction={interaction} />
      <Particles count={quality.particles} atmosphere={atmosphere} />
    </>
  );
}
