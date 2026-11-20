# B74 · Verifica dell'ordine degli assi del giroscopio (20/11/2026)

Prodotto: **FIERA**. Decisione dell'utente del 20/11: «Verifica e correzione spenta». Questo documento è **la verifica**:
nessun file del gioco o del telefono è cambiato. Solo numeri aggregati, niente identificativi delle sessioni né dati
personali. I dati veri dei sensori sono fuori dal repository e non sono stati copiati dentro.

## In breve

1. **Confermato per Android con Chrome** (e per l'app NATPF Racchetta 1.0.5, che copia Chrome): `rotationRate` arriva con
   **α = x, β = y, γ = z**, in **°/s**, con il segno giusto (regola della mano destra). Su 7 registrazioni vere con
   movimento, 161 tratti in cui la gravità gira: l'assegnazione di Chrome vince in **7 registrazioni su 7**, errore medio
   **5,2°** (90° percentile 10,5°); la seconda delle 48 fa 13,0° (2,5 volte tanto); **quella che usa il codice (α = z,
   W3C) fa 20,7°** (90° percentile 39,2°), 30ª su 48, peggio che non integrare niente (15,2°). La matrice 3×3 stimata
   liberamente dai dati è l'identità: [[1,01 0,02 0,05] [0,01 0,99 0,05] [−0,01 0,03 1,11]].
2. **iPhone: non verificabile.** Non c'è nessuna registrazione grezza di un iPhone (l'unica partita con un iPhone, il
   29/10 sera come P2, ha solo i colpi già calcolati). Il codice di oggi è giusto per un browser che segue il W3C; la
   correzione deve restare **solo per Android**.
3. **Il codice integra con l'ordine W3C** in 10 punti (parte «a», fisica): 9 sul telefono, cioè filtro d'orientamento e
   verso verticale del piatto (`face-tracker.js`, 2), giro attorno alla verticale e assi rispetto all'alto
   (`swing-detect.js`, 6), twist (`gesture-intent.js`, 1); 1 sul computer, la racchetta a schermo (`racket-motion.js`,
   solo grafica). Tutto il resto che usa il giroscopio è
   invariante all'ordine (moduli, angoli tra due rotazioni, deriva per componente). Nessuna soglia è tarata su un
   componente grezzo; molte soglie (parte «b») sono tarate sui **risultati** dei calcoli fisici sbagliati.
4. **Sui dati veri, con la correzione** (riordino della rotazione all'ingresso): l'errore dell'alto del filtro dopo un
   colpo scende da **31° a 2,6°** (mediana; 90° percentile da 89,5° a 5,9°). Ma cambiano anche le letture tarate: tipo di
   colpo diverso nel **50–58%** dei colpi, verso diverso nel **10%** (profilo calibrato) e nel **42%** (profilo semplice,
   quello della fiera), impronta B66 dei gesti del 28/10 diversa (`933e330650269e1e` → `ddc7a2883204079e`), una prova
   del 28/10 non passerebbe (rovescio del match point con la palla sul rovescio: verso 0 invece di −1). La dispersione
   della cima tra un colpo e l'altro **non scende** in modo netto (4 registrazioni meglio, 3 peggio).
5. **Telefono simulato**: con l'ordine di Chrome il codice di oggi perde **tutti i pallonetti** (letti top spin), metà dei
   tagliati, e con prese e gesti variabili il 15% dei lati nel profilo semplice; errore della cima da 1,3° a 5,3°. Con la
   correzione il risultato è **identico bit per bit** a quello dei test di oggi (stessa firma).
6. **Conclusione**: errore vero, da correggere **dietro un interruttore dello staff spento di base**, solo per Android, con
   un solo punto di riordino all'ingresso (§6). Prima di accenderlo: prova sul telefono vero, e poi una giornata di
   registro con l'interruttore acceso, perché le soglie dei tipi di colpo e del verso sono state tarate sui numeri sbagliati.

---

## 1. Dati

Cercati tutti i `telefono-sensori.jsonl` della cartella di lavoro delle sessioni e gli zip `diag-2026*` (estratti nella
cartella di lavoro di questa sessione). Dopo aver tolto i doppioni (stesso contenuto in due cartelle):

| Registrazione | Telefono e browser | Campioni | Uso |
| --- | --- | --- | --- |
| R1, R2 · 28/10 sera (partite) | Android Chrome n.1 | 4281 · 3291 | sì |
| R3 · 29/10 mattina (1 contro 1) | Android Chrome n.1 | 4077 | sì |
| R4 · 29/10 mattina (con la webcam) | Android Chrome n.1 | 2696 | no: telefono fermo tutto il tempo (rotazione ~0) |
| R5, R6 · 29/10 mattina (partite) | Android Chrome n.1 | 2927 · 5760 | sì |
| R7 · 29/10 pomeriggio (partita) | Android Chrome n.1 | 3327 | sì |
| R8 · 29/10 sera (stesso schermo, P1) | Android Chrome n.1 | 6023 | sì (il P2 era un iPhone: niente campioni grezzi) |
| W · finestre di `tools/test/session-28-10.data.mjs` | Android Chrome n.1 (estratto di R1) | 330 | solo 5 brani di 1 s: confronto con il B73 |
| 12 zip del 04/11 (`b1/`, `b4/`) | telefono simulato delle prove nel browser (HeadlessChrome) | fino a 9622 | no: la gravità è fissa [0; 9,81; 0], non gira con il telefono |

Telefono e browser letti da `eventi.jsonl` (riga `tel.dispositivo`) e `sessione.json`: in tutte le registrazioni vere è
lo **stesso telefono Android con Chrome 156** (stesso schermo, versioni del gioco dal 28/10 al 29/10). In fiera (18–19/11)
i telefoni erano Android 17 con Chrome 157 nell'app 1.0.4: l'ordine degli assi è del codice di Chromium, non del modello.
Campioni a 60 Hz (16,7 ms), rotazione in multipli di 0,1 °/s come in Chromium.

## 2. Metodo e risultati sui dati veri

**Idea.** Un vettore fisso nel mondo (la gravità), visto dal telefono che ruota con velocità ω, cambia come
du/dt = −ω × u. Quando il telefono non accelera, l'accelerometro con la gravità misura proprio u. Quindi, tra due istanti
«fermi», la gravità misurata alla fine deve essere quella dell'inizio ruotata con la rotazione integrata del giroscopio.
Si provano tutte le **48 assegnazioni** di [α, β, γ] agli assi fisici (x, y, z) del telefono: 6 permutazioni × 8 segni.
Integrazione a passi (velocità media dei due campioni, formula di Rodrigues), orologio del telefono (`k`).

**Tratti.** Estremi «fermi»: accelerazione lineare (`a`) sotto 0,5–0,6 m/s² e |g| entro 0,6–0,8 m/s² da 9,81. Tratti
concatenati senza sovrapposizione, senza buchi oltre 50 ms, gravità girata di almeno 10° (o 20°). Tre criteri:

| Criterio | Tratti | Gravità girata (media) | Chrome (α=x, β=y, γ=z) media · mediana · 90° | 2ª migliore | Codice (α=z, β=x, γ=y) | Chrome meglio del codice |
| --- | --- | --- | --- | --- | --- | --- |
| Lento: in mezzo \|a\| < 1,5 m/s² e rotazione ≤ 400 °/s, 150–600 ms | 33 | 11,9° | **4,9° · 4,2° · 8,8°** (1ª) | 8,2° | 14,6° · 13,5° · 23,2° (29ª) | 31 su 33 |
| Largo: in mezzo rotazione ≤ 700 °/s, 150–800 ms | 161 | 15,2° | **5,2° · 4,4° · 10,5°** (1ª) | 13,0° | 20,7° · 17,4° · 39,2° (30ª) | 151 su 161 |
| Ampio: come largo, gravità girata ≥ 20°, fino a 1,2 s | 68 | 30,5° | **5,1° · 4,2° · 10,6°** (1ª) | 21,8° | 41,5° · 37,0° · 68,9° (32ª) | **68 su 68** |

Per registrazione (criterio largo; tra parentesi il posto fra le 48):

| | Tratti | Chrome media · 90° | 2ª migliore (rapporto) | Codice media · 90° | Scala migliore | In rad/s |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | 17 | 4,4° · 7,8° (1ª) | 10,1° (×2,3) | 23,0° · 50,5° (34ª) | 1,00 | 91° |
| R2 | 15 | 6,0° · 8,9° (1ª) | 15,1° (×2,5) | 20,8° · 43,2° (21ª) | 1,02 | 68° |
| R3 | 35 | 6,6° · 11,7° (1ª) | 8,8° (×1,3) | 19,7° · 32,4° (37ª) | 1,00 | 75° |
| R5 | 28 | 5,9° · 11,0° (1ª) | 11,5° (×1,9) | 23,9° · 44,8° (22ª) | 1,10 | 93° |
| R6 | 30 | 3,9° · 6,0° (1ª) | 9,6° (×2,4) | 15,5° · 29,1° (14ª) | 1,00 | 90° |
| R7 | 17 | 4,8° · 9,9° (1ª) | 9,5° (×2,0) | 21,2° · 29,8° (42ª) | 0,98 | 107° |
| R8 | 19 | 3,7° · 7,0° (1ª) | 12,1° (×3,3) | 23,6° · 47,4° (33ª) | 1,00 | 86° |

Con il criterio ampio Chrome vince ancora 7 su 7 (rapporto con la seconda da 2,4 a 8,1). Con il criterio lento vince in
5 su 7: in R2 e R5 ci sono solo 2 e 4 tratti e le prime assegnazioni stanno entro 1,3°.

- **Unità**: con l'assegnazione di Chrome il fattore di scala migliore è 0,94–1,10 con i criteri largo e ampio (°/s
  giusti; con il criterio lento, rotazioni piccole e pochi tratti, 1,04–1,52); letti come rad/s l'errore va a 55–117°. La matrice stimata liberamente (minimi quadrati non lineari sui 161 tratti, partendo
  dall'identità o dall'ordine del codice: stesso risultato) ha la diagonale 1,01 · 0,99 · 1,11 e il resto entro 0,05.
- **Segno**: lo stesso ordine con i tre segni girati è l'ultimo dei 48 (27,1° di media; 53,7° con il criterio ampio).
- **Terza permutazione** (x = γ, y = α, z = β): 20,3° (ampio 44,6°), come l'ordine del codice.
- **Finestre del repository (W)**: un solo tratto utile con questo metodo (Chrome 1,9°, codice 11,9°); il B73, campione
  per campione nelle stesse finestre, aveva 5–10° contro 31–98°. Coerente.
- **iPhone**: 0 registrazioni con i campioni grezzi. Non verificato.

**Controllo dal codice**: Chromium (`device_motion_event_pump.cc`: `Create(RadToDeg(gyro.x), RadToDeg(gyro.y),
RadToDeg(gyro.z))`, letto nel B71) e l'app (`CampioniNativi.java`, `SensoriNativi.java`: `giroscopio(v[0], v[1], v[2])`
nelle posizioni 0, 1, 2) danno lo stesso ordine che vince sui dati.

## 3. Il codice: ogni uso dei componenti del giroscopio

L'ingresso è uno solo: `sampleFromMotion` (`swing-detect.js:550`) mette `[r.alpha, r.beta, r.gamma]` in `rot`; l'app
(`sensori-nativi.js` `parseBatch`) dà lo stesso `rot` nello stesso ordine; `racchetta.js` `feedSample` li manda a tutti.
Legenda: **(a)** integrazione o confronto fisico con la gravità, dipende dall'ordine vero; **(b)** soglia o profilo tarato a
mano o sui dati sul risultato; **(c)** invariante: non cambia con l'ordine (moduli, prodotti scalari tra due rotazioni nello
stesso riferimento grezzo, deriva per componente sottratta nello stesso ordine).

| File · funzione | Cosa fa | Tipo |
| --- | --- | --- |
| `face-tracker.js` `feed` (riga 112): `r = [rot[1], rot[2], rot[0]] − deriva` | integra il quaternione telefono → posa di riposo, con la correzione della gravità (Mahony, `kp` 2,2/s, solo a telefono fermo e sotto 120 °/s): piatto (imbardata, apertura, rollio), storia `q`, `w`, `a` | **(a)** |
| `face-tracker.js` `headAt` (riga 147): asse `[a[1], a[2], a[0]]` | verso verticale del piatto (`he`) | **(a)** |
| `face-tracker.js` `strokeFace` | cima: rotazione attorno alla verticale tra l'istante più fermo prima del colpo e l'impatto (`yaw`), e rispetto alla posa di riposo (`abs` → `fh`) | (a) per eredità |
| `stroke-shape.js` `strokeShape` | forma del colpo dalla storia del filtro: piano, salita della testa, rollio, inclinazione del manico, velocità (`sh`) | (a) per eredità |
| `swing-detect.js` `feed`: `dTurn = w · [g2, g0, g1]` | giro attorno alla verticale del gesto (`turn`) e campioni per il verso attorno al picco (B71) | **(a)** |
| `swing-detect.js` `verticalAxis`, `verticalGesture`, `aroundVertical`, `verticalTurn` (gravità → `[g2, g0, g1]`) | gesto verticale, verso dalla verticale, verso del primo gesto della calibrazione | **(a)** |
| `swing-detect.js` `fire`: `ref = asse del profilo · [g2, g0, g1]` | quanto l'asse di calibrazione è verticale (`weakRefMin`, 28/10) | **(a)** |
| `swing-detect.js` `discard` (`up`) e `verse.up` | solo misure per il registro | (a), solo diagnostica |
| `gesture-intent.js` `canonicalTwist`: gravità → `[g2, g0, g1]` | twist del gesto (`features.twist`, messaggio `tw`), modelli della calibrazione | **(a)** |
| `racket-motion.js` `push` (computer): `[c[1], c[2], c[0]]` | racchetta a schermo quando manca il flusso del piatto | **(a)**, solo grafica |
| `swing-detect.js`: modulo, media mobile, picco a parabola, soglie `on`/`minPeak`, `along = asse · asse del profilo`, preparazione, rientro (prodotti tra rotazioni) | inizio e picco del colpo, forza, verso con l'asse di calibrazione | (c) |
| `swing-detect.js` `feedStill`/`settle`; `calibration.js` asse imparato, `S.rot`, `posAt`, `way` | deriva, rumore, asse del colpo, posizione lungo l'asse | (c) |
| `sensori-nativi.js` prova app/browser per asse; `phone-stats.js` saturazione e massimi per asse | confronti nello stesso ordine (app = Chrome) | (c) |
| `calibration.js` `verticalTurn`, `netTurn(turn)`, `templateFeatures` (twist), `faceRef` (heading) | verso del primo gesto, modelli dei colpi, centro della mira | (a) per eredità |
| Gioco: `natpf_phone_racket.js`, `natpf_gestures.js`, `natpf_trial_learn.js`, `natpf_stroke_intent.js` | **non leggono il giroscopio**: usano `fh`, piatto, `he`, `sh`, `tw`, verso, salita | (b) sui risultati |

**Dove sta la cima e come si calcola.** Sul telefono, `face-tracker.js`: il quaternione integrato dal giroscopio dà
l'orientamento rispetto alla posa di riposo (alto = gravità della calibrazione, avanti = dorso proiettato). Al colpo,
`strokeFace` prende la rotazione attorno all'alto tra l'istante più fermo 900–60 ms prima del colpo e l'impatto, e la
direzione all'impatto rispetto alla posa di riposo (`abs`, mandata come `fh`). Sul computer `createAimModel`
(`natpf_gestures.js`) tiene il centro per verso (mediana dei primi colpi, poi segue i colpi vicini) e dà lo scarto `dv` =
`fh` − centro; `faceAimFromDev` (`natpf_stroke_intent.js:196`) lo trasforma nel piatto `pf` solo tra 3° e 60°.
La «cima del telefono» come testa della racchetta virtuale (estremità che esce dal pugno, asse +y) entra nella forma del
colpo (`stroke-shape.js`). Tutto questo dipende dall'alto stimato dal filtro, quindi dall'ordine degli assi.

**Soglie (b) tarate sui risultati di oggi** (cambierebbero i numeri che vedono, non il codice): in `swing-detect.js`
`VERTICAL` (0,6 · 0,45 · 0,65), `aroundVertical` (|cos| 0,5), `verticalTurn` (0,6 · 0,35), `netTurn` (0,2), `weakRefMin` 0,1
e `weakRefTurn` 0,3 (dal 28/10, «coseno 0,29»), `VERSE` (B71, fiera del 18–19/11); `calibration.js` `CAL.netTurn`; in
`face-tracker.js` `maxAimYaw` 80°; in `natpf_gestures.js` `AIM` e le soglie della testa di `classifyPhoneShot`; in
`natpf_stroke_intent.js` `INTENT` (pallonetto, tagliato, palla corta, schiacciata: alcuni valori citano le sessioni vere
del 23, 28 e 29/10); in `gesture-intent.js` `classifyGesture` (salita 0,58, tilt −0,22 con |twist| 0,45, mira dal twist
×1,6). Queste soglie sono state provate sia sul telefono simulato (ordine W3C, fisica giusta) sia sui telefoni veri (ordine
di Chrome letto come W3C, fisica sbagliata).

## 4. Simulazione della correzione (solo parte a)

La correzione della parte (a) equivale a **riordinare la rotazione all'ingresso** solo su Android: `[r0, r1, r2]`
(x, y, z di Chrome) → `[r2, r0, r1]`, l'ordine [α(z), β(x), γ(y)] che il codice si aspetta. Motivo: gli usi (c) non
cambiano con una permutazione ciclica (è una rotazione degli assi: prodotti scalari e vettoriali restano uguali, la deriva
si calcola nello stesso ordine), e gli usi (a) diventano giusti tutti insieme. Verificato: nel telefono simulato la versione
«Chrome + riordino» dà la **stessa firma** della versione dei test di oggi. Nelle prove sui dati veri anche l'asse e la
deriva dei profili salvati sono stati riordinati allo stesso modo.

### 4.1 Registrazioni vere (R1–R3, R5–R8), catena vera di telefono e computer

Rigiocate tutte con il profilo della loro calibrazione rapida e con il profilo semplice (quello di «Salta» e della fiera),
verso atteso 0, preparazione attiva; sul computer `natpfSwingToEngine` con i modelli che imparano come in partita.

| | Profilo calibrato: oggi → corretto | Profilo semplice: oggi → corretto |
| --- | --- | --- |
| Colpi (in comune) | 213 → 217 (206) | 261 → 263 (243) |
| **Errore dell'alto del filtro** al primo istante fermo dopo il colpo, mediana · 90° | **31,1° · 89,5° → 2,6° · 5,9°** (oltre 20°: 70% → 0%) | **30,1° · 88,8° → 2,7° · 6,1°** |
| Verso cambiato | 20 su 206 (10%) | **102 su 243 (42%)** |
| Tipo di colpo cambiato | **103 su 206 (50%)** | **140 su 243 (58%)** |
| Tipi (corta · piatto · pallonetto · tagliato · top spin) | 31 · 30 · 36 · 40 · 76 → 20 · 23 · 37 · 48 · 89 | 45 · 20 · 47 · 45 · 104 → 44 · 32 · 47 · 51 · 89 |
| Cima `fh`: differenza tra le due letture, mediana per registrazione | 10–72° | 12–68° |
| Lato rispetto alla palla (giusto · opposto · senza verso) | 52 · 36 · 4 → 54 · 37 · 1 | 41 · 49 · 13 → 45 · 41 · 16 |

- Il lato «della palla» viene dall'evento `tentativo` del gioco: è un indizio debole (anche i colpi registrati allora
  erano dalla parte della palla solo 52 volte su 81).
- **Dispersione della cima** (|scarto| dal proprio centro, mediana, profilo calibrato): R1 25,5° → 53,0°, R2 24,6° →
  23,8°, R3 20,1° → 24,4°, R5 25,2° → 23,8°, R6 24,8° → 46,4°, R7 41,0° → 28,0°, R8 39,2° → 33,7°. Nel profilo semplice
  R1 29 → 47, R2 31 → 27, R3 22 → 22, R5 16 → 26, R6 45 → 53, R7 39 → 36, R8 62 → 39. **Nessun miglioramento netto**: la
  fisica giusta non rende da sola i colpi veri più costanti. (Nel profilo calibrato il centro parte dal `faceRef` della
  calibrazione di allora, calcolato con l'ordine sbagliato: penalizza un poco la versione corretta.)
- Sui 5 gesti con il nome del 28/10, con la fisica giusta l'asse di rotazione al picco ha |cos| con la verticale fra 0,11
  e 0,42 (rotazioni quasi orizzontali: polso e avambraccio, presa «dritto nel pugno»); il codice di oggi lo legge fra
  −0,20 e −0,88, con lo stesso segno per il dritto e per il rovescio.

### 4.2 Gesti veri del 28/10 (repository)

- **Impronta B66** (`phone-stats.test.mjs`): oggi 35 colpi, 9 altri, `933e330650269e1e`; corretta 35 colpi, 9 altri,
  `ddc7a2883204079e`. Cambiano 7 righe su 44, tutte nel rovescio del match point: la preparazione da 258 °/s passa da
  «corta» a «pallonetto» (6 righe) e, con la palla sul rovescio e la preparazione attiva, il rovescio da 991 °/s passa da
  verso −1 «tagliato» a **verso 0** «drive».
- **Prove del 28/10** (`session-28-10.test.mjs`): con la correzione 4 su 5 restano vere; **«il rovescio del match point è
  un rovescio» no** (con la palla sul rovescio esce verso 0; senza verso atteso resta −1).
- **Prove del B71** sui gesti veri (`b71-gesti.test.mjs`): restano vere (29 colpi invece di 23; finestra uguale a tutto il
  gesto; stessi colpi in fiera e fuori).
- **Catena intera, profilo calibrato**: verso uguale in 4 gesti su 5 (il match point perde il verso); il «pallonetto di
  dritto» diventa **pallonetto** (oggi top spin); dritto e rovescio restano top spin e tagliato; cima del match point da
  −76° a +54°.
- **Catena intera, profilo semplice**: lato giusto 3 su 5 oggi, 1 su 5 corretto (2 senza verso atteso): con questa presa
  i colpi veri non girano attorno alla verticale, e il verso del profilo semplice (giro attorno alla verticale) non li
  distingue né con l'ordine di oggi né con quello giusto.

### 4.3 Telefono simulato (`test/phone-sim.mjs` con l'ordine come opzione, braccio di `test/arm-sim.mjs`)

Presa insegnata (foto del 04/11), 12 colpi di riscaldamento, poi 40 dritti e rovesci alternati con il piatto girato di
−20…+20° prima del colpo (come `scripts/audit/colpi.mjs`), poi 4 pallonetti, 4 palle corte e 4 tagliati, per ogni seme.
V0 = ordine W3C (i test di oggi) · V1 = ordine di Chrome con il codice di oggi (il telefono Android vero) · V2 = ordine di
Chrome con la correzione. Errore della cima = |scarto letto − piatto girato|, tolto il centro di ogni verso.

| | Lato giusto | Cima: mediana · 90° (oltre 10°) | Pallonetti letti pallonetto | Corte | Tagliati |
| --- | --- | --- | --- | --- | --- |
| Gesti fissi, calibrato · V0 = V2 | 160/160 | 0,6° · 1,5° (0) | 16/16 | 16/16 | 16/16 |
| Gesti fissi, calibrato · V1 | 160/160 | 1,4° · 4,2° (0) | **0/16** (top spin) | 16/16 | **5/16** |
| Gesti fissi, semplice · V0 = V2 | 160/160 | 1,6° · 6,5° (0) | 16/16 | 16/16 | 16/16 |
| Gesti fissi, semplice · V1 | 160/160 | 2,9° · 6,9° (2) | **0/16** | 16/16 | **4/16** |
| Prese e gesti variabili (8 semi), calibrato · V0 = V2 | 320/320 | 1,3° · 3,1° (0) | 31/32 | 32/32 | 32/32 |
| Prese e gesti variabili, calibrato · V1 | 320/320 | **5,3° · 15,6° (91)** | **0/32** | 32/32 | **14/32** |
| Prese e gesti variabili, semplice · V0 = V2 | 320/320 | 3,0° · 8,3° (18) | 31/32 | 32/32 | 32/32 |
| Prese e gesti variabili, semplice · V1 | **273/320** (16 opposti, 31 senza verso) | **6,0° · 19,2° (81)** | **0/32** | 23/32 | **16/32** |

Variabili: presa inclinata di 20–50° verso l'interno e 25–60° in avanti, forza 0,6–1,5 volte, polso 0,5–1,5 volte.
Firme V0 = V2: `d2ded961afda`, `9dfad1e213d2`, `e18229e42195`, `021ee6887f34`. Nel simulato l'errore degli assi spiega
pallonetti e tagliati persi e una parte dei lati, **non** i ±58° della cima in fiera (V1 arriva a 15–19° al 90°).

## 5. Conclusione

- **Confermato: sì, per Android** (Chrome e app 1.0.5). Assegnazione vera: **x = α, y = β, z = γ**, segni positivi, °/s.
  Il codice legge x = β, y = γ, z = α. **iPhone: non verificato** (nessun dato grezzo); il codice è giusto per un
  browser che segue il W3C, e la correzione non va applicata sugli iPhone.
- **Peso**: l'errore è grande e vero (alto del filtro sbagliato di 31° a metà dei colpi, fino a 90°), ma tutto il
  riconoscimento in fiera è stato tarato con questi numeri sbagliati: correggere cambia metà delle letture dei tipi di
  colpo e quasi metà dei versi nel profilo semplice. Non è una correzione «gratis»: va provata.

## 6. Cosa cambiare (solo parte a), quando si farà il blocco

1. **Un solo punto di riordino**, solo Android, dietro un interruttore dello staff **spento di base**:
   - `site/js/tennis/motion-sign.js`: una funzione `rotazioneDelCodice(rot, ordine)` (`'chrome'` → `[rot[2], rot[0],
     rot[1]]`, `'w3c'` → `rot` com'è) e la scelta della piattaforma (Android sì; iPhone, iPad e il resto no).
   - `site/js/tennis/racchetta.js` `feedSample`: dopo `normalizeSample`, se l'interruttore è acceso e il telefono è
     Android, `k.rot` riordinato. Vale per i campioni del browser e per quelli dell'app (passano tutti di lì). **Non**
     toccare `raw` usato da `sampleStats.feed` e da `native.browser(raw)` (la prova app/browser resta nell'ordine di
     Chrome). Nel flusso diagnostico `rs` mandare la rotazione grezza con un campo che dice l'ordine, così i registri
     restano confrontabili.
   - Interruttore: dal computer come il segno di fiera del B71 (`cfg`, pannello dello stand), salvato nello stand, scritto
     nel registro (`tq`) e nel messaggio `dev` del telefono.
   - Profilo salvato (`racchetta.js:719`): si riusa solo se è stato fatto con lo stesso ordine (come `accSign`), altrimenti
     si ricalibra. Sul computer, al cambio dell'ordine, si azzerano centro della mira, salita, piatto e profilo imparato
     (come al cambio di `phoneSign`, `natpf_phone_racket.js`).
2. **Niente da cambiare** in `face-tracker.js`, `swing-detect.js`, `gesture-intent.js`, `stroke-shape.js`,
   `calibration.js`: con l'ingresso riordinato i 9 usi (a) del telefono diventano giusti insieme e gli usi (c) non
   cambiano. (In alternativa si può mettere un'opzione in ciascuno dei 9 punti: equivalente ma più facile da sbagliare.)
   Anche `racket-motion.js` sul computer diventa giusto, perché riceve la rotazione già riordinata (`sm` e pacchetto
   binario partono da `k`).
3. **Prove** (mai allentare quelle di oggi): `phone-sim.mjs` con l'opzione `order: 'chrome'`; interruttore spento → tutte le
   impronte uguali (B66 `933e330650269e1e`, B36 10 000 colpi, ecc.); interruttore acceso con il simulato Chrome →
   identico al simulato W3C di oggi; iPhone con l'interruttore acceso → niente riordino; gesti veri del 28/10 con
   l'interruttore acceso → impronta nuova `ddc7a2883204079e` come valore atteso a parte, e la prova del match point scritta
   per quello che esce (verso 0 con la palla sul rovescio) finché la taratura non è rifatta.

## 7. Rischi per il riconoscimento

- **Soglie (b) tarate sui numeri sbagliati**: con l'interruttore acceso cambiano tipo di colpo (50–58% dei colpi veri),
  verso nel profilo semplice (42%), cima (10–72° di differenza mediana). Potrebbe servire una nuova taratura di `INTENT`,
  `VERTICAL`, `VERSE` e del verso del profilo semplice, da fare **solo** con un registro nuovo con l'interruttore acceso.
- **Lato nel profilo semplice**: sui 5 gesti veri del 28/10 la fisica giusta non migliora (1 su 5 contro 3 su 5): il verso
  del profilo semplice presuppone colpi che girano attorno alla verticale, e quelle prese non lo fanno.
- **La cima non diventa da sola più costante** sui dati veri (4 registrazioni meglio, 3 peggio): la B36.1 resta ferma
  finché un registro con l'interruttore acceso non dice il contrario.
- **Profili e riferimenti imparati** con l'ordine di prima non valgono più: vanno buttati al cambio.
- **Altri browser Android** (Firefox, Samsung Internet) e **iPhone**: non provati.

## 8. Come provarlo sul telefono vero (staff)

1. Interruttore spento: tutto come oggi.
2. Telefono Android in mano, schermo verso di sé: girarlo lentamente di 90° attorno al lato lungo. Con Chrome si muove β
   (asse y): è la conferma dell'ordine (il B73 lo chiedeva già).
3. Interruttore acceso: nuova calibrazione (o scambi di prova), poi dritti, rovesci, un pallonetto e un tagliato voluti.
   Controllare che dritto e rovescio escano dal lato giusto e che il pallonetto sia letto pallonetto.
4. Una partita con la diagnostica accesa e una giornata di registro con l'interruttore acceso, prima di decidere.

## 9. Come rifare i conti

Script di sola lettura nella cartella di lavoro della sessione (non nel repository): `assi.py` (48 assegnazioni, tre
criteri, matrice stimata; Python con numpy, `python3 -I assi.py <cartella> <elenco> '<criterio json>'`), `replay.mjs`
(registrazioni vere nella catena vera, oggi e corretta), `w2810.mjs` e `b71check.mjs` (gesti del 28/10), `banco.mjs` e
`banco2.mjs` con una copia di `phone-sim.mjs` che ha l'ordine come opzione. I `.mjs` girano da `natpf-tennis` con
`node --import ./test/register.mjs <script>`. Nel blocco di correzione conviene farne prove vere (§6.3).

## 10. Non verificato

- iPhone (nessun dato grezzo), altri browser Android, telefono dello stand con Chrome 157 e l'app 1.0.5 (provato solo il
  telefono Android con Chrome 156 delle registrazioni del 28–29/10: l'ordine viene da Chromium, non dal modello).
- Niente su un telefono vero, nel browser o su Windows: solo Node e Python sui campioni registrati.
- Le intenzioni vere di chi giocava (tipo di colpo, lato, mira) non sono nei registri: i confronti dicono quanto cambia,
  non quale lettura è giusta, tranne per la fisica dell'alto (§2, §4.1).
