import type { FastifyInstance } from "fastify";
import { CreateReportInput } from "@parkvision/contracts";
import { createContentReport } from "../repository.js";

export async function reportRoutes(app: FastifyInstance) {
  app.post(
    "/v1/reports",
    {
      schema: {
        description:
          "Signalement d'erreur ou d'abus (P21), sans dénonciation nominative : règle fausse, position fausse, donnée périmée.",
        tags: ["parking"],
      },
    },
    async (request, reply) => {
      const parsed = CreateReportInput.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "corps invalide", details: parsed.error.issues });
      }
      const report = await createContentReport(app.pg, parsed.data);
      return reply.status(201).send({ id: report.id, status: "PENDING" });
    },
  );
}
