"use client";

import { useApp } from "@/lib/store";
import type { Lang } from "@/lib/i18n";

export function LangToggle() {
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/20 p-1 text-[11px] tracking-[0.2em] backdrop-blur-md">
      {(["es", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          data-cursor="hover"
          aria-pressed={lang === l}
          className={`rounded-full px-3 py-1.5 uppercase transition-colors ${
            lang === l ? "bg-[#f3eedf] text-[#14170f]" : "text-white/70 hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
