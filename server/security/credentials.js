import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const prefix = 'enc:v1:';
const keyIdPattern = /^[a-zA-Z0-9_-]{1,40}$/;
function failure() { return new Error('Credencial protegida indisponivel. Verifique a configuracao de chaves e a conversao autorizada.'); }

export function credentialKeys(env = process.env) {
  try {
    const active = env.TENANT_CREDENTIAL_ACTIVE_KEY;
    const parsed = JSON.parse(env.TENANT_CREDENTIAL_KEYS || '{}');
    if (!keyIdPattern.test(active || '') || !parsed || Array.isArray(parsed)) throw failure();
    const keys = new Map();
    for (const [id, encoded] of Object.entries(parsed)) {
      if (!keyIdPattern.test(id) || typeof encoded !== 'string') throw failure();
      const key = Buffer.from(encoded, 'base64');
      if (key.length !== 32 || key.toString('base64') !== encoded) throw failure();
      keys.set(id, key);
    }
    if (!keys.has(active)) throw failure();
    return { active, keys };
  } catch { throw failure(); }
}

function aad(empresaId, keyId) {
  if (!Number.isSafeInteger(empresaId) || empresaId < 1) throw failure();
  return Buffer.from(`equilibrio-bi:rm-password:v1:${keyId}:${empresaId}`);
}
function decode(value, length) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) throw failure();
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.toString('base64url') !== value || (length && decoded.length !== length)) throw failure();
  return decoded;
}

export function encryptCredential(password, empresaId, env = process.env) {
  if (typeof password !== 'string' || !password.length || Buffer.byteLength(password) > 16384) throw failure();
  const { active, keys } = credentialKeys(env);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keys.get(active), iv, { authTagLength: 16 });
  cipher.setAAD(aad(empresaId, active));
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  return `${prefix}${active}:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptCredential(value, empresaId, env = process.env) {
  try {
    if (typeof value !== 'string' || value.length > 23000 || !value.startsWith(prefix)) throw failure();
    const parts = value.split(':');
    if (parts.length !== 6) throw failure();
    const [, , id, iv, tag, data] = parts;
    const { keys } = credentialKeys(env);
    if (!keys.has(id)) throw failure();
    const decipher = createDecipheriv('aes-256-gcm', keys.get(id), decode(iv, 12), { authTagLength: 16 });
    decipher.setAAD(aad(empresaId, id));
    decipher.setAuthTag(decode(tag, 16));
    return Buffer.concat([decipher.update(decode(data)), decipher.final()]).toString('utf8');
  } catch { throw failure(); }
}

export function isEncryptedCredential(value) { return typeof value === 'string' && value.startsWith('enc:'); }
