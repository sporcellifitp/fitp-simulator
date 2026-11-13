// B17.4 (08/11/2026): colpi sotto rete (docs/b17/rete.md). Richiesta dell'utente: «quando ricevo una palla corta e mi avvicino
// alla rete per colpirla, compare "palla persa" oppure parte una palla morbidissima e lentissima, praticamente identica ogni
// volta. Voglio poter scegliere ed eseguire colpi diversi anche in questa situazione». Diagnostiche 20261108-171902-wqdk e
// 20261108-172017-q79f: tre colpi a rete su palla corta (piatto, top spin, pallonetto) con qualità di situazione 0,57–0,62,
// sotto failQ .63 di Leggenda → tutti «deboli» (6,8 m, +0,9 m sulla rete). Ora: colpo controllato con dispersione.
import test from 'node:test';
import assert from 'node:assert/strict';
import { strokeOutcome, directionSpan, lateSpanOf, impactWindow, slowFactor, OUTCOME, ASSIST, strokeSeed, seedUnit } from '../src/natpf/natpf_stroke_outcome.js';
import { ARC, skillLevel } from '../src/natpf/natpf_skill.js';
import { earlyWindow, nearNetSwing, WEAK, weakSwing, nearNetActor } from '../src/natpf/natpf_impact.js';
import { NatpfPhoneRacket, atNet, NET_Z } from '../src/natpf/natpf_phone_racket.js';
import { DEFAULTS as DET } from '@natpf/tennis/swing-detect.js';
import { FIXTURE, replay, reproduces } from '../scripts/audit/rete-diag.mjs';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { ASSIST_LEGGENDA_B16 } from './leggenda-b16.mjs';
import { cpuTuning } from '../src/natpf/natpf_skill.js';

// B18.2 passo 3 (docs/b18/t2-3-leggenda-e-palla-corta.md): il colpo controllato a rete vale solo con failQ sopra netQMin, cioè
// con la regola di Leggenda di prima (failQ .63, pressione dal 10° colpo, finestra .15). La Leggenda di oggi ha la soglia di Pro
// (failQ .3) e nessun livello accende più il colpo controllato: queste prove del meccanismo la rimettono a mano per tutto il
// file (ogni file di prova gira nel suo processo). L'ultima prova guarda la stessa situazione con la Leggenda di oggi
cpuTuning.leggenda = { assist: ASSIST_LEGGENDA_B16 };
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
  const full = shot({ shot: 'topspin', power: .7, rise: .3 }, { quality: 1 }), edge = shot({ shot: 'topspin', power: .7, rise: .3 }, { quality: Math.max(OUTCOME.netQMin, ASSIST_LEGGENDA_B16.failQ - OUTCOME.netQSpan) + .02 });
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

test('colpo controllato: il bordo morbido laterale vale anche senza assistenza (piatto girato e anticipo non mandano la palla oltre la riga); fuori dalla zona di rete come prima', () => {
  // revisione del B17.4: wqdk·121 (piatto 1210 °/s, piatto −1, anticipo +0,78, qualità .62) restava fuori di lato (x −4,99)
  const sp = span*slowFactor(AT_NET.ballVz), flat = (face, u, o = {}) => strokeOutcome({ ...AT_NET, timing: u*sp, ...o, intent: { shot: 'flat', power: .75, depth: .75, face, rise: -.3, conf: .6 } });
  for (const face of [-1, 1]) for (const u of [.4, .8, 1]){
    const c = flat(face, u);
    assert.ok(c.controlled && c.assist === 0 && c.excess === 0, JSON.stringify(c));
    assert.ok(Math.abs(c.x) <= OUTCOME.sideEdge + .01 && Math.abs(c.x) < OUTCOME.sideLine, `piatto ${face}, tempo ${u}: x ${c.x}`);
  }
  // la stessa mira da fondo campo senza assistenza (qualità .7 sotto assistQ .8, non controllato): fuori di lato come prima (B15)
  const back = flat(-1, .8, { net: false, shortBall: false, hitZ: 11.5, quality: .7 });
  assert.ok(!back.controlled && back.assist === 0 && Math.abs(back.x) > OUTCOME.sideLine, JSON.stringify(back));
  // il colpo delle diagnostiche rigiocato: controllato, incrociato pieno, dentro la riga laterale
  const d = replay(FIXTURE.find(s => s.session === 'wqdk' && s.n === 121));
  assert.ok(d.controlled && d.x < -3.5 && Math.abs(d.x) < OUTCOME.sideLine, JSON.stringify(d));
});

test('zona di rete: lo stesso gesto da una situazione migliore (q sopra failQ, sotto assistQ) resta dentro come il colpo controllato', () => {
  // seconda revisione del B17.4: con il bordo legato a «controlled» il piatto girato −1 cadeva dentro (x −4,00) con q 0,62 e fuori
  // (x −5,75) con q 0,64…0,8: peggio si era messi, più sicura era la palla. Stesso gesto (piatto .75, piatto −1, +0,8 della
  // finestra), qualità di situazione via via migliore: tutte dentro la riga laterale, stessa direzione, profondità crescente
  const sp = span*slowFactor(AT_NET.ballVz), flat = (face, u, o = {}) => strokeOutcome({ ...AT_NET, timing: u*sp, ...o, intent: { shot: 'flat', power: .75, depth: .75, face, rise: -.3, conf: .6 } });
  for (const face of [-1, 1]){
    const rows = [.5, .62, .64, .7, .79, .85, 1].map(quality => flat(face, .8, { quality }));
    assert.ok(rows[1].controlled && !rows[2].controlled && !rows[3].controlled && rows[3].assist === 0, JSON.stringify(rows.map(o => [o.q, o.controlled, o.assist])));
    for (const o of rows) assert.ok(Math.abs(o.x) <= OUTCOME.sideEdge + .01 && Math.abs(o.x) < OUTCOME.sideLine, `piatto ${face}, q ${o.q}: x ${o.x} (controllato ${o.controlled}, assistenza ${o.assist})`);
    assert.ok(Math.abs(rows[1].x - rows[3].x) < .05, `stessa direzione a q .62 e .7: ${rows[1].x} / ${rows[3].x}`);
    for (let i = 2; i < rows.length; i++) assert.ok(rows[i].depth > rows[i - 1].depth, rows.map(o => `${o.q}:${o.depth}`).join(' '));
  }
  // il bordo sfuma oltre la finestra come l'assistenza (regola del B15): 1,24 unità in anticipo il colpo esce
  assert.ok(Math.abs(flat(-1, 1.24, { quality: .7 }).x) > OUTCOME.sideLine);
  // da fondo campo niente cambia: sotto assistQ (q .7) la stessa mira esce come prima, con l'assistenza piena resta dentro
  const back = q => flat(-1, .8, { net: false, shortBall: false, hitZ: 11.5, quality: q });
  assert.ok(Math.abs(back(.7).x) > OUTCOME.sideLine && back(.7).assist === 0 && Math.abs(back(1).x) < OUTCOME.sideLine, `${back(.7).x} / ${back(1).x}`);
  // ai livelli senza il colpo controllato (failQ sotto netQMin: Pro, 1v1, Casual) l'esito a rete è già monotono con la situazione
  // e resta la regola del B15: sotto assistQ la mira piena esce di lato, con l'assistenza resta dentro (con il bordo a rete a
  // tutti i livelli audit:legend «pro contro medio» usciva dal criterio: 85,3 %)
  for (const name of ['pro', '1v1', 'casual']){
    const L = skillLevel(name), A = ASSIST[name];
    assert.ok(A.failQ < OUTCOME.netQMin, name);
    const low = flat(-1, .8, { level: L, lateSpan: lateSpanOf(8, L), quality: A.failQ + .1 }), high = flat(-1, .8, { level: L, lateSpan: lateSpanOf(8, L), quality: 1 });
    assert.ok(!low.controlled && !low.failed && low.assist === 0 && Math.abs(low.x) > OUTCOME.sideLine, `${name}: ${JSON.stringify(low)}`);
    assert.ok(high.assist === 1 && Math.abs(high.x) < OUTCOME.sideLine, `${name}: ${JSON.stringify(high)}`);
  }
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
    assert.ok(Math.abs(o.x) < OUTCOME.sideLine, `${s.session}·${s.n}: dentro la riga laterale (x ${o.x})`);
    assert.ok(o.clear < s.recorded.clear, `${s.session}·${s.n}: più bassa sulla rete (${o.clear} contro ${s.recorded.clear})`);
  }
  // top spin forte (1344 °/s) a 4 m: profondo e veloce; pallonetto (759 °/s) a 6,3 m: un pallonetto vero, oltre 8 m
  const top = replay(FIXTURE.find(s => s.session === 'q79f' && s.n === 142)), lob = replay(FIXTURE.find(s => s.session === 'q79f' && s.n === 159));
  assert.ok(top.depth >= 9.5 && top.kmh >= 50, JSON.stringify(top));
  assert.ok(lob.shot === 'LOB' && lob.depth >= 8, JSON.stringify(lob));
  // B18.2 passo 3 (D8): la palla corta ha il suo controllo del tocco (natpf_stroke_outcome.dropControl). Le palle corte
  // delle diagnostiche non giocate a rete non sono più accorciate dalla qualità che manca: quella pulita (q79f·139) cade
  // poco più lunga di prima, senza motivo; quella da 9,15 m con la situazione 0,73, in anticipo, al 16° colpo (wqdk·112)
  // viene lunga, con il motivo. Gli altri colpi non cambiano
  for (const s of others){
    const o = replay(s);
    if (o.shot === 'DROP' && !o.netVolley) assert.ok(o.depth >= s.recorded.depth && o.depth <= s.recorded.depth + (o.dropWhy ? 4 : .5) && !o.failed && !o.netFault && (o.dropLack > 0) === !!o.dropWhy, `${s.session}·${s.n}: ${JSON.stringify(o)}`);
    else assert.ok(reproduces(s, o), `${s.session}·${s.n}: ${JSON.stringify(o)}`);
  }
});

test('finestra del colpo a vuoto in anticipo allargata con slowFactor sulle palle lente (fino a ×1,8), solo nella zona di rete', () => {
  // chi colpisce a z, palla a bz con la caduta a land (già rimbalzata, non il servizio)
  const eng = (vz, { z = 4, bz = 3, land = 3, difficulty = 'leggenda' } = {}) => ({ matchConfig: { difficulty }, ball: { vel: { z: vz }, pos: { z: bz }, bounceCountOnCurrentSide: 1, rallyStrokeCount: 4, targetLanding: { z: land } }, player: { pos: { z } } });
  const win = e => +earlyWindow(e, e.player).toFixed(3), W = impactWindow('leggenda');
  assert.equal(win(eng(20)), W.early);
  assert.equal(win(eng(7.4)), +(W.early*1.8).toFixed(3));
  assert.equal(win(eng(10)), +(W.early*1.5).toFixed(3));
  // revisione: fuori dalla zona di rete (chi colpisce a 11 m, palla non corta) la finestra resta quella del livello anche sulla
  // palla lenta, a ogni livello (a Casual 0,5 × 1,8 avrebbe fatto 0,9 s); senza attore, quella del livello
  const far = eng(7.4, { z: 11, bz: 10, land: 9 });
  assert.equal(win(far), W.early); assert.ok(!nearNetSwing(far, far.player));
  assert.equal(+earlyWindow(eng(7.4)).toFixed(3), W.early);
  assert.equal(win(eng(7.4, { z: 11, bz: 10, land: 9, difficulty: 'casual' })), impactWindow('casual').early);
  // la zona di rete è quella del colpo controllato: chi colpisce entro WEAK.netZ, o la palla corta in arrivo (caduta entro attackZ)
  const short = eng(7.4, { z: 6.5, bz: 5.5, land: 5 });
  assert.ok(nearNetSwing(short, short.player)); assert.equal(win(short), +(W.early*1.8).toFixed(3));
  assert.ok(nearNetSwing(eng(7.4, { z: 4.9, bz: 4, land: 9 }), { pos: { z: 4.9 } }));
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

// La situazione dell'utente rigiocata nel motore vero (headless, Leggenda): chi gioca a 4 m dalla rete, in allungo (palla a
// «lateral» m di lato) e senza preparazione (prepCapable senza prep), palla corta rimbalzata, bassa (0,9 m), lenta (8 m/s).
// Un gesto del telefono (natpf.intent) in _handleUserSwingInput, poi il motore fino al colpo: esito, caduta, velocità
function netPlay({ shot = 'topspin', power = .7, rise = .3, face = 0, conf = .9, peak = 1200, angle = 60, lead = .12, lateral = 2.4, playerZ = 4, ballY = .9, vz = 8, prep = false, difficulty = 'leggenda' }){
  const realRandom = Math.random; Math.random = mulberry32(5);
  try {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 4;
    e.player.pos.set(.3, 0, playerZ); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
    const zc = playerZ - .35; e.ball.pos.set(.3 + lateral, ballY, zc - lead*vz); e.ball.vel.set(0, 0, vz); e.ball.targetLanding.set(.3 + lateral, 0, 3);
    const intent = { shot, power, typePower: power, depth: power, rise, face, conf, byShape: shot === 'drop' || shot === 'lob' };
    e._handleUserSwingInput({ source: 'natpf-phone', side: 'forehand', shotType: shot, speed: .8 + power*.85, dirX: 0, timing: null,
      natpf: { aim: 'swing', shot, conf, power, latency: 0, hand: 'right', peak, typical: 1300, angle, prepCapable: true, prep, intent } });
    let steps = 0, hit = false, v0 = null, land = null;
    for (let i = 0; i < 300 && e.phase === 'RALLY'; i++){
      if (e.ball.lastHitter === 'opponent') e.ball.vel.y = 0;
      e.step(1/120); steps++;
      if (e.ball.lastHitter === 'player'){ hit = true; v0 = e.ball.vel.clone(); land = e.ball.targetLanding.clone(); break; }
    }
    const R = e.natpfLastRacket;
    if (!hit || !R) return { hit: false, t: +(steps/120).toFixed(3) };
    const o = R.out;
    return { hit: true, q: R.quality, timing: +R.timing.toFixed(3), shot: o.shot, esito: o.controlled ? 'controllato' : o.weak ? 'debole' : o.failed ? 'fallito' : o.attack ? 'chiusura' : 'ok',
      x: o.x, depth: o.depth, clear: o.clear, kmh: Math.round(v0.length()*3.6), flight: +R.flight.toFixed(3), landX: +land.x.toFixed(2), landZ: +land.z.toFixed(2), out: o };
  } finally { Math.random = realRandom; }
}

test('motore a rete, la situazione dell\'utente: stessa situazione in allungo (q 0,61), dodici gesti → dodici esiti diversi, nessuno debole o fallito', () => {
  const sp = directionSpan(lv)*slowFactor(8), lt = lateSpanOf(8, lv);
  const G = {
    forte: { shot: 'flat', power: .9, rise: -.2, peak: 1500 },
    medio: { shot: 'topspin', power: .6, peak: 1000 },
    morbido: { shot: 'topspin', power: .35, peak: 600 },
    tagliato: { shot: 'slice', power: .55, rise: -.5, peak: 900 },
    smorzata: { shot: 'drop', power: .2, rise: -.5, conf: .9, peak: 350, angle: 30 },
    smorzataVaga: { shot: 'drop', power: .3, rise: -.5, conf: .14, peak: 450, angle: 30 },
    pallonetto: { shot: 'lob', power: .45, rise: .6, conf: .8, peak: 760, angle: 70 },
    anticipo: { shot: 'topspin', power: .7, lead: .8*sp },   // 0,8 della finestra (il tempo letto dal motore è il gesto prima della palla)
    ritardo: { shot: 'topspin', power: .7, lead: -.8*lt },
    piattoDestra: { shot: 'topspin', power: .7, face: 1 },
    piattoSinistra: { shot: 'topspin', power: .7, face: -1 },
    tocco: { shot: 'slice', power: .15, rise: -.3, conf: .3, peak: 200, angle: 15, lead: .2 },
  };
  const R = Object.fromEntries(Object.entries(G).map(([k, g]) => [k, netPlay(g)]));
  for (const [k, r] of Object.entries(R)){
    assert.ok(r.hit, `${k}: non colpito ${JSON.stringify(r)}`);
    assert.ok(r.q < ASSIST_LEGGENDA_B16.failQ && r.q >= OUTCOME.netQMin, `${k}: qualità di situazione ${r.q} (in allungo, sotto failQ)`);
    assert.ok(r.esito !== 'debole' && r.esito !== 'fallito' && !r.out.netFault, `${k}: ${JSON.stringify(r)}`);
    assert.ok(Math.abs(r.x) < OUTCOME.sideLine && r.depth > 0, `${k}: dentro il campo (x ${r.x}, profondità ${r.depth})`);
  }
  // dodici esiti diversi (direzione, profondità o velocità): prima del B17.4 erano 8 palle deboli identiche a 6,8 m
  const keys = Object.values(R).map(r => `${r.x.toFixed(1)}|${r.depth.toFixed(1)}|${r.kmh}`);
  assert.equal(new Set(keys).size, 12, keys.join(' '));
  assert.equal(Object.values(R).filter(r => r.depth.toFixed(1) === OUTCOME.weakDepth.toFixed(1)).length, 0, keys.join(' '));
  // coerenza con il gesto: forza → profondità e velocità in ordine (forte > medio > morbido)
  assert.ok(R.forte.depth > R.medio.depth && R.medio.depth > R.morbido.depth, `${R.forte.depth} ${R.medio.depth} ${R.morbido.depth}`);
  assert.ok(R.forte.kmh > R.medio.kmh && R.medio.kmh > R.morbido.kmh, `${R.forte.kmh} ${R.medio.kmh} ${R.morbido.kmh}`);
  assert.ok(R.forte.esito === 'controllato' && R.forte.depth >= 9 && R.forte.kmh >= 60, JSON.stringify(R.forte));
  // tagliato: effetto all'indietro, più basso sulla rete del top spin; smorzata chiara: palla corta vera; vaga: volée a 3 m e più
  assert.ok(R.tagliato.out.topspin < 0 && R.tagliato.clear < R.medio.clear, JSON.stringify({ tagliato: R.tagliato, medio: R.medio }));
  assert.ok(R.smorzata.shot === 'DROP' && R.smorzata.depth <= 4.6 && R.smorzata.kmh < R.tagliato.kmh, JSON.stringify(R.smorzata));
  assert.ok(R.smorzataVaga.shot === 'SLICE' && R.smorzataVaga.out.netVolley && R.smorzataVaga.depth >= 3 && R.smorzataVaga.depth < R.tagliato.depth, JSON.stringify(R.smorzataVaga));
  assert.ok(R.pallonetto.shot === 'LOB' && R.pallonetto.depth >= 8 && R.pallonetto.clear > R.medio.clear + .8, JSON.stringify(R.pallonetto));
  // direzioni opposte dal tempo (anticipo incrociato, ritardo lungolinea) e dal piatto, almeno 3 e 4 m tra loro
  assert.ok(R.anticipo.x < R.ritardo.x - 3, `${R.anticipo.x} / ${R.ritardo.x}`);
  assert.ok(R.piattoDestra.x > R.piattoSinistra.x + 4, `${R.piattoSinistra.x} / ${R.piattoDestra.x}`);
  // il tocco di volée da 200 °/s è giocato, corto e lento
  assert.ok(R.tocco.esito === 'controllato' && R.tocco.depth < 6 && R.tocco.kmh < R.morbido.kmh, JSON.stringify(R.tocco));
  // la stessa situazione comodi (0,6 m, con preparazione): qualità piena, colpi normali, la palla corta vaga diventa volée
  const easy = netPlay({ ...G.forte, lateral: .6, prep: true }), easyDrop = netPlay({ ...G.smorzataVaga, lateral: .6, prep: true });
  assert.ok(easy.hit && easy.q === 1 && easy.esito === 'ok' && easy.kmh > R.forte.kmh, JSON.stringify(easy));
  assert.ok(easyDrop.hit && easyDrop.shot === 'SLICE' && easyDrop.out.netVolley, JSON.stringify(easyDrop));
});

test('motore a rete: lo stesso gesto da una situazione via via migliore resta dentro la riga laterale (niente inversione di coerenza)', () => {
  // seconda revisione del B17.4: piatto .75 con il piatto girato −1 a +0,5 della finestra, allungo 2,4 → 0,6 m. Con il bordo
  // laterale legato a «controlled»: q 0,614 controllato x −4,00 dentro, q 0,65…0,84 normale x −5,96…−4,17 FUORI, dentro di
  // nuovo solo da q 0,89 (assistenza piena). Ora: dentro a ogni q, stessa direzione, profondità crescente con la qualità
  const sp = directionSpan(lv)*slowFactor(8);
  const rows = [[2.4, false], [2.2, false], [2.0, false], [2.4, true], [1.6, false], [1.2, false], [1.6, true], [.6, true]]
    .map(([lateral, prep]) => ({ lateral, prep, ...netPlay({ shot: 'flat', power: .75, rise: -.3, face: -1, conf: .6, lead: .12 + .5*sp, lateral, prep }) }));
  for (const r of rows) assert.ok(r.hit, JSON.stringify(r));
  assert.ok(rows[0].esito === 'controllato' && rows[0].q < ASSIST_LEGGENDA_B16.failQ, JSON.stringify(rows[0]));
  assert.ok(rows[1].esito === 'ok' && rows[1].q > ASSIST_LEGGENDA_B16.failQ && rows[1].out.assist === 0, JSON.stringify(rows[1]));
  assert.ok(rows.at(-1).q === 1 && rows.at(-1).out.assist === 1, JSON.stringify(rows.at(-1)));
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].q > rows[i - 1].q, rows.map(r => r.q).join(' '));
  for (const r of rows) assert.ok(Math.abs(r.x) <= OUTCOME.sideEdge + .01 && Math.abs(r.landX) < OUTCOME.sideLine, `allungo ${r.lateral}${r.prep ? ' con preparazione' : ''}, q ${r.q}: x ${r.x}, caduta ${r.landX} (fuori)`);
  assert.ok(Math.max(...rows.map(r => r.x)) - Math.min(...rows.map(r => r.x)) < .05, `stessa direzione: ${rows.map(r => r.x).join(' ')}`);
  // profondità crescente con la qualità, a parità di preparazione (la posizione laterale della palla entra nella profondità
  // con la regola della diagonale, quindi il confronto è dentro ogni gruppo)
  for (const prep of [false, true]){
    const g = rows.filter(r => r.prep === prep);
    for (let i = 1; i < g.length; i++) assert.ok(g[i].depth > g[i - 1].depth, g.map(r => `${r.q}:${r.depth}`).join(' '));
  }
  assert.ok(rows.at(-1).depth > rows[0].depth + .5, `${rows[0].depth} → ${rows.at(-1).depth}`);
});

test('B18.2 passo 3: con la Leggenda di oggi (soglia di Pro) la situazione dell\'utente a rete dà colpi normali, nessuno debole, fallito o controllato', () => {
  const T = cpuTuning.leggenda; delete cpuTuning.leggenda;
  try {
    for (const g of [{ shot: 'flat', power: .9, rise: -.2, peak: 1500 }, { shot: 'topspin', power: .6, peak: 1000 }, { shot: 'slice', power: .55, rise: -.5, peak: 900 }, { shot: 'lob', power: .45, rise: .6, conf: .8, peak: 760, angle: 70 }]){
      const r = netPlay(g);
      assert.ok(r.hit && r.q > ASSIST.leggenda.failQ && r.q < ASSIST_LEGGENDA_B16.failQ, JSON.stringify(r));
      assert.ok(r.esito !== 'debole' && r.esito !== 'fallito' && r.esito !== 'controllato' && !r.out.netFault, JSON.stringify(r));
    }
  } finally { cpuTuning.leggenda = T; }
});
