STAND CON IL SOLO MOUSE · TASTI DEL GIOCO (natpf-tennis, versione 2026-11-13.8, branch natpf-simulator, repository non toccato: `git status` pulito)

Come ho controllato: ho letto tutti i gestori keydown e keyup (`natpf_lobby`, `natpf_kiosk`, `natpf_diag`, `natpf_calibra`, `natpf_training`, `natpf_tutorial`, `natpf_split_ui`, `natpf_onboarding`, `natpf_remote`, `natpf_intro`, `natpf_screen`, `game_engine`, `motion_controls`, `webcam_body_follow`, `audio_engine`) e tutti i testi con «premi», tasto, Esc, Invio, Maiusc, Ctrl, F11, (F) e (H). Poi ho fatto una prova nel browser con il SOLO mouse: Chromium headless, `natpf-tennis/dist` 2026-11-13.8 servito in sola lettura, a 1280×720, 1920×1080 e 720×720.

Segni usati:
- **[browser]** = verificato con la prova nel browser.
- **[codice]** = verificato leggendo il codice.
- **[dedotto]** = ragionato, non provato.

Non provato: programma Windows (Electron) vero, Windows vero, ledwall, mouse fisico con i tempi del doppio clic di Windows.

## Risposta diretta: pannello dello stand e diagnostica con il mouse

Oggi il marchio tenuto premuto 3 s **non funziona nella pagina principale del menu**. Funziona solo nelle altre pagine del menu. In campo, in pausa, a fine partita e nell'intro, con il mouse non c'è nessuna via.

La diagnostica, con il mouse, si apre solo in campo (Pausa → Diagnostica) o con il pulsante ● REC durante una registrazione. Mai dal menu né dal pannello dello stand.

F9 (B37) non aiuta chi ha solo il mouse.

## A. Problemi veri

**A1. Marchio nel menu principale: non risponde. [browser]**
- Il codice ascolta solo `.lobby-brand` (`natpf_kiosk.js:62-67`, `index.html:314`).
- `natpf-ui.css:552` ha `#title-modal[data-step="menu"] .lobby-brand { visibility: hidden; }`. Un elemento nascosto così non riceve clic: sotto il puntatore c'è `header.lobby-top`.
- Il titolo grande «NATPF Simulator» (`.menu-brand`, `index.html:336`) non ha nessun ascolto.
- Prova: 3,3 s premuti sul punto del marchio → niente; 3,3 s sul titolo grande → niente. In «Opzioni» → il pannello si apre.
- Con 1,5 s non succede niente e non c'è nessun segno di avanzamento.
- Quanto detto all'utente («3 s sul marchio NATPF nel menu») e la nota della diagnostica (`natpf_diag.js:187`) non valgono per la pagina principale.
- Proposta:
  - ascoltare anche `.menu-brand`, oppure usare `opacity:0` al posto di `visibility:hidden`;
  - un anello che si riempie nei 3 s mentre si tiene premuto;
  - una prova nel browser del marchio in tutte le pagine del menu.

**A2. Pannello dello stand fuori dal menu: con il mouse non c'è.**
- **[browser]** In campo il marchio non si vede (rettangolo 0×0).
- **[browser]** La pausa (`index.html:906-919`) non ha la voce. Voci visibili: music, voice, view, fullscreen, help, diag, menu, resume.
- **[browser]** 3,3 s premuti sul ⏸ aprono solo la pausa.
- **[dedotto]** Lo stesso vale per fine partita, intro e tutorial in campo.
- Oggi con il mouse: ⏸ → «Torna al menu» (chiude la partita) → una pagina del menu che non sia quella principale → marchio 3 s.
- Unica alternativa senza tastiera: il telecomando dello staff, che ha «Pannello dell'addetto» in ogni schermata tranne l'intro (`natpf_remote_map.js:169-170`). Va abbinato una volta dal pannello.
- Proposta:
  - **clic destro in qualunque schermata → «menu dello staff»** con: Pannello dello stand · Diagnostica · Pausa/Riprendi · Torna al menu · Schermo intero · Calibra lo schermo · Nuovo giocatore. I visitatori non usano il mouse e oggi il gioco non usa il clic destro (nessun `contextmenu` in src). Nel programma Windows; nel browser si può lasciare il menu del browser;
  - inoltre ⏸ tenuto premuto 3 s apre il pannello (il clic breve resta la pausa).

**A3. Diagnostica dal menu: impossibile con il mouse.**
- **[browser]** Nel menu non c'è un pulsante «Diagnostica», e nemmeno nel pannello dello stand.
- **[codice]** C'è solo Maiusc+D (`natpf_diag.js:53-56`), Pausa → Diagnostica in campo (`natpf_pause.js:38`) e ● REC (`natpf_diag.js:90-92`).
- Conseguenze **[codice]**:
  - «▶ Prova guidata dei colpi» parte solo dal menu (`natpf_diag.js:119`: «torna al menu e riapri la diagnostica»). **[dedotto]** Con il mouse si può solo con un giro: Pausa → Diagnostica → Avvia registrazione → Torna al menu → ● REC → Ferma → Prova guidata.
  - Gli avvisi «Sessione diagnostica interrotta da recuperare: Maiusc+D» (`:65`) e «spazio su disco finito. Maiusc+D per scaricare la sessione» (`:61`) danno un tasto che non c'è.
  - Il ritardo dello schermo (`:190`) si raggiunge solo dal campo.
- Proposta: «Diagnostica» nella riga in basso del pannello dello stand (`staff-actions`: c'è posto, la griglia no) e nel menu del clic destro; i testi con la strada del mouse.

**A4. Classifica a schermo intero (dal pannello): non si esce con il mouse. [browser]**
- `natpf_kiosk.js:118` accende `ranking-full`. `natpf-ui.css:1044-1046` nasconde `.lobby-bottom` (con «‹ Indietro») e `:1390` il pulsante «Schermo intero».
- Con la tastiera si esce con Esc o Backspace (`natpf_lobby.js:732`).
- Restano visibili solo le 4 schede della classifica. Uscita con il mouse: marchio 3 s → «Nuovo giocatore», che azzera il visitatore e apre il foglio del nome nella pagina «Partita».
- A margine **[browser]**: nella classifica a schermo intero vuota la riga «Ancora nessuna partita oggi» va a capo parola per parola (`classifica-intera-1280x720.png`).
- Proposta: quando è acceso, il pulsante del pannello diventa «Chiudi lo schermo intero»; in più un «× Chiudi» discreto che compare solo quando si muove il mouse.

**A5. Doppio clic nel menu: salta pagine e cambia le scelte. [browser]**
- Le voci del menu cambiano pagina subito (`natpf_lobby.js:160`, `:248`); modalità e racchetta dopo 160 ms (`:161`, `:190`). In src non c'è nessuna protezione dal doppio clic.
- Risultati, con il secondo clic dopo 120 o 250 ms:

| doppio clic su | 1280×720 e 1920×1080 | 720×720 |
|---|---|---|
| «Gioca» | il secondo clic cade su «Stesso schermo» → «Collega i due telefoni» (`dopo-doppio-clic-gioca-1280x720.png`) | nessun salto |
| «Allenamento» | il secondo clic cade su «Webcam» → racchetta cambiata e salvata (`natpf_ui.js:409`), webcam accesa | non salta |
| «Contro la CPU» (250 ms) | salta «Con cosa giochi?» | salta «Con cosa giochi?» |

- Proposta: nella lobby ignorare il secondo clic (`event.detail > 1`) sulle voci che cambiano pagina, e ogni clic per circa 400 ms dopo un cambio di pagina; prova nel browser alle tre misure.

**A6. Calibrazione dello schermo: si fa, ma lenta.**
- **[codice]** Codice: `natpf_calibra.js:73-75` (clic) e `:121-133` (tasti); pulsanti − e + in `index.html:1051-1055`.
- **[codice]** Con il mouse ci sono formato, bordo, −/+, Azzera, Annulla e Salva. Mancano:
  - il passo da 5 % (Maiusc+frecce);
  - lo schermo intero (F) dentro la calibrazione.
- **[browser]** Un clic = 0,5 %. Tenere premuto «+» per 2 s = un solo passo, nessuna ripetizione. I segni sui bordi si cliccano, non si trascinano.
- **[codice]** Esempio del codice (`natpf_screen.js:33-34`): area 1000×1000 in alto a sinistra di 1920×1080 = bordo destro 48 % = 96 clic. Con la tastiera bastano 9 Maiusc+→ e 6 →.
- La riga in fondo (`index.html:1067`) elenca solo tasti.
- Proposta:
  - ripetizione tenendo premuto, che accelera;
  - pulsanti «−5 %» e «+5 %»;
  - trascinare i segni dei bordi;
  - istruzioni per il mouse;
  - pulsante «Schermo intero» nel pannello della calibrazione;
  - «Calibra» e «Azzera la calibrazione» nel menu del clic destro. **[dedotto]** Con un'area sbagliata la tastiera recupera alla cieca (R + Invio), il mouse no.

**A7. Campi di testo (coperti da B38, solo elenco).**
- Campi: `#nick-input` (`index.html:202`), `.split-name-input` ×2 (`:568`), `#join-code` (`:377`), nota della diagnostica (`natpf_diag.js:185`), ritardo dello schermo (`:190`, `type=number` con step 5).
- **[browser]** Senza tastiera i minigiochi non partono: il nickname serve, almeno 2 caratteri (`natpf_events.js:44`). «Indietro» non va avanti (`natpf_lobby.js:314`). Con «Nuovo giocatore» invece c'è «Salta».
- Incastri da passare a B38:
  1. **[browser, tastiera vera]** Una «D» maiuscola scritta nel nickname o nei nomi dello stesso schermo apre la diagnostica e la lettera si perde: «Dario» diventa «ario». `natpf_diag.js:53-56` ascolta Maiusc+D (e Maiusc+M durante una registrazione) senza guardare se il fuoco è in un campo. Tutti gli altri gestori lo guardano.
     - La diagnostica deve ignorare questi tasti quando si sta scrivendo in un campo.
     - La tastiera a schermo non deve mandare keydown sintetici con Maiusc+KeyD o KeyM.
  2. **[dedotto]** Nello stesso schermo il conto alla rovescia aspetta chi scrive solo se il campo ha il fuoco (`natpf_split_ui.js:486`). I tasti a schermo non devono prendere il fuoco.

## B. Minori: funziona con il mouse ma con testi o passaggi da tastiera

- **B1.** Intro: «Premi un tasto per iniziare» (`index.html:191`). Due clic portano al menu **[browser]** e c'è «Salta ›». Proposta: «Clicca o premi un tasto».
- **B2.** Riga in basso del menu (`natpf_lobby.js:563`): «↑ ↓ ← → scegli · Invio conferma · H come si gioca · F schermo intero» e «Invio avanti · Esc indietro…». Proposta: nasconderla, o scrivere «Clic per scegliere», quando l'ultimo comando è venuto dal mouse.
- **B3.** Diagnostica:
  - «Segna questo momento (Maiusc+M)» (`natpf_diag.js:176`) si raggiunge con 2 clic dal ● REC, e il pannello resta sopra il gioco;
  - testi «poi Maiusc+D → Ferma» (`:103`), title del REC con «(Maiusc+D)» (`:91`), nota «Ctrl+Maiusc+K, o 3 s sul marchio…» (`:187`).
  - Proposta: un piccolo «Segna» accanto a ● REC e i testi con la strada del mouse.
- **B4.** Title con i tasti: «Pausa (Esc)» (`index.html:900`), «(F)» e «(H)» (`:320-321`, `natpf_screen.js:367`), «Aspetta Esc» (`:752`), «tasto 1–6» (`:1031-1036`). Innocui.
- **B5.** `confirm()` di Windows per «Azzerare la classifica di oggi?» (`natpf_kiosk.js:120`) e per «Eliminare questa sessione diagnostica?» (`natpf_diag.js:156`). Si cliccano, ma **[dedotto]** sono finestre piccole, fuori stile, sul ledwall. Proposta: «Sicuro? Premi ancora» come `natpf_remote.js:64`.
- **B6.** Chiosco **[codice]**: il mouse che si muove senza cliccare non conta come attività (`natpf_kiosk.js:56`: pointerdown, keydown, touchstart, wheel). Proposta: contare anche pointermove, con una soglia.
- **B7.** Modalità prova «mouse e tastiera»:
  - si accende e si spegne solo scrivendo «natpf» (`natpf_lobby.js:710`) ed è salvata (`natpf_ui.js:394`);
  - **[dedotto]** se resta accesa, i trascinamenti del mouse sul campo diventano colpi anche con il telefono (`natpf_ui.js:382-390`);
  - testi solo per tastiera: `index.html:636` e `natpf_serve_coach.js:24` («Premi ↑ o W»; con il mouse il lancio è trascinare in su, `motion_controls.js:1674`).
  - Proposta: interruttore nel pannello, o spegnerla con «Nuovo giocatore» e con il chiosco.
- **B8.** Solo tastiera ma non servono allo stand:
  - C, camera manuale (`game_engine.js:671`). La voce «Visuale» della pausa la riporta su «Auto» (`game_engine.js:717`);
  - tasti del Player 2 in prova (`:681`);
  - Digit1-4, Q, E, W, T e Spazio della modalità prova (`motion_controls.js:1567-1622`).

## C. Già a posto con il mouse

- **Pausa** **[browser]**: ⏸ in alto a destra, 52×52 px fissi (`natpf-round.css:612`). I pannelli di allenamento e scambi di prova lasciano libero l'angolo (`natpf-ui.css:117`, `:240`). La pausa copre V, F, B (webcam), R (moviola), H (Aiuto), Diagnostica e Torna al menu.
- **Menu**: «‹ Indietro» (Esc), «Avanti ›» e «Gioca» (Invio), «Schermo intero» e «Come si gioca» in alto.
- **Guida**: ×, avanti e indietro, puntini, clic fuori.
- **Tutorial in campo e nelle due metà**: ‹ ›, X, «Chiudi».
- **Lezione dell'allenamento**: Indietro, Avanti, Destra/Sinistra, «Salta tutto».
- **Stesso schermo**: «Aspetta» e «Gioca».
- **Telecomando**: «Indietro» e «Conferma».
- **Fine partita e risultato dei minigiochi**: tutti pulsanti.
- **Avviso degli aggiornamenti**: pulsanti.
- **Finestra del certificato**: «Chiudi».

Fuori dal gioco, per l'altro filone (programma Windows): uscita, ricarica e strumenti esistono solo da tastiera (`desktop-core.mjs:160-170`: F11, Ctrl+R/Q, Ctrl+Maiusc+M/I). Il pannello dello stand potrebbe ospitarli attraverso il ponte.

## Tabella

| azione | oggi con la tastiera | oggi con il mouse | proposta |
|---|---|---|---|
| Pannello dello stand | Ctrl+Maiusc+K ovunque (F9 con B37) | sì solo nelle pagine del menu tranne la principale (marchio 3 s); no in menu principale, campo, pausa, fine partita, intro; telecomando se abbinato | ascolto anche su `.menu-brand` con anello di avanzamento; ⏸ tenuto 3 s; clic destro → menu dello staff |
| Diagnostica | Maiusc+D ovunque | solo Pausa → Diagnostica in campo, o ● REC; no nel menu e nel pannello | «Diagnostica» nel pannello (riga in basso) e nel menu del clic destro |
| Prova guidata, sessione interrotta | Maiusc+D nel menu | no (solo il giro via REC) | come sopra, testi con la strada del mouse |
| Segnare un momento | Maiusc+M | ● REC → «Segna» (2 clic) | «Segna» accanto a ● REC |
| Pausa / riprendi | Esc | sì, ⏸ e «Riprendi» | — |
| Indietro nel menu | Esc, Backspace | sì «‹ Indietro» (non nella classifica a schermo intero) | — |
| Uscire dalla classifica a schermo intero | Esc | no (marchio → «Nuovo giocatore») | pulsante nel pannello che la chiude, o × che compare muovendo il mouse |
| Scegliere una voce, andare avanti | frecce, Invio | sì, ma il doppio clic salta pagine e cambia modalità o racchetta | ignorare `detail > 1` e i clic nei 400 ms dopo un cambio di pagina |
| Schermo intero | F (F11 nel programma) | sì (menu in alto, Opzioni, Pausa); no dentro la calibrazione | pulsante nella calibrazione |
| Come si gioca / Visuale / Moviola / Movimento | H / V / R / B | sì (pulsante in alto e voci della pausa) | — |
| Calibrazione: bordo, formato, azzera, salva, annulla | Tab, 1–6, R, Invio, Esc | sì | istruzioni per il mouse al posto dei tasti |
| Calibrazione: passo grande | Maiusc+frecce (5 %) | no: 0,5 % per clic, niente ripetizione, niente trascinamento | ±5 %, tenere premuto, trascinare i bordi |
| Tutorial, lezione, guida | ← →, Invio, Esc, A/D, Home/End, 1–9 | sì | — |
| Conto alla rovescia dello stesso schermo | Esc | sì «Aspetta» | — |
| Intro | un tasto | sì, clic (il testo dice «Premi un tasto») | «Clicca o premi un tasto» |
| Nome, nomi dello stesso schermo, codice, note | tastiera | no: i minigiochi non partono | B38 + correzione di Maiusc+D/M nei campi + tasti a schermo che non prendono il fuoco |
| Modalità prova mouse e tastiera | scrivere «natpf» | no | interruttore nel pannello, o spenta dal chiosco e da «Nuovo giocatore» |
| Camera manuale | C | no | non serve («Visuale» la azzera) |
| Azzera classifica, elimina sessione | Invio nel `confirm` | sì, finestra di Windows | conferma dentro il foglio |

Script e schermate in /tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse:
- `prova-mouse.mjs`
- `prova-mouse-2.mjs`
- `prova-maiusc-d.mjs`
- schermate `menu-1280x720.png`, `pannello-1280x720.png`, `classifica-intera-1280x720.png`, `dopo-doppio-clic-gioca-1280x720.png`, `calibrazione-1280x720.png`, `campo-1280x720.png`, `pausa-1280x720.png`, `diagnostica-1280x720.png`

Il server statico di prova è stato fermato.