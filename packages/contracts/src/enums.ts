import { z } from "zod";

/**
 * Statuts affichés à l'utilisateur. Distincts de la légalité (voir RuleCategory).
 * Cf. cahier des charges v1.4 §2, §6, §29.
 */
export const OccupancyStatus = z.enum([
  "FREE_CONFIRMED",
  "FREE_REPORTED",
  "OCCUPIED_CONFIRMED",
  "OCCUPIED_REPORTED",
  "LIKELY_AVAILABLE",
  "UNKNOWN",
  "RESERVED_INACCESSIBLE",
]);
export type OccupancyStatus = z.infer<typeof OccupancyStatus>;

export const RuleCategory = z.enum([
  "GENERAL",
  "PMR",
  "DELIVERY",
  "EV",
  "PRIVATE",
  "RESIDENT",
  "NO_PARKING",
  "TEMPORARY",
]);
export type RuleCategory = z.infer<typeof RuleCategory>;

export const ObservationSource = z.enum([
  "USER",
  "SENSOR",
  "AUTHORIZED_CAMERA",
  "MUNICIPAL_FEED",
  "SIMULATION",
]);
export type ObservationSource = z.infer<typeof ObservationSource>;

export const VerificationLevel = z.enum([
  "UNVERIFIED",
  "SELF_REPORTED",
  "FIELD_VERIFIED",
  "INSTRUMENTED",
]);
export type VerificationLevel = z.infer<typeof VerificationLevel>;

export const ObservationKind = z.enum(["PARKING", "DEPARTURE"]);
export type ObservationKind = z.infer<typeof ObservationKind>;

export const VehicleType = z.enum(["CAR", "MOTORBIKE", "EV", "PMR_AUTHORIZED"]);
export type VehicleType = z.infer<typeof VehicleType>;
