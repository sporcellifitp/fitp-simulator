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
- [x] Modello 3D leggero (primitive three.js, scala 1,6×) dietro la riga di fondo avversaria, visibile in
      riscaldamento e sfide — `src/natpf/natpf_ball_machine.js`, istanza `ui.machine` (`natpf_ui.js`)
- [x] La palla parte dalla bocca della canna (`natpf_training._feed`); rinculo, lampo, ruote, spia e suono
      pneumatico (`natpf_sfx.machineLaunch`, `audio_engine.playMachineLaunch`) nello stesso istante
- [x] Profili di lancio `FEED_PROFILES` e `feedForLevel(level)`; `_feed(side, { profile, depth })` li accetta
      (usati dai minigiochi in T5). Test: `test/natpf-ball-machine.test.mjs` (3). Suite 392/393 (1 saltato LAN).

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
