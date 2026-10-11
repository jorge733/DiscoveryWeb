/**
 * Preetham sky radiance as a reusable GLSL function, ported from three's Sky.js so that
 * water reflections and the horizon match the sky dome exactly.
 * Requires uniforms: uSunPosition, uRayleigh, uTurbidity, uMieCoefficient, uMieDirectionalG.
 */
export const skyRadiance = /* glsl */ `
uniform vec3 uSunPosition;
uniform float uRayleigh;
uniform float uTurbidity;
uniform float uMieCoefficient;
uniform float uMieDirectionalG;

const float SKY_PI = 3.141592653589793;
const vec3 SKY_TOTAL_RAYLEIGH = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);
const vec3 SKY_MIE_CONST = vec3(1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14);

float skySunIntensity(float zenithAngleCos) {
  zenithAngleCos = clamp(zenithAngleCos, -1.0, 1.0);
  return 1000.0 * max(0.0, 1.0 - pow(2.718281828, -((1.6110731556870734 - acos(zenithAngleCos)) / 1.5)));
}

vec3 skyRadiance(vec3 direction) {
  vec3 sunDir = normalize(uSunPosition);
  float sunE = skySunIntensity(sunDir.y);
  float sunfade = 1.0 - clamp(1.0 - exp(uSunPosition.y / 450000.0), 0.0, 1.0);
  vec3 betaR = SKY_TOTAL_RAYLEIGH * (uRayleigh - (1.0 - sunfade));
  vec3 betaM = 0.434 * (0.2 * uTurbidity) * 10E-18 * SKY_MIE_CONST * uMieCoefficient;

  float zenithAngle = acos(max(0.0, direction.y));
  float inverse = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / SKY_PI), -1.253));
  vec3 Fex = exp(-(betaR * 8.4E3 * inverse + betaM * 1.25E3 * inverse));

  float cosTheta = dot(direction, sunDir);
  float rPhase = 0.05968310365946075 * (1.0 + pow(cosTheta * 0.5 + 0.5, 2.0));
  float g = uMieDirectionalG;
  float mPhase = 0.07957747154594767 * ((1.0 - g * g) / pow(1.0 - 2.0 * g * cosTheta + g * g, 1.5));
  vec3 beta = (betaR * rPhase + betaM * mPhase) / (betaR + betaM);

  vec3 Lin = pow(sunE * beta * (1.0 - Fex), vec3(1.5));
  Lin *= mix(vec3(1.0), pow(sunE * beta * Fex, vec3(0.5)), clamp(pow(1.0 - sunDir.y, 5.0), 0.0, 1.0));
  vec3 L0 = vec3(0.1) * Fex;
  return (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);
}
`;
