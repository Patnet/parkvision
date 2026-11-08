"use client";

import { useState } from "react";
import {
  fetchRecommendations,
  reportParkingEvent,
  searchDestinations,
  type RankedZoneDto,
} from "@/lib/api";

type DestinationCandidate = Awaited<ReturnType<typeof searchDestinations>>[number];

const RADII = [200, 500, 1000] as const;

function navigationUrl(provider: "waze" | "google" | "apple", lat: number, lon: number) {
  if (provider === "waze") return `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
  if (provider === "google") return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  return `https://maps.apple.com/?daddr=${lat},${lon}`;
}

export default function DestinationPage() {
  const [query, setQuery] = useState("45100");
  const [candidates, setCandidates] = useState<DestinationCandidate[]>([]);
  const [selected, setSelected] = useState<DestinationCandidate | null>(null);
  const [radius, setRadius] = useState<200 | 500 | 1000>(500);
  const [arrivalAt, setArrivalAt] = useState<string>("");
  const [accessibility, setAccessibility] = useState(false);
  const [zones, setZones] = useState<RankedZoneDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const results = await searchDestinations(query);
      setCandidates(results);
      setSelected(results[0] ?? null);
    } catch {
      setError("Géocodage indisponible (adaptateur mock SIM-45100 uniquement).");
    }
  }

  async function handleRecommend() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const results = await fetchRecommendations({
        destination: selected,
        radiusMeters: radius,
        arrivalAt: arrivalAt ? new Date(arrivalAt).toISOString() : null,
        vehicleType: accessibility ? "PMR_AUTHORIZED" : "CAR",
        accessibility,
      });
      setZones(results);
    } catch {
      setError("Calcul des zones indisponible pour l'instant.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReport(spaceId: string, kind: "PARKING" | "DEPARTURE") {
    try {
      await reportParkingEvent({
        spaceId,
        kind,
        occupancy: kind === "PARKING" ? "OCCUPIED_REPORTED" : "FREE_REPORTED",
      });
      await handleRecommend();
    } catch {
      setError("Signalement impossible pour l'instant.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>Destination Assist (simulé)</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Préparez votre recherche de stationnement avant d&apos;arriver, puis
          ouvrez votre navigation habituelle vers la zone choisie. ParkVision
          ne lit ni ne contrôle votre session Waze/Maps.
        </p>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Adresse de destination (quartier fictif SIM-45100)"
            style={{ flex: 1, minWidth: 260 }}
          />
          <button type="submit" className="primary">
            Chercher
          </button>
        </form>

        {candidates.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <label htmlFor="dest-select">Destination</label>
            <select
              id="dest-select"
              value={selected?.label ?? ""}
              onChange={(e) =>
                setSelected(candidates.find((c) => c.label === e.target.value) ?? null)
              }
            >
              {candidates.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
          <div>
            <label htmlFor="radius">Rayon de marche</label>
            <select
              id="radius"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value) as 200 | 500 | 1000)}
            >
              {RADII.map((r) => (
                <option key={r} value={r}>
                  {r} m
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="arrival">Heure d&apos;arrivée (facultatif)</label>
            <input
              id="arrival"
              type="datetime-local"
              value={arrivalAt}
              onChange={(e) => setArrivalAt(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 20 }}>
            <input
              id="accessibility"
              type="checkbox"
              checked={accessibility}
              onChange={(e) => setAccessibility(e.target.checked)}
              style={{ width: "auto", minHeight: "auto" }}
            />
            <label htmlFor="accessibility">Je suis autorisé(e) PMR</label>
          </div>
        </div>

        <button
          type="button"
          className="primary"
          style={{ marginTop: 12 }}
          disabled={!selected || loading}
          onClick={handleRecommend}
        >
          {loading ? "Calcul en cours…" : "Voir les zones"}
        </button>
        {error && <p role="alert" style={{ color: "var(--occupied)" }}>{error}</p>}
      </section>

      {zones.length > 0 && (
        <section className="panel">
          <h2>Zones classées (fictives)</h2>
          {zones.map((zone) => (
            <article className="zone-card" key={zone.segmentId}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{zone.label}</strong>
                <span className={`badge-eligibility ${zone.legalEligibility}`}>
                  {zone.legalEligibility}
                </span>
              </div>
              <p style={{ margin: "6px 0", color: "var(--text-muted)" }}>
                ≈ {zone.walkingDistanceMeters} m à vol d&apos;oiseau (distance estimée, pas
                un itinéraire piéton réel).
              </p>
              <ul style={{ fontSize: "0.9rem" }}>
                {zone.explanation.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {zone.spaces.slice(0, 3).map((space) => (
                  <div key={space.id} style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleReport(space.id, "PARKING")}
                    >
                      Je me gare ici
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleReport(space.id, "DEPARTURE")}
                    >
                      Je pars d&apos;ici
                    </button>
                  </div>
                ))}
              </div>
              {zone.legalEligibility !== "EXCLUDED" && zone.spaces[0] && (
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <a
                    className="secondary"
                    style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)" }}
                    href={navigationUrl("waze", zone.spaces[0].coordinates.lat, zone.spaces[0].coordinates.lon)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ouvrir Waze
                  </a>
                  <a
                    className="secondary"
                    style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)" }}
                    href={navigationUrl("google", zone.spaces[0].coordinates.lat, zone.spaces[0].coordinates.lon)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ouvrir Google Maps
                  </a>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
