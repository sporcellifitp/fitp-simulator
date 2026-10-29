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

## Progetto parallelo · SuperTennis Arena (`esports-tennis/`)

- Gioco su Higgsfield: sito *game* `supertennis-arena` (id `99c4516a-0d2b-4aa6-8f10-6cfcd9dc7a88`); il repository
  del sito vive su Higgsfield, la fonte di verità del codice è `esports-tennis/` qui (vedi il suo README).
- Online dal 29/10/2026 l'aggiornamento «parità col video» (commit 7129e48 + bb72d6b, repo Higgsfield f3b93ff);
  verificato: file pubblicati identici a quelli locali, partita automatica senza errori in Chromium. Il primo deploy
  è fallito per un 401 di Cloudflare lato Higgsfield; il secondo è riuscito.
- Problemi aperti: logo SuperTennis ricreato (serve il file ufficiale); prestazioni e comandi mai provati su
  telefono reale; movimenti ancora procedurali.
- Prossima azione: quando arrivano i file FBX di Mixamo, conversione offline FBX → clip JSON sul rig Tripo
  (piano in `docs/WORK_PROGRESS.md`, terza richiesta).
