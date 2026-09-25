import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Charts } from '../../src/components/Charts';
import { DataTables, type TableMode } from '../../src/components/DataTables';
import { defaultFilters } from '../../src/services/api';
import '../../src/styles.css';

const rows = Array.from({ length: 50 }, (_, index) => ({
  nome: `Registro de teste ${index + 1} com descricao extensa para conferir a largura`,
  quantidade: index + 1, totalRateio: 9876543.21 - index * 100,
  totalBaixa: 1000000, totalAberto: 5000000, totalVencido: 4000000, ticketMedio: 10000, percentual: 0.02,
}));
const data = {
  evolucaoVencimento: [{ mes: '2026-08', serie: 'A Pagar', valor: 100 }, { mes: '2026-09', serie: 'A Pagar', valor: 250 }],
  pagarReceber: [{ nome: 'A Pagar', valor: 250, quantidade: 5 }, { nome: 'A Receber', valor: 100, quantidade: 2 }],
  matrizCalor: [{ ano: 2026, mes: 8, valor: 100 }, { ano: 2026, mes: 9, valor: -20 }],
  contas: [{ nome: 'Conta de teste', valor: 250, quantidade: 5 }],
};

function Fixture() {
  const [mode, setMode] = useState<TableMode>('rankings');
  const [theme, setTheme] = useState('light');
  const [visible, setVisible] = useState(true);
  return <div className={`app ${theme}`}>
    <header style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <strong>Equilibrio BI / QA local / dados sinteticos</strong>
      <label>Visao<select value={mode} onChange={event => setMode(event.target.value as TableMode)}>
        <option value="rankings">Rankings</option><option value="analitica">Tabela analitica</option><option value="vencidos">Vencidos</option><option value="inconsistencias">Inconsistencias</option>
      </select></label>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Alternar tema QA</button>
      <button onClick={() => setVisible(value => !value)}>Alternar conteudo QA</button>
    </header>
    <main style={{ padding: 16, display: 'grid', gap: 24 }}>
      {visible && <>
        <DataTables mode={mode} filters={defaultFilters} rankings={{ clientes: rows, centros: rows, naturezas: rows }} chartRankings={data}
          vencidos={[{ EMPRESA: 'QA', CLIFOR: 'Registro sintetico', NUMERODOC: 'QA-1', VLRRATEIO: 150 }]}
          inconsistencias={[{ tipo: 'Teste visual', severidade: 'Atencao', explicacao: 'Dado sintetico', EMPRESA: 'QA' }]} />
        <Charts visible={['evolucaoVencimento', 'pagarReceber', 'matrizCalor']} data={data} loading={false} filters={defaultFilters} onFilter={() => {}} onClearFilter={() => {}} />
      </>}
    </main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>);
