import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getRoadsInBbox } from "../repository.js";

const BboxQuery = z.object({
  bbox: z
    .string()
    .transform((v) => v.split(",").map(Number))
    .refine((arr) => arr.length === 4 && arr.every((n) => Number.isFinite(n)), {
      message: "bbox doit être minLon,minLat,maxLon,maxLat",
    }),
});

export async function roadRoutes(app: FastifyInstance) {
  app.get(
    "/v1/parking/roads",
    {
      schema: {
        description:
          "Géométrie des rues fictives dans une zone (polylines pour la carte) — pas une preuve d'occupation.",
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
      const roads = await getRoadsInBbox(app.pg, [minLon, minLat, maxLon, maxLat]);
      return reply.send({
        roads: roads.map((r) => ({
          id: r.id,
          name: r.name,
          geometry: JSON.parse(r.geojson),
        })),
      });
    },
  );
}
