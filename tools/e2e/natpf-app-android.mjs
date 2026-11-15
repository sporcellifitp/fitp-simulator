// B52 · patto tra l'app Android dello stand (natpf-android) e la pagina vera del telefono-racchetta. L'app inietta uno
// script a pagina caricata (ORIENTATION_SHIM in natpf-android/app/src/main/java/it/natpf/racchetta/MainActivity.java,
// letto da qui così la prova segue il codice dell'app) e offre il ponte window.NATPFApp. Nella WebView dell'app lo
// schermo intero e il blocco dell'orientamento della pagina vengono rifiutati: qui si rifiutano allo stesso modo.
// Prova:
//   • senza lo script dell'app (WebView «nuda»): le richieste d'orientamento della pagina vanno alla WebView, che le rifiuta;
//   • con lo script: al tocco vero su «Attiva i sensori» la pagina chiede «portrait» all'app attraverso il ponte;
//   • la pagina continua come prima (calibrazione, campioni dei sensori), nessun errore.
// Come natpf-telefono-bloccato: sito sotto /natpf/ (NATPF_SITE_ROOT con la cartella natpf → site/, o lo zip estratto)
//   CHROMIUM_PATH=… NATPF_SITE_ROOT=<radice> node tools/e2e/run-local.mjs natpf-app-android.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { check, launch, page, summary } from './th.mjs';

const JAVA = fileURLToPath(new URL('../../natpf-android/app/src/main/java/it/natpf/racchetta/MainActivity.java', import.meta.url));
const src = readFileSync(JAVA, 'utf8');
const decl = src.match(/ORIENTATION_SHIM\s*=\s*([\s\S]*?);\s*\n/);
const SHIM = decl ? [...decl[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1].replace(/\\(["\\])/g, '$1')).join('') : '';
check('script dell\'app letto da MainActivity.java', SHIM.includes('NATPFApp.lock') && SHIM.includes('requestFullscreen'), SHIM.slice(0, 120));

const URL0 = 'http://127.0.0.1:8765/natpf/tennis/racchetta.html#s=racchetta-tel-prova123456789&k=provaapp1234567890';
const init = () => {
  window.sent = [];
  class Emitter {
    constructor(){ this.handlers = new Map(); }
    on(type, callback){ this.handlers.set(type, callback); }
    emit(type, data){ this.handlers.get(type)?.(data); }
  }
  window.Peer = class extends Emitter {
    constructor(){ super(); setTimeout(() => this.emit('open'), 0); }
    connect(){
      const conn = new Emitter();
      conn.open = true;
      window.fromGame = msg => conn.emit('data', msg);
      conn.send = data => {
        window.sent.push(data);
        if (data.t === 'hello') setTimeout(() => window.fromGame({ t: 'welcome', r: 'ripresa-prova' }), 0);
        if (data.t === 'ping') setTimeout(() => window.fromGame({ t: 'pong', c: data.c }), 0);
      };
      conn.close = () => { conn.open = false; };
      setTimeout(() => conn.emit('open'), 0);
      return conn;
    }
    destroy(){ this.destroyed = true; }
  };
  window.motionTick = setInterval(() => dispatchEvent(new DeviceMotionEvent('devicemotion', {
    accelerationIncludingGravity: { x: 0, y: -9.81, z: 0 },
    rotationRate: { alpha: 0.4, beta: 0, gamma: 0 }, interval: 16,
  })), 16);
  // come la WebView dell'app: schermo intero e blocco dell'orientamento rifiutati
  Element.prototype.requestFullscreen = function(){ return Promise.reject(new TypeError('fullscreen non disponibile nella WebView')); };
  window.webviewLocks = [];
  if (screen.orientation) screen.orientation.lock = mode => { window.webviewLocks.push(mode); return Promise.reject(new DOMException('non supportato', 'NotSupportedError')); };
  // ponte dell'app (MainActivity.Bridge)
  window.appLocks = [];
};
const bridge = () => { window.NATPFApp = { lock: o => window.appLocks.push(o), version: () => '1.0.0' }; };

const browser = await launch();
try {
  for (const withShim of [false, true]){
    const { p, errs } = await page(browser, URL0, { w: 390, h: 844, mobile: true, init });
    await p.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 15000 });
    if (withShim){ await p.evaluate(bridge); await p.evaluate(SHIM); }   // onPageFinished dell'app
    await p.locator('#enable').tap();
    await p.waitForFunction(() => __racchetta.state.sensor === 'cal' || __racchetta.state.sensor === 'ready', null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => ({ app: window.appLocks.slice(), webview: window.webviewLocks.slice(), sensor: __racchetta.state.sensor, samples: window.sent.filter(m => m.t === 's' || m.t === 'm' || m.t === 'smp').length }));
    // (la pagina chiede l'orientamento anche fuori dallo schermo intero: senza lo script la richiesta va alla WebView,
    // che la rifiuta, e l'app non lo sa)
    if (!withShim) check('senza lo script dell\'app: le richieste d\'orientamento vanno alla WebView (rifiutate), l\'app non ne riceve', r.app.length === 0, JSON.stringify(r));
    else {
      check('con lo script dell\'app: «Attiva i sensori» chiede «portrait» all\'app attraverso il ponte', r.app.includes('portrait') && r.webview.length === 0, JSON.stringify(r));
      check('la pagina va avanti come prima (calibrazione o pronto)', ['cal', 'ready'].includes(r.sensor), r.sensor);
      check('nessun errore nella pagina con lo script dell\'app', !errs.length, errs.join(' | ').slice(0, 300));
    }
    await p.context().close();
  }
} catch (e){ check('prova dell\'app Android', false, String(e.stack || e)); }
finally { await browser.close(); }
summary();
