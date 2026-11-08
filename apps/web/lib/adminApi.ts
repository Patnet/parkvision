const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class AdminAuthError extends Error {}

async function adminFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), "x-admin-token": token },
    cache: "no-store",
  });
  if (res.status === 401) throw new AdminAuthError("Jeton admin invalide.");
  if (!res.ok) throw new Error("Requête admin indisponible.");
  return res.json();
}

export interface AdminStatsDto {
  mode: string;
  totalSpaces: number;
  byOccupancy: Record<string, number>;
  coverageRatio: number;
  averageObservationAgeMinutes: number | null;
  pendingReports: number;
  generatedAt: string;
}

export function fetchAdminStats(token: string): Promise<AdminStatsDto> {
  return adminFetch("/v1/admin/stats", token);
}

export interface AdminObservationDto {
  id: string;
  spaceId: string | null;
  occupancy: string;
  source: string;
  verificationLevel: string;
  observedAt: string;
  expiresAt: string;
  moderationStatus: string;
}

export async function fetchAdminObservations(token: string): Promise<AdminObservationDto[]> {
  const data = await adminFetch("/v1/admin/observations", token);
  return data.observations as AdminObservationDto[];
}

export function resetSimulation(token: string) {
  return adminFetch("/v1/admin/simulation/reset", token, { method: "POST" });
}

export interface AdminSettingsDto {
  observationTtlMinutes: number;
  adapters: Record<string, { kind: string; status: string; scope?: string }>;
  adminAuth: string;
}

export function fetchAdminSettings(token: string): Promise<AdminSettingsDto> {
  return adminFetch("/v1/admin/settings", token);
}

export interface AdminSpaceDto {
  id: string;
  segmentId: string;
  coordinates: { lat: number; lon: number };
  occupancy: string;
  inventoryStatus: "KNOWN" | "ASSUMED" | "UNVERIFIED";
  visibility: "PUBLIC" | "HIDDEN";
  rules: { id: string; category: string; permitRequired: boolean; recurringSchedule: string | null }[];
}

export async function fetchAdminSpaces(token: string): Promise<AdminSpaceDto[]> {
  const data = await adminFetch("/v1/admin/spaces", token);
  return data.spaces as AdminSpaceDto[];
}

export function updateAdminSpace(
  token: string,
  id: string,
  params: { inventoryStatus?: string; visibility?: string },
) {
  return adminFetch(`/v1/admin/spaces/${id}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export function addAdminRule(
  token: string,
  spaceId: string,
  params: { category: string; permitRequired: boolean; recurringSchedule: string | null },
) {
  return adminFetch(`/v1/admin/spaces/${spaceId}/rules`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export function deleteAdminRule(token: string, ruleId: string) {
  return adminFetch(`/v1/admin/rules/${ruleId}`, token, { method: "DELETE" });
}

export interface AdminSegmentDto {
  id: string;
  roadName: string;
  side: string;
  verifiedAt: string | null;
  spaceCount: number;
}

export async function fetchAdminSegments(token: string): Promise<AdminSegmentDto[]> {
  const data = await adminFetch("/v1/admin/segments", token);
  return data.segments as AdminSegmentDto[];
}

export function verifyAdminSegment(token: string, id: string) {
  return adminFetch(`/v1/admin/segments/${id}/verify`, token, { method: "POST" });
}
