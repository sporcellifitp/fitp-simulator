// NATPF Simulator per Windows (richiesta del 04/11/2026) con Electron. Dal 07/11/2026 un solo installer (niente più
// portatile) che si aggiorna dal gioco: aggiornamenti.mjs, esposto alla pagina come window.natpfDesktop.updates.
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
import { DESKTOP, chooseDisplay, nextDisplay, isOwnUrl, samePem, firewallCommand, elevatedPowershellArgs, ruleCoversExe, readSettings, writeSettings,
  windowedBounds, needsRefit, displayToFollow, shortcutFor, fullscreenTarget, initialWanted, placeMode, UPDATE_ACTIONS,
  startupDisplayQuestion, displayAnswer, displaysState, displayPixels,
  COMMANDS, PAGE_COMMANDS, staffMenu, appMenu, menuCommands, contextMenuMode, navigationAllowed, downloadTarget, downloadAllowed,
  busyPort, netstatListener, tasklistImage, startupProblem } from './desktop-core.mjs';
import { UPDATES, Updater, readUpdateConfig, updateEnv, installerLaunchArgs } from './aggiornamenti.mjs';
import { REGISTRO_PC, creaCodaRegistro, leggiIndirizzo } from './registro.mjs';

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
// B39 n. 5: un errore non gestito nel processo principale (prima: la finestra inglese di Electron «A JavaScript error
// occurred in the main process» con il solo «OK», e niente nel registro) va nel registro e in una finestra italiana con
// «Continua», «Riavvia il programma» e «Chiudi il programma». Una finestra alla volta; gli altri errori solo nel registro
let crashBox = false;
process.on('uncaughtException', e => {
  log('errore non gestito', e?.stack || String(e));
  if (crashBox || !app.isReady()) return;
  crashBox = true;
  dialog.showMessageBox(win && !win.isDestroyed() ? win : undefined, { type: 'error', title: 'NATPF Simulator', message: 'Errore nel programma.',
    detail: `${String(e?.message || e).slice(0, 300)}\n\nSe il gioco non risponde, riavvia il programma. Registro: ${LOG}`,
    buttons: ['Continua', 'Riavvia il programma', 'Chiudi il programma'], defaultId: 0, cancelId: 0, noLink: true })
    .then(r => { crashBox = false; if (r.response === 1) restartApp(); else if (r.response === 2) app.quit(); }, () => { crashBox = false; });
});
process.on('unhandledRejection', e => log('promessa rifiutata senza gestione', e?.stack || String(e)));
function restartApp(){ log('riavvio del programma'); app.relaunch(); app.quit(); }

// registro dello stand (B30): coda dei blocchi di righe di gioco non ancora inviati, accanto a programma.log. Sul PC
// resta solo quello che non è ancora arrivato allo spazio Cloudflare dell'utente (src/registro.mjs)
// L'indirizzo del Worker dell'utente sta in registro.json del pacchetto (scripts/prepara.mjs): vuoto → solo coda
const registro = creaCodaRegistro({ dir: path.join(DATA, 'log', REGISTRO_PC.cartella), log, url: leggiIndirizzo(path.join(app.getAppPath(), REGISTRO_PC.config)) });

// regola del firewall (la crea l'installer; dal menu Rete si rifà)
const RULE = DESKTOP.ruleName;

// --- aggiornamenti dal gioco (richiesta del 07/11/2026) -------------------------------------------------------------
// Indirizzo base in aggiornamenti.json del pacchetto (vuoto → 'off'). Attivi solo nel programma installato (c'è la
// disinstallazione accanto all'eseguibile): l'installer è per il computer e sa aggiornare sopra se stesso. Su Linux
// (prova-linux) con NATPF_AGGIORNAMENTI_PROVA=1 l'installazione è simulata: non si avvia niente e non si chiude.
const BUILD = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).natpfBuild || ''; } catch { return ''; } })();
const INSTALLED = process.platform === 'win32' && app.isPackaged && fs.existsSync(path.join(path.dirname(process.execPath), DESKTOP.uninstaller));
const SIMULATE_INSTALL = process.platform !== 'win32' && process.env[UPDATES.envSimulate] === '1';
// l'indirizzo dall'ambiente (NATPF_AGGIORNAMENTI_BASE) vale solo nelle prove: nel programma costruito vince sempre
// aggiornamenti.json del pacchetto (una variabile dell'utente non deve poter indicare un altro installer da approvare)
const updateConfig = readUpdateConfig(path.join(ROOT, UPDATES.config), updateEnv(process.env, { packaged: app.isPackaged, simulate: SIMULATE_INSTALL }));
function launchInstaller(file){
  if (SIMULATE_INSTALL){ log('aggiornamenti: installazione simulata (prova)', { file, argomenti: UPDATES.installerArgs }); return Promise.resolve({ ok: true }); }
  // PowerShell esce quando l'installer è partito (dopo il «Sì» del permesso di Windows) o con errore se il permesso è
  // rifiutato: in quel caso il programma resta aperto. PowerShell non si chiude mai a forza: se la finestra del
  // permesso resta aperta più di 10 minuti si torna a «pronto» con l'avviso, e un «Sì» dato dopo chiude comunque il
  // programma (l'installer è partito e lo aspetta)
  return new Promise(resolve => {
    let answered = false;
    const answer = r => { if (!answered){ answered = true; resolve(r); } };
    const wait = setTimeout(() => answer({ ok: false, error: 'La finestra del permesso di Windows è ancora aperta: se rispondi «Sì», l\'aggiornamento parte e il gioco si chiude.' }), 10*60*1000);
    execFile('powershell.exe', installerLaunchArgs(file), { windowsHide: true }, (err, _out, stderr) => {
      clearTimeout(wait);
      if (!err){
        if (answered){ log('aggiornamenti: permesso dato dopo l\'attesa, installer avviato: chiusura del programma'); setTimeout(() => app.quit(), 300); }
        return answer({ ok: true });
      }
      const why = `${stderr || ''} ${err.message || ''}`;
      log('aggiornamenti: installer non avviato', why.trim().slice(0, 500));
      answer({ ok: false, error: /cancel|annull|1223/i.test(why) ? 'Aggiornamento annullato: serve il permesso di Windows («Sì» nella finestra di Controllo dell\'account utente).' : 'Installazione non avviata: riprova.' });
    });
  });
}
const updater = new Updater({ current: BUILD, base: updateConfig.base, hosts: updateConfig.hosts, dir: path.join(DATA, UPDATES.dir),
  enabled: INSTALLED || SIMULATE_INSTALL, launch: launchInstaller, log,
  // install() risponde alla pagina, poi il programma si chiude e libera i file e le porte; l'installer riapre il gioco
  quit: () => { if (SIMULATE_INSTALL) log('aggiornamenti: chiusura simulata (prova)'); else setTimeout(() => app.quit(), 300); } });
let win = null, lan = null, ca = null, certPath = null, addresses = [], settings = readSettings(DATA), blocker = null;
// monitor voluto (quello salvato anche se adesso manca, altrimenti quello scelto all'avvio; cambia solo con una scelta
// dal menu o Ctrl+Maiusc+M) e monitor su cui il gioco è a schermo intero adesso (diverso dal voluto se quello è
// scollegato o non ancora acceso)
let wantedDisplayId = null, placedDisplayId = null;
// monitor di partenza valido solo per questo avvio (domanda del monitor senza risposta con un ledwall salvato e spento)
let sessionDisplayId = null;
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

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// pagina «Avvio del gioco…» (e, B39, il motivo quando il gioco non parte: si legge sul ledwall anche se la finestra di
// Windows con «Riprova» compare altrove). Tasto destro: i comandi del programma (contextMenuMode 'avvio')
const loading = (text, note = '') => `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html lang="it"><body style="margin:0;height:100vh;display:grid;place-items:center;background:#050a1c;color:#f4f6fc;font:600 22px system-ui,sans-serif"><div style="text-align:center;max-width:80vw"><div style="font:italic 800 56px system-ui,sans-serif;letter-spacing:.02em">NATPF <span style="color:#ff3d8b;font-size:28px">SIMULATOR</span></div><p>${esc(text)}</p>${note ? `<p style="font-weight:400;font-size:18px;color:#c9d2ee">${esc(note)}</p>` : ''}</div></body></html>`)}`;
let loadingShown = false;
async function showLoading(text, note = ''){ loadingShown = true; try { await win?.loadURL(loading(text, note)); } catch (e){ log('pagina di avvio non mostrata', e.message); } }

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
  // (B39: la pagina dell'avvio guidato su una porta scelta dal sistema, DESKTOP.setupPort = 0: nel programma non serve)
  lan = await startNatpfLan({ open: false, upstream: false, port: DESKTOP.port, setupPort: DESKTOP.setupPort });
  if (!lan.game){ const s = lan.status(); await stopServers(); throw new Error(s.message || 'server del gioco non avviato'); }
  try { ca = await serveCa({ port: DESKTOP.caPort, ips: addresses.filter(ip => ip !== '127.0.0.1') }); }
  catch (e){ log('pagina del certificato non avviata', e.message); }
  const s = lan.status();
  log('server pronto', { indirizzi: s.addresses, urls: s.urls, pronto: s.ready });
  return s;
}
// B39: server chiusi prima di riprovare (porta occupata): la pagina dell'avvio guidato e il controllo del certificato del
// tentativo di prima non devono restare accesi
async function stopServers(){
  try { await lan?.close?.(); } catch (e){ log('chiusura del server', e.message); }
  try { ca?.server?.close(); } catch {}
  lan = null; ca = null;
}
// chi tiene una porta (solo Windows, al più 5 s): { pid, name } o null
function execText(file, args){ return new Promise(resolve => execFile(file, args, { windowsHide: true, timeout: 5000 }, (err, out) => resolve(err ? '' : String(out)))); }
async function portOwner(port){
  if (process.platform !== 'win32' || !port) return null;
  const pid = netstatListener(await execText('netstat', ['-ano']), port);
  if (!pid) return null;
  return { pid, name: tasklistImage(await execText('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'])) };
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
// A schermo intero (placeMode in desktop-core.mjs): già sul monitor e lo copre → niente; stesso monitor che non copre
// più → rettangolo del monitor restando a schermo intero, poi si ricontrolla; altro monitor (o il rettangolo non è
// bastato) → giro completo: finestra trasparente → esce dallo schermo intero → rettangolo in finestra dentro il monitor
// nuovo → schermo intero (Windows lo mette sul monitor che contiene la finestra) → di nuovo visibile. Nessuna cornice.
function placeOn(display, { remember = true, inPlaceTried = false } = {}){
  if (!win || !display) return;
  // (con la misura: se Windows cambia l'id dello stesso ledwall, all'avvio lo si ritrova senza chiedere, B27)
  if (remember){ settings.displayId = display.id; settings.display = displayPixels(display); wantedDisplayId = display.id; writeSettings(DATA, settings); }
  if (placing){ pendingPlace = display; return; }
  const rect = windowedBounds(display);
  if (!rect) return;
  if (!win.isFullScreen()){ win.setBounds(rect); placedDisplayId = display.id; buildMenu(); return; }
  const mode = placeMode({ currentId: screen.getDisplayMatching(win.getBounds()).id, targetId: display.id,
    bounds: win.getBounds(), displayBounds: display.bounds, inPlaceTried });
  if (mode === 'fermo'){ placedDisplayId = display.id; buildMenu(); return; }
  if (mode === 'rettangolo'){
    // niente setOpacity: la finestra non diventa «a strati» su Windows. Dopo 200 ms placeOn ricontrolla: 'fermo' se il
    // monitor è coperto, altrimenti il giro completo
    placing = true;
    log('schermo intero riadattato sul monitor', { monitor: display.id, finestra: win.getBounds(), bounds: display.bounds, scala: display.scaleFactor });
    win.setBounds(display.bounds);
    setTimeout(() => {
      placing = false;
      if (!win) return;
      if (pendingPlace){ const next = pendingPlace; pendingPlace = null; placeOn(next, { remember: false }); return; }
      placeOn(screen.getAllDisplays().find(x => x.id === display.id) || display, { remember: false, inPlaceTried: true });
    }, 200);
    return;
  }
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
  if (!win) return;
  const next = nextDisplay(screen.getAllDisplays(), screen.getDisplayMatching(win.getBounds()).id);
  // un solo monitor: niente da spostare (e nessuna finestra trasparente per niente)
  if (!next){ log('monitor successivo: c\'è un solo monitor'); return; }
  placeOn(next);
}
// azioni delle scorciatoie (shortcutFor in desktop-core.mjs) e delle voci dei menu (COMMANDS, stesso id). B39: anche il
// menu del tasto destro; arg: il monitor scelto, o 'open' per il pannello dello stand dal tasto destro
const ACTIONS = {
  'schermo-intero': () => { toggleFullscreen(); },
  monitor: id => { const d = screen.getAllDisplays().find(x => String(x.id) === String(id)); if (d) placeOn(d); },
  'monitor-successivo': () => nextMonitor(),
  ricarica: () => { log('ricarica del gioco (comando)'); win?.webContents.reload(); },
  riavvia: () => restartApp(),
  // (B39: «Esci» non tocca la scelta dello schermo intero; prima col solo mouse si usciva da «Esci da schermo intero» e
  // dalla X della finestra, e il programma ripartiva in finestra)
  esci: () => { log('uscita (comando)'); app.quit(); },
  strumenti: () => win?.webContents.toggleDevTools(),
  'pannello-stand': arg => staffPanel(arg === 'open' ? 'open' : 'toggle'),
  diagnostica: () => pageCommand('diagnostica'),
  calibra: () => pageCommand('calibra'),
  'azzera-calibrazione': () => pageCommand('azzera-calibrazione'),
  'rete-apri': () => openFirewall({ ask: false }),
  'rete-indirizzi': () => showAddresses(),
  aggiornamenti: () => updatesDialog(),
  'cartella-salvati': () => openFolder(downloadsDir()),
  'cartella-dati': () => openFolder(DATA),
  'scheda-grafica': () => showGpu(),
};
// (ogni comando dei menu ha la sua azione: controllato all'avvio, e dalle prove su COMMANDS)
for (const id of Object.keys(COMMANDS)) if (typeof ACTIONS[id] !== 'function') log('ATTENZIONE: comando senza azione', id);
function runCommand(cmd, arg){
  try { log('comando', { cmd, ...(arg != null ? { arg } : {}) }); ACTIONS[cmd]?.(arg); }
  catch (e){ log('comando non riuscito', cmd, e.message); }
}
// B37: pannello dello stand (F9, menu NATPF; B39: tasto destro, che lo apre): il comando va solo alla finestra del gioco e
// solo se mostra una pagina del proprio server (stesse regole degli altri canali); la pagina lo apre o lo chiude
// (natpf_kiosk.js)
function staffPanel(action = 'toggle'){
  if (!win || !isOwnUrl(win.webContents.getURL(), addresses)) return;
  win.webContents.send(DESKTOP.ipcStaffPanel, action === 'open' ? 'open' : 'toggle');
}
// B39: comandi del tasto destro per la pagina (diagnostica, calibrazione dello schermo): stesse regole, e solo quelli
// dell'elenco congelato PAGE_COMMANDS (il preload li controlla di nuovo)
function pageCommand(cmd){
  if (!PAGE_COMMANDS.includes(cmd) || !win || !isOwnUrl(win.webContents.getURL(), addresses)) return;
  win.webContents.send(DESKTOP.ipcCommand, cmd);
}
// B39: avvisi alla pagina del gioco (file salvato, link negato): solo dati semplici, mai percorsi completi
function pageNotice(n){
  if (!win || !isOwnUrl(win.webContents.getURL(), addresses)) return;
  win.webContents.send(DESKTOP.ipcNotice, n);
}
// cartelle che il programma apre in Esplora file: le sceglie il programma (per chiave dal menu), mai la pagina
function downloadsDir(){
  let base; try { base = app.getPath('downloads'); } catch { base = null; }
  return base ? path.join(base, DESKTOP.downloadsFolder) : path.join(DATA, 'salvati');
}
async function openFolder(dir){
  try { fs.mkdirSync(dir, { recursive: true }); const err = await shell.openPath(dir); if (err) log('cartella non aperta', err); }
  catch (e){ log('cartella non aperta', e.message); }
}
// B39 · menu del tasto destro (decisione dell'utente: menu di Windows al puntatore, con i comandi dello staff). Le voci
// vengono da staffMenu (desktop-core.mjs); qui diventano voci di Electron. Le scorciatoie accanto ai nomi sono solo
// scritte: le esegue 'before-input-event'
function electronMenu(items, { context = false } = {}){
  return items.map(i => {
    if (i.type === 'separator') return { type: 'separator' };
    const out = { label: i.label };
    if (i.role) out.role = i.role;
    if (i.type) out.type = i.type;
    if (i.checked != null) out.checked = !!i.checked;
    if (i.enabled === false) out.enabled = false;
    if (i.accel){ out.accelerator = i.accel; if (context) out.registerAccelerator = false; }
    if (i.cmd) out.click = () => runCommand(i.cmd, i.arg);
    if (i.submenu) out.submenu = electronMenu(i.submenu, { context });
    return out;
  });
}
function displaysForMenu(){
  return { displays: screen.getAllDisplays(), primaryId: screen.getPrimaryDisplay().id, currentId: win ? screen.getDisplayMatching(win.getBounds()).id : null };
}
function showContextMenu(params = {}){
  if (!win) return;
  const mode = contextMenuMode(win.webContents.getURL(), addresses, { loading: loadingShown });
  if (!mode) return;
  const items = staffMenu({ gamePage: mode === 'gioco', fullscreen: win.isFullScreen(), editable: !!params.isEditable, version: BUILD || app.getVersion(), ...displaysForMenu() });
  log('menu del tasto destro', { pagina: mode, voci: menuCommands(items).length });
  // (senza x e y: si apre dove c'è il puntatore)
  Menu.buildFromTemplate(electronMenu(items, { context: true })).popup({ window: win });
}

// firewall: regola per questo eseguibile (l'installazione la crea; se manca il programma la chiede all'apertura)
function netsh(args){ return new Promise(resolve => execFile('netsh', args, { windowsHide: true, timeout: 10000 }, (err, out) => resolve(err ? '' : String(out)))); }
async function firewallReady(){
  if (process.platform !== 'win32') return true;
  return ruleCoversExe(await netsh(['advfirewall', 'firewall', 'show', 'rule', `name=${RULE}`, 'verbose']), process.execPath);
}
async function openFirewall({ ask = true } = {}){
  if (process.platform !== 'win32') return true;
  if (ask){
    // B39 n. 19: senza risposta entro DESKTOP.firewallAskMs vale «Più tardi» (prima il gioco restava su «Avvio del
    // gioco…» finché qualcuno non rispondeva, anche con la domanda su un altro schermo)
    const waitMs = (!app.isPackaged && Number(process.env.NATPF_FIREWALL_ATTESA_MS)) || DESKTOP.firewallAskMs;
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), waitMs);
    let r = { response: 1 };
    try {
      r = await dialog.showMessageBox(win, { type: 'question', buttons: ['Apri la rete ai telefoni', 'Più tardi'], defaultId: 0, cancelId: 1, title: 'NATPF Simulator', signal: ctrl.signal,
        message: 'I telefoni devono poter raggiungere questo computer.', detail: `Windows chiederà il permesso di amministratore per aprire NATPF Simulator alla rete locale (solo dispositivi della stessa rete). Si fa una volta per ogni posizione del programma.\n\nSe nessuno risponde entro ${Math.round(waitMs/1000)} secondi il gioco parte lo stesso («Più tardi»): la rete si apre dopo con il tasto destro → «Rete per i telefoni».` });
    } catch (e){ log('domanda del firewall non riuscita', e.message); }
    clearTimeout(timer);
    if (ctrl.signal.aborted) log('firewall: nessuna risposta, più tardi');
    if (ctrl.signal.aborted || r.response !== 0) return false;
  }
  const ok = await new Promise(resolve => execFile('powershell.exe', elevatedPowershellArgs(firewallCommand(process.execPath, RULE)), { windowsHide: true, timeout: 120000 }, err => resolve(!err)));
  const ready = await firewallReady();
  log('firewall', { richiesto: ok, pronto: ready, exe: process.execPath, regola: RULE });
  if (!ready) dialog.showMessageBox(win, { type: 'warning', title: 'NATPF Simulator', message: 'Rete non aperta.', detail: 'Il gioco funziona, ma i telefoni potrebbero non collegarsi. Riprova con il tasto destro sul gioco → «Rete per i telefoni» → «Apri la rete ai telefoni», oppure chiedi a chi gestisce il PC.' });
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

// stato degli aggiornamenti alla pagina del gioco (solo se è una pagina del proprio server) e sulla barra delle
// applicazioni (avanzamento del download)
function onUpdateState(s){
  if (!win) return;
  try { win.setProgressBar(s.status === 'downloading' ? Math.max(0.01, s.progress || 0) : -1); } catch {}
  if (isOwnUrl(win.webContents.getURL(), addresses)) win.webContents.send(DESKTOP.ipcUpdatesChanged, s);
}
// Aiuto → Cerca aggiornamenti…: la stessa cosa del gioco, con le finestre di Windows (se la pagina del gioco non
// risponde o per chi usa il menu). Niente parte senza i clic dell'utente
async function updatesDialog(){
  const box = opts => dialog.showMessageBox(win, { title: 'NATPF Simulator', ...opts });
  let s = updater.state();
  if (s.status === 'off'){
    await box({ type: 'info', message: 'Aggiornamenti non attivi in questa copia.', detail: updateConfig.base ? 'Gli aggiornamenti dal gioco funzionano nel programma installato con NATPF-Simulator-Setup.' : 'Indirizzo degli aggiornamenti non impostato: installa una versione nuova a mano.' });
    return;
  }
  if (!['ready', 'available', 'downloading'].includes(s.status)) s = await updater.check();
  if (s.status === 'none'){ await box({ type: 'info', message: 'Hai già l\'ultima versione.', detail: `Versione ${s.current}.` }); return; }
  if (s.status === 'error' || s.status === 'checking'){ await box({ type: 'warning', message: 'Controllo degli aggiornamenti non riuscito.', detail: s.error || 'Riprova tra poco.' }); return; }
  if (s.status === 'installing') return;
  const mb = s.size ? ` (${Math.round(s.size/1e6)} MB)` : '';
  const ask = await box({ type: 'question', buttons: [s.status === 'ready' ? 'Installa' : 'Scarica e installa', 'Più tardi'], defaultId: 0, cancelId: 1,
    message: `È disponibile la versione ${s.latest}${mb}.`, detail: `${s.notes ? `${s.notes}\n\n` : ''}Versione in uso: ${s.current}. Il download avviene mentre giochi; l'avanzamento è sulla barra delle applicazioni.` });
  if (ask.response !== 0) return;
  if (s.status !== 'ready') s = await updater.download();
  if (s.status !== 'ready'){ await box({ type: 'warning', message: 'Download non riuscito.', detail: s.error || 'Riprova.' }); return; }
  const go = await box({ type: 'question', buttons: ['Installa ora', 'Più tardi'], defaultId: 0, cancelId: 1, message: `Versione ${s.latest} pronta da installare.`,
    detail: 'Windows chiederà il permesso di amministratore (Controllo dell\'account utente): rispondi «Sì». Il gioco si chiude e si riapre aggiornato in meno di un minuto. Impostazioni e certificati restano.' });
  if (go.response !== 0) return;
  const r = await updater.install();
  if (!r.ok) await box({ type: 'warning', message: 'Aggiornamento non avviato.', detail: r.error || '' });
}

// monitor per la pagina del gioco (window.natpfDesktop.displays, B27): elenco, quello del gioco, quello voluto
function displaysNow(){
  const primaryId = screen.getPrimaryDisplay().id;
  return displaysState(screen.getAllDisplays(), { primaryId, currentId: placing ? null : (win ? screen.getDisplayMatching(win.getBounds()).id : null), wantedId: wantedDisplayId });
}
function notifyDisplays(){
  if (win && !placing && isOwnUrl(win.webContents.getURL(), addresses)) win.webContents.send(DESKTOP.ipcDisplaysChanged, displaysNow());
}
// risposta alla pagina quando lo spostamento è finito (al più tardi dopo 2 s)
function afterPlaced(){
  return new Promise(resolve => { const t0 = Date.now(); const check = () => (!placing || Date.now() - t0 > 2000) ? resolve(displaysNow()) : setTimeout(check, 50); setTimeout(check, 30); });
}
// Domanda all'avvio «Su quale schermo mostro il gioco?» (B27): sullo schermo principale (il portatile, dove guarda chi
// avvia il programma), prima di aprire il gioco. Senza risposta entro DESKTOP.askDisplayMs vale la proposta (il ledwall
// probabile), che si salva come una scelta: la domanda non torna, e il monitor si cambia dal pannello dello stand
// («Schermo del gioco»), dal telecomando dello staff, dal menu Schermo o con Ctrl+Maiusc+M.
// Nelle prove (programma non costruito) NATPF_SCHERMO_ATTESA_MS accorcia l'attesa
// (prova-linux, solo nel programma non costruito: NATPF_PROVA_MONITOR con un elenco di monitor finti per la sola domanda,
// perché lo schermo virtuale di Linux ha un monitor solo)
function displaysForQuestion(){
  if (!app.isPackaged && process.env.NATPF_PROVA_MONITOR){ try { const d = JSON.parse(process.env.NATPF_PROVA_MONITOR); if (Array.isArray(d) && d.length) return { displays: d, primaryId: d[0].id }; } catch {} }
  return { displays: screen.getAllDisplays(), primaryId: screen.getPrimaryDisplay().id };
}
async function askDisplay(){
  const { displays, primaryId } = displaysForQuestion();
  const q = startupDisplayQuestion(displays, settings, primaryId);
  log('scelta del monitor all\'avvio', { chiedo: q.ask, motivo: q.why, proposto: q.proposed, monitor: q.choices.map(c => c.label) });
  if (q.remap != null){ settings.displayId = q.remap; writeSettings(DATA, settings); return; }
  if (!q.ask) return;
  const waitMs = (!app.isPackaged && Number(process.env.NATPF_SCHERMO_ATTESA_MS)) || DESKTOP.askDisplayMs;
  const idx = Math.max(0, q.choices.findIndex(c => c.id === q.proposed));
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), waitMs);
  let clicked = null;
  try {
    const r = await dialog.showMessageBox({ type: 'question', title: 'NATPF Simulator', noLink: false, signal: ctrl.signal,
      // ultimo pulsante (ed Esc o la finestra chiusa): «decidi tu», come nessuna risposta
      buttons: [...q.choices.map(c => c.label), 'Decidi tu'], defaultId: idx, cancelId: q.choices.length,
      message: 'Su quale schermo mostro il gioco?',
      detail: `Ci sono ${q.choices.length} schermi collegati. Scegli quello dei visitatori (il ledwall).\n\nLa scelta resta salvata per i prossimi avvii; si cambia dal Pannello dello stand («Schermo del gioco»), dal telecomando dello staff o con Ctrl+Maiusc+M.\n\nCon «Decidi tu», o se nessuno risponde entro ${Math.round(waitMs/1000)} secondi, uso «${q.choices[idx].label}».` });
    if (!ctrl.signal.aborted && q.choices[r.response]) clicked = q.choices[r.response].id;
  } catch (e){ log('domanda del monitor non riuscita', e.message); }
  clearTimeout(timer);
  // senza risposta e con un monitor salvato che adesso manca: la proposta vale solo per questa sessione (displayAnswer)
  const a = displayAnswer(q, clicked, settings);
  const chosen = q.choices.find(c => c.id === a.use), d = displays.find(x => x.id === a.use);
  log('monitor del gioco', { monitor: chosen?.label, come: a.how, salvato: a.save });
  if (d && a.save){ settings.displayId = d.id; settings.display = displayPixels(d); writeSettings(DATA, settings); }
  else if (d) sessionDisplayId = d.id;
}

function buildMenu(){
  // B39: le voci vengono dallo stesso elenco del menu del tasto destro (appMenu, COMMANDS in desktop-core.mjs). Gli
  // acceleratori qui servono da etichetta e quando la barra del menu ha il fuoco: con il fuoco sul gioco le scorciatoie le
  // esegue 'before-input-event' (che le toglie alla pagina e al menu: mai due volte). B37: la voce del pannello è senza
  // acceleratore, il tasto F9 è già nel nome
  const template = electronMenu(appMenu({ version: BUILD || app.getVersion(), ...displaysForMenu() }));
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  // il menu nuovo non deve comparire sopra il gioco a schermo intero
  syncMenuBar();
  // (il menu si rifà a ogni cambio di monitor: la pagina riceve lo stato nuovo)
  notifyDisplays();
}

// B39 n. 8: pagina del gioco che non risponde (onUnresponsive / onResponsive, eventi della finestra). Nelle prove (programma
// non costruito) NATPF_ATTESA_BLOCCO_MS e NATPF_RICARICA_BLOCCO_MS accorciano le attese
let hangTimer = null, hang = null;
function hangWaits(){
  const t = name => (!app.isPackaged && Number(process.env[name])) || 0;
  return { dialog: t('NATPF_ATTESA_BLOCCO_MS') || DESKTOP.hangDialogMs, reload: t('NATPF_RICARICA_BLOCCO_MS') || DESKTOP.hangReloadMs };
}
// ricarica di una pagina bloccata: il processo della pagina si chiude e il gioco si ricarica (render-process-gone)
function reloadHung(){
  if (!win) return;
  try { win.webContents.forcefullyCrashRenderer(); } catch {}
  setTimeout(() => { if (win && win.webContents.isCrashed?.()) win.webContents.reload(); }, 2500);
}
function onUnresponsive(){
  if (hangTimer || hang) return;
  log('pagina del gioco: non risponde');
  const waits = hangWaits();
  hangTimer = setTimeout(async () => {
    hangTimer = null;
    if (!win) return;
    const h = hang = { ctrl: new AbortController(), back: false };
    const auto = setTimeout(() => h.ctrl.abort(), waits.reload);
    log('pagina del gioco: finestra «Il gioco non risponde»');
    let r = null;
    try {
      r = await dialog.showMessageBox(win, { type: 'warning', title: 'NATPF Simulator', signal: h.ctrl.signal, noLink: true,
        buttons: ['Ricarica il gioco', 'Aspetta', 'Chiudi il programma'], defaultId: 0, cancelId: 1,
        message: 'Il gioco non risponde.', detail: `Ricarica il gioco: si riparte dal menu (la partita in corso si chiude). Aspetta: se il gioco torna a rispondere questa finestra si chiude da sola.\n\nSe nessuno risponde entro ${Math.round(waits.reload/1000)} secondi il gioco si ricarica da solo.` });
    } catch (e){ log('finestra del blocco non riuscita', e.message); }
    clearTimeout(auto);
    hang = null;
    if (h.back) return;
    if (h.ctrl.signal.aborted){ log('pagina del gioco: nessuna risposta, ricarica automatica'); reloadHung(); return; }
    log('pagina del gioco bloccata: scelta', { risposta: ['ricarica', 'aspetta', 'chiudi'][r?.response] || r?.response });
    if (r?.response === 0) reloadHung();
    else if (r?.response === 2) app.quit();
  }, waits.dialog);
}
function onResponsive(){
  clearTimeout(hangTimer); hangTimer = null;
  if (hang){ hang.back = true; hang.ctrl.abort(); }
  log('pagina del gioco: risponde di nuovo');
}
// B39 n. 16: i file che il gioco salva (classifica CSV, coda del registro, diagnostica) vanno subito in Download\NATPF,
// senza la finestra «Salva con nome»; la pagina lo dice con un avviso (nome del file e cartella, mai il percorso intero).
// Solo dalla finestra del gioco e dalle pagine del proprio server (downloadAllowed)
function onWillDownload(event, item, wc){
  const url = item.getURL();
  if (!win || wc !== win.webContents || !downloadAllowed(url, addresses)){ log('download negato', String(url).slice(0, 120)); event.preventDefault(); return; }
  let file;
  try {
    const dir = downloadsDir(); fs.mkdirSync(dir, { recursive: true });
    file = downloadTarget(dir, item.getFilename(), p => fs.existsSync(p));
    item.setSavePath(file);
  } catch (e){ log('download: cartella non pronta', e.message); event.preventDefault(); pageNotice({ kind: 'download', ok: false, name: '', folder: '' }); return; }
  const name = path.basename(file), folder = `Download › ${DESKTOP.downloadsFolder}`;
  item.once('done', (_e, state) => {
    log('file salvato', { file, stato: state, byte: item.getReceivedBytes() });
    pageNotice({ kind: 'download', ok: state === 'completed', name, folder });
  });
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
  // due o più monitor e nessuno scelto: la domanda, prima di aprire il gioco (B27)
  await askDisplay();
  const display = chooseDisplay(screen.getAllDisplays(), { savedId: sessionDisplayId ?? settings.displayId, primaryId: screen.getPrimaryDisplay().id });
  // ledwall salvato ma ancora spento: il gioco parte su un altro monitor e ci va quando il ledwall compare (display-added)
  wantedDisplayId = initialWanted(settings, display);
  placedDisplayId = display?.id ?? null;
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
  // in finestra l'operatore può trascinarla su un altro monitor: è lì che il gioco sta adesso. B39 n. 19: e lì resta ai
  // prossimi avvii (prima il monitor trascinato non si ricordava)
  win.on('moved', () => {
    if (!win || placing || win.isFullScreen()) return;
    const d = screen.getDisplayMatching(win.getBounds());
    placedDisplayId = d.id;
    if (String(d.id) !== String(wantedDisplayId)){ settings.displayId = d.id; settings.display = displayPixels(d); wantedDisplayId = d.id; writeSettings(DATA, settings); log('monitor scelto trascinando la finestra', { monitor: d.id }); buildMenu(); }
  });
  win.on('closed', () => { win = null; app.quit(); });
  win.once('ready-to-show', () => win?.show());
  // scorciatoie prima della pagina: la pagina non le riceve (Esc e le lettere sì)
  win.webContents.on('before-input-event', (event, input) => {
    const action = shortcutFor(input);
    if (!action) return;
    event.preventDefault();
    ACTIONS[action]?.();
  });
  // B39 · tasto destro: il menu dei comandi dello staff al puntatore (pagine del proprio server; sulla pagina di avvio solo
  // i comandi del programma). Il gioco non usa il tasto destro
  win.webContents.on('context-menu', (_e, params) => showContextMenu(params));
  // B39 n. 17: niente finestre nuove sopra il gioco («Apri il link del controller ↗» è per il telefono; la pagina lo dice
  // da sé, qui la riserva per ogni altro window.open) e la finestra del gioco resta sulle pagine del proprio server
  // (file trascinati, link esterni)
  win.webContents.setWindowOpenHandler(({ url }) => { log('finestra nuova negata', String(url).slice(0, 120)); pageNotice({ kind: 'link' }); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (event, url) => { if (!navigationAllowed(url, addresses)){ event.preventDefault(); log('pagina negata', String(url).slice(0, 120)); } });
  // B39 n. 3: il tasto laterale «indietro» del mouse riportava alla pagina «Avvio del gioco…» (e a schermo intero non
  // se ne usciva): sulle pagine del gioco la cronologia si svuota, indietro non c'è niente
  win.webContents.on('did-navigate', (_e, url) => {
    if (isOwnUrl(url, addresses)){ loadingShown = false; try { win.webContents.navigationHistory.clear(); } catch (e){ log('cronologia non svuotata', e.message); } }
  });
  // B39 n. 8: pagina del gioco bloccata. Dopo DESKTOP.hangDialogMs la finestra «Il gioco non risponde» (Ricarica il gioco ·
  // Aspetta · Chiudi il programma), che si chiude da sola se il gioco torna a rispondere; senza risposta entro
  // DESKTOP.hangReloadMs il gioco si ricarica da solo (stand senza staff davanti)
  win.on('unresponsive', onUnresponsive);
  win.on('responsive', onResponsive);
  // window.natpfDesktop (preload.cjs): solo dalla finestra del gioco e dalle pagine del proprio server
  ipcMain.handle(DESKTOP.ipcFullscreen, (event, action) => {
    if (!win || event.sender?.id !== win.webContents.id || !isOwnUrl(event.senderFrame?.url || '', addresses)) throw new Error('richiesta non consentita');
    const on = fullscreenTarget(action, win.isFullScreen());
    if (on === null) throw new Error('azione non valida');
    return action === 'get' ? on : setFullscreen(on);
  });
  // window.natpfDesktop.updates: stesse regole (solo la finestra del gioco, solo le pagine del proprio server)
  ipcMain.handle(DESKTOP.ipcUpdates, (event, action) => {
    if (!win || event.sender?.id !== win.webContents.id || !isOwnUrl(event.senderFrame?.url || '', addresses)) throw new Error('richiesta non consentita');
    if (!UPDATE_ACTIONS.includes(action)) throw new Error('azione non valida');
    return updater[action]();
  });
  // window.natpfDesktop.displays (B27): monitor del gioco dal pannello dello stand e dal telecomando dello staff.
  // list → stato; next → monitor successivo (salvato); choose(id) → quel monitor (salvato). Stesse regole degli altri
  ipcMain.handle(DESKTOP.ipcDisplays, async (event, action, id) => {
    if (!win || event.sender?.id !== win.webContents.id || !isOwnUrl(event.senderFrame?.url || '', addresses)) throw new Error('richiesta non consentita');
    if (action === 'list') return displaysNow();
    if (action === 'next'){ nextMonitor(); return afterPlaced(); }
    if (action === 'choose'){ const d = screen.getAllDisplays().find(x => String(x.id) === String(id)); if (!d) throw new Error('monitor non trovato'); placeOn(d); return afterPlaced(); }
    throw new Error('azione non valida');
  });
  // window.natpfDesktop.registro (B30): coda del registro dello stand. Stesse regole degli altri canali; accetta solo
  // blocchi del registro (controllaBlocco) e solo le azioni previste; i file li nomina registro.mjs, mai la pagina
  ipcMain.handle(DESKTOP.ipcRegistro, async (event, action, a, b) => {
    if (!win || event.sender?.id !== win.webContents.id || !isOwnUrl(event.senderFrame?.url || '', addresses)) throw new Error('richiesta non consentita');
    if (!REGISTRO_PC.azioni.includes(action)) throw new Error('azione non valida');
    if (action === 'put') return registro.put(a, b);
    if (action === 'list') return registro.list();
    if (action === 'read') return registro.read(a);
    if (action === 'remove') return registro.remove(a);
    if (action === 'state') return registro.state();
    try { fs.mkdirSync(registro.dir, { recursive: true }); const err = await shell.openPath(registro.dir); return { ok: !err }; } catch { return { ok: false }; }
  });
  updater.onChange(onUpdateState);
  session.defaultSession.on('will-download', onWillDownload);
  await showLoading('Avvio del gioco…');
  blocker = powerSaveBlocker.start('prevent-display-sleep');
  // firewall prima del server: con la regola già presente Windows non mostra il suo avviso (se lì si preme «Annulla»
  // Windows crea regole di blocco). L'installazione l'ha già creata; se qualcuno l'ha tolta, si chiede qui
  if (!(await firewallReady())) await openFirewall();
  // B39 n. 5: porta occupata (8443 del gioco): finestra italiana con la porta vera, chi la tiene (se si sa), «Riprova» e
  // «Chiudi il programma»; lo stesso testo sulla pagina di avvio (sul ledwall). Prima l'errore inglese di Electron con il
  // solo «OK» (la 8080 dell'avvio guidato) o la 8443 sempre nominata, e il programma si chiudeva
  for (;;){
    try { await startServers(); break; }
    catch (e){
      log('avvio non riuscito', e.stack || e.message);
      const port = busyPort(e.message), owner = port ? await portOwner(port) : null;
      const p = startupProblem(e.message, { port, owner, logPath: LOG });
      log('motivo', { porta: p.port, chi: owner });
      await showLoading(p.message, p.detail);
      const r = await dialog.showMessageBox(win, { type: 'error', title: 'NATPF Simulator', message: p.message, detail: p.detail, noLink: true,
        buttons: ['Riprova', 'Chiudi il programma'], defaultId: 0, cancelId: 1 });
      if (r.response !== 0){ app.quit(); return; }
      await showLoading('Avvio del gioco…');
    }
  }
  // monitor aggiunti o tolti (ledwall acceso dopo il programma): il menu si aggiorna; se sparisce il monitor del gioco,
  // il gioco va sul principale; quando il monitor voluto (anche quello salvato e spento all'avvio) compare, ci va
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
  // cronaca dell'intro nel registro (B26): quale video è partito all'avvio, quando e perché. La scrive il gioco nella
  // console della pagina (natpf-tennis/src/natpf/natpf_intro.js, righe «[natpf-intro] …»); qui solo quelle righe
  win.webContents.on('console-message', (event, _level, message) => {
    const text = String(event?.message ?? message ?? '');
    if (text.startsWith('[natpf-intro]')) log(text.slice(0, 600));
  });
  win.webContents.on('render-process-gone',(_e, d) => { log('pagina del gioco chiusa', d); if (d.reason !== 'clean-exit'){ registro.crash(d.reason); setTimeout(() => win?.webContents.reload(), 1000); } });
  await win.loadURL(`https://localhost:${DESKTOP.port}${DESKTOP.gamePath}`);
  // aggiornamenti: un controllo qualche secondo dopo l'avvio, senza bloccare niente (senza internet: stato 'error', il
  // gioco va avanti). Scaricare e installare solo con il clic dell'utente
  log('aggiornamenti', { stato: updater.state().status, versione: BUILD, indirizzo: updateConfig.base || '(non impostato)', installato: INSTALLED, prova: SIMULATE_INSTALL, errore: updateConfig.error });
  if (updater.enabled){
    updater.cleanup();
    // (B55: dopo il controllo, l'installer della versione di prima in sottofondo, se manca: così il ritorno vale offline)
    setTimeout(() => { updater.check().catch(() => {}).then(() => updater.prefetchPrevious()).catch(() => {}); }, UPDATES.startupDelayMs);
  }
}

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => {
  try { if (blocker != null) powerSaveBlocker.stop(blocker); } catch {}
  try { ca?.server?.close(); } catch {}
  try { lan?.close?.(); } catch {}
});
if (FIRST) main().catch(e => { log('errore', e.stack || e.message); dialog.showErrorBox('NATPF Simulator', e.message); app.quit(); });
