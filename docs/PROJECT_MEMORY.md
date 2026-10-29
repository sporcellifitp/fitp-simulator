# PROJECT_MEMORY · NATPF Simulator

Memoria tecnica durevole: architettura, decisioni, storico delle modifiche significative. Aggiornare quando si
prende una decisione che un agente futuro deve conoscere. Stato operativo in `WORK_PROGRESS.md`, ripresa in
`SESSION_HANDOFF.md`. Storico fino al 28/10/2026: `MEMORY.md`, `WORKLOG.md` (radice) e `docs/NATPF_*.md`.

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

Presa (`grip-art.js`, `GRIP_TEXT`): telefono **in piedi nel pugno come il manico di una racchetta**, dita attorno ai
lati lunghi, cima (fotocamera) in alto e un poco in avanti, **display rivolto di lato** (a destra o a sinistra); dal
computer si vede solo il bordo. Mai piatto con il display verso lo schermo. Calibrazione e partita con la stessa presa.

Rilevatore sul telefono (`site/js/tennis/swing-detect.js`): il colpo è un picco della **velocità di rotazione**
(giroscopio): inizio > ~140 °/s (scalato sul proprio colpo), picco minimo, almeno 18° percorsi, durata 30–700 ms.
L'istante del picco è l'impatto. Dopo un colpo, il gesto opposto entro ~0,6–0,9 s è il rientro e non conta.

Classificazione (`natpf-tennis/src/natpf/natpf_gestures.js`, `classifyPhoneShot`):
- **Dritto / rovescio**: rotazione attorno all'asse **verticale**. Destro: dritto da destra verso sinistra
  (H = +1), rovescio da sinistra verso destra; mancino invertito.
- **Topspin** (colpo normale): orizzontale con la mano che **sale un poco** (dal basso verso l'alto).
- **Piatto**: orizzontale **veloce** (potenza ≥ 0,78 del proprio colpo) con piatto dritto.
- **Pallonetto**: gesto **verticale verso l'alto** (asse di rotazione orizzontale, la mano sale davvero), oppure
  orizzontale con la mano che sale molto.
- **Tagliato (slice)**: gesto **dall'alto verso il basso** (verticale senza verso, palla bassa) oppure orizzontale con
  la mano che scende, **non lento**.
- **Palla corta**: dall'alto verso il basso, **lento e morbido** (potenza < 0,45 o velocità bassa).
- **Schiacciata**: palla alta + gesto verso il basso (verticale o orizzontale con la mano che scende). Il punto
  d'impatto alto lo sceglie il movimento automatico (`natpf_impact.js`): sui pallonetti (oltre 3,3 m) e, a rete (entro
  7 m), su ogni palla raggiungibile sopra 2,05 m; da 2,3 m è sempre schiacciata.
- **Servizio** (`game_engine.js` ~1392): in `SERVE_STANCE` il primo gesto (o un tocco sullo schermo del telefono)
  **lancia la palla**; in `SERVE_TOSS` il gesto successivo la colpisce: la qualità dipende da quanto è vicino al
  **punto più alto** del lancio. Un gesto debole subito dopo il lancio viene ignorato.
- **Volée**: non è un gesto diverso. Il motore (`natpf_impact.js`) prende la palla al volo quando conviene
  (giocatore avanti); il gesto è un dritto o rovescio **corto**.
- **Direzione** (incrociato / lungolinea), `natpf_stroke_outcome.strokeOutcome`: il **tempo rispetto al proprio
  ritmo** pesa di più (`createRhythm`: mediana degli ultimi colpi × 0,8, al massimo ±0,6 unità, da 4 colpi, si reimpara a
  ogni partita): prima del solito → incrociato, dopo il solito → lungolinea, pieni ai bordi della finestra (peso 1);
  il voto anticipo/perfetto/ritardo resta sul tempo vero. Poi l'**orientamento del
  piatto all'impatto** rispetto al proprio colpo abituale (piatto girato a destra → palla a destra: peso 0,6; scarti
  oltre 45° sempre meno credibili, oltre 60° non contano). Barra «Anticipo / Centro / Ritardo». Corretto il 28/10 sera:
  qui prima c'era scritto il contrario.

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
- **Intro**: video `public/media/intro.mp4` (Cinema Studio 3.0, senza scritte né marchi) con titolo in HTML; il solo
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
  servizio senza lezione (`WARMUP_IDS` in `natpf_training.js`). La volée si allena a rete (`VOLLEY_Z`).

## Storico modifiche significative

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

### Webcam: colpi dal movimento (deciso il 28/10 notte, fatto il 29/10)

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
