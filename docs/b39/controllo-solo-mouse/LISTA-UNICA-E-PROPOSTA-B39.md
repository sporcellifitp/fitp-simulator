STAND CON IL SOLO MOUSE · sintesi delle 4 ricerche (NATPF 2026-11-13.8)
Il codice di 6159b7e è lo stesso di HEAD 8b537ae: l'ho controllato con un `git log` in sola lettura e dopo non ci sono commit di codice. Repository e worktree non toccati.

Segni:
- [V] verificato, in uno di questi modi: prova nel browser con il solo mouse, Electron 45.2.2 per Linux in Xvfb, oppure lettura del codice.
- [D] dedotto.

Fonti:
- R1: tasti del gioco
- R2: programma Windows
- R3: ledwall, puntatore, doppio clic
- R4: percorso completo con il solo mouse

## 1. Elenco per importanza

### BLOCCANTE

**1. Pannello dello stand in partita e nel menu principale** · piccolo (più la voce del tasto destro, n. 4) · B39. F9 e la voce di menu di B37 non bastano: F9 è un tasto e la barra del menu non si vede mai.
- Oggi:
  - [V] In campo e in pausa non c'è nessuna via. La pausa non ha la voce (index.html:906-919), il marchio in campo è 0×0, 3 s su ❚❚ aprono solo la pausa.
  - [D] Uguale a fine partita, nell'intro e nel tutorial in campo.
  - [V] Pagina principale del menu: il marchio è `visibility:hidden` (natpf-ui.css:552). Il titolo grande `.menu-brand` (index.html:336) non ascolta, perché natpf_kiosk.js:62-67 ascolta solo `.lobby-brand`.
  - [V] Nelle altre pagine del menu 3 s sul marchio funzionano, ma non c'è nessun segno di avanzamento e la pressione si annulla in silenzio se il puntatore esce dal marchio.
- Col mouse oggi: ❚❚ → «Torna al menu» (la partita si perde) → un'altra pagina → marchio 3 s. Oppure il telecomando dello staff, se abbinato (natpf_remote_map.js:169-170): non provato.
- Proposta:
  - marchio attivo anche nella pagina principale: ascolto su `.menu-brand`, oppure `opacity:0` al posto di `visibility:hidden`;
  - anello che si riempie nei 3 s, e pressione che tollera piccoli spostamenti;
  - ❚❚ tenuto 3 s apre il pannello (il clic breve resta la pausa);
  - voce nel menu del tasto destro (n. 4), con il canale di B37.

**2. Campi di testo** · B38, più un piccolo lavoro · B38, con le aggiunte sotto
- Oggi: [V] non si può scrivere in questi campi:
  - nome dei minigiochi, che quindi non partono: il nome è obbligatorio, almeno 2 caratteri (natpf_events.js:44), e c'è solo «Indietro» (natpf_lobby.js:314);
  - i due nomi dello stesso schermo;
  - il codice della sfida sul computer 2 (campo 76×40);
  - nota della diagnostica e ritardo dello schermo (natpf_diag.js:185, :190).
  - Il percorso Gioca → Contro la CPU non chiede il nome.
- Col mouse oggi: solo «Salta» nel foglio di «Nuovo giocatore» (il visitatore resta «Ospite»).
- Da aggiungere a B38:
  - [V, tastiera vera] Una «D» maiuscola in un nome apre la diagnostica e la lettera si perde: «Dario» diventa «ario». natpf_diag.js:53-56 non guarda se il fuoco è in un campo: è un bug già oggi.
  - I tasti a schermo non devono mandare Maiusc+D/M sintetici e non devono prendere il fuoco. [D] Il conto alla rovescia dello stesso schermo aspetta chi scrive solo se il campo ha il fuoco (natpf_split_ui.js:486).
  - Tasti ≥ 6cqh e «Fatto» dentro la guardia del doppio clic (n. 10).
  - «Gioca come Ospite» nei minigiochi: domanda 3.

**3. Tasto laterale «indietro» del mouse: il gioco sparisce** · piccolo · B39
- Oggi:
  - [V Electron] Il programma carica prima la pagina «Avvio del gioco…» (data:, main.mjs:475, :109) e poi il gioco (:508). Il tasto «indietro» torna ad «Avvio del gioco…». A schermo intero, senza menu e senza Ctrl+R, si resta lì.
  - Il gioco non gestisce i tasti 3/4. In Chromium succede lo stesso.
- Col mouse oggi: solo il tasto «avanti», se il mouse lo ha.
- Proposta:
  - in natpf_ui.js, `preventDefault` su mouseup e pointerup dei tasti 3/4, in cattura ([V] su auxclick non basta);
  - in main.mjs, dopo :508, `win.webContents.navigationHistory.clear()`;
  - facoltativo: nel menu il tasto 3 fa «‹ Indietro».

**4. Comandi del programma: Esci, Ricarica, Rete, Registri, Scheda grafica** · medio · B39
- Oggi:
  - [V Electron] La barra del menu non si vede mai: `isMenuBarVisible()` vale false a schermo intero e anche in finestra, dove compare solo con Alt (main.mjs:132-136, menu :352-386). Le scorciatoie sono solo da tastiera (desktop-core.mjs:160-171).
  - Senza nessuna via col mouse:
    - Ricarica (:360);
    - Scheda grafica (:263-267);
    - cartella dei registri (:375): il ponte `registro.open` esiste, ma nessun pulsante lo usa;
    - «Apri la rete ai telefoni» dopo l'avvio (:370);
    - scelta del monitor per nome: il pannello fa solo «successivo» (natpf_kiosk.js:127-129).
  - L'avviso «Rete non aperta» rimanda al «menu Rete» (:251).
  - Il gioco non ha né «Esci» né «Ricarica».
- Col mouse oggi:
  - Si esce con il pulsante «Schermo intero» del gioco → finestra → X. [V codice] Trappola: così si salva `fullscreen:false` (:211) e il prossimo avvio è in finestra (:422).
  - [D] Con un secondo monitor: tasto destro sull'icona nella barra delle applicazioni → «Chiudi finestra».
  - La rete ai telefoni si riapre solo riavviando il programma.
- Proposta:
  - Una lista di comandi in desktop-core.mjs, provata con node:test.
  - Un menu del tasto destro sul gioco: `webContents.on('context-menu')` → `Menu.popup`, solo sulle pagine del proprio server. [V] L'evento arriva già e il gioco non usa `contextmenu`.
  - Voci del menu:
    - Pannello dello stand
    - Diagnostica
    - Calibra / Azzera la calibrazione
    - Schermo intero ✓
    - Schermo del gioco ▸
    - Ricarica il gioco
    - Riavvia il programma
    - Rete ▸
    - Aggiornamenti…
    - Scheda grafica…
    - Cartella dei registri
    - Esci…, con conferma: `app.quit()` senza toccare `fullscreen`.
  - Icona nell'area di notifica con lo stesso menu, solo se lo staff vede il portatile (domanda 1).
  - Che forma dare al menu: domanda 2.

**5. Porta 8443 o 8080 occupata all'avvio** · piccolo-medio · B39 (è un bug, non riguarda solo il mouse)
- Oggi:
  - [V Electron Linux e Node] Compare l'errore inglese «A JavaScript error occurred in the main process … EADDRINUSE» con il solo «Ok». Il gioco resta fermo su «Avvio del gioco…» e nel registro non resta niente.
  - Causa: l'errore ripetuto da ws non ha ascoltatore (tools/lan/server.mjs:39, :61; launcher.mjs:24, :28). Così il dialogo italiano (main.mjs:480-487) non arriva mai; inoltre nomina sempre la 8443.
  - La 8080 serve solo alla guida LAN.
  - docs/COLLAUDO_WINDOWS.md:196 descrive un messaggio che non può comparire.
  - La 8081 occupata è gestita.
- Col mouse oggi: solo «Ok». Con il solo ledwall non c'è uscita.
- Proposta:
  - `wss.on('error', …)` in createLanServer, con un test a porta occupata in tools/lan;
  - guida 8080 facoltativa, oppure `setupPort: 0`;
  - dialogo con la porta vera (e, se è semplice, il programma che la occupa) e i pulsanti «Riprova · Chiudi»;
  - `process.on('uncaughtException')` che scrive nel registro e mostra un messaggio italiano con «Chiudi il programma».

**6. Diagnostica e «Prova guidata» dal menu** · piccolo · B39
- Oggi:
  - [V] Né il menu né il pannello hanno «Diagnostica». La si apre solo così:
    - Maiusc+D (natpf_diag.js:53-56);
    - Pausa → Diagnostica, in campo (natpf_pause.js:38-40);
    - ● REC durante una registrazione (natpf_diag.js:90-92).
  - La prova guidata parte solo dal menu (:119).
  - Gli avvisi «sessione interrotta» e «disco pieno» dicono «Maiusc+D» (:61, :65).
  - Il ritardo dello schermo (:190) si raggiunge solo dal campo.
- Col mouse oggi: sulla prova guidata le ricerche non concordano (contraddizione 1).
- Proposta:
  - «Diagnostica» nel pannello, nella riga in basso (per lo spazio vedi contraddizione 6), e nel menu del tasto destro;
  - testi che indicano la strada del mouse.

**7. Classifica a schermo intero senza uscita** · piccolo · B39
- Oggi:
  - [V] Il pannello accende `ranking-full` (natpf_kiosk.js:118), che nasconde «‹ Indietro», «Come si gioca» e «Schermo intero» (natpf-ui.css:1044-1046, :1390).
  - La classe si toglie solo cambiando pagina (natpf_lobby.js:496) o con Esc/Backspace (:732).
  - [V] Con la classifica vuota, «Ancora nessuna partita oggi» va a capo parola per parola.
- Col mouse oggi: marchio 3 s → «Nuovo giocatore», che azzera il visitatore e apre il foglio del nome. Oppure si aspettano 45 s il chiosco, se è acceso.
- Proposta:
  - a classifica accesa, il pulsante del pannello diventa «Chiudi lo schermo intero»;
  - un «× Chiudi» discreto che compare quando si muove il mouse;
  - sistemare l'a capo.

**8. Gioco bloccato (pagina che non risponde)** · piccolo · B39 · [D], quando succede
- Oggi:
  - [V grep] Non c'è nessun gestore `'unresponsive'`: main.mjs:507 gestisce solo la pagina chiusa di colpo. Si recupera solo con Ctrl+R.
  - [D] Anche il menu del tasto destro nasce dalla pagina, quindi non comparirebbe.
- Proposta:
  - `win.on('unresponsive')` → dopo 10 s una finestra «Il gioco non risponde» con Ricarica · Aspetta · Chiudi il programma;
  - la finestra si chiude da sola con `'responsive'`;
  - con il chiosco acceso il gioco si ricarica da solo dopo 30 s;
  - l'icona nell'area di notifica resta raggiungibile.

**9. Calibrazione sbagliata salvata** · piccolo (rientra nel n. 4) · B39 · [D]
- Oggi:
  - [D] Se l'area salvata cade fuori dalla parte visibile, la tastiera recupera alla cieca (R + Invio), il mouse no: i comandi del gioco stanno dentro l'area.
  - [V] Clic e tasto destro fuori dall'area colpiscono l'html nero e non fanno niente.
- Proposta: «Azzera la calibrazione» nel menu del tasto destro, che si apre al puntatore e quindi nella parte visibile, e nell'icona dell'area di notifica.

### IMPORTANTE

**10. Doppio clic e clic «in ritardo»** · piccolo-medio · B39
- Oggi [V, secondo clic a 110–300 ms]:
  - «Pronto per la partita» viene saltata.
    - «Alla partita ›» (#lobby-next) e «Gioca ›» (#btn-start-match) hanno lo stesso rettangolo (index.html:743-744).
    - next() cambia pagina subito (natpf_lobby.js:671-679). Con il telefono pronto la pagina passa da sola dopo 0,7 s (:604-607).
    - Un doppio clic, o un clic singolo 50–300 ms dopo il passaggio automatico, avvia la partita senza scegliere livello, personaggi e «Altre impostazioni».
    - R3 lo collega al salto segnalato dall'utente; quale dei due casi gli sia capitato è [D].
  - Menu «Gioca» (:248-249):
    - a 1280×720 e 1920×1080 si finisce in «Stesso schermo»;
    - nell'area 1080×1080 si finisce in «Sfida un amico», che crea una stanza in rete (:272);
    - a 720×720 non succede niente.
  - «Allenamento» → «Webcam»: la racchetta resta salvata come webcam (natpf_ui.js:409) e la webcam si accende.
  - «Minigiochi» → si apre il foglio del nome.
  - «Contro la CPU» a 250–300 ms (la pagina cambia dopo 160 ms, :161, :190): salta «Racchetta» e prende la tessera sotto il puntatore.
  - «‹ Indietro» (:192-193) salta una pagina.
  - Guida e allenamento:
    - «Avanti ›» (#onb-next, #coach-next) passa dalla scheda 0 alla 2;
    - «Salta tutto ›» esce e il secondo clic apre «Come si gioca».
  - Pannello (natpf_kiosk.js:60; voci a giro :116, :134, :137, :157): ogni doppio clic fa due passi.
    - Inattività 45→90 s
    - Formato «Solo stesso schermo»→«No»
    - Calibrazione «Giocando»→«Nessuna»
    - Mira «Alta»→«Bassa»
- Proposta: una sola guardia in natpf_ui.js, un ascoltatore click in cattura su window.
  - Scarta i clic veri arrivati meno di ~450 ms dopo un cambio di schermata. Il momento del cambio (`ui.changedAt`) lo segnano:
    - lobby go();
    - il cambio di scheda di guida e allenamento;
    - l'apertura e la chiusura di fogli e pausa;
    - la schermata finale (hud_ui.js:339).
  - Scarta i clic con `detail > 1` sui pulsanti che vanno avanti o fanno girare un valore: [data-staff], #onb-next, #coach-*, #coach-lesson-next, .tut-arrow, #trial-skip e le voci della lobby.
  - La decisione sta in una funzione pura, con test.

**11. Puntatore sul ledwall** · medio · B39
- Oggi:
  - [V codice] Il puntatore è quello di sistema e non si nasconde mai.
  - Sul campo c'è `cursor: crosshair` (styles.css:54): un mirino di 1 px, fermo dove l'ha lasciato l'ultimo clic (di solito «Gioca ›»), davanti al pubblico.
  - Composizione in scala (non sul ledwall vero): la freccia di Windows e il mirino si vedono appena; una freccia gialla di 64 px si vede bene.
  - [D] La freccia di Windows è di circa 12×19 px, cioè l'1,8% circa di un'area alta 1080 px. Se il processore LED ritaglia l'immagine, o se il desktop è esteso, il puntatore esce dalla parte visibile e si perde.
- Proposta:
  - Opzione «Puntatore: Normale · Grande», con Grande di base nel programma.
  - Cursore CSS, che disegna Windows e quindi non ha ritardo: giallo con bordo nero, alto circa il 5–6% dell'area (48–128 px). Via il mirino.
  - In campo il puntatore sparisce dopo ~3 s fermo e alla partenza della partita; nei menu dopo 10 s.
  - Un anello breve al primo movimento.
  - Una freccia sul bordo dell'area quando il puntatore è fuori da `viewport()`; nel programma con `screen.getCursorScreenPoint()`.
  - Subito e senza codice: Windows → Accessibilità → Puntatore del mouse, dimensione 3–5, colore giallo-verde.

**12. Bersagli piccoli e passaggio del mouse invisibile** · medio · B39
- Oggi: [V] misure in % dell'altezza dell'area. Sono in px fissi, quindi su un'uscita 4K valgono la metà.
  - .btn-sm alto 36 px (3,3%), testo di 15 px: «Avanti ›», «Salta tutto ›», «Salta ›» degli scambi di prova (natpf-ui.css:82, index.html:965).
  - Link della pagina «Collega»: 157×18 e 204×20.
  - Volume: binario di 8 px, pomello di 22 px (natpf-ui.css:1109-1111).
  - Pulsanti a segmenti: 38 px.
  - Puntini della guida: 26–40×32 (:1633).
  - X del tutorial: 38 px nell'area quadrata (:1720).
  - Etichette del pannello: 13 px (:941).
  - ❚❚: 52×52, con simbolo di 15 px (natpf-round.css:612-628).
  - ● REC: 92×23.
  - L'effetto al passaggio del mouse da lontano non si vede: lo sfondo si schiarisce del 6–14% e il pulsante si sposta di 1–3 px. L'anello giallo c'è solo con la tastiera (`:focus-visible`).
- Proposta:
  - misure `clamp(misura di oggi, N cqh, massimo)`;
  - pulsanti ≥ 5,5cqh, ❚❚ e .btn-sm ≥ 6cqh, testo ≥ 2cqh, binario 1,2cqh, pomello 3cqh, X in cqmin;
  - `:hover` con lo stesso anello di `:focus-visible`;
  - i link di «Collega» diventano pulsanti, o spariscono nel programma.

**13. Riquadro «Telefono in pausa» sopra la pausa e sopra il QR** · piccolo · B39 (non riguarda solo il mouse)
- Oggi:
  - [V] `.natpf-phone-hold` ha z-index 60 come i fogli (natpf-ui.css:827, natpf.css:454), ma viene dopo nel DOM (natpf_ui.js:646-650), quindi sta sopra.
  - Stesso schermo: il riquadro con il QR (natpf_ui.js:679) copre tutte le voci della pausa.
    - A 1280×720 copre anche «Torna al menu» e «Riprendi ›»: in una prova il clic non è partito.
    - A 1920×1080 questi due restano cliccabili.
  - Gioco singolo: copre l'angolo del QR del pannello del telefono, mirino compreso, e i volumi. [D] Il QR probabilmente non si legge: in quel caso sarebbe bloccante.
- Col mouse oggi: «Torna al campo», poi ❚❚ → «Torna al menu», dove non è coperto.
- Proposta: con un foglio aperto il riquadro va sotto o in basso; il QR si mostra intero nella pausa o nel pannello.

**14. Diagnostica aperta dalla pausa: la partita riparte** · piccolo · B39
- Oggi:
  - [V] In 4 s passano 3,9 s di gioco (fase POINT_OVER → SERVE_STANCE).
  - natpf_pause.js:40 chiude la pausa prima di aprire la diagnostica. `_syncPause` (natpf_ui.js:216) non conta la diagnostica, e natpf_diag.js:69-70 non lo richiamano.
  - [D] Se batte la CPU, il punto si gioca dietro il pannello.
- Proposta: partita ferma finché la diagnostica è aperta; alla chiusura si torna alla pausa.

**15. «Torna al menu» in pausa senza conferma** · piccolo · B39
- Oggi: [D, con schermata] natpf_pause.js:41. Il pulsante è accanto a «Riprendi ›»: un clic impreciso chiude la partita del visitatore.
- Proposta: un secondo clic di conferma («Sicuro? Clicca ancora»), come in natpf_remote.js:64.

**16. Finestre di Windows sul ledwall** · piccolo · B39
- Oggi:
  - [V] `confirm()` per «Azzerare la classifica di oggi?» (natpf_kiosk.js:120) e per «Eliminare questa sessione diagnostica?» (natpf_diag.js:156).
  - [V Electron] «Scarica CSV» (natpf_events.js:165) apre «Salva con nome». Lo stesso vale per «Scarica la coda» (natpf_registro.js:131) e per il salvataggio della diagnostica (diag_export.js:33).
  - [D] Sono finestre piccole, fuori stile e centrate sulla finestra: con un'area parziale i pulsanti possono cadere fuori dalla parte visibile.
- Proposta:
  - conferme dentro il gioco, come nel n. 15;
  - `will-download` → salvataggio diretto in Download (o in %LOCALAPPDATA%\NATPF\esportazioni), con l'avviso «Salvato: … · Apri la cartella».

**17. Link e trascinamenti nel programma** · piccolo · B39
- Oggi:
  - [V Electron] Un link `target=_blank` apre sopra il gioco una finestra 800×600, con la barra del menu del programma. Link: index.html:546, 584, 600, 774, 791, 836; natpf_ui.js:490; `window.open` in motion_controls.js:531.
  - Mancano `setWindowOpenHandler`, `will-navigate` e `will-download` (grep).
  - File trascinato sulla finestra: vedi contraddizione 4.
  - Immagini e link si possono trascinare. [D] Si vede solo un'immagine fantasma.
- Col mouse oggi: la finestra in più si chiude con la sua X.
- Proposta:
  - `setWindowOpenHandler` → nega, con l'avviso «Il link è per il telefono: inquadra il QR»;
  - `will-navigate` consentito solo verso il proprio server (`isOwnUrl`);
  - `img, a { -webkit-user-drag: none }`.

**18. Calibrazione lenta** · medio · B39
- Oggi: [V] si fa tutta col mouse, ma:
  - un clic = 0,5% (natpf_calibra.js:18, :69), e tenere premuto fa un solo passo;
  - «−» e «+» sono 30×30 e si spostano a ogni clic: dopo 5 clic vanno inseguiti;
  - i segni dei bordi si cliccano, non si trascinano;
  - il passo del 5% c'è solo con Maiusc+frecce (:129);
  - dentro la calibrazione non c'è lo schermo intero;
  - la legenda elenca solo tasti (index.html:1067).
  - Esempio: area 1000×1000 in alto a sinistra di 1920×1080 (il programma parte da «Intero»). Servono circa 110 clic, e all'inizio «Salva» e «Annulla» sono fuori dalla parte visibile, perché il pannello sta al centro della finestra (natpf-ui.css:1448).
- Proposta:
  - calibrazione in due clic: l'angolo in alto a sinistra e quello in basso a destra che si vedono sul ledwall;
  - frecce dei bordi trascinabili;
  - −/+ che ripetono tenendo premuto, con accelerazione, più i pulsanti ±5%;
  - pulsanti più grandi;
  - pannello in alto a sinistra, o spostabile;
  - «Schermo intero» nel pannello della calibrazione;
  - istruzioni per il mouse.

**19. Avvio e PC dello stand** · piccolo, più una guida · B39
- Oggi:
  - [V codice] La domanda del firewall (main.mjs:244) non ha tempo massimo e tiene il gioco su «Avvio del gioco…». [D] Compare sopra il gioco, sul ledwall.
  - Una finestra trascinata su un altro monitor non viene ricordata (:430, :163).
  - Dopo l'uscita «finestra + X» si riparte in finestra (n. 4).
  - Contro la sospensione ci sono solo `powerSaveBlocker` (:476) e il wake lock (natpf_wake_lock.js:9).
  - [D] Non sono coperti: coperchio chiuso, pulsante di accensione, blocco aziendale, riavvii di Windows Update. Se il PC si blocca, il PIN col solo mouse si scrive solo con la tastiera su schermo di Windows.
- Proposta:
  - «Più tardi» automatico dopo 60 s;
  - monitor ricordato anche quando si trascina la finestra;
  - «Avvio con Windows: Sì · No» (`app.setLoginItemSettings`, senza permessi di amministratore);
  - guida «PC dello stand con il solo mouse»:
    - schermo e sospensione: Mai; coperchio: Non fare nulla;
    - salvaschermo: Nessuno;
    - Non disturbare acceso;
    - Windows Update sospeso;
    - puntatore grande;
    - tastiera su schermo come ultima risorsa.

### UTILE

**20. Testi che parlano solo di tasti** · piccolo · B39
- [V] Nel gioco:
  - «Premi un tasto per iniziare» (index.html:191); il clic funziona;
  - righe in basso «↑ ↓ ← → … Invio … Esc» (natpf_lobby.js:563, index.html:741);
  - legenda della calibrazione (:1067);
  - title «Pausa (Esc)», «(F)», «(H)», «Aspetta Esc», «tasto 1–6» (index.html:900, 320-321, 752, 1031-1036; natpf_screen.js:367);
  - diagnostica (natpf_diag.js:61, 65, 91, 103, 119, 176, 187);
  - modalità prova (index.html:636, natpf_serve_coach.js:24).
- Nel programma e nell'installatore:
  - main.mjs:251;
  - installatore.nsi:57 e :206 («tasto Alt»);
  - installatore.nsi:159: dà un percorso dentro AppData, che è nascosta. Meglio aprire Esplora file con l'installer già selezionato (`/select`).
- Nei documenti:
  - GUIDA_TELECOMANDO.md:13, :81;
  - COLLAUDO_WINDOWS.md:8, 80, 98, 109-117, 126, 131, 151, 196, 200, 204;
  - natpf-desktop/LEGGIMI.md.
- Proposta: quando l'ultimo comando viene dal mouse, testi per il mouse («Clicca o premi un tasto») e riga dei tasti nascosta.

**21. Piccole comodità** · piccolo ciascuna · B39
- «Segna questo momento» si raggiunge con 2 clic dal ● REC (natpf_diag.js:176) → un pulsante «Segna» accanto al REC.
- Le spiegazioni del pannello stanno solo nei title (index.html:238-243, 251) → la riga #staff-note (:245) spiega la voce sotto il puntatore.
- Chiosco: il movimento del mouse non conta come attività (natpf_kiosk.js:56) → contare pointermove, con una soglia e al più una volta al secondo.
- Modalità prova «mouse e tastiera»: si accende e si spegne solo scrivendo «natpf» (natpf_lobby.js:710) e resta salvata (natpf_ui.js:394) → interruttore nel pannello, oppure la spengono «Nuovo giocatore» e il chiosco (vedi contraddizione 5).
- Guida: un clic appena fuori dalla scheda la chiude (natpf_onboarding.js:91) → chiusura solo con la ×, o con un margine.
- Programma:
  - scelta del monitor per nome (il ponte ha già `choose(id)`, preload.cjs:65);
  - doppio clic sull'icona con il programma già aperto → `win.flashFrame`;
  - «Riavvia il programma» dopo un cambio di rete (rientra nel n. 4);
  - foglio «Programma ›» con lo stato (versione, scheda grafica, rete, registri) e il ponte `natpfDesktop.app`.
- Da tenere d'occhio [V, causa non trovata]: in 3 aperture su circa 20 il primo clic su «Gioca» non ha cambiato pagina. In 14 prove mirate non è mai successo.
- Nessun intervento per i tasti che allo stand non servono: C (camera manuale, che «Visuale» rimette su Auto), tasti del Player 2 e della modalità prova.

**Già a posto col mouse [V]:**
- intro (2 clic), menu e tessere, pagina «Collega»
- X del tutorial in campo, impostazioni della partita, «Salta ›» degli scambi di prova
- ❚❚ e «Riprendi ›», fine partita, «Salta» di «Nuovo giocatore»
- guida, Opzioni, REC / Ferma / Scarica
- monitor successivo, aggiornamenti, QR del certificato, domanda del monitor all'avvio
- Schermo intero: il pulsante c'è; nel programma l'ho solo letto nel codice.

## Contraddizioni tra le ricerche

1. **Prova guidata col mouse.**
   - R1 [D]: si raggiunge con il giro Pausa → Diagnostica → Avvia registrazione → Torna al menu → ● REC → Ferma → Prova guidata.
   - R4 [D]: non si raggiunge.
   - Nessuna delle due l'ha provato. In ogni caso allo stand non è usabile.
2. **Voci a giro del pannello col doppio clic.**
   - R4: «funzionano anche con doppio clic».
   - R3 [V]: ogni doppio clic fa due passi, con i valori misurati.
   - R3 è più preciso: R4 ha guardato se le voci rispondono, non che valore prendono.
3. **«Avanti ›» col doppio clic.**
   - R4: innocuo.
   - R3 [V]: quello della guida e dell'allenamento salta una scheda.
   - Probabilmente sono pulsanti diversi: R4 non dice quale ha provato.
4. **File trascinato sulla finestra del programma.**
   - R2 [D]: la pagina va su file:// e il gioco sparisce.
   - R3 [D]: Electron ha navigateOnDragDrop spento di base, quindi non succede niente.
   - Da provare in Electron (la versione 45.2.2 per Linux è già nello scratchpad).
5. **Trascinamenti del mouse sul campo mentre si gioca col telefono.**
   - R4: non danno colpi (natpf_ui.js:389).
   - R1 [D]: li danno se la modalità prova è rimasta accesa (natpf_ui.js:382-390).
   - Probabilmente parlano di condizioni diverse. Da provare.
6. **Spazio nel pannello.**
   - R1: nella riga in basso c'è posto per «Diagnostica».
   - R2: a 1024×600 c'è posto per un solo pulsante in più (index.html:259).
   - Se servono sia «Diagnostica» sia «Programma ›»: un unico «Strumenti ›» che apre un foglio, oppure una schermata a 1024×600 prima di decidere.
7. **Puntatore.**
   - R2: un alone disegnato dalla pagina, nessun file nuovo, sparisce dopo 3 s.
   - R3: un cursore CSS disegnato da Windows, senza ritardo, in un file nuovo natpf_cursor.js, sparisce dopo 2,5 s.
   - Consiglio R3, con l'anello solo come breve segnale.
   - Su Windows i cursori sopra i 32 px non sono provati. R2: Chromium accetta immagini fino a 128 px. R3: vicino ai bordi Chromium rimette il cursore normale.
8. **Tasto destro.**
   - R1: menu dello staff disegnato dal gioco; nel browser resta quello del browser.
   - R2: menu di Windows del programma.
   - R3: tasto destro tenuto 2 s con un anello, ovunque, e menu del browser bloccato anche nella versione web.
   - Vedi domanda 2.
9. **Durata della guardia del doppio clic.** R1 dice circa 400 ms, R3 450 ms. Va tarata sul doppio clic di Windows, che nessuno ha provato.
10. **Numeri di riga.** R3 cita il commit 168c5b1 e R4 il 6159b7e, ma il codice è lo stesso. Le righe che differiscono di 1–2 vanno ricontrollate quando si lavora: natpf_kiosk.js:62-67 / 63-68, natpf_pause.js:38 / 40, main.mjs:132-136 / 130-136, index.html:906 / 907.

## 2. Proposta: B39 · Stand con il solo mouse

**Perché serve un blocco nuovo.** B38 copre solo il n. 2. B37 dà solo il canale per aprire il pannello dal programma.

**Dimensione.** Nel complesso è grande: 7 passi, 4 piccoli e 3 medi.

**Ordine.**
- B39.1 e B39.6 toccano soprattutto file o parti che B37 e B38 non toccano [D]: possono partire prima.
- Gli altri passi vanno dopo l'unione di B37 e B38, che toccano gli stessi file: index.html, natpf-ui.css, natpf_kiosk.js, natpf_ui.js, main.mjs, preload.cjs.

**Ogni passo:** test del gioco e del sito, test di natpf-desktop e tools/lan se toccati, build, commit, push, pacchetti con versione nuova, Checkpoint.

**B39.1 · Trappole** (n. 3, 5 e il trascinamento del n. 17; piccolo)
- File:
  - natpf_ui.js;
  - main.mjs (:480-487 e dopo :508);
  - tools/lan/server.mjs e launcher.mjs;
  - natpf-ui.css;
  - natpf_diag.js:53-56 (Maiusc+D/M nei campi), se B38 non l'ha già fatto.
- Prove:
  - test a porta occupata in tools/lan;
  - Electron per Linux in Xvfb: con 8080 o 8443 occupata compare il dialogo italiano; con il tasto indietro il gioco resta.

**B39.2 · Guardia del doppio clic** (n. 10; piccolo-medio)
- File: natpf_ui.js, natpf_lobby.js, natpf_onboarding.js, natpf_training.js, natpf_pause.js, hud_ui.js, natpf_kiosk.js.
- Prove:
  - unità della funzione pura;
  - browser col solo mouse: doppio clic a 110, 250 e 300 ms su tutte le voci del n. 10, e un clic 50 ms dopo il passaggio automatico;
  - misure 1280×720, 1920×1080, 720×720 e area 1080×1080, con schermate.

**B39.3 · Pannello, diagnostica, pausa** (n. 1, 6, 7, 13, 14, 15, le conferme del 16, «Segna» e #staff-note del 21; piccolo)
- File:
  - natpf_kiosk.js;
  - natpf-ui.css (:552, :827, :1044-1046, :1390);
  - index.html (staff-actions, pausa);
  - natpf_diag.js, natpf_pause.js;
  - natpf_ui.js (:216, :646-679).
- Prove nel browser col solo mouse:
  - marchio 3 s in ogni pagina del menu, principale compresa;
  - ❚❚ tenuto 3 s in partita;
  - Pannello → Diagnostica → Prova guidata;
  - tempo di gioco fermo con la diagnostica aperta;
  - classifica a schermo intero → Chiudi;
  - «Torna al menu» con conferma;
  - riquadro del telefono sotto la pausa e QR intero, a 1280×720 e 1920×1080.

**B39.4 · Programma Windows** (n. 4, 8, 9, i download del 16, il 17, il codice del 19; medio)
- File:
  - desktop-core.mjs: lista dei comandi.
  - main.mjs:
    - menu del tasto destro ed Esci;
    - `'unresponsive'`;
    - `setWindowOpenHandler`, `will-navigate`, `will-download`;
    - domanda del firewall con tempo massimo di 60 s;
    - monitor ricordato, avvio con Windows.
  - preload.cjs: canali nuovi, con le stesse regole di main.mjs:441-473:
    - `event.sender === win.webContents` e `isOwnUrl`;
    - azioni da un elenco congelato;
    - cartelle chieste per chiave, mai percorsi dalla pagina.
  - Icona nell'area di notifica, se la risposta alla domanda 1 è sì.
- Prove:
  - node:test: lista dei comandi, isOwnUrl, percorso dei download, tempi;
  - Electron per Linux:
    - ogni voce del menu;
    - Esci che non tocca `fullscreen`;
    - link negato;
    - CSV salvato senza «Salva con nome»;
    - pagina bloccata simulata.

**B39.5 · Puntatore e bersagli** (n. 11, 12 e il chiosco del 21; medio)
- File: natpf_cursor.js nuovo (o dentro natpf_ui.js), styles.css:54, natpf-ui.css, natpf-round.css:612-628, opzione nel pannello, natpf_kiosk.js:56.
- Prove:
  - unità: misura del cursore ricavata dall'area, tempi di scomparsa;
  - browser: cursore nascosto in campo dopo 3 s, anello, freccia sul bordo con `?area=`;
  - schermate prima e dopo a 1024×600, 1280×720, 1920×1080, area 1080×1080 e 3840×1080.

**B39.6 · Calibrazione col mouse** (n. 18; medio)
- File: natpf_calibra.js, natpf_screen.js (funzioni pure), index.html:1011-1067, natpf-ui.css:1429-1490.
- Prove:
  - unità: due angoli → area, trascinamento → bordi, ripetizione con accelerazione;
  - browser: area 1000×1000 in 1920×1080 in pochi clic, con «Salva» sempre visibile.

**B39.7 · Testi e guide** (la guida del n. 19, il n. 20, la modalità prova del 21; piccolo)
- Testi del gioco, del programma, dell'installatore e dei documenti.
- Guida «PC dello stand con il solo mouse».
- Correggere COLLAUDO_WINDOWS.md:196.

**Facoltativo, dopo:** foglio «Programma ›» con `natpfDesktop.app` e «Controllo del PC», monitor per nome, `flashFrame`, guida che non si chiude con un clic appena fuori.

**Prova finale:** lo script del percorso di R4 (giro2/prova.mjs) diventa una prova nel browser nel repository, col solo mouse, e ogni BLOCCATO deve risultare OK. Poi il collaudo dell'utente su Windows e sul ledwall.

**Rischi:**
- Conflitti con i rami di B37 e B38 → passi piccoli, dopo l'unione.
- La guardia può scartare un clic voluto: già oggi qualche primo clic si perde (n. 21) → solo clic veri, solo pulsanti che vanno avanti o fanno girare un valore, al massimo 450 ms, registro degli eventi nelle prove.
- Cursore grande e puntatore nascosto non sono provati su Windows → opzione Normale/Grande; con la modalità prova accesa il puntatore resta visibile.
- Le misure in cqh possono rompere qualche disposizione (pannello a 1024×600, aree piccole) → `clamp` con la misura di oggi come minimo, e schermate.
- La posizione di menu e finestre di Windows su un ledwall che ritaglia non è provata → menu al puntatore; conferme e salvataggi dentro il gioco.
- Comandi nuovi esposti alla pagina → stesse regole dei canali esistenti.
- tools/lan serve anche la modalità LAN → solo il gestore d'errore e il suo test.

**Non toccare:**
- gameplay: regole, fisica, CPU, punteggio;
- telefono: site/tennis/racchetta.html, site/js/tennis/, natpf_gestures.js, natpf_phone_racket.js;
- webcam;
- sfida tra due computer (codice AT-…, «Copia link») e protocollo LAN;
- il mouse come racchetta della modalità prova (motion_controls.js), salvo lo spegnimento;
- audio e voce.
- B37 e B38 si riusano, non si rifanno.

**Non provato da nessuna ricerca:**
- Windows vero:
  - barra delle applicazioni e area di notifica;
  - menu e finestre sopra lo schermo intero, e la loro posizione;
  - dimensione del cursore;
  - tasto indietro nativo;
  - file trascinato;
  - permessi di amministratore;
  - blocco del PC.
- Ledwall e processore LED.
- Mouse fisico e tempi del doppio clic di Windows.
- Telefoni veri: passaggio automatico, QR coperto.
- Telecomando dello staff.
- Schermo intero vero.

## 3. Domande per l'utente

1. **Allo stand lo staff vede anche lo schermo del portatile (desktop esteso) o solo il ledwall?** La risposta decide se servono l'icona nell'area di notifica e la freccia «puntatore fuori dal ledwall», e dice dove compaiono le finestre di Windows. Consigliato, se non lo sai: progettare per il solo ledwall e aggiungere l'icona solo se c'è il portatile.
2. **Tasto destro nel programma: menu di Windows o menu disegnato dal gioco?**
   - Menu di Windows al puntatore (consigliato): meno lavoro; si apre al puntatore anche con un'area calibrata male; usa la stessa lista di comandi di B37. Le scritte sono quelle di sistema, piccole.
   - Menu disegnato dal gioco: grande e nello stile del gioco, ma più lavoro, e va tenuto dentro la parte visibile.
   - Nel browser resta comunque il menu del browser.
3. **Minigiochi: aggiungere «Gioca come Ospite», o basta la tastiera a schermo di B38?** Consigliato aggiungerlo: allo stand il nome lo scrive lo staff col mouse, lettera per lettera. Il punteggio dell'ospite resterebbe fuori classifica.

## Materiale delle ricerche
Tutto nello scratchpad; il repository non è stato toccato.
- R1: /tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse (prova-mouse.mjs, prova-mouse-2.mjs, prova-maiusc-d.mjs, schermate *.png)
- R2:
  - /tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/prova-electron
  - /tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/prove
  - /tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/shots
  - Electron 45.2.2 per Linux: /tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/electron
- R3: /tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/ledwall2
- R4: /tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/giro2