# B18.2 · tappa 2, passo 1 · Personaggi fermi a ogni servizio e un servizio che conta

Difetto 11 del rapporto B16 (`docs/b16/rapporto-gameplay.md` §2, appendice D11). Base: `natpf-simulator` a `f0e66d3`
(versione 2026-11-10.2). Lavoro fatto in una worktree, senza push e senza toccare `natpf-simulator` o `main`. I file di
versione e i documenti di ripresa non sono toccati.

## Niente da accendere

Vale sempre, in ogni partita contro la CPU (Casual, Pro, Leggenda). Non c'è nessuna opzione nuova.

Nello stesso schermo e nella sfida tra due computer risponde una persona: lì cambia solo che i personaggi non corrono più
sul posto nelle pause.

## Cosa cambia per chi gioca

1. **Tra un punto e l'altro nessuno corre più sul posto.** Prima, quando il punto finiva, i personaggi tenevano la
   velocità dell'ultimo istante: nella pausa le gambe continuavano a correre da fermi, e al servizio dopo la CPU ripartiva
   con quella velocità, spesso nel verso sbagliato. Adesso a fine punto e a ogni servizio tutti e quattro sono fermi.
2. **Gli ace «regalati» non ci sono più.** Tutti gli ace di prima nascevano da quello scatto sbagliato della CPU. Con la
   CPU ferma un ace arriva solo con un servizio che lo merita.
3. **Il servizio adesso conta.** Tre cose rendono difficile la risposta della CPU:
   - **la velocità** della palla, quella che si legge sul tabellone: sotto 160 km/h non conta, da 190 km/h conta piena
     (il servizio insegnato nel tutorial parte a circa 157 km/h, uno forte a 190–195);
   - **la strettezza**: quanto la palla cade vicino alle righe del quadrato, verso l'esterno o verso il centro del campo
     (la «T»). Al centro del quadrato non conta;
   - **il tempo del colpo**: conta solo il servizio colpito a tempo, in cima al lancio. Colpito mezzo secondo tardi non
     vale niente, anche se forte.
4. **Il servizio forte e angolato la CPU lo legge in ritardo.** Resta ferma un attimo (da 5 a 20 centesimi di secondo)
   prima di partire. Sul servizio esterno a volte non ci arriva: è un ace vero, e lo schermo scrive «Ace!». Altre volte
   ci arriva in allungo e sbaglia, oppure rimanda una palla debole.
5. **Un servizio normale vale come prima, uno in ritardo vale meno.** Chi batte come nel tutorial trova la stessa CPU di
   prima. Chi colpisce tardi fa meno punti diretti di prima, e la CPU attacca un po' più spesso la risposta.
6. **Per livello.** Con il servizio perfetto, forte e sulla riga, il punto arriva subito (ace o risposta sbagliata) circa
   una volta su quattro o cinque a Casual, una su sette o otto a Pro, una su venti a Leggenda.
7. **La Leggenda non è più debole.** Contro i giocatori simulati vince gli stessi game di prima, dentro l'errore della
   misura. Cede qualcosa solo a chi batte un servizio forte e stretto: circa 3 punti in più ogni 100 servizi così.

## Come funziona (per chi mette le mani nel codice)

**Fermi.** `game_engine._natpfStandStill()` azzera la velocità dei quattro personaggi:
- a fine punto (`_awardPoint`), così le gambe si fermano subito;
- a ogni servizio (`_setupPointServe`), dove azzera anche lo stato della corsa dell'animazione (`rig.prevLocalVelX/Z`,
  `wasMoving`): il personaggio spostato sulla riga del servizio non fa il gesto della frenata;
- sul computer del Player 2 della sfida tra due computer, dove il punto lo chiude l'host (fase `POINT_OVER` arrivata con
  lo snapshot).

Il motore muove i personaggi solo con la palla in gioco. Chi gioca non ha inerzia, quindi per lui era solo un difetto
dell'animazione. La CPU invece accelera e frena (`natpf_skill.cpuStep`, `natpf_legend.legendStep`): per lei la velocità
rimasta cambiava il gioco.

**Minaccia del servizio.** `natpf_skill.serveInfo({ speed, q, x, box })` dà tre numeri da 0 a 1:

| numero | da cosa | 0 | 1 |
|---|---|---|---|
| `fast` (velocità) | velocità vera della palla alla partenza, in km/h del tabellone | fino a 160 km/h | da 190 km/h |
| `tight` (strettezza) | distanza del rimbalzo dal centro del quadrato, su 1,77 m utili | fino al 45% | dal 90% |
| `clean` (tempo) | qualità del tempo del colpo (`q` di `serveOutcome`) | `q` ≤ 0,55 | `q` = 1 |

- `threat` (minaccia) = tempo × (0,7 × velocità + 0,1 × strettezza + 0,2 × velocità × strettezza). Vale 1 solo per il
  servizio perfetto, forte e sulla riga; 0,7 per uno forte ma al centro; 0,1 per uno piano sulla riga; 0 per quello
  insegnato.
- `sharp` (forte e angolato) = tempo × velocità × strettezza. È quello che la CPU legge in ritardo.

Si usa la velocità vera e non la forza del gesto. Con webcam, mouse e nelle prove simulate il servizio è un kick lento
(133–146 km/h) anche con un gesto forte: non conta come servizio forte.

**Effetti per livello** (`natpf_skill.SERVE_WEIGHT`, `natpf_legend.LEGEND.serveQ`):

| | Casual | Pro | Leggenda |
|---|---|---|---|
| errore in risposta, base (servizio a tempo) | 13,5% | 4,5% | nessun dado |
| in più con la minaccia piena | +5% | +5% | — |
| servizio fuori tempo | 60% della base | 60% della base | — |
| allungo vero all'impatto | metà di quello degli scambi | metà | regole di chi gioca |
| qualità della risposta con la minaccia piena | — | — | −15% |
| lettura in ritardo con `sharp` 1 (± 35%) | 0,075 s | 0,135 s | 0,15 s |
| pressione sullo scambio con la minaccia piena | 1 | 1 | — |

- A Casual e Pro la probabilità d'errore della risposta (`cpuServeErrorChance`) dipende dal servizio ricevuto. Prima
  usava la qualità dell'ultimo colpo del punto prima (`lastQuality`, mai azzerata) e l'angolo dal centro del campo: un
  servizio alla «T» valeva zero. Adesso `lastQuality` riparte a ogni punto (`resetRally`).
- A Leggenda non c'è dado: la qualità del colpo di risposta scende con la minaccia, e l'errore nasce dalle stesse regole
  di chi gioca. Sul servizio normale non cambia niente.
- La lettura in ritardo usa lo stesso piano di corsa degli scambi (`cpuPlan`, `tickCpuRun`): ferma fino a un certo
  istante, poi verso il punto d'incontro. A Casual il ritardo è più corto che a Pro perché la CPU di Casual è più lenta:
  le basta meno per non arrivare.
- Per l'attacco della CPU sulla risposta conta il tempo del servizio ricevuto, non più il colpo del punto prima.
- Vale solo quando batte chi gioca e risponde la CPU (`!isMultiplayer`, `registerServe` in `_executeServeHit`). Le palle
  del lanciapalle degli esercizi non sono servizi (`serveInPlay` le esclude).
- La diagnostica registra, a ogni servizio di chi gioca contro la CPU, `minaccia`, `stretto` e `ritardoCpuMs`.
- **Per i livelli nuovi della tappa 2** (Evento, Bambini): ogni livello contro la CPU deve avere la sua riga in
  `SERVE_WEIGHT`. Senza, il suo servizio non ha peso e la risposta torna alla regola degli scambi.

## File toccati

| file | cosa |
|---|---|
| `natpf-tennis/src/game_engine.js` | `_natpfStandStill`; chiamate in `_setupPointServe`, `_awardPoint` e nella fase `POINT_OVER` del Player 2; `NS.registerServe` in `_executeServeHit` |
| `natpf-tennis/src/natpf/natpf_skill.js` | `SERVE_WEIGHT`, `serveTuning`, `serveInfo`, `registerServe`, `serveInPlay`, `cpuServeErrorChance`; `resetRally` azzera `lastQuality` e `serve`; `cpuReturnPlan` usa il servizio ricevuto |
| `natpf-tennis/src/natpf/natpf_legend.js` | `LEGEND.serveQ`; qualità della risposta al servizio in `legendDecide` |
| `natpf-tennis/src/natpf/diag/diag_recorder.js` | riga «servizio»: `minaccia`, `stretto`, `ritardoCpuMs` |
| `natpf-tennis/scripts/audit/servizio.mjs` | **nuovo**: banco del servizio (`npm run audit:serve`) |
| `natpf-tennis/scripts/audit/rally-balance.mjs` | `simulate` accetta `serve`: il servizio lo sceglie il banco. Senza, non cambia niente |
| `natpf-tennis/package.json` | comando `audit:serve` |
| `natpf-tennis/test/natpf-b18-t2-servizio.test.mjs` | **nuovo**: 10 prove |
| `natpf-tennis/test/natpf-racchetta-motore.test.mjs` | la prova della diagnostica controlla i campi nuovi |
| `tools/e2e/natpf-servizio-peso.mjs` | **nuovo**: prova nel browser |
| `tools/e2e/natpf-rally.mjs` | una verifica in più: nella pausa nessuno corre sul posto |

## Misure prima e dopo

Tutte dal gioco simulato: motore vero senza disegno, semi fissi. «Prima» è `f0e66d3`. Lo scambio dopo il servizio lo
gioca il profilo «amatore». Gli script:

```sh
cd natpf-tennis
npm run audit:serve                        # banco: chi gioca batte ogni punto, un tipo di servizio alla volta
npm run audit:serve -- --naturale          # partite normali, servizio dei profili
npm run audit:serve -- --fermi             # il gioco di prima, con la sola correzione dei personaggi fermi
npm run audit:serve -- --tipi=perfettoEsterno,perfettoT,massimoEsterno,pianoStretto
npm run audit:legend                       # criteri della Leggenda
npm run audit:legend -- --table            # game e punti per livello × profilo
```

I tipi di servizio del banco (gesto del telefono con la forma, come lo manda la pagina del telefono):

| tipo | forza | tempo | direzione | km/h |
|---|---|---|---|---|
| tutorial | 0,5 (il proprio colpo tipico) | a tempo | quella del servizio insegnato | 157 |
| piatto forte | 0,9 | a tempo | quella del servizio insegnato | 193 |
| perfetto forte stretto | 0,9 | a tempo | sulla riga, metà esterni e metà alla «T» | 194 |
| in ritardo | 0,5 | 0,5 s dopo la cima del lancio | servizio insegnato | 152 |
| forte in ritardo | 0,9 | 0,5 s dopo la cima del lancio | servizio insegnato | 178 |

### 1. Punto diretto per livello e tipo di servizio

Punto diretto = ace (la CPU non tocca la palla) + risposta sbagliata (la tocca e la manda in rete o fuori). Banco, 8 semi
× 400 servizi = 3200 servizi per casella. Errore statistico circa ±1,5 punti a Casual, ±1 a Pro e Leggenda.

«Prima» è il gioco com'era. «Prima, fermi» è il gioco di prima con la sola correzione dei personaggi fermi: fa vedere
quanto valeva il servizio senza il difetto.

| livello | servizio | prima: ace | prima: diretto | prima, fermi: diretto | dopo: ace | dopo: sbagliata | **dopo: diretto** |
|---|---|---|---|---|---|---|---|
| Casual | tutorial | 9,9% | 22,8% | 13,8% | 0% | 13,0% | **13,0%** |
| Casual | piatto forte | 9,8% | 23,7% | 15,1% | 0% | 16,3% | **16,3%** |
| Casual | perfetto forte stretto | 16,9% | 33,0% | 17,9% | 4,5% | 18,1% | **22,5%** |
| Casual | in ritardo | 7,1% | 19,7% | 13,4% | 0% | 8,9% | **8,9%** |
| Casual | forte in ritardo | 8,7% | 22,3% | 14,3% | 0% | 9,2% | **9,2%** |
| Pro | tutorial | 6,7% | 12,5% | 5,6% | 0% | 4,7% | **4,7%** |
| Pro | piatto forte | 10,4% | 15,8% | 6,0% | 0% | 7,8% | **7,8%** |
| Pro | perfetto forte stretto | 16,7% | 22,8% | 7,4% | 2,9% | 10,4% | **13,4%** |
| Pro | in ritardo | 5,9% | 10,7% | 3,9% | 0% | 2,9% | **2,9%** |
| Pro | forte in ritardo | 8,7% | 14,4% | 5,3% | 0% | 3,2% | **3,2%** |
| Leggenda | tutorial | 0% | 2,4% | 2,3% | 0% | 2,1% | **2,1%** |
| Leggenda | piatto forte | 0% | 2,6% | 2,4% | 0% | 3,3% | **3,3%** |
| Leggenda | perfetto forte stretto | 0% | 2,4% | 2,8% | 0% | 5,0% | **5,0%** |
| Leggenda | in ritardo | 0% | 2,3% | 1,8% | 0% | 1,8% | **1,8%** |
| Leggenda | forte in ritardo | 0% | 2,3% | 2,6% | 0% | 2,4% | **2,4%** |

Cosa si legge:
- Prima tutti gli ace venivano dalla CPU in corsa: 0 ace con la CPU ferma, su 48.000 servizi.
- Prima, senza il difetto, il servizio perfetto valeva poco più di quello colpito in ritardo: 17,9% contro 13,4% a
  Casual, 7,4% contro 3,9% a Pro, 2,8% contro 1,8% a Leggenda.
- Dopo, il servizio perfetto forte stretto vale circa 2,5 volte quello in ritardo a Casual, più di 4 volte a Pro, quasi
  3 volte a Leggenda.
- Con il difetto di prima il servizio perfetto dava più punti diretti di adesso (33% e 23% contro 22,5% e 13,4%), ma li
  dava anche il servizio qualunque. Gli obiettivi del rapporto sono quelli di adesso.

### 2. CPU «in corsa» quando parte il servizio

Quota di servizi di chi gioca con la CPU sopra 0,25 m/s (la soglia da cui l'animazione fa il passo di corsa).

| | prima | dopo |
|---|---|---|
| banco, Casual | 83,7–87,5% | **0%** |
| banco, Pro | 76,4–80,4% | **0%** |
| banco, Leggenda | 46,4–48,3% | **0%** |
| partite normali, Casual (5 profili) | 80,2–95,0% | **0%** |
| partite normali, Pro | 75,5–91,8% | **0%** |
| partite normali, Leggenda | 30,6–67,5% | **0%** |

Ace con la CPU in corsa: prima 3225 su 48.000 servizi del banco, dopo 0. Ace con la CPU ferma: prima 0, dopo 237
(143 a Casual e 94 a Pro, tutti sul servizio perfetto forte stretto).

### 3. Dettaglio: esterno, «T», servizio al massimo

Banco, 3 semi × 400 servizi = 1200 per casella (±2,5 punti a Casual). «Prima» qui è già con i personaggi fermi.

| livello | servizio | prima, fermi: diretto | dopo: ace | dopo: diretto |
|---|---|---|---|---|
| Casual | perfetto forte esterno | 30,1% | 10,0% | 31,8% |
| Casual | perfetto forte alla «T» | 7,1% | 0% | 15,0% |
| Casual | al massimo (forza 1, 209 km/h) esterno | 33,3% | 16,1% | 36,3% |
| Casual | piano (forza 0,5) sulla riga | 15,3% | 0% | 14,3% |
| Pro | perfetto forte esterno | 12,9% | 6,9% | 22,0% |
| Pro | perfetto forte alla «T» | 1,3% | 0% | 7,8% |
| Pro | al massimo esterno | 12,7% | 13,7% | 26,3% |
| Pro | piano sulla riga | 5,5% | 0% | 7,1% |
| Leggenda | perfetto forte esterno | 1,9% | 0% | 4,8% |
| Leggenda | perfetto forte alla «T» | 2,1% | 0% | 6,5% |
| Leggenda | al massimo esterno | 2,0% | 0% | 4,7% |
| Leggenda | piano sulla riga | 2,5% | 0% | 2,2% |

Cosa si legge:
- **L'ace è il servizio esterno.** Alla «T» la palla va verso la CPU e lei la tocca sempre: lì il punto viene solo
  dall'errore in risposta. A Casual e Pro l'esterno vale il doppio o il triplo della «T».
- **La «T» prima non valeva niente** (1,3% a Pro): adesso vale come un servizio forte al centro.
- **A Leggenda non c'è ace**, nemmeno con il servizio al massimo: la CPU arriva a 2,3 m dal corpo e a 8 m/s. Il 5% viene
  tutto da risposte sbagliate.
- A Casual il servizio esterno forte valeva già il 30% anche prima, ma erano tutte risposte sbagliate: adesso un terzo
  di quei punti sono ace.

### 4. Partite normali (servizio dei profili simulati)

6 semi × 300 punti, un battitore per game: circa 900 servizi di chi gioca per casella (±2 punti). I profili battono un
kick a 133 km/h («preciso» a 146): è un servizio normale, senza minaccia.

| livello | profilo | prima: ace | prima: diretto | prima, fermi: diretto | dopo: ace | dopo: diretto |
|---|---|---|---|---|---|---|
| Casual | medio | 0,4% | 16,0% | 12,1% | 0% | 10,1% |
| Casual | amatore | 1,3% | 11,9% | 12,9% | 0% | 13,0% |
| Casual | tennista | 0,4% | 12,1% | 11,8% | 0% | 12,6% |
| Casual | bambino | 2,0% | 12,1% | 11,6% | 0% | 14,9% |
| Casual | preciso | 1,8% | 15,8% | 12,0% | 0% | 9,6% |
| Pro | medio | 0,2% | 4,9% | 3,8% | 0% | 4,8% |
| Pro | amatore | 0,8% | 5,0% | 3,9% | 0% | 4,4% |
| Pro | tennista | 0,1% | 5,7% | 5,4% | 0% | 4,9% |
| Pro | bambino | 1,5% | 6,3% | 3,7% | 0% | 3,8% |
| Pro | preciso | 0,5% | 7,9% | 5,3% | 0% | 4,5% |
| Leggenda | medio | 0% | 1,7% | 2,3% | 0% | 2,3% |
| Leggenda | amatore | 0% | 1,9% | 0,9% | 0% | 0,9% |
| Leggenda | tennista | 0% | 2,3% | 1,3% | 0% | 1,3% |
| Leggenda | bambino | 0% | 3,5% | 3,5% | 0% | 3,5% |
| Leggenda | preciso | 0% | 1,3% | 1,6% | 0% | 1,6% |

A Leggenda «prima, fermi» e «dopo» sono identici, servizio per servizio: con un servizio normale la Leggenda gioca
esattamente come il gioco di prima con i personaggi fermi.

### 5. Game e punti vinti da chi gioca, per livello × profilo

`npm run audit:legend -- --table`: 8 semi × 300 punti = 2400 punti per casella (±2 punti sui punti; sui game di più).
Poi la stessa misura con 24 semi (7200 punti, ±1,2 punti).

| livello | profilo | game vinti (8 semi) prima → dopo | punti vinti (8 semi) | game vinti (24 semi) | punti vinti (24 semi) |
|---|---|---|---|---|---|
| Casual | medio | 100 → 100% | 92,7 → 93,3% | 100 → 100% | 93,3 → 93,5% |
| Casual | amatore | 99,2 → 99,6% | 85,9 → 87,2% | 99,0 → 99,4% | 85,8 → 87,2% |
| Casual | tennista | 100 → 100% | 98,9 → 99,2% | 100 → 100% | 98,9 → 99,3% |
| Casual | preciso | 100 → 100% | 100 → 100% | 100 → 100% | 100 → 100% |
| Casual | bambino | 35,6 → 35,7% | 43,7 → 43,9% | 37,0 → 35,5% | 44,4 → 44,2% |
| Casual | impreciso | 66,5 → 63,5% | 56,5 → 55,4% | 64,3 → 66,4% | 55,6 → 56,8% |
| Pro | medio | 80,8 → 84,1% | 64,8 → 67,0% | 85,0 → 85,1% | 66,4 → 66,9% |
| Pro | amatore | 73,3 → 74,1% | 59,0 → 60,2% | 73,1 → 74,9% | 59,4 → 60,6% |
| Pro | tennista | 100 → 100% | 95,7 → 96,8% | 100 → 100% | 96,1 → 97,0% |
| Pro | preciso | 100 → 100% | 99,8 → 99,5% | 100 → 100% | 99,6 → 99,5% |
| Pro | bambino | 0,8 → 1,2% | 17,8 → 16,0% | 1,3 → 1,3% | 18,0 → 16,8% |
| Pro | impreciso | 2,5 → 2,3% | 18,7 → 19,7% | 2,1 → 1,9% | 19,8 → 19,5% |
| Leggenda | medio | 3,0 → 2,3% | 20,7 → 20,1% | 2,7 → 2,5% | 20,0 → 19,8% |
| Leggenda | amatore | 0,7 → 0,5% | 13,6 → 13,8% | 1,1 → 0,5% | 14,1 → 13,1% |
| Leggenda | tennista | 9,4 → 5,9% | 29,3 → 28,5% | 9,5 → 9,3% | 29,3 → 29,3% |
| Leggenda | preciso | 29,7 → 28,0% | 42,3 → 41,5% | 30,7 → 33,2% | 42,8 → 43,2% |
| Leggenda | bambino | 0,2 → 0% | 7,5 → 7,6% | 0,1 → 0,1% | 7,8 → 7,9% |
| Leggenda | impreciso | 0,2 → 0,2% | 8,3 → 7,7% | 0,1 → 0,1% | 8,2 → 7,9% |

Cosa si legge:
- L'equilibrio dei livelli non si sposta: quasi tutte le differenze stanno dentro l'errore statistico.
- Due caselle si muovono di circa un punto su cento nei 24 semi: «bambino» a Pro (18,0 → 16,8%) e «amatore» a Leggenda
  (14,1 → 13,1%). Sono gli ace regalati che non ci sono più (tabella 4: a Pro «bambino» aveva l'1,5% di ace e il 6,3% di
  punti diretti, ora 0% e 3,8%). A Casual «amatore» sale di un punto (85,8 → 87,2%).
- **Pro contro «medio»** passa da 80,8% a 84,1% dei game nel giro a 8 semi del criterio (limite 70–85%), ma con 24 semi è
  85,0% prima e 85,1% dopo: gli 8 semi di prima erano bassi per caso. Resta vicino al limite alto: il passo 2 della
  tappa 2 (errori della CPU per la pressione) lo deve tenere d'occhio.
- **Leggenda contro «preciso»**: 8 semi 29,7 → 28,0% dei game per chi gioca, 24 semi 30,7 → 33,2%; sui punti 42,8 →
  43,2% (±1,2). Non c'è uno spostamento misurabile.
- **Casual per i più deboli** («bambino», «impreciso») resta com'era.

### 6. Criteri della Leggenda (`npm run audit:legend`)

| | prima | dopo |
|---|---|---|
| criteri rispettati | 69/69 | **69/69** |
| game vinti dalla CPU contro «medio» (≥ 90%) | 97,0% | 97,7% |
| contro «amatore» (≥ 90%) | 99,3% | 99,5% |
| contro «tennista» (≥ 85%) | 90,6% | 94,1% |
| contro «preciso» (≥ 60%) | 70,3% | 72,0% |
| contro «bambino» (≥ 98%) | 99,8% | 100% |
| contro «impreciso» (≥ 98%) | 99,8% | 99,8% |
| reazione p10 (≥ 0,12 s) | 0,125 s | 0,125 s |
| velocità massima (≤ 8,8 m/s) | 8,6 | 8,6 |
| Pro contro «medio», game di chi gioca (70–85%) | 80,8% | 84,1% |
| Casual contro «medio» (≥ 95%) | 100% | 100% |

### 7. Servizio della CPU e risposta di chi gioca: non cambiano

6 semi × 300 punti per casella, un battitore per game (misura fatta con uno script di lavoro, non nel repository).

| | prima | dopo |
|---|---|---|
| servizio della CPU, velocità (Casual / Pro / Leggenda) | 192 / 227 / 217 km/h | 192 / 227 / 216–217 km/h |
| rimbalzo del servizio della CPU (distanza media dal centro del campo; dalla rete) | 2,15–2,24 m; 5,06–5,08 m | 2,12–2,23 m; 5,05–5,09 m |
| punti vinti in risposta, Casual (medio, amatore, tennista, bambino) | 91,3 · 85,3 · 98,4 · 39,4% | 91,3 · 87,0 · 99,4 · 37,1% |
| punti vinti in risposta, Pro | 63,5 · 58,2 · 96,1 · 13,2% | 64,2 · 58,0 · 97,7 · 12,7% |
| punti vinti in risposta, Leggenda | 16,9 · 11,8 · 27,5 · 5,0% | 17,2 · 11,3 · 28,8 · 5,3% |

Circa 880 punti in risposta per casella: ±3 punti. Il test «il servizio della CPU e la risposta di chi gioca non cambiano
con il servizio di chi gioca del punto prima» lo prova in modo esatto: stessa palla e stesso piano di chi risponde.

## Obiettivi (D11)

| obiettivo | risultato | |
|---|---|---|
| servizio perfetto, forte e stretto a Casual: punto diretto 20–25% | 22,5% (ace 4,5%) | raggiunto |
| a Pro: 10–15% | 13,4% (ace 2,9%) | raggiunto |
| a Leggenda: intorno al 5% | 5,0% (nessun ace) | raggiunto |
| servizio normale chiaramente meno | 13,0% · 4,7% · 2,1% | raggiunto |
| servizio colpito tardi chiaramente meno | 8,9% · 2,9% · 1,8% | raggiunto |
| CPU «in corsa» al servizio: 0 | 0% dappertutto | raggiunto |
| nessun ace regalato da uno scatto sbagliato | 0 ace con la CPU in corsa | raggiunto |
| non indebolire la Leggenda | 69/69; game della CPU come prima (tabelle 5 e 6) | raggiunto, con il limite scritto sotto |
| servizio della CPU e risposta di chi gioca come prima | tabella 7 e test | raggiunto |
| stesso schermo e due computer: servizio come prima | nessuna minaccia registrata (test) | raggiunto nel motore; non provato con due computer veri |

## Test

- **Nuovo `natpf-b18-t2-servizio.test.mjs`, 10 prove**, sul motore vero senza disegno:
  - a fine punto e a ogni servizio i quattro personaggi sono fermi, in sei punti veri per livello, con la CPU che
    correva quando il punto è finito;
  - `_natpfStandStill`: velocità, stato della corsa dell'animazione, affondo della Leggenda; anche sul computer del
    Player 2;
  - minaccia del servizio: servizio insegnato 0; forte al centro 0,7; perfetto sulla riga 1, uguale all'esterno e alla
    «T», nei due quadrati; in ritardo 0; kick lento di webcam e mouse 0; anche dal gesto vero nel motore;
  - errore in risposta: perfetto > forte > normale > in ritardo; la Leggenda non tira il dado;
  - la risposta legge il servizio ricevuto e non il colpo del punto prima;
  - lettura in ritardo: sul servizio perfetto la CPU resta ferma per il tempo previsto e poi parte; sul servizio normale
    parte al primo passo;
  - Leggenda: qualità della risposta −15% con la minaccia piena, uguale con il servizio normale;
  - solo contro la CPU: niente nel 1v1 (Player 1 e Player 2), niente sul servizio della CPU, niente sulle palle del
    lanciapalle;
  - il servizio della CPU e il piano di chi risponde sono identici qualunque servizio abbia battuto chi gioca prima;
  - banco: fasce del punto diretto per livello (2 semi × 250), nessun ace con la CPU in corsa, CPU mai in corsa.
- **Controllo al contrario:** tolta la riga che azzera la velocità, falliscono 5 prove su 10 (le due dei personaggi
  fermi, la lettura in ritardo, il 1v1 e il banco). Rimessa, passano.
- **Nessun test esistente fissava i numeri vecchi:** non ne è stato cambiato nessuno. A `natpf-racchetta-motore` è stata
  aggiunta una riga per i campi nuovi della diagnostica.
- **Nuova prova nel browser `tools/e2e/natpf-servizio-peso.mjs`**, 8 verifiche: partita contro la CPU avviata da «Gioca»;
  fermi al servizio e nella pausa; servizio insegnato senza minaccia; servizio forte ed esterno con lettura in ritardo e
  un ace al terzo servizio («Punto tuo», «Ace! · 15-40» a schermo); a Leggenda nessun ace in 12 servizi.
- **`tools/e2e/natpf-rally.mjs`**: una verifica in più, nella pausa nessuno corre sul posto.

Risultati finali sul commit del passo:

| verifica | risultato |
|---|---|
| test del gioco (`npm test`, con le dipendenze di `tools/lan` installate) | **1087/1087**, 0 saltati (prima 1077) |
| sito (`node --test tools/test/*.test.mjs`) | 201/201 |
| `npm run build` | ok |
| `npm run audit:legend` | 69/69, «Tutti i criteri rispettati» |

Prove nel browser (Chromium, una alla volta, porte proprie):

| prova | risultato | note |
|---|---|---|
| natpf-rally | 8/8, poi 9/9 due volte con la verifica nuova | CPU a 2,5–2,8 m/s nell'istante di fine punto, 0 nella pausa |
| natpf-leggenda, giro 1 | 7/7 | allunghi forzati: piatto da +0,27 a +0,46 m |
| natpf-leggenda, giro 2 | 7/7 | allunghi forzati: piatto da +0,31 a +0,45 m |
| natpf-leggenda, giro 3 | 7/7 | 3 allunghi in partita: piatto +0,14, +0,14 e +0,37 m; forzati da +0,31 a +0,43 m |
| natpf-gesti-speciali | 9/9 | |
| natpf-1v1-p2p | 39/39 | |
| natpf-formato-fiera | 21/21 | |
| natpf-servizio-lancio | 12/12 | |
| natpf-training-flow | 22/22 | |
| natpf-servizio-peso (nuova) | 8/8, tre giri | stesso risultato a ogni giro (caso fissato) |

Tutte verdi al primo giro, nessuna rilanciata. In `natpf-leggenda` il limite per il piatto nell'allungo è +0,05 m: nella
tappa 1 un giro su tre era rosso per un allungo a +0,05. In questi tre giri il minimo è stato +0,14 m, quindi il caso
non si è ripresentato; tre giri non bastano per dire che è sparito. Chi gioca in quella prova batte un servizio normale:
il peso del servizio non entra.

Le nove prove richieste sono state fatte sul codice del passo (`d3ce64b`). `natpf-rally` con la verifica nuova e
`natpf-servizio-peso` sono state fatte dopo, sullo stesso codice del gioco.

## Cosa non è verificato

- **Persone vere e telefoni veri.** Non so quanti visitatori battono un servizio sopra 160 km/h, né quanti lo mettono
  sulla riga. Se quasi nessuno ci arriva, in fiera il servizio conterà poco anche adesso; se ci arrivano tutti, a Casual
  sarà molto generoso. La diagnostica ora registra `minaccia`, `stretto` e `ritardoCpuMs` a ogni servizio: bastano
  poche partite registrate per saperlo.
- **Il servizio sulla riga con il telefono vero.** Nel banco la direzione viene dal piano dello swing e dal piatto messi
  al massimo. Non ho provato se una persona riesce a farlo apposta.
- **A occhio.** Non ho guardato sul ledwall, né su uno schermo vero, le gambe ferme nella pausa e la CPU che esita. Nel
  browser delle prove ho controllato i numeri (velocità 0, stato della corsa spento), non il disegno.
- **Due computer veri.** La sfida tra due computer è provata con la prova `natpf-1v1-p2p` (due pagine sullo stesso
  computer) e nel motore. Il fermo dei personaggi sul computer del Player 2 è provato solo nel test del motore.
- **Windows, GPU vera, audio.** Niente di questo passo li tocca, ma non sono stati provati. La voce «Ace» è la clip che
  c'era già: non l'ho ascoltata.
- **Webcam «argon».** Quel servizio non passa dal gesto: la minaccia usa la velocità vera della palla e il voto del
  motore base per il tempo. È nel codice, non è misurato.
- **Doppio 2v2 contro la CPU.** Il peso del servizio vale anche lì (risponde la stessa CPU). Non è misurato.
- **Esercizio del servizio nell'Allenamento.** Usa il servizio vero contro la CPU di Casual: il peso vale anche lì. Non
  è misurato.

## Scelte da dichiarare e limiti

- **Il servizio esterno paga molto più della «T»** (tabella 3). È la geometria del campo: alla «T» la palla va verso chi
  risponde. Si può cambiare solo facendo partire la CPU dalla parte sbagliata, cioè rimettendo apposta lo scatto
  sbagliato: non l'ho fatto.
- **A Leggenda non esiste l'ace.** Per averlo servirebbe una CPU più lenta o con meno portata sul servizio, cioè una
  Leggenda più debole.
- **«Non indebolire la Leggenda» e «intorno al 5%» vanno in direzioni opposte.** Prima sul servizio perfetto la
  Leggenda sbagliava il 2,8%, adesso il 5,0%. Contro chi batte un servizio normale è identica a prima. Contro chi batte
  sempre forte e sulla riga perde circa 3 punti in più ogni 100 servizi. I sei profili simulati battono tutti un kick
  lento, quindi il banco della Leggenda non misura questo caso: lo misura solo il banco del servizio (punti vinti da
  «amatore» battendo sempre perfetto forte stretto: 14,9% prima, 16,5% con i personaggi fermi, 16,4% dopo).
- **Il servizio in ritardo vale meno di prima anche a Casual** (13,4% → 8,9% di punti diretti). È voluto dal rapporto
  («deve valere chiaramente meno»). Sui punti vinti a fine scambio pesa poco: 87,8% → 86,4% per «amatore» a Casual.
  Un visitatore che colpisce sempre tardi lo sente comunque un po'.
- **Pro contro «medio» è al limite alto** del criterio (85%), prima e dopo.
- **L'allungo vero sul servizio pesa la metà** che negli scambi. Senza, con la lettura in ritardo il servizio esterno
  superava l'obiettivo (27–28% a Casual, 17–18% a Pro).
- **Dadi.** A Casual e Pro l'errore in risposta è ancora una probabilità, come negli scambi. Il passo 2 della tappa 2
  («la CPU sbaglia per la pressione e non a caso») riguarda anche questa.
