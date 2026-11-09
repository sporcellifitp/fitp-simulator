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
2. `estrai-posa.mjs`: MediaPipe **Pose** (modello *heavy*, `modelComplexity 2`, senza lisciatura) e **Hands** (*full*,
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
   corpo: è meno sensibile al tremolio della profondità della 3D, che si riporta accanto); carica = minimo della velocità
   prima del picco (dopo il picco della preparazione); inizio = quando la mano comincia a muoversi; fine = quando torna
   lenta dopo l'impatto. Servizio: lancio = picco della velocità del polso **sinistro** (palla immaginaria), battuta =
   picco della mano destra dopo il lancio. Tagliati: tutti i picchi oltre 2 m/s a ≥ 1,2 s l'uno dall'altro, dritto o
   rovescio dal verso della mano all'impatto.
5. `fogli.mjs`: fogli `docs/b17/img/V-*.webp` con, per ogni fotogramma scelto (12 per colpo, con carica, impatto, fine e
   lancio sempre dentro), il video con sopra Pose (ciano), la mano destra di Hands (verde), l'asse dello schermo
   (magenta) e la catena riproiettata (arancione), accanto alla ricostruzione 3D vista di fronte (come la camera) e di
   lato (da destra di chi gioca, rete a sinistra) con la scia del polso.

Rifare tutto (dalla cartella `natpf-tennis`, con i fotogrammi in `$F` e il JSON di MediaPipe in `$MP`):

```sh
ffmpeg -i gesti-video.mp4 -vf scale=540:960 -q:v 2 -start_number 0 $F/f%04d.jpg
CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/video/estrai-posa.mjs --frames=$F --out=$MP      # ~1 h su CPU
node --import ./test/register.mjs scripts/video/ricostruisci.mjs --in=$MP --out=../docs/b17/gesti-video.json
CHROMIUM_PATH=… node scripts/video/fogli.mjs --dati=../docs/b17/gesti-video.json --mp=$MP --frames=$F --out=../docs/b17/img
```

RISULTATI_DA_COMPILARE
