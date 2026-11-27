import { PALETTE } from "./generated/palette.js";
export { PALETTE };
/** The most series a timeseries chart draws: one palette slot each. */
export declare const MAX_SERIES: number;
/**
 * The colour for a series, by name. Names are sorted (stable, locale-independent
 * of the input order) and slot i goes to the i-th, so reordering the input
 * never changes a name's colour and no two names in `names` share a slot
 * while there are at most MAX_SERIES of them.
 */
export declare function colorFor(name: string, names: string[], mode?: "light" | "dark"): string;
