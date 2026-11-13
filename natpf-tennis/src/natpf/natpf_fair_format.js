// Formato in fiera (B18, ramo R4; audit B16 miglioramento 1; decisione dell'utente del 10/11: «ok, dimmi come attivarlo
// in caso» → opzione dello staff; dal B20 tre valori, di base «Solo stesso schermo», vedi FAIR_MODES). Con l'opzione accesa:
//   · punto decisivo sul 40-40: chi vince quel punto vince il game (niente vantaggi);
//   · il servizio passa come nel tie-break: il primo punto del game lo batte uno, poi due punti a testa (A, B B, A A, B B…).
//     Così contro la CPU batte anche la CPU e nello stesso schermo batte anche il Player 2, anche in una partita a 1 game.
// Spenta: tutto come prima (un battitore per game, parità e vantaggi). Il primo battitore del game resta quello di prima:
// la scelta «Chi batte per primo» del menu per il primo game, poi si alterna a ogni game.
// Dove si accende: pannello dello stand (Ctrl+Maiusc+K, F9 nel programma Windows, o 3 s sul marchio NATPF del menu) → «Formato in fiera»; resta
// salvata (localStorage, chiave natpf-tennis.formatoFiera). L'indirizzo la può forzare per quella pagina, senza salvarla:
// ?formato=fiera (accesa) o ?formato=classico (spenta).
// Nella sfida tra due computer decide l'host: la regola sta nel punteggio (score.fair, score.gameServer) che l'host manda
// al Player 2 con ogni snapshot; il computer del P2 non assegna punti (game_engine._awardPoint) e quindi non può
// desincronizzarsi, qualunque cosa abbia salvato lui.
// Funzioni pure (le provano i test): le usa game_engine.js (_awardPoint, startNewMatch, _setupPointServe).

export const FAIR_KEY = 'natpf-tennis.formatoFiera';
// valori dell'indirizzo (?formato=…) che accendono o spengono l'opzione per quella pagina
const URL_ON = ['fiera', 'evento', 'event', 'fair'];
const URL_OFF = ['classico', 'normale', 'classic'];

// B20 (decisione dell'utente del 10/11 sull'audit B19): l'opzione ha tre valori, «No · Solo stesso schermo · Sì», e di base
// è «Solo stesso schermo» (prima: No/Sì, di base No). Con «Solo stesso schermo» il formato in fiera vale tra due persone
// nello stesso schermo; contro la CPU e nella sfida tra due computer resta il formato classico.
// Valore salvato (FAIR_KEY): '1' = Sì (come prima: chi aveva salvato «Sì» resta «Sì», e una versione di prima lo legge
// ancora acceso), 'no' = No, 'split' = Solo stesso schermo. '0' era il «No» a due valori, cioè il valore di base di
// allora rimesso a mano: come se non ci fosse niente di salvato, vale il valore di base di oggi
export const FAIR_MODES = Object.freeze(['no', 'split', 'si']);
export const FAIR_DEFAULT = 'split';
export const fairModeOf = v => (v === '1' || v === 'si' ? 'si' : v === 'no' ? 'no' : v === 'split' ? 'split' : FAIR_DEFAULT);
export const nextFairMode = m => FAIR_MODES[(Math.max(0, FAIR_MODES.indexOf(m)) + 1) % FAIR_MODES.length];
// modo dell'opzione: prima l'indirizzo (?formato=fiera → Sì, ?formato=classico → No, per quella pagina), poi la scelta salvata
export function readFairMode({ search = globalThis.location?.search || '', storage = globalThis.localStorage } = {}){
  const forced = fairFromUrl(search);
  if (forced !== null) return forced ? 'si' : 'no';
  try { return fairModeOf(storage?.getItem(FAIR_KEY)); } catch { return FAIR_DEFAULT; }
}
export function writeFairMode(mode, { storage = globalThis.localStorage } = {}){
  const m = FAIR_MODES.includes(mode) ? mode : FAIR_DEFAULT;
  try { storage?.setItem(FAIR_KEY, m === 'si' ? '1' : m); } catch {}
  return m;
}

// stato dell'opzione: prima l'indirizzo (se dice qualcosa), poi la scelta salvata; altrimenti il valore di base
export function fairFromUrl(search = ''){
  let v = null; try { v = new URLSearchParams(search || '').get('formato'); } catch {}
  v = String(v || '').trim().toLowerCase();
  return URL_ON.includes(v) ? true : URL_OFF.includes(v) ? false : null;
}
// il formato in fiera vale per questa partita? split: partita tra due persone nello stesso schermo
export function readFairFormat({ search = globalThis.location?.search || '', storage = globalThis.localStorage, split = false } = {}){
  const m = readFairMode({ search, storage });
  return m === 'si' || (m === 'split' && !!split);
}
// (compatibile con prima: acceso = «Sì», spento = «No»)
export function writeFairFormat(on, { storage = globalThis.localStorage } = {}){
  return writeFairMode(on ? 'si' : 'no', { storage }) === 'si';
}
// l'indirizzo comanda: dal pannello si può cambiare la scelta salvata, ma per questa pagina vale l'indirizzo
export const fairForcedByUrl = (search = globalThis.location?.search || '') => fairFromUrl(search) !== null;

// B35 (collaudo dell'utente del 13/11: «su un game BO1 la battuta era alternata e non fissa ad un giocatore»): quando il
// servizio passa ogni due punti (formato in fiera, o campo aperto nello stesso schermo: natpf_duo_rules.altServe) lo dice
// una riga chiara a inizio partita (sotto «Si gioca») e sul tabellone, finché dura la partita. Di base vale solo nello
// stesso schermo; contro la CPU e nella sfida tra due computer il servizio resta a un giocatore per game. Si spegne dal
// pannello dello stand → «Formato in fiera: No» (e «Campo aperto: No», già spento di base)
export const FAST_SERVE_LINE = 'Formato veloce: il servizio cambia ogni 2 punti';

const other = s => (s === 'opponent' ? 'player' : 'opponent');

// chi batte il punto numero `played` (0 = il primo) di un game iniziato da `gameServer`: A, B B, A A, B B…
export function pointServer(gameServer = 'player', played = 0){
  const n = Math.max(0, played | 0), first = gameServer === 'opponent' ? 'opponent' : 'player';
  return Math.floor((n + 1)/2) % 2 === 1 ? other(first) : first;
}

// chi vince il game dopo che `winner` ha fatto il punto (punti già contati), o null se il game continua.
// Classico: almeno 4 punti e 2 di scarto. Fiera: chi arriva a 4 vince (sul 40-40 il punto decisivo vale il game)
export function gameWinner(p = 0, o = 0, { fair = false } = {}){
  p = Math.max(0, p | 0); o = Math.max(0, o | 0);
  if (p < 4 && o < 4) return null;
  if (fair) return p === o ? null : p > o ? 'player' : 'opponent';
  return Math.abs(p - o) >= 2 ? (p > o ? 'player' : 'opponent') : null;
}

// punto decisivo: 40-40 con l'opzione accesa
export const isDecidingPoint = (p = 0, o = 0, { fair = false } = {}) => !!fair && (p | 0) === 3 && (o | 0) === 3;

// Partite lunghe con l'opzione accesa (decisione del ramo R4, semplice): «Al meglio di 5» (3 game per vincere, l'unica
// scelta del menu oltre il 3) diventa «Al meglio di 3». Misura (scripts/audit/formato-fiera.mjs, docs/b18): anche con
// il punto decisivo il meglio di 5 arriva a 8 minuti al p90 e 10 al massimo; il meglio di 3 resta entro 5,6 e 6,9.
// Spenta, o con altri valori (1 e 2 dal menu; le simulazioni usano 999), non cambia niente
export const FAIR_MAX_GAMES_LABEL = 'Con il formato in fiera la partita più lunga è al meglio di 3';
export const fairGamesToWin = (gamesToWin = 1, fair = false) => (fair && gamesToWin === 3 ? 2 : gamesToWin);

// Revisione R4: la scelta del menu (matchConfig.gamesToWinChosen) e il valore che vale in partita (matchConfig.gamesToWin,
// calcolato a ogni lettura con fairGamesToWin e il formato della partita, isFair()) restano separati. Chi scrive
// gamesToWin (menu, minigiochi, snapshot dell'host) scrive la scelta; prima startNewMatch sovrascriveva 3 con 2 e, spenta
// l'opzione, «Rigioca» restava al meglio di 3. Idempotente: la chiamano il costruttore del motore e startNewMatch (così
// vale anche per il motore senza grafica delle simulazioni e dei test)
export function installGamesToWin(mc, isFair = () => false){
  if (!mc || typeof mc !== 'object') return mc;
  if (Object.getOwnPropertyDescriptor(mc, 'gamesToWin')?.get) return mc;
  const chosen = mc.gamesToWin ?? mc.gamesToWinChosen ?? 1;
  delete mc.gamesToWin;
  mc.gamesToWinChosen = chosen;
  Object.defineProperty(mc, 'gamesToWin', {
    enumerable: true, configurable: true,
    get(){ return fairGamesToWin(mc.gamesToWinChosen, !!isFair()); },
    set(v){ mc.gamesToWinChosen = v; },
  });
  return mc;
}

// voce inglese del punto decisivo con le clip che ci sono già (public/voce: non c'è «deciding point», e la voce nuova
// non si genera): «Match Point» se chi vince il punto può chiudere la partita, altrimenti «Game Point». Sul 40-40 col
// punto decisivo è palla game (o match) per tutti e due, quindi la frase è vera
export function decidingVoice({ playerGames = 0, opponentGames = 0 } = {}, gamesToWin = 1){
  const n = Math.max(1, gamesToWin | 0);
  return (playerGames | 0) + 1 >= n || (opponentGames | 0) + 1 >= n ? 'Match Point' : 'Game Point';
}

// stato del servizio dopo un punto: { server, gameServer }. gameOver: il punto ha chiuso il game (il game dopo lo
// inizia l'altro di chi l'aveva iniziato). Classico: il battitore cambia solo a fine game, esattamente come prima
// (dal battitore di quel momento: allenamento e minigiochi lo cambiano a mano senza toccare gameServer)
export function nextServe({ server = 'player', gameServer = server, played = 0, gameOver = false, fair = false } = {}){
  const sv = server === 'opponent' ? 'opponent' : 'player';
  if (!fair){ const n = gameOver ? other(sv) : sv; return { server: n, gameServer: n }; }
  const gs = gameServer === 'opponent' ? 'opponent' : 'player';
  if (gameOver){ const n = other(gs); return { server: n, gameServer: n }; }
  return { server: pointServer(gs, played), gameServer: gs };
}
