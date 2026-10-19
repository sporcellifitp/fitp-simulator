# MEMORY.md · NATPF Simulator

Memoria di lavoro del progetto: da leggere all'inizio di ogni sessione e da aggiornare alla fine di ogni attività.
Non contiene password, token o altri segreti.

Ultimo aggiornamento: 19 ottobre 2026, sera · branch `claude/friendly-fermat-dwv2w2` (ripartito da
`feature/natpf-tennis-v2`, che contiene tutto il lavoro precedente; i branch `backup/*` e gli altri `feature/natpf-*`
sono già inclusi)

## 1. Descrizione

Simulatore di tennis per le Nitto ATP Finals (Torino): partita 1v1 (e 2v2) contro la CPU o un amico, con lo
smartphone usato come racchetta (sensori di movimento), la webcam o mouse e tastiera. Pensato per eventi (chiosco,
Radar del servizio, classifica del giorno) e per casa. Funziona da sito statico (Cloudflare Pages) e in rete locale
(pacchetto LAN per Windows con Node portatile).

Regola di marchio: interfaccia, codice e documenti «white label» (nessun nome di strumenti o fornitori esterni;
ammessi solo gli header di copyright delle librerie open source). Loghi ufficiali: Nitto ATP Finals ed ESPORTS FITP.

## 2. Architettura

- **Gioco** (`natpf-tennis/`): Vite + three.js. `src/game_engine.js` è il motore (fisica palla, punti, CPU, P2);
  `src/natpf/*` sono i moduli NATPF (lobby, allenamento, sfide, chiosco, arena, telefono, p2p).
- **Pagina telefono e moduli condivisi** (`site/js/tennis/`, `site/tennis/racchetta.html`): sensori → rilevatore
  dei gesti → messaggio di swing → collegamento col computer.
- Catena del colpo col telefono: `devicemotion` → `face-tracker.js` (orientamento, piatto, `headAt`) →
  `swing-detect.js` (picco, preparazione, rientro) → `calibration.js` (profilo personale) → `swing-message.js` →
  `link.js` → `natpf_phone_racket.js` (`natpfSwingToEngine`, modelli adattivi) → `natpf_gestures.js`
  (`classifyPhoneShot`: dritto/rovescio, lob, palla corta, tagliato) → `game_engine.js` (`_attemptPlayerRallyStrike`,
  `natpf_skill.js` per direzione e profondità).
- **Multigiocatore (sfida un amico)**: host unico arbitro. Relay `/api/match/*` (server LAN, `scripts/match-relay.mjs`)
  o, su sito statico, `natpf_p2p.js` (intercetta le stesse chiamate e usa WebRTC con PeerJS; invito
  `?room=AT-XXXX&role=p2&net=p2p`). Sessione 1v1 in `natpf_versus.js` (funzioni pure: lobby, stato del P2, contatori)
  e `natpf_versus_ui.js` (lobby dell'host, pausa se il P2 esce, pannello del P2); nel motore `engine.versus`,
  `_versusInMatch()`, `endVersus()`, `versusGuest`. Flusso: «Sfida un amico» crea la stanza (riusata dopo un
  ricaricamento, `sessionStorage natpf.versus.room`) → link → P2 entra e preme «Sono pronto» (`touch=p2&ready=1`) →
  «Gioca» si sblocca → snapshot ogni 45 ms (in lobby `{lobby}`, in pausa `{paused}`, chiusura `{closed}`).
- **Arena**: `site/js/tennis/arena.js` (`buildArena`), decal dei loghi sul muro, pubblico con InstancedMesh,
  `natpf_arena.js` (campo d'allenamento, anisotropia).

## 3. Tecnologie

JavaScript (moduli ES), three.js 0.160, Vite, React (solo shell), MediaPipe (webcam), PeerJS (p2p), Node per test
(`node:test`), server LAN e strumenti; Playwright/Chromium per le prove nel browser; Python + Ghostscript/pdftocairo
per generare le grafiche dei loghi (`natpf-tennis/scripts/brand/brand-assets.py`).

## 4. Struttura delle cartelle

| Percorso | Contenuto |
|---|---|
| `natpf-tennis/src/` | motore e moduli del gioco |
| `natpf-tennis/test/` | test del gioco (`npm test`) |
| `natpf-tennis/lan/` | server LAN, pacchetto Windows (`pacchetto.mjs`) |
| `natpf-tennis/scripts/` | build sito, loghi, audit dello scambio |
| `site/js/tennis/` | telefono-racchetta, calibrazione, arena condivisa |
| `site/assets/brand/`, `site/assets/arena/` | loghi e grafiche dell'arena |
| `tools/test/` | test dei moduli condivisi (`node --test tools/test/*.test.mjs`) |
| `docs/` | roadmap (`NATPF_ROADMAP.md`), gesti e latenza, eventi, storia |

## 5. Setup dell'ambiente

```
cd natpf-tennis && npm install
node node_modules/vite/bin/vite.js build      # build in natpf-tennis/dist
npm test                                      # test del gioco
node --test ../tools/test/*.test.mjs          # test condivisi (dalla root: tools/test/*.test.mjs)
npm run lan                                   # server LAN (HTTPS, QR per il telefono)
npm run audit:rally                           # varietà e equilibrio dello scambio
```

Consegne: zip Cloudflare (contenuto di `dist` + `_headers` da `site/_headers`, file < 25 MiB, percorsi con «/») e
zip LAN Windows (`node lan/pacchetto.mjs --out=... --node=<zip di Node per Windows>`). Prima di consegnare: estrarre
e provare da un server statico, cercare le parole vietate dal white label.

## 6. Funzionalità principali

Intro, menu da console (frecce/Invio/Esc), modalità contro CPU / sfida un amico, 1v1 e 2v2, allenamento con
calibrazione ed esercizi (dritto, rovescio, pallonetto, palla corta, servizio, angoli), sfide per eventi (Radar,
Bersagli 60", Scambio infinito, Sfida il campione), nickname e classifica del giorno (solo nel browser), modalità
chiosco e pannello dell'addetto (Ctrl+Maiusc+K o logo premuto 3 s), diagnostica e registrazione dei gesti (Maiusc+D).

## 7. Problemi noti

- Prove con telefoni veri, webcam con persone e due computer reali non possibili in questo ambiente.
- p2p su Cloudflare senza server TURN: alcune reti (NAT simmetrici) possono non collegarsi.
- Il browser di prova usa la grafica software: fotogrammi lenti (1,6–1,8 s), tempi delle prove automatiche imprecisi.
- Test e2e LAN: il telefono simulato non chiude la connessione WebRTC verso l'indirizzo di rete del contenitore, e il
  browser di prova non raggiunge quell'indirizzo (il P2 apre l'invito su 127.0.0.1, ripiego nella prova).
- 1v1: il ritardo di rete P2 → host è compensato solo per il telefono e solo per il tempo nel relay; mai provato con
  due computer veri né su reti diverse; senza TURN alcune reti non si collegano. Tra due giocatori automatici perfetti
  gli scambi possono durare a lungo (84 colpi nella prova).
- Il link d'invito porta il formato scelto al momento della stanza; se si cambia formato dopo, il P2 lo riceve dal
  primo snapshot (non è un errore, solo un attimo di ritardo).

## 8. Soluzioni tentate e decisioni tecniche

- Calibrazione: prima il rientro della mano veniva preso come gesto successivo (soglia «40% del picco» non
  bastava). Decisione: quiete prima di ogni gesto + posizione della mano integrata lungo l'asse del colpo; il primo
  movimento che riporta la mano al punto di partenza è il rientro, salvo pausa ≥ 600 ms lontano dal centro.
- Dritto/rovescio: il rovescio morbido (lungolinea) su palla appena dalla parte del dritto veniva trattenuto come
  «preparazione» e il rientro della mano diventava il dritto. Decisione: il gesto opposto dopo quello trattenuto è il
  colpo solo se veloce almeno l'80% (`prepFollow`), altrimenti vale il gesto trattenuto; zona «palla diretta» 0,6 m
  (nessun verso atteso); gesti senza verso orizzontale: lato dalla posizione della palla, non dalla mira.
- Pallonetto: volo di 2 s con compensazione dell'aria (prima cadeva a metà campo).
- Verso verticale del colpo dal giroscopio/orientamento (`headAt`), non dall'accelerometro (rumoroso con presa a manico).
- TORINO: i riferimenti (camera dietro una riga di fondo) mostrano le due scritte dritte da quella camera. Con due
  giocatori ognuno ha la sua camera: le scritte si girano sul computer di ciascuno (`arena.setViewer`), così il campo è
  uguale per tutti e due. Primo tentativo (d78b0f2: ognuna verso la metà opposta) scartato: la scritta vicina, che la
  camera di gioco inquadra, risultava capovolta.
- Host autorevole per il multigiocatore; snapshot con formato (`fmt`) per il 2v2.
- 1v1 (punto 4): la revisione (due esami indipendenti del codice, quasi tutti i difetti riprodotti) ha mostrato che
  mancava una sessione. Decisioni: i colpi del P2 contano sull'host solo con `_versusInMatch()`; il computer del P2
  non assegna punti e non prepara il servizio (`_awardPoint` e `POINT_OVER` lasciati all'host), riceve fase, tempo
  della fase, effetto e rimbalzi della palla e la fine partita; scegliere un'altra modalità chiude la stanza
  (`endVersus` manda `{closed}`); durata a scelta anche in 1v1 (motore e HUD la forzavano a un game); relay: nomi del
  gioco (prima «Ammaar»/«Challenger»), `touch=1` accettato, codici senza 0/O/1/I, stanza riusata, epoca, 404 per
  stanza inesistente, pulizia dopo 6 h; WebRTC: stanza «occupata» per un secondo P2, Peer ricreato dopo un errore,
  host introvabile per 20 s segnalato. Non fatto: compensazione del ritardo per mouse/webcam del P2 (vedi §7).
- Varietà (punto 3): ogni colpo passava la rete al minimo (1,25–1,27 m) e la CPU sceglieva il colpo da un ciclo fisso.
  Decisione: `shotArc` (altezza sulla rete e top spin da tipo di colpo e forza), `angleDepth` (angolo stretto = palla
  corta), `bounceSpin` (rimbalzo con l'effetto), `cpuShotChoice` (schemi a peso: centro, campo libero, contropiede,
  profondo, angolo, tagliato, parabola alta, pallonetto sul giocatore a rete).
- Aria: `_launchBallToTarget` ignora l'attrito e i colpi cadevano ~2 m prima del bersaglio. Prima prova: correzione su
  tutta la velocità → palle precise anche di lato, ma tennista in Esperto dall'89% al 67% (out larghi: la mira laterale
  era tarata sulla palla accorciata del 20%). Decisione: `fixAir` corregge solo la componente lungo il campo; il
  bilanciamento resta quello di prima (audit entro pochi punti) e la profondità diventa vera.

## 9. Modifiche recenti

| Data | Commit | Cosa | File |
|---|---|---|---|
| 19/10/2026 | 684021a | Calibrazione: fermo prima di ogni gesto, rientro al centro escluso, tremolii ignorati, scelta del gesto nel verso richiesto | `site/js/tennis/calibration.js`, `racchetta.js`, `main.js`, `natpf-tennis/src/natpf/natpf_training.js`, `tools/test/calibration-quick.test.mjs`, `tools/test/gesture-training.test.mjs` |

| 19/10/2026 | d8b7bec | Rovescio lungolinea non più letto come dritto | `site/js/tennis/swing-detect.js`, `natpf-tennis/src/natpf/natpf_phone_racket.js`, `natpf-tennis/test/natpf-prep.test.mjs` |
| 19/10/2026 | 73c0eda + prova | 1v1: sessione, lobby, host arbitro, pausa/rientro, stanza chiusa o inesistente, errori del P2, relay e WebRTC; prova a due sessioni | `natpf-tennis/src/natpf/natpf_versus.js`, `natpf_versus_ui.js`, `natpf_ui.js`, `natpf_lobby.js`, `natpf_p2p.js`, `src/game_engine.js`, `src/motion_controls.js`, `src/hud_ui.js`, `scripts/match-relay.mjs`, `natpf.css`, `test/natpf-versus.test.mjs`, `tools/e2e/natpf-1v1-p2p.mjs`, `test/e2e/lan-e2e.mjs`, `docs/NATPF_ROADMAP.md` |
| 19/10/2026 | 494f583 (dopo d78b0f2) | TORINO: orientata per chi gioca (`setViewer`, P2 girato), 3,6 m senza deformazione, 2,1 m dietro la riga | `site/js/tennis/arena.js`, `site/js/tennis/scene.js`, `natpf-tennis/src/natpf/natpf_arena.js`, `natpf-tennis/test/natpf-arena-court.test.mjs` |
| 19/10/2026 | 4f4304f | Varietà di traiettorie e angoli per giocatore, P2 e CPU; palla che cade alla profondità voluta (prima ~2 m corta per l'aria) | `natpf-tennis/src/natpf/natpf_skill.js`, `natpf-tennis/src/game_engine.js`, `natpf-tennis/test/natpf-variety.test.mjs`, `natpf-tennis/scripts/audit/variety.mjs` |

## 10. Stato delle attività (richiesta in 6 punti del 19/10)

| # | Attività | Stato |
|---|---|---|
| 1 | Calibrazione telefono (falsi movimenti, rientro, gesto precedente) | fatto, provato con test a mano simulata; da provare con telefono vero |
| 2 | Dritto/rovescio, rovescio lungolinea | fatto, provato con gesti simulati; da provare con telefono vero |
| 3 | Varietà di traiettorie e angoli (anche P2) | fatto, provato con audit e test nel motore senza browser; da vedere giocando |
| 4 | Revisione completa 1v1 con verifica a due sessioni | fatto: rifatto da capo (il lavoro dell'altro PC non era stato pubblicato). Provato con due sessioni del browser sul sito statico, tutti e 7 i passi della richiesta (18/18), e con il server LAN; due computer e due persone veri non provati |
| 5 | Grafica del campo simmetrica (TORINO su entrambe le metà, loghi della rete) | fatto: le due TORINO si leggono dritte dalla camera di chi gioca su quel computer (P1 e P2 vedono lo stesso campo), proporzioni del file e 2,1 m dietro la riga come nei riferimenti; loghi della rete già leggibili dai due lati (8785a11). Provato con rendering nel browser dalle camere di gioco di P1 e P2 |
| 6 | MEMORY.md | fatto, da aggiornare a ogni attività |

## 11. Prossimi passi

1. Prova con persone vere: telefono (punti 1–2), varietà dei colpi giocando (punto 3), 1v1 su due computer (punto 4).
2. Unire `claude/friendly-fermat-dwv2w2` nel branch principale del lavoro (`feature/natpf-tennis-v2`) dopo la prova.
3. Server TURN per il 1v1 su reti che bloccano WebRTC; compensazione del ritardo per mouse/webcam del P2.
4. Altri punti aperti: `docs/NATPF_ROADMAP.md` §3.

## 12. Test e verifiche

- `tools/test`: 126 test passano (19/10). Nuovi: calibrazione con tremolio, rientro al centro, preparazione e
  accompagnamento (il test fallisce con il codice precedente: riproduce il difetto segnalato).
- `natpf-tennis/test`: 140 test passano (19/10, dopo il punto 4; nuovi `natpf-versus.test.mjs`, 9 test che
  falliscono con il codice di prima, e `natpf-arena-court.test.mjs`).
- Prova a due sessioni (punto 4): `cd tools/e2e && node natpf-1v1-p2p.mjs` (dopo la build): stanza dal menu, link,
  P2 entra, «Sono pronto», «Gioca», partita al meglio di 3 con il servizio del P2, punteggio uguale, P2 esce (host in
  pausa con spiegazione) e rientra (si riprende), host chiude (P2: «stanza chiusa»), link inesistente: **18/18**.
- Grafica (punto 5): rendering dalle camere di gioco di P1 e P2 con Chromium senza schermo.
- Punto 3: `natpf-tennis/test` 129 test (nuovo `natpf-variety.test.mjs`).
  `npm run audit:variety`: altezza sulla rete del giocatore p10–p90 1,38–2,02 m (prima 1,26–1,74), scarto
  rimbalzo–bersaglio −0,02 m (prima −2,1 m). `npm run audit:rally`: punti vinti per profilo entro ±5 punti da prima.
- Prima del punto 3: `natpf-tennis/test` 123 test (19/10). Nuovi: rovescio morbido + rientro (fallisce col codice
  precedente), zona palla diretta e lato dalla palla.
- **Non verificato**: calibrazione con un telefono vero in mano; soglie (`CAL.settle` 220 ms, `homeRest` 600 ms,
  `homeWeak` 0,75) tarate su gesti simulati.

## 13. Configurazioni (senza segreti)

- `localStorage`: `natpf-tennis.specials` (soglie pallonetto/palla corta), `natpf-tennis.classifica`, chiosco,
  formato partita; `sessionStorage`: nickname, profilo del telefono.
- Parametri URL: `?intro=0`, `?diag=1`, `?room=&role=p2&net=p2p`.
- Calibrazione: costanti `CAL` in `site/js/tennis/calibration.js`; gesti: `GESTURE` in `natpf_gestures.js`;
  mira: `SWING_AIM`/`FACE_AIM` in `natpf_skill.js`.
