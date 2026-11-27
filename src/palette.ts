import { PALETTE } from "./generated/palette.js";

export { PALETTE };

/** The most series a timeseries chart draws: one palette slot each. */
export const MAX_SERIES = PALETTE.light.length;

/**
 * The colour for a series, by name. Names are sorted (stable, locale-independent
 * of the input order) and slot i goes to the i-th, so reordering the input
 * never changes a name's colour and no two names in `names` share a slot
 * while there are at most MAX_SERIES of them.
 */
export function colorFor(name: string, names: string[], mode: "light" | "dark" = "light"): string {
  const colors = PALETTE[mode];
  const sorted = [...new Set(names)].sort(byName);
  const i = sorted.indexOf(name);
  return colors[(i < 0 ? 0 : i) % colors.length];
}

function byName(a: string, b: string): number {
  return a.localeCompare(b, "en") || (a < b ? -1 : a > b ? 1 : 0);
}
