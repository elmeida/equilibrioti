import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { localDir, readLocalEnvironment } from './lib/local-environment.mjs';

const base = 'http://127.0.0.1:5175';
let token;
async function call(endpoint, options = {}) {
  return fetch(`${base}${endpoint}`, { ...options, signal: AbortSignal.timeout(20000) });
}
try {
  await readLocalEnvironment();
  const health = await call('/api/health');
  assert.equal((await health.json()).service, 'titulos-financeiros');
  const credentials = JSON.parse(await fs.readFile(path.join(localDir, 'admin.json'), 'utf8'));
  const login = await call('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) });
  assert.equal(login.status, 200); token = (await login.json()).token;
  assert.ok(token);
  const headers = { Authorization: `Bearer ${token}` };
  const audit = await call('/api/admin/auditoria?limit=25&action=session.logout', { headers });
  assert.equal(audit.status, 200);
  const result = await audit.json();
  assert.ok(result.rows.every(row => row.action === 'session.logout'));
  const invalid = await call('/api/admin/auditoria?before=9223372036854775808', { headers });
  assert.equal(invalid.status, 400);
  const logo = await call('/uploads/empresas/logo_servdrill.png');
  assert.equal(logo.status, 200); assert.match(logo.headers.get('content-type'), /^image\/webp/);
  assert.equal(logo.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await call('/uploads/empresas/missing.svg')).status, 404);
  console.log('Aplicacao local: login, filtros de auditoria, cursor, logo legada normalizada e bloqueio publico conferidos.');
} catch {
  console.error('Conferencia HTTP local nao concluida. Nenhuma credencial foi exibida.'); process.exitCode = 1;
} finally {
  if (token) {
    try { assert.equal((await call('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })).status, 200); }
    catch { console.error('Encerramento da sessao local de teste nao confirmado.'); process.exitCode = 1; }
  }
}
