# MEMORY.md · NATPF Simulator

Memoria di lavoro del progetto: da leggere all'inizio di ogni sessione e da aggiornare alla fine di ogni attività.
Non contiene password, token o altri segreti.

Ultimo aggiornamento: 19 ottobre 2026 · branch `feature/natpf-tennis-v2`

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
- **Multigiocatore**: host autorevole. Relay `/api/match/*` (server LAN, `scripts/match-relay.mjs`) o, su sito
  statico, `natpf_p2p.js` (intercetta le stesse chiamate e usa WebRTC con PeerJS; invito `?room=&role=p2&net=p2p`).
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
- Test e2e LAN: il telefono simulato non chiude la connessione WebRTC verso l'indirizzo di rete (7/8 verifiche).

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
- Host autorevole per il multigiocatore; snapshot con formato (`fmt`) per il 2v2.

## 9. Modifiche recenti

| Data | Commit | Cosa | File |
|---|---|---|---|
| 19/10/2026 | 684021a | Calibrazione: fermo prima di ogni gesto, rientro al centro escluso, tremolii ignorati, scelta del gesto nel verso richiesto | `site/js/tennis/calibration.js`, `racchetta.js`, `main.js`, `natpf-tennis/src/natpf/natpf_training.js`, `tools/test/calibration-quick.test.mjs`, `tools/test/gesture-training.test.mjs` |

| 19/10/2026 | (punto 2) | Rovescio lungolinea non più letto come dritto | `site/js/tennis/swing-detect.js`, `natpf-tennis/src/natpf/natpf_phone_racket.js`, `natpf-tennis/test/natpf-prep.test.mjs` |

## 10. Stato delle attività (richiesta in 6 punti del 19/10)

| # | Attività | Stato |
|---|---|---|
| 1 | Calibrazione telefono (falsi movimenti, rientro, gesto precedente) | fatto, provato con test a mano simulata; da provare con telefono vero |
| 2 | Dritto/rovescio, rovescio lungolinea | fatto, provato con gesti simulati; da provare con telefono vero |
| 3 | Varietà di traiettorie e angoli (anche P2) | da fare |
| 4 | Revisione completa 1v1 con verifica a due sessioni | in corso (lavoro in un worktree separato) |
| 5 | Grafica del campo simmetrica (TORINO su entrambe le metà, loghi della rete) | da fare |
| 6 | MEMORY.md | fatto, da aggiornare a ogni attività |

## 11. Prossimi passi

Punti 3, 5; unire e verificare il punto 4; aggiornare roadmap; build, zip Cloudflare e LAN, prova degli zip estratti.

## 12. Test e verifiche

- `tools/test`: 126 test passano (19/10). Nuovi: calibrazione con tremolio, rientro al centro, preparazione e
  accompagnamento (il test fallisce con il codice precedente: riproduce il difetto segnalato).
- `natpf-tennis/test`: 123 test passano (19/10). Nuovi: rovescio morbido + rientro (fallisce col codice
  precedente), zona palla diretta e lato dalla palla.
- **Non verificato**: calibrazione con un telefono vero in mano; soglie (`CAL.settle` 220 ms, `homeRest` 600 ms,
  `homeWeak` 0,75) tarate su gesti simulati.

## 13. Configurazioni (senza segreti)

- `localStorage`: `natpf-tennis.specials` (soglie pallonetto/palla corta), `natpf-tennis.classifica`, chiosco,
  formato partita; `sessionStorage`: nickname, profilo del telefono.
- Parametri URL: `?intro=0`, `?diag=1`, `?room=&role=p2&net=p2p`.
- Calibrazione: costanti `CAL` in `site/js/tennis/calibration.js`; gesti: `GESTURE` in `natpf_gestures.js`;
  mira: `SWING_AIM`/`FACE_AIM` in `natpf_skill.js`.
