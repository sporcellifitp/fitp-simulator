// Tabellone della partita in alto a sinistra, come in televisione (segnalazione del 06/11 sera, B10: «la UI sotto per il
// punteggio dice "game" o "game secco", non si capisce lo score»). Prima c'erano due pezzi: «30 - 15» tra due ritratti
// senza nomi e sotto una riga «Game 1 – 0 · game secco». Ora una riga per giocatore (o squadra) con chi serve, il nome, i
// game vinti e i punti del game in corso (0, 15, 30, 40, Vant.), più il formato della partita detto in parole.
// B17.3 (08/11, schermata di riferimento dell'utente, docs/b17/punteggio-riferimento.md): il disegno segue quella
// disposizione: linguetta colorata per riga, pallina di chi serve, nome ABBREVIATO in maiuscolo (nome intero nel title),
// game, punti in una casella piena gialla («AD» al vantaggio); niente intestazioni; formato e «Parità»/«Vantaggio …»
// come sottotitolo piccolo sotto il riquadro. Lo stato (nomi interi, punti, scritte) non cambia: cambia solo l'HTML.
// La partita del motore non ha set né tie-break: si vince arrivando per primi a `gamesToWin` game, e un game si vince
// con due punti di scarto (parità e vantaggio). Funzioni pure: le usa natpf_ui.onScore e le provano i test.
import { viewScore } from './natpf_point_call.js';

const POINTS = ['0', '15', '30', '40'];

// formato della partita in parole: «Partita a 1 game», «Al meglio di 3 game» (vince chi arriva per primo a 2)
export function formatText(gamesToWin = 1){
  const n = Math.max(1, Math.round(Number(gamesToWin) || 1));
  return n > 1 ? `Al meglio di ${n*2 - 1} game` : 'Partita a 1 game';
}

// punti del game in corso dal riferimento del motore: { player, opponent } come si scrivono sul tabellone
// (sopra il 40 chi è avanti di un punto ha «Vant.», l'altro resta a 40; a pari punti tutti e due 40)
export function gamePoints(p = 0, o = 0){
  p = Math.max(0, p | 0); o = Math.max(0, o | 0);
  if (p >= 3 && o >= 3){
    if (p === o) return { player: '40', opponent: '40', deuce: true };
    return p > o ? { player: 'Vant.', opponent: '40', adv: 'player' } : { player: '40', opponent: 'Vant.', adv: 'opponent' };
  }
  return { player: POINTS[Math.min(3, p)], opponent: POINTS[Math.min(3, o)] };
}

// nome abbreviato per la riga del tabellone, come le sigle in televisione (riferimento: «DRL», «2KG»): «TU», «CPU»,
// «P1»/«P2» per «Player 1»/«Player 2», altrimenti le prime `n` lettere (3) del nome scelto nella pagina «Collega»,
// maiuscole. Con più parole le lettere non vanno oltre la prima parola («Jean Paul» → «JEA», «JEAN», mai «JEANPA»).
// `mode`: con `initials` (o `true`) la sigla è fatta dalle iniziali delle parole prima dell'ultima più le lettere
// dell'ultima («Jean Paul» → «JPA», «Marco Rossi» → «MRO»); con `ending` le ultime lettere di una parola più lunga di `n`
// lasciano il posto all'ultima lettera, quella che in italiano distingue il nome maschile da quello femminile
// («Francesco» a 6 → «FRANCO», «Francesca» → «FRANCA»; con le iniziali «Anna Francesco» → «AFRANO»). Le squadre del
// doppio tengono il «+»: «TU+CPU», «MAR+CPU», «2CPU» (un numero davanti resta intero). Rifinitura del 08/11: prima un
// nome di al più 4 caratteri restava intero («ANNA»), ma «Anna»/«Annalisa» uscivano ANNA/ANN e si confondevano: ora
// sempre 3 lettere, e le sigle uguali le allunga shortNames. Le lettere si contano per code point (Array.from), non per
// unità UTF-16: «🎾🎾» a 3 resta «🎾🎾», prima slice() lasciava mezza emoji («🎾\ud83c», nel tabellone «🎾�»)
export function shortName(name = '', n = 3, mode = false){
  const len = Math.max(1, n | 0);
  const initials = mode === true || mode === 'initials' || mode === 'initials-ending';
  const ending = mode === 'ending' || mode === 'initials-ending';
  const chars = s => Array.from(String(s));
  // le prime k lettere di una parola; con `end` e una parola più lunga di k: k − 1 lettere più l'ultima
  const cut = (word, k, end = false) => { const c = chars(word); if (end && c.length > k && k >= 2) return c.slice(0, k - 1).join('') + c.at(-1); return c.slice(0, k).join(''); };
  const one = s => {
    s = String(s).trim();
    const m = /^player\s*(\d+)$/i.exec(s); if (m) return `P${m[1]}`;
    const num = /^(\d+)\s+(\S.*)$/.exec(s); if (num) return num[1] + one(num[2]);
    const words = s.split(/\s+/).filter(Boolean);
    if (initials && words.length > 1){
      const head = words.slice(0, -1).map(w => chars(w)[0]).join('');
      return (head + cut(words.at(-1), Math.max(1, len - chars(head).length), ending)).toUpperCase();
    }
    // una parola sola (o la prima di più parole, se è più lunga di `len`): l'ultima lettera solo con `ending`
    const first = chars(words[0] || '');
    if (words.length === 1 || first.length > len) return cut(words[0], len, ending).toUpperCase();
    return cut(words.join(''), Math.max(3, first.length)).toUpperCase();
  };
  return String(name).split(/\s*\+\s*/).map(one).join('+');
}

// confronto delle sigle senza accenti e maiuscole: «JOSÉ» e «JOSÈ» sono la stessa sigla (si distinguerebbero solo
// dall'accento, illeggibile da lontano)
const plain = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

// sigle delle due righe, diverse tra loro: 3 lettere; se uguali si allungano fino a 6 («Marco»/«Marcello» → MARCO/MARCE,
// «Anna»/«Annalisa» → ANNA/ANNAL, «Simone»/«Simona» → SIMONE/SIMONA); se ancora uguali, 5 lettere più l'ultima, che in
// italiano distingue il maschile dal femminile («Francesco»/«Francesca» → FRANCO/FRANCA, «Alessandro»/«Alessandra» →
// ALESSO/ALESSA, «Antonio»/«Antonia» → ANTONO/ANTONA: revisione del 08/11, prima cadevano su P1/P2 perché differiscono
// dalla 7ª lettera in poi); poi, con più di una parola, le iniziali («Jean Paul»/«Jean Pierre» → JPA/JPI, anche loro
// allungate fino a 6 e con l'ultima lettera: «Anna Francesco»/«Anna Francesca» → AFRANO/AFRANA); solo alla fine «P1» e
// «P2» («Marco»/«Marco», «José»/«Josè»). Non si va oltre 6 lettere: il riquadro resta entro i 13 em e, nel ledwall
// 720×720 diviso, la copia del P2 finisce proprio al limite dei 40 px prima della pausa (docs/b17/punteggio.md)
export function shortNames(me, them){
  const same = (a, b) => plain(a) === plain(b);
  const both = (n, mode) => { a = shortName(me, n, mode); b = shortName(them, n, mode); };
  let a = shortName(me), b = shortName(them);
  for (let n = 4; n <= 6 && same(a, b); n++) both(n);
  if (same(a, b)) both(6, 'ending');
  for (let n = 3; n <= 6 && same(a, b); n++) both(n, 'initials');
  if (same(a, b)) both(6, 'initials-ending');
  if (same(a, b)){ a = 'P1'; b = 'P2'; }
  return { me: a, them: b };
}

// nomi delle due righe dal lato di chi guarda: { me, them } (stesso schermo: P1 e P2 con i nomi della pagina «Collega»)
export function rowNames({ viewer = 'player', multiplayer = false, split = false, splitNames = null, doubles = false, hostName = '', guestName = '' } = {}){
  if (split) return { me: splitNames?.p1 || 'Player 1', them: splitNames?.p2 || 'Player 2' };
  const team = n => (doubles ? `${n} + CPU` : n);
  if (!multiplayer) return { me: team('Tu'), them: doubles ? '2 CPU' : 'CPU' };
  const rival = viewer === 'opponent' ? (hostName || 'Player 1') : (guestName || 'Player 2');
  return { me: team('Tu'), them: team(rival) };
}

// Vista del tabellone: due righe (prima quella di chi guarda, come negli annunci; stesso schermo: P1 sopra), formato e
// scritta del momento (Parità, Vantaggio di chi). score: lo stato del motore (playerPoints, opponentPoints,
// playerGames, opponentGames, server)
export function scoreboardView(score = {}, { gamesToWin = 1, viewer = 'player', multiplayer = false, split = false, splitNames = null, doubles = false, hostName = '', guestName = '' } = {}){
  const names = rowNames({ viewer, multiplayer, split, splitNames, doubles, hostName, guestName });
  const pts = gamePoints(score.playerPoints, score.opponentPoints);
  const side = s => ({ games: String(Math.max(0, score[`${s}Games`] | 0)), points: pts[s], serving: (score.server || 'player') === s, adv: pts.adv === s });
  const mine = split ? 'player' : viewer === 'opponent' ? 'opponent' : 'player', theirs = mine === 'player' ? 'opponent' : 'player';
  const short = shortNames(names.me, names.them);
  const rows = [{ side: 'me', name: names.me, short: short.me, ...side(mine) }, { side: 'them', name: names.them, short: short.them, ...side(theirs) }];
  let label = '';
  if (pts.deuce) label = 'Parità';
  else if (pts.adv){
    if (split) label = `Vantaggio ${pts.adv === 'player' ? names.me : names.them}`;
    else {
      // come negli annunci dei punti (viewScore): «Vantaggio tuo», «Vantaggio della CPU», «Vantaggio di Player 2»
      const rival = !multiplayer ? { of: 'della CPU' } : { of: `di ${viewer === 'opponent' ? (hostName || 'Player 1') : (guestName || 'Player 2')}` };
      label = viewScore({ player: pts.player === 'Vant.' ? 'Ad' : '40', opponent: pts.opponent === 'Vant.' ? 'Ad' : '40' }, viewer, rival);
    }
  }
  return { rows, format: formatText(gamesToWin), label };
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// HTML del tabellone (data-sb-* per le prove nel browser). Riquadro .sb-box con una riga per giocatore: linguetta del
// colore della riga, pallina di chi serve, sigla (nome intero nel title e per chi legge con lo screen reader), game,
// punti nella casella piena («AD» al vantaggio, così la casella resta larga uguale); sotto il riquadro il sottotitolo
// .sb-foot con il formato e la scritta del momento
export function scoreboardHtml(v){
  const row = r => `<div class="sb-row sb-${r.side}${r.serving ? ' serving' : ''}${r.adv ? ' adv' : ''}" data-sb-row="${r.side}" title="${esc(r.name)}">`
    + `<i class="sb-tab" aria-hidden="true"></i><i class="sb-serve" aria-hidden="true"></i>`
    + `<b class="sb-name" data-sb-name="${esc(r.name)}" aria-hidden="true">${esc(r.short || r.name)}</b>`
    + `<span class="sb-sr">${esc(r.name)}${r.serving ? ' (al servizio)' : ''}</span>`
    + `<span class="sb-games" data-sb-games>${esc(r.games)}</span><strong class="sb-points" data-sb-points>${esc(r.points === 'Vant.' ? 'AD' : r.points)}</strong></div>`;
  return `<div class="sb-box">${v.rows.map(row).join('')}</div>`
    + `<div class="sb-foot"><span data-sb-format>${esc(v.format)}</span><span class="sb-label" data-sb-label>${esc(v.label)}</span></div>`;
}
