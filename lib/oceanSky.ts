import { Color, MathUtils } from "three";
import { VALLEY_END } from "./worlds";

/** Sky over the sea, keyed by journey position (section units): sunset → blue hour → night. */
interface Key {
  at: number;
  elevation: number;
  turbidity: number;
  rayleigh: number;
  exposure: number;
  sun: string;
  sunStrength: number;
  deep: string;
  night: number;
}

const KEYS: Key[] = [
  { at: VALLEY_END, elevation: 4.5, turbidity: 6, rayleigh: 2.1, exposure: 0.24, sun: "#ffc890", sunStrength: 1, deep: "#06222e", night: 0 },
  { at: 3.55, elevation: 1.6, turbidity: 8, rayleigh: 2.6, exposure: 0.45, sun: "#ff9a5a", sunStrength: 0.9, deep: "#0a1c28", night: 0.02 },
  { at: 3.95, elevation: -2.5, turbidity: 9, rayleigh: 3, exposure: 0.95, sun: "#ff7040", sunStrength: 0.25, deep: "#071420", night: 0.45 },
  { at: 4.35, elevation: -9, turbidity: 9, rayleigh: 3, exposure: 1.2, sun: "#ff6030", sunStrength: 0, deep: "#030a12", night: 1 },
];

export interface OceanAtmosphere {
  elevation: number;
  turbidity: number;
  rayleigh: number;
  exposure: number;
  sun: Color;
  sunStrength: number;
  deep: Color;
  night: number;
}

export const createOceanAtmosphere = (): OceanAtmosphere => ({
  elevation: 0,
  turbidity: 0,
  rayleigh: 0,
  exposure: 0,
  sun: new Color(),
  sunStrength: 0,
  deep: new Color(),
  night: 0,
});

const ca = new Color();
const cb = new Color();

export function sampleOcean(s: number, out: OceanAtmosphere) {
  let i = 0;
  while (i < KEYS.length - 2 && s > KEYS[i + 1].at) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = MathUtils.smoothstep(s, a.at, b.at);
  const lerp = (x: number, y: number) => x + (y - x) * t;
  out.elevation = lerp(a.elevation, b.elevation);
  out.turbidity = lerp(a.turbidity, b.turbidity);
  out.rayleigh = lerp(a.rayleigh, b.rayleigh);
  out.exposure = lerp(a.exposure, b.exposure);
  out.sunStrength = lerp(a.sunStrength, b.sunStrength);
  out.night = lerp(a.night, b.night);
  out.sun.copy(ca.set(a.sun)).lerp(cb.set(b.sun), t);
  out.deep.copy(ca.set(a.deep)).lerp(cb.set(b.deep), t);
  return out;
}
