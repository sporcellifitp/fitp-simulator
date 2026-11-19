// B71 (19/11/2026, registri della fiera del 18 e 19/11, docs/b71/gesti.md) · pagina del telefono:
//   • verso del gesto misurato attorno al picco (senza la preparazione lenta che lo precede), con una confidenza;
//   • preparazione trattenuta e poi il colpo nel verso atteso: basta il 50% del gesto trattenuto (prima l'80%);
//   • segno di fiera: il segno dei sensori si gira solo con almeno 8 voti contrari concordi (prima 4 voti in tutto);
//   • campi nuovi del colpo (vg verso grezzo, vc confidenza, sv voti del segno girato) e del messaggio «sgn».
// I gesti veri del 28/10 restano letti come prima (calibrati: impronta in phone-stats.test.mjs; profilo semplice qui).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector, peakWindow, simpleVerse, netTurn, VERSE, DEFAULTS, unit } from '../../site/js/tennis/swing-detect.js';
import { swingMessage, parseSwingMessage } from '../../site/js/tennis/swing-message.js';
import { PROFILE_2810, WINDOWS_2810 } from './session-28-10.data.mjs';

/* ---------- verso attorno al picco ---------- */
// campioni [t, velocità, giro attorno alla verticale, percorso] a 60 Hz di un gesto a campana con velocità w (vettore:
// [parte attorno alla verticale, parte orizzontale])
function bell(t0, ms, peakV, peakH){
  const n = Math.round(ms/16.7), out = [];
  for (let i = 0; i <= n; i++){ const u = i/n, v = peakV*Math.sin(Math.PI*u)**2, h = peakH*Math.sin(Math.PI*u)**2, m = Math.hypot(v, h); out.push([t0 + i*16.7, m, v*16.7/1000, m*16.7/1000]); }
  return out;
}
test('B71 verso attorno al picco: la preparazione lenta nel verso opposto, unita al colpo senza pausa, non decide più il verso', () => {
  // preparazione lenta (165 °/s, quasi tutta rotazione del polso con un poco di giro all'indietro, 700 ms) e subito il colpo
  // (picco 600 °/s, metà attorno alla verticale nel verso del dritto, 180 ms): un gesto solo per il rilevatore
  const prep = bell(0, 700, -70, 150), hit = bell(700, 180, 420, 430), h = [...prep, ...hit];
  const turn = h.reduce((a, x) => a + x[2], 0), angle = h.reduce((a, x) => a + x[3], 0);
  assert.equal(netTurn(turn, angle), 0, `tutto il gesto: il giro si annulla (${turn.toFixed(1)}° su ${angle.toFixed(0)}°)`);
  const W = peakWindow(h);
  assert.ok(W.from >= 700, `la finestra comincia nel colpo: ${W.from}`);
  const V = simpleVerse({ turn, angle, h, turnAxis: 0 });
  assert.equal(V.dir, 1); assert.equal(V.whole, 0); assert.equal(V.win, 1);
  assert.ok(V.conf >= .9, `confidenza ${V.conf}`);
  // preparazione più ampia: tutto il gesto direbbe il contrario; la finestra no, con meno confidenza (disagree)
  const big = [...bell(0, 700, -220, 120), ...bell(700, 180, 420, 430)], T = big.reduce((a, x) => a + x[2], 0), A = big.reduce((a, x) => a + x[3], 0);
  assert.equal(netTurn(T, A), -1, 'prima: rovescio');
  const B = simpleVerse({ turn: T, angle: A, h: big });
  assert.equal(B.dir, 1); assert.ok(B.conf < 1 && B.conf >= VERSE.disagree*.9, `${B.conf}`);
  // colpo che non gira attorno alla verticale (verticale): niente verso dalla finestra, resta l'asse al picco con poca fiducia
  const vert = bell(0, 200, 10, 600), Tv = vert.reduce((a, x) => a + x[2], 0), Av = vert.reduce((a, x) => a + x[3], 0);
  assert.deepEqual([simpleVerse({ turn: Tv, angle: Av, h: vert, turnAxis: -1 }).dir, simpleVerse({ turn: Tv, angle: Av, h: vert, turnAxis: -1 }).conf], [-1, VERSE.axisConf]);
  assert.deepEqual(simpleVerse({ turn: Tv, angle: Av, h: vert, turnAxis: 0 }), { dir: 0, conf: 0, whole: 0, win: 0, W: peakWindow(vert) });
  assert.equal(peakWindow([]), null);
});

const SIMPLE = { version: 4, automaticGesture: true, simple: true, hand: 'right', bias: [0, 0, 0], noise: 3, gravity: [0, 1, 0], axis: null, ref: 420, refs: null, refAngle: 30, on: 70, minPeak: 120, minAngle: 6 };
// gesto attorno alla verticale (profilo semplice, telefono dritto: l'alto è γ): dir +1 dritto del destro, −1 rovescio
function swingV(det, t0, { peak = 600, ms = 220, dir = 1, side = 0 } = {}){
  const n = Math.round(ms/10);
  for (let i = 0; i <= n; i++){ const u = i/n, m = peak*Math.sin(Math.PI*u)**2; det.feed({ t: t0 + i*10, rot: [0, side*m, dir*m], acc: [0, 0, 0], accG: [0, 9.81, 0] }); }
  return t0 + n*10;
}
const still = (det, t0, ms) => { let t = t0; for (; t < t0 + ms; t += 10) det.feed({ t, rot: [1, -1, 1], acc: [0, 0, 0], accG: [0, 9.81, 0] }); return t; };
const simpleDet = (opts = {}) => { const det = createSwingDetector(opts); det.setProfile(SIMPLE); det.run(); det.setContext('play'); return det; };

test('B71 rilevatore, profilo semplice: verso grezzo e confidenza nel colpo; dritti e rovesci netti con confidenza piena', () => {
  const det = simpleDet(), sw = [];
  det.on('swing', s => sw.push(s));
  let t = still(det, 0, 500);
  for (const dir of [1, -1, 1, -1]){ t = swingV(det, t + 10, { dir }); t = still(det, t + 10, 900); }
  assert.deepEqual(sw.map(s => s.dir), [1, -1, 1, -1]);
  assert.deepEqual(sw.map(s => s.rawDir), [1, -1, 1, -1]);
  for (const s of sw) assert.ok(s.dirConf >= .9 && s.dirConf <= 1, `${s.dirConf}`);
  // nel messaggio: vg e vc; il computer li legge
  const m = swingMessage(sw[1], { now: sw[1].t + 5 }), p = parseSwingMessage(m, { at: 1, now: 1000 });
  assert.equal(m.vg, -1); assert.equal(m.vc, sw[1].dirConf); assert.equal(p.rawDir, -1); assert.equal(p.dirConf, sw[1].dirConf);
  assert.equal(m.dur, sw[1].dur, 'la durata del gesto c\'era già (dur)'); assert.equal(m.hd, 0, 'e l\'attesa della preparazione (hd)');
});

test('B71 messaggio del colpo: vg, vc e sv solo se ci sono e solo numeri; valori strani ignorati dal computer', () => {
  const base = { power: .6, lift: .1, dur: 120, dir: 1, aim: 0, confidence: .45, peakT: 500, peak: 900, detectMs: 12, holdMs: 0, t: 520 };
  const m0 = swingMessage(base, { now: 530 });
  for (const k of ['vg', 'vc', 'sv']) assert.equal(m0[k], undefined, k);
  const m = swingMessage({ ...base, rawDir: -1, dirConf: .456, signVotes: [1, 8] }, { now: 530 });
  assert.deepEqual([m.vg, m.vc, m.sv], [-1, .46, [1, 8]]);
  const { vg, vc, sv, ...resto } = m; assert.deepEqual(resto, m0, 'il resto del messaggio non cambia');
  const p = parseSwingMessage({ ...m0, vg: 3, vc: 'alto', sv: [1, 'x'] }, { at: .5, now: 540 });
  assert.equal(p.rawDir, undefined); assert.equal(p.dirConf, undefined); assert.equal(p.signVotes, undefined);
  assert.deepEqual(parseSwingMessage({ ...m0, vc: 7 }, { at: .5, now: 540 }).dirConf, 1, 'confidenza limitata a 1');
  assert.deepEqual(parseSwingMessage(m, { at: .5, now: 540 }).signVotes, [1, 8]);
});

/* ---------- preparazione trattenuta e poi il colpo nel verso atteso ---------- */
const G = PROFILE_2810.gravity.map(v => v*9.81), AX = unit(PROFILE_2810.axis);
function gesture(det, t0, { peak, angle, dir = 1 }){
  const dur = 2*angle/peak*1000, n = Math.max(4, Math.round(dur/16.7));
  for (let i = 0; i <= n; i++){ const u = i/n, m = peak*Math.sin(Math.PI*u)**2; det.feed({ t: t0 + i*dur/n, rot: AX.map(a => a*m*dir), acc: [0, 0, 0], accG: G }); }
  return t0 + dur;
}
const rest = (det, t0, ms) => { let t = t0; for (; t < t0 + ms; t += 16.7) det.feed({ t, rot: [2*Math.sin(t), 2*Math.cos(t), 1], acc: [0, 0, 0], accG: G }); return t; };
test('B71 in fiera: preparazione trattenuta, poi il colpo nel verso atteso al 64%: vale il colpo (prima vinceva la preparazione)', () => {
  const run = (opts, fair = true) => {
    const det = createSwingDetector(opts), out = [];
    det.setProfile(PROFILE_2810); det.run(); det.setContext('play'); det.setPrepMode(true); det.setExpect(1); if (fair) det.setSignNeed(8);
    for (const k of ['swing', 'prep', 'discard']) det.on(k, v => out.push({ k, dir: v.dir, peak: v.peak, why: v.why, hold: v.holdMs }));
    let t = rest(det, 0, 600);
    t = gesture(det, t + 17, { peak: 700, angle: 60, dir: -1 });     // rovescio morbido: la palla è sul dritto, trattenuto
    t = rest(det, t + 17, 60);
    t = gesture(det, t + 17, { peak: 450, angle: 50, dir: 1 });      // il dritto, più leggero della preparazione
    rest(det, t + 17, 900);
    return out;
  };
  const now = run({}), sw = now.filter(o => o.k === 'swing');
  assert.deepEqual(sw.map(s => s.dir), [1], JSON.stringify(now));
  assert.ok(now.some(o => o.k === 'prep' && o.dir === -1), 'il gesto trattenuto era la preparazione');
  // la regola di prima (80% anche nel verso atteso): giocato il rovescio trattenuto, il dritto scartato come rientro
  const before = run({ prepFollowExpected: DEFAULTS.prepFollow }).filter(o => o.k === 'swing');
  assert.deepEqual(before.map(s => s.dir), [-1]); assert.ok(before[0].hold > 0);
  // fuori dalla fiera resta l'80% (rovescio lungolinea seguito dal rientro della mano: natpf-prep.test.mjs)
  assert.deepEqual(run({}, false).filter(o => o.k === 'swing').map(s => s.dir), [-1]);
  // nel verso non atteso resta l'80%: il gesto che segue al 64% è il rientro (com'era)
  assert.equal(DEFAULTS.prepFollow, .8); assert.equal(DEFAULTS.prepFollowExpected, .5);
});

/* ---------- segno di fiera ---------- */
test('B71 segno di fiera: con sn 8 il rilevatore non gira il segno con 4 voti contrari; con 8 contrari concordi sì, con i voti', () => {
  const play = (need, n) => {
    const det = simpleDet(), st = [], sw = [];
    if (need != null) det.setSignNeed(need);
    det.on('status', s => { if (s.s === 'sign') st.push(s); }); det.on('swing', s => sw.push(s));
    let t = still(det, 0, 500);
    // telefono al contrario: la palla sul dritto (atteso +1) e il gesto letto −1, poi il contrario; voti da tutti e due i lati
    for (let i = 0; i < n; i++){ const ex = i % 2 ? -1 : 1; det.setExpect(ex); t = swingV(det, t + 10, { dir: -ex, peak: 700 }); t = still(det, t + 10, 1000); }
    return { det, st, sw };
  };
  const old = play(null, 4);
  assert.equal(old.det.absSign, -1, 'regola di sempre: 4 voti'); assert.deepEqual(old.st.map(s => s.votes), [[0, 4]]);
  assert.deepEqual(old.sw.at(-1).signVotes, [0, 4], 'il colpo che lo gira porta i voti');
  const fair4 = play(8, 4); assert.equal(fair4.det.absSign, 1, 'fiera: 4 non bastano'); assert.equal(fair4.st.length, 0);
  const fair7 = play(8, 7); assert.equal(fair7.det.absSign, 1, 'fiera: 7 non bastano');
  const fair8 = play(8, 8); assert.equal(fair8.det.absSign, -1, 'fiera: 8 contrari concordi'); assert.deepEqual(fair8.st[0].votes, [0, 8]);
  // valori strani: la regola di sempre
  const d = simpleDet(); d.setSignNeed('x'); assert.equal(d.signNeed, 0); d.setSignNeed(8); assert.equal(d.signNeed, 8); d.setSignNeed(0); assert.equal(d.signNeed, 0);
});

/* ---------- gesti veri del 28/10 con il profilo semplice (quello della fiera) ---------- */
test('B71 gesti veri del 28/10 con il profilo semplice: il verso attorno al picco è quello di tutto il gesto (nessun colpo cambia)', () => {
  const S = { ...SIMPLE, gravity: PROFILE_2810.gravity };
  let n = 0;
  for (const [name, rows] of Object.entries(WINDOWS_2810)) for (const expect of [-1, 0, 1]){
    const det = createSwingDetector(); det.setProfile(S); det.run(); det.setContext('play'); det.setPrepMode(true); det.setExpect(expect);
    det.on('swing', s => { n++; if (s.verse?.whole) assert.equal(s.verse.win, s.verse.whole, `${name}/${expect}: finestra ${s.verse.win} · tutto ${s.verse.whole}`); assert.ok(s.dirConf >= 0 && s.dirConf <= 1); });
    for (const r of rows) det.feed({ t: 1000 + r[0], rot: r.slice(1, 4), acc: r.slice(4, 7), accG: r.slice(7, 10) });
  }
  assert.ok(n >= 15, `${n} colpi`);
});

test('B71 gesti veri del 28/10: in fiera (sn 8) gli stessi colpi di fuori dalla fiera, profilo semplice e calibrato, con ogni verso atteso', () => {
  const S = { ...SIMPLE, gravity: PROFILE_2810.gravity };
  for (const prof of [S, PROFILE_2810]) for (const [name, rows] of Object.entries(WINDOWS_2810)) for (const expect of [-1, 0, 1]){
    const run = fair => {
      const det = createSwingDetector(), out = [];
      det.setProfile(prof); det.run(); det.setContext('play'); det.setPrepMode(true); det.setExpect(expect); if (fair) det.setSignNeed(8);
      det.on('swing', s => out.push(`${s.dir}@${s.peak}@${s.peakT}`));
      for (const r of rows) det.feed({ t: 1000 + r[0], rot: r.slice(1, 4), acc: r.slice(4, 7), accG: r.slice(7, 10) });
      return out.join(',');
    };
    assert.equal(run(true), run(false), `${prof.simple ? 'semplice' : 'calibrato'} ${name} atteso ${expect}`);
  }
});

/* ---------- pagina del telefono e collegamento ---------- */
import { readFileSync } from 'node:fs';
test('B71 pagina del telefono: cfg sn imposta il segno di fiera; «sgn» porta i voti; il computer li legge', async () => {
  const js = readFileSync(new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');
  assert.match(js, /case 'cfg': prepWanted = !!d\.prep; det\.setPrepMode\(prepWanted\); det\.setNet\?\.\(!!d\.net\); det\.setSignNeed\?\.\(d\.sn\);/);
  const link = readFileSync(new URL('../../site/js/tennis/link.js', import.meta.url), 'utf8');
  assert.match(link, /case 'sgn': if \(d\.d === 1 \|\| d\.d === -1\) emit\('sign', \{ detector: d\.d, \.\.\.\(Array\.isArray\(d\.v\)/);
});
