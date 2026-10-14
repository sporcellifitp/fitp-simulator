// Abbinamento computer ↔ telefono: identificativi casuali, codice monouso, chiave di ripresa. Senza DOM.
// Nel QR ci sono solo l'indirizzo della sessione (id) e un codice d'abbinamento monouso, dopo il «#»: la parte dopo
// il «#» non arriva mai a nessun server (né a Cloudflare né al server di segnalazione). Il codice viaggia solo nel canale
// cifrato WebRTC (DTLS), vale per un solo telefono e scade: chi lo usa per primo riceve una chiave di ripresa sua,
// che non compare mai nel QR, e il codice viene subito cambiato. Un telefono non può comandare una sessione diversa:
// gli servono sia l'id (128 bit casuali) sia il codice di quella sessione.

const B32 = 'abcdefghijkmnpqrstuvwxyz23456789';
export function randomString(n, rnd = defaultRandom){
  const bytes = rnd(n); let s = '';
  for (let i = 0; i < n; i++) s += B32[bytes[i] & 31];
  return s;
}
function defaultRandom(n){ const b = new Uint8Array(n); globalThis.crypto.getRandomValues(b); return b; }

export const SESSION_PREFIX = 'fitp-racchetta-';
export const newSessionId = rnd => SESSION_PREFIX + randomString(26, rnd);      // 130 bit
export const newSecret = rnd => randomString(26, rnd);
export const TOKEN_TTL = 5*60*1000;                                           // il QR scade dopo 5 minuti

// confronto a tempo costante (non serve molto nel browser, ma non costa nulla)
export function same(a, b){
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// indirizzo per il QR: pagina del telefono + eventuali parametri di prova (?peer=…) + #s=sessione&k=codice
export function pairingUrl(base, search, session, token){
  return `${base}${search || ''}#s=${encodeURIComponent(session)}&k=${encodeURIComponent(token)}`;
}
export function parsePairing(hash){
  const h = String(hash || '').replace(/^#/, ''), q = new URLSearchParams(h);
  const s = q.get('s'), k = q.get('k');
  const valid = v => typeof v === 'string' && /^[a-z0-9-]{10,64}$/.test(v);
  return valid(s) && s.startsWith(SESSION_PREFIX) && valid(k) ? { session: s, token: k } : null;
}

// Il guardiano del computer: decide chi può collegarsi. now() in millisecondi.
export function createGate({ rnd, now = () => Date.now() } = {}){
  let token = newSecret(rnd), issued = now(), resume = null, owner = null, fails = 0;
  return {
    get token(){ return token; },
    get expired(){ return now() - issued > TOKEN_TTL; },
    get owner(){ return owner; },
    rotate(){ token = newSecret(rnd); issued = now(); fails = 0; return token; },
    // hello: { k?: codice del QR, r?: chiave di ripresa }. Restituisce { ok, resume } o { ok:false, why }
    admit(peerId, hello){
      if (!hello || typeof hello !== 'object') return { ok: false, why: 'bad' };
      if (hello.r && resume && same(hello.r, resume)){ owner = peerId; return { ok: true, resume, resumed: true }; }
      if (hello.k && same(hello.k, token) && now() - issued <= TOKEN_TTL){
        resume = newSecret(rnd); owner = peerId; this.rotate();          // il codice del QR vale una volta sola
        return { ok: true, resume };
      }
      fails++;
      if (fails >= 5) this.rotate();                                     // troppi tentativi: QR nuovo
      return { ok: false, why: hello.k && now() - issued > TOKEN_TTL ? 'expired' : 'denied' };
    },
    release(){ owner = null; },
    forget(){ resume = null; owner = null; this.rotate(); },             // «Scollega»: serve un QR nuovo
  };
}
