export const galaxyVertex = /* glsl */ `
uniform float uTime;
uniform float uRadius;
uniform vec3 uPointer;   // galaxy-local position of the cursor
uniform float uPull;     // 0..1 strength of the visitor's gravity
uniform vec4 uShock;     // x, z, start time, strength
uniform float uPixelRatio;
uniform float uSizeScale;

attribute vec3 aColor;
attribute float aSize;
attribute float aRand;

varying vec3 vColor;
varying float vSoft;

void main() {
  vec3 p = position;

  // Differential rotation: the core turns faster than the rim.
  float r = length(p.xz);
  float ang = uTime * 0.035 / (0.2 + r / uRadius);
  float c = cos(ang), s = sin(ang);
  p.xz = mat2(c, -s, s, c) * p.xz;

  // The visitor's gravity well pulls and swirls nearby stars.
  vec3 toPtr = uPointer - p;
  float d = length(toPtr.xz);
  float wellR = uRadius * 0.28;
  float well = uPull * exp(-(d * d) / (wellR * wellR));
  p.xz += toPtr.xz * well * (0.45 + aRand * 0.35);
  p.xz += vec2(-toPtr.z, toPtr.x) * well * 0.3;
  p.y += (aRand - 0.5) * well * uRadius * 0.08;

  // Shockwave ring after a click.
  float boost = 0.0;
  float age = uTime - uShock.z;
  if (age > 0.0 && age < 5.0) {
    vec2 away = p.xz - uShock.xy;
    float dd = length(away) + 1e-3;
    float x = dd - age * uRadius * 0.55;
    float push = exp(-(x * x) / (uRadius * uRadius * 0.012)) * exp(-age * 0.8) * uShock.w;
    p.xz += away / dd * push * uRadius * 0.09;
    p.y += push * (aRand - 0.5) * uRadius * 0.06;
    boost = push;
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (uSizeScale / -mv.z) * (1.0 + well * 1.2 + boost * 1.5);

  vColor = aColor * (1.0 + well * 1.6 + boost * 3.0);
  vSoft = step(6.0, aSize); // big sprites are nebula dust, rendered softer
}
`;

export const galaxyFragment = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vSoft;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float star = exp(-d * d * 6.0);
  float dust = exp(-d * d * 2.5) * 0.06;
  float a = mix(star, dust, vSoft) * smoothstep(1.0, 0.8, d);
  gl_FragColor = vec4(vColor * a * uOpacity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const starsVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSize;
attribute float aPhase;
varying float vTwinkle;
varying float vBright;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio;
  vTwinkle = 0.65 + 0.35 * sin(uTime * (0.8 + aPhase * 2.5) + aPhase * 50.0);
  // Fainter near the horizon, where the air is thicker.
  vBright = smoothstep(-0.02, 0.25, normalize(position).y);
}
`;

export const starsFragment = /* glsl */ `
uniform float uOpacity;
varying float vTwinkle;
varying float vBright;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-d * d * 5.0) * smoothstep(1.0, 0.7, d);
  gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a * vTwinkle * vBright * uOpacity * 1.6, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Additive night gradient over the physical sky, matching the water's night reflection. */
export const nightDomeVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
  vec4 p = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

export const nightDomeFragment = /* glsl */ `
uniform float uNight;
uniform vec3 uNightSky;
uniform vec3 uGalaxyDir;
uniform vec3 uGalaxyColor;
varying vec3 vDir;

void main() {
  vec3 dir = normalize(vDir);
  float y = max(dir.y, 0.0);
  vec3 col = uNightSky * (0.35 + 0.65 * (1.0 - y));
  col += uGalaxyColor * pow(max(dot(dir, uGalaxyDir), 0.0), 10.0);
  gl_FragColor = vec4(col * uNight, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
