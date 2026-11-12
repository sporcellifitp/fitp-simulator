// Banco dei livelli «Bambini» ed «Evento» (B18.2, tappa 2 gruppo 3; difetto 3 / D3 di docs/b16/rapporto-gameplay.md;
// documento docs/b18/t2-4-evento-bambini.md). Motore vero senza disegno (headless-engine.mjs) con i giocatori simulati
// di rally-balance.mjs: è una misura del gioco simulato, non di persone vere.
//   npm run audit:evento                              tabella: Bambini, Casual, Evento × profili, due serie di semi
//   npm run audit:evento -- --livelli=evento --profili=amatore,medio --nsemi=4 --punti=200 [--serie=A]
//        [--curva]        Evento con la CPU ferma a k = 0, 0,25, 0,5, 0,75 e 1 (senza adattamento): punti vinti per profilo
//        [--tracce]       per il livello Evento, come si muove k punto per punto nelle prime partite di ogni profilo
//        [--rivincite=3]  ogni visitatore gioca tante partite di fila («Gioca ancora»: k non riparte); di base 1
//        [--impronte]     impronte dei livelli di prima (casual, pro, leggenda, 1v1) con semi fissi: devono restare identiche
//        [--prova=bambini.cpuSpeed=3.2,evento.gain=.2,evento.start=.4,hard.cpuSpeed=5.8]   valori di prova (cpuTuning dei
//                         livelli; «evento.» = natpf_evento.eventoTuning; «hard.» = estremo difficile di Evento)
//        [--json]
// Come si misura. Ogni simulazione è una fila di visitatori: un visitatore comincia da un game che batte lui (la scelta
// di base «Batte per primo: Tu») e gioca UNA PARTITA: 1 game con il formato in fiera (punto decisivo sul 40-40, servizio
// come nel tie-break) oppure al meglio di 3 con il formato classico. Al livello Evento ogni visitatore parte dal valore di
// base (come dopo «Nuovo giocatore»). I punti dei game che non fanno parte di una partita non contano.
//   punti, game, partite vinti da chi gioca · colpi per punto · durata della partita (tempo di gioco simulato, senza la
//   scritta d'inizio e la schermata finale) · Evento: k alla fine della partita e la sua escursione dentro la partita.
// Profili: bambino, amatore, umano, medio, tennista di rally-balance.mjs; «ragazzo» è definito qui (tra bambino e amatore).
// «Adulto medio» del rapporto = amatore, umano, medio; «bravo» = tennista.
// Distorsione del banco (come negli altri): lo scambio che arriva a 60 colpi è chiuso d'ufficio a favore della CPU.
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { simulate, PROFILES } from './rally-balance.mjs';
import * as NS from '../../src/natpf/natpf_skill.js';
import { eventoTuning, eventoState, EVENTO } from '../../src/natpf/natpf_evento.js';

// tra «bambino» e «amatore»: prepara poco, cerca il campo libero una volta su quattro, tempo e polso a metà strada
export const RAGAZZO = Object.freeze({ swing: true, prep: .3, intent: .25, timingSd: .105, wristSd: .38, peak: 540, peakSd: 130, rel: .72, specials: .02 });
export const profileOf = name => (name === 'ragazzo' ? RAGAZZO : PROFILES[name]);
export const SERIE = Object.freeze({
  A: n => Array.from({ length: n }, (_, i) => 2001 + i*37),   // i semi di audit:cpu
  B: n => Array.from({ length: n }, (_, i) => 7 + i*101),     // seconda serie, indipendente
});
const pct = (a, n, d = 1) => +(100*a/Math.max(1, n)).toFixed(d);
const q = (a, f) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(f*s.length))] : null; };
const mean = a => (a.length ? a.reduce((s, v) => s + v, 0)/a.length : 0);

// Una fila di visitatori. gamesToWin: 1 (1 game) o 2 (al meglio di 3). visits: partite di fila dello stesso visitatore
export function playVisitors({ profile = 'amatore', difficulty = 'evento', fair = true, gamesToWin = 1, points = 300, seed = 7, visits = 1 } = {}){
  const matches = [], evento = difficulty === 'evento';
  let cur = null, inVisit = 0, first = true, lastEnd = 0;
  // una partita comincia da un game battuto da chi gioca; il visitatore nuovo riparte dal valore di base PRIMA del suo
  // primo punto (come dopo «Nuovo giocatore»)
  const begin = e => {
    if (inVisit === 0 && evento) NS.eventoRestart(e);
    cur = { start: lastEnd, w: { player: 0, opponent: 0 }, pts: [], k0: evento ? NS.eventoK() : null, visit: inVisit };
  };
  simulate({ profile: profileOf(profile), difficulty, points, seed, maxSeconds: 1e6, setup: e => {
    e.natpfFair = fair;
    if (evento) NS.eventoRestart(e);
    const award = e._awardPoint.bind(e);
    e._awardPoint = (who, why) => {
      const g0 = e.score.playerGames + e.score.opponentGames, hits = e.ball.rallyStrokeCount;
      if (first){ first = false; if (e.score.server === 'player') begin(e); }
      const k = evento ? NS.eventoK() : null;     // la CPU con cui si è giocato questo punto
      award(who, why);
      if (cur) cur.pts.push({ won: who === 'player', hits, k });
      if (e.score.playerGames + e.score.opponentGames > g0){
        if (cur){
          cur.w[who]++;
          if (cur.w.player >= gamesToWin || cur.w.opponent >= gamesToWin){
            const ks = cur.pts.map(p => p.k);
            matches.push({ winner: cur.w.player >= gamesToWin ? 'player' : 'opponent', seconds: e.elapsedTime - cur.start, points: cur.pts.length,
              won: cur.pts.filter(p => p.won).length, hits: cur.pts.map(p => p.hits), games: cur.w.player + cur.w.opponent, gamesWon: cur.w.player,
              visit: cur.visit, k0: cur.k0, k1: evento ? NS.eventoK() : null, kMin: evento ? Math.min(...ks, NS.eventoK()) : null, kMax: evento ? Math.max(...ks, NS.eventoK()) : null,
              trail: evento ? [...ks, NS.eventoK()].map(v => +v.toFixed(3)) : null });
            cur = null; inVisit = (inVisit + 1) % visits;
          }
        }
        lastEnd = e.elapsedTime;
        if (!cur && e.score.server === 'player') begin(e);
      }
    };
  } });
  return matches;
}

export function measure({ profile, difficulty, fair = true, gamesToWin = 1, points = 300, seeds = SERIE.A(6), visits = 1 } = {}){
  const M = seeds.flatMap(seed => playVisitors({ profile, difficulty, fair, gamesToWin, points, seed, visits }));
  const pts = M.reduce((s, m) => s + m.points, 0), won = M.reduce((s, m) => s + m.won, 0), hits = M.flatMap(m => m.hits), p = won/Math.max(1, pts);
  const row = { difficulty, profile, formato: gamesToWin === 1 ? (fair ? '1 game in fiera' : '1 game') : `al meglio di ${2*gamesToWin - 1}${fair ? ' in fiera' : ''}`,
    partite: M.length, punti: pts, puntiG: pct(won, pts), puntiGErr: +(100*Math.sqrt(p*(1 - p)/Math.max(1, pts))).toFixed(1),
    gameG: pct(M.reduce((s, m) => s + m.gamesWon, 0), M.reduce((s, m) => s + m.games, 0)),
    partiteG: pct(M.filter(m => m.winner === 'player').length, M.length),
    colpi: { media: +mean(hits).toFixed(2), mediana: q(hits, .5), p90: q(hits, .9) },
    durata: { p50: +(q(M.map(m => m.seconds), .5) ?? 0).toFixed(0), p90: +(q(M.map(m => m.seconds), .9) ?? 0).toFixed(0), max: +Math.max(0, ...M.map(m => m.seconds)).toFixed(0) },
    puntiPartita: +mean(M.map(m => m.points)).toFixed(1) };
  if (difficulty === 'evento'){
    row.k = { fine: +mean(M.map(m => m.k1)).toFixed(2), p10: q(M.map(m => m.k1), .1), p90: q(M.map(m => m.k1), .9),
      // escursione dentro la partita: quanto k si allontana, al massimo, da dove la partita è cominciata
      escursione: +mean(M.map(m => Math.max(m.kMax - m.k0, m.k0 - m.kMin))).toFixed(2), escursioneMax: +Math.max(0, ...M.map(m => Math.max(m.kMax - m.k0, m.k0 - m.kMin))).toFixed(2) };
    if (visits > 1) row.perVisita = Array.from({ length: visits }, (_, i) => { const V = M.filter(m => m.visit === i); const a = V.reduce((s, m) => s + m.won, 0), b = V.reduce((s, m) => s + m.points, 0);
      return { partita: i + 1, n: V.length, puntiG: pct(a, b), partiteG: pct(V.filter(m => m.winner === 'player').length, V.length), kInizio: +mean(V.map(m => m.k0)).toFixed(2), kFine: +mean(V.map(m => m.k1)).toFixed(2) }; });
    row.tracce = M.slice(0, 4).map(m => m.trail);
  }
  return row;
}

// Evento con la CPU ferma a k: punti e game vinti in una fila lunga di punti (senza partite)
export function curve({ profile, ks = [0, .25, .5, .75, 1], points = 300, seeds = SERIE.A(4) } = {}){
  const out = [];
  for (const k of ks){
    eventoTuning.fixed = k;
    try {
      const runs = seeds.map(seed => simulate({ profile: profileOf(profile), difficulty: 'evento', points, seed }));
      const pts = runs.reduce((s, r) => s + r.points, 0), won = runs.reduce((s, r) => s + r.won, 0), hits = runs.flatMap(r => r.rallies);
      out.push({ k, punti: pts, puntiG: pct(won, pts), colpi: +mean(hits).toFixed(2), p90: q(hits, .9) });
    } finally { delete eventoTuning.fixed; }
  }
  return out;
}

// impronte dei livelli di prima: stessi semi, stessi numeri (il gruppo 3 non li deve cambiare)
export function fingerprints({ points = 80 } = {}){
  const out = {};
  for (const difficulty of ['casual', 'pro', 'leggenda', '1v1']) for (const profile of ['medio', 'umano', 'bambino', 'tennista']) for (const seed of [7, 2001]){
    const r = simulate({ profile, difficulty, points, seed });
    const h = createHash('sha256').update(JSON.stringify([r.points, r.won, r.rallies, r.reasons, r.grades, r.landings, r.cpu.length, r.shots])).digest('hex').slice(0, 16);
    out[`${difficulty}/${profile}/${seed}`] = `${h} ${r.won}/${r.points}`;
  }
  return out;
}

// «bambini.cpuSpeed=3.2,evento.gain=.2,hard.cpuSpeed=5.8» → cpuTuning, eventoTuning, eventoHardTuning
export function applyTrial(text){
  for (const kv of String(text || '').split(',').filter(Boolean)){
    const i = kv.indexOf('='), path = kv.slice(0, i).split('.'), n = Number(kv.slice(i + 1));
    if (i < 0 || path.length < 2 || !Number.isFinite(n)) throw new Error(`--prova: «${kv}» non è gruppo.nome=numero`);
    const [lv, key, sub] = path;
    if (lv === 'evento' && key in EVENTO) eventoTuning[key] = n;
    else if (lv === 'hard'){ if (sub) NS.eventoHardTuning[key] = { ...(NS.eventoHardTuning[key] || NS.EVENTO_ENDS.hard[key]), [sub]: n }; else NS.eventoHardTuning[key] = n; }
    else {
      const base = NS.SKILL_LEVELS[lv]; if (!base) throw new Error(`--prova: livello «${lv}» sconosciuto`);
      const t = NS.cpuTuning[lv] || (NS.cpuTuning[lv] = {});
      if (sub) t[key] = { ...(t[key] || base[key] || {}), [sub]: n }; else t[key] = n;
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : undefined; };
  const has = k => process.argv.includes(`--${k}`), json = has('json');
  const levels = (arg('livelli') || 'bambini,casual,evento').split(','), profiles = (arg('profili') || 'bambino,ragazzo,amatore,umano,medio,tennista').split(',');
  const points = +(arg('punti') || 300), n = +(arg('nsemi') || 6), series = (arg('serie') || 'A,B').split(','), visits = +(arg('rivincite') || 1);
  if (arg('prova')){ applyTrial(arg('prova')); if (!json) console.log(`valori di prova: ${arg('prova')}`); }
  if (has('impronte')){ console.log(JSON.stringify(fingerprints(), null, 1)); }
  else if (has('curva')){
    const out = {};
    for (const profile of profiles){
      const c = out[profile] = curve({ profile, points, seeds: SERIE[series[0]](n) });
      if (!json) console.log(`${profile.padEnd(9)} ` + c.map(r => `k ${r.k}: ${String(r.puntiG).padStart(5)}% (${r.colpi} colpi, p90 ${r.p90})`).join(' · '));
    }
    if (json) console.log(JSON.stringify(out, null, 1));
  } else {
    const rows = [];
    for (const difficulty of levels) for (const profile of profiles) for (const [fair, gamesToWin] of [[true, 1], [false, 2]]) for (const s of series){
      const r = measure({ profile, difficulty, fair, gamesToWin, points, seeds: SERIE[s](n), visits }); r.serie = s; rows.push(r);
      if (json) continue;
      console.log(`${difficulty.padEnd(8)} ${profile.padEnd(9)} ${r.formato.padEnd(16)} serie ${s}: partite ${String(r.partite).padStart(4)} · punti vinti ${String(r.puntiG).padStart(5)}% ± ${r.puntiGErr} · game ${String(r.gameG).padStart(5)}% · partite ${String(r.partiteG).padStart(5)}%`
        + ` · colpi per punto ${r.colpi.media} (p90 ${r.colpi.p90}) · durata p50/p90/max ${r.durata.p50}/${r.durata.p90}/${r.durata.max} s · punti a partita ${r.puntiPartita}`
        + (r.k ? ` · k a fine partita ${r.k.fine} (p10 ${r.k.p10}, p90 ${r.k.p90}), escursione media ${r.k.escursione}, massima ${r.k.escursioneMax}` : ''));
      if (r.perVisita) console.log('    ' + r.perVisita.map(v => `partita ${v.partita}: punti ${v.puntiG}%, vinte ${v.partiteG}%, k ${v.kInizio} → ${v.kFine}`).join(' · '));
      if (r.tracce && has('tracce')) for (const t of r.tracce) console.log('    k: ' + t.join(' '));
    }
    if (json) console.log(JSON.stringify(rows, null, 1));
  }
  void eventoState;
}
