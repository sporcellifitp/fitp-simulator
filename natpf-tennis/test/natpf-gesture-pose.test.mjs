// Fedeltà della posa dei gesti del tutorial (B9, ramo C; docs/b9/posa-gesti.md, specifica-gesti.md §6, brief
// giudizio-animazione.md §5.4 e §5.6): la posa che l'animazione nuova DISEGNA (natpf_gesture_pose.gesturePose) diventa
// campioni dei sensori del telefono simulato completo (test/pose-sensors.mjs → test/phone-sim.mjs: rilevatore vero
// site/js/tennis/swing-detect.js, forma del colpo, calibrazione rapida vera fatta con i gesti dell'animazione o del
// braccio simulato, mappatura del gioco natpf_phone_racket/natpf_stroke_intent/natpf_gestures). Ogni scheda deve dare
// esattamente il colpo mostrato, con il picco letto nell'istante del contatto disegnato. La stessa verifica sulla posa
// dell'animazione di prima (legacyPoseSource) deve FALLIRE dove la specifica §5 dice che sbaglia: servizio, pallonetto,
// schiacciata e volée.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCard, judgeCard, legacyPoseSource, calibratedPhone, DT } from './pose-sensors.mjs';
import * as GP from '../src/natpf/natpf_gesture_pose.js';
import { GESTURES, GRIP_STYLE } from '../src/natpf/natpf_gesture_motion.js';
import { TUTORIAL_CARDS } from '../src/natpf/natpf_tutorial.js';
import { videoRef, shapeOf, planOf as planVideo, solutionChoreo, SEEDS_DEFAULT, AIM_MARGIN, mirrorOf, MIRROR_OF } from '../scripts/video/ottimizza.mjs';
import { judgeOne, newTally, DECLARED_EXPECT } from './gesture-semi.mjs';

const { gesturePose, gesturePlan, gestureBall, gestureContactPoint, gestureRig, omega, len, sub, qangle } = GP;
const source = (grip = undefined, set = undefined) => ({ name: 'posa nuova', pose: (id, t, hand) => gesturePose(id, t, { hand, grip, set }), plan: id => gesturePlan(id, { grip, set }) });
const STROKE_CARDS = GP.CARD_IDS.filter(id => !GESTURES[id].still);
const HANDS = ['right', 'left'], CALS = ['pose', 'arm'];
// imitazione più lenta o più veloce: dove la velocità è il discriminante si ammette solo il cambiamento nel verso giusto
// (specifica §6.5, brief §5.6): il proprio dritto/rovescio più veloce diventa piatto, il tagliato più lento palla corta,
// il piatto più lento torna top spin
const allowFor = (id, rate) => rate > 1 ? (['forehand', 'backhand', 'volley', 'cross', 'line'].includes(id) ? ['flat'] : null)
  : rate < 1 ? ({ slice: ['drop'], sliceBackhand: ['drop'], flat: ['topspin'] })[id] || null : null;

// B17.1 (passo B2): con la presa a racchetta tutte le schede usano CHOREO_VIDEO (ottimizzate con il telefono simulato nel
// costo): nessun limite ammesso (docs/b17/ottimizzazione.md)
const allowLimit = () => null;
// B17.1 passo B3: con lo schermo verso la rete all'impatto del dritto (richiesta dell'utente) la calibrazione del braccio
// simulato (telefono tenuto come nella posa di partenza, schermo di lato) non legge la mira di incrociato e lungolinea né il
// piatto: limite dichiarato e misurato in docs/b17/ottimizzazione.md §9; quelle letture si contano a parte (lim)
function check(src, ids, { hands = HANDS, cals = CALS, rates = [1], grip = GRIP_STYLE, lim = newTally() } = {}){
  const bad = [];
  let n = 0;
  for (const cal of cals) for (const hand of hands) for (const rate of rates) for (const id of ids){
    // le letture dei limiti dichiarati si fanno e si registrano in `lim` (conto esatto, gesture-semi.mjs): mai saltate
    const j = judgeOne(src, id, { hand, cal, rate, allow: [...(allowFor(id, rate) || []), ...(allowLimit(grip, id, cal) || [])], racket: grip === 'racchetta' }, lim);
    n++;
    if (j.why.length) bad.push(`${id} ${hand} cal=${cal} ×${rate}: ${j.why.join('; ')}`);
  }
  return { bad, n, lim };
}

test('posa: le schede sono quelle del tutorial, nello stesso ordine, più i due esercizi della mira', () => {
  assert.deepEqual([...GP.CARD_IDS], TUTORIAL_CARDS.map(c => c.id));
  assert.deepEqual([...GP.EXERCISE_IDS], ['cross', 'line']);
  for (const id of GP.POSE_IDS) assert.ok(GESTURES[id], id);
});

test('posa: modulo puro (niente DOM, three.js o canvas), importabile in Node', () => {
  const src = readFileSync(new URL('../src/natpf/natpf_gesture_pose.js', import.meta.url), 'utf8');
  const imports = [...src.matchAll(/^import .* from '([^']+)'/gm)].map(m => m[1]);
  assert.deepEqual(imports, ['./natpf_gesture_motion.js']);
  for (const w of ['document.', 'window.', 'getContext', 'THREE', 'requestAnimationFrame']) assert.ok(!src.includes(w), w);
});

test('fedeltà: ogni scheda (11) e ogni esercizio della mira dà esattamente il colpo mostrato, picco letto = contatto disegnato ± 1 campione (destro e mancino, calibrazione con l\'animazione e con il braccio simulato, presa a racchetta, nel palmo e a martello)', () => {
  for (const grip of ['racchetta', 'palmo', 'martello']){
    const { bad, n, lim } = check(source(grip), GP.POSE_IDS, { grip });
    assert.equal(n, GP.POSE_IDS.length*4);
    assert.equal(lim.n, grip === 'racchetta' ? 6 : 0);
    assert.deepEqual(bad, [], `presa ${grip}:\n${bad.join('\n')}`);
    // limiti dichiarati (ottimizzazione.md §9.4): conto esatto delle letture giuste e di che cosa viene letto
    assert.deepEqual(lim.byCard, grip === 'racchetta' ? DECLARED_EXPECT.pose : {}, `presa ${grip}: ${JSON.stringify(lim.byCard)}`);
  }
});

// Δ ≤ DT/4 (4,2 ms; misurato 0–0,1 ms): protegge la correzione del mezzo campione dell'adattatore (pose-sensors.playPose):
// senza, ogni picco letto sarebbe 8,3 ms prima del contatto disegnato e passerebbe una tolleranza di un campione intero
test('fedeltà: picco letto e contatto disegnato coincidono (Δ ≤ ¼ di campione a 60 Hz) anche nel lancio del servizio, e la battuta arriva 0,69 s dopo il lancio', () => {
  const src = source();
  for (const hand of HANDS){
    for (const id of STROKE_CARDS.filter(id => id !== 'serve')){
      const r = readCard(src, id, { hand });
      assert.ok(Math.abs(r.dPeak) <= DT/4, `${id} ${hand}: Δ ${r.dPeak} ms`);
    }
    const s = readCard(src, 'serve', { hand });
    assert.equal(s.events.length, 2, `servizio ${hand}: ${s.events.length} gesti`);
    assert.ok(Math.abs(s.dToss) <= DT/4, `lancio ${hand}: Δ ${s.dToss} ms`);
    assert.ok(Math.abs(s.dPeak) <= DT/4, `battuta ${hand}: Δ ${s.dPeak} ms`);
    // (servizio dal video, presa a racchetta: l'intervallo è quello del piano, P.tossGap; servizio di oggi: 0,69 s)
    const gap = gesturePlan('serve').tossGap ?? .69;
    assert.ok(Math.abs(s.gap - gap) <= 1.5*DT/1000, `servizio ${hand}: battuta ${s.gap} s dopo il lancio (atteso ${gap})`);
  }
});

test('fedeltà: imitazione più lenta (0,8×) e più veloce (1,25×): resta il colpo mostrato, o cambia solo nel verso della velocità (dritto/rovescio più veloce → piatto, tagliato più lento → palla corta)', () => {
  const { bad } = check(source(), GP.POSE_IDS.filter(id => !GESTURES[id].still), { rates: [.8, 1.25] });
  assert.deepEqual(bad, [], bad.join('\n'));
});

// Prese di chi imita diverse da quella mostrata (specifica §6.1, brief §5.6): nel palmo con la cima 20–50° verso
// l'interno e 25–55° in avanti. Unico limite: il PIATTO con la cima a 50° verso l'interno. Il piatto è «il proprio dritto
// più veloce»: forza ≥ 0,62 e salita della testa entro ±0,12 da quella abituale (natpf_stroke_intent flatRise), che il
// gioco tiene in conto al massimo fino a 0,30 (riseRefMax). Con la cima a 50° verso l'interno e il raggio del braccio
// disegnato (0,46 m) il dritto sale di 0,36–0,75: oltre 0,42 il piatto non si distingue dal top spin (limite del
// riconoscimento, docs/b9/posa-gesti.md §Limiti). Il test verifica che, dove succede, la causa sia proprio questa.
test('fedeltà: prese nel palmo di chi imita da 20° a 50° verso l\'interno e da 25° a 55° in avanti (unico limite documentato: il piatto a 50°, per la salita abituale)', () => {
  const bad = [];
  let flat = 0, limited = 0;
  for (const lean of [20, 35, 50]) for (const tilt of [25, 40, 55]){
    const src = source({ lean, tilt });
    const ids = lean === 50 ? GP.POSE_IDS.filter(id => id !== 'flat') : GP.POSE_IDS;
    bad.push(...check(src, ids).bad.map(b => `${lean}/${tilt} ${b}`));
    if (lean === 50) for (const hand of HANDS) for (const cal of CALS){
      const phone = calibratedPhone(src, { hand, cal }), r = readCard(src, 'flat', { hand, cal, phone }), x = r.read[0];
      assert.equal(r.read.length, 1, `${lean}/${tilt} ${hand} ${cal}: piatto, ${r.read.length} colpi`);
      flat++;
      if (x.ev.natpf.shot === 'flat') continue;
      limited++;
      const ref = Math.min(.3, phone.det.profile.rises[x.s.dir]), rise = x.s.shape.rise;
      assert.equal(x.ev.natpf.shot, 'topspin');
      assert.ok(x.ev.natpf.power >= .62, `${lean}/${tilt} ${hand} ${cal}: forza ${x.ev.natpf.power}`);
      assert.ok(Math.abs(rise - ref) > .12, `${lean}/${tilt} ${hand} ${cal}: salita ${rise}, abituale ${ref}`);
    }
  }
  assert.deepEqual(bad, [], bad.join('\n'));
  // conteggio fissato (06/11: 10 su 12, tutti tranne 55° in avanti con la calibrazione dell'animazione): un cambiamento
  // della posa o del riconoscimento che peggiora il piatto a 50° si vede qui
  assert.equal(flat, 12);
  assert.ok(limited <= 10, `piatto a 50°: ${limited}/${flat} letti come top spin (erano 10)`);
});

test('presa e posizione di partenza: ferme (nessuna rotazione, respiro di 3 mm), nessun messaggio dal telefono', () => {
  for (const id of ['grip', 'ready']){
    const P = gesturePlan(id);
    assert.equal(P.kind, 'still');
    let w = 0, dy = 0;
    const p0 = gesturePose(id, 0);
    for (let t = 0; t < P.total; t += 1/120){ const p = gesturePose(id, t); w = Math.max(w, len(omega(p.q, gesturePose(id, t + 1/120).q, 1/120))); dy = Math.max(dy, Math.abs(p.pos[1] - p0.pos[1])); }
    assert.ok(w <= 1e-6, `${id}: ${w} °/s`);
    assert.ok(dy <= .0031, `${id}: respiro ${dy} m`);
    for (const hand of HANDS) assert.equal(readCard(source(), id, { hand }).msgs.length, 0);
  }
  // presa: due fermi immagine e il giro della camera (la mano non gira: la si imiterebbe)
  assert.equal(GP.CAMERAS.grip.seq.reduce((a, b) => a + b, 0), GP.STILL_TIMING.grip);
});

// Brief §5.4 (tempo reale): parte veloce, picco = contatto, preparazione e ritorno sotto i limiti misurati con il
// telefono simulato (specifica §3), fermo in fine colpo, ritorno entro 0,6 s dall'impatto, cicli indicativi.
// Picchi: la velocità vera include il polso (dritto 714 °/s come la specifica §2.3, rovescio 691, palla corta 414).
const LIMITS = {
  forehand: { ms: 260, peak: [650, 720], amp: 85, prep: 180, ret: 240, cycle: 2.25, contact: 1.03 },
  backhand: { ms: 260, peak: [600, 700], amp: 78, prep: 180, ret: 240, cycle: 2.25 },
  flat: { ms: 220, peak: [950, 1150], amp: 110, prep: 200, ret: 250, cycle: 2.4 },
  slice: { ms: 260, peak: [550, 650], amp: 78, prep: 180, ret: 240, cycle: 2.2 },
  lob: { ms: 300, peak: [480, 560], amp: 78, prep: 95, prepMin: .6, ret: 170, cycle: 2.56 },
  drop: { ms: 240, peak: [330, 420], amp: 40, prep: 140, ret: 150, cycle: 2.2 },
  smash: { ms: 240, peak: [650, 750], amp: 84, prep: 80, prepMin: .7, ret: 240, cycle: 2.7 },
  volley: { ms: 200, peak: [440, 520], amp: 48, prep: 120, prepAmp: 15, ret: 240, cycle: 1.9 },
  cross: { ms: 260, peak: [650, 720], amp: 85, prep: 250, ret: 250 },
  line: { ms: 260, peak: [650, 720], amp: 85, prep: 250, ret: 250 },
};
const H = 1/600;
function speedRows(id, o = {}){
  const P = gesturePlan(id, o), n = Math.round(P.total/H), rows = [];
  for (let i = 0; i < n; i++){ const t = i*H; rows.push({ t: t + H/2, w: len(omega(gesturePose(id, t, o).q, gesturePose(id, t + H, o).q, H)) }); }
  return { P, rows, max: (a, b) => rows.filter(r => r.t >= a && r.t < b).reduce((m, r) => r.w > m.w ? r : m, { w: 0, t: null }) };
}
// tratto più lungo sotto 20 °/s tra a e b (s)
const stall = (rows, a, b) => { let run = 0, worst = 0; for (const r of rows) if (r.t >= a && r.t < b){ if (r.w < 20){ run += H; worst = Math.max(worst, run); } else run = 0; } return worst; };

// (B17.1 passo B2: con la presa a racchetta tutte le schede usano le coreografie ottimizzate dalla partenza del video,
// CHOREO_VIDEO: i loro tempi sono nel test «insieme del video» più sotto; questi restano quelli della presa nel palmo)
test('tempi dei colpi (brief §5.4): picco = contatto, picco e ampiezza, preparazione e ritorno sotto i limiti, nessun fermo tra carica e colpo, fermo finale 0,10–0,20 s, ritorno entro 0,6 s, ciclo (presa nel palmo, coreografie di oggi)', () => {
  for (const grip of ['palmo']) for (const [id, L0] of Object.entries(LIMITS)){
    const L = L0;
    const { P, rows, max } = speedRows(id, { grip }), T = P.T, tag = `${grip} ${id}`;
    const pk = max(0, P.total);
    assert.ok(Math.abs(pk.t - P.contact) <= H, `${tag}: picco a ${pk.t}, contatto ${P.contact}`);
    assert.ok(pk.w >= L.peak[0] && pk.w <= L.peak[1], `${tag}: picco ${pk.w.toFixed(0)} °/s`);
    assert.equal(GESTURES[id].stroke.ms, L.ms, `${tag}: parte veloce`);
    assert.ok(Math.abs(P.travel - L.amp) <= 3, `${tag}: ampiezza ${P.travel}°`);
    assert.ok(max(T.hold, T.inv - .005).w <= L.prep, `${tag}: preparazione ${max(T.hold, T.inv - .005).w.toFixed(0)} °/s`);
    if (L.prepMin) assert.ok(T.load - T.hold >= L.prepMin, `${tag}: preparazione ${T.load - T.hold} s`);
    if (L.prepAmp) assert.ok(P.prepAmp <= L.prepAmp, `${tag}: preparazione di ${P.prepAmp}°`);
    assert.ok(max(T.back, P.total).w <= L.ret, `${tag}: ritorno ${max(T.back, P.total).w.toFixed(0)} °/s`);
    assert.ok(stall(rows, T.inv - .12, P.contact) <= .04, `${tag}: fermo di ${stall(rows, T.inv - .12, P.contact)} s tra carica e colpo`);
    const follow = T.back - T.end;
    assert.ok(follow >= .1 - 1e-9 && follow <= .2 + 1e-9, `${tag}: fermo in fine colpo ${follow} s`);
    assert.ok(T.back - P.contact <= .6, `${tag}: ritorno ${T.back - P.contact} s dopo l'impatto`);
    if (L.cycle) assert.ok(Math.abs(P.total - L.cycle) <= .1, `${tag}: ciclo ${P.total} s`);
    if (L.contact) assert.ok(Math.abs(P.contact - L.contact) <= .01, `${tag}: contatto a ${P.contact} s`);
  }
});

test('servizio continuo (difetto (a) della specifica §5): lancio 300 °/s, raccordo ≤ 90 °/s senza salti, battuta 700 °/s 0,69 s dopo il picco del lancio, nel colmo della palla, sulla cima del telefono (presa nel palmo; a racchetta: servizio dal video, test «insieme del video»)', () => {
  for (const grip of ['palmo']){
  const o = { grip }, { P, rows, max } = speedRows('serve', o), T = P.T;
  const toss = max(T.load, T.tossEnd), hit = max(T.hitStart, T.end), link = max(T.tossEnd, T.hitStart);
  assert.ok(Math.abs(toss.t - T.tossPeak) <= H && Math.abs(toss.w - 300) <= 10, `lancio ${toss.w} a ${toss.t}`);
  assert.ok(Math.abs(hit.t - P.contact) <= H && Math.abs(hit.w - 700) <= 15, `battuta ${hit.w} a ${hit.t}`);
  assert.ok(Math.abs(P.contact - P.tossPeak - .69) < 1e-9);
  assert.ok(link.w <= 90, `raccordo ${link.w} °/s`);
  assert.ok(max(T.hold, T.load).w <= 60, `preparazione ${max(T.hold, T.load).w} °/s`);
  assert.ok(max(T.back, P.total).w <= 240);
  assert.ok(stall(rows, T.hitStart - .12, P.contact) <= .04, 'fermo «a trofeo» prima della battuta');
  assert.ok(P.total >= 3.4 && P.total <= 3.8, `ciclo ${P.total}`);
  // la mano sale sopra la testa nel raccordo
  assert.ok(gesturePose('serve', T.hitStart, o).pos[1] > GP.SHOULDER[1] + .25);
  // palla: appoggiata sul vetro fino al picco del lancio, poi staccata con la velocità del punto d'appoggio, colmo
  // nell'istante della battuta, sul punto di contatto; mai dentro il telefono (revisione B9 del 06/11: prima era lasciata
  // alla fine del lancio 9,5 mm dentro il telefono e saliva di soli 0,30 m). Con la presa a racchetta (telefono lungo
  // l'avambraccio, cima più inclinata) la palla sfiora il vetro subito dopo lo stacco: ammessi 2 mm (misurato 1,4 mm; il
  // disegno non lo vede, la palla ha raggio 34 mm)
  const b = t => gestureBall('serve', t, o);
  const gap = t => { const p = gesturePose('serve', t, o), l = GP.qrot(GP.qconj(p.q), sub(b(t), p.pos)), hw = [GP.PHONE.w/2, GP.PHONE.h/2, GP.PHONE.d/2]; return Math.hypot(...l.map((v, i) => Math.max(0, Math.abs(v) - hw[i]))); };
  for (let t = 0; t <= T.tossPeak; t += .01) assert.ok(Math.abs(gap(t) - GP.BALL_R) < 1e-9, `${grip}: palla appoggiata a ${t}: ${gap(t)}`);
  for (let t = T.tossPeak; t <= P.contact; t += .002) assert.ok(gap(t) >= GP.BALL_R - (grip === 'palmo' ? 1e-6 : 2e-3), `${grip}: palla dentro il telefono a ${t}: ${gap(t)}`);
  const rel = b(T.tossPeak), lift = b(P.contact)[1] - rel[1], vy0 = 2*lift/(P.contact - T.tossPeak);
  const vRest = (b(T.tossPeak) [1] - b(T.tossPeak - .002)[1])/.002;
  assert.ok(lift >= .4 && lift <= .7, `lancio di ${lift} m`);
  assert.ok(Math.abs(vy0 - vRest) <= .35*vRest, `velocità di stacco ${vy0} m/s, del telefono ${vRest}`);
  assert.ok(len(sub(b(P.contact), gestureContactPoint('serve', o))) < 1e-9);
  assert.ok(b(P.contact - .04)[1] < b(P.contact)[1] && b(P.contact + .04)[1] < b(P.contact)[1], 'colmo al contatto');
  for (const hand of HANDS) assert.ok(len(sub(gestureBall('serve', P.contact, { hand, grip }), gestureContactPoint('serve', { hand, grip }))) < 1e-9);
  }
});

// B17.1 passo B2 (decisioni dell'utente del 09/11 sera): con la presa a racchetta TUTTE le schede usano CHOREO_VIDEO,
// coreografie trovate dall'ottimizzatore (scripts/video/ottimizza.mjs: polso, piccoli scarti del braccio e tempi con il
// rilevatore vero nel costo) dalla partenza del video REST_VIDEO e con la presa del video: dritto, rovescio a due mani, tagliati
// e servizio tengono la forma del video (scarti misurati in docs/b17/ottimizzazione.md), piatto, pallonetto, palla corta,
// schiacciata e volée la forma approvata nel B13/B14. CHOREO_VIDEO_GREZZA (le pose del video come ricostruite, con i tempi del
// video) resta come riferimento: il telefono simulato NON la legge come il colpo mostrato, e il test qui sotto lo verifica.
const VIDEO_IDS = Object.keys(GP.CHOREO_VIDEO), FROM_VIDEO = ['forehand', 'backhand', 'slice', 'sliceBackhand', 'serve'];
test('insieme del video: tutte le schede della racchetta, dalla partenza del video (palla corta e schiacciata dalla posa di oggi, limite dichiarato), continue, ciclo chiuso, angoli nei limiti, parte veloce 0,18–0,32 s, picco = contatto, tC risolto e scritto', () => {
  assert.deepEqual([...VIDEO_IDS].sort(), [...FROM_VIDEO, 'flat', 'lob', 'drop', 'smash', 'volley'].sort());
  for (const id of [...VIDEO_IDS, 'cross', 'line', 'ready']){
    const o = { grip: 'racchetta' }, P = gesturePlan(id, o), step = 1/60;
    assert.equal(P.set, 'video', id); assert.equal(P.rest, ['drop', 'smash'].includes(id) ? GP.REST_COLPI_RACCHETTA : GP.REST_VIDEO, id);
    if (P.still) continue;
    let dw = 0, dp = 0;
    for (let t = 0; t < P.total; t += step){ const a = gesturePose(id, t, o), b = gesturePose(id, t + step, o); dw = Math.max(dw, len(omega(a.q, b.q, step))); dp = Math.max(dp, len(sub(a.pos, b.pos))); }
    assert.ok(dw <= 2000 && dp <= .15, `${id}: ${dw} °/s, ${dp} m`);
    const a = gesturePose(id, 0, o), z = gesturePose(id, P.total - 1e-9, o);
    assert.ok(len(sub(a.pos, z.pos)) <= .0005 && qangle(a.q, z.q) <= .2, `${id}: ciclo aperto`);
    for (let t = 0; t < P.total; t += 1/120){ const j = GP.gestureJoints(id, t, o); for (const [k, [lo, hi]] of Object.entries(GP.JOINT_LIMITS)) assert.ok(j[k] >= lo - 1e-9 && j[k] <= hi + 1e-9, `${id} ${t.toFixed(3)} ${k} ${j[k]}`); }
    const c = GP.choreoFor(id, 'video');
    if (FROM_VIDEO.includes(id) && P.kind === 'stroke') assert.ok(c.acc >= .18 - 1e-9 && c.acc <= .32 + 1e-9, `${id}: parte veloce ${c.acc} s`);
    const sc = GP.speedCurve(id, o);
    assert.ok(Math.abs(sc.at - P.contact) <= 1/120 + 1e-9, `${id}: picco a ${sc.at}, contatto ${P.contact}`);
    if (GP.CHOREO_VIDEO[id]){ const cc = { ...GP.CHOREO_VIDEO[id] }, stored = cc.tC; delete cc.tC; assert.ok(Math.abs(GP.motionFrom(id, cc, { rest: cc.rest || GP.REST_VIDEO, set: 'video' }).T.nominal - stored) < 2e-5, `${id}: tC ${stored}`); }
  }
});

// scarto dalla forma del video (cm, misurato con lo stesso codice dell'ottimizzatore: mano e gomito alle pose chiave contro
// quelli ricostruiti dal video al netto del bacino, traiettoria della mano a tempo normalizzato tra le pose chiave); limiti =
// valori trovati arrotondati in su (docs/b17/ottimizzazione.md), così una coreografia che si allontana dal video si vede qui
// (correzioni della revisione del passo B2: rovescio e tagliato di dritto con il proseguimento lento verso la fine del video)
// Passo B3 (schermo verso la rete all'impatto del dritto, dorso nel rovescio a una mano): l'impatto del dritto sale di 12,4 cm
// (12,6 cm dal video, prima 1,3) e la traiettoria si allontana di 11,7 cm in media (prima 7,2); rovescio impatto 11,4 cm (prima
// 7,6); tagliato di dritto impatto 5,9 cm (prima 1,9): misure in docs/b17/ottimizzazione.md §9
// Correzioni del passo B3: rovescio e tagliato di rovescio non seguono più il video (rovescio A DUE MANI, e tagliato di
// rovescio del video) ma lo SPECCHIO del dritto e del tagliato di dritto (test qui sotto)
const SHAPE_MAX = { forehand: { key: 13, impact: 13, path: 12 }, slice: { key: 10, impact: 6, path: 7 }, serve: { key: 17, impact: 6, path: 11 } };   // servizio riottimizzato con lo schermo verso la rete (14,5°, revisione del 10/11): impatto a 5,2 cm, fine a 16,2 cm
test('insieme del video: la forma resta quella del video (mano alle pose chiave e traiettoria entro gli scarti misurati)', () => {
  for (const id of Object.keys(SHAPE_MAX)){
    const P = planVideo(id, GP.CHOREO_VIDEO[id]); P.choreo = GP.CHOREO_VIDEO[id];
    const sh = shapeOf(id, P, videoRef(id)), L = SHAPE_MAX[id];
    for (const [k, v] of Object.entries(sh.keys)) assert.ok(v.dW <= L.key, `${id} ${k}: mano a ${v.dW.toFixed(1)} cm dal video (≤ ${L.key})`);
    assert.ok(sh.keys.impatto.dW <= L.impact, `${id}: impatto a ${sh.keys.impatto.dW.toFixed(1)} cm dal video (≤ ${L.impact})`);
    assert.ok(sh.path.mean <= L.path, `${id}: traiettoria a ${sh.path.mean.toFixed(1)} cm in media dal video (≤ ${L.path})`);
  }
});

// Revisione del passo B2: il primo giro dell'ottimizzatore leggeva un solo seme del rumore del telefono simulato (7, lo
// stesso dei test) e le soluzioni si erano adattate a quella realizzazione: con altri semi il tagliato era letto palla
// corta + tagliato, l'incrociato con la mira sotto 0,4, il piatto a 1,25× top spin (1416/1440 sui semi 1–6 e 8–11). Ora il
// costo legge i semi 7, 1, 5, 10 con un margine sulla mira; qui si leggono TRE SEMI CHE L'OTTIMIZZATORE NON HA VISTO
// (2, 3, 11): tutte le schede della racchetta, destro e mancino, due calibrazioni, 0,8× / 1× / 1,25×
test('insieme del video: letto giusto anche con semi del rumore che l\'ottimizzatore non ha visto (2, 3, 11), mira dell\'incrociato e del lungolinea con margine', () => {
  const HELD = [2, 3, 11];
  assert.ok(HELD.every(s => !SEEDS_DEFAULT.includes(s)) && SEEDS_DEFAULT.includes(7));
  const src = source('racchetta'), bad = [], ids = GP.POSE_IDS.filter(id => !GESTURES[id].still);
  let n = 0, aimMin = Infinity;
  const lim = newTally();
  for (const seed of HELD) for (const id of ids) for (const cal of CALS) for (const hand of HANDS) for (const rate of [1, .8, 1.25]){
    n++;
    // limite dichiarato (passo B3, ottimizzazione.md §9.4): letto e registrato in `lim`, non saltato (conto esatto sotto)
    const j = judgeOne(src, id, { hand, cal, rate, seed }, lim);
    if (j.why.length) bad.push(`seme ${seed} ${id} ${hand} cal=${cal} ×${rate}: ${j.why.join('; ')}`);
    else if (GESTURES[id].aim && !j.declared) aimMin = Math.min(aimMin, Math.abs(+j.r.read[0].ev.natpf.wrist));
  }
  assert.equal(n, 3*12*12);
  assert.deepEqual(bad, [], bad.join('\n'));
  assert.deepEqual(lim.byCard, DECLARED_EXPECT.held, JSON.stringify(lim.byCard));
  assert.ok(aimMin >= AIM_MARGIN - .1, `mira minima ${aimMin.toFixed(3)} (soglia 0,4)`);
});

// Revisione del passo B2: lo script dell'ottimizzatore deve rifare ESATTAMENTE le coreografie consegnate (prima il dritto
// trovato aveva la parte veloce a 0,319 s e lo script la limitava a 0,30). Le soluzioni stanno in scripts/video/soluzioni
// (vettore, nomi delle variabili e opzioni con cui sono state trovate): decode le riporta a CHOREO_VIDEO e AIM_TURN_VIDEO
test('ottimizzatore: le soluzioni salvate rifanno CHOREO_VIDEO e AIM_TURN_VIDEO (stessi numeri, arrotondati come --emit)', () => {
  const load = id => JSON.parse(readFileSync(new URL(`../scripts/video/soluzioni/${id}.json`, import.meta.url), 'utf8'));
  const r = (k, v) => typeof v === 'number' ? +v.toFixed(k === 'y' ? 4 : 3) : v;
  const fore = solutionChoreo('forehand', load('forehand')), bad = [];
  for (const id of [...Object.keys(GP.CHOREO_VIDEO), 'cross', 'line']){
    const sol = load(id), c = solutionChoreo(id, sol, { fore });
    if (id === 'cross' || id === 'line'){
      for (const [k, v] of Object.entries(GP.AIM_TURN_VIDEO[id])) if (+c.aim[k].toFixed(2) !== v) bad.push(`${id}.aim.${k}: ${c.aim[k]} invece di ${v}`);
      continue;
    }
    const ref = GP.CHOREO_VIDEO[id];
    for (const k of new Set([...Object.keys(c), ...Object.keys(ref)])){
      if (['tC', 'times', 'src', 'lag', 'jt', 'V'].includes(k)) continue;
      const x = c[k], y = ref[k];
      if (x && typeof x === 'object'){ for (const j of new Set([...Object.keys(x), ...Object.keys(y || {})])) if (r(j, x[j]) !== r(j, y?.[j])) bad.push(`${id}.${k}.${j}: ${x[j]} invece di ${y?.[j]}`); }
      else if (r(k, x) !== r(k, y)) bad.push(`${id}.${k}: ${x} invece di ${y}`);
    }
  }
  assert.deepEqual(bad, []);
});

// Revisione del passo B2: il tagliato di dritto aveva perso la «discesa lunga» del video (la mano scendeva di 10,5 cm, tutta
// prima dell'impatto, e dopo saliva di 1,3 cm; nel video scende di 27 cm, 11 dopo l'impatto, fino all'anca sinistra). Ora la
// parte veloce resta quella letta giusta e la mano prosegue lenta dopo la frenata verso la fine del video (F2, `slow`); il
// tagliato di rovescio (passo B3, specchio del tagliato di dritto) fa lo stesso dall'altra parte
test('insieme del video: tagliato di dritto e di rovescio in discesa lunga (≥ 20 cm dalla carica alla fine, ≥ 8 cm dopo l\'impatto, verso l\'anca opposta); proseguimento lento sotto 150 °/s', () => {
  const at = (id, t) => GP.gesturePose(id, t, { grip: 'racchetta' });
  for (const id of ['slice', 'sliceBackhand']){
    const P = gesturePlan(id, { grip: 'racchetta' }), T = P.T, fine = T.back - GP.CHOREO_VIDEO[id].fin, s = id === 'slice' ? 1 : -1;
    const yC = at(id, T.inv).chain.W[1], yI = at(id, P.contact).chain.W[1], F = at(id, fine).chain.W;
    assert.ok(F[1] <= yC - .2, `${id}: fine a ${F[1].toFixed(3)} m, carica a ${yC.toFixed(3)} m`);
    assert.ok(F[1] <= yI - .08, `${id}: dopo l'impatto la mano scende di ${((yI - F[1])*100).toFixed(1)} cm`);
    assert.ok(s*F[0] < .08 && F[1] < 1.22, `${id}: fine a (${F.map(v => v.toFixed(2)).join('; ')}), non verso l'anca opposta`);
    let w = 0; for (let t = T.fastEnd; t < fine; t += 1/240) w = Math.max(w, at(id, t).speed);
    assert.ok(w <= 150, `${id}: telefono a ${w.toFixed(0)} °/s nel proseguimento lento`);
  }
});

// Correzioni del passo B3 (richiesta dell'utente: «il rovescio invece stesso movimento ma con l'altro lato», «Per il rovescio, a
// una mano»): il rovescio è lo SPECCHIO del dritto (mano al netto del bacino con x → −x, alle pose chiave e a tempo normalizzato
// fra le pose chiave: ottimizza.mjs mirrorOf) e il tagliato di rovescio lo specchio del tagliato di dritto. Prima delle
// correzioni (rovescio a due mani del video con una mano sola) lo scarto era 44,8 cm in media (impatto 48,5) e il tagliato di
// rovescio 35,5 cm (normalizzazione su tutto il gesto). Limiti = valori trovati arrotondati in su (ottimizzazione.md §9.7).
// Rovescio: all'impatto braccio disteso (spalla–polso ≥ 0,85 della lunghezza del braccio) e contatto a sinistra e davanti
const MIRROR_MAX = { backhand: { mean: 15, impact: 15, key: 25 }, sliceBackhand: { mean: 9, impact: 4, key: 6 } };
test('rovescio a una mano e tagliato di rovescio: lo stesso movimento del dritto e del tagliato di dritto dall\'altro lato (scarto dallo specchio), rovescio a braccio disteso con il contatto davanti all\'anca sinistra', () => {
  for (const [id, L] of Object.entries(MIRROR_MAX)){
    const P = planVideo(id, GP.CHOREO_VIDEO[id]); P.choreo = GP.CHOREO_VIDEO[id];
    const F = planVideo(MIRROR_OF[id], GP.CHOREO_VIDEO[MIRROR_OF[id]]); F.choreo = GP.CHOREO_VIDEO[MIRROR_OF[id]];
    const m = mirrorOf(P, F);
    assert.ok(m.mean <= L.mean, `${id}: ${m.mean.toFixed(1)} cm in media dallo specchio (≤ ${L.mean})`);
    assert.ok(m.keys.impatto <= L.impact, `${id}: impatto a ${m.keys.impatto.toFixed(1)} cm dallo specchio (≤ ${L.impact})`);
    for (const [k, v] of Object.entries(m.keys)) assert.ok(v <= L.key, `${id} ${k}: ${v.toFixed(1)} cm dallo specchio (≤ ${L.key})`);
  }
  const P = gesturePlan('backhand', { grip: 'racchetta' }), c = P.raw(P.contact).chain, reach = len(sub(c.W, c.S));
  assert.ok(reach >= .85*(GP.ARM.upper + GP.ARM.fore), `rovescio: spalla–polso ${reach.toFixed(3)} m all'impatto`);
  assert.ok(c.W[0] < -.25 && c.W[2] < -.3, `rovescio: polso all'impatto a (${c.W.map(v => v.toFixed(2)).join('; ')}), non davanti all'anca sinistra`);
  // la fine non passa davanti al viso: il telefono resta ≥ 15 cm dal centro della testa dopo il contatto
  let dh = Infinity; for (let t = P.contact; t <= P.T.back; t += 1/120){ const p = GP.gesturePose('backhand', t, { grip: 'racchetta' }), h = GP.add(p.chain.pelvis, GP.qrot(p.chain.trunk, GP.BODY.head)); dh = Math.min(dh, len(sub(p.pos, h))); }
  assert.ok(dh >= .15, `rovescio: telefono a ${(dh*100).toFixed(1)} cm dal centro della testa`);
});

// Correzioni del passo B3: la volée è un gesto corto (prima un dritto pieno: parte veloce 0,32 s, 96 cm dalla carica all'impatto)
test('volée corta: parte veloce ≤ 0,12 s, mano ≤ 0,30 m dalla carica all\'impatto, carica davanti al corpo, schermo verso la rete', () => {
  const c = GP.CHOREO_VIDEO.volley, P = gesturePlan('volley', { grip: 'racchetta' }), W = t => P.raw(t).chain.W;
  assert.ok(c.acc <= .12, `parte veloce ${c.acc} s`);
  let path = 0, a = W(P.T.inv); for (let t = P.T.inv + 1/240; t <= P.contact; t += 1/240){ const b = W(t); path += len(sub(b, a)); a = b; }
  assert.ok(path <= .30, `percorso ${path.toFixed(3)} m`);
  assert.ok(W(P.T.inv)[2] < -.2, `carica a z = ${W(P.T.inv)[2].toFixed(2)} m (non davanti al corpo)`);
  assert.ok(GP.impactFaceAngle('volley', { grip: 'racchetta' }) <= 20);
});

test('insieme del video: le pose del video GREZZE (CHOREO_VIDEO_GREZZA, tempi del video) NON sono lette come il colpo mostrato dal telefono simulato (per questo il tutorial usa quelle ottimizzate)', () => {
  const plans = Object.fromEntries(Object.keys(GP.CHOREO_VIDEO_GREZZA).map(id => [id, planVideo(id, GP.CHOREO_VIDEO_GREZZA[id])]));
  const wrap = (P, t) => ((t % P.total) + P.total) % P.total;
  const src = { plan: id => plans[id] || gesturePlan(id), pose: (id, t, hand = 'right') => { const P = plans[id] || gesturePlan(id), p = P.raw(wrap(P, t)); return hand === 'left' ? GP.mirrorPose(p) : p; } };
  for (const id of Object.keys(GP.CHOREO_VIDEO_GREZZA)){
    const r = readCard(src, id, { hand: 'right', cal: 'arm' }), why = judgeCard(src, id, r, { hand: 'right' });
    assert.ok(why.length > 0, `${id}: la coreografia grezza è letta come il colpo mostrato`);
  }
});

test('continuità e ciclo chiuso: nessun salto (|ω| ≤ 2000 °/s, |Δpos| ≤ 0,15 m a 60 Hz), posa a 0 e alla fine del ciclo uguali', () => {
  for (const id of GP.POSE_IDS) for (const hand of HANDS){
    const P = gesturePlan(id), step = 1/60;
    let dw = 0, dp = 0;
    for (let t = 0; t < P.total; t += step){ const a = gesturePose(id, t, { hand }), b = gesturePose(id, t + step, { hand }); dw = Math.max(dw, len(omega(a.q, b.q, step))); dp = Math.max(dp, len(sub(a.pos, b.pos))); }
    assert.ok(dw <= 2000 && dp <= .15, `${id} ${hand}: ${dw} °/s, ${dp} m`);
    const a = gesturePose(id, 0, { hand }), z = gesturePose(id, P.total - 1e-9, { hand });
    assert.ok(len(sub(a.pos, z.pos)) <= .0005 && qangle(a.q, z.q) <= .2, `${id} ${hand}: ciclo aperto`);
    // il tempo si ripete
    assert.deepEqual(gesturePose(id, .3 + P.total, { hand }).pos.map(v => +v.toFixed(9)), gesturePose(id, .3, { hand }).pos.map(v => +v.toFixed(9)));
  }
});

test('mancino: specchio esatto del destro (posizione, orientamento, palla, scheletro, camera)', () => {
  const M = v => [-v[0], v[1], v[2]], MQ = q => [q[0], -q[1], -q[2], q[3]];
  const close = (a, b, tag) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, tag));
  for (const id of GP.POSE_IDS){
    const P = gesturePlan(id);
    for (let k = 0; k <= 20; k++){
      const t = P.total*k/20, r = gesturePose(id, t, { rig: true }), l = gesturePose(id, t, { hand: 'left', rig: true }), tag = `${id} ${t}`;
      close(l.pos, M(r.pos), tag); close(l.q, MQ(r.q), tag);
      assert.equal(l.speed.toFixed(6), r.speed.toFixed(6)); assert.equal(l.phase, r.phase);
      close(l.rig.wrist, M(r.rig.wrist), tag); close(l.rig.elbow, M(r.rig.elbow), tag);
      r.rig.fingers.forEach((f, i) => f.pts.forEach((p, j) => close(l.rig.fingers[i].pts[j], M(p), tag)));
      const br = gestureBall(id, t), bl = gestureBall(id, t, { hand: 'left' });
      if (br) close(bl, M(br), tag); else assert.equal(bl, null);
    }
    const c = GP.cameraFor(id), cl = GP.cameraFor(id, { hand: 'left' });
    if (c.dir) close(cl.dir, M(c.dir), id);
  }
});

test('fasi e momenti chiave per il disegno: in ordine, coprono il ciclo, «Impatto» per ±30 ms attorno al contatto; palla sulla cima del telefono nell\'istante del contatto', () => {
  for (const id of GP.POSE_IDS){
    const P = gesturePlan(id);
    assert.equal(P.phases[0].from, 0); assert.ok(Math.abs(P.phases.at(-1).to - P.total) < 1e-9);
    P.phases.forEach((ph, i) => { assert.ok(ph.to >= ph.from, `${id} ${ph.id}`); if (i) assert.ok(Math.abs(ph.from - P.phases[i - 1].to) < 1e-9, `${id}: buco tra le fasi`); });
    if (P.still){ assert.equal(gesturePose(id, 1).label, ''); continue; }
    assert.equal(gesturePose(id, P.contact).phase, 'impatto');
    assert.equal(gesturePose(id, P.contact).label, 'Impatto');
    assert.notEqual(gesturePose(id, P.contact - .04).phase, 'impatto');
    assert.notEqual(gesturePose(id, P.contact + .04).phase, 'impatto');
    assert.ok(P.keys.some(k => Math.abs(k.t - P.contact) < 1e-9 && k.label === 'Impatto'));
    // la palla incontra la faccia del telefono vicino alla cima (centro della palla a un raggio dal vetro)
    const pose = gesturePose(id, P.contact), C = gestureContactPoint(id), loc = GP.qrot(GP.qconj(pose.q), sub(C, pose.pos));
    assert.ok(len(sub(gestureBall(id, P.contact), C)) < 1e-9, `${id}: palla al contatto`);
    assert.ok(Math.abs(Math.abs(loc[2]) - (GP.PHONE.d/2 + GP.BALL_R)) < 1e-9 && loc[1] > GP.PHONE.h*.3 && loc[1] < GP.PHONE.h/2, `${id}: punto di contatto ${loc}`);
    // velocità esposta per la banda «Picco = impatto»
    const sc = GP.speedCurve(id);
    assert.ok(Math.abs(sc.at - P.contact) <= 1/120 + 1e-9, `${id}: curva della velocità ${sc.at}`);
  }
  const s = gesturePlan('serve');
  assert.deepEqual(s.phases.map(p => p.label), ['Pronto', 'Carica', 'Lancio', 'Braccio in alto', 'Battuta', 'Impatto', 'Accompagna', 'Ritorno', 'Pronto']);
  assert.deepEqual(gesturePlan('forehand').phases.map(p => p.label), ['Pronto', 'Carica', 'Colpo', 'Impatto', 'Accompagna', 'Ritorno', 'Pronto']);
});

test('scheletro per il disegno: mano e avambraccio rigidi con il telefono (polso fermo), dita sul vetro ≤ 8 mm', () => {
  assert.ok(GP.fingersOverGlass() <= .008, `dita sul vetro ${GP.fingersOverGlass()} m`);
  for (const id of GP.POSE_IDS){
    const P = gesturePlan(id);
    for (let k = 0; k <= 12; k++){
      const p = gesturePose(id, P.total*k/12, { rig: true }), r = p.rig;
      assert.ok(Math.abs(len(sub(r.elbow, r.wrist)) - GP.ARM.fore) < 1e-9);
      assert.ok(Math.abs(len(sub(r.shoulder, r.elbow)) - GP.ARM.upper) < 1e-9);
      // il polso resta alla stessa distanza dal centro del telefono (mano rigida)
      assert.ok(Math.abs(len(sub(r.wrist, p.pos)) - len(P.handLocal.wrist)) < 1e-9);
      assert.equal(r.fingers.length, 4); assert.equal(r.thumb.pts.length, 4);
    }
  }
});

test('la verifica trova i difetti dell\'animazione di prima (specifica §5): servizio, pallonetto, schiacciata e volée sbagliano; dritto, rovescio, piatto, palla corta, tagliato e mira no', () => {
  const src = legacyPoseSource();
  for (const cal of CALS) for (const hand of HANDS){
    const why = id => judgeCard(src, id, readCard(src, id, { hand, cal }), { hand }), tag = `${hand} cal=${cal}`;
    const serve = readCard(src, 'serve', { hand, cal });
    assert.equal(serve.events.length, 3, `${tag}: servizio di prima, ${serve.events.length} gesti (attesi 3: il salto della mano tra lancio e battuta)`);
    assert.ok(why('serve').length > 0);
    for (const id of ['lob', 'smash', 'volley']){
      const r = readCard(src, id, { hand, cal });
      assert.equal(r.read.length, 2, `${tag}: ${id} di prima, ${r.read.length} colpi (attesi 2: la preparazione letta come colpo)`);
      assert.ok(why(id).length > 0, `${tag}: ${id}`);
    }
    for (const id of ['forehand', 'backhand', 'flat', 'drop', 'slice', 'cross', 'line', 'grip', 'ready']) assert.deepEqual(why(id), [], `${tag}: ${id}`);
  }
});
