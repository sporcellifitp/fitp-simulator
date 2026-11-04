// Tutorial in campo (28/10): lezione iniziale, feedback in tempo reale dal gesto letto dal telefono, volée a rete.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DRILLS, LESSON, liveFeedback, VOLLEY_Z } from '../src/natpf/natpf_training.js';
import { makeWorld } from './ui-world.mjs';
import { tutorialStep, TUTORIAL, TUTORIAL_CARDS } from '../src/natpf/natpf_tutorial.js';

const D = id => DRILLS.find(d => d.id === id);

test('feedback in tempo reale: riconosce il gesto giusto e spiega quello sbagliato (anche per il mancino)', () => {
  assert.equal(liveFeedback(D('forehand'), { shot: 'topspin', power: .8 }, { side: 'forehand' }).ok, true);
  const wrong = liveFeedback(D('forehand'), { shot: 'topspin' }, { side: 'backhand' });
  assert.equal(wrong.ok, false); assert.match(wrong.tip, /da destra verso sinistra/);
  assert.match(liveFeedback(D('forehand'), { shot: 'topspin' }, { side: 'backhand', hand: 'left' }).tip, /da sinistra verso destra/);
  assert.match(liveFeedback(D('lob'), { shot: 'topspin' }, { side: 'forehand' }).tip, /dal basso verso l’alto/);
  assert.match(liveFeedback(D('drop'), { shot: 'slice' }, {}).tip, /lento/);
  assert.match(liveFeedback(D('slice'), { shot: 'drop' }, {}).tip, /deciso/);
  assert.equal(liveFeedback(D('smash'), { shot: 'smash' }, {}).ok, true);
  assert.match(liveFeedback(D('flat'), { shot: 'topspin' }, { side: 'forehand' }).tip, /più veloce/i);
  // incrociato: il dritto del destro va a sinistra (mira negativa); per il mancino il contrario
  assert.equal(liveFeedback(D('cross'), { shot: 'topspin', wrist: -.6 }, { side: 'forehand' }).ok, true);
  assert.equal(liveFeedback(D('cross'), { shot: 'topspin', wrist: .6 }, { side: 'forehand' }).ok, false);
  assert.equal(liveFeedback(D('cross'), { shot: 'topspin', wrist: .6 }, { side: 'forehand', hand: 'left' }).ok, true);
  assert.equal(liveFeedback(D('line'), { shot: 'topspin', wrist: .6 }, { side: 'forehand' }).ok, true);
  assert.equal(liveFeedback(D('forehand'), null), null);
});

// Richiesta del 04/11: con il telefono, prima della calibrazione, una modale grande con la presa e tutti i gesti; si chiude
// dal telefono con «Tutto chiaro, ho capito» (natpf_phone_racket.waitTutorial/onTutorial), una volta per sessione
const tapOk = P => { for (const fn of P.tutListeners) fn({ ok: true }); };
test('tutorial prima della calibrazione: modale con presa e gesti, il telefono aspetta «Tutto chiaro, ho capito», poi la calibrazione', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training, P = w.ui.phone;
  let recal = 0; const orig = P.recalibrate.bind(P); P.recalibrate = () => { recal++; return orig(); };
  T.start({ intro: true });
  assert.ok(T.tutorialOpen && T.tutorial.open, 'modale aperta'); assert.equal(T.lesson, null, 'con il telefono la lezione è la modale');
  assert.equal(P.tutWait, true); assert.ok(P.link.sent.some(m => m.t === 'cfg' && m.tut === 1), 'il telefono aspetta il tutorial');
  assert.equal(recal, 0, 'nessuna calibrazione con la modale aperta');
  P.tutSupported = true; T._onCal({ kind: 'step', step: 'still' }); assert.ok(T.tutorialOpen, 'gli eventi del telefono non chiudono la modale');
  // le schede scorrono da sole (chi gioca ha il telefono in mano)
  const first = T.tutorial.state.idx; w.advance(7000); T.tutorial.tick(); assert.notEqual(T.tutorial.state.idx, first);
  tapOk(P);
  assert.ok(!T.tutorialOpen && !T.tutorial.open, 'chiusa dal telefono'); assert.equal(recal, 1, 'poi parte la calibrazione');
  assert.equal(P.tutWait, false); assert.equal(P.link.sent.filter(m => m.t === 'cfg').at(-1).tut, undefined, 'il telefono non aspetta più');
  // in calibrazione niente riquadro «Guarda e ripeti» in alto a destra
  T.paint(); assert.ok(T.coach.querySelector('#coach-demo').classList.contains('hidden'));
  // una volta per sessione e per giocatore
  T.stop({ completed: false, silent: true }); T.start({ intro: true }); assert.ok(!T.tutorialOpen, 'non si ripete nella stessa sessione');
  // «Rivedi i gesti»: la stessa modale, da chiudere sul computer, senza fermare il telefono
  T.reviewGestures(); assert.ok(T.tutorial.open && !T.tutorialOpen && !P.tutWait); T.tutorial.close('review'); assert.ok(!T.tutorial.open);
  T.stop({ completed: false, silent: true });
});

test('tutorial: telefono con la pagina di prima (non lo conosce) — la modale si chiude quando comincia a calibrare da solo', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training;
  T.start({ calOnly: true });
  assert.ok(T.tutorialOpen, 'anche prima di una sfida');
  T._onCal({ kind: 'step', step: 'still' });
  assert.ok(!T.tutorialOpen && T.tutorialSeen.p1);
  T.stop({ completed: false, silent: true });
});

test('tutorial: le schede scorrono da sole, una scelta a mano resta ferma per un po\'', () => {
  let s = tutorialStep(null, { now: 0 });
  assert.equal(s.idx, 0);
  s = tutorialStep(s, { now: TUTORIAL.autoMs - 1 }); assert.equal(s.idx, 0);
  s = tutorialStep(s, { now: TUTORIAL.autoMs + 1 }); assert.equal(s.idx, 1);
  s = tutorialStep(s, { now: TUTORIAL.autoMs + 2, pick: 5 }); assert.equal(s.idx, 5);
  s = tutorialStep(s, { now: TUTORIAL.autoMs*3 }); assert.equal(s.idx, 5, 'scelta a mano: ferma');
  s = tutorialStep(s, { now: TUTORIAL.autoMs + 2 + TUTORIAL.holdMs + TUTORIAL.autoMs + 1 }); assert.equal(s.idx, 6);
  s = tutorialStep({ idx: TUTORIAL_CARDS.length - 1, shownAt: 0, holdUntil: 0 }, { now: TUTORIAL.autoMs + 1 }); assert.equal(s.idx, 0, 'ricomincia');
  // tutti i gesti del tutorial (presa e posizione comprese) hanno titolo e indicazioni
  for (const c of TUTORIAL_CARDS) assert.ok(c.title && (c.cues.length || c.text), c.id);
  assert.deepEqual(TUTORIAL_CARDS.slice(0, 2).map(c => c.id), ['grip', 'ready']);
});

test('webcam: la lezione a passi dell\'Allenamento resta (versione breve, senza il telefono)', async () => {
  const w = await makeWorld({ controller: 'webcam' });
  const T = w.ui.training;
  T.start({ intro: true });
  assert.ok(T.lesson && !T.tutorialOpen);
  T.stop({ completed: false, silent: true });
});

test('volée: il giocatore va a rete e il lanciapalle aspetta che arrivi', async () => {
  const w = await makeWorld({ controller: 'mouse' });
  const T = w.ui.training;
  T.start({ drills: [D('volley')] });
  T._idle(); T.wait = .01;
  T.tick(.02);
  assert.equal(w.E.player.targetPos.z, VOLLEY_Z, 'il giocatore va a rete');
  assert.ok(!T.ballLive(), 'nessuna palla finché non è a rete');
  w.E.player.pos.z = VOLLEY_Z; T.wait = .01; T.tick(.02);
  assert.ok(T.ballLive(), 'giocatore a rete: il lanciapalle lancia');
  assert.equal(w.E.natpfPlan?.kind, 'volley', `piano d'impatto del motore: ${w.E.natpfPlan?.kind}`);
  T.stop({ completed: false, silent: true });
});
