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

## B15 · Audit della sensibilità e della precisione dei colpi (ramo «colpi») · [~] · 08/11/2026

Richiesta dell'utente (08/11): «migliorare la sensibilità del dispositivo e la precisione dei colpi rispetto ai gesti
eseguiti: tutti gli scambi vanno quasi sempre nella stessa direzione con stessa velocità e angolazione». Audit completo con
i numeri in `docs/b15/audit-colpi.md`. Lavoro su un worktree a parte (ramo locale `b15-colpi`, base `8a996e3`), da integrare.

- [x] B15.1 · banco `natpf-tennis/scripts/audit/colpi.mjs` (`404bb36`): telefono simulato mosso dal braccio → messaggio →
  `natpfSwingToEngine` → motore headless → fisica fino al rimbalzo; velocità del gesto 0,4…1,6×, piatto −30…+30°, tempo
  −1…+1 finestre, dritto/rovescio, palla 0,7…1,8 m, livelli, 240 colpi di una «persona normale» (p10/p50/p90 e R² per
  ingresso), sequenze di dieci colpi uguali con i riferimenti che imparano. `test/phone-sim.mjs`: `game(d, { learn: false })`
  e `models` esposti. Prima: 0,6× → 1,6× del proprio colpo 82 → 123 km/h (×1,50); dieci dritti girati di 20° cadevano da
  2,88 a 1,06 m; dieci colpi a 1,5× passavano da forza 0,80 a 0,65 dal sesto; alternando dritto e rovescio girati di 20°
  da 2,9/3,5 a 1,4/1,6 m.
- [x] B15.2 · correzioni (`5bda836`), ognuna con misura prima/dopo nel commento della costante e nel documento:
  `AIM` verifyDev 35 → 20°, biasDev/commonDev 12/8 → 25° con isteresi (biasLow/commonLow 10°), pull 0,3 → 0,2, drift
  0,03 → 0,01 (`natpf_gestures.js`); `TYPICAL.keep` 9 → 24 (`natpf_phone_racket.js`); tetto del volo base 1,2 → 1,5
  (`game_engine.js` `_natpfRacketShot`); `OUTCOME.topClearSoft` 2,5 m, `clearCurve` 1,5, `topSpinPower` 8, `smashSpeed`
  46 → 48 (`natpf_stroke_outcome.js`). Dopo: 77 → 124 km/h (×1,62) con il colpo tipico fermo a 92,6 km/h e 9,2 m; dieci
  dritti a 20°: 2,83 → 2,54 m; a 1,5×: forza 0,80 → 0,80; alternati: 2,8/3,5 → 2,7/3,6. Piatto 15° → 1,7 m, 30° → 3,3 m,
  tempo ±1 → ±3,6 m, dritto e rovescio equivalenti: già così, invariati. Test nuovo `test/natpf-colpi-b15.test.mjs` (6):
  con i sorgenti della base falliscono 4 su 6 (prova di mutazione).
  Verifiche: gioco **900/900**, sito 195/195; `rally-balance --points=150` (punti vinti, prima → dopo): Casual medio 93,1 →
  94,9 %, amatore 85,3 → 86,4, tennista 98,7 → 98,7, umano 90,0 → 89,6; Pro medio 65,8 → 64,7, amatore 60,7 → 61,3, tennista
  96,7 → 96,4, umano 76,7 → 73,8. `audit:legend` (300 punti, 8 semi): pro contro medio **84,1 % dei game (criterio 70–85;
  alla base 85,3 %, KO)**, casual contro medio 100 %; i due criteri di Leggenda già KO alla base peggiorano (CPU contro
  «tennista» 74,5 → 67,3 %, criterio ≥ 85; contro «preciso» 37,4 → 25,9 %, criterio ≥ 60): i colpi forti dei profili forti
  sono più tesi e la Leggenda li prende meno (con 3 semi il tetto del volo da solo non li cambia: è l'altezza sulla rete
  dei colpi forti). Browser (Chromium, porte 3605–3608): `natpf-rally` 7/7, `natpf-gesti-speciali` 9/9.
- Non cambiato e perché: ritmo (`RHYTHM`, decisione del 28/10), soglie del tipo di colpo (fedeltà del tutorial), zona
  morta e scarto della mira (15° → 1,7 m e 30° → 3,3 m già così), soglia minima del gesto (40 % del colpo tipico con il
  verso atteso: sotto ci sono preparazioni e rientri), metà relativa della forza.
- [x] B15.3 · **secondo giro** dopo la verifica indipendente («integrare con correzioni»: con la distribuzione dei gesti di
  una persona vera x e profondità identiche prima e dopo, solo i km/h cambiavano; mira piena tenuta +30° ×14 finita a
  0,63 m, base 1,20; il «prima» del documento non si riproduceva). Commit `cbecf4b`, `2d57a96`, `8653af4`, `a1165b6`,
  `9347b28`, `58fb8e0` più i documenti:
  - banco `colpi.mjs`: modalità «persona vera» (`--mode=reale`: tempo +0,35 ± 0,45, piatto ±12°, gesto 1 ± 0,3 del colpo
    tipico, 400 colpi nelle funzioni vere: `createAimModel`, `strokeIntent`, motore con il ritmo), mano (`--hand=left|both`:
    gli stessi gesti allo specchio), sequenze +30° ×14, seme della calibrazione sbagliato di ±15° (24 partite). «Prima»
    rigenerato sopra `8a996e3` (gesto 1,2× = piatto a 111,5 km/h; alternati +20° D/R 2,47/3,42 m);
  - isteresi del centro della mira a due velocità (`AIM.biasLow/commonLow` 20°, poi `biasSlow/commonSlow` 0,05 fino a 10°):
    +30° ×14 → 2,50 m; riferimento girato di 35–40° recuperato in una trentina di colpi;
  - `INTENT.faceSpan` 20 → 14 (mira piena a 17°): x della persona vera p90−p10 6,17 → 6,82 m, oltre 2,5 m 30 → 37 %;
  - `INTENT.relGain` 0,6 → 0,9 per l'esito (tipo di colpo, super e barra con la pendenza di prima: `typePower`,
    `classGain`, `superStrength`): km/h p90−p10 39,3 → 44,1 (base 33,4), profondità 2,90 → 3,35 m (base 2,72), tipi identici
    con il colpo tipico fisso del banco (correzione del terzo giro: con il colpo tipico che impara `TYPICAL.keep` 24 scambia
    17 colpi su 400 tra piatto e top spin; su 1200 colpi circa il 7 % dei piatti diventa top spin);
  - seconda verifica del seme (`AIM.recheck` 6 colpi per verso, 6–12°, una volta, non con dritto e rovescio in versi
    opposti): seme sbagliato di ±15°, errore del centro al 40° colpo (con il segno) −3,9/+3,2° base, −7,4/+5,6° primo giro
    → −1,2/+1,4°; seme giusto 1,4 → 2,1° medio assoluto.
  Verifiche: gioco **907/907** (7 prove nuove in `natpf-colpi-b15`, ognuna rossa con i valori di prima; `natpf-sessione-23-10`
  «mira dal piatto» aggiornata alla curva 3–17°); sito **195/195**; `rally-balance` (600 punti) Casual medio 93,2 → 94,2 %,
  Pro medio 65,3 → 65,8, Pro umano 76,7 → 74,0; `audit:legend` identico al primo giro (pro contro medio 84,1 %); browser
  (porte 3620–3623) `natpf-rally` 7/7, `natpf-gesti-speciali` 9/9. Mancino: persona vera specchio esatto (x, profondità,
  tipi; km/h tranne l'effetto dei tagliati, legato al lato del campo nel motore).
  Rischi dichiarati in `docs/b15/audit-colpi.md` §5: Leggenda contro «tennista» 74,5 → 67,3 % e «preciso» 37,4 → 25,9 %
  (criteri già KO alla base, dal motore del primo giro), webcam più veloce in cima (121,8 → 127,4 km/h a forza piena, x e
  profondità identiche), `clearCurve` anche su piatto, tagliato e palla corta (fino a 4 cm più bassi), seme: una mira dalla
  stessa parte con dritto e rovescio nei primi 6 colpi per verso si toglie.
- [x] B15.4 · **terzo giro** dopo la seconda verifica indipendente («integrare con correzioni», un punto **bloccante**: con
  il rumore di chi gioca, piatto ±12° e dritti e rovesci mescolati, il centro della mira del primo e del secondo giro
  lasciava per partita più palle da una parte della base; le misure del secondo giro erano senza rumore o mescolavano le
  partite). Commit `012e017`, `b64f74f`, `bde7963` più i documenti:
  - banco `colpi.mjs --mode=partite` (`012e017`): 24 partite da 80 colpi della persona vera, ognuna giudicata da sola
    (|mediana x|, partite oltre 1 m da una parte, errore del centro; colpi 21–40/41–60/61–80): seme 0/±15/±25/±30°, seme
    diverso nei due versi, riferimento girato di 26–40° al 20° colpo, mira +18° con dritto e rovescio nei primi 16 colpi;
    `reale()` con `turnAt/turn`, `aimN/aimBias`, `seedErrB`, `makeAim` (anche in `simPhone`) per provare candidati;
  - **centro della mira di prima** (`b64f74f`): provati 20 candidati (isteresi e seconda verifica tolte una per una,
    `drift` 0,01, `biasDev` 16/20/25, `biasPull` 0,1/0,15, `verifyDev` 20/25, `commonDev` 6/7, `commonEnd` 4/5, `alpha`
    0,08 e combinazioni): nessuno è non peggiore del centro di prima in tutte le misure per partita e migliore sulla mira
    tenuta senza rumore (tabella in `docs/b15/audit-colpi.md` §3), quindi `AIM` torna quello di `8a996e3`. Per partita,
    semi ±15/±25/±30° |mediana x| 0,96/0,92/0,90 m (secondo giro) → 0,93/0,77/0,66 (base con `faceSpan` 20: 0,76/0,69/0,60);
    seme giusto 0,74/0,74/0,79 → 0,61/0,70/0,60, errore del centro massimo 8,9 → 4,4°; riferimento girato di 26–40°
    sbagliato dopo 60 colpi 9–11° → 4°; mira tenuta nei primi 16 colpi −2,38 → −1,54 m. Senza rumore la mira tenuta torna
    quella di prima (+30° ×14 dritti 2,50 → 1,75 m; mancino nel telefono simulato 0,92). `faceSpan` 14 resta;
  - non bloccanti (`bde7963`): `smashAt` e il colpo potente del motore (stelle, scossa, soglia 0,7) leggono la forza di tipo
    (`superStrength(intent, d)`: typePower dal telefono, power dagli altri; null non vale): colpo potente da 1,25× come
    prima (con la forza dell'esito era 1,2×), schiacciata dal gesto da 0,64× (era 0,71×); registratore con `forzaTipo` in
    `tel.colpo` e `racchetta` solo se c'è, `superNo` con la forza di tipo, visore che la mostra;
  - prove: `natpf-colpi-b15` 12 (tolte 5 del comportamento tolto: mira tenuta a 20°, isteresi, +30° ×14, due della
    seconda verifica; nuove 4: per partita seme ±15/0, riferimento girato 26/32/38°, mira tenuta nei primi 16 colpi con il
    mancino allo specchio, schiacciata e colpo potente con la forza di tipo, tutte rosse con `409c112`; la prova del piatto
    a 15° vale da −15° a +15° ≥ 5 m, prima 3,9–4,2, e ≥ 2 m per verso: la soglia 2,4 passava di poco, 2,36–2,46);
    `natpf-diag` +1 (`forzaTipo`).
  Verifiche: gioco **907/907** (`012e017` 907, `b64f74f` 905, `bde7963` 907); sito **195/195**; banco completo
  `--hand=both` prima e dopo (persona vera x p90−p10 6,08 → 6,92 m, oltre 2,5 m 31 → 37 %, profondità 2,72 → 3,29 m, km/h
  33,4 → 43,9; mancino specchio esatto, tagliati fino a 0,9 km/h); `audit:rally` (600 punti) identico al secondo giro
  (Casual medio 93,2 → 94,2 %, Pro medio 65,3 → 65,8, Pro umano 76,7 → 74,0); `audit:legend` identico al secondo giro
  (pro contro medio 84,1 %; Leggenda contro «tennista» 74,5 → 67,3 % e «preciso» 37,4 → 25,9 %, criteri già KO alla base);
  browser (Chromium, porte 3640–3643, nessun server lasciato acceso) `natpf-rally` **7/7** (cadute da −3,88 a +3,95 m),
  `natpf-gesti-speciali` **9/9**.
  Rischi in `docs/b15/audit-colpi.md` §7: Leggenda, webcam più veloce in cima, `faceSpan` 14 che satura a 17° (20° e 30°
  nello stesso punto) e che rende più visibili in metri gli errori del centro (semi sbagliati 0,76 → 0,93 m ai colpi 21–40),
  mira tenuta presa dal centro come prima, `TYPICAL.keep` 24 che scambia piatto e top spin, `clearCurve`. Opzione misurata
  non adottata: `AIM.commonDev` 6 (semi sbagliati 0,93 → 0,79 m, mira tenuta con i due colpi −1,54 → −1,64).
- Non verificato: telefoni veri, persone vere, rumore dell'orientamento dei telefoni veri, webcam nel browser, Windows,
  pacchetti (il ramo va integrato prima).
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
## B15-UX · Flusso dall'accesso alla partita: audit e testi semplici (richiesta dell'08/11) · [~] · 08/11/2026
Obiettivo: rivedere il flusso intro → menu → modalità → racchetta → Collega → tutorial → calibrazione → partita (computer e
telefono), togliere ridondanze e testi lunghi; cambiamenti solo sicuri (testi, una regola CSS), le modifiche di struttura
restano proposte in `docs/b15/audit-ux.md` §4. Ramo di lavoro `b15-ux` (worktree), niente push da qui.
- [x] B15-UX.1 · audit con screenshot (`docs/b15/audit-ux.md`): computer 1280×720 e 1920×1080, telefono simulato 390×844 e
  412×915 per ogni schermata (QR, sensori, tutorial spento/acceso, calibrazione, pronto, servizio, pausa, velo, scollegato,
  sensori negati, stesso schermo); parole visibili per schermata misurate con uno script (`innerText`); passi dall'apertura
  alla prima palla: singolo 21, stesso schermo 29, 1v1 ≈ 35 (10 tocchi su 21 sono le schede del tutorial).
  Difetti trovati: tessera Smartphone con la presa vecchia («come il manico»); telefono «Pronto» con due frasi uguali; la
  riga della modale del tutorial ripetuta nel pannello in basso a sinistra; risultato dei minigiochi con i pulsanti sotto il
  piè di pagina a 1280×720; «Guida» e «Come si gioca» per la stessa finestra.
- [x] B15-UX.2 · testi brevi e coerenti (commit `40a910c`): `natpf-tennis/index.html` (menu, modalità senza sottotitolo e
  con due righe per tessera, racchetta, Collega, Opzioni, minigiochi, nickname, stesso schermo, webcam per due, ospite,
  calibra lo schermo), `src/natpf/natpf_tiles.js`, `natpf_lobby.js`, `natpf_tutorial.js` (scheda «posizione», riga in
  fondo), `natpf_cal_view.js` (gesti e verifica), `natpf_training.js` (consigli degli esercizi, lezione webcam, pannello
  sotto la modale senza la riga doppia), `natpf_onboarding.js` (6 schede della guida), `natpf_ui.js` (pannello del
  telefono, errori dei sensori, webcam), `natpf_split_ui.js` (stati delle metà, barra dell'avvio), `natpf_phone_watch.js` e
  `natpf_webcam_watch.js` (testi della pausa), `natpf-ui.css` (pannello nascosto sotto la modale; risultato compatto sotto
  780 px di altezza), `site/js/tennis/grip-art.js` (testi della presa: Collega, stesso schermo, fermo, lezione),
  `site/js/tennis/racchetta.js` e `racchetta.html` (schermate del telefono, consiglio dei colpi solo con i tocchi),
  `site/js/tennis/phone-screen.js` (testi del tutorial sul telefono); `test/natpf-lobby.test.mjs` («Senza telefono» al posto
  di «Niente da impugnare», stesso significato). Tenuti «polso e avambraccio» nei testi della webcam (requisito del modello,
  verificato dai test).
  Verifiche: `npm test` 894/894 · `node --test tools/test/*.test.mjs` 195/195 · `npm run build` ok · e2e `natpf-menu` 22/22,
  `natpf-training-flow` 18/18, `natpf-tutorial-phone` 37/37, `natpf-modale-gesti` 18/18 (una prima esecuzione 17/18 per i
  fps a 1280×720 sotto carico, 52,7 invece di 55; da sola 18/18).
- [x] B15-UX.3 · presa in tre frasi (commit `464db52`): `GRIPS.palmo.text` da 45 a 28 parole (guida scheda 1, pannello del
  telefono). Verifiche: sito 195/195, presa/guida 13/13.
- [x] B15-UX.4 · link «Senza telefono? Usa la webcam» anche nel testo scritto dalla lobby (prima l'HTML e il JS dicevano due
  cose diverse) e documenti (`docs/b15/audit-ux.md`, questo registro). Verifiche: lobby/flows/split/tutorial 91/91.
- [x] B15-UX.5 · screenshot «dopo» a 1280×720, 1920×1080 e telefono (390×844, 412×915), parole «dopo» misurate (menu 60→54,
  modalità 164→98, racchetta 79→59, Collega 126→111, guida 4 119→64, tutorial 1 80→56; telefono «Pronto» 37→16, «Tieni
  fermo» 62→21, pausa 72→37), documenti.
  Non verificato: telefoni veri, persone vere, ledwall; i passi dei tre percorsi non cambiano (le riduzioni di passi sono le
  proposte 1–3 di `docs/b15/audit-ux.md` §4, da decidere con l'utente).
- [x] B15-UX.6 · secondo giro, proposta 4 (commit `ecb17ba`): una voce sola per la guida. Tolta «Guida» dal menu
  principale (apriva la stessa finestra di «Come si gioca» in alto); la fila in basso ha Classifica e Opzioni.
  File: `natpf-tennis/index.html`, `natpf-ui.css` (fila a 2 colonne), commenti in `natpf_lobby.js` e `natpf_onboarding.js`,
  `test/natpf-lobby.test.mjs` (frecce con la fila a due voci, più il caso a tre voci), `tools/e2e/natpf-menu.mjs` (cinque
  voci, sequenza `training,challenges,ranking,options,options,challenges`). Verifiche: `natpf-menu` 22/22.
- [x] B15-UX.7 · proposta 5 (commit `d87a0e9`): pagina «Partita» con in vista solo il livello della CPU e la riga «Altre
  impostazioni · 1 game · singolare · 3ª persona» (chiusa a ogni visita; dentro formato, durata, chi batte e visuale con gli
  stessi id di prima). Frecce: dalle tessere alla riga, Invio la apre; il fuoco iniziale va alla tessera scelta o a «Gioca».
  Stesso schermo: nascosta l'unica tessera «Stesso schermo». File: `index.html`, `natpf_lobby.js` (`matchSummary`,
  `matchMore`, `_paintMatchMore`, `_tiles`, Invio), `natpf-ui.css`, `test/natpf-lobby.test.mjs`, `test/natpf-flows.test.mjs`.
  Parole 90 → 70 e pulsanti 18 → 9 (CPU), 91 → 62 e 13 → 4 (stesso schermo).
- [x] B15-UX.8 · proposta 6 (commit `674cfbe`): telefono, «Attiva i sensori» con un solo pulsante grande. Riga «Mano
  [Destra] [Sinistra]» sempre in vista sopra il pulsante (la scelta resta nel `<select id="hand">` nascosto e passa dallo
  stesso `change` al computer: provato, il computer passa a «left»); «Gioca con i tocchi» come link (pulsante pieno con i
  sensori negati e in calibrazione); Movimento e «solo mentre tengo premuto» sotto «Opzioni» chiuse (`#moreOpts`, mostrato
  da `phoneView` insieme a `#profileOptions`). File: `site/tennis/racchetta.html`, `site/js/tennis/racchetta.js`
  (`paintHand`), `site/js/tennis/phone-screen.js`, `tools/test/phone-screen.test.mjs`, `tools/e2e/gesture-calibration.mjs`
  (apre «Opzioni», tocca «Sinistra»). Verifiche: sito 196/196, `gesture-calibration` 19/19 (copia temporanea di
  `run-local.mjs` sulle porte 3842/3843, tolta). Parole della schermata 39 → 26.
- [x] B15-UX.9 · stesso schermo a 1280×720 (commit `2abfa37`): nomi e «Due telefoni / Una webcam per due» in una riga;
  la barra dell'avvio passa da 585–657 px (sotto il piè di pagina, 630) a 511–583. La barra resta ferma mentre si
  aspettano i telefoni (scelta B9 per il ledwall 720×720). Verifiche: `natpf-split-ready` 34/34 (porte 3845/3846).
- [x] B15-UX.10 · pannello della calibrazione e degli esercizi in `cqw` (commit `8de3f58`): a 1280 invariato, a 1920×1080
  circa 614 px con consiglio a 23 px e titolo a 51 px (prima 460 px e 15 px fissi).
- [x] B15-UX.11 · proposta 3 non fatta (motivi e piano in `docs/b15/audit-ux.md` §6: mano della webcam solo in quella
  pagina, 10 prove nel browser e 6 file di test sulla tappa `controller`, conflitti con il ramo dei mancini nelle stesse
  righe di `natpf-training-flow` e `natpf-tutorial-phone`, racchetta dell'ultimo visitatore, easter egg). Documenti:
  `docs/b15/audit-ux.md` §6 (tabella prima/dopo, passi invariati 21/29/≈35, parole, dove sta ogni impostazione).
  Verifiche finali su `8de3f58`: `npm test` 896/896 · `node --test tools/test/*.test.mjs` 196/196 · `npm run build` ok ·
  e2e `natpf-menu` 22/22, `natpf-training-flow` 18/18, `natpf-tutorial-phone` 37/37, `natpf-split-ready` 34/34,
  `natpf-1v1-p2p` 37/37, `natpf-modale-gesti` 18/18 (una prima esecuzione 16/18 solo nei due controlli dei fps, con il
  computer carico dalle prove di un altro agente: 1,2 fps anche il campo da solo; rifatta a carico più basso 18/18). Screenshot «dopo2» (fuori dal repository) a 1280×720 + 390×844
  e 1920×1080 + 412×915. Non verificato: telefoni veri, persone vere, ledwall vero, lettori di schermo; la proposta 3.

## B15 · Integrazione: colpi, mancini e flusso, versione 2026-11-08.4 · [x] · 08/11/2026
- Richiesta dell'utente (08/11): «Fai un nuovo audit per migliorare la sensibilità del dispositivo e la precisione dei colpi
  rispetto ai gesti eseguiti. I colpi non sono ancora da campo aperto, anzi, tutti gli scambi vanno quasi sempre nella
  stessa direzione con stessa velocità e angolazione. Assicurati che per i giocatori mancini sia tutto uguale. Per quanto
  riguarda la UX UI, rivedi l'intero flusso dall'accesso al gioco fino alla partita. Semplifica eventuali ridondanze,
  testi lunghi, rendi tutto semplice e di facile lettura e comprensione.» Poi: «Quando hanno finito integra tutto e fai la
  versione nuova».
- Tre rami di lavoro (voci B15, B15.B, B15-UX sopra), ognuno con verifiche indipendenti a ogni giro (colpi: tre giri;
  mancini: due giri più una correzione dell'integratore; flusso: due giri), uniti nel ramo `b15-int`: merge `5013c3c`
  (colpi), `848c855` (mancini), `610f78b` (flusso), conflitti solo in questo registro.
- Correzioni dell'integrazione: `5fede84` (mancini: velocità e accelerazione in avanti non specchiate, prova a specchio
  con due scene di corsa in avanti), `c0c2d05` (verifica del flusso: avviso «Telefono scollegato» visibile anche sotto la
  modale del tutorial, prova nuova in `natpf-tutorial-relink` T, 8/9 → 9/9; «Altre impostazioni» che scorrono fino
  all'ultima riga sugli schermi bassi; 4° e 5° posto visibili nel risultato dei minigiochi; nomi coerenti; codice morto),
  `25183b0` (documenti dei colpi corretti come chiesto dalla verifica del terzo giro), `81329e8` (la prova del sito
  `gesture-calibration` sceglieva la mano sinistra ma faceva i gesti nell'ordine del destro: con il piano per mano la
  direzione imparata si invertiva, 18/19; ora segue il piano del telefono, 20/20).
- Che cosa cambia per chi gioca: la palla segue il gesto (dal colpo morbido al colpo forte 74 → 123 km/h e 7,7 → 11,2 m;
  nella distribuzione dei gesti di una persona vera direzione +12 %, profondità +17 %, velocità +29 %; girando il
  telefono di 15° la palla si sposta di 2,7–3,3 m invece di 1,9–2,3); per i mancini lo stesso gesto a specchio dà lo
  specchio esatto, calibrazione prima del dritto, racchetta e corpo a specchio, servizio con la mano libera, mano nel 1v1;
  testi più brevi su computer e telefono, pagina «Partita» con una scelta in vista, telefono con un pulsante grande e la
  mano sempre in vista, una sola voce per la guida.
- Verifiche sull'integrazione: gioco 927/927, sito 197/197, LAN 12/12, programma Windows 28/28, build ok. Nel browser:
  `gesture-calibration` 20/20, `phone-only` 10/10 + `timing-browser` 8/8, `natpf-menu` 22/22, `natpf-modale-gesti` 18/18,
  `natpf-gesti-sequenze` 47/47, `natpf-gesti-speciali` 9/9, `natpf-rally` 7/7, `natpf-training-flow` destro e mancino
  20/20, `natpf-tutorial-phone` destro e mancino 38/38, `natpf-tutorial-relink` 9/9, `natpf-split-ready` 34/34,
  `natpf-1v1-p2p` 39/39, `natpf-1v1-webcam-p2` 15/15, `natpf-schermo` 41/41. `natpf-gesti-fotogrammi` 30/31: il costo del
  disegno con la rasterizzazione è 4,26 ms contro 4, ma la base sulla stessa macchina dà 4,22 ms (macchina più lenta dopo
  il riavvio; il B15 non tocca il disegno dei gesti). Le prove con la macchina carica (altre prove in parallelo) avevano
  dato KO di sola velocità (fps della modale, tempi), tutti verdi ripetuti da soli.
- Revisione indipendente dell'integrazione: «pubblicare dopo correzioni». Unioni intatte (ogni riga dei tre rami presente),
  correzioni delle verifiche tutte presenti, letture e banchi identici ai rami (letture 736/736, sweep 1658/1672, imitatori
  1148/1152, semi 528/528; colpi del destro identici a `b15-colpi`), riga «Mano» del telefono che cambia davvero il piano
  di calibrazione (8/8 in tutte e due le mani). Corretti dopo la revisione (commit dopo `e32e021`): pannello degli esercizi
  del mancino dalla parte opposta al punto d'impatto (prova nuova in `natpf-training-flow`, 21/21 destro e mancino);
  «Gioca» della CPU che restava «In attesa del Player 2…» dopo «Sfida un amico» (c'era già prima); avvisi di «Collega il
  telefono» non più sotto la barra in basso a 1280×720; freccia della pagina vecchia del sito per il mancino; testo dei
  sensori negati uguale su computer e telefono. Non corretto (cosmetico, già presente): la foto della presa specchiata per il
  mancino ha la scritta dello schermo rovesciata. Dopo le correzioni: gioco 927/927, sito 197/197, `natpf-menu` 22/22,
  `natpf-1v1-p2p` 39/39, `natpf-tutorial-phone` mancino 38/38, `gesture-calibration` 20/20, `phone-only` 10/10.
- Versione **2026-11-08.4** (`version.js`, `build.json`, `LEGGIMI.txt`), novità in `natpf-desktop/novita.txt`. Zip
  Cloudflare `natpf-simulator-cloudflare-20261108-4.zip` 22.570.688 B (127 file), sha256
  `e5e67f5e5178a4398ba1d2364cbd03472ce5608aa59f6b0608bf584cce5c70de`, provato estratto (versione giusta, nessun errore).
  GitHub (`d888fb3`): «NATPF motore base MVP» e «NATPF eseguibili Windows» verdi, installer **2026-11-08.4 pubblicato su
  R2** (124.586.677 B, sha256 `95485927488451787ce2b86815cc0447e218333b430265a332cd63e3dfa15164`, `latest.json` con la
  novità controllato); «NATPF Simulator tests» rosso al primo tentativo solo in `timing-browser` (parte P2, attesa di 20 s:
  l'instabilità nota dei runner, §3.10 del passaggio di consegne; in locale 3/3 sullo stesso codice), verde alla
  ripetizione del solo job fallito.
- Decisioni chieste all'utente: `docs/PASSAGGIO_CONSEGNE.md` §3.13 (Leggenda, tutorial corto, riscaldamento facoltativo,
  mira più sensibile, unire le due pagine della scelta).
- Non verificato: telefoni veri (anche nella mano sinistra), persone vere, webcam vera, due computer veri, Windows.

## B16 (a) · Leggenda più dura (ramo `b16-legend`) · [~] · 08/11/2026
- Decisione dell'utente (08/11 sera) sulla domanda (a) del B15 (`docs/PASSAGGIO_CONSEGNE.md` §3.13): «Leggenda più dura:
  sì». Obiettivo: tutti i criteri di `audit:legend` rispettati con cambiamenti da giocatore più forte, senza trucchi
  visibili, casual e pro invariati, deterministico. Ramo locale da `7936011`, non pubblicato.
- Diagnosi (`audit:legend` alla base, 300 punti × 8 semi): CPU contro «tennista» 67,3 % dei game (criterio ≥ 85), contro
  «preciso» 25,9 % (≥ 60). Contro «preciso» il 43,4 % dei punti finiva con un errore della CPU (40,5 % fuori, 2,9 % in rete; errori per colpo 3,5 % sotto
  i 20 colpi, 11–27 % oltre: il colpo di chiusura sbagliava il 17–18 %), il 17,4 % con un vincente di chi gioca (sempre
  con la CPU oltre 2,3 m dalla palla, palle a 118–133 km/h vicino alla riga laterale, quasi sempre con la CPU già al suo
  posto), il 31,8 % con chi gioca in rete. Nessuna palla persa perché troppo alta o corta.
- Commit `5ffa530` · `natpf-tennis/src/natpf/natpf_legend.js` (solo `LEGEND` e due agganci): accelerazione / frenata
  14 / 22 → 20 / 28 m/s²; pressione degli scambi lunghi sulla CPU dal 20° colpo (prima dal 10°); chiusura misurata
  (`closeAggr` 0,45 → 0,15, `closeWiden` 0,6 → 0,25 m, `closePower` 0,85–0,95 → 0,72–0,85); `powerErr` 0,65 (errore da
  forza dell'esecuzione, `execLevel`), con la scelta che stima il rischio con le regole di Esperto (margine; `riskTrue`
  solo per l'audit); `angle` +0,01 all'incrociato stretto. `scripts/audit/legend.mjs`: otto casi nuovi nell'ablazione
  (ognuna delle modifiche tolta, e tutte: «come prima del B16»). `test/natpf-legend-b16.test.mjs` (5): controllo dei
  colpi forti con la scelta invariata, pressione dal 20° colpo, primo passo più rapido senza superare la velocità massima,
  chiusura e angolo, torneo ridotto (8 semi × 75 punti: chi gioca ≤ 33,5 % dei punti contro «tennista», ≤ 46 % contro
  «preciso», errori della CPU 2–6 %, incrociati 30–50 %, scambi chiusi ≤ 1 %). Sul codice di prima falliscono 5/5
  (torneo: 43 % dei punti a «tennista»).
- Commit `dc7c3d5` · `.github/workflows/natpf-tennis.yml`: passo «CPU Leggenda criteria (audit:legend)» dopo `npm test`.
- Prove nel browser: `tools/e2e/natpf-rally.mjs` applica le regole del livello di `DIFF` (prima cambiava solo il nome:
  la CPU restava alla velocità del livello caricato), stampa i colpi della CPU e li verifica (portata, corsa ≤ 8,8 m/s),
  `CPU_SHOTS=n` per i fotogrammi all'impatto della CPU. `tools/e2e/natpf-leggenda.mjs` nuovo: partita contro la Leggenda
  con il giocatore simulato «preciso», fotogrammi all'impatto, negli allunghi e nell'affondo.
- Verifiche, `audit:legend` (tutti i criteri rispettati; game della CPU prima → dopo): medio 92,2 → 97,7 %, amatore
  98,5 → 99,8, tennista 67,3 → 92,4, preciso 25,9 → 70,8, bambino 100 → 100, impreciso 99,8 → 99,8; errori della CPU per
  colpo 2,2–3,1 % (prima 3,4–5,3), incrociati 34,6–45,8 %, entropia 2,64–2,89, reazione p10 0,125 s (prima 0,133: solo la
  misura, la CPU supera prima la soglia di 0,3 m/s), velocità massima 8,6, scambi chiusi 0 %. Semi 201–208: tennista 93,0,
  preciso 70,0, tutti i criteri rispettati. Tabella completa e ablazione in `docs/NATPF_LEGGENDA.md`.
- Casual e pro: `audit:legend` contro «medio» pro 84,1 % e casual 100 % dei game, identici a prima; `audit:rally` (casual
  e pro, 7 profili, 600 punti) identico byte per byte alla base (md5 `1dfa083b…` su tutti e due).
- Test: gioco 932/932 (927 + 5 nuovi; 65 s di orologio su questa macchina con altri agenti al lavoro, di cui 15 s per il
  torneo ridotto), sito 197/197. Nel browser (porte 4500–4502, una alla volta): `natpf-rally` `DIFF=leggenda` 8/8 (CPU
  9 colpi, palla a 0,03–0,67 m dal corpo, corsa massima 8,00 m/s), `natpf-rally` `DIFF=pro` 8/8 (CPU 5,3 m/s),
  `natpf-leggenda` 6/6 due volte (il caso del motore nella pagina non è fissato: punti CPU 5–1 e 3–3, 73–74 colpi della
  CPU, 9 schemi, palla al massimo a 0,8–1,26 m dal corpo, allungo con racchetta e corpo verso la palla, corsa massima
  8,00–8,60 m/s; nelle prove di messa a punto allunghi a 1,18–2,27 m). Pochi punti nel browser (la partita va al ritmo
  vero, ~40 s a punto): il punteggio qui non misura la forza. Fotogrammi guardati: la CPU è sulla palla, si allunga verso
  le palle lontane, nessuno scatto.
- Provati e scartati (dettaglio in `docs/NATPF_LEGGENDA.md`): lettura più precisa, reazione 0,14 s, colpi più profondi,
  velocità 8,3 m/s, affondo più lungo, errore di tempo più piccolo, preferenza per tutti gli incrociati, errore ridotto
  anche sulla parte base (errori contro «amatore» sotto il 2 %), rischio vero nella scelta (entropia contro i deboli
  sotto 2,3).
- Non verificato: persone vere (la Leggenda potrebbe risultare frustrante: contro «preciso» chi gioca vince ancora il
  41 % dei punti, contro «tennista» il 27 %), telefoni veri, Windows. Il tempo di GitHub per `audit:legend` è stimato
  (~70–100 s), non misurato.
- **Correzioni della revisione indipendente** (esito «integrare con correzioni», 08/11 sera), stesso ramo:
  - `.github/workflows/natpf-tennis.yml`: il passo `audit:legend` è l'ultimo del job (dopo build, file del pacchetto e
    zip Cloudflare): prima stava subito dopo `npm test` e, se falliva, GitHub saltava build e controlli del pacchetto.
    YAML letto con PyYAML: 8 passi nell'ordine giusto.
  - `docs/NATPF_LEGGENDA.md`, tabella «Movimento», valori dal codice: velocità massima 8 m/s (`cpuSpeed`, era scritto 7),
    affondo al massimo 8,6 m/s (`lungeSpeed`, era 8,4) per palle tra 1,2 e 2,65 m (portata + 0,35), portata 2,3 m
    (`cpuReach`, era 1,85), errore di lettura 0,11–0,18 m (`cpuReadSd` 0,18, era 0,15–0,25).
  - Preferenza per l'angolo stretto (`angle` +0,01, tenuta): motivazione riscritta in `NATPF_LEGGENDA.md`,
    `PROJECT_MEMORY.md` e nel commento di `natpf_legend.js`. Ricontrollata sul banco (`angle` 0 contro 0,01, 8 semi × 300
    punti, tutti i profili): senza, tutti i criteri passano (incrociati: medio 31,8 %, amatore 37,1, tennista 36,0, preciso
    32,3, bambino 37,9, impreciso 35,1; game della CPU entro un punto); con, incrociati 34,6–45,8 % e l'incrociato stretto
    passa da 6,6 a 15,2 % dei colpi contro «medio», da 9,6 a 16,8 contro «amatore» (da 3,7–13,2 a 13,4–19,4 su tutti).
    Con la temperatura 0,014 il +0,01 raddoppia il peso di quel colpo (e^(0,01/0,014) ≈ 2,04).
  - Diagnosi: il 43,4 % dei punti contro «preciso» finiva con un errore della CPU (40,5 % fuori + 2,9 % in rete; prima
    era scritto 40,5 %, solo le palle fuori), in `NATPF_LEGGENDA.md` e qui sopra.
  - `PROJECT_MEMORY.md` (Leggenda): il torneo ridotto di `npm test` è deterministico, il margine contro «preciso» è di
    circa 3 punti (42,8 % dei punti con soglia 46), una modifica al motore (per esempio la tappa 2 dell'audit del
    gameplay) può richiedere di ritararlo; comando per rigenerare i numeri
    (`npm run audit:legend -- --table --difficulty=leggenda --profiles=tennista,preciso --points=75`, 10 s: tennista
    25,7 %, preciso 42,8 %, identici al test).
  - `tools/e2e/natpf-leggenda.mjs`: la verifica dell'allungo era tautologica (l'allungo letto era quello calcolato dalla
    distanza della palla) e passava anche senza palle oltre 1 m: le «6/6» di sopra non provavano l'allungo. Ora misura
    sul disegno le posizioni 3D all'impatto di centro del piatto (`NatpfPiatto`), mano destra e testa della CPU rispetto
    agli impatti normali della stessa prova; dopo i punti fa 4 allunghi forzati (CPU ferma, palla a 1,2/1,5/1,8/2,1 m);
    senza palle oltre 1 m stampa «NON ESERCITATA» e non passa; `ALLUNGO_SPENTO=1` spegne l'allungo del disegno e la
    verifica fallisce (provato: 4/4 fuori soglia, piatto, mano e testa a ±0,05 m dal posto normale). Prove (porte
    4700–4708, una alla volta): di base 7/7 (6 punti, 81 colpi della CPU, 9 schemi, nessun allungo in partita, 4 forzati
    con piatto +0,29–0,45 m, mano +0,29–0,45, testa +0,19–0,32 oltre il posto normale; 3 min 53 s). Trovato con la misura
    vera: con la CPU che corre o fa l'affondo verso la palla il piatto va fuori molto meno (+0,08–0,23 m; in una prova, palla
    a 1,51 m: +0,08 m, palla a 0,66 m dal centro del piatto), probabilmente per la racchetta del motore base che ruota con
    la velocità laterale: la soglia sul piatto è quindi 5 cm (mano ≥ 0,4 e testa ≥ 0,3 volte l'allungo previsto); il
    disegno non è stato cambiato. Il caso con `reachMax` 0 manda in NaN l'inclinazione (divisione per zero in
    `legendReachPose`): succede solo con quella configurazione di prova, la prova usa 1e-6 e `reachLean` 0.
  - Verifiche finali: `npm test` 932/932 (49 s), `npm run audit:legend` 69/69 (uscita 0, 67 s, righe identiche alla
    verifica del revisore), sito 197/197, `natpf-leggenda` 7/7. Non verificato: persone vere, telefoni veri, Windows,
    l'esecuzione del passo spostato su GitHub (il ramo non è pubblicato).

## B16 · Decisioni (b) e (c): tutorial corto prima della partita, riscaldamento facoltativo (ramo `b16-flow`) · [~] · 08/11/2026 sera
Obiettivo: decisioni dell'utente dell'08/11 sera sulle domande del B15 (`docs/PASSAGGIO_CONSEGNE.md` §3.13): (b) tutorial
corto prima della partita «Ok», (c) riscaldamento facoltativo «Ok». Criterio: meno tocchi dall'apertura alla prima palla
(contati nel browser, prima e dopo), nessuna lettura dei colpi peggiorata, compatibilità tra telefono e computer di versioni
diverse. Ramo locale da `7936011`, non pubblicato.
- [x] B16-flow.1 · tutorial corto (commit `c41723b`): `natpf_tutorial.js` con due serie, `short` (presa, posizione, dritto,
  rovescio, servizio) prima della partita contro la CPU, della sfida tra due computer (host), dei minigiochi e nello stesso
  schermo (ognuno il suo), `full` (11) nell'Allenamento dal menu e in «Rivedi i gesti». Le 5 sono le prime 5 delle 11:
  stessi indici, protocollo `tp` invariato (`n` = schede di quel tutorial). `NatpfPhoneRacket.tutorialSeenFor(set)` /
  `markTutorialSeen(set)`: visto il corto, l'Allenamento con lo stesso telefono riprende dalla sesta scheda; visto il
  completo, il corto non si ripete. File: `natpf_tutorial.js`, `natpf_phone_racket.js`, `natpf_training.js`,
  `natpf_split_ui.js`, `natpf_lobby.js`, test `natpf-tutorial` (2 nuovi), `natpf-split` (5 schede).
  Compatibilità: la pagina del telefono (`site/js/tennis/`) non cambia in questo ramo, quindi le prove nel browser qui sotto
  sono già «pagina di prima con il gioco nuovo»: riceve `n` 5, mostra «Scheda x di 5» e accende il pulsante con `all` o
  `s ≥ n` come prima (`phone-screen.gateOnProgress`, invariato); il gioco di prima con questa pagina manda 11 come prima.
  Nessun campo nuovo, nessun significato cambiato; le pagine senza `tv 2` (prima del B9) chiudono la modale come prima.
- [x] B16-flow.2 · riscaldamento facoltativo (commit `476d62b`): `natpf_lobby.startWarmup` porta in campo dalla pagina
  «Collega» solo per il tutorial corto e la calibrazione (`training.start({ calOnly: true })`), poi la pagina «Partita»
  («Racchetta pronta ✓», «Gioca» e «Riscaldati prima», prima «Rifai il riscaldamento»); telefono già calibrato, webcam,
  mouse: subito «Partita»; telefono pronto ma tutorial da vedere (visitatore nuovo, stesso telefono): solo il tutorial.
  Tappa «Calibrazione» al posto di «Riscaldamento»; «Calibrazione saltata» se si salta. Il riscaldamento (dritto,
  rovescio, servizio) resta in «Riscaldati prima» e nell'Allenamento.
  Letture dei primi colpi (richiesto: verificare che saltare il riscaldamento non le peggiori): banco nuovo
  `natpf-tennis/scripts/audit/riscaldamento.mjs` (telefono simulato con il braccio e la presa della foto, calibrazione con
  gesti a 0,3/0,6/1/1,3 del proprio colpo, 12 semi × 10 colpi di una persona, forza 1 ± 0,2, piatto ±10°; riferimento:
  lo stesso gesto letto da un telefono assestato con 24 colpi della stessa persona). Senza riscaldamento, con la
  calibrazione a colpetto (le diagnostiche: 143 °/s il 23/10 contro 670 del dritto), i primi 3 colpi avevano |Δforza|
  0,24 (0,3) e 0,20 (0,6) e 24 e 18 colpi su 120 di tipo diverso (piatto invece di top spin), contro 0,03 e 8 con il
  riscaldamento; con la calibrazione giusta nessuna differenza (0,02/0,03, 8/8). Correzione in
  `natpf_phone_racket.powerRefs` (`BOOT.self` 0,75, `createTypicalModel().seen`): finché il colpo tipico non c'è, il
  riferimento della calibrazione non sta sotto la mediana dei colpi già fatti né sotto 0,75 del colpo letto (alza solo).
  Dopo: 0,13 e 0,11, 9 e 9 su 120 (8 con il riscaldamento); calibrazione giusta e decisa invariate; mancino uguale
  (0,11/0,11, 9 e 10 su 120). Resta: il primo colpo con la calibrazione a colpetto (|Δforza| ~0,20, un colpo) e la mira dei
  primi 10 colpi (|Δ| 2,5° contro 1,1°, su 17° di mira piena), che il riscaldamento assestava. Test nuovo
  `natpf-riscaldamento` (pavimento, banco destro e mancino che fallisce senza la correzione: 0,204 contro 0,14, flusso);
  `natpf-campo-aperto-23-10` C4 con lo stesso significato (confronto con la lettura della sola calibrazione); prove del
  flusso che entrano in campo con «Riscaldati prima»; la prova della moviola usava il minigioco «rally», che non esiste
  (passava dal riscaldamento della partita): ora «rush», con la sfida davvero in corso.
- [x] B16-flow.3 · prova nel browser dei tocchi (commit `0490fd9`): `tools/e2e/natpf-flusso-tocchi.mjs`, comandi veri,
  conta i tocchi dall'apertura alla prima palla («QR» e «link» uno ciascuno, i gesti non sono tocchi), schermate
  1280×720 e 390×844. Prima (`7936011`) → dopo:

  | Percorso | Prima | Dopo | Dettaglio dopo |
  |---|---|---|---|
  | Gioco singolo con il telefono | 20 (computer 6, telefono 14) | **13** (5 + 8) | computer: tasto, Gioca, Contro la CPU, Smartphone, Gioca; telefono: QR, link, Attiva i sensori, 4 × Avanti, Tutto chiaro |
  | Stesso schermo, due telefoni | 31 (3 + 28) | **19** (3 + 16) | ogni telefono 8; il conto alla rovescia parte da solo |
  | Sfida tra due computer | 25 (8 + 17) | **18** (7 + 11) | host come il singolo; Player 2: link, Sono pronto, QR, link, Attiva i sensori (il Player 2 non ha il tutorial: escluso dal B4, invariato) |

  Il conto del B15 (21, 29, ≈35) era sbagliato: 6 + 14 = 20, ogni telefono dello stesso schermo 14 (non 13), il Player 2
  della sfida senza tutorial. Schermate guardate (`scratchpad/b16/flow-shots/prima|dopo`, non nel repository): modale
  «1 / 5» con 5 puntini sul computer e sul telefono («Scheda 5 di 5 · Servizio», «Viste 4 di 5»), le due metà dello
  stesso schermo a 5 schede, pagina «Partita» con «Racchetta pronta ✓», «Riscaldati prima» e «Gioca», host della sfida con
  «Riscaldati prima» e «In attesa del Player 2…». Visto e corretto: in calibrazione il pannello diceva «Calibrazione»
  due volte (titolo e tappa unica): la lista delle tappe si nasconde se ha una tappa sola.
- Verifiche: `npm test` 934/934 (prima 927 + 2 tutorial + 5 riscaldamento), `node --test tools/test/*.test.mjs` 197/197,
  `npm run build` ok. Nel browser (porte 4510–4523, una prova alla volta): `natpf-flusso-tocchi` singolo 5/5, stesso 5/5,
  1v1 7/7; `natpf-tutorial-phone` 39/39 (nuova verifica: 5 schede per telefono nello stesso schermo); `natpf-tutorial-relink`
  9/9; `natpf-training-flow` 21/21; `natpf-split-ready` 34/34 (barra «tutorial 1/5»); `natpf-menu` 22/22; `natpf-1v1-p2p`
  39/39; `natpf-tutorial-phone` mancino (HAND=left) 39/39; `natpf-modale-gesti` 18/18 al quarto giro (prima 17/18, 15/18,
  17/18: KO solo di velocità, ogni volta su una verifica diversa, fps della modale con la macchina carica, load 5–10 su 4
  CPU con gli altri agenti; il disegno della modale non è cambiato, cambiano solo numero di schede e puntini).
  `natpf-flusso-tocchi` singolo rifatto dopo la correzione della tappa unica: 13 tocchi, pannello con un solo
  «Calibrazione» (schermata guardata).
- Non verificato: telefoni veri, persone vere (il banco del riscaldamento è un telefono simulato: quanto è forte il
  colpetto della calibrazione di chi gioca davvero lo dicono solo le diagnostiche), Windows.
- [x] B16-flow.4 · correzioni della revisione indipendente («integrare con correzioni»), `natpf_lobby.js`:
  1. il pulsante della pagina «Collega» dice dove porta (`connectTarget` / `connectNextLabel`, funzioni pure): «Alla
     partita ›» con mouse e tastiera, webcam o telefono già calibrato e con il tutorial corto visto (prima «In campo ›», ma
     portava alla pagina «Partita»); «In campo ›» con il telefono da calibrare, il tutorial da vedere, il riscaldamento
     chiesto, la sfida; invariati «Al campo d’allenamento ›» e «Impostazioni partita ›». `startWarmup` usa la stessa scelta
     (`_tutorialDue`). Nessuna prova nel browser né test clicca il pulsante per testo (`git grep`).
  2. richiesta di riscaldamento appesa: «Riscaldati prima» con il telefono caduto porta a «Collega» con `wantWarmup`; prima
     restava chiesta anche lasciando la pagina e partiva alla partita dopo (in fiera: del visitatore successivo). Ora si
     azzera lasciando «Collega» senza entrare in campo (anche «‹ Indietro») e tornando al menu principale.
  3. commento della lobby in `natpf-tennis/index.html` (diceva ancora «riscaldamento in campo»).
  4. barra delle tappe: «Calibrazione» solo con il telefono (`progressSteps(mode, { controller })`); con mouse e tastiera
     o webcam 4 tappe (Modalità, Racchetta, Collega, Partita), dove la calibrazione non c'è.
  5. «Riscaldati prima» diventa «Rifai il riscaldamento» dopo un riscaldamento finito (non saltato) dello stesso giocatore;
     torna «Riscaldati prima» al menu principale (visitatore nuovo).
  Test: 3 nuovi in `natpf-riscaldamento` (pulsante di «Collega» dal vivo con mouse e telefono; sequenza della revisione
  «Riscaldati prima» con il telefono caduto → menu (o Indietro) → nuova partita, e la richiesta che resta finché si è in
  «Collega»; barra con webcam e «Rifai il riscaldamento»). Prova a mutazioni: togliendo ogni correzione fallisce il test
  giusto (pulsante, richiesta appesa, barra, «Rifai»).
  Verifiche: `npm test` 937/937, `node --test tools/test/*.test.mjs` 197/197. Nel browser (porte 4710/4711, una alla
  volta): `natpf-flusso-tocchi` singolo 13 tocchi (5 + 8) 4/4, stesso 19 (3 + 16) 5/5, 1v1 18 (7 + 11) 7/7 (invariati);
  `natpf-training-flow` 21/21 e mancino 21/21; `natpf-menu` 22/22; `natpf-split-ready` 34/34; `natpf-tutorial-phone`
  39/39 e mancino 39/39. Non provato nel browser: la pagina «Collega» con mouse e tastiera o webcam (le prove nel browser
  usano il telefono simulato; coperta dai test con il DOM finto). `npm run build` ok (in `index.html` cambia solo un commento).

## B16 · Mira del telefono: come si misura e opzione dello staff (ramo `b16-mira`, decisione (d)) · [~] · 08/11/2026
Decisione (d) dell'utente sulla mira più sensibile del B15: «Ok ma come lo misuro?». Obiettivo: misurarlo con partite vere
(diagnostica e comando), poter scegliere la sensibilità senza toccare il codice, guida pratica. Criterio di fine: misura nel
riassunto, nel rapporto, nel LEGGIMI e nel comando; opzione che arriva a `strokeIntent` senza cambiare la base; percorso della
guida provato nel browser.
- [x] B16-mira.1 · Opzione «Mira del telefono» (commit `87e4a66`, push no: ramo locale)
  File: `src/natpf/natpf_stroke_intent.js` (`AIM_FULL` alta 17 · media 20 · bassa 23, `faceAimFromDev(dev, full)`,
  `strokeIntent({ aimFull })`), `src/natpf/natpf_aim_level.js` (nuovo: `natpf-tennis.mira`, `readAimLevel`, `writeAimLevel`),
  `src/natpf/natpf_phone_racket.js` (`natpfSwingToEngine({ aimFull })` → `natpf.aimFull`; il telefono passa `aimFullNow()`),
  `index.html` + `src/natpf/natpf_lobby.js` (riga «Mira del telefono» nelle Opzioni, sotto «Telefono», con la nota «Per lo
  staff…»), `src/natpf/natpf_diag.js` (il pannello dice la mira in uso), `test/phone-sim.mjs` (`game({ aimFull })`),
  `test/natpf-mira-sensibilita.test.mjs` (nuovo, 5 prove).
  Verifiche: 15° di piatto → 0,857 / 0,706 / 0,6 (`faceAimFromDev`); con il valore di base l'intenzione è identica alla
  mira alta (deepEqual su 27 combinazioni di forza e scarto) e cambiano solo le mire con media e bassa; catena del telefono
  simulato (destro e mancino, dritto e rovescio, ±15°, stesso messaggio letto con le tre sensibilità): mira ×14/17 e ×14/20,
  spostamento della palla dal colpo dritto in ordine alta > media > bassa (media 70–95 % dell'alta, bassa 50–85 %).
  Prove di fedeltà invariate (`natpf-gesture-pose`, `natpf-racchetta`, `natpf-gesture-speeds`, `natpf-colpi-b15` nella
  suite). npm test 932/932, sito 197/197.
- [x] B16-mira.2 · Lato delle palle per partita nella diagnostica e comando (commit `c176fa8`)
  File: `src/natpf/diag/diag_metrics.js` (`SIDE`, `sideJudge`, `sideBalance`, `sideLines`; `metrics.latoPalle`; righe nel
  riassunto), `src/natpf/diag/diag_recorder.js` (evento `partita` a ogni `startNewMatch`, ripetuto `continua` nella parte
  nuova; `racchetta` con `mano`, `fonte`, `miraPiena`, `allenamento`/`minigioco`; `gioco.mira`/`miraPiena` nella sessione),
  `src/game_engine.js` (`natpfLastRacket` con `hand`, `source`, `aimFull`: solo dati), `diag_viewer.js` (scheda «Lato delle
  palle per partita» in `rapporto.html`, righe nel `LEGGIMI.txt`, `partita` nella linea del tempo), `diag_export.js`,
  `scripts/audit/lato-palle.mjs` (nuovo), `scripts/audit/colpi.mjs` (`--mode=lato`, `reale({ aimFull })`,
  `variant({ aimFull })`), `test/natpf-mira-lato.test.mjs` (nuovo, 6 prove).
  Definizione: x del punto di caduta calcolato del colpo (evento `racchetta`) nel riferimento di chi colpisce (P2: x del campo
  cambiata di segno); fuori servizi, allenamento (riscaldamento compreso), minigiochi, webcam; quote sinistra · centro (±1 m) ·
  destra; |mediana x| per blocchi di 20 colpi (l'ultimo se ≥ 10); sbilanciata = almeno il 70 % in una metà del campo
  (x > 0 / x < 0, la «palla da una parte» del banco B15) su almeno 20 colpi; il testo dice la parte del dritto o del
  rovescio (mancino a specchio). Riepilogo per sensibilità (`perMiraPiena`).
  Banco `colpi.mjs --mode=lato --hand=both` (persona vera, 24 partite da 40 colpi per caso; registro
  `scratchpad/b16/mira-lato-banco.log`): partite sbilanciate con alta 17° / media 20° / bassa 23° — seme giusto 0/24 · 0/24 ·
  0/24; seme ±15° 19/48 (39,6 %, |mediana x| 1,18 m) · 18/48 (37,5 %, 1,05) · 17/48 (35,4 %, 0,93); ±25° 58,3 · 56,3 · 50 %;
  ±30° 64,6 · 58,3 · 50 %; seme diverso nei due versi 33,3 · 27,1 · 25 % (su 96); corpo girato di 30° al 20° colpo 54,2 ·
  62,5 · 50 % (su 24). Mancino identico al destro. Lettura: la sensibilità attenua (circa −10 % di metri da una parte per
  passo), la calibrazione cura.
- [x] B16-mira.3 · Prova nel browser, guida e documenti (commit dopo `c176fa8`)
  File: `tools/e2e/natpf-mira-lato.mjs` (nuovo), `docs/GUIDA_MISURA_MIRA.md` (nuova), `docs/NATPF_DIAGNOSTICA.md`,
  `docs/PROJECT_MEMORY.md`, questo registro. Testo «equilibrata» chiarito (metà sinistra/destra del campo, perché le quote a
  tre zone hanno il centro); suggerimento del riassunto e del comando: prima la calibrazione, poi la sensibilità meno
  sensibile.
  Verifiche: `natpf-mira-lato` (porte 4530/4531) **20/20**, tre giri verdi di fila dopo le correzioni della prova (Opzioni
  alta → media con l'avviso, scelta che resta dopo la ricarica; pannello con la mira; registrazione; telefono simulato
  calibrato; «Gioca» vero; partita 1 con la mira media 22 colpi, partita 2 con la mira alta 4 colpi; riassunto con il
  verdetto; download con il clic vero dopo lo scorrimento del pannello; `sessione.json`, `metriche.json`, `rapporto.html`,
  `LEGGIMI.txt`, eventi `partita` e `racchetta`; `lato-palle.mjs` sul pacchetto). Schermate in `scratchpad/b16/e2e-mira/`
  (`mira-opzioni.png`, `mira-riassunto.png`, `mira-scarica.png`, `rapporto-lato.png`). npm test **938/938**, sito
  **197/197**. `natpf-diag-session` (registratore toccato; porte 4532/4533): giro completo 23/24, unico KO di sola velocità
  (costo del registratore: massimo 33,2 ms in un secondo, scrittura 37,8 ms, nei secondi in cui il gioco era a 7–14 fps con
  fotogrammi da 233–317 ms: macchina carica, load average 8–10 su 4 CPU); ripetuta da sola la parte A: 15/16 (massimo 23,8
  ms con il gioco a 31 fps), poi la base `7936011` sulla stessa macchina 16/16 (10,3 ms) e di nuovo il ramo **16/16**
  (massimo 8,6 ms/s, scrittura 2,8 ms; mediana 0,7 ms/s come la base 0,6). Il ramo aggiunge 4–6 campi a ogni `racchetta`
  (22 in 155 s) e un evento a partita.
  Non verificato: telefoni veri, persone vere (la guida serve a questo), programma Windows (download dal pannello), partite
  intere dal servizio nel browser (la prova fa partire gli scambi da una palla della CPU dopo il «Gioca» vero), sfida tra due
  computer (vale l'opzione del computer di chi gioca: non provato).
- [x] B16-mira.4 · Correzioni della revisione indipendente («integrare con correzioni»)
  1. **Potenza statistica**: il verdetto «sbilanciata» non confronta alta e media con 9–15 partite. Aggiunto il
     **guadagno**: palle angolate (oltre 2,5 m dal centro) per partita e media per sensibilità (senza le partite con il
     riferimento storto), con `sideTotals` (anche per più pacchetti insieme) e `gainCompare`/`gainLines` («confronto del
     guadagno»: differenza ± due errori standard, «si distingue dal caso» o no, da 5 partite per parte) nel riassunto,
     rapporto, LEGGIMI e `lato-palle.mjs`. Banco (`colpi.mjs --mode=lato --runs=400`, nuovo `--runs`; registro
     `scratchpad/b16/fix-mira/banco-lato-400.log`): con la calibrazione giusta palle angolate 37,3 / 34,0 / 30,9 % ±7,4
     punti per partita (40 colpi; ±8,3 a 30 colpi) ⇒ alta contro media (3,3 punti) circa **80 partite per sensibilità**
     (100 a 30 colpi), alta contro bassa (6,4) circa 21. La sonda del revisore (38,3 / 34,3 / 31,7 %, ±6,6, «40–45
     partite») è nello stesso ordine ma più ottimista: con 400 partite e potenza 80 % ne servono circa 80; con 45
     partite la media risulta più angolata dell'alta 7 volte su 100 e la differenza si distingue dal caso 3 volte su 10.
     Guida §6 riscritta: il verdetto scopre la calibrazione, il guadagno confronta le sensibilità, quante partite servono.
  2. **Commento di `AIM_FULL`** (`natpf_stroke_intent.js`): tolto «dimezza l'effetto»; ora i numeri del banco (circa
     −10 % di metri da una parte per passo, |mediana x| 1,27 → 1,13 → 1,00 m, partite sbilanciate 41 / 38 / 32 % con 15°
     di errore; palle angolate 37 / 34 / 31 %).
  3. **Righe del verdetto**: numeri principali «metà sinistra · metà destra» (quelli del verdetto), a parte «(oltre 1 m a
     sinistra · al centro · oltre 1 m a destra)»; testi «equilibrata: nessuna metà del campo arriva al 70 %» e
     «sbilanciata a destra (…): 72 % dei colpi nella metà destra»; grammatica del totale («1 sbilanciata su 5 partite
     giudicate»). Scheda del rapporto con le colonne nuove. Prova nel browser che il verdetto non contraddice le metà.
  4. **Opzione dello staff**: «Mira del telefono» tolta dalle Opzioni (`index.html`, `natpf_lobby.js`) e messa nel
     pannello dello stand (`natpf_kiosk.js`, pulsante `data-staff="aim"`, un clic passa alla successiva come «Ritorno al
     menu dopo»; avviso; stessa chiave `natpf-tennis.mira`; il reset del chiosco non la tocca; `nextAimLevel`,
     `aimLevelButton` in `natpf_aim_level.js`). Pannello della diagnostica: «si cambia nel pannello dello stand».
  5. **Telefoni senza forma del colpo**: se nessun colpo della partita ha `miraPiena` in una registrazione che conosce
     la sensibilità, la riga dice «sensibilità non applicata» (chiave `non applicata` nel riepilogo), non quella
     dell'evento `partita`; «mira non registrata» resta per i pacchetti di prima del B16.
  6. **|piatto mediano|** per partita (`racchetta.piatto`, solo colpi non `ricavato`), soglia **0,20** su almeno 20 colpi →
     «riferimento storto: ricalibrare». Dal banco (400 partite da 40 colpi per sensibilità): calibrazione giusta 0 su 400
     oltre 0,20 per tutte e tre (massimo 0,18 / 0,15 / 0,13); partite da 30 colpi 0–1 %, da 20 colpi 1,5–3 % (sonda
     `fix-mira/probe/probe2.mjs`, 200 partite); seme sbagliato di ±15° scoperto nel 76 / 69 / 57 %. Prova: nel banco a 24
     partite nessun suggerimento con la calibrazione giusta (test).
  7. Testi: niente doppia parentesi nel pannello («alta (17°), si cambia nel pannello dello stand: …»); tabella del §6
     della guida con le partite per riga.
  File: `src/natpf/diag/diag_metrics.js`, `diag_viewer.js`, `scripts/audit/lato-palle.mjs`, `scripts/audit/colpi.mjs`,
  `src/natpf/natpf_kiosk.js`, `natpf_aim_level.js`, `natpf_lobby.js`, `natpf_diag.js`, `natpf_stroke_intent.js`
  (commento), `index.html`, `test/natpf-mira-lato.test.mjs` (9 prove, 3 nuove), `test/natpf-mira-sensibilita.test.mjs`
  (6, 1 nuova: il pulsante del pannello vero su `ui-world`), `test/ui-world.mjs` (i figli di `querySelector` hanno un
  genitore), `tools/e2e/natpf-mira-lato.mjs`, `docs/GUIDA_MISURA_MIRA.md`, `NATPF_DIAGNOSTICA.md`, `PROJECT_MEMORY.md`.
  Verifiche: npm test **942/942**, sito **197/197**; nel browser `natpf-mira-lato` **23/23** (porte 4726/4727; prima 22/22
  su 4720/4721, poi aggiunta la prova che il pannello dello stand sta in 1280 × 720 senza scorrere: pannello dello stand
  con un clic e l'avviso, niente riga nelle Opzioni, scelta che resta dopo la ricarica, pannello della diagnostica senza
  doppia parentesi, riga con metà del campo / oltre 1 m e centro / palle angolate / |piatto mediano| e verdetto coerente
  con le metà, totale con le palle angolate, pacchetto, comando), `natpf-diag-session` **24/24** (4722/4723),
  `natpf-menu` **22/22** (4724/4725; questi due prima di accorciare la nota del pannello dello stand, solo testo).
  Rapporto aperto nel browser: scheda con le colonne nuove (`scratchpad/b16/fix-mira/rapporto/scheda.png`). `npm run build`
  verde (`index.html` toccato: il pulsante nel pannello dello stand c'è, la riga delle Opzioni no).
  Non verificato: persone vere e telefoni veri (i numeri sono del banco: una persona simulata; con persone diverse la
  variabilità cresce, le partite necessarie sono un minimo), Windows, il confronto del guadagno su pacchetti veri.

## B16 · Integrazione: Leggenda, tutorial corto, riscaldamento facoltativo, mira dello staff, versione 2026-11-08.5 · [x] pubblicata · 08/11/2026 sera
- Ramo locale `b16-int` da `origin/natpf-simulator` `6dae07a` (che contiene due commit di soli documenti del **B17** di
  un'altra sessione: `docs/b17/analisi-e-piano.md`, `docs/b17/punteggio-riferimento.md`). Unioni `--no-ff`: `70c85b3`
  (`b16-legend`, senza conflitti), `90a8eb7` (`b16-flow`, conflitto solo in questo registro), `bb46a6f` (`b16-mira`,
  conflitti in questo registro e in `natpf-tennis/test/phone-sim.mjs`). Ogni ramo era già corretto dopo la sua verifica
  indipendente (voci B16 sopra).
- Conflitti risolti tenendo tutte e due le intenzioni:
  - `natpf-tennis/test/phone-sim.mjs`, stessa riga: il ramo flow passa a `powerRefs` il colpo tipico già visto e il picco
    (`{ seen, peak }`: forza dei primi colpi senza riscaldamento), il ramo mira passa `aimFull` a `natpfSwingToEngine`
    (sensibilità della mira): la riga unita ha tutti e due.
  - `docs/WORK_PROGRESS.md`: le tre voci dei rami in coda, nell'ordine Leggenda, flusso, mira.
  - Uniti da git senza conflitti e ricontrollati a mano: `natpf_phone_racket.js` (riga del colpo con `powerRefs(…, { seen,
    peak })` e `aimFull: aimFullNow()`), `natpf-tennis/index.html` (commento del percorso del ramo flow, pulsante
    «Mira del telefono» del pannello dello stand e «Riscaldati prima»), `docs/PROJECT_MEMORY.md` (tre sezioni). Il ramo
    mira ha riportato `natpf_lobby.js` com'era (opzione tolta dalle Opzioni), quindi lì restano solo le modifiche del flow.
    `diag_recorder.js` e `natpf_stroke_intent.js` li tocca solo il ramo mira.
- `npm test` dopo ogni unione: 932/932 (Leggenda), 942/942 (+ flusso), 957/957 (+ mira); i test si sommano senza doppioni.
- Versione **2026-11-08.5** (`site/js/tennis/version.js`, `site/tennis/build.json`, prima riga di
  `natpf-tennis/lan/LEGGIMI.txt`, riga nuova in `natpf-desktop/novita.txt`: «Tutorial più corto (5 schede) e riscaldamento
  facoltativo; Leggenda più forte; mira del telefono regolabile dallo staff e misurata nella diagnostica.»).
- Documenti: rapporto dell'audit del gameplay in `docs/b16/rapporto-gameplay.md` (copia di quello consegnato all'utente, con
  una nota in testa: misurato sulla 2026-11-08.4 e sovrapposizioni con il B17; il resto è identico, controllato con
  `diff`); PIANO (checkpoint, registro B16), PROJECT_MEMORY (sintesi «Decisioni B16», nomi delle 5 schede, riscaldamento
  facoltativo nella nota del tutorial), PASSAGGIO_CONSEGNE (§2 B16, §3 punto 13 chiuso e punto 14 con le 4 decisioni
  dell'audit, numeri dei test), `tools/e2e/README.md` (righe di `natpf-flusso-tocchi` e `natpf-mira-lato`, che mancavano).
- Verifiche sul risultato (versione .5 compresa): gioco **957/957** (52 s), sito **197/197**, LAN **12/12**, programma
  Windows **28/28**, `npm run build` ok (solo l'avviso già noto sulla dimensione dei pezzi), `npm run audit:legend`
  **69/69** (uscita 0, 64 s; game della CPU contro medio 97,7 · amatore 99,8 · tennista 92,4 · preciso 70,8 · bambino 100 ·
  impreciso 99,8 %, errori della CPU 2,2–3,1 % per colpo, incrociati 34,6–45,8 %, reazione p10 0,125 s; pro contro medio
  84,1 %, casual 100 %: identici al ramo `b16-legend`).
- Nel browser, una prova alla volta (porte 4730–4749, log in `scratchpad/b16/int/e2e/`): `natpf-training-flow` **21/21**
  destro e **21/21** mancino; `natpf-tutorial-phone` **39/39** destro e **39/39** mancino; `natpf-flusso-tocchi` singolo
  **13 tocchi** (computer 5, telefono 8) 4/4, stesso schermo **19** (3 + 16) 5/5, sfida tra due computer **18** (7 + 11)
  7/7, uguali al ramo flow; `natpf-tutorial-relink` **9/9**; `natpf-modale-gesti` **18/18** (60 fps sopra l'arena ferma a
  1920×1080; con il campo che gioca 1,5–2,1 fps, uguale al campo da solo: disegno WebGL software); `natpf-menu` **22/22**;
  `natpf-split-ready` **34/34**; `natpf-1v1-p2p` sulla build .5 **39/39**; `natpf-mira-lato` **23/23** (partita 1 con la
  mira media 22 colpi, metà 41 · 59 %, «equilibrata»; partita 2 con la mira alta 4 colpi, «troppo pochi colpi»);
  `natpf-diag-session` **24/24** (costo del registratore mediana 0,9 ms/s, massimo 7,2; video della webcam e del gioco di
  153,6 s); `natpf-leggenda` **7/7** (6 punti, 61 colpi della CPU, 9 schemi, corsa massima 8,00 m/s; un allungo vero in
  partita a 1,67 m dal corpo: piatto +0,08, mano +0,22 contro 0,18 richiesti, testa +0,41 m; 4 allunghi forzati: piatto
  +0,31…+0,47, mano +0,30…+0,45, testa +0,19…+0,34 m); `natpf-rally` con `DIFF=leggenda` **8/8** (10 colpi su 10 gesti,
  CPU entro la portata, corsa massima 8 m/s). In più, perché l'integrazione tocca la lettura dei colpi e `index.html`:
  `natpf-phone-upright` **10/10**, `natpf-gesti-speciali` **9/9**, `natpf-schermo` **41/41**; prove del sito della CI con
  `run-local.mjs` (porte 8765/9000): `gesture-calibration` **20/20**, `phone-only` **10/10** + `timing-browser` **8/8**.
  Tutte verdi al primo giro, nessuna ripetuta. Alla fine nessun server acceso sulle porte 4730–4749, 8765, 9000.
- Zip Cloudflare `natpf-simulator-cloudflare-20261108-5.zip` **22.578.755 B** (127 file, 2,42 MB sotto il limite di
  25.000.000), sha256 `89ed0cb113b5920322a8ab97ec3c7c536e7e0ae52d5d27231291853a8ab73d71`, in `scratchpad/b16/pacchetti/`
  (**sostituito** dalla rifinitura 1 qui sotto, stessa versione: quello valido è il nuovo).
  Provato estratto con un server statico: contenuto uguale a `dist` più `_headers` e `natpf/turn.json`; gioco e pagina del
  telefono con la versione 2026-11-08.5 e nessun errore della pagina; 404 attesi solo su `/api/match/state`, `/lan/status`
  (e la favicon) e il rifiuto CORS del Worker TURN vero per l'origine locale. L'installer Windows lo costruisce GitHub dopo
  il push (qui solo i test di `natpf-desktop`, 28/28).
- Non verificato: telefoni veri, persone vere, webcam vera, Windows (installazione e aggiornamento dal gioco 08.4 → 08.5:
  l'installer lo costruisce GitHub dopo il push), ledwall, GPU vera; l'esecuzione su GitHub del passo `audit:legend` spostato
  in fondo al job. La pagina «Collega» con mouse e tastiera o webcam nel browser l'ha provata poi la revisione del prodotto
  (webcam finta di Chromium e il trucco «natpf»): pulsante «Alla partita ›», barra di 4 tappe senza «Calibrazione», con
  mouse e tastiera subito la pagina «Partita».
- **Rifinitura 1, dopo le due revisioni dell'integrazione (codice e prodotto)** · 08/11 sera:
  - Bloccante (prodotto), riprodotto prima di toccare il codice con una sonda nel browser (Ctrl+Maiusc+K dal menu): la nota
    nuova sotto i pulsanti del pannello dello stand (`#staff-aim-note`, tre righe con il percorso
    `docs/GUIDA_MISURA_MIRA.md`) allungava il foglio da 554 a 654 px; a 1024 × 600 il foglio scorreva di 99 px e «Chiudi»
    stava a y 607–653 (fuori vista, senza barra di scorrimento), a 1366 × 657 scorreva di 45 px con «Chiudi» tagliato; a
    720 × 720, 1280 × 720 e 1920 × 1080 niente. Varianti misurate: nota di una riga sola → a 1024 × 600 scorre ancora di
    53 px; frase dentro `#staff-note` → 23 px; senza nota → 0 (la base). A 1024 × 600 il foglio ha 555 px e quello della
    base ne usa 554: non c'è posto per nessuna riga.
  - Correzione: tolto il paragrafo. Cosa vuol dire la mira lo dicono l'avviso dopo il clic («Mira del telefono: media (20°)
    · un po’ meno angolate dell’alta; resta salvata»; alta: «più palle angolate», bassa: «meno angolate, com’era prima»;
    `natpf_kiosk.js`, `AIM_HINT`) e il `title` del pulsante («Alta: più palle angolate; Media e Bassa un po’ meno. Resta
    salvata.»). Niente più percorso `docs/` nel pannello dell'addetto (nel programma installato e sul sito quel file non
    c'è). Sonda dopo la correzione: foglio 554 px e scorrimento 0 a tutte e cinque le misure, «Chiudi» a y 508–554 a
    1024 × 600; l'avviso sta in una riga anche a 720 × 720.
  - Prova nuova in `tools/e2e/natpf-menu.mjs` (che gira già a 1366 × 657, 1024 × 600 e 1280 × 720): pannello dello stand
    aperto con i tasti veri, foglio senza scorrere e «Chiudi» dentro il foglio e la finestra, poi «Chiudi» lo chiude.
    **28/28** sulla correzione; sulla `index.html` di prima **26/28** (i due KO sono proprio 1366 × 657 e 1024 × 600, con
    scorrimento 45 e 99): la prova scopre il difetto. `natpf-mira-lato` controlla anche il testo nuovo dell'avviso.
  - Test di unità (`natpf-mira-sensibilita.test.mjs`): avviso con la spiegazione per le tre mire, pulsante con il `title`,
    nessun `staff-aim-note` né percorso `docs/` nel pannello.
  - Non bloccanti corretti (solo testi): `natpf-tennis/README.md` (riscaldamento descritto ancora come passo obbligatorio
    dopo «Collega», con «dritto 2, rovescio 2, servizio 1, angoli 3» e due soli livelli della CPU: ora tutorial corto e
    calibrazione solo con il telefono da calibrare, «Riscaldati prima» nella pagina «Partita», tre livelli);
    `docs/GUIDA_MISURA_MIRA.md` (23/23 invece di 22/22, avviso nuovo, percentuali che cambiano a ogni giro);
    `docs/PASSAGGIO_CONSEGNE.md` §4 (valori delle prove nel browser dell'ultimo giro, prove nuove del B16,
    `gesture-calibration` 20/20, `phone-only` 10/10); `docs/PIANO_LAVORI.md` (tolta dal Checkpoint la riga superata
    «Blocco in corso: B15»); `docs/PROJECT_MEMORY.md` (perché la spiegazione non sta nel foglio, quale prova lo controlla);
    `tools/e2e/README.md` (riga di `natpf-menu`).
  - Non bloccanti lasciati, da fare in un passo a parte: (1) `NatpfTraining.skip()` chiama `phone.skipCalibration()` se in
    quell'istante `phone.ready` è falso: un telefono calibrato che perde il collegamento per un attimo durante «Riscaldati
    prima» e «Salta ›» diventa «semplice» (c'era già prima del B16; visto solo con il disegno acceso e fotogrammi di
    0,7–1,1 s in questo contenitore); (2) sui pacchetti di diagnostica di prima del B16 `latoPalle` conta anche riscaldamento
    e webcam (la riga è già marcata «mira non registrata»); (3) con la presa piatta (`faceSwingToEngine`) la sensibilità
    della mira non conta; (4) margini stretti: `audit:legend` «pro contro medio» 84,1 % con il limite all'85 %, torneo
    ridotto di `npm test` circa 3 punti contro «preciso»; (5) «Riprova!» quando vince il Player 2 nello stesso schermo
    (difetto dell'audit, aspetta le decisioni dell'utente); (6) nella guida «Come si gioca» il pulsante «Prova nel
    riscaldamento» apre l'Allenamento: con «Riscaldati prima» separato il nome può confondere (da valutare); (7) la nota
    della diagnostica (pannello tecnico) rimanda ancora a `docs/GUIDA_MISURA_MIRA.md`: va bene lì.
  - Verifiche: gioco **957/957**, sito **197/197**, LAN **12/12**, `npm run build` ok (solo l'avviso già noto sulla dimensione dei pezzi; in `dist/index.html` niente nota, il pulsante con il `title`, l'avviso nel pezzo JS); nel browser (porte 4770–4789)
    `natpf-menu` **28/28**, `natpf-mira-lato` **23/23** (partita 1 con la mira media 22 colpi, metà 45 · 55 %, «equilibrata», palle angolate 41 %; partita 2 con la mira alta 4 colpi, «troppo pochi colpi»). Al primo giro, nessuna ripetuta. Programma Windows non rifatto (nessun file di `natpf-desktop`
    toccato).
  - Zip Cloudflare rifatto con la stessa versione 2026-11-08.5 (non ancora pubblicata; cambia solo `index.html` e il pezzo
    JS del gioco): `natpf-simulator-cloudflare-20261108-5.zip` **22.578.885 B** (127 file, 2,42 MB sotto il limite),
    sha256 `8cec771b91710b8f244a6b74293f6310f11edfb908b545d8341278d2285c983a`, in `scratchpad/b16/pacchetti/` al posto del
    precedente (cartella ed estratto rifatti). Provato estratto in una cartella nuova: contenuto uguale a `dist` più
    `_headers` e `natpf/turn.json`; servito con un server statico, gioco e pagina del telefono con la versione 2026-11-08.5
    e nessun errore della pagina, 404 attesi solo su `/api/match/state`, `/lan/status` e la favicon, più il rifiuto CORS del
    Worker TURN vero per l'origine locale (stesso quadro dello zip di prima); sullo zip estratto il pannello dello stand a
    1024 × 600 e 1366 × 657 non scorre, «Chiudi» a y 508–554 e 537–583, l'avviso nuovo dopo il clic.
  - Non verificato: come sopra; in più l'avviso letto da un addetto vero e il `title` su un computer con il mouse vero
    (il `title` non si vede con il tocco: l'avviso sì).

### B16 · Pubblicazione della 2026-11-08.5 · [x] · 08/11/2026 sera
- `git fetch origin natpf-simulator`: origin fermo a `6dae07a` (B17.3, soli documenti), contenuto in `b16-int`. Checkout
  principale portato a `84838f6` con avanzamento lineare; gioco 957/957 e sito 197/197 rifatti lì; push `6dae07a..84838f6`.
- GitHub su `84838f6`: «NATPF Simulator tests», «NATPF motore base MVP» (con `audit:legend` come ultimo passo) e «NATPF
  eseguibili Windows» verdi al primo tentativo. Installer **2026-11-08.5 su R2** (`windows/latest.json`:
  `NATPF-Simulator-Setup-2026-11-08.5.exe`, 124.585.994 B, sha256 `65534743a2003e251939aa6322c14f15ed0dbab1bc9f7bd8813f3edceca5e4a3`,
  note uguali a `novita.txt`).
- Zip Cloudflare consegnato all'utente: `natpf-simulator-cloudflare-20261108-5.zip`, 22.578.885 B, sha256
  `8cec771b91710b8f244a6b74293f6310f11edfb908b545d8341278d2285c983a`.
- Non verificato: installazione e aggiornamento su Windows vero, telefoni veri, persone, ledwall.

## B17 · Gesti dal video, uscita dal tutorial, punteggio in alto a sinistra, colpi sotto rete (08/11 sera) · [~]
- Analisi del video dell'utente (fotogrammi estratti e guardati: presa dritta nel pugno con lo schermo in avanti, dritto
  largo e orizzontale con braccio disteso, rovescio a due mani, servizio con la mano libera, tagliato in discesa lunga) e
  delle diagnostiche `20261108-171902-wqdk`/`172017-q79f` (9 colpi entro 7 m dalla rete: palla corta per forma, «in
  allungo» sotto failQ .63 di Leggenda → debole uniforme, VERY EARLY, 22+8 gesti scartati dal telefono):
  `docs/b17/analisi-e-piano.md` (`035a089`), riferimento del punteggio `docs/b17/punteggio-riferimento.md` (`6dae07a`).
- Tre rami in worktree con revisore ciascuno (base `7936011`), poi uniti sopra il B16 (`4515259`):
  - B17.2 `6f2bef3` → `b6e09f2`: X in `.tut-head` (onDone di `openFor`; training `_tutorialDone('phone')`, split `_tutDone(id)`);
    conflitti con il tutorial corto del B16 risolti (set/cards + onDone). Revisione: nessun bloccante; minore Invio/Spazio
    (in lavoro).
  - B17.3 `6f64161`, `6a5f11b`, `7240d32` → `466830a`: tabellone in alto a sinistra (2,3 cqw / 6 cqh, --sb 2,6 cqh 15–36 px),
    sigle, casella gialla dei punti («AD»), sottotitolo con formato/parità; copia `#natpf-scoreboard-p2` nella metà del
    P2 (bloccante della revisione: finiva sotto la pausa a 844/1024 → larghezza dalla metà meno pausa); «Al servizio»
    nascosta subito nello stesso schermo. Prova `natpf-tabellone` 39/39.
  - B17.4 `318e6d3`, `ad58b23`, `dcafd4c` → `d254944`: colpo «controllato» a rete (qualità fino a .25 sotto failQ, forza →
    profondità/velocità, tipo → arco, dispersione dal seme, bordo laterale), attackQ dalla forza solo in zona di rete,
    palla corta per forma a rete solo conf ≥ .6 e forza ≤ .25, finestra a vuoto × slowFactor solo a rete, telefono
    `cfg net:1` (picco 0,10 × scala, 10°, solo con verso atteso noto) e motore `WEAK.netRel .15`/`netAmple 10°`;
    `scripts/audit/rete-diag.mjs` (diagnostiche rigiocate: i 3 colpi deboli diventano 6,8/10,2/8,8 m controllati),
    `colpi.mjs --mode=rete` (2/12 → 12/12 non deboli, 12 esiti distinti), banco/reale/partite invariati. Test
    `natpf-rete-b17` (10), `swing-net` (3).
- Codice unito (`d254944`): gioco 970/970, sito 200/200, LAN 12/12, build ok (prove nel browser in corso).
- **Non verificato**: telefono vero, Windows, ledwall; la soglia bassa a rete su un telefono vero (rischio: assestamento
  da 195 °/s letto come tocco); il giudizio dell'utente sulle sigle del tabellone.
- **Chiusura (09/11 notte):** revisioni sul codice unito: tabellone senza bloccanti (minori: carattere +8 % sul
  riferimento, sigle che cadevano su P1/P2, arco della pillola) → rifinitura `8fcbbc3`/`a94dcfe` (carattere 3 cqh 17–40 px,
  sottotitolo ≥ 12 px, sigle 3 → 6 → «5 lettere più l'ultima» (Francesco/Francesca → FRANCO/FRANCA) → iniziali → P1/P2,
  emoji per code point), unione `ec0b8d6`…; rete: bloccante «stesso gesto da situazione migliore usciva di lato a
  Leggenda» → `e1ddb29` (bordo laterale in tutta la zona di rete ai livelli con il colpo controllato; test nel motore vero:
  12 gesti → 12 esiti), unione `ecf4769`; X: Invio/Spazio `3270e87`, unione `cfb49ac`.
- **Versione 2026-11-09.1** (`a778b0f`): gioco 975/975, sito 200/200, LAN 12/12, build ok; browser tabellone 42/42,
  tutorial-phone 52/52, split-ready 34/34, scritte-2v2 73/73, menu 28/28, training-flow 22/22, rally 8/8, gesti-speciali
  9/9, tutorial-relink 9/9, 1v1-p2p 39/39, modale-gesti 18/18, phone-keep 13/13 (training-flow intermittente sotto carico,
  anche sulla base `4515259`). Installer pubblicato su R2 (124.602.691 B, sha256
  `9cd1bf14f5d78eec55c8487e4bcb906168e6fb570fcc7ca8724720a9a3295a15`, verificato dal link fisso); zip Cloudflare
  22.581.836 B, sha256 `460f25cd4a2e4394bbf69b9021428ce717c911e4c5c398e1bf70a629eacc1cf0`, provato estratto.
- **Aperto** (dopo la 09.1): giudizio dell'utente su grandezza del tabellone e sigle; soglia bassa del telefono a rete su
  un telefono vero.

### B17.1 · Gesti del tutorial dal video (09–10/11) · [x] versione 2026-11-10.1
- Piano approvato dall'utente («procedi con il piano dei gesti dal video»); decisioni: «Ottimizza senza di me», partenza e
  presa «come la mia impugnatura del video», rovescio a una mano, dritto con il display frontale (schermo sulla palla) e
  rovescio «stesso movimento con l'altro lato» (dorso sulla palla). Palla corta e schiacciata partono dal telefono davanti
  al petto; terza indicazione della scheda Presa «Pollice in alto lungo il bordo, schermo verso l'interno».
- Rami in worktree con revisori (passi A dati, B posa/presa/ottimizzazione, C disegno): unione `6a35cc0`.
  Strumenti: `natpf-tennis/scripts/video/{estrai-posa,ricostruisci,fogli,ottimizza}.mjs`. File: `natpf_gesture_pose.js`
  (CHOREO, IMPACT_FACE, REST_VIDEO), `natpf_gesture_demo.js` (camera frontale a tre quarti, primo piano `IMPACT_CLOSE`),
  `natpf_gesture_motion.js`, `site/js/tennis/grip-art.js`; test `natpf-gesture-pose/anim/physics`, `natpf-gesture-semi-a/b/c`
  (semi 1-60: 7 560 letture giuste fuori dai limiti dichiarati). Riconoscimento non toccato.
- Misure: schermo/dorso all'impatto ≤ 20° (servizio 14,5°, schiacciata 9,3°); primo piano a 20° dalla normale: il centro
  della palla cade dentro il telefono. Documenti in `docs/b17/` (`gesti-dal-video.md`, `ottimizzazione.md`, `posa-dal-video.md`,
  `STATO-*.md`, fogli `img/`). Il patch da 54 MB è stato tolto dall'albero (resta nella storia): `docs/b17/wip/`.
- Versione 2026-11-10.1 (`b55453b`): gioco 991/991, sito 200/200, programma Windows 28/28, build ok, 12 prove nel browser.
  Installer su R2 (124.627.238 B, sha256 `f6ceb80be0448b23a50b3331e67ac80c98b7783d4a673b17ca703f7052161b30`, link fisso
  verificato), zip Cloudflare 22.615.793 B `3b81e05fe676059ba3935d253dbea0b2d90680b55adca69ba4a58a921eeae337` provato estratto.
- **Incidente CI**: la corsa 42751274284 è fallita nel passo «upload-artifact» («Artifact storage quota has been hit»,
  un installer da 124 MB per versione con 30 giorni) e ha saltato la pubblicazione su R2. Rimedio `d27f8e6`: il passo non
  blocca più, conserva 2 giorni; la nuova corsa ha pubblicato la 2026-11-10.1 (stessa versione, nessun contenuto del gioco
  cambiato). Se la quota resta piena la copia su GitHub manca ma l'installer su R2 c'è.
- **Non verificato**: telefoni veri, persone vere che imitano i gesti, Windows, ledwall; la soglia bassa a rete; limiti del
  tutorial: pallonetto e palla corta col dorso, fine del servizio a petto, telecamera solo sul braccio a 448×280/200×200.


## B18.1 · Tappa 1 del rapporto B16 (10/11) · [x] versione 2026-11-10.2
- Decisioni dell'utente (10/11): tappa 1 sì; formato in fiera sì ma come opzione da attivare; «Nuovo giocatore» sì; tappa 2
  con livelli Evento e Bambini sì, «dimmi sempre come attivarli».
- Workflow `b18-1-tappa-1`: quattro rami in worktree da `d09357a`, ognuno con revisore indipendente e correzioni, poi
  unione `b18-int` e revisione dell'insieme (14 agenti). Documenti: `docs/b18/r1-fine-partita-e-visitatori.md`,
  `r2-motore-piccolo.md`, `r3-scritte-e-istruzioni.md`, `misure-con-persone.md`, `r4-formato-fiera.md`, `unione.md`.
  - R1: fine partita con il nome di chi vince e voce per chiunque vinca, «0» e «Parità», P2 a 9,8 m/s, via il rating finto,
    «Nuovo giocatore», record per nome e giorno. Revisione: targhette dei nomi nello stesso schermo (bloccante), «Ospite».
    Banco `visitatori.mjs`: bambino dopo adulto forza letta 0,12 → 0,30 (rif 0,31).
  - R2: D6, D7, D12, D13, D16, D9 (soglia). Revisione: D13 con la presa a racchetta (bloccante: tagliato del tutorial letto
    palla corta da 0,7× a 0,9× → tagliato da 0,85×), D12 servizio abituale dai primi servizi, D16 latenza negativa, D7
    lanciapalle. Servizio della presa insegnata a 1×: tagliato 165–173 km/h → piatto 165–174, monotono da 0,7× a 1,5×.
  - R3: D10, istruzioni del servizio, D14, misure in diagnostica. Revisione: telefono del P2 nello stesso schermo
    (bloccante: scritte diverse 16,0% → 0,0%). «Fuori» col bersaglio sbagliava più di metà delle volte (Pro umano 245
    «Fuori» di cui 159 con la palla poi dentro → 86/0). Combo: primo passo speciale 42% → 0%.
  - R4: formato in fiera (opzione spenta). Partita a 1 game, Pro amatore p50/p90/max 91/162/422 s → 89/129/175 s; la CPU
    batte il 49,9% dei punti; partite vinte 86,5% → 73,4%.
  - Unione: conflitti in `startNewMatch` (R2+R3) e `natpf_point_call.js` (R1+R4) tenendo tutte e due le parti; correzione
    `de2d717` («Nuovo giocatore» toglie anche i colpi imparati da un ospite). Revisione dell'insieme: nessun bloccante,
    partita giocata nel browser con il formato in fiera nello stesso schermo; corretti due minori (istruzioni del servizio
    con un conto per giocatore; reset del chiosco come «Nuovo giocatore»), il terzo (rete vista da `landingOf`) non succede
    con il telefono (0 su 14.253 colpi).
- Verifiche sull'unione: gioco 1075/1075 (con le due correzioni finali: vedi commit), sito 201/201, LAN 12/12, programma
  Windows 28/28, build ok, `audit:legend` 69/69 (Leggenda contro «medio» 97% dei game, contro «preciso» 70,3%; Pro contro
  «medio» il giocatore 80,8%); 20 prove nel browser verdi al primo giro (tabellone 42/42, tutorial-phone 52/52, split-ready
  34/34, scritte-2v2 73/73, menu 28/28, training-flow 22/22, rally 8/8, gesti-speciali 9/9, tutorial-relink 9/9, 1v1-p2p
  39/39, phone-keep 13/13, leggenda 7/7, nuovo-giocatore 28/28, formato-fiera 21/21, formato-fiera-p2p 9/9,
  servizio-lancio 12/12, minigiochi-principianti 10/10, gameplay-23-10 11/11, latency 9/9, modale-gesti 18/18).
- **Non verificato**: telefoni veri, persone vere, Windows, ledwall, due computer veri in LAN con il formato in fiera, voci
  ascoltate; le soglie nuove del tagliato e del servizio con persone vere (si misurano con la diagnostica nuova);
  `natpf-leggenda` è stata rossa 1 volta su 3 nel ramo R2 (allungo con il piatto a +0,05 m sul limite di 5 cm), verde
  nell'unione: da tenere d'occhio.
- **Consegna**: repository trasferito dall'utente e rinominato in `sporcellifitp/fitp-simulator` (la sessione non poteva
  collegare un secondo repository con lo stesso nome); push `9e9ac3a`; installer 2026-11-10.2 su R2 (124.649.916 B, sha256
  `a546aae40e8bb4d25172972e6e0e2b12c7a34805b0f4ff9e6d5ec56ec2505c8f`, verificato dal link fisso; segreti R2 passati con
  il trasferimento); zip Cloudflare 22.626.641 B, sha256 `8459a7e0bcfb2ff08c49ad42794ab09ece3557ff2973e18078c2b7f05e3d41aa`,
  provato estratto (l'unico errore è quello atteso del TURN da origine locale). Nota: prima di impacchettare lo zip serve
  `npm run build` (lo script prende `natpf-tennis/dist` così com'è: la prima prova aveva ridato lo zip della 10.1).

## B18.2 gruppo 1 + B19 + B20 (10–11/11) · [x] versione 2026-11-11.1
- **B18.2 passo 1 (D11)**, worktree `wf_326755c7-755-1`, `4f00c43`…`1f170bb`: personaggi fermi, peso del servizio per
  livello, banco `audit:serve`, prove `natpf-servizio-peso`. Revisione: «un servizio normale vale come prima» era falso con
  il servizio del telefono (il gioco regalava un ace ogni 11–15 servizi) → misure rifatte con il servizio del telefono,
  compensazione a Casual. Punto diretto del servizio perfetto forte stretto: Casual 24,2%, Pro 13,4%, Leggenda 5,0%;
  CPU «in corsa» al servizio dal 30–95% a 0%.
- **B18.2 passo 2 (D1, D9)**, `fd5f252`…`a55ae31`: errori della CPU sulle palle facili Casual 9–14% → 1,5–2,5%, Pro
  4–9% → 0,3–0,4%; CPU in rete Casual 21–37% → 4,8–8,0% dei punti; vincenti a 4–6 m a Pro 2% → 18%; Pro contro «medio»
  83,0–83,6% dei game; Casual «bambino» 39 → 44–46%; Leggenda identica. Revisione (96 semi suoi): numeri confermati;
  «amatore» a Pro 76,3 → 62–63% e scambi più lunghi → decisione dell'utente: resta com'è. Minori corretti (soglia delle
  palle facili con l'errore standard, controlli del banco ridotto sugli obiettivi veri, test instabile del servizio della
  CPU seminato).
- **B19 audit dell'1v1 tra utenti**: `docs/b19/audit-1v1-utenti.md` (`0e8328e`), tre angolazioni verificate, script in
  `natpf-tennis/scripts/audit/b19/`; 16 domande, risposte dell'utente nel PIANO (B20).
- **B20 stesso schermo**, worktree `agent-a2fd989d8dd719e89`, `a7413d7`…`ac480fe`: A1–A5, sorteggio, formato in fiera a tre
  valori, scambio che si scalda (opzione), rivincita dai telefoni. Revisione: pannello dello stand a 1920×540 (bloccante,
  corretto con più colonne), effetto laterale del tagliato del Player 2 al contrario (preesistente: P1 51,5–52,1% dei punti
  con soli tagliati → 50,3%), tagliato che resta tagliato nello scambio caldo, banner del colpo a vuoto, istruzioni nascoste
  in pausa. Risposte del P2 lette schiacciata 114 su 1.955 → 0 su 1.971.
- Unioni su `natpf-simulator`: `0bdb83f` (tappa 2), poi B20 (senza conflitti). Verifiche del codice unito e sha dei
  pacchetti: vedi la voce «Consegna» qui sotto.
- **Non verificato**: telefoni e persone vere, Windows, ledwall, due computer veri, webcam per due; tutte le misure sono
  di profili simulati. Aperti dal B20: conto del chiosco con la rivincita, testo sul grande schermo al rientro con il QR,
  effetto laterale del tagliato del P2 con la webcam per due.
- **Consegna 2026-11-11.1**: push `5262fde`; codice unito: gioco 1132/1132, sito 205/205, LAN 12/12, programma Windows
  28/28, build ok, `audit:legend` 69/69; installer su R2 124.644.689 B, sha256
  `099bf51c71ec13f7462f2d099cb3d04a1df0d1eee94e8fa80f7f057343e093fb` (verificato dal link fisso); zip Cloudflare
  22.633.811 B, sha256 `78bb85e3206b0f8fd2adcbaa278fe5fbac8b0adac58dea8eeb55f44885c379cf`, provato estratto. Prove nel
  browser sul codice unito: vedi `docs/TRACCIA_PASSI.md` (in corso alla consegna; sui due rami erano tutte verdi).

## B21 + B22 · Video nel gioco e scia della palla (11/11) · [x] versione 2026-11-11.2 (installer in attesa di GitHub)
- Richieste dell'utente dell'11/11: trailer e clip «come si gioca» generati con Higgsfield/Seedance da fotogrammi veri del
  gioco (86 crediti su 120 di tetto), trailer approvato senza titolo; scia luminosa nel gameplay con opzione.
- Workflow `b21-b22-video-scia` (agente → revisore indipendente → correzioni), ramo `worktree-wf_190d3d32-58d-1`,
  `31fcfac`…`9baff80`; documento `docs/b21/video-e-scia.md` con le schermate.
  - B22: nastro giallo dietro la palla per tutti i colpi (`natpf_ball_glow.js`), opzione «Scia della palla: Sì · No» nelle
    Opzioni (chiave `natpf-tennis.sciaPalla`); su «No» disegno identico pixel per pixel a `4dc6ae7` (6 scene); la scia non
    tocca fisica né numeri casuali.
  - B21 intro: trailer `natpf-desktop/media/trailer-aad6b9311db4.mp4` (2.258.622 B; non entra nello zip Cloudflare, sta
    dentro l'installer, sul web da R2 `media/`); ripiego sul video di prima se il trailer dà errore, è rifiutato o non
    può arrivare in fondo senza fermarsi (stima del browser + almeno 6 s su 10 scaricati entro l'attesa; 2,5 s sul web,
    1,5 s nel programma); `?trailer=0` forza il video di prima. Il workflow `natpf-windows.yml` carica il trailer su R2
    senza bloccare l'installer.
  - B21 tutorial: due clip sfocate (`public/media/tutorial-sfondo-1/2.mp4`, 0,23 e 0,33 MB) dietro la scheda dei gesti,
    con velo; spente con «riduci movimento» e nello stesso schermo (lì le animazioni scendevano a 30 fps).
  - Revisione: bloccante «rete lenta → trailer a scatti» corretto (prima bastava il primo evento `playing`); minori
    (errore a metà del trailer, controllo finale del workflow sull'indirizzo del gioco, `?lan=1`).
- Unione e versione 2026-11-11.2 (`229167b`): gioco 1158/1158, sito 205/205, LAN 12/12, programma Windows 29/29, build
  ok, `audit:legend` 69/69, 20 prove nel browser verdi (elenco in `docs/TRACCIA_PASSI.md`). Zip Cloudflare 23.292.883 B
  (margine 1.707.117 B), sha256 `5b008704198515b051e7c91d89af3b319c8c622e771911ffff34f39527c164c5`, provato estratto.
- **Installer non ancora pubblicato**: le azioni di GitHub del repository sono in coda dalle 20:51 UTC dell'11/11
  (nessun runner; probabile quota dei minuti del profilo nuovo). Finché non girano manca anche il trailer su R2: sul web
  si vede il video di prima (ripiego).
- **Non verificato**: Windows vero, R2 vero, Safari/Firefox/telefoni (su iPhone il trailer può non scaricarsi da fermo:
  si vedrebbe il video di prima), scheda grafica vera, ledwall.
- **Installer 2026-11-11.2 pubblicato (11/11, 22:50 UTC)**: 127.584.496 B, sha256
  `ac7525fc1a581b2bd2ad09c9dbd8c67ebb37fa49ec854cf4c7d9104d4cfeaa02`, verificato dal link fisso; trailer su R2
  `media/trailer-aad6b9311db4.mp4` (2.258.622 B). Repository reso pubblico dall'utente per sbloccare le Actions (budget a
  0 $); controllo rapido di file e storia per chiavi o credenziali: niente trovato (solo asserzioni dei test).

## B26 · Trailer nel programma Windows e scia più evidente (12/11) · [x] versione 2026-11-12.1
- Collaudo dell'utente sulla 2026-11-11.2 nel programma Windows: all'avvio è partito il video di prima; scia «gialla ma
  poco diversa». Ramo `b26-trailer-scia` (`2bd9017`), unito in `a3fc6e8`, versione in `e09dc40`.
- File: `natpf-tennis/src/natpf/natpf_intro.js`, `natpf_ball_glow.js`, `natpf-desktop/src/main.mjs`, i test
  `natpf-intro-trailer` e `natpf-scia-palla` (unità e browser), `docs/b21/video-e-scia.md` (sezione finale),
  `docs/b21/img/scia-confronto-b26.webp`.
- Trailer: nel programma (file locale) parte appena il primo fotogramma è pronto, attesa 8 s contata nei soli passi
  puntuali (limite 4 volte), torna all'inizio se era già avanzato, ripiego solo per errore del file; cronaca in
  `programma.log` (`[natpf-intro]`). Web e computer del Player 2 invariati.
- Scia: nastro 0,8 m pieno con alone 2,2 volte, velocità × 0,42 s fino a 10 m, piena da 14 m/s, niente sotto 10 m/s,
  opacità 0,92; sotto la scia bianca nei colpi potenti (0,5). Opzione su «No»: disegno di prima.
- Verifiche: gioco 1159/1159, sito 205/205, programma Windows 29/29, build ok. Zip Cloudflare 23.293.679 B (margine
  1.706.321 B), sha256 `5edcdb12d20265359d34048550fab842c0728bd309853a99357e77cbd6fb6b4e`, provato estratto. Installer
  127.587.187 B, sha256 `9e4f8335393ff332430ee76ff23ed8fa30e87568bd6305c762409f5416400a26`, verificato dal link fisso.
- **Non verificato**: PC Windows vero (la causa del trailer è la più probabile, non accertata); l'agente si è fermato
  per il limite d'uso prima della verifica finale in Electron e della riesecuzione intera della prova della scia nel
  browser: le prove complete girano dopo la consegna (esito in `docs/TRACCIA_PASSI.md`).

## B25 · Stesso schermo tra due persone (11–12/11) · [x] versione 2026-11-12.2
- Workflow `b25-stesso-schermo-equilibrio` (agente → revisore indipendente → correzioni), poi un agente per la decisione
  dell'utente del 12/11 («nessun vantaggio di punti, solo nel gameplay»). Ramo `worktree-wf_d8163833-9f8-1`
  (`acc8e7a`…`3a3b9bc`), unito in `b3fd48d`. Documento `docs/b25/stesso-schermo-equilibrio.md`, misure in
  `natpf-tennis/scripts/audit/b25/`.
- Cosa c'è (solo nello stesso schermo tra due persone con i telefoni; contro la CPU impronte identiche, `audit:legend`
  69/69): lancio automatico dopo 30 s (opzione dello stand, spenta); campo aperto (opzione, spenta; con l'opzione accesa
  il servizio passa ogni due punti anche nel classico: correzione del revisore, chi batte per primo da 36–44% a 50%);
  colpo super da 1,3 volte il proprio colpo abituale; preparazione che non conta; fasce Bambino · Ragazzo · Adulto.
- Aiuto al più giovane, variante G, senza punti regalati: bambino contro adulto = margine sul tempo ×2 e +0,1 s, palla
  verso di lui 10% più lenta, colpo 1 m più in fondo; fasce vicine e campo aperto = solo margine. Bambino contro adulto
  medio 10–11% → 38–42% (tre serie di semi, 900 partite per riga); ragazzo contro adulto 22% → 42–45%; bambino contro
  ragazzo 27–30% → 41–42%.
- Verifiche: gioco 1185/1185, sito 205/205, programma Windows 29/29, build ok; nel browser `natpf-stesso-schermo-b25`
  54/54 (nel ramo). Zip 23.297.434 B, sha256 `4308f1559e9fef7da38d994f80e9a672c62bc3f3623276d26486c87d12243e2a`, provato
  estratto. Installer 127.576.457 B, sha256 `ec66a7249b3432805fa69430297a00efbb437525f816209de6526fa129083ace`.
- **Non verificato**: persone e telefoni veri (tutte le misure sono di giocatori simulati; «bambino» e «ragazzo» sono
  ipotesi), Windows vero, ledwall. Aperti: colpo super sotto «qualche volta a partita»; con il campo aperto «tira sempre
  fortissimo» rende 65–69% e chi batte parte sfavorito (44–48 punti su 100).

## B27 · Postazione dello staff: telecomando e schermo del gioco (12/11) · [x] integrato, versione 2026-11-12.3
Obiettivo (richiesta dell'utente allo stand): gioco sul ledwall 2×2 da 1024×1024 senza OBS e un telefono dello staff
come telecomando, abbinato una volta per tutte, che copra tutte le schermate. Documento con la matrice e le decisioni:
`docs/b27/telecomando.md`; guida per lo staff `docs/GUIDA_TELECOMANDO.md`. Lavoro in parallelo a B23–B26, nel worktree
`b25-staff` (base `8b85a3c`), da integrare (versione e `docs/PIANO_LAVORI.md` le aggiorna chi integra).
- [x] B27.1 · programma Windows (commit `5633db6`): domanda «Su quale schermo mostro il gioco?» all'avvio (≥2 monitor e
  nessuno scelto, o salvato assente senza un monitor della stessa misura; proposta il quadrato «probabile ledwall»; 30 s
  poi vale la proposta, salvata con la misura), `window.natpfDesktop.displays` (preload v3: list, next, choose, onChange).
  File: `natpf-desktop/src/{desktop-core,main}.mjs`, `preload.cjs`, `test/desktop-core.test.mjs`.
- [x] B27.2 · telecomando (commit `e736d0f`): `site/js/tennis/remote-pairing.js`, `remote-link.js`, `telecomando.js`,
  `site/tennis/telecomando.html` + manifest e icone (`tools/icone-telecomando.mjs`); nel gioco `natpf_remote_map.js`,
  `natpf_remote.js`, voci nel pannello dello stand (`natpf_kiosk.js`, `index.html`, `natpf-ui.css`); `link.js` (la
  racchetta rifiuta `role:'remote'`, batteria `bt`/`bc` nello stato) e `racchetta.js` (manda la batteria dove c'è);
  build e pacchetto (`natpf-site-plugin.mjs`, `offline-assets.mjs`, `pacchetto-cloudflare.mjs`).
- [x] B27.3 · prove e documenti (commit «B27 · Prove e documenti…»): `tools/e2e/natpf-telecomando.mjs`, 1024 × 1024 in `natpf-menu.mjs`,
  scenario `domanda-monitor` e controlli del ponte in `natpf-desktop/scripts/prova-linux.mjs` (con `NATPF_PROVA_MONITOR`,
  solo nel programma non costruito), test del ledwall esteso; `docs/b27/telecomando.md`, `docs/GUIDA_TELECOMANDO.md`,
  `natpf-desktop/LEGGIMI.md`, `tools/e2e/README.md`, `docs/PROJECT_MEMORY.md`.
  Verifiche: gioco 1191/1191, sito 213/213, LAN 12/12, programma Windows 32/32, build ok; nel browser
  `natpf-telecomando` 69/69 (server LAN del programma, gioco a 1024 × 1024), `natpf-menu` 38/38, `natpf-training-flow`
  22/22, `natpf-tutorial-phone` 52/52; `prova-linux` 67/67 (sei scenari, `domanda-monitor` compreso; al primo giro 66/67: il controllo del contratto voleva
  ancora la versione 2 del ponte, aggiornato).
  **Non verificato**: telefoni veri, «Aggiungi a schermata Home» (Android e iPhone), certificato sul telefono dello staff,
  Windows vero, ledwall vero, due monitor veri (in Xvfb Electron ne vede sempre uno: provati Xinerama e monitor RandR),
  la finestra della domanda vista a occhio, il percorso PeerJS pubblico (web) del telecomando (solo con un Peer finto).
- [x] B27.4 · revisione indipendente (commit `2959848` e quello dei documenti dopo): 12 difetti, tutti riprodotti con
  gli script del revisore e corretti; tabella in `docs/b27/telecomando.md` §5. In breve: l'abbinamento si conferma sul
  computer (numero di tre cifre, clic o tasto veri), QR e codice solo a foglio aperto su indirizzi temporanei, dopo
  l'abbinamento niente QR; ripresa con prova reciproca HMAC-SHA-256 senza mandare la chiave, indirizzo fisso e chiave
  nuovi a ogni abbinamento e con «Scollega»; tolto il filtro delle copie dei comandi; il telecomando salta finestre di
  Windows, link e «Conferma»; ↑ ↓ spente nel tutorial e nella lezione; la pausa vince su «telefono scollegato»;
  domanda del monitor senza risposta che non sovrascrive un ledwall salvato e spento; due pagine con la stessa chiave
  che non si scalzano; un tentativo per collegamento; esito anche per i comandi che vanno in errore; `buildIsStale`.
  File: `site/js/tennis/remote-pairing.js`, `remote-link.js`, `remote-client.js` (nuovo: lato telefono senza DOM),
  `telecomando.js`, `site/tennis/telecomando.html`; `natpf-tennis/src/natpf/natpf_remote.js`, `natpf_remote_map.js`,
  `index.html`, `natpf-ui.css`, `lan/prepare.mjs`; `natpf-desktop/src/{desktop-core,main}.mjs`,
  `scripts/prova-linux.mjs`; test e prove (`tools/test/remote-pairing.test.mjs`, `natpf-telecomando.test.mjs`,
  `desktop-core.test.mjs`, `tools/e2e/natpf-telecomando.mjs`); documenti.
  Verifiche: gioco 1194/1194, sito 223/223, LAN 12/12, programma Windows 33/33, build ok; nel browser
  `natpf-telecomando` 80/80, `natpf-menu` 38/38, `natpf-training-flow` 22/22, `natpf-tutorial-phone` 52/52;
  `prova-linux` 69/69.
  Non cambiato e detto: `main.mjs` senza `setWindowOpenHandler` (il gioco usa `target=_blank` e `window.open` anche nel
  programma: link del controller, link dell'invito, finestra della webcam).
  **Non verificato**: come sopra; in più la scelta per l'iPhone nella pagina del telefono (riconosciuto dal nome del
  browser) e la conferma con la tastiera vera di Windows.
- [x] B27.5 · integrazione (12/11, 14:40 UTC): ramo `b25-staff` unito in `natpf-simulator` sopra `b831973` (l'altra
  sessione aveva pubblicato solo `docs/TRACCIA_PASSI.md`: nessun conflitto), **versione 2026-11-12.3**
  (`site/js/tennis/version.js`, `site/tennis/build.json`, `natpf-tennis/lan/LEGGIMI.txt`, riga in
  `natpf-desktop/novita.txt`).
  Verifiche sul codice unito: gioco 1194/1194, sito 223/223, LAN 12/12, programma Windows 33/33, build ok; nel browser
  `natpf-telecomando` 80/80, `natpf-menu` 38/38 (anche a 1024 × 1024), `natpf-training-flow` 22/22.
  Non rifatte dopo l'unione (fatte sul ramo, codice identico): `natpf-tutorial-phone` 52/52, `prova-linux` 69/69.
  Non rifatte per questa versione: `audit:legend` e le altre prove nel browser (il B27 non tocca motore, CPU, colpi né
  la pagina della racchetta oltre alla batteria nello stato e al rifiuto di `role:'remote'`).
  **Non verificato**: telefoni veri, Windows vero, ledwall vero, due monitor veri, «Aggiungi a schermata Home».

## B24 + B18.2 gruppo 3 · Lob & Drop, livelli Evento e Bambini (12/11) · [x] versione 2026-11-12.4
- Due workflow (agente → revisore indipendente → correzioni), fermati due volte dal limite d'uso e ripresi nelle stesse
  worktree. Rami `b24-lob-drop` (`5452261`…`eed8772`) e `b18-t2-4-evento-bambini` (…`a9ba5ed`), uniti sopra il B27
  dell'altro agente (2026-11-12.3). Documenti: `docs/b24/lob-e-drop.md`, `docs/b18/t2-4-evento-bambini.md`.
- B24: mascotte costruite nel codice (`natpf_lob_drop.js`) sullo scheletro di sempre, opzione «Personaggi in campo:
  Classici · Lob & Drop» (`natpf-tennis.personaggi`, `?personaggi=`), solo disegno (impronte delle partite identiche a
  `9b8f9cb`). Revisore: la racchetta entrava nella testa grande (Drop 11–20% dei passi) → `natpf_racket_clear.js`
  (`keepRacketClear`): 1–5%, meno del tennista classico; nei colpi veloci la attraversa ancora per pochi fotogrammi.
- Gruppo 3: livelli Bambini ed Evento (adattivo), «Chi gioca: Bambino · Ragazzo · Adulto» al posto del livello
  (`natpf_who.js`), Esperta e Leggenda in «Altre impostazioni», segnale del momento giusto (`natpf_timing_cue.js`),
  colpo super spiegato (`natpf_super_hint.js`). Revisore: anello verde più lungo della finestra vera (995 «Ritardo» su
  4526 gesti con l'anello verde) → ora 2708 su 2708 «Perfetto»; scritta «eri in corsa» quasi sempre falsa → ora la causa
  vera (0 su 1540). Livelli di prima identici a `9b8f9cb` (72 impronte su 72).
- Richiesta dell'utente del 12/11: scelta dei personaggi dove si imposta la partita → riga «Personaggi» nella pagina
  «Pronto per la partita» (`index.html`, `natpf_lobby.js`, test in `natpf-personaggi-opzione.test.mjs`).
- Verifiche sul codice unito: gioco 1235/1235, sito 223/223, programma Windows 33/33, build ok; nel browser chi-gioca
  55/55, lob-drop 80/80. Zip 23.343.105 B, sha256 `97d01104b52300ccf771ad3d0581cebe2e9787a017c9b00ffd262f248d2f4769`.
  Installer 127.655.077 B, sha256 `0dfce566752624e604dc5cd74f8ecf74c6a9f7441640521342d8bc5d75148f50`.
- **Non verificato**: persone e bambini veri, telefoni veri, Windows vero, ledwall, scheda grafica vera. Prove complete
  nel browser avviate dopo la consegna (esito in `docs/TRACCIA_PASSI.md`).

## B28 · Calibrazione giocando e tutorial senza blocco (12/11) · [x] integrato, versione 2026-11-12.5
- Richiesta dell'utente allo stand: «togli il check che uno deve aver fatto quel gesto per ogni schermata… la
  calibrazione deve avvenire direttamente giocando… dopo circa 10-15 secondi di scambi, parte il match vero».
  Base `8b85a3c` (2026-11-12.2). Niente cambio di versione né push nel ramo. Documento: `docs/b28/calibrazione-giocando.md`.
- File nuovi: `natpf_trial_learn.js` (opzione dello stand e apprendimento), `natpf_trial.js` (scambi di prova),
  `scripts/audit/scambi-di-prova.mjs` (banco), test `natpf-scambi-di-prova` (25) e `natpf-niente-blocchi` (4),
  `test/trial-world.mjs`, prova nel browser `tools/e2e/natpf-scambi-di-prova.mjs`.
- File toccati: `natpf_phone_racket.js`, `natpf_tutorial.js`, `natpf_training.js`, `natpf_lobby.js`, `natpf_ui.js`,
  `natpf_split_ui.js`, `natpf_versus_ui.js`, `natpf_kiosk.js`, `natpf_pause.js`, `natpf_replay.js`,
  `natpf_serve_coach.js`, `diag/diag_recorder.js`, `game_engine.js` (tre righe), `index.html`, `natpf-ui.css`;
  `site/js/tennis/racchetta.js`, `phone-screen.js`, `link.js`, `site/tennis/racchetta.html`; `test/ui-world.mjs`,
  `test/phone-sim.mjs`, `scripts/audit/colpi.mjs`, `tools/e2e/th.mjs` e gli script `natpf-*`.
- Cosa c'è: tutorial chiudibile sempre (X, Invio, Esc, «Tutto chiaro»); «Avanti ›» negli esercizi dal computer e dal
  telefono; «Salta la calibrazione»; opzione dello stand «Calibrazione: Giocando · Con i gesti · Nessuna» (di base
  Giocando); profilo semplice automatico; scambi di prova prima di ogni partita (contro la CPU con il lanciapalle, stesso
  schermo con il palleggio assistito, sfida e minigiochi prima, in campo); apprendimento di verso, forza, salita e centro
  della mira; profilo da capo a ogni partita; «Ricalibra» che rifà gli scambi di prova.
- Verifiche: gioco **1214/1214** (base 1185), sito **208/208** (base 205), LAN 12/12, build ok, `audit:legend` tutti i
  criteri. Banco (12 telefoni × 10 colpi): forza 0,04 (primi tre 0,03) contro 0,07 (0,11) dei gesti a vuoto deboli e 0,04
  (0,02) dei gesti da manuale; lato sbagliato 0; verso invertito 36–46 colpi su 120 con «Salta», 0 con gli scambi; telefono
  che passa di mano errore 0,29 → 0,03 e 0,21 → 0,03; seme della mira ±4,7–5,5° (gesti da manuale ±1,6–1,8°, a vuoto con
  il piatto variabile ±6,0–6,5°). Tocchi fino alla prima palla: singolo 13 → 9, stesso schermo 19 → 11, sfida 18 → 14.
  Da «Gioca» al primo punto vero: 11,4–11,6 s colpendo, 16,3 s senza colpire; stesso schermo 14,7 s e 18,6 s (senza colpire, misurato con `natpf-flusso-tocchi`).
  Nel browser: `natpf-scambi-di-prova` 25/25, 20/20 (mancino), 18/18, 18/18, 12/12 (stesso schermo); `natpf-flusso-tocchi`
  5/5, 6/6, 8/8; `natpf-training-flow` 21/21 destro e mancino; `natpf-tutorial-phone` 46/46 destro e mancino;
  `natpf-tutorial-relink` 9/9; `natpf-split-ready` 34/34; `natpf-menu` 28/28; `natpf-modale-gesti` 29/29;
  `natpf-mira-lato` 23/23; `natpf-diag-session` 24/24; `natpf-1v1-p2p` 39/39 sulla build; `gesture-calibration` 20/20.
- **Non verificato**: telefoni veri (iPhone e Android), persone vere, Windows, ledwall; una pagina del telefono vecchia
  in cache (verificato solo il protocollo); le prove nel browser non elencate (hanno solo ricevuto `CAL=gesti`);
  programma Windows (nessun file toccato, test non rifatti).
- **Giro 2 (12/11, dopo la revisione indipendente e l'unione con il B27)**: `natpf-simulator` (`76c6ed3`,
  2026-11-12.3) unito nel ramo (`8d884eb`: conflitti in `natpf_kiosk.js` e in questo file, tenuti i due lati).
  - **B27 + B28**: il telecomando dello staff conosce la pagina «Scambi di prova» (in campo: frecce e OK spenti, Indietro
    = pausa), «Salta» li salta e preme «Avanti ›» dell'allenamento e «Salta la calibrazione» dove ci sono, «Ricalibra il
    telefono» = `ui.recalibrate()` (`natpf_remote_map.js`, `natpf_remote.js`, `docs/b27/telecomando.md`,
    `docs/GUIDA_TELECOMANDO.md`). Pannello dello stand senza scorrere a 1366×657, 1024×600, 1280×720, 1024×1024, 720×720.
  - **Difetti della revisione** (ognuno riprodotto con lo script del revisore, poi test, poi correzione):
    1. chi colpisce da un lato solo restava specchiato → **regola dei due versi** nel gioco (`natpf_trial_learn.js`) e nel
       voto del telefono (`site/js/tennis/swing-detect.js`: per lato, spento negli scambi di prova con `setSignVote`, gira
       solo su un colpo al contrario); `racchetta.js`, `test/phone-sim.mjs`;
    2. Player 2 dell'invito che lascia gli scambi di prova restava «p1» → `NatpfTrial.start({ cancel })`,
       `versus.calDone({ interrupted })`;
    3. pausa del telefono del Player 2 negli scambi di prova «rigiocava il punto» → escluso in `natpf_split_ui.js`;
    4. opzione cambiata ed eredità tra visitatori → `madeBy`, `gestureAt`, `keepsGesture`, `calStale`, `demoteIfStale`
       (`natpf_phone_racket.js`), `ui.matchLive()`, controllo a «Gioca» (`natpf_ui.js`), cambio dell'opzione
       (`natpf_kiosk.js`), `natpf_versus_ui.js`, `natpf_training.js`, `natpf_trial.js`;
    5. colpi pianissimi: **provato e scartato** (soglie basse = colpi doppi a tutti), limite scritto e fissato da un test;
    6. pausa di 3 s all'inizio con la rete lenta → `resetting` e `RESET_GRACE_MS`, `phoneHealthOf`; la prima palla aspetta;
    7. stesso schermo con un giocatore che tiene i gesti → conta come fatto (`trialCounts`).
  - **Prove della modalità di base**: `test/natpf-giocando-revisione.test.mjs` (15: i difetti 2, 3, 4, 6, 7 e «Nuovo
    giocatore», telefono che cade / si ricollega / ricarica / spegne lo schermo, chiosco, «Ricalibra» nello stesso schermo,
    sfida tra due computer, minigioco, telecomando vero); `natpf-scambi-di-prova` 25 → 28 (difetto 1, limite 5);
    `natpf-telecomando` 9 → 10; `natpf-racchetta` (voto del telefono). Aiuti in `test/trial-world.mjs`
    (`playWorld`, `playTrial`, `secondPhone`). Nel browser: `tools/e2e/prova.mjs` e `CAL=base`; adattati `natpf-rally`,
    `natpf-servizio-lancio`, `natpf-phone-keep`, `natpf-nuovo-giocatore`, `natpf-stesso-schermo-b25` (e il conto dei
    pulsanti del pannello, 13, anche in `b20`), `natpf-phone-blackout`; `natpf-menu` con «Calibrazione» e 720×720.
  - Verifiche del giro 2: gioco **1242/1242** (dopo l'unione 1223), sito **226/226**, LAN 12/12, programma Windows 33/33,
    build ok, `audit:legend` tutti i criteri. Banco: uguale al giro 1 tranne «Salta, verso invertito» (38–49 colpi su 120
    dal lato sbagliato al posto di 36–46: il voto del telefono aspetta i due versi); «da un lato solo»: 0 colpi su 96 dal
    lato sbagliato con 0, 1, 2 palle perse, destro e mancino (prima 48 su 48). Nel browser, modalità di base:
    `natpf-scambi-di-prova` 25/25 (11,4 s), 25/25 mancino, 18/18, 18/18, 12/12 stesso schermo (14,7 s), 11/11 a 1024×1024;
    `natpf-flusso-tocchi` 5/5, 6/6, 8/8 (9, 11, 14 tocchi); `natpf-menu` 45/45 (pannello a 5 misure); `natpf-telecomando`
    80/80 (di base, sulla build); con `CAL=base`: `natpf-nuovo-giocatore` 30/30, `natpf-formato-fiera` 22/22,
    `natpf-stesso-schermo-b25` 55/55, `natpf-rally` 9/9, `natpf-servizio-lancio` 12/12, `natpf-phone-blackout` 6/6,
    `natpf-diag-session` 24/24, **`natpf-phone-keep` 12/13 tre volte su tre** (la pausa per i sensori fermi arriva a
    1508–1663 ms contro i 1500 chiesti; con `CAL=gesti` 13/13 a 1392 ms: dipende dal momento del segnale del telefono,
    soglia non toccata). Con `CAL=gesti`: `natpf-training-flow` 21/21 ×2, `natpf-tutorial-phone` 46/46 ×2,
    `natpf-tutorial-relink` 9/9, `natpf-split-ready` 34/34, `natpf-1v1-p2p` 39/39, `natpf-stesso-schermo-b20` 52/52,
    `natpf-diag-session` 24/24, `natpf-mira-lato` 23/23, `natpf-modale-gesti` 29/29; `gesture-calibration` 20/20.
  - **Non verificato nel giro 2**: telefoni e persone veri, Windows, ledwall; pagine del telefono di prima in cache (non
    hanno la regola dei due versi); le prove nel browser non elencate; il telecomando dello staff negli scambi di prova
    con un telefono vero (provato nel mondo di prova con il telecomando vero e la mappa, non nel browser).
- Da fare per chi integra: unire con il B27 (pannello dello stand: una riga inserita prima di «Mira del telefono»;
  `natpf_kiosk.js`: un import, un comando, una riga in `paint`) e con l'altra sessione (`natpf_lobby.js`,
  `natpf_training.js`, `index.html`); versione nuova, pacchetti, `PIANO_LAVORI.md` e `TRACCIA_PASSI.md`.

### B28 · integrazione e seconda revisione (12/11, 19:15 UTC) · versione 2026-11-12.5
- Ramo `b28-cal-giocando` (fino a `953eb34`, già unito alla 2026-11-12.3) unito in `natpf-simulator` e poi con
  `origin/natpf-simulator` (2026-11-12.4 dell'altra sessione: Lob & Drop, livelli Evento e Bambini, «Chi gioca»).
  Conflitti: `natpf_ui.js` (`tick`: scambi di prova + segnale del momento giusto + super spiegato) e questo file.
- **Corretto all'unione, difetto della 2026-11-12.4 sul telecomando**: il pulsante «CPU» del telecomando girava tra
  Facile · Esperta · Leggenda cliccando tessere che dalla 12.4 non ci sono più (ora «Chi gioca»). Ora gira tra i cinque
  livelli di `natpf_who.js` con `lobby.setLevel` e dice «Chi gioca: Bambino / Ragazzo / Adulto» o «CPU: Esperta /
  Leggenda» (`natpf_remote_map.js`, `natpf_remote.js`, test e `tools/e2e/natpf-telecomando.mjs`, guida).
- **Seconda revisione indipendente** del giro di correzioni: via libera, nessun bloccante; le sette correzioni reggono
  (verso: 0/24 scambi di prova girati e 0/192 dritti a specchio per chi tira da una parte sola). Corretto subito:
  `det.setSignVote?.(…)` in `site/js/tennis/racchetta.js` (con `racchetta.js` nuovo e `swing-detect.js` vecchio in cache
  ogni messaggio di fase andava in errore). **Aperti, da fare nella prossima versione**:
  1. minigiochi e allenamento non rinnovano il profilo: una calibrazione con i gesti fatta dal menu in «Giocando» vale
     per tutti i minigiochi successivi più la partita dopo; in «Nessuna» il minigioco dal menu non riparte dal profilo
     semplice; passando a «Con i gesti» durante una partita, minigioco e allenamento successivi usano il profilo del
     visitatore prima (`natpf_lobby.js` `startWarmup` e `_startChallenge`; `natpfMatchSeq` avanza solo in
     `startNewMatch`);
  2. sfida tra due computer con «Nessuna»: il profilo non riparte (`natpf_ui.js`, `mode === 'friend'` escluso);
  3. stesso schermo con un giocatore calibrato con i gesti: alla fine degli scambi la scritta e i puntini di quel
     giocatore sono fuorvianti (solo grafica);
  4. `tools/e2e/natpf-phone-keep.mjs`, controllo «A · sensori fermi» entro 1500 ms: il gioco mette in pausa tra 1,0 e
     2,0 s secondo la fase del battito del telefono (1 s) + 700 ms + 300 ms; nel modo di base è uscito 1508, 1663 e
     1563 ms (12/13), con i gesti 1392 ms. Né B27 né B28 hanno cambiato quel percorso: il limite della prova va portato
     a circa 2100 ms;
  5. limiti accettati: telefono al contrario + giocatore che tira da una parte sola non viene più corretto dal voto
     (resta la lettura dalla gravità); colpi a un quinto della forza di un adulto non vengono imparati dagli scambi di
     prova (via d'uscita: pausa → Telefono → «Calibra con i gesti»); pagina del telefono ricaricata a metà partita in
     «Giocando»: profilo semplice fino alla partita dopo.
- Verifiche sul codice unito: gioco 1283/1283, sito 226/226, LAN 12/12, programma Windows 33/33, build ok. Nel browser:
  `natpf-telecomando` 81/81, `natpf-menu` 45/45 (pannello dello stand senza scorrere a cinque misure),
  `natpf-scambi-di-prova` destro a 1024×1024 24/24, mancino 25/25, stesso schermo 12/12, `natpf-flusso-tocchi` 5/5,
  `natpf-training-flow` 21/21, `natpf-nuovo-giocatore` nel modo di base 30/30. Schermate a 1024×1024 guardate (pagina
  «Partita» con «Chi gioca» e «Personaggi», scambi di prova).
  Non rifatte dopo l'unione con la 12.4 (fatte sul ramo sopra la 12.3): `audit:legend`, banco degli scambi di prova, le
  altre prove nel browser elencate nel giro 2. **Non verificato**: telefoni veri, persone vere, Windows, ledwall.

## Registro dello stand collegato al Worker dell'utente (13/11) · [x] versione 2026-11-13.7

- L'utente ha creato su Cloudflare il Worker `natpf-registro` (bucket R2 privato `natpf-registro`, binding `REGISTRO`,
  segreto `CHIAVE_LETTURA` solo suo, `ALLOWED_ORIGINS` = `https://localhost:8443` perché apre il gioco solo dal
  programma Windows). Verificato da qui: pagina «Registro di NATPF Simulator» (Accept: text/html), stato per i programmi
  `{ok:true, registro:'pronto', spazio:true, chiave:true}`, preflight CORS da `https://localhost:8443` → 204 con
  `Access-Control-Allow-Origin: https://localhost:8443`. L'utente ha visto «Ancora nessun giorno registrato.»
- File: `natpf-desktop/registro.json` (`url` = `https://natpf-registro.s-porcelli.workers.dev/`, nessuna chiave),
  versione nei quattro file, `natpf-desktop/novita.txt`, `docs/GUIDA_REGISTRO_CLOUDFLARE.md` §F (com'è oggi).
- Zip Cloudflare **senza** `--registro-url`: il Worker rifiuterebbe il gioco aperto nel browser (origine non permessa).
- Verifiche: controllo rapido gioco 1416/1416, sito 226/226, programma Windows 42/42, build ok.
- **Non verificato**: l'invio vero dal programma Windows installato (serve il PC dell'utente: una partita e poi «Mostra i
  giorni» nella pagina del Worker).

## B37 · Collaudo del 13/11, seconda parte: fuori vero, chi serve, segnale spiegato, F9 nel programma Windows (13/11) · [x] verificato sul ramo, da unire

Ramo `b37-collaudo-bis` (base `1043c85`), commit da `66fd170` al commit di chiusura; documento
`docs/b37/collaudo-13-11-bis.md`. Il lavoro è stato fermato dall'utente alle 16:00 UTC a metà delle verifiche (commit
«IN CORSO» `2bfe09a`, non verificato) ed è stato chiuso da un altro agente nella stessa worktree.
- Richieste dell'utente (collaudo delle 11:25): «Fuori» e punto solo quando la palla esce davvero, anche a fine partita;
  chi deve servire con un elemento di gioco; il «cerchietto bianco che segue la palla» spiegato; pannello dello stand
  dal programma Windows (Ctrl+Maiusc+K non arrivava al gioco sul PC dello stand).
- File: `natpf-tennis/src/natpf/natpf_shot_feedback.js` (verdetto rimandato: `defersVerdict`, `settle`, `_settleIn`,
  `shown`, `phoneQuality`), `src/game_engine.js` (`settle` all'inizio di `_awardPoint` e con la scritta del punto
  dall'host; altezza della scritta «Al servizio»), `natpf_gesture_hud.js`, `natpf_ui.js`, `natpf_phone_racket.js`,
  `site/js/tennis/phone-screen.js` e `racchetta.js` (telefono: `wait` al colpo, `late` con la palla a terra),
  `natpf_serve_marker.js` (nuovo: gemma e riquadro di servizio), `natpf_split.js`, `natpf_timing_cue.js` e
  `natpf-hud.css` (scritta del segnale), `natpf_onboarding.js`, `natpf_new_player.js`, `natpf_kiosk.js` e
  `natpf-desktop/src/` (F9, voce del menu, canale `natpf:staff-panel`, ponte del preload v5), testi con Ctrl+Maiusc+K
  (gioco, telecomando, guide, LEGGIMI); test `natpf-b37-collaudo.test.mjs` (24); prove nel browser nuove
  `natpf-fuori-vero`, `natpf-chi-serve`, `natpf-segnale-spiegato`; impronte in `natpf-tennis/scripts/audit/b37/`.
- Misure (`natpf-fuori-vero`, ms dal colpo, due giri prima e due dopo, JSON in `docs/b37/misure/`): prima «Fuori»,
  anello rosso e telefono 4–11 ms dopo il colpo (0,5–1 s prima della palla a terra); adesso 3–21 ms dopo la palla a
  terra (telefono 3–12); punto, tabellone, voce e schermata di fine partita come prima (fine 1,81 s dopo l'ultima palla).
- Chiusura (commit di chiusura, dopo `2bfe09a`): controllato il commit «IN CORSO»: la tabella delle misure è uguale ai
  JSON riga per riga (corretto solo «il telefono 3–12 ms», era scritto 4–12); il modo `SHOTS=1` di `natpf-fuori-vero`
  che aveva aggiunto non mostrava il verdetto nelle schermate «palla a terra» (timer delle pagine scaduti durante il
  disegno in software, anello rosso senza il suo primo update, telefono già tornato a «Pronto»): corretto (fermo un
  update dopo l'evento, timer delle due pagine fermi con il gioco, telefono fotografato per primo); schermate guardate e
  messe nel documento. Test di unità nuovo per lo stesso schermo (il «Fuori» del Player 2 aspetta la palla, anche sul
  suo telefono). Guida della mira: la nota della diagnostica citata con «F9 nel programma Windows».
  `natpf-stesso-schermo-b20`: 2 controlli volevano ancora il banner d'inizio di prima del B35b (senza « · Formato
  veloce…»): uguali sulla base, aggiornati al testo intero. `natpf-lob-drop`: le partite a seme fisso cambiavano perché
  i 9 oggetti three.js nuovi (gemma e riquadro) consumano sorteggi per il nome e spostano il primo battito delle
  palpebre dei personaggi, che sorteggia ancora in partita: con le palpebre uguali prima del seme base e ramo giocano
  partite identiche (sonda e `TRE_D=1` su tutti e due); corretta la prova (`play()`).
- Verifiche sul codice finale: gioco 1463/1463 (primo giro) e 1463/1464 al secondo con il test nuovo (il KO è un tempo
  della LAN con la macchina a carico 13: da solo 5/5 tre volte); sito 226/226; programma Windows 43/43; LAN 12/12; build
  ok; `audit:legend` uguale alla base riga per riga (87 righe). Prove nel browser: `natpf-fuori-vero` 10/10 (quattro
  giri), `natpf-chi-serve` 36/36, `natpf-segnale-spiegato` 14/14, `natpf-rally` 9/9, `natpf-servizio-lancio` 12/12,
  `natpf-1v1-p2p` 39/39, `natpf-formato-fiera` 25/25, `natpf-fine-partita` 47/47, `natpf-tabellone` 42/42,
  `natpf-menu` 45/45, `natpf-telecomando` 85/85, `natpf-stesso-schermo-b20` 52/52 (dopo l'aggiornamento),
  `natpf-lob-drop` 131/136 al primo giro, 133/136 con la prova corretta (restano 3 «corde», difetto noto dal B32, uguali
  sulla base).
- Non verificato: telefono vero, programma Windows vero (F9 premuto davvero in Electron su Windows), ledwall, persone
  vere; stesso schermo e sfida tra due computer con palle mandate fuori nel browser (solo test di unità); esercizio
  «Servizio» dell'allenamento nel browser; costo di gemma e riquadro con una scheda grafica vera e su Android. Da
  decidere con l'utente: la scritta grande del punto copre il punto di caduta nella metà lontana (vedi il documento).

## B42 · Scambi lunghi che si chiudono (13/11) · [~] unito al B37 sul ramo `b42-scambi-lunghi`, da unire in `natpf-simulator`

Obiettivo (richiesta dell'utente del 13/11): dopo 20 colpi di fila colpi forti e speciali via via più probabili, perché
lo scambio porti a un risultato e la partita sia più veloce. Criterio di fine: regola di base in tutti i modi, misure
prima e dopo, suite, build e prove nel browser, documento `docs/b42/scambi-lunghi.md` completo.
- [x] B42.1 · banco `natpf-tennis/scripts/audit/b42/scambi-lunghi.mjs` e misure prima, due serie di semi (`ea93660`).
- [x] B42.2 · «Scambio che si scalda» acceso di base, dal 20° colpo, per tutti e due i lati e la CPU (`f17f016`):
  `natpf_hot_rally.js`, `game_engine.js`, `natpf_stroke_outcome.js`, `natpf_skill.js`, `natpf_legend.js`,
  `natpf_kiosk.js`, `index.html`, test (nuovo `natpf-b42-scambi-lunghi.test.mjs`, aggiornati B20, B25, Leggenda B16, CPU
  sotto pressione, servizio).
- [x] B42.3 · scritta piccola «Scambio caldo · colpo N», registro (`stand.caldo` in tutti i modi) e sezione «Scambi
  lunghi» del riassunto (`e5ab4da`).
- [x] B42.4 · fotografia del lavoro fermato dall'utente alle 16:00 UTC (`ae76bdf`, «NON verificato») controllata da chi
  ha ripreso: in `game_engine.js` solo commenti; tolto `natpf-tennis/legend-prova-tmp.mjs` (file temporaneo); i file
  «dopo» rifatti sul codice finale vengono identici (banco 56/56 righe, tracce 13/13 e tracce della base, `--b25`,
  `audit:cpu`, `audit:evento` Bambini, `audit:legend`), e anche i «prima» di legend e cpu-pressione rifatti sulla base;
  le tabelle della §3 del documento rigenerate dai file: 106/106 righe uguali (corretta una riga del testo, Casual
  bambino −3,3 e non −3,4).
- [x] B42.5 · verifiche e documento (`ff93706` prove e test, poi il commit dei documenti). File:
  `docs/b42/scambi-lunghi.md` (§4 e §7 scritte, §1, §2, §3.2, §6, §8 corrette, immagine `contro-la-cpu-colpo-22.jpg`), `tools/e2e/natpf-rally.mjs` (il controllo B42 ora avvia una
  partita: lo scambio caldo si decide in `startNewMatch`), nuovo `natpf-tennis/test/natpf-b42-sfida.test.mjs` (snapshot
  `hot` dall'host al P2 e scritta sul P2; senza le due righe del motore fallisce), risultati nuovi
  `evento-bambini-prima-fe6f774.txt` e `bambino-24-semi.md`, `docs/PROJECT_MEMORY.md` (§Scambi lunghi).
  Verifiche: gioco 1451/1451, sito 226/226, Windows 42/42, LAN 12/12, build ok, `audit:legend` tutti i criteri (contro la
  Leggenda «tennista» 33,6 → 28,1% dei punti, «preciso» 38 → 32,4%). Nel browser: `natpf-rally` 10/10 (primo giro 9/10,
  corretta la prova), `natpf-formato-fiera` 25/25, `natpf-1v1-p2p` 39/39, `natpf-menu` 45/45,
  `natpf-stesso-schermo-b20` 51/53 (i due KO del banner del sorteggio ci sono anche sulla base `fe6f774`, 50/52: prova
  rimasta indietro rispetto al B35b), `natpf-leggenda` 6/7 in tre giri (posa nell'allungo in corsa; base 7/7 in due
  giri; il fuori soglia misurato è al 12° colpo, prima dello scambio caldo: da decidere).
  Non verificato: persone e telefoni veri, Windows, ledwall, installer (nessuna versione nuova), sfida tra due computer
  oltre il 20° colpo nel browser, webcam.
- [x] B42.6 · unione con il B37 (13/11 sera): `c619266` (unione B37 su `natpf-simulator`, non ancora in push) unito nel
  ramo con un'unione normale, commit `d48155c`. Conflitti come previsto: testa di `natpf_hot_rally.js` (resta quella del
  B42, con «F9 nel programma Windows» nella riga «Dove si spegne»), questo file e `PROJECT_MEMORY.md` (tutte e due le
  parti, prima il B37); uniti da git e controllati: `game_engine.js` (le due chiamate `settle` del B37, in `_awardPoint`
  e in `_handleRoomStateUpdate`, e le due righe `hot` del B42, nello snapshot e nella lettura del P2: le due differenze
  applicate identiche), `index.html` e `natpf_kiosk.js` (le due parti), `natpf-stesso-schermo-b20.mjs` (banner del
  sorteggio con il testo del B37, controlli dello scambio caldo del B42). F9 anche nella §2 del documento B42.
  Verifiche sul codice unito: gioco **1475/1475** (1451 del B42 + 24 del B37), sito 226/226, programma Windows 43/43,
  LAN 12/12, build ok; `audit:legend` identico a `scripts/audit/b42/risultati/legend-dopo.txt` (tutti i criteri). Nel
  browser (porte 4170–4190, una prova alla volta; l'altro agente faceva girare le sue prove nello stesso momento):
  `natpf-rally` 10/10, `natpf-stesso-schermo-b20` **53/53** (i due controlli del sorteggio ora passano con il testo del
  B37), `natpf-fuori-vero` 10/10 (al primo giro 6/10 con `natpf-chi-serve` dell'altro agente in parallelo: il primo
  colpo mandato fuori largo ha chiuso il punto con «Nice Shot!», palla passata oltre il fondo a 1,08 m da terra senza
  rimbalzare; rifatta da sola 10/10, tempi come nel B37), `natpf-segnale-spiegato` 14/14, `natpf-menu` 45/45,
  `natpf-formato-fiera` 25/25, `natpf-1v1-p2p` 39/39 (sulla build). Scritte in alto al centro: quella del segnale del
  momento giusto (B37, prime 3 palle con l'anello di ogni partita) sta a 101–136 px a 1280 × 720, quella dello scambio
  caldo (dal 20° colpo) a 172–197 px; nel gioco normale non compaiono insieme (al 20° colpo le prime 3 palle con
  l'anello sono già passate) e, forzate insieme con una sonda (prima palla con l'anello al 21° colpo), non si toccano:
  36 px tra le due a 1280 × 720, 53 px a 1920 × 1080.
  `natpf-leggenda`, la stessa prova tre volte per parte, alternate: codice unito 7/7, 6/7, 6/7; `c619266` (solo B37)
  7/7, 6/7, 6/7. Quando fallisce è sempre la stessa verifica, la posa negli allunghi **in corsa** durante la partita
  (centro del piatto da −0,13 a +0,04 m oltre il posto normale invece di almeno +0,05; la testa va sempre verso la
  palla, la mano tranne una volta su `c619266`, −0,12 con la palla a 2,29 m; gli allunghi forzati passano sempre): unito
  6 fuori soglia su 13 allunghi in partita, `c619266` 5 su 21. Il B42 non la peggiora in modo chiaro: fallisce anche
  senza. Con una copia della prova che stampa anche lato e numero del colpo (solo letture, un giro per parte: unito 6/7,
  `c619266` 7/7): il «posto normale» del piatto è una mediana unica degli impatti normali che mescola dritto (0,53–0,54
  m) e rovescio (0,78–0,79 m), e secondo il miscuglio va da 0,56 a 0,77 m; un allungo di dritto confrontato con un
  riferimento quasi tutto di rovescio risulta indietro (−0,05) anche quando, rispetto ai dritti, va avanti di 0,16 m. Da
  correggere nella prova (riferimento per lato); nel disegno (`legendReachPose`, `racket_kinematics`) resta solo
  l'allungo corto in corsa (palla a 1,05 m, CPU a 5,3 m/s: +0,03 per lato). Gli allunghi in partita delle copie
  diagnostiche sono tutti prima del 20° colpo. Dettagli nel documento B42, §7 e §8.
  Non verificato: come sopra (persone e telefoni veri, Windows, ledwall, installer, webcam); il B37.1 (scritta «Al
  servizio» al posto della gemma) non c'è ancora in questo ramo.
- [ ] Da fare per chi unisce in `natpf-simulator`: versione nuova, pacchetti, `PIANO_LAVORI.md` e `TRACCIA_PASSI.md`.
  Poi, a parte (non tocca il B42): la prova `natpf-leggenda` con il riferimento del piatto per lato (dritto e rovescio),
  e decidere con l'utente se sistemare nel disegno l'allungo corto in corsa della Leggenda.
