# SESSION_HANDOFF · ultimo stato verificato

Aggiornato: 28/10/2026 · branch `natpf-simulator`.

## Stato

- Ultimo commit verificato: vedere `git log -1` (questo file è aggiornato a ogni task; se il log mostra commit
  successivi non descritti qui, fidarsi del repository e aggiornare questo file).
- Test: baseline 389/390 (1 saltato per dipendenze LAN). Build: da verificare dopo le modifiche UI.
- Ambiente: Chromium di Playwright funziona (`node scripts/ui-shots.mjs` con `npm run dev` attivo).

## Problemi aperti

- Musica: nessun modello musicale Higgsfield utilizzabile per asset autonomi → musica generativa originale.
- Prove fisiche con telefono Android reale e webcam: mai eseguite in questo ambiente.

## Prossima azione esatta

T1: lanciapalle 3D (`natpf-tennis/src/natpf/natpf_ball_machine.js`), agganciato a `natpf_training._feed`.
Poi T2 tutorial (vedi `docs/WORK_PROGRESS.md`).
