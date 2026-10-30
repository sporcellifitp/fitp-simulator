// Credenziali temporanee per il TURN di Cloudflare (Cloudflare Realtime), per NATPF Simulator.
//
// Perché: alcune reti (quella del telefono del Player 2, 30/10) bloccano tutte le strade del collegamento diretto che il
// gioco aveva (STUN e i TURN pubblici di PeerJS sulla porta 3478): il telefono non si collegava finché non si accendeva
// una VPN. Il TURN di Cloudflare risponde anche in TLS sulla porta 443, come un sito https. Le sue credenziali però
// non possono stare nei file del gioco (chiunque le leggerebbe): questo Worker le genera al momento, valide 24 ore, con
// la chiave che resta segreta nelle variabili del Worker. Il gioco lo chiama da solo se nel pacchetto c'è
// /natpf/turn.json con il suo indirizzo (natpf-tennis/scripts/pacchetto-cloudflare.mjs --turn-url=…).
//
// Come crearlo (dashboard di Cloudflare, i nomi dei menu possono cambiare un po'):
//   1. Realtime → TURN Server → crea una chiave TURN (TURN key). Annota «Turn Token ID» e «API Token» (il token si
//      vede una volta sola).
//   2. Workers & Pages → Create → Worker → «Hello World» → Deploy. Poi «Edit code»: cancella tutto, incolla questo file
//      intero e premi Deploy.
//   3. Nel Worker: Settings → Variables and Secrets → Add:
//        TURN_KEY_ID          (Text o Secret)  il «Turn Token ID» del punto 1
//        TURN_KEY_API_TOKEN   (Secret)         l'«API Token» del punto 1
//        ALLOWED_ORIGINS      (Text)           le pagine del gioco che possono chiedere le credenziali, separate da
//                                              virgole, senza «/» finale: https://weathered-heart-53ed.s-porcelli.workers.dev
//      Se ALLOWED_ORIGINS è vuota qualunque sito può chiedere le credenziali dal browser dei suoi visitatori (e
//      consumare il traffico TURN incluso nell'account): va bene per una prova, non per restare così. L'origine ferma
//      le pagine di altri siti, non un programma che la falsifica: per quello c'è la scadenza delle credenziali e il
//      limite di spesa dell'account.
//   4. Prova: aprire l'indirizzo del Worker nel browser deve dare {"iceServers":[…],"ttl":86400} (aprendolo
//      direttamente il browser non manda un'origine: la risposta arriva, senza le intestazioni CORS).
//   5. L'indirizzo del Worker (https://<nome>.<account>.workers.dev/) va nel pacchetto del gioco con --turn-url.
//
// Risposte: 200 { iceServers, ttl } senza cache · 403 origine non permessa · 405 metodo · 500 variabili mancanti ·
// 502 Cloudflare non risponde come previsto. Gli errori sono { ok: false, error } e non contengono mai i segreti.

const TTL = 86400;   // 24 h: un collegamento lungo tiene le credenziali con cui è nato
const API = id => `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`;
// porta 53: i browser la bloccano (Cloudflare la offre per altri usi), inutile mandarla
const PORT_53 = /:53(?:[?/]|$)/;

// origini permesse: elenco separato da virgole; vuoto = tutte. Una richiesta senza origine (indirizzo aperto a mano,
// curl) passa ma senza CORS: una pagina di un altro sito la origine la manda sempre
function cors(request, env){
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
  const origin = request.headers.get('Origin');
  const headers = { Vary: 'Origin' };
  if (!allowed.length){ headers['Access-Control-Allow-Origin'] = '*'; return { ok: true, headers }; }
  if (!origin) return { ok: true, headers };
  if (origin && allowed.includes(origin)){ headers['Access-Control-Allow-Origin'] = origin; return { ok: true, headers }; }
  return { ok: false, headers };
}
const reply = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});

// risposta di Cloudflare → elenco pulito: un oggetto singolo diventa un elenco, urls sempre un elenco, via la porta 53
function cleanIceServers(j){
  const list = Array.isArray(j?.iceServers) ? j.iceServers : j?.iceServers && typeof j.iceServers === 'object' ? [j.iceServers] : [];
  const out = [];
  for (const s of list){
    const urls = (Array.isArray(s?.urls) ? s.urls : [s?.urls]).filter(u => typeof u === 'string' && !PORT_53.test(u));
    if (!urls.length) continue;
    out.push({ urls, ...(typeof s.username === 'string' ? { username: s.username } : {}), ...(typeof s.credential === 'string' ? { credential: s.credential } : {}) });
  }
  return out;
}

export default {
  async fetch(request, env = {}){
    const c = cors(request, env);
    if (request.method === 'OPTIONS'){
      if (!c.ok) return new Response(null, { status: 403, headers: c.headers });
      return new Response(null, { status: 204, headers: { ...c.headers, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
    }
    if (request.method !== 'GET' && request.method !== 'POST') return reply(405, { ok: false, error: 'metodo non permesso' }, { ...c.headers, Allow: 'GET, POST, OPTIONS' });
    if (!c.ok) return reply(403, { ok: false, error: 'origine non permessa' }, c.headers);
    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return reply(500, { ok: false, error: 'variabili TURN_KEY_ID e TURN_KEY_API_TOKEN da impostare nel Worker' }, c.headers);
    let res;
    try {
      res = await fetch(API(env.TURN_KEY_ID), {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: TTL }),
      });
    } catch { return reply(502, { ok: false, error: 'Cloudflare non raggiungibile' }, c.headers); }
    // solo il codice: il corpo di un errore non torna al browser
    if (!res.ok) return reply(502, { ok: false, error: `Cloudflare ha risposto ${res.status}` }, c.headers);
    let j = null;
    try { j = await res.json(); } catch {}
    const iceServers = cleanIceServers(j);
    if (!iceServers.length) return reply(502, { ok: false, error: 'risposta di Cloudflare senza server' }, c.headers);
    return reply(200, { iceServers, ttl: TTL }, c.headers);
  },
};
