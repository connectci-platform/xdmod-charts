import type { ChartView } from "./view.js";
/** How many series or bars a view draws. */
export declare function shownCount(view: ChartView): number;
/** One CSV cell: quoted when it holds a comma, quote or line break. */
export declare function csvCell(value: string | number | null): string;
export declare const csvRow: (cells: (string | number | null)[]) => string;
/**
 * The chart's numbers as CSV: what was counted first, so the file still
 * makes sense on its own, then one row per period or bar. Missing values are
 * empty cells.
 */
export declare function chartCsv(view: ChartView): string;
/** The periods of a line chart, from its longest series. XDMoD gives every series the same periods. */
export declare function periods(view: ChartView): string[];
/**
 * The index of the period that contains `day`: the last one starting on or
 * before it. data_through can fall mid-period (Oct 19 in a monthly chart), so
 * an exact match on period starts would miss it. -1 if `day` is before the first period.
 */
export declare function periodContaining(starts: string[], day: string): number;
/** A file name (no extension) from the measure and the counted range. */
export declare function chartFileName(view: ChartView): string;
