import type { Warning } from "./payload.js";
import { formatDay, formatPeriod } from "./format.js";

/** A series or bar whose data stops before the rest of the chart's. */
export type EarlyEnd = {
  name: string;
  through: string;
  /** "day": the last day with data. "period": the start of the last period with data. */
  precision: "day" | "period";
  /** "resource": XDMoD has no data from that resource after it. "series": nothing recorded, reason unknown. */
  source: "resource" | "series";
};

export type CaptionFacts = {
  measure: string;
  definition: string;
  counted: { start: string; end: string };
  /** Where XDMoD's data stops, when it says. */
  dataThrough?: string;
  /** "day" (the default): dataThrough is the last day with data. "period": only the start of the last period with data. */
  dataThroughPrecision?: "day" | "period";
  /** The counted range has periods after the dataThrough one, all empty. */
  noDataAfter?: boolean;
  /** The data_through period, when XDMoD's data likely covers only part of it. */
  partialPeriod?: string;
  unit?: string;
  filters: string[];
  /** One line when the chart's days are counted in a zone other than the viewer's. */
  zoneNote?: string;
  /** More series or bars than the chart draws. */
  hasMore: boolean;
  /** How many there are in all, when known. */
  total?: number;
  /** How many top-ranked ones come before the first shown. */
  offset?: number;
  /** Shown series or bars whose data stops before the chart's. */
  earlyEnds?: EarlyEnd[];
  /** What they are, plural: "resources", "fields of science", "groups". */
  groupNoun?: string;
  /** The dimension is ordered buckets (job size), not a ranking. */
  ordered?: boolean;
  incomplete: boolean;
  warnings: Warning[];
  /** The XDMoD instance's name when the payload names one, else "XDMoD". */
  source: string;
  retrieved: string;
};

/**
 * Where XDMoD's data stops, as far as the caption can honestly say. A day
 * is said when it's before the counted end. A period start is not a day the
 * data stops (the period may be full), so it's said only as "no data after"
 * that period, and only when later periods in the range are empty.
 */
export function dataEnd(caption: CaptionFacts): { day: string } | { period: string } | null {
  const through = caption.dataThrough;
  if (!through) return null;
  if ((caption.dataThroughPrecision ?? "day") === "day") {
    return through < caption.counted.end ? { day: through } : null;
  }
  return caption.noDataAfter ? { period: formatPeriod(through, caption.unit) } : null;
}

/** Which ranks a chart past the top shows: "4 to 8". */
export function rankRange(caption: CaptionFacts, shown: number): string | null {
  const offset = caption.offset ?? 0;
  return offset > 0 && shown > 0 ? `${offset + 1} to ${offset + shown}` : null;
}

/** How many of how many the chart shows, or null when it shows them all. */
function shownLine(caption: CaptionFacts, shown: number): string | null {
  const ranks = rankRange(caption, shown);
  if (ranks) {
    const offset = caption.offset ?? 0;
    // XDMoD pages an ordered dimension in bucket order, not by value.
    if (caption.ordered) {
      const of = caption.total === undefined ? "" : ` of ${caption.total}`;
      return `Showing buckets ${ranks}${of}, leaving out the first ${offset}.`;
    }
    if (caption.total !== undefined) {
      return `Showing ranks ${ranks} of ${caption.total} ${caption.groupNoun ?? "groups"}, not the top ${offset}.`;
    }
    return `Showing ranks ${ranks}, not the top ${offset}${caption.hasMore ? "; XDMoD has more" : ""}.`;
  }
  if (!caption.hasMore) return null;
  if (caption.total === undefined) {
    return `Showing the top ${shown}; XDMoD has more.`;
  }
  return caption.ordered
    ? `Showing ${shown} of ${caption.total} buckets.`
    : `Showing the top ${shown} of ${caption.total} ${caption.groupNoun ?? "groups"}.`;
}

/** When an early end is, at the precision it's known. */
export function earlyEndWhen(end: EarlyEnd, unit?: string): string {
  return end.precision === "day" ? formatDay(end.through) : formatPeriod(end.through, unit);
}

const MAX_LISTED_NAMES = 6;

/** "A", "A and B", "A, B and C", past six "A, B, C, D, E, F and 2 more". */
function listNames(names: string[]): string {
  if (names.length > MAX_LISTED_NAMES) {
    return `${names.slice(0, MAX_LISTED_NAMES).join(", ")} and ${names.length - MAX_LISTED_NAMES} more`;
  }
  return names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The early ends as one sentence, worded only as strongly as is known, names that stop on the same date together. */
function earlyEndsLine(ends: EarlyEnd[], unit?: string): string {
  const groups = new Map<string, { source: EarlyEnd["source"]; when: string; names: string[] }>();
  for (const end of ends) {
    const when = earlyEndWhen(end, unit);
    const key = `${end.source}|${when}`;
    const group = groups.get(key) ?? { source: end.source, when, names: [] };
    group.names.push(end.name);
    groups.set(key, group);
  }
  const text = [...groups.values()]
    .map((g) =>
      g.source === "resource"
        ? `XDMoD has no data from ${listNames(g.names)} after ${g.when}`
        : `nothing is recorded for ${listNames(g.names)} after ${g.when}`,
    )
    .join("; ");
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}

/**
 * The caption under a chart, one line per fact, in reading order. Every
 * renderer draws these, so they all say the same thing. `shown` is how many
 * series or bars the chart draws.
 */
export function captionLines(caption: CaptionFacts, shown: number): string[] {
  const range = `${formatDay(caption.counted.start)} to ${formatDay(caption.counted.end)}`;
  const lines = [`${caption.measure}: ${caption.definition}`];
  // Right under the definition, which reads as ACCESS-wide.
  if (caption.filters.length > 0) {
    lines.push(`Filtered to ${caption.filters.join("; ")}`);
  }
  lines.push(caption.unit ? `${range}, by ${caption.unit.toLowerCase()}` : range);
  if (caption.zoneNote) lines.push(caption.zoneNote);
  // XDMoD's public data often stops weeks before the range does.
  const end = dataEnd(caption);
  if (end) {
    const lead =
      "day" in end
        ? `XDMoD has data through ${formatDay(end.day)}`
        : `XDMoD has no data after ${end.period}`;
    lines.push(
      caption.partialPeriod
        ? `${lead}, so ${formatPeriod(caption.partialPeriod, caption.unit)} may be partial.`
        : `${lead}.`,
    );
  }
  if (caption.earlyEnds?.length) {
    lines.push(earlyEndsLine(caption.earlyEnds, caption.unit));
  }
  const showing = shownLine(caption, shown);
  if (showing) lines.push(showing);
  // A partial period already says the end isn't settled.
  if (caption.incomplete && !caption.partialPeriod) {
    lines.push(
      caption.unit
        ? "The last period is still in progress."
        : "The range runs to today, so it's still in progress.",
    );
  }
  for (const warning of caption.warnings) lines.push(warning.text);
  lines.push(`Source: ${caption.source}, retrieved ${formatDay(caption.retrieved)}`);
  return lines;
}
