// Prova del programma Windows su Linux (stesso codice di Electron, senza Windows): avvia la cartella app/ preparata
// con Electron per Linux in uno schermo virtuale (Xvfb) e la guida con Playwright (_electron). Controlla lo schermo
// intero senza cornici (blocco B8) in tre avvii, con le stesse porte e gli stessi certificati:
//   predefinito    pagina del gioco caricata, finestra a schermo intero dall'avvio, Alt da solo che non mostra la barra
//                  del menu (in finestra sì), F11 che esce e rientra anche se la pagina blocca i tasti, Esc che arriva
//                  alla pagina, window.natpfDesktop (preload) che cambia lo stato e avvisa la pagina, Ctrl+R che
//                  ricarica, Ctrl+Maiusc+M che con un solo monitor non fa niente, monitor cambiato (evento simulato),
//                  pagina estranea rifiutata
//   ledwall-spento monitor salvato che manca all'avvio (ledwall acceso dopo il programma): il gioco parte su quello che
//                  c'è e ci va quando compare (evento display-added simulato), un altro monitor non lo sposta
//   finestra       avvio in finestra (scelta salvata): Alt mostra e nasconde il menu, F11 va a schermo intero
//   gioco          il gioco vero con il ponte (schermo intero della finestra, mai quello di HTML)
//   domanda-monitor  (B27) due monitor finti (NATPF_PROVA_MONITOR: lo schermo virtuale ne ha uno solo, e Xvfb non
//                  ne fa due che Chromium veda, provato anche con Xinerama e con i monitor RandR): la domanda «Su quale
//                  schermo mostro il gioco?» compare, senza risposta vale il ledwall proposto (1024×1024) e si salva con
//                  la misura; al riavvio con lo stesso monitor non si chiede più; con un ledwall salvato e spento la
//                  proposta senza risposta vale solo per quell'avvio (il monitor salvato resta)
//   aggiornamenti  server degli aggiornamenti finto: controllo all'avvio senza download, check → available,
//                  download → ready con l'avanzamento e lo sha256, install() simulata (07/11/2026); in predefinito
//                  lo stato 'off' senza indirizzo e fuori dall'installazione
// I tasti si mandano con webContents.sendInputEvent (quelli di Playwright non passano dalle scorciatoie di Electron) e
// solo con la finestra visibile. Gli eventi dei monitor sono simulati (screen.emit): provano il collegamento, non
// Windows. Non controlla misure e posizione della finestra: senza gestore delle finestre Xvfb le riporta sbagliate.
//   cd natpf-tennis && npm run build                  (dist/ del gioco)
//   cd natpf-desktop && node scripts/prepara.mjs      (app/)
//   ELECTRON_SKIP_BINARY_DOWNLOAD= node node_modules/electron/install.js   (se manca Electron per Linux)
//   npm ci --prefix ../tools/e2e                      (se manca playwright-core)
//   node scripts/prova-linux.mjs [--display=:91] [--dati=cartella] [--senza-xvfb] [--tieni-dati]
//                                [--scenari=predefinito,ledwall-spento,finestra,gioco,domanda-monitor,aggiornamenti]
// Usa le porte del programma (8443, 8081, 8080): devono essere libere. Dati (certificati, impostazioni, registro) in
// --dati (predefinita: una cartella temporanea nuova), mai in quelli veri.
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DESKTOP } from '../src/desktop-core.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(HERE, '..');
const APP = path.join(HERE, 'app');
const args = Object.fromEntries(process.argv.slice(2).map(v => { const i = v.indexOf('='); return i < 0 ? [v.replace(/^--/, ''), true] : [v.slice(0, i).replace(/^--/, ''), v.slice(i + 1)]; }));
const DISPLAY = args['senza-xvfb'] ? process.env.DISPLAY : String(args.display || ':91');
const GAME = `https://localhost:${DESKTOP.port}${DESKTOP.gamePath}`;
const SCENARI = ['predefinito', 'ledwall-spento', 'finestra', 'gioco', 'domanda-monitor', 'aggiornamenti'];
const chosen = typeof args.scenari === 'string' ? args.scenari.split(',').map(s => s.trim()).filter(Boolean) : SCENARI;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = m => { console.error(m); process.exit(2); };

// --- prerequisiti -------------------------------------------------------------------------------------------------
const ELECTRON = path.join(HERE, 'node_modules/electron/dist/electron');
if (process.platform !== 'linux') fail('Questa prova è per Linux (su Windows si prova il programma vero: docs/COLLAUDO_WINDOWS.md).');
if (!fs.existsSync(ELECTRON)) fail('Manca Electron per Linux: ELECTRON_SKIP_BINARY_DOWNLOAD= node node_modules/electron/install.js');
for (const f of ['main.mjs', 'desktop-core.mjs', DESKTOP.preload, 'package.json']) if (!fs.existsSync(path.join(APP, f))) fail(`Manca app/${f}: esegui prima «node scripts/prepara.mjs».`);
if (!DISPLAY) fail('Con --senza-xvfb serve DISPLAY.');
for (const s of chosen) if (!SCENARI.includes(s)) fail(`Scenario sconosciuto: ${s} (${SCENARI.join(', ')}).`);
let electron;
try {
  const pw = createRequire(path.join(REPO, 'tools/e2e/package.json')).resolve('playwright-core');
  ({ _electron: electron } = await import(pathToFileURL(pw.replace(/index\.js$/, 'index.mjs')).href));
} catch { fail('Manca playwright-core: npm ci --prefix tools/e2e'); }
const PORTS = [DESKTOP.port, DESKTOP.caPort, DESKTOP.setupPort];
const portFree = port => new Promise(resolve => { const s = net.createServer(); s.once('error', () => resolve(false)); s.listen(port, '0.0.0.0', () => s.close(() => resolve(true))); });
const portsFree = async () => (await Promise.all(PORTS.map(portFree))).every(Boolean);
for (const port of PORTS) if (!(await portFree(port))) fail(`La porta ${port} è occupata (altro NATPF aperto?): il programma non partirebbe.`);

const ownData = !args.dati;
const DATI = path.resolve(args.dati || fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-prova-linux-')));
fs.mkdirSync(DATI, { recursive: true });
const NATPF = path.join(DATI, 'NATPF');
const SETTINGS = path.join(NATPF, DESKTOP.settingsFile);
const LOGFILE = path.join(NATPF, 'log/programma.log');
const results = [];
let current = '';
const check = (name, ok, detail = '') => { results.push({ name: `${current}: ${name}`, ok: !!ok, detail }); console.log(`${ok ? 'ok    ' : 'NON OK'} ${name}${detail ? ` · ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); };
const readLog = () => { try { return fs.readFileSync(LOGFILE, 'utf8'); } catch { return ''; } };
const readSaved = () => { try { return JSON.parse(fs.readFileSync(SETTINGS, 'utf8')); } catch { return {}; } };
const count = (text, what) => text.split(what).length - 1;

// --- schermo virtuale ---------------------------------------------------------------------------------------------
let xvfb = null;
async function startXvfb(){
  const n = DISPLAY.replace(/^:/, '').split('.')[0];
  if (fs.existsSync(`/tmp/.X${n}-lock`)) fail(`Lo schermo ${DISPLAY} è già in uso (/tmp/.X${n}-lock): scegli --display=:NN.`);
  xvfb = spawn('Xvfb', [DISPLAY, '-screen', '0', '1920x1080x24', '-nolisten', 'tcp'], { stdio: 'ignore' });
  xvfb.once('error', e => fail(`Xvfb non avviato: ${e.message}`));
  for (let i = 0; i < 50 && !fs.existsSync(`/tmp/.X11-unix/X${n}`); i++) await sleep(100);
  if (!fs.existsSync(`/tmp/.X11-unix/X${n}`)) fail(`Xvfb non pronto su ${DISPLAY}.`);
}

async function until(fn, ms, step = 100){
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end){ try { last = await fn(); if (last) return last; } catch {} await sleep(step); }
  return last;
}

// --- un avvio del programma ---------------------------------------------------------------------------------------
let app = null;
async function closeApp(){
  try { await Promise.race([app?.close(), sleep(10000)]); } catch {}
  try { app?.process()?.kill('SIGKILL'); } catch {}
  app = null;
  // il server del programma libera le porte all'uscita: il prossimo avvio le vuole libere
  if (!(await until(portsFree, 15000, 250))) throw new Error('porte del programma ancora occupate dopo la chiusura');
}
// seed: impostazioni del programma prima dell'avvio (desktop-app.json), null = nessuna
async function launch(seed, extraEnv = {}){
  fs.mkdirSync(NATPF, { recursive: true });
  if (seed) fs.writeFileSync(SETTINGS, JSON.stringify(seed)); else fs.rmSync(SETTINGS, { force: true });
  const logStart = readLog().length;
  // da root Chromium chiede --no-sandbox; la sandbox della pagina del gioco (sandbox:true) resta quella di Electron
  app = await electron.launch({ executablePath: ELECTRON, args: ['--no-sandbox', APP], timeout: 60000,
    env: { ...process.env, DISPLAY, LOCALAPPDATA: DATI, NATPF_DATA_DIR: NATPF, ELECTRON_ENABLE_LOGGING: '', NATPF_AGGIORNAMENTI_BASE: '', NATPF_AGGIORNAMENTI_PROVA: '', ...extraEnv } });
  // funzioni eseguite nel processo principale di Electron (una sola finestra: il gioco)
  const main = (fn, arg) => app.evaluate(fn, arg);
  const state = () => main(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; return w && { windows: BrowserWindow.getAllWindows().length, visible: w.isVisible(), fullscreen: w.isFullScreen(), menuVisible: w.isMenuBarVisible(), menuAutoHide: w.isMenuBarAutoHide(), opacity: w.getOpacity(), url: w.webContents.getURL(), loading: w.webContents.isLoading() }; });
  // fuoco solo se la finestra non l'ha, e poi attesa: quando cambia la finestra attiva Electron azzera lo stato di Alt
  // (NativeWindowViews::OnWidgetActivationChanged → ResetAltState) e un Alt a metà non mostrerebbe il menu. Con la
  // finestra attiva il fuoco non si tocca: dopo Alt ce l'ha la barra del menu, e toglierglielo la nasconde
  // (MenuBar::OnDidChangeFocus → RestoreFocus)
  const key = async (keyCode, modifiers = []) => {
    const focused = await main(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0], f = w.isFocused(); if (!f){ w.focus(); w.webContents.focus(); } return f; });
    if (!focused) await sleep(300);
    await main(({ BrowserWindow }, [k, m]) => {
      const w = BrowserWindow.getAllWindows()[0];
      w.webContents.sendInputEvent({ type: 'keyDown', keyCode: k, modifiers: m });
      w.webContents.sendInputEvent({ type: 'keyUp', keyCode: k, modifiers: m });
    }, [keyCode, modifiers]);
  };
  const page = code => main(({ BrowserWindow }, c) => BrowserWindow.getAllWindows()[0].webContents.executeJavaScript(c, true), code);
  const newLog = () => readLog().slice(logStart);
  // Alt fa il giro della pagina (il menu di Electron vede solo i tasti che la pagina non blocca): con il gioco in WebGL
  // software sotto Xvfb il menu cambia anche 400 ms dopo. menuAfterAlt aspetta lo stato voluto (al più 3 s)
  const menuAfterAlt = async visible => { await key('Alt'); return until(async () => { const x = await state(); return x.menuVisible === visible && x; }, 3000); };
  const first = await until(async () => { const s = await state(); return s?.visible && s; }, 30000);
  const gameLoaded = () => until(async () => { const s = await state(); return s && s.url.startsWith(GAME) && !s.loading && s; }, 120000, 250);
  return { main, state, key, page, newLog, first, gameLoaded, menuAfterAlt };
}

// --- predefinito: nessuna impostazione salvata ---------------------------------------------------------------------
async function predefinito(){
  const { main, state, key, page, newLog, first, gameLoaded, menuAfterAlt } = await launch(null);
  // 1. finestra visibile e a schermo intero già dalla pagina di avvio
  check('finestra visibile', first?.visible, first);
  check('schermo intero già alla prima comparsa della finestra', first?.fullscreen, { url: first?.url?.slice(0, 40) });

  // ascolto dei tasti registrato prima degli script del gioco (la schermata iniziale ferma i tasti con
  // stopImmediatePropagation: un ascolto aggiunto dopo non li vedrebbe). «block» imita la schermata iniziale
  // (preventDefault su ogni tasto). Vale dal caricamento successivo: dopo la pagina del gioco si ricarica con Ctrl+R
  const tab = await app.firstWindow();
  await tab.addInitScript(() => {
    window.__prova = { keys: [], ups: [], changes: [], block: false };
    addEventListener('keydown', e => { window.__prova.keys.push(e.key); if (window.__prova.block) e.preventDefault(); }, true);
    addEventListener('keyup', e => window.__prova.ups.push(e.key), true);
  });

  // 2. pagina del gioco dal server del programma
  const loaded = await gameLoaded();
  check('pagina del gioco caricata', loaded, loaded?.url);
  if (!loaded) throw new Error('pagina del gioco non caricata');
  await sleep(1000);
  // Ctrl+R ricarica il gioco (e da qui l'ascolto dei tasti è il primo della pagina)
  await page('window.__primaDiRicaricare = true; true');
  await key('R', ['control']);
  const reloaded = await until(async () => { const x = await state(); return x && x.url.startsWith(GAME) && !x.loading && (await page('!window.__primaDiRicaricare && typeof window.__prova === "object"')) && x; }, 60000, 250);
  check('Ctrl+R ricarica il gioco', reloaded, reloaded?.url);
  if (!reloaded) throw new Error('pagina non ricaricata');
  await sleep(1000);

  // 3. barra del menu: nascosta, non a scomparsa (Alt da solo non la mostra)
  let s = await state();
  check('barra del menu nascosta a schermo intero', s.fullscreen && !s.menuVisible && !s.menuAutoHide, s);
  // controllo negativo: si aspetta più del giro della pagina (1,5 s) prima di dire che il menu non è comparso
  await key('Alt'); await sleep(1500);
  s = await state();
  check('Alt da solo non mostra il menu a schermo intero', s.fullscreen && !s.menuVisible, s);

  // 4. F11 esce e rientra anche con la pagina che blocca i tasti; la pagina non riceve F11. In finestra Alt mostra
  // e nasconde il menu (con la pagina che non blocca Alt: il menu di Electron vede solo i tasti non bloccati)
  await page('__prova.block = true; __prova.keys.length = 0; true');
  await key('F11');
  s = await until(async () => { const x = await state(); return !x.fullscreen && x; }, 3000);
  check('F11 esce dallo schermo intero (pagina che blocca i tasti)', s && !s.fullscreen && s.menuAutoHide && !s.menuVisible, s);
  const blockedKeys = await page('__prova.block = false; __prova.keys.slice()');
  const altShown = await menuAfterAlt(true);
  const altHidden = await menuAfterAlt(false);
  check('in finestra Alt mostra il menu e Alt lo nasconde', altShown?.menuVisible && altHidden && !altHidden.menuVisible && !altHidden.fullscreen, { dopoAlt: altShown?.menuVisible, dopoAltAncora: altHidden?.menuVisible });
  await page('__prova.block = true; true');
  await key('F11');
  s = await until(async () => { const x = await state(); return x.fullscreen && x; }, 3000);
  check('F11 rientra nello schermo intero, menu nascosto', s?.fullscreen && !s.menuVisible && !s.menuAutoHide, s);
  const afterF11 = [...blockedKeys, ...(await page('__prova.block = false; __prova.keys.slice()'))];
  check('F11 non arriva alla pagina (lo gestisce il programma)', !afterF11.includes('F11'), afterF11);

  // 5. Esc arriva alla pagina e non toglie lo schermo intero
  await page('__prova.keys.length = 0; __prova.ups.length = 0; true');
  await key('Escape');
  await until(() => page('__prova.keys.includes("Escape") && __prova.ups.includes("Escape")'), 3000);
  await sleep(1000);   // e lo schermo intero resta anche dopo (Electron non esce con Esc)
  const keysEsc = await page('({ giu: __prova.keys.slice(), su: __prova.ups.slice() })');
  s = await state();
  check('Esc arriva alla pagina a schermo intero (keydown e keyup)', keysEsc.giu.includes('Escape') && keysEsc.su.includes('Escape'), keysEsc);
  check('Esc non toglie lo schermo intero', s.fullscreen, s);

  // 6. window.natpfDesktop
  const api = await page(`(() => { const d = window.natpfDesktop; return d ? { type: typeof d, shell: d.shell, version: d.version, keys: Object.keys(d).sort(), updates: d.updates ? Object.keys(d.updates).sort() : null } : null; })()`);
  // (versione 3 dal B27: anche displays, il monitor del gioco)
  check('window.natpfDesktop presente come da contratto', api && api.shell === 'electron' && api.version === 3 && ['isFullScreen', 'onFullScreenChange', 'setFullScreen', 'toggleFullScreen', 'updates', 'displays'].every(k => api.keys.includes(k))
    && JSON.stringify(api.updates) === JSON.stringify(['check', 'download', 'install', 'onChange', 'state']), api);
  // aggiornamenti spenti: programma non installato (Linux) e nessun indirizzo
  const upd = await page('Promise.all([window.natpfDesktop.updates.state(), window.natpfDesktop.updates.check(), window.natpfDesktop.updates.install()])');
  check('aggiornamenti: stato off fuori dall\'installazione, senza indirizzo', upd?.[0]?.status === 'off' && upd[1].status === 'off' && upd[1].current && upd[2].ok === false, upd);
  await page('window.natpfDesktop.onFullScreenChange(on => __prova.changes.push(on)); true');
  const was = await page('window.natpfDesktop.isFullScreen()');
  check('natpfDesktop.isFullScreen() = true', was === true, was);
  const toggled = await page('window.natpfDesktop.toggleFullScreen()');
  s = await state();
  await until(() => page('__prova.changes.length >= 1'), 2000);
  check('natpfDesktop.toggleFullScreen() esce dallo schermo intero', toggled === false && !s.fullscreen, { risposta: toggled, finestra: s.fullscreen });
  const back = await page('window.natpfDesktop.setFullScreen(true)');
  s = await state();
  await until(() => page('__prova.changes.length >= 2'), 2000);
  const changes = await page('__prova.changes.slice()');
  check('natpfDesktop.setFullScreen(true) rientra', back === true && s.fullscreen, { risposta: back, finestra: s.fullscreen });
  check('onFullScreenChange avvisa la pagina (false, poi true)', JSON.stringify(changes) === '[false,true]', changes);
  const saved = readSaved();
  check('scelta salvata nelle impostazioni del programma', saved.fullscreen === true, saved);

  // 7. Ctrl+Maiusc+M con un solo monitor: niente da spostare, nessun giro a finestra trasparente, nessun avviso
  const savedBefore = fs.readFileSync(SETTINGS, 'utf8');
  await key('M', ['control', 'shift']); await sleep(1200);
  s = await state();
  const log7 = newLog();
  check('Ctrl+Maiusc+M con un solo monitor: resta a schermo intero, opacità 1', s.fullscreen && s.opacity === 1 && !s.menuVisible, s);
  check('Ctrl+Maiusc+M con un solo monitor: nessun cambio di monitor', /c'è un solo monitor/.test(log7) && !/schermo intero sul monitor|schermo intero riadattato/.test(log7), log7.split('\n').filter(l => /monitor/.test(l)).map(l => l.slice(25, 90)));
  const pageChanges = await page('__prova.changes.slice()');
  check('Ctrl+Maiusc+M con un solo monitor: nessun avviso alla pagina, impostazioni invariate', pageChanges.length === 2 && fs.readFileSync(SETTINGS, 'utf8') === savedBefore, pageChanges);

  // 8. monitor cambiato (evento di Electron simulato: Xvfb non cambia risoluzione). Solo il collegamento: si riadatta
  // se e solo se la finestra non copre il monitor (stessa regola di needsRefit), e alla fine è a schermo intero e visibile
  const before = newLog();
  const sim = await main(({ BrowserWindow, screen }, tol) => {
    const w = BrowserWindow.getAllWindows()[0], d = screen.getDisplayMatching(w.getBounds()), b = w.getBounds();
    const expected = ['x', 'y', 'width', 'height'].some(k => Math.abs(b[k] - d.bounds[k]) > tol);
    screen.emit('display-metrics-changed', {}, d, ['workArea']);            // ignorato: non cambia lo schermo intero
    screen.emit('display-metrics-changed', {}, { ...d, id: -1 }, ['bounds']); // ignorato: un altro monitor
    screen.emit('display-metrics-changed', {}, d, ['bounds']);
    screen.emit('display-metrics-changed', {}, d, ['scaleFactor']);         // un solo riadattamento (attesa di 300 ms)
    return { expected, finestra: b, monitor: d.bounds };
  }, 2);
  await sleep(1500);
  const log8 = newLog().slice(before.length);
  const refits = count(log8, 'riadatto lo schermo intero');
  s = await state();
  // modo usato (informazione: su Linux non dice come si comporta Windows): rettangolo del monitor o giro completo
  const modo = { rettangolo: count(log8, 'schermo intero riadattato sul monitor'), giro: count(log8, 'schermo intero sul monitor') };
  check('monitor cambiato: riadatta solo se serve, una volta', refits === (sim.expected ? 1 : 0), { ...sim, riadattamenti: refits, modo });
  check('monitor cambiato: di nuovo a schermo intero e visibile', s.fullscreen && s.opacity === 1, s);

  // 9. una pagina che non è del server del programma non comanda la finestra
  await main(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.loadURL('data:text/html,<title>altra</title>'));
  await until(async () => { const x = await state(); return x.url.startsWith('data:') && !x.loading; }, 10000);
  const foreign = await page(`window.natpfDesktop ? window.natpfDesktop.setFullScreen(false).then(v => 'eseguito:' + v, e => 'rifiutato:' + e.message) : 'senza ponte'`);
  s = await state();
  check('pagina estranea: richiesta rifiutata, schermo intero invariato', /^rifiutato:.*non consentita/.test(foreign) && s.fullscreen, { risposta: foreign, finestra: s.fullscreen });
}

// --- ledwall-spento: monitor salvato che all'avvio non c'è ---------------------------------------------------------
async function ledwallSpento(){
  const LEDWALL = 424242, ALTRO = 515151;
  const { main, state, page, newLog, first, gameLoaded } = await launch({ displayId: LEDWALL });
  check('schermo intero all\'avvio sul monitor che c\'è', first?.visible && first.fullscreen, first);
  const loaded = await gameLoaded();
  check('pagina del gioco caricata', loaded, loaded?.url);
  if (!loaded) throw new Error('pagina del gioco non caricata');
  await sleep(1000);
  check('monitor salvato non sovrascritto all\'avvio', readSaved().displayId === LEDWALL, readSaved());
  await page('window.__cambi = []; window.natpfDesktop.onFullScreenChange(on => window.__cambi.push(on)); true');
  // compare un monitor che non è quello salvato: il gioco resta dov'è
  const emit = id => main(({ screen }, i) => { const real = screen.getAllDisplays()[0]; screen.emit('display-added', {}, { ...real, id: i }); return real.id; }, id);
  const realId = await emit(ALTRO); await sleep(1200);
  check('un altro monitor acceso non sposta il gioco', !/monitor del gioco ricollegato/.test(newLog()) && !/schermo intero sul monitor/.test(newLog()), { monitorVero: realId });
  // compare il ledwall salvato: il gioco ci va (giro completo, monitor diverso), senza cambiare la scelta salvata
  await emit(LEDWALL);
  const followed = await until(() => /monitor del gioco ricollegato[^\n]*424242/.test(newLog()), 3000);
  await sleep(1500);
  const log = newLog(), s = await state();
  const giro = log.split('\n').find(l => l.includes('schermo intero sul monitor')) || '';
  check('il ledwall salvato acceso dopo il programma: il gioco ci va', followed && giro.includes(`"monitor":${LEDWALL}`) && giro.includes('"scelto":false'), giro.slice(25, 160));
  check('dopo lo spostamento: schermo intero, visibile, menu nascosto', s.fullscreen && s.opacity === 1 && !s.menuVisible, s);
  // l'avviso arriva alla pagina anche dopo un paio di secondi (gioco con WebGL in software sotto Xvfb): si aspetta il
  // primo, poi ancora un secondo per vedere che non ne arrivino altri
  await until(() => page('window.__cambi.length >= 1'), 6000, 200); await sleep(1000);
  const cambi = await page('window.__cambi.slice()');
  check('la pagina riceve un solo avviso (true), nessuno intermedio', JSON.stringify(cambi) === '[true]', cambi);
  check('scelta salvata invariata (spostamento automatico)', readSaved().displayId === LEDWALL, readSaved());
}

// --- finestra: avvio in finestra scelto l'ultima volta -------------------------------------------------------------
async function finestra(){
  const { state, key, page, first, gameLoaded, menuAfterAlt } = await launch({ fullscreen: false });
  check('avvio in finestra (scelta salvata)', first?.visible && !first.fullscreen && first.menuAutoHide && !first.menuVisible, first);
  const loaded = await gameLoaded();
  check('pagina del gioco caricata', loaded, loaded?.url);
  if (!loaded) throw new Error('pagina del gioco non caricata');
  await sleep(1000);
  const shown = await menuAfterAlt(true);
  const hidden = await menuAfterAlt(false);
  check('Alt mostra il menu, Alt di nuovo lo nasconde', shown?.menuVisible && hidden && !hidden.menuVisible && !hidden.fullscreen, { dopoAlt: shown?.menuVisible, dopoAltAncora: hidden?.menuVisible });
  await key('F11');
  const s = await until(async () => { const x = await state(); return x.fullscreen && x; }, 3000);
  check('F11 va a schermo intero, menu nascosto e non a scomparsa', s?.fullscreen && !s.menuVisible && !s.menuAutoHide, s);
  const api = await page('window.natpfDesktop.isFullScreen()');
  check('natpfDesktop.isFullScreen() = true dopo F11', api === true, api);
  check('scelta salvata: schermo intero', readSaved().fullscreen === true, readSaved());
}

// --- gioco: il gioco vero dentro il programma (ponte natpfDesktop, B8) ----------------------------------------------
// Il gioco non deve mai usare lo schermo intero di HTML nel programma (Electron consumerebbe il primo Esc): il primo tasto
// non lo apre, il tasto F passa da window.natpfDesktop, «All'avvio» (Opzioni → Schermo) è nascosto.
async function gioco(){
  const { state, key, page, gameLoaded } = await launch(null);
  const loaded = await gameLoaded();
  check('pagina del gioco caricata', loaded, loaded?.url);
  if (!loaded) throw new Error('pagina del gioco non caricata');
  const ready = await until(() => page('!!window.__natpfTennis?.natpfUi?.screen?.fullscreen'), 60000, 250);
  check('gioco avviato (schermo del gioco pronto)', ready);
  if (!ready) throw new Error('gioco non avviato');
  const fsState = () => page(`(() => { const f = window.__natpfTennis.natpfUi.screen.fullscreen; return { desktop: !!f.desktop, desktopOn: f.desktopOn, frameless: f.frameless, html: !!document.fullscreenElement, label: f.label, armed: f.armed, auto: f.autoAllowed }; })()`);
  let g = await until(async () => { const x = await fsState(); return x.desktopOn && x; }, 5000);
  check('il gioco vede il ponte e la finestra a schermo intero', g?.desktop && g.frameless && !g.html && !g.armed && !g.auto, g);
  // primo tasto sulla schermata iniziale: niente schermo intero di HTML
  await key('Return'); await sleep(1500); await key('Return'); await sleep(1500);
  g = await fsState(); let s = await state();
  check('primo tasto: niente requestFullscreen di HTML, finestra sempre a schermo intero', !g.html && s.fullscreen, { gioco: g, finestra: s.fullscreen });
  // F del gioco: esce e rientra con il ponte
  await key('F');
  s = await until(async () => { const x = await state(); return !x.fullscreen && x; }, 4000);
  g = await fsState();
  check('F esce dallo schermo intero della finestra (ponte)', s && !s.fullscreen && !g.html && !g.desktopOn && !g.frameless, { finestra: s?.fullscreen, gioco: g });
  await key('F');
  s = await until(async () => { const x = await state(); return x.fullscreen && x; }, 4000);
  g = await until(async () => { const x = await fsState(); return x.desktopOn && x; }, 3000);
  check('F rientra nello schermo intero della finestra (ponte)', s?.fullscreen && g?.desktopOn && !g.html, { finestra: s?.fullscreen, gioco: g });
  check('scelta salvata: schermo intero', readSaved().fullscreen === true, readSaved());
  const startRow = await page(`(() => { const el = document.getElementById('natpf-fs-start'); return el ? el.classList.contains('hidden') : 'manca'; })()`);
  check("«All'avvio» nascosto nel programma", startRow === true, startRow);
  // B27: monitor del gioco dalla pagina (ponte displays) e voce «Schermo del gioco» del pannello dello stand. Con un solo
  // monitor: niente domanda all'avvio, elenco di uno, «monitor successivo» che non sposta niente
  check('un solo monitor: nessuna domanda all\'avvio', /scelta del monitor all'avvio[^\n]*"chiedo":false[^\n]*un solo monitor/.test(readLog()));
  const disp = await page(`window.natpfDesktop.displays.list().then(s => ({ n: s.list.length, current: s.current && s.current.label, primary: s.list[0].primary }))`);
  check('window.natpfDesktop.displays.list(): il monitor del gioco', disp?.n === 1 && /^Monitor 1 · 1920×1080 \(principale\)$/.test(disp.current) && disp.primary, disp);
  const nx = await page(`window.natpfDesktop.displays.next().then(s => s.current && s.current.label)`);
  check('displays.next() con un solo monitor: resta dov\'è', /^Monitor 1/.test(nx || ''), nx);
  const bad = await page(`window.natpfDesktop.displays.choose(999).then(() => 'accettato', e => 'rifiutato: ' + e.message)`);
  check('displays.choose() di un monitor che non c\'è: rifiutato', /^rifiutato/.test(bad), bad);
  const staff = await page(`(async () => { const ui = window.__natpfTennis.natpfUi; ui.kiosk.open(); await new Promise(r => setTimeout(r, 1500)); ui.kiosk.paint(); const b = document.querySelector('[data-staff="display"]'); const out = { shown: !b.classList.contains('hidden'), text: b.textContent.trim() }; ui.kiosk.close(); return out; })()`);
  check('pannello dello stand: «Schermo del gioco» con il monitor attuale', staff?.shown && /Schermo del gioco\s*Monitor 1 · 1920×1080/.test(staff.text), staff);
}

// --- domanda-monitor: due monitor finti per la domanda all'avvio (B27) ----------------------------------------------
async function domandaMonitor(){
  const FINTI = JSON.stringify([{ id: 1, bounds: { x: 0, y: 0, width: 1536, height: 864 }, scaleFactor: 1.25 }, { id: 2, bounds: { x: 1536, y: 0, width: 1024, height: 1024 }, scaleFactor: 1 }]);
  const env = { NATPF_PROVA_MONITOR: FINTI, NATPF_SCHERMO_ATTESA_MS: '2500' };
  const t0 = Date.now();
  const { first, newLog } = await launch(null, env);
  const waited = Date.now() - t0;
  check('finestra del gioco dopo la domanda', first?.visible && first.fullscreen, first);
  const log = newLog();
  const q = log.split('\n').find(l => l.includes("scelta del monitor all'avvio")) || '';
  check('due monitor e nessuno scelto: si chiede, proposto il 1024×1024 «probabile ledwall»', /"chiedo":true/.test(q) && /"proposto":2/.test(q) && q.includes('Monitor 2 · 1024×1024 · probabile ledwall') && q.includes('Monitor 1 · 1920×1080 (principale) · scala 125%'), q.slice(25, 300));
  check('senza risposta vale la proposta, salvata con la misura', /monitor del gioco[^\n]*probabile ledwall[^\n]*proposta \(nessuna risposta\)/.test(log) && readSaved().displayId === 2 && readSaved().display?.width === 1024 && readSaved().display?.height === 1024, { salvato: readSaved(), attesa: waited });
  await closeApp();
  const again = await launch(readSaved(), env);
  const log2 = again.newLog();
  check('riavvio con il monitor scelto: nessuna domanda', /scelta del monitor all'avvio[^\n]*"chiedo":false[^\n]*monitor salvato presente/.test(log2) && !/proposta \(nessuna risposta\)/.test(log2), log2.split('\n').find(l => l.includes('scelta del monitor')));
  // ledwall salvato ma spento (id che non c'è), portatile e un altro monitor accesi, nessuno risponde: la proposta vale
  // solo per questo avvio, il monitor salvato resta (revisione del B27: prima veniva sovrascritto)
  await closeApp();
  const LEDWALL = 424242;
  const off = await launch({ displayId: LEDWALL, display: { width: 3840, height: 2160 } }, env);
  const log3 = off.newLog();
  check('ledwall salvato e spento, due monitor accesi: si chiede', /scelta del monitor all'avvio[^\n]*"chiedo":true[^\n]*monitor salvato assente/.test(log3), log3.split('\n').find(l => l.includes('scelta del monitor')));
  check('senza risposta: proposta solo per questa sessione, il ledwall salvato resta', /monitor del gioco[^\n]*solo per questa sessione[^\n]*"salvato":false/.test(log3) && readSaved().displayId === LEDWALL && readSaved().display?.width === 3840, { salvato: readSaved() });
}

// --- aggiornamenti: server degli aggiornamenti finto (127.0.0.1), installazione simulata (richiesta del 07/11) --------
// Come il bucket R2: windows/latest.json e l'installer (Range). Il programma su Linux non è «installato»: con
// NATPF_AGGIORNAMENTI_PROVA=1 gli aggiornamenti si attivano e install() registra soltanto (non avvia niente, non chiude).
async function aggiornamenti(){
  const NEW = '2099-01-01.1', FILE = `NATPF-Simulator-Setup-${NEW}.exe`;
  const body = crypto.randomBytes(2*1024*1024);
  const manifest = { build: NEW, version: '2099.101.1', file: FILE, size: body.length, sha256: crypto.createHash('sha256').update(body).digest('hex'), notes: 'Versione di prova', published: new Date().toISOString() };
  const seen = [];
  const srv = http.createServer((req, res) => {
    const p = new URL(req.url, 'http://x').pathname;
    seen.push({ path: p, range: req.headers.range || null, at: Date.now() });
    if (p === '/windows/latest.json'){ res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(manifest)); return; }
    if (p !== `/windows/${FILE}`){ res.writeHead(404); res.end(); return; }
    const m = /^bytes=(\d+)-$/.exec(req.headers.range || ''), from = m ? Number(m[1]) : 0;
    res.writeHead(m ? 206 : 200, { 'Content-Length': body.length - from, ...(m ? { 'Content-Range': `bytes ${from}-${body.length - 1}/${body.length}` } : {}) });
    // a pezzi da 64 KB ogni 25 ms (~0,8 s): l'avanzamento si vede
    let at = from;
    const step = () => { if (res.destroyed) return; if (at >= body.length){ res.end(); return; } res.write(body.subarray(at, at + 65536)); at += 65536; setTimeout(step, 25); };
    step();
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const started = Date.now();
    const { main, state, page, newLog, gameLoaded } = await launch(null, { NATPF_AGGIORNAMENTI_BASE: base, NATPF_AGGIORNAMENTI_PROVA: '1' });
    const loaded = await gameLoaded();
    check('pagina del gioco caricata', loaded, loaded?.url);
    if (!loaded) throw new Error('pagina del gioco non caricata');
    const first = await page('window.natpfDesktop.updates.state()');
    check('aggiornamenti attivi con l\'indirizzo (stato idle o già controllato)', ['idle', 'checking', 'available'].includes(first?.status) && /^\d{4}-\d{2}-\d{2}\.\d+$/.test(first.current), first);
    await page('window.__agg = []; window.__aggOff = window.natpfDesktop.updates.onChange(s => window.__agg.push(s)); true');
    // controllo all'avvio (dopo qualche secondo) da solo, senza scaricare
    const auto = await until(() => seen.some(x => x.path === '/windows/latest.json'), 20000, 250);
    check('controllo automatico qualche secondo dopo l\'avvio', auto, { secondi: auto ? ((seen.find(x => x.path === '/windows/latest.json').at - started)/1000).toFixed(1) : null });
    const c = await page('window.natpfDesktop.updates.check()');
    check('check(): versione nuova disponibile, con note e dimensione', c?.status === 'available' && c.latest === NEW && c.size === body.length && c.notes === 'Versione di prova' && c.checkedAt > 0, c);
    await sleep(1500);
    check('nessun download senza il clic dell\'utente', !seen.some(x => x.path.endsWith('.exe')), seen.map(x => x.path));
    const d = await page('window.natpfDesktop.updates.download()');
    check('download(): pronto da installare', d?.status === 'ready' && d.progress === 1 && d.latest === NEW, d);
    const events = await page('window.__agg.map(s => s.status + (s.progress != null ? ":" + s.progress.toFixed(2) : ""))');
    const prog = events.filter(e => e.startsWith('downloading:')).map(e => Number(e.split(':')[1]));
    check('onChange: available → downloading con l\'avanzamento → ready', events.includes('available') && prog.length >= 3 && prog.every((p, i) => !i || p >= prog[i - 1]) && events.at(-1).startsWith('ready'), events);
    const file = path.join(NATPF, 'aggiornamenti', FILE);
    const ok = fs.existsSync(file) && crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') === manifest.sha256;
    check('installer scaricato in NATPF/aggiornamenti con lo sha256 giusto', ok, file);
    const inst = await page('window.natpfDesktop.updates.install()');
    const after = await page('window.natpfDesktop.updates.state()');
    const log = newLog();
    check('install(): installazione simulata (su Linux non si avvia niente), stato installing', inst?.ok === true && after.status === 'installing' && /installazione simulata[^\n]*\/AGGIORNA/.test(log) && /chiusura simulata/.test(log), { inst, stato: after.status });
    const offWorks = await page('window.__aggOff(); const n = window.__agg.length; window.natpfDesktop.updates.state().then(() => n === window.__agg.length)');
    check('onChange: la funzione restituita toglie l\'ascolto', offWorks === true, offWorks);
    // una pagina estranea non comanda gli aggiornamenti
    await main(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.loadURL('data:text/html,<title>altra</title>'));
    await until(async () => { const x = await state(); return x.url.startsWith('data:') && !x.loading; }, 10000);
    const foreign = await page(`window.natpfDesktop ? window.natpfDesktop.updates.state().then(() => 'eseguito', e => 'rifiutato:' + e.message) : 'senza ponte'`).catch(e => `errore:${e.message}`);
    check('pagina estranea: richiesta degli aggiornamenti rifiutata', /^rifiutato:.*non consentita|^senza ponte/.test(foreign), foreign);
  } finally { srv.closeAllConnections?.(); srv.close(); }
}

const RUN = { predefinito, 'ledwall-spento': ledwallSpento, finestra, gioco, 'domanda-monitor': domandaMonitor, aggiornamenti };
try {
  if (!args['senza-xvfb']) await startXvfb();
  for (const name of chosen){
    current = name;
    console.log(`\n== ${name}`);
    try { await RUN[name](); }
    catch (e){ check('prova completata', false, e.message); }
    finally { await closeApp().catch(e => check('chiusura', false, e.message)); }
  }
} finally {
  try { app?.process()?.kill('SIGKILL'); } catch {}
  if (xvfb){ xvfb.kill('SIGTERM'); await sleep(200); }
  if (ownData && !args['tieni-dati']) fs.rmSync(DATI, { recursive: true, force: true });
}
const bad = results.filter(r => !r.ok);
if (bad.length) console.log(`\nNon superati:\n${bad.map(r => `  ${r.name}`).join('\n')}`);
console.log(`\n${results.length - bad.length}/${results.length} controlli superati (${chosen.join(', ')})${ownData && !args['tieni-dati'] ? '' : ` · dati in ${DATI}`}`);
process.exit(bad.length ? 1 : 0);
