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
    <section className="cookie-consent" role="dialog" aria-live="polite" aria-label="Preferências de cookies">
      <div className="cookie-copy">
        <div className="cookie-title">
          <span className="cookie-icon"><Cookie size={22} /></span>
          <strong>Privacidade e cookies</strong>
        </div>
        <p>
          Usamos cookies essenciais para login, segurança e funcionamento do Equilíbrio BI.
          Cookies analíticos são opcionais. <a href="/politica-privacidade.html" target="_blank" rel="noreferrer">Política de privacidade</a>
        </p>
        {preferencesOpen && (
          <div className="cookie-preferences">
            <label>
              <input type="checkbox" checked disabled />
              <span><b>Necessários</b> Obrigatórios para autenticação, segurança e operação do sistema.</span>
            </label>
            <label>
              <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
              <span><b>Analíticos</b> Ajudam a entender uso e estabilidade da aplicação, quando habilitados.</span>
            </label>
          </div>
        )}
      </div>
      <div className="cookie-actions">
        <label className="cookie-toggle" title="Ativar ou desativar cookies analíticos">
          <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
          <span />
          <b>Analíticos</b>
        </label>
        <button type="button" className="ghost-button" onClick={() => setPreferencesOpen((value) => !value)}>
          <Settings size={16} /> Detalhes
        </button>
        <button type="button" className="ghost-button apply-button" onClick={savePreferences}>Salvar</button>
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
