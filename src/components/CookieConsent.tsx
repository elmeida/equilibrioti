import { useEffect, useState } from 'react';
import { Cookie, Settings, X } from 'lucide-react';

type Consent = {
  essential: true;
  analytics: boolean;
  savedAt: string;
};

const CONSENT_KEY = 'equilibrioti:cookie-consent';
const defaultConsent: Consent = { essential: true, analytics: false, savedAt: '' };

function readConsent(): Consent | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored ? JSON.parse(stored) as Consent : null;
  } catch {
    return null;
  }
}

function saveConsent(consent: Consent) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...consent, essential: true, savedAt: new Date().toISOString() }));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const current = readConsent();
    if (current) {
      setAnalytics(Boolean(current.analytics));
      return;
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    const openPreferences = () => {
      const current = readConsent() || defaultConsent;
      setAnalytics(Boolean(current.analytics));
      setPreferencesOpen(true);
      setVisible(true);
    };
    window.addEventListener('equilibrioti:cookie-preferences', openPreferences);
    return () => window.removeEventListener('equilibrioti:cookie-preferences', openPreferences);
  }, []);

  const acceptAll = () => {
    saveConsent({ essential: true, analytics: true, savedAt: '' });
    setAnalytics(true);
    setVisible(false);
    setPreferencesOpen(false);
  };

  const essentialOnly = () => {
    saveConsent({ essential: true, analytics: false, savedAt: '' });
    setAnalytics(false);
    setVisible(false);
    setPreferencesOpen(false);
  };

  const savePreferences = () => {
    saveConsent({ essential: true, analytics, savedAt: '' });
    setVisible(false);
    setPreferencesOpen(false);
  };

  if (!visible) return null;

  return (
    <section className="cookie-consent" role="dialog" aria-live="polite" aria-label="Preferencias de cookies">
      <div className="cookie-icon"><Cookie size={22} /></div>
      <div className="cookie-copy">
        <strong>Privacidade e cookies</strong>
        <p>
          Usamos armazenamento essencial para login, seguranca, preferencias da sessao e funcionamento do Equilibrio BI.
          Cookies analiticos sao opcionais e so serao usados com seu consentimento.
        </p>
        {preferencesOpen && (
          <div className="cookie-preferences">
            <label>
              <input type="checkbox" checked disabled />
              <span><b>Necessarios</b> Obrigatorios para autenticacao, seguranca e operacao do sistema.</span>
            </label>
            <label>
              <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
              <span><b>Analiticos</b> Ajudam a entender uso e estabilidade da aplicacao, quando habilitados.</span>
            </label>
          </div>
        )}
      </div>
      <div className="cookie-actions">
        <button type="button" className="ghost-button" onClick={() => setPreferencesOpen((value) => !value)}>
          <Settings size={16} /> Preferencias
        </button>
        {preferencesOpen ? (
          <button type="button" className="ghost-button apply-button" onClick={savePreferences}>Salvar</button>
        ) : (
          <>
            <button type="button" className="ghost-button" onClick={essentialOnly}>Somente necessarios</button>
            <button type="button" className="ghost-button apply-button" onClick={acceptAll}>Aceitar todos</button>
          </>
        )}
        <button type="button" className="icon-button" onClick={essentialOnly} aria-label="Fechar aviso de cookies">
          <X size={17} />
        </button>
      </div>
    </section>
  );
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event('equilibrioti:cookie-preferences'));
}
