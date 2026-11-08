import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CreateObservationInput } from "@parkvision/contracts";
import {
  createManualObservation,
  getSpaceById,
  getSpacesInBbox,
} from "../repository.js";
import { serializeSpace } from "../serialize.js";

const BboxQuery = z.object({
  bbox: z
    .string()
    .transform((v) => v.split(",").map(Number))
    .refine((arr) => arr.length === 4 && arr.every((n) => Number.isFinite(n)), {
      message: "bbox doit être minLon,minLat,maxLon,maxLat",
    }),
});

const OBSERVATION_TTL_MINUTES = 15;

export async function parkingRoutes(app: FastifyInstance) {
  app.get(
    "/v1/parking/spaces",
    {
      schema: {
        description: "Liste les emplacements fictifs dans une zone géographique (bbox).",
        tags: ["parking"],
        querystring: {
          type: "object",
          properties: { bbox: { type: "string" } },
          required: ["bbox"],
        },
      },
    },
    async (request, reply) => {
      const parsed = BboxQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: "bbox invalide", details: parsed.error.issues });
      }
      const [minLon, minLat, maxLon, maxLat] = parsed.data.bbox as [
        number,
        number,
        number,
        number,
      ];
      const enriched = await getSpacesInBbox(app.pg, [minLon, minLat, maxLon, maxLat], new Date());
      return reply.send({ spaces: enriched.map(serializeSpace) });
    },
  );

  app.get(
    "/v1/parking/spaces/:id",
    {
      schema: {
        description: "Détail d'un emplacement : état, règles, preuve agrégée, fraîcheur.",
        tags: ["parking"],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const enriched = await getSpaceById(app.pg, id, new Date());
      if (!enriched) {
        return reply.status(404).send({ error: "Emplacement introuvable" });
      }
      return reply.send(serializeSpace(enriched));
    },
  );

  app.post(
    "/v1/observations",
    {
      schema: {
        description:
          "Signalement manuel « Je me gare / Je pars », uniquement à l'arrêt. Ne produit jamais un état confirmé.",
        tags: ["parking"],
      },
    },
    async (request, reply) => {
      const parsed = CreateObservationInput.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "corps invalide", details: parsed.error.issues });
      }

      const space = await getSpaceById(app.pg, parsed.data.spaceId, new Date());
      if (!space) {
        return reply.status(404).send({ error: "Emplacement introuvable" });
      }

      const { created } = await createManualObservation(app.pg, {
        spaceId: parsed.data.spaceId,
        kind: parsed.data.kind,
        occupancy: parsed.data.occupancy,
        idempotencyKey: parsed.data.idempotencyKey,
        ttlMinutes: OBSERVATION_TTL_MINUTES,
      });

      const updated = await getSpaceById(app.pg, parsed.data.spaceId, new Date());
      return reply.status(created ? 201 : 200).send({
        created,
        space: updated ? serializeSpace(updated) : null,
      });
    },
  );
}
