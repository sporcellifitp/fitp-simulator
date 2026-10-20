// Calibrazione in campo: il computer mostra sempre il passo in cui si trova il telefono (natpf_cal_view.js).
// Prima il computer seguiva un suo percorso con la palla lanciata e un «gesto armato»: se il telefono era già ai gesti
// quando si entrava in campo la palla non partiva mai, e un gesto fatto prima della palla colpiva la palla del gesto
// successivo con il colpo sbagliato (dritto su una palla mandata al rovescio).
import test from 'node:test';
import assert from 'node:assert/strict';
import { calReduce, calPrompt, calSide, CAL_VIEW_EMPTY } from '../src/natpf/natpf_cal_view.js';

const run = events => events.reduce((v, e) => calReduce(v, e), CAL_VIEW_EMPTY);
// gli eventi come li manda il telefono (calibration.js): step porta sempre il passo attuale
const FLOW = [
  { kind: 'step', step: 'still' },
  { kind: 'step', step: 'swings', want: 'L', idx: 0, total: 4 },
  { kind: 'ready', step: 'swings', want: 'L' },
];

test('vista: fermo → gesto 1 «L» in attesa della mano ferma → «ora»', () => {
  let v = run(FLOW.slice(0, 1));
  assert.equal(v.stage, 'still');
  v = calReduce(v, FLOW[1]);
  assert.deepEqual([v.stage, v.idx, v.want, v.ready], ['gesture', 0, 'L', false]);
  assert.equal(calPrompt(v).state, 'wait');
  v = calReduce(v, FLOW[2]);
  assert.equal(v.ready, true);
  const p = calPrompt(v);
  assert.deepEqual([p.state, p.dir, p.side, p.title], ['go', 'L', 'forehand', 'Dritto ←']);
  assert.match(p.sub, /verso sinistra/);
});

test('vista: tentativo riuscito → gesto dopo; tentativo sbagliato → stesso gesto, «riprova» con il verso letto', () => {
  let v = run([...FLOW, { kind: 'attempt', step: 'swings', idx: 0, want: 'L', dir: 'R', ok: false, why: 'direzione', tries: 1 }]);
  assert.deepEqual([v.idx, v.ready, v.hits], [0, false, 0]);
  let p = calPrompt(v);
  assert.equal(p.state, 'retry'); assert.match(p.sub, /altro verso \(→\).*sinistra/);
  v = calReduce(v, { kind: 'ready', step: 'swings', want: 'L' });
  assert.equal(calPrompt(v).state, 'go', 'di nuovo pronto: si può rifare');
  v = calReduce(v, { kind: 'attempt', step: 'swings', idx: 0, want: 'L', dir: 'L', ok: true, tries: 0 });
  v = calReduce(v, { kind: 'next', step: 'swings', idx: 1, want: 'R' });
  assert.deepEqual([v.stage, v.idx, v.want, v.ready, v.hits], ['gesture', 1, 'R', false, 1]);
  p = calPrompt(calReduce(v, { kind: 'ready', step: 'swings', want: 'R' }));
  assert.deepEqual([p.state, p.side, p.title], ['go', 'backhand', 'Rovescio →']);
});

test('vista: entrare in campo a calibrazione già ai gesti mostra subito il gesto giusto (prima la palla non partiva)', () => {
  // il telefono parte appena si attivano i sensori: gli eventi arrivano prima del riscaldamento
  const v = run(FLOW);
  assert.equal(calPrompt(v).state, 'go');
  assert.equal(v.want, 'L');
});

test('vista: mancino, verifica, nuova calibrazione', () => {
  const v = run(FLOW);
  assert.equal(calPrompt(v, 'left').title, 'Rovescio ←');
  assert.equal(calSide('R', 'left'), 'forehand');
  const r = calReduce(v, { kind: 'review', step: 'review', pass: false, why: 'direzione' });
  assert.deepEqual([r.stage, calPrompt(r).state], ['review', 'retry']);
  const again = calReduce(r, { kind: 'step', step: 'swings', want: 'L', idx: 0, total: 4 });
  assert.deepEqual([again.stage, again.idx, again.hits, again.last], ['gesture', 0, 0, null]);
  const done = calReduce(calReduce(v, { kind: 'review', step: 'review', pass: true }), { kind: 'done', step: 'done' });
  assert.equal(done.stage, 'done');
  // eventi che non cambiano ciò che si vede non aumentano seq
  assert.equal(calReduce(v, { kind: 'free', step: 'free' }).seq, v.seq);
});
