import { create } from "zustand";
import { dict, type Lang } from "./i18n";

interface AppState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  ready: boolean;
  setReady: () => void;
  entered: boolean;
  enter: () => void;
  muted: boolean;
  toggleMute: () => void;
  activeSection: number;
  setActiveSection: (i: number) => void;
}

export const useApp = create<AppState>((set) => ({
  lang: "es",
  setLang: (lang) => {
    try {
      localStorage.setItem("lang", lang);
    } catch {}
    document.documentElement.lang = lang;
    set({ lang });
  },
  ready: false,
  setReady: () => set({ ready: true }),
  entered: false,
  enter: () => set({ entered: true }),
  muted: false,
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  activeSection: 0,
  setActiveSection: (activeSection) => set({ activeSection }),
}));

export const useT = () => dict[useApp((s) => s.lang)];

/**
 * Per-frame values shared between the DOM and the WebGL scene.
 * Kept outside React state so writing them never triggers a re-render.
 */
export const frame = {
  /** Raw page scroll progress, 0..1 */
  scroll: 0,
  /** Scroll position in section units: 2.5 = halfway through the third section */
  section: 0,
  /** Scroll velocity reported by Lenis */
  velocity: 0,
};
