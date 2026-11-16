// Aggiornamenti del programma Windows di NATPF Simulator dal gioco (richiesta dell'utente del 07/11/2026: «un unico
// installer che poi deve potersi aggiornare direttamente dal gioco»). Modulo senza Electron, provato con node:test
// (natpf-desktop/test/aggiornamenti.test.mjs) con un server HTTP locale; collegato in main.mjs e esposto alla pagina
// del gioco da preload.cjs (window.natpfDesktop.updates).
//
// Dove: un bucket pubblico di Cloudflare R2 (decisione dell'utente: il repository è privato). L'indirizzo base sta in
// aggiornamenti.json nel pacchetto ({ "base": "", "hosts": [] }; vuoto → aggiornamenti spenti, stato 'off').
// Manifesto: <base>/windows/latest.json = { build, version, file, size, sha256, notes, published }, scritto dal
// workflow .github/workflows/natpf-windows.yml dopo aver caricato l'installer <base>/windows/<file>.
//
// Regole: mai aggiornare senza il clic dell'utente; offline o errore di rete → stato 'error' con un testo chiaro, il
// gioco continua (eventi in LAN senza internet); il file viene solo dallo stesso indirizzo del manifesto (redirect
// verso altri host solo se elencati in "hosts"); dimensione e sha256 controllati prima di renderlo installabile;
// download ripreso da dove si era fermato (Range) o rifatto da capo se il server non lo permette.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { windowsVersion } from './desktop-core.mjs';

export const UPDATES = Object.freeze({
  config: 'aggiornamenti.json',
  manifest: 'windows/latest.json',
  // B55 (16/11/2026): elenco delle ultime versioni pubblicate (file, dimensione, sha256), per riscaricare la versione di
  // prima; storia delle versioni installate su questo PC, nella cartella degli aggiornamenti
  versions: 'windows/versioni.json',
  history: 'storico.json',
  maxVersionsBytes: 256*1024,
  maxHistory: 20,
  folder: 'windows',
  dir: 'aggiornamenti',            // dentro %LOCALAPPDATA%\NATPF
  partSuffix: '.parziale',
  installerArgs: ['/S', '/AGGIORNA'],
  maxManifestBytes: 64*1024,
  maxInstallerBytes: 1024*1024*1024,
  maxNotes: 2000,
  timeoutMs: 20000,
  maxRedirects: 3,
  attempts: 3,
  startupDelayMs: 8000,
  // variabili d'ambiente (solo per le prove: prova-linux e test): indirizzo base e installazione simulata
  envBase: 'NATPF_AGGIORNAMENTI_BASE',
  envSimulate: 'NATPF_AGGIORNAMENTI_PROVA',
});
export const STATUSES = Object.freeze(['off', 'idle', 'checking', 'none', 'available', 'downloading', 'ready', 'installing', 'error']);

// errori con un testo italiano breve per la pagina del gioco (code per i test e il registro)
export class UpdateError extends Error {
  constructor(code, message, detail = ''){ super(message); this.code = code; this.detail = detail; }
}
const NET_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EHOSTUNREACH', 'ETIMEDOUT', 'EPIPE', 'ECONNABORTED', 'ERR_STREAM_PREMATURE_CLOSE', 'timeout']);
export function friendlyError(e){
  if (e instanceof UpdateError) return e.message;
  if (NET_CODES.has(e?.code)) return 'Server degli aggiornamenti non raggiungibile (internet assente?). Il gioco funziona lo stesso.';
  if (e?.code === 'ENOSPC') return 'Spazio su disco insufficiente per scaricare l\'aggiornamento.';
  if (e?.code === 'EACCES' || e?.code === 'EPERM' || e?.code === 'EBUSY') return 'Cartella degli aggiornamenti non scrivibile.';
  if (/certificate|CERT_|SSL|TLS/i.test(`${e?.code} ${e?.message}`)) return 'Collegamento sicuro al server degli aggiornamenti non riuscito.';
  return 'Aggiornamento non riuscito: riprova più tardi.';
}

// --- versioni «AAAA-MM-GG.n» -----------------------------------------------------------------------------------------
export function parseBuild(build){
  const m = /^(\d{4})-(\d{2})-(\d{2})\.(\d{1,4})$/.exec(String(build ?? ''));
  if (!m) return null;
  const [y, mo, d, n] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return [y, mo, d, n];
}
// <0 se a è più vecchia di b, 0 uguali, >0 più nuova; versioni non valide valgono meno di tutte
export function compareBuilds(a, b){
  const pa = parseBuild(a), pb = parseBuild(b);
  if (!pa || !pb) return (pa ? 1 : 0) - (pb ? 1 : 0);
  for (let i = 0; i < 4; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}
export const installerName = build => `NATPF-Simulator-Setup-${build}.exe`;

// --- configurazione e indirizzi ---------------------------------------------------------------------------------------
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
// indirizzo base normalizzato (senza / finale); '' = spento. https obbligatorio, http solo verso questo computer (prove)
export function normalizeBase(base){
  const text = String(base ?? '').trim();
  if (!text) return '';
  let u; try { u = new URL(text); } catch { throw new UpdateError('config', 'Indirizzo degli aggiornamenti non valido.'); }
  if (!(u.protocol === 'https:' || (u.protocol === 'http:' && LOCAL_HOSTS.has(u.hostname)))) throw new UpdateError('config', 'L\'indirizzo degli aggiornamenti deve essere https.');
  if (u.search || u.hash || u.username || u.password) throw new UpdateError('config', 'Indirizzo degli aggiornamenti non valido.');
  return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
}
// ambiente che può cambiare l'indirizzo: solo fuori dal programma costruito (npm start) o nelle prove simulate
export function updateEnv(env = {}, { packaged = true, simulate = false } = {}){
  return !packaged || simulate ? env : {};
}
// aggiornamenti.json del pacchetto; l'ambiente (prove, vedi updateEnv) vince sul file. Mai errori: { base, hosts, error? }
export function readUpdateConfig(file, env = {}){
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')) || {}; } catch (e){ if (e.code !== 'ENOENT') return { base: '', hosts: [], error: `aggiornamenti.json non leggibile: ${e.message}` }; }
  const hosts = (Array.isArray(raw.hosts) ? raw.hosts : []).map(h => String(h).trim().toLowerCase()).filter(h => /^[a-z0-9.-]+$/.test(h));
  try { return { base: normalizeBase(env[UPDATES.envBase] || raw.base || ''), hosts }; }
  catch (e){ return { base: '', hosts, error: e.message }; }
}
// un indirizzo (manifesto, installer, redirect) è consentito se ha la stessa origine della base o un host elencato,
// sempre in https (http solo se anche la base è http verso questo computer)
export function urlAllowed(url, base, hosts = []){
  let u, b; try { u = new URL(url); b = new URL(base); } catch { return false; }
  if (u.username || u.password) return false;
  if (u.origin === b.origin) return true;
  return u.protocol === 'https:' && hosts.includes(u.hostname.toLowerCase());
}

// --- manifesto --------------------------------------------------------------------------------------------------------
const invalid = what => new UpdateError('manifesto', 'Informazioni sull\'aggiornamento non valide.', what);
export function validateManifest(m, base){
  if (!m || typeof m !== 'object' || Array.isArray(m)) throw invalid('non è un oggetto');
  const build = String(m.build ?? '');
  if (!parseBuild(build)) throw invalid(`build ${build}`);
  if (m.version != null && String(m.version) !== windowsVersion(build)) throw invalid(`version ${m.version} diversa da ${windowsVersion(build)}`);
  const file = String(m.file ?? '');
  // solo un nome di file nella cartella windows/ della base: niente percorsi, niente indirizzi assoluti
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.exe$/.test(file) || file.includes('..')) throw invalid(`file ${file}`);
  const size = m.size;
  if (!Number.isSafeInteger(size) || size <= 0 || size > UPDATES.maxInstallerBytes) throw invalid(`size ${size}`);
  const sha256 = String(m.sha256 ?? '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw invalid('sha256');
  const notes = typeof m.notes === 'string' ? m.notes.replace(/\r\n?/g, '\n').trim().slice(0, UPDATES.maxNotes) : '';
  const published = typeof m.published === 'string' ? m.published.slice(0, 40) : '';
  return { build, version: windowsVersion(build), file, url: `${base}/${UPDATES.folder}/${file}`, size, sha256, notes, published };
}

// --- HTTP -------------------------------------------------------------------------------------------------------------
// GET con redirect solo verso indirizzi consentiti; risolve con la risposta (stream) e l'indirizzo finale
export function httpGet(url, { base, hosts = [], headers = {}, timeoutMs = UPDATES.timeoutMs, maxRedirects = UPDATES.maxRedirects, userAgent = 'NATPF-Simulator' } = {}){
  return new Promise((resolve, reject) => {
    const go = (target, left) => {
      if (!urlAllowed(target, base, hosts)) return reject(new UpdateError('redirect', 'Il server degli aggiornamenti rimanda a un indirizzo non consentito.', target));
      const u = new URL(target);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.get(u, { headers: { 'User-Agent': userAgent, 'Cache-Control': 'no-cache', ...headers }, timeout: timeoutMs }, res => {
        const code = res.statusCode || 0;
        if (code >= 300 && code < 400 && res.headers.location){
          res.resume();
          if (left <= 0) return reject(new UpdateError('redirect', 'Il server degli aggiornamenti rimanda troppe volte.', target));
          let next; try { next = new URL(res.headers.location, target).href; } catch { return reject(new UpdateError('redirect', 'Il server degli aggiornamenti rimanda a un indirizzo non valido.')); }
          return go(next, left - 1);
        }
        // tempo massimo anche senza dati durante il download (connessione appesa)
        res.setTimeout?.(timeoutMs, () => res.destroy(Object.assign(new Error('timeout'), { code: 'timeout' })));
        resolve({ res, url: target });
      });
      req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'timeout' })));
      req.on('error', reject);
    };
    go(url, maxRedirects);
  });
}
async function readBody(res, max){
  const chunks = []; let n = 0;
  for await (const c of res){ n += c.length; if (n > max){ res.destroy(); throw invalid('manifesto troppo grande'); } chunks.push(c); }
  return Buffer.concat(chunks).toString('utf8');
}
export async function fetchManifest(base, { hosts = [], timeoutMs, userAgent, now = Date.now } = {}){
  // ?t= per non ricevere una copia vecchia dalla cache di Cloudflare
  const { res } = await httpGet(`${base}/${UPDATES.manifest}?t=${now()}`, { base, hosts, timeoutMs, userAgent });
  if (res.statusCode === 404){ res.resume(); throw new UpdateError('nessuno', 'Nessuna versione pubblicata sul server degli aggiornamenti.'); }
  if (res.statusCode !== 200){ res.resume(); throw new UpdateError('http', `Server degli aggiornamenti in errore (${res.statusCode}).`); }
  let json; try { json = JSON.parse(await readBody(res, UPDATES.maxManifestBytes)); } catch (e){ throw e instanceof UpdateError ? e : invalid('JSON'); }
  return validateManifest(json, base);
}

export function sha256File(file){
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file).on('error', reject).on('data', c => h.update(c)).on('end', () => resolve(h.digest('hex')));
  });
}
const sizeOf = file => { try { return fs.statSync(file).size; } catch { return -1; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// il file finale c'è già ed è quello giusto?
export async function verifiedFile(file, { size, sha256 }){
  return sizeOf(file) === size && (await sha256File(file).catch(() => '')) === sha256;
}

// Scarica url in dest (attraverso dest.parziale) e controlla dimensione e sha256. Interruzioni: riprende con Range dal
// punto raggiunto (anche in una chiamata successiva); il server che non accetta Range ricomincia da capo. Un file
// ripreso che non torna allo sha256 si riscarica una volta da capo. onProgress(byte, totale)
export async function downloadVerified({ url, dest, size, sha256, base, hosts = [], onProgress = () => {}, timeoutMs, attempts = UPDATES.attempts, retryMs = 1000, userAgent }){
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (await verifiedFile(dest, { size, sha256 })) { onProgress(size, size); return { reused: true }; }
  const part = dest + UPDATES.partSuffix;
  let lastError = null, fromZeroAfterResume = false;
  for (let attempt = 0; attempt < attempts; attempt++){
    let have = Math.max(0, sizeOf(part));
    if (have > size){ fs.rmSync(part, { force: true }); have = 0; }
    const resumed = have > 0;
    try {
      if (have < size) await fetchInto({ url, part, have, size, base, hosts, onProgress, timeoutMs, userAgent });
      if (sizeOf(part) !== size){ fs.rmSync(part, { force: true }); throw new UpdateError('dimensione', 'Il file scaricato ha una dimensione sbagliata: riprova.'); }
      const got = await sha256File(part);
      if (got !== sha256){
        fs.rmSync(part, { force: true });
        if (resumed && !fromZeroAfterResume){ fromZeroAfterResume = true; attempt--; continue; }
        throw new UpdateError('sha256', 'Il file scaricato non corrisponde (controllo sha256): riprova.', got);
      }
      fs.rmSync(dest, { force: true });
      fs.renameSync(part, dest);
      return { reused: false };
    } catch (e){
      lastError = e;
      // errori che non si risolvono riprovando subito (un file della dimensione sbagliata non si riprende)
      if (e instanceof UpdateError && ['dimensione', 'sha256'].includes(e.code)) fs.rmSync(part, { force: true });
      if (e instanceof UpdateError && ['dimensione', 'sha256', 'redirect', 'http'].includes(e.code)) throw e;
      if (e?.code === 'ENOSPC') throw e;
      if (attempt < attempts - 1) await sleep(retryMs*(attempt + 1));
    }
  }
  if (lastError instanceof UpdateError) throw lastError;
  throw new UpdateError('interrotto', 'Download interrotto: riprova, riprende da dove si era fermato.', lastError?.message || '');
}
async function fetchInto({ url, part, have, size, base, hosts, onProgress, timeoutMs, userAgent }){
  const { res } = await httpGet(url, { base, hosts, timeoutMs, userAgent, headers: have > 0 ? { Range: `bytes=${have}-` } : {} });
  let start = 0;
  if (res.statusCode === 206 && have > 0){
    const m = /^bytes (\d+)-(\d+)\/(\d+|\*)$/.exec(res.headers['content-range'] || '');
    if (!m || Number(m[1]) !== have){ res.resume(); fs.rmSync(part, { force: true }); throw new UpdateError('interrotto', 'Download interrotto: riprova.', 'content-range'); }
    if (m[3] !== '*' && Number(m[3]) !== size){ res.resume(); fs.rmSync(part, { force: true }); throw new UpdateError('dimensione', 'Il file sul server ha una dimensione diversa da quella annunciata: riprova più tardi.'); }
    start = have;
  } else if (res.statusCode === 416){
    res.resume(); fs.rmSync(part, { force: true });
    throw Object.assign(new Error('range non soddisfacibile'), { code: 'ECONNRESET' });
  } else if (res.statusCode !== 200){
    res.resume();
    throw new UpdateError('http', res.statusCode === 404 ? 'Il file dell\'aggiornamento non è sul server.' : `Server degli aggiornamenti in errore (${res.statusCode}).`);
  }
  const length = Number(res.headers['content-length']);
  if (Number.isFinite(length) && start + length !== size){
    res.resume();
    throw new UpdateError('dimensione', 'Il file sul server ha una dimensione diversa da quella annunciata: riprova più tardi.');
  }
  let done = start;
  onProgress(done, size);
  const counter = new Transform({ transform(chunk, _enc, cb){
    done += chunk.length;
    if (done > size) return cb(new UpdateError('dimensione', 'Il file scaricato ha una dimensione sbagliata: riprova.'));
    onProgress(done, size);
    cb(null, chunk);
  } });
  await pipeline(res, counter, fs.createWriteStream(part, { flags: start > 0 ? 'a' : 'w' }));
}

// Comando per avviare l'installer con il permesso di Windows (UAC) senza aspettarne la fine: PowerShell Start-Process
// -Verb RunAs (l'installer è per il computer e chiede l'amministratore: CreateProcess da solo fallirebbe con 740).
// PowerShell esce con errore se l'utente rifiuta il permesso: il programma resta aperto.
export function installerLaunchArgs(file, args = UPDATES.installerArgs){
  if (!file || /["\r\n]/.test(file)) throw new Error('percorso dell\'installer non valido');
  const q = s => `'${String(s).replace(/'/g, "''")}'`;
  const ps = `Start-Process -FilePath ${q(file)} -ArgumentList ${args.map(q).join(',')} -Verb RunAs`;
  return ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps];
}

// File della cartella degli aggiornamenti che non servono più: installer di versioni non più nuove di quella in uso
// (anche quelli scaricati a metà); tutto il resto si lascia
// keep (B55): versioni il cui installer resta (il file intero, non a metà): la versione di prima, per «Torna alla versione
// di prima», e quella in uso, che sarà la versione di prima dopo il prossimo aggiornamento
export function staleFiles(names = [], current, keep = []){
  const K = new Set([].concat(keep || []).filter(Boolean));
  return names.filter(n => {
    const m = /^NATPF-Simulator-Setup-(.+)\.exe(\.parziale)?$/.exec(n);
    if (!m || compareBuilds(m[1], current) > 0) return false;
    return !(K.has(m[1]) && !m[2]);
  });
}

// --- B55 · versione di prima ------------------------------------------------------------------------------------------
// Richiesta dell'utente del 16/11/2026 («una funzionalità di fallback e downgrade della release qualora una versione ha
// rotto delle dinamiche»; decisioni: solo la versione di prima sul PC, comando nelle Opzioni del gioco). Il programma tiene
// la storia delle versioni installate e l'installer della versione di prima (quello scaricato per aggiornare, o riscaricato
// in sottofondo da windows/versioni.json, sempre controllato con lo sha256): così il ritorno vale anche senza internet.
// La versione lasciata con il ritorno non si propone più finché non ne esce una più nuova.
// storia: { versioni: [build in ordine di installazione], saltate: [build lasciate], installer: { build: { size, sha256 } } }
export function readHistory(file){
  try {
    const h = JSON.parse(fs.readFileSync(file, 'utf8'));
    const ok = b => typeof b === 'string' && !!parseBuild(b);
    const installer = {};
    for (const [b, v] of Object.entries(h?.installer || {})) if (ok(b) && Number.isSafeInteger(v?.size) && /^[0-9a-f]{64}$/.test(String(v?.sha256))) installer[b] = { size: v.size, sha256: v.sha256 };
    return { versioni: (h?.versioni || []).filter(ok).slice(-UPDATES.maxHistory), saltate: (h?.saltate || []).filter(ok).slice(-UPDATES.maxHistory), installer };
  } catch { return { versioni: [], saltate: [], installer: {} }; }
}
export function writeHistory(file, h){
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(h, null, 1)); return true; } catch { return false; }
}
// la versione di prima (funzione pura): l'ultima installata più vecchia di quella in uso, che non sia stata lasciata
export function previousBuild(history, current){
  const v = history?.versioni || [], skip = new Set(history?.saltate || []);
  for (let i = v.length - 1; i >= 0; i--) if (compareBuilds(v[i], current) < 0 && !skip.has(v[i])) return v[i];
  return null;
}
// storia aggiornata con la versione in uso (funzione pura): in fondo se è cambiata
export function noteInstalled(history, current){
  const v = history.versioni.filter(Boolean);
  if (v.at(-1) !== current) v.push(current);
  return { ...history, versioni: v.slice(-UPDATES.maxHistory) };
}
// elenco delle versioni pubblicate (windows/versioni.json: { versioni: [{ build, file, size, sha256 }] }), valido
export function validateVersions(j, base){
  const list = Array.isArray(j?.versioni) ? j.versioni : [];
  const out = [];
  for (const v of list.slice(0, 200)){ try { out.push(validateManifest({ ...v, version: undefined }, base)); } catch {} }
  return out;
}

// --- stato degli aggiornamenti (interfaccia window.natpfDesktop.updates) ----------------------------------------------
// S = { status, current, latest?, notes?, size?, progress?, error?, checkedAt? } (status in STATUSES)
// enabled false (indirizzo vuoto, programma non installato) → sempre 'off'. launch(file) → Promise<{ ok, error? }>
// avvia l'installer; quit() chiude il programma dopo un avvio riuscito. Niente parte da sola: solo check() all'avvio.
export class Updater {
  constructor({ current, base = '', hosts = [], dir, enabled = true, launch = async () => ({ ok: false, error: 'non disponibile' }), quit = () => {}, log = () => {},
    now = Date.now, timeoutMs, attempts, retryMs, progressMs = 250 } = {}){
    Object.assign(this, { current: String(current || ''), base, hosts, dir, launch, quit, log, now, timeoutMs, attempts, retryMs, progressMs });
    this.enabled = !!(enabled && base && dir && parseBuild(this.current));
    this.listeners = new Set();
    this.manifest = null;
    this.s = { status: this.enabled ? 'idle' : 'off', current: this.current };
    this.checking = null; this.downloading = null; this.lastProgressAt = 0;
  }
  state(){ return { ...this.s }; }
  onChange(cb){ if (typeof cb !== 'function') return () => {}; this.listeners.add(cb); return () => this.listeners.delete(cb); }
  set(next, { quiet = false } = {}){
    const prev = this.s.status;
    this.s = { current: this.current, ...next };
    for (const k of Object.keys(this.s)) if (this.s[k] === undefined) delete this.s[k];
    if (!quiet && prev !== this.s.status) this.log('aggiornamenti', { stato: this.s.status, versione: this.s.latest, errore: this.s.error });
    const copy = this.state();
    for (const cb of this.listeners){ try { cb(copy); } catch {} }
  }
  info(){ const m = this.manifest; return m ? { latest: m.build, notes: m.notes, size: m.size } : {}; }
  fileFor(m){ return path.join(this.dir, installerName(m.build)); }

  // B55: storia delle versioni, versione di prima e il suo installer (se c'è ed è quello giusto)
  historyFile(){ return path.join(this.dir, UPDATES.history); }
  history(){ return readHistory(this.historyFile()); }
  previous(){ return this.dir ? previousBuild(this.history(), this.current) : null; }
  async previousReady(){
    const prev = this.previous(); if (!prev) return false;
    const meta = this.history().installer[prev];
    return !!meta && await verifiedFile(path.join(this.dir, installerName(prev)), meta);
  }
  // la versione in uso nella storia (all'avvio); la versione lasciata con il ritorno resta lasciata
  noteVersion(){
    if (!this.dir || !parseBuild(this.current)) return;
    const h = this.history(), next = noteInstalled(h, this.current);
    if (next.versioni.join() !== h.versioni.join()) writeHistory(this.historyFile(), next);
  }
  rememberInstaller(build, { size, sha256 }){
    const h = this.history(); h.installer[build] = { size, sha256 };
    // solo quelli che servono: la versione di prima e quelle più nuove (gli altri file li toglie la pulizia)
    for (const b of Object.keys(h.installer)) if (compareBuilds(b, this.current) < 0 && b !== previousBuild(h, this.current) && b !== build) delete h.installer[b];
    // (quello della versione in uso resta: dopo il prossimo aggiornamento è la versione di prima)
    writeHistory(this.historyFile(), h);
  }
  async _withPrevious(){ this.s.previous = this.previous() || undefined; this.s.previousReady = this.s.previous ? await this.previousReady() : undefined; }
  // l'installer della versione di prima, se manca, da windows/versioni.json (in sottofondo, quando c'è internet); mai errori
  async prefetchPrevious(){
    if (!this.enabled) return false;
    const prev = this.previous(); if (!prev || await this.previousReady()) return !!prev;
    try {
      const { res } = await httpGet(`${this.base}/${UPDATES.versions}?t=${this.now()}`, { base: this.base, hosts: this.hosts, timeoutMs: this.timeoutMs, userAgent: `NATPF-Simulator/${this.current}` });
      if (res.statusCode !== 200){ res.resume(); return false; }
      const v = validateVersions(JSON.parse(await readBody(res, UPDATES.maxVersionsBytes)), this.base).find(x => x.build === prev);
      if (!v) return false;
      await downloadVerified({ url: v.url, dest: path.join(this.dir, installerName(prev)), size: v.size, sha256: v.sha256, base: this.base, hosts: this.hosts, timeoutMs: this.timeoutMs, attempts: this.attempts, retryMs: this.retryMs, userAgent: `NATPF-Simulator/${this.current}` });
      this.rememberInstaller(prev, v);
      this.log('aggiornamenti: versione di prima pronta', { versione: prev });
      await this._withPrevious(); this.set({ ...this.s }, { quiet: true });
      return true;
    } catch (e){ this.log('aggiornamenti: versione di prima non scaricata', { codice: e.code, errore: e.message }); return false; }
  }
  // «Torna alla versione di prima»: l'installer della versione di prima (controllato), la versione in uso segnata come
  // lasciata, poi come un aggiornamento (permesso di Windows, chiusura, il gioco si riapre con la versione di prima)
  async rollback(){
    if (!this.enabled) return { ok: false, error: 'Aggiornamenti non disponibili.' };
    if (['downloading', 'installing'].includes(this.s.status)) return { ok: false, error: 'Aspetta la fine dell\'aggiornamento in corso.' };
    const prev = this.previous();
    if (!prev) return { ok: false, error: 'Nessuna versione di prima su questo computer.' };
    if (!(await this.previousReady()) && !(await this.prefetchPrevious())) return { ok: false, error: `La versione ${prev} non è sul computer e non si riesce a scaricarla: serve internet.` };
    const h = this.history();
    if (!h.saltate.includes(this.current)) h.saltate.push(this.current);
    writeHistory(this.historyFile(), h);
    const file = path.join(this.dir, installerName(prev)), meta = h.installer[prev];
    const back = { ...this.s };
    this.set({ ...this.info(), status: 'installing', rollbackTo: prev });
    let r;
    try { r = await this.launch(file, { build: prev, ...meta }); } catch (e){ r = { ok: false, error: e.message }; }
    if (!r?.ok){
      // il permesso di Windows rifiutato: la versione in uso non è lasciata
      const h2 = this.history(); h2.saltate = h2.saltate.filter(b => b !== this.current); writeHistory(this.historyFile(), h2);
      const error = r?.error || 'Ritorno alla versione di prima non avviato.';
      this.log('aggiornamenti: ritorno non avviato', { errore: error });
      this.set({ ...back, error });
      return { ok: false, error };
    }
    this.log('aggiornamenti: ritorno alla versione di prima, chiusura del programma', { da: this.current, a: prev });
    try { this.quit(); } catch {}
    return { ok: true };
  }

  // pulizia della cartella degli aggiornamenti (installer già installati, non quello della versione di prima); mai errori
  cleanup(){
    if (!this.dir) return [];
    try {
      this.noteVersion();
      const gone = staleFiles(fs.readdirSync(this.dir), this.current, [this.previous(), this.current]);
      for (const n of gone) fs.rmSync(path.join(this.dir, n), { force: true });
      if (gone.length) this.log('aggiornamenti: tolti i file vecchi', gone);
      return gone;
    } catch { return []; }
  }

  check(){
    if (!this.enabled) return Promise.resolve(this.state());
    if (this.checking) return this.checking;
    if (['downloading', 'installing'].includes(this.s.status)) return Promise.resolve(this.state());
    const wasReady = this.s.status === 'ready' ? this.manifest : null;
    this.set({ ...this.info(), status: 'checking', checkedAt: this.s.checkedAt });
    this.checking = (async () => {
      try {
        const m = await fetchManifest(this.base, { hosts: this.hosts, timeoutMs: this.timeoutMs, now: this.now, userAgent: `NATPF-Simulator/${this.current}` });
        const checkedAt = this.now();
        // (B55: la versione lasciata con «Torna alla versione di prima» non si ripropone finché non ne esce una più nuova)
        if (compareBuilds(m.build, this.current) <= 0 || this.history().saltate.includes(m.build)){
          this.manifest = null; this.cleanup();
          await this._withPrevious();
          this.set({ ...(this.s.previous ? { previous: this.s.previous, previousReady: this.s.previousReady } : {}), status: 'none', checkedAt, latest: m.build });
        } else {
          const same = wasReady && wasReady.build === m.build && wasReady.sha256 === m.sha256;
          this.manifest = m;
          const ready = same || await verifiedFile(this.fileFor(m), m);
          await this._withPrevious();
          this.set({ ...this.info(), ...(this.s.previous ? { previous: this.s.previous, previousReady: this.s.previousReady } : {}), status: ready ? 'ready' : 'available', checkedAt });
        }
      } catch (e){
        this.log('aggiornamenti: controllo non riuscito', { codice: e.code, errore: e.message, dettaglio: e.detail });
        // già scaricato e controllato: resta installabile anche senza internet
        if (wasReady){ this.manifest = wasReady; this.set({ ...this.info(), status: 'ready', progress: 1, error: friendlyError(e), checkedAt: this.now() }); }
        else this.set({ ...(this.manifest ? this.info() : {}), status: 'error', error: friendlyError(e), checkedAt: this.now() });
      } finally { this.checking = null; }
      return this.state();
    })();
    return this.checking;
  }

  download(){
    if (!this.enabled) return Promise.resolve(this.state());
    if (this.downloading) return this.downloading;
    if (this.s.status === 'ready' || !this.manifest || !['available', 'error'].includes(this.s.status)) return Promise.resolve(this.state());
    const m = this.manifest, dest = this.fileFor(m);
    this.downloading = (async () => {
      try {
        // installer di altre versioni scaricati a metà: via (spazio su disco)
        // (B55: non l'installer della versione di prima)
        const keep = [this.previous(), this.current].filter(Boolean).map(installerName);
        try { for (const n of fs.readdirSync(this.dir)) if (/^NATPF-Simulator-Setup-.*\.exe(\.parziale)?$/.test(n) && !n.startsWith(installerName(m.build)) && !keep.includes(n)) fs.rmSync(path.join(this.dir, n), { force: true }); } catch {}
        const partial = Math.max(0, sizeOf(dest + UPDATES.partSuffix));
        this.set({ ...this.info(), status: 'downloading', progress: Math.min(1, partial/m.size) });
        this.lastProgressAt = 0;
        await downloadVerified({ url: m.url, dest, size: m.size, sha256: m.sha256, base: this.base, hosts: this.hosts, timeoutMs: this.timeoutMs, attempts: this.attempts, retryMs: this.retryMs,
          userAgent: `NATPF-Simulator/${this.current}`,
          onProgress: (done, total) => {
            const t = this.now();
            if (done < total && t - this.lastProgressAt < this.progressMs) return;
            this.lastProgressAt = t;
            this.set({ ...this.info(), status: 'downloading', progress: Math.min(1, done/total) }, { quiet: true });
          } });
        // (B55: dimensione e sha256 dell'installer scaricato: dopo l'aggiornamento è quello della versione di prima)
        this.rememberInstaller(m.build, m);
        this.set({ ...this.info(), status: 'ready', progress: 1 });
      } catch (e){
        this.log('aggiornamenti: download non riuscito', { codice: e.code, errore: e.message, dettaglio: e.detail });
        this.set({ ...this.info(), status: 'error', error: friendlyError(e) });
      } finally { this.downloading = null; }
      return this.state();
    })();
    return this.downloading;
  }

  async install(){
    if (!this.enabled) return { ok: false, error: 'Aggiornamenti non disponibili.' };
    if (this.s.status !== 'ready' || !this.manifest) return { ok: false, error: 'Nessun aggiornamento pronto da installare.' };
    const m = this.manifest, file = this.fileFor(m);
    this.set({ ...this.info(), status: 'installing' });
    // di nuovo il controllo dello sha256 subito prima di avviarlo
    if (!(await verifiedFile(file, m))){
      fs.rmSync(file, { force: true });
      const error = 'Il file dell\'aggiornamento è cambiato o manca: scaricalo di nuovo.';
      this.set({ ...this.info(), status: 'available' });
      return { ok: false, error };
    }
    let r;
    try { r = await this.launch(file, m); } catch (e){ r = { ok: false, error: e.message }; }
    if (!r?.ok){
      const error = r?.error || 'Installazione non avviata.';
      this.log('aggiornamenti: installazione non avviata', { errore: error });
      this.set({ ...this.info(), status: 'ready', progress: 1, error });
      return { ok: false, error };
    }
    this.log('aggiornamenti: installer avviato, chiusura del programma', { versione: m.build });
    try { this.quit(); } catch {}
    return { ok: true };
  }
}
