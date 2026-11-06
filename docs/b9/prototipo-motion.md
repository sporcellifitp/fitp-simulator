# B9 · Prototipo 2 — direzione «motion design illustrato» (braccio, mano e telefono 2,5D)

> Stato: **bozza in corso** (05/11/2026). HEAD di partenza `e7cd44d`. Nessun file del gioco modificato.
> Prototipo: `natpf-tennis/prototipi/b9-motion/index.html` + `main.js` (servito da vite in sviluppo, fuori dalla build).
> Fotogrammi: `docs/b9/img/pmo-*.png`. File temporanei: scratchpad `b9/pmo/`.

## Piano
1. Moto fedele: il telefono ruota attorno agli assi, con i versi, i picchi e i tempi di `docs/b9/specifica-gesti.md`
   (§2, §3), posa calcolata in 3D (campo) e proiettata in 2,5D con una camera didattica per gesto.
2. Disegno vettoriale (Canvas 2D, ridisegnato a ogni fotogramma alla risoluzione dello schermo: nitido su ledwall):
   avambraccio, mano nella presa nel palmo, telefono con schermo «Pronto»; luci e ombre dipinte, contorni.
3. Didattica: scia della cima con dissolvenza, fantasmi delle pose chiave, freccia del verso, indicatore del picco
   di velocità sincronizzato con l'impatto, palla.
4. Fotogrammi con Chromium, almeno 3 iterazioni di correzione.

## Avanzamento
- Fatto: `prototipi/b9-motion/motion.js` (moto puro, `gesturePose(id, t, { hand })` come proposto in
  `specifica-gesti.md` §6) e `prototipi/b9-motion/verifica.mjs` (posa disegnata → telefono simulato completo).
  Esito: dritto, rovescio, pallonetto, palla corta riconosciuti con **un solo messaggio** e il lato giusto, picco
  8 ms prima del contatto disegnato (mezzo campione); servizio **2 messaggi a 0,690 s**; destro e mancino; calibrazione
  con il braccio simulato e con il dritto/rovescio dell'animazione; imitazione 0,8× uguale, 1,25× dritto e rovescio →
  piatto (verso giusto del cambiamento, §6.5). Presa: rotazione 0 °/s.
- Ripresa dopo il limite d'uso (05/11, HEAD `4d242f6`): verifica rifatta, tutto riconosciuto.
- Scoperta sull'anatomia: con la presa verificata `q0` (schermo 40° verso l'alto e verso il viso) e il palmo appoggiato
  al dorso del telefono, un gomito risolto da una spalla fissa (IK) dà un polso piegato di 80–120° in qualunque punto
  del cerchio dei gomiti: è il «polso spezzato» dell'analisi A. Scelta: **avambraccio solidale con la mano** (la
  specifica §1.5 e §2.3 dice «polso fermo: il telefono gira con il braccio»), angolo polso–avambraccio fisso e naturale,
  braccio superiore solo accennato e sfumato fuori quadro (manica). Portata ridotta a 0,8× (`REACH`): il telefono a
  0,40–0,47 m dalla spalla (gomito ~110–125° invece che quasi teso); la verifica di fedeltà resta tutta verde.
- Fatto (bozza funzionante): `index.html` (modale più piccola e centrata con frecce in basso a sinistra e a destra) e
  `main.js` (Canvas 2D). Iterazioni guardate con Chromium: (1) avambraccio verso la camera, dita staccate dal bordo,
  soggetto piccolo; (2) avambraccio rivolto al corpo, viste perpendicolari all'avambraccio, nocche spostate (le dita
  avvolgono il bordo), manica lunga; (3) dritto ripreso da dietro a sinistra (l'arco si legge «da destra a sinistra»),
  fantasmi solo mano e telefono, etichette fuori dall'arco; (4) prospettiva più piatta (2,2 m), servizio con camera che
  segue la mano; ritorno con superamento e assestamento (verifica sempre verde, ritorno 240 °/s ≤ 250).
- Fotogrammi `pmo-1…6` salvati il 05/11 alle 22:34 (prima versione), poi interruzione.
- **Ripresa 06/11 (secondo limite d'uso):** verifica rifatta, tutta verde. Difetti visti sui `pmo-*` del 05/11 e da
  correggere: dita come quattro «salsicciotti» staccati che coprono lo schermo (contraddice «dita sul bordo»), palmo
  invisibile nella vista «come la vedi tu», servizio con braccio piccolo e telefono di taglio, pallonetto in carica con
  il telefono ridotto a una linea. (in corso) iterazioni 5–7, costo, rapporto finale.
- Iterazione 5 (06/11): dita con flessione 12/68/116 (polpastrelli sul bordo, sporgenza sul vetro 6–8 mm invece di
  12–15) e raggi −7%; falangi dello stesso dito con un solo contorno; polsino come cilindro (inviluppo di due anelli
  proiettati, orlo ellittico, riga solo sul lato visibile) invece della capsula «marshmallow»; palla che incontra il
  telefono verso la cima (0,72 della metà) e non copre più la mano; presa di lato da destra (`[.95, .3, −.12]`: si
  vede l'inclinazione «cima in avanti»). Verifica di fedeltà verde (il moto non cambia).
- Iterazione 6: viste nuove — servizio di profilo `[1, .2, .25]`, pallonetto più dall'alto `[1, .5, −.35]` (lo schermo
  al cielo si vede in carica), palla corta da dietro a destra `[.75, .55, .6]`; fantasmi che finiscono nella banda della
  curva si spengono, etichette sempre sopra la banda; polsino sotto l'avambraccio quando l'avambraccio punta alla camera
  (prima un disco bianco «a palla»).
- Iterazione 7: sequenze a 30 fotogrammi/s (dritto, palla corta, servizio) senza salti di ordine tra le parti; servizio
  inquadrato più stretto (`FOLLOW` 0,45 m: la mano più grande, gli archi possono uscire dal quadro per pochi istanti).
- Costo misurato (06/11, `__bench`, 180 fotogrammi su un ciclo, Chromium senza GPU, ms per fotogramma): 1280×720
  (stadio 701×394) 3,6–5,1; 1920×1080 (1052×592) 5,7–7,3; metà schermo 960×1080 (847×476) 4,5–5,4; 1920×1080 a densità 2
  14,7–17,3. Peso: `main.js` 52,0 kB (17,7 kB gzip), `motion.js` 16,1 kB (6,2), `rig.js` 5,7 kB (2,6).
