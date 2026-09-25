import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getAuthPool } from '../db/authPool.js';
import { requireAuth, signUser, publicUser, hasActiveAccess } from '../auth/middleware.js';
import { auditedMutation, httpError } from '../security/audit.js';

const router = Router();
const schemaName = process.env.AUTH_DB_SCHEMA || 'equilibrio_ti';
const schema = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName) ? schemaName : 'equilibrio_ti';
const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.' },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const pool = getAuthPool();
    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.senha_hash, u.perfil, u.ativo, u.empresa_id, u.session_version,
              e.ativo AS empresa_ativa, e.nome as empresa_nome, e.logo_url as empresa_logo
       FROM ${schema}.usuarios u 
       LEFT JOIN ${schema}.empresas e ON u.empresa_id = e.id 
       WHERE lower(u.email) = lower($1) AND u.ativo = true LIMIT 1`,
      [payload.email],
    );

    const user = result.rows[0];
    if (!hasActiveAccess(user) || !(await bcrypt.compare(payload.password, user.senha_hash))) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    await pool.query(`UPDATE ${schema}.usuarios SET ultimo_login_em = now(), atualizado_em = now() WHERE id = $1`, [user.id]);
    const cleanUser = publicUser(user);
    return res.json({ token: signUser(user), user: cleanUser });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await auditedMutation(req, 'session.logout', async pool => {
      await pool.query(
        `INSERT INTO ${schema}.sessoes_revogadas (id, usuario_id, expira_em)
         VALUES ($1, $2, to_timestamp($3)) ON CONFLICT (id) DO NOTHING`,
        [req.auth.id, req.user.sub, req.auth.expiresAt],
      );
      await pool.query(`DELETE FROM ${schema}.sessoes_revogadas WHERE expira_em <= now()`);
      return { tenantId: req.user.empresa_id, resourceId: req.user.sub };
    });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/change-password', requireAuth, authLimiter, async (req, res, next) => {
  try {
    const payload = changePasswordSchema.parse(req.body);
    const pool = getAuthPool();
    const result = await pool.query(
      `SELECT id, senha_hash FROM ${schema}.usuarios WHERE id = $1 AND ativo = true LIMIT 1`,
      [req.user.sub],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(payload.currentPassword, user.senha_hash))) {
      return res.status(401).json({ error: 'Senha atual inválida.' });
    }

    const hash = await bcrypt.hash(payload.newPassword, 12);
    await auditedMutation(req, 'user.password_change', async client => {
      const updated = await client.query(
        `UPDATE ${schema}.usuarios SET senha_hash = $1, session_version = session_version + 1, atualizado_em = now()
         WHERE id = $2 AND senha_hash = $3 AND session_version = $4 AND ativo = true RETURNING id`,
        [hash, user.id, user.senha_hash, req.user.session_version],
      );
      if (!updated.rowCount) throw httpError(409, 'A sessao foi alterada');
      return { tenantId: req.user.empresa_id, resourceId: user.id };
    });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
