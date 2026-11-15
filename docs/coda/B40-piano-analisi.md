# B40 · Fine partita v2 — piano per lo sviluppo (analisi, nessuna modifica al repository)

Analista: agente di preparazione (workflow `preparazione-b40-b49-b50`), 15/11/2026.
Base letta: `natpf-simulator` a `b0c8356` (worktree staccata `scratchpad/prep/b40/wt`), più il diff del ramo
`b41-fiera-2` (B41 seconda parte, non ancora unita).
Fonti della richiesta: `docs/coda/B40-fine-partita-v2.md`, `docs/TRACCIA_PASSI.md` righe ≈544–560 e ≈594–600.
La tavola grafica (artifact PMb2Gg3ZiakcHuqynZ2pJL) non è più leggibile: si segue la descrizione scritta.

STATO DEL PIANO: completo (15/11, 01:40 UTC). Repository non toccato; worktree dell'analisi
`scratchpad/prep/b40/wt` (staccata a `b0c8356`, un solo file non tracciato: la sonda `__b40_probe.js`).

## 0. Riassunto e ordine dei passi

- **Cosa c'è già** (non rifare): i tre riquadri, la pillola e i pulsanti del B35 (`natpf_match_stats.js:174-277`,
  `natpf-hud.css:740-1024`, `index.html:843-866`); classifica con prima le vittorie (`natpf_events.js:85`) e posto in
  classifica sulla schermata (`natpf_ui.js:304-312`, `cpuPill` 216-226); km/h veri solo dei colpi in campo (B34,
  `natpf_match_stats.js:56-75`); game per game (`m.games`, 104: i game a zero si ricavano); punti persi con il colpo a vuoto
  (102); chi vince **già** salta con la racchetta alzata in `MATCH_OVER` (`player_body_animation.js:276-284, 447-481`);
  ritratti SVG di tutti e cinque gli aspetti (`natpf_portrait.js:59-96`); modelli 3D di Lob & Drop con il loro rig; due
  viste con `setScissor` (`natpf_split.js:70-99`) e disegno ridotto in pausa (`PAUSE_DRAW`, `game_engine.js:71`); titolo su
  una riga e niente avviso della batteria sulla fine partita (B41.5/B41.2, ramo `b41-fiera-2`).
- **Soglie dai dati** (sezione 2): 8000 partite simulate come allo stand (1 game, battuta al visitatore). Con la tabella
  proposta chi gioca la prima volta prende 1–2 trofei nel **74 %** delle partite (1: 34,5 %, 2: 39,6 %, 3+: 25,9 %),
  almeno un oro nel **3,5 %**; ogni trofeo raggiungibile tranne l'**Asso**, mai visto con i servizi di base (solo con un
  servizio forte sulle righe, 2–7 partite su 100): da rimisurare dopo il B48.
- **Contatori** (sezione 3): serie, rimonta (punti e game), palle match annullate, colpi a vuoto, muro in
  `natpf_match_stats.js`; game a zero da `m.games`; prima partita e record di oggi in `natpf_events.js`; trofei in un
  modulo puro nuovo `natpf_trofei.js` con una tabella sola di soglie.
- **Card** (sezione 4): tra la testa e i riquadri, con il titolo che resta largo (B41.5 invariata); cornice per livello;
  MVP / Bella sfida; fino a 3 medaglie; record di oggi; prossimo trofeo; due card con la corona nello stesso schermo.
- **Personaggi** (sezione 5): esultanza `cheer` in loop chiuso (P = 0,683 s) e applauso `clap` da tennista (mano sulle
  corde); ritratti con **fotogrammi resi una volta** dal renderer del gioco (attori veri, luci dell'arena, 12 fotogrammi,
  256×320, 7,9 MB in due), arena ferma sotto la card, ripiego SVG. Misurato in software: un ritratto costa il 2,5–3,9 %
  dell'arena.
- **Ordine**: B40.1 contatori → B40.2 trofei e banco → B40.3 prima partita e record → B40.4 card con SVG → B40.5
  esultanza e applauso → B40.6 ritratti 3D e arena ferma → B40.7 documento, versione, pacchetti. B40.1–B40.3 non toccano lo
  schermo (unione facile anche con la B41.3 in corso); B40.4 parte dopo l'unione della B41.3.

## 1. Mappa del codice di oggi

Righe di `natpf-simulator` a `b0c8356` (la B41 seconda parte, ramo `b41-fiera-2` a `077cadc`, sposta di poco alcune
righe: indicate dove conta).

### 1.1 Fine partita (B33 → B35 → B41.5)

| Pezzo | Dove | Cosa fa oggi |
|---|---|---|
| Schermata (DOM) | `natpf-tennis/index.html:843-866` | `#victory-modal.nt-modal-backdrop` › `.nt-skill-card.natpf-end-card`: `.end-head` (kicker `#victory-kicker`, titolo `#victory-result-banner`, `#victory-sub`, pillola `#victory-games`), `#victory-rows` e `#victory-match-score` (scheda del B18, nascoste con i numeri), `#victory-stats` (i tre riquadri), `#victory-rematch` (stesso schermo, B20), footer con `#victory-pill` e i tre pulsanti `#btn-return-title` «Menu», `#btn-new-player` «Nuovo giocatore» (in fiera «Prossimo giocatore ›», B41.5), `#btn-play-again` «Gioca ancora»/«Rivincita» |
| Disegno | `natpf-tennis/src/hud_ui.js:339-373` (`showVictoryModal`) | scrive titolo, righe, poi con `w.stats`: `endScreen(w, w.stats)` e `statsHtml(...)` in `#victory-stats`; classi `has-stats`, `stats-split`, `natpf-lost`; evento `natpf:victory`. B41.5 (`b41-fiera-2`): dopo `classList.remove("hidden")` chiama `_fitEndTitle()` (titolo su una riga con `--fit`, `titleFit` di `natpf_match_stats.js`, `ResizeObserver` sulla `.natpf-end-card`) |
| Modello puro | `natpf-tennis/src/natpf/natpf_match_stats.js` | `BEST_ORDER`/`BEST` 174-183 (7 «cose belle»: vincenti, ace, super, perfetti, kmh, scambio, punti), `bestLabel` 186-198, `bestOf` 203-211 (al più 3, solo positive), `cpuPill` 216-226 (posto in classifica se vince, consiglio sul livello se perde), `endScreen` 233-254 (kicker, title, sub, games, tiles o players, pill, again), `ICON` 257-266 (SVG a tratto, niente file), `tileHtml` 267-269, `statsHtml` 271-277. B41.5 aggiunge `titleFit` dopo `statsHtml` |
| CSS | `natpf-tennis/natpf-hud.css:615-737` (scheda del B18) e `740-1024` (B35) | `--eu: min(1.04cqh, .58cqw)` sulla scheda (`#victory-modal.has-stats .natpf-end-card`, 96cqw × 94cqh, gradiente blu, `overflow: hidden`), riquadri `.end-tile`, schede `.end-player` dello stesso schermo; `@container natpf (min-aspect-ratio: 3/1)` 1010-1012 (ledwall 1920×540) e `(max-aspect-ratio: 5/4)` 1014-1024 (720×720). Sfondo del modale: `natpf-hud.css:527-531` (gradiente + `backdrop-filter: blur(6px)` su tutto lo schermo). B41.5: `--fit` nel `font` del titolo (righe ≈797 e ≈953) |
| Chi la apre | `natpf-tennis/src/game_engine.js:3542-3567` | punto che chiude la partita: `phase = "MATCH_OVER"`, scritta della partita, `showVictoryModal` 1,8 s dopo la scritta, con `view: _natpfMatchEndView(...)` (3594-3598: base di `natpf_point_call.matchEndView` + `stats` da `natpfStats.endView`). Sfida tra due computer, Player 2: 3884-3887 |
| Pulsanti | `natpf-tennis/src/natpf/natpf_ui.js:173-183` | «Gioca ancora/Rivincita» → `natpf_rematch.open` (B47, nasconde la schermata; «‹ Indietro» la rimostra con `show($('victory-modal'), true)`, `natpf_rematch.js:90`, senza ripassare da `showVictoryModal`); «Nuovo giocatore» → `newPlayer()` (`natpf_new_player.resetVisitor`, 59-100); `natpf:victory` → `_paintVictory` 314-317 (B41.5: in fiera «Prossimo giocatore ›» e «Menu» nascosto). Telecomando dello staff: `natpf_remote.js:38,170` tratta `#victory-modal` come uno strato con i suoi pulsanti |
| Stesso schermo | `natpf_split_ui.js:626-634` (`_paintRematch`, riga «chi vuole la rivincita») | la schermata è la stessa, con `stats-split`: due `.end-player` con nome, chip «Vince»/«Bella sfida», due riquadri piccoli; lo scambio più lungo nella pillola |

**Cosa del B35 resta** (decisione del 13/11: «i tre riquadri vanno bene»): titolo grande con il nome, pillola dei game,
al più tre riquadri tondi con le cose migliori (solo positive), pillola in basso, pulsanti a pillola. Il B40 li tiene e ci mette accanto la
card (sezione 4).

### 1.2 Dati già raccolti per partita (`natpf_match_stats.js`)

- Per lato (`side0`, 49-50): `points, aces, winners, net, out, whiff, serves, shots, fastest` (km/h veri, solo colpi in
  campo dal B34, `settle` 65-75), `supers, superOk`, `timing { perfetto, anticipo, ritardo, buono }`.
- Per partita (`newMatch`, 52-55): `mode` ('cpu' | 'split' | 'versus'), `level`, `gamesToWin`, `doubles`, `guest`,
  `games[]` (per game: chi l'ha vinto e i punti finali, 104), `cur` (punti del game in corso), `longest` (colpi dello
  scambio più lungo, dei due), `played`, `over`, `winner`.
- Ingressi dal motore (solo lettura, impronte uguali: `scripts/audit/fine-partita.mjs --impronte`): `start`
  (`game_engine.js:1272`), `shot` (servizio 2015, Player 1 2316, Player 2 2694), `point` (3529: `{ winner, why, strokes,
  whiff, gameWinner }`, prima del game), `guest` (3787, computer del Player 2: senza motivo del punto), `endView` (328-333).
- **Manca** per i trofei: la sequenza dei punti (serie, rimonta), i game a zero (si ricavano da `games[]`: `opponent === 0`),
  i colpi rimandati di fila, la prima partita di chi gioca, i record del giorno. Il posto in classifica arriva già dopo
  (`stats.rank`, sotto).

### 1.3 Classifica e record del giorno

- `natpf_events.js`: tabellone del giorno `BOARD_KEY = 'natpf-tennis.classifica'` (25) in localStorage, `freshBoard` (67:
  un giorno nuovo azzera tutto e **tiene le chiavi in più** solo nello stesso giorno), partite contro la CPU
  `MATCH_MODE = 'partite'` (79), `matchOrder` (85: prima le vinte, poi per punteggio), `addMatch` (87-95: `rank` 0 = fuori
  dalle prime 50), `matchList`/`topMatches` (97-98), `boardCsv` (99-106), `resetBoard` (172, «Azzera oggi»), `recordMatch`
  (175-182: senza nome = «Ospite» = fuori classifica, `guest: true`). Record per nickname e per giorno dei **minigiochi**
  (`RECORDS_KEY`, `recordsFor`/`putRecords`, 115-137): non riguardano le partite. **Non esistono record del giorno delle
  partite** (colpo più forte, scambio più lungo): vanno aggiunti (sezione 3).
- `natpf_ui.js:304-312` (`_matchEnded`): solo partita singola contro la CPU con un livello → `events.recordMatch(...)` →
  `stats.rank = { rank, total, score, guest? }`, letto da `cpuPill` («3° posto nella classifica di oggi»). La chiama
  `MatchStats.point` (305) con `onEnd` **prima** che la schermata si apra (1,8 s dopo): il rank c'è già quando si disegna.
- Fiera (B41.2, `b41-fiera-2`): senza nome il visitatore è «Visitatore N» (`natpf_fiera.visitorName`), numerato da capo ogni
  giorno, **in classifica** con quel nome; «Prossimo giocatore» lo azzera (`natpf_new_player.resetFairVisitor`).

### 1.4 Personaggi

| Pezzo | Dove | Note |
|---|---|---|
| Scelta | `src/natpf/natpf_personaggi.js` | `getCast()` 'sempre' (Classici) / 'lobdrop'; `castLooks(cast, multiplayer)` 57-59 → `{ player: 'p1'|'drop', opponent: 'cpu'|'p2'|'lob' }` |
| Classici (modello nel codice) | `src/natpf/natpf_character.js` | `CHARACTER_LOOKS` 19-35 (p1, cpu, p2, drop, lob), `createNatpfCharacter` 186-221 (sei parti Head/Torso/Hand_L/Hand_R/Foot_L/Foot_R), `finishNatpfActor` 262-311 (braccia e gambe IK), `applyNatpfLook` 347-361, `updateNatpfCharacters` 415-445 (a ogni disegno: aspetto, mascotte 3D, arti), racchetta `createNatpfRacket` 477-497. Geometrie e materiali condivisi tra gli attori |
| Lob & Drop nel codice | `src/natpf/natpf_lob_drop.js` | pezzi della mascotte sulle stesse sei parti (`applyMascot` 297) |
| Lob & Drop modelli 3D | `public/media/mascotte-drop.glb` (321 988 B), `mascotte-lob.glb` (331 184 B); `src/natpf/natpf_mascot_models.js` (carica solo con «Lob & Drop», `mascotModelInstance` 111-115 = `SkeletonUtils.clone`), `src/natpf/natpf_mascot_rig.js` (`createMascotRig` 164, `poseMascotBody` 229, `poseMascotArms` 306: le parti animate del tennista guidano le ossa) | con «Classici» non si scarica niente |
| Animazione del corpo | `src/player_body_animation.js` | `triggerPointReaction(actor, 'win'|'loss')` 188-210; **in `MATCH_OVER` la reazione resta accesa** (276-284 e 481): chi vince continua a saltare con la racchetta alzata (salto `|sin(9,2 t)|`, ogni 0,34 s, ampiezza che scende al 53 % dopo 1,72 s: 451-463, racchetta 576-580, mano libera alzata 670-673); chi perde resta a testa bassa con la racchetta giù (465-480, 581, 674). **Non c'è un applauso** |
| Viso | `src/player_facial_fx.js` | espressioni `happy_grin` / `shocked_loss` (le mette il motore al punto: `game_engine.js:3488-3492`, 1,8 s) |
| Ritratti oggi | `src/natpf/natpf_portrait.js` (SVG disegnati a mano: p1, cpu, p2, drop, lob) e `src/player_avatars.js` (HUD) | **niente miniature dai modelli 3D**; le immagini di Lob e Drop della tavola non sono nel repository |
| Prove senza browser | `test/mascotte-campo.mjs` (`mountActor`, `engineOf`: attori montati come nel motore, con viso, rig e racchetta), `test/mascotte-glb.mjs` (modelli veri senza GLTFLoader) | base per i test della posa «applauso» |

### 1.5 Stesso schermo e disegno

- `natpf_split.js:70-99` (`render`): due viste con `setScissor`/`setViewport` sullo stesso renderer, ombre calcolate una
  volta (`shadowMap.autoUpdate = false` per la seconda vista). Vale solo nelle fasi di gioco (`SPLIT_PHASES` 11): **in
  `MATCH_OVER` si torna a una vista sola** dietro la schermata.
- `game_engine.js:302-313`: un solo `WebGLRenderer` (`antialias`, niente `alpha`, niente `preserveDrawingBuffer`,
  `PCFSoftShadowMap`, ACES), `renderPixelRatio` ≤ 2 (`natpf_camera.js:131`). `_natpfFrame` 4309-4316: con la partita non in
  pausa `update(dt)` + `render()` **a ogni fotogramma**, anche in `MATCH_OVER` sotto la schermata che copre il 96 % × 94 %
  dello schermo (lavoro buttato, più il `blur(6px)` dello sfondo del modale ricalcolato). `PAUSE_DRAW` (71: disegno ogni
  500 ms) esiste già per la pausa.
- `three` 0.160.0 (`package.json`): le luci rispettano i layer della camera (si può disegnare solo i personaggi).

## 2. Soglie dei 12 trofei dai dati del gioco simulato

### 2.1 Come sono state misurate

- **8000 partite simulate senza grafica** sul motore vero (`scripts/audit/headless-engine.mjs` tramite
  `rally-balance.simulate`), con le statistiche vere della partita (`natpf_match_stats.installMatchStats`) e i contatori
  nuovi calcolati accanto (stesse regole della sezione 3). Configurazione **come allo stand** (valori di base del gioco):
  battuta «Sempre lo stesso» (contro la CPU batte sempre il visitatore, `natpf_battuta.js`), formato classico contro la
  CPU (il formato veloce di base vale solo nello stesso schermo), scambio caldo acceso (B42), **1 game** («in fiera si
  gioca un game», `natpf_lobby.js:227-228`); ogni partita è un visitatore nuovo (`eventoReset`).
- Giocatori simulati del telefono (`PHONE_PROFILES` di `rally-balance.mjs`): `bambino`, `umano` (adulto medio: gesto dopo
  il rimbalzo), `amatore`, `medioTel`, `tennista`, più **`principiante`** definito solo in questa analisi (adulto alla
  prima volta: tempo ±0,11 s, polso ±0,4, picco 520 °/s, mira voluta 2 volte su 10, gesto dopo il rimbalzo). Servizio
  «con la forma del telefono» (`servizio.mjs`, `PHONE_SERVES`, ipotesi del B18.2): `piano` per il bambino, `tardi` per il
  principiante, `insegnato` per gli adulti, `forte` per il tennista (il servizio di base dei profili ha `speed` indefinita
  con i profili del telefono: scartato).
- 18 gruppi profilo × livello a 1 game, semi 7 e 31, 400 partite per gruppo; 4 gruppi al meglio di 3 (seme 11, 200
  partite). Tempo: 6 min 48 s per tutte le 8000 partite (carico della macchina 4–7).
- Script (nella cartella dell'analisi, da portare nel repository come `scripts/audit/b40-trofei.mjs`, passo B40.2):
  - `/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b40/sim/trofei-sim.mjs`
    (`cd <worktree>/natpf-tennis && node --import ./test/register.mjs <script> --profile=umano --level=evento --games=1 --seed=7 --matches=200`,
    una riga JSON per partita con i contatori e la sequenza dei punti);
  - `/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b40/sim/run-all.sh` (tutto il giro);
  - `/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b40/sim/analisi2.mjs`
    (soglie, trofei per partita, miscela, raggiungibilità, Re di oggi) e `analisi.mjs --dist` (distribuzioni);
  - uscite: `sim/out/*.jsonl`, `sim/risultati-soglie.txt`, `sim/risultati-distribuzioni.txt`.
- **Miscela «chi gioca la prima volta»** (ipotesi dell'analisi, da confermare con il registro): 35 % principiante a
  Evento (Chi gioca: Adulto), 25 % umano a Evento, 25 % bambino a Bambini, 10 % principiante a Facile (Ragazzo), 5 %
  bambino a Facile.

**Attenzione (niente finzioni)**: sono giocatori simulati, non persone. Nel gioco simulato i visitatori vincono molto
(con la battuta sempre al visitatore: principiante a Evento 89 % delle partite, umano 96 %, bambino a Bambini 99 %) e gli
scambi sono lunghi (mediana dello scambio più lungo 21–26 colpi; lo scambio caldo del B42 li chiude verso i 25–30). Le
soglie sono **provvisorie**: vanno riviste (1) dopo il B48 (servizio con scelte: cambia ace e km/h), (2) con i dati veri
del registro dello stand dopo una giornata (righe `punto` con `colpi`/`fine`, `colpo` con `voto`/`kmh`, `partita.fine`).
Per questo stanno in una tabella sola (sezione 3.2).

### 2.2 Distribuzioni misurate (partite di 1 game; p50 / p90 / p95 / massimo)

| Contatore | bambino · Bambini | principiante · Evento | umano · Evento | principiante · Facile | tennista · Esperta |
|---|---|---|---|---|---|
| partite vinte | 99 % | 89 % | 96 % | 99 % | 100 % |
| punti giocati | 4 / 6 / 6 / 16 | 6 / 10 / 10 / 16 | 5 / 8 / 10 / 16 | 4 / 6 / 6 / 12 | 4 / 5 / 5 / 8 |
| colpi Perfetti | 9 / 18 / 21 / 28 | 10 / 18 / 21 / 44 | 9 / 17 / 19 / 31 | 4 / 8 / 10 / 18 | 4 / 9 / 11 / 16 |
| colpo più forte in campo (km/h) | 137 / 153 / 157 / 176 | 113 / 132 / 137 / 143 | 116 / 137 / 139 / 170 | 99 / 122 / 134 / 169 | 144 / 172 / 175 / 215 |
| scambio più lungo (colpi) | 21 / 28 / 29 / 45 | 26 / 31 / 32 / 40 | 26 / 31 / 33 / 42 | 18 / 27 / 29 / 37 | 15 / 25 / 27 / 31 |
| ace | 0 (mai) | 0 | 0 | 0 | 0 |
| vincenti | 2 / 3 / 4 / 6 | 2 / 3 / 4 / 5 | 2 / 3 / 4 / 6 | 2 / 3 / 4 / 4 | 3 / 4 / 4 / 4 |
| colpi super riusciti | 0 | 0 | 0 (max 1) | 0 | 1 / 2 / 2 / 6 |
| punti di fila | 4 / 4 / 4 / 4 | 3 / 4 / 4 / 5 | 3 / 4 / 4 / 5 | 4 / 4 / 4 / 5 | 4 / 4 / 4 / 5 |
| game vinto a zero | 50 % | 12 % | 20 % | 56 % | 81 % |
| palle match annullate e vinta (≥1 / ≥2 / ≥3) | 1,8 / 1,3 / 0,5 % | 16 / 7,3 / 2,5 % | 12 / 5,5 / 1,0 % | — | — |
| colpi rimandati di fila | 15 / 29 / 32 / 45 | 25 / 41 / 44 / 61 | 25 / 38 / 41 / 58 | 15 / 25 / 29 / 43 | 15 / 24 / 26 / 32 |

Ace: **0 in tutte le 8000 partite** con i servizi del telefono di base. Prova a parte (tennista, servizio `forteLinee`:
forza 0,88, 7 servizi su 10 cercati sulla riga, 100 partite per livello): 2 ace a Bambini, 3 a Facile, 7 a Esperta; con
`forte` 0. L'Asso è raggiungibile solo cercando le righe con un servizio forte: va rimisurato dopo il B48.

### 2.3 Soglie proposte

| Trofeo | Valore | Bronzo | Argento | Oro |
|---|---|---|---|---|
| **Cecchino** | colpi Perfetti nello scambio, soglia × game giocati | 16 | 21 | 27 |
| **Razzo** | colpo più forte finito in campo (km/h veri, B34) | 140 | 155 | 170 |
| **Maratoneta** | colpi dello scambio più lungo (dei due) | 30 | 34 | 38 |
| **Asso** | ace | 1 | 2 | 3 |
| **Vincente** | vincenti (palla non presa), soglia × game giocati | 4 | 5 | 6 |
| **Super** | colpi super riusciti | 1 | 2 | 3 |
| **Game a zero** | game vinti a zero: livello = base del livello della CPU + (game a zero − 1); base Bambini/Facile/Evento = bronzo, Esperta = argento, Leggenda = oro (stesso schermo e due computer: bronzo) | 1 game a zero a Bambini–Evento | 1 a Esperta (o 2 a Bambini–Evento) | 1 a Leggenda (o 2 a Esperta, 3 altrove) |
| **Rimonta** | solo partite vinte: palle match annullate; o un game vinto da 2 punti sotto (0-30, 15-40); o la partita vinta da un game sotto | 1 palla match, o da 2 punti sotto, o da un game sotto | 2 palle match | 3 o più (per esempio da 0-40) |
| **In serie** | punti vinti di fila; soglia + 2 per ogni game giocato in più | 4 | 5 | 7 |
| **Muro** | colpi di gioco rimandati in campo di fila (servizio escluso; si azzera con un proprio errore), soglia × √game giocati | 36 | 44 | 52 |
| **Prima volta** | prima partita di chi gioca (sessione, nome; sezione 3.1) | sempre alla prima partita | — | — |
| **Re di oggi** | posto nella classifica di oggi, solo partita **vinta**, in classifica (con un nome o «Visitatore N»), con almeno 5 partite di oggi | 3° | 2° | 1° |

Doppioni (sezione 3.3): «In serie» non si conta quando «Game a zero» o «Rimonta» lo contengono con un livello uguale o
più alto (in un game: 4-0 = 4 punti di fila; da 0-40 si vince solo con 5 di fila).

**Prima volta con un livello solo**: con i visitatori simulati che vincono quasi sempre, «argento = prima partita vinta»
darebbe l'argento a 9 adulti su 10. Proposta: un bronzo di benvenuto (decisione aperta, sezione 8).

### 2.4 Risultato con queste soglie (`sim/risultati-soglie.txt`)

Miscela «prima volta» (1 game):

| Trofeo | bronzo o più | argento o più | oro |
|---|---|---|---|
| Cecchino | 14,5 % | 4,0 % | 1,0 % |
| Razzo | 12,2 % | 2,4 % | 0,1 % |
| Maratoneta | 10,7 % | 2,2 % | 0,6 % |
| Asso | 0 % | 0 % | 0 % |
| Vincente | 7,0 % | 1,1 % | 0,3 % |
| Super | 0,1 % | 0 % | 0 % |
| Game a zero | 27,6 % | 0 % | 0 % |
| Rimonta | 12,7 % | 4,7 % | 1,4 % |
| In serie | 6,9 % | 0 % | 0 % |
| Muro | 10,8 % | 2,8 % | 0,6 % |
| Re di oggi (giornata di 20 / 40 / 80 / 150 partite) | 18,0 / 11,0 / 6,5 / 3,9 % | 10,9 / 6,5 / 3,9 / 2,4 % | 4,6 / 2,8 / 1,8 / 1,1 % |

- **Trofei per partita** (senza Prima volta e Re di oggi): 0 → 34,5 %, 1 → 39,6 %, 2 → 17,9 %, 3+ → 8,0 %. Con «Prima
  volta» chi gioca la prima volta prende **1 trofeo nel 34,5 % delle partite, 2 nel 39,6 %, 3 o più nel 25,9 %**: 1–2
  trofei nel **74 %** (obiettivo «di solito 1–2»). **Almeno un oro: 3,5 %** (obiettivo ≤ 10 %).
- Per gruppo (1 game; 0 / 1 / 2 / 3+ trofei del gioco; almeno un oro): bambino · Bambini 18 / 45 / 28 / 10, oro 2 %;
  principiante · Evento 40 / 36 / 15 / 9, oro 6 %; umano · Evento 37 / 36 / 18 / 10, oro 3 %; principiante · Facile
  31 / 60 / 8 / 1, oro 1 %; bambino · Facile 73 / 23 / 5 / 0, oro 2 %; bambino · Evento 96 / 4 / 0 / 0.
- Al meglio di 3 (soglie scalate come in tabella): principiante · Evento 30 / 39 / 22 / 10, oro 4 %; umano · Evento
  21 / 36 / 22 / 21, oro 4 %; bambino · Bambini 4 / 22 / 54 / 21, oro 2 %.
- **Oro oltre il 10 %** solo per i giocatori bravi ai livelli alti (voluto): tennista a Evento/Esperta Razzo 15 %, a
  Leggenda Razzo 63 % e Super 19 %; umano a Leggenda Razzo 37 % (a Leggenda la palla arriva più forte e si rimanda più
  forte). Al meglio di 3 il tennista a Esperta fa Game a zero d'oro nel 75 % (due game a zero a Esperta).
- **Raggiungibili** (miglior gruppo, % di partite, bronzo · argento · oro): Cecchino 38 · 16 · 4,8; Razzo 88 · 68 · 63;
  Maratoneta 30 · 5 · 1; Vincente 46 · 9,5 · 3,3; Super 81 · 46 · 23; Game a zero 98 · 98 · 75; Rimonta 24 · 10 · 4,5;
  In serie 22 · 19 · 0,5 (argento e oro solo oltre 1 game); Muro 23 · 14 · 3,5; Re di oggi sì; Prima volta sempre.
  **Asso: 0 con i servizi di base**, 2–7 partite su 100 con un servizio forte sulle righe (solo bronzo visto): unico
  trofeo da confermare (dopo il B48 o con i dati veri).

## 3. Contatori nuovi e funzione pura dei trofei

### 3.1 Contatori in `natpf_match_stats.js` (stessa regola di oggi: il motore chiama solo in lettura)

| Contatore | Dove si conta | Come |
|---|---|---|
| `run`, `streak` (serie di punti) per lato | `addPoint` (90-108), dopo `W.points++` | `W.run++; L.run = 0; W.streak = max(W.streak, W.run)` (`side0` 49-50: aggiungere `run: 0, streak: 0`) |
| game a zero, game a 15 | **nessuno stato nuovo**: da `m.games` (104) | funzione pura `loveGames(m, side) = m.games.filter(g => g.winner === side && g[other(side)] === 0).length` |
| rimonta in punti | `addPoint` prima di `m.cur[winner]++` | `m.def[side] = max(m.def[side], m.cur[other] - m.cur[side])` per i due lati; a fine game (`gameWinner`): `S.comeback = max(S.comeback, m.def[gameWinner])` per chi vince il game, poi `m.def = { player: 0, opponent: 0 }` |
| palle match annullate | `addPoint`, prima del punto | se l'altro lato è a un punto dal game (`cur[o] >= 3 && cur[o] - cur[s] >= 1`, formato classico; formato veloce: `cur[o] === 3`, punto decisivo, vedi `NF.gameWinner`) **e** a un game dalla partita (`gamesOf(o) + 1 >= gamesToWin`) e il punto lo vince `s` → `S.mpSaved++`. Servono `score.fair` (passarlo a `newMatch({ fair })` da `MatchStats.start`, 286-293, con `E.score.fair`) |
| rimonta in game | **nessuno stato nuovo**: da `m.games` | `gameComeback(m, side)`: massimo svantaggio in game prima di vincere la partita |
| colpi a vuoto (gesti senza palla) | `addShot` (78-87) | `const t = timingOf(grade); if (!serve && t === null && grade) S.missed++` (WHIFF, TOO LATE, TOO EARLY: oggi finiscono in `shots` ma non in `rated`). Il conto vecchio `whiff` (punti persi con il colpo a vuoto, 102) resta |
| colpi rimandati di fila (Muro) | `addShot` e `settle` (65-75) | un colpo di gioco (non servizio) del lato resta «in attesa» (`m.wall[side].pend = true`); diventa buono quando qualcuno colpisce di nuovo o il punto finisce non con quella palla fuori/in rete/a vuoto → `run++`, `best = max(...)`; un errore del lato (`fine` in rete, fuori, a vuoto, doppio fallo) → `run = 0`. Stessa regola di `settle` per i km/h. Sul computer del Player 2 (`guest`, `why` sconosciuto) non si conta (come ace e vincenti) |
| prima partita | **fuori dal motore**: `natpf_events.js` | contatore della sessione `natpf-tennis.partite-visitatore` (sessionStorage come il nickname, 151-160): `+1` in `_matchEnded`, azzerato da `set nickname` con un nome diverso, da `forgetGuest` (171, «Nuovo giocatore» e chiosco) e da `resetFairVisitor` (B41.5); con un nome, anche «nessuna riga di oggi con lo stesso nome» in `matchList`. Nello stesso schermo: per giocatore, azzerato da `resetNames` |
| posto in classifica | c'è già: `stats.rank` (`natpf_ui.js:304-312`) | in più `rank.total` (già restituito) per la regola «da 5 partite in classifica» |
| record di oggi | **nuovo** in `natpf_events.js` | nel tabellone del giorno una chiave `best: { kmh: { v, at }, scambio: { v, at } }` (`freshBoard` la tiene nello stesso giorno, la azzera il giorno dopo e con «Azzera oggi»); `noteBest(board, { kmh, scambio })` pura → `{ board, kmh: { value, mine, prev }, scambio: {…} }`. Si aggiorna in `_matchEnded` (tutte le partite di questo computer, anche lo stesso schermo e gli ospiti; non il Player 2 della sfida tra due computer). Niente nomi nel record: solo il valore |

Nella vista (`sideSummary`, 111-117) si aggiungono `streak, love, comeback, mpSaved, gameComeback, missed, wall, gamesPlayed`;
`viewOf` (151-159) riceve in più `first` (per lato) e `record`, e li mette nella vista (`v.first`, `v.record`).
`MatchStats.endView` (328-333) li prende da `this.first`/`this.record`, scritti da `natpf_ui._matchEnded` come oggi `rank`.

Impronte: i contatori non cambiano niente nel gioco; il test delle impronte (`fine-partita.mjs --impronte`, e il test che
lo ripete in `npm test`) deve restare uguale.

### 3.2 Funzione pura dei trofei (modulo nuovo `src/natpf/natpf_trofei.js`)

```js
export const TROPHY_IDS = ['cecchino','razzo','maratoneta','asso','vincente','super','zero','rimonta','serie','muro','prima','re'];
export const TROPHIES = { cecchino: { name: 'Cecchino', icon: 'target', … }, … };   // nome, icona, regola, testo del valore
export const TIER_NAME = ['', 'bronzo', 'argento', 'oro'];
// sum: sideSummary (con i contatori nuovi); ctx: { level, mode, guest, first, rank, games }
export function trophyTier(id, sum, ctx)      // 0 | 1 | 2 | 3
export function trophiesOf(sum, ctx)          // [{ id, tier, value, text }] già senza i doppioni (3.3), dal più alto
export function cardTrophies(list, n = 3)     // i 3 da mostrare
export function nextTrophy(sum, ctx)          // { id, tier, missing, text } o null
```

Soglie in **una tabella sola** (`TROPHY_TIERS`, sezione 2): ritoccarle dopo i dati veri dello stand è un cambio di una
riga, con i test che controllano solo l'ordine e la logica (non i numeri) più un test «tabella = piano».

### 3.3 Doppioni e scelta dei tre trofei della card

- In una partita di un game «Game a zero» contiene «In serie» (4 punti di fila) e la «Rimonta» da 0-40 contiene «In serie»
  (5 punti di fila): se ci sono tutti e due, «In serie» non si conta quando il suo livello è uguale o più basso.
- Ordine sulla card: livello (oro, argento, bronzo), poi rarità (ordine fisso del catalogo: Re di oggi, Asso, Super,
  Rimonta, Game a zero, Razzo, Cecchino, Vincente, Maratoneta, Muro, In serie, Prima volta). «Prima volta» va sempre per
  ultima e si mostra anche se ce ne sono già tre? **Proposta**: sì al posto della terza solo se la terza è un bronzo (chi
  arriva deve vedere il benvenuto).

### 3.4 «Prossimo trofeo» (chi perde)

Per ogni trofeo con un valore che cresce giocando (non Prima volta, Re di oggi, Game a zero, Rimonta) la distanza relativa dalla
soglia del livello successivo: `(soglia − valore) / soglia`; si sceglie la più piccola tra quelle **sotto il 50 %** (un
traguardo vicino), a parità il trofeo più facile. Testo positivo: «Prossimo trofeo: Razzo d'argento a 155 km/h · 12 km/h in
più». Se niente è vicino: «Prossimo trofeo: Cecchino di bronzo · colpisci quando l'anello diventa verde» (consiglio
gentile, mai un errore). Funzione pura, testata.

## 4. Card della partita (DOM/CSS)

La tavola non si legge più: struttura ricostruita dalla descrizione scritta (`docs/coda/B40-fine-partita-v2.md` punto 1,
`TRACCIA` ≈551). Dove la descrizione non dice niente c'è una **proposta** (segnata così) da confermare in revisione.

### 4.1 Dove sta la card nella schermata (convivenza con il B35 e con la B41)

Si tiene tutto quello che c'è: testa (kicker, titolo, pillola dei game), i tre riquadri, la pillola in basso, i pulsanti,
la riga della rivincita dello stesso schermo. La card entra **tra la testa e i riquadri**, in un contenitore nuovo
`#victory-cards`; i riquadri passano accanto alla card. Così:

- il **titolo resta largo quanto la scheda**: `_fitEndTitle` della B41.5 continua a misurare la stessa riga (niente
  titolo più stretto che finirebbe al minimo 0,5);
- gli id letti dalle prove e dal telecomando (`victory-result-banner`, `victory-games`, `victory-stats`, `victory-pill`,
  `btn-*`) non cambiano; le prove `readModal` di `natpf-fine-partita.mjs` aggiungono solo `#victory-cards` all'elenco
  delle parti che non devono sovrapporsi né uscire;
- senza card (ritratti spenti o dati mancanti) la schermata è identica a oggi (`#victory-cards.hidden`).

Disposizione (tutte le misure in `--eu` come il B35, cioè `cqh`/`cqw`, e `@container natpf`; niente `vw/vh`/`@media`):

| Area del gioco | Contro la CPU / due computer | Stesso schermo |
|---|---|---|
| 16:9 (1280×720, 1920×1080, 1366×768, 1024×600) | riga centrale a griglia `grid-template-columns: minmax(0, .34fr) minmax(0, .66fr)`: card a sinistra (proporzione 5:7, alta ≈ 52cqh), i tre riquadri a destra | le due card una contro l'altra (`.end-cards[data-n="2"]`, colonne 1fr «VS» 1fr), al posto delle due `.end-player` (che diventano il retro della card: nome, chip, due riquadri piccoli dentro la card) |
| `@container natpf (min-aspect-ratio: 3/1)` (ledwall 1920×540) | come 16:9 con la card più stretta (alta 60cqh) e `padding-inline` del B35 | due card basse affiancate, riquadri piccoli sotto il nome |
| `@container natpf (max-aspect-ratio: 5/4)` (720×720) | card **orizzontale** (fascia alta ≈ 30cqh: ritratto a sinistra, nome e medaglie a destra) sopra i riquadri | due card orizzontali impilate, corona su quella di chi vince |

### 4.2 Struttura della card (una per giocatore)

```html
<article class="end-card" data-side="player" data-frame="evento" data-won="1">
  <div class="card-frame">                         <!-- cornice: bordo con il gradiente del livello -->
    <span class="card-badge">MVP della partita</span>   <!-- chi perde: «Bella sfida» -->
    <div class="card-art">                         <!-- finestra del ritratto: sfondo a raggi del colore della cornice -->
      <canvas class="card-portrait" aria-hidden="true"></canvas>   <!-- personaggio animato (sezione 5) -->
      <svg class="card-crown" aria-hidden="true">…</svg>            <!-- solo stesso schermo, su chi vince -->
    </div>
    <h3 class="card-name">Visitatore 12</h3>
    <p class="card-sub">Livello Evento</p>         <!-- stesso schermo: la fascia («Adulto») -->
    <ul class="card-trophies" data-n="2">          <!-- 0–3 medaglie -->
      <li class="trophy" data-trophy="razzo" data-tier="2"><span class="medal"><svg>…</svg></span><b>Razzo</b><em>128 km/h</em></li>
    </ul>
    <p class="card-record">Record di oggi! 128 km/h</p>   <!-- oppure «Record di oggi: 141 km/h» -->
    <p class="card-next">Prossimo trofeo: Cecchino di bronzo · 2 colpi Perfetti in più</p>   <!-- solo chi perde -->
  </div>
</article>
```

- **Cornice per livello** (`data-frame`, variabile `--frame` in `natpf-hud.css`): Bambini **azzurra**
  (`#7fd8ff → #2fa8e6`), Evento **giallo-verde** (il giallo palla del gioco `#e3ff36 → #7ee04a`), Pro **oro**
  (`#ffe27a → #d4a017 → #fff1b0`), Leggenda **arcobaleno** (`conic-gradient` fermo: niente animazione di un gradiente, che
  ridipinge a ogni fotogramma). *Proposta* per i casi che la descrizione non dice: Facile (casual) **argento**
  (`#eef2f8 → #9fb0c8`); stesso schermo: la cornice segue la **fascia** di ciascuno (`natpfSplitBands`: Bambino → azzurra,
  Ragazzo → argento, Adulto → giallo-verde, come `WHO_LEVEL`); sfida tra due computer: giallo-verde.
- **«MVP della partita» / «Bella sfida»**: chi vince ha il nastro in alto pieno del colore della cornice; chi perde il
  nastro chiaro. Stesso schermo: **corona** (SVG a tratto pieno giallo, come le icone di `ICON`) sopra la card di chi vince.
- **Medaglie** (fino a 3, sezione 3.3 per la scelta): cerchio con gradiente bronzo (`#e3a06b → #8a5a2b`), argento
  (`#f4f6fa → #9aa1ad`), oro (`#ffe07a → #c99a00`), icona SVG a tratto (nuove: zero, freccia in su, fiamma, mattoni,
  germoglio, corona; le altre da `ICON`), nome del trofeo e valore. Niente file nuovi: SVG nel codice come `ICON`.
- **«Record di oggi»**: se la partita batte (o pareggia) il record del giorno del colpo più forte o dello scambio più lungo
  → «Record di oggi! 128 km/h» con il nastro; altrimenti una riga piccola con il record da battere. Mai il nome di un
  altro visitatore sulla card (i nomi stanno già nella classifica).
- **«Prossimo trofeo»** (solo chi perde, al posto del consiglio sul livello nella card; la pillola in basso del B35 resta
  com'è): il trofeo con la distanza relativa più piccola dalla soglia successiva (`nextTrophy`, sezione 3.4), sempre detto in
  positivo («2 colpi Perfetti in più», «12 km/h in più»).
- **Testi** solo italiani e positivi (regola del B35: niente errori, niente numeri negativi). Nomi lunghi: `.card-name` su
  una riga con `text-overflow: ellipsis` e `title` col nome intero (la card è stretta; il titolo grande ha già `--fit`).

### 4.3 Stati e cose da non rompere

- `natpf_rematch.cancel()` rimostra la schermata senza `showVictoryModal`: l'animazione dei ritratti va legata alla
  visibilità di `#victory-modal` (controllo a ogni giro del ciclo, non solo all'apertura).
- In fiera (B41.5) «Prossimo giocatore ›» e «Menu» nascosto: i pulsanti restano quelli; l'avviso della batteria della B41.2
  sta **solo** sulla pagina della fiera (`#natpf-fiera-alert`, `NatpfFiera.tick`), quindi non copre la card: una verifica
  in `natpf-fiera-telefoni`/`natpf-formato-fiera` lo tiene fermo (sezione 7).
- Telecomando dello staff: la card non ha pulsanti; l'ordine dei pulsanti della schermata non cambia.
- Sfida tra due computer: ognuno la sua card (Player 2 `guest`: niente Asso, Vincente, Muro, che non si sanno).
- Doppio contro la CPU: una card per la squadra di chi gioca (contatori del lato, ritratto di chi gioca); il B49 deciderà se
  aggiungere il compagno.

## 5. Personaggi che esultano in loop e ritratti dai modelli 3D

### 5.1 Movimento: esultanza e applauso (`src/player_body_animation.js`)

Oggi in `MATCH_OVER` chi vince salta già con la racchetta alzata (reazione `win`, che lì non si spegne: 276-284, 481) ma
l'ampiezza scende al 53 % dopo 1,72 s (`B = (1 − 0,55 f)^0,8`, 452) e la testa gira con `sin(8 t)` (526), che non torna
in fase con il salto; chi perde resta a testa bassa (`loss`). Da fare:

1. **`cheer`** (esultanza in loop): come `win` ma con `B = 1` e tutte le oscillazioni multiple di ω = 9,2 rad/s (testa
   `sin(9,2 t)` invece di `sin(8 t)`): periodo esatto **P = 2π/9,2 = 0,683 s** (due salti), così i fotogrammi del loop si
   chiudono senza scatto. Racchetta (576-580) e mano libera (670-673) come `win`.
2. **`clap`** (applauso da tennista: la mano libera batte sulle corde della racchetta): racchetta tenuta davanti al petto
   col piatto verso la mano libera (`Pe`, ramo nuovo accanto a 576-583), mano libera che va e viene sulle corde ogni P/2
   (2,9 colpi al secondo; `ue`, ramo nuovo accanto a 670-675), piccolo molleggio sulle ginocchia allo stesso ritmo
   (`A`, `p`) e testa che annuisce (524-527). Viso contento (`player_facial_fx` `HAPPY_GRIN`, non `SHOCKED_LOSS`).
3. **Quando**: in `MATCH_OVER` chi vince passa **subito** a `cheer` (è lo stesso movimento di `win`, senza calo) e chi
   perde fa `loss` per 1,0 s e poi `clap`, nel punto in cui oggi la reazione resta accesa (481). Vale in campo (si vede
   durante la scritta della partita) e nei ritratti. Niente cambia nei punti normali (`POINT_OVER`).
   Attenzione: `_updatePlayerAnimation` (`game_engine.js:3959`) passa l'inclinazione del telefono (o la mano della webcam)
   alla racchetta di chi gioca: durante la cattura dei ritratti va spenta (`i = null`), altrimenti il visitatore che muove
   il telefono dopo la partita finisce nei fotogrammi.
4. **Lob & Drop 3D**: `natpf_mascot_rig.poseMascotArms` (306) porta la mano libera sulla posizione vera quando è lontana
   dal riposo (`FREE_HAND_BLEND`, 83): l'applauso passa da solo; le mascotte nel codice usano le stesse parti. Mancini:
   lo specchio (`root.scale.x < 0`) vale anche qui.

### 5.2 Ritratti: tecniche provate e misure

Misurato nel browser (Chromium con **WebGL in software, SwiftShader**: nessuna scheda grafica in questa macchina; carico
9–12 per gli altri agenti; porta 4350) con una sonda che usa il renderer del gioco: camera «ritratto» davanti
all'attore vero, solo i personaggi (layer 5 sui loro oggetti), finestra 300×360 con `setScissor`, copia in un canvas 2D
con `drawImage`, foglio di 16 fotogrammi × 2 personaggi. Script:
`/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b40/browser/ritratti-misura.mjs`
(sonda `wt/natpf-tennis/src/natpf/__b40_probe.js`, solo nella worktree dell'analisi, copia in `browser/__b40_probe.js`),
uscite `browser/misura-classici.log`, `browser/misura-lobdrop.log`, fogli `browser/out/foglio-*.png` (guardati: chi vince
salta con la racchetta alzata, chi perde a testa bassa; Classici e Lob & Drop dai modelli GLB).

| Misura (1280×720, DPR 1) | Classici (luci proprie del ritratto) | Lob & Drop 3D (luci dell'arena riusate) |
|---|---|---|
| arena intera, come `render()` | 2297 ms · 241 chiamate · 1 457 438 triangoli | 1591 ms · 143 chiamate · 1 439 758 triangoli |
| un ritratto 300×360 | **57,6 ms · 58 chiamate · 17 400 triangoli** (2,5 % dell'arena) | **62,6 ms · 9 chiamate · 18 702 triangoli** (3,9 %) |
| primo ritratto | 3132 ms (programmi nuovi per le luci diverse) | 1926 ms con **0 programmi nuovi** (27 → 27): in SwiftShader è la compilazione interna dello stato, su una GPU vera no |
| copia nel canvas 2D (`drawImage` + lettura di 1 pixel) | 6,5 ms | 9,6 ms |
| foglio 16 fotogrammi × 2 personaggi | 1761 ms (55 ms a ritratto) | 2002 ms |
| memoria del foglio | 300×360×16×2×4 B = **13,2 MB** | uguale |

Non misurato: una GPU vera (desktop, Android), il ledwall. Stima (non misura): su una GPU il rapporto 2,5–4 % dell'arena
resta, cioè ≈ 0,3–1 ms a ritratto se l'arena costa 10–25 ms.

**Tecniche a confronto**

| | A · seconda vista three.js (secondo `WebGLRenderer` con copie dei modelli) | B · ritratto dal vivo nel renderer del gioco (ogni fotogramma: 2 ritratti + 2 copie) | **C · fotogrammi resi una volta (consigliata)** |
|---|---|---|---|
| contesti WebGL | 2 (limite e memoria su Android) | 1 | 1 |
| shader, geometrie, texture | ricompilati e ricaricati (GLB: texture due volte) | condivisi | condivisi |
| costo con la card aperta | una scena in più a ogni fotogramma | 2 ritratti + 2 copie a ogni fotogramma; l'arena va disegnata comunque (senza `preserveDrawingBuffer` un fotogramma con il solo ritratto cancella il resto del canvas) | **nessun disegno 3D**: si sfogliano i fotogrammi nel canvas della card; l'arena sotto la card (che copre il 96 % × 94 %) **si può fermare** come in pausa |
| rischio | alto | `drawImage` da WebGL può forzare una lettura dalla GPU su alcuni driver, a ogni fotogramma | la stessa lettura solo durante la cattura (K volte) |
| memoria | geometrie/texture doppie | 1 canvas per card | foglio K × L × A × 4 B per personaggio |

**Proposta (C)**:
- **Cattura** subito dopo il punto che chiude la partita, mentre c'è la scritta della partita (la card arriva 1,8 s dopo la
  scritta, `game_engine.js:3548-3560`): la reazione è già `cheer`/`clap` (5.1). Si fanno avanzare **solo i due attori**
  con `E._updatePlayerAnimation(actor, P/K)` (lo usa già `_natpfBackdropPose`, 4331-4345) più arti/mascotte
  (`updateNatpfCharacters`), mai `E.update()`; **un fotogramma per personaggio per `requestAnimationFrame`** (niente
  blocchi lunghi: in SwiftShader 55 ms a ritratto); K = **12** (P/12 = 57 ms, 17,6 fotogrammi al secondo, loop chiuso).
- **Luci dell'arena riusate** (layer 5 anche sulle tre luci di `_setupLightingAndSky`, 485-503) e **nebbia tenuta**:
  0 programmi nuovi (misurato), niente scatto di compilazione. Sfondo: `scene.background = null` solo durante il ritratto
  e `clearColor` del colore della finestra della card (il canvas del gioco non ha alpha): la finestra della card ha quello
  stesso colore pieno, la cornice è CSS.
- **Inquadratura** dal riquadro del personaggio (`Box3` dei suoi oggetti visibili, misurato sui K fotogrammi, racchetta
  compresa) con un margine del 6 %: nei fogli misurati la racchetta alzata di Drop tocca il bordo alto e quella di Lob
  esce a sinistra con una camera fissa.
- **Dimensioni**: finestra del ritratto = dimensione CSS della `.card-art` × DPR, con tetto **256×320 px** per fotogramma
  → foglio di 256×320×12×4 B = **3,9 MB a personaggio, 7,9 MB in due** (contro i 13,2 MB misurati con 16 fotogrammi
  300×360). Riuso dello stesso canvas del foglio tra una partita e l'altra (niente canvas nuovi a ogni partita).
- **Riproduzione**: canvas della card disegnato con `drawImage(foglio, k·L, 0, L, A, …)` dal ciclo esistente di
  `natpf_ui` o da un `requestAnimationFrame` proprio, **solo con la schermata visibile** (controllo della classe `hidden`
  di `#victory-modal` a ogni giro: copre anche `natpf_rematch.cancel`), fermo con `prefers-reduced-motion`.
- **Arena ferma con la card aperta**: in `_natpfFrame` (4309-4316), con `#victory-modal` visibile e la cattura finita,
  `update(dt)` continua (rete, telefoni, telecomando) ma `render()` va come `_natpfPauseFrame` (ridisegno ogni
  `PAUSE_DRAW.everyMs` o solo su `natpfBackdropDirty`, per esempio al ridimensionamento). Si guadagna l'arena intera a ogni
  fotogramma (oggi disegnata sotto la card e sfocata dal `blur(6px)`).
- **Ripiego**: se la cattura fallisce (contesto WebGL perso, eccezione) o non finisce entro 1,5 s dalla scritta, o con
  `?ritratti=svg`, la card usa il ritratto SVG di oggi (`natpf_portrait.natpfPortraitSVG(look)`) con un'animazione CSS
  solo di `transform` (salto per chi vince, dondolio per chi perde). Una riga nel registro/diagnostica con i ms della
  cattura (`ritratti: { ms, k, px }`), così si misura sul PC vero dello stand.
- **Android**: tetto 256×320 anche con DPR 2–3 (si vede appena più morbido), K = 12; con meno di 4 GB di memoria del
  dispositivo (`navigator.deviceMemory`) K = 8. **Ledwall**: il canvas del gioco è già grande quanto l'area
  (`viewport()` di `natpf_screen.js`, `game_engine.js:307-308`); la finestra di cattura sta dentro il canvas e le misure
  della card sono in `cqw/cqh`: niente di speciale, solo le schermate a 1920×540 e 720×720.
- **Stesso schermo**: due personaggi (P1 e P2), stessa cattura. **Sfida tra due computer**: ciascuno cattura i suoi due
  attori (il suo lato con la sua opzione dei personaggi). **Doppio**: solo chi gioca (`player`).

## 6. Passi di sviluppo (file:riga, test che fallirebbero prima, misure di accettazione)

Base: `natpf-simulator`. B40.1–B40.3 toccano solo modelli e test e possono partire subito; **dal B40.4 serve la B41.3
unita** (tocca la fine partita: `_fitEndTitle`, `titleFit`, «Prossimo giocatore ›», avviso della batteria; anche
`natpf_match_stats.js`, ma in un punto diverso: `titleFit` dopo `statsHtml`). Ramo `b40-fine-partita`, worktree
propria, porte del browser dello sviluppatore.
Un passo = un commit con test verdi (`npm test` del gioco, `node --test tools/test/*.test.mjs`), documento aggiornato.
Le righe sono di `b0c8356`: dopo la B41.3 si ritrovano dai nomi delle funzioni.

### B40.1 · Contatori nuovi (solo `natpf_match_stats.js`, nessun cambio a schermo)
- `side0` (49-50): `run, streak, comeback, mpSaved, missed`, e `wall: { run, best, pend }`; `newMatch` (52-55): `fair`,
  `def: { player: 0, opponent: 0 }`.
- `addShot` (78-87): `missed` (gesto senza palla), `wall.pend` per i colpi di gioco; `settle` (65-75) e `addPoint`
  (90-108): serie, rimonta, palle match annullate, muro (regole della sezione 3.1).
- Pure: `loveGames(m, side)`, `gameComeback(m, side)`; `sideSummary` (111-117) con i campi nuovi e `gamesPlayed`.
- `MatchStats.start` (286-293): `fair: !!E.score?.fair` (startNewMatch lo decide prima di `natpfStats.start`, 1254 → 1272).
- **Test nuovi** `test/natpf-b40-contatori.test.mjs` (falliscono prima: i campi non esistono):
  - serie `p p o p p p` → `streak` 3 (player) e 1 (opponent);
  - 4-0 → `loveGames` 1; 4-1 → 0; al meglio di 3 con 4-0, 2-4, 4-0 → 2;
  - `o o p p p p` (da 0-30) → `comeback` 2, `mpSaved` 0 (partita di un game: 0-30 non è palla match);
  - `o o o p p p p p` (da 0-40, un game) → `comeback` 3, `mpSaved` 3, `streak` 5;
  - al meglio di 3, game 1-1, decisivo 30-40 salvato → `mpSaved` 1; stesso 30-40 nel primo game → 0;
  - formato veloce (`fair`): 3-3 punto decisivo vinto → `mpSaved` 1 se è l'ultimo game;
  - `addShot({ grade: 'WHIFF' })` → `missed` 1, `rated` invariato;
  - muro: colpo, colpo dell'avversario (o punto vinto) → +1; colpo poi punto perso con «Out» → 0; servizio non conta;
    `guest` → 0;
  - impronte: `simulate` di tre partite con e senza le statistiche, impronta uguale (come `natpf-b33-fine-partita`).
- **Accettazione**: tutti i test vecchi verdi (in particolare `natpf-b33-*`, `natpf-b35-fine-partita`, `natpf-fine-partita`);
  impronte di `scripts/audit/fine-partita.mjs --impronte` uguali a quelle della base (5 righe «uguale»).

### B40.2 · Catalogo e funzione dei trofei (`src/natpf/natpf_trofei.js`, nuovo, puro) e banco delle soglie
- `TROPHIES`, `TROPHY_TIERS` (tabella della sezione 2.3), `trophyTier`, `trophiesOf` (con i doppioni 3.3),
  `cardTrophies`, `nextTrophy`; icone SVG nuove accanto a `ICON` (`natpf_match_stats.js:257-266`) o nel modulo nuovo.
- `scripts/audit/b40-trofei.mjs`: porta nel repository `sim/trofei-sim.mjs` + `sim/analisi2.mjs` (profilo `principiante`
  e servizi del telefono dentro lo script), uscita: le tabelle della sezione 2.4. Comando nel documento.
- **Test** `test/natpf-b40-trofei.test.mjs` (falliscono prima: il modulo non c'è):
  - per ogni trofeo: valore sotto, uguale e sopra le tre soglie → 0/1/2/3 (soglie lette da `TROPHY_TIERS`);
  - scala con la durata: Cecchino 16 a 1 game = bronzo, 16 a 2 game = niente; Muro 36 × √2 = 51 al meglio di 3;
  - Game a zero: 1 a Evento bronzo, 1 a Esperta argento, 1 a Leggenda oro, 2 a Evento argento;
  - Rimonta solo se vinta; In serie tolto quando Game a zero o Rimonta lo contengono;
  - `guest`: niente Asso, Vincente, Muro; stesso schermo: Game a zero bronzo (nessun livello);
  - Re di oggi: solo vinta, solo con `rank.total ≥ 5`, «Ospite» mai; Prima volta solo con `first`;
  - `cardTrophies`: al più 3, ordine oro → bronzo e catalogo; Prima volta al posto del terzo bronzo;
  - `nextTrophy`: scelta della distanza più piccola sotto il 50 %, testo senza parole negative (stessa espressione
    `NEG` dei test del B35);
  - banco: `b40-trofei.mjs --veloce` (2 gruppi × 40 partite, semi fissi) restituisce le stesse righe due volte di seguito
    (deterministico; i numeri non sono un test).
- **Accettazione**: `b40-trofei.mjs` completo rifà le tabelle della sezione 2.4 con gli stessi valori ± 0,5 punti
  (stessi semi, stesso motore); se il B48 è già unito, si rifanno le soglie e il documento dice i numeri nuovi.

### B40.3 · Prima partita e record di oggi (`natpf_events.js`, `natpf_ui.js`)
- `natpf_events.js`: `VISITOR_MATCHES_KEY` in sessionStorage (accanto a `NICK_KEY`/`GUEST_KEY`, 26-28), `visitorMatches`
  getter/setter, azzerato nel setter `nickname` (155) con nome diverso e in `forgetGuest` (171); funzioni pure
  `noteBest(board, { kmh, scambio }, { day, at })` e `bestOf(board)`; `resetBoard` (172) le azzera con il resto.
- `natpf_new_player.resetVisitor` (59-100) e, dopo la B41.3, `resetFairVisitor`: azzerano il contatore (già chiamano
  `forgetGuest`: verificarlo con un test). Stesso schermo: per giocatore, in `natpf_split_ui.resetNames`.
- `natpf_ui._matchEnded` (304-312): oggi solo CPU singolo; diventa: per **tutte** le partite di questo computer (non il
  Player 2 della sfida tra due computer) `first` (prima di incrementare) e `record` (`noteBest`); `recordMatch` resta solo
  per la CPU singolo come oggi. Scrive `this.stats.first` e `this.stats.record`, letti da `MatchStats.endView`.
- **Test** in `test/natpf-events.test.mjs` (o file nuovo `natpf-b40-giorno.test.mjs`): prima partita vera, seconda no,
  di nuovo vera dopo «Nuovo giocatore» e dopo un nome diverso; con lo stesso nome in classifica oggi: non prima;
  `noteBest`: primo valore = record, uguale = record (pari), più basso = no con `prev`; giorno nuovo = vuoto; «Azzera oggi»
  = vuoto; il CSV non cambia (`boardCsv` uguale a prima per le stesse partite); il registro non ha nomi (test esistente).

### B40.4 · Card della partita con il ritratto SVG (modello, HTML, CSS)
- Modulo puro `src/natpf/natpf_end_card.js`: `cardModel(view, base, { level, bands, looks })` → per lato `{ side, name,
  frame, won, badge, trophies, record, next, crown, look }`; `cardsHtml(model)`; ritratto iniziale
  `natpfPortraitSVG(look)` dentro `.card-art` (il canvas arriva al passo B40.6).
- `index.html` (843-866): `<div id="victory-cards" class="end-cards hidden" aria-label="Card della partita"></div>` tra
  `.end-head` e `#victory-rows`; una riga `.end-body` (griglia) che contiene `#victory-cards` e `#victory-stats`.
- `hud_ui.showVictoryModal` (339-373): `cardsHtml(cardModel(...))` in `#victory-cards`, classe `has-cards`; nello stesso
  schermo le card prendono il posto di `.end-players` (le due `.end-player` vanno dentro le card: nome e chip diventano
  nome e nastro, i due riquadri piccoli restano sotto il nome). `_fitEndTitle` (B41.5) non cambia: il titolo resta largo.
- `natpf-hud.css`: blocco nuovo dopo 1007 (prima delle `@container` 1010-1024), tutto in `--eu`; cornici `data-frame`;
  medaglie; le tre `@container` della sezione 4.1.
- **Test** `test/natpf-b40-card.test.mjs` (falliscono prima): vittoria contro la CPU (MVP, cornice del livello, trofei,
  record), sconfitta (Bella sfida, prossimo trofeo), stesso schermo (due card, corona solo su chi vince, cornice dalla
  fascia), sfida tra due computer Player 2 (`guest`), doppio; HTML senza parole negative; `data-n` delle medaglie ≤ 3;
  nessun nome di altri visitatori nella card.
- **Prove nel browser** (sezione 7): `natpf-fine-partita` estesa (A3 e C2 con `#victory-cards` fra le parti controllate).
- **Accettazione**: a 1280×720, 1366×768, 1920×1080, 1024×600, 1920×540, 720×720 e 1024×1024 la scheda sta nello
  schermo, niente scorre, niente tagliato o sovrapposto (le stesse misure `inView`, `scroll`, `clipped`, `overlap` di
  `natpf-fine-partita.mjs` più `#victory-cards`), per vittoria, sconfitta e stesso schermo, Classici e Lob & Drop:
  **42 casi su 42**. Titolo su una riga come nella B41.5 (rapporto `--fit` ≥ 0,9 a 16:9 con «Bella sfida, Visitatore 12!»).

### B40.5 · Esultanza e applauso in loop (`player_body_animation.js`)
- Reazioni `cheer` e `clap` (sezione 5.1): `triggerPointReaction` (188-210), blocco della reazione (447-481), testa
  (524-527), racchetta `Pe` (576-583), mano libera `ue` (670-675); scambio in `MATCH_OVER`.
- **Test** `test/natpf-b40-esultanza.test.mjs` con `test/mascotte-campo.mjs` (`mountActor`, `engineOf`) e
  `test/mascotte-glb.mjs` (falliscono prima: i tipi non esistono):
  - dopo il punto che chiude la partita e 2 s di animazione: chi vince `cheer`, chi perde `clap`;
  - `cheer`: altezza del salto ≥ 0,12 m a ogni ciclo tra 3 e 6 s (oggi scende a ≈ 0,085), periodo 0,683 s ± 1 fotogramma,
    posa a `t` e `t + P` uguale entro 1 mm (loop chiuso);
  - `clap`: distanza tra la mano libera e il centro delle corde < 0,08 m e > 0,18 m in ogni ciclo, ≥ 4 battute in 1,5 s;
  - Lob & Drop 3D: la mano libera (osso) segue lo stesso ritmo (`mascotRigProbe`);
  - piedi mai sotto il campo e niente allocazioni per fotogramma (come i test 211 e 339 di `natpf-mascotte-3d.test.mjs`);
  - mancino: stessi controlli con lo specchio.
- **Prova nel browser**: `natpf-lob-drop.mjs` con una schermata della fine partita in campo prima della card.

### B40.6 · Ritratti dai modelli 3D (`src/natpf/natpf_ritratti.js`, nuovo; `game_engine.js`; `hud_ui.js`)
- Cattura C della sezione 5.2: avvio da `MATCH_OVER` (punto in `game_engine.js:3542-3567`, o dall'evento della scritta
  della partita), un fotogramma per personaggio a `requestAnimationFrame`, K = 12, luci dell'arena con il layer 5, nebbia
  tenuta, inquadratura dal riquadro, tetto 256×320, ripiego SVG.
- Riproduzione nel `<canvas class="card-portrait">` solo con la schermata visibile; ferma con `prefers-reduced-motion`.
- `_natpfFrame` (4309-4316): con la schermata visibile e la cattura finita, disegno dell'arena come in pausa.
- `?ritratti=svg|3d` (prove e confronto, come `?mascotte=`), riga nel registro/diagnostica con i ms della cattura.
- **Test di unità** (puri): orario della cattura (quali attori, K, passo P/K), inquadratura dal riquadro (margine 6 %,
  personaggio intero nella finestra per i fotogrammi dati), disposizione del foglio, macchina degli stati
  (in attesa → cattura → pronto → in riproduzione → fermo; perdita del contesto → SVG), tetto delle dimensioni e K per
  `deviceMemory`.
- **Prove nel browser**: nuova `tools/e2e/natpf-fine-partita-ritratti.mjs` (sezione 7).
- **Accettazione** (con WebGL in software, cioè nel caso peggiore): cattura finita prima che la card compaia o, se no,
  card con l'SVG e poi i fotogrammi senza errori; nessun programma shader nuovo durante la cattura (`renderer.info.programs`
  uguale); con la card aperta **0 disegni dell'arena** in 3 s (contatore di `render()`), e con la card chiusa (Rivincita,
  Menu) l'arena torna a ogni fotogramma; fotogrammi diversi tra loro (salto) e personaggio non vuoto (pixel diversi dallo
  sfondo > 8 % della finestra); foglio ≤ 8 MB in due. Su un PC con scheda grafica (stand): cattura ≤ 150 ms in tutto,
  nessun fotogramma oltre 50 ms (da scrivere nel documento come «da misurare allo stand», con la riga del registro).

### B40.7 · Documento, versione, pacchetti
- `docs/b40/fine-partita-v2.md`: cosa vede chi gioca, come si attiva (sempre acceso; `?ritratti=svg`), catalogo con le
  soglie e le tabelle della sezione 2, misure dei ritratti, schermate (sezione 7.3), cosa non è provato.
- Versione nuova (`site/js/tennis/version.js`, `site/tennis/build.json`), build, zip Cloudflare e installer come da
  `CLAUDE.md`/`PIANO_LAVORI.md` §6, «come si attiva» per l'utente.

## 7. Elenco delle prove

### 7.1 Test di unità (`natpf-tennis/test`, `node --import ./test/register.mjs --test test/<file>`)

| File | Cosa prova | Passo |
|---|---|---|
| `natpf-b40-contatori.test.mjs` (nuovo) | serie, game a zero, rimonta in punti e in game, palle match annullate (classico, formato veloce, al meglio di 3), colpi a vuoto, muro, guest, impronte invariate | B40.1 |
| `natpf-b40-trofei.test.mjs` (nuovo) | soglie (sotto/uguale/sopra), scala con la durata, Game a zero per livello, doppioni, guest, Re di oggi (vinta, ≥ 5 partite, mai Ospite), Prima volta, scelta dei 3, prossimo trofeo positivo, banco deterministico | B40.2 |
| `natpf-b40-giorno.test.mjs` (nuovo) o `natpf-events.test.mjs` | prima partita (sessione, nome, Nuovo giocatore, Prossimo giocatore della fiera), record di oggi (`noteBest`, giorno nuovo, Azzera oggi), CSV uguale | B40.3 |
| `natpf-b40-card.test.mjs` (nuovo) | modello e HTML della card: vittoria, sconfitta, stesso schermo con corona, due computer, doppio, cornici per livello e fascia, niente negativi, niente nomi di altri | B40.4 |
| `natpf-b40-esultanza.test.mjs` (nuovo) | `cheer` senza calo e in loop chiuso, `clap` con la mano sulle corde, Classici e Lob & Drop 3D, mancino, piedi sopra il campo, niente allocazioni | B40.5 |
| `natpf-b40-ritratti.test.mjs` (nuovo) | parti pure della cattura: orario, inquadratura, foglio, stati, tetti per Android | B40.6 |
| da tenere verdi | `natpf-b33-fine-partita`, `natpf-b35-fine-partita`, `natpf-fine-partita`, `natpf-b37-collaudo`, `natpf-ospite`, `natpf-events`, `natpf-mascotte-3d`, `natpf-lob-drop`, `natpf-b41-fine-titolo` (della B41.5), `natpf-fiera` | tutti |

### 7.2 Prove nel browser (`tools/e2e`, porte proprie dello sviluppatore; con la macchina carica scrivere il carico)

| Prova | Cosa aggiungere |
|---|---|
| `natpf-fine-partita.mjs` (oggi 47 verifiche) | A: card presente con nome, cornice Evento, MVP/Bella sfida, 0–3 medaglie uguali a `trophiesOf` della vista (come oggi i riquadri sono confrontati con `endScreen`); B: record di oggi dopo due partite (la seconda più forte lo batte); C (stesso schermo): due card, corona su chi vince, cornici dalle fasce; misure A3/C2 con `#victory-cards` fra le parti di `readModal` (righe 42-45) a 1280×720, 1920×1080, 1920×540, 1024×600, 720×720, più 1366×768 e 1024×1024 |
| `natpf-lob-drop.mjs` | fine partita con «Lob & Drop»: card con il personaggio giusto per lato (Drop chi gioca, Lob la CPU o il Player 2), ritratti dai modelli 3D (stato `ready` dei GLB), schermata guardata |
| `natpf-stesso-schermo-b20.mjs` (oggi 52) | punto 4: con le card la riga della rivincita (`#victory-rematch`) resta visibile e non coperta (rettangoli che non si toccano) e la corona è su «Vince Giulia» |
| `natpf-formato-fiera.mjs` (oggi 22) | dopo il punto decisivo: Game a zero / Rimonta / In serie coerenti con la sequenza dei punti (formato veloce: palla match = punto decisivo) |
| `natpf-fiera-telefoni.mjs` e `natpf-b47-fiera.mjs` | fine partita in fiera: «Bella sfida, Visitatore N!» su una riga con la card accanto, «Prossimo giocatore ›», **nessun avviso della batteria** sopra la card (B41.2), «Gioca ancora» → scelta del livello → «‹ Indietro» → card di nuovo con il ritratto che si muove |
| `natpf-fine-partita-ritratti.mjs` (nuova) | cattura dei ritratti: stati, programmi shader invariati, 0 disegni dell'arena in 3 s con la card aperta e ritorno alla chiusura, fotogrammi diversi e non vuoti, foglio ≤ 8 MB, `?ritratti=svg`, contesto WebGL perso (`WEBGL_lose_context`) → SVG senza errori, ms della cattura nel registro |
| `natpf-telecomando.mjs` | con la card i pulsanti della schermata si raggiungono come prima (stesso ordine) |

### 7.3 Schermate da guardare (una per una, nel documento le principali)

Per ciascuna: **vittoria e sconfitta contro la CPU** (Evento; più una a Bambini, una a Esperta e una a Leggenda per le
cornici), **stesso schermo** (due card, corona), **Classici e Lob & Drop**, a **1920×1080**, **1280×720**, **1366×768**,
**1024×600**, **area stretta 720×720** e **ledwall 1920×540**; in fiera con «Visitatore 12». Si guarda: personaggio intero
nella finestra (racchetta compresa), salto/applauso nei fotogrammi, testi italiani interi, medaglie leggibili, niente
sopra la riga della rivincita, nessun avviso della batteria. Un GIF breve o 4 fotogrammi del loop per il documento.

## 8. Rischi e domande aperte

### 8.1 Rischi

1. **Giocatori simulati ≠ visitatori veri**: nel gioco simulato si vince molto e gli scambi sono lunghi; con persone vere
   (probabilmente meno precise) i trofei di durata (Maratoneta, Muro, Cecchino) potrebbero uscire meno. Rimedio: tabella
   unica delle soglie, banco `b40-trofei.mjs` nel repository e taratura con il registro dello stand dopo una giornata
   (righe `punto`/`colpo`/`partita.fine`: colpi per punto, fine del punto, voto e km/h).
2. **B48 in parallelo** (servizio con scelte, servizio della CPU vario): cambia ace e km/h. Asso e Razzo vanno rimisurati
   sul codice con il B48; se il B48 si unisce prima del passo B40.2 si misura direttamente lì.
3. **Asso mai visto** con i servizi di base (0 ace in 8000 partite); 2–7 partite su 100 solo con un servizio forte
   cercato sulle righe. Rischio di un trofeo che allo stand non esce mai.
4. **Bambini a Bambini più premiati** (1,3 trofei del gioco in media, 2,3 con Prima volta; Game a zero nel 50 %, Razzo nel
   39 %): voluto o da ridurre (domanda 8).
5. **Re di oggi dipende dalla giornata**: oro 4,6 % delle partite con 20 partite al giorno, 1,1 % con 150; le prime 4 della
   giornata non lo prendono (regola «da 5 partite»).
6. **Cattura dei ritratti**: `drawImage` dal canvas WebGL può costare una lettura dalla GPU su alcuni driver (misurato
   6,5–9,6 ms a copia in software, non misurato su Android); con la tecnica C succede solo K volte per personaggio.
   Memoria del foglio 7,9 MB in due (K = 12, 256×320): su Android con poca memoria K = 8.
7. **Compilazione degli shader**: luci proprie del ritratto = programmi nuovi (primo ritratto 3132 ms in software); con le
   luci dell'arena e la nebbia tenuta 0 programmi nuovi (misurato). Da tenere così.
8. **Arena ferma sotto la card**: se qualcosa cambia sotto (ridimensionamento, area del ledwall ricalibrata) serve il
   ridisegno su `natpfBackdropDirty`; tutte le strade che chiudono la card (Rivincita, Menu, Nuovo/Prossimo giocatore,
   chiosco, telecomando, rivincita dai telefoni) devono far ripartire il disegno: prove nel browser dedicate.
9. **Telefono nei fotogrammi**: `_updatePlayerAnimation` passa l'inclinazione del telefono alla racchetta; durante la
   cattura va spenta.
10. **Conflitti con la B41.3** (stesse righe di `hud_ui.showVictoryModal`, `natpf-hud.css` del titolo,
    `natpf_ui._paintVictory`): partire dopo la sua unione.
11. **720×720**: con la card lo spazio è stretto; card orizzontale e riquadri più bassi, verificati con le misure di
    `natpf-fine-partita` (niente scorrimento né tagli).
12. **Macchina carica**: le prove nel browser con tempi sono instabili; le verifiche nuove usano conteggi (disegni,
    programmi, pixel), non millisecondi, tranne la riga del registro che si legge allo stand.

### 8.2 Decisioni da prendere (con la proposta dell'analisi)

1. **Prima volta**: un livello solo (bronzo di benvenuto alla prima partita) — *proposta* — oppure bronzo / argento =
   prima partita vinta / oro = prima partita vinta a Esperta o Leggenda (con le vittorie simulate darebbe l'argento a 9
   adulti su 10).
2. **Cornici non descritte**: Facile = argento; stesso schermo = colore della fascia di ciascuno (Bambino azzurra, Ragazzo
   argento, Adulto giallo-verde); sfida tra due computer = giallo-verde — *proposta*.
3. **Re di oggi**: solo partite vinte, in classifica (nome o «Visitatore N»; mai «Ospite»), da 5 partite di oggi; 1° oro,
   2° argento, 3° bronzo — *proposta*.
4. **Record di oggi**: colpo più forte e scambio più lungo, di tutte le partite di questo computer (CPU e stesso schermo),
   solo il valore, mai il nome di chi l'ha fatto — *proposta*.
5. **«Prossimo trofeo»** anche a chi vince senza trofei (oltre a chi perde) — *proposta: sì*.
6. **Prima volta sempre in vista**: al posto del terzo trofeo se è un bronzo — *proposta: sì*.
7. **Arena ferma con la card aperta** (risparmio, sotto la card non si vede) — *proposta: sì*, con ridisegno su
   ridimensionamento.
8. **Bambini**: tenere le soglie uguali per tutti (i bambini a Bambini prendono qualcosa in più) — *proposta: sì*;
   in alternativa Game a zero a Bambini solo dal secondo game a zero.
9. **Soglie provvisorie**: rimisurare dopo il B48 e con i dati veri del registro dopo una giornata allo stand (passo
   successivo, piccolo: cambiare la tabella) — *proposta: sì*.
10. **Tecnica dei ritratti**: C, fotogrammi resi una volta (sezione 5.2) — *proposta*; B (dal vivo) se il foglio risulta
    troppo pesante su un dispositivo vero.

## 9. Misure fatte (con script e numeri) e cosa NON è stato misurato

**Misurato** (carico della macchina scritto accanto):

- Partite simulate per le soglie: 8000 (18 gruppi × 400 a 1 game, semi 7 e 31; 4 gruppi × 200 al meglio di 3, seme 11),
  6 min 48 s, carico 4–7 → `sim/run-all.sh`, `sim/trofei-sim.mjs`, `sim/analisi2.mjs`, `sim/analisi.mjs --dist`;
  risultati in `sim/risultati-soglie.txt` e `sim/risultati-distribuzioni.txt` (cartella
  `/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b40/`). Numeri
  principali nella sezione 2.
- Prima serie (servizio di base dei profili, `speed` indefinita): scartata e tenuta in `sim/out-misto/` e `sim/out-v1/`
  solo per confronto (stessi ordini di grandezza; niente ace anche lì).
- Ace con servizio forte sulle righe (tennista, `forteLinee`, 100 partite per livello, seme 5): 2 / 3 / 7 ace a Bambini /
  Facile / Esperta; con `forte` 0.
- Re di oggi: modello della giornata (400 giornate per misura; miscela «prima volta» con in più l'11,5 % di giocatori
  più bravi: amatore e medioTel a Evento, umano e tennista a Esperta) con la regola della classifica vera (`matchOrder`,
  `matchScore` con `LEVEL_WEIGHT`).
- Ritratti nel browser (SwiftShader, 1280×720, DPR 1, porta 4350, carico 9–12): tabella della sezione 5.2 →
  `browser/ritratti-misura.mjs` (`REUSE=1` per le luci dell'arena), `browser/misura-classici.log`,
  `browser/misura-lobdrop.log`, `browser/out/foglio-classici-1280x720.png`, `browser/out/foglio-lobdrop-1280x720.png`
  (guardati), `browser/out/fine-oggi-*.png` (schermata di oggi del B35 per confronto).

**Non misurato**: persone vere; una GPU vera (desktop dello stand, Android, ledwall); tempo della cattura e memoria su
Android; il B48 (non ancora finito); le partite al meglio di 5; lo stesso schermo e la sfida tra due computer nel banco
delle soglie (stesse regole per lato, numeri non simulati); la card stessa (non esiste ancora: le misure di
impaginazione sono proposte, da verificare con le prove della sezione 7).
