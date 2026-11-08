// Lettura dei colpi da fondo nelle camere del tutorial (B14, docs/b14/camera-dritto.md): la camera della televisione
// (dietro e dall'alto) schiacciava «avanti» e «in alto» sullo schermo (20° tra le due) e, seguendo la mano, cancellava la
// salita dall'impatto alla fine (la mano saliva di 0,5 m e sullo schermo scendeva). Qui si misura sul disegno vero
// (cameraAt, la stessa camera del gioco) che la salita si veda e che, nel dritto e nel lungolinea, «avanti» e «in alto»
// restino distinti e la mano all'impatto vada verso la rete sullo schermo. I vincoli del disegno del B9 (telefono non di
// taglio, ≥ 60 px, avambraccio) restano in natpf-gesture-anim.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as GP from '../src/natpf/natpf_gesture_pose.js';
import { cameraAt, COMPACT_W } from '../src/natpf/natpf_gesture_demo.js';

const D = Math.PI/180;
const fineOf = P => P.keys.find(k => k.id === 'fine').t;
// proiezione sullo schermo (px) di un punto del campo per la scheda all'istante t
const at = (id, t, X, W = 640, H = 400) => cameraAt(id, t, { W, H }).p(X);
const pos = (id, t) => GP.gesturePose(id, t).pos;
// salita vista dall'impatto alla fine (frazione dell'altezza dello stadio; positiva = in alto sullo schermo)
const riseAfterImpact = (id, W = 640, H = 400) => { const P = GP.gesturePlan(id); return (at(id, P.contact, pos(id, P.contact), W, H).y - at(id, fineOf(P), pos(id, fineOf(P)), W, H).y)/H; };
// direzioni proiettate all'impatto: avanti (−z), in alto (+y), velocità della mano
function screenDirs(id){
  const P = GP.gesturePlan(id), cam = cameraAt(id, P.contact, { W: 640, H: 400 }), X = pos(id, P.contact), o = cam.p(X);
  const pr = d => { const q = cam.p(GP.add(X, GP.mul(d, .3))); return [q.x - o.x, q.y - o.y]; };
  const v = GP.sub(pos(id, P.contact + .004), pos(id, P.contact - .004));
  return { fwd: pr([0, 0, -1]), up: pr([0, 1, 0]), vel: pr(GP.norm(v)) };
}
const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0]*b[0] + a[1]*b[1])/Math.hypot(...a)/Math.hypot(...b))))/D;

test('camere dei colpi da fondo: dall\'impatto alla fine la mano sale sullo schermo (prima il dritto scendeva di circa 7 px a 640×400)', () => {
  const min = { forehand: .2, line: .2, cross: .2, backhand: .15, flat: .06 };
  for (const [id, m] of Object.entries(min)){
    for (const [W, H] of [[640, 400], [448, 280]]){
      const r = riseAfterImpact(id, W, H);
      assert.ok(r >= m*(W === 448 ? .5 : 1), `${id} ${W}×${H}: salita dopo l'impatto ${(r*100).toFixed(0)}% dell'altezza`);
    }
  }
});

test('dritto, lungolinea e incrociato: «avanti» e «in alto» distinti sullo schermo (≥ 55°, prima 20°) e la mano all\'impatto verso la rete (≤ 30°, prima 59°)', () => {
  for (const id of ['forehand', 'line', 'cross']){
    const s = screenDirs(id), fu = ang(s.fwd, s.up), vf = ang(s.vel, s.fwd);
    assert.ok(fu >= 55, `${id}: avanti e in alto a ${fu.toFixed(0)}°`);
    assert.ok(vf <= 30, `${id}: mano all'impatto a ${vf.toFixed(0)}° da «avanti» sullo schermo`);
  }
});

test('camere che seguono meno negli stadi grandi (mixSmall): a 448×280 il telefono resta dentro lo stadio utile, il mancino è lo specchio', () => {
  for (const id of ['forehand', 'flat', 'line', 'cross', 'backhand']){
    const P = GP.gesturePlan(id), fo = GP.CAMERAS[id].follow;
    assert.ok(fo && fo.mix <= .7, `${id}: mix ${fo?.mix}`);
    for (const [W, H] of [[448, 280], [640, 400]]){
      let m = Infinity;
      for (let t = 0; t < P.total; t += 1/60){ const q = at(id, t, pos(id, t), W, H); m = Math.min(m, q.x, W - q.x, q.y, H*(W < COMPACT_W ? 1 : .8) - q.y); }
      assert.ok(m >= 10, `${id} ${W}×${H}: centro del telefono a ${m.toFixed(0)} px dal bordo`);
    }
    // mancino: la stessa inquadratura specchiata
    const t = P.contact, R = cameraAt(id, t, { W: 640, H: 400 }), L = cameraAt(id, t, { W: 640, H: 400, hand: 'left' }), X = pos(id, t);
    assert.ok(Math.abs(R.p(X).x - (640 - L.p(X).x)) < 1e-6 && Math.abs(R.p(X).y - L.p(X).y) < 1e-6);
  }
});

// testa di racchetta fantasma (B14): prototipo SPENTO di serie, decide l'utente. Con la presa nel palmo la cima del
// telefono all'impatto punta in avanti: la testa che la prolunga punterebbe alla rete e la palla cadrebbe sulla gola
// (docs/b14/camera-dritto.md §4). Qui solo che resti spenta e che, accesa, si disegni senza errori.
test('testa di racchetta fantasma: spenta di serie; accesa si disegna (contesto 2D finto) senza cambiare la posa', async () => {
  const D = await import('../src/natpf/natpf_gesture_demo.js');
  assert.equal(D.GHOST_RACKET, false);
  const ctx = () => new Proxy({}, { get(t, k){ if (k in t) return t[k]; if (k === 'measureText') return s => ({ width: String(s).length*6 }); if (typeof k === 'string' && k.startsWith('create')) return () => ({ addColorStop(){} }); return () => {}; }, set(t, k, v){ t[k] = v; return true; } });
  const canvas = () => ({ width: 0, height: 0, style: {}, className: '', isConnected: true, offsetParent: {}, getContext: ctx, remove(){} });
  const had = 'document' in globalThis, prev = globalThis.document;
  const raf = globalThis.requestAnimationFrame, caf = globalThis.cancelAnimationFrame;
  globalThis.document = { createElement: canvas, hidden: false };
  globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
  try {
    const d = new D.NatpfGestureDemo({ width: 640, height: 400 }); d.ghostRacket = true;
    for (const id of ['forehand', 'backhand', 'flat', 'cross']){
      d.play(id); d.stop(); d.show(d.hitTime());
      const p = GP.gesturePose(id, d.hitTime());
      assert.ok(GP.len(GP.sub(d.info.pose.pos, p.pos)) < 1e-12);
    }
  } finally {
    if (had) globalThis.document = prev; else delete globalThis.document;
    if (raf) globalThis.requestAnimationFrame = raf; else delete globalThis.requestAnimationFrame;
    if (caf) globalThis.cancelAnimationFrame = caf; else delete globalThis.cancelAnimationFrame;
  }
});
