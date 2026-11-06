# B9 · Prototipo 2 — direzione «motion design illustrato» (braccio, mano e telefono 2,5D)

> Stato: **completato** (06/11/2026, dopo due interruzioni per il limite d'uso). Nessun file del gioco modificato.
> Prototipo: `natpf-tennis/prototipi/b9-motion/` — `index.html` (modale), `main.js` (disegno), `motion.js` (moto),
> `rig.js` (scheletro di avambraccio e mano), `verifica.mjs` (fedeltà con il telefono simulato). Fuori dalla build.
> Aprirlo: `cd natpf-tennis && npm run dev`, poi `http://127.0.0.1:<porta>/prototipi/b9-motion/index.html`.
> Verifica di fedeltà: `cd natpf-tennis && node --import ./test/register.mjs prototipi/b9-motion/verifica.mjs`.
> Fotogrammi: `docs/b9/img/pmo-1…6-*.png` (rifatti il 06/11 con la versione finale).

## 1. In breve

- **Cosa mostra.** Solo avambraccio, mano e telefono (niente corpo), disegnati come un'illustrazione sportiva: forme
  morbide con contorno scuro, luce dipinta a bande (toon) con luce di contorno fredda, manica che sfuma verso la spalla
  fuori quadro, polsino. Sei schede: presa, dritto, rovescio, servizio, pallonetto, palla corta, nella modale piccola e
  centrata con le frecce in basso (come chiede la richiesta B9).
- **Fedele al riconoscimento.** La posa disegnata è la stessa che `verifica.mjs` fa eseguire al telefono simulato completo
  (rilevatore, forma del colpo, calibrazione, gioco): **tutti i colpi riconosciuti come mostrati**, con un solo messaggio,
  il lato giusto, destro e mancino, a velocità 0,8× e 1×; a 1,25× dritto e rovescio diventano «piatto» (il verso giusto
  del cambiamento). Servizio: due messaggi a 0,690 s. Presa: 0 °/s.
- **Didattica.** Scia della cima con dissolvenza, fantasmi delle pose chiave (carica, impatto, fine), freccia del verso,
  palla che arriva e incontra il telefono nell'istante del picco, lampo all'impatto, curva della velocità di rotazione con
  «picco = impatto» e la testina che scorre; ritmo alternato rallentato 0,5× e tempo reale.
- **Costo.** 3,5–4,8 ms per fotogramma alla modale di 1280×720 e 5,5–6,9 ms a 1920×1080 in Chromium **senza GPU**; ciclo
  reale a 60 fotogrammi/s. Peso: 74,5 kB di JavaScript (25,8 kB gzip), nessun asset, nessuna libreria.
- **Limiti principali** (§7): il servizio resta il più piccolo e il più difficile da leggere; le dita sporgono ancora
  6–8 mm sul vetro (come nella foto della presa); nessuna prova su GPU vera, telefono o ledwall.

## 2. Scelte di direzione artistica

| Scelta | Perché |
|---|---|
| Niente corpo: avambraccio, mano, telefono; manica che sfuma fuori quadro | Il gesto si legge sul telefono; un corpo intero stilizzato era il difetto principale dell'animazione attuale (analisi A). |
| **Avambraccio solidale con la mano** (polso fermo) | La specifica (§1.5, §2.3) chiede il polso fermo. Con la presa verificata `q0` un gomito risolto da una spalla fissa dava 80–120° di polso piegato («polso spezzato»). |
| Portata ridotta a 0,8× (`REACH`) | Telefono a 0,40–0,47 m dalla spalla, gomito a ~110–125°: braccio naturale invece che quasi teso; il riconoscimento non cambia (verificato). |
| Canvas 2D ridisegnato a ogni fotogramma | Vettoriale e nitido a qualunque risoluzione (ledwall), nessun contesto WebGL: si possono avere **due istanze** nello stesso schermo (oggi la demo 3D è un solo contesto condiviso e una metà resta senza animazione). |
| Una camera per gesto, scelta per la didattica | Dritto e rovescio da dietro e dall'alto (l'arco intero, «da destra a sinistra»); servizio di profilo con la camera che segue la mano; pallonetto di lato e dall'alto (schermo al cielo visibile); palla corta da dietro a destra (schermo e mano che scende, la palla oltre il telefono). |
| Presa: due viste ferme con un giro lento tra le due | «Come la vedi tu» (schermo, pollice sul bordo, polpastrelli sul bordo opposto) e «Di lato: la cima in avanti» (inclinazione 39°, palmo sotto il telefono). |
| Polsino bianco con riga blu | Nasconde l'attacco polso–avambraccio (il punto più difficile da rendere bene in 2,5D) e dà un riferimento sportivo; disegnato come cilindro vero. |

## 3. Moto (fedele al riconoscimento)

`motion.js` usa **solo** i parametri verificati di `src/natpf/natpf_gesture_motion.js` (asse, verso, picco, durata
della parte veloce, polso, presa `GRIP_POSE.palmo`); cambiano la messa in scena dei tempi e il raggio del braccio:
parte veloce cicloidale `peak·sin²(πu)` con il picco = contatto con la palla; preparazione `12u²(1−u)` (parte da fermo,
arriva decelerando: nessun fermo prima del colpo); fermo in fine colpo 0,14–0,20 s; ritorno a minimo jerk con un
piccolo superamento e assestamento (~2°); respiro di 4 mm nei fermi; loop chiuso senza scatti.
`gesturePose(id, t, { hand })` è la funzione campionabile proposta in `specifica-gesti.md` §6.

| Gesto | Ciclo | Contatto | Parte veloce | Picco disegnato (°/s) | Preparazione max | Ritorno max |
|---|---|---|---|---|---|---|
| Dritto | 2,25 s | 1,030 s | 260 ms | 713 (polso compreso) | 137 | 240 |
| Rovescio | 2,25 s | 1,030 s | 260 ms | 691 | 126 | 233 |
| Pallonetto | 2,56 s | 1,300 s | 300 ms | 520 | 82 | 166 |
| Palla corta | 2,19 s | 0,940 s | 240 ms | 414 | 84 | 142 |
| Servizio | 3,83 s | 2,200 s | lancio 420 ms (300 °/s) + battuta 240 ms | 700 | 56 | 103 |

Servizio: lancio → braccio sopra la testa con il telefono quasi fermo → battuta 0,69 s dopo il picco del lancio, al colmo
della palla (la palla parte dalla cima del telefono a fine lancio; gravità scalata: si scala l'altezza, mai il tempo).
Il picco misurato coincide con il contatto (0 ms) in tutti i colpi; nel rilevatore il picco cade 8 ms prima (mezzo
campione a 60 Hz). Esito completo di `verifica.mjs` (06/11, ultima esecuzione): 12 combinazioni (calibrazione con il
braccio simulato o con l'animazione stessa × destro/mancino × 0,8/1/1,25) tutte riconosciute come mostrato.

## 4. Anatomia della mano (`rig.js`)

Riferimento: foto `docs/riferimenti/presa-palmo-utente-2026-11-04.webp` (presa nel palmo). Misure in mm nel riferimento
del telefono (162 × 79 × 8,6 mm). Il dorso del telefono appoggia sul palmo (eminenze tenar e ipotenar sotto il bordo
basso), il pollice disteso lungo il bordo destro senza toccare lo schermo, le quattro dita avvolgono il bordo sinistro
nella metà bassa. Ogni dito è una catena di tre falangi con lunghezze e raggi anatomici (indice 40/23/18 mm, raggi
9,0→6,5 mm; mignolo 33/19/16, 7,9→5,8) e flessioni **12° / 68° / 116°** (mignolo 12/70/110): la falange media sale lungo
lo spessore un poco staccata, la distale torna sul bordo, i polpastrelli sporgono sul vetro **6–8 mm** (misurati con
uno script di controllo; con 10/84/96 di prima erano 12–15 mm: «dita sdraiate sullo schermo»). Avambraccio con profilo
rastremato (polso 25 mm di raggio, ventre 38), angolo polso–mano fisso di ~32° (flesso e deviato verso il mignolo come
nella foto).

## 5. Tecniche di disegno (`main.js`)

- **Proiezione:** la posa è calcolata in 3D (campo, metri) e proiettata con una camera prospettica (2,2 m, focale scelta
  perché tutto il moto stia nel riquadro utile: stessa composizione su ogni schermo); spessori dei tratti proporzionali
  allo stadio.
- **Forme:** capsule rastremate (tangenti esterne tra due cerchi) per avambraccio, manica e falangi; palmo come
  inviluppo convesso arrotondato (curve quadratiche) di polso, eminenze, nocche e base del pollice; il gruppo
  «braccio e palmo» ha **un solo contorno** (prima i contorni allargati, poi i riempimenti), così le parti si fondono.
  Le falangi dello stesso dito dalla stessa parte del telefono formano un'unità con un solo contorno; unghie come ellissi
  orientate, visibili solo se il dorso guarda la camera.
- **Davanti/dietro il telefono:** ogni falange è assegnata al lato davanti o dietro confrontando la profondità con il
  punto più vicino del telefono; l'ordine è: braccio e dita dietro → ombra del telefono sulla pelle (`source-atop`) →
  telefono → ombra delle dita sul vetro → dita davanti. Uno strato fuori schermo, pulito e composto solo nel
  rettangolo della figura.
- **Luce dipinta:** gradiente lineare trasversale con 13 tappe calcolate dalla normale del cilindro (ombra, base,
  luce, lume) e luce di contorno fredda sul lato in ombra; palmo con gradiente radiale.
- **Polsino:** cilindro corto = inviluppo dei due anelli di sezione proiettati; l'orlo visibile ha un **foro** con il
  raggio dell'avambraccio (riempimento pari-dispari: dentro esce la pelle, non un disco bianco); riga blu solo sulla metà
  visibile dell'anello di mezzo; quando l'avambraccio è quasi di punta (entro ~28° dalla vista) il polsino va sotto il
  gruppo del braccio.
- **Telefono:** lastra a spigoli arrotondati (inviluppo delle due facce), bordo metallico a gradiente, vetro con due
  riflessi, schermata «Pronto» della pagina del telefono disegnata con una trasformazione affine dai tre angoli (la
  scritta non si specchia per il mancino), dorso con il modulo fotocamera.
- **Strati didattici:** fantasmi = sagoma piatta resa una volta e riusata (cache per camera ferma); scia = nastro tra la
  cima e un punto più basso negli ultimi 0,3 s, con dissolvenza per età e per velocità (`lighter`); freccia tratteggiata
  lungo il percorso della cima che cresce durante la preparazione; lampo (anello e raggi, 0,16 s); palla con cuciture,
  rimbalzo prima del contatto, incontro con il telefono verso la cima; etichette sempre dentro lo stadio e sopra la banda
  della curva; fantasmi che finiscono nella banda (camera che segue) si spengono.
- **Mancino:** specchio esatto del moto (posizioni x → −x, rotazioni (x, −y, −z, w)) e dell'immagine.
- **Risoluzione adattiva:** densità del canvas = quella dello schermo (massimo 2), ridotta a passi di 0,25 se il disegno
  supera 12 ms per 40 fotogrammi di fila.

## 6. Iterazioni (fotogrammi resi con Chromium e guardati)

1. (05/11) Avambraccio verso la camera, dita staccate dal bordo, soggetto piccolo.
2. Avambraccio rivolto al corpo, viste perpendicolari all'avambraccio, nocche spostate, manica lunga.
3. Dritto ripreso da dietro a sinistra (l'arco si legge «da destra a sinistra»), fantasmi solo mano e telefono,
   etichette fuori dall'arco.
4. Prospettiva più piatta (2,2 m), servizio con camera che segue la mano; ritorno con superamento e assestamento.
   Primi `pmo-*` (05/11 22:34). **Difetti ancora visibili:** dita come quattro «salsicciotti» che coprono lo schermo,
   polsino a capsula «marshmallow», palla che copre la mano all'impatto (pallonetto, palla corta), servizio piccolo e
   di taglio, pallonetto in carica ridotto a una linea, vista di lato della presa ambigua.
5. (06/11) Dita 12/68/116 e raggi −7%, un solo contorno per dito, polsino cilindrico, palla verso la cima del telefono,
   presa di lato da destra (`[.95, .3, −.12]`, etichetta «Di lato: la cima in avanti»).
6. Viste nuove: servizio di profilo, pallonetto più dall'alto, palla corta da dietro a destra; fantasmi nella banda
   spenti, etichette sopra la banda; polsino sotto l'avambraccio quando questo punta alla camera.
7. Sequenze a 30 fotogrammi/s (dritto, palla corta, servizio intero): nessun salto di ordine tra le parti. Servizio più
   stretto (`FOLLOW` 0,45 m). Due regressioni viste e corrette: polsino sparito nel dritto (criterio di profondità troppo
   largo → criterio d'angolo) e disco bianco nel ritorno del servizio (foro nell'orlo). Etichette della presa non più
   tagliate dal bordo dello stadio. Frecce spente agli estremi. Ciclo reale a 60/s (vedi §7).

## 7. Costo per fotogramma e peso (misurati il 06/11)

`window.__bench(id, 180)`: 180 fotogrammi su un ciclo intero, mediana di tre prove dopo un riscaldamento; Chromium 153
headless **senza GPU** (SwiftShader), Xeon 2,1 GHz, 4 core. Millisecondi per fotogramma (disegno nel thread principale).

| Finestra (densità) | Stadio | Presa | Dritto | Rovescio | Servizio | Pallonetto | Palla corta |
|---|---|---|---|---|---|---|---|
| 1280×720 (1) | 701×394 | 4,0 | 4,0 | 3,9 | 4,8 | 3,5 | 3,6 |
| 960×1080, metà dello stesso schermo (1) | 847×476 | 5,0 | 5,4 | 5,1 | 5,4 | 4,4 | 4,7 |
| 1920×1080 (1) | 1052×592 | 6,0 | 6,6 | 5,8 | 6,9 | 5,5 | 5,9 |
| 1920×1080 (2) | 1052×592 ×2 | 17,1 | 18,1 | 15,8 | 17,9 | 15,0 | 13,4 |
| 3840×2160 (1), ledwall grande | 2106×1185 | 16,0 | 16,4 | 15,0 | 14,9 | 12,7 | 13,5 |

- **Ciclo reale** a 1280×720: **60 fotogrammi/s**. Prima erano 39/s anche con il canvas quasi vuoto: il collo era il
  `backdrop-filter: blur(4px)` del velo a tutto schermo dietro la modale (ricomposto a ogni fotogramma senza GPU). Tolto
  dal prototipo; **nell'integrazione evitare una sfocatura dal vivo dietro la modale mentre l'animazione gira** (velo
  semplice, o sfondo sfocato una volta sola).
- Il costo cresce con i pixel (Canvas 2D): a densità 2 o su 4K ~15–18 ms senza GPU, al limite dei 60/s; la riduzione
  adattiva della densità interviene da sola sopra densità 1. Con una GPU integrata la rasterizzazione del canvas è
  accelerata: stima ≤ 3 ms a 1920×1080 (non misurato).
- **Peso:** `main.js` 52,7 kB (18,0 kB gzip), `motion.js` 16,1 kB (6,2), `rig.js` 5,7 kB (2,6): 74,5 kB, **25,8 kB gzip**;
  `index.html` 5,5 kB. Nessun asset (font del gioco già presenti), nessuna dipendenza: three.js non serve.

## 8. Limiti e non verificato

- **Servizio:** il gesto copre ~1 m in verticale; con la camera che segue la mano la mano è più grande ma frecce e palla
  escono dal quadro per pochi istanti, e nel ritorno i fantasmi si accumulano in alto. In profilo il telefono è di taglio
  nel momento «braccio in alto». È la scheda più debole.
- **Dita:** sporgono ancora 6–8 mm sul vetro, come nella foto: con un telefono largo 79 mm è inevitabile se le dita
  avvolgono il bordo. L'etichetta «Dita sul bordo, non sullo schermo» va letta come «non sdraiate sullo schermo».
- Le falangi prossimali sono nel gruppo del palmo: quando il dito passa dal lato dietro a quello davanti resta un
  contorno tra falange prossimale e media. Nessuna piega delle articolazioni disegnata.
- Fantasmi a sagoma piatta, nessuna sfocatura di movimento (la sostituisce la scia). Testo della schermata del telefono
  molto piccolo sotto i 700 px di stadio (si legge solo «Pronto»).
- Palla con fisica semplificata (rimbalzo e uscita indicativi, non simulati).
- Il prototipo non espone ancora l'API `getGestureDemo` (`mount`, `setSize`, `play`, `stop`) usata da
  `natpf_tutorial.js`: va avvolto in una classe con quella forma (canvas proprio, `ResizeObserver` → `setSize`,
  `play(id, { hand, speed })`), un'istanza per metà nello stesso schermo.
- **Non provato:** GPU vera (Windows, Android), telefono vero, ledwall vero, Edge; solo Chromium headless senza GPU.
  Nessuna prova con persone (comprensione della presa e dei colpi).

## 9. Fotogrammi

- `pmo-1-modale-presa.png` — modale a 1280×720, presa «come la vedi tu» con i richiami.
- `pmo-2-dritto-sequenza.png` — dritto: carica, colpo (picco = impatto), accompagnamento con i fantasmi.
- `pmo-3-servizio-sequenza.png` — servizio: lancio, braccio in alto, battuta al colmo della palla.
- `pmo-4-pallonetto-palla-corta.png` — pallonetto e palla corta: carica e impatto.
- `pmo-5-rovescio-mancino-presa-di-lato.png` — rovescio all'impatto, dritto del mancino, presa di lato.
- `pmo-6-dettaglio-1920.png` — dettaglio della presa a 1920×1080 (nitidezza dei tratti, dita, pollice, polsino).

Strumenti di prova nel prototipo: `window.__show({ card, t, hand })` (istante fermo), `window.__view(id, dir, dist, i)`
(prova di camera), `window.__bench(id, n)` (costo), `window.__plan(id)` (tempi), `window.__skip` (spegne strati).
