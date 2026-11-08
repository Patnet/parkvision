-- ParkVision — schéma initial (lot 1)
-- Cf. cahier des charges v1.4 §5. Toutes les géométries en SRID 4326 (WGS84).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE communes (
  insee_code  TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  geom        GEOMETRY(MultiPolygon, 4326)
);

CREATE TABLE postal_areas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postal_code    TEXT NOT NULL,
  commune_insee  TEXT NOT NULL REFERENCES communes(insee_code),
  label          TEXT NOT NULL,
  geom           GEOMETRY(MultiPolygon, 4326)
);
CREATE INDEX idx_postal_areas_code_commune ON postal_areas (postal_code, commune_insee);

CREATE TABLE roads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_insee  TEXT NOT NULL REFERENCES communes(insee_code),
  name           TEXT NOT NULL,
  geom           GEOMETRY(MultiLineString, 4326)
);
CREATE INDEX idx_roads_geom ON roads USING GIST (geom);

CREATE TABLE road_segments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  road_id       UUID NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
  geom          GEOMETRY(LineString, 4326) NOT NULL,
  side          TEXT CHECK (side IN ('LEFT', 'RIGHT', 'UNKNOWN')) NOT NULL DEFAULT 'UNKNOWN',
  verified_at   TIMESTAMPTZ
);
CREATE INDEX idx_road_segments_geom ON road_segments USING GIST (geom);
CREATE INDEX idx_road_segments_road ON road_segments (road_id);

CREATE TABLE parking_spaces (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id        UUID NOT NULL REFERENCES road_segments(id) ON DELETE CASCADE,
  geom              GEOMETRY(Point, 4326) NOT NULL,
  inventory_status  TEXT CHECK (inventory_status IN ('KNOWN', 'ASSUMED', 'UNVERIFIED')) NOT NULL DEFAULT 'UNVERIFIED',
  provenance        TEXT NOT NULL,
  verified_at       TIMESTAMPTZ,
  visibility        TEXT CHECK (visibility IN ('PUBLIC', 'HIDDEN')) NOT NULL DEFAULT 'PUBLIC',
  is_simulated      BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_parking_spaces_geom ON parking_spaces USING GIST (geom);
CREATE INDEX idx_parking_spaces_segment ON parking_spaces (segment_id);

CREATE TABLE parking_rules (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id           UUID REFERENCES parking_spaces(id) ON DELETE CASCADE,
  segment_id         UUID REFERENCES road_segments(id) ON DELETE CASCADE,
  category           TEXT CHECK (category IN ('GENERAL','PMR','DELIVERY','EV','PRIVATE','RESIDENT','NO_PARKING','TEMPORARY')) NOT NULL,
  valid_from         TIMESTAMPTZ,
  valid_to           TIMESTAMPTZ,
  recurring_schedule TEXT,
  permit_required    BOOLEAN NOT NULL DEFAULT FALSE,
  source_url         TEXT,
  verified_at        TIMESTAMPTZ,
  CONSTRAINT parking_rules_target_chk CHECK (space_id IS NOT NULL OR segment_id IS NOT NULL)
);
CREATE INDEX idx_parking_rules_space ON parking_rules (space_id);
CREATE INDEX idx_parking_rules_segment ON parking_rules (segment_id);
CREATE INDEX idx_parking_rules_category ON parking_rules (category);

CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pseudonym  TEXT NOT NULL UNIQUE,
  role       TEXT CHECK (role IN ('USER','MODERATOR','ADMIN')) NOT NULL DEFAULT 'USER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE observations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            TEXT NOT NULL UNIQUE,
  space_id            UUID REFERENCES parking_spaces(id) ON DELETE CASCADE,
  segment_id          UUID REFERENCES road_segments(id) ON DELETE CASCADE,
  kind                TEXT CHECK (kind IN ('PARKING','DEPARTURE')) NOT NULL,
  occupancy           TEXT CHECK (occupancy IN (
                         'FREE_CONFIRMED','FREE_REPORTED','OCCUPIED_CONFIRMED',
                         'OCCUPIED_REPORTED','LIKELY_AVAILABLE','UNKNOWN','RESERVED_INACCESSIBLE'
                       )) NOT NULL,
  source              TEXT CHECK (source IN ('USER','SENSOR','AUTHORIZED_CAMERA','MUNICIPAL_FEED','SIMULATION')) NOT NULL,
  verification_level  TEXT CHECK (verification_level IN ('UNVERIFIED','SELF_REPORTED','FIELD_VERIFIED','INSTRUMENTED')) NOT NULL DEFAULT 'SELF_REPORTED',
  observed_at         TIMESTAMPTZ NOT NULL,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL,
  confidence          REAL,
  reporter_id         UUID REFERENCES users(id),
  moderation_status   TEXT CHECK (moderation_status IN ('PENDING','ACCEPTED','REJECTED')) NOT NULL DEFAULT 'ACCEPTED',
  retracted_at        TIMESTAMPTZ,
  CONSTRAINT observations_target_chk CHECK (space_id IS NOT NULL OR segment_id IS NOT NULL),
  CONSTRAINT observations_expiry_chk CHECK (expires_at > observed_at)
);
CREATE INDEX idx_observations_space ON observations (space_id);
CREATE INDEX idx_observations_segment ON observations (segment_id);
CREATE INDEX idx_observations_observed_at ON observations (observed_at);
CREATE INDEX idx_observations_expires_at ON observations (expires_at);
CREATE INDEX idx_observations_source ON observations (source);

CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_object ON audit_log (object_type, object_id);
