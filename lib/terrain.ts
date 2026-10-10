import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise.js";

const perlin = new ImprovedNoise();

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

function fbm(x: number, z: number, octaves: number, seed = 1.7) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * perlin.noise(x * freq, z * freq, seed + i * 3.1);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/** Centre of the meadow; the valley stretches far along -z with ranges on both sides and at the end. */
export const VALLEY = { x: 0, z: -25 };
/** Terrain plane: size and centre (shifted forward so the far range is covered). */
export const TERRAIN = { size: 1000, centerZ: -300 };

/** How "mountainous" a point is, 0 in the meadow and 1 deep in the range. */
export function mountainMask(x: number, z: number) {
  const along = z < VALLEY.z ? (z - VALLEY.z) * 0.3 : (z - VALLEY.z) * 0.9;
  const d = Math.hypot(x - VALLEY.x, along);
  return smoothstep(38, 150, d);
}

/** Height of the ground at a world-space position. Shared by terrain, grass and the pointer. */
export function heightAt(x: number, z: number) {
  const rolling = fbm(x * 0.025, z * 0.025, 3) * 4.0;
  const m = mountainMask(x, z);
  if (m <= 0) return rolling;
  const ridge = 1 - Math.abs(fbm(x * 0.009 + 11.3, z * 0.009 - 4.2, 5, 9.1));
  const peaks = ridge * ridge * 95 + fbm(x * 0.04, z * 0.04, 3, 4.4) * 8;
  return rolling + m * m * peaks;
}
