// B36.1 «La cima comanda (interna)» (docs/b73/direzione-b36-1.md): proprietà della regola nuova della direzione («Nuova»,
// solo telefoni con la forma del colpo). Peso del tempo 0,3, niente spinta naturale, punto neutro al centro, ritmo fuori
// dalla direzione (resta il ritardo abituale), scarto della cima nullo → piatto 0; curva della cima, bordi, aria e
// profondità come oggi.
//   - monotonia: più si gira la cima, più la palla va da quella parte, fino alla mira piena dello staff (17/20/23°), a ogni
//     tempo dentro la finestra, da ogni posizione, a ogni livello, sul bersaglio del motore e sul rimbalzo vero;
//   - specchio: dritto e rovescio, destro e mancino, P1 e P2 danno la stessa palla allo specchio;
//   - determinismo: stessi ingressi, stesso esito;
//   - il tempo da solo sposta la palla al più di circa un metro (criterio della B36.1 nel piano, §8);
//   - i banchi dei giocatori simulati con «Nuova» giocano davvero la regola nuova (colpi nuovi > 0: B36.0 lo chiedeva).
import test from 'node:test';
import assert from 'node:assert/strict';
import { strokeOutcome, OUTCOME, assistOf, RHYTHM } from '../src/natpf/natpf_stroke_outcome.js';
import { faceAimFromDev, AIM_FULL } from '../src/natpf/natpf_stroke_intent.js';
import { skillLevel } from '../src/natpf/natpf_skill.js';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { DIRECTION, zoneOf, devOfFace } from '../src/natpf/natpf_direction.js';

const LIVELLI = ['casual', 'pro', 'leggenda', '1v1'];
// esito della regola nuova per un colpo del telefono con lo scarto della cima dev (gradi), mira piena full, tempo timing (s)
const esito = ({ dev = 0, full = 17, timing = 0, contact = 1, hitX = .6, level = 'pro', dir = 'nuova', face = faceAimFromDev(dev, full), ...o } = {}) =>
  strokeOutcome({ intent: { shot: 'topspin', power: .5, depth: .5, rise: .3, face, conf: 1 }, timing, lateSpan: .08, ballVz: 18, contact, hitX, hitZ: 11, quality: .92, level: skillLevel(level), dir, ...o });

test('B36.1: monotonia — girando di più la cima la palla va di più da quella parte, fino alla mira piena (17°, 20°, 23°)', () => {
  for (const full of [AIM_FULL.alta, AIM_FULL.media, AIM_FULL.bassa]) for (const level of LIVELLI) for (const contact of [1, -1]) for (const hitX of [-2.4, 0, .6, 2.4]) for (const timing of [-.06, -.03, 0, .04, .08]){
    let prev = null;
    for (let dev = 0; dev <= full + 1e-9; dev += .5){
      const o = esito({ dev, full, timing, contact, hitX, level }), tag = `mira ${full}° ${level} c ${contact} palla ${hitX} tempo ${timing}: ${dev}°`;
      assert.equal(o.rule, 'nuova', tag);
      if (prev){
        assert.ok(o.x >= prev.x - 1e-9, `${tag}: ${o.x} dopo ${prev.x}`);
        // oltre la zona morta (3°) la palla si sposta davvero, finché non è tenuta sul bordo (assistenza vicino alla riga)
        if (dev > 3.5 && Math.abs(prev.x) < OUTCOME.sideKnee - .05) assert.ok(o.x > prev.x, `${tag}: deve spostarsi (${prev.x} → ${o.x})`);
      }
      prev = o;
    }
    // allo specchio, girando dall'altra parte, la palla va dall'altra parte
    const a = esito({ dev: full, full, timing, contact, hitX, level }), b = esito({ dev: -full, full, timing, contact, hitX, level });
    assert.ok(a.x > b.x, `mira ${full}° ${level}: ${b.x} < ${a.x}`);
  }
  // la curva della cima è quella di oggi: piena dalla mira piena a 45°, poi in calo fino a 60° (niente gradini nuovi)
  const at = dev => esito({ dev }).x;
  assert.equal(at(17), at(30)); assert.equal(at(17), at(45)); assert.ok(at(52) < at(45) && at(60) === at(0));
});

test('B36.1: la cima comanda — tempo che pesa 0,3, niente spinta naturale, punto neutro al centro, ritmo fuori dalla direzione', () => {
  const xMax = assistOf(skillLevel('pro')).xMax;
  // cima dritta e colpo a tempo: la palla al centro, da qualunque posizione (oggi: un poco incrociata e verso la palla)
  for (const hitX of [-3, 0, .6, 3]) for (const contact of [1, -1]){
    const o = esito({ hitX, contact });
    assert.equal(o.x, 0, `palla a ${hitX}`); assert.equal(o.x0, 0); assert.equal(o.aim, 0);
  }
  assert.ok(Math.abs(esito({ dir: null }).x) > .1, 'con la regola di oggi la spinta naturale c’è');
  // il tempo dentro la finestra: mira = −c · 0,3 · tempo
  for (const timing of [-.08, -.04, .04, .08]) for (const contact of [1, -1]){
    const o = esito({ timing, contact }), t = Math.max(-1, Math.min(1, o.t));
    assert.ok(Math.abs(o.aim - (-contact*DIRECTION.timeWeight*t)) < 2e-3, `tempo ${timing}: mira ${o.aim}`);
    assert.ok(Math.abs(o.x) <= DIRECTION.timeWeight*xMax + 1e-3, `tempo ${timing}: x ${o.x}`);
  }
  // cima girata e tempo contro: la palla resta dal lato della cima (oggi passava dall'altra parte)
  for (const contact of [1, -1]){
    const cross = -contact, early = .08, late = -.08;   // incrociato: per il dritto del destro a sinistra (−)
    const oCross = esito({ dev: cross*17, contact, timing: late }), oLine = esito({ dev: -cross*17, contact, timing: early });
    assert.ok(cross*oCross.x > 2, `cima incrociata piena e ritardo pieno: ${oCross.x}`);
    assert.ok(-cross*oLine.x > 2, `cima lungolinea piena e anticipo pieno: ${oLine.x}`);
    assert.ok(cross*esito({ dev: cross*17, contact, timing: late, dir: null }).x < 1, 'oggi il tempo la portava dall’altra parte');
  }
  // il ritmo (tempo abituale) esce dalla direzione: stesso colpo con ritmi diversi, stessa palla (oggi cambiava)
  const r0 = esito({ dev: 8, timing: .03 }), r1 = esito({ dev: 8, timing: .03, rhythm: .5 }), r2 = esito({ dev: 8, timing: .03, rhythm: -.5 });
  assert.equal(r1.x, r0.x); assert.equal(r2.x, r0.x);
  assert.notEqual(esito({ dev: 8, timing: .03, rhythm: .5, dir: null }).x, esito({ dev: 8, timing: .03, dir: null }).x);
  // … il ritardo abituale (B35a, lag) invece resta: sposta il tempo come oggi
  const lagged = esito({ dev: 8, timing: -.06, rhythmLag: RHYTHM.lagMax });
  assert.ok(lagged.lag > 0 && lagged.x !== esito({ dev: 8, timing: -.06 }).x, 'il ritardo abituale conta ancora');
  // scarto della cima nullo (centro non imparato, gesto verticale, telefono senza direzione): piatto 0 con la regola nuova
  assert.equal(faceAimFromDev(null), 0); assert.equal(faceAimFromDev(undefined), 0);
  const nul = esito({ face: faceAimFromDev(null), timing: .05 });
  assert.equal(nul.rule, 'nuova'); assert.ok(Math.abs(nul.x) <= DIRECTION.timeWeight*xMax + 1e-3, `aimDev nullo: ${nul.x}`);
  // la cima piena dà la mira piena, senza spinta naturale (bordi, profondità e spinta oltre la finestra «come oggi»: prova a
  // parte, qui sotto, a parità di mira e di punto neutro)
  assert.equal(esito({ dev: 17 }).aim, 1);
  // zone (banchi e prove): lungolinea dalla parte del colpo, incrociato dall'altra, centro entro 1,25 m
  assert.equal(zoneOf(2, 1), 'lungolinea'); assert.equal(zoneOf(-2, 1), 'incrociato'); assert.equal(zoneOf(2, -1), 'incrociato'); assert.equal(zoneOf(.5, 1), 'centro'); assert.equal(zoneOf(NaN), 'centro');
});

// Revisione del B73 (docs/b73/unione.md, «Revisione e sistemazione», rilievo «test-bordi-vuoto»): prima qui si confrontavano
// solo effetto e altezza sulla rete (topspin, clear), che non dipendono dalla mira né dal punto neutro, con mire diverse
// (1 contro 0,9) e palle in posti diversi (hitX 0,6 contro 0): la prova passava con qualunque regola della direzione. Ora
// la regola nuova e quella di oggi si confrontano con la stessa mira ESATTA, lo stesso punto neutro (palla al centro: 0 per
// tutte e due) e la stessa posizione: la palla deve essere la stessa, bordo morbido (sideKnee), oltre la riga (sideLine) e
// spinta oltre la finestra (pushOut) compresi. La mira esatta della regola di oggi si ricava dal tempo solo dove è certo:
// tempo 0 (aimT 0) e oltre la finestra (aimT ±1); dentro la finestra il tempo dell'esito è arrotondato. Tolleranza: un
// arrotondamento dell'uscita (toFixed(3): 4 casi su 1782 cambiano di 1 mm)
test('B36.1: bordi, profondità e spinta oltre la finestra come oggi — stessa mira esatta e stesso punto neutro, stessa palla', () => {
  const it = F => ({ shot: 'topspin', power: .5, depth: .5, rise: .3, face: Math.sign(F), faceWeight: Math.abs(F), conf: 1 });
  const UN_MM = 1e-3 + 1e-9;
  let n = 0, ginocchio = 0, fuori = 0, oltre = 0;
  for (const level of LIVELLI) for (const contact of [1, -1]) for (const hitZ of [11, 4]) for (const timing of [-.45, -.3, -.2, 0, .2, .3, .45]) for (let k = -16; k <= 16; k++){
    const F = k/10, base = { lateSpan: .08, ballVz: 18, hitX: 0, hitZ, quality: .92, level: skillLevel(level), timing, contact };
    const N = strokeOutcome({ ...base, intent: it(F), dir: 'nuova' });
    if (timing !== 0 && !(N.excess > 0)) continue;
    const aimT = timing === 0 ? 0 : Math.sign(timing);
    // piatto della regola di oggi con la stessa mira: compensa la spinta naturale e il peso del tempo (1 contro 0,3)
    const Fc = F + contact*aimT*(OUTCOME.timingAim - DIRECTION.timeWeight) + contact*OUTCOME.natural*(1 - Math.abs(aimT));
    const C = strokeOutcome({ ...base, intent: it(Fc) }), tag = `${level} c ${contact} z ${hitZ} tempo ${timing} piatto ${F}`;
    assert.equal(N.rule, 'nuova', tag); assert.equal(C.rule, undefined, tag);
    assert.equal(N.x0, 0, tag); assert.equal(C.x0, 0, tag);
    assert.ok(Math.abs(N.aim - C.aim) <= UN_MM, `${tag}: mira ${N.aim} contro ${C.aim}`);
    assert.ok(Math.abs(N.x - C.x) <= UN_MM, `${tag}: x ${N.x} contro ${C.x}`);
    assert.ok(Math.abs(N.depth - C.depth) <= UN_MM, `${tag}: profondità ${N.depth} contro ${C.depth}`);
    for (const key of ['clear', 'topspin', 'assist', 'failed', 'excess', 'q', 'grade']) assert.deepEqual(N[key], C[key], `${tag}: ${key}`);
    n++; if (Math.abs(N.x) > OUTCOME.sideKnee) ginocchio++; if (Math.abs(N.x) > OUTCOME.sideLine) fuori++; if (N.excess > 0) oltre++;
  }
  // la griglia passa davvero per le zone che contano: bordo morbido, oltre la riga laterale, oltre la finestra
  assert.ok(n > 1000 && ginocchio > 300 && fuori > 200 && oltre > 1000, `casi ${n}, oltre sideKnee ${ginocchio}, oltre sideLine ${fuori}, oltre la finestra ${oltre}`);
});

test('B36.1: specchio — dritto e rovescio, destro e mancino danno la stessa palla allo specchio', () => {
  for (const level of LIVELLI) for (const dev of [-30, -17, -9, 0, 6, 14, 25]) for (const timing of [-.12, -.05, 0, .05, .12]) for (const hitX of [-2, 0, 1.3]){
    const a = esito({ dev, timing, contact: 1, hitX, level }), b = esito({ dev: -dev, timing, contact: -1, hitX: -hitX, level });
    assert.equal(b.x, -a.x === 0 ? 0 : -a.x, `${level} ${dev}° ${timing} ${hitX}`);
    for (const k of ['depth', 'clear', 'topspin', 'grade', 't', 'excess', 'q', 'failed', 'netFault', 'assist']) assert.deepEqual(b[k], a[k], `${level} ${dev}° ${timing}: ${k}`);
  }
});

// colpo del telefono con la forma (natpf.intent come lo manda natpf_phone_racket.natpfSwingToEngine)
const colpoTel = (dev, { hand = 'right', side = 'forehand', full = 17 } = {}) => ({ source: 'natpf-phone', side, shotType: 'topspin', speed: 1.2, dirX: 0, timing: null,
  natpf: { aim: 'swing', shot: 'topspin', power: .5, latency: 0, hand, aimDev: dev, peak: 800, typical: 780, aimFull: full,
    intent: { shot: 'topspin', power: .5, typePower: .5, depth: .5, rise: .3, face: faceAimFromDev(dev, full), conf: 1 } } });
// il colpo nel motore: chi colpisce è il P1 (verso −z) o il P2 (verso +z, specchiato); palla a `lat` m dal lato del colpo
function nelMotore(ev, { who = 'p1', tau = 0, lat = .6, x = 0, dir = 'nuova' } = {}){
  const real = Math.random; Math.random = () => .5;
  try {
    const e = createHeadlessEngine({ difficulty: 'pro' }); e.natpfDirRule = dir; e.startNewMatch({ showStartBanner: false });
    const s = who === 'p1' ? 1 : -1, p = who === 'p1' ? e.player : e.opponent;
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = who === 'p1' ? 'opponent' : 'player'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 3;
    p.pos.set(s*x, 0, s*11.4); p.vel.set(0, 0, 0); p.targetPos.copy(p.pos);
    e.ball.pos.set(s*(x + lat), 1, s*10.9); e.ball.vel.set(0, 0, s*18);
    const r = e._natpfRacketShot({ ...ev, natpfTau: tau, natpfLateSpan: .075 }, p, { lateral: Math.abs(lat) });
    return { E: r.E, N: r.N, out: r.out };
  } finally { Math.random = real; }
}

test('B36.1: specchio nel motore — P1 e P2, destro e mancino; determinismo', () => {
  for (const dev of [-15, 0, 9, 17]) for (const tau of [-.05, 0, .06]){
    const p1 = nelMotore(colpoTel(dev), { tau }), p2 = nelMotore(colpoTel(dev), { who: 'p2', tau });
    assert.equal(p1.out.rule, 'nuova'); assert.equal(p2.out.rule, 'nuova');
    assert.equal(p2.E, -p1.E, `P1/P2 ${dev}° ${tau}`); assert.equal(p2.N, -p1.N);
    // mancino: il suo dritto (palla alla sua sinistra) con la cima girata allo specchio
    const sx = nelMotore(colpoTel(-dev, { hand: 'left' }), { tau, lat: -.6 });
    assert.equal(sx.out.rule, 'nuova'); assert.equal(sx.E, -p1.E === 0 ? 0 : -p1.E, `mancino ${dev}° ${tau}`); assert.equal(sx.N, p1.N);
    // rovescio del destro (palla alla sua sinistra) = dritto del mancino
    const rv = nelMotore(colpoTel(-dev, { side: 'backhand' }), { tau, lat: -.6 });
    assert.equal(rv.E, sx.E, `rovescio ${dev}° ${tau}`);
    // determinismo: lo stesso colpo in un'altra partita, lo stesso esito
    assert.deepEqual(nelMotore(colpoTel(dev), { tau }), p1);
  }
});

test('B36.1: il tempo da solo sposta la palla al più di circa un metro (rimbalzo vero, tre posizioni)', async () => {
  const D = await import('../scripts/audit/direzione-telefono.mjs');
  for (const posizione of [0, 2.4, -2.4]){
    const e = createHeadlessEngine({ difficulty: 'pro' }); e.natpfDirRule = 'nuova'; e.startNewMatch({ showStartBanner: false });
    const bx = u => D.strike(colpoTel(0), { e, u, posizione, giudice: 'rimbalzo' });
    const c = bx(0), lo = bx(-1), hi = bx(1);
    for (const r of [c, lo, hi]){ assert.equal(r.fuori, false); assert.equal(r.failed, false); }
    assert.ok(Math.abs(lo.bx - c.bx) <= 1 && Math.abs(hi.bx - c.bx) <= 1, `posizione ${posizione}: ${lo.bx} / ${c.bx} / ${hi.bx}`);
    assert.ok(Math.abs(lo.xBersaglio) <= DIRECTION.timeWeight*OUTCOME.xMax + 1e-3 && Math.abs(hi.xBersaglio) <= DIRECTION.timeWeight*OUTCOME.xMax + 1e-3);
    // monotonia anche sul rimbalzo vero: la cima girata fino alla mira piena sposta la palla, a tempo
    let prev = -Infinity;
    for (const dev of [0, 4, 8, 12, 17]){ const r = D.strike(colpoTel(dev), { e, u: 0, posizione, giudice: 'rimbalzo' }); assert.ok(r.bx > prev, `posizione ${posizione}, ${dev}°: ${r.bx} dopo ${prev}`); prev = r.bx; }
  }
});

test('B36.1: i banchi dei giocatori simulati con «Nuova» giocano la regola nuova (e con «Classica» mai)', async () => {
  const { simulate } = await import('../scripts/audit/rally-balance.mjs');
  // (il profilo «umano» del banco, quando la palla non ha ancora rimbalzato, manda anche colpi come il mouse: intenzione
  // ricostruita, regola di oggi. Si contano a parte: tutti i colpi del telefono con la forma, schiacciata esclusa, sono nuovi)
  for (const profile of ['tennista', 'amatore', 'bambino', 'umano', 'medioTel', 'giraTanto']){
    const tel = { tutti: 0, nuovi: 0, ricostruitiNuovi: 0 }, guarda = e => { const L = e.natpfLastRacket; if (L?.who !== 'player' || L === e.__visto) return; e.__visto = L;
      if (L.intent.derived){ if (L.out.rule) tel.ricostruitiNuovi++; } else if (L.out.shot !== 'SMASH'){ tel.tutti++; if (L.out.rule === 'nuova') tel.nuovi++; } };
    const c = simulate({ profile, difficulty: 'pro', points: 12, seed: 5 }), n = simulate({ profile, difficulty: 'pro', points: 12, seed: 5, dir: 'nuova', onStep: guarda });
    assert.equal(c.direzione.nuova, 0, `${profile}: Classica`);
    assert.ok(n.direzione.nuova > 0, `${profile}: ${JSON.stringify(n.direzione)}`);
    assert.ok(tel.tutti > 10 && tel.nuovi === tel.tutti && tel.ricostruitiNuovi === 0, `${profile}: ${JSON.stringify(tel)}`);
  }
  const DU = await import('../scripts/audit/b19/due-umani.mjs');
  const du = DU.play({ a: 'amatore', b: 'tennista', matches: 1, seed: 3, dir: 'nuova' });
  assert.ok(du.direzione.nuova > 0 && du.direzione.nuova >= .9*du.direzione.colpi, JSON.stringify(du.direzione));
  assert.equal(DU.play({ a: 'amatore', b: 'tennista', matches: 1, seed: 3 }).direzione.nuova, 0);
  const DD = await import('../scripts/audit/b19/due-umani-distanza.mjs');
  const dd = DD.match({ seed: 2, dir: 'nuova' });
  assert.ok(dd.direzione.nuova > 0 && dd.direzione.nuova >= .9*dd.direzione.colpi, JSON.stringify(dd.direzione));
  // chi mira con «Nuova» gira la cima verso il lato libero e colpisce a tempo (inversa della regola nuova)
  let visti = 0;
  simulate({ profile: 'tennista', difficulty: 'pro', points: 8, seed: 9, dir: 'nuova', onStep: e => { const L = e.natpfLastRacket; if (L?.who === 'player' && L !== e.__visto){ e.__visto = L; if (L.out.rule === 'nuova' && Math.abs(L.intent.face) >= .6) visti++; } } });
  assert.ok(visti >= 5, `colpi mirati con la cima: ${visti}`);
  assert.equal(devOfFace(1, 17), 17);
});
