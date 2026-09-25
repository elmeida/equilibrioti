import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import sql from 'mssql';
import sharp from 'sharp';
import { assertLocalTarget, localDir, poolConfig } from './lib/local-environment.mjs';
import { assertExistingDatabase, localSql, migrationSql, runtimeGrants } from './lib/local-postgres.mjs';

const schema = `equilibrio_test_${randomBytes(8).toString('hex')}`;
const checks = [];
let created = false, pool, closeAuthPool, cleaned = false, rmAttempts = 0;
let logoTestDirectory;
const originalConnect = sql.ConnectionPool.prototype.connect;
const verify = async (name, fn) => { await fn(); checks.push(name); console.log(`OK: ${name}`); };

try {
  assertLocalTarget(process.env, 'equilibrio_app');
  assertExistingDatabase();
  // CREATE without IF NOT EXISTS establishes ownership of this test namespace.
  localSql(`CREATE SCHEMA ${schema} AUTHORIZATION equilibrio_auth_user;`);
  created = true;
  process.env.AUTH_DB_SCHEMA = schema;
  logoTestDirectory = await fs.mkdtemp(path.join(localDir, 'test-logos-'));
  process.env.LOGO_STORAGE_DIR = logoTestDirectory;
  localSql(await migrationSql(schema));
  localSql(runtimeGrants(schema));
  pool = new pg.Pool(poolConfig(process.env));
  sql.ConnectionPool.prototype.connect = async function () { rmAttempts++; throw new Error('RM proibido no teste local.'); };
  ({ closeAuthPool } = await import('../server/db/authPool.js'));
  const { createApp } = await import('../server/app.js');
  const { decryptCredential } = await import('../server/security/credentials.js');
  const app = createApp();
  const password = randomBytes(24).toString('hex');
  const newPassword = randomBytes(24).toString('hex');
  const adminEmail = 'admin@integration.invalid', userEmail = 'client@integration.invalid';
  const login = async (email, value = password) => {
    const response = await request(app).post('/api/auth/login').send({ email, password: value }).expect(200);
    assert.ok(response.body.token); return response.body.token;
  };
  const auth = token => `Bearer ${token}`;
  let admin, client, companyA, companyB, user;
  const company = name => ({ nome: name, db_host: 'blocked.integration.invalid', db_port: 1433, db_database: 'isolated_test', db_user: 'test', db_password: password });

  await verify('migrations reais idempotentes', async () => {
    const before = await pool.query(`SELECT version,applied_at FROM ${schema}.schema_migrations ORDER BY version`);
    localSql(await migrationSql(schema));
    const after = await pool.query(`SELECT version,applied_at FROM ${schema}.schema_migrations ORDER BY version`);
    assert.deepEqual(before.rows, after.rows); assert.equal(after.rowCount, 3);
  });
  await verify('runtime sem superusuario, criacao ou propriedade', async () => {
    const result = await pool.query(`SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,
      has_database_privilege(current_user,current_database(),'CREATE') AS db_create,
      has_schema_privilege(current_user,$1,'CREATE') AS schema_create,
      has_schema_privilege(current_user,'public','CREATE') AS public_create
      FROM pg_roles WHERE rolname=current_user`, [schema]);
    assert.ok(Object.values(result.rows[0]).every(value => value === false));
  });
  await verify('login real e resposta sem hash de senha', async () => {
    await pool.query(`INSERT INTO ${schema}.usuarios(nome,email,senha_hash,perfil) VALUES ('Teste',$1,$2,'admin')`, [adminEmail, await bcrypt.hash(password, 12)]);
    admin = await login(adminEmail);
    const me = await request(app).get('/api/auth/me').set('Authorization', auth(admin)).expect(200);
    assert.equal(me.body.user.perfil, 'admin'); assert.equal(me.body.user.senha_hash, undefined);
  });
  await verify('empresas com senha cifrada e auditoria persistida', async () => {
    companyA = (await request(app).post('/api/admin/empresas').set('Authorization', auth(admin)).send(company('Integracao A')).expect(200)).body;
    companyB = (await request(app).post('/api/admin/empresas').set('Authorization', auth(admin)).send(company('Integracao B')).expect(200)).body;
    assert.equal(companyA.db_password, undefined);
    const stored = (await pool.query(`SELECT db_password FROM ${schema}.empresas WHERE id=$1`, [companyA.id])).rows[0].db_password;
    assert.notEqual(stored, password); assert.equal(decryptCredential(stored, companyA.id), password);
    assert.throws(() => decryptCredential(stored, companyB.id));
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${schema}.audit_events WHERE action='company.create' AND outcome='success'`)).rows[0].n, 2);
  });
  await verify('cliente vinculado somente a sua empresa', async () => {
    user = (await request(app).post('/api/admin/usuarios').set('Authorization', auth(admin)).send({ nome: 'Cliente teste', email: userEmail, senha: password, perfil: 'cliente', empresa_id: companyA.id }).expect(200)).body;
    client = await login(userEmail);
    await request(app).get('/api/admin/empresas').set('Authorization', auth(client)).expect(403);
    await request(app).get('/api/admin/auditoria').set('Authorization', auth(client)).expect(403);
    await request(app).post('/api/titulos/grafico-filtro').set('Authorization', auth(client)).set('X-Empresa-Id', String(companyB.id)).send({}).expect(403);
    await request(app).post('/api/titulos/grafico-filtro').set('Authorization', auth(client)).send({}).expect(200);
  });
  await verify('acesso administrativo exige selecao e gera auditoria', async () => {
    await request(app).post('/api/titulos/grafico-filtro').set('Authorization', auth(admin)).send({}).expect(400);
    await request(app).post('/api/titulos/grafico-filtro').set('Authorization', auth(admin)).set('X-Empresa-Id', String(companyB.id)).send({}).expect(200);
    const result = await pool.query(`SELECT empresa_id,outcome FROM ${schema}.audit_events WHERE action='admin.tenant_access'`);
    assert.deepEqual(result.rows, [{ empresa_id: companyB.id, outcome: 'authorized' }]);
  });
  await verify('auditoria nao pode ser alterada ou apagada pelo runtime', async () => {
    for (const statement of [`UPDATE ${schema}.audit_events SET outcome='failed'`, `DELETE FROM ${schema}.audit_events`, `TRUNCATE ${schema}.audit_events`]) {
      await assert.rejects(pool.query(statement), error => error.code === '42501');
    }
  });
  await verify('falha da auditoria desfaz alteracao da empresa', async () => {
    const before = (await pool.query(`SELECT count(*)::int AS n FROM ${schema}.empresas`)).rows[0].n;
    localSql(`REVOKE INSERT ON ${schema}.audit_events FROM equilibrio_app`);
    try {
      await request(app).post('/api/admin/empresas').set('Authorization', auth(admin)).send(company('Rollback teste')).expect(500);
      assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${schema}.empresas`)).rows[0].n, before);
    } finally { localSql(`GRANT INSERT ON ${schema}.audit_events TO equilibrio_app`); }
  });
  await verify('alteracao da conexao incrementa a versao', async () => {
    await request(app).put(`/api/admin/empresas/${companyA.id}`).set('Authorization', auth(admin)).send(company('Integracao A')).expect(200);
    assert.equal((await pool.query(`SELECT connection_version FROM ${schema}.empresas WHERE id=$1`, [companyA.id])).rows[0].connection_version, 1);
  });
  await verify('troca de senha revoga sessao anterior', async () => {
    await request(app).post('/api/auth/change-password').set('Authorization', auth(client)).send({ currentPassword: password, newPassword }).expect(200);
    await request(app).get('/api/auth/me').set('Authorization', auth(client)).expect(401);
    await request(app).post('/api/auth/login').send({ email: userEmail, password }).expect(401);
    client = await login(userEmail, newPassword);
  });
  await verify('logout revoga somente o token encerrado', async () => {
    const other = await login(userEmail, newPassword);
    await request(app).post('/api/auth/logout').set('Authorization', auth(client)).expect(200);
    await request(app).get('/api/auth/me').set('Authorization', auth(client)).expect(401);
    await request(app).get('/api/auth/me').set('Authorization', auth(other)).expect(200);
    client = other;
  });
  await verify('desativacao de empresa bloqueia sessao existente', async () => {
    await request(app).put(`/api/admin/empresas/${companyA.id}`).set('Authorization', auth(admin)).send({ ...company('Integracao A'), ativo: false }).expect(200);
    await request(app).get('/api/auth/me').set('Authorization', auth(client)).expect(401);
  });
  await verify('auditoria paginada sem segredos ou dados de conexao', async () => {
    const response = await request(app).get('/api/admin/auditoria?limit=2').set('Authorization', auth(admin)).expect(200);
    assert.equal(response.body.rows.length, 2); assert.ok(response.body.next);
    const serialized = JSON.stringify(response.body);
    assert.ok(!serialized.includes(password)); assert.ok(!serialized.includes(userEmail)); assert.ok(!serialized.includes('db_host'));
    const next = await request(app).get(`/api/admin/auditoria?limit=2&before=${response.body.next}`).set('Authorization', auth(admin)).expect(200);
    assert.ok(next.body.rows.every(row => BigInt(row.id) < BigInt(response.body.next)));
  });
  await verify('nenhuma tentativa de conexao ao RM', async () => { assert.equal(rmAttempts, 0); });
  await verify('upload real publica imagem normalizada e evento de auditoria', async () => {
    const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#009977' } }).png().toBuffer();
    const response = await request(app).post('/api/admin/empresas/upload-logo').set('Authorization', auth(admin)).attach('logo', image, { filename: 'test.png', contentType: 'image/png' }).expect(200);
    await request(app).get(response.body.url).expect('Content-Type', /image\/webp/).expect(200);
    const events = await request(app).get('/api/admin/auditoria?action=company.logo_upload&outcome=success').set('Authorization', auth(admin)).expect(200);
    assert.equal(events.body.rows.length, 1); assert.equal(events.body.next, null);
    assert.equal(events.body.rows[0].actor_kind, 'user');
    await request(app).post('/api/admin/empresas/upload-logo').set('Authorization', auth(admin)).attach('logo', Buffer.from('<svg>invalid</svg>'), { filename: 'forged.png', contentType: 'image/png' }).expect(400);
    assert.equal((await fs.readdir(logoTestDirectory)).length, 1);
  });
  await verify('filtros combinados de auditoria com PostgreSQL real', async () => {
    const selected = await request(app).get(`/api/admin/auditoria?empresa_id=${companyA.id}&action=company.create&outcome=success&from=2020-01-01T00:00:00Z&to=2099-01-01T00:00:00Z`).set('Authorization', auth(admin)).expect(200);
    assert.equal(selected.body.rows.length, 1); assert.equal(selected.body.next, null);
    const correlated = await request(app).get(`/api/admin/auditoria?request_id=${selected.body.rows[0].request_id}`).set('Authorization', auth(admin)).expect(200);
    assert.equal(correlated.body.rows.length, 1);
    await request(app).get('/api/admin/auditoria?before=9223372036854775808').set('Authorization', auth(admin)).expect(400);
  });
} catch {
  console.error(`Validacao integrada falhou apos ${checks.length} verificacoes. Dados e segredos omitidos.`);
  process.exitCode = 1;
} finally {
  sql.ConnectionPool.prototype.connect = originalConnect;
  if (closeAuthPool) await closeAuthPool();
  if (pool) await pool.end();
  if (logoTestDirectory && path.dirname(logoTestDirectory) === localDir && path.basename(logoTestDirectory).startsWith('test-logos-')) await fs.rm(logoTestDirectory, { recursive: true, force: true });
  if (created) {
    // Only the random schema successfully created by this process is removed.
    try { localSql(`DROP SCHEMA ${schema} CASCADE`); cleaned = true; }
    catch { console.error('Limpeza do schema temporario pendente. Consulte a evidencia local.'); process.exitCode = 1; }
  }
  await fs.writeFile(path.join(localDir, 'integration-result.json'), JSON.stringify({ at: new Date().toISOString(), ok: !process.exitCode, checks, schema, cleaned, rmAttempts }, null, 2), { mode: 0o600 });
}
