"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { ambience } from "@/lib/audio";
import { useApp, useT } from "@/lib/store";
import { LangToggle } from "./LangToggle";

export function Loader() {
  const t = useT();
  const ready = useApp((s) => s.ready);
  const entered = useApp((s) => s.entered);
  const enter = useApp((s) => s.enter);
  const muted = useApp((s) => s.muted);
  const [count, setCount] = useState(0);
  const [gone, setGone] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef({ v: 0 });

  // Counter eases towards 90 while the scene builds, then completes once it is ready.
  useEffect(() => {
    const tween = gsap.to(counter.current, {
      v: ready ? 100 : 90,
      duration: ready ? 0.8 : 2.5,
      ease: ready ? "power2.out" : "power1.out",
      onUpdate: () => setCount(Math.round(counter.current.v)),
    });
    return () => {
      tween.kill();
    };
  }, [ready]);

  const done = count >= 100;

  const handleEnter = () => {
    ambience.start();
    ambience.setMuted(muted);
    enter();
    gsap.to(root.current, {
      opacity: 0,
      duration: 1.6,
      ease: "power2.inOut",
      onComplete: () => setGone(true),
    });
  };

  if (gone) return null;

  return (
    <div
      ref={root}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d100a]/95 text-[#f3eedf] backdrop-blur-sm"
      style={{ pointerEvents: entered ? "none" : "auto" }}
    >
      <div className="absolute top-6 right-6">
        <LangToggle />
      </div>

      <div className="relative flex flex-col items-center gap-10 px-6 text-center">
        <p className="font-display text-[clamp(4rem,14vw,10rem)] leading-none tabular-nums tracking-tight">
          {count}
          <span className="text-[0.35em] align-top opacity-50">%</span>
        </p>
        <div className="h-px w-56 overflow-hidden bg-white/15">
          <div className="h-full bg-[#e9d9a8] transition-[width] duration-300" style={{ width: `${count}%` }} />
        </div>

        <div className="h-24">
          {done ? (
            <div className="flex flex-col items-center gap-4 animate-[fadeUp_0.9s_ease_both]">
              <button
                onClick={handleEnter}
                data-cursor="hover"
                className="group relative overflow-hidden rounded-full border border-[#e9d9a8]/60 px-12 py-4 text-sm uppercase tracking-[0.35em] transition-colors hover:text-[#0d100a]"
              >
                <span className="absolute inset-0 origin-bottom scale-y-0 bg-[#e9d9a8] transition-transform duration-500 ease-out group-hover:scale-y-100" />
                <span className="relative">{t.loader.enter}</span>
              </button>
              <p className="text-xs tracking-wider text-white/50">{t.loader.hint}</p>
            </div>
          ) : (
            <p className="text-xs uppercase tracking-[0.4em] text-white/50 animate-pulse">{t.loader.loading}</p>
          )}
        </div>
      </div>
    </div>
  );
}
