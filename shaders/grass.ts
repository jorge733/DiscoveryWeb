const noise = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

export const grassVertex = /* glsl */ `
uniform float uTime;
uniform vec3 uPointer;      // world position of the cursor on the ground
uniform float uPointerForce; // 0..1
uniform float uGust;         // extra wind from pointer speed
uniform vec3 uSunDir;

attribute vec3 aOffset;
attribute vec4 aParams; // x: height, y: rotation, z: phase, w: colour variation

varying float vHeight;
varying float vVariation;
varying float vBacklight;
varying float vShade;

#include <fog_pars_vertex>
${noise}

void main() {
  float h = position.y;             // 0 at root, 1 at tip
  vec3 p = position;
  p.y *= aParams.x;

  float c = cos(aParams.y), s = sin(aParams.y);
  p = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);

  vec3 world = aOffset + p;

  // Wind: a large rolling noise field plus a fast per-blade flutter.
  vec2 windDir = normalize(vec2(1.0, -0.45));
  float field = vnoise(world.xz * 0.06 + windDir * uTime * 0.55);
  float flutter = sin(uTime * (2.2 + aParams.z) + aParams.z * 6.28) * 0.08;
  float strength = (field * 0.75 + flutter + uGust * 0.9) * h * h;
  world.xz += windDir * strength * aParams.x;
  world.y -= strength * strength * 0.35 * aParams.x;

  // Pointer parts the grass like a hand brushing through it.
  vec2 away = world.xz - uPointer.xz;
  float dist = length(away);
  float push = (1.0 - smoothstep(0.0, 2.6, dist)) * uPointerForce;
  world.xz += normalize(away + 1e-4) * push * h * 1.4 * aParams.x;
  world.y -= push * h * 0.55 * aParams.x;

  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vec3 toCam = normalize(cameraPosition - world);
  vBacklight = pow(max(dot(-toCam, uSunDir), 0.0), 6.0) * h;
  vHeight = h;
  vVariation = aParams.w;
  vShade = 0.75 + field * 0.35;

  #include <fog_vertex>
}
`;

export const grassFragment = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uTip;
uniform vec3 uDry;
uniform vec3 uSunColor;
uniform float uSunIntensity;
uniform vec3 uSkyColor;

varying float vHeight;
varying float vVariation;
varying float vBacklight;
varying float vShade;

#include <fog_pars_fragment>

void main() {
  vec3 tip = mix(uTip, uDry, smoothstep(0.55, 1.0, vVariation));
  vec3 col = mix(uBase, tip, smoothstep(0.0, 1.0, vHeight));
  col *= 0.85 + vVariation * 0.3;

  float ao = mix(0.35, 1.0, smoothstep(0.0, 0.6, vHeight));
  vec3 light = uSkyColor * 0.45 + uSunColor * uSunIntensity * 0.32 * vShade;
  col *= light * ao;
  col += uSunColor * vBacklight * uSunIntensity * 0.55 * tip;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export const particlesVertex = /* glsl */ `
uniform float uTime;
uniform float uDusk;
uniform float uPixelRatio;
attribute vec4 aSeed; // x,y,z: drift phases, w: size

varying float vGlow;
varying float vFlicker;

void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.21 + aSeed.x * 6.28) * 1.6;
  p.y += sin(uTime * 0.33 + aSeed.y * 6.28) * 0.6 + cos(uTime * 0.17 + aSeed.z * 6.28) * 0.4;
  p.z += cos(uTime * 0.19 + aSeed.z * 6.28) * 1.6;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = mix(0.6, 1.8, aSeed.w) * mix(1.0, 2.6, uDusk);
  gl_PointSize = size * uPixelRatio * (28.0 / -mv.z);

  vFlicker = 0.5 + 0.5 * sin(uTime * (1.5 + aSeed.x * 3.0) + aSeed.y * 40.0);
  vGlow = aSeed.w;
}
`;

export const particlesFragment = /* glsl */ `
uniform float uDusk;
uniform vec3 uDayColor;
uniform vec3 uNightColor;

varying float vGlow;
varying float vFlicker;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a = pow(a, 2.2);
  vec3 col = mix(uDayColor, uNightColor * (1.5 + vFlicker * 2.5), uDusk);
  float alpha = a * mix(0.35, 0.25 + vFlicker * 0.75, uDusk);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`;
