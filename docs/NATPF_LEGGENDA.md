# CPU «Leggenda»

Terzo livello della CPU, sopra «CPU esperta». Codice in `natpf-tennis/src/natpf/natpf_legend.js`, parametri del livello
in `natpf_skill.js` (`SKILL_LEVELS.leggenda`), agganci nel motore in `game_engine.js` (commenti «NATPF Leggenda»),
audit con soglie in `natpf-tennis/scripts/audit/legend.mjs`, test in `natpf-tennis/test/natpf-legend.test.mjs`.

## In breve

- Si sceglie nella pagina «Partita» (tessera «CPU Leggenda», accanto a «CPU facile» e «CPU esperta») o con
  `?mode=leggenda`; l'avversario si chiama «CPU Leggenda». Dopo una sfida torna il livello scelto, Leggenda compresa
  (prima tornava «casual»). «Sfida il campione» resta contro la CPU esperta.
- **Chi gioca** ha le regole di Esperto: finestra dell'aiuto sul tempo, dispersione, errori, velocità (8,8 m/s).
- **La CPU** usa la stessa fisica di chi gioca e le stesse regole d'esecuzione di Esperto: niente probabilità d'errore
  «a dado», niente errori che crescono da soli con la lunghezza dello scambio. Sceglie il colpo per utilità tra molti
  schemi, impara dagli errori dell'avversario, si muove come una persona (split-step, reazione, accelerazione e frenata
  limitate, affondo) e lascia passare le palle che vede fuori.
- **casual, pro, 1v1 e le sfide** eseguono lo stesso codice di gioco di prima: per loro gli agganci di Leggenda sono
  controlli che escono subito. Prova: firma di 36 simulazioni, `audit:rally` e `audit:variety` identici a `726b5e3`.

## Progetto

### Il colpo della CPU

- **Qualità** (0…1) con le funzioni del giocatore: `swingQuality` di un errore di tempo gaussiano (0,025 s, cresce fino
  a +80% con la palla veloce) × `reachQuality` (allungo dal corpo, corsa).
- **Esecuzione** con le regole di Esperto, come il colpo di chi gioca: `playerErrorPlan` (rete, lungo, largo),
  `landingScatter` (dispersione laterale), `playerDepthZ` (profondità). Smorzata e pallonetto non disperdono.
- **Traiettoria**: `shotArc` (altezza sulla rete e top spin dal tipo di colpo e dalla forza), lancio del motore, `fixAir`.
- **Mira corretta per l'aria** (solo Leggenda): `fixAir` corregge la profondità ma non lo spostamento laterale, che con
  l'attrito dell'aria è 0,865 volte quello voluto (misurato sul motore). La CPU mira più larga di tanto e la palla cade
  dove vuole: scarto medio del rimbalzo < 0,3 m (test), circa metà di quello senza correzione.

### La scelta del colpo

Candidati, con bersagli un po' casuali dentro la loro zona:

| schema | bersaglio | colpo |
|---|---|---|
| incrociato | profondo, 2,5–3,5 m dal centro dalla parte opposta all'impatto | top spin |
| incrociato stretto | 3,3–3,85 m, corto (5,2–6,6 m dalla rete) | top spin |
| lungolinea | 2,4–3,4 m dalla parte dell'impatto, profondo | piatto o top spin |
| campo aperto | lontano dall'avversario, 2,4–3,4 m | top spin |
| corpo | sull'avversario, profondo | piatto, forte |
| tagliato | ovunque, medio-profondo | tagliato |
| parabola alta | centrale, profonda | top spin carico |
| contropiede | dove l'avversario era (se corre a più di 1,5 m/s) | top spin |
| smorzata | corta (avversario in fondo, CPU in equilibrio e non dietro la riga) | smorzata |
| pallonetto | profondo (avversario a rete) | pallonetto |
| chiusura | angolo lontano dall'avversario, profondo (scambio di almeno 20 colpi) | piatto, forte |

Utilità di ogni candidato:

`U = (1 − p_CPU) × (e + (1 − e) × V) − ripetizioni`

- `p_CPU`: rischio d'errore della CPU con le regole di Esperto alla sua qualità (errore, uscita laterale e in profondità).
- `e`: probabilità che l'avversario sbagli. Stima iniziale (7% a 95 km/h, profondità 9,6 m, spostamento 2 m, 0,55 m
  sopra la rete) corretta per velocità, profondità, spostamento e altezza sulla rete; più alta se la palla è diversa
  dalla precedente; più bassa per gli schemi visti spesso negli ultimi 10 colpi (l'avversario si abitua);
  moltiplicata per gli errori osservati / attesi in questa partita, in generale e per schema (peso iniziale di 2 errori).
- `V`: valore di uno scambio che continua, ½ × (errori osservati / attesi), tra 0,1 e 0,7: contro chi sbaglia molto la
  CPU gioca sicura (prima o poi sbaglia lui), contro chi non sbaglia rischia prima.
- Scambi lunghi: dopo 20 colpi `V` scende in linea retta fino a zero a 25 colpi, `e` vale almeno la stima iniziale
  (la CPU prova a forzare l'errore anche di chi finora non ha sbagliato), i colpi da fondo diventano più forti (fino a
  +0,45) e più larghi (fino a +0,6 m), entra il colpo di chiusura; contro chi sbaglia poco (osservati / attesi ≤ 1,6) oltre 24 colpi
  restano solo chiusura, incrociato e lungolinea. Senza questa parte, contro «preciso» il 7% dei punti arrivava a 60
  colpi (vedi ablazione).
- Ripetizioni: −0,008 per ogni colpo degli ultimi 2 nella stessa zona (9 zone), −0,01 per ogni ripetizione dello schema
  negli ultimi 3, −0,35 × eccesso oltre il 25% degli ultimi 10.
- Scelta morbida (softmax, temperatura 0,014): varia senza buttare via il punto.

### Movimento

| cosa | valore |
|---|---|
| split-step: ferma dall'impatto dell'avversario per | 0,15 ± 0,03 s (limiti 0,10–0,25 s) |
| errore di lettura laterale del punto d'incontro | gaussiano, 0,15–0,25 m (più grande con la palla veloce), si azzera in 0,32 s |
| accelerazione / frenata | 14 / 22 m/s² |
| velocità massima | 7 m/s (chi gioca: 8,8) |
| affondo | palla che passerebbe oltre 1,2 m dal corpo nelle ultime 0,32 s: passo a 30 m/s², al massimo 8,4 m/s, fino a 1,05 m dalla palla |
| portata | 1,85 m |
| recupero | sulla bisettrice degli angoli possibili dell'avversario, x tra −2,2 e 2,2 m, 11,35 m dalla rete |
| palle fuori | non ancora rimbalzate, viste fuori di oltre 0,08 m (lettura ± 0,12 m): lasciate passare, una decisione per palla |
| servizio | 36% verso un angolo, 36% verso l'altro, 28% al corpo; forza 1,05–1,45 |

**Scostamento dalla specifica**: «lascia passare» era previsto a 0,25 m (lettura ± 0,18 m). Con quei valori due criteri
non passano (vincenti/errori contro «medio» 0,89; scambi chiusi a 60 colpi contro «preciso» 1,24%), con 0,08 m ± 0,12
sì. Una palla dentro di 10 cm viene lasciata passare per sbaglio il 7% delle volte (2,6% con i valori della specifica).

### Disegno (solo nel gioco con la grafica)

- **Allungo**: quando la palla passa oltre 0,9 m dal corpo, nelle ultime 0,22 s prima dell'impatto e per 0,18 s dopo,
  la racchetta (e con lei mano e braccio, che si stendono come un giocattolo morbido) va verso la palla fino a 0,45 m e
  il corpo si inclina dalla stessa parte fino a 0,24 rad. Con l'allungo lo swing parte da poco prima dell'impatto (come
  quello di chi gioca): la racchetta allungata è sulla palla nell'istante del colpo.
- **Lato del colpo**: la racchetta si prepara dalla parte in cui la palla passa rispetto al corpo. L'anticipazione del
  motore guarda la metà campo della palla: con la CPU decentrata (Leggenda recupera fino a ±2,2 m e corre di più) si
  preparava dal lato sbagliato.

## Risultati misurati

Torneo senza grafica sulle regole vere del motore: 300 punti × 8 semi (7, 11, 23, 31, 47, 59, 71, 83) per profilo.
I profili sono giocatori simulati (`rally-balance.mjs`): «medio», «preciso», «impreciso» con mouse/tastiera,
«tennista», «amatore», «bambino» con il telefono. Non sono persone: non puniscono la prevedibilità della CPU e non si
stancano.

### Criteri di accettazione (`audit:legend`, tutti rispettati)

| criterio | medio | amatore | tennista | preciso | bambino | impreciso |
|---|---|---|---|---|---|---|
| game vinti dalla CPU (soglia) | 96,3% (≥ 90) | 93,4% (≥ 90) | 92,5% (≥ 85) | 66,0% (≥ 60) | 98,7% (≥ 98) | 99,6% (≥ 98) |
| errori della CPU per colpo (2–6%) | 3,5% | 3,9% | 3,7% | 4,8% | 3,6% | 3,7% |
| incrociati (30–50%) | 32,8% | 34,2% | 32,9% | 32,8% | 34,3% | 36,8% |
| lungolinea (≥ 10%) | 25,2% | 19,3% | 17,9% | 31,6% | 22,9% | 22,9% |
| schemi sopra il 3% (≥ 6) | 8 | 9 | 8 | 9 | 8 | 8 |
| schema più usato (≤ 35%) | 19,4% | 19,3% | 22,9% | 15,9% | 18,2% | 21,4% |
| entropia delle 9 zone (≥ 2,3 bit) | 2,63 | 2,67 | 2,64 | 2,59 | 2,60 | 2,39 |
| stessa zona del colpo prima (≤ 20%) | 12,7% | 12,8% | 12,9% | 17,0% | 11,6% | 15,1% |
| scambi chiusi a 60 colpi (≤ 1%) | 0,22% | 0,37% | 0,48% | 0,80% | 0,04% | 0% |
| velocità massima della CPU (≤ 8,8 m/s) | 7,54 | 7,58 | 7,72 | 7,96 | 7,48 | 7,41 |
| reazione p10 (≥ 0,12 s) | 0,125 | 0,125 | 0,133 | 0,125 | 0,125 | 0,125 |
| vincenti / errori della CPU (≥ 1, solo «medio») | 1,00 | | | | | |

Non regressione: contro «medio» il giocatore vince il 72,5% dei game a pro (70–85%) e il 98,8% a casual (≥ 95%).

Il rapporto vincenti/errori contro «medio» è al limite (3,5% e 3,5% per colpo): con un errore di tempo della CPU di
0,03 s era 0,99. La CPU fa punti soprattutto con gli errori dell'avversario (il giocatore simulato corre da solo su
ogni palla, i vincenti veri sono rari).

### Confronto con casual e pro (stessi profili, stessi semi)

| livello | profilo | game vinti da chi gioca | punti vinti da chi gioca | colpi per punto | errori CPU per colpo | vincenti CPU per colpo | incrociati / lungolinea | entropia | stessa zona | chiusi a 60 colpi | reazione CPU p10 | velocità max CPU |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| casual | medio | 98,8% | 85,2% | 9,59 | 17,7% | 0,6% | 6,6% / 48,5% | 2,57 | 25,8% | 0% | 0,25 s | 4,7 m/s |
| casual | amatore | 99,1% | 86,2% | 11,86 | 14,6% | 1,4% | 6,9% / 48,3% | 2,54 | 18,1% | 0% | 0,25 s | 4,7 m/s |
| casual | tennista | 100% | 94,1% | 10,19 | 18,4% | 0,2% | 8,5% / 40,6% | 2,54 | 21,4% | 0% | 0,258 s | 4,7 m/s |
| casual | preciso | 99,8% | 90,7% | 6,42 | 24,5% | 0% | 8% / 37,8% | 2,55 | 24% | 0% | 0,258 s | 4,7 m/s |
| casual | bambino | 89% | 68,1% | 11,21 | 12,6% | 4,8% | 5,8% / 55,4% | 2,47 | 17,2% | 0% | 0,25 s | 4,7 m/s |
| casual | impreciso | 54% | 52,2% | 8,55 | 12,9% | 7,6% | 4,9% / 59,7% | 2,48 | 24,4% | 0% | 0,25 s | 4,7 m/s |
| pro | medio | 72,5% | 59,3% | 9,49 | 13,4% | 3,9% | 5,4% / 76,2% | 2,39 | 28,8% | 0% | 0,208 s | 5 m/s |
| pro | amatore | 78,6% | 62,9% | 10,96 | 12,1% | 5,1% | 6,2% / 70,7% | 2,54 | 13,2% | 0% | 0,208 s | 5 m/s |
| pro | tennista | 100% | 89,2% | 11,35 | 16,3% | 0,7% | 8,1% / 65,7% | 2,73 | 9,3% | 0% | 0,217 s | 5 m/s |
| pro | preciso | 98,6% | 83,5% | 9,1 | 19,3% | 0% | 8,5% / 65% | 2,66 | 24% | 0% | 0,217 s | 5 m/s |
| pro | bambino | 27,6% | 39,5% | 8,02 | 10,5% | 13% | 5,3% / 73,6% | 2,39 | 18,8% | 0% | 0,208 s | 5 m/s |
| pro | impreciso | 4,1% | 20,8% | 5,65 | 8,2% | 22% | 3,6% / 82% | 2,19 | 32,6% | 0% | 0,208 s | 5 m/s |
| leggenda | medio | 3,7% | 22,1% | 13,2 | 3,5% | 3,5% | 32,8% / 25,2% | 2,63 | 12,7% | 0,22% | 0,125 s | 7,54 m/s |
| leggenda | amatore | 6,6% | 29% | 14,91 | 3,9% | 5,1% | 34,2% / 19,3% | 2,67 | 12,8% | 0,37% | 0,125 s | 7,58 m/s |
| leggenda | tennista | 7,5% | 27% | 14,34 | 3,7% | 4,8% | 32,9% / 17,9% | 2,64 | 12,9% | 0,48% | 0,133 s | 7,72 m/s |
| leggenda | preciso | 34% | 43,9% | 17,4 | 4,8% | 0% | 32,8% / 31,6% | 2,59 | 17% | 0,8% | 0,125 s | 7,96 m/s |
| leggenda | bambino | 1,3% | 17,3% | 9,82 | 3,6% | 12,7% | 34,3% / 22,9% | 2,6 | 11,6% | 0,04% | 0,125 s | 7,48 m/s |
| leggenda | impreciso | 0,4% | 9,3% | 5,84 | 3,7% | 20,2% | 36,8% / 22,9% | 2,39 | 15,1% | 0% | 0,125 s | 7,41 m/s |

Incrociati e lungolinea sono misurati sul rimbalzo vero, per i colpi della CPU dalla fascia laterale (|x| ≥ 1,2 m).
A casual e pro la CPU gioca soprattutto lungolinea (in arrivo dalle risposte a campo aperto del motore).

### Da dove viene la forza (ablazione, `audit:legend -- --ablation`)

| variante | game di chi gioca: medio | game di chi gioca: tennista | game di chi gioca: preciso | errori CPU (medio / tennista / preciso) | chiusi a 60 colpi (medio / tennista / preciso) |
|---|---|---|---|---|---|
| Leggenda completa | 3,7% | 7,5% | 34% | 3,5% / 3,7% / 4,8% | 0,22% / 0,48% / 0,8% |
| senza «lascia passare» | 16% | 23,8% | 94,4% | 4,3% / 4,6% / 5,9% | 0,53% / 1,07% / 3,19% |
| scelta a caso tra i candidati | 4,3% | 22,9% | 37,5% | 4,3% / 4,9% / 5,1% | 0,1% / 1,04% / 1,02% |
| senza apprendimento | 2,6% | 13,6% | 33,2% | 3,5% / 3,9% / 4,6% | 0,05% / 0,73% / 1,46% |
| mai incrociato (solo lungolinea) | 10% | 77,2% | 59,7% | 6,1% / 6,2% / 7,1% | 0,09% / 2,56% / 0,62% |
| corsa come pro (5 m/s, velocità istantanea) | 3,4% | 7,6% | 27,3% | 3,5% / 3,7% / 4,5% | 0,16% / 0,56% / 0,87% |
| senza affondo | 4,1% | 6,2% | 39,8% | 3,7% / 3,6% / 4,6% | 0,33% / 0,3% / 0,93% |
| senza chiusura (scambi lunghi come gli altri) | 1,4% | 3,3% | 8,7% | 2,8% / 2,9% / 2,5% | 0,62% / 2,09% / 7,01% |

- «Lascia passare» è la parte che pesa di più: senza, «preciso» vince il 94% dei game (le sue palle lunghe, prese al
  volo dalla CPU sulla riga di fondo, restavano in gioco).
- La scelta per utilità conta contro chi gioca bene: con una scelta a caso tra gli stessi candidati «tennista» passa dal
  7,5% al 22,9% dei game; senza mai incrociare al 77%.
- L'apprendimento aiuta contro «tennista» e «preciso»; contro «medio» la CPU vincerebbe un po' di più senza.
- La corsa credibile (accelerazione e frenata) costa forza solo contro «preciso»: con la corsa istantanea a 5 m/s di pro
  «preciso» vincerebbe il 27,3% dei game invece del 34%. L'affondo aiuta contro «preciso» (senza: 39,8%).
- La chiusura degli scambi lunghi costa forza (senza, «preciso» scende all'8,7%) ma senza di lei il 7% dei punti contro
  «preciso» arriva a 60 colpi: è il prezzo del criterio «scambi chiusi d'ufficio ≤ 1%».

### Nel gioco con la grafica

Partite pro e Leggenda fatte avanzare a passi di 1/60 s nel gioco vero (con la grafica), giocatore automatico come
«preciso», 600 s di gioco per livello, seme 7. A ogni impatto della CPU: distanza laterale palla–corpo e quanto il
centro del piatto della racchetta passa vicino al punto d'impatto, nel piano che si vede dalla telecamera di gioco
(minimo nei 0,25 s dopo l'impatto). Mediana (e 90° percentile) per fascia di distanza:

| distanza palla–corpo | pro | Leggenda prima (lato del motore, senza allungo; 300 s) | Leggenda con il lato giusto, senza allungo | Leggenda finale |
|---|---|---|---|---|
| sotto 1 m | 0,29 m (0,63) | 0,54 m (0,88) | 0,51 m (0,81) | 0,49 m (0,73) |
| 1–1,3 m | 0,40 m | 0,37 m | 0,31 m | 0,43 m |
| 1,3–1,5 m | 0,67 m | 0,46 m | 0,54 m | 0,48 m |
| 1,5–1,9 m | (pro non ci arriva) | 0,93 m (1 impatto) | 0,88 m (1 impatto) | 0,52 m (3 impatti) |

Le ultime due colonne vengono dalla stessa partita (stesso seme) con l'allungo acceso e spento.

Affondi deterministici (palla a 1,9 m e a 1,75 m dal corpo, CPU ferma): all'impatto il piatto è a 0,15 e 0,17 m dalla
palla (0,30 e 0,83 m senza allungo e con il lato del motore), la CPU si inclina verso la palla con il braccio teso.
Nel torneo (tutti i profili) gli impatti oltre 1,5 m dal corpo sono lo 0,85% (da 0,1% contro «bambino» a 2,2% contro
«preciso»), oltre 1,3 m l'1,6%; in quelli oltre 1,5 m la CPU corre verso la palla a più di 3 m/s nell'88–92% dei casi.

## Come ripetere le prove

Dalla cartella `natpf-tennis`:

```
npm test                                   # tutti i test (compresi gli 11 di Leggenda)
npm run audit:legend                       # criteri di Leggenda e non regressione di casual/pro (esce con 1 se uno manca)
npm run audit:legend -- --table            # tabella casual / pro / leggenda per tutti i profili
npm run audit:legend -- --ablation         # contributo di ogni parte
npm run audit:legend -- --seeds=3 --points=150 --profiles=medio   # prova veloce
npm run audit:rally                        # scambi per livello e profilo (casual e pro invariati)
npm run audit:variety -- tennista pro      # varietà dei colpi (casual e pro invariati)
```

## Limiti

- Tutti i numeri vengono da giocatori simulati. Non puniscono la prevedibilità della CPU, non si stancano, non
  cambiano tattica e corrono da soli su ogni palla (il movimento di chi gioca è automatico anche nel gioco vero).
- Il modello dell'avversario impara in una partita e riparte da zero alla successiva.
- Impatti normali (palla entro 1 m dal corpo): la racchetta passa più lontana dalla palla che a pro (mediana 0,49
  contro 0,29 m), perché Leggenda arriva più precisa sul punto d'incontro del motore e la palla le passa più vicina al
  corpo (mediana 0,29–0,33 m contro 0,45 m), mentre la posa del colpo ha la racchetta a circa 0,8 m. Correzione
  possibile: puntare un punto d'incontro con la palla a circa 0,6 m dal corpo (cambia i numeri del torneo: va rifatto).
- Gli impatti oltre 1,5 m nel gioco con la grafica sono pochi (3–4 in 600 s per livello): il miglioramento è misurato
  bene negli affondi deterministici, meno nelle partite.
- Il motore colpisce quando la palla è ancora circa 1,3 m davanti al corpo (a tutti i livelli): dalla telecamera di
  gioco non si vede, dalle inquadrature laterali della moviola sì.
- «Lascia passare» è tarato più fine della specifica (vedi sopra).

## Da provare con persone vere

- Percentuale di game vinti da giocatori veri di livello diverso (principianti, giocatori di club, tennisti): la CPU
  deve restare battibile per chi gioca bene e non frustrare chi gioca poco (scegliendo Leggenda lo si sa).
- Se la CPU sembra prevedibile o «telepatica»: si capisce dove manderà la palla? Lascia passare palle che sembravano
  buone? Le risposte su palle lontane sembrano credibili (affondo, braccio teso)?
- Quanto durano gli scambi e se i colpi di chiusura sembrano naturali o forzati.
- Telefono e webcam: con i loro ritardi e i loro errori di direzione il divario può essere diverso da quello misurato
  con i profili simulati.
