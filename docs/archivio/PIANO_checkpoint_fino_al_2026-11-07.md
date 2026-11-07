# Checkpoint di docs/PIANO_LAVORI.md fino al 07/11/2026 sera (archivio, solo consultazione)

Sostituito dal Checkpoint nuovo e da `docs/PASSAGGIO_CONSEGNE.md`.

## Checkpoint (testo com'era)

- Aggiornato: 04/11/2026 sera · agente: Claude · branch `natpf-simulator`.
- **Richiesta del 04/11 completata nei blocchi B0–B6** (versione `2026-11-04.5`): B0 file di ripresa e regole, B1 prove
  nel browser e CI, B2 intro con una pallina e l'arena del gioco, B3 presa nel palmo (rollback `GRIP_STYLE =
  'martello'`), B4 modale del tutorial con «Tutto chiaro, ho capito» sul telefono, B5 tutorial e calibrazione
  indipendenti nelle due metà dello schermo, B6 valutazione Windows (poi A+ di Codex, 2026-11-04.1).
- **Richiesta del 04/11 sera** («una versione portatile e una installabile, entrambe tramite eseguibili; vai avanti su
  Windows, il resto lo provo io, segnati i punti che devo controllare») → **B7 fatto**: `natpf-desktop/` (Electron
  45.2.2) con `NATPF-Simulator-Setup-2026-11-04.5.exe` (124.880.055 B, sha256 `bdfb46b7a456e55b7d9b5e51906f59971552990fdf744f598041417c4dcd7d62`) e
  `NATPF-Simulator-Portatile-2026-11-04.5.exe` (124.872.264 B, sha256 `369702017923532838c0b9b437dfb4d2190dedfb3c5090b3640bbd2d2c5ae7cb`), consegnati all'utente.
  **Punti da controllare per l'utente: `docs/COLLAUDO_WINDOWS.md`**. Dettagli: `docs/DESKTOP_WINDOWS.md` §13,
  costruzione: `natpf-desktop/LEGGIMI.md`.
- Test: gioco 683/683, sito 182/182, LAN 10/10, programma Windows 5/5 (`cd natpf-desktop && npm test`); build ok;
  programma avviato con Electron per Linux in Xvfb (server, certificato, schermo intero, menu del gioco con WebGL).
  e2e precedenti: training-flow 15/15, blackout 6/6, training-reconnect 6/6, diag-session 24/24, menu 22/22.
- CI su `natpf-simulator`: workflow del gioco verde; prove nel browser con due rossi intermittenti su runner condivisi
  (`gesture-calibration` riga 73, `timing-browser` «P2 timing … after shared pause»): punto aperto. I test di
  `natpf-desktop` non sono ancora in CI.
- Ultimi pacchetti ZIP: **2026-11-04.5** (LAN sha256 `51c173db…e010a5c3f`, Cloudflare `52629c19…7aa1014`), riconsegnati
  invariati dopo B7 (B7 non cambia il loro contenuto).
- Crediti Higgsfield spesi per la richiesta del 04/11: **41 / 100** (saldo 667,37).
- Non verificato (serve l'utente): **tutto su Windows** (`docs/COLLAUDO_WINDOWS.md`: SmartScreen, installazione,
  firewall, ledwall, webcam, scheda grafica del PC noleggiato), telefoni veri (presa nel palmo, pulsante «ho capito»,
  due persone sullo stesso schermo), video H.264 in un browser vero.
- **Richiesta nuova (04/11 sera, dopo B7):** «Assicurati che ci sia in tutte le versioni modalità full screen senza
  cornici»; poi «la versione cloudflare deve sempre pesare leggermente meno di 25 MB» e «adatta il fullscreen in base
  alla finestra/monitor in utilizzo o prevedi la calibrazione a full screen, come avviene per i videogiochi» → **B8** (§5).
- **B8 fatto** (versione **2026-11-05.1**): schermo intero senza cornici in tutte le versioni (programma Windows,
  zip LAN con Edge, browser/Cloudflare), inquadratura adattata alla forma del monitor, calibrazione dello schermo come
  nei videogiochi (Opzioni → Schermo → «Calibra lo schermo…»), zip Cloudflare **22.517.792 B** con il limite di
  25.000.000 controllato dallo script e dalla CI. Dettagli: `docs/WORK_PROGRESS.md` B8, `docs/DESKTOP_WINDOWS.md` §14.
- Test: gioco 760/760, sito 182/182, LAN 12/12, programma Windows 13/13, build ok; nel browser natpf-schermo 41/41,
  natpf-inquadratura 36/36, natpf-menu 22/22, natpf-training-flow 15/15, gesture-calibration 18/18, arcade 9/9,
  lan-setup 3/3, lan-browser 9/9; programma con Electron per Linux 46/46. `timing-browser` intermittente come prima
  (rosso anche su `b74af13`); `lan-e2e.mjs` (fuori CI) rosso negli stessi controlli di prima di B8 (punto aperto §5).
- Consegnati: ZIP Cloudflare (sha256 `a3f2e960…cde92f6b7`) e LAN (`f4f6b195…53e81ece`), eseguibili
  Setup (`fe3de548…bd18a3e`) e Portatile (`c60008c9…7d90478e`); dimensioni e sha256 completi in
  `docs/COLLAUDO_WINDOWS.md` §0 e in `docs/WORK_PROGRESS.md` B8.
- 05/11: gli `.exe` interi non si scaricavano dal messaggio: riconsegnati a pezzi da 45 MB con `UNISCI I PEZZI.cmd`
  (`natpf-desktop/scripts/dividi.mjs`, pezzi riuniti provati: stesso sha256).
- 05/11: eseguibili anche su **GitHub** in un unico zip (workflow `natpf-windows.yml`, prima esecuzione riuscita):
  https://github.com/sergio4/foro-italico-world/actions/runs/42000334461/artifacts/13403121459 (fino al 05/12/2026;
  sha256 della build di GitHub in `SHA256SUMS.txt`: Setup `0963271d…79610070`, Portatile `69969ea8…7fff9ca263`).
- **Richiesta nuova (05/11, con schermata dello stesso schermo):** (1) modale del tutorial più piccola, centrale e
  proporzionata, frecce avanti/indietro in basso al posto delle etichette dei colpi; animazioni dei gesti rifatte da
  zero con qualità da motion designer (realismo di mano, polso e braccio, eventualmente senza il corpo), fedeli al
  riconoscimento; (2) sul telefono «Tutto chiaro, ho capito» spento finché non si sono viste tutte le finestre, mai
  sovrapposto alla schermata «Pronto»; (3) telefono che continua a funzionare se lo schermo si spegne (o la migliore
  alternativa reale, spiegando i limiti dei browser); (4) nel 1v1 «Sono pronto»/«Pronto» con stato chiaro e
  sincronizzato di ciascun giocatore; (5) verifiche reali, commit e push frequenti, documenti → blocco **B9** (§5).
- **Blocco in corso:** B9. **05/11, ripresa da un altro agente Claude:** l'analisi B9.1 del primo agente (rapporti e
  prototipo) era solo in una cartella temporanea e non è stata pubblicata: è stata **rifatta**, con i risultati salvati
  man mano nel repository in `docs/b9/` (rapporti, immagini in `docs/b9/img/`) e i prototipi di animazione in
  `natpf-tennis/prototipi/b9-*/` (non entrano nella build). Salvataggi intermedi automatici con commit «B9 analisi:
  salvataggio intermedio».
- **B9, stato al 05/11 sera:** analisi fatte e pubblicate in `docs/b9/` (modale e animazione, specifica dei gesti,
  telefono e schermo spento, «pronto» nel 1v1); prototipi di animazione `natpf-tennis/prototipi/b9-3d` (3D realistico) e
  `b9-motion` (illustrato) in completamento, poi giudizio in `docs/b9/giudizio-animazione.md`. In realizzazione (rami
  in worktree, revisione a seguire): (A) modale compatta e flusso del telefono con schermo spento, (B) «pronto» per
  giocatore. Scelte di chi coordina (dalle analisi, l'utente può cambiarle): frecce su PC e telefono, niente
  scorrimento automatico, scheda vista dopo ~1 s; Ricalibra/Ricollega/Scollega solo sotto «Pronto»; stesso schermo:
  conto alla rovescia di 3 s quando tutti e due sono pronti, poi si gioca; sfida tra due computer (sospesa): solo
  correzione minima (verde «Pronto ✓», «Annulla», conferma dall'host); schermo spento: Wake Lock affidabile, pausa e
  ripresa rapida, limiti spiegati (nessun browser dà i sensori a pagina nascosta; alternativa: app Android nativa).
- **06/11 notte, ripresa dopo il limite d'uso:** consegne complete in `docs/b9/compiti.md`. Rami in corso nei worktree
  locali `.claude/worktrees/wf_e8b0b59b-1e4-1` (A: modale e telefono, base `5461600`) e `…-1e4-2` (B: pronto, base
  `4d242f6`); copia del loro lavoro come patch in `docs/b9/wip/` (se i worktree non ci sono più: `git am` della patch
  su un ramo locale dalla sua base, poi unione). Prototipi in completamento, poi `docs/b9/giudizio-animazione.md`.
- **06/11 mattina: A e B uniti su `natpf-simulator`** (`4ed5eab`, `29c2e74`): gioco 785/785, sito 193/193, LAN 12/12,
  build ok. Conflitto in `natpf_split_ui.js` (stato della metà) risolto unendo avanzamento del tutorial e schede del
  pronto; test del conto alla rovescia reso indipendente dalla fase del controllo ogni 100 ms. Revisioni dei due rami
  e giudizio dell'animazione in corso; i bloccanti che emergono si correggono direttamente su `natpf-simulator`.
- **06/11, dopo l'unione** (`6c3a98b`): prove nel browser sul codice unito: natpf-tutorial-phone 36/36, natpf-split-ready
  24/24, natpf-training-flow 17/17, natpf-1v1-p2p 37/37, natpf-menu 22/22, natpf-phone-keep 13/13; gioco 785/785, sito
  193/193, build ok. Corretto un difetto nato dall'unione (ridisegni a ogni messaggio dei telefoni nello stesso schermo
  che ritardavano il conteggio delle schede viste).
- **06/11, giudizio dell'animazione fatto** (`6e8d39f`, `docs/b9/giudizio-animazione.md`): direzione **ibrido con base
  illustrata 2,5D** (Canvas 2D, solo avambraccio, mano e telefono; regia del servizio, fantasmi a contorno e scia presi
  dal 3D; foto vera della presa accanto). Immagini G-1…G-4 mandate all'utente con la scelta: può chiedere il 3D
  realistico, la base delle pose vale per entrambi.
- **In corso (06/11 mattina), workflow con due rami in worktree, base `6e8d39f`:** `.claude/worktrees/wf_e4f0c384-df5-1`
  (correzioni dello stesso schermo dalle revisioni: telefono che cade a tutorial aperto, telefono a pagina nascosta che
  resta «Pronto» e fa partire il conto alla rovescia, più i minori) e `…-df5-2` (base del ramo C:
  `natpf-tennis/src/natpf/natpf_gesture_pose.js`, posa pura dei 11 gesti verificata con i sensori simulati,
  `docs/b9/posa-gesti.md`). Copia come patch in `docs/b9/wip/ramo-fix-stesso-schermo.patch` e `ramo-C-posa-gesti.patch`
  (salvataggio automatico ogni 10 min; se i worktree non ci sono più: `git am` della patch su un ramo da `6e8d39f`).
- **06/11 13:00, ripresa dopo il limite d'uso:** il primo workflow si è fermato a metà. Fatto nel worktree `…-df5-1`:
  `531d4a1` (telefono che cade a tutorial aperto non lo perde più) e `3ef25ed` (telefono a schermo spento non più
  «Pronto»); nel worktree `…-df5-2` un WIP non verificato del modulo della posa (`natpf_gesture_pose.js`,
  `test/pose-sensors.mjs`). Patch aggiornate in `docs/b9/wip/` (`b8365d7`). Workflow di ripresa avviato negli stessi
  worktree (minori dello stesso schermo; posa completa con test di fedeltà), con revisione.
- **06/11 pomeriggio: rami uniti** (`fed770b` correzioni dello stesso schermo, `b86baac` posa dei gesti), revisioni
  senza bloccanti; gioco 810/810, sito 194/194, LAN 12/12, build ok, 9 prove nel browser verdi (dettaglio in
  `docs/WORK_PROGRESS.md` B9). **Versione 2026-11-06.1** (`3b59c51`): ZIP Cloudflare (sha256 `9de1f4d4…be256ee`) e LAN
  (`2a4c3218…14dd6ece`) provati estratti e consegnati; animazione dei gesti ancora la vecchia.
- **In corso:** workflow del ramo C (script `scratchpad/wf-ramo-c.js`, base `b86baac`): disegno Canvas 2D illustrato
  delle 11 schede sopra `natpf_gesture_pose.js` (stessa API di `getGestureDemo`, un'istanza per metà, compatta per gli
  esercizi, velo senza sfocatura, test `natpf-gesture-anim`, fogli dei fotogrammi guardati), in parallelo i minori dello
  stesso schermo (conto «‹ Indietro» stabile, schede allineate sul ledwall, pausa con due pause, velo del telefono); poi
  revisione tecnica e artistica e correzioni.
- **06/11 sera, ripresa dopo il limite d'uso:** minori dello stesso schermo uniti (`6920b36`: gioco 813/813, sito
  195/195, build ok). Ramo C fermato a metà nel worktree `.claude/worktrees/wf_b232ca46-ca8-1` (commit `631bd34`,
  `d8ed8cb`, `bf63224` + WIP; patch `docs/b9/wip/ramo-C-animazione.patch` da `b86baac`): workflow di ripresa avviato
  nello stesso worktree (unione di `natpf-simulator`, controlli visivi, prestazioni, nota), poi revisione tecnica e
  artistica e correzioni.
- Versione **2026-11-06.2** (`10ed703`) con i minori, pacchetti provati estratti e consegnati.
- **06/11 sera: B9 consegnato.** Ramo C unito (`f386f89`), versione **2026-11-06.3** (`d867d5e`) con l'animazione
  nuova; test gioco 820/820, sito 195/195, build ok, 6 prove nel browser verdi; ZIP provati estratti e consegnati;
  eseguibili dal workflow GitHub `natpf-windows.yml`. Le revisioni tecnica e artistica dell'animazione sono state
  fermate su richiesta dell'utente (consegna urgente).
- **Richiesta nuova (06/11 sera, dopo la 2026-11-06.3) → blocco B10:** «1. finisci i test che dovevi fare; 2. la voce
  dice "smash" ma non è realmente quel colpo; 3. la UI sotto per il punteggio dice "game" o "game secco", non si capisce
  lo score; 4. se gioco 2v2, i nomi dei colpi (es. perfetto!) ostruiscono la visuale del campo». In corso: workflow
  `natpf-b10-correzioni` (quattro rami in worktree da `3685b0f`: revisioni tecnica e artistica dell'animazione con
  correzioni, voce «smash», tabellone del punteggio, scritte dei colpi nel 2v2; un revisore per ramo, poi correzioni) e,
  sulla 2026-11-06.3, le prove nel browser non ancora rifatte (relink, phone-keep, blackout, reconnect, rally, schermo,
  inquadratura, gesti speciali, diagnostica, webcam, swing-loss, gesture-calibration, arcade, timing).
- **07/11 mattina:** rami B10 uniti e **versione 2026-11-07.1** (`c58bebe`) consegnata (dettagli in WORK_PROGRESS B10).
  In corso il workflow `natpf-b10-revisioni` (revisioni indipendenti, webcam del P2, palla corta nella salita abituale).
- **07/11 pomeriggio:** revisioni indipendenti B10 fatte e corrette, **versione 2026-11-07.2** (`94ee4b6`) consegnata.
  Resta: blocco di ~1 s nello stesso schermo con le due animazioni (workflow `natpf-b10-blocco-1s` in corso).
- **07/11: B10 completato.** **Versione 2026-11-07.3** (`0c6188b`) consegnata: tolto il blocco di ~1 s nello stesso
  schermo (era l'arena dietro il menu ridisegnata 8 volte senza GPU). Dettagli in WORK_PROGRESS B10.
- **Richiesta nuova (07/11) → blocco B11:** «La versione LAN mi pare la stessa della versione windows. Sviluppa solo
  quella windows se è la stessa. La versione windows (installer) deve essere un unico installer che poi deve potersi
  aggiornare direttamente dal gioco». Risposte dell'utente: aggiornamenti su **Cloudflare R2**; **solo installer Windows
  + zip Cloudflare** (niente più zip LAN né portatile). In corso: workflow `natpf-b11-installer-aggiornamenti` (parte A
  programma/installer/aggiornatore/pubblicazione in CI/guida R2, parte B interfaccia nel gioco; revisione di sicurezza,
  correzioni). Bucket R2 creato dall'utente il 07/11: `natpfsimulator`, indirizzo pubblico
  **https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev** (va in `natpf-desktop/aggiornamenti.json` all'unione); segreti di
  GitHub indicati all'utente: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET` (la CI deve usare
  questi nomi; i quattro segreti sono stati inseriti dall'utente il 07/11, `R2_BUCKET` = `natpfsimulator`). Poi: versione, prima pubblicazione su R2 e prova del manifesto.
  **07/11 sera:** versione 2026-11-07.4 (`d2e0d50`) con l'indirizzo in `natpf-desktop/aggiornamenti.json`; installer
  costruito dal workflow, pubblicazione su R2 **non ancora riuscita**: Account ID con 5 caratteri in più (ora ripulito
  dal workflow, `8412507`), poi «Access Denied» su ListObjectsV2 con chiavi valide (32/64): il token non ha Object Read &
  Write sul bucket `natpfsimulator` (`da73187` dà il motivo esatto). Chiesto all'utente di rifare il token e aggiornare
  `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`; poi rilanciare il workflow (rerun dell'ultima esecuzione o run_workflow su
  `natpf-windows.yml`) e controllare `…r2.dev/windows/latest.json`.
  **Risolto** (`fa190f2`): il bucket è nella giurisdizione UE; il workflow usa da solo l'endpoint `.eu.`. Pubblicata la
  2026-11-07.4 (link fisso `…r2.dev/windows/NATPF-Simulator-Setup.exe`, sha256 verificato dall'indirizzo pubblico).
- **Prossima azione esatta (B11):** collaudo dell'utente su Windows: installare a mano la 2026-11-07.4 dal link fisso;
  alla prossima versione verificare l'aggiornamento dal gioco (avviso nel menu → Aggiorna → Riavvia e aggiorna → UAC →
  gioco riaperto con la versione nuova e impostazioni conservate).
- **Prossima azione esatta (prima di B11):** collaudo dell'utente con telefoni veri, Windows e ledwall (tutorial con frecce, «Tutto
  chiaro», schermo spento, pronto nello stesso schermo, animazione nuova, voce «smash», tabellone, scritte nel 2v2);
  correggere ciò che segnala. Aperto: errore raro della webcam del P2 sotto carico (`tools/e2e/natpf-1v1-webcam-p2.mjs`).
- **Prossima azione esatta (B10, superata):** unire la correzione del blocco, natpf-modale-gesti verde 3 volte, versione
  2026-11-07.3, pacchetti; poi collaudo dell'utente con telefoni veri.
- **Prossima azione esatta (B10, aggiornata, superata):** a workflow finito unire le correzioni, test, prove nel browser (anche
  natpf-1v1-webcam-p2 e natpf-modale-gesti a macchina scarica), push, versione 2026-11-07.2, pacchetti, riepilogo.
- **Prossima azione esatta (B10, prima):** a workflow finito unire i quattro rami, test, prove nel browser, push, versione
  2026-11-06.4, pacchetti ed eseguibili, riepilogo all'utente.
- **Prossima azione esatta (prima di B10):** collaudo dell'utente con telefoni veri (tutorial con le frecce, «Tutto chiaro» acceso solo
  alla fine, schermo spento e ripresa, stesso schermo con il conto, animazione nuova); se c'è tempo, rifare la revisione
  tecnica e artistica dell'animazione (script `scratchpad/wf-ramo-c-ripresa.js`, parte «Revisione»: brief in
  `docs/b9/giudizio-animazione.md` §5.6) e le persone vere del §5.6.6.
- **Prossima azione esatta (precedente):** finiti rami e giudizio → correggere i bloccanti delle revisioni, unire A e B su
  `natpf-simulator`, test e prove nel browser, push; poi ramo C (animazione nuova secondo il giudizio), versione nuova,
  pacchetti ed eseguibili.
- **Prossima azione esatta (precedente, B9.1 fatto):** B9.1 — analisi in parallelo (modale e animazione attuali con le specifiche dei gesti
  riconosciuti; pagina del telefono, flusso del tutorial e schermo spento; «Sono pronto» del 1v1 in
  `natpf_versus_ui.js`; prototipi di animazione da confrontare), poi rami separati per modale, animazione, telefono e
  1v1, ciascuno rivisto e corretto, poi unione, prove, versione nuova, pacchetti ed eseguibili.
- **Prossima azione esatta:** aspettare il collaudo dell'utente su Windows, Edge e ledwall (`docs/COLLAUDO_WINDOWS.md`,
  punti B7 e B8: §1–§6, §4b calibrazione, §5b zip LAN e browser) e correggere quello che segnala (registro
  `%LOCALAPPDATA%\NATPF\log\programma.log`). Per rifare i pacchetti dopo un cambiamento: §6 (Cloudflare con `--zip`,
  eseguibili con `npm run costruisci`).
---

