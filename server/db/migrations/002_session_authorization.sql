ALTER TABLE __SCHEMA__.usuarios
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE __SCHEMA__.empresas
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS __SCHEMA__.sessoes_revogadas (
  id UUID PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES __SCHEMA__.usuarios(id) ON DELETE CASCADE,
  expira_em TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS sessoes_revogadas_expira_em_idx
  ON __SCHEMA__.sessoes_revogadas (expira_em);
