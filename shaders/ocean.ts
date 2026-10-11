import { skyRadiance } from "./sky";

export const RIPPLE_COUNT = 10;

/** Gerstner swell: direction.xy, steepness, wavelength. Steepness sums below 1 to avoid loops. */
export const WAVES: [number, number, number, number][] = [
  [0.2, 1.0, 0.16, 62],
  [-0.55, 1.0, 0.13, 33],
  [0.7, 0.8, 0.11, 19],
  [-0.2, 1.0, 0.09, 11],
  [0.95, 0.35, 0.07, 6.5],
  [-0.8, 0.6, 0.05, 3.8],
];

export const oceanVertex = /* glsl */ `
#define WAVE_COUNT ${WAVES.length}
#define RIPPLE_COUNT ${RIPPLE_COUNT}
uniform float uTime;
uniform vec4 uWaves[WAVE_COUNT];
uniform vec4 uRipples[RIPPLE_COUNT]; // x, z, start time, strength
uniform float uSwell;

varying vec3 vWorld;
varying vec3 vNormal;
varying float vCrest;
varying float vRippleFoam;
varying vec3 vViewDir;
varying float vDist;

vec3 gerstner(vec4 w, vec2 p, float fade, inout vec3 tangent, inout vec3 binormal) {
  float k = 6.28318 / w.w;
  float c = sqrt(9.8 / k);
  vec2 d = normalize(w.xy);
  float f = k * (dot(d, p) - c * uTime);
  float s = w.z * fade * uSwell;
  float a = s / k;
  float sf = sin(f), cf = cos(f);
  tangent += vec3(-d.x * d.x * s * sf, d.x * s * cf, -d.x * d.y * s * sf);
  binormal += vec3(-d.x * d.y * s * sf, d.y * s * cf, -d.y * d.y * s * sf);
  return vec3(d.x * a * cf, a * sf, d.y * a * cf);
}

void main() {
  vec3 world = (modelMatrix * vec4(position, 1.0)).xyz;
  vec2 p = world.xz;
  float dist = length(p - cameraPosition.xz);

  vec3 tangent = vec3(1.0, 0.0, 0.0);
  vec3 binormal = vec3(0.0, 0.0, 1.0);
  vec3 offset = vec3(0.0);
  for (int i = 0; i < WAVE_COUNT; i++) {
    // Short waves fade out where the grid is too coarse to represent them.
    float fade = 1.0 - smoothstep(uWaves[i].w * 6.0, uWaves[i].w * 24.0, dist);
    offset += gerstner(uWaves[i], p, fade, tangent, binormal);
  }
  vec3 normal = normalize(cross(binormal, tangent));

  // Ripples from the visitor's touch: expanding rings that decay over time.
  vec2 grad = vec2(0.0);
  float rippleFoam = 0.0;
  for (int i = 0; i < RIPPLE_COUNT; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.z;
    if (age < 0.0 || age > 7.0 || r.w <= 0.0) continue;
    vec2 toP = p - r.xy;
    float d = length(toP) + 1e-4;
    float x = d - age * 3.2;
    float env = exp(-x * x * 0.12) * exp(-age * 0.55) * r.w / (1.0 + d * 0.15);
    offset.y += sin(x * 1.6) * env * 0.55;
    grad += (toP / d) * cos(x * 1.6) * 1.6 * env * 0.55;
    rippleFoam += env * smoothstep(1.5, 0.0, age) * 0.8;
  }
  normal = normalize(normal + vec3(-grad.x, 0.0, -grad.y));

  world += offset;
  vWorld = world;
  vNormal = normal;
  vCrest = offset.y;
  vRippleFoam = rippleFoam;
  // Distances are computed here in highp: squaring kilometres overflows mediump fragments.
  vec3 toCam = cameraPosition - world;
  vDist = length(toCam);
  vViewDir = toCam / vDist;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const oceanFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uScatter;
uniform vec3 uSunColor;
uniform float uSunStrength;
uniform float uNight;
uniform vec3 uNightSky;
uniform vec3 uGalaxyDir;
uniform vec3 uGalaxyColor;
uniform float uFogDensity;

varying vec3 vWorld;
varying vec3 vNormal;
varying float vCrest;
varying float vRippleFoam;
varying vec3 vViewDir;
varying float vDist;

${skyRadiance}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Small capillary ripples as an analytic sum of moving sines (normal perturbation only).
vec2 detail(vec2 p) {
  vec2 g = vec2(0.0);
  float t = uTime;
  g += vec2(0.83, 0.55) * cos(dot(p, vec2(0.83, 0.55)) * 1.9 + t * 2.1) * 0.10;
  g += vec2(-0.6, 0.8) * cos(dot(p, vec2(-0.6, 0.8)) * 2.7 - t * 2.6) * 0.08;
  g += vec2(0.2, -0.98) * cos(dot(p, vec2(0.2, -0.98)) * 4.3 + t * 3.3) * 0.06;
  g += vec2(-0.95, -0.3) * cos(dot(p, vec2(-0.95, -0.3)) * 6.1 - t * 3.9) * 0.045;
  g += vec2(0.5, 0.86) * cos(dot(p, vec2(0.5, 0.86)) * 9.7 + t * 4.8) * 0.03;
  return g;
}

vec3 sky(vec3 dir) {
  vec3 day = skyRadiance(dir);
  // At night: a deep gradient plus the soft glow of the galaxy.
  vec3 night = uNightSky * (0.35 + 0.65 * (1.0 - dir.y));
  night += uGalaxyColor * pow(max(dot(dir, uGalaxyDir), 0.0), 10.0);
  return mix(day, max(day, night), uNight);
}

void main() {
  float dist = vDist;
  vec3 V = normalize(vViewDir);

  vec3 N = normalize(vNormal);
  float detailFade = 1.0 - smoothstep(30.0, 260.0, dist);
#ifdef LOW_PRECISION
  vec2 g = vec2(0.0); // capillary detail needs highp world coordinates
#else
  vec2 g = detail(vWorld.xz) * detailFade;
#endif
  N = normalize(N + vec3(-g.x, 0.0, -g.y));

  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);

  vec3 sunDir = uSunDir;
  vec3 reflection = sky(R);

  // Light scattering through the thin crests, strongest looking towards the sun.
  float facing = pow(max(dot(-V, sunDir) * 0.5 + 0.5, 0.0), 3.0);
  float sss = facing * smoothstep(-0.5, 1.6, vCrest) * uSunStrength;
  vec3 water = uDeep * (0.25 + 0.75 * uSunStrength) + uScatter * sss;

  vec3 col = mix(water, reflection, fresnel);

  // Sun glitter: a tight HDR highlight that blooms into a path of light.
  float spec = pow(max(dot(R, sunDir), 0.0), 900.0) * 120.0 + pow(max(dot(R, sunDir), 0.0), 90.0) * 3.0;
  col += uSunColor * spec * uSunStrength;

  // Foam on the highest crests and where the visitor touched the water.
#ifdef LOW_PRECISION
  float foamNoise = 0.25;
#else
  float foamNoise = vnoise(vWorld.xz * 0.9 + uTime * 0.2) * vnoise(vWorld.xz * 2.3 - uTime * 0.3);
#endif
  float foam = smoothstep(1.3, 2.4, vCrest + foamNoise * 1.2) + vRippleFoam * foamNoise * 2.0;
  vec3 foamColor = sky(vec3(0.0, 1.0, 0.0)) * 1.4 + uSunColor * 0.04 * uSunStrength;
  col = mix(col, foamColor, clamp(foam, 0.0, 1.0) * 0.8);

  // Aerial perspective into the exact sky colour at the horizon.
  vec3 horizonDir = normalize(vec3(-V.x, 0.0, -V.z));
  float fog = 1.0 - exp(-pow(dist * uFogDensity, 1.6));
  col = mix(col, sky(horizonDir), fog);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
