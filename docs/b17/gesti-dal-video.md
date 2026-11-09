# B17.1 · passo C · Il disegno dei gesti come il video: camera frontale specchiata, gesto intero, figura chiara

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
