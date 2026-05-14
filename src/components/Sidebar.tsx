import { WalletCards, X } from 'lucide-react';

export function Sidebar({ open, onClose }: { open: boolean; onClose?: () => void }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-head">
        <div className="sidebar-logo"><img src="/favicon.png" alt="Equilíbrio TI" /></div>
        <img className="sidebar-brand-logo" src="/logo_equilibrioti.png" alt="Equilíbrio TI" />
        <button className="sidebar-close" onClick={onClose} aria-label="Fechar menu">
          <X size={18} />
        </button>
      </div>
      <nav>
        <a className="active" title="Financeiro">
          <WalletCards size={20} />
          <span>Financeiro</span>
        </a>
      </nav>
    </aside>
  );
}
