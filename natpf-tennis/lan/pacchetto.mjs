// Pacchetto LAN per Windows, pronto da estrarre: gioco già costruito con il pacchetto offline, server LAN con le sue
// dipendenze, Node.js portatile (facoltativo), certificato creato al primo avvio, due file da aprire con doppio clic.
//   node lan/pacchetto.mjs --out=cartella [--node=node-vXX-win-x64.zip già scaricato e verificato]
// Prima: npm run build (dist/ con MediaPipe) e npm ci in ../tools/lan. Lo zip lo fa chi chiama (percorsi con «/»).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from '../scripts/offline-assets.mjs';
import { phoneFiles } from '../scripts/natpf-site-plugin.mjs';

const REPO = path.resolve(ROOT, '..');
const args = Object.fromEntries(process.argv.slice(2).map(v => { const i = v.indexOf('='); return i < 0 ? [v.replace(/^--/, ''), true] : [v.slice(0, i).replace(/^--/, ''), v.slice(i + 1)]; }));
const OUT = path.resolve(args.out || path.join(ROOT, 'pacchetto-lan'));
const fail = m => { console.error(m); process.exit(1); };
if (!fs.existsSync(path.join(ROOT, 'dist/index.html'))) fail('Manca dist/: esegui prima npm run build.');
if (!fs.existsSync(path.join(REPO, 'tools/lan/node_modules/ws'))) fail('Mancano le dipendenze di tools/lan: npm ci in tools/lan.');
fs.rmSync(OUT, { recursive: true, force: true });
const copy = (from, to = from, base = REPO) => { const src = path.join(base, from), dst = path.join(OUT, to); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.cpSync(src, dst, { recursive: true }); };
const crlf = s => s.replace(/\r?\n/g, '\r\n');

// gioco già costruito e codice del server
copy('natpf-tennis/dist');
for (const f of ['server.mjs', 'game-handler.mjs']) copy(`natpf-tennis/lan/${f}`);
for (const f of ['match-relay.mjs', 'offline-assets.mjs', 'natpf-site-plugin.mjs']) copy(`natpf-tennis/scripts/${f}`);
fs.writeFileSync(path.join(OUT, 'natpf-tennis/package.json'), JSON.stringify({ name: 'natpf-simulator-tennis', private: true, type: 'module' }, null, 2));
// pagina del telefono con le sue dipendenze, e le grafiche dell'arena
for (const f of phoneFiles(path.join(REPO, 'site'))) copy(`site/${f}`);
copy('site/assets/arena');
// avvio guidato, segnalazione del telefono e certificato (ws e node-forge: solo JavaScript, vanno bene anche su Windows)
for (const f of ['launcher.mjs', 'server.mjs', 'setup.html', 'certificato.mjs', 'package.json', 'README.md']) copy(`tools/lan/${f}`);
for (const m of ['ws', 'node-forge']) copy(`tools/lan/node_modules/${m}`);
// Node.js portatile: solo node.exe e la sua licenza
if (args.node){
  const tmp = path.join(OUT, '.node-tmp'); fs.mkdirSync(tmp, { recursive: true });
  execFileSync('unzip', ['-q', path.resolve(args.node), '*/node.exe', '*/LICENSE', '-d', tmp]);
  const dir = fs.readdirSync(tmp).find(d => d.startsWith('node-'));
  fs.mkdirSync(path.join(OUT, 'node'), { recursive: true });
  for (const f of ['node.exe', 'LICENSE']) fs.renameSync(path.join(tmp, dir, f), path.join(OUT, 'node', f));
  fs.rmSync(tmp, { recursive: true, force: true });
}

const NODE = `set "NODE=%~dp0node\\node.exe"
if not exist "%NODE%" set "NODE=node"
"%NODE%" -v >nul 2>&1
if errorlevel 1 (
  echo Non trovo Node.js. Il pacchetto completo ha la cartella "node": estrai di nuovo tutto lo zip.
  pause
  exit /b 1
)`;
fs.writeFileSync(path.join(OUT, 'AVVIA NATPF LAN.cmd'), crlf(`@echo off
rem NATPF Simulator in LAN: gioco, telefono come racchetta e 1v1 sulla rete locale, anche senza internet.
rem Doppio clic. Tieni aperta questa finestra mentre giochi.
chcp 65001 >nul
cd /d "%~dp0"
${NODE}
rem certificato HTTPS per gli indirizzi di rete di questo PC (al primo avvio crea anche l'autorita' locale)
"%NODE%" tools\\lan\\certificato.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
rem una volta sola: questo PC si fida del certificato (Chrome ed Edge usano l'archivio di Windows)
if not exist "tools\\lan\\certs\\pc-attendibile.txt" (
  echo.
  echo Ora Windows chiede se installare il certificato "NATPF Simulator LAN": rispondi Si'.
  certutil -user -addstore Root "tools\\lan\\certs\\natpf-ca.crt" >nul
  if not errorlevel 1 echo ok> "tools\\lan\\certs\\pc-attendibile.txt"
)
echo.
echo Se Windows chiede di consentire Node.js sulla rete, scegli "Reti private" e Consenti.
"%NODE%" natpf-tennis\\lan\\server.mjs %*
pause
`));
fs.writeFileSync(path.join(OUT, 'PREPARA I TELEFONI.cmd'), crlf(`@echo off
rem Una volta per telefono: il telefono scarica e installa il certificato della rete NATPF (solo la parte pubblica).
chcp 65001 >nul
cd /d "%~dp0"
${NODE}
"%NODE%" tools\\lan\\certificato.mjs --servi
pause
`));
fs.writeFileSync(path.join(OUT, 'LEGGIMI.txt'), crlf(fs.readFileSync(path.join(ROOT, 'lan/LEGGIMI.txt'), 'utf8')));
console.log(`Pacchetto LAN in ${OUT}`);
