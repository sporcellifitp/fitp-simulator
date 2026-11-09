# B17.1 · passo B2 · Coreografie ottimizzate con il rilevatore nel costo, presa e partenza dal video

> Stato (09/11/2026 notte, worktree B17.1, **dopo le correzioni della revisione**). Decisioni dell'utente: (1) «ottimizza senza
> di me» = scelta B di `docs/b17/posa-dal-video.md` §4: tenere la FORMA del video e cercare polso e tempi con il rilevatore
> vero nel costo, misurando quanto il gesto si allontana dal video; (2) presa e partenza «come la mia impugnatura del video» =
> misurate nel video. File di ripresa: `docs/b17/STATO-B2.md`. **Tutto ciò che segue è misurato con il telefono simulato
> completo** (`test/pose-sensors.mjs` → `test/phone-sim.mjs`: rilevatore vero `swing-detect.js`, forma del colpo, calibrazione
> rapida, mappatura del gioco), **non con un telefono vero né con l'utente**. Il riconoscimento non è stato toccato.

## 0. Correzioni dopo la revisione (che cosa era sbagliato nel primo giro)
- **Il «144/144» del primo giro valeva solo per il seme 7** del rumore del telefono simulato, l'unico letto sia
  dall'ottimizzatore sia dai test: le soluzioni si erano adattate a quella realizzazione. Sui semi 1–6 e 8–11 la racchetta dava
  **1416/1440** (il palmo 1440/1440): tagliato di dritto letto «palla corta + tagliato» con 7 semi su 10 (la carica dall'anca
  a 110 °/s, picco 981 ms prima del contatto), incrociato con la mira 0,35–0,40 sotto la soglia di 0,4 con 5 semi su 10, piatto
  a 1,25× letto top spin con 3 semi, volée letta piatto con 1. Ora il costo legge **quattro semi (7, 1, 5, 10)** con un margine
  sulla mira, e le coreografie rifatte sono lette giuste su **tutti i semi da 1 a 23: 3312/3312** (§3); un test legge tre semi
  che l'ottimizzatore non ha mai visto (2, 3, 11).
- **Lo script non rifaceva il dritto consegnato** (parte veloce 0,319 s, limite dello script 0,30): ora il limite è 0,32, le
  soluzioni stanno nel repository con le opzioni usate e un test verifica che rifacciano `CHOREO_VIDEO` (§2).
- **Il tagliato di dritto aveva perso la discesa lunga**: nel primo giro la mano scendeva di 10,5 cm in tutto, solo prima
  dell'impatto, e dopo l'impatto **saliva** di 1,3 cm (video: −11,4 cm dopo l'impatto, −27 cm in tutto, fine all'anca sinistra);
  il documento diceva «15 cm invece di 27», un conto sbagliato (la carica del video meno la fine dell'animazione). Ora la parte
  veloce resta corta e la mano prosegue lenta dopo la frenata fino all'anca sinistra (§4).
- **Il rovescio «a due mani» era disegnato con una mano sola** (`GESTURES.backhand.twoHanded` non era definito) e finiva a
  1,40 m in mezzo al petto: ora la mano libera è sul telefono dalla carica alla fine e la fine è a 1,53 m sopra la spalla
  destra come nel video (§4, §6).
- **La scheda «Presa» mostrava il pollice sotto e le dita sopra**, con l'etichetta «Dita sotto» puntata su un dito disegnato
  sopra: ora la presa misurata è mostrata nella posa delle foto, con il pollice in alto e le dita sotto (§1).
- Numeri corretti del primo giro: la battuta del servizio è **5,6 cm più bassa** del video (1,64 m contro 1,70; 12,5 cm è la
  distanza, non l'altezza); il picco del braccio del servizio arriva a 1,75 m poco prima dell'impatto. La fine del servizio
  resta davanti al petto (−0,01; 1,30 m), **non** «fino all'anca sinistra» come scriveva §6 (video: 1,20 m).

## 1. Presa e partenza dal video
- **Presa** (`PHONE_IN_HAND_VIDEO` in `natpf_gesture_pose.js`, ora `PHONE_IN_HAND_RACCHETTA`): quella misurata nei colpi del
  video (`gesti-video.json` `metodo.presa`: modello «in piedi nel pugno» qaxis((1,1,0),180°) corretto di Euler XYZ (45°, 10°,
  65°) su 204 fotogrammi con schermo e mano visti; errore d'asse residuo **37,7°**, misura a bassa confidenza). Nel riferimento
  della mano: cima a 27° dalle dita (inclinata verso il palmo), schermo a 46° dalla normale del palmo, girato verso il mignolo.
  Rispetto alla lettura delle foto del passo B (`PHONE_IN_HAND_FOTO`, tenuta come alternativa) è soprattutto un rollio di 46°
  attorno all'asse lungo. Rigida nella mano in tutte le schede della racchetta (test `natpf-gesture-physics`).
- **Partenza** (`REST_VIDEO`): media degli angoli misurati nella posa ferma 9,4–9,7 s, polso compreso (pro 89°, fl −23,5°,
  dv −26,7°). Braccio che pende, mano all'anca destra, cima in avanti e in basso, schermo verso la coscia. È la partenza di
  tutte le schede della racchetta e della scheda «Posizione di partenza». **Eccezioni (limite dichiarato)**: palla corta e
  schiacciata partono dalla posa di oggi della racchetta (`REST_COLPI_RACCHETTA`, telefono davanti al petto): dalla partenza
  del video la loro carica era letta come un colpo in tutte le varianti provate.
- **Braccio libero** (la sinistra del destro, solo disegno): a riposo pende rilassato lungo il fianco quasi disteso, come nel
  video (`FREE_REST`); prima era la mano sul fianco con il gomito in fuori in tutte le schede.
- **Scheda «Presa»** (`REST_RACCHETTA`, correzione): la presa misurata nella posa delle **foto** dell'utente
  (`docs/b17/presa-foto.md`): gomito al fianco, telefono lungo l'avambraccio, cima in avanti e 20° in su, polso dritto,
  **bordo del pollice in alto e dita sotto**; con la presa misurata lo schermo guarda verso l'interno (verso sinistra e 22° in
  su) e il dorso verso destra, come nelle foto («davanti», presa da davanti a sinistra, vede lo schermo; «dietro», da dietro a
  destra, il dorso). Risolta con `ottimizza.mjs --presa` (cima, pollice, schermo un poco in alto, polso dritto, gomito al
  fianco, avambraccio fuori dal busto). Indicazioni: le prime due concordate con l'utente restano («Telefono disteso nel
  palmo, cima in avanti», «Dita sotto, attorno al bordo»), la terza diventa **«Pollice in alto lungo il bordo, schermo verso
  l'interno»** (diceva «schermo verso lo schermo di gioco», che con la presa misurata vale all'impatto dei colpi, non nella
  presa ferma): **da confermare con l'utente**. Etichette sul disegno: «Pollice in alto, lungo il bordo», «Dita sotto, attorno
  al bordo», «Schermo verso l'interno».
- **Perché non il primo piano del video** (1–5 s, tenuto come `REST_RACCHETTA_PRIMO_PIANO`): lì l'utente MOSTRA lo schermo
  alla camera, con la cima verso la sua sinistra e il pollice sopra. Con la mano disegnata (`HAND_RACCHETTA`, dalle foto:
  pollice sul bordo +x del telefono) e lo schermo verso la camera, la cima a sinistra mette il pollice **sotto** (misurato nel
  primo giro: punta del pollice a 1,07 m, sotto il polso a 1,16 m). Con il pollice sopra e lo schermo verso la camera la cima
  va verso la DESTRA di chi gioca, e la presa misurata chiede il gomito alzato davanti al petto con la rotazione dell'omero al
  limite (−88…−97°: `scratchpad b17r/presa-ik3.mjs`, `presa-ik4.mjs`). Il primo piano è quindi un altro modo di tenere il
  telefono (per mostrarlo), speculare a quello delle foto.

## 2. L'ottimizzatore (`natpf-tennis/scripts/video/ottimizza.mjs`, riusabile)
- **Variabili** per le schede dal video: alle pose chiave (dritto, rovescio, tagliati: carica B, impatto C, fine della parte
  veloce F; servizio: mano all'anca P, braccio in alto U, battuta C, fine F) il polso (pro, fl, dv: liberi nei limiti) e
  piccoli scarti di busto, piano ed elevazione della spalla, rotazione dell'omero e gomito (±12° ciascuno); i tempi: parte
  veloce 0,18–0,32 s, frenata 0,12–0,35 s, carica 0,6–2,2 s, fermo finale 0,15–0,4 s (servizio: salita 0,2–0,4, fermo in alto
  0,1–0,5, battuta 0,15–0,3). Con `--slow` (nuovo) una quarta posa **F2** = la fine del video ±15° per angolo (`--f2d`), polso
  libero, raggiunta in `slow` = 0,2–0,8 s dopo la frenata. Partenza: la coreografia del video grezza (`CHOREO_VIDEO_GREZZA`)
  con il polso risolto perché cima e schermo siano quelli ricostruiti dal video con la presa misurata (`rawVideoChoreo`).
  `--mono` (tagliati e rovescio): ogni articolazione del braccio va nello stesso verso da B a C e da C a F.
- **Proseguimento lento** (`natpf_gesture_pose.js`, `SLOW_V`): ogni articolazione arriva in F con la velocità 1,875·(F2 − F)/
  durata nel verso della frenata e da lì scende a zero in modo monotono (quintico con accelerazione nulla agli estremi), così la
  mano frena una volta sola e il telefono resta lento: è la parte che porta la mano del tagliato all'anca sinistra e quella del
  rovescio sopra la spalla destra senza un secondo colpo.
- **Costo** = 50 × errori di lettura + 5 × margine + scarto dalla forma + 30 × vincoli fisici. Lettura: `judgeCard` su
  **48 combinazioni** (semi 7, 1, 5, 10 × calibrazione del braccio simulato e con il dritto e il rovescio dell'animazione ×
  destro e mancino × 0,8× / 1× / 1,25×; `--seeds` per cambiarli; la volée con anche il seme 6): un colpo solo, tipo e lato
  giusti, picco = contatto ± 1 campione; a 1× ± ¼ di campione; servizio: lancio + battuta. **Margine**: mira |w| ≥ 0,5
  (`AIM_MARGIN`; la soglia del test è 0,4) per incrociato e lungolinea. Forma: mano alle pose chiave contro il video (impatto
  pesato di più), gomito, traiettoria della mano a tempo normalizzato, cima e schermo del telefono (peso basso), istante della
  posa C contro il picco letto. Fisica (B13): limiti articolari, velocità ≤ 1 900 °/s e accelerazioni ≤ 38 000 °/s² delle
  articolazioni, collisioni con busto e testa, una sola frenata dopo l'impatto, sequenza prossimo-distale, carica ≤ 140 °/s
  (`--capPrep`: 95 °/s per il tagliato, sotto la soglia del gesto verticale lento del rilevatore, 100 °/s), una sola valle
  della velocità prima del colpo, telefono ≤ 1 800 °/s, mano ≤ 0,14 m tra due campioni a 60 Hz, picco della battuta più alto
  della salita del servizio, telefono non di taglio nelle pose chiave per la camera della scheda; **nuovi**: telefono ≤ 150 °/s
  nel proseguimento lento, **discesa** (`--descent=0.2,0.08`: fine ≤ carica − 20 cm e ≤ impatto − 8 cm) e avambraccio a ≥ 31°
  dal raggio visivo della camera della scheda in tutto il ciclo (test `natpf-gesture-anim`: ≥ 28°).
- **Ricerca**: strategia evolutiva (1+λ), λ = 8, passo per variabile con la regola del successo e ripartenze del passo. Con
  quattro semi 0,3–0,8 s per valutazione; 400–1 500 valutazioni per scheda, più ricerche in parallelo (`nohup`, log in
  scratchpad `b17r/`).
- **Riproducibilità** (correzione): ogni soluzione salvata porta il vettore, i nomi delle variabili, i semi e le **opzioni**
  con cui è stata trovata (`mono`, `slow`, `f2d`, `rest`, `via`); quelle usate sono in `natpf-tennis/scripts/video/soluzioni/`
  e `--emit=DIR` rifà `CHOREO_VIDEO` e `AIM_TURN_VIDEO` da lì (con `decode`). Il test «le soluzioni salvate rifanno
  CHOREO_VIDEO» lo verifica. `--report` senza `--from` valuta la coreografia del codice (`CHOREO_VIDEO[card]`); `--presa`
  risolve la posa della scheda «Presa». Il ritorno delle schede di oggi parte da 0,5 s (la volée ha 0,628 s; prima lo script
  lo limitava a 0,8 s e non rifaceva la volée).
- Rifatti in questo giro: tagliato di dritto (`--slow --descent=0.2,0.08 --capPrep=95`, camera frontale nuova), rovescio
  (`--slow --f2d=25`), incrociato, piatto e volée (con il rovescio nuovo nella calibrazione, `--with`), tagliato di rovescio.
  Dritto, servizio, lungolinea, pallonetto, palla corta e schiacciata erano già letti giusti con tutti i semi e sono quelli
  del primo giro.

## 3. Letture (codice finale, `CHOREO_VIDEO`; tabella generata dal telefono simulato, `scratchpad b17r/tabella.mjs`)
| Scheda | Letture giuste (semi 1–11 × 2 calibrazioni × 2 mani × 3 velocità) | Colpo letto (destro, seme 7, 1×: calibrazione del braccio / dell'animazione) | Picco letto − contatto (ms, 1×) | Mira minima |
|---|---|---|---|---|
| Dritto | 132/132 | topspin/forehand / topspin/forehand | -1,5 / -1,6 | — |
| Rovescio a due mani | 132/132 | topspin/backhand / topspin/backhand | -2,7 / -2,8 | — |
| Tagliato di dritto | 132/132 | slice/forehand / slice/forehand | 2,1 / 2,0 | — |
| Tagliato di rovescio (variante) | 132/132 | slice/backhand / slice/forehand | 0,3 / 0,2 | — |
| Servizio | 132/132 | 2 gesti / 2 gesti | -0,7 / -0,7 | — |
| Piatto | 132/132 | flat/forehand / flat/forehand | 0,8 / 0,7 | — |
| Pallonetto | 132/132 | lob/forehand / lob/backhand | 1,7 / 1,6 | — |
| Palla corta | 132/132 | drop/backhand / drop | 1,1 / 1,1 | — |
| Schiacciata | 132/132 | smash / smash/backhand | 1,4 / 1,3 | — |
| Volée | 132/132 | topspin/forehand / topspin/forehand | -3,2 / -3,2 | — |
| Incrociato | 132/132 | topspin/forehand mira −0,69 / topspin/forehand mira −0,60 | -1,6 / -1,5 | 0,50 |
| Lungolinea | 132/132 | topspin/forehand mira 0,57 / topspin/forehand mira 0,67 | -1,6 / -1,6 | 0,54 |

Totale **1584/1584** sui semi 1–11 e **3312/3312** sui semi 1–23 (a 0,8× e 1,25× ammessi solo i cambiamenti nel verso della
velocità del brief; senza quelli 1496/1584). Presa nel palmo (coreografie di oggi): 1584/1584 sui semi 1–11. La coreografia
grezza del video **non** si legge (test «pose del video grezze»).
**Lato non controllato** (dalla revisione): `judgeCard` controlla il lato solo dove la scheda lo dichiara (dritto, rovescio,
piatto, volée, mira). Tagliato di rovescio con la calibrazione dell'animazione letto slice/**forehand**, pallonetto lob/backhand,
schiacciata e palla corta con un lato backhand: per tagliato, pallonetto, palla corta e schiacciata il gioco non usa il lato
come per il dritto e il rovescio, ma il tagliato di rovescio mostrato come rovescio e letto dal lato del dritto resta un limite
(variante, non una scheda del tutorial).

## 4. Quanto ci si è allontanati dal video (dritto, rovescio, tagliati, servizio)
Scarti misurati con lo stesso codice dell'ottimizzatore (`shapeOf`, `scratchpad b17r/misure.mjs`): mano (polso) e gomito della
catena contro quelli ricostruiti dal video al netto del bacino, alle pose chiave dell'animazione (carica = fine della carica,
impatto = picco letto, fine = fine dell'accompagnamento, dopo il proseguimento lento dove c'è) contro quelle del video;
traiettoria della mano a tempo normalizzato tra le pose chiave; angoli tra cima e schermo del telefono e quelli ricostruiti
dal video (**a bassa confidenza**: errore d'asse della presa 37,7°).

| Scheda | Mano alle pose chiave: scarto (cm) e altezza (cm) | Traiettoria della mano: media / massimo (cm) | Telefono: cima / schermo (°) | Tempi animazione / video (s) |
|---|---|---|---|---|
| Dritto | carica 1,6 (Δy +1,2); impatto 1,3 (Δy +0,8); fine 3,4 (Δy −1,9) | 7,2 / 21,0 | 13/7; 8/5; 16/44 | carica→impatto 0,30/0,50; impatto→fine 0,16/0,17 |
| Rovescio a due mani | carica 2,7 (Δy −0,6); impatto 7,6 (Δy +1,5); fine 5,2 (Δy +0,6) | 7,0 / 15,9 | 83/86; 64/48; 49/19 | carica→impatto 0,22/0,17; impatto→fine 0,66/0,20 |
| Tagliato di dritto | carica 10,3 (Δy −6,4); impatto 1,9 (Δy +1,5); fine 5,1 (Δy −2,7) | 6,0 / 10,3 | 43/15; 39/19; 24/25 | carica→impatto 0,23/0,23; impatto→fine 0,94/0,23 |
| Tagliato di rovescio (variante) | carica 10,8 (Δy −8,8); impatto 12,0 (Δy +1,5); fine 8,6 (Δy +1,4) | 12,9 / 20,1 | 82/92; 52/45; 122/68 | carica→impatto 0,11/0,27; impatto→fine 0,46/0,17 |
| Servizio | carica 1,5 (Δy +0,7); alto 2,5 (Δy −0,1); impatto 12,5 (Δy −5,6); fine 11,5 (Δy +9,9) | 9,3 / 18,5 | 45/58; 11/46; 15/66; 58/123 | carica→alto 0,40/0,27; alto→impatto 0,58/0,43; impatto→fine 0,17/0,30 |

Altezze della mano (m) e discese:
| Scheda | Carica | Impatto | Fine | Impatto → fine | Massimo − minimo nel colpo |
|---|---|---|---|---|---|
| Tagliato di dritto, animazione | 1,35 | 1,28 | 1,12 (−0,02; 1,12; −0,19), davanti all'anca sinistra | **−15,6 cm** | 23,0 cm |
| Tagliato di dritto, video | 1,42 | 1,26 | 1,15 (−0,05; 1,15; −0,15) | −11,4 cm | 27,3 cm |
| Rovescio, animazione | 1,10 | 1,37 | 1,53 (0,17; 1,53; −0,14), sopra la spalla destra | +15,4 cm | 43,0 cm |
| Rovescio, video | 1,10 | 1,36 | 1,52 (0,21; 1,52; −0,11) | +16,3 cm | 41,7 cm |

Che cosa si è dovuto cambiare rispetto al video e perché:
- **Dritto** (invariato dal primo giro): forma praticamente quella del video (mano entro 1,3–3,4 cm alle pose chiave, fine
  davanti al viso). La parte veloce dura **0,32 s** (0,319) invece di 0,50 s: con 0,5 s il rilevatore spezzava il gesto o
  leggeva il picco 300–660 ms prima del contatto. Carica dall'anca 1,4 s. Picco del telefono 540 °/s. Nei fotogrammi di metà
  colpo il busto resta indietro rispetto al video (la revisione misura 17–19 cm al polso a 9,99 e 10,12 s).
- **Rovescio a due mani**: carica, impatto e fine entro 2,7–7,6 cm dal video; la fine **sopra la spalla destra a 1,53 m** come
  nel video (primo giro: 1,40 m in mezzo al petto, 19,8 cm). La parte veloce dura 0,18 s (video 0,17), poi la mano prosegue
  lenta 0,54 s fino alla fine (telefono ≤ 124 °/s): dall'impatto alla fine il tempo è 0,66 s contro 0,20 s del video. La
  ricostruzione del rovescio a due mani non è attendibile (`STATO-dati.md` §2.5): valgono soprattutto le altezze e i tempi.
  Picco del telefono 718 °/s.
- **Tagliato di dritto**: impatto e fine come il video (1,9 e 5,1 cm), carica 6,4 cm più bassa (1,35 m contro 1,42). La
  discesa ora c'è: **dalla carica alla fine −22,9 cm** (video −26,6), **dopo l'impatto −15,6 cm** (video −11,4), fine davanti
  all'anca sinistra. La parte veloce dura 0,22 s (video 0,23), poi il proseguimento lento **0,8 s** (telefono ≤ 146 °/s, una
  sola frenata): dall'impatto alla fine il tempo è 0,94 s contro 0,23 s del video. È il prezzo della lettura: con la fine bassa
  e a sinistra raggiunta nella parte veloce il rilevatore leggeva palla corta o due colpi (primo giro). La carica ha il
  telefono sotto 95 °/s (nel primo giro 110 °/s, letta palla corta con 7 semi su 10).
- **Tagliato di rovescio** (variante, non una scheda): impatto 12 cm più a destra, fine entro 9 cm; parte veloce 0,20 s ma il
  picco letto cade 0,11 s dopo la carica e la frenata è lunga (0,46 s contro 0,17). Picco del telefono 1 800 °/s.
- **Servizio** (invariato): carica all'anca e braccio in alto come il video (1,5 e 2,5 cm); **battuta 5,6 cm più bassa** (polso
  a 1,64 m contro 1,70, a 12,5 cm di distanza; il punto più alto del braccio è 1,75 m a 2,54 s, poco prima dell'impatto a
  2,63 s) e fine **davanti al petto** (−0,01; 1,30 m) invece che a 1,20 m (11,5 cm). Salita 0,40 s (video 0,27), fermo in alto
  0,28 s, battuta 0,30 s; il lancio letto dal telefono è la salita del braccio, la battuta arriva 0,76 s dopo (picchi 837 e
  909 °/s). Il giudizio del servizio prende l'intervallo lancio → battuta dal piano stesso (`tossGap`): il controllo è
  autoreferenziale (osservazione della revisione).

## 5. Schede che il video non mostra
| Scheda | Scarto della mano dalla coreografia di oggi (cm): carica; impatto; fine | Traiettoria media / massimo (cm) | Carica (s) | Partenza |
|---|---|---|---|---|
| Piatto | 7,1; 1,7; 0,7 | 4,1 / 7,6 | 1,81 (oggi 0,75) | REST_VIDEO |
| Pallonetto | 2,7; 0,7; 1,1 | 3,0 / 8,7 | 2,78 (oggi 0,95) | REST_VIDEO |
| Palla corta | 0,0; 0,0; 0,0 | 0,2 / 0,5 | 0,64 (oggi 0,72) | REST_COLPI_RACCHETTA |
| Schiacciata | 1,3; 2,1; 0,8 | 2,0 / 5,6 | 1,72 (oggi 1,15) | REST_COLPI_RACCHETTA |
| Volée | 5,6; 2,4; 1,5 | 3,3 / 6,1 | 1,10 (oggi 0,30) | REST_VIDEO |

Piatto e volée rifatti in questo giro (con i quattro semi e il rovescio nuovo nella calibrazione: con il rovescio nuovo il
piatto del primo giro a 0,8× era letto due top spin con tutti i semi). Polsi cambiati per la presa del video.

## 6. Disegno e camere
- **Rovescio a due mani** (correzione): `GESTURES.backhand.twoHanded` (solo disegno); dalla seconda metà della carica la mano
  libera raggiunge il telefono (`TWO_HANDS`, 7,1 cm dal centro del telefono), ci resta fino alla fine dell'accompagnamento e lo
  lascia nella prima metà del ritorno. Test in `natpf-gesture-anim`: dalla carica alla fine `freeArm.busy` e la mano libera a
  ≤ 8 cm dal telefono, destro e mancino.
- Camere delle schede dal video (`CAMERAS_VIDEO`): dritto, incrociato, lungolinea e tagliato di rovescio frontali a tre quarti
  specchiate; **tagliato di dritto ora frontale** (davanti, all'altezza degli occhi, come la camera del video: con la discesa
  lunga la camera a tre quarti vedeva l'avambraccio di punta, 13°); servizio dall'alto a destra; **rovescio da dietro a
  sinistra e dall'alto, ritoccata** (az −125°, el 40°: con la fine alta l'avambraccio scendeva a 27° dal raggio visivo). Anche
  con la seconda mano nessuna camera frontale rispetta i vincoli del disegno per il rovescio (la migliore, davanti a destra e
  in alto, dà telefono a 26° e avambraccio a 29° contro i 30/31 di margine): resta da dietro.
- Testi delle camere: incrociato «come il dritto, con il polso girato: cima e schermo verso il centro», lungolinea «come il
  dritto, con il polso piegato indietro: cima e schermo verso l'esterno» (prima «tutto il corpo girato»: misurato, il busto
  gira di ±1,8°, la mira viene dal polso: all'impatto la cima dell'incrociato è girata di 10° rispetto al dritto, quella del
  lungolinea di 15°). Le indicazioni delle schede («Colpisci un attimo prima/dopo del solito») sono quelle di oggi e non
  corrispondono al dritto del video girato: da rivedere con l'utente.
- Fogli **`docs/b17/img/O-*.webp`** rifatti a **tre colonne**: fotogramma del video specchiato | posa ottimizzata con la camera
  della scheda | la stessa posa con una **camera fissa frontale a corpo intero** come quella del video, con il polso del video
  segnato da una croce gialla (la camera della scheda nascondeva la forma); didascalie tagliate alla loro colonna.
  `tools/e2e/natpf-gesti-video-confronto.mjs` con `PREFIX=O`: 24/24 verifiche (unico limite dichiarato: impatto del servizio
  0,12–0,13 m). **Guardati** il tagliato di dritto (discesa dalla spalla destra all'anca sinistra come il video, telefono di
  traverso davanti all'anca alla fine, nel video in giù) e il rovescio (due mani sul telefono dalla carica alla fine, fine
  sopra la spalla destra vicino alla testa come il video).
- Prova dei fotogrammi del B9 (`tools/e2e/natpf-gesti-fotogrammi.mjs`, fogli in scratchpad): **ancora NON verde, 25/31**
  (era rossa anche nel primo giro, per inquadratura). Restano: soggetto (mano + telefono) 22–27 % all'impatto del piatto (limite
  28 %) a tutte le misure; telefono all'impatto della schiacciata più corto del limite (58 px a 640×400, 61 a 448×280, 146 a
  1600×1000) e del piatto a 200×200 (41 px); freccia del contatto fuori dal quadro al 36–45 % a 448×280 per dritto, incrociato
  e lungolinea; palla fuori 117 ms (limite 100) a 200×200 per dritto, piatto e lungolinea. Le etichette dei fantasmi sul
  telefono vivo nel tagliato non ci sono più (camera frontale). È lavoro di inquadratura (risolutore della camera che segue),
  non di posa: passo dopo.

## 7. Test
- `natpf-gesture-pose`: «insieme del video» (continuità, ciclo chiuso, limiti, parte veloce 0,18–0,32 s, picco = contatto, `tC`),
  «la forma resta quella del video» (scarti di §4 arrotondati in su), **«letto giusto con semi che l'ottimizzatore non ha visto
  (2, 3, 11)»** (432 letture, mira minima ≥ 0,4), **«le soluzioni salvate rifanno CHOREO_VIDEO e AIM_TURN_VIDEO»**, **«tagliato in
  discesa lunga e rovescio che finisce alto»** (fine ≤ carica − 20 cm e ≤ impatto − 8 cm, fine verso l'anca sinistra; rovescio ≥
  1,47 m a destra; telefono ≤ 150 °/s nel proseguimento lento), «pose grezze NON lette».
- `natpf-gesture-anim`: **«rovescio a due mani»** (mano libera sul telefono dalla carica alla fine; a riposo braccio libero
  quasi disteso sotto il bacino); avambraccio ≥ 28° dal raggio visivo con le camere nuove.
- `natpf-gesture-physics`: scheda «Presa» con la cima in avanti e in alto, **il pollice sopra e le dita sotto** il telefono,
  schermo verso l'interno, polso dritto, gomito al fianco; `GRIP_POSE.racchetta.euler` = posa della scheda.
- `natpf-presa`: terza indicazione nuova. `natpf-mancini`: scarto dello specchio della salita anche per il tagliato
  (−0,778 / −0,767, ammesso 0,025 come palla corta e schiacciata).
- Suite del gioco **984/984**, sito **200/200**, build ok. Prove nel browser: `natpf-modale-gesti` 18/18,
  `natpf-tutorial-phone` 52/52, `natpf-gesti-video-confronto` (`PREFIX=O`) 24/24, `natpf-gesti-fotogrammi` 25/31 (§6).

## 8. Limiti e non verificato
- Nessun telefono vero: tutto è letto dal telefono simulato. La presa del video è una misura a bassa confidenza (37,7°).
- Scheda «Presa»: la terza indicazione («schermo verso l'interno») cambia il testo concordato; il primo piano del video
  (pollice sopra con la cima a sinistra) non è riproducibile con la mano disegnata dalle foto: **da chiarire con l'utente**.
- Tagliato di dritto e rovescio: il tratto dopo l'impatto è 4 volte più lungo del video (proseguimento lento). Servizio: fine
  davanti al petto, battuta 5,6 cm più bassa; il lancio disegnato porta la sinistra davanti al viso (scelta dei passi prima).
- Polso spesso al bordo dei limiti: dv −29 (limite −30) in rovescio (F2), tagliati (B), pallonetto, volée; fl −69 (limite −70)
  nella carica del tagliato, fl 74 (limite 75) nel pallonetto; pro 1 (limite 0) nel piatto. Flessione e deviazione insieme non
  sono controllate come limite anatomico combinato (oltre l'ellisse dei due limiti: carica del tagliato 1,38, fine del piatto
  1,23, volée 1,27–1,30, carica del pallonetto 1,11).
- `physicsOf` sulle soluzioni finali: tutte senza violazioni tranne il tagliato di rovescio (carica a 140,1 °/s, limite 140).
- Palla corta e schiacciata non partono dalla posa del video (§1). Lato non controllato per tagliato, pallonetto, palla corta e
  schiacciata (§3). Il flusso del tutorial nel browser non è stato provato in questo giro (solo i fogli e la prova dei
  fotogrammi).
