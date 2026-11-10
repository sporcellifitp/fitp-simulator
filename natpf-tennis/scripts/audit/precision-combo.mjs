// B18 (difetto 14 dell'audit B16): Precision e Combo per chi arriva per la prima volta. Banco senza grafica sulle regole
// vere del motore (createHeadlessEngine), con la palla del lanciapalle come nei minigiochi (natpf_training._feed: dal fondo,
// volo 1,2 s, top spin 10, verso il dritto o il rovescio di chi gioca).
//
// Precision: per ogni zona chi gioca mira il centro solo con il dritto (top spin), come un visitatore che non conosce la
// palla corta: lato con il piatto, profondità con la forza (inversa della curva di natpf_stroke_outcome), con l'errore del
// suo profilo su tempo, piatto e forza. Punti con natpf_arcade.precisionPoints; totale di 10 palle; medaglie.
//   profili: tennista, amatore (chi mira con un errore medio), bambino (gesto lento: forza bassa, tempo impreciso),
//            ingenuo (non mira: colpo normale con la sua forza)
// Combo: 90" con catene come natpf_events (comboChain, comboStepOk); chi conosce solo dritto e rovescio non riesce mai un
// colpo speciale; i passi di direzione riescono con la probabilità del profilo. Prima/dopo: catene di oggi contro catene
// per principianti (prime catene solo dritto e rovescio, speciali solo se imparati, passo che cambia dopo due errori).
//   node --import ./test/register.mjs scripts/audit/precision-combo.mjs [--runs=40] [--zones=old|new]
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32, gauss } from './headless-engine.mjs';
import * as NI from '../../src/natpf/natpf_impact.js';
import { OUTCOME, neutralX, aimForLanding } from '../../src/natpf/natpf_stroke_outcome.js';
import { PRECISION_ZONES, precisionPoints, modeById, comboChain, comboSwapStep, comboStepPoints, comboChainBonus, COMBO_STEPS, COMBO_LEARN } from '../../src/natpf/natpf_arcade.js';
import { landsIn } from '../../src/natpf/natpf_shot_feedback.js';

// zone fino alla 2026-11-10.1 (prima del B18), per il confronto
export const OLD_ZONES = Object.freeze([
  { x: 0, z: -9.2, r: 1.8 }, { x: -2.8, z: -9.4, r: 1.6 }, { x: 2.8, z: -9.4, r: 1.6 }, { x: 0, z: -6.2, r: 1.5 }, { x: -2.9, z: -6, r: 1.3 },
  { x: 2.9, z: -6, r: 1.3 }, { x: 0, z: -3, r: 1.3 }, { x: -3, z: -10.2, r: 1.1 }, { x: 3, z: -10.2, r: 1.1 }, { x: 2.6, z: -3.2, r: 1 },
]);
export const OLD_MEDALS = Object.freeze([250, 480, 700]);

// errore di tempo (s), del piatto, della forza; aim: se mira la zona
export const PROFILES = Object.freeze({
  tennista: { timingSd: .035, faceSd: .12, powerSd: .07, aim: true, maxPower: 1 },
  amatore: { timingSd: .075, faceSd: .3, powerSd: .14, aim: true, maxPower: .9 },
  bambino: { timingSd: .14, faceSd: .45, powerSd: .1, aim: true, maxPower: .25 },
  ingenuo: { timingSd: .075, faceSd: .3, powerSd: .14, aim: false, power: .45, maxPower: .9 },
});
// anticipo medio del gesto sul contatto (s): con questo riferimento (timeToContact) il voto è soprattutto «Perfetto» e
// «Anticipo», come nelle partite vere (le persone anticipano, docs/b15/audit-colpi.md); sotto ~0,035 s la palla passa
const LEAD = +(process.env.LEAD || .12);
const DT = 1/120, clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// forza per cadere a «want» metri dalla rete con il top spin (inversa di lerp(6,2, 11,5, forza^0,7)); sotto 6,2 m la minima
export function powerForDepth(want){
  const [a, b] = OUTCOME.depth.TOPSPIN;
  return Math.pow(clamp((want - a)/(b - a), 0, 1), 1/OUTCOME.depthCurve);
}

// una palla del lanciapalle verso il dritto di chi gioca, colpita mirando la zona; restituisce il rimbalzo o null
function playBall(e, zone, P, rng){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 1;
  e.player.pos.set(0, 0, 11.7); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
  const side = rng() < .5 ? 1 : -1, tx = clamp(side*1.3 + (rng() - .5)*.6, -3.4, 3.4), tz = 8.4 + rng()*1.4;
  e.ball.pos.set((rng() - .5)*2, 1.05, -11.6);
  e._launchBallToTarget(e.ball.pos.clone(), new THREE.Vector3(tx, 0, tz), 1.2, { topspin: 10, sidespin: 0, allowNetFault: false });
  e.pendingUserSwing = null; e._natpfPlanPlayer();
  const contact = tx >= 0 ? 1 : -1, x0 = neutralX(tx, OUTCOME.xMax);
  const aim = P.aim ? aimForLanding(zone.x, x0) : 0;
  const face = clamp((aim + contact*OUTCOME.natural)/OUTCOME.faceAim + gauss(rng)*P.faceSd, -1, 1);
  const want = P.aim ? powerForDepth(-zone.z) : P.power;
  const power = +clamp(want + gauss(rng)*P.powerSd, 0, P.maxPower).toFixed(3);
  const swing = { source: 'audit', side: contact > 0 ? 'forehand' : 'backhand', shotType: 'topspin', speed: .8 + power*.85, dirX: 0,
    natpf: { aim: 'swing', shot: 'topspin', intent: { shot: 'topspin', power, depth: +(power*.91).toFixed(3), rise: .3, face }, power, peak: 250 + power*1100, latency: 0, hand: 'right' } };
  const lead = (P.leadMean ?? LEAD) + gauss(rng)*P.timingSd;
  let sent = false;
  for (let t = 0; t < 5; t += DT){
    const ttc = NI.timeToContact(e, e.player);
    if (!sent && ttc != null && ttc <= lead){ e._handleUserSwingInput(swing); sent = true; }
    const before = e.ball.lastHitter;
    e.step(DT);
    if (before !== 'player' && e.ball.lastHitter === 'player'){
      const L = e.ball.targetLanding, net = !!e.ball.natpfNetFault;
      return { x: L.x, z: L.z, inCourt: !net && landsIn(L, { towardNegativeZ: true }) };
    }
    if (e.phase !== 'RALLY') break;
  }
  if (process.env.DBG) console.log('  non colpita', JSON.stringify({ sent, lead: +lead.toFixed(3), phase: e.phase, last: e.ball.lastHitter, pos: e.ball.pos, plan: e.natpfPlan?.kind, pz: e.player.pos }));
  return null;
}

export function precisionRun({ zones = PRECISION_ZONES, profile = 'amatore', runs = 40, seed = 1 } = {}){
  const P = PROFILES[profile], rng = mulberry32(seed), real = Math.random; Math.random = mulberry32(seed*7 + 3);
  const totals = [], perZone = zones.map(() => []);
  try {
    const e = createHeadlessEngine({ difficulty: 'casual' }); e.startNewMatch({ showStartBanner: false });
    for (let r = 0; r < runs; r++){
      let tot = 0;
      zones.forEach((z, i) => { const L = playBall(e, z, P, rng), pts = L ? precisionPoints(L, z, L.inCourt) : 0; perZone[i].push(pts); tot += pts; });
      totals.push(tot);
    }
  } finally { Math.random = real; }
  const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q*s.length))]; };
  return { profile, totals, p25: pct(totals, .25), p50: pct(totals, .5), p75: pct(totals, .75), p90: pct(totals, .9),
    zoneMean: perZone.map(a => Math.round(a.reduce((s, v) => s + v, 0)/a.length)), zoneZero: perZone.map(a => Math.round(100*a.filter(v => v === 0).length/a.length)) };
}
export const medalShare = (totals, medals) => medals.map(t => Math.round(100*totals.filter(v => v >= t).length/totals.length));

// Combo: 90 s di catene, un colpo ogni ~3,6 s (attesa 0,9 s, volo della palla del lanciapalle 1,2 s, volo del colpo fino al rimbalzo fuori ~1,5 s). can(step): probabilità che il colpo
// chiesto riesca per chi gioca. chains(n, ctx): catena di lunghezza n (prima/dopo). swap: cambia il passo dopo due errori
export function comboRun({ can, chainFor, swap = false, seed = 1, time = 90, perBall = 3.6 } = {}){
  const rng = mulberry32(seed);
  let score = 0, chainLen = 2, chainsDone = 0, chain = chainFor(chainLen, { chainsDone, rng }), idx = 0, fails = 0, failStep = null, specialsAsked = 0, firstSpecial = 0, zeroStart = 0, okSteps = 0;
  if (COMBO_STEPS[chain[0]].phone) firstSpecial++;
  for (let t = 0; t < time; t += perBall){
    const step = chain[idx];
    if (COMBO_STEPS[step].phone) specialsAsked++;
    if (rng() < can(step)){ okSteps++; score += comboStepPoints(chain.length); if (failStep === idx) fails = 0; idx++;
      if (idx >= chain.length){ score += comboChainBonus(chain.length); chainsDone++; chainLen = Math.min(6, chainLen + 1); chain = chainFor(chainLen, { chainsDone, rng }); idx = 0; failStep = null; fails = 0; }
    } else {
      fails = (failStep === idx ? fails : 0) + 1; failStep = idx;   // come natpf_events._comboMiss
      if (swap && fails >= COMBO_LEARN.swapAfter){ chain = [...chain]; chain[idx] = comboSwapStep(chain, idx, rng); fails = 0; }
      idx = 0;
    }
  }
  if (!okSteps) zeroStart = 1;
  return { score, chainsDone, specialsAsked, firstSpecial, zero: zeroStart };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
  const runs = +(arg('runs') || 40);
  const medals = modeById('precision').medals;
  if (arg('debug')){
    const P = PROFILES[arg('debug')], rng = mulberry32(3), e = createHeadlessEngine({ difficulty: 'casual' }); e.startNewMatch({ showStartBanner: false });
    for (const z of PRECISION_ZONES) for (let i = 0; i < 3; i++){ const L = playBall(e, z, P, rng); console.log(`zona ${z.x},${z.z} → ${L ? `${L.x.toFixed(2)},${L.z.toFixed(2)} ${L.inCourt ? 'dentro' : 'fuori'} q ${e.natpfLastRacket?.out?.q} t ${e.natpfLastRacket?.out?.t} grade ${e.natpfLastRacket?.out?.grade}` : 'non colpita'}`); }
    process.exit(0);
  }
  console.log(`Precision (${runs} partite da 10 palle per profilo, solo dritto)`);
  for (const [name, zones, med] of [['zone prima', OLD_ZONES, OLD_MEDALS], ['zone dopo', PRECISION_ZONES, medals]]){
    console.log(`\n${name} · medaglie ${med.join('/')}`);
    for (const profile of Object.keys(PROFILES)){
      const r = precisionRun({ zones, profile, runs });
      console.log(`  ${profile.padEnd(9)} totale p25/p50/p75/p90 ${r.p25}/${r.p50}/${r.p75}/${r.p90} · bronzo/argento/oro ${medalShare(r.totals, med).join('/')}% · media per zona ${r.zoneMean.join(' ')} · zone a zero ${r.zoneZero.join(' ')}%`);
    }
  }
  // Combo: probabilità che riesca il colpo chiesto, per chi gioca. Il principiante e il medio non hanno imparato colpi
  // speciali (mai riusciti); l'esperto li ha imparati tutti nell'allenamento
  const COMBO_PROFILES = {
    principiante: { base: .55, dir: .3, special: 0, learned: [] },
    medio: { base: .75, dir: .5, special: 0, learned: [] },
    esperto: { base: .9, dir: .7, special: .6, learned: ['lob', 'slice', 'drop'] },
  };
  const OLD_COMBO_MEDALS = [150, 400, 800], comboMedals = modeById('combo').medals;
  console.log(`\nCombo (90", 400 partite per profilo) · medaglie prima ${OLD_COMBO_MEDALS.join('/')}, dopo ${comboMedals.join('/')}`);
  for (const [pn, C] of Object.entries(COMBO_PROFILES)){
    const can = s => s === 'forehand' || s === 'backhand' ? C.base : s === 'cross' || s === 'line' ? C.dir : C.special;
    const before = (n, { rng }) => comboChain(n, { phone: true, rand: rng });
    const after = (n, { chainsDone, rng }) => comboChain(n, { phone: true, rand: rng, chainsDone, learned: C.learned });
    for (const [name, chainFor, swap, med] of [['prima', before, false, OLD_COMBO_MEDALS], ['dopo', after, true, comboMedals]]){
      const rs = Array.from({ length: 400 }, (_, i) => comboRun({ can, chainFor, swap, seed: i + 1 }));
      const mean = k => (rs.reduce((s, r) => s + r[k], 0)/rs.length).toFixed(1), scores = rs.map(r => r.score).sort((a, b) => a - b);
      console.log(`  ${pn.padEnd(12)} ${name.padEnd(6)} punti p25/p50/p75/p90 ${scores[100]}/${scores[200]}/${scores[300]}/${scores[360]} (media ${mean('score')}) · catene ${mean('chainsDone')} · primo passo speciale ${Math.round(100*rs.reduce((s, r) => s + r.firstSpecial, 0)/rs.length)}% · speciali chiesti a partita ${mean('specialsAsked')} · a zero ${Math.round(100*rs.reduce((s, r) => s + r.zero, 0)/rs.length)}% · bronzo/argento/oro ${medalShare(scores, med).join('/')}%`);
    }
  }
}
