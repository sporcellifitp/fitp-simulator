// B72 (richiesta dell'utente del 19/11): «selettore lingua IT/EN dall'app del telefono: permette di tradurre anche solo uno
// dei due campi in modalità doppio». La lingua la sceglie ogni giocatore sul SUO telefono (site/js/tennis/lingua.js,
// messaggio «lang»); il gioco la tiene per telefono (NatpfPhoneRacket.lang: P1 = engine.natpfPhone, P2 dello stesso
// schermo = engine.natpfPhone2) e mostra in quella lingua i testi della PARTITA. Menu, lobby, impostazioni e pagine dello
// staff restano in italiano (le sceglie lo staff sul PC).
// Regola dello schermo (screenLangs):
//   • gioco a una vista (contro il gioco, doppio contro il gioco, sfida tra due computer: ogni computer con il suo
//     telefono): tutto nella lingua del giocatore umano di questo computer (engine.natpfPhone);
//   • stesso schermo: ogni metà nella lingua del suo giocatore (scritte dei colpi, casella «Al servizio», istruzioni del
//     servizio, etichetta sotto la metà, tabellone della metà: ce n'è una copia per metà); i testi a tutta larghezza
//     (scritte grandi dei punti, conto alla rovescia, scheda finale, riquadro con due pause) in inglese solo se TUTTI E DUE
//     hanno scelto EN, altrimenti in italiano. Il riquadro della pausa di un solo telefono è nella lingua di quel giocatore.
// Come: i testi restano scritti in italiano (o con le etichette inglesi del motore) dove nascono; si traducono quando si
// mostrano (tx), con il motore di lingua.js e il dizionario qui sotto. In italiano tx è natpf_i18n.t di sempre: con IT
// niente cambia. Niente lavoro per fotogramma: le traduzioni si ricordano (cache del motore) e chi ridisegna a ogni giro
// confronta il testo prima di scriverlo, come prima.
// Il nome «CPU» nei testi (prima del B72) e «Avversario»/«Avversari»/«compagno» (ramo b72-avversario) diventano
// «Opponent»/«Opponents»/«partner»: il dizionario conosce tutte e due le forme.
import { t as itText, scoreText as itScore } from './natpf_i18n.js';
import { createTranslator, normLang, ofName, translateDom } from '@natpf/tennis/lingua.js';
import { shortNames } from './natpf_scoreboard.js';

export { normLang };
export const isLang = l => l === 'it' || l === 'en';
// lingua di un telefono (null o pagina di prima: IT)
export const langOfPhone = p => normLang(p?.lang);

/* ---------- regola dello schermo ---------- */
// split: stesso schermo; p1, p2: lingue dei due telefoni; local: lingua del giocatore umano di questo computer (a una vista)
// → { left, right, center }: metà sinistra (P1), metà destra (P2), testi a tutta larghezza
export function screenLangs({ split = false, p1 = 'it', p2 = 'it', local = 'it' } = {}){
  if (!split){ const l = normLang(local); return { left: l, right: l, center: l }; }
  const a = normLang(p1), b = normLang(p2);
  return { left: a, right: b, center: a === 'en' && b === 'en' ? 'en' : 'it' };
}

/* ---------- dizionario dei testi di partita ---------- */
const OPP = "(?:la CPU|l[’']avversario|il gioco)", OPPS = "(?:le CPU|gli avversari|le due CPU)";
const OPP_OF = "(?:della CPU|dell[’']avversario)", OPPS_OF = "(?:degli avversari|delle CPU)";
const BAND = { Bambino: 'Child', Ragazzo: 'Teen', Adulto: 'Adult', 'Sì': 'Yes' };
const LEVEL = { Bambini: 'Kids', Facile: 'Easy', Evento: 'Event', Esperta: 'Expert', Esperto: 'Expert', Leggenda: 'Legend', Pro: 'Pro' };
// «di Giulia», «del Player 2», «della CPU», «dell'avversario», «degli avversari» → di chi, in inglese
function ofWho(s){
  if (new RegExp(`^${OPP_OF}$`).test(s)) return "Opponent's";
  if (new RegExp(`^${OPPS_OF}$`).test(s)) return "Opponents'";
  const m = /^(?:di|del|della) (.+)$/.exec(s);
  return m ? ofName(m[1]) : null;
}
// chi: «la CPU», «l'avversario», «gli avversari», un nome → in inglese (il nome resta)
function whoEn(s){
  if (new RegExp(`^${OPP}$`, 'i').test(s)) return 'the opponent';
  if (new RegExp(`^${OPPS}$`, 'i').test(s)) return 'the opponents';
  return s;
}
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
// squadra: «Tu», «CPU», «2 CPU», «Avversario», «Avversari», «X + CPU», «X + compagno» → in inglese (il nome resta)
function teamEn(s){
  const one = x => ({ Tu: 'You', CPU: 'Opponent', '2 CPU': 'Opponents', Avversario: 'Opponent', Avversari: 'Opponents', compagno: 'partner', Compagno: 'Partner', Amico: 'Friend' }[x] ?? x);
  const m = /^(.+?) \+ (CPU|compagno)$/.exec(s);
  return m ? `${one(m[1])} + partner` : one(s);
}
export const GAME_EXACT = [
  // esito del colpo (natpf_shot_feedback.shotQuality) e la sua riga piccola
  ['Perfetto', 'Perfect'], ['Anticipo', 'Early'], ['Ritardo', 'Late'], ['Buono', 'Good'], ['Super!', 'Super!'], ['Colpita', 'Hit'],
  ['Fuori', 'Out'], ['In rete', 'Net'], ['Troppo lunga', 'Too long'], ['Troppo presto', 'Too early'], ['Troppo tardi', 'Too late'],
  ['Troppo lontana', 'Too far'], ['Mancata', 'Missed'], ['compagno', 'partner'], ['avversario', 'opponent'],
  // istruzioni del servizio (natpf_serve_coach.js)
  ['Colpisci!', 'Hit!'], ['Aspetta che salga…', 'Wait for it to rise…'], ['Colpisci quando la palla è in alto', 'Hit when the ball is high'],
  ['Lancio a vuoto: riprova', 'Missed toss: try again'], ['Lancio automatico', 'Automatic toss'], ['Servizio automatico', 'Automatic serve'],
  ['Al servizio, batti tu', 'Your serve'], ['Il gioco batte per chi è al servizio', 'The game serves for whoever is serving'],
  ['Prima del punto più alto: palla al centro', 'Before the highest point: ball to the center'], ['dopo: larga', 'after: wide'],
  // scritta del segnale del momento giusto (natpf_timing_cue.CUE_HINT; revisione B72, L1)
  ['Colpisci quando il cerchio diventa verde', 'Hit when the circle turns green'],
  // etichetta del gesto in basso al centro (natpf_gesture_hud.js: colpo letto, esito, gesto ignorato e perché; revisione B72, L2)
  ['Gesto ignorato', 'Swing ignored'], ['Colpo', 'Shot'], ['Top spin', 'Topspin'], ['Piatto', 'Flat'], ['Molto in anticipo', 'Very early'], ['Molto in ritardo', 'Very late'],
  ['aspetta la palla', 'waiting for the ball'], ['nessuna palla da colpire', 'no ball to hit'], ['arrivato in ritardo dalla rete', 'arrived late over the network'],
  ['palla che si allontana', 'ball moving away'],
  // casella «Al servizio» e tabellone
  ['Al servizio', 'Serving'], ['Tu', 'You'], ['CPU', 'Opponent'], ['2 CPU', 'Opponents'], ['Avversario', 'Opponent'], ['Avversari', 'Opponents'],
  ['Punto decisivo', 'Deciding point'], ['Parità', 'Deuce'], ['Vantaggio', 'Advantage'], ['1 game', '1 game'], ['Partita a 1 game', '1-game match'],
  ['punto decisivo sul 40-40', 'deciding point at 40-40'],
  // punti, game e partita (natpf_point_call.js)
  ['Punto tuo', 'Your point'], ['Errore tuo: palla fuori', 'Your error: ball out'], ['Errore tuo: palla in rete', 'Your error: ball in the net'],
  ['Vincente!', 'Winner!'], ['Ace!', 'Ace!'], ['Palla non presa', 'Missed ball'], ['Vantaggio tuo', 'Your advantage'],
  ['Game tuo', 'Your game'], ['Partita tua!', 'You win the match!'], ['Hai vinto!', 'You win!'], ['Avete vinto!', 'You win!'],
  ['Vince la CPU', 'The opponent wins'], ['Vince l’avversario', 'The opponent wins'], ["Vince l'avversario", 'The opponent wins'],
  ['Vincono le CPU', 'The opponents win'], ['Vincono gli avversari', 'The opponents win'],
  ['Formato veloce: il servizio cambia ogni 2 punti', 'Fast format: the serve changes every 2 points'],
  // barre della potenza e dell'energia (natpf_power_hud.js)
  ['Potenza', 'Power'], ['Forte', 'Strong'], ['Fortissimo', 'Very strong'], ['SUPER!', 'SUPER!'], ['Energia', 'Energy'], ['Stanco!', 'Tired!'], ['Affaticato', 'Weary'],
  // etichetta sotto la metà nello stesso schermo (natpf_split_ui.js)
  ['Telefono in pausa', 'Phone paused'], ['Mancino', 'Left-handed'], ['Mano sinistra', 'Left hand'],
  // pausa per il telefono (natpf_phone_watch.js)
  ['Partita in pausa', 'Match paused'], ['Telefono in pausa.', 'Phone paused.'], ['Ricollega il telefono', 'Reconnect the phone'],
  ['La partita è in pausa e riprende da sola appena il telefono torna.', 'The match is paused and resumes by itself as soon as the phone is back.'],
  ['Telefono scollegato: riapri la pagina sul telefono, si ricollega da solo.', 'Phone disconnected: reopen the page on the phone, it reconnects by itself.'],
  ['Telefono non pronto: finisci la calibrazione sul telefono.', 'Phone not ready: finish the calibration on the phone.'],
  ['Il telefono non manda più il movimento: sul telefono tocca «Riattiva i sensori».', 'The phone no longer sends movement: on the phone tap “Restart the sensors”.'],
  ['Riapri la pagina del gioco sul telefono: si ricollega da solo.', 'Reopen the game page on the phone: it reconnects by itself.'],
  ['Se non torna tra pochi secondi (pagina ricaricata), inquadra di nuovo il QR.', 'If it does not come back in a few seconds (page reloaded), scan the QR code again.'],
  ['Non è più un telefono dello stand: lo staff lo abbina di nuovo.', 'It is no longer a stand phone: the staff pairs it again.'],
  ['Sul telefono è stato toccato «Scollega»: per giocare ancora inquadra di nuovo il QR.', '“Disconnect” was tapped on the phone: to play again, scan the QR code again.'],
  ['Il telefono si ricollega da solo appena torna la rete. Se non torna, riapri la pagina del gioco sul telefono.', 'The phone reconnects by itself as soon as the network is back. If it does not come back, reopen the game page on the phone.'],
  ['si ricollega da solo', 'reconnects by itself'], ['inquadra il QR', 'scan the QR code'],
  // conto alla rovescia prima della partita (natpf_prematch.js) e scritta d'inizio
  ['Preparati', 'Get ready'], ['La partita sta per cominciare', 'The match is about to start'], ['Prima qualche scambio di prova', 'First a few practice rallies'],
  ["Allenati un po'!", 'Warm up a bit!'], ['Palle facili dal lanciapalle: colpiscile, il gioco impara il tuo colpo', 'Easy balls from the ball machine: hit them, the game learns your shot'],
  ['Palleggiate tra voi: il gioco impara i vostri colpi', 'Rally with each other: the game learns your shots'],
  ['Batti tu: lancia la palla e colpisci', 'Your serve: toss the ball and hit'], ['Batti sempre tu: lancia la palla e colpisci', 'You always serve: toss the ball and hit'],
  // scheda finale (natpf_match_stats.endScreen, natpf_end_card.js)
  ['Fine partita', 'Match over'], ['Bella sfida!', 'Great match!'], ['Prossima volta andrà ancora meglio!', 'Next time it will go even better!'],
  ['Ospite, fuori classifica', 'Guest, not ranked'], ['Rivincita', 'Rematch'], ['Rivincita!', 'Rematch!'], ['Gioca ancora', 'Play again'],
  ['Rivincita dai telefoni: toccate «Rivincita» tutti e due', 'Rematch from the phones: both of you tap “Rematch”'],
  // card della fine partita (natpf_end_card.js, natpf_trofei.js, natpf_match_stats.bestLabel)
  ['MVP della partita', 'Match MVP'], ['Bella sfida', 'Great match'], ['Sfida a due', 'Head to head'],
  ['Cecchino', 'Sharpshooter'], ['Razzo', 'Rocket'], ['Maratoneta', 'Marathoner'], ['Asso', 'Ace'], ['Vincente', 'Winner'], ['Super', 'Super'],
  ['Game a zero', 'Love game'], ['Rimonta', 'Comeback'], ['In serie', 'On a roll'], ['Muro', 'Wall'], ['Prima volta', 'First time'], ['Re di oggi', 'King of the day'],
  ['prima partita', 'first match'], ['un game a zero', 'one love game'], ['vinta da un game sotto', 'won from a game down'],
  ['km/h, colpo più forte', 'km/h, hardest shot'], ['km/h, il tuo colpo più forte', 'km/h, your hardest shot'], ['colpi nello scambio più lungo', 'shots in the longest rally'],
  ['partita giocata', 'match played'], ['vincente', 'winner'], ['vincenti', 'winners'],
  // etichette inglesi del motore (natpf_i18n): restano in inglese, qualcuna più chiara
  ['CPU DROP SHOT', 'Opponent’s drop shot'], ['Start', 'Play'],
];
export const GAME_PHRASES = [
  // motivi dell'esito (natpf_shot_feedback.timingWhy, natpf_stroke_outcome.dropCause, game_engine: situazione del colpo)
  ['troppo presto', 'too early'], ['troppo tardi', 'too late'], ['in anticipo', 'early'], ['in ritardo', 'late'], ['da troppo lontano', 'from too far'],
  ['gesto troppo forte', 'swing too hard'], ['scambio lungo', 'long rally'], ['in corsa', 'on the run'], ['in allungo', 'stretched'], ['palla debole', 'weak ball'],
  ['palla lontana', 'ball too far'], ['senza preparazione', 'no backswing'], ['palla veloce', 'fast ball'], ['colpo difficile', 'hard shot'],
  // nomi dei colpi
  ['Palla corta', 'Drop shot'], ['Schiacciata', 'Smash'], ['Pallonetto', 'Lob'], ['Tagliato', 'Slice'], ['Dritto', 'Forehand'], ['Rovescio', 'Backhand'],
  ['Al meglio di', 'Best of'],
];
export const GAME_TEMPLATES = [
  // servizio
  [/^(.+), batti tu$/, m => `${m[1]}, your serve`],
  [/^Tra (\d+) s batte il gioco$/, m => `In ${m[1]} s the game serves`],
  [/^Tra (\d+) s la lancia il gioco$/, m => `In ${m[1]} s the game tosses the ball`],
  [/^Il gioco batte per (.+)$/, m => `The game serves for ${m[1]}`],
  // punti
  [new RegExp(`^Punto (${OPP_OF}|${OPPS_OF}|di .+|del .+)$`), m => `${ofWho(m[1])} point`],
  [/^Punto (.+)$/, m => `Point ${m[1]}`],
  [new RegExp(`^Errore (${OPP_OF}|${OPPS_OF}|di .+|del .+): palla (fuori|in rete)$`), m => `${ofWho(m[1])} error: ball ${m[2] === 'fuori' ? 'out' : 'in the net'}`],
  [new RegExp(`^Vincente (${OPP_OF}|${OPPS_OF}|di .+|del .+)$`), m => `${ofWho(m[1])} winner`],
  [new RegExp(`^Ace (${OPP_OF}|${OPPS_OF}|di .+|del .+)$`), m => `${ofWho(m[1])} ace`],
  [new RegExp(`^(${OPP}|${OPPS}|.+) non ci (?:arriva|arrivano)$`, 'i'), m => `${cap(whoEn(m[1]))} can’t reach it`],
  [/^Colpo a vuoto di (.+)$/, m => `Missed swing by ${m[1]}`],
  [new RegExp(`^Vantaggio (${OPP_OF}|${OPPS_OF}|di .+|del .+)$`), m => `${ofWho(m[1])} advantage`],
  [/^Vantaggio (.+)$/, m => `Advantage ${m[1]}`],
  [new RegExp(`^Game (${OPP_OF}|${OPPS_OF}|di .+|del .+)$`), m => `${ofWho(m[1])} game`],
  [/^Game (\d+)-(\d+)$/, m => `Games ${m[1]}-${m[2]}`],
  [new RegExp(`^Partita (${OPP_OF}|${OPPS_OF}|di .+|del .+)$`), m => { const w = ofWho(m[1]); return /^Opponents'/.test(w) ? 'The opponents win the match' : /^Opponent's/.test(w) ? 'The opponent wins the match' : `${w.slice(0, -2)} wins the match`; }],
  [/^Vince (.+)!$/, m => `${m[1]} wins!`],
  [/^Vincono (.+)$/, m => `${cap(whoEn(m[1]))} win`],
  // chi batte (inizio partita, natpf_point_call.firstServeText; conto, natpf_prematch.prematchServeLine)
  [/^Sorteggio: batte per primo (.+)$/, m => `Coin toss: ${whoEn(m[1])} serves first`],
  [/^Sorteggio: batte sempre (.+)$/, m => `Coin toss: ${whoEn(m[1])} always serves`],
  [/^Sorteggio: batte (.+)$/, m => `Coin toss: ${whoEn(m[1])} serves`],
  [/^Batte per prim[oa] (.+)$/, m => `${cap(whoEn(m[1]))} serves first`],
  [/^Batte sempre (.+)$/, m => `${cap(whoEn(m[1]))} always serves`],
  [/^Batte (.+)$/, m => `${cap(whoEn(m[1]))} serves`],
  // tabellone
  [/^Al meglio di (\d+)( game)?$/, m => `Best of ${m[1]}${m[2] ? ' games' : ''}`],
  [/^(.+?) \+ (CPU|compagno)$/, m => teamEn(m[0])],
  // etichetta sotto la metà: aiuto al più giovane (natpf_duo_rules.helpLabel)
  [/^Aiuto: (.+)$/, m => `Help: ${BAND[m[1]] || m[1]}`],
  // pausa per il telefono (natpf_phone_watch.js): titoli e testi con il nome o il numero
  [/^Telefono (\d)$/, m => `Phone ${m[1]}`],
  [/^(.+): aspetto il telefono (?:di|del) (.+)$/, (m, T) => `${T(m[1])}: waiting for ${ofName(m[2])} phone`],
  [/^Telefono( in pausa| di nuovo pronto)$/, m => `Phone${m[1] === ' in pausa' ? ' paused' : ' ready again'}`],
  [/^(Telefono (?:\d|(?:di|del) .+?)): segnale debole, aspetto che torni…$/, (m, T) => `${T(m[1])}: weak signal, waiting for it to come back…`],
  [/^(Telefono (?:\d|(?:di|del) .+?)): pagina chiusa$/, (m, T) => `${T(m[1])}: page closed`],
  [/^(Telefono (?:\d|(?:di|del) .+?)) scollegato dal telefono$/, (m, T) => `${T(m[1])} disconnected from the phone`],
  [/^(Telefono (?:\d|(?:di|del) .+?)) scollegato$/, (m, T) => `${T(m[1])} disconnected`],
  [/^(Telefono (?:\d|(?:di|del) .+?)) scollegato \(da (\d+) s\)$/, (m, T) => `${T(m[1])} disconnected (for ${m[2]} s)`],
  [/^Telefono (?:di|del) ([^:]+?)( in pausa| di nuovo pronto)?$/, m =>`${ofName(m[1])} phone${m[2] === ' in pausa' ? ' paused' : m[2] ? ' ready again' : ''}`],
  [/^Schermo del telefono spento(?: da (\d+) s)?: riaccendi lo schermo e tocca la pagina del gioco, si riprende da solo\.$/, m => `Phone screen off${m[1] ? ` for ${m[1]} s` : ''}: turn the screen on and tap the game page, it resumes by itself.`],
  [/^Telefono scollegato con lo schermo spento(?: da (\d+) s)?: riaccendilo e torna alla pagina, si ricollega da solo\. Pagina chiusa\? Inquadra di nuovo il QR\.$/, m => `Phone disconnected with the screen off${m[1] ? ` for ${m[1]} s` : ''}: turn it on and go back to the page, it reconnects by itself. Page closed? Scan the QR code again.`],
  [/^Senza segnale da (\d+) s: si ricollega da solo appena torna la rete\. Se non torna, riapri la pagina del gioco sul telefono\.$/, m => `No signal for ${m[1]} s: it reconnects by itself as soon as the network is back. If it does not come back, reopen the game page on the phone.`],
  [/^Si riprende tra (\d+)…$/, m => `Resuming in ${m[1]}…`],
  [/^Ricollega il telefono (?:di|del) (.+)$/, m => `Reconnect ${ofName(m[1])} phone`],
  [/^Telefono (?:di|del) (.+): inquadra questo QR$/, m => `${ofName(m[1])} phone: scan this QR code`],
  // scheda finale
  [/^Fine partita · livello (.+)$/, m => `Match over · ${LEVEL[m[1]] || m[1]} level`],
  [/^Fine partita · (\d+) game a (\d+)$/, m => `Match over · ${m[1]} game${m[1] === '1' ? '' : 's'} to ${m[2]}`],
  [/^Bella sfida, (.+)!$/, m => `Great match, ${m[1]}!`],
  [new RegExp(`^(La CPU ha vinto|L[’']avversario ha vinto|Hanno vinto le CPU|Hanno vinto gli avversari|Ha vinto (.+)|Hanno vinto (.+)) questa volta\\. Ecco cosa ti è venuto meglio:$`), m => {
    // (unione B72: il ramo b72-avversario scrive «Ha vinto l'avversario questa volta…» con l'articolo dopo il verbo: chi ha
    // vinto passa anche da whoEn, così «l'avversario» diventa «The opponent» e un nome resta com'è)
    const who = m[2] || m[3], team = who ? teamEn(who) : '', w = team ? whoEn(team) : '';
    const head = who ? `${w !== team ? cap(w) : team} won` : /^Hanno/.test(m[1]) ? 'The opponents won' : 'The opponent won';
    return `${head} this time. Here is what you did best:`;
  }],
  [/^Scambio più lungo della partita: (\d+) colpi$/, m => `Longest rally of the match: ${m[1]} shots`],
  [/^(\d+)° posto nella classifica di oggi$/, m => `${m[1]}${ord(+m[1])} place in today’s ranking`],
  [/^(\d+) punti nella partita di oggi$/, m => `${m[1]} points in today’s match`],
  [/^(\d+) punti$/, m => `${m[1]} points`],
  [/^Prossima volta prova il livello (.+)$/, m => `Next time try the ${LEVEL[m[1]] || m[1]} level`],
  [/^(.+) vuole la rivincita$/, m => `${m[1]} wants a rematch`],
  // card: livello, trofei, record, riquadri dei numeri
  [/^Livello (.+)$/, m => `${LEVEL[m[1]] || m[1]} level`],
  [/^(\d+) (colpo Perfetto|colpi Perfetti)$/, m => `${m[1]} Perfect shot${m[1] === '1' ? '' : 's'}`],
  [/^(colpo Perfetto|colpi Perfetti)$/, m => `Perfect shot${m[1] === 'colpo Perfetto' ? '' : 's'}`],
  [/^scambio di (\d+) colpi$/, m => `rally of ${m[1]} shots`],
  [/^(\d+) (servizio vincente|servizi vincenti)$/, m => `${m[1]} service winner${m[1] === '1' ? '' : 's'}`],
  [/^(\d+) (vincente|vincenti)$/, m => `${m[1]} winner${m[1] === '1' ? '' : 's'}`],
  [/^(\d+) (colpo super|colpi super)$/, m => `${m[1]} super shot${m[1] === '1' ? '' : 's'}`],
  [/^(colpo super riuscito|colpi super riusciti)$/, m => `super shot${m[1] === 'colpo super riuscito' ? '' : 's'} landed`],
  [/^(\d+) game a zero$/, m => `${m[1]} love games`],
  [/^(\d+) (palla match annullata|palle match annullate)$/, m => `${m[1]} match point${m[1] === '1' ? '' : 's'} saved`],
  [/^da (\d+) punti sotto$/, m => `from ${m[1]} points down`],
  [/^(\d+) punti di fila$/, m => `${m[1]} points in a row`],
  [/^(\d+) colpi di fila in campo$/, m => `${m[1]} shots in a row in the court`],
  [/^(\d+)° nella classifica di oggi$/, m => `${m[1]}${ord(+m[1])} in today’s ranking`],
  [/^(punto vinto|punti vinti)$/, m => `point${m[1] === 'punto vinto' ? '' : 's'} won`],
  [/^(colpo giocato|colpi giocati)$/, m => `shot${m[1] === 'colpo giocato' ? '' : 's'} played`],
  [new RegExp(`^(vincente|vincenti) che (?:la CPU|l[’']avversario) non ha preso$`), m => `${m[1] === 'vincente' ? 'winner' : 'winners'} the opponent didn’t reach`],
  [/^(vincente|vincenti) che gli avversari non hanno preso$/, m => `${m[1] === 'vincente' ? 'winner' : 'winners'} the opponents didn’t reach`],
  // «Prossimo trofeo: Cecchino d’argento a 120 km/h · 3 colpi Perfetti in più» (natpf_trofei.nextTrophy)
  [/^Prossimo trofeo: (.+)$/, (m, T) => `Next trophy: ${T(m[1])}`],
  [/^(.+?) (di bronzo|d’argento|d’oro)(?: a (\d+) km\/h| con uno scambio di (\d+) colpi)?$/, (m, T) => `${{ 'di bronzo': 'Bronze', 'd’argento': 'Silver', 'd’oro': 'Gold' }[m[2]]} ${T(m[1])}${m[3] ? ` at ${m[3]} km/h` : m[4] ? ` with a rally of ${m[4]} shots` : ''}`],
  [/^(\d+) (.+) in più$/, m => { const u = UNIT_EN[m[2]]; return u ? `${m[1]} more ${u}` : null; }],
  [/^colpisci quando l’anello diventa verde$/, () => 'hit when the ring turns green'],
  [/^Record di oggi! (\d+) km\/h$/, m => `Today’s record! ${m[1]} km/h`],
  [/^Record di oggi! Scambio di (\d+) colpi$/, m => `Today’s record! Rally of ${m[1]} shots`],
  [/^Record di oggi: (\d+) km\/h$/, m => `Today’s record: ${m[1]} km/h`],
  [/^Record di oggi: scambio di (\d+) colpi$/, m => `Today’s record: rally of ${m[1]} shots`],
  [/^manca (.+)$/, m => `waiting for ${m[1]}`],
  // nomi delle squadre e degli avversari
  [/^(Tu|CPU|2 CPU|Avversario|Avversari)$/, m => teamEn(m[1])],
  // (unione B72) avversario con il livello scelto per nome (natpf_who.opponentLevelName: «Avversario esperto», «Avversario
  // Leggenda») e la palla corta dell'avversario già in italiano (natpf_i18n «CPU DROP SHOT»)
  [/^Avversario (bambini|facile|evento|esperta|esperto|leggenda)$/i, m => `${LEVEL[cap(m[1].toLowerCase())]} opponent`],
  [new RegExp(`^Palla corta (${OPP_OF}|${OPPS_OF})$`), m => `${/^Opponents/.test(ofWho(m[1])) ? 'Opponents’' : 'Opponent’s'} drop shot`],
  // riga di una pausa quando ce ne sono due: «titolo: testo»
  [/^(Telefono[^:]*): (.+)$/, (m, T) => { const a = T(m[1]), b = T(m[2]); return a !== m[1] || b !== m[2] ? `${a}: ${b}` : null; }],
  // per ultimo: un nome con il punteggio o i game («Giulia 15», «Marco 1» nello stesso schermo) resta com'è (niente pezzi
  // tradotti dentro un nome)
  [/^(.+) (\d+|Ad)$/u, m => m[0]],
];
// unità del «Prossimo trofeo» (natpf_trofei UNIT)
const UNIT_EN = { 'colpo Perfetto': 'Perfect shot', 'colpi Perfetti': 'Perfect shots', 'km/h': 'km/h', 'colpo nello scambio': 'shot in the rally', 'colpi nello scambio': 'shots in the rally',
  'colpo di fila in campo': 'shot in a row in the court', 'colpi di fila in campo': 'shots in a row in the court', vincente: 'winner', vincenti: 'winners', 'punto di fila': 'point in a row',
  'punti di fila': 'points in a row', 'servizio vincente': 'service winner', 'servizi vincenti': 'service winners', 'colpo super': 'super shot', 'colpi super': 'super shots' };
const ord = n =>(n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
export const gameEn = createTranslator({ exact: GAME_EXACT, templates: GAME_TEMPLATES, phrases: GAME_PHRASES });

// Testo da mostrare nella lingua: 'it' = l'HUD di sempre (natpf_i18n.t: etichette inglesi del motore in italiano), 'en' =
// i testi italiani del gioco in inglese e le etichette del motore come sono (con le correzioni del dizionario)
export function tx(text, lang = 'it'){
  if (text === null || text === undefined) return text;
  if (lang !== 'en') return itText(text);
  return gameEn(String(text)).replace(/\.\.\./g, '…');
}
// Testo italiano del gioco che prima non passava da natpf_i18n (istruzioni del servizio, pausa del telefono, etichette
// delle metà, conto alla rovescia): in italiano esattamente com'è, in inglese dal dizionario
export const say = (text, lang = 'it') => (lang === 'en' && text !== null && text !== undefined ? gameEn(String(text)) : text);
// Nome di una squadra o di un giocatore nella lingua (revisione B72, L3): si traducono solo i nomi dati dal gioco («Tu»,
// «CPU», «2 CPU», «Avversario», «Avversari», «X + compagno», «X + CPU»); un nome scritto da un giocatore resta com'è anche
// se è una parola del dizionario («Vince», «Asso», «Muro»: prima diventavano «Wins», «Ace», «Wall»)
export const nameTx = (name, lang = 'it') => (lang === 'en' && name !== null && name !== undefined ? teamEn(String(name)) : name);
// Testi per ruolo, non per testo (revisione B72, L3): la pastiglia di chi vince (scheda del giocatore nello stesso schermo,
// natpf_match_stats) e la corona della card (natpf_end_card) dicono «Vince»; nel pezzo di pagina hanno data-tx (testo) o
// data-tx-title (title) con il ruolo, e si traducono da qui. Così «Vince» come nome resta un nome
export const ROLE_EN = Object.freeze({ vince: 'Wins' });
// nomi nei pezzi di pagina della fine partita (card e schede dei giocatori): non passano dal dizionario
export const NAME_SEL = '.card-name, .end-pname';
// un testo o un attributo di un elemento nella lingua, con l'italiano ricordato nell'elemento (si torna indietro con 'it')
function swapText(node, key, lang, en){
  const ds = node.dataset || (node.dataset = {}), k = `it${key}`;
  const cur = key === 'Title' ? node.getAttribute?.('title') : node.textContent;
  if (cur === null || cur === undefined) return 0;
  const it = ds[k] ?? cur, want = lang === 'en' ? en(it) : it;
  if (lang === 'en' && want !== it) ds[k] = it;
  if (want === cur) return 0;
  if (key === 'Title') node.setAttribute('title', want); else node.textContent = want;
  return 1;
}
// Testi già scritti in un pezzo di pagina (card della fine partita, riquadri dei numeri) nella lingua: dal dizionario, con
// l'originale ricordato (lingua.translateDom). Si chiama quando il pezzo è appena scritto, non a ogni fotogramma.
// Revisione B72 (L3): i nomi (NAME_SEL) saltano il dizionario e passano da nameTx; i testi con un ruolo (data-tx,
// data-tx-title) da ROLE_EN
export function translateEl(el, lang = 'it'){
  if (!el) return 0;
  let n = translateDom(el, lang, { T: gameEn, skip: NAME_SEL });
  const all = sel => [...(el.matches?.(sel) ? [el] : []), ...(el.querySelectorAll?.(sel) || [])];
  for (const x of all(NAME_SEL)){ n += swapText(x, 'Text', lang, t => nameTx(t, 'en')); if (x.hasAttribute?.('title')) n += swapText(x, 'Title', lang, t => nameTx(t, 'en')); }
  for (const x of all('[data-tx]')) n += swapText(x, 'Text', lang, t => ROLE_EN[x.dataset.tx] ?? t);
  for (const x of all('[data-tx-title]')) n += swapText(x, 'Title', lang, t => ROLE_EN[x.dataset.txTitle] ?? t);
  return n;
}
// Punteggio del game (natpf_i18n.scoreText): in inglese «0», «Deuce», «Advantage» / «AD»
export function scoreTx(value, lang = 'it', { short = false } = {}){
  if (lang !== 'en') return itScore(value, { short });
  const v = String(value ?? '');
  if (v === '00') return '0';
  if (/^ad (in|out)$/i.test(v)) return short ? 'AD' : 'Advantage';
  if (/^ad$/i.test(v)) return 'AD';
  if (/^deuce$/i.test(v)) return short ? 'DEUCE' : 'Deuce';
  return v.replace(/\b00\b/g, '0');
}

/* ---------- tabellone (natpf_scoreboard.scoreboardView) ---------- */
// La vista del tabellone nella lingua: nomi dati dal gioco («Tu», «CPU», «Avversario», «Tu + compagno»…) e sigle rifatte
// con quei nomi («YOU», «OPP»), etichetta dentro il riquadro, formato e scritta del momento (per lo screen reader). I nomi
// scritti dai giocatori restano (revisione B72, L3: con nameTx, non con il dizionario: «Vince» non diventa «Wins»). In
// italiano la vista com'è
export function localizeBoard(v, lang = 'it'){
  if (lang !== 'en' || !v?.rows) return v;
  const rows = v.rows.map(r => ({ ...r, name: nameTx(r.name, 'en') }));
  if (rows.some((r, i) => r.name !== v.rows[i].name)){
    const sh = shortNames(rows[0].name, rows[1]?.name ?? '');
    rows[0].short = sh.me; if (rows[1]) rows[1].short = sh.them;
  }
  return { ...v, rows, format: gameEn(v.format || ''), label: gameEn(v.label || ''), tag: v.tag ? { ...v.tag, text: gameEn(v.tag.text) } : v.tag };
}
// «(al servizio)» per lo screen reader, nella lingua del tabellone
export const servingNote = lang => (lang === 'en' ? ' (serving)' : ' (al servizio)');

/* ---------- lingua di ogni parte dello schermo (in gioco) ---------- */
// Chi gioca qui: a una vista il telefono di questo computer (anche il Player 2 della sfida tra due computer, sul suo PC),
// nello stesso schermo i due telefoni. Funzioni lette quando si scrive un testo (niente stato da tenere allineato)
export function langView(engine){
  const E = engine || {}, split = !!E.natpfSplit?.active;
  return screenLangs({ split, p1: langOfPhone(E.natpfPhone), p2: langOfPhone(E.natpfPhone2), local: langOfPhone(E.natpfPhone) });
}
// lingua per un posto: 'left' | 'right' | 'center', oppure il giocatore 'p1' | 'p2' (nello stesso schermo la sua metà; a
// una vista il giocatore di questo computer)
export function langAt(engine, where = 'center'){
  const v = langView(engine);
  if (where === 'p1') return v.left;
  if (where === 'p2') return v.right;
  return v[where] || v.center;
}
// chiave delle lingue di adesso (per ridisegnare solo quando cambia)
export const langKey = engine => { const v = langView(engine); return `${v.left}|${v.right}|${v.center}`; };

// «Nuovo giocatore», chiosco, «Prossimo giocatore» della fiera (natpf_hand.resetHands): la lingua torna IT per Player 1 e
// Player 2, come la mano torna «Destra». I telefoni collegati la ricevono subito (cfg lg); uno scollegato al ritorno
// (cfg al ricollegamento; il suo annuncio non vale più perché il gioco ora la conosce)
export function resetLangs(ui, causa = 'nuovo giocatore'){
  const E = ui?.engine;
  for (const p of [E?.natpfPhone, E?.natpfPhone2]) if (p?.setLang) p.setLang('it', causa);
}

/* ---------- testi fissi della partita che cambiano con la lingua ---------- */
// Casella «Al servizio» (a una vista quella del motore, nello stesso schermo quella di ogni metà), etichette «Mancino»
// sotto le metà, tabellone: si riscrivono quando cambia la lingua di un telefono (onLang) o quando nascono (natpf_split.js
// crea le caselle delle metà al primo disegno diviso). Mai a ogni fotogramma
export class NatpfLang {
  constructor(engine, ui = null){
    this.engine = engine; this.ui = ui; this.key = '';
    this.bound = new Set();
    this.bind(engine?.natpfPhone);
  }
  // ascolta un telefono (il P2 dello stesso schermo nasce dopo: natpf_split_ui.prepare lo aggancia)
  bind(p){
    if (!p?.onLang || this.bound.has(p)) return;
    this.bound.add(p);
    p.onLang(() => this.refresh(true));
  }
  view(){ return langView(this.engine); }
  at(where){ return langAt(this.engine, where); }
  tx(text, where = 'center'){ return tx(text, langAt(this.engine, where)); }
  // testo italiano del gioco in una lingua già scelta ('it' | 'en'): com'è in italiano (vedi say)
  say(text, lang = 'it'){ return say(text, lang); }
  // riscrive i testi fissi se le lingue sono cambiate (force: anche se la chiave è la stessa, per gli elementi nati adesso)
  refresh(force = false){
    const E = this.engine, k = langKey(E);
    if (!force && k === this.key) return false;
    this.key = k;
    if (typeof document === 'undefined') return true;
    const v = langView(E), set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
    set(document.querySelector('#server-tag .server-tag-text'), tx('Al servizio', v.center));
    set(document.querySelector('#server-tag-p1 .server-tag-text'), tx('Al servizio', v.left));
    set(document.querySelector('#server-tag-p2 .server-tag-text'), tx('Al servizio', v.right));
    for (const id of ['p1', 'p2']){
      const h = document.querySelector(`[data-split-tag="${id}"] .hand-tag`);
      if (h){ const l = id === 'p1' ? v.left : v.right; set(h, tx('Mancino', l)); h.title = tx('Mano sinistra', l); }
    }
    // tabellone (le due copie nello stesso schermo) e testi di partita già in vista
    try { this.ui?.onScore?.(E.score, E.matchConfig?.gamesToWin); } catch (e){ console.error(e); }
    try { this.ui?.serveCoach?.repaint?.(); } catch (e){ console.error(e); }
    // (revisione B72: scritta del segnale del momento giusto ed etichetta del gesto in basso, se sono in vista)
    try { this.ui?.cue?.relang?.(); } catch (e){ console.error(e); }
    try { this.ui?.gesture?.repaint?.(); } catch (e){ console.error(e); }
    return true;
  }
}
