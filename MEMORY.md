# MEMORY.md · NATPF Simulator

Memoria di lavoro del progetto: da leggere all'inizio di ogni sessione e da aggiornare alla fine di ogni attività.
Non contiene password, token o altri segreti.

Ultimo aggiornamento: 20 ottobre 2026 (quarto giro: allenamento, calibrazione, risposta al gesto, menu, audit) · branch `claude/friendly-fermat-dwv2w2` (ripartito da
`feature/natpf-tennis-v2`, che contiene tutto il lavoro precedente; i branch `backup/*` e gli altri `feature/natpf-*`
sono già inclusi)

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

Intro, menu da console (frecce/Invio/Esc), modalità contro CPU / sfida un amico, 1v1 e 2v2, allenamento con
calibrazione ed esercizi (dritto, rovescio, pallonetto, palla corta, servizio, angoli), sfide per eventi (Radar,
Bersagli 60", Scambio infinito, Sfida il campione), nickname e classifica del giorno (solo nel browser), modalità
chiosco e pannello dell'addetto (Ctrl+Maiusc+K o logo premuto 3 s), diagnostica e registrazione dei gesti (Maiusc+D).

## 7. Problemi noti

- Prove con telefoni veri, webcam con persone e due computer reali non possibili in questo ambiente.
- p2p su Cloudflare senza server TURN: alcune reti (NAT simmetrici) possono non collegarsi.
- Il browser di prova usa la grafica software: fotogrammi lenti (1,6–1,8 s), tempi delle prove automatiche imprecisi.
- Test e2e LAN: il telefono simulato non chiude la connessione WebRTC verso l'indirizzo di rete del contenitore, e il
  browser di prova non raggiunge quell'indirizzo (il P2 apre l'invito su 127.0.0.1, ripiego nella prova).
- 1v1: il ritardo di rete P2 → host è compensato solo per il telefono e solo per il tempo nel relay; mai provato con
  due computer veri né su reti diverse; senza TURN alcune reti non si collegano. Tra due giocatori automatici perfetti
  gli scambi possono durare a lungo (84 e 154 colpi nelle prove; `natpf-1v1-p2p.mjs` ora lascia passare la palla
  dopo 10 colpi, altrimenti il Player 2 poteva non arrivare mai a servire nel tempo della prova).
- Colpi e mira: soglie (pallonetto con mano che sale ≥ 0,25, decisa ≥ 0,5; mira 26°, centro 10°) tarate sul simulatore
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

## 9. Modifiche recenti

| Data | Commit | Cosa | File |
|---|---|---|---|
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

## 11. Prossimi passi

0. Prova fisica del quarto giro (20/10) con telefono e computer veri, in quest'ordine: allenamento dal menu (le
   istruzioni del telefono e del computer coincidono? il giocatore resta fermo in calibrazione?), quattro gesti con la
   propria presa, esercizi; partita: un gesto un solo swing, nessun ritardo percepito; menu senza sfarfallio sulla
   propria scheda video; Wi-Fi spento e riacceso sul telefono durante calibrazione e partita (pausa, ripresa, stesso
   passo sui due schermi). Annotare fotogrammi al secondo e modello del computer (vedi §7, carico della scheda video).
1. Prova con persone vere: una registrazione (Maiusc+D → Registra) con una sequenza dichiarata, per esempio 5 dritti
   normali, 5 dritti girando il polso, 3 pallonetti, 3 palle corte, 3 dritti mirati a destra e 3 a sinistra; poi
   `node --import ./test/register.mjs scripts/audit/replay-recording.mjs file.json` per tarare `GESTURE.lobMove`,
   `AIM.gain/settle`. Poi varietà dei colpi giocando e 1v1 su due computer.
2. Unire `claude/friendly-fermat-dwv2w2` nel branch principale del lavoro (`feature/natpf-tennis-v2`) dopo la prova.
3. Server TURN per il 1v1 su reti che bloccano WebRTC; compensazione del ritardo per mouse/webcam del P2.
4. Se la prova 0 mostra fotogrammi sotto i 50 al secondo: pubblico diviso in settori (così si scarta quello fuori
   dall'inquadratura) e indicizzato, ombre solo da corpo, racchetta e palla, risoluzione massima 1,5×.
5. Palla corta con lo schermo girato di lato (§7): segnale dallo spostamento della mano o indicazione della presa.
6. 1v1: telefono del Player 2 che cade → pausa anche sull'host.
7. Altri punti aperti: `docs/NATPF_ROADMAP.md` §3.

## 12. Test e verifiche

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
  formato partita; `sessionStorage`: nickname, profilo del telefono.
- Parametri URL: `?intro=0`, `?diag=1`, `?room=&role=p2&net=p2p`.
- Calibrazione: costanti `CAL` in `site/js/tennis/calibration.js`; gesti: `GESTURE` in `natpf_gestures.js`;
  mira: `SWING_AIM`/`FACE_AIM` in `natpf_skill.js`.
