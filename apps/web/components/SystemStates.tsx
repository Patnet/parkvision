import type { ReactNode } from "react";

/**
 * États système réutilisables (P20) : chargement, hors ligne, erreur API,
 * aucune donnée, données périmées, accès refusé. Cf. cahier des charges
 * v1.4 §27 (P20) et §29.1 (skeleton loaders, empty states).
 */

export function LoadingState({ label = "Chargement…" }: { label?: string }) {
  return (
    <div role="status" style={{ color: "var(--text-muted)", padding: "16px 0" }}>
      {label}
    </div>
  );
}

export function OfflineState() {
  return (
    <div className="panel" role="alert" style={{ borderColor: "var(--occupied)" }}>
      <strong>Hors ligne</strong>
      <p style={{ color: "var(--text-muted)", margin: "6px 0 0" }}>
        L&apos;API ParkVision n&apos;est pas accessible. Vérifiez votre connexion ou
        que les services Docker (<code>api</code>, <code>postgres</code>) sont démarrés.
        Le mode manuel reste disponible une fois la connexion rétablie.
      </p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="panel" role="alert" style={{ borderColor: "var(--occupied)" }}>
      <strong>Une erreur est survenue</strong>
      <p style={{ color: "var(--text-muted)", margin: "6px 0 0" }}>{message}</p>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="panel" style={{ textAlign: "center", color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}

export function ExpiredDataState({ since }: { since: string | null }) {
  return (
    <p style={{ color: "var(--unknown)", fontSize: "0.85rem", margin: "4px 0 0" }}>
      Donnée périmée{since ? ` depuis ${since}` : ""} : affichée comme « inconnue », jamais comme « libre ».
    </p>
  );
}

export function AccessDeniedState() {
  return (
    <div className="panel" role="alert" style={{ borderColor: "var(--occupied)" }}>
      <strong>Accès refusé</strong>
      <p style={{ color: "var(--text-muted)", margin: "6px 0 0" }}>
        Cette page nécessite un jeton d&apos;administration valide.
      </p>
    </div>
  );
}
