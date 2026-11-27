/** A UTC date, so "2026-08-01" stays Aug 1 wherever the reader is. */
export declare function parseDay(iso: string): Date | null;
/** "2026-08-01" as "Aug 1, 2026". Anything else comes back unchanged. */
export declare function formatDay(iso: string): string;
/** A period's start date, named at the chart's unit: "Aug 2026", "Q3 2026", "Week of Nov 2, 2026". */
export declare function formatPeriod(start: string, unit?: string): string;
