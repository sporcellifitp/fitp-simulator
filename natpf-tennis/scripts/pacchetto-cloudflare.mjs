// Cartella da caricare sul Worker Cloudflare del gioco (file statici, senza wrangler): il contenuto di natpf-tennis/dist,
// le intestazioni di site/_headers e, con --turn-url, la configurazione del TURN nostro in natpf/turn.json.
// La pagina del gioco (alla radice) e la pagina del telefono (/natpf/tennis/racchetta.html) la cercano entrambe con
// lo stesso percorso assoluto /natpf/turn.json (site/js/tennis/ice-route.js): senza il file tutto resta come prima.
// Il Worker delle credenziali è un altro, piccolo: natpf-tennis/cloudflare/turn-worker.js (lì le istruzioni).
// B30 (12/11): con --registro-url anche natpf/registro.json, l'indirizzo del Worker del registro dello stand
// (cloudflare/registro-worker.js, docs/GUIDA_REGISTRO_CLOUDFLARE.md): il gioco manda lì le righe di gioco. Senza, il
// registro resta nella coda sul computer e il pannello dello stand lo dice. Mai la chiave segreta: sta solo nel Worker.
//
//   cd natpf-tennis && npm run build
//   node scripts/pacchetto-cloudflare.mjs --out=../pacchetto [--zip=../pacchetto.zip] [--turn-url=https://<nome>.<account>.workers.dev/]
//                                         [--registro-url=https://<nome-registro>.<account>.workers.dev/]
//
// Gli argomenti si scrivono solo come --nome=valore (con «=»): ogni altra forma è un errore (parseArgs).
// La cartella di destinazione deve essere nuova o vuota: niente file vecchi mescolati a quelli nuovi.
// B8 (04/11), richiesta dell'utente: «la versione cloudflare deve sempre pesare leggermente meno di 25 MB».
// Con --zip lo zip lo fa questo script (il contenuto della cartella, non la cartella; deterministico, vedi
// zip-deterministico.mjs) e controlla il peso: da ZIP_LIMIT in su cancella lo zip, elenca i 10 file più pesanti
// e termina con errore; sopra ZIP_WARN avvisa che il margine è poco. Con --zip e senza --out la cartella è temporanea.
// La CI (.github/workflows/natpf-tennis.yml) lo esegue dopo la build: un pacchetto troppo pesante la fa fallire.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeZip } from './zip-deterministico.mjs';
import { MEDIAPIPE_EXCLUDED } from './offline-assets.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const TURN_JSON = 'natpf/turn.json';
export const REGISTRO_JSON = 'natpf/registro.json';
// byte dello zip: deve restare sotto ZIP_LIMIT (25 MB decimali), sopra ZIP_WARN si avvisa
export const ZIP_LIMIT = 25_000_000;
export const ZIP_WARN = 24_000_000;
export const mb = bytes => `${(bytes / 1e6).toFixed(2)} MB`;

// indirizzo del Worker: solo https (o http su localhost, per le prove nel browser), con la «/» finale
export function checkTurnUrl(raw){
  let u; try { u = new URL(String(raw || '')); } catch { throw new Error(`--turn-url non è un indirizzo: ${raw}`); }
  const local = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(u.hostname);
  if (!(u.protocol === 'https:' || (u.protocol === 'http:' && local))) throw new Error(`--turn-url deve essere https: ${raw}`);
  if (u.username || u.password) throw new Error('--turn-url senza utente o password: i segreti stanno nelle variabili del Worker');
  return u.href;
}
// indirizzo del Worker del registro: stesse regole, e senza parametri (la chiave segreta non ci deve mai finire)
export function checkRegistroUrl(raw){
  let u; try { u = new URL(String(raw || '')); } catch { throw new Error(`--registro-url non è un indirizzo: ${raw}`); }
  const local = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(u.hostname);
  if (!(u.protocol === 'https:' || (u.protocol === 'http:' && local))) throw new Error(`--registro-url deve essere https: ${raw}`);
  if (u.username || u.password) throw new Error('--registro-url senza utente o password: la chiave segreta sta solo nelle variabili del Worker');
  if (u.search || u.hash) throw new Error('--registro-url senza «?…» né «#…»: solo l\'indirizzo del Worker (la chiave segreta non va mai nel pacchetto)');
  return u.href;
}

// _headers di Cloudflare: blocchi «percorso» + righe indentate «Nome: valore». Il json deve restare leggibile da fetch
// (niente Content-Type diverso da JSON) e le due pagine devono poter chiamare il Worker (niente Content-Security-Policy
// con un connect-src che non lo comprende). Oggi site/_headers ha solo X-Robots-Tag, nosniff e Referrer-Policy: va bene
// B21 (11/11): il trailer dell'intro NON sta nel pacchetto (2,26 MB, il margine sotto i 25 MB è poco): la pagina del gioco
// lo scarica dal bucket pubblico R2 (natpf-desktop/aggiornamenti.json, src/natpf/natpf_intro.js). Quindi: nessun file
// trailer-<impronta>.mp4 nel pacchetto (TRAILER_FILE), e una Content-Security-Policy sulle pagine del gioco, se mai ci
// fosse, deve permettere i video da quel bucket (media-src, o default-src se media-src non c'è): mediaUrl
// (B27: anche la pagina del telecomando dello staff, che usa la stessa segnalazione e le stesse credenziali TURN)
export const PAGES = ['/', '/index.html', '/natpf/tennis/racchetta.html', '/natpf/tennis/telecomando.html'];
export const GAME_PAGES = ['/', '/index.html'];
export const TRAILER_FILE = /(^|\/)trailer-[0-9a-f]{12}\.mp4$/;
// origine del bucket pubblico dei video (null se il file non c'è o non ha un indirizzo)
export function mediaOrigin(file = path.resolve(ROOT, '../natpf-desktop/aggiornamenti.json')){
  try { return new URL(JSON.parse(fs.readFileSync(file, 'utf8')).base).origin; } catch { return null; }
}
export function headersProblems(text, { turnUrl = null, mediaUrl = null, registroUrl = null } = {}){
  const rules = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)){
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)){ cur = { re: new RegExp('^' + line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'), headers: [] }; rules.push(cur); continue; }
    const m = /^\s+([^:]+):\s*(.*)$/.exec(line);
    if (m && cur) cur.headers.push([m[1].trim().toLowerCase(), m[2].trim()]);
  }
  const on = file => rules.filter(r => r.re.test(file)).flatMap(r => r.headers);
  const out = [];
  for (const [name, value] of on('/' + TURN_JSON)) if (name === 'content-type' && !/json/i.test(value)) out.push(`/${TURN_JSON} con Content-Type ${value}`);
  const origin = turnUrl ? new URL(turnUrl).origin : null;
  for (const page of PAGES) for (const [name, value] of on(page)){
    if (name !== 'content-security-policy') continue;
    const connect = /(?:^|;)\s*connect-src([^;]*)/i.exec(value)?.[1] ?? /(?:^|;)\s*default-src([^;]*)/i.exec(value)?.[1];
    if (connect != null && !/(^|\s)\*(\s|$)/.test(connect) && !/'self'/.test(connect)) out.push(`${page}: Content-Security-Policy senza 'self' per leggere /${TURN_JSON}`);
    if (connect != null && origin && !connect.includes(origin) && !/(^|\s)(\*|https:)(\s|$)/.test(connect)) out.push(`${page}: Content-Security-Policy che non permette ${origin}`);
  }
  // B30: la pagina del gioco deve poter leggere natpf/registro.json e chiamare il Worker del registro
  const regOrigin = registroUrl ? new URL(registroUrl).origin : null;
  if (regOrigin){
    for (const [name, value] of on('/' + REGISTRO_JSON)) if (name === 'content-type' && !/json/i.test(value)) out.push(`/${REGISTRO_JSON} con Content-Type ${value}`);
    for (const page of GAME_PAGES) for (const [name, value] of on(page)){
      if (name !== 'content-security-policy') continue;
      const connect = /(?:^|;)\s*connect-src([^;]*)/i.exec(value)?.[1] ?? /(?:^|;)\s*default-src([^;]*)/i.exec(value)?.[1];
      if (connect != null && !connect.includes(regOrigin) && !/(^|\s)(\*|https:)(\s|$)/.test(connect)) out.push(`${page}: Content-Security-Policy che non permette il registro dello stand su ${regOrigin}`);
    }
  }
  const mediaOrig = mediaUrl ? new URL(mediaUrl).origin : null;
  if (mediaOrig) for (const page of GAME_PAGES) for (const [name, value] of on(page)){
    if (name !== 'content-security-policy') continue;
    const media = /(?:^|;)\s*media-src([^;]*)/i.exec(value)?.[1] ?? /(?:^|;)\s*default-src([^;]*)/i.exec(value)?.[1];
    if (media != null && !media.includes(mediaOrig) && !/(^|\s)(\*|https:)(\s|$)/.test(media)) out.push(`${page}: Content-Security-Policy che non permette il video dell'intro da ${mediaOrig} (media-src)`);
  }
  return out;
}

// La destinazione è già stata creata e verificata vuota. Node 24 rifiuta anche una directory vuota
// con errorOnExist: copiare i figli conserva il controllo contro sovrascritture su tutte le versioni.
const copyDir = (from, to) => {
  for (const name of fs.readdirSync(from)) fs.cpSync(path.join(from, name), path.join(to, name), { recursive: true, errorOnExist: true, force: false });
};

export function makePackage({ out, turnUrl = null, registroUrl = null, dist = path.join(ROOT, 'dist'), headers = path.resolve(ROOT, '../site/_headers'), media = mediaOrigin() } = {}){
  if (!out) throw new Error('manca --out=cartella');
  const dest = path.resolve(out);
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error(`build mancante: ${dist}/index.html (prima npm run build)`);
  const rel = path.relative(dist, dest);
  if (!rel || (!rel.startsWith('..') && !path.isAbsolute(rel))) throw new Error('la cartella di destinazione non può stare dentro dist');
  if (fs.existsSync(dest) && fs.readdirSync(dest).length) throw new Error(`la cartella ${dest} non è vuota`);
  // MediaPipe senza SIMD o .data vuoti: build fatta prima del B8 (offline-assets.mjs ora non li copia più)
  const stale = fs.existsSync(path.join(dist, 'assets/mediapipe')) ? listFiles(path.join(dist, 'assets/mediapipe')).filter(f => MEDIAPIPE_EXCLUDED.test(f)) : [];
  if (stale.length) throw new Error(`build vecchia, con file MediaPipe che il pacchetto non porta più (${stale.join(', ')}): rifare npm run build`);
  const url = turnUrl ? checkTurnUrl(turnUrl) : null;
  const regUrl = registroUrl ? checkRegistroUrl(registroUrl) : null;
  const headersText = fs.readFileSync(headers, 'utf8');
  const problems = headersProblems(headersText, { turnUrl: url, mediaUrl: media, registroUrl: regUrl });
  if (problems.length) throw new Error(`_headers impedirebbe di usare il TURN nostro, il video dell'intro o il registro dello stand: ${problems.join(' · ')}`);
  // il trailer dell'intro si scarica dal bucket R2: nel pacchetto farebbe sforare i 25 MB
  const trailers = listFiles(dist).filter(f => TRAILER_FILE.test(f));
  if (trailers.length) throw new Error(`il trailer dell'intro non deve stare nel pacchetto Cloudflare (${trailers.join(', ')}): va in natpf-desktop/media, non in natpf-tennis/public`);
  fs.mkdirSync(dest, { recursive: true });
  copyDir(dist, dest);
  fs.writeFileSync(path.join(dest, '_headers'), headersText);
  if (url){
    fs.mkdirSync(path.join(dest, 'natpf'), { recursive: true });
    fs.writeFileSync(path.join(dest, TURN_JSON), JSON.stringify({ url }, null, 2) + '\n');
  } else if (fs.existsSync(path.join(dest, TURN_JSON))) fs.rmSync(path.join(dest, TURN_JSON));
  // registro dello stand: solo l'indirizzo del Worker; senza --registro-url nessun file (mai uno rimasto da una build)
  if (regUrl){
    fs.mkdirSync(path.join(dest, 'natpf'), { recursive: true });
    fs.writeFileSync(path.join(dest, REGISTRO_JSON), JSON.stringify({ url: regUrl }, null, 2) + '\n');
  } else if (fs.existsSync(path.join(dest, REGISTRO_JSON))) fs.rmSync(path.join(dest, REGISTRO_JSON));
  return { dest, turnUrl: url, registroUrl: regUrl, files: listFiles(dest) };
}
export function listFiles(dir, base = dir){
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? listFiles(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name)).split(path.sep).join('/')]).sort();
}

// lo zip deve essere nuovo e fuori dalla cartella del pacchetto (controllato anche prima di fare il pacchetto)
export function checkZipTarget({ dir, zip }){
  if (!zip) throw new Error('manca --zip=file');
  const target = path.resolve(zip);
  if (dir){
    const rel = path.relative(path.resolve(dir), target);
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) throw new Error('lo zip non può stare dentro la cartella del pacchetto');
  }
  if (fs.existsSync(target)) throw new Error(`lo zip ${target} esiste già`);
  return target;
}
// Zip della cartella del pacchetto con il controllo del peso. Lo zip si scrive in «<zip>.part» e prende il suo nome
// solo se sta sotto maxBytes; altrimenti non resta nessun file e l'errore porta i 10 file più pesanti (err.largest).
export function makeZip({ dir, zip, maxBytes = ZIP_LIMIT, warnBytes = ZIP_WARN } = {}){
  if (!dir) throw new Error('makeZip: manca la cartella del pacchetto');
  const src = path.resolve(dir), target = checkZipTarget({ dir: src, zip }), part = `${target}.part`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.rmSync(part, { force: true });                      // resto di un tentativo interrotto
  const r = writeZip(part, src);
  const largest = [...r.entries].sort((a, b) => b.compressed - a.compressed || (a.name < b.name ? -1 : 1)).slice(0, 10);
  if (r.bytes >= maxBytes){
    fs.rmSync(part, { force: true });
    const err = new Error(`zip di ${r.bytes} byte (${mb(r.bytes)}): deve stare sotto ${maxBytes} byte (${mb(maxBytes)}), zip cancellato`);
    Object.assign(err, { code: 'ZIP_TROPPO_GRANDE', bytes: r.bytes, largest });
    throw err;
  }
  fs.renameSync(part, target);
  return { file: target, bytes: r.bytes, files: r.entries.length, largest, warn: r.bytes > warnBytes, margin: maxBytes - r.bytes };
}
export const largestTable = largest => largest.map(e => `  ${String(e.compressed).padStart(10)} byte nello zip (${String(e.size).padStart(10)} su disco)  ${e.name}`).join('\n');

// Argomenti: solo --out=…, --zip=…, --turn-url=…, --registro-url=…, ognuno una volta e con un valore. Tutto il resto è un errore:
// «--zip file» (con lo spazio) o «--zip» da solo non devono saltare lo zip e il controllo dei 25 MB terminando bene.
export const CLI_OPTIONS = ['out', 'zip', 'turn-url', 'registro-url'];
export function parseArgs(argv){
  const opts = {};
  for (const a of argv){
    const m = /^--([\w-]+)=([\s\S]*)$/.exec(a);
    if (!m || !CLI_OPTIONS.includes(m[1])) throw new Error(`argomento non valido: «${a}» (si usano solo ${CLI_OPTIONS.map(k => `--${k}=…`).join(', ')})`);
    if (!m[2]) throw new Error(`--${m[1]}= senza valore`);
    if (Object.hasOwn(opts, m[1])) throw new Error(`--${m[1]} ripetuto`);
    opts[m[1]] = m[2];
  }
  return opts;
}

// Il comando, separato dall'avvio per le prove (test/pacchetto-cloudflare-zip.test.mjs): dist, headers e i limiti
// cambiano solo lì. Restituisce il codice di uscita.
export function main(argv, { dist, headers, maxBytes = ZIP_LIMIT, warnBytes = ZIP_WARN, log = console.log, warn = console.warn, error = console.error } = {}){
  let tmp = null;
  try {
    const opts = parseArgs(argv);
    const zip = opts.zip ?? null;
    if (!zip && !opts.out) throw new Error('manca --out=cartella (o --zip=file)');
    if (zip) checkZipTarget({ dir: opts.out, zip });   // prima di copiare 36 MB
    // con --zip e senza --out: cartella temporanea, cancellata alla fine
    if (zip && !opts.out) tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-cloudflare-'));
    const r = makePackage({ out: opts.out ?? tmp, turnUrl: opts['turn-url'] ?? null, registroUrl: opts['registro-url'] ?? null, ...(dist ? { dist } : {}), ...(headers ? { headers } : {}) });
    log(`Pacchetto in ${r.dest}: ${r.files.length} file.`);
    log(r.turnUrl ? `TURN nostro: /${TURN_JSON} → ${r.turnUrl}` : `Senza --turn-url: nessun /${TURN_JSON}, strade di rete come prima.`);
    log(r.registroUrl ? `Registro dello stand: /${REGISTRO_JSON} → ${r.registroUrl}` : `Senza --registro-url: nessun /${REGISTRO_JSON}, il registro dello stand resta in coda sul computer.`);
    if (zip){
      const z = makeZip({ dir: r.dest, zip, maxBytes, warnBytes });
      log(`Zip ${z.file}: ${z.bytes} byte (${mb(z.bytes)}), ${z.files} file; limite ${maxBytes} byte, margine ${z.margin} byte (${mb(z.margin)}).`);
      // i byte (e lo sha256) dipendono anche dallo zlib di Node: da annotare con lo sha256 alla consegna
      log(`Fatto con Node ${process.versions.node}, zlib ${process.versions.zlib}.`);
      if (z.warn) warn(`Attenzione: lo zip supera ${warnBytes} byte (${mb(warnBytes)}), poco margine sotto i 25 MB. I file più pesanti:\n${largestTable(z.largest)}`);
    }
    return 0;
  } catch (e){
    error(`Errore: ${e.message}`);
    if (e.largest) error(`I 10 file più pesanti nello zip:\n${largestTable(e.largest)}`);
    return 1;
  } finally { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
