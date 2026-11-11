# B18.2 · tappa 2, passo 1 · Personaggi fermi a ogni servizio e un servizio che conta

Difetto 11 del rapporto B16 (`docs/b16/rapporto-gameplay.md` §2, appendice D11). Base: `natpf-simulator` a `f0e66d3`
(versione 2026-11-10.2). Lavoro fatto in una worktree, senza push e senza toccare `natpf-simulator` o `main`. I file di
versione e i documenti di ripresa non sono toccati.

**Rivisto dopo la revisione indipendente** (sezione «Revisione» in fondo): le misure con il servizio del telefono, il
servizio a Casual e le frasi che la revisione ha trovato sbagliate sono corretti in tutto il documento. Dove un numero
è cambiato con la revisione c'è scritto.

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
5. **Un servizio normale non regala più punti: rispetto al gioco pubblicato ne fa meno.** Con il telefono, nel gioco
   pubblicato, anche chi batteva piano o tardi riceveva un ace regalato ogni 11–15 servizi a Casual e a Pro. Tolti quelli,
   il servizio insegnato fa punto subito 15 volte su 100 a Casual (prima 20) e 5 su 100 a Pro (prima 12). È la conseguenza
   della correzione dei personaggi fermi, che era richiesta. La CPU, davanti a un servizio normale, sbaglia come sbagliava
   prima quando era ferma (a Casual un poco di più: vedi il punto 6).
6. **A Casual chi comincia non viene punito.** Casual è il livello di chi prova il gioco per la prima volta. Lì la CPU
   sbaglia la risposta a un servizio normale 15 volte su 100 (nella prima stesura di questo passo 13,5) e il servizio
   colpito tardi vale quanto uno normale. Così un visitatore debole perde poco rispetto al gioco pubblicato: circa 1 punto su 100 al
   servizio se batte come nel tutorial, circa 4 su 100 se colpisce sempre tardi (tabella 5b). **È una scelta da
   confermare**: i due numeri e l'alternativa sono nella sezione «Revisione».
7. **A Pro il servizio colpito tardi vale meno** di uno normale (3 punti diretti su 100 contro 5).
8. **Per livello.** Con il servizio perfetto, forte e sulla riga, il punto arriva subito (ace o risposta sbagliata) circa
   una volta su quattro a Casual, una su sette o otto a Pro, una su venti a Leggenda.
9. **La Leggenda non è più debole.** Contro i giocatori simulati vince gli stessi game di prima, dentro l'errore della
   misura. Cede qualcosa solo a chi batte un servizio forte e stretto: circa 3 punti in più ogni 100 servizi così nel
   banco, da 1 a 2 nelle partite normali (tabella 5c).

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
| errore in risposta, base (servizio a tempo) | 15% (13,5% prima della revisione) | 4,5% | nessun dado |
| in più con la minaccia piena | +5% | +5% | — |
| servizio fuori tempo (`lateBase`) | tutta la base (60% prima della revisione) | 60% della base | — |
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
- La diagnostica registra, a ogni servizio di chi gioca contro la CPU, `minaccia`, `stretto` e `ritardoCpuMs`. Le misure
  riassunte (`diag_metrics.computeMetrics`, voce `servizi`) e la riga «Servizi dal gesto» del rapporto dicono quanti
  servizi avevano una minaccia, quanti la CPU li ha letti in ritardo, la minaccia media e i km/h: con poche partite
  registrate si sa quanti servizi forti e stretti fanno le persone vere.
- **Per i livelli nuovi della tappa 2** (Evento, Bambini): ogni livello contro la CPU deve avere la sua riga in
  `SERVE_WEIGHT`. Senza, il suo servizio non ha peso e la risposta torna alla regola degli scambi.

## File toccati

| file | cosa |
|---|---|
| `natpf-tennis/src/game_engine.js` | `_natpfStandStill`; chiamate in `_setupPointServe`, `_awardPoint` e nella fase `POINT_OVER` del Player 2; `NS.registerServe` in `_executeServeHit` |
| `natpf-tennis/src/natpf/natpf_skill.js` | `SERVE_WEIGHT`, `serveTuning`, `serveInfo`, `registerServe`, `serveInPlay`, `cpuServeErrorChance`; `resetRally` azzera `lastQuality` e `serve`; `cpuReturnPlan` usa il servizio ricevuto. Revisione: `SERVE_WEIGHT.casual` con base 0,15 e `lateBase` 1 (la penalità del ritardo è per livello) |
| `natpf-tennis/src/natpf/natpf_legend.js` | `LEGEND.serveQ`; qualità della risposta al servizio in `legendDecide` |
| `natpf-tennis/src/natpf/diag/diag_recorder.js` | riga «servizio»: `minaccia`, `stretto`, `ritardoCpuMs` |
| `natpf-tennis/src/natpf/diag/diag_metrics.js`, `diag_viewer.js` | revisione: `serveWeight` (quota con minaccia, quota letta in ritardo, minaccia media) e km/h nella voce `servizi`; riga del rapporto e del visore |
| `natpf-tennis/scripts/audit/servizio.mjs` | **nuovo**: banco del servizio (`npm run audit:serve`). Revisione: partite normali con il servizio del telefono (`--naturale --servizio=…`), `--nsemi`, `--prova` |
| `natpf-tennis/scripts/audit/legend.mjs` | revisione: fino a 40 semi (`--seeds=40`), punti di chi gioca con errore e deviazione tra i semi |
| `natpf-tennis/scripts/audit/rally-balance.mjs` | `simulate` accetta `serve`: il servizio lo sceglie il banco. Senza, non cambia niente |
| `natpf-tennis/package.json` | comando `audit:serve` |
| `natpf-tennis/test/natpf-b18-t2-servizio.test.mjs` | **nuovo**: 12 prove (10 del passo, 2 della revisione) |
| `natpf-tennis/test/natpf-racchetta-motore.test.mjs` | la prova della diagnostica controlla i campi nuovi |
| `tools/e2e/natpf-servizio-peso.mjs` | **nuovo**: prova nel browser |
| `tools/e2e/natpf-rally.mjs` | una verifica in più: nella pausa nessuno corre sul posto |

## Misure prima e dopo

Tutte dal gioco simulato: motore vero senza disegno, semi fissi. «Prima» è `f0e66d3`. Lo scambio dopo il servizio lo
gioca il profilo «amatore». Gli script:

```sh
cd natpf-tennis
npm run audit:serve                        # banco: chi gioca batte ogni punto, un tipo di servizio alla volta
npm run audit:serve -- --naturale          # partite normali, servizio dei profili (kick lento, non quello del telefono)
npm run audit:serve -- --naturale --servizio=insegnato,tardi,piano --nsemi=25   # partite normali, servizio del telefono
npm run audit:serve -- --naturale --servizio=tardi --profiles=bambino --difficulty=casual --nsemi=25 --prova=casual.base=.135,casual.lateBase=.6   # con valori di prova
npm run audit:serve -- --fermi             # il gioco di prima, con la sola correzione dei personaggi fermi
npm run audit:serve -- --tipi=perfettoEsterno,perfettoT,massimoEsterno,pianoStretto
npm run audit:legend                       # criteri della Leggenda
npm run audit:legend -- --table            # game e punti per livello × profilo (servizio dei profili)
npm run audit:legend -- --profiles=preciso --seeds=40   # per decidere sulla Leggenda: più semi, con l'errore
```

**Attenzione a quale servizio batte la simulazione.** I profili simulati (`rally-balance.mjs`: medio, amatore, bambino…)
battono un kick lento senza la forma del telefono, 133–146 km/h. Nel gioco pubblicato quel kick riceveva pochi ace
regalati (0,4–2%), il servizio del telefono molti (6–9% a Casual e Pro). Le tabelle 4, 5 e 6 usano il kick: dicono che
cosa succede con webcam e mouse, **non** con il telefono. Per il telefono c'è la tabella 5b.

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
| Casual | tutorial | 9,9% | 22,8% | 13,8% | 0% | 14,7% | **14,7%** |
| Casual | piatto forte | 9,8% | 23,7% | 15,1% | 0% | 17,3% | **17,3%** |
| Casual | perfetto forte stretto | 16,9% | 33,0% | 17,9% | 4,4% | 19,8% | **24,2%** |
| Casual | in ritardo | 7,1% | 19,7% | 13,4% | 0% | 13,4% | **13,4%** |
| Casual | forte in ritardo | 8,7% | 22,3% | 14,3% | 0% | 14,1% | **14,1%** |
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

Le righe di Casual sono quelle dopo la revisione (base 0,15, nessuna penalità per il ritardo). Prima della revisione
erano: tutorial 13,0%, piatto forte 16,3%, perfetto forte stretto 22,5% (ace 4,5%), in ritardo 8,9%, forte in ritardo
9,2%. Pro e Leggenda non sono cambiati con la revisione: rimisurati, sono uguali numero per numero.

Cosa si legge:
- Prima tutti gli ace venivano dalla CPU in corsa: 0 ace con la CPU ferma, su 48.000 servizi.
- Prima, senza il difetto, il servizio perfetto valeva poco più di quello colpito in ritardo: 17,9% contro 13,4% a
  Casual, 7,4% contro 3,9% a Pro, 2,8% contro 1,8% a Leggenda.
- Dopo, il servizio perfetto forte stretto vale 1,8 volte quello in ritardo a Casual (24,2% contro 13,4%), più di 4
  volte a Pro, quasi 3 volte a Leggenda. A Casual il servizio in ritardo vale quasi quanto quello del tutorial (13,4%
  contro 14,7%): è voluto, lì chi comincia non viene punito.
- **Rispetto al gioco pubblicato ogni servizio fa meno punti diretti**, anche quello del tutorial: 22,8 → 14,7% a
  Casual, 12,5 → 4,7% a Pro. Il gioco pubblicato regalava un ace ogni 10–15 servizi a qualunque servizio. Gli obiettivi
  del rapporto sono quelli di adesso.

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

Ace con la CPU in corsa: prima 3225 su 48.000 servizi del banco, dopo 0. Ace con la CPU ferma: prima 0, dopo 235
(141 a Casual e 94 a Pro, tutti sul servizio perfetto forte stretto).

### 3. Dettaglio: esterno, «T», servizio al massimo

Banco, 3 semi × 400 servizi = 1200 per casella (±2,5 punti a Casual). «Prima» qui è già con i personaggi fermi.

| livello | servizio | prima, fermi: diretto | dopo: ace | dopo: diretto |
|---|---|---|---|---|
| Casual | perfetto forte esterno | 30,1% | 9,3% | 31,4% |
| Casual | perfetto forte alla «T» | 7,1% | 0% | 17,5% |
| Casual | al massimo (forza 1, 209 km/h) esterno | 33,3% | 14,3% | 38,3% |
| Casual | piano (forza 0,5) sulla riga | 15,3% | 0% | 17,4% |
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
- **L'obiettivo del 20–25% e del 10–15% è raggiunto come media di esterno e «T», non dal solo esterno.** Chi batte
  sempre esterno fa punto subito 31–34% delle volte a Casual e 20–22% a Pro (con altri quattro semi, 911–937 × 400:
  33,6% e 19,5%); chi batte sempre alla «T» 17–18% e 8%. A Pro chi scopre il servizio esterno vince il 69–70% dei punti
  al servizio contro il 63% del servizio insegnato. Non è più facile del gioco pubblicato, dove il servizio perfetto
  valeva 23% a Pro con gli ace regalati. Per stare in fascia anche con il solo esterno si può accorciare la lettura in
  ritardo (`SERVE_WEIGHT.casual.read`, `pro.read`): non l'ho fatto, perché toglie gli ace veri.

Le righe di Casual sono quelle dopo la revisione; prima della revisione erano 31,8% (ace 10,0), 15,0%, 36,3% (ace
16,1) e 14,3%.

### 4. Partite normali con il servizio dei profili simulati (kick lento: webcam e mouse, non il telefono)

6 semi × 300 punti, un battitore per game: circa 900 servizi di chi gioca per casella (±2 punti). I profili battono un
kick a 133 km/h («preciso» a 146): è un servizio senza minaccia, e nel gioco pubblicato riceveva pochi ace regalati
(0,1–2%). Per questo qui «prima» e «dopo» si somigliano. **Con il servizio del telefono non è così: tabella 5b.**

| livello | profilo | prima: ace | prima: diretto | prima, fermi: diretto | dopo: ace | dopo: diretto |
|---|---|---|---|---|---|---|
| Casual | medio | 0,4% | 16,0% | 12,1% | 0% | 12,0% |
| Casual | amatore | 1,3% | 11,9% | 12,9% | 0% | 15,7% |
| Casual | tennista | 0,4% | 12,1% | 11,8% | 0% | 14,6% |
| Casual | bambino | 2,0% | 12,1% | 11,6% | 0% | 14,1% |
| Casual | preciso | 1,8% | 15,8% | 12,0% | 0% | 11,7% |
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

Le righe di Casual sono quelle dopo la revisione (prima della revisione: 10,1 · 13,0 · 12,6 · 14,9 · 9,6%).

A Leggenda «prima, fermi» e «dopo» sono identici, servizio per servizio: con un servizio normale la Leggenda gioca
esattamente come il gioco di prima con i personaggi fermi.

### 5. Game e punti vinti da chi gioca, per livello × profilo (servizio dei profili simulati)

`npm run audit:legend -- --table`: 8 semi × 300 punti = 2400 punti per casella (±2 punti sui punti; sui game di più).
Poi la stessa misura con 24 semi (7200 punti, ±1,2 punti). **Questa tabella non vede il servizio del telefono**: i
profili battono il kick lento. Quello che succede con il telefono è nella tabella 5b.

| livello | profilo | game vinti (8 semi) prima → dopo | punti vinti (8 semi) | game vinti (24 semi) | punti vinti (24 semi) |
|---|---|---|---|---|---|
| Casual | medio | 100 → 99,8% | 92,7 → 92,6% | 100 → 99,9% | 93,3 → 93,1% |
| Casual | amatore | 99,2 → 99,6% | 85,9 → 87,7% | 99,0 → 99,4% | 85,8 → 87,3% |
| Casual | tennista | 100 → 100% | 98,9 → 99,0% | 100 → 100% | 98,9 → 99,1% |
| Casual | preciso | 100 → 100% | 100 → 100% | 100 → 100% | 100 → 100% |
| Casual | bambino | 35,6 → 36,7% | 43,7 → 44,2% | 37,0 → 37,0% | 44,4 → 44,7% |
| Casual | impreciso | 66,5 → 65,8% | 56,5 → 56,4% | 64,3 → 65,9% | 55,6 → 56,8% |
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

Le righe di Casual sono quelle dopo la revisione (prima della revisione, 8 semi: bambino 35,7% dei game, impreciso
63,5%; 24 semi: 35,5% e 66,4%). Pro e Leggenda rimisurati dopo la revisione: uguali numero per numero.

Cosa si legge:
- **Con il servizio dei profili** l'equilibrio dei livelli non si sposta: quasi tutte le differenze stanno dentro
  l'errore statistico. Non vale per il servizio del telefono (tabella 5b).
- Due caselle si muovono di circa un punto su cento nei 24 semi: «bambino» a Pro (18,0 → 16,8%) e «amatore» a Leggenda
  (14,1 → 13,1%). Sono gli ace regalati che non ci sono più (tabella 4: a Pro «bambino» aveva l'1,5% di ace e il 6,3% di
  punti diretti, ora 0% e 3,8%). A Casual «amatore» sale di un punto (85,8 → 87,2%).
- **Pro contro «medio»** passa da 80,8% a 84,1% dei game nel giro a 8 semi del criterio (limite 70–85%), ma con 24 semi è
  85,0% prima e 85,1% dopo: gli 8 semi di prima erano bassi per caso. Resta vicino al limite alto: il passo 2 della
  tappa 2 (errori della CPU per la pressione) lo deve tenere d'occhio.
- **Leggenda contro «preciso»**: 8 semi 29,7 → 28,0% dei game per chi gioca, 24 semi 30,7 → 33,2%; sui punti 42,8 →
  43,2% (±1,2). Non c'è uno spostamento misurabile.
- **Casual per i più deboli** («bambino», «impreciso») con il kick dei profili resta com'era. Con il servizio del
  telefono no: nel gioco pubblicato ricevevano il 7–8% di ace regalati. Vedi la tabella 5b.

### 5b. Partite normali con il servizio del telefono (aggiunta dalla revisione)

È la misura che mancava. `npm run audit:serve -- --naturale --servizio=insegnato,tardi,piano --nsemi=25`: partite
normali, un battitore per game, 25 semi × 300 punti per casella (circa 3800 servizi di chi gioca e 1100–1700 game).
Errore: circa ±1,6 punti sui punti al servizio e in risposta, ±1,1 sui punti diretti, ±3 sui game. Lo scambio lo gioca
il profilo; il servizio è quello del telefono «con la forma», in tre modelli (ipotesi, non persone vere):

| modello | forza | tempo | km/h | qualità media del tempo |
|---|---|---|---|---|
| insegnato | 0,5 ± 0,08 | a tempo (± 0,10 s) | 157 | 1,00 |
| in ritardo | 0,45 ± 0,12 | 0,3 s dopo la cima del lancio (± 0,18 s) | 151 | 0,80 |
| piano | 0,3 ± 0,08 | 0,15 s dopo la cima (± 0,2 s) | 142 | 0,90 |

«Prima» è il gioco pubblicato (`f0e66d3`), «prima, fermi» lo stesso con la sola correzione dei personaggi fermi, «dopo»
il codice finale di questo passo.

| livello | profilo | servizio | ace regalati prima | punti diretti prima → prima, fermi → dopo | punti al servizio | punti in risposta | game vinti | game al servizio |
|---|---|---|---|---|---|---|---|---|
| Casual | bambino | insegnato | 7,8% | 20,1 → 13,2 → **14,8%** | 52,4 → 48,9 → **51,3%** | 39,7 → 40,4% | 40,6 → **40,3%** | 55,3 → 52,7% |
| Casual | bambino | in ritardo | 7,5% | 18,5 → 12,9 → **14,0%** | 52,6 → 47,6 → **48,7%** | 39,7 → 39,3% | 41,3 → **35,7%** | 54,8 → 46,4% |
| Casual | bambino | piano | 8,1% | 19,1 → 11,8 → **14,1%** | 51,0 → 46,8 → **50,1%** | 39,3 → 40,8% | 38,0 → **40,0%** | 52,3 → 50,0% |
| Casual | impreciso | insegnato | 6,9% | 20,0 → 14,1 → **15,5%** | 62,4 → 60,8 → **62,2%** | 51,9 → 49,6% | 66,0 → **63,5%** | 77,1 → 76,4% |
| Casual | impreciso | in ritardo | 6,6% | 19,7 → 13,5 → **14,5%** | 62,8 → 60,4 → **61,1%** | 51,6 → 50,3% | 66,2 → **63,1%** | 79,3 → 76,0% |
| Casual | impreciso | piano | 6,7% | 20,1 → 13,5 → **15,3%** | 64,7 → 60,2 → **62,1%** | 50,8 → 53,0% | 67,4 → **68,0%** | 81,7 → 78,7% |
| Casual | amatore | insegnato | 9,0% | 22,6 → 13,1 → **14,0%** | 88,0 → 88,7 → **87,5%** | 85,6 → 86,7% | 99,3 → **99,8%** | 99,4 → 99,8% |
| Casual | amatore | in ritardo | 7,8% | 20,7 → 13,4 → **13,8%** | 87,9 → 87,1 → **87,1%** | 83,7 → 85,6% | 99,2 → **99,6%** | 99,5 → 99,9% |
| Casual | amatore | piano | 7,8% | 20,1 → 13,6 → **13,8%** | 88,3 → 87,2 → **86,8%** | 85,6 → 86,6% | 99,6 → **99,6%** | 99,6 → 99,6% |
| Casual | medio | insegnato | 8,2% | 21,0 → 15,0 → **15,3%** | 95,1 → 95,1 → **95,5%** | 91,1 → 92,0% | 100,0 → **99,9%** | 100,0 → 100,0% |
| Casual | medio | in ritardo | 6,6% | 19,7 → 13,5 → **14,2%** | 95,3 → 94,7 → **94,6%** | 92,0 → 90,9% | 99,9 → **99,9%** | 100,0 → 100,0% |
| Casual | medio | piano | 7,1% | 19,9 → 13,3 → **14,7%** | 95,0 → 94,9 → **95,2%** | 92,2 → 92,8% | 99,9 → **99,9%** | 100,0 → 100,0% |
| Pro | bambino | insegnato | 7,0% | 12,1 → 5,0 → **5,0%** | 25,8 → 19,7 → **20,3%** | 13,4 → 13,1% | 3,3 → **1,0%** | 5,9 → 1,7% |
| Pro | bambino | in ritardo | 7,8% | 12,7 → 4,3 → **3,8%** | 26,6 → 19,0 → **18,7%** | 13,6 → 14,1% | 3,1 → **1,2%** | 5,7 → 2,2% |
| Pro | bambino | piano | 6,8% | 11,5 → 5,0 → **5,3%** | 26,7 → 19,5 → **20,5%** | 13,4 → 13,8% | 3,3 → **2,0%** | 6,1 → 3,6% |
| Pro | impreciso | insegnato | 4,8% | 9,6 → 5,4 → **5,5%** | 24,8 → 21,2 → **22,2%** | 18,3 → 17,4% | 3,9 → **1,9%** | 5,8 → 2,6% |
| Pro | impreciso | in ritardo | 5,5% | 10,2 → 5,1 → **4,3%** | 24,4 → 20,9 → **21,1%** | 16,8 → 15,9% | 2,1 → **2,5%** | 3,2 → 3,8% |
| Pro | impreciso | piano | 4,9% | 9,8 → 5,4 → **5,4%** | 25,7 → 20,5 → **22,0%** | 17,5 → 15,9% | 3,7 → **2,3%** | 6,2 → 3,7% |
| Pro | amatore | insegnato | 7,0% | 12,6 → 5,5 → **4,5%** | 64,6 → 63,1 → **62,7%** | 58,6 → 59,7% | 76,6 → **76,2%** | 81,5 → 78,5% |
| Pro | amatore | in ritardo | 6,4% | 11,3 → 5,1 → **3,6%** | 64,3 → 62,5 → **61,9%** | 58,9 → 58,6% | 76,5 → **74,4%** | 81,0 → 78,2% |
| Pro | amatore | piano | 6,9% | 11,5 → 4,4 → **4,5%** | 64,3 → 62,5 → **62,3%** | 60,0 → 59,7% | 77,5 → **75,7%** | 81,0 → 77,7% |
| Pro | medio | insegnato | 6,7% | 11,7 → 5,8 → **5,7%** | 70,0 → 69,3 → **68,5%** | 64,1 → 63,5% | 85,7 → **83,7%** | 89,8 → 87,6% |
| Pro | medio | in ritardo | 6,2% | 11,7 → 5,9 → **4,6%** | 71,2 → 68,2 → **68,3%** | 63,3 → 64,8% | 85,4 → **85,1%** | 91,5 → 87,7% |
| Pro | medio | piano | 6,7% | 11,5 → 5,3 → **4,6%** | 70,6 → 66,3 → **68,1%** | 64,4 → 63,8% | 85,8 → **83,7%** | 90,0 → 86,5% |
| Leggenda | bambino | insegnato | 0,0% | 3,2 → 2,8 → **3,0%** | 9,7 → 9,2 → **10,2%** | 6,2 → 5,5% | 0,1 → **0,1%** | 0,1 → 0,2% |
| Leggenda | bambino | in ritardo | 0,0% | 2,9 → 3,0 → **3,1%** | 9,5 → 10,1 → **9,8%** | 6,0 → 6,3% | 0,1 → **0,1%** | 0,1 → 0,1% |
| Leggenda | bambino | piano | 0,0% | 2,9 → 3,0 → **3,0%** | 9,7 → 10,2 → **10,3%** | 6,2 → 4,9% | 0,3 → **0,2%** | 0,3 → 0,2% |
| Leggenda | impreciso | insegnato | 0,0% | 2,7 → 2,5 → **3,0%** | 10,4 → 10,2 → **10,5%** | 5,3 → 5,5% | 0,1 → **0,1%** | 0,1 → 0,2% |
| Leggenda | impreciso | in ritardo | 0,0% | 3,2 → 2,9 → **3,0%** | 11,1 → 10,7 → **10,2%** | 5,6 → 6,0% | 0,1 → **0,1%** | 0,2 → 0,2% |
| Leggenda | impreciso | piano | 0,0% | 2,8 → 2,8 → **2,9%** | 10,3 → 10,1 → **10,3%** | 5,6 → 5,8% | 0,2 → **0,2%** | 0,3 → 0,5% |
| Leggenda | amatore | insegnato | 0,0% | 2,3 → 2,1 → **2,4%** | 15,3 → 15,2 → **15,2%** | 12,5 → 13,4% | 0,4 → **1,1%** | 0,5 → 1,6% |
| Leggenda | amatore | in ritardo | 0,0% | 2,3 → 1,9 → **2,0%** | 15,3 → 14,9 → **14,5%** | 11,6 → 12,6% | 0,4 → **0,4%** | 0,9 → 0,5% |
| Leggenda | amatore | piano | 0,0% | 2,3 → 2,3 → **2,3%** | 15,7 → 15,3 → **15,9%** | 11,3 → 12,6% | 0,3 → **0,3%** | 0,5 → 0,5% |
| Leggenda | medio | insegnato | 0,0% | 2,1 → 2,0 → **1,9%** | 23,2 → 23,1 → **21,1%** | 18,5 → 18,7% | 2,4 → **2,5%** | 2,8 → 3,1% |
| Leggenda | medio | in ritardo | 0,0% | 2,4 → 2,1 → **1,9%** | 23,4 → 22,7 → **22,4%** | 17,6 → 17,1% | 3,0 → **2,4%** | 3,8 → 3,1% |
| Leggenda | medio | piano | 0,0% | 2,0 → 2,1 → **2,0%** | 20,9 → 21,8 → **21,4%** | 17,8 → 16,6% | 1,9 → **1,5%** | 2,3 → 2,1% |

Cosa si legge:
- **Il gioco pubblicato regalava un ace ogni 11–15 servizi** a Casual e a Pro, a qualunque servizio del telefono, anche
  piano o in ritardo. Dopo: nessun ace con un servizio normale, CPU mai in corsa (0% in tutte le 36 caselle).
- **La perdita viene dalla correzione dei personaggi fermi**, non dal peso del servizio: basta guardare «prima → prima,
  fermi». A Casual «bambino» passa da 52,4% a 48,9% dei punti al servizio con il servizio insegnato.
- **Casual, dopo la revisione, recupera in parte.** «Bambino»: 52,4 → 51,3% dei punti al servizio se batte come nel
  tutorial, 51,0 → 50,1% se batte piano, 52,6 → 48,7% se colpisce sempre tardi. In game: 40,6 → 40,3%, 38,0 → 40,0% e
  41,3 → 35,7% (errore ±3). «Impreciso»: 62–65% → 61–62% dei punti al servizio, 66–67% → 63–68% dei game. Chi colpisce
  sempre tardi resta quello che perde di più: circa 4 punti su 100 al servizio.
- **Pro non è compensato.** I punti diretti del servizio normale scendono da 10–13% a 4–6%. I profili deboli perdono
  3–8 punti su 100 al servizio (ma vincevano già solo il 2–4% dei game), «amatore» e «medio» 2–3.
- **Pro contro «medio» con il telefono** vinceva l'85,4–85,8% dei game nel gioco pubblicato, sopra il limite del
  criterio (70–85%); ora 83,7–85,1%. Resta al limite alto.
- **Leggenda: niente di misurabile** con un servizio normale. Le differenze stanno dentro l'errore; la più grande è
  «medio» con il servizio insegnato, 23,2 → 21,1% dei punti al servizio (al bordo dell'errore, una casella su dodici).
- **La risposta di chi gioca non cambia**: le differenze «in risposta» vanno da −2,3 a +2,2 punti, con segni opposti
  da una casella all'altra (errore sulla differenza circa ±2,3).

### 5c. Partite normali con un servizio forte del telefono (aggiunta dalla revisione)

Stessa misura, 12 semi × 300 punti (circa 1850 servizi per casella; ±2,3 sui punti al servizio). Due modelli in più:
«forte» (forza 0,8 a tempo, direzione del servizio insegnato) e «forte sulle righe» (forza 0,88 a tempo, 7 servizi su 10
cercati sulla riga, esterna o «T»).

| livello | profilo | servizio | ace prima → dopo | punti diretti prima → dopo | punti al servizio prima → dopo | game vinti prima → dopo |
|---|---|---|---|---|---|---|
| Casual | bambino | forte (183 km/h) | 9,1 → 0,0% | 21,7 → **16,2%** | 52,9 → **52,9%** | 40,4 → 42,4% |
| Casual | bambino | forte sulle righe (192 km/h) | 13,5 → 1,8% | 28,3 → **19,8%** | 56,5 → **55,4%** | 47,4 → 42,6% |
| Casual | amatore | forte (183 km/h) | 10,4 → 0,0% | 23,4 → **17,9%** | 88,0 → **88,7%** | 99,6 → 99,2% |
| Casual | amatore | forte sulle righe (192 km/h) | 15,0 → 1,4% | 31,1 → **20,7%** | 89,7 → **89,5%** | 99,6 → 100,0% |
| Casual | medio | forte (183 km/h) | 8,9 → 0,0% | 22,2 → **16,9%** | 95,6 → **95,9%** | 99,9 → 100,0% |
| Casual | medio | forte sulle righe (192 km/h) | 13,1 → 1,5% | 29,6 → **20,2%** | 95,7 → **95,6%** | 100,0 → 100,0% |
| Pro | bambino | forte (183 km/h) | 7,1 → 0,0% | 12,3 → **7,4%** | 26,0 → **20,8%** | 3,1 → 1,8% |
| Pro | bambino | forte sulle righe (192 km/h) | 10,1 → 1,5% | 16,1 → **11,9%** | 28,2 → **28,6%** | 3,5 → 4,8% |
| Pro | amatore | forte (183 km/h) | 9,5 → 0,0% | 15,3 → **7,5%** | 66,6 → **65,2%** | 78,4 → 76,8% |
| Pro | amatore | forte sulle righe (192 km/h) | 12,2 → 0,8% | 18,3 → **10,5%** | 67,5 → **65,5%** | 80,2 → 76,9% |
| Pro | medio | forte (183 km/h) | 8,5 → 0,0% | 14,4 → **6,9%** | 70,6 → **68,6%** | 86,3 → 84,6% |
| Pro | medio | forte sulle righe (192 km/h) | 12,1 → 1,5% | 17,8 → **10,8%** | 72,7 → **71,3%** | 85,5 → 85,1% |
| Leggenda | bambino | forte (183 km/h) | 0,0 → 0,0% | 2,7 → **3,8%** | 8,9 → **10,4%** | 0,0 → 0,1% |
| Leggenda | bambino | forte sulle righe (192 km/h) | 0,0 → 0,0% | 3,0 → **5,5%** | 9,4 → **10,9%** | 0,0 → 0,2% |
| Leggenda | amatore | forte (183 km/h) | 0,0 → 0,0% | 2,2 → **3,5%** | 14,3 → **16,0%** | 0,0 → 0,7% |
| Leggenda | amatore | forte sulle righe (192 km/h) | 0,0 → 0,0% | 1,9 → **3,7%** | 15,1 → **16,9%** | 0,7 → 0,3% |
| Leggenda | medio | forte (183 km/h) | 0,0 → 0,0% | 2,2 → **3,2%** | 21,2 → **23,1%** | 2,3 → 2,3% |
| Leggenda | medio | forte sulle righe (192 km/h) | 0,0 → 0,0% | 1,6 → **4,8%** | 22,4 → **23,1%** | 2,4 → 2,7% |

Cosa si legge:
- **Nelle partite normali anche il servizio forte fa meno punti diretti del gioco pubblicato**, perché là prendeva
  7–15% di ace regalati: a Casual 28–31% → 20% per il forte sulle righe, a Pro 16–18% → 10–12%. Gli ace veri dopo sono
  l'1–2% (solo sul servizio esterno e ben riuscito).
- **Adesso però il servizio forte vale più di quello normale, in ordine**, e prima quasi no. A Casual: forte sulle
  righe 20% di punti diretti, forte 16–18%, insegnato 14–15%. A Pro: 10–12%, 7%, 5%. Nel gioco pubblicato a Pro il
  servizio insegnato dava il 10–13% e quello forte il 12–15%.
- **Leggenda**: chi batte forte guadagna da 1 a 2 punti su 100 al servizio (punti diretti da 2–3% a 3–5%). È il limite
  dichiarato sotto: «intorno al 5%» e «non indebolire la Leggenda» tirano in direzioni opposte.

### 6. Criteri della Leggenda (`npm run audit:legend`)

| | prima | dopo |
|---|---|---|
| criteri rispettati | 69/69 | **69/69** |
| game vinti dalla CPU contro «medio» (≥ 90%) | 97,0% | 97,7% |
| contro «amatore» (≥ 90%) | 99,3% | 99,5% |
| contro «tennista» (≥ 85%) | 90,6% | 94,1% |
| contro «preciso» (≥ 60%) | 70,3% | 72,0% (con 40 semi: 65,5%; punti di chi gioca 43,8% ± 0,65) |
| contro «bambino» (≥ 98%) | 99,8% | 100% |
| contro «impreciso» (≥ 98%) | 99,8% | 99,8% |
| reazione p10 (≥ 0,12 s) | 0,125 s | 0,125 s |
| velocità massima (≤ 8,8 m/s) | 8,6 | 8,6 |
| Pro contro «medio», game di chi gioca (70–85%) | 80,8% | 84,1% |
| Casual contro «medio» (≥ 95%) | 100% | 99,8% |

Il criterio «preciso» con 8 semi è rumoroso (deviazione tra i semi 3,8 punti sui punti vinti): la revisione ha misurato
72,0% con gli 8 semi dell'audit, 66,4% con 40 semi suoi, 58,7% (sotto soglia) con altri 12. Non dipende da questo
passo. Per decidere sulla Leggenda ora c'è `npm run audit:legend -- --profiles=preciso --seeds=40`, e ogni riga
dell'audit riporta i punti di chi gioca con l'errore.

### 7. Servizio della CPU e risposta di chi gioca: non cambiano

6 semi × 300 punti per casella, un battitore per game (misura fatta con uno script di lavoro, non nel repository).

| | prima | dopo |
|---|---|---|
| servizio della CPU, velocità (Casual / Pro / Leggenda) | 192 / 227 / 217 km/h | 192 / 227 / 216–217 km/h |
| rimbalzo del servizio della CPU (distanza media dal centro del campo; dalla rete) | 2,15–2,24 m; 5,06–5,08 m | 2,12–2,23 m; 5,05–5,09 m |
| punti vinti in risposta, Casual (medio, amatore, tennista, bambino) | 91,3 · 85,3 · 98,4 · 39,4% | 90,1 · 87,5 · 99,3 · 37,9% |
| punti vinti in risposta, Pro | 63,5 · 58,2 · 96,1 · 13,2% | 64,2 · 58,0 · 97,7 · 12,7% |
| punti vinti in risposta, Leggenda | 16,9 · 11,8 · 27,5 · 5,0% | 17,2 · 11,3 · 28,8 · 5,3% |

Circa 880 punti in risposta per casella: ±3 punti. Il test «il servizio della CPU e la risposta di chi gioca non cambiano
con il servizio di chi gioca del punto prima» lo prova in modo esatto: stessa palla e stesso piano di chi risponde.
La tabella 5b lo conferma con 25 semi (circa 3600 punti in risposta per casella, ±1,6): le colonne «in risposta» di
prima e dopo stanno dentro l'errore.

## Obiettivi (D11)

| obiettivo | risultato | |
|---|---|---|
| servizio perfetto, forte e stretto a Casual: punto diretto 20–25% | 24,2% (ace 4,4%); con altri 4 semi 24,6% | raggiunto **in media** tra esterno e «T», vicino al limite alto. Solo esterno 31–34% (fuori fascia), solo «T» 17–18% |
| a Pro: 10–15% | 13,4% (ace 2,9%) | raggiunto **in media**. Solo esterno 20–22% (fuori fascia), solo «T» 8% |
| a Leggenda: intorno al 5% | 5,0% (nessun ace); esterno 4,8%, «T» 6,5% | raggiunto |
| servizio normale chiaramente meno | 14,7% · 4,7% · 2,1% | raggiunto |
| servizio colpito tardi chiaramente meno | 13,4% · 2,9% · 1,8% | raggiunto a Pro e Leggenda. A Casual vale chiaramente meno del servizio perfetto (13,4% contro 24,2%) ma quasi quanto quello normale (14,7%): scelta della revisione, per non punire chi comincia |
| CPU «in corsa» al servizio: 0 | 0% dappertutto | raggiunto |
| nessun ace regalato da uno scatto sbagliato | 0 ace con la CPU in corsa | raggiunto |
| non indebolire la Leggenda | 69/69; game della CPU come prima (tabelle 5 e 6) | raggiunto, con il limite scritto sotto |
| servizio della CPU e risposta di chi gioca come prima | tabella 7 e test | raggiunto |
| stesso schermo e due computer: servizio come prima | nessuna minaccia registrata (test, anche con un livello della CPU rimasto nel motore) | raggiunto nel motore; non provato con due computer veri |
| (dalla revisione) il servizio normale del telefono non deve costare ai più deboli a Casual | «bambino», punti al servizio: 52,4 → 51,3% (insegnato), 51,0 → 50,1% (piano), 52,6 → 48,7% (in ritardo) | raggiunto in parte: chi batte a tempo perde circa 1 punto su 100, chi colpisce sempre tardi circa 4. Di più non si può senza uscire dalla fascia 20–25% |

## Test

- **Nuovo `natpf-b18-t2-servizio.test.mjs`, 12 prove** (10 del passo, 2 della revisione), sul motore vero senza disegno:
  - a fine punto e a ogni servizio i quattro personaggi sono fermi, in sei punti veri per livello, con la CPU che
    correva quando il punto è finito;
  - `_natpfStandStill`: velocità, stato della corsa dell'animazione, affondo della Leggenda; anche sul computer del
    Player 2;
  - minaccia del servizio: servizio insegnato 0; forte al centro 0,7; perfetto sulla riga 1, uguale all'esterno e alla
    «T», nei due quadrati; in ritardo 0; kick lento di webcam e mouse 0; anche dal gesto vero nel motore;
  - errore in risposta: perfetto > forte > normale > in ritardo; la Leggenda non tira il dado. Revisione: a Pro il
    servizio in ritardo vale al più il 75% di quello normale; a Casual tiene tutta la base (stessa probabilità del
    servizio normale senza allungo) e resta sotto il servizio forte e quello perfetto;
  - la risposta legge il servizio ricevuto e non il colpo del punto prima;
  - lettura in ritardo: sul servizio perfetto la CPU resta ferma per il tempo previsto e poi parte; sul servizio normale
    parte al primo passo;
  - Leggenda: qualità della risposta −15% con la minaccia piena, uguale con il servizio normale;
  - solo contro la CPU: niente nel 1v1 (Player 1 e Player 2), niente sul servizio della CPU, niente sulle palle del
    lanciapalle. Revisione: una stanza con due persone e un livello della CPU rimasto nel motore (casual, pro,
    leggenda con `isMultiplayer`) non dà peso al servizio, mentre lo stesso servizio contro la CPU ce l'ha. Tolta la
    guardia `!isMultiplayer` di `_executeServeHit` questa prova ora fallisce (prima passavano tutte);
  - il servizio della CPU e il piano di chi risponde sono identici qualunque servizio abbia battuto chi gioca prima;
  - banco: fasce del punto diretto per livello (2 semi × 250), nessun ace con la CPU in corsa, CPU mai in corsa;
  - revisione, il banco con il servizio del telefono: conto dei game dalla sequenza dei punti, valori di prova
    (`--prova`: una voce non letta è un errore), i cinque modelli di servizio (forza, tempo, quota sulla riga), partite
    normali con il servizio insegnato a 157 km/h e non con il kick dei profili;
  - revisione, il bloccante: a Casual «bambino» che colpisce tardi con il telefono fa almeno il 12,5% di punti diretti
    e il 48% dei punti al servizio (4 semi × 300 punti); con i valori di prima della revisione la stessa misura è
    sotto (controllo al contrario dentro la prova).
- **Controllo al contrario:** tolta la riga che azzera la velocità, falliscono 7 prove su 12 (le due dei personaggi
  fermi, la lettura in ritardo, il 1v1, il banco e le due della revisione, che chiedono CPU mai in corsa e nessun ace
  sul servizio normale). Rimessa, passano. Rifatto dopo la revisione.
- **Nessun test esistente fissava i numeri vecchi:** non ne è stato cambiato nessuno. A `natpf-racchetta-motore` è stata
  aggiunta una riga per i campi nuovi della diagnostica e, con la revisione, le misure riassunte del peso del servizio
  (`serveWeight`, riga «Servizi dal gesto»).
- **Cambiata con la revisione** la prova dell'errore in risposta: prima chiedeva «in ritardo ≤ 75% del normale» a tutti
  e due i livelli, ora lo chiede solo a Pro. A Casual la regola è cambiata apposta.
- **Nuova prova nel browser `tools/e2e/natpf-servizio-peso.mjs`**, 8 verifiche: partita contro la CPU avviata da «Gioca»;
  fermi al servizio e nella pausa; servizio insegnato senza minaccia; servizio forte ed esterno con lettura in ritardo e
  un ace al terzo servizio («Punto tuo», «Ace! · 15-40» a schermo); a Leggenda nessun ace in 12 servizi.
- **`tools/e2e/natpf-rally.mjs`**: una verifica in più, nella pausa nessuno corre sul posto.

Risultati finali, rifatti dopo la revisione sul codice finale:

| verifica | risultato |
|---|---|
| test del gioco (`npm test`, con le dipendenze di `tools/lan` installate) | **1089/1089**, 0 saltati (prima del passo 1077, prima della revisione 1087) |
| sito (`node --test tools/test/*.test.mjs`) | 201/201 |
| `npm run build` | ok |
| `npm run audit:legend` | 69/69, «Tutti i criteri rispettati» |

Prove nel browser dopo la revisione (Chromium, una alla volta, porte proprie, build rifatta; la macchina era molto
carica per altri lavori):

| prova | risultato | note |
|---|---|---|
| natpf-servizio-peso | 8/8 | caso fissato: ace a Casual con la CPU ferma, nessun ace a Leggenda |
| natpf-rally | 9/9 | CPU a 5,3 m/s nell'istante di fine punto, 0 nella pausa |
| natpf-leggenda, giro 1 | 7/7 | nessun allungo in partita; forzati: piatto da +0,27 a +0,48 m |
| natpf-leggenda, giro 2 | 7/7 | 1 allungo in partita: piatto +0,23 m; forzati da +0,29 a +0,45 m |
| natpf-leggenda, giro 3 | 7/7 | nessun allungo in partita; forzati da +0,31 a +0,46 m |
| natpf-gesti-speciali | 9/9 | |
| natpf-1v1-p2p | 39/39 | |
| natpf-formato-fiera | 21/21 | |
| natpf-servizio-lancio | 12/12 | |
| natpf-training-flow | 22/22 | |

Tutte verdi al primo giro, nessuna rilanciata. In `natpf-leggenda` il caso dell'allungo con il piatto a +0,05 m (un
giro rosso su tre nella tappa 1) non si è ripresentato nemmeno in questi tre giri: minimo +0,23 m. Sei giri verdi in
tutto, tra il passo e la revisione, non bastano per dire che è sparito.

Prove nel browser prima della revisione (sul codice del passo, `d3ce64b`):

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
  sarà molto generoso. La diagnostica ora registra `minaccia`, `stretto` e `ritardoCpuMs` a ogni servizio e li riassume
  nel rapporto: bastano poche partite registrate per saperlo.
- **I modelli del servizio «da telefono» sono ipotesi.** «Insegnato», «in ritardo» (0,3 s dopo la cima del lancio in
  media), «piano», «forte» e «forte sulle righe» della tabella 5b li ha scritti il revisore, non vengono da persone
  vere. In particolare non so se un principiante colpisce davvero tardi così.
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
  «amatore» battendo sempre perfetto forte stretto: 14,9% prima, 16,5% con i personaggi fermi, 16,4% dopo). Nelle
  partite normali con il servizio forte del telefono (tabella 5c) chi gioca guadagna da 1 a 2 punti su 100 al servizio.
- **Rispetto al gioco pubblicato chi batte un servizio normale con il telefono fa meno punti.** Gli ace regalati erano
  il 6–9% dei servizi a Casual e Pro, per qualunque servizio. Senza: punti diretti del servizio insegnato 20 → 15% a
  Casual, 12 → 5% a Pro. È la correzione chiesta (personaggi fermi), non un effetto del peso del servizio.
- **Casual compensa in parte, Pro no** (scelta della revisione, da confermare: sezione «Revisione»). A Casual
  «bambino» perde 1 punto su 100 al servizio se batte a tempo e 4 su 100 se colpisce sempre tardi. A Pro i profili
  deboli perdono 3–8 punti su 100 al servizio (vincevano già solo il 2–4% dei game), «amatore» e «medio» 2–3.
- **A Casual il servizio in ritardo vale quasi quanto quello normale** (13,4% contro 14,7% di punti diretti): il
  rapporto chiedeva «chiaramente meno», e a Casual lo è solo rispetto al servizio perfetto. A Pro e Leggenda vale
  chiaramente meno anche di quello normale. Resta che sul servizio in ritardo la CPU attacca più spesso la risposta, a
  tutti i livelli.
- **Pro contro «medio» è al limite alto** del criterio (85%), prima e dopo. Con il servizio del telefono nel gioco
  pubblicato era sopra (85,4–85,8% dei game), ora 83,7–85,1%.
- **L'allungo vero sul servizio pesa la metà** che negli scambi. Senza, con la lettura in ritardo il servizio esterno
  superava l'obiettivo (27–28% a Casual, 17–18% a Pro).
- **Dadi.** A Casual e Pro l'errore in risposta è ancora una probabilità, come negli scambi. Il passo 2 della tappa 2
  («la CPU sbaglia per la pressione e non a caso») riguarda anche questa.

## Revisione

Un revisore indipendente ha riletto il passo al commit `6e76f8d`, ha rifatto le misure con semi suoi e ha provato a
rompere i test. Ha confermato: test del gioco, `audit:legend` 69/69, obiettivi D11 anche su semi diversi (come media di
esterno e «T»), CPU mai in corsa, servizio della CPU e risposta di chi gioca invariati, Leggenda identica con un
servizio normale. Ha trovato **un bloccante e cinque minori**. Qui sotto: che cosa ha trovato, che cosa ho rifatto io
per controllarlo, che cosa è cambiato. Dopo le correzioni ho rifatto tutte le misure e tutte le verifiche.

### Il bloccante: «un servizio normale vale come prima» era vero solo per il servizio dei profili simulati

**Cosa diceva il documento.** «Un servizio normale vale come prima», «l'equilibrio dei livelli non si sposta», «Casual
per i più deboli resta com'era».

**Cosa è vero.** I profili simulati battono un kick lento (133 km/h) che nel gioco pubblicato riceveva pochi ace
regalati (0,4–2%). Il servizio del telefono, quello del prodotto, ne riceveva il 6–9% a Casual e a Pro, anche battuto
piano o tardi. Tolti quelli con la correzione dei personaggi fermi, chi batte un servizio normale con il telefono fa
circa metà dei punti diretti di prima, e a Casual i più deboli vincono meno game. Le tabelle dei game non potevano
vederlo.

**Ho rifatto la sua misura** con lo script ora nel repository (`--naturale --servizio=…`), stessi 25 semi: stessi
numeri al decimale. Casual, «bambino», gioco pubblicato → passo prima della revisione: servizio insegnato, punti diretti
20,1 → 13,3%, punti al servizio 52,4 → 49,6%, game 40,6 → 38,1%; in ritardo 18,5 → 10,7%, 52,6 → 47,0%, 41,3 → 33,6%.
Il bloccante è giusto.

**Correzioni.**
1. **Documento.** Le tre frasi sono corrette in «Cosa cambia», nelle tabelle 4 e 5, negli obiettivi e nei limiti. Ogni
   tabella dice quale servizio batte la simulazione.
2. **Banco.** `scripts/audit/servizio.mjs` ha le partite normali con il servizio del telefono (tabelle 5b e 5c), con
   punti al servizio e in risposta, game e game al servizio. Le tabelle dei game ora misurano quello che succede con il
   telefono.
3. **Compensazione a Casual** (`natpf_skill.SERVE_WEIGHT.casual`): la base dell'errore in risposta passa da 0,135 a
   0,15, e il servizio fuori tempo non perde più il 40% della base (`lateBase` 1; a Pro resta 0,6). Pro e Leggenda non
   sono toccati.

**Le varianti provate.** Casual, «bambino», 25 semi × 300 punti per il telefono; banco 8 semi × 400.

| variante | base | ritardo | banco: tutorial | banco: perfetto forte stretto | banco: in ritardo | «bambino», punti al servizio (insegnato · in ritardo · piano) | «bambino», game |
|---|---|---|---|---|---|---|---|
| gioco pubblicato | — | — | 22,8% | 33,0% | 19,7% | 52,4 · 52,6 · 51,0% | 40,6 · 41,3 · 38,0% |
| pubblicato con i personaggi fermi | — | — | 13,8% | 17,9% | 13,4% | 48,9 · 47,6 · 46,8% | 37,9 · 34,0 · 34,1% |
| passo prima della revisione | 0,135 | 60% | 13,0% | 22,5% | 8,9% | 49,6 · 47,0 · 48,3% | 38,1 · 33,6 · 35,2% |
| solo senza penalità del ritardo | 0,135 | 100% | 13,0% | 22,5% | 12,7% | 49,6 · 47,9 · 49,6% | 38,0 · 35,4 · 37,5% |
| **scelta** | **0,15** | **100%** | **14,7%** | **24,2%** | **13,4%** | **51,3 · 48,7 · 50,1%** | **40,3 · 35,7 · 40,0%** |
| base più alta | 0,16 | 100% | 15,4% | 24,1% | 14,6% | 50,4 · 49,2 · 50,4% | 39,7 · 37,7 · 39,8% |
| proposta del revisore | 0,17 | 100% | 16,4% | **26,3% (fuori fascia)** | 16,3% | 50,2 · 50,2 · 51,1% | 38,6 · 37,2 · 39,8% |

Errore: ±1,5 sui punti diretti del banco (3200 servizi), ±1,6 sui punti al servizio, ±3 sui game. Le righe vicine si
distinguono poco: conta l'andamento.

**Perché 0,15 e non 0,17.** Con 0,17 il servizio perfetto, forte e stretto esce dalla fascia dell'obiettivo (26,3% su
3200 servizi; il revisore aveva 25,2% su 1600). Tra 0,135 e 0,17 il punto diretto sale di circa un punto per ogni
centesimo di base (22,5 → 26,3%): con 0,16 sta intorno al 25%, sul limite, anche se questa misura dà 24,1%. Con 0,15 è
24,2% (24,6% con altri quattro semi) e chi batte a tempo torna a un punto su 100 dal gioco pubblicato.

**Cosa resta.** Chi colpisce sempre tardi a Casual perde ancora circa 4 punti su 100 al servizio rispetto al gioco
pubblicato (52,6 → 48,7%). Recuperarli tutti vorrebbe dire far sbagliare la CPU sul servizio in ritardo più che su
quello a tempo, oppure rimettere gli ace regalati. A Pro non c'è compensazione: lì chi batte normale fa 4–6% di punti
diretti invece di 10–13%.

**È una scelta da confermare dall'utente.** Le due strade alternative:
- *tornare ai valori del passo* (base 0,135, ritardo al 60%): il servizio in ritardo vale chiaramente meno anche a
  Casual (8,9%), i più deboli perdono 2–6 punti su 100 al servizio, e il recupero per loro arriva con il livello
  Bambini del gruppo 3;
- *compensare di più* (base 0,17): i più deboli tornano quasi al gioco pubblicato, ma il servizio perfetto supera la
  fascia del rapporto.

Come cambiare: i due numeri sono `base` e `lateBase` di `SERVE_WEIGHT.casual` in `natpf-tennis/src/natpf/natpf_skill.js`.
Per provarli senza toccare il codice:
`npm run audit:serve -- --naturale --servizio=insegnato,tardi,piano --profiles=bambino,impreciso --difficulty=casual --nsemi=25 --prova=casual.base=.135,casual.lateBase=.6`.
Nel gioco non c'è niente da accendere: vale sempre a Casual.

### I minori

1. **Obiettivi raggiunti solo come media di esterno e «T».** Vero: rimisurato, solo esterno 31–34% a Casual e 20–22% a
   Pro, solo «T» 17–18% e 8%. La tabella degli obiettivi e la tabella 3 ora lo dicono. Non ho accorciato la lettura in
   ritardo per rientrare in fascia con il solo esterno: toglierebbe gli ace veri, che sono il segno a schermo che il
   servizio conta, e non è più facile del gioco pubblicato. Resta una scelta aperta.
2. **La guardia del 1v1 non era provata.** Vero: senza la riga «1v1» in `SERVE_WEIGHT` le prove passavano anche
   togliendo `!isMultiplayer`. Aggiunta la prova con una stanza a livello casual, pro e leggenda. Rifatta la sua
   mutazione: tolta la guardia, la prova fallisce.
3. **Il criterio «preciso» della Leggenda è rumoroso con 8 semi.** Vero e non dipende da questo passo. `audit:legend`
   ora accetta fino a 40 semi e riporta l'errore. Con 40 semi: CPU 65,5% dei game, punti di chi gioca 43,8% ± 0,65.
4. **I campi nuovi della diagnostica non erano riassunti.** Ora `computeMetrics` dà quota di servizi con minaccia,
   quota letta in ritardo, minaccia media e km/h; la riga «Servizi dal gesto» del rapporto e il visore li mostrano.
5. **Il servizio in ritardo a Casual valeva meno anche del gioco con i personaggi fermi.** Corretto dentro il
   bloccante: la penalità del ritardo è per livello, a Casual non c'è.

### Trovato rifacendo il lavoro

- **`--prova` del banco perdeva i valori.** L'opzione leggeva solo fino al secondo «=»: `--prova=casual.lateBase=1`
  non cambiava niente e non lo diceva. Le prime tre varianti che ho misurato erano tutte il gioco senza varianti; me ne
  sono accorto perché davano numeri identici. Corretto, con test: una voce non letta ora è un errore.
- **Tutti i numeri di Casual del documento** cambiano con la base nuova: rifatte le tabelle 1, 3, 4, 5, 6 e 7. Pro e
  Leggenda, rimisurati, sono uguali numero per numero a quelli del passo.
- **Il servizio forte nelle partite normali** (tabella 5c) non era misurato: anche lui fa meno punti diretti del gioco
  pubblicato, ma ora vale più di quello normale.

### Non verificato dopo la revisione

Come prima: niente persone vere, telefoni veri, Windows, ledwall, due computer veri, audio. In più: i modelli del
servizio «da telefono» sono ipotesi del revisore; non ho rimisurato il doppio, la webcam «argon» e l'esercizio del
servizio nell'Allenamento, dove la base nuova di Casual vale lo stesso.

