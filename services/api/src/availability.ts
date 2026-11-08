import type { ObservationSource, VerificationLevel } from "@parkvision/contracts";

export type RawOccupancySignal = "FREE" | "OCCUPIED";

export interface ObservationRecord {
  occupancySignal: RawOccupancySignal;
  source: ObservationSource;
  verificationLevel: VerificationLevel;
  observedAt: Date;
  expiresAt: Date;
  moderationStatus: "PENDING" | "ACCEPTED" | "REJECTED";
  retractedAt: Date | null;
}

export type AggregatedOccupancy =
  | "FREE_CONFIRMED"
  | "FREE_REPORTED"
  | "OCCUPIED_CONFIRMED"
  | "OCCUPIED_REPORTED"
  | "UNKNOWN";

export interface AvailabilityResult {
  occupancy: AggregatedOccupancy;
  observedAt: Date | null;
  expiresAt: Date | null;
  reason: string;
}

const INSTRUMENTED_SOURCES: ObservationSource[] = [
  "SENSOR",
  "AUTHORIZED_CAMERA",
  "MUNICIPAL_FEED",
];

/**
 * Agrège les observations valides d'une place en un état public unique.
 * Cf. cahier des charges v1.4 §6 : FREE_CONFIRMED uniquement pour une
 * source technique autorisée et fraîche à fiabilité mesurée ; sinon
 * FREE_REPORTED. UNKNOWN si rien de pertinent, expiré, ou conflit non résolu.
 *
 * `now` est injecté pour que la logique reste testable sans horloge réelle.
 */
export function computeAvailability(
  observations: ObservationRecord[],
  now: Date,
): AvailabilityResult {
  const valid = observations.filter(
    (o) =>
      o.moderationStatus === "ACCEPTED" &&
      o.retractedAt === null &&
      o.expiresAt.getTime() > now.getTime(),
  );

  if (valid.length === 0) {
    return { occupancy: "UNKNOWN", observedAt: null, expiresAt: null, reason: "Aucune observation valide ou toutes expirées." };
  }

  const latest = [...valid].sort(
    (a, b) => b.observedAt.getTime() - a.observedAt.getTime(),
  )[0];

  const CONTRADICTION_WINDOW_MS = 3 * 60_000;
  const contradicting = valid.find(
    (o) =>
      o.occupancySignal !== latest.occupancySignal &&
      Math.abs(o.observedAt.getTime() - latest.observedAt.getTime()) <=
        CONTRADICTION_WINDOW_MS,
  );

  if (contradicting) {
    return {
      occupancy: "UNKNOWN",
      observedAt: latest.observedAt,
      expiresAt: latest.expiresAt,
      reason: "Signalements contradictoires proches dans le temps : état prudent.",
    };
  }

  const isInstrumented =
    latest.verificationLevel === "INSTRUMENTED" &&
    INSTRUMENTED_SOURCES.includes(latest.source);

  if (latest.occupancySignal === "FREE") {
    return {
      occupancy: isInstrumented ? "FREE_CONFIRMED" : "FREE_REPORTED",
      observedAt: latest.observedAt,
      expiresAt: latest.expiresAt,
      reason: isInstrumented
        ? "Source instrumentée fraîche et fiable."
        : "Signalement non instrumenté : reste une déclaration.",
    };
  }

  return {
    occupancy: isInstrumented ? "OCCUPIED_CONFIRMED" : "OCCUPIED_REPORTED",
    observedAt: latest.observedAt,
    expiresAt: latest.expiresAt,
    reason: isInstrumented
      ? "Source instrumentée fraîche et fiable."
      : "Signalement non instrumenté : reste une déclaration.",
  };
}
