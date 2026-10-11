"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useApp } from "@/lib/store";
import type { Lang } from "@/lib/i18n";
import { Cursor } from "./ui/Cursor";
import { Hud } from "./ui/Hud";
import { Loader } from "./ui/Loader";
import { Sections } from "./ui/Sections";
import { SmoothScroll } from "./ui/SmoothScroll";
import { Veil } from "./ui/Veil";

const Experience = dynamic(() => import("./scene/Experience"), { ssr: false });

export function App() {
  const setLang = useApp((s) => s.setLang);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("lang");
    } catch {}
    const lang: Lang = saved === "es" || saved === "en" ? saved : navigator.language.startsWith("es") ? "es" : "en";
    setLang(lang);
  }, [setLang]);

  return (
    <>
      <Experience />
      <SmoothScroll />
      <Sections />
      <Veil />
      <Hud />
      <Loader />
      <Cursor />
      <div className="grain pointer-events-none fixed inset-0 z-30" aria-hidden />
      <div className="vignette pointer-events-none fixed inset-0 z-[5]" aria-hidden />
    </>
  );
}
