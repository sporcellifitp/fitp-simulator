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
- [x] Volumi separati musica / effetti / voci: bus `voiceGain` in `audio_engine.js`, `setVolume(kind)`, salvati in
      `natpf.audio`; cursori in Opzioni e Pausa (`natpf_audio_settings.js`).
- [x] Musica (`natpf_music.js`): 5 brani nuovi originali (tutorial ×2, minigiochi ×2, partita ×1) → 17 in tutto;
      arrangiamento che cambia a ogni giro (intro → pieno → break con riser → lift con crash), rullante di raccordo,
      dissolvenza incrociata di 1,6 s tra brani, scaletta casuale per sessione senza ripetere l'ultimo brano
      (`natpf.music.last`). Contesti: tutorial e minigiochi tengono il loro brano durante lo scambio.
- [x] Voci (`public/voce/`, 48 clip, 420 kB): arbitro, annunci dei minigiochi, sforzo/esultanza; ElevenLabs Eleven v4
      via Higgsfield. Diritti e provenienza in `public/voce/LEGGIMI.txt`. Verifica: trascrizione automatica (Vosk
      italiano) delle clip e della registrazione dal browser; termini inglesi e vocalizzazioni da ascoltare.
- [x] Effetti (`natpf_sfx.js`): impatto diverso per topspin / piatto / tagliato / pallonetto / schiacciata con
      variazioni casuali, rimbalzo per velocità, rete, effetti arcade (bersaglio, combo, timer, errore, medaglia),
      lanciapalle. Voce di sforzo sulle schiacciate e su alcuni colpi perfetti.
- [x] Verificato nel browser (Chromium, registrazione dell'uscita): musica −31 dB medi, voci −21 dB, nessun clipping.
- [ ] Musica generata con IA: **non disponibile** — Higgsfield non espone un modello musicale utilizzabile per asset
      autonomi (`sonilo_music` riservato alla pipeline giochi, Suno assente). Brani composti nel codice.
- [ ] Da ascoltare da una persona: mix e gusto dei brani, naturalezza delle vocalizzazioni.

### T5 · Minigiochi arcade
- [x] `src/natpf/natpf_arcade.js` (regole pure): 6 minigiochi con meccaniche distinte — Target Rush, Precision,
      Combo Challenge, Survival, Radar del servizio, Sfida il campione; medaglie bronzo/argento/oro per gioco, record
      personali (`natpf-tennis.records`), esperienza e livello (500 XP per livello), conteggio medaglie.
- [x] `src/natpf/natpf_targets.js`: bersagli 3D ad anelli su supporto, colpiti dalla traiettoria vera della palla
      (attraversamento del piano), zone 50/30/10, molla, rotazione, schegge, rimbalzo della palla; bersagli mobili e
      d'oro (×2 e +5"); zone a terra pulsanti per Precision con il segno dell'atterraggio.
- [x] `natpf_events.js` riscritto: combo ×1…×4, difficoltà progressiva (dimensione/movimento dei bersagli, profilo
      del lanciapalle `feedForLevel`), catene di colpi più lunghe a ogni catena, vite e livelli in Survival, punteggi
      fluttuanti sul punto d'impatto, timer che batte negli ultimi 5", annunci vocali, suoni arcade, medaglia e record
      a fine partita. Tabellone 0-0 nascosto durante i minigiochi.
- [x] Lobby: pagina «Minigiochi» con livello/XP, medaglie raccolte, per gioco medaglia migliore, record personale,
      prossima medaglia e record del giorno; risultato con medaglia animata, «Nuovo record personale», XP e statistiche.
- [x] Test: `test/natpf-arcade.test.mjs` (7, incluse partite intere nel motore), aggiornati `natpf-events`/`flows`.
- [ ] Da provare con telefono reale: frequenza dei bersagli colpiti con la mira vera, bilanciamento delle medaglie.

### T6 · Verifica finale (28/10/2026)
- [x] `npm test` (natpf-tennis): **409/409**, nessun test saltato (installate le dipendenze di `tools/lan`).
- [x] `node --test tools/test/*.test.mjs` (sito e telefono): **148/148**.
- [x] `npm run build`: riuscita; font e 48 clip vocali inclusi in `dist/`.
- [x] Browser (Chromium headless): intro, menu, tutte le pagine, tutorial, minigiochi, risultati, finestre, partita
      contro la CPU senza errori in console; desktop 1280×720 e telefono orizzontale 915×412.
- [ ] Non verificabile qui: telefono Android reale (sensori), webcam reale, ascolto umano di musica e voci,
      prestazioni su hardware modesto (il riquadro 3D del tutorial usa un secondo contesto WebGL a 30 fps massimi).

## Richiesta del 28/10 (seconda parte) — media reali Higgsfield e UI meno ridondante

Budget Higgsfield: **250 crediti massimo** (saldo iniziale 992,96 → non scendere sotto 742,96). Registro spese sotto.

### T7 · Media reali per tutorial e impugnatura (Higgsfield)
- [ ] Foto realistiche dell'impugnatura (di lato, dallo schermo, posizione sbagliata) e della posizione di partenza
- [ ] Clip video dei colpi (persona reale generata, vista da dietro, telefono in mano), verificate fotogramma per
      fotogramma contro le regole di `docs/PROJECT_MEMORY.md` §Gesti; scartate quelle sbagliate
- [ ] Integrazione nel tutorial (lezione e riquadro «Guarda e ripeti») e nella pagina «Collega»; animazione 3D solo
      come ripiego per i colpi senza clip valida

### T8 · UI meno ridondante e intro nuova
- [ ] Titolo principale solo «NATPF Simulator»; loghi Esports FITP / Nitto ATP Finals in secondo piano
- [ ] Intro con video generato su Higgsfield (arena, palla, luci) e titolo sovrapposto in HTML

### Registro spese Higgsfield (crediti)
| Data | Cosa | Modello | Crediti | Saldo |
|---|---|---|---|---|
| 28/10 | (partenza) | — | — | 992,96 |

## Da fare (proposte per le prossime sessioni)
- Prova fisica con lo smartphone: tutorial completo, leggibilità del riquadro 3D, bilanciamento delle medaglie.
- Eventuale pulizia dei fogli di stile storici (`natpf.css`, `natpf-round.css`, `natpf-flow.css`): oggi
  `natpf-ui.css` li sovrascrive dove serve; la diagnostica e la sfida online usano ancora i loro stili.
- Pagina del telefono (`site/tennis/racchetta.html`): non ridisegnata in questa sessione.
- Musica generata con IA: solo se un connettore con un modello musicale utilizzabile diventa disponibile.
