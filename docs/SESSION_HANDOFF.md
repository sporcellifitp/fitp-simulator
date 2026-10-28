# SESSION_HANDOFF · ultimo stato verificato

Aggiornato: 28/10/2026 · branch `natpf-simulator`.

## Stato

- Commit della sessione del 28/10 (tutti su `natpf-simulator`, **solo il primo pubblicato** su GitHub):
  `59ce56c` memoria · `636a5e2` lanciapalle 3D · `4b170f1` moti dei gesti verificati · `ee97d2a` tutorial 3D ·
  `76989a1` redesign UI · `ce7d7c9` voci e effetti · `046acd5` musica e volumi · `b3e0338` minigiochi ·
  `f801249` verifica finale · `a641d83` piano media reali · `215ce86` media reali Higgsfield, intro e menu ·
  ultimo: clip rovescio e servizio, documenti (vedere `git log -1`).
- Test: gioco 412/412 dopo i media reali (prima 409/409 ), sito 148/148, build riuscita.
- Ambiente: Chromium di Playwright funziona (`node scripts/ui-shots.mjs` con `npm run dev` attivo).

## Push

L'utente ha chiesto di non fare push senza autorizzazione esplicita: il push di un checkpoint è stato bloccato il
28/10. I commit restano **locali** sul branch `natpf-simulator` finché l'utente non autorizza il push. Il primo
checkpoint pubblicato su GitHub è `59ce56c`; quelli successivi sono solo nel checkout locale.

## Problemi aperti

- Media reali (28/10): 6 clip dei colpi su 11 accettate dopo la verifica; incrociato, lungolinea, volée e piatto
  restano in 3D. Le clip vanno guardate anche da una persona sul telefono vero (il controllo è stato fatto sulle
  griglie di fotogrammi). Budget Higgsfield di questa richiesta: 125,5 su 250 crediti; sull'account ci sono altre
  spese contemporanee (voci ElevenLabs, 128,5 crediti) non fatte da questa sessione: da chiarire con l'utente.

- Musica: nessun modello musicale Higgsfield utilizzabile per asset autonomi → musica generativa originale.
- Prove fisiche con telefono Android reale e webcam: mai eseguite in questo ambiente.

## Prossima azione esatta

0. Far guardare all'utente intro, lezione e clip (`npm run dev`, menu → Allenamento); se una clip non convince,
   toglierla da `CLIPS` in `src/natpf/natpf_media.js` (torna l'animazione 3D).

1. Se l'utente autorizza: `git push -u origin natpf-simulator` (i commit dopo `59ce56c` sono solo locali).
2. Prova fisica con smartphone Android e webcam (vedi «Da fare» in `docs/WORK_PROGRESS.md`).
3. Ascolto di musica e voci da parte di una persona; eventuali ritocchi di volume in `NATPF_TRACKS[].volume`.
