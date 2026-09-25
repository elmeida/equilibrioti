import type { Payment, Period, TenantId, Title } from './domain';

export const demoTenants: { id: TenantId; name: string }[] = [
  { id: 'aurora', name: 'Aurora Serviços (fictícia)' },
  { id: 'horizonte', name: 'Horizonte Comércio (fictícia)' },
];
export const demoPeriod: Period = { start: '2026-09-01', end: '2026-09-17' };
export const demoCoverage: Period = { start: '2025-01-01', end: '2026-09-17' };
export const demoSource = 'Massa fictícia v1 · referência: 17/09/2026';

function payment(id: string, date: string, principalCents: number, cashCents = principalCents): Payment {
  return { id, date, principalCents, cashCents };
}
function title(tenantId: TenantId, id: string, principalCents: number, overrides: Partial<Title>): Title {
  return { tenantId, id, document: `DOC-${id}`, counterpartId: `C-${id}`, counterpart: `Contraparte ${id}`,
    coligada: 1, direction: 'receivable', issued: '2026-09-01', due: '2026-09-10', principalCents,
    allocations: [{ costCenter: 'Operações', cents: principalCents }], payments: [], ...overrides };
}

// IDs/coligadas repetidos de propósito para exercitar o contexto da empresa.
export const demoTitles: Title[] = [
  title('aurora', '001', 100_000, { counterpart: 'Cliente Alfa', issued: '2026-08-01', due: '2026-09-01',
    allocations: [{ costCenter: 'Operações', cents: 60_000 }, { costCenter: 'Comercial', cents: 40_000 }],
    payments: [payment('B1', '2026-09-05', 40_000)] }),
  title('aurora', '002', 200_000, { counterpart: 'Cliente Zeta', issued: '2026-09-02', coligada: 2,
    payments: [payment('B2', '2026-09-12', 200_000, 201_000)] }),
  title('aurora', '003', 80_000, { counterpart: 'Fornecedor Delta', direction: 'payable', due: '2026-09-15',
    payments: [payment('B3', '2026-09-14', 30_000)] }),
  title('aurora', '004', 50_000, { counterpart: 'Cliente Beta', due: '2026-09-30', coligada: 2 }),
  title('aurora', '005', 10_000, { counterpart: 'Cliente Alfa', counterpartId: 'C-001', due: '2026-09-18',
    payments: [payment('B4', '2026-09-10', 10_000), payment('E4', '2026-09-11', -10_000)] }),
  title('aurora', '006', 20_000, { counterpart: 'Fornecedor cancelado', direction: 'payable',
    issued: '2026-08-01', due: '2026-09-04', cancelledAt: '2026-09-03' }),
  title('aurora', '007', 100_000, { counterpart: 'Cliente Histórico', issued: '2025-09-01', due: '2025-09-12',
    payments: [payment('H1', '2025-09-15', 100_000)] }),
  title('aurora', '008', 120_000, { counterpart: 'Cliente Agosto', issued: '2026-08-01', due: '2026-08-10',
    payments: [payment('H2', '2026-08-12', 120_000)] }),
  title('aurora', '009', 70_000, { counterpart: 'Cliente Futuro', issued: '2026-10-01', due: '2026-10-10' }),
  title('horizonte', '001', 900_000, { counterpart: 'Cliente Litoral', due: '2026-09-08',
    payments: [payment('B1', '2026-09-05', 100_000)] }),
  title('horizonte', '002', 300_000, { counterpart: 'Fornecedor Serra', direction: 'payable',
    payments: [payment('B2', '2026-09-12', 300_000)] }),
  title('horizonte', '003', 450_000, { counterpart: 'Cliente Vale', due: '2026-09-30', coligada: 2 }),
  title('horizonte', '007', 600_000, { counterpart: 'Cliente Histórico Horizonte', issued: '2025-09-01', due: '2025-09-12',
    payments: [payment('H1', '2025-09-15', 600_000)] }),
  title('horizonte', '008', 800_000, { counterpart: 'Cliente Agosto Horizonte', issued: '2026-08-01', due: '2026-08-10',
    payments: [payment('H2', '2026-08-09', 800_000)] }),
];
