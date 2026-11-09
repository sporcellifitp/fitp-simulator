# B17.1 · passo B2 · Coreografie ottimizzate con il rilevatore nel costo, presa e partenza dal video

> Stato (09/11/2026 sera, worktree B17.1). Decisioni dell'utente: (1) «ottimizza senza di me» = scelta B di
> `docs/b17/posa-dal-video.md` §4: tenere la FORMA del video e cercare polso e tempi con il rilevatore vero nel costo,
> misurando quanto il gesto si allontana dal video; (2) presa e partenza «come la mia impugnatura del video» = misurate nel
> video. File di ripresa: `docs/b17/STATO-B2.md`. **Tutto ciò che segue è misurato con il telefono simulato completo**
> (`test/pose-sensors.mjs` → `test/phone-sim.mjs`: rilevatore vero `swing-detect.js`, forma del colpo, calibrazione rapida,
> mappatura del gioco), **non con un telefono vero né con l'utente**. Il riconoscimento non è stato toccato.

## 1. Presa e partenza dal video
- **Presa** (`PHONE_IN_HAND_VIDEO` in `natpf_gesture_pose.js`, ora `PHONE_IN_HAND_RACCHETTA`): quella misurata nei colpi del
  video (`gesti-video.json` `metodo.presa`: modello «in piedi nel pugno» qaxis((1,1,0),180°) corretto di Euler XYZ (45°, 10°,
  65°) su 204 fotogrammi con schermo e mano visti; errore d'asse residuo **37,7°**, misura a bassa confidenza). Nel riferimento
  della mano: cima a 27° dalle dita (inclinata verso il palmo), schermo a 46° dalla normale del palmo, girato verso il mignolo.
  Rispetto alla lettura delle foto del passo B (`PHONE_IN_HAND_FOTO`, tenuta come alternativa) è soprattutto un rollio di 46°
  attorno all'asse lungo. Rigida nella mano in tutte le schede della racchetta (test `natpf-gesture-physics`).
- **Partenza** (`REST_VIDEO`): media degli angoli misurati nella posa ferma 9,4–9,7 s, polso compreso (pro 89°, fl −23,5°,
  dv −26,7°: prima il polso era preso dalla carica del dritto). Braccio che pende, mano all'anca destra (0,22; 0,95; −0,07 m),
  cima in avanti e in basso, schermo verso la coscia, pollice in avanti. È la partenza di tutte le schede della racchetta e
  della scheda «Posizione di partenza» (indicazioni nuove: «Braccio rilassato lungo il fianco, mano all'anca», «Telefono lungo
  l'avambraccio, cima in avanti e in basso», «Pollice in avanti, schermo verso la gamba»). **Eccezioni (limite dichiarato)**:
  palla corta e schiacciata partono dalla posa di oggi della racchetta (`REST_COLPI_RACCHETTA`, telefono davanti al petto):
  dalla partenza del video la loro carica era letta come un colpo in tutte le varianti provate (carica diretta fino a 3 s, con
  la posa di oggi come passaggio, abbassando prima l'omero: la schiacciata arrivava a 491 °/s a metà carica).
- **Scheda «Presa»** (`REST_RACCHETTA`): il primo piano del video (1–5 s: telefono in orizzontale davanti al petto, schermo
  verso la camera = lo schermo di gioco, cima verso la sinistra di chi gioca), con la presa misurata: mano a (0,05; 1,16;
  −0,30), schermo a 18° dalla direzione dello schermo di gioco. Viste: dallo schermo di gioco e da davanti a destra (di profilo
  il telefono era di taglio). **Incoerenza misurata, da chiarire con l'utente**: con questa presa e lo schermo verso lo schermo
  di gioco, il bordo del pollice del disegno (bordo +x del telefono) sta in basso; nel primo piano del video e nella foto
  «davanti» il pollice sta sopra e le dita sotto. Con il pollice in alto la presa misurata mette lo schermo verso sinistra e in
  basso (72–85° dallo schermo di gioco) o costringe il gomito di traverso a sinistra (spalla p 132°, r −99° al limite). Si è
  tenuto ciò che la scheda deve mostrare per prima cosa (lo schermo verso lo schermo di gioco); la foto resta. La misura della
  presa nei colpi ha 37,7° di errore: è il punto più debole del passo.

## 2. L'ottimizzatore (`natpf-tennis/scripts/video/ottimizza.mjs`, riusabile)
- **Variabili** per le schede dal video: alle pose chiave (dritto, rovescio, tagliati: carica B, impatto C, fine F; servizio:
  mano all'anca P, braccio in alto U, battuta C, fine F) il polso (pro, fl, dv: liberi nei limiti) e piccoli scarti di busto,
  piano ed elevazione della spalla, rotazione dell'omero e gomito (±12° ciascuno); i tempi: parte veloce 0,18–0,32 s, frenata
  0,12–0,35 s, carica 0,6–2,2 s, fermo finale 0,15–0,4 s (servizio: salita 0,2–0,4, fermo in alto 0,1–0,5, battuta 0,15–0,3).
  Partenza: la coreografia del video grezza (`CHOREO_VIDEO_GREZZA`: pose risolte sulle posizioni misurate) con il polso
  risolto perché cima e schermo siano quelli ricostruiti dal video con la presa misurata (`rawVideoChoreo`). Opzione
  `--mono` (tagliati e rovescio): ogni articolazione del braccio va nello stesso verso da B a C e da C a F (con le articolazioni
  che si fermano nell'impatto la velocità del telefono aveva due gobbe e il rilevatore leggeva la prima).
- **Costo** = 50 × errori di lettura + scarto dalla forma + 30 × vincoli fisici. Lettura: `judgeCard` su 12 combinazioni
  (calibrazione del braccio simulato e con il dritto e il rovescio dell'animazione, destro e mancino, 0,8× / 1× / 1,25×: un
  colpo solo, tipo e lato giusti, picco = contatto ± 1 campione; a 1× ± ¼ di campione; servizio: lancio + battuta), più una
  parte continua (distanza del picco). Forma: mano alle pose chiave contro il video (impatto pesato di più), gomito, traiettoria
  della mano a tempo normalizzato, cima e schermo del telefono (peso basso: misura a bassa confidenza), istante della posa C
  contro il picco letto. Fisica (B13): limiti articolari, velocità ≤ 1 900 °/s e accelerazioni ≤ 38 000 °/s² delle articolazioni,
  collisioni di avambraccio, gomito, dita e telefono con busto e testa, una sola frenata dopo l'impatto, sequenza
  prossimo-distale, carica ≤ 140 °/s, una sola valle della velocità prima del colpo, telefono ≤ 1 800 °/s, mano ≤ 0,14 m tra due
  campioni a 60 Hz, picco della battuta più alto della salita del servizio, telefono non di taglio nelle pose chiave per la
  camera della scheda.
- **Ricerca**: strategia evolutiva (1+λ), λ = 8, passo per variabile con la regola del successo e ripartenze del passo (le
  letture sono a gradini: Nelder–Mead puro si fermava sui pianori). 80–400 ms per valutazione; 1 500–4 000 valutazioni per
  scheda, più semi in parallelo (`nohup`, log in scratchpad). Ordine: dritto (con il rovescio grezzo) → rovescio (con quel
  dritto) → dritto di nuovo → tagliati, servizio, poi le schede che il video non mostra (`LEGACY_IDS`, forma = CHOREO di oggi),
  incrociato e lungolinea (`aim`: busto, omero, pronazione e flessione aggiunti al dritto), tutti con la calibrazione dei due
  finali. `--emit=DIR` scrive `CHOREO_VIDEO` e `AIM_TURN_VIDEO` con `tC` risolto.
- Schede che il video non mostra (piatto, pallonetto, palla corta, schiacciata, volée): con la presa del video e la sua
  partenza le coreografie di oggi erano lette sbagliate (piatto e schiacciata top spin, volée pallonetto, pallonetto palla
  corta; la carica dall'anca letta come un colpo); ottimizzate allo stesso modo tenendo la forma del B13/B14 (§4).

## 3. Letture (codice finale, `CHOREO_VIDEO`; tabella generata dal telefono simulato)
| Scheda | Letture giuste (2 calibrazioni × 2 mani × 3 velocità) | Colpo letto (destro, calibrazione del braccio / dell'animazione, 1×) | Picco letto − contatto (ms, 1×) |
|---|---|---|---|
| Dritto | 12/12 | topspin/forehand / topspin/forehand | -1,5 / -1,5 |
| Rovescio a due mani | 12/12 | topspin/backhand / topspin/backhand | -1,3 / -1,3 |
| Tagliato di dritto | 12/12 | slice/forehand / slice/forehand | -3,6 / -3,6 |
| Tagliato di rovescio (variante) | 12/12 | slice/backhand / slice/forehand | 0,3 / 0,2 |
| Servizio | 12/12 | 2 gesti / 2 gesti | -0,7 / -0,7 |
| Piatto | 12/12 | flat/forehand / flat/forehand | 4,0 / 4,0 |
| Pallonetto | 12/12 | lob/forehand / lob/backhand | 1,7 / 1,7 |
| Palla corta | 12/12 | drop/backhand / drop | 1,1 / 1,1 |
| Schiacciata | 12/12 | smash / smash/backhand | 1,4 / 1,4 |
| Volée | 12/12 | topspin/forehand / topspin/forehand | -1,7 / -1,8 |
| Incrociato | 12/12 | topspin/forehand mira -0.57 / topspin/forehand mira -0.46 | -1,6 / -1,5 |
| Lungolinea | 12/12 | topspin/forehand mira 0.57 / topspin/forehand mira 0.67 | -1,6 / -1,6 |

Totale: **144/144** letture giuste (12 schede × 2 calibrazioni × 2 mani × 3 velocità; a 0,8× e 1,25× ammessi solo i
cambiamenti nel verso della velocità del brief). La coreografia grezza del video **non** si legge (test «pose del video grezze»:
dritto letto dal lato del rovescio e in 2–3 colpi, tagliati palla corta, servizio 3 gesti; misure di `posa-dal-video.md` §3).

## 4. Quanto ci si è allontanati dal video (dritto, rovescio, tagliati, servizio)
Scarti misurati con lo stesso codice dell'ottimizzatore (`shapeOf`): mano (polso) e gomito della catena contro quelli
ricostruiti dal video al netto del bacino, alle pose chiave dell'animazione (carica = fine della carica, impatto = picco letto,
fine = fine dell'accompagnamento) contro quelle del video; traiettoria della mano a tempo normalizzato tra le pose chiave;
angoli tra cima e schermo del telefono e quelli ricostruiti dal video (**a bassa confidenza**: errore d'asse della presa 37,7°).

| Scheda | Mano alle pose chiave: scarto (cm) e altezza (cm) | Traiettoria della mano: media / massimo (cm) | Telefono alle pose chiave: cima / schermo (°) | Tempi animazione / video (s) | Gomito (°) |
|---|---|---|---|---|---|
| Dritto | carica 1,6 (Δy +1,2); impatto 1,3 (Δy +0,8); fine 3,4 (Δy -1,9) | 7,2 / 21,0 | carica 13/7; impatto 8/5; fine 16/44 | carica→impatto 0,30/0,50; impatto→fine 0,16/0,17 | carica 55; impatto 46; fine 81 |
| Rovescio a due mani | carica 1,1 (Δy -0,3); impatto 12,1 (Δy +2,2); fine 19,8 (Δy -12,2) | 9,3 / 19,8 | carica 91/91; impatto 54/40; fine 82/49 | carica→impatto 0,28/0,17; impatto→fine 0,11/0,20 | carica 16; impatto 95; fine 118 |
| Tagliato di dritto | carica 7,0 (Δy -6,4); impatto 1,3 (Δy +0,2); fine 26,0 (Δy +12,9) | 12,4 / 26,1 | carica 52/40; impatto 38/38; fine 70/25 | carica→impatto 0,25/0,23; impatto→fine 0,25/0,23 | carica 91; impatto 115; fine 117 |
| Tagliato di rovescio (variante) | carica 8,6 (Δy -7,1); impatto 12,7 (Δy +2,9); fine 9,4 (Δy +1,3) | 11,9 / 19,0 | carica 77/88; impatto 52/45; fine 125/74 | carica→impatto 0,12/0,27; impatto→fine 0,46/0,17 | carica 100; impatto 99; fine 65 |
| Servizio | carica 1,5 (Δy +0,7); alto 2,5 (Δy -0,1); impatto 12,5 (Δy -5,6); fine 11,5 (Δy +9,9) | 9,3 / 18,5 | carica 45/58; alto 11/46; impatto 15/66; fine 58/123 | carica→alto 0,40/0,27; alto→impatto 0,58/0,43; impatto→fine 0,17/0,30 | carica 95; alto 113; impatto 103; fine 102 |

Che cosa si è dovuto cambiare rispetto al video e perché:
- **Dritto**: forma praticamente quella del video (mano entro 1,3–3,4 cm alle pose chiave, gomito 46° all'impatto come la
  ricostruzione). La parte veloce dura **0,30 s** invece di 0,50 s del video (dimostrazione lenta: con 0,5 s il rilevatore
  spezzava il gesto o leggeva il picco 300–660 ms prima del contatto), la frenata quella del video (0,16 s), la carica dall'anca
  1,4 s. Il polso è cambiato (cima e schermo entro 8–16° dal video tranne lo schermo alla fine, 44°): ora il colpo è letto dal
  lato del dritto con le due calibrazioni. Picco del telefono 540 °/s. Limite superiore della parte veloce portato a 0,32 s
  (la soluzione trovata è 0,319 s).
- **Rovescio a due mani**: impatto 12 cm più a sinistra del video e fine 20 cm più bassa e meno a destra (1,40 m contro 1,52):
  per avere la velocità del telefono in una sola gobba le articolazioni vanno nello stesso verso dalla carica alla fine
  (`--mono`). Parte veloce 0,28 s contro 0,17 (il video qui è più veloce del gioco), frenata 0,11 s. La ricostruzione del
  rovescio a due mani non è attendibile (`STATO-dati.md` §2.5): valgono soprattutto le altezze e i tempi. Il busto gira di 83°
  nella parte veloce (774 °/s, più del telefono, 700): ammesso nel test della sequenza solo per questo rovescio (≤ 1,2 ×).
- **Tagliato di dritto**: carica e impatto come il video (7 e 1,3 cm), **fine 26 cm più alta e a destra** (la discesa è di
  15 cm invece dei 27 del video: con la fine più bassa e a sinistra le letture davano palla corta o due colpi; due ripartenze
  con il peso della fine raddoppiato restano a 23–24 cm). Parte veloce 0,19 s (video 0,23).
- **Tagliato di rovescio** (variante, non una scheda): impatto 13 cm più a destra, fine entro 9 cm; parte veloce 0,20 s ma il
  picco letto cade 0,12 s dopo la carica e la frenata è lunga (0,46 s contro 0,17): il gesto è più «colpo e accompagnamento
  lungo» che nel video. Picco del telefono 1 800 °/s (limite messo dall'ottimizzatore: la prima soluzione arrivava a 2 075).
- **Servizio**: carica all'anca e braccio in alto come il video (1,5 e 2,5 cm); **battuta 12,5 cm più bassa e avanti** (polso a
  1,65 m contro 1,70: sopra la spalla di 0,23 m, il test chiede 0,2 m per questo servizio invece dei 0,1 m sopra la testa del
  servizio di oggi) e fine 11,5 cm più alta. Salita 0,40 s (video 0,27), fermo in alto 0,28 s, battuta 0,30 s. La salita è il
  «lancio» che il telefono legge (la palla la lancia la mano libera, disegnata), la battuta arriva 0,76 s dopo (picchi: salita 837 °/s, battuta 909 °/s).

## 5. Schede che il video non mostra
| Scheda | Scarto della mano dalla coreografia di oggi (cm): carica; impatto; fine | Traiettoria media / massimo (cm) | Carica (s) | Partenza |
|---|---|---|---|---|
| Piatto | 7,7; 3,0; 4,6 | 5,1 / 7,7 | 1,66 (oggi 0,75) | REST_VIDEO |
| Pallonetto | 2,7; 0,7; 1,1 | 3,0 / 8,7 | 2,78 (oggi 0,95) | REST_VIDEO |
| Palla corta | 0,0; 0,0; 0,0 | 0,2 / 0,5 | 0,64 (oggi 0,72) | REST_COLPI_RACCHETTA |
| Schiacciata | 1,3; 2,1; 0,8 | 2,0 / 5,6 | 1,72 (oggi 1,15) | REST_COLPI_RACCHETTA |
| Volée | 8,8; 1,3; 1,9 | 3,3 / 8,8 | 0,89 (oggi 0,30) | REST_VIDEO |

Scarto della mano dalla coreografia di oggi della stessa scheda (dalla sua partenza): ≤ 8,8 cm, traiettoria media ≤ 5,1 cm. La
carica è più lunga perché parte dall'anca (pallonetto 2,8 s). Polsi cambiati per la presa del video.

## 6. Disegno e camere
- Camere delle schede dal video (`CAMERAS_VIDEO`) rifatte con una ricerca su griglia sui vincoli del disegno del B9 (telefono
  non di taglio ≥ 25° nelle pose chiave e allo stacco della palla del servizio, ≥ 60 px all'impatto a 448×280, avambraccio
  ≥ 28° dal raggio visivo): dritto, incrociato, lungolinea, tagliati e servizio frontali a tre quarti e **specchiati** (chi
  guarda vede il braccio dalla sua parte come nel video specchiato); il servizio dall'alto a destra (45°: è l'unica direzione in
  cui il telefono non è di taglio allo stacco della palla); il rovescio a due mani da dietro a sinistra e dall'alto (nessuna
  direzione frontale rispetta i vincoli). Piatto, pallonetto, schiacciata e volée: la camera di oggi girata (la carica dall'anca
  puntava l'avambraccio verso la camera).
- I test della camera del B14 (`natpf-gesture-camera`: «avanti» e «in alto» distinti, mano verso la rete sullo schermo)
  valgono per la camera da dietro delle coreografie di oggi e girano ora con la presa nel palmo.
- Fogli **`docs/b17/img/O-*.webp`** (fotogramma del video specchiato | posa ottimizzata, stessi istanti, mappati sulle pose
  chiave): `tools/e2e/natpf-gesti-video-confronto.mjs` con `PREFIX=O`, 24/24 verifiche (con i due scarti dichiarati: fine del
  tagliato di dritto 0,26 m, impatto del servizio 0,12–0,13 m). **Guardati** tutti e cinque: dritto molto vicino al video
  (anca → braccio disteso di lato → impatto davanti alto → fine davanti al viso); rovescio a due mani riconoscibile (mano libera
  sul telefono) con la fine più bassa; servizio con il telefono sopra la spalla e la discesa davanti fino all'anca sinistra, ma
  alla battuta il telefono è all'altezza della testa e non sopra; tagliato di dritto con la fine alta (si vede poco la discesa
  lunga del video); tagliato di rovescio con la fine bassa a destra come il video. Le didascalie delle due colonne si
  sovrappongono nella riga del titolo (difetto del foglio, non del disegno).
- **Prova dei fotogrammi del B9 (`tools/e2e/natpf-gesti-fotogrammi.mjs`) NON verde**: 640×400 e 1600×1000 «nel quadro» OK, ma
  restano (misurati dopo due giri di camere): mano+telefono 27 % (limite 28 %) all'impatto del dritto, dell'incrociato e del
  lungolinea a 640×400 e 1600×1000; freccia del contatto fuori dal quadro al 39–45 % a 448×280 per dritto, incrociato e
  lungolinea; palla fuori 117 ms (limite 100) a 200×200 per dritto, piatto e lungolinea; etichetta del fantasma sopra il
  telefono vivo all'impatto nel tagliato (34–38 %) e nella schiacciata (26 %). È lavoro di inquadratura (risolutore della
  camera che segue), non di posa: da fare nel passo dopo.

## 7. Test
- `natpf-gesture-pose`: «insieme del video» (tutte le schede della racchetta dalla partenza del video, continue, ciclo chiuso,
  limiti, parte veloce, picco = contatto, `tC` scritto), «la forma resta quella del video» (scarti massimi della tabella §4
  arrotondati in su: si accorge se una coreografia si allontana), «pose grezze NON lette» (fallirebbe se le grezze diventassero
  leggibili per caso; i test di fedeltà falliscono se si rimette la grezza nel tutorial). I tempi del brief §5.4 e il servizio
  di prima restano verificati con la presa nel palmo.
- `natpf-gesture-physics`: presa del video rigida in tutte le schede, scheda «Presa» dal primo piano, partenza = `REST_VIDEO`,
  dritto del video (carica all'anca con le spalle girate, impatto alto davanti a destra con il gomito ≤ 50°, fine davanti al
  viso con il busto ≥ 20°, una sola frenata); il dritto del B13 resta verificato con la presa nel palmo.
- `natpf-mancini`: due scarti dello specchio misurati e ammessi solo lì (salita dell'intenzione 0,018–0,020 per palla corta e
  schiacciata con la calibrazione dell'animazione; mira del piatto dell'incrociato 0,086, come il lungolinea).
- Suite del gioco 980/980, sito 200/200, build ok.

## 8. Non verificato
- Nessun telefono vero: tutto è letto dal telefono simulato. La presa del video è una misura a bassa confidenza (37,7°).
- La coerenza della scheda «Presa» con la foto (pollice: §1) è da chiarire con l'utente.
- Il flusso del tutorial nel browser non è stato provato in questo passo (solo i fogli e la prova dei fotogrammi, rossa §6).
- Palla corta e schiacciata non partono dalla posa del video (§1).
