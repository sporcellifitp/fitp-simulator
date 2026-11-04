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
