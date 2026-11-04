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

## B6 · Valutazione Windows e architettura · [x] · 04/11/2026
- [x] B6.1 · `docs/DESKTOP_WINDOWS.md`: contesto d'uso (risposte del 04/11), architettura attuale con i riferimenti,
  audit (rendering, latenza, Windows), cosa richiede la rete, confronto A/A+/PWA/Electron/Tauri/NW.js/Neutralino,
  architettura consigliata (zip A+ con Edge in modalità app/chiosco; Electron facoltativo; Tauri sconsigliato),
  benefici attesi, piano F0–F5, compatibilità con il browser, rischi. Basato sull'analisi in sola lettura del 04/11
  (misure di rendering sulla build del 29/10, WebGL software: conteggi validi, fps no). Nessun codice cambiato.
  Non verificato: niente provato su Windows. Pacchetti invariati.
