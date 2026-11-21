# B75 · Confronto nel riassunto del registro: assi del giroscopio × direzione dei colpi (21/11/2026)

Prodotto: **FIERA**. Richiesta dell'utente del 21/11: «Stoprovano assi del giroscopio corretti e poi nuova direzione colpi
dritto, ora stiamo usando questi». Allo stand si provano la voce **«Assi del giroscopio: Corretti · prova»** (B74,
`docs/b74/assi-giroscopio.md`) e la **«Direzione dei colpi: Nuova»** (B73, `docs/b73/direzione-b36-1.md`). Questo blocco non
cambia il gioco né il telefono: aggiunge al riassunto del registro una sezione che mette **uno accanto all'altro i quattro
gruppi** (assi oggi/corretti × direzione classica/nuova) e, con «Corretti», i telefoni (Android riordinato, iPhone come oggi).
Così, appena arriva il registro della giornata, si vede subito cosa è cambiato.

**Stato.** Ramo locale `b75-confronto` (base `natpf-simulator` `f6193cbe`, versione pubblicata 2026-11-20.2), commit locali,
**niente push**, file di versione e documenti vivi non toccati.

## In breve

- **Comando** (§1): `node natpf-tennis/scripts/registro/riassunto.mjs <cartella o file del registro>`. La sezione nuova si
  chiama **«Confronto: assi del giroscopio × direzione dei colpi (B75)»** e sta subito dopo «Direzione».
- **Sempre quattro gruppi**, anche vuoti («nessuna partita»), con partite, colpi e l'avviso **«pochi dati»** sotto 20 partite
  o 200 colpi (§2).
- **Per ogni gruppo**: cima rispetto al colpo abituale, lato del colpo rispetto alla palla e verso del gesto, tipi di colpo,
  tempo (Perfetto, anticipo, ritardo), colpi deboli e a vuoto, calibrazione giocando, partite e punti contro l'avversario per
  livello, dove va la palla (cima → rimbalzo, tempo → rimbalzo, obiettivi E1–E5 del piano B36), Precision, e una tabella per
  telefono (§3).
- **Worker non ricaricato**: le partite senza i campi vanno in gruppi a parte («non noti», «non nota»), fuori dai quattro, con
  un avviso «ATTENZIONE» che dice cosa fare (§2.4).
- **Come decidere** (§4): cosa serve vedere per accendere «Corretti» per tutti, per ritarare tipi di colpo e verso, e per
  la direzione «Nuova» (soglie del piano B36 §7.5–§7.6).
- **Prove** (§6): righe scritte a mano con i numeri attesi, registri finti con i quattro gruppi (il riassunto deve dare i
  numeri del generatore), i registri veri del 18–19/11 (un gruppo solo, nessun errore), Worker non ricaricato.

## 1. Il comando

Dalla cartella del repository, con il registro scaricato dalla pagina del Worker (file `registro-AAAA-MM-GG.jsonl.gz`, o
una cartella con più file):

```sh
node natpf-tennis/scripts/registro/riassunto.mjs <cartella | file.jsonl | file.jsonl.gz | file.zip> [--out=cartella]
```

Scrive `riassunto.md` e `riassunto.html` (da aprire con un doppio clic) in `--out` (di base `riassunto-registro/`). La sezione
del confronto è dopo «Direzione (B36.0…)».

Per provarlo senza un registro vero (dati inventati, con differenze messe apposta tra i gruppi):

```sh
node natpf-tennis/scripts/registro/finto.mjs --out=<cartella> --giorni=2 --partite=400 --confronto=1
node natpf-tennis/scripts/registro/riassunto.mjs <cartella> --out=<cartella-del-rapporto>
```

## 2. I gruppi

### 2.1 Come una partita entra in un gruppo

| Cosa | Da dove | Valori |
|---|---|---|
| **Assi** | riga «partita», `stand.assi` (B74) | `corretti` con la voce accesa; senza = `oggi` |
| **Direzione** | riga «partita», `dir` (B36.0/B73) | `classica` o `nuova` |
| **Telefono** (solo per la tabella «Per telefono») | con «corretti»: `tel.assi` / `tel2.assi`; con «oggi»: `tel.so` | «Android riordinato» (`assi: corretti`), «iPhone e altri, come oggi» (`assi: oggi`), «senza risposta (pagina di prima)» (niente `assi`: il telefono non ha la pagina del B74); con «oggi»: «Android», «iPhone», «altro o non noto» |

Chiave del gruppo: `assi · direzione`, per esempio «corretti · nuova». Il gruppo vale per **tutta la partita**: se lo staff
cambia una voce, cambia dalla partita dopo (le due voci valgono dalla prossima partita).

Entrano i **colpi del telefono in partita** di chi gioca e del Player 2 dello stesso schermo (righe «colpo» senza `amb`).
Restano fuori: allenamento, minigiochi e scambi di prova (righe con `amb`); le partite del computer del Player 2 della sfida
(`ruolo: p2`: i suoi colpi sono già nella partita dell'host, come nella sezione «Direzione»); le partite senza telefono
(mouse, tastiera, webcam). Il testo della sezione dice quante sono.

### 2.2 Calibrazione giocando e Precision

- **Calibrazione giocando** (righe «calibrazione» con `tipo: giocando`): in fiera gli scambi di prova sono dentro la partita
  (la riga arriva dopo la riga «partita») e contano per quella partita e per il telefono di quel giocatore (`chi`). Se la
  riga arriva prima di una partita, conta per la **partita dopo** sulla stessa postazione; se non arriva nessuna partita si
  conta a parte («Calibrazioni giocando senza una partita dopo»).
- **Precision** (righe «minigioco» con `gioco: precision`): la direzione è quella della riga del minigioco (`dir`); gli assi
  non ci sono in quella riga e si prendono dall'**ultima partita della stessa postazione** (o dalla prima dopo, se Precision
  viene prima di tutte). Senza nessuna partita della postazione: gruppo «non noti».

### 2.3 Pochi dati

Un gruppo ha **«pochi dati»** con meno di **20 partite** (criterio della B36.8 del piano) o meno di **200 colpi** (come la
sezione «Direzione» e il piano §7.6: «almeno 200 colpi per livello e per modello»). I numeri ci sono lo stesso, ma sono
indizi: il testo li elenca in «Pochi dati …», la tabella «Gruppi» lo dice nella colonna «Avviso». Per i quattro gruppi
servono quindi almeno 80 partite nella giornata (il 18/11 erano 263).

### 2.4 Worker non ricaricato

Il Worker del registro toglie in silenzio i campi che non conosce. Il riassunto se ne accorge così:

| Cosa manca | Come si vede | Cosa fa il riassunto |
|---|---|---|
| `assi` (Worker del formato 3 o prima) | gioco con formato 5 (`v` della riga «avvio»), partita con il telefono **senza** `displayLagMs` | gruppo **«non noti · …»**, fuori dai quattro, con «ATTENZIONE: … il Worker del registro non è stato ricaricato e ha tolto anche `assi`…» e il formato che la pagina del Worker deve mostrare |
| `dir` (Worker di prima del B36.0) | gioco con formato 2 o più, partita senza `dir` | gruppo **«… · non nota»**, fuori dai quattro, con «ATTENZIONE: … ha tolto il modello della direzione…» |
| solo `assi` (Worker del formato 4) | **non si vede**: `displayLagMs` c'è, e con la voce spenta il gioco non manda `assi` | se nessuna partita ha «Corretti», il testo lo dice come dubbio: «o la voce dello stand era spenta, o il Worker è fermo al formato 4 … controllare che la pagina del Worker dica «Formato delle righe: 5»» |

Il 21/11 l'utente ha ricaricato il Worker (formato 5, controllato: commit `f6193cbe`).

Le partite di versioni del gioco prima del B74 (formato sotto 5) non avevano la voce degli assi: contano in «oggi» e il testo
lo dice («Partite di versioni del gioco prima del B74…»), senza «ATTENZIONE».

## 3. Cosa misura ogni riga

Tutte le tabelle hanno una riga per gruppo (le tabelle delle misure solo i gruppi con dei colpi). Solo numeri aggregati:
niente postazioni, niente nomi.

### Testo in alto

- **Gruppi**: partite e colpi di ognuno dei quattro.
- **ATTENZIONE** (§2.4), partite prima del B74, partite fuori dal confronto, gruppi vuoti, gruppi con pochi dati.
- **Per ogni gruppo «… · nuova»** una riga: *la palla va dalla parte della cima?* Cima → rimbalzo (E1, obiettivo ≥ 0,80),
  tempo → rimbalzo, quota di colpi con la cima girata (|piatto| ≥ 0,5) che cadono dalla parte della cima, colpi giocati con
  la regola nuova (`nr: 1`) su quelli con la forma del colpo (`pf`). Come in `docs/b36/misure-torino.md` §2.

### Gruppi

| Colonna | Che cosa è |
|---|---|
| Partite, Finite | partite del gruppo; finite con la riga di fine «finita» |
| Durata (media) | durata delle partite finite (obiettivo «Durata» del piano: entro ±10 % da «classica») |
| Colpi del telefono | righe «colpo» in partita (§2.1) |
| Colpi con la regola nuova | colpi con `nr: 1` su quelli con il piatto `pf` (con «nuova» quasi tutti; la schiacciata no; con «classica» 0) |
| Avviso | «nessuna partita», «pochi dati», o «—» se basta |

### Cima rispetto al colpo abituale

Lo scarto della cima `dv` (gradi dal proprio colpo abituale, + a destra), come «Quanto si gira la cima» della sezione
«Direzione»: quanti colpi lo hanno; **mediana con il segno** (vicina a 0 se il centro della mira è giusto); **|scarto|: metà
entro ±°** (la mediana dello scarto senza segno) e **9 su 10 entro ±°**; quote **oltre 45°** e **oltre 60°** (misure
dubbie); **centro della mira per partita**: |mediana dello scarto| nei primi 20 colpi di ogni giocatore (almeno 10), una stima
dell'errore del seme degli scambi di prova (contiene anche le mire volute).

### Lato del colpo rispetto alla palla e verso del gesto

- **Dalla parte opposta alla palla**: colpi con `pl` (la palla, +1 a destra di chi colpisce) diverso da `lato` (parte del
  corpo del colpo), sui colpi con la palla di lato: dritto e rovescio probabilmente scambiati.
- **Aiutati**: colpi con `aiutato` (la direzione aiutata dal gioco, `assist ≥ 0,5`), su tutti i colpi.
- **Lato: dal gesto · dal verso atteso · dalla posizione**: da dove viene il lato del colpo (`ls` del B71: `g`, `a`, `p`).
  Più «dal gesto» vuol dire che il gioco si fida del verso letto dal telefono.
- **Verso incerto**: colpi con la confidenza del verso `vc` sotto 0,35 (`VC_INCERTA`, quella del telefono in fiera);
  **confidenza del verso (mediana)**.
- **Verso grezzo −1 · 0 · +1**: `vg`, il verso dei sensori prima del segno. Lo 0 è «verso non letto».

### Tipi di colpo

Quota dei colpi per tipo: topspin, piatto, tagliato, pallonetto, palla corta, schiacciata (nomi del motore `TOPSPIN`, `FLAT`,
`SLICE`, `LOB`, `DROP`, `SMASH`), altri. L'ultima colonna dice il tipo con lo **scarto più grande dal gruppo «oggi ·
classica»**, in punti percentuali (per esempio «pallonetto +12,0 punti»).

### Tempo del colpo, colpi deboli e a vuoto

**Perfetto** (voto `perfect`), **in anticipo** (`early`, `very early`), **in ritardo** (`late`, `very late`); **errore di
tempo mediano** in ms (+ anticipo) e **|errore|: metà entro**; **deboli** (`e: debole`); **rete o fuori**; **colpi a vuoto**
(righe «vuoto» in partita) ogni 100 colpi, con il numero.

### Calibrazione giocando

Giocatori per livello di quello che il gioco ha imparato dagli scambi di prova (`livello` della riga): `none`, `partial`,
`ok`, `full`, e la quota senza livello (non finita o saltata).

### Contro l'avversario, per livello (e lo stesso schermo)

Una riga per gruppo e livello (`bambini`, `casual`, `evento`, `esperta`, `leggenda`; «stesso schermo» a parte): partite,
finite, **vinte da chi gioca** (sulle finite), **punti vinti da chi gioca** (righe «punto»); per lo stesso schermo «—».
In più gli obiettivi **E2** (palle oltre 2,5 m dal centro, sul rimbalzo vero) ed **E3** (fuori con il tempo nella finestra,
|tu| ≤ 1) del piano B36 §7.6, che il piano chiede per livello (E2 a Evento, E3 a Bambini ed Evento).

### Dove va la palla: cima e tempo, obiettivi dello stand

- **Colpi con il rimbalzo** (`rx`).
- **E1 cima → rimbalzo**: correlazione di rango tra il piatto `pf` e il rimbalzo di lato (nel riferimento di chi colpisce):
  1 = la palla va sempre più in là quanto più si gira la cima. Obiettivo ≥ 0,80 con «nuova».
- **Tempo → rimbalzo**: lo stesso con il tempo (`−lato·tu`). Con «classica» oggi è il tempo che decide (0,85–0,87).
- **Cima girata: palla dalla sua parte**: colpi con |piatto| ≥ 0,5 che cadono dalla parte della cima.
- **Peso del tempo nella mira**: |mira totale − piatto| rispetto al totale (come la sezione «Direzione»).
- **E2**, **E3** (come sopra, tutti i livelli insieme), **E4** primi 10 colpi di ogni giocatore con |piatto| ≥ 0,5 (≥ 30 %),
  **E5** partite storte (almeno il 70 % dei colpi in una metà, giudicate con almeno 20 colpi, come la diagnostica; ≤ 10 %).

### Precision

Per gruppo (§2.2): partite, palle, **punti del gioco** (media; il gioco li calcola sul bersaglio), **punti col rimbalzo vero**
(media), **cima verso la zona** (palle delle 7 zone laterali con la cima girata dalla parte della zona oltre 3°),
**distanza dal centro della zona** (m) e **nella zona** (palle cadute dentro il cerchio della zona). Il dettaglio partita per
partita resta nella sezione «Direzione».

### Per telefono

Una riga per gruppo e telefono: **telefoni in partita** (ogni telefono di ogni partita), colpi, |scarto| metà entro, oltre
45°, dalla parte opposta alla palla, verso incerto, Perfetto, **pallonetti · tagliati** (i due tipi che il B74 dice cambiare
di più), cima → rimbalzo, **calibrazione ok o full**. È la tabella per confrontare **«Android riordinato» con «Android» di
oggi** e per controllare che **gli iPhone non cambino**.

## 4. Come leggerlo per decidere

### 4.1 Prima: i dati bastano?

1. **Nessun «ATTENZIONE»** nella sezione (Worker giusto). Se c'è, il gruppo «non noti» o «non nota» non si confronta.
2. I gruppi da confrontare **senza «pochi dati»** (≥ 20 partite, ≥ 200 colpi), e nella tabella «Per telefono» almeno 200
   colpi nella riga «Android riordinato». Per Precision almeno **100 palle per regola** di almeno 3 persone (B36.8).
3. **Stesso giorno, stesse postazioni**: il confronto giusto è tra i gruppi della stessa giornata, non con il 18–19/11 (§5):
   da allora sono cambiate altre cose (B71, B72, B73, B74).
4. **Rumore**: una quota p su n colpi ha un errore di circa ±2·√(p·(1−p)/n) (±5 punti per p = 30 % e n = 350). I colpi della
   stessa partita sono della stessa persona, quindi il rumore vero è più grande: contare anche le partite. Regola pratica:
   con 20–30 partite per gruppo contano solo differenze **grandi (10 punti o più)**; per differenze di 3–5 punti servono
   circa 100 partite per gruppo.
5. **Visitatori diversi**: se i gruppi vanno a orari diversi (bambini al pomeriggio…), le differenze possono venire da chi
   gioca. Meglio alternare le voci a blocchi brevi (per esempio ogni 4–6 giocatori o ogni mezz'ora) e ripetere.

### 4.2 Accendere «Corretti» per tutti

Il B74 (§3.C e §6, verifica §7) chiede una giornata di registro con la voce accesa prima di lasciarla accesa. Si confronta
**«corretti · classica» con «oggi · classica»** (la direzione di base) e, nella tabella «Per telefono», **«Android
riordinato» con «Android»** di oggi. Cosa serve vedere, tutto insieme:

| # | Misura | Serve | Da dove viene la soglia |
|---|---|---|---|
| 1 | Dalla parte opposta alla palla (Android) | **non più alta** di oggi (al più +2 punti) | B74 §3.B: «il lato non deve peggiorare» |
| 2 | Verso incerto (Android) | non più alto di oggi | B74 §4: il verso cambia nel 10–42 % dei colpi |
| 3 | Pallonetti e tagliati (Android) | non più bassi di oggi; meglio se più vicini a quelli degli iPhone | B74 §3.B e §4: con l'ordine giusto pallonetti 4/4 e tagliati 4/4 nel telefono simulato |
| 4 | Calibrazione ok o full | non più bassa di oggi (al più −5 punti) | il telefono Android ricalibra al cambio (B74 §1) |
| 5 | Perfetto, colpi a vuoto, rete o fuori | Perfetto non sotto oggi −3 punti; a vuoto e rete o fuori non sopra oggi +2 | il tempo non dipende dagli assi: se cambia, qualcosa non va |
| 6 | Punti vinti contro l'avversario, per livello | entro ±3 punti da oggi, con almeno 20 partite per livello | piano B36 §7.5 criterio 7 |
| 7 | iPhone («iPhone e altri, come oggi» contro «iPhone» di oggi) | uguali entro il rumore | B74: con la voce accesa gli iPhone non cambiano |
| 8 | «senza risposta (pagina di prima)» | nessuno | telefono con la pagina di prima: non riordina |
| 9 | Prova a mano dello staff (B74 §3) | pallonetto letto «Pallonetto», tagliato «Tagliato», racchetta che gira con il polso | il registro non sa cosa voleva fare chi gioca |

Se passano tutti, si può proporre all'utente di **accendere «Corretti» di base** (un altro blocco: cambia il valore di base
in `natpf_gyro_axes.js`, non questo). Se il punto 1 o il 6 peggiorano, la voce resta spenta e si va al §4.3.

### 4.3 Ritarare tipi di colpo e verso

Il B74 (§6) e la verifica (§7) dicono che con l'ordine giusto cambiano il tipo di colpo nel 50–58 % dei colpi veri e il verso
nel profilo semplice nel 42 %: le soglie `INTENT`, `VERTICAL`, `VERSE` e il verso del profilo semplice sono tarate sui numeri
di oggi. **Basta uno** di questi segnali, con la voce accesa e senza «pochi dati», per programmare la ritaratura:

- **Tipi**: «Scarto più grande da «oggi · classica»» oltre **10 punti**, oppure un tipo che **sparisce** (sotto il 3 %) o che
  **prende quasi tutto** (oltre il 60 %). Se calano pallonetti o tagliati: soglie della salita (`VERTICAL`); se cresce il
  piatto o il topspin a spese degli altri: `INTENT`.
- **Verso**: «Verso incerto» oltre il **25 %**, o «Lato: dal gesto» sotto il **70 %** (il gioco si affida al verso atteso o
  alla posizione della palla), o «Dalla parte opposta alla palla» peggiore di oggi: `VERSE` e verso del profilo semplice.
- **Calibrazione**: «none» più alto di oggi di 10 punti o più: soglie del profilo.

Il registro dice **se** ritarare; **quanto** lo dicono le registrazioni della diagnostica con la voce accesa (Pannello →
«Diagnostica» → Registra, B74 §3): servono i campioni dei sensori, che il registro non ha. Da fare solo con dati nuovi con
la voce accesa (B74 §6).

### 4.4 Direzione «Nuova»

Il piano B36 tiene «Nuova» **interna** fino al traguardo A (B73: «da non provare con le persone»); l'utente il 21/11 la prova
allo stand. Il registro dà le misure del piano §7.6 e della B36.8; si confronta **«… · nuova» con «… · classica» con gli
stessi assi**:

| Obiettivo | Misura nel confronto | Soglia | 18–19/11 (classica) |
|---|---|---|---|
| E1 la cima conta | Cima → rimbalzo (rango) | **≥ 0,80** con «nuova» | 0,35 (Torino 0,39–0,46) |
| la palla segue la cima | Cima girata: palla dalla sua parte | più alta di «classica» | 85,6 % di 895 |
| il tempo pesa meno | Tempo → rimbalzo; peso del tempo nella mira | più bassi di «classica» | 0,86; 78 % |
| E2 campo aperto | E2 oltre 2,5 m, riga «evento» della tabella per livello | **non sotto** «classica» | 49,5 % a Evento |
| E3 niente fuori a caso | E3 fuori con il tempo nella finestra, righe «bambini» ed «evento» | **≤ 3 %** | 0–0,7 % |
| E4 la cima si scopre | E4 primi 10 colpi con \|piatto\| ≥ 0,5 | **≥ 30 %** | 16,5 % |
| E5 partite non storte | E5 partite storte | **≤ 10 %** | 8,3 % (12 telefoni giudicati) |
| Durata | Durata (media), tabella «Gruppi» | entro **±10 %** da «classica» | 61 s |
| Livelli | Punti vinti per livello | entro **±3 punti** da «classica» (criterio 7) | — |
| Precision (B36.8) | Precision: nella zona, cima verso la zona | giusti con «nuova» non sotto «classica», su almeno 100 palle per regola; nei blocchi «gira la cima» almeno 8 palle su 10 verso la zona | nessuna Precision |

**Attenzione** (Torino e 18–19/11): la cima vera è molto imprecisa (metà dei colpi entro ±58°, il 60 % oltre 45°). Con
«nuova» la cima comanda: se la cima resta così, la direzione diventa quasi casuale per chi non mira. Il cancello della B36.0
per la cima (giro voluto entro ±15°, oltre 45° al più il 5 %) si legge nella tabella «Cima rispetto al colpo abituale». Il
traguardo C (accensione per gruppi) chiede che E1–E5 e la durata **non siano peggio di «classica»**: il registro è
un'informazione per l'utente, non un via libera da solo.

### 4.5 Le due voci insieme

| Se si vede | Vuol dire |
|---|---|
| «corretti · classica» ≈ «oggi · classica» nei punti 1–7 del §4.2 | la correzione degli assi non fa danni con la direzione di oggi: si può accendere per tutti |
| «corretti · *» con la cima meno dispersa (metà entro e oltre 45° più bassi) di «oggi · *» | la correzione rende la cima più costante: con «nuova» E1 dovrebbe salire (la verifica del B74 non lo aveva visto: 4 registrazioni meglio, 3 peggio) |
| E1 di «corretti · nuova» ≥ 0,80 e di «oggi · nuova» sotto | per «nuova» servono gli assi corretti: le due voci vanno accese insieme |
| E1 sotto 0,80 in tutti e due i gruppi «nuova» | la cima resta troppo imprecisa: «nuova» resta interna (piano §1 punto 8: si torna dall'utente) |
| «oggi · nuova» con punti vinti o durata fuori soglia | l'equilibrio va rifatto (B36.7) prima di accendere |

## 5. Riferimento: i registri veri del 18–19/11 (tutto «oggi · classica»)

Letti con il comando del §1 (file non nel repository): **nessun errore**, un gruppo solo, 325 partite di versioni prima del
B74 (formati 2 e 3), contate in «oggi · classica»; le altre tre «nessuna partita»; nessun «ATTENZIONE».

| Misura | 18/11 | 19/11 | insieme |
|---|---|---|---|
| Partite · colpi del telefono | 263 · 4483 | 62 · 1135 | 325 · 5618 |
| \|Scarto\| della cima: metà entro · 9 su 10 entro | ±61,7° · ±149,9° | ±46,3° · ±143,1° | ±58,3° · ±148,8° |
| Oltre 45° · oltre 60° | 61,6 % · 50,9 % | 51,6 % · 40,1 % | 59,6 % · 48,7 % |
| Centro della mira per partita: metà sotto · 9 su 10 sotto | 24,7° · 75,8° | 14,4° · 35,8° | 21,7° · 75,8° (67) |
| Dalla parte opposta alla palla · aiutati | 38,0 % · 64,0 % | 36,5 % · 63,5 % | 37,7 % · 63,9 % |
| Topspin · piatto · tagliato · pallonetto · palla corta · schiacciata | 36,9 · 8,1 · 26,8 · 12,9 · 6,1 · 9,2 % | 38,2 · 9,5 · 27,0 · 11,4 · 6,1 · 7,8 % | 37,2 · 8,4 · 26,8 · 12,6 · 6,1 · 8,9 % |
| Perfetto · anticipo · ritardo; errore mediano | 24,6 · 51,2 · 24,2 %; +63 ms | 24,0 · 53,0 · 23,1 %; +72 ms | 24,5 · 51,5 · 24,0 %; +65 ms |
| Rete o fuori · colpi a vuoto ogni 100 colpi | 3,9 % · 21,7 | 4,6 % · 21,2 | 4,1 % · 21,6 |
| Calibrazione giocando none · partial · ok · full | 49,6 · 23,9 · 23,3 · 2,1 % | 48,3 · 27,6 · 23,3 · 0,9 % | 49,3 · 24,7 · 23,3 · 1,8 % (493 giocatori) |
| E1 cima → rimbalzo · tempo → rimbalzo | 0,35 · 0,87 | 0,38 · 0,85 | 0,35 · 0,86 |
| Cima girata: palla dalla sua parte · peso del tempo | 84,3 % di 690 · 79 % | 89,8 % di 205 · 75 % | 85,6 % di 895 · 78 % |
| E2 · E3 · E4 · E5 | 50,7 · 0,5 · 15,9 · 10,0 % | 52,3 · 0,2 · 19,0 · 0,0 % | 51,1 · 0,4 · 16,5 · 8,3 % |

Verso del B71 (`vc`, `vg`, `ls`) e regola nuova: non ci sono (sono arrivati con la 2026-11-19.1 e la 2026-11-20.1). Deboli:
0 %. Tutti i telefoni erano Android.

## 6. Prove

| Prova | Cosa controlla |
|---|---|
| `natpf-tennis/test/registro-confronto.test.mjs` (6 prove, nuovo) | nomi di tipi, telefoni e gruppi; **valori noti** scritti a mano nei quattro gruppi (tutte le tabelle riga per riga: mediana, metà e 9 su 10 della cima, quote, lato, verso, tipi, tempo, colpi a vuoto, calibrazione prima e dentro la partita, livelli, E1–E4, Precision, per telefono, il colpo a vuoto del Player 2 sul suo telefono); centro della mira e partita storta; partite del P2 della sfida e senza telefono fuori; **registri finti con i quattro gruppi** (480 partite in 2 giorni: partite, finite, colpi, colpi a vuoto, regola nuova, lato, tipi, calibrazione, telefoni, Precision e livelli **uguali alla verità del generatore**; le differenze messe apposta si vedono: la cima comanda con «nuova», meno colpi dalla parte opposta e verso sicuro con gli Android riordinati, più pallonetti); **registri come quelli del 18–19/11** (un gruppo solo, nessun avviso); **Worker non ricaricato** (gruppi «non noti» e «non nota» con gli avvisi; formato 4 come dubbio) |
| `natpf-tennis/scripts/registro/finto.mjs` | opzione `confronto` (`--confronto=1`), spenta di base: **senza, righe identiche a prima** (confronto una tantum con il file della base su 4 configurazioni, 27 531 righe; le altre prove del registro dipendono da quelle righe) |
| Registri veri del 18–19/11 | §5: nessun errore, un gruppo, numeri coerenti con le sezioni di sempre (493 calibrazioni giocando come «Tutorial e calibrazione») |
| Mutazioni (una tantum) | quattro errori messi apposta nel riassunto (colpi opposti contati al contrario, Worker non riconosciuto, tagliato letto topspin, calibrazioni prima della partita perse): ognuno fa diventare rosse 1 o 2 prove |

Esito di `npm test` del gioco: vedi §6.1.

### 6.1 Esito

- `natpf-tennis/test/registro-confronto.test.mjs`: 6/6. Con `registro-riassunto`, `registro-worker` e `natpf-registro`: 81/81.
- `npm test` del gioco (21/11, commit `904e0cd0`): **1972 su 1973** verdi, 0 rosse, 1 saltata (il server LAN senza
  `npm ci` in `tools/lan` nella worktree, come sempre). Erano 1967 dopo la revisione del B74; le 6 in più sono quelle nuove.

## 7. Limiti e non verificato

- **Nessun registro vero con «Corretti» o «Nuova»**: la sezione è provata solo con righe scritte a mano e registri finti. Il
  primo registro vero della prova dirà se servono ritocchi (per esempio altri valori di `livello` o di `voto`: oggi i voti
  sconosciuti non contano né come Perfetto né come anticipo o ritardo).
- **Worker fermo al formato 4**: non si vede (§2.4). Prima della prova: pagina del Worker con «Formato delle righe: 5».
- **Calibrazione giocando e Precision** sono attribuite a una partita per vicinanza (§2.2): se lo staff cambia una voce tra
  la partita e Precision, quella Precision va nel gruppo della partita di prima.
- **Rumore**: le soglie del §4 sono regole pratiche; i colpi di una stessa persona non sono indipendenti.
- **Non divisi per gruppo**: la confidenza del tipo di colpo (`cf`), il margine sul picco (`mg`) e le misure dei sensori del
  B66 restano nelle loro sezioni, per tutto il registro insieme.
- Programma Windows, telefono vero, Worker su Cloudflare: non toccati e non provati in questo blocco (solo Node).
