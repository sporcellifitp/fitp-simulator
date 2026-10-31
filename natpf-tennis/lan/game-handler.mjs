// Richieste del gioco nel server LAN (lan/server.mjs). Tutto dal disco del computer, niente internet:
//   /api/*, /___rPc_sWiTcH___   relay della partita 1v1 del motore base (lo stesso di vite.config.ts)
//   /assets/(models|audio|…)/   pacchetto offline: dist/assets → MediaPipe da node_modules → public/assets → gstatic se c'è rete
//   /natpf/…                     pagina del telefono NATPF e sue dipendenze, da ../site (stessa lista della build)
//   /, /index.html               il gioco (dist/), sempre con ?lan=1: telefono via segnalazione su questo computer
//   resto                        file della build (dist/)
// TLS, /lan/status, /lan/ (guida) e /lan-signal (WebSocket di abbinamento) li dà tools/lan/server.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { createMatchRelay } from '../scripts/match-relay.mjs';
import { ASSET_PREFIX, ROOT, createAssetMiddleware, defaultAssetDirs, sendFile } from '../scripts/offline-assets.mjs';
import { ALLOWED as PHONE_FILES } from '../scripts/natpf-site-plugin.mjs';

const notFound = res => { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end('Non trovato'); };
const missingBuild = res => {
  res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end('<!doctype html><meta charset="utf-8"><title>Build mancante</title><body style="font:18px system-ui;max-width:640px;margin:40px auto">'
    + '<h1>Manca la build del gioco</h1><p>Chiudi questa finestra e riapri <code>natpf-tennis/avvia-lan.cmd</code>, oppure dalla cartella '
    + '<code>natpf-tennis</code> esegui <code>npm run build</code> e ricarica la pagina.</p>');
};

// Il gioco va sempre aperto con ?lan=1: link.js di NATPF usa allora la segnalazione LAN (/lan-signal) al posto di PeerJS
// cloud, e il QR del telefono porta lo stesso parametro.
export function lanRedirect(url){
  if (url.searchParams.get('lan') === '1') return null;
  const params = new URLSearchParams(url.search); params.set('lan', '1');
  return `/?${params}`;
}

export function createGameHandler({ root = ROOT, distDir = path.join(root, 'dist'), siteDir = path.resolve(root, '../site'), upstream = true, fetchImpl } = {}){
  // nei link della stanza il relay mette l'indirizzo con cui questo computer è stato raggiunto (IP di rete)
  const relay = createMatchRelay({ publicUrl: req => `https://${req.headers.host || 'localhost'}` });
  const assets = createAssetMiddleware({ dirs: [{ dir: path.join(distDir, 'assets') }, ...defaultAssetDirs(root)], upstream, fetchImpl });
  const dist = path.resolve(distDir), site = path.resolve(siteDir);
  const handler = (req, res) => {
    let url, pathname;
    try { url = new URL((req.url || '/').replace(/^\/{2,}/, '/'), 'http://localhost'); pathname = decodeURIComponent(url.pathname); }
    catch { res.writeHead(400).end(); return; }
    if (pathname.includes('\0')) { res.writeHead(400).end(); return; }
    if (pathname.startsWith('/api/') || pathname === '/___rPc_sWiTcH___') return relay(req, res, () => notFound(res));
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    if (ASSET_PREFIX.test(pathname)) return assets(req, res, () => notFound(res));
    if (pathname.startsWith('/natpf/')){
      const rel = pathname.slice('/natpf/'.length);
      if (!PHONE_FILES.test(rel)) return notFound(res);
      const file = path.join(site, rel);
      return fs.stat(file, (err, stat) => err || !stat.isFile() ? notFound(res) : sendFile(req, res, file, 'no-cache'));
    }
    if (pathname === '/' || pathname === '/index.html'){
      const to = lanRedirect(url);
      if (to){ res.writeHead(302, { Location: to, 'Cache-Control': 'no-store' }).end(); return; }
      const index = path.join(dist, 'index.html');
      return fs.existsSync(index) ? sendFile(req, res, index, 'no-cache') : missingBuild(res);
    }
    const file = path.resolve(dist, '.' + pathname);
    if (!file.startsWith(dist + path.sep)) return notFound(res);
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) return notFound(res);
      // i bundle di Vite hanno l'hash nel nome: si possono tenere in cache (anche i font woff2, 31/10: prima si
      // riscaricavano a ogni caricamento)
      const hashed = /^\/assets\/[^/]+-[\w-]{8}\.(js|css|woff2)$/.test(pathname);
      sendFile(req, res, file, hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
    });
  };
  handler.relay = relay;
  return handler;
}
