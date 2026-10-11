import { MathUtils } from "three";
import { frame } from "./store";
import { worldAt, type WorldName } from "./worlds";

/**
 * Smoothed journey state, advanced once per frame before any world reads it.
 * Both the WebGL worlds and the DOM veil read `s`, so world swaps line up with the veil.
 */
export const journey = {
  /** Smoothed scroll position in section units */
  s: 0,
  world: "valley" as WorldName,
  /** 0..1 intro dolly after the visitor enters */
  intro: 0,
};

export function updateJourney(dt: number, entered: boolean) {
  journey.s = MathUtils.damp(journey.s, frame.section, 3, dt);
  if (entered) journey.intro = MathUtils.damp(journey.intro, 1, 1.1, dt);

  // Dev-only: `window.__snap = 3.5` jumps straight to a point of the journey.
  if (process.env.NODE_ENV !== "production") {
    const snap = (window as unknown as { __snap?: number }).__snap;
    if (snap !== undefined) {
      journey.s = snap;
      journey.intro = 1;
    }
  }
  journey.world = worldAt(journey.s);
}

/** Global pointer bookkeeping shared by every world. */
export const pointer = {
  has: false,
  lastMove: -1e4,
  /** Smoothed speed in px per 60fps frame */
  speed: 0,
  /** Increments on every press on the scene (not on UI controls) */
  presses: 0,
  distance: 0,
  x: 0,
  y: 0,
};

let listening = false;
export function listenPointer() {
  if (listening) return;
  listening = true;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (pointer.has) pointer.distance += Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y);
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.has = true;
      pointer.lastMove = performance.now();
    },
    { passive: true },
  );
  window.addEventListener("pointerdown", (e) => {
    if ((e.target as Element | null)?.closest?.("a, button, [data-cursor]")) return;
    pointer.presses++;
  });
  document.documentElement.addEventListener("pointerleave", () => {
    pointer.has = false;
    pointer.lastMove = -1e4;
  });
}

export function updatePointer(dt: number) {
  const raw = pointer.distance / Math.max(dt * 60, 1);
  pointer.distance = 0;
  pointer.speed = MathUtils.damp(pointer.speed, raw, 6, dt);
}

export const pointerRecentlyMoved = (ms = 2500) => pointer.has && performance.now() - pointer.lastMove < ms;
