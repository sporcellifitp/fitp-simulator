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

const { gesturePose, gesturePlan, gestureBall, gestureContactPoint, gestureRig, omega, len, sub, qangle } = GP;
const source = (grip = undefined, set = undefined) => ({ name: 'posa nuova', pose: (id, t, hand) => gesturePose(id, t, { hand, grip, set }), plan: id => gesturePlan(id, { grip, set }) });
const STROKE_CARDS = GP.CARD_IDS.filter(id => !GESTURES[id].still);
const HANDS = ['right', 'left'], CALS = ['pose', 'arm'];
// imitazione più lenta o più veloce: dove la velocità è il discriminante si ammette solo il cambiamento nel verso giusto
// (specifica §6.5, brief §5.6): il proprio dritto/rovescio più veloce diventa piatto, il tagliato più lento palla corta,
// il piatto più lento torna top spin
const allowFor = (id, rate) => rate > 1 ? (['forehand', 'backhand', 'volley', 'cross', 'line'].includes(id) ? ['flat'] : null)
  : rate < 1 ? ({ slice: ['drop'], sliceBackhand: ['drop'], flat: ['topspin'] })[id] || null : null;

// Limite misurato (B17.1, presa a racchetta): il PIATTO con la calibrazione del braccio simulato è letto top spin. Il piatto
// è «il proprio dritto più veloce» con la salita della testa entro ±0,12 da quella abituale (natpf_stroke_intent flatRise);
// la salita abituale che il braccio simulato dà con il telefono lungo l'avambraccio (cima in avanti) è 0,23, il piatto
// della coreografia sale 0,07 (forza 0,63 ≥ 0,62: la forza basta). Con la calibrazione fatta con i gesti dell'animazione
// (quella di chi imita il tutorial) il piatto si legge. Si ammette solo questo caso (docs/b17/posa-dal-video.md §limiti).
const allowLimit = (grip, id, cal) => grip === 'racchetta' && id === 'flat' && cal === 'arm' ? ['topspin'] : null;
function check(src, ids, { hands = HANDS, cals = CALS, rates = [1], grip = GRIP_STYLE } = {}){
  const bad = [];
  let n = 0;
  for (const cal of cals) for (const hand of hands) for (const rate of rates) for (const id of ids){
    n++;
    const r = readCard(src, id, { hand, cal, rate });
    const why = judgeCard(src, id, r, { hand, rate, allow: [...(allowFor(id, rate) || []), ...(allowLimit(grip, id, cal) || [])] });
    if (why.length) bad.push(`${id} ${hand} cal=${cal} ×${rate}: ${why.join('; ')}`);
  }
  return { bad, n };
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
    const { bad, n } = check(source(grip), GP.POSE_IDS, { grip });
    assert.equal(n, GP.POSE_IDS.length*4);
    assert.deepEqual(bad, [], `presa ${grip}:\n${bad.join('\n')}`);
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
    assert.ok(Math.abs(s.gap - .69) <= 1.5*DT/1000, `servizio ${hand}: battuta ${s.gap} s dopo il lancio`);
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

test('tempi dei colpi (brief §5.4): picco = contatto, picco e ampiezza, preparazione e ritorno sotto i limiti, nessun fermo tra carica e colpo, fermo finale 0,10–0,20 s, ritorno entro 0,6 s, ciclo', () => {
  for (const [id, L] of Object.entries(LIMITS)){
    const { P, rows, max } = speedRows(id), T = P.T, tag = id;
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

test('servizio continuo (difetto (a) della specifica §5): lancio 300 °/s, raccordo ≤ 90 °/s senza salti, battuta 700 °/s 0,69 s dopo il picco del lancio, nel colmo della palla, sulla cima del telefono (presa nel palmo e a racchetta)', () => {
  for (const grip of ['palmo', 'racchetta']){
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

// B17.1 passo B: insieme di coreografie DAL VIDEO dell'utente (CHOREO_VIDEO, set 'video', partenza REST_VIDEO). Si costruisce,
// è continuo e chiude il ciclo; la lettura con il telefono simulato NON è ancora quella mostrata (misure e scelte proposte in
// docs/b17/posa-dal-video.md): il test della lettura è segnato «da fare» (todo) e riporta che cosa legge oggi, così il giorno
// in cui una scheda sarà letta bene si vede qui e si aggiunge a VIDEO_CARDS
const VIDEO_IDS = Object.keys(GP.CHOREO_VIDEO);
test('insieme del video: si costruisce dalla partenza del video, continuo, ciclo chiuso, tempi del video (carica → impatto → fine)', () => {
  for (const id of VIDEO_IDS){
    const o = { grip: 'racchetta', set: 'video' }, P = gesturePlan(id, o), c = GP.CHOREO_VIDEO[id], step = 1/60;
    assert.equal(P.set, 'video'); assert.equal(P.rest, GP.REST_VIDEO);
    let dw = 0, dp = 0;
    for (let t = 0; t < P.total; t += step){ const a = gesturePose(id, t, o), b = gesturePose(id, t + step, o); dw = Math.max(dw, len(omega(a.q, b.q, step))); dp = Math.max(dp, len(sub(a.pos, b.pos))); }
    assert.ok(dw <= 2000 && dp <= .15, `${id}: ${dw} °/s, ${dp} m`);
    const a = gesturePose(id, 0, o), z = gesturePose(id, P.total - 1e-9, o);
    assert.ok(len(sub(a.pos, z.pos)) <= .0005 && qangle(a.q, z.q) <= .2, `${id}: ciclo aperto`);
    const j0 = GP.gestureJoints(id, 0, o); for (const k of GP.JOINTS) assert.ok(Math.abs(j0[k] - GP.REST_VIDEO[k]) < 1e-6, `${id}: parte da REST_VIDEO`);
    for (let t = 0; t < P.total; t += 1/120){ const j = GP.gestureJoints(id, t, o); for (const [k, [lo, hi]] of Object.entries(GP.JOINT_LIMITS)) assert.ok(j[k] >= lo - 1e-9 && j[k] <= hi + 1e-9, `${id} ${t.toFixed(3)} ${k} ${j[k]}`); }
    if (P.kind === 'serve'){ assert.ok(Math.abs((P.T.tossEnd - P.T.load) - (c.times.alto - c.times.carica)) < 1e-6, `${id}: salita`); }
    else {
      // la parte veloce dura quanto nel video (carica → impatto) e la frenata quanto impatto → fine
      assert.ok(Math.abs(c.acc - (c.times.impatto - c.times.carica)) < 1e-6 && Math.abs(c.dMax - (c.times.fine - c.times.impatto)) < 1e-6, `${id}: tempi del video`);
      assert.ok(Math.abs(P.contact - c.contact) < .02, `${id}: contatto ${P.contact} (atteso ${c.contact})`);
    }
    assert.ok(P.peak > 300, `${id}: picco ${P.peak}`);
  }
  assert.deepEqual([...GP.VIDEO_CARDS], [], 'VIDEO_CARDS vuoto finché nessuna scheda del video è letta bene (vedi test todo)');
});

test('insieme del video: lettura con il telefono simulato (DA FARE: oggi nessuna scheda è letta come il colpo mostrato, docs/b17/posa-dal-video.md §3)', { todo: true }, () => {
  const src = source('racchetta', 'video'), bad = [];
  for (const id of VIDEO_IDS){
    const r = readCard(src, id, { hand: 'right', cal: 'arm' }), why = judgeCard(src, id, r, { hand: 'right' });
    if (why.length) bad.push(`${id}: ${why.join('; ')}`);
  }
  assert.deepEqual(bad, [], bad.join('\n'));
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
