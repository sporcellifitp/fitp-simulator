# B15 · Audit dei mancini (08/11/2026)

Richiesta dell'utente: «Assicurati che per i giocatori mancini sia tutto uguale». Un mancino che fa gli stessi gesti a
specchio deve ottenere gli stessi colpi, la stessa forza, la direzione a specchio, lo stesso riconoscimento e la stessa
esperienza (tutorial, calibrazione, testi, webcam, stesso schermo, 1v1).

Specchio (campo x → −x): un vettore cambia x; un asse di rotazione (pseudovettore) cambia y e z; la presa del telefono è
la stessa (schermo verso chi gioca), quindi nel riferimento del telefono il giroscopio cambia α e γ, l'accelerazione x.
Il verso del gesto sul telefono è assoluto: `dir` +1 da destra a sinistra, −1 da sinistra a destra; il dritto del destro è
+1, quello del mancino −1 (`forehandDir`).

Prova automatica: `natpf-tennis/test/natpf-mancini.test.mjs` (7 prove, vedi §3).

## 1. Inventario: dove la mano conta

| Dove (file:riga) | Che cosa fa | Giusto? |
|---|---|---|
| `site/js/tennis/swing-detect.js` (tutto) | Rilevatore: verso dall'asse di calibrazione (+1 destra→sinistra), gesto verticale, soglie, forza. Non sa la mano | ✓ agnostico; la prova a specchio dà picco, lift, angolo uguali e verso opposto |
| `site/js/tennis/calibration.js:14-16` | `PLAN`/`QUICK_PLAN` fissi `['L','R']`: il primo gesto era sempre «da destra a sinistra» = il ROVESCIO del mancino | ✗ corretto: `calibrationPlan(options)` per mano (`['R','L']` e `['R','R','R','L','L','L']` al mancino): prima il dritto a tutti e due |
| `site/js/tennis/calibration.js:148-156` | Il primo gesto fissa l'asse e il segno (presumeva «L») | ✗ corretto: `want = plan()[0]`, `S.axis` resta l'asse del gesto «L» (`sw.axis·SIGN[want]`), verso sbagliato = l'altra lettera |
| `site/js/tennis/calibration.js:172,189-197,223-241` | Asse, riferimenti (`refs`, `heads`, `rises`, `faceRef`) per verso ±1, preferenza del gesto nel verso chiesto | ✓ per verso, non per mano |
| `site/js/tennis/stroke-shape.js` | Forma rispetto alla gravità: `plane` cambia segno a specchio, `rise`/`roll`/`tilt`/`head` no | ✓ «speculare tra destri e mancini» verificato (±0,03) |
| `site/js/tennis/face-tracker.js` | Imbardata del piatto (`yaw`, `abs`) e `headAt` | ✓ yaw e heading opposti a specchio (±1,5°), head uguale |
| `site/js/tennis/gesture-intent.js:6-9,50` | `canonicalTwist(axis, prof.axis, g, dir)`: polso relativo al verso del colpo; `aim` del gesto | ✓ `prof.axis` è l'asse del gesto «L» (ha il segno della mano): il twist cambia segno a specchio e la mira del gesto pure. (Nei gesti verticali, dir 0, non si specchia: innocuo, la mira vera è il piatto; vedi §4) |
| `site/js/tennis/motion-sign.js` | Segno dell'accelerazione (iPhone) | ✓ non dipende dalla mano |
| `site/js/tennis/racchetta.js:71-82,137-139,231,506` | Mano: `preferences().hand`, `applyHand` (menu, figura della presa, profilo salvato), scritta «Dritto/Rovescio» dal piano e dalla mano, cambio dal telefono → `hand` al computer; `cfg` dal computer la applica | ✓ (con il piano per mano la scritta del mancino diventa «Dritto →» per prima) |
| `site/js/tennis/grip-art.js:100-106` | Figura della presa specchiata (`scale(-1 1)`), aria «Mano sinistra» | ✓ |
| `natpf-tennis/src/natpf/natpf_phone_racket.js:190-226` | `natpfSwingToEngine`: `forehandDir`, lato, segno di `head` (palmo/dorso), `hand` nell'evento | ✓ |
| `natpf_phone_racket.js:302-333` | `strokeSide`, `sideFromBall`, `expectedStrokeDir` (anche per il P2 che guarda +z) | ✓ verificati |
| `natpf_phone_racket.js:346,397-408,452,481-496` | Una sola mano (quella del gioco): `setHand` → telefono (`cfg.hand`); `_onPhoneHand` dal telefono → `onHand` (NatpfHand.set) e ritorno; P2 dello split con chiave `.p2` | ✓ non possono disaccordare: il telefono applica ciò che manda il computer; un cambio sul telefono torna confermato |
| `natpf_phone_racket.js:555,592` | `profileRise(forehandDir)` per i prototipi dei propri gesti | ✓ |
| `natpf_gestures.js:70-78` | `headBaselineFromProfile(profile, hand)`: segno per lato | ✓ |
| `natpf_gestures.js:112-200` | `createAimModel`/`createFaceModel`/`createLiftModel` per verso ±1 | ✓ evolvono a specchio (prova «modelli che imparano») |
| `natpf_gestures.js:275` | `aimFromSignals` (face → twist → gesto) | ✓ (twist già nel segno della mano) |
| `natpf_stroke_intent.js` | Intenzione dalla forma: `|plane|`, `rise`, forza, profondità, `face` dallo scarto del piatto | ✓ uguale a specchio, `face` opposta |
| `natpf_stroke_outcome.js:160-240` | `contact` ±1 (+1 dritto del destro o rovescio del mancino), spinta naturale `−c·natural`, tempo `−c·aimT`, incrociato stretto `−c·x > 0`, `superShot` `ballSide·c` | ✓ x opposta (±0,02 m), profondità uguale |
| `natpf_skill.js:201-206` | `swingLandingX` con `contact` | ✓ |
| `game_engine.js:1913-1920` (P1) e `2268-2275` (P2) | Lato senza `side` dall'evento: `dirX > .14` → rovescio, palla a sinistra → rovescio (convenzione del destro) | △ solo per eventi senza lato (webcam dal movimento, mouse): per il P1 locale `NatpfHand` li scambia prima (`leftySide`); il telefono manda sempre il lato (`sideFromBall` se il gesto non ha verso) |
| `game_engine.js:2023,2366` | `contact = (rovescio ? −1 : 1)·(mano sinistra ? −1 : 1)` | ✓ |
| `game_engine.js:2189-2191` | `_natpfRacketShot`: `fh` dalla mano dell'evento, `contact` dal lato, `hitX`/`mirror` per il P2 | ✓ P1 e P2 verificati a specchio nel motore senza grafica |
| `game_engine.js:1646-1652` | `_p2SwingInput`: la mano del P2 arriva con il colpo → `natpfP2Hand`, personaggio specchiato | ✓ ma solo dal primo colpo (vedi split_ui) |
| `natpf_impact.js:87-90,132,257-268` | `handOf` (P2: `natpfP2Hand`), lato del dritto nel piano d'intercetto, `webcamGate` | ✓ |
| `natpf_hand.js` | `NatpfHand`: mano unica salvata, personaggio specchiato, palla del servizio nell'altra mano, `_emitSwing` scambia il lato di webcam/mouse (`leftySide`) | ✓ |
| `motion_controls.js:775-776` | Webcam (argon): lato dal `webcamGate` (già con la mano), `handedSide` | ✓ |
| `motion_controls.js:952-955` | Webcam per due (`_duoEmit`): lato della scia nella convenzione del destro, al P2 con la sua mano ma SENZA scambiarlo | ✗ corretto: per il P2 mancino il lato si scambia (come `leftySide` per il P1) |
| `natpf_split_ui.js:139,210-212,455-461` | Mano del P2 dello split (`natpfPhone2.setHand`, personaggio, `p2HandPreference`) | △ corretto: anche `engine.natpfP2Hand` (il piano d'intercetto del P2 sapeva la mano solo dal primo colpo) |
| `natpf_training.js:58-98` | `liveFeedback`: lato atteso, «da destra verso sinistra» per mano, mira incrociato/lungolinea con `contact` | ✓ |
| `natpf_training.js:100-106` | `calCoach`, `sideWant` | ✓ |
| `natpf_training.js:118-133` | `trainingDirection` (cross/line dal lato del contatto), `trainingShot` (schiacciata non chiamata dal lato del gesto) | ✓ |
| `natpf_training.js:363-366,497-501` | `_presentBall` e `_feed`: palla dal lato del dritto/rovescio del mancino | ✓ (prova nel browser HAND=left) |
| `natpf_training.js:382` | `_hitCal`: colpo del gesto di calibrazione con `side: calSide(want, hand)`, `source: 'natpf-warmup'` | ✗ corretto: `NatpfHand.leftySide` scambiava quel lato (non era «natpf-phone»): il dritto del mancino era colpito di rovescio. Ora `handedSide: true` |
| `natpf-tennis/src/racket_kinematics.js:472-497,711-726,745-747` | Racchetta animata: nello scambio sceglie il lato dalla palla (`R = ball.x·sideSign`, regola del destro), sovrascrive il lato dato dal motore e scrive `actor.swingType` (letto dall'allenamento, dalle scritte, dal corpo); stessa regola per la preparazione (`anticipationSide`, `activeStanceSide`) | ✗ corretto: il segno include la mano del personaggio (`actor.natpfHand`, messo da `NatpfHand.apply`/`mirrorRemote`): per il mancino la palla alla sua sinistra è il dritto |
| `natpf_training.js:453-455,598-601,681-694` | Giudizio con la mano; foto della presa specchiata; animazione `demo.play(id, { hand })` | ✓ |
| `natpf_cal_view.js:43-55` | `calSide`, `calPrompt` (titolo «Dritto/Rovescio» per mano, freccia dal gesto) | ✓ |
| `natpf_gesture_pose.js`, `natpf_gesture_motion.js`, `natpf_gesture_demo.js` | `mirrorPose`/`mirrorStroke`/camera specchiata; le schede del tutorial per il mancino | ✓ (natpf-gesture-pose, -speeds e la prova «schede a specchio») |
| `natpf_tutorial.js:163-187` | Modale: foto e animazione con la mano | ✓ |
| `natpf_events.js:164-165`, `natpf_arcade.js` | Minigiochi: direzione con la mano | ✓ |
| `natpf_ui.js:160-174`, `index.html:366,418,472-483,821-822` | Scelta della mano: lobby (pannello Racchetta, due volte nelle pagine), stesso schermo (P1 e P2), lezione del riscaldamento; salvata in `localStorage` (`natpf-tennis.hand`, `.p2`) | ✓ una impostazione, ricordata tra sessioni |
| `webcam_strokes.js:259-264`, `webcam_argon_track.js:131` | Lato dal movimento nella convenzione del destro | ✓ scambiato da `NatpfHand` (P1) e, ora, da `_duoEmit` (P2) |
| `webcam_pose_strokes.js:7-10`, `webcam_strokes.js:105-107` | Polso/mano da seguire in base alla mano | ✓ |
| `natpf_p2p.js`, `natpf_versus*.js` | 1v1 tra due computer: la mano del P2 viaggia con ogni colpo (`motion_controls.js:226,262`) | △ l'host la sa dal primo colpo del P2 (prima: piano d'intercetto da destro per la prima palla). Non corretto: serve un messaggio di stato nuovo; effetto solo sulla posizione del corpo del P2 prima del suo primo colpo |
| `tools/lan` | Server LAN: nessuna logica sulla mano (inoltra i messaggi) | ✓ |

## 2. Asimmetrie trovate

| # | File:riga | Effetto per il mancino | Corretta |
|---|---|---|---|
| A | `site/js/tennis/calibration.js:14-16,148-156` | La calibrazione chiedeva prima «Rovescio ←» e poi «Dritto →» (al destro prima il dritto); nel tutorial la scheda del dritto viene prima | Sì: piano per mano, primo gesto generalizzato (`calibrationPlan`, `QUICK_PLAN_LEFT`, `PLAN_LEFT`); `phone-sim`, `natpf-racchetta.test` e l'e2e seguono il piano della mano |
| B | `natpf-tennis/src/motion_controls.js:955` | Webcam per due: il P2 mancino colpiva con il lato del destro (il suo dritto arrivava al motore come rovescio, e viceversa) | Sì: `_duoEmit` scambia il lato per il P2 mancino |
| C | `natpf-tennis/src/natpf/natpf_split_ui.js:211,459` | Stesso schermo: il piano d'intercetto del P2 mancino lo metteva da destro fino al suo primo colpo | Sì: `engine.natpfP2Hand` da `setHand` e da «Gioca» |
| D | `natpf_p2p.js` (1v1 tra due computer) | Come C, finché non arriva il primo colpo del P2 dalla rete | No (serve un messaggio di stato; effetto minimo: posizione del corpo prima del primo colpo) |
| E | `site/js/tennis/gesture-intent.js:50`, `natpf_gestures.js:275` | Mira dal polso dei gesti verticali (dir 0) non specchiata | No: innocua. Vale solo per telefoni senza il piatto (`fh`), la mira in gioco è il piatto (`aimSource` 'face') e il tipo di colpo non la usa |
| F | `game_engine.js:1913,2268` | Lato dalla palla/dirX da destro quando l'evento non ha il lato | No: non raggiungibile dal telefono (lato sempre presente) né dalla webcam del P1 (`leftySide`); il P2 webcam ha sempre il lato della scia |
| G | `natpf_training.js:382` | Calibrazione in campo: il colpo del gesto «Dritto» del mancino era giocato di rovescio (`NatpfHand.leftySide` scambiava il lato dell'evento `natpf-warmup`) | Sì: `handedSide: true` (trovata con la prova nel browser HAND=left: «il giocatore colpisce con il colpo del gesto» KO) |
| H | `racket_kinematics.js:472-497,711-747` | In ogni scambio la racchetta animata rileggeva il lato dalla palla con la regola del destro e lo scriveva in `actor.swingType`: il dritto del mancino risultava un rovescio (esercizio «Dritto»: «Era un rovescio: la palla va sul dritto» a ogni palla; scritte e corpo di conseguenza). L'esito del motore (`_natpfRacketShot`) era già giusto | Sì: lato e preparazione nel riferimento della mano del personaggio (`actor.natpfHand`); prova «racchetta animata» nel test (fallisce senza la correzione) |

## 3. Prove

`natpf-tennis/test/natpf-mancini.test.mjs`:
1. catena intera a specchio: 96 gesti del braccio simulato (dritto, rovescio, due pallonetti, due palle corte, tagliato,
   schiacciata su palla alta × 4 velocità × 3 piatti), telefono calibrato a specchio per mano → verso opposto, picco
   (±6 °/s), lift, forma (`rise`/`tilt`/`roll` ±0,03, `plane` opposto), piatto e direzione opposti (±1,5°), lato, colpo,
   forza (±0,01), velocità del motore, intenzione (`power`, `depth`, `reach`, `rise`, `tilt`, `roll` ±0,01; `face` opposta);
   `strokeOutcome` con contatto e palla riflessi (5 tempi × 3 posizioni × 2 ritmi): caduta opposta (±0,02 m), profondità
   (±0,02 m), voto, errori, colpo super e `swingLandingX` uguali;
2. modelli che imparano: 18 colpi (dritti, rovesci, pallonetto, palla corta, tagliato, piatti ±14°) → salita abituale
   uguale, scarto della mira opposto;
3. schede del tutorial (dritto, rovescio, servizio, piatto, pallonetto, palla corta, tagliato, schiacciata, volée,
   incrociato, lungolinea) con le due calibrazioni (animazione, braccio): il mancino legge dalla sua animazione lo stesso
   colpo del destro, mira opposta;
4. motore senza grafica, Player 1: 8 casi × 3 tempi, palla/corpo/gesto riflessi → stessa profondità e voto, caduta opposta;
5. motore senza grafica, Player 2 del 1v1 (destra = −x): caduta opposta, profondità uguale;
6. funzioni pure: `strokeSide`, `calSide`, `calCoach`, `sideWant`, `calPrompt`, `sideFromBall`, `expectedStrokeDir` (P1 e
   P2), `leftySide`, `webcamGate`, `liveFeedback` (incrociato/lungolinea e consiglio «da sinistra verso destra»),
   `trainingShot`, `trainingDirection`, `aimFromSignals`;
7. calibrazione: al mancino prima il dritto (`['R','L']`, esteso `['R','R','R','L','L','L']`), il telefono simulato la
   passa con lo stesso esito a specchio; il primo gesto nel verso sbagliato (il rovescio) si rifà, per tutti e due;
8. racchetta animata: il lato dalla palla segue la mano del personaggio.

Prove nel browser (Chromium, telefono simulato, `tools/e2e`), parametro `HAND=left` aggiunto a `natpf-training-flow.mjs`
e `natpf-tutorial-phone.mjs`:
- `natpf-training-flow.mjs`: HAND=right 20/20, HAND=left 20/20 (mano scelta nel gioco e ricevuta dal telefono, menu e
  figura della presa; «Dritto →» per primo e «Rovescio ←»; gesto nel verso sbagliato «Altro verso →»; palla del gesto a
  sinistra (x −1,05) poi a destra; il giocatore colpisce di dritto e di rovescio; esercizio «Dritto» con la freccia →, 2
  colpi contati). Prima delle correzioni G e H la stessa prova dava 18/20 (dritto giocato di rovescio, «Era un rovescio»).
- `natpf-tutorial-phone.mjs`: HAND=right 38/38, HAND=left 38/38.

## 4. Non verificato

- Telefono vero nella mano sinistra (sensori sintetici e telefono simulato soltanto).
- Webcam vera con un mancino (solo la scia simulata della prova `natpf-webcam-duo`).
