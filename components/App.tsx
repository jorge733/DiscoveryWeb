"use client";

import { lazy, Suspense, useEffect, useSyncExternalStore } from "react";
import { isDesktop } from "@/lib/platform";
import { useApp } from "@/lib/store";
import type { Lang } from "@/lib/i18n";
import { Cursor } from "./ui/Cursor";
import { DesktopOnly } from "./ui/DesktopOnly";
import { Hud } from "./ui/Hud";
import { Loader } from "./ui/Loader";
import { Sections } from "./ui/Sections";
import { SmoothScroll } from "./ui/SmoothScroll";
import { Veil } from "./ui/Veil";

// React.lazy rather than next/dynamic, whose chunk is fetched even when never rendered (phones).
const Experience = lazy(() => import("./scene/Experience"));

const subscribe = () => () => {};

export function App() {
  const setLang = useApp((s) => s.setLang);
  // null during server render: the device is unknown until the browser takes over.
  const desktop = useSyncExternalStore<boolean | null>(subscribe, isDesktop, () => null);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("lang");
    } catch {}
    const lang: Lang = saved === "es" || saved === "en" ? saved : navigator.language.startsWith("es") ? "es" : "en";
    setLang(lang);
  }, [setLang]);

  if (desktop === null) return null;
  if (!desktop) return <DesktopOnly />;

  return (
    <>
      <Suspense>
        <Experience />
      </Suspense>
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
