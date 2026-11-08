import { z } from "zod";
import { DestinationCandidate } from "./geo.js";
import { VehicleType } from "./enums.js";
import { ParkingSpace } from "./parking.js";

export const DestinationSearchQuery = z.object({
  query: z.string().min(2),
});
export type DestinationSearchQuery = z.infer<typeof DestinationSearchQuery>;

export const DestinationRecommendationInput = z.object({
  destination: DestinationCandidate,
  radiusMeters: z.union([z.literal(200), z.literal(500), z.literal(1000)]),
  arrivalAt: z.string().datetime().nullable(),
  vehicleType: VehicleType.default("CAR"),
  accessibility: z.boolean().default(false),
});
export type DestinationRecommendationInput = z.infer<
  typeof DestinationRecommendationInput
>;

export const RankedZone = z.object({
  segmentId: z.string(),
  label: z.string(),
  legalEligibility: z.enum(["ELIGIBLE", "RESTRICTED", "EXCLUDED"]),
  walkingDistanceMeters: z.number().nullable(),
  distanceIsEstimated: z.boolean(),
  spaces: z.array(ParkingSpace),
  explanation: z.array(z.string()),
  unknownReason: z.string().nullable(),
});
export type RankedZone = z.infer<typeof RankedZone>;

export const DestinationRecommendationResult = z.object({
  destination: DestinationCandidate,
  zones: z.array(RankedZone),
  generatedAt: z.string().datetime(),
  isSimulated: z.literal(true),
});
export type DestinationRecommendationResult = z.infer<
  typeof DestinationRecommendationResult
>;
