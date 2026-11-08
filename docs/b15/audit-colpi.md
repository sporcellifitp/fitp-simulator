# B15 · Audit della sensibilità e della precisione dei colpi (08/11/2026)

Richiesta dell'utente (08/11): «Fai un nuovo audit per migliorare la sensibilità del dispositivo e la precisione dei colpi
rispetto ai gesti eseguiti. I colpi non sono ancora da campo aperto, anzi, tutti gli scambi vanno quasi sempre nella stessa
direzione con stessa velocità e angolazione. Assicurati che per i giocatori mancini sia tutto uguale.»

Tre giri sul ramo locale `b15-colpi` (base `8a996e3`), ognuno seguito da una verifica indipendente:

- **primo giro** (`404bb36` banco, `5bda836` correzioni, `ab9dd89` documenti): forza → velocità e profondità, colpo tipico
  su 24 colpi, centro della mira che non assorbe la mira tenuta;
- **secondo giro** (`cbecf4b` banco con la persona vera, `2d57a96` isteresi del centro, `8653af4` piatto più sensibile,
  `a1165b6` forza dell'esito, `9347b28` + `58fb8e0` seconda verifica del seme, `409c112` documenti);
- **terzo giro** (`012e017` banco per partita, `b64f74f` centro della mira di prima, `bde7963` forza di tipo per schiacciata
  e colpo potente, diagnostiche; più questo documento). La verifica del secondo giro aveva un punto **bloccante**: con il
  rumore di chi gioca davvero il centro della mira del primo e del secondo giro lasciava, partita per partita, più palle da
  una parte della base. Le misure su cui il secondo giro si era basato erano senza rumore o mescolavano le partite (gli errori
  di segno opposto di partite diverse si annullano). Il terzo giro misura per partita, prova i candidati e torna al centro
  della mira di prima.

La sintesi per chi gioca è al §8.

## 0. Il banco: `natpf-tennis/scripts/audit/colpi.mjs`

```
cd natpf-tennis
node --import ./test/register.mjs scripts/audit/colpi.mjs [--mode=tutto|banco|reale|partite] [--hand=right|left|both] [--json=file] [--quick]
```

- **banco** (catena vera del telefono): telefono simulato mosso dal braccio (`test/phone-sim.mjs` + `test/arm-sim.mjs`,
  presa insegnata del 04/11, calibrazione rapida con dritto e rovescio del braccio) → `swingMessage` → `parseSwingMessage`
  → `natpfSwingToEngine` (colpo tipico, centro della mira, salita abituale che imparano come in partita) → `strokeIntent`
  → motore headless → `strokeOutcome` → lancio e fisica fino al rimbalzo. Dopo dodici colpi normali ogni variante è letta
  senza insegnare niente: velocità del gesto 0,4…1,6×, piatto −30…+30°, tempo −1…+1 finestre, palla 0,7…1,8 m, livelli;
  240 colpi di una «persona normale» del telefono simulato; **sequenze senza rumore** con i riferimenti che imparano
  (+20° ×10, alternati +20° ×10, +30° ×14 e alternati +30° ×14, 1,5× ×10 e ×26, 0,7× ×10, anticipo 0,6 ×10).
- **reale** («persona vera»): la distribuzione dei gesti di chi gioca, stimata dalle diagnostiche del 23/10, 28/10 e 29/10:
  tempo +0,35 ± 0,45 unità della finestra, piatto ±12° attorno al proprio colpo, gesto 1 ± 0,3 volte il proprio colpo
  tipico, palla ±0,25 m, 60 % dritti, salita ±0,12, 400 colpi nelle **funzioni vere** del computer (`createAimModel` seminato
  dalla calibrazione e che impara, `strokeIntent`, motore con il ritmo). Il colpo tipico qui è fisso (780 °/s).
- **partite** (terzo giro, dalla verifica): la persona vera in **24 partite da 80 colpi**, ognuna giudicata da sola per
  blocchi di colpi (21–40, 41–60, 61–80): |mediana di x| della partita (quanto le palle di quella partita stanno da una
  parte; con il centro giusto resta circa mezzo metro, il campionamento di 20 colpi), partite con la mediana oltre 1 m da
  una parte, mediana con il segno, errore del centro della mira (medio e massimo). Casi: seme della calibrazione sbagliato
  di 0, ±15, ±25, ±30° (nei due versi); seme diverso nei due versi (dritto 30/rovescio 0, 0/30, 25/10, 20/−20);
  riferimento girato di 26, 28, 30, 32, 35, 38, 40° dopo 20 colpi (errore del centro 30 e 60 colpi dopo il giro); mira
  tenuta di +18° con dritto e rovescio nei primi 16 colpi, poi colpi normali.
- **mano**: `--hand=left` fa gli stessi gesti allo specchio; `both` stampa il confronto.
- `makeAim` (in `reale`, `partite`, `sequence`, `makePhone` e in `simPhone` del telefono simulato): fabbrica del centro
  della mira, per provare candidati senza toccare il sorgente.

È un banco deterministico sulle regole vere: non misura persone né telefoni veri. Registri: scratchpad dell'agente
(`c3/colpi-prima.json` = banco di oggi sopra `8a996e3`, `c3/colpi-dopo.json` = ramo a `bde7963`; candidati in `c3/ex/`).

## 1. Mappa ingresso → uscita (dritto del destro), prima (`8a996e3`) e dopo

Palla a 0,6 m dalla parte del dritto, 1 m d'altezza, 10,9 m dalla rete, vz 18 m/s, giocatore a 11,4 m, Casual, tempo 0.

| Ingresso | prima: x · prof. · km/h · rete · colpo · forza | dopo |
|---|---|---|
| gesto 0,4× | non mandato (sotto il 40 % del colpo tipico) | non mandato |
| gesto 0,5× | −0,03 · 7,64 · 78,4 · 1,85 · top spin · 0,19 | 0,02 · 7,22 · 69,4 · 2,22 · top spin · 0,12 |
| gesto 0,6× | −0,15 · 7,98 · 81,7 · 1,79 · top spin · 0,26 | −0,15 · 7,67 · 73,8 · 2,07 · top spin · 0,20 |
| gesto 0,8× | −0,15 · 8,61 · 87,3 · 1,72 · top spin · 0,38 | −0,15 · 8,47 · 82,6 · 1,87 · top spin · 0,34 |
| gesto 1× | −0,15 · 9,26 · 95,2 · 1,62 · top spin · 0,50 | −0,15 · 9,25 · 92,7 · 1,66 · top spin · 0,50 |
| gesto 1,2× | −0,15 · 10,08 · 111,5 · 1,31 · piatto · 0,62 | −0,15 · 9,99 · 105,7 · 1,50 · top spin · 0,65 |
| gesto 1,4× | −0,44 · 10,68 · 118,9 · 1,29 · piatto · 0,75 | −0,56 · 10,90 · 121,6 · 1,27 · piatto · 0,80 |
| gesto 1,6× | −0,52 · 11,15 · 123,1 · 1,27 · piatto · 0,87 | −0,68 · 11,16 · 123,2 · 1,26 · piatto · 0,88 |
| piatto −30 / −20 / −15 / −10 / −5° | x −3,80 / −3,42 / −2,48 / −1,74 / −0,73 | −3,80 / −3,80 / −3,46 / −2,43 / −0,98 |
| piatto +5 / +10 / +15 / +20 / +30° | x 0,16 / 0,84 / 1,72 / 2,93 / 3,31 | 0,29 / 1,24 / 2,50 / **3,31 / 3,31** |
| tempo −1 / −0,5 / +0,5 / +1 | x 3,59 / 1,77 / −1,90 / −3,59 | invariato |
| livelli casual / 1v1 / pro | identici: il livello cambia la precisione chiesta, non la mappa | identici |

Il gesto 1,2× resta top spin perché il colpo tipico è la mediana di 24 colpi (primo giro), non per la forza: il tipo si
legge con la pendenza di prima (§5). Da −15° a +15° di piatto la palla si sposta di 5,6–6,0 m (prima 3,9–4,2), destro e
mancino, dritto e rovescio; ma oltre 17° la mira è piena: **+20° e +30° cadono nello stesso punto** (3,31 m; rovescio 3,78).

## 2. La distribuzione vera, prima e dopo (persona vera, 400 colpi; mancino specchio esatto)

| | prima (`8a996e3`) | secondo giro (`409c112`) | dopo (`bde7963`) |
|---|---|---|---|
| x p10 / p50 / p90 (p90−p10) m | −3,07 / 0,32 / 3,01 (6,08) | −3,24 / 0,39 / 3,58 (6,82) | **−3,34 / 0,35 / 3,58 (6,92)** |
| palle a meno di 1 m / oltre 2,5 m dal centro | 28 % / 31 % | 26 % / 37 % | 26 % / **37 %** |
| profondità p10 / p50 / p90 (p90−p10) m | 7,86 / 9,28 / 10,58 (2,72) | 7,42 / 9,20 / 10,77 (3,35) | **7,41 / 9,20 / 10,70 (3,29)** |
| profondità sotto 8 m / oltre 10,5 m | 13 % / 11 % | 20 % / 14 % | 21 % / 14 % |
| km/h p10 / p50 / p90 (p90−p10) | 82,8 / 95,3 / 116,2 (33,4) | 75,7 / 92,9 / 119,8 (44,1) | **75,9 / 92,9 / 119,8 (43,9)** |
| altezza sul nastro p10 / p50 / p90 m | 1,28 / 1,62 / 1,80 | 1,26 / 1,66 / 2,05 | 1,26 / 1,66 / 2,05 |
| forza dell'esito p10 / p50 / p90 | 0,29 / 0,53 / 0,79 | 0,23 / 0,53 / 0,85 | 0,23 / 0,53 / 0,85 |
| tipi di colpo (colpo tipico fisso) | top spin 310, piatto 89, tagliato 1 | uguali | uguali |
| falliti o in rete | 0 | 0 | 0 |
| senza ritmo: x · prof. · km/h (p90−p10) | 6,51 · 3,01 · 33,8 | 7,05 · 3,46 · 44,3 | 7,11 · 3,41 · 44,4 |
| chi anticipa sempre: x · prof. · km/h | 5,34 · 2,76 · 33,1 | 6,21 · 3,24 · 43,9 | 6,39 · 3,24 · 43,9 |
| chi è preciso: x · prof. · km/h | 3,90 · 1,55 · 21,5 | 4,52 · 1,90 · 30,2 | 4,67 · 1,93 · 30,1 |

**Tipi di colpo con il colpo tipico che impara**: nel banco `reale` il colpo tipico è fisso, quindi i tipi sono identici per
costruzione. Con il colpo tipico che impara (persona della verifica, `createTypicalModel`) `TYPICAL.keep` 24 scambia **17
colpi su 400** tra piatto e top spin (8 piatti diventano top spin, 9 top spin diventano piatti; saldo nullo, nessun super,
nessun fallito): non è vero che i tipi restano «identici» colpo per colpo, come diceva il documento del secondo giro.

## 3. Il centro della mira per partita, con il rumore (24 partite, colpi 21–40 / 41–60 / 61–80)

Le colonne: **prima** = `8a996e3` (centro della mira di prima, `faceSpan` 20); **secondo giro** = `409c112` (isteresi,
seconda verifica, soglie 25°, `faceSpan` 14); **dopo** = ramo (centro della mira di prima, `faceSpan` 14). Valori: |mediana
x| per partita in metri (partite oltre 1 m da una parte su 24); errore del centro a fine blocco in gradi (medio / massimo).

| Caso | prima | secondo giro | dopo |
|---|---|---|---|
| seme −15° | 0,67 (6) / 0,69 (6) / 0,60 (6) | 0,98 (11) / 0,98 (12) / 0,91 (8) | 0,81 (8) / 0,73 (8) / 0,65 (7) |
| seme giusto | 0,54 (2) / 0,61 (4) / 0,53 (4) | 0,74 (7) / 0,74 (7) / 0,79 (7) | 0,61 (5) / 0,70 (8) / 0,60 (6) |
| seme giusto: errore del centro | 1,4/4,4 · 1,6/3,3 · 1,7/3,2° | 2,1/8,9 · 2,0/8,4 · 1,8/7,8° | 1,4/4,4 · 1,6/3,3 · 1,7/3,2° |
| seme +15° | 0,74 (8) / 0,73 (7) / 0,59 (4) | 1,21 (14) / 0,91 (10) / 1,01 (8) | 0,87 (10) / 0,82 (10) / 0,64 (5) |
| semi ±15/±25/±30°, media (partite oltre 1 m su 144) | 0,76 (48) / 0,69 (38) / 0,60 (31) | 0,96 (62) / 0,92 (59) / 0,90 (51) | 0,93 (61) / 0,77 (48) / 0,66 (36) |
| semi diversi nei due versi, media (su 96) | 0,76 (27) / 0,67 (22) / 0,59 (19) | 0,91 (37) / 0,84 (31) / 0,88 (39) | 0,94 (42) / 0,80 (36) / 0,67 (25) |
| girato 26–32°: errore 30 / 60 colpi dopo | 8,3° / 4,1° | 17,8° / 10,7° | 8,3° / 4,1° |
| girato 26–32°: \|mediana x\| 41–60 / 61–80 | 1,18 / 0,70 | 2,45 / 1,87 | 1,37 / 0,85 |
| girato 35–40°: errore 30 / 60 colpi dopo | 8,9° / 4,0° | 17,1° / 8,9° | 8,9° / 4,0° |
| mira +18° nei primi 16 colpi, poi normale: mediana con il segno | −1,16 / −0,59 / −0,38 | −2,38 / −1,92 / −1,68 | −1,54 / −0,76 / −0,50 |

Lettura: l'errore del centro **dopo** è quello di prima, caso per caso, perché il modello è quello di prima. I metri sono un
po' di più perché con `faceSpan` 14 lo stesso errore sposta di più la palla (un grado vale circa 0,25 m invece di 0,18):
con i semi sbagliati 0,93/0,77/0,66 m contro 0,76/0,69/0,60. È il prezzo del piatto più sensibile (§7). Il secondo giro era
peggio in quasi tutto: centro corrotto con il seme giusto fino a 8,9°, riferimento girato di 26–32° (la «fascia morta» sotto
la soglia di 25°) ancora sbagliato di 11° dopo 60 colpi, la mira dei primi 16 colpi presa per un seme sbagliato e spinta
dall'altra parte per sessanta colpi. Dove il secondo giro era meglio (semi di ±25/±30° e dritto 30°/rovescio 0° nei colpi
21–40, per la verifica a 20°) è peggio più avanti (colpi 61–80 0,90 m contro 0,66).

**Candidati provati** (stesso banco, `faceSpan` 14, confronto con il centro di prima nello stesso contesto; |mediana x|
media dei semi ±15/±25/±30° e partite oltre 1 m; semi diversi nei due versi; seme giusto; riferimento girato; mira tenuta
nei primi 16 colpi; senza rumore: +20° ×10 e +30° ×14 dritti, x finale):

| Candidato | semi ± | semi diversi | seme giusto | girato 26–32°: errore 30/60 | mira tenuta 16 colpi | +20° ×10 | +30° ×14 |
|---|---|---|---|---|---|---|---|
| **centro di prima** (scelto) | 0,93/0,77/0,66 (61/48/36) | 0,94/0,80/0,67 | 0,61/0,70/0,60, max 4,4° | 8,3/4,1° | −1,54/−0,76/−0,50 | 1,92 | 1,75 |
| secondo giro (`409c112`) | 0,96/0,92/0,90 (62/59/51) | 0,91/0,84/0,88 | 0,74/0,74/0,79, max 8,9° | 17,8/10,7° | −2,38/−1,92/−1,68 | 3,31 | 2,50 |
| secondo giro senza seconda verifica | 1,33/1,20/1,05 (80/79/63) | 1,06/0,92/0,89 | 0,66/0,69/0,65 | 17,9/10,8° | −1,37/−0,95/−0,84 | 3,31 | 2,50 |
| di prima + `drift` 0,01 | 0,98/0,82/0,69 (67/50/35) | 1,00/0,84/0,74 | 0,62/0,69/0,65 | 8,7/4,5° | −1,62/−0,86/−0,63 | 1,31 | 2,07 |
| di prima + `biasDev` 16 | 0,95/0,77/0,65 (62/51/36) | 1,08/0,85/0,72 | uguale | 8,9/4,7° | −1,59/−0,81/−0,55 | 2,97 | 1,75 |
| di prima + `biasDev` 25 | 0,97/0,80/0,65 (65/55/35) | 1,30/0,97/0,85 | uguale | 9,8/5,3° | −1,59/−0,81/−0,56 | 2,97 | 3,31 |
| di prima + `biasPull` 0,15 | 0,95/0,78/0,65 (61/51/36) | 1,01/0,82/0,68 | uguale | 8,8/4,3° | −1,57/−0,77/−0,52 | 1,99 | 1,90 |
| di prima + `verifyDev` 20 | 0,84/0,77/0,67 (54/48/42) | 0,77/0,70/0,66 | 0,65/0,68/0,60, max 5,8° | 8,4/4,1° | −1,62/−0,73/−0,49 | 1,92 | 1,75 |
| di prima + `commonDev` 6 | 0,79/0,75/0,61 (45/36/35) | 0,91/0,81/0,66 | 0,62/0,70/0,60, max 4,9° | 7,4/3,5° | −1,64/−0,67/−0,41 | 1,92 | 1,75 |
| di prima + `commonDev` 6 + `biasPull` 0,15 | 0,80/0,75/0,60 (45/38/33) | 0,97/0,83/0,67 | come sopra | 7,7/3,7° | −1,68/−0,70/−0,42 | 1,99 | 1,90 |

Provati anche `biasDev` 20, `biasPull` 0,1, `alpha` 0,08, `commonEnd` 4 e 5 (isteresi del solo comune), `verifyDev` 25,
`commonDev` 7 + `biasPull` 0,2, `commonDev` 6 + `biasDev` 14. Regola di scelta (della verifica): con il rumore non peggiore
del centro di prima in tutte le misure per partita e migliore senza rumore sulla mira tenuta. **Nessun intermedio la
rispetta**: rendere più tardo o più lento il «pull» di un verso (`biasDev`, `biasPull`, `drift`) tiene la mira tenuta di un
verso ma lascia il seme sbagliato in un verso solo e rallenta il riferimento girato; rendere più deciso il «pull» comune
(`commonDev` 6, `commonEnd`) o la verifica (`verifyDev` 20) migliora molto semi e riferimento girato ma prende di più la
mira tenuta con dritto e rovescio insieme (−1,54 → −1,62…−1,74 m ai colpi 21–40) e peggiora qualche caso di seme diverso
nei due versi (con `verifyDev` 20 il seme 20°/−20°: 0,78 → 0,84 m). Mira tenuta e
riferimento sbagliato, per il centro, sono la stessa cosa: si distinguono solo da quanto durano. Si torna quindi al centro di
prima (`b64f74f`), dichiarandolo: via l'isteresi a due velocità, la seconda verifica del seme e i cambi di soglie del primo
giro (`verifyDev` 20, `biasDev`/`commonDev` 25, pull 0,2, `drift` 0,01). `commonDev` 6 resta un'opzione misurata da
decidere con l'utente (porta i semi sbagliati ai metri di prima del B15 al prezzo della mira tenuta con i due colpi).

## 4. Sequenze senza rumore (riferimenti che imparano; x del primo → ultimo colpo)

| Sequenza (destro) | prima | primo giro | secondo giro | dopo |
|---|---|---|---|---|
| dieci dritti, piatto +20° | 2,83 → 1,31 | 2,83 → 2,54 | 3,31 → 3,31 | 3,31 → 1,92 |
| dritti e rovesci alternati +20° (ultimi D/R) | 2,83 → 2,47/3,42 | 2,83 → 2,73/3,61 | 3,31 → 3,31/3,78 | 3,31 → 3,31/3,78 |
| quattordici dritti, piatto +30° | 3,31 → 1,20 | 3,31 → 0,63 | 3,31 → 2,50 | 3,31 → 1,75 |
| alternati +30° ×14 | 3,31 → 3,31/3,78 | uguale | uguale | uguale |
| dieci dritti a 1,5× (forza, km/h) | 0,81 → 0,65, 121,8 → 113,9 | 0,80 → 0,80 | 0,84 → 0,84, 124,2 → 124,0 | 0,84 → 0,84, 124,2 → 124,0 |
| 26 dritti a 1,5× (finestra 24) | 0,81 → 0,64, → 107,4 | 0,80 → 0,64 | 0,84 → 0,64, → 108,5 | uguale |
| dieci dritti a 0,7× | 0,32 → 0,40, 84,4 → 88,3 | 0,31 → 0,32 | 0,27 → 0,28, 78,0 → 78,7 | uguale |
| anticipo +0,6 finestre ×10 | −2,25 → −0,57 (ritmo) | uguale | uguale | uguale |

La mira tenuta da un verso solo torna a essere presa dal centro dopo sei-sette colpi (come prima del B15; finisce più
lontano dal centro solo perché il piatto è più sensibile). **Mancino**: le stesse sequenze allo specchio danno +20° ×10 → 0,75
e +30° ×14 → 0,92 m (destro 1,92 e 1,75; alla base 0,50 e 0,61 contro 1,31 e 1,20). Non è la mano: con gli stessi ingressi
allo specchio (banco `reale` e `partite`) il mancino è identico al destro cambiato di segno. È il telefono simulato: i gesti
allo specchio non sono identici al grado (centri dopo il riscaldamento −6,8°/5,7° del destro, 5,9°/−6,4° del mancino) e,
dopo il «pull», lo scarto del mancino scende sotto `settle` (10°), dove il centro segue i colpi con `alpha`, mentre quello del
destro resta appena sopra. Anche i piatti girati di ±10–15° differiscono fino a 0,6 m (destro 2,43, mancino 1,87 a ±10°):
con `faceSpan` 14 un grado di differenza nella misura vale 0,25 m.

## 5. Costanti: che cosa cambia rispetto alla base, con il motivo e la misura (nel commento di ogni costante)

| Costante (file) | prima | dopo | perché e misura |
|---|---|---|---|
| `TYPICAL.keep` (`natpf_phone_racket.js`) | 9 | 24 | dieci dritti a 1,5×: forza 0,81 → 0,65 dal sesto colpo prima, ora 0,84 → 0,84 |
| tetto del volo base (`game_engine.js`) | 1,2 | 1,5 | con le due righe sotto: km/h della persona vera p90−p10 33,4 → 43,9 (con `relGain`) |
| `OUTCOME.topClearSoft`, `clearCurve`, `topSpinPower` (`natpf_stroke_outcome.js`) | — | 2,5 m, 1,5, 8 | il colpo forte passa più basso e carico, il morbido galleggia: 0,6× 74 km/h, 1× 93, 1,4× 122 |
| `OUTCOME.smashSpeed` | 46 | 48 m/s | la schiacciata resta ≥ 1,4 volte il piatto pieno (richiesta del 29/10) |
| `INTENT.faceSpan` (`natpf_stroke_intent.js`) | 20 (mira piena a 23°) | 14 (piena a 17°, 10° = 0,5) | persona vera x p90−p10 6,08 → 6,92 m, oltre 2,5 m 31 → 37 %; da −15° a +15° 3,9–4,2 → 5,6–6,0 m |
| `INTENT.relGain` / `classGain` (`strokePower`) | 0,6 | 0,9 per l'esito, 0,6 per il tipo | forza p10/p90 0,29/0,79 → 0,23/0,85; profondità p90−p10 2,72 → 3,29 m; colpo tipico fermo a 0,5 |
| `typePower`, `superStrength(intent, d)` | una sola forza | il tipo di colpo, il colpo super, la barra della potenza, la schiacciata dal gesto (`smashAt`) e il colpo potente del motore (stelle e scossa, soglia 0,7) leggono la forza con la pendenza di prima | soglie tarate lì: super da 1,5× come prima, colpo potente da 1,25× (con la forza dell'esito sarebbe 1,2×), schiacciata dal gesto da 0,64× (sarebbe 0,71×). Webcam, CPU e registrazioni senza `typePower` (o con `null`): `power` |
| diagnostiche (`diag_recorder.js`, `diag_viewer.js`) | — | `forzaTipo` accanto a `forza` in `tel.colpo` e in `racchetta`, solo se c'è; il «perché niente super» con la forza di tipo; il visore la mostra | campo nuovo, i registri della webcam e dei telefoni di prima restano come prima |
| `AIM` (`natpf_gestures.js`) | — | **invariato** (provati e tolti: isteresi, seconda verifica, soglie del primo giro, §3) | — |

Non cambiati: ritmo (`RHYTHM`, decisione del 28/10), soglie del tipo di colpo, profondità per tipo, soglia minima del
gesto, zona morta del piatto (3°).

## 6. Prove

`natpf-tennis/test/natpf-colpi-b15.test.mjs` (12):

- forza: da 0,6× a 1,6× almeno ×1,6 in velocità e 2,5 m in profondità, in ordine, colpo tipico a 9,2 m e 90–95 km/h;
- piatto: 15° chiaramente diverso, 30° quasi la riga, dritto e rovescio equivalenti; **da −15° a +15° almeno 5 m e almeno
  2 m per verso**, destro e mancino (prima 3,9–4,2 m; la soglia di 2,4 m per verso del secondo giro passava di poco,
  2,36–2,46 a seconda di un grado del centro dopo il riscaldamento);
- tempo → direzione a ogni livello, deterministico; colpo tipico che non insegue dieci colpi forti o morbidi;
- persona vera più aperta (x p90−p10 ≥ 6,6 m, ≥ 34 % oltre 2,5 m), mancino specchio esatto; forza più ampia (km/h
  p90−p10 ≥ 42, profondità ≥ 3,2 m); tipo di colpo e super con la pendenza di prima;
- **per partita, con il rumore** (nuove, falliscono con `409c112`): seme −15/+15° (|mediana x| media dei tre blocchi ≤ 0,82
  m, colpi 61–80 ≤ 0,7, partite oltre 1 m ≤ 27; secondo giro 0,96–1,04 m) e seme giusto (≤ 0,68 m, errore del centro
  massimo ≤ 5,5°, medio ≤ 1,9°; secondo giro 0,76 m e 8,9°); riferimento girato di 26/32/38° (errore ≤ 10,5° dopo 30
  colpi e ≤ 5,5° dopo 60, |mediana x| dei colpi 61–80 ≤ 1,05 m; secondo giro 17–18°, 8,7–11,9°, 1,56–2,03 m); mira di +18°
  nei primi 16 colpi (mediana ≥ −1,75/−1/−0,7 m; secondo giro −2,38/−1,92/−1,68), con il mancino specchio esatto;
- **schiacciata dal gesto e colpo potente con la forza di tipo** (nuova, fallisce con `409c112`): gesto da schiacciata a
  forza di tipo 0,32 (esito 0,26) sì, 0,28 (esito 0,34) no, senza `typePower` vale `power`, `typePower` null non conta;
  colpo potente a 1,22× (forza dell'esito 0,7, di tipo sotto) no, a 1,3× sì.

Tolte (comportamenti tolti con il centro della mira di prima): mira tenuta di dieci dritti a 20° e alternati, isteresi
(riferimento girato di 35–40° in 30 colpi, scarto di 22° tenuto), mira piena +30° ×14 destro e mancino ≥ 1,5 m, seconda
verifica del seme (due prove). `natpf-diag.test.mjs`: una prova nuova (`forzaTipo` nel gesto e nell'esito, `superNo` con la
forza di tipo). Le prove della base non sono state toccate; `natpf-sessione-23-10` «mira dal piatto» resta quella del
secondo giro (curva da 3° a 17°).

## 7. Rischi dichiarati

- **Leggenda** (`audit:legend`, 300 punti, 8 semi; identico al secondo giro): due criteri già KO alla base peggiorano con il
  motore del primo giro: CPU Leggenda contro «tennista» **74,5 → 67,3 %** dei game (criterio ≥ 85 %), contro «preciso»
  **37,4 → 25,9 %** (criterio ≥ 60 %). I colpi forti dei profili forti passano più bassi e la Leggenda li prende meno. Pro
  contro «medio» 85,3 → 84,1 % (criterio 70–85 %: era KO alla base, ora OK). Non corretto: da decidere con l'utente
  (Leggenda più dura o colpi forti meno tesi).
- **Webcam** (`eventIntent` → `strokeOutcome`): non ha `typePower`, quindi super, schiacciata dal gesto e colpo potente
  leggono `power` come prima; il motore del primo giro cambia la velocità in cima: colpo webcam a forza 0,2 / 0,6 / 1 →
  79,0 / 98,5 / 121,8 km/h prima, 74,4 / 99,4 / 127,4 dopo, x e profondità identiche (misura del secondo giro: il terzo non
  tocca questa strada). Non provata nel browser in questo giro.
- **`faceSpan` 14 satura a 17°**: piatto girato di 20° e di 30° cadono nello stesso punto (3,31 m di dritto, 3,78 di
  rovescio); qualche grado di piatto sbagliato sposta di più (5° ≈ 1 m, un grado ≈ 0,25 m).
- **Errori del centro più visibili**: con lo stesso centro della mira di prima, i metri da una parte per partita crescono
  con `faceSpan` 14 (semi sbagliati 0,76/0,69/0,60 → 0,93/0,77/0,66 m; seme giusto 0,54/0,61/0,53 → 0,61/0,70/0,60): la
  varietà cresce di più (x p90−p10 6,08 → 6,92 m), ma l'errore del centro non è diminuito. Opzione misurata: `commonDev` 6
  (§3).
- **Mira tenuta presa dal centro come prima**: tenere lo stesso piatto girato per più di sei-sette colpi di fila fa tornare la
  palla verso il centro (+20° ×10: 3,31 → 1,92 m; mancino nel telefono simulato 0,75, §4); con dritto e rovescio insieme
  dopo una decina di colpi per verso.
- **`TYPICAL.keep` 24** scambia 17 colpi su 400 tra piatto e top spin quando il colpo tipico impara (saldo nullo, §2).
- **`clearCurve` su tutti i colpi tranne il pallonetto**: piatto, tagliato e palla corta morbidi passano fino a 4 cm più
  bassi sul nastro; nessun fallito nella persona vera, `natpf-gesti-speciali` 9/9 nel browser.
- **Cosa resta**: la velocità in cima non supera ~124 km/h (altezza minima sul nastro, volo minimo 0,58 s); il ritmo ricentra
  chi anticipa sempre (decisione del 28/10); la distribuzione «vera» è stimata dalle diagnostiche, non registrata colpo per
  colpo; il rumore del piatto dei telefoni veri non è misurato; le asimmetrie del percorso del mancino (calibrazione,
  racchetta animata, webcam per due) sono del ramo `b15-mancini`.

## 8. In sintesi: che cosa cambia per chi gioca

- **Velocità e profondità seguono il gesto**: dal colpo morbido al colpo forte (0,6× → 1,6× del proprio colpo) la palla va
  da 74 a 123 km/h e da 7,7 a 11,2 m; nella distribuzione vera km/h p90−p10 33,4 → 43,9 e profondità 2,72 → 3,29 m. Il
  colpo normale resta quasi dov'era (9,2 m, 93 km/h; prima 9,3 m e 95 km/h). Dieci colpi forti di fila restano forti (prima la forza tornava a metà).
- **Il piatto decide di più la direzione**: da −15° a +15° la palla si sposta di 5,6–6,0 m (prima 3,9–4,2); nella
  distribuzione vera x p90−p10 6,08 → 6,92 m e palle oltre 2,5 m dal centro 31 → 37 %. Oltre 17° la mira è piena.
- **Il centro della mira è quello di prima**: si corregge sui colpi veri (seme della calibrazione sbagliato, corpo girato)
  come prima del B15, partita per partita; la mira tenuta per più di sei-sette colpi di fila torna verso il centro, come
  prima. Le prove del secondo giro che la tenevano lasciavano, con il rumore vero, più palle da una parte in ogni partita.
- **Tipi di colpo, colpo super, schiacciata dal gesto, colpo potente e barra della potenza** scattano dagli stessi gesti di
  prima.
- **Mancini**: con gli stessi gesti allo specchio il risultato è lo specchio esatto (x, profondità, tipi, errore del centro,
  misure per partita); km/h uguali tranne l'effetto dei tagliati, che il motore lega al lato del campo (fino a 0,9 km/h).

## 9. Verifiche (terzo giro, ramo a `bde7963` più questo documento)

- `cd natpf-tennis && npm test`: `012e017` 907/907, `b64f74f` 905/905 (cinque prove tolte, tre per partita aggiunte; la
  quarta nuova, dei non bloccanti, arriva nel commit dopo), `bde7963` **907/907**.
- `node --test tools/test/*.test.mjs`: **195/195**.
- Banchi: `colpi.mjs --hand=both` prima (`8a996e3` con il banco di oggi) e dopo; `--mode=partite` per i candidati;
  `audit:rally` (600 punti per profilo; prima → dopo): Casual medio 93,2 → 94,2 %, amatore 84,2 → 87,0, tennista 98,7 →
  99,3, umano 89,5 → 88,3, preciso 100 → 100; Pro medio 65,3 → 65,8, amatore 60,2 → 63,2, tennista 96,8 → 96,2, umano 76,7
  → 74,0 (identico al secondo giro: i profili danno l'intenzione direttamente, senza centro della mira); `audit:legend` §7.
- Browser: vedi il registro (`docs/WORK_PROGRESS.md`, B15.4).
- Non verificato: telefoni veri, persone vere, rumore del piatto dei telefoni veri, webcam nel browser, Windows, pacchetti
  (il ramo va integrato prima).
