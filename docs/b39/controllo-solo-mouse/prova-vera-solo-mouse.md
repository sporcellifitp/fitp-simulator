PROVA VERA CON IL SOLO MOUSE · NATPF 2026-11-13.8 (codice 6159b7e)

COME. Ho avviato Vite dalla cartella natpf-tennis su 127.0.0.1:3547 e alla fine l'ho chiuso. La configurazione è quella del gioco (vite.config.ts importata), con una sola differenza: la cache sta nello scratchpad. Il repository è stato solo letto: git status pulito, node_modules/.vite non toccata.
- Browser: Chromium headless a 1280×720, alcuni passi anche a 1920×1080.
- Input dello stand: SOLO page.mouse (move, down, up, click, wheel). Mai la tastiera.
- Visitatore: telefono simulato come in tools/e2e (pagina vera della racchetta, PeerJS locale, devicemotion). launch, page e seeAllCards vengono da th.mjs, playTrial da prova.mjs, importati senza modificarli.
- Scorciatoie dello script, segnate [script]: il 3D si disegna solo per le schermate; la fine partita è accelerata con _awardPoint; nei casi del doppio clic, e dopo un BLOCCATO, lo script riporta il gioco a una pagina nota.
- Nessun errore JavaScript in nessuna fase. Dove si sovrappone, il giro precedente interrotto (mouse/prova-vera) dà gli stessi risultati.

File, tutti in /tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/giro2/ :
- prova.mjs: fasi stand, cade, split, amico, minigiochi, menu, doppio.
- split-cade.mjs, doppio-pausa.mjs, pressione.mjs, primo-clic*.mjs, amico-debug.mjs.
- *.log e risultati-*.json.
- shots/: 69 schermate.

1. PERCORSO DELLO STAND (tutto VERIFICATO nel browser)
1. Intro «Premi un tasto per iniziare» → menu: OK con 2 clic (il primo chiude il trailer, il secondo entra). La scritta parla di tasti. [stand-01-intro.png]
2. Menu → Gioca → Contro la CPU → Smartphone → «Collega»: OK, tessere grandi (440×96, 335×266, 509×227). [stand-05, 06, 07]
3. Telefono collegato → tutorial corto in campo: OK. Lo sfoglia il telefono; lo staff può chiuderlo con la X 44×44. [stand-08]
4. Nome del giocatore: nel percorso Gioca → CPU non viene chiesto. Lo chiedono «Nuovo giocatore», i minigiochi, lo stesso schermo e il codice della sfida. Il campo si clicca (502×56) e il cursore entra, ma non si scrive: BLOCCATO (B38). «Salta» funziona (il visitatore resta «Ospite»). [stand-24, stand-25, stand-26]
5. Impostazioni della partita (Chi gioca, Personaggi, Altre impostazioni con livello, durata, chi batte): OK. La pagina scorre da sola; la rotella serve solo per tornare su. [stand-10]
6. «Gioca ›» → scambi di prova (li gioca il telefono) oppure «Salta ›» 77×36 in alto a destra: OK. «Gioca ›» con doppio clic: OK. [stand-11, stand-22, stand-23]
7. Partita, qualche punto giocato: OK. In campo l'unico comando è ❚❚ 52×52 (7% dell'altezza). Sul campo il puntatore è una croce sottile sempre visibile: SCOMODO. [stand-12, stand-13]
8. Pausa e ripresa (❚❚ e «Riprendi ›» 115×46): OK. [stand-14]
9. Pannello dello stand DURANTE la partita: BLOCCATO. La pausa non ha la voce, il marchio in campo non c'è, 3,4 s premuti in alto a sinistra non fanno niente. L'unica strada è «Torna al menu», e la partita si perde. [stand-15]
10. Diagnostica dalla pausa: i comandi funzionano col mouse (Avvia, Segna, ×, REC 92×23, Ferma, Scarica, zip scaricato). Però è SCOMODO: la partita riparte sotto il pannello. [stand-16, 17, 18, 19]
11. Fine partita → «Gioca ancora» / «Nuovo giocatore» / «Menu» (212×46, 434×48, 212×46): OK. [stand-20, stand-21]
12. Pannello dello stand dal menu:
   - dalla PAGINA PRINCIPALE è BLOCCATO: il marchio è nascosto e il titolo grande non risponde [stand-04];
   - da ogni altra pagina è OK tenendo premuto 3 s il marchio 174×34. Durante la pressione non c'è nessun segno, e la pressione si annulla in silenzio se il puntatore esce dal marchio [pressione-marchio-1200ms.png, stand-28];
   - le voci (230×64) e «Chiudi» funzionano, anche con doppio clic.
13. Classifica a schermo intero (dal pannello): non se ne esce, BLOCCATO. L'unica uscita col mouse è «Nuovo giocatore», che azzera il visitatore. [stand-29, stand-30, menu-01]
14. Diagnostica dal menu: BLOCCATO, non c'è nessun comando.
15. Opzioni → «Calibra lo schermo…»: si apre e si annulla. Regolare è SCOMODO (vedi C8). [stand-32, stand-33]
16. «? Come si gioca»: guida aperta e chiusa con × 40×40, OK.
17. Schermo intero: c'è il pulsante 184×46 in alto, in Opzioni e in pausa. Non provato davvero: in queste prove th.mjs finge la richiesta.
18. Telefono chiuso a metà partita: OK col mouse (il gioco si ferma da solo; «Torna al campo» → ❚❚ → «Torna al menu»). Il riquadro però copre il QR (vedi C5). [cade-01, 02, 03]
19. Stesso schermo:
   - due nomi BLOCCATO (B38);
   - mano e fascia OK;
   - due telefoni → tutorial nelle metà → partenza da sola, «Salta ›» e pausa OK;
   - con un telefono scollegato il riquadro con il QR copre la pausa (vedi C5). [split-01…06, split-cade-02-pausa-1280x720.png, split-cade-02-pausa-1920x1080.png]
20. Sfida tra due computer:
   - computer 1 OK (codice AT-xxxx); «Copia link» copia solo negli appunti di questo PC;
   - computer 2 BLOCCATO: il codice va scritto. Campo 76×40; «Entra ›» risponde «Il codice è AT- e quattro lettere o cifre». [amico-01, amico-02]
21. Minigiochi: BLOCCATO. Il nickname è obbligatorio e c'è solo «Indietro». [minigiochi-02, minigiochi-03]
22. Uscire dal gioco o ricaricarlo: BLOCCATO. Nel gioco non c'è «Esci» né «Ricarica».

2. DOPPIO CLIC (VERIFICATO, 110 e 250 ms tra i due clic)
Il secondo clic sceglie qualcosa anche nella pagina successiva:
- menu «Gioca» → si finisce in «Stesso schermo» (Collega con due QR). [doppio-110-menu-Gioca-.png]
- menu «Allenamento» → «Accendi la webcam». La racchetta passa a Webcam e resta salvata; la webcam si accende. [doppio-110-menu-Allenamento-.png]
- menu «Minigiochi» → si apre il nickname del minigioco sotto il puntatore. [doppio-110-menu-Minigiochi-.png]
- «Contro la CPU» a 250 ms → salta la pagina «Racchetta» (a 110 ms no, grazie al ritardo di 160 ms). [doppio-250--Contro-la-CPU-.png]
- «‹ Indietro» salta una pagina: da Racchetta va al menu, da Collega va a «Con chi giochi?». [doppio-110--Indietro-da-*.png]

Senza problemi: Classifica, Opzioni, Stesso schermo, Smartphone, «Avanti ›», «Indietro» da Opzioni, «Gioca ›», Gioca ancora / Nuovo giocatore / Menu, ❚❚ / «Riprendi ›» / «Torna al menu», «Chiudi» e «Nuovo giocatore» del pannello.

3. COSE DA FARE (probabile B39), in ordine di importanza. V = VERIFICATO nel browser, D = DEDOTTO dal codice.

C1. Pannello dello stand senza tastiera, nel menu principale e in partita — BLOCCATO.
- Dove (D):
  - natpf-ui.css:552 (`#title-modal[data-step="menu"] .lobby-brand { visibility: hidden }`);
  - natpf_kiosk.js:63-68: la pressione è solo su .lobby-brand, dura 3 s senza nessun segno, e si annulla con pointerleave;
  - il marchio sta solo nella lobby, che in campo è display:none;
  - la pausa non ha la voce (index.html:907-919).
- Comportamento (V): punti 9 e 12 del percorso.
- Oggi col mouse: solo da una pagina del menu diversa dalla principale. In partita c'è solo il Telecomando dello staff (natpf_remote.js:357), se un telefono dello staff è già abbinato (D, non provato). F9 e la voce di menu del B37 non bastano: a schermo intero non c'è la barra del menu e non c'è la tastiera.
- Proposta:
  - marchio visibile anche nella pagina principale, oppure pressione anche sul titolo grande;
  - anello che si riempie in 3 s e fumetto «Tieni premuto: pannello dello stand»;
  - pressione che non si annulla per piccoli spostamenti;
  - in partita: 3 s premuti su ❚❚ (o sul titolo «Pausa») aprono il pannello.

C2. Classifica a schermo intero senza uscita — BLOCCATO (V).
- Dove (D):
  - natpf_kiosk.js:118 aggiunge la classe ranking-full;
  - natpf-ui.css:1044-1046 e 1390 nascondono «‹ Indietro», «Come si gioca» e «Schermo intero»;
  - la classe si toglie solo cambiando pagina (natpf_lobby.js:496).
- Oggi col mouse: marchio → pannello → «Nuovo giocatore» (azzera il visitatore e chiede il nome), oppure aspettare il chiosco (45 s fermi).
- Proposta: un pulsante discreto «Chiudi la classifica», oppure clic o pressione ovunque per uscire.

C3. Diagnostica dal menu e «Prova guidata» — BLOCCATO.
- Dove (D):
  - natpf_diag.js:54: dal menu si apre solo con Maiusc+D;
  - natpf_diag.js:119: «La prova guidata parte dal menu principale: torna al menu e riapri la diagnostica».
- Oggi col mouse: solo dalla pausa in campo (natpf_pause.js:40), o dal pallino REC mentre si registra (natpf_diag.js:91-92). Quindi la prova guidata col mouse non si raggiunge.
- Proposta: voce «Diagnostica» nel pannello dello stand.

C4. Programma Windows: Esci, Ricarica, Rete — BLOCCATO.
- Nel gioco (V): non c'è nessun comando.
- Nel programma (D, non avviato qui):
  - natpf-desktop/src/main.mjs:130-136: a schermo intero la barra del menu non c'è mai; in finestra si vede solo con Alt (:423);
  - menu :356-381: Esci (Ctrl+Q), Ricarica (Ctrl+R), «Apri la rete ai telefoni», «Indirizzi e certificato»;
  - scorciatoie in desktop-core.mjs:160-171;
  - preload.cjs:38 non espone né quit né reload;
  - l'avviso «Rete non aperta» dice «Riprova dal menu Rete…» (main.mjs:251), che col mouse non si raggiunge.
- Oggi col mouse: «Schermo intero» → finestra → X della finestra. È solo l'uscita.
- Proposta: riga «Programma» nel pannello dello stand (solo nel programma), con Esci, Ricarica il gioco, Apri la rete ai telefoni, Indirizzi e certificato. Servono nuovi canali di natpfDesktop, con le stesse regole degli altri.

C5. Il riquadro «Telefono in pausa» sta sopra la pausa e sopra il QR — BLOCCATO/SCOMODO (V).
- Dove (D): .natpf-phone-hold ha z-index 60 (natpf-ui.css:827), uguale ai fogli (natpf.css:454), ma è aggiunto dopo nel DOM (natpf_ui.js:646-650), quindi sta sopra.
- Stesso schermo: il riquadro con il QR (natpf_ui.js:679) copre tutte le voci della pausa (volumi, Ricalibra, Aiuto, Diagnostica). A 1280×720 copre anche «Torna al menu» e «Riprendi ›» (in una prova il centro era coperto e il clic non è partito). A 1920×1080 copre ancora tutte le voci della pausa; «Torna al menu» e «Riprendi ›» restano cliccabili.
- Gioco singolo: copre l'angolo in alto a destra del QR del pannello del telefono, mirino compreso, quindi il QR probabilmente non si legge; copre anche i volumi della pausa. [cade-01, cade-02]
- Oggi col mouse: «Torna al campo» del pannello, poi ❚❚ e «Torna al menu», ma solo dove il pulsante non è coperto.
- Proposta: con un foglio aperto il riquadro va sotto o in basso, e il QR si mostra dentro la pausa o dentro il pannello.

C6. Diagnostica aperta dalla pausa: la partita riparte — SCOMODO.
- Comportamento (V): +3,9 s di tempo di gioco in 4 s, fase POINT_OVER → SERVE_STANCE.
- Dove (D):
  - natpf_pause.js:40 chiude la pausa prima di aprire la diagnostica;
  - _syncPause (natpf_ui.js:216) non conta il pannello della diagnostica;
  - open e close in natpf_diag.js:69-70 non lo richiamano.
- Conseguenza (D): se batte la CPU, il punto si gioca dietro il pannello.
- Proposta: partita ferma finché la diagnostica è aperta; alla chiusura si torna alla pausa.

C7. Doppio clic che sceglie anche nella pagina dopo — SCOMODO (V, sezione 2).
- Dove (D):
  - natpf_lobby.js:160: la voce del menu cambia pagina subito;
  - :161 e :190: le tessere cambiano pagina dopo 160 ms;
  - :192-193: «Avanti ›» e «‹ Indietro» cambiano pagina subito;
  - la racchetta scelta resta salvata (natpf_ui.js:409).
- Proposta: nella lobby ignorare il clic con detail ≥ 2 e i clic nei ~400 ms dopo un cambio di pagina.

C8. Calibrazione dello schermo col mouse — SCOMODO (V).
- Comportamento: «−» e «+» sono 30×30; 10 clic danno solo 5%, quindi per arrivare al 20% servono 40 clic. Tenere premuto «+» fa un passo solo. I segni dei bordi non si trascinano.
- Dove (D): natpf_calibra.js:18 (passo 0,5%; il passo da 5% solo con Maiusc+frecce, :129); :69 (un clic = un passo).
- Proposta: «−5 %» e «+5 %», ripetizione tenendo premuto, segni trascinabili, pulsanti più grandi.

C9. Scritte che parlano solo di tasti — SCOMODO (V).
- Dove:
  - «Premi un tasto per iniziare» (index.html:191);
  - righe in basso «↑ ↓ ← → scegli · Invio conferma · H… · F…» e «Invio avanti · Esc indietro» (natpf_lobby.js:563, index.html:741);
  - legenda della calibrazione (index.html:1067);
  - diagnostica: «poi Maiusc+D → Ferma» (natpf_diag.js:103), altri Maiusc+D a :61, :65 e :91, «Maiusc+M» a :176, «Ctrl+Maiusc+K…» a :187;
  - fumetti «Pausa (Esc)», «(F)», «(H)» (index.html:900, 320-321).
- Proposta: quando l'ultimo input è il mouse, scritte per il mouse, per esempio «Clicca per iniziare» e «clicca il pallino REC in alto»; la riga dei tasti si nasconde.

C10. Puntatore sul ledwall — SCOMODO.
- Dove: styles.css:54 (`#game-canvas { cursor: crosshair }`), mai nascosto. Lo stile è V; come appare sul ledwall non è provato.
- Proposta: in campo nasconderlo dopo ~3 s fermo; opzione dello stand «Puntatore grande» (cursore CSS da 48-64 px).

C11. «Torna al menu» in pausa senza conferma — SCOMODO (D, con la schermata stand-14).
- Dove: natpf_pause.js:41. Il pulsante è accanto a «Riprendi ›»: un clic sbagliato chiude la partita del visitatore.
- Proposta: un secondo clic di conferma («Sicuro? Clicca ancora»).

C12. Spiegazioni del pannello solo nel fumetto — SCOMODO (V).
- Dove: index.html:238-243 e 251 (title).
- Oggi col mouse: per leggere la spiegazione nell'avviso bisogna cambiare l'opzione e poi rimetterla.
- Proposta: la riga #staff-note (index.html:245) mostra la spiegazione della voce sotto il puntatore, come la descrizione del menu principale.

C13. Minigiochi senza «Salta».
- Dove: natpf_lobby.js:300-321 (_nickSkip solo per «Nuovo giocatore» :309; pulsante «Indietro» :307).
- Con B38 si potrà scrivere il nome, ma serve comunque scrivere ogni volta.
- Proposta: «Gioca come Ospite».

C14. Da tenere d'occhio (V, causa non trovata).
- In 3 aperture su circa 20 il primo clic su «Gioca» dopo il caricamento non ha cambiato pagina: fase «amico» due volte e fase «cade» a 1920×1080.
- In 14 prove mirate, con il registro degli eventi, non è mai successo.
- Probabilmente dipende dalla macchina carica (altri agenti al lavoro). Allo stand basterebbe un secondo clic.

4. GIÀ COPERTO
- B38 risolve tutti i BLOCCATO dei campi di testo: nome, due nomi, codice della sfida, campi della diagnostica.
- B37 punto 4 (F9 e voce di menu nel programma) non basta con il solo mouse: servono anche C1 e C4.
- Col mouse funzionano già: intro, menu, tessere, impostazioni, Collega, «Salta ›», pausa e ripresa, REC / Ferma / Scarica, fine partita, «Salta» del nome, guida, Opzioni, voci del pannello.
- I trascinamenti del mouse sul campo non danno colpi quando si gioca con il telefono (natpf_ui.js:389).

5. NON PROVATO
Programma Windows (Electron), ledwall vero, puntatore vero (le schermate headless non mostrano il cursore), schermo intero vero, telefoni veri, finestre di sistema (confirm() di «Azzera oggi», salvataggi), Telecomando dello staff.