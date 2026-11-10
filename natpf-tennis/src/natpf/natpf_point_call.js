// Fine del punto, del game e della partita: chi vince e perché, dal lato di chi guarda (segnalazione del 23/10, sera:
// compariva «Fuori» sotto il punteggio e non si capiva chi avesse sbagliato né a chi andasse il punto; «Vantaggio» senza
// dire di chi). In grande chi vince il punto, verde se è il proprio e rosa se è dell'avversario; sotto chi ha sbagliato
// o perché, e il punteggio dal proprio lato (il proprio prima).
// Funzioni pure: il motore le usa alla fine del punto (_awardPoint) e il Player 2 del 1v1 ricompone il messaggio dal suo
// lato con i dati dello snapshot (chi vince e perché), invece di ripetere quello dell'host.
//   winner: 'player' | 'opponent' nel riferimento del motore (player = chi gioca qui contro la CPU, o l'host del 1v1)
//   why: motivo del motore: 'Out' | 'Net' | 'Nice Shot!' | 'Ace!' | 'Point'
//   viewer: 'player' (contro la CPU, o l'host) | 'opponent' (il Player 2 del 1v1)
//   rival: avversario visto da chi guarda: { of: 'della CPU', who: 'la CPU' } (rivalOf)
//   score: { player, opponent } punti del motore ('0', '15', '30', '40', 'Ad'), dopo il punto

export const rivalOf = ({ multiplayer = false, viewer = 'player' } = {}) => (!multiplayer
  ? { of: 'della CPU', who: 'la CPU', Who: 'La CPU' }
  : viewer === 'opponent' ? { of: 'di Player 1', who: 'Player 1', Who: 'Player 1' } : { of: 'di Player 2', who: 'Player 2', Who: 'Player 2' });

// punteggio del game dal lato di chi guarda: «30-15» (il proprio prima), parità, vantaggio di chi
// il motore scrive lo zero «00»: nei banner «0», come nei tabelloni (decisione B10 dell'utente)
const z = v => (String(v) === '00' ? '0' : String(v));
export function viewScore({ player = '0', opponent = '0' } = {}, viewer = 'player', rival = rivalOf()){
  const mine = z(viewer === 'opponent' ? opponent : player), theirs = z(viewer === 'opponent' ? player : opponent);
  if (mine === '40' && theirs === '40') return 'Parità';
  if (mine === 'Ad') return 'Vantaggio tuo';
  if (theirs === 'Ad') return `Vantaggio ${rival.of}`;
  return `${mine}-${theirs}`;
}

const REASON = {
  // errore di chi ha colpito per ultimo (chi perde il punto)
  Out: (mine, r) => (mine ? `Errore ${r.of}: palla fuori` : 'Errore tuo: palla fuori'),
  Net: (mine, r) => (mine ? `Errore ${r.of}: palla in rete` : 'Errore tuo: palla in rete'),
  'Nice Shot!': (mine, r) => (mine ? 'Vincente!' : `Vincente ${r.of}`),
  'Ace!': (mine, r) => (mine ? 'Ace!' : `Ace ${r.of}`),
  // palla passata senza colpo
  Point: (mine, r) => (mine ? `${r.Who} non ci arriva` : 'Palla non presa'),
};

export function pointCall({ winner = 'player', why = '', viewer = 'player', rival = rivalOf({ viewer }), score = null, sharedNames = null } = {}){
  if (sharedNames){
    const win = sharedNames[winner], lose = sharedNames[winner === 'player' ? 'opponent' : 'player'];
    const reason = why === 'Out' ? `Errore di ${lose}: palla fuori` : why === 'Net' ? `Errore di ${lose}: palla in rete` : why === 'Point' ? `${lose} non ci arriva` : why === 'Ace!' ? `Ace di ${win}` : why === 'Nice Shot!' ? `Vincente di ${win}` : '';
    // stesso schermo (B18, difetto 4 del B16): «0» e non «00», «Parità» a 40-40 come contro la CPU
    const sc = !score ? '' : score.player === 'Ad' ? `Vantaggio ${sharedNames.player}` : score.opponent === 'Ad' ? `Vantaggio ${sharedNames.opponent}`
      : z(score.player) === '40' && z(score.opponent) === '40' ? 'Parità' : `${sharedNames.player} ${z(score.player)} · ${sharedNames.opponent} ${z(score.opponent)}`;
    return { mine: winner === 'player', text: `Punto ${win}`, subText: [reason, sc].filter(Boolean).join(' · '), style: winner === 'player' ? 'style-won' : 'style-lost' };
  }
  const mine = winner === viewer;
  const reason = REASON[why]?.(mine, rival) || '';
  const sc = score ? viewScore(score, viewer, rival) : '';
  return {
    mine,
    text: mine ? 'Punto tuo' : `Punto ${rival.of}`,
    subText: [reason, sc].filter(Boolean).join(' · '),
    style: mine ? 'style-won' : 'style-lost',
  };
}

// game e partita: games: { player, opponent } dopo il game
export function gameCall({ winner = 'player', viewer = 'player', rival = rivalOf({ viewer }), games = { player: 0, opponent: 0 }, match = false, sharedNames = null } = {}){
  // stesso schermo: la partita la vince qualcuno che è lì («Vince Marco!», B18), il game è «Game Marco»
  if (sharedNames) return { mine: winner === 'player', text: match ? `Vince ${sharedNames[winner]}!` : `Game ${sharedNames[winner]}`, subText: `${sharedNames.player} ${games.player} · ${sharedNames.opponent} ${games.opponent}`, style: winner === 'player' ? 'style-won' : 'style-lost' };
  const mine = winner === viewer, g = viewer === 'opponent' ? `${games.opponent}-${games.player}` : `${games.player}-${games.opponent}`;
  return {
    mine,
    text: match ? (mine ? 'Partita tua!' : `Partita ${rival.of}`) : (mine ? 'Game tuo' : `Game ${rival.of}`),
    subText: `Game ${g}`,
    style: mine ? 'style-won' : 'style-lost',
  };
}

// Schermata finale (B18, difetto 4 e punto 18 del B16): chi ha vinto con il nome, i game di tutti e due e la voce di fine
// partita per chiunque vinca. Prima: «Hai vinto!/Riprova!» dal lato del Player 1 (nello stesso schermo il Player 2 che
// vinceva leggeva «Riprova!» con il nome «Tu»), la voce «Game, set and match» solo se vinceva il Player 1, e un rating
// finto (1145 se vinci, 1020 se perdi, con un grafico fisso).
//   winner: 'player' | 'opponent' (motore); games: { player, opponent }; viewer, rival, sharedNames: callContext
//   nickname: il nome di chi gioca su questo computer (natpf_events, «Nuovo giocatore»), '' se non c'è
// → { title, won (titolo da festa: giallo; false = rosa, ha vinto l'avversario di chi guarda), rows: [{ name, games, win }]
//    (prima la riga di chi guarda; stesso schermo: Player 1 sopra), score ('1-0' dal lato della prima riga), voice }
export const MATCH_VOICE = 'Game Set and Match';
export function matchEndView({ winner = 'player', games = { player: 0, opponent: 0 }, viewer = 'player', rival = rivalOf({ viewer }), sharedNames = null, nickname = '', multiplayer = false, doubles = false } = {}){
  const g = { player: Math.max(0, games?.player | 0), opponent: Math.max(0, games?.opponent | 0) }, other = s => (s === 'player' ? 'opponent' : 'player');
  if (sharedNames){
    const rows = ['player', 'opponent'].map(s => ({ name: sharedNames[s], games: g[s], win: s === winner }));
    return { title: `Vince ${sharedNames[winner]}!`, won: true, rows, score: `${g.player}-${g.opponent}`, voice: MATCH_VOICE };
  }
  const me = viewer === 'opponent' ? 'opponent' : 'player', mine = winner === me, nick = String(nickname || '').trim();
  const myName = nick || 'Tu', rivalName = !multiplayer ? (doubles ? '2 CPU' : 'CPU') : rival.who;
  const title = mine ? (nick ? `Vince ${nick}!` : doubles ? 'Avete vinto!' : 'Hai vinto!') : !multiplayer ? (doubles ? 'Vincono le CPU' : 'Vince la CPU') : `Vince ${rival.who}!`;
  const rows = [{ name: doubles && !multiplayer ? `${myName} + CPU` : myName, games: g[me], win: mine }, { name: rivalName, games: g[other(me)], win: !mine }];
  return { title, won: mine, rows, score: `${g[me]}-${g[other(me)]}`, voice: MATCH_VOICE };
}

// Dati del motore per chi guarda su questo computer (anche il Player 2 del 1v1)
export function callContext(engine){
  const viewer = engine?.playerRole === 'p2' ? 'opponent' : 'player', multiplayer = !!engine?.isMultiplayer;
  return { viewer, rival: rivalOf({ multiplayer, viewer }), ...(engine?.natpfSplit?.active ? { sharedNames: { player: engine.natpfSplitNames?.p1 || 'Player 1', opponent: engine.natpfSplitNames?.p2 || 'Player 2' } } : {}) };
}

// Messaggio dell'host ricevuto dal Player 2 del 1v1: ricomposto dal suo lato con chi vince e perché (prima ripeteva il
// testo dell'host). Senza dati (host di prima) resta quello dell'host
export function callFromBroadcast(engine, b){
  const c = b?.call, ctx = callContext(engine);
  if (!c) return { text: b?.text || '', subText: b?.subText || '', style: b?.style || 'style-score' };
  if (c.kind === 'point') return pointCall({ winner: c.winner, why: c.why, score: c.score, ...ctx });
  return gameCall({ winner: c.winner, games: c.games || undefined, match: c.kind === 'match', ...ctx });
}
