import type { Pool } from "pg";
import type { ObservationSource, VerificationLevel } from "@parkvision/contracts";
import { computeAvailability, type ObservationRecord } from "./availability.js";

export interface SpaceRow {
  id: string;
  segment_id: string;
  lat: number;
  lon: number;
  inventory_status: "KNOWN" | "ASSUMED" | "UNVERIFIED";
  provenance: string;
  verified_at: Date | null;
  visibility: "PUBLIC" | "HIDDEN";
  is_simulated: boolean;
}

export interface RuleRow {
  id: string;
  space_id: string | null;
  category: string;
  valid_from: Date | null;
  valid_to: Date | null;
  recurring_schedule: string | null;
  permit_required: boolean;
  source_url: string | null;
  verified_at: Date | null;
}

async function fetchRulesForSpaces(pool: Pool, spaceIds: string[]): Promise<Map<string, RuleRow[]>> {
  const byId = new Map<string, RuleRow[]>();
  if (spaceIds.length === 0) return byId;

  const { rows } = await pool.query<RuleRow>(
    `SELECT id, space_id, category, valid_from, valid_to, recurring_schedule, permit_required, source_url, verified_at
     FROM parking_rules WHERE space_id = ANY($1)`,
    [spaceIds],
  );
  for (const row of rows) {
    const list = byId.get(row.space_id!) ?? [];
    list.push(row);
    byId.set(row.space_id!, list);
  }
  return byId;
}

async function fetchObservationsForSpaces(
  pool: Pool,
  spaceIds: string[],
): Promise<Map<string, ObservationRecord[]>> {
  const byId = new Map<string, ObservationRecord[]>();
  if (spaceIds.length === 0) return byId;

  const { rows } = await pool.query<{
    space_id: string;
    occupancy: string;
    source: ObservationSource;
    verification_level: VerificationLevel;
    observed_at: Date;
    expires_at: Date;
    moderation_status: "PENDING" | "ACCEPTED" | "REJECTED";
    retracted_at: Date | null;
  }>(
    `SELECT space_id, occupancy, source, verification_level, observed_at, expires_at, moderation_status, retracted_at
     FROM observations WHERE space_id = ANY($1)`,
    [spaceIds],
  );

  for (const row of rows) {
    const signal = row.occupancy.startsWith("FREE") ? "FREE" : "OCCUPIED";
    const list = byId.get(row.space_id) ?? [];
    list.push({
      occupancySignal: signal as "FREE" | "OCCUPIED",
      source: row.source,
      verificationLevel: row.verification_level,
      observedAt: row.observed_at,
      expiresAt: row.expires_at,
      moderationStatus: row.moderation_status,
      retractedAt: row.retracted_at,
    });
    byId.set(row.space_id, list);
  }
  return byId;
}

export interface EnrichedSpace {
  space: SpaceRow;
  rules: RuleRow[];
  availability: ReturnType<typeof computeAvailability>;
}

async function enrich(pool: Pool, spaces: SpaceRow[], now: Date): Promise<EnrichedSpace[]> {
  const ids = spaces.map((s) => s.id);
  const [rulesById, obsById] = await Promise.all([
    fetchRulesForSpaces(pool, ids),
    fetchObservationsForSpaces(pool, ids),
  ]);

  return spaces.map((space) => ({
    space,
    rules: rulesById.get(space.id) ?? [],
    availability: computeAvailability(obsById.get(space.id) ?? [], now),
  }));
}

export async function getSpacesInBbox(
  pool: Pool,
  bbox: [number, number, number, number],
  now: Date,
): Promise<EnrichedSpace[]> {
  const { rows } = await pool.query<SpaceRow>(
    `SELECT id, segment_id, ST_Y(geom) AS lat, ST_X(geom) AS lon,
            inventory_status, provenance, verified_at, visibility, is_simulated
     FROM parking_spaces
     WHERE visibility = 'PUBLIC'
       AND ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))`,
    bbox,
  );
  return enrich(pool, rows, now);
}

export async function getSpacesNearPoint(
  pool: Pool,
  center: { lat: number; lon: number },
  radiusMeters: number,
  now: Date,
): Promise<EnrichedSpace[]> {
  const { rows } = await pool.query<SpaceRow>(
    `SELECT id, segment_id, ST_Y(geom) AS lat, ST_X(geom) AS lon,
            inventory_status, provenance, verified_at, visibility, is_simulated
     FROM parking_spaces
     WHERE visibility = 'PUBLIC'
       AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`,
    [center.lon, center.lat, radiusMeters],
  );
  return enrich(pool, rows, now);
}

export async function getSpaceById(
  pool: Pool,
  id: string,
  now: Date,
): Promise<EnrichedSpace | null> {
  const { rows } = await pool.query<SpaceRow>(
    `SELECT id, segment_id, ST_Y(geom) AS lat, ST_X(geom) AS lon,
            inventory_status, provenance, verified_at, visibility, is_simulated
     FROM parking_spaces WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const [enriched] = await enrich(pool, rows, now);
  return enriched;
}

export interface CreateObservationParams {
  spaceId: string;
  kind: "PARKING" | "DEPARTURE";
  occupancy: "FREE_REPORTED" | "OCCUPIED_REPORTED";
  idempotencyKey: string;
  ttlMinutes: number;
}

export async function createManualObservation(
  pool: Pool,
  params: CreateObservationParams,
): Promise<{ created: boolean }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + params.ttlMinutes * 60_000);

  const result = await pool.query(
    `INSERT INTO observations
       (event_id, space_id, kind, occupancy, source, verification_level, observed_at, expires_at, moderation_status)
     VALUES ($1, $2, $3, $4, 'USER', 'SELF_REPORTED', $5, $6, 'ACCEPTED')
     ON CONFLICT (event_id) DO NOTHING`,
    [params.idempotencyKey, params.spaceId, params.kind, params.occupancy, now, expiresAt],
  );
  return { created: (result.rowCount ?? 0) > 0 };
}

export async function searchPostalAreas(pool: Pool, query: string) {
  const { rows } = await pool.query<{
    postal_code: string;
    commune_insee: string;
    label: string;
  }>(
    `SELECT postal_code, commune_insee, label FROM postal_areas
     WHERE postal_code ILIKE $1 OR label ILIKE $1
     ORDER BY postal_code, label`,
    [`%${query}%`],
  );
  return rows;
}

export interface SegmentRow {
  id: string;
  road_id: string;
  road_name: string;
  side: "LEFT" | "RIGHT" | "UNKNOWN";
  verified_at: Date | null;
}

export async function getSegmentDetail(
  pool: Pool,
  segmentId: string,
  now: Date,
): Promise<{ segment: SegmentRow; spaces: EnrichedSpace[] } | null> {
  const { rows } = await pool.query<SegmentRow>(
    `SELECT s.id, s.road_id, r.name AS road_name, s.side, s.verified_at
     FROM road_segments s JOIN roads r ON r.id = s.road_id
     WHERE s.id = $1`,
    [segmentId],
  );
  if (rows.length === 0) return null;

  const { rows: spaceRows } = await pool.query<SpaceRow>(
    `SELECT id, segment_id, ST_Y(geom) AS lat, ST_X(geom) AS lon,
            inventory_status, provenance, verified_at, visibility, is_simulated
     FROM parking_spaces WHERE segment_id = $1`,
    [segmentId],
  );
  const spaces = await enrich(pool, spaceRows, now);
  return { segment: rows[0], spaces };
}

export interface ObservationHistoryRow {
  id: string;
  occupancy: string;
  source: ObservationSource;
  verification_level: VerificationLevel;
  observed_at: Date;
  expires_at: Date;
  moderation_status: "PENDING" | "ACCEPTED" | "REJECTED";
}

export async function getObservationHistory(
  pool: Pool,
  spaceId: string,
  limit = 10,
): Promise<ObservationHistoryRow[]> {
  const { rows } = await pool.query<ObservationHistoryRow>(
    `SELECT id, occupancy, source, verification_level, observed_at, expires_at, moderation_status
     FROM observations
     WHERE space_id = $1
     ORDER BY observed_at DESC
     LIMIT $2`,
    [spaceId, limit],
  );
  return rows;
}

export async function createContentReport(
  pool: Pool,
  params: { targetType: string; targetId: string; reason: string; details?: string },
): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO content_reports (target_type, target_id, reason, details)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [params.targetType, params.targetId, params.reason, params.details ?? null],
  );
  return rows[0];
}

export async function getAllSpaces(pool: Pool, now: Date): Promise<EnrichedSpace[]> {
  const { rows } = await pool.query<SpaceRow>(
    `SELECT id, segment_id, ST_Y(geom) AS lat, ST_X(geom) AS lon,
            inventory_status, provenance, verified_at, visibility, is_simulated
     FROM parking_spaces WHERE visibility = 'PUBLIC'`,
  );
  return enrich(pool, rows, now);
}

export async function listRecentObservations(pool: Pool, limit = 50) {
  const { rows } = await pool.query<{
    id: string;
    space_id: string | null;
    occupancy: string;
    source: ObservationSource;
    verification_level: VerificationLevel;
    observed_at: Date;
    expires_at: Date;
    moderation_status: "PENDING" | "ACCEPTED" | "REJECTED";
  }>(
    `SELECT id, space_id, occupancy, source, verification_level, observed_at, expires_at, moderation_status
     FROM observations ORDER BY received_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}
