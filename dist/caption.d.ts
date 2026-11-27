import type { Warning } from "./payload.js";
/** A series or bar whose data stops before the rest of the chart's. */
export type EarlyEnd = {
    name: string;
    through: string;
    /** "day": the last day with data. "period": the start of the last period with data. */
    precision: "day" | "period";
    /** "resource": XDMoD has no data from that resource after it. "series": nothing recorded, reason unknown. */
    source: "resource" | "series";
};
export type CaptionFacts = {
    measure: string;
    definition: string;
    counted: {
        start: string;
        end: string;
    };
    /** Where XDMoD's data stops, when it says. */
    dataThrough?: string;
    /** "day" (the default): dataThrough is the last day with data. "period": only the start of the last period with data. */
    dataThroughPrecision?: "day" | "period";
    /** The counted range has periods after the dataThrough one, all empty. */
    noDataAfter?: boolean;
    /** The data_through period, when XDMoD's data likely covers only part of it. */
    partialPeriod?: string;
    unit?: string;
    filters: string[];
    /** One line when the chart's days are counted in a zone other than the viewer's. */
    zoneNote?: string;
    /** More series or bars than the chart draws. */
    hasMore: boolean;
    /** How many there are in all, when known. */
    total?: number;
    /** How many top-ranked ones come before the first shown. */
    offset?: number;
    /** Shown series or bars whose data stops before the chart's. */
    earlyEnds?: EarlyEnd[];
    /** What they are, plural: "resources", "fields of science", "groups". */
    groupNoun?: string;
    /** The dimension is ordered buckets (job size), not a ranking. */
    ordered?: boolean;
    incomplete: boolean;
    warnings: Warning[];
    /** The XDMoD instance's name when the payload names one, else "XDMoD". */
    source: string;
    retrieved: string;
};
/**
 * Where XDMoD's data stops, as far as the caption can honestly say. A day
 * is said when it's before the counted end. A period start is not a day the
 * data stops (the period may be full), so it's said only as "no data after"
 * that period, and only when later periods in the range are empty.
 */
export declare function dataEnd(caption: CaptionFacts): {
    day: string;
} | {
    period: string;
} | null;
/** Which ranks a chart past the top shows: "4 to 8". */
export declare function rankRange(caption: CaptionFacts, shown: number): string | null;
/** When an early end is, at the precision it's known. */
export declare function earlyEndWhen(end: EarlyEnd, unit?: string): string;
/**
 * The caption under a chart, one line per fact, in reading order. Every
 * renderer draws these, so they all say the same thing. `shown` is how many
 * series or bars the chart draws.
 */
export declare function captionLines(caption: CaptionFacts, shown: number): string[];
