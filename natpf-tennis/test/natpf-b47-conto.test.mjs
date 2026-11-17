// B47 · conto alla rovescia grande prima della partita (richiesta dell'utente del 14/11: «tra il momento degli scambi
// della calibrazione e del match, prevedi un countdown grosso centrale che dice "Preparati, la partita sta per
// cominciare"»): natpf_prematch.js. Ovunque parta una partita con il telefono (contro la CPU, stesso schermo con i due
// telefoni), al centro dello schermo intero, 3 · 2 · 1, partita ferma intanto; poi la scritta e la voce «Start».
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWorld, $, visible } from './ui-world.mjs';
import { phoneLike, playWorld, playTrial, stroke, secondPhone } from './trial-world.mjs';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { PREMATCH, prematchDue, prematchLeft, prematchServeLine } from '../src/natpf/natpf_prematch.js';

test('quando c\'è: partita con il telefono contro la CPU o nello stesso schermo con i due telefoni; non con webcam, mouse, sfida tra due computer, dimostrazione', () => {
  assert.equal(prematchDue({ controller: 'phone' }), true);
  assert.equal(prematchDue({ controller: 'webcam' }), false);
  assert.equal(prematchDue({ controller: 'mouse' }), false);
  assert.equal(prematchDue({ controller: 'phone', split: true }), true);
  assert.equal(prematchDue({ controller: 'webcam', split: true, webcam: true }), false, 'webcam per due');
  assert.equal(prematchDue({ controller: 'phone', versus: true }), false, 'sfida tra due computer');
  assert.equal(prematchDue({ controller: 'phone', autoPlay: true }), false);
});

test('3 · 2 · 1 in 3 secondi, testi grandi in italiano, chi batte', () => {
  assert.equal(PREMATCH.ms, 3000);
  assert.equal(PREMATCH.kicker, 'Preparati');
  assert.equal(PREMATCH.title, 'La partita sta per cominciare');
  assert.deepEqual([0, 1, 999, 1000, 1999, 2000, 2999, 3000, 4000].map(t => prematchLeft(t)), [3, 3, 3, 2, 2, 1, 1, 0, 0]);
  assert.equal(prematchServeLine({ server: 'player', fixed: true }), 'Batti sempre tu: lancia la palla e colpisci');
  assert.equal(prematchServeLine({ server: 'player' }), 'Batti tu: lancia la palla e colpisci');
  assert.equal(prematchServeLine({ server: 'opponent' }), 'Batte per prima la CPU');
  assert.equal(prematchServeLine({ names: { player: 'Giulia', opponent: 'Marco' }, server: 'opponent', fixed: true }), 'Batte sempre Marco');
  assert.equal(prematchServeLine({ names: { player: 'Giulia', opponent: 'Marco' }, server: 'player' }), 'Batte per primo Giulia');
});

test('contro la CPU con «Giocando»: scambi di prova, pagina, «Gioca» → conto grande con la partita ferma, poi «Start» e si gioca', async () => {
  const w = await playWorld(), { E, ui, hud, link } = w;
  E.natpfServeRule = undefined;   // (il motore di prova usa «Alternata»: qui la regola del gioco, salvata o di base)
  const banners = []; hud.showCenterBanner = (t, o = {}) => banners.push([t, o.subText || '']);
  assert.ok(ui.trial.active, 'scambi di prova prima della pagina');
  const r = playTrial(w, (id, n, want) => stroke({ dir: want }), { gioca: false });
  assert.ok(r.page);
  // (B59: prima degli scambi di prova la scritta «Allenati un po'!» del loro conto; qui si guarda quella della partita)
  assert.deepEqual(banners, [["Allenati un po'!", '']]); banners.length = 0;
  const before = link.sent.filter(m => m.t === 'ev' && m.k === 'count').length;
  assert.equal(w.pressStart(), true); w.advance(100);
  assert.equal(E.natpfMatchSeq, 1);
  assert.ok(ui.prematch.active && visible('natpf-prematch'), 'conto grande in vista');
  const el = $('natpf-prematch');
  assert.equal(el.querySelector('[data-prematch="kicker"]').textContent, 'Preparati');
  assert.equal(el.querySelector('[data-prematch="title"]').textContent, 'La partita sta per cominciare');
  assert.equal(el.querySelector('[data-prematch="num"]').textContent, '3');
  assert.equal(el.querySelector('[data-prematch="serve"]').textContent, 'Batti sempre tu: lancia la palla e colpisci', 'battuta «Sempre lo stesso» di base');
  assert.ok(E.score.fixed && E.score.server === 'player');
  assert.ok(E.natpfPaused && E.phase === 'SERVE_STANCE', 'ferma al primo servizio');
  assert.deepEqual(banners, [], 'la scritta «Start» aspetta la fine del conto');
  // il motore non va avanti: niente servizio, niente tempo di gioco
  const t0 = E.phaseTimer; w.advance(1000);
  assert.equal(E.phaseTimer, t0); assert.equal(el.querySelector('[data-prematch="num"]').textContent, '2');
  w.advance(1000); assert.equal(el.querySelector('[data-prematch="num"]').textContent, '1');
  w.advance(1100);
  assert.ok(!ui.prematch.active && !visible('natpf-prematch') && !E.natpfPaused, 'si gioca');
  assert.deepEqual(banners, [['Start', '']], '«Start» alla fine del conto');
  assert.deepEqual(link.sent.filter(m => m.t === 'ev' && m.k === 'count').slice(before).map(m => m.n), [3, 2, 1, 0], 'il telefono ripete il conto');
  w.advance(500); assert.ok(E.phaseTimer > t0, 'il gioco va avanti');
});

test('stesso schermo: dopo gli scambi di prova un conto solo, al centro, con chi batte; menu durante il conto: niente partita', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), { E, ui, lobby, link, hud } = w, P1 = ui.phone;
  const banners = []; hud.showCenterBanner = (t, o = {}) => banners.push([t, o.subText || '']);
  const { P2, l2 } = secondPhone(E, NatpfPhoneRacket);
  phoneLike(P1, link); P1.markTutorialSeen('short'); P2.markTutorialSeen('short');
  E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' };
  E.natpfRng = () => .9;   // sorteggio: batte Marco
  E.natpfServeRule = undefined;   // regola del gioco (di base «Sempre lo stesso»)
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint(); w.advance(300);
  link.cmd('skip'); l2.cmd('skip'); w.advance(300);
  lobby.go('match'); w.advance(300);
  assert.equal(w.pressStart(), false, '«Gioca» → prima gli scambi di prova');
  assert.ok(ui.trial.active && ui.trial.S.split);
  playTrial(w, (id, n, want) => stroke({ dir: want }), { phones: { p1: P1, p2: P2 } });
  w.advance(100);
  assert.ok(!ui.trial.active && E.natpfSplit?.active && E.natpfMatchSeq === 1);
  assert.ok(ui.prematch.active && visible('natpf-prematch'));
  assert.equal($('natpf-prematch').querySelector('[data-prematch="serve"]').textContent, 'Batte sempre Marco');
  assert.ok(E.natpfPaused && E.score.server === 'opponent' && E.score.fixed);
  w.advance(3100);
  assert.ok(!ui.prematch.active && !E.natpfPaused);
  assert.deepEqual(banners.at(-1), ['Start', 'Sorteggio: batte sempre Marco']);
  // partita nuova e ritorno al menu durante il conto: il conto sparisce e non fa partire niente
  ui.backToMenu('match'); w.advance(300);
  link.cmd('skip'); l2.cmd('skip');
  assert.equal(E.natpfSplit?.active, false);
  ui.split.start(); E.autoPlayMode = false; E.startNewMatch({ showStartBanner: true }); w.advance(500);
  assert.ok(ui.prematch.active);
  const n = banners.length;
  ui.backToMenu(); w.advance(4000);
  assert.ok(!ui.prematch.active && !visible('natpf-prematch'));
  assert.equal(banners.length, n, 'nessuna scritta «Start» dopo il menu');
});

test('nessun conto: sfida tra due computer, mouse e tastiera, partite di prova del motore (scritta d\'inizio spenta)', async () => {
  const m = await makeWorld({ controller: 'mouse' });
  m.lobby.go('mode'); m.lobby.setMode('cpu'); m.lobby.go('controller'); m.lobby.go('connect'); m.lobby.next(); m.advance(300);
  m.pressStart(); m.advance(100);
  assert.ok(!m.ui.prematch.active && !m.E.natpfPaused, 'mouse e tastiera: si gioca subito');
  const w = await playWorld({ cal: 'none' }), { E, ui } = w;
  E.startNewMatch({ showStartBanner: false }); w.advance(100);
  assert.ok(!ui.prematch.active, 'senza la scritta d\'inizio (test, simulazioni) niente conto');
  ui.lobby.mode = 'friend';
  assert.equal(ui.prematch.due(), false, 'sfida tra due computer');
});

test('pagina e stile: un riquadro solo al centro dello schermo intero, misure con cqw/cqh', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="natpf-prematch" class="natpf-prematch hidden"/);
  assert.equal((html.match(/id="natpf-prematch"/g) || []).length, 1);
  const css = readFileSync(new URL('../natpf-ui.css', import.meta.url), 'utf8');
  const block = css.slice(css.indexOf('.natpf-prematch {'), css.indexOf('@keyframes prematch-in'));
  assert.match(block, /position: fixed; inset: 0;/);
  assert.match(block, /cqh/); assert.match(block, /cqw/);
  assert.doesNotMatch(block, /\d(vw|vh)\b/, 'niente vw/vh (CLAUDE.md: ledwall)');
});
