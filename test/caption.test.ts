import { describe, it, expect } from "vitest";
import { captionLines } from "../src/caption.js";
import type { CaptionFacts } from "../src/caption.js";
import { BUILT_IN_WARNINGS } from "../src/view.js";

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

describe("captionLines", () => {
  it("names the measure, the counted range and the source", () => {
    expect(captionLines(CAPTION, 1)).toEqual([
      "CPU Hours: Total: Total CPU hours used by jobs.",
      "Aug 1, 2026 to Oct 31, 2026, by month",
      "Source: XDMoD, retrieved Nov 9, 2026",
    ]);
  });

  it("adds filters, more results, an incomplete period and each warning", () => {
    expect(
      captionLines(
        {
          ...CAPTION,
          unit: undefined,
          filters: ["Resource is Delta", "Field of science is Physics"],
          hasMore: true,
          incomplete: true,
          warnings: [...BUILT_IN_WARNINGS],
        },
        10,
      ),
    ).toEqual([
      "CPU Hours: Total: Total CPU hours used by jobs.",
      "Filtered to Resource is Delta; Field of science is Physics",
      "Aug 1, 2026 to Oct 31, 2026",
      "Showing the top 10; XDMoD has more.",
      "The range runs to today, so it's still in progress.",
      "Jobs still waiting aren't counted, and the last few days may be incomplete.",
      "CPU hours don't allow for each resource's compute power per core, so they aren't comparable across resources. ACE measures are.",
      "This is an average per job, so a few long jobs can pull it up.",
      "Source: XDMoD, retrieved Nov 9, 2026",
    ]);
  });
});

describe("captionLines past the top", () => {
  it("says which ranks a chart with an offset shows", () => {
    const paged = { ...CAPTION, offset: 3, groupNoun: "fields of science" };
    expect(captionLines({ ...paged, hasMore: true, total: 79 }, 5)).toContain(
      "Showing ranks 4 to 8 of 79 fields of science, not the top 3.",
    );
    expect(captionLines({ ...paged, hasMore: true }, 5)).toContain(
      "Showing ranks 4 to 8, not the top 3; XDMoD has more.",
    );
    // The last page: nothing more, but still not the top.
    expect(captionLines(paged, 5)).toContain(
      "Showing ranks 4 to 8, not the top 3.",
    );
    // XDMoD pages buckets in their order, so the first ones are skipped.
    expect(
      captionLines({ ...paged, ordered: true, hasMore: true, total: 11 }, 4),
    ).toContain("Showing buckets 4 to 7 of 11, leaving out the first 3.");
    expect(captionLines({ ...paged, ordered: true }, 5)).toContain(
      "Showing buckets 4 to 8, leaving out the first 3.",
    );
    expect(captionLines({ ...paged, ordered: true }, 5).join("\n")).not.toMatch(
      /largest|by value|top/,
    );
    expect(captionLines(paged, 5).join("\n")).not.toContain("the top 5");
  });
});

describe("captionLines with early ends", () => {
  it("names each series that stops before the rest", () => {
    expect(
      captionLines(
        {
          ...CAPTION,
          earlyEnds: [
            {
              name: "Purdue Anvil CPU",
              through: "2026-10-19",
              precision: "day",
              source: "resource",
            },
            {
              name: "IACS Ookami",
              through: "2026-09-01",
              precision: "period",
              source: "series",
            },
          ],
        },
        2,
      ),
    ).toContain(
      "XDMoD has no data from Purdue Anvil CPU after Oct 19, 2026; nothing is recorded for IACS Ookami after Sep 2026.",
    );
  });
});

describe("captionLines with a partial, still-running period", () => {
  it("says it once, not also that the last period is in progress", () => {
    const lines = captionLines(
      {
        ...CAPTION,
        counted: { start: "2026-08-01", end: "2026-11-30" },
        dataThrough: "2026-11-08",
        partialPeriod: "2026-11-08",
        incomplete: true,
      },
      1,
    );
    expect(lines).toContain(
      "XDMoD has data through Nov 8, 2026, so Nov 2026 may be partial.",
    );
    expect(lines.join("\n")).not.toContain("still in progress");
    expect(captionLines({ ...CAPTION, incomplete: true }, 1)).toContain(
      "The last period is still in progress.",
    );
  });
});

describe("captionLines with early ends on the same date", () => {
  it("names them together", () => {
    const end = (name: string, through: string) => ({
      name,
      through,
      precision: "day" as const,
      source: "resource" as const,
    });
    expect(
      captionLines(
        {
          ...CAPTION,
          earlyEnds: [
            end("A", "2026-11-07"),
            end("B", "2026-11-07"),
            end("C", "2026-10-19"),
            end("D", "2026-11-07"),
          ],
        },
        4,
      ),
    ).toContain(
      "XDMoD has no data from A, B and D after Nov 7, 2026; XDMoD has no data from C after Oct 19, 2026.",
    );
  });
});

describe("captionLines with many early ends", () => {
  it("lists at most six names per date", () => {
    const earlyEnds = Array.from({ length: 8 }, (_, i) => ({
      name: `q${i}`,
      through: "2026-11-07",
      precision: "day" as const,
      source: "series" as const,
    }));
    expect(captionLines({ ...CAPTION, earlyEnds }, 8)).toContain(
      "Nothing is recorded for q0, q1, q2, q3, q4, q5 and 2 more after Nov 7, 2026.",
    );
  });
});

describe("captionLines with data_through", () => {
  it("says where XDMoD's data stops, right after the range", () => {
    expect(
      captionLines(
        {
          ...CAPTION,
          dataThrough: "2026-10-01",
          dataThroughPrecision: "day",
        },
        1,
      ).slice(0, 3),
    ).toEqual([
      "CPU Hours: Total: Total CPU hours used by jobs.",
      "Aug 1, 2026 to Oct 31, 2026, by month",
      "XDMoD has data through Oct 1, 2026.",
    ]);
  });

  it("doesn't print a period start as the day data stops", () => {
    // Aug to Oct by month, October populated: Oct 1 is only its start.
    const period = {
      ...CAPTION,
      dataThrough: "2026-10-01",
      dataThroughPrecision: "period" as const,
    };
    expect(captionLines(period, 1).join("\n")).not.toMatch(
      /has data through|no data after/,
    );
    // With empty months after it, say which period the data ends in.
    expect(
      captionLines(
        {
          ...period,
          dataThrough: "2026-09-01",
          noDataAfter: true,
          counted: { start: "2026-08-01", end: "2026-11-30" },
        },
        1,
      )[2],
    ).toBe("XDMoD has no data after Sep 2026.");
  });

  it("says how many it shows of how many", () => {
    const more = { ...CAPTION, hasMore: true, total: 41 };
    expect(captionLines({ ...more, groupNoun: "resources" }, 10)).toContain(
      "Showing the top 10 of 41 resources.",
    );
    expect(captionLines(more, 10)).toContain(
      "Showing the top 10 of 41 groups.",
    );
    expect(captionLines({ ...more, ordered: true }, 10)).toContain(
      "Showing 10 of 41 buckets.",
    );
  });

  it("says nothing when the data reaches the end of the range", () => {
    expect(
      captionLines({ ...CAPTION, dataThrough: "2026-10-31" }, 1).join("\n"),
    ).not.toContain("has data through");
  });
});

describe("captionLines with a partial period", () => {
  const partial = {
    ...CAPTION,
    counted: { start: "2026-08-01", end: "2026-11-08" },
    dataThrough: "2026-10-01",
    partialPeriod: "2026-10-01",
  };

  it("names the partial month in place of the data-through line", () => {
    const lines = captionLines(partial, 1);
    expect(lines[2]).toBe(
      "XDMoD has data through Oct 1, 2026, so Oct 2026 may be partial.",
    );
    expect(lines.join("\n")).not.toContain("has data through Oct 1, 2026.");
  });

  it("names the period at the chart's unit", () => {
    const line = (unit: string) => captionLines({ ...partial, unit }, 1)[2];
    expect(line("Day")).toBe(
      "XDMoD has data through Oct 1, 2026, so Oct 1, 2026 may be partial.",
    );
    expect(line("Quarter")).toBe(
      "XDMoD has data through Oct 1, 2026, so Q4 2026 may be partial.",
    );
    expect(line("Year")).toBe(
      "XDMoD has data through Oct 1, 2026, so 2026 may be partial.",
    );
  });
});

describe("captionLines with zone, instance and payload warnings", () => {
  it("prints each warning's text as given", () => {
    expect(captionLines({ ...CAPTION, warnings: [{ code: "x", text: "Producer wording." }] }, 1)).toContain(
      "Producer wording.",
    );
  });
  it("uses the source name in the source line", () => {
    expect(captionLines({ ...CAPTION, source: "Example XDMoD" }, 1).at(-1)).toBe(
      "Source: Example XDMoD, retrieved Nov 9, 2026",
    );
  });
  it("puts the zone note after the range", () => {
    expect(captionLines({ ...CAPTION, zoneNote: "Days are counted in UTC time." }, 1)[2]).toBe(
      "Days are counted in UTC time.",
    );
  });
});
