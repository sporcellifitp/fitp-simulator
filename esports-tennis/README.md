# SuperTennis Arena · ESPORTS FITP

Gioco di tennis 3D per telefono (verticale) nell'arena ESPORTS FITP / SuperTennis: partita 1 contro 1 contro il
computer e sfida online con un link. Nasce dalla playable Higgsfield «Swipe Smash» (personaggi e suoni ripresi dal
suo file HTML), ma è riscritto da zero in codice leggibile.

Online: <https://supertennis-arena.higgsfield.app> (sito Higgsfield di tipo *game*, id `99c4516a-0d2b-4aa6-8f10-6cfcd9dc7a88`).

## Struttura

| Percorso | Cosa |
|---|---|
| `public/index.html`, `public/css/` | pagina e interfaccia (menu, tabellone, scritte) |
| `public/js/arena.js`, `textures.js`, `figures.js` | arena ricostruita dagli screenshot: campo, pareti con loghi, tribune e pubblico, sedia arbitro, panchine, tabelloni, torri faro, terrazze, alberi, skyline, cielo |
| `public/js/player.js` | tennista: racchetta, corsa, colpi procedurali con cinematica inversa (dritto, rovescio bimane, servizio, volée, smash; topspin, slice, pallonetto) |
| `public/js/physics.js` | pallina deterministica (gravità, attrito, effetto, rimbalzo, rete) e calcolo della traiettoria verso un bersaglio |
| `public/js/rules.js` | punteggio (formati Rapida / Set breve / Set completo, vantaggi, killer point, tie-break) |
| `public/js/match.js` | partita: servizio, scambi, difesa automatica, regole del punto, CPU, sincronizzazione online |
| `public/js/input.js` | gesto a scorrimento → colpo |
| `public/js/camera.js` | inquadratura alta dietro il proprio giocatore |
| `public/js/net.js`, `server/` | online: client WebSocket; regole della stanza (`server/logic.js` è generato) |
| `tools/` | strumenti di sviluppo: server locale con stanze online, prove automatiche con Chromium, anteprime |

## Comandi

```sh
cd esports-tennis
npm test                         # fisica, punteggio, regole della stanza (node:test)
node tools/build-logic.mjs       # rigenera server/logic.js da public/js/rules.js + server/logic-game.js
cd tools && npm i && node mock-server.mjs   # gioco + stanze online in locale su :8790
```

Prove automatiche (Chromium di Playwright, con il server locale attivo): `tools/auto.mjs` (partita contro la CPU in
gioco automatico), `tools/online.mjs` (due browser che si sfidano). Le anteprime `public/*-preview.html` (arena,
logo, pose dei colpi) servono solo allo sviluppo e non vengono pubblicate.

## Pubblicazione su Higgsfield

Il repository del sito è su Higgsfield (template *game*: `app/public` = client, `app/src/logic.js` = regole della
stanza, `app/src/room.ts` modificato per inoltrare i messaggi `rt` in tempo reale). Si copia `public/` (senza le
anteprime) in `app/public`, `server/logic.js` in `app/src/logic.js`, si fa commit/push con `website_repo_access` e si
pubblica con `deploy_website`.

## Online: chi decide cosa

Ogni telefono vede la partita dal proprio lato. Chi colpisce manda il colpo (posizione, velocità, effetto) alla
stanza; il telefono di chi difende simula la stessa traiettoria (fisica deterministica) e decide l'esito: risponde
con un colpo, oppure dichiara fuori/rete/vincente/fallo. Il server controlla solo che a farlo sia il giocatore
giusto e tiene il punteggio. Le posizioni dei giocatori passano come messaggi `rt` non salvati (~12 al secondo).

## Marchi e licenze

- ESPORTS FITP: file ufficiale già nel repository (`site/assets/brand/esports-fitp-neg.png`).
- SuperTennis: **ricreato** dagli screenshot (font Kanit, OFL) — non è il file ufficiale; da sostituire con il
  vettoriale ufficiale quando disponibile (`drawSuperTennis` in `textures.js`).
- three.js (MIT), Kanit (SIL OFL 1.1, `public/assets/fonts/OFL-Kanit.txt`).
- Personaggi, colpi, rimbalzi e musica: dalla playable Higgsfield «Swipe Smash» dell'utente. Pubblico e applausi
  sintetizzati.
