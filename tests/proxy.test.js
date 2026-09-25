import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../server/db/authPool.js', () => ({getAuthPool: () => ({query: async () => ({rows:[]})})}));
import { createApp } from '../server/app.js';

afterEach(() => vi.unstubAllEnvs());
function app(enabled) {
  vi.stubEnv('TRUST_PROXY_LOOPBACK', enabled);
  const instance = createApp({isProduction:false});
  instance.get('/proxy-check', (req,res) => res.json({ip:req.ip}));
  return instance;
}
describe('trusted local proxy boundary', () => {
  it('ignores forwarding headers by default', async () => {
    const instance=app('false');
    const result=await request(instance).get('/proxy-check').set('X-Forwarded-For','198.51.100.20');
    expect(result.body.ip).not.toBe('198.51.100.20');
    expect(instance.get('trust proxy')).toBe(false);
  });
  it('requires an explicit true value', () => {
    expect(app('1').get('trust proxy')).toBe(false);
  });
  it('accepts a client address from the local proxy', async () => {
    const result=await request(app('true')).get('/proxy-check').set('X-Forwarded-For','198.51.100.20');
    expect(result.body.ip).toBe('198.51.100.20');
  });
  it('stops at the nearest untrusted hop', async () => {
    const result=await request(app('true')).get('/proxy-check').set('X-Forwarded-For','198.51.100.99, 203.0.113.10');
    expect(result.body.ip).toBe('203.0.113.10');
  });
  it('does not trust a remote TCP peer', () => {
    const trust=app('true').get('trust proxy fn');
    expect(trust('127.0.0.1')).toBe(true);
    expect(trust('::1')).toBe(true);
    expect(trust('203.0.113.10')).toBe(false);
  });
  it('limits attempts per verified client without blocking another client', async () => {
    const instance=app('true');
    const login=ip => request(instance).post('/api/auth/login').set('X-Forwarded-For',ip)
      .send({email:'missing@example.invalid',password:'invalid'});
    for(let i=0;i<30;i++) await login('198.51.100.21').expect(401);
    await login('198.51.100.21').expect(429);
    await login('198.51.100.22').expect(401);
  });
});
