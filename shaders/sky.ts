/**
 * Preetham sky radiance, ported from three's Sky.js but fed by pre-scaled
 * coefficients (lib/skyParams.ts) so it stays correct on mediump-only GPUs.
 * Shared by the sky dome and the water's reflections so the horizon matches exactly.
 */
export const skyRadiance = /* glsl */ `
uniform vec3 uSunDir;
uniform float uSunE;
uniform vec3 uExtR;
uniform vec3 uExtM;
uniform vec3 uWR;
uniform vec3 uWM;
uniform float uMieG;

void skyTerms(vec3 dir, out vec3 Lin, out vec3 L0, out vec3 Fex, out float cosTheta) {
  float cosZ = max(0.0, dir.y);
  float zenithDeg = acos(cosZ) * 57.29578;
  float inverse = 1.0 / (cosZ + 0.15 * pow(max(93.885 - zenithDeg, 0.1), -1.253));
  Fex = exp(-(uExtR + uExtM) * inverse);

  cosTheta = dot(dir, uSunDir);
  float rPhase = 0.0596831 * (1.0 + pow(cosTheta * 0.5 + 0.5, 2.0));
  float g = uMieG;
  float mPhase = 0.0795775 * ((1.0 - g * g) / pow(max(1.0 - 2.0 * g * cosTheta + g * g, 1e-3), 1.5));
  vec3 beta = uWR * rPhase + uWM * mPhase;

  Lin = pow(uSunE * beta * (1.0 - Fex), vec3(1.5));
  Lin *= mix(vec3(1.0), pow(uSunE * beta * Fex, vec3(0.5)), clamp(pow(1.0 - uSunDir.y, 5.0), 0.0, 1.0));
  L0 = vec3(0.1) * Fex;
}

vec3 skyRadiance(vec3 dir) {
  vec3 Lin, L0, Fex;
  float cosTheta;
  skyTerms(dir, Lin, L0, Fex, cosTheta);
  return (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);
}
`;

export const skyDomeVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  // The dome is centred on the camera and unrotated, so local position is the view direction.
  // (World-space differences would overflow mediump floats in the fragment shader.)
  vDir = position;
  gl_Position = projectionMatrix * viewMatrix * world;
  gl_Position.z = gl_Position.w; // on the far plane
}
`;

/** Sky dome with sun disc and the procedural clouds from three's Sky.js. */
export const skyDomeFragment = /* glsl */ `
uniform float uTime;
uniform float uCloudCoverage;
uniform float uCloudDensity;
uniform float uCloudElevation;
uniform float uCloudScale;
uniform float uCloudSpeed;
varying vec3 vDir;

${skyRadiance}

vec2 gradient(vec2 i) {
  vec3 p = fract(i.xyx * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yzx + 33.33);
  return fract((p.xx + p.yz) * p.zy) * 2.0 - 1.0;
}
float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(gradient(i), f);
  float b = dot(gradient(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(gradient(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(gradient(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.6;
}
float fbm(vec2 p, float drift) {
  float result = 0.0;
  float amplitude = 1.0;
  for (int i = 0; i < 4; i++) {
    result += amplitude * gnoise(p);
    amplitude *= 0.5;
    p = p * 2.0 + drift;
  }
  return result;
}

void main() {
  vec3 dir = normalize(vDir);
  vec3 Lin, L0, Fex;
  float cosTheta;
  skyTerms(dir, Lin, L0, Fex, cosTheta);

#ifdef LOW_PRECISION
  // mediump cannot resolve cosines this close to 1, so the disc is drawn wider.
  float disc = smoothstep(0.99955, 0.9998, cosTheta);
#else
  float disc = smoothstep(0.99993, 0.99996, cosTheta);
#endif
  vec3 col = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);
  col += min(760.0 * disc * min(uSunE * Fex, vec3(80.0)), vec3(20000.0));

  if (dir.y > 0.0 && uCloudCoverage > 0.0) {
    float elevation = mix(1.0, 0.1, uCloudElevation);
    vec2 cloudUV = dir.xz / (dir.y * elevation) * uCloudScale + uTime * uCloudSpeed;
    float evolve = mod(uTime * uCloudSpeed * 300.0, 64.0);
    float cloudNoise = clamp(fbm(cloudUV * 1000.0, evolve) * 0.7 + 0.5, 0.0, 1.0);
    float region = gnoise(cloudUV * 300.0) * 0.37 + 0.5;
    float cov = clamp(uCloudCoverage + (region - 0.5) * 0.6, 0.0, 1.0);
    float threshold = 1.0 - cov;
    float mask = smoothstep(threshold, threshold + 0.3, cloudNoise);
    float horizonFade = smoothstep(0.0, 0.03 + 0.06 * uCloudElevation, dir.y);
    mask *= horizonFade;

    float dayFactor = smoothstep(-0.08, 0.3, uSunDir.y);
    vec3 sunColor = uSunE * Fex * 0.0088;
    vec3 skyAmbient = Lin * 0.04 + vec3(0.0, 0.0003, 0.00075);
    float depth = max(0.0, cloudNoise - threshold);
    float beer = exp(depth * -4.0);
    float powder = 1.0 - beer * beer;
    float shade = mix(0.45, 1.0, clamp(beer * powder * 2.6, 0.0, 1.0));
    float silver = clamp(0.51 / pow(max(1.49 - cosTheta * 1.4, 0.05), 1.5), 0.0, 3.0);
    float edge = mask * (1.0 - mask) * 4.0;
    vec3 cloudColor = skyAmbient + sunColor * shade + sunColor * silver * edge * 0.6;
    cloudColor *= max(dayFactor, 0.03);

    float alpha = (1.0 - exp(depth * uCloudDensity * -12.0)) * horizonFade;
    col -= L0 * 0.04 * alpha;
    col = mix(col, mix(col, cloudColor, Fex), alpha);
  }

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
