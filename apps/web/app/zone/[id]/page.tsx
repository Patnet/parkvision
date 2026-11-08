"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ErrorState, LoadingState } from "@/components/SystemStates";
import { fetchSegment, type SegmentDetailDto } from "@/lib/api";

export default function ZoneDetailPage() {
  const params = useParams<{ id: string }>();
  const [segment, setSegment] = useState<SegmentDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchSegment(params.id)
      .then((data) => {
        if (active) setSegment(data);
      })
      .catch(() => {
        if (active) setError("Tronçon introuvable ou API indisponible.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) return <LoadingState label="Chargement du tronçon…" />;
  if (error || !segment) return <ErrorState message={error ?? "Tronçon introuvable."} />;

  const knownCount = segment.spaces.filter((s) => s.occupancy !== "UNKNOWN").length;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>
          {segment.roadName} — côté {segment.side === "LEFT" ? "gauche" : segment.side === "RIGHT" ? "droit" : "inconnu"}
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          {segment.verifiedAt
            ? `Contrôlé le ${new Date(segment.verifiedAt).toLocaleDateString("fr-FR")}.`
            : "Date de contrôle inconnue."}{" "}
          {segment.spaces.length} emplacement(s) fictif(s) connu(s), {knownCount} avec une
          observation non expirée. Une zone « saturée » ou « dégagée » ne garantit pas
          l&apos;état de chaque place individuelle.
        </p>
      </section>

      <section className="panel">
        <h2>Emplacements</h2>
        <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0 }}>
          {segment.spaces.map((space) => (
            <li
              key={space.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                {space.occupancy}
                {space.rules.filter((r) => r.category !== "GENERAL").length > 0 && (
                  <span style={{ color: "var(--text-muted)" }}>
                    {" "}
                    ({space.rules.filter((r) => r.category !== "GENERAL").map((r) => r.category).join(", ")})
                  </span>
                )}
              </span>
              <Link href={`/espace/${space.id}`} className="secondary" style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
                Détail
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
