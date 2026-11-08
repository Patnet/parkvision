"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminAuthError, fetchAdminStats } from "@/lib/adminApi";
import { AccessDeniedState, LoadingState } from "@/components/SystemStates";

const STORAGE_KEY = "parkvision-admin-token";

/**
 * A01 — Connexion admin. Jeton partagé (lot 1-2), pas un système de
 * comptes/rôles : cf. services/api/src/adminAuth.ts côté serveur.
 */
export function AdminGate({ children }: { children: (token: string) => ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = (() => {
      try {
        return window.localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    })();
    if (!stored) {
      setChecking(false);
      return;
    }
    fetchAdminStats(stored)
      .then(() => setToken(stored))
      .catch(() => {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignoré
        }
      })
      .finally(() => setChecking(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await fetchAdminStats(input);
      try {
        window.localStorage.setItem(STORAGE_KEY, input);
      } catch {
        // ignoré : jeton non persisté dans cette session
      }
      setToken(input);
    } catch (err) {
      if (err instanceof AdminAuthError) {
        setError("Jeton invalide.");
      } else {
        setError("API admin indisponible.");
      }
    }
  }

  if (checking) return <LoadingState label="Vérification de session admin…" />;

  if (!token) {
    return (
      <div className="panel" style={{ maxWidth: 420, display: "grid", gap: 12 }}>
        <h1 style={{ marginTop: 0 }}>Connexion admin</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Jeton partagé de développement (lot 1-2) — à remplacer par OIDC/RBAC
          avant tout déploiement au-delà du poste de développement.
        </p>
        <form onSubmit={handleLogin} style={{ display: "flex", gap: 8 }}>
          <label htmlFor="admin-token" style={{ display: "none" }}>
            Jeton admin
          </label>
          <input
            id="admin-token"
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Jeton admin"
            style={{ flex: 1 }}
          />
          <button type="submit" className="primary">
            Entrer
          </button>
        </form>
        {error && <AccessDeniedState />}
      </div>
    );
  }

  return <>{children(token)}</>;
}
