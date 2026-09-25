import { useEffect, useState, useSyncExternalStore } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { CookieConsent } from './components/CookieConsent';
import { lazyModule } from './components/DeferredModule';
import { clearAuthToken, logoutSession, getAuthToken, loadMe, getActiveEmpresa, setActiveEmpresa, getApiContextRevision, subscribeApiContext, type AuthUser } from './services/api';

const AdminApp = lazyModule(async () => ({ default: (await import('./AdminApp')).AdminApp }), 'Administração', true);
const BIDashboard = lazyModule(async () => ({ default: (await import('./BIDashboard')).BIDashboard }), 'Painel financeiro', true);

export function App() {
  const context = useSyncExternalStore(subscribeApiContext, getApiContextRevision);
  return <><SessionApp key={context} /><CookieConsent /></>;
}

function SessionApp() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(Boolean(getAuthToken()));
  const activeEmpresa = getActiveEmpresa();

  useEffect(() => {
    if (!getAuthToken()) return;
    const controller = new AbortController();
    loadMe(controller.signal)
      .then(({ user: currentUser }) => { if (!controller.signal.aborted) setUser(currentUser); })
      .catch((error) => { if (!controller.signal.aborted && error.name !== 'AbortError') clearAuthToken(); })
      .finally(() => { if (!controller.signal.aborted) setCheckingAuth(false); });
    return () => controller.abort();
  }, []);

  const logout = () => {
    void logoutSession().then(confirmed => {
      if (!confirmed) window.alert('Sessão encerrada neste navegador. Não foi possível confirmar a revogação no servidor. Em caso de risco, solicite a redefinição da senha ao administrador.');
    });
    setUser(null);
  };

  if (checkingAuth) {
    return <main className="login-page light"><div className="login-card"><strong>Carregando sessão...</strong></div></main>;
  }
  if (!user) return <LoginScreen onLogin={setUser} />;
  if (user.perfil === 'admin' && !activeEmpresa) {
    return <AdminApp user={user} onImpersonate={setActiveEmpresa} onLogout={logout} />;
  }
  return <BIDashboard user={user} activeEmpresa={user.perfil === 'admin' ? activeEmpresa : null} onStopImpersonate={user.perfil === 'admin' ? () => setActiveEmpresa(null) : undefined} onLogout={logout} />;
}
