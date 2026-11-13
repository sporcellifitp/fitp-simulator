// B33 · tappa 3.3 del rapporto docs/b16/rapporto-gameplay.md (miglioramento 5): fine partita con dati veri e classifica
// delle partite. Documento per l'utente: docs/b33/fine-partita.md.
// Cosa fa:
//   - conta, mentre si gioca, quello che succede davvero nella partita: punti vinti e come (ace, vincenti, errori in
//     rete, fuori, colpi a vuoto), punti di ogni game, scambio più lungo, colpi, colpo più veloce (i km/h della scritta
//     del colpo, cioè la velocità vera della palla; dal B34 solo i colpi finiti in campo), colpi super, voto del tempo (Perfetto · Anticipo · Ritardo · Buono, come la scritta del colpo);
//   - a fine partita prepara la schermata: pochi numeri grandi, i game, una frase su cosa è andato bene e una su cosa
//     migliorare (regole semplici sui numeri veri, viewOf e tipsOf);
//   - il punteggio della classifica delle partite contro la CPU (matchScore): % di punti vinti × valore del livello.
// Il motore chiama solo funzioni di lettura (engine.natpfStats: start, shot, point, guest, endView): niente cambia nel
// gioco (impronte delle partite a sorteggi fissi identiche: scripts/audit/fine-partita.mjs --impronte, test).
// Sfida tra due computer: l'host conta i punti come qui; il computer del Player 2 non decide i punti (li riceve con il
// punteggio dell'host) e il messaggio dell'host non dice sempre come è finito il punto (sul punto che chiude il game
// arriva solo «Game»): lì si contano punti, game, scambio più lungo (dalla palla dell'host) e i colpi fatti su quel
// computer, senza ace, vincenti ed errori. Niente dati nuovi in rete.
// I nomi non escono mai da questo computer: la classifica sta in natpf_events (localStorage), il registro dello stand
// non li riceve.
// Funzioni pure in alto (le provano i test), poi la classe collegata al motore.
import { finePunto } from './registro/registro_formato.js';
import { CPU_LEVELS, LEVEL_NAME } from './natpf_who.js';

export const SIDES = Object.freeze(['player', 'opponent']);
const other = s => (s === 'player' ? 'opponent' : 'player');
const num = v => (Number.isFinite(+v) ? +v : 0);

// Valore di ogni livello nel punteggio della classifica: scelto dalle misure del banco (scripts/audit/fine-partita.mjs
// --livelli, due serie di semi, docs/b33/fine-partita.md §Misure) perché lo stesso giocatore simulato «umano» (adulto
// medio con il telefono) prenda circa lo stesso punteggio a ogni livello: chi vince di più a un livello facile non passa
// davanti a chi gioca bene a uno difficile.
export const LEVEL_WEIGHT = Object.freeze({ bambini: 1, casual: 1.1, evento: 1.4, pro: 1.6, leggenda: 5 });
// una riga, per la classifica e il documento
export const SCORE_RULE = `Punteggio = % di punti vinti × livello (${CPU_LEVELS.map(l => `${LEVEL_NAME[l]} ×${String(LEVEL_WEIGHT[l]).replace('.', ',')}`).join(' · ')})`;
export function matchScore({ level, won = 0, lost = 0 } = {}){
  const tot = num(won) + num(lost), w = LEVEL_WEIGHT[level];
  if (!tot || !w) return 0;
  return Math.round(100*num(won)/tot*w);
}

// voto del tempo dalla scritta del colpo del motore (come natpf_shot_feedback.shotQuality, senza dentro/fuori)
export function timingOf(grade = ''){
  const g = String(grade).toUpperCase();
  if (!g || /WHIFF|TOO LATE|TOO EARLY/.test(g)) return null;
  if (/PERFECT|POWER/.test(g)) return 'perfetto';
  if (/EARLY/.test(g)) return 'anticipo';
  if (/LATE/.test(g)) return 'ritardo';
  return 'buono';
}

const side0 = () => ({ points: 0, aces: 0, winners: 0, net: 0, out: 0, whiff: 0, serves: 0, shots: 0, fastest: 0, supers: 0, superOk: 0,
  timing: { perfetto: 0, anticipo: 0, ritardo: 0, buono: 0 } });
// mode: 'cpu' | 'split' (stesso schermo) | 'versus' (sfida tra due computer); guest: computer del Player 2
export function newMatch({ mode = 'cpu', level = null, gamesToWin = 1, doubles = false, guest = false } = {}){
  return { mode, level, gamesToWin: Math.max(1, gamesToWin | 0), doubles: !!doubles, guest: !!guest, games: [], cur: { player: 0, opponent: 0 }, longest: 0, played: 0,
    s: { player: side0(), opponent: side0() }, pend: { player: null, opponent: null }, over: false, winner: null };
}
// B34 (decisione dell'utente del 13/11, revisione finale n. 10): il «colpo più veloce» conta solo i colpi finiti in campo.
// Al momento del colpo non si sa ancora: i km/h restano in attesa (m.pend) e valgono quando la palla risulta buona, cioè
// quando qualcuno colpisce di nuovo (l'avversario l'ha ripresa; sul computer del Player 2 e contro la CPU i colpi
// dell'altro non arrivano qui, quindi vale anche il colpo successivo dello stesso lato) o quando il punto finisce in
// altro modo che con quella palla fuori o in rete (il motivo del motore, come per gli errori: finePunto). Si buttano se
// il punto finisce perché quella palla è fuori o in rete, o se a un servizio ne segue un altro dello stesso lato
// (servizio da rifare). Sul computer del Player 2 il motivo non arriva: lì vale solo se chi ha colpito vince il punto
// (qualche colpo buono può mancare, uno fuori non entra mai). Una palla che andava fuori ma l'avversario colpisce lo
// stesso conta: per il motore la palla è in gioco.
const keepFastest = (m, side, kmh) => { const S = m.s[side]; if (kmh > S.fastest) S.fastest = Math.round(kmh); };
const BAD_END = new Set(['rete', 'fuori', 'servizio.rete', 'servizio.fuori']);
function settle(m, { shot = null, winner = null, fine = undefined } = {}){
  if (!m.pend) m.pend = { player: null, opponent: null };
  for (const side of SIDES){
    const p = m.pend[side]; if (!p) continue;
    m.pend[side] = null;
    const good = winner ? side === winner || (fine !== undefined && !BAD_END.has(fine)) : !(shot && shot.side === side && shot.serve && p.serve);
    if (good) keepFastest(m, side, p.kmh);
  }
}
// un colpo: side chi colpisce; serve servizio; grade e kmh come la scritta del colpo (km/h veri della palla); superShot
// colpo super (failed: il colpo è fallito)
export function addShot(m, { side = 'player', grade = '', kmh = 0, serve = false, superShot = false, failed = false } = {}){
  if (!m || m.over || !SIDES.includes(side)) return m;
  const S = m.s[side];
  if (serve) S.serves++;
  else { S.shots++; const t = timingOf(grade); if (t) S.timing[t]++; }
  settle(m, { shot: { side, serve: !!serve } });
  const v = num(kmh); if (v > 0) m.pend[side] = { kmh: v, serve: !!serve };   // i km/h della scritta del colpo, in attesa dell'esito
  if (superShot){ S.supers++; if (!failed) S.superOk++; }
  return m;
}
// un punto, con il motivo del motore (why: 'Out', 'Net', 'Nice Shot!', 'Point', …; null se non si sa), i colpi dello
// scambio, se chi perde ha fatto il colpo a vuoto, chi vince il game (o null) e i game dopo il punto
export function addPoint(m, { winner, why = null, strokes = 0, whiff = false, gameWinner = null, gamesAfter = null } = {}){
  if (!m || m.over || !SIDES.includes(winner)) return m;
  const W = m.s[winner], L = m.s[other(winner)], n = Math.max(0, strokes | 0);
  const fine = why != null ? finePunto({ motivo: why, colpi: n, vuoto: !!whiff }) : undefined;
  settle(m, { winner, fine });
  W.points++; m.played++; m.cur[winner]++;
  if (n > m.longest) m.longest = n;
  if (why != null){
    if (fine === 'ace') W.aces++;
    else if (fine === 'vincente' || fine === 'passata') W.winners++;
    else if (fine === 'rete' || fine === 'servizio.rete') L.net++;
    else if (fine === 'fuori' || fine === 'servizio.fuori') L.out++;
    else if (fine === 'a vuoto') L.whiff++;
  }
  if (gameWinner){ m.games.push({ winner: gameWinner, player: m.cur.player, opponent: m.cur.opponent }); m.cur = { player: 0, opponent: 0 }; }
  const g = gamesAfter || { player: m.games.filter(x => x.winner === 'player').length, opponent: m.games.filter(x => x.winner === 'opponent').length };
  if (g.player >= m.gamesToWin || g.opponent >= m.gamesToWin){ m.over = true; m.winner = g.player > g.opponent ? 'player' : 'opponent'; }
  return m;
}

// numeri di un giocatore per la schermata (tutti contati, niente stime)
export function sideSummary(m, side){
  const S = m.s[side], O = m.s[other(side)], t = S.timing, rated = t.perfetto + t.anticipo + t.ritardo + t.buono;
  const tot = S.points + O.points;
  return { points: S.points, lost: O.points, pct: tot ? Math.round(100*S.points/tot) : 0, aces: S.aces, winners: S.winners, errors: { net: S.net, out: S.out, whiff: S.whiff },
    hits: S.serves + S.shots, serves: S.serves, shots: S.shots, fastest: S.fastest, supers: S.supers, superOk: S.superOk, timing: { ...t }, rated,
    longest: m.longest, games: m.games.filter(g => g.winner === side).length, won: m.winner === side };
}

// Una frase su cosa è andato bene e una su cosa migliorare, dalle regole qui sotto (numeri veri, soglie semplici).
// guest: computer del Player 2 della sfida tra due computer (niente ace, vincenti ed errori: non si sanno)
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export function tipsOf(sum, { mode = 'cpu', level = null, guest = false } = {}){
  const t = sum.timing, r = sum.rated, share = k => (r ? t[k]/r : 0);
  let good;
  if (!guest && sum.aces >= 2) good = `${plural(sum.aces, 'ace', 'ace')}: servizio imprendibile!`;
  else if (!guest && sum.winners >= 3) good = `${plural(sum.winners, 'vincente', 'vincenti')}: palle che l’avversario non ha preso!`;
  else if (r >= 6 && share('perfetto') >= .5) good = `Gran tempo: ${t.perfetto} colpi perfetti su ${r}.`;
  else if (sum.superOk >= 1) good = sum.superOk === 1 ? 'Hai fatto un colpo super!' : `Hai fatto ${sum.superOk} colpi super!`;
  else if (sum.longest >= 8) good = `Scambio lungo ${sum.longest} colpi: bravo a tenere la palla in campo!`;
  else if (sum.won) good = 'Hai vinto la partita: bravo!';
  else if (sum.pct >= 40) good = `Hai vinto ${sum.points} punti su ${sum.points + sum.lost}: partita combattuta!`;
  else if (sum.hits >= 5) good = `${sum.hits} colpi giocati: continua così!`;
  else good = 'Partita giocata: la prossima andrà meglio!';
  let fix;
  const late = t.ritardo, early = t.anticipo;
  if (!guest && sum.errors.whiff >= 3) fix = `Guarda la palla fino alla racchetta: ${sum.errors.whiff} colpi a vuoto.`;
  else if (r >= 4 && late > early && share('ritardo') >= .3) fix = 'Colpisci un po’ prima: tanti colpi in ritardo.';
  else if (r >= 4 && early > late && share('anticipo') >= .3) fix = 'Aspetta un attimo la palla: tanti colpi in anticipo.';
  else if (!guest && sum.errors.net >= 3 && sum.errors.net >= sum.errors.out) fix = `Tante palle in rete (${sum.errors.net}): colpisci un po’ più in alto.`;
  else if (!guest && sum.errors.out >= 3) fix = `Tante palle fuori (${sum.errors.out}): colpisci un po’ più piano.`;
  else if (mode === 'cpu' && sum.won && level && CPU_LEVELS.indexOf(level) >= 0 && CPU_LEVELS.indexOf(level) < CPU_LEVELS.length - 1)
    fix = `Prossima sfida: prova il livello ${LEVEL_NAME[CPU_LEVELS[CPU_LEVELS.indexOf(level) + 1]]}.`;
  else if (sum.longest < 4) fix = 'Prova a tenere la palla in campo più a lungo.';
  else fix = 'Continua ad allenare il tempo del colpo: punta al verde!';
  return { good, fix };
}

// Vista della schermata finale. cols: le colonne da mostrare (una, o due nello stesso schermo), dal lato di chi guarda.
// names: { player, opponent } (nomi mostrati); viewer: 'player' | 'opponent'
export function viewOf(m, { viewer = 'player', names = null, rank = null } = {}){
  if (!m || !m.played) return null;
  const sides = m.mode === 'split' ? ['player', 'opponent'] : [viewer];
  const cols = sides.map(side => { const sum = sideSummary(m, side); return { side, name: names?.[side] || '', sum, tips: tipsOf(sum, { mode: m.mode, level: m.level, guest: m.guest }) }; });
  // game dal lato di chi guarda (nello stesso schermo dal lato del Player 1, a sinistra)
  const first = m.mode === 'split' ? 'player' : viewer;
  const games = m.games.map(g => ({ mine: g[first], theirs: g[other(first)], win: g.winner === first }));
  return { mode: m.mode, guest: m.guest, level: m.level, games, cols, rank };
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// HTML della parte nuova della schermata finale (hud_ui.showVictoryModal): game, numeri grandi, voto del tempo, frasi
export function statsHtml(v){
  if (!v) return '';
  const games = v.games.length ? `<ol class="vs-games" aria-label="Punti di ogni game">${v.games.map((g, i) => `<li class="${g.win ? 'win' : ''}" title="${i + 1}° game"><b>${g.mine}-${g.theirs}</b></li>`).join('')}</ol>` : '';
  const col = c => {
    const s = c.sum, t = s.timing, bar = s.rated ? `<div class="vs-timing" role="img" aria-label="Tempo: ${t.perfetto} perfetti, ${t.anticipo} in anticipo, ${t.ritardo} in ritardo, ${t.buono} buoni">${['perfetto', 'anticipo', 'ritardo', 'buono'].filter(k => t[k]).map(k => `<i data-t="${k}" style="flex:${t[k]}"></i>`).join('')}</div>
      <p class="vs-legend"><span data-t="perfetto">Perfetto ${t.perfetto}</span><span data-t="anticipo">Anticipo ${t.anticipo}</span><span data-t="ritardo">Ritardo ${t.ritardo}</span></p>` : '';
    const tiles = [['Punti vinti', `${s.points}`, `su ${s.points + s.lost}`], ['Colpi', `${s.hits}`, ''], ['Scambio più lungo', `${s.longest}`, s.longest === 1 ? 'colpo' : 'colpi'],
      ...(s.fastest ? [['Colpo più veloce', `${s.fastest}`, 'km/h']] : [])];
    const best = [!v.guest && s.aces ? plural(s.aces, 'ace', 'ace') : '', !v.guest && s.winners ? plural(s.winners, 'vincente', 'vincenti') : '', s.superOk ? plural(s.superOk, 'colpo super', 'colpi super') : ''].filter(Boolean);
    return `<section class="vs-col" data-side="${c.side}">${c.name ? `<h3 class="vs-name">${esc(c.name)}</h3>` : ''}
      <div class="vs-tiles">${tiles.map(([k, n, u]) => `<div class="vs-tile"><b>${n}</b><small>${k}${u ? ` <em>${u}</em>` : ''}</small></div>`).join('')}</div>
      ${best.length ? `<p class="vs-best">${best.map(x => `<span>${x}</span>`).join('')}</p>` : ''}${bar}
      <p class="vs-tip good"><b aria-hidden="true">✓</b>${esc(c.tips.good)}</p><p class="vs-tip fix"><b aria-hidden="true">→</b>${esc(c.tips.fix)}</p></section>`;
  };
  const rank = v.rank ? `<p class="vs-rank">${esc(v.rank)}</p>` : '';
  return `${games}<div class="vs-cols" data-n="${v.cols.length}">${v.cols.map(col).join('')}</div>${rank}`;
}

/* ---------- collegamento al motore ---------- */
// counts(): facoltativa, false quando i colpi e i punti non sono di una partita (allenamento, minigiochi, scambi di prova)
export class MatchStats {
  constructor({ counts = null, onEnd = null } = {}){ this.m = null; this.counts = counts; this.onEnd = onEnd; this.rank = null; this._gs = null; this._gmax = 0; }
  _mode(E){ return E.natpfSplit?.active ? 'split' : (E.isMultiplayer || E.versus?.active) ? 'versus' : 'cpu'; }
  _on(E){ return !!this.m && !this.m.over && !E.autoPlayMode && (!this.counts || this.counts()); }
  // game_engine.startNewMatch
  start(E){
    this.rank = null; this._gs = null; this._gmax = 0;
    const mode = this._mode(E);
    // (sempre una partita nuova, anche se in quel momento gira ancora la dimostrazione dietro il menu: qualche strada
    // spegne autoPlayMode dopo startNewMatch. I colpi e i punti della dimostrazione non contano comunque: _on)
    this.m = newMatch({ mode, level: mode === 'cpu' ? E.matchConfig?.difficulty || null : null, gamesToWin: E.matchConfig?.gamesToWin || 1, doubles: !!E.isDoubles,
      guest: E.playerRole === 'p2' && !!E.isMultiplayer });
  }
  // colpo con la scritta del motore (role: 'p1' chi gioca qui o il Player 1, 'p2' il Player 2)
  shot(E, { role = 'p1', grade = '', kmh = 0, serve = false, superShot = false, failed = false } = {}){
    if (!this._on(E)) return;
    addShot(this.m, { side: role === 'p2' ? 'opponent' : 'player', grade, kmh, serve, superShot, failed });
  }
  // game_engine._awardPoint, dopo il punto e prima del game (gameWinner: chi vince il game con questo punto, o null)
  point(E, { winner, why = null, strokes = 0, whiff = false, gameWinner = null } = {}){
    if (!this._on(E)) return;
    const S = E.score || {}, g = { player: (S.playerGames || 0) + (gameWinner === 'player' ? 1 : 0), opponent: (S.opponentGames || 0) + (gameWinner === 'opponent' ? 1 : 0) };
    this.m.gamesToWin = Math.max(1, E.matchConfig?.gamesToWin || this.m.gamesToWin);
    addPoint(this.m, { winner, why, strokes, whiff, gameWinner, gamesAfter: g });
    if (this.m.over) try { this.onEnd?.(this.m, E); } catch {}
  }
  // computer del Player 2 della sfida tra due computer: punti e game dal punteggio dell'host (snapshot n), prima che il
  // motore lo copi; scambio più lungo dalla palla dell'host
  guest(E, n){
    if (!(E.playerRole === 'p2' && E.isMultiplayer) || !n?.score || E.autoPlayMode) return;
    const s = n.score, sum = x => (x.playerPoints || 0) + (x.opponentPoints || 0) + (x.playerGames || 0) + (x.opponentGames || 0);
    if ((!this.m || this.m.over) && n.phase !== 'MATCH_OVER' && !sum(s)){ this.start(E); this._gs = { ...s }; }
    if (!this.m || this.m.over) return;
    const rc = n.ball?.rallyStrokeCount | 0; if (rc > this._gmax) this._gmax = rc;
    const p = this._gs || E.score || {};
    let winner = null, game = null;
    if ((s.playerGames || 0) > (p.playerGames || 0)){ winner = 'player'; game = 'player'; }
    else if ((s.opponentGames || 0) > (p.opponentGames || 0)){ winner = 'opponent'; game = 'opponent'; }
    else if ((s.playerPoints || 0) > (p.playerPoints || 0)) winner = 'player';
    else if ((s.opponentPoints || 0) > (p.opponentPoints || 0)) winner = 'opponent';
    this._gs = { ...s };
    if (!winner || (this.counts && !this.counts())) return;
    this.m.gamesToWin = Math.max(1, E.matchConfig?.gamesToWin || n.gamesToWin || this.m.gamesToWin);
    addPoint(this.m, { winner, why: null, strokes: this._gmax, gameWinner: game, gamesAfter: { player: s.playerGames || 0, opponent: s.opponentGames || 0 } });
    this._gmax = 0;
  }
  // per game_engine._natpfMatchEndView: la vista dal lato di chi guarda su questo computer
  endView(E){
    const m = this.m; if (!m) return null;
    const viewer = E.playerRole === 'p2' ? 'opponent' : 'player';
    const names = m.mode === 'split' ? { player: E.natpfSplitNames?.p1 || 'Player 1', opponent: E.natpfSplitNames?.p2 || 'Player 2' } : null;
    return viewOf(m, { viewer, names, rank: this.rank });
  }
}
// Modulo collegato a un motore (anche quello senza grafica dei banchi e dei test)
export function installMatchStats(engine, opts = {}){ const s = new MatchStats(opts); engine.natpfStats = s; return s; }
