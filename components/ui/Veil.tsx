"use client";

import { useEffect, useRef } from "react";
import { journey } from "@/lib/journey";
import { veilAt } from "@/lib/worlds";

/** A bank of cloud the camera flies through while one world is swapped for the next. */
export function Veil() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const loop = () => {
      const v = veilAt(journey.s);
      if (root.current && Math.abs(v - last) > 0.002) {
        last = v;
        root.current.style.opacity = v.toFixed(3);
        root.current.style.visibility = v > 0.001 ? "visible" : "hidden";
        root.current.style.backdropFilter = v > 0.001 ? `blur(${(v * 24).toFixed(1)}px)` : "none";
        root.current.style.transform = `scale(${1 + (1 - v) * 0.15})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none fixed -inset-[10%] z-[6] opacity-0"
      style={{
        visibility: "hidden",
        background:
          "radial-gradient(ellipse at 30% 40%, #fff4e6 0%, transparent 55%), radial-gradient(ellipse at 70% 60%, #f6dcc4 0%, transparent 60%), linear-gradient(#f3e3d2, #e9c9ae)",
      }}
    />
  );
}
