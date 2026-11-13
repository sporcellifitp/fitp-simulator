// Telefoni dello stand (B41.1, modalità fiera; richiesta dell'utente del 13/11: «durante l'evento fiera i telefoni sono
// sempre gli stessi, quindi è inutile ogni volta collegare il telefono, scansionare un QR code»). Senza DOM.
// Due «posti» fissi, Telefono 1 (p1: Player 1, contro la CPU e a sinistra) e Telefono 2 (p2: a destra). Ogni posto si
// abbina UNA volta, dallo staff, sul modello del telecomando dello staff (remote-pairing.js, da leggere prima):
//   - il QR dell'abbinamento vale SOLO a foglio aperto e porta a un indirizzo che esiste solo allora
//     («racchetta-stand-abbina-…»); dopo 5 minuti, a foglio chiuso o dopo l'abbinamento non vale più;
//   - chi presenta il QR giusto NON diventa il telefono dello stand: il gioco mostra «Un telefono chiede il posto 1 ·
//     numero NNN» (lo stesso numero sul telefono) e serve «Conferma» con un clic vero dello staff (chi chiama
//     confirmPairing lo controlla: il foglio arriva con la B41.4);
//   - alla conferma nascono l'indirizzo fisso del posto («racchetta-stand-…», 130 bit) e la chiave: viaggiano una volta
//     sola nel canale cifrato (WebRTC) e restano salvati sul computer (localStorage del gioco: nel programma Windows tra
//     un riavvio e l'altro) e sul telefono (localStorage della pagina della racchetta). L'indirizzo fisso non è MAI in un
//     QR: nel QR c'è solo l'indirizzo dell'abbinamento;
//   - ripresa (gioco ricaricato, programma o PC riavviati, Wi-Fi caduta, pagina del telefono ricaricata): la chiave non
//     viaggia mai. Prova reciproca con HMAC-SHA-256 (crypto.subtle) come il telecomando, con nomi diversi
//     («stand-game», «stand-phone»): le prove del gioco e del telefono non si scambiano, e nemmeno con quelle del
//     telecomando. Senza crypto.subtle (pagina non in https) niente ripresa: nessuna strada in chiaro;
//   - riabbinare un posto cambia indirizzo e chiave: il telefono di prima non trova più il gioco e, se era collegato,
//     riceve «non sei più il Telefono 1»; «Scollega» butta indirizzo e chiave;
//   - un visitatore che vede il ledwall o sta sulla stessa Wi-Fi non può prendere un posto: senza foglio aperto non c'è
//     nessun indirizzo d'abbinamento, e all'indirizzo fisso (che non conosce) serve la chiave;
//   - prefissi e chiavi del QR diversi da quelli della racchetta (pairing.js: «racchetta-tel-», «s») e del telecomando
//     («telecomando-», «tc»): un QR vale solo per la sua pagina; hello con role 'stand' preteso dal posto dello stand e
//     rifiutato dalla racchetta normale (link.js) e dal telecomando.
import { randomString, same } from './pairing.js';
import { remoteProof, newPairNumber, NONCE, hasSubtle } from './remote-pairing.js';
export { newPairNumber, NONCE, hasSubtle };

export const STAND = Object.freeze({
  prefix: 'racchetta-stand-',
  pairPrefix: 'racchetta-stand-abbina-',
  slots: Object.freeze(['p1', 'p2']),
  ttl: 5*60*1000,
  maxFails: 5,                       // tentativi sbagliati prima di cambiare il codice del QR
  maxRounds: 3,                      // cambi di codice prima di chiudere l'abbinamento
  phoneKey: 'natpf-racchetta-stand', // lato telefono (localStorage della pagina della racchetta)
  idRetryMs: 3000,                   // indirizzo fisso ancora occupato dal collegamento di prima: si riprova
});
export const gameStoreKey = slot => `natpf-tennis.stand.${slot === 'p2' ? 'p2' : 'p1'}`;
export const isSlot = s => s === 'p1' || s === 'p2';
export const slotNumber = s => (s === 'p2' ? 2 : 1);
export const slotLabel = s => `Telefono ${slotNumber(s)}`;
const ID = /^[a-z0-9-]{10,90}$/, SECRET = /^[a-z0-9]{10,64}$/;
export const newStandSession = rnd => STAND.prefix + randomString(26, rnd);      // 130 bit
export const newStandPairId = rnd => STAND.pairPrefix + randomString(26, rnd);
export const newStandNonce = rnd => randomString(26, rnd);
// indirizzo fisso di un posto (mai quello dell'abbinamento)
export const isStandSession = s => typeof s === 'string' && ID.test(s) && s.startsWith(STAND.prefix) && !s.startsWith(STAND.pairPrefix);
export const isStandPairId = s => typeof s === 'string' && ID.test(s) && s.startsWith(STAND.pairPrefix);
export const isStandKey = k => typeof k === 'string' && SECRET.test(k);

// QR dell'abbinamento: pagina della racchetta + parametri della rete (?lan=1, ?peer=…) + #sp=indirizzo&k=codice. Dopo
// il «#»: non arriva a nessun server
export function standPairingUrl(base, search, pairId, token){
  return `${base}${search || ''}#sp=${encodeURIComponent(pairId)}&k=${encodeURIComponent(token)}`;
}
export function parseStandPairing(hash){
  const q = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const s = q.get('sp'), k = q.get('k');
  return isStandPairId(s) && isStandKey(k) ? { pair: s, token: k } : null;
}

// Prova della chiave senza mandarla (who: 'game' | 'phone'). Promise<string | null> (null senza crypto.subtle)
export const standProof = (key, who, nonce, session) => remoteProof(key, who === 'game' ? 'stand-game' : 'stand-phone', nonce, session);

// Cancello del computer per un posto. store: { load() → { session, key, pairedAt } | null, save(v) }. Senza abbinamento
// non c'è nessun indirizzo fisso; indirizzo dell'abbinamento e codice del QR vivono solo in memoria e solo a foglio aperto
export function createStandGate({ slot = 'p1', store = null, rnd, now = () => Date.now(), ttl = STAND.ttl } = {}){
  let saved = null;
  try { saved = store?.load?.() || null; } catch { saved = null; }
  const valid = isStandSession(saved?.session) && isStandKey(saved?.key);
  let session = valid ? saved.session : null, key = valid ? saved.key : null;
  let pairedAt = valid && Number.isFinite(saved?.pairedAt) ? saved.pairedAt : null;
  let open = false, openedAt = 0, pairId = null, token = null, fails = 0, rounds = 0, pending = false, closedWhy = null;
  const persist = () => { try { store?.save?.({ session, key, pairedAt }); } catch {} };
  if (saved && !valid) persist();
  const G = {
    slot: isSlot(slot) ? slot : 'p1',
    get session(){ return session; },
    get paired(){ return !!key; },
    get pairedAt(){ return pairedAt; },
    get open(){ return open && !G.expired; },
    get expired(){ return open && now() - openedAt > ttl; },
    get pairId(){ return open ? pairId : null; },
    get token(){ return open ? token : null; },
    get pending(){ return pending; },
    get closedWhy(){ return closedWhy; },
    // foglio aperto per questo posto: indirizzo e codice NUOVI, 5 minuti che non si riallungano
    openPairing(){ open = true; openedAt = now(); pairId = newStandPairId(rnd); token = randomString(26, rnd); fails = 0; rounds = 0; pending = false; closedWhy = null; },
    closePairing(why = null){ open = false; pairId = null; token = null; pending = false; closedWhy = why; },
    // un telefono si presenta all'indirizzo dell'abbinamento → { ok: true } (resta da confermare) o { ok: false, why }
    request(hello){
      if (!hello || typeof hello !== 'object' || hello.t !== 'hello') return { ok: false, why: 'bad' };
      if (hello.role !== 'stand') return { ok: false, why: 'role' };
      if (!open) return { ok: false, why: 'closed' };
      if (now() - openedAt > ttl){ G.closePairing('expired'); return { ok: false, why: 'expired' }; }
      if (pending) return { ok: false, why: 'busy' };
      if (typeof hello.k === 'string' && same(hello.k, token)){ pending = true; token = randomString(26, rnd); return { ok: true }; }
      fails++;
      if (fails >= STAND.maxFails){ fails = 0; rounds++; if (rounds >= STAND.maxRounds) G.closePairing('attempts'); else token = randomString(26, rnd); }
      return { ok: false, why: 'denied' };
    },
    rejectPairing(){ pending = false; },
    // «Conferma» (clic vero dello staff): indirizzo e chiave NUOVI, quelli di prima non valgono più → { session, key, slot }
    confirmPairing(){
      if (!open || !pending) return null;
      session = newStandSession(rnd); key = randomString(26, rnd); pairedAt = now(); persist();
      G.closePairing();
      return { session, key, slot: G.slot };
    },
    prove(who, nonce){ return key && session ? standProof(key, who, nonce, session) : Promise.resolve(null); },
    // «Scollega»: indirizzo e chiave buttati (il telefono non trova più il gioco)
    forget(){ session = null; key = null; pairedAt = null; G.closePairing(); persist(); },
  };
  return G;
}

/* ---------- lato telefono ---------- */
// Dati del posto salvati sul telefono: { slot, session, key, at, as? } (as: segno dei sensori confermato su questo
// telefono, «taratura»: motion-sign.js). storage: localStorage (o un finto nei test)
export function createStandStore(storage = globalThis.localStorage, key = STAND.phoneKey){
  const valid = v => !!v && isSlot(v.slot) && isStandSession(v.session) && isStandKey(v.key);
  return {
    load(){ try { const v = JSON.parse(storage?.getItem?.(key) || 'null'); return valid(v) ? { slot: v.slot, session: v.session, key: v.key, at: Number.isFinite(v.at) ? v.at : null, ...(v.as === 1 || v.as === -1 ? { as: v.as } : {}) } : null; } catch { return null; } },
    save(v){ if (!valid(v)) return false; try { storage?.setItem?.(key, JSON.stringify(v)); return true; } catch { return false; } },
    clear(){ try { storage?.removeItem?.(key); } catch {} },
  };
}
// hello del telefono: all'indirizzo dell'abbinamento con il codice del QR, a quello fisso con un numero casuale (la
// chiave no). rl: «Ricollega» della stessa pagina (il gioco tiene calibrazione e riferimenti)
export function standHello({ token = null, nonce = null, relink = false } = {}){
  if (token) return { t: 'hello', v: 2, role: 'stand', k: token };
  return { t: 'hello', v: 2, role: 'stand', n: nonce, ...(relink ? { rl: 1 } : {}) };
}
// Benvenuto dell'abbinamento confermato sul computer: { slot, session, key } da salvare, o null se non valido
export function standWelcome(d, now = Date.now()){
  if (!d || typeof d !== 'object' || d.t !== 'welcome' || !isSlot(d.slot) || !isStandSession(d.s) || !isStandKey(d.key)) return null;
  return { slot: d.slot, session: d.s, key: d.key, at: now };
}
// Prova del gioco ({ t: 'proof', m, n }) sul numero mandato da questo telefono: se è giusta, la risposta del telefono
// ({ t: 'proof', m }); se no { ok: false }. Il gioco deve provare la chiave per primo: a chi non la prova (un altro
// programma sull'indirizzo del gioco) il telefono non manda niente
export async function standAnswer(saved, nonce, d){
  if (!saved || !d || d.t !== 'proof' || typeof d.m !== 'string' || typeof d.n !== 'string' || !NONCE.test(d.n)) return { ok: false, why: 'bad' };
  const expect = await standProof(saved.key, 'game', nonce, saved.session);
  if (!expect) return { ok: false, why: 'insecure' };
  if (!same(d.m, expect)) return { ok: false, why: 'proof' };
  const m = await standProof(saved.key, 'phone', d.n, saved.session);
  return m ? { ok: true, reply: { t: 'proof', m } } : { ok: false, why: 'insecure' };
}
// testi del telefono dello stand per i rifiuti e gli addii del gioco
export function standDenyText(why, slot = 'p1'){
  const tel = slotLabel(slot);
  switch (why){
    case 'expired': return 'Tempo scaduto: sul computer apri di nuovo «Telefoni dello stand» e inquadra il QR nuovo.';
    case 'closed': return 'Il foglio «Telefoni dello stand» sul computer è chiuso: il QR non vale più.';
    case 'refused': return 'Rifiutato sul computer. Lo staff può riprovare e premere «Conferma» quando compare il numero.';
    case 'busy': return 'Un altro telefono sta già chiedendo questo posto: sul computer rifiutalo o confermalo, poi riprova.';
    case 'insecure': return 'Collegamento sicuro non disponibile (la pagina del gioco non è in https).';
    case 'replaced': return `Non sei più il ${tel}: lo staff ha abbinato un altro telefono a questo posto. Chiama lo staff.`;
    case 'unpaired': return `Non sei più il ${tel}: chiama lo staff.`;
    case 'other': return `Questo ${tel} è aperto in un'altra scheda del browser: usa quella, oppure tocca «Riprova» qui.`;
    case 'role': return 'Questo QR non è di un telefono dello stand.';
    default: return 'Codice non valido o già usato: inquadra il QR del foglio «Telefoni dello stand».';
  }
}
