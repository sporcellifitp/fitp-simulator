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

### T7 · Media reali per tutorial e impugnatura (Higgsfield) — fatto
- [x] Foto: presa di lato, presa vista dallo schermo (solo il bordo), presa sbagliata («Così no»), posizione di
      partenza di spalle davanti al televisore (`public/media/*.webp`, 8–38 kB). Scartate: due «posizione» con il
      telefono orizzontale/dietro la schiena e un televisore con scritte da broadcast.
- [x] Clip dei colpi (`public/media/colpi/*.mp4`, 44–76 kB, 480×360, + poster WebP), tutte dalla stessa foto di
      partenza, controllate fotogramma per fotogramma (griglie ffmpeg) contro §Gesti:
      - accettate: dritto (in realtà generato come «rovescio»: da destra verso sinistra, fine sopra la spalla sinistra),
        rovescio (3° tentativo, telefono al fianco sinistro poi fuori verso destra), servizio (3° tentativo: lancio,
        telefono in alto, colpo avanti e in basso), pallonetto (2° tentativo, dal basso verso l'alto), tagliato,
        schiacciata; palla corta = clip del tagliato a ×0,5.
      - scartate: dritto v1 (il telefono diventa un oggetto bianco), servizio v1 (il telefono diventa una racchetta),
        servizio v2 (finisce prima del colpo), pallonetto v1 (sembra uno smash), rovescio v1 e v2 (sono dritti).
      - restano in 3D: incrociato e lungolinea (conta il display all'impatto, il video non lo mostra), volée, piatto,
        calibrazione.
- [x] Integrazione: `src/natpf/natpf_media.js`; lezione con foto (specchiate per i mancini, «Così no» sulla presa);
      «Guarda e ripeti» con la clip (muta, in loop, `preload="none"`, ripiego sul 3D se non si carica); foto della
      presa nella calibrazione e nella pagina «Collega». Provenienza e diritti in `public/media/LEGGIMI.txt`.
- Test: `test/natpf-media.test.mjs` (file presenti e leggeri, clip solo per gesti verificati, foto/clip nel
  tutorial, specchio per il mancino, 3D per l'incrociato); `natpf-training-directions` aggiornato. 412/412.

### T8 · UI meno ridondante e intro nuova — fatto
- [x] Menu: «NATPF Simulator» titolo principale (la voce scelta sotto, più piccola); partner in una riga piccola
      sotto la descrizione; tolti i loghi dalla barra in alto e dalla transizione verso il campo («NATPF Simulator»).
- [x] Intro: video Cinema Studio 3.0 (8 s: luci dell'arena che si accendono, palla che rimbalza, vista dall'alto del
      campo blu e rosa; nessuna scritta/logo), titolo e «Premi un tasto» in HTML, partner in una riga in basso;
      senza video resta l'ultima inquadratura (`intro-fine.webp`). `intro.mp4` 667 kB.
- Verifica nel browser (Chromium headless): intro a 1,2/3/5/6,2/8 s, menu, lezione, esercizi, «Collega»: nessun
  errore in console. Build: `dist/media` 1,1 MB.

### Registro spese Higgsfield (crediti)
| Data | Cosa | Modello | Crediti | Saldo dopo |
|---|---|---|---|---|
| 28/10 | (partenza) | — | — | 992,96 |
| 28/10 | 6 foto presa/posizione (2k) | nano_banana_pro → nano_banana_2 | 12 | 980,96 |
| 28/10 | 3 foto posizione/presa | gpt_image_2_5 medium | 1,5 | |
| 28/10 | 6 clip colpi v1 (5×4 s + 1×5 s) | kling3_0_turbo 720p | 37,5 | |
| 28/10 | intro 8 s | cinematic_studio_3_0 720p | 40 | |
| 28/10 | 3 clip v2 (rovescio, pallonetto, servizio) | kling3_0_turbo 720p | 19,5 | |
| 28/10 | 2 clip v3 (rovescio 4 s, servizio 6 s) | kling3_0_turbo 720p | 15 | |
| | **Totale di questa sessione** | | **125,5** | |

Nota: tra le 15:10 e le 15:30 l'account ha anche spese **non fatte da questa sessione** (2 × «Voice Element» 40 e
4 × «Eleven v4» ≈ 12, in tutto 128,5 crediti): per questo il saldo alla fine è 738,93 e non 867,46.

## Da fare (proposte per le prossime sessioni)
- Prova fisica con lo smartphone: tutorial completo, leggibilità del riquadro 3D, bilanciamento delle medaglie.
- Eventuale pulizia dei fogli di stile storici (`natpf.css`, `natpf-round.css`, `natpf-flow.css`): oggi
  `natpf-ui.css` li sovrascrive dove serve; la diagnostica e la sfida online usano ancora i loro stili.
- Pagina del telefono (`site/tennis/racchetta.html`): non ridisegnata in questa sessione.
- Musica generata con IA: solo se un connettore con un modello musicale utilizzabile diventa disponibile.

## Correzioni segnalate il 28/10 · consegna LAN 2026-10-28.1 (sessione di sergio4)

- [x] Telefono: tentativi di connessione isolati con generazione, una sola riconnessione; eventi tardivi ignorati; sostituzione atomica del canale sul desktop (`site/js/tennis/racchetta.js`, `link.js`). Quattro regressioni passano e falliscono tutte sulla versione precedente.
- [x] Palla corta: riconoscimento del taglio verticale morbido indipendente dalla pronazione del dritto; il gesto confermato non è scartato come preparazione. Gesti speciali esclusi dall'apprendimento della mira dei colpi normali.
- [x] Leggenda: palla corta dopo rimbalzo raggiunta nella finestra utile → risposta debole, senza errore obbligato per corsa/allungo/pressione. Fuori tempo e fuori portata restano errori. Non applicato al servizio.
- [x] Webcam: Hands/Pose in worker separati dove supportato, una sola immagine in volo, timeout e chiusura al cambio sessione; modello leggero iniziale. Limite 30 Hz: 15 Hz degradava la rilevazione nei test, quindi scartato. Diagnostica distingue worker e thread del gioco. Protocollo e scheduler verificati, prestazioni hardware da misurare.
- Verifica: 399/399 test gioco, 152/152 test root. Build e pacchetto LAN ancora da completare in questo checkpoint. Nuova versione 2026-10-28.1.
- Ripristino ambiente: pulizia automatica ha rimosso la precedente copia temporanea non pubblicata. Sorgenti ricostruiti da 59ce56c e correzioni ricreate dai dettagli della sessione. Il file OSM estraneo al gioco non è materializzato; è preservato nell'albero remoto.
- Redesign T1–T6: conservato, non affrontato da questa richiesta di bugfix.

### Checkpoint successivo
- [x] Chiusura/riaccensione durante inizializzazione webcam: il modello vecchio non lascia bloccato il nuovo, né modifica il suo stato. Test di lifecycle aggiunto.
- [x] 400/400 test gioco e 152/152 root. Build di produzione riuscita, worker dedicato incluso; 21 asset MediaPipe offline disponibili.
- [x] Anche i quattro test di palla corta/Leggenda falliscono sulla base 59ce56c e passano sulle correzioni.
- [x] Consegna LAN: ZIP 2026-10-28.1 salvato e verificato dopo estrazione (HTTPS, 76 file build, versione telefono, relay host/P2, WSS, certificati). SHA256 e download nel SESSION_HANDOFF.
- [ ] Prova hardware con S24 Ultra e Lenovo E14: demandata alla prova utente, non dichiarata completata.

## Merge con la consegna LAN (28/10, sessione Claude)
- Unito `origin/natpf-simulator` (e4af4ce, 2401fc9, 641fa02) nel lavoro di redesign e media reali con un merge;
  conflitti solo in `SESSION_HANDOFF.md` e `WORK_PROGRESS.md` (testi affiancati, niente perso).
- Verifica dopo il merge: gioco 422/422 (`npm test`), sito 152/152 (`node --test tools/test/*.test.mjs`), build
  riuscita, browser (menu, lezione, esercizio con clip, Target Rush) senza errori in console.

## Pacchetto LAN 2026-10-28.2 (28/10, sessione Claude)
- [x] Versione 2026-10-28.2 (`site/js/tennis/version.js`, `site/tennis/build.json`).
- [x] `npm ci` in `tools/lan`, build, test: gioco 422/422, sito 152/152.
- [x] Node.js 22.22.0 win-x64 da nodejs.org, SHA256 uguale a SHASUMS256.txt (firma GPG del file non verificata).
- [x] `node natpf-tennis/lan/pacchetto.mjs --out=… --node=…`, zip con percorsi «/»: 290 file, 61,5 MB.
- [x] Corretto: `.mp4` servito come `video/mp4` (prima octet-stream + nosniff); test in `natpf-media.test.mjs`.
- [x] Zip estratto e provato: certificato, HTTPS, gioco, intro video, clip, pagina del telefono, versione, nessun
      errore in console. SHA256 e dettagli in `SESSION_HANDOFF.md`.
- [ ] Prova su Windows e con telefono reale: da fare (utente).

## Revisione del 28/10 sera — video dei colpi tolti, voce inglese cartoon (sessione Claude)
Richiesta dell'utente: i video della persona non sono coerenti (sembra un telecomando, pose non da tennis né come
nei testi); voce cartoon coerente con il gioco, una sola lingua (meglio inglese), niente voce maschile cupa.
- [x] Clip dei colpi tolte: `public/media/colpi/` eliminata, `CLIPS`/`clipFor`/`_paintClip` e `<video>` della scheda
      tolti; «Guarda e ripeti» torna all'animazione 3D verificata. Restano foto della lezione e intro video.
- [x] Voce: 47 clip nuove in inglese con il preset Higgsfield «Pixie» (ElevenLabs v4): punteggi («Fifteen love»,
      «Deuce», «Advantage»…), annunci («Game point», «Out», «Ace»…), minigiochi («Three, two, one… Go!», «Combo!»,
      «Gold medal!»…), versi («Hup!», «Yes!», «Aww, no!»). Clip italiane eliminate; annuncio «bersaglio» mai usato
      e non rifatto. `natpf_voice.js`: `callout()` (prima `italianCallout`), `pickEnglishVoice`, nomi dei file.
- [x] Verifica: Vosk inglese, 47/47 frasi corrispondenti; altezza 220–350 Hz (vecchio arbitro 144 Hz); browser:
      47 clip caricate, «30 - 15» → «Thirty fifteen», «Parità» → «Deuce», cue e versi suonano, nessun errore.
- [x] Test: gioco 421/421 (test dei media riscritti per foto + 3D; test della voce per l'inglese e per l'assenza di
      file fuori elenco), sito 152/152, build riuscita.
- [ ] Ascolto umano della voce; nuovo pacchetto LAN 2026-10-28.3 (quello 2026-10-28.2 ha ancora clip e voci vecchie).
- Crediti Higgsfield: 47 × 0,23 = 10,81 (saldo 738,93 → 728,12). Totale della richiesta media/voce: 136,3.
