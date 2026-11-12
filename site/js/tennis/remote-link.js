// Telecomando dello staff, lato gioco (B27): il computer aspetta il telefono dello staff sul suo indirizzo fisso
// (remote-pairing.js: id della sessione e chiave salvati), con la stessa segnalazione della racchetta: in LAN quella del
// server del programma Windows (/lan-signal, lan-transport.js), altrimenti PeerJS (link.js, peerConfig).
// Dal telefono: hello { role: 'remote', k | c | r }, ping { c }, cmd { c, n, y }.
// Al telefono: welcome { r, s }, deny { why }, pong { c }, st (stato del gioco e comandi possibili), ack { n, ok, msg,
// ask } (esito di un comando; ask: serve la conferma), bye (scollegato: il telefono dimentica la chiave).
// Niente sensori e niente colpi: questo collegamento non arriva mai alla racchetta.
import { LanPeer, isLanMode } from './lan-transport.js';
import { peerConfig, loadPeer, iceReady, testSearch } from './link.js';
import { REMOTE, createRemoteGate, remotePairingUrl, parseRemoteCommand, codePeerId } from './remote-pairing.js';

// errori della segnalazione con cui l'id resta occupato dal collegamento di prima (pagina ricaricata, programma
// riavviato): si riprova finché il server non lo libera (LAN: entro due ping, ~20 s; PeerJS: alla chiusura del socket)
const ID_TAKEN = new Set(['unavailable-id', 'id-unavailable']);
const browserStore = key => ({
  load(){ try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } },
  save(v){ try { localStorage.setItem(key, JSON.stringify(v)); } catch {} },
});

export function createRemoteLink({ store = browserStore(REMOTE.storageKey), pageUrl = () => new URL('telecomando.html', location.href).href, now = () => Date.now(), lan = isLanMode } = {}){
  const gate = createRemoteGate({ store, now });
  const S = { state: 'off', connected: false, pairing: false, error: null, pairs: 0, resumes: 0, denied: 0, lastCmd: null };
  const H = { change: [], cmd: [] };
  const emit = (k, v) => { for (const f of H[k] || []) try { f(v); } catch (e){ console.error(e); } };
  const set = p => { Object.assign(S, p); emit('change', S); };
  let peer = null, codePeer = null, conn = null, lastSeen = 0, tick = null, starting = null, retry = null, status = null, lastCode = null;
  const seen = [];                                       // ultimi numeri dei comandi (copie dopo un ricollegamento)

  const makePeer = async id => {
    const Peer = lan() ? LanPeer : (await Promise.all([loadPeer(), iceReady().catch(() => null)]))[0];
    return new Peer(id, peerConfig());
  };
  function listen(p, { main }){
    p.on('open', () => { if (main) set({ state: conn ? 'connected' : 'waiting', error: null }); });
    p.on('connection', c => accept(c));
    p.on('disconnected', () => { if (!p.destroyed) setTimeout(() => { if (!p.destroyed) try { p.reconnect(); } catch {} }, 1500); });
    p.on('error', e => {
      if (e?.type === 'peer-unavailable') return;
      if (ID_TAKEN.has(e?.type)){
        // id ancora del collegamento di prima: si ricrea il Peer tra poco (solo quello principale; il codice si rifà)
        if (main){ set({ state: 'retry', error: e.type }); clearTimeout(retry); retry = setTimeout(() => { if (peer === p){ try { p.destroy(); } catch {} peer = null; start(); } }, 3000); }
        else if (codePeer === p){ try { p.destroy(); } catch {} codePeer = null; }
        return;
      }
      if (main) set({ state: conn ? S.state : 'error', error: e?.type || String(e) });
    });
  }
  function start(){
    if (peer && !peer.destroyed) return Promise.resolve();
    if (starting) return starting;
    const p = starting = (async () => {
      set({ state: 'starting', error: null });
      try { peer = await makePeer(gate.session); listen(peer, { main: true }); }
      catch { set({ state: 'error', error: 'libreria' }); }
      clearInterval(tick);
      tick = setInterval(beat, 1000);
    })().finally(() => { if (starting === p) starting = null; });
    return p;
  }
  function beat(){
    if (conn && now() - lastSeen > REMOTE.lostMs){ const c = conn; conn = null; try { c.close(); } catch {} set({ connected: false, state: peer && !peer.destroyed ? 'waiting' : 'off' }); }
    // pannello «Collega» aperto: codici nuovi alla scadenza, e l'indirizzo del codice da scrivere li segue
    if (S.pairing){ if (gate.expired) gate.rotate(); syncCodePeer(); }
  }
  // ascolto sull'indirizzo del codice scritto a mano, solo con il pannello «Collega» aperto
  async function syncCodePeer(){
    const want = S.pairing ? gate.code : null;
    if (want === lastCode) return;
    lastCode = want;
    if (codePeer){ try { codePeer.destroy(); } catch {} codePeer = null; }
    if (!want) { emit('change', S); return; }
    try { const p = await makePeer(codePeerId(want)); if (lastCode !== want || !S.pairing){ p.destroy(); return; } codePeer = p; listen(p, { main: false }); }
    catch {}
    emit('change', S);
  }
  function accept(c){
    let ok = false;
    const timer = setTimeout(() => { if (!ok) try { c.close(); } catch {} }, 15000);
    c.on('data', d => {
      if (!d || typeof d !== 'object') return;
      if (!ok){
        if (d.t !== 'hello') return c.close();
        const res = gate.admit(d);
        if (!res.ok){ set({ denied: S.denied + 1 }); try { c.send({ t: 'deny', why: res.why }); } catch {} setTimeout(() => { try { c.close(); } catch {} }, 200); return; }
        ok = true; clearTimeout(timer);
        // un solo telecomando: chi entra con la chiave giusta (lo stesso telefono che si ricollega) o con il codice dello
        // staff (abbinamento nuovo) prende il posto del collegamento di prima; quello vecchio riceve «scollegato»
        const previous = conn;
        if (previous && previous !== c){ if (!res.resumed) try { previous.send({ t: 'bye' }); } catch {} setTimeout(() => { try { previous.close(); } catch {} }, 150); }
        conn = c; lastSeen = now();
        try { c.send({ t: 'welcome', r: res.resume, s: gate.session }); } catch {}
        if (!res.resumed){ S.pairing = false; syncCodePeer(); }
        set({ connected: true, state: 'connected', error: null, ...(res.resumed ? { resumes: S.resumes + 1 } : { pairs: S.pairs + 1 }) });
        if (status) try { c.send(status); } catch {}
        return;
      }
      if (c !== conn) return;
      lastSeen = now();
      if (d.t === 'ping'){ try { c.send({ t: 'pong', c: d.c }); } catch {} return; }
      const cmd = parseRemoteCommand(d);
      if (!cmd) return;
      if (cmd.n != null){ if (seen.includes(cmd.n)) return; seen.push(cmd.n); if (seen.length > 32) seen.shift(); }
      S.lastCmd = cmd.c;
      emit('cmd', { ...cmd, reply: m => { try { c.send({ t: 'ack', n: cmd.n, ...m }); } catch {} } });
    });
    c.on('close', () => { clearTimeout(timer); if (c === conn){ conn = null; set({ connected: false, state: peer && !peer.destroyed ? 'waiting' : 'off' }); } });
    c.on('error', () => {});
  }
  return {
    S, gate,
    on(k, f){ (H[k] ||= []).push(f); return this; },
    start,
    get session(){ return gate.session; },
    get token(){ return gate.token; },
    get code(){ return gate.code; },
    get paired(){ return gate.paired; },
    get connected(){ return !!conn?.open; },
    // diagnostica: il canale del telecomando (LAN: canale «control» di lan-transport.js)
    get channel(){ return conn ? { open: !!conn.open, state: conn.control?.readyState ?? null, buffered: conn.control?.bufferedAmount ?? conn.bufferSize ?? null } : null; },
    // pannello «Collega» aperto (on) o chiuso: codici nuovi a ogni apertura
    pairing(on){
      if (on){ gate.rotate(); S.pairing = true; start().then(syncCodePeer); }
      else { S.pairing = false; syncCodePeer(); }
      emit('change', S);
    },
    url(){ return remotePairingUrl(pageUrl(), testSearch(), gate.session, gate.token); },
    // stato del gioco per il telefono: mandato subito se è cambiato e tenuto per chi si collega dopo
    status(st){
      const msg = { t: 'st', ...st }, text = JSON.stringify(msg);
      if (status && JSON.stringify(status) === text) return false;
      status = msg;
      if (conn?.open) try { conn.send(msg); } catch {}
      return true;
    },
    // «Scollega il telecomando»: il telefono dimentica la chiave, la sessione resta in ascolto per un abbinamento nuovo
    forget(){
      if (conn) try { conn.send({ t: 'bye' }); } catch {}
      const c = conn; conn = null; setTimeout(() => { try { c?.close(); } catch {} }, 150);
      gate.forget();
      // pannello «Collega» aperto: il codice nuovo vale subito (non al giro dopo)
      if (S.pairing) syncCodePeer();
      set({ connected: false, state: peer && !peer.destroyed ? 'waiting' : 'off' });
    },
    stop(){ clearInterval(tick); clearTimeout(retry); S.pairing = false; lastCode = null; try { codePeer?.destroy(); } catch {} codePeer = null; try { peer?.destroy(); } catch {} peer = null; conn = null; set({ state: 'off', connected: false }); },
  };
}
