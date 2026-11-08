import { describe, expect, it } from "vitest";
import type { ParkingRule } from "@parkvision/contracts";
import { evaluateLegalEligibility } from "./legalEligibility.js";

function rule(category: ParkingRule["category"]): ParkingRule {
  return {
    id: "r1",
    category,
    validFrom: null,
    validTo: null,
    recurringSchedule: null,
    permitRequired: false,
    sourceUrl: null,
    verifiedAt: null,
  };
}

describe("evaluateLegalEligibility", () => {
  it("excludes a PMR space for a non-authorized driver even when empty", () => {
    const result = evaluateLegalEligibility([rule("PMR")], "CAR", false);
    expect(result.eligibility).toBe("EXCLUDED");
  });

  it("does not exclude a PMR space for an accessibility request", () => {
    const result = evaluateLegalEligibility([rule("PMR")], "CAR", true);
    expect(result.eligibility).not.toBe("EXCLUDED");
  });

  it("always excludes private spaces from public recommendations", () => {
    const result = evaluateLegalEligibility([rule("PRIVATE")], "CAR", false);
    expect(result.eligibility).toBe("EXCLUDED");
  });

  it("marks delivery-restricted spaces as RESTRICTED, not ELIGIBLE", () => {
    const result = evaluateLegalEligibility([rule("DELIVERY")], "CAR", false);
    expect(result.eligibility).toBe("RESTRICTED");
  });

  it("marks a space with no rules as ELIGIBLE", () => {
    const result = evaluateLegalEligibility([], "CAR", false);
    expect(result.eligibility).toBe("ELIGIBLE");
  });
});
