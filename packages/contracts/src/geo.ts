import { z } from "zod";

export const Coordinates = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof Coordinates>;

export const PostalAreaCandidate = z.object({
  postalCode: z.string(),
  communeInsee: z.string(),
  label: z.string(),
  coordinates: Coordinates,
});
export type PostalAreaCandidate = z.infer<typeof PostalAreaCandidate>;

export const DestinationCandidate = z.object({
  label: z.string(),
  coordinates: Coordinates,
  communeInsee: z.string().optional(),
  postalCodes: z.array(z.string()).default([]),
  source: z.enum(["MOCK_GEOCODER", "SIMULATION"]),
});
export type DestinationCandidate = z.infer<typeof DestinationCandidate>;
