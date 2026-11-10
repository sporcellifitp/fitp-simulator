// Formato in fiera (B18, ramo R4; audit B16 miglioramento 1): quanto durano le partite e chi batte, con l'opzione spenta
// (un battitore per game, parità e vantaggi) e accesa (punto decisivo sul 40-40, servizio come nel tie-break).
// Banco deterministico sul motore vero senza disegno (headless-engine.mjs) con i profili del telefono di
// rally-balance.mjs: è una misura del gioco simulato, non di persone vere.
//   node --import ./test/register.mjs scripts/audit/formato-fiera.mjs [--points=300] [--seeds=7,11,23]
//        [--difficulty=casual,pro,leggenda] [--profiles=bambino,amatore,tennista] [--fair=0,1] [--json]
// Durata di una partita: tempo di gioco simulato dal primo servizio al punto che la chiude, comprese le pause tra i
// punti (POINT_OVER) e la moviola, senza la scritta d'inizio e la schermata finale. Le partite si ritagliano dalla
// sequenza lunga di game di ogni simulazione: ogni partita comincia da un game iniziato da chi gioca (la scelta di base
// «Chi batte per primo») e finisce quando qualcuno arriva a 1, 2 o 3 game (1 game, al meglio di 3, al meglio di 5).
import { pathToFileURL } from 'node:url';
import { simulate } from './rally-balance.mjs';

const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(f*s.length))] : null; };
const pct = (a, n) => +(100*a/Math.max(1, n)).toFixed(1);

// una simulazione lunga: punti (chi batteva, chi ha vinto, quando) e game (chi l'ha iniziato, chi l'ha vinto, quando,
// quali punti)
export function playStream({ profile, difficulty, fair, points = 300, seed = 7 }){
  const pts = [], games = [];
  let gameStart = 0, gameServer = null, from = 0;
  simulate({ profile, difficulty, points, seed, maxSeconds: 1e6, setup: e => {
    e.natpfFair = fair;
    const award = e._awardPoint.bind(e);
    e._awardPoint = (who, why) => {
      const server = e.score.server, g0 = e.score.playerGames + e.score.opponentGames;
      if (gameServer == null) gameServer = server;
      award(who, why);
      pts.push({ server, winner: who, t: e.elapsedTime });
      if (e.score.playerGames + e.score.opponentGames > g0){
        games.push({ gameServer, winner: who, start: gameStart, end: e.elapsedTime, from, to: pts.length });
        gameStart = e.elapsedTime; gameServer = null; from = pts.length;
      }
    };
  } });
  return { pts, games };
}

// partite al meglio di (2n − 1) game ritagliate dalla sequenza di una simulazione, da un game iniziato da chi gioca.
// cpuServed: punti della partita battuti dall'avversario
export function matchesFrom({ pts, games }, gamesToWin = 1){
  const out = [];
  for (let i = 0; i < games.length; i++){
    if (games[i].gameServer !== 'player') continue;
    const w = { player: 0, opponent: 0 };
    let j = i;
    for (; j < games.length; j++){ w[games[j].winner]++; if (w.player >= gamesToWin || w.opponent >= gamesToWin) break; }
    if (j >= games.length) break;
    const P = pts.slice(games[i].from, games[j].to);
    out.push({ seconds: games[j].end - games[i].start, winner: w.player >= gamesToWin ? 'player' : 'opponent', points: P.length, cpuServed: P.filter(p => p.server === 'opponent').length });
    i = j;
  }
  return out;
}

export function measure({ profile, difficulty, fair, points = 300, seeds = [7, 11, 23] }){
  const streams = seeds.map(seed => playStream({ profile, difficulty, fair, points, seed }));
  const P = streams.flatMap(s => s.pts), G = streams.flatMap(s => s.games);
  const served = P.filter(p => p.server === 'player'), recv = P.filter(p => p.server === 'opponent');
  const row = { difficulty, profile, fair, points: P.length, games: G.length,
    wonServing: pct(served.filter(p => p.winner === 'player').length, served.length),       // punti vinti battendo
    wonReceiving: pct(recv.filter(p => p.winner === 'player').length, recv.length),          // … e rispondendo
    // game ai vantaggi (classico: 7 punti o più) o al punto decisivo (fiera: 7 punti)
    deuceGamesPct: pct(G.filter(g => g.to - g.from >= 7).length, G.length) };
  for (const [k, n] of [['g1', 1], ['g3', 2], ['g5', 3]]){
    const M = streams.flatMap(s => matchesFrom(s, n)), s = M.map(m => m.seconds);
    row[k] = { n: M.length, won: pct(M.filter(m => m.winner === 'player').length, M.length),
      p50: +(q(s, .5) ?? 0).toFixed(0), p90: +(q(s, .9) ?? 0).toFixed(0), max: +Math.max(0, ...s).toFixed(0),
      cpuServePct: pct(M.reduce((a, m) => a + m.cpuServed, 0), M.reduce((a, m) => a + m.points, 0)) };
  }
  return row;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
  const points = +(arg('points') || 300), seeds = (arg('seeds') || '7,11,23').split(',').map(Number);
  const diffs = (arg('difficulty') || 'casual,pro,leggenda').split(','), profiles = (arg('profiles') || 'bambino,amatore,tennista').split(',');
  const fairs = arg('fair') ? arg('fair').split(',').map(v => v === '1' || v === 'si' || v === 'true') : [false, true];
  const rows = [];
  for (const difficulty of diffs) for (const profile of profiles) for (const fair of fairs){
    const r = measure({ profile, difficulty, fair, points, seeds }); rows.push(r);
    if (!process.argv.includes('--json')){
      const m = x => `${String(x.p50).padStart(4)}/${String(x.p90).padStart(4)}/${String(x.max).padStart(4)} s (vinte ${String(x.won).padStart(5)}% su ${x.n}, batte l'avversario ${x.cpuServePct}%)`;
      console.log(`${difficulty.padEnd(9)} ${profile.padEnd(9)} ${fair ? 'fiera   ' : 'classico'}  punti ${String(r.points).padStart(5)}  vinti battendo ${String(r.wonServing).padStart(5)}%  rispondendo ${String(r.wonReceiving).padStart(5)}%  game di 7 punti o più ${String(r.deuceGamesPct).padStart(5)}%`);
      console.log(`  1 game p50/p90/max ${m(r.g1)}\n  al meglio di 3     ${m(r.g3)}\n  al meglio di 5     ${m(r.g5)}`);
    }
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 2));
}
