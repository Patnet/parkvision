import { z } from "zod";
import { Coordinates } from "./geo.js";
import {
  ObservationKind,
  ObservationSource,
  OccupancyStatus,
  RuleCategory,
  VerificationLevel,
} from "./enums.js";

export const ParkingRule = z.object({
  id: z.string(),
  category: RuleCategory,
  validFrom: z.string().datetime().nullable(),
  validTo: z.string().datetime().nullable(),
  recurringSchedule: z.string().nullable(),
  permitRequired: z.boolean(),
  sourceUrl: z.string().nullable(),
  verifiedAt: z.string().datetime().nullable(),
});
export type ParkingRule = z.infer<typeof ParkingRule>;

export const ParkingSpace = z.object({
  id: z.string(),
  segmentId: z.string(),
  coordinates: Coordinates,
  inventoryStatus: z.enum(["KNOWN", "ASSUMED", "UNVERIFIED"]),
  provenance: z.string(),
  verifiedAt: z.string().datetime().nullable(),
  visibility: z.enum(["PUBLIC", "HIDDEN"]),
  rules: z.array(ParkingRule),
  occupancy: OccupancyStatus,
  freshness: z.object({
    observedAt: z.string().datetime().nullable(),
    expiresAt: z.string().datetime().nullable(),
  }),
  isSimulated: z.boolean(),
});
export type ParkingSpace = z.infer<typeof ParkingSpace>;

export const Observation = z.object({
  id: z.string(),
  spaceId: z.string().nullable(),
  segmentId: z.string().nullable(),
  kind: ObservationKind,
  occupancy: OccupancyStatus,
  source: ObservationSource,
  verificationLevel: VerificationLevel,
  observedAt: z.string().datetime(),
  receivedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  confidence: z.number().min(0).max(1).nullable(),
  reporterId: z.string().nullable(),
  moderationStatus: z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
});
export type Observation = z.infer<typeof Observation>;

export const CreateObservationInput = z.object({
  spaceId: z.string(),
  kind: ObservationKind,
  occupancy: z.enum(["FREE_REPORTED", "OCCUPIED_REPORTED"]),
  idempotencyKey: z.string().min(8),
});
export type CreateObservationInput = z.infer<typeof CreateObservationInput>;
