// B48 · difetto 16 del rapporto B16 (docs/b16/rapporto-gameplay.md, D16) controllato su tutti i percorsi: «palla passata»
// si giudica dove era la palla al momento del gesto (natpf_impact.ballAtGesture, B18), non dove è quando il messaggio
// arriva al computer. Il B18 lo provava per il Player 1 contro la CPU (natpf-b18-ritardo.test.mjs: Casual, Pro, Leggenda,
// 1v1). Qui: tutti i livelli di oggi (anche Bambini ed Evento, nati dopo), il Player 2 dello stesso schermo (secondo
// telefono sullo stesso computer), la catena intera con il ritardo dello schermo impostato dallo staff (il ritardo della
// rete più quello dello schermo, natpf_phone_racket.natpfSwingToEngine) e il pannello della diagnostica, che prima
// metteva il ritardo dello schermo solo nel primo telefono.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';
import { natpfSwingToEngine } from '../src/natpf/natpf_phone_racket.js';
import { NatpfDiag } from '../src/natpf/natpf_diag.js';

const DT = 1/240;
const LEVELS = ['casual', 'pro', 'leggenda', 'bambini', 'evento', '1v1'];
const seeded = (seed, fn) => { const real = Math.random; Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = real; } };
// dritto del telefono con la forma, che arriva al computer «lat» secondi dopo il picco
const swing = (lat, hand = 'right') => ({ source: 'natpf-phone', side: 'forehand', hand, shotType: ENGINE_SHOT.topspin, speed: 1.3, dirX: 0,
  natpf: { aim: 'swing', shot: 'topspin', intent: { shot: 'topspin', conf: .7, power: .6, depth: .6, rise: .3, face: 0 }, power: .6, peak: 1100, typical: 1100, angle: 90, latency: lat, hand } });

// palla verso chi gioca (volo «flight»: 0,6 s veloce, 0,85 s normale); il gesto ha il tempo «lead» (s dal punto d'impatto,
// negativo = dopo) e arriva «lat» secondi dopo. who: 'p1' contro la CPU (o nell'1v1) · 'p2' Player 2 dello stesso schermo
function attempt({ difficulty = 'pro', who = 'p1', lead, lat, flight, evt = null }){
  return seeded(17, () => {
    const e = createHeadlessEngine({ difficulty: who === 'p2' ? '1v1' : difficulty });
    e.startNewMatch({ showStartBanner: false });
    const p2 = who === 'p2', me = p2 ? e.opponent : e.player;
    if (p2){ e.startSplit(); e.isMultiplayer = true; e.natpfP2Hand = 'right'; }
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = p2 ? 'player' : 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 3;
    // la stessa palla per il P1 e, specchiata (x → −x, z → −z), per il P2
    const m = p2 ? -1 : 1;
    me.pos.set(1.2*m, 0, 11.6*m); me.targetPos.copy(me.pos); me.vel.set(0, 0, 0);
    e.ball.pos.set(-1*m, 1.3, -11.5*m);
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(1.9*m, 0, 8.8*m), flight, { topspin: 14 });
    p2 ? e._natpfPlanOpponent(e.opponent) : e._natpfPlanPlayer();
    const ev = evt || swing(lat), hitter = p2 ? 'opponent' : 'player';
    let sent = false;
    for (let t = 0; t < 4; t += DT){
      const ttc = NI.timeToContact(e, me);
      if (!sent && ttc != null && ttc <= lead - lat){ sent = true; p2 ? e._handleP2SwingInput(ev) : e._handleUserSwingInput(ev); }
      e.step(DT);
      if (e.phase !== 'RALLY' || e.ball.lastHitter === hitter) break;
    }
    return { hit: e.ball.lastHitter === hitter, tau: e.natpfLastRacket?.timing ?? null, who: e.natpfLastRacket?.who ?? null };
  });
}
// primo ritardo ancora colpito (passi di 5 ms), con la latenza lat
function firstLate(o, lat){
  let last = null;
  for (let lead = 0; lead >= -.3; lead -= .005){ if (attempt({ ...o, lead: +lead.toFixed(3), lat }).hit) last = +lead.toFixed(3); else break; }
  return last;
}

test('B48 (D16): lead −0,02 con 130 ms di ritardo colpisce a tutti i livelli (anche Bambini ed Evento), palla veloce e normale, con il tempo vero del gesto', () => {
  for (const difficulty of LEVELS) for (const flight of [.6, .85]){
    const r = attempt({ difficulty, lead: -.02, lat: .13, flight });
    assert.ok(r.hit, `${difficulty}, volo ${flight}: mancata`);
    assert.ok(Math.abs(r.tau + .02) < .01, `${difficulty}, volo ${flight}: tempo ${r.tau} (il voto resta sul tempo del gesto)`);
  }
});

test('B48 (D16): Player 2 dello stesso schermo, con 130 ms colpisce la palla veloce appena in ritardo; il limite resta quello senza latenza', () => {
  for (const flight of [.6, .85]){
    const r = attempt({ who: 'p2', lead: -.02, lat: .13, flight });
    assert.ok(r.hit, `P2, volo ${flight}: mancata`);
    assert.equal(r.who, 'p2');
    assert.ok(Math.abs(r.tau + .02) < .01, `P2, volo ${flight}: tempo ${r.tau}`);
  }
  // primo ritardo colpito con 0 e con 35 ms: lo stesso, entro 5 ms (la latenza non allarga la finestra)
  const f0 = firstLate({ who: 'p2', flight: .6 }, 0), f35 = firstLate({ who: 'p2', flight: .6 }, .035);
  assert.ok(f0 != null && Math.abs(f0 - f35) <= .0051, `P2: 0 ms ${f0}, 35 ms ${f35}`);
  // e con il P1 contro la CPU allo stesso livello (1v1) il limite è lo stesso
  assert.equal(firstLate({ difficulty: '1v1', flight: .6 }, 0), f0, 'stesso limite del Player 1');
  // molto in ritardo resta a vuoto anche con la latenza
  assert.equal(attempt({ who: 'p2', lead: f0 - .1, lat: .13, flight: .6 }).hit, false);
});

test('B48 (D16): catena intera con il ritardo dello schermo dello staff: 30 ms di rete + 100 ms di schermo → colpo preso, P1 e P2', () => {
  // il messaggio del telefono come lo costruisce la racchetta del computer: picco 30 ms prima dell'arrivo, schermo 100 ms
  const s = { at: 10, power: .7, lift: 0, dir: 1, aim: 0, confidence: .8 };
  const evt = natpfSwingToEngine(s, { now: 10.03, displayLag: .1 });
  assert.equal(evt.natpf.aim, 'swing');
  assert.ok(Math.abs(evt.natpf.latency - .13) < 1e-9, `latenza ${evt.natpf.latency}`);
  for (const difficulty of LEVELS){
    const r = attempt({ difficulty, lead: -.02, lat: evt.natpf.latency, flight: .6, evt: { ...evt, side: 'forehand' } });
    assert.ok(r.hit, `${difficulty}: mancata con il ritardo dello schermo`);
  }
  const r2 = attempt({ who: 'p2', lead: -.02, lat: evt.natpf.latency, flight: .6, evt: { ...evt, side: 'forehand', hand: 'right' } });
  assert.ok(r2.hit && r2.who === 'p2', 'P2: mancata con il ritardo dello schermo');
});

test('B48 (D16): il ritardo dello schermo salvato dalla diagnostica vale per tutti e due i telefoni di questo computer', () => {
  const mem = new Map(), prev = globalThis.localStorage;
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  try {
    const toasts = [];
    const panel = { el: { querySelector: q => (q === '[data-lag]' ? { value: '120' } : null) }, ui: { toast: t => toasts.push(t) }, _paintRec(){},
      engine: { natpfPhone: { displayLagMs: 0 }, natpfPhone2: { displayLagMs: 0 } } };
    NatpfDiag.prototype.saveLag.call(panel);
    assert.equal(panel.engine.natpfPhone.displayLagMs, 120);
    assert.equal(panel.engine.natpfPhone2.displayLagMs, 120, 'anche il telefono del Player 2 (prima restava a 0 fino al riavvio)');
    assert.equal(mem.get('natpf.displayLagMs'), '120');
    // senza il secondo telefono (partita contro la CPU) come prima
    const solo = { ...panel, engine: { natpfPhone: { displayLagMs: 0 } } };
    NatpfDiag.prototype.saveLag.call(solo);
    assert.equal(solo.engine.natpfPhone.displayLagMs, 120);
    assert.match(toasts[0], /120 ms/);
  } finally { globalThis.localStorage = prev; }
});
