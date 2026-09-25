// Network-only worker: never persist API responses, uploads, HTML or client assets.
const LEGACY_CACHE_PREFIX = 'equilibrioti-financeiro-';
const OFFLINE_HTML = `<!doctype html>
<html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sem conexão | Equilíbrio BI</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;color:#17202a;background:#f5f7f9;min-height:100dvh;display:grid;place-items:center;padding:24px}
main{width:100%;max-width:420px}h1{font-size:28px;margin:0 0 32px}h2{font-size:20px}p{line-height:1.6}a{display:inline-block;padding:12px 18px;border-radius:6px;background:#1469bd;color:white;text-decoration:none;font-weight:600}a:focus-visible{outline:3px solid #17202a;outline-offset:4px}footer{margin-top:40px;color:#526070;font-size:14px}
</style><main><h1>Equilíbrio BI</h1><h2>Sem conexão</h2><p>Não foi possível conectar ao servidor.</p><a href="/">Tentar novamente</a><footer>Equilíbrio TI</footer></main></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(LEGACY_CACHE_PREFIX)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin
    || !['/', '/index.html'].includes(url.pathname)) {
    return;
  }

  event.respondWith(
    fetch(request, { cache: 'no-store' }).catch(() => new Response(OFFLINE_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" },
    })),
  );
});
