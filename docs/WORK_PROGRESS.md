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
- [x] `src/natpf/natpf_gesture_motion.js`: moti dei gesti (formato del braccio simulato) per dritto, rovescio, piatto,
      volée, pallonetto, palla corta, tagliato, schiacciata, servizio (lancio + battuta), incrociato, lungolinea;
      specchio per il mancino. `test/natpf-gesture-demo.test.mjs`: gli stessi moti, eseguiti dal telefono simulato
      completo (destro/mancino, presa 15–45°), sono riconosciuti come il colpo mostrato (mira compresa). Verificato
      che il test fallisce con un moto sbagliato (mutazione).
- [x] `src/natpf/natpf_gesture_demo.js`: giocatore stilizzato, braccio con cinematica inversa, pugno e telefono tipo
      S24 Ultra, schermo e campo di riferimento, palla sincronizzata con l'impatto, scia del gesto; un solo contesto
      WebGL (`getGestureDemo`), 30 fps massimo, fermo quando non visibile. Anteprima di sviluppo: `/demo-gesti.html`.
- [x] Lezione iniziale (solo «Allenamento»): impugnatura → orientamento e mano (Destra/Sinistra) → posizione;
      la calibrazione del telefono parte dopo. Riscaldamento prima della partita: solo dritto, rovescio, servizio.
- [x] Riquadro «Guarda e ripeti» in alto a destra con l'animazione in loop (×0,5) e tre indicazioni.
- [x] Feedback in tempo reale (`liveFeedback`): colpo letto dal telefono, giusto/da migliorare con il motivo, forza.
- [x] Esercizi nuovi: volée (giocatore a rete, conta solo la palla al volo) e colpo piatto. Ordine progressivo.
- [x] Coach ridisegnato (`natpf-ui.css`, markup in `index.html`): scheda in basso a sinistra, campo libero,
      punteggio nascosto durante l'allenamento. Test: `test/natpf-tutorial.test.mjs` (3) + aggiornati
      `natpf-lobby` e `natpf-flows` (la lezione si salta con `lessonAction('skip')`). Suite 398/399, build ok.
- [ ] Da provare con un telefono Android vero: leggibilità dell'animazione, ritmo della lezione.

### T3 · Redesign UI/UX
- [x] Sistema di design in `natpf-ui.css` (token, Barlow/Barlow Condensed OFL in `natpf-tennis/fonts/`, pulsanti
      `.btn`, `.seg`), caricato per ultimo. Coach già migrato; vecchio coach tolto da `natpf-flow.css`.
- [x] `natpf-ui.css` copre intro, menu, tutte le pagine della lobby, fogli (pausa, nickname, addetto, telefono,
      guida), toast, passaggio al campo, HUD dei minigiochi, classifica, risultato; `natpf-intro.css` eliminato.
      I fogli più vecchi (`natpf.css`, `natpf-round.css`, `natpf-flow.css`) restano per diagnostica, sfida online,
      guida e HUD di gioco; il nuovo file li neutralizza dove serve (scope `#title-modal`, `.natpf-sheet-backdrop`).
- [x] Menu principale a due colonne: voce evidenziata in grande a sinistra (titolo e descrizione), voci a destra
      (Gioca, Allenamento, Minigiochi + Classifica, Guida, Opzioni). Barra delle tappe con numeri e nome corrente.
- [x] Pagine con intestazione e sottotitolo, tessere uniformi, righe di impostazioni raggruppate, pagina che scorre
      da sola senza coprire le barre; intro ridisegnata (marchi → titolo con la palla → «Premi un tasto»).
- [x] Verifica con screenshot desktop 1280×720 e telefono orizzontale 915×412 (`scripts/ui-shots.mjs --mobile`).
- [ ] Da rifinire con T4/T5: opzioni audio (cursori), pagina dei minigiochi con medaglie e record.

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
