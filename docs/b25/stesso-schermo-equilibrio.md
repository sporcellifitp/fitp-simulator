# B25 · Stesso schermo: equilibrio tra due persone

Blocco deciso dall'utente l'11/11/2026 sull'audit `docs/b19/audit-1v1-utenti.md` (punti 2, 4, 9, 14, 15). Fatto
l'11/11/2026 sul ramo di lavoro `worktree-wf_d8163833-9f8-1`, partendo da `f08243a` (versione 2026-11-11.2). I file di
versione e i documenti di piano non sono stati toccati.

Tutto quello che segue vale **solo per la partita tra due persone nello stesso schermo**. Contro la CPU non cambia
niente (controllato punto per punto, vedi «Controlli»). La sfida tra due computer e la webcam per due non sono state
sviluppate e funzionano come prima.

I numeri vengono da partite **simulate** (due robot che fanno i gesti al posto delle persone). Servono a confrontare
una regola con un'altra, non dicono come giocherà una persona vera. Niente è stato provato con persone.

## In breve

| parte | cosa cambia | si accende? |
|---|---|---|
| 1. Lancio automatico | Se chi deve battere resta fermo 30 secondi, il gioco lancia la palla. Dopo due lanci a vuoto batte il gioco. | Opzione, **spenta di base** |
| 2. Campo aperto | I personaggi non arrivano più su ogni palla: la palla angolata e lontana mette in difficoltà o fa punto. | Opzione, **spenta di base** |
| 3. Colpo super | «Fortissimo» vuol dire più forte del **proprio** colpo abituale (da 1,3 volte). Il super esiste anche per un bambino. | Vale sempre |
| 4. Preparazione | Portare indietro il braccio prima del colpo non dà più un vantaggio. | Vale sempre |
| 5. Fasce e aiuto | Ogni giocatore sceglie «Bambino · Ragazzo · Adulto». Se sono diverse il più giovane è aiutato. | Di base Adulto per tutti e due: **nessun aiuto** |

Con le due opzioni spente e le fasce uguali la partita cambia solo per le parti 3 e 4.

## Come si attiva

Il **pannello dello stand** si apre dal menu principale con **Ctrl + Maiusc + K**, oppure tenendo premuto 3 secondi il
marchio NATPF in alto a sinistra. Le sue scelte restano salvate anche chiudendo il programma e valgono **dalla partita
dopo**.

| cosa | dove | valori | di base |
|---|---|---|---|
| **Lancio automatico** | Pannello dello stand → riquadro «Lancio automatico» (un clic) → «Chiudi» | No · Sì · 30 s | **No** |
| **Campo aperto** | Pannello dello stand → riquadro «Stesso schermo: campo aperto» (un clic) → «Chiudi» | No · Sì · il piazzamento conta | **No** |
| **Fascia di ciascun giocatore** | Menu → Gioca → «Stesso schermo» → pagina «Collega i due telefoni» → sulla scheda del giocatore, sotto «Destra · Sinistra» | Bambino · Ragazzo · Adulto | **Adulto** |
| Colpo super sul proprio colpo abituale | Niente da accendere | | sempre |
| Preparazione che non conta | Niente da accendere | | sempre |

Dettagli:

- **Fasce.** Si scelgono prima di giocare, una per scheda. Non restano salvate: sono di chi gioca, non dello stand.
  «Nuovo giocatore» (a fine partita o nel pannello dello stand) e il chiosco le riportano ad Adulto per tutti e due.
  Con la webcam per due i pulsanti non ci sono.
- **L'aiuto è dichiarato.**
  - Prima di giocare: nella barra in fondo alla pagina dei telefoni e nel conto alla rovescia, per esempio «Aiuto a
    Giulia (Bambino): parte da 15-0 e ha più margine sul tempo.».
  - In partita: sotto il nome di chi è aiutato, «Aiuto: Bambino». Sotto l'altro nome niente.
  - Il 15-0 si vede sul tabellone a ogni game.
- **Quale aiuto.** È la variante C della tabella più sotto. Per cambiarla serve un programmatore: una riga nel file
  `natpf-tennis/src/natpf/natpf_duo_rules.js`, `HELP_DEFAULT = 'C'` (valori `'A'`, `'B'`, `'C'`, `'0'` per nessuno).
- **Soglia del colpo super.** Stesso file, `SUPER_REL.ratio` (1,3).

Dettagli tecnici: le due opzioni sono nel `localStorage` del browser o del programma Windows,
`natpf-tennis.lancioAuto` e `natpf-tennis.campoAperto` (`1` accesa).

## 1 · Lancio automatico

- **Spento** (di base): il gioco aspetta chi deve battere. Dopo 9 secondi lo chiama per nome («Giulia, batti tu»), come
  dal B20.
- **Acceso**:
  - Negli ultimi 10 secondi il richiamo dice «Alza il telefono: lanci la palla · tra 7 s la lancia il gioco».
  - A **30 secondi** il gioco lancia la palla. Sullo schermo: «Lancio automatico», poi «Colpisci!». Chi batte può
    colpire come sempre.
  - Se non colpisce, la palla ricade: è il lancio a vuoto di sempre, nessun punto perso.
  - Dopo altri **15 secondi** fermo, secondo lancio automatico.
  - **Dopo due lanci automatici a vuoto di fila** decide il gioco: dopo 5 secondi lancia ancora e **batte lui** un
    servizio morbido. Sullo schermo: «Servizio automatico · Il gioco batte per Giulia». La palla è in gioco e l'altro
    può rispondere.
- In tutto, da quando uno smette di giocare a quando la palla è in gioco, **meno di un minuto** (circa 55 secondi).
- Perché il servizio automatico: per la fila è la cosa più semplice. Il punto parte, l'altro gioca, e chi era distratto
  si accorge che la partita va avanti. Non ho scelto «punto perso» perché punirebbe un bambino che non ha capito il
  gesto.
- Il servizio automatico è lento: cade al centro del quadrato giusto, a 4,8 m dalla rete.
- Se chi batte lancia da solo e sbaglia, il conto dei «due di fila» ricomincia: servono di nuovo 30 secondi.
- Vale con i due telefoni. Con la webcam per due resta spento.

## 2 · Campo aperto

**Com'è oggi (spento).** Il personaggio corre da solo a 9,8 metri al secondo e arriva su ogni palla. Tra due adulti
medi le palle non raggiunte sono 2 su 1.000. Chi piazza rischia la riga e non guadagna niente: contro chi rimanda al
centro vince 34 partite su 100.

**Acceso, la regola, uguale per i due lati:**

1. **Verso la palla** il personaggio corre a 5,9 metri al secondo e parte un decimo di secondo dopo.
2. **Dopo il proprio colpo rientra piano** (2 metri al secondo). Chi è stato portato fuori dal campo non è già al
   centro quando l'altro colpisce: la palla dall'altra parte lo trova lontano. È «aprire il campo».
3. **Chi arriva di corsa o in allungo ha meno margine sul tempo**: più palle fuori, più colpi a vuoto. E la sua
   risposta è più corta e più lenta.
4. La palla che il personaggio non raggiunge si tocca solo se passa a meno di 1,7 metri (prima 2,4).
5. La **risposta al servizio** resta com'è: il servizio largo non chiude il punto da solo.

Il gesto di chi gioca non cambia: cambia quanto è facile per il personaggio arrivarci.

**Misure** (1 game, formato in fiera, 600 partite per riga; 90 tra due bravi):

| coppia | colpi a punto (media) | metà dei punti entro | punti chiusi da una palla non raggiunta | punti chiusi da un errore in allungo | partita: metà entro | 9 su 10 entro |
|---|---|---|---|---|---|---|
| due bambini, spento | 6,7 | 5 colpi | 0,4% | 0,2% | 68 s | 94 s |
| due bambini, **acceso** | 4,7 | 3 colpi | 1,4% | 9,7% | 52 s | 77 s |
| due ragazzi, spento | 8,7 | 6 | 0,2% | 0,3% | 79 s | 126 s |
| due ragazzi, **acceso** | 5,5 | 4 | 1,4% | 14,5% | 60 s | 80 s |
| due adulti medi, spento | 11,6 | 8 | 0,2% | 0,7% | 90 s | 142 s |
| due adulti medi, **acceso** | 6,0 | 4 | 4,1% | 23,3% | 56 s | 82 s |
| due amatori, spento | 17,9 | 13 | 0,3% | 1,5% | 138 s | 218 s |
| due amatori, **acceso** | 7,6 | 5 | 4,7% | 23,9% | 65 s | 101 s |
| due bravi, spento | 53 | 52 | 0% | 1,5% | 365 s | 453 s |
| due bravi, **acceso** | 5,6 | 3 | 16,2% | 52% | 52 s | 77 s |

- **Scambi**: tra adulti medi 6 colpi di media (prima 11,6), metà dei punti entro 4 colpi, 9 su 10 entro 12. Il punto
  non finisce al primo colpo angolato.
- **Punti decisi dal piazzamento** (palla non raggiunta più errore di chi arriva in allungo): tra adulti medi 27 su
  100, prima 1 su 100.
- **Durata**: la partita a 1 game tra adulti medi scende da 90 a 56 secondi (metà delle partite). Tra due bravi da 6
  minuti a meno di 1: lo scambio senza fine sparisce.
- **I due lati** (1.200 partite, 5 semi): il Player 1 fa il 49,7% dei punti tra adulti medi e il 50,8% tra amatori.

**Chi vince tra chi piazza e chi rimanda** (600 partite per riga, media dei due lati; vince il primo):

| il primo contro il secondo | adulti medi, spento | adulti medi, **acceso** | amatori, spento | amatori, **acceso** |
|---|---|---|---|---|
| piazza sempre (con margine dalla riga) contro rimanda al centro | 33,8% | **54,5%** | 28,3% | **59,3%** |
| mira sempre le righe, con il polso, contro rimanda al centro | 31,7% | **58,7%** | 21,8% | **58,7%** |
| mira sempre le righe, con il tempo del colpo, contro rimanda al centro | 32,5% | 52,8% | 23,2% | 48,8% |
| rimanda al centro contro gioco normale | 63,5% | 51,3% | 68,0% | 52,5% |
| tira sempre fortissimo contro gioco normale | 55,7% | **68,3%** | 61,3% | **68,8%** |
| solo palle corte contro gioco normale | 3,3% | 14,7% | 5,3% | 13,6% |

- Obiettivo raggiunto: **chi piazza batte chi rimanda al centro** (55–59 partite su 100, prima 28–34), e rimandare
  sempre al centro non rende più (51–52, prima 64–68).
- Chi mira con il tempo del colpo (in anticipo incrociato, in ritardo lungolinea) arriva alla pari: per mirare così
  bisogna colpire apposta fuori tempo, e si sbaglia di più.
- **Da guardare con le persone: «tira sempre fortissimo» rende di più** (68 partite su 100, prima 56–61). La palla
  veloce lascia meno tempo a chi corre. Nel banco il robot che tira sempre forte non si stanca e non perde precisione;
  una persona sì. Se alla prova con persone vince chi tira forte e basta, la correzione è far costare la precisione a
  piena forza. Non l'ho fatta: ho provato una regola così e toglieva il vantaggio a chi piazza (da 57 a 51).
- Perché non bastava rallentare la corsa: l'ho misurato. Con la sola corsa lenta chi piazza restava sotto la metà
  (31–43 partite su 100) e arrivava alla pari solo con la corsa a poco più di un terzo di oggi, quando metà dei punti
  finiva già entro 4–5 colpi e una palla su quattro non veniva raggiunta. Il motivo è che in questo gioco la palla
  angolata arriva più lenta lungo il campo e chi la riceve ha **più** margine sul tempo. Il rientro lento e il margine
  più stretto in allungo rimettono le cose a posto senza togliere gli scambi.

**Con le fasce** (vedi parte 5): con il campo aperto acceso il più giovane è già più vicino, perché gli scambi sono
più corti. Bambino contro adulto medio senza aiuto: 19 partite su 100 invece di 11.

## 3 · Colpo super sulla propria forza

- **Prima**: per il super serviva un gesto da circa 1.045 gradi al secondo, uguale per tutti. Per un bambino era quasi
  tre volte il suo colpo.
- **Ora**, tra due persone: «gesto fortissimo» è **almeno 1,3 volte il proprio colpo abituale**. Il colpo abituale è
  quello che il telefono impara giocando (la via di mezzo degli ultimi 24 colpi normali).
- **Le altre condizioni non cambiano** (la tua decisione del 29/10): dritto o colpo piatto, dalla parte giusta del
  corpo, a tempo, da fermo, su una palla alta, lenta o corta.
- Profondità e velocità dei **colpi normali** restano come prima.
- Nei primi tre colpi dopo la calibrazione il colpo abituale non c'è ancora: lì vale la regola di prima. Senza questo,
  chi ha calibrato con un colpetto avrebbe il super a ogni colpo.
- **Chi tira sempre fortissimo non ha il super**: il suo colpo abituale sale. Il super premia il colpo nettamente più
  forte del solito.
- **La barra della potenza** dopo il colpo, nello stesso schermo, si riempie rispetto alla propria soglia: la tacca del
  super è nello stesso punto per tutti, ma per arrivarci un bambino deve tirare forte per lui, non quanto un adulto.
  Prima la barra di un bambino restava sempre bassa.

**Quante volte parte** (1 game in fiera, 240 partite per riga, 60 tra due bravi). «Lo cerca» vuol dire un colpo su
cinque tirato fortissimo.

| chi gioca | prima, gioco normale | prima, lo cerca | **ora**, gioco normale | **ora**, lo cerca | partite con almeno un super, ora (normale · lo cerca) | il super chiude il punto |
|---|---|---|---|---|---|---|
| bambino | 0 su 7.873 colpi | 0 | 87 su 8.078 | 112 su 7.293 | 30% · 38% | 1 volta su 3–4 |
| ragazzo | 0 su 11.123 | 0 | 65 su 10.327 | 106 su 9.567 | 25% · 35% | 1 su 4–5 |
| adulto medio | 4 su 15.068 | 22 | 31 su 14.830 | 91 su 14.843 | 13% · 32% | 1 su 8–15 |
| amatore | 6 su 23.382 | 10 | 101 su 23.440 | 159 su 22.841 | 36% · 48% | 1 su 13–25 |
| uno bravo | 5 su 18.091 | 24 | 0 su 19.127 | 15 su 17.725 | 0% · 22% | mai |

- **L'obiettivo «qualche volta a partita» non è raggiunto in una partita a 1 game.** Chi lo cerca fa un super in una
  partita su tre (un colpo super ogni 65–160 colpi). In una partita al meglio di 3 è circa uno a partita. Prima era
  zero per bambini e ragazzi.
- **Perché non di più.** Dei colpi tirati fortissimo, uno su tre è fuori tempo. Di quelli a tempo, solo uno su otto
  trova la palla giusta (alta, lenta o corta): tra due persone la palla è quasi sempre tesa. Sono le condizioni del
  29/10, che mi hai chiesto di non toccare.
- **Se ne vuoi di più**, la leva è la soglia:

  | soglia | bambino: super a partita per giocatore (normale · lo cerca) | adulto medio | amatore |
  |---|---|---|---|
  | 1,2 volte | 0,33 · 0,41 | 0,15 · 0,31 | 0,44 · 0,48 |
  | **1,3 volte (in gioco)** | 0,18 · 0,23 | 0,06 · 0,19 | 0,21 · 0,33 |
  | 1,4 volte | 0,09 · 0,10 | 0,03 · 0,10 | 0,11 · 0,19 |
  | 1,5 volte | 0,03 · 0,04 | 0,01 · 0,03 | 0,03 · 0,06 |

  A 1,2 volte il super scatta anche per caso: un colpo normale varia già del 20%.
- **Il super non sposta chi vince.** Chi lo cerca contro chi gioca normale: bambino 52 partite su 100 (prima 52),
  adulto medio 53,5 (prima 52,5), amatore 50 (prima 53).
- Uno bravo ha un gesto molto regolare: 1,3 volte il suo colpo è raro. Per lui il super è più difficile di prima.

## 4 · Preparazione

- Prima, tra due persone uguali, chi portava indietro il braccio prima del colpo aveva un piccolo vantaggio che nessuna
  scritta spiegava.
- Ora tra due persone non conta. Contro la CPU resta com'era.

| coppia (900 partite) | vince chi prepara sempre, prima | ora |
|---|---|---|
| adulto medio contro adulto medio che non prepara mai | 52,3% | 50,0% |
| amatore contro amatore che non prepara mai | 56,6% | 50,0% |

## 5 · Fasce e aiuto al più giovane

### Cosa può fare l'aiuto

Tre leve, tutte e solo per il più giovane:

- **Margine sul tempo.** Il colpo un po' in ritardo o un po' in anticipo manda meno spesso la palla fuori, e c'è un
  attimo in più prima del colpo a vuoto. Il voto del colpo («Presto», «Tardi») resta quello vero. Non si vede come un
  regalo.
- **Punti di vantaggio.** Parte da 15-0 o da 30-0 a ogni game. Si vede sul tabellone.
- (Non usata oggi) colpo super più facile.

Due cose misurate:

- Il margine in ritardo **oltre un decimo di secondo non serve**: la palla è ormai passata.
- Tra livelli vicini il margine pesa moltissimo. Con 6 centesimi di secondo in più il ragazzo batteva l'adulto medio
  55 volte su 100. Per questo tra fasce vicine l'aiuto è di 3 centesimi.

### Le varianti (1 game in fiera, 900 partite per riga, media dei due lati)

**Bambino contro adulto**

| variante | cosa dà al bambino | partite vinte dal bambino (contro adulto medio) | contro amatore | punti del bambino | punti a game | game a zero | partita: metà entro |
|---|---|---|---|---|---|---|---|
| nessun aiuto | | 11,3% | 3,8% | 28% | 5,3 | 30% | 65 s |
| **A** · solo tempo | margine largo sul tempo | 29,0% | 13,9% | 40% | 5,7 | 14% | 89 s |
| **B** · solo punti | parte da 30-0 | 43,0% | 26,1% | 28% | 4,1 | 36% | 50 s |
| **C** · leggera (**in gioco**) | parte da 15-0 e margine medio sul tempo | **41,9%** | 23,0% | 37,5% | 5,0 | 21% | 75 s |

Solo punti, contro adulto medio: 15-0 → 21,1%; 30-0 → 43,0%; 40-0 → 73,7%.

**Ragazzo contro adulto** e **bambino contro ragazzo**

| coppia | nessun aiuto | **A** · solo tempo (piccolo margine) | **B** · solo punti (15-0) | **C** (**in gioco**) |
|---|---|---|---|---|
| ragazzo contro adulto medio | 22,4% | 41,8% | 38,6% | **41,8%** (uguale alla A) |
| ragazzo contro amatore | 10,2% | 26,3% | 21,1% | 26,3% |
| bambino contro ragazzo | 30,2% | 42,0% | 48,8% | **42,0%** (uguale alla A) |

Tra fasce vicine la C è solo il margine sul tempo: il 15-0 non serve.

### La mia proposta: la C

- **Bambino contro adulto medio: 42 partite su 100** (obiettivo 35–45; senza aiuto 11).
- Rispetto alla **B** (30-0): stesso risultato, ma il bambino fa più punti suoi (37 su 100 invece di 28), i game a
  zero sono 21 su 100 invece di 36, e la partita dura quanto una normale (75 secondi invece di 50). Con il 30-0
  l'adulto vede due punti regalati a ogni game.
- Rispetto alla **A** (solo tempo): la A non si vede per niente, ma da sola si ferma a 29 partite su 100.
- Contro un adulto più forte (amatore) nessuna variante arriva a 35: la C dà 23, la B 26.

### Con il campo aperto acceso

| coppia | nessun aiuto | A | B | C com'è senza campo aperto | **C in gioco con il campo aperto** |
|---|---|---|---|---|---|
| bambino contro adulto medio | 19,1% | 39,7% | 56,8% | 53,6% | **39,7%** (solo margine largo, come la A) |
| ragazzo contro adulto medio | 29,6% | 45,2% | 47,7% | 45,2% | **45,2%** |
| bambino contro ragazzo | 35,4% | 45,1% | 56,1% | 45,1% | **45,1%** |

Con il campo aperto il 15-0 farebbe vincere il bambino più dell'adulto (54 su 100). Per questo, **con il campo aperto
acceso la variante C non dà il 15-0 al bambino**: dà solo il margine sul tempo. La pagina dei telefoni lo scrive
giusto («Aiuto a Giulia (Bambino): ha più margine sul tempo.»).

### Attenzione

- **Un adulto segnato «Bambino»** contro un adulto uguale vince 93–94 partite su 100 con la A o la C, e 81 con la B. L'aiuto si sceglie a mano e si vede sullo
  schermo: lo controlla lo staff.
- I profili «bambino» e «ragazzo» del banco sono **ipotesi**. Se i bambini veri sono più vicini agli adulti di così,
  l'aiuto C è troppo; se sono più lontani, è poco. Va guardato alla prima fiera.

## Controlli

- **Contro la CPU non cambia niente.** Le «impronte» (riassunto di ogni punto e di ogni colpo, con gli stessi semi)
  di 12 serie contro la CPU (Casual, Pro, Leggenda; 4 profili; 240 punti per riga) sono identiche a quelle di
  `f08243a`. `npm run audit:legend`: 69 criteri su 69, «Tutti i criteri rispettati».
- **Stesso schermo con tutto spento.** Le parti 3 e 4 valgono sempre, quindi le partite dello stesso schermo cambiano
  per forza. Per controllare che non cambi **nient'altro** le ho spente a mano (si può fare solo nelle prove): le
  impronte di 12 serie nello stesso schermo (6 coppie, formato in fiera e classico) sono identiche a quelle di
  `f08243a`. Un test lo ripete a ogni giro.
- File: `natpf-tennis/scripts/audit/b25/risultati/impronte-prima-f08243a.txt` e `impronte-dopo.txt`.

## Test

- **Test di unità**: `natpf-tennis/test/natpf-b25-stesso-schermo.test.mjs`, 22 test. Opzioni e pannello; lancio
  automatico nel motore (30 s, 15 s, servizio automatico nel quadrato giusto per i due lati, conto «di fila»); scritte;
  super relativo e sue condizioni; preparazione; campo aperto (corsa, rientro, allungo, palla lontana); fasce, aiuto,
  15-0 a ogni game, chi batte nel formato in fiera con i punti di vantaggio; impronte identiche a `f08243a`.
- Suite complete, alla fine:
  - `npm test` (gioco): 1.180 test, 1.179 superati, 0 falliti, 1 saltato (quello del server LAN, che chiede `npm ci` in
    `tools/lan`: era saltato anche prima);
  - `node --test tools/test/*.test.mjs` (sito e pagina del telefono): 205 su 205;
  - `npm run build`: riuscita;
  - `npm run audit:legend` (contro la CPU): 69 su 69.
- **Prova nel browser nuova**: `tools/e2e/natpf-stesso-schermo-b25.mjs`, 39 verifiche, con il gioco vero e due telefoni
  simulati. Pannello dello stand con dodici pulsanti a 1920×540, 1024×600, 1280×720, 1366×657, 720×720 e 1920×1080
  («Chiudi» e «Nuovo giocatore» interi, niente scorrimento); fasce sulle schede; aiuto dichiarato; lancio automatico
  spento e acceso fino al servizio automatico; campo aperto spento e acceso; «Nuovo giocatore». Ho guardato le
  schermate.
- **Tre difetti trovati dalla prova nel browser e corretti**:
  - nel gioco vero il lancio automatico contava come lancio di chi gioca (un pezzo dell'interfaccia perdeva
    l'informazione): niente «Lancio automatico» e mai il servizio automatico;
  - i pulsanti delle fasce allargavano le schede oltre il riquadro a 1280×720 e 1024×600;
  - a 720×720 il pannello dello stand scorreva di 10 punti.
- Altre prove nel browser, tutte superate: `natpf-stesso-schermo-b20` 52 su 52 (aggiornata: dodici pulsanti nel pannello),
  `natpf-split-ready` 34 su 34, `natpf-formato-fiera` 22 su 22, `natpf-menu` 28 su 28, `natpf-nuovo-giocatore` 28 su 28,
  `natpf-1v1-p2p` 39 su 39 (sfida tra due computer). Le prime due sono girate prima dell'ultimo ritocco (barra della
  potenza e variante C con il campo aperto); la prova nuova è stata rifatta dopo, sul codice finale.

## File toccati

Gioco (`natpf-tennis/`):

- `src/natpf/natpf_duo_rules.js` (nuovo): le cinque regole, le due opzioni, le fasce, le varianti dell'aiuto, le
  scritte.
- `src/game_engine.js`: regole decise a inizio partita (`natpfDuo`), lancio e servizio automatico, punti di vantaggio a
  inizio game, colpo super e preparazione tra due persone, finestra del tempo per chi è aiutato o in allungo.
- `src/natpf/natpf_impact.js`, `src/natpf/natpf_skill.js`: corsa, rientro, allungo e portata con il campo aperto;
  margine in ritardo per chi è aiutato. Spento: gli stessi numeri di prima.
- `src/natpf/natpf_stroke_outcome.js`, `src/natpf/natpf_power_hud.js`: il colpo super accetta «forte per lui», e la barra
  della potenza lo mostra.
- `src/natpf/natpf_phone_racket.js`: il colpo dice se il colpo abituale è già quello imparato giocando (una riga; il
  riconoscimento dei gesti non cambia).
- `src/natpf/natpf_hand.js`: lascia passare «chi ha lanciato la palla».
- `src/natpf/natpf_kiosk.js`, `src/natpf/natpf_split_ui.js`, `src/natpf/natpf_serve_coach.js`,
  `src/natpf/natpf_new_player.js`, `index.html`, `natpf-ui.css`: pannello, fasce, aiuto dichiarato, scritte del
  servizio.
- `scripts/audit/b25/` (nuovo): misure e impronte, con le uscite. `scripts/audit/b19/due-umani.mjs`: tre valori in più
  per il banco, spenti di base.
- `test/natpf-b25-stesso-schermo.test.mjs` (nuovo).

Prove nel browser (`tools/e2e/`): `natpf-stesso-schermo-b25.mjs` (nuova); `natpf-stesso-schermo-b20.mjs` (dodici
pulsanti nel pannello invece di dieci).

Non toccati: file di versione, documenti di piano, pagina del telefono (`site/`), logica della CPU.

## Cosa NON è provato

- **Persone vere.** Tutte le misure sono di robot. Non so quale profilo somigli ai visitatori, e «bambino» e «ragazzo»
  sono ipotesi.
- **Telefoni veri.** Nelle prove nel browser i telefoni sono simulati sullo stesso computer. Il colpo abituale di un
  telefono vero (da cui dipende il colpo super) è provato solo nei test.
- **Il campo aperto guardato da una persona.** Ho visto le schermate, non il movimento: il rientro a passo svelto e il
  personaggio che non arriva sulla palla vanno guardati dal vivo.
- **Windows, l'installer, il ledwall.** Solo Chromium su Linux, alle misure di schermo elencate.
- **Schermi stretti.** A 720×720 la pagina dei telefoni scorre (era già così): la riga delle fasce è sotto «Destra ·
  Sinistra» e per vederla bisogna scorrere. A 1024×600 e 1920×540 la barra in fondo, che dichiara l'aiuto, è sotto il
  bordo come prima; l'aiuto si legge comunque nel conto alla rovescia e in partita.
- **La voce.** Nessuna voce nuova: il lancio e il servizio automatico sono solo scritte.
- **Webcam per due e sfida tra due computer.** Non sviluppate. La sfida tra due computer è passata dalla prova nel
  browser `natpf-1v1-p2p`; la webcam per due non ha una prova sua qui.

## Decisioni che ti chiedo

1. **Aiuto: va bene la variante C?** Oppure A (non si vede, 29 su 100) o B (30-0, 43 su 100).
2. **Colpo super: lasci la soglia a 1,3 volte** (uno ogni tre partite a 1 game per chi lo cerca) o la porti a 1,2 (quasi
   il doppio, ma scatta anche per caso)?
3. **Campo aperto: lo provi con persone?** In particolare se «tira sempre fortissimo» diventa il modo di vincere.
4. **Lancio automatico: va bene che dopo due lanci a vuoto batta il gioco?**
