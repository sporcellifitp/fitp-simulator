# B17.1 · I gesti dell'utente misurati dal video (passo A: dati, non pose inventate)

> Stato (09/11/2026, ramo di lavoro B17.1, base `7381b2b`): **passo A del piano** (`docs/b17/analisi-e-piano.md` §1.4
> punto 1) — misura del video, ricostruzione 3D con il modello del gioco, segmentazione dei colpi, dati in
> `docs/b17/gesti-video.json`, fogli di controllo in `docs/b17/img/V-*.webp`. **Nessun file del gioco cambia** in questo
> passo; gli script che rifanno tutto stanno in `natpf-tennis/scripts/video/`. Il video resta fuori dal repository.

## 1. Che cosa si è misurato e come

**Sorgente**: il video dell'utente (08/11/2026), 1080×1920 verticale, 30 fps, 42,7 s (1281 fotogrammi), camera davanti a
lui all'altezza del petto, **mano destra**. Il video **non è specchiato**: le scritte del banner sul fondo si leggono
dritte, quindi la destra di chi gioca sta a **sinistra** nel quadro (MediaPipe Pose conferma: polso destro = punto 16 a
sinistra, con il telefono). Le etichette «Left/Right» di MediaPipe Hands valgono per un'immagine a specchio e qui sono
invertite: la mano con il telefono si sceglie per vicinanza al polso destro di Pose, non per etichetta.

**Catena** (`natpf-tennis/scripts/video/`, niente Python: tutto Node + Chromium headless con i pacchetti già nel repository):

1. `ffmpeg` estrae i 1281 fotogrammi a 540×960 (JPEG q2; il video pesa troppo e resta fuori dal repository, i
   fotogrammi anche).
2. `estrai-posa.mjs`: MediaPipe **Pose** (modello *full*, `modelComplexity 1`, senza lisciatura: provato contro *heavy* su 21
   fotogrammi del dritto, scarto ≤ 6 px su gomito e polso destri e ≤ 0,10 m di profondità mondo, 5 volte più veloce) e **Hands** (*full*,
   2 mani, confidenza 0,3) caricati come fa il gioco (`pose.js`/`hands.js` da `node_modules/@mediapipe`), in due pagine
   separate perché il caricatore dei file di MediaPipe è globale (`webcam_body_follow.js`); un fotogramma alla volta, in
   ordine, così il tracciamento tra fotogrammi funziona. Per ogni fotogramma: i 33 punti di Pose (pixel + visibilità) e i
   punti «mondo» (metri, origine tra le anche), le mani (21 punti, pixel e mondo) e il **telefono**: lo schermo «Pronto»
   acceso è una macchia blu satura (misurata sui fotogrammi: media RGB (57, 103, 195), contro i banner blu del fondo
   (90, 110, 154) e (68, 87, 119)); si prende la componente connessa più grande entro 0,1 h dal polso destro e se ne
   calcolano baricentro, assi principali (angolo dell'asse lungo nell'immagine, lunghezze) e area. Quando lo schermo è
   di taglio o girato via la macchia manca: è segnato come «telefono non visto» e l'orientamento viene dalla mano e
   dalla continuità.
3. `ricostruisci.mjs`: per ogni fotogramma si cercano gli **angoli articolari del modello del gioco**
   (`natpf_gesture_pose.armChain`: busto `tau`/`lat`, bacino `y`, spalla `p`/`e`/`r`, gomito `b`, pronosupinazione
   `pro`, polso `fl`/`dv`; omero 0,30 m, avambraccio 0,262 m) più lo spostamento del bacino (`tx`, `tz`) che, proiettati con
   una camera prospettica, cadono sui punti misurati: spalle, anche, gomito e polso destro di Pose (pesi con la
   visibilità), le **profondità relative** dei punti mondo di MediaPipe (peso basso: danno il segno e l'ordine di
   grandezza, la lunghezza dei segmenti fa il resto), i tre assi della mano di Hands (dita, nocche, normale del palmo,
   dai punti mondo), l'**asse lungo dello schermo** (senza verso) e il suo centro. Minimi quadrati di Levenberg–Marquardt
   con Jacobiano numerico, partenza dal fotogramma precedente (più due varianti di rotazione omero/pronosupinazione) e
   una griglia di 72 partenze sul primo fotogramma di ogni tratto; limiti articolari come penalità morbide; senza la
   mano vista pronosupinazione e polso seguono il fotogramma precedente (interpolazione dichiarata nei dati). Poi
   lisciatura a fase nulla [1 2 1]/4 sugli angoli.
   - **Camera**: scala (px/m) = distanza tra le spalle in pixel / nel mondo MediaPipe, mediana sui fotogrammi frontali in
     piedi; lunghezza focale **ipotizzata** 720 px a 540×960 (ottica da 26 mm equivalenti: non misurata, incide sulla
     prospettiva del braccio che viene verso la camera); altezza e scostamento laterale della camera dalla mediana delle
     anche; camera senza inclinazione (le verticali del fondo sono verticali nel quadro).
   - **Presa**: telefono rigido nella mano della catena. Modello di partenza «in piedi nel pugno, schermo in avanti»
     (`upright`, la presa che la diagnostica dell'utente registra): cima lungo il pollice, schermo dalla parte della
     normale del palmo. I tre angoli di Eulero della correzione si stimano sui fotogrammi in cui schermo e mano sono
     visti insieme (minimo dell'errore dell'asse), poi si rifà la ricostruzione con il vincolo dello schermo.
4. **Segmentazione**: impatto = picco della velocità del polso (2D misurata da Pose convertita in m/s con la scala del
   corpo: la profondità ricostruita salta ancora di un fotogramma e dava «impatti» con la mano ferma nell'immagine; la
   3D con mediana su 3 si riporta accanto); carica = ultimo minimo locale della velocità (sotto il 60 % del picco)
   nell'1,2 s prima dell'impatto, altrimenti il punto più lontano dall'impatto; inizio = ultimo fotogramma con la mano
   ferma prima della carica; fine = dopo l'impatto, primo fotogramma con la mano lenta o primo minimo locale sotto il
   30 % del picco (entro 0,8 s). In più, prima dell'impatto: mano più a destra (apertura del dritto) e mano più alta
   (cima del tagliato). Servizio: lancio = picco della velocità del polso **sinistro** (palla immaginaria; sotto 0,8 m/s è
   «non visto» e non vincola), battuta = mano destra **più alta** nei 0,4 s prima del picco di velocità della discesa
   (la mano è più veloce mentre scende, ma si colpisce in alto). Tagliati: tutti i picchi oltre 2 m/s a ≥ 1,2 s l'uno
   dall'altro, dritto o rovescio dal verso della mano all'impatto.
5. `fogli.mjs`: fogli `docs/b17/img/V-*.webp` con, per ogni fotogramma scelto (12 per colpo, con carica, impatto, fine e
   lancio sempre dentro), il video con sopra Pose (ciano), la mano destra di Hands (verde), l'asse dello schermo
   (magenta) e la catena riproiettata (arancione), accanto alla ricostruzione 3D vista di fronte (come la camera) e di
   lato (da destra di chi gioca, rete a sinistra) con la scia del polso.

Rifare tutto (dalla cartella `natpf-tennis`, con i fotogrammi in `$F` e il JSON di MediaPipe in `$MP`):

```sh
ffmpeg -i gesti-video.mp4 -vf scale=540:960 -q:v 2 -start_number 0 $F/f%04d.jpg
# 4 processi in parallelo sui tratti dei colpi più la presa (~14 min su 4 CPU; Pose full ~0,5 s e Hands ~1 s per fotogramma)
for r in "p1 30-150,225-360 9711" "p2 432-612,660-720 9712" "p3 807-1010 9713" "p4 721-756,1011-1158 9714"; do set -- $r
  CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/video/estrai-posa.mjs --frames=$F --out=$MP-$1.json --ranges=$2 --pose=1 --port=$3 & done; wait
node --import ./test/register.mjs scripts/video/ricostruisci.mjs --in=$MP-p1.json,$MP-p2.json,$MP-p3.json,$MP-p4.json --out=../docs/b17/gesti-video.json   # ~15 s
CHROMIUM_PATH=… node scripts/video/fogli.mjs --dati=../docs/b17/gesti-video.json --mp=$MP-p1.json,… --frames=$F --out=../docs/b17/img
```

## 2. RISULTATI (09/11/2026, estrazione completa dei tratti dei colpi: 887 fotogrammi)

Dati: `docs/b17/gesti-video.json` (per ogni colpo tempi, misure, pose chiave con gli angoli del modello, campioni fotogramma
per fotogramma con qualità e segnalazione delle interpolazioni). Fogli: `docs/b17/img/V-*.webp` (12 fotogrammi per colpo,
guardati; la presa in primo piano in `V-grip.webp`). Campo: x a destra di chi gioca, y in alto, −z verso la rete.

### 2.1 Copertura del tracciamento (fotogrammi con Pose / braccio destro / mano destra di Hands / schermo visto)
| Tratto | n | Pose | braccio | mano destra | schermo vicino al polso |
|---|---|---|---|---|---|
| presa 1–5 s (primo piano) | 121 | 14 | 4 | 18 (qualsiasi mano) | 98 (macchia grande, 2 000–67 000 px) |
| partenza 7,5–9,2 s | 52 | 51 | 51 | 29 | 28 |
| dritto 8,8–12,0 s | 97 | 97 | 95 | 73 | 32 |
| rovescio 14,4–17,6 s | 97 | 97 | 97 | 88 | 15 |
| servizio ×3 | 91 · 97 · 100 | tutti | tutti | 85 · 81 · 86 | 8 · 18 · 28 |
| tagliati 30,0–38,6 s | 259 | 259 | 259 | 214 | 150 |

Lo schermo acceso si vede poco nei colpi (è di taglio o in ombra): l'orientamento del telefono viene soprattutto dalla
mano di Hands e, dove manca anche quella (`mano_interpolata`), dal fotogramma prima. **Camera**: scala 373 px/m dalle
spalle di MediaPipe, confermata da una ricerca ±10 % sul costo della ricostruzione (minimo a ×1,00); distanza
camera–bacino 1,93 m con la focale ipotizzata di 720 px; camera 0,38 m sopra le anche, 0,24 m a sinistra di chi gioca.

### 2.2 La presa (primo piano 1–5 s e presa nei colpi)
- Nel primo piano lo schermo acceso riempie l'immagine; Pose non vede il corpo e Hands vede la mano in 18 fotogrammi su
  121 (solo le dita che sporgono). **Misure 2D**: asse lungo dello schermo a 167° nell'immagine (mediana: quasi
  orizzontale, cima verso destra nel quadro cioè verso la sinistra di chi gioca), rapporto dei lati 0,75 (lo schermo è
  visto quasi di fronte), palmo rivolto via dalla camera (normale −0,35). Il telefono è **in orizzontale con lo schermo verso
  la camera**, le dita sotto il bordo inferiore: coerente con le foto del 09/11 (`presa-foto.md`), non con il «telefono
  in verticale nel pugno» letto a occhio nel piano.
- Nei colpi, il modello della presa `upright` (cima lungo il pollice, schermo dalla parte del palmo) va corretto di
  Euler (45°, 10°, 65°) per far coincidere l'asse dello schermo con la macchia (206 fotogrammi con schermo e mano):
  l'errore d'asse resta **37,5°** (prima 46,9°). È alto: la presa reale non è «upright» e la macchia dello schermo è
  spesso un frammento. **Gli orientamenti del telefono nelle tabelle sotto sono a bassa confidenza**; vanno rifatti nel
  passo B con la presa delle foto (telefono lungo l'avambraccio, cima in avanti) come modello di partenza.

### 2.3 Colpi (tempi in secondi dall'inizio del video; mano = polso della catena; angoli del modello del gioco)
| Colpo | inizio → carica → impatto → fine | carica / colpo / accomp. | mano all'impatto (2D) | arco orizz. spalla→mano | gomito carica/imp/fine (flessione) | altezza mano carica/imp/fine | riproiezione |
|---|---|---|---|---|---|---|---|
| Dritto | 9,77 → 9,87 → 10,37 → 10,53 | 0,10 / 0,50 / 0,17 s | 2,1 m/s (2,5) | **+62°** (da destra verso la rete e sinistra) | 51° / 49° / 87° | 0,91 / 1,41 / 1,47 m | 11 px |
| Rovescio a due mani | 15,50 → 15,60 → 15,77 → 15,97 | 0,10 / 0,17 / 0,20 s | 2,6 m/s (2,6) | −92° | 85° / 117° / 147° | 1,18 / 1,32 / 1,46 m | **24 px** (le due mani si coprono) |
| Servizio 1 | 18,27 → 18,30 → 18,50 → 19,17 | lancio 18,10 (2,8 m/s), battuta 0,40 s dopo | 0,2 m/s (mano ferma in alto) | +39° | 140° / 139° / 75° | 1,41 / **1,39** / 1,02 m | 20 px |
| Servizio 2 | 23,43 → 23,47 → 23,70 → 24,00 | lancio 23,50 (1,1 m/s), battuta 0,20 s dopo | 1,9 m/s (0,9) | +90° | 99° / 99° / 90° | 1,68 / 1,70 / 1,20 m | 12 px |
| Servizio 3 | 27,47 → 27,50 → 28,07 → 28,63 | lancio non visto (sinistra ferma); salita 0,57 s, fermo in alto 28,0–28,3, discesa 0,57 s | 0,9 m/s (0,2) | +61° | 69° / 96° / 83° | 0,98 / 1,66 / 1,10 m | 10 px |
| Tagliato 1 (rovescio) | 30,40 → 30,43 → 30,70 → 30,87 | 0,03 / 0,27 / 0,17 s | 4,1 m/s (3,8) | −119° | 106° / 99° / 62° | 1,54 / 1,13 / 1,00 m | 9 px |
| Tagliato 2 (dritto) | 32,57 → 32,60 → 32,83 → 33,07 | 0,03 / 0,23 / 0,23 s | 2,5 m/s (2,6) | +113° | 98° / 113° / 94° | 1,42 / 1,26 / 1,15 m | 10 px |
| Tagliato 3 (rovescio) | 34,63 → 34,67 → 34,93 → 35,17 | 0,03 / 0,27 / 0,23 s | 2,9 m/s (3,1) | −102° | 134° / 93° / 69° | 1,43 / 1,16 / 1,02 m | 21 px |
| Tagliato 4 (dritto) | 36,80 → 36,83 → 37,10 → 37,30 | 0,03 / 0,27 / 0,20 s | 2,8 m/s (2,3) | +97° | 99° / 108° / 103° | 1,47 / 1,33 / 1,22 m | 12 px |

Posizioni della mano (m, campo) alle pose chiave e punti notevoli:
- **Dritto**: carica all'anca destra (0,19; 0,91; +0,11), poi la mano sale a destra fino a (0,46; 1,24; −0,19) a 10,23 s
  («mano più a destra», gomito 64° nel modello), impatto (0,32; 1,41; −0,36) con la mano che va verso la rete e sale
  (73° dalla direzione della rete, salita 0,33), fine davanti al viso (0,15; 1,47; −0,42) e fermo. Busto da −40° (carica)
  a +26° (fine). Strada carica→impatto 0,77 m. Tempi: salita lenta ~0,6 s dall'anca all'apertura, parte veloce
  10,2–10,4 s (0,2–0,3 s), fermo in alto dopo 10,5 s. Conferma la lettura a occhio del piano (arco largo da destra, braccio
  che si distende, fine alta davanti al viso); **gomito**: il modello dà 49–64° di flessione nella fase distesa dove il
  video mostra il braccio quasi dritto (vedi 2.5).
- **Rovescio a due mani**: carica con la mano a sinistra all'altezza del petto (−0,09; 1,18; −0,13), impatto davanti
  (0,06; 1,32; −0,15), fine alta a destra (0,31; 1,46; −0,06); busto da +68° (girato a sinistra) a +5°. Mano a 132° dalla
  rete con salita 0,46: va soprattutto verso destra e in alto.
- **Servizio** (ripetizione 3, la più pulita): mano dall'anca (0,19; 0,98) alla battuta sopra la testa a destra
  (0,33; 1,66; −0,01) con il gomito a 96°, poi discesa davanti al corpo fino a (−0,02; 1,10; −0,05) verso l'anca sinistra.
  Ripetizione 2 simile (battuta a 1,70 m). La ripetizione 1 dà la mano a 1,39 m alla «battuta»: profondità sbagliata
  (vedi 2.5), non attendibile.
- **Tagliati**: rovescio (1 e 3) dalla cima alta al centro/sinistra (−0,02; 1,54; −0,21) in basso a destra (0,43; 1,00);
  dritto (2 e 4) dalla cima alta a destra (0,36; 1,42) in basso a sinistra (−0,10; 1,15). Discesa 0,4–0,5 m in 0,23–0,27 s,
  salita della mano −0,34…−0,73 (scende), 41–121° dalla direzione della rete (il taglio è trasversale e verso il basso,
  non un affondo). Telefono alla fine: inclinazione dalla verticale 34° (rovescio) e 81–90° (dritto, quasi orizzontale),
  **a bassa confidenza** (2.2).
- **Partenza** (7,5–9,2 s): mano a (0,39; 1,29; −0,12), gomito 91°, omero 24° dal fianco, busto −4°.

### 2.4 Velocità e rotazione del telefono
Picchi della mano 2,1–4,1 m/s nei colpi da fondo (dimostrazione lenta, non un colpo vero: le diagnostiche dell'utente in
gioco danno 1 200–1 400 °/s di telefono). Rotazione del telefono (dalla catena, °/s, bassa confidenza): dritto 150, rovescio
737, servizi 258–1 623, tagliati 705–1 609.

### 2.5 Limiti misurati (non ipotesi)
- **Errore trovato e corretto** in `ricostruisci.mjs`: il costo usava il `dot` a 3 componenti di `natpf_gesture_pose`,
  sommava solo i primi tre residui e l'ottimizzatore non faceva nessun passo (riproiezione 35 px sul dritto). Con la somma
  di tutti i residui: 6–12 px sui colpi puliti.
- **Profondità**: con una sola camera il verso di ogni segmento lungo l'asse camera è ambiguo; lo decidono i punti mondo
  di MediaPipe (peso 0,6) e la continuità (0,3). Nel braccio disteso di lato del dritto il modello piega ancora il gomito di
  49–64° dove il video mostra ~20–30°: l'omero misurato in pixel (fino a 106 px = 0,28 m) è vicino al massimo e la spalla
  del modello (0,19 m dal centro) è più interna di quella vera. Nel servizio 1 la mano in alto viene messa a 1,39 m.
  Rimedio per il passo B: usare per la posa le **posizioni misurate** (pixel e altezze relative) e non gli angoli del
  gomito nei tratti distesi; in alternativa adattare le lunghezze dei segmenti a chi gioca.
- **Rovescio a due mani**: riproiezione 24 px (Pose confonde le due mani sovrapposte).
- **Mano**: Hands manca nel 15–30 % dei fotogrammi dei colpi (`fotogrammi_senza_mano` per colpo nel JSON; nel dritto 14
  su 24 nella parte veloce): lì pronosupinazione e polso sono tenuti dal fotogramma prima (`mano_interpolata` nei campioni
  e «MANO INTERPOLATA» sui fogli).
- **Schermo**: visto in 1/3–2/3 delle pose chiave; orientamento del telefono a bassa confidenza (2.2).
- **Non verificato**: la focale (720 px è un'ipotesi), le lunghezze dei segmenti dell'utente (si usano quelle del
  modello), il riconoscimento dei gesti su questi dati (passo 3 del piano), e nulla è stato provato con il telefono reale.

