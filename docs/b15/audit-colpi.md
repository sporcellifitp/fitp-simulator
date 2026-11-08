# B15 · Audit della sensibilità e della precisione dei colpi (08/11/2026)

Richiesta dell'utente (08/11): «Fai un nuovo audit per migliorare la sensibilità del dispositivo e la precisione dei colpi
rispetto ai gesti eseguiti. I colpi non sono ancora da campo aperto, anzi, tutti gli scambi vanno quasi sempre nella stessa
direzione con stessa velocità e angolazione.»

Banco nuovo: `natpf-tennis/scripts/audit/colpi.mjs` (`node --import ./test/register.mjs scripts/audit/colpi.mjs [--json=file]`).
Catena **vera**: telefono simulato mosso dal braccio (`test/phone-sim.mjs` + `test/arm-sim.mjs`, presa insegnata del 04/11,
calibrazione rapida con dritto e rovescio del braccio) → `swingMessage` → `parseSwingMessage` → `natpfSwingToEngine`
(colpo tipico, centro della mira, salita abituale che imparano come in partita) → `strokeIntent` → motore headless
`_attemptPlayerRallyStrike` → `_natpfRacketShot` → `strokeOutcome` → lancio e fisica fino al rimbalzo. Dopo dodici colpi
normali di riscaldamento (i primi punti di una partita), ogni variante è letta senza insegnare niente (`game(d, { learn:
false })`): velocità del gesto 0,4…1,6× del colpo del braccio (dritto 650 °/s, rovescio 600), piatto girato −30…+30°,
tempo d'impatto −1…+1 finestre della direzione, dritto e rovescio, palla a 0,7/1/1,4/1,8 m, livelli casual/1v1/pro; 240
colpi di una «persona normale» (velocità ±20 %, piatto ±10°, tempo ±0,4 finestre, palla ±0,25 m); sequenze di dieci colpi
uguali con i riferimenti che imparano. È un banco deterministico sulle regole vere: non misura persone né telefoni veri.

Base: `8a996e3`. Registri: `colpi-prima.log`/`colpi-dopo.log` nello scratchpad dell'agente (i numeri sono riportati qui).

## 1. Tabella ingresso → uscita, prima delle correzioni (dritto; il rovescio è speculare a meno di 0,1–0,2 m)

Palla a (0,6 m a destra, 1 m, 10,9 m dalla rete), vz 18 m/s, giocatore a 11,4 m, Casual, tempo 0, piatto dritto salvo dove
indicato. x = caduta laterale (+ destra), prof. = profondità dalla rete, km/h = velocità della palla dopo il lancio, rete =
altezza al passaggio sulla rete.

| Ingresso | x m | prof. m | km/h | rete m | colpo | forza letta |
|---|---|---|---|---|---|---|
| gesto 0,4× | gesto non mandato dal telefono (sotto la soglia: 40 % del colpo tipico con il verso atteso) | | | | | |
| gesto 0,5× (354 °/s) | 0,04 | 7,63 | 78,9 | 1,84 | top spin | 0,19 |
| gesto 0,6× (433) | −0,01 | 7,97 | 81,7 | 1,80 | top spin | 0,25 |
| gesto 0,8× (571) | −0,15 | 8,59 | 87,2 | 1,73 | top spin | 0,37 |
| gesto 1× (716) | −0,15 | 9,24 | 94,2 | 1,62 | top spin | 0,50 |
| gesto 1,2× (854) | −0,15 | 9,85 | 101,9 | 1,54 | top spin | 0,62 |
| gesto 1,4× (998) | −0,15 | 10,67 | 118,7 | 1,29 | piatto | 0,74 |
| gesto 1,6× (1143) | −0,28 | 11,14 | 123,0 | 1,27 | piatto | 0,86 |
| piatto −30° | −3,80 | 7,52 | 82 | 1,76 | top spin | mira −1 |
| piatto −15° | −2,48 | 9,02 | 93,2 | 1,65 | top spin | −0,60 |
| piatto −5° | −0,77 | 9,21 | 94,2 | 1,62 | top spin | −0,16 |
| piatto +5° | 0,08 | 9,25 | 94,2 | 1,61 | top spin | +0,06 |
| piatto +15° | 1,74 | 9,23 | 93,4 | 1,64 | top spin | +0,54 |
| piatto +30° | 3,31 | 9,07 | 93,2 | 1,63 | top spin | +1 |
| tempo −1 (ritardo pieno) | 3,59 | 9,03 | 93,2 | 1,64 | top spin | |
| tempo −0,5 | 1,77 | 9,22 | 94,2 | 1,62 | | |
| tempo +0,5 | −1,90 | 9,10 | 93,2 | 1,64 | | |
| tempo +1 (anticipo pieno) | −3,59 | 7,99 | 88,1 | 1,62 | | |
| palla 0,7 m | −0,15 | 9,24 | 91,2 | 1,60 | | |
| palla 1,8 m | −0,15 | 9,13 | 112,8 | 1,62 | | |
| livelli casual / 1v1 / pro | identici (il livello cambia la precisione chiesta, non la mappa) | | | | | |

Persona «normale», 239 colpi: x p10/p50/p90 −2,54/−0,25/+2,24 m (sd 1,87); profondità 8,22/9,13/10,11 (sd 0,73); km/h
84,5/93,4/110,1 (sd 10,0); rete 1,32/1,63/1,75. Quanto ogni ingresso spiega ogni uscita (R²): x ← tempo 0,50, piatto 0,43;
profondità ← velocità del gesto 0,75; km/h ← velocità 0,74; nessuna uscita dipende dal lato o dal livello.

**Sequenze (stesso gesto ripetuto, riferimenti che imparano), prima:**

| Sequenza | colpo 1 | colpo 10 |
|---|---|---|
| dieci dritti con il piatto girato +20° | x 2,88 m (mira 0,88, centro −6°) | x **1,06 m** (mira 0,34, centro +3,4°) |
| dritti e rovesci alternati, piatto +20° | D 2,88 / R 3,47 m | D **1,42** / R **1,55** m |
| dieci dritti a 1,5× del proprio colpo | forza 0,80, 120 km/h, 10,9 m | forza **0,65**, 114 km/h, 10,3 m (dal 6° colpo) |
| dieci dritti a 0,7× | forza 0,31, 84 km/h | forza **0,40**, 88 km/h (dal 6°) |
| dieci dritti in anticipo di 0,6 finestre | x −2,25 m | x **−0,57** m (dal 4°: ritmo 0,48) |

## 2. Cause, in ordine d'impatto (file:riga alla base `8a996e3`)

1. **Il centro della mira inseguiva la mira tenuta** (`src/natpf/natpf_gestures.js:310-311` `AIM`, `:349-361` in
   `createAimModel.add`): con dieci colpi recenti a più di `biasDev` 12° dal centro, il centro andava verso di loro di
   `biasPull` 0,3 a colpo; con dritti e rovesci dalla stessa parte oltre `commonDev` 8°, tutti e due i centri si
   spostavano di `commonPull` 0,3; in più `drift` 0,03 a colpo anche sui colpi mirati. Una mira voluta di 20° (mira 0,88)
   durava sei colpi, poi spariva: −63 % in dieci colpi; alternando dritto e rovescio −51/−55 %. È la causa principale di
   «tutti gli scambi nella stessa direzione»: chi mira con decisione, dopo qualche colpo, mira al centro.
2. **La forza relativa al colpo tipico degli ultimi 9 colpi** (`src/natpf/natpf_phone_racket.js:109` `TYPICAL.keep` 9,
   `src/natpf/natpf_stroke_intent.js:60-65` `strokePower`: metà assoluta, metà relativa a `ref`): cinque colpi forti
   di fila diventavano «il colpo tipico» e la forza tornava a metà (0,80 → 0,65), con la palla più lenta e più corta.
   Lo stesso al contrario per i colpi morbidi (0,31 → 0,40).
3. **Velocità della palla poco legata alla forza** (`src/game_engine.js:2228` tetto `Math.min(1.2, …)` sul volo base:
   da forza 0,56 in su il volo base era sempre 0,70 s; `src/natpf/natpf_stroke_outcome.js:204-207`: altezza sulla rete
   lineare nella forza, TOPSPIN 1,3…2,05 m, e top spin 15 + 8·salita + 6·morbidezza, cioè **meno** spin per il colpo
   più forte). Nel motore la velocità la decide l'altezza a cui la palla deve passare sopra il nastro (non il volo base,
   che vincola solo i colpi morbidi): così 0,6× → 1,6× valeva ×1,50 (82 → 123 km/h), e il top spin a 1,2× (102 km/h)
   restava molto sotto il piatto a 1,4× (119): un gradino al cambio di tipo, non una scala.
4. **Ritmo** (`src/natpf/natpf_stroke_outcome.js:123` `RHYTHM`, `:182` `aimT = t − rhythm`): chi colpisce sempre in
   anticipo viene ricentrato dal 4° colpo (gain 0,8, max 0,6). È una decisione del 28/10 (la direzione si misura attorno
   al proprio tempo abituale, così il lungolinea è possibile anche a chi anticipa sempre) e **non è stata cambiata**: la
   varietà del tempo attorno al proprio ritmo resta tutta (±1 finestra = da una riga all'altra). Vedi §5.
5. Cose che **non** perdono varietà (verificate): zona morta del piatto 3° e mira piena a 23° (`INTENT.faceDead/faceSpan`:
   15° → 1,7 m, 30° → 3,3 m); mappa tempo → direzione lineare ±3,6 m; `softEdge` (3,1 → 4 m) solo oltre 3,1 m;
   assistenza piena dentro la finestra; `follow` 0,4 del punto neutro (sposta il centro con la palla, non comprime);
   `depthCurve` 0,7 (profondità 8,0 → 11,1 m da 0,6× a 1,6×); dritto e rovescio equivalenti (a parità di angolo, stesso
   spostamento a meno di 0,2 m; il neutro differisce di 0,7 m per la spinta naturale `natural` 0,1 e il punto neutro).
6. **Sensibilità del dispositivo**: con il verso atteso dal gioco un gesto parte dal 40 % del proprio colpo tipico
   (`gestureFloor` toward, `swing-detect.js`); 0,5× (354 °/s) passa, 0,4× no. Non cambiato: sotto ci sono le preparazioni
   e i rientri della mano (28/10). I gesti 0,5×…1,6× danno letture di forza 0,19…0,86, continue.

Confronto con le diagnostiche vere archiviate (`docs/NATPF_DIAGNOSI_2026-10-23.md` T6/C3: 26 mire su 67 sature, dritti da
−3,3 a +1,7 m; `docs/archivio/WORK_PROGRESS…` 29/10: «la palla finisce quasi sempre al centro», tempo mediano 0,2 unità;
104712: 33 colpi su 36 a destra per un centro seminato male): le cause 1 e 2 sono coerenti con quelle segnalazioni (centro
che segue o che non segue abbastanza); le diagnostiche archiviate non contengono registri colpo per colpo con mira, tempo
e caduta insieme, quindi i numeri sopra vengono solo dal banco.

## 3. Correzioni (commit `5bda836`), ognuna con misura prima/dopo

| Costante | prima | dopo | perché | misura |
|---|---|---|---|---|
| `AIM.verifyDev` | 35° | 20° | un seme della calibrazione sbagliato di 21–33° (104712) prima restava e lo correggevano i «pull»; ora lo correggono i primi 4 colpi veri | test `natpf-calibration-aim` invariati |
| `AIM.biasDev` / `commonDev` | 12° / 8° | 25° / 25° | oltre lo scarto della mira piena (23°) la mira è satura e non controlla niente: lì è il riferimento; sotto è una scelta | dieci dritti a +20°: x 2,88 → 1,06 m **→ 2,83 → 2,54**; alternati: 2,9/3,5 → 1,4/1,6 **→ 2,8/3,6 → 2,7/3,6** |
| `AIM.biasLow` / `commonLow` (nuovi) | — | 10° | isteresi: partito il «pull», continua fino a 10° (un riferimento girato si recupera del tutto, non fino a 25°) | 20 colpi a +32° da un centro a 0: mira residua 0,01 (test nuovo) |
| `AIM.biasPull` / `commonPull` | 0,3 | 0,2 | recupero in ~6 colpi invece di 3, meno brusco | idem |
| `AIM.drift` | 0,03 | 0,01 | 0,6° a colpo sui colpi mirati toglieva il 30 % in dieci colpi | sopra |
| `TYPICAL.keep` | 9 | 24 | il riferimento della forza è la propria scala di gioco, non gli ultimi colpi: serve più di metà finestra al nuovo livello | dieci dritti a 1,5×: forza 0,80 → 0,65 **→ 0,80 → 0,80**; a 0,7×: 0,31 → 0,40 **→ 0,31 → 0,32** |
| `game_engine.js` tetto del volo base | 1,2 | 1,5 | a forza piena 0,58 s (il minimo di sempre), a 0,74 0,63 s (era 0,70) | con le due righe sotto: 0,6× → 1,6× 82 → 123 km/h (×1,50) **→ 77 → 124 (×1,62)** |
| `OUTCOME.topClearSoft` + `clearCurve` (nuovi) | lineare 1,3…2,05 m | morbidezza^1,5, fino a 2,5 m (solo TOPSPIN) | il colpo tipico (forza 0,5) passa come prima (1,67 m), il morbido galleggia di più, il forte passa basso prima | 0,6×: 1,80 → 2,00 m sulla rete, 82 → 77 km/h; 1,2×: 1,54 → 1,55 m, 102 → 102 km/h; 1×: 94 → 93 |
| `OUTCOME.topSpinPower` (nuovo) | spin 15 + 8·salita + 6·morbidezza | + 8·(forza − 0,5)/0,5 | il top spin forte è carico (26 a forza 0,86, come il colpo super) e può passare basso e cadere dentro | sopra |
| `OUTCOME.smashSpeed` | 46 | 48 m/s | il piatto pieno è più teso (31 m/s nel test, era 30) e la schiacciata deve restare ≥ 1,4 volte (29/10) | test `natpf-racchetta-motore` «schiacciata molto più forte» verde |

## 4. Tabella ingresso → uscita, dopo (dritto)

| Ingresso | x m | prof. m | km/h | rete m | colpo | forza |
|---|---|---|---|---|---|---|
| gesto 0,5× | −0,03 | 7,63 | 73,6 | 2,08 | top spin | 0,19 |
| gesto 0,6× | −0,15 | 7,97 | 77,0 | 2,00 | top spin | 0,25 |
| gesto 0,8× | −0,15 | 8,59 | 84,4 | 1,82 | top spin | 0,37 |
| gesto 1× | −0,15 | 9,24 | 92,6 | 1,67 | top spin | 0,50 |
| gesto 1,2× | −0,15 | 9,85 | 101,9 | 1,55 | top spin | 0,62 |
| gesto 1,4× | −0,44 | 10,65 | 120,0 | 1,26 | piatto | 0,74 |
| gesto 1,6× | −0,52 | 11,13 | 124,4 | 1,25 | piatto | 0,86 |
| piatto −30 / −15 / +15 / +30° | −3,80 / −2,48 / 1,72 / 3,31 | | | | | (invariato) |
| tempo −1 / 0 / +1 | 3,59 / −0,15 / −3,59 | | | | | (invariato) |
| rovescio 0,6× → 1,6× | 0,50 → 0,82 | 7,91 → 11,05 | 75,7 → 122,4 (×1,62) | | | |

Persona «normale», 240 colpi: x −2,60/−0,22/+2,24 (sd 1,86, invariata: dipende da tempo e piatto, già giusti); profondità
8,22/9,14/10,13 (invariata); **km/h 80,8/91,3/110,7 (sd 12,2, era 10,0)**; rete 1,30/1,68/1,88. R²: km/h ← velocità del gesto
0,79 (era 0,74), pendenza 54,8 km/h per unità di gesto (era 44,2).

Sequenze dopo: dieci dritti a +20°: 2,83 → 2,54 m (mira 0,86 → 0,78); alternati: D 2,83 → 2,73, R 3,49 → 3,61; 1,5×: forza
0,80 → 0,80, 120 → 121 km/h; 0,7×: 0,31 → 0,32; anticipo 0,6: −2,25 → −0,57 (ritmo, non cambiato).

## 5. Cosa non è stato cambiato, e perché

- **Ritmo** (`RHYTHM`): decisione del 28/10 con una diagnostica vera (chi colpiva sempre in anticipo non faceva mai il
  lungolinea). Ricentra solo il tempo *abituale*: le variazioni attorno al proprio ritmo valgono da una riga all'altra.
  Se l'utente vuole che anche l'anticipo costante resti incrociato, si abbassa `RHYTHM.gain` (0,8) o `max` (0,6).
- **Soglie del tipo di colpo** (`INTENT.*`, `classifyStroke`): non toccate (fedeltà del tutorial). Il gradino top spin →
  piatto a 1,4× resta nel tipo, ma la velocità ora è continua (102 → 120 km/h tra 1,2× e 1,4× contro 102 → 119 prima,
  con il top spin a 1,2× più carico).
- **Zona morta e scarto della mira** (`faceDead` 3°, `faceSpan` 20°), `natural`, `follow`, `softEdge`, assistenza,
  `depthCurve`: la mappa misurata è già quella chiesta (15° → 1,7 m, 30° → 3,3 m, ±1 finestra → ±3,6 m).
- **Soglia minima del gesto** (40 % del colpo tipico con il verso atteso): sotto ci sono preparazioni e rientri.
- **Metà relativa della forza** (`strokePower`): resta, perché chi gioca con colpetti deve avere il suo colpo tipico a
  metà; cambia solo quanto in fretta il riferimento si sposta.

## 6. Verifiche

- `npm test`: **900/900** (894 + 6 nuovi in `test/natpf-colpi-b15.test.mjs`). Prova di mutazione (sorgenti alla base,
  test nuovi): falliscono 4 su 6 (forza ×1,51; colpo tipico 0,80 → 0,65; mira tenuta 2,83 → 1,31; centro a 22° assorbito);
  i 2 che passano anche prima (piatto 15°/30° e dritto-rovescio; tempo → direzione per livello, determinismo) sono guardie
  di non regressione.
- Sito `node --test tools/test/*.test.mjs`: 195/195.
- Equilibrio, `rally-balance.mjs --points=150 --profiles=medio,amatore,tennista,umano` (punti vinti, prima → dopo):
  Casual medio 93,1 → 94,9 %, amatore 85,3 → 86,4, tennista 98,7 → 98,7, umano 90,0 → 89,6; Pro medio 65,8 → 64,7, amatore
  60,7 → 61,3, tennista 96,7 → 96,4, umano 76,7 → 73,8. `audit:legend` (criterio «pro contro medio 70–85 % dei game»): vedi
  `docs/WORK_PROGRESS.md` B15 (alla base era già fuori: 85,3 %, con altri due criteri di Leggenda già KO).
- Browser (Chromium, porte 3605–3608): `tools/e2e/natpf-rally.mjs` 7/7, `natpf-gesti-speciali.mjs` 9/9.
- Non verificato: telefoni veri, persone vere, il rumore dell'orientamento sui telefoni veri (il banco ha un tremolio di
  4 °/s), Windows.
