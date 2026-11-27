import type { ChartPayload, Warning } from "./payload.js";
import type { CaptionFacts } from "./caption.js";
type Value = number | null;
export type ChartView = {
    kind: "line" | "bar-ranked" | "bar-ordered";
    title: string;
    /** What the bars are, readable: "Resource", "Field of science". */
    dimension: string;
    /** `color` is the light-mode colour, `darkColor` the dark-mode one. */
    series: {
        name: string;
        color: string;
        darkColor: string;
        points: {
            start: string;
            value: Value;
        }[];
    }[];
    bars: {
        name: string;
        color: string;
        darkColor: string;
        value: Value;
    }[];
    caption: CaptionFacts;
    /** What a screen reader hears for the drawing; the table view holds the values. */
    summary: string;
    /** An https link into XDMoD, or null when there is none to offer. */
    link: string | null;
    /** The XDMoD instance the data came from, when the payload or caller names one. */
    instance: {
        name: string;
        url: string;
    } | null;
};
export type ViewOptions = {
    /** Overrides the payload's instance. */
    instance?: {
        name: string;
        url: string;
    };
    /** The viewer's time zone; a differing time_basis.zone adds a caption line. */
    viewerZone?: string;
};
/** The warnings used only when the payload has no `warnings` field. */
export declare const BUILT_IN_WARNINGS: readonly Warning[];
export declare function isChartWorthy(chart: ChartPayload): boolean;
export declare const DIMENSION_LABELS: Record<string, string>;
export declare const DIMENSION_NOUNS: Record<string, string>;
/** A readable column name for an XDMoD dimension id. */
export declare function dimensionLabel(name: string): string;
/**
 * What a screen reader hears for the drawing, in place of its tick labels.
 * The table view holds the values themselves.
 */
export declare function chartSummary(view: Pick<ChartView, "kind" | "title" | "dimension" | "series" | "bars" | "caption">): string;
export declare function toView(chart: ChartPayload, options?: ViewOptions): ChartView;
export {};
