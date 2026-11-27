export type Unit = "Day" | "Week" | "Month" | "Quarter" | "Year";
export type MeasureKind = "total" | "average";
export type DataEndSource = "resource" | "series";

export type Warning = { code: string; text: string };

export interface ChartPayload {
  version: 1;
  realm: string;
  statistic: string;
  group_by: string;
  dataset_type: "timeseries" | "aggregate";
  unit?: Unit;
  requested: { start: string; end: string };
  counted: { start: string; end: string };
  last_period_incomplete: boolean;
  measure: {
    label: string;
    description: string;
    kind: MeasureKind;
    missing: "zero" | "gap";
    unit?: string;
  };
  dimension: { name: string; ordered: boolean };
  /** What the chart was filtered to, one note per filter value; empty when unfiltered. */
  filters: { notes: string[] };
  /** The zone the periods are in. */
  time_basis?: { zone: string };
  warnings?: Warning[];
  /** The XDMoD instance the data came from. */
  instance?: { name: string; url: string };
  /**
   * A series' data_through is set only when its values stop before the chart's:
   * the start of its last period with a value ("period"), or a last day ("day").
   */
  series?: {
    name: string;
    points: { start: string; value: number | null }[];
    data_through?: string;
    data_through_precision?: "day" | "period";
    data_through_source?: DataEndSource;
  }[];
  categories?: {
    name: string;
    value: number | null;
    data_through?: string;
    data_through_source?: DataEndSource;
  }[];
  /** How many top-ranked series or categories XDMoD skipped before these. Absent in older payloads. */
  offset?: number;
  data_through?: string | null;
  data_through_precision?: "day" | "period" | null;
  others_count?: number | null;
  last_data_period_partial?: boolean;
  has_more: boolean;
  ranked_by?: "value";
  /** Null when the public portal can't open this chart. */
  link?: string | null;
  source: "XDMoD";
  retrieved: string;
}
