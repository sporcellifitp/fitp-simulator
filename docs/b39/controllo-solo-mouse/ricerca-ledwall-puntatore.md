ERGONOMIA DEL MOUSE SUL LEDWALL · NATPF 2026-11-13.8 (`168c5b1`, sola lettura; repository pulito, il mio server Vite su :3441 è chiuso)

IN BREVE
1. Il tasto «indietro» del mouse fa sparire il gioco nel programma Windows: si torna alla pagina «Avvio del gioco…». VERIFICATO in Electron 45.2.2; la correzione è di una riga ed è provata.
2. La pagina «Pronto per la partita» si salta davvero. «Alla partita ›» e «Gioca ›» stanno nello stesso rettangolo: un doppio clic, o un clic singolo che arriva fino a 300 ms dopo il passaggio automatico, fa partire la partita. VERIFICATO.
3. Un doppio clic su «Gioca» nel menu sceglie da solo «Stesso schermo» (a 1920×1080) o «Sfida un amico» (nell'area 1080×1080). VERIFICATO.
4. Il puntatore è quello di sistema e non si nasconde mai. Sopra il campo diventa un mirino di 1 px.
5. La calibrazione si fa tutta con il mouse, ma servono circa 110 clic e all'inizio «Salva» non si vede.

=== VERIFICATO (codice, browser, Electron) ===

V1 · Tasto indietro/avanti del mouse (button 3/4)
- Dove:
  - Nel gioco non c'è nessun gestore (niente mouseup/pointerup sui tasti 3/4).
  - Il programma carica prima `loading('Avvio del gioco…')`, una pagina data: (natpf-desktop/src/main.mjs:475, :109), poi il gioco (:508). Quindi nella cronologia c'è una pagina prima del gioco.
  - Il programma non gestisce 'app-command' e non svuota la cronologia.
- Prova in Electron 45.2.2 (Xvfb, tasto back dal livello del contenuto via CDP):
  - Dopo «indietro» resta la pagina «Avvio del gioco…». A schermo intero, senza tastiera, non c'è barra del menu né Ctrl+R per tornare.
  - Il tasto «avanti» ricarica il gioco.
  - Chromium si comporta uguale.
  - Con preventDefault su mouseup o pointerup dei tasti 3/4 non si naviga più; su auxclick invece non basta.
- Oggi con il mouse: rimedia solo il tasto «avanti», se il mouse lo ha.
- Proposta:
  - In natpf_ui.js, all'avvio: `addEventListener('mouseup'|'pointerup', e => { if (e.button===3||e.button===4) e.preventDefault() }, true)`. Facoltativo: nel menu il tasto 3 fa `lobby.back()`.
  - In main.mjs dopo :508: `win.webContents.navigationHistory.clear()`.
  - Test: una prova nel browser come tasto-indietro.mjs.

V2 · Doppio clic e clic «in ritardo»
- Pagina saltata (la segnalazione dell'utente):
  - #lobby-next «Alla partita ›» e #btn-start-match «Gioca ›» (index.html:743-744) hanno lo stesso rettangolo: 1318–1488 × 1004–1056 a 1920×1080, 2258–2428 a 3840×1080 con area 1:1.
  - next() va subito a «Partita» (natpf_lobby.js:671-679). Con il telefono pronto la pagina ci passa da sola dopo 0,7 s (:604-607).
  - Doppio clic con il secondo clic a 120 o 300 ms: la partita è in corso.
  - Clic singolo arrivato 50 o 300 ms dopo il passaggio automatico: la partita è in corso.
  - In entrambi i casi «Pronto per la partita» non si vede, quindi livello, personaggi e «Altre impostazioni» non vengono scelti.
  - Quale dei due casi sia successo all'utente: DEDOTTO, tutti e due sono possibili.
- Menu «Gioca» (natpf_lobby.js:249, cambio pagina immediato): il secondo clic cade sulla pagina Modalità.
  - A 1920×1080 cade su «Stesso schermo» → «Collega i due telefoni».
  - Nell'area 1080×1080 cade su «Sfida un amico», che crea una stanza in rete (:272).
- «Contro la CPU» (:161, la pagina cambia dopo 160 ms): con il secondo clic a 300 ms si sceglie «Smartphone» e si va a «Collega» (innocuo).
- Pulsanti «Avanti ›»:
  - Guida (#onb-next) e allenamento (#coach-next): si passa dalla scheda 0 alla 2.
  - «Salta tutto ›» (#coach-exit): si esce dall'allenamento e il secondo clic apre «Come si gioca».
- Pannello dello stand (natpf_kiosk.js:60, voci a giro alle righe 116/134/137/157): con un doppio clic ogni voce fa due passi.
  - Inattività 45→90 s.
  - Formato in fiera «Solo stesso schermo»→«No».
  - Calibrazione «Giocando»→«Nessuna».
  - Mira «Alta»→«Bassa».
  - Le voci Sì/No tornano com'erano.
- Innocui a 1920×1080: «Gioca ancora», «Nuovo giocatore», «Menu», i pulsanti del nome, «Riprendi ›», «Torna al menu», «Riscaldati prima».
- Proposta: una sola guardia in natpf_ui.js, un ascoltatore click in cattura su window.
  - Scarta i clic veri arrivati meno di 450 ms dopo un cambio di schermata. Il momento del cambio (`ui.changedAt`) lo segnano:
    - natpf_lobby.go() quando cambia pagina;
    - guida e allenamento quando cambia scheda;
    - l'apertura e la chiusura dei fogli e della pausa;
    - la schermata finale (hud_ui.js:339).
  - Scarta anche i clic con `e.detail > 1` sui pulsanti che vanno avanti o fanno girare un valore: [data-staff], #onb-next, #coach-*, #coach-lesson-next, .tut-arrow, #trial-skip.
  - Test: una funzione pura, più una prova nel browser:
    - con un doppio clic su «Alla partita ›» si resta su «Pronto per la partita»;
    - un clic 50 ms dopo il passaggio automatico viene ignorato.

V3 · Puntatore
- È quello di sistema. Il gioco non ha nessun `cursor: none` e nessun puntatore suo.
- `#game-canvas { cursor: crosshair }` (styles.css:54): in partita, sopra il campo, c'è un mirino a linee di 1 px. Resta fermo dove l'ha lasciato l'ultimo clic, di solito «Gioca ›» in basso a destra, e non sparisce mai.
- Sui pulsanti c'è la manina; sul testo la freccia, perché user-select è none (styles.css:20).
- Composizione in scala su una schermata vera: shots/puntatore-in-scala-area-1080.png.
  - La freccia di Windows e il mirino sul campo si vedono appena.
  - Una freccia gialla di 64 px con alone si vede bene.
- Proposta (natpf_cursor.js nuovo + natpf-ui.css; opzione dello stand «Puntatore grande», di base Sì nel programma):
  - Cursore CSS, quindi disegnato da Windows e senza ritardo anche a pochi fotogrammi al secondo: un SVG in data-URI alto circa 5–6% dell'area (48–128 px), giallo con bordo nero, uguale dappertutto. Via il crosshair.
  - Si nasconde: 2,5 s dopo l'ultimo movimento in campo, subito alla partenza della partita, dopo 10 s nei menu.
  - Al primo movimento compare un anello che si allarga per 0,5 s.

V4 · Bersagli piccoli
Misure nel browser in % dell'altezza dell'area. Sono uguali a 1920×1080 e nell'area 1080×1080, perché le misure sono in px fissi.
- Barra dell'allenamento: «Avanti ›» 83×36 e «Salta tutto ›» 117×36 (3,3%, testo 15 px; .btn-sm in natpf-ui.css:82). Stessa misura per «Salta ›» degli scambi di prova (index.html:965).
- Pagina «Collega»: «Apri il link del controller ↗» 157×18 (1,7%) e «Senza telefono? Usa la webcam» 204×20 (1,8%).
- Volume (Opzioni e pausa): binario di 8 px, pomello di 22 px (2%) (natpf-ui.css:1109-1111).
- Altre scelte:
  - pulsanti a segmenti di Opzioni e «Altre impostazioni»: 38 px (3,5%);
  - puntini della guida: 26–40×32 px (3%) (:1633);
  - X del tutorial in campo: 38 px (3,5%) nell'area quadrata, perché la misura segue la larghezza, cqw (:1720).
- Pannello dello stand: voci 229×64 (5,9%), ma con l'etichetta a 13 px (1,2%, :941); «Chiudi» 89×46 (4,3%).
- Pausa ❚❚: 52×52 (4,8%), simbolo di 15 px (natpf-round.css:612-628). È l'unico modo per fermare una partita con il mouse.
- Fogli e lobby: pulsanti di 46 e 52 px, testo 17–19 px (natpf-ui.css:795-806, :823). Su un'uscita 4K restano uguali, cioè metà in proporzione.
- L'effetto al passaggio del mouse da lontano non si vede: lo sfondo si schiarisce del 6–14% e il pulsante si sposta di 1–3 px (:818-819, :939, :581, :622, :692). L'anello giallo c'è solo con la tastiera (:focus-visible).
- Proposta:
  - Misure legate all'area come nel tutorial: `clamp(misura di oggi, N cqh, massimo)`. Pulsanti ≥ 5,5cqh, pausa e .btn-sm ≥ 6cqh, testo dei comandi ≥ 2cqh, binario 1,2cqh e pomello 3cqh, X del tutorial in cqmin.
  - I due link di «Collega» diventano pulsanti, oppure si nascondono nel programma.
  - :hover con lo stesso anello giallo di :focus-visible.

V5 · Calibrazione (natpf_calibra.js)
- Con il mouse si fa tutta (righe 62-74; index.html:1011-1060): formato, bordo (anche cliccando le frecce sui bordi), − / + a passi dello 0,5%, Azzera, Annulla, Salva.
- Solo con la tastiera: il passo del 5% (Maiusc + frecce, :129), Tab, i tasti numerici, F.
- Caso del processore LED che prende 1000×1000 in alto a sinistra di 1920×1080. Il programma non ha ?area=, quindi si parte da «Intero».
  - Il pannello è al centro della finestra (natpf-ui.css:1448).
  - Nella parte visibile ci sono − e +, ma «Salva» e «Annulla» per lo 0% e «Azzera» per il 45%.
  - Il «+» si sposta a ogni clic. Con il puntatore fermo vanno a segno 5 clic, poi bisogna inseguirlo.
  - In tutto servono 110 clic (circa 96 per destra e 15 per sotto) per arrivare a 1008×999.
- Proposta:
  - (a) Due clic: «clicca l'angolo in alto a sinistra che vedi sul ledwall, poi quello in basso a destra». È il modo più preciso, perché il puntatore si vede solo nella parte visibile.
  - (b) Frecce dei bordi trascinabili.
  - (c) − / + che ripetono tenendo premuto, con accelerazione, più un passo del 5% per il mouse.
  - (d) Pannello fermo in alto a sinistra, o spostabile.
  - (e) Al posto della riga dei tasti: «Trascina le frecce fino ai bordi che vedi».
  - File: natpf_calibra.js, index.html, natpf-ui.css:1429-1490, più test delle funzioni pure.

V6 · Fuori dall'area e il resto
- Clic, doppio clic e tasto destro fuori dall'area (con ?area=0,0,1000,1000 colpiscono l'html nero) non fanno niente: provato nel menu, con il pannello dello stand aperto e con la guida aperta.
- Un clic sullo sfondo della guida, appena fuori dalla scheda, la chiude (natpf_onboarding.js:91). Con un puntatore impreciso succede quando si manca un puntino.
- Tasto destro: nel gioco non c'è nessun gestore; nel programma non compare nessun menu (prova del controllo «programma», mouse/prova-electron.log).
- Rotellina:
  - sul campo non fa niente (l'unico ascoltatore è in natpf_kiosk.js:56);
  - le Opzioni nell'area 1080×1080 scorrono (95 px);
  - il pannello dello stand non deve scorrere.
- Selezione del testo: spenta ovunque (styles.css:14-21).
- Immagini e link si possono trascinare, perché non hanno draggable=false.
  - Immagini: index.html:185, 193, 341, 560; natpf_training.js:674, 760; natpf_tutorial.js:261.
  - Link: index.html:546, 584, 600, 836; natpf_ui.js:490.
- Il chiosco non conta il movimento del mouse come attività: conta solo pointerdown, keydown, touchstart e wheel (natpf_kiosk.js:56).

=== DEDOTTO ===
- D1 · Puntatore perso. Se il ledwall mostra solo una parte dell'uscita, o il desktop è esteso su due schermi, la freccia esce dalla parte visibile e non si ritrova.
  - Proposta in natpf_cursor.js: una freccia sul bordo dell'area che punta verso il puntatore quando questo è fuori da viewport(), e la scritta «Il puntatore è fuori dal ledwall» quando lascia la finestra.
  - Nel programma, per sapere la direzione, `screen.getCursorScreenPoint()` via preload.
  - Pointer Lock con un puntatore del gioco solo come ultima scelta: i clic simulati non vengono presi come veri dallo schermo intero, dai cursori dei volumi e dall'abbinamento del telecomando.
- D2 · Finestre di sistema centrate sulla finestra, quindi in parte fuori dalla zona 1000×1000, e scritte piccole:
  - confirm('Azzerare la classifica di oggi?') (natpf_kiosk.js:120);
  - confirm('Eliminare questa sessione diagnostica?') (natpf_diag.js:156);
  - showMessageBox del programma;
  - «Salva con nome» del CSV.
  - Proposta: un foglio di conferma del gioco, dentro l'area.
- D3 · Nella versione web il tasto destro apre il menu del browser, con «Indietro» e «Ricarica».
  - Proposta: preventDefault su contextmenu.
  - Proposta: tasto destro tenuto 2 s, con un anello che si riempie, apre il pannello dello stand ovunque, anche in partita. I visitatori non usano il mouse.
  - Oggi con il mouse il pannello si apre solo tenendo premuto il marchio, che però è nascosto nella pagina principale (natpf-ui.css:552) e assente in partita. Nella pausa la voce non c'è (index.html:906-919).
- D4 · Trascinare un'immagine o un link mostra solo un'immagine fantasma: nessuna navigazione nella stessa pagina, e Electron ha navigateOnDragDrop spento di base. Proposta: `img, a { -webkit-user-drag: none }`.
- D5 · Chromium sostituisce i cursori CSS più grandi di 32 px con quello normale vicino ai bordi della finestra. È accettabile.
- D6 · Con il chiosco acceso, chi muove solo il mouse per 45 s viene riportato al menu. Proposta: pointermove, al massimo una volta al secondo, tra le attività (natpf_kiosk.js:56).
- D7 · Misura del cursore di Windows al 100%: freccia di circa 12×19 px in una cella 32×32. Su un'area alta 1080 px è l'1,8% dell'altezza; su 3840×1080 è lo 0,5% della larghezza. Se il processore riduce l'immagine, il bordo nero di 1 px sparisce (shots/puntatore-in-scala-ledwall-meta-pixel.png).
  - Subito e senza codice: Impostazioni di Windows → Accessibilità → Puntatore del mouse, dimensione 3–5 e colore giallo-verde, più le tracce del puntatore.
- Per la B38 (tastiera a schermo): tasti ≥ 6cqh, e «Fatto» dentro la guardia del doppio clic.

NON PROVATO: Windows vero (dimensione reale del cursore, percorso nativo WM_XBUTTON, posizione delle finestre di sistema), ledwall e processore LED veri, cursori più grandi di 32 px in Electron su Windows, telefono reale durante il passaggio automatico.

FILE in /tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/ledwall2/:
- Doppio clic: doppio-clic2.mjs, doppio-clic-riassunto.json (tutte le corse), doppio-clic-1920x1080.json, doppio-clic-3840x1080-schermo11.json.
- Tasto indietro: tasto-indietro.mjs e .json; electron-indietro/main.mjs.
- Area e calibrazione: area-calibra.mjs e .json.
- Misure: misure-chiave.mjs e .json. Le misure complete del giro precedente dello stesso controllo, sulla stessa versione, sono in /tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/ledwall/misure.json e misure-fhd.json.
- Schermate (cartella shots/): doppio-clic-stesso-punto.png, puntatore-in-scala-area-1080.png, puntatore-in-scala-3840x1080.png, puntatore-in-scala-ledwall-meta-pixel.png, calibra-inizio-1920x1080.png, calibra-fine-1920x1080.png.