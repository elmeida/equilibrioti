import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getAuthPool } from '../db/authPool.js';
import { requireAuth, signUser } from '../auth/middleware.js';

const router = Router();
const schemaName = process.env.AUTH_DB_SCHEMA || 'equilibrio_ti';
const schema = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName) ? schemaName : 'equilibrio_ti';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

function publicUser(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    perfil: row.perfil,
  };
}

router.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const pool = getAuthPool();
    const result = await pool.query(
      `SELECT id, nome, email, senha_hash, perfil FROM ${schema}.usuarios WHERE lower(email) = lower($1) AND ativo = true LIMIT 1`,
      [payload.email],
    );

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(payload.password, user.senha_hash))) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    await pool.query(`UPDATE ${schema}.usuarios SET ultimo_login_em = now(), atualizado_em = now() WHERE id = $1`, [user.id]);
    const cleanUser = publicUser(user);
    return res.json({ token: signUser(cleanUser), user: cleanUser });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const pool = getAuthPool();
    const result = await pool.query(
      `SELECT id, nome, email, perfil FROM ${schema}.usuarios WHERE id = $1 AND ativo = true LIMIT 1`,
      [req.user.sub],
    );
    if (!result.rows[0]) return res.status(401).json({ error: 'Usuário não encontrado.' });
    return res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.post('/change-password', requireAuth, async (req, res, next) => {
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
    await pool.query(`UPDATE ${schema}.usuarios SET senha_hash = $1, atualizado_em = now() WHERE id = $2`, [hash, user.id]);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
