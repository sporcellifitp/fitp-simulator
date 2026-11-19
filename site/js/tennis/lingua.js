// B72 (richiesta dell'utente del 19/11): «selettore lingua IT/EN dall'app del telefono: permette di tradurre anche solo uno
// dei due campi in modalità doppio». Ogni giocatore sceglie la lingua sul SUO telefono (IT | EN): la pagina del telefono
// cambia subito e il gioco mostra la metà di quel giocatore (o tutto lo schermo nel gioco a una vista) in quella lingua.
// Qui, in un posto solo:
//   • il motore della traduzione (createTranslator), usato anche dal gioco (natpf-tennis/src/natpf/natpf_lang.js, con il
//     suo dizionario): i testi restano scritti in italiano dove nascono e si traducono solo quando si mostrano, a frase
//     intera (prima le frasi esatte, poi gli schemi con i nomi e i numeri, poi i pezzi, il più lungo prima), una frase alla
//     volta tra i separatori « · ». Il maiuscolo dell'originale resta (PERFETTO → PERFECT). Un testo che non conosce resta
//     com'è (in italiano). Le traduzioni fatte si ricordano (cache): niente lavoro ripetuto a ogni ridisegno;
//   • la lingua salvata sul telefono (localStorage, sempre in try/catch: in una finestra privata può mancare);
//   • il dizionario IT→EN della pagina del telefono (racchetta.html, racchetta.js, phone-screen.js, i testi che arrivano dal
//     computer: esiti, pause, conto alla rovescia, «Sono pronto»…);
//   • translateDom: i testi fissi della pagina (HTML) tradotti e rimessi in italiano al cambio, con l'originale ricordato;
//   • langTap: nel riquadro del telefono bloccato in partita la lingua cambia con due tocchi, come la mano (B46).
// La lingua viaggia con il messaggio { t: 'lang', l: 'it' | 'en' } (k: 1 quando è solo l'annuncio al collegamento); il
// gioco la rimanda nel messaggio cfg (lg) e la rimette a 'it' a ogni giocatore nuovo, come la mano torna «Destra»
// (natpf_hand.resetHands). I computer di prima ignorano il messaggio; un telefono di prima non lo manda e vale IT.

export const LANGS = Object.freeze(['it', 'en']);
export const LANG_KEY = 'natpf-simulator.lingua';
export const isLang = l => l === 'it' || l === 'en';
export const normLang = l => (l === 'en' ? 'en' : 'it');
const storageOf = s => { if (s !== undefined) return s; try { return globalThis.localStorage ?? null; } catch { return null; } };
export function readLang(storage){ try { return normLang(storageOf(storage)?.getItem(LANG_KEY)); } catch { return 'it'; } }
export function writeLang(l, storage){ try { storageOf(storage)?.setItem(LANG_KEY, normLang(l)); } catch {} }

/* ---------- motore della traduzione ---------- */
export const SEP = ' · ';
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// stesse maiuscole dell'originale: tutto maiuscolo resta tutto maiuscolo, la prima lettera maiuscola o minuscola resta così
export function caseLike(src, out){
  if (typeof out !== 'string' || !out) return out;
  const letters = String(src).replace(/[^\p{L}]/gu, '');
  if (letters.length > 1 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) return out.toUpperCase();
  const f = String(src).match(/\p{L}/u)?.[0], i = out.search(/\p{L}/u);
  if (!f || i < 0) return out;
  const up = f === f.toUpperCase() && f !== f.toLowerCase();
  return out.slice(0, i) + (up ? out[i].toUpperCase() : out[i].toLowerCase()) + out.slice(i + 1);
}
// Pezzi dentro una frase, interi: prima e dopo non ci sono lettere o cifre. Revisione B72 (B72-REG-1): niente lookbehind
// (il controllo «guarda indietro» delle espressioni regolari), che WebKit conosce solo da Safari/iOS 16.4: su iOS 15–16.3
// new RegExp lanciava un errore e la pagina del telefono non si caricava più, anche in italiano. Il carattere prima (o
// l'inizio) lo prende il primo gruppo e si rimette com'era; il lookahead dopo non consuma niente, quindi due pezzi separati
// da un solo carattere si trovano lo stesso. Se il RegExp non si può costruire (browser vecchio) i pezzi si saltano:
// restano frasi esatte e schemi, al più qualche parola in italiano
export function phrasesRe(phrases = []){
  if (!phrases.length) return null;
  try { return new RegExp(`(^|[^\\p{L}\\p{N}])(${phrases.map(p => p[0]).sort((a, b) => b.length - a.length).map(esc).join('|')})(?![\\p{L}\\p{N}])`, 'giu'); }
  catch { return null; }
}
// exact: [[it, en]] frasi intere (anche senza badare alle maiuscole); templates: [[regex, (m, T) => en | null]] con i nomi
// e i numeri (T traduce un pezzo); phrases: [[it, en]] pezzi dentro una frase. → T(text): il testo in inglese
export function createTranslator({ exact = [], templates = [], phrases = [], cache = 600 } = {}){
  const EX = new Map(exact), EXL = new Map(exact.map(([k, v]) => [k.toLowerCase(), v]));
  const LOOK = new Map(phrases.map(([k, v]) => [k.toLowerCase(), v]));
  const RE = phrasesRe(phrases);
  const memo = new Map();
  function seg(s){
    if (!s || !/\p{L}/u.test(s)) return s;
    if (EX.has(s)) return EX.get(s);
    const lo = s.toLowerCase();
    if (EXL.has(lo)) return caseLike(s, EXL.get(lo));
    for (const [re, fn] of templates){ const m = re.exec(s); if (m){ const r = fn(m, T); if (r != null) return r; } }
    return RE ? s.replace(RE, (all, pre, w) => pre + caseLike(w, LOOK.get(w.toLowerCase()) ?? w)) : s;
  }
  function T(text){
    if (text === null || text === undefined) return text;
    const s = String(text);
    if (!s) return s;
    const hit = memo.get(s);
    if (hit !== undefined) return hit;
    // la frase intera prima (alcuni schemi contengono « · »), poi una frase alla volta
    const whole = EX.has(s) ? EX.get(s) : templates.some(([re]) => re.source.includes(' · ') && re.test(s)) ? seg(s) : null;
    const out = whole ?? s.split('\n').map(line => line.split(SEP).map(seg).join(SEP)).join('\n');
    if (memo.size >= cache) memo.clear();
    memo.set(s, out);
    return out;
  }
  T.seg = seg;
  return T;
}
// nomi: «di Giulia» / «del Player 2» → «Giulia's» / «Player 2's»
export const ofName = n => `${n}'s`;

/* ---------- dizionario della pagina del telefono ---------- */
const SIDE = { sinistra: 'left', destra: 'right' };
export const PHONE_EXACT = [
  // barra in alto, collegamento
  ['Collegamento…', 'Connecting…'], ['Non collegato', 'Not connected'], ['Collegato al computer', 'Connected to the PC'],
  ['Connessione persa', 'Connection lost'], ['Collegato', 'Connected'], ['Scollegato', 'Disconnected'],
  ['Mi collego al gioco sul computer…', 'Connecting to the game on the computer…'], ['Mi collego al gioco sul computer.', 'Connecting to the game on the computer.'],
  ['Mi collego al computer per diventare un telefono dello stand.', 'Connecting to the computer to become a stand phone.'],
  ['Nessuna partita', 'No match'], ['Inquadra il QR sul computer.', 'Scan the QR code on the computer.'],
  ['Partita non trovata', 'Match not found'], ['Il gioco sul computer è stato chiuso o ricaricato. Inquadra di nuovo il codice QR.', 'The game on the computer was closed or reloaded. Scan the QR code again.'],
  ['C\'è già un altro telefono collegato.', 'Another phone is already connected.'], ['Codice scaduto o già usato: inquadra di nuovo il QR.', 'Code expired or already used: scan the QR code again.'],
  ['Il computer ha scollegato il telefono. Per giocare di nuovo inquadra il nuovo QR.', 'The computer disconnected the phone. To play again, scan the new QR code.'],
  ['Per giocare di nuovo inquadra il codice QR sul computer.', 'To play again, scan the QR code on the computer.'],
  ['Riprovo da solo tra poco.', 'I will retry by myself shortly.'], ['Tocca «Riprova».', 'Tap “Try again”.'],
  ['Sul computer compare lo stesso numero: lo staff preme «Conferma».', 'The same number appears on the computer: the staff presses “Confirm”.'],
  ['Abbinato ✓ Mi collego al gioco…', 'Paired ✓ Connecting to the game…'], ['Abbinamento non riuscito', 'Pairing failed'],
  ['Non è più un telefono dello stand: per rimetterlo al suo posto lo staff lo abbina di nuovo.', 'It is no longer a stand phone: to put it back, the staff pairs it again.'],
  ['Il telefono non raggiunge il server di collegamento: controlla che abbia internet (Wi-Fi o dati), poi «Riprova».', 'The phone cannot reach the connection server: check that it has internet (Wi-Fi or data), then “Try again”.'],
  ['Il computer non risponde: se il gioco sul computer è stato ricaricato, inquadra di nuovo il QR.', 'The computer does not answer: if the game on the computer was reloaded, scan the QR code again.'],
  ['Tempo scaduto: sul computer apri di nuovo «Telefoni dello stand» e inquadra il QR nuovo.', 'Time is up: on the computer open “Stand phones” again and scan the new QR code.'],
  ['Il foglio «Telefoni dello stand» sul computer è chiuso: il QR non vale più.', 'The “Stand phones” sheet on the computer is closed: the QR code is no longer valid.'],
  ['Rifiutato sul computer. Lo staff può riprovare e premere «Conferma» quando compare il numero.', 'Refused on the computer. The staff can try again and press “Confirm” when the number appears.'],
  ['Collegamento sicuro non disponibile (la pagina del gioco non è in https).', 'Secure connection not available (the game page is not on https).'],
  ['Un altro telefono sta già chiedendo questo posto: sul computer rifiutalo o confermalo, poi riprova.', 'Another phone is already asking for this place: refuse or confirm it on the computer, then try again.'],
  ['Questo QR non è di un telefono dello stand.', 'This QR code is not for a stand phone.'],
  ['Codice non valido o già usato: inquadra il QR del foglio «Telefoni dello stand».', 'Code not valid or already used: scan the QR code of the “Stand phones” sheet.'],
  ['Il telefono non raggiunge il computer: controlla che sia sulla stessa rete Wi-Fi del computer (sul computer apri «SBLOCCA LA RETE.cmd» nella cartella del gioco), poi «Riprova».', 'The phone cannot reach the computer: check that it is on the same Wi-Fi network as the computer (on the computer open “SBLOCCA LA RETE.cmd” in the game folder), then “Try again”.'],
  ['La rete non lascia passare il collegamento tra telefono e computer. Prova: telefono e computer sulla stessa rete Wi-Fi (non quella per ospiti); sul computer consenti Chrome o Edge se Windows chiede il permesso del firewall, oppure collega il computer all’hotspot del telefono.', 'The network does not let the phone reach the computer. Try: phone and computer on the same Wi-Fi network (not the guest one); on the computer allow Chrome or Edge if Windows asks for the firewall permission, or connect the computer to the phone’s hotspot.'],
  ['La rete non lascia passare il collegamento tra telefono e computer. Prova: telefono e computer sulla stessa rete Wi-Fi (non quella per ospiti), oppure il computer collegato all’hotspot del telefono, oppure la versione LAN.', 'The network does not let the phone reach the computer. Try: phone and computer on the same Wi-Fi network (not the guest one), or the computer connected to the phone’s hotspot, or the LAN version.'],
  ['Telefono in orizzontale nel palmo, display verso di te: il dorso guarda la rete come le corde. Resta fermo così per 2 secondi.', 'Phone horizontal in the palm, screen towards you: the back faces the net like the strings. Stay still like this for 2 seconds.'],
  // pulsanti e righe fisse della pagina
  ['Tutto chiaro, ho capito', 'All clear, got it'], ['‹ Indietro', '‹ Back'], ['Avanti ›', 'Next ›'], ['Scheda precedente', 'Previous card'], ['Scheda successiva', 'Next card'],
  ['Mano', 'Hand'], ['Destra', 'Right'], ['Sinistra', 'Left'], ['Presa', 'Grip'], ['Lingua', 'Language'],
  ['Destro? Tocca di nuovo', 'Right-handed? Tap again'], ['Mancino? Tocca di nuovo', 'Left-handed? Tap again'],
  ['Guarda la palla sul computer e dai un colpetto.', 'Watch the ball on the computer and give a little swing.'],
  ['Direzione', 'Direction'], ['← Sinistra', '← Left'], ['Centro', 'Center'], ['Destra →', 'Right →'], ['Intensità', 'Strength'],
  ['Colpisci', 'Hit'], ['Arma dopo l’apertura', 'Arm after the backswing'], ['Scegli il colpo; schiacciata e servizio seguono la palla.', 'Choose the shot; smash and serve follow the ball.'],
  ['Attiva i sensori', 'Turn on the sensors'], ['Gioca con i tocchi', 'Play with taps'], ['Riprova', 'Try again'], ['Opzioni', 'Options'],
  ['Movimento', 'Movement'], ['Naturale', 'Natural'], ['Corto / compatto', 'Short / compact'],
  ['Riconosci il gesto solo mentre tengo premuto', 'Detect the swing only while I hold the button'],
  ['Bastano due colpetti. Puoi giocare anche da seduto.', 'Two small swings are enough. You can also play sitting down.'],
  ['Come ti chiami?', 'What’s your name?'], ['Salta', 'Skip'], ['Conferma', 'Confirm'], ['Il tuo nome', 'Your name'],
  ['Il tuo nome va sul tabellone e sulla schermata finale. Se non vuoi metterlo, tocca «Salta».', 'Your name goes on the scoreboard and on the final screen. If you don’t want to add it, tap “Skip”.'],
  ['Scrivi il tuo nome, oppure tocca «Salta».', 'Write your name, or tap “Skip”.'], ['Almeno 2 caratteri', 'At least 2 characters'],
  ['Solo lettere, numeri, spazio, punto e trattino', 'Only letters, numbers, space, dot and hyphen'], ['Scegli un altro nome', 'Choose another name'],
  ['«Ospite» è per chi gioca senza nome: scegline un altro', '“Guest” is for those who play without a name: choose another one'], ['Scrivi il tuo nome', 'Write your name'],
  ['Rivincita', 'Rematch'], ['Salta la calibrazione', 'Skip calibration'], ['Salta la calibrazione ›', 'Skip calibration ›'], ['Salta ›', 'Skip ›'],
  ['Calibra ›', 'Calibrate ›'], ['Inizia ›', 'Start ›'],
  ['Ricalibra', 'Recalibrate'], ['Ricollega', 'Reconnect'], ['Scollega', 'Disconnect'], ['⚑ Segna un problema', '⚑ Mark a problem'],
  ['Schermo bloccato durante il gioco', 'Screen locked during play'], ['Gioca!', 'Play!'], ['Sblocca', 'Unlock'], ['Ricollegamento…', 'Reconnecting…'], ['In pausa', 'Paused'],
  ['Tocca lo schermo per riprendere', 'Tap the screen to resume'],
  ['Il telefono si è girato', 'The phone has turned'], ['Il gioco continua. Per leggere meglio, raddrizzalo.', 'The game goes on. To read better, turn it upright.'],
  ['Telefono dello stand', 'Stand phone'], ['dello stand · staff: tieni premuto 3 s', 'stand phone · staff: hold for 3 s'], ['staff: pulsanti in vista qui sotto', 'staff: buttons shown below'],
  // schermate
  ['Tocca «Attiva i sensori»: il telefono diventa la racchetta.', 'Tap “Turn on the sensors”: the phone becomes the racket.'],
  ['Preparati', 'Get ready'], ['Tra un attimo si calibra.', 'Calibration starts in a moment.'],
  ['Al servizio', 'Serving'], ['Pausa', 'Pause'], ['Pronto', 'Ready'], ['Pronto ✓', 'Ready ✓'], ['Partita', 'Match'], ['Sono pronto', 'I’m ready'],
  ['Tieni il telefono come in partita, fermo.', 'Hold the phone as in a match, still.'], ['Tieni fermo', 'Hold still'],
  ['La tua presa', 'Your grip'], ['Tienilo comodo, senza stringere.', 'Hold it comfortably, without squeezing.'],
  ['Disteso nel palmo come un manico, cima in avanti', 'Lying in the palm like a handle, top forward'],
  ['Nel palmo, schermo verso di te, cima in avanti', 'In the palm, screen towards you, top forward'],
  ['Nel pugno come un martello, cima in avanti', 'In the fist like a hammer, top forward'],
  ['Fermo un attimo al centro…', 'Hold still in the center for a moment…'],
  ['Inclina il piatto e accompagna di taglio verso il basso, senza forzare il polso.', 'Tilt the face and follow through with a downward slice, without forcing the wrist.'],
  ['Accompagna dal basso verso l’alto con un movimento comodo.', 'Follow through from low to high with a comfortable movement.'],
  ['Piatto leggermente aperto e gesto corto e morbido: rallentare soltanto non basta.', 'Face slightly open and a short, soft swing: just slowing down is not enough.'],
  ['Alza il telefono con un gesto comodo per lanciare la palla.', 'Raise the phone with a comfortable movement to toss the ball.'],
  ['Simula la battuta: conta il tuo movimento, anche compatto.', 'Mime the serve: your movement counts, even a compact one.'],
  ['Fatto!', 'Done!'], ['Da rifare', 'Do it again'], ['Guarda il computer: si parte da soli.', 'Look at the computer: it starts by itself.'],
  ['Guarda il computer: ti dice cosa cambiare.', 'Look at the computer: it tells you what to change.'],
  ['Prova un colpetto', 'Try a small swing'], ['Guarda il computer: il personaggio ripete il tuo gesto.', 'Look at the computer: the player repeats your swing.'],
  ['Pronto, fermo', 'Ready, still'],
  ['Guarda il computer per iniziare.', 'Look at the computer to start.'], ['Colpisci quando la palla è in cima al lancio.', 'Hit when the ball is at the top of the toss.'],
  ['Alza il telefono (o tocca lo schermo): lanci la palla. Poi colpisci quando è in alto.', 'Raise the phone (or tap the screen) to toss the ball. Then hit when it is high.'],
  ['Colpisci quando la palla arriva alla racchetta.', 'Hit when the ball reaches the racket.'],
  ['Partita in pausa: guarda il computer. Se non riparte, tocca «Ricollega».', 'Match paused: look at the computer. If it does not restart, tap “Reconnect”.'],
  ['Partita finita: guarda il computer.', 'Match over: look at the computer.'],
  ['Riconosciuto', 'Recognized'], ['Più deciso', 'Firmer'], ['Altro verso', 'Other direction'], ['Un colpetto un po’ più ampio.', 'A slightly bigger swing.'],
  ['Gesto letto', 'Swing read'], ['Verso l’alto', 'Upwards'], ['Taglio verso il basso', 'Downward slice'], ['Tocco corto', 'Short touch'], ['Movimento letto', 'Movement read'], ['Colpo dall’alto', 'Overhead shot'],
  ['Preparazione', 'Backswing'], ['Colpo riconosciuto', 'Shot recognized'], ['Accompagnamento', 'Follow-through'],
  ['Segnato', 'Marked'], ['Il momento è nella registrazione del computer.', 'The moment is in the computer’s recording.'],
  ['Sensori negati', 'Sensors denied'], ['Serve https', 'https needed'], ['Sensori non disponibili', 'Sensors not available'],
  ['Su iPhone ricarica la pagina e tocca «Consenti»; su Android tocca il lucchetto accanto all\'indirizzo e consenti i sensori. Oppure «Gioca con i tocchi».', 'On iPhone reload the page and tap “Allow”; on Android tap the lock next to the address and allow the sensors. Or “Play with taps”.'],
  ['I sensori vogliono una pagina https. In LAN serve il certificato NATPF sul telefono.', 'The sensors need an https page. On the LAN the phone needs the NATPF certificate.'],
  ['Questo browser non dà i sensori. Usa Chrome (Android) o Safari (iPhone) e inquadra di nuovo il QR.', 'This browser does not provide the sensors. Use Chrome (Android) or Safari (iPhone) and scan the QR code again.'],
  // avvisi
  ['I sensori non sono ripartiti', 'The sensors did not restart'], ['Ricarica la pagina: collegamento e calibrazione restano.', 'Reload the page: connection and calibration are kept.'],
  ['Ricarica la pagina', 'Reload the page'], ['Sensori fermi', 'Sensors stopped'], ['Il telefono non manda più il movimento al gioco.', 'The phone no longer sends movement to the game.'],
  ['Riattiva i sensori', 'Restart the sensors'], ['Lo schermo può spegnersi', 'The screen may turn off'],
  ['Questo browser non lo tiene acceso: allunga lo spegnimento automatico nelle impostazioni del telefono.', 'This browser does not keep it on: extend the screen timeout in the phone settings.'],
  ['Tocca il pulsante; se ricapita, disattiva il risparmio energetico.', 'Tap the button; if it happens again, turn off battery saver.'], ['Tieni acceso lo schermo', 'Keep the screen on'],
  ['Batteria bassa', 'Low battery'], ['Metti in carica il telefono dello stand (o dallo allo staff).', 'Charge the stand phone (or give it to the staff).'],
  ['Bentornato: un tocco tiene acceso lo schermo e riattiva i sensori.', 'Welcome back: one tap keeps the screen on and restarts the sensors.'],
  ['La calibrazione è rimasta; il collegamento riparte da solo.', 'The calibration is kept; the connection restarts by itself.'], ['Il collegamento riparte da solo.', 'The connection restarts by itself.'],
  ['Il collegamento e la calibrazione sono rimasti; il tutorial è ancora sul computer.', 'Connection and calibration are kept; the tutorial is still on the computer.'],
  ['Il collegamento e la calibrazione sono rimasti.', 'Connection and calibration are kept.'],
  ['Il collegamento è rimasto e il tutorial è ancora sul computer: riprendi da dove eri, poi si calibra.', 'The connection is kept and the tutorial is still on the computer: carry on from where you were, then calibrate.'],
  ['Il collegamento è rimasto: la calibrazione continua dal passo in cui eri.', 'The connection is kept: calibration continues from the step you were at.'], ['Il collegamento è rimasto.', 'The connection is kept.'],
  // telefono dello stand
  ['mi ricollego…', 'reconnecting…'], ['collegato', 'connected'], ['Cerco il gioco: mi ricollego da solo. Se non torna, chiama lo staff.', 'Looking for the game: I reconnect by myself. If it does not come back, call the staff.'],
  ['Telefono dello stand: lo staff tocca «Attiva i sensori».', 'Stand phone: the staff taps “Turn on the sensors”.'], ['Dai il telefono al prossimo giocatore.', 'Give the phone to the next player.'],
  // tutorial, rivincita, pronto, conto
  ['Guarda lo schermo', 'Look at the screen'],
  ['Presa e colpi sono sul computer: sfoglia con ‹ ›. Quando vuoi tocca «Tutto chiaro, ho capito».', 'Grip and shots are on the computer: browse with ‹ ›. When you want, tap “All clear, got it”.'],
  ['Presa e colpi sono sul computer. Quando vuoi tocca «Tutto chiaro, ho capito».', 'Grip and shots are on the computer. When you want, tap “All clear, got it”.'],
  ['Rivincita chiesta ✓', 'Rematch requested ✓'], ['Rivincita chiesta', 'Rematch requested'], ['Si riparte…', 'Restarting…'], ['Partita finita', 'Match over'],
  ['Tocca «Rivincita» per rigiocare: si riparte quando la chiedete tutti e due.', 'Tap “Rematch” to play again: it restarts when you both ask for it.'],
  ['Si parte tra poco…', 'Starting soon…'], ['Quando sei pronto tocca «Sono pronto»: la partita parte da sola.', 'When you are ready, tap “I’m ready”: the match starts by itself.'],
  ['Scambi di prova', 'Practice rallies'], ['Colpisci la palla quando arriva: il gioco impara il tuo colpo. Poi si comincia.', 'Hit the ball when it arrives: the game learns your shot. Then we start.'],
  ['Aspetta', 'Wait'], ['Guarda il computer.', 'Look at the computer.'], ['Allenamento tra', 'Practice in'], ['Tieni il telefono come in partita.', 'Hold the phone as in a match.'],
  ["Allenati un po'!", 'Warm up a bit!'], ['Colpisci le palle facili.', 'Hit the easy balls.'], ['Si gioca tra', 'Match starts in'], ['Si gioca!', 'Play!'],
  ['Si scelgono le impostazioni sul computer.', 'Settings are being chosen on the computer.'], ['Partenza fermata sul computer.', 'Start stopped on the computer.'],
  ['Conto fermato', 'Countdown stopped'], ['Conto annullato', 'Countdown cancelled'],
  ['Moviola del punto: guarda il computer, si riprende da solo.', 'Point replay: look at the computer, it resumes by itself.'],
  // esiti dei colpi e dei punti (eventFlash, e i testi del computer)
  ['Palla corta!', 'Drop shot!'], ['Lob!', 'Lob!'], ['Tagliato!', 'Slice!'], ['Smash!', 'Smash!'], ['Perfetto!', 'Perfect!'], ['Bel colpo', 'Nice shot'],
  ['In anticipo', 'Early'], ['In ritardo', 'Late'], ['Troppo presto', 'Too early'], ['Troppo tardi', 'Too late'], ['Nessun colpo', 'No shot'], ['Troppo lontana', 'Too far'],
  ['Lancio a vuoto', 'Missed toss'], ['Il movimento non è arrivato: riprova con un colpetto comodo.', 'The movement did not arrive: try again with a comfortable small swing.'],
  ['Colpisci quando la palla è in alto. Alza il telefono e riprova.', 'Hit when the ball is high. Raise the phone and try again.'],
  ['Colpo!', 'Hit!'], ['In rete', 'Net'], ['Fuori', 'Out'], ['Troppo lunga', 'Too long'], ['Mancata', 'Missed'], ['Punto tuo', 'Your point'], ['Punto avversario', 'Opponent’s point'],
  ['Vincente', 'Winner'], ['Palla non presa', 'Missed ball'],
  // nomi dei colpi (calibrazione con i tocchi, shot-options.js)
  ['Piatto', 'Flat'], ['Slice', 'Slice'], ['Lob', 'Lob'], ['Palla corta', 'Drop shot'], ['Smash', 'Smash'], ['Servizio', 'Serve'], ['Lancio', 'Toss'], ['Battuta', 'Serve'],
  // nomi delle schede del tutorial mandati dal computer («Scheda 1 di 5 · Presa a racchetta»: natpf_tutorial.TUTORIAL_CARDS,
  // nomi delle prese di grip-art.GRIPS e dei gesti di natpf_gesture_motion; revisione B72, L4)
  ['Presa a racchetta', 'Racket grip'], ['Presa nel palmo', 'Palm grip'], ['Impugnatura a martello', 'Hammer grip'], ['Impugnatura', 'Grip'],
  ['Posizione di partenza', 'Starting position'], ['Colpo piatto', 'Flat shot'], ['Volée', 'Volley'], ['Tagliato di rovescio', 'Backhand slice'],
  ['Incrociato', 'Crosscourt'], ['Lungolinea', 'Down the line'],
];
// pezzi dentro le frasi (motivi dell'esito che arrivano dal computer, nomi dei colpi nella calibrazione)
export const PHONE_PHRASES = [
  ['troppo presto', 'too early'], ['troppo tardi', 'too late'], ['in anticipo', 'early'], ['in ritardo', 'late'], ['da troppo lontano', 'from too far'],
  ['gesto troppo forte', 'swing too hard'], ['scambio lungo', 'long rally'], ['in corsa', 'on the run'], ['in allungo', 'stretched'], ['palla debole', 'weak ball'],
  ['palla lontana', 'ball too far'], ['senza preparazione', 'no backswing'], ['palla veloce', 'fast ball'], ['colpo difficile', 'hard shot'],
  ['Dritto', 'Forehand'], ['Rovescio', 'Backhand'], ['Pallonetto', 'Lob'], ['Schiacciata', 'Smash'], ['Tagliato', 'Slice'],
  ['telefono scollegato', 'phone disconnected'], ['schermo spento', 'screen off'], ['sensori fermi', 'sensors stopped'], ['segnale debole', 'weak signal'],
  ['inquadra il qr', 'scan the QR code'], ['attiva i sensori', 'turn on the sensors'], ['calibrazione', 'calibration'], ['tutorial da vedere', 'tutorial to watch'],
  ['in attesa', 'waiting'], ['si prepara', 'getting ready'], ['problema', 'problem'], ['pronto', 'ready'],
];
const names = s => String(s).split(' e ').join(' and ');
export const PHONE_TEMPLATES = [
  [/^Telefono (\d)$/, m => `Phone ${m[1]}`],
  [/^Telefono (\d) dello stand$/, m => `Stand phone ${m[1]}`],
  [/^Non sei più il Telefono (\d)$/, m => `You are no longer Phone ${m[1]}`],
  [/^Non sei più il Telefono (\d): lo staff ha abbinato un altro telefono a questo posto\. Chiama lo staff\.$/, m => `You are no longer Phone ${m[1]}: the staff paired another phone to this place. Call the staff.`],
  [/^Non sei più il Telefono (\d): chiama lo staff\.$/, m => `You are no longer Phone ${m[1]}: call the staff.`],
  [/^Questo Telefono (\d) è aperto in un'altra scheda del browser: usa quella, oppure tocca «Riprova» qui\.$/, m => `This Phone ${m[1]} is open in another browser tab: use that one, or tap “Try again” here.`],
  [/^(.*?)\s*(Riprovo da solo tra poco\.|Tocca «Riprova»\.)$/, (m, T) => (m[1] ? `${T(m[1])} ${T(m[2])}` : null)],
  [/^Bentornato: un tocco tiene acceso lo schermo e riattiva i sensori\. (.+)$/, (m, T) => `${T('Bentornato: un tocco tiene acceso lo schermo e riattiva i sensori.')} ${T(m[1])}`],
  [/^(.+)\. Guarda il computer\.$/, (m, T) => (T(m[1]) !== m[1] ? `${T(m[1])}. Look at the computer.` : null)],
  [/^(Dritto|Rovescio) (\S+)$/, m => `${m[1] === 'Dritto' ? 'Forehand' : 'Backhand'} ${m[2]}`],
  [/^Ora: un colpo naturale verso (sinistra|destra), poi fermati\. Gesto (\d+) di (\d+)\.$/, m => `Now: a natural swing to the ${SIDE[m[1]]}, then stop. Swing ${m[2]} of ${m[3]}.`],
  [/^Gesto (\d+) di (\d+): (.+)$/, (m, T) => `Swing ${m[1]} of ${m[2]}: ${T(m[3])}`],
  [/^Hai mosso (\S+): rifallo ?(.*)$/, m => `You moved ${m[1]}: do it again${m[2] ? ' ' + m[2] : ''}`],
  [/^Forza (\d+)%$/, m => `Strength ${m[1]}%`],
  [/^Scheda (\d+) di (\d+)$/, m => `Card ${m[1]} of ${m[2]}`],
  [/^Viste (\d+) di (\d+)$/, m => `Seen ${m[1]} of ${m[2]}`],
  [/^Al massimo (\d+) caratteri$/, m => `At most ${m[1]} characters`],
  [/^Aspetto (l’altro giocatore|.+): deve toccare «Rivincita» sul suo telefono\.$/, m => `Waiting for ${m[1] === 'l’altro giocatore' ? 'the other player' : m[1]}: they must tap “Rematch” on their phone.`],
  [/^(L’altro giocatore|.+) vuole la rivincita: tocca «Rivincita»\.$/, m => `${m[1] === 'L’altro giocatore' ? 'The other player' : m[1]} wants a rematch: tap “Rematch”.`],
  [/^Aspetto (.+)$/, m => `Waiting for ${names(m[1])}`],
  [/^Partita in pausa: aspetto il telefono (?:del|di) (.+)\. Si riprende da soli\.$/, m => `Match paused: waiting for ${ofName(m[1])} phone. It resumes by itself.`],
  [/^Partita in pausa: aspetto il telefono dell’altro giocatore\. Si riprende da soli\.$/, () => 'Match paused: waiting for the other player’s phone. It resumes by itself.'],
  [/^([^:]+): (.+)$/, (m, T) => { const r = T(m[2]); return r !== m[2] ? `${m[1]}: ${r}` : null; }],
];
export const phoneEn = createTranslator({ exact: PHONE_EXACT, templates: PHONE_TEMPLATES, phrases: PHONE_PHRASES });
// testo della pagina del telefono nella lingua scelta (in italiano com'è)
export const phoneText = (text, lang = 'it') => (lang === 'en' ? phoneEn(text) : text);

/* ---------- testi fissi della pagina ---------- */
// I testi dell'HTML (nodi di testo, aria-label, placeholder, title) tradotti dal dizionario; l'originale italiano resta
// ricordato (WeakMap) e torna con 'it'. I testi che il codice riscrive (anello, barra, pulsanti) li traduce chi li scrive.
// skip: elementi da non toccare (selettore). Si chiama al cambio di lingua e all'avvio: niente lavoro per fotogramma
const ATTRS = ['aria-label', 'placeholder', 'title'];
export function translateDom(root, lang = 'it', { T = phoneEn, skip = null, memo = translateDom.memo } = {}){
  if (!root?.ownerDocument && !root?.createTreeWalker) return 0;
  const doc = root.ownerDocument || root, en = lang === 'en';
  let n = 0;
  const NF = doc.defaultView?.NodeFilter || globalThis.NodeFilter;
  const walker = doc.createTreeWalker(root, NF ? NF.SHOW_TEXT : 4);
  for (let node = walker.nextNode(); node; node = walker.nextNode()){
    const p = node.parentElement;
    if (!p || p.closest?.('script,style') || (skip && p.closest?.(skip))) continue;
    const raw = node.nodeValue, s = raw.trim();
    if (!s) continue;
    const orig = memo.get(node);
    const it = orig ?? s;
    const want = en ? T(it) : it;
    if (want !== s){ node.nodeValue = raw.replace(s, want); n++; }
    if (en && want !== it) memo.set(node, it);
  }
  for (const el of root.querySelectorAll?.(ATTRS.map(a => `[${a}]`).join(',')) || []){
    if (skip && el.closest?.(skip)) continue;
    for (const a of ATTRS){
      if (!el.hasAttribute(a)) continue;
      const key = `${a}:`, keep = memo.get(el) || {};
      const it = keep[key] ?? el.getAttribute(a), want = en ? T(it) : it;
      if (el.getAttribute(a) !== want){ el.setAttribute(a, want); n++; }
      if (en && want !== it){ keep[key] = it; memo.set(el, keep); }
    }
  }
  return n;
}
translateDom.memo = new WeakMap();

/* ---------- due tocchi nel riquadro del telefono bloccato (come la mano, phone-screen.handTap) ---------- */
export const LANG_CONFIRM = Object.freeze({ ms: 4000 });
// armed: { lang, until } la domanda aperta; want: la lingua toccata; current: quella di adesso; confirm: false = un tocco basta
// → { armed, commit }: commit = la lingua da mettere (null: niente ancora)
export function langTap(armed = null, { want = null, current = 'it', now = 0, confirm = true } = {}){
  if (!isLang(want) || want === current) return { armed: null, commit: null };
  if (!confirm || (armed && armed.lang === want && now <= armed.until)) return { armed: null, commit: want };
  return { armed: { lang: want, until: now + LANG_CONFIRM.ms }, commit: null };
}

/* ---------- accordo con il gioco ---------- */
// Il telefono annuncia la sua lingua a ogni collegamento (k 1) e la manda a ogni tocco; il gioco la rimanda in cfg (lg).
// Un cfg arrivato subito dopo un tocco può essere partito prima che il gioco lo ricevesse: per LANG_ECHO_MS dopo il tocco
// vale la lingua toccata finché il gioco non la conferma (niente lampo nell'altra lingua). → la lingua da mostrare
export const LANG_ECHO_MS = 3000;
export function langOnCfg(lg, { current = 'it', pending = null, now = 0 } = {}){
  if (!isLang(lg)) return { lang: current, pending };
  if (pending && now - pending.at < LANG_ECHO_MS && pending.lang !== lg) return { lang: current, pending };
  return { lang: lg, pending: null };
}
// messaggio della lingua al gioco: tocco (link false) o annuncio al collegamento (link true: il gioco lo prende solo se non
// conosce ancora la lingua di questo telefono)
export const langMsg = (lang, { link = false } = {}) => ({ t: 'lang', l: normLang(lang), ...(link ? { k: 1 } : {}) });
