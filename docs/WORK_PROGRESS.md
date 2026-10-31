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

### Presa di riferimento nel tutorial (stessa richiesta)
- [x] Figura della presa (`grip-art.js`): due viste, di lato e da dietro, base nel palmo, cima in avanti, schermo in alto;
      tolto il «Così no» (era lo schermo in alto). Testo della presa, lezione, calibrazione (`natpf_cal_view`).
- [x] Animazione 3D (`natpf_gesture_demo.js`, `GRIP_TILT` 65°): telefono con la cima in avanti e lo schermo in alto, mano
      sotto il dorso. Test `natpf-gesture-demo`: i gesti del tutorial con la presa nel palmo (destro e mancino, 50–80°),
      e con la presa di prima (15–75°).
- [x] Foto `presa-palmo.webp` (Higgsfield, nano_banana_2, una di quattro; due scartate con il telefono dritto come un
      telecomando, 6 crediti); tolte `presa-lato`, `presa-schermo`, `presa-sbagliata`. Passo «Orientamento e mano» con
      l'animazione 3D. Screenshot della lezione controllati.
- [x] Gioco 496/496, sito 160/160, build.
- [x] Trovato con la prova del pacchetto: la pagina «Collega» chiedeva ancora `presa-schermo.webp` (404) e due testi
      (Collega, Stesso schermo) descrivevano la presa di prima: corretti; test che nessuna pagina punti a foto tolte.

## Pacchetti 2026-10-28.11 (29/10 pomeriggio): LAN e Cloudflare
- [x] Versione 2026-10-28.11; gioco 496/496, sito 160/160, build.
- [x] LAN `natpf-simulator-lan-windows-20261028-11.zip`: 275 file, 61.313.498 byte, Node.js verificato (`bae898ad…`),
      nessun certificato né chiave, nessuna parola vietata. SHA256
      `88fd306f806630992ecdc043d73357c7c48da66699142b50d236a3a0a04f24aa`.
- [x] Cloudflare `natpf-simulator-cloudflare-20261028-11.zip`: 135 file, 26.121.829 byte. SHA256
      `6f7cc554406506b2dc0b714fda03025c78816a9d374a94a4f27ebc202841b40c`.
- [x] Estratti e provati: LAN in https (certificato del pacchetto, porta 8443) e Cloudflare statico: 47 voci, due QR,
      partita divisa, pausa del P2 con «Ricollega il telefono», lezione con `presa-palmo.webp`, pagina del telefono con la
      misura nuova del piatto, nessun errore (su Cloudflare solo i 404 attesi `/api/match/state` e `/lan/status`).
- [ ] Non provato: Windows, telefoni veri (direzione, pallonetto, schiacciata, chiusure con la presa nel palmo),
      Cloudflare Pages vero.

## Diagnostica 20261029-145416-lqa9 (stesso schermo, 1v1, build .11) — 29/10 sera
Richieste: (1) webcam che non traccia bene (distanza, interruzioni, servizio, recupero), Lenovo E14; (2) impugnatura a
martello come posizione neutra di tutto il controllo; (3) togliere «Sfida il campione»; (4) audit e verifica.
La diagnostica è di una partita con i telefoni (controller «phone», 55 s): non contiene dati della webcam di gioco, solo
il video della webcam di registrazione. Per la webcam vedi la sezione più sotto.

### «Sfida il campione» tolto
- [x] `natpf_arcade.MODES`, `natpf_events.js` (punteggio, punti veri, HUD, risultati), `natpf_lobby.js` (risultato,
      icona della corona); test aggiornati (`natpf-events`, `natpf-flows`: il ripristino della CPU scelta si prova con
      un altro minigioco) e un test che non ci sia più. Commit `dad3699`.

### Impugnatura a martello
- [x] Scelta chiarita con l'utente: pugno sulla base, telefono in avanti, bordo stretto in alto, display di lato.
- [x] Simulazione di tutta la catena (calibrazione, rilevatore, forma, intenzione) con la presa a martello: 216 colpi su
      240 giusti; sbagliati tutti quelli con la cima 15° sotto l'orizzontale (pallonetto → palla corta, tagliato → top
      spin, schiacciata → top spin). Causa: la testa della racchetta virtuale era l'estremità che a riposo sta più in alto,
      e con il telefono orizzontale bastavano pochi gradi per scambiare cima e base. Ora è sempre la cima, tranne oltre
      30° sotto l'orizzontale (`stroke-shape.js`, `STROKE_FLIP`). Dopo: 240 su 240. Test con la mutazione: con la regola
      vecchia il test del tutorial fallisce.
- [x] Rigiocati i sensori di questa diagnostica (`zip-replay.mjs`): colpi riconosciuti come prima, verso del colpo 22/25.
- [x] Tutorial: figura a due viste, testi (lezione, calibrazione, Collega, Stesso schermo), animazione 3D (cima in avanti
      a 80°, display di lato, inquadrature più di lato), foto `presa-martello.webp` (una di sei generate, 9 crediti).
- [x] Test `natpf-gesture-demo`: martello (cima 70/80/90/105°, display fuori o dentro, destro e mancino), prese di prima.

### Webcam: tracciamento a distanza, continuo, nel servizio, con recupero (Lenovo E14)
Dati: la 145416 non ha dati della webcam di gioco; usati la diagnostica `20261029-101056-2cyg` (webcam di gioco, build .8,
«Integrated Camera (174f:1826)» 640×480 a 30 Hz, seduto a circa 1 m) e il video della webcam della 145416 (persone in
piedi a 2–3 m, tre in vista). Misure ripetibili: `scripts/audit/webcam-probe.mjs` (MediaPipe del gioco su ogni
fotogramma del video, Chromium senza schermo) e `scripts/audit/webcam-argon-replay.mjs` (la logica vera della webcam
sui risultati). Video e fotogrammi restano fuori dal repository.

Diagnosi (cause, dalla 101056):
- Hands perde la mano **nel colpo**: 24 buchi oltre 100 ms, quasi tutti di 100–170 ms, sempre su movimenti veloci; la
  mano ricompare dall'altra parte (es. da 0,77 a 0,42 della larghezza in 171 ms): il colpo avviene tutto nel buco.
  Causa: mosso a 30 Hz con la luce di casa (fotogrammi del video: mano sfocata), non il carico (inferenza p50 23 ms,
  36 al secondo) né la camera (30 Hz costanti, nessun fotogramma perso).
- Al primo fotogramma senza mano partiva il flusso ottico, che confrontava con l'ultima immagine elaborata da lui
  (anche di secondi prima) e azzerava la scia della mano: 16 eventi su 18 dal flusso, velocità al limite (1,65) in 10,
  lato opposto allo spostamento vero della mano in 2, un dritto letto come lancio (→ pallonetto).
- Servizio: nel video l'utente prova il lancio 5 volte (9,1–13,3 s) prima che parta; i gesti c'erano ma la mano spariva.
- Mano che esce dal bordo alto/laterale (braccio alzato vicino alla camera): lì il flusso ottico è l'unica fonte.
- Distanza: a 2–3 m la mano è grande 0,03 della larghezza (0,07 a 1 m) e il colpo percorre metà immagine: con le soglie
  dello zip i colpi non bastano. Hands la vede comunque nell'81% dei fotogrammi (video della 145416).
- Più persone in vista: lo zip prende la prima mano della lista; un salto da una mano (o persona) all'altra è una
  «scia» velocissima, cioè un colpo (30 eventi in 20 s nello spezzone a 2–3 m, 14 al limite).
- Recupero: un modello che non risponde restava «occupato» per sempre (solo flusso ottico) e una camera chiusa dal
  sistema non si riapriva (la pausa diceva «si riprende da solo» ma nessuno la riapriva).
- Connessione: la webcam è locale (nessuna rete); latenza = cattura → inferenza (registro `webcam.ritmo`). Il
  collegamento del telefono (LAN) non è toccato.

Interventi (`src/natpf/webcam_argon_track.js`, `motion_controls.js`; regole del colpo dello zip invariate), commit
`cd6b949`, `409bf44`:
- [x] buco breve a metà immagine attraversato con la mano (260 ms): niente flusso ottico, lo spostamento nel buco è il
      colpo; flusso solo con la mano uscita dal bordo o non tornata, sempre da un'immagine nuova
- [x] movimenti in proporzione alla grandezza della mano (riferimento 0,07, fino a ×2,5): vicino nulla cambia
- [x] una sola mano agganciata: la più grande al primo aggancio, poi solo una compatibile (velocità ≤ 6 larghezze/s
      in proporzione, grandezza entro ×1,7); riaggancio dopo 0,5 s
- [x] modello senza risposta da 2 s sbloccato, ricaricato dopo 2 blocchi; camera ferma 2,5 s o chiusa riaperta
      (al massimo ogni 5 s), senza toccare modello e partita
- [x] registro: `webcam.modello`, `webcam.riapertura`, fotogrammi «mano diversa da quella seguita», «mano non
      tornata», «mano uscita dal bordo»; metriche `recupero`, `maniScartate`, `alFlusso`
- [ ] MediaPipe Pose non aggiunto alla webcam predefinita (vede il polso nel 9–17% di fotogrammi in più e attraversa il
      mosso, ma raddoppierebbe l'inferenza su un computer già all'85%): prossimo passo solo se oltre 3 m non basta

Verifiche:
- Test: `natpf-webcam-argon-continuita` (9 prove: regole, buco nel colpo nei due versi, mano ferma, mano non tornata,
  uscita dal bordo, due mani, più persone, modello bloccato e ricaricato, camera ferma/chiusa riaperta, distanza),
  `natpf-diag` (recupero nel registro e nelle metriche); `natpf-webcam-argon` dello zip invariato e verde.
- Riproduzione sugli stessi fotogrammi (codice di prima → nuovo): video E14 vicino, colpi dal flusso 8/10 → 1/17, al
  limite 4 → 1, il dritto a 17,3 s non più lancio, i tentativi di lancio del servizio riconosciuti al primo gesto;
  lontano simulato (persona al 55%) 8/8 dal flusso → 2/13, stessi colpi e lati del vicino in 7 su 7; 2–3 m reali con
  tre persone a 15 inferenze/s: 30 eventi (14 al limite) → 12 (5), la mano seguita resta quella di chi gioca.
- Pagina vera in Chromium con il video come camera finta: webcam accesa, mano vista, passaggio «mano non tornata»
  attraversato, nessuna riapertura falsa, nessun errore (inferenza ~1 s senza scheda grafica: tempi non indicativi).
- Ritardo: il colpo arriva quando la mano ricompare, 25–60 ms dopo l'evento che prima dava il flusso ottico (ma con
  direzione e lato della mano); il colpo assistito del gioco aspetta fino a 0,48 s, quindi resta in tempo.
- **Da provare sull'E14 vero**: distanza reale di gioco (in piedi a 2–3 m), servizio con il braccio alzato, colpi
  ampi e veloci, carico e fluidità; con la diagnostica: `webcam.frame` fonte e motivi, `webcam.ritmo`, `recupero`.

### Pacchetti 2026-10-28.12 (29/10 sera)
- [x] Versione `2026-10-28.12` (`site/js/tennis/version.js`, `site/tennis/build.json`). Gioco 505/505, sito 160/160, build ok.
- [x] LAN Windows `natpf-simulator-lan-windows-20261028-12.zip` (sha256 `22a1adf4c46669dbd06785d021d3ebdc2909a23688d30805eac236b4e3742901`)
      estratto e avviato: voce 47 clip, QR dei due telefoni, stesso schermo con pausa del P2, lezione con la foto della
      presa a martello, pagina del telefono, nessun errore; webcam con un video come camera finta (modelli locali).
- [x] Cloudflare `natpf-simulator-cloudflare-20261028-12.zip` (sha256 `78f084370b470cbc2fe74e8d03eac582cd2f57e6bfbe3b31c50079bf38274258`)
      estratto su server statico: stesse prove; i soli 404 sono `/api/match/state` e `/lan/status`, che il server
      statico di prova non ha (contenuto uguale al .11 salvo foto della presa e file ricompilati).

## Diagnostica 20261029-191023-4z55 (stesso schermo, Android P1 + iPhone P2, build .12) — 29/10 sera
Segnalazioni: (1) iPhone con dritto e rovescio invertiti; (2) iPhone «con il personaggio che si muoveva sempre»;
(3) scegliere chi batte, barra/effetto del colpo super, indicatore della stanchezza.

### 1. iPhone: dritto e rovescio invertiti — causa trovata e corretta (commit `8e6cfcb`)
- Misura: lato del gesto rispetto alla palla all'impatto (`racchetta` lato/palla, palla oltre 0,8 m): P2 iPhone
  concorde 1 volta su 12; P2 Android delle sessioni 145416 e 131307 7/8 e 14/16; P1 Android qui 9/12.
- Causa: Safari su iPhone dà `accelerationIncludingGravity` (e `acceleration`) con il segno opposto a Chrome Android
  (il giroscopio è uguale). Tutto è tarato su Android: verso del primo gesto di calibrazione (`verticalTurn`), alto
  della racchetta e posa «pronto» (`face-tracker`), verso del colpo senza calibrazione («Salta»).
- Simulazione (presa a martello, `phone-sim` con `ios`): calibrazione che legge il primo dritto come rovescio e non
  passa; con «Salta» 4 colpi su 4 dal lato opposto. Con la correzione: calibrazione e lati come Android (3 semi).
- Correzione: `site/js/tennis/motion-sign.js` (segno dal sistema, iPhone/iPad −1, confermato dai tocchi sullo schermo:
  4 tocchi concordi lo correggono se un browser cambiasse), applicato in `racchetta.js` a ogni campione; il profilo
  salvato porta il segno (profilo con il segno di prima → si ricalibra); il telefono comunica il segno (`dev.as`).
- Registro: ora anche `tel2.dispositivo`, `tel2.cal`, `tel2.profilo`, `tel2.scartato`, `tel2.prep` (nella 191023
  dell'iPhone non c'erano né modello né profilo).
- Test: `natpf-iphone-sensori` (segno, voti, normalizzazione, simulazione prima/dopo). **Da provare su un iPhone vero.**

### 2. «Personaggio che si muoveva sempre» (iPhone) — non riprodotto
- Video del gioco: nelle attese del servizio P1 e P2 hanno lo stesso piccolo dondolio (animazione d'attesa e camera che
  segue); nello scambio si muovono entrambi verso la palla (piani `piano`, corsa del P2 0–0,3). Il telefono del P2 non
  muove il personaggio (solo i colpi). Dalle 62,5 s il P2 è in pausa («pagina nascosta», poi «scollegato»).
- Da chiarire con l'utente: personaggio in campo, racchetta, o la schermata del telefono?

### 3. Chi batte, colpo super, stanchezza (commit `caf0ddf`)
- [x] «Batte per primo» nella pagina «Partita»: Tu (Player 1) / CPU (Player 2, Amico) / Sorteggio, ricordato;
      `match_format.firstServer` in `startNewMatch`. Test `natpf-battuta` (CPU batte da sola; sullo stesso schermo il P2
      batte con il suo gesto, la CPU non batte al posto suo).
- [x] `natpf_power_hud.js`: dopo ogni colpo la barra della potenza del gesto con la tacca della soglia del super; il
      colpo super la riempie d'oro con «SUPER!»; alone arancione sulla palla super in volo; l'esito del colpo super è
      «Super!» in oro (prima «Perfetto» copriva «SUPER SHOT»).
- [x] Energia sempre in vista in partita (1 − stanchezza di `natpf_skill`): verde, «Affaticato» giallo, «Stanco!»
      rosso pulsante. Sullo stesso schermo un gruppo per metà, sopra le etichette dei giocatori.
- [x] Verifica nel browser (Chromium): menu, singolo e stesso schermo (schermate), alone sulla palla. Test
      `natpf-potenza-energia`.

### Pacchetti 2026-10-28.13
- [x] Versione `2026-10-28.13`. Gioco 516/516, sito 160/160, build ok.
- [x] LAN Windows `natpf-simulator-lan-windows-20261028-13.zip` (sha256 `5ffdf48b04ae2925e6e3e9cad60619b3add358f09b591b73a6e99ad24377f71c`)
      e Cloudflare `natpf-simulator-cloudflare-20261028-13.zip` (sha256 `94699280e2ea566128365b45d9574002308488ea99291d6a12643e619c3cfe76`)
      estratti e provati come il .12; pagina del telefono aperta come iPhone (segno −1, nessun errore) su entrambi.

## Stesso schermo con una webcam per due (richiesta del 29/10 notte) — commit `98f1f7b`
Richiesta: «una modalità webcam che funzioni per due persone contemporaneamente: schermo condiviso con una webcam; se la
webcam prevede un campo visivo più ampio, alla massima grandezza disponibile».
- [x] `src/natpf/webcam_duo.js`: due corsie (P1 a sinistra, P2 a destra nell'immagine specchiata, come sullo schermo e
      come le metà dello schermo diviso), ognuna con la webcam per uno (scia dello zip argon-tennis, buco breve
      attraversato, scala con la distanza, flusso ottico per metà della griglia). Aggancio: la mano più grande nella propria
      metà, poi la stessa mano anche oltre il centro (il dritto di chi sta a sinistra lo attraversa); le corsie non si
      scambiano mai le mani. Colpi: P1 come la webcam per uno, P2 come i colpi del Player 2 (colpo assistito del 1v1).
- [x] Regole del colpo estratte in `webcam_argon_track.argonTrailEvent` e `argonFlowBlob`: le usano entrambe le webcam
      (riproduzione dei tre video della webcam per uno identica a prima del cambio).
- [x] Camera per due: il formato più largo che la camera dà (`getCapabilities`), fino a 1920×1080, zoom al minimo; tra le
      risoluzioni dello stesso campo visivo prima quella con almeno 24 fotogrammi al secondo (1080p, poi 1280 di larghezza),
      poi senza vincolo. Modello delle mani con fino a 4 mani. Spegnendo la modalità la camera torna a 640×480.
- [x] Pagina «Collega» dello stesso schermo: «Si gioca con: Due telefoni / Una webcam per due» (ricordato), anteprima
      specchiata nel formato vero della camera con la linea di mezzo e le etichette, stato per giocatore («Alza la mano che
      colpisce» → «Mano vista ✓»); pronti (e si passa da soli alla pagina «Partita») quando la webcam ha visto le mani di
      tutti e due; in partita niente pausa per il telefono del P2. Passo del menu ora «Racchette».
- Verifiche: `natpf-webcam-duo` (8 prove: aggancio, centro attraversato, mani che non si scambiano, buco breve, una sola
  persona, flusso per metà, camera, controller vero), `natpf-split` (dal menu alla partita con la webcam per due);
  riproduzione sul video reale della 145416 (due persone a 2–3 m, 15 inferenze/s): 16 colpi separati per giocatore;
  Chromium con il video come camera: pagina, mani viste, passaggio alla «Partita», partita divisa; camera finta di
  Chromium (fino a 3840×2160): scelto 1920×1080.
- **Da provare con la webcam vera**: frequenza ottenuta a 1080p o 720p, carico del modello con 4 mani (sull'E14 una mano
  in più costa un'inferenza in più), distanza e posizione dei due giocatori. Qui (senza scheda grafica, 1,5 s a
  inferenza) in partita scatta la pausa «la webcam non manda immagini»: è l'ambiente, non il codice.
- Limite (come la webcam per uno dello zip): dritto e rovescio dal verso del movimento, senza la mano: per i mancini sono
  invertiti.
- [x] Pacchetti 2026-10-28.14 (gioco 525/525, sito 160/160, build ok): LAN Windows
      `natpf-simulator-lan-windows-20261028-14.zip` (sha256 `19cf8443d6a2a33c808556ad35c9b32300015b9ba3e956b92f1eed901a255489`)
      e Cloudflare `natpf-simulator-cloudflare-20261028-14.zip` (sha256 `719debd6cee557ec4e540d7b6bbff05991e32a1e937ca4bd04eeeabfe7ab3be0`)
      estratti e provati come il .13; sul LAN anche la webcam per due con il video a due persone fino alla partita divisa.

## Telefono che non si collega con la versione Cloudflare (29/10 notte) — commit della correzione e pacchetti .15
Segnalazione: «Sfida un amico» con la versione Cloudflare; l'amico (Player 2 su un altro computer, Pixel) inquadra il QR
e il telefono resta su «Connessione persa».
- Prova completa qui (host, P2 con `net=p2p`, pagina del telefono del P2, pacchetto Cloudflare servito come sito
  statico, segnalazione pubblica di PeerJS vera): il telefono del P2 si collega. Quindi niente di specifico del P2: il
  telefono raggiunge il computer (altrimenti avrebbe detto «Partita non trovata») ma il canale diretto non si apre.
- Causa nel codice (`site/js/tennis/link.js`): il computer chiudeva il collegamento in arrivo se il telefono non diceva
  «hello» entro 6 s **dal primo contatto**, anche prima che il canale fosse aperto; il telefono rinunciava a 12 s. Con
  le reti che non lasciano la strada diretta (Wi-Fi che isola i dispositivi o per ospiti, NAT dei dati mobili) il canale
  passa da un server di inoltro (TURN) e ci mette di più: chiuso sempre a metà, «Connessione persa» all'infinito.
- Correzioni: computer 6 s dall'apertura del canale (prima fino a 30 s); telefono fino a 30 s se la strada diretta si
  sta aprendo (ICE «checking»); strade in più: STUN di Cloudflare e i TURN di PeerJS anche in TCP (reti senza UDP);
  sul telefono il motivo (server non raggiunto / computer che non risponde / rete che blocca, con i rimedi: stessa rete
  Wi-Fi non per ospiti, hotspot del telefono per il computer, versione LAN).
- Test: `tools/test/phone-link-net` (strade, tempi del computer con i timer finti, motivi), `phone-reconnect`
  (collegamento lento sul telefono). Prova nel browser rifatta: collegamento in 5–9 s con le strade nuove.
- **Non verificato**: la rete dell'amico. Se la rete blocca anche i server di inoltro pubblici di PeerJS (gratuiti, non
  garantiti), serve un server TURN nostro: Cloudflare ne ha uno (Realtime TURN) ma richiede un Worker con una chiave,
  oggi il sito Cloudflare è solo statico.
- [x] Pacchetti 2026-10-28.15: Cloudflare `natpf-simulator-cloudflare-20261028-15.zip` (sha256
      `21ea32b6dc512b7aa28df45abcb6588d78d6268e30478dfe4a1304a2cc7c6251`; estratto: host → P2 `net=p2p` → telefono
      del P2 collegato) e LAN Windows `natpf-simulator-lan-windows-20261028-15.zip` (sha256
      `977d85b62459da6ea77012aa21e5a15af7e62a423099c1b1b7381f9fdd1800f2`; estratto: prova di sempre, nessun errore).

## Sfida tra due computer (Cloudflare): blocco tra primo e secondo game, pause, riconnessione (30/10) — commit `69f1563` e seguente
Segnalazione (rapporto esterno su `2734cd8`, pacchetti .15, con screenshot): sfida «Sfida un amico» sulla versione
Cloudflare; dopo il primo game il P2 resta su «Collegamento con Player 1 perso» e la partita non riparte; con una VPN
sembrava andare meglio. Il rapporto non aveva trovato la causa (solo una condizione che dà lo stesso messaggio).
- **Causa trovata e riprodotta**: la PeerJS inclusa (`site/js/vendor/peerjs.min.js`, serializzazione «json») scarta in
  silenzio i messaggi da 16300 byte in su («Message too big for JSON channel», solo un evento d'errore che l'host
  ignorava). La risposta di `/api/match/state` al P2 conteneva lo storico dei colpi due volte (`p1`/`p2` e `rackets`)
  con i dati NATPF di ogni colpo del telefono: 2,2 KB a inizio partita, +1,4 KB per colpo del P2, oltre 16300 byte dopo
  ~10 colpi del P2, cioè verso la fine del primo game. Da lì il P2 non riceveva più niente («collegamento perso»),
  mentre l'host lo vedeva collegato (le richieste del P2 arrivavano) e restava fermo ad aspettare il servizio del P2 a
  inizio secondo game. In LAN (HTTP vero) il problema non c'è. Anche sotto la soglia erano fino a 420 KB/s verso il P2.
  Misura: build `2734cd8` con `tools/e2e/natpf-1v1-p2p.mjs` (due Chromium, PeerJS vero, P2 automatico con i dati del
  telefono): dopo 8 colpi del P2 il suo schermo resta su 15-15 «lost» per 219 s, l'host a 1-0 in SERVE_STANCE con il
  servizio al P2. La VPN non può spiegarlo: non tocca la misura dei messaggi (forse partite più corte, non verificabile).
- Correzioni (`natpf-tennis/src/natpf/natpf_p2p.js`): al P2 solo gli ultimi 3 colpi di ciascuno, senza la copia
  `rackets` (`compactMatchState`, ~2–6 KB); risposte comunque grandi a pezzi da 4500 caratteri ricomposti dal P2
  (`chunkText`, RPC con `k`/`n`). Una lettura dello stato alla volta (`motion_controls.startPhonePolling`, prima una
  ogni 50 ms senza aspettare: fino a 80 in coda). Canale tra i computer: fino a 30 s (`OPEN_MAX_MS`) se ICE è ancora
  «checking» (prima 12 s P2 / 15 s host), come il telefono.
- Pausa per tutti e due quando uno non può giocare (`natpf_versus.js` p2HoldWhy/createHoldReporter/opponentHealth/
  hostHoldText/guestHoldNotice, `natpf_versus_ui.js`): il computer del P2 manda `hold=<motivo>` con la lettura dello
  stato (telefono scollegato, non pronto, schermo spento, sensori fermi, finestra del gioco nascosta; tolleranza 300 ms),
  il relay lo passa all'host (`p2Hold`), l'host ferma la partita con la stessa macchina a stati del telefono
  (`createPhoneWatch`: tratto regolare, conto alla rovescia, scambio interrotto rigiocato). Anche per il computer del P2
  sparito (5 s) e per la finestra dell'host nascosta. Il P2 vede sopra il campo perché è ferma (suo telefono con
  «Ricollega il telefono», host in pausa, host in secondo piano, conto alla rovescia); lo snapshot di pausa porta
  punteggio e durata (chi rientra li vede subito). La pausa del telefono dell'host nel 1v1 in rete ora rigioca lo scambio
  (`natpf_ui._holdAction`, condizione `playerRole !== 'p2'`; senza un test dedicato).
- «Riconnetti» (pannello del P2 quando il collegamento è perso o non parte, sfida senza server): `guest.reconnect()`,
  un tentativo subito, stessa partita. Identità di ripresa (`resumeIdFor`, sessionStorage): lo stesso P2 (pagina
  ricaricata, «Riconnetti») riprende subito il posto; prima doveva aspettare 5 s di silenzio del vecchio collegamento.
- Punteggio salvato dall'host (`makeCheckpoint`/`checkpointFor`): se la pagina dell'host si ricarica, la partita
  successiva nella stessa stanza, stessa durata, da 0-0 e entro 30 min riparte dal punteggio salvato (con chi batte).
  Si cancella a fine partita, tornando al menu o lasciando la sfida.
- Test: `test/natpf-p2p.test.mjs` (canale finto con il limite di PeerJS: fallisce sulla `2734cd8` con «host senza
  risposta»; pezzi; «Riconnetti» e id di ripresa; attesa con ICE «checking»; una lettura alla volta con `hold`),
  `test/natpf-versus-hold.test.mjs` (nuovo: motivi, relay, pausa per il telefono del P2 con conto alla rovescia e punto
  rigiocato, computer del P2 sparito, punteggio salvato). Gioco 534/534 (1 saltato), sito 164/164, build ok.
  `tools/e2e/natpf-1v1-p2p.mjs` esteso (P2 con i dati del telefono, ≥15 colpi, rientro con la racchetta da scegliere):
  27/27 sulla build nuova, 22/27 sulla `2734cd8`.
- **Non verificato**: Cloudflare vero, due computer su reti diverse, telefoni veri (Pixel, iPhone), rete con UDP bloccato.
- Non fatto (da decidere con l'utente): TURN gestito con TLS sulla 443 (Cloudflare Realtime TURN: serve una funzione lato
  server con la chiave, oggi il sito è statico); canale «fast» del telefono senza ritrasmissioni (`reliable:false` di
  PeerJS imposta solo `ordered:false`: confermato nel codice; tocca il collegamento del telefono che funziona e i colpi
  passano già anche dal canale affidabile); misura del viaggio P2→host per i tempi dei colpi del P2 e scadenza dei colpi
  vecchi (`relayedNatpf` compensa solo fino a 0,25 s nel relay); interpolazione della palla sul P2.
- [x] Pacchetto Cloudflare 2026-10-28.16 (versione in `site/js/tennis/version.js` e `site/tennis/build.json`):
      `natpf-simulator-cloudflare-20261028-16.zip` = `natpf-tennis/dist` + `_headers`, 150 file, 26.142.488 byte, sha256
      `9aaeb5eef8e2b21a16e1b2a7c24b953b0611a5ae030da9c56d8686299be6b1aa`; estratto e provato come sito statico con
      `tools/e2e/natpf-1v1-p2p.mjs` (DIST=cartella estratta): 27/27, 21 colpi del P2 con i dati del telefono, snapshot più
      vecchio 65 ms.
- [x] Pacchetto LAN Windows 2026-10-28.16 (richiesto dall'utente il 30/10, dopo il push): `natpf-tennis/lan/pacchetto.mjs`
      con `npm run build`, Node.js 22.22.0 win-x64 (sha256 `c97fa376…66a645c77a` uguale a SHASUMS256 di nodejs.org):
      `natpf-simulator-lan-windows-20261028-16.zip`, 316 voci, 61.347.924 byte, sha256
      `b054396ed2b0eec3ab1d4ed623010276164df09eb0d6e9e7a38ffe892df1b138`, nessun certificato né chiave. Estratto e provato
      (Linux): certificato, server HTTPS, versione 2026-10-28.16, relay con `p2Hold`; Chromium: gioco, «Sfida un amico» con
      la stanza LAN, pagina del telefono, nessun errore in console. Non provato su Windows.

## Domande aperte della sfida tra due computer: analisi verificata (30/10)
Cinque analisi indipendenti (codice e documentazione ufficiale) con cinque verifiche avversarie; nessun file del gioco
modificato. Decisioni da prendere con l'utente:
1. **TURN nostro su TLS 443** (Cloudflare Realtime TURN: 1000 GB/mese gratis, poi 0,05 $/GB; endpoint
   `rtc.live.cloudflare.com/v1/turn/keys/<id>/credentials/generate-ice-servers`, URL `turns:turn.cloudflare.com:443`).
   Serve uno script nel Worker (`/api/turn`) con la chiave come Secret. Nel client: promessa `iceReady()` in `link.js`
   aspettata anche da `natpf_p2p.js` (ha una sua `loadPeer`), risposta accettata solo se JSON con `iceServers`, rinnovo
   per i Peer lunghi (usano la config della creazione). `wrangler.jsonc` del repository NON è la config del Worker
   `weathered-heart-53ed`. Il controllo dell'Origin non protegge (le GET della stessa origine non lo mandano).
   Da sapere dall'utente: come pubblica il Worker (dashboard o wrangler), se crea lui la TURN key.
2. **Canale «fast» del telefono**: via internet è affidabile ma non ordinato (connessione WebRTC separata), non «senza
   ritrasmissioni» come dicono i commenti (`link.js:9-11`, `racchetta.js:231-233`). Raccomandazione: correggere solo
   commenti e PROJECT_MEMORY (i `docs/NATPF_*.md` sono archivio); le misure del 21/10 erano su loopback (RTT ≈ 0). Se mai
   si cambia: solo lato telefono, valutare `maxPacketLifeTime` 100–150 ms, e il limite di `bufferedAmount` deve scartare
   (oggi `sendFast` falso ripiega sul canale ordinato).
3. **Tempi dei colpi del P2**: il viaggio P2→host non è misurato e i colpi non portano l'ora; sull'host nessuna scadenza
   per età (solo `PHONE_STALE_S` 0,6 s sul tratto telefono→P2). Rischio vero: un colpo arrivato 2–3 s dopo può far partire
   il servizio del P2. Asimmetria: il P2 non riceve `natpfLateSpan` (solo `natpf_impact.js` lo passa al P1), quindi la
   sua finestra del ritardo è 0,17 s (PERFECT→LATE a ~60 ms). Proposta: prima misurare (ping/pong con `createClock`,
   colpo con l'ora dell'host, età nella diagnostica), poi scarto per età e regola del servizio (colpo < ~0,3 s).
4. **Palla sul P2**: fisica locale tra gli snapshot, ma ogni snapshot sovrascrive palla e attori (65%) senza fusione
   (`game_engine.js:3302-3318`). Scatto più visibile probabile: dopo un colpo locale del P2 gli snapshot dell'host
   ancora senza il colpo riportano la palla indietro. Proposta: ignorare la palla degli snapshot più vecchi del colpo
   locale (rallyStrokeCount) fino a ~300 ms, poi correzione morbida solo visiva; misura dell'età nella diagnostica.
5. **VPN**: non può cambiare il limite dei 16300 byte. Spiegazioni plausibili: problema di avvio (telefono↔computer,
   rete), partita più corta, host ricaricato (nella .15 il relay dell'host ripartiva vuoto e «sbloccava» il P2 a 0-0),
   riconnessione forzata dal cambio di IP. Segno distintivo: col blocco da 16300 byte l'host vedeva il P2 collegato.
   Proposta: prova con la .16 con e senza VPN e `chrome://webrtc-internals` (o registrare nella diagnostica la coppia
   di candidati scelta con `getStats`).

## Colpi del P2, palla del P2, TURN di Cloudflare (30/10, decisioni dell'utente) — pacchetto Cloudflare .17
Decisioni: canale «fast» lasciato com'è (corretti solo i commenti); colpi del P2 «ok misurare, ok proteggere» (soglia
scelta 600 ms, come PHONE_STALE_S; compensazione e finestra del P2 invariate fino alle misure); palla del P2 come
proposto; TURN di Cloudflare con la chiave creata dall'utente. VPN: era sul **telefono del P2** e serviva a far
collegare il telefono al suo computer → la rete del telefono bloccava le strade di oggi: è il caso del TURN su 443.
Lavoro in tre rami paralleli (worktree) con revisione avversaria, poi correzioni verificate (commit da `dd2c96b` a
`1bb570e`):
- Colpi del P2: orologio host↔P2 dalle letture dello stato (`now` nella risposta del relay, createClock con 200
  campioni); il colpo porta `sentAtHost` solo se il viaggio migliore è ≤ 300 ms; sull'host `p2SwingAgeMs` dal picco del
  gesto, oltre `P2_STALE_MS` 600 ms il colpo o il lancio non si gioca (`sfida.colpo_vecchio`); diagnostica
  `sfida.colpo` (età, tempo) e `sfida.orologio`. Test `test/natpf-versus-tempi.test.mjs`.
- Palla del P2 (`src/natpf/natpf_guest_view.js`): dopo un colpo locale del P2 gli snapshot che non lo contengono non
  toccano la palla (fino a 500 ms); lo snapshot di conferma prende la traiettoria dell'host senza riportare indietro la
  palla disegnata; correzione solo visiva in ~100 ms (salto netto per colpi nuovi o scarti > 1,5 m); attori fusi per
  fotogramma; diagnostica `sfida.vista` (età degli snapshot nel relay, correzioni, blocchi). Test
  `test/natpf-guest-view.test.mjs`.
- TURN: Worker separato `natpf-tennis/cloudflare/turn-worker.js` (credenziali 24 h da
  `generate-ice-servers`, porta 53 tolta, CORS con `ALLOWED_ORIGINS`); client `site/js/tennis/ice-route.js` (legge
  `/natpf/turn.json`, chiede le credenziali in ≤ 2,5 s, accetta solo JSON valido, server Cloudflare per primi e quelli
  di sempre come riserva, rinnovo anche sui collegamenti già aperti, niente richieste in LAN, con `?peer=`, file:);
  pacchetto `natpf-tennis/scripts/pacchetto-cloudflare.mjs --turn-url=`; diagnostica della strada scelta (`tel.strada`,
  `tel2.strada`, `sfida.strada`: host/srflx/relay, udp/tcp/tls, rtt, se è il nostro TURN). Test `turn-worker`,
  `phone-link-net` e altri.
- Verifiche: gioco 566/566, sito 178/178, build; `tools/e2e/natpf-1v1-p2p.mjs` 27/27; nel browser con abbinamento vero
  del telefono (segnalazione pubblica PeerJS): con `/natpf/turn.json` verso un Worker finto gioco e telefono mettono i
  server Cloudflare per primi su tutti e due i collegamenti, senza il file le strade di sempre; nessun errore.
- **Non verificato**: Cloudflare Realtime vero (nessuna chiave), un collegamento che passi davvero dal TURN in TLS 443,
  telefoni veri, due computer su reti diverse, il comportamento delle costanti (300/600/500 ms) in partite vere: si
  legge dalla diagnostica (`sfida.*`, `tel.strada`).
- [x] Pacchetto Cloudflare 2026-10-28.17 con `/natpf/turn.json` → `https://natpf-turn.s-porcelli.workers.dev/` (nome del
      Worker da creare: `natpf-turn`): `natpf-simulator-cloudflare-20261028-17.zip`, 138 file, 26.156.608 byte, sha256
      `464fafc5a50a2f7a2235be86e8c9a3f06c4d0d16a4b6cfdf88442014e367070e`. Guida per l'utente: `docs/GUIDA_TURN_CLOUDFLARE.md`.
- [x] Worker `natpf-turn` creato dall'utente (30/10): prima «Cloudflare ha risposto 404» (valori di un'altra sezione di
      Realtime, poi corretti con la chiave di «TURN Server»); il Worker ora toglie spazi e a capo dai valori, prova
      anche `credentials/generate` e spiega 404/401 con le sole lunghezze (commit `be08240`, `20c1d0b`). L'utente
      conferma: «ora funziona». Da verificare ancora: il telefono del P2 senza VPN con il .17 e `tel.strada`.

## Richiesta del 30/10 sera (5 punti) e diagnostiche 20261030-142317 / -142438 — in corso
Richiesta: (1) webcam da 1 a 4 m, integrate e separate; (2) webcam per due con corsie più larghe; (3) Radar del servizio
e Survival nascosti; (4) guida a schede più grande; (5) LAN analizzata e ottimizzata con le impostazioni esistenti;
poi: webcam del P2 invitato che non si configura; analisi delle due diagnostiche e audit di entrambe le versioni.
Fatto e unito (rami paralleli con revisione): webcam 1–4 m e webcam per due (`ad01623`, unione `0ee317d`), guida a
schede e minigiochi nascosti (`dc47ef3`, unione `eb780d2`), webcam del P2 con il flusso del P1 (`74edfdc`, unione
`ada351d`). Gioco 602/602, sito 178/178.
Diagnostiche (1v1 build .17, host col telefono, rete locale): 22 riscontri verificati (sintesi completa nella cartella
temporanea della sessione, `diag-confirmed.json`). Principale: un gesto preliminare morbido prende il posto del colpo
vero (3 colpi su 13 nella 142317). Decisioni dell'utente (31/10): servizio alla profondità vera sì; in risposta al
servizio schiacciata solo se voluta sì; pallonetto profondo schiacciabile al volo lasciato com'è; telecamera che arretra
oltre ~12,5 m sì. Non fatti ora: anticipo sistematico (C13), prova su reti diverse con la diagnostica sul P2 (C20).
In lavorazione (ultimo giro, rami paralleli con revisione): LAN ottimizzata; correzioni webcam dalle revisioni (geometria
16:9 contro le soglie 4:3 dello zip; scambi di mani nella webcam per due); gesti e impatto (C1, C5, C6, C12, C14, C15,
C19); equità del P2 (C2, C3, C10, C11, C18); motore (C4, C7, C8, C9, C16, C17, C21). Poi audit e pacchetti .18.

## Ultimo giro e audit finale (31/10) — pacchetti 2026-10-28.18 (Cloudflare con il TURN e LAN)
Uniti su `natpf-simulator` (rami paralleli in worktree, ciascuno con revisione avversaria, conflitti risolti a mano):
- LAN (`d40fe7b`): relay senza la copia `rackets`, ultimi 3 colpi al P2 e 5 all'host, `/api/match/sync` risponde
  `{ok, roomId, seq}` (lettura del P2 20.311 → 3.224 B, sync 9.770 → 39 B); letture senza stanza 1v1 ogni 0,5 s; lettura
  bloccata annullata a 2 s (`PHONE_POLL`); ping della segnalazione LAN ogni 10 s (registrazioni morte libere in ~14 s);
  `id-unavailable` non chiude più il canale aperto del telefono; keep-alive 65 s, ETag e 304, font immutabili; pausa
  ridisegnata a 2 Hz (600 → 43 disegni in 10 s); HUD che scrive solo i cambiamenti; musica con anticipo 0,22 s. 11 delle
  30 proposte fatte (verdetti nel resoconto dell'agente); banchi di bilanciamento identici byte per byte.
- Webcam dalle revisioni (`445bd7c`, `5a610f5`, `362d479`): camera 16:9 riportata a 4:3 prima delle soglie dello zip;
  webcam per due con il limite di salto solo dopo un buco, etichette delle mani libere con scadenza, confronto con l'altro
  giocatore solo se lo si segue (configurazioni peggiori della base 28 → 18 su 3600, solo a velocità estreme e 10–12 Hz).
- Gesti dalle diagnostiche (`8d74020`): rinvio di ~60–70 ms sui gesti morbidi (C1), niente attesa della preparazione
  sulle schiacciate (C5), mira limitata oltre la finestra (C6), schiacciata in risposta al servizio solo se voluta
  (C12), servizio non battuto da un gesto intermedio (C15), mira e ampiezza minima (C14, C19, dove sicuri).
- Equità del P2 (`3b9c936`): stesse regole del P1 per attore (`pendKey`, `lateMargin` 30 ms tra due computer), servizio
  dal gesto, limite della palla passata come il P1, lettura subito dopo un colpo del P2 (`pollNow`), diagnostica del P2.
- Motore (`6ef8e1f`, `a883224`): servizio alla profondità voluta (`NS.fixAirServe`, anche per il P2), schiacciata o
  volée mancata con il piano rifatto, animazione del servizio con la posa del lancio (il motore ora passa chi batte),
  telecamera che arretra oltre 12,5 m (`natpf_camera_depth.js`), lampo dell'esito rotondo (era il «rettangolo chiaro»),
  tabellone con chi serve, misure della diagnostica corrette.
Audit finale (build .18): gioco 673/673, sito 182/182, server LAN 5/5, build ok; pacchetto Cloudflare estratto:
`natpf-1v1-p2p.mjs` 27/27, `natpf-1v1-webcam-p2.mjs` 14/14, `natpf-webcam-distanza.mjs` 7/7; pacchetto LAN estratto:
certificato, HTTPS, versione .18, offline 21/21, relay con `p2Hold` e `now`, gioco e pagina del telefono senza errori.
Revisione del codice unito: gli agenti sono stati fermati dal limite d'uso; controllati a mano i punti d'incrocio
(attese per attore con il rinvio SOFT, colpo a vuoto del P2, campi del relay compatto, letture).
- [x] Cloudflare `natpf-simulator-cloudflare-20261028-18.zip` (con `/natpf/turn.json`), 153 voci, 26.169.386 byte, sha256
      `6f0121a1857715370766b63dd70a3b56f73f77a74acbecb989e667be1fc16653`.
- [x] LAN Windows `natpf-simulator-lan-windows-20261028-18.zip`, 318 voci, 61.382.787 byte, sha256
      `a1c6c30cdad12ea2eb0b2b29199f2353d260146a3051b3abfeb0fcabc77d0905`, nessun certificato né chiave.
- **Non verificato**: telefoni e webcam veri, Windows, due computer su reti diverse, TURN in uso reale, persone a 1–4 m,
  webcam per due con due persone; costanti nuove (rinvio 60–70 ms, margine del P2, telecamera) in partite vere.
