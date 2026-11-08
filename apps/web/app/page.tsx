"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Legend } from "@/components/Legend";
import { useToast } from "@/components/ToastProvider";
import { searchPostalCodes } from "@/lib/api";

const ParkingMap = dynamic(
  () => import("@/components/ParkingMap").then((m) => m.ParkingMap),
  { ssr: false },
);

export default function HomePage() {
  const [query, setQuery] = useState("45100");
  const [candidates, setCandidates] = useState<
    { postal_code: string; commune_insee: string; label: string }[]
  >([]);
  const { showToast } = useToast();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    try {
      const results = await searchPostalCodes(query);
      setCandidates(results);
      if (results.length === 0) {
        showToast("Aucun résultat pour cette recherche.", "info");
      }
    } catch {
      showToast("Recherche indisponible pour l'instant.", "error");
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>Trouvez une zone où chercher une place</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Carte fictive du quartier <strong>SIM-45100</strong>. Aucune de ces
          données ne correspond à une observation réelle rue Paul-Sougy ni
          ailleurs.
        </p>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label htmlFor="postal" style={{ display: "none" }}>
            Code postal ou commune
          </label>
          <input
            id="postal"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Code postal, commune ou rue"
            style={{ flex: 1, minWidth: 220 }}
          />
          <button type="submit" className="primary">
            Rechercher
          </button>
        </form>
        {candidates.length > 1 && (
          <div style={{ marginTop: 10 }}>
            <p>Plusieurs communes correspondent, précisez votre choix :</p>
            <ul>
              {candidates.map((c) => (
                <li key={`${c.postal_code}-${c.commune_insee}`}>{c.label}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel">
        <Legend />
        <div style={{ marginTop: 12 }}>
          <ParkingMap />
        </div>
      </section>
    </div>
  );
}
