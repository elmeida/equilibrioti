import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Eraser, Search } from 'lucide-react';
import { apiGet, Filters } from '../services/api';
import { currentPeriod, dateFilterError } from '../../server/utils/dateFilters.js';

type Option = { value: string; total: number };

const multiMap = [
  ['clientes', 'Cliente/Fornecedor', 'clientes'],
  ['centrosCusto', 'Centro de custo', 'centros-custo'],
  ['naturezas', 'Natureza financeira', 'naturezas'],
  ['tiposDocumento', 'Tipo de documento', 'tipos-documento'],
  ['contas', 'Conta', 'contas'],
  ['origens', 'Origem', 'origens'],
] as const;

export function FilterPanel({ filters, appliedFilters, onChange, onApply, onClear, activeFilters }: {
  filters: Filters;
  appliedFilters: Filters;
  onChange: (filters: Filters) => void;
  onApply: () => void;
  onClear: () => void;
  activeFilters: number;
}) {
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [search, setSearch] = useState<Record<string, string>>({});
  const [openKey, setOpenKey] = useState<string>('');
  const dateError = dateFilterError(filters);
  const dateErrorId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const apply = () => {
    const inputs = panel.current?.querySelectorAll<HTMLInputElement>('input[type="date"]');
    if (!dateError && inputs && [...inputs].every(input => input.reportValidity())) onApply();
  };

  useEffect(() => {
    const controller = new AbortController();
    const loadStatic = async () => {
      const [statusFin, statusBaixa, empresas] = await Promise.all([
        apiGet<Option[]>('/api/titulos/filtros/status', undefined, undefined, { signal: controller.signal }),
        apiGet<Option[]>('/api/titulos/filtros/status-baixa', undefined, undefined, { signal: controller.signal }),
        apiGet<Option[]>('/api/titulos/filtros/empresas', undefined, undefined, { signal: controller.signal }),
      ]);
      if (!controller.signal.aborted) setOptions((old) => ({ ...old, statusFin, statusBaixa, empresas }));
    };
    loadStatic().catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timers = multiMap.map(([key, , endpoint]) => {
      return window.setTimeout(async () => {
        const q = search[key] || '';
        try {
          const values = await apiGet<Option[]>(`/api/titulos/filtros/${endpoint}`, undefined, q ? { q } : undefined, { signal: controller.signal });
          if (!controller.signal.aborted) setOptions((old) => ({ ...old, [key]: values }));
        } catch {
          if (!controller.signal.aborted) setOptions(old => ({ ...old, [key]: [] }));
        }
      }, 500);
    });
    return () => { timers.forEach(window.clearTimeout); controller.abort(); };
  }, [search]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const setPeriod = (preset: 'year' | 'month') => {
    onChange({ ...filters, ...currentPeriod(preset) });
  };

  return (
    <div className="filters-card" ref={panel}>
      <div className="filters-title">
        <div>
          <strong>Filtros globais</strong>
          <span>
            {activeFilters ? `${activeFilters} aplicados` : 'Sem filtros aplicados'}
            {JSON.stringify(filters) !== JSON.stringify(appliedFilters) ? ' · alterações pendentes' : ''}
          </span>
        </div>
        <div className="filter-actions">
          <button className="ghost-button period-shortcut" onClick={() => setPeriod('year')}>Este ano</button>
          <button className="ghost-button period-shortcut" onClick={() => setPeriod('month')}>Este mês</button>
          <button className="ghost-button apply-button" disabled={!!dateError} onClick={apply}><Check size={16} /> Aplicar filtros</button>
          <button className="ghost-button" onClick={onClear}><Eraser size={16} /> Limpar filtros</button>
        </div>
      </div>

      {dateError && <p className="error-box" id={dateErrorId} role="alert">{dateError}</p>}
      <div className="filters-grid">
        <label>
          Campo de data
          <select value={filters.dateField} onChange={(e) => set('dateField', e.target.value as Filters['dateField'])}>
            <option value="vencimento">Data de vencimento</option>
            <option value="emissao">Data de emissão</option>
            <option value="baixa">Data de baixa</option>
            <option value="criacao">Data de criação</option>
          </select>
        </label>
        <label>Data inicial<input type="date" min="0001-01-01" max="9999-12-31" aria-invalid={!!dateError} aria-describedby={dateError ? dateErrorId : undefined} value={filters.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
        <label>Data final<input type="date" min="0001-01-01" max="9999-12-30" aria-invalid={!!dateError} aria-describedby={dateError ? dateErrorId : undefined} value={filters.endDate} onChange={(e) => set('endDate', e.target.value)} /></label>
        <label>
          Empresa
          <select value={filters.coligada} onChange={(e) => set('coligada', e.target.value)}>
            <option>Todas</option>
            {(options.empresas || []).map((option) => <option key={option.value}>{option.value}</option>)}
          </select>
        </label>
        <label>
          Tipo financeiro
          <select value={filters.tipo} onChange={(e) => set('tipo', e.target.value)}>
            <option>Todos</option>
            <option>A Pagar</option>
            <option>A Receber</option>
          </select>
        </label>
        <label>
          Status financeiro
          <select value={filters.statusFin} onChange={(e) => set('statusFin', e.target.value)}>
            <option value="">Todos</option>
            {(options.statusFin || []).map((option) => <option key={option.value}>{option.value}</option>)}
          </select>
        </label>
        <label>
          Status de baixa
          <select value={filters.statusBaixa} onChange={(e) => set('statusBaixa', e.target.value)}>
            <option value="">Todos</option>
            {(options.statusBaixa || []).map((option) => <option key={option.value}>{option.value}</option>)}
          </select>
        </label>
        <label className="search-field">
          Busca textual
          <span><Search size={16} /><input value={filters.search || ''} onChange={(e) => set('search', e.target.value)} placeholder="Documento, cliente, histórico..." /></span>
        </label>
      </div>

      <div className="multi-filter-grid">
        {multiMap.map(([key, label]) => (
          <MultiSelect
            key={key}
            id={key}
            label={label}
            open={openKey === key}
            onOpen={() => setOpenKey(openKey === key ? '' : key)}
            selected={filters[key]}
            options={options[key] || []}
            search={search[key] || ''}
            onSearch={(value) => setSearch((old) => ({ ...old, [key]: value }))}
            onChange={(value) => set(key, value as any)}
          />
        ))}
      </div>
    </div>
  );
}

function MultiSelect({ id, label, selected, options, search, open, onOpen, onSearch, onChange }: {
  id: string;
  label: string;
  selected: string[];
  options: Option[];
  search: string;
  open: boolean;
  onOpen: () => void;
  onSearch: (value: string) => void;
  onChange: (value: string[]) => void;
}) {
  const visibleOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const ranked = options
      .filter((option) => !q || option.value.toLowerCase().includes(q))
      .sort((a, b) => {
        if (!q) return Number(b.total || 0) - Number(a.total || 0);
        const ai = a.value.toLowerCase().indexOf(q);
        const bi = b.value.toLowerCase().indexOf(q);
        return ai - bi || a.value.localeCompare(b.value);
      });
    return ranked;
  }, [options, search]);
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);

  return (
    <div className={`multi-select ${open ? 'open' : ''}`} data-filter={id}>
      <button type="button" className="multi-summary" onClick={onOpen}>{label}<span>{selected.length || 'Todos'}</span></button>
      {open && (
        <div className="multi-menu">
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={`Pesquisar ${label.toLowerCase()}`} autoFocus />
          <div className="option-list">
            {selected.length > 0 && <button onClick={() => onChange([])}>Limpar seleção</button>}
            {visibleOptions.map((option) => (
              <label key={option.value}>
                <input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)} />
                <span>{option.value}</span>
              </label>
            ))}
            {visibleOptions.length === 0 && <em>Nenhum resultado encontrado.</em>}
          </div>
        </div>
      )}
    </div>
  );
}
