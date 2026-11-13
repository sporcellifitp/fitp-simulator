// Banco del servizio (B18.2, tappa 2 passo 1; difetto 11 / D11 di docs/b16/rapporto-gameplay.md): quanto pesa il servizio
// di chi gioca contro la CPU, per livello e per tipo di servizio, e quante volte la CPU è «in corsa» quando parte.
// Motore vero senza disegno (headless-engine.mjs), stesso ciclo di rally-balance.mjs: è una misura del gioco simulato,
// non di persone vere.
//   npm run audit:serve                    (= node --import ./test/register.mjs scripts/audit/servizio.mjs)
//                                           banco: chi gioca batte ogni punto, un tipo di servizio alla volta
//   npm run audit:serve -- --naturale      (gli altri argomenti allo stesso modo, dopo «--»)
//        [--points=400] [--seeds=7,11,23] [--difficulty=casual,pro,leggenda] [--tipi=tutorial,perfettoStretto] [--profile=amatore]
//        [--fermi]      i quattro personaggi fermi a ogni servizio (com'è il gioco dal B18.2; serve a misurare il «prima» senza il difetto)
//        [--naturale]   partite normali (servizio del profilo, un battitore per game): ace, punti diretti e CPU in corsa per livello × profilo
//        [--naturale --servizio=insegnato,tardi,piano]   partite normali con il servizio del TELEFONO «con la forma» (quello
//                       del prodotto) al posto del kick lento dei profili: per ogni modello di servizio anche punti vinti al
//                       servizio e in risposta, game e game al servizio di chi gioca. [--profiles=bambino,impreciso]
//        [--nsemi=25]   tanti semi (1001, 1038, …) al posto di --seeds
//        [--prova=casual.base=.135,casual.lateBase=.6]   valori di prova per natpf_skill.SERVE_WEIGHT (serveTuning)
//        [--json]
// ATTENZIONE (revisione del B18.2): i profili simulati di rally-balance battono un kick lento senza la forma del telefono
// (133–146 km/h). Nel gioco di prima quel kick riceveva pochi ace «regalati» dallo scatto sbagliato della CPU (0,4–2%),
// il servizio del telefono molti (6–9% a Casual e Pro). Le tabelle dei game di audit:legend e audit:rally non vedono
// quindi quanto pesa il servizio del telefono: per quello si usa «--naturale --servizio=…».
// Tipi di servizio (gesto del telefono con la forma, come lo manda natpf_stroke_intent): salita e piano del servizio
// insegnato nel tutorial (presa nel palmo: salita −0,08, |piano| 0,5), forza 0,5 = il proprio colpo tipico.
//   tutorial          forza 0,5, a tempo (al punto più alto del lancio)
//   piattoForte       forza 0,9, a tempo, direzione del servizio insegnato
//   perfettoStretto   forza 0,9, a tempo, sulla riga del quadrato (metà esterni, metà alla «T»)
//   ritardo           forza 0,5, colpito 0,5 s dopo il punto più alto («In ritardo»)
//   forteRitardo      forza 0,9, colpito 0,5 s dopo il punto più alto
//   (solo con --tipi) perfettoEsterno, perfettoT, massimoEsterno (forza 1), pianoStretto (forza 0,5 sulla riga)
// Esiti: «ace» = la CPU non tocca la palla; «risposta sbagliata» = la CPU la tocca e la manda in rete o fuori;
// «punto diretto» = la somma; «in corsa» = CPU con più di 0,25 m/s quando parte il servizio (soglia dell'animazione
// della corsa, player_body_animation.js).
import { pathToFileURL } from 'node:url';
import { simulate } from './rally-balance.mjs';
import { gauss } from './headless-engine.mjs';

const pct = (a, n) => +(100*a/Math.max(1, n)).toFixed(1);
export const SERVE_TYPES = {
  tutorial: { power: .5, tau: 0 },
  piattoForte: { power: .9, tau: 0 },
  perfettoStretto: { power: .9, tau: 0, tight: true },
  ritardo: { power: .5, tau: -.5 },
  forteRitardo: { power: .9, tau: -.5 },
  // dettaglio (non nel giro di base: --tipi=…): il perfetto forte solo esterno o solo alla «T», e il servizio al massimo
  perfettoEsterno: { power: .9, tau: 0, tight: 'esterno' },
  perfettoT: { power: .9, tau: 0, tight: 'T' },
  massimoEsterno: { power: 1, tau: 0, tight: 'esterno' },
  pianoStretto: { power: .5, tau: 0, tight: true },
};
// Modelli del servizio dal telefono per le partite normali (--naturale --servizio=…). Sono IPOTESI, non dati di persone:
// forza media e deviazione (0,5 = il proprio colpo tipico), tempo medio e deviazione (s; negativo = dopo la cima del
// lancio), deviazione del piatto, quota di servizi cercati sulla riga.
//   insegnato   come nel tutorial, a tempo (157 km/h)
//   tardi       un principiante: colpisce in media 0,3 s dopo la cima (q medio 0,8), forza un poco sotto
//   piano       gesto piano e un po' in ritardo (142 km/h)
//   forte       forza 0,8 a tempo, direzione del servizio insegnato
//   forteLinee  forza 0,88 a tempo, 7 servizi su 10 cercati sulla riga (esterno o «T»)
export const PHONE_SERVES = {
  insegnato:  { p: .5,  pSd: .08, tau: 0,    tauSd: .10, faceSd: .2,  tight: 0 },
  tardi:      { p: .45, pSd: .12, tau: -.3,  tauSd: .18, faceSd: .4,  tight: 0 },
  piano:      { p: .3,  pSd: .08, tau: -.15, tauSd: .2,  faceSd: .4,  tight: 0 },
  forte:      { p: .8,  pSd: .1,  tau: 0,    tauSd: .08, faceSd: .3,  tight: 0 },
  forteLinee: { p: .88, pSd: .06, tau: 0,    tauSd: .05, faceSd: .15, tight: .7 },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function phoneServeOf(model, e, rng){
  const M = PHONE_SERVES[model], box = e.score.deuceSide ? -1 : 1, power = clamp(M.p + gauss(rng)*M.pSd, .1, 1);
  let plane = .5 + gauss(rng)*.08, face = gauss(rng)*M.faceSd;
  if (rng() < M.tight){ const side = rng() < .5 ? box : -box; plane = -side*.55; face = side*1 + gauss(rng)*M.faceSd; }
  const intent = { shot: 'topspin', power, depth: power, rise: -.08, plane, face: clamp(face, -1, 1) };
  return { tau: M.tau + gauss(rng)*M.tauSd, swing: { source: 'audit', side: 'overhead', shotType: 'topspin', speed: .8 + power*.85, dirX: 0,
    natpf: { aim: 'swing', shot: 'topspin', intent, power, latency: 0, hand: 'right' } } };
}
// «casual.base=.17,casual.lateBase=.6» → { casual: { base: .17, lateBase: .6 } } (valori di prova per natpf_skill.serveTuning).
// Un valore che non è un numero o una voce senza livello è un errore: una prova con un valore non letto misurerebbe il
// gioco di sempre senza dirlo
export function trialValues(text){
  const out = {};
  for (const kv of String(text || '').split(',').filter(Boolean)){
    const [k, v] = kv.split('='), [lv, name] = k.split('.'), n = Number(v);
    if (!lv || !name || v === undefined || v === '' || !Number.isFinite(n)) throw new Error(`--prova: «${kv}» non è livello.nome=numero`);
    (out[lv] ||= {})[name] = n;
  }
  return out;
}
const BASE_TYPES = ['tutorial', 'piattoForte', 'perfettoStretto', 'ritardo', 'forteRitardo'];
export const RUNNING = .25;

// gesto del servizio per il banco: { tau, swing } (rally-balance.simulate, opzione serve)
export function serveOf(type, e, rng){
  const T = SERVE_TYPES[type], box = e.score.deuceSide ? -1 : 1;             // lato del quadrato (segno della x del centro)
  let plane = .5, face = gauss(rng)*.12;
  // sulla riga: esterno (verso il corridoio) o «T» (riga centrale), una volta su due
  if (T.tight){ const side = T.tight === 'esterno' ? box : T.tight === 'T' ? -box : rng() < .5 ? box : -box; plane = -side*.55; face = side*1; }
  const intent = { shot: 'topspin', power: T.power, depth: T.power, rise: -.08, plane, face: Math.max(-1, Math.min(1, face)) };
  return { tau: T.tau + gauss(rng)*.03, swing: { source: 'audit', side: 'overhead', shotType: 'topspin', speed: .8 + T.power*.85, dirX: 0,
    natpf: { aim: 'swing', shot: 'topspin', intent, power: T.power, latency: 0, hand: 'right' } } };
}

// agganci sul motore: stato della CPU a ogni servizio di chi gioca e come finisce
// pts (facoltativo): ogni punto della partita { won, server } per i game e i punti al servizio e in risposta
function hooks(rows, { always = false, still = false, pts = null } = {}){
  return e => {
    let cur = null;
    const setupServe = e._setupPointServe.bind(e);
    e._setupPointServe = o => {
      if (always){ e.score.server = 'player'; e.score.gameServer = 'player'; }
      setupServe(o);
      if (still) for (const a of [e.player, e.playerPartner, e.opponent, e.opponentPartner]) a.vel.set(0, 0, 0);
    };
    const hit = e._executeServeHit.bind(e);
    e._executeServeHit = (actor, evt) => {
      const o = e.opponent, v = o.vel.length(), vx = o.vel.x, was = e.ball.inPlay;
      hit(actor, evt);
      if (actor !== e.player || was || !e.ball.inPlay) return;
      const s = e.natpfLastServe || {};
      const W = e.natpfSkill?.serve;                                          // peso del servizio (dal B18.2; prima non c'è)
      rows.push(cur = { cpuV: +v.toFixed(2), cpuVx: +vx.toFixed(2), running: v > RUNNING, x: +e.ball.targetLanding.x.toFixed(2), z: +e.ball.targetLanding.z.toFixed(2),
        q: s.q, pace: s.pace, kind: s.kind, grade: s.grade, kmh: s.kmh, threat: W ? W.threat : null, late: W ? W.late : null, res: null, won: null });
    };
    const award = e._awardPoint.bind(e);
    e._awardPoint = (who, why) => {
      if (cur && cur.res == null){
        const n = e.ball.rallyStrokeCount, last = e.ball.lastHitter;
        cur.res = who === 'player' && n === 1 ? 'ace' : who === 'player' && n === 2 && last === 'opponent' ? 'risposta sbagliata' : who === 'opponent' && n === 1 ? 'fallo' : 'scambio';
        cur.won = who === 'player'; cur.why = why; cur = null;
      }
      pts && pts.push({ won: who === 'player', server: e.score.server });
      award(who, why);
    };
  };
}
export function summary(rows){
  const n = rows.length, c = k => rows.filter(r => r.res === k).length;
  const ace = c('ace'), bad = c('risposta sbagliata');
  return { n, ace: pct(ace, n), rispostaSbagliata: pct(bad, n), puntoDiretto: pct(ace + bad, n), falli: c('fallo'), inCorsa: pct(rows.filter(r => r.running).length, n),
    aceInCorsa: rows.filter(r => r.res === 'ace' && r.running).length, aceFermi: rows.filter(r => r.res === 'ace' && !r.running).length,
    puntiVinti: pct(rows.filter(r => r.won).length, n), kmh: +(rows.reduce((s, r) => s + (r.kmh || 0), 0)/Math.max(1, n)).toFixed(0) };
}
// banco: chi gioca batte ogni punto con il tipo di servizio dato; lo scambio dopo lo gioca il profilo
export function bench({ type = 'tutorial', difficulty = 'casual', profile = 'amatore', points = 400, seeds = [7, 11, 23], still = false } = {}){
  const rows = [];
  for (const seed of seeds) simulate({ profile, difficulty, points, seed, maxSeconds: 1e6, setup: hooks(rows, { always: true, still }), serve: (e, rng) => serveOf(type, e, rng) });
  return { type, difficulty, profile, still, ...summary(rows), rows };
}
// game dalla sequenza dei punti di una partita (primo a 4 con 2 di scarto, come scripts/audit/legend.mjs), e quelli in
// cui batteva chi gioca
export function gamesOf(pts){
  let a = 0, b = 0; const g = { game: 0, vinti: 0, alServizio: 0, vintiAlServizio: 0 };
  for (const p of pts){
    if (p.won) a++; else b++;
    if ((a >= 4 || b >= 4) && Math.abs(a - b) >= 2){ g.game++; if (a > b) g.vinti++; if (p.server === 'player'){ g.alServizio++; if (a > b) g.vintiAlServizio++; } a = b = 0; }
  }
  return g;
}
// partite normali, un battitore per game. Senza serveModel: servizio del profilo (rally-balance, kick lento senza forma);
// con serveModel (PHONE_SERVES): servizio del telefono con la forma, come lo batte chi gioca davvero
// hot (B42): «scambio che si scalda» acceso o spento a mano (engine.natpfHotRally); senza, la regola del gioco (acceso)
export function natural({ difficulty = 'casual', profile = 'amatore', points = 300, seeds = [7, 11, 23], still = false, serveModel = null, hot = null } = {}){
  const rows = [], all = [], G = { game: 0, vinti: 0, alServizio: 0, vintiAlServizio: 0 };
  for (const seed of seeds){
    const pts = [];
    const hk = hooks(rows, { still, pts });
    simulate({ profile, difficulty, points, seed, maxSeconds: 1e6, setup: e => { if (typeof hot === 'boolean') e.natpfHotRally = hot; hk(e); }, serve: serveModel ? (e, rng) => phoneServeOf(serveModel, e, rng) : null });
    const g = gamesOf(pts); for (const k of Object.keys(G)) G[k] += g[k];
    all.push(...pts);
  }
  const onServe = all.filter(p => p.server === 'player'), onReturn = all.filter(p => p.server !== 'player'), won = a => a.filter(p => p.won).length;
  const th = rows.filter(r => r.threat != null), avg = (a, f) => a.length ? a.reduce((s, r) => s + (f(r) || 0), 0)/a.length : null;
  return { difficulty, profile, serveModel, still, ...summary(rows),
    puntiAlServizio: pct(won(onServe), onServe.length), puntiInRisposta: pct(won(onReturn), onReturn.length), punti: pct(won(all), all.length),
    game: G.game, gameVinti: pct(G.vinti, G.game), gameAlServizio: pct(G.vintiAlServizio, G.alServizio),
    q: +(avg(rows, r => r.q) ?? 0).toFixed(2), minaccia: th.length ? +avg(th, r => r.threat).toFixed(3) : null,
    conMinaccia: th.length ? pct(th.filter(r => r.threat > 0).length, th.length) : null, conRitardo: th.length ? pct(th.filter(r => r.late > 0).length, th.length) : null, rows };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  // tutto quello che segue il primo «=» (i valori di --prova contengono altri «=»)
  const arg = k => { const a = process.argv.find(a => a.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : undefined; }, has = k => process.argv.includes(`--${k}`);
  const seeds = arg('nsemi') ? Array.from({ length: +arg('nsemi') }, (_, i) => 1001 + 37*i) : (arg('seeds') || '7,11,23').split(',').map(Number), still = has('fermi'), json = has('json');
  // valori di prova: --prova=casual.base=.135,casual.lateBase=.6 (solo se il motore ha serveTuning: dal B18.2)
  if (arg('prova')){
    const { serveTuning } = await import('../../src/natpf/natpf_skill.js');
    Object.assign(serveTuning, trialValues(arg('prova')));
    if (!json) console.log(`valori di prova: ${JSON.stringify(serveTuning)}`);
  }
  const diffs = (arg('difficulty') || 'casual,pro,leggenda').split(','), out = [];
  const line = (a, r) => `${a}  n ${String(r.n).padStart(5)}  ace ${String(r.ace).padStart(5)}% (in corsa ${String(r.aceInCorsa).padStart(3)}, ferma ${String(r.aceFermi).padStart(3)})  risposta sbagliata ${String(r.rispostaSbagliata).padStart(5)}%  punto diretto ${String(r.puntoDiretto).padStart(5)}%  CPU in corsa ${String(r.inCorsa).padStart(5)}%  punti vinti ${String(r.puntiVinti).padStart(5)}%  ${r.kmh} km/h  falli ${r.falli}`;
  if (has('naturale') && arg('servizio')){
    const profiles = (arg('profiles') || 'bambino,impreciso,amatore,medio').split(','), models = arg('servizio').split(',');
    if (!json) console.log(`Partite normali con il servizio del telefono${still ? ' (personaggi fermi a ogni servizio)' : ''}: ${seeds.length} semi × ${+(arg('points') || 300)} punti`);
    for (const difficulty of diffs) for (const profile of profiles) for (const serveModel of models){
      const { rows, ...r } = natural({ difficulty, profile, points: +(arg('points') || 300), seeds, still, serveModel });
      out.push(r);
      if (!json) console.log(`${difficulty.padEnd(9)} ${profile.padEnd(9)} ${serveModel.padEnd(10)} servizi ${String(r.n).padStart(5)}  ace ${String(r.ace).padStart(4)}%  punto diretto ${String(r.puntoDiretto).padStart(5)}%  CPU in corsa ${String(r.inCorsa).padStart(5)}%  | punti al servizio ${String(r.puntiAlServizio).padStart(5)}%  in risposta ${String(r.puntiInRisposta).padStart(5)}%  | game ${String(r.gameVinti).padStart(5)}% (${r.game})  game al servizio ${String(r.gameAlServizio).padStart(5)}%  | ${r.kmh} km/h  q ${r.q}${r.minaccia != null ? `  minaccia ${r.minaccia}  con minaccia ${r.conMinaccia}%  con ritardo ${r.conRitardo}%` : ''}`);
    }
  } else if (has('naturale')){
    const profiles = (arg('profiles') || 'medio,amatore,tennista,bambino').split(',');
    if (!json) console.log(`Partite normali${still ? ' (personaggi fermi a ogni servizio)' : ''}: servizi di chi gioca`);
    for (const difficulty of diffs) for (const profile of profiles){
      const { rows, ...r } = natural({ difficulty, profile, points: +(arg('points') || 300), seeds, still });
      out.push(r); if (!json) console.log(line(`${difficulty.padEnd(9)} ${profile.padEnd(9)}`, r));
    }
  } else {
    const types = (arg('tipi') || BASE_TYPES.join(',')).split(','), profile = arg('profile') || 'amatore';
    if (!json) console.log(`Banco del servizio${still ? ' (personaggi fermi a ogni servizio)' : ''}: chi gioca batte ogni punto, scambio giocato da «${profile}»`);
    for (const difficulty of diffs) for (const type of types){
      const { rows, ...r } = bench({ type, difficulty, profile, points: +(arg('points') || 400), seeds, still });
      out.push(r); if (!json) console.log(line(`${difficulty.padEnd(9)} ${type.padEnd(16)}`, r));
    }
  }
  if (json) console.log(JSON.stringify(out, null, 1));
}
