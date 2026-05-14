import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import titulosRouter from './routes/titulos.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist');
const app = express();
const port = Number(process.env.SERVER_PORT || 3001);

app.use(cors());
app.use(express.json());
app.use('/api/titulos', titulosRouter);

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
    error: 'Não foi possível consultar os dados financeiros agora.',
    detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

app.listen(port, () => {
  console.log(`Dashboard Títulos Financeiros em http://localhost:${port}`);
});
