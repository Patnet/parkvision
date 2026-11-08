import { offsetMeters, type LatLon } from "@parkvision/geo";

/**
 * Quartier fictif SIM-45100 — cf. cahier des charges v1.4 §10, §24.2, §29.
 * Code commune volontairement non-INSEE ("SIM45") pour qu'il ne puisse
 * jamais être confondu avec une commune réelle ou avec Paul-Sougy.
 */
export const SIM_COMMUNE_INSEE = "SIM45";
export const SIM_COMMUNE_NAME = "Quartier fictif SIM-45100";
export const SIM_POSTAL_CODE = "45100";

// Origine volontairement en pleine mer (Atlantique, au large de la
// Bretagne), là où aucune route réelle ne peut exister. Une première
// version de cette constante était "à ~15 km du centre d'Orléans" : un
// test sur appareil réel a montré que ces coordonnées étaient en fait
// assez proches de la vraie rue Paul-Sougy pour qu'un moteur de
// navigation externe (Waze) résolve le point vers cette rue réelle —
// exactement la confusion simulation/réel interdite par le cahier des
// charges (§1, §19). On s'éloigne donc délibérément de toute terre
// habitée pour qu'aucune résolution d'adresse réelle ne soit possible.
const SIM_ORIGIN: LatLon = { lat: 47.5, lon: -8.0 };

export type SimRuleCategory =
  | "GENERAL"
  | "PMR"
  | "DELIVERY"
  | "EV"
  | "PRIVATE"
  | "RESIDENT"
  | "NO_PARKING"
  | "TEMPORARY";

export interface SimSpace {
  streetIndex: number;
  streetName: string;
  indexOnStreet: number;
  coordinates: LatLon;
  side: "LEFT" | "RIGHT";
  category: SimRuleCategory;
}

export interface SimStreet {
  index: number;
  name: string;
  start: LatLon;
  end: LatLon;
}

const STREET_NAMES = [
  "Rue des Lilas-Fictifs",
  "Rue du Simulateur",
  "Allée de la Donnée-Fictive",
  "Impasse du Quartier-Test",
];

const SPACES_PER_STREET = 15; // 4 rues x 15 = 60 places

/** Petit PRNG déterministe (mulberry32) pour une variété reproductible. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 450_100; // graine fixe, cf. §10 "horloge accélérée, graine aléatoire fixe"

export function buildStreets(): SimStreet[] {
  return STREET_NAMES.map((name, index) => {
    const start = offsetMeters(SIM_ORIGIN, index * 120, 0);
    const end = offsetMeters(start, 0, 220); // rue fictive de 220 m
    return { index, name, start, end };
  });
}

function categoryForIndex(indexOnStreet: number, rng: () => number): SimRuleCategory {
  // Distribution déterministe : PMR, livraison, privé, temporaire, puis général.
  if (indexOnStreet === 0) return "PMR";
  if (indexOnStreet === 7) return "PMR";
  if (indexOnStreet === 3) return "DELIVERY";
  if (indexOnStreet === 11) return "DELIVERY";
  if (indexOnStreet === 5) return "PRIVATE";
  if (indexOnStreet === 13) return "TEMPORARY";
  if (indexOnStreet === 9) return "EV";
  // léger bruit déterministe pour le reste, sans jamais tomber sur une
  // catégorie restrictive supplémentaire au hasard (on garde GENERAL/RESIDENT)
  return rng() > 0.7 ? "RESIDENT" : "GENERAL";
}

export function buildSpaces(streets: SimStreet[]): SimSpace[] {
  const rng = mulberry32(SEED);
  const spaces: SimSpace[] = [];

  for (const street of streets) {
    for (let i = 0; i < SPACES_PER_STREET; i += 1) {
      const t = (i + 0.5) / SPACES_PER_STREET;
      const along: LatLon = {
        lat: street.start.lat + (street.end.lat - street.start.lat) * t,
        lon: street.start.lon + (street.end.lon - street.start.lon) * t,
      };
      const side: "LEFT" | "RIGHT" = i % 2 === 0 ? "RIGHT" : "LEFT";
      const lateral = side === "RIGHT" ? 3 : -3; // 3 m de part et d'autre de l'axe
      const coordinates = offsetMeters(along, lateral, 0);

      spaces.push({
        streetIndex: street.index,
        streetName: street.name,
        indexOnStreet: i,
        coordinates,
        side,
        category: categoryForIndex(i, rng),
      });
    }
  }

  return spaces;
}
