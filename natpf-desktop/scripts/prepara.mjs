// Prepara la cartella app/ del programma Windows (natpf-desktop): il gioco già costruito e il server LAN, presi dal
// pacchetto LAN (natpf-tennis/lan/pacchetto.mjs, senza Node: lo porta Electron), più il processo principale.
//   cd natpf-tennis && npm run build      (prima: dist/ con il pacchetto offline)
//   cd natpf-desktop && node scripts/prepara.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readBuild, windowsVersion } from '../src/desktop-core.mjs';

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
// niente certificati o chiavi nel programma (si creano sul PC, in %LOCALAPPDATA%\NATPF)
for (const p of ['tools/lan/certs']) fs.rmSync(path.join(APP, p), { recursive: true, force: true });
// dipendenze del server anche alla radice dell'app (electron-builder le porta come dipendenze di produzione)
fs.mkdirSync(path.join(APP, 'node_modules'), { recursive: true });
for (const m of ['ws', 'node-forge']) fs.cpSync(path.join(REPO, 'tools/lan/node_modules', m), path.join(APP, 'node_modules', m), { recursive: true });
const lanPkg = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/lan/package.json'), 'utf8'));
// processo principale e icona
for (const f of ['main.mjs', 'desktop-core.mjs']) fs.copyFileSync(path.join(HERE, 'src', f), path.join(APP, f));
fs.copyFileSync(path.join(HERE, 'build/icon.ico'), path.join(APP, 'icon.ico'));
fs.writeFileSync(path.join(APP, 'package.json'), JSON.stringify({
  name: 'natpf-simulator', productName: 'NATPF Simulator', version: windowsVersion(build), natpfBuild: build,
  description: 'NATPF Simulator: tennis 3D con il telefono come racchetta', author: 'NATPF Simulator', main: 'main.mjs', type: 'module',
  dependencies: { ws: lanPkg.dependencies.ws, 'node-forge': lanPkg.dependencies['node-forge'] },
}, null, 2));
const size = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((t, e) => t + (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
console.log(`app/ pronta: NATPF ${build} (Windows ${windowsVersion(build)}), ${(size(APP)/1e6).toFixed(1)} MB`);
