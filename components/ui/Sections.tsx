"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { useApp, useT } from "@/lib/store";
import { scrollToSection } from "./SmoothScroll";

gsap.registerPlugin(ScrollTrigger);

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p data-reveal className="mb-5 text-[11px] uppercase tracking-[0.4em] text-[#e9d9a8]">
      {children}
    </p>
  );
}

/** Splits a title into letters that rise in one by one once the visitor enters. */
function HeroTitle({ text }: { text: string }) {
  const entered = useApp((s) => s.entered);
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const letters = ref.current.querySelectorAll("span");
    if (!entered) {
      gsap.set(letters, { yPercent: 110, opacity: 0 });
      return;
    }
    gsap.to(letters, { yPercent: 0, opacity: 1, duration: 1.6, ease: "expo.out", stagger: 0.06, delay: 0.6 });
  }, [entered, text]);

  return (
    <h1 ref={ref} className="font-display overflow-hidden pb-[0.1em] text-[clamp(4rem,16vw,14rem)] leading-[0.9] tracking-[-0.03em]" aria-label={text}>
      {text.split("").map((ch, i) => (
        <span key={i} className="inline-block" aria-hidden>
          {ch}
        </span>
      ))}
    </h1>
  );
}

export function Sections() {
  const t = useT();
  const entered = useApp((s) => s.entered);
  const root = useRef<HTMLElement>(null);

  // Scroll-driven reveals for every [data-reveal] element.
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-section]:not(:first-child) [data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 50, opacity: 0, filter: "blur(8px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1.3,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" },
          },
        );
      });
      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        gsap.to(el, {
          yPercent: -30,
          ease: "none",
          scrollTrigger: { trigger: el.closest("[data-section]"), start: "top bottom", end: "bottom top", scrub: true },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <main ref={root} className="relative z-10 text-[#f3eedf]">
      {/* Hero */}
      <section data-section className="relative flex h-[100svh] flex-col items-center justify-center px-6 text-center">
        <div data-parallax className="flex flex-col items-center">
          <p
            className={`mb-4 text-[11px] uppercase tracking-[0.45em] text-white/80 transition-all delay-300 duration-[1500ms] ${entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            {t.hero.kicker}
          </p>
          <HeroTitle text={t.hero.title} />
          <p
            className={`mt-6 max-w-xl text-lg text-white/85 transition-all delay-[1200ms] duration-[1500ms] sm:text-xl ${entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            {t.hero.subtitle}
          </p>
        </div>
        <button
          onClick={() => scrollToSection(1)}
          data-cursor="hover"
          className={`absolute bottom-10 flex flex-col items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-white/75 transition-opacity delay-[2000ms] duration-1000 ${entered ? "opacity-100" : "opacity-0"}`}
        >
          {t.hero.scroll}
          <span className="relative block h-12 w-px overflow-hidden bg-white/20">
            <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollLine_2s_ease-in-out_infinite] bg-white" />
          </span>
        </button>
      </section>

      {/* Real time */}
      <section data-section className="flex min-h-[130svh] items-center px-6 sm:px-12 lg:px-24">
        <div className="max-w-xl">
          <Kicker>{t.realtime.kicker}</Kicker>
          <h2 data-reveal className="font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] tracking-tight">
            {t.realtime.title}
          </h2>
          <p data-reveal className="mt-8 text-lg leading-relaxed text-white/85">
            {t.realtime.body}
          </p>
          <p data-reveal className="mt-6 inline-flex items-center gap-3 text-sm text-[#e9d9a8]">
            <span className="h-px w-8 bg-current" />
            {t.realtime.action}
          </p>
        </div>
      </section>

      {/* Listen */}
      <section data-section className="flex min-h-[130svh] items-center justify-end px-6 sm:px-12 lg:px-24">
        <div className="max-w-xl text-right">
          <Kicker>{t.listen.kicker}</Kicker>
          <h2 data-reveal className="font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] tracking-tight">
            {t.listen.title}
          </h2>
          <p data-reveal className="mt-8 text-lg leading-relaxed text-white/85">
            {t.listen.body}
          </p>
          <p data-reveal className="mt-6 inline-flex items-center gap-3 text-sm text-[#e9d9a8]">
            {t.listen.action}
            <span className="h-px w-8 bg-current" />
          </p>
        </div>
      </section>

      {/* Worlds */}
      <section data-section className="flex min-h-[150svh] flex-col justify-center px-6 py-32 sm:px-12 lg:px-24">
        <Kicker>{t.worlds.kicker}</Kicker>
        <h2 data-reveal className="font-display max-w-3xl text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] tracking-tight">
          {t.worlds.title}
        </h2>
        <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.worlds.items.map((w, i) => (
            <li
              key={w.name}
              data-reveal
              data-cursor="hover"
              className="group relative overflow-hidden rounded-2xl border border-white/15 bg-black/25 p-7 backdrop-blur-md transition-colors duration-500 hover:border-[#e9d9a8]/50 hover:bg-black/35"
            >
              <div className="flex items-start justify-between">
                <span className="font-display text-sm text-white/50">0{i + 2}</span>
                <span className="rounded-full border border-white/20 px-3 py-1 text-[9px] uppercase tracking-[0.25em] text-white/60">
                  {t.worlds.soon}
                </span>
              </div>
              <h3 className="font-display mt-10 text-3xl transition-transform duration-500 group-hover:-translate-y-1">{w.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{w.desc}</p>
              <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-[#e9d9a8] transition-transform duration-700 group-hover:scale-x-100" />
            </li>
          ))}
        </ul>
      </section>

      {/* Credits */}
      <section data-section className="flex min-h-[120svh] flex-col items-center justify-end px-6 pb-24 text-center">
        <Kicker>{t.credits.kicker}</Kicker>
        <h2 data-reveal className="font-display text-[clamp(2.75rem,8vw,7rem)] leading-[0.95] tracking-tight">
          {t.credits.title}
        </h2>
        <p data-reveal className="mt-8 max-w-2xl text-sm leading-loose tracking-wide text-white/75">
          {t.credits.body}
        </p>
        <p data-reveal className="mt-4 text-[10px] uppercase tracking-[0.4em] text-[#e9d9a8]/80">
          {t.credits.phase}
        </p>
        <button
          data-reveal
          onClick={() => scrollToSection(0)}
          data-cursor="hover"
          className="mt-12 rounded-full border border-white/30 px-8 py-3 text-[11px] uppercase tracking-[0.3em] transition-colors hover:border-white hover:bg-white hover:text-[#14170f]"
        >
          {t.credits.top}
        </button>
      </section>
    </main>
  );
}
