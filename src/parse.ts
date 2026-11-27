import type { ChartPayload } from "./payload.js";

type Json = Record<string, unknown>;

const isRecord = (v: unknown): v is Json =>
  !!v && typeof v === "object" && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isValue = (v: unknown): v is number | null =>
  v === null || (typeof v === "number" && Number.isFinite(v));
const isOptionalString = (v: unknown) => v === undefined || isString(v);
const isNullableString = (v: unknown) => v === undefined || v === null || isString(v);
const isPeriod = (v: unknown) => isRecord(v) && isString(v.start) && isString(v.end);
const isList = <T>(v: unknown, check: (i: unknown) => i is T): v is T[] =>
  Array.isArray(v) && v.every(check);

const UNITS = new Set(["Day", "Week", "Month", "Quarter", "Year"]);
const isSource = (v: unknown) => v === undefined || v === "resource" || v === "series";
const isPrecision = (v: unknown) => v === undefined || v === "day" || v === "period";
const isCount = (v: unknown) =>
  v === undefined || v === null || (typeof v === "number" && Number.isInteger(v) && v >= 0);

const isPoint = (p: unknown): p is object =>
  isRecord(p) && isString(p.start) && isValue(p.value);
const isSeries = (s: unknown): s is object =>
  isRecord(s) &&
  isString(s.name) &&
  isList(s.points, isPoint) &&
  isOptionalString(s.data_through) &&
  isPrecision(s.data_through_precision) &&
  isSource(s.data_through_source);
const isCategory = (c: unknown): c is object =>
  isRecord(c) &&
  isString(c.name) &&
  isValue(c.value) &&
  isOptionalString(c.data_through) &&
  isSource(c.data_through_source);
const isWarning = (w: unknown): w is object =>
  isRecord(w) && isString(w.code) && isString(w.text);

/** The payload typed, or null when it isn't a valid v1 chart payload. Unknown fields are ignored. */
export function parsePayload(raw: unknown): ChartPayload | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  const { measure, dimension, filters } = raw;
  if (
    !isString(raw.realm) ||
    !isString(raw.statistic) ||
    !isString(raw.group_by) ||
    (raw.dataset_type !== "timeseries" && raw.dataset_type !== "aggregate") ||
    !isPeriod(raw.requested) ||
    !isPeriod(raw.counted) ||
    typeof raw.last_period_incomplete !== "boolean" ||
    typeof raw.has_more !== "boolean" ||
    raw.source !== "XDMoD" ||
    !isString(raw.retrieved)
  ) {
    return null;
  }
  if (raw.unit !== undefined && !(isString(raw.unit) && UNITS.has(raw.unit))) return null;
  if (
    !isRecord(measure) ||
    !isString(measure.label) ||
    !isString(measure.description) ||
    (measure.kind !== "total" && measure.kind !== "average") ||
    (measure.missing !== "zero" && measure.missing !== "gap") ||
    !isOptionalString(measure.unit)
  ) {
    return null;
  }
  if (!isRecord(dimension) || !isString(dimension.name) || typeof dimension.ordered !== "boolean") {
    return null;
  }
  if (!isRecord(filters) || !isList(filters.notes, isString)) return null;
  if (raw.time_basis !== undefined && !(isRecord(raw.time_basis) && isString(raw.time_basis.zone))) {
    return null;
  }
  if (raw.warnings !== undefined && !isList(raw.warnings, isWarning)) return null;
  if (
    raw.instance !== undefined &&
    !(isRecord(raw.instance) && isString(raw.instance.name) && isString(raw.instance.url))
  ) {
    return null;
  }
  if (!isNullableString(raw.link) || !isNullableString(raw.data_through)) return null;
  if (raw.data_through_precision !== null && !isPrecision(raw.data_through_precision)) return null;
  if (!isCount(raw.others_count) || !isCount(raw.offset)) return null;
  if (raw.ranked_by !== undefined && raw.ranked_by !== "value") return null;
  if (raw.last_data_period_partial !== undefined && typeof raw.last_data_period_partial !== "boolean") {
    return null;
  }
  if (raw.series !== undefined && !isList(raw.series, isSeries)) return null;
  if (raw.categories !== undefined && !isList(raw.categories, isCategory)) return null;
  return raw as unknown as ChartPayload;
}
