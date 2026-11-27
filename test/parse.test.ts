import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePayload } from "../src/parse.js";

const load = (n: string) =>
  JSON.parse(readFileSync(new URL(`./payloads/${n}.json`, import.meta.url), "utf8"));

describe("parsePayload", () => {
  it("accepts an ACCESS v1 payload without the new fields", () => {
    const p = parsePayload(load("valid-v1-legacy"));
    expect(p?.version).toBe(1);
    expect(p?.categories?.[0].name).toBe("Cluster A");
  });
  it("accepts every new optional field", () => {
    const p = parsePayload(load("valid-all-new-fields"));
    expect(p?.unit).toBe("Week");
    expect(p?.measure.unit).toBe("CPU hours");
    expect(p?.time_basis).toEqual({ zone: "UTC" });
    expect(p?.warnings?.[0].code).toBe("partial");
    expect(p?.instance?.url).toBe("https://xdmod.example.org");
  });
  it("accepts a timeseries payload", () => {
    expect(parsePayload(load("valid-timeseries"))?.series?.[0].points[1].value).toBeNull();
  });
  it("rejects version 2", () => {
    expect(parsePayload(load("invalid-version-2"))).toBeNull();
  });
  it('rejects an unknown unit such as "Fortnight"', () => {
    expect(parsePayload(load("invalid-unit"))).toBeNull();
  });
  it("rejects a point value that is a string", () => {
    expect(parsePayload(load("invalid-string-value"))).toBeNull();
    const ts = load("valid-timeseries");
    ts.series[0].points[0].value = "3";
    expect(parsePayload(ts)).toBeNull();
  });
  it("rejects a warning without text", () => {
    expect(parsePayload(load("invalid-warning-no-text"))).toBeNull();
  });
  it("ignores an unknown top-level field", () => {
    expect(parsePayload(load("valid-unknown-field"))).not.toBeNull();
  });
  it("rejects non-objects", () => {
    for (const v of [null, 1, "x", [], undefined]) expect(parsePayload(v)).toBeNull();
  });
});
