// B18.2, tappa 2 passo 3 (difetti 2 e 8 del rapporto B16; docs/b18/t2-3-leggenda-e-palla-corta.md):
//   A. Leggenda con la regola degli altri livelli (niente failQ .63 e pressione dal 10° colpo per chi gioca): margini
//      visibili (finestra del momento giusto più stretta, che si stringe negli scambi lunghi) e CPU più forte;
//   B. la palla corta può sbagliare (controllo del tocco: tempo, distanza, forza, situazione, pressione), in rete o troppo
//      lunga, con il motivo nella scritta; la CPU la legge quando è prevedibile.
import test from 'node:test';
import assert from 'node:assert/strict';
import { strokeOutcome, dropControl, dropCause, OUTCOME, ASSIST, assistOf, rallyPressure, directionSpan } from '../src/natpf/natpf_stroke_outcome.js';
import { skillLevel, DROP_READ, dropExpect, dropThreat, dropForward, cpuErrorChance, registerPlayerShot } from '../src/natpf/natpf_skill.js';
import { LEGEND } from '../src/natpf/natpf_legend.js';
import { shotQuality, dropOutcome, shotWhy, eventQuality, qualityText } from '../src/natpf/natpf_shot_feedback.js';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { eventFlash } from '../../site/js/tennis/phone-screen.js';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { ASSIST_LEGGENDA_B16 } from './leggenda-b16.mjs';

const lv = d => skillLevel(d);
const out = (o = {}, d = 'pro') => strokeOutcome({ contact: 1, hitX: 0, hitZ: 10, quality: 1, contactY: 1, level: lv(d), ...o, intent: { shot: 'topspin', power: .6, depth: .6, rise: .3, face: 0, ...(o.intent || {}) } });
const drop = (o = {}, d = 'pro') => out({ ...o, intent: { shot: 'drop', power: .2, depth: .18, rise: -.3, conf: .7, ...(o.intent || {}) } }, d);

/* ---------- A. Leggenda ---------- */
test('A: Leggenda senza la regola nascosta: soglia del colpo fallito di Pro, pressione degli scambi lunghi di tutti, margini dichiarati', () => {
  const L = ASSIST.leggenda;
  assert.equal(L.failQ, ASSIST.pro.failQ, 'failQ come Pro');
  assert.equal(L.pressureFrom, undefined, 'pressione dal 16° colpo come gli altri livelli (RALLY_PRESSURE.from)');
  assert.equal(rallyPressure(15, L.pressureFrom), 1);
  assert.equal(rallyPressure(20, L.pressureFrom), rallyPressure(20));
  // margini: finestra più stretta di Pro, che negli scambi lunghi si stringe ancora; uscita di lato più pronta
  assert.ok(directionSpan(lv('leggenda')) < directionSpan(lv('pro')), `${directionSpan(lv('leggenda'))} / ${directionSpan(lv('pro'))}`);
  assert.ok(L.spanPress > 0 && L.pushOut > ASSIST.pro.pushOut);
  // gli altri livelli non cambiano (B18.2 passo 3: impronte identiche, docs/b18/t2-3-leggenda-e-palla-corta.md)
  assert.deepEqual(ASSIST.pro, { xMax: 3.65, assistQ: .62, failQ: .3, pushOut: .9, attackQ: .65 });
  assert.deepEqual(ASSIST['1v1'], { xMax: 3.65, assistQ: .6, failQ: .34, pushOut: .9, attackQ: .6 });
  assert.deepEqual({ ...ASSIST.casual, dropClean: undefined, dropFail: undefined }, { xMax: 3.65, assistQ: .5, failQ: .2, pushOut: .8, attackQ: .45, dropClean: undefined, dropFail: undefined });
  for (const d of ['casual', 'pro', 'bambini', 'evento']) assert.ok(!assistOf(lv(d)).spanPress && !assistOf(lv(d)).span, d);
  // la regola di prima resta solo per le prove (level.assist)
  assert.equal(assistOf({ ...lv('leggenda'), assist: ASSIST_LEGGENDA_B16 }).failQ, .63);
});

test('A: a Leggenda un colpo perfetto con una buona situazione non fallisce più «scambio lungo» (prima sì, dal 23° colpo)', () => {
  for (const strokes of [16, 20, 24, 30, 40, 60]){
    const pressure = rallyPressure(strokes), now = out({ pressure }, 'leggenda');
    assert.ok(!now.failed && !now.pressured, `${strokes}° colpo: ${JSON.stringify(now)}`);
  }
  // con la regola di prima (pressione dal 10° colpo, failQ .63) lo stesso colpo perfetto falliva in silenzio
  const old = { ...lv('leggenda'), assist: ASSIST_LEGGENDA_B16 };
  const before = strokeOutcome({ contact: 1, hitX: 0, hitZ: 10, quality: 1, contactY: 1, pressure: rallyPressure(40, 10), level: old, intent: { shot: 'topspin', power: .6, depth: .6, rise: .3 } });
  assert.ok(before.failed && before.pressured && before.grade === 'PERFECT', JSON.stringify(before));
});

test('A: negli scambi lunghi a Leggenda la finestra si stringe e il voto lo dice («in anticipo», «in ritardo»); agli altri livelli no', () => {
  const timing = .03;   // 30 ms prima del punto giusto
  const at = (strokes, d) => out({ timing, pressure: rallyPressure(strokes) }, d);
  const a = at(10, 'leggenda'), b = at(30, 'leggenda'), c = at(46, 'leggenda');
  assert.ok(a.t < b.t && b.t < c.t, `${a.t} ${b.t} ${c.t}`);
  assert.equal(a.grade, 'PERFECT'); assert.notEqual(c.grade, 'PERFECT');
  // la palla va di più verso l'incrociato con il tempo «più lontano» dal giusto: la direzione dice cosa è successo
  assert.ok(c.x < a.x, `${a.x} → ${c.x}`);
  // a Pro e a Casual il tempo misurato non dipende dalla lunghezza dello scambio
  for (const d of ['pro', 'casual']) assert.equal(at(10, d).t, at(46, d).t, d);
});

test('A: la CPU Leggenda regge di più (pressione dal 26° colpo, chiusura dal 24°) e controlla meglio i colpi forti', () => {
  assert.equal(LEGEND.pressureFrom, 26);
  assert.ok(LEGEND.closeFrom === 24 && LEGEND.closeHard === 28);
  assert.equal(LEGEND.powerErr, .5);
});

/* ---------- B. palla corta ---------- */
test('B: controllo del tocco: pulita nel momento giusto da vicino; lunga o in rete con il motivo che pesa di più', () => {
  const clean = dropControl({ t: 0, z: 8, power: .2 });
  assert.deepEqual([clean.lack, clean.why, clean.fail, clean.net], [0, null, false, false]);
  // da lontano (dietro la riga di fondo): lunga; ancora più lontano o con la situazione non comoda, in rete
  const far = dropControl({ t: 0, z: 14.5, power: .2 }), farther = dropControl({ t: 0, z: 15.5, power: .2, quality: .8 });
  assert.ok(far.why === 'lontano' && far.lack >= OUTCOME.drop.longAt && !far.net, JSON.stringify(far));
  assert.ok(farther.why === 'lontano' && farther.fail && farther.net, JSON.stringify(farther));
  // gesto forte: non è un tocco, viene più lunga (non in rete)
  const strong = dropControl({ t: 0, z: 8, power: .55 });
  assert.ok(strong.why === 'forte' && strong.lack > 0 && !strong.net, JSON.stringify(strong));
  // tempo: in ritardo oltre la finestra in rete, in anticipo lunga
  const late = dropControl({ t: -1.6, z: 8 }), early = dropControl({ t: 1.6, z: 8 });
  assert.ok(late.why === 'tempo' && late.net, JSON.stringify(late));
  assert.ok(early.why === 'tempo' && early.lack > 0 && !early.net, JSON.stringify(early));
  // situazione (in corsa, in allungo): in rete solo se la palla è bassa, altrimenti lunga
  const lowBall = dropControl({ z: 8, quality: .35, y: .6 }), highBall = dropControl({ z: 8, quality: .35, y: 1.2 });
  assert.ok(lowBall.why === 'situazione' && lowBall.net, JSON.stringify(lowBall));
  assert.ok(highBall.why === 'situazione' && highBall.fail && !highBall.net, JSON.stringify(highBall));
  // continua: più lontano, più forte, più fuori tempo → mai meglio
  for (const k of ['z', 'power']){
    const xs = k === 'z' ? [6, 9, 11.5, 12.5, 13.5, 15, 16] : [.1, .25, .3, .4, .5, .6, .8];
    const ls = xs.map(v => dropControl({ t: 0, z: 8, power: .2, [k]: v }).lack);
    for (let i = 1; i < ls.length; i++) assert.ok(ls[i] >= ls[i - 1], `${k}: ${ls.join(' ')}`);
  }
  const ts = [0, .3, .6, .9, 1.2, 1.6].map(t => dropControl({ t, z: 8 }).c);
  for (let i = 1; i < ts.length; i++) assert.ok(ts[i] <= ts[i - 1], ts.join(' '));
  // nessun caso: stessi ingressi, stesso esito
  assert.deepEqual(dropControl({ t: .4, z: 10, power: .3, quality: .8, pressure: .9 }), dropControl({ t: .4, z: 10, power: .3, quality: .8, pressure: .9 }));
});

test('B: nell\'esito del colpo la palla corta lunga cade più in là e più alta, quella sbagliata va in rete; la qualità che manca non la accorcia più', () => {
  const good = drop({ hitZ: 8 }), strong = drop({ hitZ: 8, intent: { power: .55 } }), long = drop({ hitZ: 14.5 }), net = drop({ hitZ: 15.6, quality: .8 });
  assert.ok(!good.failed && !good.dropLong && good.dropWhy === null && good.depth < 3.5, JSON.stringify(good));
  assert.ok(!strong.failed && !strong.dropLong && strong.dropWhy === 'forte' && strong.depth > good.depth + .5, JSON.stringify(strong));
  assert.ok(!long.failed && long.dropLong && long.dropWhy === 'lontano' && long.depth > good.depth + 2 && long.clear > good.clear, JSON.stringify(long));
  assert.ok(net.failed && net.netFault && net.dropWhy === 'lontano' && !net.weak, JSON.stringify(net));
  // prima la situazione peggiore la accorciava (la migliorava): ora la allunga
  const worse = drop({ hitZ: 8, quality: .6 });
  assert.ok(worse.depth >= good.depth, `${good.depth} → ${worse.depth}`);
  // a Casual più margine: lo stesso tocco sporco è meno lungo che a Pro
  const sit = { hitZ: 10, quality: .65, timing: .05 };
  assert.ok(drop(sit, 'casual').dropLack < drop(sit, 'pro').dropLack, `${drop(sit, 'casual').dropLack} / ${drop(sit, 'pro').dropLack}`);
  // gli altri colpi non hanno i campi della palla corta
  const top = out();
  assert.deepEqual([top.dropQ, top.dropLack, top.dropWhy, top.dropLong], [null, 0, null, false]);
});

test('B: il motivo in parole (per la scritta)', () => {
  assert.equal(dropCause({ dropWhy: null }), null);
  assert.equal(dropCause({ dropWhy: 'lontano' }), 'da troppo lontano');
  assert.equal(dropCause({ dropWhy: 'forte' }), 'gesto troppo forte');
  assert.equal(dropCause({ dropWhy: 'pressione' }), 'scambio lungo');
  assert.equal(dropCause({ dropWhy: 'tempo', t: -1.3, excess: .3 }), 'troppo tardi');
  assert.equal(dropCause({ dropWhy: 'tempo', t: -.8, excess: 0 }), 'in ritardo');
  assert.equal(dropCause({ dropWhy: 'tempo', t: 1.3, excess: .3 }), 'troppo presto');
  assert.equal(dropCause({ dropWhy: 'tempo', t: .8, excess: 0 }), 'in anticipo');
  assert.equal(dropCause({ dropWhy: 'situazione' }, 'in corsa'), 'in corsa');
});

test('B: la CPU legge la palla corta prevedibile: vale quanto è buona e quanto è una sorpresa', () => {
  // la prima palla corta, corta davvero, vale intera; a metà campo niente
  assert.equal(dropThreat({ depth: -2, habit: 0 }), 1);
  assert.equal(dropThreat({ depth: -DROP_READ.near, habit: 0 }), 0);
  assert.ok(dropThreat({ depth: -4.2, habit: 0 }) > 0 && dropThreat({ depth: -4.2, habit: 0 }) < 1);
  // abitudine: ogni colpo il conto vale keep volte, una palla corta aggiunge 1
  assert.ok(dropThreat({ depth: -2, habit: 1 }) < 1 && dropThreat({ depth: -2, habit: DROP_READ.full }) <= 1 - DROP_READ.cut + 1e-9);
  assert.equal(dropExpect(0), 0); assert.equal(dropExpect(10), 1);
  // errore in più della CPU sulla palla corta: proporzionale (1 = come prima)
  const k = lv('pro');
  const base = cpuErrorChance({ shot: 'DROP', cpuDeep: true, level: k }), none = cpuErrorChance({ shot: 'DROP', cpuDeep: true, drop: 0, level: k });
  assert.ok(Math.abs(base - none - k.cpuErr.drop) < 1e-9, `${base} ${none}`);
  // il conto lo fa solo chi gioca contro la CPU (non il Player 2) e la CPU aspetta più avanti
  const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
  assert.equal(dropForward(e), 0, 'senza palle corte la CPU aspetta dove aspettava (0 esatto)');
  for (let i = 0; i < 3; i++) registerPlayerShot(e, { grade: 'PERFECT', quality: 1, power: .2, landingZ: -2, shot: 'drop' });
  assert.ok(dropForward(e) > 2.5 && dropForward(e) <= DROP_READ.forward, `${dropForward(e)}`);
  assert.equal(e.natpfSkill.lastShot.dropHabit, 1.5, 'dropHabit del colpo: il conto prima di questo colpo');
  const before = e.natpfSkill.dropHabit; registerPlayerShot(e, { grade: 'PERFECT', quality: 1, power: .2, shot: 'drop', who: 'p2' });
  assert.equal(e.natpfSkill.dropHabit, before);
  registerPlayerShot(e, { grade: 'PERFECT', quality: 1, power: .6, shot: 'topspin' });
  assert.equal(e.natpfSkill.dropHabit, before*DROP_READ.keep);
});

/* ---------- B. scritte ---------- */
test('B: scritta dell\'esito: «Troppo lunga» in giallo e «In rete» con il perché; il telefono dice lo stesso', () => {
  const long = shotQuality('PERFECT • DROP SHOT', { long: true, cause: 'gesto troppo forte' });
  assert.deepEqual([long.color, long.label, long.cause, qualityText(long)], ['yellow', 'Troppo lunga', 'gesto troppo forte', 'Troppo lunga']);
  const longLate = shotQuality('LATE • DROP SHOT', { long: true, cause: 'in ritardo' });
  assert.equal(qualityText(longLate), 'Troppo lunga · in ritardo');
  const net = shotQuality('PERFECT • DROP SHOT', { net: true, cause: 'da troppo lontano' });
  assert.deepEqual([net.color, net.label, net.cause], ['red', 'In rete', 'da troppo lontano']);
  // «Fuori» resta più forte di «Troppo lunga»; senza palla corta nulla cambia
  assert.equal(shotQuality('PERFECT', { inCourt: false, long: true }).label, 'Fuori');
  assert.deepEqual(shotQuality('PERFECT'), { color: 'green', label: 'Perfetto' });
  // dal colpo appena fatto (natpfLastRacket): solo la palla corta lunga o in rete, solo per chi l'ha fatta, solo adesso
  const L = { who: 'player', at: 5, cause: 'gesto troppo forte', out: { shot: 'DROP', dropLong: true, failed: false, netFault: false } };
  assert.deepEqual(dropOutcome(L, { now: 5 }), { long: true, cause: 'gesto troppo forte' });
  assert.equal(dropOutcome(L, { now: 6 }), null);
  assert.equal(dropOutcome(L, { now: 5, who: 'p2' }), null);
  assert.equal(dropOutcome({ ...L, out: { ...L.out, dropLong: false } }, { now: 5 }), null);
  assert.equal(shotWhy(L, { now: 5 }), 'gesto troppo forte');
  // telefono: grande «Troppo lunga», sotto il perché e il colpo
  const sent = [];
  const phone = Object.create(NatpfPhoneRacket.prototype);
  Object.defineProperty(phone, 'ready', { value: true }); Object.defineProperty(phone, 'role', { value: 'p1' });
  phone.link = { send: m => sent.push(m) };
  phone.feedback({ role: 'p1', kind: 'hit', grade: 'PERFECT • DROP SHOT', shotType: 'drop', quality: long });
  assert.ok(sent[0].long && sent[0].why === 'gesto troppo forte' && !sent[0].out && !sent[0].net, JSON.stringify(sent[0]));
  const f = eventFlash({ k: 'contact', ...sent[0], shot: 'drop' });
  assert.deepEqual([f.big, f.sub], ['Troppo lunga', 'Gesto troppo forte · Palla corta']);
  phone.feedback({ role: 'p1', kind: 'hit', grade: 'PERFECT • DROP SHOT', shotType: 'drop', quality: net });
  assert.deepEqual([eventFlash({ k: 'contact', ...sent[1], shot: 'drop' }).big, eventFlash({ k: 'contact', ...sent[1], shot: 'drop' }).sub], ['In rete', 'Da troppo lontano · Palla corta']);
});

test('B: motore: la palla corta da dietro la riga di fondo viene troppo lunga con il motivo, e l\'esito per il telefono lo dice', () => {
  const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 4;
  e.player.pos.set(.3, 0, 14.6); e.ball.pos.set(.6, .9, 14.25); e.ball.vel.set(0, -1, 12); e.ball.targetLanding.set(.6, 0, 9);
  const swing = { source: 'natpf-phone', side: 'forehand', shotType: 'drop', speed: 1, natpfTau: 0, natpfLateSpan: .1,
    natpf: { aim: 'swing', shot: 'drop', intent: { shot: 'drop', power: .2, depth: .18, rise: -.3, face: 0, conf: .7 }, power: .2, peak: 300, latency: 0, hand: 'right' } };
  const r = e._natpfRacketShot(swing, e.player, { lateral: .3, smash: false, running: 0 });
  assert.ok(r.out.shot === 'DROP' && r.out.dropLong && !r.out.netFault && r.out.dropWhy === 'lontano', JSON.stringify(r.out));
  assert.equal(e.natpfLastRacket.cause, 'da troppo lontano');
  // (qui la palla non parte davvero: rimbalzo dal bersaglio del colpo, a metà campo dall'altra parte)
  e.ball.vel.set(0, 0, 0); e.ball.targetLanding.set(r.out.x, 0, -r.out.depth);
  const q = eventQuality(e, { kind: 'hit', grade: 'PERFECT • DROP SHOT', role: 'p1' });
  assert.deepEqual([q.label, q.color, q.cause], ['Troppo lunga', 'yellow', 'da troppo lontano']);
  // dopo (un altro istante) non vale più
  e.elapsedTime += .5;
  assert.equal(eventQuality(e, { kind: 'hit', grade: 'PERFECT • DROP SHOT', role: 'p1' }).cause, undefined);
});
