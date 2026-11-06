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
