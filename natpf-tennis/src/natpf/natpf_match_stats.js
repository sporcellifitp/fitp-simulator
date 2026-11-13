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
// (B35: rank è { rank, total, score } della classifica delle partite di oggi; nick il nome di chi gioca su questo computer)
export function viewOf(m, { viewer = 'player', names = null, rank = null, nick = '' } = {}){
  if (!m || !m.played) return null;
  const sides = m.mode === 'split' ? ['player', 'opponent'] : [viewer];
  const cols = sides.map(side => { const sum = sideSummary(m, side); return { side, name: names?.[side] || '', sum, tips: tipsOf(sum, { mode: m.mode, level: m.level, guest: m.guest }) }; });
  // game dal lato di chi guarda (nello stesso schermo dal lato del Player 1, a sinistra)
  const first = m.mode === 'split' ? 'player' : viewer;
  const games = m.games.map(g => ({ mine: g[first], theirs: g[other(first)], win: g.winner === first }));
  return { mode: m.mode, guest: m.guest, level: m.level, doubles: !!m.doubles, games, cols, rank, nick: m.mode === 'split' ? '' : String(nick || '') };
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/* ---------- B35: schermata finale rifatta (collaudo dell'utente del 13/11) ----------
   «Le statistiche alla fine del match sono troppe e poco comprensibili: forme tondeggianti e statistiche di cui uno può
   essere fiero (cose positive)». Proposta grafica mostrata all'utente (tre artboard: vittoria, sconfitta, stesso
   schermo): titolo grande, game in una pillola, al massimo TRE riquadri tondi con le cose migliori della partita, scelte
   da sole tra quelle positive e non nulle, una pillola in basso (classifica se vince, un consiglio gentile sul livello se
   perde), bottoni a pillola. Mai numeri negativi: niente errori, niente barra Anticipo/Ritardo, niente «cosa migliorare».
   I numeri restano quelli contati qui sopra (sideSummary): cambia solo cosa si mostra. */

// Le cose belle che si possono mostrare, nell'ordine in cui si mostrano. weight: quanto vale un'unità (un ace vale come
// 3 colpi Perfetti, come 40 km/h, come 2 vincenti, come uno scambio di 8 colpi o 8 punti vinti): si scelgono le più
// «grosse» per chi ha giocato (un colpo da 100 km/h vale come 7-8 Perfetti: di solito c'è, come nella proposta grafica);
// min: sotto non si mostra (uno «scambio più lungo» di 1 o 2 colpi non è un vanto)
export const BEST_ORDER = Object.freeze(['vincenti', 'ace', 'super', 'perfetti', 'kmh', 'scambio', 'punti']);
export const BEST = Object.freeze({
  vincenti: { weight: 1/2, min: 1, icon: 'star', tone: 'ball' },
  ace: { weight: 1, min: 1, icon: 'ace', tone: 'cyan' },
  super: { weight: 1, min: 1, icon: 'spark', tone: 'pink' },
  perfetti: { weight: 1/3, min: 1, icon: 'target', tone: 'ball' },
  kmh: { weight: 1/40, min: 1, icon: 'bolt', tone: 'pink' },
  scambio: { weight: 1/8, min: 3, icon: 'rally', tone: 'cyan' },
  punti: { weight: 1/8, min: 1, icon: 'plus', tone: 'pink' },
});
// scritta sotto il numero (one: 1, many: gli altri). vsCpu: contro la CPU («vincenti che la CPU non ha preso»); split:
// stesso schermo, scritte corte (riquadri più piccoli)
function bestLabel(id, n, { vsCpu = false, split = false } = {}){
  const one = n === 1;
  switch (id){
    case 'vincenti': return vsCpu ? `${one ? 'vincente' : 'vincenti'} che la CPU non ha preso` : (one ? 'vincente' : 'vincenti');
    case 'ace': return 'ace';
    case 'super': return one ? 'colpo super riuscito' : 'colpi super riusciti';
    case 'perfetti': return one ? 'colpo Perfetto' : 'colpi Perfetti';
    case 'kmh': return split ? 'km/h, colpo più forte' : 'km/h, il tuo colpo più forte';
    case 'scambio': return 'colpi nello scambio più lungo';
    case 'punti': return one ? 'punto vinto' : 'punti vinti';
  }
  return '';
}
// Le cose migliori di un giocatore (al più limit): solo positive e non nulle, dai numeri veri di sideSummary. guest:
// computer del Player 2 della sfida tra due computer (ace e vincenti non si sanno). Se non c'è niente (nessun colpo, nessun
// punto) un riquadro con i colpi giocati o «1 partita giocata»: mai un numero brutto. skip: cose da non ripetere (nello
// stesso schermo lo scambio più lungo sta nella pillola in basso)
export function bestOf(sum, { limit = 3, guest = false, vsCpu = false, split = false, skip = [] } = {}){
  if (!sum) return [];
  const value = { vincenti: guest ? 0 : sum.winners, ace: guest ? 0 : sum.aces, super: sum.superOk, perfetti: sum.timing?.perfetto || 0, kmh: sum.fastest, scambio: sum.longest, punti: sum.points };
  const all = BEST_ORDER.filter(id => !skip.includes(id)).map((id, i) => ({ id, i, value: Math.max(0, num(value[id]) | 0) })).filter(x => x.value >= BEST[x.id].min);
  const pick = all.map(x => ({ ...x, score: x.value*BEST[x.id].weight })).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, Math.max(1, limit)).sort((a, b) => a.i - b.i);
  const out = pick.map(x => ({ id: x.id, value: x.value, label: bestLabel(x.id, x.value, { vsCpu, split }), icon: BEST[x.id].icon, tone: BEST[x.id].tone }));
  if (!out.length) out.push(sum.hits > 0 ? { id: 'colpi', value: sum.hits, label: sum.hits === 1 ? 'colpo giocato' : 'colpi giocati', icon: 'rally', tone: 'cyan' } : { id: 'partita', value: 1, label: 'partita giocata', icon: 'trophy', tone: 'ball' });
  return out;
}

// Pillola in basso per chi gioca contro la CPU: se vince la posizione nella classifica delle partite di oggi (rank:
// { rank, total, score } di natpf_events.recordMatch; rank 0 = fuori dalle prime: allora i punti, mai «fuori»); se perde
// un consiglio gentile sul livello (quello più facile, se c'è)
export function cpuPill({ won = false, level = null, rank = null } = {}){
  if (won){
    if (rank?.rank > 0) return `${rank.rank}° posto nella classifica di oggi`;
    if (rank?.score > 0) return `${rank.score} punti nella partita di oggi`;
    return '';
  }
  const i = CPU_LEVELS.indexOf(level);
  return i > 0 ? `Prossima volta prova il livello ${LEVEL_NAME[CPU_LEVELS[i - 1]]}` : 'Prossima volta andrà ancora meglio!';
}

// Modello della schermata finale (funzione pura, la provano i test). base: natpf_point_call.matchEndView (titolo, righe
// dei game, chi ha vinto); v: viewOf (numeri della partita, più nick e rank). Restituisce cosa scrivere in ogni parte:
// kicker (pillola in alto), title, sub (riga sotto il titolo, solo quando si perde), games ({ mine, theirs } per la
// pillola dei game; nello stesso schermo i game stanno nel kicker), tiles (riquadri) o players (stesso schermo: due
// schede con due riquadri ciascuna), pill (pillola in basso), again (scritta del pulsante: «Gioca ancora» o «Rivincita»)
export function endScreen(base = {}, v = null){
  if (!v || !v.cols?.length) return null;
  const nWon = v.games.filter(g => g.win).length, nLost = v.games.length - nWon;
  const longest = Math.max(0, ...v.cols.map(c => c.sum.longest | 0));
  const rally = longest >= 2 ? `Scambio più lungo della partita: ${longest} colpi` : '';
  if (v.mode === 'split'){
    // game dal lato del Player 1 (viewOf): nel kicker prima quelli di chi ha vinto
    const w = v.cols.find(c => c.sum.won) || v.cols[0], wg = w.sum.games, lg = v.games.length - wg;
    return { mode: 'split', won: true, kicker: `Fine partita · ${wg} game a ${lg}`, title: base.title || `Vince ${w.name}!`, sub: '', games: null,
      players: v.cols.map(c => ({ side: c.side, name: c.name, won: !!c.sum.won, chip: c.sum.won ? 'Vince' : 'Bella sfida', tiles: bestOf(c.sum, { limit: 2, split: true, skip: rally ? ['scambio'] : [] }) })),
      pill: rally, again: 'Rivincita' };
  }
  const c = v.cols[0], s = c.sum, won = !!s.won, cpu = v.mode === 'cpu', nick = String(v.nick || '').trim();
  const rival = base.rows?.[1]?.name || (cpu ? 'CPU' : 'Player 2');
  const title = won ? (base.title || (nick ? `Vince ${nick}!` : 'Hai vinto!')) : nick ? `Bella sfida, ${nick}!` : 'Bella sfida!';
  // (doppio: «Hanno vinto le CPU», «Hanno vinto Amico + CPU»)
  const who = v.doubles ? (cpu ? 'Hanno vinto le CPU' : `Hanno vinto ${rival}`) : cpu ? 'La CPU ha vinto' : `Ha vinto ${rival}`;
  const sub = won ? '' : `${who} questa volta. Ecco cosa ti è venuto meglio:`;
  return { mode: v.mode, won, kicker: cpu && v.level && LEVEL_NAME[v.level] ? `Fine partita · livello ${LEVEL_NAME[v.level]}` : 'Fine partita', title, sub,
    games: { mine: nWon, theirs: nLost }, tiles: bestOf(s, { limit: 3, guest: !!v.guest, vsCpu: cpu }),
    pill: cpu && !v.doubles ? cpuPill({ won, level: v.level, rank: v.rank }) : rally, again: won && cpu ? 'Gioca ancora' : 'Rivincita' };
}

// icone dei riquadri (SVG a tratto, come nella proposta grafica; niente file)
const ICON = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  rally: '<path d="M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4"/><path d="M20 12a8 8 0 0 1-14 5.3"/><path d="M6 21v-4h4"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  ace: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6a9 9 0 0 1 0 12.8M18.4 5.6a9 9 0 0 0 0 12.8"/>',
  spark: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
};
const tileHtml = (t, small = false) => `<div class="end-tile" data-stat="${t.id}" data-value="${t.value}" data-tone="${t.tone}">`
  + (small ? '' : `<span class="end-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">${ICON[t.icon] || ''}</svg></span>`)
  + `<b class="end-num">${t.value}</b><span class="end-lab">${esc(t.label)}</span></div>`;
// HTML della parte centrale (riquadri o schede dello stesso schermo) dalla vista dei numeri; base: matchEndView
export function statsHtml(v, base = {}){
  const S = endScreen(base, v); if (!S) return '';
  if (S.players) return `<div class="end-players">${S.players.map(p => `<section class="end-player${p.won ? ' won' : ''}" data-side="${p.side}">`
    + `<header><h3 class="end-pname">${esc(p.name)}</h3><span class="end-chip">${esc(p.chip)}</span></header>`
    + `<div class="end-tiles" data-n="${p.tiles.length}">${p.tiles.map(t => tileHtml(t, true)).join('')}</div></section>`).join('')}</div>`;
  return `<div class="end-tiles" data-n="${S.tiles.length}">${S.tiles.map(t => tileHtml(t)).join('')}</div>`;
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
    return viewOf(m, { viewer, names, rank: this.rank, nick: E.natpfUi?.events?.nickname || '' });
  }
}
// Modulo collegato a un motore (anche quello senza grafica dei banchi e dei test)
export function installMatchStats(engine, opts = {}){ const s = new MatchStats(opts); engine.natpfStats = s; return s; }
