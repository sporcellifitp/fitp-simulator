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
import { declared } from './gesture-semi.mjs';
import * as DEMO from '../src/natpf/natpf_gesture_demo.js';
import { GESTURES } from '../src/natpf/natpf_gesture_motion.js';

const { NatpfGestureDemo, getGestureDemo, cameraAt, handRig, handFor, FOREARM_SHOWN, COMPACT_W } = DEMO;
const HANDS = ['right', 'left'], GRIPS = ['racchetta', 'palmo', 'martello'], RATES = [.8, 1, 1.25];
const D = Math.PI/180;
// la sorgente delle pose è L'ISTANZA dell'animazione (quello che disegna), non il modulo della posa
function demoSource(grip){
  const demo = new NatpfGestureDemo();
  demo.grip = grip;
  return { demo, pose: (id, t, hand) => { if (demo.id !== id || demo.hand !== hand) demo.play(id, { hand }); return demo.pose(t); },
    plan: id => GP.gesturePlan(id, { grip }) };
}
const allowFor = (id, rate) => rate > 1 ? (['forehand', 'backhand', 'volley', 'cross', 'line'].includes(id) ? ['flat'] : null)
  : rate < 1 ? ({ slice: ['drop'], sliceBackhand: ['drop'], flat: ['topspin'] })[id] || null : null;

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

test('la posa disegnata è quella del test: demo.pose(t) == gesturePose(id, t, { hand }) su 50 istanti per scheda (destro e mancino, racchetta, palmo e martello)', () => {
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

test('fedeltà dell\'animazione: ogni scheda e la mira, destro e mancino, racchetta, palmo e martello, calibrazione con l\'animazione e con il braccio simulato, imitazione 0,8× / 1× / 1,25×: un messaggio per ciclo (servizio due), colpo e lato attesi, picco letto = contatto disegnato ± 40 ms', () => {
  const bad = [];
  let n = 0, skipped = 0;
  for (const grip of GRIPS){
    const src = demoSource(grip);
    for (const cal of ['pose', 'arm']) for (const hand of HANDS) for (const rate of RATES) for (const id of GP.POSE_IDS){
      if (GESTURES[id].still && rate !== 1) continue;
      // B17.1 passo B3: limite dichiarato (ottimizzazione.md §9): con lo schermo verso la rete nel dritto la calibrazione del
      // braccio simulato non legge la mira di incrociato e lungolinea né il piatto; quelle letture NON sono verificate qui:
      // sono contate e confrontate con il conto misurato nei test natpf-gesture-semi-a/b/c (gesture-semi.mjs)
      if (grip === 'racchetta' && declared(id, cal)){ skipped++; continue; }
      n++;
      const r = readCard(src, id, { hand, cal, rate });
      const why = judgeCard(src, id, r, { hand, rate, allow: allowFor(id, rate), peakTol: 40 });
      if (id === 'serve' && r.msgs.length !== 2) why.push(`${r.msgs.length} messaggi (attesi 2)`);
      if (why.length) bad.push(`${grip} ${id} ${hand} cal=${cal} ×${rate}: ${why.join('; ')}`);
    }
  }
  // tutte le letture tranne le 18 dei limiti dichiarati (3 schede × 2 mani × 3 velocità, solo racchetta e braccio simulato)
  assert.equal(skipped, GRIPS.includes('racchetta') ? 18 : 0);
  assert.ok(n >= 400, `${n} letture`);
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
  // presa: le due viste ferme mostrano lo schermo o il dorso (non di taglio), con la presa a racchetta (viste proprie: dallo
  // schermo di gioco e di lato) e nel palmo
  for (const grip of ['racchetta', 'palmo']) for (const t of [1.5, 6]){ const cam = cameraAt('grip', t, { W: 640, H: 400, grip }), p = GP.gesturePose('grip', t, { grip }), n = GP.qrot(p.q, [0, 0, 1]);
    assert.ok(Math.asin(Math.abs(GP.dot(n, GP.norm(GP.sub(cam.eye, p.pos)))))/D >= 25, `presa ${grip} ${t}`); }
});

test('disegno: mano e avambraccio della presa nel palmo e a racchetta = scheletro gestureRig (polso fermo ~33°, dita sul vetro ≤ 8 mm); martello con il polso ≤ 35°; avambraccio che sfuma prima del gomito', () => {
  for (const grip of ['racchetta', 'palmo']) for (const id of ['forehand', 'serve', 'grip']) for (const hand of HANDS){
    const pose = GP.gesturePose(id, .9, { hand, grip, rig: true }), R = hand === 'left' ? { pos: GP.mirrorPos(pose.pos), q: GP.mirrorQ(pose.q) } : pose;
    const r = handRig(R, handFor(grip)), g = GP.gestureRig(R, { hand: 'right', grip });
    for (const [a, b] of [[r.W, g.wrist], [r.E, g.elbow], [r.thumb.pts[3], g.thumb.pts[3]], [r.fingers[2].pts[3], g.fingers[2].pts[3]]]) assert.ok(GP.len(GP.sub(a, b)) < 1e-12);
  }
  assert.ok(GP.fingersOverGlass() <= .008);
  // piega del polso: asse della mano (polso → nocca del medio) contro l'avambraccio
  for (const style of GRIPS){
    const H = handFor(style).def, axis = GP.norm(GP.sub(H.fingers[1].mcp, H.wrist)), bend = Math.acos(GP.dot(GP.norm(H.forearmDir), GP.mul(axis, -1)))/D;
    assert.ok(bend <= 35, `${style}: polso piegato di ${bend.toFixed(1)}°`);
  }
  // modalità compatta e martello (rollback): l'avambraccio sfuma prima del gomito; con la presa nel palmo fuori dalla
  // modalità compatta il braccio intero è la catena della posa (B13). Il martello si disegna con l'avambraccio rigido nella
  // sua direzione: la piega del polso disegnata è quella misurata qui sopra (revisione di fedeltà B13)
  assert.ok(FOREARM_SHOWN.to < .9 && FOREARM_SHOWN.from < FOREARM_SHOWN.to);
  const pm = GP.gesturePose('forehand', 1, { grip: 'martello' }), rm = handRig(pm, handFor('martello'));
  assert.ok(GP.len(GP.sub(rm.E, GP.add(rm.W, GP.mul(GP.qrot(pm.q, handFor('martello').forearmDir), GP.ARM.fore)))) < 1e-9, 'martello: avambraccio rigido con la mano');
  assert.equal(COMPACT_W, 320);
});

// Revisione tecnica (docs/b9/animazione-c.md §6): il test qui sopra confronta demo.pose(t) con gesturePose, ma non
// dimostrava che il DISEGNO usi demo.pose. Qui il disegno gira davvero in Node con un contesto 2D finto (accetta le
// chiamate, non dipinge): lo scheletro disegnato (info.figure.rig) è quello di gesturePose della mano scelta, e se
// demo.pose restituisce un'altra posa il disegno la segue (un disegno che calcolasse la posa per conto suo farebbe
// fallire questo test). Più la revisione artistica: etichette dei fantasmi che non saltano (prima fino a 200 px tra due
// fotogrammi), freccia del verso che non scatta al giro del ciclo, avambraccio mai di punta verso la camera.
function fakeDom(){
  let calls = 0;
  const ctx = () => new Proxy({}, {
    get(t, k){ if (k in t) return t[k]; calls++;
      if (k === 'measureText') return s => ({ width: String(s).length*6 });
      if (typeof k === 'string' && k.startsWith('create')) return () => ({ addColorStop(){} });
      return () => {}; },
    set(t, k, v){ t[k] = v; return true; },
  });
  const canvas = () => ({ width: 0, height: 0, style: {}, className: '', isConnected: true, offsetParent: {}, getContext: ctx, remove(){} });
  const had = 'document' in globalThis, prev = globalThis.document;
  const raf = globalThis.requestAnimationFrame, caf = globalThis.cancelAnimationFrame;
  globalThis.document = { createElement: canvas, hidden: false };
  globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
  return { calls: () => calls, restore: () => {
    if (had) globalThis.document = prev; else delete globalThis.document;
    globalThis.requestAnimationFrame = raf; globalThis.cancelAnimationFrame = caf;
    if (!raf) delete globalThis.requestAnimationFrame; if (!caf) delete globalThis.cancelAnimationFrame;
  } };
}
const close3 = (a, b) => GP.len(GP.sub(a, b)) < 1e-9;
const inPoly = (P, q) => { let k = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++){ const a = P[i], b = P[j]; if ((a.y > q.y) !== (b.y > q.y) && q.x < (b.x - a.x)*(q.y - a.y)/(b.y - a.y) + a.x) k = !k; } return k; };

test('il disegno usa la posa di demo.pose (= gesturePose): scheletro disegnato uguale, e se demo.pose cambia il disegno la segue', () => {
  const dom = fakeDom();
  try {
    const d = new NatpfGestureDemo({ width: 640, height: 400 });
    assert.equal(d.available, true);
    for (const hand of HANDS) for (const id of ['forehand', 'serve', 'smash', 'volley', 'grip']){
      d.play(id, { hand }); d.stop();
      for (const t of [0, .5, d.hitTime() || 1, d.cycle()*.8]){
        d.show(t);
        const p = GP.gesturePose(id, t, { hand }), R = hand === 'left' ? { pos: GP.mirrorPos(p.pos), q: GP.mirrorQ(p.q) } : p;
        const r = handRig(R, handFor());
        assert.ok(close3(d.info.figure.rig.W, r.W) && close3(d.info.figure.rig.fingers[1].pts[3], r.fingers[1].pts[3]), `${id} ${hand} ${t}: scheletro disegnato diverso da gesturePose`);
      }
    }
    // posa sostituita: il disegno la segue
    d.play('forehand', { hand: 'right' }); d.stop();
    const other = GP.gesturePose('backhand', 1.1);
    d.pose = () => other;
    d.show(.4);
    assert.ok(close3(d.info.figure.rig.W, handRig(other, handFor()).W), 'il disegno non segue demo.pose');
    assert.ok(dom.calls() > 100);
  } finally { dom.restore(); }
});

// B17.1 passo B3 (decisione dell'utente del 09/11 notte: «Per il rovescio, a una mano»; nel passo B2 era a due mani come nel
// video): GESTURES.backhand non ha più twoHanded e la mano libera non va mai sul telefono; dal contatto alla fine
// dell'accompagnamento il braccio libero si apre dietro e di lato per l'equilibrio, quasi disteso; fuori dal colpo pende
// rilassato lungo il fianco
test('rovescio a una mano: niente seconda mano sul telefono (≥ 20 cm in tutto il ciclo), braccio libero aperto dietro dal contatto alla fine, destro e mancino; a riposo pende', async () => {
  const { GESTURES } = await import('../src/natpf/natpf_gesture_motion.js');
  assert.equal(GESTURES.backhand.twoHanded, undefined, 'rovescio ancora a due mani');
  assert.equal(GESTURES.backhand.balance, true);
  const dom = fakeDom();
  try {
    const d = new NatpfGestureDemo({ width: 640, height: 400 });
    d.grip = 'racchetta';
    for (const hand of HANDS){
      d.play('backhand', { hand, set: 'video' }); d.stop();
      const P = GP.gesturePlan('backhand', { grip: 'racchetta', set: 'video' }), T = P.T;
      let n = 0, near = 9, seen = 0;
      for (let t = 0; t < P.total; t += 1/60){
        d.show(t);
        const A = d.info.freeArm, R = hand === 'left' ? GP.mirrorPose(d.info.pose) : d.info.pose;
        near = Math.min(near, GP.len(GP.sub(A.W, R.pos)));
        if (t < P.contact + .25 || t > T.back) continue;
        // dal contatto (+0,25 s) alla fine: mano libera dietro il bacino (riferimento del busto, +z dietro), a sinistra, quasi distesa
        const ch = R.chain, loc = GP.qrot(GP.qconj(ch.trunk), GP.sub(A.W, ch.pelvis));
        assert.ok(A.busy && loc[2] > .2 && loc[0] < -.3, `${hand} ${t.toFixed(3)}: braccio libero non aperto dietro (${loc.map(v => v.toFixed(2))})`);
        assert.ok(GP.len(GP.sub(A.W, A.S)) > .4, `${hand} ${t.toFixed(3)}: braccio libero piegato`);
        // passo C2: la mano libera si VEDE (fuori dalla sagoma del busto della camera frontale; prima restava dietro il busto)
        if (!inPoly(d.info.body.torso, d.info.cam.p(A.W))) seen++;
        n++;
      }
      // (correzioni del passo B3: il rovescio è lo specchio del dritto, accompagnamento di 0,34 s come il dritto: 15 campioni)
      assert.ok(n >= 12, `solo ${n} campioni nell'accompagnamento`);
      assert.ok(seen >= .8*n, `${hand}: mano libera in vista solo in ${seen}/${n} campioni dell'accompagnamento`);
      assert.ok(near >= .2, `${hand}: mano libera a ${near.toFixed(3)} m dal telefono`);
      // posizione di partenza: braccio libero rilassato (quasi disteso, mano sotto il bacino di lato), non sul fianco
      d.show(.1);
      const A = d.info.freeArm, R = hand === 'left' ? GP.mirrorPose(d.info.pose) : d.info.pose;
      assert.equal(A.busy, false);
      const reach = GP.len(GP.sub(A.W, A.S));
      assert.ok(reach > .5, `braccio libero a riposo piegato (${reach.toFixed(3)} m dalla spalla)`);
      assert.ok(A.W[1] < R.chain.pelvis[1] - .05, 'mano libera a riposo non sotto il bacino');
    }
  } finally { dom.restore(); }
});

// B17.1 passo C2 (richiesta dell'utente del 09/11 notte: «con il dritto la pallina venga colpita con il display in maniera
// frontale, il rovescio invece stesso movimento ma con l'altro lato»): da 640×400 in su, dal contatto e per circa un secondo
// del gesto, il primo piano dell'impatto mostra la faccia che colpisce dalla parte della palla con la scritta giusta; la faccia
// che colpisce guarda anche la camera principale; il riquadro sta nello stadio sopra la banda, non copre telefono né palla vivi
// all'impatto, ed è lo specchio per il mancino; a 448×280 non c'è (lì il telefono all'impatto è lungo 72–99 px)
test('primo piano dell’impatto: schermo nei colpi di dritto, dorso nei rovesci, dal contatto per un secondo, destro e mancino; non a 448×280', () => {
  const dom = fakeDom();
  try {
    const d = new NatpfGestureDemo({ width: 640, height: 400 });
    d.grip = 'racchetta';
    for (const id of Object.keys(GP.IMPACT_FACE)){
      const rects = {};
      for (const hand of HANDS){
        d.setSize(640, 400); d.play(id, { hand, set: 'video' }); d.stop();
        const P = GP.gesturePlan(id, { grip: 'racchetta', set: 'video' });
        d.show(P.contact);
        const C = d.info.close, tag = `${id} ${hand}`;
        assert.ok(C && C.alpha > .99, `${tag}: primo piano assente all'impatto`);
        assert.equal(C.text, GP.IMPACT_FACE[id] > 0 ? 'Palla sullo SCHERMO' : 'Palla sul DORSO', tag);
        assert.ok(C.faceToClose < 60, `${tag}: faccia che colpisce a ${C.faceToClose.toFixed(0)}° dalla camera del primo piano`);
        assert.ok(C.faceToMain < 75, `${tag}: faccia che colpisce a ${C.faceToMain.toFixed(0)}° dalla camera principale`);
        const r = C.rect;
        assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= 640 && r.y + r.h <= 400*(1 - .17), `${tag}: riquadro fuori dallo stadio`);
        const R = hand === 'left' ? GP.mirrorPose(d.info.pose) : d.info.pose, cam = d.info.cam, inR = q => q.x > r.x && q.x < r.x + r.w && q.y > r.y && q.y < r.y + r.h;
        for (const v of [[0, 0, 0], [0, GP.PHONE.h/2, 0], [0, -GP.PHONE.h/2, 0]]) assert.ok(!inR(cam.p(GP.add(R.pos, GP.qrot(R.q, v)))), `${tag}: il riquadro copre il telefono`);
        if (d.info.ball) assert.ok(!inR(cam.p(d.info.ball)), `${tag}: il riquadro copre la palla`);
        rects[hand] = r;
        for (const t of [P.contact - .2, P.contact + 1.05]){ d.show(t); assert.ok(!d.info.close || d.info.close.alpha < .01, `${tag}: primo piano visibile a ${t.toFixed(2)} s`); }
        d.show(P.contact + .6); assert.ok(d.info.close.alpha > .99, `${tag}: primo piano spento a 0,6 s dal contatto`);
        d.setSize(448, 280); d.show(P.contact); assert.equal(d.info.close, null, `${tag}: primo piano a 448×280`);
      }
      assert.ok(Math.abs(rects.left.x - (640 - rects.right.x - rects.right.w)) < 1 && rects.left.y === rects.right.y, `${id}: riquadro del mancino non speculare`);
    }
    // nessun primo piano nei colpi senza faccia d'impatto
    for (const id of ['serve', 'lob', 'drop', 'smash']){ d.setSize(640, 400); d.play(id, { set: 'video' }); d.stop(); d.show(d.hitTime()); assert.equal(d.info.close, null, id); }
  } finally { dom.restore(); }
});

// B13 (correzioni dopo le revisioni): dritto, piatto, rovescio, incrociato e lungolinea hanno la camera che segue la mano
// (il braccio percorre più di quanto la metà dello schermo inquadra). Lì l'etichetta deve restare attaccata al suo
// fantasma: si misura la sua posizione rispetto alla proiezione del telefono del fantasma (con la camera ferma è la stessa
// cosa della posizione sullo schermo); ammessi 2 px di deriva per la prospettiva della camera che si sposta
test('etichette dei fantasmi ferme sul proprio fantasma (nessun salto, anche con la camera che segue); freccia del verso spenta al giro del ciclo', () => {
  const dom = fakeDom();
  try {
    const d = new NatpfGestureDemo({ width: 640, height: 400 });
    for (const id of ['forehand', 'backhand', 'slice', 'drop', 'volley', 'flat', 'cross', 'line']){
      d.play(id); d.stop();
      const P = GP.gesturePlan(id), prev = new Map(), follow = !!GP.camSpec(id, P.set).follow;
      let worst = 0;
      for (let t = 0; t < P.total; t += 1/60){
        d.show(t);
        for (const g of d.info.ghosts || []){
          if (!g.labelBox) continue;
          const o = follow ? d.info.cam.p(GP.gesturePose(id, g.k.t).pos) : { x: 0, y: 0 }, b = { x: g.labelBox.x0 - o.x, y: g.labelBox.y0 - o.y };
          const a = prev.get(g.i); if (a) worst = Math.max(worst, Math.hypot(b.x - a.x, b.y - a.y)); prev.set(g.i, b);
        }
      }
      assert.ok(worst < (follow ? 2 : .5), `${id}: etichetta che salta di ${worst.toFixed(1)} px`);
    }
  } finally { dom.restore(); }
  const src = readFileSync(new URL('../src/natpf/natpf_gesture_demo.js', import.meta.url), 'utf8');
  assert.match(src, /vis = 1 - sstep\(P\.T\.back, P\.T\.home, t\);/);
});

test('camere: l\'avambraccio non punta mai verso la camera (≥ 28° dal raggio visivo, oggi ≥ 30°; prima il servizio e la schiacciata scendevano a 1° e 5°: «palla di pelle» sotto il telefono)', () => {
  for (const id of GP.POSE_IDS){
    const P = GP.gesturePlan(id);
    if (P.still) continue;
    let worst = 90;
    for (let t = 0; t < P.total; t += 1/60){
      const r = handRig(GP.gesturePose(id, t), handFor()), cam = cameraAt(id, t, { W: 640, H: 400 });
      const F = GP.norm(GP.sub(r.E, r.W)), v = GP.norm(GP.sub(cam.eye, r.W));
      worst = Math.min(worst, 90 - Math.asin(Math.min(1, Math.abs(GP.dot(F, v))))/D);
    }
    assert.ok(worst >= 28, `${id}: avambraccio a ${worst.toFixed(0)}° dal raggio visivo`);
  }
});
