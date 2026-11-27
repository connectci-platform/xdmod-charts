import { describe, it, expect } from "vitest";
import { toView, isChartWorthy, chartSummary, BUILT_IN_WARNINGS } from "../src/view.js";
import { captionLines } from "../src/caption.js";
import { PALETTE, MAX_SERIES } from "../src/palette.js";
import type { ChartPayload } from "../src/payload.js";

function payload(over: Partial<ChartPayload> = {}): ChartPayload {
  return {
    version: 1,
    realm: "Jobs",
    statistic: "total_cpu_hours",
    group_by: "none",
    dataset_type: "timeseries",
    unit: "Month",
    requested: { start: "2026-06-01", end: "2026-10-31" },
    counted: { start: "2026-06-01", end: "2026-10-31" },
    last_period_incomplete: false,
    measure: { label: "CPU Hours: Total", description: "Total CPU hours used by jobs.", kind: "total", missing: "gap" },
    dimension: { name: "none", ordered: false },
    filters: { notes: [] },
    series: [
      {
        name: "All",
        points: [
          { start: "2026-06-01", value: 10 },
          { start: "2026-07-01", value: 20 },
          { start: "2026-08-01", value: 15 },
          { start: "2026-09-01", value: 25 },
          { start: "2026-10-01", value: 30 },
        ],
      },
    ],
    has_more: false,
    ranked_by: "value",
    link: "https://xdmod.example.org/#usage",
    source: "XDMoD",
    retrieved: "2026-11-09",
    ...over,
  };
}

function bars(over: Partial<ChartPayload> = {}): ChartPayload {
  return payload({
    dataset_type: "aggregate",
    unit: undefined,
    series: undefined,
    group_by: "resource",
    dimension: { name: "resource", ordered: false },
    categories: [
      { name: "Cluster B", value: 5 },
      { name: "Cluster A", value: 50 },
      { name: "Cluster C", value: 20 },
    ],
    ...over,
  });
}

describe("isChartWorthy", () => {
  it("needs more than one category or point", () => {
    expect(isChartWorthy(bars())).toBe(true);
    expect(isChartWorthy(bars({ categories: [{ name: "A", value: 1 }] }))).toBe(false);
    expect(isChartWorthy(payload())).toBe(true);
    expect(isChartWorthy(payload({ series: [{ name: "A", points: [{ start: "2026-06-01", value: 1 }, { start: "2026-07-01", value: null }] }] }))).toBe(false);
  });
});

describe("toView kinds", () => {
  it("draws ranked bars biggest first", () => {
    const v = toView(bars());
    expect(v.kind).toBe("bar-ranked");
    expect(v.bars.map((b) => b.name)).toEqual(["Cluster A", "Cluster C", "Cluster B"]);
    expect(v.dimension).toBe("Resource");
  });
  it("keeps ordered bars in the payload's order", () => {
    const v = toView(
      bars({
        group_by: "jobsize",
        dimension: { name: "jobsize", ordered: true },
        categories: [{ name: "1 - 16", value: 5 }, { name: "17 - 64", value: 50 }, { name: "65+", value: 20 }],
      }),
    );
    expect(v.kind).toBe("bar-ordered");
    expect(v.bars.map((b) => b.name)).toEqual(["1 - 16", "17 - 64", "65+"]);
  });
  it("gives every bar the first palette slot and a line chart its own colours", () => {
    expect(toView(bars()).bars.every((b) => b.color === PALETTE.light[0] && b.darkColor === PALETTE.dark[0])).toBe(true);
    const s = toView(payload()).series[0];
    expect([s.color, s.darkColor]).toEqual([PALETTE.light[0], PALETTE.dark[0]]);
  });
});

describe("toView values", () => {
  it("leaves a gap measure's missing value null and fills a total's with 0", () => {
    const pts = [{ start: "2026-06-01", value: 1 }, { start: "2026-07-01", value: null }, { start: "2026-08-01", value: 3 }];
    expect(toView(payload({ series: [{ name: "A", points: pts }] })).series[0].points[1].value).toBeNull();
    const zero = payload({
      measure: { label: "Jobs", description: "d", kind: "total", missing: "zero" },
      series: [{ name: "A", points: pts }],
    });
    expect(toView(zero).series[0].points[1].value).toBe(0);
  });
  it("doesn't draw a series as dropping to 0 after its own data ends, and drops empty series", () => {
    const day = (d: number) => `2026-10-${String(d).padStart(2, "0")}`;
    const v = toView(
      payload({
        unit: "Day",
        measure: { label: "Jobs", description: "d", kind: "total", missing: "zero" },
        counted: { start: day(18), end: day(21) },
        data_through: day(21),
        data_through_precision: "day",
        series: [
          { name: "A", points: [18, 19, 20, 21].map((d) => ({ start: day(d), value: d <= 19 ? 5 : null })) },
          { name: "B", points: [18, 19, 20, 21].map((d) => ({ start: day(d), value: 7 })) },
          { name: "Empty", points: [18, 19, 20, 21].map((d) => ({ start: day(d), value: null })) },
        ],
      }),
    );
    expect(v.series.map((s) => s.name)).toEqual(["A", "B"]);
    expect(v.series[0].points.map((p) => p.value)).toEqual([5, 5, null, null]);
  });
  it("trims trailing periods no series has data for", () => {
    const v = toView(
      payload({ series: [{ name: "A", points: [{ start: "2026-06-01", value: 1 }, { start: "2026-07-01", value: 2 }, { start: "2026-08-01", value: null }] }] }),
    );
    expect(v.series[0].points).toHaveLength(2);
  });
  it("draws at most MAX_SERIES series and says how many there were", () => {
    const series = Array.from({ length: 12 }, (_, i) => ({
      name: `R${String(i).padStart(2, "0")}`,
      points: [{ start: "2026-06-01", value: 12 - i }, { start: "2026-07-01", value: 12 - i }],
    }));
    const v = toView(payload({ group_by: "resource", dimension: { name: "resource", ordered: false }, series }));
    expect(v.series).toHaveLength(MAX_SERIES);
    expect(captionLines(v.caption, v.series.length)).toContain("Showing the top 8 of 12 resources.");
  });
  it("says how many XDMoD left out when it says", () => {
    const v = toView(bars({ group_by: "fieldofscience", dimension: { name: "fieldofscience", ordered: false }, has_more: true, others_count: 38 }));
    expect(captionLines(v.caption, 3)).toContain("Showing the top 3 of 41 fields of science.");
    const o = toView(bars({ dimension: { name: "jobsize", ordered: true }, has_more: true, others_count: 2 }));
    expect(captionLines(o.caption, 3)).toContain("Showing 3 of 5 buckets.");
  });
});

describe("colours follow names, not rank", () => {
  it("reordering series keeps each name's colour", () => {
    const mk = (names: string[]) =>
      toView(payload({ series: names.map((n, i) => ({ name: n, points: [{ start: "2026-06-01", value: i + 1 }, { start: "2026-07-01", value: i + 2 }] })) }));
    const a = mk(["Zeta", "Alpha", "Mid"]);
    const b = mk(["Mid", "Zeta", "Alpha"]);
    const color = (v: typeof a, n: string) => v.series.find((s) => s.name === n)!.color;
    for (const n of ["Zeta", "Alpha", "Mid"]) expect(color(a, n)).toBe(color(b, n));
    expect(color(a, "Alpha")).toBe(PALETTE.light[0]);
    expect(color(a, "Zeta")).toBe(PALETTE.light[2]);
  });
});

describe("captions", () => {
  it("captions the chart with what was counted and its caveats", () => {
    const v = toView(payload({ statistic: "avg_waitduration_hours", last_period_incomplete: true, has_more: true, filters: { notes: ["Resource is Delta", "Queue is gpu"] } }));
    expect(captionLines(v.caption, v.series.length)).toEqual([
      "CPU Hours: Total: Total CPU hours used by jobs.",
      "Filtered to Resource is Delta; Queue is gpu",
      "Jun 1, 2026 to Oct 31, 2026, by month",
      "Showing the top 1; XDMoD has more.",
      "The last period is still in progress.",
      "Jobs still waiting aren't counted, and the last few days may be incomplete.",
      "This is an average per job, so a few long jobs can pull it up.",
      "Source: XDMoD, retrieved Nov 9, 2026",
    ]);
  });
  it("says where XDMoD's data stops, and not for a period start", () => {
    const day = toView(payload({ data_through: "2026-10-01", data_through_precision: "day" }));
    expect(captionLines(day.caption, 1)).toContain("XDMoD has data through Oct 1, 2026.");
    const period = toView(payload({ data_through: "2026-10-01", data_through_precision: "period" }));
    expect(captionLines(period.caption, 1).join("\n")).not.toMatch(/has data through|no data after/);
  });
  it("gives an aggregate the recent-data warning and where its data stops", () => {
    const v = toView(bars({ last_period_incomplete: true, data_through: "2026-10-01", data_through_precision: "day", counted: { start: "2026-01-01", end: "2026-11-09" } }));
    const lines = captionLines(v.caption, 3);
    expect(lines).toContain("XDMoD has data through Oct 1, 2026.");
    expect(lines).toContain("The range runs to today, so it's still in progress.");
    expect(lines).toContain(BUILT_IN_WARNINGS[0].text);
  });
  it("warns that CPU hours aren't comparable across resources", () => {
    expect(toView(bars()).caption.warnings.map((w) => w.code)).toEqual(["not-comparable-across-resources"]);
  });
  it("links to XDMoD only over https", () => {
    expect(toView(payload({ link: "javascript:alert(1)" })).link).toBeNull();
    expect(toView(payload({ link: null })).link).toBeNull();
    expect(toView(payload()).link).toBe("https://xdmod.example.org/#usage");
  });
  it("makes a screen-reader summary", () => {
    expect(toView(payload()).summary).toBe("Line chart of CPU Hours: Total, 1 series, Jun 1, 2026 to Oct 31, 2026. The Table view lists the values.");
    const v = toView(bars());
    expect(v.summary).toBe("Bar chart of CPU Hours: Total by resource, 3 bars, Jun 1, 2026 to Oct 31, 2026. The Table view lists the values.");
    expect(chartSummary(v)).toBe(v.summary);
  });
});

describe("new payload fields", () => {
  it("payload warnings replace the built-in ones", () => {
    const v = toView(bars({ last_period_incomplete: true, warnings: [{ code: "custom", text: "Only this." }] }));
    expect(v.caption.warnings).toEqual([{ code: "custom", text: "Only this." }]);
    expect(captionLines(v.caption, 3)).not.toContain(BUILT_IN_WARNINGS[0].text);
  });
  it("without payload warnings the three built-in warnings apply as before", () => {
    const v = toView(bars({ statistic: "avg_cpu_hours", last_period_incomplete: true }));
    expect(v.caption.warnings).toEqual([...BUILT_IN_WARNINGS]);
    expect(BUILT_IN_WARNINGS.map((w) => w.code)).toEqual(["waiting-not-counted", "not-comparable-across-resources", "mean-of-jobs"]);
    expect(toView(payload({ realm: "Cloud" })).caption.warnings).toEqual([]);
  });
  it("instance option overrides the payload's instance in the source line", () => {
    const p = payload({ instance: { name: "Payload XDMoD", url: "https://a.example.org" } });
    expect(captionLines(toView(p).caption, 1).at(-1)).toBe("Source: Payload XDMoD, retrieved Nov 9, 2026");
    const v = toView(p, { instance: { name: "Option XDMoD", url: "https://b.example.org" } });
    expect(captionLines(v.caption, 1).at(-1)).toBe("Source: Option XDMoD, retrieved Nov 9, 2026");
    expect(v.instance?.url).toBe("https://b.example.org");
  });
  it("a time basis different from the viewer's zone adds the counted-in line, and the same zone adds none", () => {
    const p = payload({ time_basis: { zone: "UTC" } });
    expect(captionLines(toView(p, { viewerZone: "America/New_York" }).caption, 1)).toContain("Days are counted in UTC time.");
    expect(captionLines(toView(p, { viewerZone: "UTC" }).caption, 1).join("\n")).not.toContain("counted in");
    expect(captionLines(toView(p).caption, 1).join("\n")).not.toContain("counted in");
  });
  it("a week period is labelled Week of <Monday>", () => {
    const v = toView(payload({ unit: "Week", dimension: { name: "none", ordered: false }, data_through: "2026-11-02", data_through_precision: "period", series: [{ name: "A", points: [{ start: "2026-10-26", value: 1 }, { start: "2026-11-02", value: 2 }, { start: "2026-11-09", value: null }] }], counted: { start: "2026-10-26", end: "2026-11-15" }, last_data_period_partial: true }));
    const lines = captionLines(v.caption, 1);
    expect(lines).toContain("Oct 26, 2026 to Nov 15, 2026, by week");
    expect(lines).toContain("XDMoD has no data after Week of Nov 2, 2026, so Week of Nov 2, 2026 may be partial.");
  });
});
