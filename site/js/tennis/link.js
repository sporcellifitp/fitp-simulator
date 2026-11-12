// Il telefono come racchetta, lato computer: sessione WebRTC (PeerJS), QR, controllo di chi si collega, orologi.
// Il computer è la «base»: si registra sul server di segnalazione con un id casuale e aspetta il telefono.
// Dal telefono: hello {k|r}, ping, dq (risposta all'orologio), st (stato), cal (passi della calibrazione), sw (colpo, con v e tw facoltativi), toss,
// fo (orientamento del piatto, solo con la presa orizzontale: facoltativo, chi non lo usa lo ignora), pr (preparazione
// del colpo) e sm (giroscopio in JSON), facoltativi e solo se il gioco li chiede con cfg; per la diagnostica gx (gesto
// scartato sul telefono, con il motivo), mk (segno «qui è successo un problema») e dev (telefono e browser).
// Al telefono: welcome {r}, deny, pong, dp (orologio), cmd (comandi della calibrazione), ev (esito del colpo, punto), ph (fase),
// e facoltativi cfg (preparazione, flusso dei sensori, tutorial: tut/tv), tp (avanzamento del tutorial: scheda, schede
// viste; B9) ed ex (verso del colpo atteso).
// Percorso veloce: i messaggi che valgono solo se arrivano subito (copie del colpo, piatto, campioni della diagnostica)
// viaggiano anche su una seconda strada senza ordine. In LAN è il canale dei sensori, davvero senza ritrasmissioni
// (lan-transport.js: maxRetransmits 0): un pacchetto perso non ferma quelli dopo. Via internet è una seconda connessione
// WebRTC «fast-…» dello stesso telefono: PeerJS 1.5.4 con reliable false imposta solo ordered false, quindi è non
// ordinata ma con le ritrasmissioni (prima questo commento diceva «senza ritrasmissioni» anche qui); essendo una
// connessione separata non aspetta le code della principale. Il colpo
// arriva con la prima copia buona e le altre si scartano con il numero del colpo (n). Il computer lo annuncia nel
// benvenuto (f: 1): un telefono aggiornato con un gioco più vecchio usa solo il canale affidabile, come prima. Il
// controllo di vita resta sul canale principale (ping e stato ogni secondo).
// Orologi: ogni secondo il computer chiede l'ora al telefono e tiene la stima col viaggio più breve; così l'istante del
// colpo (il picco del movimento, misurato sul telefono) si porta sull'orologio del computer senza dipendere da quando il
// computer, magari impegnato a disegnare, riesce a leggere il messaggio.
import { LanPeer, isLanMode } from './lan-transport.js';
import { decodeSensor } from './sensor-packet.js';
import { createRacketMotion } from './racket-motion.js';
import { phoneInputTime } from './input-time.js';
import { parseSwingMessage } from './swing-message.js';
import { createGate, newSessionId, pairingUrl, createClock } from './pairing.js';
import { iceReady, ourIceServers, mergeIceServers, followIce, watchRoute } from './ice-route.js';
export { iceReady } from './ice-route.js';

// Strade per il collegamento diretto (ICE) via internet. Prima quelle di serie di PeerJS: STUN di Google e i TURN
// pubblici di PeerJS solo in UDP. Su reti che bloccano l'UDP o isolano i dispositivi (Wi-Fi aziendale o per ospiti,
// alcune reti mobili) non restava nessuna strada: il telefono ripeteva «Connessione persa» (segnalazione del 29/10 sera,
// Pixel con la versione Cloudflare). In più: STUN di Cloudflare e gli stessi TURN anche in TCP.
// Con il TURN di Cloudflare configurato nel pacchetto (ice-route.js, iceReady) i suoi server vanno prima di questi, che
// restano come riserva.
export const ICE_SERVERS = Object.freeze([
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
  { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478', 'turn:eu-0.turn.peerjs.com:3478?transport=tcp', 'turn:us-0.turn.peerjs.com:3478?transport=tcp'], username: 'peerjs', credential: 'peerjsp' },
]);
// server di segnalazione: quello pubblico di PeerJS; per le prove «?peer=127.0.0.1:9000». Resta sincrona: chi crea un
// Peer via internet aspetta prima iceReady() (al massimo ICE_WAIT_MS, una volta per pagina) per avere anche i TURN nostri
export function peerConfig(){
  // followIce: credenziali arrivate dopo la creazione del Peer valgono per i suoi collegamenti successivi
  const config = followIce({ iceServers: mergeIceServers(ourIceServers(), ICE_SERVERS), sdpSemantics: 'unified-plan' }, ICE_SERVERS);
  const m = /[?&]peer=([^&#]+)/.exec(location.search);
  if (!m) return { debug: 0, config };
  const [host, port] = decodeURIComponent(m[1]).split(':');
  return { host, port: +(port || 443), path: '/fiw', secure: location.protocol === 'https:' && !/^(127\.|localhost)/.test(host), debug: 0, config };
}
// Tempi del collegamento del telefono: il canale diretto può metterci più di 6 s ad aprirsi quando passa da un server di
// inoltro (TURN); prima il computer chiudeva chi non diceva «hello» entro 6 s dal primo contatto, cioè spesso prima
// ancora che il canale fosse aperto, e il telefono rinunciava a 12 s: con quelle reti il collegamento non riusciva mai
export const LINK_TIMES = Object.freeze({ negotiateMs: 30000, helloMs: 6000, phoneMs: 12000, phoneSlowMs: 30000 });
// motivo di un collegamento del telefono non riuscito, da quello che il tentativo ha visto ({ signal, ice }, racchetta.js)
// In LAN (lan: versione con il server sul computer) i consigli sono quelli della rete locale: niente internet né «versione
// LAN» a chi la sta già usando
export function netWhy(n, { lan = isLanMode() } = {}){
  if (!n) return null;
  if (!n.signal) return lan ? 'Il telefono non raggiunge il computer: controlla che sia sulla stessa rete Wi-Fi del computer (sul computer apri «SBLOCCA LA RETE.cmd» nella cartella del gioco), poi «Riprova».' : 'Il telefono non raggiunge il server di collegamento: controlla che abbia internet (Wi-Fi o dati), poi «Riprova».';
  if (n.ice === 'failed' || n.ice === 'checking' || n.ice === 'disconnected') return lan
    ? 'La rete non lascia passare il collegamento tra telefono e computer. Prova: telefono e computer sulla stessa rete Wi-Fi (non quella per ospiti); sul computer consenti Chrome o Edge se Windows chiede il permesso del firewall, oppure collega il computer all’hotspot del telefono.'
    : 'La rete non lascia passare il collegamento tra telefono e computer. Prova: telefono e computer sulla stessa rete Wi-Fi (non quella per ospiti), oppure il computer collegato all’hotspot del telefono, oppure la versione LAN.';
  if (n.ice === 'new') return 'Il computer non risponde: se il gioco sul computer è stato ricaricato, inquadra di nuovo il QR.';
  return null;
}

// solo il parametro di prova passa al telefono e all'amico, nient'altro dell'indirizzo
export const testSearch = () => { if (isLanMode()) return '?lan=1'; const m = /[?&](peer=[^&#]+)/.exec(location.search); return m ? '?' + m[1] : ''; };

let libP = null;
export const loadPeer = () => libP || (libP = new Promise((res, rej) => {
  if (window.Peer) return res(window.Peer);
  const s = document.createElement('script'); s.src = new URL('../vendor/peerjs.min.js', import.meta.url).href;
  s.onload = () => res(window.Peer); s.onerror = () => { libP = null; rej(new Error('peerjs')); }; document.head.appendChild(s);
}));

export function createPhoneLink(){
  const gate = createGate({});
  const session = newSessionId();
  const L = { state: 'off', phone: null, rtt: null, error: null, grip: null };
  let faceSample = null;                     // ultimo orientamento del piatto { yaw, pitch, roll, at }
  let lastFaceK = -Infinity;                 // istante (telefono) dell'ultimo piatto: sul percorso veloce l'ordine non è garantito
  // copie del colpo: numeri già visti (ultimi 64) e da quale percorso è arrivata la prima copia
  const seen = new Set(), seenOrder = [], copies = { fast: 0, reliable: 0, dup: 0 };
  // arrivi per tipo di messaggio (diagnostica, non entra nel gioco): quanti nell'ultimo secondo intero (hz), il buco più
  // lungo tra due arrivi (gap, ms) e quanti arrivati a grappolo (meno di 3 ms dal precedente). Prima era una media
  // mobile di 1000/intervallo: con i messaggi arrivati a grappoli segnava 200–520 «Hz» per un flusso da 60 (23/10)
  const rates = {};
  const countMsg = k => {
    const now = performance.now(), r = rates[k] || (rates[k] = { hz: 0, last: null, count: 0, win: { at: now, n: 0, gap: 0, bunch: 0 }, gap: null, bunch: 0 });
    if (now - r.win.at >= 1000){ r.hz = Math.round(r.win.n*1000/(now - r.win.at)); r.gap = Math.round(r.win.gap); r.bunch = r.win.bunch; r.win = { at: now, n: 0, gap: 0, bunch: 0 }; }
    if (r.last != null){ const dt = now - r.last; if (dt > r.win.gap) r.win.gap = dt; if (dt < 3) r.win.bunch++; }
    r.win.n++; r.last = now; r.count++;
  };
  // clock: ogni scambio dell'orologio { d invio, p telefono, r ricezione } (ms); state: ogni stato del telefono (st), per
  // la diagnostica
  // route: strada scelta del collegamento con il telefono (ice-route.js, routeSummary), all'apertura e a ogni cambio
  const handlers = { swing: [], toss: [], change: [], cal: [], prep: [], raw: [], clock: [], state: [], dropped: [], hand: [], discard: [], mark: [], device: [], route: [] };
  let peer = null, conn = null, lastTok = gate.token, tick = null, lastSeen = 0, starting = null, startEpoch = 0;
  // strada del collegamento con il telefono (ice-route.js): letta all'apertura e poi ogni 10 s, «route» se cambia
  let stopRoute = () => {};
  const clock = createClock(), racketMotion = createRacketMotion();
  // un evento senza ascoltatori non è un errore: la pagina storica non ascolta «hand» (mano cambiata sul telefono) e
  // l'errore fermava la gestione del messaggio
  const emit = (k, v) => { for (const f of handlers[k] || []) try { f(v); } catch (e){ console.error(e); } };
  const set = patch => { Object.assign(L, patch); emit('change', L); };

  // due start() ravvicinati (o uno stop() nel frattempo) non devono creare due Peer: ora l'avvio può aspettare i server
  // TURN (iceReady)
  function start(){
    if (starting) return starting;
    const p = starting = run().finally(() => { if (starting === p) starting = null; });
    return p;
  }
  // credenziali TURN nostre (ice-route.js): in cache fino a metà della loro durata, poi si richiedono. Il Peer del
  // computer nasce una volta sola e la pagina può restare aperta per giorni (chiosco, ledwall): senza queste chiamate
  // dopo 24 h i collegamenti nuovi del telefono avrebbero usato credenziali scadute. Non si aspetta: le credenziali
  // nuove (o, se scadute, le sole strade di base) arrivano nella configurazione del Peer (followIce)
  const renewIce = () => { if (!isLanMode()) iceReady().catch(() => null); };
  async function run(){
    if (peer && !peer.destroyed){ renewIce(); return; }
    const epoch = ++startEpoch;
    set({ state: 'starting', error: null });
    try {
      // libreria e TURN nostri (niente in LAN) insieme: l'attesa delle credenziali (al massimo 2,5 s) non si somma al
      // caricamento della libreria. Un errore o un ritardo delle credenziali non ferma il collegamento
      const Peer = isLanMode() ? LanPeer : (await Promise.all([loadPeer(), iceReady().catch(() => null)]))[0];
      if (epoch !== startEpoch) return;
      peer = new Peer(session, peerConfig());
      peer.on('open', () => set({ state: conn ? 'connected' : 'waiting' }));
      peer.on('connection', c => accept(c));
      peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => peer && !peer.destroyed && peer.reconnect(), 1500); });
      peer.on('error', e => { if (e.type === 'peer-unavailable') return; set({ state: conn ? L.state : 'error', error: e.type || String(e) }); });
    } catch (e){ set({ state: 'error', error: 'libreria' }); }
    clearInterval(tick);
    tick = setInterval(() => {
      renewIce();
      if (gate.expired && !conn) gate.rotate();
      if (gate.token !== lastTok){ lastTok = gate.token; emit('change', L); }                 // QR nuovo
      if (conn) conn.send({ t: 'dp', d: performance.now() });
      // il telefono manda un segnale ogni secondo: se tace per 5 s (schermo spento, rete persa) è scollegato
      if (conn && Date.now() - lastSeen > 5000){ const c = conn; conn = null; gate.release(); try { c.close(); } catch (e){} set({ state: 'lost', phone: null }); }
    }, 1000);
  }
  // via internet: seconda connessione non ordinata dello stesso telefono (stesso peer della connessione principale)
  function acceptFast(c){
    c.on('data', d => { if (conn && conn.open && c.peer === conn.peer && d && typeof d === 'object') onTimely(d, 'fast'); });
    c.on('error', () => {});
    setTimeout(() => { if (!conn || c.peer !== conn.peer) try { c.close(); } catch (e){} }, 6000);
  }
  // messaggi che contano solo se arrivano subito, da tutti e due i percorsi
  function onTimely(d, path){
    switch (d.t){
      case 'sw': {
        if (Number.isInteger(d.n) && d.n > 0){
          if (seen.has(d.n)){ copies.dup++; return; }
          seen.add(d.n); seenOrder.push(d.n); if (seenOrder.length > 64) seen.delete(seenOrder.shift());
          copies[path]++;
        }
        countMsg('sw');
        // istante del colpo sull'orologio di questo computer (ms → s), con orologi allineati; se no, ritardo stimato
        const now = performance.now();
        const at = phoneInputTime({ peakMs: d.pk, nowMs: now, clock, latencyMs: d.lat });
        if (at != null) emit('swing', { ...parseSwingMessage(d, { at, now }), path });
        // istante del picco fuori dalla finestra accettata (orologio stimato male o colpo vecchio): scartato, e lo si
        // dice (prima spariva in silenzio)
        else emit('dropped', { reason: 'istante del colpo non valido', seq: Number.isInteger(d.n) ? d.n : null, path, pk: d.pk ?? null });
        return;
      }
      case 'fo': {
        if (typeof d.k === 'number'){ if (d.k <= lastFaceK) return; lastFaceK = d.k; }
        countMsg('fo');
        const f = v => typeof v === 'number' && isFinite(v) ? Math.max(-180, Math.min(180, v)) : null;
        if (f(d.y) != null) faceSample = { yaw: f(d.y), pitch: f(d.p) ?? 0, roll: f(d.r) ?? 0, at: performance.now() };
        return;
      }
      case 'rs':
        countMsg('rs');
        if (typeof d.k === 'number') emit('raw', { t: d.k, q: Number.isInteger(d.q) ? d.q : null, rot: Array.isArray(d.r) ? d.r : null, acc: Array.isArray(d.a) ? d.a : null, accG: Array.isArray(d.g) ? d.g : null, at: performance.now(), path });
        return;
    }
  }
  function accept(c){
    if (typeof c.label === 'string' && c.label.startsWith('fast-')) return acceptFast(c);
    let ok = false;
    // chi non si presenta entro 6 s dall'apertura del canale viene chiuso; prima che il canale si apra c'è più tempo
    // (LINK_TIMES: il percorso attraverso un server di inoltro è lento)
    let timer = setTimeout(() => { if (!ok) c.close(); }, LINK_TIMES.negotiateMs);
    c.on('open', () => { if (ok) return; clearTimeout(timer); timer = setTimeout(() => { if (!ok) c.close(); }, LINK_TIMES.helloMs); });
    c.on('data', d => {
      if (!d || typeof d !== 'object') return;
      if (c === conn) lastSeen = Date.now();
      if (!ok){
        if (d.t !== 'hello') return c.close();
        // il telecomando dello staff (B27, remote-link.js) non è mai una racchetta, nemmeno con il codice del QR giusto
        if (d.role === 'remote'){ c.send({ t: 'deny', why: 'role' }); setTimeout(() => c.close(), 200); return; }
        // c'è già un telefono collegato: può entrare solo lo stesso telefono che si ricollega (chiave di ripresa)
        if (conn && conn.open && conn !== c && !d.r){ c.send({ t: 'deny', why: 'busy' }); setTimeout(() => c.close(), 200); return; }
        const res = gate.admit(c.peer, d.r ? { r: d.r } : d);
        if (!res.ok){ c.send({ t: 'deny', why: res.why }); setTimeout(() => c.close(), 200); return; }
        ok = true; clearTimeout(timer);
        const previous = conn; conn = c;
        if (previous && previous !== c) try { previous.close(); } catch (e){}
        conn = c; lastSeen = Date.now(); clock.reset(); faceSample = null; lastFaceK = -Infinity; seen.clear(); seenOrder.length = 0; racketMotion.setBias([0,0,0]); racketMotion.reset(); c.send({ t: 'welcome', r: res.resume, f: 1 });
        // strada di questo collegamento (via internet c.peerConnection di PeerJS, in LAN c.pc)
        stopRoute(); L.route = null;
        stopRoute = watchRoute(c.peerConnection || c.pc, r => { if (c === conn){ L.route = r; emit('route', r); } });
        // joins: un collegamento nuovo (anche lo stesso telefono che si ricollega senza che il computer l'abbia visto
        // cadere): chi usa il collegamento rimanda al telefono quello che la pagina ricaricata ha perso
        // relinked: lo stesso telefono, senza ricaricare la pagina, ha rifatto il collegamento («Ricollega»): calibrazione e
        // riferimenti della pagina restano validi
        // pairs: abbinamenti nuovi (hello con il codice del QR, k), non le riprese con la chiave (r: pagina ricaricata,
        // ricollegamento automatico dopo lo schermo spento, «Ricollega»). Il tutorial si rivede solo con un abbinamento
        // nuovo (B9, docs/b9/analisi-telefono.md C4): prima ripartiva a ogni collegamento (joins)
        set({ state: 'connected', phone: 'sensors', error: null, joins: (L.joins || 0) + 1, pairs: (L.pairs || 0) + (d.r ? 0 : 1), resumed: !!d.r, relinked: d.rl === 1, sensorAge: null, beatAt: null, ...(d.r ? {} : { vis: true, hiddenAt: null }) });
        return;
      }
      if (c !== conn) return;
      if (d.t === 'sw' || d.t === 'fo' || d.t === 'rs') return onTimely(d, 'reliable');
      if (typeof d.t === 'string') countMsg(d.t);
      switch (d.t){
        case 'ping': c.send({ t: 'pong', c: d.c }); break;
        case 'dq': if (typeof d.p === 'number'){ const now = performance.now(); clock.add(d.d, d.p, now); emit('clock', { d: d.d, p: d.p, r: now }); } break;
        // sa: ms dall'ultimo campione dei sensori sul telefono (telefoni dal 29/10), con l'istante di arrivo (beatAt): il
        // computer distingue i sensori fermi sul telefono dal flusso dei sensori che non arriva (canale veloce bloccato)
        // vis: pagina del telefono in primo piano; hiddenAt: da quando è nascosta (schermo spento, altra app), per dire da
        // quanto sul computer. tu: il telefono mostra il tutorial (B9; s resta quello dei sensori). bt, bc: batteria in % e in
        // carica (B27, per il telecomando dello staff; solo dove il browser del telefono la dà)
        case 'st': emit('state', d); if (d.s === 'ready' && d.b) racketMotion.setBias(d.b); if (d.s === 'ready' && L.phone !== 'ready') racketMotion.reset(); set({ phone: String(d.s || ''), rtt: clock.rtt != null ? Math.round(clock.rtt) : L.rtt, grip: d.gp === 'flat' || d.gp === 'upright' ? d.gp : L.grip, prep: d.pm === 1, hz: typeof d.hz === 'number' && isFinite(d.hz) ? Math.round(d.hz) : L.hz, ...(d.vis === 0 || d.vis === 1 ? { vis: d.vis === 1, hiddenAt: d.vis === 1 ? null : L.vis === false && L.hiddenAt != null ? L.hiddenAt : performance.now() } : {}), ...([-1, 0, 1].includes(d.wk) ? { wake: d.wk } : {}), touch: d.in === 't', tut: d.tu === 1, sensorAge: typeof d.sa === 'number' && isFinite(d.sa) ? Math.max(0, Math.round(d.sa)) : null, beatAt: performance.now(), ...(Number.isFinite(d.bt) ? { battery: Math.max(0, Math.min(100, Math.round(d.bt))), charging: d.bc === 1 } : {}) }); break;
        case 'cal': if (d.e?.kind === 'done') racketMotion.setBias(d.e.profile?.bias || [0,0,0]); emit('cal', d.e || {}); break;
        // facoltativi: preparazione del colpo (pr) e giroscopio in JSON quando non c'è il canale binario (sm)
        case 'pr': { const at = phoneInputTime({ peakMs: d.pk, nowMs: performance.now(), clock, latencyMs: d.lat }); if (at != null && (d.dir === 1 || d.dir === -1)) emit('prep', { dir: d.dir, peak: typeof d.v === 'number' ? d.v : null, angle: typeof d.a === 'number' ? d.a : null, at }); break; }
        case 'sm': if (Array.isArray(d.r) && d.r.length === 3 && Number.isInteger(d.q) && typeof d.k === 'number') racketMotion.push({ sequence: d.q, t: d.k, rot: d.r.map(Number), acc: null, accG: null }, performance.now()); break;
        case 'toss': { const at = phoneInputTime({ peakMs: d.pk, nowMs: performance.now(), clock, latencyMs: 0 }); if (at != null) emit('toss', { at }); break; }
        // mano cambiata sulla pagina del telefono (la decide il gioco: il computer la applica e la rimanda)
        case 'hand': if (d.h === 'left' || d.h === 'right') emit('hand', { hand: d.h }); break;
        // «Rivincita» toccata sul telefono a fine partita (stesso schermo, B20): decide il computer (natpf_split_ui)
        case 'rm': if (d.y === 1) emit('rematch', {}); break;
        // «Avanti ›» toccato sul telefono (B28): il computer aveva offerto di andare avanti senza fare il gesto
        case 'nx': if (d.y === 1) emit('next', {}); break;
        // tutorial prima della calibrazione: w = il telefono aspetta «Tutto chiaro, ho capito» (v 2: lo tiene spento finché
        // non si sono viste tutte le schede, con l'avanzamento «tp» del computer), ok = toccato, nav = frecce ‹ › del
        // telefono (-1 indietro, 1 avanti)
        case 'tut': emit('tut', { wait: !!d.w, ok: !!d.ok, v: d.v === 2 ? 2 : 1, nav: d.nav === 1 || d.nav === -1 ? d.nav : 0 }); break;
        // diagnostica: gesto scartato sul telefono, con il motivo (solo se la diagnostica lo chiede, al massimo pochi al
        // secondo); segno «qui è successo un problema» toccato sul telefono; telefono e browser (una volta per collegamento)
        case 'gx': { const at = phoneInputTime({ peakMs: d.pk, nowMs: performance.now(), clock, latencyMs: 0 }); emit('discard', { why: typeof d.r === 'string' ? d.r.slice(0, 40) : '?', peak: Number.isFinite(d.v) ? d.v : null, angle: Number.isFinite(d.a) ? d.a : null, dir: [-1, 0, 1].includes(d.d) ? d.d : null, at }); break; }
        case 'mk': emit('mark', { text: typeof d.x === 'string' ? d.x.slice(0, 80) : 'segno dal telefono' }); break;
        case 'dev': emit('device', { ua: typeof d.ua === 'string' ? d.ua.slice(0, 200) : null, wakeLock: d.wl ?? null, motion: d.dm ?? null, orientation: typeof d.or === 'string' ? d.or.slice(0, 30) : null, screen: Array.isArray(d.sc) ? d.sc.slice(0, 3) : null, version: typeof d.vr === 'string' ? d.vr.slice(0, 40) : null, accSign: d.as === -1 ? -1 : d.as === 1 ? 1 : null }); break;
      }
    });
    c.on('motion', buffer => { if (ok && c === conn){ countMsg('bin'); const sample = decodeSensor(buffer); if (sample) racketMotion.push(sample, performance.now()); } });
    // LAN: percorso veloce sul canale dei sensori
    c.on('fast', d => { if (ok && c === conn && d && typeof d === 'object') onTimely(d, 'fast'); });
    c.on('close', () => { clearTimeout(timer); if (c === conn){ conn = null; stopRoute(); gate.release(); set({ state: peer && !peer.destroyed ? 'lost' : 'off', phone: null }); } });
    c.on('error', () => {});
  }
  return {
    L, session,
    on(k, f){ (handlers[k] ||= []).push(f); return this; },
    start,
    url(){ return pairingUrl(new URL('racchetta.html', location.href).href, testSearch(), session, gate.token); },
    get token(){ return gate.token; },
    motion(now = performance.now()){ const sample = racketMotion.sample(now); return sample ? { ...sample, rtt: clock.rtt ?? L.rtt, transport: isLanMode() ? 'lan-webrtc' : 'webrtc' } : null; },
    get transport(){ return isLanMode() ? 'lan-webrtc' : 'webrtc'; },
    // strada attuale del collegamento con il telefono (null se non collegato o non ancora letta)
    get route(){ return conn ? L.route || null : null; },
    // diagnostica: frequenza e età dell'ultimo arrivo per tipo di messaggio (fo, sw, bin, sm, rs…), orologio
    // swings: da quale percorso è arrivata la prima copia di ogni colpo e quante copie in più sono state scartate
    // gap: buco più lungo tra due arrivi nell'ultimo secondo intero (ms), contando anche il silenzio fino a ora; bunch:
    // arrivi a grappolo nello stesso secondo
    stats(now = performance.now()){ const out = {}; for (const [k, r] of Object.entries(rates)){ const age = r.last == null ? null : now - r.last; out[k] = { hz: r.hz, gap: r.gap == null && age == null ? null : Math.round(Math.max(r.gap || 0, age || 0)), bunch: r.bunch, ageMs: age == null ? null : Math.round(age), count: r.count }; } return { rates: out, rtt: clock.rtt ?? L.rtt, clockOk: clock.ok, clockSamples: clock.samples ?? null, swings: { ...copies }, route: conn ? L.route || null : null }; },
    // orientamento del piatto (presa orizzontale), se arrivato negli ultimi 250 ms
    face(now = performance.now()){ return faceSample && now - faceSample.at < 250 ? { ...faceSample, age: now - faceSample.at } : null; },
    get clock(){ return clock.ok ? { off: clock.off, rtt: clock.rtt } : null; },
    get connected(){ return !!(conn && conn.open); },
    get ready(){ return this.connected && L.phone === 'ready'; },
    // latenza di un colpo: metà del viaggio più il tempo per riconoscerlo sul telefono (serve per l'attesa del colpo)
    get latency(){ return ((clock.rtt ?? 80)/2 + 40)/1000; },
    send(m){ if (conn && conn.open) try { conn.send(m); } catch (e){} },
    cmd(c){ this.send({ t: 'cmd', c }); },
    // «Ricollega»: il telefono rifà il collegamento (canali nuovi) con la sua chiave di ripresa, senza ricaricare la pagina
    relink(){ if (!this.connected) return false; this.cmd('relink'); return true; },
    // «Scollega»: il telefono perde la chiave di ripresa, per ricollegarsi serve un QR nuovo
    forget(){ this.send({ t: 'bye' }); gate.forget(); if (conn) try { conn.close(); } catch (e){} conn = null; stopRoute(); set({ state: peer && !peer.destroyed ? 'waiting' : 'off', phone: null }); },
    stop(){ ++startEpoch; starting = null; clearInterval(tick); stopRoute(); if (peer) peer.destroy(); peer = null; conn = null; set({ state: 'off', phone: null }); },
  };
}
