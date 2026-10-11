/**
 * Probes the GPU once with a throwaway WebGL context so the scene can pick a tier
 * that renders correctly, not just quickly. Many budget Android GPUs only offer
 * medium float precision in fragment shaders, cannot render to half-float targets
 * (needed by the post-processing chain), or have known driver quirks.
 */
export type Tier = "high" | "mid" | "low";

export interface DeviceInfo {
  tier: Tier;
  mobile: boolean;
  gpu: string;
  /** Fragment shaders support highp floats */
  highp: boolean;
  /** Can render into half-float colour buffers (HDR post-processing) */
  halfFloat: boolean;
  webgl2: boolean;
  memory: number | null;
  cores: number;
}

// GPUs that commonly misrender or struggle with this scene.
const WEAK_GPU = /PowerVR|Mali-[0-9]{3}\b|Mali-T|Mali-G(31|51|52|57)\b|Adreno \(TM\) [2-5]\d\d|Adreno \(TM\) 6[0-1]\d|Vivante|VideoCore/i;

let cached: DeviceInfo | null = null;

export function probeDevice(): DeviceInfo {
  if (cached) return cached;

  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.matchMedia("(pointer: coarse)").matches;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null;
  const cores = navigator.hardwareConcurrency ?? 4;

  let gpu = "unknown";
  let highp = true;
  let halfFloat = true;
  let webgl2 = false;

  try {
    const canvas = document.createElement("canvas");
    const gl2 = canvas.getContext("webgl2");
    const gl = (gl2 ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    webgl2 = !!gl2;
    if (gl) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      gpu = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      const fmt = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      highp = !!fmt && fmt.precision > 0;
      halfFloat = gl2
        ? !!(gl2.getExtension("EXT_color_buffer_float") || gl2.getExtension("EXT_color_buffer_half_float"))
        : !!(gl.getExtension("OES_texture_half_float") && gl.getExtension("EXT_color_buffer_half_float"));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    } else {
      highp = false;
      halfFloat = false;
    }
  } catch {
    // Keep optimistic defaults; the runtime frame-rate governor still protects us.
  }

  let tier: Tier = "high";
  if (mobile) tier = "mid";
  if (!highp || !halfFloat || !webgl2 || WEAK_GPU.test(gpu) || (memory !== null && memory <= 3) || (mobile && cores <= 4)) {
    tier = "low";
  } else if (!mobile && cores <= 4) {
    tier = "mid";
  }

  // Manual overrides for testing: ?tier=low|mid|high, ?lowp (pretend highp is missing).
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("tier");
  if (forced === "low" || forced === "mid" || forced === "high") tier = forced;
  if (params.has("lowp")) highp = false;

  cached = { tier, mobile, gpu, highp, halfFloat, webgl2, memory, cores };
  return cached;
}
