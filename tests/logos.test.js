import request from 'supertest';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../server/db/authPool.js', () => ({ getAuthPool: () => ({ query: mocks.query }) }));
import { createApp } from '../server/app.js';
import { signUser, publicUser } from '../server/auth/middleware.js';
import { normalizeLogo, logoUploadLimiter, MAX_LOGO_BYTES } from '../server/security/logos.js';
import { isSafeLogoReference, safeLogoReference } from '../server/security/logo-reference.js';

let directory, app;
const admin = { id: 91, perfil: 'admin', ativo: true, session_version: 0, empresa_id: null };
const png = () => sharp({ create: { width: 32, height: 24, channels: 4, background: '#008866' } }).png().toBuffer();
const upload = (data, mime = 'image/png', bearer = signUser(admin)) => request(app).post('/api/admin/empresas/upload-logo')
  .set('Authorization', `Bearer ${bearer}`).attach('logo', data, { filename: 'untrusted-name.png', contentType: mime });
beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'equilibrio-logo-test-'));
  vi.stubEnv('LOGO_STORAGE_DIR', directory);
  mocks.query.mockReset();
  mocks.query.mockImplementation(async sql => ({ rows: sql.includes('NOT EXISTS') ? [admin] : [], rowCount: 1 }));
  logoUploadLimiter.resetKey(String(admin.id));
  app = createApp({ isProduction: true });
});
afterEach(async () => {
  vi.restoreAllMocks(); vi.unstubAllEnvs();
  if (directory && path.dirname(directory) === path.resolve(os.tmpdir()) && path.basename(directory).startsWith('equilibrio-logo-test-')) await fs.rm(directory, { recursive: true, force: true });
});

describe('logos: conteudo e publicacao', () => {
  it('serve seis logos simultaneas sem rejeitar a lista normal', async () => {
    const image = await png();
    for (let i = 0; i < 6; i++) await fs.writeFile(path.join(directory, `concurrent-${i}.PNG`), image);
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => request(app).get(`/uploads/empresas/concurrent-${i}.PNG`)));
    expect(results.map(result => result.status)).toEqual([200, 200, 200, 200, 200, 200]);
    const same = await Promise.all(Array.from({ length: 6 }, () => request(app).get('/uploads/empresas/concurrent-0.PNG')));
    expect(same.map(result => result.status)).toEqual([200, 200, 200, 200, 200, 200]);
  });
  it.each(['png', 'jpeg', 'webp'])('aceita %s real e publica somente WebP sem metadados', async format => {
    const data = await sharp(await png()).withMetadata({ exif: { IFD0: { Artist: 'PRIVATE-METADATA' } } }).toFormat(format).toBuffer();
    const response = await upload(data, `image/${format}`).expect(200);
    expect(response.body.url).toMatch(/^\/uploads\/empresas\/logo-[0-9a-f-]{36}\.webp$/);
    const served = await request(app).get(response.body.url).expect(200);
    expect(served.headers['content-type']).toMatch(/^image\/webp/);
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    const metadata = await sharp(served.body).metadata();
    expect(metadata.width).toBe(32); expect(metadata.height).toBe(24);
    expect(metadata.exif).toBeUndefined(); expect(metadata.icc).toBeUndefined();
    expect(mocks.query.mock.calls.some(([, args]) => args?.includes('company.logo_upload'))).toBe(true);
    await request(app).head(response.body.url).expect(200);
  });
  it.each(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', '<html>not an image</html>', 'not-image'])('recusa MIME forjado sem gravar arquivo: %s', async value => {
    await upload(Buffer.from(value)).expect(400);
    expect(await fs.readdir(directory)).toEqual([]);
  });
  it('recusa imagem truncada e conteudo diferente do MIME', async () => {
    const data = await png();
    await upload(data.subarray(0, 40)).expect(400);
    await upload(data, 'image/jpeg').expect(400);
    expect(await fs.readdir(directory)).toEqual([]);
  });
  it('descarta payload anexado a imagem valida', async () => {
    const output = await normalizeLogo(Buffer.concat([await png(), Buffer.from('PRIVATE-TRAILING-PAYLOAD')]), 'image/png');
    expect(output.includes(Buffer.from('PRIVATE-TRAILING-PAYLOAD'))).toBe(false);
    expect((await sharp(output).metadata()).format).toBe('webp');
  });
  it('limita bytes e dimensoes', async () => {
    await upload(Buffer.alloc(MAX_LOGO_BYTES + 1)).expect(400);
    const large = await sharp({ create: { width: 4097, height: 2, channels: 3, background: '#000000' } }).png().toBuffer();
    await upload(large).expect(400);
    expect(await fs.readdir(directory)).toEqual([]);
  });
  it('restringe quantidade de arquivos e campos extras', async () => {
    await request(app).post('/api/admin/empresas/upload-logo').set('Authorization', `Bearer ${signUser(admin)}`)
      .attach('logo', await png(), 'a.png').attach('logo', await png(), 'b.png').expect(400);
    await request(app).post('/api/admin/empresas/upload-logo').set('Authorization', `Bearer ${signUser(admin)}`)
      .field('extra', 'value').attach('logo', await png(), 'a.png').expect(400);
    expect(await fs.readdir(directory)).toEqual([]);
  });
  it('exige administrador antes de aceitar upload', async () => {
    await request(app).post('/api/admin/empresas/upload-logo').attach('logo', await png(), 'a.png').expect(401);
    mocks.query.mockResolvedValue({ rows: [{ ...admin, perfil: 'cliente', empresa_id: 1, empresa_ativa: true }], rowCount: 1 });
    await upload(await png()).expect(403);
    expect(await fs.readdir(directory)).toEqual([]);
  });
  it('remove seu arquivo se a auditoria falhar, sem expor detalhes', async () => {
    mocks.query.mockImplementation(async sql => { if (sql.includes('audit_events')) throw new Error('private database failure'); return { rows: [admin], rowCount: 1 }; });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await upload(await png()).expect(500);
    expect(JSON.stringify(response.body)).not.toContain('private database failure');
    expect(await fs.readdir(directory)).toEqual([]);
  });
  it('normaliza legado raster e bloqueia formatos ativos, falsos, ausentes e caminhos codificados', async () => {
    await fs.writeFile(path.join(directory, 'legacy.png'), await png());
    await fs.writeFile(path.join(directory, 'fake.png'), '<svg>unsafe</svg>');
    await fs.writeFile(path.join(directory, 'active.svg'), '<svg>unsafe</svg>');
    await request(app).get('/uploads/empresas/legacy.png').expect('Content-Type', /image\/webp/).expect(200);
    for (const suffix of ['fake.png', 'active.svg', 'missing.png', '%2e%2e%2f.env', 'nested/a.png']) {
      const response = await request(app).get(`/uploads/empresas/${suffix}`).expect(404);
      expect(response.text || '').not.toContain('<html');
    }
  });
});

describe('referencias de logos: escrita e copias', () => {
  it.each(['https://tracking.invalid/a.png', '//tracking.invalid/a.png', 'data:image/png;base64,AA', '/api/auth/me', '/uploads/empresas/a.svg', '/a/../b.png', '/%2e%2e/a.png', '/a.png?x=1'])('recusa %s', value => {
    expect(isSafeLogoReference(value)).toBe(false); expect(safeLogoReference(value)).toBe('');
    expect(publicUser({ empresa: { id: 1, nome: 'Test', logo_url: value } }).empresa.logo_url).toBe('');
  });
  it.each(['', '/logo.png', '/uploads/empresas/logo-abc.webp', '/logo_servdrill.png', '/uploads/empresas/logo-123.PNG', '/logo.JPG', '/logo.WEBP'])('preserva referencia local %s', value => {
    expect(isSafeLogoReference(value)).toBe(true);
  });
  it.each(['post', 'put'])('valida logo_url tambem no cadastro %s', async method => {
    await request(app)[method](`/api/admin/empresas${method === 'put' ? '/1' : ''}`)
      .set('Authorization', `Bearer ${signUser(admin)}`).send({ nome: 'Test', logo_url: 'https://tracking.invalid/a.png', db_host: 'invalid', db_database: 'test', db_user: 'test', db_password: 'test' }).expect(400);
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO') || sql.includes('UPDATE'))).toBe(false);
  });
});
