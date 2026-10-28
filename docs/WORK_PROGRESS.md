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

## Correzioni segnalate il 28/10 · priorità della sessione attuale

- [x] Telefono: tentativi di connessione isolati con generazione, una sola riconnessione; eventi tardivi ignorati; sostituzione atomica del canale sul desktop (`site/js/tennis/racchetta.js`, `link.js`). Quattro regressioni passano e falliscono tutte sulla versione precedente.
- [x] Palla corta: riconoscimento del taglio verticale morbido indipendente dalla pronazione del dritto; il gesto confermato non è scartato come preparazione. Gesti speciali esclusi dall'apprendimento della mira dei colpi normali.
- [x] Leggenda: palla corta dopo rimbalzo raggiunta nella finestra utile → risposta debole, senza errore obbligato per corsa/allungo/pressione. Fuori tempo e fuori portata restano errori. Non applicato al servizio.
- [~] Webcam: Hands/Pose in worker separati dove supportato, una sola immagine in volo, timeout e chiusura al cambio sessione; modello leggero iniziale. Limite 30 Hz: 15 Hz degradava la rilevazione nei test, quindi scartato. Diagnostica distingue worker e thread del gioco. Protocollo e scheduler verificati, prestazioni hardware da misurare.
- Verifica: 399/399 test gioco, 152/152 test root. Build e pacchetto LAN ancora da completare in questo checkpoint. Nuova versione 2026-10-28.1.
- Ripristino ambiente: pulizia automatica ha rimosso la precedente copia temporanea non pubblicata. Sorgenti ricostruiti da 59ce56c e correzioni ricreate dai dettagli della sessione. Il file OSM estraneo al gioco non è materializzato; è preservato nell'albero remoto.
- Redesign T1–T6: conservato, non affrontato da questa richiesta di bugfix.

### Checkpoint successivo
- [x] Chiusura/riaccensione durante inizializzazione webcam: il modello vecchio non lascia bloccato il nuovo, né modifica il suo stato. Test di lifecycle aggiunto.
- [x] 400/400 test gioco e 152/152 root. Build di produzione riuscita, worker dedicato incluso; 21 asset MediaPipe offline disponibili.
- [x] Anche i quattro test di palla corta/Leggenda falliscono sulla base 59ce56c e passano sulle correzioni.
- [~] Consegna LAN: preparazione e verifica del pacchetto finale in corso.
