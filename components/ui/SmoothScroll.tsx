"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";
import { frame, useApp } from "@/lib/store";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export const scrollToSection = (index: number) => {
  const el = document.querySelectorAll<HTMLElement>("[data-section]")[index];
  if (el) lenis?.scrollTo(el, { duration: 2.2 });
};

/** Lenis smooth scroll wired into GSAP's ticker; scroll is locked until the visitor enters. */
export function SmoothScroll() {
  const entered = useApp((s) => s.entered);
  const setActiveSection = useApp((s) => s.setActiveSection);

  useEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lenis = new Lenis({ lerp: reduced ? 1 : 0.075, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
    lenis.stop();

    // Section tops/heights, cached and refreshed on resize.
    let bounds: { top: number; height: number }[] = [];
    const measure = () => {
      bounds = Array.from(document.querySelectorAll<HTMLElement>("[data-section]")).map((el) => ({
        top: el.offsetTop,
        height: el.offsetHeight,
      }));
    };
    const toSection = (y: number) => {
      let i = 0;
      while (i < bounds.length - 1 && y >= bounds[i + 1].top) i++;
      const b = bounds[i];
      return b ? i + Math.min(Math.max((y - b.top) / b.height, 0), 1) : 0;
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);

    lenis.on("scroll", (l: Lenis) => {
      frame.scroll = l.progress || 0;
      frame.section = toSection(l.animatedScroll);
      frame.velocity = l.velocity;
      ScrollTrigger.update();
    });
    const tick = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const sections = gsap.utils.toArray<HTMLElement>("[data-section]");
    const triggers = sections.map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => self.isActive && setActiveSection(i),
      }),
    );

    return () => {
      triggers.forEach((t) => t.kill());
      resizeObserver.disconnect();
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    };
  }, [setActiveSection]);

  useEffect(() => {
    if (entered) lenis?.start();
  }, [entered]);

  return null;
}
