// B71 (docs/b71/sensori.md) · la pagina vera del telefono-racchetta con un ponte FINTO dell’app NATPF Racchetta 1.0.5
// (sensoriVersione/sensoriAvvia/campioni/orologio/infoSensori/inUso, come MainActivity.Bridge) e gli eventi devicemotion
// del browser fatti dallo stesso movimento: il browser li dà all'istante dell'evento, l'app con l'istante vero (8 ms prima)
// e a lotti. Prova:
//   1. senza il ponte nuovo (app 1.0.4): sorgente 'off', lo stato dice sr 'b', nessuna chiamata ai sensori dell’app;
//   2. con il ponte: «Attiva i sensori» → prova (browser e app insieme) → con la rotazione passa ai sensori dell’app
//      ('nativi'), lo stato dice sr 'n' e il fondo scala, i campioni continuano (frequenza ~60 Hz, sensori vivi);
//      l’app sa che il telefono è in uso (calibrazione);
//   3. l'app smette di mandare campioni a pagina visibile → di nuovo devicemotion (sr 'b', rp 'f') e i sensori restano vivi;
//   4. app con la gravità al contrario → la prova lo vede e resta il browser (rp 'g');
//   5. nessun errore nella pagina.
// Il ponte e il telefono sono finti: non sostituiscono la prova sul telefono vero (docs/b71/sensori.md §6).
//   CHROMIUM_PATH=… node tools/e2e/run-local.mjs natpf-sensori-nativi.mjs     (prima: npm ci --prefix tools/e2e)
import { check, launch, page, summary } from './th.mjs';

const URL0 = 'http://127.0.0.1:8765/tennis/racchetta.html#s=racchetta-tel-prova123456789&k=provanativi1234567';
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
  // movimento del telefono: in verticale, fermo per 1,5 s dall'avvio dei sensori, poi oscillazioni attorno a gamma
  const r1 = v => Math.round(v*10)/10;
  window.motionFrom = null;
  window.motion = t => {
    const u = window.motionFrom == null ? 0 : t - window.motionFrom, s = u > 1500 ? Math.sin((u - 1500)/1000*2*Math.PI*1.4) : 0;
    const rot = [r1(0.4*Math.sin(t/37) + 50*s), -0.4, r1(0.3 + 380*s*Math.abs(s))], acc = [r1(-3*s), r1(0.4*s), 0.2];
    return { rot, acc, accG: [r1(0.3 + acc[0]), r1(9.4 + acc[1]), r1(1.4 + acc[2])] };
  };
  window.motionTick = setInterval(() => {
    const m = window.motion(performance.now() - 8);
    dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: m.rot[0], beta: m.rot[1], gamma: m.rot[2] }, acceleration: { x: m.acc[0], y: m.acc[1], z: m.acc[2] },
      accelerationIncludingGravity: { x: m.accG[0], y: m.accG[1], z: m.accG[2] }, interval: 16 }));
  }, 16);
};
// ponte finto dell’app 1.0.5: campioni dello stesso movimento all'istante vero, testo di CampioniNativi.svuota
const bridge = ({ flipG = false } = {}) => {
  const OFF = 987654321.5, q = [];
  window.app = { calls: { avvia: 0, ferma: 0, campioni: 0 }, inUso: [], on: false, mute: false };
  const tenth = v => Math.round(v*10);
  setInterval(() => {
    if (!window.app.on || window.app.mute) return;
    const t = performance.now() - 8, m = window.motion(t), g = flipG ? m.accG.map(v => -v) : m.accG;
    q.push([Math.round((t + OFF)*1000), ...g.map(tenth), ...m.acc.map(tenth), ...m.rot.map(tenth)].join(','));
  }, 16);
  window.NATPFApp = {
    lock(){}, version: () => '1.0.5', stato: () => '{"rssi":-58,"ghz":5,"mbps":433,"batt":80,"carica":0,"fissa":1,"spenti":0}',
    sensoriVersione: () => 1,
    sensoriAvvia(){ window.app.calls.avvia++; window.app.on = true; if (window.motionFrom == null) window.motionFrom = performance.now(); return true; },
    sensoriFerma(){ window.app.calls.ferma++; window.app.on = false; },
    campioni(){ window.app.calls.campioni++; const s = ['0', ...q.splice(0)].join(';'); return s; },
    orologio: () => performance.now() + OFF,
    infoSensori: () => '{"p":1,"us":16667,"acc":[78.5,0.0024,2404,0],"gir":[2000.0,0.0610,2404,300],"lin":[78.5,0.0024,2404,0]}',
    inUso(v){ window.app.inUso.push(v); },
  };
};
// pagina vera del telefono con lo script iniziale (il ponte c'è prima degli script della pagina, come nella WebView con
// addJavascriptInterface)
const open = async script => page(browser, URL0, { w: 390, h: 844, mobile: true, init: script });
const st = () => window.sent.filter(m => m.t === 'st').at(-1) || null;

const browser = await launch();
try {
  // 1. app 1.0.4: il percorso di sempre
  {
    const { p, errs } = await open(`(${init})(); window.NATPFApp = { lock(){}, version: () => '1.0.4', stato: () => '{"batt":80}' };`);
    await p.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 15000 });
    await p.locator('#enable').tap();
    await p.waitForTimeout(2500);
    const r = await p.evaluate(`({ s: __racchetta.state, st: (${st})() })`);
    check('app 1.0.4 (o Chrome): sorgente «off», i sensori del browser come sempre', r.s.sorgente === 'off' && ['cal', 'ready', 'idle'].includes(r.s.sensor), JSON.stringify(r.s));
    check('lo stato dice sr «b», niente fondo scala né motivo, sensori vivi', r.st?.sr === 'b' && !r.st.fs && !r.st.rp && r.st.sa != null && r.st.sa < 200, JSON.stringify(r.st));
    check('nessun errore (app 1.0.4)', !errs.length, errs.join(' | ').slice(0, 300));
    await p.context().close();
  }
  // 2–3. app 1.0.5: prova, sensori dell’app, poi l'app che si ferma
  {
    const { p, errs } = await open(`(${init})(); (${bridge})();`);
    await p.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 15000 });
    await p.locator('#enable').tap();
    await p.waitForFunction(() => __racchetta.state.sorgente === 'prova', null, { timeout: 5000 }).catch(() => {});
    const a = await p.evaluate(() => ({ s: __racchetta.state.sorgente, calls: { ...window.app.calls } }));
    check('app 1.0.5: «Attiva i sensori» accende i sensori dell’app e parte la prova con il browser', a.s === 'prova' && a.calls.avvia >= 1, JSON.stringify(a));
    await p.waitForFunction(() => __racchetta.state.sorgente === 'nativi', null, { timeout: 12000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const b = await p.evaluate(`({ s: __racchetta.state, st: (${st})(), calls: { ...window.app.calls }, inUso: window.app.inUso.slice() })`);
    check('con il movimento la prova passa ai sensori dell’app («nativi»)', b.s.sorgente === 'nativi', JSON.stringify(b.s));
    check('lo stato dice sr «n» e il fondo scala dell’app [78,5 m/s², 2000 °/s]', b.st?.sr === 'n' && JSON.stringify(b.st.fs) === '[78.5,2000]', JSON.stringify(b.st));
    check('i campioni dell’app arrivano al rilevatore: sensori vivi, ~60 Hz', b.st?.sa != null && b.st.sa < 200 && b.st.hz >= 50 && b.st.hz <= 70, `sa ${b.st?.sa} hz ${b.st?.hz}`);
    check('la pagina chiede i lotti all’app (~60 volte al secondo)', b.calls.campioni > 100, JSON.stringify(b.calls));
    check('l’app sa che il telefono è in uso (calibrazione)', b.inUso[0] === true, JSON.stringify(b.inUso));
    // 3. l'app smette di mandare campioni (a pagina visibile): di nuovo devicemotion
    await p.evaluate(() => { window.app.mute = true; });
    await p.waitForFunction(() => __racchetta.state.sorgente === 'browser', null, { timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const c = await p.evaluate(`({ s: __racchetta.state, st: (${st})(), calls: { ...window.app.calls } })`);
    check('app ferma a pagina visibile: di nuovo il browser (rp «f»), sensori dell’app spenti', c.s.sorgente === 'browser' && c.s.ripiego === 'f' && c.calls.ferma >= 1, JSON.stringify(c.s) + JSON.stringify(c.calls));
    check('dopo il ritorno al browser i sensori restano vivi (sr «b», ultimo campione recente)', c.st?.sr === 'b' && c.st.rp === 'f' && c.st.sa != null && c.st.sa < 200, JSON.stringify(c.st));
    check('nessun errore nella pagina (app 1.0.5)', !errs.length, errs.join(' | ').slice(0, 300));
    await p.context().close();
  }
  // 4. gravità al contrario dall'app: resta il browser
  {
    const { p, errs } = await open(`(${init})(); (${bridge})({ flipG: true });`);
    await p.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 15000 });
    await p.locator('#enable').tap();
    await p.waitForFunction(() => __racchetta.state.sorgente === 'browser', null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(1200);
    const d = await p.evaluate(`({ s: __racchetta.state, st: (${st})() })`);
    check('app con la gravità al contrario: la prova lo vede e resta il browser (rp «g»)', d.s.sorgente === 'browser' && d.s.ripiego === 'g', JSON.stringify(d.s));
    check('con il browser i sensori sono vivi', d.st?.sr === 'b' && d.st.sa != null && d.st.sa < 200, JSON.stringify(d.st));
    check('nessun errore (gravità al contrario)', !errs.length, errs.join(' | ').slice(0, 300));
    await p.context().close();
  }
} catch (e){ check('prova dei sensori dell\'app', false, String(e.stack || e)); }
finally { await browser.close(); }
summary();
