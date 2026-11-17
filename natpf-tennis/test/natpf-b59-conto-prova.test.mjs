// B59 · conto alla rovescia «Allenati un po'!» prima degli scambi di prova (richiesta dell'utente del 16/11: «quando c'è la
// sessione di calibrazione con scambi di palla ci sia un countdown come quando parte il vero match, con una scritta centrale
// grossa dove al posto di "Si gioca" compaia "Allenati un po'" con quella transizione centrale. Poi le persone fanno
// scambi, si allenano, e poi comincia il match»): natpf_prematch.beginTrial e natpf_trial.start. Lo stesso riquadro grande
// della partita (3 · 2 · 1, campo fermo, nessuna palla), poi la scritta grande «Allenati un po'!» con lo stile di
// «Si gioca» (style-start) e la voce «Go!», i telefoni con «Allenamento tra» e «Allenati un po'!»; poi le palle; dopo gli
// scambi il conto di sempre della partita. «Salta ›», menu, pausa durante il conto; niente conto con «Ricalibra».
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, visible } from './ui-world.mjs';
import { phoneLike, playWorld, playTrial, stroke, secondPhone, COUNT_MS } from './trial-world.mjs';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { PREMATCH, TRIAL_COUNT, prematchTexts } from '../src/natpf/natpf_prematch.js';
import { TRIAL } from '../src/natpf/natpf_trial_learn.js';

const counts = link => link.sent.filter(m => m.t === 'ev' && m.k === 'count');
const spy = w => {
  const banners = [], cues = [];
  w.hud.showCenterBanner = (t, o = {}) => banners.push([t, o.style || '', o.subText || '']);
  // (il mondo di prova non ha l'audio: un audio finto che segna solo le voci dei minigiochi)
  const A = w.E.audioEngine;
  if (A){ const cue = A.cue?.bind(A); A.cue = id => { cues.push(id); return cue?.(id); }; }
  else w.E.audioEngine = new Proxy({}, { get: (t, k) => (k === 'cue' ? (id => { cues.push(id); }) : () => {}) });
  return { banners, cues };
};

test('B59: testi del riquadro: partita come prima, scambi di prova con la riga del lanciapalle o del palleggio', () => {
  assert.deepEqual(prematchTexts('match'), { kicker: 'Preparati', title: 'La partita sta per cominciare', line: null });
  assert.deepEqual(prematchTexts(), prematchTexts('match'));
  assert.deepEqual(prematchTexts('trial'), { kicker: 'Preparati', title: 'Prima qualche scambio di prova', line: TRIAL_COUNT.line });
  assert.equal(prematchTexts('trial', { split: true }).line, TRIAL_COUNT.lineSplit);
  assert.equal(TRIAL_COUNT.go, "Allenati un po'!");
  assert.equal(COUNT_MS, PREMATCH.ms + TRIAL.afterCount*1000);
});

test('B59: contro la CPU: conto «Allenati un po\'!» con il campo fermo, scritta grande e voce, poi le palle; dopo gli scambi il conto della partita', async () => {
  const w = await playWorld(), { E, ui, link } = w, { banners, cues } = spy(w);
  assert.ok(ui.trial.active && ui.trial.S.phase === 'count', 'scambi di prova aperti, prima il conto');
  const el = $('natpf-prematch'), q = s => el.querySelector(`[data-prematch="${s}"]`).textContent;
  assert.ok(ui.prematch.active && ui.prematch.kind === 'trial' && visible('natpf-prematch'));
  assert.equal(el.dataset.kind, 'trial');
  assert.deepEqual([q('kicker'), q('title'), q('num'), q('serve')], ['Preparati', 'Prima qualche scambio di prova', '3', TRIAL_COUNT.line]);
  assert.ok(!visible('natpf-trial'), 'la scritta degli scambi aspetta la fine del conto');
  assert.equal(E.natpfPaused, true, 'campo fermo durante il conto');
  assert.deepEqual(counts(link).map(m => [m.n, m.trial]), [[3, 1]], 'il telefono: «Allenamento tra 3»');
  w.advance(1000); assert.equal(q('num'), '2'); assert.notEqual(E.phase, 'RALLY');
  w.advance(1000); assert.equal(q('num'), '1'); assert.notEqual(E.phase, 'RALLY', 'nessuna palla durante il conto');
  assert.deepEqual(banners, []);
  w.advance(1100);
  assert.ok(!ui.prematch.active && !visible('natpf-prematch') && !E.natpfPaused);
  assert.deepEqual(banners, [["Allenati un po'!", 'style-start', '']], 'la scritta grande con la transizione di «Si gioca»');
  assert.deepEqual(cues, ['go'], 'la voce «Go!»');
  assert.deepEqual(counts(link).map(m => [m.n, m.trial]), [[3, 1], [2, 1], [1, 1], [0, 1]], 'il telefono: «Allenati un po\'!»');
  assert.ok(visible('natpf-trial') && $('natpf-trial').dataset.state === 'intro', 'poi la scritta degli scambi di prova');
  assert.ok(ui.trial.S.phase === 'intro' && !E.natpfMatchSeq, 'scambi di prova, la partita non è partita');
  w.advance(TRIAL.afterCount*1000 + 100); assert.equal(E.phase, 'RALLY', 'prima palla dopo la scritta');
  // scambi, pagina «Pronto per la partita», «Gioca» → il conto di sempre della partita, senza «trial» per il telefono
  const r = playTrial(w, (id, n, want) => stroke({ dir: want }), { gioca: false });
  assert.ok(r.page);
  const before = counts(link).length;
  assert.equal(w.pressStart(), true); w.advance(100);
  assert.ok(ui.prematch.active && ui.prematch.kind === 'match');
  assert.deepEqual([q('kicker'), q('title')], ['Preparati', 'La partita sta per cominciare']);
  assert.equal(el.dataset.kind, 'match');
  w.advance(3100);
  assert.deepEqual(banners.at(-1), ['Start', 'style-start', ''], 'la partita: «Start» come prima');
  assert.ok(counts(link).slice(before).every(m => !m.trial), 'il conto della partita è quello di sempre sul telefono');
});

test('B59: «Salta ›» o menu durante il conto: il conto sparisce senza scritta né voce; pausa durante il conto: aspetta e riprende', async () => {
  const w = await playWorld(), { E, ui } = w, { banners, cues } = spy(w);
  w.advance(1000); assert.ok(ui.prematch.active && ui.prematch.kind === 'trial');
  ui.trial.skip(); w.advance(100);
  assert.ok(!ui.prematch.active && !visible('natpf-prematch'), '«Salta ›»: niente conto');
  w.advance(4000);
  assert.ok(!banners.some(b => b[0] === TRIAL_COUNT.go) && !cues.includes('go'), 'nessuna «Allenati un po\'!» dopo «Salta ›»');
  assert.ok(!ui.trial.active);
  // menu durante il conto
  const m = await playWorld(), s2 = spy(m);
  m.advance(800); assert.ok(m.ui.prematch.active);
  m.ui.backToMenu(); m.advance(4000);
  assert.ok(!m.ui.prematch.active && !m.ui.trial.active && !s2.banners.length && !s2.cues.length, 'menu: niente conto, niente scritta, niente scambi');
  // pannello dello stand aperto durante il conto: il numero resta fermo, poi riprende da dove era
  const p = await playWorld(), el = $('natpf-prematch');
  p.advance(1200); assert.equal(el.querySelector('[data-prematch="num"]').textContent, '2');
  p.ui.kiosk.open(); p.advance(3000);
  assert.ok(p.ui.prematch.active && p.ui.trial.S.phase === 'count', 'conto fermo con il pannello aperto');
  p.ui.kiosk.close(); p.advance(100);
  assert.equal(el.querySelector('[data-prematch="num"]').textContent, '2', 'riprende da 2, non da 3');
  p.advance(2000); assert.ok(!p.ui.prematch.active && p.ui.trial.S.phase !== 'count');
});

test('B59: «Ricalibra» a partita in corso (resume): niente conto, le palle partono come prima', async () => {
  const w = await playWorld(), { ui } = w;
  ui.trial.abort(); w.advance(100);
  assert.ok(!ui.trial.active && !ui.prematch.active);
  assert.equal(ui.trial.start({ resume: true }), true);
  assert.ok(!ui.prematch.active && ui.trial.S.phase === 'intro', 'subito la scritta degli scambi');
  w.advance(TRIAL.intro*1000 + 100); assert.equal(w.E.phase, 'RALLY');
});

test('B59: stesso schermo: un conto solo con la riga del palleggio, tutti e due i telefoni avvisati', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), { E, ui, lobby, link } = w, P1 = ui.phone;
  const { P2, l2 } = secondPhone(E, NatpfPhoneRacket);
  phoneLike(P1, link); P1.markTutorialSeen('short'); P2.markTutorialSeen('short');
  E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' };
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint(); w.advance(300);
  link.cmd('skip'); l2.cmd('skip'); w.advance(300);
  lobby.go('match'); w.advance(300);
  assert.equal(w.pressStart(), false);
  // (nello stesso schermo gli scambi di prova si aprono dopo il conto piccolo «Aspetta / Gioca» dei telefoni)
  for (let k = 0; k < 400 && !(ui.trial.active && ui.prematch.active); k++) w.advance(16);
  assert.ok(ui.trial.active && ui.trial.S.split && ui.prematch.active && ui.prematch.kind === 'trial');
  assert.equal($('natpf-prematch').querySelector('[data-prematch="serve"]').textContent, TRIAL_COUNT.lineSplit);
  w.advance(3100);
  for (const l of [link, l2]) assert.deepEqual(counts(l).filter(m => m.trial).map(m => m.n), [3, 2, 1, 0], 'tutti e due i telefoni');
});
