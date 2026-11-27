import { describe, it, expect } from "vitest";
import { chartCsv, chartFileName, periodContaining } from "../src/csv.js";
import type { ChartView } from "../src/view.js";
import { formatDay, formatPeriod } from "../src/format.js";
import type { CaptionFacts } from "../src/caption.js";

const CAPTION: CaptionFacts = {
  measure: "CPU Hours: Total",
  definition: "Total CPU hours used by jobs.",
  counted: { start: "2026-08-01", end: "2026-10-31" },
  unit: "Month",
  filters: [],
  hasMore: false,
  incomplete: false,
  warnings: [],
  source: "XDMoD",
  retrieved: "2026-11-09",
};

function lineView(over: Partial<ChartView> = {}): ChartView {
  return {
    kind: "line",
    title: "CPU Hours: Total",
    dimension: "Name",
    series: [
      {
        name: "Delta",
        color: "#2a78d6",
        darkColor: "#3987e5",
        points: [
          { start: "2026-08-01", value: 1200.5 },
          { start: "2026-09-01", value: null },
          { start: "2026-10-01", value: 900 },
        ],
      },
      {
        name: "Anvil, Purdue",
        color: "#eb6834",
        darkColor: "#d95926",
        points: [
          { start: "2026-08-01", value: 10 },
          { start: "2026-09-01", value: 20 },
          { start: "2026-10-01", value: 30 },
        ],
      },
    ],
    bars: [],
    caption: { ...CAPTION, filters: ["Resource is Delta or Anvil"] },
    summary: "",
    link: "https://xdmod.example.org/#chart",
    instance: null,
    ...over,
  };
}

const bar = (name: string, value: number | null) => ({ name, value, color: "#2a78d6", darkColor: "#3987e5" });

describe("formatDay", () => {
  it("formats a calendar date without shifting it by time zone", () => {
    expect(formatDay("2026-08-01")).toBe("Aug 1, 2026");
    expect(formatDay("2026-12-31")).toBe("Dec 31, 2026");
  });
  it("leaves anything it can't read alone", () => {
    expect(formatDay("last week")).toBe("last week");
  });
});

describe("formatPeriod", () => {
  it("names a period at the chart's unit", () => {
    expect(formatPeriod("2026-08-01", "Month")).toBe("Aug 2026");
    expect(formatPeriod("2026-10-01", "Quarter")).toBe("Q4 2026");
    expect(formatPeriod("2026-10-01", "Year")).toBe("2026");
    expect(formatPeriod("2026-10-01", "Day")).toBe("Oct 1, 2026");
  });
  it("labels a week period Week of <Monday>", () => {
    expect(formatPeriod("2026-11-02", "Week")).toBe("Week of Nov 2, 2026");
  });
});

describe("periodContaining", () => {
  const months = ["2026-08-01", "2026-09-01", "2026-10-01T00:00:00"];
  it("finds the period a day falls in, not just an exact start", () => {
    expect(periodContaining(months, "2026-10-19")).toBe(2);
    expect(periodContaining(months, "2026-09-01")).toBe(1);
    expect(periodContaining(months, "2026-08-31")).toBe(0);
  });
  it("is -1 before the first period", () => {
    expect(periodContaining(months, "2026-07-15")).toBe(-1);
  });
});

describe("chartCsv", () => {
  it("starts with what was counted, then one row per period", () => {
    expect(chartCsv(lineView()).split("\n")).toEqual([
      "Measure,CPU Hours: Total",
      "Counted,2026-08-01 to 2026-10-31",
      "Filters,Resource is Delta or Anvil",
      "Retrieved,2026-11-09",
      "Source,XDMoD",
      "XDMoD link,https://xdmod.example.org/#chart",
      "",
      'Period,Delta,"Anvil, Purdue"',
      "2026-08-01,1200.5,10",
      "2026-09-01,,20",
      "2026-10-01,900,30",
    ]);
  });

  it("writes one row per bar and says when nothing was filtered", () => {
    const view = lineView({
      kind: "bar-ranked",
      series: [],
      dimension: "Resource",
      bars: [bar('The "big" one', 50), bar("Small", null)],
      caption: CAPTION,
    });
    expect(chartCsv(view).split("\n").slice(2)).toEqual([
      "Filters,None",
      "Retrieved,2026-11-09",
      "Source,XDMoD",
      "XDMoD link,https://xdmod.example.org/#chart",
      "",
      "Resource,CPU Hours: Total",
      '"The ""big"" one",50',
      "Small,",
    ]);
  });

  it("leaves out the link when there is none", () => {
    expect(chartCsv(lineView({ link: null }))).not.toContain("XDMoD link");
  });

  it("adds where the data stops to the header", () => {
    const view = lineView({
      caption: { ...lineView().caption, dataThrough: "2026-09-01", dataThroughPrecision: "day" },
    });
    expect(chartCsv(view).split("\n").slice(1, 3)).toEqual([
      "Counted,2026-08-01 to 2026-10-31",
      "Data through,2026-09-01",
    ]);
  });

  it("names the period for a period-precision end, and only before the range ends", () => {
    const caption = {
      ...lineView().caption,
      dataThrough: "2026-09-01",
      dataThroughPrecision: "period" as const,
    };
    expect(
      chartCsv(lineView({ caption: { ...caption, noDataAfter: true } })).split("\n").slice(2, 3),
    ).toEqual(["No data after,Sep 2026"]);
    expect(chartCsv(lineView({ caption }))).not.toMatch(/No data after|Data through/);
    expect(
      chartCsv(
        lineView({ caption: { ...caption, dataThrough: "2026-10-31", dataThroughPrecision: "day" } }),
      ),
    ).not.toContain("Data through");
  });

  it("keeps a name that looks like a formula as text", () => {
    const view = lineView({
      kind: "bar-ranked",
      series: [],
      dimension: "Resource",
      bars: [bar("=HYPERLINK(1)", -5), bar("+1", 1), bar("-x", 1), bar("@me", 1)],
      caption: CAPTION,
    });
    expect(chartCsv(view).split("\n").slice(-4)).toEqual([
      "'=HYPERLINK(1),-5",
      "'+1,1",
      "'-x,1",
      "'@me,1",
    ]);
  });

  it("adds early ends and the ranks shown to the header", () => {
    const view = lineView({
      caption: {
        ...lineView().caption,
        offset: 3,
        earlyEnds: [
          { name: "Anvil, Purdue", through: "2026-10-19", precision: "day", source: "resource" },
          { name: "Delta", through: "2026-09-01", precision: "period", source: "series" },
        ],
      },
    });
    expect(chartCsv(view).split("\n").slice(2, 6)).toEqual([
      '"No data after (Anvil, Purdue)",2026-10-19',
      "Nothing recorded after (Delta),Sep 2026",
      "Filters,Resource is Delta or Anvil",
      "Ranks,4 to 5 by value",
    ]);
    const ordered = chartCsv(
      lineView({ caption: { ...view.caption, ordered: true, earlyEnds: [] } }),
    );
    expect(ordered).toContain("Buckets,4 to 5");
    expect(ordered).not.toContain("by value");
  });

  it("adds the partial period after the data-through row", () => {
    const view = lineView({
      caption: { ...lineView().caption, dataThrough: "2026-10-01", partialPeriod: "2026-10-01" },
    });
    expect(chartCsv(view).split("\n").slice(1, 4)).toEqual([
      "Counted,2026-08-01 to 2026-10-31",
      "Data through,2026-10-01",
      "Partial period,Oct 2026",
    ]);
  });
});

describe("chartFileName", () => {
  it("names the file after the measure and the range", () => {
    expect(chartFileName(lineView())).toBe("xdmod-cpu-hours-total-2026-08-01-to-2026-10-31");
  });
});
