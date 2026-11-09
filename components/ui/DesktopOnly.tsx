"use client";

import { useT } from "@/lib/store";
import { LangToggle } from "./LangToggle";

/** Shown instead of the experience on phones and tablets. */
export function DesktopOnly() {
  const t = useT();

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-[#0d100a] px-6 text-center text-[#f3eedf]">
      <div className="absolute top-6 right-6">
        <LangToggle />
      </div>
      <p className="font-display text-[clamp(3rem,14vw,5rem)] leading-none tracking-tight">{t.hero.title}</p>
      <div className="h-px w-16 bg-[#e9d9a8]/60" />
      <h1 className="text-sm uppercase tracking-[0.3em] text-[#e9d9a8]">{t.desktopOnly.title}</h1>
      <p className="max-w-sm text-sm leading-relaxed text-white/60">{t.desktopOnly.body}</p>
    </main>
  );
}
