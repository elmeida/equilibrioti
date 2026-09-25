import express from 'express';
import path from 'node:path';

export function mountStaticApp(app, directory) {
  app.use((_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    next();
  });
  app.use('/assets', express.static(path.join(directory, 'assets'), {
    index: false, redirect: false, fallthrough: false,
    setHeaders(res, file) {
      const hashed = /-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(path.basename(file));
      res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  }));
  app.use(express.static(directory, {
    setHeaders(res, file) {
      res.setHeader('Cache-Control', path.extname(file).toLowerCase() === '.html' ? 'no-store' : 'no-cache');
    },
  }));
  app.get(/.*/, (req, res, next) => {
    const reserved = /^\/(?:api|uploads|assets)(?:\/|$)/i.test(req.path);
    if (reserved || path.extname(req.path) || !req.accepts('html')) return res.status(404).end();
    res.sendFile(path.join(directory, 'index.html'), { headers: { 'Cache-Control': 'no-store' } }, next);
  });
}
