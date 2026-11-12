// Telecomando dello staff, lato gioco (B27): il computer aspetta il telefono dello staff con la stessa segnalazione della
// racchetta: in LAN quella del server del programma Windows (/lan-signal, lan-transport.js), altrimenti PeerJS
// (link.js, peerConfig). Regole dell'abbinamento e della ripresa: remote-pairing.js (da leggere prima).
// Tre indirizzi:
//   'main'  telecomando-…          fisso, solo se abbinato: ripresa con la prova reciproca della chiave (mai QR né codice);
//   'pair'  telecomando-abbina-…   quello del QR, solo a foglio aperto;
//   'code'  telecomando-codice-…   quello del codice scritto a mano, solo a foglio aperto.
// Dal telefono: hello { role: 'remote', k | c } (abbinamento) o hello { role: 'remote', n } + proof { m } (ripresa),
// ping { c }, cmd { c, n, y }.
// Al telefono: wait { num } (abbinamento da confermare sul computer), welcome { s, key } (abbinamento confermato:
// indirizzo fisso e chiave, una volta sola) o welcome {} (ripresa riuscita), proof { m, n } (prova del gioco e numero
// per la prova del telefono), deny { why }, pong { c }, st (stato del gioco e comandi possibili), ack { n, ok, msg, ask }
// (esito di un comando; ask: serve la conferma), bye { why } (why 'other': la stessa chiave è entrata da un'altra
// pagina, il telefono resta abbinato; senza why: scollegato, il telefono dimentica la chiave).
// Niente sensori e niente colpi: questo collegamento non arriva mai alla racchetta.
import { LanPeer, isLanMode } from './lan-transport.js';
import { peerConfig, loadPeer, iceReady, testSearch } from './link.js';
import { same } from './pairing.js';
import { REMOTE, NONCE, createRemoteGate, remotePairingUrl, parseRemoteCommand, codePeerId, newNonce, newPairNumber, hasSubtle } from './remote-pairing.js';

// errori della segnalazione con cui l'id resta occupato dal collegamento di prima (pagina ricaricata, programma
// riavviato): si riprova finché il server non lo libera (LAN: entro due ping, ~20 s; PeerJS: alla chiusura del socket)
const ID_TAKEN = new Set(['unavailable-id', 'id-unavailable']);
const browserStore = key => ({
  load(){ try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } },
  save(v){ try { localStorage.setItem(key, JSON.stringify(v)); } catch {} },
});

export function createRemoteLink({ store = browserStore(REMOTE.storageKey), pageUrl = () => new URL('telecomando.html', location.href).href, now = () => Date.now(), lan = isLanMode } = {}){
  const gate = createRemoteGate({ store, now });
  // request: { num } quando un telefono chiede di diventare il telecomando (da confermare sul computer)
  const S = { state: 'off', connected: false, pairing: false, request: null, closedWhy: null, error: null, pairs: 0, resumes: 0, denied: 0, lastCmd: null };
  const H = { change: [], cmd: [] };
  const emit = (k, v) => { for (const f of H[k] || []) try { f(v); } catch (e){ console.error(e); } };
  const set = p => { Object.assign(S, p); emit('change', S); };
  let peer = null, peerId = null, pairPeer = null, codePeer = null, conn = null, pending = null, lastSeen = 0, tick = null, starting = null, retry = null, status = null, lastPair = null, lastCode = null;
  const send = (c, m) => { try { c.send(m); } catch {} };
  const closeSoon = (c, ms = 200) => setTimeout(() => { try { c.close(); } catch {} }, ms);

  const makePeer = async id => {
    const Peer = lan() ? LanPeer : (await Promise.all([loadPeer(), iceReady().catch(() => null)]))[0];
    return new Peer(id, peerConfig());
  };
  function listen(p, kind){
    const main = kind === 'main';
    p.on('open', () => { if (main && peer === p) set({ state: conn ? 'connected' : 'waiting', error: null }); });
    p.on('connection', c => accept(c, kind));
    p.on('disconnected', () => { if (!p.destroyed) setTimeout(() => { if (!p.destroyed) try { p.reconnect(); } catch {} }, 1500); });
    p.on('error', e => {
      if (e?.type === 'peer-unavailable') return;
      if (ID_TAKEN.has(e?.type)){
        // id ancora del collegamento di prima: si ricrea il Peer tra poco (quello fisso; gli altri si rifanno da soli)
        if (main && peer === p){ set({ state: 'retry', error: e.type }); clearTimeout(retry); retry = setTimeout(() => { if (peer === p){ try { p.destroy(); } catch {} peer = null; peerId = null; start(); } }, 3000); }
        return;
      }
      if (main && peer === p) set({ state: conn ? S.state : 'error', error: e?.type || String(e) });
    });
  }
  // indirizzo fisso: in ascolto solo se c'è un abbinamento (senza, il gioco non apre nessun collegamento)
  function start(){
    if (!tick){ tick = setInterval(beat, 1000); tick.unref?.(); }
    if (!gate.paired) return Promise.resolve();
    if (peer && !peer.destroyed && peerId === gate.session) return Promise.resolve();
    if (starting) return starting;
    const p = starting = (async () => {
      set({ state: 'starting', error: null });
      const id = gate.session;
      try {
        if (peer){ try { peer.destroy(); } catch {} peer = null; }
        const made = await makePeer(id);
        if (gate.session !== id){ try { made.destroy(); } catch {} return; }          // scollegato o riabbinato nel frattempo
        peer = made; peerId = id; listen(peer, 'main');
      } catch { set({ state: 'error', error: 'libreria' }); }
    })().finally(() => { if (starting === p){ starting = null; if (gate.paired && peerId !== gate.session) start(); } });
    return p;
  }
  function stopMain(){ clearTimeout(retry); const p = peer; peer = null; peerId = null; if (p) try { p.destroy(); } catch {} }
  function beat(){
    if (conn && now() - lastSeen > REMOTE.lostMs){ const c = conn; conn = null; try { c.close(); } catch {} set({ connected: false, state: peer && !peer.destroyed ? 'waiting' : 'off' }); }
    // foglio aperto da più di 5 minuti: QR e codice non valgono più (serve «Nuovo QR» sul computer)
    if (S.pairing && gate.expired) endPairing('expired');
    else if (S.pairing) syncPairPeers();
  }
  // indirizzi dell'abbinamento (QR e codice): in ascolto solo a foglio aperto; il codice cambia dopo i tentativi sbagliati
  async function syncPairPeers(){
    // con un telefono in attesa della conferma gli indirizzi restano quelli da cui è arrivato (il codice usato è già
    // cambiato: rifare adesso il suo indirizzo chiuderebbe proprio quel collegamento); si riallineano a richiesta chiusa
    if (pending) return;
    const wantPair = S.pairing ? gate.pairId : null, wantCode = S.pairing ? gate.code : null;
    if (wantPair !== lastPair){
      lastPair = wantPair;
      if (pairPeer){ try { pairPeer.destroy(); } catch {} pairPeer = null; }
      if (wantPair) try { const p = await makePeer(wantPair); if (lastPair !== wantPair){ p.destroy(); } else { pairPeer = p; listen(p, 'pair'); } } catch {}
    }
    if (wantCode !== lastCode){
      lastCode = wantCode;
      if (codePeer){ try { codePeer.destroy(); } catch {} codePeer = null; }
      if (wantCode) try { const p = await makePeer(codePeerId(wantCode)); if (lastCode !== wantCode){ p.destroy(); } else { codePeer = p; listen(p, 'code'); } } catch {}
    }
    emit('change', S);
  }
  function dropPending(why){
    const p = pending; pending = null;
    if (p){ send(p.c, { t: 'deny', why }); closeSoon(p.c); }
    gate.rejectPairing();
  }
  function endPairing(why = null){
    const waiting = !!pending;
    dropPending(why === 'expired' ? 'expired' : 'closed');
    gate.closePairing(why);
    set({ pairing: false, request: null, closedWhy: why });
    // (a chi stava chiedendo arriva prima il rifiuto: gli indirizzi si chiudono un attimo dopo; intanto non valgono più)
    if (waiting) setTimeout(syncPairPeers, 300); else syncPairPeers();
  }
  function deny(c, why){ set({ denied: S.denied + 1 }); send(c, { t: 'deny', why }); closeSoon(c); }
  function admit(c, resumed){
    // un solo telecomando collegato: chi entra con la prova della chiave prende il posto del collegamento di prima
    // (lo stesso telefono che si ricollega, o la stessa chiave aperta in un'altra pagina: quella di prima lo sa)
    const previous = conn;
    if (previous && previous !== c){ send(previous, { t: 'bye', why: 'other' }); closeSoon(previous, 150); }
    conn = c; lastSeen = now();
    send(c, { t: 'welcome' });
    set({ connected: true, state: 'connected', error: null, resumes: S.resumes + (resumed ? 1 : 0) });
    if (status) send(c, status);
  }
  function accept(c, kind){
    // stage: 'hello' → ('proof' →) 'on' | 'wait' | 'done'. Un tentativo per collegamento: dopo il primo messaggio gli altri
    // «hello» non si guardano più
    let stage = 'hello', gameNonce = null;
    const timer = setTimeout(() => { if (stage !== 'on' && stage !== 'wait') try { c.close(); } catch {} }, 15000);
    c.on('data', async d => {
      if (!d || typeof d !== 'object') return;
      if (stage === 'on'){
        if (c !== conn) return;
        lastSeen = now();
        if (d.t === 'ping'){ send(c, { t: 'pong', c: d.c }); return; }
        const cmd = parseRemoteCommand(d);
        if (!cmd) return;
        S.lastCmd = cmd.c;
        emit('cmd', { ...cmd, reply: m => send(c, { t: 'ack', n: cmd.n, ...m }) });
        return;
      }
      if (stage === 'hello'){
        stage = 'done';
        if (d.t !== 'hello'){ try { c.close(); } catch {} return; }
        if (d.role !== 'remote') return deny(c, 'role');
        if (kind !== 'main'){
          const res = gate.request(d, kind);
          if (!res.ok){ if (!gate.open && S.pairing) endPairing(gate.closedWhy); else syncPairPeers(); return deny(c, res.why); }
          clearTimeout(timer);
          stage = 'wait';
          pending = { c, num: newPairNumber() };
          send(c, { t: 'wait', num: pending.num });
          set({ request: { num: pending.num } });
          syncPairPeers();
          return;
        }
        // ripresa: niente QR né codice su questo indirizzo; la chiave non viaggia, la si prova
        if (!gate.paired || typeof d.n !== 'string' || !NONCE.test(d.n)) return deny(c, 'unpaired');
        if (!hasSubtle()) return deny(c, 'insecure');
        gameNonce = newNonce();
        const m = await gate.prove('game', d.n);
        if (!m) return deny(c, 'unpaired');
        stage = 'proof';
        send(c, { t: 'proof', m, n: gameNonce });
        return;
      }
      if (stage === 'proof'){
        stage = 'done';
        const want = d.t === 'proof' && typeof d.m === 'string' ? await gate.prove('phone', gameNonce) : null;
        if (!want || !same(d.m, want)) return deny(c, 'unpaired');
        clearTimeout(timer);
        stage = 'on';
        admit(c, true);
      }
    });
    c.on('close', () => {
      clearTimeout(timer);
      if (pending?.c === c){ pending = null; gate.rejectPairing(); set({ request: null }); syncPairPeers(); }
      if (c === conn){ conn = null; set({ connected: false, state: peer && !peer.destroyed ? 'waiting' : 'off' }); }
    });
    c.on('error', () => {});
  }
  return {
    S, gate,
    on(k, f){ (H[k] ||= []).push(f); return this; },
    start,
    get session(){ return gate.session; },
    get code(){ return gate.code; },
    get paired(){ return gate.paired; },
    get connected(){ return !!conn?.open; },
    get secure(){ return hasSubtle(); },
    // diagnostica: il canale del telecomando (LAN: canale «control» di lan-transport.js)
    get channel(){ return conn ? { open: !!conn.open, state: conn.control?.readyState ?? null, buffered: conn.control?.bufferedAmount ?? conn.bufferSize ?? null } : null; },
    // foglio dell'abbinamento aperto (on: QR e codice nuovi, 5 minuti) o chiuso (QR e codice non valgono più da subito,
    // chi stava chiedendo è rifiutato)
    pairing(on){
      if (on){ dropPending('closed'); gate.openPairing(); set({ pairing: true, request: null, closedWhy: null }); start(); syncPairPeers(); }
      else if (S.pairing || pending) endPairing(null);
    },
    // indirizzo del QR (null a foglio chiuso o con una richiesta in attesa)
    url(){ return S.pairing && gate.open && !pending ? remotePairingUrl(pageUrl(), testSearch(), gate.pairId, gate.token) : null; },
    // «Conferma» sul computer (natpf_remote.js lo chiama solo per un tasto o un clic veri): il telefono che chiede
    // diventa il telecomando, con indirizzo fisso e chiave nuovi; quello di prima è scollegato
    confirm(){
      const p = pending;
      if (!p) return false;
      const fixed = gate.confirmPairing();
      if (!fixed){ dropPending('closed'); set({ request: null }); return false; }
      pending = null;
      const old = conn; conn = null;
      if (old){ send(old, { t: 'bye' }); closeSoon(old, 150); }
      send(p.c, { t: 'welcome', s: fixed.session, key: fixed.key });
      set({ pairing: false, request: null, closedWhy: null, connected: false, pairs: S.pairs + 1, state: 'starting' });
      // il telefono confermato si ricollega all'indirizzo nuovo con la prova della chiave: gli indirizzi dell'abbinamento
      // e quello fisso di prima si chiudono appena il benvenuto è partito
      setTimeout(() => { syncPairPeers(); start(); }, 400);
      return true;
    },
    // «Rifiuta» sul computer: quel telefono non entra, il foglio torna al QR (nuovo)
    refuse(){ if (!pending) return false; dropPending('refused'); set({ request: null }); setTimeout(syncPairPeers, 300); return true; },
    // stato del gioco per il telefono: mandato subito se è cambiato e tenuto per chi si collega dopo
    status(st){
      const msg = { t: 'st', ...st }, text = JSON.stringify(msg);
      if (status && JSON.stringify(status) === text) return false;
      status = msg;
      if (conn?.open) send(conn, msg);
      return true;
    },
    // «Scollega il telecomando»: il telefono dimentica la chiave, indirizzo e chiave del gioco sono buttati
    forget(){
      if (conn) send(conn, { t: 'bye' });
      const c = conn; conn = null; if (c) closeSoon(c, 150);
      gate.forget();
      setTimeout(stopMain, 300);
      set({ connected: false, state: 'off' });
    },
    stop(){ clearInterval(tick); tick = null; clearTimeout(retry); if (S.pairing || pending) endPairing(null); stopMain(); conn = null; set({ state: 'off', connected: false }); },
  };
}
