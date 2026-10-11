import { frame } from "./store";

/**
 * The page is one continuous journey measured in "section units": 0 at the top of the hero,
 * 1 at the top of the second section, and so on (see SmoothScroll).
 * Worlds hand over to each other at these boundaries, hidden behind the cloud veil.
 */
export const VALLEY_END = 2.82;

export type WorldName = "valley" | "ocean";

export const worldAt = (s: number): WorldName => (s < VALLEY_END ? "valley" : "ocean");

/** 0..1 opacity of the cloud veil that hides a world change. */
export function veilAt(s: number) {
  const d = Math.abs(s - VALLEY_END);
  const t = Math.min(Math.max((d - 0.03) / 0.14, 0), 1);
  return 1 - t * t * (3 - 2 * t);
}

export const currentWorld = () => worldAt(frame.section);
