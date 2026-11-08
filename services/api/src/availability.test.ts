import { describe, expect, it } from "vitest";
import { computeAvailability, type ObservationRecord } from "./availability.js";

const NOW = new Date("2026-11-08T12:00:00Z");

function obs(partial: Partial<ObservationRecord>): ObservationRecord {
  return {
    occupancySignal: "FREE",
    source: "USER",
    verificationLevel: "SELF_REPORTED",
    observedAt: new Date(NOW.getTime() - 60_000),
    expiresAt: new Date(NOW.getTime() + 60_000),
    moderationStatus: "ACCEPTED",
    retractedAt: null,
    ...partial,
  };
}

describe("computeAvailability", () => {
  it("returns UNKNOWN when there are no observations", () => {
    const result = computeAvailability([], NOW);
    expect(result.occupancy).toBe("UNKNOWN");
  });

  it("returns UNKNOWN when the only observation has expired", () => {
    const expired = obs({ expiresAt: new Date(NOW.getTime() - 1000) });
    const result = computeAvailability([expired], NOW);
    expect(result.occupancy).toBe("UNKNOWN");
  });

  it("returns FREE_REPORTED for a fresh self-reported departure", () => {
    const result = computeAvailability([obs({ occupancySignal: "FREE" })], NOW);
    expect(result.occupancy).toBe("FREE_REPORTED");
  });

  it("returns OCCUPIED_REPORTED for a fresh self-reported parking", () => {
    const result = computeAvailability(
      [obs({ occupancySignal: "OCCUPIED" })],
      NOW,
    );
    expect(result.occupancy).toBe("OCCUPIED_REPORTED");
  });

  it("never returns FREE_CONFIRMED from a simple user declaration", () => {
    const result = computeAvailability(
      [
        obs({
          occupancySignal: "FREE",
          source: "USER",
          verificationLevel: "SELF_REPORTED",
        }),
      ],
      NOW,
    );
    expect(result.occupancy).not.toBe("FREE_CONFIRMED");
  });

  it("returns FREE_CONFIRMED only for a fresh instrumented and authorized source", () => {
    const result = computeAvailability(
      [
        obs({
          occupancySignal: "FREE",
          source: "MUNICIPAL_FEED",
          verificationLevel: "INSTRUMENTED",
        }),
      ],
      NOW,
    );
    expect(result.occupancy).toBe("FREE_CONFIRMED");
  });

  it("falls back to UNKNOWN on a near-simultaneous contradiction", () => {
    const t = NOW.getTime() - 30_000;
    const free = obs({ occupancySignal: "FREE", observedAt: new Date(t) });
    const occupied = obs({
      occupancySignal: "OCCUPIED",
      observedAt: new Date(t + 10_000),
    });
    const result = computeAvailability([free, occupied], NOW);
    expect(result.occupancy).toBe("UNKNOWN");
  });

  it("ignores retracted or rejected observations", () => {
    const retracted = obs({ retractedAt: new Date(NOW.getTime() - 10_000) });
    const rejected = obs({ moderationStatus: "REJECTED" });
    const result = computeAvailability([retracted, rejected], NOW);
    expect(result.occupancy).toBe("UNKNOWN");
  });

  it("prefers the most recent non-contradicting observation", () => {
    const older = obs({
      occupancySignal: "OCCUPIED",
      observedAt: new Date(NOW.getTime() - 20 * 60_000),
      expiresAt: new Date(NOW.getTime() + 10 * 60_000),
    });
    const newer = obs({
      occupancySignal: "FREE",
      observedAt: new Date(NOW.getTime() - 60_000),
    });
    const result = computeAvailability([older, newer], NOW);
    expect(result.occupancy).toBe("FREE_REPORTED");
  });
});
