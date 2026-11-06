// Fedeltà dell'ANIMAZIONE disegnata (B9 ramo C, docs/b9/giudizio-animazione.md §5.6.1, nota docs/b9/animazione-c.md):
// la posa che natpf_gesture_demo.js disegna (demo.pose(t)) è esattamente natpf_gesture_pose.gesturePose e, fatta leggere
// al telefono simulato completo (test/pose-sensors.mjs → test/phone-sim.mjs: rilevatore vero, forma del colpo,
// calibrazione rapida con l'animazione o con il braccio simulato, mappatura del gioco), dà per ogni scheda il colpo
// mostrato, un messaggio per ciclo (servizio: due), con il picco letto entro ±40 ms dal contatto disegnato; anche
// imitando più lenti (0,8×) o più veloci (1,25×), destro e mancino, presa nel palmo e a martello (rollback). Più i
// controlli geometrici del disegno che non hanno bisogno del browser (camere, misure del soggetto, palla, polso).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCard, judgeCard, omega } from './pose-sensors.mjs';
import * as GP from '../src/natpf/natpf_gesture_pose.js';
import * as DEMO from '../src/natpf/natpf_gesture_demo.js';
import { GESTURES } from '../src/natpf/natpf_gesture_motion.js';

const { NatpfGestureDemo, getGestureDemo, cameraAt, handRig, handFor, FOREARM_SHOWN, COMPACT_W } = DEMO;
const HANDS = ['right', 'left'], GRIPS = ['palmo', 'martello'], RATES = [.8, 1, 1.25];
const D = Math.PI/180;
// la sorgente delle pose è L'ISTANZA dell'animazione (quello che disegna), non il modulo della posa
function demoSource(grip){
  const demo = new NatpfGestureDemo();
  demo.grip = grip;
  return { demo, pose: (id, t, hand) => { if (demo.id !== id || demo.hand !== hand) demo.play(id, { hand }); return demo.pose(t); },
    plan: id => GP.gesturePlan(id, { grip }) };
}
const allowFor = (id, rate) => rate > 1 ? (['forehand', 'backhand', 'volley', 'cross', 'line'].includes(id) ? ['flat'] : null)
  : rate < 1 ? ({ slice: ['drop'], flat: ['topspin'] })[id] || null : null;

test('animazione: modulo senza three.js né WebGL, importabile in Node senza DOM (available false), stessa API di prima', () => {
  const src = readFileSync(new URL('../src/natpf/natpf_gesture_demo.js', import.meta.url), 'utf8');
  const imports = [...src.matchAll(/^import [^;]* from '([^']+)'/gms)].map(m => m[1]);
  assert.deepEqual(imports, ['./natpf_gesture_motion.js', './natpf_gesture_pose.js']);
  for (const w of ['three', 'webgl', 'THREE']) assert.ok(!src.includes(w), w);
  const d = new NatpfGestureDemo({ width: 240, height: 240 });
  assert.equal(d.available, false); assert.equal(d.canvas, null);
  for (const m of ['mount', 'setSize', 'play', 'start', 'stop', 'hitTime', 'cycle', 'pose', 'dispose']) assert.equal(typeof d[m], 'function', m);
  d.mount(null); d.setSize(640, 400); d.play('forehand', { hand: 'left', speed: .5 }); d.start(); d.stop();
  assert.equal(d.id, 'forehand'); assert.equal(d.hand, 'left');
  assert.ok(Math.abs(d.hitTime() - GP.gesturePlan('forehand').contact) < 1e-12);
  assert.ok(Math.abs(d.cycle() - GP.gesturePlan('forehand').total) < 1e-12);
  d.play('sconosciuto'); assert.equal(d.id, 'ready'); assert.equal(d.hitTime(), 0);
  // un'istanza per chiave: la modale, l'Allenamento e le due metà dello stesso schermo hanno ciascuna la sua
  assert.equal(getGestureDemo(), getGestureDemo('main'));
  assert.notEqual(getGestureDemo('p1'), getGestureDemo('p2'));
  const p = getGestureDemo('tmp'); p.dispose(); assert.notEqual(getGestureDemo('tmp'), p);
});

test('animazione: velocità «auto» = primo ciclo a tempo reale, poi ×0,5 e tempo reale alternati; presa e posizione sempre ferme', () => {
  const d = new NatpfGestureDemo();
  d.play('serve');
  assert.equal(d.rate(), 1); d.cycles = 1; assert.equal(d.rate(), DEMO.SLOW); d.cycles = 2; assert.equal(d.rate(), 1);
  d.play('forehand', { speed: .5 }); assert.equal(d.rate(), .5);
  d.play('grip'); d.cycles = 3; assert.equal(d.rate(), 1);
});

test('la posa disegnata è quella del test: demo.pose(t) == gesturePose(id, t, { hand }) su 50 istanti per scheda (destro e mancino, palmo e martello)', () => {
  for (const grip of GRIPS) for (const hand of HANDS){
    const d = new NatpfGestureDemo(); d.grip = grip;
    for (const id of GP.POSE_IDS){
      d.play(id, { hand });
      const P = GP.gesturePlan(id, { grip });
      for (let k = 0; k < 50; k++){
        const t = P.total*k/50, a = d.pose(t), b = GP.gesturePose(id, t, { hand, grip });
        assert.deepEqual(a.pos, b.pos, `${grip} ${hand} ${id} ${t}`); assert.deepEqual(a.q, b.q); assert.equal(a.label, b.label);
      }
    }
  }
});

test('fedeltà dell\'animazione: ogni scheda e la mira, destro e mancino, palmo e martello, calibrazione con l\'animazione e con il braccio simulato, imitazione 0,8× / 1× / 1,25×: un messaggio per ciclo (servizio due), colpo e lato attesi, picco letto = contatto disegnato ± 40 ms', () => {
  const bad = [];
  let n = 0;
  for (const grip of GRIPS){
    const src = demoSource(grip);
    for (const cal of ['pose', 'arm']) for (const hand of HANDS) for (const rate of RATES) for (const id of GP.POSE_IDS){
      if (GESTURES[id].still && rate !== 1) continue;
      n++;
      const r = readCard(src, id, { hand, cal, rate });
      const why = judgeCard(src, id, r, { hand, rate, allow: allowFor(id, rate), peakTol: 40 });
      if (id === 'serve' && r.msgs.length !== 2) why.push(`${r.msgs.length} messaggi (attesi 2)`);
      if (why.length) bad.push(`${grip} ${id} ${hand} cal=${cal} ×${rate}: ${why.join('; ')}`);
    }
  }
  assert.ok(n >= 280, `${n} letture`);
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('animazione: continuità (|ω| ≤ 2000 °/s, |Δpos| ≤ 0,15 m a 60 Hz) e ciclo chiuso; presa e posizione ferme (≤ 30 °/s)', () => {
  const d = new NatpfGestureDemo();
  for (const id of GP.POSE_IDS) for (const hand of HANDS){
    d.play(id, { hand });
    const total = d.cycle(), step = 1/60;
    let dw = 0, dp = 0;
    for (let t = 0; t < total; t += step){ const a = d.pose(t), b = d.pose(t + step); dw = Math.max(dw, GP.len(omega(a.q, b.q, step))); dp = Math.max(dp, GP.len(GP.sub(a.pos, b.pos))); }
    assert.ok(dw <= (GESTURES[id].still ? 30 : 2000) && dp <= .15, `${id} ${hand}: ${dw} °/s, ${dp} m`);
    const a = d.pose(0), z = d.pose(total - 1e-9);
    assert.ok(GP.len(GP.sub(a.pos, z.pos)) <= .0005 && GP.qangle(a.q, z.q) <= .2, `${id} ${hand}: ciclo aperto`);
  }
});

// lista del §5.6.2 per la parte che si misura senza browser (lo stesso controllo, sul disegno vero, nella prova
// tools/e2e/natpf-gesti-fotogrammi.mjs)
const KEYS = { stroke: ['carica', 'impatto', 'fine'], serve: ['lancio', 'caricamento', 'impatto'] };
const phoneOnScreen = (cam, pose) => {
  const a = cam.p(GP.add(pose.pos, GP.qrot(pose.q, [0, GP.PHONE.h/2, 0]))), b = cam.p(GP.add(pose.pos, GP.qrot(pose.q, [0, -GP.PHONE.h/2, 0])));
  return Math.hypot(a.x - b.x, a.y - b.y);
};
test('disegno: nelle pose chiave il telefono non è mai di taglio (schermo o dorso a ≥ 25° dalla linea di vista), a 448×280 è lungo ≥ 60 px all\'impatto, la palla tocca la cima (≤ 1 raggio) e «Impatto» è scritto in quell\'istante', () => {
  for (const id of GP.POSE_IDS){
    const P = GP.gesturePlan(id);
    if (P.still) continue;
    for (const hand of HANDS) for (const k of P.keys.filter(k => KEYS[P.kind].includes(k.id))){
      const pose = GP.gesturePose(id, k.t, { hand }), R = hand === 'left' ? { pos: GP.mirrorPos(pose.pos), q: GP.mirrorQ(pose.q) } : pose;
      for (const [W, H] of [[640, 400], [448, 280], [200, 200]]){
        const cam = cameraAt(id, k.t, { W, H, hand }), n = GP.qrot(R.q, [0, 0, 1]), v = GP.norm(GP.sub(cam.eye, R.pos));
        const edge = Math.asin(Math.min(1, Math.abs(GP.dot(n, v))))/D;
        assert.ok(edge >= 25, `${id} ${hand} ${k.label} ${W}×${H}: telefono a ${edge.toFixed(0)}°`);
        if (k.id === 'impatto' && W === 448) assert.ok(phoneOnScreen(cam, R) >= 60, `${id} ${hand}: telefono ${phoneOnScreen(cam, R).toFixed(0)} px a 448×280`);
      }
    }
    const pose = GP.gesturePose(id, P.contact), ball = GP.gestureBall(id, P.contact), l = GP.qrot(GP.qconj(pose.q), GP.sub(ball, pose.pos));
    const fromTip = Math.hypot(Math.max(0, Math.abs(l[0]) - GP.PHONE.w/2), Math.max(0, GP.PHONE.h/2 - l[1]), Math.abs(l[2])) - GP.BALL_R;
    assert.ok(fromTip <= GP.BALL_R, `${id}: palla a ${(fromTip/GP.BALL_R).toFixed(2)} raggi dalla cima`);
    assert.equal(pose.label, 'Impatto');
  }
  // presa: le due viste ferme mostrano lo schermo (non di taglio)
  for (const t of [1.5, 6]){ const cam = cameraAt('grip', t, { W: 640, H: 400 }), p = GP.gesturePose('grip', t), n = GP.qrot(p.q, [0, 0, 1]);
    assert.ok(Math.asin(Math.abs(GP.dot(n, GP.norm(GP.sub(cam.eye, p.pos)))))/D >= 25, `presa ${t}`); }
});

test('disegno: mano e avambraccio della presa nel palmo = scheletro gestureRig (polso fermo ~33°, dita sul vetro ≤ 8 mm); martello con il polso ≤ 35°; avambraccio che sfuma prima del gomito', () => {
  for (const id of ['forehand', 'serve', 'grip']) for (const hand of HANDS){
    const pose = GP.gesturePose(id, .9, { hand, rig: true }), R = hand === 'left' ? { pos: GP.mirrorPos(pose.pos), q: GP.mirrorQ(pose.q) } : pose;
    const r = handRig(R, handFor('palmo')), g = GP.gestureRig(R, { hand: 'right' });
    for (const [a, b] of [[r.W, g.wrist], [r.E, g.elbow], [r.thumb.pts[3], g.thumb.pts[3]], [r.fingers[2].pts[3], g.fingers[2].pts[3]]]) assert.ok(GP.len(GP.sub(a, b)) < 1e-12);
  }
  assert.ok(GP.fingersOverGlass() <= .008);
  // piega del polso: asse della mano (polso → nocca del medio) contro l'avambraccio
  for (const style of GRIPS){
    const H = handFor(style).def, axis = GP.norm(GP.sub(H.fingers[1].mcp, H.wrist)), bend = Math.acos(GP.dot(GP.norm(H.forearmDir), GP.mul(axis, -1)))/D;
    assert.ok(bend <= 35, `${style}: polso piegato di ${bend.toFixed(1)}°`);
  }
  // spalla e gomito sono solo indicativi (docs/b9/posa-gesti.md): il disegno non arriva mai al gomito
  assert.ok(FOREARM_SHOWN.to < .9 && FOREARM_SHOWN.from < FOREARM_SHOWN.to);
  assert.equal(COMPACT_W, 320);
});
