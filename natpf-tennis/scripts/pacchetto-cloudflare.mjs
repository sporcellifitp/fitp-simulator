// Cartella da caricare sul Worker Cloudflare del gioco (file statici, senza wrangler): il contenuto di natpf-tennis/dist,
// le intestazioni di site/_headers e, con --turn-url, la configurazione del TURN nostro in natpf/turn.json.
// La pagina del gioco (alla radice) e la pagina del telefono (/natpf/tennis/racchetta.html) la cercano entrambe con
// lo stesso percorso assoluto /natpf/turn.json (site/js/tennis/ice-route.js): senza il file tutto resta come prima.
// Il Worker delle credenziali è un altro, piccolo: natpf-tennis/cloudflare/turn-worker.js (lì le istruzioni).
//
//   cd natpf-tennis && npm run build
//   node scripts/pacchetto-cloudflare.mjs --out=../pacchetto [--zip=../pacchetto.zip] [--turn-url=https://<nome>.<account>.workers.dev/]
//
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

// _headers di Cloudflare: blocchi «percorso» + righe indentate «Nome: valore». Il json deve restare leggibile da fetch
// (niente Content-Type diverso da JSON) e le due pagine devono poter chiamare il Worker (niente Content-Security-Policy
// con un connect-src che non lo comprende). Oggi site/_headers ha solo X-Robots-Tag, nosniff e Referrer-Policy: va bene
export const PAGES = ['/', '/index.html', '/natpf/tennis/racchetta.html'];
export function headersProblems(text, { turnUrl = null } = {}){
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
  return out;
}

// La destinazione è già stata creata e verificata vuota. Node 24 rifiuta anche una directory vuota
// con errorOnExist: copiare i figli conserva il controllo contro sovrascritture su tutte le versioni.
const copyDir = (from, to) => {
  for (const name of fs.readdirSync(from)) fs.cpSync(path.join(from, name), path.join(to, name), { recursive: true, errorOnExist: true, force: false });
};

export function makePackage({ out, turnUrl = null, dist = path.join(ROOT, 'dist'), headers = path.resolve(ROOT, '../site/_headers') } = {}){
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
  const headersText = fs.readFileSync(headers, 'utf8');
  const problems = headersProblems(headersText, { turnUrl: url });
  if (problems.length) throw new Error(`_headers impedirebbe di usare il TURN nostro: ${problems.join(' · ')}`);
  fs.mkdirSync(dest, { recursive: true });
  copyDir(dist, dest);
  fs.writeFileSync(path.join(dest, '_headers'), headersText);
  if (url){
    fs.mkdirSync(path.join(dest, 'natpf'), { recursive: true });
    fs.writeFileSync(path.join(dest, TURN_JSON), JSON.stringify({ url }, null, 2) + '\n');
  } else if (fs.existsSync(path.join(dest, TURN_JSON))) fs.rmSync(path.join(dest, TURN_JSON));
  return { dest, turnUrl: url, files: listFiles(dest) };
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const arg = k => process.argv.slice(2).find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
  const zip = arg('zip');
  // con --zip e senza --out: cartella temporanea, cancellata alla fine
  const tmp = zip && !arg('out') ? fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-cloudflare-')) : null;
  try {
    if (zip) checkZipTarget({ dir: arg('out'), zip });   // prima di copiare 36 MB
    const r = makePackage({ out: arg('out') ?? tmp, turnUrl: arg('turn-url') });
    console.log(`Pacchetto in ${r.dest}: ${r.files.length} file.`);
    console.log(r.turnUrl ? `TURN nostro: /${TURN_JSON} → ${r.turnUrl}` : `Senza --turn-url: nessun /${TURN_JSON}, strade di rete come prima.`);
    if (zip){
      const z = makeZip({ dir: r.dest, zip });
      console.log(`Zip ${z.file}: ${z.bytes} byte (${mb(z.bytes)}), ${z.files} file; limite ${ZIP_LIMIT} byte, margine ${z.margin} byte (${mb(z.margin)}).`);
      if (z.warn) console.warn(`Attenzione: lo zip supera ${ZIP_WARN} byte (${mb(ZIP_WARN)}), poco margine sotto i 25 MB. I file più pesanti:\n${largestTable(z.largest)}`);
    }
  } catch (e){
    console.error(`Errore: ${e.message}`);
    if (e.largest) console.error(`I 10 file più pesanti nello zip:\n${largestTable(e.largest)}`);
    process.exitCode = 1;
  } finally { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); }
}
