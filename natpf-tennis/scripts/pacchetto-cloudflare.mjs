// Cartella da caricare sul Worker Cloudflare del gioco (file statici, senza wrangler): il contenuto di natpf-tennis/dist,
// le intestazioni di site/_headers e, con --turn-url, la configurazione del TURN nostro in natpf/turn.json.
// La pagina del gioco (alla radice) e la pagina del telefono (/natpf/tennis/racchetta.html) la cercano entrambe con
// lo stesso percorso assoluto /natpf/turn.json (site/js/tennis/ice-route.js): senza il file tutto resta come prima.
// Il Worker delle credenziali è un altro, piccolo: natpf-tennis/cloudflare/turn-worker.js (lì le istruzioni).
//
//   cd natpf-tennis && npm run build
//   node scripts/pacchetto-cloudflare.mjs --out=../pacchetto [--turn-url=https://<nome>.<account>.workers.dev/]
//
// Lo zip lo fa chi chiama (il contenuto della cartella, non la cartella). La cartella di destinazione deve essere
// nuova o vuota: niente file vecchi mescolati a quelli nuovi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const TURN_JSON = 'natpf/turn.json';

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

const copyDir = (from, to) => fs.cpSync(from, to, { recursive: true, errorOnExist: true, force: false });

export function makePackage({ out, turnUrl = null, dist = path.join(ROOT, 'dist'), headers = path.resolve(ROOT, '../site/_headers') } = {}){
  if (!out) throw new Error('manca --out=cartella');
  const dest = path.resolve(out);
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error(`build mancante: ${dist}/index.html (prima npm run build)`);
  const rel = path.relative(dist, dest);
  if (!rel || (!rel.startsWith('..') && !path.isAbsolute(rel))) throw new Error('la cartella di destinazione non può stare dentro dist');
  if (fs.existsSync(dest) && fs.readdirSync(dest).length) throw new Error(`la cartella ${dest} non è vuota`);
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const arg = k => process.argv.slice(2).find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
  try {
    const r = makePackage({ out: arg('out'), turnUrl: arg('turn-url') });
    console.log(`Pacchetto in ${r.dest}: ${r.files.length} file.`);
    console.log(r.turnUrl ? `TURN nostro: /${TURN_JSON} → ${r.turnUrl}` : `Senza --turn-url: nessun /${TURN_JSON}, strade di rete come prima.`);
  } catch (e){ console.error(`Errore: ${e.message}`); process.exit(1); }
}
