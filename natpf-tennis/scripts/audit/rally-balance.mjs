// Audit degli scambi di NATPF motore base (come tools/audit/rally-balance.mjs di NATPF Simulator): simula molti punti
// contro la CPU con profili di giocatore diversi e riporta colpi per punto, punti vinti e come finiscono i punti.
// È un banco di prova deterministico sulle regole vere del motore, non una misura di persone reali.
//   npm run audit:rally                       tutte le difficoltà e tutti i profili
//   npm run audit:rally -- --json             risultato in JSON
//   npm run audit:rally -- --points=300 --difficulty=pro
import { pathToFileURL } from 'node:url';
import { createHeadlessEngine, mulberry32, gauss } from './headless-engine.mjs';
import { skillLevel } from '../../src/natpf/natpf_skill.js';
import { strokePower } from '../../src/natpf/natpf_stroke_intent.js';
import { OUTCOME, lateSpanOf, directionSpan, assistOf, neutralX, aimForLanding } from '../../src/natpf/natpf_stroke_outcome.js';
import { cimaSimulata, contaColpo } from './b36/simulati.mjs';

// Profili: errore di tempo (s, deviazione standard), mira (quanto cerca il campo aperto e con che dispersione),
// forza del gesto (velocità del motore base 0,8…1,65) e uso dei colpi speciali.
export const PROFILES = {
  preciso:   { timingSd: .045, aimOpen: .85, aimDepth: .95, aimSd: .12, speed: 1.45, speedSd: .06, specials: .12 },
  medio:     { timingSd: .09,  aimOpen: .55, aimDepth: .8, aimSd: .3,  speed: 1.22, speedSd: .12, specials: .06 },
  impreciso: { timingSd: .16,  aimOpen: .1,  aimDepth: .6, aimSd: .55, speed: 1.02, speedSd: .16, specials: 0 },
};
// Telefono in verticale (natpf.aim = 'swing'): la direzione nasce dal tempo vero del colpo e dal polso.
//   intent: quanto spesso cerca il lato libero con tempo e polso · timingSd: errore di tempo (s) · wristSd: errore del polso
//   peak: velocità vera del telefono al picco (°/s) · rel: forza rispetto alla propria calibrazione
//   prep: quanto spesso porta indietro la racchetta prima del colpo
export const PHONE_PROFILES = {
  tennista: { swing: true, prep: .9, intent: .9, timingSd: .035, wristSd: .12, peak: 1150, peakSd: 150, rel: .8, specials: .1 },
  amatore:  { swing: true, prep: .55, intent: .5, timingSd: .075, wristSd: .3,  peak: 700,  peakSd: 160, rel: .7, specials: .04 },
  bambino:  { swing: true, prep: .1, intent: 0,  timingSd: .14,  wristSd: .45, peak: 380,  peakSd: 90,  rel: .75, specials: 0 },
  // come «amatore», ma il gesto parte dal rimbalzo, non dal punto d'impatto del motore: dopo il rimbalzo di afterBounce
  // secondi (± afterBounceSd), quando la palla arriva all'altezza comoda. Dato della partita del 23/10 (video): chi gioca
  // faceva il gesto 0,2–0,3 s dopo il rimbalzo. Sulle palle al volo vale il tempo del motore
  umano:    { swing: true, prep: .55, intent: .5, timingSd: .075, wristSd: .3,  peak: 700,  peakSd: 160, rel: .7, specials: .04, afterBounce: .25, afterBounceSd: .05 },
  // B36.0 (docs/b36/misure-b36-0.md), in fondo perché i banchi delle impronte prendono i primi tre profili:
  //   medioTel     «medio con il telefono»: il «medio» dei banchi (qui sopra solo con mouse e tastiera, cieco alla regola
  //                del telefono) con il telefono, come b19/due-umani.PROF.medio;
  //   giraTanto    «gira tanto»: quando mira gira la cima di giro ± giroSd gradi (30 ± 12°, oltre la mira piena di 17°),
  //   giraTanto40  e 40 ± 12° (criterio 5 del piano B36: calamite con «gira tanto»)
  medioTel:    { swing: true, prep: .55, intent: .55, timingSd: .09,  wristSd: .3, peak: 790, peakSd: 155, rel: .7, specials: .06 },
  giraTanto:   { swing: true, prep: .55, intent: .8,  timingSd: .075, wristSd: .3, peak: 700, peakSd: 160, rel: .7, specials: .04, giro: 30, giroSd: 12 },
  giraTanto40: { swing: true, prep: .55, intent: .8,  timingSd: .075, wristSd: .3, peak: 700, peakSd: 160, rel: .7, specials: .04, giro: 40, giroSd: 12 },
};
Object.assign(PROFILES, PHONE_PROFILES);
const RALLY_CAP = 60;
const IDEAL_R = -.45;           // m: palla poco davanti al giocatore, al centro della finestra «perfetto» del motore base           // oltre questi colpi lo scambio si considera «infinito» e si chiude d'ufficio
const DT = 1/120;

// Colpo del telefono (modello «racchetta virtuale», natpf_stroke_intent.js e natpf_stroke_outcome.js): chi sa giocare
// sceglie il lato libero con il tempo (dentro la finestra della direzione del livello) e con il piatto, con il suo
// errore; gli altri colpiscono quando capita. L'intenzione arriva al motore come quella dei telefoni con la forma.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function phoneIntent(e, P, rng){
  const lv = skillLevel(e.matchConfig.difficulty), span = directionSpan(lv), open = e.opponent.pos.x >= 0 ? -1 : 1, xMax = assistOf(lv).xMax;
  const contact = e.ball.targetLanding.x >= e.player.pos.x ? 1 : -1;
  let tau = 0, face = 0, aimed = false;
  if (rng() < P.intent){
    aimed = true;
    // punto voluto sul lato libero (dal 70% della mira piena alla mira piena), come mira attorno al punto neutro, che
    // segue la palla (natpf_stroke_outcome.js). Dal 23/10 il tempo copre da una riga all'altra: si mira soprattutto con
    // il tempo (in anticipo l'incrociato, in ritardo il lungolinea, dentro la finestra del livello) e il piatto
    // corregge il resto. Prima (regola vecchia) metà con il tempo e il lungolinea quasi tutto con il piatto
    const aim = aimForLanding(open*(.7 + rng()*.3)*xMax, neutralX(e.ball.targetLanding.x, xMax), xMax);
    const u = clamp(-aim*.85/(contact*OUTCOME.timingAim), -1, 1);
    tau = u*(u >= 0 ? span : lateSpanOf(e.ball.vel.z, skillLevel(e.matchConfig.difficulty)))*.9;
    face = clamp((aim + contact*.9*u*OUTCOME.timingAim + contact*OUTCOME.natural*(1 - Math.abs(.9*u)))/OUTCOME.faceAim, -1, 1);
  }
  const peak = Math.max(150, P.peak + gauss(rng)*P.peakSd), power = strokePower(peak);
  const special = rng() < (P.specials || 0);
  const shot = special ? (e.opponent.pos.z > -9 ? 'lob' : 'slice') : 'topspin';
  // B36.0: piatto letto (lo stesso sorteggio di sempre) e, dagli stessi numeri, scarto della cima e mira piena (b36/simulati.mjs)
  const cima = cimaSimulata(P, face, aimed, gauss(rng));
  const intent = { shot, power: +power.toFixed(3), depth: +(power*.91).toFixed(3), rise: shot === 'lob' ? .8 : shot === 'slice' ? -.4 : .3, face: cima.face };
  // error > 0 = in ritardo (come negli altri profili): per anticipare di tau si colpisce tau secondi prima dello sweet spot
  return { error: -tau + gauss(rng)*P.timingSd + (-.1 - IDEAL_R)/18, sent: false, after: P.afterBounce ? P.afterBounce - tau + gauss(rng)*(P.afterBounceSd || 0) : null,
    swing: { source: 'audit', side: contact > 0 ? 'forehand' : 'backhand', shotType: shot, speed: .8 + power*.85, dirX: 0,
      natpf: { aim: 'swing', shot, intent, power, peak: Math.round(peak), latency: 0, hand: 'right', aimDev: cima.aimDev, aimFull: cima.aimFull,
        prepCapable: true, prep: rng() < (P.prep || 0) ? { lead: .35, amount: .8 } : null } } };
}

// onStep(e): facoltativo, dopo ogni passo della fisica (misure di altri banchi: scripts/audit/rhythm.mjs)
// setup(e): facoltativo, prima della partita (B18: formato in fiera, scripts/audit/formato-fiera.mjs)
// serve(e, rng): facoltativo, il servizio di chi gioca lo sceglie il banco (B18.2: scripts/audit/servizio.mjs). Restituisce
//   { tau, swing }: il gesto «swing» parte quando al punto più alto del lancio mancano tau secondi (negativo = dopo)
// cap: colpi oltre i quali lo scambio si chiude d'ufficio («scambio infinito»; di base RALLY_CAP; B42: scripts/audit/b42/scambi-lunghi.mjs usa 150)
export function simulate({ profile = 'medio', difficulty = 'casual', points = 200, seed = 7, maxSeconds = 4000, onStep = null, setup = null, serve = null, cap = RALLY_CAP } = {}){
  const P = typeof profile === 'string' ? PROFILES[profile] : profile;
  const rng = mulberry32(seed), engineRng = mulberry32(seed*7919 + 13);
  const realRandom = Math.random; Math.random = engineRng;
  const out = { profile: typeof profile === 'string' ? profile : 'custom', difficulty, points: 0, won: 0, rallies: [], reasons: {}, capped: 0, whiffs: 0, grades: {}, landings: [], cpu: [],
    // racchetta virtuale: colpi di chi gioca per tipo, al volo, falliti; piani d'intercetto per tipo
    racket: { shots: {}, volleys: 0, failed: 0, plans: {} },
    // movimento di chi gioca: dove colpisce e dove va subito dopo il colpo (recupero), per ogni colpo della racchetta
    moves: [],
    // campo aperto: ogni colpo di chi gioca con dove cade, dov'era la CPU quando è partito e com'è finito (vincente,
    // errore della CPU, ripresa, errore proprio); se la CPU l'ha presa, dove l'ha colpita e quanto ha corso di lato
    shots: [],
    // B36.0: colpi della racchetta di chi gioca e quanti con la regola nuova della direzione (b36/regola-nuova.mjs; fuori da
    // racket, che entra nelle impronte)
    direzione: { colpi: 0, nuova: 0 } };
  let pending = null;
  try {
    const e = createHeadlessEngine({ difficulty });
    const award = e._awardPoint.bind(e);
    e._awardPoint = (who, why = '') => {
      const hits = e.ball.rallyStrokeCount;
      if (pending){
        if (pending.res == null) pending.res = who === 'player' ? 'vincente' : 'errore proprio';
        else if (pending.res === 'ripresa' && who === 'player') pending.res = 'errore CPU';
        pending = null;
      }
      out.points++; if (who === 'player') out.won++;
      out.rallies.push(hits);
      const last = e.natpfSkill?.lastShot, detail = process.env.AUDIT_DETAIL && who !== 'player' && e.ball.lastHitter === 'player' && last ? ` [${last.shot} ${last.grade}${e.ball.isPowerShot ? ' power' : ''}]` : '';
      const key = `${who === 'player' ? 'vinto' : 'perso'}: ${why || 'punto'}${detail}`;
      out.reasons[key] = (out.reasons[key] || 0) + 1;
      award(who, why);
    };
    const popup = e.hud.showTimingPopup;
    e.hud = new Proxy({}, { get: (t, k) => k === 'showTimingPopup' ? ({ grade = '' } = {}) => { const g = String(grade).split(' ')[0]; out.grades[g] = (out.grades[g] || 0) + 1; if (/WHIFF/.test(grade)) out.whiffs++; } : () => {} });
    void popup;
    setup?.(e);
    e.startNewMatch({ showStartBanner: false });
    let intent = null, serveAt = null, servePlan = null, lastSeenShot = null, lastSeenCpu = null, lastSeenRacket = null, lastSeenPlan = null, bounceAt = null;
    for (let t = 0; t < maxSeconds && out.points < points; t += DT){
      if (e.phase === 'SERVE_STANCE'){ intent = null; bounceAt = null; if (e.score.server === 'player' && e.phaseTimer > .6){ e._handleUserTossInput({}); if (serve){ servePlan = serve(e, rng); serveAt = null; } else serveAt = e.elapsedTime + .55 + gauss(rng)*P.timingSd*.6; } }
      if (e.phase === 'SERVE_TOSS' && e.score.server === 'player' && servePlan && e.phaseTimer >= .16 && e.ball.vel.y/9.15 <= servePlan.tau){
        const sp = servePlan; servePlan = null; e._handleUserSwingInput(sp.swing);
      }
      if (e.phase === 'SERVE_TOSS' && e.score.server === 'player' && serveAt != null && e.elapsedTime >= serveAt){
        serveAt = null; e._handleUserSwingInput({ source: 'audit', speed: P.speed + gauss(rng)*P.speedSd, dirX: gauss(rng)*.3 });
      }
      if (e.phase === 'RALLY' && e.ball.inPlay){
        if (e.ball.lastHitter === 'player'){ intent = null; bounceAt = null; }
        else if (e.ball.vel.z > .5 && e.ball.pos.z > -6){
          if (!intent && P.swing) intent = phoneIntent(e, P, rng);
          if (!intent) intent = { error: gauss(rng)*P.timingSd, sent: false };
          const r = e.ball.pos.z - e.player.pos.z, tti = (IDEAL_R - r)/Math.max(.5, e.ball.vel.z - e.player.vel.z);   // tempo all'impatto ideale (il giocatore corre)
          // profilo «umano»: dal rimbalzo nella propria metà (se la palla rimbalza prima del colpo)
          if (intent.after != null && bounceAt == null && e.ball.bounceCountOnCurrentSide === 1 && e.ball.pos.z > 0) bounceAt = e.elapsedTime;
          const human = intent.after != null && e.natpfPlan?.kind === 'ground';
          if (!intent.sent && intent.swing && (human ? bounceAt != null && e.elapsedTime >= bounceAt + intent.after : tti <= -intent.error)){
            intent.sent = true;
            e._handleUserSwingInput(intent.swing);
          } else if (!intent.sent && tti <= -intent.error){
            intent.sent = true;
            const openSide = e.opponent.pos.x >= 0 ? -1 : 1;
            const aim = Math.max(-1, Math.min(1, (rng() < P.aimOpen ? openSide*P.aimDepth : (rng() - .5)*1.2) + gauss(rng)*P.aimSd));
            const special = rng() < P.specials;
            const shotType = special ? (e.opponent.pos.z > -9 ? 'lob' : 'drop') : 'topspin';
            e._handleUserSwingInput({ source: 'audit', shotType: shotType === 'drop' ? 'slice' : shotType, natpfDrop: shotType === 'drop', speed: shotType === 'drop' ? .85 : P.speed + gauss(rng)*P.speedSd, dirX: aim });
          }
        }
        if (e.ball.rallyStrokeCount >= cap){ out.capped++; e._awardPoint('opponent', 'scambio infinito'); }
      }
      e.step(DT);
      onStep?.(e);
      const lc = e.natpfSkill?.lastCpu;
      if (lc && lc !== lastSeenCpu){ lastSeenCpu = lc; out.cpu.push(lc); }
      const ls = e.natpfSkill?.lastShot;
      if (ls && ls !== lastSeenShot){ lastSeenShot = ls; out.landings.push({ x: +ls.landingX.toFixed(2), z: +e.ball.targetLanding.z.toFixed(2), grade: ls.grade, power: ls.power }); }
      const lr = e.natpfLastRacket, K = out.racket;
      // la CPU l'ha presa: dove (distanza dalla rete) e quanto ha corso di lato da quando il colpo è partito
      if (pending && pending.res == null && e.ball.lastHitter === 'opponent'){ pending.res = 'ripresa'; pending.hitZ = +Math.abs(e.opponent.pos.z).toFixed(2); pending.run = +Math.abs(e.opponent.pos.x - pending.cpuX).toFixed(2); }
      if (pending && pending.res === 'ripresa' && e.ball.lastHitter === 'player') pending = null;
      if (lr && lr !== lastSeenRacket && lr.who === 'player'){ lastSeenRacket = lr; const k = lr.out?.shot || '?'; K.shots[k] = (K.shots[k] || 0) + 1; if (lr.volley) K.volleys++; if (lr.out?.failed) K.failed++; contaColpo(lr.out, out.direzione);
        out.shots.push(pending = { x: +e.ball.targetLanding.x.toFixed(2), z: +e.ball.targetLanding.z.toFixed(2), cpuX: +e.opponent.pos.x.toFixed(2), cpuZ: +e.opponent.pos.z.toFixed(2), res: null });
        out.moves.push({ contactX: +e.player.pos.x.toFixed(2), contactZ: +e.player.pos.z.toFixed(2), targetX: +e.player.targetPos.x.toFixed(2), targetZ: +e.player.targetPos.z.toFixed(2), volley: !!lr.volley, landingX: +e.ball.targetLanding.x.toFixed(2), landingZ: +e.ball.targetLanding.z.toFixed(2) }); }
      const pl = e.natpfPlan;
      if (pl && pl !== lastSeenPlan){ lastSeenPlan = pl; K.plans[pl.kind] = (K.plans[pl.kind] || 0) + 1; }
    }
  } finally { Math.random = realRandom; }
  const n = out.rallies.length || 1, sorted = [...out.rallies].sort((a, b) => a - b);
  out.avgHits = +(out.rallies.reduce((s, v) => s + v, 0)/n).toFixed(2);
  out.medianHits = sorted[Math.floor(sorted.length/2)] ?? 0;
  out.maxHits = sorted.at(-1) ?? 0;
  out.winPct = +(100*out.won/Math.max(1, out.points)).toFixed(1);
  return out;
}

// Campo aperto e movimento (dai colpi di chi gioca di più simulazioni): occupazione della metà campo avversaria in
// celle di 1 m (larghezza del doppio, da rete a 1 m oltre la riga di fondo), quota delle tre celle più colpite,
// profondità e lato in percentili; quante volte dopo il colpo chi gioca va verso la rete (bersaglio entro 7 m) e da
// dove colpiva.
export function courtStats(runs){
  const L = runs.flatMap(r => r.landings), M = runs.flatMap(r => r.moves || []);
  const cell = l => `${Math.max(-6, Math.min(5, Math.floor(l.x)))},${Math.max(0, Math.min(12, Math.floor(-l.z)))}`;
  const cells = {}; for (const l of L) cells[cell(l)] = (cells[cell(l)] || 0) + 1;
  const counts = Object.values(cells).sort((a, b) => b - a), n = Math.max(1, L.length);
  const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(f*s.length))].toFixed(2) : null; };
  const depth = L.map(l => -l.z), side = L.map(l => l.x);
  const net = M.filter(m => m.targetZ < 7), fromBack = net.filter(m => m.contactZ > 10);
  return { shots: L.length, cells: counts.length, top3Pct: +(100*counts.slice(0, 3).reduce((a, b) => a + b, 0)/n).toFixed(1),
    depth: { p10: q(depth, .1), p50: q(depth, .5), p90: q(depth, .9) }, side: { p10: q(side, .1), p50: q(side, .5), p90: q(side, .9) },
    moves: M.length, toNetPct: +(100*net.length/Math.max(1, M.length)).toFixed(1), toNetFromBackPct: +(100*fromBack.length/Math.max(1, M.length)).toFixed(1),
    volleyPct: +(100*M.filter(m => m.volley).length/Math.max(1, M.length)).toFixed(1), contactZ: { p10: q(M.map(m => m.contactZ), .1), p50: q(M.map(m => m.contactZ), .5) } };
}

// Campo aperto (richiesta del 23/10, C5): per distanza laterale tra dove cade la palla e dov'era la CPU quando è partita,
// e per profondità, quante palle sono vincenti, errori della CPU, riprese, errori propri. Dice se spostare l'avversario,
// spingerlo in fondo o farlo venire avanti conta.
export function openCourtStats(runs){
  const S = runs.flatMap(r => r.shots || []).filter(s => s.res && s.res !== 'errore proprio' && Math.abs(s.x) <= 4.2 && -s.z <= 12.2);
  const lat = s => { const d = Math.abs(s.x - s.cpuX); return d < 2 ? '<2' : d < 4 ? '2-4' : d < 6 ? '4-6' : '>6'; };
  const dep = s => (-s.z < 6.4 ? 'corta' : -s.z < 9.5 ? 'media' : 'fonda');
  const rows = {};
  for (const s of S) for (const k of [`lato ${lat(s)} m`, `prof. ${dep(s)}`]){
    const r = rows[k] || (rows[k] = { n: 0, vincente: 0, 'errore CPU': 0, ripresa: 0, hitZ: [], run: [] }); r.n++; r[s.res]++;
    if (s.hitZ != null){ r.hitZ.push(s.hitZ); r.run.push(s.run); }
  }
  const pct = (a, n) => +(100*a/Math.max(1, n)).toFixed(1), med = a => (a.length ? +[...a].sort((x, y) => x - y)[a.length >> 1].toFixed(1) : null);
  // cpuColpisceM: mediana della distanza dalla rete a cui la CPU colpisce la palla (11,9 = sulla riga di fondo);
  // corsaM: mediana della corsa laterale della CPU dal colpo di chi gioca al suo colpo
  return Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, { n: r.n, vincenti: pct(r.vincente, r.n), erroriCPU: pct(r['errore CPU'], r.n), riprese: pct(r.ripresa, r.n), cpuColpisceM: med(r.hitZ), corsaM: med(r.run) }]));
}

export function auditAll({ points = 200, seeds = [7, 11, 23], difficulties = ['casual', 'pro'], profiles = Object.keys(PROFILES) } = {}){
  const rows = [];
  for (const difficulty of difficulties) for (const profile of profiles){
    const runs = seeds.map(seed => simulate({ profile, difficulty, points, seed }));
    const all = runs.flatMap(r => r.rallies), won = runs.reduce((s, r) => s + r.won, 0), pts = runs.reduce((s, r) => s + r.points, 0);
    const reasons = {}; for (const r of runs) for (const [k, v] of Object.entries(r.reasons)) reasons[k] = (reasons[k] || 0) + v;
    const sorted = [...all].sort((a, b) => a - b);
    rows.push({ difficulty, profile, points: pts, avgHits: +(all.reduce((s, v) => s + v, 0)/Math.max(1, all.length)).toFixed(2), medianHits: sorted[Math.floor(sorted.length/2)] ?? 0,
      maxHits: sorted.at(-1) ?? 0, capped: runs.reduce((s, r) => s + r.capped, 0), winPct: +(100*won/Math.max(1, pts)).toFixed(1), reasons });
  }
  return rows;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href && process.argv.includes('--cpu')){
  // npm run audit:rally -- --cpu [--points=150]: vincenti, errori e riprese della CPU per dove cade la palla, e dove la
  // CPU la colpisce (distanza dalla rete) e quanto corre di lato quando la prende
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
  for (const difficulty of (arg('difficulty') ? [arg('difficulty')] : ['casual', 'pro'])) for (const profile of (arg('profiles') ? arg('profiles').split(',') : ['tennista', 'amatore', 'medio'])){
    const st = openCourtStats([7, 11, 23].map(seed => simulate({ profile, difficulty, points: +(arg('points') || 150), seed })));
    console.log(`\n${difficulty}/${profile}`);
    for (const [k, r] of Object.entries(st).sort()) console.log(`  ${k.padEnd(14)} n ${String(r.n).padStart(5)}  vincenti ${String(r.vincenti).padStart(5)}%  errori CPU ${String(r.erroriCPU).padStart(5)}%  riprese ${String(r.riprese).padStart(5)}%  CPU colpisce a ${String(r.cpuColpisceM ?? '–').padStart(4)} m  corsa ${String(r.corsaM ?? '–').padStart(4)} m`);
  }
} else if (import.meta.url === pathToFileURL(process.argv[1]).href && process.argv.includes('--campo')){
  // npm run audit:rally -- --campo [--points=150]: campo aperto e movimento con i profili del telefono
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
  console.log('difficoltà  profilo     colpi  celle  3 celle  profondità p10/p50/p90  lato p10/p50/p90  verso la rete (dal fondo)  volée  impatto z p10/p50');
  for (const difficulty of ['casual', 'pro']) for (const profile of Object.keys(PHONE_PROFILES)){
    const c = courtStats([7, 11, 23].map(seed => simulate({ profile, difficulty, points: +(arg('points') || 150), seed })));
    console.log(`${difficulty.padEnd(11)} ${profile.padEnd(10)} ${String(c.shots).padStart(6)} ${String(c.cells).padStart(6)} ${String(c.top3Pct).padStart(7)}%  ${[c.depth.p10, c.depth.p50, c.depth.p90].join('/').padStart(22)}  ${[c.side.p10, c.side.p50, c.side.p90].join('/').padStart(16)}  ${String(c.toNetPct).padStart(12)}% (${c.toNetFromBackPct}%)  ${String(c.volleyPct).padStart(5)}%  ${c.contactZ.p10}/${c.contactZ.p50}`);
  }
} else if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
  const rows = auditAll({ points: +(arg('points') || 200), difficulties: arg('difficulty') ? [arg('difficulty')] : undefined, profiles: arg('profiles') ? arg('profiles').split(',') : undefined });
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 2));
  else {
    console.log('difficoltà  profilo     punti  colpi/punto  mediana  max  infiniti  punti vinti');
    for (const r of rows) console.log(`${r.difficulty.padEnd(11)} ${r.profile.padEnd(10)} ${String(r.points).padStart(6)} ${String(r.avgHits).padStart(12)} ${String(r.medianHits).padStart(8)} ${String(r.maxHits).padStart(4)} ${String(r.capped).padStart(9)} ${String(r.winPct).padStart(11)}%`);
    for (const r of rows) console.log(`\n${r.difficulty}/${r.profile}: ` + Object.entries(r.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
  }
}
