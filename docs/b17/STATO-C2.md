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

## Giro 2 (FATTO, commit «passo C2: fogli, prove, documento»)
- Primo piano rifinito: camera per il dorso 50° di lato e 30° verso la cima (dal fondo la mano copriva il dorso), palla velata
  con il contorno, compare 40 ms prima del contatto; il posto evita anche il braccio libero in equilibrio; ordine degli angoli
  specchiato per il mancino (test: riquadro speculare); niente riquadro con le camere sostituite dagli strumenti (fogli O).
- `natpf-gesti-video-confronto.mjs`: nei fogli VC il primo piano è quello dell'animazione (prima lo disegnava lo script), sotto
  l'angolo della faccia all'impatto; verifica nuova «primo piano dell'impatto con la scritta giusta».
- Fogli `VC-*`, `O-*`, `C-anim-*` (quattro misure, tutti e quattro i fogli) rifatti; guardati VC di dritto, rovescio e tagliati,
  C-anim 640×400 fogli 1–2 e 1600×1000 foglio 1.
- Verifiche: gioco 991/991, sito 200/200, build ok; `natpf-gesti-fotogrammi` 31/31 (disegno 640×400 media 1,16 ms, con la
  rasterizzazione 2,36 ms), `natpf-modale-gesti` 18/18 (59,9 fps a 1280×720, 60,2 a 1920×1080, due animazioni 57,7),
  confronto VC 29/29 e O 28/28, `natpf-gesti-sequenze` 91/91, `natpf-tutorial-phone` 52/52, `natpf-training-flow` 22/22,
  `natpf-split-ready` 34/34. Costruzione del riquadro una volta per scheda 5–9 ms.
- `docs/b17/gesti-dal-video.md` §7 (misure della vista all'impatto, decisione, primo piano, braccio libero, prove, limiti).

## Prossima azione
Passo C2 chiuso. Da mostrare all'utente: il primo piano dell'impatto (posto, durata 1 s, scritta «Palla sullo SCHERMO» /
«Palla sul DORSO») e il braccio libero «ad ali» del rovescio. Punti aperti (gesti-dal-video.md §7.5): il riquadro copre il busto
nel piatto e la spalla nel tagliato; camera del dritto con l'occhio sotto il piano del campo (−0,13 m).

## Come riprendere
Worktree `.claude/worktrees/wf_bb380d57-57a-1`. Strumenti nello scratchpad `b17C2/` (shot.mjs: fotogrammi di prova con vite
sulla porta 3851; meta.mjs: misure del primo piano; costo.mjs: costo della costruzione; vista.mjs: faccia vista dalla camera
principale; tutte.sh: tutte le prove nel browser in fila). Prove con `CHROMIUM_PATH=/opt/pw-browsers/chromium GAME_PORT=385x`.

## Non verificato
- Niente telefono vero né utente: il primo piano è giudicato sui fogli. Fogli delle sequenze non guardati uno per uno (solo
  misure); C-anim a 448×280 e 200×200 non riguardati (lì niente riquadro).

## Correzioni dalle revisioni artistica e tecnica (10/11) — FATTO, un commit nel worktree, niente push
Dettagli: `docs/b17/gesti-dal-video.md` §8, `docs/b17/ottimizzazione.md` §9.8. Riconoscimento non toccato.
1. **Servizio e schiacciata con lo schermo** come il dritto (la schiacciata colpiva col dorso a 113° dalla rete, il servizio con lo schermo
   di taglio a 88°): `IMPACT_FACE` copre tutte le pose che colpiscono (test), servizio 14,5° e schiacciata 9,3° (riottimizzati con
   `--impact=20` e i vincoli nuovi `--wristMin`, `--peakMax`, `--endMaxX`), primo piano «Palla sullo SCHERMO» anche lì. Servizio ora più vicino
   al video (impatto 5,2 cm, prima 12,5). Pallonetto e palla corta col **dorso** dichiarati (−1, limiti 33° e 30°): domanda per l'utente.
2. **Primo piano dello schermo frontale** (12° di lato, 16° dalla cima: 20° dalla normale; il dorso 38°): la palla cade dentro il vetro
   (`info.close.ballOn`, test su ogni scheda). Quadro 0,27 (prima 0,30).
3. **Limite della calibrazione del braccio simulato** (incrociato 0/360, lungolinea 0/360, piatto 120/360 su 60 semi): non integrato in
   silenzio; un solo punto del codice (`test/gesture-semi.mjs`) con il conto esatto, nessun `continue`; **decisione dell'utente da chiedere**.
4. **Piatto**: riottimizzato con i semi 35 e 38 (e 22, 44); test sui semi 1–60, 7 560/7 560 giuste fuori dai limiti dichiarati.
Minori: etichetta del lancio spenta dal contatto, «Carica» solo dal primo moto, camera della scheda «Posizione» a tre quarti, testo del
tagliato di rovescio; non toccati e motivati in §8.6.
Verifiche: gioco 991/991, sito 200/200, build ok; prove nel browser nel §8 di `gesti-dal-video.md` (vedi sotto, riga «Prove»).

### Prossima azione
Mostrare all'utente i fogli aggiornati (`docs/b17/img/VC-*`, `O-*`, `C-anim-*`) e chiedere: (a) pallonetto e palla corta col dorso o con lo
schermo verso la palla in uscita; (b) calibrazione con lo schermo di lato e poi colpi con lo schermo verso la rete (incrociati letti rovesci):
accettare il limite o riottimizzare il dritto; (c) schiacciata a 950 °/s (prima 707). Nessun telefono vero, nessun utente.

