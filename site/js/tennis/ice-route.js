// Strade del collegamento diretto (ICE) via internet: server TURN nostri (Cloudflare) e strada scelta davvero.
//
// Server TURN nostri. Segnalazione del 30/10: il telefono del Player 2 non riusciva a collegarsi al suo computer
// («Connessione interrotta» a ogni tentativo) finché non ha acceso una VPN sul telefono: la rete del telefono bloccava
// tutte le strade che avevamo (STUN e i TURN pubblici di PeerJS, solo sulla porta 3478). Ora, se il pacchetto pubblicato
// ha /natpf/turn.json ({"url": "https://…workers.dev/"}, scritto da natpf-tennis/scripts/pacchetto-cloudflare.mjs), la
// pagina chiede a quel piccolo Worker (natpf-tennis/cloudflare/turn-worker.js) credenziali temporanee per il TURN di
// Cloudflare, che risponde anche in TLS sulla porta 443 (la stessa dei siti https: quasi nessuna rete la blocca). Quei
// server vanno per primi (link.js, peerConfig), quelli di prima restano come riserva. Senza il file, con una risposta
// non valida o lenta (più di ICE_WAIT_MS) resta tutto come prima: il collegamento non aspetta mai di più e non si
// blocca mai per questo.
//
// Strada scelta. Per confermare dal vivo se il collegamento passa dal TURN (e da quale), routeSummary legge con
// getStats la coppia di candidati che il browser usa: tipo locale e remoto (host = rete locale, srflx/prflx = indirizzo
// pubblico, relay = server TURN), protocollo, protocollo verso il TURN (udp, tcp, tls), tempo di andata e ritorno.
// watchRoute la legge all'apertura e poi al massimo ogni ROUTE_EVERY_MS, e avvisa solo se cambia.

export const TURN_CONFIG_PATH = '/natpf/turn.json';
export const ICE_WAIT_MS = 2500;          // tempo massimo per configurazione + credenziali, una volta per pagina
export const ROUTE_EVERY_MS = 10000;      // getStats al massimo ogni 10 s (niente peso sul telefono né sul gioco)
const RETRY_MS = 60*1000;                 // richiesta non riuscita: si riprova al collegamento successivo dopo un minuto
const LOCALHOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/;

// Si chiede solo da una pagina sicura (https, oppure localhost per le prove) via internet: niente in LAN (?lan=1, la
// rete locale non ha bisogno di TURN e magari non ha internet), con il server di segnalazione di prova (?peer=…), da
// file: o da http su un indirizzo di rete locale. isSecureContext: solo il browser lo dà (nei test con node no)
export function iceAllowed(loc = globalThis.location, secure = globalThis.isSecureContext){
  if (!loc || secure !== true) return false;
  const search = String(loc.search || '');
  if (new URLSearchParams(search).get('lan') === '1' || /[?&]peer=/.test(search)) return false;
  let u; try { u = new URL(loc.href); } catch { return false; }
  return u.protocol === 'https:' || (u.protocol === 'http:' && LOCALHOST.test(u.hostname));
}
// indirizzo del Worker dalla configurazione statica: https (o http su localhost, per le prove), altrimenti niente
export function turnEndpoint(conf, loc = globalThis.location){
  if (!conf || typeof conf !== 'object' || typeof conf.url !== 'string' || conf.url.length > 512) return null;
  let u; try { u = new URL(conf.url, loc?.href); } catch { return null; }
  return u.protocol === 'https:' || (u.protocol === 'http:' && LOCALHOST.test(u.hostname)) ? u.href : null;
}
// Server ICE accettati dalla risposta del Worker: urls stringhe stun:, turn: o turns:, i TURN con utente e credenziale.
// Via la porta 53 (i browser la bloccano: Cloudflare la offre per altri usi). null se non resta niente
const ICE_URL = /^(stun|turns?):\S+$/i, PORT_53 = /:53(?:[?/]|$)/;
export function validIceServers(j){
  if (!j || typeof j !== 'object' || !Array.isArray(j.iceServers)) return null;
  const out = [];
  for (const s of j.iceServers.slice(0, 8)){
    if (!s || typeof s !== 'object') continue;
    const urls = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter(u => typeof u === 'string' && u.length <= 256 && ICE_URL.test(u) && !PORT_53.test(u));
    if (!urls.length) continue;
    const turn = urls.some(u => /^turns?:/i.test(u));
    if (turn && (typeof s.username !== 'string' || typeof s.credential !== 'string')) continue;
    out.push(turn ? { urls, username: s.username, credential: s.credential } : { urls });
  }
  return out.length ? out : null;
}

// Configurazione e credenziali. Non lancia mai: { servers, ttl } oppure { servers: null, why, final } (final: il
// pacchetto non ha la configurazione, inutile richiedere fino al ricaricamento della pagina). Dopo waitMs si risponde
// «tempo scaduto» e chi aspetta va avanti con le strade di prima, ma la richiesta continua (fino a HARD_MS) e il suo
// esito arriva in pending: prova nel browser del 30/10, la pagina del gioco appena aperta (bundle da analizzare,
// processore occupato) riceveva le credenziali dopo i 2,5 s e senza questo non le avrebbe usate mai
const HARD_MS = 15000;
export async function fetchIceServers({ fetch: get = globalThis.fetch, loc = globalThis.location, waitMs = ICE_WAIT_MS, timers = globalThis } = {}){
  if (typeof get !== 'function' || !loc) return { servers: null, why: 'fetch assente', final: true };
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const hard = timers.setTimeout(() => { try { ctl?.abort(); } catch {} }, HARD_MS);
  let timer = null;
  const json = async url => {
    const r = await get(url, { cache: 'no-store', credentials: 'omit', ...(ctl ? { signal: ctl.signal } : {}) });
    if (!r?.ok) return { status: r?.status ?? 0 };
    try { return { body: await r.json() }; } catch { return { status: 'non json' }; }
  };
  const work = (async () => {
    let conf;
    // file assente (404) o pagina HTML del sito al suo posto: nessun TURN nostro, come prima
    try { conf = await json(new URL(TURN_CONFIG_PATH, loc.href).href); } catch { return { servers: null, why: 'configurazione non raggiunta' }; }
    if (!conf.body) return { servers: null, why: 'nessuna configurazione', final: true };
    const url = turnEndpoint(conf.body, loc);
    if (!url) return { servers: null, why: 'configurazione non valida', final: true };
    try {
      const r = await json(url), servers = validIceServers(r.body);
      if (!servers) return { servers: null, why: r.body ? 'risposta non valida' : `risposta ${r.status}` };
      const ttl = Number(r.body.ttl);
      return { servers, ttl: Number.isFinite(ttl) && ttl > 0 ? ttl : null };
    } catch { return { servers: null, why: 'credenziali non raggiunte' }; }
  })().finally(() => timers.clearTimeout(hard));
  const late = new Promise(res => { timer = timers.setTimeout(() => res({ servers: null, why: 'tempo scaduto', pending: work }), waitMs); });
  try { return await Promise.race([work, late]); } finally { timers.clearTimeout(timer); }
}

// Una volta per pagina (chi arriva durante la richiesta aspetta la stessa). Rinnovo: una chiamata a iceReady dopo metà
// della durata delle credenziali le richiede di nuovo (senza far aspettare chi chiama, quelle di prima valgono ancora).
// Chi chiama: il telefono e l'host della sfida a ogni Peer nuovo; il computer, che crea il Peer per il telefono una
// volta sola e può restare acceso per giorni (chiosco, ledwall), a ogni start() e ogni secondo nel suo controllo
// (link.js). Credenziali scadute e non rinnovate: via anche dalle configurazioni dei Peer già creati, restano le strade
// di base (un TURN con credenziali scadute rifiuta l'allocazione: meglio non offrirlo)
const ice = { p: null, until: 0, servers: null, expires: 0, why: null };
// configurazioni dei Peer già creati (peerConfig in link.js, followIce): PeerJS legge options.config a ogni nuova
// connessione, quindi credenziali arrivate in ritardo valgono per i collegamenti successivi dello stesso Peer (il
// computer crea il suo una volta sola, all'avvio). Solo le ultime 8: una pagina del telefono ne crea una per tentativo
const live = [];
export function followIce(config, base){ live.push({ config, base }); if (live.length > 8) live.shift(); return config; }
const syncLive = () => { for (const { config, base } of live) config.iceServers = mergeIceServers(ourIceServers(), base); };
function store(r){
  ice.why = r.why || null;
  if (!r.servers) return false;
  const ttl = Math.min(r.ttl || 86400, 7*86400);
  Object.assign(ice, { servers: r.servers, expires: Date.now() + ttl*1000, until: Date.now() + Math.max(60, ttl/2)*1000 });
  syncLive();
  return true;
}
// credenziali scadute (rinnovo non riuscito): si tolgono una volta, anche dalle configurazioni vive
function dropExpired(){ if (ice.servers && Date.now() >= ice.expires){ ice.servers = null; syncLive(); } }
export function iceReady(opts = {}){
  dropExpired();
  const loc = opts.loc ?? globalThis.location;
  if (!iceAllowed(loc, opts.secure ?? globalThis.isSecureContext)) return Promise.resolve(null);
  if (ice.p && Date.now() < ice.until) return ice.p;
  const p = ice.p = fetchIceServers({ ...opts, loc }).then(r => {
    if (ice.p !== p) return ourIceServers();
    if (!store(r)) ice.until = r.final ? Infinity : Date.now() + RETRY_MS;
    // risposta lenta: si va avanti senza, e quando arriva vale per i collegamenti dopo. Se arriva «final» (il pacchetto
    // non ha la configurazione) vale come subito: non si richiede più (prima restava il riprova di un minuto)
    r.pending?.then(late => {
      if (ice.p !== p) return;
      if (store(late)) ice.p = Promise.resolve(ourIceServers());
      else if (late.final) ice.until = Infinity;
    }, () => {});
    return ourIceServers();
  }, () => { ice.until = Date.now() + RETRY_MS; return ourIceServers(); });
  ice.until = Infinity;
  // rinnovo con le credenziali di prima ancora valide: non si aspetta
  const now = ourIceServers();
  return now.length ? Promise.resolve(now) : p;
}
// server ottenuti e ancora validi ([] se nessuno); per la diagnostica anche il motivo dell'ultima richiesta mancata
export const ourIceServers = () => (ice.servers && Date.now() < ice.expires ? ice.servers.map(s => ({ ...s, urls: [...s.urls] })) : []);
export const iceInfo = () => ({ servers: ourIceServers().length, why: ice.why });
// pagina nuova (e test): dimentica server, richieste e Peer seguiti
export function forgetIceServers(){ Object.assign(ice, { p: null, until: 0, servers: null, expires: 0, why: null }); live.length = 0; }

// prima i nostri, poi quelli di serie senza gli indirizzi già presenti (stessa strada due volte non serve)
export function mergeIceServers(ours, base){
  const seen = new Set(ours.flatMap(s => s.urls));
  const rest = base.map(s => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter(u => !seen.has(u)) })).filter(s => s.urls.length);
  return [...ours.map(s => ({ ...s })), ...rest];
}

/* ---------- strada scelta (getStats) ---------- */
// Riassunto della coppia di candidati in uso da un elenco di statistiche (RTCStatsReport o array). Chrome e Safari la
// indicano nel trasporto (selectedCandidatePairId), Firefox con selected sulla coppia; in mancanza, la coppia nominata
// riuscita. null se non c'è ancora una strada.
//   locale, remoto: host | srflx | prflx | relay · protocollo: udp | tcp · relay: protocollo verso il TURN (udp, tcp,
//   tls) quando questo computer passa da un TURN · rtt: ms · server: indirizzo STUN/TURN del candidato locale (senza
//   parametri), quando il browser lo dice · nostro: il TURN usato da qui è quello di Cloudflare (null se non si sa o
//   se da qui non si passa da un TURN) · turn: almeno uno dei due lati passa da un server di inoltro
export function routeSummary(stats){
  const all = new Map();
  try { for (const s of stats?.values ? stats.values() : []) if (s && s.id != null) all.set(s.id, s); } catch { return null; }
  let pair = null;
  for (const s of all.values()) if (s.type === 'transport' && all.get(s.selectedCandidatePairId)?.type === 'candidate-pair'){ pair = all.get(s.selectedCandidatePairId); break; }
  if (!pair) for (const s of all.values()) if (s.type === 'candidate-pair' && s.selected === true){ pair = s; break; }
  if (!pair) for (const s of all.values()) if (s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded'){ pair = s; break; }
  if (!pair) return null;
  const L = all.get(pair.localCandidateId) || {}, R = all.get(pair.remoteCandidateId) || {};
  const relayed = L.candidateType === 'relay', url = typeof L.url === 'string' ? L.url.replace(/\?.*$/, '') : null;
  return {
    locale: L.candidateType || null, remoto: R.candidateType || null, protocollo: L.protocol || null,
    relay: relayed ? (L.relayProtocol || null) : null,
    rtt: Number.isFinite(pair.currentRoundTripTime) ? Math.round(pair.currentRoundTripTime*1000) : null,
    server: url, nostro: relayed && url ? /cloudflare/i.test(url) : null,
    turn: relayed || R.candidateType === 'relay',
  };
}
// cambia la strada (non il tempo di andata e ritorno, che tel.link registra già ogni secondo)
export const routeKey = r => (r ? [r.locale, r.remoto, r.protocollo, r.relay, r.server].join('|') : '');

// Segue la strada di una RTCPeerConnection: subito (collegamento appena aperto), se non c'è ancora riprova dopo 1 s
// (poche volte), poi ogni everyMs; onRoute solo alla prima strada e a ogni cambio. Restituisce la funzione che smette.
export function watchRoute(pc, onRoute, { everyMs = ROUTE_EVERY_MS, timers = globalThis } = {}){
  if (!pc || typeof pc.getStats !== 'function') return () => {};
  let key = null, stopped = false, busy = false, early = 0, soon = null;
  const look = async () => {
    if (stopped || busy) return;
    if (pc.connectionState === 'closed' || pc.signalingState === 'closed') return stop();
    busy = true;
    let r = null;
    try { r = routeSummary(await pc.getStats()); } catch {}
    busy = false;
    if (stopped) return;
    if (!r){ if (key == null && early++ < 3) soon = timers.setTimeout(look, 1000); return; }
    const k = routeKey(r);
    if (k !== key){ key = k; try { onRoute(r); } catch (e){ console.error(e); } }
  };
  const every = timers.setInterval(look, everyMs);
  function stop(){ stopped = true; timers.clearInterval(every); timers.clearTimeout(soon); }
  look();
  return stop;
}
