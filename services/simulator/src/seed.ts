import { Pool } from "pg";
import {
  SIM_COMMUNE_INSEE,
  SIM_COMMUNE_NAME,
  SIM_POSTAL_CODE,
  buildSpaces,
  buildStreets,
  type SimRuleCategory,
} from "./fixtures.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://parkvision:parkvision@localhost:5432/parkvision";

function lineStringWkt(points: { lat: number; lon: number }[]): string {
  const coords = points.map((p) => `${p.lon} ${p.lat}`).join(", ");
  return `SRID=4326;LINESTRING(${coords})`;
}

function pointWkt(p: { lat: number; lon: number }): string {
  return `SRID=4326;POINT(${p.lon} ${p.lat})`;
}

function multiPolygonBufferWkt(points: { lat: number; lon: number }[]): string {
  // Enveloppe large et grossière autour du quartier fictif, uniquement
  // pour permettre une recherche géographique par zone en lot 1.
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const pad = 0.002;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLon = Math.min(...lons) - pad;
  const maxLon = Math.max(...lons) + pad;
  return `SRID=4326;MULTIPOLYGON((( ${minLon} ${minLat}, ${maxLon} ${minLat}, ${maxLon} ${maxLat}, ${minLon} ${maxLat}, ${minLon} ${minLat} )))`;
}

// Catégories jamais combinées avec une seconde restriction simultanée
// dans ce jeu fictif, pour garder les règles lisibles au lot 1.
const RULE_PARAMS: Record<
  SimRuleCategory,
  { permitRequired: boolean; recurringSchedule: string | null }
> = {
  GENERAL: { permitRequired: false, recurringSchedule: null },
  PMR: { permitRequired: true, recurringSchedule: null },
  DELIVERY: { permitRequired: false, recurringSchedule: "Lun-Sam 07:00-19:00" },
  EV: { permitRequired: false, recurringSchedule: null },
  PRIVATE: { permitRequired: true, recurringSchedule: null },
  RESIDENT: { permitRequired: true, recurringSchedule: null },
  NO_PARKING: { permitRequired: false, recurringSchedule: null },
  TEMPORARY: { permitRequired: false, recurringSchedule: "Jusqu'à nouvel ordre" },
};

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Idempotence : on repart d'un état propre pour SIM45 uniquement.
    await client.query("DELETE FROM communes WHERE insee_code = $1", [
      SIM_COMMUNE_INSEE,
    ]);

    const streets = buildStreets();
    const allPoints = streets.flatMap((s) => [s.start, s.end]);

    await client.query(
      `INSERT INTO communes (insee_code, name, geom)
       VALUES ($1, $2, ST_GeomFromEWKT($3))`,
      [SIM_COMMUNE_INSEE, SIM_COMMUNE_NAME, multiPolygonBufferWkt(allPoints)],
    );

    await client.query(
      `INSERT INTO postal_areas (postal_code, commune_insee, label, geom)
       VALUES ($1, $2, $3, ST_GeomFromEWKT($4))`,
      [
        SIM_POSTAL_CODE,
        SIM_COMMUNE_INSEE,
        `${SIM_POSTAL_CODE} — ${SIM_COMMUNE_NAME}`,
        multiPolygonBufferWkt(allPoints),
      ],
    );

    const segmentIdByStreetSide = new Map<string, string>();

    for (const street of streets) {
      const roadResult = await client.query<{ id: string }>(
        `INSERT INTO roads (commune_insee, name, geom)
         VALUES ($1, $2, ST_GeomFromEWKT($3))
         RETURNING id`,
        [
          SIM_COMMUNE_INSEE,
          street.name,
          `SRID=4326;MULTILINESTRING((${street.start.lon} ${street.start.lat}, ${street.end.lon} ${street.end.lat}))`,
        ],
      );
      const roadId = roadResult.rows[0].id;

      for (const side of ["LEFT", "RIGHT"] as const) {
        const segmentResult = await client.query<{ id: string }>(
          `INSERT INTO road_segments (road_id, geom, side, verified_at)
           VALUES ($1, ST_GeomFromEWKT($2), $3, now())
           RETURNING id`,
          [roadId, lineStringWkt([street.start, street.end]), side],
        );
        segmentIdByStreetSide.set(`${street.index}-${side}`, segmentResult.rows[0].id);
      }
    }

    const spaces = buildSpaces(streets);
    let freeCount = 0;
    let occupiedCount = 0;

    for (const space of spaces) {
      const segmentId = segmentIdByStreetSide.get(
        `${space.streetIndex}-${space.side}`,
      );
      if (!segmentId) throw new Error("Segment fictif manquant — incohérence de seed");

      const spaceResult = await client.query<{ id: string }>(
        `INSERT INTO parking_spaces (segment_id, geom, inventory_status, provenance, verified_at, visibility, is_simulated)
         VALUES ($1, ST_GeomFromEWKT($2), 'KNOWN', 'SIMULATEUR SIM-45100', now(), 'PUBLIC', TRUE)
         RETURNING id`,
        [segmentId, pointWkt(space.coordinates)],
      );
      const spaceId = spaceResult.rows[0].id;

      const ruleParams = RULE_PARAMS[space.category];
      await client.query(
        `INSERT INTO parking_rules (space_id, category, permit_required, recurring_schedule, source_url, verified_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [
          spaceId,
          space.category,
          ruleParams.permitRequired,
          ruleParams.recurringSchedule,
          "simulation://SIM-45100",
        ],
      );

      // Observations initiales déterministes pour peupler quelques scénarios
      // (libre récent, occupé, expiré) — cf. §10 scénarios de test.
      const slot = space.indexOnStreet % 4;
      const now = new Date();
      if (space.category === "GENERAL" || space.category === "RESIDENT") {
        if (slot === 0) {
          freeCount += 1;
          await insertObservation(client, {
            spaceId,
            occupancy: "FREE_REPORTED",
            observedAt: new Date(now.getTime() - 2 * 60_000),
            expiresAt: new Date(now.getTime() + 13 * 60_000),
          });
        } else if (slot === 1) {
          occupiedCount += 1;
          await insertObservation(client, {
            spaceId,
            occupancy: "OCCUPIED_REPORTED",
            observedAt: new Date(now.getTime() - 5 * 60_000),
            expiresAt: new Date(now.getTime() + 25 * 60_000),
          });
        } else if (slot === 2) {
          // Observation volontairement expirée : doit retomber à UNKNOWN côté API.
          await insertObservation(client, {
            spaceId,
            occupancy: "FREE_REPORTED",
            observedAt: new Date(now.getTime() - 90 * 60_000),
            expiresAt: new Date(now.getTime() - 60 * 60_000),
          });
        }
        // slot === 3 : aucune observation -> UNKNOWN par défaut.
      }
    }

    await client.query("COMMIT");

    console.log(
      `Seed SIM-45100 terminé : ${streets.length} rues, ${spaces.length} emplacements fictifs ` +
        `(${freeCount} signalés libres, ${occupiedCount} signalés occupés, le reste inconnu/expiré).`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function insertObservation(
  client: { query: Pool["query"] },
  params: {
    spaceId: string;
    occupancy: "FREE_REPORTED" | "OCCUPIED_REPORTED";
    observedAt: Date;
    expiresAt: Date;
  },
) {
  const kind = params.occupancy === "FREE_REPORTED" ? "DEPARTURE" : "PARKING";
  const eventId = `sim-${params.spaceId}-${params.observedAt.getTime()}`;
  await client.query(
    `INSERT INTO observations
       (event_id, space_id, kind, occupancy, source, verification_level, observed_at, expires_at, moderation_status)
     VALUES ($1, $2, $3, $4, 'SIMULATION', 'SELF_REPORTED', $5, $6, 'ACCEPTED')
     ON CONFLICT (event_id) DO NOTHING`,
    [eventId, params.spaceId, kind, params.occupancy, params.observedAt, params.expiresAt],
  );
}

main().catch((error) => {
  console.error("Échec du seed SIM-45100 :", error);
  process.exitCode = 1;
});
