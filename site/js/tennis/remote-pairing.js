// Telecomando dello staff (B27, richiesta dell'utente del 12/11 allo stand): un telefono dello staff comanda il gioco
// (frecce, OK, Indietro, Pausa, Menu…) e non è mai una racchetta. Abbinamento una volta per tutte: senza DOM.
// Differenze dalla racchetta (pairing.js):
//   - indirizzo della sessione con un prefisso suo, «telecomando-» (la racchetta vuole «racchetta-tel-»): la pagina della
//     racchetta non accetta il QR del telecomando e la pagina del telecomando non accetta quello dei giocatori;
//   - nel QR la chiave è «tc» (la racchetta legge «s»): un QR non è mai buono per l'altra pagina;
//   - l'id della sessione e la chiave di ripresa restano salvati sul computer (localStorage del gioco: nel programma
//     Windows il profilo è in %LOCALAPPDATA%\NATPF\programma e non cambia con gli aggiornamenti) e sul telefono: il
//     telefono si ricollega da solo dopo il riavvio del gioco o del PC, senza QR;
//   - un solo telefono abbinato: un abbinamento nuovo (QR o codice dello staff) sostituisce il precedente, che alla
//     prossima ripresa riceve «non abbinato»;
//   - hello con role 'remote': il gioco lo pretende (e la racchetta lo rifiuta, link.js).
// Codice da scrivere a mano (iPhone con l'icona sulla schermata Home, che ha una memoria sua, o fotocamera che non legge
// il QR): 8 caratteri mostrati sotto il QR; il gioco ascolta anche sull'indirizzo «telecomando-codice-<codice>» finché il
// pannello «Collega» è aperto. Il codice vale come quello del QR: una volta sola, 5 minuti, 5 tentativi sbagliati.
import { randomString, same } from './pairing.js';

export const REMOTE = Object.freeze({
  prefix: 'telecomando-',
  codePrefix: 'telecomando-codice-',
  codeLength: 8,
  ttl: 5*60*1000,
  maxFails: 5,
  storageKey: 'natpf-tennis.telecomando',      // lato gioco
  phoneKey: 'natpf-telecomando',                // lato telefono
  // il telefono manda ping ogni pingMs; ciascuno dei due considera perso il collegamento dopo lostMs di silenzio
  pingMs: 2000,
  lostMs: 8000,
});
// comandi del telefono: navigazione (come frecce, Invio ed Esc della tastiera) e pulsanti diretti
export const NAV_COMMANDS = Object.freeze(['up', 'down', 'left', 'right', 'ok', 'back']);
export const DIRECT_COMMANDS = Object.freeze(['play', 'menu', 'pause', 'newplayer', 'recal', 'gestures', 'cpu', 'screen', 'fullscreen', 'staff', 'skip']);
export const REMOTE_COMMANDS = Object.freeze([...NAV_COMMANDS, ...DIRECT_COMMANDS]);

const ID = /^[a-z0-9-]{10,90}$/;
const SECRET = /^[a-z0-9]{10,64}$/;
export const newRemoteSession = rnd => REMOTE.prefix + randomString(26, rnd);       // 130 bit
export const newRemoteCode = rnd => randomString(REMOTE.codeLength, rnd);
export const isRemoteSession = s => typeof s === 'string' && ID.test(s) && s.startsWith(REMOTE.prefix) && !s.startsWith(REMOTE.codePrefix);
// codice scritto a mano: maiuscole, spazi e trattini tolti. L'alfabeto dei codici (pairing.js) non ha l, o, 0 e 1, che
// si confondono: chi li scrive ha letto male, il codice non vale
export function normalizeCode(text){
  const c = String(text || '').toLowerCase().replace(/[\s.-]+/g, '');
  return c.length === REMOTE.codeLength && /^[abcdefghijkmnpqrstuvwxyz23456789]+$/.test(c) ? c : null;
}
// il codice com'è mostrato sullo schermo: due gruppi di quattro, in maiuscolo
export const showCode = code => String(code || '').toUpperCase().replace(/^(.{4})(.{4})$/, '$1-$2');
export const codePeerId = code => REMOTE.codePrefix + code;

// indirizzo del QR: pagina del telecomando + parametri della rete (?lan=1, ?peer=…) + #tc=sessione&k=codice
export function remotePairingUrl(base, search, session, token){
  return `${base}${search || ''}#tc=${encodeURIComponent(session)}&k=${encodeURIComponent(token)}`;
}
export function parseRemotePairing(hash){
  const q = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const s = q.get('tc'), k = q.get('k');
  return isRemoteSession(s) && typeof k === 'string' && SECRET.test(k) ? { session: s, token: k } : null;
}

// Cancello del computer per il telecomando. store: { load() → { session, resume, pairedAt } | null, save(v) }.
// L'id della sessione nasce una volta e resta (anche dopo «Scollega»: il telefono vecchio lo ritrova e si sente dire
// «non abbinato»). Il codice del QR (token) e quello da scrivere (code) vivono solo in memoria e cambiano a ogni
// apertura del pannello «Collega» (rotate) o alla scadenza.
export function createRemoteGate({ store = null, rnd, now = () => Date.now(), ttl = REMOTE.ttl } = {}){
  let saved = null;
  try { saved = store?.load?.() || null; } catch { saved = null; }
  let session = isRemoteSession(saved?.session) ? saved.session : newRemoteSession(rnd);
  let resume = typeof saved?.resume === 'string' && SECRET.test(saved.resume) ? saved.resume : null;
  let pairedAt = resume && Number.isFinite(saved?.pairedAt) ? saved.pairedAt : null;
  let token = randomString(26, rnd), code = newRemoteCode(rnd), issued = now(), fails = 0;
  const persist = () => { try { store?.save?.({ session, resume, pairedAt }); } catch {} };
  if (!saved || saved.session !== session) persist();
  const G = {
    get session(){ return session; },
    get token(){ return token; },
    get code(){ return code; },
    get paired(){ return !!resume; },
    get pairedAt(){ return pairedAt; },
    get expired(){ return now() - issued > ttl; },
    rotate(){ token = randomString(26, rnd); code = newRemoteCode(rnd); issued = now(); fails = 0; return token; },
    // hello: { t: 'hello', role: 'remote', k?: codice del QR, c?: codice scritto, r?: chiave di ripresa }
    // → { ok, resume, resumed? } o { ok: false, why: 'role' | 'bad' | 'expired' | 'denied' | 'unpaired' }
    admit(hello){
      if (!hello || typeof hello !== 'object' || hello.t !== 'hello') return { ok: false, why: 'bad' };
      // la racchetta (o qualunque altra pagina) non diventa un telecomando
      if (hello.role !== 'remote') return { ok: false, why: 'role' };
      if (typeof hello.r === 'string' && hello.r){
        if (resume && same(hello.r, resume)) return { ok: true, resume, resumed: true };
        // chiave vecchia (abbinamento sostituito o «Scollega»): il telefono deve rifare l'abbinamento
        return { ok: false, why: 'unpaired' };
      }
      const fresh = now() - issued <= ttl;
      const byToken = typeof hello.k === 'string' && same(hello.k, token);
      const byCode = typeof hello.c === 'string' && same(hello.c, code);
      if ((byToken || byCode) && fresh){
        resume = randomString(26, rnd); pairedAt = now(); persist();
        G.rotate();                                       // il codice vale una volta sola
        return { ok: true, resume };
      }
      fails++;
      if (fails >= REMOTE.maxFails) G.rotate();           // troppi tentativi: codici nuovi
      return { ok: false, why: (byToken || byCode) && !fresh ? 'expired' : 'denied' };
    },
    // «Scollega il telecomando»: la chiave non vale più; l'id della sessione resta
    forget(){ resume = null; pairedAt = null; persist(); G.rotate(); },
  };
  return G;
}

// Messaggio di comando dal telefono, controllato: { c, n } o null. n: numero progressivo (le copie si scartano), y: 1
// quando il telefono ha già chiesto conferma (Torna al menu, Nuovo giocatore in partita)
export function parseRemoteCommand(d){
  if (!d || typeof d !== 'object' || d.t !== 'cmd' || !REMOTE_COMMANDS.includes(d.c)) return null;
  return { c: d.c, n: Number.isInteger(d.n) && d.n > 0 ? d.n : null, y: d.y === 1 };
}
// Testi del telefono per i rifiuti
export function denyText(why){
  switch (why){
    case 'unpaired': return 'Questo telefono non è più il telecomando (scollegato o sostituito da un altro). Dal gioco: Pannello dello stand → Telecomando dello staff → Collega, poi inquadra il QR.';
    case 'expired': return 'Codice scaduto: nel pannello «Telecomando dello staff» compare un QR nuovo. Inquadralo di nuovo.';
    case 'role': return 'Questa pagina non è il telecomando.';
    case 'busy': return 'C’è già un altro telecomando collegato.';
    default: return 'Codice non valido o già usato: inquadra il QR del pannello «Telecomando dello staff».';
  }
}
