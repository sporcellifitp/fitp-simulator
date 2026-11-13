REVISIONE «STAND CON IL SOLO MOUSE» (B39)

Come ho controllato: ho letto il codice e fatto prove mirate sulla **13.9** (HEAD `5a15bbd`), non sulla 13.8 della lista. Le prove girano in Chromium headless a 1280×720, con Vite avviato dal repository in sola lettura e la cache nello scratchpad. Per avere una partita senza telefono ho usato la racchetta «mouse» della modalità prova. Ctrl+Maiusc+K vale come F9 di B37: tutti e due chiamano `kiosk.toggle` (`66fd170`). Repository e worktree non toccati: `git status` pulito. Non provato: Electron/Windows, ledwall, telecomando vero, telefono vero.

Segni: [V] = verificato, [D] = dedotto.

## (a) Voci mancanti

**A1 [V] · Il pannello dello stand aperto in partita non ferma la partita.**
- Dove: `natpf_ui.js:219-221`. In `_syncPause` lo stato «occupato» non conta il pannello, il telecomando e la diagnostica. `natpf_kiosk.js:73-74` (apri e chiudi) non chiama `_syncPause`.
- Quando: partita, scambi di prova, allenamento. Il pannello arriva da F9 (B37), da Ctrl+Maiusc+K, dal «Pannello dell'addetto» del telecomando (`natpf_remote.js:358`) e da tutte le vie proposte al n.1.
- Prova: pannello aperto, 12 s. Tempo di gioco 18,5→30,5 s; la CPU ha vinto 2 punti dietro il pannello (0-1 → 0-3); partita mai in pausa. Schermata: `pannello-in-partita.png`.
- Proposta: contare pannello, telecomando e diagnostica in `_syncPause`, e chiamarla all'apertura e alla chiusura. È lo stesso lavoro del n.14.

**A2 [V] · Il pannello si apre sotto la pausa.**
- Dove: tutti i fogli hanno z-index 60 (`natpf.css:453-454`). `#natpf-staff` sta a `index.html:220`, prima nel DOM di `#natpf-pause` (`:912`), del foglio del telefono (`:834`) e della guida (`:937`). Il tutorial in campo (`natpf-ui.css:1691`, z-index 70) e la calibrazione (z-index 300) lo coprono.
- Prova: ❚❚ apre la pausa, poi Ctrl+Maiusc+K. Il pannello risulta aperto, ma su «Chiudi», «Nuovo giocatore» e «Mira» sopra c'è `#natpf-pause`: invisibile e non cliccabile. Schermata: `pannello-sotto-pausa.png`.
- Effetti:
  - F9 in pausa sembra non fare niente.
  - [D] Il telecomando crede il pannello in cima (`natpf_remote_map.js:44`) e sposta il fuoco su pulsanti che non si vedono.
  - «❚❚ tenuto 3 s» (n.1): al rilascio parte il clic che apre la pausa sopra il pannello, se non viene scartato.
- Proposta: aprire il pannello chiude la pausa e la riapre alla chiusura, oppure i fogli dello staff hanno uno z-index più alto.

**A3 [V] · La diagnostica copre la pausa.**
- Dove: `natpf-flow.css:282-286` (z-index 200, in basso a sinistra, fino a 980 px).
- Prova: con la diagnostica aperta, ❚❚ apre la pausa sotto; a 1280×720 «Torna al menu» non si clicca (schermata `prova-guidata-dal-menu.png`).
- Col mouse oggi: prima la × della diagnostica.
- Proposta: va nello stesso passo di A1 e A2.

**A4 [V] · Il chiosco butta via il lavoro dello staff che non clicca.**
- Dove: `natpf_kiosk.js:56` (pointerdown, keydown, touchstart, wheel) e `:76-84` (si sospende solo con il pannello aperto); `natpf_lobby.js:496` (cambiando pagina la calibrazione si annulla).
- Prova: chiosco acceso a 30 s, Opzioni → «Calibra lo schermo…», un clic su «+», poi 34 s di mouse che si muove senza clic → calibrazione annullata, di nuovo al menu (`chiosco-calibrazione.png`).
- [D, codice] Stesso effetto su:
  - l'abbinamento del telecomando (il reset nasconde il foglio; `natpf_remote.js:186` chiude l'abbinamento);
  - la guida;
  - la classifica a schermo intero, che con il chiosco acceso dura solo il tempo impostato (lo stato di riposo è solo la pagina «menu», `natpf_kiosk.js:80`): non si può lasciare in vista per chi è in fila.
- Proposta: chiosco fermo con calibrazione, telecomando, diagnostica e tastiera di B38 aperti; contare anche il movimento del mouse; classifica intera trattata come stato di riposo.

**A5 [V codice] · Le voci distruttive del pannello non chiedono conferma.**
- Dove: `natpf_kiosk.js:114` («Nuovo giocatore», accanto a «Chiudi»), `:118` («Classifica a schermo intero»: chiude la partita), `:121` («Telefono: Scollega»).
- Diventano un rischio appena il pannello si apre in partita (B37).
- Il telecomando invece chiede già conferma (`natpf_remote_map.js:178`).
- Proposta: la stessa conferma a due clic del n.15.

**A6 [V codice] · «Schermo intero» premuto per sbaglio resta salvato nel programma.**
- Dove: il pulsante è in alto in ogni pagina del menu, a 10 px da «Come si gioca» (`natpf_screen.js:303`), e anche in Opzioni e in pausa. `main.mjs:207-211` salva la scelta; `:422` la usa all'avvio dopo.
- Effetto: un clic mancato porta cornice e barra delle applicazioni sul ledwall, anche ai prossimi avvii.
- Col mouse oggi: si rimedia con un altro clic.
- Proposta: nel programma quel pulsante non salva la scelta; più distanza da «Come si gioca».

**A7 [D] · Finestre di Windows con le cartelle dell'utente davanti al pubblico.**
- «Salva con nome» (n.16), «Cartella dei registri» e «Apri la cartella» (proposte n.4 e n.16, `shell.openPath` in `main.mjs:472`) aprono Esplora file sul monitor del gioco, con percorsi C:\Users\<nome>.
- Proposta: mostrare il percorso nel gioco; Esplora file solo su un altro monitor.

**A8 [D] · Tasto centrale del mouse.**
- Su Windows Chromium attiva lo scorrimento automatico; su un link apre una finestra nuova.
- Proposta: aggiungere il tasto 1 alla correzione del n.3; `setWindowOpenHandler` (n.17) copre anche il link.

**A9 [V codice] · Avvisi brevi illeggibili da lontano.**
- 15 px fissi (`natpf-ui.css:851`, `natpf-round.css:298`) per 2,6 s (`natpf_ui.js:411`).
- I testi dello staff sono lunghi: mira e formato in fiera (`natpf_kiosk.js:38-41`, `:134`).
- Proposta: misura in cqh e durata in base alla lunghezza, oppure la riga #staff-note del n.21.

**A10 [D] · Telecomando dello staff: c'è già come riserva senza codice.**
- È provato nel repository (`tools/e2e/natpf-telecomando.mjs`, 85/85 sulla 13.9 secondo TRACCIA_PASSI).
- Già fa: pannello in ogni schermata tranne l'intro, pausa, «Menu» e «Nuovo giocatore» con conferma, uscita dalla classifica intera («Indietro» = Esc), livello della CPU, monitor, schermo intero, «Salta».
- Non fa: diagnostica, testo, Esci/Ricarica, Tab e passo 5% della calibrazione (manda solo frecce, Invio, Esc: `natpf_remote_map.js:93`).
- L'abbinamento si fa dal pannello, quindi non dalla pagina principale del menu (n.1).
- Proposta: nella guida, abbinarlo all'apertura dello stand. Da decidere se B39 può toccare `site/js/tennis/remote-*.js` (oggi in «Non toccare») per dargli la stessa lista di comandi.

**A11 [D] · PC e installazione (guida, niente codice).**
- Il primo installer si scarica solo con un link cliccabile (mail o segnalibro) o con la tastiera su schermo di Windows: l'indirizzo R2 va scritto.
- SmartScreen e la finestra del permesso di Windows si fanno col mouse.
- Con «Riavvia e aggiorna» (`natpf_updates.js:90`) la finestra del permesso di Windows compare sul monitor principale. Il gioco resta aperto fino a 10 min (`main.mjs:62-71`); un «Sì» dato dopo chiude comunque il gioco → aggiornare a stand chiuso.
- Desktop esteso: [D] se il gioco perde il fuoco, la barra delle applicazioni può comparire sul ledwall → impostarla solo sul monitor principale.
- Mouse senza fili scarico: mouse con filo o pile di scorta, telecomando come riserva.

**A12 · Non sono buchi.**
- Lingua: non esiste un'opzione (testi solo in italiano, `natpf_i18n.js` è una tabella fissa).
- Mano, livello, personaggi, durata, volume: si cambiano già col mouse (pagina «Pronto per la partita», Opzioni, pausa). Per la mira serve il pannello (n.1).

## (b) Voci da correggere o togliere

**B1 · La base è vecchia.**
- La lista è sulla 13.8; il repository è a `5a15bbd` (13.9, B35b unito in `1043c85`).
- Righe spostate (13.8 → 13.9):

| file | 13.8 | 13.9 |
|---|---|---|
| index.html, pausa | 906-919 | 912-931 |
| index.html, title «Pausa (Esc)» | 900 | 911 |
| index.html, «Salta ›» | 965 | 976 |
| index.html, calibrazione | 1011-1067 | 1022-1078 |
| index.html, link `_blank` | 836 | 847 |
| natpf_ui.js, link `_blank` | 490 | 510 |
| natpf-round.css, ❚❚ | 612-628 | 640-660 |
| natpf_ui.js, `_syncPause` | 216 | 219 |
| natpf_ui.js, racchetta salvata | 409 | 415 |
| natpf_ui.js, riquadro del telefono | 646-650 e 679 | 663-670 e 690-708 |
| natpf_lobby.js, classifica intera | 496 | 498 |
| natpf_lobby.js, Esc/Backspace | 732 | 737 |
| natpf_lobby.js, «natpf» | 710 | 715 |
| natpf_lobby.js, tessere | 160-161 | 162 |
| natpf_lobby.js, «Gioca» | 248-249 | 251 |
| natpf_lobby.js, passaggio da solo | 604-607 | 610-614 |

**B2 · n.10, primo punto.**
- Sulla 13.9 il percorso di base (telefono con «Calibrazione: Giocando») non salta più «Pronto per la partita»: dopo «Collega» si fanno gli scambi di prova (`natpf_lobby.js:74`, `:611`, `:776`) e la pagina arriva dopo.
- Il salto resta [V, 13.9, secondo clic a 120 ms] con la racchetta mouse: doppio clic su «Alla partita ›» → partita partita (`doppio-alla-partita.png`).
- [D, codice] Uguale con la webcam e con il telefono in «Nessuna» o «Con i gesti», se il telefono è pronto e il tutorial già visto.
- Togliere «R3 lo collega al salto segnalato dall'utente»: quel salto era il punto 4 di B35b (`docs/b35/collaudo-13-11.md:18`, `:76-79`), già corretto.

**B3 · n.2.**
- Bloccanti sono solo il nickname dei minigiochi e il codice della sfida.
- Nomi dello stesso schermo e nota della diagnostica sono facoltativi.
- «Ritardo dello schermo» si regola già col mouse con le frecce del campo numerico [V: 0 → 5 → 10], ma il campo è di 60×19 px: va tolto dall'elenco.

**B4 · n.1.**
- Il telecomando non è «non provato»: la prova nel repository copre anche «Pannello dell'addetto», ma ha gli stessi difetti di A1 e A2.
- Va aggiunto come strada col mouse di oggi anche ai n.7 e n.15.

**B5 · Contraddizione 1: ha ragione R1 [V].**
- Verificato passo per passo: partita → ❚❚ → Diagnostica → «Avvia registrazione» → × → ❚❚ → «Torna al menu» → ● REC → «Ferma» → «Prova guidata».
- Senza telefono collegato il gioco va a «Collega» e dice «riapri la prova guidata». Riaprire col mouse vuol dire rifare tutto il giro, con una partita buttata.
- Il n.6 resta BLOCCANTE.

**B6 · n.14 è peggio di come descritto.**
- Nella mia prova la partita da 1 game è finita dietro la diagnostica in circa 2 s.
- Aggiungere A3.

**B7 · Contraddizioni 4 e 5.**
- 4: [D] in Electron il trascinamento di un file sulla pagina non naviga di base (`navigateOnDragDrop` spento) → ha ragione R3.
- 5: hanno ragione tutte e due. Con la modalità prova salvata (`natpf_ui.js:388`, `:395`) il mouse colpisce anche con il telefono.

**B8 · Altre aggiunte a voci esistenti.**
- n.4: aggiungere A6 e A7.
- n.18 e B39.6: la calibrazione deve fermare il chiosco (A4).
- n.21: contare il movimento del mouse non è una comodità (A4).
- n.12: aggiungere «Gioca senza calibrare» (`.lobby-link`, `index.html:595`, `:608`) e gli avvisi brevi (A9).
- «Già a posto col mouse»: la pausa lo è solo se non c'è aperto un altro foglio dello staff (A2, A3); la fine partita è cambiata con B35b ed è da ricontrollare col doppio clic.

## (c) Priorità da cambiare

1. **Nuovo primo passo, BLOCCANTE e piccolo**: «fogli dello staff sopra tutto e partita ferma» = A1 + A2 + A3 + n.14, stessa radice. Va fatto dentro B37 se è ancora aperto, altrimenti come B39.0. Motivo: F9 di B37 porta il pannello in partita già nella prossima versione.
2. **A4 (chiosco) sale a IMPORTANTE**, dentro B39.3 o B39.6.
3. **n.15 sale insieme ad A5**, nello stesso passo in cui il pannello si apre in partita.
4. **n.10 resta IMPORTANTE ma con perimetro ridotto**: prima di scrivere la guardia, rimisurarlo sulla 13.9 con la webcam e con il telefono in «Nessuna» e «Con i gesti».
5. **n.2**: tra i BLOCCANTI restano solo il nickname dei minigiochi e il codice della sfida (li copre B38).
6. **Telecomando (A10)**: anticipare nella guida come rimedio senza codice.
7. **Spazio nel pannello**: B38 aggiunge «Tastiera a schermo»; B39 aggiunge Diagnostica, Programma, Puntatore e l'interruttore della modalità prova. A 1024×600 «Chiudi» finisce fuori vista → decidere subito un «Strumenti ›».
8. **Domanda in più per l'utente**: il mouse è solo dello staff o a portata dei visitatori? Area «Intero/2×2/3×2» (salva al primo clic, `natpf_screen.js:317-320`), «Schermo intero» e «Riavvia e aggiorna» sono a un clic da chiunque.
9. **n.8 e n.9** sono gli unici BLOCCANTI mai osservati: provarli in Electron prima di B39.4.

Materiale, tutto in `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/revisore/` (Vite fermato):
- `verifica.mjs`: doppio clic, pannello in partita, pannello sotto la pausa, ritardo dello schermo, chiosco con la calibrazione
- `verifica2.mjs`: diagnostica sopra la pausa
- `verifica3.mjs`: giro di R1 per la prova guidata
- `risultati.json`, `risultati2.json`, `risultati3.json`
- `shots/`: `pannello-in-partita.png`, `pannello-sotto-pausa.png`, `prova-guidata-dal-menu.png`, `chiosco-calibrazione.png`, `diag-ritardo-freccette.png`, `doppio-alla-partita.png`, `prova-guidata-giro-r1.png`