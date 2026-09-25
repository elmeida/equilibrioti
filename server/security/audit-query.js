import { z } from 'zod';
import { AUDIT_ACTIONS } from './audit.js';

export const auditQuery = z.object({
  before: z.string().regex(/^[1-9]\d{0,18}$/).refine(value => BigInt(value) <= 9223372036854775807n).optional(),
  empresa_id: z.coerce.number().int().positive().max(2147483647).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.enum(AUDIT_ACTIONS).optional(),
  outcome: z.enum(['success', 'failed', 'authorized']).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  request_id: z.string().uuid().optional(),
}).refine(value => !value.from || !value.to || Date.parse(value.from) < Date.parse(value.to), { path: ['to'], message: 'Periodo invalido.' });

export function auditPage(rows, limit) {
  const page = rows.slice(0, limit);
  return { rows: page, next: rows.length > limit ? String(page.at(-1).id) : null };
}
