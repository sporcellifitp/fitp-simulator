// Tutorial in campo (28/10): lezione iniziale, feedback in tempo reale dal gesto letto dal telefono, volée a rete.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DRILLS, LESSON, liveFeedback, VOLLEY_Z } from '../src/natpf/natpf_training.js';
import { makeWorld } from './ui-world.mjs';

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

test('lezione iniziale: presa, mano e posizione prima della calibrazione; la calibrazione parte solo dopo', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training;
  let recal = 0; const orig = w.ui.phone.recalibrate.bind(w.ui.phone); w.ui.phone.recalibrate = () => { recal++; return orig(); };
  T.start({ intro: true });
  assert.ok(T.lesson); assert.equal(T.lesson.steps.length, LESSON.length);
  assert.equal(recal, 0, 'nessuna calibrazione durante la lezione');
  T.lessonAction('next'); assert.equal(T.lesson.idx, 1);
  T.lessonAction('left'); assert.equal(w.ui.hand.hand, 'left', 'la mano si sceglie nella lezione');
  T.lessonAction('right');
  T.lessonAction('back'); assert.equal(T.lesson.idx, 0);
  T.lessonAction('next'); T.lessonAction('next'); T.lessonAction('next');
  assert.equal(T.lesson, null); assert.equal(recal, 1, 'alla fine della lezione parte la calibrazione');
  // una seconda volta nella stessa sessione la lezione non si ripete (se non dal menu Allenamento)
  T.stop({ completed: false, silent: true }); T.start({ intro: true }); assert.equal(T.lesson, null);
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
