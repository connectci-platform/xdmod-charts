import type { ChartPayload, Unit } from "./payload.js";
/**
 * Everything a producer's pure builder is given: XDMoD's answers already fetched, no I/O left.
 * `series` and `categories` are post-trim: the adapter (not the builder) drops gap-connector
 * traces, "All N Others" entries and series with no values, applies the limit, and derives
 * `has_more` and `others_count`, as access-mcp's trimToLimit does. `request.limit` is informational.
 */
export interface BuilderInput {
    request: {
        realm: string;
        statistic: string;
        group_by: string;
        dataset_type: "timeseries" | "aggregate";
        start_date: string;
        end_date: string;
        unit?: Unit;
        filters_notes: string[];
        /** True when the request filters the group_by dimension itself. */
        dimension_filtered: boolean;
        offset: number;
        limit: number;
    };
    label: string;
    /** XDMoD's description as sent (HTML allowed). */
    description: string;
    /** The current date, YYYY-MM-DD, in the producer's clock. */
    today: string;
    series?: {
        name: string;
        values: Record<string, number>;
    }[];
    categories?: {
        name: string;
        value: number | null;
    }[];
    others_count: number | null;
    has_more: boolean;
    dimension_order?: string[];
    dimension_complete?: boolean;
    latest_data_day: string | null;
    resource_days: {
        since: string;
        days: Record<string, string>;
    } | null;
    link: string | null;
    time_zone: string | null;
    instance: {
        name: string;
        url: string;
    } | null;
}
/** One file in fixtures/: the builder input and the payload every listed producer must produce. */
export type ChartFixture = {
    description: string;
    producers: ("ts" | "py")[];
    input: BuilderInput;
    expected: ChartPayload;
};
