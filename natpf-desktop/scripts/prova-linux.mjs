// Prova del programma Windows su Linux (stesso codice di Electron, senza Windows): avvia la cartella app/ preparata
// con Electron per Linux in uno schermo virtuale (Xvfb) e la guida con Playwright (_electron). Controlla lo schermo
// intero senza cornici (blocco B8): pagina del gioco caricata, finestra a schermo intero dall'avvio, Alt da solo che
// non mostra la barra del menu, F11 che esce e rientra anche se la pagina blocca i tasti, Esc che arriva alla pagina,
// window.natpfDesktop (preload) che cambia lo stato e avvisa la pagina, Ctrl+R che ricarica, Ctrl+Maiusc+M che rimette
// lo schermo intero. I tasti si mandano con webContents.sendInputEvent (quelli di Playwright non passano dalle
// scorciatoie di Electron) e solo con la finestra visibile.
// Non controlla misure e posizione della finestra: senza gestore delle finestre Xvfb le riporta sbagliate.
//   cd natpf-tennis && npm run build                  (dist/ del gioco)
//   cd natpf-desktop && node scripts/prepara.mjs      (app/)
//   ELECTRON_SKIP_BINARY_DOWNLOAD= node node_modules/electron/install.js   (se manca Electron per Linux)
//   npm ci --prefix ../tools/e2e                      (se manca playwright-core)
//   node scripts/prova-linux.mjs [--display=:91] [--dati=cartella] [--senza-xvfb] [--tieni-dati]
// Usa le porte del programma (8443, 8081, 8080): devono essere libere. Dati (certificati, impostazioni, registro) in
// --dati (predefinita: una cartella temporanea nuova), mai in quelli veri.
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
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
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = m => { console.error(m); process.exit(2); };

// --- prerequisiti -------------------------------------------------------------------------------------------------
const ELECTRON = path.join(HERE, 'node_modules/electron/dist/electron');
if (process.platform !== 'linux') fail('Questa prova è per Linux (su Windows si prova il programma vero: docs/COLLAUDO_WINDOWS.md).');
if (!fs.existsSync(ELECTRON)) fail('Manca Electron per Linux: ELECTRON_SKIP_BINARY_DOWNLOAD= node node_modules/electron/install.js');
for (const f of ['main.mjs', 'desktop-core.mjs', DESKTOP.preload, 'package.json']) if (!fs.existsSync(path.join(APP, f))) fail(`Manca app/${f}: esegui prima «node scripts/prepara.mjs».`);
if (!DISPLAY) fail('Con --senza-xvfb serve DISPLAY.');
let electron;
try {
  const pw = createRequire(path.join(REPO, 'tools/e2e/package.json')).resolve('playwright-core');
  ({ _electron: electron } = await import(pathToFileURL(pw.replace(/index\.js$/, 'index.mjs')).href));
} catch { fail('Manca playwright-core: npm ci --prefix tools/e2e'); }
const portFree = port => new Promise(resolve => { const s = net.createServer(); s.once('error', () => resolve(false)); s.listen(port, '0.0.0.0', () => s.close(() => resolve(true))); });
for (const port of [DESKTOP.port, DESKTOP.caPort, DESKTOP.setupPort]) if (!(await portFree(port))) fail(`La porta ${port} è occupata (altro NATPF aperto?): il programma non partirebbe.`);

const ownData = !args.dati;
const DATI = path.resolve(args.dati || fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-prova-linux-')));
fs.mkdirSync(DATI, { recursive: true });
const NATPF = path.join(DATI, 'NATPF');
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'ok    ' : 'NON OK'} ${name}${detail ? ` · ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); };

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

let app = null;
async function cleanup(){
  try { await Promise.race([app?.close(), sleep(10000)]); } catch {}
  try { app?.process()?.kill('SIGKILL'); } catch {}
  if (xvfb){ xvfb.kill('SIGTERM'); await sleep(200); }
  if (ownData && !args['tieni-dati']) fs.rmSync(DATI, { recursive: true, force: true });
}

async function until(fn, ms, step = 100){
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end){ try { last = await fn(); if (last) return last; } catch {} await sleep(step); }
  return last;
}

try {
  if (!args['senza-xvfb']) await startXvfb();
  // da root Chromium chiede --no-sandbox; la sandbox della pagina del gioco (sandbox:true) resta quella di Electron
  app = await electron.launch({ executablePath: ELECTRON, args: ['--no-sandbox', APP], timeout: 60000,
    env: { ...process.env, DISPLAY, LOCALAPPDATA: DATI, NATPF_DATA_DIR: NATPF, ELECTRON_ENABLE_LOGGING: '' } });
  // funzioni eseguite nel processo principale di Electron (una sola finestra: il gioco)
  const main = (fn, arg) => app.evaluate(fn, arg);
  const state = () => main(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; return w && { windows: BrowserWindow.getAllWindows().length, visible: w.isVisible(), fullscreen: w.isFullScreen(), menuVisible: w.isMenuBarVisible(), menuAutoHide: w.isMenuBarAutoHide(), opacity: w.getOpacity(), url: w.webContents.getURL(), loading: w.webContents.isLoading() }; });
  const key = (keyCode, modifiers = []) => main(({ BrowserWindow }, [k, m]) => {
    const w = BrowserWindow.getAllWindows()[0]; w.focus(); w.webContents.focus();
    w.webContents.sendInputEvent({ type: 'keyDown', keyCode: k, modifiers: m });
    w.webContents.sendInputEvent({ type: 'keyUp', keyCode: k, modifiers: m });
  }, [keyCode, modifiers]);
  const page = code => main(({ BrowserWindow }, c) => BrowserWindow.getAllWindows()[0].webContents.executeJavaScript(c, true), code);
  // 1. finestra visibile e a schermo intero già dalla pagina di avvio
  const first = await until(async () => { const s = await state(); return s?.visible && s; }, 30000);
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
  const loaded = await until(async () => { const s = await state(); return s && s.url.startsWith(GAME) && !s.loading && s; }, 120000, 250);
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
  await key('Alt'); await sleep(400);
  s = await state();
  check('Alt da solo non mostra il menu a schermo intero', s.fullscreen && !s.menuVisible, s);

  // 4. F11 esce e rientra anche con la pagina che blocca i tasti; la pagina non riceve F11
  await page('__prova.block = true; __prova.keys.length = 0; true');
  await key('F11');
  s = await until(async () => { const x = await state(); return !x.fullscreen && x; }, 3000);
  check('F11 esce dallo schermo intero (pagina che blocca i tasti)', s && !s.fullscreen, s);
  check('in finestra il menu torna a comparire con Alt', s && s.menuAutoHide, s);
  await key('F11');
  s = await until(async () => { const x = await state(); return x.fullscreen && x; }, 3000);
  check('F11 rientra nello schermo intero', s?.fullscreen && !s.menuVisible && !s.menuAutoHide, s);
  const afterF11 = await page('__prova.block = false; __prova.keys.slice()');
  check('F11 non arriva alla pagina (lo gestisce il programma)', !afterF11.includes('F11'), afterF11);

  // 5. Esc arriva alla pagina e non toglie lo schermo intero
  await page('__prova.keys.length = 0; __prova.ups.length = 0; true');
  await key('Escape'); await sleep(400);
  const keysEsc = await page('({ giu: __prova.keys.slice(), su: __prova.ups.slice() })');
  s = await state();
  check('Esc arriva alla pagina a schermo intero (keydown e keyup)', keysEsc.giu.includes('Escape') && keysEsc.su.includes('Escape'), keysEsc);
  check('Esc non toglie lo schermo intero', s.fullscreen, s);

  // 6. window.natpfDesktop
  const api = await page(`(() => { const d = window.natpfDesktop; return d ? { type: typeof d, shell: d.shell, version: d.version, keys: Object.keys(d).sort() } : null; })()`);
  check('window.natpfDesktop presente come da contratto', api && api.shell === 'electron' && api.version === 1 && ['isFullScreen', 'onFullScreenChange', 'setFullScreen', 'toggleFullScreen'].every(k => api.keys.includes(k)), api);
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
  let saved = {}; try { saved = JSON.parse(fs.readFileSync(path.join(NATPF, DESKTOP.settingsFile), 'utf8')); } catch {}
  check('scelta salvata nelle impostazioni del programma', saved.fullscreen === true, saved);

  // 7. Ctrl+Maiusc+M (un solo monitor: stesso monitor) rimette lo schermo intero passando dalla finestra trasparente
  await key('M', ['control', 'shift']); await sleep(1500);
  s = await state();
  const logText = (() => { try { return fs.readFileSync(path.join(NATPF, 'log/programma.log'), 'utf8'); } catch { return ''; } })();
  check('Ctrl+Maiusc+M: di nuovo a schermo intero e visibile (opacità 1)', s.fullscreen && s.opacity === 1 && !s.menuVisible, s);
  check('Ctrl+Maiusc+M: cambio di monitor registrato', /schermo intero sul monitor/.test(logText));
  const pageChanges = await page('__prova.changes.slice()');
  check('cambio di monitor senza avvisi intermedi alla pagina', pageChanges.slice(2).every(Boolean), pageChanges);

  // 8. monitor cambiato (evento di Electron simulato: Xvfb non cambia risoluzione). Solo il collegamento: si riadatta
  // se e solo se la finestra non copre il monitor (stessa regola di needsRefit), e alla fine è a schermo intero e visibile
  const readLog = () => { try { return fs.readFileSync(path.join(NATPF, 'log/programma.log'), 'utf8'); } catch { return ''; } };
  const before = readLog().split('riadatto lo schermo intero').length;
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
  const refits = readLog().split('riadatto lo schermo intero').length - before;
  s = await state();
  check('monitor cambiato: riadatta solo se serve, una volta', refits === (sim.expected ? 1 : 0), { ...sim, riadattamenti: refits });
  check('monitor cambiato: di nuovo a schermo intero e visibile', s.fullscreen && s.opacity === 1, s);

  // 9. una pagina che non è del server del programma non comanda la finestra
  await main(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.loadURL('data:text/html,<title>altra</title>'));
  await until(async () => { const x = await state(); return x.url.startsWith('data:') && !x.loading; }, 10000);
  const foreign = await page(`window.natpfDesktop ? window.natpfDesktop.setFullScreen(false).then(v => 'eseguito:' + v, e => 'rifiutato:' + e.message) : 'senza ponte'`);
  s = await state();
  check('pagina estranea: richiesta rifiutata, schermo intero invariato', /^rifiutato:.*non consentita/.test(foreign) && s.fullscreen, { risposta: foreign, finestra: s.fullscreen });
} catch (e){
  check('prova completata', false, e.message);
} finally {
  await cleanup();
}
const bad = results.filter(r => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} controlli superati${ownData && !args['tieni-dati'] ? '' : ` · dati in ${DATI}`}`);
process.exit(bad.length ? 1 : 0);
