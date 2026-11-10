// B18.2 · tappa 2, passo 1 del rapporto B16 (docs/b16/rapporto-gameplay.md, difetto 11 / D11; docs/b18/t2-1-servizio.md):
//   • i quattro personaggi partono fermi a ogni servizio (prima conservavano la velocità del punto prima: la CPU scattava
//     nel verso sbagliato, gli unici ace nascevano da lì, e nella pausa le gambe correvano sul posto);
//   • il servizio di chi gioca contro la CPU ha un peso suo, per livello: la risposta dipende dal servizio ricevuto
//     (ritmo, strettezza, tempo del colpo) e non dall'ultimo colpo del punto prima, e il servizio forte e angolato la CPU
//     lo legge in ritardo;
//   • nello stesso schermo e nella sfida tra due computer (due persone) e sul servizio della CPU non cambia niente.
// Prove sul motore vero senza disegno (scripts/audit/headless-engine.mjs) e sul banco scripts/audit/servizio.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as NS from '../src/natpf/natpf_skill.js';
import * as NL from '../src/natpf/natpf_legend.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { bench, natural, serveOf } from '../scripts/audit/servizio.mjs';

const DT = 1/120;
const ACTORS = e => [e.player, e.playerPartner, e.opponent, e.opponentPartner];
// con Math.random deterministico (il motore lo usa per il rimbalzo del servizio e gli errori della CPU)
const seeded = (seed, fn) => { const real = Math.random; Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = real; } };
// gesto del servizio con la forma del telefono: servizio insegnato (salita −0,08, |piano| 0,5), forza e direzione date
const serveEvt = ({ power = .5, plane = .5, face = 0 } = {}) => ({ source: 'test', side: 'overhead', shotType: 'topspin', speed: .8 + power*.85, dirX: 0,
  natpf: { aim: 'swing', shot: 'topspin', intent: { shot: 'topspin', power, depth: power, rise: -.08, plane, face }, power, latency: 0, hand: 'right' } });
// servizio sulla riga esterna del quadrato (lato pari: quadrato a sinistra, x negativa)
const wide = e => { const box = e.score.deuceSide ? -1 : 1; return { plane: -box*.55, face: box }; };
function playerServe(e, evt, tau = 0){
  assert.equal(e.phase, 'SERVE_STANCE'); assert.equal(e.score.server, 'player');
  e._handleUserTossInput({});
  for (let i = 0; i < 400 && e.phase === 'SERVE_TOSS' && e.ball.vel.y/9.15 > tau; i++) e.step(DT);
  e._handleUserSwingInput(evt);
  assert.equal(e.phase, 'RALLY', 'il servizio è partito');
}
const match = (difficulty, seed = 5) => { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return e; };

test('D11: a fine punto e a ogni servizio i quattro personaggi sono fermi (motore vero)', () => {
  for (const difficulty of ['casual', 'pro', 'leggenda']) seeded(11, () => {
    const e = match(difficulty);
    let checked = 0;
    for (let p = 0; p < 6; p++){
      for (let i = 0; i < 3000 && !(e.phase === 'SERVE_STANCE' && e.phaseTimer > .3); i++) e.step(DT);
      if (e.score.server !== 'player') { e.score.server = 'player'; e.score.gameServer = 'player'; e._setupPointServe({ showBanner: false }); }
      // al servizio: fermi, anche dopo un punto in cui la CPU correva
      for (const a of ACTORS(e)) assert.equal(a.vel.length(), 0, `${difficulty} punto ${p}: ${a.role} al servizio a ${a.vel.length().toFixed(2)} m/s`);
      playerServe(e, serveEvt({ power: .5 }));
      // chi gioca non risponde più: la CPU rimanda e il punto finisce mentre lei corre verso il recupero
      let vmax = 0;
      for (let i = 0; i < 3000 && e.phase === 'RALLY'; i++){ e.step(DT); vmax = Math.max(vmax, e.opponent.vel.length()); }
      assert.equal(e.phase, 'POINT_OVER');
      if (vmax > 1) checked++;
      for (const a of ACTORS(e)) assert.equal(a.vel.length(), 0, `${difficulty} punto ${p}: ${a.role} a fine punto a ${a.vel.length().toFixed(2)} m/s (la CPU correva a ${vmax.toFixed(1)})`);
      // durante la pausa restano fermi (prima: 3–3,6 m/s per tutta la pausa, gambe che corrono sul posto)
      for (let i = 0; i < 120; i++){ e.step(DT); assert.equal(e.opponent.vel.length(), 0); }
    }
    assert.ok(checked >= 4, `${difficulty}: la CPU correva davvero in ${checked} punti su 6`);
  });
});

test('D11: senza l\'azzeramento la velocità rimasta arriverebbe al servizio; _natpfStandStill la toglie, anche dallo stato della corsa dell\'animazione', () => {
  const e = match('pro');
  e.opponent.vel.set(4.5, 0, .8); e.player.vel.set(-3, 0, 0); e.playerPartner.vel.set(1, 0, 1); e.opponentPartner.vel.set(0, 0, -2);
  e.opponent.rig = { prevLocalVelX: 4.5, prevLocalVelZ: .8, wasMoving: true };
  NL.legendState(e).lunging = true;
  e._setupPointServe({ showBanner: false });
  for (const a of ACTORS(e)) assert.equal(a.vel.length(), 0, a.role);
  assert.deepEqual(e.opponent.rig, { prevLocalVelX: 0, prevLocalVelZ: 0, wasMoving: false });
  assert.equal(e.natpfLegend.lunging, false);
  // a fine punto la velocità si azzera, lo stato dell'animazione no (la frenata si vede)
  e.opponent.vel.set(4, 0, 0); e.opponent.rig = { prevLocalVelX: 4, prevLocalVelZ: 0, wasMoving: true };
  e._natpfStandStill();
  assert.equal(e.opponent.vel.length(), 0); assert.equal(e.opponent.rig.prevLocalVelX, 4);
  // sul computer del Player 2 (sfida tra due computer) il punto lo chiude l'host con lo snapshot: fermi anche lì
  const g = match('1v1'); g.playerRole = 'p2'; g.phase = 'POINT_OVER'; g.ball.inPlay = false;
  g.player.vel.set(5, 0, 1); g.opponent.vel.set(-4, 0, 0);
  g.step(DT);
  assert.equal(g.phase, 'POINT_OVER', 'il P2 non prepara il punto dopo');
  for (const a of ACTORS(g)) assert.equal(a.vel.length(), 0, a.role);
});

test('D11: minaccia del servizio (serveInfo): velocità vera della palla, strettezza e tempo del colpo', () => {
  const W = NS.SERVE_WEIGHT, ms = kmh => kmh/W.kmh, I = o => NS.serveInfo({ box: -1, q: 1, x: -2.8, ...o });
  // servizio insegnato a tempo (157 km/h, a 0,75 m dal centro del quadrato): nessuna minaccia e nessuna lettura in ritardo
  assert.deepEqual([I({ speed: ms(157) }).threat, I({ speed: ms(157) }).sharp], [0, 0]);
  // forte ma nella direzione del servizio insegnato: conta la velocità, non è «forte e angolato»
  const strong = I({ speed: ms(193) });
  assert.ok(strong.threat >= .65 && strong.threat <= .75 && strong.sharp === 0, JSON.stringify(strong));
  // perfetto, forte e sulla riga: minaccia piena, uguale verso l'esterno e verso la «T», nei due quadrati
  for (const box of [-1, 1]) for (const side of [box, -box]){
    const s = NS.serveInfo({ speed: ms(192), q: 1, x: box*2.05 + side*1.62, box });
    assert.deepEqual([s.threat, s.sharp, s.tight, s.fast], [1, 1, 1, 1], `quadrato ${box}, lato ${side}: ${JSON.stringify(s)}`);
  }
  // sulla riga ma piano: poca minaccia
  assert.ok(I({ speed: ms(157), x: -3.67 }).threat <= .12);
  // colpito 0,5 s fuori tempo (q 0,56): niente, anche se forte e sulla riga
  const late = I({ speed: ms(192), x: -3.67, q: .56 });
  assert.ok(late.threat < .05 && late.sharp < .05 && late.clean < .1, JSON.stringify(late));
  // più veloce non vale mai meno; un gesto forte con una palla lenta (kick di webcam e mouse, 133–150 km/h) non conta
  let prev = -1;
  for (let kmh = 120; kmh <= 215; kmh += 5){ const t = I({ speed: ms(kmh), x: -3.67 }).threat; assert.ok(t >= prev - 1e-9, `${kmh} km/h: ${prev} → ${t}`); prev = t; }
  assert.equal(I({ speed: ms(150), x: -2.05 }).threat, 0);
  // nel motore: il servizio dal gesto del telefono con la forma (natpf_stroke_outcome.serveOutcome)
  const real = Math.random; Math.random = mulberry32(2);
  try {
    const kmhOf = evt => { const e = match('pro'); for (let i = 0; i < 400 && !(e.phase === 'SERVE_STANCE' && e.phaseTimer > .3); i++) e.step(DT); playerServe(e, evt(e)); return e.natpfSkill.serve; };
    const taught = kmhOf(() => serveEvt({ power: .5 })), flat = kmhOf(() => serveEvt({ power: .9 })), great = kmhOf(e => serveEvt({ power: .9, ...wide(e) }));
    assert.ok(taught.kmh >= 150 && taught.kmh <= 160 && taught.threat === 0, JSON.stringify(taught));
    assert.ok(flat.kmh >= 188 && flat.fast === 1 && flat.sharp === 0, JSON.stringify(flat));
    assert.ok(great.kmh >= 188 && great.threat >= .97 && great.sharp >= .95, JSON.stringify(great));
    // webcam, mouse e prove (intenzione ricostruita): kick lento anche con un gesto forte
    const derived = kmhOf(() => ({ source: 'test', speed: 1.45, dirX: 0 }));
    assert.ok(derived.kmh < 160 && derived.threat === 0, JSON.stringify(derived));
  } finally { Math.random = real; }
});

test('D11: errore della CPU in risposta (Casual e Pro): perfetto forte stretto > forte > normale > in ritardo; Leggenda non tira il dado', () => {
  const S = { normale: NS.serveInfo({ speed: 23.1, q: 1, x: -2.05, box: -1 }), forte: NS.serveInfo({ speed: 28.4, q: 1, x: -2.05, box: -1 }),
    perfetto: NS.serveInfo({ speed: 28.4, q: 1, x: -3.7, box: -1 }), ritardo: NS.serveInfo({ speed: 22.3, q: .56, x: -2.05, box: -1 }) };
  for (const difficulty of ['casual', 'pro']){
    const level = NS.skillLevel(difficulty), c = k => NS.cpuServeErrorChance({ serve: S[k], stretch: .4, level, difficulty });
    assert.ok(c('perfetto') > c('forte') && c('forte') > c('normale') && c('normale') > c('ritardo'), `${difficulty}: ${['perfetto', 'forte', 'normale', 'ritardo'].map(c).join(' ')}`);
    assert.ok(c('ritardo') <= .75*c('normale'), `${difficulty}: un servizio in ritardo vale chiaramente meno`);
    // l'allungo vero conta ancora
    assert.ok(NS.cpuServeErrorChance({ serve: S.normale, stretch: .9, level, difficulty }) > c('normale'));
  }
  // Casual sbaglia più di Pro sullo stesso servizio
  assert.ok(NS.cpuServeErrorChance({ serve: S.perfetto, level: NS.skillLevel('casual'), difficulty: 'casual' }) > NS.cpuServeErrorChance({ serve: S.perfetto, level: NS.skillLevel('pro'), difficulty: 'pro' }));
  assert.equal(NS.cpuServeErrorChance({ serve: S.perfetto, stretch: 1, level: NS.skillLevel('leggenda'), difficulty: 'leggenda' }), 0);
});

test('D11: la risposta della CPU dipende dal servizio ricevuto, non dall\'ultimo colpo del punto prima', () => {
  seeded(3, () => {
    const e = match('pro');
    for (let i = 0; i < 400 && !(e.phase === 'SERVE_STANCE' && e.phaseTimer > .3); i++) e.step(DT);
    // la qualità dell'ultimo colpo del punto prima non sopravvive al servizio dopo
    NS.skillState(e).lastQuality = .2;
    e._setupPointServe({ showBanner: false });
    assert.equal(e.natpfSkill.lastQuality, 1);
    assert.equal(e.natpfSkill.serve, null);
    playerServe(e, serveEvt({ power: .9 }));
    const sv = e.natpfSkill.serve, ls = e.natpfLastServe;
    assert.ok(sv && Math.abs(sv.kmh - ls.kmh) <= 1 && sv.q === ls.q && sv.x === ls.x, JSON.stringify({ sv, ls }));
    assert.equal(NS.serveInPlay(e), sv);
    // la CPU risponde: il piano della risposta ha letto il servizio
    for (let i = 0; i < 400 && e.ball.lastHitter === 'player' && e.phase === 'RALLY'; i++) e.step(DT);
    const lc = e.natpfSkill.lastCpu;
    assert.ok(lc && lc.serve === true && lc.quality === sv.q && lc.threat === sv.threat, JSON.stringify(lc));
    // dopo la risposta il servizio non conta più (un colpo solo)
    assert.equal(NS.serveInPlay(e), null);
  });
});

test('D11: lettura in ritardo: sul servizio perfetto, forte e angolato la CPU resta ferma un attimo; sul servizio normale parte subito come prima', () => {
  for (const difficulty of ['casual', 'pro', 'leggenda']) seeded(9, () => {
    const e = match(difficulty);
    for (let i = 0; i < 400 && !(e.phase === 'SERVE_STANCE' && e.phaseTimer > .3); i++) e.step(DT);
    // servizio normale: nessun piano, la CPU si muove dal primo passo
    playerServe(e, serveEvt({ power: .5 }));
    assert.equal(e.natpfSkill.serve.late, 0); assert.equal(e.natpfSkill.cpuPlan, null);
    const x0 = e.opponent.pos.clone();
    for (let i = 0; i < 6; i++) e.step(DT);
    assert.ok(e.opponent.pos.distanceTo(x0) > 0, `${difficulty}: sul servizio normale la CPU parte subito`);
    // servizio perfetto, forte, sulla riga esterna
    e._setupPointServe({ showBanner: false }); e.score.server = 'player';
    playerServe(e, serveEvt({ power: .9, ...wide(e) }));
    const sv = e.natpfSkill.serve, plan = e.natpfSkill.cpuPlan, W = NS.SERVE_WEIGHT[difficulty];
    assert.ok(sv.sharp > .9 && sv.late > 0 && sv.late < W.read*2.5, `${difficulty}: ${JSON.stringify(sv)}`);
    assert.ok(plan && plan.serve && Math.abs(plan.readAt - e.elapsedTime - sv.late) < 1e-3, `${difficulty}: piano di lettura`);
    const p0 = e.opponent.pos.clone(), target = plan.truth.clone();
    assert.ok(target.distanceTo(p0) > 1, 'il punto d\'incontro è lontano');
    const n = Math.max(1, Math.floor(sv.late/DT) - 1);
    for (let i = 0; i < n; i++) e.step(DT);
    assert.ok(e.opponent.pos.distanceTo(p0) < 1e-6, `${difficulty}: ferma per ${sv.late} s`);
    for (let i = 0; i < 12; i++) e.step(DT);
    assert.ok(e.opponent.pos.distanceTo(p0) > 0, `${difficulty}: poi parte verso la palla`);
    assert.ok(e.opponent.targetPos.distanceTo(target) < 1e-6);
  });
  // i ritardi stanno nell'ordine di grandezza di una reazione (mai più di qualche decimo)
  for (const d of ['casual', 'pro', 'leggenda']) assert.ok(NS.SERVE_WEIGHT[d].read > 0 && NS.SERVE_WEIGHT[d].read <= .2, d);
});

test('D11: Leggenda, la qualità della risposta scende con la minaccia del servizio; un servizio normale non la tocca', () => {
  const e = match('leggenda');
  Object.assign(e.ball, { inPlay: true, lastHitter: 'player', rallyStrokeCount: 1, bounceCountOnCurrentSide: 1 });
  e.ball.pos.set(-2.2, .9, -10.4); e.ball.vel.set(-1, 1, -16); e.opponent.pos.set(-2.4, 0, -11.4); e.opponent.vel.set(0, 0, 0);
  const q = serve => { NS.skillState(e).serve = serve; return NL.legendDecide(e, e.opponent, mulberry32(21)).q; };
  const base = q(null), normal = q(NS.serveInfo({ speed: 23.1, q: 1, x: -2.05, box: -1 })), great = q(NS.serveInfo({ speed: 28.4, q: 1, x: -3.7, box: -1 }));
  assert.equal(normal, base);
  assert.ok(Math.abs(great - base*(1 - NL.LEGEND.serveQ)) < 1e-9, `${base} → ${great}`);
  // solo sulla palla del servizio
  e.ball.rallyStrokeCount = 3;
  assert.equal(q(NS.serveInfo({ speed: 28.4, q: 1, x: -3.7, box: -1 })), base);
});

test('D11: solo contro la CPU. Sfida tra due persone, servizio della CPU e palle del lanciapalle: niente minaccia e niente lettura in ritardo', () => {
  seeded(4, () => {
    // 1v1 (stesso schermo e due computer: isMultiplayer): il servizio del Player 1 e quello del Player 2
    const v = match('1v1');
    assert.equal(v.isMultiplayer, true);
    for (let i = 0; i < 400 && !(v.phase === 'SERVE_STANCE' && v.phaseTimer > .3); i++) v.step(DT);
    v.opponent.vel.set(3, 0, 0);
    v._setupPointServe({ showBanner: false });
    assert.equal(v.opponent.vel.length(), 0, 'anche nel 1v1 si parte fermi');
    playerServe(v, serveEvt({ power: .9, ...wide(v) }));
    assert.equal(v.natpfSkill.serve, null); assert.equal(v.natpfSkill.cpuPlan, null); assert.equal(v.natpfSkill.pressure, 0);
    v._setupPointServe({ showBanner: false }); v.score.server = 'opponent'; v.phase = 'SERVE_STANCE';
    v._startServeToss(v.opponent);
    for (let i = 0; i < 400 && v.ball.vel.y > 0; i++) v.step(DT);
    v._executeServeHit(v.opponent, { ...serveEvt({ power: .9 }), natpfServeTau: 0 });
    assert.equal(v.ball.lastHitter, 'opponent'); assert.equal(v.natpfSkill.serve, null); assert.equal(v.natpfSkill.cpuPlan, null);
    // servizio della CPU (formato in fiera, o game battuti dalla CPU)
    for (const difficulty of ['casual', 'pro', 'leggenda']){
      const e = match(difficulty);
      e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
      for (let i = 0; i < 1200 && e.phase !== 'RALLY'; i++) e.step(DT);
      assert.equal(e.ball.lastHitter, 'opponent', `${difficulty}: batte la CPU`);
      assert.equal(e.natpfSkill.serve, null); assert.equal(e.natpfSkill.cpuPlan, null); assert.equal(NS.serveInPlay(e), null);
    }
    // palla del lanciapalle (un colpo, come il servizio): non è un servizio
    const t = match('casual');
    NS.skillState(t).serve = NS.serveInfo({ speed: 28.4, q: 1, x: -3.7, box: -1 });
    Object.assign(t.ball, { inPlay: true, lastHitter: 'player', rallyStrokeCount: 1, natpfFeed: true });
    assert.equal(NS.serveInPlay(t), null);
    t.ball.natpfFeed = false; assert.ok(NS.serveInPlay(t));
    t.ball.lastHitter = 'opponent'; assert.equal(NS.serveInPlay(t), null);
  });
});

test('D11: il servizio della CPU e la risposta di chi gioca non cambiano con il servizio di chi gioca del punto prima', () => {
  // stesso seme, due storie: nel punto prima chi gioca ha battuto un servizio normale oppure perfetto forte e stretto.
  // Il servizio della CPU che segue è lo stesso (stessa palla, stesso piano di chi risponde)
  const after = prevServe => seeded(17, () => {
    const e = match('pro');
    for (let i = 0; i < 400 && !(e.phase === 'SERVE_STANCE' && e.phaseTimer > .3); i++) e.step(DT);
    playerServe(e, serveEvt(prevServe(e)));
    e._awardPoint('opponent', 'prova');
    e.score.server = 'opponent'; e.score.deuceSide = true;
    Math.random = mulberry32(99);
    e._setupPointServe({ showBanner: false });
    for (let i = 0; i < 1200 && e.phase !== 'RALLY'; i++) e.step(DT);
    return { vel: e.ball.vel.toArray().map(v => +v.toFixed(4)), land: e.ball.targetLanding.toArray().map(v => +v.toFixed(4)), power: e.ball.isPowerShot,
      plan: e.player.targetPos.toArray().map(v => +v.toFixed(4)), serve: e.natpfSkill.serve, pressure: e.natpfSkill.pressure };
  });
  const a = after(() => ({ power: .5 })), b = after(e => ({ power: .9, ...wide(e) }));
  assert.deepEqual(a, b);
  assert.equal(a.serve, null); assert.equal(a.pressure, 0);
});

test('D11: banco sul motore vero. Punto diretto sul servizio perfetto, forte e stretto per livello; normale e in ritardo valgono meno; nessun ace con la CPU in corsa', () => {
  // obiettivi del rapporto: 20–25% a Casual, 10–15% a Pro, intorno al 5% a Leggenda (banco completo: 2000 servizi per
  // casella, docs/b18/t2-1-servizio.md). Qui 2 semi × 250 punti (±3 punti percentuali): fasce più larghe
  const opts = { points: 250, seeds: [7, 11] };
  const band = { casual: [16, 30], pro: [8, 19], leggenda: [2.5, 9] };
  for (const difficulty of ['casual', 'pro', 'leggenda']){
    const great = bench({ type: 'perfettoStretto', difficulty, ...opts }), taught = bench({ type: 'tutorial', difficulty, ...opts }), late = bench({ type: 'forteRitardo', difficulty, ...opts });
    const msg = `${difficulty}: perfetto ${great.puntoDiretto}% (ace ${great.ace}%), tutorial ${taught.puntoDiretto}%, forte in ritardo ${late.puntoDiretto}%`;
    assert.ok(great.puntoDiretto >= band[difficulty][0] && great.puntoDiretto <= band[difficulty][1], msg);
    assert.ok(great.puntoDiretto >= taught.puntoDiretto + (difficulty === 'leggenda' ? 1.5 : 4), msg);
    assert.ok(great.puntoDiretto >= late.puntoDiretto + (difficulty === 'leggenda' ? 1.5 : 6), msg);
    for (const r of [great, taught, late]){
      assert.equal(r.inCorsa, 0, `${difficulty} ${r.type}: CPU in corsa al servizio`);
      assert.equal(r.aceInCorsa, 0); assert.equal(r.falli, 0);
    }
    // gli ace (CPU ferma, palla non toccata) ci sono a Casual e Pro sul servizio perfetto, mai sul servizio insegnato
    if (difficulty !== 'leggenda') assert.ok(great.ace > 0 && great.ace < 15, msg);
    assert.equal(taught.ace, 0, msg); assert.equal(late.ace, 0, msg);
  }
  // partite normali (servizio dei profili simulati, un battitore per game): CPU mai in corsa al servizio
  for (const difficulty of ['casual', 'pro', 'leggenda']) assert.equal(natural({ difficulty, profile: 'amatore', points: 120, seeds: [7] }).inCorsa, 0, difficulty);
  // il gesto del banco è quello che dichiara: sulla riga, nei due quadrati
  const e = match('pro');
  for (const deuce of [true, false]){ e.score.deuceSide = deuce; const s = serveOf('perfettoEsterno', e, mulberry32(1)).swing.natpf.intent; assert.equal(Math.sign(s.face), deuce ? -1 : 1); }
});
