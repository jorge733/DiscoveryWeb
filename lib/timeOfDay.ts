import { Color, MathUtils } from "three";

/** Atmosphere state at a moment of the day. Scroll progress walks through these keyframes. */
interface Key {
  at: number;
  elevation: number; // sun elevation in degrees
  azimuth: number; // degrees, 180 = straight ahead (-z)
  turbidity: number;
  rayleigh: number;
  exposure: number;
  fog: string;
  sun: string;
  sunIntensity: number;
  sky: string; // hemisphere sky colour
  ground: string; // hemisphere ground colour
  dusk: number; // 0..1, drives fireflies
}

const KEYS: Key[] = [
  { at: 0.0, elevation: 9, azimuth: 62, turbidity: 5, rayleigh: 1.4, exposure: 0.62, fog: "#c3c6c0", sun: "#ffd9ae", sunIntensity: 3.2, sky: "#b4c6e0", ground: "#56632f", dusk: 0 },
  { at: 0.35, elevation: 30, azimuth: 95, turbidity: 3.5, rayleigh: 1.1, exposure: 0.5, fog: "#b4c7d8", sun: "#fff3e2", sunIntensity: 3.6, sky: "#a8c3e8", ground: "#5a6c33", dusk: 0 },
  { at: 0.72, elevation: 8, azimuth: 150, turbidity: 8, rayleigh: 2.2, exposure: 0.62, fog: "#d6ac86", sun: "#ffb878", sunIntensity: 3.0, sky: "#c9b0a6", ground: "#4a4a28", dusk: 0.3 },
  { at: 1.0, elevation: 4.5, azimuth: 175, turbidity: 10, rayleigh: 3.0, exposure: 0.85, fog: "#a2716a", sun: "#ff8a4c", sunIntensity: 2.0, sky: "#6e6688", ground: "#2a2c1a", dusk: 1 },
];

const ca = new Color();
const cb = new Color();

export interface Atmosphere {
  elevation: number;
  azimuth: number;
  turbidity: number;
  rayleigh: number;
  exposure: number;
  fog: Color;
  sun: Color;
  sunIntensity: number;
  sky: Color;
  ground: Color;
  dusk: number;
}

export const createAtmosphere = (): Atmosphere => ({
  elevation: 0,
  azimuth: 0,
  turbidity: 0,
  rayleigh: 0,
  exposure: 0,
  fog: new Color(),
  sun: new Color(),
  sunIntensity: 0,
  sky: new Color(),
  ground: new Color(),
  dusk: 0,
});

/** Writes the interpolated atmosphere for progress `p` into `out` (no allocation). */
export function sampleAtmosphere(p: number, out: Atmosphere) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = MathUtils.smoothstep(p, a.at, b.at);
  const lerp = (x: number, y: number) => x + (y - x) * t;
  const mix = (target: Color, x: string, y: string) => target.copy(ca.set(x)).lerp(cb.set(y), t);

  out.elevation = lerp(a.elevation, b.elevation);
  out.azimuth = lerp(a.azimuth, b.azimuth);
  out.turbidity = lerp(a.turbidity, b.turbidity);
  out.rayleigh = lerp(a.rayleigh, b.rayleigh);
  out.exposure = lerp(a.exposure, b.exposure);
  out.sunIntensity = lerp(a.sunIntensity, b.sunIntensity);
  out.dusk = lerp(a.dusk, b.dusk);
  mix(out.fog, a.fog, b.fog);
  mix(out.sun, a.sun, b.sun);
  mix(out.sky, a.sky, b.sky);
  mix(out.ground, a.ground, b.ground);
  return out;
}
