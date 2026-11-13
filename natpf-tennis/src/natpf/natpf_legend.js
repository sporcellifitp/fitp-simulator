// NATPF «Leggenda»: la CPU più forte del gioco, con le stesse regole di chi gioca.
// Stessa fisica (shotArc → lancio del motore → fixAir) e stesse regole d'esecuzione del giocatore a livello Esperto
// (playerErrorPlan, landingScatter, playerDepthZ, reachQuality): la qualità del colpo della CPU viene dalla sua
// situazione (tempo del colpo, più difficile con la palla veloce, allungo, corsa). Niente probabilità d'errore «a dado»
// né errori che crescono da soli con la lunghezza dello scambio: sbaglia quando rischia o quando è in difficoltà.
//   • scelta del colpo per utilità tra candidati (incrociato profondo e stretto corto, lungolinea, campo aperto, corpo,
//     contropiede, tagliato, parabola alta, smorzata, pallonetto, chiusura): probabilità di metterla dentro ×
//     probabilità che l'avversario sbagli (stima iniziale, abitudine agli schemi visti, errori osservati), con penalità
//     per zone e schemi ripetuti e una scelta morbida (softmax), così non è prevedibile; contro chi sbaglia spesso
//     gioca sicura, negli scambi lunghi contro chi sbaglia poco rischia per chiudere (niente «muro»);
//   • la mira compensa l'aria: lo spostamento laterale vero è circa 0,865 volte quello voluto (fixAir corregge solo la
//     profondità), quindi la CPU mira più larga di tanto e la palla cade dove vuole;
//   • corsa con accelerazione e frenata limitate, recupero sulla bisettrice degli angoli possibili dell'avversario,
//     affondo (passo esplosivo nelle ultime decine di centesimi) quando la palla passerebbe lontana dal corpo; nel
//     disegno racchetta, braccio e corpo si allungano verso la palla lontana e lo swing tocca la palla all'impatto;
//   • lascia passare le palle che vede fuori, con un errore di lettura; servizio vario.
// B16 (08/11, l'utente: «Leggenda più dura»): primo passo più esplosivo, regge di più negli scambi lunghi, chiude senza
// strafare, controlla meglio i colpi forti (gioca con margine) e cerca l'angolo stretto; criteri in docs/NATPF_LEGGENDA.md.
// Split-step, reazione e lettura della traiettoria stanno in natpf_skill.planCpuRun (livello con cpuLegend).
// Attiva solo con il livello «leggenda» contro la CPU: casual, pro, 1v1 e le sfide non passano mai da qui.
// Il generatore casuale si può iniettare (engine.natpfLegendRng); l'audit scripts/audit/legend.mjs misura i criteri.
import * as NS from './natpf_skill.js';
import { rallyPressure } from './natpf_stroke_outcome.js';
import { NET_PLAY, smashIncoming, netOff, netMoveOf } from './natpf_net_play.js';
import { hotLegend } from './natpf_hot_rally.js'; // B42: scambio caldo, pressione e chiusura dal 20° colpo

const C = NS.COURT;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const Phi = x => .5*(1 + Math.tanh(.7978845608*(x + .044715*x*x*x)));     // normale cumulata (approssimazione)

// Valori tarati con scripts/audit/legend.mjs (torneo senza grafica, 8 semi × 300 punti × 6 profili di giocatore):
// risultati e scelte in docs/NATPF_LEGGENDA.md.
export const LEGEND = Object.freeze({
  timingSd: .025,           // s: errore di tempo del colpo della CPU (cresce con la velocità della palla in arrivo)
  tau: .014,                // temperatura della scelta (softmax sull'utilità): più bassa = più deterministica
  repeat: .008,             // penalità per la stessa zona di uno degli ultimi 2 colpi
  repeatKind: .01,          // penalità per lo stesso schema di uno degli ultimi 3 colpi
  maxShare: .25, capPenalty: .35,  // nessuno schema oltre ~25% degli ultimi 10 colpi
  habit: 3,                 // abitudine dell'avversario agli schemi frequenti (ultimi 10 colpi): sorprendono meno
  priorErr: .07,            // errore dell'avversario atteso prima di vederlo giocare
  paceW: .025,              // quanto la velocità della palla fa sbagliare l'avversario (× e^(paceW·(km/h − 95)))
  learn: true,              // impara dagli errori che l'avversario fa davvero (per tipo di colpo)
  // … e dai vincenti con cui risponde (per tipo di colpo): un colpo che l'avversario punisce vale meno (lo scambio che
  // continua vale × (1 − punizione stimata), Beta con punPrior di peso punW). 29/10 pomeriggio: con la schiacciata
  // dall'altezza della spalla e le chiusure sopra la rete i giocatori precisi punivano le palle alte e lente («alta»),
  // e la CPU continuava a giocarle (contro «preciso» dal 37,7 al 29,6% dei game)
  punPrior: .08, punW: 3,
  kLat: .865,               // spostamento laterale vero / voluto per l'aria (misurato sul motore)
  // m/s²: accelerazione e frenata. B16 (08/11, «Leggenda più dura»): primo passo più esplosivo (prima 14 / 22): con i
  // colpi forti più tesi del B15 la CPU arrivava tardi sugli angoli. Resta sotto chi gioca, che non ha inerzia (8,8 m/s
  // subito) e la velocità massima non cambia (8 m/s, affondo 8,6).
  // B18 (D6 del rapporto B16): 20 / 28 → 22 / 30. Prima chi gioca era quasi sempre «Stanco!» (il recupero tra i punti non
  // scattava mai: 10% di velocità in meno per quasi tutta la partita) e una parte della forza della Leggenda veniva da lì.
  // Con il recupero la forza torna dalla CPU, come vuole la decisione (a) del B16: contro «preciso» (24 semi × 300 punti)
  // chi gioca vince il 43,9% dei punti con la base, 44,6% con il recupero, 42,5% con questo primo passo
  accel: 22, decel: 30,
  recoverZ: -11.35,         // profondità di attesa
  letGoMargin: .08, letGoSd: .12,  // m: lascia passare la palla se la vede fuori di almeno tanto (± errore di lettura)
  // affondo: se all'impatto la palla passerebbe a più di lungeFrom dal corpo, nelle ultime lungeTime secondi un passo
  // esplosivo (accelerazione lungeAccel, al massimo lungeSpeed, sotto la velocità del giocatore) porta il corpo a
  // lungeKeep dalla palla: la racchetta la tocca davvero, senza scatti
  lungeFrom: 1.2, lungeKeep: 1.05, lungeTime: .32, lungeSpeed: 8.6, lungeAccel: 30,
  // allungo visivo (solo disegno): la palla che passa oltre reachFrom m dal corpo, nelle ultime reachLead s prima
  // dell'impatto e per reachHold s dopo, porta racchetta e braccio verso di lei (al massimo reachMax m) e inclina il
  // corpo dalla stessa parte (fino a reachLean rad)
  reachFrom: .9, reachMax: .45, reachLean: .24, reachLead: .22, reachHold: .18,
  // valore di uno scambio che continua: ½, per (errori osservati / attesi dell'avversario)^vLearn tra vMin e vMax
  // (contro chi sbaglia molto la CPU gioca sicura, contro chi non sbaglia rischia prima)...
  vLearn: 1, vMin: .2, vMax: 1.4,
  // ...e negli scambi lunghi cala di closeGain a colpo dopo closeFrom colpi, fino a closeFloor: la CPU rischia di più, i
  // colpi da fondo diventano più spinti e larghi (fino a +closeAggr di forza e +closeWiden m) e c'è un colpo di chiusura
  // piatto e profondo nell'angolo lontano dall'avversario; contro chi sbaglia poco (osservati/attesi ≤ closeG), oltre
  // closeHard colpi gioca solo per chiudere
  // B16: chiusura misurata (prima +0,45 di forza, +0,6 m e chiusura a 0,85–0,95): il colpo di chiusura sbagliava il 17–18 %
  // delle volte e contro «preciso» un terzo degli errori della CPU veniva dagli scambi oltre i 20 colpi
  // B18.2 passo 3 (D2): la chiusura parte più tardi (dal 24° colpo, prima dal 20°; solo chiusura dal 28°, prima dal 24°):
  // senza la regola nascosta di chi gioca la CPU deve reggere lo scambio più a lungo prima di rischiare
  closeFrom: 24, closeGain: .2, closeFloor: 0, closeAggr: .15, closeWiden: .25, closePower: [.72, .85], closeX: [3.2, 3.75],
  closeHard: 28, closeG: 1.6,
  // B16: la pressione degli scambi lunghi sulla CPU parte dal 20° colpo (prima dal 10°, come chi gioca a Leggenda): la
  // Leggenda regge il ritmo più a lungo. Pesa solo negli scambi lunghi, quindi contro chi gioca bene
  // B18.2 passo 3 (D2): tolta la regola nascosta di chi gioca (natpf_stroke_outcome.ASSIST.leggenda), la forza viene dalla
  // CPU: regge il ritmo ancora più a lungo (dal 26° colpo; prima dal 20°)
  pressureFrom: 26,
  // B16: controllo dei colpi forti. Nell'esecuzione la parte dell'errore che cresce con la forza (playerErrorChance,
  // k.power) vale powerErr volte quella di Esperto; la scelta del colpo stima il rischio con le regole di Esperto, cioè
  // gioca con margine. Con il rischio vero nella scelta, contro chi sbaglia molto la CPU giocava quasi solo colpi forti e
  // profondi (entropia delle zone 2,05–2,24 bit, criterio ≥ 2,3)
  // B18.2 passo 3 (D2): .65 → .5. Senza la regola nascosta di chi gioca gli scambi durano di più e la CPU perdeva più
  // punti con i suoi colpi forti fuori: ora li controlla meglio (misure: docs/b18/t2-3-leggenda-e-palla-corta.md)
  powerErr: .5,
  // B16: preferenza per l'angolo stretto incrociato (utilità + angle). Non è piccola: con tau 0,014 raddoppia il peso di
  // quel colpo (dal 7–10 al 15–17 % dei colpi contro «medio» e «amatore»). Non serve ai criteri (con angle 0 passano tutti:
  // incrociati al 31,8 % contro «medio», limite ≥ 30): dà margine a quel criterio e apre il campo come un giocatore forte
  angle: .01,
  // vincente: chi gioca si muove da solo verso la palla (natpf_impact.js) e arriva quasi ovunque; la CPU stima se ci
  // arriva in tempo: margine = volo + reachAfter s dopo il rimbalzo (la palla torna all'altezza comoda in discesa)
  // − (reazione + strada / velocità). Margine negativo:
  // probabilmente non ci arriva (vincente); piccolo: ci arriva in corsa e risponde peggio. reachSd: scala del margine (s)
  reachAfter: .55, reachReact: .12, reachSide: .72, reachSd: .08, reachUse: 1,
  // B31: portata della racchetta oltre reachSide per la volée di chi è a rete (m); tagliato basso di chi gioca preso da
  // oltre sliceFrom m dalla rete: qualità × (1 − sliceQ)
  netReach: .9, sliceQ: .06, sliceFrom: 10,
  // B18.2 (D11 del rapporto B16): il servizio perfetto, forte e sulla riga di chi gioca toglie fino a serveQ alla qualità
  // della risposta (come il colpo super, natpfSuper.legendQ); la lettura in ritardo è in natpf_skill.SERVE_WEIGHT.leggenda
  serveQ: .15,
});
// Solo per audit ed esperimenti (scripts/audit/legend.mjs): valori che sostituiscono LEGEND in tutte le partite.
// Oltre alle chiavi di LEGEND: forceKind (sempre quel colpo), noLetGo (gioca anche le palle fuori), legacyMove (corsa
// del motore, velocità istantanea), vmax (velocità massima diversa), riskTrue (la scelta stima il rischio con il
// controllo vero della CPU, powerErr, invece che con le regole di Esperto).
export const legendTuning = {};
const cfg = e => (e?.natpfLegendCfg || Object.keys(legendTuning).length ? { ...LEGEND, ...legendTuning, ...(e?.natpfLegendCfg || {}) } : LEGEND);

export const isLegend = e => !!e && String(e.matchConfig?.difficulty || '') === 'leggenda' && !e.isMultiplayer;
export const legendRng = e => e?.natpfLegendRng || Math.random;
export function legendState(e){
  return e.natpfLegend || (e.natpfLegend = { last: [], kinds: {}, n: 0, err: 0, exp: 0, pending: null, lastPick: null, letGoKey: null, letGoVal: false, lunging: false, stats: { letGo: 0, lunges: 0, picks: {} } });
}
// nuova partita: il modello dell'avversario riparte da zero (chi gioca è cambiato)
export function resetLegend(e){ if (e) e.natpfLegend = null; }
const zone = (x, z) => `${Math.abs(x) < 1.37 ? 'C' : x > 0 ? 'R' : 'L'}${z < 6.4 ? 'S' : z < 9.4 ? 'M' : 'D'}`;
// Regole d'esecuzione della CPU: quelle di Esperto, con l'errore da forza × powerErr (B16)
const EXEC = new Map();
function execLevel(L){
  const lv = NS.skillLevel('leggenda'), k = finite(L.powerErr, 1);
  if (k === 1 || !lv.playerErr) return lv;
  if (!EXEC.has(k)) EXEC.set(k, Object.freeze({ ...lv, playerErr: Object.freeze({ ...lv.playerErr, power: lv.playerErr.power*k }) }));
  return EXEC.get(k);
}

/* ---------- modello dell'avversario: quanto spesso sbaglia, per tipo di palla (impara durante la partita) ---------- */
function humanErr(m, L, c, ctx, learn){
  // pesi a priori dalle misure del motore: velocità, profondità, spostamento laterale, altezza sulla rete
  let f = Math.exp(L.paceW*(c.kmh - 95))*Math.exp(.16*(c.z - 9.6))*Math.exp(.09*(Math.abs(c.x - ctx.bx) - 2))*Math.exp(-.35*(c.clear - .55));
  if (c.kind === 'smorzata') f *= 1.5;
  if (c.kind === 'pallonetto') f = Math.max(f, 4);
  // varietà: palla diversa dalla precedente
  const last = m.last[m.last.length - 1];
  if (last && last.zone !== zone(c.x, c.z)) f *= 1.06;
  if (last && last.shot !== c.shot) f *= 1.04;
  // abitudine: un colpo visto spesso negli ultimi 10 sorprende meno (l'avversario si adatta)
  const seen = m.last.slice(-10).filter(l => l.kind === c.kind).length/10;
  f *= Math.exp(-L.habit*seen);
  let p = L.priorErr*f;
  // apprendimento: errori osservati / attesi, in generale e per tipo di colpo (Beta con 2 errori di peso)
  if (learn && L.learn){ const g = (m.err + 2)/(m.exp + 2); p *= g; const k = m.kinds[c.kind]; if (k) p *= (k.err + 2)/(k.exp*g + 2); }
  return clamp(p, .002, .6);
}
// erred: l'avversario ha sbagliato; punished: ha risposto con un vincente (la CPU non ha più colpito)
function noteHumanResult(m, erred, punished = false){
  const p = m.pending; if (!p) return;
  m.pending = null; m.n++; m.exp += p.prior; if (erred) m.err++;
  const k = m.kinds[p.kind] || (m.kinds[p.kind] = { err: 0, exp: 0, n: 0, pun: 0 });
  k.n++; k.exp += p.prior; if (erred) k.err++; if (punished) k.pun = (k.pun || 0) + 1;
}
// probabilità stimata che l'avversario risponda a questo tipo di colpo con un vincente
const punishOf = (m, L, kind) => { const k = m.kinds[kind]; return L.learn ? ((k?.pun || 0) + L.punPrior*L.punW)/((k?.n || 0) + L.punW) : L.punPrior; };

/* ---------- chi gioca arriva sulla palla? ---------- */
// probabilità che non ci arrivi (vincente) e quanto arriva in corsa (0…1), dalla posizione e dalla corsa attuali
function humanReach(L, c, ctx, h){
  const flight = finite(c.flight, .9), vx = (c.x - ctx.bx)/Math.max(.3, flight);
  // B31 (punto 22): chi gioca è a rete. Prima la stima guardava sempre il punto dopo il rimbalzo (2 m oltre), come se chi
  // è a rete dovesse tornare in fondo: i passanti sembravano facili da prendere e le palle profonde vincenti, e la
  // Leggenda non passava quasi mai chi saliva. Ora, tranne il pallonetto (che lo scavalca), conta la volée: dove passa la
  // palla quando arriva all'altezza di chi gioca e quanto si muove a rete. È una stima prudente della Leggenda
  // (netMoveOf: reazione più lunga, passo corto), non il movimento vero: chi gioca a rete si muove come in tutto il campo
  // (revisione finale; con la stima uguale al movimento vero la Leggenda sceglie peggio i passanti, «tennista» 77,7%)
  if (c.shot !== 'LOB' && Math.abs(h.pos.z) < NET_PLAY.netMove.zone && !netOff()){
    const M = netMoveOf(h.pos.z), hz = Math.abs(h.pos.z), path = Math.abs(ctx.bz) + Math.max(c.z, hz), f = clamp((Math.abs(ctx.bz) + hz)/Math.max(1, path), .2, 1);
    const tc = flight*f, xc = ctx.bx + (c.x - ctx.bx)*f*(c.z < hz ? 1.15 : 1);
    const need = L.reachReact + M.react + Math.max(0, Math.abs(xc - h.pos.x) - L.reachSide - L.netReach)/Math.max(3, finite(h.maxSpeed, 9)*M.speed);
    const margin = tc - need;
    return { pWin: 1/(1 + Math.exp(margin/L.reachSd)), stretch: clamp(1 - margin/.35), margin };
  }
  const xc = c.x + vx*L.reachAfter, zc = c.z + 2;
  const hx = h.pos.x + finite(h.vel?.x)*.1, hz = h.pos.z + finite(h.vel?.z)*.1;
  const need = L.reachReact + Math.hypot(Math.max(0, Math.abs(xc - hx) - L.reachSide), zc - hz)/Math.max(4, finite(h.maxSpeed, 9));
  const margin = flight + L.reachAfter - need;
  return { pWin: 1/(1 + Math.exp(margin/L.reachSd)), stretch: clamp(1 - margin/.35), margin };
}

/* ---------- rischio d'errore della CPU con le regole del giocatore ---------- */
function cpuRisk(c, q, lv){
  const p = c.power, x = Math.abs(c.x);
  const pe = NS.playerErrorChance({ quality: q, power: p, aimX: c.x, level: lv });
  const sdX = lv.scatter*(.22 + .78*(1 - q))*(.55 + .45*p) + lv.lineRisk*(1 - .5*q)*p*p*clamp(x/C.SINGLES_X - .55, 0, .45);
  const outX = 1 - Phi((C.OUT_X - x)/Math.max(.02, sdX));
  let outZ = 0;
  if (c.z > 6){ const sd = lv.depthRisk*(.2 + .8*(1 - q))*(.4 + .6*p); outZ = 1 - Phi((C.OUT_Z - c.z - .56*sd)/Math.max(.02, .65*sd)); }
  return clamp(pe + outX + outZ, 0, .95);
}
// velocità (km/h), altezza sulla rete e tempo di volo stimati dal tipo di colpo (stessa shotArc del motore)
function shape(c, ctx){
  if (c.shot === 'LOB') return { kmh: 45, clear: 4, flight: 2.1 };
  if (c.shot === 'DROP') return { kmh: 40, clear: .5, flight: Math.max(1.32, (Math.abs(ctx.bz) + c.z)/10) };
  const A = NS.shotArc({ shot: c.shot, power: c.power, fromY: ctx.by, fromZ: ctx.bz, toZ: c.z, flight: c.shot === 'SLICE' ? .96 : .86, rng: () => .5 });
  const d = Math.hypot(c.x - ctx.bx, c.z - ctx.bz);
  return { kmh: 3.6*d/A.flight*1.18, clear: A.clear - .914, flight: A.flight };
}

/* ---------- scelta del colpo ---------- */
export function legendDecide(e, actor, rng = legendRng(e)){
  // rischio stimato con le regole di Esperto (margine), salvo riskTrue (solo audit)
  const L = cfg(e), lv = L.riskTrue ? execLevel(L) : NS.skillLevel('leggenda'), b = e.ball, h = e.player, m = legendState(e);
  const ctx = { bx: b.pos.x, by: clamp(b.pos.y, .82, 1.68), bz: b.pos.z };
  // lato da cui colpisce la CPU: l'incrociato va dalla parte opposta, il lungolinea dalla stessa
  const s = Math.abs(ctx.bx) > .6 ? Math.sign(ctx.bx) : (h.pos.x > 0 ? -1 : 1);
  // qualità d'esecuzione: le stesse funzioni del giocatore (tempo del colpo, allungo, corsa); il tempo si sbaglia di
  // più quando la palla arriva veloce
  const lat = Math.abs(b.pos.x - actor.pos.x), running = actor.vel.length()/Math.max(1, actor.maxSpeed);
  const pace = clamp((b.vel.length()*3.6 - 55)/55);
  const tq = NS.swingQuality(NS.gauss(rng)*L.timingSd*(1 + .8*pace), lv);
  // pressione degli scambi lunghi come quella di chi gioca (natpf_stroke_outcome.rallyPressure), ma dal 20° colpo (B16); il colpo super
  // potente di chi gioca (natpf_stroke_outcome.superShot) mette in difficoltà anche la Leggenda (b.natpfSuper.legendQ)
  // B18.2 (D11): in risposta al servizio la qualità scende con la minaccia del servizio ricevuto (natpf_skill.serveInfo):
  // fino a −serveQ per il servizio perfetto, forte e sulla riga; un servizio normale non la tocca
  const sv = NS.serveInPlay(e);
  // B31: il tagliato basso di chi gioca preso da dietro (oltre sliceFrom dalla rete) toglie sliceQ alla qualità
  const slice = String(b.shotType).toUpperCase() === 'SLICE' && Math.abs(ctx.bz) > L.sliceFrom && !netOff() ? 1 - L.sliceQ : 1;
  // … e la schiacciata riuscita di chi gioca la mette in difficoltà (NS.LEGEND_SMASH.q; la reazione in ritardo in planCpuRun)
  const smashIn = e.natpfSkill?.lastShot?.shot === 'SMASH' && !netOff() ? NS.LEGEND_SMASH.q : 1;
  // B42: scambio caldo (natpf_hot_rally.hotLegend): la pressione e la chiusura degli scambi lunghi partono prima (dal 20°
  // colpo invece che dal 26° e dal 24°), e la qualità cala un poco a ogni colpo caldo. Spento o prima del 20° colpo:
  // i valori di LEGEND, identici
  const HL = hotLegend(finite(b.rallyStrokeCount) + 1, !!e.natpfHot, L);
  const q = clamp(tq*NS.reachQuality(lat, running)*rallyPressure(b.rallyStrokeCount, HL.pressureFrom)*finite(b.natpfSuper?.legendQ, 1)*(sv ? 1 - finite(L.serveQ)*sv.threat : 1)*slice*smashIn*HL.q, .3, 1);
  const R = (a, z) => a + rng()*(z - a), hx = h.pos.x, hz = h.pos.z, hv = h.vel.x;
  const away = -(Math.sign(hx) || -s);                    // angolo lontano dall'avversario
  const cands = [
    { kind: 'incrociato', x: -s*R(2.5, 3.5), z: R(9.4, 10.9), shot: 'TOPSPIN', power: R(.55, .8) },
    { kind: 'incrociatoStretto', x: -s*R(3.3, 3.85), z: R(5.2, 6.6), shot: 'TOPSPIN', power: R(.45, .6) },
    { kind: 'lungolinea', x: s*R(2.4, 3.4), z: R(9.4, 10.9), shot: rng() < .5 ? 'FLAT' : 'TOPSPIN', power: R(.55, .8) },
    { kind: 'campoAperto', x: away*R(2.4, 3.4), z: R(8.8, 10.8), shot: 'TOPSPIN', power: R(.55, .8) },
    { kind: 'corpo', x: clamp(hx + R(-.3, .3), -3, 3), z: R(10, 11), shot: 'FLAT', power: R(.8, .95) },
    { kind: 'tagliato', x: R(-3, 3), z: R(8.8, 10.6), shot: 'SLICE', power: R(.4, .55) },
    { kind: 'alta', x: R(-2.2, 2.2), z: R(9.6, 10.9), shot: 'MOON', power: R(.25, .4) },
  ];
  // contropiede: l'avversario corre da una parte, la palla va dove era
  if (Math.abs(hv) > 1.5) cands.push({ kind: 'contropiede', x: clamp(hx - Math.sign(hv)*R(.8, 1.8), -3.5, 3.5), z: R(9, 10.6), shot: 'TOPSPIN', power: R(.6, .8) });
  // smorzata: avversario in fondo e CPU in equilibrio, non da dietro la riga
  if (hz > 11 && ctx.bz > -10.6 && q > .75) cands.push({ kind: 'smorzata', x: R(-2.2, 2.2), z: R(2.4, 3.6), shot: 'DROP', power: .2 });
  // pallonetto: avversario a rete
  if (hz < 7.5) cands.push({ kind: 'pallonetto', x: R(-2.4, 2.4), z: R(9.6, 11), shot: 'LOB', power: .3 });
  // B31 (punto 22): passanti contro chi è a rete, basso e stretto incrociato o teso lungolinea, lontano da lui
  if (hz < NET_PLAY.netMove.zone && !netOff()){
    const far = -(Math.sign(hx) || s);
    cands.push({ kind: 'passante', x: far*R(3.2, 3.85), z: R(6, 8.2), shot: 'TOPSPIN', power: R(.6, .8) });
    cands.push({ kind: 'passanteLungo', x: far*R(3.1, 3.7), z: R(9, 10.6), shot: 'FLAT', power: R(.7, .88) });
  }
  // errori dell'avversario osservati / attesi in questa partita (1 all'inizio)
  const g = (m.err + 2)/(m.exp + 2);
  // chiusura degli scambi lunghi: colpo in più per chiudere e, contro chi sbaglia poco, oltre closeHard colpi solo colpi
  // per chiudere (vincente o errore, niente «muro»); chi sbaglia spesso prima o poi sbaglia da solo
  const rally = finite(b.rallyStrokeCount), closing = rally >= HL.closeFrom;
  if (closing) cands.push({ kind: 'chiusura', x: away*R(L.closeX[0], L.closeX[1]), z: R(9.8, 11.1), shot: 'FLAT', power: R(L.closePower[0], L.closePower[1]) });
  if (L.closeHard && rally >= HL.closeHard && g <= L.closeG){ const hard = cands.filter(c => ['chiusura', 'lungolinea', 'incrociato'].includes(c.kind)); if (hard.length) cands.splice(0, cands.length, ...hard); }
  const decay = Math.max(L.closeFloor, 1 - L.closeGain*Math.max(0, rally - HL.closeFrom));
  const V = .5*decay*(L.vLearn ? clamp(g**L.vLearn, L.vMin, L.vMax) : 1);
  const aggr = clamp(1 - decay);
  if (aggr > 0) for (const c of cands) if (['TOPSPIN', 'FLAT'].includes(c.shot) && c.kind !== 'corpo' && c.kind !== 'contropiede'){
    c.power = Math.min(1, c.power + aggr*L.closeAggr); c.x = Math.sign(c.x)*Math.min(3.9, Math.abs(c.x) + aggr*L.closeWiden);
  }
  const recent = m.last.slice(-2).map(l => l.zone), last3 = m.last.slice(-3), last10 = m.last.slice(-10);
  let best = null;
  for (const c of cands){
    Object.assign(c, shape(c, ctx));
    c.pErr = cpuRisk(c, q, lv);
    c.prior = humanErr(m, L, c, ctx, false); c.eH = humanErr(m, L, c, ctx, true);
    // negli scambi lunghi la CPU prova a forzare l'errore anche contro chi finora non ha sbagliato: conta almeno
    // l'errore che quel colpo provoca di solito (stima iniziale), non solo quello visto in questa partita
    const eC = closing ? Math.max(c.eH, c.prior) : c.eH;
    // chi gioca arriva sulla palla? (vincente, o risposta in corsa che vale come un errore provocato in parte)
    const hr = L.reachUse ? humanReach(L, c, ctx, h) : { pWin: 0, stretch: 0 };
    c.pWin = hr.pWin;
    const eR = eC + (1 - eC)*.25*hr.stretch;
    // utilità: palla dentro × (vincente + errore provocato + valore di uno scambio che continua), meno le ripetizioni
    c.pPun = punishOf(m, L, c.kind);
    c.U = (1 - c.pErr)*(hr.pWin + (1 - hr.pWin)*(eR + (1 - eR)*V*(1 - c.pPun))) - L.repeat*recent.filter(z => z === zone(c.x, c.z)).length
      + (c.kind === 'incrociatoStretto' ? L.angle : 0)
      - L.repeatKind*last3.filter(l => l.kind === c.kind).length - L.capPenalty*Math.max(0, last10.filter(l => l.kind === c.kind).length/10 - L.maxShare);
    if (!best || c.U > best.U) best = c;
  }
  // softmax: varia senza buttare via il punto
  let pick = best;
  if (L.forceKind) pick = cands.find(c => c.kind === L.forceKind) || best;
  else {
    const w = cands.map(c => Math.exp((c.U - best.U)/L.tau)), tot = w.reduce((a, v) => a + v, 0);
    let r = rng()*tot; for (let i = 0; i < cands.length; i++){ if ((r -= w[i]) <= 0){ pick = cands[i]; break; } }
  }
  return { pick, q, ctx, cands };
}

// Risposta della CPU: bersaglio, tipo di colpo, tempo di volo e traiettoria per il lancio del motore.
// Restituisce { kind, err, x, z, shot, flight, arc, net } (x già corretto per l'aria).
export function legendReturn(e, actor, rng = legendRng(e)){
  // esecuzione con il controllo dei colpi forti della Leggenda (powerErr, B16)
  const L = cfg(e), lv = execLevel(L), m = legendState(e);
  // il colpo precedente della CPU è tornato indietro: per il modello dell'avversario non era un errore
  noteHumanResult(m, false);
  m.lunging = false;
  const { pick: c, q, ctx } = legendDecide(e, actor, rng);
  // esecuzione con le regole del giocatore: errore (rete/lungo/largo) o dispersione, poi mira corretta per l'aria
  let x = c.x, z = c.z, net = false;
  const plan = c.shot === 'DROP' ? { kind: 'ok' } : NS.playerErrorPlan({ quality: q, power: c.power, aimX: c.x, level: lv, rng });
  if (plan.kind === 'net'){ net = true; z = 3.2 + rng()*2.4; }
  else if (plan.kind === 'long') z = -plan.z;
  else if (plan.kind === 'wide') x = plan.x;
  else if (c.shot !== 'DROP' && c.shot !== 'LOB'){
    x = NS.landingScatter(c.x, { quality: q, power: c.power, level: lv, rng });
    z = -NS.playerDepthZ(-c.z, { quality: q, power: c.power, level: lv, rng });
  }
  const xAim = clamp(ctx.bx + (x - ctx.bx)/L.kLat, -5.4, 5.4);
  m.last.push({ zone: zone(x, z), shot: c.shot, kind: c.kind }); if (m.last.length > 12) m.last.shift();
  m.pending = net || plan.kind !== 'ok' ? null : { kind: c.kind, prior: c.prior };
  m.stats.picks[c.kind] = (m.stats.picks[c.kind] || 0) + 1;
  m.lastPick = { kind: c.kind, err: plan.kind, q: +q.toFixed(3), pErr: +c.pErr.toFixed(3), eH: +c.eH.toFixed(3), shot: c.shot, x: +x.toFixed(2), z: +z.toFixed(2) };
  // allungo visivo: resta verso la palla per un attimo dopo l'impatto (legendReachPose)
  const gap = e.ball.pos.x - actor.pos.x, rs = actor.natpfReach || (actor.natpfReach = { amt: 0, hold: null });
  rs.hold = { t: finite(e.elapsedTime), x: Math.sign(gap)*clamp(Math.abs(gap) - L.reachFrom, 0, L.reachMax) };
  const out = { kind: c.kind, err: plan.kind, x: xAim, z, net };
  if (net) Object.assign(out, { shot: 'TOPSPIN', flight: .78, arc: null });
  else if (c.shot === 'LOB') Object.assign(out, { shot: 'LOB', flight: NS.LOB_FLIGHT + rng()*.2, arc: null });
  else if (c.shot === 'DROP') Object.assign(out, { shot: 'SLICE', flight: Math.max(1.32, (Math.abs(ctx.bz) + z)/10), arc: null });
  else Object.assign(out, { shot: c.shot === 'MOON' ? 'TOPSPIN' : c.shot, flight: c.shot === 'SLICE' ? .96 : .86, arc: { shot: c.shot, power: c.power } });
  return out;
}

/* ---------- recupero sulla bisettrice degli angoli possibili dell'avversario ---------- */
//   g, c: bersaglio (x già corretto per l'aria) e profondità del colpo appena giocato
export function legendRecover(e, actor, g, c){
  if (actor !== e.opponent || !isLegend(e)) return;
  const L = cfg(e), bx = e.ball.pos.x, landX = bx + (finite(g) - bx)*L.kLat;
  // da dove colpirà l'avversario: poco oltre il rimbalzo
  const hx = clamp(landX*1.05, -5, 5), hz = Math.min(13.4, Math.abs(finite(c, 10)) + 2.1), zR = L.recoverZ + NS.dropForward(e);   // (B18.2 passo 3: più avanti se chi gioca fa spesso la palla corta)
  const u = tx => { const dx = tx - hx, dz = -C.BASELINE_Z - hz, n = Math.hypot(dx, dz); return [dx/n, dz/n]; };
  const [ax, az] = u(-C.SINGLES_X), [bx2, bz2] = u(C.SINGLES_X), dx = ax + bx2, dz = az + bz2;
  actor.targetPos.set(clamp(hx + dx/dz*(zR - hz), -2.2, 2.2), 0, zR);
}

/* ---------- corsa con accelerazione e frenata limitate, affondo ---------- */
// Al posto del passo del motore (velocità istantanea) per la CPU Leggenda; restituisce true se ha mosso lei.
export function legendStep(e, a, dt){
  if (a !== e.opponent || !isLegend(e) || !(dt > 0)) return false;
  const L = cfg(e), b = e.ball, m = legendState(e);
  if (L.vmax) a.maxSpeed = L.vmax;
  if (L.legacyMove) return false;
  let tx = a.targetPos.x, tz = a.targetPos.z, vmax = a.maxSpeed, acc = L.accel, lunge = false;
  // affondo: palla in arrivo che all'impatto (la CPU colpisce quando la palla è a 1,32 m) passerebbe lontana dal corpo.
  // Mai durante il tempo di reazione (split-step, planCpuRun): con le volée di chi gioca la palla arriva in meno di
  // lungeTime e l'affondo partiva subito, cioè la CPU reagiva in 25 ms
  const plan = e.natpfSkill?.cpuPlan, reacting = !!plan?.legend && finite(e.elapsedTime) < finite(plan.readAt);
  // (B31: niente affondo sulla schiacciata riuscita di chi gioca, natpf_net_play.smashIncoming)
  if (!reacting && b.inPlay && b.lastHitter !== 'opponent' && b.vel.z < -1 && !smashIncoming(e)){
    const t = (b.pos.z - a.pos.z - 1.32)/(-b.vel.z), reach = NS.cpuReach(e, 1.5);
    if (t > 0 && t < L.lungeTime){
      const px = b.pos.x + b.vel.x*t, gap = px - a.pos.x;
      if (Math.abs(gap) > L.lungeFrom && Math.abs(gap) < reach + .35){
        tx = px - Math.sign(gap)*L.lungeKeep; vmax = Math.max(vmax, L.lungeSpeed); acc = L.lungeAccel; lunge = true;
      }
    }
  }
  if (lunge && !m.lunging) m.stats.lunges++;
  m.lunging = lunge;
  const dx = tx - a.pos.x, dz = tz - a.pos.z, d = Math.hypot(dx, dz);
  // velocità voluta: piena lontano dal bersaglio, poi quella che permette di fermarsi frenando
  const vDes = d > .05 ? Math.min(vmax, Math.sqrt(2*L.decel*Math.max(0, d - .05))) : 0;
  const ux = d > 1e-6 ? dx/d : 0, uz = d > 1e-6 ? dz/d : 0, wx = ux*vDes, wz = uz*vDes;
  let ax = wx - a.vel.x, az = wz - a.vel.z; const am = Math.hypot(ax, az);
  const lim = (Math.hypot(wx, wz) < a.vel.length() ? L.decel : acc)*dt;
  if (am > lim){ ax *= lim/am; az *= lim/am; }
  a.vel.set(a.vel.x + ax, 0, a.vel.z + az);
  a.pos.x += a.vel.x*dt; a.pos.z += a.vel.z*dt; a.stridePhase += a.vel.length()*dt*4.4;
  return true;
}

/* ---------- allungo visivo: racchetta, braccio e corpo verso la palla lontana ---------- */
// Solo disegno (il motore senza grafica non ha racchetta né modello): da chiamare a ogni fotogramma dopo il calcolo
// della racchetta e prima dell'animazione del corpo, che fa seguire la racchetta alla mano (il braccio IK si stende
// come un giocattolo morbido). Prima un impatto a 1,4–1,85 m mostrava la CPU dritta, con la racchetta vicino alla
// spalla, e la palla che ripartiva a 0,6–0,9 m dal piatto.
export function legendReachPose(e, a, dt){
  const s = a?.natpfReach;
  if (!isLegend(e) || a !== e.opponent){
    // livello cambiato a metà allungo: il corpo torna dritto (casual, pro e 1v1 non impostano mai natpfReach)
    if (s){ a.model && (a.model.rotation.z = 0); a.natpfReach = null; }
    return;
  }
  const L = cfg(e), b = e.ball, now = finite(e.elapsedTime), st = s || (a.natpfReach = { amt: 0, hold: null });
  let want = 0;
  const hold = st.hold && now - st.hold.t >= 0 && now - st.hold.t < L.reachHold;
  if (hold) want = st.hold.x;
  else if (b?.inPlay && e.phase === 'RALLY' && b.lastHitter !== 'opponent' && b.vel.z < -1){
    // palla in arrivo: dove passerà quando la CPU colpisce (a 1,32 m davanti); il corpo, che frena arrivando, conta per metà
    const t = Math.max(0, (b.pos.z - a.pos.z - 1.32)/(-b.vel.z)), px = b.pos.x + b.vel.x*t, gap = px - (a.pos.x + .5*a.vel.x*t);
    if (t > 0 && t < L.reachLead) want = Math.sign(gap)*clamp(Math.abs(gap) - L.reachFrom, 0, L.reachMax);
    // lato del colpo: la racchetta si prepara dalla parte in cui passa la palla rispetto al corpo, come decide il motore
    // all'impatto (palla a x maggiore = rovescio). L'anticipazione del motore guarda la metà campo della palla: con la
    // CPU decentrata la racchetta si preparava dal lato sbagliato e lo swing passava lontano dalla palla. Carica 0:
    // cambia solo il lato (preparazione natpfPrep di racket_kinematics), la carica resta quella del motore.
    const side = px - a.pos.x;
    if (Math.abs(side) > .15) (a.userData || (a.userData = {})).natpfPrep = { side: side > 0 ? 'backhand' : 'forehand', amount: 0, until: (globalThis.performance?.now?.() ?? Date.now()) + 120 };
  }
  // verso la palla in fretta, indietro con calma (subito, se all'impatto la palla era vicina al corpo)
  st.amt += (want - st.amt)*(1 - Math.exp(-Math.max(0, finite(dt))/(hold || Math.abs(want) > Math.abs(st.amt) ? .05 : .12)));
  if (!want && Math.abs(st.amt) < 1e-3) st.amt = 0;
  const local = a.sideSign > 0 ? -1 : 1;                   // la radice di chi sta nella metà vicina è girata di 180°
  if (a.racketPivot) a.racketPivot.position.x += st.amt*local;
  if (a.model) a.model.rotation.z = -Math.sign(st.amt)*local*L.reachLean*Math.min(1, Math.abs(st.amt)/L.reachMax);
}

// Swing della CPU all'impatto: lo swing parte all'impatto e arriva alla posa del colpo ~0,12 s dopo (come a tutti i
// livelli). Con l'allungo, invece, l'animazione parte da poco prima dell'impatto (come per chi gioca,
// NS.swingFromContact): la racchetta allungata è sulla palla nell'istante del colpo. Con la palla vicina al corpo resta
// lo swing intero, che attraversa la palla.
export function legendSwingAtContact(e, a){
  if (isLegend(e) && a?.natpfReach?.hold?.x && a.racketKinematics) NS.swingFromContact(a.racketKinematics);
}

/* ---------- lasciare passare la palla che esce ---------- */
// rimbalzo previsto con la stessa fisica del motore (attrito dell'aria, gravità con effetto, effetto laterale)
export function predictLanding(b){
  let x = b.pos.x, y = b.pos.y, z = b.pos.z, vx = b.vel.x, vy = b.vel.y, vz = b.vel.z; const dt = 1/120;
  const sx = finite(b.spin?.x), sy = finite(b.spin?.y);
  for (let i = 0; i < 400 && !(y <= .075 && vy < 0); i++){
    const d = Math.max(0, 1 - .012*Math.hypot(vx, vy, vz)*dt); vx *= d; vy *= d; vz *= d;
    vy -= (9.15 + sx*.14)*dt; vx += sy*.12*dt; x += vx*dt; y += vy*dt; z += vz*dt;
  }
  return { x, z };
}
// true: la CPU non colpisce (la palla, se esce davvero, dà il punto alla CPU). La decisione vale per tutta la palla.
export function legendLetGo(e, rng = legendRng(e)){
  if (!isLegend(e) || e.ball.bounceCountOnCurrentSide !== 0) return false;
  const L = cfg(e), m = legendState(e), S = e.score || {};
  if (L.noLetGo) return false;
  const key = `${S.playerGames}-${S.opponentGames}-${S.playerPoints}-${S.opponentPoints}-${e.ball.rallyStrokeCount}`;
  if (m.letGoKey === key) return m.letGoVal;
  m.letGoKey = key; m.letGoVal = false;
  const P = predictLanding(e.ball);
  const outBy = Math.max(Math.abs(P.x) - C.OUT_X, Math.abs(P.z) - C.OUT_Z);
  if (outBy + NS.gauss(rng)*L.letGoSd > L.letGoMargin){ m.stats.letGo++; m.letGoVal = true; }
  return m.letGoVal;
}

/* ---------- servizio: direzione e velocità variate ---------- */
export function legendServe(e, rng = legendRng(e)){
  const r = rng(), dirX = r < .36 ? -1 : r < .72 ? 1 : (rng() - .5)*.6;    // da un angolo all'altro, più qualche palla al corpo
  return { timing: 'PERFECT', dirX, speed: 1.05 + rng()*.4 };
}

/* ---------- fine del punto: il modello dell'avversario impara ---------- */
//   who: chi vince il punto ('player' | 'opponent')
export function legendPointEnd(e, who){
  if (!isLegend(e) || !e.natpfLegend?.pending) return;
  // con un colpo della CPU ancora in sospeso il punto finisce sulla risposta dell'avversario: se lo vince lui è un vincente
  noteHumanResult(e.natpfLegend, who === 'opponent', who === 'player');
}
