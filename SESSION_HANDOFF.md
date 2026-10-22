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

- Branch `claude/friendly-fermat-dwv2w2` (mai `main`). Prima di questo giro il branch era al commit `bfd629c`.
- **Fase 1 (diagnosi) finita.** È in `docs/NATPF_RACCHETTA_VIRTUALE.md` §2, problemi P1–P11 con evidenze marcate
  [dati], [codice], [ipotesi] e [insufficiente].
- **Implementazione, test automatici, documento, build e zip fatti** (passi 1–14 qui sotto), ma con **cinque difetti
  aperti** trovati dopo la fine del giro (sezione «Difetti aperti», passo 16). Resta anche la **validazione fisica**
  (passo 15), che in questo ambiente non si può fare: procedura in `docs/NATPF_RACCHETTA_VIRTUALE.md` §5.
- Lavoro parallelo: un'altra sessione è ripartita da `84ca878` (passo 9 di questo branch) e ha rifatto i passi 10–12
  su `claude/determined-tesla-8dgaks` (ultimo commit `c5b9337`). I due branch non sono uniti e cambiano gli stessi
  file (calibrazione, webcam, diagnostica, allenamento).

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

## Difetti aperti (verificati il 22/10, dopo il passo 14)

Trovati confrontando questo branch con il lavoro dell'altra sessione, verificati qui sul codice di `61f037e`:

1. **Pagina storica `site/tennis`** (regressione del passo 1, `78ea315`): l'evento `hand` del collegamento non ha
   ascoltatori in quella pagina e `emit` va in errore. La prova della CI «gesture and calibration»
   (`tools/e2e/gesture-calibration.mjs`) passa 18/18 a `bfd629c`, su questo branch si ferma al servizio (2 prove su
   2) e torna 18/18 aggiungendo `hand: []` agli eventi di `link.js`. Le altre prove della CI passano: telefono e
   tempi 10/10 e 8/8, grafica 9/9, pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4.
2. **Presa del video del 19/10**: la prova del telefono com'era a `84ca878` (gesti sintetici con il polso che prona)
   passa 10/10 a `bfd629c` e dà 7/10 sul codice finale: dritti con il polso che ruota letti come tagliati (4 su 6), il
   gesto dal basso verso l'alto letto come tagliato invece che pallonetto, mira dal piatto girato 1,2 m (la prova
   chiede più di 1,5 m; prima 3,9 m). Il 10/10 del passo 14 è con i gesti della racchetta simulata, che hanno preso il
   posto di quelli. L'intenzione nuova legge salita e discesa con soglie fisse, senza il riferimento personale per
   verso che il modello di prima prendeva dalla calibrazione e dai colpi normali.
3. **Calibrazione, criterio di P9 non raggiunto**: il percorso rapido ha ancora quattro gesti. Con gesti perfetti
   8,3 s; con un tremolio di 25 °/s il passo «fermo» dura 2,2–3,7 s (3–5 avvisi) e la calibrazione supera 10 s in 4
   prove su 6 (9,8–11,3 s); con 15–20 °/s 8,3 s. Procedura della misura: come la prova «tremolio» di
   `natpf-racchetta.test.mjs` sul branch dell'altra sessione, con i quattro gesti di qui.
4. **«Salta» durante il passo «fermo»**: il rilevatore resta ad aspettare il telefono fermo; con un tremolio di
   25 °/s il primo dritto non parte e si gioca dopo circa 3,5 s.
5. **Swing corti**: la forza viene dal picco della media mobile, più basso del vero negli swing corti. A 1100 °/s:
   swing di 50° → 72% del picco (forza 0,49), 120° → 93% (forza 0,70); a 700 °/s 82% e 95%. Lo swing corto perde
   forza oltre alla portata, che invece è voluta.

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
10. [x] Calibrazione: con «Salta» il gioco è completo (verso dalla gravità, intenzione dalla forma, forza assoluta);
    deriva solo se plausibile; avviso «muovi» al massimo ogni 0,5 s; testi della modalità semplice corretti (prima
    dicevano che dritto e rovescio li sceglie il gioco).
11. [x] Webcam (`webcam_strokes.js`, `motion_controls.js`): mano dall'impostazione unica (`handPreference`).
    - Un solo soggetto: le mani viste insieme alla propria sono «altre persone» e non si prendono (prima, con la
      propria nascosta un attimo, il salto sulla mano vicina diventava uno swing).
    - Persa la propria mano per più di 0,5 s: per 3 s si riprende solo vicino a dove era; la mano ritrovata deve
      stare ferma un momento prima dei colpi.
    - Limiti rimasti: all'avvio vince la mano più grande con la lateralità giusta (un'altra persona più vicina alla
      webcam può essere scelta); una mano nuova che compare lontano entro 0,5 s si prende ancora (non si distingue
      dalla propria dopo il mosso).
    - Tremolio: nessuno swing fino a 3,6 cm a 2 m (12 Hz). Banco `webcam-sweep` ridotto identico a prima.
12. [x] Diagnostica: `tel.colpo` con forma e intenzione; eventi `racchetta` (esito), `piano`, `servizio`, `vuoto`;
    metriche `racchetta` (ripetibilità per colpo voluto: mediana e scarto interquartile); prova guidata con tagliati e
    palle corte in fondo (la prima parte resta uguale).
13. [x] I 14 test obbligatori (tabella in `docs/NATPF_RACCHETTA_VIRTUALE.md` §3), prima/dopo sugli stessi dati
    (ZIP del telefono con `zip-replay.mjs`, webcam con `webcam-crowd.mjs`, calibrazione), regressioni (`npm test` 263,
    `tools/test` 135, prove nel browser, audit della Leggenda completo, banco della webcam).
    - Trovati e corretti in questa fase: calibrazione che giudicava da sola l'apertura lenta di un colpo completo;
      piano d'intercetto vecchio usato per una palla nuova (lanciapalle, prove: swing «troppo presto»); lanciapalle
      senza piano; pallonetto «morbido» fino a 850 °/s (un dritto arrotato da amatore diventava pallonetto).
    - La prova nel browser del telefono usa i gesti fisici della racchetta simulata (`test/racket-gestures.mjs`).
14. [x] Documento finale (§3 modello, §4 con codice, test automatici e validazione fisica separati, §5 procedura di
    prova fisica); build; prove nel browser (telefono 10/10, allenamento 13/13, latenza 9/9, ricollegamento 6/6, rete
    6/6, menu 22/22, 1v1 18/18, diagnostica 23/23, LAN 7/8 per il limite noto del contenitore); zip Cloudflare e LAN
    estratti e provati (fuori dal repository); resoconto.
15. [ ] **Validazione fisica** con telefono, webcam e persone vere: `docs/NATPF_RACCHETTA_VIRTUALE.md` §5. Nessuna
    verifica fisica è stata fatta in questo giro.
16. [ ] **Difetti aperti 1–5** (sezione sopra): correggerli o portare le correzioni dal branch dell'altra sessione, poi
    rifare tutte le prove, comprese quelle della CI della pagina storica (`.github/workflows/natpf-simulator-tests.yml`)
    e la prova del telefono con i gesti della presa del 19/10. Si può fare qui, prima del passo 15.

## Come riprendere

1. `git status` e `git log --oneline -5` sul branch del progetto. Se ci sono modifiche non salvate, vanno protette con
   un commit sul branch; mai `git stash` senza nome, mai reset.
2. Leggere questo file, poi `docs/NATPF_RACCHETTA_VIRTUALE.md` §3.
3. Lo ZIP della sessione reale non è nel repository (contiene il video della webcam). Per rifare le analisi, estrarlo
   in una cartella vuota fuori dal repository e passare quella cartella agli script.
4. Test: `cd natpf-tennis && npm test`. Il passo in corso è il primo `[ ]` della lista sopra.
