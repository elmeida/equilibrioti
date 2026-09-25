import { useEffect, useState } from 'react';
import { Cookie, Settings, X } from 'lucide-react';
import { readPrivacyAcknowledgement, savePrivacyAcknowledgement } from '../utils/browserPrivacy';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [details, setDetails] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setVisible(!readPrivacyAcknowledgement());
    const open = () => { setDetails(true); setVisible(true); setError(''); };
    window.addEventListener('equilibrioti:cookie-preferences', open);
    return () => window.removeEventListener('equilibrioti:cookie-preferences', open);
  }, []);

  const save = () => {
    if (!savePrivacyAcknowledgement()) {
      setError('O navegador não permitiu guardar esta preferência. Você pode fechar o aviso nesta sessão.');
      return;
    }
    setVisible(false);
    setDetails(false);
  };
  if (!visible) return null;

  return (
    <section className="cookie-consent" aria-label="Privacidade e armazenamento">
      <div className="cookie-copy">
        <div className="cookie-title"><span className="cookie-icon"><Cookie size={22} /></span><strong>Privacidade e armazenamento</strong></div>
        <p>Este ambiente usa armazenamento do navegador para sessão e preferências. Não há coleta analítica opcional ativa. <a href="/politica-privacidade.html" target="_blank" rel="noreferrer">Aviso de privacidade</a></p>
        {details && <div className="cookie-preferences">
          <label><input type="checkbox" checked disabled /><span><b>Essenciais</b>Sessão, segurança e preferências de interface.</span></label>
          <label><input type="checkbox" checked={false} disabled /><span><b>Analíticos inativos</b>Não disponíveis nesta versão.</span></label>
        </div>}
        {error && <p role="status">{error}</p>}
      </div>
      <div className="cookie-actions">
        <button type="button" className="ghost-button" aria-expanded={details} onClick={() => setDetails(value => !value)}><Settings size={16} />Detalhes</button>
        <button type="button" className="ghost-button apply-button" onClick={save}>Entendi</button>
        <button type="button" className="icon-button" aria-label="Fechar aviso de privacidade" title="Fechar nesta sessão" onClick={() => setVisible(false)}><X size={17} /></button>
      </div>
    </section>
  );
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event('equilibrioti:cookie-preferences'));
}
