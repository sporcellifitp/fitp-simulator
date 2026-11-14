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
  for (const s of ['#natpf-calibra', 'input', 'textarea']) assert.ok(EXEMPT.includes(s));
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
