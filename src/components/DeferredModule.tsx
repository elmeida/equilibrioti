import { Component, lazy, Suspense, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

function ModuleState({ name, failed = false, fullPage }: { name: string; failed?: boolean; fullPage: boolean }) {
  return <section className={`module-state${fullPage ? ' module-state-page' : ''}`} role={failed ? 'alert' : 'status'} aria-label={name} aria-busy={!failed}>
    <strong>{failed ? `Não foi possível abrir: ${name}` : `Carregando: ${name}`}</strong>
    {failed && <button className="ghost-button" onClick={() => window.location.reload()}><RefreshCw size={16} aria-hidden="true" />Recarregar página</button>}
  </section>;
}

class ModuleBoundary extends Component<{ name: string; fullPage: boolean; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <ModuleState name={this.props.name} fullPage={this.props.fullPage} failed /> : this.props.children;
  }
}

// Cache executable code only. Session-scoped props and data remain in the caller.
export function lazyModule<P extends object>(load: () => Promise<{ default: (props: P) => ReactNode }>, name: string, fullPage = false) {
  const View = lazy(load);
  return function DeferredModule(props: P) {
    return <ModuleBoundary name={name} fullPage={fullPage}>
      <Suspense fallback={<ModuleState name={name} fullPage={fullPage} />}><View {...props} /></Suspense>
    </ModuleBoundary>;
  };
}
