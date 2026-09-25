import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import type { KpiKey } from './KpiCards';
import type { Filters } from '../services/api';
import { kpiExplanations, referenceDescriptions } from '../utils/kpiExplanations';
import { appliedPeriodLabel, civilLabel, comparisonWarnings, dateFieldLabels, type ComparisonPresentation } from '../utils/comparisonPresentation';

export function KpiHelp({ metric, title, unit, filters, comparison, updatedAt, onClose }: {
  metric: KpiKey; title: string; unit: string; filters: Filters;
  comparison: ComparisonPresentation; updatedAt?: number; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const heading = useId();
  const explanation = kpiExplanations[metric];
  useEffect(() => {
    const element = dialog.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    return () => { element.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={dialog} className="kpi-help-dialog" aria-labelledby={heading} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => {
    if (event.key !== 'Tab' || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.shiftKey && document.activeElement === closeButton.current) { event.preventDefault(); body.current?.focus(); }
    else if (!event.shiftKey && document.activeElement === body.current) { event.preventDefault(); closeButton.current?.focus(); }
  }}>
    <header><h2 id={heading}>{title}</h2><button ref={closeButton} className="icon-button" aria-label="Fechar explicação" title="Fechar explicação" onClick={onClose} autoFocus><X size={18} /></button></header>
    <div ref={body} className="kpi-help-body" tabIndex={0} role="region" aria-label="Detalhes do indicador">
    <section><h3>Como é calculado</h3><p>{explanation.formula}</p><p className="kpi-help-muted">Campos: {explanation.fields}</p></section>
    <dl>
      <div><dt>Unidade</dt><dd>{unit}</dd></div>
      <div><dt>Recorte aplicado</dt><dd>{appliedPeriodLabel(filters)}{comparison.plan ? ` · ${comparison.plan.currentDays} dias` : ''}</dd></div>
      <div><dt>Campo de data</dt><dd>{dateFieldLabels[filters.dateField]}</dd></div>
      <div><dt>Referência do cálculo</dt><dd>{referenceDescriptions[explanation.reference]}</dd></div>
      <div><dt>Fonte</dt><dd>Views financeiras do RM configuradas para esta empresa. Granularidade: linha retornada pela view.</dd></div>
      <div><dt>Regra documentada</dt><dd>backend-linhas-v1. Conciliação com o RM pendente.</dd></div>
      <div><dt>Consulta do bloco</dt><dd>{updatedAt ? `${new Date(updatedAt).toLocaleString('pt-BR')} (horário deste navegador)` : 'Horário não informado.'}</dd></div>
      <div><dt>Atualização na origem</dt><dd>Não informada. Conclusão da consulta não comprova atualização do RM.</dd></div>
    </dl>
    <section><h3>Limites da leitura</h3><p>{explanation.limit}</p><p>Nulos da origem podem ser ignorados nas agregações; uma consulta bem-sucedida não comprova completude dos dados.</p></section>
    <section className="kpi-help-comparison"><h3>{comparison.status === 'disabled' ? 'Sem comparação' : 'Comparação indisponível'}</h3>
      {comparison.plan?.previous && <p>Referência planejada: {civilLabel(comparison.plan.previous.start)} a {civilLabel(comparison.plan.previous.end)} · {comparison.plan.previousDays} dias.</p>}
      <p>{comparison.reason}</p>
      {comparisonWarnings(comparison.plan).map(warning => <p key={warning}>{warning}</p>)}
      {(explanation.reference === 'status' || explanation.reference === 'today') && <p>O histórico de status e saldos ainda não foi reconstruído; o estado atual não certifica uma posição passada.</p>}
    </section>
    </div>
  </dialog>;
}
