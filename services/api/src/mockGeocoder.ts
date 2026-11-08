import type { DestinationCandidate } from "@parkvision/contracts";

/**
 * Géocodeur mock, hors ligne, pour le lot 1-2. Ne couvre que le quartier
 * fictif SIM-45100 — cf. cahier des charges v1.4 §24.2.2 : "adaptateur
 * mock, pas de couverture nationale d'occupation annoncée".
 * Un vrai adaptateur (BAN/Géoplateforme) sera branché derrière la même
 * interface `DestinationResolver` plus tard, hors lot 1-2.
 */

// Doit rester synchronisé avec services/simulator/src/fixtures.ts —
// pleine mer, loin de toute route réelle (voir le commentaire détaillé
// là-bas sur le bug de résolution Waze→Paul-Sougy qui a motivé ce choix).
const SIM_ORIGIN = { lat: 47.5, lon: -8.0 };

const KNOWN_LOCATIONS: DestinationCandidate[] = [
  {
    label: "45100 — Quartier fictif SIM-45100",
    coordinates: SIM_ORIGIN,
    communeInsee: "SIM45",
    postalCodes: ["45100"],
    source: "SIMULATION",
  },
  {
    label: "Rue des Lilas-Fictifs, SIM-45100",
    coordinates: { lat: SIM_ORIGIN.lat, lon: SIM_ORIGIN.lon },
    communeInsee: "SIM45",
    postalCodes: ["45100"],
    source: "SIMULATION",
  },
  {
    label: "Rue du Simulateur, SIM-45100",
    coordinates: { lat: SIM_ORIGIN.lat, lon: SIM_ORIGIN.lon + 0.0011 },
    communeInsee: "SIM45",
    postalCodes: ["45100"],
    source: "SIMULATION",
  },
];

export function searchDestinations(query: string): DestinationCandidate[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];

  return KNOWN_LOCATIONS.filter(
    (loc) =>
      loc.label.toLowerCase().includes(normalized) ||
      loc.postalCodes.some((pc) => pc.includes(normalized)),
  );
}
