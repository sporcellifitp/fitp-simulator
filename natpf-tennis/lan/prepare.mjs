// Preparazione prima dell'avvio LAN (avvia-lan.cmd): installa ciò che manca, completa il pacchetto offline e rifà la
// build solo se i sorgenti sono cambiati. Solo la prima volta (o dopo un aggiornamento) serve internet.
//   node lan/prepare.mjs [--build]   (--build: rifà comunque la build)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, offlineStatus } from '../scripts/offline-assets.mjs';

const REPO = path.resolve(ROOT, '..'), LAN_TOOLS = path.join(REPO, 'tools/lan');
const run = (cmd, args, cwd) => {
  console.log(`> ${cmd} ${args.join(' ')}  (${path.relative(REPO, cwd) || '.'})`);
  // npm su Windows è un .cmd: serve la shell
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: cmd === 'npm' });
  return r.status === 0;
};
const fail = msg => { console.error(msg); process.exit(1); };

// file più recente sotto una cartella (o il file stesso)
function newest(target){
  const stat = fs.statSync(target, { throwIfNoEntry: false });
  if (!stat) return 0;
  if (!stat.isDirectory()) return stat.mtimeMs;
  let max = 0;
  for (const entry of fs.readdirSync(target)) if (entry !== 'node_modules') max = Math.max(max, newest(path.join(target, entry)));
  return max;
}
export function buildIsStale(root = ROOT){
  const built = fs.statSync(path.join(root, 'dist/index.html'), { throwIfNoEntry: false })?.mtimeMs || 0;
  const sources = ['src', 'index.html', 'index.css', 'styles.css', 'vite.config.ts', 'package.json', 'scripts', '../site/js', '../site/tennis/racchetta.html', '../site/assets/arena',
    // B27: pagina del telecomando dello staff, manifest e icone (copiati nella build come la pagina della racchetta)
    '../site/tennis/telecomando.html', '../site/tennis/telecomando.webmanifest', '../site/tennis/telecomando-192.png', '../site/tennis/telecomando-512.png']
    .map(p => newest(path.resolve(root, p)));
  return !built || Math.max(...sources) > built;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  if (!fs.existsSync(path.join(LAN_TOOLS, 'node_modules/ws')) && !run('npm', ['ci', '--no-audit', '--no-fund'], LAN_TOOLS))
    fail('Installazione delle dipendenze di tools/lan non riuscita: serve internet solo per questa prima installazione.');
  if (!fs.existsSync(path.join(ROOT, 'node_modules/vite/bin/vite.js')) || !fs.existsSync(path.join(ROOT, 'node_modules/@mediapipe/hands/hands.js'))){
    if (!run('npm', ['ci', '--no-audit', '--no-fund'], ROOT)) fail('Installazione delle dipendenze di natpf-tennis non riuscita: serve internet solo per questa prima installazione.');
  }
  const offline = offlineStatus();
  if (!offline.complete){
    console.log(`Pacchetto offline: mancano ${offline.missing.length} file, provo a scaricarli…`);
    run(process.execPath, ['scripts/download-assets.mjs'], ROOT);           // senza rete avvisa e prosegue
  }
  if (process.argv.includes('--build') || buildIsStale()){
    console.log('Build del gioco (dist/)…');
    if (!run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--logLevel', 'warn'], ROOT)) fail('Build non riuscita: vedi i messaggi sopra.');
  } else console.log('Build già aggiornata.');
}
