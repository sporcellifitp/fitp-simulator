import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dataDir, certificateDir, migrateCertificates } from './storage.mjs';

export function findBrowser(env = process.env, exists = fs.existsSync) {
  const roots = [env['ProgramFiles(x86)'], env.ProgramFiles, env.LOCALAPPDATA].filter(Boolean);
  for (const [name, suffix] of [['Edge', 'Microsoft/Edge/Application/msedge.exe'], ['Chrome', 'Google/Chrome/Application/chrome.exe']]) {
    for (const root of roots) { const exe = path.join(root, suffix); if (exists(exe)) return { name, exe }; }
  }
  throw Error('Installa Microsoft Edge oppure Google Chrome prima di avviare NATPF.');
}
export function browserArguments({ profile, kiosk = false, monitor = null, url = 'https://localhost:8443/?lan=1' }) {
  const args = [`--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check'];
  if (monitor) {
    for (const n of ['x', 'y', 'width', 'height']) if (!Number.isInteger(monitor[n])) throw Error('Dimensioni monitor non valide.');
    if (monitor.width <= 0 || monitor.height <= 0) throw Error('Dimensioni monitor non valide.');
    args.push(`--window-position=${monitor.x},${monitor.y}`, `--window-size=${monitor.width},${monitor.height}`);
  }
  // Edge's --kiosk is InPrivate and discards site settings. Use a persistent app
  // in fullscreen instead; this is an event display, not an OS access restriction.
  args.push(`--app=${url}`);
  if (kiosk) args.push('--start-fullscreen');
  return args;
}
export function listMonitors(run = execFileSync) {
  const script = 'Add-Type -AssemblyName System.Windows.Forms; @([System.Windows.Forms.Screen]::AllScreens | ForEach-Object { @{name=$_.DeviceName;primary=$_.Primary;x=$_.Bounds.X;y=$_.Bounds.Y;width=$_.Bounds.Width;height=$_.Bounds.Height} }) | ConvertTo-Json -Compress';
  const found = JSON.parse(run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', timeout: 10000 }));
  return Array.isArray(found) ? found : [found];
}
export async function startDesktop(args = {}) {
  if (process.platform !== 'win32') throw Error('Questo avvio desktop è per Windows. Per Linux usa lan/server.mjs.');
  if (!dataDir) throw Error('LOCALAPPDATA non disponibile.');
  if (args['import-certs']) {
    if (!migrateCertificates(path.resolve(args['import-certs']))) throw Error('Importazione non eseguita: esiste già una configurazione o manca la cartella indicata.');
  }
  const browser = findBrowser();
  const monitors = listMonitors();
  monitors.forEach((m, i) => console.log(`${i + 1}: ${m.name} · ${m.width}×${m.height}${m.primary ? ' (principale)' : ''}`));
  if (args['list-monitors']) return;
  const configPath = path.join(dataDir, 'desktop.json');
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') console.warn('Configurazione desktop non leggibile: uso il monitor principale.'); }
  const monitor = args.monitor ? monitors[Number(args.monitor) - 1] : monitors.find(m => m.name === saved.monitor) || monitors.find(m => m.primary) || monitors[0];
  if (!monitor) throw Error('Monitor non disponibile. Usa --list-monitors.');
  const kiosk = args.kiosk === true || (!args.app && saved.kiosk === true);
  const firewallScript = fileURLToPath(new URL('./firewall.ps1', import.meta.url));
  const networkSignature = JSON.stringify([process.execPath, browser.exe, fs.readFileSync(firewallScript, 'utf8')]);
  const marker = path.join(dataDir, 'firewall.json');
  let applied = ''; try { applied = fs.readFileSync(marker, 'utf8'); } catch {}
  if (applied !== networkSignature) {
    console.log('Windows chiederà il permesso per configurare la rete locale di NATPF.');
    try {
      execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', firewallScript], { stdio: 'inherit' });
      fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(marker, networkSignature);
    } catch { console.warn('Firewall non configurato: il gioco si apre, ma il telefono potrebbe non collegarsi. Riprova con SBLOCCA LA RETE.cmd.'); }
  }
  const { ensureCertificate, serveCa } = await import('./certificato.mjs');
  const certificate = ensureCertificate();
  // Verify trust every launch; a marker cannot detect removal from the Windows trust store.
  execFileSync('certutil.exe', ['-user', '-addstore', 'Root', certificate.files.publicCa], { stdio: 'inherit' });
  const { startNatpfLan } = await import('../../natpf-tennis/lan/server.mjs');
  const lan = await startNatpfLan({ open: false, upstream: false });
  let ca;
  try {
    if (!lan.game) throw Error(lan.status().message);
    ca = await serveCa();
    const child = spawn(browser.exe, browserArguments({ profile: path.join(dataDir, browser.name.toLowerCase()), kiosk, monitor }), { stdio: 'ignore' });
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ monitor: monitor.name, kiosk }, null, 2));
    console.log(`NATPF aperto in ${browser.name}. Certificati: ${certificateDir}`);
    console.log('Tieni aperta questa finestra. Per arrestare il server: Ctrl+C.');
    if (!lan.status().ready) console.warn('Nessun indirizzo LAN disponibile: collega il PC alla rete dei telefoni e riavvia.');
    for (const url of ca.urls) console.log(`Prima volta su questo telefono: ${url}`);
    const stop = async () => { ca.server.close(); await lan.close(); process.exit(); };
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, stop);
    return { lan, ca, child };
  } catch (error) { ca?.server.close(); await lan.close(); throw error; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(process.argv.slice(2).map(v => { const i = v.indexOf('='); return i < 0 ? [v.replace(/^--/, ''), true] : [v.slice(2, i), v.slice(i + 1)]; }));
  startDesktop(args).catch(error => { console.error(`Avvio desktop non riuscito: ${error.message}`); process.exitCode = 1; });
}
