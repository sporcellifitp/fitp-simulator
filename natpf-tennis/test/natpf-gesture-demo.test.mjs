// Il tutorial mostra solo gesti che il gioco riconosce davvero. Ogni animazione 3D (natpf_gesture_demo.js) usa i moti
// di natpf_gesture_motion.js; qui gli STESSI moti muovono il braccio simulato (arm-sim.mjs) con il telefono simulato
// completo (rilevatore, filtro d'orientamento, calibrazione della pagina del telefono e mappatura del gioco). Per ogni
// gesto, mano destra e sinistra, varie inclinazioni della presa: il colpo riconosciuto deve essere quello mostrato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { armSwing, grip, palmGrip, photoGrip, STROKES } from './arm-sim.mjs';
import { simPhone } from './phone-sim.mjs';
import { GESTURES, strokeFor, strokePose, strokeTimeline, serveTimeline, tossBall, mirrorStroke, GRIP_TILT, GRIP_POSE } from '../src/natpf/natpf_gesture_motion.js';

// Presa nel pugno con il display di lato (grip): a 80° dalla verticale è l'impugnatura a martello di riferimento (29/10),
// a 15–45° quella in piedi di prima; inward: display verso l'interno invece che verso l'esterno. palm: base nel palmo con
// lo schermo in alto. playTilt: la presa in gioco, se diversa da quella della calibrazione (il telefono scivola)
function player(hand, { tilt = GRIP_TILT, playTilt = null, seed = 7, palm = false, inward = false, photo = null } = {}){
  const p = simPhone({ seed, shape: true, hand });
  if (photo) photoGrip(p, { ...photo, hand });
  else if (palm) palmGrip(p, { tilt }); else grip(p, { tilt, side: (hand === 'left' ? -1 : 1)*(inward ? -1 : 1) });
  // calibrazione: «L» è il gesto da destra a sinistra (dritto del destro, rovescio del mancino)
  const cal = w => hand === 'left' ? mirrorStroke(w === 'L' ? STROKES.rovescio : STROKES.dritto) : (w === 'L' ? STROKES.dritto : STROKES.rovescio);
  p.calibrate({ armGesture: w => armSwing(p, cal(w)) });
  if (playTilt != null){ p.pose([1, 0, 0], -(playTilt - tilt)); p.rest(500, 4); }
  return p;
}
function play(p, g, hand){
  if (g.preYaw) p.pose([0, 1, 0], hand === 'left' ? -g.preYaw : g.preYaw, 60), p.rest(200, 2);
  const b = p.msgs.length;
  armSwing(p, { ...strokeFor(g.stroke, hand), back: !g.short });
  p.rest(900, 4);
  const out = p.msgs.slice(b).map(d => p.game(d, { ballHigh: !!g.ballHigh }));
  if (g.preYaw) p.pose([0, 1, 0], hand === 'left' ? g.preYaw : -g.preYaw, 60), p.rest(300, 2);
  return out;
}
const SHOTS = ['forehand', 'backhand', 'flat', 'volley', 'lob', 'drop', 'slice', 'smash', 'cross', 'line'];

test('tutorial: ogni gesto animato è riconosciuto dal gioco come il colpo mostrato (destro e mancino, impugnatura a martello con la cima da 20° sopra a 15° sotto l\'orizzontale, display fuori o dentro)', () => {
  for (const hand of ['right', 'left']) for (const tilt of [70, GRIP_TILT, 90, 105]) for (const inward of [false, true]) for (const id of SHOTS){
    const g = GESTURES[id], p = player(hand, { tilt, inward });
    // mira: prima tre colpi normali (centro del piatto abituale), come in partita
    if (g.expect.aim) for (let i = 0; i < 3; i++) play(p, GESTURES.forehand, hand);
    const out = play(p, g, hand), tag = `${hand}, presa ${tilt}°${inward ? ' display dentro' : ''}, ${g.label}`;
    assert.equal(out.length, 1, `${tag}: ${out.length} colpi`);
    const ev = out[0].ev, shot = ev.natpf.shot;
    assert.ok(g.expect.shot.includes(shot), `${tag}: riconosciuto «${shot}»`);
    if (g.expect.side) assert.equal(ev.side ?? ev.natpf.side, g.expect.side, `${tag}: lato`);
    // mira nel riferimento del giocatore: il mancino incrocia dall'altra parte
    if (g.expect.aim){ const want = g.expect.aim*(hand === 'left' ? -1 : 1); assert.ok(ev.natpf.wrist*want > .4, `${tag}: mira ${ev.natpf.wrist}`); }
  }
});

// Presa insegnata dal 04/11 (foto dell'utente, GRIP_POSE.palmo): nel palmo con lo schermo verso chi gioca, la cima verso
// l'interno di 20–50° e in avanti di 25–55°. Prima del 04/11 il piatto della dimostrazione (asse perfettamente orizzontale)
// era letto come top spin con la cima molto verso l'interno: ora è «il dritto, ma più veloce»
test('presa nel palmo della foto (04/11): ogni gesto animato è riconosciuto come il colpo mostrato (destro e mancino, cima 20–50° verso l\'interno e 25–55° in avanti)', () => {
  const { lean, tilt } = GRIP_POSE.palmo;
  assert.deepEqual([lean, tilt], [35, 40]);
  for (const hand of ['right', 'left']) for (const L of [20, lean, 50]) for (const T of [25, tilt, 55]) for (const id of SHOTS){
    const g = GESTURES[id], p = player(hand, { photo: { lean: L, tilt: T } });
    if (g.expect.aim) for (let i = 0; i < 3; i++) play(p, GESTURES.forehand, hand);
    const out = play(p, g, hand), tag = `${hand}, palmo ${L}°/${T}°, ${g.label}`;
    assert.equal(out.length, 1, `${tag}: ${out.length} colpi`);
    const ev = out[0].ev;
    assert.ok(g.expect.shot.includes(ev.natpf.shot), `${tag}: riconosciuto «${ev.natpf.shot}»`);
    if (g.expect.side) assert.equal(ev.side ?? ev.natpf.side, g.expect.side, `${tag}: lato`);
    if (g.expect.aim){ const want = g.expect.aim*(hand === 'left' ? -1 : 1); assert.ok(ev.natpf.wrist*want > .4, `${tag}: mira ${ev.natpf.wrist}`); }
  }
});

// Richiesta del 29/10: «il telefono in mano non rimane mai fisso nell'impugnatura verticale, tende a inclinarsi in
// avanti». Nei registri, prima dei colpi, il telefono era inclinato di 30–90° dalla verticale. Stessi gesti con la cima
// del telefono molto in avanti, e con la presa che cambia tra la calibrazione e il gioco
// prese di prima: in piedi nel pugno (display di lato, 15–75°) e base nel palmo con lo schermo in alto (50–80°)
test('prese di prima (in piedi nel pugno fino a 75°, anche diversa da quella della calibrazione; base nel palmo): ogni gesto resta il colpo mostrato', () => {
  for (const hand of ['right', 'left']) for (const tilt of [50, 65, 80]) for (const id of SHOTS){
    const g = GESTURES[id], p = player(hand, { tilt, palm: true });
    if (g.expect.aim) for (let i = 0; i < 3; i++) play(p, GESTURES.forehand, hand);
    const out = play(p, g, hand), tag = `${hand}, base nel palmo ${tilt}°, ${g.label}`;
    assert.equal(out.length, 1, `${tag}: ${out.length} colpi`);
    assert.ok(g.expect.shot.includes(out[0].ev.natpf.shot), `${tag}: riconosciuto «${out[0].ev.natpf.shot}»`);
  }
  for (const [tilt, playTilt] of [[15, null], [30, null], [45, null], [60, null], [75, null], [30, 65], [60, 30]]) for (const hand of ['right', 'left']) for (const id of SHOTS){
    const g = GESTURES[id], p = player(hand, { tilt, playTilt });
    if (g.expect.aim) for (let i = 0; i < 3; i++) play(p, GESTURES.forehand, hand);
    const out = play(p, g, hand), tag = `${hand}, presa ${tilt}°${playTilt != null ? ` → ${playTilt}° in gioco` : ''}, ${g.label}`;
    assert.equal(out.length, 1, `${tag}: ${out.length} colpi`);
    const ev = out[0].ev;
    assert.ok(g.expect.shot.includes(ev.natpf.shot), `${tag}: riconosciuto «${ev.natpf.shot}»`);
    if (g.expect.side) assert.equal(ev.side ?? ev.natpf.side, g.expect.side, `${tag}: lato`);
    if (g.expect.aim){ const want = g.expect.aim*(hand === 'left' ? -1 : 1); assert.ok(ev.natpf.wrist*want > .4, `${tag}: mira ${ev.natpf.wrist}`); }
  }
});

test('tutorial: il servizio animato sono due gesti (lancio e battuta) e il telefono li manda entrambi', () => {
  for (const hand of ['right', 'left']) for (const photo of [null, { lean: GRIP_POSE.palmo.lean, tilt: GRIP_POSE.palmo.tilt }]){
    const p = player(hand, { photo }), g = GESTURES.serve;
    p.det.setContext('serve');
    const b = p.msgs.length;
    armSwing(p, { ...strokeFor(g.toss, hand), back: false }); p.rest(250, 3);
    armSwing(p, { ...strokeFor(g.stroke, hand), back: false }); p.rest(900, 3);
    assert.equal(p.msgs.length - b, g.expect.messages, `${hand}${photo ? ' palmo' : ''}: ${p.msgs.length - b} messaggi`);
  }
  const st = serveTimeline();
  assert.ok(st.apex > st.toss.hit && st.apex < st.total, 'la palla è in cima durante la battuta');
  assert.ok(tossBall(st.apex, st) > tossBall(st.toss.hit + .1, st), 'la palla sale fino alla battuta');
});

test('animazione: direzione del movimento della mano come nel gesto vero (destro e specchio per il mancino)', () => {
  const path = (id, hand) => {
    const g = GESTURES[id], tl = strokeTimeline(strokeFor(g.stroke, hand));
    return [strokePose(g.stroke, tl.prep + .001, { hand }).hand, strokePose(g.stroke, tl.swing, { hand }).hand];
  };
  for (const hand of ['right', 'left']){
    const m = hand === 'left' ? -1 : 1;
    let [a, b] = path('forehand', hand);
    assert.ok((b[0] - a[0])*m < -.2, `${hand} dritto: verso l'interno`); assert.ok(b[2] < a[2] - .3, `${hand} dritto: in avanti`);
    [a, b] = path('backhand', hand); assert.ok((b[0] - a[0])*m > .2, `${hand} rovescio: verso l'esterno`);
    [a, b] = path('lob', hand); assert.ok(b[1] > a[1] + .2, `${hand} pallonetto: la mano sale`);
    for (const id of ['drop', 'slice', 'smash']){ [a, b] = path(id, hand); assert.ok(b[1] < a[1] - .1, `${hand} ${id}: la mano scende`); }
  }
  // la palla corta è più lenta e più corta del tagliato
  assert.ok(GESTURES.drop.stroke.peak < GESTURES.slice.stroke.peak*.6);
});
