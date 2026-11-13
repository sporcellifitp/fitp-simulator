# PROJECT_MEMORY · NATPF Simulator

Memoria tecnica durevole: architettura, decisioni, storico delle modifiche significative. Aggiornare quando si
prende una decisione che un agente futuro deve conoscere. Stato, ripresa e punti aperti in `docs/PIANO_LAVORI.md`;
registro dei passi in `docs/WORK_PROGRESS.md`; diari fino al 04/11/2026 in `docs/archivio/` (i rimandi
«WORK_PROGRESS, «…»» di questo file e del codice scritti prima del 04/11 sono lì). Storico fino al 28/10/2026:
`MEMORY.md`, `WORKLOG.md` (radice) e `docs/NATPF_*.md`.

## Architettura in breve

- `natpf-tennis/` — gioco desktop (Vite + three.js 0.160, niente framework UI: DOM e CSS a mano).
  - `src/game_engine.js` — motore base (fisica, fasi `SERVE_STANCE`/`SERVE_TOSS`/`RALLY`/`POINT_OVER`, CPU, camere).
    Espone `window.__natpfTennis` (motore) e `window.__natpfTennis.natpfUi` (interfaccia NATPF).
  - `src/natpf/` — tutto ciò che è NATPF: `natpf_ui.js` (collega i moduli), `natpf_lobby.js` (menu e percorso),
    `natpf_training.js` (riscaldamento/tutorial in campo con lanciapalle), `natpf_events.js` (sfide/minigiochi e
    classifica), `natpf_phone_racket.js` (telefono come racchetta), `natpf_gestures.js` (gesto → colpo),
    `natpf_music.js` (musica generativa Web Audio), `natpf_voice.js` (voce del gioco in inglese: clip registrate,
    ripiego sulla sintesi del browser), `natpf_media.js` (foto reali del tutorial), `natpf_split.js` +
    `natpf_split_ui.js` (split screen: 1v1 sullo stesso schermo con due telefoni), `natpf_screen.js` (schermo intero o
    area di un ledwall).
  - `src/audio_engine.js` — effetti sintetizzati (colpo, rimbalzo, rete, pubblico, UI).
  - CSS: `styles.css` (motore base), `natpf*.css` (strati NATPF). Vedi «Decisioni UI».
  - `test/*.test.mjs` — node:test con DOM simulato (`test/ui-world.mjs`), `npm test`.
  - `scripts/ui-shots.mjs` — screenshot del percorso UI con il Chromium di Playwright (funziona in questo ambiente
    dal 28/10/2026: le sessioni precedenti avevano Chromium in SIGSEGV).
- `site/` — sito statico; `site/tennis/racchetta.html` + `site/js/tennis/*.js` è la **pagina del telefono**
  (sensori, rilevatore dei colpi `swing-detect.js`, calibrazione `calibration.js`, figura della presa `grip-art.js`).
  Il desktop importa questi moduli con l'alias `@natpf` → `site/js`.
- LAN: `natpf-tennis/lan/` (server HTTPS + relay), pacchetto Windows con `lan/pacchetto.mjs`.

## Gesti reali (fonte per il tutorial — non disegnare gesti diversi da questi)

Presa insegnata dal 04/11/2026 (scelta dell'utente, sua foto `docs/riferimenti/presa-palmo-utente-2026-11-04.webp`):
**presa nel palmo**: il telefono appoggia nel palmo con lo **schermo verso chi gioca**, le dita avvolgono la parte bassa, il
pollice resta sul bordo, la **cima inclinata in avanti** (~40°, verso lo schermo) **e un poco verso l'interno** (~35°).
Foto `presa-palmo-schermo.webp`, figura e testi in `site/js/tennis/grip-art.js` (`GRIPS.palmo`), posa 3D
`natpf_gesture_motion.GRIP_POSE.palmo`. È la posizione neutra della calibrazione e del tutorial.
**Rollback** (su richiesta dell'utente): `GRIP_STYLE = 'martello'` in `site/js/tennis/grip-art.js` — cambiano insieme foto,
figura, testi di «Collega», stesso schermo, guida, lezione e calibrazione, e la posa del telefono nell'animazione 3D;
`test/natpf-presa.test.mjs` va adattato (verifica la presa attiva). Il riconoscimento non dipende dalla presa insegnata.
Fino al 04/11 la presa insegnata era l'**impugnatura a martello** (29/10 sera: `GRIPS.martello`, `GRIP_TILT` 80°, foto
`presa-martello.webp`): il pugno stringe la base del telefono come il manico di un martello e il telefono prosegue in
avanti dall'avambraccio, cima verso lo schermo, bordo stretto in alto, display di lato.
Piatto della dimostrazione dal 04/11: «il dritto, ma più veloce» (stesso asse e polso in proporzione): il gioco legge il
piatto rispetto alla salita del proprio colpo normale, e con la presa nel palmo il vecchio piatto perfettamente
orizzontale era top spin (`scripts/audit/sim-piatto-prese.mjs`: 64/80 → 80/80 prese simulate). Il riconoscimento è nel
riferimento della gravità e regge anche le prese di prima (in piedi nel pugno; base nel palmo con lo schermo in alto):
test `natpf-gesture-demo` (presa nel palmo con la cima 20–50° verso l'interno e 25–55° in avanti; martello con la cima da
20° sopra a 15° sotto l'orizzontale, display dentro o fuori, destro e mancino; prese di prima). Con il telefono orizzontale la testa della racchetta virtuale è sempre la cima
(`stroke-shape.js`, `STROKE_FLIP`: solo oltre 30° sotto l'orizzontale vale «capovolto»): prima bastava la cima appena
sotto l'orizzontale per invertire pallonetto e palla corta, tagliato e top spin. La direzione del piatto si legge dalla
rotazione di tutto il telefono attorno alla verticale (`face-tracker.js`), quindi non dipende da quale faccia guarda
dove. Il colpo normale (salita abituale) si impara giocando anche con la calibrazione (`habitualRise`, dopo 5 colpi per
verso): pallonetto, tagliato e schiacciata si leggono rispetto a quello.

Rilevatore sul telefono (`site/js/tennis/swing-detect.js`): il colpo è un picco della **velocità di rotazione**
(giroscopio): inizio > ~140 °/s (scalato sul proprio colpo), picco minimo, almeno 18° percorsi, durata 30–700 ms.
L'istante del picco è l'impatto. Dopo un colpo, il gesto opposto entro ~0,6–0,9 s è il rientro e non conta.

Classificazione (`natpf-tennis/src/natpf/natpf_gestures.js`, `classifyPhoneShot`):
- **Dritto / rovescio**: rotazione attorno all'asse **verticale**. Destro: dritto da destra verso sinistra
  (H = +1), rovescio da sinistra verso destra; mancino invertito.
- **Topspin** (colpo normale): orizzontale con la mano che **sale un poco** (dal basso verso l'alto).
- **Piatto**: orizzontale **veloce** (potenza ≥ 0,78 del proprio colpo) con piatto dritto.
- **Pallonetto**: gesto **verticale verso l'alto** (asse di rotazione orizzontale, la mano sale davvero), oppure
  orizzontale con la mano che sale molto. Con la salita abituale: la testa sale almeno 0,5 e 0,45 più del proprio colpo
  normale, piano fino a 0,7 (`INTENT.lobRel*`). Volo scalato con la distanza: colmo 5,4–6,5 m da fondo campo.
- **Tagliato (slice)**: gesto **dall'alto verso il basso** (verticale senza verso, palla bassa) oppure orizzontale con
  la mano che scende, **non lento**.
- **Palla corta**: dall'alto verso il basso, **lento e morbido** (potenza < 0,45 o velocità bassa).
- **Schiacciata**: palla alta + gesto verso il basso (verticale o orizzontale con la mano che scende). Il punto
  d'impatto alto lo sceglie il movimento automatico (`natpf_impact.js`): sui pallonetti (oltre 3,0 m) e, a rete (entro
  7 m), su ogni palla raggiungibile sopra 2,05 m; con il gesto da 1,5 m (`SMASH_FROM`), da 2,3 m sempre. Passa 10 cm
  sopra il nastro a 46 m/s.
- **Chiusura sopra la rete** (29/10): entro 6,4 m dalla rete, palla sopra 0,9 m, gesto deciso e qualità del livello
  (`OUTCOME.attack*`, `ASSIST.attackQ`): bassa sul nastro e veloce, anche angolata. La palla corta si prende al colmo del
  rimbalzo (livelli con il contatto al colmo). Il tempo si misura sulla strada della palla (`SLOW`: palle lente più larghe).
- **Servizio** (`game_engine.js` ~1392): in `SERVE_STANCE` il primo gesto (o un tocco sullo schermo del telefono)
  **lancia la palla**; in `SERVE_TOSS` il gesto successivo la colpisce: la qualità dipende da quanto è vicino al
  **punto più alto** del lancio. Un gesto debole subito dopo il lancio viene ignorato.
- **Volée**: non è un gesto diverso. Il motore (`natpf_impact.js`) prende la palla al volo quando conviene
  (giocatore avanti); il gesto è un dritto o rovescio **corto**.
- **Direzione** (incrociato / lungolinea), `natpf_stroke_outcome.strokeOutcome`: il **tempo rispetto al proprio
  ritmo** pesa di più (`createRhythm`: mediana degli ultimi colpi × 0,8, al massimo ±0,6 unità, da 4 colpi, si reimpara a
  ogni partita): prima del solito → incrociato, dopo il solito → lungolinea, pieni ai bordi della finestra (peso 1);
  il voto anticipo/perfetto/ritardo resta sul tempo vero. Poi l'**orientamento del
  piatto all'impatto** rispetto al proprio colpo abituale (piatto girato a destra → palla a destra: peso 1 dal 29/10
  pomeriggio, prima 0,6: tempo e piatto si sommano e il piatto da solo arriva alle righe; in diagonale la palla cade più
  corta; mira
  piena a 23° dal 29/10, prima 30°; scarti oltre 45° sempre meno credibili, oltre 60° non contano). Barra «Anticipo /
  Centro / Ritardo». Corretto il 28/10 sera: qui prima c'era scritto il contrario.
  **Centro della mira** (`natpf_gestures.createAimModel`, 29/10): il piatto abituale dei colpetti della calibrazione è
  solo un punto di partenza (con il telefono inclinato in avanti nel palmo era lontano dai colpi veri 25–150°): si
  verifica sui primi 4 colpi veri, segue la pendenza comune di dritti e rovesci (riferimento girato) e, dal decimo
  colpo, quella di un solo verso. Le mire volute restano (5–6 colpi mirati di fila, mire opposte tra dritto e rovescio).
- **Colpo super potente** (29/10, richiesta dell'utente): `natpf_stroke_outcome.superShot` (`SUPER`), tutte le condizioni
  insieme e senza caso: gesto fortissimo, colpo naturale dalla parte giusta del corpo, a tempo, da fermo, palla alta,
  lenta o corta (o la schiacciata). Più veloce (volo ÷1,4), profondo, carico e 16 cm sopra il nastro (`netClear` del
  lancio, solo per lui); chi riceve lo legge in ritardo (`ball.natpfSuper`). Non è casuale: è il gesto a deciderlo.
- **Stanchezza** (29/10): `natpf_skill.fatigueStep`/`moveFactor`, solo per i personaggi di chi gioca e solo in partita,
  dalla corsa laterale; al massimo −10% di velocità, recupero tra i punti. La CPU non si stanca (banchi di
  bilanciamento invariati per lei).
- **Telefono che non manda il movimento** (29/10): il segnale di ogni secondo del telefono porta l'età dei suoi sensori
  (`st.sa`); se il computer non riceve il movimento ma il telefono dice di averlo, la partita non si ferma. «Ricollega»
  (`link.relink()` → comando `relink`, hello con `rl`) rifà il collegamento senza ricaricare la pagina, a mano (riquadro
  della pausa e pagina del telefono) o da solo (`createResync`). Sullo stesso schermo il secondo telefono si registra
  nella diagnostica (`tel2.link`, `tel2.colpo`, `tel.pausa` con `chi`).

## Sfida tra due computer senza server (PeerJS): regole durevoli (30/10)

- **Mai messaggi da 16300 byte in su sulla DataConnection** (PeerJS 1.5, serializzazione «json»: il messaggio non parte,
  solo un evento `error` «message-too-big»). Le risposte RPC dell'host passano da `natpf_p2p.serveRpc`, che compatta lo
  stato per il P2 (`compactMatchState`: ultimi 3 colpi, niente `rackets`) e divide il resto a pezzi (`chunkText`). Chi
  aggiunge campi allo snapshot o al relay deve tenerne conto: è stata la causa del blocco tra primo e secondo game.
- Una lettura di `/api/match/state` alla volta (`motion_controls`), non un intervallo che non aspetta.
- Il P2 dice all'host perché non può giocare (`hold` nella lettura → `p2Hold`); l'host decide la pausa per tutti e due
  con `createPhoneWatch` (conto alla rovescia, scambio interrotto rigiocato). Il P2 non mette in pausa da solo: segue
  l'host. Lo snapshot di pausa porta `hold` (perché) e il punteggio.
- Identità di ripresa del P2 (`resumeIdFor`, sessionStorage per stanza) e `guest.reconnect()` («Riconnetti»).
- Punteggio dell'host salvato nella scheda (`natpf.versus.checkpoint`) solo per la ripresa dopo un ricaricamento.
- Colpi del P2 (30/10): età dal gesto con l'ora dell'host (`sentAtHost` solo con orologio preciso, viaggio ≤ 300 ms);
  oltre `P2_STALE_MS` 600 ms non si giocano. La compensazione della latenza e la finestra del tempo del P2 (0,17 s, il P2
  non riceve `natpfLateSpan`) sono invariate: si decidono con le misure della diagnostica.
- Vista del P2 (`natpf_guest_view.js`): la fisica resta allineata all'host, la correzione è solo visiva; dopo un colpo
  locale del P2 la palla non deve mai tornare verso la sua racchetta.
- Strade di rete: TURN di Cloudflare tramite un Worker separato che genera credenziali temporanee
  (`natpf-tennis/cloudflare/turn-worker.js`), indirizzo nel pacchetto in `/natpf/turn.json` (`pacchetto-cloudflare.mjs
  --turn-url`). La chiave TURN non va mai nei file del gioco né nel repository. Senza il file o con il Worker giù: le
  strade di sempre. Il canale «fast» del telefono via internet è affidabile ma non ordinato (PeerJS imposta solo
  ordered:false): lasciato così per decisione dell'utente.

## Decisioni B28 (12/11/2026, richiesta dell'utente allo stand: calibrazione giocando, niente blocchi)

Documento: `docs/b28/calibrazione-giocando.md`. Sostituiscono la regola B9/B16 «"Tutto chiaro" solo dopo tutte le schede»
e la calibrazione con i gesti come percorso di base.

- **Nessuna schermata guidata chiede un gesto per andare avanti.** Tutorial: X, Invio, Esc e «Tutto chiaro, ho capito»
  chiudono da qualunque scheda (al telefono `tp` porta `all: 1` sempre, per le pagine vecchie in cache; `av` dice se sono
  viste davvero). Esercizi dell'Allenamento e del riscaldamento: «Avanti ›» sul computer (`#coach-next`,
  `NatpfTraining.nextDrill`) e sul telefono (messaggio `nx`: il computer offre, il telefono risponde). Calibrazione con i
  gesti: «Salta la calibrazione» in campo, nel pannello del telefono e sulla pagina del telefono. Chi aggiunge una
  schermata guidata deve dare un «Avanti ›» o un «Salta» sul computer **e** sul telefono.
- **Calibrazione di base: giocando.** Opzione dello stand «Calibrazione: Giocando · Con i gesti · Nessuna»
  (`natpf_trial_learn.js`, `localStorage` `natpf-tennis.calibrazione`, `?cal=` per le prove), di base **Giocando**. Il
  telefono senza gesti riceve da solo il profilo semplice (comando `skip`); a ogni «Gioca» circa 10 s di **scambi di prova**
  (`natpf_trial.js`: palle dal lato noto, due colpi per lato, al massimo 6 palle o 14 s), poi la partita da 0-0.
- **A ogni partita si riparte da capo** (`NatpfPhoneRacket.freshPlayer`: `cal` + `skip`): chi gioca non eredita forza, mira
  e verso di chi c'era prima. Niente eccezioni a tempo; si saltano solo dove le persone sono di sicuro le stesse: rivincita
  dai telefoni nello stesso schermo, «Gioca ancora» di un minigioco, il «Gioca» subito dopo «Riscaldati prima», la
  rivincita della sfida tra due computer.
- **Il profilo ricorda come è stato fatto, e niente passa da un visitatore al successivo** (revisione del 12/11, giro 2):
  `NatpfPhoneRacket.madeBy` = `gesti` | `salta` | `auto` | `prova`. «Giocando»: ogni «Gioca» rifà gli scambi di prova da
  un profilo nuovo; una calibrazione con i gesti fatta apposta dopo la fine dell'ultima partita vale **per la partita che
  segue e basta** (`gestureAt`, `keepsGesture`). «Con i gesti»: conta come calibrato solo un profilo `gesti` o `salta`,
  con la durata di prima del B28; un telefono rimasto `auto` o `prova` rifà i gesti senza QR (`calStale`,
  `demoteIfStale`: subito al menu, altrimenti al prossimo «Gioca»). «Nessuna»: profilo semplice da capo a ogni partita.
  Cambiare l'opzione vale dal prossimo «Gioca» e annulla il «vale per la prossima partita». Chi aggiunge un modo di
  fare o tenere un profilo deve dire come è stato fatto (`madeBy`) e passare da `keepsGesture`.
- **Il verso si controlla con il lato della palla**, uguale per destri e mancini: palla alla destra di chi gioca = gesto
  +1. Il lato è quello del piano d'intercetto al momento del colpo (`ballSideNow`), non quello deciso al lancio. Il segno
  corretto vive sul computer (`learner.sign`) e il verso atteso va al telefono girato. **Regola dei due versi**
  (revisione, giro 2): il lato della palla è una prova sul segno solo se i colpi «al contrario» ci sono da tutti e due i
  lati; chi fa sempre lo stesso gesto non fa girare niente, mai (prima un giocatore da un lato solo restava specchiato per
  tutta la partita). Vale nel gioco (`createTrialLearner`) e nel voto del telefono (`swing-detect.js` `vote`), che negli
  scambi di prova è spento (`setSignVote`, messaggio `ph` con `tr`: lì decide il computer, due correzioni insieme si
  annullano) e gira solo su un colpo al contrario. Ogni modifica a queste due regole va provata con il banco
  (`scripts/audit/scambi-di-prova.mjs`, tabella «da un lato solo») e con i test «revisione 1».
- **Profilo da capo e guardia del telefono**: il `cal` + `skip` chiesto dal gioco fa dire al telefono «calibrazione» per
  un attimo; per `RESET_GRACE_MS` (2,5 s) `phoneHealthOf` non lo prende per «non pronto» (`resetting`) e la prima palla
  degli scambi di prova aspetta. In partita la guardia non cambia.
- **Colpi pianissimi** (0,2× di un adulto): limite scritto, non si abbassano le soglie del profilo semplice durante gli
  scambi di prova (provato: colpi doppi a tutti); la via è «Calibra con i gesti».
- **I colpi di prova non contano**: `ui.trial.active` vale come `training.active` per punti, esito, moviola, stanchezza,
  sfida tra due computer e diagnostica (`allenamento: true`, `prova: true`). Chi aggiunge un controllo «siamo in partita?»
  deve escludere anche `ui.trial.active` (nello stesso schermo i colpi del Player 2 valgono: `versus.local`).
- **Stesso schermo**: palleggio assistito con una palla (ogni colpo è rimandato sul lato giusto dell'altro); chi tiene il
  profilo dei gesti conta come fatto; la pausa di un telefono non rigioca il punto negli scambi di prova. **Sfida tra
  due computer**: scambi di prova prima, in campo, una volta (chi invita dopo «Collega», il Player 2 al posto della
  calibrazione); chi li apre passa a `NatpfTrial.start` anche `cancel`, che rimette a posto il suo stato se si chiudono
  prima (il Player 2 torna Player 2). **Allenamento**: il profilo si impara dai primi due esercizi.
- **Telecomando dello staff (B27) e scambi di prova**: pagina `trial` «in campo» in `natpf_remote_map.js`; «Salta» =
  `trial.skip()`, «Avanti ›» dell'allenamento, «Salta la calibrazione»; «Ricalibra il telefono» = `ui.recalibrate()`.
- **Test**: nel mondo di prova (`test/ui-world.mjs`) l'opzione è «Con i gesti» di base, perché i test di prima provano
  quel percorso; i test del percorso nuovo passano `cal: 'play'` (`natpf-scambi-di-prova`, `natpf-giocando-revisione`:
  quest'ultimo copre i percorsi della modalità di base, aiuti in `test/trial-world.mjs`). Nelle prove nel browser lo
  stesso con `CAL` (`th.mjs`); `CAL=base` non scrive niente (l'opzione vera di base) e gli script adattati usano
  `tools/e2e/prova.mjs` (telefono pronto senza gesti, scambi di prova giocati o saltati).
- **Misure** (telefono simulato): forza dei primi colpi 0,04 come i gesti fatti bene (gesti a vuoto deboli 0,07, primi tre
  0,11); lato mai sbagliato, anche con il verso invertito («Salta»: 36–46 colpi su 120 dal lato sbagliato); telefono che
  passa di mano: errore di forza 0,29 → 0,03. Peggio dei gesti fatti bene: centro della mira (±5° contro ±2°).
- **Pannello dello stand**: 13 pulsanti nella griglia più le due voci del B27 nella riga in basso; tre colonne da 700 px,
  file più strette sotto 680 px di altezza; provato fino a 720×720 (`natpf-menu`).

## Decisioni B16 (08/11/2026 sera: risposte dell'utente alle domande (a)–(d) del B15)

- **(a) Leggenda più dura**: la forza viene dalla CPU (primo passo, pressione dal 20° colpo, chiusura, controllo dei colpi
  forti), non da regole più severe per chi gioca; criteri sempre controllati (`audit:legend` in CI, torneo ridotto in
  `npm test`). Dettaglio in §CPU Leggenda.
- **(b) Tutorial corto prima della partita** (dal B28, 12/11: nessuna scheda è obbligatoria, vedi §Decisioni B28): cambia la regola B9 «tutte le schede viste prima di "Tutto chiaro"». Prima
  della partita 5 schede: presa, posizione di partenza (pronto), dritto, rovescio, servizio; le altre 6 (piatto,
  pallonetto, palla corta, tagliato, schiacciata, volée) nell'Allenamento e in «Rivedi i gesti». Dettaglio in §Decisioni B9.
- **(c) Riscaldamento facoltativo** (dal B28 di base non c'è nemmeno la calibrazione con i gesti): dopo tutorial corto e calibrazione si va alla pagina «Partita»; il riscaldamento
  (dritto, rovescio, servizio) parte solo con «Riscaldati prima» (o dall'Allenamento). Dettaglio in §Decisioni B9.
- **(d) Mira del telefono**: sensibilità scelta dall'**addetto** nel **pannello dello stand** (alta 17° di base, media 20°,
  bassa 23°), non nelle Opzioni dei visitatori; misura per partita nella diagnostica e comando `lato-palle.mjs`. Dettaglio
  in §Mira del telefono e `docs/GUIDA_MISURA_MIRA.md`.
- **Audit del gameplay** (`docs/b16/rapporto-gameplay.md`, misurato sulla 2026-11-08.4): piano in tre tappe; decisioni
  chieste all'utente in `docs/PASSAGGIO_CONSEGNE.md` §3. Tre punti si sovrappongono al B17 di un'altra sessione
  (`docs/b17/analisi-e-piano.md`): colpo fallito a Leggenda ↔ colpi sotto rete (stessa regola `failQ` → `weak`), fine
  partita nello stesso schermo ↔ punteggio in alto a sinistra, tutorial corto ↔ X per uscire dal tutorial.

## Decisioni B11 (07/11/2026: un solo installer Windows che si aggiorna dal gioco)

- Prodotti consegnati: **installer Windows unico** (`NATPF-Simulator-Setup-<build>.exe`) e **zip Cloudflare** per il
  browser. Lo zip LAN e l'eseguibile portatile non si fanno più (stesso gioco e stesso server dei telefoni dell'installer).
- Aggiornamenti dal gioco: file pubblicati su **Cloudflare R2** (bucket pubblico; il repository è privato, quindi niente
  download da GitHub e nessun segreto nel programma). Dettagli di formato e sicurezza nella nota del blocco B11.

## Decisioni B9 (05–06/11/2026: tutorial, telefono, schermo spento, pronto)

- **Animazione dei gesti** (`natpf_gesture_demo.js`): Canvas 2D illustrata «2,5D», solo avambraccio, mano e telefono,
  senza three.js né WebGL. Il moto si legge **solo** da `natpf_gesture_pose.js` (`gesturePose(id, t, { hand })`, modulo
  puro): il test `natpf-gesture-pose`/`natpf-gesture-anim` fa passare la stessa posa dal telefono simulato al
  rilevatore vero, quindi un cambio del disegno che non passa dalla posa non è verificato. Un'istanza per metà dello
  stesso schermo; modalità compatta sotto 320 px; niente `backdrop-filter` sotto la modale aperta. Giudizio e brief:
  `docs/b9/giudizio-animazione.md`; nota del ramo: `docs/b9/animazione-c.md`; API della posa: `docs/b9/posa-gesti.md`.
- **Tutorial e telefono**: frecce ‹ › (niente scorrimento automatico), scheda vista dopo ~1 s, avanzamento `tp` al
  telefono; schermate del telefono esclusive (`site/js/tennis/phone-screen.js`); Ricalibra/Ricollega/Scollega solo sotto
  «Pronto». **Regola cambiata dall'utente il 12/11 (B28)**: «Tutto chiaro, ho capito» e la X **non** aspettano più che
  tutte le schede siano viste; il tutorial si chiude sempre, da qualunque scheda (vedi §Decisioni B28). Le schede viste
  restano solo come informazione (puntini, `tp`).
- **Tutorial corto prima della partita (decisione cambiata dall'utente l'08/11 sera, B16; prima: «tutte le 11 schede viste
  prima di "Tutto chiaro"» anche prima della partita)**: prima della partita contro la CPU, della sfida tra due computer
  (host), dei minigiochi e nello stesso schermo (ognuno il suo tutorial e il suo «Tutto chiaro») 5 schede: presa,
  posizione di partenza (pronto), dritto, rovescio, servizio. L'Allenamento dal menu e «Rivedi i gesti» mostrano tutte le 11 (piatto,
  pallonetto, palla corta, tagliato, schiacciata, volée). Le 5 sono le prime 5 di `TUTORIAL_CARDS` (`natpf_tutorial.js`:
  `tutorialCards('short'|'full')`, `tutorialSetFor(mode)`): stessi indici, quindi il protocollo `tp` non cambia (`n` =
  schede di quel tutorial, `m` maschera sugli stessi indici; un telefono con la pagina di prima mostra «Scheda x di 5» e
  accende il pulsante con `all` come prima). Il telefono ricorda quale serie ha visto per abbinamento
  (`NatpfPhoneRacket.tutorialSeenFor(set)`): visto il corto, l'Allenamento con lo stesso telefono riprende dalla sesta
  scheda (`tutorialResumeAfterShort`); visto il completo, il corto non si ripete. Il Player 2 della sfida tra due
  computer non ha il tutorial (escluso dal B4 con `guest`, invariato: la sfida tra due computer non si sviluppa).
- **Riscaldamento facoltativo (decisione dell'utente dell'08/11 sera, B16)**: dalla pagina «Collega» della partita in campo
  solo il tutorial corto e la calibrazione, poi la pagina «Partita» («Racchetta pronta ✓», «Gioca» e il pulsante
  secondario «Riscaldati prima»); con il telefono già calibrato, la webcam o mouse e tastiera subito «Partita». Il
  riscaldamento (dritto, rovescio, servizio) resta in «Riscaldati prima» e nell'Allenamento (`natpf_lobby.startWarmup`).
  Il riscaldamento insegnava il colpo tipico prima della partita: senza, `natpf_phone_racket.powerRefs` alza il
  riferimento della calibrazione (spesso un colpetto) almeno alla mediana dei colpi già fatti e a 0,75 del colpo letto
  finché il colpo tipico non c'è (`BOOT`; banco `scripts/audit/riscaldamento.mjs`, test `natpf-riscaldamento`).
  Tocchi dall'apertura alla prima palla (`tools/e2e/natpf-flusso-tocchi.mjs`): singolo 20 → 13, stesso schermo 31 → 19,
  sfida tra due computer 25 → 18. Il pulsante di «Collega» dice dove porta (`connectTarget`/`connectNextLabel`: «Alla
  partita ›» o «In campo ›»); la barra delle tappe ha «Calibrazione» solo con il telefono; «Riscaldati prima» con il
  telefono caduto porta a «Collega» e la richiesta vale solo finché si resta lì (si azzera lasciando la pagina o al menu);
  dopo un riscaldamento finito il pulsante dice «Rifai il riscaldamento» (fino al menu principale).
- **Schermo spento**: nessun browser dà i sensori a pagina nascosta. Wake Lock, pausa immediata sul computer, ripresa
  automatica e velo con testo dipendente dallo stato (`veilText`). Alternativa vera: app Android nativa
  (`docs/b9/schermo-spento.md`).
- **Pronto nello stesso schermo**: una scheda per giocatore; conto di 3 s quando tutti e due sono pronti, telefoni
  sani (pagina visibile, sensori vivi) e tutorial chiuso; `bothReady()` usa lo stesso criterio delle schede; il conto
  non riparte da solo tornando con «‹ Indietro» (solo dopo un cambio di stato che dura ≥ 1 s).

## Decisioni del 04/11/2026 (richiesta in 5 punti; stato e piano in `docs/PIANO_LAVORI.md`)

- **Uso agli eventi**: un solo PC Windows 10 noleggiato (GPU ignota, probabilmente integrata), ledwall come monitor
  esteso, rete dedicata allo stand, telefoni dello staff. Modalità che contano: stesso schermo, allenamento, minigiochi,
  al massimo 1v1 contro la CPU. **Niente 1v1 tra due PC né multiplayer** agli eventi: la sfida tra due computer resta
  com'è ma non si sviluppa oltre. Nessun certificato di firma del codice.
- **Presa**: la foto del «martello» si sostituisce con la presa della foto dell'utente del 04/11
  (`docs/riferimenti/presa-palmo-utente-2026-11-04.webp`): telefono nel palmo, schermo verso chi gioca, dita attorno alla
  parte bassa, pollice sul bordo, cima inclinata in avanti verso lo schermo. Il riconoscimento attuale per l'utente va
  già bene; foto, figura, 3D e testi cambiano, con **rollback** pronto su richiesta (dettagli in §Gesti dopo il blocco B3).
- **Tutorial**: modale prima della calibrazione con tutti i gesti (dall'08/11 sera, B16: 5 schede prima della partita, tutte
  nell'Allenamento e in «Rivedi i gesti»; vedi §Decisioni B9); «Tutto chiaro, ho capito» **sul telefono** di
  ciascun giocatore; una volta per sessione e per giocatore, «Rivedi i gesti» sempre disponibile; webcam con una
  versione breve. Riquadro «Guarda e ripeti» tolto in calibrazione, tenuto negli esercizi dell'Allenamento. Nel 1v1
  sullo stesso schermo: modale e calibrazione indipendenti nelle due metà della pagina «Collega».
- **Tutorial (fatto in B4)**: `natpf_tutorial.js` + protocollo `cfg.tut` / messaggio `tut` (telefono in attesa, pulsante in
  alto); la modale sostituisce la lezione a passi con il telefono; Esc la chiude per chi gestisce la postazione.
- **Stesso schermo (fatto in B5)**: un tutorial per metà dello schermo (`#split-tut-p1/p2`), ciascuno chiuso dal proprio
  telefono; calibrazione di ciascuno solo dopo il suo «ho capito»; una sola animazione 3D, alla metà aperta per prima.
- **Intro**: una sola pallina e il campo dell'arena del gioco; budget Higgsfield ≤ 100 crediti; se due tentativi
  falliscono si avvisa l'utente.
- **Lavoro**: push dopo ogni commit verificato; ZIP LAN e Cloudflare consegnati sempre dopo ogni commit (nuovi se il
  commit li cambia, altrimenti gli ultimi); un agente alla volta (regole complete in `CLAUDE.md`).

## Decisioni del 31/10 (diagnostiche 142317/142438 e richiesta in 5 punti)

- Servizio dal gesto alla profondità voluta (`NS.fixAirServe`, P1 e P2). In risposta al servizio la schiacciata solo se
  voluta (gesto di schiacciata o palla molto alta). Il pallonetto profondo resta schiacciabile al volo (decisione).
  Telecamera che arretra in modo morbido oltre 12,5 m dalla rete (`natpf_camera_depth.js`).
- Colpo del P2: stesse regole del P1 per attore (`natpf_impact` `pendKey`), con `P2_LATE_MARGIN` 30 ms solo tra due
  computer. Gesti morbidi in attesa: decisione rinviata di ~60–70 ms (`SOFT`) perché il colpo vero arriva dopo.
- Webcam: camera fino a 1280×720 se regge 24 fps, ritaglio attorno alla mano oltre ~2,5 m (`webcam_roi.js`),
  coordinate riportate a 4:3 prima delle soglie dello zip. Webcam per due: confine mobile tra le «case», mani perse da
  poco restano di chi le aveva, etichette delle mani libere con scadenza.
- Minigiochi nascosti con un interruttore (`HIDDEN_MODES`), codice conservato. Guida «Come si gioca» a schede.
- LAN: relay compatto (`STATE_SWINGS`), letture con `PHONE_POLL` (guardia 2,5 s, 0,5 s senza stanza), ping della
  segnalazione, ETag.

## Decisioni (28/10/2026, sessione redesign)

- **Tutorial: foto reali nella lezione, gesti con l'animazione 3D** (decisione finale del 28/10 sera, su richiesta
  dell'utente). Foto Higgsfield in `public/media/` (presa di lato con «Così no», presa vista dallo schermo, posizione
  di partenza; elenco e job in `public/media/LEGGIMI.txt`), collegate da `src/natpf/natpf_media.js`. I gesti dei colpi
  si mostrano con l'animazione 3D (`natpf_gesture_demo.js`, telefono stile S24 Ultra in three.js), verificata con il
  rilevatore vero. **Niente clip video generate dei colpi**: sono state provate (Kling 3.0 Turbo, 11 generate, 6
  passate al controllo fotogramma per fotogramma) e poi rifiutate dall'utente: il telefono sembrava un telecomando e le
  pose non erano coerenti con il tennis né con i testi. Non riproporle senza una richiesta esplicita. Per i mancini
  le foto sono specchiate in CSS.
- **Split screen «Stesso schermo»** (28/10 sera): 1v1 su un computer con due telefoni. È il 1v1 dell'host con una
  sessione locale (`engine.startSplit()`: `versus = { active, local: true }`, nessuna stanza, singolare, regole 1v1
  sempre); il secondo telefono è `NatpfPhoneRacket(engine, { role: 'p2' })` e i suoi colpi entrano da
  `_emitP2Swing/_emitP2Toss` come quelli del P2 in rete. La partita si disegna due volte con lo scissor (P1 a sinistra
  dal suo lato, P2 a destra dal lato opposto), terza persona; camera per metà adattata alle metà strette (ledwall).
  Non usare la prima persona né il doppio in split.
- **Schermo e ledwall**: tutto il gioco può stare in un'area (preset 1:1 / 3:2 centrati, o `?area=x,y,w,h` per il
  processore LED). Regola per chi scrive CSS: misure e regole che dipendono dallo schermo con **`cqw/cqh` e
  `@container natpf`**, non `vw/vh` e `@media` (il body è il contenitore «natpf»); nel JS `viewport()` di
  `natpf_screen.js`, non `window.innerWidth/innerHeight`.
- **Intro**: video `public/media/intro.mp4` (Cinema Studio 3.0, senza scritte né marchi; dal 04/11 generato tra due
  fotogrammi ripresi dal motore, quindi con la stessa arena del gioco, e **una sola pallina** che esce di scena entro
  ~1,7 s, prima della pallina del titolo a 5,6 s: verifica con `scripts/audit/conta-palline.py`) con titolo in HTML; il solo
  titolo grande è «NATPF Simulator», i partner (Esports FITP, Nitto ATP Finals) sono sempre una riga piccola in
  secondo piano (intro e menu), mai schermate di loghi a tutto schermo.
- **Voce solo in inglese, timbro cartoon** (decisione finale del 28/10 sera, su richiesta dell'utente: una sola lingua,
  coerente con il gioco, niente voce maschile cupa). `natpf-tennis/public/voce/*.mp3`: 47 clip con una sola voce,
  il preset Higgsfield «Pixie» (`voice_id 0178ef57-ada4-43d9-992b-8d9221045bb4`), per arbitro, annunci dei minigiochi
  e versi del giocatore. Il motore e l'HUD italiano passano etichette («15 - 00», «Parità»…): `callout()` in
  `natpf_voice.js` le traduce nella frase inglese, il nome del file è la frase (`clipName`). Ripiego: sintesi inglese del
  browser (`pickEnglishVoice`), mai una voce italiana. I testi a schermo restano in italiano.
  Per rigenerarle: `generate_audio_batch` con `model: elevenlabs_v4`, `prompt` = testo e
  `dialogue: [{ text, voice_type: 'preset', voice_id }]`, 0,23 crediti a frase; il limite di frequenza (429) rifiuta
  qualche richiesta (ripeterla). Poi ffmpeg: silenceremove + loudnorm −16 LUFS, MP3 mono 48 kb/s (`-nostdin` nei
  cicli); verifica con Vosk inglese (`vosk-model-small-en-us-0.15`). Non usare le voci personalizzate dell'account.
- **Audio**: il connettore Higgsfield non offre un modello musicale utilizzabile per asset autonomi
  (`sonilo_music` è riservato alla pipeline dei giochi; Suno non presente nel catalogo il 28/10/2026). La musica
  resta quindi **generativa e originale** in `natpf_music.js` (nessun file, nessuna licenza esterna).
  ElevenLabs v4 è raggiungibile tramite Higgsfield solo per il parlato.
- **Mai usare** `sonilo_music`, `mirelo_text_to_audio`, `inworld_text_to_speech` per asset del progetto (riservati
  alla pipeline di generazione giochi di Higgsfield).

- **Sistema di design**: `natpf-tennis/natpf-ui.css` è la fonte per lobby, fogli, coach, minigiochi e risultati
  (token `--ink-*`, `--ball`, `--pink`, `--r-*`; pulsanti `.btn .btn-primary .btn-ghost .btn-sm`; segmenti `.seg`).
  Font Barlow / Barlow Condensed (SIL OFL) in `natpf-tennis/fonts/`, URL relativi: Vite li include nella build.
- **Tutorial**: «Allenamento» = lezione + 11 esercizi; il riscaldamento prima della partita = dritto, rovescio,
  servizio senza lezione (`WARMUP_IDS` in `natpf_training.js`), facoltativo dal B16 («Riscaldati prima» nella pagina «Partita»). La volée si allena a rete (`VOLLEY_Z`).

## Storico modifiche significative

- 29/10/2026 notte — stesso schermo con una webcam per due (`webcam_duo.js`, `98f1f7b`): P1 a sinistra e P2 a destra
  nell'immagine specchiata; stesse regole del colpo della webcam per uno (`argonTrailEvent`, `argonFlowBlob`, non
  duplicarle); camera al formato più largo fino a 1920×1080 preferendo almeno 24 fps.
- 29/10/2026 notte — iPhone: Safari dà l'accelerazione (con e senza gravità) con il segno opposto ad Android; la pagina
  del telefono la riporta al segno di Android (`motion-sign.js`, segno dal sistema confermato dai tocchi) prima di
  tutto il riconoscimento. Non togliere: senza, su iPhone dritto e rovescio si invertono (`8e6cfcb`). Menu «Batte per
  primo», barra della potenza/super e energia (`natpf_power_hud.js`, `caf0ddf`).
- 29/10/2026 sera — webcam (Lenovo E14, diagnostica 101056 e video della 145416): continuità nei colpi veloci, mano
  uscita dal bordo, distanza, una sola mano agganciata, modello e camera che si riprendono da soli (`cd6b949`, `409bf44`).
- 29/10/2026 sera — diagnostica 145416: impugnatura a martello come presa di riferimento (testa della racchetta virtuale
  sempre la cima, tutorial, figura, 3D, foto); «Sfida il campione» tolto dai minigiochi; webcam (WORK_PROGRESS,
  «Diagnostica 20261029-145416»).
- 29/10/2026 pomeriggio — diagnostica 131307 e foto della presa: presa di riferimento nel palmo (tutorial, figura, 3D,
  foto), direzione del piatto dalla rotazione attorno alla verticale, piatto a peso pieno, colpo normale imparato giocando,
  pallonetto relativo e più alto, schiacciata dalla spalla, chiusure a rete, palla corta al colmo, tempo sulla strada
  della palla, CPU Leggenda che impara dai vincenti (WORK_PROGRESS, «Diagnostica 20261029-131307»).

- 29/10/2026 — diagnostica 104712 (stesso schermo): pausa del P2 con punto rigiocato, «Ricollega il telefono»,
  schiacciata del P2 dal gesto, palle profonde non più sul rimbalzo; mira del piatto con il centro che si corregge,
  angolazione più sensibile, presa inclinata provata; colpo super potente; stanchezza. Pacchetti 2026-10-28.10.

- 28/10/2026 (sera) — split screen «Stesso schermo» (due telefoni, due viste) e schermo per ledwall 2×2 / 3×2 / area.

- 28/10/2026 (sera) — tolte le clip video dei colpi (tutorial di nuovo con l'animazione 3D, foto reali nella lezione);
  voce rifatta solo in inglese con una voce cartoon (47 clip, 10,8 crediti Higgsfield).

- 28/10/2026 — media reali Higgsfield nel tutorial (foto della presa e della posizione, 6 clip dei colpi verificate),
  intro con video, «NATPF Simulator» unico titolo e partner in secondo piano (125,5 crediti Higgsfield).

- 28/10/2026 — minigiochi arcade (`natpf_arcade.js`, `natpf_targets.js`, `natpf_events.js` riscritto): Target Rush,
  Precision, Combo Challenge, Survival, Radar, Campione; medaglie, record personali (`natpf-tennis.records`), XP.
- 28/10/2026 — audio: 5 brani nuovi + arrangiamenti per giro, 48 clip vocali registrate, effetti per tipo di colpo,
  volumi separati (`natpf.audio`).
- 28/10/2026 — redesign UI (`natpf-ui.css`), `natpf-intro.css` eliminato.
- 28/10/2026 — lanciapalle 3D (`natpf_ball_machine.js`) e tutorial con animazioni 3D verificate (T1, T2).
- 28/10/2026 — nuova memoria persistente (`CLAUDE.md`, `docs/PROJECT_MEMORY.md`, `docs/WORK_PROGRESS.md`,
  `docs/SESSION_HANDOFF.md`) e `scripts/ui-shots.mjs`.

### Stesso schermo e calibrazione del telefono (29/10)

- Sullo stesso schermo la verifica della calibrazione la conferma il computer (`natpf_split_ui._onCal`) in ogni momento
  della sessione, anche a partita in corso (Ricalibra sul telefono): mai solo dalla pagina «Collega».
- Calibrazione avviata dal telefono (comando): `CAL.lead` 1,5 s di attesa, poi il passo «fermo», poi `CAL.firstSettle`
  0,6 s di quiete da quando compare il primo gesto. Il percorso rapido accetta gesti da 40 °/s (accessibilità): non
  alzare la soglia per filtrare i movimenti involontari, usare i tempi.
- Schiacciata: `OUTCOME.smashSpeed` (40 m/s) e `minFlight` di `_launchBallToTarget` (il motore base non scende sotto
  0,45 s di volo: ogni colpo più veloce va passato da lì).

### Movimento di chi gioca (piano d'intercetto)

- `natpf_impact.planPlayerIntercept` muove chi gioca in tutte le modalità in singolo (contro la CPU, 1v1, stesso
  schermo, allenamento) e il Player 2; CPU e doppio usano `_predictBallIntercept`. La traiettoria prevista
  (`predictBall`) si ferma oltre il fondo solo nel verso in cui va la palla: l'avversario può colpire da dietro la sua
  riga (fino a 2,7 m oltre il punto d'impatto con i colpi in ritardo). Il piano non porta mai fuori dalla propria metà
  (diagnostica del 29/10: corsa a rete a vuoto e punti persi). Test: `test/natpf-corsa-a-rete.test.mjs`.

### Webcam: quella dello zip argon-tennis (decisione dell'utente, 29/10)

- L'utente ha chiesto di ristabilire il gioco con la webcam **prendendolo esclusivamente dallo zip argon-tennis**
  (motore base, app di AI Studio). Predefinita la webcam dello zip (`webcamMode` «argon» in `motion_controls.js`:
  `_argonFrame`, `_argonEvaluateHandTrail`, `ARGON_HANDS_OPTIONS`; nel motore `_argonWebcamSwing`). Non sostituirla
  con altri riconoscimenti senza chiederlo: le alternative restano solo per confronto (`?webcamMano=1`,
  `?webcamMovimento=1`). Del codice NATPF attorno restano solo file locali di MediaPipe, mancino, motivi d'errore,
  diagnostica e blocchi del menu/pausa. Il nome del gioco commerciale citato nel LEGGIMI dello zip non va nei file.
- Continuità e recupero attorno allo zip (29/10 sera, `src/natpf/webcam_argon_track.js`; le regole del colpo restano
  quelle dello zip): nei colpi veloci Hands perde la mano 100–170 ms (mosso) e la ritrova dall'altra parte, quindi un
  buco breve a metà immagine **si attraversa con la mano** (`bridgeMs` 260: niente flusso ottico, lo spostamento nel
  buco è il colpo); flusso ottico solo con la mano uscita dal bordo o non tornata, **sempre da un'immagine nuova**; a
  distanza i movimenti contano **in proporzione alla grandezza della mano** (`argonScale`, riferimento 0,07 ≈ 1 m, fino a
  ×2,5); **una sola mano agganciata** (la più grande al primo aggancio, poi solo una compatibile per velocità e
  grandezza: con più persone in vista prima partivano colpi finti); modello senza risposta da 2 s sbloccato, ricaricato
  dopo 2 blocchi; camera ferma da 2,5 s o chiusa dal sistema riaperta da sola (al massimo una volta ogni 5 s).
- MediaPipe Pose (corpo) **non** gira con la webcam predefinita: misurato sul video dell'E14 e a 2–3 m (vede il polso
  +9–17% dei fotogrammi, attraversa il mosso con 1–2 fotogrammi di ritardo) ma raddoppierebbe l'inferenza su un
  computer già all'85% di carico; Hands vede la mano a 2–3 m reali nell'81% dei fotogrammi. Se servirà oltre 3 m:
  Pose al posto di Hands solo quando la mano è più piccola di ~0,03 (non insieme).
- Misure ripetibili su un video della webcam: `scripts/audit/webcam-probe.mjs` (Hands o Pose fotogramma per fotogramma,
  Chromium senza schermo, passate separate: nella stessa pagina il caricatore globale di MediaPipe rompe Hands; immagini
  JPEG, non `<video>`: il seek senza schermo non aggiorna il fotogramma) e `webcam-argon-replay.mjs` (logica vera).

### Webcam: colpi dal movimento (28–29/10, ora solo con ?webcamMovimento=1)

- Il colpo con la webcam si riconosce **dal movimento nell'immagine** (`src/natpf/webcam_motion.js`: 96×72 in grigio,
  energia della differenza tra fotogrammi), non dalla forma della mano: con 15–30 fps e la luce di casa la mano nello
  swing è mossa e il modello delle mani la perde proprio nel colpo (diagnostica 20261028-214227-grj6: nessuna fonte nel
  59% dei fotogrammi, 4 colpi in 38 s).
- Il movimento è un colpo **solo quando può esserlo**: palla in arrivo a meno di 0,7 s dall'impatto, o al proprio
  servizio (`natpf_impact.webcamGate`). Fuori è chi si sposta o si sistema. Il lato (dritto o rovescio) viene dalla
  palla: il verso del movimento è quasi a caso (22 colpi su 36 dal baricentro). Direzione dal tempo, come per tutti.
- Istante: lo swing parte quando il movimento supera metà del proprio colpo tipico; il colpo vero è 94 ms dopo
  (`MOTION.lead`, misurato sul video della diagnostica 213510 contro il picco del telefono: scarto mediano ±25 ms). Il
  picco del movimento arriva troppo tardi per la palla (+95 ms, e a 15 fps la sua fine altri 60–130 ms dopo). La latenza
  del colpo della webcam può essere negativa (fino a −0,15 s, `eventLatency`).
- In partita non girano né il modello delle mani né quello del corpo (ognuno ferma il disegno 15–40 ms a inferenza: era
  il «browser che lagga»). Le mani servono solo nel menu (pannello, posa della racchetta); il corpo solo con «Segui il
  corpo». Nessuna pausa per la mano persa, solo per la camera ferma o spenta.
- Pallonetto, palla corta e tagliato dalla webcam non si riconoscono (dichiarato nella guida); la schiacciata parte da
  sola sulle palle alte. `?webcamMano=1` riporta il riconoscimento dalla mano, per confronto.
- Il dato «36 colpi su 36» della prima prova di fattibilità era gonfiato da fotogrammi ripetuti nel video decodificato:
  nelle prove sui video usare i fotogrammi veri (pts del file) e l'istante di cattura degli eventi `video.frame`.
- Verifica di ogni modifica al rilevatore della webcam: rigiocare i video delle diagnostiche (fuori dal repository: sono
  immagini di chi gioca) e confrontare con i colpi del telefono della stessa sessione e con gli istanti d'impatto
  (`piano`: t + tc).

### Dalla sessione del 28/10 sera (diagnostica + video, docs/WORK_PROGRESS.md «Analisi della sessione del 28/10»)

- Webcam: se non si apre si dice perché (`webcamOpenError`: occupata da OBS/Teams/Zoom, negata, assente, senza https).
  OBS che usa la stessa webcam la blocca al gioco: per registrarsi usare la registrazione della diagnostica.
- Telefono, verso: con un asse di calibrazione quasi orizzontale (telefono dritto nel pugno) il verso viene dal segno
  della sua parte verticale da coseno 0,1 (`weakRefMin`), con un gesto che gira attorno alla verticale per il 30%.
- Telefono, soglia: nel verso del colpo atteso (messaggio `ex` dal gioco) la soglia è il 40% del proprio colpo
  (`gesture-intent.TOWARD_FLOOR`), senza il termine della preparazione; nel verso opposto resta (lì il gesto è la
  preparazione). Dopo un colpo debole un gesto oltre il doppio chiude il rientro (`afterWeak`).
- Limiti noti: il pallonetto fatto alzando il braccio si vede soprattutto dopo il picco di rotazione, che decide il
  colpo; la direzione con il braccio angolato dà scarti del piatto oltre 45° che non contano.

### Correzioni gameplay e connessioni · 28/10

- Ogni connessione del telefono ha una generazione: chiudere un peer vecchio non deve modificare quello nuovo né programmare retry. Sul desktop assegnare il nuovo canale prima di chiudere il precedente.
- MediaPipe Hands/Pose: **i modelli girano nella pagina**. Nel worker (`webcam_inference.js`) queste soluzioni caricano con `importScripts` anche i file del modello (`.tflite`, `.binarypb`) e l'inizializzazione fallisce sempre (verificato il 28/10 sera con una webcam finta in Chromium: «importScripts … hand_landmark_lite.tflite failed to load»; prima il gioco restava sul solo movimento e la mano non si vedeva mai). Il worker resta solo a richiesta (`?webcamWorker=1`) e, se non parte o si chiude, il modello si ricarica nella pagina.
- Palla corta da `strokeIntent`: taglio verticale (|piano| ≤ .55), discesa ≤ −.12, forza ≤ .36 e ampiezza ≥15°. Un gesto riconosciuto con confidenza ≥.15 non è preparazione anche se lento rispetto al dritto tipico.
- `shortBall` nell'esito: scambio dopo rimbalzo, bersaglio entro linea servizio e contatto entro 7 m dalla rete. Se raggiunta in tempo, la qualità bassa dà palla debole e attaccabile; non forza la rete per la corsa automatica. Le regole geometriche d'impatto restano valide.


### Desktop A+ (04/11/2026)
- Autorizzato dall'utente dopo B6. Portable, Node già incluso, Edge/Chrome installato; niente Electron.
- Dati Windows `%LOCALAPPDATA%/NATPF`: CA/certificati, profilo edge o chrome, desktop.json; localhost stabile.
  `NATPF_DATA_DIR` è un override tecnico per prove. Migrare l'intera CA precedente prima del primo avvio.
- Fullscreen usa app + start-fullscreen: il kiosk nativo Edge è InPrivate e non conserva lo stato.
- Regole firewall solo NATPF, LocalSubnet, senza eliminare blocchi o regole di altri programmi.
- Le prove Linux non attestano comportamento UAC, PowerShell, DPI, monitor e telefoni su Windows.

### Eseguibili Windows con Electron (B7, 04/11/2026 sera)
- Richiesta: portatile e installabile, «tramite eseguibili». Codice in `natpf-desktop/` (Electron 45.2.2, versioni
  esatte), dettagli in `docs/DESKTOP_WINDOWS.md` §13, collaudo per l'utente in `docs/COLLAUDO_WINDOWS.md`.
- Il programma è solo un guscio: stesso `natpf-tennis/dist`, stesso server LAN di A+ avviato nello stesso processo,
  stessi dati in `%LOCALAPPDATA%\NATPF` (certificati condivisi con lo zip A+: i telefoni preparati valgono per tutti).
  Non si apre insieme allo zip A+ (stesse porte). Nessuna API Node nella pagina; fiducia nel certificato solo per i
  propri indirizzi/porte e solo per il PEM su disco.
- Versione dell'eseguibile = versione del gioco (`AAAA-MM-GG.n` → `AAAA.MMGG.n`): un cambiamento solo del guscio alza
  comunque la versione del gioco, come per i pacchetti.
- Costruzione da Linux senza wine: electron-builder solo per `win-unpacked`; installazione e portatile sono script
  NSIS propri compilati con il makensis della cache di electron-builder (`WriteUninstaller` a tempo d'installazione).
  Non tornare ai target `nsis`/`portable` di electron-builder senza wine o Windows.
- Firewall: una regola per l'eseguibile, solo `localsubnet`. Il portatile la chiede **prima** di avviare il server
  (così Windows non mostra il suo avviso, dove «Annulla» crea blocchi). Si tolgono le regole legate al **percorso del
  nostro eseguibile** (blocchi compresi), mai quelle di altri programmi (diverso da A+, dove gli eseguibili sono
  node.exe e msedge.exe, condivisi).
- Portatile: estrazione una volta per versione in `%LOCALAPPDATA%\NATPF\portatile\<versione>` (marcatore `.pronto`),
  non a ogni avvio come il target `portable` di electron-builder; `PORTABLE_EXECUTABLE_DIR` dice al programma che è
  il portatile (regola «NATPF Simulator portatile»).

### Schermo intero, monitor e peso Cloudflare (B8, 04–05/11/2026, versione 2026-11-05.1)
- Richieste: «full screen senza cornici in tutte le versioni», «adatta il fullscreen alla finestra/monitor o prevedi la
  calibrazione come nei videogiochi», «la versione cloudflare deve sempre pesare leggermente meno di 25 MB».
  Dettagli e motivi: `docs/DESKTOP_WINDOWS.md` §14; collaudo dell'utente: `docs/COLLAUDO_WINDOWS.md` §4, §4b, §5b.
- **Schermo intero nel gioco web** (`natpf_screen.js`): «senza cornici» = `window.natpfDesktop` (Electron) oppure
  `document.fullscreenElement` oppure `display-mode: fullscreen` (F11, Edge `--start-fullscreen`). Entrata automatica
  al primo evento **vero** (`isTrusted`; keydown non Esc né solo modificatori, pointerdown del mouse, pointerup, click),
  preferenza `natpf-tennis.fullscreen` = auto (predefinita) | off, `?fs=0` la spegne, con `navigator.webdriver` solo
  `?fs=1`: le prove automatiche non entrano a schermo intero da sole. `NatpfScreen` si crea per primo in `NatpfUi`
  (il suo ascolto in cattura deve precedere quello del menu, che ferma la propagazione). Dopo l'ingresso
  `navigator.keyboard.lock(['Escape'])`: Esc breve resta del gioco. **Esc ripetuto (tasto tenuto) si ignora** in menu,
  allenamento, guida e calibrazione. F = schermo intero (dopo il controllo della parola «natpf» del menu).
- **Electron**: mai `requestFullscreen` di HTML nel programma (consumerebbe il primo Esc): il gioco usa
  `window.natpfDesktop` (preload `natpf-desktop/src/preload.cjs`, contratto `{shell:'electron', version:1,
  isFullScreen, setFullScreen, toggleFullScreen, onFullScreenChange}`). Finestra creata già a schermo intero; barra del
  menu non «a scomparsa» a schermo intero (Alt non la mostra); scorciatoie in `before-input-event` (il gioco blocca i
  tasti sulla schermata iniziale); niente `kiosk`/`frame:false`. `setOpacity` lascia la finestra «a strati» su Windows:
  usarlo solo per un cambio vero di monitor.
- **Edge/Chrome (zip LAN)**: `--app` + `--start-fullscreen` predefinito, mai `--kiosk` (Edge: InPrivate). In finestra
  l'indirizzo porta `?fs=0`.
- **Area di gioco e calibrazione**: `screenArea({preset, area, margins}, w, h)`: `?area=` vince su tutto; altrimenti
  finestra meno i bordi per lato (percentuali della finestra, fino al 90%, area minima 480 × 360 px), poi il formato al
  centro. Precedenza: `?area=` > `?schermo=` (i bordi restano) > calibrazione salvata (`natpf-tennis.screen.cal`
  {v:1, preset, margins}) > vecchia chiave `natpf-tennis.screen`. Formati: full, 16x9, 16x10, 4x3, 3x2, 2x2.
  La calibrazione è un overlay figlio di `<body>` (segue l'area), instradato da `lobby._key`; ogni `lobby.go()` (anche il
  ritorno del chiosco) la annulla. I messaggi (`#natpf-toast`) stanno direttamente in `<body>`, sopra la calibrazione.
- **Inquadratura** (`natpf_camera.js`): `thirdPersonFrame(aspect)` = esattamente {45°, dolly 1} da 16:9 in su; più
  stretto tiene la larghezza del 16:9 sulla riga di fondo vicina (58°, poi dolly fino a 1,2; in verticale fino a 70°).
  `frameMatchCamera`: mai oltre z 25,3 (maxischermo del proprio fondo a 25,6 con la cassa nera dietro: oltre la camera
  sale alla stessa distanza), C16 e dolly non si sommano, in verticale +8° di elevazione. La forma è quella di
  `viewport()`, non `camera.aspect` (lo split lo cambia). Prima persona (`viewpoint.js`, condiviso col sito) e split
  invariati. `_onResize` aggiorna subito l'inquadratura (anche in pausa e con il menu) e il pixel ratio.
- **Peso Cloudflare**: niente `.wasm`/`.js` non SIMD di MediaPipe nei pacchetti (`offline-assets.mjs`,
  `MEDIAPIPE_EXCLUDED`); senza SIMD li prende `mediapipe_locate.js` dal CDN fissato. Nel gioco solo i loghi nominati
  (`natpf-site-plugin.mjs`). Lo zip si fa **solo** con `node scripts/pacchetto-cloudflare.mjs --out=… --zip=…`:
  deterministico, si ferma a `ZIP_LIMIT` = 25.000.000 byte, avvisa sopra 24.000.000; la CI lo esegue a ogni push.

### Colpo tipico solo dai colpi normali (B12, 07/11/2026)
- Il **colpo tipico** (`createTypicalModel`, riferimento della forza e dei gesti deboli) impara solo dai colpi normali
  dello scambio: `typicalModel.learn(peak, intent)` salta pallonetti, schiacciate (`TYPICAL.skip`) e i colpi
  riconosciuti dalla forma (`intent.byShape`), come la salita abituale (`createRiseModel.learn`). Le palle corte
  «dall'alto in basso» restano (senza calibrazione possono essere colpi compatti letti male: imparandole il riferimento
  si corregge da solo); senza la forma (telefoni vecchi) si impara come prima. Prima 4 palle corte (≈ 381 °/s)
  portavano il colpo tipico a 381 e il dritto successivo diventava piatto (forza 0,69 invece di 0,51). Il telefono
  simulato dei test (`test/phone-sim.mjs`) usa la stessa regola.
- Le azioni di GitHub sono alle versioni con Node 24 (checkout, setup-node e upload-artifact v7): Node 20 viene tolto
  dai runner il 16/09/2026.

### Gesti del tutorial sulla catena fisica del braccio (B13, 08/11/2026)
- `natpf_gesture_pose.js` calcola il braccio come una catena spalla-gomito-polso con segmenti di lunghezza fissa e
  limiti delle articolazioni; il telefono è rigido nel palmo (presa approvata). `gestureRig` restituisce le
  articolazioni vere e `natpf_gesture_demo.js` disegna il braccio intero dalla spalla, con busto, testa e manica.
  I tempi d'impatto risolti (`tC`) stanno nelle coreografie (un test li ricalcola) per non risolverli a ogni apertura.
- `test/natpf-gesture-physics.test.mjs` misura la fisica con soglie fisiche: direzione della mano all'impatto (dritto al
  massimo 60° dalla rete), gomito staccato dal corpo (≥ 0,1 m), carica dietro il piano del busto, una sola frenata
  (nessuna riaccelerazione oltre 0,3 m/s o 40 °/s), nessuna compenetrazione di avambraccio, gomito, dita e telefono con
  busto e testa. La fedeltà al riconoscimento resta in `natpf-gesture-pose` e `natpf-racchetta` (non toccati).
- **Dritto in diagonale (57°): non è un vincolo del riconoscimento** (B14, 08/11, verificato in modo indipendente). Il
  B13 lo attribuiva al riconoscimento; un'indagine ha ottenuto 33° dalla rete senza toccarlo (tutti i test verdi, 40/40
  letture, 0/72 errori con le prese di chi imita), quindi il limite veniva dalle bande dell'ottimizzatore B13 (torsione
  ≥ −25°, «~70° di carica», scatole estetiche). Vincoli veri trovati: carica ≤ ~148 °/s, perché con la calibrazione
  veloce (`site/js/tennis/gesture-intent.js:34-36`, soglia `:64` = max(rumore×5, riferimento×0,28), usata in
  `swing-detect.js:350,355`) una carica più veloce si legge come palla corta; picco letto > 652 perché
  `natpf-racchetta.test.mjs:512` vuole il colpo tipico entro 20 dal riferimento della calibrazione col braccio simulato
  (672); salita della presa a martello ≤ ~0,14 per la finestra del piatto (`natpf_stroke_intent.js:38`, ±0,12); salita
  della presa nel palmo > 0 (`natpf-racchetta.test.mjs:473`); avambraccio ≥ 28° dal raggio della camera
  (`natpf-gesture-anim`). L'ampiezza 85±3° e il limite di carica 180 °/s di `natpf-gesture-pose.test.mjs:133` sono
  scelte di progetto del B9. Il problema che si vede però è l'**orientamento**: in carica la cima del telefono (la
  racchetta virtuale di `stroke-shape.js`, 0,45 m lungo la cima) punta alla rete e all'impatto palmo e schermo guardano
  indietro, verso chi gioca; in un dritto vero la racchetta è portata indietro e all'impatto il palmo guarda la rete.
- Le coreografie si ritoccano con un ottimizzatore fuori dal repository (Nelder–Mead sulle pose chiave e sui ritardi,
  ogni candidato letto dal telefono simulato completo): descritto in `docs/b13/gesti-nuovi.md`.

### Gesti del tutorial: regole dal B14 (08/11/2026)
- **Niente fine tenuta lunga**: la specifica (`docs/b9/specifica-gesti.md:397-398`) vuole il fermo in fine colpo
  0,05–0,6 s e il ritorno entro 0,6 s dall'impatto, perché il rilevatore considera «rientro» solo un gesto opposto entro
  0,6–0,9 s (`swing-detect.js` recoverWindow 600, recoverLate 900). Con una fine ferma di 0,3–0,4 s il ritorno cadeva a
  0,7–0,9 s dall'impatto (oltre 0,9 s a 0,8×): chi imita e poi torna con decisione rischia un colpo fantasma. La fine si
  fa vedere con il disegno (fantasma «Fine», ciclo rallentato), non fermando il braccio.
- **Prove alle velocità intermedie**: `test/natpf-gesture-speeds.test.mjs` (0,85–1,2× e prese di chi imita a 1,2×). Nel
  B14 tre ritocchi verdi a 0,8×/1×/1,25× sbagliavano in mezzo. Prima di integrare un ritocco del moto si confrontano le
  letture larghe con `natpf-tennis/scripts/audit/letture-gesti.mjs` (sweep ogni 0,025×, semi, prese di chi imita;
  riferimenti della 2026-11-08.3 nell'intestazione).
- **Racchetta virtuale = cima del telefono** (`stroke-shape.js`, 0,45 m lungo la cima), faccia = schermo/palmo. Il dritto
  di oggi ha la cima verso la rete in carica e il palmo verso chi gioca all'impatto: per cambiarlo vedi
  `docs/b14/dritto-orientamento.md` (blocchi misurati).
- La prova `tools/e2e/natpf-gesti-fotogrammi.mjs` senza `OUT` riscrive `docs/b9/img/C-anim-*.webp`: è voluto (documenti
  aggiornati), ma nei passi che non toccano l'animazione si dà `OUT` in una cartella di prova.
- Disegno: palla dietro il telefono all'impatto a metà opacità con il contorno tratteggiato; busto pieno con contorno
  chiaro leggero (sul fondo la testa spariva) e velo sulle parti del braccio dietro il busto; fantasmi di sola mano e
  telefono; ombra della mano solo con la camera ferma; prototipo della racchetta fantasma spento (`GHOST_RACKET`).

### Prove nel browser: niente pausa di rete come fermo immagine (B13, 08/11/2026)
- `main.js` scarta di proposito un gesto fatto più di `INPUT_TIME.maxAge` (0,8 s) dopo l'ultimo fotogramma registrato, e
  con `A.netPause` i fotogrammi non si registrano. Una prova che ferma il gioco con la pausa di rete e poi manda un gesto
  è instabile sui runner lenti (era `gesture-calibration.mjs:73`). Il fermo immagine si fa facendo avanzare il motore con
  dt = 0 e fermando il disegno; `CPU_THROTTLE=4` simula un runner lento (`docs/b13/gesture-calibration-ci.md`).

### CPU Leggenda: criteri sempre controllati e taratura del B16 (08/11/2026, ramo `b16-legend`)
- **`audit:legend` è un controllo, non un rapporto**: gira su GitHub come ultimo passo del job del gioco (`natpf-tennis.yml`,
  ~70 s, dopo test, build e controlli del pacchetto: un passo fallito fa saltare quelli dopo, così non li nasconde) e
  `npm test` ha un torneo ridotto sui due profili forti (`natpf-legend-b16.test.mjs`, 8 semi × 75 punti, soglie sui punti:
  ≤ 33,5% a «tennista», ≤ 46% a «preciso»). Prima nessuno lo eseguiva: due criteri erano già rotti prima del B15 (da quando non
  è registrato) e il B15 li ha peggiorati senza che una prova fallisse. Chi cambia il colpo di chi gioca (forza, mira, traiettoria)
  deve guardare anche questo.
- **Rumore**: 8 semi × 300 punti contro «preciso» sono ~200 game, ± 3 punti percentuali; cambiare un parametro rimescola
  tutte le partite. Si decide con 16 semi o con semi diversi (201–208), poi si controlla con quelli dell'audit.
- **Torneo ridotto di `npm test`** (`natpf-legend-b16.test.mjs`, ultimo test): è deterministico (semi fissi, stesso risultato
  a ogni esecuzione), quindi non «balla», ma il margine è stretto: contro «preciso» chi gioca vince il 42,8% dei punti con
  la soglia al 46% (circa 3 punti), contro «tennista» il 25,7% con la soglia al 33,5%. Una modifica qualsiasi al motore
  che cambi gli errori della CPU o di chi gioca (per esempio la tappa 2 dell'audit del gameplay) rimescola le partite e
  può farlo fallire senza che la Leggenda sia davvero più debole: allora si guarda prima `npm run audit:legend` (300 punti,
  tutti i criteri) e, se lì i criteri passano, si ritarano le soglie e il commento del test con i numeri nuovi. I numeri si
  rigenerano da `natpf-tennis` con
  `npm run audit:legend -- --table --difficulty=leggenda --profiles=tennista,preciso --points=75` (stessi semi del test,
  ~10 s; colonne `puntiG`, `erroriCPU`, `incrociato`, `infinitiPct`).
- **Taratura (`LEGEND` in `natpf_legend.js`)**: accelerazione / frenata 20 / 28 m/s²; pressione degli scambi lunghi sulla
  CPU dal 20° colpo (chi gioca a Leggenda dal 10°); chiusura degli scambi lunghi misurata (forza +0,15, larghezza +0,25 m,
  chiusura 0,72–0,85); errore da forza × 0,65 nell'esecuzione (`powerErr`) con la **scelta che stima il rischio con le
  regole di Esperto** (margine: con il rischio vero la CPU gioca quasi solo colpi forti e profondi contro chi sbaglia molto,
  entropia sotto 2,3); +0,01 all'incrociato stretto (`angle`: con la temperatura 0,014 raddoppia il peso di quel colpo,
  che passa dal 7–10% al 15–17% dei colpi contro «medio» e «amatore»; non serve ai criteri, che senza passano tutti con gli
  incrociati al 31,8% contro «medio» e limite 30: dà margine a quel criterio e si può togliere se risulta ripetitivo).
  Velocità massima, portata, reazione e lettura della palla non cambiano (vincoli di credibilità e criteri: reazione
  p10 ≥ 0,12 s, velocità ≤ 8,8 m/s).
- **Criteri che si toccano tra loro**: errori della CPU ≥ 2% contro «amatore» (con l'errore ridotto anche sulla parte base
  scende a 1,4–2,1%), entropia ≥ 2,3 contro i profili deboli (colpi più profondi o rischio vero la abbassano), incrociati
  30–50% (una preferenza per tutti gli incrociati porta «bambino» oltre il 50%; senza preferenza per l'angolo stretto il
  più basso è «medio» al 31,8%, sopra il limite ma con poco margine).
- **Vincenti di chi gioca contro la Leggenda**: tutti con la CPU oltre 2,3 m dalla palla, quasi sempre già al suo posto
  (angoli veri alla riga laterale a 118–133 km/h). Non si correggono con più portata (sarebbe un trucco visibile).

### Colpi sensibili al gesto (B15, 08/11/2026, ramo «colpi»; audit in `docs/b15/audit-colpi.md`)
- **Misurare con la persona vera**: `scripts/audit/colpi.mjs --mode=reale --hand=both` manda la distribuzione dei gesti di
  chi gioca davvero (tempo +0,35 ± 0,45 unità, piatto ±12°, gesto 1 ± 0,3 del colpo tipico, dalle diagnostiche) nelle
  funzioni vere (centro della mira, `strokeIntent`, motore con il ritmo). Le sequenze di colpi uguali (mira tenuta, colpi
  forti di fila) dicono se un riferimento che impara spegne la varietà; la persona vera dice se la varietà si vede. Il
  mancino si prova allo specchio: x, profondità e tipi devono essere identici cambiati di segno.
- **Il centro della mira si giudica per partita, con il rumore** (`--mode=partite`: 24 partite da 80 colpi, |mediana x| di
  ogni partita, partite oltre 1 m da una parte, errore del centro; seme sbagliato, seme diverso nei due versi, riferimento
  girato, mira tenuta nei primi colpi). Le misure senza rumore (sequenze) o con le partite mescolate (x p50 di tutte insieme)
  nascondono il difetto: nel secondo giro B15 dicevano «meglio» e per partita era peggio.
- **Centro della mira** (`createAimModel`, `AIM`): **invariato dal 29/10** (verifyDev 35, biasDev 12 / commonDev 8, pull
  0,3, drift 0,03). Mira tenuta e riferimento sbagliato (seme della calibrazione, corpo girato) per il centro sono la stessa
  cosa: si distinguono solo da quanto durano. Nel B15 provati e tolti (terzo giro, `docs/b15/audit-colpi.md` §3): isteresi a
  due velocità, seconda verifica del seme, soglie 25°, drift 0,01 (tenevano la mira tenuta senza rumore ma per partita, con il
  rumore, lasciavano più palle da una parte: semi sbagliati 0,96 m ai colpi 21–40 e 0,90 ai 61–80, contro 0,93 e 0,66 del
  centro di prima; seme giusto con l'errore del centro fino a 8,9° contro 4,4°; riferimento girato di 26–32° ancora a 11°
  dopo 60 colpi contro 4°); e una ventina di
  intermedi: il «pull» di un verso più tardo o lento peggiora il seme diverso nei due versi, il «pull» comune o la verifica
  più decisi prendono di più la mira tenuta con dritto e rovescio. Opzione misurata e non adottata: `commonDev` 6.
- **Mira del piatto**: `INTENT.faceSpan` 14 (mira piena a 17°, 10° = 0,5): da −15° a +15° 5,6–6,0 m (prima 3,9–4,2), ma
  20° e 30° cadono nello stesso punto e un grado di errore del centro vale 0,25 m invece di 0,18.
- **Forza**: due pendenze della parte relativa al colpo tipico (`strokePower(peak, ref, gain)`): `relGain` 0,9 per l'esito
  (velocità, profondità), `classGain` 0,6 per il tipo di colpo (`typePower`: `flatPower`, `dropPower`, `lobSoft` sono tarati
  lì, e il tutorial con loro) e per tutte le soglie della forza: colpo super e barra della potenza, schiacciata dal gesto
  (`smashAt`, `SMASH_FROM.power`), colpo potente del motore (stelle e scossa, 0,7), «perché niente super» delle
  diagnostiche (`superStrength(intent, d)`: `SUPER.power` 0,86 è il 10 % più forte dei registri del 29/10). Webcam, CPU e
  registrazioni senza `typePower` (o con `null`): vale `power`. Le diagnostiche registrano `forzaTipo` accanto a `forza`
  quando c'è.
- **Colpo tipico** (`TYPICAL.keep` 24, era 9): il riferimento della forza relativa è la propria scala di gioco; dieci colpi
  forti di fila restano forti (prima la forza tornava a 0,65 dal sesto). Con il colpo tipico che impara scambia 17 colpi su
  400 tra piatto e top spin; su 1200 colpi circa il 7 % dei piatti diventa top spin (spostamento sistematico).
- **Velocità della palla**: nel motore la decide l'altezza a cui deve passare sopra il nastro, non il volo base (che vincola
  solo i colpi morbidi). Altezza con la curva morbidezza^1,5 (`OUTCOME.clearCurve`, su tutti i colpi tranne il pallonetto),
  TOPSPIN morbido fino a 2,5 m (`topClearSoft`), top spin che cresce con la forza (`topSpinPower` 8), tetto del volo base 1,5
  (era 1,2). In cima la velocità non cresce oltre ~124 km/h (altezza minima sul nastro, volo minimo 0,58 s, passi di 0,01 s
  di `flightForClear`). Schiacciata 48 m/s (era 46) perché resti ≥ 1,4 volte il piatto pieno (29/10).
- Effetto dei tagliati: l'effetto laterale va dalla parte del campo in cui sta chi colpisce (`R = p.pos.x >= 0`), non dipende
  dalla mano.
- Test `natpf-colpi-b15.test.mjs`. Il ritmo (`RHYTHM`, 28/10) e le soglie del tipo di colpo non cambiano.

### Mira del telefono: sensibilità dello staff e misura per partita (B16, 08/11/2026; guida `docs/GUIDA_MISURA_MIRA.md`)
- Decisione (d) dell'utente sulla mira più sensibile del B15: «ok ma come lo misuro?». La sensibilità è un'**opzione dello
  staff** nel **pannello dello stand** (Ctrl+Maiusc+K o 3 s sul marchio; pulsante `data-staff="aim"`, un clic passa alla
  successiva: **alta 17°** di base → media 20° → bassa 23°; chiave `natpf-tennis.mira`, `src/natpf/natpf_aim_level.js`),
  **non nelle Opzioni** dove un visitatore potrebbe cambiarla (revisione del B16); il reset del chiosco non la tocca.
  Cosa vuol dire lo dicono l'avviso dopo il clic («Mira del telefono: media (20°) · un po’ meno angolate dell’alta; resta
  salvata», `natpf_kiosk.js` `AIM_HINT`) e il `title` del pulsante, **non un paragrafo nel foglio**: a 1024 × 600 il foglio
  del pannello dello stand è alto 554 px su 555 disponibili, una riga in più porta «Chiudi» fuori vista (successo nella
  prima integrazione del B16, con una nota di tre righe). `tools/e2e/natpf-menu.mjs` controlla foglio senza scorrere e
  «Chiudi» in vista a 1366 × 657, 1024 × 600 e 1280 × 720. Niente percorsi `docs/` nei testi per l'addetto: nel
  programma installato e sul sito quei file non ci sono.
  I gradi sono quelli della mira piena (`natpf_stroke_intent.AIM_FULL`): `faceAimFromDev(dev, full)` usa
  `full − INTENT.faceDead` come scarto; senza `full` vale la base `INTENT.faceSpan` (alta = `faceDead + faceSpan`, prova
  che lo tiene). Arriva a `strokeIntent` con `aimFull` da `natpfSwingToEngine` (telefono di questo computer, P1 e P2 dello
  stesso schermo); tocca solo `intent.face` (tipo, forza, profondità identici). Nella sfida tra due computer dovrebbe
  valere l'opzione del computer a cui è collegato il telefono (il colpo si legge lì; non provato).
- **Misura** (`diag_metrics`: `SIDE`, `sideJudge`, `sideBalance`, `sideTotals`, `gainCompare`, `sideLines`): x del punto
  di caduta calcolato dei colpi del telefono (evento `racchetta`) nel riferimento di chi colpisce (P2: x del campo cambiata
  di segno), servizi, allenamento (riscaldamento compreso), minigiochi e webcam esclusi. Tre misure, due usi:
  - **verdetto** sulle metà del campo (x > 0 / x < 0): **sbilanciata** con almeno il **70 %** in una metà su almeno **20
    colpi** (numeri principali della riga: metà sinistra · metà destra; a parte oltre 1 m a sinistra · al centro · oltre
    1 m a destra), più la |mediana x| per blocchi di 20 colpi, e **|piatto mediano|** (`racchetta.piatto` dei colpi non
    `ricavato`; oltre **0,20** su almeno 20 colpi «riferimento storto: ricalibrare»): servono a **scoprire una
    calibrazione sbagliata**, non a confrontare le sensibilità;
  - **palle angolate** (oltre **2,5 m** dal centro): il guadagno, per **confrontare le sensibilità**; media per
    sensibilità senza le partite storte; `gainCompare` dice se una differenza si distingue dal caso (oltre due errori
    standard, da 5 partite per parte; errore di ogni media = max(deviazione/√partite, √(p(1−p)/colpi))).
  Sensibilità di una partita = quella dei colpi (`racchetta.miraPiena`); se nessun colpo l'ha ma la registrazione la
  conosce, «sensibilità non applicata» (pagina del telefono senza la forma del colpo), mai quella dell'evento `partita`.
  Le partite si separano con l'evento `partita` (un `startNewMatch`, ripetuto con `continua` all'inizio di una parte
  nuova); ogni `racchetta` porta `mano`, `fonte`, `miraPiena` e, se serve, `allenamento`/`minigioco`; la sessione
  `gioco.mira`/`gioco.miraPiena`.
- **Banco** (`scripts/audit/colpi.mjs --mode=lato --runs=400`, persona vera, partite da 40 colpi; mancino identico):
  calibrazione giusta → sbilanciate 1,3 / 1,0 / 1,5 % (alta / media / bassa), riferimento storto 0 su 400 con tutte e tre
  (|piatto mediano| massimo 0,18 / 0,15 / 0,13; con partite da 30 colpi 0–1 %, da 20 colpi 1,5–3 %), palle angolate
  37,3 / 34,0 / 30,9 % ±7,4 punti per partita (±8,3 a 30 colpi); seme sbagliato di ±15° → sbilanciate 40,5 / 37,8 /
  32,3 %, storto 76 / 69 / 57 %, |mediana x| 1,27 / 1,13 / 1,00 m. Lettura: la sensibilità attenua un riferimento
  sbagliato di circa il 10 % di metri per passo e cambia di pochi punti le partite sbilanciate (per vederlo servirebbero
  migliaia di partite); la calibrazione lo cura. Il guadagno alta − media (3,3 punti) richiede circa 80 partite per
  sensibilità (100 a 30 colpi), alta − bassa (6,4) circa 21: con 9–15 partite non si può dire (con 15 la media risulta
  più angolata dell'alta una volta su cinque per caso).
- **Regola della guida**: calibrazione a posto → resta «alta»; partite sbilanciate o storte → ricalibrare; se dopo la
  ricalibrazione restano più di una su cinque, «media» ne toglie solo un poco; il confronto alta/media si fa con circa 80
  partite per sensibilità e la riga «confronto del guadagno».
- Comando per lo staff: `node scripts/audit/lato-palle.mjs <zip o cartelle…>` (parti dello stesso `gruppo` insieme, totale
  di tutti i pacchetti per sensibilità con `sideTotals`, confronto del guadagno). Prove: `natpf-mira-sensibilita.test.mjs`
  (anche il pulsante del pannello dello stand), `natpf-mira-lato.test.mjs`, nel browser `tools/e2e/natpf-mira-lato.mjs`
  (il percorso della guida).

### Decisioni dell'utente sull'audit B16 e tappa 1 (B18.1, 10/11/2026; documenti in `docs/b18/`)
- **Ogni opzione o livello nuovo va detto all'utente con il percorso per accenderlo** («dimmi sempre come attivarli»).
- **Formato in fiera** (punto decisivo sul 40-40, servizio che passa come nel tie-break: A, B B, A A…): opzione dello staff
  **spenta di base**, nel pannello dello stand (Ctrl+Maiusc+K o 3 s sul marchio NATPF → «Formato in fiera»), salvata in
  `localStorage` `natpf-tennis.formatoFiera`; sul web/LAN anche `?formato=fiera` / `?formato=classico` (solo per quella
  pagina). Con l'opzione accesa «al meglio di 5» diventa al meglio di 3; nella sfida tra due computer decide l'host
  (regola negli snapshot). La scelta del menu resta separata dal valore in partita (`gamesToWinChosen`). Voce: nessuna clip
  «deciding point», si usano «Match Point»/«Game Point». `docs/b18/r4-formato-fiera.md`.
- **«Nuovo giocatore»** (fine partita, risultato dei minigiochi, pannello dello stand): azzera nome, tutorial visto (anche
  il corto), calibrazione, colpo tipico, prototipi, riferimenti di forza, mano, colpi speciali imparati e record di oggi di
  «Ospite», **senza scollegare il telefono** (niente `link.forget`). Livello e formato restano. Record, medaglie ed
  esperienza per nome e per giorno. Il reset del chiosco toglie le stesse cose (in più scollega il telefono, come prima).
  `natpf_new_player.js`, `docs/b18/r1-fine-partita-e-visitatori.md`.
- **Motore (R2)**: stanchezza che si ricarica tra i punti e riparte da zero a ogni partita; in risposta al servizio palla
  «alta» solo da 2,3 m e mai schiacciata con un gesto che sale (le palle del lanciapalle non sono risposte); servizio
  giudicato sul proprio servizio abituale (primi 3 imparati), più forte mai più lento, «Gran servizio» sulla propria forza
  (a freddo 0,75, al massimo 0,9); palla corta solo con gesto nettamente morbido (`dropSoft` 0,28, `dropDeepRise` −0,4 per
  la presa a racchetta); «palla passata» giudicata dove era la palla al gesto (latenza ≥ 0); risposta difensiva della CPU a
  Pro. `audit:legend` 69/69. `docs/b18/r2-motore-piccolo.md`.
- **Scritte e istruzioni (R3)**: «Fuori/In rete · troppo presto/tardi» dal primo rimbalzo previsto con la fisica (non dal
  bersaglio), telefono = computer (anche il P2 nello stesso schermo), «Punto avversario» solo a punto finito; istruzioni del
  servizio sul grande schermo con conto per chi serve; Precision e Combo per principianti; due misure nuove in diagnostica
  (variazione del gesto, tempo dal rimbalzo) con `docs/b18/misure-con-persone.md`.

### Tappa 2 gruppo 1 e stesso schermo (B18.2, B20; 11/11/2026, versione 2026-11-11.1)
- **Lavoro e costi**: l'utente vuole risposte sintetiche e bada ai costi, ma non vuole lavoro superficiale: un agente per
  blocco, **revisore indipendente** prima dell'unione, correzioni fatte dallo stesso agente (riprende il suo contesto).
  I limiti d'uso (5 ore e settimanale) fermano gli agenti: le modifiche restano nelle worktree, si riprende con un messaggio
  all'agente. Un workflow ripreso con `resumeFromRunId` riusa i risultati solo fino alla prima chiamata nuova: per
  riprendere due tracce parallele conviene uno script nuovo che legge i risultati dal `journal.jsonl`.
- **Servizio contro la CPU (D11)**: personaggi fermi a ogni servizio e a fine punto (`_natpfStandStill`); la risposta della
  CPU dipende dal servizio ricevuto (velocità vera, strettezza, tempo), `natpf_skill.SERVE_WEIGHT` per livello (**ogni
  livello nuovo contro la CPU deve avere la sua riga**); lettura in ritardo del servizio forte e angolato. Banco
  `npm run audit:serve`. A Casual la base dell'errore in risposta è stata alzata (0,135 → 0,15, `lateBase` 1) per
  compensare gli ace «regalati» spariti: scelta dell'agente, da confermare con l'utente.
- **CPU che sbaglia per la pressione (D1, D9)**: l'errore dipende da allungo, corsa e (a Casual) palla veloce, non dalla
  lunghezza dello scambio; a Pro la palla oltre 2,5 m è letta fino a 0,19 s in ritardo e le corse lunghe stancano la CPU
  (`cpuErr`, `cpuWide`, `cpuFatigue` in `SKILL_LEVELS`); spente nel 1v1 tra persone. Banco
  `scripts/audit/cpu-pressione.mjs`. **Decisione dell'utente (11/11): Pro resta com'è** anche se «amatore» scende dal 76 al
  62–64% dei game e gli scambi si allungano (la partita tirata per tutti la darà il livello Evento); scartata l'opzione
  della CPU che si stanca prima (medio all'87%, fuori dalla fascia 70–85).
- **Stesso schermo (B20, decisioni dell'utente sull'audit B19)**: chi batte per primo = **Sorteggio** di base (pagina
  «Partita» dello stesso schermo → «Altre impostazioni» → «Batte per primo»); **Formato in fiera** a tre valori nel
  pannello dello stand (No · Solo stesso schermo · Sì), di base **Solo stesso schermo** (il vecchio `0` salvato diventa
  «Solo stesso schermo»: chi vuole il classico sceglie «No» una volta); **Scambio che si scalda** = opzione dello stand,
  spenta di base (dal 10° colpo la palla accelera per tutti e due; il tagliato resta tagliato); **Rivincita** dai telefoni
  (parte quando l'hanno toccata tutti e due). Non voluti dall'utente: tempo massimo, aiuto per il più debole, «chi vince
  resta». Il Player 2 ha risposta al servizio, schiacciata ed effetto laterale del tagliato come il Player 1 (vale anche per
  il P2 della sfida tra due computer). `docs/b20/tappa-a.md`.
- **Video generati (B21)**: l'utente ha accettato un trailer generato e clip di gameplay **sfocate** come sfondo del
  tutorial; resta valida la regola del 28/10 per le dimostrazioni dei gesti (animazione 3D e foto). I video si generano da
  fotogrammi veri del gioco (SHOTS=1 di `tools/e2e/natpf-rally.mjs`), senza audio. Tetto di spesa deciso dall'utente caso
  per caso (120 crediti Higgsfield l'11/11, spesi 86).
- **Repository pubblico dall'11/11/2026** (scelta dell'utente per avere le GitHub Actions gratuite: con il budget a 0 $ i
  minuti inclusi erano finiti e le corse restavano in coda senza partire). Conseguenze: **mai** mettere chiavi, token,
  indirizzi e-mail o dati personali nei file o nei messaggi di commit; i segreti di R2 restano solo nei Secrets di GitHub.
  Una corsa rimasta in coda non riparte da sola dopo lo sblocco: rilanciare con workflow_dispatch.


## Aiuto al più giovane nello stesso schermo (decisione dell'utente del 12/11/2026)
- «Non voglio che nessuno abbia un vantaggio di punti, anzi voglio solo che il vantaggio si traduca nel gameplay»: mai
  punti regalati (niente 15-0 o 30-0); l'aiuto è solo di gioco e va dichiarato a schermo. Variante in gioco: `HELP.G` in
  `natpf-tennis/src/natpf/natpf_duo_rules.js` (margine sul tempo, palla un po' più lenta verso il più giovane, colpo più
  in fondo). Obiettivo di taratura: bambino contro adulto medio circa 40%, mai oltre il 50%.

## Telecomando dello staff e schermo del gioco (B27, 12/11/2026)

Richiesta dell'utente allo stand: gioco sul ledwall 2×2 (1024×1024, «Estendi») senza OBS; un telefono dello staff
come telecomando, «installato una volta per tutte», che copra tutti i casi. Dettagli e matrice: `docs/b27/telecomando.md`.
- **Il foglio del telecomando è sul ledwall, lo vede il pubblico**: QR e codice non bastano e valgono solo a foglio
  aperto (indirizzi temporanei `telecomando-abbina-…` e `telecomando-codice-…`, 5 minuti dall'apertura, un tentativo
  per collegamento). Chi li presenta aspetta **«Conferma» sul computer** con lo stesso numero di tre cifre: solo con un
  clic o un tasto veri (`event.isTrusted`), mai dal telecomando. Dopo l'abbinamento il foglio non mostra QR. Ogni cosa
  nuova messa in quel foglio va pensata come pubblica.
- **Ruolo separato dalla racchetta**: indirizzi `telecomando-…` (la racchetta `racchetta-tel-…`), chiave del QR `tc`
  (la racchetta `s`), hello con `role:'remote'` preteso dal gioco e rifiutato dalla racchetta (`link.js`). Il
  telecomando non manda mai sensori né colpi (`REMOTE_COMMANDS` non ha comandi di gioco).
- **Abbinamento persistente, chiave che non viaggia**: indirizzo fisso e chiave nascono alla conferma, restano in
  `localStorage` del gioco (`natpf-tennis.telecomando`) e del telefono (`natpf-telecomando`), cambiano a ogni
  abbinamento confermato e con «Scollega». Alla ripresa prova reciproca HMAC-SHA-256 (`crypto.subtle`), prima il gioco
  poi il telefono; senza https niente ripresa (nessuna strada in chiaro). Il gioco ascolta sull'indirizzo fisso solo se
  abbinato (senza abbinamento nessun collegamento: nessun effetto sul web). Un solo telecomando.
- **Il telecomando non apre finestre di Windows né link**: `NO_REMOTE` in `natpf_remote.js` (confirm, salvataggi,
  `target=_blank`, «Conferma»). Chi aggiunge un `confirm()` nel gioco lo aggiunge lì (lo controlla un test).
- **In campo frecce e OK spenti** (la tastiera muove il giocatore e ↑ lancia la palla); Indietro = pausa. Nel tutorial
  dei gesti e nella lezione ↑ ↓ spente (arriverebbero al motore). Fuori dal campo
  i comandi sono gli stessi tasti della tastiera (menu, guida, tutorial, calibrazione dello schermo, lezione) o il fuoco
  tra i pulsanti dello strato aperto (pausa, pannelli, fine partita, nome). Strati e regole: `natpf_remote_map.js`
  (puro, provato); ogni schermata nuova del gioco va aggiunta lì e nella matrice.
- **Monitor del gioco**: domanda all'avvio con ≥2 monitor e nessuno scelto (o salvato assente e nessun monitor con la sua
  misura); proposta il monitor quadrato, poi il più grande non principale; 30 s (o «Decidi tu») e vale la proposta: si
  salva solo se non c'era nessuna scelta; con un monitor salvato che manca vale per quell'avvio e la scelta resta
  (`displayAnswer`); un clic salva sempre. La misura del monitor si salva con la scelta (`desktop-app.json`: `display`). Dalla pagina:
  `window.natpfDesktop.displays` (preload v3). Il pannello dello stand mostra «Schermo del gioco» solo con il ponte.
- **Pannello dello stand senza posto**: le voci nuove vanno nella riga in basso (`staff-actions`), non nella griglia
  (tre file: «Chiudi» in vista a 1024 × 600, 1366 × 657 e 1024 × 1024).

## Processo di lavoro con gli agenti (decisione dell'utente del 12/11/2026, 23:20 UTC)
- «Il revisore indipendente magari serve alla fine, ottimizza i processi»: per una serie di blocchi un agente per blocco
  senza revisore, consegna dopo ogni blocco, e **un revisore indipendente solo alla fine della serie** sul codice unito.
- Al più due agenti insieme sulla macchina da 4 processori; non mandare messaggi a un agente di un workflow mentre gira
  (ne nasce una seconda copia che lavora sugli stessi file): per cambiare il compito fermare e rilanciare.
- Dopo un limite d'uso: rilanciare lo script del workflow facendolo continuare nella worktree esistente (senza
  `isolation: 'worktree'`), e far unire prima il ramo principale aggiornato se nel frattempo è andato avanti.

## Decisioni dell'utente del 13/11/2026 (revisione finale della serie B23–B33)
- Classifica delle partite: prima le partite vinte, poi le perse (dentro ciascun gruppo per punteggio).
- Velocità dei colpi: km/h veri della palla (× 3,6), stessa scala per servizio e scambio; il «colpo più veloce» di fine
  partita conta solo colpi finiti in campo.
- Leggenda e salita a rete: la proposta «a Leggenda chi gioca non sale a rete da solo dopo un attacco» (B34) è stata
  **tenuta da parte** (revert `e5fa4bd`) e al collaudo del 13/11 l'utente ha detto «resta com'è»: oggi la salita
  automatica del B31 vale a **tutti** i livelli, Leggenda compresa (`natpf_net_play.js` `approachOf`, nessuna eccezione).
- Scritte «in corsa / in allungo»: solo con la corsa forte.

## Decisioni dell'utente del 13/11/2026 (pomeriggio): stand, modalità fiera, gioco

- Precisione dei colpi dal telefono dopo B35a: «direi bene» (collaudo con la 2026-11-13.9).
- Scambi troppo lunghi: dal 20° colpo colpi forti e speciali sempre più probabili per tutti e due i lati, perché lo
  scambio porti a un risultato (B42).
- Durante la partita meno testi vicino al tabellone: niente righe «Formato veloce» o «al meglio di tre», al più
  un'etichetta nel tabellone (B43).
- Fine partita: card della partita con trofei (proposta v2 sulla tavola di design) e personaggi 3D animati per il
  giocatore 1 e 2 (B40). «Ricalibra» a partita in corsa resta com'è; i tre riquadri di fine partita vanno bene.
- Modalità fiera (B41): telefoni dello staff abbinati una volta e sempre collegati; per ogni visitatore scambi di prova
  (calibrazione «Giocando»); contro la CPU batte sempre il visitatore; visitatori numerati da soli («Visitatore 12»);
  «Sono pronto» sul telefono e partenza automatica quando sono pronti tutti.
- Stand: solo il ledwall e il solo mouse dello staff (B38 tastiera a schermo, B39 stand con il solo mouse).

