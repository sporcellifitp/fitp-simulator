// Pallonetto e palla corta con il telefono (segnalazione del 23/10, sera: «quasi tutte le volte il colpo non riesce,
// non rileva quando sollevo il telefono o faccio un movimento dall'alto verso il basso»). Telefono simulato completo
// (phone-sim.mjs: rilevatore, filtro d'orientamento e forma del colpo della pagina del telefono, mappatura del gioco)
// mosso da un braccio vero (arm-sim.mjs: il telefono gira con il braccio attorno alla spalla o al gomito, la mano ha
// l'accelerazione di quel moto). Cause trovate e corrette:
//   • il telefono scartava i gesti verticali senza verso di dritto o rovescio («verso»): la palla corta dall'alto verso il
//     basso a ogni velocità, il pallonetto sotto il 40% del proprio colpo; e i gesti lenti sotto il 28% («debole»);
//   • con il telefono dritto nel pugno e il gesto di polso la salita della testa virtuale non distingue pallonetto, palla
//     corta e dritto; gli esercizi del riscaldamento dicevano «Ho imparato il tuo gesto» ma con questi telefoni non
//     imparavano niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneWith, armSwing, returnTo, STROKES } from './arm-sim.mjs';
import { simPhone } from './phone-sim.mjs';
import { personalSpecial, shapeDistinct, PERSONAL, strokeIntent, strokePower } from '../src/natpf/natpf_stroke_intent.js';
import { learnShapeSpecials, ownShapes, createShapeModel, NORMAL_SHOTS, NORMAL_SHAPE, teachesNormal, profileShapePower } from '../src/natpf/natpf_phone_racket.js';
import { specialHint } from '../src/natpf/natpf_training.js';

// gesti di prova, uno alla volta, con quello che manda il telefono, quello che scarta (con il motivo) e come lo legge il gioco
function gestures(p, g, n, { own = null, expect = null } = {}){
  const disc = [], off = p.det.on('discard', d => disc.push(d.why)), out = [];
  for (let i = 0; i < n; i++){ const b = p.msgs.length; armSwing(p, g); p.rest(900, 6); for (const d of p.msgs.slice(b)) out.push(p.game(d, { own, expect })); }
  void off;
  return { shots: out.map(r => r.ev.natpf.shot), intents: out.map(r => r.ev.natpf.intent), evs: out.map(r => r.ev), disc };
}
const LOB = (peak, rc = [.3, -.55, -.3]) => ({ axis: [1, 0, 0], peak, ms: Math.round(Math.max(220, Math.min(380, 140000/peak))), rc });
const DROP = (peak, rc = [.3, -.35, -.45]) => ({ axis: [-1, 0, 0], peak, ms: Math.round(Math.max(220, Math.min(380, 140000/peak))), rc });

test('gesti verticali dal braccio (dal basso verso l’alto, dall’alto verso il basso): il telefono li manda e il gioco li legge, anche lenti', () => {
  // prima: la palla corta verticale sempre scartata («verso»), il pallonetto sotto 260 °/s anche, e sotto 180 °/s tutto
  for (const tilt of [0, 30, 60]) for (const peak of [180, 260, 420]){
    const tag = `inclinazione ${tilt}°, ${peak} °/s`;
    const lob = gestures(phoneWith({ tilt }), LOB(peak), 2), drop = gestures(phoneWith({ tilt }), DROP(peak), 2);
    assert.deepEqual(lob.shots, ['lob', 'lob'], `${tag} pallonetto: ${lob.shots} · scartati ${lob.disc}`);
    assert.deepEqual(drop.shots, ['drop', 'drop'], `${tag} palla corta: ${drop.shots} · scartati ${drop.disc}`);
  }
});

test('niente colpi in più: il rientro della mano dopo un tagliato o un dritto non diventa un pallonetto; i micro-movimenti verticali restano sotto', () => {
  for (const tilt of [0, 30]){
    const p = phoneWith({ tilt });
    for (const g of [STROKES.tagliato, STROKES.dritto, STROKES.rovescio]){
      const b = p.msgs.length, start = p.q.slice();
      armSwing(p, { ...g, back: false });
      // la mano torna subito alla posizione di partenza, svelta (220 °/s): dopo il tagliato anche verso l'alto. Non è un colpo
      p.rest(100, 6); returnTo(p, start, 220);
      p.rest(900, 6);
      assert.equal(p.msgs.length - b, 1, `inclinazione ${tilt}°, ${JSON.stringify(g.axis)}: ${p.msgs.length - b} colpi`);
      // poi un pallonetto lento ma ampio è un colpo
      armSwing(p, { axis: [1, 0, 0], peak: 220, ms: 340, rc: [.3, -.45, -.35] }); p.rest(900, 6);
      assert.equal(p.msgs.length - b, 2, `inclinazione ${tilt}°, ${JSON.stringify(g.axis)}: il pallonetto dopo il rientro`);
    }
    // piccoli gesti verticali lenti (sotto i 15° al picco): nessun colpo
    const b = p.msgs.length;
    for (const peak of [90, 140]) for (const ax of [[1, 0, 0], [-1, 0, 0]]){ armSwing(p, { axis: ax, peak, ms: 160, rc: [.3, -.4, -.35] }); p.rest(1000, 6); }
    assert.equal(p.msgs.length - b, 0, `inclinazione ${tilt}°: ${p.msgs.length - b} colpi da micro-movimenti`);
  }
});

test('telefono capovolto nel pugno (la cima in basso): il pallonetto resta un pallonetto, come con il telefono dritto', () => {
  // prima la testa della racchetta virtuale era sempre la cima del telefono: con la cima in basso puntava in basso e il
  // pallonetto si leggeva come un colpo normale (salita 0,2–0,4)
  const LOBG = { axis: [1, .25, 0], peak: 420, ms: 320, rc: [.3, -.55, -.3] }, DROPG = { axis: [-1, .35, 0], peak: 260, ms: 300, rc: [.3, -.35, -.45] };
  for (const flip of [false, true]) for (const tilt of [0, 30]){
    const p = simPhone({ seed: 7, shape: true });
    if (flip) p.pose([0, 0, 1], 180);
    p.pose([0, 1, 0], 90); p.pose([1, 0, 0], -tilt); p.rest(500, 4);
    p.calibrate({ armGesture: w => armSwing(p, w === 'L' ? STROKES.dritto : STROKES.rovescio) });
    const tag = `${flip ? 'capovolto' : 'dritto'}, inclinazione ${tilt}°`;
    assert.deepEqual(gestures(p, LOBG, 2).shots, ['lob', 'lob'], tag);
    assert.deepEqual(gestures(p, DROPG, 2).shots, ['drop', 'drop'], tag);
    assert.ok(gestures(p, STROKES.dritto, 2).shots.every(s => s === 'topspin' || s === 'flat'), tag);
  }
});

test('presa sistemata con calma mentre il telefono misura il «fermo»: il rumore della mano resta piccolo e le soglie non salgono', () => {
  // prima il 90° percentile della finestra prendeva la coda del movimento per tremolio: 60 °/s → soglie del colpo a
  // 300 °/s e dell'inizio del gesto a 240 per tutta la partita, e le palle corte (sotto i 300 °/s) non partivano mai
  for (const rate of [40, 60, 85]){
    const p = simPhone({ seed: 3, shape: true });
    p.cal.start({ quick: true }); p.rest(300, 4);
    p.pose([0, 1, 0], rate*.2, rate); p.rest(900, 4);         // 0,2 s di presa sistemata, poi fermo
    assert.notEqual(p.cal.state.step, 'still', `${rate} °/s: il passo «fermo» non è finito`);
    assert.ok(p.det.profile.noise <= 30, `${rate} °/s: rumore ${p.det.profile.noise}`);
  }
});

// esercizi del riscaldamento: 3 pallonetti e 3 palle corte nel proprio stile (prototipi), poi colpi normali (forma
// abituale) e in gioco pallonetti, palle corte e dritti. Come nel gioco (NatpfPhoneRacket._onSwing, learnSpecial): forma
// del colpo normale dai colpi che la insegnano (teachesNormal: non i gesti chiesti dagli esercizi), prototipi e colpo
// normale con la forza assoluta del gesto (shapePower), colpo normale che parte da quello della calibrazione
function drillWorld(tilt){
  const p = phoneWith({ tilt }), shape = createShapeModel(), samples = { lob: [], drop: [] };
  shape.seed(profileShapePower(p.det.profile));
  const own = () => ownShapes(learnShapeSpecials(samples), { forehandRise: p.det.profile.rises?.[1] ?? null, normal: shape.value });
  const play = (g, n, expect = null) => {
    const r = gestures(p, g, n, { expect, own: (s, rr) => { const o = own(); return o && { ...o, normal: { ...o.normal, rise: Number.isFinite(rr) ? rr : o.normal.rise } }; } });
    r.evs.forEach(ev => { const I = ev.natpf.intent; if (I && teachesNormal(ev, { expect })) shape.add(I.plane, I.shapePower); if (I && expect) samples[expect].push({ rise: I.rise, plane: Math.abs(I.plane), power: I.shapePower }); });
    return r;
  };
  const drills = style => { for (const k of ['lob', 'drop']) play(style[k], 3, k); };
  return { p, shape, own, play, drills };
}
function withDrills(tilt, style){
  const W = drillWorld(tilt), { play } = W;
  W.drills(style);
  play(STROKES.dritto, 3); play(STROKES.rovescio, 3);
  return { lob: play(style.lob, 3).shots, drop: play(style.drop, 3).shots, normal: [...play(STROKES.dritto, 3).shots, ...play(STROKES.rovescio, 3).shots], own: W.own() };
}
const WRIST = { lob: { axis: [1, .25, 0], peak: 480, ms: 260, rc: [.04, -.06, -.04] }, drop: { axis: [-1, .35, 0], peak: 300, ms: 240, rc: [.04, -.04, -.06] } };

test('telefono dritto nel pugno, gesto di polso: senza esercizi pallonetto e palla corta sembrano dritti; dopo gli esercizi del riscaldamento sono riconosciuti', () => {
  const p = phoneWith({ tilt: 0 });
  const before = { lob: gestures(p, WRIST.lob, 3).shots, drop: gestures(p, WRIST.drop, 3).shots };
  assert.ok(before.lob.every(s => s === 'topspin') && before.drop.every(s => s === 'topspin'), `senza esercizi: ${JSON.stringify(before)}`);
  for (const tilt of [0, 30]){
    const r = withDrills(tilt, WRIST);
    assert.deepEqual(r.lob, ['lob', 'lob', 'lob'], `inclinazione ${tilt}°: ${r.lob} · ${JSON.stringify(r.own)}`);
    assert.deepEqual(r.drop, ['drop', 'drop', 'drop'], `inclinazione ${tilt}°: ${r.drop}`);
    assert.ok(r.normal.every(s => s === 'topspin' || s === 'flat'), `inclinazione ${tilt}°: dritti e rovesci ${r.normal}`);
  }
});

// prova nel browser della sera del 23/10 (natpf-gesti-speciali.mjs, parte C): dopo gli esercizi, in partita pallonetto,
// palla corta e dritto alternati. Prima, deterministico: la seconda e la terza palla corta erano «colpo normale». I primi
// gesti degli esercizi, letti normali prima che il gioco li avesse imparati, finivano nel colpo normale (che in partita
// diventava la propria palla corta: piano 0,33), e la forza del confronto seguiva il colpo tipico, che si sposta con i
// colpi della partita (stesso pallonetto: 0,31 negli esercizi, poi 0,39–0,58)
test('in partita dopo gli esercizi: pallonetto, palla corta e dritto alternati restano riconosciuti (prima la palla corta diventava un dritto)', () => {
  for (const tilt of [0, 30]){
    const W = drillWorld(tilt);
    W.drills(WRIST);
    const plan = ['lob', 'drop', 'dritto', 'lob', 'drop', 'dritto', 'lob', 'drop', 'dritto', 'drop', 'drop', 'lob'];
    const got = plan.map(k => W.play(k === 'dritto' ? STROKES.dritto : WRIST[k], 1).shots[0]);
    const want = plan.map(k => (k === 'dritto' ? 'dritto' : k)), ok = got.map((s, i) => (want[i] === 'dritto' ? s === 'topspin' || s === 'flat' : s === want[i]));
    assert.ok(ok.every(Boolean), `inclinazione ${tilt}°: ${plan.map((k, i) => `${k}→${got[i]}`).join(' · ')} · colpo normale ${JSON.stringify(W.shape.value)} · ${JSON.stringify(W.own())}`);
    // il colpo normale resta il proprio dritto, non la propria palla corta
    assert.ok(W.shape.value.plane > .6, `colpo normale ${JSON.stringify(W.shape.value)}`);
  }
});

test('i gesti chiesti dagli esercizi speciali non insegnano il colpo normale; la forza del confronto non dipende dal colpo tipico', () => {
  const normal = { natpf: { shot: 'topspin', intent: { plane: .9, power: .6, shapePower: .4 } } };
  assert.equal(teachesNormal(normal), true);
  assert.equal(teachesNormal(normal, { expect: 'drop' }), false, 'esercizio della palla corta: è un esempio della palla corta');
  assert.equal(teachesNormal(normal, { rally: false }), false);
  assert.equal(teachesNormal({ natpf: { shot: 'lob', intent: {} } }), false);
  // stesso gesto con colpi tipici diversi: la forza dell'intenzione cambia, quella del confronto no
  const s = { peak: 300, rawPeak: 320, angle: 40, dir: 1, shape: { rise: -.1, plane: .3, tilt: 0, roll: 0 } };
  const a = strokeIntent(s, { ref: 455 }), b = strokeIntent(s, { ref: 281 });
  assert.notEqual(a.power, b.power); assert.equal(a.shapePower, b.shapePower);
  assert.equal(a.shapePower, +strokePower(320).toFixed(3));
  // colpo normale prima dei colpi della partita: la forza del colpo della calibrazione
  assert.equal(profileShapePower({ rawRef: 714 }), +strokePower(714).toFixed(3));
  assert.equal(profileShapePower({ simple: true, ref: 700 }), null);
  const m = createShapeModel(); m.seed(.42); assert.deepEqual(m.value, { plane: NORMAL_SHAPE.plane, power: .42 });
});

test('prototipi personali: il gesto è il colpo speciale solo se è più vicino al proprio pallonetto o alla propria palla corta che al proprio colpo normale', () => {
  const normal = { rise: -.09, plane: .92, power: .5 }, lob = { rise: .21, plane: .29, power: .34 }, drop = { rise: -.07, plane: .37, power: .29 };
  assert.equal(personalSpecial({ rise: .2, plane: .3, power: .3 }, { normal, lob, drop })?.shot, 'lob');
  assert.equal(personalSpecial({ rise: -.05, plane: .4, power: .3 }, { normal, lob, drop })?.shot, 'drop');
  assert.equal(personalSpecial({ rise: -.1, plane: .9, power: .55 }, { normal, lob, drop }), null);          // il proprio dritto
  assert.equal(personalSpecial({ rise: .45, plane: .6, power: .75 }, { normal, lob, drop }), null);         // top spin deciso
  assert.equal(personalSpecial({ rise: 2, plane: 0, power: 0 }, { normal, lob }), null);                   // troppo lontano da tutto
  // solo il pallonetto imparato: una palla corta (verticale e morbida, ma non sale) non è un pallonetto
  assert.equal(personalSpecial({ rise: -.07, plane: .37, power: .29 }, { normal, lob }), null);
  assert.equal(personalSpecial({ rise: .2, plane: .3, power: .3 }, { normal, lob })?.shot, 'lob');
  // un «pallonetto» che somiglia al proprio dritto non si usa (non si potrebbe distinguere): resta il riconoscimento fisso
  const same = { rise: -.02, plane: .85, power: .48 };
  assert.equal(shapeDistinct(same, normal), false);
  assert.equal(personalSpecial({ rise: -.02, plane: .85, power: .48 }, { normal, lob: same }), null);
  assert.ok(PERSONAL.minSep > PERSONAL.margin);
  // prototipi: mediane degli ultimi esempi; la forma normale parte da un dritto tipico e poi è quella dei propri colpi
  const L = learnShapeSpecials({ lob: [{ rise: .3, plane: .2, power: .4 }, { rise: .1, plane: .4, power: .2 }, { rise: .2, plane: -.3, power: .3 }] });
  assert.deepEqual(L.lob, { rise: .2, plane: .3, power: .3, n: 3 });
  const m = createShapeModel();
  assert.deepEqual(m.value, { plane: NORMAL_SHAPE.plane, power: NORMAL_SHAPE.power });
  for (const [pl, pw] of [[-.9, .6], [.7, .5], [.95, .55]]) m.add(pl, pw);
  assert.deepEqual(m.value, { plane: .9, power: .55 });
  assert.equal(ownShapes({}, {}), null);
  assert.equal(ownShapes({ lob: L.lob }, { forehandRise: -.2 }).normal.rise, -.2);
});

test('esercizio del pallonetto e della palla corta: il messaggio dice il vero', () => {
  assert.equal(specialHint('lob', { kind: 'lob', learned: true, distinct: true }), 'Ho imparato il tuo gesto: rifallo uguale');
  assert.match(specialHint('lob', { kind: 'lob', learned: true, distinct: false }), /Sembra il tuo colpo normale/);
  assert.match(specialHint('drop', { kind: 'drop', learned: true, distinct: false }), /più lento/);
  // niente imparato (telefono senza forma e senza segnale verticale): solo il consiglio, nessun «ho imparato»
  assert.doesNotMatch(specialHint('lob', { kind: 'lob', learned: false }), /imparato/);
  assert.doesNotMatch(specialHint('drop', null), /imparato/);
});
