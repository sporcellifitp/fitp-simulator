// Campo aperto (richiesta del 22/10 notte, fase C; docs/NATPF_RACCHETTA_VIRTUALE.md §6): l'esito del colpo di chi gioca
// copre tutto il campo in modo continuo, senza bersagli fissi, gradini o punti in cui le palle si accumulano; stesso
// ingresso, stesso esito; profondità controllabile; fuori e rete possibili; l'assistenza tiene dentro senza cambiare la
// direzione voluta. Movimento automatico: non si corre a rete se la palla non lo chiede; la posizione in cui il
// movimento porta il corpo non cambia la direzione.
import test from 'node:test';
import assert from 'node:assert/strict';
import { strokeOutcome, directionSpan, lateSpanOf, impactWindow, OUTCOME } from '../src/natpf/natpf_stroke_outcome.js';
import { ARC, skillLevel } from '../src/natpf/natpf_skill.js';
import * as THREE from 'three';
import * as NI from '../src/natpf/natpf_impact.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';

const SIDELINE = 4.115, BASELINE = 11.885;
// finestra in cui lo swing si gioca davvero (natpf_impact.js): in anticipo fino a early, in ritardo fino a lateExtra ×
// il lungolinea pieno (palla a 18 m/s)
function windowOf(difficulty){ const lv = skillLevel(difficulty), W = impactWindow(difficulty), late = lateSpanOf(18, lv); return { lv, late, from: -late*W.lateExtra, to: W.early }; }
const shotOf = (o = {}, lv) => strokeOutcome({ contact: 1, hitX: 1, quality: 1, contactY: 1, lateSpan: null, level: lv, ...o, intent: { shot: 'topspin', power: .7, depth: .7, rise: .3, face: 0, ...(o.intent || {}) } });
const steps = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a)*i/n);

test('direzione continua su tutta la finestra: ogni anticipo diverso dà una caduta diversa, in ordine (niente gradini né tetti)', () => {
  for (const difficulty of ['casual', 'pro', 'leggenda']){
    const { lv, late, from, to } = windowOf(difficulty);
    for (const contact of [1, -1]) for (const hitX of [-3, 0, 3]){
      const xs = steps(from, to, 120).map(timing => shotOf({ timing, lateSpan: late, contact, hitX }, lv).x);
      // in anticipo la palla va dalla parte opposta al lato del colpo (dritto del destro: verso sinistra)
      for (let i = 1; i < xs.length; i++) assert.ok(-contact*(xs[i] - xs[i - 1]) > 1e-4, `${difficulty} lato ${contact} da ${hitX}: ${xs[i - 1]} → ${xs[i]} a ${i}`);
      // ampiezza: almeno 6 m con il solo tempo (dal 23/10 da una riga all'altra: natpf-campo-aperto-23-10.test.mjs)
      assert.ok(Math.max(...xs) - Math.min(...xs) > 6, `${difficulty} ${contact} ${hitX}: ${Math.min(...xs)}…${Math.max(...xs)}`);
    }
  }
});

test('profondità controllabile e continua: cresce con la forza voluta, dalla riga del servizio alla riga di fondo', () => {
  const lv = skillLevel('pro');
  for (const shot of ['topspin', 'flat', 'slice']){
    const ds = steps(0, 1, 50).map(p => shotOf({ intent: { shot, power: p, depth: p, rise: shot === 'slice' ? -.4 : .2 } }, lv).depth);
    for (let i = 1; i < ds.length; i++) assert.ok(ds[i] > ds[i - 1], `${shot}: ${ds[i - 1]} → ${ds[i]}`);
    assert.ok(ds[0] < 6.5 && ds.at(-1) > 10.4 && ds.at(-1) < BASELINE, `${shot}: ${ds[0]}…${ds.at(-1)}`);
  }
  const drop = steps(0, 1, 20).map(p => shotOf({ intent: { shot: 'drop', power: p, depth: p, rise: -.4 } }, lv).depth);
  assert.ok(drop[0] < 2.5 && drop.at(-1) < 5, `palla corta ${drop[0]}…${drop.at(-1)}`);
  const lob = steps(0, 1, 20).map(p => shotOf({ intent: { shot: 'lob', power: p, depth: p, rise: .8 } }, lv).depth);
  assert.ok(lob[0] > 8 && lob.at(-1) < BASELINE, `pallonetto ${lob[0]}…${lob.at(-1)}`);
});

test('tutto il campo raggiungibile: ogni zona di 1 m × 1 m del campo avversario, da dove si colpisce', () => {
  const { lv, late, from, to } = windowOf('casual'), hit = new Set();
  for (const shot of ['topspin', 'slice', 'drop', 'lob', 'flat']) for (const contact of [1, -1]) for (const hitX of [-3, 0, 3])
    for (const timing of steps(from, to, 40)) for (const p of steps(0, 1, 10)) for (const face of [-1, 0, 1]){
      const o = shotOf({ timing, lateSpan: late, contact, hitX, intent: { shot, power: p, depth: p, face, rise: shot === 'lob' ? .8 : shot === 'slice' || shot === 'drop' ? -.4 : .2 } }, lv);
      if (!o.netFault && Math.abs(o.x) < SIDELINE && o.depth < BASELINE) hit.add(`${Math.floor(o.x + 4.115)}:${Math.floor(o.depth)}`);
    }
  const missing = [];
  for (let cx = 0; cx < 8; cx++) for (let cz = 2; cz < 11; cz++) if (!hit.has(`${cx}:${cz}`)) missing.push(`x ${(cx - 4.115).toFixed(1)}…, z ${cz}…${cz + 1}`);
  assert.deepEqual(missing, []);
});

test('nessuna concentrazione artificiale: ingressi distribuiti in modo uniforme non mettono troppe palle nello stesso punto', () => {
  const { lv, late, from, to } = windowOf('pro'), cells = new Map();
  let n = 0;
  for (const contact of [1, -1]) for (const hitX of [-2.5, 0, 2.5]) for (const timing of steps(from, to, 60)) for (const p of steps(.2, 1, 16)) for (const face of [-.6, 0, .6]){
    const o = shotOf({ timing, lateSpan: late, contact, hitX, intent: { power: p, depth: p, face } }, lv);
    const k = `${Math.round(o.x*2)}:${Math.round(o.depth*2)}`; cells.set(k, (cells.get(k) || 0) + 1); n++;
  }
  const top = Math.max(...cells.values())/n;
  assert.ok(top < .02, `cella di 0,5 m più piena: ${(100*top).toFixed(2)}% di ${n} colpi`);
});

test('stessi ingressi, stesso esito (nessun caso)', () => {
  const lv = skillLevel('1v1'), o = { timing: .07, lateSpan: .09, contact: -1, hitX: 1.7, quality: .83, contactY: .9, intent: { power: .62, depth: .6, face: .2, rise: .35 } };
  assert.deepEqual(shotOf(o, lv), shotOf(o, lv));
});

test('fuori e in rete possibili: tempo molto sbagliato, qualità scarsa, palla bassissima', () => {
  const { lv, late, to, from } = windowOf('pro');
  const early = shotOf({ timing: to, lateSpan: late }, lv), lateOne = shotOf({ timing: from, lateSpan: late }, lv);
  assert.ok(Math.abs(early.x) > SIDELINE || Math.abs(lateOne.x) > SIDELINE, `ai bordi della finestra: ${early.x}, ${lateOne.x}`);
  const long = shotOf({ quality: .15 }, lv);
  assert.ok(long.failed && (long.depth > BASELINE || long.netFault), JSON.stringify(long));
  const net = shotOf({ timing: to, lateSpan: late, contactY: .3 }, lv);
  assert.equal(net.netFault, true);
});

test('a rete con il tempo nella finestra la palla passa la rete: la situazione non la manda in rete (23/10, sera; B17.4: colpo controllato, non più debole uguale per tutti)', () => {
  const lv = skillLevel('leggenda'), late = lateSpanOf(18, lv), Q = .55;        // sotto failQ di Leggenda (.63): in corsa sulla palla corta
  for (const o of [{ net: true, contactY: .4 }, { volley: true, hitZ: 4, contactY: .7 }, { volley: true, net: true, contactY: 1.1 }]){
    const s = shotOf({ ...o, quality: Q }, lv);
    // passa (niente rete né lunga): colpo controllato con la dispersione della qualità che manca (B17.4), in campo
    assert.ok(s.grade === 'PERFECT' && s.controlled && !s.failed && !s.weak && !s.netFault && s.depth < BASELINE && s.clear >= ARC.netY, JSON.stringify(s));
    assert.ok(s.spread > 0 && s.spread < .5, JSON.stringify(s));
  }
  // raggiunta all'ultimo (qualità sotto netQMin): resta la palla debole di prima, corta e alta
  const last = shotOf({ net: true, contactY: .4, quality: .4 }, lv), good = shotOf({ net: true, contactY: .4 }, lv);
  assert.ok(last.failed && last.weak && !last.netFault && last.depth <= OUTCOME.weakDepth && last.clear > good.clear + .5, JSON.stringify(last));
  // da fondo campo resta l'errore forzato (palla bassa: in rete)
  const back = shotOf({ quality: Q, contactY: .6 }, lv);
  assert.ok(back.failed && !back.weak && back.netFault, JSON.stringify(back));
  // a rete molto fuori tempo (oltre la finestra della direzione) resta l'errore
  const off = shotOf({ quality: Q, net: true, contactY: .4, timing: -1.6*late, lateSpan: late }, lv);
  assert.ok(off.grade !== 'PERFECT' && off.failed && !off.weak && off.netFault, JSON.stringify(off));
  // scambio lungo: la situazione da sola terrebbe la palla (.7), la pressione la porta sotto failQ: errore anche a rete
  const tired = shotOf({ quality: .7, pressure: .8, net: true, contactY: .4 }, lv);
  assert.ok(tired.failed && tired.pressured && !tired.weak && tired.netFault, JSON.stringify(tired));
  // stessa qualità totale, tutta dalla situazione: passa
  const same = shotOf({ quality: .56, net: true, contactY: .4 }, lv);
  assert.ok(same.controlled && !same.failed && !same.netFault, JSON.stringify(same));
});

test('l\'assistenza tiene dentro senza cambiare la direzione voluta: ordine delle direzioni uguale, palle dentro le righe', () => {
  const lv = skillLevel('casual'), span = directionSpan(lv);
  // dentro la finestra, con il piatto che spinge oltre la riga: assistita resta dentro, e più si spinge più va di lato
  const xs = steps(-1, 1, 40).map(face => shotOf({ timing: .9*span, intent: { face } }, lv));
  for (const o of xs) assert.ok(o.assisted && Math.abs(o.x) < SIDELINE && o.depth < BASELINE, JSON.stringify(o));
  // in ordine; a 3 decimali la curva dolce dell'assistenza arriva a 4 m e lì resta (sulla riga, mai oltre)
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i].x > xs[i - 1].x || (Math.abs(xs[i].x) >= 3.99 && xs[i].x === xs[i - 1].x), `${xs[i - 1].x} → ${xs[i].x}`);
  // la mira (direzione voluta) è la stessa con e senza assistenza; dentro le righe la caduta non cambia
  const calm = shotOf({ timing: .3*span }, lv), weak = shotOf({ timing: .3*span, quality: .35 }, lv);
  assert.equal(calm.aim, weak.aim); assert.equal(calm.assisted, true); assert.equal(weak.assisted, false);
  assert.ok(Math.abs(calm.x - weak.x) < 1e-9, `${calm.x} / ${weak.x}`);
});

test('il punto neutro segue la posizione della palla: da destra il colpo neutro cade più a destra che dal centro', () => {
  const lv = skillLevel('pro');
  const at = hitX => shotOf({ timing: 0, hitX }, lv).x;
  assert.ok(at(3) > at(0) + .8 && at(0) > at(-3) + .8, `${at(-3)} ${at(0)} ${at(3)}`);
  // da ogni posizione si arriva a tutte e due le righe dentro la finestra (con il tempo e il piatto)
  const { late, from, to } = windowOf('pro');
  for (const hitX of [-3.5, 0, 3.5]){
    const xs = [from, to].flatMap(timing => [-1, 1].map(face => shotOf({ timing, lateSpan: late, hitX, intent: { face } }, lv).x));
    assert.ok(Math.min(...xs) < -3 && Math.max(...xs) > 3, `da ${hitX}: ${xs}`);
  }
});

/* ---------- movimento automatico (natpf_impact.js) e direzione nel motore ---------- */
const DT = 1/120;
function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(17);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
// palla della CPU verso chi gioca, che si prepara con il piano d'intercetto
function cpuShot(e, { from = [-.5, 1, -11], to = [1.6, 8.5], flight = 1.05, topspin = 14, player = [.4, 11.7] } = {}){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 3;
  e.player.pos.set(player[0], 0, player[1]); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
  e.pendingUserSwing = null; e.ball.pos.set(...from);
  e._launchBallToTarget(e.ball.pos, new THREE.Vector3(to[0], 0, to[1]), flight, { topspin });
  e._natpfPlanPlayer();
  return e.natpfPlan;
}
const phoneSwing = (intent, { side = 'forehand' } = {}) => ({ source: 'natpf-phone', side, shotType: 'topspin', speed: .8 + intent.power*.85, dirX: 0,
  natpf: { aim: 'swing', shot: intent.shot, intent: { depth: intent.power, rise: .3, face: 0, ...intent }, power: intent.power, peak: 900, latency: 0, hand: 'right' } });
// gioca lo swing quando mancano «lead» secondi al punto d'impatto; si ferma al colpo
function play(e, swing, lead){
  for (let t = 0, sent = false; t < 4; t += DT){
    const ttc = NI.timeToContact(e, e.player);
    if (!sent && ttc != null && ttc <= lead){ e._handleUserSwingInput(swing); sent = true; }
    const before = e.ball.lastHitter; e.step(DT);
    if (before !== 'player' && e.ball.lastHitter === 'player') return { hit: true, target: e.player.targetPos.clone(), racket: e.natpfLastRacket, landing: e.ball.targetLanding.clone() };
    if (e.phase !== 'RALLY') break;
  }
  return { hit: false };
}

test('dal fondo, dopo il colpo, si torna in fondo: anche dopo un colpo forte e profondo (prima: a rete)', () => {
  for (const difficulty of ['casual', 'pro']) withEngine(difficulty, e => {
    // palla della CPU a metà campo: chi gioca entra un poco e attacca forte e profondo
    cpuShot(e, { to: [1.2, 8.2], player: [.4, 11.7] });
    const r = play(e, phoneSwing({ shot: 'topspin', power: .95 }), .04);
    assert.ok(r.hit, difficulty);
    assert.ok(r.target.z > 11, `${difficulty}: verso ${r.target.z.toFixed(2)} dopo un colpo da ${r.racket && JSON.stringify(r.racket.out)}`);
  });
});

test('recupero contestuale: in fondo se c\'è il tempo prima del colpo dell\'avversario, a rete solo se una palla corta ha portato lì e il tempo non basta', () => {
  const actor = { pos: { z: 3 }, maxSpeed: 9, targetPos: { set(x, y, z){ this.x = x; this.z = z; } } };
  // palla corta presa a 3 m dalla rete e risposta veloce: non c'è il tempo di tornare, si chiude a rete
  assert.equal(NI.recoverAfterShot(null, actor, { landingX: 1, flight: .7, contactZ: 3 }), 'net');
  assert.ok(actor.targetPos.z >= NI.PLAN.netZ - 1e-9 && actor.targetPos.z < 6, `${actor.targetPos.z}`);
  // stessa palla, risposta lenta (pallonetto): c'è il tempo, si torna in fondo
  assert.equal(NI.recoverAfterShot(null, actor, { landingX: 1, flight: 1.9, contactZ: 3 }), 'baseline');
  assert.ok(Math.abs(actor.targetPos.z - NI.PLAN.baseline) < 1e-9);
  // da metà campo e dal fondo sempre in fondo, di lato opposto a dove va la palla
  for (const contactZ of [7, 9, 11.5]){
    assert.equal(NI.recoverAfterShot(null, actor, { landingX: 3, flight: .8, contactZ }), 'baseline', `da ${contactZ}`);
    assert.ok(actor.targetPos.x < 0, `${actor.targetPos.x}`);
  }
  // Player 2 (metà campo con z negative): stesso criterio, specchiato
  const p2 = { ...actor, pos: { z: -3 }, targetPos: { set(x, y, z){ this.x = x; this.z = z; } } };
  assert.equal(NI.recoverAfterShot(null, p2, { landingX: 1, flight: .7, contactZ: -3 }), 'net');
  assert.ok(p2.targetPos.z < 0);
});

test('al volo solo quando conviene: a rete sì, da metà campo su una palla profonda si arretra e si gioca dopo il rimbalzo', () => {
  withEngine('pro', e => {
    assert.equal(cpuShot(e, { player: [.2, 4.6], to: [1.2, 9.5], flight: 1.1 }).kind, 'volley');
    assert.equal(cpuShot(e, { player: [.2, 8], to: [1.2, 10.5], flight: 1.1 }).kind, 'ground');
    assert.equal(cpuShot(e, { player: [.2, 11.7], to: [1.2, 9.5], flight: 1.1 }).kind, 'ground');
  });
});

test('la posizione in cui il movimento porta il corpo non cambia la direzione: conta il lato del gesto e dove è la palla', () => {
  // stessa palla, stesso dritto, stesso tempo; il corpo a destra o a sinistra della palla. Prima il lato veniva dalla
  // palla rispetto al corpo: con il corpo dall'altra parte la direzione si ribaltava
  const shot = bodyX => withEngine('pro', e => {
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1;
    e.player.pos.set(bodyX, 0, 11.4); e.player.vel.set(0, 0, 0);
    e.ball.pos.set(1, 1, 11); e.ball.vel.set(0, -1, 14);
    return e._natpfRacketShot({ ...phoneSwing({ shot: 'topspin', power: .7 }), natpfTau: .08, natpfLateSpan: .1 }, e.player, { lateral: .7, smash: false, running: 0 });
  });
  const a = shot(.3), b = shot(1.7);
  assert.equal(a.out.aim, b.out.aim);
  assert.ok(Math.abs(a.E - b.E) < 1e-9, `${a.E} / ${b.E}`);
  // il rovescio con lo stesso tempo va dall'altra parte
  const back = withEngine('pro', e => {
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1;
    e.player.pos.set(.3, 0, 11.4); e.ball.pos.set(1, 1, 11); e.ball.vel.set(0, -1, 14);
    return e._natpfRacketShot({ ...phoneSwing({ shot: 'topspin', power: .7 }, { side: 'backhand' }), natpfTau: .08, natpfLateSpan: .1 }, e.player, { lateral: .7, smash: false, running: 0 });
  });
  assert.ok(back.E > a.E + 2, `rovescio ${back.E}, dritto ${a.E}`);
});
