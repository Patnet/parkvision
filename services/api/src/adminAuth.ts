import type { FastifyReply, FastifyRequest } from "fastify";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "dev-admin-token";

/**
 * Garde minimale pour la console admin (A01) en lot 1-2 : un jeton partagé,
 * pas un vrai système de comptes/rôles. À remplacer par OIDC/RBAC avant tout
 * déploiement au-delà du poste de développement — cf. cahier des charges §4.
 */
export function requireAdminToken(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const header = request.headers["x-admin-token"];
  if (header !== ADMIN_TOKEN) {
    reply.status(401).send({ error: "Jeton admin invalide ou manquant." });
    return;
  }
  done();
}
