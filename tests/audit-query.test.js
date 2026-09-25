import { describe, expect, it } from 'vitest';
import { auditQuery, auditPage } from '../server/security/audit-query.js';

describe('consulta de auditoria', () => {
  it('aceita filtros limitados e periodo com fuso explicito', () => {
    expect(auditQuery.parse({ action: 'company.logo_upload', outcome: 'success', empresa_id: '2', from: '2026-09-17T00:00:00-03:00', to: '2026-09-18T00:00:00-03:00' }).empresa_id).toBe(2);
  });
  it.each([{ before: '9223372036854775808' }, { before: '-1' }, { empresa_id: 0 }, { limit: 101 },
    { action: 'anything' }, { outcome: 'downloaded' }, { request_id: 'invalid' }, { from: '2026-09-17' },
    { from: '2026-09-18T00:00:00Z', to: '2026-09-17T00:00:00Z' }])('recusa filtros invalidos: %j', value => {
    expect(() => auditQuery.parse(value)).toThrow();
  });
  it('so devolve proximo cursor quando ha outra linha', () => {
    expect(auditPage([{ id: '9' }, { id: '8' }], 2)).toEqual({ rows: [{ id: '9' }, { id: '8' }], next: null });
    expect(auditPage([{ id: '9' }, { id: '8' }, { id: '7' }], 2)).toEqual({ rows: [{ id: '9' }, { id: '8' }], next: '8' });
    expect(auditPage([], 2)).toEqual({ rows: [], next: null });
  });
});
