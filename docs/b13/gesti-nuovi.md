# B13 · Gesti del tutorial sulla catena fisica del braccio

> Stato (08/11/2026, ramo `b13-gesti`, base `be91ec1`): **corretto dopo le due revisioni (biomeccanica e arte; fedeltà
> e codice) e verificato con il telefono simulato e nel browser**; non ancora visto dall'utente né provato con un telefono
> vero. Analisi di partenza: `docs/b13/analisi-gesti.md`.
> Richiesta dell'utente (07/11 sera): «rivedi ancora i gesti del tutorial, il dritto non mi sembra tale e ci sono troppi
> colpi che non simulano la fisica del movimento del braccio con il telefono in mano».

## 0. Correzioni dopo le revisioni (08/11)

Le due revisioni (biomeccanica e arte: «non pronto»; fedeltà e codice: «accettabile con seguiti») hanno misurato che il
braccio era coerente ma che il dritto non si leggeva come un dritto (manata di lato all'altezza dell'anca, 77° dalla rete,
gomito incollato al fianco, colpo-pausa-risalita), che servizio e schiacciata colpivano con il braccio piegato e la mano
nella testa, che nel rovescio l'avambraccio passava nella pancia, e che manica bianca e busto «di vetro» rubavano il quadro.
Correzioni (commit `9e640ed` e seguenti):

- **Coreografie rifatte** con un ottimizzatore fuori dal repository (blocco appunti, `scratchpad/b13/fix/`): Nelder–Mead
  sulle pose chiave e sui ritardi delle articolazioni con una funzione di costo che mette insieme i vincoli dei test (picco,
  ampiezza, carica, ritorno, fermo finale), quelli del riconoscimento stimati come `stroke-shape.js` (salita con le due
  prese, piano, una sola valle di ω prima del colpo, nessuna gobba dopo, picco letto dal rilevatore) e la fisica che le
  revisioni chiedevano (posizione e direzione della mano all'impatto, gomito, carica, fine, sequenza dei segmenti,
  collisioni con busto e testa). Ogni candidato poi letto dal telefono simulato completo (`tune/tune.mjs`).
- **Dritto**: carica con le spalle girate di 38° e la mano dietro il piano del busto (0,46; 0,95; +0,06), impatto davanti
  e a destra (0,29; 0,98; −0,37) con il gomito staccato dal corpo (0,33 m a destra, flesso 59°), mano che va in avanti e in
  alto a 6,7 m/s (57° dalla direzione della rete invece di 77°, salita 0,18), palmo che spinge (+0,18), **una sola
  frenata** fino alla fine davanti alla spalla sinistra a 1,45 m (sopra la spalla), busto a +27°. Sequenza: busto −9 ms,
  omero −21 ms, avambraccio +1 ms, mano −1 ms.
- **Vincolo scoperto** (**smentito nel B14**: 33° dalla rete senza toccare il riconoscimento; i vincoli veri sono in
  `docs/PROJECT_MEMORY.md`, gesti B13) (perché la mano non va dritta verso la rete con il palmo davanti): con la presa approvata e i limiti
  del riconoscimento (carica ≤ ~150 °/s per ~70° di rotazione del telefono, parte veloce di ~45° prima del picco) la
  torsione del telefono all'impatto rispetto alla posa di partenza non può scendere sotto ~−25°: all'impatto la cima del
  telefono punta in avanti e un «manico» che punta alla rete spazza di lato. Il compromesso è la mano in diagonale
  avanti-sinistra con il palmo che spinge; una mano tutta in avanti avrebbe il dorso davanti (come prima del B13).
- **Piatto**: la stessa geometria più veloce e più piatta (picco 1144, salita 0,07; letto «piatto» anche con la cima a 50°
  verso l'interno: forza 0,628 con la calibrazione del braccio simulato). **Incrociato**: coreografia propria (contatto più
  avanti, busto già aperto a +24°, torsione +15°: mira −0,56/−0,94 con le due calibrazioni); **lungolinea**: il dritto
  girato (`AIM_TURN.line`). **Rovescio**: impatto davanti (−0,03; 1,00; −0,37) con il braccio quasi disteso (gomito 20°), mano
  verso destra e in avanti a 5,4 m/s, dorso della mano davanti, fine alta a destra (0,27; 1,50), avambraccio mai nella
  pancia. **Volée**: contatto più avanti (0,04; 1,08; −0,39) con la mano in avanti-sinistra (prima andava indietro verso il
  corpo). **Pallonetto**: lo stesso pendolo, senza l'avambraccio che sfiorava il fianco. **Schiacciata**: impatto con il
  braccio quasi disteso (gomito 28°, mano a 1,89 m) e accompagnamento in avanti e giù fino a 1,40 m (prima 1,69).
  **Servizio**: battuta a 1,93 m con il gomito a 34° (prima 1,78 m e 80°), il braccio sale nel raccordo a destra della testa
  (nessun punto di mano, dita o telefono dentro la testa: prima fino a 3,9 cm), accompagnamento che scende davanti a
  sinistra (−0,13; 1,32), palla mai dentro il telefono.
- **Disegno**: manica blu spento poco più chiara del fondo (era la forma bianca più grande del quadro) e omero un poco più
  scuro dell'avambraccio; busto e testa come **sagoma scura unica** (niente collo dentro la testa, testa ad anello velato);
  fantasmi solo avambraccio, mano e telefono; omero disegnato sopra la mano solo quando le sta davanti (prima il polsino
  era ridisegnato sopra la manica che lo copriva); presa in primo piano senza manica né sagoma; mano a martello (rollback)
  con l'avambraccio rigido nella sua direzione (polso dritto come la definizione, non piegato di 46–72° sulla catena).
- **Camere**: la famiglia del dritto e il rovescio da dietro e dall'alto (55°, come la camera della televisione: stessa
  mano destra di chi imita) con la camera che segue la mano; è l'unica direzione che, con un braccio che ora percorre
  0,9 m, rispetta i vincoli del disegno del B9 (telefono non di taglio nelle pose chiave, ≥ 60 px all'impatto a 448×280,
  avambraccio ≥ 28° dal raggio visivo: ricerca su griglia). Negli stadi grandi l'inquadratura si allarga (braccio e busto
  nel quadro), a 200 px resta ferma su tutto il colpo. Posizione di partenza vista da sopra la spalla sinistra: il braccio
  non copre più telefono e pollice.
- **Tempi risolti scritti nelle coreografie** (`tC` in `CHOREO`): niente ricerca alla prima riproduzione (piano da 15–100 ms
  a 3–30 ms in Node); le misure che servono solo ai test (`travel`, `caps`, `prepAmp`) sono pigre.
- **Test nuovi**: avambraccio, gomito, dita e telefono contro busto e testa; una sola frenata dopo l'impatto in ogni colpo;
  `tC` aggiornato; il dritto con soglie fisiche (direzione della mano, gomito staccato, carica dietro, fine alta).

## 1. Cosa è cambiato e perché

Prima (B9) la posa era una rotazione del vettore spalla → telefono attorno all'asse del colpo con raggio fisso e
l'avambraccio rigido con il telefono: il gomito che ne veniva stava a 0,53–0,78 m dalla spalla (l'omero è 0,30 m) e il
disegno lo nascondeva sfumando l'avambraccio. Nel dritto la mano restava all'altezza del fianco e il telefono girava su
se stesso, con il dorso della mano avanti.

Ora `natpf-tennis/src/natpf/natpf_gesture_pose.js` è una **catena cinematica vera** guidata da angoli articolari:

- **gradi di libertà** (`JOINTS`, limiti `JOINT_LIMITS`): busto attorno alla verticale `tau` e inclinato `lat`,
  abbassamento del bacino sulle ginocchia `y` (solo traslazione), spalla `p` (piano di elevazione), `e` (elevazione),
  `r` (rotazione assiale), gomito `b`, pronosupinazione `pro`, polso `fl` (flessione) e `dv` (deviazione);
- **segmenti** costanti (`BODY`, `ARM`): spalla a 1,42 m, omero 0,30 m, avambraccio 0,262 m; la mano e le dita sono
  quelle approvate (`HAND`, `HAND_MARTELLO`) e il **telefono è rigido nel palmo** (`gripInHand`);
- **posizione di partenza** `REST` (analisi §4.2): omero 20° in avanti, rotazione interna 45°, gomito 83°, avambraccio
  supinato 66°, polso flesso 27° e verso il mignolo 12°. Dà **esattamente** la presa approvata (`GRIP_POSE.palmo`, la
  presa è definita così) e l'avambraccio della foto (scarto < 0,5°, test); il telefono sta davanti allo sterno
  (−0,08; 1,23; −0,31 m) con il gomito al fianco. È la decisione (d) dell'analisi;
- **tempi** per articolazione: carica a minimo jerk, parte veloce B → C → F con segmenti quintici (velocità massima in C,
  frenata di durata proporzionale all'ampiezza), **sequenza prossimo-distale** (busto e ginocchia prima, spalla, gomito e
  polso per ultimi: `lag`), ritorno a `REST` con un piccolo assestamento. Dove serve: inversione «decisa» della carica
  (`crisp`, la velocità attraversa lo zero come nel cappio del dritto), carica che finisce prima (`pre`, ginocchia e busto
  che si abbassano all'inizio) o che parte tardi (`dur`, pendolo del pallonetto), carica a strati sovrapposta alla parte
  veloce (`ov`) con **pose di passaggio** (`V`) risolte offline lungo il percorso più breve dell'orientamento della mano e
  tempo con un tratto a velocità costante (`flat`): così il braccio sale sopra la testa con il polso che compensa e il
  telefono gira piano (schiacciata, servizio);
- **il contatto è misurato**: è l'istante del picco di |ω| del telefono sulla posa (il picco che legge il rilevatore), e
  il piano si sposta finché cade dove la coreografia lo chiede (dritto a 1,03 s, servizio 0,69 s dopo il picco del lancio
  esatti); dall'08/11 l'istante nominale che lo fa cadere lì è scritto nella coreografia (`tC`) e il gioco non lo cerca
  più (il test «tempi risolti» lo ricalcola);
- l'API resta quella (`gesturePose`, `gesturePlan`, `gestureRig`, `gestureBall`, `CARD_IDS`, `POSE_IDS`, destro/mancino,
  palmo/martello); in più `gesturePose(...).chain` (bacino, spalla, gomito, polso, orientamenti, angoli), `gestureJoints`,
  `armChain`, `mirrorPose`, `CHOREO`, `motionFrom`/`planFrom` (per gli strumenti di taratura). `gestureRig` restituisce
  la catena vera e il busto (`body`); solo una posa senza catena (`{ pos, q }`) ripiega sull'avambraccio di partenza.

Le coreografie sono **costanti** nel modulo (`CHOREO`, con l'incrociato che ha la sua; il lungolinea è il dritto girato
con `AIM_TURN.line`): nessun calcolo di cinematica inversa nel gioco. Il riconoscimento (`swing-detect.js`,
`natpf_stroke_intent.js`, `natpf_phone_racket.js`) **non è stato toccato**, né i test di fedeltà (nessuna verifica
indebolita).

## 2. Colpo per colpo (destro, presa nel palmo; dopo le correzioni dell'08/11)

Mano = polso (m: x a destra, y in alto, z indietro: −z è la rete). Picco e ampiezza = |ω| del telefono campionato a
1/600 s come il test e integrale nella parte veloce; «letto» = colpo, picco medio/vero, piano, salita, forza e mira come li
legge il gioco con la calibrazione dell'animazione (pose) e del braccio simulato (arm).

| Scheda | Mano: carica → impatto → fine | All'impatto | Picco · ampiezza · carica · ritorno | Letto (pose; arm) |
|---|---|---|---|---|
| **Dritto** | (0,46; 0,95; +0,06) τ −38° → (0,29; 0,98; −0,37) → (−0,15; 1,45; −0,36) τ +27° | gomito 59°, staccato di 0,33 m; mano 6,7 m/s, avanti 0,55 · su 0,18 · lato −0,82; palmo +0,18 | 715 · 86,7 · 145 · 96 | top spin 656/709, salita 0,13, mira 0; arm mira 0,79 |
| **Piatto** | (0,47; 0,96; +0,13) τ −47° → (0,28; 0,94; −0,32) → (−0,18; 1,44; −0,37) | gomito 64°; 7,5 m/s, avanti 0,55 | 1144 · 111,6 · 185 · 92 | piatto 1014/1120, forza 0,89, salita 0,07, mira −0,12; arm 0,74 |
| **Incrociato** | (0,29; 0,92; −0,21) τ −13° → (0,11; 0,95; −0,38) τ +24° → (−0,25; 1,47; −0,23) τ +45° | contatto più avanti, busto già aperto | 689 · 86,6 · 66 · 203 | top spin, mira −0,94; arm −0,56 |
| **Lungolinea** | il dritto girato (τ −10°, r −6°): impatto (0,37; 1,00; −0,32) | mano avanti 0,70 | 704 · 85,9 · 167 · 93 | top spin, mira +0,56; arm +0,94 |
| **Rovescio** | (−0,24; 1,00; −0,21) τ +30° → (−0,03; 1,00; −0,37) → (0,27; 1,50; −0,38) τ −16° | gomito 20°; 5,4 m/s verso destra (0,93) e avanti (0,35); dorso della mano davanti (−0,21) | 644 · 80,1 · 77 · 162 | top spin di rovescio 586/638, mira 0,03; arm −0,05 (prima −0,76) |
| **Volée** | (0,17; 1,07; −0,22) → (0,04; 1,08; −0,39) → (−0,14; 1,23; −0,46) | gomito 53°; avanti 0,47 (prima −0,39: indietro) | 489 · 48,1 · 79 (15°) · 133 | top spin, mira −0,84; arm −0,17 |
| **Pallonetto** | (0,14; 0,86; −0,17) → (0,14; 1,15; −0,46) → (0,10; 1,61; −0,48) | mano su 0,90 | 498 · 79,3 · 84 · 132 | pallonetto, salita 0,98 |
| **Schiacciata** | trofeo (0,23; 1,83; +0,04) → (0,09; 1,89; −0,23) → (−0,06; 1,40; −0,54) | gomito 28°; mano avanti-giù (−0,79; −0,22) | 670 · 85,8 · 69 · 225 | schiacciata, salita −0,46 |
| **Servizio** | lancio → braccio in alto (0,19; 1,68; −0,13) → impatto (0,04; 1,93; −0,17) → fine (−0,16; 1,35; −0,39) | gomito 34° (prima 80°), polso 0,19 m sopra la testa | lancio 292 · battuta 713 · raccordo 84 · ritorno 58 | 2 gesti, 0,689 s tra i picchi; palla mai nel telefono (34,0 mm = raggio solo al distacco) |
| **Tagliato, palla corta** | invariati (margini del riconoscimento più stretti: forza 0,40 sopra 0,36) | | 585 · 77,5 / 347 · 37,6 | tagliato; palla corta |
| **Presa, posizione** | ferme in `REST` | | 0 | nessun messaggio |

### Scelte imposte dal riconoscimento (senza toccarlo)

- **Direzione della mano all'impatto del dritto**: la torsione del telefono all'impatto non può scendere sotto ~−25°
  (vedi §0): diagonale avanti-sinistra (57° dalla rete) con il palmo che spinge, non tutta in avanti.
- **Salita e piatto**: il piatto si legge rispetto alla salita abituale (±0,12). Con la presa a martello la calibrazione del
  braccio simulato dà −0,08: il piatto a martello deve stare tra 0,00 e 0,04, quindi il dritto a martello sotto ~0,13 (ora
  0,12) e la mano del dritto non può salire di più all'impatto (salita 0,13 con il palmo).
- **Una sola valle di ω prima del colpo**: senza calibrazione il rilevatore ha soglie basse e leggeva una gobba di 76 °/s
  nella transizione carica → colpo come un colpo a sé (la calibrazione del dritto falliva). Ora la velocità del telefono
  scende fino all'inversione e poi sale fino al picco senza gobbe (misurato in tutte le schede).
- **Picco letto**: il colpo tipico (natpf-racchetta) chiede che il dritto letto (massimo della media mobile) resti entro
  20 °/s dal colpo della calibrazione del braccio simulato: picco della posa 715 con una cima abbastanza larga (letto 656).
- **Incrociato con la calibrazione del braccio simulato**: il riferimento della mira è il dritto del braccio simulato, un
  gesto sintetico simmetrico attorno alla posa di riposo (`test/arm-sim.mjs armSwing`); per avere mira < −0,4 l'incrociato
  deve girare il telefono di ~38° più del dritto: coreografia propria con il contatto più avanti.
- **Servizio**: nel contesto del lancio ogni rotazione oltre ~92 °/s è una battuta: l'accompagnamento deve calare senza
  nessuna risalita (un ripiano di 185 °/s era letto come terzo gesto a 1,25×).

## 3. Disegno (`natpf_gesture_demo.js`)

- **Braccio intero dalla catena** (presa nel palmo): omero con la manica **blu spento** (`MAT.sleeve`) e pelle un poco più
  scura (`MAT.skinFar`), gomito, avambraccio intero, polsino, mano e telefono. L'omero va sopra la mano solo quando le sta
  davanti. Presa: solo mano, avambraccio e telefono (primo piano). Martello: avambraccio rigido nella sua direzione, senza
  braccio intero (la catena è quella della presa nel palmo).
- **Busto e testa**: sagoma scura unica (`BODY_ALPHA` 0,16 → riempimento 0,35) un poco più scura del fondo con un filo di
  luce sulla linea delle spalle; testa ad anello velato; niente collo dentro la testa. Si spegne del tutto con
  `BODY_ALPHA = 0` (anche dall'inquadratura: decisione (b) da far vedere all'utente).
- **Fantasmi**: solo avambraccio, mano e telefono; «Fine» un attimo prima del ritorno, con l'etichetta che resta visibile
  0,2 s; con la camera che segue le etichette restano attaccate al proprio fantasma e si spengono al bordo dello stadio.
- **Camere**: dritto, piatto, lungolinea, rovescio da dietro-sinistra e dall'alto (55°), incrociato a 35°, che seguono la
  mano (`follow`, mix 0,8, 0,40 m di altezza a 448×280, fino a 1,5 volte negli stadi grandi; a 200 px la camera sta più
  attaccata alla mano con un quadro un poco più largo); inquadratura `frame: 'swing'` solo sul colpo. Posizione di partenza
  da sopra la spalla sinistra. Volée più bassa (20°, da dietro-sinistra): il telefono non sta più davanti alla testa.
  Servizio, schiacciata, pallonetto, palla corta, tagliato come prima.
- **Costo** (`natpf-gesti-fotogrammi`, Chromium senza GPU, 640×400): registrazione 1,27 ms di media, con la
  rasterizzazione 3,10 ms (limite 4).

## 4. Verifiche (numeri, stato finale)

- `cd natpf-tennis && npm test`: **887/887** (884 + 3 nuovi in `test/natpf-gesture-physics.test.mjs`: corpo, frenata
  unica, tempi risolti; il test del dritto riscritto con soglie fisiche); `natpf-gesture-pose` 14/14 e
  `natpf-racchetta` 26/26 **non modificati**; in `natpf-gesture-anim` solo il test delle etichette dei fantasmi esteso alla
  camera che segue (posizione rispetto al proprio fantasma; con la camera ferma la stessa soglia di 0,5 px).
- `node --test tools/test/*.test.mjs`: **195/195**.
- Nel browser (Chromium `/opt/pw-browsers/chromium`): `natpf-modale-gesti` **18/18** (porta 3506), `natpf-training-flow`
  **18/18** (3508/9508), `natpf-gesti-fotogrammi` **31/31** (3507, fogli in `scratchpad/b13/frames-final/e2e/`): a 640×400,
  448×280, 200×200 e 1600×1000 colpo nel quadro, telefono mai di taglio nelle pose chiave, telefono ≥ 61 px all'impatto a
  640×400 e ≥ 64 px a 448×280, mano e telefono ≥ 30% dell'altezza, etichette dentro lo stadio; registrazione del disegno
  1,27 ms per fotogramma, con la rasterizzazione 3,10 ms (limite 4).
- Prima della prima riproduzione di una scheda: piano da 15–100 ms a 3–30 ms (Node, misurato con `motionFrom`).

## 5. Fogli guardati (fuori dal repository, blocco appunti della sessione)

- `scratchpad/b13/frames-final/01-grip.png` … `13-line.png`: 8 momenti per scheda (servizio 9), disegno vero 640×400.
- `scratchpad/b13/frames-final/strobe-<scheda>.png`: stecchini della catena da tre viste (alto, dietro, lato) ogni 1/60 s
  dalla fine della carica alla fine dell'accompagnamento.
- `scratchpad/b13/frames-final/c200/`: modalità compatta 200×200 (dritto, rovescio, servizio, incrociato).
- `scratchpad/b13/frames-final/e2e/`: fogli della prova `natpf-gesti-fotogrammi`; `frames-final/modale/`: schermate della
  modale.
- Strumenti (non nel repository): `scratchpad/b13/fix/` (ottimizzatore `opt.mjs` con `cfg-fh.mjs`/`cfg-gen.mjs` e le
  specifiche `sp/*.json`, `opt-serve.mjs` con `serve-metrics.mjs`, `metrics.mjs`, `apply.mjs` che scrive `CHOREO`,
  `tempi.mjs` che scrive `tC`, `camsearch.mjs`, `strobe.py`); override finale `fix/sp/cur.over.json`.

## 6. Non verificato, rischi, decisioni aperte

- **Non verificato**: nessuna prova con un telefono vero né con persone che imitano; l'utente non ha visto i fogli.
  Antropometria media (adulto ~1,72 m).
- **Leggibilità**: la camera da dietro e dall'alto che segue la mano è l'unica che rispetta i vincoli del disegno del B9
  con un braccio che percorre 0,9 m; dall'alto le altezze si leggono meno (la salita del dritto si vede dalla sagoma del
  busto e dagli stecchini). Una camera di lato o di fronte mostrerebbe meglio le altezze ma lascia il telefono di taglio in
  una delle pose chiave o l'avambraccio verso la camera (test `natpf-gesture-anim`).
- **Dritto**: la mano va in diagonale (57° dalla rete), non dritta verso la rete (vincolo del §0); la discesa sotto la palla
  è piccola (3 cm sotto l'impatto): la salita è soprattutto durante e dopo l'impatto (stretta dalla finestra del piatto a
  martello).
- **Servizio**: dopo il distacco la palla resta entro 6 cm dalla superficie del telefono per 0,20 s (prima 0,27 s); la
  mano all'impatto va più di lato (−0,82) che in avanti (0,45); il dorso della mano resta un poco davanti (−0,19).
- **Mira con la calibrazione del braccio simulato**: dritto 0,79, piatto 0,74, schiacciata 0,91 (riferimento sintetico
  simmetrico, §2); con la calibrazione dell'animazione dritto 0, piatto −0,12, rovescio 0,03, **volée −0,84** e tagliato
  0,65 restano «mirati» (la volée ha quasi nessuna carica: non può avere la torsione del dritto).
- **Margini stretti** (tutti dentro i test): piatto a martello (salita in [0,00; 0,04]), piatto con la cima a 50° verso
  l'interno (forza 0,628, soglia 0,62), picco del piatto 1144 (limite 1150), carica della volée 15° (limite 15°), fermo del
  pallonetto 0,030 s (limite 0,04), palla del servizio a un raggio solo al distacco.
- **Sequenza**: il busto arriva al picco 6–16 ms prima della mano; nel rovescio e nella volée l'omero gira più del
  telefono (il polso compensa per tenere l'ampiezza del riconoscimento).
- **Decisioni per l'utente**: (b) sagoma del corpo: tenerla? (c) racchetta virtuale fantasma: non fatta; braccio libero
  nel servizio e nella schiacciata: non fatto; camera della televisione per i colpi da fondo.
- Il ramo ha ancora i tre commit «(in corso)» del 07/11 con test rossi: unirli prima del push è una scelta del capo
  (questo lavoro non riscrive la storia).
