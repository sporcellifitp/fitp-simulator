// Worker delle credenziali TURN (cloudflare/turn-worker.js) con il servizio di Cloudflare finto, e pacchetto per il
// Worker del gioco (scripts/pacchetto-cloudflare.mjs): dist + _headers + natpf/turn.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import worker, { explain } from '../cloudflare/turn-worker.js';
import { makePackage, checkTurnUrl, headersProblems, mediaOrigin, TURN_JSON } from '../scripts/pacchetto-cloudflare.mjs';

const ENV = { TURN_KEY_ID: 'chiave-id', TURN_KEY_API_TOKEN: 'segreto-123', ALLOWED_ORIGINS: 'https://gioco.example.workers.dev, https://altro.example/' };
const GAME = 'https://gioco.example.workers.dev';
const CF = { iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] }, { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' }] };

async function call({ method = 'GET', origin = GAME, env = ENV, cf = () => new Response(JSON.stringify(CF), { status: 201, headers: { 'Content-Type': 'application/json' } }) } = {}){
  const saved = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return cf(); };
  try {
    const res = await worker.fetch(new Request('https://turn.example.workers.dev/', { method, headers: origin ? { Origin: origin } : {} }), env);
    const text = await res.text();
    return { res, text, body: text ? JSON.parse(text) : null, calls };
  } finally { globalThis.fetch = saved; }
}

test('Worker TURN: chiede le credenziali a Cloudflare (24 h) e le restituisce senza la porta 53, senza cache', async () => {
  const { res, body, calls } = await call();
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://rtc.live.cloudflare.com/v1/turn/keys/chiave-id/credentials/generate-ice-servers');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer segreto-123');
  assert.deepEqual(JSON.parse(calls[0].init.body), { ttl: 86400 });
  assert.deepEqual(body, { iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }, { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' }], ttl: 86400 });
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), GAME);
  assert.match(res.headers.get('Vary'), /Origin/);
  // POST come GET; risposta con un oggetto singolo al posto dell'elenco
  const single = await call({ method: 'POST', cf: () => new Response(JSON.stringify({ iceServers: { urls: 'turns:t:443?transport=tcp', username: 'a', credential: 'b' } }), { status: 201 }) });
  assert.deepEqual(single.body.iceServers, [{ urls: ['turns:t:443?transport=tcp'], username: 'a', credential: 'b' }]);
});

test('Worker TURN: CORS solo per le origini permesse, preflight, tutte se l\'elenco è vuoto', async () => {
  const other = await call({ origin: 'https://intruso.example' });
  assert.equal(other.res.status, 403); assert.equal(other.calls.length, 0, 'nessuna credenziale generata');
  assert.equal(other.res.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await call({ origin: 'https://altro.example' })).res.headers.get('Access-Control-Allow-Origin'), 'https://altro.example', 'la «/» finale dell\'elenco non conta');
  const pre = await call({ method: 'OPTIONS' });
  assert.equal(pre.res.status, 204); assert.equal(pre.calls.length, 0);
  assert.equal(pre.res.headers.get('Access-Control-Allow-Origin'), GAME);
  assert.match(pre.res.headers.get('Access-Control-Allow-Methods'), /GET/);
  assert.equal((await call({ method: 'OPTIONS', origin: 'https://intruso.example' })).res.status, 403);
  const open = await call({ origin: 'https://chiunque.example', env: { ...ENV, ALLOWED_ORIGINS: '' } });
  assert.equal(open.res.status, 200); assert.equal(open.res.headers.get('Access-Control-Allow-Origin'), '*');
  // indirizzo aperto a mano (nessuna origine): risponde, senza CORS
  const direct = await call({ origin: null });
  assert.equal(direct.res.status, 200); assert.equal(direct.res.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await call({ method: 'PUT' })).res.status, 405);
});

test('Worker TURN: errori in JSON senza segreti (variabili mancanti, Cloudflare giù, risposta strana)', async () => {
  const cases = [
    [{ env: { ALLOWED_ORIGINS: GAME } }, 500],
    [{ cf: () => { throw new TypeError('rete'); } }, 502],
    [{ cf: () => new Response('{"errors":[{"message":"token segreto-123 non valido"}]}', { status: 401 }) }, 502],
    [{ cf: () => new Response('<html>', { status: 201 }) }, 502],
    [{ cf: () => new Response(JSON.stringify({ iceServers: [{ urls: ['stun:x:53'] }] }), { status: 201 }) }, 502],
  ];
  for (const [opts, status] of cases){
    const r = await call(opts);
    assert.equal(r.res.status, status, JSON.stringify(r.body));
    assert.equal(r.body.ok, false); assert.equal(typeof r.body.error, 'string');
    assert.ok(!r.text.includes('segreto-123') && !r.text.includes('chiave-id'), 'nessun segreto nella risposta');
    assert.equal(r.res.headers.get('Cache-Control'), 'no-store');
  }
});

test('Worker TURN: valori copiati con spazi, a capo o virgolette funzionano; 404 e 401 dicono cosa controllare', async () => {
  // prova dal vivo del 30/10: «Cloudflare ha risposto 404» senza altro
  const dirty = await call({ env: { ...ENV, TURN_KEY_ID: '  chiave-id\n', TURN_KEY_API_TOKEN: '"segreto-123" ' } });
  assert.equal(dirty.res.status, 200);
  assert.equal(dirty.calls[0].url, 'https://rtc.live.cloudflare.com/v1/turn/keys/chiave-id/credentials/generate-ice-servers');
  assert.equal(dirty.calls[0].init.headers.Authorization, 'Bearer segreto-123');
  const id32 = 'a'.repeat(32), tok64 = 'b'.repeat(64);
  const nf = await call({ env: { ...ENV, TURN_KEY_ID: id32, TURN_KEY_API_TOKEN: tok64 }, cf: () => new Response('{}', { status: 404 }) });
  assert.equal(nf.res.status, 502);
  assert.match(nf.body.error, /non trova una chiave TURN.*Turn Token ID/);
  assert.doesNotMatch(nf.body.error, /scambiati/);
  assert.ok(!nf.text.includes(id32) && !nf.text.includes(tok64), 'mai i valori, solo le lunghezze');
  // ID e token scambiati: lo dice
  const sw = await call({ env: { ...ENV, TURN_KEY_ID: tok64, TURN_KEY_API_TOKEN: id32 }, cf: () => new Response('{}', { status: 404 }) });
  assert.match(sw.body.error, /scambiati/); assert.match(sw.body.error, /TURN_KEY_ID 64 caratteri, TURN_KEY_API_TOKEN 32 caratteri/);
  assert.deepEqual(nf.calls.map(c => c.url.split('/credentials/')[1]), ['generate-ice-servers', 'generate'], 'su 404 anche l’indirizzo vecchio');
  // l'indirizzo vecchio risponde (un solo oggetto): credenziali date
  const old = await call({ cf: (() => { let n = 0; return () => n++ ? new Response(JSON.stringify({ iceServers: { urls: ['turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' } }), { status: 201 }) : new Response('{}', { status: 404 }); })() });
  assert.equal(old.res.status, 200); assert.deepEqual(old.body.iceServers, [{ urls: ['turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' }]);
  assert.match(explain(401, id32, tok64), /non accetta il token/);
  assert.match(explain(500, 'x', 'y'), /ha risposto 500/);
});

test('pacchetto Cloudflare: dist + _headers + natpf/turn.json; senza --turn-url nessun file; controlli', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-pacchetto-'));
  try {
    const dist = path.join(tmp, 'dist');
    fs.mkdirSync(path.join(dist, 'natpf/tennis'), { recursive: true });
    fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html>');
    fs.writeFileSync(path.join(dist, 'natpf/tennis/racchetta.html'), '<!doctype html>');
    const headers = path.join(tmp, '_headers');
    fs.writeFileSync(headers, fs.readFileSync(new URL('../../site/_headers', import.meta.url)));
    const r = makePackage({ out: path.join(tmp, 'a'), turnUrl: 'https://turn.example.workers.dev', dist, headers });
    assert.deepEqual(r.files, ['_headers', 'index.html', 'natpf/tennis/racchetta.html', TURN_JSON]);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(r.dest, TURN_JSON), 'utf8')), { url: 'https://turn.example.workers.dev/' });
    assert.equal(fs.readFileSync(path.join(r.dest, '_headers'), 'utf8'), fs.readFileSync(headers, 'utf8'));
    fs.mkdirSync(path.join(tmp, 'b')); // anche una destinazione già esistente ma vuota è supportata
    const plain = makePackage({ out: path.join(tmp, 'b'), dist, headers });
    assert.ok(!plain.files.includes(TURN_JSON));
    assert.throws(() => makePackage({ out: path.join(tmp, 'a'), dist, headers }), /non è vuota/);
    assert.throws(() => makePackage({ out: path.join(dist, 'x'), dist, headers }), /dentro dist/);
    assert.throws(() => makePackage({ out: path.join(tmp, 'c'), dist: path.join(tmp, 'manca'), headers }), /build mancante/);
    assert.throws(() => checkTurnUrl('http://turn.example.workers.dev/'), /https/);
    assert.throws(() => checkTurnUrl('https://u:p@turn.example.workers.dev/'), /segreti/);
    assert.equal(checkTurnUrl('http://127.0.0.1:8787'), 'http://127.0.0.1:8787/');
    // _headers del sito: non impedisce di leggere il json né di chiamare il Worker
    assert.deepEqual(headersProblems(fs.readFileSync(headers, 'utf8'), { turnUrl: 'https://turn.example.workers.dev/' }), []);
    assert.equal(headersProblems('/natpf/*\n  Content-Type: text/plain\n').length, 1);
    assert.equal(headersProblems("/*\n  Content-Security-Policy: default-src 'self'\n", { turnUrl: 'https://turn.example.workers.dev/' }).length, 3);
    // B21: il trailer dell'intro si scarica dal bucket R2. _headers di oggi non lo impedisce; una Content-Security-Policy
    // senza quel bucket in media-src (o default-src) sì; e il file del trailer non deve finire nel pacchetto
    const r2 = mediaOrigin();
    assert.equal(r2, 'https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev');
    assert.deepEqual(headersProblems(fs.readFileSync(headers, 'utf8'), { mediaUrl: r2 }), []);
    assert.equal(headersProblems("/*\n  Content-Security-Policy: default-src 'self'\n", { mediaUrl: r2 }).length, 2, 'le due pagine del gioco');
    assert.equal(headersProblems("/*\n  Content-Security-Policy: default-src 'self'; media-src 'self' https://altro.example\n", { mediaUrl: r2 }).length, 2);
    assert.deepEqual(headersProblems(`/*\n  Content-Security-Policy: default-src 'self'; media-src 'self' ${r2}\n`, { mediaUrl: r2 }), []);
    assert.deepEqual(headersProblems("/*\n  Content-Security-Policy: default-src 'self'; media-src https:\n", { mediaUrl: r2 }), []);
    assert.deepEqual(headersProblems("/natpf/tennis/*\n  Content-Security-Policy: default-src 'self'\n", { mediaUrl: r2 }), [], 'la pagina del telefono non ha il video');
    const csp = path.join(tmp, '_headers-csp'); fs.writeFileSync(csp, "/*\n  Content-Security-Policy: default-src 'self' https:; media-src 'self'\n");
    assert.throws(() => makePackage({ out: path.join(tmp, 'd'), dist, headers: csp }), /video dell'intro/);
    fs.mkdirSync(path.join(dist, 'media')); fs.writeFileSync(path.join(dist, 'media/trailer-0123456789ab.mp4'), 'x');
    assert.throws(() => makePackage({ out: path.join(tmp, 'e'), dist, headers }), /trailer dell'intro non deve stare nel pacchetto/);
    assert.ok(!fs.existsSync(path.join(tmp, 'e')), 'niente cartella a metà');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
