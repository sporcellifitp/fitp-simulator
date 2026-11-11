// B18.2 · tappa 2, passo 2 (difetti 1 e 9 / D1 e D9 di docs/b16/rapporto-gameplay.md): la CPU di Casual e Pro sbaglia
// per la pressione (in allungo, in corsa, palla veloce) e non a caso; la lunghezza dello scambio da sola non conta; a
// Pro la palla nel campo aperto la legge in ritardo e le corse lunghe la stancano. Documento: docs/b18/t2-2-cpu-pressione.md
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NS from '../src/natpf/natpf_skill.js';
import { measure, goals, trialValues, applyTrial, easyBall, gamesOf, SEMI } from '../scripts/audit/cpu-pressione.mjs';

const casual = NS.skillLevel('casual'), pro = NS.skillLevel('pro');
const chance = (o, level = casual) => NS.cpuErrorChance({ angle: .3, speed: 16, pressure: 0, stretch: .2, running: 0, quality: 1, threat: 1, level, ...o });
const seeded = (seed, f) => { const real = Math.random; Math.random = mulberry32(seed); try { return f(); } finally { Math.random = real; } };

test('difficoltà della palla per la CPU: niente sulla palla comoda, piena in allungo, in corsa, sulla palla veloce', () => {
  const comoda = NS.cpuStrain({ stretch: .4, running: .3, speed: 18, angle: 0 });
  assert.deepEqual(comoda, { reach: 0, run: 0, pace: 0, angle: 0 });
  const dura = NS.cpuStrain({ stretch: 1, running: 1, speed: 28, angle: 1 });
  assert.deepEqual(dura, { reach: 1, run: 1, pace: 1, angle: 1 });
  // l'allungo pesa al quadrato: a metà strada tra comoda e portata piena vale un quarto
  assert.ok(Math.abs(NS.cpuStrain({ stretch: .7 }).reach - .25) < 1e-9);
  assert.ok(Math.abs(NS.cpuStrain({ running: .65 }).run - .5) < 1e-9);
  // valori fuori scala non escono da 0…1
  const fuori = NS.cpuStrain({ stretch: 3, running: 2, speed: 90, angle: 4 });
  assert.deepEqual(fuori, { reach: 1, run: 1, pace: 1, angle: 1 });
});

test('D1: sulla palla facile la CPU sbaglia al massimo il 3%, qualunque sia la lunghezza dello scambio e la pressione', () => {
  for (const [name, lv] of [['casual', casual], ['pro', pro]]){
    const facile = chance({}, lv);
    assert.equal(facile, lv.cpuErr.base, `${name}: sulla palla comoda resta solo la base`);
    assert.ok(facile <= .03, `${name}: ${facile}`);
    // la lunghezza dello scambio da sola non conta più (prima: +1,4% a colpo oltre il quarto a Casual, +0,9% a Pro)
    assert.equal(chance({ rally: 4 }, lv), chance({ rally: 40 }, lv), `${name}: scambio lungo`);
    // nemmeno l'angolo, il tempo del colpo o la pressione accumulata, se la CPU la colpisce comoda
    assert.equal(chance({ angle: 1 }, lv), facile); assert.equal(chance({ pressure: 3 }, lv), facile); assert.equal(chance({ quality: .3 }, lv), facile);
  }
  assert.equal(casual.cpuErr.rally, undefined); assert.equal(pro.cpuErr.rally, undefined);
});

test('D1: l\'errore cresce con allungo, corsa e velocità della palla; angolo e pressione aggravano solo la palla difficile', () => {
  for (const [name, lv] of [['casual', casual], ['pro', pro]]){
    const base = chance({}, lv);
    const allungo = chance({ stretch: 1 }, lv), corsa = chance({ running: 1 }, lv), veloce = chance({ speed: 28 }, lv);
    assert.ok(allungo > base + .03 && corsa > base + .015 && veloce >= base, `${name}: ${JSON.stringify({ base, allungo, corsa, veloce })}`);
    assert.ok(chance({ stretch: .7 }, lv) < allungo && chance({ stretch: .7 }, lv) > base, `${name}: allungo a metà`);
    assert.ok(allungo > corsa, `${name}: l'allungo pesa più della corsa`);
    // in allungo e in corsa insieme più che una sola delle due
    assert.ok(chance({ stretch: 1, running: 1 }, lv) > allungo);
    // angolo e pressione moltiplicano la difficoltà (a Pro i loro pesi sono 0: lì contano solo allungo e corsa)
    assert.ok(chance({ stretch: 1, angle: 1 }, lv) >= allungo && chance({ stretch: 1, pressure: 2 }, lv) >= allungo, `${name}: angolo e pressione`);
    // i colpi speciali restano (palla corta con la CPU in fondo, pallonetto con la CPU avanti, schiacciata)
    assert.ok(chance({ shot: 'DROP', cpuDeep: true }, lv) > base && chance({ shot: 'LOB', cpuDeep: false }, lv) > base && chance({ shot: 'SMASH' }, lv) > base);
    assert.equal(chance({ shot: 'DROP', cpuDeep: false }, lv), base);
    assert.ok(chance({ stretch: 1, running: 1, speed: 40, angle: 1, pressure: 3, shot: 'SMASH' }, lv) <= lv.cpuErr.max);
  }
  // a Casual pesano anche da sole la palla veloce, l'angolo e la pressione accumulata
  assert.ok(chance({ speed: 28 }) > chance({}) + .05 && chance({ stretch: 1, angle: 1 }) > 1.3*chance({ stretch: 1 }) && chance({ stretch: 1, pressure: 2 }) > 1.5*chance({ stretch: 1 }));
  // a Pro no: palla veloce, angolata o sotto pressione la mettono in difficoltà solo se la fanno correre o allungare
  assert.deepEqual([pro.cpuErr.speed, pro.cpuErr.angle, pro.cpuErr.pressure], [0, 0, 0]);
  // a Casual la CPU è più impacciata che a Pro sulla stessa palla difficile
  assert.ok(chance({ stretch: 1 }, casual) > 2*chance({ stretch: 1 }, pro));
  assert.ok(chance({ running: 1 }, casual) > 2*chance({ running: 1 }, pro));
  // Leggenda: nessun dado (colpisce con le regole di chi gioca)
  assert.equal(NS.cpuErrorChance({ stretch: 1, running: 1, level: NS.skillLevel('leggenda') }), 0);
});

test('D1: la palla lenta e corta mette meno in difficoltà, ma mai sotto il minimo del livello (soft)', () => {
  // a Casual la CPU è impacciata quando deve muoversi anche su una palla lenta: il minimo è il 70% della difficoltà
  const forte = chance({ stretch: 1, threat: NS.shotThreat({ power: .9, depth: -10.8 }) }), debole = chance({ stretch: 1, threat: NS.shotThreat({ power: .1, depth: -6.8 }) });
  assert.ok(forte > debole, `${forte} ${debole}`);
  const k = casual.cpuErr;
  assert.ok(Math.abs(debole - (k.base + k.soft*k.stretch*(1 + k.angle*.3**1.5))) < 1e-9, 'palla debole: minimo del livello');
  assert.ok(k.soft > 0 && k.soft <= 1 && pro.cpuErr.soft >= k.soft);
});

test('D1: il tipo di errore segue il motivo: in rete poche palle, in allungo di lato, la palla veloce e profonda lunga', () => {
  const count = (o, n = 6000) => { const rng = mulberry32(11), c = { net: 0, wide: 0, long: 0 }; for (let i = 0; i < n; i++) c[NS.cpuErrorKind({ level: casual, rng, ...o })]++; return { net: c.net/n, wide: c.wide/n, long: c.long/n }; };
  const comoda = count({ stretch: .2, running: 0, speed: 16, angle: .2, depth: -8 });
  assert.ok(comoda.net > .2 && comoda.net < .3, `in rete sulla palla normale: ${comoda.net} (prima 0,42 sempre)`);
  const allungo = count({ stretch: 1, running: 1, speed: 16, angle: .8, depth: -8 });
  assert.ok(allungo.wide > .55 && allungo.net < .16, JSON.stringify(allungo));
  const veloce = count({ stretch: .2, running: 0, speed: 28, angle: .2, depth: -11 });
  assert.ok(veloce.long > .55 && veloce.net < .16, JSON.stringify(veloce));
  // le palle basse (tagliato, palla corta) finiscono in rete più spesso
  const tagliato = count({ stretch: .2, running: 0, speed: 16, angle: .2, depth: -8, shot: 'SLICE' });
  assert.ok(tagliato.net > comoda.net + .15, JSON.stringify(tagliato));
});

test('motore: il piano della risposta della CPU legge la corsa e l\'allungo veri; l\'errore di lato esce dal lato della palla', () => {
  const setup = (difficulty, { x = .3, vx = 0 } = {}) => {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.rallyStrokeCount = 6; e.ball.isPowerShot = false;
    e.opponent.pos.set(0, 0, -11.5); e.opponent.vel.set(vx, 0, 0);
    e.ball.pos.set(x, 1, -11.2); e.ball.vel.set(0, -1, -16);
    return e;
  };
  for (const difficulty of ['casual', 'pro']){
    const lv = NS.skillLevel(difficulty);
    // ferma e comoda: probabilità = base, anche al sesto colpo e con lo scambio a 40
    let e = setup(difficulty);
    seeded(5, () => e._executeOpponentReturn(e.opponent));
    assert.equal(e.natpfSkill.lastCpu.running, 0); assert.ok(e.natpfSkill.lastCpu.stretch < .4);
    assert.equal(e.natpfSkill.lastCpu.chance, lv.cpuErr.base, `${difficulty}: palla comoda`);
    e = setup(difficulty); e.ball.rallyStrokeCount = 40;
    seeded(5, () => e._executeOpponentReturn(e.opponent));
    assert.equal(e.natpfSkill.lastCpu.chance, lv.cpuErr.base, `${difficulty}: scambio lungo, palla comoda`);
    // in corsa alla velocità massima e con la palla a 0,9 della portata: probabilità più alta, con corsa e allungo nel registro
    e = setup(difficulty, { x: .9*lv.cpuReach, vx: lv.cpuSpeed });
    seeded(5, () => e._executeOpponentReturn(e.opponent));
    const lc = e.natpfSkill.lastCpu;
    assert.ok(Math.abs(lc.running - 1) < 1e-9 && Math.abs(lc.stretch - .9) < 1e-6, JSON.stringify(lc));
    assert.ok(lc.chance > lv.cpuErr.base + .04, `${difficulty}: ${lc.chance}`);
    assert.ok(['ok', 'weak', 'net', 'wide', 'long'].includes(lc.kind));
  }
  // errore di lato: la palla esce dalla parte da cui la CPU la colpisce (prima un lato a caso, e metà cadeva dentro)
  for (const side of [-1, 1]){
    const e = setup('casual', { x: side*1.3, vx: side*4.4 });
    e.opponent.pos.set(side*.1, 0, -11.5);
    const real = Math.random; let i = 0;
    // i primi due numeri li usa il motore per il colpo normale; il terzo è il dado dell'errore (0 = sbaglia); il quarto il
    // tipo: 0,5 cade nella fascia «di lato» con la CPU in allungo e in corsa
    Math.random = () => [.5, .5, 0, .5][i++] ?? .5;
    try { e._executeOpponentReturn(e.opponent); } finally { Math.random = real; }
    assert.equal(e.natpfSkill.lastCpu.kind, 'wide');
    assert.equal(Math.sign(e.ball.targetLanding.x), side, 'esce dal lato della palla');
    assert.ok(Math.abs(e.ball.targetLanding.x) >= NS.COURT.SINGLES_X + .6, `bersaglio a ${e.ball.targetLanding.x.toFixed(2)} m`);
  }
});

test('D9: a Pro (e poco a Casual) la CPU legge in ritardo la palla nel campo aperto; vicino no; Leggenda come prima', () => {
  const plan = (difficulty, dx) => seeded(4, () => {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.vel.set(0, 2, -20); e.ball.targetLanding.set(dx, 0, -9);
    e.opponent.pos.set(0, 0, -11.5); e.opponent.targetPos.set(dx, 0, -11.2);
    const now = e.elapsedTime, p = NS.planCpuRun(e, { rng: mulberry32(2) });
    return { p, now, lv: NS.skillLevel(difficulty) };
  });
  const W = pro.cpuWide;
  assert.ok(W && W.react >= .15 && W.react <= .3 && W.from >= 2 && W.to <= 5, JSON.stringify(W));
  // vicino (entro «from»): nessun ritardo in più
  let r = plan('pro', 1.5);
  assert.equal(r.p.far, 0); assert.ok(Math.abs(r.p.readAt - r.now - r.lv.cpuReact) < 1e-9);
  // nel campo aperto (oltre «to»): tutto il ritardo; a metà strada: metà
  r = plan('pro', 5);
  assert.ok(Math.abs(r.p.far - W.react) < 1e-9 && Math.abs(r.p.readAt - r.now - r.lv.cpuReact - W.react) < 1e-9, JSON.stringify(r.p));
  assert.ok(Math.abs(r.p.fixAt - r.now - r.lv.cpuReact - r.lv.cpuReadFix - W.react) < 1e-9);
  r = plan('pro', (W.from + W.to)/2);
  assert.ok(Math.abs(r.p.far - W.react/2) < 1e-3, `${r.p.far}`);
  // la CPU resta ferma fino alla lettura: il bersaglio è dov'era
  assert.equal(r.p.hold.x, 0);
  // Casual: ritardo più corto (la sua difficoltà è già nella corsa lenta)
  const c = plan('casual', 5);
  assert.ok(c.p.far > 0 && c.p.far < W.react/2, `${c.p.far}`);
  // Leggenda: il suo piano non cambia (nessun ritardo sulla palla larga)
  const l = plan('leggenda', 5);
  assert.ok(l.p.legend && l.p.far === undefined && NS.skillLevel('leggenda').cpuWide === undefined);
});

test('stanchezza della CPU a Pro: contano le corse lunghe verso la palla, non il numero dei colpi; Casual e Leggenda non si stancano', () => {
  const F = pro.cpuFatigue;
  assert.ok(F && F.near >= 1 && F.free > 0 && F.span > 0 && F.slow > 0 && F.slow <= .25, JSON.stringify(F));
  assert.equal(casual.cpuFatigue, undefined); assert.equal(NS.skillLevel('leggenda').cpuFatigue, undefined);
  const mk = difficulty => { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.vel.set(0, 2, -20); NS.resetRally(e); return e; };
  // una palla di chi gioca che la CPU deve andare a prendere a dx metri di lato da dov'è
  const ball = (e, dx) => { e.opponent.pos.set(0, 0, -11.5); e.opponent.targetPos.set(dx, 0, -11.5); e.ball.targetLanding.set(dx, 0, -9); return NS.planCpuRun(e, { rng: mulberry32(2) }); };
  const e = mk('pro');
  // uno scambio lungo giocato addosso alla CPU (40 palle entro «near» metri) non la stanca
  for (let i = 0; i < 40; i++) ball(e, (i % 2 ? -1 : 1)*(F.near - .1));
  assert.equal(e.natpfSkill.cpuRun, 0); assert.equal(NS.cpuTired(e), 0);
  // ogni palla lontana aggiunge i metri oltre «near»; fino a «free» niente, poi sale fino a 1 in «span» metri
  const far = F.near + 3;
  ball(e, far); assert.ok(Math.abs(e.natpfSkill.cpuRun - 3) < 1e-9, `${e.natpfSkill.cpuRun}`);
  ball(e, -far); assert.ok(Math.abs(e.natpfSkill.cpuRun - 6) < 1e-9);
  assert.equal(NS.cpuTired(e), Math.max(0, Math.min(1, (6 - F.free)/F.span)));
  ball(e, far); assert.ok(Math.abs(NS.cpuTired(e) - Math.max(0, Math.min(1, (9 - F.free)/F.span))) < 1e-9 && NS.cpuTired(e) > 0 && NS.cpuTired(e) < 1, `${NS.cpuTired(e)}`);
  for (let i = 0; i < 6; i++) ball(e, far);
  assert.equal(NS.cpuTired(e), 1, 'mai oltre 1');
  // conta anche la corsa in avanti (palla corta), non solo di lato
  const z = mk('pro'); z.opponent.pos.set(0, 0, -11.5); z.opponent.targetPos.set(0, 0, -11.5 + F.near + 2); NS.planCpuRun(z, { rng: mulberry32(2) });
  assert.ok(Math.abs(z.natpfSkill.cpuRun - 2) < 1e-9, `${z.natpfSkill.cpuRun}`);
  // a ogni punto riparte da zero
  NS.resetRally(e); assert.equal(e.natpfSkill.cpuRun, 0); assert.equal(NS.cpuTired(e), 0);
  // Casual e Leggenda: le stesse palle non le stancano
  for (const difficulty of ['casual', 'leggenda']){
    const c = mk(difficulty); for (let i = 0; i < 12; i++) ball(c, far);
    assert.equal(NS.cpuTired(c), 0, difficulty); assert.equal(c.natpfSkill.cpuRun || 0, 0, difficulty);
  }
});

test('stanchezza della CPU a Pro: stanca corre più piano e sbaglia di più le palle difficili, non quelle comode', () => {
  const F = pro.cpuFatigue, k = pro.cpuErr;
  // errore: sulla palla comoda resta la base anche da stanca; in allungo e in corsa la parte della difficoltà cresce di (1 + tired)
  assert.equal(chance({ tired: 1 }, pro), k.base);
  const fresca = chance({ stretch: 1, running: 1 }, pro), stanca = chance({ stretch: 1, running: 1, tired: 1 }, pro), meta = chance({ stretch: 1, running: 1, tired: .5 }, pro);
  assert.ok(Math.abs((stanca - k.base) - (fresca - k.base)*(1 + k.tired)) < 1e-9, `${fresca} ${stanca}`);
  assert.ok(meta > fresca && meta < stanca && stanca <= k.max);
  assert.ok(k.tired >= 1 && k.tired <= 4);
  // Casual: nessuna stanchezza, il parametro non conta
  assert.equal(casual.cpuErr.tired, undefined);
  assert.equal(chance({ stretch: 1, running: 1, tired: 1 }), chance({ stretch: 1, running: 1 }));
  // corsa: velocità di punta verso un bersaglio lontano, fresca e stanca
  const top = (difficulty, run) => seeded(3, () => {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); e.phase = 'RALLY';
    NS.resetRally(e); e.natpfSkill.cpuRun = run;
    const o = e.opponent; o.pos.set(-4, 0, -11.5); o.vel.set(0, 0, 0); o.targetPos.set(4, 0, -11.5);
    let v = 0; for (let i = 0; i < 180; i++){ assert.equal(NS.cpuStep(e, o, 1/120), true); v = Math.max(v, o.vel.length()); }
    return v;
  });
  const vFresca = top('pro', 0), vStanca = top('pro', F.free + F.span), vMeta = top('pro', F.free + F.span/2);
  assert.ok(Math.abs(vFresca - pro.cpuSpeed) < .02, `${vFresca}`);
  assert.ok(Math.abs(vStanca - pro.cpuSpeed*(1 - F.slow)) < .02, `${vStanca}`);
  assert.ok(vMeta < vFresca && vMeta > vStanca);
  assert.ok(Math.abs(top('casual', 99) - casual.cpuSpeed) < .02, 'Casual non rallenta');
  // il piano della risposta legge la stanchezza: stessa palla in allungo, probabilità più alta da stanca
  const plan = run => seeded(5, () => {
    const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.rallyStrokeCount = 6; e.ball.isPowerShot = false;
    NS.resetRally(e); e.natpfSkill.cpuRun = run;
    e.opponent.pos.set(0, 0, -11.5); e.opponent.vel.set(pro.cpuSpeed*.9, 0, 0); e.ball.pos.set(.9*pro.cpuReach, 1, -11.2); e.ball.vel.set(0, -1, -16);
    NS.cpuReturnPlan(e, e.opponent, { rng: () => .99 });
    return e.natpfSkill.lastCpu;
  });
  const a = plan(0), b = plan(F.free + F.span);
  assert.equal(a.tired, 0); assert.equal(b.tired, 1);
  assert.ok(b.chance > 2*a.chance && a.chance > k.base, `${a.chance} ${b.chance}`);
});

test('nello stesso schermo e tra due computer (due persone) non cambia niente: nessun errore a dado, nessuna corsa della CPU, nessuna stanchezza', () => {
  for (const difficulty of ['casual', 'pro']){
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    e.isMultiplayer = true; e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.rallyStrokeCount = 30;
    NS.resetRally(e); e.natpfSkill.cpuRun = 99;
    e.opponent.pos.set(0, 0, -11.5); e.opponent.vel.set(5, 0, 0); e.ball.pos.set(1.4, 1, -11.2); e.ball.vel.set(0, -1, -30);
    assert.deepEqual(NS.cpuReturnPlan(e, e.opponent, { rng: () => 0 }), { kind: 'ok', chance: 0 }, difficulty);
    const before = e.opponent.pos.clone();
    assert.equal(NS.cpuStep(e, e.opponent, 1/120), false, difficulty);
    assert.deepEqual([e.opponent.pos.x, e.opponent.pos.z], [before.x, before.z]);
  }
});

test('la difficoltà del livello passa dalla corsa: Casual più lenta di Pro, Pro più lenta di Leggenda', () => {
  const L = NS.skillLevel('leggenda');
  assert.ok(casual.cpuSpeed < pro.cpuSpeed && pro.cpuSpeed < L.cpuSpeed);
  assert.ok(casual.cpuAccel < pro.cpuAccel);
  assert.ok(casual.cpuReach < pro.cpuReach && pro.cpuReach < L.cpuReach);
  assert.ok(casual.cpuReact > pro.cpuReact && pro.cpuReact > L.cpuReact);
  // Casual più lenta di prima (4,7 m/s e 10 m/s²); Pro e Leggenda con la corsa di prima
  assert.equal(casual.cpuSpeed, 4.4); assert.equal(casual.cpuAccel, 9);
  assert.equal(pro.cpuSpeed, 5.3); assert.equal(pro.cpuAccel, 11); assert.equal(L.cpuSpeed, 8);
  seeded(1, () => {
    const e = createHeadlessEngine({ difficulty: 'casual' }); assert.equal(e.opponent.maxSpeed, 4.4);
  });
});

test('risposta al servizio (passo 1): le sue costanti non dipendono più da quelle degli scambi', () => {
  const sv = { clean: 1, threat: 0, q: 1 };
  const c0 = NS.cpuServeErrorChance({ serve: sv, stretch: 0, level: casual, difficulty: 'casual' }), c1 = NS.cpuServeErrorChance({ serve: sv, stretch: 1, level: casual, difficulty: 'casual' });
  assert.ok(Math.abs(c0 - NS.SERVE_WEIGHT.casual.base) < 1e-9 && Math.abs(c1 - c0 - NS.SERVE_WEIGHT.casual.stretch) < 1e-9, `${c0} ${c1}`);
  const p0 = NS.cpuServeErrorChance({ serve: sv, stretch: 0, level: pro, difficulty: 'pro' }), p1 = NS.cpuServeErrorChance({ serve: sv, stretch: 1, level: pro, difficulty: 'pro' });
  assert.ok(Math.abs(p0 - NS.SERVE_WEIGHT.pro.base) < 1e-9 && Math.abs(p1 - p0 - NS.SERVE_WEIGHT.pro.stretch) < 1e-9, `${p0} ${p1}`);
  // cambiare l'errore degli scambi non sposta la risposta al servizio
  const altro = { ...casual, cpuErr: { ...casual.cpuErr, stretch: .9, base: .2 } };
  assert.equal(NS.cpuServeErrorChance({ serve: sv, stretch: 1, level: altro, difficulty: 'casual' }), c1);
});

test('banco: valori di prova (--prova) letti tutti o errore; senza prova il gioco usa i valori del livello', () => {
  assert.deepEqual(trialValues('pro.cpuSpeed=4.9,pro.cpuErr.run=.2,casual.cpuWide.react=.1'), { pro: { cpuSpeed: 4.9, cpuErr: { run: .2 } }, casual: { cpuWide: { react: .1 } } });
  for (const bad of ['pro.cpuSpeed', 'cpuSpeed=4', 'pro.cpuSpeed=veloce', 'pro.=4', 'pro.cpuSpeed='])
    assert.throws(() => trialValues(bad), /non è livello\.nome=numero/, bad);
  assert.deepEqual({ ...NS.cpuTuning }, {}, 'nel gioco nessun valore di prova');
  try {
    applyTrial(trialValues('pro.cpuSpeed=4.9,pro.cpuErr.run=.2'));
    const t = NS.skillLevel('pro');
    assert.equal(t.cpuSpeed, 4.9); assert.equal(t.cpuErr.run, .2);
    assert.equal(t.cpuErr.stretch, NS.SKILL_LEVELS.pro.cpuErr.stretch, 'il resto del gruppo resta quello del livello');
    assert.equal(NS.skillLevel('casual'), NS.SKILL_LEVELS.casual);
    assert.throws(() => applyTrial({ evento: { cpuSpeed: 4 } }), /sconosciuto/);
  } finally { applyTrial({}); }
  assert.equal(NS.skillLevel('pro'), NS.SKILL_LEVELS.pro);
  assert.deepEqual(gamesOf('PPPP CCCC PCPCPCPP'.replace(/ /g, '').split('').map(c => ({ who: c === 'P' ? 'player' : 'opponent' }))), { gw: 2, gl: 1 });
  // palla facile: definizione fisica
  const c = { serve: false, special: false, lat: 1, depth: 8, stretch: .3, running: .1 };
  assert.equal(easyBall(c), true);
  for (const o of [{ serve: true }, { special: true }, { lat: 2.5 }, { depth: 10 }, { stretch: .6 }, { running: .5 }]) assert.equal(easyBall({ ...c, ...o }), false, JSON.stringify(o));
});

test('banco ridotto: obiettivi del passo sul gioco simulato (CPU in rete, palle facili, campo aperto a Pro, livelli)', () => {
  // 5 semi × 300 punti per casella (il banco intero, npm run audit:cpu, ne usa 8 o più): soglie con il margine del rumore.
  // Revisione: le due caselle che decidono gli obiettivi stretti del passo, «Pro contro medio» (70–85% dei game) e i
  // vincenti con la palla a 4–6 m contro «umano» (almeno il 15%), si misurano su 16 semi e si controllano con l'obiettivo
  // vero. Con 5 semi le soglie dovevano essere larghe (70–90% e 11%: i game oscillano di ±4 punti, i vincenti di ±3) e
  // lasciavano passare una taratura fuori obiettivo; con 16 semi il rumore scende a ±2 e ±1,5 e i valori di oggi (83,3% e
  // 18,2%) hanno margine. I semi sono fissi: il test non è instabile, ma una taratura nuova vicina al bordo lo fa fallire
  const rows = {};
  for (const [difficulty, profile, n] of [['casual', 'medio', 5], ['casual', 'umano', 5], ['casual', 'bambino', 5], ['pro', 'medio', 16], ['pro', 'umano', 16], ['pro', 'amatore', 5]])
    rows[`${difficulty}/${profile}`] = measure({ difficulty, profile, points: 300, seeds: SEMI(n) });
  const txt = k => JSON.stringify({ punti: rows[k].puntiG, game: rows[k].gameG, fine: rows[k].fine, facili: rows[k].facili, campo: rows[k].campo });
  for (const k of Object.keys(rows)){
    const r = rows[k];
    // CPU in rete al massimo in un punto su otto (prima 21–38%)
    assert.ok(r.fine.cpuRete <= 12.5, `${k}: CPU in rete ${r.fine.cpuRete}% · ${txt(k)}`);
    // palle facili: errori al massimo il 3% (prima 6–14%)
    assert.ok(r.facili.n > 300 && r.facili.errori <= 3, `${k}: palle facili ${r.facili.errori}% (n ${r.facili.n})`);
    // la lunghezza dello scambio da sola non fa più sbagliare: sulle palle facili l'errore dal 17° colpo resta sotto il 3%
    // (prima 9–20%), e su tutte le palle dal 17° colpo non sale di più di 5 punti rispetto ai primi sei (prima +12…+18
    // punti: 12 → 30% a Casual, 6 → 17% a Pro). A Pro quello che resta viene dalla stanchezza delle corse lunghe
    const [primi, , lunghi] = r.perColpo, facili17 = r.facili.perColpo[2];
    if (facili17.n > 100) assert.ok(facili17.errori <= 3, `${k}: palle facili dal 17° colpo ${JSON.stringify(r.facili.perColpo)}`);
    if (lunghi.n > 150) assert.ok(lunghi.errori <= primi.errori + 5, `${k}: per numero del colpo ${JSON.stringify(r.perColpo)}`);
    // la CPU si stanca solo a Pro, e stanca non sbaglia le palle facili
    if (/^casual/.test(k)) assert.equal(r.stanca.n, 0, `${k}: a Casual la CPU non si stanca`);
    else assert.ok(r.stanca.n > 100 && r.stanca.erroriFacili <= 3 && r.stanca.errori > r.stanca.erroriFresca, `${k}: ${JSON.stringify(r.stanca)}`);
    // gli errori vengono dalle palle difficili
    assert.ok(r.dure.errori >= 3*r.facili.errori, `${k}: dure ${r.dure.errori}% facili ${r.facili.errori}%`);
  }
  // più vincenti veri di chi gioca (prima: Casual 22–32% dei punti, Pro 7–11%)
  assert.ok(rows['casual/umano'].vincentiPunti >= 38 && rows['casual/medio'].vincentiPunti >= 40, `${txt('casual/umano')}`);
  assert.ok(rows['pro/umano'].vincentiPunti >= 25 && rows['pro/medio'].vincentiPunti >= 30 && rows['pro/amatore'].vincentiPunti >= 22, `${txt('pro/umano')}`);
  // meno punti chiusi da un errore della CPU (prima 55–67%)
  for (const k of ['casual/umano', 'casual/medio', 'pro/umano', 'pro/medio', 'pro/amatore']) assert.ok(rows[k].erroriCpuPunti <= 50, `${k}: ${rows[k].erroriCpuPunti}%`);
  // D9: a Pro la palla a 4–6 m dalla CPU fa vincente almeno il 15% delle volte contro «umano» (obiettivo vero, 16 semi;
  // prima 2,0%) e la CPU la riprende meno di prima (82%); contro «medio» prima 4,5%
  assert.ok(rows['pro/umano'].campo['4-6 m'].n > 1500 && rows['pro/umano'].campo['4-6 m'].vincenti >= 15, `pro/umano ${JSON.stringify(rows['pro/umano'].campo)}`);
  assert.ok(rows['pro/umano'].campo['4-6 m'].riprese <= 80, `pro/umano ${JSON.stringify(rows['pro/umano'].campo)}`);
  assert.ok(rows['pro/medio'].campo['4-6 m'].vincenti >= 25, `pro/medio ${JSON.stringify(rows['pro/medio'].campo)}`);
  // livelli: Casual resta il livello facile, Pro contro «medio» nella fascia vera 70–85% (16 semi), «amatore» a Pro
  // non crolla (togliendo solo la parte dello scambio lungo scendeva al 31% dei game; 5 semi, soglia larga)
  assert.ok(rows['casual/medio'].gameG >= 95 && rows['casual/umano'].gameG >= 95, `${txt('casual/medio')}`);
  assert.ok(rows['casual/bambino'].gameG >= 31 && rows['casual/bambino'].gameG <= 60, `casual/bambino ${rows['casual/bambino'].gameG}%`);
  assert.ok(rows['pro/medio'].gameG >= 70 && rows['pro/medio'].gameG <= 85, `pro/medio ${rows['pro/medio'].gameG}%`);
  // la tabella degli obiettivi del banco dice lo stesso sulle due caselle da 16 semi
  for (const re of [/4–6 m.*«umano»/, /4–6 m.*«medio»/, /Pro contro «medio»/]) assert.equal(goals(rows).find(g => re.test(g.name)).ok, true, String(re));
  assert.ok(rows['pro/amatore'].gameG >= 45, `pro/amatore ${rows['pro/amatore'].gameG}%`);
  // la tabella degli obiettivi del banco legge le stesse caselle
  const G = goals(rows);
  assert.ok(G.length >= 7 && G.find(g => /in rete/.test(g.name)).ok && G.find(g => /palle facili non oltre/.test(g.name)).ok && G.find(g => /non cresce con lo scambio/.test(g.name)).ok, JSON.stringify(G.map(g => [g.name, g.ok])));
  // palle facili: una casella fallisce se il suo errore è sopra il 3% oltre il rumore (errori − 2 × errore standard > 3%).
  // Prima versione, scartata dalla revisione: «decidono solo le caselle con almeno 300 palle», che lasciava passare
  // anche il 9% su 160 palle
  const withEasy = (errori, n) => ({ ...rows, 'casual/umano': { ...rows['casual/umano'], facili: { ...rows['casual/umano'].facili, n, errori } } });
  const easyGoal = r => goals(r).find(g => /palle facili non oltre/.test(g.name));
  // 9% su 160 palle: errore standard 2,26 → limite basso 4,5%: fallisce, e la tabella lo scrive
  let gE = easyGoal(withEasy(9, 160));
  assert.equal(gE.ok, false); assert.equal(gE.values['casual/umano'], 9); assert.match(gE.name, /casual\/umano 9% su 160 palle, limite basso 4\.4[0-9]%/);
  // 3,2% su 160 palle (la casella «tennista» con 8 semi): limite basso 0,4%: dentro il rumore, passa ma è scritto
  gE = easyGoal(withEasy(3.2, 160));
  assert.equal(gE.ok, true); assert.match(gE.name, /sopra il 3% misurato: casual\/umano 3\.2% su 160 palle/);
  // con tante palle il rumore è piccolo: 3,5% su 6000 fallisce (limite basso 3,03%), 3,4% passa (2,93%), 2,9% non è nemmeno segnalato
  assert.equal(easyGoal(withEasy(3.5, 6000)).ok, false); assert.equal(easyGoal(withEasy(3.4, 6000)).ok, true);
  gE = easyGoal(withEasy(2.9, 6000)); assert.equal(gE.ok, true); assert.doesNotMatch(gE.name, /sopra il 3%/);
});
