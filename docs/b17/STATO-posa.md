# B17.1 · passo B (presa «racchetta» e posa dai dati del video) · stato dei lavori

> File di ripresa del passo B. Chi riprende legge questo, poi `docs/b17/posa-dal-video.md` (misure, limite del
> riconoscimento e scelte proposte all'utente). Aggiornato a ogni commit del worktree.

## Fatto (09/11/2026)
- **WIP dell'agente interrotto** (8b7fce4, 1106c92) riletti e verificati: tenuti `grip-art.js` (stile racchetta, figura, testi,
  foto), `GRIP_POSE.racchetta`/`GRIP_CUES.racchetta`, `HAND_RACCHETTA`/`PHONE_IN_HAND_RACCHETTA` (il verso della cima verso il
  pollice verificato numericamente), `REST_RACCHETTA`, `REST_VIDEO`, `buildServeVideo`, `gestureFreeHand`, `sliceBackhand`
  come variante, i testi di `index.html`, `pose-sensors.mjs` (presa nel palmo per l'animazione di prima). **Rifatto**: la scelta
  dell'insieme di coreografie (`setFor(grip, id)` con `VIDEO_CARDS`, `restOf(id, set, grip)`, `choreoFor` con `aim` nella
  coreografia), tolti `VIDEO_ADAPT`/`VIDEO_TC`/`restFor` (la ripartenza delle coreografie di oggi da un'altra posa dava
  rientri letti come colpi: misurato), `CHOREO_VIDEO` ricostruita dalle posizioni (non dagli angoli del polso) con i tempi del
  video; aggiunto `backFlat` (ritorno a velocità costante) e l'opzione `set` in tutta l'API della posa.
- **Presa racchetta predefinita** (`GRIP_STYLE = 'racchetta'`) con le coreografie di oggi: fedeltà verde su tutte le schede,
  destro e mancino, due calibrazioni, 0,8×/1×/1,25×, con **un limite misurato e ammesso**: piatto con la calibrazione del
  braccio simulato letto top spin (salita abituale 0,23 contro 0,07; `allowLimit`). Scheda «Presa» con `REST_RACCHETTA` e
  camere proprie (dallo schermo di gioco, di lato). Foto `presa-racchetta-davanti.webp` (23 KB) con provenienza in
  `public/media/LEGGIMI.txt`. Test aggiornati: `natpf-presa`, `natpf-gesture-pose`, `-anim`, `-physics` (racchetta nelle prese;
  test nuovo della presa a racchetta; ciclo chiuso sulla partenza della coreografia). Altri test toccati dal cambio di presa
  predefinita: `natpf-gesture-speeds` (variante sliceBackhand ammessa palla corta a 0,85× come il tagliato), `natpf-mancini`
  (specchio con tutte e due le prese; mira del lungolinea con la racchetta e la calibrazione dell'animazione 0,81/−0,91:
  ammesso 0,12 solo lì, misurato), `natpf-racchetta` (le due prove dell'apprendimento in partita girano con la presa nel palmo:
  con la racchetta il piatto a calibrazione «arm» è il limite di cui sopra e la prova non misurerebbe più l'apprendimento).
- Verifiche finali: gioco `npm test` (vedi WORK_PROGRESS del commit per i numeri), sito 200/200, `npm run build` ok.
- **Coreografie dal video** (`CHOREO_VIDEO`: dritto, rovescio a due mani, tagliato di dritto e di rovescio, servizio) costruite
  e verificate come moto (continuità, limiti, ciclo, tempi del video) ma **NON lette** dal telefono simulato come il colpo
  mostrato → `VIDEO_CARDS = []`, test della lettura segnato **todo** che stampa la lettura di oggi. Misure, cause e tre scelte
  per l'utente in `docs/b17/posa-dal-video.md` §3–4 (consigliata: registrare i gesti con il telefono collegato).

## Giro 2 (09/11/2026, ripresa dopo il limite d'uso)
- **Partenza dei colpi con la presa a racchetta**: `REST_COLPI_RACCHETTA` (`natpf_gesture_pose.js`: `REST` con polso flesso 9°,
  deviazione 0, pronazione 36°) per le coreografie di oggi e per la scheda «Posizione di partenza»; `restOf`, chiave della
  cache `RC`; indicazioni della scheda aggiornate (`GRIP_CUES.racchetta.ready`: «schermo verso di te», «telefono davanti al
  petto»). Scelta misurata con `scratchpad/b17/posa2/grid.mjs` (griglia fl × dv × pro, 144 letture per posa: zona fl 8–10 ×
  pro 35–38 senza errori; numeri in `posa-dal-video.md` §1). Il limite ammesso del piatto (calibrazione del braccio simulato)
  sparisce: `allowLimit` tolto da `natpf-gesture-pose` e `natpf-gesture-anim`. Nel test dei tempi la racchetta ha i limiti
  schiacciata prep ≤ 150 (misurato 137) e incrociato ritorno ≤ 265 (257), la presa nel palmo tiene quelli del B13 nello stesso
  test; test delle camere: minimo del piatto 5,5 % (racchetta 2,99 % a 448×280 contro il 3 % di prima, palmo 3,3 %).
- Fogli dei fotogrammi a 640×400 rifatti con la posa nuova (`tools/e2e/natpf-gesti-fotogrammi.mjs`, 13/13 verifiche) e
  **guardati**: telefono lungo l'avambraccio in tutte le schede, «Posizione» coerente con «Presa»; copiati in
  `docs/b17/img/B-posa-640x400-*.webp`.
- Verifiche: pose/anim/physics/presa/mancini/racchetta/speeds/camera verdi; suite del gioco e del sito e build: vedi il
  commit (numeri nel messaggio).

## Manca / non verificato
- Nessuna prova con il telefono vero né nel browser di queste pose (fogli dei fotogrammi del passo C non rifatti).
- Il riconoscimento non è stato toccato (nessuna modifica «piccola e sicura» trovata: il limite è la fisica della presa).
- `REST_RACCHETTA` (schermo in avanti-sinistra) è una lettura delle due foto da chiarire con l'utente (§5); la partenza dei
  colpi `REST_COLPI_RACCHETTA` (telefono davanti al petto, schermo verso chi gioca) è una scelta nostra misurata sul telefono
  simulato, da confermare con lui (nel video parte con il braccio che pende).
- Fogli guardati solo a 640×400 (non 448×280, 200×200, 1600×1000); nessuna prova nel browser del flusso del tutorial in
  questo giro.
