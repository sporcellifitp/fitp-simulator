# B14 · Leggere il dritto: camere dei colpi da fondo (stesso moto)

> Stato (08/11/2026, ramo locale `b14-dritto-b`, base `e5c4469`): **camere cambiate, moto invariato**; verificato con i
> test del gioco e del sito e con le prove nel browser `natpf-gesti-fotogrammi` e `natpf-modale-gesti`. Non visto
> dall'utente, non provato su un telefono vero (il riconoscimento non è toccato).
> Richiesta di partenza (07/11): «il dritto non mi sembra tale». Il moto del B13 resta quello (mano all'impatto in
> diagonale avanti-sinistra, 57° dalla rete: vincolo del riconoscimento, `docs/b13/gesti-nuovi.md` §0). Qui si cambia
> solo come lo si guarda.

## 1. Cosa non si leggeva

Misure sul disegno vero (`cameraAt`, 640×400, mano destra), camera del B13 (dietro e dall'alto, 55°, segue la mano per 0,8):

| misura | dritto B13 | dritto B14 |
|---|---|---|
| angolo sullo schermo tra «avanti» (verso la rete) e «in alto» | 20° | 78° |
| angolo tra la mano all'impatto e «avanti» sullo schermo | 59° | 9° |
| salita della mano vista dall'impatto alla fine (frazione dell'altezza) | −0,02 (scende) | +0,28 |
| salita vista dal punto più basso alla fine | 0,26 | 0,31 |
| telefono più vicino al bordo dello stadio a 448×280 | 12 px | 45 px |

Con la camera alta da dietro «avanti» e «in alto» finiscono entrambi verso l'alto dello schermo, e la camera che segue la
mano per l'80% toglie lo spostamento: la mano, che dall'impatto alla fine sale di 0,5 m, sullo schermo **scendeva**. Il
colpo si leggeva come una manata di lato.

## 2. Vincoli (non cambiati)

`test/natpf-gesture-anim.test.mjs` e `tools/e2e/natpf-gesti-fotogrammi.mjs`: telefono non di taglio nelle pose chiave
(≥ 25°), ≥ 60 px all'impatto a 448×280, avambraccio ≥ 28° dal raggio visivo in ogni istante, colpo nel quadro.
Mappe per posa (azimut × elevazione):

- **vista di lato (dal lato destro) e dietro basso: impossibili**. Nella carica lo schermo guarda a sinistra e in alto
  (−0,71; 0,69; 0,15), alla fine guarda indietro (0,10; 0,19; 0,98): di lato il telefono è di taglio (7–12°). Sotto i
  30–40° di elevazione l'avambraccio, che spazza il piano orizzontale, punta verso la camera in qualche istante;
- con la camera ferma che inquadra braccio e busto il telefono a 448×280 è lungo ~40 px (< 60): l'inquadratura stretta
  che segue la mano è obbligata dai 60 px;
- direzioni ammesse con la camera che segue: per il dritto una colonna **dietro a sinistra** (azimut −55/−50, elevazione
  da −5° a 45°) e un'isola davanti a destra (125–135°, 0–10°, solo il dritto, vista a specchio con il dorso del telefono).

## 3. Camere nuove (`CAMERAS` in `natpf_gesture_pose.js`)

| scheda | direzione (azimut, elevazione) | segue (640×400 / 448×280) | lettura |
|---|---|---|---|
| dritto | −55°, 15° | 0,5 / 0,65 | avanti a sinistra, in alto in alto, corpo in piedi, fine alta alla testa |
| lungolinea | −65°, 25° | 0,5 / 0,65 | come il dritto |
| incrociato | −15°, 5° | 0,5 / 0,65 | da dietro, busto in piedi, salita 0,37 |
| piatto | come prima (−15°, 55°) | 0,5 / 0,8 | le direzioni basse lasciano il telefono di taglio nella carica; segue meno: salita 0,10 (prima 0,02) |
| rovescio | −30°, 40° | 0,7 / 0,9 | salita 0,26 (prima 0,13), avanti/alto 40° (prima 16°) |

`follow.mixSmall` (nuovo): quanto la camera segue a 448×280; negli stadi da 640×400 in su scende a `follow.mix` e la
mano percorre il quadro. La modalità compatta (200×200) resta com'era (0,95).
Il mancino è lo specchio (invariato). Margini sui vincoli: dritto telefono 31°, avambraccio 34°; lungolinea 32°/31°;
incrociato 36°/40°; piatto 40°/36°; rovescio 42°/30°.

`test/natpf-gesture-camera.test.mjs` misura la lettura: salita dopo l'impatto, «avanti»/«in alto» distinti e mano verso
la rete sullo schermo (dritto, lungolinea, incrociato), telefono dentro lo stadio a 448×280 e 640×400.

## 4. Provato e scartato

Fogli di confronto (fuori dal repository, blocco appunti `b14/cam/`): attuale, stessa direzione con meno inseguimento,
dietro a sinistra basso (scelta), 3/4 davanti a destra, lato destro.

- **Lato destro**: oltre ai vincoli, il moto vero va soprattutto verso sinistra, cioè verso il fondo dell'immagine: di
  lato resta un braccio che si alza in verticale (un saluto), non un dritto.
- **3/4 davanti a destra**: si legge (mano bassa dietro, impatto davanti, fine alta), ma passa solo per il dritto, è a
  specchio per chi imita e si vede il dorso scuro del telefono invece dello schermo.
- **Messa in scena** (prototipi non adottati): freccia «RETE» dipinta sul piano (troppo grande con la camera vicina),
  linea delle spalle chiara (confusa sotto il braccio), telefono a esposizione multipla (affollato), percorso della palla
  a puntini (utile per incrociato e lungolinea, tenue nel dritto: da riprendere se l'utente lo vuole).
- **Testa di racchetta fantasma** (prototipo, commit a parte, **spento**: `GHOST_RACKET = false` in
  `natpf_gesture_demo.js`, prova con `demo.ghostRacket = true`): ovale traslucido 33 × 25 cm con gola di 7 cm che
  prolunga il telefono oltre la cima, nel piano del telefono (il dorso guarda dove guarderebbero le corde, come nella
  presa «il telefono è il piatto» del gioco). Con la presa nel palmo la cima del telefono all'impatto punta in avanti a
  sinistra: la testa punta alla rete (un affondo, non un dritto), la palla cade sulla gola e non sulle corde, e alla fine
  della carica la testa guarda avanti invece che indietro. Rende il colpo «da racchetta» ma mostra posizioni della
  racchetta che un dritto vero non ha: sconsigliato accenderlo senza cambiare la presa o la mappa telefono → racchetta.
