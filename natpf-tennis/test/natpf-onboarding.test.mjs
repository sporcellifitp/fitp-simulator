// Guida «Come si gioca» a schede (30/10/2026): una scheda per passo, Indietro/Avanti/Fine, puntini, frecce e tasti,
// swipe con il dito, Esc, scelta della racchetta che cambia i testi e non il passo. Interfaccia vera sul DOM finto di
// test/ui-world.mjs (i tasti passano dalla lobby come nel gioco).
// node --import ./test/register.mjs --test test/natpf-onboarding.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, visible } from './ui-world.mjs';
import { GUIDE, GUIDE_CONTROLLERS, ONBOARDING_KEY, guideStep, guideText, swipeDirection, SWIPE_PX } from '../src/natpf/natpf_onboarding.js';

const fire = (id, type, ev) => { for (const l of $(id).ls[type] || []) l.fn(ev); };
const touch = (x, y) => ({ changedTouches: [{ clientX: x, clientY: y }] });
const state = ui => ({ i: ui.onboarding.index, open: ui.onboarding.isOpen, count: $('onb-count').textContent, next: $('onb-next').textContent, prevOff: $('onb-prev').disabled });

test('contenuti: sei passi, testi per ogni racchetta, webcam «tra 1 e 4 metri»', () => {
  assert.deepEqual(GUIDE.map(g => g.id), ['grip', 'run', 'hit', 'aim', 'serve', 'shots']);
  for (const g of GUIDE) for (const [c] of GUIDE_CONTROLLERS) assert.ok(guideText(g, c), `${g.id}/${c}`);
  assert.match(GUIDE[0].you.webcam, /Mettiti <b>tra 1 e 4 metri<\/b> dalla webcam/);
  assert.doesNotMatch(GUIDE.map(g => g.you.webcam || '').join(' '), /1,5–2 metri/);
});

test('funzioni pure: il passo resta dentro la guida, lo swipe vale solo se orizzontale e abbastanza lungo', () => {
  assert.equal(guideStep(0, -1), 0); assert.equal(guideStep(5, 1), 5); assert.equal(guideStep(2, 1), 3); assert.equal(guideStep(0, 99), GUIDE.length - 1);
  assert.equal(swipeDirection(-120, 10), 1, 'dito verso sinistra: avanti');
  assert.equal(swipeDirection(120, -5), -1, 'dito verso destra: indietro');
  assert.equal(swipeDirection(SWIPE_PX - 1, 0), 0, 'troppo corto');
  assert.equal(swipeDirection(-80, 120), 0, 'quasi verticale: è uno scorrimento del testo');
  assert.equal(swipeDirection(NaN, 0), 0);
});

test('Avanti, Indietro e Fine: puntini, contatore, Indietro spento sul primo passo, Fine chiude e ricorda la guida vista', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { ui } = w;
  ui.onboarding.open();
  assert.deepEqual(state(ui), { i: 0, open: true, count: 'Passo 1 di 6', next: 'Avanti ›', prevOff: true });
  assert.ok(visible('natpf-onboarding'));
  assert.match($('onb-dots').innerHTML, /data-onb-step="0" aria-label="Passo 1: Impugna la racchetta" aria-current="step"/);
  assert.equal(($('onb-dots').innerHTML.match(/data-onb-step=/g) || []).length, GUIDE.length);
  // una scheda per passo; solo quella attiva è leggibile (le altre aria-hidden e inert)
  assert.equal(($('onb-track').innerHTML.match(/<article class="guide-card/g) || []).length, GUIDE.length);
  assert.equal(($('onb-track').innerHTML.match(/inert>/g) || []).length, GUIDE.length - 1);
  assert.equal($('onb-track').dataset.step, '0');
  $('onb-next').click();
  assert.deepEqual(state(ui), { i: 1, open: true, count: 'Passo 2 di 6', next: 'Avanti ›', prevOff: false });
  $('onb-prev').click(); $('onb-prev').click();
  assert.equal(ui.onboarding.index, 0, 'Indietro non va prima del primo passo');
  for (let k = 0; k < GUIDE.length - 1; k++) $('onb-next').click();
  assert.deepEqual(state(ui), { i: 5, open: true, count: 'Passo 6 di 6', next: 'Fine ✓', prevOff: false });
  assert.ok(!$('onb-practice').classList.contains('hidden'), '«Prova nel riscaldamento» sull’ultima scheda, dal menu');
  assert.equal(localStorage.getItem(ONBOARDING_KEY), null);
  $('onb-next').click();
  assert.ok(!ui.onboarding.isOpen && !visible('natpf-onboarding'), 'Fine chiude');
  assert.equal(localStorage.getItem(ONBOARDING_KEY), '1');
  // riaperta: dal primo passo
  ui.onboarding.open(); assert.equal(ui.onboarding.index, 0);
  assert.ok($('onb-practice').classList.contains('hidden'), '«Prova» solo sull’ultima scheda');
});

test('tastiera (dalla lobby, come nel gioco): frecce, Home/Fine, numeri, Invio = Avanti, Esc chiude; il menu sotto non si muove', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { ui, lobby } = w;
  w.key('KeyH', 'h'); assert.ok(ui.onboarding.isOpen);
  const step = lobby.step;
  let ev = w.key('ArrowRight'); assert.equal(ui.onboarding.index, 1); assert.ok(ev.defaultPrevented);
  w.key('ArrowRight'); w.key('ArrowLeft'); assert.equal(ui.onboarding.index, 1);
  w.key('End'); assert.equal(ui.onboarding.index, 5);
  w.key('ArrowRight'); assert.equal(ui.onboarding.index, 5, 'la freccia sull’ultima scheda non chiude');
  assert.ok(ui.onboarding.isOpen);
  w.key('Home'); assert.equal(ui.onboarding.index, 0);
  w.key('Digit4', '4'); assert.equal(ui.onboarding.index, 3);
  w.key('Digit9', '9'); assert.equal(ui.onboarding.index, 3, 'nessun passo 9');
  w.key('PageUp'); assert.equal(ui.onboarding.index, 2);
  w.key('Enter'); assert.equal(ui.onboarding.index, 3, 'Invio fuori dai pulsanti: Avanti');
  ev = w.key('ArrowDown'); assert.ok(ev.defaultPrevented, '↓ scorre il testo della scheda, non il menu');
  assert.equal(lobby.step, step);
  w.key('Escape', 'Escape');
  assert.ok(!ui.onboarding.isOpen); assert.equal(lobby.step, step, 'Esc chiude la guida, non torna indietro nel menu');
  assert.ok(lobby.visible);
});

test('swipe con il dito e trascinamento del mouse; i puntini portano al passo', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { ui } = w;
  ui.onboarding.open();
  fire('onb-cards', 'touchstart', touch(600, 200)); fire('onb-cards', 'touchend', touch(420, 214));
  assert.equal(ui.onboarding.index, 1, 'dito verso sinistra: avanti');
  fire('onb-cards', 'touchstart', touch(300, 200)); fire('onb-cards', 'touchend', touch(330, 380));
  assert.equal(ui.onboarding.index, 1, 'scorrimento verticale: nessun cambio');
  fire('onb-cards', 'touchstart', touch(300, 200)); fire('onb-cards', 'touchend', touch(520, 190));
  assert.equal(ui.onboarding.index, 0, 'dito verso destra: indietro');
  // il dito non passa due volte (pointer «touch» ignorati, valgono gli eventi touch)
  fire('onb-cards', 'pointerdown', { pointerType: 'touch', clientX: 600, clientY: 200 }); fire('onb-cards', 'pointerup', { pointerType: 'touch', clientX: 300, clientY: 200 });
  assert.equal(ui.onboarding.index, 0);
  fire('onb-cards', 'pointerdown', { pointerType: 'mouse', clientX: 600, clientY: 200 }); fire('onb-cards', 'pointerup', { pointerType: 'mouse', clientX: 300, clientY: 210 });
  assert.equal(ui.onboarding.index, 1, 'trascinamento del mouse');
  fire('onb-dots', 'click', { target: { closest: () => ({ dataset: { onbStep: '4' } }) } });
  assert.equal(ui.onboarding.index, 4);
  assert.equal($('onb-count').textContent, 'Passo 5 di 6');
});

test('racchetta: si parte da quella in uso, la scelta cambia i testi e lascia il passo', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui } = w;
  ui.onboarding.open();
  assert.equal(ui.onboarding.controller, 'mouse');
  // mouse e tastiera tra le scelte quando è la racchetta in uso
  assert.match(ui.onboarding.ctrlBox.innerHTML, /data-onb-ctrl="mouse" aria-pressed="true"/);
  assert.match($('onb-track').innerHTML, /<b>Spazio<\/b> o un trascinamento del mouse/);
  w.key('ArrowRight'); w.key('ArrowRight');
  ui.onboarding.ctrlBox.ls.click.forEach(l => l.fn({ target: { closest: () => ({ dataset: { onbCtrl: 'webcam' } }) } }));
  assert.equal(ui.onboarding.controller, 'webcam'); assert.equal(ui.onboarding.index, 2, 'il passo resta');
  assert.match($('onb-track').innerHTML, /Mettiti <b>tra 1 e 4 metri<\/b> dalla webcam/);
  assert.match($('onb-track').innerHTML, /Uno <b>swing della mano<\/b>/);
  assert.match(ui.onboarding.ctrlBox.innerHTML, /data-onb-ctrl="webcam" aria-pressed="true"/);
  ui.onboarding.setController('phone');
  assert.match($('onb-track').innerHTML, /porta indietro il telefono/);
  ui.onboarding.setController('joystick');
  assert.equal(ui.onboarding.controller, 'phone', 'racchetta sconosciuta ignorata');
  // senza modalità prova e con il telefono, mouse e tastiera non compaiono
  const w2 = await makeWorld({ controller: 'phone' }); w2.advance(300);
  w2.ui.onboarding.open();
  assert.doesNotMatch(w2.ui.onboarding.ctrlBox.innerHTML, /data-onb-ctrl="mouse"/);
  assert.match(w2.ui.onboarding.ctrlBox.innerHTML, /data-onb-ctrl="phone" aria-pressed="true"/);
});

test('in campo: la guida mette in pausa, niente «Prova nel riscaldamento», chiusa riprende', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui, lobby, E } = w;
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next(); ui.training.skip();
  w.pressStart(); w.advance(500);
  assert.ok(!lobby.visible);
  ui.onboarding.open(); ui.onboarding.go(5);
  assert.ok(E.natpfPaused, 'gioco fermo sotto la guida');
  assert.ok($('onb-practice').classList.contains('hidden'));
  w.key('Escape', 'Escape');
  assert.ok(!ui.onboarding.isOpen); assert.ok(!ui.pause.isOpen, 'Esc chiude la guida, non apre anche la pausa');
  assert.ok(!E.natpfPaused);
});
