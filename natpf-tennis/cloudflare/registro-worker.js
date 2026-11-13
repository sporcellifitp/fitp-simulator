// Registro dello stand di NATPF Simulator: Worker che riceve le righe di gioco e le scrive nello spazio R2 dell'utente.
//
// Perché: il PC dello stand non è dell'utente (decisione del 12/11: «Non puoi salvare i log su un drive? Il PC non è il
// mio»). Il gioco tiene un registro continuo e leggero, solo di gioco (partite, punti, colpi, errori: niente nomi,
// niente video, niente audio, niente indirizzi), e lo manda qui a blocchi. Questo Worker li scrive in R2, COMPRESSI, sotto
//   registro/<giorno>/<postazione>/<parte>.jsonl.gz
// Chi non ha la chiave segreta dell'utente può solo AGGIUNGERE righe del registro; non può leggere, elencare né
// cancellare niente, nemmeno indirettamente: le scritture senza chiave non fanno MAI cancellare niente (revisione del
// 12/11: prima, oltre il tetto, il Worker toglieva da solo i giorni più vecchi, e chi conosceva l'indirizzo poteva far
// sparire i giorni veri mandando righe finte). Chi conosce l'indirizzo (sta nel pacchetto web, che è pubblico) può al
// più RIEMPIRE lo spazio: allora il Worker risponde 507, i blocchi restano in coda sul PC dello stand e la pagina del
// Worker avvisa che lo spazio è pieno; l'utente, con la chiave, scarica e cancella i giorni che non servono più.
// La chiave sta nelle variabili segrete del Worker: mai nel gioco, mai nel repository.
//
// LO SPAZIO NON È INFINITO («ok su Cloudflare ma non ho spazio infinito», 12/11: 10 GB in tutto, con dentro anche
// l'installer e il trailer). Per questo:
//   - i blocchi si salvano compressi (gzip: circa un quinto del testo);
//   - il Worker tiene il conto dello spazio in un piccolo indice (conti.json: byte, blocchi, righe e partite per
//     giorno), aggiornato a ogni blocco: non elenca il bucket a ogni invio;
//   - TETTO TOTALE (variabile MAX_TOTALE_MB, di base 2048 = 2 GB): un blocco che lo farebbe superare non si scrive
//     (507 «spazio pieno»): il gioco lo tiene in coda sul PC e lo rimanda da solo quando c'è di nuovo posto. Il Worker
//     non cancella mai niente da solo: si cancella solo con la chiave, dalla pagina del Worker (o dal pannello di R2);
//   - TETTO DEL GIORNO (MAX_GIORNO_MB, di base 200): un giorno pieno non accetta altre righe (507) e il gioco le
//     tiene in coda sul PC.
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
//        CHIAVE_LETTURA    (Secret)  la chiave che scegli tu, almeno 12 caratteri: serve per vedere lo spazio, elencare,
//                                    scaricare e cancellare
//        ALLOWED_ORIGINS   (Text)    le pagine del gioco che possono scrivere, separate da virgole, senza «/» finale:
//                                    https://<gioco>.workers.dev, https://localhost:8443   (la seconda è il programma
//                                    Windows). «:*» alla fine vale per ogni porta. Vuota = scrive qualunque sito (va
//                                    bene per una prova, non per restare così).
//        MAX_TOTALE_MB     (Text, facoltativa)  tetto di tutto il registro in MB; senza, 2048
//        MAX_GIORNO_MB     (Text, facoltativa)  tetto di un giorno in MB; senza, 200
//        MAX_OPERAZIONI    (Text, facoltativa)  operazioni sullo spazio per richiesta; senza, 40 (piano gratuito)
//   5. Prova: l'indirizzo del Worker nel browser mostra la pagina «Registro di NATPF Simulator», che dice se lo spazio
//      e la chiave sono a posto e, con la chiave, mostra lo spazio occupato, elenca i giorni, li scarica e li cancella.
//   6. L'indirizzo del Worker va nel pacchetto del gioco: scripts/pacchetto-cloudflare.mjs --registro-url=… e, per il
//      programma Windows, natpf-desktop/registro.json (o la variabile NATPF_REGISTRO_URL alla costruzione).
//
// Richieste:
//   POST /?giorno=AAAA-MM-GG&postazione=xxxxxxxx&parte=00012-abcd   corpo: righe JSON Lines, in chiaro o gzip (il
//        Worker lo riconosce dai primi due byte; «&z=gzip» è accettato ma non serve)
//        → 200 { ok, righe, scartate } · 200 { ok, doppione } se quel blocco c'è già (non si riscrive: niente doppioni)
//        → 400 parametri · 403 origine · 409 giorno fuori dalla finestra accettata (da 7 giorni fa a domani: orologio
//          del PC sbagliato o blocco troppo vecchio; il gioco lo tiene in coda) · 413 blocco troppo grande · 422 nessuna
//          riga del registro · 429 troppi invii · 507 giorno pieno o spazio pieno · 503 spazio R2 non collegato
//   GET  /            pagina per l'utente (stato, e con la chiave: spazio, giorni, scarico, cancellazione); a un
//        programma (senza Accept: text/html) lo stato: 200 { ok, registro: 'pronto', spazio, chiave } · 503 non pronto
//   GET  /giorni      (chiave)  { ok, byte, maxByte, maxGiorno, giorni: [{ giorno, blocchi, byte, righe, partite }],
//        cancellati: [{ giorno, byte, quando, perche: 'utente' (o 'tetto' nei conti scritti dalle versioni di prima) }] }: lo spazio occupato dal registro
//   GET  /scarica?giorno=AAAA-MM-GG[&da=…][&a-pezzi=1]   (chiave)  un file .jsonl.gz: i blocchi compressi uno dopo
//        l'altro (più gzip in fila sono un gzip valido: nessun calcolo). Ogni blocco comincia con la riga
//        {"k":"blocco","giorno":…,"postazione":…,"parte":…}. Al massimo PAGINA blocchi per richiesta (limite di
//        Cloudflare sulle operazioni per richiesta): se ce ne sono altri, l'intestazione X-Registro-Continua dice da
//        dove riprendere (&da=…); senza «a-pezzi» in fondo c'è anche la riga {"k":"nota","t":0,"continua":…}.
//   DELETE /giorni?giorno=AAAA-MM-GG  oppure  /giorni?tutto=si   (chiave)  cancella un giorno o tutto; risponde come
//        GET /giorni più «finito»: false = ci sono ancora blocchi, richiamare (poche operazioni per richiesta)
//   POST /ricalcola   (chiave)  rifà l'indice dello spazio dall'elenco vero dei blocchi (a pezzi: «finito» come sopra)
//   La chiave: intestazione «Authorization: Bearer <chiave>» (la pagina fa così) oppure «?chiave=…».
// Gli errori sono { ok: false, error } e non contengono mai la chiave. L'indirizzo di rete di chi scrive serve solo, in
// memoria e per un minuto, a frenare chi manda troppe richieste: non si scrive da nessuna parte.
//
// Piano gratuito di Cloudflare: pochi millisecondi di calcolo e una cinquantina di operazioni sullo spazio per
// richiesta. Un invio ne fa 4 (c'è già? · indice · blocco · indice); scarico, cancellazione e ricalcolo vanno a pezzi.
//
// Gli elenchi qui sotto (tipi di riga, campi previsti, campi vietati, limiti) sono una COPIA di quelli del gioco
// (natpf-tennis/src/natpf/registro/registro_formato.js): questo file deve restare uno solo, da incollare. Un test
// (test/registro-worker.test.mjs) fallisce se le due copie non sono uguali.
//
// FORMATO delle righe che questo Worker conosce (lo stesso numero del campo «v» della riga «avvio» del gioco): 2 dal B36.0,
// con i campi della direzione dei colpi (pf, dv, tu, rx, rz, fu, nr, zp, dir: docs/b36/misure-b36-0.md). La pagina del
// Worker lo scrive in chiaro («Formato delle righe: 2»), così chi lo ricarica vede subito che la versione nuova è attiva.
// Compatibilità: un Worker di prima (formato 1) accetta le righe del gioco nuovo e ne toglie in silenzio i campi che non
// conosce (le righe restano, i campi della direzione no); questo Worker accetta le righe dei giochi di prima (senza quei
// campi) come sempre. Il test lo prova con il Worker di prima ricostruito da questo file.

const MB = 1024*1024;
export const LIMITI = Object.freeze({
  maxBlocco: 256*1024,        // byte di un blocco in arrivo (compresso o no)
  maxAperto: 2*MB,            // byte di un blocco gzip una volta aperto
  maxRiga: 2000, maxTesto: 80, maxMessaggio: 200,
  maxGiorno: 200*MB,          // byte scritti in un giorno, tutte le postazioni (variabile MAX_GIORNO_MB per cambiarlo)
  maxBlocchiGiorno: 20000,    // blocchi scritti in un giorno
  maxTotale: 2048*MB,         // tutto il registro, tutti i giorni: 2 GB dei 10 dell'account (variabile MAX_TOTALE_MB)
  invioAlMinuto: 120,         // richieste di scrittura al minuto da uno stesso indirizzo
  giorniIndietro: 7,          // un blocco può arrivare in ritardo (stand senza rete) fino a 7 giorni: una finestra
                              // stretta perché chi conosce l'indirizzo non possa riempire molti giorni (8 × 200 MB < 2 GB)
  pagina: 40,                 // blocchi per richiesta di scarico
  operazioni: 40,             // operazioni sullo spazio per richiesta, al più (cancellazione e ricalcolo a pezzi)
  erroriChiave: 10,           // chiavi sbagliate in 10 minuti da uno stesso indirizzo, poi 429
  minChiave: 12,
});
export const TIPI = Object.freeze(['avvio', 'chiusura', 'partita', 'partita.fine', 'punto', 'colpo', 'servizio', 'vuoto', 'tutorial', 'calibrazione', 'allenamento',
  'minigioco', 'visita', 'tel', 'errore', 'crash', 'nota']);
export const CAMPI = Object.freeze(['k', 't', 'n', 'v', 'ora', 'fuso', 'g', 'versione', 'dove', 'motivo', 'schermo', 'area', 'dpr', 'cpu', 'gpu', 'gpuTipo', 'pagina', 'chiosco', 'prima',
  'primaInPartita', 'modo', 'chi', 'livello', 'ruolo', 'formato', 'game', 'fiera', 'batte', 'personaggi', 'ctrl', 'mano', 'mano2', 'segnale', 'nomeInserito', 'nomeInserito2', 'stand',
  'mira', 'caldo', 'lancioAuto', 'campoAperto', 'fasce', 'aiuto', 'ek', 'tel', 'tel2', 'strada', 'rtt', 'so', 'browser', 'p', 'vince', 'fine', 'ultimo', 'colpi', 'colpi2', 'durS',
  'attesaS', 'pt', 'lanci', 'lanciVuoti', 'battutaAuto', 'esito', 'come', 'punti', 'puntiVinti', 'fps', 'medi', 'peggiori', 'maxMs', 'lunghi', 'cadute', 'riprese', 'rttMax', 'errori',
  'scartati', 'amb', 'gesto', 'voluto', 'ms', 'voto', 'f', 'd', 'e', 'x', 'z', 'sup', 'supNo', 'volee', 'rete', 'mov', 'lato', 'fonte', 'causa', 'aiutato', 'tipo', 'q', 'kmh', 'auto', 'perche',
  'serie', 'schede', 'viste', 'tutte', 'chiusura', 'finita', 'prove', 'fallite', 'passi', 'ripartenze', 'revisioni', 'revisioniNo', 'semplice', 'finito', 'saltato', 'perfetti', 'gioco',
  'partite', 'posti', 'abbandono', 'stato', 'dopoS', 'inPartita', 'msg', 'file', 'riga', 'col', 'volte', 'tagliata', 'perse', 'costoMs', 'costoMax', 'registro', 'in',
  'pf', 'dv', 'tu', 'rx', 'rz', 'fu', 'nr', 'zp', 'dir']);
export const FORMATO = 2;
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
// Il testo si taglia PRIMA delle espressioni (revisione: l'espressione delle e-mail costa in modo quadratico su una
// parola lunga senza «@»: 40.000 caratteri = 1 s di calcolo)
const VIRGOLETTE_RE = /'[^'\n]{1,120}'|"[^"\n]{1,120}"|`[^`\n]{1,120}`|«[^»\n]{1,120}»|“[^”\n]{1,120}”|‘[^’\n]{1,120}’/g;
// virgolette: anche senza i testi tra virgolette (messaggi d'errore: lì può finire una chiave che è un nome)
export function pulisciTesto(s, max = LIMITI.maxTesto, virgolette = false){
  let out = String(s ?? '').slice(0, 2*max).replace(/[\u0000-\u001f\u007f]+/g, ' ');
  out = out.replace(URL_RE, u => { const f = u.replace(/[?#].*$/, '').split('/').filter(Boolean).pop() || ''; return /\.[a-z0-9]{1,5}$/i.test(f) ? f : '[pagina]'; });
  out = out.replace(MAIL_RE, '[e-mail]').replace(IP_RE, '[indirizzo]').replace(IP6_RE, '[indirizzo]');
  if (virgolette) out = out.replace(VIRGOLETTE_RE, '[testo]');
  return out.length > max ? out.slice(0, max - 1) + '…' : out;
}
// una riga buona da scrivere, o null se non è del registro (stessa regola del gioco: registro_formato.pulisci)
export function pulisci(row){
  const walk = (v, key, depth, mappa) => {
    if (v == null) return undefined;
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (mappa && !Array.isArray(v)) return undefined;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return key === 'msg' ? pulisciTesto(v, LIMITI.maxMessaggio, true) : pulisciTesto(v, LIMITI.maxTesto);
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
  const out = []; let scartate = 0, partite = 0;
  for (const riga of String(testo).split('\n')){
    if (!riga.trim()) continue;
    let row = null;
    if (riga.length <= LIMITI.maxRiga*2){ try { row = pulisci(JSON.parse(riga)); } catch { row = null; } }
    const s = row ? JSON.stringify(row) : null;
    if (s && s.length <= LIMITI.maxRiga){ out.push(s); if (row.k === 'partita') partite++; } else scartate++;
  }
  return { righe: out, scartate, partite };
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
const giornoBuono = g => { if (!GIORNO_RE.test(g)) return false; const t = Date.parse(`${g}T12:00:00Z`); return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === g; };
// finestra dei giorni accettati senza chiave: da giorniIndietro giorni fa a domani
const giornoValido = (g, now, L) => {
  if (!giornoBuono(g)) return false;
  const t = Date.parse(`${g}T12:00:00Z`);
  return t <= now + 36*3600*1000 && t >= now - (L.giorniIndietro + 1)*86400000;
};
// il giorno di oggi in Italia (la giornata dello stand), 'AAAA-MM-GG' (serve a chi legge lo scarico e alle prove)
export function oggiItalia(now = Date.now()){
  try { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now)); }
  catch { return new Date(now).toISOString().slice(0, 10); }
}
// operazioni sullo spazio per richiesta: LIMITI.operazioni, o la variabile MAX_OPERAZIONI (piano a pagamento: di più)
const operazioni = env => { const n = parseInt(env.MAX_OPERAZIONI, 10); return n >= 6 && n <= 900 ? n : LIMITI.operazioni; };
const megabyte = (v, base) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n*MB : base; };
const SENZA_SPAZIO = 'spazio R2 non collegato: nel Worker, Settings → Bindings → Add → R2 bucket, nome della variabile REGISTRO, bucket privato natpf-registro';
const BLOCCO_RE = /^registro\/(\d{4}-\d{2}-\d{2})\/([a-z0-9]{8})\/(\d{5,7}-[a-z0-9]{4})\.jsonl\.gz$/;

/* ---------- compressione ---------- */
async function comprimi(testo){ return new Uint8Array(await new Response(new Blob([testo]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); }
const eGzip = buf => buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;

/* ---------- indice dello spazio (conti.json) ---------- */
// { v: 2, giorni: { 'AAAA-MM-GG': { byte, blocchi, righe, partite } }, cancellati: [{ giorno, byte, quando, perche }],
//   aggiornato }. Si aggiorna a ogni blocco scritto: il conto dello spazio non costa un elenco del bucket.
export const CONTI = 'conti.json';
function sistema(c){
  if (!c || typeof c !== 'object' || !c.giorni || typeof c.giorni !== 'object') c = { v: 2, giorni: {}, cancellati: [] };
  if (!Array.isArray(c.cancellati)) c.cancellati = [];
  for (const [g, d] of Object.entries(c.giorni)) if (!GIORNO_RE.test(g) || !d || typeof d !== 'object') delete c.giorni[g];
  return c;
}
const totale = c => Object.values(c.giorni).reduce((a, g) => a + (+g?.byte || 0), 0);
async function leggiConti(bucket){
  try { const o = await bucket.get(CONTI); return o ? { conti: sistema(JSON.parse(await o.text())), etag: o.etag || null } : { conti: sistema(null), etag: null }; }
  catch { return { conti: sistema(null), etag: null }; }
}
// leggi → cambia → scrivi, solo se nel frattempo nessun altro ha scritto (etag): due postazioni che scrivono nello
// stesso istante non si perdono il conto. cambia(conti) può essere asincrona e deve reggere di essere ripetuta.
// prima: lettura già fatta (un'operazione in meno). null se dopo quattro giri l'indice è ancora conteso
async function aggiornaConti(bucket, cambia, now, prima = null){
  for (let giro = 0; giro < 4; giro++){
    const { conti, etag } = giro === 0 && prima ? prima : await leggiConti(bucket);
    await cambia(conti);
    conti.aggiornato = new Date(now).toISOString();
    const res = await bucket.put(CONTI, JSON.stringify(conti), { httpMetadata: { contentType: 'application/json' }, ...(etag ? { onlyIf: { etagMatches: etag } } : {}) });
    if (res) return conti;
  }
  return null;
}
// cancella i blocchi di un giorno con al più ops.n operazioni (un elenco e una cancellazione ogni 1000 blocchi)
async function togliGiorno(bucket, giorno, ops){
  let byte = 0, blocchi = 0;
  while (ops.n >= 2){
    const l = await bucket.list({ prefix: `registro/${giorno}/`, limit: 1000 }); ops.n--;
    const keys = (l.objects || []).map(o => o.key);
    if (!keys.length) return { finito: true, byte, blocchi };
    await bucket.delete(keys); ops.n--;
    byte += l.objects.reduce((a, o) => a + (o.size || 0), 0); blocchi += keys.length;
    if (!l.truncated) return { finito: true, byte, blocchi };
  }
  return { finito: false, byte, blocchi };
}
function segna(conti, giorno, byte, perche, now){
  conti.cancellati.push({ giorno, byte, quando: new Date(now).toISOString(), perche });
  if (conti.cancellati.length > 60) conti.cancellati.splice(0, conti.cancellati.length - 60);
}
// tolto (in tutto o in parte) un giorno: l'indice segue
function dopoTolto(conti, giorno, r, perche, now){
  const d = conti.giorni[giorno];
  if (r.finito){ if (d || r.blocchi){ segna(conti, giorno, Math.max(+d?.byte || 0, r.byte), perche, now); } delete conti.giorni[giorno]; }
  else if (d){ d.byte = Math.max(0, (+d.byte || 0) - r.byte); d.blocchi = Math.max(0, (+d.blocchi || 0) - r.blocchi); d.inCancellazione = true; }
}

/* ---------- scrittura ---------- */
// il corpo si legge a pezzi, con il tetto: un corpo senza Content-Length non si legge tutto prima del controllo
async function corpo(request, gzip, L){
  const dichiarati = +request.headers.get('Content-Length') || 0;
  if (dichiarati > L.maxBlocco) return { troppo: true };
  let buf;
  if (request.body && typeof request.body.getReader === 'function'){
    const reader = request.body.getReader(), parts = []; let n = 0;
    for (;;){ const { done, value } = await reader.read(); if (done) break; n += value.length; if (n > L.maxBlocco){ try { await reader.cancel(); } catch {} return { troppo: true }; } parts.push(value); }
    buf = new Uint8Array(n); let o = 0; for (const p of parts){ buf.set(p, o); o += p.length; }
  } else buf = new Uint8Array(await request.arrayBuffer());
  if (buf.length > L.maxBlocco) return { troppo: true };
  if (!gzip && !eGzip(buf)) return { testo: new TextDecoder().decode(buf) };
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
  if (!giornoBuono(giorno) || !POSTAZIONE_RE.test(postazione) || !PARTE_RE.test(parte)) return reply(400, { ok: false, error: 'giorno, postazione o parte non validi' }, c.headers);
  // un giorno fuori dalla finestra (orologio del PC sbagliato, blocco rimasto in coda più di una settimana): 409, il
  // gioco lo tiene in coda (lo staff lo può scaricare con «Scarica la coda») e il pannello dello stand lo dice
  if (!giornoValido(giorno, now, L)) return reply(409, { ok: false, error: 'giorno fuori dalla finestra accettata (orologio del computer?)' }, c.headers);
  const bucket = env.REGISTRO;
  if (!bucket || typeof bucket.put !== 'function') return reply(503, { ok: false, error: SENZA_SPAZIO }, c.headers);
  const b = await corpo(request, url.searchParams.get('z') === 'gzip', L);
  if (b.troppo) return reply(413, { ok: false, error: 'blocco troppo grande' }, c.headers);
  if (b.rotto) return reply(400, { ok: false, error: 'blocco gzip non leggibile' }, c.headers);
  const { righe, scartate, partite } = righeBuone(b.testo);
  if (!righe.length) return reply(422, { ok: false, error: 'nessuna riga del registro nel blocco' }, c.headers);
  const key = `registro/${giorno}/${postazione}/${parte}.jsonl.gz`;
  // blocco già scritto (rimandato perché la conferma si era persa): non si riscrive e non si riconta
  if (await bucket.head(key)) return reply(200, { ok: true, doppione: true }, c.headers);
  // nello spazio: compresso, con in testa la riga che dice di che blocco si tratta (serve a chi legge lo scarico)
  const gz = await comprimi(JSON.stringify({ k: 'blocco', giorno, postazione, parte }) + '\n' + righe.join('\n') + '\n'), byte = gz.length;
  const prima = await leggiConti(bucket), g = prima.conti.giorni[giorno] || { byte: 0, blocchi: 0 };
  const maxGiorno = megabyte(env.MAX_GIORNO_MB, L.maxGiorno), maxTotale = megabyte(env.MAX_TOTALE_MB, L.maxTotale);
  // un giorno pieno non accetta altro; uno spazio pieno nemmeno (e non si cancella niente per far posto): il gioco
  // tiene in coda e riprova da solo
  if ((+g.byte || 0) + byte > Math.min(maxGiorno, maxTotale) || (+g.blocchi || 0) >= L.maxBlocchiGiorno) return reply(507, { ok: false, error: 'giorno pieno' }, c.headers);
  if (totale(prima.conti) + byte > maxTotale) return reply(507, { ok: false, error: 'spazio pieno: cancella con la chiave i giorni già scaricati' }, c.headers);
  await bucket.put(key, gz, { httpMetadata: { contentType: 'application/gzip' }, customMetadata: { righe: String(righe.length), partite: String(partite) } });
  // indice (mai cancellazioni qui: senza la chiave non si cancella niente). Il blocco è già scritto: se l'indice resta
  // conteso la risposta è buona lo stesso e il conto si rimette a posto con «Ricalcola lo spazio»
  try {
    await aggiornaConti(bucket, async conti => {
      const d = conti.giorni[giorno] || (conti.giorni[giorno] = { byte: 0, blocchi: 0, righe: 0, partite: 0 });
      d.byte = (+d.byte || 0) + byte; d.blocchi = (+d.blocchi || 0) + 1; d.righe = (+d.righe || 0) + righe.length; d.partite = (+d.partite || 0) + partite; delete d.inCancellazione;
    }, now, prima);
  } catch {}
  return reply(200, { ok: true, righe: righe.length, scartate }, c.headers);
}

/* ---------- lettura e cancellazione (solo con la chiave) ---------- */
async function conChiave(request, env, url, L, now){
  const segreta = clean(env.CHIAVE_LETTURA);
  if (segreta.length < L.minChiave) return reply(403, { ok: false, error: `chiave di lettura non impostata nel Worker (variabile segreta CHIAVE_LETTURA, almeno ${L.minChiave} caratteri)` });
  const chi = `k:${chiE(request)}`;
  if ((visti.get(chi) || []).filter(t => now - t < 600000).length >= L.erroriChiave) return reply(429, { ok: false, error: 'troppe chiavi sbagliate: riprova tra dieci minuti' }, { 'Retry-After': '600' });
  const data = clean((/^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '') || [])[1] || url.searchParams.get('chiave') || '');
  if (!data || !(await uguali(data, segreta))){ frena(chi, L.erroriChiave, 600000, now); return reply(401, { ok: false, error: 'chiave sbagliata' }); }
  return null;
}
// lo spazio occupato dal registro, giorno per giorno (quello che vede l'utente con la chiave)
function vista(conti, env, extra = {}){
  const L = LIMITI;
  return { ok: true, byte: totale(conti), maxByte: megabyte(env.MAX_TOTALE_MB, L.maxTotale), maxGiorno: megabyte(env.MAX_GIORNO_MB, L.maxGiorno),
    giorni: Object.keys(conti.giorni).sort().map(g => { const d = conti.giorni[g]; return { giorno: g, blocchi: d.blocchi ?? null, byte: d.byte ?? null, righe: d.righe ?? null, partite: d.partite ?? null }; }),
    cancellati: conti.cancellati, aggiornato: conti.aggiornato || null, ...extra };
}
async function giorni(env, now){
  const bucket = env.REGISTRO, trovati = new Set(); let cursor;
  for (let i = 0; i < 10; i++){
    const r = await bucket.list({ prefix: 'registro/', delimiter: '/', cursor });
    for (const p of r.delimitedPrefixes || []){ const g = p.slice('registro/'.length).replace(/\/$/, ''); if (GIORNO_RE.test(g)) trovati.add(g); }
    if (!r.truncated) break; cursor = r.cursor;
  }
  // i conti seguono lo spazio: un giorno cancellato dal pannello di R2 esce dal conto; uno che c'è e non è nel conto
  // compare senza numeri («Ricalcola lo spazio» li rifà)
  const prima = await leggiConti(bucket), via = Object.keys(prima.conti.giorni).filter(g => !trovati.has(g)), nuovi = [...trovati].filter(g => !prima.conti.giorni[g]);
  let conti = prima.conti;
  if (via.length || nuovi.length) conti = (await aggiornaConti(bucket, c => { for (const g of Object.keys(c.giorni)) if (!trovati.has(g)) delete c.giorni[g]; for (const g of trovati) if (!c.giorni[g]) c.giorni[g] = { byte: null, blocchi: null, righe: null, partite: null }; }, now, prima)) || conti;
  return reply(200, vista(conti, env));
}
// un giorno: i blocchi compressi uno dopo l'altro (un .jsonl.gz valido), a pezzi di L.pagina
async function scarica(env, url, L){
  const giorno = url.searchParams.get('giorno') || '';
  if (!GIORNO_RE.test(giorno)) return reply(400, { ok: false, error: 'giorno non valido (AAAA-MM-GG)' });
  const bucket = env.REGISTRO, prefix = `registro/${giorno}/`, da = url.searchParams.get('da') || undefined;
  const r = await bucket.list({ prefix, limit: L.pagina, cursor: da }), parts = []; let blocchi = 0;
  for (const o of r.objects || []){
    if (!BLOCCO_RE.test(o.key)) continue;
    const obj = await bucket.get(o.key); if (!obj) continue;
    parts.push(await obj.arrayBuffer()); blocchi++;
  }
  const continua = r.truncated && r.cursor ? String(r.cursor) : '';
  if (continua && !url.searchParams.get('a-pezzi')) parts.push(await comprimi(JSON.stringify({ k: 'nota', t: 0, continua }) + '\n'));
  return new Response(new Blob(parts), { status: 200, headers: { 'Content-Type': 'application/gzip', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `attachment; filename="registro-${giorno}.jsonl.gz"`, 'X-Registro-Blocchi': String(blocchi), ...(continua ? { 'X-Registro-Continua': continua } : {}) } });
}
// cancella un giorno o tutto (l'utente, con la chiave). A pezzi: finito: false → richiamare
async function cancella(env, url, L, now){
  const giorno = url.searchParams.get('giorno') || '', tutto = url.searchParams.get('tutto') === 'si';
  if (!tutto && !GIORNO_RE.test(giorno)) return reply(400, { ok: false, error: 'dire quale giorno (giorno=AAAA-MM-GG) oppure tutto=si' });
  const bucket = env.REGISTRO, ops = { n: operazioni(env) - 4 }; let finito = true;
  const conti = await aggiornaConti(bucket, async c => {
    finito = true;
    for (const g of tutto ? Object.keys(c.giorni).sort() : [giorno]){
      if (ops.n < 2){ finito = false; break; }
      const r = await togliGiorno(bucket, g, ops);
      dopoTolto(c, g, r, 'utente', now);
      if (!r.finito){ finito = false; break; }
    }
  }, now);
  if (!conti) return reply(503, { ok: false, error: 'indice occupato: riprova' });
  return reply(200, vista(conti, env, { finito }));
}
// «Ricalcola lo spazio»: l'indice rifatto dall'elenco vero dei blocchi (a pezzi: finito: false → richiamare)
async function ricalcola(env, L, now){
  const bucket = env.REGISTRO; let finito = false, giri = operazioni(env) - 4;
  const conti = await aggiornaConti(bucket, async c => {
    const R = c.ricalcolo && typeof c.ricalcolo === 'object' ? c.ricalcolo : { cursore: null, giorni: {} };
    finito = false;
    while (giri-- > 0){
      const l = await bucket.list({ prefix: 'registro/', limit: 1000, include: ['customMetadata'], ...(R.cursore ? { cursor: R.cursore } : {}) });
      for (const o of l.objects || []){
        const m = BLOCCO_RE.exec(o.key); if (!m) continue;
        const d = R.giorni[m[1]] || (R.giorni[m[1]] = { byte: 0, blocchi: 0, righe: 0, partite: 0 });
        d.byte += o.size || 0; d.blocchi++; d.righe += +o.customMetadata?.righe || 0; d.partite += +o.customMetadata?.partite || 0;
      }
      if (!l.truncated){ finito = true; break; }
      R.cursore = l.cursor;
    }
    if (finito){ c.giorni = R.giorni; delete c.ricalcolo; } else c.ricalcolo = R;
  }, now);
  if (!conti) return reply(503, { ok: false, error: 'indice occupato: riprova' });
  return reply(200, vista(conti, env, { finito }));
}

/* ---------- pagina per l'utente ---------- */
// Niente dati dentro la pagina: lo stato (spazio collegato, chiave impostata: sì/no) e, con la chiave scritta qui, lo
// spazio occupato, i giorni, lo scarico e la cancellazione. La chiave resta nella pagina aperta: non va nell'indirizzo e non si salva.
const PAGINA = (spazio, chiave) => `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Registro di NATPF Simulator</title><style>
body{margin:0;background:#050a1c;color:#f4f6fc;font:16px/1.5 system-ui,sans-serif}main{max-width:720px;margin:0 auto;padding:24px 16px}
h1{font-size:26px;margin:0 0 4px}p{margin:8px 0}.ok{color:#7be28c}.no{color:#ff8a8a}small,.dim{color:#9aa6c8}
input,button{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid #33407a;background:#0d1535;color:inherit}button{cursor:pointer;background:#1c2a6b;font-weight:600}
button:disabled{opacity:.5;cursor:default}button.via{background:#4a1626;border-color:#7a3347}#barra{height:12px;border-radius:6px;background:#0d1535;border:1px solid #33407a;overflow:hidden;margin:8px 0}#barra i{display:block;height:100%;width:0;background:#7be28c}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:8px 6px;border-bottom:1px solid #1d2756;text-align:left}td.n,th.n{text-align:right}
.riga{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.riga input{flex:1;min-width:200px}</style></head><body><main>
<h1>Registro di NATPF Simulator</h1><p class="dim">Qui arrivano le righe di gioco dello stand (partite, punti, colpi, errori). Niente nomi, niente video, niente audio.</p>
${spazio ? '' : '<p class="no"><b>Il registro NON è pronto:</b> manca il collegamento al bucket R2. Finché manca, le righe dello stand non vengono salvate qui (restano in coda sul PC dello stand).</p>'}
<p>Spazio R2 collegato: <b class="${spazio ? 'ok">sì' : 'no">no (Settings → Bindings → Add → R2 bucket, nome REGISTRO, bucket privato natpf-registro)'}</b><br>Chiave di lettura impostata: <b class="${chiave ? 'ok">sì' : 'no">no (Settings → Variables and Secrets → CHIAVE_LETTURA, almeno 12 caratteri)'}</b><br>Formato delle righe: <b class="ok" id="formato">${FORMATO}</b> <span class="dim">(con la direzione dei colpi)</span></p>
<div class="riga"><input id="k" type="password" autocomplete="off" placeholder="La tua chiave di lettura"><button id="vai">Mostra i giorni</button></div>
<p id="msg" class="dim">Scrivi la chiave per vedere lo spazio occupato e i giorni registrati, scaricarli o cancellarli.</p>
<div id="barra" hidden><i></i></div><p id="spazio" class="dim" hidden></p>
<p class="dim"><small>Il bucket del registro deve restare <b>privato</b>: non accendere mai «Public access» né un dominio pubblico su quel bucket.</small></p>
<table id="t" hidden><thead><tr><th>Giorno</th><th class="n">Blocchi</th><th class="n">Righe</th><th class="n">Peso</th><th></th></tr></thead><tbody></tbody></table>
<p id="tutti" hidden><button id="tutto">Scarica tutti i giorni in un file</button> <button id="ricalcola">Ricalcola lo spazio</button> <button id="viatutto" class="via">Cancella tutto</button></p>
<p id="pieno" class="no" hidden></p>
<p><small>Il file scaricato (registro-….jsonl.gz, compresso) è quello da mandare così com'è a chi sviluppa il gioco: lo legge lo strumento «riassunto». Il Worker non cancella mai niente da solo: quando lo spazio è pieno non accetta altre righe (restano in coda sui PC dello stand) finché non cancelli qui i giorni già scaricati.</small></p>
<script>
const $=id=>document.getElementById(id),msg=t=>{$('msg').textContent=t};
const peso=b=>b==null?'—':b>=1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' kB';
const chiedi=async(p,method)=>{const r=await fetch(p,{method:method||'GET',headers:{Authorization:'Bearer '+$('k').value.trim()},cache:'no-store'});if(!r.ok){let e='errore '+r.status;try{e=(await r.json()).error||e}catch{}throw new Error(e)}return r};
async function pezzi(giorno,parts){let da='';do{const r=await chiedi('/scarica?a-pezzi=1&giorno='+giorno+(da?'&da='+encodeURIComponent(da):''));parts.push(await r.blob());da=r.headers.get('X-Registro-Continua')||''}while(da)}
function salva(parts,nome){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(parts,{type:'application/gzip'}));a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}
let giorni=[];
function mostra(j){giorni=j.giorni||[];const tb=$('t').querySelector('tbody');tb.textContent='';
for(const g of [...giorni].reverse()){const tr=tb.insertRow();tr.insertCell().textContent=g.giorno;for(const v of [g.blocchi??'—',g.righe??'—',peso(g.byte)]){const c=tr.insertCell();c.className='n';c.textContent=v}
const b=document.createElement('button');b.textContent='Scarica';b.onclick=()=>uno(g.giorno,b);const x=document.createElement('button');x.textContent='Cancella';x.className='via';x.onclick=()=>via('giorno='+g.giorno,'Cancellare il giorno '+g.giorno+'? Non si può tornare indietro.',x);const c=tr.insertCell();c.appendChild(b);c.appendChild(document.createTextNode(' '));c.appendChild(x)}
$('t').hidden=!giorni.length;$('tutti').hidden=!giorni.length;$('barra').hidden=$('spazio').hidden=false;$('barra').firstChild.style.width=Math.min(100,100*j.byte/j.maxByte)+'%';
$('spazio').textContent='Spazio occupato dal registro: '+peso(j.byte)+' su '+peso(j.maxByte)+'.'+((j.cancellati||[]).length?' Già cancellati: '+j.cancellati.slice(-6).map(c=>c.giorno+' ('+(c.perche==='tetto'?'spazio pieno':'a mano')+')').join(', ')+'.':'');
const quasi=j.byte>=0.9*j.maxByte;$('pieno').hidden=!quasi;$('pieno').textContent=quasi?(j.byte>=j.maxByte?'Spazio PIENO: ':'Spazio quasi pieno: ')+'il registro non accetta più righe quando è pieno (restano in coda sui PC dello stand). Scarica i giorni che vuoi tenere e cancellali, oppure alza MAX_TOTALE_MB. Se lo spazio si riempie di giorni che non sono dello stand, qualcuno sta scrivendo righe finte: cancella quei giorni.':'';
msg(giorni.length?giorni.length+' giorni registrati.':'Ancora nessun giorno registrato.')}
async function elenco(){try{msg('Un momento…');mostra(await (await chiedi('/giorni')).json())}catch(e){msg('Non riuscito: '+e.message)}}
async function uno(g,b){b.disabled=true;try{msg('Scarico '+g+'…');const p=[];await pezzi(g,p);salva(p,'registro-'+g+'.jsonl.gz');msg('Scaricato registro-'+g+'.jsonl.gz')}catch(e){msg('Non riuscito: '+e.message)}b.disabled=false}
async function ripeti(p,method){for(let i=0;i<500;i++){const j=await (await chiedi(p,method)).json();mostra(j);if(j.finito!==false)break;msg('Ancora un momento…')}}
async function via(q,domanda,b){if(!confirm(domanda))return;b.disabled=true;try{await ripeti('/giorni?'+q,'DELETE');msg('Cancellato.')}catch(e){msg('Non riuscito: '+e.message)}b.disabled=false}
$('vai').onclick=elenco;$('k').onkeydown=e=>{if(e.key==='Enter')elenco()};
$('tutto').onclick=async()=>{const b=$('tutto');b.disabled=true;try{const p=[];for(const g of giorni){msg('Scarico '+g.giorno+'…');await pezzi(g.giorno,p)}salva(p,'registro-tutto.jsonl.gz');msg('Scaricato registro-tutto.jsonl.gz')}catch(e){msg('Non riuscito: '+e.message)}b.disabled=false};
$('ricalcola').onclick=async()=>{const b=$('ricalcola');b.disabled=true;try{msg('Ricalcolo…');await ripeti('/ricalcola','POST');msg('Spazio ricalcolato.')}catch(e){msg('Non riuscito: '+e.message)}b.disabled=false};
$('viatutto').onclick=()=>via('tutto=si','Cancellare TUTTO il registro? Non si può tornare indietro.',$('viatutto'));
</script></main></body></html>`;

export default {
  // adesso: solo per le prove (l'ora del momento)
  async fetch(request, env = {}, _ctx = null, adesso = null){
    const url = new URL(request.url), c = cors(request, env), L = LIMITI, now = Number.isFinite(adesso) ? adesso : Date.now();
    try {
      if (request.method === 'OPTIONS'){
        if (!c.ok) return new Response(null, { status: 403, headers: c.headers });
        return new Response(null, { status: 204, headers: { ...c.headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
      }
      const spazio = !!env.REGISTRO && typeof env.REGISTRO.put === 'function', chiave = clean(env.CHIAVE_LETTURA).length >= L.minChiave;
      // il gioco: solo aggiunte, solo all'indirizzo del Worker
      if (request.method === 'POST' && url.pathname === '/') return await scrivi(request, env, url, c, L, now);
      // l'utente, con la chiave: spazio e giorni, scarico, cancellazione, ricalcolo (mai intestazioni CORS: non è per
      // le pagine di altri siti)
      const azione = request.method === 'GET' && url.pathname === '/giorni' ? 'giorni' : request.method === 'GET' && url.pathname === '/scarica' ? 'scarica'
        : request.method === 'DELETE' && url.pathname === '/giorni' ? 'cancella' : request.method === 'POST' && url.pathname === '/ricalcola' ? 'ricalcola' : null;
      if (azione){
        const no = await conChiave(request, env, url, L, now); if (no) return no;
        if (!spazio) return reply(503, { ok: false, error: SENZA_SPAZIO });
        return azione === 'giorni' ? await giorni(env, now) : azione === 'scarica' ? await scarica(env, url, L) : azione === 'cancella' ? await cancella(env, url, L, now) : await ricalcola(env, L, now);
      }
      if (request.method !== 'GET') return reply(405, { ok: false, error: 'metodo non permesso' }, { Allow: 'GET, POST, OPTIONS' });
      if (url.pathname !== '/') return reply(404, { ok: false, error: 'indirizzo non previsto' });
      // la pagina per l'utente; a un programma (Accept senza text/html) solo lo stato. Mai dati senza la chiave
      // senza il collegamento al bucket il Worker non è pronto: lo dice chiaro e non accetta righe
      if (!/text\/html/i.test(request.headers.get('Accept') || '')) return spazio ? reply(200, { ok: true, registro: 'pronto', spazio, chiave, formato: FORMATO }, c.ok ? c.headers : {})
        : reply(503, { ok: false, registro: 'non pronto', spazio, chiave, formato: FORMATO, error: SENZA_SPAZIO }, c.ok ? c.headers : {});
      return new Response(PAGINA(spazio, chiave), { status: spazio ? 200 : 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' } });
    } catch { return reply(500, { ok: false, error: 'errore del Worker' }, c.ok ? c.headers : {}); }
  },
};
