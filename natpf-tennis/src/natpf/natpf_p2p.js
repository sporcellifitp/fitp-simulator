// Sfida tra due computer senza server (sito statico): il relay della partita gira nel browser dell'host e il Player 2
// gli parla in WebRTC (PeerJS, lo stesso server di segnalazione pubblico del telefono-racchetta).
// Motore e motion_controls non cambiano: qui si intercetta soltanto window.fetch per /api/match/*, /api/racket/*,
// /api/body e /api/tunnel/* quando la modalità p2p è attiva.
//   host: le richieste le serve una copia in memoria di scripts/match-relay.mjs (lo stesso modulo del server Vite e
//         del server LAN, eseguito con richiesta e risposta finte); il P2 si collega al Peer «natpf-sfida-<stanza>».
//   P2:   le richieste diventano RPC sulla DataConnection verso l'host, che risponde con lo stesso JSON del server.
// Si attiva da sola quando il server non ha le API (/api/match/create risponde 404, HTML o errore di rete), oppure con
// ?net=p2p. Il link di invito porta ?room=<id>&role=p2&net=p2p. In LAN e con npm run dev resta tutto come prima.
import { createMatchRelay } from '../../scripts/match-relay.mjs';
import { peerConfig } from '@natpf/tennis/link.js';

export const P2P_PREFIX = 'natpf-sfida-';
const NATPF_BASE = '/natpf/';
// Id del Peer dell'host dalla stanza (PeerJS: lettere, cifre e trattini, inizio e fine alfanumerici)
export const peerIdForRoom = roomId => P2P_PREFIX + String(roomId || '').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+$/, '');
export const p2pRequested = (search = globalThis.location?.search || '') => new URLSearchParams(search).get('net') === 'p2p';
// percorsi del relay della partita (gli stessi di scripts/match-relay.mjs)
export const isRelayPath = pathname => /^\/api\/(match|racket|tunnel)\/|^\/api\/body$/.test(pathname || '');
// cosa può chiedere il P2 all'host: stato e colpi, non lo snapshot (l'host resta autorevole) né nuove stanze
const REMOTE_ALLOWED = new Set(['GET /api/match/state', 'GET /api/racket/state', 'GET /api/tunnel/status', 'POST /api/racket/swing', 'POST /api/racket/telemetry', 'POST /api/racket/feedback', 'POST /api/body']);
export const remoteAllowed = (method, pathname) => REMOTE_ALLOWED.has(`${String(method || 'GET').toUpperCase()} ${pathname}`);
export const LIVE_MS = 5000;          // senza messaggi per 5 s il collegamento è perso (come il telefono)
const RPC_TIMEOUT_MS = 4000;

/* ---------- relay della partita nel browser ---------- */
// Esegue il middleware (req, res, next) di match-relay.mjs con una richiesta e una risposta finte: stesse stanze,
// stessi campi, stesso JSON. Restituisce { status, text }.
export function createLocalRelay({ relay = createMatchRelay({ publicUrl: '' }), host = 'localhost' } = {}){
  const handle = ({ method = 'GET', url = '/', body = null } = {}) => new Promise(resolve => {
    const text = body == null ? '' : typeof body === 'string' ? body : JSON.stringify(body);
    const req = {
      method: String(method).toUpperCase(), url, headers: { host, 'content-type': 'application/json' },
      // il relay legge il corpo con on('data') / on('end'): si consegna dopo che si è messo in ascolto
      on(ev, fn){ if (ev === 'data' && text) queueMicrotask(() => fn(text)); if (ev === 'end') queueMicrotask(fn); return this; },
    };
    const headers = {};
    const res = { statusCode: 200, setHeader(k, v){ headers[k.toLowerCase()] = v; }, end(s = ''){ resolve({ status: this.statusCode, text: String(s ?? ''), headers }); } };
    Promise.resolve(relay(req, res, () => resolve({ status: 404, text: '', headers }))).catch(() => resolve({ status: 500, text: '', headers }));
  });
  return { relay, handle, rooms: relay.rooms };
}
const toResponse = ({ status, text }) => new Response(status === 204 ? null : text, { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

/* ---------- RPC su un canale (DataConnection di PeerJS o canale finto nei test) ---------- */
// Canale: send(obj), on('data'|'open'|'close'|'error', fn), close(), open. Messaggi:
//   P2 → host  { t: 'hi', room }  { t: 'rq', i, m, u, b }      host → P2  { t: 'rs', i, s, b }  { t: 'no', why }
export function createRpcClient(conn, { timeoutMs = RPC_TIMEOUT_MS, onMessage = null } = {}){
  let seq = 0;
  const pending = new Map();
  const fail = why => { for (const [, p] of pending){ clearTimeout(p.timer); p.reject(new TypeError(why)); } pending.clear(); };
  conn.on('data', d => {
    onMessage?.(d);
    if (!d || d.t !== 'rs') return;
    const p = pending.get(d.i); if (!p) return;
    pending.delete(d.i); clearTimeout(p.timer); p.resolve({ status: Number(d.s) || 200, text: typeof d.b === 'string' ? d.b : '' });
  });
  conn.on('close', () => fail('collegamento con l’host chiuso'));
  return {
    request({ method = 'GET', url = '/', body = null } = {}){
      if (!conn.open) return Promise.reject(new TypeError('host non collegato'));
      const i = ++seq;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(i); reject(new TypeError('host senza risposta')); }, timeoutMs);
        pending.set(i, { resolve, reject, timer });
        try { conn.send({ t: 'rq', i, m: String(method).toUpperCase(), u: url, b: body == null ? null : typeof body === 'string' ? body : JSON.stringify(body) }); }
        catch (e){ clearTimeout(timer); pending.delete(i); reject(new TypeError('invio non riuscito')); }
      });
    },
    get pending(){ return pending.size; },
    close: fail,
  };
}
// Lato host: risponde alle richieste del P2 con il relay locale, solo per la propria stanza e i percorsi permessi.
export function serveRpc(conn, { roomId, handle, onMessage = null }){
  conn.on('data', async d => {
    onMessage?.(d);
    if (!d || d.t !== 'rq' || typeof d.u !== 'string' || d.u.length > 2048) return;
    let url;
    try { url = new URL(d.u, 'http://p2p.invalid'); } catch { return; }
    const reply = (s, b = '') => { try { if (conn.open) conn.send({ t: 'rs', i: d.i, s, b }); } catch {} };
    if (!remoteAllowed(d.m, url.pathname)) return reply(403, JSON.stringify({ ok: false, error: 'non permesso' }));
    // il P2 parla sempre della stanza dell'host
    url.searchParams.set('room', roomId);
    let body = typeof d.b === 'string' && d.b.length <= 65536 ? d.b : null;
    if (body){ try { const o = JSON.parse(body); if (o && typeof o === 'object'){ o.room = roomId; body = JSON.stringify(o); } } catch {} }
    const res = await handle({ method: d.m, url: url.pathname + url.search, body });
    reply(res.status, res.text);
  });
}

/* ---------- caricamento di PeerJS (come il telefono-racchetta) ---------- */
let peerLib = null;
export function loadPeer(){
  if (globalThis.window?.Peer) return Promise.resolve(window.Peer);
  return peerLib || (peerLib = new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = `${NATPF_BASE}js/vendor/peerjs.min.js`;
    s.onload = () => resolve(window.Peer); s.onerror = () => { peerLib = null; reject(new Error('peerjs')); };
    document.head.appendChild(s);
  }));
}

const emitter = () => {
  const fns = new Set();
  return { on(fn){ fns.add(fn); return () => fns.delete(fn); }, emit(v){ for (const fn of fns) try { fn(v); } catch (e){ console.error(e); } } };
};

/* ---------- host: Peer con l'id della stanza, un Player 2 alla volta ---------- */
// status: starting → waiting (nessun P2) → connected → lost (P2 sparito: si ricollega da solo) · error (segnalazione)
export function createP2pHost({ Peer, roomId, handle, options = {}, now = () => Date.now(), timers = globalThis }){
  const ev = emitter();
  const S = { status: 'starting', error: null, peerId: peerIdForRoom(roomId), lastSeen: 0, guests: 0 };
  const set = patch => { const before = S.status + S.error; Object.assign(S, patch); if (before !== S.status + S.error) ev.emit({ ...S }); };
  let conn = null, destroyed = false, settle;
  const ready = new Promise(r => { settle = r; });
  const peer = new Peer(S.peerId, options);
  peer.on('open', () => { set({ status: conn?.open ? 'connected' : 'waiting', error: null }); settle({ ok: true }); });
  peer.on('connection', c => {
    let ok = false;
    const seen = () => { if (c === conn) S.lastSeen = now(); };
    c.on('data', d => {
      if (!ok){
        // presentazione: solo chi conosce la stanza; un nuovo P2 (o lo stesso che si ricollega) prende il posto del vecchio
        if (!d || d.t !== 'hi' || String(d.room || '').toUpperCase() !== String(roomId).toUpperCase()){ try { c.send({ t: 'no', why: 'stanza' }); } catch {} timers.setTimeout(() => c.close(), 200); return; }
        ok = true;
        if (conn && conn !== c) try { conn.close(); } catch {}
        conn = c; S.guests++; seen(); set({ status: 'connected', error: null });
        try { c.send({ t: 'ok', room: roomId }); } catch {}
        return;
      }
      seen();
    });
    serveRpc(c, { roomId, handle: req => ok && c === conn ? handle(req) : Promise.resolve({ status: 403, text: '' }) });
    c.on('close', () => { if (c === conn){ conn = null; set({ status: destroyed ? 'off' : 'lost' }); } });
    c.on('error', () => {});
  });
  // persa la segnalazione: le connessioni aperte restano, ci si registra di nuovo per le prossime
  peer.on('disconnected', () => { if (!destroyed) timers.setTimeout(() => { if (!destroyed && !peer.destroyed) try { peer.reconnect(); } catch {} }, 1500); });
  peer.on('error', e => {
    const type = e?.type || String(e);
    if (type === 'peer-unavailable') return;
    if (S.status === 'starting') settle({ ok: false, error: type });
    set({ status: conn?.open ? S.status : 'error', error: type });
  });
  // il P2 interroga lo stato ogni 50 ms: se tace per 5 s è scollegato (anche se WebRTC non se ne è ancora accorto)
  const watch = timers.setInterval(() => { if (conn && S.status === 'connected' && now() - S.lastSeen > LIVE_MS) set({ status: 'lost' }); if (conn && S.status === 'lost' && now() - S.lastSeen <= LIVE_MS) set({ status: 'connected' }); }, 1000);
  return {
    get state(){ return { ...S }; },
    ready, onStatus: ev.on,
    destroy(){ destroyed = true; timers.clearInterval(watch); try { conn?.close(); } catch {} try { peer.destroy(); } catch {} set({ status: 'off' }); },
  };
}

/* ---------- Player 2: si collega all'host e si ricollega da solo ---------- */
// status: starting → connecting → connected → lost (riprova ogni pochi secondi) · error (segnalazione non raggiungibile)
export function createP2pGuest({ Peer, roomId, options = {}, now = () => Date.now(), timers = globalThis, retryMs = [1000, 2000, 3000, 5000] }){
  const ev = emitter();
  const S = { status: 'starting', error: null, hostId: peerIdForRoom(roomId), attempts: 0, lastSeen: 0 };
  const set = patch => { const before = S.status + S.error; Object.assign(S, patch); if (before !== S.status + S.error) ev.emit({ ...S }); };
  let conn = null, rpc = null, destroyed = false, retryT = null, openT = null, peerOpen = false;
  const peer = new Peer(undefined, options);
  const retry = () => {
    if (destroyed || retryT) return;
    const wait = retryMs[Math.min(S.attempts, retryMs.length - 1)];
    retryT = timers.setTimeout(() => { retryT = null; connect(); }, wait);
  };
  function drop(c){
    if (c !== conn) return;
    conn = null; rpc = null; timers.clearTimeout(openT);
    if (!destroyed){ set({ status: S.lastSeen ? 'lost' : 'connecting' }); retry(); }
  }
  function connect(){
    if (destroyed || !peerOpen || conn) return;
    S.attempts++;
    if (S.status !== 'lost') set({ status: 'connecting' });
    const c = conn = peer.connect(S.hostId, { reliable: true, serialization: 'json' });
    if (!c){ conn = null; retry(); return; }
    let ok = false;
    rpc = createRpcClient(c, { onMessage: d => {
      if (c !== conn) return;
      S.lastSeen = now();
      if (d?.t === 'ok' && !ok){ ok = true; S.attempts = 0; set({ status: 'connected', error: null }); }
      if (d?.t === 'no'){ set({ status: 'error', error: 'stanza' }); }
    } });
    c.on('open', () => { try { c.send({ t: 'hi', room: roomId }); } catch {} });
    c.on('close', () => drop(c));
    c.on('error', () => { try { c.close(); } catch {} drop(c); });
    // l'host non risponde entro 8 s (non è online, rete che blocca WebRTC): si chiude e si riprova
    openT = timers.setTimeout(() => { if (c === conn && !ok){ try { c.close(); } catch {} drop(c); } }, 8000);
  }
  peer.on('open', () => { peerOpen = true; connect(); });
  peer.on('disconnected', () => { if (!destroyed) timers.setTimeout(() => { if (!destroyed && !peer.destroyed) try { peer.reconnect(); } catch {} }, 1500); });
  peer.on('error', e => {
    const type = e?.type || String(e);
    // host non ancora (o non più) registrato: si riprova
    if (type === 'peer-unavailable'){ const c = conn; if (c){ try { c.close(); } catch {} drop(c); } else retry(); if (S.status !== 'lost') set({ status: 'connecting' }); return; }
    set({ status: conn?.open ? S.status : 'error', error: type });
    if (!conn) retry();
  });
  // l'host tace da 5 s (scheda chiusa, rete persa): si chiude e si riprova
  const watch = timers.setInterval(() => {
    if (conn && S.status === 'connected' && now() - S.lastSeen > LIVE_MS){ const c = conn; try { c.close(); } catch {} drop(c); }
  }, 1000);
  return {
    get state(){ return { ...S }; },
    get connected(){ return S.status === 'connected' && !!conn?.open; },
    onStatus: ev.on,
    request(req){ return rpc && S.status === 'connected' ? rpc.request(req) : Promise.reject(new TypeError('host non collegato')); },
    destroy(){ destroyed = true; timers.clearInterval(watch); timers.clearTimeout(retryT); timers.clearTimeout(openT); try { conn?.close(); } catch {} try { peer.destroy(); } catch {} set({ status: 'off' }); },
  };
}

/* ---------- il server ha le API della partita? ---------- */
// Sul sito statico /api/match/create dà 404, oppure la pagina HTML del sito (fallback delle single page app).
export async function serverHasMatchApi(response){
  if (!response || !response.ok) return false;
  if (!/json/i.test(response.headers?.get?.('content-type') || '')) return false;
  try { const j = await response.clone().json(); return !!j?.roomId; } catch { return false; }
}

/* ---------- installazione: intercetta fetch per i percorsi del relay ---------- */
export function installNatpfP2p({ win = globalThis.window, Peer = null, peerOptions = null } = {}){
  const ev = emitter();
  const params = new URLSearchParams(win?.location?.search || '');
  const role = (params.get('role') || 'p1').toLowerCase() === 'p2' ? 'p2' : 'p1';
  const room = (params.get('room') || '').trim().toUpperCase();
  const forced = p2pRequested(win?.location?.search || '');
  const api = {
    mode: null, status: 'off', error: null, roomId: null, local: null, host: null, guest: null,
    onStatus: ev.on,
    get active(){ return !!api.mode; },
  };
  const relayStatus = s => { api.status = s.status; api.error = s.error || null; ev.emit({ mode: api.mode, status: api.status, error: api.error, roomId: api.roomId }); };
  const getPeer = async () => Peer || await loadPeer();
  // server di segnalazione: quello del telefono-racchetta (pubblico di PeerJS, o ?peer=… per le prove)
  const options = () => { if (peerOptions) return peerOptions; try { return peerConfig(); } catch { return { debug: 0 }; } };
  if (!win?.fetch) return api;
  const original = win.fetch.bind(win);

  // P2 arrivato con il link di invito p2p: le richieste vanno all'host
  if (forced && role === 'p2' && room && room !== 'DEFAULT'){
    api.mode = 'guest'; api.roomId = room; api.status = 'starting';
    getPeer().then(P => { api.guest = createP2pGuest({ Peer: P, roomId: room, options: options() }); api.guest.onStatus(relayStatus); relayStatus(api.guest.state); })
      .catch(() => relayStatus({ status: 'error', error: 'libreria' }));
  }
  // una stanza alla volta: due richieste ravvicinate non devono lasciare il motore su una stanza senza Peer
  let creating = Promise.resolve();
  const startHost = body => (creating = creating.then(() => createHostRoom(body), () => createHostRoom(body)));
  async function createHostRoom(body){
    api.mode = 'host'; api.local ||= createLocalRelay({ host: win.location?.host || 'localhost' });
    let res = null, json = null;
    // id del Peer già preso da un'altra stanza (raro): nuova stanza
    for (let tries = 0; tries < 3; tries++){
      res = await api.local.handle({ method: 'POST', url: '/api/match/create', body });
      json = JSON.parse(res.text);
      api.roomId = json.roomId;
      api.host?.destroy();
      try {
        const P = await getPeer();
        api.host = createP2pHost({ Peer: P, roomId: json.roomId, handle: api.local.handle, options: options() });
        api.host.onStatus(relayStatus); relayStatus(api.host.state);
        const r = await Promise.race([api.host.ready, new Promise(ok => setTimeout(() => ok({ ok: false, error: 'timeout' }), 8000))]);
        if (r.ok || r.error !== 'unavailable-id') break;
      } catch { relayStatus({ status: 'error', error: 'libreria' }); break; }
    }
    return toResponse({ status: res.status, text: JSON.stringify({ ...json, net: 'p2p', peerId: peerIdForRoom(json.roomId) }) });
  }

  win.fetch = async (input, init = {}) => {
    let url;
    try { url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, win.location.href); } catch { return original(input, init); }
    if (url.origin !== win.location.origin || !isRelayPath(url.pathname)) return original(input, init);
    const method = String(init.method || input?.method || 'GET').toUpperCase(), body = init.body ?? null;
    if (api.mode === 'guest'){
      if (!api.guest) throw new TypeError('host non collegato');
      return toResponse(await api.guest.request({ method, url: url.pathname + url.search, body }));
    }
    if (api.mode === 'host'){
      // una nuova stanza (nuova sfida dal menu) riparte da capo con il proprio Peer
      if (url.pathname === '/api/match/create' && method === 'POST') return startHost(body);
      return toResponse(await api.local.handle({ method, url: url.pathname + url.search, body }));
    }
    if (url.pathname === '/api/match/create' && method === 'POST'){
      if (!forced){
        try { const r = await original(input, init); if (await serverHasMatchApi(r)) return r; } catch {}
      }
      return startHost(body);
    }
    return original(input, init);
  };
  return api;
}
