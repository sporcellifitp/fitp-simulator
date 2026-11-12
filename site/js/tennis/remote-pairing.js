// Telecomando dello staff (B27, richiesta dell'utente del 12/11 allo stand): un telefono dello staff comanda il gioco
// (frecce, OK, Indietro, Pausa, Menu…) e non è mai una racchetta. Abbinamento una volta per tutte: senza DOM.
// Il gioco è sul ledwall: tutto quello che il foglio «Telecomando dello staff» mostra lo vede anche il pubblico. Un
// visitatore con un telefono non deve mai poter diventare il telecomando (revisione del B27). Quindi:
//   - QR e codice valgono SOLO con il foglio dell'abbinamento aperto: chiuso il foglio non valgono più (anche se
//     fotografati), e dopo un abbinamento il foglio non mostra più né QR né codice;
//   - chi presenta il QR o il codice giusto NON diventa il telecomando: il gioco mostra «Un telefono chiede di
//     diventare il telecomando · numero NNN» (lo stesso numero sul telefono) e serve «Conferma» sul computer, con un
//     tasto o un clic veri (natpf_remote.js). Fino ad allora quel telefono non comanda niente e il telecomando di prima
//     resta in carica;
//   - il QR non contiene l'indirizzo fisso del telecomando: porta a un indirizzo che esiste solo a foglio aperto
//     («telecomando-abbina-…»); lo stesso per il codice da scrivere a mano («telecomando-codice-…»);
//   - l'indirizzo fisso («telecomando-…», 130 bit) e la chiave nascono alla conferma, viaggiano una volta sola nel
//     canale cifrato (WebRTC) verso il telefono confermato e restano salvati sul computer (localStorage del gioco: nel
//     programma Windows il profilo è in %LOCALAPPDATA%\NATPF\programma) e sul telefono. Cambiano a ogni abbinamento
//     confermato e con «Scollega»: il telefono di prima non trova più nessuno;
//   - ripresa (riavvio del gioco o del PC, Wi-Fi caduto): la chiave non viaggia mai. Prova reciproca con HMAC-SHA-256
//     (crypto.subtle): il telefono manda un numero casuale, il gioco risponde con HMAC(chiave, «game»|numero|indirizzo)
//     e un suo numero, il telefono controlla e risponde con HMAC(chiave, «phone»|numero del gioco|indirizzo); solo
//     allora il gioco accetta i comandi. Chi si mette sull'indirizzo al posto del gioco non impara niente. Senza
//     crypto.subtle (pagina non in https) niente ripresa: nessuna strada «in chiaro»;
//   - un tentativo per collegamento, 5 tentativi sbagliati → QR e codice nuovi, 15 → abbinamento chiuso; la finestra di
//     5 minuti parte all'apertura del foglio e non si riallunga;
//   - prefissi e chiavi del QR diversi da quelli della racchetta (pairing.js: «racchetta-tel-», «s»): un QR non è mai
//     buono per l'altra pagina; hello con role 'remote' preteso dal gioco e rifiutato dalla racchetta (link.js).
import { randomString, same } from './pairing.js';

export const REMOTE = Object.freeze({
  prefix: 'telecomando-',
  pairPrefix: 'telecomando-abbina-',
  codePrefix: 'telecomando-codice-',
  codeLength: 8,
  ttl: 5*60*1000,
  maxFails: 5,                                  // tentativi sbagliati prima di cambiare QR e codice
  maxRounds: 3,                                 // cambi di codice per i tentativi sbagliati prima di chiudere l'abbinamento
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
export const NONCE = /^[a-z0-9]{16,64}$/;
export const newRemoteSession = rnd => REMOTE.prefix + randomString(26, rnd);       // 130 bit
export const newPairId = rnd => REMOTE.pairPrefix + randomString(26, rnd);
export const newRemoteCode = rnd => randomString(REMOTE.codeLength, rnd);
export const newNonce = rnd => randomString(26, rnd);
// indirizzo fisso del telecomando (mai quello dell'abbinamento o del codice)
export const isRemoteSession = s => typeof s === 'string' && ID.test(s) && s.startsWith(REMOTE.prefix) && !s.startsWith(REMOTE.codePrefix) && !s.startsWith(REMOTE.pairPrefix);
export const isPairId = s => typeof s === 'string' && ID.test(s) && s.startsWith(REMOTE.pairPrefix);
// codice scritto a mano: maiuscole, spazi e trattini tolti. L'alfabeto dei codici (pairing.js) non ha l, o, 0 e 1, che
// si confondono: chi li scrive ha letto male, il codice non vale
export function normalizeCode(text){
  const c = String(text || '').toLowerCase().replace(/[\s.-]+/g, '');
  return c.length === REMOTE.codeLength && /^[abcdefghijkmnpqrstuvwxyz23456789]+$/.test(c) ? c : null;
}
// il codice com'è mostrato sullo schermo: due gruppi di quattro, in maiuscolo
export const showCode = code => String(code || '').toUpperCase().replace(/^(.{4})(.{4})$/, '$1-$2');
export const codePeerId = code => REMOTE.codePrefix + code;
// numero di tre cifre mostrato sul computer e sul telefono che chiede l'abbinamento (100–999)
export function newPairNumber(rnd = n => { const b = new Uint8Array(n); globalThis.crypto.getRandomValues(b); return b; }){
  const b = rnd(2);
  return 100 + ((b[0] << 8 | b[1]) % 900);
}

// indirizzo del QR: pagina del telecomando + parametri della rete (?lan=1, ?peer=…) + #tc=indirizzo dell'abbinamento&k=codice
export function remotePairingUrl(base, search, pairId, token){
  return `${base}${search || ''}#tc=${encodeURIComponent(pairId)}&k=${encodeURIComponent(token)}`;
}
export function parseRemotePairing(hash){
  const q = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const s = q.get('tc'), k = q.get('k');
  return isPairId(s) && typeof k === 'string' && SECRET.test(k) ? { pair: s, token: k } : null;
}

// Prova della chiave senza mandarla: HMAC-SHA-256(chiave, «chi|numero|indirizzo») in esadecimale. who: 'game' (la
// risposta del gioco al numero del telefono) o 'phone' (la risposta del telefono al numero del gioco): le due prove
// non si possono scambiare. null se crypto.subtle non c'è (pagina non in https)
export const hasSubtle = () => !!globalThis.crypto?.subtle;
export async function remoteProof(key, who, nonce, session){
  if (!hasSubtle() || typeof key !== 'string' || !key) return null;
  const enc = new TextEncoder();
  const k = await globalThis.crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', k, enc.encode(`${who}|${nonce}|${session}`)));
  return [...sig].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Cancello del computer per il telecomando. store: { load() → { session, key, pairedAt } | null, save(v) }.
// Senza abbinamento non c'è nessun indirizzo fisso. Indirizzo dell'abbinamento, codice del QR (token) e codice da
// scrivere (code) vivono solo in memoria e solo a foglio aperto (openPairing … closePairing).
export function createRemoteGate({ store = null, rnd, now = () => Date.now(), ttl = REMOTE.ttl } = {}){
  let saved = null;
  try { saved = store?.load?.() || null; } catch { saved = null; }
  const valid = isRemoteSession(saved?.session) && typeof saved?.key === 'string' && SECRET.test(saved.key);
  let session = valid ? saved.session : null, key = valid ? saved.key : null;
  let pairedAt = valid && Number.isFinite(saved?.pairedAt) ? saved.pairedAt : null;
  let open = false, openedAt = 0, pairId = null, token = null, code = null, fails = 0, rounds = 0, pending = false, closedWhy = null;
  const persist = () => { try { store?.save?.({ session, key, pairedAt }); } catch {} };
  // salvataggio di una versione precedente (chiave «resume», indirizzo mostrato nel QR): non vale più
  if (saved && !valid) persist();
  const fresh = () => { token = randomString(26, rnd); code = newRemoteCode(rnd); };
  const G = {
    get session(){ return session; },
    get paired(){ return !!key; },
    get pairedAt(){ return pairedAt; },
    // abbinamento: valori da mostrare (null a foglio chiuso)
    get open(){ return open && !G.expired; },
    get expired(){ return open && now() - openedAt > ttl; },
    get pairId(){ return open ? pairId : null; },
    get token(){ return open ? token : null; },
    get code(){ return open ? code : null; },
    get pending(){ return pending; },
    get closedWhy(){ return closedWhy; },              // 'expired' | 'attempts' | null: perché il foglio non mostra più il QR
    openPairing(){ open = true; openedAt = now(); pairId = newPairId(rnd); fresh(); fails = 0; rounds = 0; pending = false; closedWhy = null; },
    // foglio chiuso (o tempo scaduto, o troppi tentativi): QR e codice non valgono più da subito
    closePairing(why = null){ open = false; pairId = null; token = null; code = null; pending = false; closedWhy = why; },
    // Un telefono si presenta all'indirizzo dell'abbinamento (via 'pair', con k) o del codice (via 'code', con c).
    // → { ok: true } (resta da confermare sul computer: confirmPairing) o { ok: false, why }
    request(hello, via){
      if (!hello || typeof hello !== 'object' || hello.t !== 'hello') return { ok: false, why: 'bad' };
      // la racchetta (o qualunque altra pagina) non diventa un telecomando
      if (hello.role !== 'remote') return { ok: false, why: 'role' };
      if (!open) return { ok: false, why: 'closed' };
      if (now() - openedAt > ttl){ G.closePairing('expired'); return { ok: false, why: 'expired' }; }
      if (pending) return { ok: false, why: 'busy' };
      const good = via === 'pair' ? typeof hello.k === 'string' && same(hello.k, token) : via === 'code' ? typeof hello.c === 'string' && same(hello.c, code) : false;
      if (good){ pending = true; fresh(); return { ok: true }; }       // il codice vale una volta sola
      fails++;
      if (fails >= REMOTE.maxFails){ fails = 0; rounds++; if (rounds >= REMOTE.maxRounds) G.closePairing('attempts'); else fresh(); }
      return { ok: false, why: 'denied' };
    },
    // «Rifiuta» sul computer, o il telefono che se ne va prima della conferma: si torna al QR (la finestra non si allunga)
    rejectPairing(){ pending = false; },
    // «Conferma» sul computer: indirizzo fisso e chiave NUOVI (quelli di prima non valgono più), abbinamento chiuso.
    // → { session, key } da mandare al telefono confermato, o null se nessuno stava chiedendo
    confirmPairing(){
      if (!open || !pending) return null;
      session = newRemoteSession(rnd); key = randomString(26, rnd); pairedAt = now(); persist();
      G.closePairing();
      return { session, key };
    },
    // prova della chiave (ripresa): who 'game' | 'phone'. Promise<string | null>
    prove(who, nonce){ return key && session ? remoteProof(key, who, nonce, session) : Promise.resolve(null); },
    // «Scollega il telecomando»: indirizzo e chiave buttati
    forget(){ session = null; key = null; pairedAt = null; persist(); },
  };
  return G;
}

// Messaggio di comando dal telefono, controllato: { c, n } o null. n: numero progressivo (torna nell'esito), y: 1 quando
// il telefono ha già chiesto conferma (Torna al menu, Nuovo giocatore in partita)
export function parseRemoteCommand(d){
  if (!d || typeof d !== 'object' || d.t !== 'cmd' || !REMOTE_COMMANDS.includes(d.c)) return null;
  return { c: d.c, n: Number.isInteger(d.n) && d.n > 0 ? d.n : null, y: d.y === 1 };
}
// Testi del telefono per i rifiuti
export function denyText(why){
  switch (why){
    case 'unpaired': return 'Questo telefono non è più il telecomando (scollegato o sostituito da un altro). Dal gioco: Pannello dello stand → Telecomando dello staff, poi inquadra il QR.';
    case 'expired': return 'Tempo scaduto: sul gioco, nel foglio «Telecomando dello staff», fai comparire un QR nuovo e inquadralo.';
    case 'closed': return 'Il foglio «Telecomando dello staff» sul gioco è chiuso: QR e codice non valgono più. Riaprilo e inquadra il QR nuovo.';
    case 'refused': return 'Rifiutato sul computer. Se sei dello staff, riprova e premi «Conferma» sul computer quando compare il tuo numero.';
    case 'busy': return 'Un altro telefono sta già chiedendo di diventare il telecomando: sul computer rifiutalo (o confermalo), poi riprova.';
    case 'insecure': return 'Collegamento sicuro non disponibile (la pagina del gioco non è in https).';
    case 'role': return 'Questa pagina non è il telecomando.';
    default: return 'Codice non valido o già usato: inquadra il QR del foglio «Telecomando dello staff».';
  }
}
