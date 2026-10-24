# MEMORY.md · NATPF Simulator

Memoria di lavoro del progetto: da leggere all'inizio di ogni sessione e da aggiornare alla fine di ogni attività.
Non contiene password, token o altri segreti.

Ultimo aggiornamento: 22 ottobre 2026, notte (racchetta virtuale; unione dei due branch; passo 17 fasi A–E) · **branch unico**
`claude/friendly-fermat-dwv2w2` (ripartito da `feature/natpf-tennis-v2`, che contiene tutto il lavoro precedente; i
branch `backup/*` e gli altri `feature/natpf-*` sono già inclusi; il 22/10 vi è stato unito
`claude/determined-tesla-8dgaks`). Stato per chi riprende: §0.

## 0. Per chi riprende (22/10, notte)

- **Sera del 23/10** (ultimo lavoro): segnalazioni di gioco e sfida online, `docs/NATPF_SEGNALAZIONI_2026-10-23_SERA.md`
  (commit `4699a2e`…`dbc41b4`). Tutto provato in automatico, prova fisica da fare (§9 del documento). **Decisione aperta,
  chiesta alla persona**: un relay perché la sfida online funzioni su ogni rete (§8.4). Senza, il gioco dice quando la
  rete blocca il collegamento diretto.

- **Un solo branch: `claude/friendly-fermat-dwv2w2`.** Contiene il lavoro delle due sessioni del 22/10: la seconda,
  su `claude/determined-tesla-8dgaks`, è stata unita qui con un merge (anche l'ultimo commit `40d58b2`, nel
  checkpoint 10). Non si lavora più su altri branch; commit nuovi fatti altrove vanno portati qui con un merge (mai
  reset né force push). La CI automatica del repository non parte sui branch `claude/*`: la CI del sito si fa in locale
  (`SESSION_HANDOFF.md`, «Come riprendere»).
- **Richiesta in corso (22/10 notte): gameplay il più vicino possibile al tennis del gioco di riferimento indicato
  dall'utente** (benchmark vincolante; nome verificato; confronto e cause in `docs/NATPF_RACCHETTA_VIRTUALE.md` §6;
  il nome del gioco non va nei file, regola di marchio). Passo 17 di `SESSION_HANDOFF.md`, fasi A–E.
- **Fatto** (codice e test automatici, con sensori e mani simulati): la racchetta virtuale ai passi 1–14; fase A
  (riferimento, audit della mira e del movimento); fase B: forza degli swing corti dal picco vero, diagnostica con una
  sola registrazione dell'esito, partita intera col telefono della pagina storica (cause nella prova, 17/17), prove
  della CI della pagina storica 20/20 a macchina scarica e uguali con il rilevatore di prima sotto carico (difetto 6: non
  è il rilevatore, sono prove sensibili al carico), presa del 19/10 verificata e salita abituale imparata
  giocando per chi salta la calibrazione; fase C: campo aperto continuo e movimento automatico contestuale (verso la
  rete dopo il colpo da 46–89% a 0–0,1% nelle partite simulate).
- **Fasi D ed E** (22/10 notte): sincronia, animazioni, recupero e continuità guardati nel browser (prova nuova dello
  scambio vero, `tools/e2e/natpf-rally.mjs`); regola di marchio applicata anche ai documenti vecchi e al codice
  (il passaggio di consegne del 17/10, che aveva nel nome uno strumento esterno, ora è
  `docs/NATPF_PASSAGGIO_2026-10-17.md`); procedura fisica del campo aperto (§5,
  punto 14).
- **Non fatto o aperto**:
  - equilibrio della CPU dopo la fase C: a Esperto i profili del telefono simulati vincono più punti (amatore 57% →
    80%), da rivedere con partite vere;
  - validazione fisica con telefono, webcam e persone vere (procedura in `docs/NATPF_RACCHETTA_VIRTUALE.md` §5);
  - chi calibra senza la pronazione che usa poi in partita vede tagliati finché non ricalibra.
  - le prove degli inviti della pagina storica (`tools/e2e/invite.mjs`, `invite-timing.mjs`, fuori dalla CI) sono ferme dal 15/10: cliccano la scelta dei comandi (`#ctrlMouse`, `#ctrlPhone`), tolta quel giorno con i comandi solo dal telefono (`ca4548a`, `23e6cac`); vanno riscritte con un telefono simulato anche per chi invita.

## 1. Descrizione

Simulatore di tennis per le Nitto ATP Finals (Torino): partita 1v1 (e 2v2) contro la CPU o un amico, con lo
smartphone usato come racchetta (sensori di movimento), la webcam o mouse e tastiera. Pensato per eventi (chiosco,
Radar del servizio, classifica del giorno) e per casa. Funziona da sito statico (Cloudflare Pages) e in rete locale
(pacchetto LAN per Windows con Node portatile).

Regola di marchio: interfaccia, codice e documenti «white label» (nessun nome di strumenti o fornitori esterni;
ammessi solo gli header di copyright delle librerie open source). Loghi ufficiali: Nitto ATP Finals ed ESPORTS FITP.

## 2. Architettura

- **Gioco** (`natpf-tennis/`): Vite + three.js. `src/game_engine.js` è il motore (fisica palla, punti, CPU, P2);
  `src/natpf/*` sono i moduli NATPF (lobby, allenamento, sfide, chiosco, arena, telefono, p2p).
- **Pagina telefono e moduli condivisi** (`site/js/tennis/`, `site/tennis/racchetta.html`): sensori → rilevatore
  dei gesti → messaggio di swing → collegamento col computer.
- Catena del colpo col telefono: `devicemotion` → `face-tracker.js` (orientamento, piatto, `headAt`) →
  `swing-detect.js` (picco, preparazione, rientro) → `calibration.js` (profilo personale) → `swing-message.js` →
  `link.js` → `natpf_phone_racket.js` (`natpfSwingToEngine`, modelli adattivi) → `natpf_gestures.js`
  (`classifyPhoneShot`: dritto/rovescio, lob, palla corta, tagliato) → `game_engine.js` (`_attemptPlayerRallyStrike`,
  `natpf_skill.js` per direzione e profondità).
- **Racchetta virtuale** (22/10, documento `docs/NATPF_RACCHETTA_VIRTUALE.md`): il telefono misura la forma del colpo
  (`site/js/tennis/stroke-shape.js`: piano, salita della testa, manico, velocità; campi `an` e `sh` del messaggio); il
  computer ne ricava l'intenzione (`natpf_stroke_intent.js`, al posto di `classifyPhoneShot` quando c'è la forma) e il
  motore l'esito senza caso (`natpf_stroke_outcome.js`, `_natpfRacketShot`): tempo dentro la finestra = direzione,
  oltre = esecuzione, continuo su tutta la finestra; mira attorno a un punto neutro che segue la palla, lato del colpo
  dal gesto, profondità su tutto il campo, assistenza morbida per livello (`ASSIST`; campo aperto della fase C del
  22/10 notte). `natpf_impact.js`: finestra d'impatto (swing in attesa fino al punto d'impatto, il più forte sostituisce
  la preparazione), piano d'intercetto (schiacciata al volo, volée solo quando conviene, palle fuori lasciate andare;
  vale solo per la sua palla, `livePlan`), recupero verso il fondo secondo il tempo (a rete solo se una palla corta ha
  portato lì), anche per il Player 2 del 1v1.
  Servizio dal gesto (`serveOutcome`). Mano unica: la decide il computer (`cfg.hand`, `{t:'hand'}` dal telefono).
  Webcam con un solo soggetto (`trackOthers` e ripresa per taglia, `HAND_KEEP`, in `webcam_strokes.js`). Calibrazione
  rapida con due gesti facoltativi (`QUICK_PLAN`) e passo «fermo» sulla mediana della rotazione (`swing-detect.js`).
- Tre parti separate del colpo: **rilevamento** (telefono: `swing-detect.js` decide quando c'è un colpo e il verso,
  `face-tracker.js` misura il piatto), **classificazione** (computer: `natpf_gestures.classifyPhoneShot`, deciso al
  picco con i dati di preparazione e spinta, mai cambiato dopo l'impatto) e **simulazione** (motore: `natpf_skill`
  direzione, profondità, traiettoria). Segnali: L/`move` = spostamento verticale della mano (accelerometro, rispetto ai
  propri colpi normali), T = rotazione verticale del piatto (`headAt`), `fh` = direzione assoluta del piatto
  all'impatto (mira, `createAimModel`). Simulatore della presa vera: `natpf-tennis/test/phone-sim.mjs`.
- **Allenamento con il telefono** (20/10): il telefono guida la calibrazione (passi `step`/`next`/`ready`/`attempt`/
  `review`/`done`) e il computer la mostra con `natpf_cal_view.calReduce` (funzione pura degli eventi, `phone.calView`):
  in `natpf_training.js` giocatore fermo al centro, palla ferma dal lato del gesto chiesto (`CAL_SPOT`), colpo solo
  dopo un tentativo riuscito. Pannello `#natpf-coach` in basso al centro (stato `wait`/`go`/`retry`/`ok`).
- **Risposta al gesto** (20/10): gesto in anticipo → `NS.holdSwingPrep` (racchetta carica dal lato del colpo) e
  `pendingUserSwing`; all'istante del colpo `triggerSwing` + `NS.swingFromContact` (swing dal 24% della durata, poco
  prima dell'impatto); scaduto senza palla → `_natpfEarlyWhiff` («Troppo presto»). Stesso schema per il P2.
  `natpf_gesture_hud.js`: etichetta del gesto sul computer (rilevato → letto → applicato).
- **Menu** (20/10): con la lobby aperta il motore non chiama `update()` (`_natpfBackdropFrame`): fotogramma fermo
  dell'arena (`_natpfBackdropPose`), ridisegno solo se serve; restano attivi telefono, lobby del 1v1 e `natpfUi.tick`.
- **Multigiocatore (sfida un amico)**: host unico arbitro. Relay `/api/match/*` (server LAN, `scripts/match-relay.mjs`)
  o, su sito statico, `natpf_p2p.js` (intercetta le stesse chiamate e usa WebRTC con PeerJS; invito
  `?room=AT-XXXX&role=p2&net=p2p`). Sessione 1v1 in `natpf_versus.js` (funzioni pure: lobby, stato del P2, contatori)
  e `natpf_versus_ui.js` (lobby dell'host, pausa se il P2 esce, pannello del P2); nel motore `engine.versus`,
  `_versusInMatch()`, `endVersus()`, `versusGuest`. Flusso: «Sfida un amico» crea la stanza (riusata dopo un
  ricaricamento, `sessionStorage natpf.versus.room`) → link → P2 entra e preme «Sono pronto» (`touch=p2&ready=1`) →
  «Gioca» si sblocca → snapshot ogni 45 ms (in lobby `{lobby}`, in pausa `{paused}`, chiusura `{closed}`).
- **Arena**: `site/js/tennis/arena.js` (`buildArena`), decal dei loghi sul muro, pubblico con InstancedMesh,
  `natpf_arena.js` (campo d'allenamento, anisotropia).
- **Collegamento telefono → computer, percorso veloce** (21/10): i messaggi che contano solo se arrivano subito
  viaggiano senza ritrasmissioni e senza ordine:
  - copie del colpo (`sw`, tre a 0/8/24 ms più una sul canale affidabile; il computer tiene la prima, `n` scarta le
    altre);
  - piatto (`fo`, con l'istante `k`);
  - campioni della diagnostica (`rs`, con il numero `q`).
  
  In LAN viaggiano sul canale `motion` come JSON; via internet su una seconda connessione «fast-…» non ordinata dello
  stesso telefono, accettata solo dallo stesso peer. Il computer lo annuncia con `welcome.f = 1`: un telefono nuovo con
  un gioco vecchio usa solo il canale affidabile. Il server LAN serve la pagina del telefono dai sorgenti e il gioco
  dalla build. `link.stats().swings` dice da quale percorso è arrivata la prima copia. Lo stato del telefono porta
  anche `vis` (pagina visibile) e `wk` (blocco dello schermo 1/0/−1); il computer avvisa se lo schermo può spegnersi.
- **Modalità diagnostica** (21/10, `natpf-tennis/src/natpf/diag/`, pannello `natpf_diag.js`, Maiusc+D o Pausa →
  Diagnostica; guida in `docs/NATPF_DIAGNOSTICA.md`):
  - `DiagRecorder` mette su un solo orologio (`performance.now()` del computer, `t` in ms dall'inizio) gli eventi di
    motore, telefono, webcam e prestazioni; si aggancia al motore avvolgendo `update`, `render`, `_spawnBounceRing`,
    `_awardPoint` e `_attemptPlayerRallyStrike`, e il resto con gli ascoltatori di telefono e controller (`onTrack`
    della webcam);
  - scrittura ogni 0,5 s, tramite un worker (`diag_worker.js`), nel file system privato del browser (cartella
    `natpf-diag/<id>`); niente limite di durata;
  - recupero dopo una chiusura improvvisa, video della webcam e del gioco (MediaRecorder);
  - pacchetto zip (`diag_export.js`) con `rapporto.html` (video sincronizzati), metriche (`diag_metrics.js`, anche
    `compareMetrics`), eventi e campioni;
  - prova guidata (`diag_protocol.js`: `training.start({ drills, diag })`, evento `atteso` = colpo richiesto, unico
    riferimento per dire «riconosciuto male»);
  - script `scripts/diag/diag.mjs metriche|colpi|confronta`.
- **Webcam, riconoscimento dei colpi** (21/10, `natpf-tennis/src/natpf/webcam_strokes.js`, documento
  `docs/NATPF_WEBCAM.md`): posizioni divise per la taglia della mano, un «viaggio» per colpo dal punto in cui la mano
  era ferma, colpo anticipato durante l'avanzamento (mano che torna verso la camera dopo la preparazione, o moto di
  lato veloce) così il gioco tiene lo swing fino allo sweet spot, conferma a fine gesto solo per la diagnostica
  (`onTrack`, `kind: 'confirm'`); mano scelta per continuità; flusso ottico di riserva solo vicino all'ultima mano.
- **CPU Leggenda** (21/10, `natpf-tennis/src/natpf/natpf_legend.js`, documento `docs/NATPF_LEGGENDA.md`): terzo
  livello (`difficulty: 'leggenda'`, tessera «CPU Leggenda», `?mode=leggenda`). Chi gioca ha le regole di Esperto; la
  CPU usa la stessa fisica e le regole d'esecuzione di chi gioca, sceglie il colpo per utilità tra molti schemi,
  impara dagli errori dell'avversario, corre con accelerazione e frenata limitate, affonda, lascia passare le palle
  che vede fuori. Agganci nel motore (`game_engine.js`, commenti «NATPF Leggenda») che per casual, pro, 1v1 e sfide
  escono subito; `npm run audit:legend` con le soglie.

## 3. Tecnologie

JavaScript (moduli ES), three.js 0.160, Vite, React (solo shell), MediaPipe (webcam), PeerJS (p2p), Node per test
(`node:test`), server LAN e strumenti; Playwright/Chromium per le prove nel browser; Python + Ghostscript/pdftocairo
per generare le grafiche dei loghi (`natpf-tennis/scripts/brand/brand-assets.py`).

## 4. Struttura delle cartelle

| Percorso | Contenuto |
|---|---|
| `natpf-tennis/src/` | motore e moduli del gioco |
| `natpf-tennis/test/` | test del gioco (`npm test`) |
| `natpf-tennis/lan/` | server LAN, pacchetto Windows (`pacchetto.mjs`) |
| `natpf-tennis/scripts/` | build sito, loghi, audit dello scambio |
| `site/js/tennis/` | telefono-racchetta, calibrazione, arena condivisa |
| `site/assets/brand/`, `site/assets/arena/` | loghi e grafiche dell'arena |
| `tools/test/` | test dei moduli condivisi (`node --test tools/test/*.test.mjs`) |
| `docs/` | roadmap (`NATPF_ROADMAP.md`), gesti e latenza, eventi, storia |

## 5. Setup dell'ambiente

```
cd natpf-tennis && npm install
node node_modules/vite/bin/vite.js build      # build in natpf-tennis/dist
npm test                                      # test del gioco
node --test ../tools/test/*.test.mjs          # test condivisi (dalla root: tools/test/*.test.mjs)
npm run lan                                   # server LAN (HTTPS, QR per il telefono)
npm run audit:rally                           # varietà e equilibrio dello scambio
```

Consegne: zip Cloudflare (contenuto di `dist` + `_headers` da `site/_headers`, file < 25 MiB, percorsi con «/») e
zip LAN Windows (`node lan/pacchetto.mjs --out=... --node=<zip di Node per Windows>`). Prima di consegnare: estrarre
e provare da un server statico, cercare le parole vietate dal white label.

## 6. Funzionalità principali

Intro, menu da console (frecce/Invio/Esc), modalità contro CPU / sfida un amico (invito subito in vista, ingresso con
il codice della stanza), 1v1 e 2v2, moviola dell'ultimo punto, allenamento con
calibrazione ed esercizi (dritto, rovescio, pallonetto, palla corta, servizio, angoli), sfide per eventi (Radar,
Bersagli 60", Scambio infinito, Sfida il campione), nickname e classifica del giorno (solo nel browser), modalità
chiosco e pannello dell'addetto (Ctrl+Maiusc+K o logo premuto 3 s), diagnostica e registrazione dei gesti (Maiusc+D).

## 7. Problemi noti

- Prove con telefoni veri, webcam con persone e due computer reali non possibili in questo ambiente.
- p2p su Cloudflare senza un relay proprio (si usano STUN e TURN pubblici della libreria, senza garanzie): dietro
  firewall, NAT simmetrici o VPN i due computer possono non collegarsi. Dal 23/10 sera il gioco lo dice (host e
  Player 2, con i consigli; evento `sfida.collegamento` nella diagnostica). Decisione sul relay aperta
  (`docs/NATPF_SEGNALAZIONI_2026-10-23_SERA.md` §8.4).
- Il browser di prova usa la grafica software: fotogrammi lenti (1,6–1,8 s), tempi delle prove automatiche imprecisi.
- Webcam sotto carico (23/10 sera, CI completa): una volta un colpo con la webcam finta senza mano, mentre il modello
  cambiava livello (inferenza di 2,1 s); da sola la prova passa 10/10. Da tenere d'occhio su un computer molto lento.
- Test e2e LAN: il telefono simulato non chiude la connessione WebRTC verso l'indirizzo di rete del contenitore, e il
  browser di prova non raggiunge quell'indirizzo (il P2 apre l'invito su 127.0.0.1, ripiego nella prova).
- 1v1: il ritardo di rete P2 → host è compensato solo per il telefono e solo per il tempo nel relay; mai provato con
  due computer veri né su reti diverse; senza TURN alcune reti non si collegano. Tra due giocatori automatici perfetti
  gli scambi possono durare a lungo (84 e 154 colpi nelle prove; `natpf-1v1-p2p.mjs` ora lascia passare la palla
  dopo 10 colpi, altrimenti il Player 2 poteva non arrivare mai a servire nel tempo della prova).
- Racchetta virtuale (22/10): soglie del nuovo modello (salita del pallonetto 0,55, del tagliato −0,22, pallonetto
  «morbido» fino a forza 0,3, zona morta del piatto 8°) tarate su simulazione e su una sola sessione reale senza
  riferimento dell'intenzione: da validare con la procedura in `docs/NATPF_RACCHETTA_VIRTUALE.md` §5. Webcam: all'avvio
  un'altra persona più vicina alla webcam di chi gioca può essere scelta; una mano nuova che compare lontano entro
  0,5 s dalla perdita della propria si prende ancora (§4.4 del documento).
- Colpi e mira (telefoni senza forma del colpo, pagina vecchia): soglie (pallonetto con mano che sale ≥ 0,25, decisa ≥ 0,5; mira 26°, centro 10°) tarate sul simulatore
  che riproduce il video del 19/10, non su registrazioni vere (nel repository non ce ne sono). Nella prova nel browser
  la mira a destra è risultata più debole di quella a sinistra quando i colpi precedenti alternavano pronazioni
  opposte (centro spostato di ~15°): da verificare con il telefono vero e una registrazione (Maiusc+D).
- La prova `natpf-flat-grip.mjs` (presa orizzontale) era obsoleta: sostituita da `natpf-phone-upright.mjs`.
- Il link d'invito porta il formato scelto al momento della stanza; se si cambia formato dopo, il P2 lo riceve dal
  primo snapshot (non è un errore, solo un attimo di ritardo).
- Palla corta (audit del 20/10, simulatore): riconosciuta in 277 gesti su 864; 154/288 con lo schermo verso di sé,
  16/288 con lo schermo girato di lato, meno se chi gioca prona molto nei dritti. Il segnale (T) usa il dorso del
  telefono: con lo schermo di lato il gesto verso il basso non lo muove. Da decidere con una registrazione vera.
- Carico della scheda video (audit del 20/10, contato senza misurare su hardware vero): arena con 199 chiamate di
  disegno e 4,3 milioni di vertici per fotogramma (pubblico: 7 522 persone, 3,2 M vertici non indicizzati, disegnate
  anche fuori dall'inquadratura), ombre 2048 con ~110 chiamate in più (ogni pezzo dei personaggi proietta ombra),
  risoluzione fino a 2× con antialias. Non toccato: da misurare su un portatile vero prima di ridurre la qualità.
- 1v1: se cade il telefono del Player 2, si ferma solo il suo computer (pannello del telefono), non la partita
  dell'host.
- Prove del sito di prima (`site/tennis`): `phone-failures.mjs` aspetta ancora testi della calibrazione vecchia (2
  verifiche e un'attesa scadute, uguali sul sito del 19/10). `phone-cal.mjs` aggiornata alla calibrazione rapida (la
  calibrazione passa); la sua parte di partita resta ferma al servizio (0 lanci: il robot manda un solo gesto di lancio
  e non riprova) sia sul sito del 19/10 (953044c) sia su quello attuale, anche a macchina scarica: non dipende dal
  quarto giro. Proposta come attività a parte.

- Registri che «si fermano dopo circa 30 s» (segnalazione del 21/10): nel simulatore nessuno stop (sessioni di
  150 s continue); la registrazione di prima si chiudeva a 60 s. Causa sul telefono vero **non confermata**; ipotesi
  più probabile: lo schermo del telefono che si spegne (spesso dopo 30 s) quando il blocco dello schermo manca o si
  perde, con la pagina sospesa. Ora il registro lo mostra (`tel.stato.visibile`, `schermo`, avvisi
  `telefono-nascosto` e `schermo-telefono`): la prima sessione vera lo conferma o lo esclude.
- Modalità diagnostica provata solo con sensori sintetici, webcam finta e grafica software. La codifica dei video
  (MediaRecorder) gira fuori dal thread del gioco ma usa CPU o scheda video. Misurato sul computer di prova (4 core,
  codifica software): la sola webcam non pesa; con anche il video del gioco fotogrammi al 5° percentile da 59 a 48 e
  consegna dei colpi mediana da 4,7 a 17,9 ms. Per questo il video del gioco parte spento; su un PC vero lo dicono le
  `prestazioni` della prima sessione.
- Webcam (21/10, banco sintetico): il pallonetto voluto si riconosce solo nel 13% dei casi (prima 39%: con la camera
  di fronte la salita arriva dopo l'impatto, la vede solo la conferma, troppo tardi); il 28% degli swing piccoli o
  lenti si decide a fine gesto (~0,5 s dopo) e risulta in ritardo; la mira dal colpo anticipato è quasi nulla. Mai
  provata con una webcam e una persona vere (`docs/NATPF_WEBCAM.md`).
- Ritardo dello schermo (televisore): impostazione nel pannello della diagnostica, ferma a 0 finché non si misura con
  un video a 240 fps; oggi il giudizio del tempo non lo compensa.

## 8. Soluzioni tentate e decisioni tecniche

- Calibrazione: prima il rientro della mano veniva preso come gesto successivo (soglia «40% del picco» non
  bastava). Decisione: quiete prima di ogni gesto + posizione della mano integrata lungo l'asse del colpo; il primo
  movimento che riporta la mano al punto di partenza è il rientro, salvo pausa ≥ 600 ms lontano dal centro.
- Dritto/rovescio: il rovescio morbido (lungolinea) su palla appena dalla parte del dritto veniva trattenuto come
  «preparazione» e il rientro della mano diventava il dritto. Decisione: il gesto opposto dopo quello trattenuto è il
  colpo solo se veloce almeno l'80% (`prepFollow`), altrimenti vale il gesto trattenuto; zona «palla diretta» 0,6 m
  (nessun verso atteso); gesti senza verso orizzontale: lato dalla posizione della palla, non dalla mira.
- Pallonetto: volo di 2 s con compensazione dell'aria (prima cadeva a metà campo).
- Verso verticale del colpo dal giroscopio/orientamento (`headAt`), non dall'accelerometro (rumoroso con presa a manico).
- TORINO: i riferimenti (camera dietro una riga di fondo) mostrano le due scritte dritte da quella camera. Con due
  giocatori ognuno ha la sua camera: le scritte si girano sul computer di ciascuno (`arena.setViewer`), così il campo è
  uguale per tutti e due. Primo tentativo (d78b0f2: ognuna verso la metà opposta) scartato: la scritta vicina, che la
  camera di gioco inquadra, risultava capovolta.
- Pallonetto con la presa vera (secondo giro): T è normalizzato e dipende solo dall'asse di rotazione; la pronazione
  del polso (asse dell'avambraccio, orizzontale) dà lo stesso T di un colpo verso l'alto. Decisione: pallonetto e
  tagliato veloce solo con la mano che si sposta davvero (L); la mano che sale con decisione è un pallonetto anche se
  il piatto ruota al contrario; palla corta invariata (baseline richiesta). Riferimenti personali (L, T) solo dai colpi
  normali: prima tre pallonetti di fila spostavano il «normale». Verso del colpo anche dalla rotazione attorno alla
  verticale quando l'impugnatura è cambiata dopo la calibrazione (prima il colpo spariva).
- Mira (secondo giro): prima solo la rotazione durante il colpo rispetto alla mediana degli ultimi 12 colpi (polso o
  corpo girati prima del colpo ignorati, mira annullata dopo 2–3 colpi dalla stessa parte: palla sempre a x ≈ −0,6 m).
  Decisione: il telefono manda la direzione assoluta del piatto all'impatto (`fh`), il centro segue i colpi normali
  (12%) e la deriva lenta (3%), mira tanh(scarto/26°); guadagni del tempo 1,6 m e del piatto 3,4 m. Primo tentativo
  di simulazione con la pronazione che si accumulava: falso allarme del simulatore (rotazioni non commutano), il
  simulatore ora torna alla posa di partenza come la mano vera.
- Musica: gruppi di brani per schermata con rotazione (`TRACK_GROUPS`), 12 brani; la testa del gruppo resta il
  brano di prima. Sedia dell'arbitro: «A» estrusa in codice (forma fedele ai riferimenti, ombre e luci della scena);
  Higgsfield non è servito. Posizione (correzione del 19/10 dalle quattro schermate prese dal fondo del P1): sedia a
  destra (x = +10 m, 3,6 m oltre il paletto, 2,2 m davanti al muro), «A» girata verso il campo, scaletta bianca
  separata sul fianco (z < 0), panchine a z = ±4 m con lo schienale verso il muro, telecamere e varco nel muro sul lato
  opposto (x < 0). Valori in `UMPIRE` (`site/js/tennis/arena.js`), controllati in `test/natpf-arena-court.test.mjs`.
- Host autorevole per il multigiocatore; snapshot con formato (`fmt`) per il 2v2.
- 1v1 (punto 4): la revisione (due esami indipendenti del codice, quasi tutti i difetti riprodotti) ha mostrato che
  mancava una sessione. Decisioni: i colpi del P2 contano sull'host solo con `_versusInMatch()`; il computer del P2
  non assegna punti e non prepara il servizio (`_awardPoint` e `POINT_OVER` lasciati all'host), riceve fase, tempo
  della fase, effetto e rimbalzi della palla e la fine partita; scegliere un'altra modalità chiude la stanza
  (`endVersus` manda `{closed}`); durata a scelta anche in 1v1 (motore e HUD la forzavano a un game); relay: nomi del
  gioco (prima «Ammaar»/«Challenger»), `touch=1` accettato, codici senza 0/O/1/I, stanza riusata, epoca, 404 per
  stanza inesistente, pulizia dopo 6 h; WebRTC: stanza «occupata» per un secondo P2, Peer ricreato dopo un errore,
  host introvabile per 20 s segnalato. Non fatto: compensazione del ritardo per mouse/webcam del P2 (vedi §7).
- Varietà (punto 3): ogni colpo passava la rete al minimo (1,25–1,27 m) e la CPU sceglieva il colpo da un ciclo fisso.
  Decisione: `shotArc` (altezza sulla rete e top spin da tipo di colpo e forza), `angleDepth` (angolo stretto = palla
  corta), `bounceSpin` (rimbalzo con l'effetto), `cpuShotChoice` (schemi a peso: centro, campo libero, contropiede,
  profondo, angolo, tagliato, parabola alta, pallonetto sul giocatore a rete).
- Aria: `_launchBallToTarget` ignora l'attrito e i colpi cadevano ~2 m prima del bersaglio. Prima prova: correzione su
  tutta la velocità → palle precise anche di lato, ma tennista in Esperto dall'89% al 67% (out larghi: la mira laterale
  era tarata sulla palla accorciata del 20%). Decisione: `fixAir` corregge solo la componente lungo il campo; il
  bilanciamento resta quello di prima (audit entro pochi punti) e la profondità diventa vera.
- Allenamento (20/10): prima telefono e computer avevano due macchine a stati (il computer lanciava una palla
  rallentata e «armava» il gesto): se il telefono era già ai gesti la palla non partiva mai, e un gesto fatto prima
  della palla colpiva quella del gesto dopo, dal lato sbagliato. Decisione: una sola fonte, il telefono; il computer
  è funzione dei suoi eventi (`calReduce`) e il giocatore non si muove mai da solo in calibrazione. Telefono
  scollegato o senza sensori: pannello «Telefono scollegato» con il rimedio; al ricollegamento la calibrazione riparte.
- Verso dei gesti in calibrazione (20/10): il primo gesto fissava il verso anche se fatto al contrario, e con il
  polso che prona l'asse del primo gesto sbagliava i successivi. Decisione: verso assoluto dalla rotazione attorno
  alla verticale (`verticalTurn`; un primo gesto chiaramente al contrario si rifà, alla terza volta di fila si accetta
  per i telefoni con il segno opposto), poi rotazione netta durante il gesto (`netTurn`), poi l'asse imparato.
  Riferimento del piatto (T) dai quattro gesti della calibrazione (`profile.heads`): prima partiva da 0 e i dritti
  morbidi con pronazione diventavano palle corte (623 su 5184 nell'audit).
- Un gesto, un solo swing (20/10): prima un gesto in anticipo faceva partire lo swing subito e di nuovo all'arrivo
  della palla; un gesto in tempo arrivava all'impatto dell'animazione ~0,1 s dopo la palla. Decisione: racchetta
  caricata subito (`holdSwingPrep`), swing all'istante del colpo partendo dal 24% (`swingFromContact`), swing a vuoto
  visibile alla scadenza. Tempi misurati: rilevatore ~24 ms, rete 1–10 ms, motore < 2 ms: la rete non è il collo di
  bottiglia, nessun cambio di trasporto (WebSocket non più veloce in LAN, Web Bluetooth non usabile da una pagina
  web sul telefono; sensori più frequenti solo su Android, da provare).
- Menu e sfarfallio (20/10): la home ridisegnava a ogni fotogramma una partita dimostrativa sotto un pannello con
  `backdrop-filter`, più il campo animato dell'intro. Decisione: fotogramma fermo dell'arena senza `update()`, campo
  dell'intro fermo, menu al centro con tutte le voci visibili (stile console anni 2000).
- Audit del 20/10, fluidità: la fisica avanzava a passi fissi interi con il resto accumulato e senza interpolazione;
  scelto di dividere tutto il tempo del fotogramma in passi uguali ≤ 1/120 s (`natpf_skill.physicsSteps`) e di prendere
  il tempo dall'orario del rAF, più semplice e meno rischioso dell'interpolazione di palla e personaggi nel motore.
  I QR del companion si generano solo quando cambia il link (prima a ogni risposta del relay, ~20% del thread a 20 Hz).
- Audit del 20/10, flussi: «Torna al menu» porta sempre al menu (allenamento fermato senza passare dalla sua fine,
  che porta alla partita o alla sfida); con il gioco in pausa nessun colpo o lancio arriva al motore (le prove che
  congelavano il motore con la pausa ora lo fanno con `update` vuoto); il riscaldamento e le sfide non contano come
  partita 1v1; telefono che ricalibra in campo senza il pannello: in allenamento lo guida il campo, altrove si riapre il
  pannello.
- Audit del 20/10, collegamento: il telefono controlla il silenzio (5 s, come il computer) e si ricollega con la chiave
  di ripresa; alla ripresa a calibrazione in corso rimanda il passo attuale con gli stessi eventi di sempre
  (`calibration.replay`, nessun messaggio nuovo da gestire); il computer va in pausa con il pannello del telefono se il
  telefono non torna entro mezzo secondo e riprende da solo; i colpi più vecchi di 0,6 s all'arrivo si ignorano
  (normale: 30–60 ms). Un difetto ipotizzato nella ripetizione della calibrazione (palla del quarto gesto) è stato
  controllato e non esiste: nessuna modifica.
- Colpi con la rete che perde pacchetti (21/10): il colpo viaggiava solo sul canale ordinato e affidabile, e un
  pacchetto perso fermava tutto fino alla ritrasmissione (perdita simulata: p99 fino a 293 ms via internet). Scartati
  il cambio di trasporto (WebSocket ha lo stesso blocco, Bluetooth e app nativa non sono più veloci di un Wi-Fi
  dedicato) e un canale solo non affidabile (un colpo perso è peggio di uno in ritardo). Decisione: tre copie sul
  percorso senza ritrasmissioni (0/8/24 ms) più una sul canale affidabile, il computer tiene la prima per numero;
  compatibilità con `welcome.f`. Misura in `docs/NATPF_APP_NATIVA_E_TRASPORTI.md` §2.
- Correzione di un dato dell'audit del 20/10: la consegna di «22 colpi su 40» e «2 su 40» nella prova con perdite
  veniva dal banco di prova (il gioco nel menu rimandava di continuo la fase e il telefono scartava i colpi), non
  dalla rete. Con il banco corretto tutti i colpi arrivano, prima e dopo la correzione delle copie.
- Modalità diagnostica (21/10): un solo orologio (`performance.now()` del computer); il telefono si allinea con gli
  scambi a giro più breve, tutti registrati per ricalcolare scarto e deriva dopo (`clockFit`). Scrittura in un worker
  con il file system privato del browser (scrittura sincrona nel worker, niente copie sul thread del gioco), righe JSON,
  `meta.json` ogni 3 s per il recupero, coda massima 24 MB (poi si saltano i campioni grezzi, mai il gioco). Zip senza
  compressione: i file su disco entrano per riferimento. «Riconosciuto male» solo con un riferimento: la prova guidata
  (colpo richiesto dal lanciapalle, evento `atteso`); senza, solo distribuzioni. Registrazioni lunghe: parti nuove ogni
  30 minuti o 1 GB con lo stesso orologio (ogni parte è un pacchetto completo, il limite di 4 GB dello zip non si
  raggiunge); spazio del browser controllato ogni 10 s (sotto 200 MB via i video, sotto 50 MB i campioni, sotto 20 MB
  chiusura; mai cancellazioni automatiche). La prima soglia era 1 GB: il browser di prova (contesto temporaneo, simile
  a una finestra privata) ha una quota di 999 MB e i video non partivano. Metriche e rapporto si calcolano nel worker
  leggendo i file a righe (`diag_analysis.js`).
- Webcam (21/10): il riconoscimento a fine gesto (lato giusto 97–98% invece di 30%) arrivava 0,1–0,3 s dopo
  l'impatto e il gioco giudicava «molto in ritardo» o a vuoto il 97% dei colpi (prova nel motore): non integrato da
  solo. Scelto il colpo anticipato (lato 99%, nel motore PERFECT 89% contro 60% di prima) accettando il pallonetto
  voluto al 13%; scartate una soglia di velocità più bassa (eventi nella preparazione nel 17–22% dei rovesci) e la
  correzione della latenza nel motore (la palla sarebbe già 2–4 m oltre chi gioca).
- CPU Leggenda (21/10): niente errore «a dado» né errori che crescono con lo scambio; qualità del colpo e rischio
  con le funzioni del giocatore, scelta per utilità (rischio della CPU, probabilità d'errore dell'avversario stimata e
  imparata, valore dello scambio, penalità per le ripetizioni), mira corretta per l'aria laterale (0,865). Due
  scostamenti dalla specifica, misurati: «lascia passare» a 0,08 m (± 0,12) invece di 0,25 m (± 0,18), perché con i
  valori della specifica due criteri non passavano; errore di tempo della CPU 0,025 s invece di 0,03 s (vincenti/errori
  contro «medio» 0,99 → 1,00). Verifica che casual e pro non cambino: firma di 36 simulazioni identica a 726b5e3.
- App nativa e Bluetooth (21/10): non ora. Guadagno misurato nel simulatore: riconoscimento 33 → 20 ms passando da
  60 a 100 Hz; a 200 Hz il rilevatore attuale non calibra (finestre in campioni). Regola per decidere con i dati
  delle sessioni vere e architettura (app sottile con la stessa pagina e un ponte verso i sensori) in
  `docs/NATPF_APP_NATIVA_E_TRASPORTI.md` §6.

## 9. Modifiche recenti

| Data | Commit | Cosa | File |
|---|---|---|---|
| 23/10/2026 sera | da5d1b0, 4b6ec72, f0e5abb | Palla corta in partita non più letta come dritto (esercizi speciali che non insegnano il colpo normale, forza assoluta del gesto per i prototipi); pagina «Collega» compatta sugli schermi bassi; prova LAN della sfida aggiornata | `natpf_stroke_intent.js`, `natpf_phone_racket.js`, `natpf_training.js`, `natpf-intro.css`, `test/phone-sim.mjs`, `test/natpf-gesti-speciali.test.mjs`, `test/e2e/lan-e2e.mjs` |
| 23/10/2026 sera | dbc41b4 | Sfida online: diagnosi del collegamento (rete che blocca, host muto, host introvabile) con i consigli; invito subito in vista dalla racchetta alla partita, una riga di stato, «Condividi»; ingresso con il codice; Player 2 con una riga sola e l'avviso sul telefono; HUD del P2 senza «inquadra il QR» | `natpf-tennis/src/natpf/natpf_p2p.js`, `natpf_versus.js`, `natpf_versus_ui.js`, `natpf_lobby.js`, `natpf_ui.js`, `src/hud_ui.js`, `diag/diag_recorder.js`, `diag_viewer.js`, `index.html`, `natpf.css`, test, `tools/e2e/natpf-1v1-p2p.mjs` |
| 23/10/2026 sera | 4699a2e, 186d898, 9ab1c7f, d5a4333, 8fe6f27, 3f84f1a, d216f73 | Player 2 calibra nel campo d'allenamento; risposta al servizio da fondo campo; fine del punto con chi vince e chi ha sbagliato; moviola dell'ultimo punto; a rete con il tempo perfetto la palla passa e il messaggio dice «In rete»; pallonetto e palla corta (gesti verticali e lenti, tremolio, telefono capovolto, prototipi del proprio gesto); figura dell'impugnatura | `natpf_versus_ui.js`, `natpf_training.js`, `game_engine.js`, `natpf_skill.js`, `natpf_point_call.js` (nuovo), `natpf_replay.js` (nuovo), `natpf_stroke_outcome.js`, `natpf_shot_feedback.js`, `site/js/tennis/swing-detect.js`, `stroke-shape.js`, `grip-art.js` (nuovo), `natpf_stroke_intent.js`, `natpf_phone_racket.js`, test (`arm-sim.mjs` nuovo), `tools/e2e/natpf-gameplay-23-10.mjs`, `natpf-gesti-speciali.mjs` (nuove), `docs/NATPF_SEGNALAZIONI_2026-10-23_SERA.md` |
| 22/10/2026 | 51c83d2…(fine giro) | Racchetta virtuale: diagnosi della sessione reale (P1–P11), mano unica, verso dalla gravità, forma del colpo, intenzione ed esito senza caso, finestra d'impatto, volée e schiacciate al volo, palle fuori lasciate andare, servizio dal gesto, Player 2 specchiato, Leggenda ritarata, webcam con un solo soggetto, tremolio, calibrazione con colpi completi, piano valido solo per la sua palla, diagnostica (forma, intenzione, esito, piano, servizio, colpi a vuoto, ripetibilità), prima/dopo sugli stessi dati | `site/js/tennis/swing-detect.js`, `stroke-shape.js` (nuovo), `face-tracker.js`, `swing-message.js`, `calibration.js`, `racchetta.js`, `link.js`, `natpf-tennis/src/natpf/natpf_stroke_intent.js`, `natpf_stroke_outcome.js`, `natpf_impact.js` (nuovi), `natpf_phone_racket.js`, `natpf_hand.js`, `natpf_ui.js`, `natpf_legend.js`, `natpf_skill.js`, `webcam_strokes.js`, `motion_controls.js`, `natpf_training.js`, `natpf_events.js`, `natpf_lobby.js`, `diag/`, `src/game_engine.js`, test e prove (`racket-sim.mjs`, `racket-gestures.mjs`, `natpf-racchetta*.test.mjs`, `scripts/audit/zip-replay.mjs`, `webcam-crowd.mjs`, `tools/e2e/natpf-phone-upright.mjs`), `docs/NATPF_RACCHETTA_VIRTUALE.md` |
| 21/10/2026 | d35629f, d198261, 1ef6014, 284c423, a307100, 41c6535 | Webcam: un evento per colpo, colpo anticipato, mano scelta per continuità, lancio solo quando serve, banco sintetico e prova nel motore | `natpf-tennis/src/natpf/webcam_strokes.js` (nuovo), `motion_controls.js`, `natpf_hand.js`, `test/webcam-sim.mjs`, `test/natpf-webcam-classifier.test.mjs`, `scripts/audit/webcam-sweep.mjs` |
| 21/10/2026 | 70af03a, 77ba6fb, 65f809b, a220e4d | CPU Leggenda: modello, menu, allungo nel disegno, documento | `natpf-tennis/src/natpf/natpf_legend.js` (nuovo), `natpf_skill.js`, `game_engine.js`, `hud_ui.js`, `natpf_events.js`, `index.html`, `scripts/audit/legend.mjs`, `test/natpf-legend.test.mjs`, `test/natpf-flows.test.mjs`, `docs/NATPF_LEGGENDA.md` |
| 21/10/2026 | e0b4f6a | Colpi senza attesa di ritrasmissione (copie sul percorso veloce), stato della pagina e del blocco dello schermo del telefono, colpi scartati segnalati | `site/js/tennis/link.js`, `lan-transport.js`, `racchetta.js`, `natpf-tennis/src/natpf/natpf_ui.js`, `tools/test/phone-link-fast.test.mjs`, `tools/e2e/natpf-swing-loss.mjs`, `test/natpf-flows.test.mjs` |
| 21/10/2026 | 78e79e1 | Modalità diagnostica: registrazione su disco senza limite, video sincronizzati, metriche, confronto, prova guidata, ritardo dello schermo | `natpf-tennis/src/natpf/diag/` (nuovo), `natpf_diag.js`, `natpf_training.js`, `natpf_lobby.js`, `natpf_pause.js`, `natpf_phone_racket.js`, `index.html`, `natpf-flow.css`, `scripts/diag/diag.mjs`, `scripts/audit/replay-recording.mjs`, `test/natpf-diag.test.mjs`, `tools/e2e/natpf-diag-session.mjs`, `docs/NATPF_DIAGNOSTICA.md` |
| 21/10/2026 | db5bd33 | Diagnostica: video del gioco spento all'inizio (costo misurato), confronto che segnala video diversi | `natpf-tennis/src/natpf/natpf_diag.js`, `diag_metrics.js`, `diag_recorder.js`, `scripts/diag/diag.mjs`, `test/natpf-diag.test.mjs`, `tools/e2e/natpf-diag-session.mjs`, `docs/NATPF_DIAGNOSTICA.md` |
| 21/10/2026 | 3ccacc3 | Diagnostica: registrazioni lunghe in parti, spazio su disco, analisi a righe nel worker | `natpf-tennis/src/natpf/diag/diag_recorder.js`, `diag_analysis.js` (nuovo), `diag_worker.js`, `diag_store.js`, `diag_export.js`, `diag_viewer.js`, `diag_metrics.js`, `natpf_diag.js`, test |
| 20/10/2026 | 2e59c51 | Allenamento: il computer mostra sempre il passo del telefono, giocatore fermo, palla ferma dal lato del gesto, pannello in basso al centro | `natpf-tennis/src/natpf/natpf_cal_view.js` (nuovo), `natpf_training.js`, `natpf_phone_racket.js`, `index.html`, `natpf-flow.css`, `natpf.css`, `natpf-round.css`, `site/js/tennis/calibration.js`, `racchetta.js`, `swing-detect.js`, `tools/e2e/natpf-training-flow.mjs`, test |
| 20/10/2026 | a1244bb | Calibrazione con il polso che prona e con qualunque presa; riferimento del piatto dai gesti della calibrazione | `site/js/tennis/calibration.js`, `swing-detect.js`, `natpf-tennis/src/natpf/natpf_gestures.js`, `natpf_phone_racket.js`, `test/phone-sim.mjs`, `test/natpf-calibration-matrix.test.mjs`, `scripts/audit/calibration-matrix.mjs` |
| 20/10/2026 | ce77f02 | Un gesto, un solo swing: racchetta carica subito, swing all'istante del colpo, swing a vuoto visibile; tempi misurati | `natpf-tennis/src/game_engine.js`, `natpf_skill.js`, `natpf_phone_racket.js`, `natpf_shot_feedback.js`, `natpf_ui.js`, `tools/e2e/natpf-latency.mjs` |
| 20/10/2026 | 15aac5c | Etichetta del gesto sul computer: rilevato, letto, applicato | `natpf-tennis/src/natpf/natpf_gesture_hud.js` (nuovo), `natpf_ui.js`, `index.html`, `natpf-hud.css`, `test/natpf-gesture-hud.test.mjs` |
| 20/10/2026 | 5696b12 | 1v1: un gesto, un solo swing anche per il Player 2 | `natpf-tennis/src/game_engine.js` |
| 20/10/2026 | 20f589a | Menu principale al centro, sfondo fermo, sfarfallio della home risolto alla radice | `natpf-tennis/index.html`, `natpf-intro.css`, `natpf-flow.css`, `natpf.css`, `src/game_engine.js`, `natpf_lobby.js`, `natpf_ui.js`, `test/natpf-lobby.test.mjs`, `tools/e2e/natpf-menu.mjs` |
| 20/10/2026 | 86faf66 | Allenamento: telefono scollegato segnalato sul computer; documento dei gesti, quarto giro | `natpf-tennis/src/natpf/natpf_training.js`, `tools/e2e/natpf-training-reconnect.mjs`, `docs/NATPF_GESTI_E_LATENZA.md` |
| 20/10/2026 | 7d46eed | Prove nel browser: `phone-cal` sulla calibrazione rapida, coerenza dei due schermi misurata nel tempo | `tools/e2e/phone-cal.mjs`, `tools/e2e/natpf-training-flow.mjs` |
| 20/10/2026 | 9c97fca | Audit: fisica senza scatti (passi uguali ≤ 1/120 s, tempo dal rAF), QR non più rigenerati a ogni risposta del relay, flussi senza vicoli ciechi (riscaldamento 1v1, «Torna al menu», chiosco, ricalibrazione in campo, input in pausa, moviola, vittoria sopra il menu) | `natpf-tennis/src/game_engine.js`, `hud_ui.js`, `natpf_skill.js`, `natpf_ui.js`, `natpf_training.js`, `natpf_events.js`, `natpf_kiosk.js`, `natpf_lobby.js`, `natpf_pause.js`, `natpf_versus_ui.js`, `test/ui-world.mjs`, `test/natpf-flows.test.mjs`, `test/natpf-physics-steps.test.mjs` |
| 20/10/2026 | 62452e8 | Collegamento: telefono che si accorge della rete persa, ripresa della calibrazione, pausa automatica, colpi arrivati in ritardo ignorati, impostazioni rimandate al ricollegamento | `site/js/tennis/racchetta.js`, `calibration.js`, `link.js`, `natpf-tennis/src/natpf/natpf_phone_racket.js`, `natpf_ui.js`, `tools/e2e/natpf-phone-blackout.mjs`, `tools/test/calibration-replay.test.mjs` |
| 19/10/2026 | 684021a | Calibrazione: fermo prima di ogni gesto, rientro al centro escluso, tremolii ignorati, scelta del gesto nel verso richiesto | `site/js/tennis/calibration.js`, `racchetta.js`, `main.js`, `natpf-tennis/src/natpf/natpf_training.js`, `tools/test/calibration-quick.test.mjs`, `tools/test/gesture-training.test.mjs` |
| 19/10/2026 | d8b7bec | Rovescio lungolinea non più letto come dritto | `site/js/tennis/swing-detect.js`, `natpf-tennis/src/natpf/natpf_phone_racket.js`, `natpf-tennis/test/natpf-prep.test.mjs` |
| 19/10/2026 | 41b1880 | Colpi con la presa vera: niente pallonetti/tagliati dalla rotazione del polso, riferimenti solo dai colpi normali, verso del colpo con impugnatura cambiata, diagnostica con confidenza | `site/js/tennis/swing-detect.js`, `natpf-tennis/src/natpf/natpf_gestures.js`, `natpf_phone_racket.js`, `natpf_diag.js`, `scripts/audit/replay-recording.mjs`, `test/phone-sim.mjs`, `test/natpf-gesture-grip.test.mjs` |
| 19/10/2026 | 95ec78e | Mira continua dalla direzione del piatto all'impatto, centro che non annulla i colpi mirati | `site/js/tennis/face-tracker.js`, `swing-message.js`, `natpf-tennis/src/natpf/natpf_gestures.js`, `natpf_phone_racket.js`, `natpf_skill.js`, `test/natpf-aim.test.mjs` |
| 19/10/2026 | 717a104 | Sedia dell'arbitro: grande «A» blu come nei riferimenti | `site/js/tennis/arena.js` |
| 19/10/2026 | (questo) | Sedia dell'arbitro al posto delle schermate: a destra, 10 m dal centro, «A» verso il campo, scaletta sul fianco, panchine a ±4 m, telecamere sul lato opposto | `site/js/tennis/arena.js`, `natpf-tennis/test/natpf-arena-court.test.mjs` |
| 19/10/2026 | a48ba06 | Musica (12 brani a rotazione), blur dei menu, barra delle tappe, menu, classifica, pannello del P2 | `natpf-tennis/src/natpf/natpf_music.js`, `natpf.css`, `natpf-hud.css`, `natpf-intro.css`, `test/natpf-audio.test.mjs` |
| 19/10/2026 | b0e9e69 | Prova nel browser del telefono con la presa verticale (QR → colpi) | `tools/e2e/natpf-phone-upright.mjs`, `tools/e2e/README.md` |
| 19/10/2026 | 73c0eda + prova | 1v1: sessione, lobby, host arbitro, pausa/rientro, stanza chiusa o inesistente, errori del P2, relay e WebRTC; prova a due sessioni | `natpf-tennis/src/natpf/natpf_versus.js`, `natpf_versus_ui.js`, `natpf_ui.js`, `natpf_lobby.js`, `natpf_p2p.js`, `src/game_engine.js`, `src/motion_controls.js`, `src/hud_ui.js`, `scripts/match-relay.mjs`, `natpf.css`, `test/natpf-versus.test.mjs`, `tools/e2e/natpf-1v1-p2p.mjs`, `test/e2e/lan-e2e.mjs`, `docs/NATPF_ROADMAP.md` |
| 19/10/2026 | 494f583 (dopo d78b0f2) | TORINO: orientata per chi gioca (`setViewer`, P2 girato), 3,6 m senza deformazione, 2,1 m dietro la riga | `site/js/tennis/arena.js`, `site/js/tennis/scene.js`, `natpf-tennis/src/natpf/natpf_arena.js`, `natpf-tennis/test/natpf-arena-court.test.mjs` |
| 19/10/2026 | 4f4304f | Varietà di traiettorie e angoli per giocatore, P2 e CPU; palla che cade alla profondità voluta (prima ~2 m corta per l'aria) | `natpf-tennis/src/natpf/natpf_skill.js`, `natpf-tennis/src/game_engine.js`, `natpf-tennis/test/natpf-variety.test.mjs`, `natpf-tennis/scripts/audit/variety.mjs` |

## 10. Stato delle attività (richiesta in 6 punti del 19/10)

| # | Attività | Stato |
|---|---|---|
| 1 | Calibrazione telefono (falsi movimenti, rientro, gesto precedente) | fatto, provato con test a mano simulata; da provare con telefono vero |
| 2 | Dritto/rovescio, rovescio lungolinea | fatto, provato con gesti simulati; da provare con telefono vero |
| 3 | Varietà di traiettorie e angoli (anche P2) | fatto, provato con audit e test nel motore senza browser; da vedere giocando |
| 4 | Revisione completa 1v1 con verifica a due sessioni | fatto: rifatto da capo (il lavoro dell'altro PC non era stato pubblicato). Provato con due sessioni del browser sul sito statico, tutti e 7 i passi della richiesta (18/18), e con il server LAN; due computer e due persone veri non provati |
| 5 | Grafica del campo simmetrica (TORINO su entrambe le metà, loghi della rete) | fatto: le due TORINO si leggono dritte dalla camera di chi gioca su quel computer (P1 e P2 vedono lo stesso campo), proporzioni del file e 2,1 m dietro la riga come nei riferimenti; loghi della rete già leggibili dai due lati (8785a11). Provato con rendering nel browser dalle camere di gioco di P1 e P2 |
| 6 | MEMORY.md | fatto, da aggiornare a ogni attività |

Secondo giro (richiesta del 19/10 pomeriggio, con foto e video della presa):

| # | Attività | Stato |
|---|---|---|
| 1 | Colpi: pallonetti nei dritti per la rotazione del polso; dritto predefinito; palla corta invariata | fatto, provato con il simulatore della presa vera (96 dritti, pallonetti, palle corte, rumore, impugnatura cambiata) e nel browser dal QR (10/10); telefono vero **non provato** |
| 2 | Angolazioni: zone sempre uguali | fatto, provato nel motore (tre zone, mira continua, P2 dal suo lato) e nel browser; telefono vero **non provato** |
| 3 | Musica più varia, blur, allineamenti | fatto, provato (test della musica; schermate a 1024, 1280, 1366, 1920 px); audio reale non ascoltabile qui |
| 4 | Sedia dell'arbitro come nei riferimenti | fatto; posizione corretta dopo le quattro schermate (era troppo vicina alla rete e sul lato sbagliato), provata con rendering dal fondo del P1, dal lato e di fronte |
| 5 | Regressioni (QR, latenza, un gesto un colpo, palla corta, due lati, arena) | fatto: test unitari, prova nel browser del telefono, prova 1v1 a due sessioni |

Quarto giro (20/10: audit completo e miglioramenti di gioco, calibrazione e interfaccia):

| # | Attività | Stato |
|---|---|---|
| 1 | Allenamento: telefono, gesti chiesti e computer coerenti; niente movimenti automatici in calibrazione | fatto, provato nel browser con il telefono simulato (13/13; ricollegamento a metà calibrazione 6/6); telefono vero **non provato** |
| 2 | Calibrazione e reattività: prese, inclinazioni, ampiezze, velocità; latenza misurata; un gesto un swing; etichetta del gesto | fatto, provato con l'audit della calibrazione (864/864) e nel browser (9/9); palla corta con lo schermo di lato ancora debole (§7); telefono e Wi-Fi veri **non provati** |
| 3 | Menu principale al centro, niente animazione di sfondo, sfarfallio | fatto, provato nel browser a tre risoluzioni (22/22, nessun ridisegno con il menu fermo); scheda video vera **non provata** |
| 4 | Audit a 360° (stati, collegamento, errori, prestazioni, regressioni) | fatto: tre esami indipendenti (flussi, collegamento, disegno), ogni difetto riprodotto prima di correggerlo (24 test nuovi che falliscono con il codice di prima, prova della rete che cade nel browser); restano i punti di §7 e §11 |
| 5 | Resoconto | nel messaggio finale della sessione; dettagli in `docs/NATPF_GESTI_E_LATENZA.md` §8 e `docs/NATPF_ROADMAP.md` §1 |

Quinto giro (21/10: app nativa e Bluetooth, modalità diagnostica, migliorie già validate dall'audit):

| # | Attività | Stato |
|---|---|---|
| 1 | Valutazione app nativa, Bluetooth, tempo reale | fatto: `docs/NATPF_APP_NATIVA_E_TRASPORTI.md`, con misure (riconoscimento a 30/60/100/200 Hz, perdita di pacchetti simulata); raccomandazione «non ora» con una regola per decidere sui dati veri |
| 2 | Modalità diagnostica (video, registro completo, orologio, metriche, pacchetto, confronto, recupero, prova guidata) | fatto, provato nel browser con telefono simulato e webcam finta (19/19 su 150 s, ricarica a metà, prova guidata); telefono, webcam e persona veri **non provati** |
| 2b | Registri che si fermano dopo ~30 s | causa nel codice di prima: stop a 60 s e tutto in memoria (corretto); causa sul telefono vero (schermo che si spegne) **ipotesi**, ora rilevata e annotata |
| 3 | Migliorie validate: colpi senza attesa di rete (R12) | fatto, provato con perdita simulata (LAN e internet, 3% e 8%: nessun colpo oltre 50 ms, prima fino a 39 su 150); Wi-Fi vero **non provato** |
| 3c | Migliorie validate: webcam passo 0 (R5) | fatto, banco sintetico 16 criteri su 18 (non rispettati: pallonetto voluto 13%, tempo degli swing piccoli), nel motore PERFECT 89% contro 60% di prima; webcam e persona vere **non provate** |
| 3b | Migliorie validate: CPU Leggenda (R10) | fatto, tutti i criteri di `audit:legend` rispettati con i giocatori simulati (game vinti dalla CPU 66–99,6% secondo il profilo, errori 3,5–4,8% per colpo, 8–9 schemi, entropia 2,39–2,67 bit); casual e pro identici; persone vere **non provate** |

## 11. Prossimi passi

Prima di tutto: il **passo 17 di `SESSION_HANDOFF.md`** (gameplay come il gioco di riferimento), fasi C–E: campo
aperto continuo e movimento automatico contestuale, sincronia e animazioni, prove e rapporto. I punti aperti del passo
16 sono stati chiusi nella fase B (22/10 notte): partita intera di `phone-cal.mjs` (cause nella prova), forza degli
swing corti, diagnostica con una sola registrazione, presa del 19/10 verificata; le due prove della CI della pagina
storica passano 20/20 (non riprodotto). Risolti prima, dall'unione dei due branch: errore sull'evento `hand`,
calibrazione oltre 10 s con il tremolio, «Salta» nel passo «fermo».

0. **Validazione fisica della racchetta virtuale** (22/10): procedura in `docs/NATPF_RACCHETTA_VIRTUALE.md` §5 (telefono
   Android e iPhone, webcam, più persone, prova guidata con il video), poi tarare le soglie del §4.3 con i pacchetti.
1. Prova fisica del quarto giro (20/10) con telefono e computer veri, in quest'ordine: allenamento dal menu (le
   istruzioni del telefono e del computer coincidono? il giocatore resta fermo in calibrazione?), quattro gesti con la
   propria presa, esercizi; partita: un gesto un solo swing, nessun ritardo percepito; menu senza sfarfallio sulla
   propria scheda video; Wi-Fi spento e riacceso sul telefono durante calibrazione e partita (pausa, ripresa, stesso
   passo sui due schermi). Annotare fotogrammi al secondo e modello del computer (vedi §7, carico della scheda video).
2. Prova con persone vere: **prova guidata** della modalità diagnostica (menu → Maiusc+D → «▶ Prova guidata», con il
   video della webcam), almeno tre sessioni per telefono; poi `node scripts/diag/diag.mjs colpi sessione.zip` e
   `node --import ./test/register.mjs scripts/audit/replay-recording.mjs sessione.zip` per tarare `GESTURE.lobMove`,
   `AIM.gain/settle`. Le stesse sessioni decidono l'app nativa (regola in `docs/NATPF_APP_NATIVA_E_TRASPORTI.md` §6),
   la causa dei registri che si fermavano e le raccomandazioni rimandate (pallonetto dal telefono, direzione). Palle
   corte e dritti girando il polso: registrazione libera con un segno (Maiusc+M) per gesto. Poi varietà dei colpi
   giocando e 1v1 su due computer.
3. Unire `claude/friendly-fermat-dwv2w2` nel branch principale del lavoro (`feature/natpf-tennis-v2`) dopo la prova.
4. Server TURN per il 1v1 su reti che bloccano WebRTC; compensazione del ritardo per mouse/webcam del P2.
5. Se la prova 1 mostra fotogrammi sotto i 50 al secondo: pubblico diviso in settori (così si scarta quello fuori
   dall'inquadratura) e indicizzato, ombre solo da corpo, racchetta e palla, risoluzione massima 1,5×.
6. Palla corta con lo schermo girato di lato (§7): segnale dallo spostamento della mano o indicazione della presa.
7. 1v1: telefono del Player 2 che cade → pausa anche sull'host.
8. Altri punti aperti: `docs/NATPF_ROADMAP.md` §3.

## 12. Test e verifiche

- Giro «racchetta virtuale» (22/10): `natpf-tennis/test` **263** test (nuovi `natpf-racchetta.test.mjs`,
  `natpf-racchetta-motore.test.mjs`, più webcam, diagnostica, 1v1), `tools/test` **135** (calibrazione con colpi
  completi: fallisce con il codice di prima); audit della Leggenda completo, tutti i criteri; banco della webcam
  ridotto identico a prima (16/18, i due che mancano già mancavano); prima/dopo sui campioni reali dello ZIP e sulle
  scene della webcam con più persone (`docs/NATPF_RACCHETTA_VIRTUALE.md` §4.2.1). Prove nel browser (build finale):
  telefono in verticale 10/10 con i gesti fisici della racchetta simulata (prima erano rotazioni del telefono sul
  proprio lato lungo), allenamento 13/13, latenza 9/9, ricollegamento 6/6, rete che cade 6/6, menu 22/22, 1v1 18/18
  (anche sullo zip Cloudflare estratto),
  diagnostica lunga 23/23, LAN 7/8 (limite noto, §7). Tre difetti trovati da queste prove e corretti (calibrazione con
  colpi completi, piano vecchio, colpo della calibrazione in campo). Zip: `natpf-simulator-cloudflare-20261022.zip`
  (23,7 MiB, nessun file oltre 25 MiB) e `natpf-simulator-lan-windows-20261022.zip` (57,2 MiB, Node 22.22.0
  verificato), estratti e provati. Validazione fisica non eseguita (§4.3 del documento). Verifica successiva (22/10):
  la prova della CI «gesture and calibration» della pagina storica fallisce (evento `hand`), la prova del telefono con
  i gesti della presa del 19/10 fa 7/10 (10/10 prima del giro): `SESSION_HANDOFF.md`, «Difetti verificati».
- Seconda consegna del 23/10 (commit `90c4bc1`, build `2026-10-23.2`, richiesta del 23/10 passi 1–5): `natpf-simulator-cloudflare-20261023-2.zip` (23,7 MiB, 73 file, nessuno oltre 25 MiB) e `natpf-simulator-lan-windows-20261023-2.zip` (57,2 MiB, Node.js 22.22.0 verificato). Provati estratti: 1v1 nel browser sullo zip Cloudflare 18/18; pacchetto LAN con certificato e server HTTPS che risponde. Nessuna chiave privata né nome vietato. CI completa in locale sul commit: tutto passa (`tools/test` 148/148, `npm test` 336/336, Android 13/13, webcam 10/10, scambio 7/7, diagnostica 24/24, 1v1 18/18…) tranne LAN nel browser 7/8 (limite noto). Prova fisica: `docs/NATPF_PROVA_GUIDATA_2026-10-23.md`.
- Consegna del 23/10 (commit `9244b45`): `natpf-simulator-cloudflare-20261023.zip` (23,7 MiB, 84 file, nessuno oltre 25 MiB, contenuto di `dist` più `_headers`) e `natpf-simulator-lan-windows-20261023.zip` (57,2 MiB, Node.js 22.22.0 per Windows con SHA-256 verificato sull'elenco ufficiale). Provati estratti: lo zip Cloudflare servito come sito statico passa il 1v1 nel browser 18/18; il pacchetto LAN avvia il server HTTPS con il certificato locale e risponde con gioco, pagina del telefono, file della webcam, grafica e stanza del 1v1. Nessun certificato, chiave o nome vietato negli zip.
- Fasi D ed E del passo 17 (22/10, notte): `tools/test` 135/135, `npm test` 293/293; CI del sito in locale: telefono 10/10, tempi 8/8, gesto e calibrazione 18/18, grafica 9/9, pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4, nel browser 3/3 e 7/8 (limite noto), pacchetti creati; motore base nel browser: scambio vero 7/7, diagnostica 24/24, allenamento 13/13, risposta al gesto 9/9, presa verticale 10/10, presa del 19/10 10/10, menu 22/22, ricollegamento 6/6, rete che cade 6/6, build e 1v1 18/18.
- Fase C del passo 17 (22/10, notte): `tools/test` 135/135, `npm test` 293/293; CI del sito in locale: telefono 10/10, tempi 8/8, gesto e calibrazione 18/18, grafica 9/9, pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4, nel browser 3/3 e 7/8 (limite noto), pacchetti creati; motore base nel browser: scambio vero (`natpf-rally.mjs`, nuova) 7/7, diagnostica 24/24, allenamento 13/13, risposta al gesto 9/9, presa verticale 10/10, presa del 19/10 10/10, menu 22/22, ricollegamento 6/6, rete che cade 6/6, build e 1v1 18/18.
- Fase B del passo 17 (22/10, notte): `tools/test` 135/135, `npm test` 281/281; CI del sito in locale: telefono 10/10, tempi 8/8, gesto e calibrazione 18/18, grafica 9/9, pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4, nel browser 3/3 e 7/8 (limite noto del contenitore), pacchetti creati; motore base nel browser: diagnostica 24/24, allenamento 13/13, risposta al gesto 9/9, presa verticale 10/10, presa del 19/10 10/10, menu 22/22, ricollegamento 6/6, rete che cade 6/6; partita intera della pagina storica (`phone-cal.mjs`) 17/17. Difetto 6 non riprodotto (20/20).
- Branch unito (22/10, sera, dopo il merge della seconda sessione): `npm test` **276**/276, `tools/test` 135/135; nel
  browser telefono 10/10, allenamento 13/13, risposta al gesto 9/9, ricollegamento 6/6, rete che cade 6/6, menu 22/22,
  1v1 18/18, diagnostica 24/24, LAN 7/8 (limite noto); CI della pagina storica: telefono 10/10, grafica 9/9, pacchetto
  ridotto 5/5, 6/6, 10/10, LAN in Node 4/4, **«gesture and calibration» e «timing-browser» falliscono** (con il
  rilevatore di prima 18/18 e 8/8); `phone-cal.mjs` fallisce (nessun lancio in partita, anche con il rilevatore di
  prima); presa del 19/10 con i gesti di prima 7/10.
- Quinto giro (21/10): `natpf-tennis/test` **236** test, con Leggenda (`natpf-legend.test.mjs`, 11, e uno in
  `natpf-flows`) e webcam (`natpf-webcam-classifier.test.mjs`, 15); `tools/test` **134**; `npm run audit:legend`
  tutti i criteri; banco della webcam (`scripts/audit/webcam-sweep.mjs`) 16 criteri su 18. Nuovi: `natpf-diag.test.mjs` (16:
  metriche, zip, magazzino, registratore, analisi a righe uguale al calcolo su tutto il registro, rotazione senza
  eventi o campioni persi o doppi, spazio su disco, avviso del confronto), `tools/test/phone-link-fast.test.mjs` (5), in `natpf-flows`
  l'avviso del blocco dello schermo (fallisce senza la condizione sulla pagina nascosta). Prove nel browser:
  diagnostica `natpf-diag-session.mjs` **23/23** su 150 s a macchina scarica (sessione lunga, parti, spazio,
  ricarica, prova guidata; costo del registratore mediana 0,7 ms al secondo, scrittura più lunga 1,6 ms),
  telefono 10/10, risposta al gesto 9/9, allenamento 13/13, rete che cade 6/6, ricollegamento 6/6, menu 22/22, 1v1
  18/18, LAN 7/8 (la verifica che manca è il limite noto del contenitore, §7). Misure: perdita di pacchetti
  (`natpf-swing-loss.mjs`), riconoscimento per frequenza dei sensori (in `docs/NATPF_APP_NATIVA_E_TRASPORTI.md`).
- Quarto giro (20/10), a fine giro: `natpf-tennis/test` **191** test, `tools/test` **129**; nuovi: `natpf-cal-view`,
  `natpf-calibration-matrix`, `natpf-gesture-hud`, `natpf-physics-steps` (3), `natpf-flows` (21, interfaccia vera sul
  motore senza disegno con `test/ui-world.mjs`), `tools/test/calibration-replay` (2). Prove nel browser (Chromium senza
  schermo, telefono simulato): allenamento 13/13, ricollegamento 6/6, rete che cade 6/6 (`natpf-phone-blackout.mjs`:
  3 su 3 falliscono con il codice di prima), risposta al gesto 9/9, presa verticale 10/10, menu 22/22, 1v1 tra due
  browser 18/18 (anche sullo zip Cloudflare estratto), 1v1 in LAN 10/10, telefono del sito 10/10, 18/18, 6/6;
  pacchetto LAN estratto: server, gioco, pagina del telefono e stanza 1v1 rispondono. Zip: `natpf-simulator-cloudflare-20261020.zip`
  (23,6 MiB, nessun file oltre 25 MiB) e `natpf-simulator-lan-windows-20261020.zip` (57,1 MiB, Node 22.22.0 verificato). Audit della calibrazione: 864/864 calibrazioni,
  10 368 colpi senza colpi persi, lati sbagliati o colpi speciali non voluti. Misure: fisica senza scatti (prima 3
  fotogrammi su 25 sbagliati a 60 Hz e 11 su 60 fermi a 144 Hz), QR 0,16 ms per risposta del relay (prima 10 ms).
- `tools/test`: 126 test passano (19/10). Nuovi: calibrazione con tremolio, rientro al centro, preparazione e
  accompagnamento (il test fallisce con il codice precedente: riproduce il difetto segnalato).
- Secondo giro: `natpf-tennis/test` **156** test; `natpf-gesture-grip.test.mjs` (6 su 9 falliscono con il codice di
  prima: dritti come pallonetti, quarto pallonetto di fila, angolo della traiettoria, quarta palla corta, impugnatura
  cambiata, tabella) e `natpf-aim.test.mjs` (4 su 6 falliscono con il codice di prima: con il piatto a sinistra, al
  centro o a destra la palla cadeva sempre a x −0,59…−0,64 m). Prova nel browser `tools/e2e/natpf-phone-upright.mjs`:
  QR, calibrazione, 6 dritti con il polso → 6 colpi normali, pallonetto, mira destra/sinistra: **10/10**. Audit dello
  scambio invariato (i profili simulati mirano con il polso, non con il piatto: la nuova mira non vi entra).
- `natpf-tennis/test`: 140 test passano (19/10, dopo il punto 4; nuovi `natpf-versus.test.mjs`, 9 test che
  falliscono con il codice di prima, e `natpf-arena-court.test.mjs`).
- Prova a due sessioni (punto 4): `cd tools/e2e && node natpf-1v1-p2p.mjs` (dopo la build): stanza dal menu, link,
  P2 entra, «Sono pronto», «Gioca», partita al meglio di 3 con il servizio del P2, punteggio uguale, P2 esce (host in
  pausa con spiegazione) e rientra (si riprende), host chiude (P2: «stanza chiusa»), link inesistente: **18/18**.
- Grafica (punto 5): rendering dalle camere di gioco di P1 e P2 con Chromium senza schermo.
- Punto 3: `natpf-tennis/test` 129 test (nuovo `natpf-variety.test.mjs`).
  `npm run audit:variety`: altezza sulla rete del giocatore p10–p90 1,38–2,02 m (prima 1,26–1,74), scarto
  rimbalzo–bersaglio −0,02 m (prima −2,1 m). `npm run audit:rally`: punti vinti per profilo entro ±5 punti da prima.
- Prima del punto 3: `natpf-tennis/test` 123 test (19/10). Nuovi: rovescio morbido + rientro (fallisce col codice
  precedente), zona palla diretta e lato dalla palla.
- **Non verificato**: calibrazione con un telefono vero in mano; soglie (`CAL.settle` 220 ms, `homeRest` 600 ms,
  `homeWeak` 0,75) tarate su gesti simulati.

## 13. Configurazioni (senza segreti)

- `localStorage`: `natpf-tennis.specials` (soglie pallonetto/palla corta), `natpf-tennis.classifica`, chiosco,
  formato partita, `natpf.displayLagMs` (ritardo dello schermo, 0–200 ms, dal pannello della diagnostica);
  `sessionStorage`: nickname, profilo del telefono.
- File system privato del browser: sessioni della diagnostica in `natpf-diag/<id>/` (eventi, campioni, video,
  `meta.json`); si cancellano dal pannello.
- Prove: `tools/e2e/natpf-diag-session.mjs` (`SECONDS`, `VIDEOS=webcam,gioco|webcam|gioco|nessuno`, `VERBOSE`),
  `tools/e2e/natpf-swing-loss.mjs` (`MODE=lan|internet`, `N`, `LOSS`, `ROOT` per misurare un altro checkout; serve
  iptables).
- Parametri URL: `?intro=0`, `?diag=1`, `?mode=leggenda` (anche `casual`, `pro`), `?room=&role=p2&net=p2p`.
- Calibrazione: costanti `CAL` in `site/js/tennis/calibration.js`; gesti: `GESTURE` in `natpf_gestures.js`;
  mira: `SWING_AIM`/`FACE_AIM` in `natpf_skill.js`.
