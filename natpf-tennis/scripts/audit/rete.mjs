// Banco del gioco a rete (B31, tappa 3 punto 1 del rapporto docs/b16/rapporto-gameplay.md: miglioramento 6, M6, punto
// 22; misure e scelte in docs/b31/gioco-a-rete.md). Motore vero senza disegno (headless-engine.mjs), stesso ciclo di
// rally-balance.mjs: è una misura del gioco simulato con i profili di giocatore simulati, non di persone vere.
//   npm run audit:rete                       (= node --import ./test/register.mjs scripts/audit/rete.mjs)
//   npm run audit:rete -- --difficulty=casual,pro,leggenda --profiles=tennista,amatore,bambino --points=300 --nsemi=3
//        [--serie=2]      seconda serie di semi (1: 2001, 2038, …; 2: 5003, 5044, …)
//        [--tattiche=normale,tagliati]   normale: il profilo com'è; tagliati: ogni colpo dello scambio è un tagliato
//                         (stesso gesto, stesso tempo: serve a vedere che il tagliato non diventi la tattica che vince)
//        [--json] [--cols=puntiG,gameG,…]   solo queste colonne
// Il banco non cambia nessuna regola: guarda i colpi (_natpfRacketShot, _executeOpponentReturn) e i punti (_awardPoint).
// Cosa misura, per livello × profilo × tattica:
//   • punti e game vinti da chi gioca (game: primo a 4 con 2 di scarto sulla sequenza dei punti), colpi per punto;
//   • chi gioca a rete: quota dei colpi della CPU con chi gioca entro 7 m dalla rete (rete%), punti in cui chi gioca è
//     stato a rete (colpo al volo, schiacciata o posizione a rete) e quanti ne vince; volée (colpi al volo non sopra la
//     testa) e quante passano e cadono in campo; schiacciate (piano «smash» o colpo SMASH), quante cadono in campo e
//     quante la CPU rimanda in gioco; pallonetti, quanti in campo e quanti fanno punto;
//   • tagliati di chi gioca: quanti, in campo, fanno punto (il punto finisce per chi gioca prima che tocchi di nuovo la
//     palla), errori della CPU;
//   • la CPU: quota dei suoi colpi da entro 7 m dalla rete, punti in cui è stata a rete e quanti ne vince, schiacciate,
//     volée e palle corte (per game).
import { pathToFileURL } from 'node:url';
import { simulate } from './rally-balance.mjs';
import { mulberry32, gauss } from './headless-engine.mjs';
const { NatpfTennisEngine: E } = await import('../../src/game_engine.js');

const pct = (a, n, d = 1) => +(100*a/Math.max(1, n)).toFixed(d);
const per = (a, n, d = 2) => +(a/Math.max(1, n)).toFixed(d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const SERIE = { 1: n => Array.from({ length: n }, (_, i) => 2001 + i*37), 2: n => Array.from({ length: n }, (_, i) => 5003 + i*41) };
export function gamesOf(points){
  let a = 0, b = 0, gw = 0, gl = 0;
  for (const p of points){ if (p.who === 'player') a++; else b++; if ((a >= 4 || b >= 4) && Math.abs(a - b) >= 2){ a > b ? gw++ : gl++; a = b = 0; } }
  return { gw, gl };
}
const NET = 7;

/* ---------- strumenti sul motore (solo misura e, per la tattica «tagliati», il tipo di colpo) ---------- */
const P = E.prototype, LOG = { shots: [], cpu: [], points: [] };
let tactic = 'normale', trng = Math.random, cur = null, lastP = null, lastC = null;
const newPoint = () => ({ playerNet: false, cpuNet: false });
export function sliceSwing(swing){
  const it = swing.natpf.intent;
  return { ...swing, shotType: 'slice', natpf: { ...swing.natpf, shot: 'slice', intent: { ...it, shot: 'slice', rise: -.4 } } };
}
const input = P._handleUserSwingInput;
P._handleUserSwingInput = function(evt){
  if (tactic === 'tagliati' && this.phase === 'RALLY' && evt?.natpf?.intent && this.ball.lastHitter !== 'player' && evt.natpf.intent.shot !== 'lob') evt = sliceSwing(evt);
  return input.call(this, evt);
};
const racket = P._natpfRacketShot;
P._natpfRacketShot = function(e, p, opts = {}){
  const b = this.ball, bounced = b.bounceCountOnCurrentSide > 0, y = b.pos.y, plan = this.natpfPlan?.kind || null;
  const r = racket.call(this, e, p, opts);
  if (p === this.player && r?.out){
    const o = r.out, z = Math.abs(p.pos.z), smash = o.shot === 'SMASH' || plan === 'smash';
    lastP = { shot: o.shot, smash, volley: !bounced && !smash, y, z, plan, failed: !!o.failed, net: !!o.netFault, weak: !!o.weak, depth: o.depth, wide: Math.abs(o.x) > 4.115 + .03,
      cpuNet: Math.abs(this.opponent.pos.z) < NET, rally: b.rallyStrokeCount, reached: false, back: false, res: null };
    if (!cur) cur = newPoint();
    if (lastP.volley || lastP.smash || z < NET) cur.playerNet = true;
    if (lastC && lastC.res == null && !lastC.answered) lastC.answered = true;
    LOG.shots.push(lastP);
  }
  return r;
};
const exec = P._executeOpponentReturn;
P._executeOpponentReturn = function(actor = this.opponent){
  const b = this.ball, bounced = b.bounceCountOnCurrentSide > 0, y = b.pos.y, z = Math.abs(actor.pos.z), pz = Math.abs(this.player.pos.z);
  const lp = this.natpfLegend?.lastPick || null;
  this.natpfCpuShot = null;
  const r = exec.call(this, actor);
  const lp2 = this.natpfLegend?.lastPick || null, mark = this.natpfCpuShot?.kind || null;
  const kind = mark || (lp2 && lp2 !== lp && lp2.kind === 'smorzata' ? 'drop' : null) || (!bounced && z < 9 ? 'volley' : null) || 'normale';
  if (lastP && !lastP.res){ lastP.reached = true; }
  if (lastC && !lastC.res) lastC.answered = true;
  lastC = { kind, volley: !bounced, y, z, shot: b.shotType, playerNet: pz < NET, res: null, answered: false };
  if (!cur) cur = newPoint();
  if (z < NET) cur.cpuNet = true;
  if (pz < NET) cur.playerNet = true;
  LOG.cpu.push(lastC);
  return r;
};
const award = P._awardPoint;
P._awardPoint = function(who, why = ''){
  if (this.phase !== 'POINT_OVER'){
    if (lastP && !lastP.res) lastP.res = who;
    if (lastC && !lastC.res) lastC.res = who;
    // la schiacciata rimandata in gioco: la CPU l'ha colpita e il punto non è finito con quel colpo della CPU fuori
    LOG.points.push({ who, why, rally: this.ball.rallyStrokeCount, ...(cur || newPoint()) });
  }
  lastP = lastC = null; cur = null;
  return award.call(this, who, why);
};

/* ---------- una casella: livello × profilo × tattica ---------- */
export function cell({ difficulty, profile, tattica = 'normale', points = 300, seeds = SERIE[1](3) }){
  const sims = []; LOG.shots.length = LOG.cpu.length = LOG.points.length = 0;
  for (const seed of seeds){ tactic = tattica; trng = mulberry32(seed*31 + 5); lastP = lastC = cur = null; try { sims.push(simulate({ profile, difficulty, points, seed })); } finally { tactic = 'normale'; } }
  const pts = LOG.points.slice(), S = LOG.shots.slice(), C = LOG.cpu.slice(), n = sims.reduce((s, x) => s + x.points, 0), won = sims.reduce((s, x) => s + x.won, 0);
  const g = gamesOf(pts), games = Math.max(1, g.gw + g.gl), rallies = sims.flatMap(s => s.rallies);
  // esito di un colpo di chi gioca: «in campo» se non ha perso il punto prima che la CPU lo toccasse
  const inCourt = s => !(s.res === 'opponent' && !s.reached), point = s => s.res === 'player';
  const vol = S.filter(s => s.volley), sm = S.filter(s => s.smash), lob = S.filter(s => s.shot === 'LOB'), sl = S.filter(s => s.shot === 'SLICE');
  // schiacciata rimandata: la CPU l'ha colpita e la sua palla è tornata (chi gioca l'ha ritoccata o il punto l'ha vinto la CPU dopo il suo colpo)
  const smIn = sm.filter(inCourt), smBack = smIn.filter(s => s.reached && s.res !== 'player');
  const pNet = pts.filter(p => p.playerNet), cNet = pts.filter(p => p.cpuNet);
  const cpuAtNet = C.filter(c => c.z < NET), cs = k => C.filter(c => c.kind === k);
  return { difficulty, profile, tattica, punti: n, puntiG: pct(won, n), gameG: pct(g.gw, games), game: games,
    colpiPerPunto: +(rallies.reduce((s, v) => s + v, 0)/Math.max(1, rallies.length)).toFixed(2),
    // chi gioca
    reteG: pct(C.filter(c => c.playerNet).length, C.length), puntiReteG: pct(pNet.length, n), vintiReteG: pct(pNet.filter(p => p.who === 'player').length, pNet.length),
    volee: vol.length, voleePerGame: per(vol.length, games), voleeOk: pct(vol.filter(inCourt).length, vol.length), voleePunto: pct(vol.filter(point).length, vol.length),
    schiacciate: sm.length, schiacciateOk: pct(smIn.length, sm.length), schiacciateRimandate: pct(smBack.length, smIn.length), schiacciatePunto: pct(sm.filter(point).length, sm.length),
    pallonetti: lob.length, pallonettiOk: pct(lob.filter(inCourt).length, lob.length), pallonettiPunto: pct(lob.filter(point).length, lob.length),
    // fuori di lato (punto 22): volée e colpi da fondo (dopo il rimbalzo, da oltre 9 m) che cadono oltre la riga laterale
    voleeFuoriLato: pct(vol.filter(s => s.wide).length, vol.length), fondoFuoriLato: pct(S.filter(s => !s.volley && !s.smash && s.z > 9).filter(s => s.wide).length, S.filter(s => !s.volley && !s.smash && s.z > 9).length),
    tagliati: sl.length, tagliatiQuota: pct(sl.length, S.length), tagliatiOk: pct(sl.filter(inCourt).length, sl.length), tagliatiPunto: pct(sl.filter(point).length, sl.length),
    tagliatiErroreCPU: pct(sl.filter(s => s.reached && s.res === 'player').length, sl.length),
    // la CPU
    // la CPU contro chi è a rete: passanti e pallonetti che fanno punto senza che chi gioca la tocchi
    cpuControRete: C.filter(c => c.playerNet).length, cpuPassaPunto: pct(C.filter(c => c.playerNet && c.res === 'opponent' && !c.answered).length, C.filter(c => c.playerNet).length),
    cpuPallonettiRete: pct(C.filter(c => c.playerNet && c.shot === 'LOB').length, C.filter(c => c.playerNet).length),
    cpuReteQuota: pct(cpuAtNet.length, C.length), puntiReteC: pct(cNet.length, n), vintiReteC: pct(cNet.filter(p => p.who === 'opponent').length, cNet.length),
    cpuSchiacciate: cs('smash').length, cpuSchiacciatePerGame: per(cs('smash').length, games), cpuSchiacciatePunto: pct(cs('smash').filter(c => c.res === 'opponent' && !c.answered).length, cs('smash').length),
    cpuVolee: cs('volley').length, cpuVoleePerGame: per(cs('volley').length, games),
    cpuCorte: cs('drop').length, cpuCortePerGame: per(cs('drop').length, games), cpuCortePunto: pct(cs('drop').filter(c => c.res === 'opponent' && !c.answered).length, cs('drop').length),
    // volée e schiacciate di tutti e due per game
    reteColpiPerGame: per(vol.length + sm.length + cs('smash').length + cs('volley').length, games) };
}

export const COLS = [
  ['puntiG', 'punti G%'], ['gameG', 'game G%'], ['colpiPerPunto', 'colpi/p'],
  ['reteG', 'G rete%'], ['puntiReteG', 'p. G rete%'], ['vintiReteG', 'vinti%'], ['voleePerGame', 'volée/g'], ['voleeOk', 'volée ok%'], ['voleePunto', 'volée p%'], ['voleeFuoriLato', 'v.lato%'], ['fondoFuoriLato', 'f.lato%'],
  ['schiacciate', 'schiacc.'], ['schiacciateOk', 'ok%'], ['schiacciateRimandate', 'rimand.%'], ['pallonetti', 'pallon.'], ['pallonettiOk', 'ok%'], ['pallonettiPunto', 'p%'],
  ['tagliatiQuota', 'tagl.%'], ['tagliatiOk', 'ok%'], ['tagliatiPunto', 'p%'],
  ['cpuPassaPunto', 'C passa%'], ['cpuPallonettiRete', 'C pall.%'], ['cpuReteQuota', 'CPU rete%'], ['puntiReteC', 'p. C rete%'], ['vintiReteC', 'vinti%'], ['cpuSchiacciatePerGame', 'C schiacc/g'], ['cpuSchiacciatePunto', 'p%'], ['cpuVoleePerGame', 'C volée/g'], ['cpuCortePerGame', 'C corte/g'],
  ['reteColpiPerGame', 'rete/g'],
];

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1], has = k => process.argv.includes(`--${k}`);
  const difficulties = (arg('difficulty') || 'casual,pro,leggenda').split(','), profiles = (arg('profiles') || 'tennista,amatore,bambino').split(',');
  const tattiche = (arg('tattiche') || 'normale').split(','), points = +(arg('points') || 300), seeds = (SERIE[arg('serie') || 1] || SERIE[1])(+(arg('nsemi') || 3));
  const rows = [], json = has('json'), only = arg('cols')?.split(','), COLS2 = only ? COLS.filter(c => only.includes(c[0])) : COLS;
  if (!json) console.log(`semi ${seeds.join(', ')} · ${points} punti per seme\n${'livello/profilo/tattica'.padEnd(30)} ` + COLS2.map(c => c[1].padStart(Math.max(6, c[1].length))).join(' '));
  for (const difficulty of difficulties) for (const profile of profiles) for (const tattica of tattiche){
    const r = cell({ difficulty, profile, tattica, points, seeds }); rows.push(r);
    if (!json) console.log(`${`${difficulty}/${profile}/${tattica}`.padEnd(30)} ` + COLS2.map(c => String(r[c[0]]).padStart(Math.max(6, c[1].length))).join(' '));
  }
  if (json) console.log(JSON.stringify(rows, null, 1));
}
void gauss; void clamp; void trng;
