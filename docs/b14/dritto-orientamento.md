# Dritto: la traccia dell'orientamento (B14, agente D, 08/11)

> **Stato all'integrazione (08/11, natpf-simulator):** il codice del ramo `b14-d` **non è stato integrato**. La verifica
> indipendente ha trovato nella versione «verde» (16689b4, coreografia dell'indagine A) un errore nuovo che i test non
> coprivano: con le prese di chi imita con la cima 50° verso l'interno e 25° o 40° in avanti, a 1,2× e 1,25×, il dritto è
> letto tagliato (anche il lungolinea a 50/25), e la salita della racchetta letta all'impatto quasi sparisce
> (+0,10…+0,13 → +0,03/+0,07/−0,17). Il guadagno visivo era solo la fine tenuta. Anche la «PROPOSTA» su
> `test/pose-sensors.mjs` (quattro dritti al modello del gioco prima delle schede con la mira) non è integrata: serve solo a
> un dritto con lo schermo verso la rete e indebolirebbe la guardia «primo tentativo dopo una calibrazione diversa».
> Il candidato «da manuale» (§2, `docs/b14/dritto-lungo.over.json`) resta un dato di studio: nella copia di verifica
> fallisce anche fedeltà a 1× (presa a martello, calibrazione con l'animazione: fine carica di lungolinea e piatto letta
> come rovescio), oltre alle regole del disegno e alla durata (~4 s).

Obiettivo: il dritto (e piatto, lungolinea, incrociato) che si legga da manuale. La revisione C aveva trovato il vero
difetto: in carica la cima del telefono (= testa della racchetta virtuale di stroke-shape.js, 0,45 m lungo la cima)
punta **alla rete**, all'impatto palmo e schermo guardano **indietro** verso chi gioca e la testa si muove a ~90° dalla
rete (tergicristallo / sciabolata). Qui: cosa si è ottenuto dentro i test di oggi, cosa serve per il dritto da manuale,
e perché (file e righe, numeri misurati).

Misure (destro, presa nel palmo; campo x a destra, y in alto, −z verso la rete), strumento `fix-d/d/dm.mjs`:
angoli dalla direzione della rete (0,0,−1); «testa» = punto a 0,45 m lungo la cima.

## 1. Versione nei test di oggi (commit sul ramo b14-d, tutto verde)

| | B13 (04a702d) | **b14-d** (16689b4) | obiettivo del compito |
|---|---|---|---|
| cima in carica | 17° (verso la rete) | 15° | ≥ 100° (130–150) |
| mano più bassa del contatto prima dell'impatto | 3,7 cm | 1,3 cm | 15–25 cm |
| schermo/palmo all'impatto | 127° | 112° | ≤ 45° |
| velocità della mano all'impatto | 57°, sale 0,18 | **33°**, sale 0,15 | ≤ 35°, sale |
| velocità della testa all'impatto | 94° | 80° | ≤ 40° |
| fine | (−0,15; 1,45; −0,36) ferma 0,15 s* | (−0,07; 1,41; −0,40) **ferma 0,39 s** | ≥ 1,40 m, a sinistra della testa, 0,3–0,4 s |

\* «ferma» = telefono sotto 30 °/s attorno alla fine (la revisione C misurava ~0,03 s di posa davvero ferma).

Cosa contiene: la coreografia della mano verso la rete dell'indagine A (ramo b14-dritto-a, verificata), più tre opzioni
generiche spente di serie: `fin` (fermo nella posa finale), `backFlat` (ritorno con un tratto a velocità costante: picco
più basso a parità di durata) e `AIM_TURN.at` (rotazione della mira per posa chiave). Il dritto usa fin 0,3 s, ritorno
0,5 s con backFlat 0,3. Test della fisica del dritto: mano ≤ 35° dalla rete (era 60°), fine ferma 0,3–0,5 s.
Prove: gioco 891/891, sito 195/195, fotogrammi nel browser 31/31, modale 18/18.

**È un miglioramento, non il dritto da manuale**: dall'alto (fogli `strobe`) la racchetta virtuale punta ancora alla
rete in carica e all'impatto (un affondo), lo schermo guarda indietro. Il motivo è al §3.2: dentro i test di oggi non si
può fare meglio senza toccare la calibrazione del braccio simulato.

## 2. Il dritto da manuale (candidato, `docs/b14/dritto-lungo.over.json`, NON nel modulo)

Costruito con la cinematica inversa (pose chiave con l'orientamento voluto) e ottimizzato con i vincoli veri del
riconoscimento (fix-d/d/cfg-d.mjs, cfg-f.mjs). Carica a strati con plateau (ov 0,05, flat 0,25), contatto a 1,70 s,
ciclo 4,0 s, fermo finale 0,3 s, ritorno 1,55 s a velocità costante.

| | dritto | piatto | lungolinea (−13°/−9°) | incrociato (+12°/+10°) |
|---|---|---|---|---|
| cima in carica | **116°** | 124° | 136° | 95° |
| busto a fine carica | −30° | −31° | −43° | −19° |
| calo prima dell'impatto | **13,7 cm** | 12,3 cm | 14,3 cm | 12,9 cm |
| contatto (polso) | (0,49; 1,06; −0,26) | (0,47; 1,03; −0,30) | (0,55; 1,06; −0,11) | (0,39; 1,06; −0,38) |
| schermo/palmo all'impatto | **2°** | 5° | 21° | 22° |
| mano all'impatto | **31°**, sale 0,31 | 30°, sale 0,16 | 20° | 46° |
| testa all'impatto | **19°** | 19° | 12° | 36° |
| cima all'impatto | a destra (24° da +x) | a destra | destra-indietro | destra-avanti |
| fine | (−0,07; 1,48; −0,44), ferma 0,49 s | (0,01; 1,25; −0,58) bassa davanti | | |

Picchi e ampiezze: dritto 717 °/s, 86,4° (test 650–720, 85 ± 3), carica 176 °/s, ritorno 146 °/s; piatto 1016 °/s,
112,2° (950–1150, 110 ± 3), salita del palmo 0,074 e del martello 0,007 (finestre del piatto [0,04; 0,24] e
[−0,08; 0,037]). Sequenza: busto −7,5 ms dalla mano (piatto −15,8 ms), rapporto busto/mano 0,76.

Letture vere (telefono simulato completo, d/try.sh nella copia tt-d): dritto letto top spin con picco al contatto per
entrambe le mani, prese (palmo, martello) e calibrazioni a 1×; natpf-racchetta 26/26; lungolinea e incrociato con la mira
giusta (cal=pose +0,59 / −0,79; cal=arm +0,63 / −0,77 con la PROPOSTA del §3.2).

Come si legge (fogli in scratchpad/b14/d-sheets/lungo con una camera dietro-alta [0; 0,574; 0,819], e strobe dall'alto):
dall'alto la racchetta è distesa dietro a destra in carica, **parallela alla linea di fondo all'impatto** con la mano
davanti al fianco destro, e finisce avanti a sinistra; da dietro la mano scende sotto la palla, sale attraverso il
contatto verso la rete e finisce alta davanti alla spalla sinistra. Debolezze: in carica il braccio è basso e quasi teso
(una carica «dritta indietro e bassa», non il cappio alto); la fine è davanti alla spalla sinistra con la cima in avanti,
non avvolta sopra la spalla (la rotazione dopo l'impatto è limitata a ~55–60° dall'ampiezza 85 ± 3 in ±130 ms); la
scheda dura 4 s (era 2,25).

## 3. Cosa blocca il candidato (in ordine) e perché

### 3.1 Tempo della carica (vincolo vero) e durata della scheda (scelta del B9)
Il telefono deve girare **~165°** dalla posizione di partenza approvata (schermo verso chi gioca, cima avanti e verso
l'interno) all'impatto da manuale (cima a destra, schermo verso la rete); la parte veloce ne può fare solo ~45° prima del
contatto (picco 715 °/s con ampiezza 85 ± 3 in ±130 ms), quindi la carica ne fa **120–150°** (percorso del telefono
con l'interpolazione articolare, d/bcsearch.mjs). Il limite vero della carica è la soglia dei gesti speciali della
calibrazione rapida (site/js/tennis/gesture-intent.js:64, 0,28 × colpo di calibrazione ≈ 164–184 °/s) **anche
nell'imitazione a 1,25×**: carica ≤ ~140 °/s e ritorno ≤ ~130 °/s a 1×. Misurato: con la carica a 176 °/s e il ritorno a
146 °/s il candidato è letto bene a 1×, ma a 1,25× con la presa a martello la fine della carica (188 °/s) e il ritorno
(181–183 °/s) diventano un secondo colpo (test natpf-gesture-anim 4). Dentro il contatto a 1,03 s (natpf-gesture-pose
LIMITS.forehand: contatto 1,03 ± 0,01, ciclo 2,25 ± 0,1) la carica dura 0,8 s: al massimo ~80° di telefono (cima
verticale, schermo a ~53° dalla rete all'impatto: d/bcsearch2.mjs). Il contatto e il ciclo sono un riferimento del B9
(«cicli indicativi»), nessuna lettura ne dipende: il dritto da manuale chiede ~4 s di scheda (o 4,3–4,5 s con la carica
a 140 °/s).

### 3.2 Calibrazione del braccio simulato e mira (scoperto qui: era il vincolo nascosto del B13)
Con cal=arm la calibrazione rapida la fa test/arm-sim.mjs armSwing, che gira il telefono attorno alla verticale partendo
dalla posizione di partenza della scheda: all'impatto **lo schermo guarda indietro, verso chi gioca**. Il centro della
mira del piatto (createAimModel, seminato da faceRef della calibrazione) è quindi a ~165–180° da un dritto con lo schermo
verso la rete: la mira diventa «non credibile» (oltre faceTrust + span = 60°), il gioco ripiega sui tempi
(natpf.wrist 0) e lungolinea/incrociato falliscono solo con cal=arm. readCard faceva tre dritti prima della scheda «come
in partita» ma non li passava al computer (p.game), e il gioco verifica il centro dopo quattro colpi (AIM.verify = 4).
**È per questo che i dritti B13 e A tengono lo schermo indietro all'impatto**: con lo schermo verso la rete la mira con
cal=arm non può funzionare. PROPOSTA efd0f43: i quattro dritti prima della scheda arrivano al computer come in partita
(verde anche con la versione di oggi).

### 3.3 Vincoli del disegno (B9) e camera
Con la carica distesa l'avambraccio spazza ~135° nel piano orizzontale (da dietro-destra a sinistra) e il telefono gira
di ~300° nel ciclo: nessuna camera fissa passa insieme «telefono ≥ 25° dal taglio nelle pose chiave», «avambraccio
≥ 28° dal raggio visivo» e «≥ 60 px a 448×280» (griglia su azimut −180…165°, elevazione 5–65°, d/camgrid.mjs: 0 su
168; la migliore, dietro e alta 35°, ha il telefono a 25° alla fine a 200×200 ma «avanti» e «in alto» a 6° sullo
schermo e il quadro che esce). Un'ottimizzazione con la camera dietro-sinistra (az −30°, el 22°) nel costo arriva a
27,8°/27,7° (quasi nei vincoli) ma perde il calo (8,5 cm) e la salita del palmo (0,015 < 0,03 del test natpf-racchetta).
Servirebbe una camera che cambia direzione nel colpo (natpf_gesture_demo.js, di un altro agente) o il fantasma della
racchetta che porta l'orientamento del piatto.

### 3.4 Rotazione dopo l'impatto
L'ampiezza 85 ± 3 in ±130 ms (B9) con una sola frenata limita la rotazione impatto → fine a ~55–60°: con la mano alla
spalla sinistra l'orientamento più vicino a quello d'impatto raggiungibile è a ≥ 77° (d/fscan.mjs). Per questo la fine
del candidato è davanti alla spalla sinistra con la cima in avanti, non avvolta.

## 4. Proposte per chi integra
1. PROPOSTA efd0f43 (fatta): mira negli esercizi con i quattro dritti letti dal computer.
2. Durata della scheda del dritto e del piatto (natpf-gesture-pose LIMITS.forehand contatto/ciclo, LIMITS.flat ciclo):
   intervalli invece dei valori fissi, o i valori del candidato (non fatta: senza 3.3 il candidato resta rosso).
3. Disegno: camera che cambia nel colpo, o vincoli del taglio e dell'avambraccio solo nelle fasi lente.
4. Poi: carica ≤ 140 °/s e ritorno ≤ 130 °/s (scheda ~4,4 s), fine 0,3 s; dati di partenza in dritto-lungo.over.json.

Non verificato: telefono vero, persona vera, la modale nel browser con il candidato (solo i fogli dei fotogrammi nella
copia tt-d), i pacchetti.
