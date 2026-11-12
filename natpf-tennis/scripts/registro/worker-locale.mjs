// Il Worker del registro (cloudflare/registro-worker.js) servito in locale da Node, con lo spazio R2 finto
// (r2-finto.mjs): per le prove dell'invio dal gioco e dello scarico, senza Cloudflare e senza chiavi vere.
//   import { workerLocale } from './worker-locale.mjs';
//   const w = await workerLocale({ env: { ALLOWED_ORIGINS: 'http://127.0.0.1:3000', CHIAVE_LETTURA: 'chiave-di-prova-123' } });
//   w.url   → http://127.0.0.1:<porta>/  (da mettere in natpf/registro.json)     w.bucket → lo spazio finto     await w.close()
// Da riga di comando: node scripts/registro/worker-locale.mjs [--port=8799] [--origins=…] (chiave di prova: NON una vera)
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../../cloudflare/registro-worker.js';
import { r2Finto } from './r2-finto.mjs';

export async function workerLocale({ env = {}, port = 0, host = '127.0.0.1', now = null } = {}){
  const bucket = env.REGISTRO || r2Finto(), E = { ...env, REGISTRO: bucket }, richieste = [];
  const server = http.createServer(async (req, res) => {
    try {
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks), headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string' && !/^(host|connection|content-length)$/i.test(k)) headers.set(k, v);
      const r = await worker.fetch(new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, ...(body.length ? { body } : {}) }), E, null, typeof now === 'function' ? now() : null);
      richieste.push({ method: req.method, url: req.url, status: r.status, byte: body.length });
      res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e){ res.writeHead(500).end(String(e?.message || e)); }
  });
  await new Promise((ok, no) => { server.once('error', no); server.listen(port, host, ok); });
  return { url: `http://${host}:${server.address().port}/`, bucket, env: E, richieste, close: () => new Promise(r => { server.closeAllConnections?.(); server.close(r); }) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const opt = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
  const w = await workerLocale({ port: +opt.port || 8799, env: { ALLOWED_ORIGINS: opt.origins || '', CHIAVE_LETTURA: 'chiave-di-prova-123' } });
  console.log(`Worker del registro finto su ${w.url} (spazio in memoria; chiave di prova: chiave-di-prova-123). Ctrl+C per chiudere.`);
}
