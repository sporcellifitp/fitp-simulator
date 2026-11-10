# B18 · ramo R2 «motore piccolo» (tappa 1 del rapporto B16, punti 3, 4, 6 e 9)

Base: `natpf-simulator` a `d09357a`. Rapporto di partenza: `docs/b16/rapporto-gameplay.md` (§2 difetti 6, 7, 9, 12, 13 e
16; §5 appendice D6, D7, D9, D12, D13 e D16). Decisioni dell'utente del 10/11: tappa 1 «sì».

## Niente da accendere

Tutte le correzioni di questo ramo sono sempre attive. Non c'è nessuna opzione nuova.

## Cosa cambia per chi gioca

1. **La barra «Energia» si ricarica tra un punto e l'altro (difetto 6).** Prima a Pro e Leggenda restava su «Stanco!»
   per quasi tutta la partita, e il visitatore dopo partiva già stanco. Adesso:
   - lo scambio lungo stanca ancora, fino a circa il 6% di velocità in meno;
   - nella pausa tra i punti, al servizio e durante la moviola l'energia torna su;
   - a ogni partita nuova, e all'inizio dello stesso schermo, l'energia riparte piena.
   È la regola decisa il 29/10: «si stanchi, ma non troppo».
2. **In risposta al servizio niente schiacciate non volute (difetto 7).** Un tagliato o un pallonetto in risposta resta
   tagliato o pallonetto: niente più «Smash» a 180 km/h. In risposta la palla conta «alta» solo quando è molto sopra la
   testa, da 2,3 m. Su una palla così, un gesto dall'alto in basso è ancora una schiacciata. Un gesto che sale (verticale,
   con il manico alto) non è mai una schiacciata, nemmeno negli scambi.
3. **Il servizio segue il gesto (difetto 12).**
   - Chi imita il tutorial batte un servizio piatto, non più sempre un tagliato. La velocità resta quella di prima.
   - Il tipo di servizio si giudica rispetto al proprio servizio abituale, che il gioco impara dai servizi della
     partita. Prima di impararlo usa quello insegnato. Il kick vuole la testa della racchetta che sale nettamente più del
     solito; il tagliato vuole uno swing nettamente più orizzontale del solito.
   - Un gesto più forte non dà mai una palla più lenta. Il tipo cambia l'effetto (rimbalzo alto del kick, curva del
     tagliato), non la velocità.
   - «Gran servizio» arriva quando il servizio è a tempo e chiaramente più forte del proprio servizio abituale. Ci
     arriva anche chi serve piano. Al primo servizio della partita, quando il gioco non conosce ancora il servizio di
     chi gioca, serve un servizio davvero forte (forza 0,75); chi serve sempre al massimo lo ottiene ancora. Cambia la scritta, con gli effetti di scena: per la risposta della CPU la palla
     «potente» resta quella di prima.
   - Webcam e mouse non hanno la forma del gesto: i loro servizi restano come prima.
4. **Il tagliato un po' più lento resta un tagliato (difetto 13).** Prima, già al 10% più lento, cadeva a 2 m come una
   palla corta. Adesso diventa palla corta solo in tre casi:
   - un gesto nettamente morbido;
   - un gesto morbido e verticale, con la testa della racchetta che scende poco;
   - un gesto corto.
   Vale anche con la presa a racchetta insegnata dal tutorial, dove il tagliato è uno swing verticale che scende deciso
   (corretto dopo la revisione: prima con questa presa il tagliato restava palla corta fino a 0,9×).
   La palla corta del tutorial resta palla corta a tutte le velocità provate.
5. **Il ritardo della connessione non fa più «Troppo tardi» (difetto 16).** «Palla passata» si giudica dove era la palla
   al momento del gesto, non quando il messaggio arriva al computer. Con 130 ms di ritardo, per esempio una connessione
   lenta o il ritardo dello schermo impostato dallo staff, un colpo appena in ritardo su una palla veloce ora si prende a
   tutti i livelli. La palla parte da dov'è, senza tornare indietro.
6. **A Pro la palla larga fa rispondere la CPU in difesa (parte piccola del difetto 9).** Quando la palla le arriva
   lontana di lato, la CPU rimanda un tagliato o un pallonetto corto e lento, da attaccare. Prima a Pro questa risposta
   non scattava mai. La velocità della CPU non cambia: è la tappa 2.
7. **La difficoltà resta quella di prima.** Due ritocchi piccoli tengono Pro e Leggenda come erano:
   - a Pro la CPU sbaglia un po' meno «a caso» negli scambi lunghi, per compensare la risposta difensiva;
   - a Leggenda la CPU ha un primo passo un po' più esplosivo, con la stessa velocità massima, per compensare la
     stanchezza che si ricarica.

   I dettagli sono nella sezione «Bilanciamento».

## File toccati

| file | cosa |
|---|---|
| `natpf-tennis/src/natpf/natpf_skill.js` | `fatigueRest` e `resetFatigue` (D6); `CPU_DEFENSE` e `cpuDefensive` (D9); Pro `cpuErr.rally` da 0,012 a 0,009 (bilanciamento) |
| `natpf-tennis/src/natpf/natpf_legend.js` | `LEGEND.accel`/`decel` da 20/28 a 22/30 m/s² (bilanciamento; velocità massima invariata) |
| `natpf-tennis/src/game_engine.js` | `ball.natpfFeed` tolto al servizio e al reset della palla (revisione di D7); recupero fuori dallo scambio in `_stepPhysics`; azzeramento in `startNewMatch` e `startSplit` (D6). Servizio abituale per chi batte in `_executeServeHit`, azzerato a ogni partita; `ball.isPowerShot` da `strong` (D12). Soglia difensiva e `natpfCpuDefense` in `_executeOpponentReturn` (D9) |
| `natpf-tennis/src/natpf/natpf_phone_racket.js` | `ballIsHigh` in risposta (`rallyStrokeCount ≤ 1`) solo da `SMASH_FROM.always` (2,3 m); `isServeReturn` (D7), che esclude le palle del lanciapalle (`ball.natpfFeed`, revisione) |
| `natpf-tennis/src/natpf/natpf_training.js` | le due palle degli esercizi portano `natpfFeed: true` (revisione di D7) |
| `natpf-tennis/src/natpf/natpf_stroke_intent.js` | `INTENT.smashMaxRise` 0: ramo «verticale e manico alto» solo se la testa non sale (D7). `INTENT.dropSoft` 0,28: soglia del morbido secondo il piano (D13); `INTENT.dropDeepRise` −0,4: con la discesa decisa vale la soglia del nettamente morbido anche se verticale (revisione, presa a racchetta) |
| `natpf-tennis/src/natpf/natpf_stroke_outcome.js` | `SERVE.habit`, `kickRel`, `sliceRel`, `greatRel`, `learn`, `strongPace`, `legacyFlight`; una curva di volo per i tre tipi; `createServeRef`, `serveRefOf`; `serveOutcome({ ref })` e `strong` (D12). Revisione: `learnFree` 3, `greatCold` 0,75, `greatMax` 0,9 |
| `natpf-tennis/src/natpf/natpf_impact.js` | `queueUserSwing`: limite «palla passata» e portata di lato su `b.pos − b.vel·lat` (D16); `ballAtGesture` con solo il ritardo positivo (revisione) |
| `natpf-tennis/scripts/audit/letture-gesti.mjs` | il tagliato sotto 1× ammette la palla corta solo sotto 0,8×; riferimenti nuovi nell'intestazione (D13); `GRIPS=racchetta` per misurare la presa insegnata (revisione) |
| `natpf-tennis/test/natpf-b18-*.test.mjs` | test nuovi: `stanchezza`, `risposta`, `servizio`, `tagliato`, `ritardo`, `difesa-cpu` |
| `natpf-tennis/test/natpf-racchetta-motore.test.mjs`, `natpf-servizio-profondita.test.mjs` | il tagliato di prova ha \|piano\| 0,9 (prima 0,6–0,7): con la regola nuova 0,6 è il servizio abituale |

## Misure prima e dopo

Le misure vengono dal motore vero senza grafica e dal telefono simulato completo. «Prima» è la base `d09357a`, estratta
con `git archive` in una cartella a parte. Gli script di misura sono nella cartella di lavoro della sessione (scratchpad
`b18/`) e non sono nel repository. Si lanciano da `natpf-tennis/` con
`ROOT=$PWD node --import ./test/register.mjs <script>`:
- `stanchezza.mjs`
- `risposta-alta.mjs`
- `servizi.mjs`
- `tagliati.mjs`
- `ritardo.mjs`
- `difese.mjs`

### D6 · stanchezza

`rally-balance` con 150 punti × semi 7, 11 e 23 (solo la correzione D6). Tempo su «Stanco!» (energia ≤ 0,25), stanchezza
al contatto e stanchezza dopo `startNewMatch`:

| livello / profilo | «Stanco!» prima → dopo | al contatto, mediana | partita nuova |
|---|---|---|---|
| Casual / amatore | 0% → 0% | 0,03–0,05 → 0,01 | 0,10–0,13 → 0 |
| Pro / amatore | 94,5–95,9% → 0% | 0,97 → 0,07–0,08 | 0,95–0,97 → 0 |
| Pro / tennista | 89,3–93,4% → 0% | 0,95 → 0,04 | 0,91–0,97 → 0 |
| Leggenda / amatore | 75,9–87,8% → 0% | 0,90–0,96 → 0,03–0,07 | 0,95–0,96 → 0 |
| Leggenda / tennista | 95,6–97,6% → 0% | 0,96–0,98 → 0,10–0,14 | 0,93–0,99 → 0 |

Il massimo nello scambio resta 0,4–0,76 a Pro e Leggenda, cioè 4–8% di velocità in meno: lo scambio stanca ancora.
Sul ramo finale, con le stesse 18 partite simulate, il tempo su «Stanco!» è 0% in tutte e 18.

Punti vinti prima → dopo:
- Casual / amatore: 86–87 → 83–88%.
- Pro / amatore: 60–62 → 60–65%.
- Pro / tennista: 93–99 → 93–97%.
- Leggenda / tennista: 23–31 → 25–31%.
- Leggenda / amatore: 15–17 → 11–12%. Con 3 semi il caso pesa molto. Su 16–24 semi il solo D6 sposta i punti di meno
  di un punto su cento (vedi «Bilanciamento»).

### D7 · risposte al servizio

Servizio vero della CPU, 20 servizi per livello, gesto 11,6 ms prima del contatto come il colpo n. 143:

| | prima | dopo |
|---|---|---|
| palla «alta» al gesto (Casual, Pro, Leggenda) | 60/60 | 0/60 |
| colpo n. 143 (salita −0,588, abituale −0,189), due varianti di piano e manico | schiacciata 120/120 | tagliato 120/120 |
| tagliato del tutorial in risposta (1× e 1,2×) | schiacciata 100% | 0% |
| pallonetto del tutorial in risposta | schiacciata 50% | 0% |
| schiacciata del tutorial in risposta | schiacciata 100% | tagliato (la palla non è alta) |

Contatto previsto in risposta: 1,55–1,72 m. Su una palla davvero alta in risposta, contatto oltre 2,3 m, il gesto della
schiacciata dà ancora la schiacciata. Il test lo prova nel motore.

### D12 · servizio

Servizio del tutorial dal telefono simulato, nel motore. Prese palmo e martello, calibrazione con la posa e con il
braccio, destro e mancino. Tre servizi «propri» a 1× e poi la variante.
- **Tipo a 1×.** Prima tagliato 8/8 a 156–158 km/h, volo 0,81 s. Dopo piatto 8/8, stessa velocità e stesso volo.
- **Palmo a 1,2×.** Prima kick a 140–142 km/h, volo 0,93–0,94 s: più lento di 1,1×, che faceva 162–165 km/h. Dopo kick a
  169–173 km/h, volo 0,75 s.
- **Passi «gesto più forte → palla più lenta»** da 0,7× a 1,5×. Palmo: 2 su 8 → 0 su 8. Martello: 0 su 8 → 0 su 8.
- **Velocità da 0,7× a 1,5×.** Prima 140 → 206 km/h, non monotona. Dopo 143 → 185 km/h, monotona. Il piatto forte con la
  presa a martello a 1,5× era a 205 km/h, ora a 185 km/h: la curva unica è quella del vecchio tagliato.
- **«Gran servizio», servizio abituale a 1×.** 32/72 → 32/72, da 1,2× in su.
- **«Gran servizio», chi serve piano** (servizio abituale a 0,7×, varianti da 0,7× a 1×): 0/32 → 8/32.
- Dopo la revisione le misure con palmo e martello restano identiche (stesso script, ramo finale): piatto a 1×, 0 passi
  «più forte → più lento», «Gran servizio» 32/72.

**Presa a racchetta** (quella insegnata dal B17; misurata dopo la revisione con lo script
`scratchpad/servizio-racchetta.mjs`, destro e mancino, calibrazione con la posa e con il braccio, tre servizi propri a 1×):

| | prima (`d09357a`) | dopo |
|---|---|---|
| tipo a 1× | tagliato 4/4, 165–173 km/h | piatto 4/4, 165–174 km/h |
| da 0,7× a 1,5× | tagliato, poi kick a 1,1×–1,2× (142–151 km/h, più lento di 1×), piatto a 1,3× (208–214), kick a 1,5× (155–158) | sempre piatto, 145 → 200 km/h, monotono |
| «Gran servizio» al primo servizio della partita a 1× | 4/4 | 0/4 («Buon servizio») |
| «Gran servizio» da 1,1× in su (dopo tre servizi propri) | 4/4 | 4/4 |

### D13 · tagliati

Tagliato e tagliato di rovescio del tutorial dal telefono simulato. Velocità da 0,7× a 1,3× (10 passi), prese palmo e
martello, calibrazione con la posa e con il braccio, destro e mancino, semi 7, 11 e 23.
- **Tagliati letti palla corta.** Prima 240/480: tutti quelli fino a 0,9×. Dopo 96/480: solo a 0,7–0,75×, il gesto
  nettamente morbido con forza fino a 0,25.
- **Palla corta del tutorial**, da 0,7× a 1,3×: palla corta 240/240 prima e dopo. La sua forza arriva a 0,31 a 1,4×, ma è
  verticale (\|piano\| 0,2) e corta (22–31°).
- **Presa a racchetta** (dopo la revisione; destro e mancino, calibrazione con la posa e con il braccio, semi 7 e 11,
  8 letture per passo; script `scratchpad/tagliato-prese.mjs`):

  | gesto del tutorial | prima (`d09357a`) e ramo prima della revisione | dopo la revisione |
  |---|---|---|
  | tagliato | palla corta 8/8 da 0,7× a 0,9×, 4/8 a 0,95× | palla corta solo a 0,7–0,75× (8/8) e 4/8 a 0,8×; tagliato 8/8 da 0,85× a 1,4× |
  | tagliato di rovescio | palla corta 8/8 da 0,7× a 0,8× | palla corta 4/8 a 0,7×; tagliato 8/8 da 0,75× a 1,4× |
  | palla corta | palla corta 8/8 da 0,7× a 1,2×; 4/8 top spin a 1,3–1,4× | uguale |

  Con palmo e martello niente cambia rispetto al ramo: tagliati palla corta 96/480, palla corta 240/240.
- **Stima per una persona vera**, con velocità del gesto distribuita intorno a 1× e deviazione 0,15. Prima circa il 32%
  dei tagliati diventava palla corta, dopo circa il 7%. Il rapporto B16 misurava 31–43% con il suo modello. La stima non è
  misurata con persone vere.

`scripts/audit/letture-gesti.mjs` sulla base `d09357a` e dopo il ramo:

| modo | base | dopo |
|---|---|---|
| std | 788/796 | 796/796 |
| sweep | 1770/1824 | 1810/1824 |
| rates | 386/392 | 386/392 |
| imitrates | 1220/1260 | 1256/1260 |
| seeds | 576/576 | 576/576 |

Nessun errore nuovo e 84 risolti (tagliati letti palla corta). Le stesse cifre dopo la revisione.

Con la presa a racchetta (`GRIPS=racchetta`, revisione), stesso script sulla base e sul ramo finale:

| modo | base | dopo |
|---|---|---|
| std | 620/644 | 626/644 |
| sweep | 714/912 | 744/912 |
| rates | 164/196 | 168/196 |

Nessun errore nuovo; i risolti sono tutti tagliati (30 in sweep, 4 in rates, 6 in std). Gli errori che restano con
questa presa c'erano già nella base e non sono di questo ramo: soprattutto piatto, incrociato e lungolinea con la
calibrazione del braccio (lato o mira), più schiacciata e volée in sweep. Per questo `GRIPS` di serie resta palmo e
martello, e i riferimenti di sempre non cambiano. Gli errori che restano c'erano già nella base:
- piatto con la presa a martello un po' più veloce letto top spin;
- volée 50/25 a 0,9× letta pallonetto;
- schiacciata e volée a 0,7× con la calibrazione del braccio.

### D16 · ritardo

Palla della CPU con volo 0,6 s (veloce) e 0,85 s (normale). Per ogni ritardo del telefono (0 / 35 / 80 / 130 ms), il primo
ritardo ancora colpito, in secondi:

| palla veloce | prima | dopo |
|---|---|---|
| Casual | −0,125 / −0,10 / −0,055 / −0,005 | −0,125 / −0,125 / −0,12 / −0,07 |
| Pro, 1v1 | −0,115 / −0,09 / −0,045 / +0,005 | −0,115 / −0,115 / −0,115 / −0,07 |
| Leggenda | −0,095 / −0,065 / −0,02 / +0,03 | −0,095 / −0,09 / −0,095 / −0,07 |

Con lead −0,02 e 130 ms di ritardo:
- palla veloce: prima mancata a tutti i livelli, dopo colpita a tutti i livelli;
- palla normale: prima mancata solo a Leggenda, dopo colpita a tutti i livelli.

Dopo la revisione una latenza negativa (scarto tra gli orologi di telefono e computer, fino a −0,15 s) non sposta più
la palla in avanti. Nel motore, con palla veloce e normale e ritardo −30/−50/−100/−150 ms, il primo ritardo colpito è
lo stesso con e senza questa correzione: il limite che decide lì è quello sul tempo, non quello sulla posizione. La
correzione toglie un caso raro e il test la prova sulla funzione (`ballAtGesture`).

Con 130 ms resta un limite più vicino. Quando il messaggio arriva, la palla è già oltre di molto e a volte il punto è
già finito.

### D9 · risposta difensiva a Pro

`rally-balance` con 200 punti × semi 7, 11 e 23. Il «dopo» è il ramo finale, con il bilanciamento.

| | risposte difensive della CPU, prima → dopo | punti vinti, prima → dopo |
|---|---|---|
| Pro / umano | 0/3910 (0,0%) → 176/4086 (4,3%) | 74,0 → 73,5% |
| Pro / amatore | 0/3417 (0,0%) → 123/3750 (3,3%) | 63,2 → 59,3% |
| Pro / medio | 4/2998 (0,1%) → 221/3173 (7,0%) | 65,8 → 63,8% |
| Pro / tennista | 16/2526 (0,6%) → 175/2413 (7,3%) | 96,2 → 96,8% |
| Casual (4 profili) | 6,3–8,5% → 6,7–8,9% (soglia uguale) | 87,0–99,3 → 85,5–98,3% |

Con tre semi i punti vinti variano di ±3–4 punti: sulla media di 24 semi il ramo è uguale alla base (vedi
«Bilanciamento»). Palla a 4–6 m dalla CPU a Pro: i vincenti restano 1,6–3,8% per umano, amatore e medio. L'obiettivo del
rapporto, almeno il 15%, è della tappa 2: serve la CPU più lenta sulle palle larghe.

### Bilanciamento: Pro e Leggenda come prima (decisione (a) del B16)

**Il problema.** Il primo `audit:legend` sul ramo, senza ritocchi, ha dato 68/69: Pro contro «medio» vinceva l'89,7% dei
game, oltre il limite dell'85%. Nella suite c'era anche un test rosso: la Leggenda contro «preciso» concedeva il 47% dei
punti, con un massimo del 46%.

**Come ho misurato.** I criteri a semi fissi sono sensibili al caso, perché ogni modifica cambia la sequenza delle
estrazioni. Per vedere l'effetto vero ho misurato con 16–24 semi da 300 punti
(`scratchpad/b18/pro24.mjs` con `rally-balance.simulate`). Prima ho controllato la fragilità della base: con 1, 2 o 3
estrazioni a vuoto all'inizio della partita supera ancora 69/69, e Pro resta a 79,9–82,4%.

**Le cause trovate.**
- Servizio (D12). Per le prove senza telefono il kick era diventato più veloce. In più, il «Gran servizio» relativo
  rendeva «potente» per la CPU (`ball.isPowerShot`) un servizio più debole di prima.
  Correzione: questi servizi tengono il volo per tipo di prima (`SERVE.legacyFlight`), e la palla potente per la CPU
  segue la regola di prima (`strong`).
- Difesa a Pro (D9): circa un punto su cento in più per chi gioca.
  Correzione: Pro `cpuErr.rally` da 0,012 a 0,009, cioè meno errori «a dado» negli scambi lunghi, nella direzione del
  difetto 1.
- Stanchezza (D6): con il recupero tra i punti la Leggenda contro «preciso» concedeva un po' di più.
  Correzione: primo passo della Leggenda da 20/28 a 22/30 m/s², con la velocità massima invariata (8 m/s). La forza
  viene dalla CPU, come vuole la decisione (a).

**Ritocchi provati e scartati, perché rumorosi o senza effetto misurabile:**
- stanchezza doppia nello scambio: «Stanco!» saliva al 43–57% del tempo a Leggenda contro «tennista»;
- recupero tra i punti più lento (0,04–0,07 al secondo);
- soglie difensive a Pro di 1,35 m o 1,42 m;
- risposta difensiva più profonda;
- errore di tempo della Leggenda più basso.

Percentuale di punti vinti da chi gioca, con 24 semi × 300 punti (tennista: 16 semi):

| caso | base | solo D6 | ramo senza ritocchi | ramo finale |
|---|---|---|---|---|
| Pro / medio | 66,18 | 65,92 | 67,30–67,54 | 66,11 |
| Leggenda / preciso | 43,90 | 44,61 | 44,29–45,67 | 42,52 |
| Leggenda / tennista | 29,78 | 29,98 | 31,49 | 29,48 |

`npm run audit:legend`, con i suoi 8 semi fissi:

| criterio | base | finale |
|---|---|---|
| Leggenda contro «medio»: game della CPU | 97,9% | 97,0% |
| Leggenda contro «amatore»: game della CPU | 99,8% | 99,3% |
| Leggenda contro «tennista»: game della CPU (≥ 85%) | 92,7% | 90,6% |
| Leggenda contro «preciso»: game della CPU (≥ 60%) | 60,6% | 70,3% |
| Leggenda contro «bambino» e «impreciso»: game della CPU | 100 e 99,8% | 99,8 e 99,8% |
| Pro contro «medio»: game di chi gioca (70–85%) | 83,5% | 80,8% |
| criteri rispettati | 69/69 | 69/69 |

Test B16 ridotto (75 punti × 8 semi):
- «preciso»: base 45,3%, finale 40,2%; il massimo è 46%;
- «tennista»: base 25,8%, finale 30,5%; il massimo è 33,5%.

Su 16 semi la Leggenda contro «tennista» resta uguale alla base, 29,5% contro 29,8%: lo scarto del test a 8 semi è
rumore. La Leggenda non è più debole.

## Test

- Test nuovi:
  - `natpf-b18-stanchezza`: 2 prove sul motore vero (partita simulata e `POINT_OVER`), senza chiamare `fatigueStep` a mano.
  - `natpf-b18-risposta`: 5 prove; il colpo n. 143 parte dalla forma e passa dal telefono al motore con il servizio vero
    della CPU.
  - `natpf-b18-servizio`: 6 prove, con il telefono simulato (prese palmo, martello e racchetta) e il motore.
  - `natpf-b18-tagliato`: 4 prove, con il telefono simulato (prese palmo, martello e racchetta).
  - `natpf-b18-ritardo`: 3 prove.
  - `natpf-b18-difesa-cpu`: 2 prove.
- Ho controllato che `stanchezza`, `risposta` e `ritardo` falliscono sulla base: sono test veri del difetto.
- Test dei gesti (`natpf-gesture-*`, `natpf-racchetta*`, `natpf-diag*`, `natpf-presa*`, `natpf-gesti-speciali`,
  `natpf-tutorial` e gli altri): 254/254.
- `npm test` del gioco, dopo la revisione: 1012/1012, più 1 saltato (prima della revisione 1008/1008) (avvio LAN senza `npm ci` in `tools/lan`, come prima). Sul ramo senza ritocchi
  c'erano 2 rossi: il test B16 «preciso» e il motore finto di `natpf-recording` senza `rallyStrokeCount`. Sono risolti.
- Sito (`node --test tools/test/*.test.mjs`): 200/200.
- `npm run build`: ok.
- `npm run audit:legend`: 69/69, «Tutti i criteri rispettati». Le cifre sono nella sezione «Bilanciamento».
- Prove nel browser (Chromium, telefono simulato, ramo finale prima della revisione):
  - `natpf-rally`: 8/8;
  - `natpf-gesti-speciali`: 9/9;
  - `natpf-leggenda`: 7/7;
  - `natpf-1v1-p2p`: 39/39;
  - `natpf-latency`: 9/9.

  Le stesse cinque prove erano verdi anche prima del bilanciamento.
- Prove nel browser dopo la revisione: `natpf-rally` 8/8, `natpf-gesti-speciali` 9/9, `natpf-1v1-p2p` 39/39,
  `natpf-latency` verde, `natpf-training-flow` 22/22 (esercizi del lanciapalle, per il segno `ball.natpfFeed`).
  `natpf-leggenda`: 6/7 al primo giro, poi 7/7 e 7/7. Il rosso è la verifica del disegno della CPU nell'allungo: in un
  allungo **in partita** (palla a 1,79 m dal corpo, la CPU in corsa) il piatto della racchetta è andato fuori di +0,05 m,
  sul limite di 5 cm (mano +0,21, testa +0,41: sopra le loro soglie). Il commento della prova stessa dice che con la
  CPU in corsa il piatto si sposta poco (+0,08–0,23). Gli allunghi in partita capitano a caso: nei due giri verdi non ce
  n'erano (solo i 4 forzati), nei due giri del ramo prima della revisione ce n'era uno (piatto +0,10 e +0,15). Sulla base
  `d09357a` tre giri: 7/7 tutte e tre le volte, ma senza nessun allungo in partita, quindi lì il caso non è stato
  esercitato. Le correzioni della revisione non toccano movimento né disegno della CPU; il ritocco della Leggenda del
  ramo (primo passo 22/30 m/s²) sì, e non posso escludere che renda più frequenti questi allunghi. Da ricontrollare
  dopo l'unione con più giri di `natpf-leggenda`.

## Revisione

Il revisore indipendente ha riletto il diff e rifatto le verifiche. Ha trovato un difetto bloccante e sei minori.

**Bloccante: D13 non era corretto per la presa insegnata.** Dal B17 il tutorial insegna la presa a racchetta
(`site/js/tennis/grip-art.js`, `GRIP_STYLE = 'racchetta'`). Con questa presa il tagliato del tutorial è uno swing
verticale (\|piano\| 0,20–0,29) che scende deciso (salita −0,57/−0,80). Finiva nel ramo «taglio verticale morbido» o
nella regola «morbido e verticale», con la soglia della forza 0,36. Risultato: imitato a 0,7–0,9× restava palla corta
8/8, come sulla base. Il ramo aveva misurato solo palmo e martello, e il documento diceva il falso per chi imita il
tutorial.
- Correzione (`natpf_stroke_intent.js`): nuova soglia `INTENT.dropDeepRise` −0,4. Con la testa che scende decisa,
  palla corta solo se il gesto è nettamente morbido (forza fino a 0,28), anche se verticale. Vale in tutti e due i
  rami della palla corta. La palla corta del tutorial scende poco (−0,23/−0,25) e non cambia.
- Misure: nella sezione D13 qui sopra. Tagliato con la presa a racchetta da 0,85× a 1,4× letto tagliato 8/8; palla corta
  invariata; `letture-gesti` std 796/796 con palmo e martello, nessun errore nuovo con la presa a racchetta.
- Test: `natpf-b18-tagliato` prova la presa a racchetta (tagliato, tagliato di rovescio, palla corta, destro e mancino,
  due calibrazioni) e la regola nuova sulla forma. Il test che fissava la vecchia regola (forza 0,34 con \|piano\| 0,5 e
  salita −0,42) ora usa una palla corta che scende poco. `letture-gesti` accetta `GRIPS=racchetta`.

**Minori corretti:**
- *Servizio con la presa a racchetta non provato.* Il test del servizio dal telefono simulato ora gira anche con la
  presa a racchetta. Misure nella sezione D12.
- *«Gran servizio» al primo servizio di ogni partita con la presa a racchetta.* Il riferimento iniziale è tarato sul
  palmo (forza 0,5) e la racchetta a 1× ha forza 0,62. Ora, finché il riferimento non ha imparato nessun servizio,
  «Gran servizio» vuole forza 0,75 (`SERVE.greatCold`).
- *Il riferimento del servizio imparava solo i servizi letti piatti.* Chi serve sempre con la testa che sale, o molto di
  lato, non veniva mai imparato. Ora i primi tre servizi della partita (`SERVE.learnFree`) si imparano di qualunque
  tipo; dopo, solo quelli piatti rispetto al riferimento.
- *Chi serve sempre al massimo non poteva più avere «Gran servizio».* La soglia ora è al più 0,9 (`SERVE.greatMax`).
- *Le palle del lanciapalle contavano come risposta al servizio* (anche loro hanno `rallyStrokeCount` 1). Oggi
  l'esercizio «Schiacciata» non ne soffriva (misura del revisore: palla alta 40/40), ma il margine dipendeva dalla
  traiettoria. Ora le due palle degli esercizi portano `ball.natpfFeed` e `isServeReturn` le esclude. Il servizio della
  partita e il reset della palla tolgono il segno.
- *D16 con latenza negativa.* `ballAtGesture` usa solo il ritardo positivo.

**Minore da decidere nell'unione: i ritocchi di bilanciamento.** Pro `cpuErr.rally` da 0,012 a 0,009 e Leggenda
`accel`/`decel` da 20/28 a 22/30 m/s² toccano errori e movimento della CPU, che il rapporto assegna alla tappa 2. Sono
misurati (sezione «Bilanciamento») e servono a tenere Pro e Leggenda come prima dopo D6, D9 e D12. Vanno dichiarati
nell'unione come decisione da confermare con l'utente, e dopo l'unione dei quattro rami vanno rilanciati
`npm run audit:legend` e i test B16 prima di tenerli.

Dopo la revisione: `npm test` 1012/1012 più 1 saltato; sito 200/200; build ok; `audit:legend` 69/69 con le stesse cifre
di prima (Pro contro «medio» 80,8%, Leggenda contro «preciso» 70,3%, contro «tennista» 90,6%).

## Cosa NON è verificato

- **Telefono vero e persone vere.**
  - Le soglie del tagliato e della palla corta sono provate solo con i gesti del tutorial imitati dal telefono simulato,
    con le prese palmo, martello e racchetta. Non so quanto scende davvero il tagliato di una persona con la presa a
    racchetta: se scende meno di 0,4, il tagliato appena lento e verticale è ancora palla corta.
  - Le soglie del servizio sono provate allo stesso modo: kick e tagliato «rispetto al proprio» e «Gran servizio» +0,1.
  - Non è misurato quanto varia davvero il gesto da un colpo all'altro. È la misura 12 della tappa 1 nel rapporto.
- **Il kick e il tagliato voluti al servizio da persone vere.** Il kick vuole la testa che sale 0,3 più del proprio
  servizio, il tagliato lo swing 0,25 più orizzontale. Non so se una persona li fa apposta.
- **La schiacciata voluta in risposta** è provata solo su una palla costruita apposta, con il contatto oltre 2,3 m. Il
  servizio vero della CPU non arriva mai così alto.
- **Ritardo vero.** 130 ms sono simulati: niente connessione vera via internet e niente ritardo del ledwall misurato.
- **Il bilanciamento** è misurato solo con i profili simulati:
  - Pro, `cpuErr.rally` 0,009;
  - Leggenda, primo passo 22/30 m/s².

  Non sappiamo se una persona vera sente la differenza. Le differenze stanno sotto un punto su cento nei punti vinti.
- **Windows, il PC dell'evento e il ledwall:** non provati.
- **Audio:** nessuna voce nuova. Le voci restano quelle di prima («Smash» solo sulle schiacciate vere).
