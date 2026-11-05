// Schermo intero nel gioco vero (B8 del 04/11): tasto F nel menu e in campo, apertura automatica al primo tasto prima
// del menu (che ferma i tasti), voce della pausa, Esc tenuto premuto (per uscire dallo schermo intero del browser) che
// non torna indietro di più pagine e non apre e chiude la pausa. Interfaccia vera sul motore senza disegno (ui-world).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';
import { FS_TEXT } from '../src/natpf/natpf_screen.js';

// schermo intero finto sul documento del mondo di prova (come il browser: la richiesta si risolve dopo)
function stubFullscreen(){
  const calls = { request: 0, exit: 0 };
  document.fullscreenElement = null;
  document.documentElement.requestFullscreen = function(){ calls.request++; document.fullscreenElement = this; return Promise.resolve(); };
  document.exitFullscreen = () => { calls.exit++; document.fullscreenElement = null; return Promise.resolve(); };
  return calls;
}
const esc = (w, extra = {}) => w.key('Escape', 'Escape', document.body, extra);

test('menu: il primo tasto apre lo schermo intero anche se il menu ferma i tasti; F lo chiude e lo riapre', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui, lobby } = w, calls = stubFullscreen();
  assert.equal(ui.screen.fullscreen.armed, true, 'apertura automatica pronta (?intro=0: sul menu)');
  w.key('ArrowDown', 'ArrowDown');
  assert.equal(calls.request, 1, 'il primo tasto del menu (fermato dalla lobby) arriva prima all’apertura automatica');
  await w.flush();
  assert.equal(ui.screen.fullscreen.frameless, true); assert.equal(ui.screen.fullscreen.armed, false);
  assert.equal($('lobby-fullscreen').querySelector('.fs-label').textContent, FS_TEXT.exit, 'il pulsante in alto dice lo stato');
  w.key('KeyF', 'f'); await w.flush();
  assert.equal(calls.exit, 1); assert.equal(ui.screen.fullscreen.frameless, false);
  assert.equal($('lobby-fullscreen').querySelector('.fs-label').textContent, FS_TEXT.enter);
  w.key('KeyF', 'f'); await w.flush();
  assert.equal(calls.request, 2); assert.equal(ui.screen.fullscreen.frameless, true);
  assert.equal(lobby.step, 'menu', 'F non cambia pagina');
  assert.match(lobby.el.querySelector('.lobby-keys').textContent, /F schermo intero/);
});

test('menu: F come primo tasto apre lo schermo intero una volta sola (apertura automatica e tasto F insieme)', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const calls = stubFullscreen();
  w.key('KeyF', 'f'); await w.flush();
  assert.equal(calls.request, 1); assert.equal(calls.exit, 0);
  assert.equal(w.ui.screen.fullscreen.frameless, true, 'resta a schermo intero (la seconda richiesta non lo chiude)');
});

test('l’easter egg «natpf» finisce con la f: attiva la modalità prova e non cambia lo schermo intero', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const calls = stubFullscreen(); w.ui.screen.fullscreen.disarm();
  for (const c of 'natpf') w.key('Key' + c.toUpperCase(), c);
  assert.equal(w.ui.testInput, true); assert.equal(calls.request, 0);
});

test('Esc tenuto premuto nel menu: indietro di una pagina sola', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { lobby } = w;
  lobby.go('options');
  esc(w, { repeat: true }); assert.equal(lobby.step, 'options', 'un Esc ripetuto da solo non conta');
  esc(w); assert.equal(lobby.step, 'menu');
  lobby.go('mode'); lobby.go('controller');
  esc(w); esc(w, { repeat: true }); esc(w, { repeat: true });
  assert.equal(lobby.step, 'mode', 'Esc tenuto: una pagina indietro, non fino al menu');
  w.key('Backspace', 'Backspace'); assert.equal(lobby.step, 'menu', 'Backspace resta «indietro»');
});

test('guida aperta: Esc la chiude, le ripetizioni non tornano indietro nel menu', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { lobby, ui } = w;
  lobby.go('options'); ui.onboarding.open();
  esc(w, { repeat: true }); assert.ok(ui.onboarding.isOpen, 'ripetizione da sola: la guida resta');
  esc(w); assert.ok(!ui.onboarding.isOpen);
  esc(w, { repeat: true }); esc(w, { repeat: true });
  assert.equal(lobby.step, 'options');
});

test('in campo: Esc tenuto apre la pausa una volta sola; F e la voce della pausa cambiano lo schermo intero', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui, lobby, E } = w, calls = stubFullscreen(); ui.screen.fullscreen.disarm();
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next(); w.advance(500);
  assert.ok(ui.training.active && !lobby.visible);
  esc(w); assert.ok(ui.pause.isOpen && E.natpfPaused);
  esc(w, { repeat: true }); esc(w, { repeat: true }); esc(w, { repeat: true });
  assert.ok(ui.pause.isOpen, 'la pausa non si chiude e riapre con Esc tenuto');
  // voce «Schermo» della pausa: si entra, la pausa resta aperta
  ui.pause.run('fullscreen'); await w.flush();
  assert.equal(calls.request, 1); assert.ok(ui.pause.isOpen);
  assert.equal(ui.screen.fullscreen.label, FS_TEXT.exit);
  esc(w); assert.ok(!ui.pause.isOpen);
  // F in campo
  w.key('KeyF', 'f'); await w.flush();
  assert.equal(calls.exit, 1); assert.equal(ui.screen.fullscreen.frameless, false);
  w.key('KeyF', 'f', document.body, { repeat: true }); await w.flush();
  assert.equal(calls.request, 1, 'F tenuto premuto non ripete');
});

test('tutorial prima della calibrazione: Esc tenuto lo chiude e basta (niente pausa)', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { ui, lobby } = w;
  lobby.menu('training'); lobby.go('connect'); lobby.next();
  assert.ok(ui.training.tutorialOpen);
  esc(w, { repeat: true }); assert.ok(ui.training.tutorialOpen, 'ripetizione da sola: resta');
  esc(w); assert.ok(!ui.training.tutorialOpen);
  esc(w, { repeat: true }); esc(w, { repeat: true });
  assert.ok(!ui.pause.isOpen, 'le ripetizioni non aprono la pausa');
});

test('Opzioni → Schermo: «All’avvio» Schermo intero o Finestra, salvato; con «Finestra» il primo tasto non apre niente', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const fs = w.ui.screen.fullscreen, calls = stubFullscreen();
  assert.equal(fs.pref, 'auto');
  fs.pref = 'off';
  assert.equal(localStorage.getItem('natpf-tennis.fullscreen'), 'off');
  w.key('ArrowDown', 'ArrowDown');
  assert.equal(calls.request, 0, '«Finestra»: il primo tasto non apre lo schermo intero');
  fs.disarm(); assert.equal(fs.armAuto(), false, 'al prossimo avvio non si arma');
  w.lobby.go('options');
  w.key('KeyF', 'f'); await w.flush();
  assert.equal(calls.request, 1, 'a mano (F) si entra lo stesso');
});

test('pulsanti «Schermo intero» in alto e in Opzioni → Schermo: cambiano lo stato e il testo, con aria-pressed', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const fs = w.ui.screen.fullscreen, calls = stubFullscreen(); fs.disarm();
  const top = $('lobby-fullscreen'), opt = $('natpf-fullscreen'), attrs = {};
  top.setAttribute = (k, v) => { attrs[k] = v; };
  top.click(); await w.flush();
  assert.equal(calls.request, 1); assert.equal(fs.frameless, true);
  assert.equal(top.querySelector('.fs-label').textContent, FS_TEXT.exit);
  assert.equal(opt.querySelector('.fs-label').textContent, FS_TEXT.exit);
  assert.equal(attrs['aria-pressed'], 'true'); assert.ok(top.classList.contains('on'));
  opt.click(); await w.flush();
  assert.equal(calls.exit, 1); assert.equal(fs.frameless, false);
  assert.equal(top.querySelector('.fs-label').textContent, FS_TEXT.enter);
  assert.equal(attrs['aria-pressed'], 'false');
  assert.equal(document.documentElement.classList.contains('natpf-frameless'), false);
});
