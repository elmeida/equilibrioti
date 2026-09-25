import { Fragment, useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Eye, RefreshCw, Search, X } from 'lucide-react';
import { adminGetAudit, type AuditEvent, type AuditFilters } from '../services/api';

const actions: Record<string, string> = {
  'company.create': 'Empresa criada', 'company.update': 'Empresa alterada', 'company.logo_upload': 'Logo enviada',
  'user.create': 'Usuário criado', 'user.update': 'Usuário alterado', 'user.password_reset': 'Senha redefinida',
  'user.password_change': 'Senha alterada', 'session.logout': 'Saída da sessão', 'admin.tenant_access': 'Acesso administrativo',
  'financial.export': 'Solicitação de exportação', 'credentials.reencrypt': 'Credenciais recifradas',
};
const outcomes = { success: 'Concluído', failed: 'Falhou', authorized: 'Autorizado' };
const empty = { empresa: '', action: '', outcome: '', start: '', end: '', request: '' };
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));

export function AdminAudit() {
  const [draft, setDraft] = useState(empty);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [result, setResult] = useState<{ rows: AuditEvent[]; next: string | null }>({ rows: [], next: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const before = cursors[cursors.length - 1];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setExpanded(null); setResult({ rows: [], next: null });
    adminGetAudit(filters, before, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult(data);
    }).catch(err => {
      if (!controller.signal.aborted && err.name !== 'AbortError') setError('Não foi possível consultar a auditoria.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, before, refresh]);

  function apply(event: FormEvent) {
    event.preventDefault();
    if (draft.start && draft.end && draft.start > draft.end) { setValidation('A data final deve ser igual ou posterior à inicial.'); return; }
    const until = draft.end ? new Date(`${draft.end}T00:00:00`) : null;
    const since = draft.start ? new Date(`${draft.start}T00:00:00`) : null;
    if (until) until.setDate(until.getDate() + 1);
    if ((until && !Number.isFinite(until.getTime())) || (since && !Number.isFinite(since.getTime()))) { setValidation('Informe datas válidas.'); return; }
    setValidation(''); setCursors([undefined]);
    setFilters({ empresa_id: draft.empresa ? Number(draft.empresa) : undefined, action: draft.action || undefined,
      outcome: draft.outcome || undefined, request_id: draft.request.trim() || undefined,
      from: since?.toISOString(), to: until?.toISOString() });
  }

  return <section className="tab-panel audit-panel" aria-labelledby="audit-heading">
    <div className="audit-heading"><h2 id="audit-heading">Auditoria</h2>
      <button className="icon-button" title="Atualizar auditoria" aria-label="Atualizar auditoria" disabled={loading} onClick={() => { setCursors([undefined]); setRefresh(value => value + 1); }}><RefreshCw size={18} /></button>
    </div>
    <form className="audit-filters" onSubmit={apply}>
      <label>Empresa (ID)<input type="number" min="1" max="2147483647" step="1" value={draft.empresa} onChange={e => setDraft({ ...draft, empresa: e.target.value })} /></label>
      <label>Ação<select aria-label="Ação" value={draft.action} onChange={e => setDraft({ ...draft, action: e.target.value })}><option value="">Todas</option>{Object.entries(actions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Resultado<select aria-label="Resultado" value={draft.outcome} onChange={e => setDraft({ ...draft, outcome: e.target.value })}><option value="">Todos</option>{Object.entries(outcomes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>De<input type="date" value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })} /></label>
      <label>Até<input type="date" value={draft.end} onChange={e => setDraft({ ...draft, end: e.target.value })} /></label>
      <label>Correlação<input type="text" maxLength={36} pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" value={draft.request} onChange={e => setDraft({ ...draft, request: e.target.value })} /></label>
      <div className="audit-filter-actions"><button className="ghost-button apply-button" type="submit"><Search size={16} /> Filtrar</button>
        <button className="icon-button" type="button" title="Limpar filtros" aria-label="Limpar filtros" onClick={() => { setDraft(empty); setFilters({}); setCursors([undefined]); setValidation(''); }}><X size={18} /></button></div>
    </form>
    {validation && <div className="error-box" role="alert">{validation}</div>}
    {error ? <div className="error-box" role="alert">{error} <button className="ghost-button" onClick={() => setRefresh(value => value + 1)}>Tentar novamente</button></div> :
      <div className="audit-table-wrap" tabIndex={0} role="region" aria-label="Eventos de auditoria" aria-busy={loading}>
        <table className="audit-table"><thead><tr><th>Data e hora</th><th>Ação</th><th>Responsável</th><th>Empresa</th><th>Resultado</th><th>Detalhes</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} role="status">Carregando eventos...</td></tr> : result.rows.length === 0 ? <tr><td colSpan={6}>Nenhum evento encontrado.</td></tr> : result.rows.map(row => <Fragment key={row.id}>
            <tr><td><time dateTime={row.occurred_at}>{date(row.occurred_at)}</time></td><td>{actions[row.action] || row.action}</td>
              <td>{row.actor_kind === 'maintenance' ? 'Manutenção' : `Usuário #${row.actor_id}`}</td><td>{row.empresa_id ? `#${row.empresa_id}` : 'Plataforma'}</td>
              <td><span className={`audit-outcome ${row.outcome}`}>{outcomes[row.outcome]}</span></td><td><button className="icon-button" aria-expanded={expanded === row.id} aria-controls={`audit-${row.id}`} aria-label={`Detalhes do evento ${row.id}`} title="Detalhes do evento" onClick={() => setExpanded(expanded === row.id ? null : row.id)}><Eye size={16} /></button></td></tr>
            {expanded === row.id && <tr id={`audit-${row.id}`} className="audit-detail"><td colSpan={6}><dl><div><dt>Evento</dt><dd>{row.id}</dd></div><div><dt>Registro afetado</dt><dd>{row.resource_id ?? 'Não informado'}</dd></div><div><dt>Correlação</dt><dd>{row.request_id}</dd></div></dl></td></tr>}
          </Fragment>)}</tbody></table>
      </div>}
    <div className="audit-pagination"><span aria-live="polite">Página {cursors.length}{!loading && !error ? ` · ${result.rows.length} eventos` : ''}</span>
      <button className="icon-button" aria-label="Página anterior" title="Página anterior" disabled={loading || cursors.length === 1} onClick={() => setCursors(value => value.slice(0, -1))}><ChevronLeft size={18} /></button>
      <button className="icon-button" aria-label="Próxima página" title="Próxima página" disabled={loading || !!error || !result.next} onClick={() => { if (result.next) setCursors(value => [...value, result.next!]); }}><ChevronRight size={18} /></button>
    </div>
  </section>;
}
