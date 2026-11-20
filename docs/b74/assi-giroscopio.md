# B74 · «Assi del giroscopio: Come oggi · Corretti (prova)» (20/11/2026)

Prodotto: **FIERA**. Decisione dell'utente del 20/11: «Verifica e correzione spenta». La verifica è in
`docs/b74/verifica-assi.md` (confermata per Android). Questo documento è **la correzione**: un interruttore dello staff,
**spento di base**, che corregge l'ordine degli assi del giroscopio solo sui telefoni Android. Da provare sul telefono vero
prima di lasciarlo acceso (§3).

## In breve

- **Il problema**: Chrome su Android (e l'app NATPF Racchetta 1.0.5, che copia Chrome) manda la rotazione con α attorno a
  x, β attorno a y, γ attorno a z. Il codice del telefono la legge come α attorno a z, β attorno a x, γ attorno a y (W3C).
  Così l'orientamento del telefono calcolato dal giroscopio è sbagliato: dopo un colpo l'«alto» stimato sbaglia di 31° a
  metà dei colpi (fino a 90°).
- **La correzione**: un riordino della rotazione **in un punto solo**, appena arriva dal sensore (`[x, y, z]` → `[z, x, y]`),
  solo su Android, solo con l'interruttore acceso. Tutto il resto del codice (filtro d'orientamento, rilevatore, soglie,
  gioco) non cambia.
- **Spento («Come oggi», di base)**: il gioco è identico byte per byte (provato: impronta dei gesti veri, telefono simulato,
  messaggi al telefono, righe «partita» del registro; cambia solo il numero del formato nella riga «avvio», 5).
- **Acceso («Corretti · prova»)**: i telefoni Android rifanno la calibrazione e leggono la rotazione giusta; iPhone come
  prima. Le soglie dei colpi sono tarate sui numeri di oggi: **cambia la lettura di molti colpi** (§4, §6).
- **Worker del registro: da ricaricare** (campo nuovo `assi`, formato delle righe 5). Senza ricaricarlo il gioco funziona
  lo stesso e il Worker toglie solo il campo nuovo.

## 1. Cosa cambia con l'interruttore acceso

| Dove | Con «Come oggi» (di base) | Con «Corretti · prova» |
| --- | --- | --- |
| Pannello dello stand | voce «Assi del giroscopio · Come oggi» | «Assi del giroscopio · Corretti · prova», accesa (gialla) |
| Computer → telefono (`cfg`) | come prima, niente di nuovo | `ax: 1` (i telefoni di prima lo ignorano) |
| Telefono Android (Chrome, app 1.0.5, Samsung Internet) | rotazione com'è | rotazione riordinata all'ingresso; profilo e posa di riposo rifatti (ricalibrazione) |
| iPhone, iPad, computer | rotazione com'è | rotazione com'è (riceve l'interruttore e lo dice al computer) |
| Telefono → computer (`dev`) | come prima | `ax: 1` riordinata, `ax: 0` lasciata com'era |
| Computer | — | al cambio dell'ordine del telefono ripartono centro della mira, salita, piatto e quanto imparato dagli scambi di prova |
| Registro, riga «partita» | come prima | `stand.assi: 'corretti'`; `tel.assi` / `tel2.assi`: `'corretti'` (Android) o `'oggi'` (iPhone) |
| Flusso diagnostico `rs` | rotazione del sensore | rotazione del sensore + `o: 'c'` (i rigiocatori la riordinano) |

**Vale subito**: i telefoni collegati ricevono l'interruttore al fotogramma dopo il clic. Un telefono Android che cambia
ordine butta il profilo e torna a calibrare (con «Calibrazione: Giocando», quella della fiera, il profilo semplice arriva
da solo in un attimo; con «Con i gesti» vanno rifatti i gesti). Meglio cambiarlo **tra un giocatore e l'altro**, non a metà
partita. Resta salvato sul PC (`natpf-tennis.assiGiroscopio`); il chiosco e «Nuovo giocatore» non lo toccano. Sul
telefono l'ultimo valore ricevuto resta nella scheda (pagina ricaricata: niente ricalibrazione inutile).

**Codice** (solo il punto d'ingresso, la verifica §6):
- `site/js/tennis/motion-sign.js`: `isAndroid`, `rotOrderFor(acceso, telefono)` (Android dal nome del browser o da
  `userAgentData.platform`), `codeRotation` / `rawRotation`, `normalizeSample(k, segno, ordine)` (con l'ordine `'w3c'`
  restituisce lo stesso campione di prima).
- `site/js/tennis/racchetta.js`: `cfg ax` → `setAxes`; `feedSample` riordina `k` (non `raw`: misure del registro, prova
  app/browser e flusso `rs` restano nell'ordine del sensore); profilo salvato riusato solo con lo stesso ordine (`ro`);
  `dev ax`.
- `site/js/tennis/link.js` (computer): `dev ax` → `device.axes`, `rs o` → `raw.o`.
- `natpf-tennis/src/natpf/natpf_gyro_axes.js` (interruttore), `natpf_kiosk.js` (voce del pannello), `index.html`,
  `natpf_phone_racket.js` (`cfg ax`, `_axesSeen`), registro (`registro_formato.js`, `registro_registratore.js`,
  `cloudflare/registro-worker.js`, `scripts/registro/riassunto.mjs`), diagnostica (`tel.assi`, `o` nei campioni),
  rigiocatori `scripts/audit/replay-recording.mjs` e `zip-replay.mjs`.
- **Non toccati**: `face-tracker.js`, `swing-detect.js`, `gesture-intent.js`, `stroke-shape.js`, `calibration.js`,
  `racket-motion.js`, tutte le soglie del gioco, il tutorial e le sue dimostrazioni (gli algoritmi dei gesti non cambiano:
  cambia solo l'ordine dei numeri che ricevono su Android).

## 2. Come si accende (solo mouse)

1. Pannello dello stand: tieni premuto **3 secondi** il marchio NATPF in alto a sinistra nel menu (oppure Ctrl+Maiusc+K, F9
   nel programma Windows, o ❚❚ tenuto 3 s in campo).
2. Clic su **«Assi del giroscopio · Come oggi»** (tra «Direzione dei colpi» e «Mira del telefono»): diventa **«Corretti ·
   prova»**, gialla. L'avviso dice «Solo i telefoni Android, che rifanno la calibrazione; iPhone come prima».
3. Per tornare indietro: un altro clic, torna «Come oggi».

## 3. Come lo prova lo staff sul telefono vero

Serve: il PC dello stand, un telefono Android con l'app NATPF Racchetta 1.0.5 (o Chrome), e se c'è un iPhone. Diagnostica
facoltativa (Pannello → «Diagnostica» → Registra) per avere i campioni.

**A. Con «Come oggi» (prima, per confronto), 2 minuti**
1. Collega il telefono, calibrazione «Giocando», entra in **Allenamento** (o una partita contro l'avversario).
2. Tieni il telefono dritto come un manico, schermo verso di te, cima in alto. **Gira il polso piano verso destra e verso
   sinistra** (come per mirare), senza inclinarlo. Guarda la racchetta a schermo.
   - Atteso con l'ordine sbagliato (non provato su un telefono vero; nel telefono simulato, prova `natpf-b74-assi`): la
     racchetta **non gira** (0° invece di 45°) e si inclina in avanti o indietro di 20–27° (il gioco crede che il telefono
     si sia inclinato; la gravità poi lo rimette piano a posto).
3. Fai 4 dritti, 4 rovesci, 2 pallonetti (dal basso verso l'alto) e 2 tagliati (dall'alto verso il basso). Annota cosa
   esce (scritta del colpo a schermo: lato e tipo).

**B. Con «Corretti · prova»**
1. Pannello → «Assi del giroscopio» → «Corretti · prova». Il telefono Android torna a calibrare da solo e poi è pronto
   (con «Giocando» non serve fare niente).
2. Rifai il punto A.2: **atteso** che la racchetta a schermo **giri a destra e a sinistra come il telefono**, senza
   inclinarsi (nel telefono simulato: −45°, +45°, 0°, come il telefono).
3. Rifai gli stessi colpi del punto A.3. Guarda:
   - **dritto e rovescio** dal lato giusto (il lato non deve peggiorare);
   - **pallonetto letto «Pallonetto»** (nel telefono simulato, con l'ordine sbagliato tutti i pallonetti erano letti top
     spin; con quello giusto tutti pallonetti) e **tagliato letto «Tagliato»**;
   - in **Precision** (Minigiochi), girando il piatto verso la zona chiesta: la palla va dalla parte giusta più spesso?
4. **iPhone** (se c'è): con l'interruttore acceso **non deve cambiare niente** (niente ricalibrazione, stessi colpi).
5. Rimetti «Come oggi» se qualcosa va peggio, e scrivilo (o manda la diagnostica).

**C. Prima di lasciarlo acceso per tutti**: una giornata di registro con l'interruttore acceso (Worker ricaricato, §5).
Il riassunto (`scripts/registro/riassunto.mjs`) scrive in «Sensori del telefono» quante partite avevano «Corretti (prova)»
e cosa hanno fatto i telefoni (riordinati, come oggi, senza risposta). Con quei numeri si decide se ritarare le soglie dei
tipi di colpo e del verso (la verifica §7) e se accenderlo di base.

## 4. Numeri prima e dopo

Dalla verifica (`docs/b74/verifica-assi.md`, 7 registrazioni vere del 28–29/10, Android con Chrome 156):

| | Ordine di oggi (spento) | Ordine giusto (acceso) |
| --- | --- | --- |
| Gravità ruotata con il giroscopio, 161 tratti: errore medio · 90° | 20,7° · 39,2° (30ª di 48) | **5,2° · 10,5°** (1ª di 48) |
| Alto del filtro al primo istante fermo dopo il colpo, mediana · 90° | 31,1° · 89,5° | **2,6° · 5,9°** |
| Tipo di colpo cambiato (profilo calibrato · semplice) | — | 50% · 58% dei colpi |
| Verso cambiato (profilo calibrato · semplice) | — | 10% · 42% dei colpi |
| Dispersione della cima | — | nessun miglioramento netto (4 registrazioni meglio, 3 peggio) |

Dalle prove di questo blocco (ripetibili, nel repository):

| Prova | Spento | Acceso (Android) |
| --- | --- | --- |
| Alto del filtro dopo il colpo, gesti veri del 28/10 (18 istanti quasi fermi), `tools/test/b74-assi.test.mjs` | mediana 81,9°, peggiore 108,6° | **mediana 7,5°, peggiore 19,8°** |
| Impronta B66 dei gesti veri del 28/10 (35 colpi, 9 altri) | `933e330650269e1e` (come prima) | `ddc7a2883204079e` (attesa a parte) |
| Rovescio del match point, palla sul rovescio, preparazione | verso −1, tagliato | **verso 0, drive** (scritto così finché non si ritara) |
| Telefono simulato con la rotazione di Chrome (presa della foto, 12 colpi + 4 pallonetti + 4 corte + 4 tagliati), `natpf-tennis/test/natpf-b74-assi.test.mjs` | pallonetti 0/4 (letti top spin), tagliati 1/4 | **identico al telefono simulato di sempre**: pallonetti 4/4, corte 4/4, tagliati 4/4, messaggi uguali numero per numero |
| Polso girato piano di 45° a sinistra, 90° a destra, 45° indietro, telefono simulato con la rotazione di Chrome (la prova §3) | il piatto non gira (0°), si inclina di 20–27° | **gira di −45°, +45°, 0°** come il telefono, identico al simulato di sempre |
| iPhone simulato con l'interruttore acceso | — | identico a spento |

## 5. Registro e Worker (da ricaricare)

- Campo nuovo **`assi`** nella riga «partita»: `stand.assi: 'corretti'` con l'interruttore acceso (spento: niente, riga
  identica a prima); `tel.assi` / `tel2.assi`: `'corretti'` (telefono che riordina), `'oggi'` (telefono che ha ricevuto
  l'interruttore e non riordina: iPhone e gli altri); senza = interruttore spento o pagina del telefono di prima.
- **Formato delle righe 5** (era 4). Il Worker `natpf-tennis/cloudflare/registro-worker.js` va ricaricato una volta, come
  per il B71 (`docs/GUIDA_REGISTRO_CLOUDFLARE.md`): dopo il Deploy la pagina dice «Formato delle righe: 5 (… dal B74 gli
  assi del giroscopio)». Un Worker non ricaricato accetta le righe e toglie solo `assi` (provato in
  `registro-worker.test.mjs`).

## 6. Rischi

- **Soglie tarate sui numeri sbagliati**: con l'interruttore acceso cambiano il tipo di colpo (50–58% dei colpi veri) e il
  verso nel profilo semplice (42%). Potrebbe servire ritarare `INTENT`, `VERTICAL`, `VERSE` e il verso del profilo semplice,
  **solo** con un registro nuovo con l'interruttore acceso.
- **Profilo semplice (fiera)**: sui 5 gesti veri del 28/10 il lato giusto scende da 3/5 a 1/5 (quelle prese non girano
  attorno alla verticale); il simulato invece resta 320/320.
- **La cima non diventa da sola più costante** sui colpi veri: la B36.1 resta ferma.
- Un cambio a metà partita fa ricalibrare il telefono Android: cambiarlo tra un giocatore e l'altro.

## 7. Prove fatte (Node e browser senza telefono)

- Gioco: `natpf-b74-assi.test.mjs` (9 prove: opzione, pannello, cfg, `dev ax`, registro, simulato Chrome = W3C, simulato
  Chrome spento perde i pallonetti, iPhone invariato, polso girato della prova dello staff); `registro-worker.test.mjs` (formato 5, Worker del 20/11 che toglie
  solo `assi`); `registro-riassunto.test.mjs`; `natpf-registro.test.mjs` (formato 5).
- Sito: `tools/test/b74-assi.test.mjs` (6 prove: piattaforme, riordino, alto del filtro sui gesti veri, impronte, codice di
  racchetta.js, link.js); `sensori-nativi.test.mjs` aggiornato alla riga nuova di `feedSample`.
- Browser: `natpf-menu` (voce in vista e cambiata con il clic a 1366 × 657, 1024 × 600, 1280 × 720, 1024 × 1024 e 720 ×
  720, «Chiudi» in vista), `natpf-stesso-schermo-b20` e `-b25` (21 pulsanti dal B74), `gesture-calibration`, `phone-only`,
  `timing-browser`, `natpf-sensori-nativi`. **Dalla revisione (§9) anche** `natpf-pannello-cadute` (righe delle cadute,
  web e programma, opzioni spente e accese, dal B74 anche 1536 × 864 e 1600 × 900 e un telefono a 1280 × 720) e
  `natpf-stand-layout` (puntatore su ogni voce, 24 varianti, con `SIZES` che comprenda 1280x720 e 1536x864): le prove
  elencate qui sopra non hanno le righe delle cadute, per questo la quinta fila a 1280 × 720 non era venuta fuori.
- Esiti (20/11): gioco 1965/1965, sito 328/328, LAN 13/13, programma Windows 56/56, build ok; nel browser natpf-menu 71/71,
  natpf-stesso-schermo-b20 52/52, -b25 57/57, gesture-calibration 21/21, phone-only 10/10, timing-browser 8/8,
  natpf-sensori-nativi 16/16.
- Esiti dopo la revisione (20/11, `1feda124`, §9): gioco 1967/1967, sito 328/328, LAN 13/13, programma Windows 56/56,
  build ok; nel browser natpf-pannello-cadute 45/45, natpf-stand-layout 72/72 (1280x720, 1366x657, 1536x864, 24 varianti),
  natpf-menu 71/71, natpf-stesso-schermo-b20 52/52, -b25 57/57.

## 8. Non verificato

- **Niente su un telefono vero**: né Android né iPhone; il comportamento atteso al §3 (racchetta che gira con il polso) è
  dedotto dal codice e dai campioni registrati, non visto.
- iPhone: l'ordine di Safari non è verificato (nessun campione grezzo); il codice lo lascia com'era.
- Altri browser Android (Firefox; Samsung Internet è Chromium): trattati come Chrome (riordino), non provati.
- Telefono dello stand con Chrome 157 e app 1.0.5: non provato (la verifica è su Chrome 156; l'ordine viene da Chromium).
- Programma Windows installato e ledwall: non provati (solo il browser di prova).
- Worker non ricaricato (lo fa l'utente).
- Pannello dello stand **sotto i 1000 px di larghezza e bassi** (800 × 600, 960 × 540): scorre, «Chiudi» fuori; era già
  così sulla base (natpf-simulator) in 9 casi su 12 della sonda della revisione, con la 21ª voce scorre di più (§9.1).
  Nessuna prova del repository ha queste misure; non toccato.

## 9. Revisione

Dopo la correzione una revisione (due scettici per rilievo) ha confermato **due rilievi**. Li ho corretti sul ramo
`b74-assi`, un commit per rilievo («B74 sistemazione: …»), **niente push**, file di versione e documenti vivi non toccati.
Per ognuno prima la prova rossa, poi la correzione; per S1 ho seguito la correzione dello scettico 1, più completa di quella
del rilievo. Sonde e registri fuori dal repository, in
`/tmp/claude-0/-home-user/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b74/sist/`.

| # | Rilievo | Commit | Cosa cambia | Prova |
|---|---|---|---|---|
| S1 | il pannello dello stand torna a scorrere a 1280 × 720 con la riga delle cadute (importante) | `1feda124` | CSS del pannello, due prove nel browser, una in node | `natpf-pannello-cadute` 31/45 prima, 45/45 dopo; `natpf-b74-assi` (prova nuova) rossa prima, verde dopo |
| S2 | l'avviso del riassunto dice «formato 4» e «Formato delle righe: 4», il Worker da caricare dice 5 (minore) | `37d37597` | testo del riassunto, guida del registro | `registro-riassunto` 17/21 prima, 21/21 dopo |

### 9.1 Pannello dello stand con 21 voci (rilievo S1)

**Difetto.** Con «Assi del giroscopio» le voci della griglia del pannello sono 21 (erano 20). A 1280 × 720 la griglia ha
cinque colonne (regola del B51): la 21ª voce faceva una quinta fila con «Mira del telefono» da sola e, con le righe delle
cadute dei telefoni, il foglio scorreva: 1 px con due telefoni e le opzioni spente, 6 px con un telefono e le opzioni accese,
22 px con due telefoni e le opzioni accese; il bordo del foglio passava sopra «Telecomando dello staff». Lo scettico 1 ha
trovato di più: tra 801 e 900 px di altezza (1536 × 864, cioè 1920 × 1080 con la scala di Windows al 125 %, 1440 × 900,
1600 × 900) la griglia ha quattro colonne (regola del B20) e le file diventavano sei: il foglio scorreva di 18 px anche senza
cadute e fino a 72–80 px con le cadute, «Chiudi» fuori. Le prove nel browser del §7 non hanno le righe delle cadute: per
questo non era venuto fuori. È il ritorno del difetto 8 della B41.3.

**Correzione** (`natpf-tennis/natpf-ui.css`, in fondo al blocco del B51; quella dello scettico 1). Dai 1000 px di larghezza
dell'area del gioco: fino a 800 px di altezza **sei colonne** in un foglio largo fino a 1500 px; sopra gli 800 px **cinque
colonne** in un foglio largo fino a 1250 px. Quattro file da sei, cinque da cinque (posto per 24 e 25 celle; con la cella
degli sblocchi del B51 sono 22). Le sole sei colonne nel foglio di 1000 px proposte nel rilievo non bastavano: le scritte
andavano su tre righe e il foglio scorreva ancora (27 px, misura dello scettico 1). Sotto i 640 px di altezza restano le sei
colonne con le scritte più piccole del B51. A 1920 × 1080 il foglio è più largo di prima (1250 px invece di 1000, cinque
colonne invece di quattro). Commenti del CSS aggiornati.

**Prove.**
- `tools/e2e/natpf-pannello-cadute.mjs`: misure in più 1536 × 864 e 1600 × 900, un telefono caduto anche a 1280 × 720, e
  «Telecomando dello staff» dentro il foglio fra i controlli (nessun controllo tolto). Prima della correzione 31/45 (KO a
  1280 × 720, 1536 × 864 e 1600 × 900, web e programma), dopo 45/45.
- `natpf-tennis/test/natpf-b74-assi.test.mjs`, prova nuova: le 21 voci di `index.html` e l'ultima regola per le due aree
  (sei colonne e 1500 px fino a 800 px di altezza, cinque e 1250 px sopra, dopo le regole del B20 e del B51). Con il CSS di
  prima rossa (5 colonne invece di 6), dopo verde. Una 25ª voce la fa diventare rossa: vuol dire rifare le due prove nel
  browser.
- `tools/e2e/natpf-stand-layout.mjs` (puntatore su ogni voce e tra le voci): misure di base anche 1280x720 e 1536x864.
  Dopo la correzione 72/72 a 1280x720, 1366x657 e 1536x864 con le 24 varianti (fiera, cadute 0/1/2, opzioni, programma).
- `natpf-menu` 71/71, `natpf-stesso-schermo-b25` 57/57, `natpf-stesso-schermo-b20` 52/52. Al primo giro -b20 ha dato 50/52:
  i due KO erano sull'icona del lancio al servizio a 1280 × 720 in partita (la metà sinistra senza icona), fuori dal
  pannello; rifatta, 52/52.
- Sonda della revisione (19 misure da 720 × 720 a 2560 × 1440, sei casi: programma con due telefoni caduti e le opzioni
  accese, con e senza modalità fiera, web con un telefono, programma senza niente, web con le opzioni, web con due telefoni):
  casi KO **10 su 114 sulla base** (natpf-simulator), **28 sul ramo prima**, **10 dopo**. Dopo, tutti i KO sono sotto i 1000
  px di larghezza (800 × 600 e 960 × 540): sulla base erano già KO 9 su 12 (960 × 540 anche senza cadute); il caso nuovo è
  800 × 600 web con un telefono e le opzioni accese. Migliorato rispetto alla base: 1536 × 864 programma, fiera, due telefoni
  e opzioni (sulla base scorreva di 8 px). Le misure sotto i 1000 px non le ho toccate (§8).
- Schermate guardate: 1280 × 720 (quattro file da sei, nell'ultima «Direzione dei colpi», «Assi del giroscopio», «Mira del
  telefono») e 1536 × 864 (cinque file da cinque, «Mira del telefono» sola nell'ultima, senza scorrere), modalità fiera,
  due telefoni caduti, opzioni accese, programma; 1366 × 657 nella prova -b25.

### 9.2 Avviso del riassunto con il formato giusto (rilievo S2)

**Difetto.** Nel riassunto del registro (`natpf-tennis/scripts/registro/riassunto.mjs`, sezione «Sensori del telefono»)
l'avviso del B71 conta le partite con il telefono senza `displayLagMs` dei giochi con formato 4 **o più** (il gioco del B74
scrive 5), ma il testo diceva «di un gioco con formato 4» e «Formato delle righe: 4». Il Worker da caricare dopo il Deploy
mostra «Formato delle righe: 5»: chi segue l'avviso cercava un 4 e trovava un 5. Caso vero di oggi: il Worker caricato è
ancora al formato 3.

**Correzione.** Testo: «… di un gioco con formato 4 o più senza displayLagMs: il Worker del registro non è stato
ricaricato e ha tolto i campi del B71 e, dal formato 5, il campo `assi` del B74 (… dopo il Deploy la pagina del Worker
dice «Formato delle righe: 5»)». Il numero è `REGISTRO.versione`, uguale al `FORMATO` del Worker (lo controlla già
`registro-worker.test.mjs`): non invecchia al prossimo formato. Stesso difetto, sistemato allo stesso modo, negli avvisi
del B66 («formato 3 o più») e del B36.0 («formato delle righe 2 o più»). `docs/GUIDA_REGISTRO_CLOUDFLARE.md` §I: citazione
aggiornata, e un avviso: **un Worker fermo al formato 4 lascia `displayLagMs` e toglie solo `assi`, e il riassunto non può
accorgersene** (con l'interruttore spento il gioco non manda `assi`): prima di accendere l'interruttore controllare che la
pagina del Worker dica 5.

**Prove** (`natpf-tennis/test/registro-riassunto.test.mjs`). Prova nuova: avvio `v 5` e una partita con il telefono senza
`displayLagMs` → «formato 4 o più», «Formato delle righe: 5», niente «Formato delle righe: 4»; controprova con
`displayLagMs`: nessun avviso. Il controllo negativo del B71 (`!includes('formato 4 senza displayLagMs')`, che con il testo
nuovo sarebbe stato sempre vero) è riscritto su «senza displayLagMs»; i controlli degli avvisi del B71, del B66 e del B36.0
seguono il testo nuovo per intero. Prima 17/21 (quattro rosse), dopo 21/21.

### 9.3 Non verificato dopo la revisione

- Pannello dello stand nel programma Windows vero e sul ledwall: solo il Chromium delle prove (ponte del programma finto).
- Pannello sotto i 1000 px di larghezza e basso (800 × 600, 960 × 540): resta come al §8.
