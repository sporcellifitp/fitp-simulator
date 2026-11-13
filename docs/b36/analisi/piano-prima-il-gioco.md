# B36 · Piano tecnico «prima il gioco»: la direzione al centro, campo aperto, stile arcade

**Base letta:** `natpf-simulator` **1d0f6a5**, versione 2026-11-13.8, con B35a già unito (c22b6e8). Albero pulito: non ho toccato niente.
- **B35b in corso** (`b35-collaudo`, d2a0aad). In `game_engine.js` cambia solo il banner; poi `natpf_match_stats.js`, `natpf_trial.js` e l'HUD. Nessuno di questi file riguarda la direzione.
- **B37 in coda** (collaudo dell'utente del 13/11, ore 11:25; `docs/TRACCIA_PASSI.md:505-518`):
  - «fuori» detto solo quando la palla rimbalza davvero;
  - un segno che dica chi batte;
  - il segnale del tempo spiegato a chi gioca.

**Segni usati**
- [V] verificato da me a 1d0f6a5 (file:riga) o eseguendo le regole vere.
- [L] preso dalle letture parallele, con i loro riferimenti.
- [P] calcolato con il mio prototipo: regole vere per «oggi», bozza B36 scritta solo nello script.
- [D] deduzione o proposta.

**Prototipo** (legge soltanto i moduli del gioco)
- Script: `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b36/agenti/gioco/b36-gioco.mjs`.
  - Opzioni: `--zone --angoli --riga --scogliera --curva --tempo --disp --copertura`.
  - Varianti: `WT=` (peso del tempo) ed `EXF=` (sfumatura oltre la finestra).
- File di prova: `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b36/agenti/gioco/dbg.mjs`.
- **Limiti del prototipo:**
  - niente telefono simulato e niente centro della mira che impara;
  - una sola palla: 18 m/s, contatto a 11,4 m dalla rete e a 1 m d'altezza;
  - il rimbalzo vero di oggi è stimato come hitX + 0,87·(x − hitX), perché `fixAir` corregge solo z (`natpf_skill.js:866,883`) [V]; il fattore 0,85–0,89 viene da [L] vincoli-aria;
  - tutti i numeri [P] vanno rifatti con il banco B35a.

**In breve**
- Una regola sola: «la palla va dove punta la cima del telefono all'impatto».
  - È monotona (più giri, più angolo), senza tetto a 17° e senza crollo a 45–60°.
  - È ferma per tutta la partita.
- Il tempo resta, ma come ritocco: peso 0,3 invece di 1. Dà varietà: palla presa davanti più incrociata e più veloce, palla presa di fianco più lungolinea e più lenta.
- Vicino alle righe:
  - il campo è esatto fino a un margine che dipende dal livello;
  - oltre il margine, una «tenuta» per livello: a Bambini, Facile ed Evento girare tanto dà la riga, mai il fuori; a Leggenda esagerare manda fuori;
  - niente più «scogliere» (salti improvvisi del punto d'arrivo).
- Il rimbalzo vero cade dove si mira: correzione laterale dell'aria.
- Il riscontro si dà al rimbalzo: nome della zona, oppure il perché del fuori.

---

## 0. Premessa: lo stand e il video 1

**Chi gioca allo stand [V]**
- Sceglie «Chi gioca»: Adulto = Evento (valore di base), Bambino = Bambini, Ragazzo = Facile (`natpf_who.js:13-16`).
- Calibra «Giocando», cioè con gli scambi di prova da 4–6 palle (`natpf_trial_learn.js:41-42,78`).
- Il tutorial corto ha 5 schede senza la direzione: presa, posizione, dritto, rovescio, servizio (`natpf_tutorial.js:41`). Incrociato e lungolinea compaiono solo nel tutorial completo e nell'allenamento (`natpf_gesture_motion.js:111-114`; `natpf_training.js:30-31`).
- In due minuti fa qualche decina di colpi [D].

Quindi la direzione si deve scoprire giocando, dal riscontro, con una sola regola fisica [D]. Le quattro sensazioni da ottenere:
1. «Va dove punto la cima»: sempre, e sempre allo stesso modo.
2. «Posso andare dappertutto»: profondo e largo è l'esito normale di un colpo pulito; l'angolo corto lo sceglie chi gioca.
3. «Se esce so perché»: il verdetto arriva al rimbalzo vero, con la causa.
4. «Il livello cambia quanto devo essere preciso, non dove posso tirare»: è la decisione dell'utente del 23/10 (`natpf_stroke_outcome.js:186-188`) [V].

**Video 1** (gioco di tennis commerciale; file `scratchpad/b36/video1/video1.mp4`, 36,7 s). Ho guardato io i fogli a 2 fotogrammi al secondo e l'ingrandimento `zoom/quattro.jpg`.
- **Inquadratura:** camera fissa, alta, dietro al giocatore vicino; tutto il campo lontano si vede.
- **Lo scambio:** circa 20 colpi da fondo, palle profonde e larghe. Tutti e due i giocatori vengono spostati da una riga laterale all'altra. Il punto finisce perché uno arriva in allungo su una palla larga (un pallino rosso accanto a lui) e non la rimanda.
- **Segni a terra:**
  - una X gialla dove rimbalzerà la palla in arrivo, a destra, al centro o a sinistra, a profondità diverse;
  - un'ellisse bianca sul bersaglio del servizio;
  - un piccolo mirino del tempo accanto a chi colpisce.
- **Cosa non c'è:** nessun mirino di mira durante lo scambio (la direzione si legge dall'esito) e nessun punto annunciato prima della fine dell'azione.
- **Cosa ne prende B36:**
  - profondo e largo come esito di un colpo pulito;
  - la direzione vince il punto perché sposta l'avversario;
  - segni sobri e verdetto alla fine.

**Video 2:** non è arrivato; ci sono solo le miniature [L]. Non l'ho usato.

---

## 1. Obiettivi misurabili

### 1.1 Allo stand (registro, partite vere, almeno 200 colpi per livello)
Si misura prima con le regole di oggi (B36.0) e poi con B36. I campi nuovi sono descritti nel §6.3.

| Obiettivo | Misura | Soglia |
|---|---|---|
| E1 la cima conta | correlazione di rango tra `fa` (mira della cima) e lo scarto del rimbalzo dal punto neutro | ≥ 0,8 |
| E2 campo aperto | rimbalzi oltre 2,5 m dal centro, livello Evento | ≥ 35 % (il B15 dava il 37 % al banco: [L] `natpf_stroke_intent.js:57-61`) |
| E3 niente fuori a caso | fuori con il tempo dentro la finestra e la qualità sopra la soglia, a Bambini ed Evento | ≤ 3 % |
| E4 la direzione si scopre | nei primi 10 colpi, colpi con \|fa\| ≥ 0,5 | ≥ 30 % |
| E5 partite non sbilanciate | partite «sbilanciate» (almeno il 70 % dei colpi in una metà: `diag_metrics.js:198` [V]) | ≤ 10 % |

### 1.2 Banco
Banco B35a esteso: telefono simulato e motore headless, destri e mancini, dritto e rovescio, 2 serie di semi. Livello Pro, salvo dove scritto.

**Zone**, nel riferimento di chi colpisce. Per il dritto del destro l'incrociato è a sinistra.

| Sigla | Zona | Lato | Profondità dalla rete |
|---|---|---|---|
| PI | profondo incrociato | ≥ 1,5 m dal centro, lato incrociato | ≥ 8,5 m |
| AC | angolo corto | ≥ 2,6 m, lato incrociato | 4,5–7 m |
| CP | centro profondo | \|x\| ≤ 1,2 m | ≥ 9 m |
| LP | lungolinea profondo | ≥ 1,5 m, lato del colpo | ≥ 8,5 m |
| IO / II | dal proprio angolo del rovescio, colpendo di dritto | a uscire (diagonale) / a rientrare (lungo la riga) | profondo |

**Gesti**, cioè dispersione attorno al gesto voluto:

| Gesto | Cima | Tempo |
|---|---|---|
| «pulito» | ±4° | ±0,2 finestre |
| «persona vera» (banco B35a) | ±12° | +0,35 ±0,45 |
| «stand» [D] | ±10° | +0,3 ±0,5 |

| Criterio | Oggi | Bozza B36 [P] | Obiettivo |
|---|---|---|---|
| Zona voluta, gesto pulito, dal centro (PI · AC · CP · LP) | 55 · 27 · 72 · 92 % [P] | 92 · 80 · 88 · 94 % | ≥ 85 · 70 · 85 · 85 % a **ogni** livello |
| Angolo del dritto (PI · AC · LP) | 33 · 11 · 96 % [P] | 86 · 74 · 100 % | ≥ 80 · 65 · 85 % |
| Angolo del rovescio con il dritto (II · IO) | 74 · 84 % [P] | 97 · 88 % | ≥ 80 · 80 % |
| Persona vera (PI · AC · CP · LP) | 24 · 40 · 40 · 62 %; fuori PI 17 % [P] | 56 · 50 · 42 · 61 %; fuori 9 · 11 · 1 · 1 % | ≥ 55 · 45 · 40 · 60 %; fuori ≤ 10 % a Pro, ≤ 5 % a Bambini ed Evento |
| Matrice a 3 fasce del B35a, gesto buono | giusti 73 %, incrociato → lungolinea 0 % [L] | — | giusti ≥ 80 %; incrociato → lungolinea 0 %; lungolinea → incrociato ≤ 2 % |
| Fuori con il gesto pulito | 0 % (Leggenda in corsa 18–22 % [L]) | 0 %; Leggenda AC 5 % | 0 % a Bambini, Facile, Evento, Pro e 1v1; Leggenda da ferma ≤ 8 % |
| Chi cerca la riga (mira 0,4 m dentro), gesto «stand», da fermo: Bambini · Evento · Pro · Leggenda | 5 · 5 · 4 · 5 % [P] | 2 · 4 · 7 · 27 % | ≤ 3 · 5 · 8 %; Leggenda 20–35 % (rischio dichiarato) |
| Dispersione del rimbalzo, stesso gesto ripetuto (deviazione standard) | pulito 0,70–1,05 m; vero 1,6–1,9 m [P] | 0,72–0,83 m; 1,7–2,05 m | pulito ≤ 0,85 m; vero ≤ 1,8 m (si scende solo con il §4) |
| Coerenza: 14 colpi uguali (mira tenuta 8°, 15° o 25°; tempo tenuto ±0,5) | tempo tenuto 4–7/14, lungolinea tenuto 4–9/14 [L] | — | ≥ 13/14 nella fascia voluta; mediana degli ultimi 7 entro 0,5 m da quella dei primi 7 |
| Continuità: salto massimo del rimbalzo per 10 ms di tempo | 1,33 m (Pro, cima +20°, tra 80 e 90 ms di ritardo) [P] | 0,60 m | ≤ 0,5 m; e ≤ 0,35 m per grado di cima |
| Monotonia: tratti tra 0° e 70° in cui girare di più dà meno angolo | 2 (cala da 45°, a 60° vale 0) [P] | 0 | 0 |
| Copertura: celle di 1×1 m (profondità 3–12 m) raggiunte, 3 posizioni | 50–55 su 72 [P] | 59–62 su 72 | ≥ 58 su 72 da ogni posizione |
| Solo tempo dentro la finestra: spostamento laterale | da −3,0 a +3,2 m [P] | da −1,0 a +1,4 m | ≤ ±1,2 m attorno al punto neutro |
| Equilibrio contro la CPU | criteri del §7 | — | invariati |

---

## 2. Il modello

### 2.1 Chi governa cosa

| Grandezza del gesto | Cosa decide |
|---|---|
| **Cima** (scarto in gradi della direzione del piatto all'impatto dal proprio colpo normale, `heading.dev`) | **direzione laterale**, peso 1 |
| Tempo (unità della finestra, + = anticipo; semantica B35a: `te`, `rRest`, `lag`) | ritocco laterale (peso 0,3), velocità, altezza, un poco di profondità; oltre la finestra un errore con un verso preciso |
| Forza (picco rispetto al proprio colpo tipico) | profondità, velocità, altezza sulla rete (come oggi) |
| Salita della testa (`rise`) | effetto, altezza, top spin carico; con forza media e cima incrociata, l'**angolo corto scelto** |
| Forma (piano, salita, rotazione) | tipo di colpo: invariato (`classifyStroke`) |
| Situazione q (corsa, allungo, palla veloce, preparazione) | margine verso le righe, profondità; **non** aggiunge dispersione |
| Posizione della palla all'impatto (hitX) | punto neutro x0 = 0,4·hitX (invariato) |

### 2.2 Direzione laterale
Riferimento di chi colpisce. c = +1 per il dritto del destro e il rovescio del mancino, −1 per l'altro lato.
```
uF  = sgn(dev)·min(OVER, max(0,|dev| − DEAD)/(FULL − DEAD))     se |dev| ≤ 80°, altrimenti 0 (misura non credibile)
      DEAD 2° · FULL = aimFull dello staff (17/20/23°; base proposta 20°) · OVER 1,6
uT  = clamp(te − rRest, −1, 1)                                   B35a invariato
aim = uF − c·W_T·uT                                              W_T 0,3; spinta naturale 0
x0  = 0,4·clamp(hitX, ±3,65)
raw = x0 + aim·(aim ≥ 0 ? XF − x0 : XF + x0) − c·sgn(te)·excess·pushOut(livello)   XF 3,85 m
```

Confronto con oggi:
- `aim = −c·0,1·(1−|aimT|) − c·aimT·1 + face·1` (`natpf_stroke_outcome.js:24,27,36,355`) [V].
- La cima vale da 3° a 17° e poi resta piena fino a 45°. Oltre 45° conta sempre meno e a 60° è 0 (`natpf_stroke_intent.js:53,63,196-201`) [V].
- xMax è 3,65 m (`:44`) [V].
- **Eccezione [D]:** per gli intenti ricostruiti senza la cima misurata (webcam «movimento», tastiera senza tasti di direzione: `:506-515`) W_T resta 1. Altrimenti quei controlli perdono la direzione.

### 2.3 Righe: precisione premiata, rischio dichiarato, niente scogliere
```
fade = clamp(1 − excess/EXF)·clamp((q − assistQ)/QSPAN + 0,5)   EXF 1…2,5 unità (oggi 0,25: :59); QSPAN 0,2 (oggi 0,1: :60)
K = 4,115 − MIN(livello);  F' = F(livello)·fade;  s = min(1, (MIN/2)/F')
|x| = |raw|                         se |raw| ≤ K           ← la palla va esattamente dove si mira
    = K + (|raw| − K)·s             se |raw| − K ≤ F'      ← la richiesta oltre la riga è tenuta dentro (compressa)
    = K + F'·s + (|raw| − K − F')   altrimenti             ← fuori di quanto si è esagerato
rimbalzo vero = x  (correzione laterale dell'aria, §3)
causa del fuori: «troppo angolato» se excess = 0 e q ≥ assistQ; altrimenti tempo («in anticipo/in ritardo») o situazione («in corsa»…)
```
- È continua e monotona per ogni F' ≥ 0. Con F' = 0 diventa l'identità, quindi non c'è un gradino.
- **Oggi [V]:**
  - l'assistenza sparisce in 0,25 unità di tempo (`:338`) e la tenuta laterale con lei (`:350,357`);
  - per questo il bersaglio salta fino a 6 m;
  - mirare oltre la riga «non costa niente»: da mira 1 a mira 2 la palla si sposta di soli 0,41 m [L].

| Livello | Finestra anticipo / ritardo (invariata) | Margine esatto MIN | Tenuta oltre la riga F | pushOut, assistQ (invariati) |
|---|---|---|---|---|
| Bambini | 0,28 s / 1,4/\|vz\| + 0,06 s | 0,45 m | 3,0 m: mai fuori per la sola mira | 0,8 · 0,5 |
| Facile | 0,20 s / 1,4/\|vz\| | 0,40 m | 3,0 m | 0,8 · 0,5 |
| Evento | da 0,20 a 0,15 s (con k) | 0,40 m | 3,0 − 0,8·k m | 0,8 · 0,5 |
| Pro (Esperta), 1v1 | 0,15 s (0,17 s) | 0,30 m | 2,2 m: fuori solo con tempo o situazione sbagliati | 0,9 · 0,62 (0,6) |
| Leggenda | 0,115 s × pressione³ | 0,25 m | 0,8 m: oltre circa 24° di cima, fuori | 1,35 · 0,8 |

- Finestre: `natpf_skill.js:24,36,93,114`; `natpf_stroke_outcome.js:196-221,476` [V]. Per Evento [V] `skillLevel('evento')` dava 0,16 s al k di partenza.
- Con questi valori [P]:
  - a Pro, con il tempo giusto, la cima tenuta fino a 70° resta dentro (rimbalzo 3,96 m);
  - a Leggenda esce oltre circa 24°;
  - la scogliera scende da 1,33 a 0,60 m per 10 ms; serve tarare EXF e pushOut per arrivare a ≤ 0,5 m.
- La decisione del 23/10 resta valida: tutte le zone sono raggiungibili a tutti i livelli; cambiano solo la tenuta e la finestra.

### 2.4 Profondità, altezza, potenza, tipo; il tempo come «punto d'impatto»
**Invariato [V]:**
- profondità voluta = forza·(0,8 + 0,2·ampiezza) (`natpf_stroke_intent.js:229`);
- profondità = lerp(D[tipo], voluta^0,7) − 1,8·(1−q) − 0,8·eccesso (`natpf_stroke_outcome.js:54-55,61-62,364`);
- accorciamento in diagonale (`:367-368`) e top spin carico (`:369`);
- altezza sulla rete ed effetto (`:381-382`);
- volo (`game_engine.js:2387-2392`) [L].

**Cambia [D]:**
- **Niente accorciamento automatico dell'incrociato largo** per i colpi da fondo. Oggi vale da 3,2 m di lato (`natpf_stroke_outcome.js:67,373`) [V] e rende irraggiungibile il profondo incrociato [L]. Resta solo nella chiusura a rete.
- **Angolo corto scelto:** `pick = clamp((rise − 0,5)/0,2)·clamp((0,62 − forza)/0,15)·clamp((−c·aim − 0,75)/0,25)`, poi `d −= (d − 5,8)·0,8·pick`. Al prototipo [P] AC passa dal 27 all'80 % con il gesto pulito.
- **Tempo come punto d'impatto**, solo dentro la finestra; valori piccoli da tarare con `colpi.mjs`:
  - uT > 0 (palla presa davanti): volo × (1 − 0,05·uT), altezza sulla rete − 0,08·uT m;
  - uT < 0 (palla presa di fianco): volo × (1 + 0,08·\|uT\|), altezza + 0,12·\|uT\| m, profondità − 0,4·\|uT\| m.
- Il bordo di fondo morbido resta (`:374`), con `fade` al posto di `assist`.
- **Tipo di colpo, schiacciata, colpo super, pallonetto, palla corta, volée:** regole di oggi, fuori dalla mappa nuova. Il ramo B36 vale solo se non c'è zona di rete né volée e il tipo non è DROP, LOB o SMASH.

### 2.5 Riferimenti fermi (coerenza, punto 5 dell'utente)
- **Centro della mira** (`natpf_gestures.js:159-213`) [V]:
  - dopo il seme degli scambi di prova (`natpf_phone_racket.js:891`) e la verifica dei primi 4 colpi (`natpf_gestures.js:183-187`) diventa fisso: alpha 0, biasPull 0;
  - resta solo la pendenza comune dei due versi (`:205-212`) e «Ricalibra»;
  - con «Salta» o «Nessuna»: centro dai primi 3 colpi normali (`:182`), verifica, poi fisso.
  - Oggi un incrociato tenuto a +15° vale ancora 0,23 al 30° colpo, e +8° è assorbito in 3 colpi [L].
- **Ritmo:** per la direzione resta solo il ritardo abituale del B35a (`:244-275,327-328`) [V]. La parte «mediana × 0,8» passa a 0, oppure a un tetto di 0,3: lo decide il banco `--serie`. Oggi assorbe il tempo usato come comando: incrociato fatto con il tempo da −2,99 a −1,02 m dal 5° colpo [L].
- **Colpo tipico per la forza** (mediana degli ultimi 24: `natpf_phone_racket.js:138`) [V]: fisso dopo gli scambi di prova, oppure min 12. Così la stessa forza dà la stessa profondità per tutta la partita [D].

### 2.6 Dispersione: quanta e da cosa
- Nessun termine casuale nei colpi da fondo. Oggi è già così (`natpf_stroke_outcome.js:1-15`) [V]. Il seme della dispersione a rete (`:155-164,336`) resta solo nel colpo controllato a rete, che sta fuori da B36.
- Resta solo la variabilità misurata del gesto:
  - cima: circa 0,2 m per grado [P], quindi ±4° ≈ ±0,8 m e ±12° ≈ ±2,4 m;
  - tempo: peso 0,3, quindi ±0,45 unità ≈ ±0,5 m [P/D];
  - forza: profondità.
- La situazione q non disperde: riduce la tenuta F', la profondità e la velocità. Il messaggio per chi gioca è «in corsa vai dove miri, ma rischi di più», con la scritta «Fuori · in corsa».
- La dispersione scende solo con una misura migliore della cima (§4) o con una sensibilità più bassa (opzione dello staff).

### 2.7 Come si evita la centratura

| Fonte oggi | Misura B36 |
|---|---|
| Tempo e cima con lo stesso peso, che si annullano (`:355`) [V] | peso del tempo 0,3 |
| Cima piena a 17° e nulla a 60° (`natpf_stroke_intent.js:196-201`) | curva monotona con tenuta (OVER) |
| Spinta naturale −0,1 (`:24`) | 0 |
| Il centro della mira e il ritmo assorbono le scelte tenute | riferimenti fermi (§2.5) |
| Aria: lo spostamento laterale arriva all'85–88 % [L] | correzione laterale dell'aria |
| Bordo morbido da 3,1 m (`:57`) | esatto fino a 4,115 − MIN |
| Incrociato largo accorciato (`:373`) | solo se scelto |

---

## 3. Architettura

**Nuovo modulo `natpf-tennis/src/natpf/natpf_direction.js`** (funzioni pure):
- costanti `DIRECTION` (DEAD, OVER, MAXDEV, W_T, XF, EXF, QSPAN, SHORT) ed `EDGE` per livello, con `edgeOf(level)` (Evento con k da `natpf_evento.eventoK`);
- funzioni `faceUnits(dev, full)`, `lateral({...})`, `edgeHold(raw, edge, fade)`, `chosenShort(...)`, `zoneOf({x, depth, hitX, contact})`, `ZONE_LABEL`, `faceOnlyX(...)` (per il fantasma della mira), `aimForTarget(...)` (inversa, solo per banchi e dimostrazioni);
- interruttore `directionRules = { model: 'b36' }` con `directionClassic()`, sul modello di `netPlayRules` (`natpf_net_play.js:20-23`) [V].

**File da cambiare:**
- `natpf_stroke_outcome.js` `strokeOutcome` (`:304-419`):
  - ramo B36 se `!directionClassic() && !nearNet && !volley && shot ∉ {DROP, LOB, SMASH}`;
  - sostituisce la parte laterale (`:338,349-358`) e la profondità (`:364-374`);
  - `te`, `rRest`, `lag`, `excess`, `q`, `failQ`, `netFault`, `weak`, `attack` non si toccano;
  - campi nuovi nell'esito: `uF`, `uT`, `xFace`, `edgeWhy` ('angolo' | 'tempo' | 'situazione' | null), `zone`, `fade`.
- `natpf_stroke_intent.js:232`: `faceDev` in gradi accanto a `face`.
- `natpf_gestures.js:164-218`: opzione `{ freeze }` di `createAimModel`. `natpf_phone_racket.js:780,800` la passa con B36 acceso.
- `natpf_skill.js`: `fixAirRally`, costruita come `fixAirServe` (`:903-919`, correzione di vx senza il controllo della rete), al posto di `fixAir` (`:883`) con B36 acceso. Punti di chiamata: P1 `game_engine.js:2223`, P2 `:2600`, CPU `:2759`.
- `natpf_legend.js`: `kLat` (`:48`) diventa 1 con B36 (usato in `:310,330`).
- `game_engine.js` `_natpfRacketShot` (`:2316-2425`): aggiunge solo `zone` e `xFace` a `natpfLastRacket`.
- `natpf_shot_feedback.js`: causa «troppo angolato» (`:43-75`), zona al rimbalzo (`:192`), aggancio del fantasma.
- `natpf_phone_racket.js:937-951`: campo `zona` facoltativo verso il telefono.
- Registro e diagnostica: §6.3.

**Interruttore:**
- per test e banchi, `directionRules.model`;
- allo stand, opzione dello staff «Direzione dei colpi: Nuova · Classica» nel pannello (`natpf_kiosk.js`, come la mira a `:134`): chiave `natpf-tennis.direzione`, indirizzo `?direzione=classica`, registrata nella diagnostica (`diag_recorder.js:90`) e nella riga «partita» del registro;
- resta «Classica» finché l'utente non approva la prova di B36.3;
- con «Classica» l'esito è identico alla base, impronte comprese.

**Resta com'è:**
- riconoscimento sul telefono, `classifyStroke`, `smashAt`, `superShot`;
- finestre d'impatto (`natpf_stroke_outcome.js:491-499`) e `queueUserSwing` (`natpf_impact.js:406-447`);
- segnale del tempo (il verde coincide con «Perfetto»);
- regole a rete del B31, movimento del B32, servizio;
- doppio e P2 senza telefono, che restano a sorteggio [L]: lì la coerenza **non** vale, e va scritto.

---

## 4. Telefono

- **Da B36.0 a B36.4 non serve cambiare la pagina del telefono.** Il computer usa già `heading.dev` (`natpf_phone_racket.js:260,263`) [V].
- **B36.5:** il telefono mostra la zona (campo `zona` facoltativo). Si alza la versione in `site/js/tennis/version.js` (`NATPF_BUILD`) e `site/tennis/build.json` [V]. Le pagine vecchie ignorano il campo.
- **B36.7, facoltativa, dopo una sessione registrata con telefoni veri:**
  1. **Mira fantasma della posa «pronto»** (`face-tracker.js:126`; `racchetta.js:39` con quietHold 400 ms e relax 2,5 s) [V]. Dopo 3 s fermi e girati, il dritto normale legge da −11,6° a −2,9°, cioè fino a circa 2 m [L]. Con la cima come comando principale diventa la prima fonte di «caso».
     - Si manda anche l'imbardata senza la posa (`fhr`).
     - La posa si aggiorna solo tra un punto e l'altro.
  2. **Piatto mediato su ±15 ms attorno al picco** invece dell'istante interpolato a 1000–1600 °/s [D].
  3. **`base`, `turn`, `along`:** già calcolati, oggi non mandati (`swing-detect.js:392-393`) [L]. Servono a separare posa e arco del colpo (inside-out): varietà, non direzione di base.
  4. Ogni campo nuovo deve essere facoltativo e girato con il verso da `signedSwing` (`natpf_trial_learn.js:115`) [V].
- **Calibrazione:** per chi gioca resta «Giocando». B36 fissa il centro dopo gli scambi di prova (§2.5).
- **Mancini:** `faceDev` è nel riferimento del campo per tutte e due le mani [L]; c segue il lato del colpo e la mano (`game_engine.js:2330-2331`) [V]; test a specchio.
- **Webcam, mouse, tastiera:** W_T resta 1 senza la cima misurata (§2.2).

---

## 5. CPU e livelli

- **Livelli per chi gioca:** la tabella del §2.3.
- **CPU in difesa [D]:**
  - con più palle larghe e profonde la CPU è più spesso in allungo e in corsa;
  - `cpuErrorChance` lo moltiplica per l'angolo (`natpf_skill.js:734-748`) [V]: più errori e più vincenti per chi gioca;
  - si tara **solo la CPU**, come da decisione B16 (a): `cpuSpeed`, `cpuAccel`, `cpuReact`, `cpuReach`, `cpuWide.react` (`natpf_skill.js:42-44,61`) [V];
  - recupero dopo il proprio colpo: oggi x = clamp(−0,25·g, ±1,6) (`game_engine.js:2796`) [V]; diventa la bisettrice degli angoli possibili, come `legendRecover` (`natpf_legend.js:328`) [V];
  - `cpuCenterBias` resta: è ciò che fa pagare gli angoli.
- **Leggenda:** `humanReach` e `legendDecide` (`natpf_legend.js:162-183,204-291`) [V] leggono già dove può arrivare chi gioca. `kLat` diventa 1. Con più palle vicino alle righe aumentano le palle lasciate passare sbagliate (lettura ±0,12 m) [L]: va controllato con `audit:legend`.
- **CPU in attacco:** gli schemi restano a sorteggio pesato (`natpf_skill.js:939-967`) [V]. La CPU è l'avversario: il suo caso non tocca la coerenza di chi gioca. **Stessa fisica:** l'aria laterale corretta vale anche per lei, così i suoi angoli cadono dove li sceglie. Bambini invariato: palle al centro, niente angoli.
- **Stesso schermo:**
  - B36 vale per tutti e due;
  - l'aiuto al più giovane oggi passa dal tempo (finestra ×2 e +0,1 s: `natpf_duo_rules.js:151,164`) [V], e con W_T 0,3 sposta meno;
  - si aggiunge sul canale nuovo: MIN e F di Bambini per chi è aiutato; restano la palla più lenta e il colpo più profondo (`:164,264-268`);
  - criterio b25: bambino contro adulto medio 38–42 % dei punti, mai oltre 50 % [L].
- **Due computer:**
  - l'host calcola l'esito;
  - `natpf.intent.faceDev` viaggia come campo facoltativo; se manca (P2 di un'altra versione), per quel colpo valgono le regole di oggi;
  - circa 12 byte in più, sotto il limite di 16300 [L].

---

## 6. Riscontro a schermo, tutorial, registro

### 6.1 A schermo
Poche cose e chiare. Misure con `cqw`/`cqh` dentro `@container natpf`; nessuna voce nuova.

| Quando | Cosa | Dove | A chi |
|---|---|---|---|
| Al colpo | anello d'arrivo, che esiste già (`natpf_shot_feedback.js:2-3,179,212`) [V]; il rosso «fuori» passa al rimbalzo, come da B37 | campo | sempre |
| Al rimbalzo | nome della zona («Lungolinea», «Incrociato», «Angolo», «In fondo», «Inside-out»: testi da confermare), 0,8 s, sopra l'anello | campo lontano | sempre |
| Rimbalzo fuori | «Fuori · troppo angolato / in ritardo / in corsa», anche sul telefono | scritta del proprio lato | sempre |
| Al colpo, se il tempo ha spostato la palla di almeno 1 m | «fantasma della mira»: segno tratteggiato dove puntava la cima e una freccia verso l'anello | campo | allenamento, tutorial e prime 12 palle a Bambini ed Evento; opzione dello staff |
| Dopo 6 colpi senza girare la cima | «Gira la cima: la palla va dove punta», una volta | scritta | Bambini ed Evento |
| Fine partita | mappa dei colpi e «vincenti per zona» (solo positivi, schermata B35b) | — | da chiedere |

### 6.2 Tutorial e allenamento
- **Tutorial corto:** gli indici sono fissi per il protocollo `tp` (`natpf_tutorial.js:35-48`) [V]. Nel dritto e nel rovescio la terza indicazione diventa «La cima decide dove va la palla» (`natpf_gesture_motion.js:71-77`). Va controllato `natpf-tutorial.test.mjs`.
- **Dimostrazioni di incrociato e lungolinea** (`natpf_gesture_motion.js:111-114`: preYaw ±22°, «un attimo prima/dopo») [V]:
  - le indicazioni diventano «Cima girata verso il centro (circa 20°)» e «Un attimo prima: più incrociata»;
  - il test di fedeltà legge `intent.face`/`uF` al posto di `natpf.wrist` (`natpf-gesture-pose.test.mjs:286`) [V].
- **Allenamento:**
  - il giudizio usa `uF` al posto di `natpf.wrist` (`natpf_training.js:63,84`) [V];
  - suggerimenti riscritti (`:30-31`);
  - `trainingDirection` (`:120-125`) passa alle zone.
- **Prova guidata del B35a:** esercizi nuovi «profondo incrociato», «angolo corto», «lungolinea profondo», «inside-out».

### 6.3 Registro dello stand
Riga «colpo», `registro_registratore.js:333-358` [V]. Oggi:
- `d` è la mira totale;
- `x` e `z` sono il bersaglio del motore, non il rimbalzo vero;
- `e` segna solo debole, rete o fallito (`:351-352`): **un fuori di mira o di tempo non è segnato**.

Campi da aggiungere:

| Riga | Campo | Contenuto |
|---|---|---|
| colpo | `zona` | zona del rimbalzo |
| colpo | `fa` | uF, mira della cima |
| colpo | `ta` | W_T·uT, ritocco del tempo |
| colpo | `dev` | scarto della cima, in gradi |
| colpo | `tu` | tempo in unità della finestra |
| colpo | `bx`, `bz` | rimbalzo vero (`landingOf`) |
| colpo | `fu` | 1 = fuori al rimbalzo vero |
| colpo | `hx` | hitX |
| colpo | `tn` | tenuta usata, da 0 a 1 |
| partita | `dir` | 'b36' oppure 'classica' |

- I campi vanno nelle due liste: `registro_formato.js:47-53` e `cloudflare/registro-worker.js:99`. Il test `registro-worker.test.mjs:39` le vuole uguali.
- **L'utente deve ricaricare il Worker:** oggi butta in silenzio i campi che non conosce [L].
- **Diagnostica:** evento `racchetta` (`diag_recorder.js:263-277`) [V] con `zona`, `uF`, `uT`, `xFace`, `tenuta`, `causa`. `diag_direction.js` tiene le 3 fasce (`DIR_LINE` 1,25 m: `:18`) e aggiunge le zone.

---

## 7. Banchi e test

- **Prima e dopo:**
  - base = 13.8 più B35b e B37 se uniti; serie di semi 1,2 e 3,4;
  - interruttore «classica» contro «b36».
- **Banco B35a esteso** (`scripts/audit/direzione-telefono.mjs`):
  - nuove opzioni: `--modello`, zone e 3 posizioni, gesto «stand», `--riga` per livello;
  - `--serie` con mira tenuta (8°, 15°, 25°) e tempo tenuto;
  - forza 0,2 / 0,5 / 0,9 per la profondità;
  - misura sul rimbalzo vero del motore headless.
- **Banco rapido nuovo** `scripts/audit/b36-gioco.mjs`, dal mio prototipo, sotto i 2 s: curva, scogliera, copertura, peso del tempo.
- **Prima gli strumenti:**
  - `rally-balance.mjs:42-60` `phoneIntent` mira soprattutto con il tempo, invertendo la mappa di oggi [V];
  - lo stesso vale per `b19/due-umani*.mjs`, `precision-combo.mjs` e `rete-diag.mjs` [L];
  - tutti passano a un «umano fisico»: punto voluto → cima in gradi, più rumore in gradi e in millisecondi;
  - con «classica» i numeri devono restare dentro il rumore della base.
- **Audit con criteri, invariati [L]:**
  - `audit:legend` con 24 o 40 semi: tennista ≥ 85 %; amatore 2–6 %; Esperta contro medio 70–85 %;
  - `cpu-pressione --obiettivi`;
  - `evento-bambini`: adulto 60–70 punti;
  - b25 aiuto;
  - `rete`, `movimento`, `palla-corta`, `colpi.mjs`, `variety`, `lato-palle`.
- **Test nuovi** (`natpf-b36-direzione.test.mjs`):
  - monotonia della cima per livello, posizione e mano;
  - continuità: ≤ 0,5 m per 10 ms e ≤ 0,35 m per grado;
  - determinismo;
  - specchio P1/P2, mancino, dritto e rovescio;
  - Bambini ed Evento: mai fuori per la sola mira (tempo nella finestra, q sopra la soglia), fino a 80°;
  - Leggenda: oltre circa 24° di cima, fuori con «troppo angolato»;
  - tutte le zone raggiungibili a ogni livello;
  - solo tempo ≤ ±1,2 m;
  - webcam senza cima con W_T 1;
  - centro fisso: 14 colpi uguali entro ±0,2 m;
  - «classica» identica alla base su una griglia di 1000 ingressi;
  - campi del registro nelle due liste;
  - P2 senza `faceDev` con le regole di oggi.
- **Test da riallineare di proposito**, con il commento «prima X, ora Y, perché» [L]:
  - `natpf-campo-aperto` (`:22,38,56,68,125,138`) e `-23-10` (`:15,36,51`);
  - `natpf-colpi-b15` (`:40,89,96`), `natpf-aim` (`:73,87,106`), `natpf-racchetta-motore` (`:72,418,435`);
  - `natpf-presa-palmo-29-10:170`, `natpf-variety` (`:50,126`), `natpf-diag-20261030:159`;
  - `natpf-b35-direzione` (deve migliorare), `natpf-training-directions`, `natpf-gesture-pose:286`;
  - impronte b25, b32, Leggenda e palla corta, fine partita, evento-bambini: prima identiche con «classica», poi registrate con B36.
- **Prove nel browser:**
  - quelle di oggi [L]: natpf-rally, phone-upright, mira-lato, training-flow, tutorial-phone, gesti-*, minigiochi-principianti, diag-session, scambi-di-prova, leggenda, rete, movimento, stesso-schermo-b20/-b25, 1v1-p2p, 1v1-webcam-p2, webcam-pipeline, fine-partita, registro;
  - nuova `natpf-b36-zone.mjs`: schermate di zona e fantasma a 1920×1080, nell'area del ledwall e a schermo diviso.
- **Telefono vero:** sessione della prova guidata (Maiusc+D) su almeno 2 telefoni, prima e dopo. Senza questa sessione si scrive «non verificato».

---

## 8. Tappe

Un agente per tappa. A ogni tappa: test verdi, commit, push, pacchetti.

| Tappa | Cosa | File | Criterio di chiusura |
|---|---|---|---|
| **B36.0** | Misure e strumenti, senza cambiare il gioco | banco B35a esteso, `b36-gioco.mjs`, «umano fisico» nei 4 banchi, campi del registro e della diagnostica (§6.3) | impronte identiche; tabelle «prima» in `docs/b36/`; chiesto all'utente di ricaricare il Worker; corretti `docs/PROJECT_MEMORY.md:83-91` e `:832` [L] |
| **B36.1** | Il rimbalzo cade dove si mira | `natpf_skill.js` (`fixAirRally`), `game_engine.js:2223,2600,2759`, `natpf_legend.js:48` | \|rimbalzo − bersaglio\| ≤ 0,1 m nel 95 % dei colpi; audit nei criteri; «classica» identica |
| **B36.2** | La cima comanda | `natpf_direction.js`, `natpf_stroke_outcome.js:354-358`, `natpf_stroke_intent.js:232`, `natpf_gestures.js` (freeze), `natpf_phone_racket.js:780,800` | righe del §1.2 su zone, monotonia, coerenza e peso del tempo; matrice B35a non peggiore |
| **B36.3** | Righe senza scogliere | `natpf_direction.js` (EDGE, fade), `natpf_stroke_outcome.js:338-358`, `natpf_shot_feedback.js:43-75` | fuori per livello del §1.2; ≤ 0,5 m per 10 ms; Bambini mai fuori per la sola mira |
| **B36.4** | Profondità e varietà | `natpf_stroke_outcome.js:364-374`, tempo → velocità e altezza | copertura ≥ 58/72; PI ≥ 85 % e AC ≥ 70 %; km/h e profondità di `colpi.mjs` documentati; banco `rete` dentro il rumore |
| **B36.5** | Riscontro, tutorial, allenamento (**dopo B37**, stessi file) | `natpf_shot_feedback.js`, `natpf_aim_ghost.js` (nuovo), CSS dell'HUD, pagina del telefono più versione, `natpf_training.js`, `natpf_gesture_motion.js`, `natpf_gesture_pose.js`, `natpf_tutorial.js` | schermate guardate; test di fedeltà su `intent.face`; telefono vecchio compatibile |
| **B36.6** | CPU, livelli, stesso schermo, due computer, opzione dello staff | `natpf_skill.js`, `game_engine.js:2796`, `natpf_legend.js`, `natpf_duo_rules.js`, `natpf_kiosk.js`, `natpf_evento.js` | audit nei criteri su 2 serie di semi; P2P verde; «come si attiva» detto all'utente; versione nuova e pacchetti |
| **B36.7** (facoltativa) | Segnali del telefono | `face-tracker.js:126`, `racchetta.js:39`, `swing-message.js`, `signedSwing`, versione | su telefoni veri: deviazione della cima per lo stesso voluto ≤ 8°, mira fantasma ≤ 3° |

- **Fuori da B36:** palle corte, volée, gioco a rete (B31 invariato), servizio, schiacciata, pallonetto, doppio e P2 senza telefono, mirino durante la preparazione (sperimentale), camera come nel video 1 (da valutare dopo).
- **Ordine:** B36.0 può andare insieme a B37 (file diversi), con al più due agenti contemporanei. B36.5 viene dopo B37.

---

## 9. Rischi, punti deboli del piano, domande

**Rischi**
1. **Rumore della cima.** Con la cima al comando, la posa «pronto», la deriva e un centro sbagliato diventano errori di direzione. Oggi metà la nascondeva il tempo. Mitigazione: centro fisso e B36.7, ma senza un telefono vero non è verificabile.
2. **Equilibrio contro la CPU.** Più angoli e più profondità possono portare Esperta contro «medio» oltre l'85 %, Evento al tetto e Leggenda sotto l'85 % contro «tennista». Mitigazione: tarare la CPU.
3. **L'aria laterale corretta cambia ogni rimbalzo**, del giocatore e della CPU. Per questo deve stare dietro l'interruttore.
4. **Webcam e tastiera** perdono la direzione se W_T vale anche per loro (§2.2).
5. **L'aiuto al più giovane** si svuota se non passa sul canale nuovo.
6. **Segni nuovi poco chiari:** l'utente non ha capito il segnale del tempo (B37, punto 3).

**Punti deboli del mio piano**
- Il gesto «stand» (±10°) è inventato [D].
- Il prototipo è semplificato: una sola palla, nessun telefono, nessun centro che impara.
- Dagli angoli la sensibilità è asimmetrica: con x0 = 0,4·hitX, dall'angolo del dritto 1° verso l'incrociato vale 2,25 volte più metri che verso il lungolinea (campate 5,33 contro 2,37 m) [D]. Con follow 0,25 scende a 1,64 volte.
- La compressione oltre la riga a Bambini ed Evento fa da piccola «calamita» sulla riga. Va misurata la quota di palle ammucchiate in una cella (≤ 8 %).
- L'angolo corto scelto (salita più forza media) difficilmente si scopre in due minuti.

**Domande all'utente** (opzione consigliata per prima)
1. **Peso del tempo nella direzione:** 0,3 · 0,5 · 1 (oggi). Al prototipo [P], Pro con gesto «stand»: PI 60 / 58 / 52 %, fuori 6 / 7 / 13 %.
2. **Fuori «per ambizione»** (cima oltre la riga): solo a Leggenda · anche a Pro · mai.
3. **Riscontro:** nome della zona sempre e fantasma della mira solo in allenamento e nei primi colpi · fantasma sempre · niente di nuovo.
4. **Palle corte e volée:** restano nel gioco con le regole di oggi, fuori dalla mappa nuova · spente durante le prove di B36.
5. **Riferimenti fermi durante la partita** (centro della mira e colpo tipico) · adattivi come oggi.
6. **Fine partita:** mappa dei colpi e vincenti per zona tra le cose positive (dopo B35b) · no.
