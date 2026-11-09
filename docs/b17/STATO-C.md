# B17.1 · passo C (disegno dei gesti come il video: camera frontale specchiata, gesto intero) · stato dei lavori

> File di ripresa del passo C (piano `docs/b17/analisi-e-piano.md` §1.4 punti 4–5), con le coreografie ottimizzate del passo
> B2. Decisioni dell'utente del 09/11 sera: (1) scelta B (forma del video, polso e tempi con il rilevatore vero nel costo);
> (2) presa e partenza misurate nel video. Il riconoscimento NON si tocca. Risultati e misure: `docs/b17/gesti-dal-video.md`.

## Fatto (giro 1, commit «passo C: camere frontali specchiate e gesto intero»)
- WIP 8d64ac8 riletto: il disegno della figura chiara (busto, testa, gambe, braccio libero, mano sinistra nel rovescio a due
  mani e nel lancio) era già entrato nei commit del passo B2; tenuto. Lo script di confronto (`natpf-gesti-video-confronto.mjs`)
  tenuto e corretto (colonna 3 = tutorial di PRIMA del B17, presa nel palmo; animazioni a 640×400).
- **Camere** (`CAMERAS_VIDEO` in `natpf_gesture_pose.js`): tutte le schede dell'insieme del video frontali a tre quarti e
  SPECCHIATE (servizio e schiacciata: profilo a tre quarti dal lato del braccio); «Posizione» frontale specchiata; «Presa»
  specchiata con la racchetta (`mirrorBy`), etichetta «Come allo specchio».
- **Gesto intero** (`whole`, `wholeFrame`/`wholeBox` in `natpf_gesture_demo.js`): da 640×400 in su la camera è FERMA e contiene
  tutto il ciclo (telefono, mano, gomito, mano libera) con testa, spalle e vita; a 448×280 e nella compatta segue la mano
  (telefono ≥ 60 px), con la freccia corta attorno al contatto (`follow.arrow`) e lo schermo che può scendere se la mano esce in
  alto. Freccia del verso sull'intera parte veloce con la camera ferma (`arrowsWhole`).
- **Rovescio a due mani e piatto riottimizzati** con la camera frontale nel costo (`ottimizza.mjs --camdir`, nuove opzioni
  `--edgeMin`, `--foreMin`): letture 48/48 nel costo, forma del video invariata o migliore (rovescio 23,4 contro 26,8 di prima;
  piatto 0,5 contro 5,7). Soluzioni in `scripts/video/soluzioni/`.
- Collo in pelle (prima un colletto bianco lungo); etichette dei fantasmi spente che non occupano posto.
- Verifiche: gioco 984/984, sito 200/200, build ok; `natpf-gesti-fotogrammi` 15/15 (tutte e quattro le misure, nessun limite
  dichiarato: anche il 26 % del dritto a 200×200 del passo B sparisce).

## Prossima azione
1. Fogli VC-* a 640×400 (video specchiato | animazione nuova | tutorial di prima), GUARDARLI tutti, correggere.
2. Prove `natpf-gesti-sequenze`, `natpf-modale-gesti`, `natpf-tutorial-phone`, `natpf-training-flow`; prestazioni a 1280×720.
3. `docs/b17/gesti-dal-video.md` con misure (scarto dal video in cm, altezze, angoli del telefono) e non verificato.

## Come riprendere
Worktree `.claude/worktrees/wf_bb380d57-57a-1`. Strumenti nello scratchpad `b17C/` (camsearch.mjs, edges.mjs, subj.mjs, arr.mjs:
ricerca delle direzioni della camera con i vincoli del B9 e la camera vera). Fogli: `cd tools/e2e && FRAMES=<scratchpad>/b17/frames30
CHROMIUM_PATH=/opt/pw-browsers/chromium GAME_PORT=3751 node natpf-gesti-video-confronto.mjs`.

## Non verificato
- Niente telefono vero; il rovescio e il piatto nuovi sono letti giusti dal telefono simulato (test), non da un telefono vero.
