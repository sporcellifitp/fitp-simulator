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
import { peerConfig, iceReady } from '@natpf/tennis/link.js';
import { watchRoute } from '@natpf/tennis/ice-route.js';

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
export const CLOSED_MS = 20000;       // host introvabile per 20 s: probabilmente ha chiuso la stanza
export const OPEN_MS = 12000;         // P2: il canale con l'host non si apre in 12 s → si chiude e si riprova (prima 8 s)
export const HOST_OPEN_MS = 15000;    // host: un P2 che non apre il canale in 15 s ha la rete che lo blocca
// … ma se l'altro computer ha risposto (ICE «checking») la strada si sta cercando, magari attraverso un server di inoltro
// (TURN): si aspetta fino a 30 s, come il telefono (link.js). Prima il P2 chiudeva a 12 s le reti lente
export const OPEN_MAX_MS = 30000;
const RPC_TIMEOUT_MS = 4000;
// PeerJS (serializzazione «json», la nostra) scarta in silenzio i messaggi da 16300 byte in su («Message too big for
// JSON channel»): la risposta si manda a pezzi sotto questa misura. In caratteri: al massimo 3 byte UTF-8 ciascuno
export const RPC_CHUNK_CHARS = 4500;

/* ---------- collegamento diretto (ICE): perché un canale non si apre ---------- */
// Segnalazione e canale sono due cose diverse. Il server pubblico mette in contatto i due computer (offerta e risposta);
// poi i browser cercano una strada diretta (ICE): rete locale (candidati «host»), indirizzo pubblico trovato con STUN
// («srflx»), server TURN («relay»). Se l'altro computer risponde (stato ICE «checking») ma il canale non si apre, è la
// rete a bloccare la strada diretta (firewall, NAT simmetrico, VPN): prima il P2 restava su «Mi collego…» e l'host su
// «In attesa del Player 2…», senza dire niente.
export function candidateType(c){
  if (!c) return null;
  if (c.type) return String(c.type);
  return / typ ([a-z]+)/.exec(String(c.candidate || ''))?.[1] || null;
}
// Segue una DataConnection di PeerJS: stato ICE (iceStateChanged), se l'altro ha risposto, se ICE è fallito, tipi dei
// candidati trovati da questo browser
export function watchIce(c){
  const info = { ice: 'new', answered: false, failed: false, local: new Set() };
  try { c.peerConnection?.addEventListener?.('icecandidate', e => { const t = candidateType(e.candidate); if (t) info.local.add(t); }); } catch {}
  c.on?.('iceStateChanged', st => {
    info.ice = String(st);
    if (st === 'checking' || st === 'connected' || st === 'completed') info.answered = true;
    if (st === 'failed') info.failed = true;
  });
  c.on?.('error', e => { if (e?.type === 'negotiation-failed') info.failed = true; });
  return info;
}
// riassunto per la diagnostica: «checking · host+srflx» (senza srflx: STUN bloccato; senza relay: nessun TURN)
export const iceSummary = info => info ? `${info.ice} · ${[...info.local].sort().join('+') || 'nessun candidato'}` : null;
// canale mai aperto: la rete lo blocca se l'altro computer aveva risposto (o ICE è fallito)
export const iceBlocked = info => !!info && (info.failed || info.answered);

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

/* ---------- stato della partita per il P2: solo quello che gli serve ---------- */
// Diagnosi del 30/10 (blocco nel secondo game con la versione Cloudflare): /api/match/state portava al P2 lo storico dei
// colpi due volte (p1/p2 e rackets) con i dati NATPF di ogni colpo, ~1,4 KB a colpo. Dopo una decina di colpi del P2 la
// risposta superava i 16300 byte e PeerJS la scartava senza dirlo: il P2 non riceveva più niente («Collegamento con
// Player 1 perso») mentre l'host lo vedeva collegato (le sue richieste arrivavano). Anche sotto quella misura erano fino
// a 400 KB/s verso il P2 (20 letture al secondo). Ora al P2 vanno gli ultimi COMPACT_SWINGS colpi di ciascuno, senza la
// copia «rackets» (nessuno la legge). L'host legge il relay in locale e resta com'era.
export const COMPACT_SWINGS = 3;
export function compactMatchState(text, { keep = COMPACT_SWINGS } = {}){
  let j;
  try { j = JSON.parse(text); } catch { return text; }
  if (!j || typeof j !== 'object') return text;
  delete j.rackets;
  for (const k of ['p1', 'p2']) if (Array.isArray(j[k]?.swingHistory)) j[k].swingHistory = j[k].swingHistory.slice(-keep);
  return JSON.stringify(j);
}
// risposta divisa in pezzi da mandare uno per messaggio (un solo pezzo se è piccola)
export function chunkText(text, size = RPC_CHUNK_CHARS){
  const s = String(text ?? ''), out = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out.length ? out : [''];
}

/* ---------- RPC su un canale (DataConnection di PeerJS o canale finto nei test) ---------- */
// Canale: send(obj), on('data'|'open'|'close'|'error', fn), close(), open. Messaggi:
//   P2 → host  { t: 'hi', room, id }  { t: 'rq', i, m, u, b }      host → P2  { t: 'rs', i, s, b[, k, n] }  { t: 'no', why }
// Una risposta grande arriva in n pezzi (k = 0…n−1) con lo stesso i: si ricompone qui.
export function createRpcClient(conn, { timeoutMs = RPC_TIMEOUT_MS, onMessage = null } = {}){
  let seq = 0;
  const pending = new Map();
  const fail = why => { for (const [, p] of pending){ clearTimeout(p.timer); p.reject(new TypeError(why)); } pending.clear(); };
  conn.on('data', d => {
    onMessage?.(d);
    if (!d || d.t !== 'rs') return;
    const p = pending.get(d.i); if (!p) return;
    let text = typeof d.b === 'string' ? d.b : '';
    const n = Number(d.n) || 1;
    if (n > 1){
      const k = Number(d.k);
      if (!Number.isInteger(k) || k < 0 || k >= n || n > 64) return;
      (p.parts ||= new Array(n))[k] = text;
      if (p.parts.filter(x => x != null).length < n) return;
      text = p.parts.join('');
    }
    pending.delete(d.i); clearTimeout(p.timer); p.resolve({ status: Number(d.s) || 200, text });
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
    // a pezzi se serve (vedi RPC_CHUNK_CHARS): prima una risposta troppo grande non partiva e il P2 aspettava invano
    const reply = (s, b = '') => {
      const parts = chunkText(b);
      try { if (conn.open) parts.forEach((part, k) => conn.send(parts.length > 1 ? { t: 'rs', i: d.i, s, b: part, k, n: parts.length } : { t: 'rs', i: d.i, s, b: part })); } catch {}
    };
    if (!remoteAllowed(d.m, url.pathname)) return reply(403, JSON.stringify({ ok: false, error: 'non permesso' }));
    // il P2 parla sempre della stanza dell'host
    url.searchParams.set('room', roomId);
    let body = typeof d.b === 'string' && d.b.length <= 65536 ? d.b : null;
    if (body){ try { const o = JSON.parse(body); if (o && typeof o === 'object'){ o.room = roomId; body = JSON.stringify(o); } } catch {} }
    const res = await handle({ method: d.m, url: url.pathname + url.search, body });
    reply(res.status, d.m === 'GET' && url.pathname === '/api/match/state' && res.status === 200 ? compactMatchState(res.text) : res.text);
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
// error 'rete' (status in attesa o P2 perso): un P2 ha aperto il link ma il canale diretto non si apre (detail: stato
// ICE e candidati di questo computer, blocked: quante volte)
// onRoute / route: strada del collegamento con il P2 (ice-route.js: tipi dei candidati, protocollo, TURN), letta
// all'ingresso del P2 e poi al massimo ogni 10 s; avvisa solo se cambia (diagnostica: sfida.strada)
export function createP2pHost({ Peer, roomId, handle, options = {}, now = () => Date.now(), timers = globalThis, openMs = HOST_OPEN_MS, openMaxMs = OPEN_MAX_MS, watch = watchRoute }){
  const ev = emitter(), routeEv = emitter();
  let route = null, stopRoute = () => {};
  const follow = c => { stopRoute(); route = null; stopRoute = watch(c.peerConnection, r => { if (c === conn){ route = r; routeEv.emit(r); } }, { timers }); };
  const S = { status: 'starting', error: null, peerId: peerIdForRoom(roomId), lastSeen: 0, guests: 0, blocked: 0, detail: null, guestId: null };
  const set = patch => { const before = S.status + S.error + S.blocked; Object.assign(S, patch); if (before !== S.status + S.error + S.blocked) ev.emit({ ...S }); };
  let conn = null, destroyed = false, settle, peer = null, again = null;
  const ready = new Promise(r => { settle = r; });
  const pending = new Set();          // tempi massimi dei canali in apertura (si annullano alla chiusura della stanza)
  // un errore della segnalazione prima di registrarsi distrugge il Peer (PeerJS): se ne crea uno nuovo con lo stesso
  // id dopo qualche secondo (prima l'invito restava legato a un Peer distrutto)
  const restart = () => { if (destroyed || again) return; again = timers.setTimeout(() => { again = null; if (!destroyed && (!peer || peer.destroyed)) make(); }, 3000); };
  function make(){
  peer = new Peer(S.peerId, options);
  peer.on('open', () => { set({ status: conn?.open ? 'connected' : 'waiting', error: null }); settle({ ok: true }); });
  peer.on('connection', c => {
    let ok = false, opened = false, flagged = false;
    const seen = () => { if (c === conn) S.lastSeen = now(); };
    // un P2 che ha aperto il link ma non arriva: ICE fallito o canale ancora chiuso dopo openMs. Non se c'è già un P2
    // in partita (un secondo tentativo non cambia nulla per chi gioca). Lo stato resta (in attesa o P2 perso)
    const ice = watchIce(c), t0 = now();
    // tempo massimo di apertura: openMs, fino a OPEN_MAX_MS se ICE sta ancora cercando la strada («checking»)
    let openT = null;
    const arm = ms => { openT = timers.setTimeout(() => { pending.delete(openT); if (ice.ice === 'checking' && !ice.failed && now() - t0 < openMaxMs) arm(openMaxMs - (now() - t0)); else blocked(); }, ms); pending.add(openT); };
    arm(openMs);
    const stopT = () => { timers.clearTimeout(openT); pending.delete(openT); };
    const blocked = () => {
      stopT();
      if (flagged || ok || opened || destroyed || conn?.open) return;
      flagged = true; S.detail = iceSummary(ice);
      set({ error: 'rete', blocked: S.blocked + 1 });
    };
    c.on('iceStateChanged', st => { if (st === 'failed') blocked(); });
    c.on('open', () => { opened = true; stopT(); });
    c.on('data', d => {
      if (!ok){
        // presentazione: solo chi conosce la stanza; un nuovo P2 (o lo stesso che si ricollega) prende il posto del vecchio
        if (!d || d.t !== 'hi' || String(d.room || '').toUpperCase() !== String(roomId).toUpperCase()){ try { c.send({ t: 'no', why: 'stanza' }); } catch {} timers.setTimeout(() => c.close(), 200); return; }
        // un secondo P2 mentre il primo è vivo (link aperto due volte, inoltrato in un gruppo): rifiutato. Prima il
        // nuovo prendeva il posto del vecchio, che si ricollegava e lo scalzava, all'infinito. Chi ricarica la pagina
        // rientra appena il vecchio collegamento tace (LIVE_MS). Lo stesso P2 (stesso id di ripresa, «Riconnetti» o pagina
        // ricaricata) prende subito il posto del suo vecchio collegamento
        const same = !!d.id && d.id === S.guestId;
        if (conn && conn !== c && conn.open && now() - S.lastSeen <= LIVE_MS && !same){ try { c.send({ t: 'no', why: 'occupata' }); } catch {} timers.setTimeout(() => c.close(), 200); return; }
        ok = true; stopT();
        if (conn && conn !== c) try { conn.close(); } catch {}
        conn = c; S.guests++; S.blocked = 0; S.guestId = typeof d.id === 'string' ? d.id.slice(0, 40) : null; seen(); set({ status: 'connected', error: null });
        follow(c);
        try { c.send({ t: 'ok', room: roomId }); } catch {}
        return;
      }
      seen();
    });
    serveRpc(c, { roomId, handle: req => ok && c === conn ? handle(req) : Promise.resolve({ status: 403, text: '' }) });
    c.on('close', () => { if (!opened && iceBlocked(ice)) blocked(); stopT(); if (c === conn){ conn = null; stopRoute(); route = null; set({ status: destroyed ? 'off' : 'lost' }); } });
    c.on('error', e => { if (e?.type === 'negotiation-failed') blocked(); });
  });
  // persa la segnalazione: le connessioni aperte restano, ci si registra di nuovo per le prossime
  peer.on('disconnected', () => { if (!destroyed) timers.setTimeout(() => { if (!destroyed && !peer.destroyed) try { peer.reconnect(); } catch {} }, 1500); });
  peer.on('error', e => {
    const type = e?.type || String(e);
    if (type === 'peer-unavailable') return;
    if (S.status === 'starting') settle({ ok: false, error: type });
    set({ status: conn?.open ? S.status : 'error', error: type });
    if (type !== 'unavailable-id' && (peer.destroyed || !peer.open)) restart();
  });
  }
  make();
  // il P2 interroga lo stato ogni 50 ms: se tace per 5 s è scollegato (anche se WebRTC non se ne è ancora accorto)
  const alive = timers.setInterval(() => { if (conn && S.status === 'connected' && now() - S.lastSeen > LIVE_MS) set({ status: 'lost' }); if (conn && S.status === 'lost' && now() - S.lastSeen <= LIVE_MS) set({ status: 'connected' }); }, 1000);
  return {
    get state(){ return { ...S }; },
    get route(){ return route; },
    ready, onStatus: ev.on, onRoute: routeEv.on,
    destroy(){ destroyed = true; stopRoute(); timers.clearInterval(alive); timers.clearTimeout(again); for (const t of pending) timers.clearTimeout(t); pending.clear(); try { conn?.close(); } catch {} try { peer?.destroy(); } catch {} set({ status: 'off' }); },
  };
}

/* ---------- Player 2: si collega all'host e si ricollega da solo ---------- */
// status: starting → connecting → connected → lost (riprova ogni pochi secondi) · error (segnalazione non raggiungibile)
// error mentre riprova: 'rete' (l'host risponde ma il canale diretto non si apre: blocked tentativi, detail ICE),
// 'chiusa' (host introvabile o muto da CLOSED_MS), 'occupata' (c'è già un altro Player 2)
// resumeId: identità di ripresa di questo P2 (resta la stessa se ricarica la pagina, resumeIdFor): l'host lo riconosce e gli
// ridà subito il posto. reconnect(): «Riconnetti», un nuovo tentativo subito (un solo tentativo alla volta)
export function createP2pGuest({ Peer, roomId, options = {}, now = () => Date.now(), timers = globalThis, retryMs = [1000, 2000, 3000, 5000], openMs = OPEN_MS, openMaxMs = OPEN_MAX_MS, resumeId = null, watch = watchRoute }){
  const ev = emitter(), routeEv = emitter();
  // strada del collegamento con l'host (come createP2pHost)
  let route = null, stopRoute = () => {};
  const S = { status: 'starting', error: null, hostId: peerIdForRoom(roomId), attempts: 0, lastSeen: 0, missingSince: 0, blocked: 0, detail: null };
  const set = patch => { const before = S.status + S.error + S.blocked; Object.assign(S, patch); if (before !== S.status + S.error + S.blocked) ev.emit({ ...S }); };
  let conn = null, rpc = null, destroyed = false, retryT = null, openT = null, peerOpen = false, peer = null;
  const retry = (wait = retryMs[Math.min(S.attempts, retryMs.length - 1)]) => {
    if (destroyed || retryT) return;
    // Peer distrutto da un errore della segnalazione (anche all'avvio): se ne crea uno nuovo (prima il P2 restava
    // fermo in «errore» per sempre, pur promettendo di riprovare)
    retryT = timers.setTimeout(() => { retryT = null; if (!peer || peer.destroyed) makePeer(); else connect(); }, wait);
  };
  // host introvabile da molto (ha chiuso la scheda o ricaricato senza tornare): lo si dice, continuando a riprovare
  const missing = () => { S.missingSince ||= now(); if (now() - S.missingSince > CLOSED_MS) set({ error: 'chiusa' }); };
  // tentativo finito senza canale: se l'host aveva risposto (o ICE è fallito) la rete blocca la strada diretta; se non
  // ha risposto è come introvabile (scheda chiusa o ferma)
  const failed = ice => {
    if (iceBlocked(ice)){ S.detail = iceSummary(ice); S.missingSince = 0; set({ error: 'rete', blocked: S.blocked + 1 }); }
    else missing();
  };
  function drop(c, wait){
    if (c !== conn) return;
    conn = null; rpc = null; timers.clearTimeout(openT); stopRoute(); route = null;
    if (!destroyed){ if (S.error !== 'occupata') set({ status: S.lastSeen ? 'lost' : 'connecting' }); retry(wait); }
  }
  function connect(){
    if (destroyed || !peerOpen || conn) return;
    S.attempts++;
    if (S.status !== 'lost') set({ status: 'connecting' });
    const c = conn = peer.connect(S.hostId, { reliable: true, serialization: 'json' });
    if (!c){ conn = null; retry(); return; }
    let ok = false, opened = false;
    const ice = watchIce(c), t0 = now();
    // fine del tentativo (chiuso, errore, tempo scaduto): un canale mai aperto dice perché
    const end = () => { if (c !== conn) return; if (!opened) failed(ice); drop(c); };
    rpc = createRpcClient(c, { onMessage: d => {
      if (c !== conn) return;
      S.lastSeen = now();
      if (d?.t === 'ok' && !ok){
        ok = true; S.attempts = 0; S.missingSince = 0; S.blocked = 0; set({ status: 'connected', error: null });
        stopRoute(); stopRoute = watch(c.peerConnection, r => { if (c === conn){ route = r; routeEv.emit(r); } }, { timers });
      }
      // stanza occupata da un altro Player 2: si riprova più tardi (entra se l'altro esce). Prima si chiudeva il canale
      // e poi si lasciava: la chiusura riprovava subito, senza i 4 s
      if (d?.t === 'no' && d.why === 'occupata'){ set({ status: 'error', error: 'occupata' }); drop(c, 4000); try { c.close(); } catch {} return; }
      if (d?.t === 'no'){ set({ status: 'error', error: 'stanza' }); }
    } });
    c.on('open', () => { opened = true; try { c.send(resumeId ? { t: 'hi', room: roomId, id: resumeId } : { t: 'hi', room: roomId }); } catch {} });
    c.on('close', end);
    c.on('error', () => { try { c.close(); } catch {} end(); });
    // il canale non si apre entro openMs (host fermo, rete che blocca il collegamento diretto): si chiude e si riprova.
    // PeerJS non manda «close» per un canale mai aperto: si chiude il tentativo qui
    // Con ICE ancora «checking» (strada in cerca, magari attraverso un server di inoltro) si aspetta fino a OPEN_MAX_MS
    const arm = ms => { openT = timers.setTimeout(() => {
      if (c !== conn || ok) return;
      if (!opened && ice.ice === 'checking' && !ice.failed && now() - t0 < openMaxMs) return arm(openMaxMs - (now() - t0));
      try { c.close(); } catch {} end();
    }, ms); };
    arm(openMs);
  }
  function makePeer(){
    peerOpen = false;
    const p = peer = new Peer(undefined, options);
    p.on('open', () => { if (p !== peer) return; peerOpen = true; connect(); });
    p.on('disconnected', () => { if (!destroyed) timers.setTimeout(() => { if (!destroyed && !p.destroyed) try { p.reconnect(); } catch {} }, 1500); });
    p.on('error', e => {
      if (p !== peer) return;
      const type = e?.type || String(e);
      // host non ancora (o non più) registrato: si riprova
      if (type === 'peer-unavailable'){ missing(); const c = conn; if (c){ try { c.close(); } catch {} drop(c); } else retry(); if (S.status !== 'lost') set({ status: 'connecting' }); return; }
      set({ status: conn?.open ? S.status : 'error', error: type });
      if (!conn) retry();
    });
  }
  makePeer();
  // l'host tace da 5 s (scheda chiusa, rete persa): si chiude e si riprova
  const alive = timers.setInterval(() => {
    if (conn && S.status === 'connected' && now() - S.lastSeen > LIVE_MS){ const c = conn; try { c.close(); } catch {} drop(c); }
  }, 1000);
  return {
    get state(){ return { ...S }; },
    get connected(){ return S.status === 'connected' && !!conn?.open; },
    get route(){ return route; },
    onStatus: ev.on, onRoute: routeEv.on,
    request(req){ return rpc && S.status === 'connected' ? rpc.request(req) : Promise.reject(new TypeError('host non collegato')); },
    // «Riconnetti»: chiude il tentativo (o il collegamento muto) e ne fa subito uno nuovo, senza una nuova partita
    reconnect(){
      if (destroyed) return false;
      timers.clearTimeout(retryT); retryT = null; S.attempts = 0;
      const c = conn;
      if (c){ conn = null; rpc = null; timers.clearTimeout(openT); stopRoute(); route = null; try { c.close(); } catch {} }
      set({ status: S.lastSeen ? 'lost' : 'connecting' });
      if (!peer || peer.destroyed) makePeer();
      else if (peerOpen) connect();
      else { try { peer.reconnect(); } catch {} retry(500); }
      return true;
    },
    destroy(){ destroyed = true; stopRoute(); timers.clearInterval(alive); timers.clearTimeout(retryT); timers.clearTimeout(openT); try { conn?.close(); } catch {} try { peer?.destroy(); } catch {} set({ status: 'off' }); },
  };
}

// identità di ripresa del P2 per la stanza: resta nella scheda (sessionStorage) anche se la pagina si ricarica
export function resumeIdFor(roomId, storage = globalThis.sessionStorage, rnd = Math.random){
  const key = `natpf.p2p.id.${String(roomId || '').toUpperCase()}`;
  try { const v = storage?.getItem(key); if (v && /^[a-z0-9]{6,40}$/.test(v)) return v; } catch {}
  const id = Array.from({ length: 12 }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(rnd() * 36)]).join('');
  try { storage?.setItem(key, id); } catch {}
  return id;
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
  const ev = emitter(), routeEv = emitter();
  const params = new URLSearchParams(win?.location?.search || '');
  const role = (params.get('role') || 'p1').toLowerCase() === 'p2' ? 'p2' : 'p1';
  const room = (params.get('room') || '').trim().toUpperCase();
  const forced = p2pRequested(win?.location?.search || '');
  const api = {
    mode: null, status: 'off', error: null, detail: null, blocked: 0, roomId: null, local: null, host: null, guest: null,
    // route: strada del collegamento tra i due computer (ice-route.js), onRoute a ogni cambio (diagnostica: sfida.strada)
    route: null, onStatus: ev.on, onRoute: routeEv.on,
    get active(){ return !!api.mode; },
  };
  // detail e blocked: perché il canale diretto non si apre (stato ICE e candidati, quante volte), per la diagnostica
  const relayStatus = s => {
    api.status = s.status; api.error = s.error || null; api.detail = s.detail || null; api.blocked = s.blocked || 0;
    ev.emit({ mode: api.mode, status: api.status, error: api.error, detail: api.detail, blocked: api.blocked, roomId: api.roomId });
  };
  // TURN nostri prima di creare il Peer (link.js, iceReady: al massimo 2,5 s una volta per pagina, niente con ?peer=):
  // un errore o un ritardo non ferma la sfida, si va avanti con le strade di prima
  const getPeer = async () => { const P = Peer || await loadPeer(); if (!peerOptions) await iceReady().catch(() => null); return P; };
  const followRoute = side => side.onRoute(r => { api.route = r; routeEv.emit({ ...r, modo: api.mode }); });
  // server di segnalazione: quello del telefono-racchetta (pubblico di PeerJS, o ?peer=… per le prove)
  const options = () => { if (peerOptions) return peerOptions; try { return peerConfig(); } catch { return { debug: 0 }; } };
  if (!win?.fetch) return api;
  const original = win.fetch.bind(win);

  // P2 arrivato con il link di invito p2p: le richieste vanno all'host
  if (forced && role === 'p2' && room && room !== 'DEFAULT'){
    api.mode = 'guest'; api.roomId = room; api.status = 'starting';
    getPeer().then(P => { api.guest = createP2pGuest({ Peer: P, roomId: room, options: options(), resumeId: resumeIdFor(room, win.sessionStorage) }); api.guest.onStatus(relayStatus); followRoute(api.guest); relayStatus(api.guest.state); })
      .catch(() => relayStatus({ status: 'error', error: 'libreria' }));
  }
  // una stanza alla volta: due richieste ravvicinate non devono lasciare il motore su una stanza senza Peer
  let creating = Promise.resolve();
  const startHost = body => (creating = creating.then(() => createHostRoom(body), () => createHostRoom(body)));
  async function createHostRoom(body){
    api.mode = 'host'; api.local ||= createLocalRelay({ host: win.location?.host || 'localhost' });
    let res = null, json = null;
    // id del Peer già preso: dopo un ricaricamento (stessa stanza richiesta) il vecchio Peer si libera in pochi secondi
    // e si riprova lo stesso id; altrimenti (raro) nuova stanza
    let want = null; try { want = JSON.parse(typeof body === 'string' ? body : JSON.stringify(body || {})).roomId || null; } catch {}
    for (let tries = 0; tries < 5; tries++){
      if (tries && want && tries < 4) await new Promise(r => setTimeout(r, 2000));
      else if (tries && want){ try { const o = JSON.parse(body); delete o.roomId; body = JSON.stringify(o); } catch {} want = null; }
      res = await api.local.handle({ method: 'POST', url: '/api/match/create', body });
      json = JSON.parse(res.text);
      api.roomId = json.roomId;
      api.host?.destroy();
      try {
        const P = await getPeer();
        api.host = createP2pHost({ Peer: P, roomId: json.roomId, handle: api.local.handle, options: options() });
        api.host.onStatus(relayStatus); followRoute(api.host); api.route = null; relayStatus(api.host.state);
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
