// Il tutorial mostra solo gesti che il gioco riconosce davvero. Ogni animazione 3D (natpf_gesture_demo.js) usa i moti
// di natpf_gesture_motion.js; qui gli STESSI moti muovono il braccio simulato (arm-sim.mjs) con il telefono simulato
// completo (rilevatore, filtro d'orientamento, calibrazione della pagina del telefono e mappatura del gioco). Per ogni
// gesto, mano destra e sinistra, varie inclinazioni della presa: il colpo riconosciuto deve essere quello mostrato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { armSwing, grip, STROKES } from './arm-sim.mjs';
import { simPhone } from './phone-sim.mjs';
import { GESTURES, strokeFor, strokePose, strokeTimeline, serveTimeline, tossBall, mirrorStroke, GRIP_TILT } from '../src/natpf/natpf_gesture_motion.js';

// playTilt: la presa in gioco, se diversa da quella della calibrazione (il telefono scivola in avanti nel palmo)
function player(hand, { tilt = GRIP_TILT, playTilt = null, seed = 7 } = {}){
  const p = simPhone({ seed, shape: true, hand });
  grip(p, { tilt, side: hand === 'left' ? -1 : 1 });
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

test('tutorial: ogni gesto animato è riconosciuto dal gioco come il colpo mostrato (destro e mancino, presa 15–45°)', () => {
  for (const hand of ['right', 'left']) for (const tilt of [15, 30, 45]) for (const id of SHOTS){
    const g = GESTURES[id], p = player(hand, { tilt });
    // mira: prima tre colpi normali (centro del piatto abituale), come in partita
    if (g.expect.aim) for (let i = 0; i < 3; i++) play(p, GESTURES.forehand, hand);
    const out = play(p, g, hand), tag = `${hand}, presa ${tilt}°, ${g.label}`;
    assert.equal(out.length, 1, `${tag}: ${out.length} colpi`);
    const ev = out[0].ev, shot = ev.natpf.shot;
    assert.ok(g.expect.shot.includes(shot), `${tag}: riconosciuto «${shot}»`);
    if (g.expect.side) assert.equal(ev.side ?? ev.natpf.side, g.expect.side, `${tag}: lato`);
    // mira nel riferimento del giocatore: il mancino incrocia dall'altra parte
    if (g.expect.aim){ const want = g.expect.aim*(hand === 'left' ? -1 : 1); assert.ok(ev.natpf.wrist*want > .4, `${tag}: mira ${ev.natpf.wrist}`); }
  }
});

// Richiesta del 29/10: «il telefono in mano non rimane mai fisso nell'impugnatura verticale, tende a inclinarsi in
// avanti». Nei registri, prima dei colpi, il telefono era inclinato di 30–90° dalla verticale. Stessi gesti con la cima
// del telefono molto in avanti, e con la presa che cambia tra la calibrazione e il gioco
test('presa inclinata in avanti fino a 75°, anche diversa da quella della calibrazione: ogni gesto resta il colpo mostrato', () => {
  for (const [tilt, playTilt] of [[60, null], [75, null], [30, 65], [60, 30]]) for (const hand of ['right', 'left']) for (const id of SHOTS){
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
  for (const hand of ['right', 'left']){
    const p = player(hand), g = GESTURES.serve;
    p.det.setContext('serve');
    const b = p.msgs.length;
    armSwing(p, { ...strokeFor(g.toss, hand), back: false }); p.rest(250, 3);
    armSwing(p, { ...strokeFor(g.stroke, hand), back: false }); p.rest(900, 3);
    assert.equal(p.msgs.length - b, g.expect.messages, `${hand}: ${p.msgs.length - b} messaggi`);
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
