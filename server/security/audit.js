import { randomUUID } from 'node:crypto';
import { getAuthPool } from '../db/authPool.js';
import { getAuthSchemaName } from '../db/schema.js';

export const AUDIT_ACTIONS = Object.freeze(['company.create', 'company.update', 'company.logo_upload', 'user.create', 'user.update', 'user.password_reset',
  'user.password_change', 'session.logout', 'admin.tenant_access', 'financial.export', 'credentials.reencrypt']);
const actions = new Set(AUDIT_ACTIONS);
const schema = getAuthSchemaName();
const optionalId = value => value == null ? null : Number.isSafeInteger(value) && value > 0 ? value : (() => { throw new Error('Invalid audit identifier'); })();

export async function recordAudit(client, req, action, details = {}) {
  if (!actions.has(action)) throw new Error('Invalid audit action');
  const outcome = details.outcome || 'success';
  if (!['success', 'failed', 'authorized'].includes(outcome)) throw new Error('Invalid audit outcome');
  const actorKind = req.maintenance === true ? 'maintenance' : 'user';
  const actorId = optionalId(req.user?.sub);
  if (actorKind === 'user' && !actorId) throw new Error('Audit actor required');
  const requestId = req.auditRequestId || randomUUID();
  await client.query(
    `INSERT INTO ${schema}.audit_events (actor_id, actor_kind, empresa_id, action, resource_id, outcome, request_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [actorId, actorKind, optionalId(details.tenantId), action, optionalId(details.resourceId), outcome, requestId],
  );
}

export async function auditedMutation(req, action, work) {
  const client = await getAuthPool().connect();
  let released = false;
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await recordAudit(client, req, action, result);
    await client.query('COMMIT');
    return result.value;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    // Release before using the pool for the independent failure event.
    client.release();
    released = true;
    await recordAudit(getAuthPool(), req, action, { outcome: 'failed' }).catch(() => {
      console.error({ event: 'audit_unavailable', requestId: req.auditRequestId });
    });
    throw error;
  } finally { if (!released) client.release(); }
}

export function httpError(status, message) { return Object.assign(new Error(message), { status }); }
