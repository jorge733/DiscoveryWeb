"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { DeviceInfo } from "@/lib/device";

/** Live render stats, written by the scene and shown when the URL contains `?debug`. */
export const stats = {
  fps: 0,
  dpr: 1,
  tier: "",
  postfx: "",
  contextLost: 0,
};

export function DebugPanel({ device }: { device: DeviceInfo }) {
  const [enabled, setEnabled] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    setEnabled(new URLSearchParams(window.location.search).has("debug"));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  const rows: [string, string][] = [
    ["GPU", device.gpu],
    ["Tier", stats.tier],
    ["FPS", stats.fps.toFixed(0)],
    ["DPR", stats.dpr.toFixed(2)],
    ["Post FX", stats.postfx],
    ["highp", String(device.highp)],
    ["HalfFloat RT", String(device.halfFloat)],
    ["WebGL2", String(device.webgl2)],
    ["Memory", device.memory ? `${device.memory} GB` : "?"],
    ["Cores", String(device.cores)],
    ["Context lost", String(stats.contextLost)],
  ];

  return createPortal(
    <div className="pointer-events-none fixed bottom-3 left-3 z-[200] max-w-[90vw] rounded-lg bg-black/75 p-3 font-mono text-[10px] leading-relaxed text-lime-200">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-white/50">{k}</span>
          <span className="break-all">{v}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
