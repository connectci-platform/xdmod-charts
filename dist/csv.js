import { dataEnd, earlyEndWhen, rankRange } from "./caption.js";
import { formatPeriod } from "./format.js";
/** How many series or bars a view draws. */
export function shownCount(view) {
    return view.kind === "line" ? view.series.length : view.bars.length;
}
/** One CSV cell: quoted when it holds a comma, quote or line break. */
export function csvCell(value) {
    if (value === null)
        return "";
    // A spreadsheet runs a text cell that starts like a formula; names come
    // from XDMoD, so they're kept as text. Numbers stay numbers.
    const text = typeof value === "string" && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
export const csvRow = (cells) => cells.map(csvCell).join(",");
/**
 * The chart's numbers as CSV: what was counted first, so the file still
 * makes sense on its own, then one row per period or bar. Missing values are
 * empty cells.
 */
export function chartCsv(view) {
    const { caption } = view;
    const end = dataEnd(caption);
    const ranks = rankRange(caption, shownCount(view));
    const rows = [
        ["Measure", caption.measure],
        ["Counted", `${caption.counted.start} to ${caption.counted.end}`],
        ...(end
            ? [("day" in end ? ["Data through", end.day] : ["No data after", end.period])]
            : []),
        ...(caption.partialPeriod
            ? [["Partial period", formatPeriod(caption.partialPeriod, caption.unit)]]
            : []),
        ...(caption.earlyEnds ?? []).map((e) => [
            e.source === "resource"
                ? `No data after (${e.name})`
                : `Nothing recorded after (${e.name})`,
            e.precision === "day" ? e.through : earlyEndWhen(e, caption.unit),
        ]),
        ["Filters", caption.filters.length ? caption.filters.join("; ") : "None"],
        ...(ranks
            ? [(caption.ordered ? ["Buckets", ranks] : ["Ranks", `${ranks} by value`])]
            : []),
        ["Retrieved", caption.retrieved],
        ["Source", caption.source],
        ...(view.link ? [["XDMoD link", view.link]] : []),
    ];
    const lines = rows.map(csvRow);
    lines.push("");
    if (view.kind === "line") {
        lines.push(csvRow(["Period", ...view.series.map((s) => s.name)]));
        for (const [i, start] of periods(view).entries()) {
            lines.push(csvRow([start, ...view.series.map((s) => s.points[i]?.value ?? null)]));
        }
    }
    else {
        lines.push(csvRow([view.dimension, caption.measure]));
        for (const bar of view.bars)
            lines.push(csvRow([bar.name, bar.value]));
    }
    return lines.join("\n");
}
/** The periods of a line chart, from its longest series. XDMoD gives every series the same periods. */
export function periods(view) {
    let longest = [];
    for (const s of view.series) {
        if (s.points.length > longest.length)
            longest = s.points.map((p) => p.start);
    }
    return longest;
}
/**
 * The index of the period that contains `day`: the last one starting on or
 * before it. data_through can fall mid-period (Oct 19 in a monthly chart), so
 * an exact match on period starts would miss it. -1 if `day` is before the first period.
 */
export function periodContaining(starts, day) {
    const target = day.slice(0, 10);
    let found = -1;
    starts.forEach((start, i) => {
        if (start.slice(0, 10) <= target)
            found = i;
    });
    return found;
}
/** A file name (no extension) from the measure and the counted range. */
export function chartFileName(view) {
    const slug = view.caption.measure
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const { start, end } = view.caption.counted;
    return `xdmod-${slug}-${start}-to-${end}`;
}
