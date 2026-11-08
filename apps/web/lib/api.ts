const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface RuleDto {
  id: string;
  category: string;
  recurringSchedule: string | null;
  permitRequired: boolean;
  sourceUrl: string | null;
  verifiedAt: string | null;
}

export interface ParkingSpaceDto {
  id: string;
  segmentId: string;
  coordinates: { lat: number; lon: number };
  occupancy: string;
  isSimulated: boolean;
  provenance: string;
  verifiedAt: string | null;
  freshness: { observedAt: string | null; expiresAt: string | null };
  rules: RuleDto[];
}

export interface RoadDto {
  id: string;
  name: string;
  geometry: { type: string; coordinates: unknown };
}

export async function fetchRoadsInBbox(bbox: [number, number, number, number]): Promise<RoadDto[]> {
  const res = await fetch(`${API_URL}/v1/parking/roads?bbox=${bbox.join(",")}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Impossible de charger les rues fictives.");
  const data = await res.json();
  return data.roads as RoadDto[];
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/v1/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
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

export async function fetchSpace(id: string): Promise<ParkingSpaceDto> {
  const res = await fetch(`${API_URL}/v1/parking/spaces/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Emplacement introuvable ou API indisponible.");
  return res.json();
}

export interface ObservationHistoryItemDto {
  id: string;
  occupancy: string;
  source: string;
  verificationLevel: string;
  observedAt: string;
  expiresAt: string;
  moderationStatus: string;
}

export async function fetchSpaceHistory(id: string): Promise<ObservationHistoryItemDto[]> {
  const res = await fetch(`${API_URL}/v1/parking/spaces/${id}/observations`, { cache: "no-store" });
  if (!res.ok) throw new Error("Historique indisponible.");
  const data = await res.json();
  return data.history as ObservationHistoryItemDto[];
}

export interface SegmentDetailDto {
  id: string;
  roadName: string;
  side: string;
  verifiedAt: string | null;
  spaces: ParkingSpaceDto[];
}

export async function fetchSegment(id: string): Promise<SegmentDetailDto> {
  const res = await fetch(`${API_URL}/v1/parking/segments/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Tronçon introuvable ou API indisponible.");
  return res.json();
}

export async function submitReport(params: {
  targetType: "SPACE" | "SEGMENT" | "OBSERVATION";
  targetId: string;
  reason: "WRONG_RULE" | "WRONG_LOCATION" | "STALE_DATA" | "ABUSE" | "OTHER";
  details?: string;
}) {
  const res = await fetch(`${API_URL}/v1/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Signalement impossible pour l'instant.");
  return res.json();
}
