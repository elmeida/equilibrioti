import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { getAuthPool } from '../db/authPool.js';
import sql from 'mssql';

const router = Router();
const schemaName = process.env.AUTH_DB_SCHEMA || 'equilibrio_ti';
const schema = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName) ? schemaName : 'equilibrio_ti';

// Configuração do Multer para upload de logos
const uploadDir = path.resolve(process.cwd(), 'server', 'uploads', 'empresas');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --- EMPRESAS ---

router.get('/empresas', async (_req, res, next) => {
  try {
    const pool = getAuthPool();
    const result = await pool.query(
      `SELECT id, nome, logo_url, db_host, db_port, db_database, db_user, db_encrypt, db_trust_cert, criado_em 
       FROM ${schema}.empresas ORDER BY nome`
    );
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/empresas', async (req, res, next) => {
  try {
    const { nome, logo_url, db_host, db_port, db_database, db_user, db_password } = req.body;
    const pool = getAuthPool();
    const result = await pool.query(
      `INSERT INTO ${schema}.empresas (nome, logo_url, db_host, db_port, db_database, db_user, db_password) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nome, logo_url, db_host, db_port || 1433, db_database, db_user, db_password]
    );
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

router.put('/empresas/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { nome, logo_url, db_host, db_port, db_database, db_user, db_password } = req.body;
    const pool = getAuthPool();
    
    let query = `UPDATE ${schema}.empresas SET nome=$1, logo_url=$2, db_host=$3, db_port=$4, db_database=$5, db_user=$6, atualizado_em=now()`;
    const params = [nome, logo_url, db_host, db_port || 1433, db_database, db_user];
    
    if (db_password && db_password.trim() !== '') {
      params.push(db_password);
      query += `, db_password=$${params.length}`;
    }
    
    query += ` WHERE id=$${params.length + 1} RETURNING id, nome, logo_url, db_host, db_port, db_database, db_user`;
    params.push(id);

    const result = await pool.query(query, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

router.post('/empresas/upload-logo', upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  res.json({ url: `/uploads/empresas/${req.file.filename}` });
});

router.post('/empresas/test-connection', async (req, res) => {
  const { db_host, db_port, db_database, db_user, db_password } = req.body;
  
  if (!db_host || !db_database || !db_user || !db_password) {
    return res.status(400).json({ error: 'Dados de conexão incompletos.' });
  }

  let connection;
  try {
    connection = await sql.connect({
      server: db_host,
      port: Number(db_port || 1433),
      database: db_database,
      user: db_user,
      password: db_password,
      options: { encrypt: false, trustServerCertificate: true },
      connectionTimeout: 5000,
    });
    
    await connection.query('SELECT 1 as test');
    res.json({ ok: true, message: 'Conexão estabelecida com sucesso!' });
  } catch (error) {
    res.status(400).json({ error: 'Falha na conexão: ' + error.message });
  } finally {
    if (connection) connection.close();
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
    const { nome, email, senha, perfil, empresa_id } = req.body;
    const pool = getAuthPool();
    
    const existing = await pool.query(`SELECT id FROM ${schema}.usuarios WHERE lower(email) = lower($1)`, [email]);
    if (existing.rowCount > 0) return res.status(400).json({ error: 'E-mail já cadastrado.' });
    
    const hash = await bcrypt.hash(senha, 12);
    const result = await pool.query(
      `INSERT INTO ${schema}.usuarios (nome, email, senha_hash, perfil, empresa_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, perfil, empresa_id`,
      [nome, email, hash, perfil || 'cliente', empresa_id || null]
    );
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

router.put('/usuarios/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { nome, email, perfil, empresa_id, ativo } = req.body;
    const pool = getAuthPool();
    
    const existing = await pool.query(`SELECT id FROM ${schema}.usuarios WHERE lower(email) = lower($1) AND id != $2`, [email, id]);
    if (existing.rowCount > 0) return res.status(400).json({ error: 'E-mail já utilizado por outro usuário.' });
    
    const result = await pool.query(
      `UPDATE ${schema}.usuarios SET nome=$1, email=$2, perfil=$3, empresa_id=$4, ativo=$5, atualizado_em=now() 
       WHERE id=$6 RETURNING id, nome, email, perfil, empresa_id, ativo`,
      [nome, email, perfil, empresa_id || null, ativo !== false, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

router.post('/usuarios/:id/reset-password', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { novaSenha } = req.body;
    
    if (!novaSenha || novaSenha.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }
    
    const pool = getAuthPool();
    const hash = await bcrypt.hash(novaSenha, 12);
    
    const result = await pool.query(
      `UPDATE ${schema}.usuarios SET senha_hash=$1, atualizado_em=now() WHERE id=$2 RETURNING id`,
      [hash, id]
    );
    
    if (result.rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ ok: true, message: 'Senha resetada com sucesso.' });
  } catch (error) { next(error); }
});

export default router;
