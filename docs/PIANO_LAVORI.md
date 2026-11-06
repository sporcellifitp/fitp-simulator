# PIANO_LAVORI · stato, punti aperti e piano condiviso (leggere per primo, a ogni apertura)

Questo è **il** file di ripresa per qualunque agente (Claude, Codex, altri) e per l'utente. Contiene: il checkpoint
(ultimo stato verificato e prossima azione esatta), le regole di lavoro decise dall'utente, le sue decisioni, e per
ogni punto aperto **stato, cosa fare, come e perché**. È pensato per riprendere dopo un'interruzione (limite d'uso,
sessione chiusa) senza ricostruire il contesto.

Come si aggiorna:
- Il **Checkpoint** si riscrive (non si accoda) a ogni passo finito: commit, test, prossima azione esatta.
- Lo stato dei blocchi si aggiorna nel **Registro dei blocchi**; il dettaglio dei passi (file, misure, verifiche) va
  in `docs/WORK_PROGRESS.md`; le decisioni tecniche durature in `docs/PROJECT_MEMORY.md`.
- Se il repository e questo file divergono, vale il repository: si corregge il file.
- Storico fino al 04/11/2026: `docs/archivio/SESSION_HANDOFF_fino_al_2026-11-04.md` e
  `docs/archivio/WORK_PROGRESS_fino_al_2026-11-04.md` (solo consultazione).

---

## 1. Checkpoint (riscritto a ogni passo)

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
- **Prossima azione esatta:** collaudo dell'utente con telefoni veri (tutorial con le frecce, «Tutto chiaro» acceso solo
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

## 2. Regole di lavoro decise dall'utente (04/11/2026, valgono per tutti gli agenti)

1. **Push**: dopo ogni commit verificato, subito, su `origin natpf-simulator`. Verificato = test del gioco e del sito
   verdi, più `npm run build` se il passo tocca build, asset, vite o `site/`. Solo avanzamento lineare: prima
   `git fetch origin natpf-simulator`; se il remoto è avanti, si integra (rebase dei soli commit non pubblicati o
   merge) e si rifanno i test. Mai `--force`, mai altri branch. Niente push con test rossi (eccezione: un WIP
   dichiarato, solo se l'utente lo autorizza caso per caso).
2. **Pacchetti ZIP (LAN Windows e Cloudflare)**: l'utente li vuole **sempre dopo ogni commit, senza doverli
   chiedere**. Se il commit cambia il contenuto dei pacchetti (codice, asset, pagina del telefono, server LAN) si
   rifanno con una versione nuova, si provano estratti e si consegnano. Se il commit non li cambia (solo documenti o
   prove), si riconsegnano gli ultimi ZIP (stessa versione e sha256) dicendolo. Ogni pacchetto nuovo alza la
   versione in `site/js/tennis/version.js` **e** `site/tennis/build.json` (formato `AAAA-MM-GG.n`). Procedura in §6.
3. **Un agente alla volta** sul branch: Codex lavora ancora al progetto ma non in parallelo. Chi inizia fa fetch e
   controlla che non ci siano commit nuovi di altri; chi finisce lascia il Checkpoint aggiornato.
4. **Blocchi autonomi**: ogni blocco ha passi piccoli; ogni passo lascia il repository funzionante (test verdi),
   committato, pubblicato e scritto qui. Prima di un'operazione ampia, commit di checkpoint.
5. **Higgsfield**: budget massimo complessivo **100 crediti** per la richiesta del 04/11 (intro e, se serve, la foto
   della presa). Prima di ogni generazione si controlla il costo; ogni spesa si annota nel Checkpoint.
6. **Non fingere**: ciò che non si può provare qui (telefoni veri, Windows, ledwall, persone) si scrive come «non
   verificato».

---

## 3. Richiesta del 04/11/2026 e risposte dell'utente

Richiesta (5 punti): (1) intro Higgsfield: una pallina sola e il campo del gioco; (2) impugnatura del telefono dalla
foto di riferimento; (3) tutorial come modale prima della calibrazione con «Tutto chiaro, ho capito», anche nel 1v1
sullo stesso schermo, indipendente per ciascun giocatore; (4) valutazione di una versione Windows installabile e audit
dell'architettura, **senza implementarla**; (5) continuità del lavoro con commit e push incrementali.

Risposte alle domande del piano (04/11):
1. Presa: il «martello» da sostituire è la **foto**; l'impugnatura riconosciuta oggi va bene. La presa della foto di
   riferimento sostituisce il martello (foto, figura, animazione 3D, testi), **con un rollback pronto** se l'utente lo
   chiede.
2. Immagine della presa: **la foto allegata dall'utente il 04/11** (telefono nel palmo, schermo verso chi gioca con
   «Pronto» di NATPF, dita attorno alla parte bassa, pollice sul bordo in alto, cima inclinata in avanti verso lo
   schermo). Originale: `docs/riferimenti/presa-palmo-utente-2026-11-04.webp` (fuori da `public/`, quindi non finisce
   nei pacchetti; da ritagliare e pulire: sullo sfondo ci sono un monitor e l'ufficio). La 6.png del 04/11 resta solo
   come riferimento della geometria: non entra nel repository (cornice di screenshot, app di un altro prodotto,
   persone sullo sfondo).
3. Intro: **una sola pallina**.
4. Se i due tentativi Higgsfield falliscono: **avvisare l'utente** e decidere insieme (nessun ripiego automatico).
5. «Tutto chiaro, ho capito»: **sul telefono di ciascun giocatore**.
6. Modale: in tutti i percorsi con il telefono, una volta per sessione e per giocatore, «Rivedi i gesti» sempre
   disponibile; per la webcam una versione breve senza il 3D del telefono.
7. Riquadro «Guarda e ripeti» in alto a destra: **tolto in calibrazione**, **resta negli esercizi dell'Allenamento**.
8. 1v1 sullo stesso schermo: tutorial e calibrazione nelle due metà della pagina «Collega i due telefoni», senza campo.
9. Regole di lavoro: sì (§2). Codex lavora ancora ma non in parallelo. ZIP sempre dopo ogni commit, senza richiesta.
   Controlli automatici di GitHub anche su questo branch: sì (in B1, dopo aver sistemato le prove nel browser).
10. Contesto Windows: telefoni **dello staff**; allo stand **rete dedicata**; ledwall come **monitor esteso**;
    **Windows 10**; GPU non nota in anticipo (PC noleggiato, probabilmente integrata); **nessun certificato di firma
    del codice**; **niente 1v1 tra due PC** né multiplayer: un solo PC con stesso schermo, allenamento, minigiochi
    (engagement), al massimo 1v1 contro la CPU.

---

## 4. Registro dei blocchi

Legenda: [ ] da fare · [~] in corso · [x] fatto, verificato e pubblicato.

| Blocco | Stato | Contenuto | Commit | Pacchetti |
|---|---|---|---|---|
| B0 Continuità | [x] | questo file, istruzioni (CLAUDE.md, AGENTS.md), archivio dei documenti lunghi | — | invariati |
| B1 Prove nel browser e CI | [x] | telefono simulato aggiornato, script e2e verdi, CI sul branch | — | — |
| B2 Intro | [x] | video con una pallina e il campo del gioco (Higgsfield, ≤100 crediti) | vedi WORK_PROGRESS B2 | 2026-11-04.2 |
| B3 Presa | [x] | foto, figura, 3D e testi della presa nuova; piatto tollerante con test; tocchi; rollback | vedi WORK_PROGRESS B3 | 2026-11-04.3 |
| B4 Modale tutorial | [x] | modale prima della calibrazione, «Tutto chiaro, ho capito» sul telefono | vedi WORK_PROGRESS B4 | 2026-11-04.4 |
| B5 Stesso schermo | [x] | modale e calibrazione indipendenti nelle due metà di «Collega» | vedi WORK_PROGRESS B5 | 2026-11-04.5 |
| B6 Windows | [~] | A+ portatile implementato; collaudo Windows reale e F0/F1 da completare | commit di questo checkpoint | 2026-11-04.1 |
| B7 Eseguibili Windows | [x] | `natpf-desktop/`: Electron, portatile (un .exe) e installabile (setup .exe), firewall e certificati; collaudo Windows dell'utente in `docs/COLLAUDO_WINDOWS.md` | vedi WORK_PROGRESS B7 | 2026-11-04.5 |
| B8 Schermo intero e monitor | [x] | schermo intero senza cornici in tutte le versioni, adattamento al monitor e calibrazione, Cloudflare < 25 MB; collaudo Windows dell'utente in `docs/COLLAUDO_WINDOWS.md` | vedi WORK_PROGRESS B8 | 2026-11-05.1 |
| B9 Tutorial, telefono, 1v1 | [~] | modale compatta con frecce, animazioni nuove dei gesti, «Tutto chiaro» dopo l'ultima finestra, schermo del telefono spento, «Pronto» nel 1v1 | — | — |

Ordine: B0 → B1 → B2 → B3 → B4 → B5 → B6. B2 e B6 non dipendono dagli altri e possono essere anticipati se un blocco
resta in attesa di una decisione. B4 dipende da B3 (il contenuto della modale mostra la presa nuova).

---

## 5. Punti aperti: stato, cosa fare, come, perché

### B0 · Continuità del lavoro
- **Stato**: `docs/SESSION_HANDOFF.md` (343 righe) e `docs/WORK_PROGRESS.md` (1.128 righe) erano diari lunghi con
  molte «Prossima azione» vecchie; CLAUDE.md vietava ancora il push senza autorizzazione (regola del 28/10); Codex
  legge `AGENTS.md`, che non esisteva.
- **Cosa**: questo file come ingresso unico; i due diari in `docs/archivio/`; `docs/SESSION_HANDOFF.md` ridotto a un
  rimando; `docs/WORK_PROGRESS.md` nuovo, a blocchi; CLAUDE.md con le regole del §2; `AGENTS.md` che rimanda a
  CLAUDE.md e a questo file.
- **Perché**: l'utente vuole riprendere da qualunque interruzione senza ricostruire il contesto, con lo stesso punto
  di partenza per tutti gli agenti.
- **Fine**: file presenti, test invariati (solo documenti), commit e push fatti.

### B1 · Prove nel browser (e2e) e controlli automatici di GitHub
- **Stato**: KO già presenti dalla build .17: `natpf-phone-keep`, `natpf-phone-blackout` (4/6), `natpf-training-flow`
  (6/13), `natpf-rally` (4/7), `natpf-menu` (19/22), `lan-browser` (7/8). Causa comune: il telefono simulato degli
  script non completa più la calibrazione dopo i cambi di presa e calibrazione del 29/10 (oggi calibrazione rapida:
  fermo, dritto, rovescio, `racchetta.js:62` `quick:true`); `natpf-menu` controlla un centro della pagina vecchio.
  Cause trovate il 04/11: (a) gli script che passano da «Allenamento» non chiudevano la **lezione iniziale**, e durante
  la lezione il computer ignora la calibrazione che il telefono fa comunque da solo (`natpf_training._onCal`); (b) gli
  script con tempi fissi facevano il primo gesto dopo 0,5 s, ma dal 29/10 il telefono vuole 0,6 s di quiete
  (`CAL.firstSettle`) e 1,5 s di preparazione (`CAL.lead`); (c) il menu è a due colonne dal 31/10.
  CI: ci sono **due** workflow e nessuno parte su `natpf-simulator`. `.github/workflows/natpf-simulator-tests.yml`
  (Node 20) fa solo i test del sito, alcuni e2e del sito (compreso `lan-browser`) e il pacchetto con
  `tools/package-natpf.py`, che impacchetta solo `site/`; `.github/workflows/natpf-tennis.yml` (Node 22) fa `npm test` e
  `npm run build` del gioco, ma solo su `feature/natpf-tennis-mvp`. Nessuno script `natpf-*` è nella CI.
- **Cosa**: script e2e allineati al gioco attuale; poi CI su `natpf-simulator` che provi davvero gioco, build e sito.
- **Come**: (1) un aiuto comune `quickCalibrate` in `tools/e2e/th.mjs` che fa i gesti quando il telefono è pronto,
  come una persona, e la lezione scorsa con «Avanti» negli script che passano da «Allenamento»; cambiare solo gli script
  di prova, non il gioco (un difetto vero del gioco si annota qui e si decide); (2) aggiungere `natpf-simulator` ai push
  di **entrambi** i workflow, portare `natpf-simulator-tests.yml` a Node 22, aggiungere al matrix almeno
  `natpf-training-flow`; prima di attivare il trigger, provare in locale gli script già nel matrix e
  `tools/package-natpf.py`.
- **Perché**: senza prove nel browser verdi la modale (B4) e lo stesso schermo (B5) non si possono verificare
  end-to-end, e con i push frequenti serve una seconda rete di sicurezza remota.
- **Fine**: gli script elencati verdi (o KO residui spiegati, con causa fuori dal gioco), CI verde sul branch.

### B2 · Intro (Higgsfield)
- **Stato**: `natpf-tennis/public/media/intro.mp4` (1280×720, 8,04 s, 193 fotogrammi; job Higgsfield `32ab262f`) e
  il fotogramma finale `intro-fine.webp`. Difetti verificati sui fotogrammi: **due palline insieme tra ~4,3 e ~5,1 s**;
  fuori campo rosa/magenta e **due reti** nella vista aerea finale; nessuna somiglianza con l'arena del gioco (campo
  blu `0x294a94`, fuori campo azzurro `0x2a80d2`, `site/js/tennis/arena.js`). In più il CSS fa entrare la pallina del
  titolo a 5,6 s e il titolo a 5,7 s (`natpf-ui.css:395-399`, `INTRO_MS.full` 7800 in `natpf_intro.js:11`): una
  pallina del video ancora in scena dopo ~5,4 s sembrerebbe una seconda pallina.
- **Cosa**: un video nuovo con **una sola pallina** (un rimbalzo, fuori scena entro ~5 s) e il campo dell'arena del
  gioco; stessa durata e stessa sequenza del titolo.
- **Come**:
  1. Catturare dal motore del gioco il fotogramma iniziale e quello finale (camera a ≤ 16 m: sopra ~20 m il motore
     vede nero), senza scritte né marchi (regola di `public/media/LEGGIMI.txt` e `PROJECT_MEMORY.md`).
  2. Generazione video da immagini con fotogramma iniziale e finale; prima il **controllo del costo** (non spende).
  3. **Massimo 2 tentativi** (stima ~40 crediti ciascuno, ≤ 100 in tutto). Prompt: una sola pallina, un solo
     rimbalzo, rete unica, colori del campo come nei fotogrammi.
  4. Verifica fotogramma per fotogramma con ffmpeg: ≤ 1 pallina in ogni fotogramma (script
     `conta-palline.py` dell'analisi, da portare in `natpf-tennis/scripts/audit/`), una sola rete, colori vicini a
     quelli del gioco, niente scritte. Poi `intro-fine.webp` dall'ultimo fotogramma e prova nella pagina.
  5. Se tutti e due i tentativi falliscono: **fermarsi e avvisare l'utente** (decisione 4), senza altri tentativi.
- **Perché**: due palline in scena non rispettano la dinamica del tennis; il campo deve essere quello del simulatore.
- **Fine**: video sostituito, verifiche superate, crediti annotati, pacchetti consegnati.

### B3 · Presa (foto dell'utente al posto del martello), con rollback
- **Stato**: oggi la presa mostrata è il **martello**: foto `presa-martello.webp` (`natpf_media.js:10`,
  `index.html:398`), testo `GRIP_TEXT` (`site/js/tennis/grip-art.js:42`), 3D `q0` (`natpf_gesture_demo.js:196`,
  `GRIP_TILT` 80° in `natpf_gesture_motion.js:16`), testi della calibrazione (`natpf_cal_view.js:45`), guida
  (`natpf_onboarding.js:20`), `PROJECT_MEMORY.md` §Gesti; altri testi «martello»: `index.html:397` (Collega) e
  `index.html:439` (`.split-grip`, stesso schermo), `natpf_training.js:46` (passo «presa» della lezione),
  `natpf_gesture_motion.js:36` e `:38`, `grip-art.js:35` (aria-label). Elenco completo: `git grep -in martello`. La presa della foto dell'utente (uguale alla 6.png di
  riferimento) è quella che la guida del 28/10 mostrava come «Così no» (`presa-sbagliata.webp`).
  Simulazione sul riconoscitore vero (analisi del 04/11, `sim-presa.mjs`): presa nuova **516/540**, calibrazione e
  servizio sempre giusti, **tutti i 24 errori sono piatti letti come top spin** (soglie `flatRise .12`,
  `flatPower .62` in `natpf_stroke_intent.js:38-39`); martello 60/60. L'utente dice che con la presa reale il
  riconoscimento va già bene: la simulazione non sostituisce un telefono vero.
  Rischio tocchi: con lo schermo verso chi gioca le dita sono vicine al display, e ogni tocco può rivotare il segno
  dei sensori e far ripartire la calibrazione (`racchetta.js:478-484`).
- **Cosa**: foto, figura SVG, animazione 3D, testi (gioco, telefono, guida, calibrazione) con la presa nuova;
  piatto riconosciuto anche con la presa nuova; tocchi involontari che non rompono la calibrazione; rollback.
- **Come**:
  1. Definire la presa in numeri in un solo modulo (profilo `palmo`: cima ~35–40° verso l'interno e ~40° in avanti,
     schermo verso chi gioca; destro e mancino) accanto al profilo `martello`, con un'unica costante che sceglie
     quale mostrare (**rollback = cambiare la costante**; asset del martello conservati).
  2. Test nel `natpf-gesture-demo`: tutti i gesti mostrati nel tutorial riconosciuti con la presa nuova (destro e
     mancino, intervallo di angoli) **e** ancora con il martello.
  3. Piatto più tollerante con la pronazione naturale della presa nuova, con test e senza peggiorare gli altri colpi
     (banchi esistenti invariati).
  4. Foto dalla foto dell'utente: ritaglio su mano e telefono, sfondo pulito (in locale; Higgsfield solo se serve,
     pochi crediti dai 100), webp leggero; niente monitor né ufficio.
  5. Figura SVG, `GRIP_TEXT`, 3D `q0`, testi di calibrazione e guida coerenti con la foto.
  6. Tocchi: durante calibrazione e gioco un tocco sullo schermo non riavvia la calibrazione (il voto del segno si fa
     solo nei momenti e nelle zone previsti), con test del sito.
  7. `PROJECT_MEMORY.md` §Gesti aggiornato con la presa nuova e la procedura di rollback.
- **Perché**: la foto del martello è innaturale (richiesta del 04/11); le dimostrazioni del tutorial devono
  corrispondere agli algoritmi reali (CLAUDE.md).
- **Fine**: test verdi (gioco, sito, gesture-demo con le due prese), screenshot di guida, calibrazione e «Collega»,
  pacchetti consegnati. Non verificabile qui: telefono vero con la presa nuova.

### B4 · Modale del tutorial prima della calibrazione (gioco singolo)
- **Stato**: il riquadro «Guarda e ripeti» in alto a destra (`.coach-demo`, 232 px fissi, `natpf-ui.css:172-180`;
  `natpf_training.js:581-617`) è l'unica dimostrazione in calibrazione ed è piccolo. La lezione introduttiva esiste
  solo in «Allenamento» dal menu (`natpf_lobby.js:465-469`, `natpf_training.js:189`): mancano riscaldamento prima
  della partita, sfide e Player 2 invitato. Il telefono avvia la calibrazione da solo appena si attivano i sensori
  (`racchetta.js:306`). Testi incoerenti: il telefono dice «Guarda il computer e conferma» (`racchetta.js:120`) ma il
  computer conferma da solo (`natpf_training.js:273`); la guida dice «Nel riscaldamento il gioco impara il tuo
  pallonetto e la tua palla corta» (`natpf_onboarding.js:43`), ma lo fanno solo gli esercizi «Pallonetto» e «Palla
  corta» dell'Allenamento (`learnSpecial`): il riscaldamento prima della partita ha solo dritto, rovescio e servizio
  (`WARMUP_IDS`). Correzione: «Nell'Allenamento…».
- **Cosa**: una modale grande, prima della calibrazione, con illustrazioni e animazioni chiare di tutti i gesti
  (presa, posizione ferma, dritto, rovescio, servizio, colpi con effetto); pulsante **«Tutto chiaro, ho capito» sul
  telefono** che avvia la calibrazione; durante la calibrazione restano le istruzioni in basso a sinistra e il
  riquadro in alto a destra **non** c'è; negli esercizi dell'Allenamento il riquadro resta. Modale in tutti i percorsi
  con il telefono, una volta per sessione e per giocatore, «Rivedi i gesti» sempre disponibile; per la webcam una
  versione breve senza il 3D del telefono. Testi incoerenti corretti.
- **Come**:
  1. Protocollo: il computer manda al telefono «aspetta il tutorial» (campo nella configurazione); il telefono, dopo
     «Attiva i sensori», **non** avvia `cal.start` ma mostra il pulsante in alto, lontano dalle dita; al tocco manda
     un messaggio al computer, che chiude la modale e avvia la calibrazione. La calibrazione oggi parte da più punti e
     tutti devono rispettare l'attesa: `racchetta.js:306` (attivazione dei sensori), `command('cal')` sul telefono
     (`racchetta.js:374`) mandato da `recalibrate()` del computer (`natpf_phone_racket.js:560`, chiamato da
     `natpf_training.js:223` in `_begin` e da `natpf_split_ui.js:150` in `_drive`), il cambio di presa
     (`racchetta.js:369`) e il voto del segno a un tocco (`racchetta.js:480-484`). Compatibilità: un telefono con una
     pagina vecchia (senza il messaggio) fa partire la calibrazione come oggi e il computer chiude la modale da solo.
  2. Modale in `cqw/cqh` con `@container natpf` (CLAUDE.md), schede per gesto con l'animazione 3D esistente
     ingrandita (stesso contesto WebGL di `getGestureDemo`), foto della presa nuova, ripiego statico senza WebGL.
  3. Test: protocollo (telefono in attesa, messaggio, compatibilità), stato della modale, niente riquadro in
     calibrazione, riquadro negli esercizi; prova nel browser con `natpf-training-flow` (B1) e screenshot.
- **Perché**: chi gioca per la prima volta deve capire da solo presa, colpi e calibrazione; il riquadro attuale è
  troppo piccolo.
- **Fine**: test e prove nel browser verdi, screenshot a 1920×1080 e in un'area di ledwall, pacchetti consegnati.

### B5 · Stesso schermo (1v1): tutorial e calibrazione indipendenti per giocatore
- **Stato**: nella pagina «Collega i due telefoni» ogni metà mostra solo titolo e sottotitolo della calibrazione
  (`natpf_split_ui.js:35-45`); il computer conferma da solo e dopo 3 verifiche fallite fa giocare senza calibrazione
  (`natpf_split_ui.js:136-152`). Il testo della presa comune alle due metà è ancora sul martello (`index.html:439`,
  `.split-grip`, da cambiare in B3).
- **Cosa**: in ciascuna metà la propria modale e poi la propria calibrazione con le istruzioni; l'«ho capito» del P1
  non tocca il P2 e viceversa; webcam per due con la versione breve.
- **Come**: due istanze del componente della modale (stato per giocatore, legate al rispettivo telefono), layout per
  metà in `cqw`; un solo contesto WebGL che disegna l'animazione nelle due metà (o una animazione alla volta con il
  ripiego statico nell'altra, se le misure lo chiedono); test con due telefoni simulati.
- **Perché**: due persone alla prima esperienza devono poter impugnare, capire i colpi e calibrare da sole, insieme.
- **Fine**: test, prova nel browser con due telefoni simulati, screenshot, pacchetti consegnati.

### B6 · Versione Windows e architettura (sviluppo A+ autorizzato dopo la valutazione)
- **Stato**: A+ portatile implementato in 2026-11-04.1; collaudo Windows reale da fare. Analisi iniziale del 04/11: il guscio (Electron, Tauri, browser) usa lo stesso Chromium,
  quindi non cambia le prestazioni del 3D. Margini veri: livelli di qualità grafica (oggi sempre al massimo: ~1,5
  milioni di triangoli di pubblico, 417 draw call, MSAA 4×, DPR fino a 2, ombre 2048), riconoscimento della webcam
  fuori dal thread del disegno, ritardo dello schermo compensato solo con un valore manuale 0–200 ms nella diagnostica
  (`natpf.displayLagMs`, 0 finché non si misura), robustezza su Windows (firewall, certificati in una cartella stabile,
  indirizzo fisso, chiosco sul monitor esteso). Comunicazioni: `POST /api/racket/feedback` a ogni colpo, che nessuno
  legge (eliminabile); lettura dello stato ogni 0,5 s senza stanza 1v1 (`PHONE_POLL.idleMs`, scelta del 31/10 per
  tenere il P1 online nel relay, test `natpf-lan-letture.test.mjs`): da togliere solo dopo aver verificato che nessuno
  usa la presenza del P1 o i colpi del relay senza stanza.
- **Cosa**: `docs/DESKTOP_WINDOWS.md` con confronto (browser/Edge app e chiosco, Electron, Tauri, NW.js,
  Neutralino, PWA), architettura consigliata, benefici attesi, piano di migrazione a fasi e compatibilità con la
  versione browser.
- **Come**: partire dalle risposte del §3 punto 10: Windows 10, GPU ignota (qualità grafica automatica in cima alle
  priorità), nessuna firma del codice (un installer non firmato mostra SmartScreen: favorisce il pacchetto portatile
  con `node.exe` ufficiale firmato e Edge in modalità app/chiosco sul monitor esteso; Electron solo come fase
  facoltativa), telefoni dello staff (certificato installato una volta), nessun 1v1 tra due PC (la fase dei trasporti
  tra PC esce dal piano).
- **Perché**: il prodotto gira soprattutto su un PC Windows noleggiato con telefoni in LAN: servono stabilità e
  avvio semplice più di un nuovo guscio.
- **Fine**: valutazione pubblicata e primo blocco A+ sviluppato su autorizzazione successiva. Prima di dichiarare
  F2 conclusa serve il collaudo Windows. F0 misure e restante F1 ancora aperti; Electron e worker non implementati.

### B7 · Eseguibili Windows: portatile e installabile (richiesta del 04/11 sera)
- **Stato**: fatto e consegnato (2026-11-04.5); **collaudo su Windows dell'utente da fare** con
  `docs/COLLAUDO_WINDOWS.md`.
- **Cosa**: `NATPF-Simulator-Portatile-<versione>.exe` (un solo file, nessuna installazione, estrae al primo avvio in
  `%LOCALAPPDATA%\NATPF\portatile\<versione>`) e `NATPF-Simulator-Setup-<versione>.exe` (Programmi, collegamenti,
  regola del firewall, disinstallazione), con lo stesso gioco della versione browser.
- **Come**: Electron 45.2.2 in `natpf-desktop/`. Il processo principale avvia nello stesso processo il server LAN di
  A+ (certificati in `%LOCALAPPDATA%\NATPF`, HTTPS 8443, pagina del certificato 8081), si fida del proprio
  certificato solo per i propri indirizzi, apre il gioco a schermo intero sul monitor più grande non principale (il
  ledwall), schermo sempre acceso, webcam consentita, WebGL in software se la scheda è bloccata, menu (Alt) con
  monitor, rete e scheda grafica. Costruzione da Linux senza wine: electron-builder per `win-unpacked`, script NSIS
  propri (`build/installatore.nsi`, `build/portatile.nsi`) con il makensis della cache di electron-builder.
- **Perché**: l'utente vuole eseguibili veri, uno da copiare e uno da installare, sul PC noleggiato con Windows 10.
- **Fine**: raggiunta per la parte verificabile qui (costruzione, contenuto, prove del processo principale, avvio con
  Electron per Linux). Resta il collaudo su Windows; se segnala problemi si correggono qui con un blocco nuovo.

### B8 · Schermo intero senza cornici, adattamento al monitor, Cloudflare sotto 25 MB (04/11 sera)
- **Stato**: fatto (2026-11-05.1); collaudo su Windows, Edge e ledwall dell'utente da fare.
- **Cosa**: (1) in ogni versione (programma Windows installato e portatile, zip LAN con Edge, browser/Cloudflare)
  una modalità a schermo intero senza cornici: niente bordi, barra del titolo, barre del browser o menu; (2) il gioco
  si adatta alla finestra e al monitor in uso (proporzioni qualsiasi: campo sempre visibile, interfaccia e
  risoluzione) e ha una **calibrazione dello schermo** come nei videogiochi (bordi/area visibile, formato, prova del
  cerchio); (3) zip Cloudflare **sempre sotto 25 MB** (oggi 26,9 MB), con un controllo automatico.
- **Come**: zip LAN con Edge a schermo intero per impostazione (`--start-fullscreen`); Electron con la finestra creata
  già a schermo intero, senza menu che compare con Alt; nel browser schermo intero al primo tasto o clic della
  schermata iniziale, pulsante visibile, Esc che resta «indietro» (Keyboard Lock dove c'è); campo visivo orizzontale
  minimo della camera per monitor non 16:9; pagina «Calibra lo schermo» in Opzioni → Schermo; via i `.wasm` non SIMD
  di MediaPipe (Edge, Chrome ed Electron usano quelli SIMD) e controllo del peso nello script del pacchetto.
- **Perché**: agli eventi il gioco va su ledwall e monitor noleggiati con proporzioni e bordi diversi; la versione
  Cloudflare deve stare sotto il limite di 25 MB indicato dall'utente.
- **Fine**: prove automatiche (unità, browser a più proporzioni, Electron per Linux), zip Cloudflare < 25.000.000 byte,
  pacchetti ed eseguibili nuovi consegnati, punti nuovi in `docs/COLLAUDO_WINDOWS.md`.

### B9 · Modale e animazioni del tutorial, telefono, schermo spento, «Pronto» nel 1v1 (richiesta del 05/11)
- **Stato**: in corso.
- **Cosa**: vedi Checkpoint (5 punti dell'utente).
- **Come**: analisi delle cause prima di cambiare; modale compatta al centro (nello stesso schermo al centro della
  propria metà) con frecce ‹ › e avanzamento anche dal telefono; animazione nuova (direzione artistica scelta
  confrontando prototipi) costruita sui gesti realmente riconosciuti (`docs/PROJECT_MEMORY.md` §Gesti); stato del
  tutorial sincronizzato con il telefono (pulsante acceso solo dopo l'ultima finestra); telefono con Wake Lock,
  ripresa automatica e avviso sul PC quando lo schermo del telefono si spegne; stato «pronto» per giocatore nel 1v1.
- **Perché**: richiesta dell'utente con priorità alla qualità visiva e all'affidabilità.
- **Fine**: prove automatiche e nel browser (PC, telefono simulato, schermi grandi), schermate controllate, documenti,
  pacchetti ed eseguibili nuovi.

### Punti aperti precedenti (non della richiesta del 04/11; restano validi)
- **`natpf-tennis/test/e2e/lan-e2e.mjs` (non in CI) con controlli rossi da prima di B8** (verificato il 05/11 anche su
  `b74af13`): in partita il computer non riceve campioni continui dal telefono simulato («campioni in 0,7 s: 0»),
  racchetta che non segue il polso, gesto → colpo assente; con la webcam finta la racchetta non segue la mano (in
  WebGL software il gioco va a 1 fotogramma al secondo). Cosa: capire se è la prova (flusso dei sensori cambiato dopo
  la calibrazione rapida) o il gioco; `lan-browser.mjs` in CI dice che il flusso vero del telefono funziona. Come:
  `NO_PROXY="$NO_PROXY,<IP del PC>"` in questo ambiente, poi confrontare con `tools/e2e/lan-browser.mjs`. Perché: una
  prova rossa nasconde regressioni vere.
- **Prove dal vivo** (non verificabili qui). Cosa: iPhone (calibrazione e lati dei colpi), webcam a 1–4 m e per due
  con due persone, ledwall reale e fullscreen, nomi nel 1v1, pacchetto LAN su Windows 10, telefoni dello staff sulla
  rete dello stand. Come: l'utente prova con la diagnostica accesa e manda lo zip della diagnostica. Perché: i
  simulatori non sostituiscono telefoni, webcam e schermi veri.
- **C13 · anticipo sistematico dei colpi** (diagnostiche 20261030-142317 e -142438, archivio WORK_PROGRESS, sezione
  «Richiesta del 30/10 sera»). Il dettaglio della misura non è nel repository (era in un file temporaneo). Cosa:
  rimisurare l'anticipo medio su quelle diagnostiche o su una nuova. Come: script di analisi in
  `natpf-tennis/scripts/diag/`. Perché: decisione rinviata dall'utente il 31/10, va proposta con i numeri.
- **Sfida tra due computer** (P2 su un altro PC, compensazione della latenza, TURN): **sospesa** — l'utente il 04/11
  ha detto che agli eventi non serve. Cosa: niente; non si toglie e non si sviluppa oltre.
- **«Personaggio dell'iPhone che si muoveva sempre»** (29/10): non riprodotto; nel video si vede solo il dondolio
  d'attesa di P1 e P2. Cosa: prima chiedere all'utente che cosa si muoveva (personaggio, racchetta o schermata del
  telefono), poi una diagnostica con l'iPhone. Perché: senza sapere cosa guardare non si può riprodurre.
- **Pacchetto LAN di Codex del 04/11**: conteneva un file duplicato di Node, non identificato (`lan/pacchetto.mjs:34-39`
  cancella già `.node-tmp`). Cosa: al prossimo pacchetto controllare con `unzip -l` che `node.exe` ci sia una sola
  volta (in `node/`) e che non ci siano cartelle temporanee.

---

## 6. Procedure

**Ripresa**: `git fetch origin natpf-simulator` · `git status -sb` · `git log --oneline -5` · leggere §1 · eseguire
la prossima azione esatta.

**Test** (da `natpf-tennis/`): `npm ci` · `npm test` · `npm run build`. Sito (dalla radice):
`node --test tools/test/*.test.mjs`. LAN: `cd tools/lan && npm ci && node --test test/*.test.mjs`. Prove nel browser:
`npm ci --prefix tools/e2e`, poi `CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/<script>.mjs` per gli script
`natpf-*` (avviano da soli vite e la segnalazione) o `node tools/e2e/run-local.mjs <script>.mjs` per quelli del sito.
In questo ambiente `CHROMIUM_PATH` è obbligatorio: `playwright-core` di `tools/e2e` cerca un Chromium diverso da quello
installato in `/opt/pw-browsers`.

**Pacchetti** (dopo ogni commit che li cambia):
1. Versione nuova `AAAA-MM-GG.n` in `site/js/tennis/version.js` e `site/tennis/build.json`, commit.
2. `cd natpf-tennis && npm run build`.
3. Cloudflare (dal B8 lo zip si fa **solo** così): `node scripts/pacchetto-cloudflare.mjs --out=<cartella nuova>
   --zip=<altra cartella>/natpf-simulator-cloudflare-<versione>.zip --turn-url=https://natpf-turn.s-porcelli.workers.dev/`
   (lo zip fuori dalla cartella del pacchetto e non già esistente: lo script lo rifiuta).
   Zip deterministico; lo script si ferma se arriva a 25.000.000 byte (richiesta dell'utente: «sempre leggermente meno
   di 25 MB») e avvisa sopra 24.000.000; la CI lo rifà a ogni push. Se si ferma: vedere i file più grandi che elenca.
4. LAN: `npm ci` in `tools/lan`, poi `node lan/pacchetto.mjs --out=<cartella> --node=<node-v22-win-x64.zip verificato>`,
   zip → `natpf-simulator-lan-windows-<versione>.zip` (niente certificati o chiavi nello zip).
5. Prova sugli zip estratti (server statico per Cloudflare; `node tools/lan/certificato.mjs` e server LAN per il
   LAN), `unzip -l` per controllare che non ci siano doppioni di Node né certificati, sha256, consegna all'utente,
   annotazione in `docs/WORK_PROGRESS.md` e nel Registro (§4).
6. Eseguibili Windows (dal 04/11 sera, stessa versione dei pacchetti): `npm ci` in `tools/lan`, poi in
   `natpf-desktop`: `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci`, `npm test`, `npm run costruisci` (~15 minuti, compressione
   lzma). Controllo con il 7zz della cache di electron-builder (`~/.cache/electron-builder/7zip@*/…/bin/7zz l`):
   ~300 file, nessun `.pem` o chiave, `resources/app` uguale a `dist/win-unpacked`; sha256; consegna insieme agli zip
   e aggiornamento delle dimensioni e degli sha256 in `docs/COLLAUDO_WINDOWS.md` §0. Procedura completa in
   `natpf-desktop/LEGGIMI.md`. **Consegna a pezzi** (dal 05/11: l'utente non riusciva a scaricare gli `.exe` da
   ~125 MB dal messaggio; gli zip da ~60 MB sì): `node scripts/dividi.mjs` → `dist/consegna/` con pezzi da 45 MB
   (`.001`, `.002`, …) e `UNISCI I PEZZI.cmd` (copy /b e controllo dello sha256 con certutil); si mandano quelli.
   **In più, su GitHub** (richiesta del 05/11: «un unico file che scaricherò da lì»): il workflow
   `.github/workflows/natpf-windows.yml` costruisce gli stessi eseguibili a ogni cambio di versione (o del programma
   Windows) e li pubblica come un unico zip in Actions → «NATPF eseguibili Windows» → esecuzione → Artifacts (30
   giorni): si dà all'utente il link dell'esecuzione. Gli sha256 di quella build sono in `SHA256SUMS.txt` nello zip.

**Rollback della presa** (dopo B3): cambiare la costante del profilo di presa da `palmo` a `martello` (modulo
indicato in `PROJECT_MEMORY.md` §Gesti), `npm test`, pacchetti. In alternativa `git revert` dei commit di B3 elencati
nel Registro.
