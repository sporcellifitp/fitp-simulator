# B39 · Stand con il solo mouse (14/11/2026)

Allo stand si vede solo il ledwall e lo staff ha **solo il mouse** (decisioni dell'utente del 13-14/11: niente icona
nell'area di notifica, comandi dello staff protetti dai visitatori, **tasto destro nel programma = menu di Windows al
puntatore con i comandi dello staff**). Questo blocco toglie i punti «BLOCCATO» del controllo del 13/11
(`docs/b39/controllo-solo-mouse/`, lista unica e proposta B39.1–B39.7) che non sono del B38 (campi di testo, tastiera a
schermo, «Gioca come Ospite»: li fa l'altro agente). Il B43 aveva già fatto il B39.0 (pannello, telecomando e
diagnostica che fermano la partita e stanno sopra la pausa; conferme in due clic): qui si riusa.

Ramo `b39-solo-mouse`, base `889cb25` (versione 2026-11-14.1). Un commit per passo: B39.1+B39.4 `89494fb`,
B39.3 `7c016bb`, B39.2 `49f38cf`, B39.5 `bb8d71e`, B39.6 `e6e81d1`, B39.7 (testi e guide) dopo.

## Come si usa con il solo mouse

| Cosa | Con il mouse |
|---|---|
| Pannello dello stand | **Tasto destro sul gioco → «Pannello dello stand»** (nel programma Windows, ovunque, anche in partita); oppure **tieni premuto 3 s** il titolo grande «NATPF Simulator» della pagina principale o il marchio in alto a sinistra delle altre pagine (un anello giallo si riempie; la mano che trema un poco non annulla); in partita **❚❚ tenuto 3 s** (il clic breve resta la pausa) |
| Diagnostica | pannello → **«Diagnostica»** in alto a destra (chiusa con ×, si torna al pannello), oppure tasto destro → «Diagnostica» |
| Esci, Ricarica, Riavvia | tasto destro → **«Ricarica il gioco»**; **«Esci» → «Sì, chiudi NATPF Simulator»**; «Riavvia il programma» → «Sì, riavvia adesso». Esci non cambia la scelta dello schermo intero |
| Schermo intero, monitor | tasto destro → «Schermo intero» (spunta) e «Schermo del gioco» (un monitor per riga, «Monitor successivo») |
| Rete ai telefoni | tasto destro → «Rete per i telefoni» → «Apri la rete ai telefoni (firewall)…» o «Indirizzi e certificato per i telefoni…» |
| Calibrare lo schermo | tasto destro → «Calibra lo schermo…» (o Opzioni → «Calibra lo schermo…»): **clicca l'angolo in alto a sinistra e quello in basso a destra che vedi** (una scritta gialla segue il puntatore), poi trascina le frecce dei bordi se serve, **«Salva»**. «−» e «+» si tengono premuti. Calibrazione sbagliata: tasto destro → **«Azzera la calibrazione dello schermo»** (il menu si apre dove c'è il puntatore, quindi si vede) |
| Classifica a schermo intero | per uscire: **«× Chiudi»** in alto a destra (compare muovendo il mouse), oppure pannello → «Classifica · Chiudi lo schermo intero» |
| Scarica CSV, Scarica la coda, pacchetto della diagnostica | nel programma si salvano subito in **Download › NATPF** (niente «Salva con nome»); un avviso nel gioco dice il nome del file. Tasto destro → Programma → «Cartella dei file salvati» la apre |
| «Azzera oggi», «Elimina» (diagnostica) | **secondo clic** sul pulsante («Sicuro? Clicca ancora»), niente finestra di Windows |
| Puntatore | Opzioni → **«Puntatore: Grande»** (di base nel programma): freccia gialla alta il 5,5 % dell'area; in campo sparisce dopo 3 s fermo, nei menu dopo 10 s, ricompare con un anello; con un'area calibrata più piccola della finestra una freccia sul bordo dell'area dice dove sta il puntatore quando è fuori dalla parte visibile |

## Cosa è cambiato, per passo

### B39.1 · Trappole
- **Porta occupata.** `tools/lan/server.mjs`: `ws` ripeteva l'errore del server HTTP (EADDRINUSE) sul
  WebSocketServer senza ascoltatore → eccezione non gestita (finestra inglese di Electron con il solo «OK», gioco
  fermo su «Avvio del gioco…», niente nel registro). Ora `listen()` si rifiuta con l'errore e basta (prova a porta
  occupata in `tools/lan/test/setup.test.mjs`). Nel programma: finestra italiana con **la porta vera**, chi la tiene
  (Windows: `netstat -ano` + `tasklist`, se si trova), **«Riprova» · «Chiudi il programma»**; lo stesso testo sulla
  pagina di avvio (si legge sul ledwall anche se la finestra di Windows compare altrove); i server del tentativo
  fallito si chiudono prima di riprovare. La pagina dell'avvio guidato della LAN nel programma non usa più la 8080
  fissa (`DESKTOP.setupPort = 0`, solo 127.0.0.1): il programma usa la **8443** e la **8081**.
- **Errori non gestiti** del processo principale: nel registro e in una finestra italiana (Continua · Riavvia ·
  Chiudi), una alla volta.
- **Tasto laterale «indietro»** del mouse: la cronologia della finestra si svuota a ogni pagina del gioco (indietro non
  c'è niente: prima tornava alla pagina «Avvio del gioco…» e il gioco spariva); la pagina ferma anche i tasti 3, 4 e il
  centrale (`natpf_stand_mouse.js`, solo nel programma).
- **Link e trascinamenti**: niente finestre nuove sopra il gioco (`setWindowOpenHandler` nega; la pagina dice «Il link
  è per il telefono: inquadra il QR»), la finestra va solo sulle pagine del proprio server (`will-navigate`), file e
  immagini trascinati non cambiano pagina, immagini e link non si trascinano.

### B39.2 · Guardia del doppio clic
`natpf_click_guard.js`: una regola sola, in cattura sulla finestra, per i **clic veri** del mouse sui pulsanti: il
**secondo clic di un doppio clic** (detail > 1) non conta, e nemmeno un clic arrivato **meno di 450 ms dopo un cambio
di schermata** (pagina del menu, foglio aperto o chiuso). Mai per i clic del codice, i tasti, la calibrazione dello
schermo, i campi e i cursori. Copre «Gioca» (finiva in «Stesso schermo» o «Sfida un amico»), «Allenamento» (webcam
accesa e salvata), «Minigiochi», «Contro la CPU», «‹ Indietro», **«Alla partita ›» con «Gioca ›» nello stesso punto**
(la partita partiva senza scegliere), le voci a giro del pannello, «Avanti ›» della guida, «Scollega il telecomando».
Nelle prove automatiche la regola del clic in ritardo vale solo con `?guardia=1` (come lo schermo intero automatico).

### B39.3 · Pannello da ogni pagina, diagnostica, uscite
- `natpf_hold.js`: pressione lunga con l'anello e la scritta, tolleranza di 24 px, il clic che segue non arriva al
  pulsante (❚❚ non apre anche la pausa). Sul titolo grande della pagina principale, sul marchio delle altre pagine,
  su ❚❚ in campo.
- «Diagnostica» nel pannello (in alto a destra: il foglio non cresce, «Chiudi» resta in vista a 1024×600, 1366×657,
  1280×720, 720×720 e 1024×1024), con ritorno al pannello.
- Classifica a schermo intero: «× Chiudi» e la voce del pannello che diventa «Chiudi lo schermo intero»;
  «Ancora nessuna partita oggi» su una riga.
- «Azzera oggi» ed «Elimina» della diagnostica con il secondo clic; «Scollega il telecomando» con lo stesso intervallo
  minimo (450 ms) delle conferme del B43.
- Riga sotto le voci del pannello: la spiegazione della voce sotto il puntatore.
- Riquadro «Telefono in pausa» sotto i fogli aperti (prima copriva «Riprendi ›» e l'angolo del QR).
- Testi della diagnostica con la strada del mouse; foglio del telecomando e `GUIDA_TELECOMANDO.md` con il pulsante vero
  «Prima volta su questo telefono» (prima «QR Certificato»).

### B39.4 · Programma Windows
- **Un solo elenco di comandi** (`COMMANDS` in `desktop-core.mjs`) per la barra del menu (Alt, in finestra), le
  scorciatoie e il **menu del tasto destro** (`staffMenu`): Pannello dello stand (F9), Diagnostica, Calibra lo schermo,
  Azzera la calibrazione, Schermo intero ✓, Schermo del gioco ▸, Ricarica il gioco, Rete per i telefoni ▸, Programma ▸
  (Cerca aggiornamenti, Cartella dei file salvati, Cartella dei dati, Scheda grafica, versione), Riavvia il programma ▸
  (conferma), Esci ▸ (conferma). Sulla pagina «Avvio del gioco…» solo i comandi del programma; in un campo di testo
  anche Taglia, Copia, Incolla. Si apre **dove c'è il puntatore** (nessuna coordinata: decide Windows).
- **Canali nuovi con le regole di sempre**: `natpf:command` (programma → pagina, solo i comandi dell'elenco congelato
  `PAGE_COMMANDS`, controllati di nuovo dal preload) e `natpf:notice` (avvisi: file salvato, link negato; solo i campi
  previsti, mai un percorso); tutti e due solo alla finestra del gioco con una pagina del proprio server. Preload
  versione 6 (`commands.onCommand`, `notices.onNotice`). Le cartelle le sceglie il programma per chiave dal menu, mai
  la pagina.
- **Download senza «Salva con nome»** (`will-download`): Download\NATPF, nome ripulito (mai un percorso, niente nomi
  riservati di Windows), «nome (2).csv» invece di sovrascrivere; solo dalla finestra del gioco e da `blob:` del
  proprio server.
- **Gioco bloccato** (`unresponsive`): dopo 10 s la finestra «Il gioco non risponde» (Ricarica il gioco · Aspetta ·
  Chiudi il programma), che si chiude da sola se il gioco torna a rispondere; senza risposta entro 60 s il gioco si
  ricarica da solo.
- **Firewall**: la domanda all'avvio senza risposta entro 60 s vale «Più tardi» (il gioco parte).
- **Monitor ricordato anche trascinando la finestra** in finestra.

### B39.5 · Puntatore e bersagli
`natpf_cursor.js` (vedi la tabella sopra); ❚❚ legato all'altezza dell'area (52–96 px); con il mouse in movimento il
pulsante sotto il puntatore ha l'anello della tastiera. Chiosco: il **movimento del mouse conta** come attività (al più
una volta al secondo); fermo con il telecomando dello staff o la diagnostica aperti; la classifica a schermo intero
lasciata in vista è riposo. La calibrazione dello schermo lasciata aperta il chiosco la annulla ancora (B8).

### B39.6 · Calibrazione con il mouse
Due angoli, frecce dei bordi da trascinare (il bordo si sposta quanto il puntatore), «−» e «+» che ripetono tenendo
premuto (dopo una dozzina di passi a passi da 5 %), pulsanti più grandi, «Schermo intero» nel riquadro, istruzioni anche
per il mouse. Nella prova 1000×1000 in alto a sinistra di 1920×1080: **6 azioni del mouse** (prima circa 110 clic).

### B39.7 · Testi e guide
«Clicca o premi un tasto per iniziare»; nel menu la riga dei tasti si nasconde finché l'ultimo comando è del mouse (un
tasto la rimette); fumetto di ❚❚ con la pressione lunga; installatore (testo finale e firewall) con il tasto destro al
posto di «tasto Alt»; `docs/GUIDA_STAND.md`, `docs/COLLAUDO_WINDOWS.md`, `natpf-desktop/LEGGIMI.md`,
`docs/GUIDA_TELECOMANDO.md`.

## Prove (numeri)

- Unità: gioco 1542 (+17 nuove in `natpf-b39-solo-mouse.test.mjs`, 2 aggiornate in `natpf-telecomando.test.mjs`),
  sito 248, programma 51 (+8 in `test/solo-mouse.test.mjs`, 3 aggiornate), LAN 13 (+1 a porta occupata), build.
- Electron 45.2.2 per Linux in Xvfb (`natpf-desktop/scripts/prova-linux.mjs`, scenari nuovi `solo-mouse` e
  `porta-occupata`): **101/101** con tutti gli scenari (menu del tasto destro al puntatore con le sue voci, Pannello,
  Diagnostica e ritorno al pannello, Calibra, Azzera, Schermo intero, Ricarica, Esci con lo schermo intero che resta,
  tasto «indietro», window.open e link negati, pagina estranea negata, CSV salvato senza finestra e «(2)», pagina
  bloccata con finestra e ricarica da sola, errore non gestito, porta 8443 occupata → finestra e pagina italiane →
  «Riprova» → gioco partito).
- Nel browser: `tools/e2e/natpf-solo-mouse.mjs` **42/42** (percorso dello stand solo con il mouse), `natpf-menu` 45/45,
  `natpf-pannello-partita` 25/25, `natpf-tabellone` 41/41, `natpf-diag-session` 26/26, `natpf-schermo` 41/41,
  `natpf-telecomando` e `natpf-formato-fiera`: vedi `docs/WORK_PROGRESS.md` (verifica finale).
- `npm run audit:legend`: identico alla base.

## Non provato
- **Windows vero**: menu del tasto destro (posizione e misura delle scritte di sistema sul ledwall), finestre di
  Windows sopra lo schermo intero, `netstat`/`tasklist` per il nome del programma che tiene la porta, tasto laterale del
  mouse vero (su Windows passa da WM_APPCOMMAND: la cronologia vuota lo copre, non provato), cartella Download vera,
  domanda del firewall con il tempo, monitor trascinato, cursore grande disegnato da Windows (oltre 32 px), doppio
  clic con il tempo impostato in Windows.
- **Ledwall vero** e processore LED; mouse fisico; telefoni veri; il telecomando dello staff vero.
- La pagina bloccata vera: nella prova l'evento `unresponsive` è simulato (`win.emit`).

## Da decidere (per l'utente)
- **«Musica» / «Audio» salvati?** Oggi tornano «Sì» a ogni avvio; il pannello ora lo dice. Proposta: salvarli (come le
  altre opzioni dello stand) con un avviso all'avvio quando l'audio è spento.
- **«Chi gioca» / livello della CPU ricordati?** Oggi tornano «Adulto» a ogni avvio (non toccato).
- **«Schermo intero» premuto per sbaglio** (A6): nel programma resta salvato; con «Esci» nel menu del tasto destro non
  serve più uscire dallo schermo intero per chiudere, ma il pulsante salva ancora la scelta. Cambiarlo?
- Tasto «indietro» del mouse nel menu come «‹ Indietro» (facoltativo nella proposta): non fatto.
