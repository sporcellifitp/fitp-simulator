// Il telefono come racchetta, lato computer: sessione WebRTC (PeerJS), QR, controllo di chi si collega, orologi.
// Il computer è la «base»: si registra sul server di segnalazione con un id casuale e aspetta il telefono.
// Dal telefono: hello {k|r}, ping, dq (risposta all'orologio), st (stato), cal (passi della calibrazione), sw (colpo, con v e tw facoltativi), toss,
// fo (orientamento del piatto, solo con la presa orizzontale: facoltativo, chi non lo usa lo ignora), pr (preparazione
// del colpo) e sm (giroscopio in JSON), facoltativi e solo se il gioco li chiede con cfg.
// Al telefono: welcome {r}, deny, pong, dp (orologio), cmd (comandi della calibrazione), ev (esito del colpo, punto), ph (fase),
// e facoltativi cfg (preparazione, flusso dei sensori) ed ex (verso del colpo atteso).
// Orologi: ogni secondo il computer chiede l'ora al telefono e tiene la stima col viaggio più breve; così l'istante del
// colpo (il picco del movimento, misurato sul telefono) si porta sull'orologio del computer senza dipendere da quando il
// computer, magari impegnato a disegnare, riesce a leggere il messaggio.
import { LanPeer, isLanMode } from './lan-transport.js';
import { decodeSensor } from './sensor-packet.js';
import { createRacketMotion } from './racket-motion.js';
import { phoneInputTime } from './input-time.js';
import { parseSwingMessage } from './swing-message.js';
import { createGate, newSessionId, pairingUrl, createClock } from './pairing.js';

// server di segnalazione: quello pubblico di PeerJS; per le prove «?peer=127.0.0.1:9000»
export function peerConfig(){
  const m = /[?&]peer=([^&#]+)/.exec(location.search);
  if (!m) return { debug: 0 };
  const [host, port] = decodeURIComponent(m[1]).split(':');
  return { host, port: +(port || 443), path: '/fiw', secure: location.protocol === 'https:' && !/^(127\.|localhost)/.test(host), debug: 0 };
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
  // frequenza di arrivo per tipo di messaggio (Hz, media mobile) e ultimo arrivo: diagnostica, non entra nel gioco
  const rates = {};
  const countMsg = k => { const now = performance.now(), r = rates[k] || (rates[k] = { hz: 0, last: null, count: 0 }); if (r.last != null){ const dt = Math.max(1, now - r.last); r.hz += (1000/dt - r.hz)*.1; } r.last = now; r.count++; };
  const handlers = { swing: [], toss: [], change: [], cal: [], prep: [], raw: [] };
  let peer = null, conn = null, lastTok = gate.token, tick = null, lastSeen = 0;
  const clock = createClock(), racketMotion = createRacketMotion();
  const emit = (k, v) => { for (const f of handlers[k]) try { f(v); } catch (e){ console.error(e); } };
  const set = patch => { Object.assign(L, patch); emit('change', L); };

  async function start(){
    if (peer && !peer.destroyed) return;
    set({ state: 'starting', error: null });
    try {
      const Peer = isLanMode() ? LanPeer : await loadPeer();
      peer = new Peer(session, peerConfig());
      peer.on('open', () => set({ state: conn ? 'connected' : 'waiting' }));
      peer.on('connection', c => accept(c));
      peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => peer && !peer.destroyed && peer.reconnect(), 1500); });
      peer.on('error', e => { if (e.type === 'peer-unavailable') return; set({ state: conn ? L.state : 'error', error: e.type || String(e) }); });
    } catch (e){ set({ state: 'error', error: 'libreria' }); }
    clearInterval(tick);
    tick = setInterval(() => {
      if (gate.expired && !conn) gate.rotate();
      if (gate.token !== lastTok){ lastTok = gate.token; emit('change', L); }                 // QR nuovo
      if (conn) conn.send({ t: 'dp', d: performance.now() });
      // il telefono manda un segnale ogni secondo: se tace per 5 s (schermo spento, rete persa) è scollegato
      if (conn && Date.now() - lastSeen > 5000){ const c = conn; conn = null; gate.release(); try { c.close(); } catch (e){} set({ state: 'lost', phone: null }); }
    }, 1000);
  }
  function accept(c){
    let ok = false;
    const timer = setTimeout(() => { if (!ok) c.close(); }, 6000);                           // chi non si presenta entro 6 s viene chiuso
    c.on('data', d => {
      if (!d || typeof d !== 'object') return;
      if (c === conn) lastSeen = Date.now();
      if (!ok){
        if (d.t !== 'hello') return c.close();
        // c'è già un telefono collegato: può entrare solo lo stesso telefono che si ricollega (chiave di ripresa)
        if (conn && conn.open && conn !== c && !d.r){ c.send({ t: 'deny', why: 'busy' }); setTimeout(() => c.close(), 200); return; }
        const res = gate.admit(c.peer, d.r ? { r: d.r } : d);
        if (!res.ok){ c.send({ t: 'deny', why: res.why }); setTimeout(() => c.close(), 200); return; }
        ok = true; clearTimeout(timer);
        if (conn && conn !== c) try { conn.close(); } catch (e){}
        conn = c; lastSeen = Date.now(); clock.reset(); faceSample = null; racketMotion.setBias([0,0,0]); racketMotion.reset(); c.send({ t: 'welcome', r: res.resume });
        set({ state: 'connected', phone: 'sensors', error: null });
        return;
      }
      if (c !== conn) return;
      if (typeof d.t === 'string') countMsg(d.t);
      switch (d.t){
        case 'ping': c.send({ t: 'pong', c: d.c }); break;
        case 'dq': if (typeof d.p === 'number') clock.add(d.d, d.p, performance.now()); break;
        case 'st': if (d.s === 'ready' && d.b) racketMotion.setBias(d.b); if (d.s === 'ready' && L.phone !== 'ready') racketMotion.reset(); set({ phone: String(d.s || ''), rtt: clock.rtt != null ? Math.round(clock.rtt) : L.rtt, grip: d.gp === 'flat' || d.gp === 'upright' ? d.gp : L.grip, prep: d.pm === 1, hz: typeof d.hz === 'number' && isFinite(d.hz) ? Math.round(d.hz) : L.hz }); break;
        case 'fo': { const f = v => typeof v === 'number' && isFinite(v) ? Math.max(-180, Math.min(180, v)) : null; if (f(d.y) != null) faceSample = { yaw: f(d.y), pitch: f(d.p) ?? 0, roll: f(d.r) ?? 0, at: performance.now() }; break; }
        case 'cal': if (d.e?.kind === 'done') racketMotion.setBias(d.e.profile?.bias || [0,0,0]); emit('cal', d.e || {}); break;
        case 'sw': {
          // istante del colpo sull'orologio di questo computer (ms → s), con orologi allineati; se no, ritardo stimato
          const now = performance.now();
          const at = phoneInputTime({ peakMs: d.pk, nowMs: now, clock, latencyMs: d.lat });
          if (at == null) break;
          emit('swing', parseSwingMessage(d, { at, now }));
          break;
        }
        // facoltativi: preparazione del colpo (pr) e giroscopio in JSON quando non c'è il canale binario (sm)
        case 'pr': { const at = phoneInputTime({ peakMs: d.pk, nowMs: performance.now(), clock, latencyMs: d.lat }); if (at != null && (d.dir === 1 || d.dir === -1)) emit('prep', { dir: d.dir, peak: typeof d.v === 'number' ? d.v : null, angle: typeof d.a === 'number' ? d.a : null, at }); break; }
        case 'rs': if (typeof d.k === 'number') emit('raw', { t: d.k, rot: Array.isArray(d.r) ? d.r : null, acc: Array.isArray(d.a) ? d.a : null, accG: Array.isArray(d.g) ? d.g : null, at: performance.now() }); break;
        case 'sm': if (Array.isArray(d.r) && d.r.length === 3 && Number.isInteger(d.q) && typeof d.k === 'number') racketMotion.push({ sequence: d.q, t: d.k, rot: d.r.map(Number), acc: null, accG: null }, performance.now()); break;
        case 'toss': { const at = phoneInputTime({ peakMs: d.pk, nowMs: performance.now(), clock, latencyMs: 0 }); if (at != null) emit('toss', { at }); break; }
      }
    });
    c.on('motion', buffer => { if (ok && c === conn){ countMsg('bin'); const sample = decodeSensor(buffer); if (sample) racketMotion.push(sample, performance.now()); } });
    c.on('close', () => { clearTimeout(timer); if (c === conn){ conn = null; gate.release(); set({ state: peer && !peer.destroyed ? 'lost' : 'off', phone: null }); } });
    c.on('error', () => {});
  }
  return {
    L, session,
    on(k, f){ handlers[k].push(f); return this; },
    start,
    url(){ return pairingUrl(new URL('racchetta.html', location.href).href, testSearch(), session, gate.token); },
    get token(){ return gate.token; },
    motion(now = performance.now()){ const sample = racketMotion.sample(now); return sample ? { ...sample, rtt: clock.rtt ?? L.rtt, transport: isLanMode() ? 'lan-webrtc' : 'webrtc' } : null; },
    get transport(){ return isLanMode() ? 'lan-webrtc' : 'webrtc'; },
    // diagnostica: frequenza e età dell'ultimo arrivo per tipo di messaggio (fo, sw, bin, sm, rs…), orologio
    stats(now = performance.now()){ const out = {}; for (const [k, r] of Object.entries(rates)) out[k] = { hz: Math.round(r.hz), ageMs: r.last == null ? null : Math.round(now - r.last), count: r.count }; return { rates: out, rtt: clock.rtt ?? L.rtt, clockOk: clock.ok, clockSamples: clock.samples ?? null }; },
    // orientamento del piatto (presa orizzontale), se arrivato negli ultimi 250 ms
    face(now = performance.now()){ return faceSample && now - faceSample.at < 250 ? { ...faceSample, age: now - faceSample.at } : null; },
    get clock(){ return clock.ok ? { off: clock.off, rtt: clock.rtt } : null; },
    get connected(){ return !!(conn && conn.open); },
    get ready(){ return this.connected && L.phone === 'ready'; },
    // latenza di un colpo: metà del viaggio più il tempo per riconoscerlo sul telefono (serve per l'attesa del colpo)
    get latency(){ return ((clock.rtt ?? 80)/2 + 40)/1000; },
    send(m){ if (conn && conn.open) try { conn.send(m); } catch (e){} },
    cmd(c){ this.send({ t: 'cmd', c }); },
    // «Scollega»: il telefono perde la chiave di ripresa, per ricollegarsi serve un QR nuovo
    forget(){ this.send({ t: 'bye' }); gate.forget(); if (conn) try { conn.close(); } catch (e){} conn = null; set({ state: peer && !peer.destroyed ? 'waiting' : 'off', phone: null }); },
    stop(){ clearInterval(tick); if (peer) peer.destroy(); peer = null; conn = null; set({ state: 'off', phone: null }); },
  };
}
