ALTER TABLE __SCHEMA__.empresas
  ADD COLUMN IF NOT EXISTS connection_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS __SCHEMA__.audit_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id INTEGER,
  actor_kind VARCHAR(20) NOT NULL CHECK (actor_kind IN ('user', 'maintenance')),
  empresa_id INTEGER,
  action VARCHAR(60) NOT NULL,
  resource_id INTEGER,
  outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('success', 'failed', 'authorized')),
  request_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_events_empresa_id_id_idx
  ON __SCHEMA__.audit_events (empresa_id, id DESC);

-- IDs intentionally survive account deletion. Retention requires an approved policy.
REVOKE UPDATE, DELETE, TRUNCATE ON __SCHEMA__.audit_events FROM PUBLIC;
