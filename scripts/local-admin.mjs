import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { localDir, poolConfig, assertLocalTarget } from './lib/local-environment.mjs';

let pool;
try {
  assertLocalTarget(process.env, 'equilibrio_app');
  const admin = JSON.parse(await fs.readFile(path.join(localDir, 'admin.json'), 'utf8'));
  if (admin.email !== 'admin@equilibrio.local' || !/^[a-f0-9]{64}$/.test(admin.password)) throw new Error('Cadastro local invalido.');
  pool = new pg.Pool(poolConfig(process.env));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`INSERT INTO equilibrio_ti.usuarios (nome,email,senha_hash,perfil)
      VALUES ($1,$2,$3,'admin') ON CONFLICT DO NOTHING RETURNING id`, ['Administrador local', admin.email, await bcrypt.hash(admin.password, 12)]);
    if (result.rowCount) await client.query(`INSERT INTO equilibrio_ti.audit_events(actor_kind,action,resource_id,outcome,request_id)
      VALUES ('maintenance','user.create',$1,'success',$2)`, [result.rows[0].id, randomUUID()]);
    await client.query('COMMIT');
    console.log(result.rowCount ? 'Administrador local criado. Acesso salvo somente em .local/equilibrio-bi/admin.json.' : 'Administrador existente preservado. Nenhuma senha alterada.');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
} catch {
  console.error('Cadastro inicial local nao concluido. Nenhum segredo foi exibido.');
  process.exitCode = 1;
} finally { if (pool) await pool.end(); }
