// Prepara la cartella app/ del programma Windows (natpf-desktop): il gioco già costruito e il server LAN, presi dal
// pacchetto LAN (natpf-tennis/lan/pacchetto.mjs, senza Node: lo porta Electron), più il processo principale.
//   cd natpf-tennis && npm run build      (prima: dist/ con il pacchetto offline)
//   cd natpf-desktop && node scripts/prepara.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DESKTOP, readBuild, windowsVersion, trailerFiles, trailerNameMatches } from '../src/desktop-core.mjs';
import { UPDATES, normalizeBase } from '../src/aggiornamenti.mjs';
import { REGISTRO_PC, indirizzoRegistro } from '../src/registro.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(HERE, '..');
const APP = path.join(HERE, 'app');
const fail = m => { console.error(m); process.exit(1); };

const build = readBuild(fs.readFileSync(path.join(REPO, 'site/js/tennis/version.js'), 'utf8'));
if (!build) fail('Versione non trovata in site/js/tennis/version.js');
if (!fs.existsSync(path.join(REPO, 'natpf-tennis/dist/index.html'))) fail('Manca natpf-tennis/dist: esegui «npm run build» in natpf-tennis.');
if (!fs.existsSync(path.join(REPO, 'tools/lan/node_modules/ws'))) fail('Mancano le dipendenze di tools/lan: «npm ci» in tools/lan.');

// pacchetto LAN in una cartella temporanea, poi solo gioco, pagine del telefono e server
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-desktop-'));
execFileSync(process.execPath, [path.join(REPO, 'natpf-tennis/lan/pacchetto.mjs'), `--out=${tmp}`], { stdio: 'inherit' });
fs.rmSync(APP, { recursive: true, force: true }); fs.mkdirSync(APP, { recursive: true });
for (const dir of ['natpf-tennis', 'site', 'tools']) fs.cpSync(path.join(tmp, dir), path.join(APP, dir), { recursive: true });
fs.rmSync(tmp, { recursive: true, force: true });
// trailer dell'intro (B21): dentro il programma, accanto al video di prima (il gioco lo cerca in ./media/, senza rete:
// natpf-tennis/src/natpf/natpf_intro.js). Il nome deve essere l'impronta del file e quello che il gioco conosce
const trailers = trailerFiles(path.join(HERE, 'media')), introJs = fs.readFileSync(path.join(REPO, 'natpf-tennis/src/natpf/natpf_intro.js'), 'utf8');
if (!trailers.length) console.warn('ATTENZIONE: nessun trailer in natpf-desktop/media: nel programma l\'intro userà il video di prima');
for (const f of trailers){
  const src = path.join(HERE, 'media', f), sha = createHash('sha256').update(fs.readFileSync(src)).digest('hex');
  if (!trailerNameMatches(f, sha)) fail(`Trailer ${f}: il nome non corrisponde allo sha256 del file (${sha.slice(0, 12)}).`);
  if (!introJs.includes(`'${f}'`)) fail(`Trailer ${f}: il gioco non lo conosce (TRAILER.file in natpf-tennis/src/natpf/natpf_intro.js).`);
  fs.mkdirSync(path.join(APP, 'natpf-tennis/dist/media'), { recursive: true });
  fs.copyFileSync(src, path.join(APP, 'natpf-tennis/dist/media', f));
  console.log(`trailer dell'intro nel programma: natpf-tennis/dist/media/${f} (${fs.statSync(src).size} byte)`);
}
// niente certificati o chiavi nel programma (si creano sul PC, in %LOCALAPPDATA%\NATPF)
for (const p of ['tools/lan/certs']) fs.rmSync(path.join(APP, p), { recursive: true, force: true });
// dipendenze del server anche alla radice dell'app (electron-builder le porta come dipendenze di produzione)
fs.mkdirSync(path.join(APP, 'node_modules'), { recursive: true });
for (const m of ['ws', 'node-forge']) fs.cpSync(path.join(REPO, 'tools/lan/node_modules', m), path.join(APP, 'node_modules', m), { recursive: true });
const lanPkg = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/lan/package.json'), 'utf8'));
// processo principale, ponte con la pagina del gioco (preload) e icona
for (const f of ['main.mjs', 'desktop-core.mjs', 'aggiornamenti.mjs', 'registro.mjs', DESKTOP.preload]) fs.copyFileSync(path.join(HERE, 'src', f), path.join(APP, f));
// indirizzo degli aggiornamenti (bucket pubblico di Cloudflare R2): da aggiornamenti.json del repository, oppure dalla
// variabile NATPF_AGGIORNAMENTI_URL al momento della costruzione (il workflow la prende dalla variabile di GitHub
// con lo stesso nome). Vuoto → aggiornamenti spenti nel programma
const updCfg = JSON.parse(fs.readFileSync(path.join(HERE, UPDATES.config), 'utf8'));
const updBase = normalizeBase(process.env.NATPF_AGGIORNAMENTI_URL || updCfg.base || '');
fs.writeFileSync(path.join(APP, UPDATES.config), `${JSON.stringify({ base: updBase, hosts: Array.isArray(updCfg.hosts) ? updCfg.hosts : [] }, null, 2)}\n`);
console.log(`aggiornamenti: ${updBase || 'spenti (indirizzo non impostato)'}`);
// indirizzo del Worker del registro dello stand (B30, docs/GUIDA_REGISTRO_CLOUDFLARE.md): da registro.json del
// repository, oppure dalla variabile NATPF_REGISTRO_URL al momento della costruzione. Vuoto → il registro resta nella
// coda sul PC (il pannello dello stand lo dice). Mai la chiave segreta: quella sta solo nel Worker
const regRaw = process.env.NATPF_REGISTRO_URL || (() => { try { return JSON.parse(fs.readFileSync(path.join(HERE, REGISTRO_PC.config), 'utf8')).url || ''; } catch { return ''; } })();
const regUrl = indirizzoRegistro(regRaw);
if (regRaw && !regUrl) fail(`Indirizzo del registro non valido (serve https, senza utente né password): ${regRaw}`);
fs.writeFileSync(path.join(APP, REGISTRO_PC.config), `${JSON.stringify({ url: regUrl }, null, 2)}\n`);
console.log(`registro dello stand: ${regUrl || 'solo coda sul PC (indirizzo del Worker non impostato)'}`);
fs.copyFileSync(path.join(HERE, 'build/icon.ico'), path.join(APP, 'icon.ico'));
fs.writeFileSync(path.join(APP, 'package.json'), JSON.stringify({
  name: 'natpf-simulator', productName: 'NATPF Simulator', version: windowsVersion(build), natpfBuild: build,
  description: 'NATPF Simulator: tennis 3D con il telefono come racchetta', author: 'NATPF Simulator', main: 'main.mjs', type: 'module',
  dependencies: { ws: lanPkg.dependencies.ws, 'node-forge': lanPkg.dependencies['node-forge'] },
}, null, 2));
const size = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((t, e) => t + (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
console.log(`app/ pronta: NATPF ${build} (Windows ${windowsVersion(build)}), ${(size(APP)/1e6).toFixed(1)} MB`);
