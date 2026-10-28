# SESSION_HANDOFF · ultimo stato verificato

Aggiornato: 28/10/2026 · branch `natpf-simulator`.

## Stato

- Ultimo commit verificato: vedere `git log -1` (questo file è aggiornato a ogni task; se il log mostra commit
  successivi non descritti qui, fidarsi del repository e aggiornare questo file).
- Test: baseline 389/390 (1 saltato per dipendenze LAN). Build: da verificare dopo le modifiche UI.
- Ambiente: Chromium di Playwright funziona (`node scripts/ui-shots.mjs` con `npm run dev` attivo).

## Push

L'utente ha chiesto di non fare push senza autorizzazione esplicita: il push di un checkpoint è stato bloccato il
28/10. I commit restano **locali** sul branch `natpf-simulator` finché l'utente non autorizza il push. Il primo
checkpoint pubblicato su GitHub è `59ce56c`; quelli successivi sono solo nel checkout locale.

## Problemi aperti

- Musica: nessun modello musicale Higgsfield utilizzabile per asset autonomi → musica generativa originale.
- Prove fisiche con telefono Android reale e webcam: mai eseguite in questo ambiente.

## Prossima azione esatta

T3 (redesign UI) completato nelle parti principali. Prossimo: T4 audio — volumi separati musica/effetti/voci
(`audio_engine.js`: `musicGain`, `sfxGain`, `voice.volume`; cursori in Opzioni e Pausa), playlist e brani nuovi in
`natpf_music.js`, effetti per tipo di colpo e vocalizzazioni in `natpf_sfx.js`. Poi T5 minigiochi.
