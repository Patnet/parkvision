const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface ParkingSpaceDto {
  id: string;
  coordinates: { lat: number; lon: number };
  occupancy: string;
  isSimulated: boolean;
  rules: { category: string }[];
}

export async function fetchSpacesInBbox(bbox: [number, number, number, number]) {
  const res = await fetch(`${API_URL}/v1/parking/spaces?bbox=${bbox.join(",")}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Impossible de charger les emplacements simulés.");
  const data = await res.json();
  return data.spaces as ParkingSpaceDto[];
}

export async function searchPostalCodes(query: string) {
  const res = await fetch(
    `${API_URL}/v1/geo/postal-codes?query=${encodeURIComponent(query)}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Recherche indisponible.");
  const data = await res.json();
  return data.candidates as { postal_code: string; commune_insee: string; label: string }[];
}

export async function searchDestinations(query: string) {
  const res = await fetch(
    `${API_URL}/v1/destinations/search?q=${encodeURIComponent(query)}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Recherche de destination indisponible.");
  const data = await res.json();
  return data.candidates as {
    label: string;
    coordinates: { lat: number; lon: number };
    communeInsee?: string;
    postalCodes: string[];
    source: string;
  }[];
}

export interface RankedZoneDto {
  segmentId: string;
  label: string;
  legalEligibility: "ELIGIBLE" | "RESTRICTED" | "EXCLUDED";
  walkingDistanceMeters: number | null;
  distanceIsEstimated: boolean;
  spaces: ParkingSpaceDto[];
  explanation: string[];
  unknownReason: string | null;
}

export async function fetchRecommendations(params: {
  destination: { label: string; coordinates: { lat: number; lon: number }; communeInsee?: string; postalCodes: string[]; source: string };
  radiusMeters: 200 | 500 | 1000;
  arrivalAt: string | null;
  vehicleType: "CAR" | "MOTORBIKE" | "EV" | "PMR_AUTHORIZED";
  accessibility: boolean;
}) {
  const res = await fetch(`${API_URL}/v1/destinations/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Calcul des recommandations indisponible.");
  const data = await res.json();
  return data.zones as RankedZoneDto[];
}

export async function reportParkingEvent(params: {
  spaceId: string;
  kind: "PARKING" | "DEPARTURE";
  occupancy: "FREE_REPORTED" | "OCCUPIED_REPORTED";
}) {
  const idempotencyKey = `${params.spaceId}-${Date.now()}`;
  const res = await fetch(`${API_URL}/v1/observations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, idempotencyKey }),
  });
  if (!res.ok) throw new Error("Signalement impossible.");
  return res.json();
}
