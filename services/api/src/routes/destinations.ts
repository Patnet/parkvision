import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DestinationRecommendationInput } from "@parkvision/contracts";
import { haversineDistanceMeters } from "@parkvision/geo";
import { searchDestinations } from "../mockGeocoder.js";
import { getSpacesNearPoint } from "../repository.js";
import { evaluateLegalEligibility, type LegalEligibility } from "../legalEligibility.js";
import { serializeSpace } from "../serialize.js";

const SearchQuery = z.object({ q: z.string().min(2) });

const ELIGIBILITY_RANK: Record<LegalEligibility, number> = {
  ELIGIBLE: 0,
  RESTRICTED: 1,
  EXCLUDED: 2,
};

export async function destinationRoutes(app: FastifyInstance) {
  app.get(
    "/v1/destinations/search",
    {
      schema: {
        description: "Géocodage mock d'une destination (quartier fictif SIM-45100 uniquement).",
        tags: ["destinations"],
        querystring: {
          type: "object",
          properties: { q: { type: "string" } },
          required: ["q"],
        },
      },
    },
    async (request, reply) => {
      const parsed = SearchQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: "q invalide", details: parsed.error.issues });
      }
      return reply.send({ candidates: searchDestinations(parsed.data.q) });
    },
  );

  app.post(
    "/v1/destinations/recommendations",
    {
      schema: {
        description:
          "Destination Assist simulé : zones de stationnement classées autour d'une destination, avec ouverture de navigation externe laissée au client.",
        tags: ["destinations"],
      },
    },
    async (request, reply) => {
      const parsed = DestinationRecommendationInput.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "corps invalide", details: parsed.error.issues });
      }
      const input = parsed.data;
      const now = new Date();

      const enrichedSpaces = await getSpacesNearPoint(
        app.pg,
        input.destination.coordinates,
        input.radiusMeters,
        now,
      );

      const bySegment = new Map<string, typeof enrichedSpaces>();
      for (const enriched of enrichedSpaces) {
        const list = bySegment.get(enriched.space.segment_id) ?? [];
        list.push(enriched);
        bySegment.set(enriched.space.segment_id, list);
      }

      const zones = [...bySegment.entries()].map(([segmentId, spaces]) => {
        const eligibilities = spaces.map((s) =>
          evaluateLegalEligibility(
            s.rules.map((r) => ({
              id: r.id,
              category: r.category as never,
              validFrom: r.valid_from?.toISOString() ?? null,
              validTo: r.valid_to?.toISOString() ?? null,
              recurringSchedule: r.recurring_schedule,
              permitRequired: r.permit_required,
              sourceUrl: r.source_url,
              verifiedAt: r.verified_at?.toISOString() ?? null,
            })),
            input.vehicleType,
            input.accessibility,
          ),
        );

        const bestEligibility = eligibilities
          .map((e) => e.eligibility)
          .sort((a, b) => ELIGIBILITY_RANK[a] - ELIGIBILITY_RANK[b])[0] as LegalEligibility;

        const distances = spaces.map((s) =>
          haversineDistanceMeters(input.destination.coordinates, {
            lat: s.space.lat,
            lon: s.space.lon,
          }),
        );
        const walkingDistanceMeters = Math.min(...distances);

        const hasFreshObservation = spaces.some(
          (s) => s.availability.occupancy !== "UNKNOWN",
        );

        const explanation: string[] = [];
        if (input.arrivalAt) {
          explanation.push(
            "Heure d'arrivée future renseignée : disponibilité actuelle non projetée, voir « Prévision indisponible ».",
          );
        }
        explanation.push(
          hasFreshObservation
            ? "Au moins une observation récente sur ce tronçon."
            : "Aucune observation récente : disponibilité inconnue, pas une place libre.",
        );
        explanation.push(...new Set(eligibilities.flatMap((e) => e.explanation)));

        return {
          segmentId,
          label: `Tronçon ${segmentId.slice(0, 8)}`,
          legalEligibility: bestEligibility,
          walkingDistanceMeters: Math.round(walkingDistanceMeters),
          distanceIsEstimated: true,
          spaces: spaces.map(serializeSpace),
          explanation,
          unknownReason: hasFreshObservation
            ? null
            : "Aucune observation valide dans la fenêtre de fraîcheur.",
        };
      });

      zones.sort((a, b) => {
        const rankDiff = ELIGIBILITY_RANK[a.legalEligibility] - ELIGIBILITY_RANK[b.legalEligibility];
        if (rankDiff !== 0) return rankDiff;
        return (a.walkingDistanceMeters ?? Infinity) - (b.walkingDistanceMeters ?? Infinity);
      });

      return reply.send({
        destination: input.destination,
        zones,
        generatedAt: now.toISOString(),
        isSimulated: true,
      });
    },
  );
}
