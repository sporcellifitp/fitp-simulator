// Registro dello stand di NATPF Simulator: Worker che riceve le righe di gioco e le scrive nello spazio R2 dell'utente.
//
// Perché: il PC dello stand non è dell'utente (decisione del 12/11: «Non puoi salvare i log su un drive? Il PC non è il
// mio»). Il gioco tiene un registro continuo e leggero, solo di gioco (partite, punti, colpi, errori: niente nomi,
// niente video, niente audio, niente indirizzi), e lo manda qui a blocchi. Questo Worker li scrive in R2 sotto
//   registro/<giorno>/<postazione>/<parte>.jsonl
// e non fa altro: chi non ha la chiave segreta dell'utente può solo AGGIUNGERE righe del registro; non può leggere,
// elencare né cancellare niente. La chiave sta nelle variabili segrete del Worker: mai nel gioco, mai nel repository.
//
// ATTENZIONE, RISERVATEZZA: il bucket del registro deve essere SEPARATO E PRIVATO (nome proposto: natpf-registro), con
// l'accesso pubblico spento e nessun dominio pubblico. NON il bucket pubblico degli installer e del trailer
// (pub-….r2.dev): lì chiunque conosca o indovini il nome di un file lo legge. Il Worker non può vedere se un bucket è
// pubblico: lo garantisce chi lo crea, seguendo la guida. Senza il collegamento al bucket il Worker non parte: lo
// stato dice «non pronto» (503) e non accetta righe.
//
// Come crearlo, passo per passo, con i nomi dei pulsanti: docs/GUIDA_REGISTRO_CLOUDFLARE.md. In breve:
//   1. R2 Object Storage → Create bucket «natpf-registro» (nuovo, privato: mai «Public access»).
//   2. Workers & Pages → Create → «Hello World» → Deploy; poi «Edit code», cancella tutto, incolla questo file, Deploy.
//   3. Nel Worker: Settings → Bindings → Add → R2 bucket: nome della variabile REGISTRO, bucket del punto 1.
//   4. Settings → Variables and Secrets → Add:
//        CHIAVE_LETTURA    (Secret)  la chiave che scegli tu, almeno 12 caratteri: serve per elencare e scaricare
//        ALLOWED_ORIGINS   (Text)    le pagine del gioco che possono scrivere, separate da virgole, senza «/» finale:
//                                    https://<gioco>.workers.dev, https://localhost:8443   (la seconda è il programma
//                                    Windows). «:*» alla fine vale per ogni porta. Vuota = scrive qualunque sito (va
//                                    bene per una prova, non per restare così).
//   5. Prova: l'indirizzo del Worker nel browser mostra la pagina «Registro di NATPF Simulator», che dice se lo spazio
//      e la chiave sono a posto e, con la chiave, elenca i giorni e li scarica.
//   6. L'indirizzo del Worker va nel pacchetto del gioco: scripts/pacchetto-cloudflare.mjs --registro-url=… e, per il
//      programma Windows, natpf-desktop/registro.json (o la variabile NATPF_REGISTRO_URL alla costruzione).
//
// Richieste:
//   POST /?giorno=AAAA-MM-GG&postazione=xxxxxxxx&parte=00012-abcd[&z=gzip]   corpo: righe JSON Lines (testo, anche gzip)
//        → 200 { ok, righe, scartate } · 200 { ok, doppione } se quel blocco c'è già (non si riscrive: niente doppioni)
//        → 400 parametri · 403 origine · 413 blocco troppo grande · 422 nessuna riga del registro · 429 troppi invii ·
//          507 giorno pieno o registro pieno (tetto di 2 GB in tutto) · 503 spazio R2 non collegato
//   GET  /            pagina per l'utente (stato, e con la chiave: giorni e scarico); a un programma (senza Accept:
//        text/html) lo stato: 200 { ok, registro: 'pronto', spazio, chiave } · 503 { ok: false, registro: 'non pronto' }
//   GET  /giorni      (chiave)  { ok, giorni: [{ giorno, blocchi, byte, righe }] }
//   GET  /scarica?giorno=AAAA-MM-GG[&da=…][&a-pezzi=1]   (chiave)  JSON Lines: prima di ogni blocco la riga
//        {"k":"blocco","giorno":…,"postazione":…,"parte":…}. Al massimo PAGINA blocchi per richiesta (limite di
//        Cloudflare sulle letture per richiesta): se ce ne sono altri, l'intestazione X-Registro-Continua dice da dove
//        riprendere (&da=…); senza «a-pezzi» in fondo c'è anche la riga {"k":"nota","t":0,"continua":…}.
//   La chiave: intestazione «Authorization: Bearer <chiave>» (la pagina fa così) oppure «?chiave=…».
// Gli errori sono { ok: false, error } e non contengono mai la chiave. L'indirizzo di rete di chi scrive serve solo, in
// memoria e per un minuto, a frenare chi manda troppe richieste: non si scrive da nessuna parte.
//
// Gli elenchi qui sotto (tipi di riga, campi previsti, campi vietati, limiti) sono una COPIA di quelli del gioco
// (natpf-tennis/src/natpf/registro/registro_formato.js): questo file deve restare uno solo, da incollare. Un test
// (test/registro-worker.test.mjs) fallisce se le due copie non sono uguali.

const MB = 1024*1024;
export const LIMITI = Object.freeze({
  maxBlocco: 256*1024,        // byte di un blocco in arrivo (compresso o no)
  maxAperto: 2*MB,            // byte di un blocco gzip una volta aperto
  maxRiga: 2000, maxTesto: 80, maxMessaggio: 200,
  maxGiorno: 200*MB,          // byte scritti in un giorno, tutte le postazioni (variabile MAX_GIORNO_MB per cambiarlo)
  maxBlocchiGiorno: 20000,    // blocchi scritti in un giorno
  maxTotale: 2048*MB,         // tutto il registro, tutti i giorni: 2 GB dei 10 dell'account (variabile MAX_TOTALE_MB)
  invioAlMinuto: 120,         // richieste di scrittura al minuto da uno stesso indirizzo
  giorniIndietro: 60,         // un blocco può arrivare in ritardo (stand senza rete) fino a 60 giorni
  pagina: 40,                 // blocchi per richiesta di scarico
  erroriChiave: 10,           // chiavi sbagliate in 10 minuti da uno stesso indirizzo, poi 429
  minChiave: 12,
});
export const TIPI = Object.freeze(['avvio', 'chiusura', 'partita', 'partita.fine', 'punto', 'colpo', 'servizio', 'vuoto', 'tutorial', 'calibrazione', 'allenamento',
  'minigioco', 'visita', 'tel', 'errore', 'crash', 'nota']);
export const CAMPI = Object.freeze(['k', 't', 'n', 'v', 'ora', 'fuso', 'g', 'versione', 'dove', 'motivo', 'schermo', 'area', 'dpr', 'cpu', 'gpu', 'gpuTipo', 'pagina', 'chiosco', 'prima',
  'primaInPartita', 'modo', 'chi', 'livello', 'ruolo', 'formato', 'game', 'fiera', 'batte', 'personaggi', 'ctrl', 'mano', 'mano2', 'segnale', 'nomeInserito', 'nomeInserito2', 'stand',
  'mira', 'caldo', 'lancioAuto', 'campoAperto', 'fasce', 'aiuto', 'ek', 'tel', 'tel2', 'strada', 'rtt', 'so', 'browser', 'p', 'vince', 'fine', 'ultimo', 'colpi', 'colpi2', 'durS',
  'attesaS', 'pt', 'lanci', 'lanciVuoti', 'battutaAuto', 'esito', 'come', 'punti', 'puntiVinti', 'fps', 'medi', 'peggiori', 'maxMs', 'lunghi', 'cadute', 'riprese', 'rttMax', 'errori',
  'scartati', 'amb', 'gesto', 'voluto', 'ms', 'voto', 'f', 'd', 'e', 'x', 'z', 'sup', 'supNo', 'volee', 'lato', 'fonte', 'causa', 'aiutato', 'tipo', 'q', 'kmh', 'auto', 'perche',
  'serie', 'schede', 'viste', 'tutte', 'chiusura', 'finita', 'prove', 'fallite', 'passi', 'ripartenze', 'revisioni', 'revisioniNo', 'semplice', 'finito', 'saltato', 'perfetti', 'gioco',
  'partite', 'posti', 'abbandono', 'stato', 'dopoS', 'inPartita', 'msg', 'file', 'riga', 'col', 'volte', 'tagliata', 'perse', 'costoMs', 'costoMax', 'registro']);
export const MAPPE = Object.freeze(['scartati', 'posti', 'passi', 'perche']);
export const CAMPI_VIETATI = Object.freeze(['nome', 'name', 'nick', 'nickname', 'giocatore', 'player', 'ip', 'indirizzo', 'address', 'host', 'ua', 'useragent', 'token', 'sessione',
  'session', 'stanza', 'room', 'roomid', 'id', 'deviceid', 'telefonoid', 'video', 'audio', 'immagine', 'foto', 'frame', 'campioni', 'sensori', 'rot', 'acc', 'accg', 'email', 'mail',
  'server', 'url', 'href', 'qr', 'codice', 'profilo', 'label', 'nota']);

/* ---------- righe: solo quelle del registro, solo i campi previsti ---------- */
const PREVISTI = new Set(CAMPI), LIBERE = new Set(MAPPE), VIETATI = new Set(CAMPI_VIETATI);
const chiaveNorm = k => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
const IP_RE = /\b\d{1,3}(?:\.\d{1,3}){3}\b(?::\d+)?/g, IP6_RE = /\b(?:[0-9a-f]{1,4}:){3,7}[0-9a-f]{1,4}\b/gi;
const MAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, URL_RE = /\b(?:https?|wss?|file|blob):\/\/[^\s'")]+/gi;
// testo: senza indirizzi, e-mail, pagine con codici; accorciato
export function pulisciTesto(s, max = LIMITI.maxTesto){
  let out = String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ');
  out = out.replace(URL_RE, u => { const f = u.replace(/[?#].*$/, '').split('/').filter(Boolean).pop() || ''; return /\.[a-z0-9]{1,5}$/i.test(f) ? f : '[pagina]'; });
  out = out.replace(MAIL_RE, '[e-mail]').replace(IP_RE, '[indirizzo]').replace(IP6_RE, '[indirizzo]');
  return out.length > max ? out.slice(0, max - 1) + '…' : out;
}
// una riga buona da scrivere, o null se non è del registro (stessa regola del gioco: registro_formato.pulisci)
export function pulisci(row){
  const walk = (v, key, depth, mappa) => {
    if (v == null) return undefined;
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (mappa && !Array.isArray(v)) return undefined;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return pulisciTesto(v, key === 'msg' ? LIMITI.maxMessaggio : LIMITI.maxTesto);
    if (Array.isArray(v)) return depth > 3 ? undefined : v.slice(0, 16).map(x => (typeof x === 'object' && x !== null ? undefined : walk(x, key, depth + 1, mappa))).map(x => (x === undefined ? null : x));
    if (typeof v === 'object'){
      if (depth > 3) return undefined;
      const libera = LIBERE.has(key), out = {}; let n = 0;
      for (const [k, x] of Object.entries(v)){
        if (n >= 40 || VIETATI.has(chiaveNorm(k)) || (!libera && !PREVISTI.has(k))) continue;
        const y = walk(x, k, depth + 1, libera);
        if (y !== undefined){ out[libera ? pulisciTesto(k, 60) : k] = y; n++; }
      }
      return out;
    }
    return undefined;
  };
  if (!row || typeof row !== 'object' || Array.isArray(row) || !TIPI.includes(row.k) || !Number.isInteger(row.t) || row.t < 0) return null;
  return walk(row, '', 0, false);
}
// testo del blocco → righe buone (testo pronto da scrivere) e quante scartate
export function righeBuone(testo){
  const out = []; let scartate = 0;
  for (const riga of String(testo).split('\n')){
    if (!riga.trim()) continue;
    let row = null;
    if (riga.length <= LIMITI.maxRiga*2){ try { row = pulisci(JSON.parse(riga)); } catch { row = null; } }
    const s = row ? JSON.stringify(row) : null;
    if (s && s.length <= LIMITI.maxRiga) out.push(s); else scartate++;
  }
  return { righe: out, scartate };
}

/* ---------- origine, chiave, freni ---------- */
// origini permesse: elenco separato da virgole; «:*» alla fine = ogni porta; vuoto = tutte
function cors(request, env){
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
  const origin = request.headers.get('Origin');
  const headers = { Vary: 'Origin' };
  if (!allowed.length){ headers['Access-Control-Allow-Origin'] = '*'; return { ok: true, headers, origin }; }
  const ok = !!origin && allowed.some(a => { if (a === origin) return true; if (!a.endsWith(':*')) return false; const base = a.slice(0, -2); return origin === base || (origin.startsWith(base + ':') && /^\d+$/.test(origin.slice(base.length + 1))); });
  if (ok) headers['Access-Control-Allow-Origin'] = origin;
  return { ok, headers, origin };
}
const reply = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});
const clean = v => String(v ?? '').trim().replace(/^["'«]+|["'»]+$/g, '').trim();
// confronto della chiave senza far capire dal tempo quanti caratteri sono giusti (si confrontano le impronte)
async function uguali(a, b){
  const enc = new TextEncoder(), [x, y] = await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const u = new Uint8Array(x), v = new Uint8Array(y); let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}
// freni in memoria (per questa copia del Worker: Cloudflare ne tiene più d'una, quindi è un freno, non un conto esatto)
const visti = new Map();
export function frena(chi, quanti, perMs, now = Date.now()){
  const list = (visti.get(chi) || []).filter(t => now - t < perMs);
  if (list.length >= quanti){ visti.set(chi, list); return false; }
  list.push(now); visti.set(chi, list);
  if (visti.size > 5000) for (const [k, v] of visti){ if (!v.length || now - v[v.length - 1] > 600000) visti.delete(k); }
  return true;
}
export const dimentica = () => visti.clear();          // per le prove
const chiE = request => request.headers.get('CF-Connecting-IP') || 'senza-indirizzo';

/* ---------- giorni ---------- */
const GIORNO_RE = /^\d{4}-\d{2}-\d{2}$/, POSTAZIONE_RE = /^[a-z0-9]{8}$/, PARTE_RE = /^\d{5,7}-[a-z0-9]{4}$/;
const giornoValido = (g, now, L) => {
  if (!GIORNO_RE.test(g)) return false;
  const t = Date.parse(`${g}T12:00:00Z`); if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== g) return false;
  return t <= now + 36*3600*1000 && t >= now - (L.giorniIndietro + 1)*86400000;
};
const CONTI = 'conti.json';
const SENZA_SPAZIO = 'spazio R2 non collegato: nel Worker, Settings → Bindings → Add → R2 bucket, nome della variabile REGISTRO, bucket privato natpf-registro';
const totale = conti => Object.values(conti).reduce((a, g) => a + (+g?.byte || 0), 0);
async function leggiConti(bucket){ try { const o = await bucket.get(CONTI); const j = o ? JSON.parse(await o.text()) : {}; return j && typeof j === 'object' ? j : {}; } catch { return {}; } }

/* ---------- scrittura ---------- */
async function corpo(request, gzip, L){
  const dichiarati = +request.headers.get('Content-Length') || 0;
  if (dichiarati > L.maxBlocco) return { troppo: true };
  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.length > L.maxBlocco) return { troppo: true };
  if (!gzip) return { testo: new TextDecoder().decode(buf) };
  // gzip: si apre con un tetto (un blocco piccolo non deve diventare enorme)
  try {
    const reader = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(), parts = []; let n = 0;
    for (;;){ const { done, value } = await reader.read(); if (done) break; n += value.length; if (n > L.maxAperto){ try { await reader.cancel(); } catch {} return { troppo: true }; } parts.push(value); }
    return { testo: await new Blob(parts).text() };
  } catch { return { rotto: true }; }
}
async function scrivi(request, env, url, c, L, now){
  if (!c.ok) return reply(403, { ok: false, error: 'origine non permessa' }, c.headers);
  if (!frena(`w:${chiE(request)}`, L.invioAlMinuto, 60000, now)) return reply(429, { ok: false, error: 'troppi invii: riprova tra poco' }, { ...c.headers, 'Retry-After': '30' });
  const giorno = url.searchParams.get('giorno') || '', postazione = url.searchParams.get('postazione') || '', parte = url.searchParams.get('parte') || '';
  if (!giornoValido(giorno, now, L) || !POSTAZIONE_RE.test(postazione) || !PARTE_RE.test(parte)) return reply(400, { ok: false, error: 'giorno, postazione o parte non validi' }, c.headers);
  const bucket = env.REGISTRO;
  if (!bucket || typeof bucket.put !== 'function') return reply(503, { ok: false, error: SENZA_SPAZIO }, c.headers);
  const b = await corpo(request, url.searchParams.get('z') === 'gzip', L);
  if (b.troppo) return reply(413, { ok: false, error: 'blocco troppo grande' }, c.headers);
  if (b.rotto) return reply(400, { ok: false, error: 'blocco gzip non leggibile' }, c.headers);
  const { righe, scartate } = righeBuone(b.testo);
  if (!righe.length) return reply(422, { ok: false, error: 'nessuna riga del registro nel blocco' }, c.headers);
  const key = `registro/${giorno}/${postazione}/${parte}.jsonl`;
  // blocco già scritto (rimandato perché la conferma si era persa): non si riscrive
  if (await bucket.head(key)) return reply(200, { ok: true, doppione: true }, c.headers);
  const testo = righe.join('\n') + '\n', byte = new TextEncoder().encode(testo).length;
  const conti = await leggiConti(bucket), g = conti[giorno] || { byte: 0, blocchi: 0, righe: 0 };
  const maxGiorno = +env.MAX_GIORNO_MB > 0 ? +env.MAX_GIORNO_MB*MB : L.maxGiorno;
  if (g.byte + byte > maxGiorno || g.blocchi >= L.maxBlocchiGiorno) return reply(507, { ok: false, error: 'giorno pieno' }, c.headers);
  // tetto di tutto il registro: oltre non si scrive più (i blocchi restano nella coda del PC) finché l'utente non
  // scarica e cancella i giorni vecchi dal pannello di R2 (poi «Mostra i giorni» nella pagina rifà il conto)
  const maxTotale = +env.MAX_TOTALE_MB > 0 ? +env.MAX_TOTALE_MB*MB : L.maxTotale;
  if (totale(conti) + byte > maxTotale) return reply(507, { ok: false, error: 'registro pieno: scarica e cancella i giorni vecchi' }, c.headers);
  await bucket.put(key, testo, { httpMetadata: { contentType: 'application/x-ndjson; charset=utf-8' }, customMetadata: { righe: String(righe.length) } });
  conti[giorno] = { byte: g.byte + byte, blocchi: g.blocchi + 1, righe: (g.righe || 0) + righe.length };
  try { await bucket.put(CONTI, JSON.stringify(conti), { httpMetadata: { contentType: 'application/json' } }); } catch {}
  return reply(200, { ok: true, righe: righe.length, scartate }, c.headers);
}

/* ---------- lettura (solo con la chiave) ---------- */
async function conChiave(request, env, url, L, now){
  const segreta = clean(env.CHIAVE_LETTURA);
  if (segreta.length < L.minChiave) return reply(403, { ok: false, error: `chiave di lettura non impostata nel Worker (variabile segreta CHIAVE_LETTURA, almeno ${L.minChiave} caratteri)` });
  const chi = `k:${chiE(request)}`;
  if ((visti.get(chi) || []).filter(t => now - t < 600000).length >= L.erroriChiave) return reply(429, { ok: false, error: 'troppe chiavi sbagliate: riprova tra dieci minuti' }, { 'Retry-After': '600' });
  const data = clean((/^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '') || [])[1] || url.searchParams.get('chiave') || '');
  if (!data || !(await uguali(data, segreta))){ frena(chi, L.erroriChiave, 600000, now); return reply(401, { ok: false, error: 'chiave sbagliata' }); }
  return null;
}
async function giorni(env){
  const bucket = env.REGISTRO, trovati = new Set(); let cursor;
  for (let i = 0; i < 10; i++){
    const r = await bucket.list({ prefix: 'registro/', delimiter: '/', cursor });
    for (const p of r.delimitedPrefixes || []){ const g = p.slice('registro/'.length).replace(/\/$/, ''); if (GIORNO_RE.test(g)) trovati.add(g); }
    if (!r.truncated) break; cursor = r.cursor;
  }
  // i conti seguono lo spazio: un giorno cancellato dal pannello di R2 esce dal conto (e dal tetto dei 2 GB)
  const conti = await leggiConti(bucket), via = Object.keys(conti).filter(g => !trovati.has(g));
  if (via.length){ for (const g of via) delete conti[g]; try { await bucket.put(CONTI, JSON.stringify(conti), { httpMetadata: { contentType: 'application/json' } }); } catch {} }
  const L = LIMITI, maxTotale = +env.MAX_TOTALE_MB > 0 ? +env.MAX_TOTALE_MB*MB : L.maxTotale;
  return reply(200, { ok: true, byte: totale(conti), maxByte: maxTotale, giorni: [...trovati].sort().map(g => ({ giorno: g, blocchi: conti[g]?.blocchi ?? null, byte: conti[g]?.byte ?? null, righe: conti[g]?.righe ?? null })) });
}
async function scarica(env, url, L){
  const giorno = url.searchParams.get('giorno') || '';
  if (!GIORNO_RE.test(giorno)) return reply(400, { ok: false, error: 'giorno non valido (AAAA-MM-GG)' });
  const bucket = env.REGISTRO, prefix = `registro/${giorno}/`, da = url.searchParams.get('da') || undefined;
  const r = await bucket.list({ prefix, limit: L.pagina, cursor: da }), parts = [];
  for (const o of r.objects || []){
    const m = /^registro\/(\d{4}-\d{2}-\d{2})\/([a-z0-9]{8})\/(\d{5,7}-[a-z0-9]{4})\.jsonl$/.exec(o.key); if (!m) continue;
    const obj = await bucket.get(o.key); if (!obj) continue;
    const testo = await obj.text();
    parts.push(JSON.stringify({ k: 'blocco', giorno: m[1], postazione: m[2], parte: m[3] }) + '\n', testo.endsWith('\n') ? testo : testo + '\n');
  }
  const continua = r.truncated && r.cursor ? String(r.cursor) : '';
  if (continua && !url.searchParams.get('a-pezzi')) parts.push(JSON.stringify({ k: 'nota', t: 0, continua }) + '\n');
  return new Response(parts.join(''), { status: 200, headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `attachment; filename="registro-${giorno}.jsonl"`, ...(continua ? { 'X-Registro-Continua': continua } : {}) } });
}

/* ---------- pagina per l'utente ---------- */
// Niente dati dentro la pagina: lo stato (spazio collegato, chiave impostata: sì/no) e, con la chiave scritta qui, i
// giorni e lo scarico. La chiave resta nella pagina aperta: non va nell'indirizzo e non si salva.
const PAGINA = (spazio, chiave) => `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Registro di NATPF Simulator</title><style>
body{margin:0;background:#050a1c;color:#f4f6fc;font:16px/1.5 system-ui,sans-serif}main{max-width:720px;margin:0 auto;padding:24px 16px}
h1{font-size:26px;margin:0 0 4px}p{margin:8px 0}.ok{color:#7be28c}.no{color:#ff8a8a}small,.dim{color:#9aa6c8}
input,button{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid #33407a;background:#0d1535;color:inherit}button{cursor:pointer;background:#1c2a6b;font-weight:600}
button:disabled{opacity:.5;cursor:default}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:8px 6px;border-bottom:1px solid #1d2756;text-align:left}td.n,th.n{text-align:right}
.riga{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.riga input{flex:1;min-width:200px}</style></head><body><main>
<h1>Registro di NATPF Simulator</h1><p class="dim">Qui arrivano le righe di gioco dello stand (partite, punti, colpi, errori). Niente nomi, niente video, niente audio.</p>
${spazio ? '' : '<p class="no"><b>Il registro NON è pronto:</b> manca il collegamento al bucket R2. Finché manca, le righe dello stand non vengono salvate qui (restano in coda sul PC dello stand).</p>'}
<p>Spazio R2 collegato: <b class="${spazio ? 'ok">sì' : 'no">no (Settings → Bindings → Add → R2 bucket, nome REGISTRO, bucket privato natpf-registro)'}</b><br>Chiave di lettura impostata: <b class="${chiave ? 'ok">sì' : 'no">no (Settings → Variables and Secrets → CHIAVE_LETTURA, almeno 12 caratteri)'}</b></p>
<div class="riga"><input id="k" type="password" autocomplete="off" placeholder="La tua chiave di lettura"><button id="vai">Mostra i giorni</button></div>
<p id="msg" class="dim">Scrivi la chiave per vedere i giorni registrati e scaricarli.</p>
<p class="dim"><small>Il bucket del registro deve restare <b>privato</b>: non accendere mai «Public access» né un dominio pubblico su quel bucket.</small></p>
<table id="t" hidden><thead><tr><th>Giorno</th><th class="n">Blocchi</th><th class="n">Righe</th><th class="n">Peso</th><th></th></tr></thead><tbody></tbody></table>
<p id="tutti" hidden><button id="tutto">Scarica tutti i giorni in un file</button></p>
<p><small>Il file scaricato (registro-….jsonl) è quello da mandare a chi sviluppa il gioco: lo legge lo strumento «riassunto».</small></p>
<script>
const $=id=>document.getElementById(id),msg=t=>{$('msg').textContent=t};
const peso=b=>b==null?'—':b>=1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' kB';
const chiedi=async p=>{const r=await fetch(p,{headers:{Authorization:'Bearer '+$('k').value.trim()},cache:'no-store'});if(!r.ok){let e='errore '+r.status;try{e=(await r.json()).error||e}catch{}throw new Error(e)}return r};
async function pezzi(giorno,parts){let da='';do{const r=await chiedi('/scarica?a-pezzi=1&giorno='+giorno+(da?'&da='+encodeURIComponent(da):''));parts.push(await r.blob());da=r.headers.get('X-Registro-Continua')||''}while(da)}
function salva(parts,nome){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(parts,{type:'application/x-ndjson'}));a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}
let giorni=[];
async function elenco(){try{msg('Un momento…');const j=await (await chiedi('/giorni')).json();giorni=j.giorni||[];const tb=$('t').querySelector('tbody');tb.textContent='';
for(const g of [...giorni].reverse()){const tr=tb.insertRow();tr.insertCell().textContent=g.giorno;for(const v of [g.blocchi??'—',g.righe??'—',peso(g.byte)]){const c=tr.insertCell();c.className='n';c.textContent=v}
const b=document.createElement('button');b.textContent='Scarica';b.onclick=()=>uno(g.giorno,b);tr.insertCell().appendChild(b)}
$('t').hidden=!giorni.length;$('tutti').hidden=giorni.length<2;msg((giorni.length?giorni.length+' giorni registrati':'Ancora nessun giorno registrato')+(j.maxByte?' · occupati '+peso(j.byte)+' su '+peso(j.maxByte):'')+'.')}catch(e){msg('Non riuscito: '+e.message)}}
async function uno(g,b){b.disabled=true;try{msg('Scarico '+g+'…');const p=[];await pezzi(g,p);salva(p,'registro-'+g+'.jsonl');msg('Scaricato registro-'+g+'.jsonl')}catch(e){msg('Non riuscito: '+e.message)}b.disabled=false}
$('vai').onclick=elenco;$('k').onkeydown=e=>{if(e.key==='Enter')elenco()};
$('tutto').onclick=async()=>{const b=$('tutto');b.disabled=true;try{const p=[];for(const g of giorni){msg('Scarico '+g.giorno+'…');await pezzi(g.giorno,p)}salva(p,'registro-tutto.jsonl');msg('Scaricato registro-tutto.jsonl')}catch(e){msg('Non riuscito: '+e.message)}b.disabled=false};
</script></main></body></html>`;

export default {
  async fetch(request, env = {}){
    const url = new URL(request.url), c = cors(request, env), L = LIMITI, now = Date.now();
    try {
      if (request.method === 'OPTIONS'){
        if (!c.ok) return new Response(null, { status: 403, headers: c.headers });
        return new Response(null, { status: 204, headers: { ...c.headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
      }
      if (request.method === 'POST') return await scrivi(request, env, url, c, L, now);
      if (request.method !== 'GET') return reply(405, { ok: false, error: 'metodo non permesso' }, { Allow: 'GET, POST, OPTIONS' });
      const spazio = !!env.REGISTRO && typeof env.REGISTRO.put === 'function', chiave = clean(env.CHIAVE_LETTURA).length >= L.minChiave;
      if (url.pathname === '/giorni' || url.pathname === '/scarica'){
        const no = await conChiave(request, env, url, L, now); if (no) return no;
        if (!spazio) return reply(503, { ok: false, error: SENZA_SPAZIO });
        return url.pathname === '/giorni' ? await giorni(env) : await scarica(env, url, L);
      }
      if (url.pathname !== '/') return reply(404, { ok: false, error: 'indirizzo non previsto' });
      // la pagina per l'utente; a un programma (Accept senza text/html) solo lo stato. Mai dati senza la chiave
      // senza il collegamento al bucket il Worker non è pronto: lo dice chiaro e non accetta righe
      if (!/text\/html/i.test(request.headers.get('Accept') || '')) return spazio ? reply(200, { ok: true, registro: 'pronto', spazio, chiave }, c.ok ? c.headers : {})
        : reply(503, { ok: false, registro: 'non pronto', spazio, chiave, error: SENZA_SPAZIO }, c.ok ? c.headers : {});
      return new Response(PAGINA(spazio, chiave), { status: spazio ? 200 : 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' } });
    } catch { return reply(500, { ok: false, error: 'errore del Worker' }, c.ok ? c.headers : {}); }
  },
};
