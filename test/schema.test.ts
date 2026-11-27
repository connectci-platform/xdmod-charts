import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { parsePayload } from "../src/parse.js";

const schema = JSON.parse(
  readFileSync(new URL("../schema/chart-payload.v1.json", import.meta.url), "utf8"),
);
const validate = new Ajv2020({ strict: true }).compile(schema);
const dir = new URL("./payloads/", import.meta.url);

describe("the schema and parsePayload agree", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  it("has ten payloads", () => expect(files.length).toBe(10));
  for (const f of files) {
    it(f, () => {
      const raw = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
      const byParser = parsePayload(raw) !== null;
      expect(validate(raw)).toBe(byParser);
      expect(byParser).toBe(f.startsWith("valid-"));
    });
  }
});
