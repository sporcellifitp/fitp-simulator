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
- **Sempre quattro gruppi**, anche vuoti («nessuna partita»), con partite, colpi, i giorni delle partite e un avviso a due
  livelli: **«pochi dati»** sotto 20 partite o 200 colpi, **«bastano solo per differenze di 10 punti o più»** da 20 a 99
  partite; le soglie di 2–5 punti del §4 valgono da 100 partite per gruppo (§2.3). Anche le tabelle di dettaglio (per
  telefono, per livello, Precision, calibrazione giocando) dicono quando i loro numeri sono pochi.
- **Per ogni gruppo**: cima rispetto al colpo abituale, lato del colpo rispetto alla palla e verso del gesto, tipi di colpo,
  tempo (Perfetto, anticipo, ritardo), colpi deboli e a vuoto, calibrazione giocando, partite e punti contro l'avversario per
  livello, dove va la palla (cima → rimbalzo, tempo → rimbalzo, obiettivi E1–E5 del piano B36), Precision, e una tabella per
  telefono (§3).
- **Worker non ricaricato**: le partite senza i campi vanno in gruppi a parte («non noti», «non nota»), fuori dai quattro, con
  un avviso «ATTENZIONE» che dice cosa fare (§2.4).
- **Come decidere** (§4): cosa serve vedere per accendere «Corretti» per tutti, per ritarare tipi di colpo e verso, e per
  la direzione «Nuova» (soglie del piano B36 §7.5–§7.6); quando un criterio è **«non decidibile»** o **«non valutabile»**
  (pochi dati) e cosa usare al suo posto.
- **Revisione** (§8): correzioni dopo la revisione del 21/11 (Player 2 della sfida tra due computer, avvisi, giorni,
  regole del §4).
- **Prove** (§6): righe scritte a mano con i numeri attesi, registri finti con i quattro gruppi (il riassunto deve dare i
  numeri del generatore), i registri veri del 18–19/11 (un gruppo solo, nessun errore), Worker non ricaricato, sfida tra
  due computer, soglie degli avvisi, più giornate.

## 1. Il comando

Dalla cartella del repository, con il registro scaricato dalla pagina del Worker (file `registro-AAAA-MM-GG.jsonl.gz`, o
una cartella con più file). **Per decidere si passa solo il file del giorno della prova**: con più giornate il riassunto lo
dice («Più giornate nello stesso confronto…», §4.1 punto 3).

```sh
node natpf-tennis/scripts/registro/riassunto.mjs <cartella | file.jsonl | file.jsonl.gz | file.zip> [--out=cartella]
```

Scrive `riassunto.md` e `riassunto.html` (da aprire con un doppio clic) in `--out` (di base `riassunto-registro/`). La sezione
del confronto è dopo «Direzione (B36.0…)».

Per provarlo senza un registro vero (dati inventati, con differenze messe apposta tra i gruppi; con due giorni finti il
testo dice anche «Più giornate nello stesso confronto»):

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
Restano fuori: allenamento, minigiochi e scambi di prova (righe con `amb`); le partite senza telefono (mouse, tastiera,
webcam); e il **Player 2 della sfida tra due computer**, da tutte e due le parti:

- dalla partita dell'host (`modo: due-computer`) i suoi colpi (`chi: 'a'`), colpi a vuoto e calibrazioni giocando. La voce
  degli assi vale **per un computer solo**: `natpf_gyro_axes` legge la voce di quel computer e `natpf_phone_racket` la manda
  al telefono collegato lì. Gli assi del telefono del P2 li decide quindi il computer del P2, e la riga «partita»
  dell'host non li dice (non ha `tel2`). Messi nel gruppo dell'host, finirebbero nel gruppo sbagliato quando le due voci
  sono diverse, e il loro telefono avrebbe un nome sbagliato («altro o non noto» o «senza risposta (pagina di prima)»);
- la partita del computer del P2 (`ruolo: p2`): ha `stand.assi`, `tel.assi` e la direzione dell'host, ma le sue righe
  «colpo» sono la previsione locale del colpo (B73, `docs/b73/unione.md` §7.2), non il colpo vero dell'host.

Per la **direzione** è diverso: la decide l'host, e la sezione «Direzione» tiene i colpi del P2 nella partita dell'host. Il
testo della sezione dice quante partite e quanti colpi restano fuori («Partite del computer del Player 2 della sfida: N
(M con «Corretti»)…», «Colpi del Player 2 della sfida tra due computer: N…»). Il 18–19/11 non c'erano sfide tra due computer.

### 2.2 Calibrazione giocando e Precision

- **Calibrazione giocando** (righe «calibrazione» con `tipo: giocando`): in fiera gli scambi di prova sono dentro la partita
  (la riga arriva dopo la riga «partita») e contano per quella partita e per il telefono di quel giocatore (`chi`). Se la
  riga arriva prima di una partita, conta per la **partita dopo** sulla stessa postazione; se non arriva nessuna partita si
  conta a parte («Calibrazioni giocando senza una partita dopo»).
- **Precision** (righe «minigioco» con `gioco: precision`): la direzione è quella della riga del minigioco (`dir`); gli assi
  non ci sono in quella riga e si prendono dall'**ultima partita della stessa postazione** (o dalla prima dopo, se Precision
  viene prima di tutte). Senza nessuna partita della postazione: gruppo «non noti».

### 2.3 Pochi dati

La colonna «Avviso» della tabella «Gruppi» ha due livelli:

| Partite del gruppo | Avviso | Cosa vuol dire |
|---|---|---|
| meno di **20**, o meno di **200 colpi** | «pochi dati (servono 20 partite e 200 colpi)» | i numeri sono indizi, non bastano per decidere (20 partite: criterio della B36.8; 200 colpi: come la sezione «Direzione» e il piano §7.6) |
| da **20 a 99** | «bastano solo per differenze di 10 punti o più (per 2–5 punti servono 100 partite)» | contano solo le differenze grandi; una differenza di 2–5 punti è **«non decidibile: continuare la prova»** (§4.1 punto 4) |
| da **100** in su | «—» | valgono anche le soglie di 2–5 punti del §4.2 e del §4.4 |

Il testo li elenca in «Pochi dati …» e in «Differenze piccole non decidibili …». Per i quattro gruppi servono quindi
almeno 80 partite nella giornata per uscire da «pochi dati» (il 18/11 erano 263) e 400 per le soglie piccole: in una
giornata sola, con quattro gruppi, di solito si decide solo sulle differenze grandi.

Anche le tabelle di dettaglio hanno una colonna «Avviso»:

| Tabella | «pochi dati» sotto | Perché |
|---|---|---|
| Per telefono | 200 colpi nella riga | §4.1 punto 2 |
| Contro l'avversario, per livello | 20 partite nella riga | criterio 6 del §4.2 |
| Precision | 100 palle **o** 3 visite | B36.8: 100 palle di almeno 3 persone (le visite al posto delle persone, §3) |
| Calibrazione giocando | 50 giocatori | da 50 in su dice «conta solo una differenza di N punti o più» con N = 100·√(2/n) (due gruppi, caso peggiore di una quota del 50 %, ±2 deviazioni); «—» quando N scende a 5 punti, la tolleranza del criterio 4 (circa 800 giocatori) |

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
- **ATTENZIONE** (§2.4), partite prima del B74, partite e colpi fuori dal confronto (§2.1), gruppi vuoti, gruppi con pochi
  dati e con «differenze piccole non decidibili» (§2.3), **più giornate** nello stesso confronto con le partite di ogni
  giorno (§4.1 punto 3).
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
| Avviso | «nessuna partita», «pochi dati», «bastano solo per differenze di 10 punti o più», o «—» (§2.3) |
| Giorni (partite) | giorni delle partite del gruppo, con quante per giorno (ora dello stand) |

### Cima rispetto al colpo abituale

Lo scarto della cima `dv` (gradi dal proprio colpo abituale, + a destra), come «Quanto si gira la cima» della sezione
«Direzione»: quanti colpi lo hanno; **mediana con il segno** (vicina a 0 se il centro della mira è giusto); **|scarto|: metà
entro ±°** (la mediana dello scarto senza segno) e **9 su 10 entro ±°**; quote **oltre 45°** e **oltre 60°** (misure
dubbie); **centro della mira di ogni giocatore in ogni partita**: |mediana dello scarto| nei primi 20 colpi di ogni
giocatore (almeno 10), una stima dell'errore del seme degli scambi di prova (contiene anche le mire volute). Il numero tra
parentesi conta i **giocatori** (nello stesso schermo due per partita), non le partite.

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
`ok`, `full`, e la quota senza livello (non finita o saltata). **Avviso**: «pochi dati» sotto 50 giocatori; da 50 in su la
differenza più piccola che conta tra due gruppi (§2.3).

### Contro l'avversario, per livello (e lo stesso schermo)

Una riga per gruppo e livello (`bambini`, `casual`, `evento`, `esperta`, `leggenda`; «stesso schermo» a parte): partite,
finite, **vinte da chi gioca** (sulle finite), **punti vinti da chi gioca** (righe «punto»); per lo stesso schermo «—».
In più gli obiettivi **E2** (palle oltre 2,5 m dal centro, sul rimbalzo vero) ed **E3** (fuori con il tempo nella finestra,
|tu| ≤ 1) del piano B36 §7.6, che il piano chiede per livello (E2 a Evento, E3 a Bambini ed Evento), la **durata media** e
i **punti a partita** delle partite finite (anche per lo stesso schermo: servono per l'equilibrio quando le partite contro
l'avversario sono poche) e l'**Avviso** («pochi dati» sotto 20 partite). Quando un gruppo ha due livelli o più contro
l'avversario c'è anche la riga **«tutti i livelli contro l'avversario»**, la somma dei livelli: mescola livelli diversi,
quindi va letta solo se i gruppi hanno più o meno gli stessi livelli (si vede dalle righe sopra).

### Dove va la palla: cima e tempo, obiettivi dello stand

- **Colpi con il rimbalzo** (`rx`).
- **E1 cima → rimbalzo**: correlazione di rango tra il piatto `pf` e il rimbalzo di lato (nel riferimento di chi colpisce):
  1 = la palla va sempre più in là quanto più si gira la cima. Obiettivo ≥ 0,80 con «nuova».
- **Tempo → rimbalzo**: lo stesso con il tempo (`−lato·tu`). Con «classica» oggi è il tempo che decide (0,85–0,87).
- **Cima girata: palla dalla sua parte**: colpi con |piatto| ≥ 0,5 che cadono dalla parte della cima.
- **Peso del tempo nella mira**: |mira totale − piatto| rispetto al totale (come la sezione «Direzione»).
- **E2**, **E3** (come sopra, tutti i livelli insieme), **E4** primi 10 colpi di ogni giocatore con |piatto| ≥ 0,5 (≥ 30 %),
  **E5** partite storte, **per giocatore** (almeno il 70 % dei colpi in una metà, giudicate con almeno 20 colpi, come la
  diagnostica; ≤ 10 %): tra parentesi i giocatori giudicati, non le partite.

### Precision

Per gruppo (§2.2): partite, palle, **punti del gioco** (media; il gioco li calcola sul bersaglio), **punti col rimbalzo vero**
(media), **cima verso la zona** (palle delle 7 zone laterali con la cima girata dalla parte della zona oltre 3°),
**distanza dal centro della zona** (m), **nella zona** (palle cadute dentro il cerchio della zona), **visite (circa le
persone)** e **Avviso** («pochi dati» sotto 100 palle o 3 visite). Le visite al posto delle persone: il registro non ha chi
gioca, e una visita (da quando qualcuno lascia il menu principale a quando ci si torna, riga «visita») è il conto più
vicino senza identificativi. Le partite a Precision della stessa visita contano una visita; una visita finisce con la
riga «visita» o con un avvio del gioco. È un'approssimazione: due persone di fila senza tornare al menu fanno una visita,
la stessa persona che torna al menu e rigioca ne fa due. Il dettaglio partita per partita resta nella sezione «Direzione».

### Per telefono

Una riga per gruppo e telefono: **telefoni in partita** (ogni telefono di ogni partita), colpi, |scarto| metà entro, oltre
45°, dalla parte opposta alla palla, verso incerto, **lato dal gesto** (quota di `ls: g`), Perfetto, **pallonetti ·
tagliati** (i due tipi che il B74 dice cambiare di più), cima → rimbalzo, **calibrazione ok o full**, **Avviso** («pochi
dati» sotto 200 colpi). È la tabella per confrontare **«Android riordinato» con «Android» di oggi** e per controllare che
**gli iPhone non cambino**.

## 4. Come leggerlo per decidere

### 4.1 Prima: i dati bastano?

1. **Nessun «ATTENZIONE»** nella sezione (Worker giusto). Se c'è, il gruppo «non noti» o «non nota» non si confronta.
2. I gruppi da confrontare **senza «pochi dati»** (≥ 20 partite, ≥ 200 colpi), e nella tabella «Per telefono» almeno 200
   colpi nella riga «Android riordinato» (colonna «Avviso» con «—»). Per Precision almeno **100 palle per regola** di
   almeno 3 visite (colonna «Visite (circa le persone)», §3; la B36.8 dice 3 persone).
3. **Stesso giorno, stesse postazioni**: il confronto giusto è tra i gruppi della stessa giornata, non con il 18–19/11 (§5):
   da allora sono cambiate altre cose (B71, B72, B73, B74). La colonna «Giorni (partite)» dice i giorni di ogni gruppo; se il
   testo dice **«Più giornate nello stesso confronto»**, per decidere si rifà il riassunto con il solo file del giorno
   della prova (con una cartella di più giorni «oggi · classica» mescola il giorno della prova con quelli di prima).
4. **Rumore**: una quota p su n colpi ha un errore di circa ±2·√(p·(1−p)/n) (±5 punti per p = 30 % e n = 350). I colpi della
   stessa partita sono della stessa persona, quindi il rumore vero è più grande: contare anche le partite. Regola pratica:
   con 20–99 partite per gruppo contano solo differenze **grandi (10 punti o più)**; per differenze di 2–5 punti servono
   circa 100 partite per gruppo. La colonna «Avviso» lo dice per ogni gruppo (§2.3). Sotto 100 partite una differenza di
   2–5 punti è **«non decidibile: continuare la prova»**: non dice né che la voce va bene né che va male. In un giorno
   finto da 100 partite (25 per gruppo), con il tempo dei colpi uguale in tutti i gruppi, «Perfetto» viene 24,0 % in «oggi
   · classica» e 16,0 % in «corretti · classica»: 8 punti solo per caso.
5. **Visitatori diversi**: se i gruppi vanno a orari diversi (bambini al pomeriggio…), le differenze possono venire da chi
   gioca. Meglio alternare le voci a blocchi brevi (per esempio ogni 4–6 giocatori o ogni mezz'ora) e ripetere.

### 4.2 Accendere «Corretti» per tutti

Il B74 (§3.C e §6, verifica §7) chiede una giornata di registro con la voce accesa prima di lasciarla accesa. Si confronta
**«corretti · classica» con «oggi · classica»** (la direzione di base) e, nella tabella «Per telefono», **«Android
riordinato» con «Android»** di oggi. Le soglie di 2–5 punti (punti 1, 4, 5 e 6) valgono **solo con almeno ~100 partite per
gruppo** (avviso «—»); con 20–99 partite contano solo i peggioramenti di 10 punti o più, uno più piccolo è «non
decidibile» (§4.1 punto 4). Cosa serve vedere, tutto insieme:

| # | Misura | Serve | Da dove viene la soglia |
|---|---|---|---|
| 1 | Dalla parte opposta alla palla (Android) | **non più alta** di oggi (al più +2 punti) | B74 §3.B: «il lato non deve peggiorare» |
| 2 | Verso incerto (Android) | non più alto di oggi | B74 §4: il verso cambia nel 10–42 % dei colpi |
| 3 | Pallonetti e tagliati (Android) | non più bassi di oggi; meglio se più vicini a quelli degli iPhone | B74 §3.B e §4: con l'ordine giusto pallonetti 4/4 e tagliati 4/4 nel telefono simulato |
| 4 | Calibrazione ok o full | non più bassa di oggi (al più −5 punti); l'avviso della tabella dice quale calo si vede con quei giocatori (−5 punti solo da circa 800 per gruppo) | il telefono Android ricalibra al cambio (B74 §1) |
| 5 | Perfetto, colpi a vuoto, rete o fuori | Perfetto non sotto oggi −3 punti; a vuoto e rete o fuori non sopra oggi +2 | il tempo non dipende dagli assi: se cambia, qualcosa non va |
| 6 | Punti vinti contro l'avversario, per livello | entro ±3 punti da oggi, con almeno 20 partite per livello; sotto 20 (avviso «pochi dati») **non valutabile** e non blocca: al suo posto la riga «tutti i livelli contro l'avversario» (se i livelli dei gruppi sono simili) e, per l'equilibrio, la riga «stesso schermo» (durata, punti a partita) | piano B36 §7.5 criterio 7 |
| 7 | iPhone («iPhone e altri, come oggi» contro «iPhone» di oggi) | uguali entro il rumore | B74: con la voce accesa gli iPhone non cambiano |
| 8 | «senza risposta (pagina di prima)» | nessuno | telefono con la pagina di prima: non riordina |
| 9 | Prova a mano dello staff (B74 §3) | pallonetto letto «Pallonetto», tagliato «Tagliato», racchetta che gira con il polso | il registro non sa cosa voleva fare chi gioca |

Come leggere l'esito:

- **passa**: tutti i punti valutabili entro la soglia. Si può proporre all'utente di **accendere «Corretti» di base** (un
  altro blocco: cambia il valore di base in `natpf_gyro_axes.js`, non questo).
- **non passa**: il punto 1 o il 6 peggiorano **oltre il rumore** (con ~100 partite per gruppo oltre la soglia; con 20–99 di
  10 punti o più). La voce resta spenta e si va al §4.3.
- **non decidibile**: le differenze stanno sotto quello che i dati possono dire («pochi dati», o una differenza piccola con
  «bastano solo per differenze di 10 punti o più»). Non è un no: si **continua la prova** (un'altra giornata, voci
  alternate a blocchi, §4.1 punto 5), senza conclusioni.
- **non valutabile**: un criterio senza abbastanza casi (per esempio il 6: con il pubblico dello stand quasi tutte le
  partite sono «stesso schermo», 292 su 325 il 18–19/11, e contro l'avversario c'erano 1, 14, 16 e 2 partite per livello in
  due giorni). Non blocca: si scrive che non è stato valutato e si usano le righe indicate nella tabella.

### 4.3 Ritarare tipi di colpo e verso

Il B74 (§6) e la verifica (§7) dicono che con l'ordine giusto cambiano il tipo di colpo nel 50–58 % dei colpi veri e il verso
nel profilo semplice nel 42 %: le soglie `INTENT`, `VERTICAL`, `VERSE` e il verso del profilo semplice sono tarate sui numeri
di oggi. Si confronta sempre **«corretti · X» con «oggi · X», con la stessa direzione X**: la tabella «Tipi di colpo» per i
tipi, le righe **Android** della tabella «Per telefono» per il verso. Tutte le soglie qui sotto sono **differenze da
«oggi»**, non valori assoluti, e valgono come al §4.2: quelle di 2–5 punti solo con l'avviso «—», con 20–99 partite solo
le differenze di 10 punti o più.

**Spostamento atteso, nessuna ritaratura.** Pallonetti e tagliati che **salgono** verso le quote degli iPhone (B74 §3.B e
§4: con l'ordine giusto pallonetti 4/4 e tagliati 4/4 nel telefono simulato) e, di conseguenza, topspin o piatto che
**scendono**. È l'effetto voluto della correzione, anche se la colonna «Scarto più grande da «oggi · classica»» supera 10
punti: nei registri finti del §1 (due giorni da 400 partite), fatti apposta con questo effetto, dice «topspin −14,5 punti»
in «corretti · classica» e «pallonetto +14,2 punti» in «corretti · nuova».

**Spostamento anomalo: basta uno** di questi segnali, con la voce accesa e senza «pochi dati», per programmare la
ritaratura:

- **Tipi**: un tipo che **sparisce** (sotto il 3 %) o che **prende quasi tutto** (oltre il 60 %); pallonetti o tagliati che
  **calano** rispetto a «oggi»: soglie della salita (`VERTICAL`); piatto o topspin che **crescono** a spese degli altri:
  `INTENT`.
- **Verso** (riga «Android riordinato» contro «Android» di «oggi»): «Verso incerto» più alto di **5 punti o più**, «Lato dal
  gesto» più basso di **5 punti o più** (il gioco si affida di più al verso atteso o alla posizione della palla), o «Dalla
  parte opposta alla palla» più alto di **2 punti o più** (come il punto 1 del §4.2): `VERSE` e verso del profilo semplice.
  Niente soglie assolute: `vc` e `ls` non c'erano nei registri del 18–19/11 (§5) e la soglia di `vc` (0,35) è stata scelta
  senza dati veri (`docs/b71/gesti.md`), quindi un valore assoluto può scattare anche con «oggi» e non dice niente degli
  assi. Il giorno della prova li hanno tutti e due i gruppi (versione 2026-11-20.2).
- **Calibrazione**: «none» più alto di oggi di 10 punti o più, se l'avviso della tabella «Calibrazione giocando» dice che
  una differenza di 10 punti si vede con quei giocatori: soglie del profilo.

Il registro dice **se** ritarare; **quanto** lo dicono le registrazioni della diagnostica con la voce accesa (Pannello →
«Diagnostica» → Registra, B74 §3): servono i campioni dei sensori, che il registro non ha. Da fare solo con dati nuovi con
la voce accesa (B74 §6).

### 4.4 Direzione «Nuova»

Il piano B36 tiene «Nuova» **interna** fino al traguardo A (B73: «da non provare con le persone»); l'utente il 21/11 la prova
allo stand. Il registro dà le misure del piano §7.6 e della B36.8; si confronta **«… · nuova» con «… · classica» con gli
stessi assi**. Le soglie relative (non sotto, più alta, più bassa, ±10 % della durata, ±3 punti) valgono come al §4.2: da
~100 partite per gruppo; con 20–99 contano solo le differenze grandi, una piccola è «non decidibile». Le righe per livello
con meno di 20 partite («pochi dati») sono **non valutabili** e non bloccano: al loro posto E2 ed E3 di tutti i livelli
(tabella «Dove va la palla», o la riga «tutti i livelli contro l'avversario») e, per l'equilibrio, la riga «stesso schermo».

| Obiettivo | Misura nel confronto | Soglia | 18–19/11 (classica) |
|---|---|---|---|
| E1 la cima conta | Cima → rimbalzo (rango) | **≥ 0,80** con «nuova» | 0,35 (Torino 0,39–0,46) |
| la palla segue la cima | Cima girata: palla dalla sua parte | più alta di «classica» | 85,6 % di 895 |
| il tempo pesa meno | Tempo → rimbalzo; peso del tempo nella mira | più bassi di «classica» | 0,86; 78 % |
| E2 campo aperto | E2 oltre 2,5 m, riga «evento» della tabella per livello (sotto 20 partite: tutti i livelli) | **non sotto** «classica» | 49,5 % a Evento (16 partite); 51,1 % tutti |
| E3 niente fuori a caso | E3 fuori con il tempo nella finestra, righe «bambini» ed «evento» (sotto 20 partite: tutti i livelli) | **≤ 3 %** | 0–0,7 % (1 e 16 partite); 0,4 % tutti |
| E4 la cima si scopre | E4 primi 10 colpi con \|piatto\| ≥ 0,5 | **≥ 30 %** | 16,5 % |
| E5 partite non storte | E5 partite storte, per giocatore | **≤ 10 %** | 8,3 % (12 giocatori giudicati) |
| Durata | Durata (media), tabella «Gruppi» | entro **±10 %** da «classica» | 61 s |
| Livelli | Punti vinti per livello | entro **±3 punti** da «classica» (criterio 7); sotto 20 partite per livello non valutabile: riga «tutti i livelli contro l'avversario» e riga «stesso schermo» (durata, punti a partita) | tutti i livelli 55,8 % (33 partite); stesso schermo 5,8 punti a partita |
| Precision (B36.8) | Precision: nella zona, cima verso la zona | giusti con «nuova» non sotto «classica», su almeno 100 palle per regola di almeno 3 visite (avviso «—»); nei blocchi «gira la cima» almeno 8 palle su 10 verso la zona | nessuna Precision |

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
B74 (formati 2 e 3), contate in «oggi · classica»; le altre tre «nessuna partita»; nessun «ATTENZIONE». Con la cartella dei
due giorni il testo dice anche «Più giornate nello stesso confronto: 2026-11-18 (263 partite), 2026-11-19 (62 partite)»
(giusto: sono due giornate); con un file solo no. Il 19/11 da solo (62 partite) ha l'avviso «bastano solo per differenze di
10 punti o più».

| Misura | 18/11 | 19/11 | insieme |
|---|---|---|---|
| Partite · colpi del telefono | 263 · 4483 | 62 · 1135 | 325 · 5618 |
| \|Scarto\| della cima: metà entro · 9 su 10 entro | ±61,7° · ±149,9° | ±46,3° · ±143,1° | ±58,3° · ±148,8° |
| Oltre 45° · oltre 60° | 61,6 % · 50,9 % | 51,6 % · 40,1 % | 59,6 % · 48,7 % |
| Centro della mira di ogni giocatore in ogni partita: metà sotto · 9 su 10 sotto | 24,7° · 75,8° (54 giocatori) | 14,4° · 35,8° (13) | 21,7° · 75,8° (67) |
| Dalla parte opposta alla palla · aiutati | 38,0 % · 64,0 % | 36,5 % · 63,5 % | 37,7 % · 63,9 % |
| Topspin · piatto · tagliato · pallonetto · palla corta · schiacciata | 36,9 · 8,1 · 26,8 · 12,9 · 6,1 · 9,2 % | 38,2 · 9,5 · 27,0 · 11,4 · 6,1 · 7,8 % | 37,2 · 8,4 · 26,8 · 12,6 · 6,1 · 8,9 % |
| Perfetto · anticipo · ritardo; errore mediano | 24,6 · 51,2 · 24,2 %; +63 ms | 24,0 · 53,0 · 23,1 %; +72 ms | 24,5 · 51,5 · 24,0 %; +65 ms |
| Rete o fuori · colpi a vuoto ogni 100 colpi | 3,9 % · 21,7 | 4,6 % · 21,2 | 4,1 % · 21,6 |
| Calibrazione giocando none · partial · ok · full | 49,6 · 23,9 · 23,3 · 2,1 % | 48,3 · 27,6 · 23,3 · 0,9 % | 49,3 · 24,7 · 23,3 · 1,8 % (493 giocatori) |
| Calibrazione giocando: giocatori · avviso | 377 · «conta solo una differenza di 8 punti o più» | 116 · «… di 14 punti o più» | 493 · «… di 7 punti o più» |
| Contro l'avversario, tutti i livelli: partite · punti vinti · durata | 29 · 55,3 % · 70 s | 4 · 58,3 % · 86 s («pochi dati») | 33 · 55,8 % · 72 s |
| Stesso schermo: partite · durata · punti a partita | 234 · 60 s · 5,8 | 58 · 60 s · 5,8 | 292 · 60 s · 5,8 |
| E1 cima → rimbalzo · tempo → rimbalzo | 0,35 · 0,87 | 0,38 · 0,85 | 0,35 · 0,86 |
| Cima girata: palla dalla sua parte · peso del tempo | 84,3 % di 690 · 79 % | 89,8 % di 205 · 75 % | 85,6 % di 895 · 78 % |
| E2 · E3 · E4 · E5 (giocatori giudicati) | 50,7 · 0,5 · 15,9 · 10,0 % (10) | 52,3 · 0,2 · 19,0 · 0,0 % (2) | 51,1 · 0,4 · 16,5 · 8,3 % (12) |

Contro l'avversario, per livello, in due giorni: bambini 1, casual 14, evento 16, leggenda 2 partite, tutte «pochi dati»
(criterio 6 non valutabile, §4.2). Verso del B71 (`vc`, `vg`, `ls`) e regola nuova: non ci sono (sono arrivati con la
2026-11-19.1 e la 2026-11-20.1). Deboli: 0 %. Tutti i telefoni erano Android. Nessuna sfida tra due computer.

## 6. Prove

| Prova | Cosa controlla |
|---|---|
| `natpf-tennis/test/registro-confronto.test.mjs` (11 prove, nuovo) | nomi di tipi, telefoni e gruppi; **valori noti** scritti a mano nei quattro gruppi (tutte le tabelle riga per riga: mediana, metà e 9 su 10 della cima, quote, lato, verso, tipi, tempo, colpi a vuoto, calibrazione prima e dentro la partita, livelli, E1–E4, Precision, per telefono, il colpo a vuoto del Player 2 sul suo telefono); centro della mira e partita storta; partite del P2 della sfida e senza telefono fuori; **registri finti con i quattro gruppi** (480 partite in 2 giorni: partite, finite, colpi, colpi a vuoto, regola nuova, lato, tipi, calibrazione, telefoni, Precision e livelli **uguali alla verità del generatore**; le differenze messe apposta si vedono: la cima comanda con «nuova», meno colpi dalla parte opposta e verso sicuro con gli Android riordinati, più pallonetti); **registri come quelli del 18–19/11** (un gruppo solo, nessun avviso); **Worker non ricaricato** (gruppi «non noti» e «non nota» con gli avvisi; formato 4 come dubbio). Revisione (§8): **sfida tra due computer** (colpi del P2 fuori dai gruppi dell'host, nessun telefono con il nome sbagliato, nessun dubbio falso sul Worker); **avviso a due livelli** (19, 20, 99 e 100 partite; giorno finto da 100 partite); **avvisi delle tabelle di dettaglio** (199 e 200 colpi, 19 e 20 partite, 30 palle in 2 visite, 39, 72 e 800 giocatori); **riga «tutti i livelli»**, durata e punti a partita (anche uguale alla verità del generatore); **più giornate** (giorni per gruppo, avviso; un giorno solo senza avviso); etichette «giocatori» |
| `natpf-tennis/scripts/registro/finto.mjs` | opzione `confronto` (`--confronto=1`), spenta di base: **senza, righe identiche a prima** (confronto una tantum con il file della base su 4 configurazioni, 27 531 righe; le altre prove del registro dipendono da quelle righe) |
| Registri veri del 18–19/11 | §5: nessun errore, un gruppo, numeri coerenti con le sezioni di sempre (493 calibrazioni giocando come «Tutorial e calibrazione») |
| Mutazioni (una tantum) | quattro errori messi apposta nel riassunto (colpi opposti contati al contrario, Worker non riconosciuto, tagliato letto topspin, calibrazioni prima della partita perse): ognuno fa diventare rosse 1 o 2 prove |

Esito di `npm test` del gioco: vedi §6.1.

### 6.1 Esito

- `natpf-tennis/test/registro-confronto.test.mjs`: 11/11 (6 del primo commit, 5 della revisione). Con
  `registro-riassunto`, `registro-worker` e `natpf-registro`: 92/92; con anche `natpf-b36-sfida` (registro dell'host e del
  P2 della sfida, B73): 98/98.
- Prove della revisione (§8): con il `riassunto.mjs` di prima della correzione e le prove di adesso, **8 rosse su 11** (le 5
  nuove e le 3 con le righe allungate o le etichette nuove), 3 verdi (nomi, registri del 18–19/11, Worker non ricaricato);
  dopo la correzione **11 su 11** verdi.
- `npm test` del gioco (21/11, dopo la revisione): **1977 su 1978** verdi, 0 rosse, 1 saltata (il server LAN senza `npm ci`
  in `tools/lan` nella worktree, come sempre). Al primo commit (`904e0cd0`) erano 1972 su 1973; le 5 in più sono quelle
  della revisione.

## 7. Limiti e non verificato

- **Nessun registro vero con «Corretti» o «Nuova»**: la sezione è provata solo con righe scritte a mano e registri finti. Il
  primo registro vero della prova dirà se servono ritocchi (per esempio altri valori di `livello` o di `voto`: oggi i voti
  sconosciuti non contano né come Perfetto né come anticipo o ritardo).
- **Worker fermo al formato 4**: non si vede (§2.4). Prima della prova: pagina del Worker con «Formato delle righe: 5».
- **Calibrazione giocando e Precision** sono attribuite a una partita per vicinanza (§2.2): se lo staff cambia una voce tra
  la partita e Precision, quella Precision va nel gruppo della partita di prima.
- **Rumore**: le soglie del §4 sono regole pratiche; i colpi di una stessa persona non sono indipendenti. Gli avvisi (§2.3)
  dicono quando una differenza è troppo piccola per i dati, non che una differenza grande sia vera.
- **Player 2 della sfida tra due computer**: fuori dal confronto (§2.1). Se le sfide tra due computer diventassero tante,
  per contarle bisognerebbe prendere i colpi del P2 dalla partita del suo computer (`ruolo: p2`, con `stand.assi`,
  `tel.assi` e la direzione dell'host); prima va controllato con un registro vero di una sfida che le sue righe «colpo»
  (la previsione locale del colpo) abbiano gli stessi campi e valori dell'host (`rx`, `pf`, `dv`).
- **Visite al posto delle persone** (Precision): un'approssimazione (§3).
- **Riga «tutti i livelli contro l'avversario»**: mescola livelli diversi; da leggere solo se i gruppi hanno più o meno gli
  stessi livelli.
- La sezione «Direzione» (B36.0) scrive ancora «(N partite)» accanto alle partite storte, che contano i giocatori: fuori da
  questo blocco, come le sue altre colonne.
- **Non divisi per gruppo**: la confidenza del tipo di colpo (`cf`), il margine sul picco (`mg`) e le misure dei sensori del
  B66 restano nelle loro sezioni, per tutto il registro insieme.
- Programma Windows, telefono vero, Worker su Cloudflare: non toccati e non provati in questo blocco (solo Node).

## 8. Revisione (21/11)

Rilievi della revisione del ramo e cosa è stato fatto (commit «B75 confronto: sistemazione …»). Ogni correzione ha le sue
prove in `registro-confronto.test.mjs`, rosse prima della correzione e verdi dopo. Nessun rilievo scartato: tutti
riprodotti (N1 con un registro scritto a mano; U1 con il giorno finto da 100 partite; U2, U3 e U5 con i registri veri del
18–19/11; U4 e U6 dal documento e dal codice).

| Rilievo | Cosa non andava | Correzione | Prove |
|---|---|---|---|
| **N1** sfida tra due computer | i colpi del Player 2 (`chi: 'a'` della partita dell'host) andavano nel gruppo degli assi dell'host, ma i suoi assi li decide il suo computer; il suo telefono diventava «altro o non noto» o «senza risposta (pagina di prima)»; con la voce accesa solo sul computer del P2 compariva il dubbio falso sul Worker al formato 4 | colpi, colpi a vuoto e calibrazioni giocando del P2 della sfida fuori dai gruppi e dai telefoni, contati a parte con una riga nel testo; partite del computer del P2 con «Corretti» contate: al posto del dubbio sul Worker una riga che dice dove era accesa la voce; §2.1 corretto. Non fatto: prendere i colpi del P2 dalla partita del suo computer (§7) | «B75 revisione (N1)…»: host «oggi» + P2 «corretti» (gruppo dell'host con i suoi 10 colpi, niente centro della mira né E5 dal P2, nessun telefono con il nome sbagliato, nessun dubbio falso) e host «corretti» (nessun «senza risposta») |
| **U1** «—» già con 20 partite | le soglie di 2–5 punti del §4.2 e del §4.4 stanno sotto il rumore con 20–99 partite | avviso a due livelli (§2.3) e riga «Differenze piccole non decidibili…»; §4.1, §4.2, §4.4: esito «non decidibile: continuare la prova» | «B75 revisione (U1)…»: 19, 20, 99 e 100 partite; giorno finto da 100 partite (25 per gruppo: nessun «—») |
| **U2** tabelle di dettaglio senza avviso | per telefono, per livello, Precision e calibrazione giocando senza segnale anche con pochissimi casi; nessun modo di controllare «3 persone» | colonna «Avviso» in tutte e quattro (§2.3); in Precision le visite (circa le persone, solo il numero); nella calibrazione la differenza più piccola che conta | «B75 revisione (U2)…» e le righe complete di «valori noti» |
| **U3** criterio 6 con il pubblico dello stand | il documento non diceva cosa fare con un criterio non valutabile | §4.2 e §4.4: «non valutabile», non blocca, e cosa usare al suo posto; riga «tutti i livelli contro l'avversario» per gruppo; durata e punti a partita anche per lo stesso schermo | «B75 revisione (U3)…»; nei registri finti la riga «tutti i livelli» è la somma della verità del generatore |
| **U4** regole del §4.3 | l'effetto atteso di «Corretti» faceva scattare la ritaratura; topspin in calo senza regola; soglie del verso assolute | §4.3 riscritto: spostamento atteso (nessuna ritaratura) contro anomalo; soglie del verso come differenze da «oggi» con la stessa direzione, nella riga Android; colonna «Lato dal gesto» nella tabella «Per telefono» | la colonna nella riga Android di «valori noti» |
| **U5** più giornate | con una cartella di più giorni «oggi · classica» mescolava le giornate senza dirlo | colonna «Giorni (partite)» e riga «Più giornate nello stesso confronto…»; §1 e §4.1 punto 3 | «B75 revisione (U5)…» (anche un giorno solo: niente avviso); registri finti di due giorni |
| **U6** «(N partite)» | il centro della mira ed E5 contano i giocatori | «(N giocatori)», «(N giocatori giudicati)» e i titoli delle colonne | «B75: centro della mira…» |
