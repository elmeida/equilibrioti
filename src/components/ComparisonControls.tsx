import type { ComparisonBasis, ComparisonMode } from '../../server/analytics/comparisons.js';
import type { Filters } from '../services/api';
import { appliedPeriodLabel, civilLabel, comparisonWarnings, dateFieldLabels, type ComparisonPresentation } from '../utils/comparisonPresentation';

export function ComparisonControls({ filters, comparison, onMode, onBasis }: {
  filters: Filters; comparison: ComparisonPresentation;
  onMode: (value: ComparisonMode) => void; onBasis: (value: ComparisonBasis) => void;
}) {
  return <section className="comparison-controls" aria-label="Comparação dos indicadores">
    <div className="comparison-options">
      <label>Comparar com<select aria-label="Comparar com" value={comparison.mode} onChange={event => onMode(event.target.value as ComparisonMode)}>
        <option value="none">Sem comparação</option><option value="previous">Período anterior</option><option value="year">Ano anterior</option>
      </select></label>
      <label>Recorte comparativo<select aria-label="Recorte comparativo" value={comparison.basis} disabled={comparison.mode === 'none'} onChange={event => onBasis(event.target.value as ComparisonBasis)}>
        <option value="range">Intervalo livre</option><option value="month">Mensal desde o dia 1</option>
      </select></label>
    </div>
    <div className="comparison-periods">
      <p><b>Atual:</b> {appliedPeriodLabel(filters)}{comparison.plan ? ` · ${comparison.plan.currentDays} dias` : ''}</p>
      <p><b>Campo de data:</b> {dateFieldLabels[filters.dateField]}</p>
      {comparison.plan?.previous && <p><b>Referência planejada:</b> {civilLabel(comparison.plan.previous.start)} a {civilLabel(comparison.plan.previous.end)} · {comparison.plan.previousDays} dias</p>}
    </div>
    <div className="comparison-notice" role="status">
      <span>{comparison.status === 'disabled' ? 'Sem comparação.' : `Comparação indisponível. ${comparison.reason}`}</span>
      {comparisonWarnings(comparison.plan).map(warning => <p key={warning}>{warning}</p>)}
    </div>
  </section>;
}
