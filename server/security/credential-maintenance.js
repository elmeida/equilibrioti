import { randomUUID } from 'node:crypto';
import { getAuthSchemaName } from '../db/schema.js';
import { credentialKeys, encryptCredential, decryptCredential, isEncryptedCredential } from './credentials.js';
import { recordAudit } from './audit.js';

export async function maintainCredentials(pool, { apply = false, env = process.env } = {}) {
  const { active } = credentialKeys(env);
  const schema = getAuthSchemaName(env.AUTH_DB_SCHEMA);
  const client = await pool.connect();
  const requestId = randomUUID();
  try {
    await client.query(apply ? 'BEGIN' : 'BEGIN READ ONLY');
    const result = await client.query(`SELECT id, db_password FROM ${schema}.empresas ORDER BY id${apply ? ' FOR UPDATE' : ''}`);
    const report = { total: result.rows.length, legacy: 0, oldKey: 0, changed: 0, requestId };
    for (const row of result.rows) {
      const encrypted = isEncryptedCredential(row.db_password);
      const plain = encrypted ? decryptCredential(row.db_password, row.id, env) : row.db_password;
      if (!encrypted) report.legacy++;
      else if (!row.db_password.startsWith(`enc:v1:${active}:`)) report.oldKey++;
      if (apply && (!encrypted || !row.db_password.startsWith(`enc:v1:${active}:`))) {
        await client.query(`UPDATE ${schema}.empresas SET db_password=$1, connection_version=connection_version+1, atualizado_em=now() WHERE id=$2`,
          [encryptCredential(plain, row.id, env), row.id]);
        await recordAudit(client, { maintenance: true, auditRequestId: requestId }, 'credentials.reencrypt', { tenantId: row.id, resourceId: row.id });
        report.changed++;
      }
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    return report;
  } catch {
    await client.query('ROLLBACK').catch(() => undefined);
    throw new Error('Verificacao/conversao de credenciais falhou. Nenhuma conversao parcial foi confirmada.');
  } finally { client.release(); }
}

export async function assertStoredCredentials(pool) {
  const report = await maintainCredentials(pool);
  if (report.legacy) throw new Error('Credenciais legadas pendentes. Prepare a conversao autorizada antes de iniciar.');
}
