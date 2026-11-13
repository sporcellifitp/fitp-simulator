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
import { netPlayRules } from '../src/natpf/natpf_net_play.js';
const B31_PRINTS = ['6356d1e265b8', '750b592d650e'];   // impronte con il gioco a rete (B31), prese con questo stesso test (revisione finale: senza il passo corto nascosto a rete nel piano cambiano; prima 1eb7dff8db39, 7ac4aa5b8ef1)
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
  const f = ND.duoFor({ split: true, storage: memory(), forced: { autoToss: true, openCourt: true, superRel: false, noPrep: false, helpVariant: 'A' }, bands: { p1: 'adulto', p2: 'bambino' } });
  assert.equal(f.autoToss, true); assert.equal(f.open, true); assert.equal(f.superRel, false); assert.equal(f.noPrep, false);
  assert.deepEqual(f.help.p2, { span: 2, late: .1, band: 'bambino', vs: 'adulto' });
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
  assert.deepEqual({ ...ND.OPEN_COURT }, { speed: .6, recover: .2, react: .1, tight: .8, stretchCost: .6, reach: 1.7, serveFull: true, altServe: true });
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

// Revisione del B25 (bloccante): con il campo aperto la risposta al servizio è a corsa piena e il primo in allungo è chi ha
// battuto, che vince 44–47 punti su 100; con un battitore per game, nella partita classica a 1 game decideva il sorteggio
// (chi batteva per primo vinceva 37–44 partite su 100). Con il campo aperto il servizio passa ogni due punti, sempre
test('campo aperto e servizio: acceso, il servizio passa ogni due punti (A, B B, A A…) anche nel formato classico; parità e vantaggi restano; spento o contro la CPU un battitore per game', () => {
  // punti dati a mano: sequenza dei battitori punto per punto
  const servers = (e, wins) => { const s = [e.score.server]; for (const w of wins){ e._awardPoint(w, 'Out'); s.push(e.score.server); } return s; };
  const alt = n => Array.from({ length: n }, (_, i) => pointServer('player', i));
  const wins = ['player', 'opponent', 'player', 'opponent', 'player', 'opponent'];   // fino a 40-40
  // classico, campo aperto spento: batte sempre il primo (com'era)
  const off = splitEngine(null, { fair: false, first: 'player' });
  assert.equal(ND.altServe(off, false), false);
  assert.deepEqual(servers(off, wins), Array(7).fill('player'));
  // classico, campo aperto acceso: A, B B, A A, B B…
  const on = splitEngine(x => { x.natpfOpenCourt = true; x.matchConfig.gamesToWin = 2; }, { fair: false, first: 'player' });
  assert.equal(on.score.fair, false, 'il formato resta classico'); assert.equal(ND.altServe(on, false), true);
  assert.deepEqual(servers(on, wins), alt(7), 'servizio ogni due punti');
  assert.deepEqual(alt(7), ['player', 'opponent', 'opponent', 'player', 'player', 'opponent', 'opponent']);
  // … ma il game si vince come nel classico: sul 40-40 niente punto decisivo, servono due punti di scarto
  assert.deepEqual([on.score.playerPoints, on.score.opponentPoints], [3, 3]);
  on._awardPoint('player', 'Out');
  assert.deepEqual([on.score.playerPoints, on.score.opponentPoints, on.score.playerGames], [4, 3, 0], 'vantaggio, il game continua');
  assert.equal(on.score.server, pointServer('player', 7), 'e il servizio continua a passare');
  // niente «Break Point»: il game non è di chi batte (qui batte il P1 ed è palla game del P2)
  on._awardPoint('opponent', 'Out'); on._awardPoint('opponent', 'Out');
  assert.deepEqual([on.score.playerPoints, on.score.opponentPoints], [4, 5]);
  on.score.server = 'player';
  assert.equal(on._getHighStakesPointLabel(), 'Game Point');
  off.score.playerPoints = 2; off.score.opponentPoints = 3; off.score.server = 'player';
  assert.equal(off._getHighStakesPointLabel(), 'Break Point', 'spento, nel classico resta la palla break');
  // game finito: il game dopo lo inizia l'altro
  on.score.server = pointServer('player', 9);
  on._awardPoint('opponent', 'Out');
  assert.deepEqual([on.score.opponentGames, on.score.playerPoints, on.score.opponentPoints], [1, 0, 0]);
  assert.equal(on.score.server, 'opponent'); assert.equal(on.score.gameServer, 'opponent');
  on._awardPoint('player', 'Out');
  assert.equal(on.score.server, 'player', 'nel secondo game: B, A A…');
  // formato in fiera: come sempre, con il campo aperto acceso o spento
  for (const open of [false, true]){
    const f = splitEngine(x => { x.natpfOpenCourt = open; }, { fair: true, first: 'opponent' });
    assert.deepEqual(servers(f, wins.slice(0, 5)), Array.from({ length: 6 }, (_, i) => pointServer('opponent', i)));
  }
  // con l'aiuto al più giovane (solo di gioco: nessun punto regalato) si parte da 0-0 e i battitori sono gli stessi
  const helped = splitEngine(x => { x.natpfOpenCourt = true; x.natpfSplitBands = { p1: 'bambino', p2: 'adulto' }; }, { fair: false, first: 'player' });
  assert.equal(helped.natpfDuo.helped, true); assert.deepEqual([helped.score.playerPoints, helped.score.opponentPoints], [0, 0]);
  assert.deepEqual(servers(helped, ['opponent', 'opponent', 'opponent']), alt(4));
  assert.deepEqual([helped.score.playerPoints, helped.score.opponentPoints], [0, 3]);
  // contro la CPU non esiste, nemmeno con il valore a mano; e il valore di prova lo spegne (misure «prima»)
  const cpu = createHeadlessEngine({ difficulty: 'pro' }); cpu.natpfOpenCourt = true; cpu.natpfFair = false; cpu.natpfServeFirst = 'player'; cpu.startNewMatch({ showStartBanner: false });
  assert.equal(ND.altServe(cpu, false), false); assert.equal(ND.altServe(cpu, true), true);
  assert.deepEqual(servers(cpu, wins), Array(7).fill('player'));
  ND.openTuning.altServe = false;
  try { assert.equal(ND.altServe(on, false), false); } finally { delete ND.openTuning.altServe; }
  // lo dicono l'avviso del pannello e il suggerimento del pulsante
  assert.match(ND.openCourtToast(true), /Il servizio passa ogni due punti, come nel formato in fiera/);
  assert.match(html, /data-staff="open" title="[^"]*Il servizio passa ogni due punti, come nel formato in fiera, anche con il formato classico/);
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

// come strike, da P1, con il gesto del pallonetto (forma chiara)
function strikeLob(set = null){
  return withSeed(17, () => {
    const e = splitEngine(set, { fair: false }), A = e.player;
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 4;
    A.pos.set(.4, 0, 11.7); A.targetPos.copy(A.pos); A.vel.set(0, 0, 0); e.pendingUserSwing = null; e.pendingP2Swing = null;
    e.ball.pos.set(-.5, 1, -11); e.ball.spin.set(0, 0, 0);
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(1.2, 0, 9.2), 1.2, { topspin: 10 });
    e._natpfPlanPlayer();
    const intent = { shot: 'lob', power: .45, typePower: .45, depth: .45, rise: .8, face: 0, conf: 1 };
    const swing = { source: 'natpf-phone', side: 'forehand', hand: 'right', shotType: ENGINE_SHOT.lob, speed: 1.1, dirX: 0, natpf: { aim: 'swing', shot: 'lob', intent, power: .45, peak: 400, typical: 380, angle: 60, latency: 0, hand: 'right' } };
    let sent = false;
    for (let t = 0; t < 4; t += DT){
      const ttc = NI.timeToContact(e, A);
      if (!sent && ttc != null && ttc <= 0){ sent = true; e._handleUserSwingInput(swing); }
      if (e.ball.lastHitter === 'player' || e.phase !== 'RALLY') break;
      e.step(DT);
    }
    return { hit: e.ball.lastHitter === 'player', L: e.natpfLastRacket, e };
  });
}

/* ---------- 5 · fasce e aiuto al più giovane ---------- */
test('fasce: Bambino · Ragazzo · Adulto, di base Adulto; fasce uguali nessun aiuto; fasce diverse aiuto solo al più giovane', () => {
  assert.deepEqual([...ND.BANDS], ['bambino', 'ragazzo', 'adulto']);
  assert.equal(ND.BAND_DEFAULT, 'adulto'); assert.equal(ND.bandOf('boh'), 'adulto'); assert.equal(ND.bandOf(undefined), 'adulto'); assert.equal(ND.bandOf('ragazzo'), 'ragazzo');
  for (const b of ND.BANDS) assert.deepEqual(ND.helpFor({ p1: b, p2: b }), { p1: null, p2: null }, `${b} contro ${b}: nessun aiuto`);
  assert.deepEqual(ND.helpFor({}), { p1: null, p2: null });
  assert.equal(ND.HELP_DEFAULT, 'G');
  // variante in gioco (G): solo di gioco. Bambino contro adulto: margine sul tempo, palla verso di lui più lenta, il suo
  // colpo più in fondo; tra fasce vicine solo il margine sul tempo
  const G = { span: 2, late: .1, slow: 1.1, deep: 1, band: 'bambino', vs: 'adulto' };
  assert.deepEqual(ND.helpFor({ p1: 'bambino', p2: 'adulto' }), { p1: G, p2: null });
  assert.deepEqual(ND.helpFor({ p1: 'adulto', p2: 'bambino' }), { p1: null, p2: G });
  assert.deepEqual(ND.helpFor({ p1: 'ragazzo', p2: 'adulto' }).p1, { span: 1.3, late: .03, band: 'ragazzo', vs: 'adulto' });
  assert.deepEqual(ND.helpFor({ p1: 'ragazzo', p2: 'bambino' }).p2, { late: .03, band: 'bambino', vs: 'ragazzo' });
  // per le prove e le misure: A solo margine sul tempo, 0 niente. Le varianti con i punti (B, C dell'11/11) non esistono più
  assert.deepEqual(Object.keys(ND.HELP), ['0', 'A', 'G']);
  assert.deepEqual(ND.helpFor({ p1: 'bambino', p2: 'adulto' }, 'A').p1, { span: 2, late: .1, band: 'bambino', vs: 'adulto' });
  assert.deepEqual(ND.helpFor({ p1: 'bambino', p2: 'adulto' }, '0'), { p1: null, p2: null });
  assert.deepEqual(ND.helpFor({ p1: 'bambino', p2: 'adulto' }, 'B'), ND.helpFor({ p1: 'bambino', p2: 'adulto' }), 'una variante che non esiste: quella in gioco');
  for (const v of ['A', 'G']) for (const pair of ['bambino:adulto', 'ragazzo:adulto', 'bambino:ragazzo']) assert.ok(Object.keys(ND.HELP[v][pair]).length, `${v} ${pair}`);
  // valori moderati: la palla dell'altro non diventa un pallonetto (misurato: sopra 1,2 sì), il colpo allungato resta in campo
  for (const v of ['A', 'G']) for (const P of [...Object.values(ND.HELP[v]).filter(x => !x['bambino:adulto']), ...Object.values(ND.HELP[v].open || {})]){
    assert.ok((P.slow ?? 1) >= 1 && (P.slow ?? 1) <= 1.15, `${v}: palla più lenta al massimo del 15% (${P.slow})`);
    assert.ok((P.deep ?? 0) >= 0 && (P.deep ?? 0) <= 1.5, `${v}: colpo più in fondo al massimo di 1,5 m (${P.deep})`);
    assert.ok((P.late ?? 0) <= .1 && (P.span ?? 1) <= 2);
  }
  assert.ok(ND.HELP_DEEP_MAX < 11.89 - .5, 'il colpo allungato cade almeno mezzo metro dentro la riga di fondo');
  // con il campo aperto acceso il bambino contro l'adulto ha solo il margine sul tempo (con le tre leve farebbe pari: misurato)
  assert.deepEqual(ND.helpFor({ p1: 'bambino', p2: 'adulto' }, 'G', true).p1, { span: 2, late: .1, band: 'bambino', vs: 'adulto' });
  assert.deepEqual(ND.helpFor({ p1: 'ragazzo', p2: 'adulto' }, 'G', true).p1, ND.helpFor({ p1: 'ragazzo', p2: 'adulto' }, 'G', false).p1, 'le altre coppie non cambiano');
  assert.deepEqual(ND.helpFor({ p1: 'bambino', p2: 'adulto' }, 'A', true).p1, { span: 2, late: .1, band: 'bambino', vs: 'adulto' }, 'la A non cambia');
  assert.deepEqual(ND.duoFor({ split: true, storage: memory(), bands: { p1: 'bambino', p2: 'adulto' }, forced: { openCourt: true } }).help.p1, { span: 2, late: .1, band: 'bambino', vs: 'adulto' });
  assert.deepEqual(ND.duoFor({ split: true, storage: memory(), bands: { p1: 'bambino', p2: 'adulto' } }).help.p1, G);
  // dichiarato in modo sobrio, per quello che è, senza genere
  const h = ND.helpFor({ p1: 'bambino', p2: 'adulto' }).p1;
  assert.equal(ND.helpLabel(h), 'Aiuto: Bambino'); assert.equal(ND.helpLabel(null), '');
  assert.deepEqual(ND.helpParts(h), ['ha più margine sul tempo', 'riceve palle più lente', 'tira più in fondo']);
  assert.equal(ND.helpText(h), 'Aiuto: Bambino · ha più margine sul tempo, riceve palle più lente e tira più in fondo');
  assert.equal(ND.helpText(ND.helpFor({ p1: 'adulto', p2: 'ragazzo' }).p2), 'Aiuto: Ragazzo · ha più margine sul tempo');
  assert.equal(ND.helpText({ band: 'bambino', span: 2, slow: 1.1 }), 'Aiuto: Bambino · ha più margine sul tempo e riceve palle più lente');
  assert.equal(ND.helpText({ band: 'bambino' }), 'Aiuto: Bambino'); assert.deepEqual(ND.helpParts(null), []);
  assert.equal(ND.helpSentence(h, 'Giulia'), 'Aiuto a Giulia (Bambino): ha più margine sul tempo, riceve palle più lente e tira più in fondo.');
  assert.equal(ND.helpSentence(ND.helpFor({ p1: 'bambino', p2: 'adulto' }, 'G', true).p1, 'Giulia'), 'Aiuto a Giulia (Bambino): ha più margine sul tempo.', 'con il campo aperto acceso');
  assert.equal(ND.helpSentence(ND.helpFor({ p1: 'adulto', p2: 'ragazzo' }).p2, 'Marco'), 'Aiuto a Marco (Ragazzo): ha più margine sul tempo.');
  assert.equal(ND.helpSentence(h), 'Aiuto a chi è più giovane (Bambino): ha più margine sul tempo, riceve palle più lente e tira più in fondo.');
  assert.equal(ND.helpText(null), ''); assert.equal(ND.helpSentence(null, 'Marco'), '');
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
  // revisione: «Aiuto» sulla scheda di chi è aiutato (dove la barra dell'avvio è sotto il bordo si vede lo stesso)
  for (const id of ['p1', 'p2']) assert.match(html, new RegExp(`data-split-band="${id}:adulto">Adulto</button><i class="band-help" data-band-help="${id}">Aiuto</i></div>`));
  assert.match(ui, /tag\.parentElement\.classList\.toggle\('helped', id === helped\)/);
  assert.match(ui, /helpedId\(\)\{\s*if \(this\.webcam\) return null;/, 'con la webcam per due niente aiuto dichiarato');
  assert.match(ui, /const help = this\.helpNote\(\);\s*if \(help\) sub = `\$\{sub\} \$\{help\}`;/, 'dichiarato nella barra dell\'avvio e nel conto alla rovescia');
  assert.match(src('../src/natpf/natpf_kiosk.js'), /ui\.split\?\.resetBands\?\.\(\);/);
  assert.match(src('../src/natpf/natpf_new_player.js'), /E\.natpfSplitBands = \{ p1: 'adulto', p2: 'adulto' \}/);
  // misure legate allo schermo con cqw/cqh, non vw/vh
  const css = src('../natpf-ui.css'), rules = css.split('\n').filter(l => /split-band|split-tag\.helped|band-help/.test(l)).join('\n');
  assert.match(css, /\.split-band \.band-help \{ display: none; position: absolute;/, 'non occupa spazio sulla scheda');
  assert.match(css, /\.split-band\.helped \.band-help \{ display: block; \}/);
  assert.ok(rules.length > 0); assert.doesNotMatch(rules, /\d(vw|vh)\b/);
});

// Decisione dell'utente del 12/11: «non voglio che nessuno abbia un vantaggio di punti, voglio solo che il vantaggio si
// traduca nel gameplay». Il 15-0 e il 30-0 dell'11/11 sono tolti: nessuna variante, nessuna coppia, nessun caso li dà
test('nessun punto regalato, mai: ogni game parte da 0-0 con ogni coppia di fasce, con il campo aperto acceso o spento, nel formato in fiera e classico', () => withSeed(21, () => {
  const scan = (o, path = 'HELP') => { for (const [k, v] of Object.entries(o)){ assert.notEqual(k, 'head', `${path}.${k}`); if (v && typeof v === 'object') scan(v, `${path}.${k}`); } };
  scan(ND.HELP);
  assert.equal(ND.headStart, undefined, 'la regola dei punti di vantaggio non esiste più');
  const engineSrc = src('../src/game_engine.js'), rules = src('../src/natpf/natpf_duo_rules.js'), ui = src('../src/natpf/natpf_split_ui.js');
  assert.doesNotMatch(engineSrc, /natpfHead|headStart|_natpfHeadStart/);
  assert.doesNotMatch(rules, /export function headStart|parte da \$\{|\bhead:/);
  for (const [name, text] of [['regole', rules], ['pagina dei telefoni', ui], ['index.html', html]]) assert.doesNotMatch(text.replace(/\/\/.*|<!--[\s\S]*?-->/g, ''), /parte da (15|30)-0/, name);
  for (const v of Object.keys(ND.HELP)) for (const young of ND.BANDS) for (const old of ND.BANDS) for (const open of [false, true]){
    const h = ND.helpFor({ p1: young, p2: old }, v, open);
    for (const x of [h.p1, h.p2]){ assert.ok(!x || !('head' in x)); assert.doesNotMatch(ND.helpSentence(x, 'Giulia'), /parte da|15-0|30-0|punt/); }
  }
  for (const bands of [{ p1: 'bambino', p2: 'adulto' }, { p1: 'adulto', p2: 'bambino' }, { p1: 'ragazzo', p2: 'adulto' }, { p1: 'bambino', p2: 'ragazzo' }]) for (const fair of [true, false]) for (const open of [false, true]){
    const e = splitEngine(x => { x.natpfSplitBands = bands; x.natpfOpenCourt = open; x.matchConfig.gamesToWin = 2; }, { fair });
    const tag = `${bands.p1}-${bands.p2} ${fair ? 'fiera' : 'classico'} ${open ? 'campo aperto' : ''}`;
    assert.equal(e.natpfDuo.helped, true, tag);
    assert.deepEqual([e.score.playerPoints, e.score.opponentPoints], [0, 0], `${tag}: la partita parte da 0-0`);
    // un punto vale un punto; quattro punti chiudono il game e il game dopo riparte da 0-0
    e._awardPoint('player', 'Out');
    assert.deepEqual([e.score.playerPoints, e.score.opponentPoints], [1, 0], tag);
    for (let i = 0; i < 3; i++) e._awardPoint('player', 'Out');
    assert.deepEqual([e.score.playerGames, e.score.playerPoints, e.score.opponentPoints], [1, 0, 0], `${tag}: il secondo game parte da 0-0`);
    for (let i = 0; i < 4; i++) e._awardPoint('opponent', 'Out');
    assert.deepEqual([e.score.opponentGames, e.score.playerPoints, e.score.opponentPoints], [1, 0, 0], tag);
  }
}));

test('aiuto nel motore: fasce uguali o Adulto per tutti e due, niente; il più giovane ha più margine sul tempo, l\'altro no; chi batte non cambia', () => withSeed(21, () => {
  const none = splitEngine(e => { e.natpfSplitBands = { p1: 'ragazzo', p2: 'ragazzo' }; });
  assert.equal(none.natpfDuo.helped, false);
  assert.equal(NI.lateMargin(none, none.player), 0); assert.equal(NI.lateMargin(none, none.opponent), 0);
  assert.equal(ND.helpLevel(NS.skillLevel('1v1'), null), NS.skillLevel('1v1'), 'senza aiuto il livello è lo stesso oggetto');
  for (const a of [none.player, none.opponent]) for (const shot of ['', 'TOPSPIN', 'LOB']) assert.equal(ND.slowFor(none, a, shot), 1);
  const out = { depth: 9, shot: 'TOPSPIN' };
  assert.equal(ND.helpOutcome(out, ND.helpOf(none, none.player)), out, 'senza aiuto l\'esito è lo stesso oggetto');
  for (const [bands, young, old] of [[{ p1: 'bambino', p2: 'adulto' }, 'player', 'opponent'], [{ p1: 'adulto', p2: 'bambino' }, 'opponent', 'player']]){
    const e = splitEngine(x => { x.natpfSplitBands = bands; x.matchConfig.gamesToWin = 2; }, { fair: false });
    assert.equal(e.natpfDuo.helped, true);
    assert.equal(NI.lateMargin(e, e[young]), .1); assert.equal(NI.lateMargin(e, e[old]), 0);
    assert.equal(ND.helpLevel(NS.skillLevel('1v1'), ND.helpOf(e, e[young])).timingSpan, NS.skillLevel('1v1').timingSpan*2);
    assert.equal(ND.helpOf(e, e[old]), null);
    // la palla colpita dal più grande va verso il più giovane: più lenta; quella del più giovane no
    assert.equal(ND.slowFor(e, e[old], 'TOPSPIN'), 1.1); assert.equal(ND.slowFor(e, e[old]), 1.1, 'anche il servizio');
    assert.equal(ND.slowFor(e, e[young], 'TOPSPIN'), 1); assert.equal(ND.slowFor(e, e[young]), 1);
    for (const shot of ['LOB', 'DROP']) assert.equal(ND.slowFor(e, e[old], shot), 1, 'pallonetto e palla corta sono già lenti');
  }
  // tra fasce vicine solo il margine sul tempo
  const near = splitEngine(x => { x.natpfSplitBands = { p1: 'ragazzo', p2: 'adulto' }; });
  assert.equal(NI.lateMargin(near, near.player), .03); assert.equal(ND.slowFor(near, near.opponent, 'TOPSPIN'), 1);
  assert.equal(ND.helpOutcome(out, ND.helpOf(near, near.player)), out);
  // contro la CPU e tra due computer niente, nemmeno con le fasce a mano
  const cpu = createHeadlessEngine({ difficulty: 'pro' }); cpu.natpfSplitBands = { p1: 'bambino', p2: 'adulto' }; cpu.startNewMatch({ showStartBanner: false });
  assert.equal(cpu.natpfDuo, null); assert.equal(ND.helpOf(cpu, cpu.player), null);
  for (const a of [cpu.player, cpu.opponent]) assert.equal(ND.slowFor(cpu, a, 'TOPSPIN'), 1);
}));

test('aiuto nel motore: con il formato in fiera chi batte e il punteggio sono gli stessi con e senza aiuto (A, B B, A A…)', () => withSeed(4, () => {
  const servers = (bands, variant) => { const e = splitEngine(x => { x.natpfSplitBands = bands; x.natpfHelpVariant = variant; }, { fair: true, first: 'player' });
    const s = [e.score.server]; e._awardPoint('opponent', 'Out'); s.push(e.score.server); e._awardPoint('opponent', 'Out'); s.push(e.score.server); e._awardPoint('opponent', 'Out'); s.push(e.score.server);
    return { s, pts: [e.score.playerPoints, e.score.opponentPoints] }; };
  const plain = servers({ p1: 'adulto', p2: 'adulto' });
  assert.deepEqual(plain.s, [0, 1, 2, 3].map(n => pointServer('player', n)));
  assert.deepEqual(plain.pts, [0, 3]);
  for (const v of [undefined, 'A', 'G']) assert.deepEqual(servers({ p1: 'bambino', p2: 'adulto' }, v), plain, `variante ${v || 'in gioco'}`);
}));

test('aiuto nel motore: il colpo riuscito del più giovane cade più in fondo ma resta in campo; fallito, debole, in rete, pallonetto e palla corta non cambiano', () => {
  const h = ND.helpFor({ p1: 'bambino', p2: 'adulto' }).p1, ok = { x: 1.2, depth: 8.4, shot: 'TOPSPIN', failed: false, weak: false, netFault: false };
  assert.deepEqual(ND.helpOutcome(ok, h), { ...ok, depth: 9.4 });
  assert.deepEqual(ND.helpOutcome({ ...ok, depth: 10.9 }, h), { ...ok, depth: ND.HELP_DEEP_MAX }, 'mai oltre il limite');
  for (const same of [{ ...ok, depth: 11.5 }, { ...ok, depth: 12.9, failed: true }, { ...ok, failed: true }, { ...ok, weak: true }, { ...ok, netFault: true }, { ...ok, shot: 'LOB' }, { ...ok, shot: 'DROP' }])
    assert.equal(ND.helpOutcome(same, h), same, JSON.stringify(same));
  assert.equal(ND.helpOutcome(ok, null), ok); assert.equal(ND.helpOutcome(ok, { span: 2, late: .1 }), ok, 'senza «deep» lo stesso oggetto');
  assert.deepEqual(ND.helpOutcome({ ...ok, shot: 'SMASH', depth: 7 }, h).depth, 8);
  // nel motore: lo stesso colpo a tempo, da P1 e da P2
  const good = { lead: 0, peak: 400, flight: 1.2, to: { x: 1.2, z: 9.2 }, at: { x: .4, z: 11.7 } };
  for (const who of ['p1', 'p2']){
    const young = who === 'p1' ? { p1: 'bambino', p2: 'adulto' } : { p1: 'adulto', p2: 'bambino' }, other = who === 'p1' ? { p1: 'adulto', p2: 'bambino' } : { p1: 'bambino', p2: 'adulto' };
    // «time»: lo stesso bambino con il solo margine sul tempo (variante A), per isolare la leva del colpo più in fondo
    const plain = strike({ who, ...good }), helped = strike({ who, ...good, set: e => { e.natpfSplitBands = young; } }), adult = strike({ who, ...good, set: e => { e.natpfSplitBands = other; } });
    const time = strike({ who, ...good, set: e => { e.natpfSplitBands = young; e.natpfHelpVariant = 'A'; } });
    assert.ok(plain.hit && helped.hit && adult.hit && time.hit, `${who}: colpita`);
    assert.ok(!time.L.out.failed && time.L.out.depth < ND.HELP_DEEP_MAX - 1, `${who}: colpo riuscito (${time.L.out.depth} m)`);
    assert.ok(Math.abs(helped.L.out.depth - (time.L.out.depth + 1)) < 1e-9, `${who}: 1 m più in fondo (${time.L.out.depth} → ${helped.L.out.depth})`);
    assert.equal(helped.L.out.x, time.L.out.x, 'la direzione non cambia'); assert.equal(helped.L.out.grade, plain.L.out.grade, 'il voto resta quello del tempo vero');
    const land = Math.abs(helped.e.ball.targetLanding.z);
    assert.ok(Math.abs(land - helped.L.out.depth) < 1e-6 && land < 11.89, `${who}: la palla è lanciata lì, in campo (${land})`);
    // il colpo del più giovane non è rallentato (va verso l'altro) …
    assert.equal(ND.slowFor(helped.e, who === 'p1' ? helped.e.player : helped.e.opponent, helped.L.out.shot), 1);
    // … e quello del più grande cade dove cadeva (non è allungato), ma vola il 10% in più
    assert.equal(adult.L.out.depth, plain.L.out.depth); assert.equal(adult.L.out.x, plain.L.out.x);
    assert.ok(Math.abs(adult.L.flight - plain.L.flight*1.1) < .002, `${who}: volo ${plain.L.flight} → ${adult.L.flight} s`);
    assert.equal(helped.L.flight > 0, true);
  }
});

test('aiuto nel motore: la palla verso il più giovane vola più lenta e cade nello stesso punto (colpi dello scambio e servizio); il pallonetto no; senza aiuto niente', () => {
  const speed = e => Math.hypot(e.ball.vel.x, e.ball.vel.z);
  const good = { lead: 0, peak: 400, flight: 1.2, to: { x: 1.2, z: 9.2 }, at: { x: .4, z: 11.7 } };
  try {
    for (const who of ['p1', 'p2']){
      // solo la leva «palla più lenta», per isolarla: chi colpisce è l'adulto, l'altro è il bambino
      const bands = who === 'p1' ? { p1: 'adulto', p2: 'bambino' } : { p1: 'bambino', p2: 'adulto' };
      const plain = strike({ who, ...good });
      ND.helpTuning['bambino:adulto'] = { slow: 1.1 };
      const slow = strike({ who, ...good, set: e => { e.natpfSplitBands = bands; } });
      // … e il colpo del bambino con la sola leva «palla più lenta» è identico a quello senza aiuto
      const child = strike({ who, ...good, set: e => { e.natpfSplitBands = who === 'p1' ? { p1: 'bambino', p2: 'adulto' } : { p1: 'adulto', p2: 'bambino' }; } });
      delete ND.helpTuning['bambino:adulto'];
      assert.ok(plain.hit && slow.hit && child.hit);
      assert.deepEqual([slow.L.out.x, slow.L.out.depth, slow.L.out.grade, slow.L.out.clear], [plain.L.out.x, plain.L.out.depth, plain.L.out.grade, plain.L.out.clear], `${who}: stesso esito`);
      assert.ok(Math.abs(slow.L.flight/plain.L.flight - 1.1) < .003, `${who}: volo × 1,1 (${plain.L.flight} → ${slow.L.flight})`);
      assert.ok(Math.abs(speed(slow.e)/speed(plain.e) - 1/1.1) < .02, `${who}: velocità lungo il campo ÷ 1,1 (${speed(plain.e).toFixed(1)} → ${speed(slow.e).toFixed(1)} m/s)`);
      assert.deepEqual([slow.e.ball.targetLanding.x, slow.e.ball.targetLanding.z], [plain.e.ball.targetLanding.x, plain.e.ball.targetLanding.z], 'cade nello stesso punto');
      assert.deepEqual([child.L.out.x, child.L.out.depth, child.L.flight], [plain.L.out.x, plain.L.out.depth, plain.L.flight], `${who}: il colpo del bambino non cambia`);
    }
  } finally { delete ND.helpTuning['bambino:adulto']; }
  // servizio: lo stesso servizio (quello morbido del lancio automatico) dell'adulto verso il bambino, e verso un adulto
  const serve = (bands, who) => withSeed(9, () => {
    const e = splitEngine(x => { x.natpfSplitBands = bands; }, { fair: false, first: who === 'p2' ? 'opponent' : 'player' }), sv = who === 'p2' ? e.opponent : e.player;
    e.ball.pos.set(sv.pos.x, 2.4, sv.pos.z); e._executeServeHit(sv, ND.autoServeEvent('right'));
    const v0 = speed(e), z0 = e.ball.pos.z; let t = 0;
    while (e.ball.pos.y > .1 && t < 3){ e.step(DT); t += DT; }
    return { v0, t, land: Math.abs(e.ball.pos.z), phase: e.phase, z0 };
  });
  for (const who of ['p1', 'p2']){
    const toChild = who === 'p1' ? { p1: 'adulto', p2: 'bambino' } : { p1: 'bambino', p2: 'adulto' }, fromChild = who === 'p1' ? { p1: 'bambino', p2: 'adulto' } : { p1: 'adulto', p2: 'bambino' };
    const plain = serve({ p1: 'adulto', p2: 'adulto' }, who), slow = serve(toChild, who), child = serve(fromChild, who);
    assert.ok(slow.v0 < plain.v0*.95, `${who}: servizio verso il bambino più lento (${plain.v0.toFixed(1)} → ${slow.v0.toFixed(1)} m/s)`);
    assert.ok(slow.t > plain.t*1.05, `${who}: arriva dopo (${plain.t.toFixed(2)} → ${slow.t.toFixed(2)} s)`);
    assert.ok(Math.abs(slow.land - plain.land) < .35, `${who}: cade nello stesso quadrato, alla stessa profondità (${plain.land.toFixed(2)} → ${slow.land.toFixed(2)} m)`);
    assert.deepEqual([child.v0, child.t, child.land], [plain.v0, plain.t, plain.land], `${who}: il servizio del bambino non cambia`);
  }
  // pallonetto dell'adulto verso il bambino: non rallentato
  const lob = set => strikeLob(set);
  const a = lob(null), b = lob(e => { e.natpfSplitBands = { p1: 'adulto', p2: 'bambino' }; });
  assert.equal(a.L.out.shot, 'LOB'); assert.equal(b.L.flight, a.L.flight, 'il pallonetto vola come sempre');
});

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
  // B31: il gioco a rete vale anche nello stesso schermo (stessa regola per tutti e due): le impronte di f08243a tornano
  // con le sue regole spente (netPlayRules.off), quelle nuove sono più sotto
  netPlayRules.off = true;
  try {
  assert.equal(print('bambino', true, before), '909a097fe488');
  assert.equal(print('bambino', false, before), 'f25564be9708');
  assert.equal(print('medio', true, e => { before(e); e.natpfSplitBands = { p1: 'ragazzo', p2: 'ragazzo' }; e.natpfAutoToss = false; e.natpfOpenCourt = false; }), 'b557aa21ae9f');
  } finally { netPlayRules.off = false; }
  // con il gioco a rete (B31) le partite cambiano: impronte nuove (scripts/audit/b25/impronte.mjs)
  assert.equal(print('bambino', true, before), B31_PRINTS[0]);
  assert.equal(print('bambino', false, before), B31_PRINTS[1]);
  // e con le regole di oggi cambia (il super parte anche per il bambino)
  assert.notEqual(print('bambino', true, null), '909a097fe488');
});
