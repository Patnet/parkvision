"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { ErrorState, LoadingState } from "@/components/SystemStates";
import { useToast } from "@/components/ToastProvider";
import { fetchAdminSegments, verifyAdminSegment, type AdminSegmentDto } from "@/lib/adminApi";

function ZonesAdmin({ token }: { token: string }) {
  const [segments, setSegments] = useState<AdminSegmentDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function load() {
    try {
      setSegments(await fetchAdminSegments(token));
    } catch {
      setError("Tronçons indisponibles.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVerify(id: string) {
    try {
      await verifyAdminSegment(token, id);
      showToast("Tronçon marqué comme contrôlé aujourd'hui.", "success");
      await load();
    } catch {
      showToast("Impossible de mettre à jour le tronçon.", "error");
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!segments) return <LoadingState label="Chargement des tronçons…" />;

  return (
    <section className="panel">
      <h1 style={{ marginTop: 0 }}>Gestion des zones/rues (A03)</h1>
      <p style={{ color: "var(--text-muted)" }}>
        Tronçons fictifs SIM-45100. Inventaire et géométrie fixés par le
        simulateur ; la date de contrôle peut être mise à jour pour simuler
        un passage terrain.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
              <th>Rue</th>
              <th>Côté</th>
              <th>Places</th>
              <th>Contrôlé le</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td>{s.roadName}</td>
                <td>{s.side === "LEFT" ? "Gauche" : s.side === "RIGHT" ? "Droit" : "Inconnu"}</td>
                <td>{s.spaceCount}</td>
                <td>{s.verifiedAt ? new Date(s.verifiedAt).toLocaleDateString("fr-FR") : "—"}</td>
                <td>
                  <button type="button" className="secondary" onClick={() => handleVerify(s.id)}>
                    Marquer contrôlé
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminZonesPage() {
  return <AdminGate>{(token) => <ZonesAdmin token={token} />}</AdminGate>;
}
