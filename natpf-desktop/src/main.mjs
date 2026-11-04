// NATPF Simulator per Windows (richiesta del 04/11/2026): eseguibile portatile e installabile con Electron.
// Il processo principale avvia nello stesso processo il server LAN già usato dal pacchetto zip (certificati in
// %LOCALAPPDATA%\NATPF, HTTPS 8443 per gioco e telefoni, pagina del certificato 8081) e apre il gioco a schermo intero
// sul monitor scelto. Il gioco è lo stesso della versione browser (natpf-tennis/dist): qui solo il guscio.
// Funzioni pure in desktop-core.mjs (provate con node:test). Niente API di Node nella pagina del gioco.
import { app, BrowserWindow, Menu, screen, powerSaveBlocker, session, dialog, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { DESKTOP, chooseDisplay, nextDisplay, displayLabel, isOwnUrl, samePem, firewallCommand, elevatedPowershellArgs, ruleCoversExe, readSettings, writeSettings } from './desktop-core.mjs';

const ROOT = app.getAppPath();
const DATA = path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'NATPF');
// profilo del browser (impostazioni del gioco, record) con i dati di NATPF: uguale per portatile e installato
app.setPath('userData', path.join(DATA, 'programma'));
// Chromium: suoni senza tocco, niente rallentamenti in secondo piano, indirizzi LAN veri nel WebRTC (i telefoni li
// raggiungono senza mDNS), scheda grafica più potente se ce ne sono due
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns,CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('force_high_performance_gpu');
// PC noleggiato con scheda grafica bloccata da Chromium (driver vecchi): WebGL in software invece dello schermo nero
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

const LOG = path.join(DATA, 'log', 'programma.log');
function log(...a){
  const line = `${new Date().toISOString()} ${a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')}\n`;
  try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, line); } catch {}
  console.log(line.trim());
}

// versione portatile (un .exe che si estrae in una cartella temporanea): regola del firewall con un nome suo
const PORTABLE = !!process.env.PORTABLE_EXECUTABLE_DIR;
const RULE = PORTABLE ? `${DESKTOP.ruleName} portatile` : DESKTOP.ruleName;
let win = null, lan = null, ca = null, certPath = null, addresses = [], settings = readSettings(DATA), blocker = null;

const FIRST = app.requestSingleInstanceLock();
if (!FIRST) app.quit();
app.on('second-instance', () => { if (win){ if (win.isMinimized()) win.restore(); win.focus(); } });

// il gioco usa il certificato del proprio server (firmato dall'autorità locale di questo computer): il programma se ne
// fida senza installare nulla in Windows. Solo per i propri indirizzi e solo se è proprio quel certificato
app.on('certificate-error', (event, _wc, url, _error, certificate, callback) => {
  let own = false;
  try { own = isOwnUrl(url, addresses) && certPath && samePem(certificate?.data, fs.readFileSync(certPath, 'utf8')); } catch {}
  if (own){ event.preventDefault(); callback(true); } else callback(false);
});

const loading = text => `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html lang="it"><body style="margin:0;height:100vh;display:grid;place-items:center;background:#050a1c;color:#f4f6fc;font:600 22px system-ui,sans-serif"><div style="text-align:center"><div style="font:italic 800 56px system-ui,sans-serif;letter-spacing:.02em">NATPF <span style="color:#ff3d8b;font-size:28px">SIMULATOR</span></div><p>${text}</p></div></body></html>`)}`;

async function startServers(){
  const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
  const { certificateDir } = await imp('tools/lan/storage.mjs');
  const { ensureCertificate, serveCa } = await imp('tools/lan/certificato.mjs');
  const { lanAddresses } = await imp('tools/lan/server.mjs');
  const cert = ensureCertificate();
  certPath = path.join(certificateDir, 'cert.pem');
  addresses = lanAddresses();
  log('certificato', { ips: cert.ips, nuovo: cert.renewed, cartella: certificateDir });
  const { startNatpfLan } = await imp('natpf-tennis/lan/server.mjs');
  lan = await startNatpfLan({ open: false, upstream: false, port: DESKTOP.port, setupPort: DESKTOP.setupPort });
  if (!lan.game){ const s = lan.status(); throw new Error(s.message || 'server del gioco non avviato'); }
  try { ca = await serveCa({ port: DESKTOP.caPort, ips: addresses.filter(ip => ip !== '127.0.0.1') }); }
  catch (e){ log('pagina del certificato non avviata', e.message); }
  const s = lan.status();
  log('server pronto', { indirizzi: s.addresses, urls: s.urls, pronto: s.ready });
  return s;
}

function placeOn(display){
  if (!win || !display) return;
  const full = win.isFullScreen();
  if (full) win.setFullScreen(false);
  win.setBounds(display.bounds);
  settings.displayId = display.id; writeSettings(DATA, settings);
  if (full || settings.fullscreen !== false) setTimeout(() => win?.setFullScreen(true), 150);
  buildMenu();
}
function toggleFullscreen(){
  if (!win) return;
  const on = !win.isFullScreen(); win.setFullScreen(on);
  settings.fullscreen = on; writeSettings(DATA, settings);
}

// firewall: regola per questo eseguibile (l'installazione la crea; il portatile la chiede alla prima apertura)
function netsh(args){ return new Promise(resolve => execFile('netsh', args, { windowsHide: true, timeout: 10000 }, (err, out) => resolve(err ? '' : String(out)))); }
async function firewallReady(){
  if (process.platform !== 'win32') return true;
  return ruleCoversExe(await netsh(['advfirewall', 'firewall', 'show', 'rule', `name=${RULE}`, 'verbose']), process.execPath);
}
async function openFirewall({ ask = true } = {}){
  if (process.platform !== 'win32') return true;
  if (ask){
    const r = await dialog.showMessageBox(win, { type: 'question', buttons: ['Apri la rete ai telefoni', 'Più tardi'], defaultId: 0, cancelId: 1, title: 'NATPF Simulator',
      message: 'I telefoni devono poter raggiungere questo computer.', detail: 'Windows chiederà il permesso di amministratore per aprire NATPF Simulator alla rete locale (solo dispositivi della stessa rete). Si fa una volta per ogni posizione del programma.' });
    if (r.response !== 0) return false;
  }
  const ok = await new Promise(resolve => execFile('powershell.exe', elevatedPowershellArgs(firewallCommand(process.execPath, RULE)), { windowsHide: true, timeout: 120000 }, err => resolve(!err)));
  const ready = await firewallReady();
  log('firewall', { richiesto: ok, pronto: ready, exe: process.execPath, regola: RULE });
  if (!ready) dialog.showMessageBox(win, { type: 'warning', title: 'NATPF Simulator', message: 'Rete non aperta.', detail: 'Il gioco funziona, ma i telefoni potrebbero non collegarsi. Riprova dal menu Rete → «Apri la rete ai telefoni», oppure chiedi a chi gestisce il PC.' });
  return ready;
}

function showAddresses(){
  const s = lan?.status?.() || {};
  const urls = (ca?.urls || []).join('\n') || 'nessuno (il computer non è collegato a una rete)';
  dialog.showMessageBox(win, { type: 'info', title: 'NATPF Simulator', message: 'Rete del computer',
    detail: `Indirizzi del computer: ${(s.addresses || []).join(', ') || 'nessuno'}\n\nPrima volta su un telefono (certificato della rete NATPF), sulla stessa Wi-Fi apri:\n${urls}\n\nPoi inquadra il QR mostrato dal gioco.` });
}

// scheda grafica usata dal gioco (integrata o dedicata, accelerazione attiva o software): pagina di Chromium
function showGpu(){
  const w = new BrowserWindow({ width: 1000, height: 800, title: 'Scheda grafica · NATPF Simulator', autoHideMenuBar: true, icon: path.join(ROOT, 'icon.ico') });
  w.setMenuBarVisibility(false);
  w.loadURL('chrome://gpu');
}

function buildMenu(){
  const displays = screen.getAllDisplays(), primaryId = screen.getPrimaryDisplay().id;
  const current = win ? screen.getDisplayMatching(win.getBounds()).id : null;
  const template = [
    { label: 'NATPF', submenu: [
      { label: 'Schermo intero', accelerator: 'F11', click: toggleFullscreen },
      { label: 'Ricarica il gioco', accelerator: 'CmdOrCtrl+R', click: () => win?.webContents.reload() },
      { type: 'separator' },
      { label: 'Esci', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
    ] },
    { label: 'Schermo', submenu: [
      ...displays.map((d, i) => ({ label: displayLabel(d, i, primaryId), type: 'radio', checked: d.id === current, click: () => placeOn(d) })),
      { type: 'separator' },
      { label: 'Monitor successivo', accelerator: 'CmdOrCtrl+Shift+M', click: () => placeOn(nextDisplay(screen.getAllDisplays(), screen.getDisplayMatching(win.getBounds()).id)) },
    ] },
    { label: 'Rete', submenu: [
      { label: 'Apri la rete ai telefoni (firewall)…', click: () => openFirewall({ ask: false }) },
      { label: 'Indirizzi e certificato per i telefoni…', click: showAddresses },
    ] },
    { label: 'Aiuto', submenu: [
      { label: 'Cartella dei dati (certificati, registri)', click: () => shell.openPath(DATA) },
      { label: 'Scheda grafica in uso…', click: showGpu },
      { label: 'Strumenti per sviluppatori', accelerator: 'CmdOrCtrl+Shift+I', click: () => win?.webContents.toggleDevTools() },
      { label: `Versione ${app.getVersion()}`, enabled: false },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function main(){
  await app.whenReady();
  // permessi chiesti dal gioco (webcam, schermo intero, schermo acceso, monitor): solo per le proprie pagine
  const allowed = new Set(['media', 'fullscreen', 'wakeLock', 'window-management', 'clipboard-sanitized-write', 'notifications']);
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb, details) => cb(allowed.has(permission) && isOwnUrl(details?.requestingUrl || '', addresses)));
  session.defaultSession.setPermissionCheckHandler((_wc, permission, origin) => allowed.has(permission) && isOwnUrl(origin || '', addresses));
  const display = chooseDisplay(screen.getAllDisplays(), { savedId: settings.displayId, primaryId: screen.getPrimaryDisplay().id });
  win = new BrowserWindow({ ...display.bounds, show: false, backgroundColor: '#050a1c', title: 'NATPF Simulator', autoHideMenuBar: true,
    icon: path.join(ROOT, 'icon.ico'), webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  win.setMenuBarVisibility(false);
  win.on('closed', () => { win = null; app.quit(); });
  win.once('ready-to-show', () => { win.show(); if (settings.fullscreen !== false) win.setFullScreen(true); });
  buildMenu();
  await win.loadURL(loading('Avvio del gioco…'));
  blocker = powerSaveBlocker.start('prevent-display-sleep');
  // firewall prima del server: con la regola già presente Windows non mostra il suo avviso (se lì si preme «Annulla»
  // Windows crea regole di blocco). Il portatile la chiede qui alla prima apertura; l'installazione l'ha già creata
  if (!(await firewallReady())) await openFirewall();
  try {
    await startServers();
  } catch (e){
    log('avvio non riuscito', e.stack || e.message);
    const busy = /EADDRINUSE|in uso|already in use/i.test(e.message);
    await dialog.showMessageBox(win, { type: 'error', title: 'NATPF Simulator', message: 'Il gioco non è partito.',
      detail: busy ? 'La porta 8443 è già in uso: chiudi l\'altra finestra di NATPF (per esempio «AVVIA NATPF LAN» o un altro NATPF Simulator) e riapri.' : `${e.message}\n\nRegistro: ${LOG}` });
    app.quit(); return;
  }
  // monitor aggiunti o tolti (ledwall acceso dopo il programma): il menu si aggiorna; se il monitor sparisce, il principale
  screen.on('display-added', buildMenu);
  screen.on('display-removed', () => { buildMenu(); if (win && !screen.getAllDisplays().some(d => d.id === settings.displayId)) placeOn(screen.getPrimaryDisplay()); });
  win.webContents.on('render-process-gone', (_e, d) => { log('pagina del gioco chiusa', d); if (d.reason !== 'clean-exit') setTimeout(() => win?.webContents.reload(), 1000); });
  await win.loadURL(`https://localhost:${DESKTOP.port}${DESKTOP.gamePath}`);
}

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => {
  try { if (blocker != null) powerSaveBlocker.stop(blocker); } catch {}
  try { ca?.server?.close(); } catch {}
  try { lan?.close?.(); } catch {}
});
if (FIRST) main().catch(e => { log('errore', e.stack || e.message); dialog.showErrorBox('NATPF Simulator', e.message); app.quit(); });
