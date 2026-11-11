// B25 · Stesso schermo tra due persone (decisioni dell'utente dell'11/11; documento docs/b25/stesso-schermo-equilibrio.md;
// regole in src/natpf/natpf_duo_rules.js):
//   1. lancio automatico (opzione dello staff, spenta di base); 2. campo aperto (opzione dello staff, spenta di base);
//   3. colpo super sulla forza relativa al proprio colpo abituale; 4. preparazione che non conta;
//   5. fasce «Bambino · Ragazzo · Adulto» e aiuto al più giovane.
// Contro la CPU e nella sfida tra due computer non cambia niente.
// node --import ./test/register.mjs --test test/natpf-b25-stesso-schermo.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as ND from '../src/natpf/natpf_duo_rules.js';
import * as NI from '../src/natpf/natpf_impact.js';
import * as NS from '../src/natpf/natpf_skill.js';
import * as NO from '../src/natpf/natpf_stroke_outcome.js';
import { pointServer } from '../src/natpf/natpf_fair_format.js';
import { serveCoachView, AUTO_WARN } from '../src/natpf/natpf_serve_coach.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';

const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const src = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const html = src('../index.html');
const DT = 1/120;
// motore senza grafica nello stesso schermo; set(e) prima di startNewMatch (valori a mano: natpfAutoToss, natpfOpenCourt…)
function splitEngine(set = null, { seed = 17, first = 'player', fair = true } = {}){
  const e = createHeadlessEngine({ difficulty: '1v1' });
  e.startSplit(); e.natpfP2Hand = 'right'; e.natpfFair = fair; e.natpfServeFirst = first; e.natpfRng = mulberry32(seed);
  set?.(e);
  e.startNewMatch({ showStartBanner: false });
  return e;
}
const withSeed = (seed, f) => { const real = Math.random; Math.random = mulberry32(seed); try { return f(); } finally { Math.random = real; } };
const run = (e, s, stop = null) => { for (let t = 0; t < s; t += DT){ e.step(DT); if (stop?.(e)) return true; } return false; };

/* ---------- opzioni dello staff ---------- */
test('opzioni: spente di base, salvate in natpf-tennis.lancioAuto e natpf-tennis.campoAperto; pulsanti del pannello dello stand', () => {
  assert.equal(ND.AUTO_TOSS_KEY, 'natpf-tennis.lancioAuto');
  assert.equal(ND.OPEN_COURT_KEY, 'natpf-tennis.campoAperto');
  const st = memory();
  assert.equal(ND.readAutoToss({ storage: st }), false);
  assert.equal(ND.readOpenCourt({ storage: st }), false);
  assert.equal(ND.writeAutoToss(true, { storage: st }), true);
  assert.equal(st.m.get(ND.AUTO_TOSS_KEY), '1');
  assert.equal(ND.readAutoToss({ storage: st }), true);
  assert.equal(ND.readOpenCourt({ storage: st }), false, 'le due opzioni sono indipendenti');
  ND.writeOpenCourt(true, { storage: st }); ND.writeAutoToss(false, { storage: st });
  assert.equal(st.m.get(ND.OPEN_COURT_KEY), '1'); assert.equal(st.m.get(ND.AUTO_TOSS_KEY), '0');
  assert.equal(ND.readAutoToss({ storage: { getItem(){ throw new Error('no'); } } }), false, 'senza localStorage: spenta');
  assert.equal(ND.autoTossButton(false), 'No'); assert.equal(ND.autoTossButton(true), 'Sì · 30 s');
  assert.equal(ND.openCourtButton(false), 'No'); assert.match(ND.openCourtButton(true), /^Sì/);
  assert.match(ND.autoTossToast(true), /30 secondi.*Vale dalla prossima partita/);
  assert.match(ND.openCourtToast(false), /spento/);
  // pannello dello stand: i due pulsanti, con il nome chiesto dall'utente, e i comandi nel codice
  assert.match(html, /data-staff="autotoss"[^>]*><span>Lancio automatico<\/span><b>No<\/b>/);
  assert.match(html, /data-staff="open"[^>]*><span>Stesso schermo: campo aperto<\/span><b>No<\/b>/);
  const kiosk = src('../src/natpf/natpf_kiosk.js');
  assert.match(kiosk, /cmd === 'autotoss'[\s\S]*writeAutoToss\(!readAutoToss\(\)\)/);
  assert.match(kiosk, /cmd === 'open'[\s\S]*writeOpenCourt\(!readOpenCourt\(\)\)/);
  assert.match(kiosk, /set\('autotoss', autoTossButton\(auto\), auto\)/);
  assert.match(kiosk, /set\('open', openCourtButton\(open\), open\)/);
});

test('regole della partita: solo nello stesso schermo; opzioni e aiuto solo con i due telefoni; valori a mano per le prove', () => {
  const st = memory();
  assert.equal(ND.duoFor({ split: false, storage: st }), null, 'contro la CPU e tra due computer: niente');
  const d = ND.duoFor({ split: true, storage: st });
  assert.deepEqual(d, { autoToss: false, open: false, superRel: true, noPrep: true, help: { p1: null, p2: null }, helped: false });
  ND.writeAutoToss(true, { storage: st }); ND.writeOpenCourt(true, { storage: st });
  const on = ND.duoFor({ split: true, storage: st, bands: { p1: 'bambino', p2: 'adulto' } });
  assert.equal(on.autoToss, true); assert.equal(on.open, true); assert.equal(on.helped, true); assert.equal(on.help.p1.band, 'bambino');
  const cam = ND.duoFor({ split: true, webcam: true, storage: st, bands: { p1: 'bambino', p2: 'adulto' } });
  assert.equal(cam.autoToss, false); assert.equal(cam.open, false); assert.equal(cam.helped, false, 'webcam per due: opzioni e aiuto spenti');
  const f = ND.duoFor({ split: true, storage: memory(), forced: { autoToss: true, openCourt: true, superRel: false, noPrep: false, helpVariant: 'B' }, bands: { p1: 'adulto', p2: 'bambino' } });
  assert.equal(f.autoToss, true); assert.equal(f.open, true); assert.equal(f.superRel, false); assert.equal(f.noPrep, false);
  assert.deepEqual(f.help.p2, { head: 2, band: 'bambino', vs: 'adulto' });
  // nel motore: null contro la CPU, regole nello stesso schermo, null di nuovo quando lo stesso schermo finisce
  const cpu = createHeadlessEngine({ difficulty: 'pro' }); cpu.startNewMatch({ showStartBanner: false });
  assert.equal(cpu.natpfDuo, null);
  const e = splitEngine();
  assert.deepEqual(e.natpfDuo, { autoToss: false, open: false, superRel: true, noPrep: true, help: { p1: null, p2: null }, helped: false });
  e.endSplit();
  assert.equal(e.natpfDuo, null);
});

/* ---------- 1 · lancio automatico ---------- */
test('lancio automatico: 30 s fermi → lancio; dopo un lancio automatico a vuoto 15 s; dopo due a vuoto di fila batte il gioco', () => {
  assert.deepEqual({ ...ND.AUTO_TOSS }, { after: 30, again: 15, misses: 2, serveWait: 5, power: .3, warn: 10 });
  assert.equal(ND.autoTossAction({ idle: 29.9, misses: 0 }), null);
  assert.equal(ND.autoTossAction({ idle: 30, misses: 0 }), 'toss');
  assert.equal(ND.autoTossAction({ idle: 14.9, misses: 1 }), null);
  assert.equal(ND.autoTossAction({ idle: 15, misses: 1 }), 'toss');
  assert.equal(ND.autoTossAction({ idle: 4.9, misses: 2 }), null);
  assert.equal(ND.autoTossAction({ idle: 5, misses: 2 }), 'serve');
  assert.equal(ND.autoTossAction({ idle: 5, misses: 7 }), 'serve');
  assert.deepEqual(ND.autoTossNext({ idle: 22, misses: 0 }), { left: 8, what: 'toss' });
  assert.deepEqual(ND.autoTossNext({ idle: 2, misses: 2 }), { left: 3, what: 'serve' });
  const ev = ND.autoServeEvent('left');
  assert.equal(ev.natpfAuto, true); assert.equal(ev.natpfServeTau, 0); assert.equal(ev.natpf.intent.shot, 'flat'); assert.equal(ev.natpf.intent.power, .3); assert.equal(ev.hand, 'left');
});

test('lancio automatico nel motore: spento il gioco aspetta; acceso lancia dopo 30 s, e la palla non colpita ricade (lancio a vuoto di sempre)', () => withSeed(5, () => {
  const off = splitEngine();
  run(off, 70);
  assert.equal(off.phase, 'SERVE_STANCE', 'spento: dopo 70 s è ancora fermo al servizio');
  assert.equal(off.natpfTossMisses || 0, 0);
  const e = splitEngine(x => { x.natpfAutoToss = true; });
  assert.equal(e.natpfDuo.autoToss, true);
  run(e, 29.5);
  assert.equal(e.phase, 'SERVE_STANCE', 'prima dei 30 s niente');
  assert.ok(run(e, 1, x => x.phase === 'SERVE_TOSS'), 'a 30 s il gioco lancia');
  assert.equal(e.natpfAutoLive, 'toss');
  assert.ok(e.ball.vel.y > 5, 'la palla sale');
  // nessuno colpisce: lancio a vuoto, come quello di chi gioca
  assert.ok(run(e, 3, x => x.phase === 'SERVE_STANCE'));
  assert.equal(e.natpfTossMisses, 1); assert.equal(e.natpfAutoMisses, 1); assert.equal(e.natpfAutoLive, null);
  assert.equal(e.score.playerPoints + e.score.opponentPoints, 0, 'nessun punto perso per il lancio a vuoto');
}));

test('lancio automatico nel motore: dopo due lanci automatici a vuoto il gioco batte un servizio morbido nel quadrato giusto, per il P1 e per il P2', () => withSeed(9, () => {
  for (const first of ['player', 'opponent']){
    const e = splitEngine(x => { x.natpfAutoToss = true; }, { first });
    const t0 = e.elapsedTime;
    assert.ok(run(e, 31, x => x.phase === 'SERVE_TOSS')); assert.ok(run(e, 3, x => x.phase === 'SERVE_STANCE'));
    run(e, 14); assert.equal(e.phase, 'SERVE_STANCE', 'il secondo lancio dopo 15 s, non prima');
    assert.ok(run(e, 2, x => x.phase === 'SERVE_TOSS')); assert.equal(e.natpfAutoLive, 'toss');
    assert.ok(run(e, 3, x => x.phase === 'SERVE_STANCE')); assert.equal(e.natpfAutoMisses, 2);
    assert.ok(run(e, 6, x => x.phase === 'SERVE_TOSS'), 'dopo 5 s lancia ancora'); assert.equal(e.natpfAutoLive, 'serve');
    assert.ok(run(e, 2, x => x.phase === 'RALLY'), 'e al colmo batte il gioco');
    assert.ok(e.elapsedTime - t0 < 60, `in tutto meno di un minuto (${(e.elapsedTime - t0).toFixed(1)} s)`);
    assert.equal(e.ball.lastHitter, first); assert.equal(e.ball.inPlay, true); assert.equal(e.ball.rallyStrokeCount, 1);
    assert.equal(e.natpfAutoMisses, 0); assert.equal(e.natpfAutoLive, null);
    // primo rimbalzo nel quadrato di servizio dell'altro (dal lato giusto: primo punto, da destra), palla lenta
    const b = NI.predictBall(e.ball).find(s => s.bounces === 1), sgn = first === 'player' ? -1 : 1;
    assert.ok(b, 'rimbalza');
    assert.ok(b.z*sgn > 0 && Math.abs(b.z) < 6.4, `${first}: rimbalzo a ${b.z.toFixed(2)} m dalla rete, dentro la riga del servizio`);
    assert.ok(Math.abs(b.x) < 4.115 && b.x*sgn > 0, `${first}: x ${b.x.toFixed(2)} nel quadrato giusto`);
    assert.ok(e.ball.vel.length() < 24, `servizio morbido (${e.ball.vel.length().toFixed(1)} m/s)`);
    // il servizio automatico non insegna il «servizio abituale» di chi batte
    assert.equal(NO.serveRefOf(e, first === 'player' ? e.player : e.opponent).value.n, 0);
  }
}));

test('lancio automatico nel motore: il lancio di chi gioca ricomincia il conto «di fila»; contro la CPU non esiste', () => withSeed(3, () => {
  const e = splitEngine(x => { x.natpfAutoToss = true; });
  assert.ok(run(e, 31, x => x.phase === 'SERVE_TOSS')); assert.ok(run(e, 3, x => x.phase === 'SERVE_STANCE'));
  assert.equal(e.natpfAutoMisses, 1);
  e._handleUserTossInput({});   // adesso lancia lui, e non colpisce
  assert.equal(e.phase, 'SERVE_TOSS'); assert.equal(e.natpfAutoLive, null); assert.equal(e.natpfAutoMisses, 0);
  assert.ok(run(e, 3, x => x.phase === 'SERVE_STANCE'));
  assert.equal(e.natpfAutoMisses, 0, 'il lancio a vuoto di chi gioca non conta tra quelli automatici');
  run(e, 20); assert.equal(e.phase, 'SERVE_STANCE', 'servono di nuovo 30 s');
  // contro la CPU, anche con il valore a mano: nessuna regola dello stesso schermo
  const cpu = createHeadlessEngine({ difficulty: 'casual' }); cpu.natpfAutoToss = true; cpu.natpfServeFirst = 'player'; cpu.startNewMatch({ showStartBanner: false });
  run(cpu, 45);
  assert.equal(cpu.phase, 'SERVE_STANCE'); assert.equal(cpu.natpfTossMisses || 0, 0);
}));

// trovato dalla prova nel browser (tools/e2e/natpf-stesso-schermo-b25.mjs): nel gioco vero natpf_hand avvolge
// _startServeToss (palla nella mano giusta per i mancini) e passava solo il personaggio: il lancio del gioco contava come
// lancio di chi gioca, senza «Lancio automatico» e senza arrivare mai al servizio automatico
test('lancio automatico: chi avvolge _startServeToss lascia passare «chi ha lanciato»', () => {
  assert.match(src('../src/natpf/natpf_hand.js'), /engine\._startServeToss = \(actor, \.\.\.more\) => \{ const r = toss\(actor, \.\.\.more\);/);
  const wrap = e => { const toss = e._startServeToss.bind(e); e._startServeToss = (actor, ...more) => toss(actor, ...more); };
  withSeed(5, () => {
    const e = splitEngine(x => { x.natpfAutoToss = true; wrap(x); });
    assert.ok(run(e, 31, x => x.phase === 'SERVE_TOSS'));
    assert.equal(e.natpfAutoLive, 'toss');
  });
});

test('lancio automatico: lo schermo lo annuncia negli ultimi 10 s, dice «Lancio automatico» e «Servizio automatico»', () => {
  assert.equal(AUTO_WARN, 10);
  const s = { served: { player: 5, opponent: 5 }, missAt: null };
  const g = { phase: 'SERVE_STANCE', mine: true, server: 'player', controller: 'phone', name: 'Marco', idle: 12 };
  assert.deepEqual(serveCoachView(s, { ...g, auto: { left: 18, what: 'toss' } }), { state: 'toss', call: true, big: 'Marco, batti tu', sub: 'Alza il telefono: lanci la palla' }, 'prima degli ultimi 10 s: il richiamo di sempre');
  assert.deepEqual(serveCoachView(s, { ...g, auto: { left: 7.2, what: 'toss' } }), { state: 'toss', call: true, big: 'Marco, batti tu', sub: 'Alza il telefono: lanci la palla · tra 8 s la lancia il gioco' });
  assert.deepEqual(serveCoachView(s, { ...g, idle: 2, auto: { left: 3, what: 'serve' } }), { state: 'toss', call: true, big: 'Marco, batti tu', sub: 'Tra 3 s batte il gioco' });
  assert.deepEqual(serveCoachView(s, { ...g, auto: null }), { state: 'toss', call: true, big: 'Marco, batti tu', sub: 'Alza il telefono: lanci la palla' }, 'opzione spenta: come prima');
  const t = { ...g, phase: 'SERVE_TOSS' };
  assert.deepEqual(serveCoachView(s, { ...t, tossT: .5, autoLive: 'toss' }), { state: 'wait', big: 'Lancio automatico', sub: 'Colpisci quando la palla è in alto' });
  assert.deepEqual(serveCoachView(s, { ...t, tossT: .1, autoLive: 'toss' }), { state: 'go', big: 'Colpisci!', sub: 'Lancio automatico' });
  assert.deepEqual(serveCoachView(s, { ...t, tossT: .5, autoLive: 'serve' }), { state: 'wait', call: true, big: 'Servizio automatico', sub: 'Il gioco batte per Marco' });
  assert.equal(serveCoachView(s, { ...t, tossT: .1 }), null, 'lancio di chi gioca dopo i primi servizi: niente, come prima');
});

/* ---------- 3 · colpo super sulla forza relativa ---------- */
test('colpo super: «fortissimo» è da 1,3 volte il proprio colpo abituale; senza colpo abituale vale la soglia di sempre', () => {
  assert.deepEqual({ ...ND.SUPER_REL }, { ratio: 1.3, min: 260 });
  const ev = (peak, typical, more = {}) => ({ natpf: { peak, typical, ...more } });
  assert.equal(ND.relStrong(ev(494, 380)), true, 'bambino: 494 °/s su 380 (1,3 volte)');
  assert.equal(ND.relStrong(ev(480, 380)), false);
  assert.equal(ND.relStrong(ev(1030, 790)), true, 'adulto medio');
  assert.equal(ND.relStrong(ev(1000, 790)), false);
  assert.equal(ND.relStrong(ev(1300, 1150)), false, 'chi tira sempre forte non ha il super a ogni colpo');
  assert.equal(ND.relStrong(ev(250, 150)), false, 'gesto piccolissimo: mai');
  assert.equal(ND.relStrong(ev(600, 400, { typicalOwn: false })), null, 'colpo tipico ancora della calibrazione: regola di sempre');
  assert.equal(ND.relStrong(ev(600, null)), null); assert.equal(ND.relStrong({}), null); assert.equal(ND.relStrong(ev(NaN, 400)), null);
  assert.equal(ND.relStrong(ev(480, 380), 1.2), true, 'soglia più facile per chi è aiutato (superRatio)');
  // superShot: strong decide al posto della soglia uguale per tutti; null lascia tutto com'era
  const out = { shot: 'TOPSPIN', failed: false, weak: false, netFault: false, excess: 0, t: .1, q: .95 }, base = { out, contact: 1, ballSide: .5, contactY: 1.4, ballVz: 16 };
  const weakArm = { shot: 'topspin', power: .5, typePower: .5, conf: 1 }, strongArm = { shot: 'topspin', power: .95, typePower: .95, conf: 1 };
  assert.equal(NO.superShot({ ...base, intent: weakArm }).on, false);
  assert.deepEqual(NO.superShot({ ...base, intent: weakArm, strong: null }), NO.superShot({ ...base, intent: weakArm }));
  assert.deepEqual(NO.superShot({ ...base, intent: strongArm, strong: null }), NO.superShot({ ...base, intent: strongArm }));
  assert.equal(NO.superShot({ ...base, intent: weakArm, strong: true }).on, true, 'gesto forte per lui: super');
  assert.deepEqual(NO.superShot({ ...base, intent: strongArm, strong: false }).why, ['gesto non abbastanza forte'], 'gesto normale per lui: niente super anche se forte in assoluto');
  // le altre condizioni restano: fuori tempo, in corsa, palla né alta né lenta né corta, colpo tagliato
  assert.deepEqual(NO.superShot({ ...base, intent: weakArm, strong: true, out: { ...out, t: .8 } }).why, ['fuori tempo']);
  assert.deepEqual(NO.superShot({ ...base, intent: weakArm, strong: true, out: { ...out, q: .7 } }).why, ['in corsa o in allungo']);
  assert.deepEqual(NO.superShot({ ...base, intent: weakArm, strong: true, contactY: 1, ballVz: 18 }).why, ['palla né alta, né lenta, né corta']);
  assert.equal(NO.superShot({ ...base, intent: weakArm, strong: true, out: { ...out, shot: 'SLICE' } }).on, false);
  // il telefono dice se il colpo tipico è già quello imparato giocando
  assert.match(src('../src/natpf/natpf_phone_racket.js'), /ev\.natpf\.typicalOwn = this\.typicalModel\.value != null;/);
});

// un colpo nello scambio per il P1 o il P2, di base su una palla comoda e alta all'impatto (1,28 m). Ritorna l'esito
// (engine.natpfLastRacket), il piano d'intercetto e il motore
function strike({ who = 'p1', set = null, split = true, peak = 520, typical = 380, power = .45, typePower = .45, prep = undefined, prepCapable = false, flight = 1.3, to = { x: 1.1, z: 10.2 }, at = { x: .4, z: 11.9 }, lead = .02, rally = 4 } = {}){
  return withSeed(17, () => {
    const e = split ? splitEngine(set, { fair: false }) : createHeadlessEngine({ difficulty: '1v1' });
    if (!split){ e.versus = { active: true }; e.roomId = 'AT-ZZ99'; set?.(e); e.natpfFair = false; e.natpfP2Hand = 'right'; e.startNewMatch({ showStartBanner: false }); }
    const m = who === 'p2' ? -1 : 1, A = who === 'p2' ? e.opponent : e.player, mine = who === 'p2' ? 'opponent' : 'player';
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = who === 'p2' ? 'player' : 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = rally;
    A.pos.set(m*at.x, 0, m*at.z); A.targetPos.copy(A.pos); A.vel.set(0, 0, 0);
    e.pendingUserSwing = null; e.pendingP2Swing = null;
    e.ball.pos.set(-m*.5, 1, -m*11); e.ball.spin.set(0, 0, 0);
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(m*to.x, 0, m*to.z), flight, { topspin: 10 });
    const plan = who === 'p2' ? e._natpfPlanOpponent(e.opponent) : e._natpfPlanPlayer();
    const intent = { shot: 'topspin', power, typePower, depth: power, rise: .3, face: 0, conf: 1 };
    const swing = { source: 'natpf-phone', side: 'forehand', hand: 'right', shotType: ENGINE_SHOT.topspin, speed: .8 + power*.85, dirX: 0, natpf: { aim: 'swing', shot: 'topspin', intent, power, peak, typical, angle: 60, latency: 0, hand: 'right', prepCapable, prep } };
    let sent = false;
    for (let t = 0; t < 4; t += DT){
      const ttc = NI.timeToContact(e, A);
      if (!sent && ttc != null && ttc <= lead){ sent = true; who === 'p2' ? e._handleP2SwingInput(swing) : e._handleUserSwingInput(swing); }
      if (e.ball.lastHitter === mine || e.phase !== 'RALLY') break;
      e.step(DT);
    }
    return { hit: e.ball.lastHitter === mine && e.phase === 'RALLY', L: e.natpfLastRacket, e, plan: NI.planOf(e, A) || plan };
  });
}

test('colpo super nel motore: nello stesso schermo il gesto forte PER LUI (bambino, 520 °/s su 380) fa il super, uguale per il P1 e per il P2', () => {
  for (const who of ['p1', 'p2']){
    const now = strike({ who });
    assert.ok(now.hit, `${who}: colpita`);
    assert.ok(now.L.super, `${who}: super (${now.L.superWhy})`);
    assert.deepEqual(now.L.superWhy.slice(0, 1), ['gesto fortissimo']);
    // gesto normale per lui: niente super
    const usual = strike({ who, peak: 400 });
    assert.ok(usual.hit); assert.equal(usual.L.super, null); assert.deepEqual(usual.L.superWhy, ['gesto non abbastanza forte']);
    // con la regola di prima (spenta a mano) lo stesso gesto non bastava: la forza letta è bassa
    const before = strike({ who, set: e => { e.natpfSuperRel = false; } });
    assert.ok(before.hit); assert.equal(before.L.super, null); assert.deepEqual(before.L.superWhy, ['gesto non abbastanza forte']);
    // profondità e velocità del colpo normale non dipendono dalla regola del super
    const a = strike({ who, peak: 400 }).L, b = strike({ who, peak: 400, set: e => { e.natpfSuperRel = false; } }).L;
    assert.deepEqual([a.out.depth, a.out.x, a.out.clear, a.flight], [b.out.depth, b.out.x, b.out.clear, b.flight]);
  }
});

test('colpo super: la barra della potenza si riempie rispetto alla propria soglia (tra due persone), come prima altrove', async () => {
  const { powerView } = await import('../src/natpf/natpf_power_hud.js');
  assert.equal(ND.relLevel({ natpf: { peak: 494, typical: 380 } }), 1, 'alla soglia');
  assert.ok(Math.abs(ND.relLevel({ natpf: { peak: 380, typical: 380 } }) - 1/1.3) < 1e-9, 'il proprio colpo abituale');
  assert.equal(ND.relLevel({ natpf: { peak: 380 } }), null);
  // bambino: gesto normale per lui → barra sotto la tacca; forte per lui → alla tacca («Fortissimo»)
  const weak = { shot: 'topspin', power: .3, typePower: .3 };
  assert.ok(powerView({ intent: weak, superRel: 1/1.3 }).fill < NO.SUPER.power);
  assert.equal(powerView({ intent: weak, superRel: 1.02 }).label, 'Fortissimo');
  assert.equal(powerView({ intent: weak, superRel: 1.02, super: 'alta' }).label, 'SUPER!');
  // senza il valore (contro la CPU, tra due computer): la forza di sempre
  assert.deepEqual(powerView({ intent: weak, superRel: null }), powerView({ intent: weak }));
  assert.equal(powerView({ intent: weak }).fill, .3);
  // nel motore: lo dice l'esito del colpo nello stesso schermo, non fuori
  assert.ok(Math.abs(strike({ peak: 520, typical: 380 }).L.superRel - 520/(1.3*380)) < 1e-9);
  assert.equal(strike({ split: false }).L.superRel, null);
  assert.equal(strike({ set: e => { e.natpfSuperRel = false; } }).L.superRel, null);
});

test('colpo super nel motore: nella sfida tra due computer resta la soglia uguale per tutti', () => {
  const v = strike({ split: false });
  assert.ok(v.hit);
  assert.equal(v.e.natpfDuo, null);
  assert.equal(v.L.super, null); assert.deepEqual(v.L.superWhy, ['gesto non abbastanza forte']);
  // e un gesto forte in assoluto fa il super come prima
  const s = strike({ split: false, peak: 1300, typical: 790, power: .95, typePower: .95 });
  assert.ok(s.L.super, `super come prima (${s.L.superWhy})`);
});

/* ---------- 4 · preparazione ---------- */
test('preparazione: nello stesso schermo non conta più; con la regola di prima e fuori dallo stesso schermo vale 0,86', () => {
  const noPrep = { prepCapable: true, prep: null, peak: 400 }, withPrep = { prepCapable: true, prep: { lead: .35, amount: .8 }, peak: 400 };
  for (const who of ['p1', 'p2']){
    const a = strike({ who, ...noPrep }).L, b = strike({ who, ...withPrep }).L;
    assert.ok(a && b);
    assert.equal(a.quality, b.quality, `${who}: stessa qualità con e senza preparazione`);
    assert.deepEqual([a.out.depth, a.out.x, a.out.q], [b.out.depth, b.out.x, b.out.q]);
    const old = strike({ who, ...noPrep, set: e => { e.natpfNoPrep = false; } }).L;
    assert.ok(Math.abs(old.quality/b.quality - .86) < .01, `${who}: prima senza preparazione la qualità era × 0,86 (${old.quality} contro ${b.quality})`);
  }
  const v = strike({ split: false, ...noPrep }).L, w = strike({ split: false, ...withPrep }).L;
  assert.ok(Math.abs(v.quality/w.quality - .86) < .01, 'sfida tra due computer: come prima');
  assert.equal(NS.prepQuality({ aim: 'swing', prepCapable: true, prep: null }), .86, 'la funzione (contro la CPU) non è cambiata');
});

/* ---------- 2 · campo aperto ---------- */
test('campo aperto: spento il fattore della corsa è 1 esatto; acceso × 0,6 verso la palla, × 0,2 al rientro, piena sulla risposta al servizio', () => {
  assert.deepEqual({ ...ND.OPEN_COURT }, { speed: .6, recover: .2, react: .1, tight: .8, stretchCost: .6, reach: 1.7, serveFull: true });
  const off = splitEngine(), on = splitEngine(x => { x.natpfOpenCourt = true; });
  assert.equal(ND.openOn(off), false); assert.equal(ND.openOn(on), true);
  for (const e of [off, on]){ e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.rallyStrokeCount = 4; e.ball.lastHitter = 'opponent'; e.ball.vel.set(0, 0, 18); }
  assert.equal(NS.moveFactor(off, off.player), 1); assert.equal(NS.moveFactor(off, off.opponent), 1);
  assert.equal(NS.moveFactor(on, on.player), .6, 'il P1 corre verso la palla');
  assert.equal(NS.moveFactor(on, on.opponent), .2, 'il P2 ha appena colpito: rientra piano');
  on.ball.lastHitter = 'player';
  assert.equal(NS.moveFactor(on, on.player), .2); assert.equal(NS.moveFactor(on, on.opponent), .6, 'uguale per i due lati');
  on.ball.rallyStrokeCount = 1;
  assert.equal(ND.openRun(on), null); assert.equal(NS.moveFactor(on, on.player), 1, 'risposta al servizio: corsa di sempre');
  // contro la CPU, anche con il valore a mano
  const cpu = createHeadlessEngine({ difficulty: 'pro' }); cpu.natpfOpenCourt = true; cpu.startNewMatch({ showStartBanner: false });
  cpu.phase = 'RALLY'; cpu.ball.inPlay = true; cpu.ball.rallyStrokeCount = 4;
  assert.equal(ND.openOn(cpu), false); assert.equal(NS.moveFactor(cpu, cpu.player), 1);
});

test('campo aperto: in allungo la finestra del tempo si stringe e l\'allungo costa di più; la palla non raggiunta si tocca solo da vicino', () => {
  const mk = (on, plan) => { const e = splitEngine(x => { x.natpfOpenCourt = on; }); e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.rallyStrokeCount = 4; e.ball.lastHitter = 'opponent';
    e.ball.pos.set(1, 1, 5); e.natpfPlan = { ...plan, at: e.elapsedTime, t: .4, track: [[0, 1, 5], [.4, 1, 11]] }; return e; };
  const full = { kind: 'stretch', stretch: 1 }, half = { kind: 'ground', stretch: .5 }, calm = { kind: 'ground', stretch: 0 };
  // spento: tutto come prima
  assert.equal(NI.openTight(mk(false, full), mk(false, full).player), 1);
  { const e = mk(false, full); assert.equal(NI.stretchQuality(e, e.player), 1 - NI.PLAN.stretchCost); assert.equal(NI.reachOf(e, e.player), NO.IMPACT.reach); }
  // acceso
  { const e = mk(true, calm); assert.equal(NI.openTight(e, e.player), 1); assert.equal(NI.stretchQuality(e, e.player), 1); assert.equal(NI.reachOf(e, e.player), NO.IMPACT.reach); }
  { const e = mk(true, half); assert.ok(Math.abs(NI.openTight(e, e.player) - .6) < 1e-9); assert.ok(Math.abs(NI.stretchQuality(e, e.player) - .7) < 1e-9); }
  { const e = mk(true, full); assert.ok(Math.abs(NI.openTight(e, e.player) - .2) < 1e-9); assert.ok(Math.abs(NI.stretchQuality(e, e.player) - .4) < 1e-9); assert.equal(NI.reachOf(e, e.player), 1.7); }
});

test('campo aperto nel motore: la palla nell\'angolo lontano si prende comoda da spento, in allungo o per niente da acceso; quella vicina non cambia', () => {
  // chi riceve è fuori dal campo a sinistra (ha appena rimandato da lì); la palla va nell'angolo opposto
  const far = { at: { x: -3.6, z: 11.9 }, to: { x: 3.4, z: 10.4 }, flight: 1.0, peak: 400 };
  for (const who of ['p1', 'p2']){
    const off = strike({ who, ...far }), on = strike({ who, ...far, set: e => { e.natpfOpenCourt = true; } });
    assert.ok(off.hit, `${who}: spento la prende`);
    assert.equal(off.plan.kind, 'ground', `${who}: spento ci arriva`);
    assert.equal(off.L.out.failed, false, `${who}: spento la rimanda`);
    assert.equal(on.plan.kind, 'stretch', `${who}: acceso non ci arriva (allungo ${on.plan.stretch})`);
    assert.ok(!on.hit || on.L.out.failed || on.L.out.q < off.L.out.q - .2, `${who}: acceso non la prende, o la sbaglia`);
    // palla addosso: uguale
    const near = { at: { x: .4, z: 11.7 }, to: { x: 1.2, z: 9.2 }, flight: 1.2, peak: 400 };
    const a = strike({ who, ...near }), b = strike({ who, ...near, set: e => { e.natpfOpenCourt = true; } });
    assert.ok(a.hit && b.hit);
    assert.deepEqual([b.L.out.q, b.L.out.depth, b.L.out.x], [a.L.out.q, a.L.out.depth, a.L.out.x], `${who}: la palla comoda non cambia`);
  }
});

/* ---------- 5 · fasce e aiuto al più giovane ---------- */
test('fasce: Bambino · Ragazzo · Adulto, di base Adulto; fasce uguali nessun aiuto; fasce diverse aiuto solo al più giovane', () => {
  assert.deepEqual([...ND.BANDS], ['bambino', 'ragazzo', 'adulto']);
  assert.equal(ND.BAND_DEFAULT, 'adulto'); assert.equal(ND.bandOf('boh'), 'adulto'); assert.equal(ND.bandOf(undefined), 'adulto'); assert.equal(ND.bandOf('ragazzo'), 'ragazzo');
  for (const b of ND.BANDS) assert.deepEqual(ND.helpFor({ p1: b, p2: b }), { p1: null, p2: null }, `${b} contro ${b}: nessun aiuto`);
  assert.deepEqual(ND.helpFor({}), { p1: null, p2: null });
  assert.equal(ND.HELP_DEFAULT, 'C');
  // variante in gioco (C)
  assert.deepEqual(ND.helpFor({ p1: 'bambino', p2: 'adulto' }), { p1: { head: 1, span: 1.5, late: .06, band: 'bambino', vs: 'adulto' }, p2: null });
  assert.deepEqual(ND.helpFor({ p1: 'adulto', p2: 'bambino' }), { p1: null, p2: { head: 1, span: 1.5, late: .06, band: 'bambino', vs: 'adulto' } });
  assert.deepEqual(ND.helpFor({ p1: 'ragazzo', p2: 'adulto' }).p1, { span: 1.3, late: .03, band: 'ragazzo', vs: 'adulto' });
  assert.deepEqual(ND.helpFor({ p1: 'ragazzo', p2: 'bambino' }).p2, { late: .03, band: 'bambino', vs: 'ragazzo' });
  // le altre varianti restano selezionabili: A solo tempo, B solo punti, 0 niente
  assert.deepEqual(ND.helpFor({ p1: 'bambino', p2: 'adulto' }, 'A').p1, { span: 2, late: .1, band: 'bambino', vs: 'adulto' });
  assert.deepEqual(ND.helpFor({ p1: 'bambino', p2: 'adulto' }, 'B').p1, { head: 2, band: 'bambino', vs: 'adulto' });
  assert.deepEqual(ND.helpFor({ p1: 'bambino', p2: 'adulto' }, '0'), { p1: null, p2: null });
  for (const v of ['A', 'B', 'C']) for (const pair of ['bambino:adulto', 'ragazzo:adulto', 'bambino:ragazzo']) assert.ok(Object.keys(ND.HELP[v][pair]).length, `${v} ${pair}`);
  for (const pair of Object.keys(ND.HELP.A)) assert.ok(!('head' in ND.HELP.A[pair]), 'A: solo tolleranza sul tempo');
  // con il campo aperto acceso la variante C non dà il 15-0 al bambino (lo farebbe vincere più dell'adulto: misurato)
  assert.deepEqual(ND.helpFor({ p1: 'bambino', p2: 'adulto' }, 'C', true).p1, { span: 2, late: .1, band: 'bambino', vs: 'adulto' });
  assert.deepEqual(ND.helpFor({ p1: 'ragazzo', p2: 'adulto' }, 'C', true).p1, ND.helpFor({ p1: 'ragazzo', p2: 'adulto' }, 'C', false).p1, 'le altre coppie non cambiano');
  assert.deepEqual(ND.helpFor({ p1: 'bambino', p2: 'adulto' }, 'B', true).p1, { head: 2, band: 'bambino', vs: 'adulto' }, 'le altre varianti non cambiano');
  assert.equal(ND.duoFor({ split: true, storage: memory(), bands: { p1: 'bambino', p2: 'adulto' }, forced: { openCourt: true } }).help.p1.head, undefined);
  assert.equal(ND.duoFor({ split: true, storage: memory(), bands: { p1: 'bambino', p2: 'adulto' } }).help.p1.head, 1);
  for (const pair of Object.keys(ND.HELP.B)) assert.deepEqual(Object.keys(ND.HELP.B[pair]), ['head'], 'B: solo punti');
  // dichiarato in modo sobrio
  const h = ND.helpFor({ p1: 'bambino', p2: 'adulto' }).p1;
  assert.equal(ND.helpLabel(h), 'Aiuto: Bambino'); assert.equal(ND.helpLabel(null), '');
  assert.equal(ND.helpText(h), 'Aiuto: Bambino · parte da 15-0 e ha più margine sul tempo');
  assert.equal(ND.helpText(ND.helpFor({ p1: 'adulto', p2: 'ragazzo' }).p2), 'Aiuto: Ragazzo · ha più margine sul tempo');
  assert.equal(ND.helpText(ND.helpFor({ p1: 'bambino', p2: 'adulto' }, 'B').p1), 'Aiuto: Bambino · parte da 30-0');
  assert.equal(ND.helpText(null), '');
  assert.equal(ND.helpSentence(h, 'Giulia'), 'Aiuto a Giulia (Bambino): parte da 15-0 e ha più margine sul tempo.');
  assert.equal(ND.helpSentence(ND.helpFor({ p1: 'adulto', p2: 'ragazzo' }).p2, 'Marco'), 'Aiuto a Marco (Ragazzo): ha più margine sul tempo.');
  assert.equal(ND.helpSentence(null, 'Marco'), '');
});

test('fasce: sulla scheda di ciascun giocatore nella pagina dei telefoni; «Nuovo giocatore» e il chiosco le riportano ad Adulto; in campo «Aiuto: …» sotto il nome', () => {
  for (const id of ['p1', 'p2']){
    for (const b of ['bambino', 'ragazzo', 'adulto']) assert.match(html, new RegExp(`data-split-band="${id}:${b}"`));
    // dentro la scheda del giocatore, accanto alla mano
    const card = html.slice(html.indexOf(`data-split-player="${id}"`), html.indexOf(`data-split-skip="${id}"`));
    assert.match(card, new RegExp(`data-split-hand="${id}:right"[\\s\\S]*data-split-band="${id}:adulto"`));
  }
  const ui = src('../src/natpf/natpf_split_ui.js');
  assert.match(ui, /engine\.natpfSplitBands = \{ p1: BAND_DEFAULT, p2: BAND_DEFAULT \};/);
  assert.match(ui, /resetNames\(\)\{[\s\S]*?this\.resetBands\(\);/, '«Nuovo giocatore» (resetNames) azzera anche le fasce');
  assert.match(ui, /helpLabel\(E\.natpfDuo\?\.help\?\.\[id\]\)/, 'targhetta in campo');
  assert.match(ui, /const help = this\.helpNote\(\);\s*if \(help\) sub = `\$\{sub\} \$\{help\}`;/, 'dichiarato nella barra dell\'avvio e nel conto alla rovescia');
  assert.match(src('../src/natpf/natpf_kiosk.js'), /ui\.split\?\.resetBands\?\.\(\);/);
  assert.match(src('../src/natpf/natpf_new_player.js'), /E\.natpfSplitBands = \{ p1: 'adulto', p2: 'adulto' \}/);
  // misure legate allo schermo con cqw/cqh, non vw/vh
  const css = src('../natpf-ui.css'), rules = css.split('\n').filter(l => /split-band|split-tag\.helped/.test(l)).join('\n');
  assert.ok(rules.length > 0); assert.doesNotMatch(rules, /\d(vw|vh)\b/);
});

test('aiuto nel motore: fasce uguali o Adulto per tutti e due, niente; bambino contro adulto parte da 15-0 a ogni game e ha più margine in ritardo', () => withSeed(21, () => {
  const none = splitEngine(e => { e.natpfSplitBands = { p1: 'ragazzo', p2: 'ragazzo' }; });
  assert.equal(none.natpfDuo.helped, false); assert.equal(none.natpfHead, 0);
  assert.deepEqual([none.score.playerPoints, none.score.opponentPoints], [0, 0]);
  assert.equal(NI.lateMargin(none, none.player), 0); assert.equal(NI.lateMargin(none, none.opponent), 0);
  assert.equal(ND.helpLevel(NS.skillLevel('1v1'), null), NS.skillLevel('1v1'), 'senza aiuto il livello è lo stesso oggetto');
  for (const [bands, young, old] of [[{ p1: 'bambino', p2: 'adulto' }, 'player', 'opponent'], [{ p1: 'adulto', p2: 'bambino' }, 'opponent', 'player']]){
    const e = splitEngine(x => { x.natpfSplitBands = bands; x.matchConfig.gamesToWin = 2; }, { fair: false });
    assert.equal(e.natpfDuo.helped, true); assert.equal(e.natpfHead, 1);
    assert.equal(e.score[young + 'Points'], 1, 'parte da 15-0'); assert.equal(e.score[old + 'Points'], 0);
    assert.equal(NI.lateMargin(e, e[young]), .06); assert.equal(NI.lateMargin(e, e[old]), 0);
    assert.equal(ND.helpLevel(NS.skillLevel('1v1'), ND.helpOf(e, e[young])).timingSpan, NS.skillLevel('1v1').timingSpan*1.5);
    assert.equal(ND.helpOf(e, e[old]), null);
    // tre punti al più giovane chiudono il game (da 15-0); il game dopo riparte da 15-0
    for (let i = 0; i < 3; i++) e._awardPoint(young, 'Out');
    assert.equal(e.score[young + 'Games'], 1);
    assert.equal(e.score[young + 'Points'], 1, 'anche il secondo game parte da 15-0'); assert.equal(e.score[old + 'Points'], 0);
    assert.equal(e.phase, 'POINT_OVER');
    // a fine partita il tabellone resta sul risultato (niente 15-0 dopo l'ultimo game)
    for (let i = 0; i < 3; i++) e._awardPoint(young, 'Out');
    assert.equal(e.phase, 'MATCH_OVER'); assert.deepEqual([e.score.playerPoints, e.score.opponentPoints], [0, 0]);
  }
}));

test('aiuto nel motore: con il formato in fiera i punti di vantaggio non spostano chi batte (A, B B, A A…)', () => withSeed(4, () => {
  const servers = bands => { const e = splitEngine(x => { x.natpfSplitBands = bands; x.natpfHelpVariant = 'B'; }, { fair: true, first: 'player' });
    const s = [e.score.server]; e._awardPoint('opponent', 'Out'); s.push(e.score.server); e._awardPoint('opponent', 'Out'); s.push(e.score.server); e._awardPoint('opponent', 'Out'); s.push(e.score.server);
    return { s, pts: [e.score.playerPoints, e.score.opponentPoints], head: e.natpfHead }; };
  const plain = servers({ p1: 'adulto', p2: 'adulto' }), helped = servers({ p1: 'bambino', p2: 'adulto' });
  assert.deepEqual(plain.s, [0, 1, 2, 3].map(n => pointServer('player', n)));
  assert.deepEqual(helped.s, plain.s, 'stessi battitori con e senza i punti di vantaggio');
  assert.equal(helped.head, 2); assert.deepEqual(helped.pts, [2, 3], 'il bambino è partito da 30-0');
  assert.deepEqual(plain.pts, [0, 3]);
}));

test('aiuto nel motore: lo stesso colpo in ritardo va fuori per l\'adulto e resta in campo per il bambino aiutato; il voto del colpo non cambia', () => {
  const late = { lead: -.15, peak: 400, flight: 1.2, to: { x: 1.2, z: 9.2 }, at: { x: .4, z: 11.7 } };
  for (const who of ['p1', 'p2']){
    const young = who === 'p1' ? { p1: 'bambino', p2: 'adulto' } : { p1: 'adulto', p2: 'bambino' };
    const plain = strike({ who, ...late }), helped = strike({ who, ...late, set: e => { e.natpfSplitBands = young; e.natpfHelpVariant = 'A'; } });
    assert.ok(plain.hit && helped.hit, `${who}: colpita`);
    assert.ok(plain.L.out.excess > 0, `${who}: senza aiuto fuori dalla finestra (${plain.L.out.t})`);
    assert.ok(Math.abs(helped.L.out.t) < Math.abs(plain.L.out.t)*.7, `${who}: con l'aiuto il ritardo pesa meno (${plain.L.out.t} → ${helped.L.out.t})`);
    assert.ok(Math.abs(helped.L.out.x) < Math.abs(plain.L.out.x), `${who}: palla meno larga (${plain.L.out.x} → ${helped.L.out.x})`);
    assert.equal(helped.L.out.grade, plain.L.out.grade, 'il voto resta quello del tempo vero');
    // l'altro (l'adulto) non è aiutato: stesso esito di prima
    const other = who === 'p1' ? { p1: 'adulto', p2: 'bambino' } : { p1: 'bambino', p2: 'adulto' };
    const adult = strike({ who, ...late, set: e => { e.natpfSplitBands = other; e.natpfHelpVariant = 'A'; } });
    assert.deepEqual([adult.L.out.t, adult.L.out.x, adult.L.out.depth], [plain.L.out.t, plain.L.out.x, plain.L.out.depth]);
  }
});

/* ---------- con tutto spento, lo stesso schermo è quello di f08243a ---------- */
// Impronte prese sul commit f08243a con scripts/audit/b25/impronte.mjs (risultati/impronte-prima-f08243a.txt). Con le
// opzioni spente, le fasce uguali e le due regole che valgono sempre (super relativo, preparazione) spente a mano, ogni punto
// e ogni colpo sono gli stessi. Se un giorno le regole dello stesso schermo cambiano apposta, queste impronte vanno rifatte.
test('con le opzioni spente, le fasce uguali e le due regole nuove spente a mano le partite sono identiche a f08243a, punto per punto', async () => {
  const { many } = await import('../scripts/audit/b19/due-umani.mjs');
  const sha = x => createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 12);
  const print = (a, fair, tweak) => { const r = many({ a, b: a, fair, matches: 20, tweak }, [7001, 7103, 7207]); return sha([r.pts.map(p => [p.win, p.n, p.kind, p.srv, p.why]), r.shots.map(s => [s.k, s.shot, s.grade, s.q, s.x, s.depth, s.sup, s.flight])]); };
  const before = e => { e.natpfSuperRel = false; e.natpfNoPrep = false; };
  assert.equal(print('bambino', true, before), '909a097fe488');
  assert.equal(print('bambino', false, before), 'f25564be9708');
  assert.equal(print('medio', true, e => { before(e); e.natpfSplitBands = { p1: 'ragazzo', p2: 'ragazzo' }; e.natpfAutoToss = false; e.natpfOpenCourt = false; }), 'b557aa21ae9f');
  // e con le regole di oggi cambia (il super parte anche per il bambino)
  assert.notEqual(print('bambino', true, null), '909a097fe488');
});
