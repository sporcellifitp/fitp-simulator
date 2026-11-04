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

## B6 · Valutazione Windows e architettura · [x] · 04/11/2026
- [x] B6.1 · `docs/DESKTOP_WINDOWS.md`: contesto d'uso (risposte del 04/11), architettura attuale con i riferimenti,
  audit (rendering, latenza, Windows), cosa richiede la rete, confronto A/A+/PWA/Electron/Tauri/NW.js/Neutralino,
  architettura consigliata (zip A+ con Edge in modalità app/chiosco; Electron facoltativo; Tauri sconsigliato),
  benefici attesi, piano F0–F5, compatibilità con il browser, rischi. Basato sull'analisi in sola lettura del 04/11
  (misure di rendering sulla build del 29/10, WebGL software: conteggi validi, fps no). Nessun codice cambiato.
  Non verificato: niente provato su Windows. Pacchetti invariati.
