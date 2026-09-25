import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import titulosRouter from './routes/titulos.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import { requireAuth, requireAdmin } from './auth/middleware.js';
import { serveLogo } from './security/logos.js';
import { mountStaticApp } from './web/staticApp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist');

function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createApp(options = {}) {
  const app = express();
  // Enable only behind a local proxy that replaces untrusted forwarding headers.
  app.set('trust proxy', process.env.TRUST_PROXY_LOOPBACK === 'true' ? 'loopback' : false);
  app.set('query parser', 'simple');
  const isProduction = options.isProduction ?? process.env.NODE_ENV === 'production';
  const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const allowedOrigins = parseOrigins(options.corsOrigin ?? process.env.CORS_ORIGIN ?? (!isProduction ? defaultDevOrigins.join(',') : ''));

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
  }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    res.locals.requestId = randomUUID();
    req.auditRequestId = res.locals.requestId;
    res.set('X-Request-Id', res.locals.requestId);
    next();
  });
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));

  app.use('/uploads/empresas', serveLogo);

  app.use('/api/auth', authRouter);
  app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
  app.use('/api/titulos', requireAuth, titulosRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'titulos-financeiros' });
  });

  if (isProduction) {
    mountStaticApp(app, distPath);
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: 'Dados invalidos. Revise as informacoes enviadas.',
        fields: err.issues.map((issue) => issue.path.join('.')).filter(Boolean),
      });
    }

    const suppliedStatus = Number(err.status || err.statusCode || 500);
    const status = Number.isInteger(suppliedStatus) && suppliedStatus >= 400 && suppliedStatus <= 599 ? suppliedStatus : 500;
    if (status >= 400 && status < 500) {
      return res.status(status).json({ error: status === 413 ? 'Conteudo enviado excede o limite permitido.' : 'Dados invalidos. Revise a solicitacao.' });
    }

    // Do not log SQL, payloads, credentials, headers, URLs or personal data.
    console.error({ event: 'request_failed', requestId: res.locals.requestId, status });
    return res.status(500).json({
      error: 'Nao foi possivel concluir a operacao agora. Tente novamente em instantes.',
      requestId: res.locals.requestId,
    });
  });

  return app;
}
