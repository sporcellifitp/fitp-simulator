# WORK_PROGRESS · registro dei passi (dal 04/11/2026)

Registro dettagliato dei blocchi di `docs/PIANO_LAVORI.md` (§4): per ogni passo file toccati, intervento, verifiche
con i numeri, ciò che non è verificato, commit e pacchetti. Lo stato sintetico e la prossima azione sono in
`docs/PIANO_LAVORI.md`; il registro fino al 04/11 è in `docs/archivio/WORK_PROGRESS_fino_al_2026-11-04.md` (lì si
trovano anche le sezioni citate nei commenti del codice come «WORK_PROGRESS, «…»» scritti prima del 04/11).

Legenda: [x] fatto, verificato e pubblicato · [~] in corso · [ ] da fare.

Modello di una voce:

```
## Bn · titolo · stato · date
Obiettivo · criterio di fine
- [x] Bn.k · cosa (commit abc1234, push sì, pacchetti <versione> | invariati)
  File: … · Verifiche: comando → numeri · Non verificato: …
```

---

## B0 · Continuità · [x] · 04/11/2026
Obiettivo: un file di ripresa unico per tutti gli agenti, regole del 04/11 scritte nelle istruzioni.
Criterio di fine: `docs/PIANO_LAVORI.md` presente e citato da CLAUDE.md e AGENTS.md; test invariati; push fatto.
- [x] B0.1 · (commit `0b60b54`, push sì, pacchetti invariati) `docs/PIANO_LAVORI.md` (checkpoint, regole, risposte dell'utente, punti aperti con cosa/come/perché,
  procedure); `docs/SESSION_HANDOFF.md` e `docs/WORK_PROGRESS.md` archiviati in `docs/archivio/` con `git mv`, al loro
  posto un rimando e questo registro; `CLAUDE.md` (ordine di lettura, push, pacchetti, un agente alla volta, comandi
  aggiornati); `AGENTS.md` nuovo; foto della presa dell'utente in `docs/riferimenti/`.
  Verifica avversaria del piano (workflow, 04/11): un verificatore su tre ha completato (gli altri fermati dal limite
  d'uso); correzioni applicate: CI descritta com'è davvero (due workflow), incoerenza della guida spiegata giusta, punti
  di partenza della calibrazione per la modale, altri testi «martello», regola degli ZIP fedele alle parole
  dell'utente, `CHROMIUM_PATH` obbligatorio, documento Windows rinominato `docs/DESKTOP_WINDOWS.md` (il nome
  `NATPF_*.md` è dell'archivio), punti aperti precedenti con cosa/come/perché.
  Verifiche: su `b076a0d` gioco 673/673, sito 182/182, LAN 5/5 (solo documenti cambiati). Pacchetti invariati.

## B1 · Prove nel browser e CI · [~] · 04/11/2026
Obiettivo: prove nel browser (`tools/e2e`) verdi sul gioco attuale e CI su `natpf-simulator`.
Criterio di fine: script `natpf-*` verdi, CI che prova gioco, build e sito sul branch.
- [x] B1.1 · script e2e allineati al gioco attuale, senza toccare il gioco. Cause: (a) lezione iniziale
  dell'Allenamento mai chiusa (il computer ignora la calibrazione durante la lezione mentre il telefono calibra da
  solo: è lo stesso scollamento che la modale di B4 deve risolvere); (b) primo gesto fatto dopo 0,5 s fissi, ma dal
  29/10 il telefono vuole `CAL.lead` 1,5 s e `CAL.firstSettle` 0,6 s; (c) menu a due colonne dal 31/10.
  File: `tools/e2e/th.mjs` (aiuti `quickCalibrate` e `finishLesson`), `natpf-training-flow` (nuova verifica della
  lezione), `natpf-phone-blackout`, `natpf-training-reconnect`, `natpf-diag-session`, `natpf-phone-keep`, `natpf-rally`,
  `natpf-gameplay-23-10`, `natpf-latency`, `natpf-menu` (blocco titolo + voci al centro, voci a destra del titolo).
  Verifiche (`CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/<script>.mjs`): training-flow 14/14 (era 6/13),
  phone-keep 13/13 (era KO), blackout 6/6 (era 4/6), training-reconnect 6/6, diag-session 24/24, rally 7/7 (era 4/7),
  menu 22/22 (era 19/22), gameplay-23-10 11/11, latency 9/9. Pacchetti invariati (solo script di prova).
- [x] B1.2 · script del sito con i tempi fissi aggiornati (`gesture-calibration`, `quick-phone-ui`: telefono fermo
  finché la calibrazione non chiede i gesti, gesto dopo il «pronto»); CI attivata su `natpf-simulator` in
  `natpf-simulator-tests.yml` (push del branch, esclusi i soli documenti; Node 22; `natpf-training-flow` nel matrix con
  le dipendenze del gioco) e in `natpf-tennis.yml` (push del branch: `npm test` e build del gioco).
  Verifiche locali: phone-only 10/10, timing-browser 8/8, gesture-calibration 18/18 (era in timeout), arcade-visuals
  9/9, intuitive-contact 5/5, quick-phone-ui 6/6 (era in timeout), lan-setup-browser 3/3, setup LAN ok,
  package-natpf.py ok; lan-browser 7/8 (WebRTC senza candidati ICE in questo ambiente). Pacchetti invariati.
- [x] B1.3 · prima CI rossa per cause degli script: `lan-browser` salvava un profilo v3 (il telefono salta la
  calibrazione solo con v4: ora 9/9 anche qui, non era il WebRTC dell'ambiente); il Chromium della CI concede lo schermo
  intero e poi non ridimensiona la finestra (`th.mjs`: `requestFullscreen` che riesce senza schermo intero nelle prove);
  `natpf-tennis.yml` controllava due file del bundle che non esistono più; diagnosi in `natpf-training-flow` se il
  telefono non entra in calibrazione. Verifiche locali: lan-browser 9/9, gesture-calibration 18/18, training-flow 14/14.
- [x] B1.4 · CI: workflow del gioco verde (test e build su B1.3, A+, B2); nelle prove del browser restava
  `natpf-training-flow` rosso perché il Chromium della CI (headless shell 156) ha `DeviceMotionEvent.requestPermission`
  come iPhone e in headless risponde «denied». `th.mjs`: il permesso viene concesso come il tocco su «Consenti», solo
  se l'API esiste (gli script che provano il rifiuto lo sovrascrivono). Da confermare nella CI.

## B2 · Intro con una sola pallina e l'arena del gioco · [x] · 04/11/2026
- [x] B2.1 · fotogrammi chiave dal motore (`natpf-tennis/scripts/audit/intro-fotogrammi.mjs`): arena del gioco senza
  giocatori, interfaccia e marchi (le grafiche con i loghi di `site/assets/arena` sostituite da pannelli neutri solo
  nella cattura), inizio basso dietro la riga di fondo, fine aerea dietro il campo (16 m o meno); aloni gialli delle
  lampade resi bianchi nel fotogramma di partenza (non scambiabili per palline).
  Higgsfield cinematic_studio_3_0 con fotogramma iniziale e finale, 8 s 720p, costo controllato prima (40 crediti),
  **un tentativo**: job `5b2b8345`. Verifiche: `scripts/audit/conta-palline.py` → 0 fotogrammi con 2+ palline su 193
  (vecchio video: 31), una pallina da 0,08 a 1,67 s con rimbalzo a 1,1 s; foglio di fotogrammi: una rete, campo blu
  come il gioco, niente scritte; pagina dell'intro con titolo e partner sopra i fotogrammi 5,75/6,6/7,9 s leggibile.
  Video ricompresso H.264 CRF 29 (1,27 MB; il vecchio 0,67 MB), `intro-fine.webp` dall'ultimo fotogramma (104 kB).
  File: `public/media/intro.mp4`, `intro-fine.webp`, `LEGGIMI.txt`, `scripts/audit/conta-palline.py`,
  `scripts/audit/intro-fotogrammi.mjs`, `PROJECT_MEMORY.md`, versione 2026-11-04.2. Test 675/182/10, build ok.
  Non verificato: riproduzione del video in un browser con H.264 (qui Chromium senza codec proprietari).
- [x] B2.2 · pacchetti **2026-11-04.2** consegnati: Cloudflare `natpf-simulator-cloudflare-20261104-2.zip` (138 file,
  26.846.487 B, sha256 `4f907c6dfcfb65d0402fed6b34b49b357c6299116363a2f26af269657a17fa7f`, con `/natpf/turn.json`) e
  LAN Windows `natpf-simulator-lan-windows-20261104-2.zip` (62.031.879 B, sha256
  `e17ff710581a52de2f31477301bebbe57a393cd727ce986b4f7c22cb9a8b9e57`, un solo `node.exe`, nessun certificato o
  chiave). Provati estratti: Cloudflare con server statico (pagine, `version.js` .2, `turn.json`, video); LAN con
  `NATPF_DATA_DIR` di prova, certificato creato fuori dal pacchetto, HTTPS 8443 (pagina del telefono, video,
  MediaPipe, versione .2).

## B3 · Presa nel palmo (foto dell'utente) al posto del martello, con rollback · [x] · 04/11/2026
- [x] B3.1 · foto `public/media/presa-palmo-schermo.webp` (768×768, 24,6 kB): ritaglio della foto dell'utente, sfondo
  tolto con Higgsfield (1 credito), composta sul blu di `presa-martello.webp`; provenienza in `LEGGIMI.txt`.
- [x] B3.2 · profilo unico con rollback in `site/js/tennis/grip-art.js`: `GRIP_STYLE` ('palmo' | 'martello'), `GRIPS`
  con nome, testi (guida, pannelli, telefono, «Collega», stesso schermo, calibrazione, lezione), figura SVG a due viste
  (palmo: di lato + di fronte), foto; `natpf_gesture_motion.GRIP_POSE` (posa 3D) e indicazioni per stile;
  `natpf_gesture_demo.js`: mano nel palmo (palmo dietro, dita sul bordo sinistro, pollice sul destro), posa del palmo,
  primo piano dell'impugnatura senza il braccio che copriva lo schermo; `natpf_media`, `natpf_cal_view`,
  `natpf_training.LESSON`, `natpf_ui` (testi `data-grip-text` e foto di «Collega» dal profilo), `index.html`.
- [x] B3.3 · piatto della dimostrazione «il dritto, ma più veloce» (asse e polso del dritto, 1000 °/s): con la presa
  nel palmo il vecchio piatto orizzontale era top spin; `scripts/audit/sim-piatto-prese.mjs` 64/80 → 80/80 su martello,
  palmo e presa della foto. Riconoscimento invariato (l'utente: «l'impugnatura mi pare andasse bene»).
- [x] B3.4 · tocchi: con la presa nel palmo nessun tocco cambia il segno dei sensori (test), quindi nessuna calibrazione
  rifatta per errore; testo della guida corretto («Negli esercizi dell'Allenamento il gioco impara…»).
  Test: `natpf-gesture-demo` (presa della foto 20–50° × 25–55°, destro e mancino, tutti i gesti; servizio anche nel
  palmo), `natpf-presa.test.mjs` nuovo (profili completi, foto, testi statici = profilo attivo, tocchi), test dei media
  indipendenti dal nome della foto. Gioco 680/680, sito 182/182, LAN 10/10, build ok; screenshot di «Collega», lezione,
  guida e pannello del telefono con la presa nuova; demo 3D senza errori. Versione 2026-11-04.3.
  Non verificato: telefono vero con la presa nuova.
- [x] B3.5 · pacchetti **2026-11-04.3** consegnati: Cloudflare `natpf-simulator-cloudflare-20261104-3.zip` (26.874.194 B,
  sha256 `6ecdd71d0f9c192d9b84d434b71650c1934fe5c88f1be8309417be3fa436026c`) e LAN Windows
  `natpf-simulator-lan-windows-20261104-3.zip` (62.061.001 B, sha256
  `26ae8b0cdeb09fc61810a3d39c8b6712b3c32c8581e2517091f4f80ce2e86d5f`, un solo `node.exe`, nessun certificato o chiave).
  Provati estratti: Cloudflare (pagine, versione .3, `turn.json`, foto della presa, video); LAN (HTTPS 8443, versione .3,
  foto, `grip-art.js` con `GRIP_STYLE = 'palmo'`, pagina del telefono).

## B4 · Modale del tutorial prima della calibrazione (gioco singolo) · [x] · 04/11/2026
- [x] B4.1 · protocollo: il computer manda `cfg` con `tut: 1` (`natpf_phone_racket.waitTutorial`), il telefono risponde
  `{ t: 'tut', w: 1 }` (lo sa fare), dopo «Attiva i sensori» resta nello stato `tut` (anche se aveva già cominciato a
  calibrare) e mostra in alto **«Tutto chiaro, ho capito»**; al tocco manda `{ t: 'tut', ok: 1 }` e calibra. Un telefono
  con la pagina di prima non risponde `w`: il computer chiude la modale appena calibra da solo. `link.js` inoltra `tut`;
  la diagnostica rimanda la `cfg` completa (`_cfg()`), senza perdere l'attesa.
- [x] B4.2 · `natpf_tutorial.js` (nuovo): modale grande in `cqw/cqh`, 11 schede (presa con foto e 3D, posizione,
  dritto, rovescio, servizio, piatto, pallonetto, palla corta, tagliato, schiacciata, volée) dalle definizioni verificate
  dei gesti, scorrimento automatico (6,5 s, ferma 20 s dopo una scelta), un solo contesto WebGL condiviso, più istanze
  possibili (per B5). In `natpf_training`: al posto della lezione con il telefono, in tutti i percorsi (Allenamento,
  riscaldamento, sfide), una volta per sessione; Esc la chiude (chi gestisce la postazione); «Rivedi i gesti» nel pannello;
  riquadro «Guarda e ripeti» tolto in calibrazione, resta negli esercizi; la lezione a passi resta per la webcam.
  Telefono: «Fatto! Guarda il computer: si parte da soli» (prima «…e conferma», ma conferma il computer).
  Test: gioco 683/683 (modale, telefono di prima, scorrimento, webcam, Esc), sito 182/182; e2e `natpf-training-flow`
  15/15 (modale e «ho capito» sul telefono simulato), schermata della modale controllata.
- [x] B4.3 · pacchetti **2026-11-04.4** consegnati: Cloudflare `natpf-simulator-cloudflare-20261104-4.zip` (26.877.380 B,
  sha256 `8886b95b9e8222107ee4ee1ba627175dbb79d76b76410f39e484160a45f43515`) e LAN Windows
  `natpf-simulator-lan-windows-20261104-4.zip` (62.064.855 B, sha256
  `de2146c15de9d0168e2a8d825c4a458fd3225785741016f58f49dadc4c0d02de`, un solo `node.exe`, nessun certificato o chiave).
  Provati estratti: versione .4, `turn.json`, pulsante `tutOk` nella pagina del telefono, contenitore della modale nel
  gioco (LAN su HTTPS 8443 e Cloudflare con server statico).

## B5 · Stesso schermo: tutorial e calibrazione indipendenti per giocatore · [x] · 04/11/2026
- [x] B5.1 · `natpf_split_ui.js`: un'istanza di `NatpfTutorial` per giocatore, ciascuna sulla **propria metà dello
  schermo** (P1 a sinistra, P2 a destra, sopra la pagina «Collega i due telefoni»), aperta appena quel telefono si
  collega; il suo telefono aspetta «Tutto chiaro, ho capito» (`waitTutorial`), e solo dopo `_drive` chiede la sua
  calibrazione; il tocco di un giocatore chiude solo la sua metà e non tocca l'altro. L'animazione 3D (una sola) va alla
  prima metà aperta e passa all'altra quando si chiude; senza 3D: foto della presa, testi, indicazioni e schede.
  «Gioca senza calibrare» chiude anche la modale di quella metà; «Gioca» e l'uscita dallo stesso schermo chiudono le
  modali; un nuovo collegamento (altro telefono o pagina ricaricata) e il reset del chiosco fanno rivedere il tutorial
  (anche nel gioco singolo). Webcam per due: niente tutorial del telefono.
  Prima versione con le modali dentro le schede di «Collega»: troppo piccole (testi e schede sovrapposti), spostate
  sulle metà dello schermo. Test: `natpf-split` (due modali, «ho capito» del P1 non tocca il P2, calibrazioni separate,
  3D che passa al P2); gioco 683/683, sito 182/182, LAN 10/10, build ok; schermate delle due metà controllate.
  Non verificato: due telefoni veri con due persone; nessuna prova nel browser automatica per lo stesso schermo.
- [x] B5.2 · pacchetti **2026-11-04.5** consegnati: Cloudflare `natpf-simulator-cloudflare-20261104-5.zip` (26.878.245 B,
  sha256 `52629c1933dcc8fb74046bd7106b8fc03533946232ba0696c827d3f747aa1014`) e LAN Windows
  `natpf-simulator-lan-windows-20261104-5.zip` (62.065.720 B, sha256
  `51c173dbbd68f8beef4ab772f2f8d3ace046c3cd4a4a222b285f6c9e010a5c3f`, un solo `node.exe`, nessun certificato o chiave).
  Provati estratti: versione .5, contenitori delle due metà nel gioco, `tutOk` nella pagina del telefono, `turn.json`.

## B6 · Valutazione Windows e architettura · [x] · 04/11/2026
- [x] B6.1 · `docs/DESKTOP_WINDOWS.md`: contesto d'uso (risposte del 04/11), architettura attuale con i riferimenti,
  audit (rendering, latenza, Windows), cosa richiede la rete, confronto A/A+/PWA/Electron/Tauri/NW.js/Neutralino,
  architettura consigliata (zip A+ con Edge in modalità app/chiosco; Electron facoltativo; Tauri sconsigliato),
  benefici attesi, piano F0–F5, compatibilità con il browser, rischi. Basato sull'analisi in sola lettura del 04/11
  (misure di rendering sulla build del 29/10, WebGL software: conteggi validi, fps no). Nessun codice cambiato.
  Non verificato: niente provato su Windows. Pacchetti invariati.


## B6.A+ · Primo avvio Windows portatile · 04/11/2026
- Autorizzato dopo la valutazione con «Puoi svilupparlo?». Base `4938134` integrata senza sovrascrivere B1.3.
- File: tools/lan/{desktop,storage,firewall}, certificato e launcher; lan/pacchetto e LEGGIMI;
  UI certificato, wake lock, test desktop/storage/wake lock, versioni e documenti.
- Edge/Chrome profilo persistente, localhost, monitor e fullscreen; CA migrata e stabile, firewall LocalSubnet
  browser UDP e HTTPS, pagina certificato/QR; nessun nuovo runtime pesante, gameplay invariato.
- Verifiche: gioco 675/675, sito 182/182, LAN 10/10, menu 22/22, build; ZIP estratti con 21 asset verificati,
  HTTPS valido su localhost, solo certificato pubblico servito, gioco LAN/Cloudflare avviato e QR verificato.
- Pacchetti: 2026-11-04.1 LAN Windows e Cloudflare; una sola copia Node, nessun certificato/chiave nello ZIP.
- Non verificato: Windows, UAC/PowerShell/firewall, monitor/DPI, telefoni reali, prestazioni e WebRTC fisico.
  CA nameConstraints rinviati; F0 e altri interventi F1 restano da fare. Nessun Electron.
- SHA256 LAN: `60f05f06d48bd85bfc99612fd2e3e1a2e87c3f51769c344413081cdf51245386`.
- SHA256 Cloudflare: `a25dea7ab18d92ad018a404476031f3b86e25b60b5ffe721a0d5a13916689aff`.

## B7 · Eseguibili Windows: portatile e installabile · [x] · 04/11/2026 sera
- Richiesta: «una versione portatile e una versione installabile, entrambe tramite eseguibili; vai avanti su Windows,
  il resto lo provo io, segnati i punti che devo controllare». Codex aveva fatto lo zip A+ (Node portatile + Edge),
  nessun eseguibile.
- [x] B7.1 · `natpf-desktop/` (nuovo): `package.json` (electron 45.2.2, electron-builder 26.18.0, resedit 3.1.0,
  versioni esatte), `src/main.mjs` (processo principale), `src/desktop-core.mjs` (funzioni pure), `test/` (5 prove),
  `scripts/prepara.mjs` (app/ dal pacchetto LAN, senza Node e senza certificati), `scripts/costruisci.mjs`
  (electron-builder target `dir` + makensis), `build/installatore.nsi`, `build/portatile.nsi`, icona e grafica
  dell'installazione, `LEGGIMI.md`. Documenti: `docs/COLLAUDO_WINDOWS.md` (punti per l'utente),
  `docs/DESKTOP_WINDOWS.md` §13, `docs/PROJECT_MEMORY.md`, `CLAUDE.md` (comando dei test).
- Problema incontrato: il target `nsis` di electron-builder da Linux chiede wine per la disinstallazione (`spawn wine
  ENOENT`), wine non c'è. Soluzione: script NSIS propri con `WriteUninstaller` e il makensis per Linux della cache di
  electron-builder (NSIS 3.0.4.1, con System, nsExec, nsDialogs, MUI2 italiano).
- Firewall: regola per l'eseguibile, solo `localsubnet`; il portatile la chiede prima di avviare il server; si tolgono
  anche le regole di blocco legate all'eseguibile (create da Windows se si preme «Annulla» sul suo avviso).
- Verifiche: `natpf-desktop` 5/5; gioco 683/683, sito 182/182, LAN 10/10; costruzione completa da Linux; 7zz:
  installazione 302 file e portatile 298 file, `resources` identiche a `dist/win-unpacked`, nessun `.pem` né chiave,
  plugin NSIS presenti; versione e icona (7 immagini) lette con resedit nei tre `.exe`; programma avviato con Electron
  45.2.2 per Linux in Xvfb: certificato creato, server pronto, `https://localhost:8443/?lan=1` caricato a schermo
  intero, WebGL con SwiftShader, menu del gioco raggiunto, menu del programma e finestra «Scheda grafica» aperti.
  Stessa prova sulla cartella impacchettata `dist/win-unpacked/resources/app` (dove electron-builder toglie
  `tools/lan/node_modules`: `ws` e `node-forge` sono alla radice dell'app): certificato nuovo, server pronto, gioco
  caricato, pagina del telefono `/natpf/tennis/racchetta.html` 200, pagina del certificato 8081 e `natpf-ca.crt` 200.
  `7zz t` dei due `.exe`: «Everything is Ok».
- Eseguibili consegnati: `NATPF-Simulator-Setup-2026-11-04.5.exe` (124.880.055 B, sha256 `bdfb46b7a456e55b7d9b5e51906f59971552990fdf744f598041417c4dcd7d62`) e
  `NATPF-Simulator-Portatile-2026-11-04.5.exe` (124.872.264 B, sha256 `369702017923532838c0b9b437dfb4d2190dedfb3c5090b3640bbd2d2c5ae7cb`). ZIP 2026-11-04.5 riconsegnati invariati
  (B7 non ne cambia il contenuto; sha256 ricontrollati).
- Non verificato: tutto su Windows (SmartScreen, antivirus, UAC, installazione e disinstallazione, netsh, avvio dalla
  pagina finale, estrazione del portatile, monitor/ledwall, Alt a schermo intero, webcam, GPU del PC noleggiato,
  telefoni veri). Electron 45 su Windows 10: supportato secondo Electron, non provato.

## B8 · Schermo intero senza cornici, adattamento al monitor, Cloudflare sotto 25 MB · [x] · 04–05/11/2026
- Richieste: «Assicurati che ci sia in tutte le versioni modalità full screen senza cornici»; «la versione cloudflare
  deve sempre pesare leggermente meno di 25 MB»; «adatta il fullscreen in base alla finestra/monitor in utilizzo o
  prevedi la calibrazione a full screen, come avviene per i videogiochi».
- Metodo: analisi in parallelo (mappa del gioco, Electron e Edge/Chrome dai sorgenti, prova a 9 formati di schermo,
  peso del pacchetto), poi quattro rami in worktree separati (Cloudflare, programma Windows + launcher Edge,
  inquadratura, schermo intero + calibrazione), ciascuno implementato, rivisto da un revisore indipendente e corretto;
  unione lineare su `natpf-simulator` (lavoro interrotto due volte dal limite d'uso e ripreso dalle modifiche lasciate).
- [x] B8.1 Cloudflare (`3b9b789`, `d365de3`, `b5c7edb`): MediaPipe solo SIMD (`offline-assets.mjs`,
  `MEDIAPIPE_EXCLUDED`), riserva dal CDN fissato senza SIMD (`mediapipe_locate.js`), solo i 2 loghi usati dal gioco,
  `pacchetto-cloudflare.mjs --zip` deterministico con `ZIP_LIMIT` 25.000.000 (avviso a 24.000.000) e passo in CI.
- [x] B8.2 Programma Windows (`99a42d6`, `d3b3b8f`, `e1b458f`): finestra creata già a schermo intero, Alt che non mostra
  il menu a schermo intero, scorciatoie in `before-input-event`, cambio di monitor senza cornici e solo se serve,
  ledwall salvato che torna quando compare, cambi di risoluzione riadattati, preload `window.natpfDesktop`,
  `scripts/prova-linux.mjs` (Electron per Linux in Xvfb).
- [x] B8.3 Launcher Edge/Chrome (`e48273f`, `49ce6ef`): `--app` + `--start-fullscreen` predefinito (mai `--kiosk`),
  `screenMode`, CONFIGURA SCHERMO con Invio = schermo intero, finestra solo per prove con `?fs=0`.
- [x] B8.4 Inquadratura (`767d191`, `13ac0ab`, `b0f9380`): `thirdPersonFrame`/`frameMatchCamera` in `natpf_camera.js`
  (16:9 e più largo invariati; più stretto 58°, poi la camera si allontana fino a 1,2 volte, mai oltre z 25,3 davanti
  al maxischermo: oltre sale; in verticale fino a 70° e +8°), `_onResize` con inquadratura e pixel ratio subito;
  revisione: la camera finiva dietro il maxischermo e la sua cassa nera copriva le gambe di chi gioca in profondità.
- [x] B8.5 Schermo intero nel gioco (`9553026`, `0ed4d43`, `bf8a08d`): `NatpfFullscreen` in `natpf_screen.js`
  (senza cornici = ponte del programma, schermo intero della pagina o F11), apertura al primo input vero, Keyboard
  Lock di Esc, Esc ripetuto ignorato, tasto F, pulsante in alto nel menu, voce nella pausa, riga in Opzioni → Schermo
  con «All'avvio» (nascosto nel programma), «Premi F11» visibile anche in campo e in pausa.
- [x] B8.6 Calibrazione dello schermo (`a0f53b6`, `61dedfa`, `01838ef`): `natpf_calibra.js` (formato, bordi per lato
  fino al 90% con area minima 480 × 360, frecce agli angoli, cerchio, griglia, numeri; Invio/Esc/R), area salvata in
  `natpf-tennis.screen.cal`, annullata da ogni cambio di pagina del menu (anche il chiosco).
- [x] B8.7 Integrazione (`49ce6ef`, `2b4eae4`): commenti della camera aggiornati, porte predefinite distinte delle
  prove nuove, scenario `gioco` in `prova-linux.mjs`, `lan-e2e.mjs` con il tutorial del telefono (B4), versione
  **2026-11-05.1**, documenti (DESKTOP_WINDOWS §14, PROJECT_MEMORY, COLLAUDO_WINDOWS §4/§4b/§5b, PIANO §6).
- Verifiche sull'insieme: gioco 760/760, sito 182/182, LAN 12/12, programma Windows 13/13, build ok. Nel browser:
  `natpf-schermo` 41/41, `natpf-inquadratura` 36/36, `natpf-menu` 22/22, `natpf-training-flow` 15/15,
  `gesture-calibration` 18/18, `arcade-visuals` 9/9, `lan-setup-browser` 3/3, `lan-browser` 9/9.
  `timing-browser`: si ferma su «P2 timing still correct after shared pause», il rosso intermittente già noto (B8 non
  tocca `site/` né quella prova). `natpf-tennis/test/e2e/lan-e2e.mjs` (non in CI): in questo ambiente serve
  `NO_PROXY` con l'indirizzo del PC (il Chromium delle prove passava dal proxy del contenitore); dopo la correzione
  del tutorial, gli stessi controlli rossi anche sul codice di prima di B8 (`b74af13`): flusso dei sensori del
  telefono in partita, racchetta che segue il polso, gesto → colpo, webcam → racchetta a 1 fotogramma al secondo in
  WebGL software: non sono di B8 (punto aperto). MediaPipe Hands dal pacchetto locale offline: ok.
- Pacchetti 2026-11-05.1: Cloudflare `natpf-simulator-cloudflare-20261105-1.zip` **22.517.792 B** (prima 26.878.245),
  126 file, sha256 `a3f2e960b1791a47176b4b5c0d9b6e57fd4f4f92115200efe3758a5cde92f6b7`; LAN Windows
  `natpf-simulator-lan-windows-20261105-1.zip` 57.548.009 B (prima 62.065.720), 310 file, un solo `node.exe`, nessun
  certificato o chiave, sha256 `f4f6b19599422f49bbf43ff290e173e0dc9038202e1f513f074b1d0f53e81ece`.
- Programma Windows provato con Electron per Linux (`prova-linux.mjs`, app/ della 2026-11-05.1): **46/46** in quattro
  scenari (predefinito, ledwall spento all'avvio, avvio in finestra, gioco vero con il ponte natpfDesktop).
- Eseguibili 2026-11-05.1: `NATPF-Simulator-Setup-2026-11-05.1.exe` 124.510.981 B, sha256
  `fe3de548601edd6587cf4a81542ec64426719d47fab9ef83bdeaf56d3bd18a3e`; `NATPF-Simulator-Portatile-2026-11-05.1.exe`
  124.518.594 B, sha256 `c60008c945736725ab7f8a7d5697a1cce5997818864aacacea4fa37d7c90478e`. `7zz t` ok (290 e 286
  file), `resources` identiche a `dist/win-unpacked` (con `preload.cjs`, senza MediaPipe non SIMD), nessun certificato,
  versione 2026-11-05.1 / 2026.1105.1 e icona nei tre `.exe`. ZIP provati estratti: Cloudflare servito in locale
  (versione, SIMD 200, non SIMD 404, pulsante e calibrazione, nessun errore), LAN (certificato, server, pacchetto
  offline 15/15, gioco e telefono 200, `?fs=0` nel launcher).
- Non verificato: tutto su Windows, Edge, ledwall e processori LED (schermo intero senza cornici all'avvio, Alt, F11,
  hold-Esc di Edge, barra delle applicazioni sul ledwall, cambi di risoluzione veri, cerchio e bordi su un LED vero),
  browser senza SIMD reale, telefoni veri.
- [x] B8.8 (05/11) · «i file exe non riesco a scaricarli dal tuo messaggio»: nuovo `natpf-desktop/scripts/dividi.mjs`
  (pezzi da 45 MB + `UNISCI I PEZZI.cmd` con `copy /b` e controllo `certutil -hashfile … SHA256`), test in
  `natpf-desktop/test` (14/14). Pezzi degli eseguibili 2026-11-05.1 riuniti su Linux: sha256 uguali agli originali
  (`fe3de548…bd18a3e`, `c60008c9…7d90478e`); consegnati 6 pezzi e il `.cmd`. Non verificato: il `.cmd` su Windows.
- [x] B8.9 (05/11) · «non puoi caricarli come zip su github? in un unico file»: le release non si possono caricare da
  qui e git rifiuta file oltre 100 MB, quindi `.github/workflows/natpf-windows.yml` costruisce gli eseguibili su
  GitHub (stesso codice: prepara 42,3 MB come in locale, Setup 124.545.926 B, Portatile 124.494.733 B) e li pubblica
  come artefatto unico `NATPF-Simulator-Windows-2026-11-05.1` (249.056.305 B, con `SHA256SUMS.txt` e
  `COLLAUDO_WINDOWS.md`; scade il 05/12/2026). Prima esecuzione 42000334461 riuscita in 8 minuti. sha256 della build
  di GitHub: Setup `0963271dddc3a3033c3648eea19fc1d3a70eae78c13f9aec4e19ff9679610070`, Portatile
  `69969ea8612405ba6967913a7a3ad303eaeb3d13a4fc6f7199bec77fff9ca263` (diversi da quelli costruiti qui: stesse
  sorgenti, build non identica byte per byte). Non verificato: download e avvio su Windows.

## B9 · modale, telefono, schermo spento, «pronto» nel 1v1 (05–06/11) — rami A e B uniti
Analisi in `docs/b9/` (modale e animazione, specifica dei gesti, telefono e schermo spento, «pronto»), consegne in
`docs/b9/compiti.md`. Rami fatti in worktree e uniti il 06/11:
- **A** (`5136d0c`, unione `4ed5eab`): modale del tutorial compatta e centrata (anche nella propria metà dello stesso
  schermo), frecce ‹ › in basso al posto delle 11 etichette, niente scorrimento automatico, scheda vista dopo ~1 s;
  avanzamento mandato al telefono (`tp`, protocollo v2 compatibile), «Tutto chiaro, ho capito» spento finché non si
  sono viste tutte le schede, frecce anche sul telefono; schermate del telefono esclusive (`site/js/tennis/phone-screen.js`):
  «Pronto» con Ricalibra/Ricollega/Scollega solo dopo; tutorial non riproposto ai ricollegamenti della stessa sessione;
  schermo spento: Wake Lock ripreso, pausa immediata sul computer con la durata, ripresa automatica, velo «Tocca lo
  schermo per riprendere» opaco; limiti e protocollo di prova in `docs/b9/schermo-spento.md`; riga «Presa» nascosta
  corretta. Prove nel ramo: gioco 768, sito 193, LAN 12; browser natpf-tutorial-phone 36/36 (nuovo), training-flow
  17/17, phone-keep 13/13, blackout 6/6, training-reconnect 6/6, menu 22/22, rally 7/7, gesture-calibration 18/18.
- **B** (`061a729`, unione `29c2e74`): stesso schermo con una scheda per giocatore (nome, stati in attesa / si prepara /
  pronto / problema con colore, icona e parola), conto alla rovescia di 3 s sul computer e sui telefoni quando tutti e due
  sono pronti e il tutorial è chiuso, poi si gioca senza toccare il PC; conto annullato con il motivo se un telefono cade;
  «Aspetta»/Esc; «Gioca» spento nella pagina «Partita» con un telefono non pronto; niente salto automatico a «Partita».
  Sfida un amico (sospesa): «Sono pronto» giallo → «Pronto ✓» verde, «Annulla» separato, «Player 1 lo vede ✓». Dettagli in
  `docs/b9/pronto-1v1.md`. Prove nel ramo: gioco 777, sito 182, browser natpf-split-ready 24/24, 1v1-p2p 37/37.
- Dopo l'unione: gioco 785/785, sito 193/193, LAN 12/12, build ok.
- **Non verificato**: telefoni veri (Wake Lock, schermo spento 3 s / 30 s / 6 min, iPhone), Windows, ledwall vero.
- **Dopo l'unione, correzioni** (`6c3a98b`): schede del tutorial contate anche lasciandole prima del controllo ogni 250 ms
  (`tutorialGo`), ridisegni dello stesso schermo raggruppati (subito solo a cambio di stato vero). Browser sul codice
  unito: natpf-tutorial-phone 36/36, split-ready 24/24, training-flow 17/17, 1v1-p2p 37/37, menu 22/22, phone-keep 13/13.
- **Giudizio dell'animazione** (`6e8d39f`, `docs/b9/giudizio-animazione.md`): attuale 3,7 · 3D realistico 6,6 ·
  illustrato 7,7 su 10 → ibrido con base illustrata 2,5D (Canvas 2D, solo avambraccio, mano e telefono). Immagini G-1…G-4
  mandate all'utente con la scelta.
- **Correzioni dalle revisioni dello stesso schermo** (worktree `wf_e4f0c384-df5-1`, unione `fed770b`): `531d4a1`
  telefono che cade o «Ricollega» a tutorial aperto: il tutorial riprende dalla scheda, nessuna calibrazione partita da
  sola (`hold` senza `waitTutorial(false)`, ramo per le pagine vecchie solo se il telefono non ha mai risposto);
  `3ef25ed` telefono con la pagina nascosta o i sensori fermi: scheda «Schermo del telefono spento», niente conto, conto
  annullato con il motivo, `bothReady()` con lo stesso criterio delle schede (tutorial, salute, webcam per due); minori:
  `ac7a0c9`/`c2bf661` conto che non riparte da solo tornando con «‹ Indietro» (riparte a cambio di stato di un telefono;
  fermo mentre si scrive un nome), `f7a1622` ledwall 720×720 con le schede affiancate e la barra non fissa durante
  l'attesa (QR liberi), `e0d8c3f` «Aspetta» con anello neutro sul telefono (`soft:1`, `countFlash`) e velo «Bentornato»,
  `5d757a0` riquadro della pausa per giocatore con due pause, `ccd51d7` Allenamento: il telefono aspetta il tutorial già
  nella pagina «Collega» (niente «Preparati» di 0,76 s). Revisione: nessun bloccante, prove di mutazione fatte (ogni
  correzione tolta fa fallire i suoi test).
- **Posa dei gesti** (worktree `wf_e4f0c384-df5-2`, unione `b86baac`): `natpf-tennis/src/natpf/natpf_gesture_pose.js`
  (modulo puro: 11 schede + incrociato/lungolinea, destro e mancino, presa palmo/martello; posa del telefono, fasi,
  contatto, palla, scheletro, camere), adattatore `test/pose-sensors.mjs`, test `natpf-gesture-pose.test.mjs` (14): ogni
  scheda dà il colpo mostrato con il telefono simulato e il rilevatore vero, picco letto = contatto, e la stessa verifica
  fallisce sull'animazione di prima dove la specifica lo prevede. Nota `docs/b9/posa-gesti.md`. Limite: piatto imitato
  con la cima a 50° verso l'interno letto come top spin in parte dei casi (causa nel riconoscimento, documentata).
- Codice unito (`b86baac`): gioco 810/810, sito 194/194, LAN 12/12, build ok; browser natpf-tutorial-phone 36/36,
  split-ready 31/31, tutorial-relink 8/8, training-flow 17/17, 1v1-p2p 37/37, menu 22/22, phone-keep 13/13,
  phone-blackout 6/6, training-reconnect 6/6.
- **Versione 2026-11-06.1** (`3b59c51`) e pacchetti: Cloudflare `natpf-simulator-cloudflare-2026-11-06.1.zip` 22.534.728 B,
  127 file, sha256 `9de1f4d4a0217ca12f894082a76e9d26420f70d06ea7fcd83b3b963c7be256ee` (con `/natpf/turn.json`); LAN
  `natpf-simulator-lan-windows-2026-11-06.1.zip` 57.788.782 B, 312 file, un solo `node.exe`, nessun certificato né
  chiave, sha256 `2a4c32183da4653b004260c64eb8f85ad86d4890fe44efb383021aa114dd6ece`. Provati estratti: Cloudflare servito
  in locale (menu, pagina del telefono, versione; unico errore il Worker TURN vero che rifiuta l'origine locale, come
  previsto da `ALLOWED_ORIGINS`), LAN con certificato nuovo e server HTTPS (4/4, nessun errore). Consegnati all'utente.
  Animazione dei gesti ancora quella vecchia in questa versione (ramo C in corso).
- **Minori dello stesso schermo** (worktree `wf_b232ca46-ca8-2`, unione `6920b36`): `c7086ef` «‹ Indietro» stabile
  (`cd.back` azzerato solo dopo 1 s di «non pronto», `SPLIT_BACK_DROP_MS`), `e08ed61` schede allineate a 720×720 e nelle
  aree strette (30/30 misure), `aeea1db` due pause con il giocatore nel testo e senza «Si riprende» finché l'altra è
  aperta, `d11940c`/`92f0631` velo del telefono con `veilText` (calibrazione «rimasta» solo se calibrato). Codice unito:
  gioco 813/813, sito 195/195, build ok; browser split-ready 34/34, tutorial-phone 37/37, tutorial-relink 8/8,
  training-flow 17/17, menu 22/22, 1v1-p2p 37/37.
- **Versione 2026-11-06.2** (`10ed703`): Cloudflare 22.535.302 B, 127 file, sha256
  `265237ca750a15314976ff9338405de3f5d6b1d21cfdd6f1e5233acefc56cfd7`; LAN 57.789.722 B, un `node.exe`, nessun
  certificato, sha256 `8cf9731ca2ed86c1746610ecb17441d359aebc6d01924c2065d78b89a67f1c1f`. Provati estratti come la .1
  (Cloudflare 3/4 con il solo errore atteso del Worker TURN vero sull'origine locale, LAN 4/4). Consegnati.
- **Ramo C, animazione nuova** (worktree `wf_b232ca46-ca8-1`, unione `f386f89`): `631bd34` palla del servizio
  appoggiata sul vetro, test della posa più stretti; `d8ed8cb` Canvas 2D sopra `gesturePose` (11 schede, mancino,
  compatta, camere riviste); `bf63224` un'istanza per metà schermo (niente `demoOwner`), velo senza `backdrop-filter`,
  test `natpf-gesture-anim`; `0f6be42`, `c2fc6c9` (menu dello stesso schermo con il tutorial aperto da 27 a 60 fps senza
  GPU), `e76e514`, `5b03537`, `fe49c52` (nota `docs/b9/animazione-c.md`, fogli `docs/b9/img/C-anim-*` e schermate
  `C-modale-*` guardati), `6d02f38`. **Revisioni tecnica e artistica non fatte**: fermate su richiesta dell'utente
  («accelera verso un push, devo consegnare»); l'utente ha visto l'anteprima e ha detto che va bene.
- Codice unito: gioco 820/820, sito 195/195, build ok; browser tutorial-phone 37/37, split-ready 34/34,
  training-flow 17/17, modale-gesti 15/15, menu 22/22, 1v1-p2p 37/37.
- **Versione 2026-11-06.3** (`d867d5e`): Cloudflare 22.551.200 B, sha256
  `72e2b744805d2e68a721b1634e174126bd60f7b07126be96c65c584ff8b6e0e5`; LAN 57.805.448 B, un `node.exe`, nessun
  certificato, sha256 `9511df51735245284c96e15aae9f9a8a33d1aa1f64d1fd63406c29d0e4da0cea`. Provati estratti (come .1/.2).
  Eseguibili: workflow GitHub «NATPF eseguibili Windows» esecuzione 42274534538.
- **Non verificato**: telefoni veri, Windows, ledwall vero, GPU vera; persone che guardano l'animazione e ripetono il
  gesto (brief §5.6.6).

## B10 · Test rimasti, voce «smash», punteggio, scritte nel 2v2 (richiesta del 06/11 sera) · [~]
- Prove nel browser sulla 2026-11-06.3 non rifatte prima: verdi tutorial-relink 8/8, phone-keep 13/13, phone-blackout
  6/6, training-reconnect 6/6, rally 7/7, schermo 41/41, inquadratura 36/36, diag-session 24/24, webcam-distanza 7/7,
  timing-browser 8/8, gesture-calibration 18/18 (tre volte; una volta in tempo scaduto alla riga 73: l'intermittenza già
  nota della CI). Rosse **anche sulla 2026-11-05.1** (quindi non nate da B9): natpf-gesti-speciali 6/9 (pallonetto e
  palla corta del telefono simulato letti come top spin), natpf-1v1-webcam-p2 8/12 (P2 nella lobby mentre l'host gioca,
  webcam del P2 spenta letta come scollegamento): workflow `natpf-b10-prove-rosse` in corso (gioco o prova sbagliati,
  correzione, revisione).
- **Rami B10 uniti** (07/11 mattina, `8a12f2b`…`a1e44ab`): revisioni tecnica e artistica dell'animazione fatte
  dall'agente stesso (`2168295`…`631a0e4`: etichette dei fantasmi ferme, freccia senza scatto al giro, camere di
  servizio/schiacciata/palla corta senza avambraccio di punta, «Guarda e ripeti» ferma sotto «Rivedi i gesti», test che
  il disegno usi davvero la posa); voce «Smash» solo quando la scritta del colpo è una schiacciata voluta (`59533b3`,
  `natpf-voce-smash.test.mjs`, 4 test rossi senza la correzione); tabellone come in televisione (`fa76fe3`: nome, game,
  punti 0/15/30/40/Vantaggio, chi serve, formato in parole; prova `natpf-tabellone` 17/17); scritte dell'esito nell'angolo
  del proprio lato, quelle del compagno con «Compagno» (`ab4ebe6`, `2998d9c`, prova `natpf-scritte-2v2` 49/49); prova
  gesti speciali corretta (`69bd202`: era la prova a non segnare il tutorial come visto; 9/9). Conflitto in
  `game_engine.js` (voce + scritta del compagno) risolto tenendo entrambe.
- Codice unito: gioco 842/842, sito 195/195, build ok; browser tutorial-phone 37/37, split-ready 34/34, training-flow
  18/18, menu 22/22, 1v1-p2p 37/37, rally 7/7, gesti-speciali 9/9, scritte-2v2 49/49, tabellone 17/17; modale-gesti 16/18
  con i soli controlli di fps rossi a macchina carica (carico 9–13 su 4 core con altri agenti; a macchina scarica 58–60
  fps): da riprovare a macchina scarica.
- **Versione 2026-11-07.1** (`c58bebe`): Cloudflare 22.553.859 B, sha256
  `e0d41d9777189c293c196fe619131761bcf2f828b135a6b6c53cc936bb19f26e`; LAN 57.808.101 B, sha256
  `88cb443e7b48c309470437ee8fc8500553fe018439db69b8ef17562893d87d0e`; provati estratti, consegnati.
- In corso: workflow `natpf-b10-revisioni` (revisioni indipendenti di voce, tabellone, scritte, animazione; correzione
  della prova/gioco webcam del P2; `drop` escluso dalla salita abituale imparata in partita, difetto trovato dal revisore
  dei gesti speciali: dopo alcune palle corte tagliati e piatti letti come top spin).
- **Revisioni indipendenti B10** (workflow `natpf-b10-revisioni`): animazione nessun bloccante; voce: l'esercizio della
  schiacciata contava un dritto su palla alta → `35f170d` (`smashCalled`, `trainingShot`, minori della voce, «Super
  colpo»); scritte: servizio del P2 nella metà sbagliata e scritta sopra la scheda dell'esercizio → `a70e071`; tabellone:
  formato e «Vantaggio di …» sovrapposti nella sfida → `3c606b7` (testo ≥ 10 px; prova 26/26); palla corta nella salita
  abituale → `70d310a` (le palle corte riconosciute dalla forma non la insegnano più; escludere tutte le `drop` lasciava
  31 combinazioni su 324 lette palla corta per tutta la partita); webcam del P2 → `013ff72` (era la prova: il P2 risultava
  fuori linea per > 4 s mentre la schermata col WebGL software bloccava la pagina; 15/15, raro errore sotto carico non
  risolto). Unione `50c36cf`…`fa7a613`: gioco 857/857, sito 195/195, LAN 12/12, build ok; browser split-ready 34/34,
  tutorial-phone 37/37, training-flow 18/18, menu 22/22, 1v1-webcam-p2 15/15, 1v1-p2p 37/37, rally 7/7, gesti-speciali
  9/9, tabellone 26/26, scritte-2v2 73/73, tutorial-relink 8/8, phone-keep 13/13; modale-gesti 17/18: nello stesso schermo
  con le due animazioni un fotogramma bloccato ~1 s (presente da `8a12f2b`, anche a macchina scarica; a schermo singolo
  60 fps) → workflow `natpf-b10-blocco-1s` in corso.
- **Versione 2026-11-07.2** (`94ee4b6`): Cloudflare 22.555.142 B, sha256
  `e406d36f2a8f97656b9e50bea11e4f10360fd921f43cc6d2614c1899780de5d7`; LAN 57.809.500 B, sha256
  `a5dcc5afa879c88d8b5697bb935433d1fa5624220c3795d23e6408536a67e303`; provati estratti, consegnati.
- **Blocco di ~1 s nello stesso schermo** (workflow `natpf-b10-blocco-1s`, `528a53f`, unione con la versione): non era
  l'animazione. Il menu ridisegnava l'arena 3D dietro di sé una volta al secondo per 8 s a ogni ingresso; senza GPU ogni
  disegno costa ~1 s (traccia CDP: `GLES2::ReadPixels` nel Commit in attesa del WebGL software). Ora lo sfondo fermo si
  ridisegna all'ingresso, al ridimensionamento e all'arrivo di un'immagine (`_natpfWatchTextures`, al più una volta al
  secondo); aspetto invariato (37/46 texture caricate come prima; con immagini in ritardo di 12 s meglio di prima).
  Revisione: causa confermata con un profilo indipendente, nessun bloccante. natpf-modale-gesti 18/18 tre volte (stesso
  schermo 60 fps, peggiore 17 ms).
- **Versione 2026-11-07.3** (`0c6188b`): gioco 859/859, sito 195/195, LAN 12/12, build ok; browser modale-gesti 18/18 ×3,
  split-ready 34/34, tutorial-phone 37/37, menu 22/22. Cloudflare 22.555.226 B, sha256
  `af881095f6f5674161933d01063705a5b38df4729c5cb9db5833b0b3184af621`; LAN 57.809.594 B, sha256
  `fbce2e33303cd2a51004b9014243e09faf802a5099b616e49bfa51b3e99da5a8`; provati estratti, consegnati.
- **Non verificato (B10)**: telefoni veri, webcam vera, audio ascoltato, Windows, ledwall, GPU vera; webcam del P2 nella
  sfida: errore raro sotto carico (webcam non riaccesa dopo «Accendi la webcam», 1 volta su ~15) non risolto.

## B11 · Un solo installer Windows che si aggiorna dal gioco (richiesta del 07/11) · [x]
- Workflow `natpf-b11-installer-aggiornamenti`: parte A (`96b3274`…`c7197b4`: solo `NATPF-Simulator-Setup-<build>.exe`,
  portatile tolto; `natpf-desktop/src/aggiornamenti.mjs` con manifesto `windows/latest.json`, download con ripresa,
  controllo di dimensione e sha256, redirect solo sullo stesso host; `/S /AGGIORNA` che aspetta la chiusura e riapre il
  gioco; pubblicazione in CI su R2, mai ripubblicare la stessa versione; guida `docs/GUIDA_AGGIORNAMENTI_R2.md`), parte B
  (`6c158ef`, `50613c9`: avviso solo nel menu principale, sezione «Aggiornamenti» in Opzioni, prova
  `natpf-aggiornamenti` 80/80). Revisioni: un bloccante per parte, corretti. Unione `8623bd9`, `0c1dd8f`.
- Versione **2026-11-07.4** (`d2e0d50`) con l'indirizzo `https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev` in
  `natpf-desktop/aggiornamenti.json`: gioco 873/873, sito 195/195, programma Windows 28/28, LAN 12/12, build ok; browser
  aggiornamenti 80/80, menu 22/22, split-ready 34/34.
- Prima pubblicazione su R2: quattro tentativi. Cause trovate dal workflow senza mostrare i segreti (`8412507`,
  `da73187`, `f547d52`, `fa190f2`): Account ID con 5 caratteri in più (ripulito), token rifatto dall'utente, infine il
  bucket `natpfsimulator` è nella **giurisdizione UE** (endpoint `<id>.eu.r2.cloudflarestorage.com`, ora riconosciuto da
  solo). Pubblicato il 07/11 17:21: `windows/latest.json` (build 2026-11-07.4, 124.614.379 B, sha256
  `c516a2a0ee5ceecf8cb6aaa90ff6a540e7a10809e115862faf948da90ab36f84`), `windows/NATPF-Simulator-Setup-2026-11-07.4.exe` e il
  link fisso `windows/NATPF-Simulator-Setup.exe`: scaricati dall'indirizzo pubblico, stesso sha256 del manifesto.
- Zip Cloudflare 2026-11-07.4: 22.560.067 B, sha256 `c8bdf92e1ef50a932bb3fe2db73c741af86fa25a07b97d7376608f9f1468f135`.
- **Non verificato**: tutto su Windows (installazione, UAC, aggiornamento silenzioso, riapertura, impostazioni
  conservate: `docs/COLLAUDO_WINDOWS.md` §2 e §2b); un aggiornamento vero da una versione all'altra (servirà la
  prossima versione).

## B12 · Forza del colpo dopo le palle corte, azioni di GitHub · [x] · 07/11/2026
- Richiesta: «parti dalla forza del colpo e dalle azioni di GitHub» (passaggio di consegne §3 punti 6 e 10).
- [x] B12.1 (`67af1d9`) · `natpf_phone_racket.js` (`TYPICAL.skip`, `createTypicalModel.learn`, `_onSwing`),
  `test/phone-sim.mjs`, `test/natpf-racchetta.test.mjs` (+2 test). Sonda con il telefono simulato e le pose del
  tutorial nel vero `NatpfPhoneRacket`: prima della correzione, dopo 3 dritti e 4 palle corte (381 °/s) il colpo tipico
  era 381 e il dritto si leggeva **piatto** (forza 0,691 contro 0,512), il tagliato 0,592 contro 0,399; uguale per destro
  e mancino, calibrazione con il braccio e con l'animazione. Dopo: colpo tipico 670, dritto topspin 0,491, tagliato 0,415,
  piatto piatto. I due test nuovi falliscono senza la correzione (prova fatta rimettendo il codice vecchio).
- [x] B12.2 (`4ba8b49`) · `.github/workflows/*.yml`: actions/checkout, actions/setup-node, actions/upload-artifact da v4
  a v7 (Node 24; Node 20 tolto dai runner il 16/09/2026). Note di rilascio lette: nessun cambiamento per questi
  workflow.
- [x] B12.3 · versione **2026-11-07.5** (`site/js/tennis/version.js`, `site/tennis/build.json`, prima riga di
  `natpf-tennis/lan/LEGGIMI.txt`), novità in `natpf-desktop/novita.txt` (la vede chi aggiorna dal gioco).
- Verifiche: gioco 875/875, sito 195/195, LAN 12/12, programma Windows 28/28, build ok; nel browser
  `natpf-gesti-speciali` 9/9, `natpf-rally` 7/7, `natpf-training-flow` 18/18. Zip Cloudflare
  `natpf-simulator-cloudflare-20261107-5.zip` 22.560.092 B (127 file), sha256
  `65d242c8f143b92f4d1c0ee157816dcc19e91d4043deb5ad83c19f3333dd6d96`, provato estratto (versione 2026-11-07.5, nessun
  errore della pagina; 404 attesi solo su `/api/match/state` e `/lan/status` con un server statico).
- Non verificato: telefoni veri (la forza percepita in partita), il primo aggiornamento dal gioco 07.4 → 07.5 su
  Windows (lo prova l'utente).
- GitHub dopo il push (`1b2d3b7`, azioni v7): «NATPF eseguibili Windows» verde, installer 2026-11-07.5 pubblicato su R2
  (124.580.634 B, sha256 `7c037ab5768af33f77a0d4128719cd0506cc07c61a992aee137069e6c087fc5a`, `latest.json` con la novità
  e il link fisso controllati dall'indirizzo pubblico), niente più avviso «Node.js 20 is deprecated» nei registri;
  «NATPF motore base MVP» verde; «NATPF Simulator tests» rosso in `gesture-calibration.mjs:73` (servizio col telefono
  del sito: `toss: null` al secondo gesto) al primo tentativo e alla ripetizione dei soli job falliti (in quella
  anche `timing-browser` era rosso al primo e verde al secondo). In locale `gesture-calibration` 18/18 due volte su due
  con lo stesso codice; B12 non tocca `site/js/tennis` né la prova: punto aperto noto (passaggio di consegne §3.10).

## B13 · Prova gesture-calibration stabile, gesti del tutorial con la fisica del braccio · [x] · 07–08/11/2026
- Richiesta: «sistema la prova gesture-calibration. In parallelo, rivedi ancora i gesti del tutorial, il dritto non mi
  sembra tale e ci sono troppi colpi che non simulano la fisica del movimento del braccio con il telefono in mano».
  Due rami paralleli (`b13-gc`, `b13-gesti`), ciascuno con revisione indipendente.
- [x] B13.1 (`9f9ca9e`, `209cda6`, `67845e6`) · `tools/e2e/gesture-calibration.mjs`, `tools/e2e/README.md`,
  `docs/b13/gesture-calibration-ci.md`. Causa riprodotta con la CPU frenata via CDP: la prova fermava il gioco con
  `A.netPause` all'apice del lancio; con la pausa `main.js` non registra i fotogrammi e `presented.seenAt` scarta un gesto
  fatto più di 0,8 s dopo l'ultimo (`INPUT_TIME.maxAge`): sui runner lenti il secondo gesto arrivava oltre, la palla
  ricadeva (`toss: null`) e la prova scadeva alla riga 73. Il gioco vero non è difettoso (ogni ripresa chiama
  `resetInputTimeline()`). Correzione solo nella prova: fermo immagine facendo avanzare il motore con dt = 0 e fermando il
  disegno; `CPU_THROTTLE=<n>` frena la CPU dal servizio in poi. Prima con CPU ×4: 0/5; dopo: 12/12 (revisore 10/10, anche
  ×6, ×8, ×10 e gesto in ritardo). `timing-browser` ha una causa diversa (messaggio del telefono finto oltre 3 s sul
  runner lento): non corretto, annotato in `docs/PASSAGGIO_CONSEGNE.md` §3.10.
- [x] B13.2 (`e82f35b`, 12 commit del ramo uniti in uno perché alcuni intermedi avevano test rossi) ·
  `natpf_gesture_pose.js` (catena spalla-gomito-polso con segmenti fissi e limiti delle articolazioni, telefono rigido nel
  palmo, `gestureRig` con le articolazioni vere, `tC` salvati nelle coreografie), `natpf_gesture_demo.js` (braccio intero
  dalla spalla, busto, testa, manica blu, fantasmi di avambraccio e mano, camere nuove), `test/natpf-gesture-physics.test.mjs`
  (12, nuovo), `test/natpf-gesture-anim.test.mjs`, `tools/e2e/natpf-gesti-fotogrammi.mjs`, `docs/b13/analisi-gesti.md`,
  `docs/b13/gesti-nuovi.md`. Riconoscimento non toccato; `natpf-gesture-pose` (14) e `natpf-racchetta` (26) non modificati.
  Cambiati due controlli di disegno del dritto scritti nel B9 (palmo che spinge da ≥ 0,3 a ≥ 0,1; «mano ≥ 4 cm sotto la
  palla» → «punto più basso non sopra il contatto») e il test delle etichette dei fantasmi (camere che seguono la mano).
  - Dritto: carica con le spalle a −38° e la mano dietro il busto; impatto davanti a destra (0,29; 0,98; −0,37) con il
    gomito staccato 0,33 m e flesso 59°; una sola frenata; fine sopra la spalla sinistra a 1,45 m. **Mano all'impatto in
    diagonale avanti-sinistra, 57° dalla rete (prima 77°)**: con la presa nel palmo e i limiti del riconoscimento non
    può andare dritta con il palmo davanti (`docs/b13/gesti-nuovi.md` §0).
  - Servizio: gomito 34° all'impatto (prima 80°), polso a 1,93 m, mano e telefono mai nella testa; ancora 2 gesti a
    0,8×, 1× e 1,25×. Schiacciata: gomito 28°, fine in avanti e giù a 1,40 m. Rovescio: impatto 0,37 m davanti con il
    gomito a 20° (prima 86°), mano a 5,4 m/s (prima 2,46), avambraccio mai nel busto. Volée: mano in avanti (prima
    tornava verso il corpo), camera più bassa. Incrociato con coreografia propria.
  - Disegno a 640×400: 1,27 ms per fotogramma, 3,10 ms con la rasterizzazione (limite 4).
- [x] B13.3 · versione **2026-11-08.1** (`version.js`, `build.json`, `LEGGIMI.txt`), novità in `natpf-desktop/novita.txt`.
- Verifiche sul branch unito: gioco 887/887, sito 195/195, LAN 12/12, programma Windows 28/28, build ok; nel browser
  `gesture-calibration` 18/18 e con `CPU_THROTTLE=4` 18/18, `phone-only` + `timing-browser` 8/8, `natpf-modale-gesti`
  18/18, `natpf-gesti-fotogrammi` 31/31, `natpf-gesti-sequenze` 47/47, `natpf-gesti-speciali` 9/9, `natpf-training-flow`
  18/18, `natpf-tutorial-phone` 37/37, `natpf-tutorial-relink` 8/8. Zip Cloudflare `natpf-simulator-cloudflare-20261108-1.zip`
  22.565.946 B (127 file), sha256 `348899623679808b7cd6322dae0eb83c5b2e9a60d7ac98878066a047cf5a3cf0`, provato estratto
  (versione 2026-11-08.1 nel gioco e nella pagina del telefono, nessun errore; 404 attesi solo su `/api/match/state` e
  `/lan/status` con un server statico).
- Non verificato: telefoni veri, persone vere che imitano l'animazione, Windows; l'utente non ha ancora visto i fogli.
  Restano: dritto in diagonale, servizio con poca pronazione, volée vicina al centro, pendolo del pallonetto poco
  visibile, busto che anticipa la mano di soli 6–16 ms; margini sottili ma dentro i test (picco del piatto 1144 su 1150,
  carica della volée 15° su 15°, fermo del pallonetto 0,030 s su 0,04 s).
- Decisioni chieste all'utente: sagoma del busto sì o no; racchetta fantasma o braccio libero in servizio e schiacciata;
  camera alta da dietro (stile TV) per i colpi da fondo.
- GitHub dopo il push: «NATPF Simulator tests» **verde** su `e82f35b` (esecuzione 109) e su `e5c4469` (110), con
  `gesture-calibration` al primo tentativo; «NATPF motore base MVP» verde; «NATPF eseguibili Windows» verde e installer
  **2026-11-08.1 pubblicato su R2** (124.574.121 B, sha256 `4000b1b74ec837f0ce415b923b14b2f0595478d5a49d8d28289aeb7160753204`,
  `latest.json` con la novità e link fisso `windows/NATPF-Simulator-Setup.exe` controllati dall'indirizzo pubblico).

## B14 · Dritto: limite smentito, camere più basse, orientamento del telefono · [~] · 08/11/2026
- Seguito del B13 (stessa richiesta: «il dritto non mi sembra tale»). Indagine in tre rami locali con verifiche
  indipendenti (brief in scratchpad, riassunti qui):
  - (A) **Vincolo del B13 smentito**: dritto con la mano a 32,8° dalla rete (prima 56,7°) senza toccare il riconoscimento,
    887/887, 40/40 letture, 0/72 errori con le prese di chi imita; il limite veniva dalle bande dell'ottimizzatore del B13.
    Vincoli veri con file e righe in `docs/PROJECT_MEMORY.md` (gesti B13). **Non integrato**: il verificatore ha visto nei
    fogli un guadagno modesto e alcuni peggioramenti (contatto più basso e arretrato, palmo meno davanti).
  - (B) **Camere** (integrato, `1b779d2`, `2b7d0b6`): dritto da dietro a sinistra e in basso (azimut −55°, elevazione 15°),
    la camera segue meno la mano (`follow.mixSmall`); lungolinea, incrociato, piatto, rovescio ritoccati. Sullo schermo
    «avanti» e «in alto» ora distinti di 78° (prima 20°), mano all'impatto 9° dalla direzione della rete sullo schermo
    (prima 59°), salita dopo l'impatto +0,28 dell'altezza (prima scendeva di circa 7 px). Moto identico (verificato su
    40.700 campioni). Nuovo test `natpf-gesture-camera.test.mjs`; prototipo della testa di racchetta fantasma **spento**
    (`GHOST_RACKET = false`: con l'orientamento di oggi mostrerebbe la racchetta verso la rete all'impatto).
    Documento `docs/b14/camera-dritto.md`.
  - (C) **Revisione a occhi nuovi** di tutte le schede: il problema del dritto è l'**orientamento del telefono** (la cima,
    cioè la racchetta virtuale, punta alla rete in carica; all'impatto palmo e schermo guardano chi gioca; la testa della
    racchetta va a 89° dalla rete). Altri punti: volée che spazza invece di spingere, fine di servizio e schiacciata
    troppo alte, tenute finali di 0,03 s, palla corta troppo vicina, fascia del grafico che copre pose chiave, fantasmi che
    sembrano braccia in più, busto a pezzi con la testa trasparente, manica troppo grande.
- [x] B14.1 · versione **2026-11-08.2** (`04a702d`: correzioni ai commenti e ai documenti delle camere, vincolo smentito nei
  documenti, novità). Verifiche: gioco 891/891, sito 195/195, LAN 12/12, programma Windows 28/28, build ok; nel browser
  `gesture-calibration` 18/18, `natpf-modale-gesti` 18/18, `natpf-gesti-fotogrammi` 31/31, `natpf-gesti-sequenze` 47/47,
  `natpf-training-flow` 18/18, `natpf-tutorial-phone` 37/37, `natpf-tutorial-relink` 8/8. Zip Cloudflare
  `natpf-simulator-cloudflare-20261108-2.zip` 22.566.432 B (127 file), sha256
  `cf51aa20614d0bfa5519f0fa7829ff9d3004fae6e3b7972b982888ccb10fd4f6`, provato estratto (versione giusta, nessun errore).
  GitHub: tre esecuzioni verdi; installer **2026-11-08.2 pubblicato su R2** (124.594.293 B, sha256
  `18559a5198a3a6294102af8d2f3a3c7f866c815351bfc5cb881fe8bcbc5049a8`, `latest.json` controllato).
- [x] B14.2 · tre rami di lavoro con verifiche indipendenti, poi integrazione con una seconda verifica (verificatore e
  revisione da allenatore dei fogli). Cosa è entrato e cosa no:
  - (D) dritto con la racchetta portata indietro e il palmo verso la rete: **non integrato**. La versione verde del ramo
    (coreografia dell'indagine A più fine tenuta) era letta tagliato con le prese di chi imita a 1,2–1,25× (nessun test lo
    copriva) e la salita della racchetta letta all'impatto quasi spariva. Il candidato «da manuale» (cima a 116° in carica,
    schermo a 2° dalla rete, testa a 19°, discesa di 14 cm) è misurato ma fallisce fedeltà a 1× (presa a martello,
    calibrazione con l'animazione), le regole del disegno (nessuna camera ferma su 168) e dura ~4 s: è un dato di studio
    in `docs/b14/dritto-orientamento.md` e `docs/b14/dritto-lungo.over.json`.
  - (F) altri colpi: **integrati** schiacciata con l'accompagnamento fino alla vita a sinistra (`636f9c6`, camera
    `2435d55`), camere nuove di palla corta (da dietro a sinistra, bassa, con la testa: prima un primissimo piano di lato),
    tagliato (il telefono non sta più dentro la testa) e pallonetto (palla e fine nel quadro). **Non integrati**: servizio
    nuovo (terzo gesto a 1,05–1,225×), volée nuova (letta palla corta a 1,1–1,225×), fine tenuta 0,3–0,4 s e relativa
    «PROPOSTA» sul test dei tempi: il ritorno cadeva a 0,7–0,9 s dall'impatto (oltre 0,9 s a 0,8×), fuori dalla finestra
    del rientro del rilevatore (`swing-detect.js` recoverLate 900 ms), e il pallonetto perdeva il margine a 1,26×.
  - (E) disegno: **integrato** (9 commit): fantasmi di sola mano e telefono, «Carica» spenta dopo il contatto, busto
    pieno con l'occlusione velata, manica opaca, banda della curva più bassa con il soggetto sopra, palla dietro il
    telefono all'impatto, frecce dentro lo stadio, 200×200 senza tagli, «Fine» del servizio alla fine vera.
  - Correzioni dell'integrazione (`ffb56b6`, `e4ec1d0`): palla del lancio visibile fino al bordo (448×280), etichette dei
    fantasmi che si spengono con il contorno, palla dietro il telefono di nuovo a metà opacità (con il solo contorno nel
    piatto spariva), busto anche nella palla corta, contorno chiaro della sagoma (la testa spariva sul fondo), ombra
    della mano solo con la camera ferma.
  - **Prova nuova** `natpf-tennis/test/natpf-gesture-speeds.test.mjs` (`71e09d1`): sette velocità intermedie 0,85–1,2× per
    tutte le schede e le nove prese di chi imita a 1,2× (~10 s); prova di mutazione: fallisce sui rami di lavoro del
    servizio e del dritto, passa sull'integrazione.
  - Fogli `docs/b9/img/C-anim-*.webp` rigenerati con l'animazione di oggi (la prova `natpf-gesti-fotogrammi` li scrive lì
    se non si dà `OUT`; erano già stati aggiornati per sbaglio in `e5c4469` e `bc81551`, con l'animazione di allora).
- [x] B14.3 · versione **2026-11-08.3**. Verifiche sull'integrazione: gioco 894/894, sito 195/195, LAN 12/12, programma
  Windows 28/28, build ok; nel browser `gesture-calibration` 18/18, `natpf-modale-gesti` 18/18, `natpf-gesti-fotogrammi`
  31/31, `natpf-gesti-sequenze` 47/47, `natpf-training-flow` 18/18, `natpf-tutorial-phone` 37/37, `natpf-tutorial-relink`
  8/8. Letture con il telefono simulato **identiche alla base 04a702d**: griglia dei test 736/736, velocità da 0,80 a
  1,25× ogni 0,025 1658/1672 (gli stessi 14 errori di prima: piatto con la presa a martello un poco più veloce letto top
  spin), prese di chi imita a 0,9/1,1/1,2× 1148/1152 (gli stessi 4: volée 50/25 a 0,9× letta pallonetto), sei semi
  528/528. Disegno a 640×400 con la rasterizzazione ~3,2 ms (limite 4; prima ~3,0).
  Zip Cloudflare `natpf-simulator-cloudflare-20261108-3.zip` 22.569.223 B (127 file), sha256
  `2bc8792336c13a9fc2559c22bd9fe8d9eac85fdd3b385a59b8dd434d5084487f`, provato estratto (versione giusta, nessun errore).
  GitHub (`ddd4428`): tre esecuzioni verdi; installer **2026-11-08.3 pubblicato su R2** (124.609.974 B, sha256
  `d5ead1f7d34583c64abdabe74aeed58190f87d48c7603a93dc80d03527fb2f79`, `latest.json` controllato).
- Non verificato: telefoni veri, persone vere, Windows; l'utente non ha ancora visto i fogli.

## B15.B · Mancini: tutto uguale al destro (ramo `b15-mancini`) · [~] · 08/11/2026
Richiesta dell'utente: «Assicurati che per i giocatori mancini sia tutto uguale». Criterio: lo stesso gesto a specchio dà
lo stesso colpo, la stessa forza, la direzione a specchio e la stessa esperienza (calibrazione, tutorial, webcam, stesso
schermo, 1v1); per il destro non cambia niente. Inventario e prove in `docs/b15/audit-mancini.md`.
- [x] B15.B.1 · primo giro (commit `10a886a`, `1a8a37f`, `d696253`, push no, pacchetti invariati): calibrazione con il
  dritto per primo anche al mancino (A), webcam per due con il P2 mancino (B), `natpfP2Hand` dello stesso schermo (C),
  calibrazione in campo (G, `handedSide`), racchetta animata con la mano del personaggio (H); prova
  `test/natpf-mancini.test.mjs`, `HAND=left` in `natpf-training-flow` e `natpf-tutorial-phone`.
  File: `site/js/tennis/calibration.js`, `motion_controls.js`, `natpf_hand.js`, `natpf_split_ui.js`, `natpf_training.js`,
  `racket_kinematics.js`, prove · Verifiche: gioco 902/902, sito 195/195, LAN 12/12; training 20/20 e 20/20, tutorial
  38/38 e 38/38.
- [x] B15.B.2 · secondo giro dopo una verifica indipendente (commit `bed5531`, `512a4f7`, `a766eb5`, `b6312db`,
  `49f6cda`, `38507b9`, `67e19f9` e documenti; push no, pacchetti invariati):
  1. regressione di A: percorso della calibrazione fissato all'avvio (`S.plan`), il cambio di mano a metà non la fa più
     fallire; 2. palla del servizio nella mano libera anche del P2 mancino (`NatpfHand.handOf`); 3. 1v1 tra due computer:
     la mano viaggia nei due sensi appena è nota (`hand=` nella lettura del P2, `p2Hand` dal relay, `p1Hand` negli
     snapshot; campi facoltativi, compatibili con le versioni di prima); 4. carica del corpo dalla palla con la mano;
     5. mano del P2 e specchio dell'avversario azzerati a fine sessione (e la mano del pannello nel motore solo a sessione
     in corso); 6. «Sinistra» anche nel riquadro del P2. Ricerca: testa, inclinazione, polso e comandi del personaggio
     specchiato (lo specchio rovesciava le grandezze laterali del campo: fino a 0,8 m sulla mano); lato di un colpo senza
     `side` con la mano (cinque punti di `game_engine.js`).
  File: `site/js/tennis/calibration.js`, `site/js/tennis/racchetta.js`, `natpf-tennis/scripts/match-relay.mjs`,
  `src/game_engine.js`, `src/motion_controls.js`, `src/player_body_animation.js`, `src/racket_kinematics.js`,
  `src/natpf/natpf_hand.js`, `src/natpf/natpf_split_ui.js`, `src/natpf/natpf_ui.js`; prove nuove
  `test/natpf-mancini-mondo.test.mjs` (5), 5 prove in più in `test/natpf-mancini.test.mjs` (13), `tools/test/phone-screen`
  (+1), controllo della mano in `tools/e2e/natpf-1v1-p2p.mjs`. Ogni prova nuova fallisce sul codice di prima.
  Verifiche: vedi la voce B15.B.3.
  Non verificato: telefoni veri nella mano sinistra, webcam vera con un mancino, due computer veri, una build vecchia
  davanti a una nuova (solo campi assenti nel mondo di prova), il personaggio specchiato guardato a occhio.
- [x] B15.B.3 · verifiche del secondo giro (ramo a `ceb94f9`, nessun push, pacchetti invariati): gioco 912/912
  (`npm test`), sito 196/196, LAN 12/12; le 10 prove nuove falliscono tutte su `d696253` (8/18 nei due file dei
  mancini, `phone-screen` 11/12). Browser (Chromium, telefono simulato, porte 3720-3729): `natpf-training-flow`
  HAND=right 20/20 e HAND=left 20/20; `natpf-tutorial-phone` HAND=right 38/38 e HAND=left 38/38 (primo tentativo 32/34
  con il computer carico da altre prove in parallelo, rifatto da solo); `natpf-split-ready` 34/34; `natpf-1v1-p2p` 39/39
  (due controlli nuovi della mano); `natpf-1v1-webcam-p2` 15/15 due volte (una volta 13/15 sotto carico; il codice di
  prima 15/15). Build di produzione ok.
