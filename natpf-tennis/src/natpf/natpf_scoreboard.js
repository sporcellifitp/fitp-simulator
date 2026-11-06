// Tabellone della partita in alto, come in televisione (segnalazione del 06/11 sera, B10: «la UI sotto per il punteggio
// dice "game" o "game secco", non si capisce lo score»). Prima c'erano due pezzi: «30 - 15» tra due ritratti senza nomi
// e sotto una riga «Game 1 – 0 · game secco». Ora una riga per giocatore (o squadra) con chi serve, il nome, i game vinti
// e i punti del game in corso (0, 15, 30, 40, Vant.), più il formato della partita detto in parole.
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
  const rows = [{ side: 'me', name: names.me, ...side(mine) }, { side: 'them', name: names.them, ...side(theirs) }];
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

// HTML del tabellone (data-sb-* per le prove nel browser)
export function scoreboardHtml(v){
  const row = r => `<div class="sb-row sb-${r.side}${r.serving ? ' serving' : ''}${r.adv ? ' adv' : ''}" data-sb-row="${r.side}">`
    + `<i class="sb-serve" aria-hidden="true"></i><b class="sb-name" data-sb-name>${esc(r.name)}</b>`
    + `<span class="sb-games" data-sb-games>${esc(r.games)}</span><strong class="sb-points" data-sb-points>${esc(r.points)}</strong>`
    + `<span class="sb-sr">${r.serving ? ' (al servizio)' : ''}</span></div>`;
  return `<div class="sb-head" aria-hidden="true"><span></span><span></span><span>Game</span><span>Punti</span></div>`
    + v.rows.map(row).join('')
    + `<div class="sb-foot"><span data-sb-format>${esc(v.format)}</span><span class="sb-label" data-sb-label>${esc(v.label)}</span></div>`;
}
