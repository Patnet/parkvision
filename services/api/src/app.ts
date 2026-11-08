import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { Pool } from "pg";
import { healthRoutes } from "./routes/health.js";
import { geoRoutes } from "./routes/geo.js";
import { parkingRoutes } from "./routes/parking.js";
import { destinationRoutes } from "./routes/destinations.js";
import { segmentRoutes } from "./routes/segments.js";
import { reportRoutes } from "./routes/reports.js";
import { adminRoutes } from "./routes/admin.js";

export async function buildApp(pool: Pool) {
  const app = Fastify({ logger: true });

  app.decorate("pg", pool);

  await app.register(cors, { origin: true });

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "ParkVision API — simulation SIM-45100",
        description:
          "API de lecture et de signalement manuel simulé pour le MVP ParkVision (lots 1-2). " +
          "Toutes les données exposées sont fictives (SIM-45100) sauf mention explicite contraire.",
        version: "0.1.0",
      },
      tags: [
        { name: "system", description: "Supervision" },
        { name: "geo", description: "Recherche géographique et désambiguïsation" },
        { name: "parking", description: "Emplacements, règles, signalements manuels" },
        { name: "destinations", description: "Destination Assist simulé" },
        { name: "admin", description: "Console admin (jeton partagé, lot 1-2)" },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  await app.register(healthRoutes);
  await app.register(geoRoutes);
  await app.register(parkingRoutes);
  await app.register(destinationRoutes);
  await app.register(segmentRoutes);
  await app.register(reportRoutes);
  await app.register(adminRoutes);

  app.get("/", async (_request, reply) => {
    return reply.send({
      name: "ParkVision API",
      mode: "SIMULATION — DONNÉES FICTIVES",
      docs: "/docs",
    });
  });

  return app;
}
