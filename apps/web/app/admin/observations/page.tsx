"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { ErrorState, LoadingState } from "@/components/SystemStates";
import { fetchAdminObservations, type AdminObservationDto } from "@/lib/adminApi";

function ObservationsLog({ token }: { token: string }) {
  const [rows, setRows] = useState<AdminObservationDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminObservations(token)
      .then(setRows)
      .catch(() => setError("Journal indisponible."));
  }, [token]);

  if (error) return <ErrorState message={error} />;
  if (!rows) return <LoadingState label="Chargement du journal…" />;

  return (
    <section className="panel">
      <h1 style={{ marginTop: 0 }}>Journal des observations (A06)</h1>
      <p style={{ color: "var(--text-muted)" }}>{rows.length} observations récentes.</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
              <th>Occupation</th>
              <th>Source</th>
              <th>Vérification</th>
              <th>Observé le</th>
              <th>Expire le</th>
              <th>Modération</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td>{r.occupancy}</td>
                <td>{r.source}</td>
                <td>{r.verificationLevel}</td>
                <td>{new Date(r.observedAt).toLocaleString("fr-FR")}</td>
                <td>{new Date(r.expiresAt).toLocaleString("fr-FR")}</td>
                <td>{r.moderationStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminObservationsPage() {
  return <AdminGate>{(token) => <ObservationsLog token={token} />}</AdminGate>;
}
