# B73 · Prove nel browser rotte da prima: `natpf-lob-drop` e `natpf-chi-serve`

Richiesta dell'utente del 20/11 (FIERA): «Vai avanti su 4, 6 (falli), tecnico»; «tecnico» comprende le prove nel browser
rotte da prima. Ramo `b73-prove-a` (da `natpf-simulator` 8d374b7f = 09cdac6b + documenti). File di versione e documenti
vivi non toccati. Sonde e registri delle prove nello scratchpad della sessione (`b73/prove-a/`), non nel repository.

In breve:

| prova | prima | causa | dopo |
|---|---|---|---|
| `natpf-lob-drop.mjs` | 136/137 (piedi: 80 passi su 2600 «con tutti e due i piedi in aria», 3,08 % contro 3 %) | nel **gioco**: gamba e piede della mascotte sono un pezzo solo, il piede a terra inclinato entrava nel campo con la punta o il tallone (fino a **5,8 cm**) e il suo centro saliva sopra i 5 cm; la **prova** misurava il centro della pianta e lo contava «in aria» | piede alzato quanto serve (punto più basso **−0,1 cm**), prova sul punto più basso vero: **1 passo** su 2600 con i due piedi in aria; **137/137** (§3) |
| `natpf-chi-serve.mjs` | si fermava dopo la misura del costo (oltre 10–20 minuti) | nella **prova**: 420 disegni della scena intera senza aspettare la scheda grafica, circa **25 minuti** di lavoro in coda per la grafica in software | il riquadro si misura da solo, aspettando la scheda grafica: **64/64 in 3 min 36 s**, finisce da sola |

## 1. `natpf-lob-drop.mjs`: «piedi in corsa» delle mascotte Lob e Drop

### 1.1 Cosa misura

Parte 6 (B29), partite a sorteggi fissi con i modelli 3D in campo (senza persone 3600 passi, contro la CPU e stesso schermo
2600 passi). A ogni passo, per i due personaggi, la sonda del rig (`mascotRigProbe`) dà il **centro della pianta** di
ciascun piede (il punto sotto l'attacco della gamba, nel sistema della radice: il saltello della corsa non conta). La
verifica chiedeva: centri mai sotto il campo, al più 23 cm sopra, e «tutti e due in aria, cioè la fase di volo della
corsa» (tutti e due i centri sopra 5 cm) in meno del 3 % dei passi. Il conteggio somma i due personaggi e lo divide per i
passi (80 «passi» su 2600 sono 80 passi-personaggio su 5200, l'1,5 % per personaggio): è così dal B29, non l'ho cambiato.

### 1.2 Perché superava la soglia (numeri)

Sonda nel browser (copia della prova con il contesto di ogni passo e il **punto più basso vero** di ciascun piede: i
vertici della pelle legati per almeno metà all'osso della gamba, con le ossa di quel passo), sul codice di prima:

| partita | «due piedi in aria» (centro) | di cui il motore ha davvero i due piedi alzati | di cui piede del motore a terra | due piedi in aria (punto più basso sopra 5 cm) | punto più basso dei piedi |
|---|---|---|---|---|---|
| contro la CPU | 46 su 2600 (1,77 %) | 11 (servizio, dritto e rovescio «come nel video», sulle punte) | 35 | **1** | **−4,9 cm** |
| stesso schermo | **80 su 2600 (3,08 %)** | 12 | **68** | **1** | **−5,8 cm** |

- Non è la fase di volo della corsa: nella corsa costante (sonda senza browser, 2–9 m/s in avanti, indietro e di lato) i
  passi con i due centri sopra 5 cm sono **0**, e nella corsa del motore un piede è sempre a terra
  (`player_body_animation`: alzata `max(0, sin)` per uno e `max(0, −sin)` per l'altro). Zero anche nell'esultanza, nei
  colpi da fermi e in corsa a 6 m/s, nei cambi di direzione. I due piedi alzati davvero dal motore sono i pochi passi dei
  colpi «come nel video» sulle punte (11 e 12 nella tabella), e restano anche dopo (vedi §1.4: 1 passo).
- I 68 casi dello stesso schermo: piede del motore a terra (bersaglio del rig a quota 0), gamba molto inclinata, centro
  della pianta a 5,1–6,3 cm. Più di metà nella corsa in avanti (38, di cui 21 con un dritto o un rovescio; quasi tutti a
  8–10 m/s: il Player 2 dello stesso schermo corre a 9,8 m/s), 13 di lato, 17 da fermi con i piedi larghi.
- Il rig (`natpf_mascot_rig.legTo`) inclina la gamba verso il piede (`LEG_TILT` 0,55): gamba e piede sono un pezzo solo,
  quindi si inclina anche la pianta. Per non far entrare punta o tallone nel campo alzava il piede di
  `FOOT_EDGE` (0,07 unità del modello) per unità di inclinazione, ma la pianta è lunga circa ±0,14 (dai vertici dei due
  modelli): **metà del necessario**. Con la gamba inclinata di 27° il centro sale a 5 cm e la punta resta 5 cm sotto il
  campo. Senza browser, con l'inclinazione da 10° a 40° in ogni verso: punta o tallone fino a **5,4–5,9 cm** (Drop) e
  **7,0 cm** (Lob) sotto il campo.
- La prova non vedeva la punta nel campo (guardava il centro, che sta sempre sopra) e vedeva «in aria» un piede che
  toccava il campo con la punta. Quindi: **la causa vera è nel gioco** (piede inclinato che entra nel campo), e la misura
  della prova sbagliava due volte (non lo vedeva, e contava il piede a terra come «in aria»). Non ho ricostruito commit per
  commit come i casi siano saliti dalla taratura del B29 (12/11, 0,4–2,3 %): oggi sono soprattutto corse veloci in avanti e
  colpi in corsa con i piedi larghi dei movimenti «come nel video» (B53, 15–16/11), venuti dopo (probabile, non
  verificato commit per commit).

### 1.3 Correzione

**Gioco** (`natpf-tennis/src/natpf/natpf_mascot_rig.js`):
- `soleSupport` (alla creazione del rig, una volta per personaggio): i vertici della pelle legati per almeno metà
  all'osso della gamba, nel sistema del modello rispetto al centro della pianta, ridotti a quelli che fanno da punto più
  basso con la gamba inclinata di 8, 16, 24, 32, 40, 50° in 32 versi: **81 punti** per piede (Drop), **59 e 54** (Lob).
  Creazione del rig in tutto 10–40 ms (senza browser; la parte nuova scorre una volta i vertici della gamba).
- `footRaise` (a ogni fotogramma, in `legTo`): l'alzata di prima (`FOOT_EDGE` per l'inclinazione), e di più solo quando
  non basta perché il punto più basso del piede non scenda sotto quello a riposo. Il piede alzato del passo non cambia;
  quello a terra inclinato poggia sulla punta o sul tallone invece di entrare nel campo. Costo: una manciata di prodotti
  scalari per piede, nessun oggetto nuovo per fotogramma. Senza la pelle (modello senza `SkinnedMesh`) resta `FOOT_EDGE`.
- Vale anche per le pose della card (B67/B69), che usano la stessa `legTo`: il piede si alza solo se entrerebbe nel campo.
  Prove di unità delle pose e dei balletti (`natpf-b67-mascotte-pose`, `natpf-b69-balletti`, `natpf-mascotte-3d`,
  `natpf-b40-esultanza`) verdi. **Per l'unione con `b73-mascotte`** (passi nella card): se quel ramo cambia `legTo` o
  `poseFoot` in `natpf_mascot_rig.js`, tenere la riga `_K.y += footRaise(side, _qt)` al posto di quella con `FOOT_EDGE`.

**Prova** (`tools/e2e/natpf-lob-drop.mjs`):
- `window.__feetLow(attore)`: punto più basso vero di ciascun piede (vertici della pelle legati alla gamba, con le ossa di
  adesso), nel sistema della radice. Non sorteggia e non tocca il gioco (impronte delle partite uguali, vedi §1.4).
- Partite: «mai sotto il campo» e «tutti e due in aria» dal punto più basso vero (più severa di prima: ora vede la punta
  nel campo); l'alzata massima (23 cm) resta misurata al centro della pianta come prima; nel registro anche il conteggio
  «in aria» con il centro, la misura di prima. Pose: «mai sotto» dal punto più basso vero, l'alzata come prima.
- Soglie **non cambiate** (−0,5 cm, 23 cm, 3 %).

**Prova di unità** nuova `natpf-tennis/test/natpf-b73-piedi.test.mjs` (4): punti del piede nei due modelli e lati; con la
gamba inclinata fino a 40° in ogni verso il punto più basso vero resta sul campo (al più 3 mm sotto il riposo) e con la
correzione di prima no (oltre 3 cm); piede alzato invariato; in campo (corsa a 9 m/s in avanti e di lato, dritto e
rovescio in corsa, cambi di direzione) punto più basso sopra −0,5 cm e passo alto come prima; niente allocazioni.

### 1.4 Numeri prima / dopo

Senza browser (`engineOf` delle prove di unità, Drop, punto più basso vero dei piedi, metri nel sistema della radice):

| caso | punto più basso prima | dopo | piede alzato al più (prima = dopo) | centro della pianta al più (prima = dopo) |
|---|---|---|---|---|
| corsa in avanti 5 m/s | −0,4 cm | 0,0 | 6,9 cm | 13,3 cm |
| corsa di lato 5 m/s | −1,0 cm | 0,0 | 8,2 cm | 8,5 cm |
| corsa in avanti 9 m/s | −1,1 cm | 0,0 | 11,2 cm | 20,5 cm |
| corsa di lato 9 m/s | −2,0 cm | 0,0 | 14,8 cm | 16,5 cm |
| dritto / rovescio in corsa in avanti 9 m/s | −1,8 cm | 0,0 | 10,3 / 10,1 cm | 19,8 / 20,0 cm |
| cambi di direzione 9 m/s | −2,8 cm | 0,0 | 14,8 cm | 20,1 cm |

(Una prima versione alzava il piede solo del necessario, senza tenere `FOOT_EDGE`: punta mai nel campo, ma il passo in
avanti a 9 m/s scendeva da 11,2 a 5,5 cm, piede che strisciava. Scartata: ora il passo è identico a prima.)

Nel browser, `TRE_D=1` (parti 6 e 5), stessa macchina:

| | prima | dopo |
|---|---|---|
| partita senza persone: punto più basso dei piedi / due piedi in aria | (centro: 41 su 3600) | −0,1 cm / **2** su 3600 (con il centro: 276) |
| contro la CPU | −4,9 cm (sonda) / 1 (sonda); centro: 46 su 2600 | −0,1 cm / **1** su 2600 (con il centro: 453) |
| stesso schermo | −5,8 cm (sonda) / 1 (sonda); centro: **80 su 2600, KO** | −0,1 cm / **1** su 2600 (con il centro: 440) |
| centro della pianta al più | 22,0 · 22,0 · 20,7 cm | 22,0 · 22,0 · 20,7 cm |
| pose: punto più basso / centro al più | (centro da 1,8 cm) / 22,4 cm | 0,0 / 22,4 cm |
| impronte delle partite (uguali a «Classici», il gioco non cambia) | uguali | uguali |
| `TRE_D=1` | **50/51** (17 min) | parte 6 tutta verde; parte 5 vedi sotto |

`TRE_D=1` dopo la correzione: 50/51 al primo giro, con il KO su «3D, fotogrammi al secondo non peggiorati rispetto alle
mascotte nel codice» (0,38 contro 0,49), mentre giravano insieme le prove del gioco, quelle del sito, la build e una
sonda (carico 12 su 4 core). Rifatta da sola (`COSTO=1`, carico 1,8): **15/15**, modelli 3D 0,85 contro 0,86 nel codice,
disegno dello stesso fotogramma 1063 ms contro 1087 ms. Il conto in più del rig è di 81 prodotti scalari per piede a
fotogramma, niente rispetto a un disegno di un secondo.

Con il centro della pianta i passi «in aria» dopo la correzione salgono a 276–453: il piede a terra inclinato ora poggia
sulla punta e ha il centro più in alto. È la prova che il centro non dice se un piede è in aria (la punta tocca il campo);
la soglia del 3 % resta, sul punto più basso vero.

**Nel campo vero** (sistema del mondo, cioè con il saltello della corsa che il motore dà alla radice: quello che si vede),
stessa sonda, stesse partite (impronte uguali prima e dopo):

| partita | piede più basso prima | dopo | passi-personaggio con un piede sotto il campo di più di 1 cm (2 cm), prima | dopo |
|---|---|---|---|---|
| contro la CPU | −3,9 cm | 0,0 | 231 (36) su 5200 | 0 (0) |
| stesso schermo | −3,5 cm | 0,0 | 230 (47) su 5200 | 0 (0) |

Quindi la punta nel campo si vedeva davvero (meno che nel sistema della radice, perché nei passi più inclinati della
corsa la radice è in alto per il saltello), e ora non più.

Schermate (camera di lato, vicina ai piedi, Lob al passo 619 dello stesso schermo e al passo 209 contro la CPU, prima e
dopo, guardate; nello scratchpad, non nel repository): in quei due passi tutto il personaggio è in aria per il saltello
della corsa; dopo, il piede dietro è un poco più alto e meno puntato verso il campo, il resto uguale. Differenza piccola a
vista in quei passi; le volte in cui la punta si vedeva nel campo (tabella qui sopra) sono passi con il saltello basso,
non classificati uno per uno.

Prova completa: vedi §3.

## 2. `natpf-chi-serve.mjs`: si fermava dopo la misura del costo

### 2.1 Cosa succedeva

Nel caso «Lob & Drop contro la CPU», dopo i due servizi, la prova misura il costo del riquadro di servizio a terra
(B37.1, B45.2): 20 giri, ognuno con il riquadro spento e acceso, 10 disegni della scena intera per misura, più 2 di prova:
**420 disegni** di fila in un solo `page.evaluate`, cronometrati senza mai aspettare la scheda grafica. Il caso dopo è
«Lob & Drop, computer del Player 2»: `atServe` non tornava più (descritto in `docs/b72/unione.md` §3, anche su
`b4fb3446`).

### 2.2 Causa (numeri, macchina a 4 core condivisa)

- Copia della prova con un cane da guardia (`Debugger.pause` dopo 30 s): il comando del debugger non viene mai servito;
  il thread principale della pagina dorme in `futex_do_wait` con il tempo di CPU fermo, il processo grafico di Chromium è
  al 128–130 % con i quattro thread di SwiftShader occupati. Fermato a mano dopo **oltre 10 minuti**: la pagina non era in
  un ciclo, aspettava la scheda grafica.
- Sonda dei disegni (1920×1080, Lob & Drop, al servizio): un disegno della scena intera **aspettando** la scheda grafica
  (`readPixels` di un pixel) costa **3,0–4,6 s** (1,4 milioni di triangoli, antialias; 1,5–2 s anche con un solo pixel da
  riempire: è il lavoro sui vertici); senza aspettare il disegno «costa» **3,35 ms**, il tempo per mandare i comandi; 10
  disegni mandati senza aspettare si smaltiscono in **36,2 s**. Quindi i 420 disegni della misura lasciavano circa
  **25 minuti** di lavoro in coda, e il primo comando che aspetta la scheda grafica (nel caso del computer del Player 2)
  restava fermo fino alla fine della coda. Su una macchina meno carica la coda è più corta: probabilmente per questo il
  ramo «avversario» del B72 aveva fatto 64/64 (non rifatto).
- Anche la misura stessa non era quella dichiarata: «costo del disegno con la grafica in software» misurava solo il
  processore principale (5,5 ms «a disegno» contro i 3–4,5 s veri).

Causa nella **prova**, non nel gioco: nel gioco si disegna un fotogramma per `requestAnimationFrame`, e la coda non cresce.

### 2.3 Correzione (`tools/e2e/natpf-chi-serve.mjs`, funzione `cost`)

- Il riquadro si misura **da solo**, con la stessa camera: una scena con il solo riquadro contro una scena vuota (stesso
  fondo e nebbia), 20 giri alternati da 10 disegni come prima, mediana delle differenze di ogni giro (B45.2). Prima di ogni
  misura si aspetta la scheda grafica (`readPixels`, fuori dal tempo misurato): non resta niente in coda. Poi il riquadro
  torna nella scena al suo posto.
- La verifica resta la stessa, **1 ms in più per disegno sul processore principale** (three.js e comandi WebGL: quello che
  misurava anche prima), con la frase che lo dice. Nel registro della prova anche lo stesso confronto aspettando la
  scheda grafica dopo ogni disegno e il disegno della scena intera, per la proporzione.
- Le verifiche restano 64.

### 2.4 Numeri prima / dopo

| | prima | dopo |
|---|---|---|
| prova completa | ferma dopo 36/36 (b72: oltre 20 min; qui oltre 10 min, fermata a mano) | **64/64 in 3 min 36 s**, finisce da sola |
| costo del riquadro, processore principale | +0,2 ms (scena intera, 420 disegni senza aspettare) | **+0,17–0,18 ms** (riquadro da solo) |
| costo del riquadro aspettando la scheda grafica (solo registro) | non misurato | +7,8–9,0 ms a disegno, su 1,45–2,4 s della scena intera (0,4–0,5 %) |

Nota: con la grafica in software a 1920×1080 il riquadro trasparente costa davvero circa 8–9 ms di riempimento a
disegno, più di 1 ms; ma la scena intera ne costa 1,5–4,5 s, e la soglia di 1 ms (B37.1) è stata fissata su misure che
erano solo del processore principale. Non l'ho cambiata e non l'ho spostata sul tempo della scheda grafica: lo dico qui
perché si sappia. Con una scheda grafica vera (PC dello stand) non misurato.

## 3. Prove

Sul ramo `b73-prove-a` (macchina a 4 core condivisa con altri agenti; carico indicato dove conta):

- Gioco `npm test`: **1919/1919** (1915 di prima + 4 di `natpf-b73-piedi`). Prove delle mascotte da sole dopo l'ultimo
  ritocco: 37/37.
- Sito `node --test tools/test/*.test.mjs`: **322/322**. Build del gioco: riuscita.
- `natpf-chi-serve.mjs`: **64/64 in 3 min 36 s** (prima: ferma dopo la misura del costo); `COSTO=1`: 3/3 in 23 s.
- `natpf-lob-drop.mjs TRE_D=1` (parti 6 e 5): parte 6 tutta verde (partite: punto più basso −0,1 cm, 2 · 1 · 1 passi
  con i due piedi in aria, impronte uguali a «Classici»); parte 5 da sola (`COSTO=1`) **15/15** (vedi §1.4 per il KO
  sotto carico del primo giro).
- `natpf-lob-drop.mjs` completa, primo giro (carico 6–9): **117 verifiche su 117 fatte, nessun KO**, poi «Target crashed»
  (la pagina di Chromium caduta) nella parte 7, al primo caso Lob & Drop contro la CPU (gioco a 1280×720 con il ciclo del
  gioco acceso, 20 fotogrammi), dopo 14 min. Parte 7 rifatta da sola (`SERVIZIO=1`): **13/13** in 8 min. Con la parte 5
  da sola (`COSTO=1`, 15/15) sono coperte tutte le 137 verifiche (117 + 6 della parte 7 + 14 della parte 5).
  Secondo giro: fermato dopo 2,5 min con il browser chiuso, il disco della macchina pieno (`/`, 99–100 %, spazio occupato
  da altri lavori della sessione, non da questa prova): non conta. Terzo giro uguale (fermo dopo 2 min 20 s, disco a 11 MB
  liberi). La parte 1b da sola (`TESTA=1`), dove si erano fermati: 19/19. **Quarto giro completo, finito da solo:
  137/137 in 26 min 57 s** (punto più basso dei piedi −0,1 cm nelle tre partite, 2 · 1 · 1 passi con i due piedi in
  aria; fotogrammi al secondo: classici 0,51, mascotte nel codice 0,63, modelli 3D 0,73 nel giro migliore).
- Sonde (nello scratchpad della sessione, `b73/prove-a/`): `lobdrop-sonda.mjs` (contesto dei passi, punto più basso
  vero, nel sistema della radice e del mondo, schermate dei piedi), `node/*.mjs` (corsa e colpi senza browser, geometria
  della pianta, stima della correzione), `chi-serve-repro.mjs` (blocco con il cane da guardia), `gpu-coda.mjs` e
  `gpu-riquadro.mjs` (tempi dei disegni e coda della scheda grafica).

## 4. Non verificato

- Schede grafiche vere, ledwall, programma Windows: le prove sono con la grafica in software di Chromium.
- L'aspetto del piede che poggia sulla punta o sul tallone: guardato solo in due schermate ravvicinate (§1.4), non in
  movimento né sul ledwall; le pose della card (B67/B69) provate solo dalle prove di unità.
- Causa del «Target crashed» del primo giro completo di `natpf-lob-drop` (pagina caduta, non un KO): non dimostrata;
  probabilmente il disco pieno della macchina, come nei due giri dopo (fermati con il disco a pochi MB liberi). La stessa
  parte da sola è verde e il quarto giro completo è 137/137.
- Telefono vero: non c'entra (nessun cambiamento ai gesti).
