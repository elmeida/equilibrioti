import { afterEach, describe, expect, it, vi } from 'vitest';
import { parsePrivacyAcknowledgement, readPrivacyAcknowledgement, savePrivacyAcknowledgement } from '../src/utils/browserPrivacy';

afterEach(() => vi.unstubAllGlobals());
describe('aviso de armazenamento na integracao', () => {
  it.each([null, '', '{}', '{bad', 'true', '[]', JSON.stringify({ essential: true, analytics: true, savedAt: '2026-09-25' }), JSON.stringify({ version: 2, essential: true, analytics: true, savedAt: '2026-09-25' }), JSON.stringify({ version: 2, essential: true, analytics: false, savedAt: 'invalid' })])('nao trata registro incompleto/antigo como ciencia atual: %s', raw => {
    expect(parsePrivacyAcknowledgement(raw)).toBe(false);
  });
  it('salva apenas ciencia versionada, sem autorizar analytics', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    expect(savePrivacyAcknowledgement()).toBe(true);
    const [key, value] = setItem.mock.calls[0];
    expect(key).toBe('equilibrioti:cookie-consent');
    expect(JSON.parse(value)).toMatchObject({ version: 2, essential: true, analytics: false });
    expect(parsePrivacyAcknowledgement(value)).toBe(true);
  });
  it('storage bloqueado nao quebra login/aplicacao', () => {
    const blocked = () => { throw new Error('blocked'); };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    expect(readPrivacyAcknowledgement()).toBe(false);
    expect(savePrivacyAcknowledgement()).toBe(false);
  });
});
