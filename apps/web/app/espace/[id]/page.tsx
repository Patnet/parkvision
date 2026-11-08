"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ConfirmReportButton } from "@/components/ConfirmReportButton";
import { Legend } from "@/components/Legend";
import { ErrorState, LoadingState } from "@/components/SystemStates";
import { useToast } from "@/components/ToastProvider";
import {
  fetchSpace,
  fetchSpaceHistory,
  reportParkingEvent,
  type ObservationHistoryItemDto,
  type ParkingSpaceDto,
} from "@/lib/api";

function navigationUrl(provider: "waze" | "google", lat: number, lon: number) {
  if (provider === "waze") return `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}

export default function SpaceDetailPage() {
  const params = useParams<{ id: string }>();
  const [space, setSpace] = useState<ParkingSpaceDto | null>(null);
  const [history, setHistory] = useState<ObservationHistoryItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [spaceData, historyData] = await Promise.all([
        fetchSpace(params.id),
        fetchSpaceHistory(params.id),
      ]);
      setSpace(spaceData);
      setHistory(historyData);
    } catch {
      setError("Emplacement introuvable ou API indisponible.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReport(kind: "PARKING" | "DEPARTURE") {
    try {
      await reportParkingEvent({
        spaceId: params.id,
        kind,
        occupancy: kind === "PARKING" ? "OCCUPIED_REPORTED" : "FREE_REPORTED",
      });
      showToast(
        kind === "PARKING" ? "Signalement « Je me gare » enregistré." : "Signalement « Je pars » enregistré.",
        "success",
      );
      await load();
    } catch {
      showToast("Signalement impossible pour l'instant.", "error");
    }
  }

  if (loading) return <LoadingState label="Chargement de l'emplacement…" />;
  if (error || !space) return <ErrorState message={error ?? "Emplacement introuvable."} />;

  const restrictive = space.rules.filter((r) => r.category !== "GENERAL");

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>Fiche emplacement (fictif)</h1>
        <Legend />

        <div style={{ marginTop: 14 }}>
          <strong>Occupation : </strong>
          {space.occupancy}
          {space.freshness.observedAt && (
            <span style={{ color: "var(--text-muted)" }}>
              {" "}
              — observé le {new Date(space.freshness.observedAt).toLocaleString("fr-FR")}
            </span>
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          <strong>Restrictions : </strong>
          {restrictive.length === 0 ? (
            <span style={{ color: "var(--text-muted)" }}>aucune restriction particulière connue</span>
          ) : (
            <ul>
              {restrictive.map((r) => (
                <li key={r.id}>
                  {r.category}
                  {r.recurringSchedule ? ` — ${r.recurringSchedule}` : ""}
                  {r.permitRequired ? " (justificatif requis)" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Provenance : {space.provenance}
          {space.verifiedAt && ` — contrôlé le ${new Date(space.verifiedAt).toLocaleDateString("fr-FR")}`}.
          Emplacement {space.isSimulated ? "fictif (SIM-45100)" : "réel"}.
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <ConfirmReportButton
            label="Je me gare ici"
            question="Vous semblez être stationné. Confirmez-vous ?"
            onConfirm={() => handleReport("PARKING")}
          />
          <ConfirmReportButton
            label="Je pars d'ici"
            question="Vous semblez avoir quitté une place. Confirmez-vous ?"
            onConfirm={() => handleReport("DEPARTURE")}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <a
            className="secondary"
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)" }}
            href={navigationUrl("waze", space.coordinates.lat, space.coordinates.lon)}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir Waze
          </a>
          <a
            className="secondary"
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)" }}
            href={navigationUrl("google", space.coordinates.lat, space.coordinates.lon)}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir Google Maps
          </a>
          <Link
            href={`/zone/${space.segmentId}`}
            className="secondary"
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)" }}
          >
            Voir le tronçon
          </Link>
          <Link
            href={`/signaler?targetType=SPACE&targetId=${space.id}`}
            className="secondary"
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)" }}
          >
            Signaler une erreur
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>Historique court</h2>
        {history.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Aucune observation récente.</p>
        ) : (
          <ul style={{ fontSize: "0.9rem" }}>
            {history.map((h) => (
              <li key={h.id}>
                {h.occupancy} — {h.source === "USER" ? "déclaration" : h.source} —{" "}
                {new Date(h.observedAt).toLocaleString("fr-FR")}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
