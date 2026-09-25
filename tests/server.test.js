import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../server/db/authPool.js', () => ({ getAuthPool: () => ({ query: async () => ({ rows: [{
  id: 1, nome: 'Cliente', email: 'cliente@example.com', perfil: 'cliente', empresa_id: 1,
  ativo: true, empresa_ativa: true, session_version: 0,
}] }) }) }));
import { createApp } from '../server/app.js';
import { signUser } from '../server/auth/middleware.js';

function testApp() {
  return createApp({
    corsOrigin: 'http://localhost:5173',
    isProduction: false,
  });
}

describe('server app', () => {
  it('responde health check publico', async () => {
    const response = await request(testApp())
      .get('/api/health')
      .expect(200);

    expect(response.body).toEqual({ ok: true, service: 'titulos-financeiros' });
  });

  it('aplica CORS somente para origem permitida', async () => {
    const allowed = await request(testApp())
      .get('/api/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200);

    const blocked = await request(testApp())
      .get('/api/health')
      .set('Origin', 'https://externo.example')
      .expect(200);

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('bloqueia rotas de titulos sem sessao', async () => {
    const response = await request(testApp())
      .get('/api/titulos/kpis')
      .expect(401);

    expect(response.body.error).toContain('Sess');
  });

  it('bloqueia painel admin para cliente apos validar sessao', async () => {
    const token = signUser({
      id: 1,
      nome: 'Cliente',
      email: 'cliente@example.com',
      perfil: 'cliente',
      empresa_id: 1,
      session_version: 0,
    });

    const response = await request(testApp())
      .get('/api/admin/empresas')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body.error).toContain('Acesso negado');
  });

  it('retorna 400 para payload invalido no login', async () => {
    const response = await request(testApp())
      .post('/api/auth/login')
      .send({ email: 'email-invalido', password: '' })
      .expect(400);

    expect(response.body.error).toContain('Dados invalidos');
  });
});
