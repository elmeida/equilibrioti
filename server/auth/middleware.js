import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { randomBytes, randomUUID } from 'node:crypto';
import { getAuthPool } from '../db/authPool.js';
import { getAuthSchemaName } from '../db/schema.js';
import { recordAudit } from '../security/audit.js';
import { safeLogoReference } from '../security/logo-reference.js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : randomBytes(32).toString('hex'));
const schema = getAuthSchemaName();

export function positiveId(value) {
  if (!/^[1-9]\d*$/.test(String(value ?? ''))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export function publicUser(row) {
  const empresa = row.empresa || (row.empresa_nome ? { id: row.empresa_id, nome: row.empresa_nome, logo_url: row.empresa_logo } : null);
  return {
    id: row.id, nome: row.nome, email: row.email, perfil: row.perfil,
    empresa_id: row.empresa_id,
    empresa: empresa ? { id: empresa.id, nome: empresa.nome, logo_url: safeLogoReference(empresa.logo_url) } : null,
  };
}

export function hasActiveAccess(user) {
  return user?.ativo === true && (user.perfil === 'admin'
    || (user.perfil === 'cliente' && positiveId(user.empresa_id) && user.empresa_ativa === true));
}

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET obrigatorio, forte e sem valor padrao em producao.');
}

export function signUser(user) {
  return jwt.sign(
    { sub: String(user.id), sv: user.session_version },
    jwtSecret,
    { expiresIn: '12h', algorithm: 'HS256', jwtid: randomUUID() },
  );
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Sessão não informada. Faça login novamente.' });
  }

  let claims;
  try {
    claims = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    if (!positiveId(claims.sub) || !Number.isSafeInteger(claims.sv) || claims.sv < 0
      || typeof claims.jti !== 'string' || !/^[0-9a-f-]{36}$/i.test(claims.jti)
      || !Number.isSafeInteger(claims.exp)) throw new Error('Invalid session');
  } catch {
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }

  try {
    // No authorization cache: changes must apply before financial cache or SQL access.
    const result = await getAuthPool().query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.ativo, u.empresa_id, u.session_version,
              e.ativo AS empresa_ativa, e.nome AS empresa_nome, e.logo_url AS empresa_logo
       FROM ${schema}.usuarios u LEFT JOIN ${schema}.empresas e ON e.id = u.empresa_id
       WHERE u.id = $1 AND NOT EXISTS (
         SELECT 1 FROM ${schema}.sessoes_revogadas s WHERE s.id = $2 AND s.expira_em > now()
       ) LIMIT 1`,
      [Number(claims.sub), claims.jti],
    );
    const user = result.rows[0];
    if (!hasActiveAccess(user) || user.session_version !== claims.sv) {
      return res.status(401).json({ error: 'Sessão inválida ou acesso alterado. Faça login novamente.' });
    }
    req.user = { ...publicUser(user), sub: user.id, session_version: user.session_version };
    req.auth = { id: claims.jti, expiresAt: claims.exp };
    return next();
  } catch {
    return res.status(503).json({ error: 'Não foi possível validar a sessão agora. Tente novamente em instantes.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.perfil !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  return next();
}

export async function requireEmpresa(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sessão não informada.' });
  const selection = req.headers['x-empresa-id'];
  if (selection !== undefined && !positiveId(selection)) {
    return res.status(400).json({ error: 'Identificador de empresa inválido.' });
  }
  if (req.user.perfil !== 'admin' && selection !== undefined && Number(selection) !== req.user.empresa_id) {
    return res.status(403).json({ error: 'Acesso negado a esta empresa.' });
  }
  const empresaId = positiveId(req.user.perfil === 'admin' ? selection : req.user.empresa_id);
  if (empresaId === null) {
    return res.status(400).json({ error: 'Empresa não selecionada ou não vinculada.' });
  }
  try {
    const result = await getAuthPool().query(`SELECT id, connection_version FROM ${schema}.empresas WHERE id = $1 AND ativo = true`, [empresaId]);
    if (!result.rows[0]) return res.status(403).json({ error: 'Empresa indisponível para acesso.' });
    if (req.user.perfil === 'admin') {
      await recordAudit(getAuthPool(), req, 'admin.tenant_access', { tenantId: empresaId, outcome: 'authorized' });
    }
    req.empresaId = empresaId;
    req.connectionVersion = result.rows[0].connection_version;
    return next();
  } catch {
    return res.status(503).json({ error: 'Não foi possível validar a empresa agora. Tente novamente em instantes.' });
  }
}
