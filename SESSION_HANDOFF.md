# SESSION_HANDOFF · NATPF Simulator, giro «racchetta virtuale» (dal 22/10/2026)

Stato persistente del lavoro: da leggere all'inizio di ogni sessione e aggiornare a ogni checkpoint. La memoria
generale del progetto resta `MEMORY.md`; la cronologia delle decisioni è in `WORKLOG.md`.

## Obiettivo (richiesta del 22/10)

Il telefono come racchetta virtuale: il gesto fisico è l'input del gameplay. Direzione, potenza, altezza e traiettoria
vengono dal gesto in modo comprensibile, con assistenza arcade (riferimenti: Wii Sports Tennis, Switch Sports) e
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

- Branch: dalla seconda sessione del 22/10 il lavoro continua su `claude/determined-tesla-8dgaks` (mai `main`), portato
  in avanti senza merge su `claude/friendly-fermat-dwv2w2` (`84ca878`, ultimo commit della prima sessione, interrotta
  dal limite d'uso mentre iniziava il passo 10). Prima di questo giro il branch era al commit `bfd629c`.
- **Fase 1 (diagnosi) finita.** È in `docs/NATPF_RACCHETTA_VIRTUALE.md` §2, problemi P1–P10 con evidenze marcate
  [dati], [codice], [ipotesi] e [insufficiente].
- Fase in corso: **implementazione** (passi qui sotto).

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
10. [x] Calibrazione tollerante; «Salta» con il gioco completo.
    - Passo «fermo» con finestra scorrevole: rotazione mediana ≤ 30 °/s e nessun campione oltre 90 °/s; rumore come
      90° percentile. Con il tremolio di 25 °/s durava fino a 3,7 s, ora sempre 0,65 s.
    - Percorso rapido con due gesti (dritto e rovescio, `QUICK_PLAN`), facoltativi con «Salta»: 4,5 s con gesti
      perfetti (prima 8,3 s). Il riepilogo porta `need` e `per` (gesti chiesti e necessari per verso).
    - «Salta» anche durante il passo «fermo» (`det.finishStill`): prima il rilevatore restava in attesa e nessun
      colpo partiva. Dopo «Salta» verso, tipo di colpo e forza vengono comunque dal gesto (prova con tutti i colpi).
    - Testi aggiornati («dritto e rovescio li sceglie il gioco» non era più vero; quattro gesti → due).
    - Regressioni trovate con le prove nel browser e corrette:
      - riscaldamento: dalla finestra d'impatto (passo 6) il colpo del gesto riconosciuto aspetta la palla, e la palla
        del gesto dopo la sostituiva prima del colpo (il telefono manda tentativo, gesto dopo e «pronto» insieme):
        il giocatore non colpiva più nessuna palla. Ora la palla resta finché il colpo parte e vola almeno 0,3 s;
      - `link.js`: l'evento `hand` (passo 1) senza ascoltatori mandava in errore la pagina storica (`site/tennis`).
11. [x] Webcam: mano dall'impostazione unica; prove con più persone, perdita del tracciamento, tremolio.
    - La mano c'era già (`mc.handPreference` da `NatpfHand`): ora un test mostra che la stessa impostazione va a webcam
      e telefono, e che quella cambiata sul telefono torna alla webcam.
    - Un solo soggetto (`pickHand`, `trackOthers`): con un'altra persona nell'inquadratura, persa la mano di chi gioca
      per pochi fotogrammi si prendeva la sua (il salto era un colpo) e dopo 0,5 s si sceglieva da capo. Ora le altre
      mani si ricordano e per 5 s si riprende solo una mano della taglia di chi gioca: banco 72/72, prima 28/72.
      Criterio nuovo in `webcam-sweep.mjs` (17/19, gli altri criteri identici a prima).
    - Prove obbligatorie 9, 10, 11 per la webcam (`natpf-webcam-classifier.test.mjs`, banco `runTwoPeople`) e 10, 11
      per il telefono (`natpf-racchetta.test.mjs`: tremolio in partita, pause nei campioni; `racketSim.gap`).
    - Limiti (in `docs/NATPF_WEBCAM.md`): all'inizio vince la persona più vicina; due mani della stessa taglia
      sovrapposte possono scambiarsi; con i punti che tremano e colpi a meno di 2 s il colpo dopo può perdersi (uguale
      a prima; la soluzione provata rompeva la «folla»).
12. [x] Diagnostica: forma, intenzione ed esito negli eventi; prova guidata con il colpo richiesto; metriche di
    ripetibilità.
    - `tel.colpo`: `pk`, `ampiezza`, `forma` (piano, salita, polso, manico, velocità di testa e mano), `intenzione`
      (tipo, sicurezza, forza, portata, profondità voluta, mira del piatto).
    - `colpo.gioco` del giocatore: `racchetta` (esito deterministico da `natpfLastRacket`: tempo nella finestra,
      eccesso, qualità, assistenza, fallito, rete, tipo, caduta, volée), legato al gesto con il numero del colpo del
      telefono (`ev.natpf.seq` → `natpfLastRacket.seq`).
    - Metriche: `telefono.forma`/`intenzione`, `colpi.racchetta`, `riferimento.direzioneDalTempoPercento` (direzione
      voluta con il tempo), `ripetibilita` per colpo richiesto o per lato e tipo; riassunto e confronto aggiornati;
      `diag.mjs colpi` con forma, forza ed esito.
    - Prova guidata: tagliati e palle corte (solo telefono, `phoneOnly`), direzioni spiegate con il tempo del colpo,
      circa 5 minuti.
    - Prove: registratore e metriche (`natpf-diag.test.mjs`), legame del numero (`natpf-racchetta*.test.mjs`), nel
      browser `natpf-diag-session.mjs` 18/18 con la verifica nuova.
13. [ ] I 14 test obbligatori, prima/dopo sullo ZIP (`scripts/audit/zip-replay.mjs`), regressioni (`npm test`, e2e).
    Fatto (checkpoint 8):
    - `natpf-latency.mjs` 9/9 (era 7/9): la palla messa a mano dalla prova arrivava con la risposta della CPU ancora in
      volo e il motore misurava il tempo sul piano d'intercetto di quella risposta. Cercando la causa, un errore vero
      del motore: un piano «lascia andare» rimasto dalla partita scartava in silenzio ogni swing in anticipo sulle palle
      del lanciapalle dell'allenamento e su quelle della calibrazione in campo. Ora ogni lancio cancella il piano della
      palla di prima (`_launchBallToTarget`), e anche la palla della calibrazione (`_presentBall`). Test nel motore e
      nei flussi.
    - `natpf-phone-upright.mjs` 10/10 (era 7/10): con la presa del 19/10 (telefono in verticale nel pugno) il polso che
      prona abbassa la testa della racchetta virtuale e la forma dava tagliati. Salita abituale dai gesti della
      calibrazione (`profile.rises`, `riseRefOf`, `classifyStroke`). Banco `calibration-matrix --forma`: colpi speciali
      non voluti da 1944 a 148 su 5184 (mancini 142). Il telefono finto della prova nel browser ora ha la gravità che
      ruota con lui (con la gravità fissa anche la mira dal piatto girato non si vedeva) e il pallonetto parte con il
      telefono inclinato in avanti. Documento: §3 «Presa verticale e salita abituale».
    - Commento vecchio della webcam (`claimed`) corretto.
    - `npm test` 273/273 (con `npm ci --prefix tools/lan` non salta più la prova LAN); `tools/test` 134/134.
    - Prove nel browser (22/10, dopo le correzioni): diagnostica 24/24, menu 22/22, ricollegamento 6/6, blackout 6/6,
      telefono solo 10/10, calibrazione a gesti 18/18, interfaccia rapida 6/6, contatto intuitivo 5/5, grafica arcade
      9/9, latenza 9/9, presa verticale 10/10.
    Da fare, in ordine:
    1. Chiarire le prove nel browser che non passano, confrontandole con `c5b9337` in un worktree (fuori dal
       repository): `natpf-training-flow.mjs` 12/13 («giocatore fermo mentre si aspetta il gesto»: 1 campione su 67 in
       movimento), `timing-browser.mjs` (attesa scaduta alla riga 92), `phone-cal.mjs` (partita ferma, già nota),
       `phone-failures.mjs` 9/11 (testi della calibrazione vecchia, già nota), `invite.mjs` e `invite-timing.mjs`.
    2. Build, poi `natpf-1v1-p2p.mjs` e `natpf-tennis/test/e2e/lan-e2e.mjs`.
    3. Prima/dopo sullo ZIP: bloccato finché lo ZIP non torna in questo ambiente (non è nel repository).
14. [ ] Documento finale (codice, test automatici e validazione fisica separati), procedura di prova fisica, build e
    zip.

## Come riprendere

1. `git status` e `git log --oneline -5` sul branch del progetto. Se ci sono modifiche non salvate, vanno protette con
   un commit sul branch; mai `git stash` senza nome, mai reset.
2. Leggere questo file, poi `docs/NATPF_RACCHETTA_VIRTUALE.md` §3.
3. Lo ZIP della sessione reale non è nel repository (contiene il video della webcam). Per rifare le analisi, estrarlo
   in una cartella vuota fuori dal repository e passare quella cartella agli script.
4. Test: `cd natpf-tennis && npm test`; `node --test tools/test/*.test.mjs` dalla root. Il passo in corso è il primo
   `[ ]` della lista sopra.
5. Prove nel browser (`tools/e2e`, dopo `npm ci` lì): in questo ambiente Playwright non trova il suo Chromium, quindi
   `CHROMIUM_PATH=/opt/pw-browsers/chromium node natpf-training-flow.mjs` (e le altre). Il browser usa la grafica
   software: una prova che fallisce una volta va ripetuta prima di concludere (la latenza ha dato 4/9 una volta, poi
   7/9 tre volte).
