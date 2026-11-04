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
