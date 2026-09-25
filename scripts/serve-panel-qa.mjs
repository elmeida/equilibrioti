import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// Isolated UI fixture: no dotenv, database, RM, authentication or remote proxy.
const server = await createServer({
  configFile: false, envFile: false,
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('') },
  server: { host: '127.0.0.1', port: 5187, strictPort: true },
  plugins: [react(), {
    name: 'panel-qa-fixtures',
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://127.0.0.1');
        if (!url.pathname.startsWith('/api/')) return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        if (url.pathname !== '/api/titulos/tabela') {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'Rota indisponivel no QA isolado' }));
        }
        const page = Number(url.searchParams.get('page') || 1);
        const search = url.searchParams.get('search') || '';
        const rows = Array.from({ length: 25 }, (_, index) => ({
          EMPRESA: 'QA local', REF: (page - 1) * 25 + index + 1, CODCFO: 'QA', CLIFOR: search || 'Registro sintetico',
          NUMERODOC: `QA-${index + 1}`, PAGREC: 'A Pagar', STATUS_FIN: 'Em Aberto', DTVENC: '2026-09-23', VLRRATEIO: 98765.43,
        }));
        res.end(JSON.stringify({ rows, total: 75, page, pageSize: 25 }));
      });
    },
  }],
});
await server.listen();
console.log('QA local: http://127.0.0.1:5187/tests/fixtures/panels.html');
