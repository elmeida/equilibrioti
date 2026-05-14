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
    CREATE TABLE IF NOT EXISTS ${schema}.usuarios (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      email VARCHAR(180) NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      perfil VARCHAR(40) NOT NULL DEFAULT 'admin',
      ativo BOOLEAN NOT NULL DEFAULT true,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      ultimo_login_em TIMESTAMPTZ
    )
  `);

  const existing = await pool.query(`SELECT id FROM ${schema}.usuarios WHERE lower(email) = lower($1) LIMIT 1`, [adminEmail]);
  if (existing.rowCount === 0) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await pool.query(
      `INSERT INTO ${schema}.usuarios (nome, email, senha_hash, perfil) VALUES ($1, $2, $3, $4)`,
      ['Administrador', adminEmail, hash, 'admin'],
    );
  }
}
