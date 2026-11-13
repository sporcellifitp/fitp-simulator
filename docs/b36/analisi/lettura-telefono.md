# B36 · Lettura «telefono → segnali di direzione»

Base: `natpf-simulator` 6829d09 (2026-11-13.7). Nessun file del repository è stato toccato.
**[V]** = verificato nel codice (file:riga) o con uno script di prova. **[D]** = dedotto.
Gli script stanno in `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b36/agenti/`: `numeri-mira.mjs`, `sim-segnali2.mjs`, `sim-twist.mjs`, `centro-mira.mjs`, `centro-mira-b35a.mjs`. Usano il telefono simulato `test/phone-sim.mjs` + `arm-sim.mjs`: sensori ideali a 60 Hz, presa della foto, calibrazione rapida. **Nessun telefono vero.**
Le modifiche del B35a (ramo `b35-precisione-telefono`, non ancora in main) sono riassunte in fondo.

## 1. Dati grezzi e calcoli sul telefono

**Sorgente unica:** `DeviceMotionEvent`, convertito in un campione con questi campi [V swing-detect.js:481-490, racchetta.js:387-390]:
- `t`: `e.timeStamp` in ms;
- `rot`: [α(z), β(x), γ(y)] in °/s;
- `acc`: accelerazione senza gravità, m/s²;
- `accG`: accelerazione con gravità, m/s².

Non si usano `deviceorientation`, bussola o Generic Sensor API [V grep]: l'imbardata non ha un riferimento assoluto [V face-tracker.js:7-9]. La gravità si ricava come `accG − acc` [V swing-detect.js:263,277].

**Frequenza:** quella del browser, circa 60 Hz. Misurata: 59,9 Hz di mediana, p99 17,3 ms (NATPF_DIAGNOSI_2026-10-23.md:46; NATPF_RACCHETTA_VIRTUALE.md:247). In risparmio energetico ci sono telefoni a 30 Hz (NATPF_GESTI_E_LATENZA.md:186). Il telefono la misura e la manda nel campo `hz` [V racchetta.js:399].

**Prima del rilevatore:**
- Segno dell'accelerazione portato a quello di Android: iPhone −1 dal nome del browser, confermato da 4 tocchi [V motion-sign.js:12-44].
- Deriva del giroscopio presa dal passo «fermo» solo se ≤1,5 °/s, altrimenti 0 [V swing-detect.js:42,316-329].
- **Con «Giocando» (la calibrazione di base) e con «Nessuna»** il comando `skip` chiude subito il passo fermo («forced»). Quindi la deriva resta sempre [0,0,0] e la gravità viene dai pochi campioni già arrivati [V natpf_phone_racket.js:844,926 → racchetta.js:470 → calibration.js:325-327 → swing-detect.js:467,319].

**Flussi verso il computer:**
- **`sw`**, uno per colpo, in 4 copie (3 sul percorso veloce, 1 su quello affidabile), deduplicate con `n` [V racchetta.js:483-495; link.js:155-166].
- **`fo`**: yaw/pitch/roll del piatto, nello stesso riferimento di `fh`. In LAN a ogni campione, via internet ogni ≥33 ms. Il computer ne tiene solo l'ultimo [V racchetta.js:413; link.js:171-177].
- **Binario** da 52 B a 40 Hz (rot, acc, accG, seq, t), solo in LAN. Serve solo alla presentazione [V sensor-packet.js:2; racchetta.js:394-397; racket-motion.js:1].
- **`sm`**: solo giroscopio, 30 Hz, via internet e solo prima che il piatto sia pronto [V racchetta.js:418-420].
- **`rs`**: tutti i campioni grezzi, solo se il computer manda `cfg diag:1`. Effetto collaterale: sul telefono compare il pulsante «Segna» [V racchetta.js:402-405; phone-screen.js:65; diag_recorder.js:98,356].
- **`pr`**: la preparazione [V racchetta.js:503].

**Calcoli sul telefono:**
- Rilevatore del colpo (§2).
- Filtro d'orientamento: quaternione integrato dal giroscopio, con correzione dell'inclinazione dalla gravità (kp 2,2) solo quasi fermo: |a−9,81|<1,8, lineare <1,5, rotazione <120 °/s [V face-tracker.js:107-133].
- A ogni colpo: `strokeFace`, `headAt`, `strokeShape` [V racchetta.js:46], `classifyGesture` [V gesture-intent.js:15-52] e `aimFromFace` [V swing-message.js:15].

## 2. Riconoscimento del colpo e istante dell'impatto

**Sul telefono:**
- Il colpo è il picco della velocità di rotazione, con media mobile 0,55. Soglie: inizio, picco minimo, ampiezza minima, durata 30–700 ms, tutte scalate sul proprio colpo; più basse a rete [V swing-detect.js:18-72,193-201,280-288].
- Istante dell'impatto = vertice della parabola sui 3 campioni grezzi, usato se dista ≤60 ms dal massimo della media [V 266-273,354].
- Il colpo parte quando la velocità grezza scende sotto l'88% del picco (o due campioni sotto il 97%), oppure dopo 40 ms di plateau [V 287-288].
- Gesto verticale `vt` (up/down/v): asse con |cos| con l'alto ≤0,6 e lungo l'asse del colpo ≤0,45 [V 101,109-115].
- La classe del telefono (drive/lob/slice/drop, con potenza 0,3–1) arriva al computer ma, con la forma del colpo, conta solo nel gioco con i tocchi [V gesture-intent.js:15-52; swing-detect.js:387; natpf_phone_racket.js:255].

**Sul computer:**
- Il tipo di colpo viene dalla forma: `strokeIntent` → `classifyStroke`, più i prototipi personali → topspin, flat, slice, drop, lob, smash [V natpf_stroke_intent.js:107-145,212-234].
- La volée non è un gesto: la decide il movimento automatico. Il servizio lo decide la fase del motore (PROJECT_MEMORY.md:73-77). La schiacciata viene da forma + palla alta + `smashAt` [V natpf_stroke_outcome.js:486-495].
- [D] Escludere palla corta e volée nel B36 si può fare tutto sul computer.

**Istante sul computer:**
- `pk` passa all'orologio del computer con un allineamento tipo NTP (il giro migliore tra gli ultimi 12) [V link.js:164; input-time.js:45-51; pairing.js:76-90]. Misurato: viaggio p50 9 ms, residuo 0,8 ms (NATPF_DIAGNOSI_2026-10-23.md:51).
- Latenza = adesso − istante del colpo + ritardo dello schermo (0 se non misurato), tra 0 e 0,3 s [V natpf_phone_racket.js:268].
- `natpfTau = ttc + lat` (+ = anticipo) [V natpf_impact.js:409]. Lo swing aspetta che la palla arrivi al punto d'impatto e si gioca con il suo tempo vero [V natpf_impact.js:435,459-491].
- La posizione di chi colpisce la decide il movimento automatico (palla a 0,72 m di lato e 0,35 m avanti) [V natpf_impact.js:32; natpf_stroke_outcome.js:458]. Il «punto d'impatto» quindi oggi è solo il tempo.

## 3. Grandezze che descrivono la direzione orizzontale

### Sul telefono

**a) `dir` (+1 da destra a sinistra / −1 / 0)** [V swing-detect.js:333-351,120-147]. Si decide in quest'ordine:
- prodotto tra asse al picco e asse di calibrazione: oltre +0,25 → +1, sotto −0,25 → −1;
- altrimenti rotazione attorno alla verticale (|cos| ≥0,5);
- altrimenti rotazione netta `turn`: ≥20% del percorso (30% con asse quasi orizzontale), con `weakRefMin` 0,1;
- con il profilo semplice: `absSign·(netTurn(.2) || verticalTurn(.35))`.

Il segno si corregge con i voti: 4 colpi, ≤25% d'accordo, contrari da tutti e due i lati. Negli scambi di prova i voti sono spenti [V 413-423; racchetta.js:274].

**b) `tw`** = `canonicalTwist`: proiezione dell'asse al picco su (asse di calibrazione × alto), moltiplicata per `dir`. È un numero puro [V gesture-intent.js:6-10; swing-detect.js:360].
- Senza calibrazione il riferimento è l'asse x del telefono.
- Nel simulato |asse × alto| = 0,51 per tutte le prese: dipende dalla pronazione dei gesti di calibrazione [V sim-twist].

**c) `a`**, mira del gesto = clamp(−dir·(0,4 + 0,15·(ampiezza_rel − 1)) + twist_rel·1,6, ±1) [V gesture-intent.js:29-34,50].

**d) `fy` / `fa`**:
- `fy` = rotazione di tutto il telefono attorno alla verticale (scomposizione swing-twist) tra l'istante più fermo, cercato tra 900 e 60 ms prima dell'inizio del colpo, e il picco; meno `faceRef[dir].yaw` della calibrazione.
- `fa` = tanh(fy/40); oltre 80° si manda `fu` (non credibile).
- [V face-tracker.js:154-172,59-67; swing-message.js:15,20]

**e) `fh`** = imbardata all'impatto (interpolata al picco) **meno la posa «pronto»** `readyYaw` [V face-tracker.js:126,128,156,175-184; racchetta.js:39; swing-message.js:23].
- La posa «pronto» segue il telefono quando resta sotto 25 °/s per più di 400 ms, con costante di tempo 2,5 s.
- **Quindi `fh` non è assoluta.**

**f) `sh[0]`**: piano dello swing (asse rispetto alla verticale negli ultimi 110 ms) [V stroke-shape.js:57-58].

**g) Calcolati sul telefono ma non mandati:** `turn`, `along`, `axis`, `base`/`baseRate` [V swing-detect.js:392-393 contro swing-message.js:18-26; face-tracker.js:171].

### Sul computer

**h) `learner.sign`** (scambi di prova): gira `dir`, `a` e `tw`. In main **non** gira `fh` [V natpf_phone_racket.js:765; natpf_trial_learn.js:124-131].

**i) Centro della mira per verso** (`createAimModel`, costanti in natpf_gestures.js:147-148, codice in 152-207):
- seme = `faceRef[dir].heading`; con «Salta» e «Nessuna» non c'è seme;
- i primi 2 colpi lo correggono di 0,35 dello scarto (se sotto 10°);
- verifica dopo 4 colpi: oltre 35° si prende la mediana;
- poi segue i colpi vicini (sotto 10°) di 0,12 e gli altri di 0,03;
- dal 10° colpo: se la mediana degli ultimi 12 è oltre 12°, si sposta di 0,3 dello scarto;
- dritto e rovescio dalla stessa parte oltre 8°: tutti e due i centri si spostano di 0,3;
- senza seme il centro nasce dopo 3 colpi [V 169];
- insegnano solo i colpi normali e non deboli dello scambio [V natpf_phone_racket.js:209,796];
- un nuovo collegamento senza «Ricollega» azzera il centro senza seme [V 550].

**j) `heading.dev`** = fh − centro (°); `heading.aim` = tanh(dev/22), null oltre 80° [V natpf_gestures.js:201-205].

**k) `intent.face`** = segno·clamp((|dev|−3)/(aimFull−3)) × fiducia, con fiducia = 1 − clamp((|dev|−45)/15) [V natpf_stroke_intent.js:53,63,196-201,232].
- `aimFull` vale 17°, 20° o 23° (alta/media/bassa): opzione dello staff [V 185; natpf_aim_level.js:10-18].
- **È l'unico segnale di mira del gesto che arriva all'esito del colpo.**

**l) Esito, `strokeOutcome`** [V natpf_stroke_outcome.js:24-67,228-241,257-259,292,317-320]:
- aim = −c·0,1·(1−|aimT|) − c·aimT + face;
- aimT = clamp(t − ritmo, ±1);
- t = anticipo/span (se in anticipo) oppure /lateSpan (se in ritardo);
- ritmo = mediana degli ultimi 8 colpi × 0,8, entro ±0,6 unità, da 4 colpi;
- x = x0 + aim·(3,65 ∓ x0), con x0 = 0,4·hitX;
- oltre la finestra si aggiunge −c·sign(t)·eccesso·pushOut;
- bordi morbidi tra 3,1 e 4,0 m con l'assistenza;
- c = ±1 dal lato del colpo e dalla mano [V game_engine.js:2331].

**m) Ampiezza della finestra (span)** [V natpf_skill.js:24,36,93,114; natpf_stroke_outcome.js:215,221,438]:

| livello | span |
|---|---|
| Casual | 0,2 s |
| Pro | 0,15 s |
| 1v1 | 0,17 s |
| Bambini | 0,28 s |
| Leggenda | 0,115 s |

Si moltiplica per un fattore delle palle lente (fino a ×1,8). In ritardo vale `lateSpan` = clamp(1,4/|vz|, 0,05, span).

**n) `wrist`** (`aimFromSignals`, natpf_gestures.js:284-290) e **`dirX`** (= `a`): con la forma del colpo **non** entrano nell'esito. Servono a:
- diagnostica (`mira`) e riscontro dell'allenamento [V natpf_training.js:63; diag_recorder.js:414];
- animazione e lato di riserva [V natpf_phone_racket.js:241,266-267];
- `eventIntent` solo quando manca l'intenzione [V natpf_stroke_outcome.js:475].

**o) Servizio:** dx = (−plane·1,5 + face·0,8)·qualità [V natpf_stroke_outcome.js:589].

### Mancino [V]
- Sul telefono la mano cambia solo l'ordine dei gesti e le scritte [V calibration.js:21-23].
- Sul computer il dritto del mancino è il verso −1 [V natpf_phone_racket.js:242] e c segue il lato del colpo, mano compresa [V game_engine.js:2331]: anticipo e ritardo si specchiano.
- Il piatto è nel riferimento del campo (+ = destra) per tutte e due le mani [V natpf_gestures.js:37-38].

### Calibrazione [V]
- **Con i gesti, rapida:** un dritto e un rovescio a vuoto. Danno asse, deriva, gravità e `faceRef` (la «mediana» di **un** gesto), che fa da seme al centro [V calibration.js:13-23,159-186,220-253; natpf_phone_racket.js:626]. Dalle diagnostiche: centro lontano dai colpi veri 25–30°, fino a 150° [V natpf_gestures.js:122-125].
- **Scambi di prova (B28):** 4–6 palle, 2 colpi normali per lato. Il lato della palla vota il segno. Il centro prende la mediana circolare delle `fh` dei colpi normali e non deboli (almeno 1 per verso) [V natpf_trial_learn.js:78-79,124-138,175-194; natpf_phone_racket.js:886].

## 4. Dove la direzione continua si perde o va a gradini

1. **`dir` è binario** e decide insieme il centro, il lato e il segno di c. Un verso letto male specchia l'effetto del tempo [V natpf_phone_racket.js:246,260; game_engine.js:2331].
2. **Con `dir` = 0 non c'è mira dal piatto** (gesti verticali, servizio verticale): `aim(0)` = null → `intent.face` = 0, la direzione la decide solo il tempo [V natpf_gestures.js:202; natpf_stroke_intent.js:197].
3. **Senza seme** (Salta, Nessuna, verso solo parziale negli scambi di prova, pagina ricaricata): i primi 3 colpi per verso senza mira dal piatto [V natpf_gestures.js:169,201; natpf_phone_racket.js:550,626].
4. **Curva della mira** [V numeri-mira]: 0–3° → 0; 10° → 0,50; 15° → 0,86; da 17° a 45° → 1 (tutto uguale); 50° → 0,67; 55° → 0,33; **da 60° in su → 0**. Non è monotona.
5. **Il centro assorbe le mire tenute** [V centro-mira, sequenze senza rumore]:
   - +8° tenuto → 0 dal 4° colpo;
   - +15° → 0,49 al 15° colpo, 0 al 25°;
   - +25° → pieno per 10 colpi, 0 dal 21°;
   - dritto e rovescio tutti e due a +15° → crolla al 7° colpo;
   - 5 colpi mirati a +15° e poi 5 normali → **i normali valgono −0,45** (mira fantasma dall'altra parte).

   Il codice stesso dice che mira tenuta e riferimento sbagliato «non si distinguono» [V natpf_gestures.js:145-146].
6. **Somma e saturazione** [V numeri-mira, Pro, palla a 20 m/s]:
   - tempo e piatto nello stesso verso → 3,99–4,00 m (bordo compresso);
   - versi opposti si annullano: t +1 con piatto +1 → x = 0.
7. **Spinte non volute** [V natpf_stroke_outcome.js:24,45,67,257,336]:
   - −c·0,1 sposta di −0,36 m ogni colpo con tempo neutro;
   - x0 segue la palla (0,4·hitX);
   - l'incrociato oltre 3,2 m si accorcia verso 6 m.
8. **La profondità non ha un comando suo**: forza × (0,8 + 0,2·ampiezza) [V natpf_stroke_intent.js:229].
9. **Tempo asimmetrico:** a Pro, con palla a 20 m/s, 1 unità vale 150 ms in anticipo ma 70 ms in ritardo. 10 ms valgono 0,24 m in anticipo e 0,52 m in ritardo. «Perfetto» va da −24 a +52 ms [V calcolato; natpf_skill.js:314].
10. **Mira mostrata ≠ mira usata:** `wrist` (tanh(dev/22)) contro `intent.face`.

    | scarto | `wrist` | `intent.face` |
    |---|---|---|
    | 10° | 0,43 | 0,50 |
    | 50° | 0,98 | 0,67 |
    | 70° | 1,00 | 0 |

    [V numeri-mira; diag_recorder.js:414,423]
11. **Scartati sul telefono:** `turn`, `axis`, `along`, `base`; `fu` oltre 80° [V face-tracker.js:65].
12. **A rete:** dispersione deterministica dal «seme» fino a 1,2 m: per chi gioca sembra caso [V natpf_stroke_outcome.js:118,155-165,300,319]. C'è anche un percorso di riserva senza `natpfTau` che usa `landingScatter` con dispersione casuale [V game_engine.js:2150; natpf_skill.js:362-366].
13. **Documenti indietro:** PROJECT_MEMORY.md:83-91 dice «il tempo pesa di più» e mira piena a 23°. Nel codice tempo e piatto pesano 1 tutti e due (natpf_stroke_outcome.js:27,36) e la mira piena di base è 17° (natpf_stroke_intent.js:53,185).

## 5. Rumore e affidabilità

- **Deriva dell'imbardata:** nei tratti fermi dei browser misurata 0,1–1,5 °/s (NATPF_RACCHETTA_VIRTUALE.md:97-100). Con «Giocando» non si toglie (§1).
  - [D] Fino a ~10° ogni 10 s di movimento continuo; la recuperano la posa «pronto» (solo da fermi) e il centro della mira.
- **Memoria della posa «pronto»** [V sim-segnali2]:
  - corpo girato di 20°, fermo 0,3 s → Δfh 18–22°; fermo 1 s → 16,6°; 2 s → 11,5°; 4 s → 5,2°;
  - dopo 3 s fermi girati e ritorno al centro, il dritto normale legge −11,6° (0,3 s dopo), −9,0° (1 s), −5,7° (2 s), −2,9° (4 s): **una mira fantasma fino a circa 0,6, cioè circa 2 m**.
- **Ripetibilità** [V sim]:
  - stesso dritto con tremolio diverso → 0,9–2,4°;
  - gesto ×0,6…×1,4 → Δfh da +4,3 a −1,5°: circa 6° legati alla velocità, circa 1,5 m.
- **Presa e polso:**
  - la pronazione attorno all'avambraccio (0–700 °/s) sposta `fh` di 1,4°, ma `tw` di −0,30 e `a` di −0,51 [V sim];
  - il rollio del telefono attorno al proprio asse lungo inclinato entra in `fh` circa per il coseno dell'inclinazione: misurato 40° con la presa a 65° → 17,5° (archivio WORK_PROGRESS_fino_al_2026-11-04.md:699-702) [D].
- **Swing-twist su dati veri:** dispersione dimezzata, direzioni oltre 60° da 36 a 11 (archivio :699-702). Prima: 26 mire su 67 sature (NATPF_DIAGNOSI_2026-10-23.md:130-140).
- **Gesti molto ampi:** oltre 130° l'imbardata è poco ripetibile (NATPF_GESTI_E_LATENZA.md:182). `fy` da sola «satura e cambia segno» nei colpi completi (NATPF_RACCHETTA_VIRTUALE.md:93-96).
- **Percorso della mano dall'accelerometro:** inaffidabile a 60 Hz con 1000–1700 °/s (stroke-shape.js:20-21; NATPF_RACCHETTA_VIRTUALE.md:262-266).
- **Telefono capovolto** (stroke-shape.js:33,52) e **segno dei sensori:** in main `fh` resta specchiata quando il segno si gira [V B35a fb4ee73].
- **Saturazione del giroscopio:** il codice non la gestisce [V grep], e i dritti veri arrivano a 1200–1650 °/s (natpf_stroke_intent.js:49) [D: da verificare sui telefoni].
- **Tempo:** la misura è buona; il rumore è umano. Il banco «persona vera» usa tempo +0,35 ± 0,45 unità e piatto ±12° (colpi.mjs:200); senza nessuna mira voluta dà x p10/p90 = −3,24/+3,58 m (natpf_stroke_intent.js:57-61).
  - [D] σ ≈ 1,6 m dal tempo e ≈ 2,3 m dal piatto: **il rumore copre quasi tutta la larghezza utile**.
  - Uno schermo in ritardo e non misurato manda tutto verso il lungolinea.
- **Sensibilità:** 1° di piatto ≈ 0,26 m (PROJECT_MEMORY.md:653).
- **Dati veri:** nel repository non ci sono registrazioni di telefoni veri (NATPF_RACCHETTA_VIRTUALE.md:32). Il registratore della diagnostica può raccoglierle (`rs`).

## 6. Segnali nuovi

### Senza cambiare la pagina del telefono

1. **Posa e arco separati.** base ≈ fh − (fy + faceRef[dir].yaw) [V sim]:
   - pre-rotazione → Δfy 0 e Δfh ≈ −rotazione;
   - impatto spostato nell'arco → Δfy = spostamento ±0,1°, Δfh = spostamento ±1,5°;
   - `fy` non ha la memoria della posa «pronto».
   - **Affidabilità: media** (gesti ampi; serve un istante fermo prima del colpo).
2. **Rotazione attorno alla verticale all'impatto ≈ v·plane**, per legare l'errore di tempo ai gradi di piatto. Misura buona, effetto sul gioco da provare [D].
3. **Anticipo/ritardo:** già usato; si può separare il ritardo fisso. Misura buona, ma chi gioca non lo controlla con precisione (σ 0,45 unità).
4. **Storia del piatto da `fo`** (traiettoria e accompagnamento dopo il picco). Via internet circa 30 Hz (33° tra un campione e l'altro a 1000 °/s), con perdite; in LAN circa 60 Hz. Per i colpi in ritardo aggiunge latenza. **Bassa–media**, nessun dato.
5. **Traslazione della racchetta** dal binario in LAN o da `rs`: **bassa** (§5).
6. **Ampiezza `an` e durata `dur`:** dipendono dalle soglie del rilevatore (swing-message.js:12-14). **Bassa–media.**
7. **`tw` e `a`:** misurano la pronazione, non la direzione (−0,30 contro ±0,08 con 20° di corpo girato). Per la direzione no.
8. **Contesto della palla** (posizione, altezza, velocità): lo conosce il motore, ma non è un gesto.

### Cambiando la pagina del telefono

9. **Mandare `base`, `baseRate`, `turn`, `along`** (già calcolati, pochi byte). **Alta** rispetto al costo.
10. **Imbardata senza la posa «pronto»** accanto a `fh`, oppure altri `quietHold`/`relax`: toglie la mira fantasma ma riporta la deriva. **Media**, da misurare.
11. **Imbardata a −60/−30/0/+30 ms e ω nel riferimento di riposo:** arco e verso del moto senza latenza. **Media.**
12. **Spezzone grezzo di ±300 ms per colpo**, oppure `rs` senza il pulsante «Segna»: per l'analisi su telefoni veri. **Alta come strumento.**
13. **Sensori a 100–120 Hz** (Generic Sensor API, solo Chrome per Android; «da provare», NATPF_GESTI_E_LATENZA.md:230). **Media**; non su iPhone.
14. **Bussola** per un'imbardata senza deriva. [D] Al chiuso, vicino a metallo e ledwall, poco affidabile: **bassa–media**, da provare.

## B35a in corso (non in main)

[V `git show fb4ee73` e diff non committato nella sua worktree]
- `fh` e `face.yaw` si girano insieme al verso: `signedSwing` e campo `sg` nel messaggio.
- Seme degli scambi di prova «trusted» (`alphaTrusted` 0,03, `biasDevTrusted` 22). Effetto [V centro-mira-b35a]:
  - +15° tenuto vale ancora 0,23 al 30° colpo;
  - i colpi normali dopo 5 mirati valgono −0,05…−0,13;
  - +8° resta assorbito in 3 colpi e la pendenza comune di dritto e rovescio resta.
- Ritmo con il «ritardo abituale» in secondi (al massimo 0,1 s).

**Il B36 deve partire da qui.**

## Tabella

| grandezza | dove nasce | dove finisce nel gioco | limiti |
|---|---|---|---|
| `dir` ±1/0 | swing-detect.js:333-351 | lato, c, centro per verso (natpf_phone_racket.js:246,260; game_engine.js:2331) | binario; 0 = niente piatto; errore = tempo specchiato |
| `natpfTau` (anticipo) | swing-detect.js:266-273,354 → link.js:164 → natpf_impact.js:409 | t/aimT peso 1, voto, qualità, spinta fuori (natpf_stroke_outcome.js:292,317-319) | 150/70 ms per unità; rumore umano ±0,45 unità; ritardo dello schermo |
| ritmo | natpf_stroke_outcome.js:228-241 | aimT = t − ritmo | ±0,6 unità, da 4 colpi |
| `fh` | face-tracker.js:126-156; swing-message.js:23 | centro della mira → dev → `intent.face` | memoria della posa «pronto» fino a ~12°; deriva; in main non si gira con il segno |
| centro della mira | natpf_gestures.js:152-207 | dev | assorbe le mire tenute; pendenza comune; niente seme con Salta/Nessuna |
| `intent.face` | natpf_stroke_intent.js:196-201,232 | aim peso 1; servizio ×0,8 m | zona morta 3°, piena a 17/20/23°, cala tra 45° e 60°, poi 0 |
| `aimFull` | natpf_aim_level.js:10-18 | `faceAimFromDev` | opzione dello staff; cambia solo la pendenza |
| `fy`/`fa` | face-tracker.js:154-171 | `wrist` di riserva, diagnostica | satura nei gesti ampi; serve un istante fermo |
| `tw` | gesture-intent.js:6-10 | `wrist` (fonte twist), `a` | misura la pronazione |
| `a` | gesture-intent.js:50 | `dirX`: animazione, lato di riserva | fuori dall'esito con la forma |
| `wrist` | natpf_gestures.js:284-290 | allenamento, diagnostica | curva diversa da `intent.face` |
| `plane` | stroke-shape.js:57-58 | tipo di colpo; servizio −plane·1,5 m | non è direzione nello scambio |
| hitX, natural, pushOut, bordi, incrociato corto | game_engine.js:2332; natpf_stroke_outcome.js:24,45,57,67 | x finale | spinte e compressioni non volute |
| `learner.sign` | natpf_trial_learn.js:124-131 | gira `dir`, `a`, `tw` | `fh` solo con il B35a |
| `strokeSeed` (rete) | natpf_stroke_outcome.js:155-165 | dispersione fino a 1,2 m | sembra caso |