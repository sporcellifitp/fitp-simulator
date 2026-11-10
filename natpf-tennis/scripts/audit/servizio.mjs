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
//        [--json]
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
function hooks(rows, { always = false, still = false } = {}){
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
      rows.push(cur = { cpuV: +v.toFixed(2), cpuVx: +vx.toFixed(2), running: v > RUNNING, x: +e.ball.targetLanding.x.toFixed(2), z: +e.ball.targetLanding.z.toFixed(2),
        q: s.q, pace: s.pace, kind: s.kind, grade: s.grade, kmh: s.kmh, res: null, won: null });
    };
    const award = e._awardPoint.bind(e);
    e._awardPoint = (who, why) => {
      if (cur && cur.res == null){
        const n = e.ball.rallyStrokeCount, last = e.ball.lastHitter;
        cur.res = who === 'player' && n === 1 ? 'ace' : who === 'player' && n === 2 && last === 'opponent' ? 'risposta sbagliata' : who === 'opponent' && n === 1 ? 'fallo' : 'scambio';
        cur.won = who === 'player'; cur.why = why; cur = null;
      }
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
// partite normali: servizio del profilo (rally-balance), un battitore per game
export function natural({ difficulty = 'casual', profile = 'amatore', points = 300, seeds = [7, 11, 23], still = false } = {}){
  const rows = [];
  for (const seed of seeds) simulate({ profile, difficulty, points, seed, maxSeconds: 1e6, setup: hooks(rows, { still }) });
  return { difficulty, profile, still, ...summary(rows), rows };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1], has = k => process.argv.includes(`--${k}`);
  const seeds = (arg('seeds') || '7,11,23').split(',').map(Number), still = has('fermi'), json = has('json');
  const diffs = (arg('difficulty') || 'casual,pro,leggenda').split(','), out = [];
  const line = (a, r) => `${a}  n ${String(r.n).padStart(5)}  ace ${String(r.ace).padStart(5)}% (in corsa ${String(r.aceInCorsa).padStart(3)}, ferma ${String(r.aceFermi).padStart(3)})  risposta sbagliata ${String(r.rispostaSbagliata).padStart(5)}%  punto diretto ${String(r.puntoDiretto).padStart(5)}%  CPU in corsa ${String(r.inCorsa).padStart(5)}%  punti vinti ${String(r.puntiVinti).padStart(5)}%  ${r.kmh} km/h  falli ${r.falli}`;
  if (has('naturale')){
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
