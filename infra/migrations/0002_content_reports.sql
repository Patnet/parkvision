-- ParkVision — signalement d'erreur/abus (P21), sans dénonciation nominative.
-- Cf. cahier des charges v1.4 §27 (P21) et §32 (A10, différé pour le traitement).

CREATE TABLE content_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT CHECK (target_type IN ('SPACE', 'SEGMENT', 'OBSERVATION')) NOT NULL,
  target_id   UUID NOT NULL,
  reason      TEXT CHECK (reason IN ('WRONG_RULE', 'WRONG_LOCATION', 'STALE_DATA', 'ABUSE', 'OTHER')) NOT NULL,
  details     TEXT,
  status      TEXT CHECK (status IN ('PENDING', 'REVIEWED', 'DISMISSED')) NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_content_reports_target ON content_reports (target_type, target_id);
CREATE INDEX idx_content_reports_status ON content_reports (status);
