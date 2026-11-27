import { STATISTICS } from "./generated/statistics.js";
/**
 * A statistic's kind: the table in rules/statistics.json first. For an id not
 * listed, the documented fallback: a `total_` prefix or `_count` suffix is a
 * total, anything else an average.
 */
export function measureKind(statistic) {
    const listed = STATISTICS[statistic];
    if (listed)
        return listed.kind;
    if (statistic.startsWith("total_") || statistic.endsWith("_count"))
        return "total";
    return "average";
}
