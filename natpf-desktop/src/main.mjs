// NATPF Simulator per Windows (richiesta del 04/11/2026): eseguibile portatile e installabile con Electron.
// Il processo principale avvia nello stesso processo il server LAN già usato dal pacchetto zip (certificati in
// %LOCALAPPDATA%\NATPF, HTTPS 8443 per gioco e telefoni, pagina del certificato 8081) e apre il gioco a schermo intero
// sul monitor scelto. Il gioco è lo stesso della versione browser (natpf-tennis/dist): qui solo il guscio.
// Funzioni pure in desktop-core.mjs (provate con node:test). Niente API di Node nella pagina del gioco: solo
// window.natpfDesktop (preload.cjs) per lo schermo intero della finestra.
// Schermo intero senza cornici (richiesta del 04/11/2026, blocco B8): la finestra nasce già a schermo intero (nessuna
// cornice a vista all'avvio), Alt da solo non mostra il menu sopra il gioco, F11 e le altre scorciatoie funzionano
// anche quando la pagina blocca i tasti, il cambio di monitor avviene a finestra trasparente e lo schermo intero segue
// i cambi di risoluzione o di scala del monitor e il ledwall che si riaccende.
import { app, BrowserWindow, Menu, screen, powerSaveBlocker, session, dialog, shell, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { DESKTOP, chooseDisplay, nextDisplay, displayLabel, isOwnUrl, samePem, firewallCommand, elevatedPowershellArgs, ruleCoversExe, readSettings, writeSettings,
  windowedBounds, needsRefit, displayToFollow, shortcutFor, fullscreenTarget } from './desktop-core.mjs';

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
// monitor voluto (salvato o scelto all'avvio; cambia solo con una scelta dal menu o Ctrl+Maiusc+M) e monitor su cui il
// gioco è a schermo intero adesso (diverso dal voluto se quello è stato scollegato)
let wantedDisplayId = null, placedDisplayId = null;
let placing = false, pendingPlace = null;

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

// Barra del menu: a schermo intero mai visibile, nemmeno con Alt da solo (con «nascondi automaticamente» Alt la
// mostrerebbe sopra il gioco e le prenderebbe Invio e frecce); le scorciatoie restano attive. In finestra Alt la mostra.
function syncMenuBar(){
  if (!win) return;
  if (win.isFullScreen()){ win.setAutoHideMenuBar(false); win.setMenuBarVisibility(false); }
  else win.setAutoHideMenuBar(true);
}
function notifyFullscreen(){
  if (win && !placing) win.webContents.send(DESKTOP.ipcFullscreenChanged, win.isFullScreen());
}
function onFullscreenChanged(){
  syncMenuBar();
  if (win?.isFullScreen()) placedDisplayId = screen.getDisplayMatching(win.getBounds()).id;
  notifyFullscreen();
}
// esegue fn dopo l'evento della finestra (su Windows arriva subito, dentro setFullScreen) o dopo ms al più tardi;
// sempre al giro successivo, mai dentro l'evento stesso (fn controlla da sé che la finestra ci sia ancora)
function afterWindowEvent(name, ms, fn){
  let done = false;
  const go = () => { if (done) return; done = true; clearTimeout(timer); win?.removeListener(name, go); setImmediate(fn); };
  const timer = setTimeout(go, ms);
  win.once(name, go);
}

// Gioco su un monitor. remember: scelta dell'operatore (menu, Ctrl+Maiusc+M), salvata; false per gli spostamenti
// automatici (monitor scollegato, ricollegato, cambiato), che non cambiano il monitor voluto.
// A schermo intero: finestra trasparente → esce dallo schermo intero → rettangolo in finestra dentro il monitor nuovo
// → schermo intero (Windows lo mette sul monitor che contiene la finestra) → di nuovo visibile. Nessuna cornice a vista.
function placeOn(display, { remember = true } = {}){
  if (!win || !display) return;
  if (remember){ settings.displayId = display.id; wantedDisplayId = display.id; writeSettings(DATA, settings); }
  if (placing){ pendingPlace = display; return; }
  const rect = windowedBounds(display);
  if (!rect) return;
  if (!win.isFullScreen()){ win.setBounds(rect); placedDisplayId = display.id; buildMenu(); return; }
  placing = true;
  log('schermo intero sul monitor', { monitor: display.id, bounds: display.bounds, scala: display.scaleFactor, scelto: remember });
  win.setOpacity(0);
  afterWindowEvent('leave-full-screen', 400, () => {
    if (!win){ placing = false; return; }
    win.setBounds(rect);
    afterWindowEvent('enter-full-screen', 400, () => setTimeout(finish, 100));
    win.setFullScreen(true);
  });
  win.setFullScreen(false);
  function finish(){
    placing = false;
    if (!win) return;
    win.setOpacity(1);
    placedDisplayId = display.id;
    buildMenu();
    notifyFullscreen();
    if (pendingPlace){ const next = pendingPlace; pendingPlace = null; placeOn(next, { remember: false }); }
  }
}
// schermo intero acceso o spento (F11, menu, pagina del gioco): la scelta resta per i prossimi avvii.
// Risponde con lo stato nuovo, quando la finestra lo ha raggiunto (al più tardi dopo 1 s)
function setFullscreen(on){
  if (!win) return Promise.resolve(false);
  // durante il cambio di monitor (meno di mezzo secondo) la richiesta si ignora: risponde lo stato di prima
  if (placing) return Promise.resolve(settings.fullscreen !== false);
  settings.fullscreen = !!on; writeSettings(DATA, settings);
  if (win.isFullScreen() === !!on) return Promise.resolve(!!on);
  return new Promise(resolve => {
    afterWindowEvent(on ? 'enter-full-screen' : 'leave-full-screen', 1000, () => resolve(!!win?.isFullScreen()));
    win.setFullScreen(!!on);
  });
}
function toggleFullscreen(){ return win ? setFullscreen(!win.isFullScreen()) : Promise.resolve(false); }
function nextMonitor(){
  if (win) placeOn(nextDisplay(screen.getAllDisplays(), screen.getDisplayMatching(win.getBounds()).id));
}
// azioni delle scorciatoie (shortcutFor in desktop-core.mjs) e delle voci del menu con lo stesso id
const ACTIONS = {
  'schermo-intero': () => { toggleFullscreen(); },
  'monitor-successivo': () => nextMonitor(),
  ricarica: () => win?.webContents.reload(),
  esci: () => app.quit(),
  strumenti: () => win?.webContents.toggleDevTools(),
};

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
      // gli acceleratori qui servono da etichetta e quando la barra del menu ha il fuoco: con il fuoco sul gioco le
      // scorciatoie le esegue 'before-input-event' (che le toglie alla pagina e al menu: mai due volte)
      { id: 'schermo-intero', label: 'Schermo intero', accelerator: 'F11', click: ACTIONS['schermo-intero'] },
      { id: 'ricarica', label: 'Ricarica il gioco', accelerator: 'CmdOrCtrl+R', click: ACTIONS.ricarica },
      { type: 'separator' },
      { id: 'esci', label: 'Esci', accelerator: 'CmdOrCtrl+Q', click: ACTIONS.esci },
    ] },
    { label: 'Schermo', submenu: [
      ...displays.map((d, i) => ({ label: displayLabel(d, i, primaryId), type: 'radio', checked: d.id === current, click: () => placeOn(d) })),
      { type: 'separator' },
      { id: 'monitor-successivo', label: 'Monitor successivo', accelerator: 'CmdOrCtrl+Shift+M', click: ACTIONS['monitor-successivo'] },
    ] },
    { label: 'Rete', submenu: [
      { label: 'Apri la rete ai telefoni (firewall)…', click: () => openFirewall({ ask: false }) },
      { label: 'Indirizzi e certificato per i telefoni…', click: showAddresses },
    ] },
    { label: 'Aiuto', submenu: [
      { label: 'Cartella dei dati (certificati, registri)', click: () => shell.openPath(DATA) },
      { label: 'Scheda grafica in uso…', click: showGpu },
      { id: 'strumenti', label: 'Strumenti per sviluppatori', accelerator: 'CmdOrCtrl+Shift+I', click: ACTIONS.strumenti },
      { label: `Versione ${app.getVersion()}`, enabled: false },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  // il menu nuovo non deve comparire sopra il gioco a schermo intero
  syncMenuBar();
}

// Monitor cambiato con il gioco aperto (risoluzione, scala, ledwall riconfigurato): Windows non riadatta da solo lo
// schermo intero. Dopo 300 ms senza altri cambi, se la finestra non copre più il monitor, si rimette lo schermo intero
let refitTimer = null, refitChanges = new Set();
function onDisplayMetricsChanged(_e, display, changed = []){
  if (!win || !changed.some(c => c === 'bounds' || c === 'scaleFactor')) return;
  if (String(display.id) !== String(placedDisplayId)) return;
  for (const c of changed) refitChanges.add(c);
  clearTimeout(refitTimer);
  refitTimer = setTimeout(() => {
    const what = [...refitChanges]; refitChanges = new Set();
    const d = screen.getAllDisplays().find(x => x.id === display.id);
    buildMenu();
    if (!win || !d || placing || !win.isFullScreen() || !needsRefit(win.getBounds(), d.bounds)) return;
    log('monitor cambiato: riadatto lo schermo intero', { monitor: d.id, finestra: win.getBounds(), monitorOra: d.bounds, scala: d.scaleFactor, cambiato: what });
    placeOn(d, { remember: false });
  }, 300);
}

async function main(){
  await app.whenReady();
  // permessi chiesti dal gioco (webcam, schermo intero, schermo acceso, monitor): solo per le proprie pagine
  const allowed = new Set(['media', 'fullscreen', 'wakeLock', 'window-management', 'clipboard-sanitized-write', 'notifications']);
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb, details) => cb(allowed.has(permission) && isOwnUrl(details?.requestingUrl || '', addresses)));
  session.defaultSession.setPermissionCheckHandler((_wc, permission, origin) => allowed.has(permission) && isOwnUrl(origin || '', addresses));
  const display = chooseDisplay(screen.getAllDisplays(), { savedId: settings.displayId, primaryId: screen.getPrimaryDisplay().id });
  wantedDisplayId = placedDisplayId = display?.id ?? null;
  // già a schermo intero dalla creazione (su Windows la finestra nascosta diventa senza bordi e grande quanto il monitor
  // che contiene il rettangolo di partenza; show() la mostra così): niente finestra con la cornice all'avvio.
  // Cornice normale (non la finestra senza cornice di Electron, che si limiterebbe a coprire il monitor senza lo schermo
  // intero di Windows) e niente kiosk: lo schermo intero vero di Windows, sopra la barra delle applicazioni
  win = new BrowserWindow({ ...(windowedBounds(display) || {}), fullscreen: settings.fullscreen !== false, show: false, backgroundColor: '#050a1c',
    title: 'NATPF Simulator', autoHideMenuBar: true, icon: path.join(ROOT, 'icon.ico'),
    webPreferences: { preload: path.join(ROOT, DESKTOP.preload), contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  // menu e barra del menu subito: l'evento di schermo intero della creazione è già passato (buildMenu → syncMenuBar)
  buildMenu();
  win.on('enter-full-screen', onFullscreenChanged);
  win.on('leave-full-screen', onFullscreenChanged);
  // in finestra l'operatore può trascinarla su un altro monitor: è lì che il gioco sta adesso
  win.on('moved', () => { if (win && !placing && !win.isFullScreen()) placedDisplayId = screen.getDisplayMatching(win.getBounds()).id; });
  win.on('closed', () => { win = null; app.quit(); });
  win.once('ready-to-show', () => win?.show());
  // scorciatoie prima della pagina: la pagina non le riceve (Esc e le lettere sì)
  win.webContents.on('before-input-event', (event, input) => {
    const action = shortcutFor(input);
    if (!action) return;
    event.preventDefault();
    ACTIONS[action]?.();
  });
  // window.natpfDesktop (preload.cjs): solo dalla finestra del gioco e dalle pagine del proprio server
  ipcMain.handle(DESKTOP.ipcFullscreen, (event, action) => {
    if (!win || event.sender?.id !== win.webContents.id || !isOwnUrl(event.senderFrame?.url || '', addresses)) throw new Error('richiesta non consentita');
    const on = fullscreenTarget(action, win.isFullScreen());
    if (on === null) throw new Error('azione non valida');
    return action === 'get' ? on : setFullscreen(on);
  });
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
  // monitor aggiunti o tolti (ledwall acceso dopo il programma): il menu si aggiorna; se sparisce il monitor del gioco,
  // il gioco va sul principale; quando il monitor voluto torna, il gioco ci ritorna
  screen.on('display-added', (_e, added) => {
    buildMenu();
    const back = win && displayToFollow(added, { wantedId: wantedDisplayId, currentId: screen.getDisplayMatching(win.getBounds()).id });
    if (back){ log('monitor del gioco ricollegato', { monitor: back.id }); placeOn(back, { remember: false }); }
  });
  screen.on('display-removed', () => {
    buildMenu();
    if (win && !screen.getAllDisplays().some(d => String(d.id) === String(placedDisplayId))) placeOn(screen.getPrimaryDisplay(), { remember: false });
  });
  screen.on('display-metrics-changed', onDisplayMetricsChanged);
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
