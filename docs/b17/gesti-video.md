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
   una griglia di 72 partenze sul primo fotogramma di ogni tratto **e di nuovo su ogni fotogramma** la cui soluzione
   (partita dal fotogramma prima) ha riproiezione > 18 px o sta oltre i limiti articolari di più di 3°: si tiene la
   soluzione che spiega meglio le osservazioni (pixel, profondità, mano, schermo; senza i termini di continuità, che
   favorirebbero sempre il ramo da cui si viene) con un margine del 20 % (aggiunto il 09/11 dopo la revisione: nel
   tratto unico dei tagliati il tagliato 3 ereditava dal tagliato 2 un falso minimo, 27 px, braccio che pende invece che
   alzato di traverso; 115 fotogrammi rifatti, 14 cambiati). Limiti articolari come penalità morbide, con i superamenti
   riportati per campione (`qualita.oltre_i_limiti`) e per colpo (`misure.limiti_articolari`); senza la mano vista
   pronosupinazione e polso seguono il fotogramma precedente (interpolazione dichiarata nei dati). Poi lisciatura a fase
   nulla [1 2 1]/4 sugli angoli.
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
   (cima del tagliato). **Servizio** (regole riviste il 09/11, misure 2D di Pose nell'immagine): c'è un servizio solo se
   il polso **destro** sale sopra la testa (y del polso < y del naso) in qualche fotogramma, altrimenti il tratto è
   segnato `errore` e non entra nelle tabelle; battuta = mano destra **più alta** nei 0,4 s prima del picco di velocità
   della discesa (la mano è più veloce mentre scende, ma si colpisce in alto), cercato da quando la mano è arrivata in
   alto; carica = **ultimo fotogramma con la mano destra all'anca** (polso entro 0,15 m sopra la linea delle anche) prima
   della salita, nell'1,5 s prima della battuta; arrivo in alto = primo fotogramma con il polso sopra il naso (da cui
   salita, fermo in alto e discesa); lancio «visto» solo se il polso **sinistro** sale di almeno 0,10 m sopra la linea
   delle spalle (un picco di velocità della sinistra non basta: nella 2ª ripetizione oscillava al fianco). Posizione
   ferma: il tratto vale solo se la velocità 2D massima della mano è sotto 0,6 m/s (`mano_ferma`), altrimenti `avviso`.
   Tagliati: tutti i picchi oltre 2 m/s a ≥ 1,2 s l'uno dall'altro, dritto o rovescio dal verso della mano all'impatto.
5. `fogli.mjs`: fogli `docs/b17/img/V-*.webp` con, per ogni fotogramma scelto (12 per colpo, con carica, impatto, fine,
   arrivo in alto del servizio e lancio, quest'ultimo solo se visto, sempre dentro; «RIFATTO DA GRIGLIA» e «oltre i
   limiti» nelle didascalie), il video con sopra Pose (ciano), la mano destra di Hands (verde), l'asse dello schermo
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

## 2. RISULTATI (09/11/2026, estrazione completa dei tratti dei colpi: 887 fotogrammi; rifatti dopo la revisione)

Dati: `docs/b17/gesti-video.json` (per ogni colpo tempi, misure, pose chiave con gli angoli del modello, campioni fotogramma
per fotogramma con qualità e segnalazione delle interpolazioni, dei fotogrammi rifatti dalla griglia e dei limiti
superati). Fogli: `docs/b17/img/V-*.webp` (11: presa, dritto ×2, partenza, rovescio, servizio 2 e 3, tagliati 1–4; 12
fotogrammi per colpo, 5 per la partenza), **tutti guardati** il 09/11 dopo la revisione (prima solo 6 su 11, e i cinque non
guardati erano proprio quelli sbagliati: vedi 2.6). Campo: x a destra di chi gioca, y in alto, −z verso la rete.

### 2.1 Copertura del tracciamento (fotogrammi con Pose / braccio destro / mano destra di Hands / schermo visto)
| Tratto | n | Pose | braccio | mano destra | schermo vicino al polso |
|---|---|---|---|---|---|
| presa 1–5 s (primo piano) | 121 | 14 | 4 | 18 (qualsiasi mano) | 98 (macchia grande, 2 000–67 000 px) |
| dritto 1ª ripetizione 7,6–9,2 s | 49 | 49 | 49 | 27 | 26 |
| partenza ferma 9,4–9,7 s | 10 | 10 | 10 | 10 | 0 |
| dritto 2ª ripetizione 8,8–12,0 s | 97 | 97 | 95 | 73 | 32 |
| rovescio 14,4–17,6 s | 97 | 97 | 97 | 88 | 15 |
| «servizio 1» 17,4–20,4 s (non è un servizio, 2.3) | 91 | 91 | 91 | 85 | 8 |
| servizio 2 e 3 | 97 · 82 | tutti | 96 · 82 | 81 · 70 | 18 · 28 |
| tagliati 30,0–38,6 s | 259 | 259 | 259 | 214 | 150 |

Lo schermo acceso si vede poco nei colpi (è di taglio o in ombra): l'orientamento del telefono viene soprattutto dalla
mano di Hands e, dove manca anche quella (`mano_interpolata`), dal fotogramma prima. **Camera**: scala 373 px/m dalle
spalle di MediaPipe, confermata da una ricerca ±10 % sul costo della ricostruzione (minimo a ×1,00); distanza
camera–bacino 1,93 m con la focale ipotizzata di 720 px; camera 0,38 m sopra le anche e 0,24 m **alla destra di chi
gioca** (l'asse ottico passa per x = +0,235 m del campo, dove +x è la destra di chi gioca: il giocatore appare a destra
del centro del quadro; la versione precedente di questa riga diceva «a sinistra», sbagliato).

### 2.2 La presa (primo piano 1–5 s e presa nei colpi)
- Nel primo piano lo schermo acceso riempie l'immagine; Pose non vede il corpo e Hands vede la mano in 18 fotogrammi su
  121 (solo le dita che sporgono). **Misure 2D**: asse lungo dello schermo a 167° nell'immagine (mediana: quasi
  orizzontale, cima verso destra nel quadro cioè verso la sinistra di chi gioca), rapporto dei lati 0,75 (lo schermo è
  visto quasi di fronte), palmo rivolto via dalla camera (normale −0,35). Il telefono è **in orizzontale con lo schermo verso
  la camera**, le dita sotto il bordo inferiore: coerente con le foto del 09/11 (`presa-foto.md`), non con il «telefono
  in verticale nel pugno» letto a occhio nel piano.
- Nei colpi, il modello della presa `upright` (cima lungo il pollice, schermo dalla parte del palmo) va corretto di
  Euler (45°, 10°, 65°) per far coincidere l'asse dello schermo con la macchia (204 fotogrammi con schermo e mano):
  l'errore d'asse resta **37,7°** (prima 46,8°). È alto: la presa reale non è «upright» e la macchia dello schermo è
  spesso un frammento. **Gli orientamenti del telefono nelle tabelle sotto sono a bassa confidenza**; vanno rifatti nel
  passo B con la presa delle foto (telefono lungo l'avambraccio, cima in avanti) come modello di partenza. Nei fotogrammi
  chiave con `mano_interpolata` (impatto dei dritti, del servizio 2, dei tagliati 1–3) l'orientamento «all'impatto» è
  tutto interpolato dal fotogramma prima.

### 2.3 Colpi (tempi in secondi dall'inizio del video; mano = polso della catena; angoli del modello del gioco)
| Colpo | inizio → carica → impatto → fine | carica / colpo / accomp. | mano all'impatto (2D) | arco orizz. spalla→mano | gomito carica/imp/fine (flessione) | altezza mano carica/imp/fine | riproiezione |
|---|---|---|---|---|---|---|---|
| Dritto 1ª rip. | 7,97 → 8,00 → 8,43 → 8,57 | 0,03 / 0,43 / 0,13 s | 3,1 m/s (2,9) | +82° | 84° / 95° / 103° | 1,05 / 1,37 / 1,43 m | 10 px |
| Dritto 2ª rip. | 9,77 → 9,87 → 10,37 → 10,53 | 0,10 / 0,50 / 0,17 s | 2,1 m/s (2,5) | **+62°** (da destra verso la rete e sinistra) | 51° / 49° / 87° | 0,91 / 1,41 / 1,47 m | 11 px |
| Rovescio a due mani | 15,50 → 15,60 → 15,77 → 15,97 | 0,10 / 0,17 / 0,20 s | 2,6 m/s (2,6) | −100° | 18° / 89° / 129° | 1,11 / 1,36 / 1,52 m | **15 px** (le due mani si coprono; angoli non attendibili, 2.5) |
| «Servizio 1» 17,4–20,4 | **nessun servizio**: il polso destro resta 63 px sotto il naso, le due mani stanno unite davanti al petto/viso in 28 fotogrammi (telefono tenuto con due mani) | — | — | — | — | — | — |
| Servizio 2 | 22,97 → 23,00 → in alto 23,27 → battuta 23,70 → 24,00 | salita 0,27 s, fermo in alto 0,43 s, discesa 0,30 s | 1,9 m/s (0,9) | +60° | 95° / 99° / 90° | 1,09 / 1,70 / 1,20 m | 12 px |
| Servizio 3 | 27,53 → 27,67 → in alto 27,93 → battuta 28,07 → 28,63 | salita 0,27 s, fermo in alto 0,13 s, discesa 0,57 s | 0,9 m/s (0,2) | +88° | 92° / 96° / 83° | 1,08 / 1,66 / 1,10 m | 11 px |
| Tagliato 1 (rovescio) | 30,40 → 30,43 → 30,70 → 30,87 | 0,03 / 0,27 / 0,17 s | 4,1 m/s (3,8) | −119° | 106° / 99° / 62° | 1,54 / 1,13 / 1,00 m | 9 px |
| Tagliato 2 (dritto) | 32,57 → 32,60 → 32,83 → 33,07 | 0,03 / 0,23 / 0,23 s | 2,5 m/s (2,6) | +113° | 98° / 113° / 94° | 1,42 / 1,26 / 1,15 m | 10 px |
| Tagliato 3 (rovescio) | 34,63 → 34,67 → 34,93 → 35,17 | 0,03 / 0,27 / 0,23 s | 3,3 m/s (3,1) | −114° | 109° / 92° / 67° | 1,48 / 1,16 / 1,02 m | 11 px |
| Tagliato 4 (dritto) | 36,80 → 36,83 → 37,10 → 37,30 | 0,03 / 0,27 / 0,20 s | 2,8 m/s (2,3) | +97° | 99° / 108° / 103° | 1,47 / 1,33 / 1,22 m | 12 px |

Nei servizi **nessun lancio**: la sinistra non sale mai sopra la linea delle spalle (al massimo 0,19 m sotto nel 2, 0,46 m
nel 3); il picco di velocità della sinistra che la versione precedente chiamava «lancio» (23,50 s) era la mano che
oscilla al fianco. I servizi dell'utente sono quindi: mano dall'anca sopra la testa in ~0,27 s, fermo in alto, discesa.

Posizioni della mano (m, campo) alle pose chiave e punti notevoli:
- **Dritto, 2ª ripetizione** (la misurata finora): carica all'anca destra (0,19; 0,91; +0,11), poi la mano sale a destra
  fino a (0,46; 1,24; −0,19) a 10,23 s («mano più a destra», gomito 64° nel modello), impatto (0,32; 1,41; −0,36) con la
  mano che va verso la rete e sale (73° dalla direzione della rete, salita 0,33), fine davanti al viso (0,15; 1,47; −0,42)
  e fermo. Busto da −40° (carica) a +26° (fine). Strada carica→impatto 0,70 m. Tempi: salita lenta ~0,6 s dall'anca
  all'apertura, parte veloce 10,2–10,4 s (0,2–0,3 s), fermo in alto dopo 10,5 s. **Gomito**: il modello dà 49–64° di
  flessione nella fase distesa dove il video mostra il braccio quasi dritto (vedi 2.5).
- **Dritto, 1ª ripetizione** (7,6–9,2 s, prima etichettato «partenza»): stesso disegno, più veloce e più corto: carica
  all'anca (0,34; 1,05; +0,11) a 8,00 s, mano più a destra (0,44; 1,14; +0,03) a 8,27 s, impatto (0,26; 1,37; −0,29) a
  8,43 s con 2,9 m/s in 2D (la 2ª: 2,5), 47° dalla direzione della rete e salita 0,31, fine davanti al viso
  (0,10; 1,43; −0,36) a 8,57 s. Busto da −54° a +29° (la 2ª: −40° → +26°). Strada carica→impatto 0,52 m (la 2ª 0,70 m:
  nella 1ª l'apertura a destra è meno ampia). Colpo 0,43 s contro 0,50 s. Il gomito del modello (84–103°) è più piegato
  che nella 2ª, con la stessa riserva di 2.5. Mano di Hands vista in 7 fotogrammi su 19 nel colpo.
- **Rovescio a due mani**: carica con la mano a sinistra all'altezza del petto (−0,14; 1,11; +0,08), impatto davanti
  (0,00; 1,36; −0,04), fine alta a destra (0,31; 1,52; +0,01); busto da +48° (girato a sinistra) a −40°. Mano a 69° dalla
  rete con salita 0,59: va soprattutto in alto e verso destra. Angoli del modello non attendibili (2.5): valgono tempi
  e traiettoria 2D.
- **Servizio** (ripetizione 3, la più pulita): mano all'anca (0,25; 1,08; +0,05) fino a 27,67 s, sopra la testa a destra
  (0,33; 1,66; −0,01) a 28,07 s con il gomito a 96°, poi discesa davanti al corpo fino a (−0,02; 1,10; −0,05) verso l'anca
  sinistra. Ripetizione 2: anca (0,24; 1,09; +0,13) a 23,00 s, battuta (0,23; 1,70; +0,04) a 23,70 s dopo 0,43 s fermo in
  alto, fine (−0,06; 1,20; −0,16). La ripetizione 1 **non è un servizio** (tabella): il tratto 17,4–20,4 s va scartato.
- **Tagliati**: rovescio (1 e 3) dalla cima alta al centro/sinistra (−0,02; 1,54; −0,21) e (−0,03; 1,48; −0,26) in basso a
  destra (0,43; 1,00); dritto (2 e 4) dalla cima alta a destra (0,36; 1,42) in basso a sinistra (−0,10; 1,15). Discesa
  0,2–0,5 m in 0,23–0,27 s, salita della mano −0,34…−0,68 (scende), 41–123° dalla direzione della rete (il taglio è
  trasversale e verso il basso, non un affondo). In carica dei rovesci l'omero è alzato di traverso sul petto (spalla
  p 82–90°, e 64–75°) con la mano alla testa a sinistra. Telefono alla fine: inclinazione dalla verticale 34° (rovescio)
  e 81–90° (dritto, quasi orizzontale), **a bassa confidenza** (2.2).
- **Partenza ferma** (9,4–9,7 s, prima del 2º dritto; velocità 2D massima 0,16 m/s, `mano_ferma`): mano all'anca destra,
  media (0,16; 0,95; 0,00), busto −6°, omero 18° dal fianco, gomito 63° nel modello (il video mostra il braccio che pende
  quasi disteso con il telefono alla coscia: stessa sottostima del gomito di 2.5), riproiezione 9 px. La «partenza»
  della versione precedente (7,5–9,2 s, mano a (0,39; 1,29), gomito 91°, 3,9 m/s) era il centro del 1º dritto.

### 2.4 Velocità e rotazione del telefono
Picchi della mano 2,1–4,1 m/s nei colpi da fondo (dimostrazione lenta, non un colpo vero: le diagnostiche dell'utente in
gioco danno 1 200–1 400 °/s di telefono). Le velocità 3D della catena nei **singoli campioni sono indicative** (la
profondità ricostruita salta tra fotogrammi: 6,7 m/s a 23,77 s con 1,8 in 2D; 2,8 contro 2,3 nel rovescio): per gli
istanti si usa la 2D di Pose, e qui si riportano entrambe. Rotazione del telefono (dalla catena, °/s, bassa
confidenza): dritto 1 168 (1ª) e 150 (2ª), rovescio 493, servizi 954–1 623, tagliati 705–1 609.

### 2.5 Limiti misurati (non ipotesi)
- **Errore trovato e corretto** in `ricostruisci.mjs`: il costo usava il `dot` a 3 componenti di `natpf_gesture_pose`,
  sommava solo i primi tre residui e l'ottimizzatore non faceva nessun passo (riproiezione 35 px sul dritto). Con la somma
  di tutti i residui: 6–12 px sui colpi puliti.
- **Falso minimo ereditato** (trovato dalla revisione del 09/11): un tratto lungo ricostruito in continuità porta avanti il
  ramo del fotogramma prima; il tagliato 3 in carica stava a 27 px con la spalla ai limiti (p −90°, e −10°) e il braccio
  che pende. Ora ogni fotogramma con riproiezione > 18 px o oltre i limiti si rifà dalla griglia (§1 punto 3): tagliato 3
  in carica 8 px con p 82°, e 64° come il tagliato 1; 14 fotogrammi cambiati su 115 rifatti (tagliati 1035 e 1052,
  rovescio 462 e 470, servizio 3).
- **Limiti articolari**: la penalità è morbida e la versione precedente non diceva di quanto venivano superati (dv −31°
  con limite −30° in quasi tutti i colpi, rovescio tau 72,6° e b 146,8°, tagliato 3 p −90,4° e e −10°). Dopo il rifacimento
  dalla griglia i superamenti nei colpi restano sotto 1,6° (`misure.limiti_articolari` per colpo, `qualita.oltre_i_limiti`
  per campione; nel rovescio anche y 0,015 m oltre 0,03).
- **Profondità**: con una sola camera il verso di ogni segmento lungo l'asse camera è ambiguo; lo decidono i punti mondo
  di MediaPipe (peso 0,6) e la continuità (0,3). Nel braccio disteso di lato del dritto il modello piega ancora il gomito di
  49–64° dove il video mostra ~20–30°: l'omero misurato in pixel (fino a 106 px = 0,28 m) è vicino al massimo e la spalla
  del modello (0,19 m dal centro) è più interna di quella vera. **Indizio quantitativo**: i punti mondo di MediaPipe danno
  omero 0,21–0,26 m e avambraccio 0,22–0,26 m (fotogrammi 300–312), contro 0,30/0,262 m del modello, mentre la scala
  (373 px/m) viene dalle spalle: il braccio del modello è ~15–20 % troppo lungo rispetto al corpo in pixel e il termine di
  profondità gli impedisce di inclinarsi, quindi piega il gomito. Rimedio per il passo B: usare per la posa le
  **posizioni misurate** (pixel e altezze relative) e non gli angoli del gomito nei tratti distesi, o adattare le
  lunghezze dei segmenti a chi gioca (scala per segmento).
- **Rovescio a due mani**: riproiezione 10–17 px (prima 18–32) con il busto girato di ~70° e le due mani che si coprono:
  sul foglio la catena segue i punti solo grossolanamente (carica con il gomito a 18°, braccio teso verso sinistra). Per il
  passo B del rovescio valgono i **tempi** e la traiettoria 2D del polso di Pose, non gli angoli ricostruiti.
- **Mano**: Hands manca nel 15–65 % dei fotogrammi dei colpi (`fotogrammi_senza_mano` per colpo nel JSON; nel 2º dritto 14
  su 24, nel 1º 12 su 19): lì pronosupinazione e polso sono tenuti dal fotogramma prima (`mano_interpolata` nei campioni
  e «MANO INTERPOLATA» sui fogli).
- **Schermo**: visto in 1/3–2/3 delle pose chiave; orientamento del telefono a bassa confidenza (2.2).
- **Non verificato**: la focale (720 px è un'ipotesi), le lunghezze dei segmenti dell'utente (si usano quelle del
  modello), il riconoscimento dei gesti su questi dati (passo 3 del piano), e nulla è stato provato con il telefono reale.

### 2.6 Correzioni dopo la revisione (09/11, stesso giorno)
Riproducibilità: rilanciando `ricostruisci.mjs` sugli stessi `mp-p1..p4.json` il JSON è identico byte per byte;
lunghezze dei segmenti rispettate in tutti i campioni; 1 281 fotogrammi a 30 fps costanti (la mappa i/30 → t regge). La
revisione ha trovato quattro errori, tutti in tratti i cui fogli non erano stati guardati:
1. «Partenza» 7,5–9,2 s conteneva il 1º dritto → ora `ready` 9,4–9,7 s (ferma, controllata) e `forehand0` misurato.
2. «Servizio 1» 17,4–20,4 s non era un servizio (telefono con due mani davanti al viso; il «lancio» era la sinistra che
   saliva a prendere il telefono) → regola «polso destro sopra il naso», tratto segnato `errore`, foglio tolto.
3. Servizio 2: carica e «lancio» nella posa ferma in alto → carica = mano all'anca (23,00 s), arrivo in alto 23,27,
   lancio visto solo con la sinistra sopra le spalle (mai).
4. Tagliato 3 in carica su un falso minimo → rifacimento dalla griglia (sopra).
Minori: `metodo.tracciamento` ora legge il modello dai metadati dei file d'ingresso (Pose *full*, non «heavy»); la
didascalia «LANCIO» dei fogli solo se il lancio è visto; velocità 3D marcate indicative; limiti superati riportati; la
camera sta alla destra di chi gioca (2.1).
