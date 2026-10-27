# SESSION_HANDOFF · NATPF Simulator, giro «racchetta virtuale» (dal 22/10/2026)

## Ripresa del 27/10/2026 — leggere prima dello storico

- Branch unico: `claude/friendly-fermat-dwv2w2`. Base recuperata e pubblicata dall'utente: **`76b4657`**, figlio di
  `2c7ede1` (WIP mira e profondità). Le modifiche locali Cline sono state esportate, ricostruite e confrontate con i
  tre blob del commit: coincidono. Nessun lavoro di quel diff è da ricreare a memoria.
- L'utente ha chiesto di proseguire l'implementazione e conservare checkpoint durevoli per il prossimo agente.
  Il passaggio di consegne resta nel repository: questa sezione, `MEMORY.md` e `WORKLOG.md`.
- Nel WIP: `OUTCOME.faceAim .6`, nuova curva della profondità `.7`, `shortPerQ 1.8`, soglie del piatto 5°/25° e
  `createAimModel.seed()`. Il collegamento mancante è ora completato (blocco 1, sotto).
- Baseline riprodotta su Node 24.22.1: gioco **370 test: 365 passati, 4 falliti, 1 saltato**; sito **148/148**.
  Tre fallimenti riguardano i cambiamenti WIP di mira/profondità; uno usa il flag non accettato
  `--experimental-default-type=module`. Il minimo della profondità FLAT salito a 6,6 m viola la verifica esistente
  di accesso alla riga del servizio: preservare i colpi morbidi mentre si aumenta la profondità tipica.
- **Blocco 1 completato e verificato automaticamente:**
  - `faceReference()` conserva `faceRef[dir].heading` dal `face.abs` dello swing, con mediana circolare;
    `calibration.js` lo porta nel profilo; `_onCal(done)` inizializza entrambi i versi del modello sul computer.
  - Invertire la calibrazione scambia anche `faceRef` e `heads` (prima restavano nel verso precedente).
    «Salta», profili vecchi o parziali e ricalibrazione non riusano heading mancanti o precedenti.
  - Un nuovo collegamento azzera il riferimento del frame precedente: senza nuova calibrazione il centro si impara
    dai colpi, come per i profili vecchi. Non è ancora implementata una risincronizzazione del profilo a frame noto.
  - I primi colpi mirati non sono più assorbiti dal centro: l'adattamento iniziale rapido vale solo entro `settle`.
  - FLAT resta raggiungibile dalla riga del servizio (minimo 6,4 m); mantenuti curva `.7` e piatto `.6` del WIP.
  - Il controllo di sintassi usa stdin ESM (`--input-type=module --check`), compatibile con Node 24.
  - Prove: gioco **377/377, nessun test saltato** (installate anche le dipendenze LAN); sito **148/148**;
    **build di produzione riuscita**. Nuovi test sul primo colpo reale per P1/P2 e mani destra/sinistra, heading
    circolare, inversione e cinque colpi mirati ripetuti. Suite mirata riprodotta anche sul WIP precedente per
    verificare che rilevi i difetti. I test dei telefoni precedenti restano separati e attivi.
- Dopo: verifiche del campo aperto e della catena telefono; webcam a distanza e tutorial. Ispezionare prima le
  implementazioni esistenti. Le prove fisiche con Android e webcam del portatile restano da fare sul PC dell'utente.
- **Blocco 2 completato e verificato automaticamente (base del blocco 1: `ba8b455`):**
  - `webcam_pose_strokes.js`: polso anatomico destro/sinistro con visibilità minima, scala del busto, acquisizione
    stabile e continuità di posizione/taglia. Si sottrae lo spostamento del busto: camminare non è uno swing.
    Un busto che salta altrove e un polso lontano dalla mano già seguita sono rifiutati.
  - `NatpfBodyFollow` esegue Pose anche con movimento automatico; il movimento resta indipendente. Pose e Hands
    condividono lo slot di inferenza. Pose lavora al massimo ogni 80 ms; durante il fallback Hands verifica le dita
    ogni 500 ms. I risultati vecchi sono scartati, il campione è consumato una volta sola.
  - `MotionController`: campioni Pose alla stessa macchina dei colpi, sorgente e tempo d'inferenza nel registro,
    Pose valido considerato dalla pausa/ripresa e ritorno a Hands senza colpi fantasma. Cambio mano azzera la traccia.
    Preparazione webcam e istruzioni di pausa nominano anche il braccio, senza chiedere la mano vicino alla camera.
  - Prove: gioco **385/385**, sito **148/148**, build riuscita. Otto test nuovi, compreso un gesto di 240 ms
    campionato a 12,5 Hz attraverso il controller vero (un solo colpo), movimento del busto senza colpi,
    continuità, lateralità, scheduler e salute webcam.
  - Limiti da verificare fisicamente: prestazioni sul Lenovo E14 a 2–3 m, jitter/occlusioni reali e soggetti di taglia
    simile sovrapposti. Pose fornisce il polso, non l'orientamento fine delle dita; non promettere equivalenza ai sensori.
- **Prossimo passo concreto:** tutorial. `drillAfterShot()` accetta ancora qualunque palla in campo nell'esercizio
  «Angoli». Separare e verificare incrociato/lungolinea dall'esito, aggiungere tagliato/schiacciata con lanci adeguati
  e rendere esplicita la stessa impugnatura fra calibrazione e partita.
- **E2E non eseguiti:** il download Chromium di Playwright restituisce archivi vuoti. È stato estratto un Chromium
  153 alternativo, ma termina in SIGSEGV prima di aprire pagine (anche smoke test `about:blank` senza GPU).
  Non è una verifica del gioco e non va contata come un test passato. Riprovare su ambiente con Chromium funzionante.

Questa sezione descrive lo stato del 27/10; le sezioni successive sono lo storico delle consegne del 22–23/10.

Stato persistente del lavoro: da leggere all'inizio di ogni sessione e aggiornare a ogni checkpoint. La memoria
generale del progetto resta `MEMORY.md`; la cronologia delle decisioni è in `WORKLOG.md`.

## Sera del 23/10: segnalazioni di gioco e sfida online

Due richieste dopo la consegna del giorno: (1) la sfida online sul sito pubblicato «non va», la calibrazione del
Player 2 non usa il campo d'allenamento, la lobby 1v1 online va resa più semplice; (2) sei punti di gioco (colpi a rete,
fine del punto, moviola, pallonetto e palla corta, figura dell'impugnatura, corsa dopo il servizio).

- Documento: **`docs/NATPF_SEGNALAZIONI_2026-10-23_SERA.md`** (cause, correzioni, verifiche §9, prova fisica §10).
- Commit:
  - `4699a2e` Player 2 in campo;
  - `186d898` risposta al servizio;
  - `9ab1c7f` fine del punto;
  - `d5a4333` moviola;
  - `8fe6f27` a rete;
  - `3f84f1a` pallonetto e palla corta, `da5d1b0` palla corta in partita (il «8 su 8» di `3f84f1a` non si riproduceva);
  - `d216f73` impugnatura;
  - `dbc41b4` e `4b6ec72` sfida online (diagnosi del collegamento e lobby);
  - `f0e5abb` prova LAN della sfida aggiornata.
- Tutto provato in automatico (test, banchi, gioco vero nel browser con il telefono simulato); **prova fisica non
  eseguita**.
- Consegna: pacchetti dal commit `21dc579`, build `2026-10-23.3`: `natpf-simulator-cloudflare-20261023-3.zip` e
  `natpf-simulator-lan-windows-20261023-3.zip`, provati estratti (§9 del documento).
- **Decisione aperta** (chiesta alla persona): un relay perché la sfida online funzioni su ogni rete (TURN con Worker,
  relay della partita su Worker, oppure niente relay), §8.4 del documento. Senza, il gioco ora dice quando è la rete a
  bloccare il collegamento diretto e cosa provare.
- Prove nel browser nuove o estese: `tools/e2e/natpf-gameplay-23-10.mjs` (risposta, fine del punto, moviola, rete),
  `tools/e2e/natpf-gesti-speciali.mjs` (braccio simulato nella pagina), `tools/e2e/natpf-1v1-p2p.mjs` (invito subito,
  ingresso con il codice, rete che blocca il canale).

## Giro del 23/10: affidabilità dei due ingressi, impugnatura di taglio, campo aperto, ritmo

Richiesta del 23/10 (partita in LAN con il telefono Android, registro e video allegati): diagnosi dell'intera catena
(telefono e webcam), impugnatura di taglio, riconoscimento dello swing, campo aperto, ritmo arcade, schermo e
collegamento Android, prestazioni e continuità della webcam, diagnostica completa, verifica confrontabile. Ordine:
analisi → misura → affidabilità dei due ingressi → campo aperto ed equilibrio → verifica e prova reale.

- Documento di lavoro: **`docs/NATPF_DIAGNOSI_2026-10-23.md`** (materiale, misure, problemi T1–T7, C1–C5, A1–A4, R1–R3,
  piano e stato). Lì c'è la tabella dei passi con lo stato aggiornato.
- Materiale **mancante**, chiesto alla persona: video dell'impugnatura desiderata; `telefono-sensori.jsonl` della
  sessione `20261023-080003-5tag` (per far ripassare i gesti nel rilevatore). Gli allegati ricevuti non sono nel
  repository (il video contiene la persona).
- Passi: 1 diagnosi [x] · 2 misura [x per telefono, collegamento, gioco; la webcam con il passo 3c] · 3a telefono [x] ·
  3b Android [x] · 3c webcam [x] · 4 campo aperto e ritmo [C3–C5 x; C1–C2 a Casual, il resto da decidere con la prova
  fisica: `?ritmo=colmo|prima`] · 5 verifica, prova guidata, pacchetti [x]. Tutto è provato in automatico; la prova
  fisica (telefono vero, webcam del portatile) è da fare con **`docs/NATPF_PROVA_GUIDATA_2026-10-23.md`**.
- Consegna (passo 5): pacchetti dal commit `90c4bc1`, build `2026-10-23.2` (la versione nella diagnostica di ogni
  sessione): `natpf-simulator-cloudflare-20261023-2.zip` e `natpf-simulator-lan-windows-20261023-2.zip`, provati estratti.
  I commit dopo `90c4bc1` toccano solo banchi e documenti.
- Punti aperti per la prova fisica: ritmo a Leggenda (`?ritmo=colmo` contro l'indirizzo normale); costo vero del modello
  delle mani sul portatile (`?webcamLivello=`); la palla profonda a Pro costa poco in errori alla CPU (banco `-- --cpu`);
  quando Android sospende sensori e pagina; T5 (gesti non mandati) e verticale o in avanti del lato lungo nella presa di
  taglio, che chiedono i campioni grezzi e il video dell'impugnatura.
- Webcam: livello del modello imposto con `?webcamLivello=piena|leggera|minima` (confronto sullo stesso computer con
  due sessioni della diagnostica). La prova LAN nel browser con la webcam (`natpf-tennis/test/e2e/lan-e2e.mjs`,
  `ONLY=webcam`) qui non finisce in 240 s né con il codice nuovo né con quello di prima: il gioco disegna a 1–3 fps con
  la grafica software. La catena della webcam la prova `tools/e2e/natpf-webcam-pipeline.mjs` (senza disegno).
- Prove nel browser con il telefono simulato: il telefono manda i sensori di continuo come uno vero (`__hold`, fermo
  tra un gesto e l'altro). Senza, il computer vede «sensori fermi» e mette in pausa: è il comportamento voluto.

## Obiettivo (richiesta del 22/10)

Il telefono come racchetta virtuale: il gesto fisico è l'input del gameplay. Direzione, potenza, altezza e traiettoria
vengono dal gesto in modo comprensibile, con assistenza arcade (riferimenti: i giochi di tennis da console con il
controller di movimento indicati nella richiesta) e
senza caso (gesti simili danno risultati simili).

Fasi della richiesta:
1. diagnosi dallo ZIP;
2. telefono come racchetta;
3. lateralità e calibrazione;
4. webcam con un solo soggetto;
5. riconoscimento e finestra d'impatto;
6. colpi al volo e smash;
7. traiettorie libere e assistenza;
8. fisica e avversario;
9. diagnostica e 14 test obbligatori;
10. checkpoint.

Vincoli: tenere 1 contro 1, il collegamento del telefono e le integrazioni valide. Niente 2 contro 2. Niente mouse o
tastiera come controlli nuovi.

## Stato corrente

- **Branch unico: `claude/friendly-fermat-dwv2w2`** (mai `main`). Il 22/10 vi è stato unito, con un merge, il branch
  della seconda sessione `claude/determined-tesla-8dgaks` (ultimo commit `c5b9337`), che aveva rifatto i passi 10–12
  in parallelo partendo da `84ca878`. Da qui in avanti si lavora solo su questo branch; chi avesse commit nuovi
  sull'altro li porta qui con un merge (mai reset né force push). Prima di questo giro il branch era al commit
  `bfd629c`.
- **Fase 1 (diagnosi) finita.** È in `docs/NATPF_RACCHETTA_VIRTUALE.md` §2, problemi P1–P11 con evidenze marcate
  [dati], [codice], [ipotesi] e [insufficiente].
- **Passi 1–14 fatti** (codice e test automatici). **Passo 16 fatto nella fase B del passo 17** (difetti 5 e 7
  risolti, difetto 6 non riprodotto, presa del 19/10 verificata e corretta per chi salta la calibrazione, diagnostica
  con una sola registrazione). **Passo 17** (gameplay come il gioco di riferimento): fasi A–E fatte nel codice e nelle prove automatiche.
  **Validazione fisica non fatta** (passo 15): in questo ambiente non ci sono telefono, webcam né persone; procedura
  in `docs/NATPF_RACCHETTA_VIRTUALE.md` §5.
- Dopo il checkpoint 10 (22/10, notte) il branch contiene anche l'ultimo commit della seconda sessione (`40d58b2`):
  salita abituale dalla calibrazione per la presa del 19/10 (da verificare nel browser, passo 16), telefono simulato
  con la forma, prova nel browser della presa del 19/10 a parte (`tools/e2e/natpf-phone-upright-19-10.mjs`). Node:
  `npm test` 279/279, `tools/test` 135/135.
- Prove sul branch unito (22/10, sera):
  - Node: `npm test` 276/276, `tools/test` 135/135;
  - nel browser, gioco: telefono 10/10, allenamento 13/13, risposta al gesto 9/9, ricollegamento 6/6, rete che cade
    6/6, menu 22/22, 1v1 18/18, diagnostica 24/24, LAN 7/8 (il limite noto del contenitore);
  - CI della pagina storica: telefono 10/10, grafica 9/9, pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4;
    **«gesture and calibration» e «timing-browser» falliscono** (difetto 6);
  - fuori dalla CI: `phone-cal.mjs` (una partita intera col telefono) fallisce (difetto 7).

## Per chi riprende: fatto, non fatto, da fare

Fatto (codice e test automatici con sensori e mani simulati; nessuna prova con dispositivi veri):
- diagnosi dello ZIP reale (P1–P11) e prima/dopo sugli stessi dati (campioni del telefono: verso del gesto 0/40 →
  47/55, 13 colpi forti recuperati; scene della webcam con più persone: colpi fantasma 6 → 1);
- telefono come racchetta: mano unica tra gioco e telefono, verso del gesto dalla gravità anche senza calibrazione,
  forma del colpo (piano, salita della testa, manico), intenzione dal gesto ed esito senza caso, con assistenza per
  livello;
- finestra d'impatto, volée e schiacciate al volo, palle fuori lasciate andare, servizio dal gesto, Player 2 del 1v1
  con lo stesso modello, Leggenda ritarata, scambi che finiscono;
- calibrazione con due gesti facoltativi e passo «fermo» tollerante (circa 4,5 s, anche con un tremolio di 25 °/s),
  colpi completi con l'apertura lenta, «Salta» con il gioco completo anche durante il passo «fermo»;
- webcam con un solo soggetto (le altre mani si ricordano, la mano di chi gioca si riprende per taglia);
- diagnostica con forma, intenzione ed esito dei colpi, ripetibilità, prova guidata con tagliati e palle corte;
- 14 test obbligatori (tabella in `docs/NATPF_RACCHETTA_VIRTUALE.md` §3).

Fatto nella fase B del passo 17 (22/10 notte; codice e test automatici, nessuna prova con dispositivi veri):
- difetto 5, swing corti: forza dal picco vero dei campioni grezzi, riferimento grezzo dalla calibrazione;
- diagnostica: l'esito della racchetta è registrato una volta sola (evento `racchetta`), la variazione tra colpi
  uguali solo in `ripetibilita` (dai gesti o, senza, dagli esiti);
- difetto 7 (`phone-cal.mjs`): cause nella prova, corrette; partita intera 17/17;
- presa del 19/10: verificata con le tre prove nel browser; salita abituale imparata giocando per chi salta la
  calibrazione;
- difetto 6: non riprodotto (20/20 a macchina scarica).

Non fatto o aperto:
- **validazione fisica** (passo 15);
- presa del 19/10 con una calibrazione fatta senza la pronazione usata poi in partita: tagliati finché non si
  ricalibra (difetto 2);
- le prove degli inviti della pagina storica (`tools/e2e/invite.mjs`, `invite-timing.mjs`, fuori dalla CI) sono ferme dal 15/10: cliccano la scelta dei comandi (`#ctrlMouse`, `#ctrlPhone`), tolta quel giorno con i comandi solo dal telefono (`ca4548a`, `23e6cac`); vanno riscritte con un telefono simulato anche per chi invita;
- il video di riferimento pubblico indicato nella richiesta non si scarica da qui (solo titolo e quattro immagini).

Fatto nella fase C del passo 17: campo aperto continuo e movimento automatico contestuale (vedi il passo 17).

Fatto nelle fasi D ed E: verifiche nel browser di sincronia, animazioni, recupero e continuità (prova nuova dello
scambio vero), regola di marchio nei documenti e nel codice, procedura di validazione fisica del campo aperto.

Da fare, in ordine: la validazione fisica (§5 del documento, punti 1–14), la taratura delle soglie con i pacchetti
della diagnostica e l'equilibrio della CPU con le partite vere.

## Unione dei due branch (22/10): cosa si è tenuto

- **Webcam**: la versione della seconda sessione (`trackOthers`, ripresa della mano di chi gioca per taglia per
  `HAND_KEEP` = 5 s). Con le prove di entrambe le sessioni fa 54 scenari giusti su 55, quella della prima 49 su 55: la
  prima perdeva colpi veri dopo una perdita breve della mano (4 rovesci dopo una perdita durante il ritorno, 2 dritti
  subito dopo una perdita lunga). Tolta la «mano ferma dopo la ripresa» della prima. Limite: una mano nuova della
  stessa taglia che entra mentre quella di chi gioca è persa viene presa e il suo swing conta.
- **Calibrazione**: due gesti e passo «fermo» tollerante (seconda) insieme ai colpi completi con l'apertura lenta
  (prima; il suo test ora segue `QUICK_PLAN`).
- **Calibrazione in campo**: palla appena oltre il punto d'impatto, il colpo parte nello stesso istante del gesto
  (prima), e la palla resta finché il colpo parte e vola almeno `CAL_SPOT.seen` (seconda). Il test della seconda ora
  guarda il colpo per tutto l'intervallo invece che in un solo istante.
- **Diagnostica**: campi `forma` e `intenzione` di `tel.colpo` nel formato con i nomi (seconda), letti anche da metriche
  e visore della prima; esercizi della prova guidata nell'ordine della seconda (i doppioni tolti).
- **Collegamento e «Salta»**: correzione dell'evento `hand` in `link.js` e «Salta» durante il passo «fermo» (seconda).

## Diagnosi in breve (dettagli nel documento)

- **P1 Mano**: il telefono era impostato da mancino, il gioco da destro, e nessuno sincronizza le due impostazioni. Dai
  dati non si sa quale mano usasse chi giocava: il confronto tra lato della palla e verso del gesto non la distingue.
- **P2 Verso**: dopo «Salta» della calibrazione il verso del gesto era sempre 0, e il lato veniva dalla palla. Il
  verso si può misurare dalla gravità senza calibrazione: netto in 35 colpi su 54.
- **P3 Mira**: veniva dalla rotazione del telefono senza centro per lato, ed era satura (|mira| ≥ 0,8 in 22 colpi su
  54). La deriva del giroscopio tolta era sbagliata: [3,4; 6,8; 4,4] °/s contro circa [0,5] reali.
- **P4 Colpi a vuoto**: la finestra d'attesa era di 0,16 s a Esperto e Leggenda; poteva anche partire un impatto con
  la palla fino a 4,85 m.
- **P5 Servizio**: sempre «POWER SERVE», con posizione casuale e senza falli.
- **P6 Volée**: impossibili; chi gioca aspetta sempre 2,15 m dietro il rimbalzo.
- **P7 Pallonetti**: decisi anche con confidenza bassa.
- **P8 Caso**: dispersione, profondità ed errori del colpo di chi gioca sono casuali.
- **P9 Calibrazione**: «Salta» lascia il gioco senza verso, e la deriva del giroscopio si calcola con il telefono che
  si muove in mano. Il passo «fermo» funziona: passa quando il telefono si ferma davvero.
- **P10 Webcam**: nessun dato utile nello ZIP.
- **P11 Preparazione giocata come colpo**: rigiocando i campioni grezzi, 13 colpi forti (900–1874 °/s) erano scartati
  dal telefono perché arrivavano subito dopo la preparazione lenta, che il gioco ha giocato al loro posto. Spiega 3
  dei 6 colpi a vuoto «troppo presto».
- **Funzionano**: collegamento e prestazioni (59,9 Hz, 31,8 + 6,7 ms, 60 fps).

## Difetti verificati il 22/10 (dopo il passo 14) e stato dopo l'unione

Trovati confrontando il lavoro delle due sessioni e verificati qui; stato misurato sul branch unito.

1. **Pagina storica `site/tennis`, evento `hand`** (regressione del passo 1, `78ea315`): `emit` andava in errore su un
   evento senza ascoltatori. **Risolto con l'unione** (correzione della seconda sessione in `link.js`). La prova della
   CI «gesture and calibration» passava 18/18 a `bfd629c`, si fermava al servizio sul branch della prima sessione
   (2 prove su 2); sul branch unito l'errore non c'è più, ma la prova si ferma
   più avanti per il difetto 6.
2. **Presa del video del 19/10: verificato e corretto per chi salta la calibrazione (fase B, 22/10 notte).** Sul branch
   unito: prova del telefono coerente (`natpf-phone-upright-19-10.mjs`, calibrazione e partita con la stessa
   pronazione) 10/10 con salita abituale −0,28; prova attuale con la racchetta simulata 10/10; prova di `84ca878` 7/10,
   usata come riferimento diagnostico. Le sue tre verifiche fallite: (a) calibra senza pronazione e gioca con la
   pronazione, quindi salita abituale 0 e dritti con la testa che scende di 0,27–0,40 letti come tagliati; (b) il suo
   «pallonetto» inclina in avanti la cima del telefono, che per la racchetta virtuale è la testa che scende (−0,42): non
   è un pallonetto; (c) il piatto sposta la palla di 1,2 m con ±25°, la prova chiedeva 1,5 m (tarata quando il piatto
   valeva 3,9 m; per progetto pesa meno del tempo). Corretto il caso (a) quando la calibrazione manca: salita abituale
   imparata giocando (`createRiseModel` in `natpf_phone_racket.js`, mediana degli ultimi colpi per verso, da tre colpi,
   pallonetti e schiacciate esclusi); test nuovo in `natpf-racchetta.test.mjs` (18 combinazioni di inclinazione, polso
   e lato: dal quarto colpo dritti e rovesci normali). Resta: chi calibra senza pronazione e gioca con la pronazione vede
   tagliati finché non ricalibra con il proprio colpo.
3. **Calibrazione entro 10 s con il tremolio (criterio di P9): risolto con l'unione** (due gesti, passo «fermo» sulla
   mediana). Con un tremolio di 25 °/s il passo «fermo» dura 0,65 s e la calibrazione circa 4,5 s; 0 prove su 24 oltre
   10 s con 0, 15, 20 e 25 °/s. Prima: 8,3 s con gesti perfetti, oltre 10 s in 4 prove su 6 con 25 °/s.
4. **«Salta» durante il passo «fermo»: risolto con l'unione** (`det.finishStill`): il primo dritto dopo «Salta» parte
   (prova «Salta anche durante il passo fermo» in `natpf-racchetta.test.mjs`).
5. **Swing corti: risolto nel codice (fase B).** Il telefono manda anche il picco dei campioni grezzi (vertice della
   parabola sui tre campioni attorno al massimo, al massimo +15% sul campione: `vr` nel messaggio); la calibrazione ne
   impara il riferimento (`rawRef`) e la forza usa quello; la profondità voluta dipende per l'80% dalla forza e per il
   20% dall'ampiezza (prima 55/45). Test in `natpf-racchetta.test.mjs` («swing corti (difetto 5)»: a 700 e 1100 °/s
   swing di 90° e 150° con forza entro 0,05) e nel motore. Prima: a 1100 °/s, 50° → 72% del picco (forza 0,49), 120° →
   93% (0,70).
6. **Pagina storica `site/tennis`, servizio e tempi: non è un difetto del rilevatore (fasi B ed E).** «gesture and calibration» e
   «timing-browser» passano 20 volte su 20 (5 per prova e per rilevatore, quello attuale e quello di `84ca878` nella
   stessa copia del branch), a macchina scarica; il rilevatore è lo stesso dei fallimenti visti dopo l'unione. Sotto
   carico (fasi D–E del passo 17): con due processi che occupano la CPU, «gesture and calibration» passa 2 volte su 3 sia con il rilevatore attuale sia con quello di `84ca878`, «timing-browser» 1 su 3 con tutti e due; «timing-browser» non usa nemmeno il rilevatore (manda pacchetti di colpo già pronti). Il difetto 6 non è nel passo «fermo»: le due prove sono sensibili al carico (a macchina scarica 20/20). Meccanismo visto in «gesture and calibration»: la prova congela la partita al colmo del lancio e aspetta il secondo gesto; sotto carico il gesto arriva oltre 0,8 s dopo l'ultimo fotogramma mostrato e il gioco lo scarta come colpo vecchio (regola voluta: i colpi non si rimappano su fotogrammi vecchi). Chiuso: le prove nel browser vanno lanciate una alla volta. La CI automatica del repository non gira sui branch `claude/*` (solo su due branch
   e sulle richieste di unione verso `main`): le prove si fanno qui con `full-ci` (elenco nel passo 17).
7. **Pagina storica, partita intera col telefono: risolto (fase B), le cause erano nella prova.**
   `tools/e2e/phone-cal.mjs` (fuori dalla CI) ora passa 17/17 e gioca la partita fino alla fine (punti 4–6, 10 lanci,
   13 colpi). Cause trovate con una copia strumentata della prova:
   - il controllo «mouse e tastiera non producono input» metteva `controls.enabled = false` e non lo rimetteva: da lì
     `controls.phoneSwing` scartava ogni colpo del telefono (prova `1315ee9` e filtro `d1d5015`, entrambi del 15/10);
   - il robot programmava il gesto come se la partita andasse in tempo reale; con la grafica software i fotogrammi
     superano 0,1 s e il tempo della partita va più piano (un passo al massimo 0,1 s), quindi il colpo arrivava anche un
     secondo prima del colmo del lancio, che ricadeva e ripartiva al gesto dopo. Ora il robot misura la velocità della
     partita e fa partire il gesto quando mancano i 110 ms veri che servono al picco;
   - il lancio non si riprovava se il primo gesto andava perso: ora si riprova dopo 1,5 s.

## Prossimi passi (in ordine)

1. [x] Mano unica (commit `78ea315`): il computer manda la mano al telefono (`cfg.hand`), il telefono la rimanda se
   cambiata lì (`{t:'hand'}`), la calibrazione non la cambia.
2. [x] Verso del gesto dalla gravità con il profilo semplice; segno invertito scoperto dai colpi; deriva accettata solo
   ≤ 1,5 °/s. Colpo dopo una preparazione lenta riconosciuto (P11).
3. [x] Forma del gesto sul telefono (`site/js/tennis/stroke-shape.js`): piano, salita della testa, inclinazione del
   manico, velocità. La rotazione del polso c'è, ma solo per la diagnostica (non validata). Campi `an` e `sh` nel
   messaggio. Banco: `test/racket-sim.mjs`, test in `test/natpf-racchetta.test.mjs`.
4. [x] Intenzione sul computer: `natpf_stroke_intent.js` (collegato in `natpfSwingToEngine` come `natpf.intent`).
   Strumento prima/dopo: `scripts/audit/zip-replay.mjs <cartella> --prima=… --prima-face=…`.
5. [x] Esito deterministico nel motore (`natpf_stroke_outcome.js`, `_natpfRacketShot` in `game_engine.js`).
   - Il tempo dentro la finestra è una scelta: in anticipo incrociato, in ritardo lungolinea. In ritardo il
     lungolinea pieno vale quanto la palla impiega a passare 1,4 m dietro il punto d'impatto (`lateSpanOf`).
   - Assistenza per livello (`ASSIST`): mira piena, qualità sotto la quale non tiene in campo, qualità sotto la quale il
     colpo fallisce (rete o lungo).
   - Qualità: allungo, corsa del movimento automatico (`stretch` del piano), palla veloce, profonda o alta, pressione
     degli scambi lunghi (`rallyPressure`).
6. [x] Finestra d'impatto (`natpf_impact.js`).
   - Swing in attesa fino all'arrivo della palla al punto d'impatto; uno più forte lo sostituisce.
   - In anticipo fino a `IMPACT.early`; in ritardo fino a `lateExtra` × il lungolinea pieno.
   - Mai un impatto con la palla lontana. Colpi a vuoto con il motivo (presto, tardi, portata).
7. [x] Movimento automatico (`planPlayerIntercept`, `recoverAfterShot`).
   - Dopo il rimbalzo all'altezza comoda; volée se si è avanti; schiacciata al volo sulle palle alte.
   - Si sale a rete dopo un attacco (cambiato nella fase C del passo 17: volée solo quando conviene, dopo il colpo verso
     il fondo se c'è il tempo, a rete solo dopo una palla corta).
   - Le palle che vanno fuori si lasciano andare.
   - Leggenda ritarata (`audit:legend`, 4 semi × 120 punti, tutti i criteri di forza rispettati):
     - CPU a 8 m/s, portata 2,3 m, lettura ±0,18 m;
     - stima di quando chi gioca non arriva sulla palla (vincenti);
     - niente affondo durante la reazione;
     - misura della reazione corretta (la frenata non è una reazione).
8. [x] Servizio dal gesto (commit `e451473`, `serveOutcome` in `natpf_stroke_outcome.js`).
   - Il colpo parte all'arrivo del gesto; la qualità dipende da quanto è lontano dal colmo del lancio.
   - Un gesto entro 0,42 s dal colmo in salita fa parte del lancio e non serve.
   - Piatto, kick (testa che sale) o slice (swing obliquo); posizione dal piano e dal piatto, sempre nel riquadro.
     I falli di servizio non ci sono, come prima.
9. [x] Avversario e Player 2 del 1v1.
   - L'angolo buono toglie qualità: a chi gioca con la corsa del piano (`stretchQuality`); alla CPU con gli errori di
     `cpuReturnPlan` (angolo, allungo, pressione, già c'era) e, a Leggenda, con la portata.
   - Scambi che finiscono: palle fuori lasciate andare, pressione degli scambi lunghi, `failQ` per livello (test
     «scambi che finiscono» a tutti i livelli).
   - Player 2 del 1v1 con il telefono: stesso esito deterministico, specchiato; stesso piano d'intercetto nella sua
     metà campo (volée, schiacciata al volo, palla fuori lasciata andare), recupero a rete o in fondo, mano dal suo
     telefono (`natpfP2Hand`). Senza telefono il P2 colpisce come prima; si muove con il nuovo piano.
10. [x] Calibrazione tollerante; «Salta» con il gioco completo (le due sessioni, unite).
    - Passo «fermo» con finestra scorrevole: rotazione mediana ≤ 30 °/s e nessun campione oltre 90 °/s; rumore come
      90° percentile. Con il tremolio di 25 °/s durava fino a 3,7 s, ora 0,65 s.
    - Percorso rapido con due gesti (dritto e rovescio, `QUICK_PLAN`), facoltativi con «Salta»: circa 4,5 s (prima
      8,3 s). Il riepilogo porta `need` e `per` (gesti chiesti e necessari per verso).
    - Colpi completi: un gesto nel verso opposto a quello chiesto può essere l'apertura lenta; si aspetta fino a 0,9 s
      il colpo nel verso giusto, finché la mano non si ferma davvero (0,4 s).
    - «Salta» anche durante il passo «fermo» (`det.finishStill`). Dopo «Salta» verso, tipo di colpo e forza vengono
      comunque dal gesto (verso dalla gravità, intenzione dalla forma, forza assoluta); deriva solo se plausibile;
      avviso «muovi» al massimo ogni 0,5 s; testi della modalità semplice corretti.
    - Calibrazione in campo: la palla è appena oltre il punto d'impatto (il colpo parte nello stesso istante del
      gesto), resta finché il colpo parte e vola almeno `CAL_SPOT.seen` (0,3 s).
    - Collegamento: l'evento `hand` senza ascoltatori non manda più in errore la pagina storica (`link.js`).
11. [x] Webcam: mano dall'impostazione unica; un solo soggetto; prove con più persone, perdita del tracciamento,
    tremolio.
    - La stessa impostazione della mano va a webcam e telefono; quella cambiata sul telefono torna alla webcam.
    - Un solo soggetto (`pickHand`, `trackOthers`): le altre mani si ricordano e per 5 s si riprende solo una mano della
      taglia di chi gioca (banco della seconda sessione 72/72, prima 28/72; scene della prima sessione con più
      persone, passante e tremolio senza colpi fantasma).
    - Limiti (in `docs/NATPF_WEBCAM.md`): all'inizio vince la persona più vicina; due mani della stessa taglia
      sovrapposte possono scambiarsi; una mano nuova della stessa taglia che entra mentre quella di chi gioca è persa
      viene presa; con i punti che tremano e colpi a meno di 2 s il colpo dopo può perdersi.
12. [x] Diagnostica: forma, intenzione ed esito negli eventi; prova guidata con il colpo richiesto; metriche di
    ripetibilità.
    - `tel.colpo`: `pk`, `ampiezza`, `forma` (piano, salita, polso, manico, velocità di testa e mano), `intenzione`
      (tipo, sicurezza, forza, portata, profondità voluta, mira del piatto).
    - Esito: campo `racchetta` di `colpo.gioco`, legato al gesto con il numero del colpo del telefono; eventi
      `racchetta`, `piano`, `servizio`, `vuoto` (colpo a vuoto con il motivo).
    - Metriche: `telefono.forma`/`intenzione`, `colpi.racchetta`, `riferimento.direzioneDalTempoPercento`,
      `ripetibilita` (p90 − p10 per colpo richiesto); `racchetta` (mediana e scarto interquartile per colpo voluto,
      piani, colpi a vuoto, servizi). In parte doppie: da tenerne una (passo 16).
    - Prova guidata: tagliati e palle corte dopo i pallonetti (palle corte solo con il telefono), direzioni spiegate
      con il tempo del colpo, circa 5 minuti.
13. [x] I 14 test obbligatori (tabella in `docs/NATPF_RACCHETTA_VIRTUALE.md` §3), prima/dopo sugli stessi dati
    (ZIP del telefono con `zip-replay.mjs`, webcam con `webcam-crowd.mjs`, calibrazione), regressioni.
    - Trovati e corretti: calibrazione che giudicava da sola l'apertura lenta di un colpo completo; piano d'intercetto
      vecchio usato per una palla nuova (prova della latenza 7/9 → 9/9); lanciapalle senza piano; pallonetto
      «morbido» fino a 850 °/s.
    - La prova nel browser del telefono usa i gesti della racchetta simulata (`test/racket-gestures.mjs`); con i gesti
      di prima, della presa del 19/10, non passa (difetto 2).
14. [x] Documento finale (§3 modello, §4 con codice, test automatici e validazione fisica separati, §5 procedura di
    prova fisica); build; zip Cloudflare e LAN estratti e provati (fuori dal repository, prima dell'unione).
15. [ ] **Validazione fisica** con telefono, webcam e persone vere: `docs/NATPF_RACCHETTA_VIRTUALE.md` §5. Nessuna
    verifica fisica è stata fatta.
16. [x] **Aperti del 22/10** (fatti nella fase B del passo 17): pagina storica (difetto 7 risolto, difetto 6 non
    riprodotto), presa del 19/10 (difetto 2, verificata; corretta per chi salta la calibrazione), forza degli swing corti
    (difetto 5), diagnostica doppia (una sola registrazione).
17. [ ] **Richiesta del 22/10 notte: gameplay come il gioco di riferimento** (benchmark vincolante; nome verificato,
    uscito il 22/10/2026; confronto e cause in `docs/NATPF_RACCHETTA_VIRTUALE.md` §6). Fasi, in ordine:
    - A [x] riferimento verificato, matrice di confronto, audit della mira e del movimento (`npm run audit:rally --
      --campo`: base del 22/10 notte, verso la rete dopo il 56–89% dei colpi, profondità dei colpi normali 8,45–10,9 m,
      direzione satura oltre 0,15–0,2 s di anticipo);
    - B [x] passo 16: difetti 5 e 7 risolti, difetto 6 non riprodotto (20/20), presa del 19/10 verificata con le tre
      prove nel browser (attuale 10/10, coerente 10/10, `84ca878` 7/10 spiegata) e salita abituale imparata giocando,
      diagnostica con una sola registrazione. CI completa: `tools/test` 135/135, `npm test` 281/281; CI del sito in locale: telefono 10/10, tempi 8/8, gesto e calibrazione 18/18, grafica 9/9, pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4, nel browser 3/3 e 7/8 (limite noto del contenitore), pacchetti creati; motore base nel browser: diagnostica 24/24, allenamento 13/13, risposta al gesto 9/9, presa verticale 10/10, presa del 19/10 10/10, menu 22/22, ricollegamento 6/6, rete che cade 6/6; partita intera della pagina storica (`phone-cal.mjs`) 17/17;
    - C [x] campo aperto e movimento (`docs/NATPF_RACCHETTA_VIRTUALE.md` §6, «cosa è cambiato»): tempo continuo su
      tutta la finestra, punto neutro dalla posizione della palla, lato del colpo dal gesto, profondità su tutto il
      campo, assistenza morbida; volée solo quando conviene, recupero verso il fondo secondo il tempo (a rete solo se
      una palla corta ha portato lì e il tempo non basta); diagnostica di direzione, traiettoria e scarto della caduta.
      Test `natpf-campo-aperto.test.mjs` (12; 11 falliscono con il codice di prima). Audit: verso la rete 46–89% → 0–0,1%,
      volée 33–69% → 0–0,1% a Casual ed Esperto, impatto mediano 2,9–10,5 → 9,9–12,4 m dalla rete, Leggenda con tutti i
      criteri. Da rivedere con partite vere: a Esperto i profili del telefono vincono più punti (amatore 57% → 80%).
      CI completa: `tools/test` 135/135, `npm test` 293/293; CI del sito in locale: telefono 10/10, tempi 8/8, gesto e calibrazione 18/18, grafica 9/9, pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4, nel browser 3/3 e 7/8 (limite noto), pacchetti creati; motore base nel browser: scambio vero (`natpf-rally.mjs`, nuova) 7/7, diagnostica 24/24, allenamento 13/13, risposta al gesto 9/9, presa verticale 10/10, presa del 19/10 10/10, menu 22/22, ricollegamento 6/6, rete che cade 6/6, build e 1v1 18/18;
    - D [x] sincronia del colpo, animazioni, recupero, prospettive, continuità: verificati nel browser, nessun difetto
      trovato da correggere. Scambio vero contro la CPU (`tools/e2e/natpf-rally.mjs`, 7/7; con `SHOTS=1` i fotogrammi):
      racchetta sulla palla all'impatto dal lato del gesto, ritorno in fondo entro 0,7 s anche dopo una palla corta,
      personaggio sempre rivolto alla rete (arretra senza girarsi), visuale alle spalle che segue; risposta al gesto
      (`natpf-latency.mjs` 9/9: swing nell'istante del colpo entro 20 ms, uno per gesto); scambi che finiscono, partite
      intere col telefono (pagina storica 17/17, 1v1 18/18). Visti solo nei fotogrammi del browser di prova (grafica
      software): la resa vera va guardata sul computer del gioco;
    - E [x] regola di marchio: tolti dai documenti e dal codice i nomi del gioco di riferimento e del suo editore
      (documenti vecchi, un commento, nomi del materiale dei personaggi, un selettore CSS non usato; il passaggio del
      17/10 ora è `docs/NATPF_PASSAGGIO_2026-10-17.md`); procedura di validazione fisica con il campo aperto
      (`docs/NATPF_RACCHETTA_VIRTUALE.md` §5, punto 14); prova sotto carico del difetto 6: con due processi che occupano la CPU, «gesture and calibration» passa 2 volte su 3 sia con il rilevatore attuale sia con quello di `84ca878`, «timing-browser» 1 su 3 con tutti e due; «timing-browser» non usa nemmeno il rilevatore (manda pacchetti di colpo già pronti). Il difetto 6 non è nel passo «fermo»: le due prove sono sensibili al carico (a macchina scarica 20/20). Meccanismo visto in «gesture and calibration»: la prova congela la partita al colmo del lancio e aspetta il secondo gesto; sotto carico il gesto arriva oltre 0,8 s dopo l'ultimo fotogramma mostrato e il gioco lo scarta come colpo vecchio (regola voluta: i colpi non si rimappano su fotogrammi vecchi); CI
      completa finale: `tools/test` 135/135, `npm test` 293/293; CI del sito in locale: telefono 10/10, tempi 8/8, gesto e calibrazione 18/18, grafica 9/9, pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4, nel browser 3/3 e 7/8 (limite noto), pacchetti creati; motore base nel browser: scambio vero 7/7, diagnostica 24/24, allenamento 13/13, risposta al gesto 9/9, presa verticale 10/10, presa del 19/10 10/10, menu 22/22, ricollegamento 6/6, rete che cade 6/6, build e 1v1 18/18.

## Come riprendere

1. `git status` e `git log --oneline -5` sul branch unico `claude/friendly-fermat-dwv2w2`. Se ci sono modifiche non
   salvate, vanno protette con un commit sul branch; mai `git stash` senza nome, mai reset. Chi lavora da un altro
   branch prima unisce questo (merge) e poi continua qui.
2. Leggere questo file (sezione «Per chi riprende»), poi `docs/NATPF_RACCHETTA_VIRTUALE.md` §3 e §4.4.
3. Lo ZIP della sessione reale non è nel repository (contiene il video della webcam). Per rifare le analisi, estrarlo
   in una cartella vuota fuori dal repository e passare quella cartella agli script.
4. Test: `cd natpf-tennis && npm test`; `node --test tools/test/*.test.mjs` dalla root. Il passo 17 è finito nel
   codice e nelle prove automatiche; resta la validazione fisica (passo 15, `docs/NATPF_RACCHETTA_VIRTUALE.md` §5).
5. Prove nel browser (`tools/e2e`, dopo `npm ci` lì): in questo ambiente il browser delle prove va indicato con
   `CHROMIUM_PATH=/opt/pw-browsers/chromium` (per esempio `CHROMIUM_PATH=/opt/pw-browsers/chromium node
   natpf-training-flow.mjs`); le prove della CI della pagina storica dalla root con `node tools/e2e/run-local.mjs
   <prova>.mjs` (elenco in `.github/workflows/natpf-simulator-tests.yml`). Il browser usa la grafica software: una
   prova che fallisce una volta va ripetuta prima di concludere, e le prove nel browser vanno lanciate una alla volta
   (insieme rallentano e falliscono per i tempi). `phone-cal.mjs` gioca una partita intera (fino a 10 minuti): serve un
   limite di tempo più lungo.
6. La CI automatica (`.github/workflows/natpf-simulator-tests.yml`) non parte sui branch `claude/*`: la «CI completa del
   sito» si fa qui, in sequenza: `node --test tools/test/*.test.mjs`; il controllo di sintassi dei moduli elencati nel
   file; `node tools/e2e/run-local.mjs phone-only.mjs timing-browser.mjs`; `… gesture-calibration.mjs`; `…
   arcade-visuals.mjs`; il pacchetto `python3 tools/package-natpf.py --out=…` e `NATPF_SITE_ROOT=…/static node
   tools/e2e/run-local.mjs intuitive-contact.mjs quick-phone-ui.mjs phone-only.mjs`; `node --test
   tools/lan/test/setup.test.mjs`, `node tools/e2e/lan-setup-browser.mjs`, `node tools/e2e/lan-browser.mjs`. Poi le
   prove del motore base (`natpf-*.mjs` in `tools/e2e`).
