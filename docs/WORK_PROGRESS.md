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
- [x] Pubblicato su <https://supertennis-arena.higgsfield.app> (deploy riuscito il 28/10/2026). La pagina chiede
      l'accesso Higgsfield (`/__auth/login`): non verificabile da qui; non pubblicato nella community
- [ ] Prova su telefoni reali (mai fatta: solo Chromium software, ~7 fps, non rappresentativo delle prestazioni)
- [ ] Logo SuperTennis ufficiale da sostituire a quello ricreato
