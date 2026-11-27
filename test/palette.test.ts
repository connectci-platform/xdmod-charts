import { describe, it, expect } from "vitest";
import { PALETTE, MAX_SERIES, colorFor } from "../src/palette.js";

describe("palette", () => {
  // Validated with the dataviz skill's validate_palette.js on the adjacent pairlist in both
  // modes (light surface default, dark surface #1a1a19). Light-mode contrast WARNs for #1baf7a,
  // #eda100 and #e87ba4, and tritan 5.8, obligate a legend and a table view, which both
  // products provide.
  it("is the palette that passed the dataviz validator for colour-blind separation", () => {
    expect(PALETTE.light).toEqual(["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]);
    expect(PALETTE.dark).toEqual(["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"]);
  });
  it("has equally many light and dark colours", () => {
    expect(PALETTE.dark.length).toBe(PALETTE.light.length);
  });
  it("MAX_SERIES equals the palette length", () => {
    expect(MAX_SERIES).toBe(PALETTE.light.length);
    expect(MAX_SERIES).toBe(8);
  });
  it("gives slot i to the i-th name in sorted order, in either mode", () => {
    const names = ["Delta", "Anvil", "Bridges"];
    expect(colorFor("Anvil", names)).toBe(PALETTE.light[0]);
    expect(colorFor("Bridges", names)).toBe(PALETTE.light[1]);
    expect(colorFor("Delta", names, "dark")).toBe(PALETTE.dark[2]);
  });
  it("is unchanged by the order of the names", () => {
    const names = ["c", "a", "b"];
    for (const n of names) expect(colorFor(n, [...names].reverse())).toBe(colorFor(n, names));
  });
});
