// Fisica del braccio dei gesti del tutorial (B13, docs/b13/gesti-nuovi.md): la posa disegnata (natpf_gesture_pose) è una
// catena cinematica vera. Qui si verifica che lo resti: lunghezze dei segmenti costanti, angoli articolari dentro i limiti
// del corpo, moto continuo (niente salti di posizione, velocità o angolo) e ciclo chiuso, telefono rigido nella mano,
// sequenza prossimo-distale (busto prima, mano per ultima), mancino specchio esatto; più le pose che fanno leggere i colpi
// (dritto con le spalle che girano, la mano sotto la palla, dal basso verso l'alto, fine davanti alla spalla sinistra;
// posizione di partenza davanti allo sterno con il gomito al fianco; servizio e schiacciata sopra la testa).
// La fedeltà al riconoscimento (telefono simulato completo) resta in natpf-gesture-pose e natpf-gesture-anim.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as GP from '../src/natpf/natpf_gesture_pose.js';
import { GRIP_POSE, GESTURES } from '../src/natpf/natpf_gesture_motion.js';

const { gesturePose, gesturePlan, gestureJoints, len, sub, dot, norm, qrot, qconj, qmul, qangle, omega } = GP;
const HANDS = ['right', 'left'], GRIPS = ['racchetta', 'palmo', 'martello'];
const STROKES = GP.POSE_IDS.filter(id => !gesturePlan(id).still);
const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

test('catena: omero 0,30 m e avambraccio 0,262 m costanti, spalla fissa sul busto, polso fisso nel riferimento del telefono, telefono rigido nella mano (destro e mancino, palmo e martello)', () => {
  const sh = len(GP.BODY.shoulder);
  for (const grip of GRIPS){
    const P0 = gesturePlan('ready', { grip }), G = P0.G, wl = P0.handLocal.wrist;
    for (const id of GP.POSE_IDS) for (const hand of HANDS){
      const P = gesturePlan(id, { grip });
      for (let t = 0; t < P.total; t += 1/60){
        const p = gesturePose(id, t, { hand, grip }), c = p.chain, tag = `${grip} ${id} ${hand} ${t.toFixed(3)}`;
        assert.ok(close(len(sub(c.S, c.E)), GP.ARM.upper) && close(len(sub(c.E, c.W)), GP.ARM.fore), `${tag}: segmenti`);
        assert.ok(close(len(sub(c.S, c.pelvis)), sh), `${tag}: spalla staccata dal busto`);
        // (il mancino è lo specchio: nel suo riferimento del telefono il polso ha x opposta)
        const local = qrot(qconj(p.q), sub(c.W, p.pos)), w = hand === 'left' ? [-wl[0], wl[1], wl[2]] : wl;
        assert.ok(local.every((v, i) => close(v, w[i])), `${tag}: polso ${local} invece di ${w}`);
        // telefono rigido nella mano: q = mano · G (per il mancino lo specchio della presa)
        const g = hand === 'left' ? GP.mirrorQ(G) : G;
        assert.ok(qangle(qmul(qconj(c.hand), p.q), g) < 1e-4, `${tag}: telefono che scivola nella mano`);
      }
    }
  }
});

test('angoli articolari sempre dentro i limiti del corpo (busto, ginocchia, spalla a 3 gradi, gomito, pronosupinazione, polso)', () => {
  const bad = [];
  for (const id of GP.POSE_IDS){
    const P = gesturePlan(id);
    for (let t = 0; t < P.total; t += 1/240){
      const j = gestureJoints(id, t);
      for (const [k, [a, b]] of Object.entries(GP.JOINT_LIMITS)) if (!(j[k] >= a - 1e-9 && j[k] <= b + 1e-9)) bad.push(`${id} ${t.toFixed(3)} ${k} ${j[k].toFixed(2)} ∉ [${a}, ${b}]`);
    }
  }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} fuori dai limiti`);
});

// un salto di velocità di un'articolazione (anche di soli 33 °/s) in un passo di 1/1200 s darebbe una «accelerazione»
// sopra 40 000 °/s²; il moto vero arriva a ~21 000 (piatto)
test('continuità: angoli e velocità articolari senza salti (accelerazione ≤ 40 000 °/s², velocità ≤ 2000 °/s), punti della catena senza salti, ciclo chiuso sulla posizione di partenza', () => {
  const h = 1/1200, bad = [];
  for (const id of GP.POSE_IDS){
    const P = gesturePlan(id);
    for (let t = h; t < P.total - h; t += h){
      const a = gestureJoints(id, t - h), b = gestureJoints(id, t), c = gestureJoints(id, t + h);
      for (const k of GP.JOINTS){
        if (k === 'y') continue;
        const acc = Math.abs(a[k] - 2*b[k] + c[k])/(h*h), v = Math.abs(c[k] - a[k])/(2*h);
        if (acc > 40000 || v > 2000) bad.push(`${id} ${t.toFixed(4)} ${k}: ${v.toFixed(0)} °/s, ${acc.toFixed(0)} °/s²`);
      }
    }
    for (let t = 0; t < P.total; t += 1/60){
      const p = gesturePose(id, t).chain, q = gesturePose(id, t + 1/60).chain;
      for (const k of ['S', 'E', 'W']) if (len(sub(p[k], q[k])) > .15) bad.push(`${id} ${t.toFixed(3)} ${k}: salto di ${len(sub(p[k], q[k])).toFixed(3)} m`);
    }
    // il ciclo parte e finisce nella posizione di partenza della coreografia (angoli uguali a P.rest: REST, o la partenza
    // delle foto/del video con la presa a racchetta)
    for (const t of [0, P.total - 1e-9]){ const j = gestureJoints(id, t); for (const k of GP.JOINTS) if (!close(j[k], P.rest[k], 1e-6)) bad.push(`${id} ${t}: ${k} ${j[k]} invece di ${P.rest[k]}`); }
  }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} problemi`);
});

test('posizione di partenza (presa nel palmo): telefono davanti allo sterno con la presa approvata esatta (GRIP_POSE.palmo), gomito al fianco sotto la spalla, avambraccio come la foto', () => {
  const p = gesturePose('ready', 1, { grip: 'palmo' }), c = p.chain;
  assert.ok(qangle(p.q, GP.gripQuat('palmo')) < .01, `presa ${qangle(p.q, GP.gripQuat('palmo'))}°`);
  assert.ok(Math.abs(p.pos[0]) < .12 && p.pos[2] < -.2 && p.pos[1] > 1.1 && p.pos[1] < 1.35, `telefono ${p.pos}`);
  assert.ok(Math.abs(c.E[0] - c.S[0]) < .05 && c.E[1] < c.S[1] - .25, `gomito ${c.E}`);
  // la direzione dell'avambraccio è quella approvata (HAND.forearmDir nel riferimento del telefono): entro 0,5°
  const want = qrot(GP.gripQuat('palmo'), norm(GP.HAND.forearmDir)), got = norm(sub(c.E, c.W));
  assert.ok(Math.acos(Math.min(1, dot(want, got)))*180/Math.PI < .5, 'avambraccio della foto');
  assert.deepEqual(GRIP_POSE.palmo.euler, [-40, 0, 35]);
});

// B17.1 passo B2 (decisione dell'utente del 09/11 sera, «come la mia impugnatura del video»): il telefono nella mano è quello
// MISURATO nei colpi del video (PHONE_IN_HAND_VIDEO, rigido in tutte le schede della racchetta); la scheda «Presa»
// (REST_RACCHETTA) lo mostra nella posa delle foto: gomito al fianco, telefono lungo l'avambraccio, cima in avanti e in alto,
// polso dritto, il bordo del pollice in ALTO e le dita sotto (come nel video e nella foto; correzione dopo la revisione: con
// il primo piano del video il pollice disegnato stava sotto); GRIP_POSE.racchetta.euler è quella posa nel campo; la
// partenza dei colpi è la posa ferma del video
test('presa a racchetta: la presa misurata nel video, rigida nella mano; scheda «Presa» con la cima in avanti, il pollice in alto e le dita sotto; GRIP_POSE.racchetta.euler = posa della scheda', () => {
  const p = gesturePose('grip', 1, { grip: 'racchetta', rig: true }), c = p.chain, rig = p.rig;
  const tip = qrot(p.q, [0, 1, 0]), screen = qrot(p.q, [0, 0, 1]), thumbEdge = qrot(p.q, [1, 0, 0]);
  assert.ok(tip[2] < -.85 && tip[1] > .2, `cima ${tip}: in avanti e in alto`);
  assert.ok(thumbEdge[1] > .8, `bordo del pollice ${thumbEdge}: in alto`);
  // il pollice disegnato sopra il telefono, le dita (polpastrelli) sotto il centro del telefono
  assert.ok(rig.thumb.pts[2][1] > p.pos[1] + .02, 'pollice sotto il telefono');
  for (const f of rig.fingers) assert.ok(f.pts[3][1] < p.pos[1] - .01, `${f.name}: polpastrello sopra il telefono`);
  assert.ok(screen[0] < -.8, `schermo ${screen}: verso l'interno`);
  assert.equal(c.j.fl, 0); assert.equal(c.j.dv, 0);
  assert.ok(c.E[1] < 1.15 && c.W[2] < -.2 && c.W[1] > 1 && c.W[1] < 1.2, `gomito ${c.E} al fianco, mano ${c.W} davanti`);
  assert.ok(qangle(p.q, GP.gripQuat('racchetta')) < .01 && qangle(GP.qEuler(GRIP_POSE.racchetta.euler), GP.gripQuat('racchetta')) < .01);
  assert.equal(GP.PHONE_IN_HAND_RACCHETTA, GP.PHONE_IN_HAND_VIDEO);
  assert.ok(qangle(GP.PHONE_IN_HAND_VIDEO, GP.qmul(GP.qaxis([1, 1, 0], Math.PI), GP.qEuler(GP.VIDEO_GRIP_EULER))) < 1e-3);
  assert.deepEqual([...GP.VIDEO_GRIP_EULER], [45, 10, 65]);
  for (const id of GP.POSE_IDS) assert.ok(qangle(gesturePlan(id, { grip: 'racchetta' }).G, GP.PHONE_IN_HAND_VIDEO) < 1e-4, id);
  // partenza dei colpi: la posa ferma del video (media degli angoli misurati 9,4–9,7 s)
  const r = gesturePose('ready', 1, { grip: 'racchetta' }).chain;
  for (const k of GP.JOINTS) assert.equal(r.j[k], GP.REST_VIDEO[k], k);
  assert.ok(r.W[1] < 1.0 && r.W[0] > .12, `mano all'anca ${r.W}`);
});

// tempo del picco della velocità angolare di un segmento (busto, omero, avambraccio, mano) attorno al contatto
function segPeak(id, k, o = {}){
  const P = gesturePlan(id, o), h = 1/600; let m = 0, at = 0;
  for (let t = P.contact - .3; t <= P.contact + .1; t += h){ const w = len(omega(gesturePose(id, t, o).chain[k], gesturePose(id, t + h, o).chain[k], h)); if (w > m){ m = w; at = t + h/2; } }
  return { w: m, dt: at - P.contact };
}
test('sequenza prossimo-distale: il busto arriva al suo picco prima della mano, l\'omero e l\'avambraccio non dopo la mano; la mano (= telefono) ha il picco al contatto', () => {
  for (const id of ['forehand', 'backhand', 'flat', 'slice', 'volley', 'cross', 'line', 'smash', 'drop', 'lob']){
    const [tr, up, fo, ha] = ['trunk', 'upper', 'fore', 'hand'].map(k => segPeak(id, k));
    assert.ok(Math.abs(ha.dt) <= 1/300, `${id}: mano al picco a ${ha.dt}`);
    assert.ok(tr.dt < ha.dt - .004, `${id}: busto a ${(tr.dt*1000).toFixed(0)} ms, mano a ${(ha.dt*1000).toFixed(0)}`);
    assert.ok(up.dt <= ha.dt + .003 && fo.dt <= ha.dt + .003, `${id}: omero ${(up.dt*1000).toFixed(0)} ms, avambraccio ${(fo.dt*1000).toFixed(0)} ms`);
  }
  // nei colpi orizzontali la velocità cresce dal busto alla mano
  // (B17.1 passo B2: il rovescio A DUE MANI del video ruota il busto di 83° nella parte veloce, da +46° a −37°, e con le braccia
  // legate il busto arriva a 774 °/s contro i 700 del telefono, misurato: per lui, con la presa a racchetta, busto ≤ 1,2 × mano;
  // il rovescio a una mano della presa nel palmo resta sotto 0,8)
  for (const id of ['forehand', 'backhand', 'flat', 'slice', 'volley']){ const tr = segPeak(id, 'trunk'), ha = segPeak(id, 'hand'), k = id === 'backhand' && gesturePlan(id).set === 'video' ? 1.2 : .8; assert.ok(tr.w < k*ha.w, `${id}: busto ${tr.w} mano ${ha.w}`); }
  { const o = { grip: 'palmo' }, tr = segPeak('backhand', 'trunk', o), ha = segPeak('backhand', 'hand', o); assert.ok(tr.w < .8*ha.w, `rovescio nel palmo: busto ${tr.w} mano ${ha.w}`); }
});

test('mancino: catena specchio esatta del destro (punti x → −x) con gli stessi angoli', () => {
  const M = v => [-v[0], v[1], v[2]];
  for (const id of GP.POSE_IDS){
    const P = gesturePlan(id);
    for (let k = 0; k <= 20; k++){
      const t = P.total*k/20, r = gesturePose(id, t).chain, l = gesturePose(id, t, { hand: 'left' }).chain;
      for (const key of ['pelvis', 'S', 'E', 'W']) M(r[key]).forEach((v, i) => assert.ok(close(v, l[key][i]), `${id} ${t} ${key}`));
      for (const key of GP.JOINTS) assert.equal(l.j[key], r.j[key]);
    }
  }
});

// Revisione B13: la verifica di prima guardava solo il polso e il centro del telefono; nel rovescio l'avambraccio passava
// dentro la pancia e nel servizio le dita e il telefono entravano nella testa. Qui avambraccio (raggio 3 cm), dita e
// telefono (cima, base, centro) contro il busto (ellisse 0,16 × 0,11 m allargata del raggio) e contro la testa (sfera).
test('avambraccio, gomito, dita e telefono non entrano mai nel busto né nella testa', () => {
  const bad = [];
  for (const id of GP.POSE_IDS){
    const P = gesturePlan(id);
    for (let t = 0; t < P.total; t += 1/120){
      const p = gesturePose(id, t, { rig: true }), c = p.chain, r = p.rig, hd = GP.add(c.pelvis, qrot(c.trunk, GP.BODY.head));
      const loc = X => qrot(qconj(c.trunk), sub(X, c.pelvis));
      const pts = [...[0, .25, .5, .75, 1].map(u => ['avambraccio', GP.add(c.W, GP.mul(sub(c.E, c.W), u)), .03]), ['gomito', c.E, .035],
        ...r.fingers.map(f => ['dito', f.pts[3], .008]), ['cima', r.phone.tip, .01], ['base', r.phone.base, .01], ['telefono', p.pos, .01]];
      for (const [n, X, rr] of pts){
        const l = loc(X);
        if (n !== 'gomito' && l[1] > -.1 && l[1] < .45 && (l[0]/(.16 + rr))**2 + (l[2]/(.11 + rr))**2 < 1) bad.push(`${id} ${t.toFixed(3)} ${n} nel busto`);
        if (len(sub(X, hd)) < GP.BODY.headR + rr) bad.push(`${id} ${t.toFixed(3)} ${n} nella testa`);
      }
    }
  }
  assert.deepEqual(bad.slice(0, 5), [], `${bad.length} punti dentro il corpo`);
});

// Revisione B13 («colpo, pausa, risalita»): dopo l'impatto la mano e il telefono frenano una volta sola, fino alla fine
// dell'accompagnamento (prima il dritto passava da 4,7 a 0,9 e poi a 2,3 m/s, il telefono da 88 a 240 °/s)
test('una sola frenata dopo l\'impatto in ogni colpo: la mano non riaccelera (≤ 0,3 m/s) e il telefono nemmeno (≤ 40 °/s)', () => {
  const bad = [];
  for (const id of STROKES){
    const P = gesturePlan(id), T = P.T, v = t => len(GP.mul(sub(gesturePose(id, t + .002).chain.W, gesturePose(id, t - .002).chain.W), 1/.004));
    let mn = Infinity, up = 0, wmn = Infinity, wup = 0;
    for (let t = P.contact; t <= T.back; t += 1/240){ const s = v(t); mn = Math.min(mn, s); up = Math.max(up, s - mn); const w = gesturePose(id, t).speed; wmn = Math.min(wmn, w); wup = Math.max(wup, w - wmn); }
    if (up > .3 || wup > 40) bad.push(`${id}: mano +${up.toFixed(2)} m/s, telefono +${wup.toFixed(0)} °/s`);
  }
  assert.deepEqual(bad, []);
});

// Revisione B13 (fedeltà): il piano di una scheda risolveva i tempi alla prima riproduzione (fino a 0,4 s sulla CPU
// rallentata). Ora l'istante nominale tC è scritto nella coreografia: qui lo si ricalcola e lo si confronta, così una
// coreografia cambiata senza aggiornare tC si vede subito (il valore giusto è nel messaggio)
test('tempi risolti: tC scritto in CHOREO uguale a quello ricalcolato (nessuna ricerca alla prima riproduzione)', () => {
  const bad = [];
  for (const id of Object.keys(GP.CHOREO)){
    const c = { ...GP.CHOREO[id] }, stored = c.tC; delete c.tC;
    const tC = GP.motionFrom(id, c).T.nominal;
    if (!(Math.abs(tC - stored) < 2e-5)) bad.push(`${id}: tC ${stored} invece di ${tC.toFixed(6)}`);
  }
  assert.deepEqual(bad, []);
});

test('la mano e il telefono non entrano mai nel busto', () => {
  const bad = [];
  for (const id of GP.POSE_IDS){
    const P = gesturePlan(id);
    for (let t = 0; t < P.total; t += 1/120){
      const p = gesturePose(id, t), c = p.chain;
      for (const [n, X] of [['polso', c.W], ['telefono', p.pos]]){
        const l = qrot(qconj(c.trunk), sub(X, c.pelvis));       // nel riferimento del busto
        if (l[1] > -.1 && l[1] < .45 && (l[0]/.16)**2 + (l[2]/.11)**2 < 1) bad.push(`${id} ${t.toFixed(3)} ${n} ${l.map(v => v.toFixed(2))}`);
      }
    }
  }
  assert.deepEqual(bad.slice(0, 5), [], `${bad.length} dentro il busto`);
});

// Revisione B13 (biomeccanica): il dritto di prima colpiva con la mano davanti alla pancia che andava di lato (77° dalla
// rete), il gomito incollato al fianco, nessuna apertura dietro il corpo, e dopo l'impatto si fermava e poi risaliva. Qui le
// pose che lo fanno leggere come un dritto (soglie fisiche, non i valori ottenuti): spalle girate e mano dietro il piano del
// busto alla fine della carica, impatto davanti e a destra con il gomito staccato dal corpo, mano che va in avanti e in
// alto (al massimo 60° dalla direzione della rete), palmo (schermo) che non resta indietro, una sola frenata fino alla
// fine sopra l'altezza delle spalle davanti alla spalla sinistra.
const vel = (id, t, o = {}) => { const a = gesturePose(id, t - .002, o).chain.W, b = gesturePose(id, t + .002, o).chain.W; return GP.mul(sub(b, a), 1/.004); };
test('il dritto si legge come un dritto: carica con le spalle girate e la mano dietro, impatto davanti a destra con il gomito staccato, mano in avanti e in alto, una sola frenata, fine alta davanti alla spalla sinistra (presa nel palmo, coreografia del B13/B14)', () => {
  const o = { grip: 'palmo' }, P = gesturePlan('forehand', o), T = P.T, W = t => gesturePose('forehand', t, o).chain.W, J = t => gestureJoints('forehand', t, o);
  assert.ok(J(T.inv).tau <= -30, `busto a fine carica ${J(T.inv).tau}°`);
  assert.ok(W(T.inv)[2] >= 0 && W(T.inv)[0] >= .35, `mano a fine carica ${W(T.inv)}: dietro il piano del busto, a destra`);
  const c = gesturePose('forehand', P.contact, o), ch = c.chain;
  assert.ok(ch.W[0] >= .2 && ch.W[2] <= -.25, `impatto ${ch.W}: davanti e a destra`);
  assert.ok(ch.E[0] - ch.S[0] >= .1 && ch.j.b <= 75, `gomito ${ch.E} (spalla ${ch.S}), flesso ${ch.j.b}°`);
  const v = norm(vel('forehand', P.contact, o));
  assert.ok(-v[2] >= .5 && v[1] >= .1, `mano all'impatto ${v}: in avanti (≤ 60° dalla rete) e in alto`);
  assert.ok(dot(qrot(c.q, [0, 0, 1]), v) >= .1, 'all\'impatto non va avanti il dorso della mano');
  let low = Infinity; for (let t = T.hold; t < P.contact; t += .005) low = Math.min(low, W(t)[1]);
  assert.ok(low <= ch.W[1] && W(T.back)[1] - ch.W[1] >= .4, `mano più bassa ${low}, all'impatto ${ch.W[1]}, alla fine ${W(T.back)[1]}`);
  assert.ok(W(T.back)[1] >= 1.4 && W(T.back)[0] <= -.05 && J(T.back).tau >= 20, `fine ${W(T.back)}, busto ${J(T.back).tau}°`);
  // una sola frenata: dopo l'impatto la velocità della mano non risale (prima: 0,9 → 2,3 m/s) e nemmeno quella del telefono
  let mn = Infinity, up = 0, wmn = Infinity, wup = 0;
  for (let t = P.contact; t <= T.back; t += 1/240){ const s = len(vel('forehand', t, o)); mn = Math.min(mn, s); up = Math.max(up, s - mn); const w = gesturePose('forehand', t, o).speed; wmn = Math.min(wmn, w); wup = Math.max(wup, w - wmn); }
  assert.ok(up <= .15, `la mano rallenta e poi riaccelera di ${up.toFixed(2)} m/s dopo l'impatto`);
  assert.ok(wup <= 30, `il telefono rallenta e poi riaccelera di ${wup.toFixed(0)} °/s dopo l'impatto`);
});

// B17.1 passo B2: con la presa a racchetta il dritto è quello del video ottimizzato (CHOREO_VIDEO.forehand): dall'anca destra
// con le spalle girate, la mano sale e va avanti a destra fino all'impatto alto davanti (braccio quasi disteso nel modello del
// gioco: gomito ≤ 50°), una sola frenata, fine davanti al viso con il busto girato (gesti-video.json, dritto 2ª ripetizione)
test('il dritto del video (presa a racchetta): carica all\'anca destra con le spalle girate, impatto alto e davanti a destra, fine davanti al viso, una sola frenata', () => {
  const P = gesturePlan('forehand'), T = P.T, W = t => gesturePose('forehand', t).chain.W, J = t => gestureJoints('forehand', t);
  assert.equal(P.set, 'video');
  assert.ok(J(T.inv).tau <= -30 && W(T.inv)[1] <= 1.0 && W(T.inv)[0] >= .2, `carica ${W(T.inv)}, busto ${J(T.inv).tau}°`);
  const ch = gesturePose('forehand', P.contact).chain;
  assert.ok(ch.W[1] >= 1.35 && ch.W[2] <= -.4 && ch.W[0] >= .25 && ch.j.b <= 50, `impatto ${ch.W}, gomito ${ch.j.b}°`);
  const fin = T.back - (GP.CHOREO_VIDEO.forehand.fin || 0);
  assert.ok(W(fin)[1] >= 1.4 && W(fin)[0] <= .25 && J(fin).tau >= 20, `fine ${W(fin)}, busto ${J(fin).tau}°`);
  let mn = Infinity, up = 0;
  for (let t = P.contact; t <= T.back; t += 1/240){ const s = len(vel('forehand', t)); mn = Math.min(mn, s); up = Math.max(up, s - mn); }
  assert.ok(up <= .3, `la mano rallenta e poi riaccelera di ${up.toFixed(2)} m/s dopo l'impatto`);
});

test('servizio e schiacciata colpiscono sopra la testa; il pallonetto sale davvero; la palla corta scende', () => {
  const W = (id, t) => gesturePose(id, t).chain.W, top = GP.BODY.pelvis[1] + GP.BODY.head[1];
  // (servizio del video, presa a racchetta: battuta con il polso a 1,65 m, nel video 1,70: sopra la spalla di almeno 0,2 m;
  // nel palmo e con la schiacciata sopra la testa di 0,1 m)
  for (const id of ['serve', 'smash']){ const P = gesturePlan(id), min = P.set === 'video' && id === 'serve' ? GP.SHOULDER[1] + .2 : top + .1; assert.ok(W(id, P.contact)[1] > min, `${id}: polso a ${W(id, P.contact)[1]}`); }
  const s = gesturePlan('serve'); assert.ok(W('serve', s.T.hitStart)[1] > GP.SHOULDER[1] + .2 && gesturePose('serve', s.T.hitStart).pos[1] > GP.SHOULDER[1] + .25, 'servizio: braccio in alto');
  const l = gesturePlan('lob'); assert.ok(W('lob', l.T.back)[1] - W('lob', l.T.inv)[1] > .6, 'pallonetto');
  const d = gesturePlan('drop'); assert.ok(W('drop', d.T.inv)[1] - W('drop', d.T.back)[1] > .08, 'palla corta');
});

// Revisione B14 (allenatore): la schiacciata finiva con il braccio teso in avanti all'altezza della spalla (1,40 m), «come
// indicare la rete». Ora l'accompagnamento continua in basso e attraverso il corpo fino alla vita, a sinistra
test('schiacciata: l\'accompagnamento scende attraverso il corpo fino alla vita, a sinistra (non si ferma all\'altezza della spalla)', () => {
  const P = gesturePlan('smash'), W = t => gesturePose('smash', t).chain.W, c = W(P.contact), f = W(P.T.back);
  assert.ok(f[1] <= 1.15 && f[0] <= -.1, `fine della schiacciata ${f}`);
  assert.ok(c[1] - f[1] >= .6, `scende di ${(c[1] - f[1]).toFixed(2)} m dall'impatto alla fine`);
});

// B17.1 passo B3 (richiesta dell'utente del 09/11 notte): «con il dritto la pallina venga colpita con il display in maniera
// frontale, il rovescio invece stesso movimento ma con l'altro lato». Nell'istante del contatto la normale dello SCHERMO
// del telefono guarda la rete (−z del campo, da dove arriva la palla) nei colpi di dritto (dritto, piatto, incrociato,
// lungolinea, tagliato di dritto, volée) e il DORSO nel rovescio e nel tagliato di rovescio, entro 20°; prima del passo B3 il
// dritto aveva lo schermo a 83° (telefono di taglio verso la palla), il piatto e la volée il dorso (159° e 164°), il rovescio
// lo schermo a 103°. Mancino: specchio esatto (stesso angolo, normale specchiata).
// Correzione dalla revisione del 10/11: servizio e schiacciata colpivano con facce diverse dal dritto (schiacciata col DORSO
// a 113° dalla rete, servizio con lo schermo di taglio a 88°): ora tutte le schede e le pose in più hanno una faccia che
// colpisce, schermo anche nel servizio e nella schiacciata, entro 20° (servizio e schiacciata riottimizzati con
// ottimizza.mjs --impact=20). Fanno eccezione, con il loro limite scritto qui, pallonetto e palla corta: colpiscono con il
// DORSO (a 32,4° e 28,9° dalla rete) perché sono colpi dal lato del dritto che aprono la faccia verso l'alto; con «dritto =
// schermo» l'utente può trovarli incoerenti: domanda aperta per l'utente (docs/b17/ottimizzazione.md §9.7)
// incrociato: la mira (letta dalla direzione del piatto rispetto ai dritti) chiede il piatto girato verso il centro; con la
// lettura perfetta (calibrazione con l'animazione, semi 7, 1, 5, 10, mira ≥ 0,5) l'ottimizzatore non scende sotto 21,1°
// (misurato, limite dichiarato in docs/b17/ottimizzazione.md §9); tutte le altre ≤ 20°
const IMPACT_LIM = { cross: 21.5, lob: 33, drop: 30 };
test('faccia all\'impatto: schermo verso la rete nei colpi di dritto, dorso nel rovescio e nel tagliato di rovescio (≤ 20°), mancino specchio', () => {
  // OGNI scheda e ogni posa in più che colpisce una palla ha una faccia che colpisce (non solo quelle già elencate)
  assert.deepEqual(Object.keys(GP.IMPACT_FACE).sort(), GP.POSE_IDS.filter(id => !GESTURES[id].still).sort());
  assert.equal(GP.IMPACT_MAX, 20);
  for (const [id, face] of Object.entries(GP.IMPACT_FACE)){
    const o = { grip: 'racchetta' }, P = gesturePlan(id, o);
    assert.equal(P.set, 'video', id);
    const r = gesturePose(id, P.contact, o), l = gesturePose(id, P.contact, { ...o, hand: 'left' });
    const n = qrot(r.q, [0, 0, 1]), nl = qrot(l.q, [0, 0, 1]), a = GP.impactFaceAngle(id, o), lim = IMPACT_LIM[id] ?? GP.IMPACT_MAX;
    assert.ok(a <= lim, `${id}: ${face > 0 ? 'schermo' : 'dorso'} a ${a.toFixed(1)}° dalla rete (≤ ${lim})`);
    // la faccia che colpisce guarda la rete (−z), l'altra chi gioca (+z)
    assert.ok(-face*n[2] >= Math.cos(lim*Math.PI/180) - 1e-9, `${id}: normale dello schermo ${n.map(v => v.toFixed(2))}`);
    assert.ok(Math.abs(GP.impactFaceAngle(id, { ...o, hand: 'left' }) - a) < 1e-9, `${id}: mancino`);
    [-n[0], n[1], n[2]].forEach((v, i) => assert.ok(Math.abs(v - nl[i]) < 1e-9, `${id}: normale del mancino non specchiata`));
  }
});
