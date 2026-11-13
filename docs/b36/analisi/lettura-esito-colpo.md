# Lettura «gioco → dove atterra la palla» (B36, sola lettura)

Base: `natpf-simulator` 6829d09 (2026-11-13.7). Il ramo B35a `b35-precisione-telefono` cambia già una parte di questa catena (vedi la nota finale).
Legenda: [V] = verificato nel codice (file:riga) o con gli script; [D] = dedotto.
Convenzioni: x è misurata nel riferimento di chi colpisce (+ a destra); d = metri dalla rete; c = +1 per il dritto del destro (o il rovescio del mancino), −1 per l'altro lato; t = tempo in «unità della finestra» (+ = anticipo).
Esempio usato ovunque, salvo dove detto: dritto del destro, Pro, top spin, forza 0,6, q = 1. Palla a 0,72 m di lato al contatto (PLAN.side, natpf_impact.js:32), contatto a 11,4 m dalla rete e a 1 m d'altezza, palla in arrivo a 18 m/s. I colpi della CPU arrivano a 15–26 m/s (vz-arrivo.mjs).

Script, tutti in `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b36/agenti/`:
- `esito-numeri.mjs` (tabelle);
- `estremi.mjs`, `scogliera.mjs`, `fuori-mc.mjs`;
- `copertura.mjs` (mappa);
- `vz-arrivo.mjs`.

Il «rimbalzo vero» è una replica in node di `_launchBallToTarget` + `fixAir` + `flyAir`, con la stessa fisica del motore. Non è stato provato nel browser.

## 0. La catena [V]

1. **Evento.** Dal telefono: `natpfSwingToEngine` (natpf_phone_racket.js:238-283) con `intent` {shot, power, depth, rise, face} prodotto da `strokeIntent` (natpf_stroke_intent.js:212-234; face = `faceAimFromDev`, 196-201). Da webcam, mouse e tastiera: `eventIntent` ricostruita (natpf_stroke_outcome.js:468-478).
2. **Tempo.** `queueUserSwing` (natpf_impact.js:406-447) calcola:
   - timing = tempo che manca all'arrivo della palla + latenza (409);
   - lateSpan = (1,4/|vz| + lateMargin)·openTight (412; stroke_outcome:438).

   Lo swing aspetta l'arrivo della palla (`resolvePending`, 459-491). Vale solo nel singolare: P1 con qualunque ingresso (game_engine.js:1569-1577), P2 solo con il telefono (1792, 2519-2542).
3. **Esito.** `_natpfRacketShot` (game_engine.js:2316-2425) → `strokeOutcome` (2351) → aiuto al più giovane (2353) → super (2358-2359) → scambio caldo (2362). Da lì: bersaglio X = x·mirror e N = −d (2368), poi il volo (2370-2392).
4. **Lancio.** `_launchBallToTarget` calcola la traiettoria senz'aria (2821-2846); `fixAir` corregge solo la velocità lungo il campo (2223; natpf_skill.js:867-883).
5. **Arbitro.**
   - Rete: la palla attraversa z = 0 sotto 0,954 m (3160-3168).
   - Fuori: al primo rimbalzo |x| > 4,335 oppure |z| > 12,17 (3186-3192).

## 1. Formule e pesi

### Laterale (x) [V]

```
span = directionSpan(liv)·slowFactor(vz)·[Leggenda: pressione^3]·[volée a rete ×1,6]      stroke_outcome:288, 221, 181-182
   directionSpan: Casual 0,20 · Evento 0,20→0,15 · Pro 0,15 · 1v1 0,17 · Bambini 0,28 · Leggenda 0,115 s
   slowFactor fino a ×1,8 sotto 15 m/s
late = clamp(lateSpan·[1,6], 0,04, span); lateSpan = 1,4/|vz| (+0,06 Bambini, +0,1 aiuto, +0,03 P2 remoto)·openTight
   → 93 ms a 15 m/s, 78 a 18, 64 a 22, 56 a 25, 50 a 30: uguale a TUTTI i livelli     438, 459; impact:363-368, 412
t = timing/span (anticipo) | timing/late (ritardo), limitato a ±4; excess = max(0, |t|−1)                  292
aimT = clamp(t − ritmo, ±1)
   ritmo = clamp(0,8·mediana degli ultimi 8 t con |t| ≤ 1,3; ±0,6), 0 sotto 4 colpi                       317; 228-241
aim = −c·0,1·(1−|aimT|) − c·1·aimT + 1·face     (face×0,7 per intenti ricostruiti)                       318; 24, 27, 36, 477
x0 = 0,4·clamp(hitX, ±3,65)                                                                                257, 45
raw = x0 + aim·(3,65 ∓ x0) − c·sgn(t)·excess·pushOut                                                       259, 319
   pushOut: 0,8 Casual/Evento/Bambini · 0,9 Pro/1v1 · 1,35 Leggenda                                        196-215
assist = clamp(1 − excess/0,25)·clamp((q − assistQ)/0,1 + 0,5)
   assistQ: 0,5 · 0,6 (1v1) · 0,62 (Pro) · 0,8 (Leggenda)                                                  302, 59-60
xa = raw + (sgn·softEdge(|raw|; 3,1→4,0) − raw)·sideHold     (sideHold = assist; a rete anche senza)       320, 57, 313-314
x = xa se |xa| ≤ 4,115, altrimenti ±(4,115 + softEdge(|xa|−4,115; 1,4→1,9))                              321, 43
rimbalzo vero ≈ hitX + 0,85…0,88·(x − hitX)                                                                [V replica: fixAir non corregge il lato]
```

- 1 unità di mira = la distanza dal punto neutro alla riga: 3,36 m verso destra e 3,94 m verso sinistra con hitX 0,72.
- Piatto: 1 unità = 14° oltre la zona morta di 3° (mira «alta»).
- Tempo: 1 unità = 150 ms in anticipo (Pro) oppure 78 ms in ritardo.
- Sensibilità sul rimbalzo vero: **0,21 m per grado di piatto; 2,0 cm/ms in anticipo; 4,1 cm/ms in ritardo** (estremi.mjs).

### Profondità (d) [V]

```
want = forza·(0,8 + 0,2·ampiezza) dal telefono (intent:51, 96, 229) | = forza per gli intenti ricostruiti (477)
d = lerp(D, want^0,7)   (DROP e LOB lineari)                                                              326-327, 54-55
   D: TOPSPIN 6,2–11,5 · FLAT 6,4–11,7 · SLICE 5,4–10,8 · LOB 8,6–11,4 · DROP 1,8–4,6 · SMASH 5,6–10,8
d −= 1,8·(1−q) + 0,8·excess  (+ volée: 1·(1−forza))                                                      327, 61-62, 88
diagonale: d = √((zc+d)² − (x−hitX)²) − zc                                                                331-332
TOPSPIN: d += 4·forza·clamp(rise − 0,45; 0…0,4)                                                           333, 63
lato incrociato (−c·x > 0): d −= 0,6·max(0, d − 6 [4,2 in chiusura])·clamp((|x| − 3,2)/0,8)               336, 67
d += (softEdge(d; 10,8→11,6) − d)·assist;  d ≥ 3 (palla corta ≥ 1,6)                                      337-338, 56, 58
fallito non in rete: d ≥ 12,6 + 4·(failQ − q);  debole: d ≤ 6,8                                           364, 366
super: d ≥ 10,2 (game_engine:2359);  aiuto al più giovane: +1 m fino a 11,3 (duo_rules:264-268)
```

Numeri (top spin al centro):
- forza 0 / 0,2 / 0,5 / 0,8 / 1 → d = 6,18 / 7,90 / 9,45 / 10,72 / 11,36 m;
- il piatto aggiunge +0,1…0,2 m, il tagliato toglie 0,6…0,8 m;
- incrociato pieno (x −3,8): 7,62 m a forza 0,5 e 8,77 m a forza 1;
- lungolinea (x 3,31): 9,30 e 11,28 m;
- qualità: −0,18 m per ogni 0,1 che manca;
- con la curva 0,7, d tra 6,2 e 7,3 m si ottiene solo con forza < 0,1.

### Altezza, velocità, effetto [V]

- **Altezza sulla rete:** clear = max(1,274; A0 + (Amorb − A0)·(1−p)^1,5 + 0,35·(1−q) − 0,18·clamp((y−1,5)/0,5) + [solo TOPSPIN] 0,6·clamp(rise − 0,15; 0…0,6)) (340-344).
  - A0 / Amorb: TOPSPIN 1,30/2,50 · FLAT 1,27/1,42 · SLICE e palla corta 1,27/1,55 · pallonetto 2,5/3,1 (lineare); natpf_skill.js:831-837.
- **Effetto:**
  - TOPSPIN = 15 + 8·rise + 6·(1−p) + 8·clamp((p−0,5)/0,5);
  - FLAT 12 · SLICE −6,5 · palla corta −3 · pallonetto 5 · schiacciata 9 (345);
  - gravità efficace 9,15 + 0,14·effetto (game_engine:2827); rimbalzo da bounceSpin (skill:933).
- **Volo:** il massimo tra
  - il volo base max(0,58; 0,84/min(1,5; (0,8+0,85p)·0,94)), moltiplicato per scambio (fino a −16%), serie di perfetti (−4,5…5% a colpo, minimo 0,82/0,8), (1 + 0,14·(1−q)), super (÷1,4), scambio caldo e aiuto;
  - il volo che serve per passare la rete all'altezza «clear» (game_engine:2387-2392; skill:407, 422, 845-850).
- **Colpi speciali:**
  - pallonetto: lerp(2,6; 1,95; p)·clamp((zc+d)/22; 0,85…1,1);
  - schiacciata: max(0,26; (zc+d)/48);
  - chiusura (contatto entro 6,4 m dalla rete, palla a ≥ 0,9 m, forza ≥ 0,45): 0,08–0,3 m sopra il nastro, a 20–34 m/s (346, 374-379).
- **Simulazione (forza 0,3 / 0,6 / 0,9):**

| Colpo | Volo (s) | km/h | Altezza sulla rete (m) |
|---|---|---|---|
| Top spin | 1,05 / 0,89 / 0,76 | 81 / 101 / 125 | 2,0 / 1,65 / 1,41 |
| Piatto | 0,82 / 0,77 / 0,74 | 102 / 116 / 127 | — |
| Tagliato | 1,0 / 0,92 / 0,86 | 80 / 93 / 105 | — |

### Ingressi e peso [V]

- **Piatto:** sposta solo x, con peso pieno (±1 = fino alla riga).
- **Tempo:** sposta x con lo **stesso peso del piatto**. Oltre la finestra: spinta verso l'esterno, assistenza che si spegne, −0,8 m di profondità per unità, qualità del tempo (timingQualityOf: −50% a 2 unità, 250).
- **Forza:** decide d, l'altezza sulla rete, l'effetto, la velocità, il super e la chiusura.
- **Tipo di colpo:** intervallo di d, altezza sulla rete, effetto.
- **Livello:** finestra, assistQ, failQ, pushOut. **Non** la mira piena: 3,65 m per tutti (196-215).
- **Posizione della palla:**
  - hitX → punto neutro (×0,4);
  - zc → diagonale, rete, chiusura;
  - y → altezza sulla rete, rete (y < 0,42 con excess > 0,45; fallito con y < 1), chiusura.
- **Palla in arrivo:** vz → le due finestre; velocità sopra 24 m/s → fino a −25% di qualità (game_engine:2337).
- **Situazione:** q = reach·prep·stretch·pace (game_engine:2344-2345):
  - reach: −0,22 per metro oltre 1,1 m e −0,15·corsa (skill:390);
  - prep: 0,86 senza preparazione (skill:334-337);
  - stretch: −0,4·allungo (impact:243);
  - pressione: dal 16° colpo −0,015 a colpo, fino a −0,45 (stroke_outcome:246-247).

## 2. Quanto conta la direzione del giocatore e quanto gli aiuti

**Bilancio sul rimbalzo vero** (dritto dal centro, Pro, q = 1) [V, script]:

| Ingressi | Rimbalzo x (m) |
|---|---|
| Solo piatto (t = 0) | −3,19 … +2,95 (bersaglio −3,80 … +3,31: la spinta naturale toglie il 10% al lungolinea) |
| Solo tempo | −3,00 (150 ms prima) … +3,19 (78 ms dopo) |
| Piatto e tempo nello stesso verso | −3,36 … +3,54 (saturano) |
| Piatto e tempo opposti (anticipo pieno + piatto +1) | +0,35: **si annullano** |

Effetti che chi gioca non sceglie:
- punto neutro: +0,29 m con hitX 0,72, fino a ±1,4 m con la palla a ±3,5 m;
- spinta naturale: −0,1 di mira, circa −0,4 m al tempo neutro;
- aria: −12…15% dello spostamento laterale, cioè −0,35…−0,6 m sulle palle angolate;
- ritmo: dopo 5 colpi a +0,5 unità lo stesso colpo passa da x −1,88 a −0,46 m.

**Sintesi.**
- Dentro la finestra e con q ≥ assistQ + 0,05 la x è deterministica al 100% e dipende solo da piatto e tempo.
- Il piatto, l'unico ingresso scelto davvero, ha però metà dell'autorità. Nessun termine casuale nel singolare: l'unica dispersione è quella del colpo «controllato» a rete, da un seme deterministico (1,2 m di lato, 0,35 m d'altezza; 118, 155-164, 300, 319, 344).
- La profondità dipende quasi solo dalla forza; la direzione la accorcia soltanto dal lato dell'incrociato.

**Elenco completo di aiuti, limiti, centrature e quantizzazioni** [V]. Riferimenti in natpf_stroke_outcome.js salvo indicazione.

Mira laterale
1. Spinta naturale di 0,1 verso l'incrociato al tempo neutro (24, 318).
2. Punto neutro che segue la palla al 40%: il 60% dello scarto della palla è tirato verso il centro (45, 257).
3. Mira piena xMax 3,65 m, cioè 0,465 m dentro la riga, a tutti i livelli (44, 196-215).
4. Piatto limitato a ±1 (318); peso 0,7 per webcam, mouse e tastiera (477).
5. aimT limitato a ±1: oltre la finestra il tempo non aggiunge mira, solo spinta (317).
6. Bordo morbido assistito: tra 3,1 e 4,0 m (57, 320).
7. Assistenza che sparisce in 0,25 unità oltre la finestra e in ±0,05 di qualità attorno ad assistQ (59-60, 98, 302).
8. Bordo morbido anche senza assistenza nella zona di rete (Leggenda, volée; 313-314).
9. Spinta oltre la finestra, pushOut (46, 319).
10. Palla fuori al massimo 1,9 m oltre la riga (43, 321).
11. Ritmo: keep 8, min 4, gain 0,8, max 0,6 (228-241).

Tempo
12. Finestra in anticipo per livello, allargata fino a ×1,8 sulle palle lente (181-182, 221, 288; skill:24, 36, 93, 114).
13. Finestra in ritardo = 1,4 m/|vz|, uguale per tutti (438, 459). Aggiunte: Bambini +0,06 s (skill:117), aiuto +0,1 s (duo_rules:164), P2 remoto +0,03 s (impact:363).
14. Leggenda: finestra 0,115 s che si stringe con la pressione^3 (215, 288).
15. Volée vicino alla rete: finestra ×1,6 (95, 287).
16. Campo aperto: finestra ×(1 − 0,8·allungo) (duo_rules:87; impact:246, 412; game_engine:2322-2323).
17. Aiuto al più giovane: finestra ×2 (bambino) o ×1,3 (ragazzo) (duo_rules:163-168, 248-251).

Qualità ed esito
18. Qualità del tempo e qualità minima 0,2 (250, 293).
19. failQ 0,2 / 0,34 / 0,3 / 0,3 (Casual, 1v1, Pro, Leggenda): sotto, il colpo fallisce, in rete o lungo (296, 363-364).
20. Colpo controllato e colpo debole a rete (118, 299, 362, 366).
21. Pressione degli scambi lunghi (246-247).

Profondità
22. Curva 0,7 e intervalli per tipo (54-55, 326).
23. −1,8 m per la qualità che manca e −0,8 m per unità oltre la finestra (61-62, 327).
24. Diagonale (331-332); incrociato stretto accorciato verso 6 m (4,2 m in chiusura) da 3,2 m di lato (67, 336).
25. Top spin pesante: fino a +1,6 m (63, 333).
26. Bordo morbido sul fondo, 10,8→11,6 m; minimo 3 m (56, 58, 337-338).
27. Super: almeno 10,2 m (409-410; game_engine:2359); aiuto: +1 m fino a 11,3 m (duo_rules:147, 264-268).

Volo e fisica
28. Altezza minima sulla rete 1,274 m (344) più il controllo del lancio a 0,34 m sopra il nastro (game_engine:2834-2846). Chiusura, super e scambio caldo passano più bassi (2410).
29. fixAir corregge solo z, con fattore 1…1,8 (skill:867-883): lo spostamento laterale arriva all'85–88%.
30. Tolleranza dell'arbitro: +0,22 m di lato e +0,28 m in fondo (game_engine:3187-3188; shot_feedback:20).

A monte (telefono)
31. Piatto: zona morta 3°, mira piena a 17°/20°/23° (opzione dello staff); oltre 45° conta sempre meno e a 60° non conta più (stroke_intent:53, 63, 185-201).
32. Centro della mira adattivo: gain 22, settle 10°, alpha 0,12, drift 0,03, maxDev 80°, biasPull 0,3 dopo 10 colpi con la mediana oltre 12°, commonPull 0,3 (natpf_gestures.js:147-205).
33. Profondità voluta = forza·(0,8 + 0,2·ampiezza); forza relativa con relGain 0,9 (stroke_intent:51, 67, 84-96, 229).

Quantizzazioni
34. Lato binario c = ±1 (game_engine:2330-2331): ribalta tutta la mappa tempo→direzione.
35. Distanza palla–corpo fissata a 0,72 m dal movimento automatico (impact:32, 140): hitX lo decide la traiettoria, non chi gioca.
36. Scritte «incrociato» e «lungolinea» a ±1 m (game_engine:2258-2268): solo testo.
37. Tastiera: 0,55 di mira per tasto (motion_controls.js:1573-1575); mouse: |dirX| almeno 0,22 (1671-1672).

Catena vecchia con sorteggi: P1 nel doppio e P2 senza telefono
38. landingScatter gaussiano (skill:362-366); autoAim verso il campo libero (266-278); playerErrorPlan a sorteggio (369-381); profondità gaussiana (348-350, 383-388); angleDepth a sorteggio (922-927); shotArc gaussiano (854-862); colpo difensivo ×0,75 (game_engine:2169, 2559); direzione del P2 a sorteggio (2530-2536).

## 3. Fuori e rete

**Regole** [V]
- **Rete:** solo per regola. Un colpo normale passa sempre almeno a 1,27 m sulla rete (28).
  - netFault scatta in tre casi (363): palla sotto 0,42 m con più di 0,45 unità fuori tempo; colpo fallito con palla sotto 1 m; palla corta sbagliata.
  - Con netFault il lancio mira a 0,79 m sulla rete (game_engine:2836-2838).
- **Lungo:** colpo fallito (q < failQ) → almeno 12,6 m; oppure assistenza < 1 con forza alta o top spin pesante (rise 0,85, q 0,75 a Leggenda → 12,63 m).
- **Largo:** solo quando la mira grezza supera ±1 e l'assistenza manca.

**Perché chi cerca la precisione vede molte palle fuori** (punto 2 del collaudo)
1. **[V] Somma più «scogliera».** Il piatto girato verso la riga, più un ritardo naturale («aspetto la palla per il lungolinea»), porta la mira a 1,5–2. Dentro la finestra il bordo morbido la tiene a x ≤ 4,0 m. Pochi millisecondi oltre la finestra in ritardo la tenuta sparisce (Pro, piatto +1):

   | Ritardo (ms) | 78 | 82 | 86 | 89 | 93 |
   |---|---|---|---|---|---|
   | Bersaglio x (m) | 4,00 | 4,61 | 5,24 | 5,83 | 6,00 |

   Il rimbalzo vero passa da 3,54 a 5,25 m: fuori di un metro. Lo stesso succede con la qualità: piatto −1 con 120 ms di anticipo, q 0,67 → −4,00; q 0,62 → −5,44; q 0,57 → −6,01 (scogliera.mjs).
2. **[V] La finestra in ritardo è stretta e uguale per tutti:** 56–93 ms secondo la velocità della palla, contro 115–280 ms in anticipo. L'assistenza si spegne in 0,25 unità, circa 20 ms.
3. **[V] Soglia di qualità.** assistQ (0,8 a Leggenda) dipende da corsa, allungo, assenza di preparazione (0,86) e palla veloce: lo stesso gesto che entrava esce.
4. **[D] Scenario con dispersione ipotetica del tempo** (±35 ms; fuori-mc.mjs):

   | Gesto | Tempo medio | Fuori |
   |---|---|---|
   | Piatto +1 | −40 ms | 10% a ogni livello |
   | Piatto +1 | −60 ms | 24% |
   | Piatto +1, q 0,75, Leggenda | −40 ms | 57% |
   | Piatto 0 | qualunque | circa 0% |

5. **[D, misurato da B35a nel suo ramo]** Un ritardo dello schermo non misurato (Ritardo dello schermo = 0 di base: natpf_phone_racket.js:229, 268) porta tutto oltre la finestra in ritardo: 24–25% di colpi fuori o in rete con un ritardo di 1,2 finestre.

Nota: anello ed esito «Fuori» usano il rimbalzo previsto (shot_feedback:31-36), coerente con l'arbitro.

## 4. Tipo di colpo e campo raggiungibile

**Scelta del tipo** [V]
- **Dal telefono:** `classifyStroke` (stroke_intent:107-145).
  - Schiacciata: palla alta e testa che scende.
  - Pallonetto: testa che sale molto con swing verticale, oppure gesto lento che sale.
  - Palla corta: taglio verticale morbido, oppure discesa morbida o corta.
  - Tagliato: rise ≤ −0,22 + min(0, salita abituale).
  - Top spin: rise relativa ≥ 0,15. Piatto: forza ≥ 0,62 e |rise relativa| ≤ 0,12. Altrimenti top spin («colpo normale»).
  - Si aggiungono i prototipi personali di pallonetto e palla corta (162-174, 221-222).
- **Nel motore:**
  - schiacciata da `smashAt`: palla ≥ 2,3 m, oppure ≥ 1,5 m con il gesto (stroke_outcome:486-496); «smash» su palla bassa diventa piatto (game_engine:2326);
  - palla corta a rete senza forma chiara diventa tagliato (283-284);
  - **la volée la sceglie il movimento automatico**, non chi gioca: si prende al volo quando aspettare il rimbalzo costa almeno 0,35 s in più (impact:203-205; game_engine:2347);
  - chiusura: entro 6,4 m dalla rete, palla a ≥ 0,9 m, forza ≥ 0,45 (335).
- Incrociato, lungolinea e stretto **non sono tipi**: sono x e d risultanti. Le scritte usano ±1 m.

**Mappa sul rimbalzo vero** (Pro, q = 1, tutte le combinazioni dentro la finestra; copertura.mjs). «#» raggiunta, «+» e «.» raramente; colonne x da −4,1 a +4,1 m.

```
DAL CENTRO (palla +0,72)          DAL LATO DESTRO (palla +3,5)
11.0 |  .############# |          11.0 |       +#########|
10.0 |  +############# |          10.0 |   ++###########+|
 9.0 | .############## |           9.0 |   ++##+########+|
 8.0 | ############### |           8.0 |  #+++#+########+|
 7.0 | ############### |           7.0 |  #+++##########+|
 6.0 | ############### |           6.0 |  ##############+|
 5.5 | ####+       .## |           5.5 |  ##+######      |
 4.5 |                 |           4.5 |  #+.            |
```

Dal centro:
- x da −3,40 a +3,56: una striscia di 0,55–0,7 m lungo ciascuna riga laterale non si raggiunge;
- d da 5,5 a 11,32 m: gli ultimi 0,57 m prima del fondo e la parte davanti a 5,5 m non si raggiungono;
- 41% della metà campo, 78% oltre la riga del servizio;
- **incrociato profondo** (|x| > 2,6–3,1 m con d > 10 m): **irraggiungibile**, perché l'incrociato stretto viene accorciato;
- **stretto**: possibile solo tra 6,5 e 8 m dalla rete, fino a circa 3,4 m di lato;
- **lungolinea profondo**: fino a (3,5; 11,2) m, ma chiede 60–78 ms di ritardo oppure il piatto pieno.

Dal lato destro:
- incrociato fino a −3,0 m (stretto fino a 4,5 m dalla rete);
- lungolinea fino a +3,93 m.

Il rovescio dal lato sinistro è speculare.

## 5. «Campo aperto» e altre opzioni dello staff [V]

**Campo aperto** (OPEN_COURT, duo_rules:87; spento di base; solo stesso schermo con due telefoni, 213-223)
- Non cambia dove può andare la palla: cambia corsa e margini.
  - velocità ×0,6, rientro ×0,2, partenza +0,1 s;
  - finestra del tempo ×(1 − 0,8·allungo);
  - costo dell'allungo 0,6 invece di 0,4 (impact:243);
  - portata sulla palla non raggiunta 1,7 m (impact:250-253);
  - risposta al servizio a corsa piena; servizio che passa ogni 2 punti (233-239).
- Effetto: le palle angolate pagano di più e chi arriva in allungo manda più palle fuori.

**Altre opzioni che toccano direzione e margini**
- **Mira del telefono:** 17° / 20° / 23° per la mira piena (natpf_aim_level.js; stroke_intent:185).
- **Aiuto al più giovane:** finestra ×2, +0,1 s in ritardo, palla verso di lui più lenta (slowFor), il suo colpo +1 m più profondo (duo_rules:163-168, 255-268).
- **Scambio che si scalda:** palla più bassa, più carica e più veloce (hot_rally:22, 44, 53). Indirettamente stringe la finestra in ritardo di chi riceve.
- **Livello («Chi gioca»):** Bambino = Bambini, Ragazzo = Casual, Adulto = Evento con l'assistenza di Casual (natpf_who.js:14). Pro e Leggenda in «Altre impostazioni».
- **Ritardo dello schermo** (Maiusc+D) e **?ritmo=colmo|prima** (impact:123-129).

## 6. Webcam, mouse, tastiera [V salvo dove detto]

**Stessa catena?**
- **P1 nel singolare:** sì, ogni ingresso passa da `queueUserSwing` → `strokeOutcome` (game_engine:1569-1577, 2129), ma con l'intenzione ricostruita: forza = (speed − 0,8)/0,85, profondità = forza, rise da tabella, piatto = wrist o dirX con peso 0,7 (stroke_outcome:467-478). Latenza 0, salvo la webcam «movimento».
- **P1 nel doppio:** catena vecchia con sorteggi, anche dal telefono, perché natpfTau manca (2145-2215).
- **P2:** catena nuova solo con il telefono (2519-2542); webcam e tastiera del P2 usano la catena vecchia con sorteggi (2530-2593).

**Ingressi di direzione**
- **Webcam «argon»** (predefinita, motion_controls:29-34): dirX = velocità laterale della mano (webcam_argon_track:130-131), e il suo segno decide anche il lato. [D] Per il destro spinge sempre verso l'incrociato, di più con uno swing più veloce: non è una mira voluta.
- **Webcam «movimento»:** wrist 0 (motion_controls:776). Direzione solo dal tempo.
- **Mouse:** dirX = trascinamento/180, almeno 0,22, con il segno legato al lato (1669-1672). [D] Per il destro sempre verso l'incrociato: il lungolinea solo con il ritardo.
- **Tastiera:** ±0,55 per tasto, tornano a 0 lasciando i tasti (1573-1575, 1630-1638). Il lato viene dal segno (175-183). [D] Come il mouse: incrociato con il tasto, lungolinea solo con il ritardo. Spazio senza tasti = solo tempo.
- [D] Per il mancino con mouse e tastiera il verso si inverte.

## I 5 punti in cui la direzione del giocatore viene diluita di più (per peso)

1. **Il tempo pesa quanto il piatto** (aim = piatto + tempo, 318), con la finestra in ritardo 2–3,6 volte più stretta e uguale per tutti (438).
   - 4,1 cm/ms in ritardo e 2,0 cm/ms in anticipo, contro 0,21 m/° del piatto.
   - Tempo e piatto opposti si annullano.
   - [D] ±35 ms di tempo spargono un «dritto al centro» tra −0,94 e +1,84 m (p10–p90).
   - Peso: fino a ±3,1 m.
2. **Bordo morbido assistito e «scogliera»** (302, 320-321).
   - Da mira 1 a mira 2 il bersaglio si sposta di soli 0,41 m (3,59→4,00): la precisione vicino alla riga non viene premiata.
   - Poi, in 15 ms o in 0,05–0,1 di qualità, il bersaglio salta di 2 m (fino a 6,0). È la causa principale dei fuori.
3. **Riferimenti che si adattano.**
   - Ritmo: −0,8 × la mediana, fino a ±0,6 unità, cioè circa 2 m (228-241, 317).
   - Centro della mira: alpha 0,12, biasPull 0,3 (natpf_gestures.js:147-205).
   - Tolgono gradualmente la scelta ripetuta. B35a li sta modificando.
4. **Aria non corretta di lato** (skill:883): il rimbalzo vero copre l'85–88% dello spostamento laterale.
   - −0,35…−0,6 m sulle palle angolate.
   - Non si va oltre −3,40 / +3,56 m dal centro, né oltre −3,0 m in incrociato dal lato.
5. **Geometria fissa.**
   - Punto neutro a 0,4·hitX: fino a ±1,4 m.
   - Spinta naturale −0,1: il piatto da solo non arriva al lungolinea pieno.
   - Incrociato stretto accorciato fino a −1,8 m: nessun incrociato profondo.
   - Profondità decisa solo dalla forza, con la curva 0,7.

## Nota per chi progetta: interferenze con B35 [V]

B35a (ramo `b35-precisione-telefono`, commit e47d200 / 25a6174 / fb4ee73) modifica gli stessi punti:
- RHYTHM e strokeOutcome: ritardo abituale `rhythmLag`, `te` usato per excess, spinta e assistenza (stroke_outcome);
- AIM in natpf_gestures.js (biasDevTrusted 22, alphaTrusted 0,03);
- `natpf_phone_racket.js`, `natpf_trial_learn.js` e il segno del piatto in `swing-detect.js` e `swing-message.js`;
- game_engine.js:2351-2352.

B35b tocca game_engine.js solo nel banner (~1263).

B36 deve quindi partire dal codice con B35a già unito.
