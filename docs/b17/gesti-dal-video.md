# B17.1 · passo C · Il disegno dei gesti come il video: camera frontale specchiata, gesto intero, figura chiara

> **Passo C2 (10/11)**: disegno allineato al passo B3 — primo piano dell'impatto («Palla sullo SCHERMO» nei colpi di dritto,
> «Palla sul DORSO» nei rovesci) e braccio libero del rovescio a una mano in vista: §7 (misure, decisioni, limiti).
>
> **Passo B3 (10/11 notte)**: il rovescio è ora **a una mano** (decisione dell'utente) e all'impatto il dritto colpisce con lo
> schermo verso la palla, il rovescio con il dorso; coreografie, camere di piatto, volée e incrociato e misure aggiornate in
> `docs/b17/ottimizzazione.md` §9. Le righe qui sotto sul «rovescio a due mani» descrivono il passo C.

> Stato al 09/11/2026 notte, worktree B17.1 (`.claude/worktrees/wf_bb380d57-57a-1`). Piano: `docs/b17/analisi-e-piano.md`
> §1.4 punti 4–5. Coreografie: quelle ottimizzate del passo B2 (`docs/b17/ottimizzazione.md`), con il rovescio a due mani e il
> piatto rifatti qui per la camera frontale. Decisioni dell'utente del 09/11 sera: (1) scelta B (forma del video, polso e tempi
> cercati con il rilevatore vero nel costo); (2) presa e partenza misurate nel video. Il riconoscimento NON è stato toccato.
> Tutte le letture qui sotto sono del **telefono simulato** (test), non di un telefono vero.

## 1. Che cosa è cambiato
- **Camera** (`CAMERAS_VIDEO` in `natpf_gesture_pose.js`): tutte le schede della presa a racchetta (insieme del video) hanno la
  camera **frontale a tre quarti, specchiata** (chi guarda vede il proprio braccio destro a destra, come allo specchio; il
  mancino vede lo specchio dell'immagine del destro, cioè di nuovo il proprio braccio dalla sua parte). Servizio e schiacciata:
  **profilo a tre quarti** dal lato del braccio, specchiato. Anche «Posizione di partenza» (prima da dietro) e «Presa»
  (`mirrorBy.racchetta`, etichetta «Come allo specchio» al posto di «Dallo schermo di gioco»). Le camere da dietro del B14
  restano per la presa nel palmo (rollback).
- **Gesto intero nel quadro** (`whole`, `wholeFrame`, `wholeBox` in `natpf_gesture_demo.js`): da 640×400 in su (modale, ledwall)
  la camera è **ferma** e contiene tutto il ciclo (telefono, mano, gomito, mano libera) con la testa, le spalle e la vita: si
  vede la persona intera dalla testa alle cosce come nel video (nella bozza del WIP la camera seguiva la mano a 0,55 m e
  tagliava busto e testa). La freccia del verso copre l'intera parte veloce e, dove c'è il proseguimento lento (tagliati, rovescio a due mani), arriva
  alla fine vera: la discesa del tagliato verso l'anca opposta si vede nella freccia. A **448×280** (metà dello stesso schermo) e nella
  **compatta** la camera segue la mano come nel B14 (con il gesto intero il telefono scenderebbe a ~40 px, sotto i 60 del B9),
  con una freccia corta attorno al contatto (`follow.arrow`), la media della mano più corta (0,1 s) per dritto, incrociato e
  lungolinea, e lo schermo che può scendere quando la mano sale fuori dal quadro all'impatto (servizio, incrociato).
- **Rovescio a due mani e piatto riottimizzati** con la camera frontale nel costo (`ottimizza.mjs --camdir=…`, margini nuovi
  `--edgeMin`/`--foreMin` perché la prospettiva della camera vera toglie qualche grado alla sola direzione): con le coreografie del
  B2 nessuna camera frontale teneva il telefono non di taglio (rovescio: schermo verso il basso all'impatto, 18°; piatto: 22°
  alla carica). Letture nel costo 48/48; forma del video invariata o migliore (§3).
- **Figura**: collo in pelle (prima un lungo colletto bianco); il resto (busto, testa, gambe e braccio libero chiari con il
  contorno, seconda mano sul telefono nel rovescio, mano sinistra che lancia nel servizio, fantasmi della carica e della fine,
  scia, fase scritta, tempo reale e ×0,5) era già nel WIP 8d64ac8 e nel passo B2 ed è stato tenuto. Scritta «Pronto» dello
  schermo del telefono più grande (quasi tutta la larghezza). Etichette dei fantasmi del tutto spente: non occupano più posto.
- **Prove**: `natpf-gesti-video-confronto.mjs` (fogli VC a 640×400, colonna 3 = il tutorial di PRIMA del B17: presa nel palmo,
  coreografie B13/B14, camera da dietro; ≤ 400 KB); `natpf-gesti-fotogrammi.mjs` sceglie la freccia disegnata a quella misura;
  la tabella dei limiti dichiarati è vuota (il 26 % del dritto a 200×200 del passo B non c'è più: 33 %).

| Scheda | Direzione della camera (azimut dal davanti, elevazione) | Note |
|---|---|---|
| Dritto, incrociato, lungolinea | −30°, −22,5° (dalla sinistra di chi gioca, dal basso) | dal basso come il video (telefono appoggiato); più in alto mano+telefono all'impatto scendeva al 22–24 % |
| Rovescio a due mani | +45°, −10° | riottimizzato con questa camera |
| Tagliato di dritto | −4°, −2° | quasi di fronte |
| Tagliato di rovescio | +30°, +15° | |
| Piatto | +22,5°, +10° | riottimizzato |
| Pallonetto | +52,5°, −5° | |
| Palla corta | 0°, +5° | di fronte |
| Volée | 0°, +15° | di fronte |
| Servizio | +67,5°, −10° (profilo a tre quarti) | dal basso: con la camera alta la palla lasciata era di taglio (2°) |
| Schiacciata | +60°, 0° (profilo a tre quarti) | |
| Posizione | −15°, +5° | dalla testa alle anche |

Direzioni scelte con una ricerca su griglia con la camera VERA (`cameraAt`, prospettiva compresa) sui vincoli del B9: telefono
non di taglio nelle pose chiave a 640×400, 448×280 e 200×200, avambraccio ≥ 28° dal raggio visivo in tutto il ciclo, telefono
≥ 60 px all'impatto a 448×280, la più frontale possibile (strumenti nello scratchpad `b17C/`: camsearch, edges, subj, arr).

## 2. Lista del B9 §5.6.2 (prova `natpf-gesti-fotogrammi`, destro e mancino, tutte le schede): 31/31
| Misura | 640×400 | 448×280 | 200×200 | 1600×1000 |
|---|---|---|---|---|
| Telefono non di taglio nelle pose chiave (≥ 25°) | sì | sì | sì | sì |
| Mano+telefono all'impatto (≥ 28 %) | minimo 30 % (incrociato) | 45 % | 33 % | **28 %** (incrociato, al limite) |
| Telefono all'impatto | minimo 35 px (rovescio) | minimo 62 px (≥ 60) | 44 px | 88 px |
| Colpo nel quadro (cima e palla fuori ≤ 100 ms, freccia ≤ 10 %) | sì (schiacciata: palla 100 ms) | sì | sì (schiacciata freccia 6 %) | sì |
| Etichette dentro lo stadio, fuori dal soggetto; testi ≥ 12 px | sì | sì | sì | sì |
| Costo del disegno a 640×400 (densità 1, Chromium senza GPU) | media 1,43 ms, con la rasterizzazione 2,71 ms (≤ 4) | | | |

Il **gesto intero** e il **28 %** tirano in versi opposti: con la camera all'altezza del petto il dritto (arco di ~0,75 m in
altezza, braccio all'impatto ~0,2 m) dava il 22–24 %. La camera più bassa (−22,5°, come un telefono appoggiato davanti, che è
anche il punto di vista del video) e il riquadro un poco più alto lo portano al 28–30 %. Il telefono a 640×400 è lungo 35–60 px:
lo schermo si riconosce (vetro blu, anello verde), la scritta «Pronto» no; si legge nella scheda «Presa» e a 1600×1000.

## 3. Quanto il gesto si allontana dal video (misure con `ottimizza.mjs --report`, coreografie del codice)
Polso e gomito: distanza nel campo dalla posa ricostruita dal video (al netto dello spostamento del bacino); cima e schermo:
angolo tra gli assi del telefono e quelli ricostruiti dal video (ricostruzione a bassa confidenza, errore d'asse 37,7°: il
dato sul telefono è indicativo). Traiettoria: distanza media e massima della mano a tempo normalizzato.

| Colpo | Traiettoria della mano (media / max) | Carica: polso (Δ altezza) · cima · schermo | Impatto | Fine | Tempi carica→impatto, impatto→fine (video) |
|---|---|---|---|---|---|
| Dritto | 7,2 / 21 cm | 1,6 cm (+1,2) · 13° · 7° | 1,3 cm (+0,8) · 8° · 5° | 3,4 cm (−1,9) · 16° · 44° | 0,30 s (0,50), 0,16 s (0,17) |
| Rovescio a due mani (nuovo) | 7 / 14 cm | 0,4 cm (+0,2) · 65° · 66° | 6,9 cm (−0,6) · 82° · 71° | 3,6 cm (+0,4) · 57° · 13° | 0,24 s (0,17), 0,67 s (0,20) |
| Rovescio del passo B2 (prima) | 7 / 15,9 cm | 2,7 cm · 83° · 86° | 7,6 cm · 64° · 48° | 5,2 cm · 49° · 19° | 0,22 s, 0,66 s |
| Tagliato di dritto | 6 / 10,3 cm | 10,3 cm (−6,4) · 43° · 15° | 1,9 cm (+1,5) · 39° · 19° | 5,1 cm (−2,7) · 24° · 25° | 0,23 s (0,23), 0,94 s (0,23) |
| Tagliato di rovescio | 12,9 / 20,1 cm | 10,8 cm (−8,8) · 82° · 92° | 12 cm (+1,5) · 52° · 45° | 8,6 cm (+1,4) · 122° · 68° | 0,12 s (0,27), 0,46 s (0,17) |
| Servizio | 9,3 / 18,5 cm | 1,5 cm · 45° · 58° (alto: 2,5 cm) | 12,5 cm (−5,6) · 15° · 66° | 11,5 cm (+9,9) · 58° · 123° | salita 0,40 s (0,27), battuta 0,58 s (0,43), 0,17 s (0,30) |
| Incrociato / lungolinea | 8 / 20,2 · 7,4 / 22,2 cm | ≤ 1,6 cm | 3,6 · 0,9 cm | 4,3 · 3,6 cm | come il dritto |

Il piatto non ha un riferimento nel video: rispetto alla coreografia di prima (riferimento del B2) la mano si sposta di 2,1 cm
in media (6,5 al più); prima della ripresa era 4,1 / 7,6 cm. Letture di tutte le schede nel costo: 48/48 (semi 7, 1, 5, 10 ×
due calibrazioni × due mani × 0,8/1/1,25×); la suite del gioco (che legge i semi 2, 3, 11 non visti dall'ottimizzatore) è verde.

**Il rovescio a due mani all'impatto non tiene l'orientamento del telefono del video**: la mano è a 6,9 cm dal video, ma lo
schermo è a 71° da quello ricostruito (prima 48°) e la cima a 82°: per essere letto come rovescio e non essere di taglio per la
camera frontale l'ottimizzatore gira il polso. Nel disegno lo schermo si vede all'impatto (45° dal raggio visivo).

## 4. Confronto con il video (fogli `docs/b17/img/VC-*.webp`, guardati)
Tre colonne: fotogramma del video specchiato (540×960 ritagliato), animazione nuova a 640×400, tutorial di prima allo stesso
istante del colpo (10 istanti per colpo). Prova 24/24: polso dell'animazione alle pose chiave entro 0,12 m dal video (servizio
0,13 m, limite già dichiarato nel B2: 0,12 all'impatto e 0,11 alla fine), «Impatto» scritto all'istante dell'impatto, telefono
non di taglio (dritto 64°/47°/32°, rovescio 65°/45°/51°, servizio 63°/43°, tagliato 79°/40°/75°, tagliato di rovescio
33°/43°/59°). Giudizio guardando i fogli:
- **Dritto**: la figura intera di tre quarti dal basso come nel video; carica con il braccio disteso di lato, arco verso il viso,
  fine con il telefono in alto. Il video mostra la fine davanti al viso, l'animazione un poco a destra del viso: la posizione
  del polso è quella ricostruita (Δ 3 cm), la differenza è la vista di tre quarti (−30°) rispetto al video di fronte.
- **Rovescio**: due mani sul telefono dall'anca sinistra fino alla fine sopra la testa, vista da destra a tre quarti; il busto si
  legge di profilo. All'impatto il telefono è inclinato (vedi §3), non verticale come nel video.
- **Servizio**: profilo; la sinistra lancia, il telefono sale sopra la testa, battuta in avanti e discesa. Nel video il telefono
  sale insieme al lancio; nell'animazione resta all'anca durante il lancio (coreografia del B2).
- **Tagliato di dritto e di rovescio**: di fronte, mano alta alla spalla e discesa in diagonale verso l'anca opposta, come il video;
  il proseguimento dopo l'impatto è lento (0,94 e 0,46 s contro 0,23 e 0,17: limite del B2).
- **Tutorial di prima** (colonna 3): camera da dietro, presa nel palmo, figura tagliata: la differenza con il video è evidente.

Fogli dei fotogrammi del B9 nelle quattro misure: `docs/b17/img/C-anim-*.webp` (640×400 completi; 448×280, 200×200 e
1600×1000 i colpi principali). Guardati: 640×400 fogli 1 (finale), 2 e 3, 448×280 foglio 2, 1600×1000 foglio 1 (questi ultimi
prima della camera più bassa del dritto e della freccia lunga del tagliato; le misure numeriche sono quelle finali); 200×200 solo
nelle misure.

## 5. Altre prove (tutte verdi)
- Gioco `npm test` 984/984, sito 200/200, `npm run build` ok.
- `natpf-gesti-fotogrammi` 31/31; `natpf-gesti-sequenze` 91/91 (640×400, 448×280, 200×200, 1600×1000, destro e mancino).
- `natpf-modale-gesti` 18/18: 60,2 fps a 1280×720 e a 1920×1080 sopra l'arena ferma (Chromium senza GPU), disegno 1,2 ms;
  due animazioni insieme 60,2 fps. In una delle tre esecuzioni la voce «modale sopra il campo che gioca» è uscita rossa (2,1 fps
  con la modale contro 2,5 del campo da solo, 84 % contro 85 %): il campo 3D senza GPU gira a 2 fps e la misura oscilla; rifatta
  da sola 18/18 (2,6 contro 2,6). Non dipende dal disegno dei gesti (1,2 ms), ma va detto.
- `natpf-tutorial-phone` 52/52, `natpf-training-flow` 22/22.

## 6. Non verificato / limiti
- Nessuna prova con un telefono vero né con l'utente: rovescio e piatto nuovi sono letti giusti dal telefono simulato.
- Mano+telefono a 1600×1000 al 28 % esatto (incrociato): nessun margine.
- Tempi della parte veloce del dritto 0,30 s (video 0,50 tra carica e impatto: la carica del video è più lenta, la parte veloce
  ottimizzata è più corta come chiesto, ~0,2–0,3 s); proseguimenti lenti di tagliati e rovescio (B2).
- Scritta dello schermo leggibile solo a telefono grande (scheda «Presa», 1600×1000).
- Scheda «Presa»: la presa è quella del video (`PHONE_IN_HAND_VIDEO`) nella posa delle foto (B2); ora vista come allo specchio.
  La foto dell'utente da davanti è quella del B2 (giudicata coerente lì), non riesaminata in questo passo.
- I fogli VC si guardano su 10 istanti: scatti tra un istante e l'altro sono controllati solo dalla prova delle sequenze.

## 7. Passo C2 (10/11/2026): rovescio a una mano e faccia che colpisce, nel disegno
Richieste dell'utente del 09/11 notte sulle anteprime VC-*: (1) «Per il rovescio, a una mano»; (2) «con il dritto la pallina venga
colpita con il display in maniera frontale»; (3) «il rovescio invece stesso movimento ma con l'altro lato». Le coreografie sono
quelle del passo B3 (`docs/b17/ottimizzazione.md` §9: faccia che colpisce entro 17° dalla rete, incrociato 21,1°); qui cambia
solo il disegno (`natpf_gesture_demo.js`, costanti del braccio libero in `natpf_gesture_pose.js`). Riconoscimento non toccato.

### 7.1 Che cosa vede la camera principale all'impatto (misura, 640×400, destro = mancino)
| Scheda | Faccia che colpisce | Angolo tra la faccia e il raggio verso la camera | Telefono all'impatto | Palla |
|---|---|---|---|---|
| Dritto / piatto / volée | schermo | 28° / 26° / 26° | 42 / 43 / 48 px | davanti al vetro |
| Incrociato / lungolinea | schermo | 24° / 43° | 44 / 36 px | davanti al vetro |
| Tagliato di dritto | schermo | 10° | 51 px | davanti al vetro |
| Rovescio | dorso | 53° | 34 px | davanti al dorso |
| Tagliato di rovescio | dorso | 49° | 43 px | davanti al dorso |

Le camere frontali del passo C stanno dalla parte della rete: all'impatto vedono proprio la faccia che colpisce (sotto 90° in
tutti i colpi), quindi la vista principale è già quella giusta. Ma a 640×400 il telefono è lungo 34–51 px e la palla (6,6 cm,
quasi la larghezza del telefono, 7,9 cm), che arriva dalla camera, ne copre metà: schermo e dorso non si distinguono (fotogrammi
nello scratchpad `b17C2/a.png`). Girare la camera principale non serve (la faccia è già verso la camera) e ingrandire il telefono
toglie il gesto intero. **Decisione: primo piano dell'impatto** in un riquadro.

### 7.2 Primo piano dell'impatto (`IMPACT_CLOSE`)
- Da 640×400 in su (camera ferma sul gesto intero), nei colpi con la faccia d'impatto (dritto, piatto, incrociato, lungolinea,
  tagliato, volée: «Palla sullo SCHERMO»; rovescio e tagliato di rovescio: «Palla sul DORSO»). A 448×280 e 200×200 nessun
  riquadro: lì la camera segue la mano e il telefono all'impatto è lungo 47–99 px.
- Compare 40 ms prima del contatto (pieno 10 ms prima) e resta fino a 1 s del gesto dopo il contatto (2 s nel rallentato ×0,5),
  poi si spegne in 0,15 s. È il fermo immagine dell'impatto: la mano con il telefono e la palla appoggiata sulla faccia che
  colpisce, il lampo, la scritta in giallo.
- Camera del primo piano (**superata dal §8.2**: ora 12° di lato e 16° dalla cima per lo schermo, 38° di lato e 30° per il dorso; qui il giro del 10/11 mattina): dalla parte della palla, 45° di lato verso la camera principale e 10° verso il fondo per lo schermo;
  per il dorso 50° di lato e 30° verso la cima (il palmo sta sul dorso: dal fondo la mano copriva il dorso; provati 35°/20°,
  10°/45°, 0°/65°). Faccia che colpisce a 45° (schermo) e 54–55° (dorso) dal raggio del primo piano. Palla velata (0,6) con il
  contorno pieno: sotto si leggono il vetro con «Pronto» o il dorso con le fotocamere. Specchiata come la camera principale
  (il mancino vede lo specchio, riquadro nell'angolo speculare: test).
- Posto: uno dei quattro angoli dello stadio sopra la banda della curva, scelto una volta per scheda, mano e misura: mai sopra
  telefono, mano e palla vivi attorno al contatto (prova esatta sulle sagome, `liveHits`), poi il meno possibile sopra il
  soggetto e il braccio libero fino alla fine del riquadro, poi testa e busto. Le etichette dei fantasmi lo evitano.
- Costo: il riquadro si disegna una volta per scheda (canvas a parte, al primo fotogramma della scheda: 5–9 ms una volta, a
  640×400 e a 1600×1000, contro ~1 ms di un fotogramma normale) e poi si copia; disegno a 640×400 su tutte le schede media
  1,16 ms per fotogramma, con la rasterizzazione 2,36 ms (≤ 4); nelle esecuzioni intermedie 1,26–1,41 / 2,55–2,77 ms (la misura
  oscilla di ~0,2 ms tra un'esecuzione e l'altra). `natpf-modale-gesti` 18/18: 59,9 fps a 1280×720 e 60,2 fps a 1920×1080
  sopra l'arena ferma (Chromium senza GPU, disegno 1,2–1,3 ms), due animazioni insieme 57,7 fps.

### 7.3 Rovescio a una mano: il braccio libero
Nel passo B3 la mano libera non toccava più il telefono, ma con la camera davanti a destra (busto quasi di profilo) l'equilibrio
non si vedeva: la mano aperta «dietro e di lato» (−0,42; 0,18; 0,30) restava dietro il busto, e nella carica (−0,24; 0; 0,08)
era una mano sull'anca con il gomito in fuori. Ora: `FREE_BALANCE` (−0,34; 0,16; 0,50) dal bacino nel riferimento del busto,
braccio disteso dietro e un poco in basso, «ad ali» come nei rovesci a una mano (si vede uscire dietro la schiena dal contatto
alla fine: test, mano fuori dalla sagoma del busto in ≥ 80 % dei campioni dell'accompagnamento); `FREE_PREP` (−0,26; −0,04;
−0,10) rilassata davanti al fianco, a ≥ 0,3 m dal telefono. Solo disegno.

### 7.4 Prove (passo C2)
- `natpf-gesti-fotogrammi` 31/31 (ultima esecuzione con i fogli): lista del B9 come nel passo B3 (limiti dichiarati di allora invariati: rovescio 20 % a
  640×400 e 19 % a 1600×1000, dritto, lungolinea, volée, tagliato di rovescio 27 % a 1600×1000) più il primo piano: presente
  all'impatto con la scritta giusta, mai sopra telefono, mano, palla o etichette, dentro lo stadio.
- Test del gioco nuovi: «primo piano dell'impatto…» (16 casi: scritta, angoli, posto, tempi, specchio, assente a 448×280 e
  nei colpi senza faccia d'impatto) e il braccio libero in vista.
- Fogli `VC-*.webp` (640×400: video specchiato | animazione | tutorial di prima) e `O-*.webp` rifatti; `C-anim-*.webp` nelle
  quattro misure rifatti. Prove: confronto VC 29/29 (nuova: primo piano con la scritta giusta all'impatto, assente nel
  servizio), O 28/28, `natpf-gesti-sequenze` 91/91 (quattro misure, destro e mancino), `natpf-tutorial-phone` 52/52,
  `natpf-training-flow` 22/22, `natpf-split-ready` 34/34. Guardati: VC di dritto, rovescio, tagliato e tagliato di rovescio
  (righe colpo, impatto, accompagnamento), C-anim 640×400 fogli 1 e 2, 1600×1000 foglio 1; non guardati uno per uno i fogli
  delle sequenze (solo le misure) né i C-anim 448×280 e 200×200 (lì il disegno non cambia: niente riquadro).

### 7.5 Limiti e cose da chiedere
- **Il riquadro copre parte della figura** dove nessun angolo è libero: piatto (busto, in basso a sinistra, per circa 1 s dopo
  il contatto) e tagliato (spalla e inizio della freccia, in alto a sinistra). Mai telefono, mano o palla all'impatto. Posti
  (destro; il mancino lo specchio): dritto, incrociato, lungolinea, volée in basso a destra; rovescio e tagliato di rovescio in
  basso a sinistra a 640×400 (rovescio in basso a destra a 1600×1000); piatto in basso a sinistra; tagliato in alto a sinistra.
- La palla copre comunque una parte della faccia (è larga quasi come il telefono): per questo è velata nel riquadro.
- Nel rovescio il dorso nel riquadro è in parte coperto dalla mano (presa a racchetta: il palmo sul dorso); si vedono il
  bordo con le fotocamere e la palla sul dorso.
- La camera principale del dritto, dell'incrociato e del lungolinea è dal basso (elevazione −22,5°): all'impatto l'occhio della
  camera è a −0,13 m (dritto) dal pavimento, cioè sotto il piano del campo. Nel disegno non c'è il piano (solo l'alone), quindi
  non si vede, ma è una camera impossibile per un telefono appoggiato; non toccata in questo passo (cambia la misura del 28 %:
  `STATO-C.md`).
- Niente telefono vero né utente: da far vedere all'utente il riquadro (posto, durata, scritta).

## 8. Correzioni dalle revisioni del passo C2 (10/11/2026)
Due revisioni (artistica e tecnica) hanno trovato quattro bloccanti e alcuni minori. Riprodotti con gli script dei revisori prima di
correggere. Il riconoscimento non è stato toccato (`git diff` senza nessuna riga su `swing-detect.js`, `gesture-intent.js`,
`natpf_gestures.js`, `natpf_stroke_intent.js`).

### 8.1 Servizio e schiacciata con lo schermo, come il dritto (bloccante 1)
Misura sulla posa vera al contatto (destro = mancino): dritto, incrociato, lungolinea, piatto, tagliato, volée **schermo** a 12–17° dalla
rete, rovescio e tagliato di rovescio **dorso** a 16°; ma la **schiacciata** colpiva col **dorso** (schermo a 113° dalla rete) e il
**servizio** con lo schermo di taglio (88°: la palla stava sul vetro per 0,04 di coseno), e nessuno dei due aveva il primo piano.
L'utente vedeva il dritto, il servizio e la schiacciata (tutti colpi «sopra la testa o di dritto») colpire con facce diverse.
- `IMPACT_FACE` ora copre **tutte** le schede e le pose in più che colpiscono una palla (test: le chiavi di `IMPACT_FACE` sono
  esattamente le pose non ferme di `POSE_IDS`, così una scheda nuova non si dimentica): servizio e schiacciata **+1 (schermo)**.
- **Servizio** e **schiacciata** riottimizzati con `ottimizza.mjs --impact=20` e tre vincoli nuovi (`--wristMin`, `--peakMax`,
  `--endMaxX`, §ottimizzazione 9.8): schermo a **14,5°** (servizio) e **9,3°** (schiacciata) dalla rete, letti giusti. Il servizio
  ora è più vicino al video (impatto a **5,2 cm**, prima 12,5; fine a 16,2 cm; polso a 1,66 m contro 1,70 nel video; picco 861 °/s,
  prima 909); la schiacciata ha il picco a 950 °/s (prima 707; senza `--peakMax` arrivava a 1 327 e il mancino non leggeva la
  stessa forza) e il polso a 1,85 m.
- **Primo piano** «Palla sullo SCHERMO» anche per servizio e schiacciata (da 640×400 in su).
- **Pallonetto e palla corta** colpiscono col **DORSO** (a 32,4° e 28,9° dalla rete): sono colpi dal lato del dritto che aprono la
  faccia verso l'alto (la palla parte a ~48° e ~39° sopra l'orizzonte), con «schermo = dritto» possono sembrare incoerenti. Non li
  ho girati senza chiedere: sono in `IMPACT_FACE` con **−1** (primo piano «Palla sul DORSO», limiti 33° e 30° scritti nel test), così
  l'utente li vede dichiarati. **Domanda aperta per l'utente**: girarli con lo schermo verso la palla in uscita (la faccia aperta
  verso l'alto di ~45°: l'angolo dalla rete non è la misura giusta per questi due, serve un'ottimizzazione con la direzione di uscita
  della palla)? Oggi non cambia nulla nel gioco, solo il disegno.

### 8.2 Primo piano: la palla sul display (bloccante 2)
Il primo piano dello schermo era a 45° di lato e 10° dal fondo (45° dalla normale): il centro della palla (5,8 cm dal centro del
telefono verso la cima e 3,8 cm davanti al vetro) si proiettava a (−3,5; 6,9) cm, sul bordo del vetro e oltre la cima: si leggeva «palla
accanto al telefono, in alto». Ora **12° di lato e 16° dalla cima** (20° dalla normale: «frontale»): il centro cade a (±0,7; 5,0) cm, dentro
il vetro. Per il dorso 38° di lato e 30° (prima 50°): centro a (∓2,7; 3,6) cm, dentro il profilo (prima (−4; 3,1), sul bordo).
`info.close.ballOn` (nuovo) dà il punto e `inside`; test: per **ogni** scheda con faccia che colpisce il centro della palla sta ≥ 0,9 cm
dentro il bordo laterale e ≥ 1 cm dalla cima, lo schermo è visto entro 22° dalla normale, il dorso entro 50°. Quadro ridotto
(`w` 0,30 → 0,27) per coprire meno la figura nel piatto e nel tagliato.

### 8.3 Letture con la calibrazione del braccio simulato (bloccante 3): limite dichiarato, DECISIONE DELL'UTENTE
Rifatto sui semi 1–60 (prima 1–23): con la calibrazione del braccio simulato (telefono tenuto come nella posa di partenza, schermo di
lato) il **piatto** è letto top spin (le 40 su 120 «giuste» per terzo sono quelle a 0,8×, dove il top spin è ammesso), l'**incrociato** è
letto **rovescio** 0/360 e il **lungolinea** 0/360 (mira al centro). Il motivo è misurato (due centri della mira a 83,6°, §9.4 di
`ottimizzazione.md`) e non è eluso: non l'ho aggirato né integrato in silenzio. Per chi calibra tenendo lo schermo di lato e poi fa i
colpi con lo schermo verso la rete la scheda insegnata non corrisponde a ciò che il gioco legge. Nel gioco la calibrazione si fa con il
dritto e il rovescio del tutorial (calibrazione «con l'animazione»): lì tutte le 4 320 letture (60 semi × 12 schede × 2 mani × 3 velocità) sono giuste.
**Da decidere con l'utente, con una prova su un telefono vero**: accettare il limite (oggi), oppure riottimizzare dritto, incrociato e
lungolinea con la calibrazione del braccio nel costo e lo schermo verso la rete entro 20° (non fatto: cambia il dritto e tutto ciò che
dipende dalla sua calibrazione). Nel codice il limite vale in **un solo punto** (`test/gesture-semi.mjs`: `DECLARED`, `judgeOne`,
`DECLARED_EXPECT`): quelle letture si fanno comunque, si giudicano e si contano; ogni test confronta il numero esatto di letture giuste e
che cosa viene letto, per scheda (nessun `continue`), nei tre file dei semi, in `natpf-gesture-pose` (due test) e in `natpf-gesture-anim`.

### 8.4 Il piatto a 1× non era robusto (bloccante 4)
Con la calibrazione con l'animazione, a 1×, semi 1–60 (120 letture del piatto): 2 errori, **seme 35 (mancino) e seme 38 (destro)**, «top spin
atteso piatto» (la finestra della salita, ±0,12, era al limite), sfuggiti ai test sui semi 1–23. Riottimizzato il piatto (`--seeds=7,1,5,10,35,38,22,44
--cals=pose`, partendo dalla soluzione di prima, 0 errori su 48×8 letture). Ora i tre file dei semi leggono **tutti i semi 1–60**: 7 560 letture
fuori dai limiti dichiarati su 7 560 giuste (0 errori), contro 2 898 su 2 898 del giro di prima solo sui semi 1–23.

### 8.5 Minori corretti
- Etichetta «1 Lancio» del servizio: si spegne dal contatto in poi (stava sul lampo e sulla fine della scia).
- «Carica» solo dal primo moto: la fase scritta resta «Pronto» finché la mano non si è staccata di 5 cm dalla posa di partenza
  (`PREP_MOVE`), prima diceva CARICA già dal fermo iniziale (0,9–1,5 s). Cambiano solo i tempi delle fasi, non i movimenti.
- Scheda «Posizione» (640×400): la camera guarda a tre quarti da destra (prima di fronte, telefono di taglio largo 3–4 px accanto alla
  coscia): ora il dorso con le fotocamere si vede. La posa di partenza (`REST_VIDEO`) non cambia.
- Testo del tagliato di rovescio: «La mano finisce bassa, davanti a te» (la fine specchiata è davanti alla pancia, non a destra).

### 8.6 Non cambiato (con il motivo)
- **A 448×280 e 200×200 la camera segue la mano**: si vedono avambraccio, mano e telefono, non la figura intera, quindi la «carica larga a
  destra, braccio disteso, fine alta davanti al viso» del dritto non si legge a metà schermo (dritto 448, t = 1,38–3,69 s). È una scelta
  dichiarata (telefono ≥ 60 px); dove l'utente gioca a metà schermo vede una forma diversa da quella del video. Non aggiunta una figura
  piccola in un angolo.
- Rovescio e dritto non finiscono allo stesso modo (gomito 101° nel dritto, 172° nel rovescio; carica più breve e veloce, 0,174 s contro
  0,296 s dalla parte veloce al contatto): lo specchio c'è come posizione del polso (14 cm in media), non come forma del braccio né nel tempo.
- La fine del servizio resta all'altezza del petto (video: anca opposta); il dritto colpisce 12,6 cm sopra il video.
- Lo strumento di confronto video-animazione (fogli VC) ancora la riga «carica» a `T.inv`, che nel tagliato cade con la mano ancora ferma
  accanto all'anca: la riga «carica» dei fogli VC va letta con questa riserva; l'ancora andrebbe spostata alla posa chiave della carica
  (t = 2,55 s tagliato, 2,46 s tagliato di rovescio). Non toccato.
- Il primo piano copre ancora un poco la figura (piatto: anca e mano libera; tagliato: spalla sinistra) per circa 1 s.

### 8.7 Prove (10/11, dopo le correzioni)
Gioco `npm test` 991/991 (semi 1–60 in tre file, ~2 min 40 s con il carico), sito 200/200, build ok. Prove nel browser (Chromium senza GPU, porte
3971–3976, PEER 9971): `natpf-gesti-fotogrammi` 31/31 (la camera del piatto è ora quella del dritto: con la nuova coreografia la freccia a 448×280
usciva dal quadro al 15 %, ora 0 %; disegno a 640×400 densità 1 media ~2 ms, con la rasterizzazione 3,9 ms: la misura oscilla con il carico),
`natpf-modale-gesti` 18/18, `natpf-tutorial-phone` 52/52, confronto `VC` 29/29 e `O` 29/29 (limite del servizio ora 0,17 m: fine a 0,16 m, impatto a
0,05 m), `natpf-gesti-sequenze` 91/91. Fogli `docs/b17/img/C-anim-*`, `VC-*`, `O-*` rifatti; guardati C-anim 640×400 foglio 3 (servizio con il
primo piano «Palla sullo SCHERMO»), e le immagini del primo piano di dritto, piatto, tagliato, volée, incrociato, lungolinea, rovescio,
tagliato di rovescio, pallonetto, palla corta, schiacciata e servizio a 640×400. **Non verificato**: telefono vero, utente, Windows; 200×200 e
448×280 non riguardati uno per uno (solo misure); i fogli VC/O di servizio non guardati riga per riga.

