import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { getAuthPool } from '../db/authPool.js';
import sql from 'mssql';
import { z } from 'zod';
import { encryptCredential } from '../security/credentials.js';
import { auditedMutation, httpError } from '../security/audit.js';
import { invalidateEmpresaPool } from '../db/pool.js';
import { auditQuery, auditPage } from '../security/audit-query.js';
import { logoUploadLimiter, uploadLogo } from '../security/logos.js';
import { isSafeLogoReference } from '../security/logo-reference.js';

const router = Router();
const schemaName = process.env.AUTH_DB_SCHEMA || 'equilibrio_ti';
const schema = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName) ? schemaName : 'equilibrio_ti';
const idSchema = z.coerce.number().int().positive().max(2147483647);
const passwordSchema = z.string().min(8).max(72);
const userFields = z.object({
  nome: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(180),
  perfil: z.enum(['admin', 'cliente']),
  empresa_id: z.number().int().positive().max(2147483647).nullable(),
  ativo: z.boolean().optional(),
});
const checkCompany = value => value.perfil === 'admin' || value.empresa_id !== null;
const userCreate = userFields.extend({ senha: passwordSchema }).refine(checkCompany, { path: ['empresa_id'], message: 'Empresa obrigatoria para cliente.' });
const userUpdate = userFields.refine(checkCompany, { path: ['empresa_id'], message: 'Empresa obrigatoria para cliente.' });
const companyFields = z.object({
  nome: z.string().trim().min(1).max(120),
  logo_url: z.string().max(255).refine(isSafeLogoReference, { message: 'Use uma imagem local PNG, JPG ou WebP.' }).optional(),
  db_host: z.string().trim().min(1).max(120),
  db_port: z.coerce.number().int().min(1).max(65535).default(1433),
  db_database: z.string().trim().min(1).max(120),
  db_user: z.string().trim().min(1).max(120),
  db_password: z.string().max(4096).optional(),
  ativo: z.boolean().optional(),
});
const companyColumns = 'id, nome, logo_url, db_host, db_port, db_database, db_user, db_encrypt, db_trust_cert, ativo, criado_em';
function publicCompany(row) {
  return { ...Object.fromEntries(companyColumns.split(', ').map(key => [key, row[key]])), logo_blocked: !!row.logo_url && !isSafeLogoReference(row.logo_url) };
}
async function validUserCompany(pool, payload) {
  if (payload.perfil === 'admin') { payload.empresa_id = null; return true; }
  const result = await pool.query(`SELECT id FROM ${schema}.empresas WHERE id = $1 AND ativo = true`, [payload.empresa_id]);
  return result.rowCount > 0;
}
const sensitiveActionLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.' },
});

// --- EMPRESAS ---

router.get('/auditoria', async (req, res, next) => {
  try {
    const options = auditQuery.parse(req.query);
    const result = await getAuthPool().query(
      `SELECT id, occurred_at, actor_id, actor_kind, empresa_id, action, resource_id, outcome, request_id
       FROM ${schema}.audit_events
       WHERE ($1::bigint IS NULL OR id < $1) AND ($2::integer IS NULL OR empresa_id = $2)
         AND ($4::text IS NULL OR action = $4) AND ($5::text IS NULL OR outcome = $5)
         AND ($6::timestamptz IS NULL OR occurred_at >= $6) AND ($7::timestamptz IS NULL OR occurred_at < $7)
         AND ($8::uuid IS NULL OR request_id = $8)
       ORDER BY id DESC LIMIT $3`, [options.before || null, options.empresa_id || null, options.limit + 1,
        options.action || null, options.outcome || null, options.from || null, options.to || null, options.request_id || null],
    );
    res.json(auditPage(result.rows, options.limit));
  } catch (error) { next(error); }
});

router.get('/empresas', async (_req, res, next) => {
  try {
    const pool = getAuthPool();
    const result = await pool.query(
      `SELECT ${companyColumns}
       FROM ${schema}.empresas ORDER BY nome`
    );
    res.json(result.rows.map(publicCompany));
  } catch (error) { next(error); }
});

router.post('/empresas', async (req, res, next) => {
  try {
    const { nome, logo_url, db_host, db_port, db_database, db_user, db_password, ativo } = companyFields.extend({ db_password: z.string().min(1).max(4096) }).parse(req.body);
    const empresa = await auditedMutation(req, 'company.create', async pool => {
      const reserved = await pool.query(`SELECT nextval(pg_get_serial_sequence('${schema}.empresas', 'id'))::integer AS id`);
      const id = reserved.rows[0].id;
      const result = await pool.query(
        `INSERT INTO ${schema}.empresas (id, nome, logo_url, db_host, db_port, db_database, db_user, db_password, ativo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${companyColumns}`,
        [id, nome, logo_url, db_host, db_port, db_database, db_user, encryptCredential(db_password, id), ativo ?? true],
      );
      return { value: result.rows[0], tenantId: id, resourceId: id };
    });
    res.json(publicCompany(empresa));
  } catch (error) { next(error); }
});

router.put('/empresas/:id', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const { nome, logo_url, db_host, db_port, db_database, db_user, db_password, ativo } = companyFields.parse(req.body);
    let query = `UPDATE ${schema}.empresas SET nome=$1, logo_url=$2, db_host=$3, db_port=$4, db_database=$5, db_user=$6, connection_version=connection_version+1, atualizado_em=now()`;
    const params = [nome, logo_url, db_host, db_port || 1433, db_database, db_user];
    
    if (db_password && db_password.trim() !== '') {
      params.push(encryptCredential(db_password, id));
      query += `, db_password=$${params.length}`;
    }
    if (ativo !== undefined) {
      params.push(ativo);
      query += `, ativo=$${params.length}`;
    }
    
    query += ` WHERE id=$${params.length + 1} RETURNING ${companyColumns}`;
    params.push(id);

    const empresa = await auditedMutation(req, 'company.update', async pool => {
      const result = await pool.query(query, params);
      if (!result.rowCount) throw httpError(404, 'Empresa nao encontrada');
      return { value: result.rows[0], tenantId: id, resourceId: id };
    });
    invalidateEmpresaPool(id);
    res.json(publicCompany(empresa));
  } catch (error) { next(error); }
});

router.post('/empresas/upload-logo', logoUploadLimiter, uploadLogo);

router.post('/empresas/test-connection', async (req, res) => {
  const { db_host, db_port, db_database, db_user, db_password } = req.body;
  
  if (!db_host || !db_database || !db_user || !db_password) {
    return res.status(400).json({ error: 'Dados de conexão incompletos.' });
  }

  let connection;
  try {
    connection = new sql.ConnectionPool({
      server: db_host,
      port: Number(db_port || 1433),
      database: db_database,
      user: db_user,
      password: db_password,
      options: { encrypt: false, trustServerCertificate: true },
      connectionTimeout: 5000,
    });
    await connection.connect();
    
    await connection.query('SELECT 1 as test');
    res.json({ ok: true, message: 'Conexão estabelecida com sucesso!' });
  } catch (error) {
    res.status(400).json({ error: 'Falha na conexão. Confira o acesso e os dados informados.' });
  } finally {
    if (connection) await connection.close().catch(() => undefined);
  }
});

// --- USUÁRIOS ---

router.get('/usuarios', async (_req, res, next) => {
  try {
    const pool = getAuthPool();
    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.ativo, u.empresa_id, e.nome as empresa_nome 
       FROM ${schema}.usuarios u
       LEFT JOIN ${schema}.empresas e ON u.empresa_id = e.id
       ORDER BY u.nome`
    );
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/usuarios', async (req, res, next) => {
  try {
    const payload = userCreate.parse(req.body);
    const hash = await bcrypt.hash(payload.senha, 12);
    const user = await auditedMutation(req, 'user.create', async pool => {
      if (!await validUserCompany(pool, payload)) throw httpError(400, 'Empresa invalida ou inativa');
      const { nome, email, perfil, empresa_id, ativo } = payload;
      const existing = await pool.query(`SELECT id FROM ${schema}.usuarios WHERE lower(email) = lower($1)`, [email]);
      if (existing.rowCount > 0) throw httpError(400, 'E-mail ja cadastrado');
      const result = await pool.query(
        `INSERT INTO ${schema}.usuarios (nome, email, senha_hash, perfil, empresa_id, ativo)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nome, email, perfil, empresa_id, ativo`,
        [nome, email, hash, perfil, empresa_id, ativo ?? true],
      );
      return { value: result.rows[0], tenantId: empresa_id, resourceId: result.rows[0].id };
    });
    res.json(user);
  } catch (error) { next(error); }
});

router.put('/usuarios/:id', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const payload = userUpdate.parse(req.body);
    const user = await auditedMutation(req, 'user.update', async pool => {
      if (!await validUserCompany(pool, payload)) throw httpError(400, 'Empresa invalida ou inativa');
      const { nome, email, perfil, empresa_id, ativo } = payload;
      const existing = await pool.query(`SELECT id FROM ${schema}.usuarios WHERE lower(email) = lower($1) AND id != $2`, [email, id]);
      if (existing.rowCount > 0) throw httpError(400, 'E-mail ja utilizado');
      const result = await pool.query(
        `UPDATE ${schema}.usuarios SET nome=$1, email=$2, perfil=$3, empresa_id=$4, ativo=COALESCE($5, ativo),
         session_version=session_version+1, atualizado_em=now()
         WHERE id=$6 RETURNING id, nome, email, perfil, empresa_id, ativo`,
        [nome, email, perfil, empresa_id || null, ativo, id],
      );
      if (!result.rowCount) throw httpError(404, 'Usuario nao encontrado');
      return { value: result.rows[0], tenantId: empresa_id, resourceId: id };
    });
    res.json(user);
  } catch (error) { next(error); }
});

router.post('/usuarios/:id/reset-password', sensitiveActionLimiter, async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const { novaSenha } = z.object({ novaSenha: passwordSchema }).parse(req.body);
    
    const hash = await bcrypt.hash(novaSenha, 12);
    await auditedMutation(req, 'user.password_reset', async pool => {
      const result = await pool.query(
        `UPDATE ${schema}.usuarios SET senha_hash=$1, session_version=session_version+1, atualizado_em=now() WHERE id=$2 RETURNING id, empresa_id`,
        [hash, id],
      );
      if (!result.rowCount) throw httpError(404, 'Usuario nao encontrado');
      return { tenantId: result.rows[0].empresa_id, resourceId: id };
    });
    res.json({ ok: true, message: 'Senha resetada com sucesso.' });
  } catch (error) { next(error); }
});

export default router;
