# B15 · Audit della sensibilità e della precisione dei colpi (08/11/2026)

Richiesta dell'utente (08/11): «Fai un nuovo audit per migliorare la sensibilità del dispositivo e la precisione dei colpi
rispetto ai gesti eseguiti. I colpi non sono ancora da campo aperto, anzi, tutti gli scambi vanno quasi sempre nella stessa
direzione con stessa velocità e angolazione. Assicurati che per i giocatori mancini sia tutto uguale.»

Due giri sul ramo locale `b15-colpi` (base `8a996e3`): il **primo giro** (`404bb36` banco, `5bda836` correzioni, `ab9dd89`
documenti) e, dopo una verifica indipendente che ha concluso «integrare con correzioni», il **secondo giro** (`cbecf4b`
banco esteso, `2d57a96` isteresi, `8653af4` piatto, `a1165b6` forza, `9347b28` + `58fb8e0` seme della calibrazione, più
questo documento). La verifica aveva trovato che con la distribuzione dei gesti di una persona vera le correzioni del primo
giro non cambiavano né la direzione né la profondità (solo i km/h), che la mira piena tenuta finiva al centro (regressione
dell'isteresi) e che il «prima» di questo documento non si riproduceva con il banco committato: tutto è rifatto qui sotto.

## 0. Il banco: `natpf-tennis/scripts/audit/colpi.mjs`

```
cd natpf-tennis
node --import ./test/register.mjs scripts/audit/colpi.mjs [--mode=tutto|banco|reale] [--hand=right|left|both] [--json=file] [--quick]
```

- **banco** (catena vera del telefono): telefono simulato mosso dal braccio (`test/phone-sim.mjs` + `test/arm-sim.mjs`,
  presa insegnata del 04/11, calibrazione rapida con dritto e rovescio del braccio) → `swingMessage` → `parseSwingMessage`
  → `natpfSwingToEngine` (colpo tipico, centro della mira, salita abituale che imparano come in partita) → `strokeIntent`
  → motore headless `_attemptPlayerRallyStrike` → `_natpfRacketShot` → `strokeOutcome` → lancio e fisica fino al
  rimbalzo. Dopo dodici colpi normali di riscaldamento ogni variante è letta senza insegnare niente: velocità del gesto
  0,4…1,6× del colpo del braccio, piatto girato −30…+30°, tempo −1…+1 finestre, palla 0,7…1,8 m, livelli; 240 colpi di
  una «persona normale» del telefono simulato; **sequenze** con i riferimenti che imparano (+20° ×10, alternati +20° ×10,
  **+30° ×14** e alternati +30° ×14, 1,5× ×10 e ×26, 0,7× ×10, anticipo 0,6 ×10).
- **reale** («persona vera», secondo giro): la distribuzione dei gesti di chi gioca davvero, presa dalle diagnostiche del
  23/10, 28/10 e 29/10 dalla verifica indipendente: tempo +0,35 ± 0,45 unità della finestra, piatto ±12° attorno al proprio
  colpo, gesto 1 ± 0,3 volte il proprio colpo tipico (forza 0,54 ± 0,2), palla ±0,25 m, 60 % dritti, salita ±0,12 attorno
  alla propria abituale, 400 colpi. Ogni colpo passa dalle **funzioni vere** del computer: centro della mira
  (`createAimModel`, seminato dalla calibrazione e che impara dai colpi normali), `strokeIntent` (forza, tipo di colpo,
  mira), motore con il ritmo che impara. Varianti: senza ritmo, chi anticipa sempre, chi è preciso, e il **seme della
  calibrazione sbagliato** di ±15° (24 partite di 40 colpi: errore del centro e x per blocchi di colpi).
- **mano**: `--hand=left` fa gli stessi gesti allo specchio (braccio, piatto, palla dall'altra parte); con `both` il banco
  stampa il confronto. Persona vera: x, profondità e tipo di colpo **identici allo specchio** su 400 colpi (|x_D + x_M| = 0,
  |prof_D − prof_M| = 0), km/h identici tranne i tagliati (fino a 0,9 km/h: l'effetto laterale dei tagliati il motore lo
  lega al lato del campo in cui sta chi colpisce, `R = p.pos.x >= 0`, non alla mano; al centro esatto del banco va dalla
  stessa parte). Banco del telefono: piatto girato di +y° del destro contro −y° del mancino uguali a meno del tremolio.

È un banco deterministico sulle regole vere: non misura persone né telefoni veri. Registri delle misure qui sotto:
scratchpad dell'agente (`colpi2/prima.json`, `ramo.json`, `dopo.json`, generati con lo stesso banco copiato sopra `8a996e3`,
sopra `ab9dd89` e sul ramo).

## 1. Mappa ingresso → uscita, prima (base `8a996e3`, rigenerata) e dopo (ramo)

Palla a (0,6 m dalla parte del dritto, 1 m, 10,9 m dalla rete), vz 18 m/s, giocatore a 11,4 m, Casual, tempo 0. x = caduta
laterale (+ destra), prof. = profondità dalla rete, km/h = velocità della palla dopo il lancio, rete = altezza sul nastro.
Il «prima» del primo giro non si riproduceva: con il banco committato il gesto 1,2× è un **piatto a 111,5 km/h** (non un top
spin a 101,9) e i dritti e rovesci alternati girati di 20° finiscono a D 2,47 / R 3,42 m (non 1,42/1,55).

| Ingresso (dritto) | prima: x · prof. · km/h · rete · colpo · forza | dopo: x · prof. · km/h · rete · colpo · forza |
|---|---|---|
| gesto 0,4× | gesto non mandato (sotto il 40 % del colpo tipico) | gesto non mandato |
| gesto 0,5× | −0,03 · 7,64 · 78,4 · 1,85 · top spin · 0,19 | 0,02 · 7,22 · 69,4 · 2,22 · top spin · 0,12 |
| gesto 0,6× | −0,15 · 7,98 · 81,7 · 1,79 · top spin · 0,26 | −0,15 · 7,67 · 73,8 · 2,07 · top spin · 0,20 |
| gesto 0,8× | −0,15 · 8,61 · 87,3 · 1,72 · top spin · 0,38 | −0,15 · 8,47 · 82,6 · 1,87 · top spin · 0,34 |
| gesto 1× | −0,15 · 9,26 · 95,2 · 1,62 · top spin · 0,50 | −0,15 · 9,25 · 92,7 · 1,66 · top spin · 0,50 |
| gesto 1,2× | −0,15 · 10,08 · 111,5 · 1,31 · piatto · 0,62 | −0,15 · 9,99 · 105,7 · 1,50 · top spin · 0,65 |
| gesto 1,4× | −0,44 · 10,68 · 118,9 · 1,29 · piatto · 0,75 | −0,56 · 10,90 · 121,6 · 1,27 · piatto · 0,80 |
| gesto 1,6× | −0,52 · 11,15 · 123,1 · 1,27 · piatto · 0,87 | −0,68 · 11,16 · 123,2 · 1,26 · piatto · 0,88 |
| piatto −30° / −20° / −15° / −10° / −5° | −3,80 / −3,42 / −2,48 / −1,74 / −0,73 | −3,80 / −3,80 / −3,46 / −2,43 / −0,98 |
| piatto +5° / +10° / +15° / +20° / +30° | 0,16 / 0,84 / 1,72 / 2,93 / 3,31 | 0,29 / 1,24 / 2,50 / 3,31 / 3,31 |
| tempo −1 / −0,5 / +0,5 / +1 | 3,59 / 1,77 / −1,90 / −3,59 | invariato (km/h 91,6 / 92,7 / 92,5 / 86,7) |
| palla 0,7 m / 1,8 m | 92,1 / 113,0 km/h | 89,8 / 110,4 km/h |
| livelli casual / 1v1 / pro | identici: il livello cambia la precisione chiesta, non la mappa | identici |

Il gesto 1,2× diventa top spin dopo perché il colpo tipico ora è la mediana di 24 colpi (primo giro), non per la forza: il
tipo si legge con la pendenza di prima (§3.2).

**Sequenze** (riferimenti che imparano; x del primo → ultimo colpo, o forza e km/h):

| Sequenza | prima | primo giro | dopo |
|---|---|---|---|
| dieci dritti, piatto +20° | 2,83 → 1,31 | 2,83 → 2,54 | 3,31 → 3,31 |
| dritti e rovesci alternati, +20° (ultimi D/R) | 2,83 → 2,47/3,42 | 2,83 → 2,73/3,61 | 3,31 → 3,31/3,78 |
| **quattordici dritti, piatto +30° (mira piena)** | 3,31 → **1,20** | 3,31 → **0,63** | 3,31 → **2,50** |
| alternati +30° ×14 | 3,31 → 3,78 | 3,31 → 3,78 | 3,31 → 3,78 |
| dieci dritti a 1,5× | forza 0,81 → 0,65, 121,8 → 113,9 km/h | 0,80 → 0,80, 121,6 → 121,5 | 0,84 → 0,84, 124,2 → 124,0 |
| 26 dritti a 1,5× (finestra del colpo tipico 24) | 0,81 → 0,64, → 107,4 km/h | 0,80 → 0,64, → 108,5 | 0,84 → 0,64, → 108,5 |
| dieci dritti a 0,7× | 0,32 → 0,40, 84,4 → 88,3 km/h | 0,31 → 0,32 | 0,27 → 0,28, 78,0 → 78,7 |
| anticipo +0,6 finestre ×10 | −2,25 → −0,57 (ritmo) | uguale | uguale |

Il mancino fa le stesse sequenze allo specchio: −x uguale al destro a meno di 0,2 m (tremolio del telefono simulato).

## 2. La distribuzione vera: prima, primo giro, dopo (destro; mancino specchio esatto)

| Persona vera, 400 colpi | prima (`8a996e3`) | primo giro (`ab9dd89`) | dopo (ramo) |
|---|---|---|---|
| x p10 / p50 / p90 (p90−p10) m | −3,07 / 0,32 / 3,01 (6,08) | −3,04 / 0,34 / 3,13 (6,17) | **−3,24 / 0,39 / 3,58 (6,82)** |
| palle a meno di 1 m / oltre 2,5 m dal centro | 28 % / 31 % | 28 % / 30 % | 26 % / **37 %** |
| profondità p10 / p50 / p90 (p90−p10) m | 7,86 / 9,28 / 10,58 (2,72) | identica | **7,42 / 9,20 / 10,77 (3,35)** |
| profondità sotto 8 m / oltre 10,5 m | 13 % / 11 % | 12 % / 12 % | 20 % / 14 % |
| km/h p10 / p50 / p90 (p90−p10) | 82,8 / 95,3 / 116,2 (33,4) | 79,3 / 93,4 / 119,2 (39,9) | **75,7 / 92,9 / 119,8 (44,1)** |
| altezza sul nastro p10 / p50 / p90 m | 1,28 / 1,62 / 1,80 | 1,26 / 1,65 / 1,97 | 1,26 / 1,66 / 2,05 |
| forza dell'esito p10 / p50 / p90 | 0,29 / 0,53 / 0,79 | uguale | 0,23 / 0,53 / 0,85 |
| tipi di colpo | top spin 310, piatto 89, tagliato 1 | uguali | **uguali** |
| falliti o in rete | 0 | 0 | 0 |
| senza ritmo: x · km/h (p90−p10) | 6,51 · 33,8 | 6,30 · 39,1 | 7,05 · 44,3 |
| chi anticipa sempre: x (p90−p10) | 5,34 | 5,20 | 6,21 |
| chi è preciso: x · profondità · km/h (p90−p10) | 3,90 · 1,55 · 21,5 | 3,85 · 1,56 · 25,9 | 4,52 · 1,90 · 30,2 |

**Seme della calibrazione sbagliato** (24 partite; centro della mira: errore medio con il segno / medio assoluto /
massimo alla fine del blocco; x p50 dei colpi del blocco; con il seme giusto x p50 −0,10 e 0,09):

| Seme | prima | primo giro | dopo |
|---|---|---|---|
| −15°, colpi 11–20 | −5,8 / 5,8 / 11,7°, x 0,85 | −8,6 / 9,1 / 15,9°, x 1,28 | −2,3 / 6,0 / 15,9°, x 1,16 |
| −15°, colpi 21–40 | −3,9 / 4,1 / 8,4°, x 0,61 | −7,4 / 8,0 / 13,3°, x 1,00 | **−1,2** / 4,5 / 13,3°, x **0,24** |
| +15°, colpi 21–40 | 3,2 / 3,6 / 9,6°, x −0,56 | 5,6 / 7,8 / 14,8°, x −0,88 | **1,4** / 4,6 / 14,2°, x **−0,29** |
| giusto, colpi 21–40 | 0,1 / 1,4 / 4,4°, x 0,09 | 0,0 / 1,4 / 8,9°, x 0,09 | 0,0 / 2,1 / 8,9°, x 0,01 |

Il primo giro aveva peggiorato il recupero di un seme sbagliato di 15° (verifica a 20° ma pull solo oltre 25° e drift 0,01);
ora la tendenza da una parte sparisce in una ventina di colpi (errore con il segno −1,2/+1,4°, x p50 0,24/−0,29 m). Il medio
assoluto resta 4,5° perché in qualche partita la mediana dei primi 6 colpi resta sotto 6° o il dritto e il rovescio vanno in
versi opposti (allora non si sposta, §3.4).

## 3. Correzioni, ognuna con il motivo e la misura nel commento della costante

### 3.1 Primo giro (`5bda836`), invariate nel secondo salvo l'isteresi

| Costante | prima | dopo | misura (banco del telefono) |
|---|---|---|---|
| `AIM.verifyDev` | 35° | 20° | un seme sbagliato di 21–33° (104712) si corregge sui primi 4 colpi |
| `AIM.biasDev` / `commonDev` | 12° / 8° | 25° | dieci dritti a +20°: x 2,83 → 1,31 m **→ 2,83 → 2,54** |
| `AIM.biasPull` / `commonPull`, `drift` | 0,3, 0,03 | 0,2, 0,01 | idem |
| `TYPICAL.keep` | 9 | 24 | dieci dritti a 1,5×: forza 0,81 → 0,65 **→ 0,80 → 0,80** |
| tetto del volo base (`game_engine.js`) | 1,2 | 1,5 | con le due righe sotto: km/h della persona vera p90−p10 33,4 → 39,9 |
| `OUTCOME.topClearSoft`, `clearCurve`, `topSpinPower` | — | 2,5 m, 1,5, 8 | il colpo forte passa più basso e carico, il morbido galleggia (§5: vale anche per piatto, tagliato, palla corta) |
| `OUTCOME.smashSpeed` | 46 | 48 m/s | la schiacciata resta ≥ 1,4 volte il piatto pieno |

### 3.2 Secondo giro

| Costante (file) | prima | dopo | perché | misura |
|---|---|---|---|---|
| `AIM.biasLow` / `commonLow` (`natpf_gestures.js`) | 10° (primo giro) | **20°**, poi `biasSlow`/`commonSlow` **0,05** fino a `biasEnd`/`commonEnd` 10° | regressione del primo giro: dopo il pull il centro andava fino a 10° di 0,2 a colpo e la mira piena tenuta finiva al centro; mira tenuta e riferimento girato di 25–35° non si distinguono, solo la durata | +30° ×14: 0,63 m (base 1,20) **→ 1,72** con faceSpan 20, **2,50** con 14; +20° ×10 invariato; riferimento girato di 35–40°: scarto 8–10° dopo 20 colpi, 2–3° dopo 30 (primo giro 3° e 1°). Il solo `biasLow` 20 proposto dalla verifica lasciava un riferimento girato a 20° (mira 0,7) e faceva fallire `natpf-aim` «deriva lunga» |
| `INTENT.faceSpan` (`natpf_stroke_intent.js`) | 20 (mira piena a 23°) | **14** (mira piena a 17°; 10° valgono 0,5) | il piatto è il controllo che si sceglie; con ±12° di variazione vera la mira restava stretta | x della persona vera p90−p10 6,17 → 6,82 m, oltre 2,5 m 30 → 37 %; piatto girato di 15° 1,9–2,3 → 2,7–3,3 m dal colpo dritto (destro e mancino). Provati 18 (6,37), 16 (6,56), 12 (7,23, ma 10° già 2,8 m: troppo nervoso) |
| `INTENT.relGain` (nuovo, `strokePower`) | 0,6 (era `0,6·picco/tipico`) | **0,9** per l'esito; `classGain` 0,6 per il tipo e il super | la forza relativa al proprio colpo tipico cambiava poco con il gesto | forza p10/p90 0,29/0,79 → 0,23/0,85; km/h p90−p10 39,3 → 44,1 (base 33,4); profondità 2,90 → 3,35 m; colpo tipico fermo a 0,5. Provato 1: 1,4× e 1,6× alla stessa velocità (123,4/123,2 km/h, in cima la velocità la decide l'altezza sul nastro) |
| `typePower` / `superStrength` (`strokeIntent`, `natpf_stroke_outcome.js`, `natpf_power_hud.js`) | una sola forza | il tipo di colpo, il colpo super e la barra della potenza leggono la forza con la pendenza di prima | con la pendenza nuova anche lì il 2 % dei colpi della persona vera passava da top spin a piatto, i tagliati morbidi diventavano palle corte (4 prove di `natpf-racchetta` rosse) e il super era possibile da 1,4× invece di 1,5× (forza ≥ 0,86: 4 → 11 %) | tipi di colpo identici (310/89/1), super alla stessa soglia; webcam e CPU invariate (senza `typePower` vale `power`) |
| `AIM.recheck` 6, `recheckFrom` 6°, `recheckFull` 12° (nuovi) | — | seconda verifica del seme: dopo i primi 6 colpi veri di ogni verso ogni centro va verso la loro mediana (niente sotto 6°, tutta da 12°), una volta sola, non se dritto e rovescio sono andati oltre 6° in versi opposti | un seme sbagliato di 10–20° (sotto `verifyDev`) restava per decine di colpi | tabella del §2. Provati: 4 colpi da 5° a 10° (più rapido, ma con il seme giusto errore medio 3,3° e fino a 18°); due giri di verifica (errore medio al 40° 3,5°/3,1°, ma i dritti e rovesci alternati a +30° del colpo 13–14 finivano al centro) |

Il ritmo (`RHYTHM`), le soglie del tipo di colpo (`flatPower`, `dropPower`, `lobSoft`), la profondità (`depth`,
`depthCurve`) e la soglia minima del gesto non sono cambiati: la profondità è più varia per la forza (p90−p10 2,72 → 3,35 m)
senza toccare `depth.TOPSPIN/FLAT`.

## 4. Prove

Test nuovi in `natpf-tennis/test/natpf-colpi-b15.test.mjs` (13 in tutto: 6 del primo giro, di cui uno riscritto, e 7
nuovi), ognuno fallisce con i valori di prima:

- mira piena tenuta, +30° ×14, destro e mancino: x finale ≥ 1,5 m (base 1,20, primo giro 0,63);
- recupero di un riferimento girato di 35–40° in 30 colpi (riscritta: era 32–34° in 20 colpi, valida solo con il pull
  rapido fino a 10° che toglieva la mira tenuta);
- piatto girato di 15° ≥ 2,4 m dal colpo dritto, dritto e rovescio, destro e mancino (con `faceSpan` 20: 1,96);
- persona vera: x p90−p10 ≥ 6,6 m e ≥ 34 % oltre 2,5 m (con 20: 6,17 e 30 %); mancino specchio esatto;
- forza: persona vera km/h p90−p10 ≥ 42 e profondità ≥ 3,2 m, colpo tipico a 0,5 (con `relGain` 0,6: 39,3);
- tipo di colpo e super con la pendenza di prima (`typePower`), barra della potenza coerente con il super;
- seme sbagliato di ±15°: errore del centro ≤ 2,5° (con il segno) e ≤ 5,5° (medio assoluto) dal 21° al 40° colpo, e con
  il seme giusto ≤ 2,6° medio e ≤ 11° massimo (fallisce senza seconda verifica, e con la verifica a 4 colpi);
- seconda verifica: i primi colpi dalla stessa parte spostano i centri, la mira in versi opposti resta.

Test cambiati per un comportamento voluto: `natpf-sessione-23-10` «mira dal piatto» (la curva fissata ora va da 3° a 17°).

## 5. Equilibrio, rischi dichiarati, cosa resta

- `rally-balance` (600 punti per profilo, punti vinti prima → dopo): Casual medio 93,2 → 94,2 %, amatore 84,2 → 87,0,
  tennista 98,7 → 99,3, umano 89,5 → 88,3, preciso 100 → 100; Pro medio 65,3 → 65,8, amatore 60,2 → 63,2, tennista 96,8 →
  96,2, umano 76,7 → 74,0. I profili di questo banco danno l'intenzione direttamente (forza assoluta, mira): le costanti del
  secondo giro (`faceSpan`, `relGain`, seme, isteresi) non li toccano; le differenze vengono dal motore del primo giro.
- `audit:legend` (300 punti, 8 semi), identico al primo giro: **pro contro medio 84,1 % dei game** (criterio 70–85 %; alla
  base 85,3 %, KO). **Rischio Leggenda**: due criteri già KO alla base peggiorano con il motore del primo giro (CPU Leggenda
  contro «tennista» 74,5 → 67,3 % dei game, criterio ≥ 85 %; contro «preciso» 37,4 → 25,9 %, criterio ≥ 60 %): i colpi
  forti dei profili forti passano più bassi e la Leggenda li prende meno. Non corretto (decisione dell'utente da chiedere:
  Leggenda più dura o colpi forti meno tesi).
- **Webcam** (`eventIntent` → `strokeOutcome`): le costanti del secondo giro non la toccano; il motore del primo giro sì,
  solo nella velocità: colpo webcam a forza 0,2 / 0,6 / 1 → 79,0 / 98,5 / 121,8 km/h prima, 74,4 / 99,4 / 127,4 dopo, x e
  profondità identiche. La prova nel browser della webcam per due (verifica indipendente) dava 13/15 alla base e al primo
  giro, con lo stesso punto 5 già rosso alla base.
- **`clearCurve` su tutti i colpi tranne il pallonetto**: piatto, tagliato e palla corta morbidi passano fino a 4 cm più
  bassi sul nastro (palla corta a forza 0,5: 1,41 → 1,37 m; tagliato a 0,35: 1,45 → 1,42); nessun colpo fallito nella
  persona vera, `natpf-gesti-speciali` 9/9 nel browser.
- **Colpo super**: con `superStrength` la soglia è quella di prima; la barra della potenza mostra la stessa forza
  (pendenza di prima), anche se l'esito risponde di più al gesto.
- **Seme**: una mira dalla stessa parte con dritto e rovescio fin dai primi 6 colpi per verso dopo la calibrazione si
  toglie (per il centro è uguale a un seme sbagliato); dopo non succede più (una sola verifica).
- **Mira più nervosa**: con la mira piena a 17° qualche grado di piatto sbagliato sposta di più (5° ≈ 1 m).
- **Cosa resta**: la velocità in cima non cresce oltre ~124 km/h (piatto, altezza minima sul nastro e volo minimo 0,58 s);
  il ritmo ricentra chi anticipa sempre (decisione del 28/10); la distribuzione «vera» è quella stimata dalle diagnostiche,
  non registrata colpo per colpo; il rumore del piatto dei telefoni veri non è misurato.
- Mancini: banco allo specchio verde (persona vera esatta, telefono simulato a meno del tremolio); le asimmetrie del
  percorso del mancino (calibrazione, racchetta animata, webcam per due) sono del ramo `b15-mancini`, non di questo.

## 6. Verifiche (secondo giro, ramo a `58fb8e0` più questo documento)

- `cd natpf-tennis && npm test`: **907/907** (900 del primo giro + 7 nuovi in `natpf-colpi-b15`).
- `node --test tools/test/*.test.mjs`: **195/195**.
- Browser (Chromium, porte 3620–3623, nessun server lasciato acceso): `tools/e2e/natpf-rally.mjs` **7/7** (campo aperto:
  cadute da −3,99 a +2,98 m), `tools/e2e/natpf-gesti-speciali.mjs` **9/9**.
- Banchi: `colpi.mjs --hand=both` prima/primo giro/dopo (tabelle sopra), `audit:rally` e `audit:legend` prima/dopo.
- Non verificato: telefoni veri, persone vere, Windows, pacchetti (il ramo va integrato prima).
