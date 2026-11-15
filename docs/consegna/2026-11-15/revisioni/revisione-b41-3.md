# Revisione indipendente di B41.3

ok: False

## Problemi
- Nessun difetto che blocchi il percorso del visitatore. Restano tre correzioni piccole (punti 1–3) e alcune note (punti 4–8).
- 1. [Basso; difetto 7 non chiuso del tutto] docs/b41/modalita-fiera-2.md:25-26 dice che «Conferma» vale «con il mouse, o con Invio sulla tastiera del PC», e :256 dice «o Invio sul pulsante». Anche i commenti natpf-tennis/src/natpf/natpf_fiera_sheet.js:9 e :110 e natpf_fiera.js:230 dicono «o un tasto». Non è vero, l'ho provato con la sonda rev-b413/probe/p12-invio.mjs: (a) dopo il clic su «Abbina» il fuoco è sul BODY e Invio non fa niente; (b) servono 19 Tab per arrivare a «Conferma», perché il fuoco passa per la pagina della fiera dietro al foglio (niente trappola del fuoco); (c) con il fuoco su «Conferma», Invio viene bloccato con preventDefault da natpf-tennis/src/motion_controls.js:1620-1621 (Space o Invio = colpo da tastiera): niente clic e niente abbinamento. La guida 8.4 (solo mouse) è giusta. Correzione: togliere «o Invio» dai documenti e dai commenti, oppure lasciar passare Invio quando un foglio dello staff è aperto.
- 2. [Medio-basso; prova mancante per il difetto 8 e sonde solo nello scratchpad] Nessuna prova del repository misura il tremolio del pannello con il puntatore sulle voci. natpf-tennis/test/natpf-b41-3-pannello.test.mjs controlla il testo di CSS e JS e _fitNote con un DOM finto. Se si toglie this._fitNote(n) da natpf-tennis/src/natpf/natpf_kiosk.js:396 (mutazione m8b) tutti i test restano verdi. Senza tutta la correzione (copia rev-b413/mut8) natpf-pannello-cadute fallisce solo a 720×720 (27/33, il foglio scorre). Il tremolio di 22-23 px a 1366×657 e di 13-23 px a 1280×720 (misurato dalla mia sonda p11 su mut8: 0/12) non lo vede nessuna prova del repository. Allo stesso modo il difetto 4 a 1920×540 è misurato solo dalla sonda nello scratchpad: natpf-tennis/test/natpf-b41-3-pagina.test.mjs controlla la struttura, e tools/e2e/natpf-fiera-telefoni.mjs:368-371 guarda la pagina in due solo a 1920×1080. In più docs/PROJECT_MEMORY.md:1319 e :1326, natpf-tennis/natpf-ui.css:2313 e :2346, natpf-b41-3-pagina.test.mjs:5 e natpf-fiera-telefoni.mjs:369 indicano come procedura le sonde b413/probe/panel.mjs e fierapage.mjs, che sono nello scratchpad e non nel repository. Proposta: portarle (anche ridotte) in tools/e2e.
- 3. [Basso; difetto 6 nel percorso con l'indirizzo] Con ?stand=fiera nell'indirizzo (modalità forzata) e la calibrazione salvata «Con i gesti», il pannello scrive «Giocando (fiera)» ma vale ancora «Con i gesti», e gli scambi di prova non partono. Cause: natpf-tennis/src/natpf/natpf_kiosk.js:380 (calFair = fon && !calModeFromUrl() non guarda F.forced), natpf_fiera.js:135 (ensurePlay solo se non forzata), natpf_kiosk.js:329 (il clic dice che resta «Giocando» e non la cambia). Verificato con un test usa e getta nella copia mut: voce «Giocando (fiera)», calibrazione salvata e in uso «gesti», trial.due() falso. Riguarda solo l'indirizzo delle prove, ma è la stessa falsità del difetto 6.
- 4. [Nota, non è un difetto del prodotto] La sonda p2 di prima, senza modifiche, fa ancora 16/17: al caso D g.click('#btn-start-match') va in timeout perché il tocco a 60 ms è un «Sono pronto» valido e READY_GO.ms = 0 fa partire subito gli scambi di prova. L'ho confermato con il mio caso R3b sulla pagina vecchia: il clic va in timeout e gli scambi di prova restano accesi. Anche p3 a 11/12 dipende dalla sonda: la nota letta prima era la spiegazione di «Scarica CSV», con il puntatore sopra la voce.
- 5. [Nota di progetto] La regola del secondo vale anche fuori dalla fiera: «Salta ›» del telefono non vale nel primo secondo degli scambi di prova (natpf_trial.js:124) e il pulsante si spegne dopo ogni tocco (site/js/tennis/racchetta.js:749-756). Il risultato dello sviluppatore lo presenta come una cosa della fiera, e la guida lo scrive solo in 8.4. Con tocchi ogni 500 ms (prova N6) quello a 1,5 s salta gli scambi di prova: è il limite voluto.
- 6. [Guida 8.4] I passi sono esatti e sul PC si fanno solo con il mouse: ho controllato nel codice ogni scritta e voce di menu. Due imprecisioni piccole. (a) «Telefono rotto o perso» rimanda al tasto destro → «Rete per i telefoni» → «Indirizzi e certificato per i telefoni…», ma quella finestra (natpf-desktop/src/main.mjs:379-383) mostra solo l'indirizzo da scrivere nel browser del telefono, non un QR: va detto. (b) La strada alternativa (spegni e riaccendi la modalità fiera e passa da «Smartphone») sovrascrive le scelte ricordate con la B41.3 (natpf_kiosk.js:280): dopo la fiera «Con cosa giochi» resta «Smartphone». In più, la riga «Classifica · A schermo intero» della guida non dice che in fiera, a partita in corso, azzera anche il visitatore.
- 7. [Estetica, già segnalata dallo sviluppatore] Con la riga sotto le voci ad altezza fissa resta uno spazio vuoto di circa 45-50 px sotto la nota del chiosco: altezza fissa 70 px a 1280×720, 1366×768, 1920×1080 e 1024×1024. Si vede nelle schermate di rev-b413/out/p11.
- 8. [Storia] Il ramo contiene il commit 80239be «IN CORSO … NON verificato» (salvataggio del coordinatore): con l'unione entra nella storia di natpf-simulator.

## Controlli fatti
- Copie mie: rev-b413/src = git archive di 1ec3517 (node_modules collegati), rev-b413/mut con git locale per le mutazioni, rev-b413/oldphone con site/js/tennis/racchetta.js e phone-screen.js presi da 077cadc^ (pagina del telefono senza identificativo dell'offerta), rev-b413/mut8 senza la correzione del difetto 8. La worktree b412/wt (1ec3517, git status vuoto) e il repository (52fb692) non sono stati toccati.
- Suite sulla mia copia (1ec3517): gioco 1660/1660 e sito 272/272 (carico 6-12), build ok. natpf-desktop e tools/lan sono invariati rispetto a natpf-simulator (cambia solo natpf-desktop/novita.txt): non li ho rifatti.
- (1) Mutazioni nella copia mut, test del repository rifatti dopo ognuna. Difetto 1: tutte le modifiche di 077cadc tolte → natpf-b41-3-tocchi e tools/test/b41-3-tocchi falliscono (import mancante); graceMs tolto → 5 KO; controllo dell'id tolto → 3 KO; offerta non tolta all'uscita → 1 KO; rinnovo dopo il tocco tolto → 2 KO; telefono che non segna 'sent' → sito 1 KO. Difetto 2: torna e?.isTrusted → 1 KO. Difetto 3: riga di backToMenu tolta → 2 KO; !fair tolto dal telecomando → 1 KO. Difetto 4: pagina di prima → il file non si carica; mutazioni più fini (riga sotto le schede o stato della scheda) → 1 KO ciascuna. Difetto 5: niente ripristino → 2 KO; niente salvataggio → 2 KO. Difetto 6: clic che cambia la calibrazione → 1 KO; niente ensurePlay all'avvio → 1 KO; scritta della voce → 1 KO. Difetto 8: senza _fitNote al passaggio del puntatore → 1 KO; senza flex: none → 1 KO; senza _fitNote in paint → 0 KO (non coperto); tutta la correzione tolta (mut8) → natpf-pannello-cadute 27/33. Difetto 7 solo testi.
- (2) Sonde della revisione di prima, senza modifiche (rev-b413/probe-old, sul codice nuovo): p8 6/6, p9 6/6, p5 9/9, p6 5/5, p3 11/12 (nota letta con il puntatore su una voce: dipende dalla sonda), p2 16/17 (C 150 ms e C2 400 ms OK; il caso D va in eccezione per i tempi di g.click, spiegato e riprodotto).
- (2) Mia sonda rev-b413/probe/p10-tocchi.mjs, 13/13 con la pagina nuova e 13/13 con la pagina vecchia senza identificativo. Casi: R1 doppio tocco a 150 ms; R2 400 ms; R3 «Gioca ›» con clic vero e tocco a 60 ms; R3b con g.click; N1 tre tocchi 0/150/300; N2 tre tocchi 0/400/800; N3 cinque tocchi ogni 50 ms; N4 «Salta ›» voluto dopo 1,3 s (vale) e tocchi durante l'uscita degli scambi di prova e il conto alla rovescia grande (una partita sola, nessuna pausa rimasta). Tocchi scartati nel registro: 14 nuova (13 troppo presto, 1 offerta vecchia), 12 vecchia. Nessun errore nelle pagine.
- (3) Unione con la B45.2: dal confronto con 52fb692 non manca niente di natpf-simulator (le righe tolte sono sostituite da versioni che conoscono la fiera; ho controllato kiosk, intestazione della pagina, cadute, spiegazioni). Pannello con «Modalità fiera» in testa e righe delle cadute (schermate di p11). Prove: natpf-pannello-cadute 33/33, natpf-stesso-schermo-b25 55/55, natpf-stesso-schermo-b20 51/52 a carico 12 (richiamo per nome a 1280×720: called falso in tre giri, la stessa instabilità già vista) e poi 52/52 da sola.
- (4) Modalità spenta: p3 conferma «Con cosa giochi» (webcam) e «Calibrazione» («Con i gesti») rimesse come prima, menu, «Telefono», «Nuovo giocatore» e QR normale. natpf-menu 45/45. Nel codice i rami senza fiera di backToMenu, del telecomando, del chiosco e di «Calibrazione» sono identici a prima. Cambiano per tutti solo il pannello (riga ad altezza fissa e misure compatte) e il pulsante del telefono (identificativo, pulsante spento dopo il tocco, 1 s su «Salta ›»).
- (4) natpf-fiera-telefoni 54/54 sulla mia copia.
- (5) Pagina della fiera: la sonda dello sviluppatore, rifatta sulla mia copia (rev-b413/out/fp), dà 63/63 alle sette misure. Pannello: la mia sonda indipendente rev-b413/probe/p11-pannello.mjs (8 misure × 4 varianti: fiera sì/no, cadute 2, opzioni, programma) dà 32/32, con spostamento del foglio 0 px, scorrimento 0 e «Chiudi» sempre in vista. Sulla copia senza correzione (mut8) dà 0/12: spostamento fino a 46 px e scorrimento fino a 178 px, quindi la sonda distingue. Schermate guardate: fp-1 (1920×540, 720×720, 1366×768, 1024×600 in due), panel-7, -8, -9, e2e-5 solo-mouse, fiera-21 720×720, e le mie p11 (1280×720, 720×720, 1920×540): niente tagliato o fuori dallo schermo.
- (6) Guida 8.4 confrontata con il codice: prima voce «Modalità fiera»; «Abbina», «Abbina un altro telefono», «‹ Pannello»; «Sicuro? Clicca ancora»; l'avviso «Telefono 1 abbinato: ora sul telefono «Attiva i sensori»»; testi delle schede; «Giocando (fiera)»; «Torna al menu» del telecomando (site/tennis/telecomando.html:119); voci del tasto destro del programma (desktop-core.mjs:277, 288, 323). I passi sul PC si fanno solo con il mouse. Le piccole imprecisioni sono in issues al punto 6.

## Risultato dello sviluppatore

{
 "head": "1ec3517",
 "commits": [
  "077cadc B41.3 difetto 1: un doppio tocco o «Gioca ›» con il tocco del visitatore non saltano più gli scambi di prova (agente di prima)",
  "ee2994c B41.3 difetti 2, 3, 5, 6: «Scollega» in due passi dal telecomando, «Torna al menu» in fiera azzera il visitatore, scelte di prima rimesse, calibrazione ferma su «Giocando» (agente di prima)",
  "072a474 B41.3 difetto 8: il pannello dello stand non trema e non scorre più con il puntatore sulle voci (agente di prima)",
  "80239be IN CORSO B41.3 (salvataggio del coordinatore: difetto 4 a metà, verificato e chiuso qui)",
  "c53d178 B41.3 difetto 4: pagina della fiera in due con un telefono non pronto senza riga in più (test)",
  "d7edc9d B41.3 difetti 1 e 4 nel browser: natpf-fiera-telefoni con i tre casi del revisore e la pagina in due",
  "3126c8f B41.3 difetto 8, continua: pannello dello stand a 1280×720 con le righe delle cadute senza scorrere",
  "aaafc8a B41.3 documenti: guida dello stand 8.4, documento della B41 seconda parte §8, memoria del progetto, registro dei passi",
  "3403546 Unione di natpf-simulator (656f3dc: versione 2026-11-14.4, traccia, piani di B40 e B49)",
  "5880ca0 B41.3 difetto 8: pannello compatto anche a 1280×720 in modalità fiera e a 1366×768",
  "558b106 Unione di natpf-simulator (52fb692: piano di analisi del B50, traccia)",
  "1ec3517 B41.3 documenti: verifiche e misure (§8.2–§8.5, registro dei passi, memoria)"
 ],
 "fixed": [
  "Passo 0 (fatto dall'agente di prima, 5d657fd): unione di natpf-simulator 3d92ce1 (B45.1 fase B + B45.2), tenute le due parti; poi qui unito anche 656f3dc (3403546, conflitto solo nella prima riga di docs/GUIDA_STAND.md) e 52fb692 (558b106, nessun conflitto). natpf-simulator locale (52fb692) è dentro il ramo.",
  "Difetto 1 (077cadc + d7edc9d): offerte del pulsante del telefono numerate. natpf-tennis/src/natpf/natpf_phone_racket.js:55 nextTapVerdict, :779 offerNext(label, extra, { graceMs }), :800 _onNext; site/js/tennis/phone-screen.js:150 nextTap, :156 NEXT_REARM_MS; site/js/tennis/racchetta.js:752 (il telefono rimanda l'id e spegne il pulsante); natpf-tennis/src/natpf/natpf_trial.js:124 («Salta ›» con graceMs 1000) e :245/:254 (offerta tolta alla fine). Prove: natpf-tennis/test/natpf-b41-3-tocchi.test.mjs 12/12, tools/test/b41-3-tocchi.test.mjs 3/3, tools/e2e/natpf-fiera-telefoni.mjs §5b (doppio tocco 150 ms, 400 ms, «Gioca ›» + tocco a 60 ms: scambi di prova restano 3 s) 54/54, sonda del revisore p2 22/22.",
  "Difetto 2 (ee2994c): natpf-tennis/src/natpf/natpf_fiera_sheet.js:122 ogni clic (anche l'OK non vero del telecomando) vuole il secondo passo. Prove: natpf-b41-3-fiera.test.mjs, sonda p8 6/6.",
  "Difetto 3 (ee2994c): natpf-tennis/src/natpf/natpf_ui.js:351 backToMenu in fiera = chiude tutto + «Prossimo giocatore» (resetFairVisitor, causa menu); natpf_remote.js:341 «Torna al menu» del telecomando; natpf_new_player.js resetFairVisitor con { fair: false }; riga nella guida 8.4. Prove: natpf-b41-3-fiera.test.mjs (3 test), sonda p9 6/6.",
  "Difetto 4 (80239be + c53d178): natpf-tennis/src/natpf/natpf_fiera_page.js:46 splitCardState (perché vero nella scheda, anche schermo spento) e :118 niente riga sotto le schede; natpf-tennis/index.html:730 «Telefoni dello stand ›» nella riga di «2 giocatori»; natpf-ui.css:2348. Prove: natpf-tennis/test/natpf-b41-3-pagina.test.mjs 2/2, sonda pagina della fiera 63/63 a sette misure e nove stati (prima 58/63), controllo in natpf-fiera-telefoni §6, sonda p5 9/9.",
  "Difetto 5 (ee2994c): natpf-tennis/src/natpf/natpf_fiera.js:43 FAIR_BEFORE_KEY; natpf_kiosk.js:280 ricorda «Con cosa giochi» e «Calibrazione» all'accensione, :143 _fairRestore allo spegnimento (avviso lo dice). Prove: natpf-b41-3-fiera.test.mjs, sonda p3 11/12 (il punto che resta è la riga sotto le voci letta con il puntatore sopra una voce, non una scelta rimasta).",
  "Difetto 6 (ee2994c): natpf_kiosk.js:329 in fiera la voce dice «Giocando (fiera)» e un clic lo spiega senza cambiarla; natpf_fiera.js:140 ensurePlay se la modalità è già accesa all'avvio. Prove: natpf-b41-3-fiera.test.mjs, sonda p6 5/5.",
  "Difetto 7 (aaafc8a): docs/b41/modalita-fiera-2.md §1 passo 4 («Conferma» con un clic vero del mouse o Invio; il telecomando no; dalla console sì, confirm guarda solo isTrusted, scritto in §8.1); docs/GUIDA_STAND.md 8.4 «Telefono rotto o perso» con il certificato (cap. 6.1, tasto destro → Rete per i telefoni, o via menu a modalità spenta), più «Gioca ›» grigio in due, «Torna al menu» in fiera, «Salta ›» dopo 1 s, «Scollega» con due OK, spegnere rimette le scelte, tabella del pannello. Spiegazione di «Modalità chiosco» controllata: non dice più «scollega il telefono» (natpf_stand_mouse.js:27).",
  "Difetto 8 (072a474 + 3126c8f + 5880ca0): natpf_kiosk.js:410 _fitNote (riga sotto le voci ad altezza fissa), natpf_stand_mouse.js:119, natpf-ui.css:2316 flex none, :2318 720×720 su quattro colonne, :2355 regola nuova per 1280×720 e 1366×768 (scorreva di 5/21 px con le cadute e di 18 px in modalità fiera con i telefoni da abbinare). Prove: natpf-b41-3-pannello.test.mjs 3/3, sonda del pannello 192/192 varianti (720×720, 1024×600, 1366×657, 1920×540, 1280×720, 1366×768 24/24; 1920×1080 e 1024×1024 in fiera 12/12), natpf-pannello-cadute 33/33 con 16 voci (dopo l'unione era 27/33)."
 ],
 "whatChanged": [
  "Un visitatore che tocca due volte «Sono pronto», o lo tocca mentre lo staff clicca «Gioca ›», non salta più i suoi scambi di prova: il telefono spegne il pulsante dopo il tocco e «Salta ›» vale solo dopo il primo secondo.",
  "«Scollega» nel foglio «Telefoni dello stand» vuole due conferme anche dal telecomando dello staff.",
  "In modalità fiera, pausa → «Torna al menu» (anche dal telecomando) fa «Prossimo giocatore»: chi arriva dopo non eredita nome, mano e livello di chi c'era.",
  "Nella pagina della fiera in due, se un telefono non è pronto il motivo è scritto nella scheda di quel giocatore e «Telefoni dello stand ›» sta in alto a destra: la pagina non scorre più a nessuna misura.",
  "Spegnendo la modalità fiera «Con cosa giochi» e «Calibrazione» tornano come erano prima.",
  "Con la modalità fiera accesa la «Calibrazione» resta «Giocando (fiera)»: un clic spiega perché, non la cambia.",
  "Il pannello dello stand non trema e non scorre più quando il puntatore passa sulle voci (anche a 720×720, 1280×720 e 1366×768, con le righe delle cadute e in modalità fiera).",
  "La guida dello stand (capitolo 8.4) dice i passi giusti, compreso il certificato per un telefono nuovo."
 ],
 "tests": {
  "game": "npm test in natpf-tennis: 1658/1658 su 80239be; 1660/1660 sul ramo unito 3403546; sulla fotografia finale 558b106 1660/1660 (primo giro sotto carico 12–16: 1659/1660, natpf-registro «testo di 1 MB in pochi ms» a 81,8 ms; il file da solo 27/27 due volte, poi suite intera 1660/1660). Test che leggono natpf-ui.css 122/122 dopo l'ultima regola.",
  "site": "node --test tools/test/*.test.mjs: 272/272 su 80239be, sul ramo unito 3403546 e sulla fotografia finale 558b106.",
  "desktop": "natpf-desktop npm test 51/51 (su 3126c8f).",
  "lan": "tools/lan node --test 13/13 (su 3126c8f).",
  "build": "npm run build ok sul ramo unito 3403546 e su 558b106.",
  "auditLegend": "npm run audit:legend 69 OK, 0 KO su 3126c8f: identico a scratchpad/b412/legend-b412.txt (B41 seconda parte, base B47) tolte le righe dei tempi.",
  "electron": "prova-linux.mjs su 3403546 (build + prepara, app/registro.json svuotato con { \"url\": \"\" }, flock lan.lock): 101/101, 8 scenari (predefinito, ledwall-spento, finestra, gioco, domanda-monitor, aggiornamenti, solo-mouse, porta-occupata), controlli riprovati 0."
 },
 "browser": [
  "natpf-fiera-telefoni 54/54 (due volte; l'ultima su 558b106), con §5b nuovo (tre casi del difetto 1) e controllo della pagina in due (difetto 4)",
  "natpf-flusso-tocchi FLOW=fiera VISITORS=10 46/46 (1–2 clic, 0–1 tocco a visitatore, scambi di prova 15,8–16,8 s, doppi clic 110/250/300 ms innocui)",
  "natpf-flusso-tocchi FLOW=fiera-due 13/13",
  "natpf-fine-partita 47/47",
  "natpf-b47-fiera 20/20",
  "natpf-menu 45/45 (due volte, l'ultima su 558b106)",
  "natpf-telecomando 91/91 (flock telecomando.lock, su 3403546 con la build; il primo giro sulla fotografia senza dist non poteva caricare il gioco)",
  "natpf-nuovo-giocatore 28/28",
  "natpf-mano-sicura 17/17 e AREA=720 17/17",
  "natpf-solo-mouse 42/42 (due volte, l'ultima su 558b106)",
  "natpf-stesso-schermo-b25 55/55 (due volte, l'ultima su 558b106)",
  "natpf-stesso-schermo-b20 52/52 da sola (su 3403546 e su 558b106); 50/52 nel primo giro con carico 18 (richiamo per nome non arrivato in tempo)",
  "natpf-pannello-cadute 33/33 con 16 voci (due volte, l'ultima su 558b106)",
  "natpf-phone-blackout 11/11",
  "sonde del revisore (copie in scratchpad/b413/rev-probe, porte 4276/4277): p2 22/22 (la copia clicca «Gioca ›» con un clic vero immediato: g.click perdeva la gara col tocco a 60 ms sotto carico), p3 11/12, p5 9/9, p6 5/5, p8 6/6, p9 6/6",
  "sonda pagina della fiera (scratchpad/b413/probe/fierapage.mjs) 63/63 a sette misure",
  "sonda pannello (scratchpad/b413/probe/panel.mjs, corretta per aspettare l'animazione d'apertura) 192/192 varianti a otto misure",
  "Carico della macchina durante le prove: da 6 a 21 (4 processori, altri agenti in parallelo)"
 ],
 "screenshots": [
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/fp-1/1920x540-due-t2-schermo-spento.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/fp-1/720x720-due-t1-scollegato.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/fp-1/1366x768-due-t1-scollegato.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/fp-1/1024x600-due-tutti-e-due-spenti.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/rev-2/p5/split-t2-spento-1920x540.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/rev-2/p6/gesti-pagina.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/e2e-4/fiera-telefoni/fiera-01-pannello-modalita-fiera-1920.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/e2e-4/fiera-telefoni/fiera-21-avviso-batteria-720x720.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/e2e-5/pannello-cadute/pannello-cadute/programma-2tel-opzioni-accese-720x720.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/e2e-8/pannello-cadute/pannello-cadute/programma-2tel-opzioni-accese-1280x720.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/panel-7/1280x720-f1-c0-o1-d1.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/panel-8/1280x720-f0-c2-o0-d0.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/panel-9/1920x1080-f1-c1-o1-d0.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/e2e-5/menu/stand-1024x600.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/e2e-5/solo-mouse/b39-pannello-in-partita-1280x720.png",
  "/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b413/desktop-6/b39-menu-tasto-destro.png"
 ],
 "howToActivate": "Niente da attivare: tutto è sul ramo b41-fiera-2 (worktree /tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b412/wt, HEAD 1ec3517, natpf-simulator 52fb692 già unito, niente push, niente file di versione). Il coordinatore lo unisce in natpf-simulator con la versione nuova (14.5). Nel gioco: pannello dello stand → «Modalità fiera: Sì»; i passi con il solo mouse sono in docs/GUIDA_STAND.md capitolo 8.4, il dettaglio in docs/b41/modalita-fiera-2.md §8.",
 "notVerified": [
  "Telefoni veri (Android e iPhone): i doppi tocchi del difetto 1 sono clic sintetici sulla pagina vera del telefono in Chromium; il pulsante spento dopo il tocco non è stato visto su un telefono vero.",
  "Pagine del telefono «di prima» (senza il numero dell'offerta): provate solo nei test di unità, non nel browser.",
  "Programma Windows vero (tasto destro, F9), ledwall vero, rete vera della fiera.",
  "LAN (?lan=1) con i telefoni dello stand.",
  "Telecomando dello staff su un telefono vero (i due OK di «Scollega» sono provati con la sonda p8 e i test)."
 ],
 "unsure": [
  "Con la riga sotto le voci ad altezza fissa il pannello ha uno spazio vuoto sotto la nota del chiosco (alto quanto la spiegazione più lunga, tre righe): è il prezzo del niente tremolio; se all'utente non piace si può accorciare la spiegazione più lunga.",
  "Per far stare il pannello a 1280×720 e 1366×768 titolo e pulsanti sono un poco più bassi (bersagli di 50 px, prima circa 62): da guardare sul ledwall vero.",
  "In fiera anche «Classifica · A schermo intero» dal pannello durante una partita passa da backToMenu e quindi azzera il visitatore (conseguenza voluta del difetto 3: chi arriva dopo non eredita niente).",
  "Sonda p3 del revisore 11/12: il punto che resta confronta la riga sotto le voci letta con il puntatore sopra «Scarica CSV» (spiegazione B39.3) e poi senza; non è una scelta rimasta cambiata, ma la sonda così com'è resterà rossa.",
  "Prove a tempo sotto carico alto: natpf-stesso-schermo-b20 (richiamo per nome) 50/52 a carico 18 e natpf-registro (1 MB in pochi ms) una volta rosso nella suite intera; da sole verdi."
 ]
}
