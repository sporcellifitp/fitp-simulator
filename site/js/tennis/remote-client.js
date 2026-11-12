// Telecomando dello staff, lato telefono (B27), senza DOM: abbinamento da confermare sul computer, ripresa con la prova
// reciproca della chiave, ricollegamento senza fine. La pagina (telecomando.js) ci mette schermo e pulsanti.
// Regole: remote-pairing.js. Messaggi: remote-link.js.
//   const C = createRemoteClient({ store, makePeer, onChange, onStatus, onAck });
//   C.pair({ pair, token })   dal QR      C.pairCode(codice)   dal codice scritto      C.start()   ripresa se abbinato
// Stati (C.state): 'unpaired' non abbinato · 'connecting' · 'waiting' numero da confermare sul computer (C.number) ·
// 'on' collegato · 'lost' scollegato, si riprova · 'parked' la stessa chiave è aperta in un'altra pagina (C.start() per
// riprendere qui) · 'insecure' pagina senza https (niente ripresa).
// Il telefono non manda mai la chiave: alla ripresa manda un numero casuale, pretende dal gioco la prova della chiave su
// quel numero e solo dopo risponde con la sua. A chi non la prova (un altro programma sull'indirizzo del gioco) non
// manda nient'altro, e un «scollegato» o «non abbinato» arrivato prima della prova non fa dimenticare la chiave.
import { same } from './pairing.js';
import { REMOTE, NONCE, isRemoteSession, isPairId, normalizeCode, codePeerId, newNonce, remoteProof, hasSubtle } from './remote-pairing.js';

const KEY = /^[a-z0-9]{10,64}$/;
export function createRemoteClient({ store, makePeer, onChange = () => {}, onStatus = () => {}, onAck = () => {}, now = () => Date.now(),
  retryMs = tries => Math.min(5000, 1000*Math.min(tries, 5)), helloMs = 10000, pingMs = REMOTE.pingMs, lostMs = REMOTE.lostMs, codeRetryMs = 2000 } = {}){
  let saved = null;
  try { saved = store?.load?.() || null; } catch { saved = null; }
  if (!(isRemoteSession(saved?.session) && typeof saved?.key === 'string' && KEY.test(saved.key))) saved = null;
  // abbinamento in corso: { via: 'pair', id, token } | { via: 'code', id, code }
  let want = null, peer = null, conn = null, pending = null, epoch = 0, retryT = null, pingT = null, lastRx = 0, seq = 0, codeTries = 0;
  const C = {
    state: saved ? 'lost' : 'unpaired', why: null, text: '', number: null, tries: 0, status: null, sent: 0, acks: 0, rx: 0,
    get saved(){ return saved ? { session: saved.session, at: saved.at } : null; },
    get paired(){ return !!saved; },
    get pairing(){ return !!want; },
  };
  const set = (state, extra = {}) => { Object.assign(C, { state, number: null, ...extra }); try { onChange(C); } catch (e){ console.error(e); } };
  const send = (c, m) => { try { c.send(m); } catch {} };
  const forgetSaved = () => { saved = null; try { store?.clear?.(); } catch {} };
  function drop(){
    clearInterval(pingT); pingT = null;
    const p = peer; peer = null; pending = null; conn = null;
    try { p?.destroy(); } catch {}
  }
  // collegamento perso o non riuscito: si riprova sempre (1, 2, 3… fino a 5 s), finché la pagina è aperta
  function lost(why = ''){
    if (C.state === 'unpaired' || C.state === 'parked' || C.state === 'insecure') return;
    drop();
    C.tries++;
    set('lost', { why: why || null });
    clearTimeout(retryT);
    retryT = setTimeout(connect, retryMs(C.tries));
  }
  function unpaired(why, { forget = false } = {}){
    clearTimeout(retryT); ++epoch; drop();
    want = null;
    if (forget) forgetSaved();
    set(saved ? 'lost' : 'unpaired', { why });
    // un abbinamento non riuscito con una chiave ancora buona: si torna al telecomando di prima
    if (saved){ C.tries = 0; retryT = setTimeout(connect, 300); }
  }
  async function connect(){
    clearTimeout(retryT);
    const target = want ? want.id : saved?.session;
    if (!target) return set('unpaired', { why: C.why });
    // ripresa senza crypto.subtle (pagina non in https): niente strada in chiaro
    if (!want && !hasSubtle()){ drop(); return set('insecure', { why: 'insecure' }); }
    const my = ++epoch;
    drop();
    set('connecting', { why: C.why });
    try {
      const p = await makePeer();
      if (my !== epoch){ try { p.destroy(); } catch {} return; }
      peer = p;
      const current = () => my === epoch && peer === p;
      // senza risposta entro 10 s si riprova da capo (in attesa della conferma sul computer no)
      retryT = setTimeout(() => { if (current() && C.state === 'connecting') lost('il gioco non risponde'); }, helloMs);
      p.on('open', () => {
        if (!current() || pending) return;
        const c = pending = p.connect(target, { reliable: true, serialization: 'json' });
        // st: 'hello' → 'proof' (ripresa) | 'pair' (abbinamento) → 'on'
        const link = { st: 'hello', nonce: null };
        c.on('open', () => {
          if (!current() || pending !== c) return;
          if (want) send(c, want.via === 'code' ? { t: 'hello', role: 'remote', v: 2, c: want.code } : { t: 'hello', role: 'remote', v: 2, k: want.token });
          else { link.nonce = newNonce(); send(c, { t: 'hello', role: 'remote', v: 2, n: link.nonce }); }
          link.st = want ? 'pair' : 'proof';
        });
        c.on('data', d => { if (current() && (c === conn || c === pending)) onData(c, d, link, current); });
        c.on('close', () => { if (current() && (c === conn || c === pending)) lost(C.state === 'waiting' ? 'il computer ha chiuso l’abbinamento' : ''); });
        c.on('error', () => { if (current() && (c === conn || c === pending)) lost(); });
      });
      p.on('error', e => {
        if (!current()) return;
        // indirizzo che non c'è: gioco chiuso, PC spento, foglio chiuso o codice sbagliato
        if (e?.type === 'peer-unavailable'){
          if (want?.via === 'code' && ++codeTries < 3){ drop(); clearTimeout(retryT); retryT = setTimeout(connect, codeRetryMs); return; }
          if (want) return unpaired(want.via === 'code' ? 'code' : 'closed');
          return lost('gioco non trovato');
        }
        if (!conn?.open) lost();
      });
      p.on('disconnected', () => { if (current() && !conn?.open) lost(); });
    } catch { if (my === epoch) lost(); }
  }
  async function onData(c, d, link, current){
    if (!d || typeof d !== 'object') return;
    lastRx = now(); C.rx++;
    if (link.st === 'on'){
      switch (d.t){
        case 'st': C.status = d; try { onStatus(d); } catch (e){ console.error(e); } break;
        case 'ack': C.acks++; try { onAck(d); } catch (e){ console.error(e); } break;
        // la stessa chiave è entrata da un'altra pagina: questa si ferma (niente tira e molla), la chiave resta
        case 'bye':
          if (d.why === 'other'){ clearTimeout(retryT); ++epoch; drop(); set('parked', { why: 'other' }); }
          else unpaired('bye', { forget: true });
          break;
      }
      return;
    }
    if (link.st === 'pair'){
      if (d.t === 'wait' && Number.isInteger(d.num)){ clearTimeout(retryT); set('waiting', { number: d.num, why: null }); return; }
      if (d.t === 'deny') return unpaired(typeof d.why === 'string' ? d.why : 'denied');
      // confermato sul computer: indirizzo fisso e chiave (una volta sola), poi ci si ricollega lì con la prova
      if (d.t === 'welcome' && isRemoteSession(d.s) && typeof d.key === 'string' && KEY.test(d.key)){
        saved = { session: d.s, key: d.key, at: now() };
        try { store?.save?.(saved); } catch {}
        want = null; codeTries = 0; C.tries = 0;
        clearTimeout(retryT); ++epoch; drop();
        set('connecting', { why: null });
        retryT = setTimeout(connect, 300);
      }
      return;
    }
    if (link.st === 'proof'){
      // il gioco deve provare la chiave sul numero di questo collegamento, prima di ogni altra cosa
      if (d.t === 'proof' && typeof d.m === 'string' && typeof d.n === 'string' && NONCE.test(d.n)){
        link.st = 'checking';
        const expect = await remoteProof(saved.key, 'game', link.nonce, saved.session);
        if (!current() || !expect) return;
        if (!same(d.m, expect)) return lost('il computer non ha dimostrato la chiave');
        const mine = await remoteProof(saved.key, 'phone', d.n, saved.session);
        if (!current()) return;
        link.st = 'proved';
        send(c, { t: 'proof', m: mine });
        return;
      }
      // rifiuto senza prova (chiunque può mandarlo): la chiave resta, si riprova
      if (d.t === 'deny') return lost(d.why === 'insecure' ? 'il gioco non è aperto in https' : 'rifiutato senza prova della chiave');
      return;
    }
    if (link.st === 'proved'){
      if (d.t === 'welcome'){
        clearTimeout(retryT); pending = null; conn = c; link.st = 'on'; C.tries = 0;
        set('on', { why: null });
        clearInterval(pingT);
        pingT = setInterval(() => {
          if (conn !== c) return;
          if (now() - lastRx > lostMs) return lost('nessuna risposta dal gioco');
          send(c, { t: 'ping', c: now() });
        }, pingMs);
        return;
      }
      // il gioco ha provato la chiave e non riconosce la prova di questo telefono: non è più il telecomando
      if (d.t === 'deny') return unpaired('unpaired', { forget: true });
    }
  }
  Object.assign(C, {
    // ripresa (o nuovo tentativo dopo «aperto in un'altra pagina»)
    start(){ if (!saved && !want) return set('unpaired', { why: C.why }); C.tries = 0; return connect(); },
    // dal QR: { pair, token } di parseRemotePairing
    pair(q){ if (!q || !isPairId(q.pair)) return false; want = { via: 'pair', id: q.pair, token: q.token }; codeTries = 0; C.tries = 0; connect(); return true; },
    // dal codice scritto a mano
    pairCode(text){ const code = normalizeCode(text); if (!code) return false; want = { via: 'code', id: codePeerId(code), code }; codeTries = 0; C.tries = 0; connect(); return true; },
    // comando al gioco; false se non collegato
    send(cmd, extra = {}){
      if (C.state !== 'on' || !conn?.open) return false;
      const n = ++seq; C.sent++;
      send(conn, { t: 'cmd', c: cmd, n, ...extra });
      return n;
    },
    // rete tornata, pagina di nuovo in primo piano: subito un tentativo
    kick(){ if (['lost', 'connecting'].includes(C.state) && (saved || want)){ C.tries = 0; connect(); } },
    // «Non usare più questo telefono»
    forget(){ clearTimeout(retryT); ++epoch; drop(); want = null; forgetSaved(); set('unpaired', { why: null }); },
    close(){ try { conn?.close(); } catch {} },
    stop(){ clearTimeout(retryT); ++epoch; drop(); },
  });
  return C;
}
