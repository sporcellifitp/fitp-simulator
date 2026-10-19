// NATPF Simulator · motore base in LAN, anche senza internet: un server HTTPS sul computer per gioco, telefono e 1v1.
//   node lan/server.mjs [--port=8443] [--setup-port=8080] [--cert=… --key=…] [--no-open] [--offline]
// Riusa l'avvio guidato di NATPF (tools/lan/launcher.mjs): guida su http://127.0.0.1:8080/lan/ (solo questo computer),
// controllo del certificato (coppia, scadenza, IP di rete esatti), segnalazione WebRTC del telefono su /lan-signal.
// Il certificato è lo stesso di NATPF: tools/lan/certs/cert.pem e key.pem (vedi tools/lan/README.md, mkcert).
// Le richieste del gioco le gestisce lan/game-handler.mjs (build dist/, relay 1v1, pacchetto offline, pagina /natpf/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGameHandler } from './game-handler.mjs';
import { ROOT, offlineStatus, defaultAssetDirs } from '../scripts/offline-assets.mjs';

export const GAME_PATH = '/?lan=1';

// Stato mostrato da /lan/status (guida e menu del gioco): build presente e pacchetto offline completo.
export function gameStatus({ root = ROOT, distDir = path.join(root, 'dist') } = {}){
  let cached = null, at = 0;
  return () => {
    if (!cached || Date.now() - at > 10000){
      // anche il pacchetto offline copiato nella build (dist/assets) conta: nel pacchetto LAN è l'unico
      let offline;
      try { offline = offlineStatus(root, [{ dir: path.join(distDir, 'assets') }, ...defaultAssetDirs(root)]); }
      catch { offline = { complete: true, missing: [], total: 0 }; }
      cached = { game: 'natpf-tennis', build: fs.existsSync(path.join(distDir, 'index.html')), offline: { complete: offline.complete, missing: offline.missing.length, total: offline.total } };
      at = Date.now();
    }
    return cached;
  };
}

export async function startNatpfLan({ port = 8443, setupPort = 8080, open = true, cert, key, upstream = true, root = ROOT } = {}){
  let launchLan;
  try { ({ launchLan } = await import('../../tools/lan/launcher.mjs')); }
  catch (error){ throw new Error(`mancano le dipendenze di tools/lan (${error.code || error.message}). Esegui «npm ci» nella cartella tools/lan, oppure avvia natpf-tennis/avvia-lan.cmd`); }
  const handler = createGameHandler({ root, upstream });
  const launcher = await launchLan({ port, setupPort, open, ...(cert ? { cert } : {}), ...(key ? { key } : {}), handler, gamePath: GAME_PATH, title: 'NATPF Simulator · motore base', extraStatus: gameStatus({ root }) });
  launcher.handler = handler;
  return launcher;
}

// Indirizzi di rete nella finestra del programma, appena il server HTTPS è pronto (e di nuovo se cambiano).
function printAddresses(launcher, setupPort){
  let last = '';
  const show = () => {
    const s = launcher.status(), sig = JSON.stringify([s.ready, s.urls, s.message, s.addresses]);
    if (sig === last) return; last = sig;
    console.log('');
    console.log(`Indirizzi di rete del computer: ${s.addresses.join(', ') || 'nessuno (controlla la Wi-Fi)'}`);
    if (s.ready){
      console.log('Gioco pronto in HTTPS. Apri sul computer (e dal P2 sull\'altro computer) uno di questi indirizzi:');
      for (const url of s.urls) console.log(`  ${url}`);
      console.log('Il telefono si collega con il QR mostrato dal gioco (Racchetta → Smartphone).');
    } else {
      console.log(`HTTPS non ancora pronto: ${s.message}`);
      console.log(`Segui la guida: http://127.0.0.1:${setupPort}/lan/ (certificato in tools/lan/certs, vedi tools/lan/README.md)`);
    }
    if (!s.build) console.log('ATTENZIONE: manca la build (dist/). Esegui «npm run build» in natpf-tennis o riapri avvia-lan.cmd.');
    if (s.offline && !s.offline.complete) console.log(`Pacchetto offline incompleto: mancano ${s.offline.missing} file su ${s.offline.total} (npm run assets con la rete). Il gioco parte lo stesso.`);
  };
  show();
  return setInterval(show, 2000);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const args = Object.fromEntries(process.argv.slice(2).map(v => { const i = v.indexOf('='); return i < 0 ? [v.replace(/^--/, ''), true] : [v.slice(0, i).replace(/^--/, ''), v.slice(i + 1)]; }));
  const setupPort = Number(args['setup-port'] || 8080);
  try {
    const launcher = await startNatpfLan({ port: Number(args.port || 8443), setupPort, open: !args['no-open'], cert: args.cert, key: args.key, upstream: !args.offline });
    const timer = printAddresses(launcher, launcher.setup.server.address().port);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { clearInterval(timer); await launcher.close(); process.exit(); });
  } catch (error){ console.error(`Avvio LAN non riuscito: ${error.message}`); process.exitCode = 1; }
}
