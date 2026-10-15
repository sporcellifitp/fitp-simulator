// Partita tra amici con un link: trasporto tra i due computer (WebRTC con PeerJS, connessione diretta e cifrata).
// Chi invita è l'«host»: fa girare la partita (ArcadeMatch) e manda lo stato all'amico 30 volte al secondo; l'amico manda
// i suoi colpi con l'istante già convertito sull'orologio della partita (vedi net.js). Nel link: id della sessione e codice
// monouso dopo il «#» (non arrivano ai server); chi entra riceve una chiave di ripresa per rientrare se cade la rete.
// Dall'amico: join {k|r, name, ctrl, ready}, tq (orologio), info, in (comandi), bye.
// All'amico: welcome {r, host}, deny {why}, tr (orologio), lobby, start, s (stato), e (eventi), pause, end, bye.
import { createGate, newSessionId, INVITE_PREFIX, inviteUrl, createClock } from './pairing.js';
import { peerConfig, loadPeer, testSearch } from './link.js';

const HEART = 1000, LOST = 5000;

export function hostSession(){
  const gate = createGate({ ttl: 60*60*1000 });
  const id = newSessionId(undefined, INVITE_PREFIX);
  const S = { state: 'off', guest: null, error: null };
  const H = { change: [], input: [], info: [] };
  let peer = null, conn = null, lastSeen = 0, tick = null;
  const emit = (k, v) => { for (const f of H[k]) try { f(v); } catch (e){ console.error(e); } };
  const set = p => { Object.assign(S, p); emit('change', S); };

  async function start(){
    if (peer && !peer.destroyed) return;
    set({ state: 'starting', error: null });
    try {
      const Peer = await loadPeer();
      peer = new Peer(id, peerConfig());
      peer.on('open', () => set({ state: 'open' }));
      peer.on('connection', accept);
      peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => peer && !peer.destroyed && peer.reconnect(), 1500); });
      peer.on('error', e => { if (e.type !== 'peer-unavailable') set({ state: conn ? S.state : 'error', error: e.type || String(e) }); });
    } catch (e){ set({ state: 'error', error: 'libreria' }); }
    clearInterval(tick);
    tick = setInterval(() => {
      if (conn && Date.now() - lastSeen > LOST){ const c = conn; conn = null; try { c.close(); } catch (e){} gate.release(); set({ guest: S.guest && { ...S.guest, connected: false } }); }
    }, HEART);
  }
  function accept(c){
    let ok = false;
    const timer = setTimeout(() => { if (!ok) c.close(); }, 15000);
    c.on('data', d => {
      if (!d || typeof d !== 'object') return;
      if (!ok){
        if (d.t !== 'join') return c.close();
        if (conn && conn.open && conn !== c && !d.r){ c.send({ t: 'deny', why: 'busy' }); setTimeout(() => c.close(), 200); return; }
        const res = gate.admit(c.peer, d.r ? { r: d.r } : d);
        if (!res.ok){ c.send({ t: 'deny', why: res.why === 'expired' ? 'expired' : 'denied' }); setTimeout(() => c.close(), 200); return; }
        ok = true; clearTimeout(timer);
        if (conn && conn !== c) try { conn.close(); } catch (e){}
        conn = c; lastSeen = Date.now();
        const name = String(d.name || 'Amico').slice(0, 16);
        set({ guest: { name, ctrl: d.ctrl === 'phone' ? 'phone' : 'mouse', ready: !!d.ready, connected: true, resumed: !!res.resumed } });
        c.send({ t: 'welcome', r: res.resume });
        return;
      }
      if (c !== conn) return;
      lastSeen = Date.now();
      if (d.t === 'tq'){ c.send({ t: 'tr', c: d.c, h: performance.now() }); return; }
      if (d.t === 'info'){ set({ guest: { ...S.guest, name: String(d.name || S.guest.name).slice(0, 16), ctrl: d.ctrl === 'phone' ? 'phone' : 'mouse', ready: !!d.ready } }); emit('info', S.guest); return; }
      if (d.t === 'in'){ emit('input', d); return; }
      if (d.t === 'bye'){ conn = null; gate.forget(); set({ guest: null }); try { c.close(); } catch (e){} }
    });
    c.on('close', () => { clearTimeout(timer); if (c === conn){ conn = null; gate.release(); set({ guest: S.guest && { ...S.guest, connected: false } }); } });
    c.on('error', () => {});
  }
  return {
    S, id,
    on(k, f){ H[k].push(f); return this; },
    start,
    url(){ return inviteUrl(location.origin + location.pathname, testSearch(), id, gate.token); },
    get connected(){ return !!(conn && conn.open); },
    send(m){ if (conn && conn.open) try { conn.send(m); } catch (e){} },
    stop(){ this.send({ t: 'bye' }); clearInterval(tick); setTimeout(() => { if (peer) peer.destroy(); peer = null; conn = null; }, 150); set({ state: 'off', guest: null }); },
  };
}

export function joinSession(invite){
  const S = { state: 'off', why: null, host: null, rtt: null };
  const H = { change: [], msg: [] };
  const clock = createClock();                                      // ora dell'host ≈ ora locale + off (ms)
  const key = 'racchetta.sfida.' + invite.session;
  let peer = null, conn = null, me = { name: '', ctrl: 'mouse', ready: false }, tick = null, lastSeen = 0, tries = 0, closing = false;
  const emit = (k, v) => { for (const f of H[k]) try { f(v); } catch (e){ console.error(e); } };
  const set = p => { Object.assign(S, p); emit('change', S); };
  const ss = { get(){ try { return sessionStorage.getItem(key); } catch (e){ return null; } }, set(v){ try { sessionStorage.setItem(key, v); } catch (e){} }, del(){ try { sessionStorage.removeItem(key); } catch (e){} } };

  async function connect(){
    set({ state: 'connecting', why: null });
    clearTimeout(connect.t); connect.t = setTimeout(() => { if (S.state === 'connecting') lost(); }, 15000);   // niente risposta: si riprova
    try {
      const Peer = await loadPeer();
      if (peer && !peer.destroyed) peer.destroy();
      peer = new Peer(peerConfig());
      peer.on('open', () => {
        const c = peer.connect(invite.session, { reliable: true, serialization: 'json' });
        c.on('open', () => { const r = ss.get(); c.send({ t: 'join', v: 1, ...(r ? { r } : { k: invite.token }), ...me }); });
        c.on('data', d => onData(c, d));
        c.on('close', () => { if (c === conn) lost(); });
        c.on('error', () => {});
      });
      peer.on('error', e => {
        if (e.type === 'peer-unavailable'){ set({ state: 'denied', why: 'gone' }); return; }
        lost();
      });
    } catch (e){ set({ state: 'error', why: 'libreria' }); }
    clearInterval(tick);
    tick = setInterval(() => {
      if (conn && conn.open) conn.send({ t: 'tq', c: performance.now() });
      if (conn && Date.now() - lastSeen > LOST){ const c = conn; conn = null; try { c.close(); } catch (e){} lost(); }
    }, HEART);
  }
  function onData(c, d){
    if (!d || typeof d !== 'object') return;
    lastSeen = Date.now();
    if (d.t === 'welcome'){ conn = c; tries = 0; clock.reset(); if (d.r) ss.set(d.r); set({ state: 'in' }); c.send({ t: 'tq', c: performance.now() }); return; }
    if (d.t === 'deny'){ ss.del(); set({ state: 'denied', why: d.why }); try { c.close(); } catch (e){} return; }
    if (d.t === 'tr'){ clock.add(d.c, d.h, performance.now()); S.rtt = clock.rtt; return; }
    if (d.t === 'bye'){ closing = true; ss.del(); set({ state: 'closed' }); return; }
    emit('msg', d);
  }
  function lost(){
    conn = null;
    if (closing || S.state === 'denied' || S.state === 'closed') return;
    set({ state: 'lost' });
    if (tries++ < 10) setTimeout(connect, Math.min(6000, 1000*tries));
  }
  return {
    S, clock, invite,
    on(k, f){ H[k].push(f); return this; },
    connect,
    setMe(m){ me = { ...me, ...m }; if (conn && conn.open) conn.send({ t: 'info', ...me }); },
    send(m){ if (conn && conn.open) try { conn.send(m); } catch (e){} },
    leave(){ closing = true; this.send({ t: 'bye' }); ss.del(); clearInterval(tick); setTimeout(() => { if (peer) peer.destroy(); }, 150); set({ state: 'off' }); },
  };
}
