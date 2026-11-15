// B48 · un servizio con delle scelte (miglioramento 10 del rapporto B16, docs/b16/rapporto-gameplay.md). Con il telefono
// il momento del colpo rispetto al punto più alto del lancio sceglie la direzione: prima del punto più alto la palla va
// verso il centro (alla «T»), dopo verso l'esterno (larga), al punto più alto al centro del quadrato. Profondità, forza ed
// effetto restano quelli di prima; webcam, mouse e tastiera come prima (hanno la loro mira). La regola è uguale per destri
// e mancini, per il Player 1 e per il Player 2; la dicono la scheda «Servizio» del tutorial, la guida «Come si gioca» e,
// ai primi servizi, il grande schermo sotto «Colpisci!».
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { SERVE, serveOutcome, serveThird, serveChoiceRules, serveChoiceOf } from '../src/natpf/natpf_stroke_outcome.js';
import { GESTURES, SERVE_CHOICE, serveTimeline } from '../src/natpf/natpf_gesture_motion.js';
import { serveCoachView, SERVE_COACH } from '../src/natpf/natpf_serve_coach.js';
import { GUIDE, guideText } from '../src/natpf/natpf_onboarding.js';
import { bench } from '../scripts/audit/servizio.mjs';

const DT = 1/120;
const seeded = (seed, fn) => { const real = Math.random; Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = real; } };
// servizio insegnato dal telefono con la forma (salita −0,08, piano 0,5), forza power
const intentOf = (power = .6) => ({ shot: 'topspin', power, depth: power, rise: -.08, plane: .5, face: 0 });
const phoneServe = ({ power = .6, hand = 'right' } = {}) => ({ source: 'natpf-phone', side: 'overhead', shotType: 'topspin', speed: .8 + power*.85, dirX: 0, hand,
  natpf: { aim: 'swing', shot: 'topspin', intent: intentOf(power), power, latency: 0, hand } });

test('B48: regola del servizio dal telefono (serveOutcome): prima del punto più alto alla «T», dopo largo, al punto più alto al centro; nei due quadrati', () => {
  for (const box of [-1, 1]){
    const at = tau => serveOutcome({ intent: intentOf(), tau, boxSign: box, choice: true });
    const T = at(SERVE.choiceTau), W = at(-SERVE.choiceTau), C = at(0);
    assert.equal(T.dir, 'T'); assert.equal(W.dir, 'largo'); assert.equal(C.dir, 'corpo');
    for (const o of [T, W, C]) assert.equal(Math.sign(o.x), box, 'nel quadrato giusto');
    assert.ok(Math.abs(Math.abs(T.x) - (SERVE.boxCenter - SERVE.choiceReach)) < 1e-9 && Math.abs(Math.abs(W.x) - (SERVE.boxCenter + SERVE.choiceReach)) < 1e-9, `${T.x} ${W.x}`);
    assert.ok(Math.abs(Math.abs(C.x) - SERVE.boxCenter) < 1e-9);
    assert.equal(T.aim, 1); assert.equal(W.aim, -1); assert.equal(C.aim, 0);
    // dentro la finestra «perfetto»: la scelta piena non costa qualità
    assert.equal(T.q, 1); assert.equal(W.q, 1);
    // più presto → più verso la riga centrale (monotono)
    let prev = Infinity;
    for (let tau = -.15; tau <= .1501; tau += .01){ const a = Math.abs(at(+tau.toFixed(3)).x); assert.ok(a <= prev + 1e-9, `${tau}: ${a} dopo ${prev}`); prev = a; }
    // colpito molto fuori tempo il servizio torna lento e centrale (non un servizio largo che fa correre la CPU)
    const late = at(-.55), early = at(.42);
    assert.ok(Math.abs(Math.abs(late.x) - SERVE.boxCenter) < .05 && late.q < .6, JSON.stringify(late));
    assert.ok(Math.abs(early.x) < SERVE.boxCenter && early.q < .7, JSON.stringify(early));
  }
});

test('B48: la scelta cambia solo la direzione: profondità, velocità, effetto e voto restano quelli di prima', () => {
  for (const power of [.3, .6, .9]) for (const tau of [.15, .05, 0, -.1, -.15, -.3]) for (const box of [-1, 1]){
    const ref = { rise: -.08, plane: .55, power: .5, n: 4 };
    const a = serveOutcome({ intent: intentOf(power), tau, boxSign: box, ref, choice: true }), b = serveOutcome({ intent: intentOf(power), tau, boxSign: box, ref });
    for (const k of ['depth', 'flight', 'topspin', 'sidespin', 'kind', 'q', 'pace', 'strong', 'grade']) assert.deepEqual(a[k], b[k], `${k} con forza ${power}, tempo ${tau}`);
    assert.equal(b.aim, null); assert.equal(a.dir, serveThird(a.x));
  }
  // prove di confronto: spenta, è la regola di prima anche con choice
  serveChoiceRules.off = true;
  try { assert.deepEqual(serveOutcome({ intent: intentOf(), tau: .15, boxSign: -1, choice: true }), serveOutcome({ intent: intentOf(), tau: .15, boxSign: -1 })); }
  finally { serveChoiceRules.off = false; }
});

// servizio nel motore vero: chi batte (P1 contro la CPU o P2 dello stesso schermo) colpisce tau s prima del punto più alto;
// restituisce l'esito del servizio e il punto dove la palla rimbalza davvero
function engineServe({ who = 'p1', tau, deuce = true, evt = phoneServe(), difficulty = 'casual' }){
  return seeded(21, () => {
    const p2 = who === 'p2', e = createHeadlessEngine({ difficulty: p2 ? '1v1' : difficulty });
    e.startNewMatch({ showStartBanner: false });
    if (p2){ e.startSplit(); e.isMultiplayer = true; e.natpfP2Hand = evt.hand || 'right'; }
    e.score.server = p2 ? 'opponent' : 'player'; e.score.deuceSide = deuce; e._setupPointServe({ showBanner: false });
    p2 ? e._handleP2TossInput({}) : e._handleUserTossInput({});
    for (let i = 0; i < 400 && e.phase === 'SERVE_TOSS' && e.ball.vel.y/9.15 > tau; i++) e.step(DT);
    p2 ? e._handleP2SwingInput(evt) : e._handleUserSwingInput(evt);
    assert.equal(e.phase, 'RALLY', 'il servizio è partito');
    const out = { serve: e.natpfLastServe, target: e.ball.targetLanding.clone(), bounce: null, kmh: e.ball.vel.length()*3.6 };
    for (let i = 0; i < 300 && !out.bounce; i++){ const b0 = e.ball.bounceCountOnCurrentSide; e.step(DT); if (b0 === 0 && e.ball.bounceCountOnCurrentSide === 1) out.bounce = { x: e.ball.pos.x, z: e.ball.pos.z }; }
    return out;
  });
}

test('B48: nel motore, Player 1 destro e mancino, nei due quadrati: prima del punto più alto il servizio rimbalza alla «T», dopo largo', () => {
  for (const hand of ['right', 'left']) for (const deuce of [true, false]){
    const evt = phoneServe({ hand }), box = deuce ? -1 : 1;
    const T = engineServe({ tau: .16, deuce, evt }), W = engineServe({ tau: -.16, deuce, evt }), C = engineServe({ tau: 0, deuce, evt });
    const tag = `${hand}, ${deuce ? 'parità' : 'vantaggio'}`;
    assert.equal(T.serve.dir, 'T', tag); assert.equal(W.serve.dir, 'largo', tag); assert.equal(C.serve.dir, 'corpo', tag);
    // dove rimbalza davvero (aria corretta come prima): nel quadrato giusto, nel terzo giusto
    for (const [o, want] of [[T, 'T'], [W, 'largo'], [C, 'corpo']]){
      assert.ok(o.bounce && Math.sign(o.bounce.x) === box && o.bounce.z < 0 && o.bounce.z > -6.4, `${tag}: rimbalzo ${JSON.stringify(o.bounce)}`);
      assert.equal(serveThird(o.bounce.x), want, `${tag}: rimbalzo ${o.bounce.x.toFixed(2)} (${want})`);
    }
    // profondità e velocità quelle del servizio a tempo (stessa forza): la scelta non toglie niente
    assert.ok(Math.abs(T.serve.depth - C.serve.depth) < 1e-9 && Math.abs(W.serve.depth - C.serve.depth) < 1e-9, tag);
  }
});

test('B48: Player 2 dello stesso schermo (secondo telefono): stessa regola nel suo riferimento, nei due quadrati, destro e mancino', () => {
  for (const hand of ['right', 'left']) for (const deuce of [true, false]){
    const evt = phoneServe({ hand }), tag = `P2 ${hand}, ${deuce ? 'parità' : 'vantaggio'}`;
    const T = engineServe({ who: 'p2', tau: .16, deuce, evt }), W = engineServe({ who: 'p2', tau: -.16, deuce, evt });
    assert.equal(T.serve.dir, 'T', tag); assert.equal(W.serve.dir, 'largo', tag);
    // il P2 serve nella metà di chi gioca (z positive), in diagonale; il quadrato è lo stesso per la «T» e per il largo
    for (const o of [T, W]) assert.ok(o.bounce && o.bounce.z > 0 && o.bounce.z < 6.4, `${tag}: ${JSON.stringify(o.bounce)}`);
    assert.equal(Math.sign(T.bounce.x), Math.sign(W.bounce.x), tag);
    assert.equal(serveThird(T.bounce.x), 'T', tag); assert.equal(serveThird(W.bounce.x), 'largo', tag);
  }
});

test('B48: webcam, mouse e tastiera restano come prima: la direzione viene dalla loro mira, non dal momento del colpo', () => {
  const mouse = dirX => ({ source: 'mouse', side: 'overhead', shotType: 'topspin', speed: 1.3, dirX });
  for (const deuce of [true, false]) for (const dirX of [-1, 0, 1]){
    const early = engineServe({ tau: .16, deuce, evt: mouse(dirX) }), late = engineServe({ tau: -.16, deuce, evt: mouse(dirX) });
    assert.equal(early.serve.aim, null); assert.equal(late.serve.aim, null);
    // stesso punto prima e dopo il punto più alto (la mira decide), e lo stesso della regola di prima
    assert.ok(Math.abs(early.serve.x - late.serve.x) < 1e-9, `${dirX}: ${early.serve.x} / ${late.serve.x}`);
    serveChoiceRules.off = true;
    try { assert.ok(Math.abs(engineServe({ tau: .16, deuce, evt: mouse(dirX) }).serve.x - early.serve.x) < 1e-9); }
    finally { serveChoiceRules.off = false; }
  }
  // la webcam «movimento» (motion_controls._motionSwing) manda anch'essa natpf.aim «swing», ma senza la forma del telefono
  // e con l'istante del colpo stimato: niente scelta, come prima
  const cam = { source: 'webcam', side: null, shotType: 'flat', speed: 1.3, dirX: 0, natpf: { aim: 'swing', latency: 0, wrist: 0, source: 'webcam', hand: 'right' } };
  assert.equal(serveChoiceOf(cam), false); assert.equal(serveChoiceOf(phoneServe()), true); assert.equal(serveChoiceOf({ source: 'mouse', dirX: 1 }), false);
  for (const deuce of [true, false]){
    const early = engineServe({ tau: .16, deuce, evt: cam }), late = engineServe({ tau: -.16, deuce, evt: cam });
    assert.equal(early.serve.aim, null); assert.ok(Math.abs(early.serve.x - late.serve.x) < 1e-9, `webcam: ${early.serve.x} / ${late.serve.x}`);
  }
});

test('B48: la regola è detta dove si impara il servizio: scheda «Servizio» del tutorial, grande schermo sotto «Colpisci!» (solo telefono)', () => {
  assert.ok(GESTURES.serve.cues.includes(SERVE_CHOICE), 'una riga della scheda «Servizio»');
  assert.match(SERVE_CHOICE, /Prima del punto più alto/); assert.match(SERVE_CHOICE, /centro/); assert.match(SERVE_CHOICE, /larga/);
  // la dimostrazione del tutorial batte nel colmo della palla: per la regola vera è un servizio al centro del quadrato
  const st = serveTimeline();
  assert.ok(st.apex > st.hitStart && st.apex < st.total);
  assert.equal(serveOutcome({ intent: intentOf(), tau: 0, boxSign: -1, choice: true }).dir, 'corpo');
  // grande schermo: «Colpisci!» con la regola sotto, ai primi servizi con il telefono; niente regola per webcam e mouse
  const g = { mine: true, phase: 'SERVE_TOSS', server: 'player', tossT: 0 };
  assert.deepEqual(serveCoachView({ served: 0 }, { ...g, controller: 'phone' }), { state: 'go', big: 'Colpisci!', sub: SERVE_CHOICE });
  for (const controller of ['webcam', 'mouse']) assert.equal(serveCoachView({ served: 0 }, { ...g, controller }).sub, '', controller);
  // lancio automatico dello stesso schermo: resta la sua scritta
  assert.equal(serveCoachView({ served: 0 }, { ...g, controller: 'phone', autoLive: 'toss' }).sub, 'Lancio automatico');
  // dopo i primi servizi niente scritte (come prima)
  assert.equal(serveCoachView({ served: SERVE_COACH.firstServes }, { ...g, controller: 'phone' }), null);
});

// B48.1 (revisione del B48): la riga della regola nella guida «Come si gioca» (natpf_onboarding.js, scheda «Il servizio»)
// non aveva un test unitario: la controllava solo la prova nel browser (tools/e2e/natpf-servizio-scelta.mjs)
test('B48.1: la guida «Come si gioca», scheda «Il servizio», dice la regola con il telefono (prima del punto più alto al centro, dopo larga); webcam e mouse no', () => {
  const step = GUIDE.find(s => s.id === 'serve'), text = c => guideText(step, c).replace(/<[^>]+>/g, '');
  assert.ok(step, 'la scheda «Il servizio» c\'è');
  assert.match(text('phone'), /prima del punto più alto la palla va al centro/i);
  assert.match(text('phone'), /dopo va larga/i);
  for (const c of ['webcam', 'mouse']) assert.doesNotMatch(text(c), /punto più alto|al centro|larga/i, c);
});

// B48.1 (revisione del B48): la scelta piena arriva dove arrivava il servizio «sulla riga» del B18 (choiceReach 1,625 m dal
// centro del quadrato, 0,44 m dentro il corridoio). Con 1,6 (2,5 cm meno) gli ace del servizio perfetto, forte ed esterno
// scendevano da 6,8% a 2,5% a Casual e da 6,8% a 3,8% a Pro (banco di scripts/audit/servizio.mjs, 2 semi × 200 punti;
// prima del B48 6,5% e 7,5%): la fascia misurata protegge la taratura, che è fragile
test('B48.1: servizio perfetto, forte ed esterno con il tempo (banco del servizio): ace nella fascia misurata a Casual e Pro', () => {
  for (const [difficulty, lo, hi] of [['casual', 5, 9.5], ['pro', 5, 10]]){
    const r = bench({ type: 'perfettoEsterno', difficulty, points: 200, seeds: [7, 11] });
    assert.ok(r.n >= 390, `${difficulty}: servizi ${r.n}`);
    assert.ok(r.ace >= lo && r.ace <= hi, `${difficulty}: ace ${r.ace}% (fascia ${lo}–${hi}%, choiceReach ${SERVE.choiceReach})`);
  }
});
