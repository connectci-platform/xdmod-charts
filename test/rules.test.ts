import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { STATISTICS, measureKind, parsePayload } from "../src/index.js";
import type { ChartFixture } from "../src/index.js";

const ADDITIVE = [
  "job_count", "started_job_count", "submitted_job_count", "total_cpu_hours", "total_node_hours",
  "total_gpu_hours", "total_wallduration_hours", "total_waitduration_hours", "used_su", "used_ace",
  "cloud_num_sessions_ended", "cloud_num_sessions_started", "cloud_wall_time", "cloud_core_time",
];
const validate = new Ajv2020({ strict: true }).compile(
  JSON.parse(readFileSync(new URL("../schema/chart-payload.v1.json", import.meta.url), "utf8")),
);
const dir = new URL("../fixtures/", import.meta.url);
const fixtures = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ f, fx: JSON.parse(readFileSync(new URL(f, dir), "utf8")) as ChartFixture }));

describe("statistic rules", () => {
  it("every statistic has a kind and a unit", () => {
    for (const [id, s] of Object.entries(STATISTICS)) {
      expect(["total", "average"], id).toContain(s.kind);
      expect(s.unit.length, id).toBeGreaterThan(0);
      expect(typeof s.additive, id).toBe("boolean");
    }
  });
  it("the additive list is exactly the fourteen ids named in this task", () => {
    const additive = Object.keys(STATISTICS).filter((id) => STATISTICS[id].additive);
    expect(additive.sort()).toEqual([...ADDITIVE].sort());
  });
  it("no average or distinct count is additive", () => {
    for (const [id, s] of Object.entries(STATISTICS)) {
      if (s.kind === "average" || id.startsWith("avg_") || /^active_|^running_|_running$|^allocated_|^ace_/.test(id)) {
        expect(s.additive, id).toBe(false);
      }
    }
  });
  it("measureKind reads the table, then the prefix fallback", () => {
    expect(measureKind("total_avg_number_of_cpu_cores")).toBe("average");
    expect(measureKind("used_su")).toBe("total");
    expect(measureKind("total_something_new")).toBe("total");
    expect(measureKind("new_thing_count")).toBe("total");
    expect(measureKind("new_thing_rate")).toBe("average");
  });
  it("measureKind agrees with the table for every listed id", () => {
    for (const [id, s] of Object.entries(STATISTICS)) expect(measureKind(id), id).toBe(s.kind);
  });
});

describe("fixtures", () => {
  it("there is at least one fixture", () => expect(fixtures.length).toBeGreaterThan(0));
  for (const { f, fx } of fixtures) {
    it(`${f}: expected payload passes parsePayload`, () => {
      expect(parsePayload(fx.expected)).not.toBeNull();
    });
    it(`${f}: expected payload passes the schema`, () => {
      expect(validate(fx.expected), JSON.stringify(validate.errors)).toBe(true);
    });
    it(`${f}: names at least one producer`, () => {
      expect(fx.producers.length).toBeGreaterThan(0);
      for (const p of fx.producers) expect(["ts", "py"]).toContain(p);
    });
  }
});
