import type { FastifyInstance } from "fastify";
import { getSegmentDetail } from "../repository.js";
import { serializeSpace } from "../serialize.js";

export async function segmentRoutes(app: FastifyInstance) {
  app.get(
    "/v1/parking/segments/:id",
    {
      schema: {
        description:
          "Fiche tronçon/rue (P09) : règles, emplacements connus, date de contrôle, statut agrégé prudent.",
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
      const detail = await getSegmentDetail(app.pg, id, new Date());
      if (!detail) {
        return reply.status(404).send({ error: "Tronçon introuvable" });
      }
      return reply.send({
        id: detail.segment.id,
        roadName: detail.segment.road_name,
        side: detail.segment.side,
        verifiedAt: detail.segment.verified_at?.toISOString() ?? null,
        spaces: detail.spaces.map(serializeSpace),
      });
    },
  );
}
