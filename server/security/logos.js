import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { getAuthPool } from '../db/authPool.js';
import { recordAudit } from './audit.js';
import { isSafeLogoFileName } from './logo-reference.js';

const defaultDirectory = fileURLToPath(new URL('../uploads/empresas/', import.meta.url));
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_PIXELS = 4096 * 4096;
const formats = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
let processing = 0;
const waiting = [];
const cache = new Map();
let cachedBytes = 0;
let uploading = 0;
export const logoDirectory = () => process.env.LOGO_STORAGE_DIR ? path.resolve(process.env.LOGO_STORAGE_DIR) : defaultDirectory;
const invalid = () => Object.assign(new Error('Imagem invalida. Envie PNG, JPG ou WebP de ate 2 MB e 4096 x 4096 pixels.'), { status: 400 });

async function acquireDecoder() {
  if (processing < 2) { processing++; return; }
  if (waiting.length >= 16) throw Object.assign(new Error('Processamento ocupado. Tente novamente.'), { status: 503 });
  await new Promise(resolve => waiting.push(resolve));
}
function releaseDecoder() {
  const next = waiting.shift();
  if (next) next(); else processing--;
}

export async function normalizeLogo(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_LOGO_BYTES) throw invalid();
  const detected = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'png'
    : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 ? 'jpeg'
    : buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null;
  if (!detected || (mimetype && mimetype !== formats[detected])) throw invalid();
  await acquireDecoder();
  try {
    const decoder = sharp(buffer, { failOn: 'warning', limitInputPixels: MAX_PIXELS });
    const metadata = await decoder.metadata();
    if (metadata.format !== detected || !metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096 || (metadata.pages || 1) > 1) throw invalid();
    // Re-encode pixels; metadata and trailing payloads are never published.
    const output = await decoder.rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 }).timeout({ seconds: 5 }).toBuffer();
    if (output.length > MAX_LOGO_BYTES) throw invalid();
    return output;
  } catch (error) {
    if (error.status === 503) throw error;
    throw invalid();
  } finally { releaseDecoder(); }
}

const parseUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_LOGO_BYTES, files: 1, fields: 0, parts: 2 },
  fileFilter: (_req, file, callback) => callback(Object.values(formats).includes(file.mimetype) ? null : invalid(), Object.values(formats).includes(file.mimetype)),
}).single('logo');

export const logoUploadLimiter = rateLimit({ windowMs: 60000, limit: 10, keyGenerator: req => String(req.user.sub),
  standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Muitos envios. Aguarde um minuto.' } });

export function uploadLogo(req, res, next) {
  if (uploading >= 2) return res.status(503).json({ error: 'Envio ocupado. Tente novamente.' });
  uploading++;
  parseUpload(req, res, async error => {
    let saved;
    try {
      if (error || !req.file) return res.status(400).json({ error: error?.code === 'LIMIT_FILE_SIZE' ? 'A logo deve ter no maximo 2 MB.' : invalid().message });
      const normalized = await normalizeLogo(req.file.buffer, req.file.mimetype);
      const directory = logoDirectory();
      await fs.mkdir(directory, { recursive: true });
      const name = `logo-${randomUUID()}.webp`;
      const target = path.join(directory, name);
      await fs.writeFile(target, normalized, { flag: 'wx', mode: 0o600 });
      saved = target;
      await recordAudit(getAuthPool(), req, 'company.logo_upload');
      saved = undefined;
      return res.json({ url: `/uploads/empresas/${name}` });
    } catch (failure) {
      // Only remove the file exclusively created by this request.
      if (saved) await fs.unlink(saved).catch(() => console.error({ event: 'logo_cleanup_failed', requestId: req.auditRequestId }));
      if (failure.status === 400 || failure.status === 503) return res.status(failure.status).json({ error: failure.message });
      return next(failure);
    } finally { uploading--; }
  });
}

export async function serveLogo(req, res) {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cache-Control': 'no-store' });
  if (!['GET', 'HEAD'].includes(req.method) || !req.path.startsWith('/') || !isSafeLogoFileName(req.path.slice(1))) return res.status(404).end();
  let file;
  try {
    const target = path.join(logoDirectory(), req.path.slice(1));
    const info = await fs.lstat(target);
    if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_LOGO_BYTES) return res.status(404).end();
    const stamp = `${info.mtimeMs}:${info.size}`;
    const cached = cache.get(target);
    if (cached && cached.stamp === stamp && cached.expires > Date.now()) return res.type('image/webp').send(cached.buffer);
    file = await fs.open(target, 'r');
    const data = await file.readFile();
    // Legacy raster files pass through the same content boundary, without rewriting originals.
    const normalized = await normalizeLogo(data);
    const previous = cache.get(target);
    if (previous) { cachedBytes -= previous.buffer.length; cache.delete(target); }
    cache.set(target, { stamp, buffer: normalized, expires: Date.now() + 60000 });
    cachedBytes += normalized.length;
    while (cache.size > 32 || cachedBytes > 16 * 1024 * 1024) {
      const first = cache.keys().next().value;
      cachedBytes -= cache.get(first).buffer.length; cache.delete(first);
    }
    return res.type('image/webp').send(normalized);
  } catch (error) { return res.status(error.status === 503 ? 503 : 404).end(); }
  finally { if (file) await file.close(); }
}
