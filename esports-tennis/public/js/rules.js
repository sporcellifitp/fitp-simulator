// Punteggio del tennis, funzioni pure su JSON. Lo stesso codice gira nel browser (partita contro la CPU)
// e sul server della stanza online (incollato in src/logic.js da tools/sync-logic.mjs: niente import qui).

export const FORMATS = {
  rapida: { label: 'Rapida', games: 2, tiebreakAt: 99, golden: true, firstTo: true }, // vince chi arriva a 2 game
  breve: { label: 'Set breve', games: 4, tiebreakAt: 4, golden: false },
  set: { label: 'Set completo', games: 6, tiebreakAt: 6, golden: false },
};

export function newScore(formatKey, firstServer) {
  const format = FORMATS[formatKey] ? formatKey : 'breve';
  return { format, points: [0, 0], games: [0, 0], server: firstServer === 1 ? 1 : 0, tiebreak: false, tbFirst: 0, over: false, winner: null, history: [] };
}

function other(p) { return p === 0 ? 1 : 0; }

// Chi serve il prossimo punto (nel tie-break si alterna dopo il primo punto e poi ogni due).
export function currentServer(s) {
  if (!s.tiebreak) return s.server;
  const n = s.points[0] + s.points[1];
  const block = Math.floor((n + 1) / 2);
  return block % 2 === 0 ? s.tbFirst : other(s.tbFirst);
}

// Riquadro del servizio visto dal ricevente: 'deuce' (destra) a punti pari, 'ad' a punti dispari.
export function serviceBox(s) {
  return (s.points[0] + s.points[1]) % 2 === 0 ? 'deuce' : 'ad';
}

export function pointWon(prev, who) {
  if (prev.over) return prev;
  const s = { ...prev, points: prev.points.slice(), games: prev.games.slice(), history: prev.history.slice() };
  const f = FORMATS[s.format];
  const events = [];
  s.points[who]++;
  const [a, b] = s.points;
  let gameWinner = null;
  if (s.tiebreak) {
    if ((a >= 7 || b >= 7) && Math.abs(a - b) >= 2) gameWinner = a > b ? 0 : 1;
  } else if (f.golden) {
    if (a >= 4 || b >= 4) gameWinner = a > b ? 0 : 1;
  } else if ((a >= 4 || b >= 4) && Math.abs(a - b) >= 2) {
    gameWinner = a > b ? 0 : 1;
  }
  if (gameWinner !== null) {
    const wasTiebreak = s.tiebreak;
    s.games[gameWinner]++;
    s.points = [0, 0];
    events.push(wasTiebreak ? 'tiebreak' : 'game');
    if (wasTiebreak) s.server = other(s.tbFirst);
    else s.server = other(s.server);
    s.tiebreak = false;
    const [ga, gb] = s.games;
    const setWon = wasTiebreak || ((ga >= f.games || gb >= f.games) && (f.firstTo || Math.abs(ga - gb) >= 2));
    if (setWon) {
      s.over = true;
      s.winner = ga > gb ? 0 : 1;
      events.push('match');
    } else if (ga === f.tiebreakAt && gb === f.tiebreakAt) {
      s.tiebreak = true;
      s.tbFirst = s.server;
      events.push('tiebreak-start');
    }
    s.history.push([ga, gb]);
  }
  s.lastEvents = events;
  s.lastPoint = who;
  return s;
}

const CALL = ['0', '15', '30', '40'];

// Testo dei punti dal punto di vista di `me` (0 o 1): [miei, suoi]
export function pointsText(s, me = 0) {
  const a = s.points[me], b = s.points[other(me)];
  if (s.tiebreak) return [String(a), String(b)];
  const f = FORMATS[s.format];
  if (a >= 3 && b >= 3 && !f.golden) {
    if (a === b) return ['40', '40'];
    return a > b ? ['AD', '40'] : ['40', 'AD'];
  }
  return [CALL[Math.min(a, 3)], CALL[Math.min(b, 3)]];
}

// Situazione speciale del game in corso, per gli annunci.
export function callout(s) {
  if (s.tiebreak || s.over) return null;
  const [a, b] = s.points;
  const f = FORMATS[s.format];
  if (a >= 3 && b >= 3) {
    if (f.golden) return 'killer';
    if (a === b) return 'parita';
    return 'vantaggio';
  }
  return null;
}
