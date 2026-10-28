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

## Split screen (richiesta del 28/10 sera): 1v1 sullo stesso schermo, anche su ledwall 2×2 o 3×2
Analisi: il 1v1 tra due computer è già simulato tutto dall'host (P2 umano, servizio del P2, punteggio); i colpi del
P2 entrano da `motionController._emitP2Swing/_emitP2Toss` → `_handleP2SwingInput`. Lo split screen riusa questa
logica con una sessione 1v1 **locale** (niente stanza, niente rete) e un **secondo telefono** collegato allo stesso
computer (`createPhoneLink()` crea sessioni indipendenti: due QR nella stessa pagina). La vista si disegna due volte
(scissor): sinistra P1 da dietro il suo lato, destra P2 dal lato opposto; terza persona.
- [x] S1 Secondo telefono come Player 2 locale (`natpf_phone_racket.js` con ruolo fisso `p2`): funzioni d'appoggio
      con il ruolo, colpi e lancio via `_emitP2Swing/_emitP2Toss`, esiti per ruolo, mano e gesti con chiavi «.p2»;
      motore: `natpfPhone2` aggiornato a ogni fotogramma. Test `natpf-split.test.mjs` (4), gioco 425/425
- [x] S2 Motore: sessione split locale e rendering a due viste. `natpf_split.js`: metà affiancate con linea scura,
      camera per metà (dietro il proprio fondo campo; con metà strette e alte fov fino a 58°, arretra quanto serve
      per vedere tutto il singolare, sguardo oltre la rete), ombre calcolate una volta per fotogramma; split solo a
      partita in corso (moviola e menu a schermo intero). Motore: `startSplit/endSplit` (sessione 1v1 locale, nessuna
      rete, singolare), terza persona forzata, etichetta del servizio nascosta, `endVersus` non chiude la sessione
      locale; pillola «In attesa di Player 2» nascosta. Test: copertura del campo con metà 8:9, 3:4, 1:2, 1,6;
      sessione. Browser: 1280×720, 900×900, 1200×800 senza errori.
- [x] S3 Menu: tessera «Stesso schermo» (modalità → Telefoni → Partita). Pagina «Collega i due telefoni»: un pannello
      per giocatore con QR, stato, passo della calibrazione (guidata sul telefono, chiesta appena i sensori sono
      attivi; verifica riuscita confermata da sola, tre non riuscite → profilo semplice), mano, «Gioca senza
      calibrare»; si va alla partita da soli con i due pronti. «Gioca»: `split.start()` (solo singolare, 1v1 locale
      anche se l'HUD avesse un'altra difficoltà). In partita: etichette sotto le metà (nome, esito dell'ultimo colpo,
      «Telefono in pausa»); telefono del P2 che cade → pausa e ripresa con conto alla rovescia; menu → fine sessione.
      File: `natpf_split_ui.js`, `natpf_lobby.js`, `natpf_ui.js`, `index.html`, `natpf-ui.css`. Test: percorso intero
      (13 test in `natpf-split.test.mjs`), gioco 434/434. Browser 1280×720: percorso e partita senza errori.
- [x] S4 Schermo (`natpf_screen.js`): Opzioni → Schermo «Intero / Ledwall 2×2 (1:1) / Ledwall 3×2 (3:2)», area
      centrata e nero fuori; `?schermo=2x2|3x2|intero` e `?area=x,y,larghezza,altezza` (pixel, per il processore LED)
      nell'indirizzo. Il body diventa il riquadro dell'area (transform: anche gli elementi fissi restano dentro) e il
      contenitore CSS «natpf»: nei sei fogli di stile `@media (max-/min-width|height)` → `@container natpf`, `vw/vh` →
      `cqw/cqh` (56 unità, 14 regole), così menu e HUD si adattano all'area; a schermo intero nessun cambiamento
      (screenshot di confronto). Motore, HUD, minigiochi: `viewport()` al posto di `window.innerWidth/innerHeight`.
      Menu in colonna nelle aree quadrate o alte. `ui-shots.mjs`: preme finché l'intro non si chiude.
      Verifica nel browser: finestra 1280×720 con `?schermo=2x2` (area 720×720) e `?area=0,0,768,512`: menu, pagina
      dei due telefoni e partita divisa dentro l'area, nessun errore. Test: gioco 435/435, sito 152/152, build.
- Da provare dal vivo: due telefoni veri sullo stesso PC, ledwall vero (mappatura del processore), prestazioni con le
  due viste su un PC con scheda grafica (nel browser di prova senza GPU ogni fotogramma diviso costa molto).

## Pacchetti 2026-10-28.3 (28/10 sera, sessione Claude): Cloudflare e LAN
Contenuto: tutto il lavoro della giornata (redesign, foto della lezione, intro video, voce inglese cartoon, gesti con
l'animazione 3D, split screen «Stesso schermo», schermo per ledwall) più la consegna LAN 2026-10-28.1 di sergio4.
- [x] Correzione trovata con la prova del pacchetto Cloudflare servito come sito statico: scegliendo «Stesso schermo»
      il menu seleziona il 1v1 e il motore creava una stanza in rete (POST `/api/match/create`, inutile per una partita
      sullo stesso computer). Ora la scelta del 1v1 passa da `_onSelectDifficulty` (`src/game_engine.js`), che non
      crea la stanza con la modalità «split»; «Sfida un amico» la crea come prima. Test in `test/natpf-split.test.mjs`.
- [x] Versione 2026-10-28.3 (`site/js/tennis/version.js`, `site/tennis/build.json`); build; gioco 436/436, sito 152/152.
- [x] Cloudflare: `natpf-simulator-cloudflare-20261028-3.zip` = contenuto di `natpf-tennis/dist` + `_headers` (da
      `site/_headers`), 137 file, 26.039.630 byte, file più grande 6,1 MB (< 25 MiB), percorsi con «/», nessuna parola
      vietata. SHA256 `14d190295366b96fe1e8d2dad21287585268fbb18e3a9013ea973c19939abc60`.
- [x] LAN Windows: `natpf-simulator-lan-windows-20261028-3.zip` (`lan/pacchetto.mjs`, Node.js 22.22.0 win-x64 con
      SHA256 uguale a SHASUMS256 di nodejs.org, `node.exe` identico), 277 file, 61.089.928 byte, nessun certificato né
      chiave, nessuna parola vietata. SHA256 `87d9efe2ea448892c8903b0bf682741048e72db08ce62663a9a81da3dd7fb910`.
- [x] LAN estratto e provato (Linux): certificato creato, HTTPS con la CA del pacchetto, gioco, intro video
      (`video/mp4`), foto, 47 voci inglesi (`audio/mpeg`), pagina del telefono, MediaPipe offline, versione
      2026-10-28.3; browser: 47 clip caricate, «Parità» → «Deuce», «Stesso schermo» con i due QR sull'indirizzo di rete,
      partita divisa, nessun errore in console. Vecchie clip dei colpi assenti (404).
- [x] Cloudflare estratto e servito come sito statico (Linux): stesse prove nel browser (voci, due QR, partita divisa,
      telefono); nessuna POST. Restano i 404 attesi su un sito statico: `GET /api/match/state` (il controller interroga
      il relay anche senza stanza, comportamento precedente) e `GET /lan/status`.
- [x] Prova 1v1 tra due computer (rete p2p) sullo zip Cloudflare estratto: `tools/e2e/natpf-1v1-p2p.mjs` 25/25.
- [ ] Non provato: Cloudflare Pages vero, Windows, telefoni veri.

## Analisi della sessione del 28/10 sera (diagnostica 20261028-205124-7isv + video OBS, Leggenda, telefono Android)
Materiale dell'utente: pacchetto della diagnostica (71 s, build 2026-10-28.3, 27 colpi del telefono) e video OBS di
55 s (schermo + webcam specchiata in sovrimpressione; il video parte circa 11,4 s dopo la sessione). Strumenti:
`scripts/audit/zip-replay.mjs` e rigiocata dei sensori con il contesto (servizio/gioco) e il verso atteso ricostruito.
Segnalazioni e cause trovate:
1. Webcam «non rileva nulla»: nella sessione la webcam era tenuta da OBS (avviso «Device in use»). Il pannello diceva
   solo «Mettiti a circa 2 m: spalle e braccio interi», senza il motivo. → corretto (sotto, W).
2. Colpi persi sul telefono: 16 gesti «debole», 2 «verso». Il rovescio del match point (957 °/s, v51,2) scartato per
   «verso»: asse di calibrazione quasi orizzontale (coseno 0,29 con l'alto, telefono dritto nel pugno) e la regola del
   verso dalla rotazione attorno alla verticale chiedeva 0,3. → corretto (T1).
3. Soglia del colpo normale = max(preparazione di calibrazione × 1,2; colpo × 0,5) = 630 °/s per il dritto: un dritto
   da 619 °/s (v7,6, braccio alzato sopra la testa: tentativo di pallonetto) scartato «debole». Lì la palla era sul
   rovescio e il gesto nel verso del dritto: resta una preparazione anche dopo la correzione. → nel verso atteso (T2).
4. Pallonetto (v7,6 e v33,4): il braccio sale soprattutto dopo il picco di rotazione, che decide il colpo; al picco la
   forma era piana (salita 0,07) oppure in salita (0,81) ma il gesto (399 °/s, verso opposto alla palla) era trattenuto
   come preparazione. Con i segnali di oggi i tentativi non si distinguono dai dritti di chi gioca (finiscono anche loro
   con il telefono verticale): non toccato, da rivedere con gli esercizi «Pallonetto» del riscaldamento.
5. Direzione «quasi sempre centrale» (12 colpi): la mira è tempo (peso 1) + piatto (peso 0,6). Chi gioca è quasi sempre
   in anticipo (+0,4 unità: incrociato) e girando il piatto verso la riga le due spinte si annullano (n 99: piatto +1,
   tempo +0,36 → x 0,22 m). 8 scarti del piatto su 21 oltre 45° (non credibili, valgono 0). Non toccato: serve la prova
   guidata (incrociati e lungolinea chiesti) per sapere quale segnale segue l'intenzione.
6. Schiacciata: in questa sessione nessuna palla alta (contatti tutti a 0,5 m: a Leggenda la palla si prende presto) e
   la CPU non ha mai fatto pallonetti. Dal piano d'intercetto: a rete una palla che passa a 2,7 m si gioca di volée a
   1,67 m (sotto 1,75 m la schiacciata non c'è). → S (sotto).
Interventi:
- [x] W · webcam: `motion_controls.enableWebcam` tiene il motivo (`webcamError`), `natpf_webcam_watch.webcamOpenError`
      lo traduce (occupata da OBS/Teams/Zoom, negata, assente, senza https) e il pannello lo mostra al posto delle
      istruzioni. Inquadratura: per colpire basta mano, polso e avambraccio (spalle solo con «Segui il corpo»).
      Test: `natpf-webcam-watch.test.mjs` (+3).
- [x] T1 · `site/js/tennis/swing-detect.js`: verso dalla rotazione attorno alla verticale anche con un asse di
      calibrazione quasi orizzontale (segno della sua parte verticale da 0,1, gesto che gira attorno alla verticale per
      almeno il 30% del percorso). Rigiocata della sessione: il rovescio del match point diventa un rovescio (991 °/s),
      gli altri colpi restano uguali.
- [x] T2 · nel verso del colpo atteso (il telefono lo sa dal gioco) la soglia è il 40% del proprio colpo, senza il termine
      della preparazione (`gesture-intent.js`, `toward`); dopo un colpo debole un gesto oltre il doppio, in qualunque
      verso, chiude il rientro (il colpo vero che segue senza pausa non si perde; sul computer sostituisce il primo).
      Test: `tools/test/session-28-10.test.mjs` con i campioni veri della sessione (`session-28-10.data.mjs`, solo
      numeri dei sensori). Sito 157/157, gioco 440/440.
- Non provato con il telefono vero dopo le correzioni.
- [x] S · `natpf_impact.planPlayerIntercept`: a rete (entro 7 m dalla rete) ogni palla raggiungibile che passa sopra
      2,05 m si prende al volo in alto, come la schiacciata (prima solo i pallonetti oltre 3,3 m). Con il gesto
      dall'alto è una schiacciata; con un colpo normale sotto 2,3 m resta una volée alta. Da fondo campo non cambia.
      Test: `natpf-racchetta-motore.test.mjs` (fallisce con il piano di prima). Gioco 440/440.
      Banco `npm run audit:legend`: stessi risultati di prima (3 criteri KO già presenti anche senza la modifica:
      CPU contro «tennista» 81,5% → 81,7% con soglia 85%, contro «preciso» 28,4% con soglia 60%, incrociati 50,1%
      contro «bambino»): da guardare a parte.

## Pacchetto LAN 2026-10-28.4 (28/10 sera, sessione Claude): solo LAN, con le correzioni della sessione del 28/10
Richiesta dell'utente: solo il pacchetto LAN con queste correzioni, senza gli elementi dello zip dell'altro agente.
- [x] Versione 2026-10-28.4 (`site/js/tennis/version.js`, `site/tennis/build.json`); gioco 440/440, sito 157/157, build.
- [x] `natpf-simulator-lan-windows-20261028-4.zip` (`lan/pacchetto.mjs`, Node.js 22.22.0 win-x64 con SHA256 uguale a
      SHASUMS256 di nodejs.org, `node.exe` identico), 277 file, 61.092.054 byte, nessun certificato né chiave, nessuna
      parola vietata, nessun file dello zip dell'altro agente. SHA256
      `f4eb5394024ed9bf175c807aac783cd3bdab984b129b8f21ac9ddf8d0222b0c6`.
- [x] Estratto e provato (Linux): certificato, HTTPS con la CA del pacchetto, versione 2026-10-28.4, rilevatore del
      telefono servito con le correzioni (`weakRefMin`, `TOWARD_FLOOR`), voci, intro video, MediaPipe offline; browser:
      47 clip, «Stesso schermo» con due QR, partita divisa, pagina del telefono, pannello della webcam senza webcam →
      «Nessuna webcam» con il motivo (NotFoundError), nessun errore in console.
- [ ] Non provato: Windows, telefono vero, webcam occupata da OBS (solo nei test).
- Nessun pacchetto Cloudflare 2026-10-28.4.
