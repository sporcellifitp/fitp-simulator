// B31 · Tappa 3 punto 1: più gioco a rete per tutti e due (docs/b31/gioco-a-rete.md; regole in src/natpf/natpf_net_play.js).
// node --import ./test/register.mjs --test test/natpf-b31-rete.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as NP from '../src/natpf/natpf_net_play.js';
import * as NS from '../src/natpf/natpf_skill.js';
import * as NI from '../src/natpf/natpf_impact.js';
import { strokeOutcome, OUTCOME } from '../src/natpf/natpf_stroke_outcome.js';
import { t as tr } from '../src/natpf/natpf_i18n.js';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { simulate } from '../scripts/audit/rally-balance.mjs';
import { cell } from '../scripts/audit/rete.mjs';

const ok = { shot: 'TOPSPIN', depth: 9.8, q: .95, failed: false, weak: false, netFault: false };

/* ---------- chi gioca: quando sale a rete ---------- */
test('approccio: sale a rete dopo un attacco riuscito, non dopo un colpo qualsiasi', () => {
  // palla corta presa alta e giocata profonda e pulita
  assert.equal(NP.approachOf({ ...ok, depth: 8.5 }, 8.8, { contactY: 1 }), true);
  // la stessa palla scavata da terra (sotto 0,85 m) no: si torna indietro
  assert.equal(NP.approachOf({ ...ok, depth: 8.5 }, 8.8, { contactY: .5, power: .3 }), false);
  // tagliato d'approccio da poco dentro la riga di fondo
  assert.equal(NP.approachOf({ ...ok, shot: 'SLICE', depth: 8 }, 11, { contactY: .7 }), true);
  assert.equal(NP.approachOf({ ...ok, shot: 'SLICE', depth: 6.9 }, 11, {}), false);   // corto: no
  // colpo forte, profondo e pulito da poco dentro la riga di fondo
  assert.equal(NP.approachOf({ ...ok, depth: 9.6, q: .9 }, 10.6, { power: .7 }), true);
  assert.equal(NP.approachOf({ ...ok, depth: 9.6, q: .9 }, 10.6, { power: .5 }), false);    // non abbastanza forte
  assert.equal(NP.approachOf({ ...ok, depth: 9.6, q: .9 }, 11.8, { power: .9 }), false);    // dalla riga di fondo: no
  // mai dopo un colpo fallito, debole, in rete, un pallonetto o una palla corta
  for (const bad of [{ failed: true }, { weak: true }, { netFault: true }, { shot: 'LOB' }, { shot: 'DROP' }])
    assert.equal(NP.approachOf({ ...ok, ...bad }, 8, { power: .9, volley: true }), false, JSON.stringify(bad));
  // già a rete: la volée e la schiacciata riuscite tengono lì
  assert.equal(NP.approachOf({ ...ok, depth: 5 }, 5, { volley: true }), true);
  assert.equal(NP.approachOf({ ...ok, shot: 'SMASH', depth: 9 }, 4, { volley: true }), true);
  assert.equal(NP.approachOf({ ...ok, shot: 'SMASH', depth: 9 }, 9, { volley: true, power: .9 }), false);
});

test('recupero: con l\'approccio si va a rete, senza come prima; a rete il passo è più corto', () => {
  const e = createHeadlessEngine({ difficulty: 'casual' }), p = e.player;
  p.pos.set(0, 0, 9);
  assert.equal(NI.recoverAfterShot(e, p, { landingX: 3, flight: 1, contactZ: 9, approach: true }), 'net');
  assert.ok(Math.abs(p.targetPos.z - NP.NET_PLAY.approach.netZ) < 1e-9 && p.targetPos.x > 0, JSON.stringify(p.targetPos));
  assert.equal(NI.recoverAfterShot(e, p, { landingX: 3, flight: 1, contactZ: 9 }), 'baseline');
  assert.deepEqual(NP.netMoveOf(5), { react: NP.NET_PLAY.netMove.react, speed: NP.NET_PLAY.netMove.speed });
  assert.deepEqual(NP.netMoveOf(11), { react: 0, speed: 1 });
  assert.deepEqual(NP.netMoveOf(-5), { react: NP.NET_PLAY.netMove.react, speed: NP.NET_PLAY.netMove.speed });   // anche il Player 2
});

/* ---------- volée: finestra più larga per la direzione, voto di sempre ---------- */
test('volée: lo stesso anticipo esce meno di lato, il voto resta quello della finestra di sempre', () => {
  const base = { intent: { shot: 'topspin', power: .6, depth: .6, face: .3 }, timing: .14, ballVz: 24, contact: 1, hitX: 0, contactY: 1.1, level: NS.skillLevel('casual') };
  for (const timing of [-.1, .09, .14]){
    const ground = strokeOutcome({ ...base, timing, hitZ: 5 }), volley = strokeOutcome({ ...base, timing, hitZ: 5, volley: true });
    assert.ok(Math.abs(volley.x) < Math.abs(ground.x), `${timing}: volée x ${volley.x}, stesso colpo dopo il rimbalzo ${ground.x}`);
    assert.equal(volley.grade, ground.grade, `${timing}: voto`);
  }
  // lontano dalla rete la volée è un colpo come gli altri
  const far = strokeOutcome({ ...base, hitZ: OUTCOME.volleyHoldZ + 1, volley: true }), farG = strokeOutcome({ ...base, hitZ: OUTCOME.volleyHoldZ + 1 });
  assert.deepEqual([far.x, far.grade], [farG.x, farG.grade]);
});

/* ---------- tagliato ---------- */
test('tagliato: il tagliato forte rimbalza basso; la CPU in fondo lo sbaglia un poco di più, senza diventare dominante', () => {
  assert.ok(NS.bounceSpin(-6.5).up < NS.bounceSpin(-5).up);
  const lv = NS.skillLevel('casual'), args = { quality: 1, shot: 'SLICE', cpuDeep: true, level: lv };
  assert.ok(NS.cpuErrorChance({ ...args, slice: NS.SLICE_ERR.casual }) > NS.cpuErrorChance({ ...args, slice: 0 }));
  assert.equal(NS.cpuErrorChance({ ...args, slice: NS.SLICE_ERR.casual, cpuDeep: false }), NS.cpuErrorChance({ ...args, slice: 0, cpuDeep: false }));
  assert.equal(NS.cpuErrorChance({ ...args, shot: 'TOPSPIN', slice: NS.SLICE_ERR.casual }), NS.cpuErrorChance({ ...args, shot: 'TOPSPIN', slice: 0 }));
});

/* ---------- la CPU ---------- */
function rallyEngine(difficulty = 'pro'){
  const e = createHeadlessEngine({ difficulty });
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.rallyStrokeCount = 6; e.ball.lastHitter = 'player';
  return e;
}
test('CPU: sale a rete solo dopo un attacco che fa correre chi gioca, al massimo una volta per punto; Bambini e Leggenda mai', () => {
  const e = rallyEngine('pro'), cpu = e.opponent; e.player.pos.set(-1, 0, 11.5);
  cpu.pos.set(.5, 0, -8.6);
  const yes = () => 0, no = () => .99;
  assert.equal(NP.cpuRecover(e, cpu, { plan: { kind: 'attack' }, landingX: 3, rng: yes }), true);
  assert.ok(Math.abs(cpu.targetPos.z + NP.NET_PLAY.cpu.netZ) < 1e-9, `${cpu.targetPos.z}`);
  e.natpfCpuNet = null;   // tornata in fondo: nello stesso punto non risale
  assert.equal(NP.cpuRecover(e, cpu, { plan: { kind: 'attack' }, landingX: 3, rng: yes }), false);
  e.natpfCpuNetTried = null;
  assert.equal(NP.cpuRecover(e, cpu, { plan: { kind: 'attack' }, landingX: -.5, rng: yes }), false, 'attacco sul corpo: non sale');
  assert.equal(NP.cpuRecover(e, cpu, { plan: { kind: 'attack' }, landingX: 3, rng: no }), false, 'sorteggio');
  assert.equal(NP.cpuRecover(e, cpu, { plan: { kind: 'ok' }, landingX: 3, rng: yes }), false, 'colpo normale da 8,6 m: no');
  for (const kind of ['net', 'wide', 'long', 'weak']) assert.equal(NP.cpuRecover(e, cpu, { plan: { kind }, landingX: 3, rng: yes }), false, kind);
  for (const d of ['bambini', 'leggenda']){ const b = rallyEngine(d); b.player.pos.set(-1, 0, 11.5); b.opponent.pos.set(.5, 0, -8.6); assert.equal(NP.cpuRecover(b, b.opponent, { plan: { kind: 'attack' }, landingX: 3, rng: yes }), false, d); }
  assert.equal(NP.byLevel(NP.NET_PLAY.cpu.approach, 'bambini'), 0);
});

test('CPU a rete: volée sulla palla al volo, schiacciata sulla palla alta, errori dichiarati', () => {
  const e = rallyEngine('pro'), cpu = e.opponent; cpu.pos.set(0, 0, -5.4); e.natpfCpuNet = { at: 0 }; e.player.pos.set(1, 0, 11);
  e.ball.bounceCountOnCurrentSide = 0; e.ball.pos.set(.3, 1.2, -4.6); e.ball.vel.set(0, -1, -20);
  const v = NP.cpuNetShot(e, cpu, { kind: 'ok' }, () => .5);
  assert.equal(v.kind, 'volley'); assert.ok(v.x < 0, 'verso il campo libero (chi gioca è a destra)');
  e.ball.pos.y = 2.6;
  assert.equal(NP.cpuNetShot(e, cpu, { kind: 'ok' }, () => .5).kind, 'smash');
  assert.equal(NP.cpuNetShot(e, cpu, { kind: 'net' }, () => .5), null, 'gli errori di cpuReturnPlan restano');
  const err = NP.cpuNetShot(e, cpu, { kind: 'ok' }, () => 0);   // sorteggio dell'errore della schiacciata
  assert.equal(err.err, 'net');
  // in fondo e dopo il rimbalzo: risposta normale
  cpu.pos.set(0, 0, -11.5); e.ball.pos.y = 1.1; e.ball.bounceCountOnCurrentSide = 1;
  assert.equal(NP.cpuNetShot(e, cpu, { kind: 'ok' }, () => .5), null);
  // Leggenda: solo la schiacciata
  const L = rallyEngine('leggenda'); L.opponent.pos.set(0, 0, -5.4); L.ball.bounceCountOnCurrentSide = 0; L.ball.pos.set(0, 1.2, -4.6);
  assert.equal(NP.cpuNetShot(L, L.opponent, { kind: 'ok' }, () => .5), null);
  L.ball.pos.y = 2.6; assert.equal(NP.cpuNetShot(L, L.opponent, { kind: 'ok' }, () => .5).kind, 'smash');
});

test('CPU a rete: piano al volo dalla traiettoria; il pallonetto che la scavalca la rimanda in fondo', () => {
  const e = rallyEngine('casual'), cpu = e.opponent; cpu.pos.set(0, 0, -5.6); e.natpfCpuNet = { at: 0 };
  e.ball.pos.set(.5, 1, 9); e.ball.vel.set(-.2, 4, -20); e.ball.spin.set(14, 0, 0); e.ball.bounceCountOnCurrentSide = 0;
  const p = NP.cpuOverheadPlan(e, cpu);
  assert.ok(p && ['volley', 'smash'].includes(p.kind), JSON.stringify(p));
  assert.ok(Math.abs(cpu.targetPos.z + 5.6) < 1e-9);
  e.ball.vel.set(0, 12, -11);   // pallonetto alto
  assert.equal(NP.cpuOverheadPlan(e, cpu), null); assert.equal(e.natpfCpuNet, null);
  assert.equal(NP.cpuReachY(e, 2.05), 2.05);
  e.natpfCpuOver = { kind: 'smash' }; assert.ok(NP.cpuReachY(e, 2.05) > 3);
});

test('palla corta della CPU: rara (una per game al massimo), solo con chi gioca lontano, dichiarata in italiano', () => {
  const e = rallyEngine('pro'), cpu = e.opponent; cpu.pos.set(0, 0, -10); e.player.pos.set(0, 0, 11.6); e.ball.bounceCountOnCurrentSide = 1; e.ball.pos.set(0, 1, -10.5);
  const d1 = NP.cpuDropShot(e, cpu, { kind: 'ok' }, () => .01);
  assert.ok(d1 && d1.z >= 2.3 && d1.z <= 3.6, JSON.stringify(d1));
  assert.equal(NP.cpuDropShot(e, cpu, { kind: 'ok' }, () => .01), null, 'seconda nello stesso game: no');
  e.score.playerGames = 1;   // game nuovo
  e.player.pos.z = 8; assert.equal(NP.cpuDropShot(e, cpu, { kind: 'ok' }, () => .01), null, 'chi gioca vicino: no');
  e.player.pos.z = 11.6; e.ball.rallyStrokeCount = 1; assert.equal(NP.cpuDropShot(e, cpu, { kind: 'ok' }, () => .01), null, 'risposta: no');
  e.ball.rallyStrokeCount = 6; assert.ok(NP.cpuDropShot(e, cpu, { kind: 'ok' }, () => .01));
  for (const d of ['bambini', 'leggenda']){ const b = rallyEngine(d); b.opponent.pos.set(0, 0, -10); b.player.pos.set(0, 0, 11.6); b.ball.bounceCountOnCurrentSide = 1; assert.equal(NP.cpuDropShot(b, b.opponent, { kind: 'ok' }, () => .01), null, d); }
  assert.equal(tr('CPU DROP SHOT'), 'PALLA CORTA DELLA CPU');
});

/* ---------- punto 22: la schiacciata di chi gioca ---------- */
test('schiacciata riuscita di chi gioca: la CPU la prende solo vicino al corpo e non appena rimbalzata', () => {
  const e = rallyEngine('leggenda');
  NS.skillState(e).lastShot = { shot: 'SMASH' }; e.natpfLastRacket = { out: { shot: 'SMASH' } };
  assert.equal(NP.smashIncoming(e), true);
  assert.equal(NP.smashReach(e, 2.3), NP.SMASH_REACH);
  e.ball.bounceCountOnCurrentSide = 1; e.ball.vel.set(0, 6, -20); e.ball.pos.set(0, .4, -10);
  assert.equal(NP.smashTooLow(e), true);
  e.ball.pos.y = 1.2; assert.equal(NP.smashTooLow(e), false);
  e.natpfLastRacket.out.failed = true; assert.equal(NP.smashIncoming(e), false);
  NS.skillState(e).lastShot = { shot: 'TOPSPIN' }; e.natpfLastRacket.out.failed = false;
  assert.equal(NP.smashReach(e, 2.3), 2.3);
});

/* ---------- interruttore: con le regole spente il gioco è quello di prima ---------- */
test('interruttore: con netPlayRules.off nessuna regola nuova scatta', () => {
  NP.netPlayRules.off = true;
  try {
    assert.equal(NP.approachOf(ok, 8, { volley: true, power: 1, contactY: 1 }), false);
    assert.deepEqual(NP.netMoveOf(4), { react: 0, speed: 1 });
    assert.equal(NS.bounceSpin(-6.5).up, .88);
    const e = rallyEngine('pro'); e.natpfCpuNet = { at: 0 };
    assert.equal(NP.cpuNetReach(e), 1);
    assert.equal(NP.cpuRecover(e, e.opponent, { plan: { kind: 'attack' }, landingX: 3, rng: () => 0 }), false);
  } finally { NP.netPlayRules.off = false; }
});

/* ---------- nel motore: chi gioca e la CPU giocano a rete, il tetto tiene ---------- */
test('motore: chi gioca va a rete al massimo in un colpo su sei, la CPU ogni tanto; volée e schiacciate per game', () => {
  const r = cell({ difficulty: 'casual', profile: 'tennista', points: 120, seeds: [2001, 2038] });
  assert.ok(r.reteG > 3 && r.reteG < 17, `chi gioca a rete ${r.reteG}%`);
  assert.ok(r.voleePerGame > .2, `volée per game ${r.voleePerGame}`);
  assert.ok(r.voleeFuoriLato <= Math.max(10, 2*r.fondoFuoriLato), `volée fuori di lato ${r.voleeFuoriLato}% contro ${r.fondoFuoriLato}% da fondo`);
  const p = cell({ difficulty: 'pro', profile: 'amatore', points: 120, seeds: [2001, 2038] });
  assert.ok(p.cpuReteQuota > 0 && p.cpuReteQuota < 15, `CPU a rete ${p.cpuReteQuota}% dei suoi colpi`);
  assert.ok(p.cpuCortePerGame <= 1, `palle corte della CPU per game ${p.cpuCortePerGame}`);
  assert.ok(p.cpuVoleePerGame > 0, `volée della CPU ${p.cpuVoleePerGame}`);
});
void THREE; void simulate;

/* ---------- registro dello stand: i colpi a rete si registrano e si riassumono ---------- */
test('registro: il campo «rete» del colpo è previsto (gioco e Worker) e il riassunto conta colpi a rete, volée e colpi a rete della CPU', async () => {
  const { CAMPI, controllaRiga } = await import('../src/natpf/registro/registro_formato.js');
  const W = await import('../cloudflare/registro-worker.js');
  assert.ok(CAMPI.includes('rete') && W.CAMPI.includes('rete'));
  const row = { k: 'colpo', t: 1, gesto: 'topspin', voto: 'p', rete: 1, volee: true, in: ['schiacciata', 120, 2.4] };
  assert.deepEqual(controllaRiga(row), []);
  const { Riassunto } = await import('../scripts/registro/riassunto.mjs');
  const R = new Riassunto();
  R._colpo(row, {}); R._colpo({ ...row, rete: undefined, volee: undefined, in: ['palla corta', 60, .8] }, {}); R._colpo({ k: 'colpo', gesto: 'slice' }, {});
  assert.deepEqual([R.rete.colpi, R.rete.aRete, R.rete.volee], [3, 1, 1]);
  assert.deepEqual(R.rete.cpu, { schiacciata: 1, 'palla corta': 1 });
});

/* ---------- revisione finale: la scritta della palla corta della CPU passa dall'esito senza diventare «Fuori» ---------- */
// Difetto bloccante della revisione finale: l'involucro dell'esito (NatpfShotFeedback) trattava «CPU DROP SHOT» come un
// colpo di chi gioca; la palla della CPU cade nella metà di chi gioca, landsIn la dava fuori e la scritta diceva in rosso
// «Fuori · Palla corta» nell'angolo di chi gioca. Chiamata vera del motore (_executeOpponentReturn) con l'involucro
// installato, la palla che cade dentro e il generatore delle scelte a rete fissato perché la palla corta scatti
test('palla corta della CPU nel motore con l\'involucro dell\'esito: «Palla corta della CPU», bianca, lato della CPU, mai «Fuori»', async () => {
  const { NatpfShotFeedback, isCpuGrade, cpuPopupPlace } = await import('../src/natpf/natpf_shot_feedback.js');
  const had = globalThis.document, real = Math.random;
  const els = {}, cls = () => { const s = new Set(); return { add: (...c) => c.forEach(x => s.add(x)), remove: (...c) => c.forEach(x => s.delete(x)), toggle: (c, f) => ((f ?? !s.has(c)) ? s.add(c) : s.delete(c)), contains: c => s.has(c) }; };
  globalThis.document = { getElementById: id => (els[id] ||= { id, classList: cls(), style: {} }), querySelectorAll: () => [] };
  try {
    assert.equal(isCpuGrade('CPU DROP SHOT'), true);
    assert.equal(isCpuGrade('PERFECT • DROP SHOT!'), false); assert.equal(isCpuGrade('P2 PERFECT • DROP SHOT!'), false);
    assert.deepEqual(cpuPopupPlace('p1'), { side: 'right', kind: 'other' });
    for (const level of ['pro', 'evento', 'casual']){
      const e = createHeadlessEngine({ difficulty: level }), shown = [];
      e.startNewMatch({ showStartBanner: false });
      e.scene = { add(){} };
      e.hud = { showTimingPopup: o => shown.push(o) };
      new NatpfShotFeedback(e);
      for (const k of ['timing-popup', 'timing-popup-grade']) for (const c of ['side-right', 'other', 'q-red', 'q-cpu']) document.getElementById(k).classList.remove(c);
      e.phase = 'RALLY'; e.natpfCpuNet = e.natpfCpuOver = e.natpfCpuShot = e.natpfCpuDrops = null;
      e.player.pos.set(.3, 0, 12.4); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
      e.opponent.pos.set(.4, 0, -9.2); e.opponent.targetPos.copy(e.opponent.pos);
      Object.assign(e.ball, { inPlay: true, lastHitter: 'player', bounceCountOnCurrentSide: 1, rallyStrokeCount: 5, shotType: 'TOPSPIN', isPowerShot: false });
      e.ball.pos.set(.6, 1, -8.9); e.ball.vel.set(0, -1, -6);
      const seq = [.01, .5, .9, .5]; let k = 0; e.natpfNetRng = () => (k < seq.length ? seq[k++] : .99);
      Math.random = () => .97;
      try { e._executeOpponentReturn(e.opponent); } finally { Math.random = real; }
      assert.equal(e.natpfCpuShot?.kind, 'drop', `${level}: la palla corta della CPU è scattata`);
      assert.equal(e.natpfCpuShot.net, false, `${level}: palla corta dentro (non in rete)`);
      assert.ok(e.ball.targetLanding.z > 0 && e.ball.targetLanding.z < 6.4, `${level}: cade nella metà di chi gioca, ${e.ball.targetLanding.z}`);
      const o = shown.at(-1);
      assert.equal(o.grade, 'CPU DROP SHOT', `${level}: la scritta della CPU, non un esito (${o.grade})`);
      assert.equal(tr(o.grade), 'PALLA CORTA DELLA CPU');
      assert.equal(o.detail, '', `${level}: niente «Fuori» né «Palla corta» come esito (${o.grade} | ${o.detail})`);
      assert.equal(o.screenPos, null);
      const g = document.getElementById('timing-popup-grade').classList, p = document.getElementById('timing-popup').classList;
      assert.ok(g.contains('q-cpu') && !g.contains('q-red'), `${level}: colore neutro`);
      assert.ok(p.contains('side-right') && p.contains('other'), `${level}: nell'angolo della CPU`);
    }
  } finally { Math.random = real; if (had === undefined) delete globalThis.document; else globalThis.document = had; }
});
