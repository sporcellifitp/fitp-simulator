# B13 · Analisi dei gesti del tutorial: la fisica del braccio con il telefono in mano

> Stato: **completa** (07/11/2026, ramo `b13-gesti`, base `be91ec1`). Solo analisi: **nessun file del gioco modificato**
> (questo documento è l'unico file toccato). Chi analizza: allenatore di tennis + biomeccanica + motion design, sui
> fotogrammi del disegno vero e sulle misure del telefono simulato completo.
> Richiesta dell'utente (07/11 sera): «rivedi ancora i gesti del tutorial, il dritto non mi sembra tale e ci sono troppi
> colpi che non simulano la fisica del movimento del braccio con il telefono in mano».

## 0. Sintesi per chi decide

1. **Perché il dritto non sembra un dritto** (misurato sulla posa disegnata, §2.2): la mano resta **alla stessa altezza**
   per tutto il colpo (1,08–1,10 m, +1 cm dalla carica all'impatto) e percorre solo **39 cm**, mentre il telefono gira di
   85° in 0,26 s: si vede il telefono che **ruota su se stesso** (un tergicristallo attorno a un perno fuori quadro), non
   un braccio che gira attorno al corpo. All'impatto va avanti il **dorso della mano** (coseno schermo·moto −0,73):
   è l'orientamento della mano di un **rovescio**. Non c'è apertura dietro al corpo (la mano arriva 3 cm dietro il piano
   della spalla), non c'è accompagnamento (finisce davanti alla pancia, alla stessa altezza) e non c'è il corpo (niente
   busto, testa, spalla, braccio): l'occhio non ha riferimenti per «attorno a me» e «dal basso verso l'alto».
2. **Il braccio di oggi non esiste**: il disegno attacca al telefono un avambraccio rigido (polso fermo) e lo fa girare
   con il telefono; il gomito che ne risulta sta a **0,53–0,78 m dalla spalla** (l'omero è lungo 0,29 m) in tutti i colpi
   tranne il rovescio. Per questo il disegno sfuma l'avambraccio prima del gomito: il problema è stato nascosto, non
   risolto. È la «fisica del braccio» che l'utente non vede.
3. **Il riconoscimento vede solo le rotazioni del telefono** (giroscopio) e la salita della mano (accelerometro): il corpo
   si può cambiare liberamente purché la **somma delle rotazioni della catena** dia al telefono l'asse, il verso, il picco,
   l'ampiezza e la forma (piano, salita, inclinazione) richiesti (§3). Nessuna modifica al riconoscimento.
4. **Proposta** (§4): una catena cinematica vera — busto, spalla (3 gradi), gomito, pronosupinazione, polso (2 gradi), mano,
   telefono rigido nel palmo con la presa della foto — guidata da **angoli articolari** con sequenza prossimo-distale. La
   posizione di partenza approvata (q0) si ottiene **esattamente** con il gomito vicino al fianco (omero 20° in avanti,
   rotazione interna 45°, gomito piegato 83°, avambraccio supinato 66°, polso flesso 27° e deviato verso il mignolo 12°).
5. **Prova di fattibilità** (prototipo nel blocco appunti, §4.6): dritto, rovescio, piatto e volée costruiti così e letti
   dal telefono simulato completo (rilevatore vero, calibrazione rapida vera, mappatura del gioco): **48/48 letture
   giuste** (destro e mancino × calibrazione con l'animazione e con il braccio simulato × imitazione 0,8/1/1,25). Il dritto
   nuovo: mano 1,11 → 1,21 → 1,52 m (dal basso verso l'alto, finisce davanti alla spalla sinistra), busto che gira di 46°,
   **palmo che va avanti** all'impatto (coseno +0,82 invece di −0,73), top spin con salita 0,29, piano 0,95. Tagliato:
   8/12 (la preparazione che alza la mano va tenuta sotto ~140 °/s). Pallonetto, palla corta, schiacciata e servizio: solo
   proposti (le prime pose fatte a mano **non** rispettano i limiti: servono le stesse iterazioni, §4.5).
6. **Vincolo che decide la coreografia**: il dritto «da manuale» con il palmo verso la rete **non si può fare** con la presa
   approvata: dalla posizione di partenza (schermo verso il viso) il telefono dovrebbe girare di **161° attorno alla
   verticale nello stesso verso del dritto** durante la preparazione (il telefono la leggerebbe come un dritto). Il dritto
   proposto è quello «a porta + busto» (mano sotto il manico, come una presa western: il telefono è il manico, la cima
   indica la racchetta), con il palmo che spinge in avanti-sinistra.
7. **Disegno** (§5): braccio intero dalla spalla (omero con manica chiara, gomito, avambraccio intero), accenno di busto e
   testa a bassa opacità, ombra a terra, camera ferma sul corpo (non che insegue la mano), così si leggono altezza,
   giro attorno al corpo e «sopra la testa». Costo stimato +0,3–0,6 ms per fotogramma: dentro i 4 ms solo togliendo la
   sfumatura dell'avambraccio (strato fuori schermo) che oggi costa di più.

**Decisioni per l'utente** (prima di implementare): (a) dritto «a porta + busto» con il palmo che spinge (invece del
palmo verso la rete, impossibile con questa presa); (b) busto e testa disegnati (silhouette tenue) sì/no; (c) racchetta
virtuale fantasma (contorno di una testa di racchetta lungo la cima, 45 cm come `stroke-shape.js`) sì/no; (d) posizione
di partenza con il telefono **davanti allo sterno** (−0,08; 1,23; −0,31 m) invece che davanti al fianco destro
(0,23; 1,08; −0,24): è l'unica coerente con la presa approvata e con il gomito al fianco.

## 1. Cosa si è guardato

**Fotogrammi dell'animazione di oggi** (disegno vero `natpf_gesture_demo.js` in Chromium, 640×400 ridotti a 0,625,
destro, presa nel palmo, 8 momenti per scheda: pronto, carica a metà, fine carica, accelerazione, impatto, fine
accompagnamento, ritorno, pronto; servizio 9; presa 8; posizione 3), **guardati uno per uno**:
`/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b13/frames-before/01-grip.png`
… `13-line.png` (fogli per scheda) e `scheletro-<scheda>.png` (viste ortogonali della catena implicita: spalla del
modello, gomito e spalla risolti da `gestureRig`, percorso di polso, cima e gomito). Confronto oggi/prototipo:
`/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b13/frames-proto/confronto-forehand.png`,
`confronto-backhand.png`, `confronto-flat.png`, `confronto-volley.png` (camera da dietro-destra-alto, 8 momenti, riga
in alto la catena implicita di oggi, riga in basso la catena fisica). Le immagini sono fuori dal repository (nel blocco
appunti della sessione); script in `.../scratchpad/b13/scripts/` (`fotogrammi-prima.mjs`, `audit-posa.mjs`, `fk*.mjs`,
`disegna-scheletri.mjs`); il nucleo del prototipo è in Appendice A perché non vada perso.

**Misure** (`audit-posa.mjs`, posa di `gesturePose` con `rig: true`, e `readCard` di `test/pose-sensors.mjs`):

| Scheda (impatto) | Mano rispetto alla spalla (m) | Gomito implicito dalla spalla (omero 0,29) | Δ altezza mano carica→impatto / impatto→fine | Percorso della mano nella parte veloce | Faccia che avanza (schermo·moto) |
|---|---|---|---|---|---|
| Dritto | (0,29; −0,32; −0,16) | **0,70–0,72 m** | +0,01 / −0,02 | 0,39 m | **−0,73 (dorso)** |
| Rovescio | (−0,29; −0,32; −0,16) | 0,28–0,42 m | −0,01 / +0,02 | 0,52 m | −0,78 (dorso: giusto) |
| Piatto | come il dritto | 0,70–0,72 m | +0,02 / −0,03 | 0,50 m | −0,77 |
| Tagliato | (0,29; −0,26; −0,19) | 0,66 m | −0,05 / −0,08 | 0,30 m | −0,61 |
| Pallonetto | (0,19; −0,35; −0,19) | 0,65 m | +0,03 / +0,20 | 0,60 m | −0,28 |
| Palla corta | (0,19; −0,22; −0,29) | 0,53–0,57 m | −0,09 / −0,08 | 0,22 m | −0,28 |
| Schiacciata | (0,10; +0,32; −0,19) | 0,43 m | −0,05 / −0,21 | 0,54 m | **−0,99 (dorso)** |
| Servizio (battuta) | (0,10; +0,32; −0,19) | 0,43 m | −0,02 / −0,21 | 0,56 m | **−0,99** |
| Volée | (0,29; −0,27; −0,27) | 0,71 m | 0,00 / −0,02 | 0,28 m | −0,63 |
| Incrociato / lungolinea | come il dritto | 0,75–0,78 / 0,64 m | +0,01 / −0,02 | 0,39 m | −0,82 / −0,55 |
| Presa / posizione | (0,04; −0,34; −0,24) | 0,54 m (gomito 31 cm fuori e 43 cm sotto la spalla) | ferme | — | — |

Altezze assolute della mano (centro del telefono): dritto, rovescio, piatto, volée 1,08–1,16 m per tutto il colpo;
pallonetto 1,04 → 1,27; palla corta 1,29 → 1,11; tagliato 1,21 → 1,09; schiacciata e servizio 1,79 → 1,53 (la mano
«sopra la testa» è solo 0,34–0,37 m sopra la spalla: braccio piegato, non disteso). Il busto (`trunk`) è calcolato da
`gesturePose` ma **non è disegnato** (nessun uso in `natpf_gesture_demo.js`).

## 2. Critica per scheda

### 2.1 Difetti comuni (valgono per tutti i colpi)

- **D1 · Catena impossibile.** Mano e avambraccio sono rigidi con il telefono (polso fermo a ~32°), e tutto gira attorno a
  un asse per la spalla con raggio fisso (0,46 m). L'avambraccio cambia direzione quanto il telefono (dritto: da −4° a −77°
  di azimut in 0,28 s) e il gomito implicito salta a 0,53–0,78 m dalla spalla: non c'è un omero che lo regga. Il B9 lo
  aveva misurato (`docs/b9/posa-gesti.md` §Limiti: «una cinematica inversa a spalla ferma chiedeva pieghe del polso di
  80–150°») e ha scelto di sfumare l'avambraccio al 42–80% della lunghezza. L'occhio però vede che l'avambraccio ruota
  attorno a un perno invisibile che si sposta.
- **D2 · Il telefono gira, la mano quasi non viaggia.** Nei colpi orizzontali la mano percorre 0,28–0,52 m mentre il
  telefono gira di 48–110°. In un colpo vero la mano percorre 1,2–2 m (dritto), la racchetta gira attorno al corpo e la
  rotazione nasce dal busto e dalla spalla. Con raggio 0,46 m e mano ferma in altezza il gesto si legge come un polso o un
  avambraccio che si torce («tergicristallo», «saluto», «girare una manopola»).
- **D3 · Niente corpo.** Né busto, né testa, né spalla, né omero, né piano di terra vicino: la camera inquadra solo
  mano e telefono e in servizio e schiacciata **segue la mano** (`CAMERAS.serve.follow`). Non si può leggere «sopra la
  testa», «davanti all'anca», «attorno a me», «dal basso verso l'alto».
- **D4 · Altezza costante.** Il B9 ha scritto per il dritto «mano alla stessa altezza» (brief §5.3) e il moto la rispetta
  alla lettera: nessun colpo da fondo ha il percorso basso → alto (top spin) né alto → basso marcato (tagliato −12 cm).
- **D5 · Faccia sbagliata.** Con la presa nel palmo e lo schermo verso chi gioca, nei colpi di dritto, tagliato,
  volée, servizio e schiacciata va avanti il **dorso della mano** (tabella §1): è la mano di un rovescio o di un
  «manrovescio». Solo il rovescio ha il dorso avanti per ragione.
- **D6 · Tempi simmetrici e fermo.** Parte veloce simmetrica (accelerazione = frenata, legge sin²) e poi fermo di 0,10–
  0,20 s nella posa di fine: un accompagnamento vero frena più a lungo di quanto acceleri (2–3 volte) e continua sopra la
  spalla opposta; il fermo «a mezz'aria» davanti alla pancia è innaturale.
- **D7 · Preparazione corta.** Nei colpi orizzontali la carica è metà della parte veloce (42°): la mano non va mai dietro
  al corpo (dritto: 3 cm dietro il piano della spalla), le spalle non girano.

### 2.2 Dritto (`forehand`) — perché non si legge come un dritto

Fotogrammi `03-forehand.png`: (1) pronto, telefono inclinato in avanti, avambraccio da in basso a destra; (2–3) carica:
il telefono si **raddrizza in verticale** con lo schermo verso la camera e l'avambraccio verticale sotto di lui (si legge
«mostro il telefono», non «porto indietro la racchetta»); (4–5) accelerazione e impatto: il telefono si inclina a
sinistra attorno alla mano, la palla tocca il dorso del telefono; (6–7) fine: il telefono è sdraiato a sinistra,
l'avambraccio orizzontale da destra. La freccia del verso è un arco «ad arcobaleno» sopra la mano.

Cosa manca rispetto a un dritto (allenatore): (a) **apertura con le spalle** (unit turn 45–90°) e mano dietro l'anca;
(b) **anello e caduta** della mano sotto la palla e **salita** nell'avanzamento (top spin); (c) **contatto davanti al
corpo**, 30–40 cm davanti all'anca destra, braccio quasi disteso (gomito 110–150°), polso indietro; (d) **accompagnamento**
che sale e attraversa fino alla spalla sinistra (finale «a tergicristallo» o sopra la spalla); (e) catena prossimo-distale:
anche e busto partono prima, poi spalla, poi gomito e avambraccio, il polso per ultimo. Biomeccanica: il moto visibile è
solo (e), ridotto al polso; (a)–(d) non ci sono. Motion design: il soggetto è il telefono, non la persona; l'arco della
freccia descrive il moto della cima, non della mano. In più D5: il dorso avanti è il segnale più forte di «rovescio».

### 2.3 Rovescio (`backhand`)

È il colpo più plausibile come catena (gomito implicito 0,28–0,42 m, quasi giusto) e con il dorso avanti giusto. Difetti:
mano piatta a 1,10–1,12 m, nessuna rotazione delle spalle (si dovrebbero vedere chiudersi e poi aprirsi), fine davanti al
centro del corpo invece che alta a destra con il braccio disteso, gomito piegato a 84–100° («rovescio da ping-pong»
cercato dalla specifica §2.4, ma senza la distensione finale). Fogli `04-backhand.png`: telefono sdraiato a sinistra in
carica, verticale alla fine: si legge ancora come un tergicristallo.

### 2.4 Servizio (`serve`)

Lancio: la mano sale di 24 cm (1,12 → 1,36 m) davanti al busto; un lancio vero accompagna la palla fino all'altezza degli
occhi o sopra (la palla parte da ~1,6–1,8 m). Raccordo: la mano sale a 1,76 m con il telefono quasi fermo (giusto per il
riconoscimento) ma con il gomito implicito a 0,43 m dalla spalla e la camera che segue: non si vede che il braccio sale
sopra la testa (`05-serve.png`, fotogrammi 4–6). Battuta: impatto a 1,74 m (0,32 m sopra la spalla: braccio piegato; un
servizio vero colpisce con il braccio disteso, la mano ~0,55 m sopra la spalla), **dorso della mano avanti** (−0,99), fine
davanti al viso a 1,53 m invece che giù a sinistra, oltre l'anca. Tempi giusti (0,69 s tra i picchi, palla al colmo).

### 2.5 Piatto (`flat`)

Il dritto più veloce: eredita tutti i difetti del dritto. In più a «Fine carica» (`06-flat.png`, 3) il telefono è
verticale con l'avambraccio verticale sotto: posa da «telefono mostrato», non da carica.

### 2.6 Pallonetto (`lob`)

Rotazione giusta (attorno all'asse laterale) ma la mano sale solo di 23 cm (1,04 → 1,27 m) e l'avambraccio è verticale
sotto il telefono (`07-lob.png`): si legge «alzo il telefono per guardarlo». Un pallonetto è un lancio da sotto: braccio
quasi disteso, la spalla flette da dietro-basso (mano a 0,7–0,9 m) ad avanti-alto (1,5 m e oltre), 0,8–1 m di percorso.

### 2.7 Palla corta (`drop`)

La più credibile del gruppo: mano che scende di 18 cm, piatto che si apre verso il cielo. Difetti: l'avambraccio fa leva
attorno al suo centro (da +20° a −20°) con il gomito implicito a 0,55 m dalla spalla; la mano non va avanti «sotto la
palla» (si sposta di pochi cm in avanti); manca il busto che accompagna.

### 2.8 Tagliato (`slice`)

Asse inclinato giusto, ma la mano scende di soli 12 cm restando all'altezza del fianco (`09-slice.png`); il tagliato vero
parte con la mano all'altezza della spalla, dietro, e scende in diagonale davanti fino alla vita con il piatto aperto e un
accompagnamento lungo e basso in avanti. Dorso avanti (−0,61).

### 2.9 Schiacciata (`smash`)

Come la battuta del servizio: mano solo 0,37 m sopra la spalla in carica (1,79 m), nessun braccio libero che indica la
palla, nessuna testa per capire «sopra», dorso avanti all'impatto, camera che segue la mano (`10-smash.png`: sembra un
colpo di polso davanti al petto).

### 2.10 Volée (`volley`)

Preparazione di 12° (giusta per il riconoscimento) ma la mano percorre 0,28 m attorno a un perno lontano alla stessa
altezza; una volée vera è un «pugno» corto in avanti con il piatto già girato, contatto 40–50 cm davanti al corpo.
Il riconoscimento però chiede comunque una rotazione di ~48° a ~480 °/s (§3): la volée va mostrata come **un dritto
compatto** (spalle e braccio insieme), non come un pugno puro (che il telefono non vedrebbe).

### 2.11 Incrociato e lungolinea (`cross`, `line`)

Dritto con il telefono pre-girato di ±22° attorno alla verticale (`preYaw`): il gomito implicito peggiora (0,77 m
nell'incrociato). Fisicamente la mira è un contatto **più avanti e prima** (incrociato: busto e braccio più girati a
sinistra all'impatto) o **più indietro e dopo** (lungolinea), cioè lo stesso dritto con il contatto spostato nel tempo
lungo la catena e il polso (deviazione) che gira il piatto di ~±20°.

### 2.12 Presa e posizione (`grip`, `ready`)

Ferme e giuste (la camera gira, non la mano). Unico limite: se si disegna il braccio, con la mano davanti al fianco
destro e l'avambraccio che punta 45° verso l'interno (approvato, foto) il gomito cade 31 cm fuori dalla spalla. Con la
catena proposta la stessa presa (stesso q0, stessa direzione dell'avambraccio) si ottiene con la mano davanti allo sterno
e il gomito al fianco (§4.2): è anche la posa naturale di chi legge il telefono, come nella foto.

## 3. Vincoli del riconoscimento (da rispettare, nessuna modifica al riconoscimento)

### 3.1 Rilevatore e forma del colpo (codice vero)

Valori con il profilo della calibrazione rapida del telefono simulato (dritto ~670 °/s, rovescio ~650; picco vero ~700).

| Regola | Valore | Dove | Conseguenza per la coreografia |
|---|---|---|---|
| Il colpo è un picco di \|ω\| del telefono; **picco = impatto** | vertice della parabola sui campioni grezzi | `swing-detect.js` 254–262, 343 | il contatto con la palla si mette nell'istante del picco di \|ω\| **misurato** sulla posa (non nell'istante nominale di una posa chiave) |
| Inizio, picco minimo | ~117 °/s, ~182 °/s (0,18 e 0,28 × colpo di calibrazione più debole) | `thr()` | sotto 117 °/s nessun gesto parte |
| Soglia d'intenzione (dritto/rovescio) | ~0,5 × proprio colpo (**~325–335 °/s**) | `gesture-intent.gestureFloor` | una preparazione su asse verticale deve restare sotto (consigliato ≤ 250 °/s, e ≤ 200 se si vuole il margine a 1,25×) |
| Soglia dei gesti «speciali» | **0,28 × proprio colpo (~182–190 °/s)** quando il gesto, rispetto ai dritti di calibrazione, sale molto (lift > 0,58), scende molto, o è inclinato e lento | `classifyGesture` (`automaticGesture`) | **misurato nel prototipo**: una preparazione che alza la mano a 195 °/s (tagliato a 1,25×) è letta come un colpo di rovescio; preparazioni che alzano o abbassano la mano ≤ ~140 °/s |
| Gesto verticale lento | asse con \|cos(asse, alto)\| ≤ 0,45 e \|cos(asse, asse di calibrazione)\| ≤ 0,65, ≥ 15° percorsi, ≥ ~101 °/s, oltre 0,9 s dal colpo prima | `VERTICAL.slow*` | qualunque rotazione attorno a un asse **orizzontale** (spalla in avanti/indietro, gomito, pronosupinazione con l'avambraccio orizzontale, polso) fuori dalla parte veloce: ≤ ~95 °/s, oppure dentro la finestra del rientro |
| Ampiezza, durata | ≥ ~17–18°; 30–700 ms dall'inizio alla partenza | `minAngles`, `minDur`, `maxDur` | — |
| Doppi picchi, rientro | 170 ms nello stesso verso; verso opposto entro 0,6 s più debole di 1,2× o entro 0,9 s più debole di 0,7×: rientro scartato; fine del rientro dopo 0,65 s comunque | `refractory`, `recover*` | il ritorno deve partire presto (≤ 0,3–0,35 s dopo l'impatto) e, se gira attorno a un asse orizzontale, finire entro ~0,9 s o restare ≤ 95 °/s |
| Verso | asse di calibrazione nel riferimento del **telefono** (coseno > 0,25), altrimenti rotazione attorno alla verticale | `fire()` | una rotazione attorno alla verticale del campo ha la stessa rappresentazione nel telefono qualunque sia l'orientamento attorno alla verticale: girare tutto il telefono di un angolo attorno alla verticale non cambia asse, gravità, `tilt`, `twist` |
| Piano (`plane`) | coseno medio asse/alto nei **110 ms prima del picco** | `stroke-shape.js` | il piano deve essere stabile nell'ultima parte dell'accelerazione |
| Salita (`rise`) | direzione verticale della velocità della «testa» (cima + 45 cm) nei **34 ms prima del picco**: velocità della mano integrata dall'inversione (istante più lento 50–420 ms prima) + ω × cima | `stroke-shape.js` | la salita dipende dal **percorso della mano all'impatto** e dalla parte orizzontale di ω (ω × cima): la rotazione interna dell'omero inclinato e la pronosupinazione la spostano |
| Inclinazione (`tilt`) | altezza della cima all'impatto | idem | conta solo per la schiacciata (manico alto) |
| Forza | 0,5·clamp((picco vero − 250)/1100) + 0,5·clamp(0,6·picco/rif) | `strokePower` | il piatto deve arrivare a ≥ 0,62 (picco vero ≥ ~830–850 °/s) |

### 3.2 Vincoli per scheda (destro, presa nel palmo; misure della posa di oggi, calibrazione con l'animazione)

Asse e verso nel **campo** (x destra, y alto, −z verso lo schermo) e nel **telefono** (x bordo destro, y cima, z schermo)
all'istante del picco; il mancino è lo specchio (campo: asse (x, −y, −z)). Calibrazione dell'animazione: salita abituale
dritto 0,188, rovescio −0,195; del braccio simulato: 0,119 e −0,136; asse di calibrazione nel telefono (0,40; 0,90; 0,19).

| Scheda | Asse (campo) → asse nel telefono | Picco media / vero (°/s) | Parte veloce · ampiezza (ampiezza letta) | plane · rise · tilt · forza | Regola che decide (margine) | Preparazione · ritorno (°/s, max) | Altro |
|---|---|---|---|---|---|---|---|
| Dritto | (−0,16; 0,89; −0,42) → (0,18; 0,96; 0,20), +1 (antiorario dall'alto) | 670 / 710 | 260 ms · 85° (65°) | 0,94 · 0,19 · 0,77 · 0,51 | colpo normale = top spin; tagliato sotto −0,22 (0,41); piatto da forza 0,62 (≈ 830 °/s veri); pallonetto morbido sotto forza 0,30 | ≤ 180 (test) / ≤ ~300 (rilevatore) · ≤ 240 | è **anche la calibrazione** (gesto L): la sua salita è la salita abituale di chi imita |
| Rovescio | (0,15; −0,85; 0,50) → (−0,61; −0,77; −0,17), −1 | 649 / 688 | 260 ms · 78° (63°) | −0,88 · −0,19 · 0,48 · 0,50 | top spin; tagliato sotto −0,22 + min(0, abituale) = −0,415 (0,22) | ≤ 180 · ≤ 240 | anche la calibrazione (gesto R) |
| Servizio | lancio +x (campo); battuta −x → (−0,82; 0,57; 0) | lancio 293 / 300; battuta 656 / 697 | lancio 420 ms · 63° (40°); battuta 240 ms · 84° (62°) | lancio: rise 1,0; battuta: plane 0,02 · rise −0,53 · tilt 0,63 | **due messaggi**; battuta 0,69 ± 0,10 s dopo il picco del lancio (qualità piena ±0,18), al colmo della palla | prep ≤ 60; **raccordo ≤ 90** (nel contesto `toss` il picco minimo è ~92); ritorno ≤ 240 | contesto `serve` → `toss`: soglie basse (~65/92 °/s, ≥ 2°), nessun controllo del verso |
| Piatto | come il dritto → (0,11; 0,98; 0,18) | 1007 / 1091 | 220 ms · 110° (94°) | 0,94 · 0,15 · 0,80 · **0,85** | forza ≥ 0,62 **e** \|salita − abituale\| ≤ 0,12: finestra **stretta** (abituale 0,19 o 0,12 → salita 0,07–0,24 con le due calibrazioni) | ≤ 200 · ≤ 250 | a 0,8× deve poter tornare top spin (ammesso), non diventare altro |
| Pallonetto | (0,94; 0,33; 0) → (0,92; −0,33; 0,21) | 495 / 519 | 300 ms · 78° (57°) | 0,36 · 0,91 · 0,59 · 0,25 | salita ≥ max(0,5; abituale + 0,45) = 0,64 **e** \|piano\| ≤ 0,7 (margini 0,27 e 0,34) | **≤ 95** (≥ 0,6 s; asse orizzontale!) · ≤ 170 | preparazione oltre ~100 °/s = palla corta di rovescio in più |
| Palla corta | (−0,73; 0,33; 0,60) → (−0,56; 0,34; 0,76) | 381 / 412 | 240 ms · 40° (34°) | 0,30 · −0,88 · 0,49 · 0,25 | taglio verticale morbido: salita ≤ −0,12, \|piano\| ≤ 0,55, forza ≤ 0,36 (0,11), ampiezza ≥ 15° | ≤ 140 (alza la mano: soglia 0,28×) · ≤ 150 | oltre ~600 °/s diventa tagliato |
| Tagliato | (−0,51; 0,86; 0) → (−0,04; 0,83; 0,55) | 568 / 598 | 260 ms · 78° (56°) | 0,86 · −0,51 · 0,63 · ~0,42 | salita ≤ −0,22 + min(0, abituale) (0,29) **e** forza > 0,36 (**0,06**) **e** ampiezza letta > 48° (**8°**): più lento o più corto = palla corta | ≤ 180 (≤ ~140 se alza la mano) · ≤ 240 | margini stretti su forza e ampiezza |
| Schiacciata | (−1; 0; 0) → (−0,82; 0,57; 0) | 652 / 697 | 240 ms · 84° (69°) | 0 · −0,42 · 0,66 · ~0,5 | solo con la palla alta: forza ≥ 0,30 e (salita ≤ −0,08 (0,34) o piano < 0,55 con tilt ≥ 0,4) | **≤ 80** (≥ 0,7 s; asse orizzontale) · ≤ 240 | preparazione che ruota ≥ ~120 °/s = top spin in più |
| Volée | (−0,23; 0,95; −0,22) → (0,28; 0,86; 0,43) | 444 / 488 | 200 ms · 48° (40°) | 0,97 · 0,00 · 0,66 · ~0,32 | top spin di dritto; deve superare la soglia d'intenzione anche a 0,8× (≈ 355 °/s di media: margine piccolo) | **≤ 12–15° di preparazione**, ≤ 120 · ≤ 240 | preparazione di 24° in 0,08 s = rovescio in più |
| Incrociato / lungolinea | dritto | 670 / 710 | come il dritto | rise 0,73 / −0,02 | top spin di dritto **e** mira: scarto della direzione del piatto all'impatto dal proprio dritto abituale ≥ ~11° (mira > 0,4; zona morta 3°, piena a 23°) nel verso giusto | ≤ 250 · ≤ 250 | il «centro» della mira si impara dai tre dritti prima (test) |
| Presa / posizione | — | — | — | — | **nessun messaggio**; rotazione ≤ 30 °/s, nessun campione > 90 | — | è la posa di riposo della calibrazione e il riferimento dell'alto |

### 3.3 Vincoli dei test di fedeltà (cosa misurano e cosa è scelta di disegno)

Vincoli **del riconoscimento** (da mantenere): `natpf-gesture-pose.test.mjs` «fedeltà» (13 pose × destro/mancino ×
calibrazione animazione/braccio simulato × palmo/martello: esattamente il colpo mostrato, picco = contatto ± 1
campione), «Δ ≤ ¼ di campione», «0,8× e 1,25×», «prese di chi imita 20–50° / 25–55°» (limite documentato: il piatto a
50°), «presa e posizione ferme», «servizio continuo» (lancio 300, raccordo ≤ 90, battuta 0,69 s dopo, palla al colmo);
`natpf-gesture-anim.test.mjs` «fedeltà dell'animazione» (≥ 280 letture, picco ± 40 ms) e «la posa disegnata è quella del
test».

Vincoli **di disegno del B9** (da rivedere con la catena fisica, non sono il riconoscimento): `LIMITS` (picco per colpo con
intervalli stretti, `ms` e ampiezza della parte veloce simmetrica, preparazione ≤ 180 °/s, ciclo ± 0,1 s, contatto del
dritto a 1,03 s), «fermo in fine colpo 0,10–0,20 s», «ritorno entro 0,6 s», «scheletro: mano e avambraccio rigidi con il
telefono, |S−E| = `ARM.upper`» (con la catena vera il polso si piega e il gomito è vero), «avambraccio che sfuma prima del
gomito» (`FOREARM_SHOWN`), «telefono non di taglio ≥ 25°» e «avambraccio ≥ 28° dal raggio visivo» (vanno rifatti sulle
camere nuove), «mancino specchio esatto» (resta).

Limiti noti del riconoscimento da ricordare: il piatto si legge **relativo alla salita abituale** con una finestra di
±0,12, e la salita abituale arriva al massimo a 0,30 (`riseRefMax`): con due calibrazioni nel test (animazione e braccio
simulato) il dritto dell'animazione deve avere una salita **≤ ~0,30** e il piatto stare tra le due (prototipo: dritto
0,29, piatto 0,17 → margine 0,007 con la calibrazione dell'animazione: da allargare portando il dritto a ~0,22).

## 4. Modello fisico proposto

### 4.1 Parametri e catena (cinematica diretta)

Riferimento del campo come oggi (x destra, y alto, −z verso lo schermo; centro dei piedi; destro, mancino = specchio).
Segmenti (adulto ~1,72 m; antropometria di Winter/Drillis-Contini, spalla come il modello di oggi):

| Segmento | Valore |
|---|---|
| Bacino (centro di rotazione del busto) | (0; 1,00; 0) |
| Spalla destra dal bacino | (0,19; 0,42; 0) (spalla a 1,42 m come oggi; la sinistra speculare) |
| Collo, testa dal bacino | (0; 0,47; 0), (0; 0,64; −0,02) (solo disegno) |
| Omero | 0,30 m |
| Avambraccio | 0,262 m (come `ARM.fore`) |
| Mano e telefono | dalla mano di oggi (`HAND` in mm nel riferimento del telefono): polso in (36; −104; −24) mm |

Angoli (gradi), con i limiti usati nel prototipo (da `fk-ik.mjs`): busto **τ** attorno alla verticale (+ a sinistra,
−70…70), inclinazione laterale **λ** (+ spalla destra giù, −25…25); spalla: **piano di elevazione p** (0 laterale,
90 in avanti, −40…135), **elevazione e** dal fianco (0…175), **rotazione assiale r** (+ interna, −100…75); gomito **b**
(flessione, 0 disteso … 145); avambraccio **pro** (pronazione dalla supinazione anatomica: 0 palmo avanti col braccio
giù, 90 neutra, 0…170); polso **fl** (flessione +, estensione −, −70…75) e **dv** (deviazione radiale +, ulnare −,
−30…20).

Cinematica diretta (quaternioni come `natpf_gesture_pose.js`; `Rx/Ry/Rz` rotazioni sugli assi locali):

```
T  = Ry(τ)·Rz(−λ)                          busto
S  = bacino + T·spalla                      spalla
H  = T · R(k_p, e) · Ry(r),  k_p = (sin p, 0, cos p)    omero (a riposo giù; prima la rotazione assiale, poi l'elevazione nel piano p)
E  = S + H·(0, −0,30, 0)                    gomito
F  = H · Rx(b) · Ry(pro)                    avambraccio (flessione del gomito attorno all'asse laterale, poi pronazione sul proprio asse)
W  = E + F·(0, −0,262, 0)                   polso
Hd = F · Rx(fl) · Rz(dv)                    mano (−y verso le dita, −z normale del palmo, +x lato del pollice)
q  = Hd · G                                 telefono (presa rigida)
pos = W − q·(0,036; −0,104; −0,024)         centro del telefono
```

**Presa canonica G** (palmo, foto): schermo = normale del palmo, cima = asse della mano girato di **30° verso il
pollice** (lo stesso angolo della mano di oggi: asse polso → nocca del medio = (−0,50; 0,87; 0,06) nel telefono). Il
**martello** (rollback) ha la sua G (telefono nel pugno, cima in avanti dall'avambraccio, display di lato): si risolve la
sua posizione di partenza nello stesso modo (§4.2). Le **prese di chi imita** del test (cima 20–50° verso l'interno,
25–55° in avanti) diventano rotazioni di G nella mano: la stessa coreografia articolare con il telefono tenuto diverso,
più realistico di oggi (dove cambiava solo l'orientamento di partenza).

### 4.2 Posizione di partenza (risolta, esatta)

Cercando gli angoli che danno **esattamente** q0 (`GRIP_POSE.palmo`) e la direzione dell'avambraccio approvata (dal
gomito al polso 7° sopra l'orizzontale, 45° verso l'interno), con l'omero 20° in avanti: **r 45,4, b 82,7, pro 23,6,
fl 27,4, dv −12,3** (errore 0,04° sull'orientamento e 0,04° sull'avambraccio). Cioè: rotazione interna della spalla 45°,
gomito a 97° (flessione 83°), avambraccio **supinato 66°** (la specifica §2.1 chiedeva 60–70°), polso flesso 27° e
deviato verso il mignolo 12°: tutto dentro i limiti comodi. Telefono in **(−0,08; 1,23; −0,31) m**: davanti allo sterno,
gomito in (0,19; 1,14; −0,10), al fianco. Con l'omero a 15–30° e il piano 60–90° rotazione e gomito cambiano di 1–6°, la pronazione
va da 9° a 27° (`fk-pronto.mjs`): la presa approvata è anatomicamente comoda. Oggi la mano è in (0,23; 1,08; −0,24): per avere un
braccio vero la posizione di partenza va spostata davanti allo sterno (decisione (d) del §0). Il riconoscimento non
cambia: il giroscopio non vede le traslazioni e la calibrazione «fermo» chiede solo di stare fermi.

### 4.3 Tempi: minimo jerk e sequenza prossimo-distale

Per ogni colpo quattro pose articolari: **R** (partenza), **B** (fine carica), **C** (impatto), **F** (fine
accompagnamento). Per ogni articolazione:

- preparazione R → B a minimo jerk (u³(10 − 15u + 6u²)), che finisce quando comincia la sua parte veloce;
- parte veloce B → C con velocità ∝ (1 − cos πu) (parte da ferma, massima in C) in `acc` (0,09–0,13 s), poi C → F con
  velocità ∝ (1 + cos πu) (frena fino a ferma) in un tempo **proporzionale all'ampiezza** (stessa velocità in C), entro
  0,12–0,30 s: l'accompagnamento frena più a lungo di quanto acceleri, come nel colpo vero;
- **ritardi prossimo-distali** dell'istante di velocità massima: busto e inclinazione −50 ms, spalla (piano ed
  elevazione) −25 ms, rotazione della spalla −12 ms, gomito, avambraccio e polso 0 (catena cinetica: il busto parte
  prima, il polso per ultimo); il busto che riparte mentre il braccio sta ancora caricando dà la transizione senza fermo;
- fermo breve (0,10 s), ritorno F → R con minimo jerk e superamento ≤ 3° (`settle`) in 0,45–0,6 s, riposo.

L'istante del **contatto** è quello del picco di |ω| del telefono **misurato** sulla posa (tabella del piano, una volta
per scheda e presa, come oggi `gesturePlan`): palla, «Impatto», lampo e banda «Picco = impatto» si mettono lì. Nel
prototipo il picco cade 0–31 ms prima dell'impatto nominale delle articolazioni senza ritardo. Nota per chi implementa:
nel prototipo il tempo dopo C è limitato a [0,10; 0,30] s e per le articolazioni con ampiezze molto diverse prima e dopo C
la velocità salta in C (accelerazione discontinua di una sola articolazione): nel modulo vero si usa un polinomio di
Hermite quintico per articolazione con la velocità in C imposta (C²).

### 4.4 La rotazione del telefono è la somma della catena: chi fa l'asse dominante

ω del telefono = Σ (velocità di ogni articolazione × il suo asse nel campo). Con il braccio quasi lungo il fianco
(elevazione 15–35°):

| Articolazione | Asse nel campo | Contributo al riconoscimento |
|---|---|---|
| Busto τ | verticale | asse verticale pulito (dritto, rovescio, piatto, volée), non sposta la salita |
| Spalla, piano p (adduzione/abduzione orizzontale) | verticale se l'omero è orizzontale; poco efficace a omero basso (∝ sin e) | asse verticale; con il braccio basso serve un grande angolo |
| Spalla, rotazione assiale r | asse dell'omero (quasi verticale col braccio giù, **inclinato in avanti/fuori** col braccio alzato) | molto efficace (la «porta»), ma con l'omero inclinato aggiunge una parte orizzontale: **inclina il piano e fa scendere la testa** (ω × cima): nel prototipo la volée fatta di rotazione interna era letta **palla corta** (salita −0,36); rifatta con busto + adduzione orizzontale: top spin (salita 0,20) |
| Spalla, elevazione e (nel piano p) | orizzontale, perpendicolare al piano | pallonetto (piano sagittale: asse laterale ±x), schiacciata e battuta (flessione/estensione) |
| Gomito b | asse laterale dell'avambraccio (orizzontale col braccio giù) | pallonetto, palla corta, battuta (distensione); nei colpi orizzontali va tenuto quasi fermo |
| Pronosupinazione | asse dell'avambraccio | col braccio orizzontale è un asse orizzontale: apre/chiude il piatto (palla corta, tagliato), sposta piano e salita; **mai veloce fuori dal colpo** (gesto verticale lento) |
| Polso fl/dv | orizzontali (vicino alla mano) | piccoli: mira (incrociato/lungolinea), «polso calmo» nel dritto (specifica §1.5) |

Regole che ne vengono:

1. **Colpi orizzontali**: l'asse verticale si fa con **busto + adduzione orizzontale**, la rotazione interna solo come
   rifinitura (a omero basso). Salita: data dal percorso della mano (inclinazione laterale del busto + elevazione che
   cresce durante l'avanzamento) e tenuta ≤ 0,30 nel dritto (piatto, §3.3).
2. **Colpi verticali** (pallonetto, palla corta, schiacciata, battuta): l'asse orizzontale si fa con **spalla
   (elevazione) + gomito**; busto e rotazione assiale quasi fermi (altrimenti il piano sale sopra 0,7 e il pallonetto
   diventa top spin, o la schiacciata perde il piano verticale).
3. **Preparazioni compensate**: per portare la mano in alto, in basso o di lato **senza girare il telefono** si muovono
   due articolazioni in versi opposti (es. spalla che flette mentre il gomito si distende e il polso si estende; busto
   che gira a destra mentre la rotazione interna aumenta): il giroscopio vede solo la differenza. È come i tennisti
   tengono fermo il piatto (volée, «trofeo» della battuta) ed è l'unico modo di rispettare 80–95 °/s su un asse
   orizzontale con la mano che sale di un metro.
4. **Budget di rotazione della preparazione** (minimo jerk, picco = 1,875 × ampiezza / durata): asse verticale ≤ 250
   °/s → ≤ 100° in 0,75 s; mano che sale o scende ≤ 140 °/s → ≤ 55° in 0,75 s; asse orizzontale ≤ 90 °/s → ≤ 48° in 1,0 s.
5. **Ritorno**: parte entro 0,3 s dall'impatto e, se gira attorno a un asse orizzontale (dopo pallonetto, schiacciata,
   servizio), finisce entro ~0,9 s dall'impatto oppure resta ≤ 90 °/s.

### 4.5 Coreografia per scheda (angoli in gradi; R = τ 0, λ 0, e 20, p 90, r 45, b 83, pro 24, fl 27, dv −12)

**Provati con il telefono simulato completo** (Appendice B; `readCard`/`judgeCard` veri, tolleranza del picco 40 ms):

| Scheda | B (fine carica) | C (impatto) | F (fine) | Tempi | Articolazioni che fanno l'asse | Esito (2 mani × 2 calibrazioni × 0,8/1/1,25) |
|---|---|---|---|---|---|---|
| Dritto «a porta + busto» | τ −28, λ 6, e 18, p 45, r −5, b 72, pro 28, fl 8, dv −10 | τ −7, λ 2, e 22, p 60, r 15, b 74, pro 30, fl 10 | τ 18, λ −3, e 52, p 100, r 40, b 100, pro 38, fl 16 | prep 0,75; acc 0,13; ciclo 2,68 | busto (46°), rotazione interna (45°), adduzione orizzontale (p 45 → 100 con e che sale) | **12/12**: top spin di dritto (1,25×: piatto ammesso); picco della posa 741 °/s (letto 679 di media, 704 vero), piano 0,95, **salita 0,29**, tilt 0,46; prep 249 °/s (asse verticale), ritorno 187 |
| Rovescio | τ 30, λ 4, e 12, p 130, r 70, b 85, pro 22, fl 26 | τ 10, λ 1, e 22, p 105, r 52, b 75, pro 25, fl 22 | τ −14, λ −3, e 55, p 65, r 25, b 60, pro 30, fl 14 | prep 0,75; acc 0,13; ciclo 2,66 | busto (44°), abduzione orizzontale (p 130 → 65), rotazione esterna | **12/12**: top spin di rovescio; picco della posa 688 (letto 660 / 686), piano −0,96, salita −0,09; prep 147, ritorno 258 (oltre i 240 di oggi: da abbassare) |
| Piatto | τ −30, e 18, p 42, r −10, b 72, pro 28, fl 6 | come il dritto (τ −6, r 16) | τ 26, e 52, p 105, r 46, b 100 | prep 0,9; acc 0,105; ciclo 2,77 | come il dritto, più ampio e più breve | **12/12**: piatto (0,8×: top spin ammesso); picco della posa 1048 (letto 971 / 1012), salita 0,17, forza sopra 0,62; prep 223 |
| Volée (dritto compatto) | τ −6, λ 2, e 24, p 75, r 40, b 82 (polso e avambraccio come R) | τ 7, e 30, p 103, r 53, b 76 | τ 18, λ −2, e 36, p 124, r 64, b 72 | prep 0,3 (≤ 12°: picco 89 °/s); acc 0,09; ciclo 1,91 | busto + adduzione orizzontale; rotazione interna poca | **12/12**: top spin di dritto; picco della posa 546 (letto 457 / 514), piano 0,97, salita 0,20, ampiezza letta 35°. Prima versione con la rotazione interna: palla corta (salita −0,36); seconda troppo debole (453: a 0,8× nessun colpo) |
| Tagliato | τ −25, λ −4, **e 55**, p 50, r 0, b 95, pro 24, fl 20 | τ −6, e 38, p 65, r 18, b 80, pro 20, fl 18 | τ 16, λ 3, **e 18**, p 95, r 38, b 62, **pro 14**, fl 14 | prep 1,0; acc 0,13 | busto + adduzione, con l'elevazione che **scende** (mano 1,52 → 1,36 → 1,10 m) e supinazione (piatto aperto) | **8/12**: tagliato a 1 e 0,8×; a 1,25× la preparazione (195 °/s, alza la mano) è letta come un rovescio in più → preparazione ≤ ~140 °/s (1,3 s, o compensata) |

Il dritto nuovo nei fogli `confronto-forehand.png`: spalle che si girano a destra, mano che va fuori a destra all'altezza
della vita (la cima punta a destra-avanti: carica **compatta**, come una risposta al servizio), avanzamento con la mano che
sale, impatto davanti, accompagnamento che attraversa e finisce **davanti alla spalla sinistra, a 1,52 m**, con la cima
verso l'alto e indietro (la «racchetta» sopra la spalla). Il palmo (schermo) va avanti all'impatto (+0,82). Una carica
più ampia (cima verso dietro) chiederebbe altri ~70° di rotazione nella preparazione: oltre il budget della regola 4.

**Proposti, da provare** (le prime pose fatte a mano con `fk-altri.mjs` **non** rispettano i limiti: schiacciata con
106° di rotazione nella preparazione invece di ≤ ~45° e asse del colpo attorno a z invece che a −x; lancio del servizio
con l'asse verticale invece che laterale: vanno iterati come il dritto, con lo strumento del §6):

| Scheda | Coreografia (anatomia e tempi) | Asse e chi lo fa | Punti critici |
|---|---|---|---|
| Pallonetto | **lancio da sotto**: carica 0,85–1,0 s con la mano che scende dietro l'anca (spalla in estensione, gomito che si distende a ~20–30°, polso che si estende per **compensare**: il telefono gira ≤ 45°, schermo verso il cielo, cima in avanti); parte veloce 0,30 s di **flessione della spalla** a gomito quasi disteso, mano da ~0,8–0,9 m a 1,5–1,6 m davanti al viso; busto quasi fermo (±10°) | asse laterale +x (piano 0,3–0,5): elevazione della spalla nel piano sagittale + gomito; busto e rotazione assiale fermi | preparazione ≤ 95 °/s attorno all'asse laterale (compensazione obbligatoria); salita ≥ 0,64 con piano ≤ 0,7; ritorno dall'alto entro 0,9 s o ≤ 90 °/s |
| Palla corta | **carezza sotto la palla**: carica 0,4–0,5 s alzando la mano davanti al petto (gomito che flette, ≤ 140 °/s); parte veloce corta e lenta (240 ms, ~40°): il gomito si distende e l'avambraccio **supina** (piatto che si apre verso il cielo), la mano scende ~25 cm in avanti; fine all'altezza dell'anca | asse laterale −x con parte verticale (piano ~0,3): gomito + supinazione + poco busto | forza ≤ 0,36 (picco vero ≤ ~420), ampiezza ≥ 15°, salita ≤ −0,12; preparazione che alza la mano ≤ 140 °/s |
| Schiacciata | **trofeo** in 1,0–1,2 s: spalla a 140–150° di elevazione, gomito che si **distende** (b ~30–35°) e polso esteso, così il telefono gira ≤ 45° (cima in alto, palmo verso l'alto-indietro: «vassoio sopra la testa»); braccio libero (disegno) che indica la palla; parte veloce 0,24 s: estensione della spalla in avanti-basso (150 → 110), gomito che finisce di distendersi, pronazione; impatto davanti alla fronte con la mano a ~2,0 m; accompagnamento fino al petto | asse −x: spalla (estensione) + gomito; busto ±15° | preparazione ≤ 80 °/s (asse orizzontale): compensazione spalla/gomito/polso; piano < 0,55 o salita ≤ −0,08; la mano all'impatto molto più alta di oggi (1,74 m) |
| Servizio | **lancio**: preparazione ≤ 60 °/s; spalla che flette a gomito quasi disteso e avambraccio supinato (palmo in alto, «vassoio» che accompagna la palla), mano dall'anca all'altezza degli occhi, 0,42 s a ~300 °/s attorno a +x; **raccordo** 0,2–0,45 s: la mano continua a salire fino al trofeo con il telefono quasi fermo (≤ 90 °/s: flessione della spalla compensata da gomito e polso); **battuta** come la schiacciata, picco 0,69 s dopo il picco del lancio, al colmo della palla; fine bassa a sinistra | lancio +x (spalla); battuta −x (spalla + gomito) | il raccordo è il punto più difficile (molti gradi di spalla con ≤ 10° di telefono); la battuta deve restare un gesto distinto (nel contesto `toss` ogni rotazione ≥ ~92 °/s è una battuta) |
| Incrociato / lungolinea | il dritto con il **contatto spostato**: incrociato = busto e adduzione già più avanti all'impatto (~+15° di τ) e polso in deviazione radiale; lungolinea = contatto più indietro (~−15°) e deviazione ulnare; scarto del piatto all'impatto ±15–20° dal dritto | come il dritto | la mira si legge dalla direzione di tutto il telefono attorno alla verticale all'impatto rispetto al proprio dritto: ≥ ~11° per avere mira > 0,4 |
| Presa, posizione | ferme in R (§4.2); la presa mostra anche l'avambraccio intero e il gomito al fianco | — | nessuna rotazione |

### 4.6 Prova di fattibilità: cosa è stato verificato davvero

- Ambiente: telefono simulato completo (`test/phone-sim.mjs`, rilevatore `site/js/tennis/swing-detect.js`, forma
  `stroke-shape.js`, calibrazione rapida vera, mappatura `natpf_phone_racket`), adattatore `test/pose-sensors.mjs`
  (`readCard`, `judgeCard` con tolleranza del picco 40 ms come `natpf-gesture-anim`), una sorgente di pose con i colpi
  nuovi e le altre schede di oggi; calibrazione «pose» fatta con il dritto **e** il rovescio nuovi.
- Esito (`colpi-finale.json`, un'unica esecuzione): **48/48** per dritto, rovescio, piatto, volée (destro e mancino,
  calibrazione con l'animazione e con il braccio simulato, 0,8×, 1×, 1,25×; ammessi solo i cambi del test di oggi:
  dritto/rovescio/volée più veloci → piatto, piatto più lento → top spin). Tagliato 8/12 (sopra). Pallonetto, palla
  corta, schiacciata, servizio, mira: **non provati**.
- Non provati nemmeno: la presa a martello, le prese di chi imita (20–50° / 25–55°), il test «Δ ≤ ¼ di campione», la
  continuità del ciclo e il disegno (il prototipo non disegna: i fogli di confronto sono stecchini).

## 5. Disegno: come mostrare il braccio senza perdere lo stile 2,5D

- **Cosa disegnare**: spalla (giunto), **omero** dalla spalla al gomito (capsula, manica chiara bianca con riga blu come
  il polsino, mai blu scuro su blu), **gomito**, **avambraccio intero** (pelle, stessa rampa di 4 toni), mano e telefono
  come oggi (la mano resta quella approvata: con la catena il polso si piega, quindi l'attacco polso-avambraccio va
  disegnato come raccordo morbido sotto il polsino, che già lo nasconde). **Accenno di corpo**: busto come sagoma
  (trapezio spalle-bacino) e testa come cerchio, a bassa opacità (12–20%) o a solo contorno, che **ruotano con τ e λ**;
  braccio libero solo nel servizio e nella schiacciata (indica la palla); ombra morbida della mano sul piano di gioco.
  Così si leggono «attorno a me», «sopra la testa», «davanti all'anca», «dal basso verso l'alto», e la catena (le spalle
  che girano prima del braccio).
- **Camera**: ferma sul corpo per tutto il ciclo (niente camera che insegue la mano nel servizio e nella schiacciata),
  tre quarti da dietro-destra e un poco dall'alto per i colpi orizzontali (si vede l'arco attorno al corpo e la salita);
  di lato per pallonetto, palla corta, servizio e schiacciata (si vede l'altezza). L'inquadratura comprende spalle e
  testa: il soggetto (mano + telefono) diventa più piccolo, quindi va rifatto il controllo «telefono ≥ 60 px all'impatto a
  448×280» e le soglie di taglio (nel prototipo, a fine carica del dritto il telefono è di taglio per la camera da dietro:
  serve una camera un poco più laterale). Modalità compatta (< 320 px): solo braccio dal gomito, mano e telefono, come
  oggi.
- **Faccia e palla**: la palla incontra la faccia che avanza (dritto nuovo: lo schermo/palmo), non più il dorso.
  Opzione (c): **racchetta virtuale fantasma** (contorno della testa a 45 cm dalla cima, lungo l'asse del telefono, come
  `stroke-shape.js` `SHAPE.racket`): rende evidente che «il telefono è il manico» e il percorso della racchetta (carica
  dietro, arco, finale sopra la spalla) anche quando la mano è compatta; è ciò che il gioco misura davvero.
- **Fantasmi, frecce, scia**: la freccia del verso segue la **mano** (o la testa virtuale), non solo la cima; i fantasmi
  numerati restano (Carica, Impatto, Fine) con braccio e busto in contorno.
- **Costo** (oggi a 640×400 su CPU: registrazione 2,28 ms, con la rasterizzazione 3,45–3,58 ms, limite 4 ms): omero e
  busto sono 2–3 capsule e una sagoma piena senza sfumature (stima +0,3–0,6 ms); per restare sotto 4 ms si toglie la
  sfumatura dell'avambraccio (oggi uno strato fuori schermo ridisegnato e sfumato con `destination-out` a ogni
  fotogramma, `drawForearm`/`fadeForearm`; il suo peso non è stato misurato a parte) perché l'avambraccio non va più
  sfumato; la cinematica diretta costa ~1,6 µs per posa (misurato in Node) e le tabelle del moto
  restano precalcolate per scheda (`motion()`). Da rimisurare con `tools/e2e/natpf-gesti-fotogrammi.mjs`.

## 6. Piano di lavoro proposto, verifiche, rischi, non verificato

**Passi** (ognuno con i test verdi):

1. Modulo puro della catena (in `natpf_gesture_pose.js` o accanto, senza DOM): segmenti, limiti, presa canonica G per
   palmo e martello, posizione di partenza risolta (test: q0 riprodotto ≤ 0,1°, avambraccio approvato ≤ 0,1°, gomito a
   0,30 m dalla spalla, angoli dentro i limiti).
2. Strumento di composizione (script in `natpf-tennis/scripts/` o test di supporto, non nel gioco): pose chiave per
   angoli con vincoli (posizione della mano, budget di rotazione, asse della parte veloce) e misura immediata con
   `readCard` per tutte le combinazioni; le pose risultanti diventano **costanti** nel modulo (nessun calcolo in gioco).
3. Colpi orizzontali (dritto, rovescio, piatto, volée: le pose di Appendice B sono il punto di partenza; abbassare la
   salita del dritto a ~0,22 e il ritorno del rovescio a ≤ 240 °/s), poi tagliato (preparazione ≤ 140 °/s), poi palla
   corta, pallonetto, schiacciata, servizio (compensazioni), poi mira.
4. Test: tenere quelli del riconoscimento (§3.3), rifare quelli di disegno (`LIMITS`, fermo finale, scheletro rigido,
   avambraccio sfumato) e aggiungerne di fisici: lunghezze dei segmenti costanti, angoli sempre nei limiti, velocità
   articolari continue, mano mai dentro il busto, altezza della mano all'impatto per scheda (dritto 0,95–1,25 m,
   schiacciata ≥ 1,9 m, pallonetto fine ≥ 1,45 m), dritto con il palmo avanti all'impatto (coseno ≥ 0,5).
5. Disegno (§5) e fogli di controllo; prove nel browser (`natpf-modale-gesti`, `natpf-tutorial-phone`,
   `natpf-split-ready`, `natpf-training-flow`, `natpf-gesti-fotogrammi`).

**Rischi**:

- **Piatto**: la finestra della salita (±0,12 rispetto all'abituale, fino a 0,30) con due calibrazioni nel test è stretta
  (prototipo: margine 0,007); ogni cambiamento del dritto sposta il piatto.
- **Preparazioni**: con la presa approvata (schermo verso il viso) ogni carica ampia costa rotazione del telefono; le
  cariche restano **compatte** (dritto: la cima arriva a destra-avanti, non dietro) se non si vuole cambiare la posizione
  di partenza o il riconoscimento.
- **Colpi verticali**: pallonetto, schiacciata e servizio chiedono compensazioni (molti gradi di spalla con pochi gradi
  di telefono); non provati: possono richiedere più tempo di preparazione (cicli più lunghi di oggi).
- **Prese di chi imita** e **martello**: con la catena la presa diversa cambia tutto il percorso del telefono, non solo
  la partenza: il limite documentato (piatto a 50°) può spostarsi su un altro colpo (come nel B9 cambiando il raggio).
- **Immagine**: busto e testa possono «distrarre» o sembrare un personaggio incompleto; da far vedere all'utente con i
  fogli prima di integrare (decisione (b)).
- **Verità del gesto**: il dritto proposto è quello di una presa western con il telefono come manico; con la presa nel
  palmo un dritto «da manuale» con il palmo verso la rete non è possibile senza che il telefono legga la preparazione
  come un colpo (161° nello stesso verso, §0.6). Va detto all'utente.

**Non verificato**: nessuna prova con un telefono vero o con persone che imitano; tutto con il telefono simulato (sensori
ideali a 60 Hz). Il prototipo non disegna (solo stecchini) e non è stato misurato il costo del disegno nuovo. Pallonetto,
palla corta, schiacciata, servizio, mira, presa a martello e prese di chi imita non sono stati costruiti né letti. Le
misure antropometriche sono valori medi, non tarati sulla foto dell'utente. L'analisi dei fotogrammi è a occhio
(allenatore/motion designer), le misure sono quelle degli script.

## Appendice A · Nucleo del prototipo (da `scratchpad/b13/scripts/fk.mjs` e `fk-colpo.mjs`)

```js
// natpf_gesture_pose.js: add, sub, qmul, qaxis, qrot, cross, norm, omega, gripQuat
const D = Math.PI/180, Rx = a => qaxis([1, 0, 0], a*D), Ry = a => qaxis([0, 1, 0], a*D), Rz = a => qaxis([0, 0, 1], a*D);
const BODY = { pelvis: [0, 1.0, 0], sh: [.19, .42, 0], upper: .30, fore: .262 };
const WRIST_LOCAL = [.036, -.104, -.024];                      // polso nel riferimento del telefono (HAND.wrist)
// presa canonica: schermo = normale del palmo (−z della mano), cima = asse della mano (−y) girato di psi verso il pollice (+x)
function gripInHand(psi = 30){ const s = Math.sin(psi*D), c = Math.cos(psi*D), y = [s, -c, 0], z = [0, 0, -1]; return qFromCols(cross(y, z), y, z); }
function fk(j, G = gripInHand()){
  const T = qmul(Ry(j.tau), Rz(-j.lat)), S = add(BODY.pelvis, qrot(T, BODY.sh));
  const H = qmul(T, qmul(qaxis([Math.sin(j.p*D), 0, Math.cos(j.p*D)], j.e*D), Ry(j.r)));
  const E = add(S, qrot(H, [0, -BODY.upper, 0]));
  const F = qmul(H, qmul(Rx(j.b), Ry(j.pro)));
  const W = add(E, qrot(F, [0, -BODY.fore, 0]));
  const q = qmul(qmul(F, qmul(Rx(j.fl), Rz(j.dv))), G);
  return { S, E, W, q, pos: sub(W, qrot(q, WRIST_LOCAL)) };
}
// colpo: per articolazione k, tc = contatto − lag[k]; t0 = tc − acc; d = clamp(acc·|ΔCF/ΔBC|, outMin, outMax)
//   t ≤ hold: R; t < t0: R + (B−R)·mj((t−hold)/(t0−hold)); t < tc: B + (C−B)·(u − sin(πu)/π), u = (t−t0)/acc;
//   t < tc + d: C + (F−C)·(u + sin(πu)/π), u = (t−tc)/d; poi F fino a back; ritorno F → R con settle; R.
// contatto = argmax |omega(q(t), q(t+h))| (passo 1/600 s)
```

`qFromCols` è la conversione matrice (colonne x, y, z) → quaternione. Posizione di partenza:
`R = { tau: 0, lat: 0, e: 20, p: 90, r: 45.4, b: 82.7, pro: 23.6, fl: 27.4, dv: -12.3 }`.

## Appendice B · Pose provate (`colpi-finale.json`, più il tagliato) — tempi in secondi

```json
{ "forehand": { "prep": 0.75, "acc": 0.13, "lag": { "tau": 0.05, "lat": 0.05, "p": 0.025, "e": 0.025, "r": 0.012 }, "outMax": 0.3,
    "B": { "tau": -28, "lat": 6, "e": 18, "p": 45, "r": -5, "b": 72, "pro": 28, "fl": 8, "dv": -10 },
    "C": { "tau": -7, "lat": 2, "e": 22, "p": 60, "r": 15, "b": 74, "pro": 30, "fl": 10, "dv": -10 },
    "F": { "tau": 18, "lat": -3, "e": 52, "p": 100, "r": 40, "b": 100, "pro": 38, "fl": 16, "dv": -10 } },
  "backhand": { "prep": 0.75, "acc": 0.13, "lag": { "tau": 0.05, "lat": 0.05, "p": 0.025, "e": 0.025, "r": 0.012 }, "outMax": 0.3,
    "B": { "tau": 30, "lat": 4, "e": 12, "p": 130, "r": 70, "b": 85, "pro": 22, "fl": 26, "dv": -12 },
    "C": { "tau": 10, "lat": 1, "e": 22, "p": 105, "r": 52, "b": 75, "pro": 25, "fl": 22, "dv": -12 },
    "F": { "tau": -14, "lat": -3, "e": 55, "p": 65, "r": 25, "b": 60, "pro": 30, "fl": 14, "dv": -10 } },
  "flat": { "prep": 0.9, "acc": 0.105, "lag": { "tau": 0.045, "lat": 0.045, "p": 0.022, "e": 0.022, "r": 0.01 }, "outMax": 0.26,
    "B": { "tau": -30, "lat": 6, "e": 18, "p": 42, "r": -10, "b": 72, "pro": 28, "fl": 6, "dv": -10 },
    "C": { "tau": -6, "lat": 2, "e": 22, "p": 60, "r": 16, "b": 74, "pro": 30, "fl": 10, "dv": -10 },
    "F": { "tau": 26, "lat": -3, "e": 52, "p": 105, "r": 46, "b": 100, "pro": 38, "fl": 16, "dv": -10 } },
  "volley": { "prep": 0.3, "acc": 0.09, "lag": { "tau": 0.03, "lat": 0.03, "p": 0.015, "e": 0.015, "r": 0.008 }, "outMax": 0.12, "follow": 0.1, "back": 0.45, "rest": 0.5,
    "B": { "tau": -6, "lat": 2, "e": 24, "p": 75, "r": 40, "b": 82, "pro": 24, "fl": 27, "dv": -12 },
    "C": { "tau": 7, "lat": 0, "e": 30, "p": 103, "r": 53, "b": 76, "pro": 24, "fl": 27, "dv": -12 },
    "F": { "tau": 18, "lat": -2, "e": 36, "p": 124, "r": 64, "b": 72, "pro": 24, "fl": 27, "dv": -12 } },
  "slice (8/12)": { "prep": 1.0, "acc": 0.13, "lag": { "tau": 0.05, "lat": 0.05, "p": 0.025, "e": 0.025, "r": 0.012 }, "outMax": 0.3,
    "B": { "tau": -25, "lat": -4, "e": 55, "p": 50, "r": 0, "b": 95, "pro": 24, "fl": 20, "dv": -10 },
    "C": { "tau": -6, "lat": 0, "e": 38, "p": 65, "r": 18, "b": 80, "pro": 20, "fl": 18, "dv": -10 },
    "F": { "tau": 16, "lat": 3, "e": 18, "p": 95, "r": 38, "b": 62, "pro": 14, "fl": 14, "dv": -10 } } }
```

Valori predefiniti del prototipo dove non scritti: `hold` 0,35, `follow` 0,10, `back` 0,60, `rest` 0,45, `outMin` 0,10.
