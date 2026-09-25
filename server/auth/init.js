import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { getAuthPool } from '../db/authPool.js';
import { runAuthMigrations } from '../db/migrations.js';
import { getAuthSchemaName } from '../db/schema.js';
import { encryptCredential } from '../security/credentials.js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const isProduction = process.env.NODE_ENV === 'production';
const schema = getAuthSchemaName();
const adminEmail = process.env.AUTH_ADMIN_EMAIL || 'admin@equilibrioti.com.br';
const adminPassword = process.env.AUTH_ADMIN_PASSWORD || '';
const shouldSeedDemoTenant = process.env.SEED_DEMO_TENANT === 'true';

if (isProduction && (!adminPassword || adminPassword.length < 12)) {
  throw new Error('AUTH_ADMIN_PASSWORD obrigatorio e forte em producao.');
}

export async function ensureAuthSchema() {
  const pool = getAuthPool();
  await runAuthMigrations({ pool, schema });

  const existingAdmin = await pool.query(`SELECT id FROM ${schema}.usuarios WHERE lower(email) = lower($1) LIMIT 1`, [adminEmail]);
  if (existingAdmin.rowCount === 0 && adminPassword) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await pool.query(
      `INSERT INTO ${schema}.usuarios (nome, email, senha_hash, perfil) VALUES ($1, $2, $3, $4)`,
      ['Administrador', adminEmail, hash, 'admin'],
    );
  }

  if (!shouldSeedDemoTenant) return;

  const seedDbHost = process.env.DB_HOST || 'localhost';
  const seedDbDatabase = process.env.DB_DATABASE || 'base_demo';
  const seedDbUser = process.env.DB_USER || 'usuario_demo';
  const seedDbPassword = process.env.DB_PASSWORD || '';
  const seedUserPassword = process.env.SEED_DEMO_USER_PASSWORD || '';

  if (!seedDbPassword || !seedUserPassword) {
    throw new Error('Credenciais de seed demo incompletas. Defina DB_PASSWORD e SEED_DEMO_USER_PASSWORD ou desative SEED_DEMO_TENANT.');
  }

  const existingEmpresa = await pool.query(`SELECT id FROM ${schema}.empresas WHERE nome = 'ServDrill' LIMIT 1`);
  let empresaId;
  if (existingEmpresa.rowCount === 0) {
    const reserved = await pool.query(`SELECT nextval(pg_get_serial_sequence('${schema}.empresas', 'id'))::integer AS id`);
    empresaId = reserved.rows[0].id;
    await pool.query(
      `INSERT INTO ${schema}.empresas (id, nome, logo_url, db_host, db_port, db_database, db_user, db_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [empresaId, 'ServDrill', '/logo_servdrill.png', seedDbHost, Number(process.env.DB_PORT || 1433), seedDbDatabase, seedDbUser, encryptCredential(seedDbPassword, empresaId)],
    );
  } else {
    empresaId = existingEmpresa.rows[0].id;
  }

  const servdrillEmail = 'usuario@servdrill.com.br';
  const existingUser = await pool.query(`SELECT id FROM ${schema}.usuarios WHERE lower(email) = lower($1) LIMIT 1`, [servdrillEmail]);
  if (existingUser.rowCount === 0) {
    const hash = await bcrypt.hash(seedUserPassword, 12);
    await pool.query(
      `INSERT INTO ${schema}.usuarios (nome, email, senha_hash, perfil, empresa_id) VALUES ($1, $2, $3, $4, $5)`,
      ['Usuario ServDrill', servdrillEmail, hash, 'cliente', empresaId],
    );
  }
}
