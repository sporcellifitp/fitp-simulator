// Telefono in verticale: direzione dal tempo vero del colpo e dal polso, forza assoluta, profondità, colpi speciali
// rispetto al proprio dritto; CPU che sbaglia sui colpi pericolosi e attacca le palle corte; «Salta» la calibrazione.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as NS from '../src/natpf/natpf_skill.js';
import { natpfSwingToEngine } from '../src/natpf/natpf_phone_racket.js';
import { createSwingDetector } from '@natpf/tennis/swing-detect.js';
import { createCalibration } from '@natpf/tennis/calibration.js';
import { simulate } from '../scripts/audit/rally-balance.mjs';

const mid = () => .5;
const casual = NS.skillLevel('casual'), pro = NS.skillLevel('pro');

test('tempo vero del colpo: si conta dall’istante del picco sul telefono, non da quando arriva il messaggio', () => {
  // palla a 2,1 m (0,2 s a 10 m/s dallo sweet spot); il telefono aveva colpito 60 ms prima
  assert.ok(Math.abs(NS.swingTiming(-2.1, 10) - .2) < 1e-9);
  assert.ok(Math.abs(NS.swingTiming(-2.1, 10, .06) - .26) < 1e-9);
  const ev = { natpf: { aim: 'swing', latency: .08 } };
  assert.equal(NS.eventLatency(ev), .08);
  assert.ok(Math.abs(NS.latencyShift(ev, 15) - 1.2) < 1e-9);
  assert.equal(NS.eventLatency({ natpf: { aim: 'face', latency: .08 } }), 0);
  assert.equal(NS.eventLatency({}), 0);
});

test('direzione: prima = incrociato, dopo = lungolinea, il polso stringe l’angolo; al centro un poco incrociato', () => {
  const at = (timing, wrist = 0, contact = 1) => NS.swingLandingX({ timing, contact, wrist, quality: 1, power: .2, level: pro, rng: mid });
  const centre = at(0), early = at(.12), late = at(-.12);
  assert.ok(centre < 0 && centre > -1.2, `centro ${centre}`);              // dritto del destro: un poco incrociato
  assert.ok(early < -2.2, `anticipo ${early}`);
  assert.ok(late > 1.2, `ritardo ${late}`);
  assert.ok(at(0, -1) < centre - 1.8 && at(0, 1) > centre + 1.8, 'il polso sposta la palla');
  // rovescio: incrociato dall’altra parte
  assert.ok(at(.12, 0, -1) > 2.2);
  // molto in anticipo con il polso nello stesso verso: fuori largo
  assert.ok(Math.abs(at(.24, -1)) > NS.COURT.SINGLES_X);
  // contro la CPU facile la finestra è più larga: lo stesso anticipo angola meno
  assert.ok(NS.swingLandingX({ timing: .12, contact: 1, quality: 1, power: .2, level: casual, rng: mid }) > early);
});

test('voto e qualità dal tempo: centro perfetto, anticipo/ritardo una scelta, estremi un errore', () => {
  assert.equal(NS.swingGrade(0, pro).grade, 'PERFECT');
  assert.equal(NS.swingGrade(.1, pro).grade, 'EARLY');
  assert.equal(NS.swingGrade(-.1, pro).grade, 'LATE');
  assert.equal(NS.swingGrade(.24, pro).grade, 'VERY EARLY');
  assert.equal(NS.swingGrade(.04, casual).grade, 'PERFECT');
  assert.equal(NS.swingQuality(.08, pro), 1);
  assert.ok(NS.swingQuality(.24, pro) < .8);
});

test('forza: conta anche la velocità vera del telefono; profondità dalla forza', () => {
  const kid = NS.swingPower(.95, 380), player = NS.swingPower(.8, 1500);
  assert.ok(kid < .55 && player > .75, `${kid} ${player}`);
  assert.equal(NS.swingPower(1), 1);                                         // senza velocità: solo il gesto relativo
  assert.ok(NS.swingDepthZ(.1, { rng: mid }) > -7.5);                        // lento: palla a metà campo
  assert.ok(NS.swingDepthZ(1, { rng: mid }) < -10);
});

test('colpi speciali rispetto al proprio dritto: su = lob, giù = tagliato, giù e lento = palla corta', () => {
  assert.equal(NS.swingShot({ lift: .3, baseline: .25 }), 'topspin');      // chi alza sempre un po' non fa lob per sbaglio
  assert.equal(NS.swingShot({ lift: .6, baseline: .2 }), 'lob');
  assert.equal(NS.swingShot({ lift: -.2, baseline: .2, power: .7 }), 'slice');
  assert.equal(NS.swingShot({ lift: -.2, baseline: .2, power: .2 }), 'drop');
  assert.equal(NS.swingShot({ lob: true }), 'lob');
});

test('dal telefono al motore: polso, latenza, forza e colpo nell’evento', () => {
  const now = 100, ev = natpfSwingToEngine({ dir: 1, power: .8, lift: .1, at: now - .07, peak: 1000, twist: .4 }, { now, liftBaseline: .05 });
  assert.equal(ev.side, 'forehand'); assert.equal(ev.natpf.aim, 'swing');
  assert.ok(Math.abs(ev.natpf.latency - .07) < 1e-6);
  assert.ok(Math.abs(ev.natpf.wrist - .64) < 1e-6);
  assert.equal(ev.natpf.shot, 'topspin'); assert.ok(ev.speed > 1.3);
  const lefty = natpfSwingToEngine({ dir: -1, power: .6 }, { hand: 'left' });
  assert.equal(lefty.side, 'forehand'); assert.equal(lefty.natpf.hand, 'left');
  // senza istante del picco: latenza tipica
  assert.equal(natpfSwingToEngine({ dir: 1 }).natpf.latency, .06);
});

// B18.2 passo 2 (D1): la regola è cambiata. Prima la probabilità cresceva con angolo e velocità anche sulla palla comoda
// (allungo 0,4) e la palla forte e profonda valeva più del doppio di quella lenta e corta a ogni livello. Ora conta se la
// CPU la colpisce in allungo o in corsa: sulla palla comoda forte e debole danno la stessa base; in allungo a Casual la
// palla lenta e corta mette meno in difficoltà (mai sotto il minimo del livello, soft), a Pro contano solo allungo e corsa
test('CPU: sbaglia sulle palle che la mettono in difficoltà; la palla lenta e corta a Casual pesa meno', () => {
  const forte = NS.shotThreat({ power: .9, depth: -10.8 }), debole = NS.shotThreat({ power: .1, depth: -6.8 });
  for (const lv of [casual, pro]){
    const comoda = { angle: .7, speed: 22, pressure: .5, stretch: .4, running: 0, quality: 1, level: lv };
    assert.equal(NS.cpuErrorChance({ ...comoda, speed: 16, threat: forte }), NS.cpuErrorChance({ ...comoda, speed: 16, threat: debole }));
    const dura = { ...comoda, stretch: 1, running: 1 };
    assert.ok(NS.cpuErrorChance({ ...dura, threat: forte }) > 3*NS.cpuErrorChance({ ...comoda, speed: 16, threat: forte }));
    assert.ok(NS.cpuErrorChance({ ...dura, threat: forte }) >= NS.cpuErrorChance({ ...dura, threat: debole }));
  }
  const dura = { angle: .7, speed: 22, pressure: .5, stretch: 1, running: 1, quality: 1, level: casual };
  const strong = NS.cpuErrorChance({ ...dura, threat: forte }), soft = NS.cpuErrorChance({ ...dura, threat: debole });
  assert.ok(strong > soft*1.3, `${strong} ${soft}`);
});

test('«Salta» la calibrazione: profilo semplice, il telefono è pronto, i gesti valgono tutti e il verso si misura', () => {
  const det = createSwingDetector(), cal = createCalibration(det);
  const events = []; cal.on(e => events.push(e));
  assert.equal(cal.skip(), null);                                           // prima di iniziare non c'è niente da saltare
  cal.start({ quick: true });
  for (let t = 0; t < 700; t += 10){ const k = { t, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, 9.8, 0] }; det.feed(k); cal.tick(t, k); }
  const p = cal.skip();
  assert.ok(p && p.simple && p.axis === null);
  assert.equal(events.at(-1).kind, 'done');
  const swings = []; det.on('swing', s => swings.push(s));
  let t = 1000;
  // telefono in verticale (gravità lungo y): la rotazione attorno a y è attorno alla verticale, cioè uno swing
  // orizzontale. Il verso viene dalla gravità senza calibrazione (prima era sempre 0 e il lato lo sceglieva la palla)
  const stroke = sign => {
    for (let i = 0; i <= 22; i++, t += 10) det.feed({ t, rot: [0, 0, sign*650*Math.sin(Math.PI*i/22)**2], acc: [0, 0, 0], accG: [0, 9.8, 0] });
    for (let i = 0; i < 80; i++, t += 10) det.feed({ t, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, 9.8, 0] });
  };
  stroke(1); stroke(-1);
  assert.equal(swings.length, 2);
  assert.equal(swings[0].dir, 1);           // antiorario visto dall'alto: da destra a sinistra
  assert.equal(swings[1].dir, -1);
  // rotazione attorno a un asse orizzontale (gesto verticale): nessun verso, il colpo vale lo stesso
  for (let i = 0; i <= 22; i++, t += 10) det.feed({ t, rot: [650*Math.sin(Math.PI*i/22)**2, 0, 0], acc: [0, 0, 0], accG: [0, 9.8, 0] });
  for (let i = 0; i < 80; i++, t += 10) det.feed({ t, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, 9.8, 0] });
  assert.equal(swings.length, 3); assert.equal(swings[2].dir, 0);
});

test('skill gap misurato (simulazione): contro la CPU esperta il tennista vince più dell’amatore, l’amatore più del bambino', () => {
  const win = profile => simulate({ profile, difficulty: 'pro', points: 70, seed: 9 }).winPct;
  const t = win('tennista'), a = win('amatore'), b = win('bambino');
  assert.ok(t > a + 8 && a > b + 8, `${t} ${a} ${b}`);
});
