# Programma Windows (natpf-desktop, 2026-11-13.8) usato con il solo mouse

**Come ho controllato.** Ho letto il codice (i riferimenti sono file:riga). Ho fatto prove vere con **Electron 45.2.2 per Linux**, la stessa versione del programma, presa dalla cache `~/.cache/electron`, in uno schermo virtuale (Xvfb). Le prove girano su una copia del programma nel blocco appunti: i sorgenti copiati, mentre natpf-tennis, tools e site sono collegati alle cartelle del repository e usati solo in lettura. Ho aggiunto una pagina di prova con le stesse opzioni della finestra. **Non ho provato niente su Windows, sul ledwall o con un telefono.** Il repository è intatto (`git status` pulito).

**Sintesi.**
- **Oggi si fa con il mouse:**
  - schermo intero sì/no, con il pulsante del gioco;
  - monitor successivo, dal Pannello dello stand → «Schermo del gioco»;
  - aggiornamenti e versione, da Opzioni → Aggiornamenti e dall'avviso nel menu;
  - QR del certificato per i telefoni;
  - domande all'avvio (monitor e firewall).
- **Non si fa:**
  - uscire senza effetti collaterali;
  - ricaricare il gioco;
  - aprire la rete ai telefoni dopo l'avvio;
  - vedere la scheda grafica;
  - aprire la cartella dei registri;
  - riprendersi da una porta occupata, da una pagina bloccata, da un link o da un file finiti nella finestra.
- **Il menu del programma con il solo mouse non si apre mai:** anche in finestra la barra compare solo con Alt. La voce «Pannello dello stand (F9)» del B37 non cambia le cose: F9 è un tasto e la voce sta in quella barra.

---

## W1 [ALTA] Porta 8443 o 8080 occupata: il gioco resta fermo su «Avvio del gioco…» con un errore in inglese

- **Dove nasce l'errore:**
  - `tools/lan/server.mjs:39` crea il WebSocketServer sul server HTTP. Alla riga `:61`, `listen()` aggiunge `server.once('error', reject)` dopo l'ascoltatore di ws. ws ripete l'errore EADDRINUSE sul proprio oggetto, dove nessuno lo ascolta: diventa un'eccezione non gestita e `reject` non viene mai chiamato.
  - `tools/lan/launcher.mjs:24`: la guida su 127.0.0.1:8080 viene aspettata prima di tutto. Alla riga `:28` (porta 8443) il catch non scatta mai.
  - `natpf-desktop/src/main.mjs:480-487`: il dialogo italiano «Il gioco non è partito» non viene mai raggiunto. Inoltre nomina sempre la 8443, anche quando è la 8080.
  - La 8080 nel programma non la usa nessuno: serve solo alla guida LAN (grep).
- **VERIFICATO in Electron per Linux:** con la 8080 o la 8443 occupata compare «A JavaScript error occurred in the main process / Uncaught Exception: Error: listen EADDRINUSE … 127.0.0.1:8080» (oppure 0.0.0.0:8443) con il solo «Ok». La finestra resta su «Avvio del gioco…» e il registro non ha la riga «avvio non riuscito».
- **VERIFICATO in Node, stesso codice:** `startNatpfLan` non risponde e non dà errore.
- **Documento sbagliato:** il messaggio descritto in `docs/COLLAUDO_WINDOWS.md:196` non può comparire.
- **La 8081 occupata invece è gestita** (finisce solo nel registro): `certificato.mjs:96`, `main.mjs:123`.
- **Oggi con il mouse:** si preme «Ok» e basta. La finestra resta a schermo intero e senza menu.
  - DEDOTTO: con un secondo monitor si esce con il tasto destro sull'icona nella barra delle applicazioni → «Chiudi finestra».
  - Con il solo ledwall non c'è nessuna uscita senza tastiera.
- **Proposta:**
  1. `wss.on('error', () => {})` in `createLanServer`, con un test a porta occupata in tools/lan.
  2. Nel programma `setupPort: 0`, oppure guida facoltativa.
  3. Dialogo con la porta vera e il nome del programma che la occupa (netstat -ano + tasklist), con i pulsanti «Riprova» · «Chiudi».
  4. Un `process.on('uncaughtException')` del programma che scrive nel registro e mostra un messaggio in italiano con «Chiudi il programma».

## W2 [ALTA] Uscire dal programma

- **Dove:** `main.mjs:231` e `:359-363` (Esci, Ctrl+Q); `:132-136` (barra del menu: mai visibile a schermo intero, in finestra solo con Alt).
- **Oggi con il mouse:**
  - (a) Pulsante del gioco «Schermo intero» → finestra con cornice → X. Il pulsante sta nel menu in alto (`index.html:320`), in Opzioni (`:420`) e in Pausa (`:910`); il collegamento è in `natpf_screen.js:303`.
    - **Trappola VERIFICATA dal codice:** `setFullscreen(false)` salva `fullscreen:false` (`main.mjs:211`), quindi il prossimo avvio è in finestra (`:422`).
  - (b) DEDOTTO: tasto destro sull'icona nella barra delle applicazioni del portatile → «Chiudi finestra». Funziona solo con due monitor.
- **VERIFICATO in Electron per Linux:** `window.close()` dalla pagina chiude la finestra; poi `main.mjs:431` chiude il programma.
- **Proposta:** «Esci dal programma» con conferma («Chiudere NATPF Simulator?» · Chiudi · Annulla) nelle tre superfici di W3. Deve chiamare `app.quit()` senza toccare `fullscreen`.

## W3 [ALTA] Il menu del programma è irraggiungibile

- **Dove:** `main.mjs:352-386` e `:132-136`; `desktop-core.mjs:160-171` (le scorciatoie sono solo da tastiera).
- **VERIFICATO in Electron per Linux:** `isMenuBarVisible()` vale false sia a schermo intero sia in finestra (in finestra la barra è «a scomparsa» e compare solo con Alt).
- **Senza un equivalente con il mouse:**
  - Ricarica il gioco (`:360`; il gioco non ha nessun `location.reload`).
  - Scheda grafica in uso (`:263-267`).
  - Cartella dei dati e dei registri (`:375`). Il ponte `registro.open` esiste (`preload.cjs:80`, `main.mjs:472`), ma nessun pulsante del gioco lo usa (`registro_coda.js:113`).
  - «Apri la rete ai telefoni» dopo l'avvio (`:370`). La domanda dell'avvio (`:479`) torna solo riaprendo il programma.
  - Scelta del monitor per nome: il pannello fa solo «successivo» (`natpf_kiosk.js:127-129`), anche se il ponte ha già `choose(id)` (`preload.cjs:65`).
- **Con un equivalente con il mouse:**
  - schermo intero;
  - monitor successivo;
  - aggiornamenti e versione (`natpf_updates.js:101`, visibili anche ad aggiornamenti spenti);
  - QR del certificato per i telefoni (`index.html:547-552`, `natpf_ui.js:358`).
- **Proposta:** una sola lista di comandi in `desktop-core.mjs`, provata con node:test, usata da tre superfici.
  1. **Menu del tasto destro sul gioco:** `webContents.on('context-menu')` → `Menu.popup`, solo sulle pagine del proprio server.
     - VERIFICATO: l'evento arriva già e oggi non fa niente; il gioco non usa `contextmenu` (grep).
     - Voci: Pannello dello stand (stesso canale del B37) · Schermo intero ✓ · Schermo del gioco ▸ (elenco con «probabile ledwall») · Ricarica il gioco · Riavvia il programma · Rete ▸ · Aggiornamenti… · Scheda grafica… · Cartella dei registri · Esci….
     - Funziona in ogni schermata, anche in partita e con un solo monitor.
  2. **Icona nell'area di notifica (Tray) con lo stesso menu**, sul portatile mentre il gioco è sul ledwall.
     - Funziona anche con la pagina bloccata, perché sta nel processo principale.
     - DEDOTTO: su Windows 11 può finire sotto «^».
  3. **Foglio «Programma» nel Pannello dello stand.** Un solo pulsante «Programma ›» nella riga in basso: a 1024×600 il pannello non ha posto per altro (`index.html:259`).
     - Pulsanti grandi e stato leggibile: versione, schermo intero, elenco dei monitor, rete ai telefoni (regola sì/no + «Apri»), scheda grafica in una riga (`app.getGPUFeatureStatus().webgl`: accelerata o software, con «Dettagli…»), cartella dei registri, avvio con Windows (W7), puntatore (W5), controllo del PC (W8).
     - Ponte nuovo `natpfDesktop.app = { info, quit, reload, relaunch, gpu, open(chiave), firewall, startAtLogin }` sul canale `natpf:app`.
     - Stesse regole di sicurezza degli altri canali (`main.mjs:441-473`: `event.sender === win.webContents` e `isOwnUrl(senderFrame.url)`).
     - Azioni da un elenco congelato, come `UPDATE_ACTIONS`. Le cartelle si chiedono per chiave e le decide il processo principale: mai percorsi dalla pagina.

## W4 [ALTA] Gioco bloccato (pagina che non risponde)

- **Dove:** `main.mjs:507` gestisce solo la pagina chiusa di colpo. Non c'è nessun gestore `'unresponsive'` (grep).
- **Oggi:** si recupera solo con Ctrl+R. Con il mouse niente.
  - DEDOTTO: anche il menu del tasto destro nasce dalla pagina, quindi con la pagina ferma non comparirebbe.
- **Proposta:**
  - `win.on('unresponsive')` → dopo 10 s una finestra «Il gioco non risponde» · «Ricarica il gioco» · «Aspetta» · «Chiudi il programma».
  - La finestra si chiude da sola quando la pagina torna a rispondere (`'responsive'`, con un signal come in `askDisplay`, `main.mjs:333-336`).
  - Con il chiosco acceso il gioco si ricarica da solo dopo 30 s.
  - Il Tray resta raggiungibile anche in questo caso.

## W5 [MEDIA] Puntatore sul ledwall

- **VERIFICATO dal codice:** il puntatore non si nasconde mai.
  - Nei CSS ci sono solo pointer, default, not-allowed e crosshair: nessun `cursor:none`, nessun cursore proprio, nessun `requestPointerLock`.
  - Il programma non fa niente sul puntatore.
  - In partita la freccia resta dove l'ha lasciata l'addetto, davanti al pubblico.
- **DEDOTTO:** al 100% la freccia di Windows è 32×32 px, con un disegno di circa 12×19 px.
  - Su un ledwall 1024×1024 è circa il 2% dell'altezza: circa 4 cm su un ledwall di 2 m, facile da perdere sul campo 3D.
  - Rispetto al gioco è ancora più piccola se il processore LED prende solo un angolo di un'uscita grande.
- **Proposta (lato gioco, misure cqmin, nessun file nuovo):** opzione dello stand «Puntatore: Normale · Grande», di base «Grande» nel programma.
  - Un alone #E8FF3A attorno alla punta: un solo elemento `fixed` con `pointer-events:none` e `transform`.
  - L'alone pulsa per circa 1 s quando il mouse riparte o entra nella finestra.
  - In campo puntatore e alone spariscono dopo 3 s fermi (`cursor:none` sulla radice) e tornano al primo movimento; nei menu dopo 10 s.
  - Facoltativo: cursore CSS da 64 px (Chromium accetta immagini fino a 128 px; da provare su Windows).
- **Nella guida:** Impostazioni → Accessibilità → Puntatore del mouse → dimensione 3–5 e colore. Vale anche per le finestre di Windows e per la domanda del monitor.

## W6 [MEDIA] Link, file trascinati e download

- **Dove:**
  - Link con `target=_blank`: `index.html:546, 584, 600, 774, 791, 836` e `natpf_ui.js:490`.
  - `window.open` in `motion_controls.js:531`.
  - Il processo principale non ha `setWindowOpenHandler`, `will-navigate` né `will-download` (grep).
  - Il gioco non gestisce `dragover`/`drop`.
  - Il telecomando dello staff evita già questi controlli (`natpf_remote.js:28-33`); il mouse no.
- **VERIFICATO in Electron per Linux:**
  - Un clic su un link `target=_blank` apre una finestra Electron 800×600 sopra il gioco, con la barra del menu del programma visibile (shots/3-link-blank.png).
  - «Scarica CSV» apre la finestra «Salva con nome» (shots/5-download.png).
- **DEDOTTO:** un file trascinato con il mouse sulla finestra porta la pagina su `file://` e il gioco sparisce. Ctrl+R ricaricherebbe il file; con il mouse si torna solo chiudendo e riaprendo il programma.
- **Proposta:**
  - `setWindowOpenHandler` → nega, con un avviso nel gioco: «Il link è per il telefono: inquadra il QR».
  - `will-navigate` consentito solo verso le pagine del proprio server (`isOwnUrl`).
  - `will-download` → salvataggio diretto in Download (o in `%LOCALAPPDATA%\NATPF\esportazioni`), con l'avviso «Salvato: … · Apri la cartella» e nessuna finestra di Windows sul ledwall.
  - Vale per «Scarica CSV» (`natpf_events.js:165`), «Scarica la coda» (`natpf_registro.js:131`) e il salvataggio della diagnostica (`diag_export.js:33`).

## W7 [MEDIA] Avvio

- **VERIFICATO dal codice:**
  - La finestra nasce già a schermo intero (`main.mjs:422`) sul monitor salvato, altrimenti sul più grande che non è il principale (`desktop-core.mjs:34-41`).
  - Con due monitor e nessuna scelta compare la domanda «Su quale schermo mostro il gioco?» sul monitor principale: un pulsante per monitor più «Decidi tu», con 30 s di tempo (`main.mjs:336-340`). Con il mouse va bene.
  - «Premi un tasto per iniziare» accetta anche il clic (`natpf_intro.js:125`).
- **Trappole:**
  1. Dopo l'uscita «finestra + X» il programma riparte in finestra (W2).
  2. Una finestra trascinata con il mouse su un altro monitor non viene ricordata: `:430` aggiorna solo il monitor attuale, mentre si salva solo da `placeOn` (`:163`).
  3. La domanda del firewall (`:244`, solo se manca la regola) non ha un tempo massimo; il gioco resta su «Avvio del gioco…» finché qualcuno clicca. DEDOTTO: la finestra compare sopra il gioco sul ledwall.
- **Proposta:**
  - «Avvio con Windows: Sì · No» (`app.setLoginItemSettings`, solo per l'utente, senza permessi di amministratore): dopo un riavvio per gli aggiornamenti o un calo di corrente il gioco torna da solo.
  - Ricordare il monitor anche quando si trascina la finestra.
  - «Più tardi» automatico dopo 60 s nella domanda del firewall.

## W8 [MEDIA] Sospensione, salvaschermo, blocco, notifiche, aggiornamenti di Windows

- **VERIFICATO dal codice:**
  - `powerSaveBlocker.start('prevent-display-sleep')` parte dopo «Avvio del gioco…» (`main.mjs:476`) e si ferma all'uscita (`:520`).
  - Il gioco chiede anche il wake lock dello schermo (`natpf_wake_lock.js:9`, permesso concesso in `main.mjs:409`).
  - Non c'è nient'altro.
- **DEDOTTO (da provare su Windows):**
  - Schermo e PC restano accesi contro i tempi di inattività.
  - Il blocco non ferma: coperchio del portatile chiuso con l'azione «Sospendi», pulsante di accensione, blocco dopo inattività dei criteri aziendali (PC noleggiati). Forse non ferma il salvaschermo: da provare con il salvaschermo a 1 minuto e il gioco aperto.
  - Se il PC si blocca serve il PIN: con il solo mouse si può solo con la tastiera su schermo di Windows (schermata di blocco → Accessibilità).
  - Le notifiche compaiono sul monitor principale: con il gioco sul ledwall esteso non lo coprono; con il gioco sul principale le ferma «Non disturbare» automatico a schermo intero.
  - Windows Update può riavviare il PC fuori dall'orario attivo.
- **Proposta:**
  - Riga «Controllo del PC» nel foglio Programma, con avvisi letti senza permessi e il «come si fa» con il mouse:
    - salvaschermo con password (`HKCU\Control Panel\Desktop`: ScreenSaveActive, ScreenSaverIsSecure, ScreenSaveTimeOut);
    - riavvio di Windows in sospeso (`…\WindowsUpdate\Auto Update\RebootRequired`);
    - coperchio che manda in sospensione (`powercfg /q SCHEME_CURRENT SUB_BUTTONS LIDACTION`).
  - Avvio con Windows (W7).
  - Guida «PC dello stand con il solo mouse»:
    - schermo e sospensione: Mai; coperchio: Non fare nulla;
    - salvaschermo: Nessuno;
    - Non disturbare acceso;
    - Windows Update → Sospendi per 1 settimana;
    - puntatore grande;
    - tastiera su schermo di Windows come ultima risorsa.

## W9 Finestre di dialogo: cosa chiedono

| Dove | Cosa chiede e pulsanti | Con il mouse |
|---|---|---|
| `main.mjs:336` | Domanda del monitor: un pulsante per monitor + «Decidi tu» | Va bene |
| `main.mjs:244` | «I telefoni devono poter raggiungere questo computer»: Apri la rete · Più tardi, poi la richiesta di permesso di Windows | Va bene, ma senza tempo massimo (W7) |
| `main.mjs:251` | «Rete non aperta», solo Ok | Il testo rimanda al «menu Rete», che si apre solo con Alt |
| `main.mjs:258`, `:279-299` | Indirizzi e aggiornamenti | Si aprono solo dal menu (con Alt); nel gioco ci sono gli equivalenti |
| `main.mjs:485` | «Il gioco non è partito», Ok | Non compare mai con le porte occupate (W1) |
| `main.mjs:524` | Errore di avvio, solo Ok | Va bene |
| Electron | «A JavaScript error occurred in the main process», in inglese | Vedi W1 |
| `natpf_kiosk.js:120`, `natpf_diag.js:156` | `confirm()` nel gioco: OK / Annulla | Va bene |
| Download | «Salva con nome» | Va bene, ma vedi W6 |
| `main.mjs:103-107` | Certificati: nessuna finestra; il programma accetta in silenzio solo il proprio certificato | — |
| `installatore.nsi:104` | «NATPF Simulator è aperto…», OK / Annulla | Va bene |
| `installatore.nsi:159` | Aggiornamento non riuscito: dà solo il percorso in AppData, che è nascosta e va scritta a tastiera | Proposta: aprire Esplora file con l'installer già selezionato (`/select`), così basta un doppio clic |
| `installatore.nsi:206` | Regola del firewall non creata | Il testo dice «tasto Alt» |
| Permesso di amministratore di Windows | «Sì» | Va bene con un account amministratore; DEDOTTO: con un account standard chiede una password |

## W10 Testi che rimandano alla tastiera

Da cambiare quando ci saranno i percorsi con il mouse:
- `installatore.nsi:57` e `:206`;
- `main.mjs:251`;
- `docs/GUIDA_TELECOMANDO.md:13` e `:81` («F11, poi Alt»);
- `docs/COLLAUDO_WINDOWS.md:8, 80, 98, 109-117, 126, 131, 151, 200, 204`;
- `natpf-desktop/LEGGIMI.md` (scorciatoie).

## W11 Minori

- **Doppio clic sull'icona con il programma già aperto sul ledwall:** il programma porta avanti la finestra (`main.mjs:99`), ma sul portatile non si vede niente. Proposta: far lampeggiare l'icona (`win.flashFrame`) o un avviso nel gioco.
- **Rete cambiata dopo l'avvio:** certificato e indirizzi si fanno solo all'avvio (`main.mjs:116-118`, `:481`). Proposta: «Riavvia il programma» (`app.relaunch`) tra i comandi di W3.
- **Finestre sul ledwall:** DEDOTTO: i dialoghi legati al gioco, Esplora file e «Scheda grafica» compaiono sul ledwall davanti al pubblico. Per le cose dello staff sono meglio i fogli del gioco.
- **UNISCI I PEZZI.cmd** finisce con `pause` (`scripts/dividi.mjs:27`): si chiude anche con la X.

## Ordine consigliato (B39, parte del programma)

1. W1.
2. Lista dei comandi + menu del tasto destro + Tray (W2, W3), gestione di `'unresponsive'` (W4), guardie su finestre, navigazione e download (W6). Con test node:test e prova-linux per menu del tasto destro, Tray e porta occupata.
3. Foglio «Programma» con `natpfDesktop.app`, avvio con Windows e controllo del PC (W7, W8); puntatore grande (W5).
4. Testi e guida (W9, W10).

**Non provato:** tutto ciò che è su Windows, cioè:
- barra delle applicazioni e «Chiudi finestra»;
- permesso di amministratore di Windows;
- notifiche, salvaschermo, blocco del PC;
- menu a comparsa e Tray sopra lo schermo intero;
- posizione dei dialoghi;
- dimensione del puntatore;
- file trascinato sulla finestra;
- cosa fa la pagina del telefono aperta nella finestra in più.

Niente provato sul ledwall vero.

**File nel blocco appunti:**
- Prova delle porte occupate in Node: `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/porte-occupate.mjs`
- Avvio del programma in Xvfb: `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/prove/avvia.sh`
- Porta tenuta occupata per le prove: `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/prove/occupa.mjs`
- Tasto destro, menu, link, download: `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/prova-electron/main.mjs`
- `window.close()` dalla pagina: `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/prova-chiudi/main.mjs`
- Schermate:
  - `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/shots/porta8080.png`
  - `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/shots/porta8443.png`
  - `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/shots/3-link-blank.png`
  - `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/shots/5-download.png`
  - `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/shots/base.png`
- Electron 45.2.2 per Linux estratto, riusabile da altri agenti: `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/electron/`
- Copia del programma usata per le prove: `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/app/`