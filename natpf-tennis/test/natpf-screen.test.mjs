// Schermo (natpf_screen.js, B8 del 04/11): schermo intero senza cornici in tutte le versioni (browser e Cloudflare,
// LAN in Edge, programma Windows con Electron). Funzioni pure e controllo dello schermo intero con finestra, documento
// e navigator finti (nessun DOM vero, nessun ui-world).
import test from 'node:test';
import assert from 'node:assert/strict';
import { NatpfFullscreen, fullscreenGesture, autoFullscreen, fsPref, FS_KEY, FS_TEXT, AUTO_EVENTS,
  screenArea, readScreen, normalizeScreen, normalizeMargins, hasMargins, parseCal, calText, screenSummary, SCREENS, FORMATS,
  fitMargins, marginRoom, AREA_MIN } from '../src/natpf/natpf_screen.js';
import { arrowDir, stepMargins, nextEdge, calInfo, EDGES } from '../src/natpf/natpf_calibra.js';

// finestra, documento, navigator e archivio finti; fire() manda un evento ai listener della finestra come il browser
function env({ desktop = null, webdriver = false, search = '', pref = null, reject = false, displayMode = false, keyboard = true } = {}){
  const ls = {}, docLs = {}, calls = { request: 0, exit: 0, lock: [], unlock: 0 }, hints = [];
  const win = {
    location: { search },
    addEventListener(t, fn, cap){ (ls[t] ||= []).push({ fn, cap: cap === true }); },
    removeEventListener(t, fn){ ls[t] = (ls[t] || []).filter(l => l.fn !== fn); },
    matchMedia: q => ({ matches: displayMode && /display-mode: fullscreen/.test(q), addEventListener(){} }),
  };
  if (desktop) win.natpfDesktop = desktop;
  const doc = {
    fullscreenElement: null,
    documentElement: { requestFullscreen(){ calls.request++; if (reject) return Promise.reject(new Error('negato')); doc.fullscreenElement = doc.documentElement; return Promise.resolve(); } },
    exitFullscreen(){ calls.exit++; doc.fullscreenElement = null; return Promise.resolve(); },
    addEventListener(t, fn){ (docLs[t] ||= []).push(fn); },
  };
  const nav = { webdriver, keyboard: keyboard ? { lock(keys){ calls.lock.push(keys); return Promise.resolve(); }, unlock(){ calls.unlock++; } } : undefined };
  const store = new Map(); if (pref) store.set(FS_KEY, pref);
  const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  // eventi senza preventDefault/stopPropagation: se il controllo provasse a fermarli la prova fallirebbe
  const fire = (type, extra = {}) => { const e = Object.freeze({ type, ...extra }); for (const l of [...(ls[type] || [])]) l.fn(e); return e; };
  const make = () => new NatpfFullscreen({ win, doc, nav, storage, onHint: t => hints.push(t) });
  return { win, doc, nav, storage, store, calls, hints, fire, ls, docLs, make };
}
const tick = () => new Promise(r => setTimeout(r, 0));
// programma Windows finto (contratto di window.natpfDesktop, preload di Electron)
function desktopApi(start = true){
  const api = { on: start, calls: [], cbs: [],
    isFullScreen: async () => api.on,
    setFullScreen: async on => { api.calls.push(on); api.on = !!on; api.cbs.forEach(cb => cb(api.on)); return api.on; },
    toggleFullScreen: async () => api.setFullScreen(!api.on),
    onFullScreenChange: cb => { api.cbs.push(cb); },
    shell: 'electron', version: 1 };
  return api;
}

test('schermo intero: quali input il browser accetta come gesto (niente Esc, modificatori, Tab, tasti ripetuti)', () => {
  const k = (key, code = key, extra = {}) => fullscreenGesture({ type: 'keydown', key, code, ...extra });
  assert.equal(k('Enter'), true); assert.equal(k('a', 'KeyA'), true); assert.equal(k(' ', 'Space'), true); assert.equal(k('f', 'KeyF'), true);
  for (const key of ['Escape', 'Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Tab', 'F11', 'F12']) assert.equal(k(key), false, key);
  assert.equal(k('Esc', 'Escape'), false, 'Esc con il nome vecchio');
  assert.equal(k('a', 'KeyA', { repeat: true }), false, 'tasto tenuto premuto');
  assert.equal(k('k', 'KeyK', { ctrlKey: true, shiftKey: true }), false, 'scorciatoia (pannello dell’addetto)');
  assert.equal(fullscreenGesture({ type: 'pointerdown', pointerType: 'mouse' }), true);
  assert.equal(fullscreenGesture({ type: 'pointerdown', pointerType: 'touch' }), false, 'il tocco vale alla fine (pointerup)');
  assert.equal(fullscreenGesture({ type: 'pointerup', pointerType: 'touch' }), true);
  assert.equal(fullscreenGesture({ type: 'pointerup', pointerType: 'pen' }), true);
  assert.equal(fullscreenGesture({ type: 'pointerup', pointerType: 'mouse' }), false);
  assert.equal(fullscreenGesture({ type: 'click' }), true);
  assert.equal(fullscreenGesture(null), false);
  assert.equal(fullscreenGesture({ type: 'click', isTrusted: false }), false, 'el.click() dal codice (menu all’avvio)');
  assert.equal(fullscreenGesture({ type: 'keydown', key: 'Enter', code: 'Enter', isTrusted: true }), true);
  assert.deepEqual([...AUTO_EVENTS], ['keydown', 'pointerdown', 'pointerup', 'click']);
});

test('schermo intero automatico: sì di base; no con ?fs=0, «Finestra», programma Windows, già senza cornici, prove automatiche senza ?fs=1', () => {
  assert.equal(autoFullscreen({}), true);
  assert.equal(autoFullscreen({ search: '?intro=0' }), true);
  assert.equal(autoFullscreen({ search: '?fs=0' }), false);
  assert.equal(autoFullscreen({ pref: 'off' }), false);
  assert.equal(autoFullscreen({ desktop: true }), false);
  assert.equal(autoFullscreen({ frameless: true }), false);
  assert.equal(autoFullscreen({ webdriver: true }), false);
  assert.equal(autoFullscreen({ webdriver: true, search: '?fs=1' }), true);
  assert.equal(autoFullscreen({ webdriver: true, search: '?fs=1', pref: 'off' }), false, 'la scelta «Finestra» vale anche con ?fs=1');
  assert.equal(fsPref('off'), 'off'); assert.equal(fsPref('auto'), 'auto'); assert.equal(fsPref(null), 'auto'); assert.equal(fsPref('boh'), 'auto');
});

test('primo tasto: requestFullscreen una volta sola, non con Esc né con i modificatori; poi Esc bloccato per il gioco', async () => {
  const t = env(), fs = t.make();
  assert.equal(fs.armAuto(), true);
  assert.ok(AUTO_EVENTS.every(type => t.ls[type]?.length === 1 && t.ls[type][0].cap), 'in ascolto in cattura sulla finestra');
  t.fire('keydown', { key: 'Escape', code: 'Escape' }); t.fire('keydown', { key: 'Shift', code: 'ShiftLeft' });
  assert.equal(t.calls.request, 0, 'Esc e Maiusc non aprono lo schermo intero');
  t.fire('keydown', { key: 'Enter', code: 'Enter' });
  assert.equal(t.calls.request, 1, 'il primo tasto buono lo apre, subito (dentro il gesto)');
  t.fire('keydown', { key: 'a', code: 'KeyA' }); t.fire('click', {});
  assert.equal(t.calls.request, 1, 'richiesta in corso: non si ripete');
  assert.equal(fs.toggle(), fs.pending, 'il tasto F nello stesso momento non la annulla');
  await tick();
  assert.equal(fs.frameless, true); assert.equal(fs.label, FS_TEXT.exit);
  assert.deepEqual(t.calls.lock, [['Escape']], 'Esc breve al gioco, tenuto premuto esce');
  assert.equal(fs.armed, false, 'un successo spegne l’apertura automatica');
  assert.ok(AUTO_EVENTS.every(type => !t.ls[type]?.length), 'listener tolti');
  t.fire('keydown', { key: 'b', code: 'KeyB' });
  assert.equal(t.calls.request, 1);
  // uscita: exitFullscreen e Esc sbloccato
  assert.equal(await fs.toggle(), true);
  assert.equal(t.calls.exit, 1); assert.ok(t.calls.unlock >= 1); assert.equal(fs.label, FS_TEXT.enter);
});

test('uscita dallo schermo intero da parte del browser (Esc tenuto): Esc sbloccato e stato aggiornato', async () => {
  const t = env(), fs = t.make(); let changes = 0; fs.onChange = () => changes++;
  await fs.enter(); assert.equal(fs.frameless, true);
  t.doc.fullscreenElement = null; t.docLs.fullscreenchange.forEach(fn => fn());
  assert.equal(fs.frameless, false); assert.ok(t.calls.unlock >= 1); assert.ok(changes >= 2);
});

test('tocco: lo schermo intero si chiede alla fine del tocco (pointerup), il clic del mouse subito (pointerdown)', async () => {
  const t = env(), fs = t.make(); fs.armAuto();
  t.fire('pointerdown', { pointerType: 'touch' }); assert.equal(t.calls.request, 0);
  t.fire('pointerup', { pointerType: 'touch' }); assert.equal(t.calls.request, 1);
  const m = env(), fm = m.make(); fm.armAuto();
  m.fire('pointerdown', { pointerType: 'mouse' }); m.fire('pointerup', { pointerType: 'mouse' }); m.fire('click', {});
  assert.equal(m.calls.request, 1);
  await tick();
});

test('prove automatiche (navigator.webdriver): niente schermo intero da solo, salvo ?fs=1; ?fs=0 e «Finestra» lo spengono', async () => {
  const w = env({ webdriver: true }), fw = w.make();
  assert.equal(fw.armAuto(), false); w.fire('keydown', { key: 'Enter', code: 'Enter' }); assert.equal(w.calls.request, 0);
  const w1 = env({ webdriver: true, search: '?fs=1' }), f1 = w1.make();
  assert.equal(f1.armAuto(), true); w1.fire('keydown', { key: 'Enter', code: 'Enter' }); assert.equal(w1.calls.request, 1);
  const z = env({ search: '?intro=0&fs=0' }), fz = z.make();
  assert.equal(fz.armAuto(), false); z.fire('keydown', { key: 'Enter', code: 'Enter' }); assert.equal(z.calls.request, 0);
  const o = env({ pref: 'off' }), fo = o.make();
  assert.equal(fo.armAuto(), false); assert.equal(fo.pref, 'off');
  fo.pref = 'auto'; assert.equal(o.store.get(FS_KEY), 'auto');
  // preferenza cambiata a «Finestra» dopo l'avvio, prima del primo tasto: niente schermo intero
  const p = env(), fp = p.make(); fp.armAuto(); fp.pref = 'off';
  p.fire('keydown', { key: 'Enter', code: 'Enter' }); assert.equal(p.calls.request, 0);
  await tick();
});

test('programma Windows (window.natpfDesktop): mai requestFullscreen, si usa setFullScreen; niente apertura automatica', async () => {
  const api = desktopApi(true), t = env({ desktop: api }), fs = t.make();
  assert.equal(fs.armAuto(), false, 'la finestra del programma parte già a schermo intero');
  t.fire('keydown', { key: 'Enter', code: 'Enter' });
  await tick();
  assert.equal(fs.frameless, true); assert.equal(fs.label, FS_TEXT.exit);
  assert.equal(await fs.toggle(), true, 'esce');
  assert.deepEqual(api.calls, [false]); assert.equal(fs.frameless, false); assert.equal(fs.label, FS_TEXT.enter);
  assert.equal(await fs.toggle(), true, 'rientra');
  assert.deepEqual(api.calls, [false, true]); assert.equal(fs.frameless, true);
  // F11 dal menu del programma: lo stato arriva da onFullScreenChange
  api.on = false; api.cbs.forEach(cb => cb(false)); assert.equal(fs.frameless, false);
  assert.equal(t.calls.request, 0, 'requestFullscreen mai chiamato');
  assert.deepEqual(t.calls.lock, []);
  // finestra del programma aperta in finestra (impostazione salvata): isFullScreen() lo dice
  const a2 = desktopApi(false), t2 = env({ desktop: a2 }), f2 = t2.make();
  await tick();
  assert.equal(f2.frameless, false);
  assert.equal(await f2.toggle(), true); assert.deepEqual(a2.calls, [true]); assert.equal(t2.calls.request, 0);
});

test('browser in F11 (display-mode: fullscreen): già senza cornici; «Esci» dice di premere F11', async () => {
  const t = env({ displayMode: true }), fs = t.make();
  assert.equal(fs.frameless, true); assert.equal(fs.label, FS_TEXT.exit);
  assert.equal(fs.armAuto(), false);
  assert.equal(await fs.toggle(), false);
  assert.equal(t.calls.exit, 0); assert.deepEqual(t.hints, [FS_TEXT.f11]);
  assert.match(FS_TEXT.f11, /Premi F11/);
});

test('richiesta rifiutata: in automatico in silenzio e si riprova (al massimo tre volte); a mano lo si dice', async () => {
  const t = env({ reject: true }), fs = t.make(); fs.armAuto();
  for (let i = 0; i < 5; i++){ t.fire('keydown', { key: 'a', code: 'KeyA' }); await tick(); }
  assert.equal(t.calls.request, 3); assert.equal(fs.armed, false); assert.deepEqual(t.hints, []);
  assert.equal(await fs.toggle(), false); assert.deepEqual(t.hints, [FS_TEXT.fail]);
  // browser senza schermo intero (iPhone): niente richiesta, a mano il messaggio
  const n = env(); n.doc.documentElement = {}; const fn = n.make();
  fn.armAuto(); n.fire('keydown', { key: 'a', code: 'KeyA' }); assert.equal(fn.armed, false); assert.deepEqual(n.hints, []);
  assert.equal(await fn.enter(), false); assert.deepEqual(n.hints, [FS_TEXT.fail]);
  // senza Keyboard Lock (Firefox, Safari) si entra lo stesso
  const k = env({ keyboard: false }), fk = k.make();
  assert.equal(await fk.enter(), true); assert.equal(fk.frameless, true);
});

test('apertura automatica: non anticipa i comandi dello schermo intero (pulsante, «Finestra») e non ferma gli eventi', async () => {
  const t = env(), fs = t.make(); fs.armAuto();
  const on = sel => ({ closest: s => (s.split(',').map(x => x.trim()).includes(sel) ? {} : null) });
  t.fire('pointerdown', { pointerType: 'mouse', target: on('[data-natpf-fs]') });
  t.fire('click', { target: on('[data-natpf-fs]') });
  t.fire('keydown', { key: 'Enter', code: 'Enter', target: on('#natpf-fullscreen') });
  assert.equal(t.calls.request, 0, 'il clic su «Finestra» o sul pulsante non passa dall’apertura automatica');
  assert.equal(fs.armed, true);
  t.fire('pointerdown', { pointerType: 'mouse', target: on('.menu-item') });
  assert.equal(t.calls.request, 1, 'un clic altrove sì');
  await tick();
});

test('programma Windows: vale lo stato della finestra, non display-mode (che può restare indietro)', async () => {
  const api = desktopApi(false), t = env({ desktop: api, displayMode: true }), fs = t.make();
  await tick();
  assert.equal(fs.frameless, false, 'finestra con le cornici anche se display-mode dice ancora fullscreen');
  assert.equal(fs.label, FS_TEXT.enter);
  assert.equal(await fs.toggle(), true); assert.deepEqual(api.calls, [true]); assert.equal(t.calls.request, 0);
});

/* ---------- calibrazione dello schermo: area, ordine delle scelte, salvataggio ---------- */

test('area: formati 16:9, 16:10, 4:3, 3:2, 1:1 al centro; Intero riempie il monitor (full solo se è tutta la finestra)', () => {
  assert.deepEqual([...FORMATS], ['full', '16x9', '16x10', '4x3', '3x2', '2x2']);
  assert.deepEqual(FORMATS.map(f => SCREENS[f].short), ['Intero', '16:9', '16:10', '4:3', '3:2', '1:1']);
  assert.deepEqual(screenArea({ preset: 'full' }, 1920, 1080), { x: 0, y: 0, w: 1920, h: 1080, full: true });
  assert.deepEqual(screenArea({ preset: '16x9' }, 1920, 1080), { x: 0, y: 0, w: 1920, h: 1080, full: true }, '16:9 su un monitor 16:9 è tutto lo schermo');
  assert.deepEqual(screenArea({ preset: '16x10' }, 1920, 1080), { x: 96, y: 0, w: 1728, h: 1080, full: false });
  assert.deepEqual(screenArea({ preset: '4x3' }, 1920, 1080), { x: 240, y: 0, w: 1440, h: 1080, full: false });
  assert.deepEqual(screenArea({ preset: '16x9' }, 1920, 1200), { x: 0, y: 60, w: 1920, h: 1080, full: false }, 'monitor 16:10: bande sopra e sotto');
  // i formati di prima restano uguali (natpf-split.test.mjs)
  assert.deepEqual(screenArea({ preset: '2x2' }, 1920, 1080), { x: 420, y: 0, w: 1080, h: 1080, full: false });
  assert.deepEqual(screenArea({ preset: '3x2' }, 1000, 1000), { x: 0, y: 167, w: 1000, h: 667, full: false });
});

test('area: bordi visibili in percentuale della finestra, poi il formato al centro di quello che resta', () => {
  assert.deepEqual(screenArea({ preset: 'full', margins: { l: 5, b: 5 } }, 1920, 1080), { x: 96, y: 0, w: 1824, h: 1026, full: false });
  assert.deepEqual(screenArea({ preset: '2x2', margins: { l: 5, b: 5 } }, 1920, 1080), { x: 495, y: 0, w: 1026, h: 1026, full: false }, '1:1 dentro i bordi');
  assert.deepEqual(screenArea({ preset: 'full', margins: { t: 2.5, r: 2.5, b: 2.5, l: 2.5 } }, 1920, 1080), { x: 48, y: 27, w: 1824, h: 1026, full: false }, 'overscan del televisore');
  // processore LED che prende l'angolo in alto a sinistra dell'uscita del PC (1152 × 648 di 1920 × 1080)
  assert.deepEqual(screenArea({ preset: 'full', margins: { r: 40, b: 40 } }, 1920, 1080), { x: 0, y: 0, w: 1152, h: 648, full: false });
  // l'area esatta dall'indirizzo vince anche sui bordi
  assert.deepEqual(screenArea({ preset: '2x2', margins: { l: 10 }, area: { x: 0, y: 0, w: 768, h: 512 } }, 1920, 1080), { x: 0, y: 0, w: 768, h: 512, full: false });
  // i bordi seguono la finestra: stesse percentuali su un altro monitor
  assert.deepEqual(screenArea({ preset: 'full', margins: { l: 5, b: 5 } }, 1280, 720), { x: 64, y: 0, w: 1216, h: 684, full: false });
});

test('bordi: 0-90% per lato a passi di 0,5; valori sbagliati a 0; l’area resta almeno 480 × 360 px', () => {
  assert.deepEqual(normalizeMargins({ t: -3, r: 95, b: '2.26', l: NaN }), { t: 0, r: 90, b: 2.5, l: 0 });
  assert.deepEqual(normalizeMargins(null), { t: 0, r: 0, b: 0, l: 0 });
  assert.equal(hasMargins({ l: 0.5 }), true); assert.equal(hasMargins({}), false);
  assert.deepEqual(AREA_MIN, { w: 480, h: 360 });
  // spazio per i due bordi di un asse: 1920 → 75%, 1080 → 66,5%, 720 → 50%; finestra più piccola del minimo: niente
  assert.equal(marginRoom(1920, 480), 75); assert.equal(marginRoom(1080, 360), 66.5); assert.equal(marginRoom(720, 360), 50);
  assert.equal(marginRoom(400, 480), 0); assert.equal(marginRoom(0, 480), 0);
  // bordi al massimo: l'area è quella minima, al centro (prima restava il 10%: 100 × 100 px, menu inutilizzabile)
  assert.deepEqual(screenArea({ margins: { t: 99, r: 99, b: 99, l: 99 } }, 1000, 1000), { x: 260, y: 320, w: 480, h: 360, full: false });
  assert.deepEqual(screenArea({ margins: { t: 45, r: 45, b: 45, l: 45 } }, 1920, 1080), { x: 720, y: 356, w: 480, h: 368, full: false });
  // processore LED che prende 1000 × 1000 in alto a sinistra di 1920 × 1080: a destra il 48% (prima al massimo il 45%:
  // area larga 1056 e il riquadro 1:1 a x = 28 invece che a 0)
  assert.deepEqual(screenArea({ preset: 'full', margins: { r: 48, b: 7.5 } }, 1920, 1080), { x: 0, y: 0, w: 998, h: 999, full: false });
  assert.equal(screenArea({ preset: '2x2', margins: { r: 48, b: 7.5 } }, 1920, 1080).x, 0);
  // un lato solo può arrivare oltre metà finestra (angolo piccolo dell'uscita)
  assert.deepEqual(screenArea({ margins: { r: 70, b: 60 } }, 1920, 1080), { x: 0, y: 0, w: 576, h: 432, full: false });
});

test('bordi nella finestra (fitMargins): il bordo che si sposta si ferma all’area minima; gli altri casi in proporzione', () => {
  // un bordo solo: si ferma (l'altro bordo dell'asse non cambia)
  assert.deepEqual(fitMargins({ l: 30, r: 50 }, 1920, 1080, { l: 30, r: 45 }), { t: 0, r: 45, b: 0, l: 30 });
  assert.deepEqual(fitMargins({ t: 70 }, 1920, 1080, { t: 65 }), { t: 66.5, r: 0, b: 0, l: 0 });
  // «Tutti» (tutti e due gli assi spostati): in proporzione, per difetto al mezzo punto
  assert.deepEqual(fitMargins({ t: 35, r: 40, b: 35, l: 40 }, 1920, 1080, { t: 30, r: 35, b: 30, l: 35 }), { t: 33, r: 37.5, b: 33, l: 37.5 });
  // finestra più piccola di quando si è calibrato (senza prev): in proporzione
  assert.deepEqual(fitMargins({ r: 70, b: 60 }, 1280, 720), { t: 0, r: 62.5, b: 50, l: 0 });
  // dentro i limiti: invariati
  assert.deepEqual(fitMargins({ t: 2.5, r: 2.5, b: 2.5, l: 2.5 }, 1280, 720), { t: 2.5, r: 2.5, b: 2.5, l: 2.5 });
  // l'area che ne viene non scende sotto il minimo (salvo un pixel di arrotondamento)
  for (const [w, h] of [[1280, 720], [1920, 1080], [1200, 1200], [3840, 2160], [1366, 768]]){
    const a = screenArea({ margins: fitMargins({ t: 90, r: 90, b: 90, l: 90 }, w, h) }, w, h);
    assert.ok(a.w >= AREA_MIN.w - 1 && a.h >= AREA_MIN.h - 1, `${w} × ${h}: ${a.w} × ${a.h}`);
  }
});

test('formati: nomi dall’indirizzo (16:9, 1:1, intero) e quelli di prima', () => {
  assert.equal(normalizeScreen('16:9'), '16x9'); assert.equal(normalizeScreen('16:10'), '16x10'); assert.equal(normalizeScreen('4:3'), '4x3');
  assert.equal(normalizeScreen('1:1'), '2x2'); assert.equal(normalizeScreen('3:2'), '3x2'); assert.equal(normalizeScreen('intero'), 'full');
  assert.equal(normalizeScreen('2x2'), '2x2'); assert.equal(normalizeScreen('boh'), 'full'); assert.equal(normalizeScreen(undefined), 'full');
  assert.equal(normalizeScreen('toString'), 'full', 'niente proprietà ereditate');
});

test('ordine delle scelte: ?area= > ?schermo= (con i bordi salvati) > calibrazione salvata > scelta di prima', () => {
  const cal = calText({ preset: '4x3', margins: { l: 5, b: 5 } });
  const a = readScreen('?area=10,20,800,600&schermo=2x2', '3x2', cal);
  assert.deepEqual(a.area, { x: 10, y: 20, w: 800, h: 600 }); assert.equal(a.source, 'area'); assert.equal(a.fromUrl, true);
  const u = readScreen('?schermo=1:1', '3x2', cal);
  assert.equal(u.preset, '2x2'); assert.deepEqual(u.margins, { t: 0, r: 0, b: 5, l: 5 }, 'i bordi salvati valgono anche con ?schermo='); assert.equal(u.source, 'url');
  const c = readScreen('', '3x2', cal);
  assert.equal(c.preset, '4x3'); assert.equal(c.source, 'cal'); assert.equal(c.fromUrl, false);
  const o = readScreen('', '3x2', null);
  assert.equal(o.preset, '3x2'); assert.deepEqual(o.margins, { t: 0, r: 0, b: 0, l: 0 }); assert.equal(o.source, 'saved');
  assert.equal(readScreen('', null, null).source, 'default');
  assert.equal(readScreen('', '3x2', '{"v":2,"preset":"2x2"}').preset, '3x2', 'calibrazione di un formato sconosciuto: si ignora');
  assert.equal(readScreen('', '3x2', 'non è json').preset, '3x2');
});

test('calibrazione salvata: JSON {v:1, preset, margins}, letto e riscritto uguale; riassunto per le Opzioni', () => {
  const t = calText({ preset: '16:10', margins: { t: 1, r: 2, b: 3.3, l: 95 } });
  assert.deepEqual(JSON.parse(t), { v: 1, preset: '16x10', margins: { t: 1, r: 2, b: 3.5, l: 90 } });
  assert.deepEqual(parseCal(t), { v: 1, preset: '16x10', margins: { t: 1, r: 2, b: 3.5, l: 90 } });
  assert.deepEqual(parseCal({ v: 1, preset: 'x' }), { v: 1, preset: 'full', margins: { t: 0, r: 0, b: 0, l: 0 } });
  assert.equal(parseCal(null), null); assert.equal(parseCal('{}'), null);
  assert.equal(screenSummary({ preset: '4x3', margins: { l: 5, b: 2.5 } }), 'Calibrato: formato 4:3 · bordi ↑ 0 · → 0 · ↓ 2,5 · ← 5 %');
  assert.equal(screenSummary({ preset: 'full', margins: { t: 1 } }), 'Calibrato: formato intero · bordi ↑ 1 · → 0 · ↓ 0 · ← 0 %');
});

test('calibrazione: frecce, Tab e passi (Maiusc 5%)', () => {
  // un bordo si sposta nella direzione della freccia; «Tutti»: ↑ → più grande, ↓ ← più piccola
  assert.equal(arrowDir('l', 'ArrowRight'), 1); assert.equal(arrowDir('l', 'ArrowLeft'), -1); assert.equal(arrowDir('l', 'ArrowUp'), 0);
  assert.equal(arrowDir('b', 'ArrowUp'), 1); assert.equal(arrowDir('b', 'ArrowDown'), -1);
  assert.equal(arrowDir('t', 'ArrowDown'), 1); assert.equal(arrowDir('r', 'ArrowLeft'), 1);
  assert.equal(arrowDir('all', 'ArrowUp'), -1); assert.equal(arrowDir('all', 'ArrowRight'), -1); assert.equal(arrowDir('all', 'ArrowDown'), 1); assert.equal(arrowDir('all', 'ArrowLeft'), 1);
  assert.deepEqual(stepMargins({}, 'l', 1), { t: 0, r: 0, b: 0, l: 0.5 });
  assert.deepEqual(stepMargins({}, 'l', 1, true), { t: 0, r: 0, b: 0, l: 5 });
  assert.deepEqual(stepMargins({ t: 1, r: 1, b: 1, l: 1 }, 'all', -1), { t: 0.5, r: 0.5, b: 0.5, l: 0.5 });
  assert.deepEqual(stepMargins({ l: 0 }, 'l', -1), { t: 0, r: 0, b: 0, l: 0 }, 'non sotto zero');
  assert.deepEqual(stepMargins({ l: 88 }, 'l', 1, true), { t: 0, r: 0, b: 0, l: 90 }, 'non oltre il 90% (poi fitMargins con la finestra)');
  assert.deepEqual([...EDGES], ['all', 't', 'r', 'b', 'l']);
  assert.equal(nextEdge('all'), 't'); assert.equal(nextEdge('l'), 'all'); assert.equal(nextEdge('all', true), 'l');
});

test('calibrazione: i numeri sullo schermo (finestra, densità, monitor, area, formato, bordi)', () => {
  const i = calInfo({ win: { w: 1536, h: 864 }, dpr: 1.25, screen: { w: 1536, h: 864 }, area: { x: 77, y: 0, w: 1459, h: 821 }, preset: '2x2', margins: { t: 0, r: 0, b: 5, l: 5 } });
  assert.equal(i.win, '1536 × 864 px'); assert.equal(i.dpr, '× 1,25');
  assert.equal(i.screen, '1536 × 864 px (1920 × 1080 reali)');
  assert.equal(i.area, '1459 × 821 px da 77, 0 (1824 × 1026 reali)');
  assert.equal(i.format, '1:1 · Ledwall 2×2'); assert.equal(i.margins, '↑ 0 · → 0 · ↓ 5 · ← 5 %');
  assert.equal(calInfo({ win: { w: 1, h: 1 }, dpr: 1, screen: { w: 1, h: 1 }, area: { x: 0, y: 0, w: 1, h: 1 }, preset: 'full', margins: {} }).format, 'Intero (tutto il monitor)');
  assert.equal(calInfo({ win: { w: 1, h: 1 }, dpr: 1, screen: { w: 1, h: 1 }, area: { x: 0, y: 0, w: 1, h: 1 }, preset: '16x9', margins: {} }).format, '16:9');
});

/* ---------- posto nella pagina: messaggi e calibrazione fuori dal menu ---------- */

// antenati (tag#id) di un elemento di index.html: lettore di tag minimo (commenti, script e style tolti; elementi vuoti e
// «/>» senza chiusura)
function ancestors(html, id){
  const src = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const stack = [];
  for (const m of src.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)){
    const [, close, tag, attrs, self] = m, name = tag.toLowerCase();
    if (close){ const i = stack.map(s => s.tag).lastIndexOf(name); if (i >= 0) stack.length = i; continue; }
    const el = { tag: name, id: /\bid="([^"]+)"/.exec(attrs)?.[1] || '' };
    if (el.id === id) return stack.map(s => s.tag + (s.id ? '#' + s.id : ''));
    if (!self && !VOID.has(name)) stack.push(el);
  }
  return null;
}
test('pagina: toast e calibrazione figli diretti del body (il toast dentro il menu in campo era nascosto con il menu)', async () => {
  const fs = await import('node:fs');
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.deepEqual(ancestors(html, 'natpf-toast'), ['html', 'body']);
  assert.deepEqual(ancestors(html, 'natpf-calibra'), ['html', 'body']);
  assert.deepEqual(ancestors(html, 'lobby-back').slice(0, 3), ['html', 'body', 'div#title-modal'], 'il lettore trova davvero gli antenati');
  // sopra la calibrazione (z 300), sotto la tendina tra le schermate
  const css = fs.readFileSync(new URL('../natpf-ui.css', import.meta.url), 'utf8');
  const z = sel => Number(new RegExp(`(?:^|\\n)${sel.replace('.', '\\.')} \\{[^}]*?z-index: (\\d+)`).exec(css)?.[1]);
  assert.ok(z('.natpf-toast') > z('.natpf-calibra') && z('.natpf-toast') < z('.natpf-wipe'), JSON.stringify([z('.natpf-toast'), z('.natpf-calibra'), z('.natpf-wipe')]));
});
