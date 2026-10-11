import { Vector3, type IUniform } from "three";

/**
 * Preetham sky coefficients, evaluated on the CPU in double precision.
 * The raw constants (1e-18, 1e14, 1e-6…) overflow or flush to zero on GPUs that only
 * offer mediump floats, so shaders receive pre-scaled values in a safe range instead.
 */
const TOTAL_RAYLEIGH = [5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5];
const MIE_CONST = [1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14];
const RAYLEIGH_ZENITH_LENGTH = 8.4e3;
const MIE_ZENITH_LENGTH = 1.25e3;
const CUTOFF_ANGLE = 1.6110731556870734;

export type SkyUniforms = {
  uSunDir: IUniform<Vector3>;
  uSunE: IUniform<number>;
  uExtR: IUniform<Vector3>;
  uExtM: IUniform<Vector3>;
  uWR: IUniform<Vector3>;
  uWM: IUniform<Vector3>;
  uMieG: IUniform<number>;
  uTime: IUniform<number>;
  uCloudCoverage: IUniform<number>;
  uCloudDensity: IUniform<number>;
  uCloudElevation: IUniform<number>;
  uCloudScale: IUniform<number>;
  uCloudSpeed: IUniform<number>;
};

export const createSkyUniforms = (): SkyUniforms => ({
  uSunDir: { value: new Vector3(0, 0.2, -1).normalize() },
  uSunE: { value: 0 },
  uExtR: { value: new Vector3() },
  uExtM: { value: new Vector3() },
  uWR: { value: new Vector3() },
  uWM: { value: new Vector3() },
  uMieG: { value: 0.82 },
  uTime: { value: 0 },
  uCloudCoverage: { value: 0 },
  uCloudDensity: { value: 0.45 },
  uCloudElevation: { value: 0.55 },
  uCloudScale: { value: 0.0002 },
  uCloudSpeed: { value: 0.00003 },
});

/** Writes the sky state for a sun direction into the uniforms (no allocation). */
export function setSky(u: SkyUniforms, sunDir: Vector3, rayleigh: number, turbidity: number, mieCoefficient = 0.005) {
  const dir = u.uSunDir.value.copy(sunDir).normalize();
  const zenithCos = Math.min(Math.max(dir.y, -1), 1);
  u.uSunE.value = 1000 * Math.max(0, 1 - Math.exp(-((CUTOFF_ANGLE - Math.acos(zenithCos)) / 1.5)));

  // three's Sky uses a unit sun vector, so its "sunfade" term is effectively 1.
  const mie = 0.434 * (0.2 * turbidity * 10e-18) * mieCoefficient;
  const ext = [u.uExtR.value, u.uExtM.value, u.uWR.value, u.uWM.value];
  for (let c = 0; c < 3; c++) {
    const betaR = TOTAL_RAYLEIGH[c] * rayleigh;
    const betaM = MIE_CONST[c] * mie;
    ext[0].setComponent(c, betaR * RAYLEIGH_ZENITH_LENGTH);
    ext[1].setComponent(c, betaM * MIE_ZENITH_LENGTH);
    ext[2].setComponent(c, betaR / (betaR + betaM));
    ext[3].setComponent(c, betaM / (betaR + betaM));
  }
}
