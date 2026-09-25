const key = 'equilibrioti:cookie-consent';

export function parsePrivacyAcknowledgement(raw: string | null): boolean {
  try {
    const value = JSON.parse(raw || 'null');
    return value?.version === 2 && value.essential === true && value.analytics === false
      && typeof value.savedAt === 'string' && Number.isFinite(Date.parse(value.savedAt));
  } catch { return false; }
}

export function readPrivacyAcknowledgement(): boolean {
  try { return parsePrivacyAcknowledgement(localStorage.getItem(key)); }
  catch { return false; }
}

export function savePrivacyAcknowledgement(): boolean {
  try {
    localStorage.setItem(key, JSON.stringify({ version: 2, essential: true, analytics: false, savedAt: new Date().toISOString() }));
    return true;
  } catch { return false; }
}
