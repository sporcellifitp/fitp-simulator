# B72 · Lingua IT / EN scelta dal telefono, per giocatore (19/11/2026)

Prodotto: **FIERA** (vale anche online: nessuna differenza di comportamento). Ramo `b72-lingua` dal commit di `b71-int`
`b4fb3446`, niente push, file di versione e documenti di stato non toccati (li aggiorna l'agente principale).

Richiesta dell'utente (19/11, testuale): «selettore lingua IT/EN dall'app del telefono: permette di tradurre anche solo uno
dei due campi in modalità doppio». «Doppio» qui è lo **stesso schermo** (due metà, un telefono per giocatore: P1 =
`ui.phone`, P2 = `engine.natpfPhone2`). Ogni giocatore sceglie la lingua sul suo telefono; la pagina del telefono cambia
subito e il computer mostra in quella lingua la **sua** metà (o tutto lo schermo nel gioco a una vista).

## 1. Cosa si vede

**Telefono** (`site/tennis/racchetta.html`, `site/js/tennis/racchetta.js`, modulo nuovo `site/js/tennis/lingua.js`):

- selettore **IT | EN** piccolo nella **barra in alto** (sempre in vista, 86×38 px a 390 px di larghezza);
- una riga **«Lingua · Italiano | English»** sotto la mano, prima di «Attiva i sensori» (compare con la riga della mano);
- **nel riquadro del telefono bloccato in partita** (B51: in partita tutto il resto della pagina è inerte, anche la barra)
  un selettore IT | EN in alto a destra, che cambia con **due tocchi** come la mano (B46): al primo tocco il pulsante
  diventa «EN?»/«IT?» per 4 s, il secondo cambia. Un palmo che sfiora lo schermo mentre si gioca non cambia la lingua;
- al tocco la pagina cambia **subito**: barra di stato, anello e scritta sotto, pulsanti (Attiva i sensori, Gioca con i
  tocchi, Ricalibra/Ricollega/Scollega, Rivincita, Avanti/Salta, Sono pronto), mano e lingua, opzioni, nome, tutorial
  (scheda, schede viste, frecce, «Tutto chiaro»), calibrazione (passi, consigli, esito dei gesti), avvisi («Sensori
  fermi», «Lo schermo può spegnersi», batteria), velo «Tocca lo schermo per riprendere», riquadro del telefono bloccato,
  telefono dello stand (numero, «dai il telefono al prossimo giocatore»), messaggi del collegamento e della rete, e i testi
  che arrivano dal computer (esito del colpo e del punto, motivi, pausa per l'altro telefono, conto alla rovescia, offerte
  «Sono pronto»/«Salta ›», errori del nome). Anche `<html lang>`.
- La lingua resta salvata sul telefono (`localStorage` `natpf-simulator.lingua`, sempre in try/catch: senza archivio vale
  IT) e torna **IT** quando il gioco passa a un nuovo giocatore (sotto).

**Gioco** (`natpf-tennis/src/natpf/natpf_lang.js`, nuovo): con EN in inglese, con le maiuscole come oggi:

| Testo | Dove | Lingua |
| --- | --- | --- |
| esito del colpo e riga piccola («Perfect», «Out · too early», «partner · Drop shot · on the run · 120 km/h») | `natpf_shot_feedback.js` → `hud_ui.showTimingPopup` | di chi ha colpito (nello stesso schermo la sua metà) |
| istruzioni del servizio («Hit!», «Wait for it to rise…», «Missed toss: try again», «Giulia, your serve», lancio e servizio automatici, regola della direzione) | `natpf_serve_coach.js` (solo i testi) | di chi batte |
| casella «Al servizio» → «Serving» | `#server-tag`, `#server-tag-p1/-p2` | a una vista chi gioca qui; per metà nello stesso schermo |
| scritte grandi di punto, game, partita, inizio («Opponent's point», «Your error: ball out · 0-15», «Point Giulia», «Marco wins!», «Coin toss: Marco serves», «Play») | `hud_ui.showCenterBanner` | comune (vedi regola) |
| tabellone: sigle dei nomi dati dal gioco («YOU», «OPP», «YOU+PAR»), etichetta («1 game», «Best of 3», «Deuce», «Advantage», «Deciding point»), testo per lo screen reader («(serving)») | `natpf_ui.onScore`, `natpf_scoreboard.scoreboardHtml` | **ogni copia nella lingua della sua metà** |
| etichetta sotto la metà («Phone paused», «Help: Child»), «Left-handed» | `natpf_split_ui.tick`, `NatpfLang.refresh` | della metà |
| barre «Power/Strong/Very strong», «Energy/Weary/Tired!» | `natpf_power_hud.js` | di chi gioca / della metà |
| riquadro della pausa del telefono (titoli e testi con nome, numero, secondi, QR; «Reconnect the phone») | `natpf_ui._paintHold`, `_paintHoldQr` | del giocatore di quel telefono; con due pause il titolo «Match paused» comune e ogni riga nella lingua del suo giocatore |
| conto alla rovescia prima della partita («Get ready», «The match is about to start», chi batte) | `natpf_prematch.js` | comune |
| schermata finale: titolo («You win!», «The opponent wins», «Great match, Luca!»), riga sopra e sotto, righe dei game («You», «Opponent»), «Games 1-0», pillola dei game «1 to 0», pillola in basso, card (nastro «Match MVP», «You», «Event level», trofei con i numeri, «Next trophy…», record) e riquadri dei numeri, riga della rivincita dai telefoni | `hud_ui.showVictoryModal`, `natpf_split_ui._paintRematch` | comune |

**Regola dello schermo** (`screenLangs`): a una vista (contro l'avversario, doppio contro l'avversario, sfida tra due
computer) tutto nella lingua del giocatore umano di **questo** computer (`engine.natpfPhone`: nella sfida tra due computer
ogni PC usa il suo telefono); nello stesso schermo ogni metà nella lingua del suo giocatore; i testi **a tutta larghezza**
in inglese solo se **tutti e due** hanno scelto EN, altrimenti in italiano.

Due scelte rispetto al testo del compito, con il motivo:
- **tabellone**: il compito lo metteva tra i testi comuni, ma nello stesso schermo ce n'è già una **copia per metà**
  (B17.3): ognuna nella lingua del suo giocatore è chiaramente meglio (ognuno legge il suo) e non costa niente;
- **richiamo per nome a tutta larghezza** («Giulia, batti tu», B20): è rivolto a chi deve battere, quindi nella lingua di
  chi batte, come tutte le istruzioni del servizio (non in quella comune).

**Restano in italiano** (le sceglie e le usa lo staff sul PC, come chiesto): menu, lobby e pagina «Collega»/«Partita»
(anche il conto alla rovescia dello stesso schermo nella pagina «Collega»), impostazioni, pannelli e pagine dello staff,
diagnostica, avvisi brevi in basso (toast), pulsanti della schermata finale («Menu», «Nuovo giocatore», «Gioca ancora»).

## 2. Come funziona

- **Motore della traduzione** in un posto solo (`lingua.createTranslator`, usato dal telefono e dal gioco): i testi restano
  scritti in italiano dove nascono e si traducono quando si mostrano, una frase alla volta tra i separatori « · »: prima
  le frasi esatte, poi gli schemi con nomi e numeri (es. «Errore di (.+): palla fuori» → «X's error: ball out»), poi i
  pezzi (il più lungo prima, come `natpf_i18n`). Il maiuscolo resta. Un testo che il dizionario non conosce resta com'è.
- **Con IT niente cambia**: `tx(text, 'it')` è `natpf_i18n.t` di sempre (HUD), `say(text, 'it')` restituisce il testo
  identico (istruzioni del servizio, pausa, etichette: prima non passavano da `natpf_i18n`, e così resta). Prova: test
  «B72 IT».
- **Niente lavoro per fotogramma**: le traduzioni si ricordano (cache del motore, svuotata oltre 600 frasi); chi ridisegna
  a ogni giro (barre, etichette sotto le metà) confronta una chiave «testo|lingua» e traduce solo quando cambia; le cose
  fisse (casella «Al servizio», «Mancino», tabellone) si riscrivono solo quando cambia la lingua di un telefono
  (`NatpfLang.refresh`, ascoltatore `onLang`) o quando nascono (caselle delle metà, `natpf_split.js`).
- **«CPU» e «Avversario»**: il dizionario conosce tutte e due le forme (questo ramo e `b72-avversario`): «CPU», «2 CPU»,
  «Avversario», «Avversari», «compagno», «della CPU»/«dell'avversario»/«degli avversari», «La CPU»/«L'avversario»/«Gli
  avversari» → «Opponent», «Opponents», «partner», «Opponent's», «The opponent(s)». La chiave del motore «CPU DROP SHOT»
  → «Opponent's drop shot».

### Protocollo telefono ↔ gioco

- Telefono → gioco: `{ t: 'lang', l: 'it' | 'en' }` al **tocco**; `{ t: 'lang', l, k: 1 }` come **annuncio** a ogni
  collegamento riuscito (subito dopo il messaggio `dev`, una volta per collegamento). Una lingua toccata senza
  collegamento vale come tocco al collegamento dopo.
- Il gioco (`site/js/tennis/link.js` → evento `lang` → `NatpfPhoneRacket._onPhoneLang`): il **tocco vale sempre**;
  l'**annuncio** vale solo se il gioco non conosce ancora la lingua di quel telefono (`lang === null`: pagina appena
  collegata dopo l'avvio del programma); se la conosce, la rimanda. La lingua va al telefono nel messaggio **`cfg`** (`lg`,
  solo quando il gioco la conosce), come la mano. Dopo un tocco il telefono tiene la lingua toccata per 3 s anche se arriva
  un `cfg` partito prima (niente lampo nell'altra lingua), finché il gioco non conferma (`langOnCfg`).
- **Compatibilità**: un computer di prima ignora il messaggio `lang` (lo `switch` di `link.js` non ha il caso) e non manda
  `lg`: il telefono nuovo tiene la sua lingua per la pagina. Un telefono di prima non manda `lang`: per il gioco vale IT
  (`langOfPhone`), e ignora `lg` nel `cfg`. Il registro dello stand (`registro_*`) e il Worker non cambiano formato
  (la lingua non va nel registro; test).

### Giocatore nuovo → IT (stesso meccanismo della mano)

La mano torna «Destra» a ogni visitatore in `natpf_hand.resetHands(ui, causa)`, chiamata da «Nuovo giocatore»
(`natpf_new_player.resetVisitor`), dal chiosco che torna al menu per inattività (`natpf_kiosk`) e da «Prossimo giocatore»
della fiera (`resetFairVisitor`). La lingua è agganciata **lì**: `resetHands` chiama `natpf_lang.resetLangs`, che mette
IT ai telefoni del Player 1 e del Player 2 (`setLang('it')` → `cfg` con `lg: 'it'` subito ai telefoni collegati; un
telefono scollegato lo riceve al ritorno, e il suo annuncio con EN salvato non vale più perché il gioco ora la conosce).
Come la mano, al **riavvio del programma** non si azzera: il primo annuncio del telefono vale.

## 3. File toccati

Nuovi: `site/js/tennis/lingua.js` (motore, dizionario del telefono, lingua salvata, `translateDom`, `langTap`,
`langOnCfg`, `langMsg`), `natpf-tennis/src/natpf/natpf_lang.js` (dizionario della partita, `tx`/`say`/`scoreTx`, regola
dello schermo, `localizeBoard`, `NatpfLang`, `resetLangs`, `translateEl`), `natpf-tennis/test/natpf-b72-lingua.test.mjs`,
`tools/test/b72-lingua.test.mjs`, `tools/e2e/natpf-lingua.mjs`, questo documento.

Modificati: `site/tennis/racchetta.html` (tre selettori, CSS; la scritta della barra su una riga con «…»),
`site/js/tennis/racchetta.js` (stato della lingua, `ui()`/barra/pulsanti/avvisi/velo/tutorial/stand tradotti, messaggi),
`site/js/tennis/link.js` (caso `lang`), `natpf_phone_racket.js` (`lang`, `setLang`, `_onPhoneLang`, `onLang`, `lg` nel
`cfg`), `natpf_ui.js` (`NatpfLang`, tabellone per metà, riquadro della pausa), `hud_ui.js` (scritta del colpo, scritte
grandi, schermata finale), `natpf_shot_feedback.js` (lingua della metà alla scritta), `natpf_serve_coach.js` (solo i
testi e `repaint`; niente nella logica della casella che lampeggia del ramo `b72-servizio`), `natpf_split_ui.js`
(aggancio del telefono del P2, etichette, rivincita), `natpf_split.js` (caselle appena nate), `natpf_prematch.js`,
`natpf_power_hud.js`, `natpf_hand.js` (`resetLangs`), `natpf_scoreboard.js` (opzione `serving` di `scoreboardHtml`).
Non toccati: riconoscimento dei gesti, sensori, registro, Worker, file di versione, documenti di stato.

`swing-message.js` (citato nel compito) non ha testi da mostrare: è il formato del messaggio del colpo. Gli avvisi in
partita del telefono stanno in `phone-screen.js` (esiti, conto) e `racchetta.js` (sensori fermi, schermo che si spegne):
tradotti.

## 4. Prove (numeri)

- `cd natpf-tennis && npm test`: **1885/1885** (sul codice del commit; +13 di `natpf-b72-lingua.test.mjs`). In una corsa
  precedente, con la macchina carica (tre suite e una prova nel browser insieme), il test a tempo «registro, testi enormi:
  pulire un testo di 1 MB costa pochi millisecondi» ha misurato 82 ms: rifatto da solo 52/52 verde, poi verde nella corsa
  completa. Nella stessa corsa precedente `mediapipe-simd` «build del gioco» era rosso per un commento di `racchetta.js`
  che conteneva `from 'tap'` (la ricerca degli import della pagina del telefono lo prendeva per un import): commento
  riscritto, verde.
- `(cd tools/lan && node --test test/*.test.mjs)`: **13/13**.
- `node --test tools/test/*.test.mjs`: **316/316** (prima 308: +8 di `b72-lingua.test.mjs`).
- `natpf-tennis/test/natpf-b72-lingua.test.mjs`: **13/13** (regola dello schermo; IT identico; EN per esiti, servizio,
  punti/game/partita con «CPU» e con «Avversario», fine partita e card, pausa del telefono, tabellone, conto, barre;
  protocollo del telefono: telefono di prima = IT, tocco, annuncio, cfg `lg`; «Nuovo giocatore»/chiosco/fiera → IT per
  P1 e P2; stesso schermo P2 EN e P1 IT con le due copie del tabellone; cache).
- `tools/test/b72-lingua.test.mjs`: **8/8** (archivio rotto → IT, messaggi, `cfg` dopo un tocco, due tocchi nel riquadro
  bloccato, posizione dei selettori nella pagina, collegamenti in `racchetta.js`, **copertura del dizionario**: ogni testo
  dell'HTML, ogni `ui('…','…')` di `racchetta.js` e ogni testo di `phone-screen.js`, `stand-pairing.js`, `link.js`,
  `link-life.js`, calibrazione e presa in inglese senza parole italiane rimaste).
- `npm run build`: verde (`dist/natpf/js/tennis/lingua.js` incluso nella pagina del telefono).
- Browser, `CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/natpf-lingua.mjs`: **40/40** sul codice finale (gioco
  vero con vite e PeerJS locale, telefoni simulati). Corse prima: 32/34 (attese della prova sbagliate: la scritta del colpo
  dipende da dove arriva la palla ferma, e in partita il telefono è bloccato quindi la barra non si tocca: la prova ora
  fissa l'arrivo e cambia la lingua dal riquadro bloccato), 40/40, 39/40 (la verifica della pausa leggeva la scritta mentre
  c'era ancora il lampo dell'esito di 0,9 s: ora aspetta la scritta della pausa), 40/40:
  - A (pagina del telefono, Peer finto): annuncio IT al collegamento; selettore nella barra 86×38 px dentro lo schermo;
    tocco EN → barra «Connected to the PC», anello «Connected», «Turn on the sensors», «Hand · Right | Left»,
    «Language», «Options», `lang="en"`, salvata, messaggio `{t:'lang',l:'en'}`; al servizio «Serving» e l'istruzione;
    esito «Out · Late»; pausa per l'altro telefono; riquadro bloccato «Phone 2 · Play!», primo tocco «IT?» senza
    cambiare, secondo tocco IT; dopo una ricarica resta EN e lo annuncia (k 1); `cfg lg it` del gioco → IT; un `cfg`
    partito prima di un tocco non lo annulla.
  - B (contro l'avversario, telefono EN): casella «Serving», tabellone «YOU/OPP · 1 GAME», «Hit when the ball is high /
    Missed toss: try again», «Perfect · 118 km/h», «Opponent's point · Your error: ball out · 0-15», schermata finale
    «You win!», «Match over · Event level», righe «You/Opponent», «Games 1-0».
  - C (stesso schermo, P2 EN, P1 IT): casella della metà del P1 «Al servizio», del P2 «Serving»; tabellone del P1
    «(al servizio)», del P2 «(serving)»; scritta del colpo del P2 «Perfect» a destra, del P1 «Anticipo» a sinistra;
    scritta grande «Punto Marco» in italiano (non tutti e due EN); in partita il telefono del P1 è bloccato: EN dal
    riquadro con due tocchi (dopo il primo il gioco è ancora IT); poi tutti e due EN → «Point Giulia · Marco's error: ball
    in the net» e casella del P1 «Serving».
  - D: «Nuovo giocatore» → IT nel gioco per tutti e due e sui due telefoni (salvata).
  - Schermate (deviceScaleFactor 1) guardate: `A1-telefono-it` (barra con IT|EN a destra, righe Mano e Lingua sopra il
    pulsante giallo), `A2-telefono-en` (tutto in inglese; la barra prima andava a capo con «Connected to the computer»:
    ora «Connected to the PC» su una riga), `A5-bloccato-domanda` («IT?» in giallo in alto a destra, «Phone 2 / Play!»),
    `B2` (casella gialla «SERVING» sopra chi batte con l'icona del lancio, riquadro delle istruzioni in inglese, tabellone
    YOU/OPP, barra «ENERGY»), `B3` («OPPONENT'S POINT» con la riga in inglese), `B4` (scheda finale in inglese con la card «MATCH MVP»,
    «YOU», «Event level», trofei «On a roll · 4 points in a row», «First time · first match», «4 points won», pillole «1 to
    0» e «112 points · Guest, not ranked»; pulsanti in italiano), `C2` («AL SERVIZIO» e «ENERGIA» a sinistra, «SERVING» e
    «ENERGY» a destra; tabelloni uguali nelle sigle GIU/MAR e «1 GAME»),
    `C3` («PUNTO MARCO» a tutta larghezza in italiano), `C4` («POINT GIULIA» in inglese con tutti e due EN),
    `C4-telefono-p1-bloccato-en`, `D1-telefono-p2-dopo-nuovo-giocatore` (pagina di nuovo in italiano).
- Regressioni della pagina del telefono nel browser (server statico su un'altra porta): `natpf-telefono-bloccato.mjs`
  **12/12**, `natpf-nome-telefono.mjs` **23/23**.

## 5. Cosa NON è verificato / non fatto

- **Telefono vero** (Android/iPhone, app NATPF Racchetta 1.0.5), **programma Windows**, **ledwall**: non provati; solo
  Chromium con tocchi e sensori simulati. Da guardare sul telefono vero: la barra in alto con il selettore su schermi
  stretti (320 px) e il selettore nel riquadro bloccato con il telefono tenuto come racchetta.
- Non tradotti (restano in italiano anche con EN): menu, lobby, pagina «Collega» con il suo conto alla rovescia,
  impostazioni, staff, diagnostica, avvisi brevi (toast), pulsanti della schermata finale; nel gioco «Scambio caldo»,
  l'etichetta del gesto in basso (`natpf_gesture_hud`), «perché il super non è scattato» (`natpf_super_hint`), scritte
  dell'allenamento, dei minigiochi e degli scambi di prova (banner «Allenamento», «Livello 2», …), riquadri della webcam
  in pausa, titoli dei trofei al passaggio del mouse; sul telefono i nomi delle schede del tutorial mandati dal computer
  (es. «Presa»: tradotto solo se è nel dizionario), il quadrante della presa orizzontale (spenta: `ALLOW_FLAT` false).
- La voce del gioco è già in inglese (non cambia).
- Le traduzioni sono un dizionario scritto a mano: un testo italiano nuovo aggiunto in futuro resta italiano finché non
  entra nel dizionario (`GAME_EXACT`/`GAME_TEMPLATES` in `natpf_lang.js`, `PHONE_EXACT`/`PHONE_TEMPLATES` in
  `lingua.js`); la prova di copertura del telefono lo segnala per i testi della pagina.
- Unione con `b72-avversario` e `b72-servizio` non provata qui: i punti di contatto sono `natpf_serve_coach.js` (solo
  `paint`, lontano dalle righe del ramo servizio) e, per l'avversario, i testi (`natpf_point_call`, `natpf_scoreboard`,
  `hud_ui`): il dizionario conosce le due forme; da rifare le prove dopo l'unione.
