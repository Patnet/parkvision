import type { FastifyInstance } from "fastify";

/**
 * Cahier des charges §8 liste `DELETE /v1/me/data` parmi les endpoints
 * initiaux. En lot 1-2, aucune identité utilisateur n'existe (pas de
 * comptes, pas d'authentification — cf. §24.3) : les signalements
 * manuels sont anonymes (`reporter_id` toujours NULL). Il n'y a donc
 * rien à supprimer, et prétendre le contraire serait trompeur. On
 * documente ce renvoi honnêtement plutôt que de simuler une suppression.
 */
export async function meRoutes(app: FastifyInstance) {
  app.delete(
    "/v1/me/data",
    {
      schema: {
        description:
          "Réservé — aucune identité utilisateur n'existe en lot 1-2 (pas de comptes). Renvoie 501 explicitement plutôt que de simuler une suppression.",
        tags: ["system"],
      },
    },
    async (_request, reply) => {
      return reply.status(501).send({
        error: "not_implemented",
        message:
          "Aucune identité utilisateur n'existe en lot 1-2 : les signalements sont anonymes, rien n'est associé à un compte. Cet endpoint sera implémenté avec l'authentification (hors lot 1-2).",
      });
    },
  );
}
