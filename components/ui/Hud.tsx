"use client";

import { useEffect, useRef } from "react";
import { ambience } from "@/lib/audio";
import { frame, useApp, useT } from "@/lib/store";
import { LangToggle } from "./LangToggle";
import { scrollToSection } from "./SmoothScroll";

function SoundToggle() {
  const t = useT();
  const muted = useApp((s) => s.muted);
  const toggleMute = useApp((s) => s.toggleMute);

  useEffect(() => ambience.setMuted(muted), [muted]);

  return (
    <button
      onClick={toggleMute}
      data-cursor="hover"
      aria-label={`${t.hud.sound}: ${muted ? t.hud.off : t.hud.on}`}
      className="flex items-center gap-3 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white/80 backdrop-blur-md transition-colors hover:text-white"
    >
      <span className="flex h-3 items-end gap-[2px]" aria-hidden>
        {[0.6, 1, 0.45, 0.8].map((h, i) => (
          <span
            key={i}
            className="w-[2px] origin-bottom rounded-full bg-current"
            style={{
              height: `${h * 100}%`,
              animation: muted ? "none" : `eq 1.${i + 1}s ease-in-out ${i * 0.15}s infinite alternate`,
              transform: muted ? "scaleY(0.25)" : undefined,
            }}
          />
        ))}
      </span>
      <span className="hidden sm:inline">{muted ? t.hud.off : t.hud.on}</span>
    </button>
  );
}

function ProgressBar() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${frame.scroll})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-40 h-[2px] bg-white/5">
      <div ref={bar} className="h-full origin-left scale-x-0 bg-[#e9d9a8]/80" />
    </div>
  );
}

function SectionNav() {
  const t = useT();
  const active = useApp((s) => s.activeSection);
  return (
    <nav className="fixed top-1/2 right-5 z-40 hidden -translate-y-1/2 flex-col gap-4 md:flex" aria-label="Sections">
      {t.nav.map((label, i) => (
        <button
          key={label}
          onClick={() => scrollToSection(i)}
          data-cursor="hover"
          aria-current={active === i}
          className="group flex items-center justify-end gap-3"
        >
          <span
            className={`text-[10px] uppercase tracking-[0.25em] transition-all duration-500 ${
              active === i ? "translate-x-0 text-white/90 opacity-100" : "translate-x-2 text-white/60 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
            }`}
          >
            {label}
          </span>
          <span
            className={`block rounded-full transition-all duration-500 ${
              active === i ? "h-6 w-[3px] bg-[#e9d9a8]" : "h-[6px] w-[3px] bg-white/50 group-hover:bg-white"
            }`}
          />
        </button>
      ))}
    </nav>
  );
}

export function Hud() {
  const entered = useApp((s) => s.entered);
  return (
    <div className={`transition-opacity duration-[1500ms] ${entered ? "opacity-100" : "opacity-0"}`}>
      <ProgressBar />
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-5 sm:px-8">
        <button
          onClick={() => scrollToSection(0)}
          data-cursor="hover"
          className="font-display text-xl tracking-tight text-[#f3eedf] drop-shadow"
        >
          Discovery<span className="text-[#e9d9a8]">.</span>
        </button>
        <div className="flex items-center gap-3">
          <SoundToggle />
          <LangToggle />
        </div>
      </header>
      <SectionNav />
    </div>
  );
}
