import { KeyRound, LogOut, WalletCards, X } from 'lucide-react';
import type { AuthUser } from '../services/api';

export function Sidebar({
  open,
  user,
  navItems,
  onClose,
  onLogout,
  onChangePassword,
}: {
  open: boolean;
  user?: AuthUser | null;
  navItems?: React.ReactNode;
  onClose?: () => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
}) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div>
        <div className="sidebar-head">
          <div className="sidebar-logo"><img src="/favicon.png" alt="Equilíbrio TI" /></div>
          <img className="sidebar-brand-logo" src="/logo_equilibrioti.png" alt="Equilíbrio TI" />
          <button className="sidebar-close" onClick={onClose} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>
        <nav>
          {navItems || (
            <a className="active" title="Financeiro">
              <WalletCards size={20} />
              <span>Financeiro</span>
            </a>
          )}
        </nav>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">{user?.nome?.slice(0, 1) || 'U'}</div>
        <div className="sidebar-user-info">
          <strong>{user?.nome || 'Usuário'}</strong>
          <span>{user?.email || ''}</span>
        </div>
        <button title="Alterar senha" onClick={onChangePassword}>
          <KeyRound size={17} />
          <span>Alterar senha</span>
        </button>
        <button title="Sair" onClick={onLogout}>
          <LogOut size={17} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
