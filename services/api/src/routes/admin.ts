import type { FastifyInstance } from "fastify";
import { requireAdminToken } from "../adminAuth.js";
import { getAllSpaces, listRecentObservations } from "../repository.js";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/v1/admin")) return;
    await new Promise<void>((resolve) => {
      requireAdminToken(request, reply, resolve);
    });
  });

  app.get(
    "/v1/admin/stats",
    {
      schema: {
        description:
          "A02/A07 — répartition des états, âge des observations, taux d'inconnu. Jamais présenté comme un résultat de terrain.",
        tags: ["admin"],
      },
    },
    async (_request, reply) => {
      const now = new Date();
      const spaces = await getAllSpaces(app.pg, now);

      const byOccupancy: Record<string, number> = {};
      let knownCount = 0;
      let ageSumMinutes = 0;
      let ageSamples = 0;

      for (const s of spaces) {
        const status = s.availability.occupancy;
        byOccupancy[status] = (byOccupancy[status] ?? 0) + 1;
        if (status !== "UNKNOWN") {
          knownCount += 1;
          if (s.availability.observedAt) {
            ageSumMinutes += (now.getTime() - s.availability.observedAt.getTime()) / 60_000;
            ageSamples += 1;
          }
        }
      }

      const { rows: pendingReports } = await app.pg.query<{ count: string }>(
        "SELECT count(*) FROM content_reports WHERE status = 'PENDING'",
      );

      return reply.send({
        mode: "SIMULATION — DONNÉES FICTIVES",
        totalSpaces: spaces.length,
        byOccupancy,
        coverageRatio: spaces.length > 0 ? knownCount / spaces.length : 0,
        averageObservationAgeMinutes: ageSamples > 0 ? ageSumMinutes / ageSamples : null,
        pendingReports: Number(pendingReports[0]?.count ?? 0),
        generatedAt: now.toISOString(),
      });
    },
  );

  app.get(
    "/v1/admin/observations",
    {
      schema: {
        description: "A06 — journal des observations récentes (horodatage, source, conflits, idempotence).",
        tags: ["admin"],
      },
    },
    async (_request, reply) => {
      const rows = await listRecentObservations(app.pg, 100);
      return reply.send({
        observations: rows.map((r) => ({
          id: r.id,
          spaceId: r.space_id,
          occupancy: r.occupancy,
          source: r.source,
          verificationLevel: r.verification_level,
          observedAt: r.observed_at.toISOString(),
          expiresAt: r.expires_at.toISOString(),
          moderationStatus: r.moderation_status,
        })),
      });
    },
  );

  app.post(
    "/v1/admin/simulation/reset",
    {
      schema: {
        description:
          "A05 — Contrôle du simulateur : réinitialisation reproductible du quartier fictif SIM-45100.",
        tags: ["admin"],
      },
    },
    async (_request, reply) => {
      // Import paresseux : @parkvision/simulator est un outil de dev/démo,
      // pas une dépendance de démarrage de l'API.
      const { runSeed } = await import("@parkvision/simulator");
      const summary = await runSeed(app.pg);
      return reply.send({ reset: true, summary });
    },
  );

  app.get(
    "/v1/admin/settings",
    {
      schema: {
        description: "A08 — paramètres et état des adaptateurs mock (lecture seule en lot 1-2).",
        tags: ["admin"],
      },
    },
    async (_request, reply) => {
      return reply.send({
        observationTtlMinutes: 15,
        adapters: {
          geocoder: { kind: "MOCK", status: "ONLINE", scope: "SIM-45100 uniquement" },
          occupancyFeed: { kind: "SIMULATION", status: "ONLINE" },
          mapDataProvider: { kind: "OPENFREEMAP_TILES", status: "ONLINE" },
        },
        adminAuth: "jeton partagé (dev) — à remplacer par OIDC/RBAC avant tout déploiement",
      });
    },
  );
}
