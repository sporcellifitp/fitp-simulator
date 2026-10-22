# NATPF Simulator · roadmap

Ultimo aggiornamento: 21 ottobre 2026 (branch `claude/friendly-fermat-dwv2w2`, da `feature/natpf-tennis-v2`). Raccoglie in un posto solo lo stato del
gioco di tennis (1v1, telefono come racchetta, webcam, LAN e Cloudflare). I dettagli tecnici restano nei documenti
collegati: [NATPF_TENNIS_MVP.md](NATPF_TENNIS_MVP.md) (storia e architettura),
[NATPF_GESTI_E_LATENZA.md](NATPF_GESTI_E_LATENZA.md) (telefono, gesti, latenza, registrazioni),
[NATPF_EVENTI_E_BACKLOG.md](NATPF_EVENTI_E_BACKLOG.md) (modalità per eventi, registrazione e CMS).

Legenda delle verifiche: **provato** = eseguito e controllato in questo ambiente (test automatici, browser senza
schermo, rianalisi delle registrazioni vere); **solo implementato** = scritto e coerente con i test, ma non provato
con hardware vero (telefono in mano, webcam con una persona, Wi-Fi di un evento).

## 1. Fatto in questo giro

### Racchetta virtuale del 22/10 (documento [NATPF_RACCHETTA_VIRTUALE.md](NATPF_RACCHETTA_VIRTUALE.md))

- Diagnosi della sessione reale (P1–P11): mano diversa tra telefono e gioco, verso del gesto mai misurato dopo
  «Salta», mira satura, colpi a vuoto con la palla lontana, servizio sempre automatico, niente volée, pallonetti
  incerti, caso nel colpo di chi gioca, colpi forti scartati dopo la preparazione.
- Nuovo modello: forma del colpo sul telefono, intenzione sul computer, esito senza caso nel motore; finestra
  d'impatto; movimento con volée, schiacciate al volo e palle fuori lasciate andare; servizio dal gesto; Player 2 del
  1v1 con lo stesso modello; Leggenda ritarata.
- Webcam con un solo soggetto e tremolio senza swing; calibrazione con colpi completi; diagnostica con forma,
  intenzione, esito e ripetibilità; prova guidata con tagliati e palle corte.
- Test automatici e prima/dopo sugli stessi dati superati; **validazione fisica non eseguita** (procedura nel
  documento, §5).

### Quinto giro del 21/10: modalità diagnostica, colpi senza attesa di rete, app nativa (stato in [MEMORY.md](../MEMORY.md) §10)

| Punto | Causa trovata | Correzione | Verifica |
|---|---|---|---|
| Registri che «si fermano dopo circa 30 s» | La registrazione di prima si chiudeva da sola a 60 s e teneva tutto in memoria. Nel simulatore nessuno stop a 30 s. Causa più probabile sul telefono vero (ipotesi): lo schermo che si spegne dopo il tempo impostato, spesso 30 s, quando il blocco dello schermo manca o si perde; la pagina si sospende e i campioni si fermano | Registrazione senza limite, scritta su disco; il telefono comunica pagina visibile e blocco dello schermo, il computer avvisa e il registro lo annota | **provato** nel browser: 150 s continui, pagina del telefono nascosta rilevata e annotata; causa sul telefono vero **da confermare** con la prima sessione |
| Modalità diagnostica | Mancava: niente video, niente eventi del motore, un solo orologio non dichiarato, 60 s in memoria | Registratore su un solo orologio (computer), scrittura progressiva su disco con recupero, parti da 30 minuti nelle registrazioni lunghe, controllo dello spazio, video della webcam e del gioco sincronizzati, metriche, confronto tra sessioni, pacchetto zip con rapporto, prova guidata dei colpi come riferimento ([NATPF_DIAGNOSTICA.md](NATPF_DIAGNOSTICA.md)) | **provato** nel browser con telefono simulato e webcam finta (23/23: sessione di 150 s, registrazione in parti, spazio su disco quasi finito, ricarica a metà con recupero, prova guidata); costo del registratore sul thread del gioco 0,07% del tempo in mediana, al massimo 0,4%; video del gioco spento all'inizio perché pesa (misurato); telefono, webcam e persona veri **non provati** |
| Colpi in ritardo quando la rete perde pacchetti | Il colpo viaggiava solo sul canale ordinato e affidabile: un pacchetto perso fermava tutto fino alla ritrasmissione (via internet p99 153–293 ms, fino a 39 colpi su 150 oltre 50 ms) | Tre copie sul percorso senza ritrasmissioni e una sul canale affidabile; il computer tiene la prima | **provato** con perdita simulata del 3% e dell'8%, LAN e internet: p99 6–15 ms, nessun colpo oltre 50 ms, nessun colpo perso; Wi-Fi vero **non provato** |
| Webcam: riconoscimento dei colpi (passo 0) | Lato giusto solo nel 30% dei colpi completi, più eventi per colpo, eventi già nella preparazione, pallonetti falsi, colpi falsi dai passanti, mano seguita sbagliata | Un evento per colpo dal punto di riposo, colpo anticipato prima dell'impatto (il gioco tiene lo swing fino allo sweet spot), conferma a fine gesto per la diagnostica, mano scelta per continuità ([NATPF_WEBCAM.md](NATPF_WEBCAM.md)) | **provato** sul banco sintetico (16 criteri su 18: lato 99%, un evento per colpo 100%, nessun evento nella preparazione 100%; non rispettati pallonetto voluto, 13%, e tempo degli swing piccoli) e nel motore (PERFECT 89% contro 60%); webcam e persona vere **non provate** |
| CPU Leggenda (terzo livello) | La CPU esperta sbagliava «a dado» e sceglieva i colpi da pochi schemi: contro chi gioca bene non reggeva (giocatore simulato «tennista»: 100% dei game) | CPU con le regole di chi gioca, scelta del colpo per utilità, apprendimento, corsa credibile e affondo, palle fuori lasciate passare ([NATPF_LEGGENDA.md](NATPF_LEGGENDA.md)) | **provato** con il torneo dei giocatori simulati (`npm run audit:legend`, tutti i criteri; casual e pro identici a prima) e nel gioco con la grafica (allungo verso la palla lontana); persone vere **non provate** |
| App nativa e Bluetooth | Valutazione con le misure disponibili | Non ora: l'app guadagnerebbe ~13 ms di riconoscimento (sensori a 100 Hz); il Bluetooth non è più veloce di un Wi-Fi dedicato. Regola per decidere con i dati delle sessioni vere ([NATPF_APP_NATIVA_E_TRASPORTI.md](NATPF_APP_NATIVA_E_TRASPORTI.md)) | misure nel simulatore (riconoscimento a 30/60/100/200 Hz) e con perdita simulata; telefoni veri **non provati** |

### Audit e miglioramenti del 20/10: allenamento, calibrazione, risposta del giocatore, menu (stato in [MEMORY.md](../MEMORY.md) §10)

| Punto | Causa trovata | Correzione | Verifica |
|---|---|---|---|
| Allenamento: telefono e computer non coerenti, giocatore che si muove da solo | Due percorsi separati: il telefono decideva i passi, il computer lanciava una palla rallentata e «armava» il gesto; se il telefono era già ai gesti la palla non partiva, e un gesto fatto prima della palla colpiva quella del gesto dopo | Il computer mostra sempre il passo del telefono (`natpf_cal_view.js`); giocatore fermo, palla ferma dal lato del gesto chiesto; pannello in basso al centro con gesto, freccia e stato (aspetta · ora · riprova · ✓), stesse parole sul telefono; telefono scollegato segnalato | **provato** nel browser con il telefono simulato: 13/13 (5/9 con il codice di prima) e ricollegamento a metà calibrazione 6/6; telefono vero **non provato** |
| Calibrazione con prese, inclinazioni, ampiezze e velocità diverse | Il primo gesto fissava il verso anche se fatto al contrario; con il polso che prona il verso dei gesti successivi si sbagliava (168 combinazioni su 432); dopo la correzione, 623 dritti morbidi letti come palle corte | Verso assoluto dalla rotazione attorno alla verticale (primo gesto al contrario rifatto), rotazione netta durante il gesto, riferimento del piatto dai gesti della calibrazione | **provato** con l'audit `calibration-matrix.mjs`: 864/864 calibrazioni, 10 368 colpi senza colpi persi, lati sbagliati o colpi speciali non voluti; telefono vero **non provato** |
| Risposta del giocatore al gesto | Gesto in anticipo: swing subito e di nuovo all'arrivo della palla (due swing per un gesto); gesto in tempo: la racchetta arrivava all'impatto ~0,1 s dopo la palla; gesto troppo presto: nessun segno | Racchetta che si carica subito dal lato del colpo, swing all'istante del colpo partendo poco prima dell'impatto (anche per il Player 2), swing a vuoto con «Troppo presto», etichetta del gesto sul computer (rilevato → letto → applicato) | **provato** nel browser: un solo swing per gesto, risposta 26–35 ms dopo il picco (9/9), 1v1 18/18 |
| Latenza | Misurata tratto per tratto: rilevatore ~24 ms, rete 1–10 ms, motore < 2 ms; la rete non è il collo di bottiglia | Nessun cambio di trasporto (confronto WebRTC, WebSocket, Bluetooth, sensori più frequenti in [NATPF_GESTI_E_LATENZA.md](NATPF_GESTI_E_LATENZA.md) §8) | **provato** in locale; Wi-Fi vero **non provato** |
| Menu principale e sfarfallio della home | Dietro il menu girava una partita dimostrativa ridisegnata a ogni fotogramma sotto un pannello sfocato, più il campo animato dell'intro | Menu al centro con tutte le voci visibili, frecce come un joypad, descrizione della voce; dietro un fotogramma fermo dell'arena (il gioco non avanza e non ridisegna) | **provato** nel browser a 1366 × 657, 1024 × 600 e 1280 × 720 (22/22, 0 ridisegni in 3 s); scheda video vera **non provata** |
| Audit · fluidità | Fisica a passi fissi interi senza interpolazione: a 60 Hz con fotogrammi irregolari la palla scattava (3 fotogrammi su 25), a 144 Hz restava ferma in 11 su 60; i due QR del companion si rigeneravano a ogni risposta del relay (20 al secondo con il server LAN, ~20% del thread) | Tutto il tempo del fotogramma in passi uguali ≤ 1/120 s, tempo dal rAF; QR solo quando cambia il link; riquadri delle sfide e della lobby 1v1 scritti solo quando cambiano | **provato** (test sul motore, misure nel browser); fluidità su un monitor vero **non provata** |
| Audit · flussi | Riscaldamento di «Sfida un amico» contato come partita 1v1 (falso «Player 2 scollegato», calibrazione ferma); «Torna al menu» che faceva partire la sfida o portava alla pagina Partita; gioco in pausa per il visitatore dopo il reset del chiosco; «Ricalibra» con il pannello chiuso senza conferma; colpi e lanci accettati in pausa; vittoria sopra il menu; moviola che bloccava le sfide | Ogni percorso corretto alla radice e coperto da un test che fallisce con il codice di prima (21 in `natpf-flows.test.mjs`, interfaccia vera sul motore senza disegno) | **provato** |
| Audit · collegamento | Il telefono non si accorgeva della rete persa (restava «collegato», colpi persi); dopo una ripresa la calibrazione sul computer restava indietro; nessuna pausa se il telefono cadeva in partita; errori del solo server di segnalazione che chiudevano un canale sano; blocco dello schermo perso dal secondo ritorno; fase non rimandata a un telefono ricaricato | Silenzio di 5 s → ripresa con la chiave; passo attuale rimandato alla ripresa; pausa con il pannello del telefono e ripresa automatica; colpi arrivati in ritardo ignorati | **provato** nel browser con la rete ferma simulata (`natpf-phone-blackout.mjs`, 3 su 3 fallite prima); Wi-Fi vero **non provato** |

### Richiesta in 6 punti del 19/10

| Punto | Causa trovata | Correzione | Verifica |
|---|---|---|---|
| 1 · Calibrazione del telefono | Tremolii presi per gesti; il rientro della mano al centro diventava il gesto successivo | Quiete prima di ogni gesto, posizione della mano lungo l'asse del colpo, rientro escluso | test con mano simulata **provati**; telefono vero **non provato** |
| 2 · Rovescio lungolinea letto come dritto | Il rovescio morbido veniva trattenuto come preparazione e il rientro diventava il dritto | Il gesto opposto è il colpo solo se veloce almeno l'80%; zona «palla diretta» 0,6 m | test con gesti simulati **provati**; telefono vero **non provato** |
| 3 · Varietà di traiettorie e angoli (anche P2 e CPU) | Ogni colpo passava la rete al minimo (1,25 m); la CPU sceglieva il colpo da un ciclo fisso; l'aria accorciava ogni colpo di ~2 m (le palle «in fondo» cadevano a metà campo) | Altezza sulla rete e top spin da colpo e forza, angolo stretto corto, rimbalzo con l'effetto, 8 schemi della CPU, correzione dell'aria sulla profondità | **provato** con `npm run audit:variety` e `audit:rally` (equilibrio entro pochi punti) e test nel motore; da vedere giocando |
| 4 · 1v1 tra due computer | Nessuna sessione: i colpi del P2 accendevano il 1v1 anche contro la CPU o nel menu; partita forzata a un game (il P2 non serviva mai); il computer del P2 decideva i punti da solo; «In attesa di Challenger» (nomi ignorati dal relay); host mai informato del P2 online (`touch=1`); host bloccato se il P2 esce; P2 orfano dopo un ricaricamento; il P2 non sbagliava mai | Sessione esplicita con l'host unico arbitro; lobby con codice, link e tre passi (stanza · P2 entrato · P2 pronto), «Gioca» solo con il P2 pronto; pausa con spiegazione se il P2 esce, ripresa automatica; pannello del P2 con «Sono pronto» ed «Esci»; stanza chiusa e link inesistente segnalati; durata a scelta; errori e palle alte del P2 come il P1 | **provato** con due sessioni del browser sul sito statico (WebRTC, 18/18) e con il server LAN; 9 test nuovi; due computer veri **non provati** |
| 5 · Grafica del campo | TORINO capovolta per una delle due camere, deformata (6,4 × 1,6 m) e lontana dalla riga | Scritte girate verso chi gioca su ogni computer, proporzioni del file, 2,1 m dietro la riga come nei riferimenti | **provato** con rendering dalle camere di gioco di P1 e P2 |
| 6 · MEMORY.md | — | Memoria di lavoro nella root, aggiornata a ogni attività | — |

### Secondo giro del 19/10 (foto e video della presa vera)

| Punto | Causa trovata | Correzione | Verifica |
|---|---|---|---|
| Pallonetti nei dritti normali | T (verso del piatto) dipende solo dall'asse di rotazione: la pronazione del polso a fine dritto lo porta a ±0,7 come un colpo verso l'alto; tre pallonetti di fila spostavano il riferimento personale | Pallonetto e tagliato veloce solo con la mano che si sposta davvero (accelerometro); mano che sale con decisione = pallonetto anche con il piatto al contrario; riferimenti solo dai colpi normali; palla corta invariata | **provato** con il simulatore della presa vera e nel browser dal QR; telefono vero no |
| Colpi spariti con l'impugnatura cambiata | verso del colpo solo dall'asse della calibrazione, nel riferimento del telefono | verso anche dalla rotazione attorno alla verticale | **provato** (simulatore) |
| Palla sempre nella stessa zona | mira solo dalla rotazione durante il colpo, rispetto alla mediana degli ultimi colpi: polso girato prima ignorato, mira annullata dopo 2–3 colpi | direzione assoluta del piatto all'impatto, centro che segue solo i colpi normali e la deriva, mira continua; tempo del colpo più incisivo | **provato** nel motore e nel browser; telefono vero no |
| Musica sempre uguale | un brano per schermata | 12 brani, gruppi a rotazione, cambio dopo tre giri in dissolvenza | **provato** (test); ascolto reale no |
| Menu | nessun blur; barra delle tappe tagliata; menu fuori schermo a 800 px; classifica e pannello del P2 disallineati | blur 5–6 px, barra compatta, menu compatto, larghezze allineate | **provato** con schermate a 4 risoluzioni |
| Sedia dell'arbitro | scaletta bianca generica, poi «A» a 7,4 m sul lato sinistro | grande «A» blu verso il campo, a destra a 10 m dal centro (3,6 m oltre il paletto), scaletta sul fianco, panchine a ±4 m, telecamere sul lato opposto | **provato** con rendering e test |

### Pallonetto e palla corta (le «palle alte» e le «palle corte»)

| Causa trovata | Correzione | Verifica |
|---|---|---|
| Il pallonetto del motore volava 1,32 s: saliva a 2,5 m e, senza compensare l'aria, cadeva a −7,3 m (metà campo). Non sembrava un pallonetto | Volo di 2 s con compensazione dell'aria: sale a ~6 m e cade in fondo (−10 m); non accelera con lo scambio | **provato**: simulazione con la fisica del motore (test) |
| La CPU non rispondeva mai sopra 2,05 m | Risponde al pallonetto fino a 3,1 m | solo implementato (partita vera da guardare) |
| Lo swing anticipato aspettava solo le palle sotto 2,35 m: sulle palle alte il colpo spariva | Attesa fino a 3,4 m, sopra 1,78 m schiacciata | **provato** nel giro precedente con le registrazioni (colpi senza esito) |
| Il verso verticale del colpo si leggeva dall'accelerometro durante il colpo, che con la presa a manico misura soprattutto la forza centripeta (rumoroso) | Nuovo segnale dal giroscopio e dall'orientamento: di quanto il piatto che colpisce sale o scende mentre ruota; i colpi normali stanno vicino a 0 | **provato** sulle 4 registrazioni vere: distribuzione plausibile (2–3 palle corte e 2–3 pallonetti su ~25 colpi) |
| La palla corta richiedeva anche l'apertura del piatto misurata, che sul campo non è affidabile | Palla corta = gesto dall'alto verso il basso e morbido | **provato** (test) |
| Soglie uguali per tutti, tarate alla cieca | Due esercizi nel riscaldamento («Pallonetto», «Palla corta») registrano i gesti di chi gioca e fissano soglie personali (azzerabili dalle Opzioni) | soglie **provate** (test); esercizi **solo implementati** |
| Il gioco non diceva quale colpo era uscito | Nome del colpo speciale nel messaggio dell'esito | **provato** (test) |

### Percorso di gioco da console

| Tappa | Cosa c'è | Verifica |
|---|---|---|
| Intro | ESPORTS FITP «presenta», Nitto ATP Finals, titolo con la palla, «Premi un tasto»; saltabile; breve se già vista nella sessione; `?intro=0` per le prove | **provato** nel browser (fotogrammi) |
| Menu principale | Al centro, tutte le voci senza scorrere: Gioca · Allenamento · Sfide, poi Classifica · Come si gioca · Opzioni; frecce come un joypad, Invio, Esc, descrizione della voce; dietro un fotogramma fermo dell'arena (niente partita dimostrativa) | **provato** nel browser a tre risoluzioni |
| Modalità | Contro la CPU · Sfida un amico, con caratteristiche e racchette richieste; decide gli avversari della pagina partita | **provato** nel browser |
| Racchetta e collegamento | Smartphone (QR), webcam o (prova) mouse e tastiera; si entra in campo da soli quando è pronto | **provato** con mouse e tastiera nel browser; QR con telefono simulato nel test LAN |
| Riscaldamento / allenamento | Campo d'allenamento (tribune vuote), calibrazione guidata dal telefono (il computer mostra lo stesso passo), dritto, rovescio, pallonetto, palla corta, servizio, angoli; dall'Allenamento si torna al menu con il risultato | **provato** con mouse e tastiera e con il telefono simulato nel browser; telefono vero **non provato** |
| Partita | Livello CPU o invito dell'amico, durata, visuale; fascia di passaggio al campo | **provato** nel browser |
| Pausa e fine | Pausa (Esc), «Torna al menu»; schermata finale con «Gioca ancora» e «Menu», che riportano al menu principale con la dimostrazione | **provato** nel browser |

### Loghi e arena

- Arena ricomposta sulle immagini di riferimento: muro continuo attorno al fuori campo con i loghi stampati (lati
  lunghi: logo impilato e ESPORTS alternati; fondo: logo orizzontale e ESPORTS), pannelli LED negli angoli, bordo
  luminoso blu sul muro e sul parapetto delle tribune, varco con tre operatori TV sul lato opposto all'arbitro, sedia ad
  «A» con l'arbitro e le due panchine, raccattapalle sul fondo, cubo più grande e più basso, fari con alone, stendardi
  con la coppa, fuori campo più chiaro attorno al campo. Logo ufficiale Nitto ATP Finals al posto di eSeries
  (interfaccia e arena). **provato** con inquadrature fisse simili a quelle dei riferimenti; personaggi e pubblico
  restano stilizzati (blocchi), non le figure dettagliate delle immagini.

- Loghi ufficiali (vettoriali ESPORTS FITP e logo orizzontale Nitto ATP Finals; versione impilata composta con i
  blocchi del logo ufficiale) convertiti ad alta risoluzione con
  trasparenza (`site/assets/brand/`) e usati in intro, menu e passaggio al campo. **provato**
- Tutte le grafiche dei loghi nell'arena rigenerate dai file ufficiali con le proporzioni dei pannelli 3D
  (`natpf-tennis/scripts/brand/brand-assets.py`): tabelloni, pannelli LED, fascia, maxischermo, stendardi, rete. **provato** (inquadrature fisse)
- Rete: prima piano a doppia faccia (dall'altra metà campo la scritta era al contrario) e logo deformato; ora un
  piano per lato, proporzioni del file. **provato** dai due lati
- Anisotropia massima della scheda video sulle texture dei loghi (prima 8). **solo implementato** (dipende dalla
  scheda video; nel browser di prova la grafica è software)

## 2. Problemi risolti nei giri precedenti (ottobre 2026)

Telefono: latenza di riconoscimento 30–67 → 17–42 ms, mira ricentrata sui propri colpi, niente tagliati e pallonetti
non voluti, forza non più sempre al massimo, preparazioni lente che non diventano colpi, diagnostica con
registrazione (`Maiusc+D`). Campo d'allenamento con pannello di lato. Pacchetto LAN per Windows con Node portatile,
certificato e firewall. Dettagli in [NATPF_GESTI_E_LATENZA.md](NATPF_GESTI_E_LATENZA.md).

## 3. Aperto, in ordine di priorità

0. **Validazione fisica della racchetta virtuale**: procedura in [NATPF_RACCHETTA_VIRTUALE.md](NATPF_RACCHETTA_VIRTUALE.md)
   §5 (telefono Android e iPhone, webcam, più persone); poi tarare le soglie del §4.3 con i pacchetti registrati.
1. **Prova guidata dei colpi con il telefono vero** (menu → Maiusc+D → «▶ Prova guidata», circa 5 minuti, con il
   video della webcam): dritti, rovesci, pallonetti, incrociati e lungolinea richiesti dal lanciapalle. Dà il
   riferimento per lato, tipo e direzione, la frequenza vera dei sensori, i tempi e la causa dei registri che si
   fermavano. Poi `node scripts/diag/diag.mjs colpi sessione.zip` e `replay-recording.mjs sessione.zip` per tarare
   `GESTURE.lobMove` e `AIM` (oggi tarati sul simulatore della presa vera). Palle corte e dritti girando il polso
   restano da registrare a parte, con un segno (Maiusc+M) per ogni gesto.
1b. **Prova con persone vere della nuova lettura dei colpi** (pallonetto, palla corta, tagliato) e degli esercizi
   del riscaldamento; una registrazione con una sequenza dichiarata (es. 5 dritti, 5 rovesci, 3 pallonetti, 3 palle
   corte) per tarare soglie e segno del nuovo segnale. Il segno «palmo nel dritto, dorso nel rovescio» viene dalla
   fisica della presa e va confermato.
1c. **Palla corta con prese diverse** (audit del 20/10, simulatore): riconosciuta in 277 gesti su 864; 154/288 con
   lo schermo verso di sé, 107/288 con lo schermo girato di 45°, 16/288 girato di lato, meno se chi gioca prona molto
   nei dritti (il riferimento del piatto viene dai propri colpi). Il segnale usa il dorso del telefono: con lo schermo
   di lato il gesto verso il basso non lo muove. Colpi normali mai letti come palle corte. Da decidere con la
   registrazione vera se cambiare segnale (spostamento della mano) o indicare la presa.
2. **Direzione (mira)**: tarare con la stessa registrazione dichiarata; oggi la mira è ricentrata sui propri colpi e
   nei gesti molto ampi decide il tempo del colpo.
2a. **Webcam con una persona vera** ([NATPF_WEBCAM.md](NATPF_WEBCAM.md), ultima sezione): prova guidata con la
   diagnostica; poi pallonetto dalla webcam (oggi 13% nel simulatore) e swing piccoli o lenti che arrivano tardi.
2b. **CPU Leggenda con persone vere** ([NATPF_LEGGENDA.md](NATPF_LEGGENDA.md), «Da provare con persone vere»): game
   vinti da principianti, giocatori di club e tennisti; se la CPU sembra prevedibile o «telepatica»; se le palle
   lasciate passare sembravano buone; affondi e colpi di chiusura credibili; divario con telefono e webcam.
3. **Modalità per eventi** ([NATPF_EVENTI_E_BACKLOG.md](NATPF_EVENTI_E_BACKLOG.md) §3): sfide (Radar, Bersagli 60",
   Scambio infinito, Sfida il campione), nickname, classifica del giorno, chiosco e pannello dell'addetto sono
   implementati (commit 45de50b); da provare a uno stand con il pubblico.
4. **Registrazione dei visitatori e CMS del modulo** (stesso documento, §4): Cloudflare Pages Functions + D1.
4b. **Scheda video**: audit del 20/10 senza misure su hardware vero: 199 chiamate di disegno e 4,3 M vertici per
   fotogramma (pubblico non indicizzato e disegnato anche fuori campo), ombre di ogni pezzo dei personaggi, risoluzione
   fino a 2×. Misurare i fotogrammi al secondo su un portatile vero prima di ridurre la qualità.
5. **1v1 con due persone vere** su due computer e su reti diverse (Wi-Fi di un evento, NAT): la prova a due
   sessioni usa giocatori automatici sullo stesso computer. Server TURN per le reti che bloccano WebRTC.
5b. **1v1: telefono del Player 2 che cade**: oggi si ferma solo il computer del P2, non la partita dell'host.
6. **Ritardo di rete del P2 nel 1v1**: si compensa solo il tempo nel relay e solo per il telefono; il tragitto
   P2 → host non è misurato.
7. **Torino** sul campo: la scritta resta quella ricavata dalle foto (non c'è un file ufficiale).
8. Opzione B 2v2: solo su richiesta.
9. Scambi lunghissimi tra due giocatori automatici perfetti nel 1v1 (84 colpi nella prova): con persone vere da
   osservare, nel 1v1 non c'è la CPU che sbaglia.

## 4. Verifiche non possibili in questo ambiente

- Telefoni veri (Android/Chrome, iPhone/Safari): sensori, vibrazioni, nuova lettura dei colpi, esercizi speciali.
- Collegamento completo del telefono simulato nel test LAN (`npm run test:e2e-lan`): nel contenitore di prova la
  connessione WebRTC verso l'indirizzo di rete non si chiude. Superate 7 verifiche su 8: server LAN in HTTPS, gioco
  offline, QR con l'indirizzo di rete e la pagina del telefono, trasporto LAN diretto, nessuna richiesta esterna,
  nessun errore nelle pagine. La catena gesto → colpo è provata dai test con il telefono simulato (LAN e internet).
- Webcam con una persona vera.
- Wi-Fi di un evento, secondo computer reale per il 1v1 (provato con due sessioni del browser sullo stesso computer).
- Cadute vere della rete del telefono (Wi-Fi spento, schermo spento, passaggio a un'altra rete): provate solo con la
  rete ferma simulata nelle pagine del browser.
- Fluidità e sfarfallio su una scheda video vera e su monitor a 120–144 Hz.
- Resa dei loghi su una scheda video vera (anisotropia, mipmap) e su schermi grandi.
- Audio dell'intro e del menu (il browser di prova non ha uscita audio).
