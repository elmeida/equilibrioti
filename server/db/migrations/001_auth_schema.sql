CREATE TABLE IF NOT EXISTS __SCHEMA__.empresas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  logo_url VARCHAR(255),
  db_host VARCHAR(120) NOT NULL,
  db_port INTEGER DEFAULT 1433,
  db_database VARCHAR(120) NOT NULL,
  db_user VARCHAR(120) NOT NULL,
  db_password TEXT NOT NULL,
  db_encrypt BOOLEAN DEFAULT false,
  db_trust_cert BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  perfil VARCHAR(40) NOT NULL DEFAULT 'admin',
  ativo BOOLEAN NOT NULL DEFAULT true,
  empresa_id INTEGER REFERENCES __SCHEMA__.empresas(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_login_em TIMESTAMPTZ
);

ALTER TABLE __SCHEMA__.usuarios
  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES __SCHEMA__.empresas(id) ON DELETE SET NULL;

ALTER TABLE __SCHEMA__.empresas
  ADD COLUMN IF NOT EXISTS db_encrypt BOOLEAN DEFAULT false;

ALTER TABLE __SCHEMA__.empresas
  ADD COLUMN IF NOT EXISTS db_trust_cert BOOLEAN DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_lower_unique
  ON __SCHEMA__.usuarios (lower(email));

CREATE INDEX IF NOT EXISTS usuarios_empresa_id_idx
  ON __SCHEMA__.usuarios (empresa_id);
