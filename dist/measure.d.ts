import type { MeasureKind } from "./payload.js";
/**
 * A statistic's kind: the table in rules/statistics.json first. For an id not
 * listed, the documented fallback: a `total_` prefix or `_count` suffix is a
 * total, anything else an average.
 */
export declare function measureKind(statistic: string): MeasureKind;
