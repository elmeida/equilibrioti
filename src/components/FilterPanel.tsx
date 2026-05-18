import { useEffect, useMemo, useState } from 'react';
import { Check, Eraser, Search } from 'lucide-react';
import { apiGet, Filters } from '../services/api';

type Option = { value: string; total: number };

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

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

  useEffect(() => {
    const loadStatic = async () => {
      const [statusFin, statusBaixa, empresas] = await Promise.all([
        apiGet<Option[]>('/api/titulos/filtros/status'),
        apiGet<Option[]>('/api/titulos/filtros/status-baixa'),
        apiGet<Option[]>('/api/titulos/filtros/empresas'),
      ]);
      setOptions((old) => ({ ...old, statusFin, statusBaixa, empresas }));
    };
    loadStatic().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const searchSnapshot = { ...search };
    const timers = multiMap.map(([key, , endpoint]) => {
      return window.setTimeout(async () => {
        const q = searchSnapshot[key] || '';
        const values = await apiGet<Option[]>(`/api/titulos/filtros/${endpoint}`, undefined, q ? { q } : undefined);
        if (!cancelled) setOptions((old) => ({ ...old, [key]: values }));
      }, 500);
    });
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
  }, [search]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const setPeriod = (preset: 'year' | 'month') => {
    const today = new Date();
    const start = preset === 'year'
      ? new Date(today.getFullYear(), 0, 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    const periodEnd = preset === 'year'
      ? new Date(today.getFullYear(), 11, 31)
      : new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const end = periodEnd > today ? today : periodEnd;
    onChange({
      ...filters,
      startDate: formatInputDate(start),
      endDate: formatInputDate(end),
    });
  };

  return (
    <div className="filters-card">
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
          <button className="ghost-button apply-button" onClick={onApply}><Check size={16} /> Aplicar filtros</button>
          <button className="ghost-button" onClick={onClear}><Eraser size={16} /> Limpar filtros</button>
        </div>
      </div>

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
        <label>Data inicial<input type="date" value={filters.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
        <label>Data final<input type="date" value={filters.endDate} onChange={(e) => set('endDate', e.target.value)} /></label>
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

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    const q = normalizeSearch(search.trim());
    const ranked = options
      .filter((option) => !q || normalizeSearch(option.value).includes(q))
      .sort((a, b) => {
        if (!q) return a.value.localeCompare(b.value, 'pt-BR');
        const av = normalizeSearch(a.value);
        const bv = normalizeSearch(b.value);
        const ai = av.indexOf(q);
        const bi = bv.indexOf(q);
        const aStarts = av.startsWith(q) ? 0 : 1;
        const bStarts = bv.startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return ai - bi || a.value.localeCompare(b.value);
      });
    return ranked;
  }, [options, search]);
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  const visibleValues = visibleOptions.map((option) => option.value);
  const allVisibleSelected = visibleValues.length > 0 && visibleValues.every((value) => selected.includes(value));
  const selectVisible = () => {
    const next = Array.from(new Set([...selected, ...visibleValues]));
    onChange(next);
  };
  const clearSelection = () => onChange([]);

  return (
    <div className={`multi-select ${open ? 'open' : ''}`} data-filter={id}>
      <button type="button" className="multi-summary" onClick={onOpen}>{label}<span>{selected.length || 'Todos'}</span></button>
      {open && (
        <div className="multi-menu">
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={`Pesquisar ${label.toLowerCase()}`} autoFocus />
          <div className="multi-bulk-actions">
            <button type="button" onClick={selectVisible} disabled={visibleOptions.length === 0 || allVisibleSelected}>
              Selecionar todos
            </button>
            <button type="button" onClick={clearSelection} disabled={selected.length === 0}>
              Remover seleção
            </button>
          </div>
          <div className="option-list">
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
