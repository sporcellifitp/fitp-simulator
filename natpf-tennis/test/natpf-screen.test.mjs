// Schermo (natpf_screen.js, B8 del 04/11): schermo intero senza cornici in tutte le versioni (browser e Cloudflare,
// LAN in Edge, programma Windows con Electron). Funzioni pure e controllo dello schermo intero con finestra, documento
// e navigator finti (nessun DOM vero, nessun ui-world).
import test from 'node:test';
import assert from 'node:assert/strict';
import { NatpfFullscreen, fullscreenGesture, autoFullscreen, fsPref, FS_KEY, FS_TEXT, AUTO_EVENTS } from '../src/natpf/natpf_screen.js';

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
