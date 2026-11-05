// Calibrazione dello schermo nel gioco vero (B8 del 05/11, «come avviene per i videogiochi»): Opzioni → Schermo →
// «Calibra lo schermo…», bordi visibili con frecce e Tab, formato con 1-6, anteprima dal vivo, Invio salva, Esc annulla
// e rimette com'era; la calibrazione salvata vale al prossimo avvio. Interfaccia vera sul motore senza disegno (ui-world).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';
import { viewport, NatpfScreen, CAL_KEY, SCREEN_KEY } from '../src/natpf/natpf_screen.js';

const shift = { shiftKey: true };
async function openCal(){
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  w.ui.screen.fullscreen.disarm();
  w.lobby.go('options');
  w.lobby.option('calibra');
  return w;
}

test('calibra: si apre dalle Opzioni; frecce sul bordo scelto con Tab, anteprima dal vivo; Esc annulla e rimette com’era', async () => {
  const w = await openCal(), { ui, lobby } = w, cal = ui.calibra;
  assert.ok(cal.isOpen); assert.ok(!$('natpf-calibra').classList.contains('hidden'), 'riquadro visibile');
  assert.deepEqual(viewport(), { x: 0, y: 0, w: 1280, h: 720, full: true });
  for (let i = 0; i < 4; i++) w.key('Tab', 'Tab');
  assert.equal(cal.edge, 'l', 'Tab: Tutti → Sopra → Destra → Sotto → Sinistra');
  const ev = w.key('ArrowRight', 'ArrowRight', document.body, shift);
  assert.ok(ev.defaultPrevented, 'la freccia non sposta il fuoco del menu');
  assert.equal(ui.screen.margins.l, 5, 'Maiusc: 5%');
  assert.deepEqual(viewport(), { x: 64, y: 0, w: 1216, h: 720, full: false }, 'anteprima: l’area si stringe subito');
  w.key('ArrowLeft', 'ArrowLeft'); assert.equal(ui.screen.margins.l, 4.5, 'passo piccolo 0,5%');
  w.key('Escape', 'Escape', document.body, { repeat: true });
  assert.ok(cal.isOpen, 'Esc ripetuto da solo non chiude');
  w.key('Escape', 'Escape');
  assert.ok(!cal.isOpen); assert.ok($('natpf-calibra').classList.contains('hidden'));
  assert.deepEqual(ui.screen.margins, { t: 0, r: 0, b: 0, l: 0 }, 'annullata: com’era');
  assert.deepEqual(viewport(), { x: 0, y: 0, w: 1280, h: 720, full: true });
  assert.equal(localStorage.getItem(CAL_KEY), null, 'niente salvato');
  assert.equal(lobby.step, 'options', 'Esc chiude la calibrazione, non torna indietro nel menu');
  w.key('Escape', 'Escape', document.body, { repeat: true });
  assert.equal(lobby.step, 'options', 'le ripetizioni dello stesso Esc non tornano indietro');
});

test('calibra: bordo sinistro e sotto del 5%, Invio salva; al prossimo avvio l’area è la stessa', async () => {
  const w = await openCal(), { ui, lobby } = w, cal = ui.calibra;
  for (let i = 0; i < 4; i++) w.key('Tab', 'Tab');
  w.key('ArrowRight', 'ArrowRight', document.body, shift);           // sinistra 5% verso il centro
  w.key('Tab', 'Tab', document.body, shift); assert.equal(cal.edge, 'b', 'Maiusc+Tab: indietro');
  w.key('ArrowUp', 'ArrowUp', document.body, shift);                 // sotto 5% verso il centro
  w.key('Enter', 'Enter', document.body, { repeat: true });
  assert.ok(cal.isOpen, 'Invio ripetuto da solo non salva');
  w.key('Enter', 'Enter');
  assert.ok(!cal.isOpen);
  assert.deepEqual(JSON.parse(localStorage.getItem(CAL_KEY)), { v: 1, preset: 'full', margins: { t: 0, r: 0, b: 5, l: 5 } });
  assert.equal(localStorage.getItem(SCREEN_KEY), 'full', 'la scelta di prima resta coerente');
  assert.deepEqual(viewport(), { x: 64, y: 0, w: 1216, h: 684, full: false });
  assert.equal(lobby.step, 'options', 'Invio non va avanti nel menu');
  lobby.paint();
  assert.match($('screen-cal-sum').textContent, /Calibrato: formato intero · bordi ↑ 0 · → 0 · ↓ 5 · ← 5 %/);
  assert.match($('natpf-toast').textContent, /calibrato/i);
  // nuovo avvio: lo schermo legge la calibrazione salvata
  const again = new NatpfScreen(null);
  assert.deepEqual(again.margins, { t: 0, r: 0, b: 5, l: 5 }); assert.equal(again.source, 'cal');
  assert.deepEqual(viewport(), { x: 64, y: 0, w: 1216, h: 684, full: false });
  // la scelta del menu (Ledwall 2×2) tiene i bordi e aggiorna la calibrazione
  again.set('2x2');
  assert.deepEqual(JSON.parse(localStorage.getItem(CAL_KEY)), { v: 1, preset: '2x2', margins: { t: 0, r: 0, b: 5, l: 5 } });
  assert.deepEqual(viewport(), { x: 330, y: 0, w: 684, h: 684, full: false });
});

test('calibra: formati con i tasti 1-6 (1:1 quadrato), R azzera, Tutti con le frecce, − / + e clic', async () => {
  const w = await openCal(), { ui } = w, cal = ui.calibra;
  w.key('Digit6', '6'); assert.equal(ui.screen.preset, '2x2');
  const v = viewport(); assert.equal(v.w, v.h, '1:1: area quadrata'); assert.deepEqual(v, { x: 280, y: 0, w: 720, h: 720, full: false });
  w.key('Numpad4', '4'); assert.equal(ui.screen.preset, '4x3'); assert.deepEqual(viewport(), { x: 160, y: 0, w: 960, h: 720, full: false });
  w.key('Digit1', '1'); assert.equal(ui.screen.preset, 'full');
  // Tutti: ↓ ← area più piccola, ↑ → più grande
  w.key('ArrowDown', 'ArrowDown', document.body, shift);
  assert.deepEqual(ui.screen.margins, { t: 5, r: 5, b: 5, l: 5 });
  w.key('ArrowUp', 'ArrowUp');
  assert.deepEqual(ui.screen.margins, { t: 4.5, r: 4.5, b: 4.5, l: 4.5 });
  // mouse: − verso il bordo, + verso il centro, sul bordo scelto con un clic
  cal.selectEdge('t'); cal.step(1); assert.equal(ui.screen.margins.t, 5);
  cal.step(-1); cal.step(-1); assert.equal(ui.screen.margins.t, 4);
  w.key('KeyR', 'r');
  assert.deepEqual(ui.screen.margins, { t: 0, r: 0, b: 0, l: 0 }); assert.equal(ui.screen.preset, 'full');
  // F11 e i tasti che la calibrazione non usa restano al browser
  assert.equal(w.key('F11', 'F11').defaultPrevented, false);
  // F: schermo intero anche da qui
  const calls = { n: 0 }; document.documentElement.requestFullscreen = () => { calls.n++; return Promise.resolve(); };
  w.key('KeyF', 'f'); assert.equal(calls.n, 1); assert.ok(cal.isOpen);
  w.key('Escape', 'Escape'); assert.ok(!cal.isOpen);
});

test('calibra: con ?area= nell’indirizzo l’anteprima mostra la calibrazione e Annulla rimette l’area dell’indirizzo', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  globalThis.location = { ...globalThis.location, search: '?intro=0&area=0,0,768,512' };
  const scr = new NatpfScreen(null); w.ui.calibra.screen = scr;
  assert.deepEqual(viewport(), { x: 0, y: 0, w: 768, h: 512, full: false });
  w.ui.calibra.open();
  assert.deepEqual(viewport(), { x: 0, y: 0, w: 1280, h: 720, full: true }, 'anteprima della calibrazione');
  assert.match($('cal-note').textContent, /\?area=0,0,768,512/);
  w.ui.calibra.cancel();
  assert.deepEqual(viewport(), { x: 0, y: 0, w: 768, h: 512, full: false });
});

test('calibra: il chiosco che torna al menu (o un cambio di pagina) la annulla, con l’area di prima e i tasti al menu', async () => {
  const w = await openCal(), { ui, lobby } = w, cal = ui.calibra;
  // chiosco acceso e addetto lontano: dopo il tempo senza nessuno lo stand torna libero
  ui.kiosk.enabled = true; ui.kiosk.limit = 30;
  w.key('ArrowDown', 'ArrowDown', document.body, shift);
  assert.deepEqual(viewport(), { x: 64, y: 36, w: 1152, h: 648, full: false }, 'anteprima non salvata');
  w.advance(31000);
  assert.ok(!cal.isOpen, 'calibrazione chiusa'); assert.ok($('natpf-calibra').classList.contains('hidden'));
  assert.equal(lobby.step, 'menu');
  assert.deepEqual(viewport(), { x: 0, y: 0, w: 1280, h: 720, full: true }, 'area di prima, l’anteprima non resta');
  assert.equal(localStorage.getItem(CAL_KEY), null, 'niente salvato');
  w.key('KeyH', 'h');
  assert.ok(ui.onboarding.isOpen, 'i tasti tornano al menu (H apre la guida)');
  // anche la classifica dal pannello dell'addetto (lobby.go) la chiude
  ui.onboarding.close(); lobby.go('options'); lobby.option('calibra'); assert.ok(cal.isOpen);
  lobby.go('ranking'); assert.ok(!cal.isOpen);
});

test('calibra: i bordi si fermano all’area minima (480 × 360 px), anche tenendo premuta la freccia; si salva usabile', async () => {
  const w = await openCal(), { ui } = w, cal = ui.calibra;
  // Tutti, area più piccola tenendo premuto (ripetizioni) con Maiusc
  for (let i = 0; i < 30; i++) w.key('ArrowDown', 'ArrowDown', document.body, { shiftKey: true, repeat: i > 0 });
  let v = viewport();
  assert.ok(v.w >= 479 && v.h >= 359 && v.w <= 490 && v.h <= 370, `area minima al centro: ${JSON.stringify(v)}`);
  assert.deepEqual(ui.screen.margins, { t: 25, r: 31, b: 25, l: 31 });
  // un bordo solo (sinistra verso il centro): si ferma dove l'area è larga 480, la destra non cambia
  w.key('KeyR', 'r'); for (let i = 0; i < 4; i++) w.key('Tab', 'Tab'); assert.equal(cal.edge, 'l');
  for (let i = 0; i < 20; i++) w.key('ArrowRight', 'ArrowRight', document.body, shift);
  assert.equal(ui.screen.margins.l, 62.5); assert.equal(ui.screen.margins.r, 0);
  assert.deepEqual(viewport(), { x: 800, y: 0, w: 480, h: 720, full: false });
  // a destra oltre il 45% (angolo dell'uscita del PC): sinistra a 0, destra fino a 62,5
  w.key('ArrowLeft', 'ArrowLeft', document.body, shift); w.key('Tab', 'Tab', document.body, shift); w.key('Tab', 'Tab', document.body, shift);
  assert.equal(cal.edge, 'r');
  for (let i = 0; i < 20; i++) w.key('ArrowLeft', 'ArrowLeft', document.body, shift);
  assert.equal(ui.screen.margins.r, 62.5 - ui.screen.margins.l);
  w.key('Enter', 'Enter');
  v = viewport(); assert.ok(v.w >= 479, JSON.stringify(v));
  const saved = JSON.parse(localStorage.getItem(CAL_KEY));
  assert.ok(saved.margins.l + saved.margins.r <= 62.5, JSON.stringify(saved));
});
