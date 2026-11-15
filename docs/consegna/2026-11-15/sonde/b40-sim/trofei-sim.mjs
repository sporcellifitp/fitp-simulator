// B40 (analisi) · partite simulate senza grafica per le soglie dei 12 trofei.
// Motore vero senza disegno (scripts/audit/headless-engine.mjs via rally-balance.simulate), giocatori simulati del
// telefono (PHONE_PROFILES di rally-balance.mjs), statistiche vere della partita (natpf_match_stats.installMatchStats).
// Configurazione come allo stand (default del gioco): battuta «Sempre lo stesso» (contro la CPU batte sempre chi gioca),
// formato classico contro la CPU (formato veloce solo nello stesso schermo), scambio caldo acceso (B42), durata 1 game
// (natpf_lobby: «partite brevi: in fiera si gioca un game»). Ogni partita = un visitatore nuovo (eventoReset).
// Uscita: una riga JSON per partita con i contatori candidati dei trofei.
// Uso (dalla cartella natpf-tennis della worktree):
//   node --import ./test/register.mjs <questo file> --profile=umano --level=evento --matches=300 --games=1 --seed=7 > out.jsonl
const WT = process.env.WT || '/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b40/wt/natpf-tennis';
const { simulate } = await import(`${WT}/scripts/audit/rally-balance.mjs`);
const { eventoReset } = await import(`${WT}/src/natpf/natpf_evento.js`);
const { installMatchStats, sideSummary } = await import(`${WT}/src/natpf/natpf_match_stats.js`);
const { finePunto } = await import(`${WT}/src/natpf/registro/registro_formato.js`);
const { phoneServeOf } = await import(`${WT}/scripts/audit/servizio.mjs`);

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const profile = arg('profile', 'umano'), level = arg('level', 'evento'), matches = +arg('matches', 100), games = +arg('games', 1), seed = +arg('seed', 7);
const serveRule = arg('serve', 'fissa');
// servizio del telefono «con la forma» (servizio.mjs, PHONE_SERVES: ipotesi, non dati di persone). auto: piano per il
// bambino, tardi per il principiante, insegnato per adulti e amatori, forte per il tennista; «kick» = il servizio dei
// profili di rally-balance (speed indefinita per i profili del telefono)
const SERVE_AUTO = { bambino: 'piano', principiante: 'tardi', umano: 'insegnato', amatore: 'insegnato', medioTel: 'insegnato', tennista: 'forte' };
const serveModel = arg('servizio', 'auto') === 'auto' ? (SERVE_AUTO[profile] || 'insegnato') : arg('servizio', 'auto');
// profilo in più di questa analisi (NON nel repository): adulto alla prima volta, tra «bambino» e «umano» di rally-balance
// (gesto dopo il rimbalzo come «umano», tempo e polso meno precisi, gesto più debole, quasi mai la mira voluta)
const CUSTOM = { principiante: { swing: true, prep: .3, intent: .2, timingSd: .11, wristSd: .4, peak: 520, peakSd: 150, rel: .7, specials: .02, afterBounce: .25, afterBounceSd: .08 } };

let done = 0, cur = null;
const t0 = Date.now();
const newLog = () => ({ pts: [], run: 0, maxRun: 0, pendShot: false, gi: 0 });

function finish(m){
  const s = sideSummary(m, 'player'), L = cur;
  // serie di punti di fila, game a zero / a 15, rimonta (punti sotto in un game poi vinto; game sotto in una partita vinta)
  let streak = 0, best = 0;
  for (const p of L.pts){ if (p.w === 'player'){ streak++; best = Math.max(best, streak); } else streak = 0; }
  const byGame = new Map();
  for (const p of L.pts){ if (!byGame.has(p.gi)) byGame.set(p.gi, []); byGame.get(p.gi).push(p); }
  let love = 0, at15 = 0, comebackPts = 0, gamesWon = 0;
  for (const [, ps] of byGame){
    const last = ps.at(-1); if (!last.gameWinner) continue;
    let pp = 0, oo = 0, maxDef = 0;
    for (const p of ps){ maxDef = Math.max(maxDef, oo - pp); p.w === 'player' ? pp++ : oo++; }
    if (last.gameWinner === 'player'){ gamesWon++; if (oo === 0) love++; if (oo <= 1) at15++; comebackPts = Math.max(comebackPts, maxDef); }
  }
  // game sotto nella partita poi vinta
  let gp = 0, go = 0, gDef = 0;
  for (const g of m.games){ gDef = Math.max(gDef, go - gp); g.winner === 'player' ? gp++ : go++; }
  const comebackGames = m.winner === 'player' ? gDef : 0;
  // sequenza dei punti ('p' chi gioca, 'o' la CPU; '|' fine di un game) e palle match annullate (punti vinti da chi gioca
  // quando alla CPU mancava un punto per vincere la partita)
  let seq = '', mpSaved = 0; { let gp2 = 0, go2 = 0, a = 0, b = 0;
    for (const p of L.pts){
      const oppGameWin = (b >= 3 && b - a >= 1);                 // la CPU vince il game col punto dopo (40-x o vantaggio)
      const oppMatch = oppGameWin && go2 + 1 >= games;
      if (oppMatch && p.w === 'player') mpSaved++;
      seq += p.w === 'player' ? 'p' : 'o'; p.w === 'player' ? a++ : b++;
      if (p.gameWinner){ seq += '|'; p.gameWinner === 'player' ? gp2++ : go2++; a = 0; b = 0; }
    } }
  const rec = { profile, level, games, seed, serve: serveModel, seq, mpSaved, won: m.winner === 'player', points: s.points, lost: s.lost, gamesWon: s.games, gamesLost: m.games.length - s.games,
    perfetti: s.timing.perfetto, rated: s.rated, shots: s.shots, serves: s.serves, hits: s.hits, fastest: s.fastest, longest: s.longest,
    aces: s.aces, winners: s.winners, superOk: s.superOk, supers: s.supers, errNet: s.errors.net, errOut: s.errors.out, whiff: s.errors.whiff,
    streak: best, love, at15, comebackPts, comebackGames, muro: L.maxRun, played: m.played,
    pctPerf: s.rated ? +(s.timing.perfetto/s.rated).toFixed(3) : 0 };
  process.stdout.write(JSON.stringify(rec) + '\n');
  done++;
}

let out = null;
try { out = simulate({ profile: CUSTOM[profile] || profile, difficulty: level, points: 1e9, seed, maxSeconds: 1e7,
  serve: serveModel === 'kick' ? null : (e, rng) => phoneServeOf(serveModel, e, rng),
  setup: e => {
    e.natpfServeRule = serveRule; e.natpfFair = false; e.matchConfig.gamesToWin = games;
    const S = installMatchStats(e, { onEnd: m => finish(m) });
    cur = newLog();
    const shot0 = S.shot.bind(S), point0 = S.point.bind(S), start0 = S.start.bind(S);
    S.start = E => { cur = newLog(); return start0(E); };
    // «Muro»: colpi di chi gioca nello scambio (non il servizio) rimandati in campo di fila; si azzera con un suo errore
    S.shot = (E, o = {}) => {
      if (S._on(E) && o.role !== 'p2'){
        if (!o.serve){ if (cur.pendShot){ cur.run++; cur.maxRun = Math.max(cur.maxRun, cur.run); } cur.pendShot = true; }
      }
      return shot0(E, o);
    };
    S.point = (E, o = {}) => {
      if (S._on(E)){
        const fine = o.why != null ? finePunto({ motivo: o.why, colpi: o.strokes | 0, vuoto: !!o.whiff }) : null;
        const playerErr = o.winner === 'opponent' && ['rete', 'fuori', 'servizio.rete', 'servizio.fuori', 'a vuoto'].includes(fine);
        if (cur.pendShot){
          if (playerErr && (fine === 'rete' || fine === 'fuori' || fine === 'a vuoto')) cur.run = 0;
          else { cur.run++; cur.maxRun = Math.max(cur.maxRun, cur.run); }
        } else if (playerErr) cur.run = 0;
        cur.pendShot = false;
        cur.pts.push({ w: o.winner, gi: cur.gi, fine, gameWinner: o.gameWinner || null });
        if (o.gameWinner) cur.gi++;
      }
      return point0(E, o);
    };
  },
  onStep: e => {
    if (done >= matches) throw new Error('__fine__');
    if (e.phase === 'MATCH_OVER'){ eventoReset(); e.startNewMatch({ showStartBanner: false }); }
  },
}); } catch (err) { if (String(err?.message) !== '__fine__') throw err; }
void out;
process.stderr.write(`${profile} ${level} games=${games} seed=${seed}: ${done} partite in ${((Date.now() - t0)/1000).toFixed(1)} s\n`);
