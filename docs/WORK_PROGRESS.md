# WORK_PROGRESS · redesign NATPF Simulator (dal 28/10/2026)

Richiesta dell'utente (28/10/2026), sei punti: tutorial con gesti realistici, sound design, redesign UI/UX,
minigiochi arcade, memoria persistente, workflow a fasi. Branch: `natpf-simulator`.
Legenda: [x] fatto e verificato · [~] in corso · [ ] da fare.

## Baseline (28/10/2026, prima delle modifiche)

- `npm test`: 390 test, 389 passati, 1 saltato (dipendenze LAN `tools/lan` non installate). Node 22.22.0.
- Chromium di Playwright funzionante: screenshot del percorso con `scripts/ui-shots.mjs`.
- Audit: lanciapalle senza modello 3D (la palla nasce dal nulla a z = −11,6, `natpf_training._feed`); bersagli
  della sfida «Bersagli 60"» solo come cerchi piatti a terra; 4 fogli di stile NATPF che si sovrascrivono;
  pagine del menu con larghezze e allineamenti diversi, testi molto piccoli nelle tessere.

## Task

### T0 · Memoria persistente
- [x] `CLAUDE.md`, `docs/PROJECT_MEMORY.md`, `docs/WORK_PROGRESS.md`, `docs/SESSION_HANDOFF.md`
- [x] `natpf-tennis/scripts/ui-shots.mjs`

### T1 · Lanciapalle 3D
- [ ] Modello 3D leggero (primitive three.js) sul lato avversario, visibile in riscaldamento e sfide
- [ ] La palla parte dalla bocca del lanciapalle; animazione di rinculo/rotazione e suono sincronizzati
- [ ] Traiettorie, velocità e difficoltà variabili (profili di lancio)

### T2 · Tutorial
- [ ] `natpf_gesture_demo.js`: mano + telefono stile S24 Ultra in 3D, gesti dalle regole reali
- [ ] Passi introduttivi: presa, orientamento, mano destra/sinistra, posizione iniziale
- [ ] Mini-animazione in loop in alto a destra durante ogni esercizio
- [ ] Feedback in tempo reale dal tracking (colpo riconosciuto, corretto / da migliorare con il motivo)
- [ ] Esercizi: dritto, rovescio, topspin, piatto?, pallonetto, palla corta, tagliato, smash, volée, servizio,
      incrociato, lungolinea (solo quelli che il riconoscimento distingue davvero)
- [ ] Test

### T3 · Redesign UI/UX
- [ ] Un solo foglio di stile coerente per menu, pagine, fogli, coach, HUD delle sfide, risultati
- [ ] Percorso intro → menu → modalità → tutorial → partita/minigioco → risultati
- [ ] Verifica con screenshot desktop e mobile

### T4 · Audio
- [ ] Impostazioni separate: musica, effetti, voci (volumi persistenti)
- [ ] Nuovi brani generativi (menu, partita, tutorial, minigiochi) + playlist senza ripetizioni, crossfade
- [ ] Effetti differenziati per tipo di colpo e situazione; vocalizzazioni dei giocatori
- [ ] Voci con ElevenLabs via Higgsfield solo se i diritti d'uso sono verificati

### T5 · Minigiochi arcade
- [ ] Bersagli 3D fisici colpibili, zone di punteggio, mobili, bonus, combo, timer, difficoltà progressiva
- [ ] Target Rush, Precision Challenge, Combo Challenge, Survival
- [ ] Record personali, medaglie, progressione, schermata risultati

### T6 · Verifica finale e consegna
- [ ] Test, build, screenshot, prestazioni, riepilogo

## Progetto parallelo · SuperTennis Arena (`esports-tennis/`, dal 28/10/2026)

Richiesta: dal gioco Higgsfield «Swipe Smash» → arena ESPORTS FITP / SuperTennis fedele agli screenshot, colpi che
corrispondono al gesto, menu con 1v1, multigiocatore online, inquadratura alta dietro il giocatore come nei giochi
di tennis per mobile. Branch di sessione: `claude/higgsfield-connector-modify-gph02v`.

- [x] Asset di Swipe Smash estratti (personaggi GLB, clip di corsa, suoni) — `public/assets/`
- [x] Arena in three.js con loghi (ESPORTS ufficiale, SuperTennis ricreato), tribune, pubblico, cielo, skyline
      — confronto visivo con gli screenshot fatto con `tools/compare.sh`
- [x] Fisica deterministica + punteggio + regole della stanza — `npm test` 12/12 passati
- [x] Colpi procedurali con IK (scarto racchetta-palla all'impatto: dritto 4 cm, rovescio 14 cm, servizio 12 cm)
- [x] Partita contro la CPU (3 livelli), gesto a scorrimento → colpo, tempismo (perfetto / anticipo / ritardo)
- [x] Online: stanza Higgsfield con relay `rt`; provato in locale con due browser (`tools/online.mjs`), colpi
      sincronizzati
- [x] Pubblicato su <https://supertennis-arena.higgsfield.app> (deploy riuscito il 28/10/2026). Pubblicato nella
      community il 28/10/2026 (scheda: https://higgsfield.ai/supercomputer/apps/4ef2c26a-2186-4df7-a095-40b24b9e4608/view):
      ora la pagina è pubblica. Prova sul sito vero con due browser: stanza creata, nomi sincronizzati, partita avviata
- [ ] Prova su telefoni reali (mai fatta: solo Chromium software, ~7 fps, non rappresentativo delle prestazioni)
- [ ] Logo SuperTennis ufficiale da sostituire a quello ricreato

### Seconda richiesta (28/10/2026): movimenti, colpi, indicatori, palla
- [x] Movimenti: passi procedurali con piedi piantati (IK gambe), passi laterali verso la rete, corsa con clip solo
      sugli spostamenti lunghi, split step quando colpisce l'avversario, passo d'appoggio (piede avanti) nei colpi,
      anche che ruotano, busto in avanti e piegato verso la palla, mano su spline (`public/js/player.js`)
- [x] Colpi: piatto, tagliato (rovescio a una mano), palla corta, oltre a topspin, pallonetto, volée, smash;
      rimbalzo che dipende dall'effetto (`physics.js`); gesti in `input.js`; CPU in `ai.js`; stanza (`SPINS`)
- [x] Indicatori (`fx.js`): bersaglio animato sul rimbalzo in arrivo con anello che si chiude, anello del tempismo
      attorno al giocatore, mirino colorato + traiettoria a puntini + nome del colpo (rosso se fuori), segno dove
      cadrà il proprio colpo
- [x] Palla: più grande con la distanza, contorno scuro, alone, scia a nastro
- Test: `npm test` 14/14; partita automatica e online locale senza errori. Non provato su telefono reale.

### Terza richiesta (28/10/2026): uguale al gioco di riferimento
- Video di riferimento analizzato fotogramma per fotogramma (10 fps, 93 fotogrammi): telecamera che si avvicina e
  ruota durante lo scambio, scia azzurra del gesto, nome del colpo sopra il giocatore, disco a terra e onde ai
  piedi, lampo all'impatto, scritte di qualità, ovale dove cade la palla, barre dell'energia.
- [x] Implementati tutti i punti sopra (`camera.js`, `swipefx.js`, `fx.js`, `ui.js`, `match.js`), più il ritorno
      camminando in posizione tra un punto e l'altro.
- [x] Pubblicato il 29/10/2026 (file live identici ai locali; partita automatica in Chromium senza errori).
      Test: `npm test` 12/12. Non provato su telefono reale.
- [ ] Animazioni da motion capture (Mixamo): in attesa dei file FBX dall'utente; la libreria animazioni di
      Higgsfield non ha colpi da tennis. Piano: conversione offline FBX → clip JSON retargettate sul rig Tripo.
