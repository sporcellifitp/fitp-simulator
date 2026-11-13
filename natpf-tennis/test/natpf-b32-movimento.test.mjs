// B32 · Tappa 3.2: movimento di chi gioca con accelerazione, primo passo, arrivo giusto in tempo e colpi in corsa
// (src/natpf/natpf_movement.js, docs/b32/movimento.md). Regole una per una, motore vero senza disegno, impronte dove il
// blocco non deve cambiare niente (Bambini, regole spente).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { simulate, PHONE_PROFILES } from '../scripts/audit/rally-balance.mjs';
import * as NM from '../src/natpf/natpf_movement.js';
import * as NS from '../src/natpf/natpf_skill.js';
import { shotWhy } from '../src/natpf/natpf_shot_feedback.js';
import { NET_PLAY } from '../src/natpf/natpf_net_play.js';

const R = NS.SKILL_LEVELS.pro.playerRun;
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

test('valori per livello: Bambini senza regole, Pro e Leggenda come Esperto, Evento tra Casual e Pro', () => {
  assert.equal(NS.SKILL_LEVELS.bambini.playerRun, null, 'Bambini: il movimento di prima');
  for (const lv of ['casual', 'pro', 'leggenda']){
    const P = NS.SKILL_LEVELS[lv].playerRun;
    assert.ok(P.accel > 0 && P.decel >= P.accel && P.split > 0 && P.settle > 0 && P.through > 0 && P.throughFrom > 0, lv);
  }
  assert.equal(NS.SKILL_LEVELS.leggenda.playerRun, NS.SKILL_LEVELS.pro.playerRun);
  // la CPU di Leggenda resta più lenta di chi gioca: velocità massima sotto, accelerazione non sopra
  assert.ok(NS.SKILL_LEVELS.leggenda.cpuSpeed < NS.SKILL_LEVELS.leggenda.playerSpeed);
  assert.ok(NS.SKILL_LEVELS.leggenda.playerRun.accel >= 22, 'accelerazione di chi gioca ≥ quella della CPU di Leggenda (22 m/s²)');
  const ev = NS.eventoLevelAt(.5).playerRun, c = NS.SKILL_LEVELS.casual.playerRun;
  assert.ok(near(ev.accel, (c.accel + R.accel)/2) && near(ev.decel, (c.decel + R.decel)/2), 'Evento: a metà strada');
});

test('runTime: partenza, velocità massima, cambio di direzione che costa', () => {
  const v = 8.8;
  // da fermo, dentro la fase di accelerazione: d = a t²/2
  assert.ok(near(NM.runTime(1, 0, R, v), Math.sqrt(2/R.accel), 1e-9));
  // oltre: tempo per arrivare a vmax più il resto a vmax
  const dAcc = v*v/(2*R.accel);
  assert.ok(near(NM.runTime(6, 0, R, v), v/R.accel + (6 - dAcc)/v, 1e-9));
  // più lento della velocità costante di prima (6 m a 8,8 m/s: 0,68 s)
  assert.ok(NM.runTime(6, 0, R, v) > 6/v);
  // già lanciati nella direzione giusta si arriva prima; dalla parte sbagliata prima si frena
  assert.ok(NM.runTime(3, 5, R, v) < NM.runTime(3, 0, R, v));
  assert.ok(NM.runTime(3, -5, R, v) > NM.runTime(3, 0, R, v) + 5/R.decel - 1e-9);
  // monotona nella distanza
  let last = 0; for (let d = 0; d <= 10; d += .25){ const t = NM.runTime(d, 0, R, v); assert.ok(t >= last); last = t; }
});

test('primo passo: split-step più la lettura della palla veloce; la frenata dello split-step toglie velocità', () => {
  assert.equal(NM.firstStep(R, 10), R.split);
  assert.ok(near(NM.firstStep(R, R.readFrom + R.readSpan + 5), R.split + R.read));
  assert.ok(NM.firstStep(R, 25) > NM.firstStep(R, 20));
  assert.equal(NM.afterHold(6, R, .1), 6 - R.decel*.1);
  assert.equal(NM.afterHold(-6, R, .1), -(6 - R.decel*.1));
  assert.equal(NM.afterHold(1, R, 1), 0);
});

test('colpo in corsa: solo con una corsa lunga senza il tempo di fermarsi, o sulla palla non raggiunta', () => {
  assert.equal(NM.runThrough(R, { slack: .05, run: 4 }), true);
  assert.equal(NM.runThrough(R, { slack: .5, run: 4 }), false, 'c\'è il tempo di fermarsi');
  assert.equal(NM.runThrough(R, { slack: .05, run: 1.5 }), false, 'corsa corta: ci si ferma');
  assert.equal(NM.runThrough(R, { slack: 1, run: 0, reached: false }), true, 'palla non raggiunta: si corre fino in fondo');
  assert.equal(NM.runThrough(null, { slack: 0, run: 9 }), false);
  // scritta: «in corsa» con la velocità al contatto oltre runSay, «in allungo» con il piano oltre stretchSay
  assert.equal(NM.moveTag(R, { running: .6 }), 'corsa');
  assert.equal(NM.moveTag(R, { running: .2, stretch: .8 }), 'allungo');
  assert.equal(NM.moveTag(R, { running: .2, stretch: .3 }), null);
  assert.equal(NM.moveTag(null, { running: 1 }), null);
});

test('scritta dell\'esito: un colpo riuscito in corsa o in allungo lo dice; il colpo fallito dice la sua causa come prima', () => {
  const L = { who: 'player', at: 3, move: 'corsa', out: { failed: false } };
  assert.equal(shotWhy(L, { now: 3 }), 'in corsa');
  assert.equal(shotWhy({ ...L, move: 'allungo' }, { now: 3 }), 'in allungo');
  assert.equal(shotWhy(L, { now: 4 }), null, 'solo il colpo appena fatto');
  assert.equal(shotWhy(L, { now: 3, who: 'p2' }), null);
  assert.equal(shotWhy({ ...L, move: null }, { now: 3 }), null, 'da fermo: niente');
  assert.equal(shotWhy({ ...L, out: { failed: true, weak: true }, cause: 'in corsa' }, { now: 3 }), 'palla debole: in corsa');
  assert.equal(shotWhy({ ...L, out: { failed: true }, cause: 'palla veloce' }, { now: 3 }), 'palla veloce');
});

test('a chi valgono le regole: chi gioca contro la CPU, anche a rete; non Bambini, stesso schermo, sfida, doppio, allenamento, demo', () => {
  const e = createHeadlessEngine({ difficulty: 'pro' });
  assert.equal(NM.runProfile(e, e.player), R);
  assert.equal(NM.runProfile(e, e.opponent), null, 'la CPU ha il suo movimento');
  const off = (k, set, undo) => { set(); assert.equal(NM.runProfile(e, e.player), null, k); undo(); assert.equal(NM.runProfile(e, e.player), R, k + ' (di nuovo)'); };
  off('sfida tra due computer', () => { e.isMultiplayer = true; }, () => { e.isMultiplayer = false; });
  off('doppio', () => { e.isDoubles = true; }, () => { e.isDoubles = false; });
  off('stesso schermo', () => { e.natpfSplit.active = true; }, () => { e.natpfSplit.active = false; });
  off('sfida locale', () => { e.versus = { active: true }; }, () => { e.versus = null; });
  off('demo', () => { e.autoPlayMode = true; }, () => { e.autoPlayMode = false; });
  off('allenamento', () => { e.natpfUi = { training: { active: true } }; }, () => { e.natpfUi = null; });
  off('regole spente', () => { NM.movementRules.off = true; }, () => { NM.movementRules.off = false; });
  // revisione finale: anche a rete e verso la rete (prima entro 7 m restava il «passo corto» del B31, che c'era solo nel
  // piano: una regola nascosta)
  const z = e.player.pos.z, tz = e.player.targetPos.z;
  e.player.pos.z = NET_PLAY.netMove.zone - .5; assert.equal(NM.runProfile(e, e.player), R, 'a rete'); e.player.pos.z = z;
  e.player.targetPos.z = NET_PLAY.netMove.zone - .5; assert.equal(NM.runProfile(e, e.player), R, 'verso la rete'); e.player.targetPos.z = tz;
  e.matchConfig.difficulty = 'bambini';
  assert.equal(NM.runProfile(e, e.player), null, 'Bambini');
  e.matchConfig.difficulty = 'evento';
  assert.ok(NM.runProfile(e, e.player)?.accel > 0, 'Evento');
});

test('runStep: accelera e frena entro i limiti, si ferma sul punto, nessun oggetto nuovo, split-step', () => {
  const e = createHeadlessEngine({ difficulty: 'pro' }), a = e.player, vel = a.vel, dt = 1/120;
  a.pos.set(0, 0, 11.7); a.vel.set(0, 0, 0); a.targetPos.set(4, 0, 11.7);
  let prev = 0, top = 0;
  for (let i = 0; i < 240; i++){
    e.elapsedTime += dt; NM.runStep(e, a, dt, R, 8.8);
    const v = Math.hypot(a.vel.x, a.vel.z);
    assert.ok(v - prev <= R.accel*dt + 1e-9, `passo ${i}: accelerazione oltre il limite`);
    assert.ok(prev - v <= R.decel*dt + 1e-9, `passo ${i}: frenata oltre il limite`);
    prev = v; top = Math.max(top, v);
  }
  assert.equal(a.vel, vel, 'stesso oggetto della velocità');
  assert.ok(Math.abs(a.pos.x - 4) < .1 && Math.hypot(a.vel.x, a.vel.z) === 0, `arrivato e fermo: x ${a.pos.x}`);
  assert.ok(top <= 8.8 + 1e-9 && top > 5, `velocità massima ${top}`);
  // split-step: con natpfRunHold nel futuro frena invece di partire
  a.vel.set(-6, 0, 0); a.targetPos.set(-3, 0, 11.7); a.natpfRunHold = e.elapsedTime + .2; a.natpfRunBy = 0;
  NM.runStep(e, a, dt, R, 8.8);
  assert.ok(near(a.vel.x, -6 + R.decel*dt, 1e-9), `frena: ${a.vel.x}`);
});

test('arrivo giusto in tempo: sulla palla vicina si va al passo e si arriva prima del colpo; in corsa non si frena', () => {
  const e = createHeadlessEngine({ difficulty: 'pro' }), a = e.player, dt = 1/120;
  a.pos.set(0, 0, 11.7); a.vel.set(0, 0, 0); a.targetPos.set(2, 0, 11.7);
  NM.startHold(e, a, R, { hold: 0, t: 1.2, x: 2, z: 11.7 });
  let top = 0, arrived = null;
  for (let i = 0; i < 160; i++){ e.elapsedTime += dt; NM.runStep(e, a, dt, R, 8.8); top = Math.max(top, Math.hypot(a.vel.x, a.vel.z)); if (arrived == null && Math.abs(a.pos.x - 2) < .1) arrived = e.elapsedTime; }
  assert.ok(top < 5, `al passo: punta ${top.toFixed(2)} m/s (a tutta 8,8)`);
  assert.ok(arrived != null && arrived <= 1.2 - .05, `arrivato a ${arrived} s, il colpo è a 1,2 s`);
  // in corsa: 4 m in 0,7 s, niente frenata finale: al contatto si corre ancora
  const b = createHeadlessEngine({ difficulty: 'pro' }), c = b.player;
  c.pos.set(0, 0, 11.7); c.vel.set(0, 0, 0); c.targetPos.set(4, 0, 11.7);
  NM.startHold(b, c, R, { hold: 0, t: .7, x: 4, z: 11.7, through: true });
  for (let i = 0; i < 84; i++){ b.elapsedTime += dt; NM.runStep(b, c, dt, R, 8.8); }
  assert.ok(Math.hypot(c.vel.x, c.vel.z) > .5*8.8, `al contatto in corsa: ${Math.hypot(c.vel.x, c.vel.z).toFixed(2)} m/s`);
});

test('stanchezza: il riposo segue la velocità (restShare), così correre con l\'accelerazione non stanca di più', () => {
  const e = createHeadlessEngine({ difficulty: 'pro' }), a = e.player;
  NS.resetFatigue(e);
  NS.fatigueStep(e, a, { dt: 1, inPoint: true }); assert.equal(NS.fatigueLevel(e, a), 0);
  e.natpfFatigue.get(a).level = .5;
  NS.fatigueStep(e, a, { dt: 1, speed: 3, inPoint: true, restShare: .5 });
  assert.ok(near(NS.fatigueLevel(e, a), .5 - NS.FATIGUE.restRecover*.5, 1e-12));
  NS.fatigueStep(e, a, { dt: 1, speed: 3, inPoint: true });
  assert.ok(near(NS.fatigueLevel(e, a), .5 - NS.FATIGUE.restRecover*.5, 1e-12), 'senza restShare e sopra restSpeed: niente riposo, come prima');
});

// impronta di una partita simulata (punti, colpi, motivi)
const print = r => JSON.stringify([r.points, r.won, r.rallies.join(','), Object.entries(r.reasons).sort()]);

test('impronte: Bambini identico con le regole accese e spente; con le regole spente il gioco è quello di prima', () => {
  const run = (difficulty, profile, seed) => print(simulate({ profile: PHONE_PROFILES[profile], difficulty, points: 120, seed }));
  for (const [d, p, s] of [['bambini', 'bambino', 2001], ['bambini', 'amatore', 5003]]){
    const on = run(d, p, s); NM.movementRules.off = true; let off; try { off = run(d, p, s); } finally { NM.movementRules.off = false; }
    assert.equal(on, off, `${d}/${p}`);
  }
  // a Pro le regole cambiano il gioco (e spente lo rimettono com'era: stessa partita due volte)
  NM.movementRules.off = true;
  let a, b; try { a = run('pro', 'amatore', 2001); b = run('pro', 'amatore', 2001); } finally { NM.movementRules.off = false; }
  assert.equal(a, b);
  assert.notEqual(run('pro', 'amatore', 2001), a);
});

test('in partita: lo split-step e la partenza graduale dopo il colpo della CPU; colpi in corsa e in allungo dichiarati', () => {
  const tags = { corsa: 0, allungo: 0, colpi: 0 }, speeds = []; let checked = 0;
  let lastHitter = null, sinceCpu = -1, seen = null;
  simulate({ profile: PHONE_PROFILES.amatore, difficulty: 'pro', points: 120, seed: 2001, onStep: e => {
    const b = e.ball;
    if (b.inPlay && e.phase === 'RALLY' && b.lastHitter === 'opponent' && lastHitter !== 'opponent') sinceCpu = 0, speeds.length = 0;
    lastHitter = b.inPlay ? b.lastHitter : null;
    // (revisione finale: anche a rete e verso la rete, dove prima restava il movimento del B31)
    if (sinceCpu >= 0 && sinceCpu < 30){ speeds.push(Math.hypot(e.player.vel.x, e.player.vel.z)); sinceCpu++; }
    const L = e.natpfLastRacket; if (L && L !== seen && L.who === 'player'){ seen = L; tags.colpi++; if (L.move) tags[L.move]++; }
    if (sinceCpu === 30 && speeds.length === 30){
      // nei 0,25 s dopo il colpo della CPU la velocità cresce al più di accel × dt a passo (niente partenza a tutta)
      for (let i = 1; i < speeds.length; i++) assert.ok(speeds[i] - speeds[i - 1] <= R.accel/120 + 1e-6, `salto di velocità ${speeds[i - 1]} → ${speeds[i]}`);
      sinceCpu = 31; checked++;
    }
  } });
  assert.ok(checked > 300, `partenze controllate ${checked}`);
  assert.ok(tags.colpi > 500, `colpi ${tags.colpi}`);
  assert.ok(tags.corsa > 0 && tags.corsa/tags.colpi < .25, `in corsa ${tags.corsa} su ${tags.colpi}`);
  assert.ok(tags.allungo > 0 && tags.allungo/tags.colpi < .25, `in allungo ${tags.allungo} su ${tags.colpi}`);
});

test('stesso schermo: campo aperto spento e acceso, aiuto al più giovane: partite identiche con le regole B32 accese e spente', async () => {
  const { many } = await import('../scripts/audit/b19/due-umani.mjs');
  const fp = r => JSON.stringify([r.pts.map(p => [p.win, p.n, p.kind, p.srv, p.why]), r.shots.map(s => [s.k, s.shot, s.grade, s.q, s.x, s.depth, s.sup, s.flight])]);
  const cases = [
    ['campo aperto spento', 'medio', e => { e.natpfOpenCourt = false; }],
    ['campo aperto acceso', 'medio', e => { e.natpfOpenCourt = true; }],
    ['aiuto al più giovane (bambino contro adulto)', 'bambino', e => { e.natpfSplitBands = { p1: 'bambino', p2: 'adulto' }; }],
  ];
  for (const [name, a, tweak] of cases){
    const on = fp(many({ a, b: 'medio', fair: true, matches: 6, tweak }, [7001, 7103]));
    NM.movementRules.off = true;
    let off; try { off = fp(many({ a, b: 'medio', fair: true, matches: 6, tweak }, [7001, 7103])); } finally { NM.movementRules.off = false; }
    assert.ok(on.length > 200, name);
    assert.equal(on, off, name);
  }
});

// Revisione finale (bloccante del B31): «a rete ci si muove meno in fretta» c'era solo nel piano d'intercetto (reazione
// +0,12 s, passo × 0,55), mentre il personaggio correva a velocità piena: il gioco lo trattava come lento senza che si
// vedesse. Ora il piano usa il movimento vero e a rete vale il movimento di tutto il campo (split-step, accelerazione):
// la velocità del personaggio dopo il colpo della CPU cresce al più di accel × dt anche a rete, e il piano non dipende più
// da quanto si è vicini alla rete (stessa palla, stessa distanza: stesso tempo)
test('a rete: niente passo corto nascosto nel piano, il movimento vero è quello di tutto il campo', async () => {
  const THREE = await import('three');
  const e = createHeadlessEngine({ difficulty: 'pro' }), p = e.player, R = NM.runProfile(e, p), DT = 1/120;
  e.startNewMatch({ showStartBanner: false });
  let caught = 0, cases = 0, volleys = 0, vmax = 0;
  // passanti della CPU contro chi è a rete (5,2 m): volo 0,75–1,05 s, verso 2,2–3,9 m di lato, 6,5–10,5 m dalla rete
  for (const fl of [.75, 1.05]) for (const x of [2.2, 3.9]) for (const z of [6.5, 10.5]){
    e.phase = 'RALLY'; e.phaseTimer = 0; e.natpfCpuNet = e.natpfCpuOver = e.natpfCpuShot = null;
    p.pos.set(0, 0, 5.2); p.targetPos.copy(p.pos); p.vel.set(0, 0, 0); p.swingTimer = 0;
    e.opponent.pos.set(-.4, 0, -11.4); e.opponent.targetPos.copy(e.opponent.pos);
    Object.assign(e.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 5, shotType: 'TOPSPIN', isPowerShot: false });
    e.ball.pos.set(-.2, 1.2, -10.4);
    e._launchBallToTarget(e.ball.pos.clone(), new THREE.Vector3(x, 0, z), fl, { topspin: 14 });
    assert.equal(NM.runProfile(e, p), R, 'a rete vale il movimento B32');
    e._natpfPlanPlayer(); cases++; if (e.natpfPlan?.kind === 'volley') volleys++;
    let sent = false, last = 0;
    for (let t = 0; t < 2.5 && e.ball.inPlay; t += DT){
      e.opponent.pos.set(-.4, 0, -11.4); e.opponent.targetPos.copy(e.opponent.pos);
      const r = e.ball.pos.z - p.pos.z, tti = (-.45 - r)/Math.max(.5, e.ball.vel.z - p.vel.z);
      if (!sent && e.ball.vel.z > .5 && tti <= 0){ sent = true;
        e._handleUserSwingInput({ source: 'audit', side: 'forehand', shotType: 'topspin', speed: 1.3, dirX: 0, natpf: { aim: 'swing', shot: 'topspin', intent: { shot: 'topspin', power: .6, depth: .55, rise: .3, face: 0 }, power: .6, peak: 1100, latency: 0, hand: 'right', prepCapable: true, prep: null } }); }
      e.step(DT);
      const v = Math.hypot(p.vel.x, p.vel.z); vmax = Math.max(vmax, v);
      // niente partenza a tutta: la velocità cresce al più di accel × dt a passo, anche a rete (prima: 8,8 m/s subito)
      if (!sent) assert.ok(v - last <= R.accel*DT + 1e-6, `salto di velocità ${last.toFixed(2)} → ${v.toFixed(2)}`);
      last = v;
      if (e.ball.lastHitter === 'player'){ caught++; break; }
    }
  }
  assert.equal(caught, cases, `palle prese ${caught}/${cases}`);
  assert.ok(volleys > 0 && vmax <= p.maxSpeed + 1e-6, `volée ${volleys}, velocità massima ${vmax.toFixed(2)}`);
});

/* ---------- B34: la scritta «in corsa» solo con la corsa forte (decisione dell'utente del 13/11) ---------- */
test('B34: «in corsa» scritto solo da 0,8 della velocità massima; la regola del colpo in corsa e il registro non cambiano', () => {
  for (const lv of ['casual', 'pro', 'leggenda', 'evento']){
    const P = NS.skillLevel(lv).playerRun;
    assert.equal(P.runSay, .5, `${lv}: la regola (e il registro) da 0,5`);
    assert.equal(P.runShow, .8, `${lv}: la scritta da 0,8`);
  }
  // moveTag (regola e registro) come prima; moveSay (scritta) tace sulla corsa media e non la trasforma in «in allungo»
  assert.equal(NM.moveTag(R, { running: .6, stretch: .9 }), 'corsa');
  assert.equal(NM.moveSay(R, { running: .6, stretch: .9 }), null);
  assert.equal(NM.moveSay(R, { running: .79 }), null);
  assert.equal(NM.moveSay(R, { running: .8 }), 'corsa');
  assert.equal(NM.moveSay(R, { running: .95 }), 'corsa');
  assert.equal(NM.moveSay(R, { running: .2, stretch: .8 }), 'allungo', '«in allungo» come prima');
  assert.equal(NM.moveSay(R, { running: .2, stretch: .3 }), null);
  assert.equal(NM.moveSay(null, { running: 1 }), null);
  // la scritta segue say; senza say (colpi costruiti prima del B34) segue move
  const L = { who: 'player', at: 3, move: 'corsa', say: null, out: { failed: false } };
  assert.equal(shotWhy(L, { now: 3 }), null, 'corsa media: niente scritta');
  assert.equal(shotWhy({ ...L, say: 'corsa' }, { now: 3 }), 'in corsa');
  assert.equal(shotWhy({ ...L, out: { failed: true, weak: true }, cause: 'in corsa' }, { now: 3 }), 'palla debole: in corsa', 'il colpo fallito dice la causa come prima');
  // in partita: stesse partite di prima (punti e colpi), meno scritte; il registro (move) conta i colpi in corsa come prima
  const count = difficulty => { let last = null; const c = { shots: 0, move: 0, say: 0, old: 0 };
    const r = simulate({ profile: 'umano', difficulty, points: 80, seed: 2001, onStep: e => {
      const L = e.natpfLastRacket; if (!L || L === last || L.who !== 'player') return; last = L; c.shots++;
      if (L.move === 'corsa') c.move++;
      if (shotWhy(L) === 'in corsa') c.say++;
      if (shotWhy({ ...L, say: L.move }) === 'in corsa') c.old++;
      assert.ok(L.say !== 'corsa' || L.move === 'corsa', 'scritta «in corsa» solo su un colpo in corsa per la regola');
    } });
    return { ...c, points: r.points };
  };
  const ev = count('evento');
  assert.ok(ev.move > 20 && ev.old > ev.points*.8, `Evento prima: ${ev.old} scritte in ${ev.points} punti`);
  assert.ok(ev.say < ev.points*.35 && ev.say < ev.old/4, `Evento ora: ${ev.say} scritte in ${ev.points} punti (prima ${ev.old})`);
});
