# CPU «Leggenda»

Terzo livello della CPU, sopra «CPU esperta». Codice in `natpf-tennis/src/natpf/natpf_legend.js`, parametri del livello
in `natpf_skill.js` (`SKILL_LEVELS.leggenda`), agganci nel motore in `game_engine.js` (commenti «NATPF Leggenda»),
audit con soglie in `natpf-tennis/scripts/audit/legend.mjs`, test in `natpf-tennis/test/natpf-legend.test.mjs`.

## In breve

- Si sceglie nella pagina «Partita» (tessera «CPU Leggenda», accanto a «CPU facile» e «CPU esperta») o con
  `?mode=leggenda`; l'avversario si chiama «CPU Leggenda». Dopo una sfida torna il livello scelto, Leggenda compresa
  (prima tornava «casual»). «Sfida il campione» resta contro la CPU esperta.
- **Chi gioca** ha le regole di Esperto: finestra dell'aiuto sul tempo, dispersione, errori, velocità (8,8 m/s).
  Dal 22/10 il colpo di chi gioca segue il modello della racchetta virtuale (`docs/NATPF_RACCHETTA_VIRTUALE.md`), senza
  caso a tutti i livelli; a Leggenda con meno assistenza (mira piena 3,1 m, colpo che fallisce sotto qualità 0,63,
  pressione degli scambi dal 10° colpo).
- **La CPU** usa la stessa fisica di chi gioca e le stesse regole d'esecuzione di Esperto: niente probabilità d'errore
  «a dado», niente errori che crescono da soli con la lunghezza dello scambio. Sceglie il colpo per utilità tra molti
  schemi, impara dagli errori dell'avversario, si muove come una persona (split-step, reazione, accelerazione e frenata
  limitate, affondo) e lascia passare le palle che vede fuori.
- **casual, pro, 1v1 e le sfide**: gli agganci di Leggenda sono controlli che escono subito (prova del 20/10: firma di 36
  simulazioni, `audit:rally` e `audit:variety` identici a `726b5e3`). Dal 22/10 il colpo di chi gioca è cambiato a tutti
  i livelli (racchetta virtuale): il confronto con `726b5e3` non vale più per chi gioca.
- **Ritaratura del 22/10.** La forza della Leggenda veniva dagli errori casuali di chi gioca, che il nuovo modello non ha
  più: con lo stesso codice della CPU chi gioca vinceva. Cambiato:
  - CPU a 8 m/s (affondo 8,6), portata 2,3 m, lettura della palla ±0,18 m;
  - stima di quando chi gioca non arriva sulla palla (`humanReach`): il vincente vale dove chi gioca non arriva;
  - niente affondo durante il tempo di reazione;
  - pressione degli scambi lunghi anche sulla CPU, dal 10° colpo;
  - misura della reazione nell'audit corretta (la frenata non è una reazione).
- **Leggenda più dura (B16, 08/11/2026, decisione dell'utente «sì»).** Con i colpi forti più tesi del B15 la CPU vinceva
  il 67,3% dei game contro «tennista» (criterio ≥ 85) e il 25,9% contro «preciso» (criterio ≥ 60); i due criteri erano
  già rotti prima del B15 (74,5 e 37,4%) perché nessuno eseguiva l'audit. Cambiato solo `LEGEND` in `natpf_legend.js`,
  con cambiamenti da giocatore più forte e niente trucchi visibili (velocità massima, portata, reazione e lettura uguali):
  - **primo passo più esplosivo**: accelerazione / frenata 14 / 22 → 20 / 28 m/s² (chi gioca non ha inerzia);
  - **regge negli scambi lunghi**: la pressione degli scambi lunghi sulla CPU parte dal 20° colpo (prima dal 10°, come chi
    gioca a Leggenda);
  - **chiude senza strafare**: nel finale degli scambi lunghi forza +0,15 (prima +0,45), +0,25 m di larghezza (prima +0,6),
    colpo di chiusura a 0,72–0,85 (prima 0,85–0,95): prima sbagliava il 17–18% dei colpi di chiusura;
  - **controlla meglio i colpi forti e gioca con margine**: nell'esecuzione la parte dell'errore che cresce con la forza
    vale 0,65 volte quella di Esperto (`powerErr`), ma la scelta del colpo stima il rischio con le regole di Esperto. Con il
    rischio vero nella scelta, contro chi sbaglia molto la CPU giocava quasi solo colpi forti e profondi (entropia delle
    zone 2,05–2,24 bit, criterio ≥ 2,3);
  - **cerca l'angolo**: +0,01 di utilità all'incrociato stretto (`angle`). Non è un ritocco piccolo: con la temperatura
    della scelta (0,014) raddoppia il peso di quel colpo (e^(0,01/0,014) ≈ 2), che passa dal 7–10% al 15–17% dei colpi
    della CPU contro «medio» e «amatore» (su tutti i profili da 4–13% a 13–19%). Non serve per rispettare i criteri:
    senza, passano tutti (incrociati al 31,8% contro «medio», il valore più basso, con il limite a 30; game della CPU
    entro un punto). Si tiene per dare margine al criterio degli incrociati (con la preferenza 34,6–45,8%) e perché aprire
    il campo con l'angolo stretto è un colpo da giocatore forte. Se a chi gioca davvero sembra ripetitivo, si toglie
    (`angle` 0) senza rompere nessun criterio.
  - Il passo `audit:legend` gira su GitHub come ultimo passo del job del gioco (`natpf-tennis.yml`, dopo test, build e
    controlli del pacchetto, così un suo fallimento non nasconde l'esito della build), e `npm test` ha un torneo ridotto sui
    due profili forti (`natpf-legend-b16.test.mjs`): una modifica che indebolisce la Leggenda ora si vede.

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
| errore di lettura laterale del punto d'incontro | gaussiano, deviazione 0,11–0,18 m (`cpuReadSd` 0,18 × 0,6–1, più grande con la palla veloce; fino al 22/10 0,25), si azzera in 0,32 s |
| accelerazione / frenata | 20 / 28 m/s² (fino al B16: 14 / 22) |
| velocità massima | 8 m/s (`cpuSpeed`; fino al 22/10 7 m/s; chi gioca: 8,8) |
| affondo | palla che passerebbe tra 1,2 e 2,65 m dal corpo (portata + 0,35) nelle ultime 0,32 s: passo a 30 m/s², al massimo 8,6 m/s (fino al 22/10 8,4), fino a 1,05 m dalla palla |
| portata | 2,3 m (`cpuReach`; fino al 22/10 1,85 m) |
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

### Criteri di accettazione dopo il B16 (`audit:legend`, tutti rispettati, 08/11/2026)

Audit completo (punti e semi predefiniti), prima → dopo il B16:

| criterio | medio | amatore | tennista | preciso | bambino | impreciso |
|---|---|---|---|---|---|---|
| game vinti dalla CPU (soglia) | 92,2 → **97,7%** (≥ 90) | 98,5 → **99,8%** (≥ 90) | 67,3 → **92,4%** (≥ 85) | 25,9 → **70,8%** (≥ 60) | 100 → **100%** (≥ 98) | 99,8 → **99,8%** (≥ 98) |
| punti vinti da chi gioca | 27,2 → 18,2% | 18,3 → 11,9% | 43,0 → 27,4% | 60,8 → 41,2% | 10,5 → 7,3% | 10,0 → 8,1% |
| errori della CPU per colpo (2–6%) | 4,2 → 2,6% | 3,4 → 2,2% | 4,2 → 2,6% | 5,3 → 2,9% | 4,0 → 2,9% | 3,8 → 3,1% |
| incrociati (30–50%) | 32,3 → 36,1% | 36 → 42,5% | 37,3 → 40,2% | 32,9 → 34,6% | 39,4 → 45,8% | 37 → 45,1% |
| lungolinea (≥ 10%) | 28,1 → 25,7% | 19,1 → 18,5% | 24,3 → 25,7% | 32 → 33,3% | 22,1 → 20,5% | 19,8 → 15,2% |
| schemi sopra il 3% (≥ 6) | 9 → 9 | 8 → 9 | 9 → 9 | 9 → 9 | 8 → 8 | 8 → 8 |
| schema più usato (≤ 35%) | 19,2 → 16,9% | 17,6 → 16,8% | 15,6 → 19,4% | 15,4 → 16,4% | 20,9 → 17,1% | 20,4 → 21,4% |
| entropia delle 9 zone (≥ 2,3 bit) | 2,76 → 2,85 | 2,70 → 2,79 | 2,79 → 2,82 | 2,79 → 2,89 | 2,56 → 2,71 | 2,51 → 2,64 |
| stessa zona del colpo prima (≤ 20%) | 10,7 → 9,9% | 11,1 → 10,1% | 11,3 → 10,5% | 11,3 → 10,9% | 13 → 10,3% | 13,1 → 12% |
| scambi chiusi a 60 colpi (≤ 1%) | 0 → 0% | 0 → 0% | 0 → 0% | 0 → 0% | 0 → 0% | 0 → 0% |
| velocità massima della CPU (≤ 8,8 m/s) | 8,49 → 8,6 | 8,48 → 8,6 | 8,36 → 8,6 | 8,6 → 8,6 | 8,58 → 8,6 | 8,6 → 8,6 |
| reazione p10 (≥ 0,12 s) | 0,133 → 0,125 | 0,133 → 0,125 | 0,133 → 0,125 | 0,133 → 0,125 | 0,133 → 0,125 | 0,133 → 0,125 |
| vincenti / errori della CPU (≥ 1, solo «medio») | 1,17 → 1,86 | | | | | |
| colpi per punto | 12,6 → 13,4 | 11,2 → 11,4 | 14,7 → 16,5 | 17,4 → 20,0 | 5,9 → 5,8 | 5,8 → 5,9 |

- La reazione p10 scende da 0,133 a 0,125 s solo per la misura: la reazione pianificata è la stessa (0,15 ± 0,03 s), ma
  con l'accelerazione più alta la CPU supera prima la soglia di 0,3 m/s con cui l'audit la riconosce.
- Non regressione: contro «medio» chi gioca vince l'84,1% dei game a pro (70–85%, uguale a prima) e il 100% a casual
  (≥ 95%, uguale); `audit:rally` di casual e pro (7 profili, 600 punti) identico byte per byte a prima del B16.
- Su altri semi (201–208, stesso codice): tennista 93,0%, preciso 70,0%, amatore 99,8%, medio 98,6%, bambino e
  impreciso 100%, tutti i criteri rispettati: il margine non dipende dai semi dell'audit. Con 16 semi (gli 8 dell'audit
  più 97–151) contro «preciso» 70% circa. Il rumore va tenuto presente: con 8 semi × 300 punti contro «preciso» si giocano
  ~200 game, quindi ± 3 punti percentuali di errore standard, e cambiare un parametro rimescola tutte le partite.
- Da dove vengono i punti di chi gioca contro «preciso»: prima del B16 il 43,4% dei punti finiva con un errore della CPU
  (40,5% palle fuori, 2,9% in rete; un terzo degli errori, 220 su 647, negli scambi oltre i 20 colpi) e il 17,4% con un
  vincente (sempre con la CPU oltre 2,3 m dalla palla: palle a 118–133 km/h vicino alla riga laterale, quasi sempre con
  la CPU già al suo posto: angoli veri, che restano).

Ablazione del B16 (`audit:legend -- --ablation`, game vinti da chi gioca):

| variante | medio | tennista | preciso |
|---|---|---|---|
| Leggenda dopo il B16 | 2,3% | 7,6% | 29,2% |
| come prima del B16 (tutte le modifiche tolte: riproduce l'audit di prima) | 7,8% | 32,7% | 74,1% |
| senza il primo passo esplosivo (14 / 22 m/s²) | 1,4% | 13,9% | 36,8% |
| con la pressione dal 10° colpo | 3,3% | 9,2% | 40,3% |
| con la chiusura di prima | 1,7% | 8,8% | 34,7% |
| senza il controllo dei colpi forti (`powerErr` 1) | 5,0% | 16,7% | 50,0% |
| con il rischio vero nella scelta (senza margine) | 2,0% | 8,5% | 32,3% |
| senza l'angolo stretto | 2,5% | 8,0% | 30,3% |

Provati e scartati durante la taratura: lettura della palla più precisa (±0,1 m, correzione in 0,24 s: nessun effetto
misurabile), reazione 0,14 s (reazione p10 0,117 s, criterio ≥ 0,12), colpi più profondi (+0,3 m: contro «impreciso»
entropia 2,24 da sola, 2,03–2,09 insieme al controllo dei colpi forti), velocità 8,3 m/s, affondo più lungo, errore di tempo della CPU più piccolo (quasi senza effetto: la
qualità del colpo della CPU è già quasi sempre piena), preferenza per tutti gli incrociati (+0,01: contro «bambino» 50,2%
di incrociati, oltre il criterio).

Nel gioco con la grafica (prove nel browser, 08/11): `natpf-rally` con `DIFF=leggenda` (la prova ora applica le regole
del livello, velocità della CPU compresa) e `natpf-leggenda` (partita con il giocatore simulato «preciso», poi allunghi
forzati; fotogrammi all'impatto della CPU, negli allunghi e nell'affondo): la CPU colpisce sempre entro la portata,
corsa massima 8,0–8,6 m/s (affondo), colpi vari (81–82 colpi e 8–9 schemi in 6 punti). L'allungo si misura sul disegno,
con le posizioni 3D all'impatto di centro del piatto, mano destra e testa della CPU di lato verso la palla, rispetto agli
impatti normali della stessa prova (palla a 0,3–0,8 m: piatto a 0,77–0,78 m dal corpo, mano a 0,49, testa a 0,05–0,06):
- CPU ferma (allunghi forzati, palla a 1,2–2,1 m): piatto e mano vanno verso la palla di quasi tutto l'allungo previsto
  (+0,29 e +0,29 m a 1,2 m; +0,41–0,45 m da 1,5 m in su), la testa di +0,19–0,32 m; la palla resta a 0,13 m di lato dal
  centro del piatto a 1,2 m, 0,32 m a 1,5 m, 0,55 m a 1,8 m e 0,89 m a 2,1 m (l'allungo del disegno arriva al massimo a
  0,45 m);
- CPU che corre o fa l'affondo verso la palla: il piatto va fuori molto meno (+0,08–0,23 m: in partita, palla a 1,51 m,
  +0,08 m e palla a 0,66 m dal centro del piatto), la mano +0,21–0,32, la testa +0,24–0,42. Probabilmente la racchetta del
  motore base ruota e oscilla con la velocità laterale (`racket_kinematics.js`) e porta il piatto indietro rispetto alla
  corsa: da guardare se si vuole la racchetta sulla palla anche in corsa (non cambiato qui).
In 6 punti le palle oltre 1 m dal corpo sono poche (una o nessuna nelle ultime prove): per questo la prova finisce con gli
allunghi forzati. Con l'allungo del disegno spento la verifica fallisce (piatto, mano e testa a ±0,05 m dal posto
normale). Non provato con persone vere.

### Criteri di accettazione (`audit:legend`, 22/10/2026, storico)

Audit completo del 22/10/2026, con il codice finale della racchetta virtuale (punti e semi predefiniti):

| criterio | medio | amatore | tennista | preciso | bambino | impreciso |
|---|---|---|---|---|---|---|
| game vinti dalla CPU (soglia) | 95,3% (≥ 90) | 99,8% (≥ 90) | 97,3% (≥ 85) | 89,2% (≥ 60) | 100% (≥ 98) | 99,3% (≥ 98) |
| errori della CPU per colpo (2–6%) | 3,6% | 3,2% | 2,8% | 3,4% | 3,7% | 3,4% |
| incrociati (30–50%) | 34,6% | 36,9% | 33,9% | 32,1% | 44,9% | 42,2% |
| lungolinea (≥ 10%) | 24,4% | 19,2% | 25,8% | 29,1% | 17,4% | 22,5% |
| schemi sopra il 3% (≥ 6) | 9 | 9 | 10 | 10 | 9 | 9 |
| schema più usato (≤ 35%) | 14,3% | 21,2% | 18,6% | 19,4% | 26% | 15,7% |
| entropia delle 9 zone (≥ 2,3 bit) | 2,73 | 2,76 | 2,78 | 2,74 | 2,81 | 2,70 |
| stessa zona del colpo prima (≤ 20%) | 10,8% | 10,7% | 13,8% | 12,6% | 9,2% | 12,8% |
| scambi chiusi a 60 colpi (≤ 1%) | 0% | 0% | 0% | 0% | 0% | 0% |
| velocità massima della CPU (≤ 8,8 m/s) | 8,6 | 8,6 | 8,6 | 8,6 | 8,6 | 8,6 |
| reazione p10 (≥ 0,12 s) | 0,133 | 0,133 | 0,133 | 0,142 | 0,133 | 0,133 |
| vincenti / errori della CPU (≥ 1, solo «medio») | 1,76 | | | | | |

Non regressione: contro «medio» il giocatore vince l'83,3% dei game a pro (70–85%) e il 99,8% a casual (≥ 95%).

Prima della ritaratura (21/10, colpo di chi gioca con il caso): CPU 96,3% contro «medio», 66,0% contro «preciso»,
velocità massima 7,5–8,0 m/s, vincenti/errori 1,00. La Leggenda adesso è più forte contro chi gioca bene: la vittoria
contro «preciso» sale dal 66% all'89%. Va confermato con persone vere che resti divertente.

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
npm test                                   # tutti i test (compresi gli 11 di Leggenda e i 5 del B16, torneo ridotto)
npm run audit:legend                       # criteri di Leggenda e non regressione di casual/pro (esce con 1 se uno manca; ~70 s, anche su GitHub)
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
