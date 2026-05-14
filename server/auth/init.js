import bcrypt from 'bcryptjs';
import { getAuthPool } from '../db/authPool.js';

const schemaName = process.env.AUTH_DB_SCHEMA || 'equilibrio_ti';
const schema = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName) ? schemaName : 'equilibrio_ti';
const adminEmail = process.env.AUTH_ADMIN_EMAIL || 'admin@equilibrioti.com.br';
const adminPassword = process.env.AUTH_ADMIN_PASSWORD || 'Admin@2026';

export async function ensureAuthSchema() {
  const pool = getAuthPool();
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.empresas (
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
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.usuarios (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      email VARCHAR(180) NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      perfil VARCHAR(40) NOT NULL DEFAULT 'admin',
      ativo BOOLEAN NOT NULL DEFAULT true,
      empresa_id INTEGER REFERENCES ${schema}.empresas(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      ultimo_login_em TIMESTAMPTZ
    )
  `);

  await pool.query(`
    ALTER TABLE ${schema}.usuarios 
    ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES ${schema}.empresas(id) ON DELETE SET NULL
  `);

  const existingAdmin = await pool.query(`SELECT id FROM ${schema}.usuarios WHERE lower(email) = lower($1) LIMIT 1`, [adminEmail]);
  if (existingAdmin.rowCount === 0) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await pool.query(
      `INSERT INTO ${schema}.usuarios (nome, email, senha_hash, perfil) VALUES ($1, $2, $3, $4)`,
      ['Administrador', adminEmail, hash, 'admin'],
    );
  }

  const existingEmpresa = await pool.query(`SELECT id FROM ${schema}.empresas WHERE nome = 'ServDrill' LIMIT 1`);
  let empresaId;
  if (existingEmpresa.rowCount === 0) {
    const result = await pool.query(
      `INSERT INTO ${schema}.empresas (nome, logo_url, db_host, db_port, db_database, db_user, db_password) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['ServDrill', '/logo_servdrill.png', process.env.DB_HOST || 'servdrill.opendata.center', Number(process.env.DB_PORT || 1433), process.env.DB_DATABASE || 'Servdrill', process.env.DB_USER || 'rm', process.env.DB_PASSWORD || 'rm']
    );
    empresaId = result.rows[0].id;
  } else {
    empresaId = existingEmpresa.rows[0].id;
  }

  const servdrillEmail = 'usuario@servdrill.com.br';
  const existingUser = await pool.query(`SELECT id FROM ${schema}.usuarios WHERE lower(email) = lower($1) LIMIT 1`, [servdrillEmail]);
  if (existingUser.rowCount === 0) {
    const hash = await bcrypt.hash('Usuario@2026', 12);
    await pool.query(
      `INSERT INTO ${schema}.usuarios (nome, email, senha_hash, perfil, empresa_id) VALUES ($1, $2, $3, $4, $5)`,
      ['Usuário ServDrill', servdrillEmail, hash, 'cliente', empresaId],
    );
  }
}
