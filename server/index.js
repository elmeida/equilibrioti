import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import titulosRouter from './routes/titulos.js';
import authRouter from './routes/auth.js';
import { ensureAuthSchema } from './auth/init.js';
import { requireAuth, requireAdmin } from './auth/middleware.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist');
const app = express();
const port = Number(process.env.SERVER_PORT || 3001);

app.use(cors());
app.use(express.json());

app.use('/uploads/empresas', express.static(path.resolve(__dirname, '../server/uploads/empresas')));

app.use('/api/auth', authRouter);
import adminRouter from './routes/admin.js';
app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
app.use('/api/titulos', requireAuth, titulosRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'titulos-financeiros' });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: 'Não foi possível concluir a operação agora. Tente novamente em instantes.',
    detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

ensureAuthSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Equilíbrio BI em http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Falha ao inicializar autenticação.', error);
    process.exit(1);
  });
