import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import type { BlockState } from '../hooks/dashboardState';

export function RemoteBlock({ state, title, retry, empty = false, children }: {
  state?: BlockState; title: string; retry?: () => void; empty?: boolean; children: ReactNode;
}) {
  if (!state) return <>{children}</>;
  if (state.status === 'loading' || state.status === 'idle') return <div className="remote-state" role="status" aria-label={title}>Carregando...</div>;
  if (state.status === 'error') return <div className="remote-state remote-error" role="alert" aria-label={title}>
    <span>Consulta indisponível.</span>
    {retry && <button className="icon-button" title={`Tentar novamente: ${title}`} aria-label={`Tentar novamente: ${title}`} onClick={retry}><RefreshCw size={16} /></button>}
  </div>;
  if (empty) return <div className="remote-state" role="status" aria-label={title}>Sem registros neste recorte.</div>;
  return <>{children}</>;
}
