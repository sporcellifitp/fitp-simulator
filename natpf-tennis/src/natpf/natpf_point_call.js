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
// deciding: 40-40 con il formato in fiera (B18, natpf_fair_format.js): chi vince il punto vince il game
export function viewScore({ player = '0', opponent = '0', deciding = false } = {}, viewer = 'player', rival = rivalOf()){
  const z = v => (String(v) === '00' ? '0' : String(v));   // il motore scrive lo zero «00»
  const mine = z(viewer === 'opponent' ? opponent : player), theirs = z(viewer === 'opponent' ? player : opponent);
  if (mine === '40' && theirs === '40') return deciding ? 'Punto decisivo' : 'Parità';
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
    const sc = score ? (score.deciding ? 'Punto decisivo' : score.player === 'Ad' ? `Vantaggio ${sharedNames.player}` : score.opponent === 'Ad' ? `Vantaggio ${sharedNames.opponent}` : `${sharedNames.player} ${score.player} · ${sharedNames.opponent} ${score.opponent}`) : '';
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
  if (sharedNames) return { mine: winner === 'player', text: `${match ? 'Partita' : 'Game'} ${sharedNames[winner]}`, subText: `${sharedNames.player} ${games.player} · ${sharedNames.opponent} ${games.opponent}`, style: winner === 'player' ? 'style-won' : 'style-lost' };
  const mine = winner === viewer, g = viewer === 'opponent' ? `${games.opponent}-${games.player}` : `${games.player}-${games.opponent}`;
  return {
    mine,
    text: match ? (mine ? 'Partita tua!' : `Partita ${rival.of}`) : (mine ? 'Game tuo' : `Game ${rival.of}`),
    subText: `Game ${g}`,
    style: mine ? 'style-won' : 'style-lost',
  };
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
  // B18: dati senza «kind» ({ voice } del punto decisivo, solo la frase da dire): resta il messaggio dell'host
  if (!c || !c.kind) return { text: b?.text || '', subText: b?.subText || '', style: b?.style || 'style-score' };
  if (c.kind === 'point') return pointCall({ winner: c.winner, why: c.why, score: c.score, ...ctx });
  return gameCall({ winner: c.winner, games: c.games || undefined, match: c.kind === 'match', ...ctx });
}
