import type { CSSProperties } from "react";
import type { Glow } from "./types";

/** The colour each glow lights its card with. A soft, warm set that stays readable on the light theme. */
export const GLOW_COLORS: Record<Glow, string> = {
  gold: "#e8b64a",
  rose: "#e58a97",
  green: "#5fa66e",
  blue: "#5b95d6",
  violet: "#8d7ad8",
  amber: "#e5894a",
};

export const GLOW_LABELS: Record<Glow, string> = {
  gold: "Gold",
  rose: "Rose",
  green: "Green",
  blue: "Blue",
  violet: "Violet",
  amber: "Amber",
};

/** Sets the colour the glow-card styles in globals.css read from. */
export function glowStyle(glow: Glow): CSSProperties {
  return { "--glow": GLOW_COLORS[glow] } as CSSProperties;
}
