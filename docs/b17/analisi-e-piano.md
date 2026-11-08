# B17 · Analisi e piano (08/11/2026 sera): gesti del tutorial dal video dell'utente, uscita dal tutorial, punteggio in alto a sinistra, colpi sotto rete

Richiesta dell'utente (08/11 sera), con tre allegati: il **video** in cui esegue dritto, rovescio, servizio e palle
tagliate (42,7 s, 1080×1920, 30 fps) e le **due diagnostiche** `20261108-171902-wqdk` (73,6 s, 34 colpi) e
`20261108-172017-q79f` (52 s, 22 colpi), tutte e due su build `2026-11-08.4`, difficoltà **Leggenda**, telefono Android a
60 Hz, presa `upright`. La «schermata allegata» per il punteggio **non è arrivata** tra i file: il punto 3 parte da
quello che l'utente ha scritto (in alto a sinistra, più grande e leggibile).

Un altro agente lavora in parallelo al **B16** (decisioni (a)–(d) del B15, audit del gameplay in sei angolazioni, tra cui
«colpi speciali e gioco a rete»). I rami del B16 sono locali e non pubblicati: per evitare conflitti qui si lavora in
rami propri, con `git fetch` e integrazione prima di ogni push, e il punto 4 è annotato come sovrapposizione da unire
con il suo rapporto.

## 1. Gesti del tutorial: cosa mostra il video e perché l'animazione attuale non gli somiglia

### 1.1 Letto dal video (camera davanti all'utente; la sua destra è a sinistra nel quadro)
| Colpo | Istanti | Impugnatura e orientamento del telefono | Traiettoria |
|---|---|---|---|
| **Presa** | 1–5 s | Telefono **in verticale nel pugno**, schermo «Pronto» rivolto **in avanti** (verso la camera/schermo), pollice sul bordo. Non la presa «nel palmo con la cima in avanti» della foto del 04/11: è una presa a manico con il display davanti. | — |
| **Dritto** | 9,3–11,3 s | Parte dall'anca destra, schermo in avanti; nella carica il braccio si **distende di lato a destra** (quasi orizzontale, telefono con lo schermo verso la camera, cima a destra); nella parte veloce il telefono gira di ~90° e **finisce davanti al viso, cima in alto, schermo verso la camera**. | Arco **orizzontale** da destra a sinistra alla stessa altezza del petto, poi sale; braccio quasi disteso per tutto il colpo; busto che ruota. Carica lenta (~0,8 s), colpo veloce (~0,3 s), fermo di ~0,4 s in alto. |
| **Rovescio** | 15,0–17,0 s | **A due mani**: la sinistra copre la destra, telefono all'anca sinistra con lo schermo verso il corpo/basso; all'impatto le due mani davanti al petto con il telefono **verticale, schermo verso la camera**; fine alta sopra la spalla destra. | Busto girato di ~45° a sinistra nella carica, arco da sinistra a destra che sale, braccia distese alla fine. |
| **Servizio** | 17,6–19,6 s (ripetuto a 22,4 e 27,3 s) | Mani unite al petto; la **sinistra lancia** (palla immaginaria) mentre la destra porta il telefono **sopra la testa con lo schermo in avanti**; battuta con il braccio disteso e il telefono che **si piega in avanti** (cima verso la camera); accompagnamento che scende **davanti al corpo fino all'anca sinistra**. | Salita ~0,6 s, battuta ~0,25 s, discesa ~0,4 s. |
| **Tagliato** (dritto e rovescio) | 30,4–38 s | Telefono portato **in alto all'altezza della spalla/testa**, schermo verso la camera, cima in alto; scende **in diagonale verso il basso e in avanti**, finendo basso davanti all'anca opposta con il telefono quasi **orizzontale, schermo in su**. | Il taglio è un **movimento dall'alto in basso lungo** (~0,6 m), non un pendolo corto: all'impatto il telefono è inclinato di ~45° (schermo in su e in avanti). |

### 1.2 Confronto con l'animazione attuale (fogli `docs/b9/img/C-anim-*` rigenerati nel B14.2)
- **Presa diversa**: l'animazione insegna la presa nel palmo con la cima in avanti (`GRIP_STYLE = 'palmo'`), il video
  mostra il telefono dritto nel pugno con lo schermo in avanti (`presa: upright` nella diagnostica). Il riconoscimento
  è calibrato su chi gioca e funziona con tutte e due, ma la scheda «Presa» e tutti i fotogrammi **mostrano una cosa
  diversa da quella che l'utente fa**: è la prima incoerenza che l'utente vede.
- **Dritto**: nell'animazione la mano all'impatto è in diagonale avanti-sinistra, gomito piegato (59°), telefono con
  la cima in avanti e il **palmo verso chi gioca**; il colpo è corto (0,9 m di strada) e la fine è davanti alla spalla
  sinistra. Nel video il braccio è **quasi disteso**, l'arco è **largo e orizzontale** da destra a sinistra, il telefono
  tiene lo **schermo verso lo schermo di gioco** per tutto il colpo e finisce **in alto davanti al viso**. La
  camera da dietro e dall'alto appiattisce l'arco: si legge come una «manata» e non come un dritto.
- **Rovescio**: a una mano nell'animazione, **a due mani** nel video (con la fine alta sopra la spalla destra).
- **Servizio**: l'animazione fa un lancio con la stessa mano del telefono e batte con il gomito a 34°; nel video c'è la
  **mano libera che lancia**, il telefono sale sopra la testa con lo schermo in avanti e l'accompagnamento scende
  **davanti**, fino all'anca opposta (nell'animazione finisce all'altezza del petto).
- **Tagliato**: nell'animazione la carica è alta ma il taglio è un pendolo corto con il telefono di taglio; nel video è
  una **discesa lunga e inclinata** con lo schermo che finisce **in su**.
- **Stile**: la sagoma scura del busto, la manica, la vista «da regia» dall'alto non raccontano la fisica: l'utente
  giudica dal confronto con il proprio corpo visto davanti a uno specchio (o in un video come questo).

### 1.3 Perché il B13/B14 non ci è arrivato
Le coreografie sono state ottimizzate per far passare i **test di fedeltà** (il telefono simulato legge la posa come
il colpo giusto) e i **vincoli del disegno del B9** (telefono mai di taglio, ≥ 60 px…), con la **presa nel palmo** come
dato fisso. Il dritto «da manuale» è stato scartato perché con quella presa la carica girava il telefono oltre ~150 °/s
e la calibrazione veloce lo leggeva come colpo speciale (`docs/b14/dritto-orientamento.md`). Il video dice che la presa
di partenza è un'altra: con il telefono dritto nel pugno e lo schermo in avanti, il dritto largo del video gira il
telefono attorno alla **verticale** (è l'asse che il riconoscimento si aspetta) e non ha quel problema.

### 1.4 Piano proposto (B17.1, da fare in un ramo proprio)
1. **Dati veri dal video, non pose inventate.** Dal video si ricavano, fotogramma per fotogramma (30 fps), le
   traiettorie 2D di spalla, gomito, polso e dei due angoli del telefono con MediaPipe Pose/Hands già nel repository
   (`webcam_pose_strokes.js`, `webcam_hand_pose.js`): 60–70 fotogrammi per colpo. La profondità (asse camera) si
   ricostruisce dalla lunghezza nota dei segmenti (omero 0,30, avambraccio 0,27, telefono 0,162). Risultato: una
   **coreografia campionata** per dritto, rovescio a due mani, servizio con la mano libera, tagliato di dritto e di
   rovescio (nuova scheda `slice` a due varianti), salvata come dati (`docs/b17/gesti-video.json`) con i tempi veri.
2. **Posa guidata dai dati**: `natpf_gesture_pose.js` prende le pose chiave e i tempi da quel file (interpolazione
   con le stesse curve di oggi) invece delle coreografie ottimizzate; la catena cinematica, il disegno e i test di
   fedeltà restano. La **presa** passa a `upright` (telefono dritto nel pugno, schermo in avanti) come scheda insegnata
   e come posa della mano in tutti i colpi; la foto della presa va rifatta con quella impugnatura (l'utente la fa in
   10 secondi dal telefono; nel frattempo si usa un fotogramma del video). Il rollback «palmo» resta come oggi.
3. **Fedeltà verificata sui dati**: il test `natpf-gesture-pose` deve leggere ogni colpo campionato come il colpo
   giusto con il telefono simulato (dritto → topspin di dritto, rovescio a due mani → topspin di rovescio, tagliato →
   slice, servizio → lancio + battuta). Dove il riconoscimento non legge il gesto del video (è possibile per la carica
   larga del dritto), il **limite si misura e si decide con l'utente** se adattare il riconoscimento (soglia dei colpi
   speciali nella calibrazione veloce) o il gesto: niente compromessi silenziosi come nel B13.
4. **Vista e stile**: camera **frontale a tre quarti all'altezza del petto** (come il video, specchiata: chi guarda
   vede il proprio braccio destro a destra) per dritto, rovescio, tagliato; profilo a tre quarti per il servizio.
   Figura intera **chiara** (busto e gambe con linea di contorno, non sagoma scura), braccio disteso con le proporzioni
   del video, telefono con lo schermo visibile e leggibile per tutto il colpo (è quello che l'utente controlla con gli
   occhi), **fantasmi** della carica e della fine, scia del telefono. Due velocità: tempo reale e rallentato ×0,5, con la
   fase scritta.
5. **Verifica**: fogli dei fotogrammi affiancati al video (stesso istante, stessa inquadratura) in
   `docs/b17/img/`, guardati e mandati all'utente **prima** di integrare; poi fedeltà, prove nel browser, prestazioni
   come nel B9 §5.6. Costo stimato: 1 ramo con tre passi (dati, posa, disegno) e revisione.

Alternativa più rapida ma meno fedele: tenere le coreografie di oggi e cambiare solo presa, camera e la fine dei
colpi a mano. Non la consiglio: il video dà misure vere e il problema del B13 era proprio la mancanza di un riferimento.

## 2. Uscita dal tutorial (B17.2, fatto in questo blocco)
Oggi la modale in modalità «telefono» si chiude solo con «Tutto chiaro, ho capito» sul telefono (acceso dopo
l'ultima scheda) o con Esc sul computer; «Chiudi» c'è solo in «Rivedi i gesti». Si aggiunge una **X in alto a destra**
della scheda, sempre visibile: spenta (con la spiegazione «Sfoglia tutte le schede») finché non sono tutte viste,
accesa dopo; cliccata fa **la stessa cosa** di «Tutto chiaro» (segna il tutorial come visto per quell'abbinamento e passa
a calibrazione/pronto), nel gioco singolo e in ciascuna metà dello stesso schermo. In «Rivedi i gesti» la X chiude
sempre. Tastiera: Esc resta per chi gestisce la postazione. Nota: il B16 sta facendo il «tutorial corto» (5 schede):
la X funziona con qualunque numero di schede (`all` dello stato).

## 3. Punteggio in alto a sinistra (B17.3, fatto in questo blocco)
Il tabellone del B10 (`natpf_scoreboard.js`) sta al centro in alto, con `--sb = clamp(13px, 2.3cqh, 32px)`. Si sposta
**in alto a sinistra**, più grande (`--sb` ≈ 3,2 cqh, 16–44 px), con le stesse due righe (chi serve · nome · game ·
punti) e il formato sotto; l'avviso «In attesa di Player 2» e la scritta dell'esito del colpo (angolo in basso) non si
toccano. Stesso schermo: il tabellone va in alto a sinistra **di ogni metà**; ledwall 720×720 e 1280×720 verificati
con schermate. Appena l'utente manda la schermata di riferimento si allineano proporzioni e posizione a quella.

## 4. Colpi sotto rete (B17.4, fatto in questo blocco)

### 4.1 Cosa succede davvero (dalle due diagnostiche)
Nove colpi giocati entro 7 m dalla rete, nelle due partite:

| Sessione · s | Palla (z) | Gesto letto dal telefono | Esito del motore | Che cosa vede l'utente |
|---|---|---|---|---|
| wqdk · 22,5 | −1,9 | `drop` per forma («taglio verticale morbido», 626 °/s, 60°) | DROP, profondità 0,23 → cade a ~2,5 m, volo 1,32 s | palla morbidissima e lenta |
| q79f · 3,1 | −1,9 | `drop` per forma (440 °/s, 31°) | DROP, profondità 0,08, volo 1,41 s | palla morbidissima e lenta |
| q79f · 6,2 | −6,8 | topspin forte (1344 °/s, 108°), PERFECT | **fallito «in allungo» → debole**: profondità ≤ 6,8 m, +0,9 m sulla rete | palla alta e lenta nonostante il gesto forte |
| wqdk · 36,6 | −6,8 | flat forte (1210 °/s), EARLY | fallito «in allungo» → debole | come sopra |
| q79f · 43,0 | −6,8 | lob (759 °/s), PERFECT | fallito «in allungo» → debole | pallonetto moscio |
| q79f · 13,4 | −6,9 | topspin, tempo 1,27 (VERY EARLY) | x = 6,0 m → **fuori** | «palla persa»/fuori |
| q79f · 19,4 | −7,0 | flat, EARLY 0,78 | ok, x −4,7 | — |
| q79f · 35,9 · 46,2 | −7,1 · −7,4 | topspin | ok | — |
| q79f · 42,8 | — | slice | **VERY EARLY • WHIFF** (a vuoto) | «palla persa» |

In più il telefono ha **scartato come «debole» 22 gesti** nella prima partita e 8 nella seconda (picchi 164–469 °/s): la
soglia in gioco è `max(45, 0,18 × colpo tipico)` e con un colpo tipico di ~1300 °/s vale ~234 °/s, quindi i tocchi
morbidi a rete **non arrivano nemmeno al gioco**.

### 4.2 Le cause nel codice
1. **«In allungo» a Leggenda**: `quality = reach × prep × stretch × pace`; arrivando di corsa su una palla corta
   `stretch` scende e la qualità finisce a 0,57–0,62, **sotto `failQ = 0,63` di Leggenda** (`ASSIST.leggenda`). Il colpo è
   «fallito» e, a rete con il tempo buono, diventa **`weak`**: `depth ≤ weakDepth 6,8` e `lift += weakFloat 0,9`
   (`natpf_stroke_outcome.js` righe 234–238). Qualunque gesto, forte o tagliato, dà la stessa palla.
2. **Palla corta per forma**: un gesto morbido che scende (`rise ≤ −0,12`, forza ≤ 0,36) è `drop` per forma
   (`natpf_stroke_intent.js:117`) e il motore impone **volo ≥ 1,32 s** (`game_engine.js`, ramo DROP) e profondità
   1,8–4,6 m: la palla è lenta per costruzione, qualunque sia la direzione o la forza del gesto.
3. **Attacco sopra la rete solo con qualità alta**: la chiusura veloce (`attack`) chiede `q ≥ attackQ = 0,82` a Leggenda e
   `power ≥ 0,45`: con la qualità di cui sopra non scatta mai.
4. **Finestra in anticipo**: `early = 0,40 s` a Leggenda; sulle palle corte lente la finestra della direzione si
   allarga (`slowFactor`), quella del colpo a vuoto no: i gesti fatti «quando la palla sembra lì» sono VERY EARLY
   (fuori di lato per `pushOut`, o a vuoto).
5. **Telefono**: la soglia minima del picco in gioco segue il colpo tipico, non la situazione: a rete i gesti corti e
   morbidi (160–230 °/s) sono scartati.

### 4.3 Correzioni (con test che falliscono senza)
- A rete (`net` o palla entro `attackZ`): il colpo fallito per **qualità di situazione** non diventa più `weak`
  uniforme: la forza del gesto decide velocità e profondità (`attackSpeed` 20–34 m/s dalla forza, profondità dalla
  tabella del tipo), il tipo decide l'arco (tagliato basso e radente, piatto teso, top spin che sale), la direzione
  resta da tempo e piatto con la mira piena; la qualità che manca **aggiunge dispersione** (direzione e altezza sulla
  rete) invece di appiattire tutto. Fallimento vero solo in rete (palla bassa e molto fuori tempo) o lunga (gesto
  fortissimo molto in anticipo). `weak` resta per la palla corta raggiunta all'ultimo (`shortBall && excess === 0`).
- `attackQ` a rete scala con la forza: un gesto forte chiude anche con qualità 0,6, con più rischio di errore.
- Palla corta per forma **a rete** solo con confidenza alta e forza ≤ 0,25; un gesto morbido ma non così lento è una
  **volée controllata**: profondità 3–7 m dalla forza, volo dal tipo (niente minimo di 1,32 s).
- Finestra del colpo a vuoto in anticipo allargata con `slowFactor` come la direzione (palle lente a rete).
- Telefono: a rete il gioco manda `cfg net:1` e la soglia del picco in gioco scende a `0,10 × colpo tipico` (min 45),
  così i tocchi morbidi arrivano; torna normale quando si rientra.
- Prove: test unitari su `strokeOutcome` (stessa situazione a rete, cinque gesti diversi → cinque esiti diversi e
  coerenti: forte teso, tagliato radente, smorzata, incrociato, lungolinea), i nove colpi delle diagnostiche rigiocati
  nella funzione vera (tabella prima/dopo), `colpi.mjs` con lo scenario «palla corta e rete», prova nel browser.
