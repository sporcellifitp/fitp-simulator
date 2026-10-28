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
    `natpf_music.js` (musica generativa Web Audio), `natpf_voice.js` (voce arbitro, sintesi del browser).
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
- **Schiacciata**: palla alta + gesto verso il basso (verticale o orizzontale con la mano che scende).
- **Servizio** (`game_engine.js` ~1392): in `SERVE_STANCE` il primo gesto (o un tocco sullo schermo del telefono)
  **lancia la palla**; in `SERVE_TOSS` il gesto successivo la colpisce: la qualità dipende da quanto è vicino al
  **punto più alto** del lancio. Un gesto debole subito dopo il lancio viene ignorato.
- **Volée**: non è un gesto diverso. Il motore (`natpf_impact.js`) prende la palla al volo quando conviene
  (giocatore avanti); il gesto è un dritto o rovescio **corto**.
- **Direzione** (incrociato / lungolinea): soprattutto l'**orientamento del piatto all'impatto** (imbardata rispetto
  al proprio colpo abituale: piatto girato a destra → palla a destra), poi il **tempo**: in anticipo → incrociato,
  in ritardo → lungolinea (`natpf_skill.swingLandingX`, barra «Anticipo / Centro / Ritardo»).

## Decisioni (28/10/2026, sessione redesign)

- **Tutorial con animazioni 3D procedurali, non video generati**: una mano stilizzata con un telefono in stile
  S24 Ultra (bordi piatti, angoli squadrati, quattro fotocamere) costruita in three.js, con traiettorie scritte a
  partire dalle regole sopra. Un video generato da IA non garantisce che il gesto mostrato corrisponda al
  rilevatore (asse di rotazione, verso, velocità) e pesa molto di più. Vedi `src/natpf/natpf_gesture_demo.js`.
- **Audio**: il connettore Higgsfield non offre un modello musicale utilizzabile per asset autonomi
  (`sonilo_music` è riservato alla pipeline dei giochi; Suno non presente nel catalogo il 28/10/2026). La musica
  resta quindi **generativa e originale** in `natpf_music.js` (nessun file, nessuna licenza esterna).
  ElevenLabs v4 è raggiungibile tramite Higgsfield solo per il parlato.
- **Mai usare** `sonilo_music`, `mirelo_text_to_audio`, `inworld_text_to_speech` per asset del progetto (riservati
  alla pipeline di generazione giochi di Higgsfield).

## Storico modifiche significative

- 28/10/2026 — nuova memoria persistente (`CLAUDE.md`, `docs/PROJECT_MEMORY.md`, `docs/WORK_PROGRESS.md`,
  `docs/SESSION_HANDOFF.md`) e `scripts/ui-shots.mjs`.
