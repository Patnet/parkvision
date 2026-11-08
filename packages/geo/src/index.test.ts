import { describe, expect, it } from "vitest";
import { haversineDistanceMeters, isWithinRadius, offsetMeters } from "./index.js";

describe("haversineDistanceMeters", () => {
  it("returns 0 for identical points", () => {
    const p = { lat: 47.9, lon: 1.9 };
    expect(haversineDistanceMeters(p, p)).toBeCloseTo(0, 3);
  });

  it("approximates a known short distance", () => {
    const a = { lat: 47.9029, lon: 1.9039 };
    const b = { lat: 47.9038, lon: 1.9039 };
    const distance = haversineDistanceMeters(a, b);
    expect(distance).toBeGreaterThan(90);
    expect(distance).toBeLessThan(110);
  });
});

describe("isWithinRadius", () => {
  it("accepts points inside the radius and rejects points outside", () => {
    const center = { lat: 47.9029, lon: 1.9039 };
    const near = offsetMeters(center, 50, 0);
    const far = offsetMeters(center, 2000, 0);
    expect(isWithinRadius(center, near, 500)).toBe(true);
    expect(isWithinRadius(center, far, 500)).toBe(false);
  });
});

describe("offsetMeters", () => {
  it("produces a point roughly the requested distance away", () => {
    const origin = { lat: 47.9029, lon: 1.9039 };
    const moved = offsetMeters(origin, 0, 100);
    expect(haversineDistanceMeters(origin, moved)).toBeCloseTo(100, 0);
  });
});
