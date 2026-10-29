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

## Webcam «Cerco la mano…» con la mano in vista (28/10 sera, segnalazione con screenshot sul pacchetto 2026-10-28.4)
Il messaggio sull'errore di apertura (W, sopra) non c'entrava: la webcam era accesa, il modello delle mani non partiva.
- Riprodotto: pacchetto LAN 2026-10-28.4 estratto, Chromium con webcam finta (`--use-file-for-fake-video-capture`, la
  mano aperta dello screenshot dell'utente): «Cerco la mano…» per sempre, nella console «importScripts … 
  hand_landmark_lite.tflite failed to load» e lo stesso per Pose. Causa: dal commit `e4af4ce` (webcam in worker) i modelli
  partivano in un worker, dove MediaPipe carica con `importScripts` anche i file del modello; l'errore portava al solo
  optical flow. Nessuna prova con la webcam vera era stata fatta (lo diceva anche la consegna di quel commit).
- [x] `webcam_inference.workerVisionAvailable`: worker solo con `?webcamWorker=1`; `motion_controls._ensureMediaPipeHands`
      e `webcam_body_follow._ensurePose`: se il worker non parte (non per la webcam spenta durante il caricamento) il
      modello si carica nella pagina; un modello del worker chiuso per un fotogramma lento si ricarica nella pagina.
- [x] Prova nel browser con la webcam finta sulla build: «Mano vista» entro 5 s (modello nella pagina; inferenza
      200–560 ms in questo container senza scheda grafica), Pose con «Segui il corpo» → «following».
- [x] Test: `natpf-webcam-worker.test.mjs` (worker solo a richiesta; worker che non parte → modello nella pagina; riavvio
      durante il caricamento come prima). Gioco 442/442.
- [ ] Da provare con la webcam vera su Windows (pacchetto LAN 2026-10-28.5).

## Pacchetto LAN 2026-10-28.5 (28/10 sera): webcam con il modello delle mani nella pagina
Sostituisce il 2026-10-28.4, che ha le correzioni del rilevatore e della schiacciata ma la webcam ferma su «Cerco la
mano…». Solo LAN, senza gli elementi dello zip dell'altro agente.
- [x] Versione 2026-10-28.5; gioco 442/442, sito 157/157, build.
- [x] `natpf-simulator-lan-windows-20261028-5.zip`: 277 file, 61.092.235 byte, Node.js 22.22.0 verificato, nessun
      certificato né chiave, nessuna parola vietata. SHA256 `3a8ca6213addcb7c7a7cf1ae70688a8de60d90908020e5d32c59b52ad04b4693`.
- [x] Estratto e provato in https: webcam finta con la mano aperta → «Mano vista» entro 5 s (modello nella pagina);
      voci, due QR, partita divisa, pagina del telefono, nessun errore in console.
- [ ] Non provato: Windows, webcam e telefono veri.

## Analisi della diagnostica 20261028-213510-ukua (Leggenda, telefono, build 2026-10-28.4, con video webcam e gioco)
Segnalazione: pallonetti e palle corte non escono mai; lungolinea e angoli diversi mai; monitor dell'arena tagliati;
«Gioca ancora» deve riportare alle impostazioni.
- Pallonetto (punto a 22,6 s, video: braccio alzato sopra la testa a rete): gesto da 356 °/s, salita 0,71, forza 0,13 →
  top spin (soglia del pallonetto 0,9 con la salita abituale 0,3) e, arrivato 0,1 s dopo il punto d'impatto, ignorato
  perché «debole» (meno del 30% del colpo tipico). → [x] `classifyStroke`: gesto morbido (forza ≤ 0,3) è pallonetto se la
  testa sale di 0,35 oltre l'abituale (almeno 0,6); `weakSwing`: pallonetto e palla corta confermati dalla forma non sono
  deboli (si giocano anche in leggero ritardo).
- Palla corta (17,5 s): riconosciuta (rovescio, «taglio verticale morbido», confidenza 0,76) e sostituita 0,2 s dopo
  dal braccio che tornava (dritto da 1292 °/s, giocato come tagliato). → [x] `queueUserSwing`: palla corta o pallonetto
  voluti (confidenza ≥ 0,5) in attesa non sono sostituiti da un gesto dall'altra parte entro 0,45 s. La regola sul
  telefono (verso atteso) è stata provata e scartata: scartava un dritto vero da 1390 °/s a 15,6 s.
- Provato e tolto: impatto al colmo del rimbalzo sulle palle corte (più tempo) → nelle partite simulate spariscono volée
  e schiacciate (il giocatore non resta più a rete); il test della dinamica degli scambi lo blocca.
- Direzione: 9 incrociati, 3 centro, 1 lungolinea; tempo mediano +0,51 unità (anticipo). Calibrazione rapida debole
  (dritto 204 °/s, rovescio 361 °/s contro 1100–1400 in partita): riferimento del piatto sbagliato, mira del piatto
  valida in 17 colpi su 36. Da fare: tempo relativo al proprio ritmo.
- Test: `natpf-racchetta-motore.test.mjs` (+2, falliscono con il codice di prima). Gioco 444/444.
- [x] «Gioca ancora» (fine partita): apre la pagina «Partita» del menu con la modalità di prima, per scegliere di nuovo
      livello, formato e lunghezza (`natpf_ui.backToMenu('match')`); nel 1v1 tra due computer resta la rivincita
      immediata. Test in `natpf-flows.test.mjs` (fallisce con il codice di prima).
- [x] Pannelli LED («monitor») tagliati negli angoli: la base della tribuna gira con un raggio di 6 m ed entra
      nell'angolo del muro del campo, e nascondeva metà dei pannelli (sul fondo restava «TP FINALS»). Pannelli spostati sul
      tratto dritto (`site/js/tennis/arena.js`: `CORNER_LED` fondo x ±8, lati z ±18; `STAND_FRONT` esportato). Prova
      geometrica in `natpf-arena-court.test.mjs` e screenshot della build: loghi interi. L'angolo scuro tra muro e
      tribuna resta (forma dell'arena).
- [x] Direzione relativa al ritmo di chi gioca (`natpf_stroke_outcome.createRhythm`, `rhythm` in `strokeOutcome`, motore
      in `_natpfRacketShot`): con il tempo solito al centro, dopo il solito lungolinea, prima incrociato; il voto resta sul
      tempo vero. Etichetta CROSS/LINE dalla caduta vera. Testi del tutorial («prima/dopo il solito») allineati.
      Test: 2 in `natpf-racchetta-motore.test.mjs`. Gioco 448/448.

## Webcam: diagnostica 20261028-214227-grj6 (build 2026-10-28.5, Casual, webcam Logitech C925e) e piano di rifacimento
Segnalazione: «il tracciamento non va, il browser lagga, nessuna sincronizzazione: webcam tutta da rifare».
- Misure: camera a 24 fps (luce della stanza), modello delle mani 14,7 ms (p95 37,7, max 128) **sul thread del gioco**,
  solo 11 inferenze al secondo (Hands e Pose a turno), nessuna fonte nel 59% dei fotogrammi, mano persa/ritrovata di
  continuo, livello sceso a «minima» dopo 7,5 s (soglia 16 ms), 4 colpi riconosciuti in 38 s.
- Video: seduto a ~1 m, nello swing la mano è mossa e sfocata (24 fps) e spesso davanti al viso: il modello delle mani la
  perde proprio nel colpo. Con il modello sulla pagina ogni inferenza ferma il disegno per 15–40 ms (scatti).
- Prova di fattibilità (non nel repository): sul video webcam della diagnostica 213510 (giocata con il telefono, 36 colpi
  con l'istante del telefono) la differenza tra fotogrammi a 80×60 trovava un picco di movimento per «36 colpi su 36»
  entro ±250 ms. **Correzione (29/10): il dato era gonfiato.** Il video, decodificato a 30 fotogrammi al secondo fissi,
  ripete i fotogrammi (la camera ne dava 15): la mediana dell'energia veniva quasi zero e ogni movimento sembrava un
  picco. Con i fotogrammi veri l'energia da sola si sovrappone molto ai movimenti fuori dal colpo, e il verso dal
  baricentro indovina il lato in 22 colpi su 36 (quasi a caso). Da qui il progetto rifatto qui sotto: il movimento conta
  solo quando la palla arriva, il lato viene dalla palla.
- Piano proposto (da confermare con l'utente): rilevatore del colpo dal movimento (differenza tra fotogrammi a bassa
  risoluzione, < 1 ms a fotogramma, nessun modello), lato del colpo da dove sta la mano prima dello swing (modello delle
  mani solo a riposo e a bassa frequenza, fuori dagli scambi), ritardo misurato e compensato, calibrazione con 3 swing.

## Webcam rifatta: colpi dal movimento (29/10)
Richiesta: «procedi con questo rifacimento webcam e dammi pacchetto lan con correzioni webcam».
- `src/natpf/webcam_motion.js` (nuovo): immagine della camera ridotta a 96×72 in grigio, energia del movimento tra due
  fotogrammi (pixel cambiati oltre 18 livelli, pesati per la differenza), fotogrammi ripetuti ignorati. Lo swing parte
  quando l'energia supera la soglia: 3 volte il fondo (mediana dei fotogrammi fuori dai colpi), almeno 0,012, e, imparati
  3 colpi, metà del proprio colpo tipico. Istante del colpo stimato 94 ms dopo l'attraversamento della soglia.
  Fine dello swing sotto il 45% del picco; 250 ms refrattari dopo (il braccio che torna).
- Misure sul video webcam della diagnostica 213510 (giocata con il telefono, webcam a 15 fps; strumenti nella cartella
  temporanea della sessione, non nel repository): rispetto al picco del telefono il picco del movimento arriva +95 ms
  (scarto mediano ±59), l'attraversamento di metà del colpo tipico −94 ms (scarto mediano ±25, 9 colpi su 14 entro
  ±80 ms; fuori: 4 colpi con la preparazione già in movimento, −240…−360 ms). Con la finestra della palla (sotto) il
  rilevatore dà **uno swing per ogni palla giocata (15 su 15)**; scarto dal telefono mediana −24 ms, entro ±80 ms 9 su 14,
  entro ±150 ms 10 su 14; 20 swing fuori dalle finestre (non vanno al gioco). Costo 0,05 ms a fotogramma in Node,
  0,7–2 ms nella pagina (Chromium senza GPU, con il gioco che disegna).
- Diagnostica 214227 (giocata con la mano, webcam a 30 fps): sulla prima palla uno swing a −10 ms dall'impatto (con il
  riconoscimento di prima il colpo era arrivato −148 ms in ritardo); sulla seconda lo swing a −485 ms (colpo in anticipo).
- `natpf_impact.webcamGate` (nuovo): colpo solo con la palla in arrivo a meno di 0,7 s dall'impatto (o passata da meno di
  0,3 s), lancio e servizio solo al proprio servizio; null in pausa, nel menu, con la palla già colpita. Lato dalla
  palla: piano d'intercetto (dove sarà all'impatto) o punto di caduta, con la mano di chi gioca (`handedSide`: il
  mancino non viene scambiato due volte in `natpf_hand.leftySide`).
- `motion_controls.js`: movimento a ogni fotogramma della camera (`_watchFrames` → `_motionStep`, in un compito a sé);
  colpo con `natpf: { aim: 'swing', latency, wrist: 0, source: 'webcam' }` (direzione dal tempo, nessun piatto), forza
  1,15–1,6 dalla salita. In partita (`webcamInPlay`) il modello delle mani non gira; la mano e il flusso ottico non
  fanno più colpi; nessuna pausa «mano persa» (solo «webcam ferma»/«spenta»). `?webcamMano=1` riporta il riconoscimento
  di prima, per confronto. Una sola apertura della webcam alla volta (`enableWebcam` → `_openWebcam`): due richieste
  insieme davano «AbortError» (visto nella prova in Chromium).
- `webcam_body_follow.js`: con i colpi dal movimento il modello del corpo si carica e gira solo con «Segui il corpo»
  (prima sempre, per il polso).
- `natpf_skill.eventLatency` e `relayedNatpf`: latenza fino a −0,15 s (la webcam manda lo swing prima del colpo vero; il
  telefono resta ≥ 0 come prima).
- Testi: pannello della webcam «Fai un colpo…» → «Colpo visto ✓ sei pronto» (si entra in campo anche senza il modello
  delle mani: `natpf_lobby` handSeen), guida e riscaldamento (dritto o rovescio dalla palla, lancio con un movimento
  deciso, pallonetto/palla corta/tagliato con la webcam non riconosciuti), sottotitolo del menu.
- Registro: `webcam.frame` con `source: 'motion'`, energia e soglia (×1000); `webcam.evento` con il motivo («movimento
  N× la soglia, stroke a T ms dalla palla» o «fuori dalla finestra del colpo»).
- Test: `test/natpf-webcam-motion.test.mjs` (7: fotogrammi sintetici, soglia dal colpo tipico, refrattario, latenza,
  finestra nel motore vero, controller, colpo nel motore all'impatto con la latenza negativa, modello del corpo), +1 in
  `natpf-webcam-watch` (doppia apertura), +1 in `natpf-p2p` (relay). Gioco 456/456, sito 157/157, build ok.
  `test/e2e/lan-e2e.mjs` (non eseguito qui) apre la parte webcam con `?webcamMano=1`: prova la mano → racchetta.
- Prova in Chromium con la webcam finta che riproduce il video vero: pannello «Colpo visto», ingresso in campo, lancio e
  servizio dal movimento arrivati al gioco, nessuna inferenza delle mani né del corpo in partita, nessun errore. Il
  browser della prova disegna a ~1 fotogramma al secondo (grafica software): tempi e ritmo del gioco qui non sono
  misurabili (la pausa «webcam ferma» scatta per questo).
- **Non provato**: webcam vera su Windows, partita intera con la webcam, tempi reali dei colpi a 30 e a 15 fps.

## Pacchetto LAN 2026-10-28.6 (29/10): webcam con i colpi dal movimento
Sostituisce il 2026-10-28.5. Solo LAN, senza gli elementi dello zip dell'altro agente.
- [x] Versione 2026-10-28.6; gioco 456/456, sito 157/157, build.
- [x] `natpf-simulator-lan-windows-20261028-6.zip`: 277 file, 61.095.112 byte, Node.js 22.22.0 verificato (node.exe
      `bae898ad…`), nessun certificato né chiave, nessuna parola vietata. SHA256
      `f5b40b694088a40aea81f8c8a8f4c9be368e4be14f7b92249698610cb4a6822b`.
- [x] Estratto e provato in https (certificato creato dal pacchetto, server con `--offline`): webcam finta che riproduce
      il video vero della diagnostica 213510 → «Colpo visto» e ingresso in campo; in partita nessuna inferenza del
      modello delle mani né del corpo, movimento 0,9 ms a fotogramma (mediana; Chromium senza GPU). Prova generale: 47
      voci, due QR, partita divisa, pagina del telefono, senza webcam il motivo «Nessuna webcam», nessun errore.
- [ ] Non provato: Windows, webcam vera, partita intera con la webcam (tempi dei colpi), telefono vero.

## Corsa a rete a vuoto: diagnostica 20261029-090144-aimd (1v1 sullo stesso schermo, build 2026-10-28.6)
Segnalazione: «tra i due scambi il mio personaggio va a rete a vuoto»; da correggere in tutte le versioni e modalità.
- Causa (registro e video): due punti persi con «Nice Shot!» (43,6 s e 62,0 s), entrambi dopo un colpo del Player 2
  in ritardo da dietro la sua riga di fondo (palla colpita a 15,4 e 14,7 m dalla rete). `natpf_impact.predictBall` si
  fermava appena |z| > 14,5 m, cioè al primo passo: traiettoria di un punto, nessun impatto raggiungibile, piano
  «stretch» verso quel punto nell'altra metà, e la posizione (`stand`, limitata alla propria metà) finiva a 1,2 m dalla
  rete. Chi gioca correva a rete e la palla gli passava dietro (colpo a vuoto «tardi»).
- Correzione (`src/natpf/natpf_impact.js`): la traiettoria si ferma oltre 14,5 m solo nel verso in cui va la palla;
  il piano non porta mai verso un punto fuori dalla propria metà (una palla che non arriva nella propria metà non
  sposta chi gioca, piano annullato).
- Modalità coperte: lo stesso piano (`planPlayerIntercept`) muove chi gioca contro la CPU, nel 1v1 in rete, sullo
  stesso schermo, nell'allenamento e il Player 2 (1v1 e stesso schermo). La CPU e il doppio usano
  `_predictBallIntercept` (dal punto di caduta), che non ha questo difetto.
- Test: `test/natpf-corsa-a-rete.test.mjs` (4: le due palle del registro per chi gioca, la stessa per il Player 2,
  240 palle profonde da 10,5–17 m a Casual, Pro, Leggenda e 1v1, palla che non arriva). Senza la correzione falliscono
  tutti e 4. Gioco 460/460, sito 157/157. Banco Leggenda: 2 criteri KO, identici con e senza la correzione (già noti).
- Nei pacchetti estratti (LAN in https, Cloudflare statico), nella pagina vera: sulla palla del registro piano «ground»,
  impatto a 11,07 m e posizione a 11,42 m dalla rete, per chi gioca e per il Player 2 (prima 1,2 m).
- Osservazione (non cambiata): sul pallonetto corto del P2 a 39,4 s il piano ha scelto la schiacciata al volo a 5,25 m
  dalla rete (corsa in avanti voluta, punto più alto raggiungibile della zona della schiacciata).

## Pacchetti 2026-10-28.7 (29/10): LAN e Cloudflare con la correzione della corsa a rete
Contenuto: tutto il lavoro fino alla 2026-10-28.6 (webcam dal movimento compresa) più la correzione qui sopra; niente
dello zip dell'altro agente.
- [x] Versione 2026-10-28.7; gioco 460/460, sito 157/157, build.
- [x] LAN Windows `natpf-simulator-lan-windows-20261028-7.zip`: 277 file, 61.095.132 byte, Node.js 22.22.0 verificato
      (`bae898ad…`), nessun certificato né chiave, nessuna parola vietata. SHA256
      `89a737039aca474205c14318fd0cc3449b8cf5fc026c2a4a2edf8f41b98e8f7c`.
- [x] Cloudflare `natpf-simulator-cloudflare-20261028-7.zip` (`dist` + `_headers`): 137 file, 26.060.073 byte, file più
      grande 6,1 MB, nessuna parola vietata. SHA256 `4fd6736856c7d98994d3127e5e93f355b3f22880ec52b51600f9716248c6735f`.
- [x] Estratti e provati: LAN in https (certificato del pacchetto) e Cloudflare come sito statico: 47 voci, due QR,
      partita divisa, pagina del telefono, palla da 15,4 m giocata da fondo campo; nessun errore (su Cloudflare i 404
      attesi di un sito statico: `/api/match/state`, `/lan/status`).
- [ ] Non provato: Windows, telefoni veri, Cloudflare Pages vero.

## Webcam come nello zip argon-tennis (29/10)
Segnalazione: «ho riverificato la webcam e continua a non funzionare»; richiesta: ristabilire il gioco con la webcam
prendendolo **esclusivamente** dallo zip `remix-argon-tennis.zip` (app di AI Studio, motore base; i primi due allegati
erano la pagina «Cookie check» di AI Studio, non lo zip). Lo zip resta fuori dal repository.
- Cosa fa la webcam dello zip (`src/motion_controls.js` del motore base): modello delle mani di MediaPipe nella pagina
  (2 mani, complessità 1, confidenza 0,4) a ogni fotogramma nuovo; punto della mano tra polso e nocca del medio; scia
  di al massimo 5 punti in 160 ms; colpo quando la scia è lunga (0,065), dritta (0,62) e veloce (0,62), 320 ms tra due
  colpi; lato dal verso orizzontale, tipo dal verticale (tagliato, pallonetto, schiacciata), lancio con la mano che sale
  veloce in alto; senza mano il flusso ottico 64×48. Nel motore: servizio subito o al colmo; nello scambio il colpo
  assistito (lo swing aspetta il punto giusto fino a 0,48 s); un lancio rifiutato nello scambio è un pallonetto.
- Fatto: predefinita la webcam dello zip (`webcamMode` «argon»): `_argonFrame`, `_argonEvaluateHandTrail`,
  `_onArgonHandResults` con il codice dello zip; opzioni del modello dello zip (`ARGON_HANDS_OPTIONS`, niente worker e
  livelli di carico); nel motore `_argonWebcamSwing` (servizio e scambio dello zip, senza la finestra d'impatto del
  telefono). Da NATPF restano: file di MediaPipe locali prima del CDN (il pacchetto LAN funziona senza internet), mano
  mancina, motivo quando la webcam non si apre, una sola apertura alla volta, diagnostica, blocchi del menu e della
  pausa. Una correzione allo zip: il compagno del doppio solo nel doppio (nello zip anche nel singolo, dove è nascosto e
  faceva partire subito lo swing; il resto del motore NATPF lo aveva già corretto). Niente pausa «mano persa» (lo zip non
  la ha); il modello del corpo solo con «Segui il corpo».
- Per confronto sullo stesso computer: `?webcamMano=1` (traccia della mano NATPF), `?webcamMovimento=1` (colpi dal
  movimento del 28–29/10). Testi della guida, del riscaldamento e del pannello come prima del 29/10 (mano, lato dal verso).
- Test: `test/natpf-webcam-argon.test.mjs` (7: opzioni, scia → colpo con lato e tipo, 320 ms, mano lenta, lancio,
  tagliato, flusso ottico, lancio rifiutato → pallonetto, colpo assistito nel motore, servizio, modello con le opzioni
  dello zip); aggiornati 4 test della webcam. Gioco 467/467, sito 157/157, build.
- Prova in Chromium (webcam finta): pacchetto LAN estratto in https, mano del video → «Mano vista»; con il video dei
  colpi veri in sviluppo un dritto e un lancio riconosciuti e il dritto arrivato al gioco. Il browser della prova non ha
  la scheda grafica: il modello delle mani impiega 0,8–5 s a fotogramma, quindi qui ritmo e tempi non sono misurabili.
- Attenzione: come nello zip il modello delle mani gira nella pagina a ogni fotogramma con la complessità 1 (più pesante
  del livello «leggera» di NATPF): su un portatile il gioco può rallentare. Non cambiato senza chiedere.
- **Non provato**: Windows con la webcam vera.

## Pacchetti 2026-10-28.8 (29/10): LAN e Cloudflare con la webcam dello zip argon-tennis
- [x] Versione 2026-10-28.8; gioco 467/467, sito 157/157, build.
- [x] LAN `natpf-simulator-lan-windows-20261028-8.zip`: 277 file, 61.096.349 byte, Node.js 22.22.0 verificato
      (`bae898ad…`), nessun certificato né chiave, nessuna parola vietata. SHA256
      `a743f3c2d42e2ecccdfe141a7972b65ae6fae5c0b146a250057c781a60d94ad4`.
- [x] Cloudflare `natpf-simulator-cloudflare-20261028-8.zip`: 137 file, 26.061.290 byte. SHA256
      `b15a7339aa6d7f93f4adc919267b27fb180bac916c7ac58651767c6257c55b5f`.
- [x] LAN estratto in https: «Mano vista» con la webcam finta; prova generale (47 voci, due QR, partita divisa, telefono,
      senza webcam il motivo), nessun errore. Cloudflare estratto e servito statico: stesse prove, solo i 404 attesi
      (`/api/match/state`, `/lan/status`).
- [ ] Non provato: Windows, webcam vera, telefoni veri, Cloudflare Pages vero.

## Diagnostiche del 29/10 mattina (LAN): 101056 (webcam, Casual), 101209 (telefono, Casual), 090144 (già vista)
Segnalazioni: (1) stesso schermo: schermo del telefono spento, «Ricalibra», calibrazione rifatta e non torna più
«Pronto»; la calibrazione parte troppo in fretta e vede movimenti non fatti; (2) palle in rete con qualsiasi colpo;
(3) schiacciate che dovrebbero essere molto più forti e non riuscite; pallonetti mai riusciti; palle corte quasi perfette.
- (1) Causa nel codice (il registro non ha la ricalibrazione): sullo stesso schermo la verifica della calibrazione la
  conferma `natpf_split_ui._onCal`, che agiva solo con la pagina «Collega» aperta. In partita nessuno confermava e il
  telefono restava su «Guarda il computer e conferma». Corretto: conferma (o nuovo tentativo, o profilo semplice) anche
  a partita in corso per i due telefoni; il pannello del telefono del P1 non si apre sopra lo schermo diviso. Test in
  `natpf-split.test.mjs` (fallisce senza la correzione).
  Calibrazione: dopo un comando (Ricalibra, sensori attivati, presa cambiata) 0,6 s fermi bastavano per passare ai
  gesti, la richiesta del primo gesto era pronta subito (contava la quiete del passo «fermo») e ogni movimento oltre
  40 °/s valeva: sistemare la presa diventava il primo gesto. Ora 1,5 s di attesa («Preparati») prima del passo «fermo»
  e 0,6 s di quiete misurati da quando compare il primo gesto (`CAL.lead`, `CAL.firstSettle`; `cal.leading`). La soglia
  di 40 °/s resta (gesti piccoli accessibili, test esistente). Test in `tools/test/calibration-quick.test.mjs`.
- (2) Non nel registro: in 101056, 101209 e 090144 nessun colpo di chi gioca in rete (passaggio sopra la rete misurato
  dalla palla: 1,08–4,35 m); i punti «Net» sono palle della CPU. I due colpi in rete del 28/10 (213510, Leggenda) erano
  swing 1,8–2,4 volte oltre la finestra su palle a 0,5 m: la regola del colpo fallito (molto fuori tempo su una palla
  sotto il metro = rete). Non cambiato: serve una diagnostica in cui succede (pulsante «Segna» sul telefono al momento).
- (3) Schiacciata: andava a 26–27 m/s di media (volo minimo 0,45 s del motore base in `_launchBallToTarget`), un piatto
  pieno a 23. Ora `OUTCOME.smashSpeed` 40 m/s dal punto d'impatto (volo minimo 0,26 s, `minFlight`, anche per il P2):
  38 m/s (258 km/h); stelle e scossa del colpo potente; schiacciata al volo dai pallonetti oltre 3,0 m (era 3,3; il
  pallonetto della CPU a Casual del registro arrivava a 3,04 m, ma dal fondo campo il punto non era raggiungibile:
  rimbalzo, come prima). Test in `natpf-racchetta-motore.test.mjs`. Banco Leggenda: gli stessi 2 criteri KO.
  Pallonetto: nei registri ogni gesto da pallonetto fatto in uno scambio è stato riconosciuto (101209 a 19,0 s
  «PERFECT LOB», salita 0,76; 090144 a 35,8 s); gli altri gesti dal basso in alto (salita 0,4–0,66) erano tra un punto
  e l'altro, al servizio. I colpi normali in scambio arrivano a salita 0,38: soglia non cambiata senza un registro dei
  tentativi (proposta: «Prova guidata dei colpi» in Diagnostica, che chiede pallonetti, o «Segna» sul telefono).

## Pacchetti 2026-10-28.9 (29/10): LAN e Cloudflare
- [x] Versione 2026-10-28.9; gioco 469/469, sito 158/158, build.
- [x] LAN `natpf-simulator-lan-windows-20261028-9.zip`: 277 file, 61.097.712 byte, Node.js verificato, nessun certificato
      né chiave, nessuna parola vietata. SHA256 `f78648ff4ac49e8079745e6888d6ba9f81ea50faf5c06c7343a0143eb424a57a`.
- [x] Cloudflare `natpf-simulator-cloudflare-20261028-9.zip`: 137 file, 26.062.033 byte. SHA256
      `5389ad4eeeb9b523a0754014a9a96b5ccbed0c1776d54f7aad5c0549cd696566`.
- [x] Estratti e provati: LAN in https (certificato del pacchetto) e Cloudflare statico: 47 voci, due QR, partita divisa,
      pagina del telefono (con la calibrazione nuova), nessun errore (su Cloudflare solo i 404 attesi).
- [ ] Non provato: Windows, telefoni veri (ricalibrazione in partita, schiacciata), Cloudflare Pages vero.


## Diagnostica 20261029-104712-2qez (stesso schermo, 1v1, telefoni) — segnalazione: «il player 2 si è disconnesso da solo»
Partita di 96 s, 8 punti. Il registro ha solo il telefono del P1 (il P2 non si registrava).
- Pausa del P2: da 52,4 s a 69,0 s il gioco è rimasto fermo (palla congelata a metà scambio, `palla` assente per 16 s);
  il collegamento del P1 era regolare (rtt 7–9 ms). Il telefono del P2 era su «Pronto» (sotto il titolo, «Partita in
  pausa»): dal codice, l'unica pausa compatibile è «sensori fermi» del computer (nessun messaggio del movimento del P2
  da 0,4 s, canale veloce non affidabile) con il canale affidabile vivo. Causa sulla rete del P2 non verificabile.
  Alla ripresa lo scambio è ripartito da dove era fermo (il P2 non rigiocava il punto: c'era solo per il P1) e il punto
  è andato al P2. Nella webcam, chi teneva il secondo telefono lo guarda durante la pausa e nei 3 punti dopo (servizi
  del P1 senza risposta: il registro non ha colpi del P2, non è un difetto dimostrato).
- [x] Salute del telefono (`natpf_phone_watch.phoneHealth`): il telefono manda nel segnale di ogni secondo l'età del suo
      ultimo campione dei sensori (`st.sa`, `racchetta.js`; `link.js` → `L.sensorAge`, `L.beatAt`). Movimento che non
      arriva ma telefono con i sensori vivi (segnale < 2,5 s, sensori < 0,7 s, rtt < 150 ms) → `degraded: 'canale'`,
      la partita non si ferma (i colpi arrivano anche sul canale affidabile). Telefoni di prima: come prima.
- [x] Ricollegamento: `link.relink()` → comando `relink` al telefono, che rifà il collegamento con la chiave di ripresa
      e `rl` (stessa pagina: il computer tiene i riferimenti della mira, `relinked`). Automatico (`createResync`) dopo
      2,5 s di movimento assente, al massimo ogni 12 s, durante lo scambio solo se la partita è in pausa. Pulsante
      «Ricollega il telefono» nel riquadro della pausa (P1 e P2, `natpf_ui.relinkAction`) e «Ricollega» sul telefono
      (strumenti; nel testo della pausa). Stile del riquadro spostato in `natpf-ui.css` (cqw/cqh).
- [x] P2 come il P1: punto rigiocato se la pausa arriva nello scambio o nel lancio; anche il P1 sullo stesso schermo
      (prima `!isMultiplayer` lo escludeva). Registro: `tel.pausa`/`tel.ripresa`/`tel.ricollega` con `chi`, e per il
      secondo telefono `tel2.link` (ogni secondo) e `tel2.colpo`; metriche `pauseTelefono` e `ricollegamenti`.
- [x] Schiacciate del P2: per il P2 valeva ancora la regola di prima (ogni palla sopra 1,78 m = schiacciata): due
      risposte al servizio con il gesto del pallonetto giocate come schiacciate da 8,1–8,7 m. Ora `smashAt` come il P1
      (gesto e altezza; sopra 2,3 m sempre).
- [x] Palle forti e profonde: tre palle del P2 a 10,5–11,6 m (26 m/s) con il piano di chi gioca sul rimbalzo (palla a
      7 cm), una in rete. A 13,8 m la palla era ancora sotto 0,5 m: ora si arretra fino a `PLAN.deepBack` 14,3 m e si
      prende nel punto più alto raggiungibile (nel caso del registro 0,52 m a 14,05 m invece di 0,075 m).
- Test: `test/natpf-split-ricollega.test.mjs` (5), `test/natpf-scambi-split.test.mjs` (2), `tools/test/
  phone-link-fast.test.mjs` (+1), `tools/test/phone-reconnect.test.mjs` (+1). Gioco 476/476, sito 160/160.
- [ ] Non provato: telefoni veri sulla rete dell'utente (ricollegamento vero, durata), Windows.

## Richiesta del 29/10 (dopo il pacchetto .9), punti 1–2: angolazione più sensibile; telefono inclinato in avanti nel palmo
Misure sui registri (101209, 090144, 213510, 205124, 104712) ripassando i campioni grezzi del telefono nel filtro del
piatto (`face-tracker.js`): la direzione del piatto all'impatto (`fh`) è coerente tra un colpo e l'altro (±28° in
104712), ma il «piatto abituale» preso dai colpetti della calibrazione era lontano dai colpi veri: 25–30° (104712, presa
inclinata di 42° in calibrazione e fino a 90° prima dei colpi) e fino a 150° (101209, 090144). Lontani più di 10° i colpi
veri spostavano il centro solo del 3% (oltre 80° per niente): in 104712 33 mire su 36 a destra; in 101209 e 090144 la
mira del piatto scartata in quasi tutti i dritti (direzione solo dal tempo, quasi tutto incrociato).
La misura alternativa (rotazione attorno alla verticale) sugli stessi colpi era più dispersa (±70° nei dritti): non usata.
- [x] `natpf_gestures.createAimModel`: il centro della calibrazione si verifica dopo 4 colpi veri (più lontano di 35°
      dalla loro mediana: si prende quella); pendenza comune di dritti e rovesci dalla stessa parte (riferimento girato:
      corpo o deriva) → i due centri si spostano insieme; pendenza di un solo verso dal decimo colpo. Le mire volute
      restano: cinque-sei colpi mirati di fila e mire opposte tra dritto e rovescio (tutto incrociato) non vengono
      assorbite (test di prima e nuovi). Curva della mira `AIM.gain` 22 (era 26).
- [x] Sensibilità: `INTENT.faceDead/faceSpan` 3°/20° (era 5°/25°: mira piena a 23° invece di 30°, 15° valgono 0,6);
      spinta naturale verso l'incrociato `OUTCOME.natural` 0,1 (era 0,15). Il peso massimo del piatto resta 0,6 (regola
      del 27/10: ai bordi della finestra il tempo resta più forte).
- Ripasso dei registri con il modello nuovo (mira del piatto > 0,25 a destra/sinistra): dritti di 101209 da 0/0 a 1/6,
  di 090144 da 0/0 a 6/0; 104712 rovesci da 7/3 (media +0,23) a 6/6 (+0,05), dritti da 7/0 (+0,38) a 7/2 (+0,36).
  La pendenza di un solo verso in partite corte resta in parte (si corregge dal decimo colpo).
- [x] Presa inclinata (punto 2): il riconoscimento (lato, tipo di colpo, mira) con il braccio e il telefono simulati
      tiene con la cima del telefono in avanti di 60° e 75° e con la presa che cambia tra calibrazione e gioco (30→65°,
      60→30°): 20/20 gesti per ogni caso, destro e mancino (`natpf-gesture-demo.test.mjs`, nuovo test). Lato e forma
      del colpo usano già la gravità (alto vero) e l'asse della propria calibrazione; la calibrazione veloce non chiede
      la presa verticale. Il punto debole era il centro della mira (sopra).
- Test: `natpf-calibration-aim.test.mjs` (+3), `natpf-gesture-demo.test.mjs` (+1), aggiornato
  `natpf-sessione-23-10.test.mjs` (curva 3–23°).
- [ ] Non provato con il telefono vero: serve una partita con la diagnostica per vedere le mire nei due versi.

## Richiesta del 29/10, punti 3–4: colpi super potenti nel contesto giusto; stanchezza dopo tanta corsa laterale
- [x] Colpo super (`natpf_stroke_outcome.superShot`, `SUPER`; motore `_natpfRacketShot`, P1 e P2 con il telefono), tutte
      le condizioni insieme e senza caso: gesto fortissimo (forza dell'intenzione ≥ 0,86: nei registri del 29/10, 146
      colpi, il 10% più forte), colpo naturale (dritto/piatto/schiacciata, tipo letto con sicurezza, dalla parte giusta
      del corpo: un rovescio su una palla dalla parte del dritto oltre 35 cm no), a tempo (entro 0,6 unità) e da fermo
      (qualità ≥ 0,8), su una palla alta (≥ 1,25 m all'impatto: il 10% più alto dei registri), lenta (≤ 12,5 m/s lungo il
      campo: il 25% più lento) o corta, o la schiacciata. Effetto: volo diviso per 1,4 (schiacciata 1,2), in fondo (≥ 10,2
      m), topspin 26 e 16 cm sopra il nastro (ogni altro colpo deve passare 34 cm sopra: con quella regola da 1 m d'altezza
      la palla profonda non poteva andare oltre il +15%; `_launchBallToTarget` ha l'opzione `netClear`). Sulla palla lenta
      di prova da fondo campo: 159–161 km/h contro 110 del colpo forte normale, volo 0,57–0,60 s contro 0,85.
      «SUPER SHOT» nel messaggio del colpo, stelle e scossa più forti, sforzo e pubblico («ooh»).
- [x] Chi riceve lo legge in ritardo (`ball.natpfSuper`): CPU Casual/Pro +0,16 s di reazione ed errore di lettura ×1,5;
      Leggenda qualità del colpo ×0,55; chi gioca con il telefono (P2) corsa all'80% verso quella palla. Rimandate in campo
      su 60 prove (palla verso il centro, mire varie): Casual 26 (colpo forte normale 43), Pro 32 (57), Leggenda 50 (59).
- [x] Stanchezza (`natpf_skill.fatigueStep`, `moveFactor`, `FATIGUE`): solo i personaggi di chi gioca (P1; P2 nel 1v1 e
      nello stesso schermo), solo in partita (non allenamento, sfide, dimostrazione). Ogni metro di corsa laterale nel
      punto +0,012, cambio di verso +0,015; ferma recupera 0,03/s, tra un punto e l'altro 0,12/s. Velocità massima fino
      a −10%: uno scambio lungo da una riga all'altra (36 m di corsa laterale) toglie il 5–6%, alcuni di fila il 10%; la
      pausa tra i punti ne toglie più di metà. Anche il piano d'intercetto usa la velocità ridotta (arriva dove arriva
      davvero). Nessun segno a schermo della stanchezza (non richiesto).
- Registro: `racchetta` con `super` (la palla che lo ha permesso) e, per i gesti forti senza super, `superNo` (perché).
- Test: `test/natpf-super-stanchezza.test.mjs` (6). Gioco 486/486. Banco Leggenda: gli stessi 2 criteri già KO, un po'
  più lontani (CPU contro «tennista» 78,7 → 76,9% dei game, contro «preciso» 39,4 → 37,7%: i giocatori simulati ora
  fanno anche colpi super); Pro e Casual contro «medio» nei criteri (81,6% e 100%).
- [ ] Non provato con il telefono vero: quanto spesso esce il colpo super con i gesti di chi gioca (dal registro:
      `racchetta.super` e `superNo`).

## Pacchetti 2026-10-28.10 (29/10): LAN e Cloudflare
- [x] Versione 2026-10-28.10; gioco 486/486, sito 160/160, build.
- [x] LAN `natpf-simulator-lan-windows-20261028-10.zip`: 277 file, 61.102.650 byte, Node.js verificato (`bae898ad…`),
      nessun certificato né chiave, nessuna parola vietata. SHA256
      `8afee2b27285f268f4df514ebf5022166575bad0f5c22b5b3ec57fe1368fb537`.
- [x] Cloudflare `natpf-simulator-cloudflare-20261028-10.zip`: 137 file, 26.065.760 byte. SHA256
      `f1e8f9f0f8907b89a56ca1278c7815b67cd9145dce77020e7cae2eec616dfa5f`.
- [x] Estratti e provati: LAN in https (certificato del pacchetto) e Cloudflare statico: 47 voci, due QR, partita divisa,
      riquadro «Telefono del Player 2 in pausa» con il pulsante «Ricollega il telefono», pagina del telefono con
      «Ricollega», nessun errore (su Cloudflare solo i 404 attesi). Il browser di prova è lento: la pausa compare dopo ~3 s.
- [ ] Non provato: Windows, telefoni veri (ricollegamento, mira, colpo super, stanchezza), Cloudflare Pages vero.

## Diagnostica 20261029-131307-yn48 (stesso schermo, 1v1, build .10) e foto della presa di riferimento — 29/10 pomeriggio
Segnalazioni: (1) palla quasi sempre al centro «indipendentemente dal movimento»; (2) presa di riferimento nuova: base
del telefono nel palmo, cima in avanti, schermo verso l'alto (foto); (3) schiacciata e pallonetto che non riescono;
(4) vicino alla rete il colpo finisce in rete, niente colpi potenti o angolati. Materiale: eventi, metriche, video della
webcam e del gioco (zip diviso, riunito); i sensori grezzi di questa partita non sono arrivati.

Analisi (registro, video, rigiocando i sensori di quattro sessioni precedenti con `scripts/audit/zip-replay.mjs`):
- Cadute di chi gioca tra −2,5 e +3,3 m (mediana |x| 1,7 m su 41 colpi in campo), quasi tutte a 10 m di profondità. Il
  tempo (controllo principale) restava quasi uguale: colpi trattenuti fino all'arrivo della palla e ritmo personale al
  centro, mediana 0,2 unità; il piatto, che cambia con il movimento, contava il 60%.
- Il piatto si leggeva dalla normale del dorso: con lo schermo verso l'alto il dorso guarda in basso e la sua direzione
  orizzontale girava con il polso. Con la presa a 65° un rollio di 40° sul manico valeva 63° di direzione.
- Video: gesti brevi di polso e avambraccio, dall'altezza del petto verso il fianco. Il rovescio normale in partita
  scendeva (salita mediana −0,45) mentre la calibrazione dava +0,30: 15 rovesci su 21 erano tagliati. Tre gesti su quattro
  dal basso verso l'alto (salita 0,53–0,64, piano 0,47–0,61) restavano top spin.
- Le due schiacciate (riconosciute) arrivavano su palle a 1,55–1,70 m, sotto la soglia di 1,75 m: colpi piatti di dritto
  o rovescio. Da 1,5–2 m d'altezza la schiacciata andava a 95–105 km/h: il lancio imponeva 34 cm sopra il nastro.
- Il pallonetto in partita passava 2,8 m sopra il nastro (colmo circa 4 m): schiacciato dall'altro giocatore.
- Palla corta: il movimento automatico la prendeva in salita a 0,5 m; da lì ogni colpo doveva risalire 34 cm sopra il
  nastro (niente chiusure); il tempo in secondi rendeva «molto in anticipo» (fuori, in rete) gli swing di 0,2 s sulle palle
  lente. Nei registri pochi colpi a rete: confermato con il motore senza grafica (sonde fuori dal repository).

Interventi (commit di questa sezione):
- [x] Telefono `site/js/tennis/face-tracker.js`: imbardata dalla rotazione di tutto il telefono attorno alla verticale
      (scomposizione swing-twist). Rigiocando quattro sessioni: dispersione dei colpi dello stesso verso circa dimezzata,
      direzioni oltre 60° da 36 a 11. Rollio di 40° con la presa a 65°: 17,5° invece di 63°. Provata anche la direzione del
      manico pesata con quella del dorso: non migliore sui dati veri.
- [x] `natpf_stroke_outcome.js`: piatto con peso 1 (era 0,6), tempo e piatto si sommano; profondità come lunghezza del
      colpo (in diagonale la palla cade più corta). Provata e tolta una curva di risposta della mira: poco utile sui dati
      veri (mediana 2,23 contro 2,04 m) e amplificava il rumore del polso (banco Leggenda).
- [x] Colpo normale imparato giocando (`natpf_phone_racket.habitualRise`, `RISE_LEARN.verified` 5): vale anche con la
      calibrazione. Pallonetto rispetto al proprio colpo normale (`INTENT.lobRelMin` .5, `lobRel` .45, `lobRelPlane` .7),
      soglie assolute di prima senza salita abituale.
- [x] Schiacciata: con il gesto da 1,5 m (`SMASH_FROM`, prima 1,75), palla alta dal piano d'intercetto
      (`ballIsHigh`), 10 cm sopra il nastro e 46 m/s (era 40).
- [x] Pallonetto più alto, scalato con la distanza (`lobFlight` [2,6, 1,95], `lobRef`, `lobScale`): da fondo campo colmo
      5,4–6,5 m, sopra i 4,4 m a 4,5 m dalla rete.
- [x] Rete e palle corte: palla corta presa al colmo del rimbalzo (`natpf_impact`, livelli con il contatto al colmo);
      chiusura sopra la rete (`OUTCOME.attack*`: entro 6,4 m, palla sopra 0,9 m, gesto deciso, qualità del livello
      `ASSIST.attackQ`) bassa sul nastro e veloce, angolo stretto possibile; volée sotto il nastro che sale come prima.
      Tempo sulla strada della palla (`SLOW`, `slowFactor`: da 15 m/s in giù, al massimo 1,8 volte).
- [x] CPU Leggenda: impara anche dai vincenti dell'avversario per tipo di colpo (`LEGEND.punPrior`, `punW`).
- [x] Test `test/natpf-presa-palmo-29-10.test.mjs` (10): tutti i gesti del tutorial con la presa nel palmo (destro e
      mancino, cima a 50/65/80°, rollio ±25°), direzione con il rollio, colpo normale imparato, pallonetto relativo,
      pallonetto alto, schiacciata da 1,55 m, direzione, palle lente, palla corta e chiusura, volée. Aggiornati
      `natpf-campo-aperto*.test.mjs` (nuova regola: il piatto arriva alle righe, tempo e piatto si sommano).
- [x] Gioco 496/496, sito 160/160, build. Banco Leggenda: stessi 2 criteri non rispettati di prima (CPU contro
      «tennista» 76,5%, era 76,9%; contro «preciso» 35,2%, era 37,7%), «medio» 93,1% (era 96,1%); Pro contro «medio»
      81,6% come prima. Senza l'apprendimento dai vincenti: «preciso» 29,6%; con il tempo largo 18/2,2: Pro 86,5%.
- [ ] Non provato con i telefoni veri: direzione con la presa nel palmo, pallonetto e schiacciata, chiusure a rete.
