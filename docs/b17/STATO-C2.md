# B17.1 · passo C2 (disegno dei gesti allineato al passo B3: rovescio a una mano, schermo o dorso verso la palla) · stato

> File di ripresa del passo C2. Richieste dell'utente del 09/11 notte (sulle anteprime VC-*): (1) «Per il rovescio, a una
> mano»; (2) «con il dritto la pallina venga colpita con il display in maniera frontale»; (3) «il rovescio invece stesso
> movimento ma con l'altro lato». Coreografie del passo B3 invariate; il riconoscimento NON si tocca. Misure e decisioni in
> `docs/b17/gesti-dal-video.md` §7.

## Fatto (giro 1, commit «passo C2: primo piano dell'impatto e braccio libero in vista»)
- **Misura della vista all'impatto** (camera principale, 640×400): la camera frontale sta dalla parte della rete, quindi vede la
  faccia che colpisce (schermo nei colpi di dritto a 10–43° dal raggio visivo, dorso nel rovescio 53° e nel tagliato di
  rovescio 49°), ma il telefono è lungo 34–51 px e la palla, che arriva dalla camera, ne copre metà: schermo e dorso non si
  distinguono. Decisione: **primo piano dell'impatto** (riquadro con il fermo immagine visto da vicino dalla parte della palla,
  «Palla sullo SCHERMO» / «Palla sul DORSO»), da 640×400 in su, dal contatto per circa 1 s del gesto. A 448×280 e 200×200 nessun
  riquadro (telefono all'impatto 47–99 px, camera che segue la mano).
- `natpf_gesture_demo.js`: `IMPACT_CLOSE`, `impactCloseAlpha`, `impactCloseSize`, `impactCloseText`, `_impactClose` (disegnato una
  volta per scheda, mano e misura; posto tra i quattro angoli che non copre telefono, mano e palla vivi all'impatto, poi
  testa e busto), `liveHits` (prova esatta sulle sagome), `info.close`, `info.body`.
- **Braccio libero del rovescio a una mano in vista**: `FREE_BALANCE` (−0,34; 0,16; 0,50) dietro e un poco in basso («ad ali»;
  prima (−0,42; 0,18; 0,30): dietro il busto, non si vedeva), `FREE_PREP` (−0,26; −0,04; −0,10) rilassata davanti al fianco
  (prima la mano sull'anca con il gomito in fuori).
- Test: `natpf-gesture-anim` «primo piano dell'impatto…» (nuovo) e mano libera in vista nell'accompagnamento (≥ 80 % dei
  campioni); `natpf-gesti-fotogrammi` controlla il primo piano (presente all'impatto da 640×400 in su, scritta giusta, non sopra
  telefono, mano, palla, etichette).
- Verifiche: gioco 991/991, sito 200/200; `natpf-gesti-fotogrammi` 15/15 (NOFOGLI): costo del disegno 640×400 media 1,26 ms
  (con la rasterizzazione 2,55 ms).

## Prossima azione
Giro 2: fogli VC-* (640×400) e fotogrammi C-anim-* (640×400, 448×280, 200×200, 1600×1000) rifatti e GUARDATI; prove
`natpf-gesti-sequenze`, `natpf-modale-gesti`, `natpf-tutorial-phone`, `natpf-training-flow`, `natpf-split-ready`; build;
`docs/b17/gesti-dal-video.md` §7.

## Come riprendere
Worktree `.claude/worktrees/wf_bb380d57-57a-1`. Strumenti nello scratchpad `b17C2/` (shot.mjs: fotogrammi di prova con vite
sulla porta 3851; meta.mjs: misure del primo piano; vista.mjs: faccia vista dalla camera principale). Prove nel browser con
`CHROMIUM_PATH=/opt/pw-browsers/chromium GAME_PORT=385x`.

## Non verificato
- Niente telefono vero né utente: il primo piano è giudicato sui fogli.
