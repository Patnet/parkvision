"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { ErrorState, LoadingState } from "@/components/SystemStates";
import { fetchAdminStats, type AdminStatsDto } from "@/lib/adminApi";

function Dashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<AdminStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminStats(token)
      .then(setStats)
      .catch(() => setError("Statistiques indisponibles."));
  }, [token]);

  if (error) return <ErrorState message={error} />;
  if (!stats) return <LoadingState label="Chargement des statistiques…" />;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>Tableau de bord simulation (A02)</h1>
        <p style={{ color: "var(--text-muted)" }}>{stats.mode}</p>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 12 }}>
          <Metric label="Emplacements fictifs" value={stats.totalSpaces} />
          <Metric label="Signalements en attente" value={stats.pendingReports} />
          <Metric
            label="Couverture (non inconnu)"
            value={`${Math.round(stats.coverageRatio * 100)} %`}
          />
          <Metric
            label="Âge moyen des observations"
            value={
              stats.averageObservationAgeMinutes !== null
                ? `${stats.averageObservationAgeMinutes.toFixed(1)} min`
                : "n/a"
            }
          />
        </div>
      </section>

      <section className="panel">
        <h2>Qualité et couverture (A07)</h2>
        <ul>
          {Object.entries(stats.byOccupancy).map(([status, count]) => (
            <li key={status}>
              {status} : {count} / {stats.totalSpaces}
            </li>
          ))}
        </ul>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Généré le {new Date(stats.generatedAt).toLocaleString("fr-FR")}. Métriques de
          simulation uniquement — jamais présentées comme un résultat de terrain.
        </p>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, minWidth: 140 }}>
      <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{value}</div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{label}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return <AdminGate>{(token) => <Dashboard token={token} />}</AdminGate>;
}
