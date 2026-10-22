# SESSION_HANDOFF · NATPF Simulator, giro «racchetta virtuale» (dal 22/10/2026)

Stato persistente del lavoro: da leggere all'inizio di ogni sessione e aggiornare a ogni checkpoint. La memoria
generale del progetto resta `MEMORY.md`; la cronologia delle decisioni è in `WORKLOG.md`.

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
- **Passi 1–14 fatti** (codice e test automatici). **Aperti** (passo 16): due prove della CI della pagina storica che
  falliscono dopo l'unione (difetto 6), la partita intera col telefono della pagina storica (difetto 7), la presa del 19/10 (difetto 2), la forza degli swing corti (difetto 5), la
  diagnostica in parte doppia. **Validazione fisica non fatta** (passo 15): in questo ambiente non ci sono telefono,
  webcam né persone; procedura in `docs/NATPF_RACCHETTA_VIRTUALE.md` §5.
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

Non fatto o aperto:
- **pagina storica `site/tennis`**: due prove della CI falliscono con il passo «fermo» nuovo del rilevatore (difetto 6);
  nella partita intera di `phone-cal.mjs` il telefono non lancia e non colpisce (difetto 7, altra causa);
- **validazione fisica** (passo 15);
- **presa del video del 19/10** (difetto 2): i dritti con il polso che prona vengono letti come tagliati (prova del
  telefono con i gesti di prima 7/10 anche sul branch unito, 10/10 prima del giro);
- **forza degli swing corti** sottostimata (difetto 5);
- **diagnostica doppia**: l'esito della racchetta e la ripetibilità sono registrati in due modi (eventi `racchetta`,
  `piano`, `servizio`, `vuoto` e metrica `racchetta` della prima sessione; campo `colpo.gioco.racchetta`, metriche
  `colpi.racchetta` e `ripetibilita` della seconda): funzionano entrambi, va tenuto uno solo;
- il video di riferimento pubblico indicato nella richiesta non si scarica da qui (solo titolo e quattro immagini).

Da fare, in ordine (passo 16, poi 15):
1. difetto 6: trovare nel passo «fermo» nuovo di `swing-detect.js` (`settle`: gravità dai campioni «steady», deriva
   sulla finestra, rumore come 90° percentile) cosa cambia il servizio a due gesti e i tempi della pagina storica, e
   correggerlo tenendo la tolleranza al tremolio e «Salta» nel passo «fermo»; poi le prove della CI del sito;
2. difetto 7: perché nella partita intera della pagina storica il telefono non lancia e non colpisce (`phone-cal.mjs`);
3. presa del 19/10: riferimento personale per verso della salita della testa (dalla calibrazione e dai colpi normali),
   poi la prova del telefono con i gesti di prima (`tools/e2e/natpf-phone-upright.mjs` com'era a `84ca878`) e con
   quelli della racchetta simulata (quella di adesso);
4. forza degli swing corti (picco senza media mobile, o compensato per la durata), con un test;
5. diagnostica: tenere una sola versione dell'esito e della ripetibilità, aggiornando metriche, rapporto e test;
6. validazione fisica (§5 del documento), poi tarare le soglie con i pacchetti della diagnostica.

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
2. **Presa del video del 19/10: aperto.** La prova del telefono com'era a `84ca878` (gesti sintetici con il polso che
   prona) passa 10/10 a `bfd629c`, dava 7/10 sul codice della prima sessione e 7/10 anche sul branch unito: dritti
   con il polso che ruota letti come tagliati, il gesto dal basso verso l'alto letto come tagliato invece che
   pallonetto, mira dal piatto girato 1,2 m (la prova chiede più di 1,5 m; prima 3,9 m). L'intenzione nuova legge
   salita e discesa con soglie fisse, senza il riferimento personale per verso che il modello di prima prendeva dalla
   calibrazione e dai colpi normali. La prova attuale (gesti della racchetta simulata) passa 10/10: quale dei due
   gesti somigli a quello vero lo dice solo il telefono vero (§5 del documento, passo 5).
3. **Calibrazione entro 10 s con il tremolio (criterio di P9): risolto con l'unione** (due gesti, passo «fermo» sulla
   mediana). Con un tremolio di 25 °/s il passo «fermo» dura 0,65 s e la calibrazione circa 4,5 s; 0 prove su 24 oltre
   10 s con 0, 15, 20 e 25 °/s. Prima: 8,3 s con gesti perfetti, oltre 10 s in 4 prove su 6 con 25 °/s.
4. **«Salta» durante il passo «fermo»: risolto con l'unione** (`det.finishStill`): il primo dritto dopo «Salta» parte
   (prova «Salta anche durante il passo fermo» in `natpf-racchetta.test.mjs`).
5. **Swing corti: aperto.** La forza viene dal picco della media mobile, più basso del vero negli swing corti. A
   1100 °/s: swing di 50° → 72% del picco (forza 0,49), 120° → 93% (forza 0,70); a 700 °/s 82% e 95%. Lo swing corto
   perde forza oltre alla portata, che invece è voluta.
6. **Pagina storica `site/tennis`, servizio e tempi: aperto** (dal commit `31d20b4` della seconda sessione, quindi anche
   sul suo branch). Le prove della CI «gesture and calibration» (`tools/e2e/gesture-calibration.mjs`) e
   «timing-browser» (`tools/e2e/timing-browser.mjs`) falliscono: nella prima il secondo gesto del servizio non colpisce
   il lancio (nessun contatto entro 15 s), nella seconda il passo del Player 2 non arriva. Verificato sul branch unito:
   rimettendo solo `site/js/tennis/swing-detect.js` com'era a `84ca878` passano 18/18 e 8/8; la causa è quindi nel passo
   «fermo» nuovo del rilevatore (`feedStill`/`settle`), da trovare. Non è la calibrazione a due gesti: con quattro
   gesti fallisce lo stesso.
7. **Pagina storica, partita intera col telefono: aperto.** `tools/e2e/phone-cal.mjs` (fuori dalla CI: calibrazione,
   prova libera, poi una partita giocata dal telefono simulato, fino a 10 minuti) arriva alla partita, ma il telefono
   non lancia mai la palla al servizio e non colpisce («0 lanci», punti 0–0). Fallisce allo stesso modo anche con il
   rilevatore di prima, quindi non è il difetto 6. Non verificato se fallisse già prima del giro del 22/10 (la prova a `bfd629c` è stata interrotta).

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
   - Si sale a rete dopo un attacco.
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
16. [ ] **Aperti** (si possono fare qui, prima del passo 15): pagina storica (difetti 6 e 7), presa del 19/10 (difetto 2),
    forza degli swing corti (difetto 5), diagnostica doppia (passo 12). Dopo ogni correzione: tutte le prove, comprese
    quelle della CI della pagina storica (`.github/workflows/natpf-simulator-tests.yml`) e la prova del telefono con i
    gesti della presa del 19/10.

## Come riprendere

1. `git status` e `git log --oneline -5` sul branch unico `claude/friendly-fermat-dwv2w2`. Se ci sono modifiche non
   salvate, vanno protette con un commit sul branch; mai `git stash` senza nome, mai reset. Chi lavora da un altro
   branch prima unisce questo (merge) e poi continua qui.
2. Leggere questo file (sezione «Per chi riprende»), poi `docs/NATPF_RACCHETTA_VIRTUALE.md` §3 e §4.4.
3. Lo ZIP della sessione reale non è nel repository (contiene il video della webcam). Per rifare le analisi, estrarlo
   in una cartella vuota fuori dal repository e passare quella cartella agli script.
4. Test: `cd natpf-tennis && npm test`; `node --test tools/test/*.test.mjs` dalla root. Il passo in corso è il passo
   16, a partire dal difetto 6.
5. Prove nel browser (`tools/e2e`, dopo `npm ci` lì): in questo ambiente il browser delle prove va indicato con
   `CHROMIUM_PATH=/opt/pw-browsers/chromium` (per esempio `CHROMIUM_PATH=/opt/pw-browsers/chromium node
   natpf-training-flow.mjs`); le prove della CI della pagina storica dalla root con `node tools/e2e/run-local.mjs
   <prova>.mjs` (elenco in `.github/workflows/natpf-simulator-tests.yml`). Il browser usa la grafica software: una
   prova che fallisce una volta va ripetuta prima di concludere. `phone-cal.mjs` gioca una partita intera (fino a
   10 minuti): serve un limite di tempo più lungo.
