import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get(
    "/v1/health",
    {
      schema: {
        description: "Vérifie que l'API et sa base de données répondent.",
        tags: ["system"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              database: { type: "string" },
            },
          },
          503: {
            type: "object",
            properties: {
              status: { type: "string" },
              database: { type: "string" },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        await app.pg.query("SELECT 1");
        return reply.send({ status: "ok", database: "ok" });
      } catch {
        return reply.status(503).send({ status: "degraded", database: "unreachable" });
      }
    },
  );
}
