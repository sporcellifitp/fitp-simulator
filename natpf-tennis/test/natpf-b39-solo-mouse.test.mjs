// B39 · Stand con il solo mouse (docs/b39/stand-solo-mouse.md): parti della pagina del gioco. Funzioni pure e comandi del
// menu del tasto destro del programma Windows (natpf_stand_mouse.js); il resto nel mondo di prova (ui-world.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { blockedMouseButton, downloadText, toastMs, LINK_TEXT, NatpfStandMouse } from '../src/natpf/natpf_stand_mouse.js';
import { makeWorld } from './ui-world.mjs';

test('B39.1 · tasti del mouse senza effetto nel programma: laterali 3 e 4 sempre, centrale alla pressione; sinistro e destro liberi', () => {
  for (const type of ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'auxclick']){
    assert.equal(blockedMouseButton({ type, button: 3 }), true, `${type} 3`);
    assert.equal(blockedMouseButton({ type, button: 4 }), true, `${type} 4`);
    assert.equal(blockedMouseButton({ type, button: 0 }), false, `${type} 0`);
    assert.equal(blockedMouseButton({ type, button: 2 }), false, `${type} 2 (menu dello staff)`);
  }
  assert.equal(blockedMouseButton({ type: 'mousedown', button: 1 }), true, 'centrale premuto: niente scorrimento automatico');
  assert.equal(blockedMouseButton({ type: 'auxclick', button: 1 }), true, 'centrale su un link: niente finestra nuova');
  assert.equal(blockedMouseButton({ type: 'mouseup', button: 1 }), false);
  assert.equal(blockedMouseButton(null), false);
});

test('B39.4 · avvisi del programma: file salvato (nome e cartella), non salvato, link per il telefono; durata secondo la lunghezza', () => {
  assert.equal(downloadText({ ok: true, name: 'classifica-natpf-2026-11-14.csv', folder: 'Download › NATPF' }), 'Salvato in Download › NATPF: classifica-natpf-2026-11-14.csv');
  assert.match(downloadText({ ok: false }), /^Salvataggio non riuscito/);
  assert.match(LINK_TEXT, /per il telefono[^]*QR/);
  assert.equal(toastMs(''), 2600); assert.equal(toastMs('x'.repeat(500)), 7000);
  assert.ok(toastMs(LINK_TEXT) > 2600 && toastMs(LINK_TEXT) < 7000);
});

// interfaccia finta: registra quello che i comandi chiedono
function fakeUi({ kiosk = false, pause = false, calibra = false } = {}){
  const log = [];
  const ui = {
    log,
    kiosk: { isOpen: kiosk, close(){ this.isOpen = false; log.push('kiosk.close'); }, open(){ this.isOpen = true; log.push('kiosk.open'); } },
    pause: { isOpen: pause, close(){ this.isOpen = false; log.push('pause.close'); } },
    diag: { isOpen: false, open(o){ this.isOpen = true; log.push(['diag.open', o]); } },
    calibra: { isOpen: calibra, open(){ this.isOpen = true; log.push('calibra.open'); }, cancel(){ this.isOpen = false; log.push('calibra.cancel'); } },
    screen: { save(c){ log.push(['screen.save', c]); } },
    lobby: { visible: true, paint(){ log.push('lobby.paint'); } },
    _syncPause(){ log.push('syncPause'); },
    toast(t, ms){ log.push(['toast', t, ms]); },
  };
  return ui;
}
const bare = ui => Object.assign(Object.create(NatpfStandMouse.prototype), { engine: {}, ui });

test('B39.4 · comandi del tasto destro: Diagnostica (dal pannello aperto si torna al pannello), Calibra, Azzera la calibrazione', () => {
  let ui = fakeUi({ kiosk: true });
  assert.equal(bare(ui).command('diagnostica'), true);
  assert.deepEqual(ui.log, ['kiosk.close', ['diag.open', { back: 'staff' }]], 'pannello chiuso, diagnostica che torna al pannello');
  ui = fakeUi();
  bare(ui).command('diagnostica');
  assert.deepEqual(ui.log, [['diag.open', { back: null }]]);
  ui = fakeUi({ kiosk: true, pause: true });
  bare(ui).command('calibra');
  assert.deepEqual(ui.log, ['kiosk.close', 'pause.close', 'calibra.open', 'syncPause'], 'pannello e pausa chiusi, calibrazione sopra, partita ferma');
  ui = fakeUi({ calibra: true });
  bare(ui).command('azzera-calibrazione');
  assert.deepEqual(ui.log.slice(0, 3), ['calibra.cancel', ['screen.save', { preset: 'full', margins: { t: 0, r: 0, b: 0, l: 0 } }], 'lobby.paint']);
  assert.match(ui.log.at(-1)[1], /azzerata/);
  // nient'altro: i comandi del programma non arrivano alla pagina (e la pagina non li esegue)
  ui = fakeUi();
  for (const c of ['esci', 'ricarica', 'riavvia', 'pannello', '', undefined]) assert.equal(bare(ui).command(c), false, String(c));
  assert.deepEqual(ui.log, []);
  // avvisi
  ui = fakeUi(); const m = bare(ui);
  m.notice({ kind: 'link' }); m.notice({ kind: 'download', ok: true, name: 'a.csv', folder: 'Download › NATPF' }); m.notice({ kind: 'altro' }); m.notice(null);
  assert.deepEqual(ui.log.map(x => x[1]), [LINK_TEXT, 'Salvato in Download › NATPF: a.csv']);
});

test('B39.4 · nel gioco: modulo creato, la diagnostica aperta dal pannello torna al pannello, la calibrazione dello schermo ferma la partita', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  assert.ok(w.ui.mouse instanceof NatpfStandMouse);
  assert.equal(w.ui.mouse.desktop, false, 'nel browser niente comandi del programma');
  // diagnostica dal pannello: alla chiusura si torna al pannello
  w.ui.kiosk.open(); w.ui.mouse.command('diagnostica');
  assert.ok(w.ui.diag.isOpen && !w.ui.kiosk.isOpen);
  w.ui.diag.close();
  assert.ok(w.ui.kiosk.isOpen, 'pannello di nuovo aperto');
  w.ui.kiosk.close();
  // in campo: la calibrazione aperta dal tasto destro ferma la partita, chiusa la fa ripartire
  w.pressStart(); w.advance(500);
  assert.ok(w.ui.pause.inGame && !w.E.natpfPaused, `in campo: ${w.E.phase}`);
  w.ui.calibra.isOpen = true; w.ui._syncPause();
  assert.equal(w.ui.staffOpen(), true); assert.equal(w.E.natpfPaused, true, 'partita ferma con la calibrazione aperta');
  w.ui.calibra.isOpen = false; w.ui._syncPause();
  assert.equal(w.E.natpfPaused, false, 'chiusa: si riprende');
});

/* ---------- B39.3 · pannello dello stand raggiungibile con il mouse ---------- */
import { HOLD, holdProgress, holdMoved, HoldPress } from '../src/natpf/natpf_hold.js';
import { STAFF_HINTS, staffHint } from '../src/natpf/natpf_stand_mouse.js';
import { $ } from './ui-world.mjs';

test('B39.3 · pressione lunga: 3 s, avanzamento 0…1, tollera piccoli spostamenti (24 px)', () => {
  assert.deepEqual([HOLD.ms, HOLD.slopPx], [3000, 24]);
  assert.equal(holdProgress(0), 0); assert.equal(holdProgress(1500), 0.5); assert.equal(holdProgress(3000), 1); assert.equal(holdProgress(9000), 1); assert.equal(holdProgress(-5), 0);
  assert.equal(holdMoved(10, 10), false, 'mano che trema: si continua');
  assert.equal(holdMoved(20, 20), true, '28 px: annullata');
  assert.equal(holdMoved(0, 25), true);
});

// bersaglio finto con gli ascoltatori (pointerdown, pointermove, pointerup…)
function fakeTarget(){
  const ls = {}, cls = new Set();
  return { ls, cls, addEventListener: (t, fn) => (ls[t] ||= []).push(fn), classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) },
    setPointerCapture(){}, releasePointerCapture(){}, contains: x => x === 'dentro', fire(t, e = {}){ for (const fn of ls[t] || []) fn({ type: t, button: 0, isPrimary: true, clientX: 100, clientY: 100, pointerId: 1, preventDefault(){}, ...e }); } };
}
test('B39.3 · HoldPress: dopo 3 s tenuti apre (una volta), si annulla rilasciando prima o spostandosi; il clic che segue non arriva al bersaglio', async () => {
  const w = await makeWorld({ controller: 'mouse' });     // timer virtuali (w.advance)
  let t = 0, opened = 0;
  const el = fakeTarget(), h = new HoldPress(el, { onDone: () => opened++, now: () => t });
  assert.ok(el.cls.has('natpf-hold-target'));
  // rilasciato a 2 s: niente
  el.fire('pointerdown'); assert.ok(h.active && el.cls.has('holding'));
  t = 2000; w.advance(2000); el.fire('pointerup'); w.advance(2000);
  assert.equal(opened, 0); assert.ok(!h.active && !el.cls.has('holding'));
  // tasto destro: non parte
  el.fire('pointerdown', { button: 2 }); assert.ok(!h.active);
  // spostato di 40 px: annullata
  t = 0; el.fire('pointerdown'); el.fire('pointermove', { clientX: 140, clientY: 100 }); t = 3500; w.advance(3500);
  assert.equal(opened, 0, 'spostata troppo');
  // tenuta 3 s con la mano che trema (10 px): apre una volta
  t = 0; el.fire('pointerdown'); el.fire('pointermove', { clientX: 108, clientY: 95 });
  t = 3000; w.advance(100);
  assert.equal(opened, 1); assert.ok(!h.active);
  t = 5000; w.advance(1000); assert.equal(opened, 1, 'una volta sola');
  // il clic che arriva al rilascio non passa al bersaglio (❚❚ non apre anche la pausa)
  assert.equal(h.suppress, true);
});

test('B39.3 · pannello dello stand: «Azzera oggi» con il secondo clic (niente confirm() di Windows), «Diagnostica» che torna al pannello, classifica a schermo intero che si chiude dalla stessa voce', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const k = w.ui.kiosk;
  assert.equal(k.needsConfirm('reset'), true, 'sempre, anche fuori dalla partita');
  assert.equal(k.needsConfirm('ranking'), false, 'fuori dalla partita la classifica parte al primo clic');
  let reset = 0; w.ui.events.resetBoard = () => { reset++; };
  globalThis.confirm = () => { throw new Error('confirm() non deve comparire'); };
  try {
    k.run('reset');
    assert.equal(reset, 1);
  } finally { delete globalThis.confirm; }
  // diagnostica dal pannello: il pannello si chiude, la diagnostica si apre e alla chiusura torna il pannello
  k.open(); k.run('diag');
  assert.ok(w.ui.diag.isOpen && !k.isOpen);
  w.ui.diag.close(); assert.ok(k.isOpen, 'di nuovo il pannello'); k.close();
  // classifica a schermo intero: la voce del pannello dice «Chiudi lo schermo intero» e torna al menu
  k.open(); k.run('ranking');
  assert.ok(document.documentElement.classList.contains('ranking-full') && w.ui.lobby.step === 'ranking');
  k.open(); k.paint();
  assert.equal($('natpf-staff').querySelector('[data-staff="ranking"] b').textContent, 'Chiudi lo schermo intero');
  k.run('ranking');
  assert.ok(!document.documentElement.classList.contains('ranking-full') && w.ui.lobby.step === 'menu' && !k.isOpen);
});

test('B39.3 · spiegazioni delle voci del pannello sotto il puntatore', () => {
  for (const k of ['kiosk', 'idle', 'ranking', 'export', 'reset', 'phone', 'music', 'diag', 'remote', 'display', 'newplayer', 'close']) assert.ok(STAFF_HINTS[k]?.length > 20, k);
  assert.equal(staffHint('aim', 'Alta: più palle angolate'), 'Alta: più palle angolate', 'il fumetto della voce vince');
  assert.match(staffHint('reset'), /secondo clic/);
  assert.equal(staffHint('sconosciuta'), '');
});

/* ---------- B39.2 · guardia del doppio clic ---------- */
import { GUARD, GUARDED, EXEMPT, clickVerdict, lateRule, ClickGuard } from '../src/natpf/natpf_click_guard.js';

test('B39.2 · regola del doppio clic: secondo clic e clic entro 450 ms da un cambio di schermata non contano; codice, tasti, calibrazione e campi sì', () => {
  assert.equal(GUARD.ms, 450);
  assert.equal(clickVerdict({ detail: 2 }), 'doppio'); assert.equal(clickVerdict({ detail: 3 }), 'doppio');
  assert.equal(clickVerdict({ detail: 1, now: 1000, changedAt: 600 }), 'tardi', '400 ms dopo il cambio');
  assert.equal(clickVerdict({ detail: 1, now: 1000, changedAt: 550 }), false, '450 ms dopo: conta');
  assert.equal(clickVerdict({ detail: 1, now: 1000 }), false, 'nessun cambio');
  assert.equal(clickVerdict({ detail: 2, trusted: false }), false, 'el.click() del codice');
  assert.equal(clickVerdict({ detail: 0, now: 1000, changedAt: 990 }), false, 'Invio sulla voce (detail 0)');
  assert.equal(clickVerdict({ detail: 2, exempt: true }), false, 'calibrazione dello schermo, campi');
  assert.equal(clickVerdict({ detail: 2, guarded: false }), false, 'non un pulsante (campo da gioco)');
  assert.equal(clickVerdict({ detail: 1, now: 1000, changedAt: 900, late: false }), false, 'prove automatiche senza ?guardia=1');
  assert.equal(clickVerdict({ detail: 2, late: false }), 'doppio', '… il doppio clic vale sempre');
  assert.equal(lateRule({}), true); assert.equal(lateRule({ webdriver: true }), false); assert.equal(lateRule({ webdriver: true, search: '?guardia=1&x=2' }), true);
  for (const s of ['button', '.lobby-tile', '.menu-item']) assert.ok(GUARDED.includes(s));
  for (const s of ['#natpf-calibra', '#natpf-tastiera', 'input', 'textarea']) assert.ok(EXEMPT.includes(s), s);
});

test('B39.2 · ClickGuard: in cattura sulla finestra ferma il clic scartato prima di ogni gestore e lo annota', () => {
  let t = 1000, listener = null;
  const win = { addEventListener: (type, fn, cap) => { if (type === 'click' && cap === true) listener = fn; } };
  const g = new ClickGuard({ win, doc: null, now: () => t });
  assert.equal(typeof listener, 'function', 'ascolto in cattura sulla finestra');
  g.late = true;
  const btn = { id: 'lobby-next', dataset: {}, textContent: 'Avanti ›', closest: sel => (sel === GUARDED ? btn : null) };
  const ev = (detail, trusted = true) => ({ target: btn, detail, isTrusted: trusted, stopped: 0, prevented: false, preventDefault(){ this.prevented = true; }, stopImmediatePropagation(){ this.stopped++; }, stopPropagation(){ this.stopped++; } });
  let e = ev(1); listener(e); assert.ok(!e.prevented && !e.stopped, 'primo clic: passa');
  e = ev(2); listener(e); assert.ok(e.prevented && e.stopped === 2, 'secondo clic: fermato');
  g.mark(); t = 1300; e = ev(1); listener(e); assert.ok(e.prevented, 'clic 300 ms dopo il cambio di pagina: fermato');
  t = 1460; e = ev(1); listener(e); assert.ok(!e.prevented, '460 ms dopo: passa');
  e = ev(2, false); listener(e); assert.ok(!e.prevented, 'clic del codice: passa');
  assert.deepEqual(g.dropped.map(d => [d.v, d.what]), [['doppio', 'lobby-next'], ['tardi', 'lobby-next']]);
});

/* ---------- B39.5 · puntatore per il ledwall e chiosco ---------- */
import { POINTER, pointerPref, pointerSize, pointerSvg, pointerCss, hideAfterMs, edgeArrow, exitArrow, leftWindow } from '../src/natpf/natpf_cursor.js';

test('B39.5 · puntatore grande: Grande di base nel programma, Normale nel browser; misura dal 5,5 % dell\'area tra 48 e 128 px', () => {
  assert.equal(pointerPref(null, { desktop: true }), 'grande'); assert.equal(pointerPref(null, { desktop: false }), 'normale');
  assert.equal(pointerPref('normale', { desktop: true }), 'normale'); assert.equal(pointerPref('altro', { desktop: false }), 'normale');
  assert.equal(pointerSize(1080), 58); assert.equal(pointerSize(1024), 56); assert.equal(pointerSize(720), 48); assert.equal(pointerSize(600), 48);
  assert.equal(pointerSize(2160), 118); assert.equal(pointerSize(5000), 128); assert.equal(pointerSize(0), 48);
  for (const h of [600, 1080, 2160, 5000]) assert.equal(pointerSize(h) % 2, 0, 'pari');
  assert.match(pointerSvg(58), /width="58" height="58"[^]*fill="#e3ff36" stroke="#000"/);
  const css = pointerCss(58);
  assert.match(css, /^url\("data:image\/svg\+xml,%3Csvg[^"]+"\) 4 4, auto$/, 'punta in alto a sinistra, riserva la freccia di sistema');
  assert.equal(pointerCss(128).match(/\) (\d+) /)[1], '8');
});

test('B39.5 · puntatore nascosto: in campo dopo 3 s, altrove dopo 10 s, mai con il mouse come racchetta', () => {
  assert.deepEqual([POINTER.fieldMs, POINTER.menuMs], [3000, 10000]);
  assert.equal(hideAfterMs({ inField: true }), 3000); assert.equal(hideAfterMs({ inField: false }), 10000);
  assert.equal(hideAfterMs({ inField: true, mouseRacket: true }), null); assert.equal(hideAfterMs({ inField: false, mouseRacket: true }), 10000);
});

test('B39.5 · freccia sul bordo dell\'area: puntatore fuori dalla parte che si vede o uscito dalla finestra', () => {
  const a = { x: 0, y: 0, w: 1000, h: 1000 };           // 1000 × 1000 in alto a sinistra di 1920 × 1080
  assert.equal(edgeArrow(500, 500, a), null, 'dentro: niente freccia');
  assert.deepEqual(edgeArrow(1500, 100, a), { x: 990, y: 100, angle: 0 }, 'a destra fuori dall\'area: sul bordo destro, verso destra');
  assert.deepEqual(edgeArrow(1500, 1060, a), { x: 990, y: 990, angle: 8 });
  assert.deepEqual(edgeArrow(300, 1050, a), { x: 300, y: 990, angle: 90 }, 'sotto: verso il basso');
  const c = { x: 460, y: 40, w: 1000, h: 1000 };         // area al centro: coordinate dell'area
  assert.deepEqual(edgeArrow(100, 540, c), { x: 10, y: 500, angle: 180 });
  assert.equal(edgeArrow(1, 1, { x: 0, y: 0, w: 0, h: 0 }), null);
  // uscito dalla finestra dal bordo destro a metà altezza: freccia sul bordo destro dell'area
  assert.deepEqual(exitArrow(1919, 540, { x: 0, y: 0, w: 1920, h: 1080 }), { x: 1910, y: 540, angle: 0 });
  assert.deepEqual(exitArrow(960, 0, { x: 0, y: 0, w: 1920, h: 1080 }), { x: 960, y: 10, angle: -90 });
  // uscito davvero solo se l'ultima posizione era vicina al bordo (un menu del programma aperto in mezzo non conta)
  assert.equal(leftWindow({ x: 1900, y: 500 }, 1920, 1080), true); assert.equal(leftWindow({ x: 960, y: 30 }, 1920, 1080), true);
  assert.equal(leftWindow({ x: 960, y: 540 }, 1920, 1080), false, 'in mezzo: il menu del tasto destro, non un\'uscita');
  assert.equal(leftWindow(null, 1920, 1080), false);
});

test('B39.5 · chiosco: fermo con il telecomando dello staff o la diagnostica aperti, classifica intera come riposo', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const k = w.ui.kiosk; let resets = 0; k.reset = () => { resets++; k.last = performance.now(); };
  k.enabled = true; k.limit = 30;
  w.ui.lobby.go('options');
  const R = w.ui.remote; Object.defineProperty(R, 'isOpen', { value: true, configurable: true });
  w.advance(40000);
  assert.equal(resets, 0, 'abbinamento del telecomando aperto: nessun azzeramento dopo 40 s');
  delete R.isOpen;
  w.advance(29000); assert.equal(resets, 0, 'il tempo riparte dalla chiusura');
  w.advance(3000); assert.equal(resets, 1, 'poi il chiosco azzera');
  // classifica a schermo intero lasciata in vista: è riposo
  resets = 0; w.ui.lobby.go('ranking'); document.documentElement.classList.add('ranking-full');
  w.advance(40000); assert.equal(resets, 0, 'classifica intera in vista: resta');
  document.documentElement.classList.remove('ranking-full');
});

test('B39.5 · in campo il puntatore sparisce dopo 3 s fermo e appena la partita parte; nei fogli aspetta 10 s', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const c = w.ui.mouse.cursor, html = document.documentElement;
  assert.ok(c, 'puntatore del B39.5 creato');
  w.pressStart(); w.advance(500);
  assert.ok(w.ui.pause.inGame);
  // con la racchetta mouse resta
  w.advance(5000); assert.equal(html.classList.contains('cursor-hidden'), false, 'racchetta mouse: resta');
  // con il telefono (o la webcam) sparisce in campo dopo 3 s fermo
  w.ui.controller = 'webcam';
  c.moved({ pointerType: 'mouse', clientX: 10, clientY: 10 });
  w.advance(2500); assert.equal(html.classList.contains('cursor-hidden'), false, '2,5 s: ancora visibile');
  w.advance(800); assert.equal(html.classList.contains('cursor-hidden'), true, '3,3 s: nascosto');
  c.moved({ pointerType: 'mouse', clientX: 20, clientY: 20 });
  assert.equal(html.classList.contains('cursor-hidden'), false, 'mosso: di nuovo visibile');
  // tornati al menu e di nuovo in campo: sparisce subito
  w.ui.backToMenu(); w.advance(500); c.moved({ pointerType: 'mouse', clientX: 30, clientY: 30 });
  w.pressStart(); w.advance(600);
  assert.equal(html.classList.contains('cursor-hidden'), true, 'partita partita: nascosto subito');
});

/* ---------- B39.6 · calibrazione dello schermo con il mouse ---------- */
import { cornersMargins, edgeMargin, REPEAT, repeatPlan, CORNER_TEXT } from '../src/natpf/natpf_calibra.js';
import { viewport, CAL_KEY } from '../src/natpf/natpf_screen.js';

test('B39.6 · geometria: due angoli → bordi in % (1000 × 1000 in alto a sinistra di 1920 × 1080 → destra 48 %, sotto 7,5 %); freccia trascinata → margine', () => {
  assert.deepEqual(cornersMargins({ x: 0, y: 0 }, { x: 999, y: 999 }, 1920, 1080), { t: 0, r: 48, b: 7.5, l: 0 });
  assert.deepEqual(cornersMargins({ x: 999, y: 999 }, { x: 0, y: 0 }, 1920, 1080), { t: 0, r: 48, b: 7.5, l: 0 }, 'in qualunque ordine');
  assert.deepEqual(cornersMargins({ x: 96, y: 54 }, { x: 1823, y: 1025 }, 1920, 1080), { t: 5, r: 5, b: 5, l: 5 });
  assert.deepEqual(cornersMargins({ x: -40, y: -10 }, { x: 5000, y: 5000 }, 1920, 1080), { t: 0, r: 0, b: 0, l: 0 }, 'fuori dalla finestra: il bordo della finestra');
  assert.equal(cornersMargins(null, { x: 1, y: 1 }, 1920, 1080), null);
  assert.equal(edgeMargin('r', 1000, 0, 1920, 1080), 48); assert.equal(edgeMargin('l', 192, 0, 1920, 1080), 10);
  assert.equal(edgeMargin('t', 0, 54, 1920, 1080), 5); assert.equal(edgeMargin('b', 0, 1000, 1920, 1080), 7.5);
  assert.equal(edgeMargin('b', 0, 2000, 1920, 1080), 0, 'oltre il bordo: zero'); assert.equal(edgeMargin('x', 0, 0, 1920, 1080), null);
  assert.deepEqual([REPEAT.firstMs, REPEAT.everyMs, REPEAT.bigAfter], [450, 90, 12]);
  assert.deepEqual(repeatPlan(0), { wait: 450, big: false }); assert.deepEqual(repeatPlan(5), { wait: 90, big: false }); assert.deepEqual(repeatPlan(12), { wait: 90, big: true });
  assert.match(CORNER_TEXT[0], /alto a sinistra/); assert.match(CORNER_TEXT[1], /basso a destra/);
});

const fakeDown = (x, y, target = null) => ({ button: 0, isTrusted: true, clientX: x, clientY: y, target: target || { closest: () => null }, prevented: false, preventDefault(){ this.prevented = true; }, stopPropagation(){} });
test('B39.6 · nel gioco: si apre con i due angoli; due clic → area = rettangolo, «Salva»; freccia trascinata; «+» tenuto premuto ripete e accelera', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  w.ui.screen.fullscreen.disarm(); w.lobby.go('options'); w.lobby.option('calibra');
  const cal = w.ui.calibra;
  assert.ok(cal.isOpen && Array.isArray(cal.corners) && cal.corners.length === 0, 'si comincia dai due angoli');
  assert.ok(cal.hintEl && !cal.hintEl.classList.contains('hidden') && /alto a sinistra/.test(cal.hintEl.textContent), 'la scritta dice cosa cliccare');
  // un clic sul riquadro dei comandi non è un angolo (e smette di chiedere gli angoli, salvo «Clicca i due angoli»)
  const panelBtn = { closest: sel => (sel.includes('.cal-panel') ? {} : sel.includes('corners') ? {} : null) };
  cal._corner(fakeDown(5, 5, panelBtn)); assert.equal(cal.corners.length, 0, '«Clicca i due angoli» non conta come angolo');
  let e = fakeDown(0, 0); cal._corner(e);
  assert.ok(e.prevented && cal.corners.length === 1 && /basso a destra/.test(cal.hintEl.textContent));
  e = fakeDown(767, 719); cal._corner(e);
  assert.equal(cal.corners, null, 'finito con gli angoli');
  assert.deepEqual(viewport(), { x: 0, y: 0, w: 768, h: 720, full: false }, 'area = il rettangolo tra i due clic (1280 × 720 della finestra di prova)');
  assert.deepEqual(cal.margins, { t: 0, r: 40, b: 0, l: 0 });
  // freccia del bordo destro trascinata fino a x = 1000: margine destro 22 %
  const mark = { dataset: { calEdge: 'r' }, setPointerCapture(){} };
  cal._press({ button: 0, target: { closest: sel => (sel.includes('.cal-mark') ? mark : null) }, pointerId: 1 });
  cal._dragTo({ clientX: 1000, clientY: 300 });
  assert.equal(cal.margins.r, 22); assert.equal(cal.edge, 'r');
  cal._release(); w.advance(10);
  // «+» (verso il centro) tenuto premuto sul bordo destro: un passo subito, poi ripete; dopo 12 ripetizioni a passi da 5 %
  const plus = { dataset: { calStep: '1' } };
  cal._press({ button: 0, target: { closest: sel => (sel.includes('[data-cal-step]') ? plus : null) } });
  assert.equal(cal.margins.r, 22.5, 'un passo alla pressione');
  w.advance(440); assert.equal(cal.margins.r, 22.5, 'prima di 0,45 s nessuna ripetizione');
  w.advance(20); assert.equal(cal.margins.r, 23, 'poi ripete');
  // passi registrati ogni 90 ms: prima piccoli (0,5 %), dopo una dozzina di ripetizioni grandi (5 %)
  const seen = []; let last = cal.margins.r;
  for (let i = 0; i < 16; i++){ w.advance(90); seen.push(+(cal.margins.r - last).toFixed(1)); last = cal.margins.r; }
  const firstBig = seen.indexOf(5);
  assert.ok(firstBig >= 8 && seen.slice(0, firstBig).every(d => d === 0.5 || d === 0) && seen.slice(firstBig).every(d => d === 5 || d === 0), JSON.stringify(seen));
  cal._release(); const r = cal.margins.r; w.advance(1000);
  assert.equal(cal.margins.r, r, 'rilasciato: si ferma');
  cal.save();
  assert.equal(JSON.parse(localStorage.getItem(CAL_KEY)).margins.r, r, 'salvata');
  // con la tastiera niente angoli
  w.lobby.option('calibra'); assert.ok(Array.isArray(cal.corners));
  w.key('ArrowDown', 'ArrowDown'); assert.equal(cal.corners, null);
  cal.cancel();
});
