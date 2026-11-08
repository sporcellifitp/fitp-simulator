// B17.4 (08/11/2026): colpi sotto rete (docs/b17/rete.md). Richiesta dell'utente: «quando ricevo una palla corta e mi avvicino
// alla rete per colpirla, compare "palla persa" oppure parte una palla morbidissima e lentissima, praticamente identica ogni
// volta. Voglio poter scegliere ed eseguire colpi diversi anche in questa situazione». Diagnostiche 20261108-171902-wqdk e
// 20261108-172017-q79f: tre colpi a rete su palla corta (piatto, top spin, pallonetto) con qualità di situazione 0,57–0,62,
// sotto failQ .63 di Leggenda → tutti «deboli» (6,8 m, +0,9 m sulla rete). Ora: colpo controllato con dispersione.
import test from 'node:test';
import assert from 'node:assert/strict';
import { strokeOutcome, directionSpan, lateSpanOf, impactWindow, OUTCOME, ASSIST, strokeSeed, seedUnit } from '../src/natpf/natpf_stroke_outcome.js';
import { ARC, skillLevel } from '../src/natpf/natpf_skill.js';
import { earlyWindow, WEAK, weakSwing, nearNetActor } from '../src/natpf/natpf_impact.js';
import { NatpfPhoneRacket, atNet, NET_Z } from '../src/natpf/natpf_phone_racket.js';
import { DEFAULTS as DET } from '@natpf/tennis/swing-detect.js';
import { FIXTURE, replay, reproduces } from '../scripts/audit/rete-diag.mjs';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';

const lv = skillLevel('leggenda'), span = directionSpan(lv), late = lateSpanOf(8, lv);
// la situazione delle diagnostiche: a rete (4 m), palla corta rimbalzata, bassa (0,9 m), lenta (8 m/s), qualità di situazione
// 0,6 («in allungo»), tempo nella finestra. Solo il gesto cambia
const AT_NET = { contact: 1, hitX: .5, hitZ: 4, contactY: .9, ballVz: 8, quality: .6, pressure: 1, net: true, shortBall: true, lateSpan: late, level: lv };
const shot = (intent, o = {}) => strokeOutcome({ ...AT_NET, ...o, intent: { depth: intent.power, face: 0, rise: 0, conf: 1, ...intent } });

test('stessa situazione a rete, cinque gesti diversi → cinque esiti diversi e coerenti (nessuno debole o fallito)', () => {
  const forte = shot({ shot: 'flat', power: .9 });                                  // forte teso: profondo e basso
  const tagliato = shot({ shot: 'slice', power: .55, rise: -.5 });                  // tagliato: basso e radente
  const smorzata = shot({ shot: 'drop', power: .2, rise: -.5, conf: .9 });          // smorzata: corta
  const incrociato = shot({ shot: 'topspin', power: .7, rise: .3 }, { timing: .8*span });     // in anticipo: incrociato
  const lungolinea = shot({ shot: 'topspin', power: .7, rise: .3 }, { timing: -.8*late });    // in ritardo: lungolinea
  const all = { forte, tagliato, smorzata, incrociato, lungolinea };
  for (const [k, o] of Object.entries(all)) assert.ok(!o.weak && !o.failed && !o.netFault, `${k}: ${JSON.stringify(o)}`);
  // cinque esiti diversi (profondità o direzione)
  const keys = Object.values(all).map(o => `${o.depth.toFixed(1)}|${o.x.toFixed(1)}`);
  assert.equal(new Set(keys).size, 5, keys.join(' '));
  // forte teso: chiusura sopra la rete (attackQ che scala con la forza: 0,6 basta a un gesto da 0,9), profondo e basso
  assert.ok(forte.attack && forte.depth >= 9 && forte.clear < ARC.netY + .35, JSON.stringify(forte));
  assert.ok(Number.isFinite(forte.flight) && forte.flight < .8, `volo ${forte.flight}`);
  // tagliato: più basso sulla rete del top spin, effetto all'indietro, meno profondo del colpo forte
  const top = shot({ shot: 'topspin', power: .55, rise: .3 });
  assert.ok(tagliato.topspin < 0 && tagliato.clear < top.clear && tagliato.depth < forte.depth, JSON.stringify({ tagliato, top }));
  // smorzata: resta corta (forma chiara e gesto lento)
  assert.ok(smorzata.shot === 'DROP' && smorzata.depth <= 4.6 && smorzata.depth < tagliato.depth, JSON.stringify(smorzata));
  // incrociato e lungolinea dal tempo: da parti opposte, almeno 3 m tra loro
  assert.ok(incrociato.x < lungolinea.x - 3, `${incrociato.x} / ${lungolinea.x}`);
  // direzione dal piatto, piena anche a rete
  const destra = shot({ shot: 'topspin', power: .7, rise: .3, face: 1 }), sinistra = shot({ shot: 'topspin', power: .7, rise: .3, face: -1 });
  assert.ok(destra.x > sinistra.x + 4, `${sinistra.x} / ${destra.x}`);
  // forza → profondità e velocità (volo più corto), in ordine
  const ds = [.3, .5, .7, .9].map(power => shot({ shot: 'topspin', power, rise: .3 }));
  for (let i = 1; i < ds.length; i++) assert.ok(ds[i].depth > ds[i - 1].depth, ds.map(o => o.depth).join(' '));
});

test('colpo controllato: stessi ingressi stesso esito; la qualità che manca aggiunge dispersione, non appiattimento', () => {
  const a = shot({ shot: 'topspin', power: .7, rise: .3 }), b = shot({ shot: 'topspin', power: .7, rise: .3 });
  assert.deepEqual(a, b);
  assert.ok(a.controlled && a.spread > 0 && a.spread <= 1, JSON.stringify(a));
  // la dispersione è deterministica dal seme del colpo: ingressi vicini danno esiti diversi, in [−1, 1]
  const units = [0, 1, 2, 3, 4].map(i => seedUnit(strokeSeed(.1 + i*.01, .7, 0, .3, .5, .9, 4), 0));
  assert.ok(units.every(u => u >= -1 && u <= 1) && new Set(units.map(u => u.toFixed(2))).size >= 4, units.join(' '));
  // con la qualità piena niente dispersione e niente colpo controllato; con la qualità al limite dispersione piena
  const full = shot({ shot: 'topspin', power: .7, rise: .3 }, { quality: 1 }), edge = shot({ shot: 'topspin', power: .7, rise: .3 }, { quality: Math.max(OUTCOME.netQMin, ASSIST.leggenda.failQ - OUTCOME.netQSpan) + .02 });
  assert.ok(!full.controlled && full.spread === 0, JSON.stringify(full));
  assert.ok(edge.controlled && edge.spread > .5, JSON.stringify(edge));
  // più sotto (raggiunta all'ultimo): la palla debole di prima; molto fuori tempo: fallito
  const last = shot({ shot: 'topspin', power: .7, rise: .3 }, { quality: .3 });
  assert.ok(last.failed && last.weak && last.depth <= OUTCOME.weakDepth, JSON.stringify(last));
  const off = shot({ shot: 'topspin', power: .7, rise: .3 }, { timing: 4*span, contactY: .5 });   // oltre la finestra (allargata ×1,8 dalla palla lenta)
  assert.ok(off.failed && !off.controlled && off.netFault, JSON.stringify(off));
  // sotto pressione degli scambi lunghi resta l'errore (la pressione non è la situazione)
  const tired = shot({ shot: 'topspin', power: .7, rise: .3 }, { quality: .75, pressure: .8, contactY: .5 });
  assert.ok(tired.failed && tired.pressured && !tired.controlled, JSON.stringify(tired));
  // da fondo campo (non a rete) la regola di prima: qualità sotto failQ → fallito
  const back = strokeOutcome({ ...AT_NET, net: false, shortBall: false, hitZ: 11.5, contactY: .8, intent: { shot: 'topspin', power: .7, rise: .3, face: 0 } });
  assert.ok(back.failed && !back.controlled, JSON.stringify(back));
});

test('palla corta per forma a rete: palla corta solo con la forma chiara e il gesto lento, altrimenti volée controllata 3–7 m', () => {
  const drop = shot({ shot: 'drop', power: .2, rise: -.5, conf: .9 });
  assert.ok(drop.shot === 'DROP' && !drop.netVolley && drop.depth <= 4.6, JSON.stringify(drop));
  // forma poco chiara (conf .14, diagnostica wqdk n.112) o gesto non così lento: volée tagliata, profondità dalla forza
  const vague = shot({ shot: 'drop', power: .2, rise: -.5, conf: .14 }), firm = shot({ shot: 'drop', power: .5, rise: -.5, conf: .9 });
  assert.ok(vague.netVolley && vague.shot === 'SLICE' && vague.depth >= 3 && vague.depth < firm.depth, JSON.stringify(vague));
  assert.ok(firm.netVolley && firm.depth >= 4 && firm.depth <= 7, JSON.stringify(firm));   // 3 + 4·0,5 meno la qualità che manca
  assert.ok(firm.topspin < 0 && firm.flight == null, JSON.stringify(firm));   // volo del tagliato nel motore, niente minimo di 1,32 s
  // da fondo campo (non a rete) la palla corta resta una palla corta, anche con la forma poco chiara
  const back = strokeOutcome({ ...AT_NET, net: false, shortBall: false, hitZ: 11.5, quality: 1, intent: { shot: 'drop', power: .3, rise: -.5, conf: .14 } });
  assert.ok(back.shot === 'DROP' && !back.netVolley, JSON.stringify(back));
  // senza confidenza (intenzione ricavata da webcam o controlli di prova) la palla corta resta
  const derived = strokeOutcome({ ...AT_NET, intent: { shot: 'drop', power: .3, rise: -.4, derived: true } });
  assert.equal(derived.shot, 'DROP');
});

test('chiusura sopra la rete: attackQ scala con la forza (un gesto forte chiude con qualità 0,6, uno medio no)', () => {
  const o = { contactY: 1.1 };
  const strong = shot({ shot: 'flat', power: .9 }, o), mid = shot({ shot: 'flat', power: .5 }, o), fullQ = shot({ shot: 'flat', power: .5 }, { ...o, quality: 1 });
  assert.ok(strong.attack && !mid.attack && fullQ.attack, JSON.stringify({ strong, mid, fullQ }));
  assert.ok(strong.flight <= (4 + strong.depth)/20, `volo ${strong.flight} su ${strong.depth} m`);   // almeno 20 m/s lungo il campo
});

test('le tre palle deboli delle diagnostiche dell\'08/11 diventano colpi controllati; gli altri cinque colpi non cambiano', () => {
  const weakOnes = FIXTURE.filter(s => s.recorded.weak), others = FIXTURE.filter(s => !s.recorded.weak);
  assert.equal(weakOnes.length, 3); assert.equal(others.length, 5);
  for (const s of weakOnes){
    const o = replay(s);
    assert.ok(o.controlled && !o.weak && !o.failed && !o.netFault, `${s.session}·${s.n}: ${JSON.stringify(o)}`);
    assert.ok(o.clear < s.recorded.clear, `${s.session}·${s.n}: più bassa sulla rete (${o.clear} contro ${s.recorded.clear})`);
  }
  // top spin forte (1344 °/s) a 4 m: profondo e veloce; pallonetto (759 °/s) a 6,3 m: un pallonetto vero, oltre 8 m
  const top = replay(FIXTURE.find(s => s.session === 'q79f' && s.n === 142)), lob = replay(FIXTURE.find(s => s.session === 'q79f' && s.n === 159));
  assert.ok(top.depth >= 9.5 && top.kmh >= 50, JSON.stringify(top));
  assert.ok(lob.shot === 'LOB' && lob.depth >= 8, JSON.stringify(lob));
  for (const s of others) assert.ok(reproduces(s, replay(s)), `${s.session}·${s.n}: ${JSON.stringify(replay(s))}`);
});

test('finestra del colpo a vuoto in anticipo allargata con slowFactor sulle palle lente (fino a ×1,8)', () => {
  const eng = vz => ({ matchConfig: { difficulty: 'leggenda' }, ball: { vel: { z: vz } } });
  const W = impactWindow('leggenda');
  assert.equal(+earlyWindow(eng(20)).toFixed(3), W.early);
  assert.equal(+earlyWindow(eng(7.4)).toFixed(3), +(W.early*1.8).toFixed(3));
  assert.equal(+earlyWindow(eng(10)).toFixed(3), +(W.early*1.5).toFixed(3));
  assert.equal(+earlyWindow({ matchConfig: { difficulty: 'casual' } }).toFixed(3), impactWindow('casual').early);
});

test('telefono: il gioco manda cfg net:1 quando chi gioca è entro 5 m dalla rete nello scambio, e lo toglie al rientro (isteresi)', () => {
  const sent = [], phone = new NatpfPhoneRacket({ playerRole: 'p1' });
  phone.link = { connected: true, send: m => sent.push(m), cmd(){} };
  phone._sendGrip();
  assert.equal(sent.at(-1).t, 'cfg'); assert.equal(sent.at(-1).net, undefined);
  assert.equal(phone.setNet(true), true);
  assert.equal(sent.at(-1).t, 'cfg'); assert.equal(sent.at(-1).net, 1);
  assert.equal(phone.setNet(true), false);
  assert.equal(phone.setNet(false), true);
  assert.equal(sent.at(-1).t, 'cfg'); assert.equal(sent.at(-1).net, undefined);
  // a rete: entro NET_Z.in; una volta a rete fino a NET_Z.out; solo nello scambio
  const E = (z, phase = 'RALLY') => ({ playerRole: 'p1', phase, player: { pos: { z } }, opponent: { pos: { z: -z } } });
  assert.equal(atNet(E(4.9)), true); assert.equal(atNet(E(5.3)), false); assert.equal(atNet(E(5.3), 'p1', true), true); assert.equal(atNet(E(5.7), 'p1', true), false);
  assert.equal(atNet(E(4.9, 'POINT_OVER')), false); assert.equal(atNet(E(-4.9), 'p2'), true);
  assert.deepEqual(NET_Z, { in: 5, out: 5.6 });
});

// Revisione del B17.4: la soglia bassa del telefono a rete era vanificata dal motore (WEAK.rel .3 e ample 25: un tocco da
// 200 °/s e 15° fatto 0,2 s prima della palla era «debole» e, sotto 25°, scartato in silenzio da resolvePending: la palla
// passava). Motore vero senza browser: Leggenda, chi gioca a 4,5 m dalla rete, palla corta lenta (6 m/s) in arrivo
function netTouch({ peak, angle, lead, shot = 'slice', power = .15, rise = -.3, conf = .3, vz = 6, playerZ = 4.5 }){
  const realRandom = Math.random; Math.random = mulberry32(5);
  try {
    const e = createHeadlessEngine({ difficulty: 'leggenda' }); e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 4;
    e.player.pos.set(.3, 0, playerZ); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
    const zc = playerZ - .35; e.ball.pos.set(.6, .95, zc - lead*vz); e.ball.vel.set(0, 0, vz); e.ball.targetLanding.set(.6, 0, 3);
    e._handleUserSwingInput({ source: 'natpf-phone', side: 'forehand', shotType: shot, speed: .8 + power*.85, dirX: 0, timing: null,
      natpf: { aim: 'swing', shot, conf, power, latency: 0, hand: 'right', peak, typical: 1300, angle, intent: { shot, power, typePower: power, depth: power, rise, face: 0, conf, byShape: true } } });
    let steps = 0;
    for (let i = 0; i < 200 && e.ball.lastHitter === 'opponent' && e.phase === 'RALLY'; i++){ e.ball.vel.y = 0; e.step(1/120); steps++; }
    const R = e.natpfLastRacket, hit = e.ball.lastHitter === 'player';
    return { hit, t: steps/120, out: hit && R ? R.out : null };
  } finally { Math.random = realRandom; }
}

test('motore a rete: un tocco da 200 °/s e 15° fatto 0,2 s prima della palla è giocato (volée controllata), non scartato', () => {
  // i due gesti della revisione: sulla base (WEAK.rel .3, ample 25) hit:false, la palla passava
  const a = netTouch({ peak: 200, angle: 15, lead: .2 });
  assert.ok(a.hit && a.out && !a.out.weak && !a.out.failed && a.out.shot === 'SLICE', JSON.stringify(a));
  assert.ok(a.t < .2 + WEAK.wait, `giocato all'arrivo della palla (${a.t} s), non dopo l'attesa WEAK`);   // non è «weak» a rete: .15 × 1300 = 195
  const b = netTouch({ peak: 300, angle: 20, lead: .3 });
  assert.ok(b.hit && b.out && !b.out.weak && !b.out.failed, JSON.stringify(b));
  // un gesto sotto netRel × tipico (160 °/s) ma con l'ampiezza del telefono (12°) aspetta il colpo vero WEAK.wait e poi si gioca
  const c = netTouch({ peak: 160, angle: 12, lead: .2 });
  assert.ok(c.hit && c.out && !c.out.failed, JSON.stringify(c));
  assert.ok(c.t >= .2 + .05 && c.t <= .2 + WEAK.wait + .05, `dopo l'attesa del colpo vero (${c.t} s)`);
  // un micro-movimento (6°, che il telefono non manda) resta scartato anche a rete
  assert.equal(netTouch({ peak: 160, angle: 6, lead: .2 }).hit, false);
  // da fondo campo (11,5 m) lo stesso tocco da 200 °/s e 15° è ancora la preparazione: debole e scartato, come prima
  const far = netTouch({ peak: 200, angle: 15, lead: .2, playerZ: 11.5 });
  assert.equal(far.hit, false, JSON.stringify(far));
  assert.ok(netTouch({ peak: 500, angle: 30, lead: .2, playerZ: 11.5 }).hit);
});

test('soglie a rete coerenti tra telefono e motore: ampiezza netAmple = netMinAngle, zona netZ = NET_Z.in, rel ≥ netMinPeak', () => {
  assert.equal(WEAK.netAmple, DET.netMinAngle);
  assert.equal(WEAK.netZ, NET_Z.in);
  assert.ok(WEAK.netRel >= DET.netMinPeak && WEAK.netRel < WEAK.rel, `${WEAK.netRel}`);
  const g = peak => ({ natpf: { peak, typical: 1300, angle: 15, intent: { shot: 'slice', conf: .3 } } });
  assert.equal(weakSwing(g(200)), true); assert.equal(weakSwing(g(200), true), false);
  assert.equal(weakSwing(g(160), true), true); assert.equal(weakSwing(g(380), true), false); assert.equal(weakSwing(g(380)), true);
  assert.equal(nearNetActor({ pos: { z: 4.9 } }), true); assert.equal(nearNetActor({ pos: { z: -4.9 } }), true);
  assert.equal(nearNetActor({ pos: { z: 5.1 } }), false); assert.equal(nearNetActor(null), false);
  // le due diagnostiche dell'08/11: i 30 gesti scartati «deboli» dal telefono (colpo tipico ~1300 °/s) passano tutti la soglia
  // nuova del telefono (≥ 130 °/s, ≥ 10°); nel motore prima 8 con ampiezza 10–20° sarebbero stati scartati, ora nessuno
  const weakOnes = [[163,11],[164,20],[173,10],[180,15],[181,30],[183,28],[185,44],[189,45],[203,19],[207,54],[211,14],[213,32],[221,18],[228,70],[231,59],[241,10],[242,58],[242,82],[250,69],[266,67],[276,34],[277,36],[278,71],[318,38],[334,28],[395,75],[400,92],[443,87],[444,103],[469,69]];
  const phoneOk = weakOnes.filter(([pk, ang]) => pk >= DET.netMinPeak*1300 && ang >= DET.netMinAngle);
  assert.equal(phoneOk.length, 30);
  const droppedBefore = weakOnes.filter(([pk, ang]) => pk < WEAK.rel*1300 && ang < WEAK.ample), droppedNow = weakOnes.filter(([pk, ang]) => pk < WEAK.netRel*1300 && ang < WEAK.netAmple);
  assert.equal(droppedBefore.length, 8); assert.equal(droppedNow.length, 0);
  assert.equal(weakOnes.filter(([pk]) => pk < WEAK.netRel*1300).length, 8);   // questi aspettano WEAK.wait il colpo vero, poi si giocano
});
