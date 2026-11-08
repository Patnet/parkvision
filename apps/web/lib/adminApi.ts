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
