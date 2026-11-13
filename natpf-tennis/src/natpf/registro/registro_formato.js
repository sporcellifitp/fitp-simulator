// Registro dello stand (B30, richiesta dell'utente del 12/11): formato delle righe, limiti e regole di riservatezza.
// Il registro è fatto di righe JSON Lines: una riga per fatto di gioco (partita, punto, colpo, servizio, tutorial,
// calibrazione, collegamento del telefono, errore…), scritte da sole per tutta la giornata. Solo gioco: niente dati di
// chi gioca. Le righe viaggiano a BLOCCHI (un blocco ogni 45 s e a fine partita): ogni blocco ha un identificativo
// (giorno, postazione, parte), va nella coda sul disco (registro_coda.js), poi allo spazio Cloudflare dell'utente
// (registro_invio.js → cloudflare/registro-worker.js) e, a invio confermato, si cancella dal PC.
// Funzioni pure (le provano i test): le usano il registratore, la coda, l'invio, lo strumento di riassunto
// (scripts/registro) e, con gli stessi numeri e gli stessi elenchi, il Worker (cloudflare/registro-worker.js, che deve
// restare un file solo da incollare) e il programma Windows (natpf-desktop/src/registro.mjs): i test controllano che le
// copie siano uguali.
//
// Ogni riga: { k: tipo, t: ms dall'avvio del registro (intero), n: numero della partita (se c'è), …campi }.
// Tipi (k): TIPI qui sotto. Campi: solo quelli di CAMPI (tutto il resto si scarta, nel gioco e di nuovo nel Worker).
//
// RISERVATEZZA. Nel registro non entra mai:
//   - il nome scritto da chi gioca (al più «nomeInserito: true/false»);
//   - video, audio, immagini della webcam, campioni grezzi dei sensori;
//   - indirizzi di rete, indirizzi delle pagine con i codici del collegamento, e-mail;
//   - identificativi stabili del telefono o del computer (al più «Android 14 · Chrome 126»).
// Tre difese, tutte provate: (1) il registratore scrive solo campi scelti a mano; (2) ogni riga passa da pulisci(),
// che tiene solo i campi previsti (CAMPI), toglie quelli vietati, accorcia i testi, copre indirizzi ed e-mail e, nei
// testi liberi (testo e file degli errori JavaScript, voci degli elenchi di conti), i nomi scritti da chi gioca in
// tutta la giornata (anche una parola sola di un nome e cognome, anche senza accenti) e ogni testo tra virgolette dei
// messaggi d'errore (lì finirebbe una chiave della classifica, che è un nome); (3) il Worker rifà lo stesso controllo
// prima di scrivere.
// controllaRiga() è il controllo dei test: dice cosa non va in una riga.

const MB = 1024*1024;
export const REGISTRO = Object.freeze({
  versione: 1,
  chiave: 'natpf-tennis.registro',          // scelta dello staff (Sì/No) e contatori della giornata, nel browser
  config: '/natpf/registro.json',           // {"url": "https://…workers.dev/"}: indirizzo del Worker (pacchetto)
  maxRiga: 2000,                            // caratteri per riga: oltre, la riga si accorcia ai campi essenziali
  maxTesto: 80,                             // caratteri per un testo qualunque; maxMessaggio per il testo di un errore
  maxMessaggio: 200,
  maxBlocco: 256*1024,                      // byte di un blocco di righe (il Worker rifiuta i blocchi più grandi)
  maxCoda: 200*MB,                          // coda non ancora inviata sul PC: oltre, si scartano i blocchi più vecchi
  bloccoMs: 45000,                          // ogni quanto le righe in memoria diventano un blocco (e a fine partita)
  maxErrori: 40,                            // errori diversi al giorno; lo stesso errore si conta, non si ripete
  attesaMs: 15000,                          // tempo massimo per un invio
  riprovaMs: 30000,                         // dopo un invio fallito si riprova dopo 30 s, poi il doppio, fino a…
  riprovaMaxMs: 600000,                     // …10 minuti
});
// tipi di riga: «crash» la scrive il programma Windows (pagina del gioco chiusa di colpo), «nota» i limiti
export const TIPI = Object.freeze(['avvio', 'chiusura', 'partita', 'partita.fine', 'punto', 'colpo', 'servizio', 'vuoto', 'tutorial', 'calibrazione', 'allenamento',
  'minigioco', 'visita', 'tel', 'errore', 'crash', 'nota']);
// campi previsti, a ogni livello (docs/b30/registro-dello-stand.md dice cosa vuol dire ognuno)
export const CAMPI = Object.freeze(['k', 't', 'n', 'v', 'ora', 'fuso', 'g', 'versione', 'dove', 'motivo', 'schermo', 'area', 'dpr', 'cpu', 'gpu', 'gpuTipo', 'pagina', 'chiosco', 'prima',
  'primaInPartita', 'modo', 'chi', 'livello', 'ruolo', 'formato', 'game', 'fiera', 'batte', 'personaggi', 'ctrl', 'mano', 'mano2', 'segnale', 'nomeInserito', 'nomeInserito2', 'stand',
  'mira', 'caldo', 'lancioAuto', 'campoAperto', 'fasce', 'aiuto', 'ek', 'tel', 'tel2', 'strada', 'rtt', 'so', 'browser', 'p', 'vince', 'fine', 'ultimo', 'colpi', 'colpi2', 'durS',
  'attesaS', 'pt', 'lanci', 'lanciVuoti', 'battutaAuto', 'esito', 'come', 'punti', 'puntiVinti', 'fps', 'medi', 'peggiori', 'maxMs', 'lunghi', 'cadute', 'riprese', 'rttMax', 'errori',
  'scartati', 'amb', 'gesto', 'voluto', 'ms', 'voto', 'f', 'd', 'e', 'x', 'z', 'sup', 'supNo', 'volee', 'rete', 'lato', 'fonte', 'causa', 'aiutato', 'tipo', 'q', 'kmh', 'auto', 'perche',
  'serie', 'schede', 'viste', 'tutte', 'chiusura', 'finita', 'prove', 'fallite', 'passi', 'ripartenze', 'revisioni', 'revisioniNo', 'semplice', 'finito', 'saltato', 'perfetti', 'gioco',
  'partite', 'posti', 'abbandono', 'stato', 'dopoS', 'inPartita', 'msg', 'file', 'riga', 'col', 'volte', 'tagliata', 'perse', 'costoMs', 'costoMax', 'registro', 'in']);
// campi che sono un elenco «voce: quante volte» (motivi dei gesti scartati, posti della visita, passi della
// calibrazione): le voci le decide il gioco, i valori sono solo numeri (o un elenco di numeri)
export const MAPPE = Object.freeze(['scartati', 'posti', 'passi', 'perche']);

/* ---------- giorni e file ---------- */
const p2 = v => String(v).padStart(2, '0');
// giorno del computer (ora locale: la giornata dello stand), 'AAAA-MM-GG'
export const giornoDi = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
// identificativo di un blocco: «giorno_postazione_parte». postazione: l'identificativo casuale della giornata (8
// caratteri, cambia ogni giorno, non dice niente del computer); parte: numero d'ordine nella giornata più 4 caratteri a
// caso (due blocchi non hanno mai lo stesso nome, anche se il contatore riparte). In ordine alfabetico = in ordine di tempo
const ALFABETO = 'abcdefghijkmnpqrstuvwxyz23456789';
const casuale = (n, rnd = Math.random) => Array.from({ length: n }, () => ALFABETO[Math.floor(rnd()*ALFABETO.length) % ALFABETO.length]).join('');
export const BLOCCO_RE = /^(\d{4}-\d{2}-\d{2})_([a-z0-9]{8})_(\d{5,7}-[a-z0-9]{4})$/;
export const idBlocco = (giorno, postazione, seq, rnd = Math.random) => `${giorno}_${postazione}_${String(Math.max(0, seq | 0)).padStart(5, '0')}-${casuale(4, rnd)}`;
export function leggiIdBlocco(id){
  const m = BLOCCO_RE.exec(String(id || ''));
  return m ? { giorno: m[1], postazione: m[2], parte: m[3] } : null;
}
export const nomeBlocco = id => `${id}.jsonl`;
// identificativo casuale della giornata (non dice niente del computer né di chi gioca)
export const idGiornata = (rnd = Math.random) => casuale(8, rnd);

/* ---------- acceso o spento ---------- */
// Di base: SEMPRE Sì, in tutte le versioni (decisione dell'utente del 12/11: «vorrei avere questa modalità di default
// sempre attiva»). Lo staff lo può spegnere dal pannello dello stand: la scelta resta salvata.
export const registroDiBase = () => true;
export function leggiScelta(storage = globalThis.localStorage){
  try { const v = JSON.parse(storage?.getItem(REGISTRO.chiave) || '{}'); return v.acceso === true || v.acceso === false ? v.acceso : null; } catch { return null; }
}
function leggiTutto(storage){ try { return JSON.parse(storage?.getItem(REGISTRO.chiave) || '{}') || {}; } catch { return {}; } }
export function scriviScelta(acceso, storage = globalThis.localStorage){
  try { storage?.setItem(REGISTRO.chiave, JSON.stringify({ ...leggiTutto(storage), acceso: acceso == null ? undefined : !!acceso })); } catch {}
  return acceso;
}
export const registroAcceso = ({ storage = globalThis.localStorage } = {}) => leggiScelta(storage) ?? registroDiBase();
// giornata corrente: { giorno, g: identificativo casuale, n: partite contate, b: blocchi fatti } (riparte a ogni giorno nuovo)
export function leggiGiornata(giorno, storage = globalThis.localStorage, rnd = Math.random){
  const all = leggiTutto(storage), cur = all.giornata;
  if (cur && cur.giorno === giorno && /^[a-z0-9]{8}$/.test(cur.g || '')) return { giorno, g: cur.g, n: Number.isInteger(cur.n) ? cur.n : 0, b: Number.isInteger(cur.b) ? cur.b : 0, aperta: cur.aperta ?? null };
  return { giorno, g: idGiornata(rnd), n: 0, b: 0, aperta: null };
}
export function scriviGiornata(giornata, storage = globalThis.localStorage){
  try { storage?.setItem(REGISTRO.chiave, JSON.stringify({ ...leggiTutto(storage), giornata })); } catch {}
}

/* ---------- dispositivo e collegamento, a grandi linee ---------- */
// telefono: solo sistema e browser con la versione principale (niente modello, niente identificativi)
export function dispositivo(ua){
  const s = String(ua || '');
  if (!s) return null;
  let so = 'altro';
  const a = /Android (\d+)/.exec(s), i = /(?:iPhone|iPad|iPod).*? OS (\d+)/.exec(s);
  if (a) so = `Android ${a[1]}`; else if (i) so = `${/iPad/.test(s) ? 'iPad' : 'iPhone'} iOS ${i[1]}`; else if (/Windows/.test(s)) so = 'Windows'; else if (/Mac OS X/.test(s)) so = 'Mac'; else if (/Linux/.test(s)) so = 'Linux';
  let browser = 'altro';
  for (const [re, name] of [[/SamsungBrowser\/(\d+)/, 'Samsung'], [/EdgA?\/(\d+)/, 'Edge'], [/OPR\/(\d+)/, 'Opera'], [/Firefox\/(\d+)/, 'Firefox'], [/FxiOS\/(\d+)/, 'Firefox'], [/CriOS\/(\d+)/, 'Chrome'], [/Chrome\/(\d+)/, 'Chrome'], [/Version\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari/, 'Safari']]){
    const m = re.exec(s); if (m){ browser = `${name} ${m[1]}`; break; }
  }
  return { so, browser };
}
// strada del collegamento del telefono: 'lan' (stessa rete, diretto), 'relay' (passa da un server TURN), 'internet'
// (diretto ma non nella stessa rete). Nessun indirizzo: solo il tipo
export function strada(route, transport = null){
  if (!route) return transport === 'lan-webrtc' ? 'lan' : null;
  if (route.turn || route.locale === 'relay' || route.remoto === 'relay') return 'relay';
  if (route.locale === 'host' && route.remoto === 'host') return 'lan';
  return transport === 'lan-webrtc' ? 'lan' : 'internet';
}
// scheda grafica: c'è (vera) o il disegno è fatto dal processore (SwiftShader, llvmpipe, Basic Render)
export const gpuVera = name => !!name && !/swiftshader|llvmpipe|software|basic render|softpipe/i.test(String(name));
// nome corto della scheda (è del computer dello stand, non di chi gioca)
// (ANGLE (…) con parentesi annidate, revisione: «ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), …)»)
export function gpuNome(name){
  let s = String(name || '').trim();
  if (/^ANGLE \(.*\)$/.test(s)) s = s.slice(7, -1);
  s = s.replace(/\s*Direct3D.*$/i, '').replace(/\s*\(0x[0-9a-f]+\)/gi, '').slice(0, 60);
  // parentesi che restano aperte (nome tagliato): via da quella aperta in poi; virgole in fondo: via
  let d = 0, aperta = -1; for (let i = 0; i < s.length; i++){ if (s[i] === '('){ if (!d) aperta = i; d++; } else if (s[i] === ')' && d) d--; }
  if (d && aperta >= 0) s = s.slice(0, aperta);
  return s.replace(/[\s,]+$/, '').trim() || null;
}

/* ---------- come finisce un punto ---------- */
// Dal motivo del motore (game_engine._awardPoint: «Net», «Out», «Nice Shot!», «Point») e da chi ha colpito per ultimo.
// Il gioco ha una palla sola di servizio: il servizio in rete o fuori dà il punto (vale come un doppio fallo).
//   servizio.rete · servizio.fuori · ace · rete · fuori · vincente (due rimbalzi, palla non raggiunta) ·
//   a vuoto (ha provato e non l'ha presa) · passata (palla passata senza gesto) · altro
export function finePunto({ motivo = '', colpi = 0, vuoto = false } = {}){
  const m = String(motivo || '').toLowerCase(), servizio = colpi <= 1;
  if (m === 'net') return servizio ? 'servizio.rete' : 'rete';
  if (m === 'out') return servizio ? 'servizio.fuori' : 'fuori';
  if (vuoto) return 'a vuoto';
  if (m === 'nice shot!') return servizio ? 'ace' : 'vincente';
  if (m === 'point') return servizio ? 'ace' : 'passata';
  return 'altro';
}
export const FINI = Object.freeze(['servizio.rete', 'servizio.fuori', 'ace', 'rete', 'fuori', 'vincente', 'a vuoto', 'passata', 'altro']);
// chi ha fatto l'errore (o il vincente) rispetto a chi vince il punto: errore di chi perde, oppure vincente di chi vince
export const eErrore = fine => ['servizio.rete', 'servizio.fuori', 'rete', 'fuori'].includes(fine);

/* ---------- riservatezza ---------- */
// campi che non devono mai comparire in una riga, a nessun livello (minuscolo, senza trattini)
export const CAMPI_VIETATI = Object.freeze(['nome', 'name', 'nick', 'nickname', 'giocatore', 'player', 'ip', 'indirizzo', 'address', 'host', 'ua', 'useragent', 'token', 'sessione',
  'session', 'stanza', 'room', 'roomid', 'id', 'deviceid', 'telefonoid', 'video', 'audio', 'immagine', 'foto', 'frame', 'campioni', 'sensori', 'rot', 'acc', 'accg', 'email', 'mail',
  'server', 'url', 'href', 'qr', 'codice', 'profilo', 'label', 'nota']);
const VIETATI = new Set(CAMPI_VIETATI);
const chiaveNorm = k => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
const IP_RE = /\b\d{1,3}(?:\.\d{1,3}){3}\b(?::\d+)?/g, IP6_RE = /\b(?:[0-9a-f]{1,4}:){3,7}[0-9a-f]{1,4}\b/gi;
const MAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, URL_RE = /\b(?:https?|wss?|file|blob):\/\/[^\s'")]+/gi;
/* nomi: si confrontano senza maiuscole e senza accenti, a parola intera ('Ste' non tocca «stesso-schermo») */
const SEGNI = /[\u0300-\u036f]/g, LETTERA = /[\p{L}\p{N}]/u;
const piano = ch => { const b = ch.normalize('NFD').replace(SEGNI, '').toLowerCase(); return b.length === 1 ? b : ch.toLowerCase(); };
// pezzi da coprire di ogni nome: il nome intero (almeno 2 lettere) e ogni sua parola di almeno 3 lettere
export function pezziDeiNomi(nomi = []){
  const out = new Set();
  for (const n of nomi){
    const v = String(n || '').trim().replace(/\s+/g, ' '); if (v.length < 2) continue;
    out.add([...v].map(piano).join(''));
    for (const w of v.split(/[^\p{L}\p{N}]+/u)) if ([...w].length >= 3) out.add([...w].map(piano).join(''));
  }
  return [...out].map(t => [...t]).sort((a, b) => b.length - a.length);
}
// copre con «[nome]» ogni pezzo di nome che compare a parola intera
export function copriNomi(testo, nomi = []){
  const pezzi = pezziDeiNomi(nomi); if (!pezzi.length) return testo;
  const chars = [...testo], flat = chars.map(piano), preso = new Array(chars.length).fill(0);
  const lettera = i => i >= 0 && i < flat.length && LETTERA.test(flat[i]);
  for (const p of pezzi){
    for (let i = 0; i + p.length <= flat.length; i++){
      if (preso[i] || lettera(i - 1) || lettera(i + p.length)) continue;
      let ok = true; for (let j = 0; j < p.length; j++) if (flat[i + j] !== p[j] || preso[i + j]){ ok = false; break; }
      if (!ok) continue;
      preso[i] = p.length; for (let j = 1; j < p.length; j++) preso[i + j] = -1;
      i += p.length - 1;
    }
  }
  let out = '';
  for (let i = 0; i < chars.length; i++){ if (preso[i] > 0){ out += '[nome]'; i += preso[i] - 1; } else out += chars[i]; }
  return out;
}
// testi tra virgolette di un messaggio d'errore: via (lì il motore mette le chiavi, e una chiave può essere un nome)
const VIRGOLETTE_RE = /'[^'\n]{1,120}'|"[^"\n]{1,120}"|`[^`\n]{1,120}`|«[^»\n]{1,120}»|“[^”\n]{1,120}”|‘[^’\n]{1,120}’/g;
// Testo: senza indirizzi, e-mail, pagine con codici; accorciato. Nei testi liberi (nomi: i nomi della giornata) anche
// senza i nomi di chi gioca; virgolette: anche senza i testi tra virgolette (messaggi d'errore).
// Il testo si taglia PRIMA delle espressioni (revisione: l'espressione delle e-mail costa in modo quadratico su una
// parola lunga senza «@»: 40.000 caratteri = 1 s fermo nel gioco, dentro l'ascolto degli errori)
export function pulisciTesto(s, { nomi = [], max = REGISTRO.maxTesto, virgolette = false } = {}){
  let out = String(s ?? '').slice(0, 2*max).replace(/[\u0000-\u001f\u007f]+/g, ' ');
  // di una pagina resta solo il nome del file (senza dominio, senza ?codici)
  out = out.replace(URL_RE, u => { const f = u.replace(/[?#].*$/, '').split('/').filter(Boolean).pop() || ''; return /\.[a-z0-9]{1,5}$/i.test(f) ? f : '[pagina]'; });
  out = out.replace(MAIL_RE, '[e-mail]').replace(IP_RE, '[indirizzo]').replace(IP6_RE, '[indirizzo]');
  if (virgolette) out = out.replace(VIRGOLETTE_RE, '[testo]');
  if (nomi.length) out = copriNomi(out, nomi);
  return out.length > max ? out.slice(0, max - 1) + '…' : out;
}
// una riga pronta da scrivere: restano solo i campi previsti (CAMPI) e non vietati, a ogni livello; via i valori non
// semplici e quelli vuoti; testi puliti e accorciati (msg: testo di un errore, più lungo); numeri finiti. Dentro un
// elenco «voce: quante volte» (MAPPE) le voci sono libere ma pulite, i valori solo numeri. nomi: i nomi scritti da chi
// gioca nella giornata, coperti nei testi liberi (msg, file, voci delle MAPPE): gli altri campi hanno valori fissi
// del gioco (un soprannome «Ace» non deve cambiare la fine di un punto «ace»). null se non è una riga del registro.
// (La stessa funzione, senza i nomi, è copiata nel Worker.)
const PREVISTI = new Set(CAMPI), LIBERE = new Set(MAPPE), TESTI_LIBERI = new Set(['msg', 'file']);
export function pulisci(row, { nomi = [] } = {}){
  const testo = (v, key) => (key === 'msg' ? pulisciTesto(v, { nomi, max: REGISTRO.maxMessaggio, virgolette: true }) : pulisciTesto(v, { nomi: TESTI_LIBERI.has(key) ? nomi : [], max: REGISTRO.maxTesto }));
  const walk = (v, key, depth, mappa) => {
    if (v == null) return undefined;
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (mappa && !Array.isArray(v)) return undefined;                           // in un elenco di conti: solo numeri
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return testo(v, key);
    if (Array.isArray(v)) return depth > 3 ? undefined : v.slice(0, 16).map(x => (typeof x === 'object' && x !== null ? undefined : walk(x, key, depth + 1, mappa))).map(x => (x === undefined ? null : x));
    if (typeof v === 'object'){
      if (depth > 3) return undefined;
      const libera = LIBERE.has(key), out = {}; let n = 0;
      for (const [k, x] of Object.entries(v)){
        if (n >= 40 || VIETATI.has(chiaveNorm(k)) || (!libera && !PREVISTI.has(k))) continue;
        const y = walk(x, k, depth + 1, libera);
        if (y !== undefined){ out[libera ? pulisciTesto(k, { nomi, max: 60 }) : k] = y; n++; }
      }
      return out;
    }
    return undefined;
  };
  if (!row || typeof row !== 'object' || Array.isArray(row) || !TIPI.includes(row.k) || !Number.isInteger(row.t) || row.t < 0) return null;
  return walk(row, '', 0, false);
}
// controllo dei test (e dello strumento di riassunto): cosa non va in una riga del registro. [] = a posto
// I nomi si cercano come in pulisci: a parola intera, senza maiuscole né accenti, anche una parola sola del nome.
export function controllaRiga(row, { nomi = [] } = {}){
  const bad = [], pezzi = pezziDeiNomi(nomi);
  if (!row || typeof row !== 'object'){ return ['non è un oggetto']; }
  if (!TIPI.includes(row.k)) bad.push('tipo (k) non previsto');
  if (!Number.isInteger(row.t) || row.t < 0) bad.push('manca il tempo (t)');
  const walk = (v, path) => {
    if (typeof v === 'string'){
      const max = path.endsWith('.msg') ? REGISTRO.maxMessaggio : REGISTRO.maxTesto;
      if (v.length > max) bad.push(`${path}: testo troppo lungo`);
      if (v.match(IP_RE) || v.match(IP6_RE)) bad.push(`${path}: indirizzo di rete`);
      if (v.match(MAIL_RE)) bad.push(`${path}: e-mail`);
      if (/\b(?:https?|wss?):\/\//i.test(v)) bad.push(`${path}: indirizzo di una pagina`);
      if (pezzi.length && copriNomi(v, nomi) !== v) bad.push(`${path}: nome di chi gioca`);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)){
      const libera = LIBERE.has(path.split('.').pop());
      if (VIETATI.has(chiaveNorm(k))) bad.push(`${path}.${k}: campo vietato`);
      else if (!libera && !PREVISTI.has(k)) bad.push(`${path}.${k}: campo non previsto`);
      if (libera && !(typeof x === 'number' || (Array.isArray(x) && x.every(y => typeof y === 'number' || y === null)))) bad.push(`${path}.${k}: in un elenco di conti solo numeri`);
      if (pezzi.length && copriNomi(k, nomi) !== k) bad.push(`${path}.${k}: nome di chi gioca`);
      walk(x, `${path}.${k}`);
    }
  };
  walk(row, 'riga');
  if (JSON.stringify(row).length > REGISTRO.maxRiga) bad.push('riga troppo lunga');
  return bad;
}
// riga di testo (senza l'a capo). Oltre maxRiga restano tipo, tempo, partita e il segno «tagliata»
export function testoRiga(row){
  let s; try { s = JSON.stringify(row); } catch { return null; }
  if (s.length <= REGISTRO.maxRiga) return s;
  return JSON.stringify({ k: row.k, t: row.t, ...(row.n != null ? { n: row.n } : {}), tagliata: s.length });
}
// la riga è l'inizio di una partita? (k è sempre il primo campo: si contano le partite senza leggere il JSON)
export const rigaDiPartita = line => typeof line === 'string' && line.startsWith('{"k":"partita",');

/* ---------- indirizzo del Worker ---------- */
// dal file /natpf/registro.json del pacchetto ({"url": "https://…"}): solo https (http su localhost per le prove),
// senza utente né password. null se manca o non va bene: il registro resta nella coda sul disco
export function indirizzoRegistro(conf){
  let u; try { u = new URL(String(conf?.url || '')); } catch { return null; }
  const locale = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(u.hostname);
  if (!(u.protocol === 'https:' || (u.protocol === 'http:' && locale)) || u.username || u.password) return null;
  u.search = ''; u.hash = '';
  return u.href;
}
// indirizzo per mandare un blocco: i tre pezzi dell'identificativo come parametri (il corpo è il testo delle righe)
export function indirizzoBlocco(base, id){
  const b = leggiIdBlocco(id); if (!b || !base) return null;
  const u = new URL(base); u.search = new URLSearchParams({ giorno: b.giorno, postazione: b.postazione, parte: b.parte }).toString();
  return u.href;
}

/* ---------- numeri corti ---------- */
export const r = (v, d = 2) => (Number.isFinite(v) ? +(+v).toFixed(d) : null);
export const byteLeggibili = b => (b >= 1024*MB ? `${(b/(1024*MB)).toFixed(1)} GB` : b >= MB ? `${(b/MB).toFixed(1)} MB` : b >= 1024 ? `${Math.round(b/1024)} kB` : `${Math.max(0, Math.round(b || 0))} byte`);
