import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  if (mode === 'demo' && command === 'build') {
    throw new Error('O modo demo e exclusivo do servidor local e nao pode ser publicado.');
  }
  return {
    plugins: [react()],
    build: { manifest: true },
    server: {
      port: mode === 'demo' ? 5174 : 5173,
      proxy: mode === 'demo' ? undefined : { '/api': 'http://127.0.0.1:3001', '/uploads/empresas': 'http://127.0.0.1:3001' },
    },
  };
});
