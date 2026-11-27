import { formatDay } from "./format.js";
import { MAX_SERIES, PALETTE, colorFor } from "./palette.js";
/** The warnings used only when the payload has no `warnings` field. */
export const BUILT_IN_WARNINGS = [
    {
        code: "waiting-not-counted",
        text: "Jobs still waiting aren't counted, and the last few days may be incomplete.",
    },
    {
        code: "not-comparable-across-resources",
        text: "CPU hours don't allow for each resource's compute power per core, so they aren't comparable across resources. ACE measures are.",
    },
    {
        code: "mean-of-jobs",
        text: "This is an average per job, so a few long jobs can pull it up.",
    },
];
const builtIn = (code) => BUILT_IN_WARNINGS.find((w) => w.code === code);
export function isChartWorthy(chart) {
    if (chart.dataset_type === "aggregate") {
        return (chart.categories?.length ?? 0) > 1;
    }
    let nonNull = 0;
    for (const s of chart.series ?? []) {
        for (const p of s.points)
            if (p.value !== null)
                nonNull++;
    }
    return nonNull > 1;
}
export const DIMENSION_LABELS = {
    none: "Name",
    resource: "Resource",
    resource_type: "Resource type",
    fieldofscience: "Field of science",
    parentscience: "Parent science",
    nsfdirectorate: "NSF directorate",
    jobsize: "Job size",
    jobwalltime: "Job wall time",
    jobwaittime: "Job wait time",
    queue: "Queue",
    person: "User",
    username: "User",
    pi: "PI",
    institution: "Institution",
    provider: "Service provider",
    allocation: "Allocation",
    gpucount: "GPU count",
};
export const DIMENSION_NOUNS = {
    resource: "resources",
    resource_type: "resource types",
    fieldofscience: "fields of science",
    parentscience: "parent sciences",
    nsfdirectorate: "NSF directorates",
    queue: "queues",
    person: "users",
    username: "users",
    pi: "PIs",
    institution: "institutions",
    provider: "service providers",
    allocation: "allocations",
};
/** A readable column name for an XDMoD dimension id. */
export function dimensionLabel(name) {
    const known = DIMENSION_LABELS[name.toLowerCase()];
    if (known)
        return known;
    return name
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
}
const CPU_HOUR_STATISTICS = new Set(["total_cpu_hours", "avg_cpu_hours"]);
/** The built-in warnings for a payload that has no `warnings` field. */
function builtInWarningsFor(chart) {
    const warnings = [];
    const { statistic, realm } = chart;
    if (realm.toLowerCase() === "jobs" && chart.last_period_incomplete) {
        warnings.push(builtIn("waiting-not-counted"));
    }
    // XD SUs are normalized and comparable across resources, and ACEs allow
    // comparison between resources with different compute power per core; CPU hours don't.
    if ((chart.group_by === "resource" || chart.dimension.name === "resource") &&
        CPU_HOUR_STATISTICS.has(statistic)) {
        warnings.push(builtIn("not-comparable-across-resources"));
    }
    if (statistic.startsWith("avg_"))
        warnings.push(builtIn("mean-of-jobs"));
    return warnings;
}
function earlyEnd(name, through, precision, source) {
    // Without a source, nothing is known about why: say the least.
    return through
        ? { name, through, precision: precision ?? "day", source: source ?? "series" }
        : undefined;
}
function lastNonNull(points) {
    for (let i = points.length - 1; i >= 0; i--)
        if (points[i].value !== null)
            return i;
    return -1;
}
/**
 * What a screen reader hears for the drawing, in place of its tick labels.
 * The table view holds the values themselves.
 */
export function chartSummary(view) {
    const { start, end } = view.caption.counted;
    const range = `${formatDay(start)} to ${formatDay(end)}`;
    const what = view.kind === "line"
        ? `Line chart of ${view.title}, ${view.series.length} series`
        : `Bar chart of ${view.title} by ${view.dimension.toLowerCase()}, ${view.bars.length} ${view.bars.length === 1 ? "bar" : "bars"}`;
    return `${what}, ${range}. The Table view lists the values.`;
}
export function toView(chart, options = {}) {
    const zero = chart.measure.missing === "zero";
    const fill = (v) => (v === null && zero ? 0 : v);
    // Past the last period XDMoD has data for, missing means unknown, not
    // zero: filling it would draw a drop that didn't happen.
    const through = chart.data_through;
    const fillPoint = (p) => through && p.start.slice(0, 10) > through ? p.value : fill(p.value);
    let kind;
    let series = [];
    let bars = [];
    let arrived;
    let earlyEnds;
    if (chart.dataset_type === "timeseries") {
        kind = "line";
        // A series that stops before the others stops there too: its own last
        // value, not the chart's, ends what can be read as zero.
        const filled = (chart.series ?? []).flatMap((s) => {
            const last = lastNonNull(s.points);
            if (last === -1)
                return [];
            return [
                {
                    name: s.name,
                    points: s.points.map((p, i) => ({
                        start: p.start,
                        value: i > last ? p.value : fillPoint(p),
                    })),
                    end: earlyEnd(s.name, s.data_through, s.data_through_precision, s.data_through_source),
                },
            ];
        });
        arrived = filled.length;
        // A trailing period no series has any value for draws nothing, so the
        // axis stops at the last period with data.
        let periodsWithData = 0;
        for (const s of filled)
            periodsWithData = Math.max(periodsWithData, lastNonNull(s.points) + 1);
        for (const s of filled)
            s.points = s.points.slice(0, periodsWithData);
        const drawn = filled.slice(0, MAX_SERIES);
        const names = drawn.map((s) => s.name);
        series = drawn.map(({ name, points }) => ({
            name,
            color: colorFor(name, names, "light"),
            darkColor: colorFor(name, names, "dark"),
            points,
        }));
        earlyEnds = drawn.flatMap((s) => (s.end ? [s.end] : []));
    }
    else {
        // One measure, one colour: every bar takes the first slot.
        const color = PALETTE.light[0];
        const darkColor = PALETTE.dark[0];
        bars = (chart.categories ?? []).map((c) => ({
            name: c.name,
            color,
            darkColor,
            value: fill(c.value),
        }));
        if (chart.dimension.ordered) {
            kind = "bar-ordered";
        }
        else {
            kind = "bar-ranked";
            bars = bars
                .map((b, i) => ({ b, i }))
                .sort((x, y) => {
                if (x.b.value === null || y.b.value === null) {
                    return x.b.value === y.b.value ? x.i - y.i : x.b.value === null ? 1 : -1;
                }
                return y.b.value - x.b.value || x.i - y.i;
            })
                .map(({ b }) => b);
        }
        arrived = bars.length;
        earlyEnds = (chart.categories ?? []).flatMap((c) => earlyEnd(c.name, c.data_through, "day", c.data_through_source) ?? []);
    }
    const shown = kind === "line" ? series.length : bars.length;
    const offset = chart.offset ?? 0;
    const others = chart.has_more ? chart.others_count : 0;
    const total = others === null || others === undefined ? undefined : offset + arrived + others;
    const precision = chart.data_through_precision ??
        (chart.dataset_type === "aggregate" || chart.unit === "Day" ? "day" : "period");
    const noDataAfter = !!through &&
        (chart.series ?? []).some((s) => s.points.some((p) => p.start.slice(0, 10) > through));
    const instance = options.instance ?? chart.instance ?? null;
    const zone = chart.time_basis?.zone;
    const zoneNote = zone && options.viewerZone && zone !== options.viewerZone
        ? `Days are counted in ${zone} time.`
        : undefined;
    const view = {
        kind,
        title: chart.measure.label,
        dimension: dimensionLabel(chart.dimension.name),
        series,
        bars,
        caption: {
            measure: chart.measure.label,
            definition: chart.measure.description,
            counted: { ...chart.counted },
            ...(chart.data_through
                ? { dataThrough: chart.data_through, dataThroughPrecision: precision, noDataAfter }
                : {}),
            ...(chart.data_through && chart.last_data_period_partial
                ? { partialPeriod: chart.data_through }
                : {}),
            unit: chart.unit,
            filters: [...chart.filters.notes],
            ...(zoneNote ? { zoneNote } : {}),
            hasMore: chart.has_more || shown < arrived,
            ...(total !== undefined ? { total } : {}),
            ...(offset > 0 ? { offset } : {}),
            ...(earlyEnds.length > 0 ? { earlyEnds } : {}),
            groupNoun: DIMENSION_NOUNS[chart.dimension.name.toLowerCase()] ?? "groups",
            ordered: chart.dimension.ordered,
            incomplete: chart.last_period_incomplete,
            warnings: chart.warnings ? chart.warnings.map((w) => ({ ...w })) : builtInWarningsFor(chart),
            source: instance?.name ?? chart.source,
            retrieved: chart.retrieved,
        },
        // The payload crossed a network boundary: only a web link is followed.
        link: chart.link?.startsWith("https:") ? chart.link : null,
        instance: instance ? { ...instance } : null,
    };
    return { ...view, summary: chartSummary(view) };
}
