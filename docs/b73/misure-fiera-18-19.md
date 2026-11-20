# B73 · Registri della fiera del 18 e 19/11: direzione dei colpi e saturazione dell'accelerazione

Prodotto: **FIERA**. Richiesta dell'utente del 20/11: «Vai avanti su 4, 6 (falli), tecnico». Qui il punto 4 (direzione dei
colpi, B36.1) e la parte «tecnico» sulla saturazione dell'accelerazione. Solo misure: **nessun file del gioco cambiato**.
Solo numeri aggregati: niente identificativi delle postazioni, niente nomi.

Fonti: i due scarichi del registro (18/11 e 19/11, file fuori dal repository), letti con
`natpf-tennis/scripts/registro/riassunto.mjs` e con script di sola lettura (Python, nella cartella di lavoro della sessione,
non nel repository). Per la saturazione anche tre sonde in Node con il telefono simulato dei test (§3.4, §4). Il metodo per
rifare i conti è nel §6. Confronto: `docs/b36/misure-torino.md` §2 (13–16/11).

## In breve

1. **La cima del telefono è imprecisa come a Torino.** Metà dei colpi entro ±58° dal proprio colpo abituale (Torino
   ±52–60°), 9 su 10 entro ±149° (±140–147°), oltre 45° il 60% (55–62%). La palla la dirige il momento del colpo: peso del
   tempo nella mira 78% (72–77%), rango tempo → rimbalzo 0,86 (0,76–0,84), cima → rimbalzo 0,35 (0,39–0,46).
2. **«La cima comanda» oggi renderebbe la direzione quasi casuale.** Con il rumore misurato, chi gira la cima di 20° avrebbe
   la palla dalla parte giusta 61 volte su 100 (a caso: 50). Il cancello del piano chiede al più il 5% di scarti oltre 45°:
   oggi sono il 60%. **B36.1 resta ferma.** Nessun gruppo (tipo di colpo, livello, mano, lato) si avvicina al cancello.
3. **Il rumore non è solo delle persone.** Dei colpi con la cima, circa due su tre l'hanno sparsa in modo quasi uniforme su
   tutto il giro (anche «all'indietro»); lo scarto è più largo con i movimenti più violenti a parità di forza del colpo;
   metà dei colpi non ha la cima. In più c'è un indizio forte che il codice legga gli assi del giroscopio di Chrome su Android in un ordine
   diverso da quello vero (§4): da verificare su un telefono prima di decidere la B36.1.
4. **La saturazione dell'accelerazione pesa poco.** Tempo del colpo, forza, km/h, colpo super, verso e cima vengono dal
   giroscopio. L'accelerazione entra solo nella «salita della testa» (tipo di colpo). Nei registri, a parità di forza, tipo
   di colpo, lato, «Perfetto» e km/h non cambiano con la saturazione. Con il telefono simulato e un fondo scala di 8 g cambia
   il tipo in 12 gesti su 540 (2,2%, pallonetti forti letti top spin), mai il lato. **Nessuna correzione urgente**; una
   proposta a bassa priorità nel §3.5.

---

## 1. Dati

| | 18/11 | 19/11 | Totale |
| --- | --- | --- | --- |
| Partite | 263 | 62 | 325 (17.4: 105 · 18.3: 220) |
| Colpi della racchetta in partita | 4483 | 1135 | 5618 (più 1924 negli scambi di prova, esclusi) |
| Stesso schermo | | | 292 partite, 5195 colpi (92%) |
| Contro l'avversario | | | 33 partite, 423 colpi: adulto · evento 16, ragazzo · casual 14, leggenda 2, bambino 1 |
| Colpi di mancini | | | 416 |

Telefoni: tutti Android 17 con Chrome 157 nell'app 1.0.4, LAN. Campi della direzione (B36.0) in 325 partite su 325.
Misure dei sensori (B66) solo nella 18.3: 219 partite, 437 telefoni-partita. Nessuna partita a Precision.

## 2. Direzione dei colpi

Definizioni come nel riassunto (`docs/b36/misure-b36-0.md` §4). Scarto della cima (`dv`): gradi dal proprio colpo
abituale, + a destra. Piatto (`pf`): la mira della cima che il gioco usa, −1…+1. Tempo (`tu`): unità della finestra della
direzione. Rimbalzo (`rx`) nel riferimento di chi colpisce.

### 2.1 Confronto con Torino

| Misura | Torino 13–16/11 | Fiera 18–19/11 |
| --- | --- | --- |
| Colpi con lo scarto della cima | non misurato | **51%** (2866 su 5618) |
| Mediana dello scarto | 1–5° | 0,2° |
| Metà dei colpi entro | ±52–60° | **±58°** |
| 9 su 10 entro | ±140–147° | **±149°** |
| Oltre 45° | 55–62% | **60%** |
| Centro della mira per partita (primi 20 colpi, metà · 9 su 10) | 29° · 80° | 22° · 76° (67 giocatori-partita con almeno 10 scarti) |
| Peso del tempo nella mira | 72–77% | **78%** |
| Rango tempo → rimbalzo | 0,76–0,84 | **0,86** |
| Rango cima (piatto) → rimbalzo | 0,39–0,46 | **0,35** |
| E4: primi 10 colpi con \|piatto\| ≥ 0,5 (obiettivo ≥ 30%) | 17–21% | 16% stesso schermo, 22% adulto · evento |
| E3: fuori con il tempo nella finestra | 0–0,2% | 0,4–0,7% |

Le partite sono corte (un game, ~11 colpi a giocatore): solo 67 giocatori-partita hanno 10 scarti nei primi 20 colpi.

### 2.2 Per gruppo

| Gruppo | Colpi | Con lo scarto | Mediana | Metà entro ± | 9 su 10 entro ± | Oltre 45° | Peso del tempo | Cima → rimbalzo | Tempo → rimbalzo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tutti | 5618 | 51% | 0° | 58° | 149° | 60% | 78% | 0,35 | 0,86 |
| Avversario · adulto · evento | 249 | 67% | **−15°** | 46° | 128° | 53% | 67% | 0,47 | 0,81 |
| Avversario · ragazzo · casual (pochi) | 150 | 49% | +12° | 55° | 138° | 52% | 78% | 0,33 | 0,84 |
| Stesso schermo | 5195 | 50% | +1° | 59° | 150° | 60% | 79% | 0,35 | 0,87 |
| Top spin | 2090 | 53% | −2° | 50° | 142° | 54% | 76% | 0,38 | 0,86 |
| Piatto | 471 | 61% | −1° | **42°** | 139° | 48% | 69% | 0,40 | 0,78 |
| Tagliato | 1507 | 48% | +5° | 61° | 151° | 64% | 80% | 0,34 | 0,86 |
| Pallonetto | 708 | 52% | +13° | 67° | 154° | 61% | 80% | 0,44 | 0,86 |
| Schiacciata | 501 | 54% | +5° | **87°** | 155° | 76% | 85% | 0,28 | 0,91 |
| Palla corta | 341 | 33% | −19° | 74° | 147° | 69% | 90% | 0,20 | 0,93 |
| Destri | 5202 | 51% | +1° | 59° | 149° | 60% | 78% | 0,36 | 0,86 |
| Mancini | 416 | 45% | −5° | 51° | 135° | 57% | 80% | 0,31 | 0,87 |
| Lato dalla parte della palla | 3495 | 48% | −1° | 54° | 145° | 57% | 78% | 0,38 | 0,84 |
| Lato opposto alla palla | 2111 | 56% | +4° | 65° | 152° | 63% | 78% | 0,32 | 0,90 |
| Forza sotto 0,5 | 1511 | 42% | −1° | 65° | 153° | 62% | 85% | 0,31 | 0,91 |
| Forza da 0,8 | 2689 | 55% | +3° | 62° | 150° | 62% | 77% | 0,38 | 0,83 |
| Voto «Perfetto» | 1374 | 53% | −1° | 57° | 148° | 59% | 56% | 0,58 | 0,29 |
| 18/11 · 19/11 | 4483 · 1135 | 51% · 51% | +1° · −2° | 62° · 46° | 150° · 143° | 62% · 52% | 79% · 75% | 0,35 · 0,38 | 0,87 · 0,85 |
| 17.4 · 18.3 | 1708 · 3910 | 56% · 49% | +3° · 0° | 61° · 57° | 151° · 148° | 62% · 58% | 77% · 79% | 0,35 · 0,35 | 0,86 · 0,86 |

Leggenda (21 colpi) e bambino (3) sono troppo pochi. Note:
- **Tipo di colpo**: il piatto è il meno peggio (metà entro ±42°), la schiacciata è casuale. Nessuno arriva vicino al cancello.
- **Livello**: contro l'avversario ad adulto · evento la cima è un poco più stretta, ma il centro è spostato di −15° (il
  colpo «abituale» imparato non è quello vero). Nello stesso schermo P1 e P2 sono uguali (±59°).
- **Mano**: i mancini non sono peggio (±51°, 416 colpi, ma con lo scarto solo il 45%).
- **Lato rispetto alla palla**: nei colpi giocati con il lato opposto alla palla la cima è più larga (±65° contro ±54°).
  I colpi «con il lato dalla palla» del B71 (campo `ls`) non ci sono in questi registri: arrivano con la 19.1.
- **Tempo**: con il voto «Perfetto» il tempo pesa meno (56%) e la cima conta di più (rango 0,58), ma la cima è larga uguale:
  non è che chi colpisce a tempo mira meglio con la cima.
- **Ordine del colpo nella partita**: metà entro ±60° nei primi 5 colpi con lo scarto, ±58° dal 6° al 10°, ±51° dall'11° al
  15° (178 colpi), ±46° dal 16° al 20° (39 colpi): forse migliora un poco, ma con pochi colpi.
- **Movimenti violenti** (campioni saturi dell'accelerazione per gesto, solo 18.3, terzili): metà entro ±44° · ±58° · ±72°,
  oltre 45° 49% · 58% · 66%. **A parità di forza del colpo** resta così: forza sotto 0,6 ±45° · ±68° · ±82°; da 0,6 a 0,9
  ±43° · ±47° · ±58°; da 0,9 ±44° · ±58° · ±76°. La cima non usa l'accelerazione durante il colpo (§3.2): la saturazione qui
  è un segno di movimenti bruschi, che rovinano la misura della cima (giroscopio integrato a 60 Hz).

### 2.3 Com'è fatto il rumore

- **Due parti.** Istogramma dello scarto a passi di 15°: un picco attorno a 0, poi da ±90° a ±180° un fondo piatto (2,2–3,4%
  ogni 15°, da tutte e due le parti). Un terzo dei colpi (34%) ha la cima oltre ±90°, cioè «all'indietro» rispetto al proprio
  colpo: nessuno mira così. Con un modello «normale + uniforme» il 37% dei colpi sta in una parte concentrata (centro +1°,
  deviazione 45°) e il **63% è sparso uniforme su tutto il giro**. Anche la parte concentrata è larga 45°, il doppio o il
  triplo di un giro voluto (15–25°).
- **Dentro la stessa partita** (121 giocatori-partita con almeno 8 scarti): dispersione robusta (1,48 × deviazione mediana)
  di 59° a metà dei giocatori; solo 1 su 10 sotto 27°; 6 su 121 sotto 20°.
- **Due colpi di fila dello stesso verso**: correlazione 0,23; la differenza fra i due è metà entro 50°.
- **Cima e tempo sono indipendenti** (rango 0,01): le persone non girano la cima e anticipano insieme.
- **Oggi la cima conta in un colpo su quattro**: il piatto è diverso da 0 solo con lo scarto tra 3° e 60°
  (`faceAimFromDev`, `natpf_stroke_intent.js:196`): 1373 colpi su 5618 (24%). Degli altri: il 49% dei colpi non ha lo scarto
  (il centro della mira non c'è ancora o il gesto non ha un verso; lo scarto c'è nel 44% dei primi 5 colpi e nel 69% dopo il
  15°), il 25% ha lo scarto oltre 60° e il 2% entro 3°.

### 2.4 Conclusione per la B36.1

Il piano (`docs/b36/piano-direzionalita.md` §1 punto 8) dice di tornare dall'utente se la cima è troppo imprecisa. Il cancello
(`docs/b36/misure-b36-0.md` §4) chiede giro voluto entro circa 15°, cima verso la zona in almeno 8 palle su 10, scarti oltre
45° al più il 5%.

| | Cancello | Oggi |
| --- | --- | --- |
| Scarti oltre 45° | ≤ 5% | **60%** (12 volte di più) |
| Metà dei colpi entro | — (giro voluto ~15°) | ±58° (4 volte il giro voluto) |
| Colpi che hanno la cima | — | 51% |

Se lo scarto di oggi fosse tutto rumore (è una stima per eccesso: contiene anche le mire volute), chi gira la cima di
**10° · 15° · 20° · 25°** avrebbe la cima dalla parte giusta **56% · 59% · 61% · 63%** delle volte (50% = a caso); solo top spin
e piatto, a 20°: 61%. Il rumore sta entro ±15° solo nel 16% dei colpi.

**La cima è ancora troppo imprecisa per «la cima comanda»**: con la regola nuova un visitatore che gira la cima vedrebbe la
palla andare dalla parte voluta 6 volte su 10, e metà dei colpi non avrebbero proprio la cima. **B36.1 resta ferma.** Prima di
riparlarne servono: (a) la verifica dell'ordine degli assi (§4) e, se c'è l'errore, la correzione e una giornata di registro
nuova; (b) il registro della 19.1, che ha i sensori dall'app senza buchi (`sr`), il fondo scala (`fs`, `vs`) e il lato dalla
palla (`ls`); (c) la prova a Precision con lo staff (`docs/b36/misure-b36-0.md` §6), mai fatta: è l'unico modo per separare il
giro voluto dal rumore.

## 3. Saturazione dell'accelerazione

### 3.1 Quanto

- Partite 18.3 con le misure dei sensori: 219; telefoni-partita 437. Con almeno un campione saturo: **423 su 437 (97%)**,
  217 partite su 219.
- I 14 telefoni-partita senza saturazione: 12 senza nessun colpo (partite abbandonate o telefono fermo), 2 con 3 e 5 colpi.
  Un confronto diretto «colpi con e senza campioni saturi» non si può fare (8 colpi senza): sotto si confronta **quanta**
  saturazione (terzili).
- Campioni saturi: 30.306 su 1.550.851 (**1,95%**). Per gesto (colpi e servizi della partita): **5,8** in media; per
  telefono-partita 1 su 10 sotto 1,1, metà sotto 5,6, 9 su 10 sotto 10,9. Cioè circa 100 ms a 60 Hz attorno al picco (il
  conto del 19/11 diceva ~2,3 per colpo con un altro denominatore; l'ordine di grandezza è lo stesso: pochi campioni per gesto).
- Rotazione al fondo scala: 986 campioni (0,19 per gesto); 113 telefoni-partita senza. Il giroscopio arriva al massimo solo
  nei gesti più forti (a quel punto la forza è già 1).
- Più saturazione con i giocatori più forti: rango con il colpo tipico (giroscopio) 0,46, con la forza media 0,53.
- Come si conta (`phone-stats.js:12, 45`): un valore ≥ 15 m/s² uguale in due campioni di fila su un asse. Con
  l'arrotondamento di Chrome a 0,1 m/s² una coincidenza vicino al picco è possibile ma rara; la rotazione, contata allo
  stesso modo, ha 30 volte meno campioni: non sono campioni doppi. Il fondo scala vero del telefono non si sa: il registro
  della 19.1 (app 1.0.5) porta `fs` (dichiarato) e `vs` (valore più grande visto).

### 3.2 Cosa usa l'accelerazione nel codice

| Decisione | Sensore | Dove |
| --- | --- | --- |
| Inizio del gesto, picco, istante del colpo (tempo, voto «Perfetto», colpo a vuoto) | giroscopio | `swing-detect.js:262, 402` |
| Forza, km/h, colpo super, gesto debole | giroscopio (picco) | `swing-detect.js:435`, `natpf_stroke_intent.js:84` |
| Verso (dritto o rovescio) | giroscopio (asse; giro attorno alla verticale con la gravità `accG − acc`) | `swing-detect.js:304` |
| Cima (scarto, piatto) | giroscopio integrato; l'accelerometro corregge l'inclinazione **solo da fermo** (\|a − g\| < 1,8, lineare < 1,5, rotazione < 120 °/s) | `face-tracker.js:112–117` |
| **Tipo di colpo** (pallonetto, tagliato, palla corta, schiacciata, top spin o piatto), traiettoria del top spin, tipo di servizio | **salita della testa** (`rise`) = velocità della mano (**accelerazione integrata**) + rotazione × racchetta | `stroke-shape.js:71, 77`; `natpf_stroke_intent.js:107`; `natpf_stroke_outcome.js:372, 536, 660` |
| `lift` del telefono (pallonetto e tagliato del telefono) | accelerazione lineare | `swing-detect.js:321, 375, 437`; il gioco lo usa solo senza la forma del colpo (`natpf_phone_racket.js:318`) e per un ritocco di ±0,1 di `dirY` (`:333`) |

La gravità `accG − acc` non cambia con il taglio se Android calcola l'accelerazione lineare dal sensore tagliato (tolgono la
stessa gravità). Quindi la saturazione può toccare **solo il tipo di colpo**, attraverso la parte «mano» della salita.

### 3.3 Nel registro

Telefoni-partita della 18.3 con almeno 5 gesti e un colpo: 413 (3885 colpi), in terzili di campioni saturi per gesto.

| | Bassa (< 3,5) | Media (3,5–7,75) | Alta (≥ 7,75) |
| --- | --- | --- | --- |
| Colpi | 1254 | 1337 | 1294 |
| Forza media | 0,58 | 0,68 | 0,77 |
| km/h (mediana) | 89 | 101 | 104 |
| «Perfetto» | 22% | 26% | 26% |
| Lato opposto alla palla | 38% | 38% | 37% |
| Top spin · piatto · tagliato · pallonetto · schiacciata · palla corta | 39 · 7 · 28 · 12 · 7 · 8% | 37 · 8 · 26 · 11 · 11 · 7% | 34 · 10 · 27 · 14 · 10 · 5% |
| Colpi a vuoto (per colpo) | 19,9% | 20,6% | 22,3% (più «tardi») |
| Fuori o in rete | 4,5% | 4,7% | 4,1% |

**A parità di forza** (dal giroscopio) le differenze non vanno in un verso:
- forza da 0,8 (350 · 660 · 827 colpi): pallonetto 10 · 11 · 11%, tagliato 35 · 32 · 30%, top spin 29 · 30 · 32%, piatto
  15 · 13 · 14%, lato opposto 36 · 39 · 41%, km/h 114 · 118 · 118, «Perfetto» 27 · 32 · 28%;
- forza 0,5–0,8 (456 · 308 · 218): pallonetto 11 · 9 · 17%, tagliato 32 · 28 · 29%, lato opposto 39 · 37 · 36%;
- forza sotto 0,5 (448 · 369 · 249): pallonetto 14 · 13 · 17%, palla corta 23 · 23 · 23%, lato opposto 39 · 39 · 25%.

Correlazioni parziali per telefono-partita, tolto il colpo tipico: quote dei tipi di colpo tra −0,05 e +0,08, palla corta
−0,19 (chi satura di più fa gesti più forti del proprio colpo tipico, e la palla corta è un gesto morbido), lato opposto
+0,04, forza +0,39. «Colpi deboli»: il registro non ha nessuna riga `e: debole` in partita in questi due giorni e 1–4 colpi a
vuoto «debole» per terzile: niente da confrontare. **Nel registro la saturazione non si vede sul riconoscimento.**

### 3.4 Prova con il telefono simulato

Sonda di sola lettura: copia del telefono simulato dei test (`natpf-tennis/test/phone-sim.mjs`, con un taglio dei tre assi
a un fondo scala e l'accelerazione lineare = accelerazione tagliata − gravità) mossa dal braccio di `arm-sim.mjs`.
Gesti: dritto, rovescio e tagliato a 1×, 1,5× e 2× la velocità di `STROKES` (650 · 600 · 600 °/s), pallonetti a 1× e 1,5×,
palle corte; prese inclinate 0°, 30°, 60°; 2 semi; 6 colpi di fila ciascuno (calibrazione compresa, con il taglio). Stessa
sequenza senza e con il taglio: 540 gesti per fondo scala.

| | 8 g (78,5 m/s²) | 4 g (39,2 m/s²) |
| --- | --- | --- |
| Gesti con almeno un campione tagliato | 264 su 540 | 468 su 540 |
| Campioni tagliati per gesto (media) | 4,5 (la fiera: 5,8) | 10,6 |
| **Tipo di colpo diverso** | **12 (2,2%)**: pallonetti forti (780 °/s) con il telefono dritto, letti top spin (salita 0,71 → 0,49) | 44 (8%): gli stessi pallonetti; dritti e rovesci a 2× con la presa a 60°, piatto → top spin |
| Lato diverso | 0 | 0 |
| Picco del giroscopio diverso | 0 | 0 |
| Salita della testa, differenza media | 0,025 | 0,081 |
| Velocità della mano stimata | 6,80 → 5,83 m/s (−14%) | 6,80 → 4,30 m/s |

(In 10 gesti a 8 g cambia la forza dell'esito, non il picco: effetto indiretto del colpo letto diverso.)

### 3.5 Conclusione e proposta

**La saturazione pesa poco sul riconoscimento.** Tempo, forza, km/h, colpo super, verso e cima non usano l'accelerazione
durante il colpo. Può spostare solo il tipo di colpo dei gesti vicini a una soglia (simulato a 8 g: 2% dei gesti, quasi solo
pallonetti forti); nei registri non si vede. **Nessuna correzione urgente.** «Stimare il picco dal giroscopio» non serve: la
forza viene già dal picco del giroscopio.

Proposta a bassa priorità, solo se il registro della 19.1 conferma un fondo scala di 8 g (`fs`, `vs`): in `stroke-shape.js`,
nei campioni con un asse al fondo scala, non lasciar calare la velocità della mano. Due varianti da provare con la sonda del
§3.4 trasformata in test: (a) stimare l'accelerazione centripeta mancante dal giroscopio (ω × (ω × r), con r stimato dai
campioni non tagliati dello stesso gesto); (b) nei gesti tagliati prendere la salita dalla sola rotazione della racchetta.
Guadagno atteso: al più il 2% dei gesti (i pallonetti forti). Circa un giorno con le prove (`natpf-gesti-speciali`,
`natpf-gesture-*`, gesti veri del 28/10, telefono simulato con il fondo scala). Rischio medio: tocca il tipo di colpo.

## 4. Indizio tecnico: l'ordine degli assi del giroscopio (da verificare)

- **Cosa fa il codice**: `face-tracker.js:112` legge la rotazione come `[β, γ, α]` = (x, y, z), cioè α attorno a z, β attorno a
  x, γ attorno a y (la specifica W3C); `swing-detect.js:304` confronta la rotazione con la gravità nello stesso ordine.
- **Cosa manda Chrome su Android**: `docs/b71/sensori.md` (19/11, dal codice di Chromium) dice α = x, β = y, γ = z; l'app 1.0.5
  copia quell'ordine. Il documento lo nota e tiene l'ordine di Chrome «perché il riconoscimento è tarato su quei numeri», ma
  non dice che `face-tracker.js` e `swing-detect.js` li leggono come W3C.
- **Prova sui campioni veri del 28/10** (`tools/test/session-28-10.data.mjs`: 5 finestre di 1–1,2 s, telefono Android con
  Chrome): integrando il giroscopio si prevede dove va la gravità e la si confronta con quella misurata, campione per campione.
  Con l'ordine di Chrome (α = x) l'errore mediano per finestra è **5–10°**; con l'ordine che usa il codice (α = z) **31–98°**;
  con la terza permutazione 36–85°. Solo i campioni quasi fermi, con la sola gravità misurata dall'accelerometro (21 nel
  dritto): 4,2° (al più 14°) con l'ordine di Chrome, 13,5° (al più 87°) con quello del codice.
- **Quanto pesa, nel telefono simulato** (gesti con la cima girata di −20…+20° prima del colpo, come `scripts/audit/colpi.mjs`;
  4 semi × 40 colpi): mandando la rotazione nell'ordine di Chrome al codice di oggi, l'errore della cima sale da 1,6–2,8° a
  3,7–5,2° e, con il profilo semplice e gesti variabili, il 4% dei colpi perde il lato giusto. Nel simulato **non basta** a
  spiegare i ±58° della fiera, ma è un errore vero da togliere prima di misurare di nuovo la cima.
- **Da fare**: verificarlo sul telefono dello stand (girare lentamente il telefono di 90° attorno al lato lungo e vedere quale
  valore si muove: β = ordine di Chrome) e, se confermato, correggerlo in un blocco a parte con le prove dei gesti (gesti veri
  del 23 e 28/10, telefono simulato anche nell'ordine di Chrome): tutte le soglie dei gesti sono state tarate con l'ordine di
  oggi. Qui non è stato cambiato niente.

## 5. Prossimi passi consigliati

1. Verifica dell'ordine degli assi sul telefono (§4); se c'è l'errore, blocco di correzione con le prove.
2. Con il registro della 19.1: rifare queste misure (cima con i sensori dall'app senza buchi, `fs` e `vs` per il fondo scala,
   `ls` e `vc` per il lato dalla palla).
3. Prova a Precision con lo staff (15–20 minuti, `docs/b36/misure-b36-0.md` §6).
4. Solo dopo, la decisione sulla B36.1 con l'utente. La correzione della saturazione (§3.5) solo se il punto 2 dice 8 g.

## 6. Come rifare i conti

- Riassunto: `node natpf-tennis/scripts/registro/riassunto.mjs <cartella con i due .jsonl> --out=<cartella>` (sezione
  «Direzione»).
- Colpi: righe `colpo` senza `amb` (in partita), con il contesto della riga `partita` (modo, livello, mano, versione) dello
  stesso giorno, postazione e numero `n`. Scarto `dv`; piatto `pf`; rimbalzo nel riferimento di chi colpisce `rx` (× −1 per il
  P2, `chi: 'a'`). Peso del tempo: Σ\|d − pf\| / (Σ\|d − pf\| + Σ\|pf\|). Ranghi: Spearman tra `pf` e il rimbalzo, e tra
  −`lato`·`tu` e il rimbalzo. Centro per partita: \|mediana\| dei primi 20 scarti, con almeno 10. Lato opposto: `lato` = −`pl`.
- Modello del rumore: normale + uniforme su ±180° stimato con l'algoritmo EM sugli scarti.
- Saturazione: `tq.<g|a>.sat` = [accelerazione, rotazione] della riga `partita.fine` (assente = 0), diviso i colpi e i
  servizi dello stesso telefono nella partita; terzili sui telefoni-partita con almeno 5 gesti.
- Sonde in Node (dentro `natpf-tennis`, `node --import ./test/register.mjs <file>`): copia di `test/phone-sim.mjs` con il
  taglio e l'ordine degli assi come opzioni, braccio di `test/arm-sim.mjs`. Gli script sono nella cartella di lavoro della
  sessione, non nel repository: se servono di nuovo, conviene farne una prova vera (§3.5, §4).

## 7. Non verificato

- Il fondo scala del telefono dello stand (8 g è un'ipotesi; i registri del 18–19/11 non lo hanno).
- L'ordine degli assi sul telefono dello stand: provato solo sui 5 brani del 28/10 (un telefono, una persona).
- Le sonde usano il telefono e il braccio simulati: misurano quanto il codice è sensibile, non i visitatori veri.
- Le mire volute dei visitatori: il registro non sa cosa volevano fare (serve la prova a Precision).
- Telefono vero, programma Windows, browser: niente provato fuori da Node.
