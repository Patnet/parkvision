import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { searchPostalAreas } from "../repository.js";

const QuerySchema = z.object({ query: z.string().min(2) });

export async function geoRoutes(app: FastifyInstance) {
  app.get(
    "/v1/geo/postal-codes",
    {
      schema: {
        description:
          "Recherche par code postal ou nom de commune ; renvoie toutes les désambiguïsations connues.",
        tags: ["geo"],
        querystring: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
    },
    async (request, reply) => {
      const parsed = QuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: "query invalide", details: parsed.error.issues });
      }
      const rows = await searchPostalAreas(app.pg, parsed.data.query);
      return reply.send({ candidates: rows });
    },
  );
}
