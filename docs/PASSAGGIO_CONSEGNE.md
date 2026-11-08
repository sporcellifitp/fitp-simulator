# Passaggio di consegne · NATPF Simulator (aggiornato al 07/11/2026 sera)

Per l'agente che riprende **da GitHub** (`sergio4/foro-italico-world`, branch `natpf-simulator`, ultimo commit indicato in
`docs/PIANO_LAVORI.md` §1). Questo file racconta in dettaglio il lavoro dal 05/11 al 07/11 (blocchi B9, B10, B11),
cosa resta aperto e cosa va controllato. Le regole permanenti sono in `CLAUDE.md`. Il file di ripresa unico resta
`docs/PIANO_LAVORI.md`: §1 Checkpoint, §2 regole, §6 procedure. Il dettaglio passo per passo è in `docs/WORK_PROGRESS.md`
(sezioni B9, B10, B11), le decisioni durature in `docs/PROJECT_MEMORY.md` (§ Decisioni B9 e B11).

## 0. Prima di toccare qualunque cosa

```sh
git fetch origin natpf-simulator && git checkout natpf-simulator && git status -sb && git log --oneline -15
cd natpf-tennis && npm ci && npm test && npm run build && cd ..          # gioco: 873 test
node --test tools/test/*.test.mjs                                       # sito e pagina del telefono: 195
(cd tools/lan && npm ci && node --test test/*.test.mjs)                 # server dei telefoni: 12
(cd natpf-desktop && ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci && npm test) # programma Windows: 28
npm ci --prefix tools/e2e
CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/natpf-menu.mjs   # una prova nel browser (vedi §4)
```

- Lavorare **solo** su `natpf-simulator`; push dopo ogni commit verificato; mai `--force` (`CLAUDE.md`).
- Le prove nel browser `natpf-*` avviano da sole vite e il server dei peer: se un'altra prova gira sulla stessa
  macchina usare porte proprie (`PEER_PORT=9xxx GAME_PORT=3xxx`). Le misure di fotogrammi al secondo sono valide solo a
  macchina scarica.
- I worktree `.claude/worktrees/*` e le patch in `docs/b9/wip/` sono **storia**: tutto è già unito su `natpf-simulator`.

## 1. Stato in una riga

Versione **2026-11-07.4**. Si consegnano **due prodotti**:
1. **Installer Windows unico** `NATPF-Simulator-Setup-<versione>.exe`, che si **aggiorna dal gioco**. È pubblicato da
   GitHub Actions su Cloudflare R2. Link fisso dell'ultima versione:
   `https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev/windows/NATPF-Simulator-Setup.exe`.
2. **Zip Cloudflare** per il Worker statico del gioco nel browser (`weathered-heart-53ed.s-porcelli.workers.dev`).

Lo zip LAN e l'eseguibile portatile **non si fanno più**: decisione dell'utente del 07/11, «sviluppa solo quella
windows». Il server LAN dei telefoni vive dentro il programma Windows.

L'utente sta installando la 2026-11-07.4 su Windows e riferirà: **nulla è stato provato su Windows né su telefoni veri**.

## 2. Cosa è stato fatto (05–07/11/2026)

### B9 · Tutorial, telefono, schermo spento, «pronto» nel 1v1 (richiesta del 05/11)
Testo completo della richiesta: `docs/b9/compiti.md`. Analisi e prototipi: `docs/b9/*.md`, immagini in `docs/b9/img/`.
- **Modale del tutorial** compatta e centrata, anche nella propria metà dello stesso schermo. In basso ci sono le
  frecce ‹ › al posto delle 11 etichette dei colpi; niente scorrimento automatico; una scheda conta come vista dopo
  ~1 s. Codice: `natpf-tennis/src/natpf/natpf_tutorial.js` (`tutorialStart/Go/Seen/Progress`, `TUTORIAL.seenMs` 1000).
- **Telefono** (`site/js/tennis/phone-screen.js`, `racchetta.js`, `site/tennis/racchetta.html`):
  - le schermate sono esclusive;
  - «Tutto chiaro, ho capito» resta spento finché tutte le schede non sono state viste (avanzamento `tp`, protocollo
    v2 compatibile);
  - Ricalibra / Ricollega / Scollega compaiono solo sotto «Pronto»;
  - il tutorial non viene riproposto ai ricollegamenti della stessa sessione;
  - se il telefono cade a tutorial aperto, il tutorial riprende dalla scheda in cui era.
- **Schermo spento**: nessun browser fornisce i sensori a pagina nascosta, quindi non c'è un trucco. Quello che il
  gioco fa:
  - Wake Lock ripreso;
  - pausa immediata sul computer, con la durata;
  - ripresa automatica;
  - un velo sul telefono il cui testo dipende dallo stato (`veilText`).

  L'unica alternativa vera è un'app Android nativa (`docs/b9/schermo-spento.md`, `docs/NATPF_APP_NATIVA_E_TRASPORTI.md`).
- **Pronto per giocatore**:
  - Nello **stesso schermo** c'è una scheda per giocatore (in attesa / si prepara / pronto / problema).
  - Il conto alla rovescia è di 3 s, sul computer e sui telefoni, quando tutti e due sono pronti, con i telefoni sani
    e il tutorial chiuso.
  - Il conto si annulla con il motivo; `bothReady()` usa lo stesso criterio delle schede.
  - Tornando con «‹ Indietro» il conto non riparte da solo (`SPLIT_BACK_DROP_MS` 1000).
  - Codice: `natpf_split_ui.js`, `natpf_ready.js`.
  - Nella **sfida tra due computer**: «Sono pronto» giallo → «Pronto ✓» verde, «Annulla», «Player 1 lo vede ✓»
    (`docs/b9/pronto-1v1.md`).
- **Animazione dei gesti rifatta**. Direzione scelta dal giudizio `docs/b9/giudizio-animazione.md`, approvata
  dall'utente vedendo l'anteprima: illustrata «2,5D» in Canvas 2D, solo avambraccio, mano e telefono, con la foto
  vera della presa accanto.
  - Il moto è **solo** in `natpf_gesture_pose.js` (modulo puro, 11 schede più incrociato e lungolinea, destro e
    mancino, presa palmo e martello).
  - Il disegno è in `natpf_gesture_demo.js` (stessa API di prima, un'istanza per metà schermo, compatta sotto 320 px).
  - Test di fedeltà: `natpf-gesture-pose.test.mjs` e `natpf-gesture-anim.test.mjs`. La posa disegnata passa per il
    telefono simulato e il rilevatore vero; ogni scheda deve dare il colpo mostrato.
  - Revisioni tecnica e artistica fatte dopo l'unione, con le correzioni: `docs/b9/animazione-c.md` §6.

### B10 · Richiesta del 06/11 sera («finisci i test; la voce dice smash ma non è quel colpo; il punteggio dice "game secco"; nel 2v2 le scritte coprono il campo»)
- **Voce «Smash»** solo quando la scritta del colpo è una schiacciata voluta. Nell'esercizio della schiacciata conta
  solo la schiacciata chiamata (`smashCalled`, `trainingShot`). Test: `natpf-voce-smash.test.mjs`,
  `natpf-training-directions` n. 4.
- **Tabellone come in televisione**: nome, game, punti 0/15/30/40/Vantaggio, chi serve, formato in parole («Al meglio
  di 3 game»), testo ≥ 10 px. Prova: `natpf-tabellone`.
- **Scritte dell'esito del colpo** nell'angolo del proprio lato, mai sul campo:
  - quelle del compagno CPU dicono «Compagno»;
  - il servizio del P2 compare nella sua metà;
  - in Allenamento la scritta va sopra la scheda dell'esercizio.

  Prova: `natpf-scritte-2v2` (73 controlli).
- **Riconoscimento**: le palle corte riconosciute dalla forma non insegnano più la «salita abituale». Prima, dopo
  qualche palla corta, tagliati e piatti venivano letti come top spin (`natpf_stroke_intent.js`,
  `natpf_phone_racket.js`, test in `natpf-racchetta.test.mjs`).
- **Blocco di ~1 s** nello stesso schermo senza GPU: era l'arena dietro il menu, ridisegnata 8 volte a ogni ingresso.
  Ora si ridisegna all'ingresso, al ridimensionamento e all'arrivo delle immagini (`_natpfWatchTextures` in
  `game_engine.js`).
- **Prove che erano vecchie, non il gioco**:
  - `natpf-gesti-speciali` (9/9): mancava il tutorial segnato come visto;
  - `natpf-1v1-webcam-p2` (15/15): il P2 risultava fuori linea durante una schermata lenta.

### B11 · Un solo installer che si aggiorna dal gioco (richiesta del 07/11)
- `natpf-desktop/`:
  - **un solo** `build/installatore.nsi`: aggiorna sopra e, con `/S /AGGIORNA`, aspetta la chiusura del programma,
    aggiorna in silenzio e riapre il gioco senza privilegi (tramite explorer). Non tocca `%LOCALAPPDATA%\NATPF`;
  - aggiornatore `src/aggiornamenti.mjs`: legge il manifesto `<base>/windows/latest.json`, scarica in
    `%LOCALAPPDATA%\NATPF\aggiornamenti` con ripresa e controlla dimensione e sha256. Ammette redirect solo verso lo
    stesso host e richiede https. Non aggiorna mai senza il clic dell'utente; offline non blocca nulla;
  - ponte `window.natpfDesktop.updates` (versione 2 del ponte) in `src/preload.cjs`.
- **Nel gioco** (`natpf-tennis/src/natpf/natpf_updates.js` e Opzioni):
  - avviso solo nel menu principale (mai in partita): «Aggiornamento disponibile» → «Aggiorna» → barra di
    avanzamento → «Riavvia e aggiorna»;
  - sezione «Aggiornamenti» in Opzioni;
  - assente nella versione browser.

  Prova: `natpf-aggiornamenti` (80 controlli).
- **Pubblicazione**: `.github/workflows/natpf-windows.yml`, a ogni cambio di versione, costruisce l'installer (Linux,
  electron-builder + makensis) e lo carica su R2 in quest'ordine:
  1. `windows/NATPF-Simulator-Setup-<build>.exe`;
  2. `windows/latest.json`;
  3. `windows/NATPF-Simulator-Setup.exe` (link fisso).

  Una versione già pubblicata non si ricarica mai. Restano gli ultimi 5 installer. Alla fine c'è un controllo
  dall'indirizzo pubblico.
- **Cloudflare R2** (preparato dall'utente con `docs/GUIDA_AGGIORNAMENTI_R2.md`):
  - bucket **`natpfsimulator`** nella **giurisdizione UE**: per caricare si usa l'endpoint
    `<id>.eu.r2.cloudflarestorage.com`, riconosciuto da solo dal workflow;
  - indirizzo pubblico `https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev`, scritto in
    `natpf-desktop/aggiornamenti.json`;
  - segreti GitHub: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET`;
  - il workflow ripulisce i valori e, se l'accesso è rifiutato, spiega il motivo senza mostrarli.
- **Prima pubblicazione riuscita** il 07/11 alle 17:21: build 2026-11-07.4, 124.614.379 byte, sha256
  `c516a2a0ee5ceecf8cb6aaa90ff6a540e7a10809e115862faf948da90ab36f84`. Lo stesso sha256 è stato verificato scaricando dal
  link fisso e dal nome con la versione.

### Versioni consegnate in questi giorni
| Versione | Commit | Contenuto |
|---|---|---|
| 2026-11-06.1 | `3b59c51` | B9 A+B + correzioni dello stesso schermo (animazione vecchia) |
| 2026-11-06.2 | `10ed703` | minori dello stesso schermo |
| 2026-11-06.3 | `d867d5e` | animazione nuova (revisioni fermate su richiesta dell'utente per la consegna) |
| 2026-11-07.1 | `c58bebe` | B10: voce, tabellone, scritte 2v2, revisioni dell'animazione |
| 2026-11-07.2 | `94ee4b6` | B10 dopo le revisioni indipendenti |
| 2026-11-07.3 | `0c6188b` | niente blocco di ~1 s nello stesso schermo |
| 2026-11-07.4 | `d2e0d50` | B11: installer unico con aggiornamenti; prima pubblicazione su R2 (workflow corretto fino a `fa190f2`) |

Le sha256 di tutti i pacchetti sono in `docs/WORK_PROGRESS.md`.

## 3. Cosa resta aperto

| # | Punto | Stato / cosa fare |
|---|---|---|
| 1 | **Collaudo Windows dell'utente** (installer, SmartScreen, UAC, firewall, ledwall, webcam, scheda grafica del PC noleggiato, schermo intero, monitor) | In corso dall'utente con la 2026-11-07.4. Lista dei punti: `docs/COLLAUDO_WINDOWS.md` (§2 installazione, §2b aggiornamento, §4–§6). Correggere ciò che segnala (registro `%LOCALAPPDATA%\NATPF\log\programma.log`). |
| 2 | **Primo aggiornamento vero dal gioco** | Si prova solo con la **prossima versione** (2026-11-07.5 o successiva): bump della versione → push → il workflow pubblica → sul PC con la 07.4 l'avviso nel menu → Aggiorna → Riavvia e aggiorna → UAC → gioco riaperto con la versione nuova e le impostazioni conservate. Le installazioni fatte con installer ≤ 07.3 non hanno l'aggiornatore: la 07.4 va installata a mano una volta. |
| 3 | **Telefoni veri** | Mai provati in questi blocchi: frecce del tutorial e «Tutto chiaro» acceso solo alla fine, schermo spento (3 s / 30 s / 6 min, Android e iPhone), conto alla rovescia nello stesso schermo, presa nel palmo, voce «smash» ascoltata. |
| 4 | **Persone vere sull'animazione** | Il moto è stato rifatto nel B13 (08/11) sulla catena fisica del braccio, con il braccio intero, busto e testa (`docs/b13/gesti-nuovi.md`); l'utente non l'ha ancora visto. Decisioni chieste: tenere la sagoma del busto; racchetta fantasma o braccio libero in servizio e schiacciata; camera alta da dietro per i colpi da fondo. Limiti noti: mano del dritto in diagonale all'impatto (limite del riconoscimento), servizio con poca pronazione, volée vicina al centro del corpo, pendolo del pallonetto poco visibile. Brief per 3 persone che non conoscono il gioco: `docs/b9/giudizio-animazione.md` §5.6.6. Le schermate `docs/b9/img/` mostrano l'animazione di prima. |
| 5 | **Webcam del P2 nella sfida, errore raro** | Circa 1 volta su 15 sotto carico, dopo «Accendi la webcam» la webcam del P2 resta spenta (`tools/e2e/natpf-1v1-webcam-p2.mjs` ora stampa `opening/err/box` per capire). Non risolto. |
| 6 | **Forza del colpo dopo molte palle corte** | **Fatto (B12, 07/11):** confermato con il telefono simulato (dopo 4 palle corte il dritto era letto piatto, forza 0,69 contro 0,51, in tutti i casi destro/mancino e calibrazione braccio/animazione); il colpo tipico ora impara solo dai colpi normali (`createTypicalModel.learn`). Test in `natpf-racchetta.test.mjs` (falliscono senza la correzione). |
| 7 | **Sicurezza degli aggiornamenti** | Il manifesto non è firmato: l'integrità dipende da HTTPS, dal token R2 (solo nei segreti di GitHub) e dallo sha256 nel manifesto. L'installer non ha la firma del codice (decisione dell'utente del 04/11: SmartScreen avvisa). Possibile passo futuro: firma Ed25519 del manifesto con chiave pubblica nel programma. |
| 8 | **Proxy aziendali** | L'aggiornatore usa http/https di Node, che non legge il proxy di sistema di Windows: dietro un proxy obbligatorio il controllo fallisce (il gioco non si blocca, mostra l'errore). |
| 9 | **r2.dev è un indirizzo «di sviluppo»** | Cloudflare lo limita (centinaia di richieste al secondo, 429 oltre): per pochi PC va bene. Per un uso più ampio collegare un dominio al bucket (`Settings → Custom Domains`) e cambiare `natpf-desktop/aggiornamenti.json` (le installazioni esistenti leggono il vecchio indirizzo finché non si aggiornano). |
| 10 | **CI** | Azioni aggiornate a Node 24 (checkout, setup-node, upload-artifact v7; B12, 07/11). `gesture-calibration` resa stabile nel B13 (08/11): la prova usava la pausa di rete come fermo immagine e il gioco scarta i gesti fatti oltre 0,8 s dopo l'ultimo fotogramma registrato (`docs/b13/gesture-calibration-ci.md`; con CPU ×4 prima 0/5, ora 12/12). Resta intermittente `timing-browser` (causa diversa: un messaggio del telefono finto oltre 3 s sul runner lento, non corretto) e `natpf-tennis/test/e2e/lan-e2e.mjs` (fuori CI) rosso negli stessi controlli già prima del B8. |
| 11 | **Sfida tra due computer** | Sospesa dall'utente per le partite vere; fatta solo la correzione minima del «pronto». TURN Worker `natpf-turn` attivo (`docs/GUIDA_TURN_CLOUDFLARE.md`). |
| 12 | **Velocità dell'animazione su PC senza GPU** | Disegno a 640×400 con rasterizzazione su CPU al limite dei 4 ms con la macchina carica. Su GPU vera non misurato. |

## 4. Cosa controllare (prove automatiche e a mano)

**Automatiche (devono essere verdi prima di ogni push e di ogni versione):**
- Unità: gioco 873, sito 195, LAN 12, programma Windows 28; `npm run build`.
- Prove nel browser `natpf-*`, con questi valori all'ultimo giro: `natpf-tutorial-phone` 37/37, `natpf-split-ready`
  34/34, `natpf-tutorial-relink` 8/8, `natpf-training-flow` 18/18, `natpf-modale-gesti` 18/18 (fps solo a macchina
  scarica), `natpf-menu` 22/22, `natpf-1v1-p2p` 37/37, `natpf-1v1-webcam-p2` 15/15, `natpf-rally` 7/7,
  `natpf-gesti-speciali` 9/9, `natpf-tabellone` 26/26, `natpf-scritte-2v2` 73/73, `natpf-aggiornamenti` 80/80,
  `natpf-phone-keep` 13/13, `natpf-phone-blackout` 6/6, `natpf-training-reconnect` 6/6, `natpf-schermo` 41/41,
  `natpf-inquadratura` 36/36, `natpf-diag-session` 24/24, `natpf-webcam-distanza` 7/7.
- Prove del sito, con `CHROMIUM_PATH` obbligatorio: `cd tools/e2e && node run-local.mjs gesture-calibration.mjs`
  (18/18), `timing-browser.mjs` (8/8).
- Programma su Linux: `cd natpf-desktop && node scripts/prepara.mjs && node scripts/prova-linux.mjs`, con lo scenario
  `aggiornamenti` su un server finto (porte 8443, 8081, 8080 libere).

**A ogni versione** (procedura completa in `docs/PIANO_LAVORI.md` §6):
1. Versione nuova `AAAA-MM-GG.n` in `site/js/tennis/version.js`, `site/tennis/build.json` e nella prima riga di
   `natpf-tennis/lan/LEGGIMI.txt`. Facoltativo: le righe in `natpf-desktop/novita.txt`, che il gioco mostra con
   l'aggiornamento. Poi test, build, commit, push.
2. GitHub Actions «NATPF eseguibili Windows»: deve chiudere con «Aggiornamento … pubblicato su Cloudflare R2». Poi
   aprire `https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev/windows/latest.json` e controllare build e sha256.
3. Zip Cloudflare:
   ```sh
   node natpf-tennis/scripts/pacchetto-cloudflare.mjs --out=<cartella> --zip=<altra>/natpf-simulator-cloudflare-<v>.zip --turn-url=https://natpf-turn.s-porcelli.workers.dev/
   ```
   Deve stare sotto 25.000.000 byte. Va provato estratto, servito con un server statico: l'unico errore atteso nella
   console è il Worker TURN vero che rifiuta l'origine locale (CORS: `ALLOWED_ORIGINS`).
4. Consegnare all'utente lo zip e il link fisso dell'installer, sempre, senza aspettare che li chieda (`CLAUDE.md`).

**A mano, dall'utente** (non simulabile qui): tutto il §3 punti 1–4.

## 5. File e luoghi utili
- Gioco: `natpf-tennis/src/` (motore `game_engine.js`, interfaccia `natpf/*.js`, CSS `natpf-ui.css`, `natpf-round.css`).
- Telefono: `site/tennis/racchetta.html`, `site/js/tennis/` (`racchetta.js`, `phone-screen.js`, `swing-detect.js`).
- Gesti: `natpf-tennis/src/natpf/natpf_gestures.js`, `natpf_phone_racket.js`, `natpf_stroke_intent.js`,
  `natpf_gesture_motion.js`, `natpf_gesture_pose.js`; telefono simulato `natpf-tennis/test/phone-sim.mjs`.
- Programma Windows: `natpf-desktop/` (`LEGGIMI.md`, `src/main.mjs`, `src/aggiornamenti.mjs`,
  `build/installatore.nsi`, `scripts/costruisci.mjs`, `scripts/manifesto.mjs`).
- Documenti per l'utente: `docs/COLLAUDO_WINDOWS.md`, `docs/GUIDA_AGGIORNAMENTI_R2.md`, `docs/GUIDA_TURN_CLOUDFLARE.md`.
- Mai segreti nei file, nei log o in chat: token R2 e TURN solo nei segreti di GitHub o nella dashboard di Cloudflare.
