import { describe, expect, it } from "vitest";
import { buildSpaces, buildStreets } from "./fixtures.js";

describe("SIM-45100 fixtures", () => {
  it("produces exactly 4 fictional streets and 60 fictional spaces", () => {
    const streets = buildStreets();
    const spaces = buildSpaces(streets);
    expect(streets).toHaveLength(4);
    expect(spaces).toHaveLength(60);
  });

  it("is fully deterministic across runs", () => {
    const streetsA = buildStreets();
    const spacesA = buildSpaces(streetsA);
    const streetsB = buildStreets();
    const spacesB = buildSpaces(streetsB);
    expect(spacesA).toEqual(spacesB);
  });

  it("includes PMR, delivery and private spaces required by the cahier des charges", () => {
    const spaces = buildSpaces(buildStreets());
    const categories = new Set(spaces.map((s) => s.category));
    expect(categories).toContain("PMR");
    expect(categories).toContain("DELIVERY");
    expect(categories).toContain("PRIVATE");
    expect(categories).toContain("TEMPORARY");
  });

  it("distributes spaces across both sides without favoring one heavily", () => {
    const spaces = buildSpaces(buildStreets());
    const left = spaces.filter((s) => s.side === "LEFT").length;
    const right = spaces.filter((s) => s.side === "RIGHT").length;
    expect(left + right).toBe(60);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(spaces.length / 15);
  });
});
