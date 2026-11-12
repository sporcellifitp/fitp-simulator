# B25 · Stesso schermo: equilibrio tra due persone

Blocco deciso dall'utente l'11/11/2026 sull'audit `docs/b19/audit-1v1-utenti.md` (punti 2, 4, 9, 14, 15). Fatto
l'11/11/2026 sul ramo di lavoro `worktree-wf_d8163833-9f8-1`, partendo da `f08243a` (versione 2026-11-11.2), e corretto
il 12/11/2026 dopo una revisione indipendente (vedi «Revisione» in fondo). I file di versione e i documenti di piano
non sono stati toccati.

**Aggiornamento del 12/11/2026 (decisione dell'utente).** «Non voglio che nessuno abbia un vantaggio di punti, anzi
voglio solo che il vantaggio si traduca nel gameplay.» L'aiuto al più giovane è stato rifatto: **nessun punto regalato,
mai**, e un aiuto solo di gioco, più forte di quello di prima. La parte 5 è riscritta; dove il resto del documento
parla ancora di 15-0, 30-0 o delle varianti B e C lo dice come storia.

Tutto quello che segue vale **solo per la partita tra due persone nello stesso schermo**. Contro la CPU non cambia
niente (controllato punto per punto, vedi «Controlli»). La sfida tra due computer e la webcam per due non sono state
sviluppate e funzionano come prima.

I numeri vengono da partite **simulate** (due robot che fanno i gesti al posto delle persone). Servono a confrontare
una regola con un'altra, non dicono come giocherà una persona vera. Niente è stato provato con persone.

## In breve

| parte | cosa cambia | si accende? |
|---|---|---|
| 1. Lancio automatico | Se chi deve battere resta fermo 30 secondi, il gioco lancia la palla. Dopo due lanci a vuoto batte il gioco. | Opzione, **spenta di base** |
| 2. Campo aperto | I personaggi non arrivano più su ogni palla: la palla angolata e lontana mette in difficoltà o fa punto. Con l'opzione accesa il servizio passa ogni due punti anche nel formato classico. | Opzione, **spenta di base** |
| 3. Colpo super | «Fortissimo» vuol dire più forte del **proprio** colpo abituale (da 1,3 volte). Il super esiste anche per un bambino. | Vale sempre |
| 4. Preparazione | Portare indietro il braccio prima del colpo non dà più un vantaggio. | Vale sempre |
| 5. Fasce e aiuto | Ogni giocatore sceglie «Bambino · Ragazzo · Adulto». Se sono diverse il più giovane è aiutato **nel gioco**: più margine sul tempo, palle più lente, colpi più in fondo. **Nessun punto regalato**: ogni game parte da 0-0. | Di base Adulto per tutti e due: **nessun aiuto** |

Con le due opzioni spente e le fasce uguali la partita cambia solo per le parti 3 e 4.

## Come si attiva

Il **pannello dello stand** si apre dal menu principale con **Ctrl + Maiusc + K**, oppure tenendo premuto 3 secondi il
marchio NATPF in alto a sinistra. Le sue scelte restano salvate anche chiudendo il programma e valgono **dalla partita
dopo**.

| cosa | dove | valori | di base |
|---|---|---|---|
| **Lancio automatico** | Pannello dello stand → riquadro «Lancio automatico» (un clic) → «Chiudi» | No · Sì · 30 s | **No** |
| **Campo aperto** (con il servizio che passa ogni due punti) | Pannello dello stand → riquadro «Stesso schermo: campo aperto» (un clic) → «Chiudi» | No · Sì · il piazzamento conta | **No** |
| **Fascia di ciascun giocatore** | Menu → Gioca → «Stesso schermo» → pagina «Collega i due telefoni» → sulla scheda del giocatore, sotto «Destra · Sinistra» | Bambino · Ragazzo · Adulto | **Adulto** |
| Colpo super sul proprio colpo abituale | Niente da accendere | | sempre |
| Preparazione che non conta | Niente da accendere | | sempre |

Dettagli:

- **Fasce.** Si scelgono prima di giocare, una per scheda. Non restano salvate: sono di chi gioca, non dello stand.
  «Nuovo giocatore» (a fine partita o nel pannello dello stand) e il chiosco le riportano ad Adulto per tutti e due.
  Con la webcam per due i pulsanti non ci sono.
- **L'aiuto è dichiarato**, per quello che è.
  - Prima di giocare: sulla scheda di chi è aiutato compare la targhetta gialla «Aiuto», accanto alle fasce. Nella
    barra in fondo alla pagina dei telefoni e nel conto alla rovescia c'è la frase intera, per esempio «Aiuto a Giulia
    (Bambino): ha più margine sul tempo, riceve palle più lente e tira più in fondo.». Tra fasce vicine (ragazzo e
    adulto, bambino e ragazzo), e per il bambino contro l'adulto con il campo aperto acceso, la frase è «… ha più
    margine sul tempo.».
  - In partita: sotto il nome di chi è aiutato, «Aiuto: Bambino». Sotto l'altro nome niente.
  - **Il tabellone parte sempre da 0-0.** Nessun punto regalato, in nessun caso.
- **Quale aiuto.** È la variante G della parte 5. Non c'è niente da scegliere nel gioco. I valori sono nel file
  `natpf-tennis/src/natpf/natpf_duo_rules.js`, tabella `HELP.G` (per cambiarli serve un programmatore, e vanno
  rimisurati). `HELP_DEFAULT = 'G'`; `'A'` (solo margine sul tempo) e `'0'` (nessuno) servono solo alle misure.
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
6. **Il servizio passa ogni due punti** (uno, poi due a testa), come nel formato in fiera, **anche se il formato è
   quello classico**. Parità e vantaggi restano quelli del formato scelto. Il motivo è qui sotto, in «Chi batte».

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

Le stesse righe rifatte dal revisore con altri semi (360–800 partite per riga), solo con il campo aperto acceso:

| il primo contro il secondo | adulti medi, **acceso** | amatori, **acceso** |
|---|---|---|
| piazza sempre contro rimanda al centro | 56,4% e 57,0% | tra 60% e 66% |
| mira con il tempo del colpo contro rimanda al centro | 42,2% e 48,0% | |
| rimanda al centro contro gioco normale | 51,5% | 57,5%, 55,5% e 53,3% |
| tira sempre fortissimo contro gioco normale | 68,9% | 65,3% |

- Obiettivo raggiunto, e regge con altri semi: **chi piazza batte chi rimanda al centro** (tra adulti medi 54–57
  partite su 100, tra amatori 59–66; prima 28–34).
- Rimandare sempre al centro rende molto meno di prima, ma tra amatori vale ancora qualcosa: 53–57 partite su 100
  contro il gioco normale (prima 68). Tra adulti medi è alla pari (51).
- Chi mira con il tempo del colpo (in anticipo incrociato, in ritardo lungolinea) resta **poco sotto la pari** (42–53
  secondo i semi; prima 23–32): per mirare così bisogna colpire apposta fuori tempo, e si sbaglia di più.
- **Da guardare con le persone: con il campo aperto la tattica che rende di più è la forza, non la precisione.** «Tira
  sempre fortissimo» vince 65–69 partite su 100 (prima 56–61), più di «piazza contro centro». La palla veloce lascia
  meno tempo a chi corre. Nel banco il robot che tira sempre forte non si stanca e non perde precisione; una persona
  sì. Se alla prova con persone vince chi tira forte e basta, la correzione è far costare la precisione a piena forza.
  Non l'ho fatta: ho provato una regola così e toglieva il vantaggio a chi piazza (da 57 a 51).
- **Una parte del premio va al caso** (misura del revisore, adulti medi). Il piazzamento voluto è premiato: la palla
  che arriva a 3–4,5 metri dall'avversario fa punto entro il colpo dopo 21 volte su 100, contro 10 di una palla
  vicina. Ma anche il colpo fuori tempo che resta in campo va largo per caso, e chiude il punto entro il colpo dopo più
  spesso di quello a tempo (18 volte su 100 contro 10), anche se chi lo tira sbaglia di più (12 errori propri su 100).
  Anche questo va guardato con persone prima di accendere l'opzione in fiera.
- Perché non bastava rallentare la corsa: l'ho misurato. Con la sola corsa lenta chi piazza restava sotto la metà
  (31–43 partite su 100) e arrivava alla pari solo con la corsa a poco più di un terzo di oggi, quando metà dei punti
  finiva già entro 4–5 colpi e una palla su quattro non veniva raggiunta. Il motivo è che in questo gioco la palla
  angolata arriva più lenta lungo il campo e chi la riceve ha **più** margine sul tempo. Il rientro lento e il margine
  più stretto in allungo rimettono le cose a posto senza togliere gli scambi.

**Chi batte** (aggiunto con la revisione). Con il campo aperto **battere è uno svantaggio**. La risposta al servizio
si gioca con la corsa di sempre, quindi il primo che deve colpire in allungo è chi ha battuto. Chi batte vince 44–48
punti su 100; a campo aperto spento 50–52.

Con un solo battitore per game (formato classico) questo decideva la partita a 1 game con il sorteggio: chi batteva per
primo vinceva 36–44 partite su 100. Per questo **con il campo aperto acceso il servizio passa ogni due punti** (uno,
poi due a testa), come nel formato in fiera, anche se lo staff ha scelto il formato classico. Così i due battono lo
stesso numero di punti. Parità e vantaggi restano quelli del formato classico.

Misura tra due giocatori uguali, due serie di semi (1.200 partite per casella a 1 game, 600 al meglio di 3):

| | due bambini | due adulti medi | due amatori |
|---|---|---|---|
| punti vinti da chi batte, campo aperto spento | 50% | 51–52% | 50–51% |
| punti vinti da chi batte, campo aperto **acceso** | 44–45% | 47–48% | 45–47% |
| **classico a 1 game**: partite vinte da chi batte per primo, spento | 49% e 51% | 53% e 55% | 51% e 51% |
| acceso, un battitore per game (**prima della revisione**) | 37% e 36% | 42% e 44% | 39% e 40% |
| acceso, servizio ogni due punti (**in gioco**) | **50% e 50%** | **51% e 50%** | **47% e 50%** |
| **classico al meglio di 3**: game vinti da chi lo inizia, prima della revisione | 34% e 35% | 41% e 41% | 38% e 41% |
| in gioco | 47% e 50% | 51% e 49% | 49% e 50% |
| classico al meglio di 3: partite vinte da chi batte per primo, prima della revisione | 43% e 42% | 50% e 49% | 43% e 47% |
| in gioco | 46% e 52% | 50% e 50% | 47% e 55% |
| **in fiera a 1 game** (il formato di base nello stesso schermo), acceso: partite vinte da chi batte per primo | 50% e 52% | 50% e 49% | 51% e 51% |

- Con il servizio ogni due punti e i vantaggi del formato classico, chi batte per primo vince il game esattamente una
  volta su due, qualunque sia lo svantaggio di chi batte: l'ho controllato anche con il calcolo, non solo con le
  partite simulate. Nel formato in fiera resta un piccolo vantaggio per chi batte per primo (1–2 partite su 100),
  perché il punto decisivo sul 40-40 lo batte l'altro.
- I due lati restano alla pari anche qui: con il servizio ogni due punti nel classico il Player 1 fa 48,4% e 49,9% dei
  punti tra bambini, 49,6% e 50,4% tra adulti medi, 49,8% e 50,5% tra amatori.
- **Resta vero che a ogni punto chi batte parte sfavorito.** Ho lasciato così perché togliere lo svantaggio costa
  l'obiettivo principale: il revisore ha provato a dare la corsa piena anche al primo colpo di chi ha battuto, e chi
  batte torna a 50–52 punti su 100, ma «piazza contro centro» scende a 46 partite su 100 tra adulti medi. Va guardato
  con persone: nel tennis vero battere è un vantaggio, qui no.

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
- **Conferma del revisore con altri semi** (180 partite a 1 game, gioco normale; 45 tra due bravi): bambino 73 super
  su 5.579 colpi (0,20 a partita per giocatore; prima 0), adulto medio 34 su 11.655 (0,09; prima 4), amatore 86 su
  17.088 (0,24; prima 1), uno bravo 2 su 13.773 (prima 3). A 1,2 volte il bambino sale a 0,36–0,43 a partita, ma un
  colpo normale su dieci supera già la soglia per caso. Resta una tua decisione (in fondo): la soglia, oppure le
  condizioni del 29/10, che sono il vero freno.

## 4 · Preparazione

- Prima, tra due persone uguali, chi portava indietro il braccio prima del colpo aveva un piccolo vantaggio che nessuna
  scritta spiegava.
- Ora tra due persone non conta. Contro la CPU resta com'era.

| coppia (900 partite) | vince chi prepara sempre, prima | ora |
|---|---|---|
| adulto medio contro adulto medio che non prepara mai | 52,3% | 50,0% |
| amatore contro amatore che non prepara mai | 56,6% | 50,0% |

## 5 · Fasce e aiuto al più giovane

### La decisione (12/11/2026)

> «Non voglio che nessuno abbia un vantaggio di punti, anzi voglio solo che il vantaggio si traduca nel gameplay.»

Quindi:

- **Nessun punto regalato, mai.** Il 15-0 e il 30-0 delle prime varianti (B e C dell'11/11) sono tolti dal gioco.
  Ogni game parte da 0-0 con ogni coppia di fasce, con il campo aperto acceso o spento, nel formato in fiera e in
  quello classico. Nel codice non c'è più il modo di dare punti (un test lo controlla).
- **L'aiuto è solo di gioco**, più forte di quello di prima, e dichiarato per quello che è.

### L'aiuto in gioco (variante G)

In una frase, come la leggerebbe un genitore:

> **Il bambino ha più margine sul tempo del colpo, riceve palle un po' più lente e i suoi colpi vanno un po' più in
> fondo. Nessun punto regalato.**

| coppia | cosa cambia per il più giovane | valori |
|---|---|---|
| **bambino contro adulto** | più margine sul tempo · palla verso di lui più lenta · colpo più in fondo | finestra del tempo × 2 e 0,1 s in più in ritardo · volo della palla × 1,1 · colpo riuscito 1 m più in fondo |
| ragazzo contro adulto | più margine sul tempo (piccolo) | finestra × 1,3 e 0,03 s in più in ritardo |
| bambino contro ragazzo | più margine sul tempo (piccolo) | 0,03 s in più in ritardo |
| bambino contro adulto, **con il campo aperto acceso** | solo più margine sul tempo | finestra × 2 e 0,1 s in più in ritardo |

Le tre leve, tutte e solo per il più giovane:

- **Margine sul tempo.** Il colpo un po' in ritardo o un po' in anticipo manda meno spesso la palla fuori, e c'è un
  attimo in più prima del colpo a vuoto. Il voto del colpo («Presto», «Tardi») resta quello vero. Non si vede.
- **Palla più lenta.** Ogni palla che l'adulto manda al bambino (colpi dello scambio e servizio) sta in aria il 10% in
  più: cade nello stesso punto, un po' più alta e più lenta. Il volo medio dei colpi dell'adulto passa da 0,96 a 1,07
  secondi. Il bambino ha più tempo per colpire. I km/h sul tabellone sono quelli veri, quindi più bassi. Pallonetto e
  palla corta, già lenti, non cambiano.
- **Colpo più in fondo.** Il colpo riuscito del bambino cade 1 metro più in fondo, mai oltre 11,3 m dalla rete (la
  riga di fondo è a 11,89 m): resta in campo. L'adulto colpisce da più lontano e ha un po' meno margine. Un colpo
  sbagliato resta sbagliato: se andava fuori o in rete ci va lo stesso.

Perché tre leve e non una sola più forte (bambino contro adulto medio, misurato):

- Senza aiuto il bambino perde il punto ogni 4,6 colpi suoi, l'adulto ogni 13.
- Con il solo margine sul tempo (la A di prima) il bambino arriva a un errore ogni 7,7 colpi, e non di più: 98 errori
  su 100 che gli restano sono colpi a vuoto in ritardo, con la palla già passata. Lì altro margine non serve.
- La palla più lenta gli dà tempo proprio lì: un errore ogni 9,4 colpi. Il colpo più in fondo toglie un po' di margine
  all'adulto (un errore ogni 12,4 colpi invece di 12,8) e tiene gli scambi lunghi come tra due adulti.
- Spingere una leva sola fino all'obiettivo vuol dire rallentare la palla del 20%: a quel punto la palla dell'adulto
  comincia a sembrare un pallonetto, e con il 25% il bambino la prende da sopra la testa 8 volte su 100 (vedi la
  tabella delle combinazioni).

### Quanto vince il più giovane

Partita a **1 game in fiera** (quella di base nello stesso schermo), **900 partite per riga**, media dei due lati. Due
serie di semi diverse: prima e seconda (per il bambino contro l'adulto medio anche una terza).

**Campo aperto spento (di base)**

| coppia | senza aiuto | **con l'aiuto in gioco (G)** |
|---|---|---|
| **bambino contro adulto medio** | 11,3% · 9,6% (terza: 11,0%) | **39,6% · 41,9%** (terza: 38,1%) |
| bambino contro amatore | 3,8% · 4,0% | 22,6% · 22,2% |
| ragazzo contro adulto medio | 22,4% · 22,2% | 41,8% · 44,8% |
| ragazzo contro amatore | 10,2% · 9,4% | 26,3% · 24,8% |
| bambino contro ragazzo | 30,2% · 27,3% | 42,0% · 40,8% |

**Campo aperto acceso (opzione dello staff)**

| coppia | senza aiuto | **con l'aiuto in gioco (G)** |
|---|---|---|
| **bambino contro adulto medio** | 19,1% · 22,6% | **39,7% · 41,2%** (solo margine sul tempo) |
| bambino contro amatore | 13,3% · 12,7% | 27,8% · 27,4% |
| ragazzo contro adulto medio | 29,6% · 29,9% | 45,2% · 44,8% |
| bambino contro ragazzo | 35,4% · 34,9% | 45,1% · 44,9% |

- **Bambino contro adulto medio: 38–42 partite su 100** (obiettivo circa 40, accettabile 35–45; senza aiuto 10–11; con
  la A di prima 27–29). Mai sopra 50.
- Tra fasce vicine l'aiuto è più piccolo e il più giovane resta sotto: 41–45 su 100.
- Contro un adulto più forte (amatore) il bambino arriva a 22 su 100 (senza aiuto 4). Era così anche con le varianti
  di prima (23 e 26): l'aiuto è tarato sull'adulto medio.
- Con il campo aperto acceso le tre leve insieme farebbero pari (49–50 su 100): lì il bambino contro l'adulto ha solo
  il margine sul tempo, e la pagina dei telefoni scrive «… ha più margine sul tempo.».

**Gli scambi restano veri** (bambino contro adulto medio, campo aperto spento, prima · seconda serie)

| | senza aiuto | A · solo margine sul tempo | **G · in gioco** | per confronto: due adulti medi |
|---|---|---|---|---|
| partite vinte dal bambino | 11,3% · 9,6% | 29,0% · 26,7% | **39,6% · 41,9%** | 50% |
| punti vinti dal bambino | 28,0% · 27,4% | 39,7% · 38,6% | 45,2% · 45,8% | 50% |
| colpi a punto | 8,0 · 7,9 | 10,9 · 11,1 | **11,6 · 12,0** | 11,6 |
| punti a game | 5,3 · 5,3 | 5,7 · 5,7 | 5,7 · 5,8 | 5,8 |
| game a zero | 30% · 28% | 14% · 16% | **15% · 13%** | 13% |
| partita: metà entro | 65 s · 65 s | 89 s · 91 s | **95 s · 96 s** | 90 s |
| partita: 9 su 10 entro | 103 s · 101 s | 142 s · 145 s | 150 s · 155 s | 142 s |

Con l'aiuto la partita tra un bambino e un adulto somiglia a quella tra due adulti medi: stessi colpi a punto, stessi
game a zero, cinque secondi in più. Dura mezzo minuto più di una partita senza aiuto, perché il bambino non perde più
in fretta.

### Le combinazioni provate

Bambino contro adulto medio, 1 game in fiera, 900 partite per riga. «Margine largo» è finestra × 2 e 0,1 s; «margine
medio» è finestra × 1,5 e 0,06 s. Dove ci sono più numeri sono serie di semi diverse.

| combinazione | partite vinte dal bambino | colpi a punto · durata | perché no |
|---|---|---|---|
| **margine largo + palla 10% più lenta + colpo 1 m più in fondo** | **39,6% · 41,9% · 38,1%** | 11,6–12,0 · 94–96 s | **scelta** |
| solo margine largo (la A di prima) | 29,0% · 26,7% · 26,9% | 10,9 · 89 s | non basta: resta sotto 30 |
| solo palla 20% più lenta, senza margine | 14,9% | 9,5 · 81 s | non basta: senza margine il bambino manda la palla fuori |
| margine largo + palla 10% più lenta | 35,9% | 12,1 · 102 s | al bordo basso, e scambi più lunghi |
| margine largo + palla 15% più lenta | 36,4% | 12,9 · 108 s | al bordo basso, scambi più lunghi |
| margine largo + palla 20% più lenta | 43,7% · 39,0% · 42,3% | 13,4–13,5 · 114–117 s | arriva, ma con una leva sola al limite: partita di quasi due minuti, la palla comincia a salire (2 su 100 prese sopra la testa) |
| margine largo + palla 25% più lenta | 48,9% | 13,5 · 114 s | la palla dell'adulto è un pallonetto: 8 su 100 prese sopra la testa |
| margine largo + palla 30% più lenta | 54,3% | 12,6 · 106 s | il bambino vince più dell'adulto; 20 palle su 100 prese sopra la testa |
| margine largo + colpo 1,5 m più in fondo | 31,4% | 10,2 · 83 s | non basta |
| margine largo + colpo 2 m più in fondo | 34,0% | 10,0 · 83 s | non basta, e 2 metri si vedono |
| margine largo + palla 10% + colpo 1,5 m | 40,7% · 43,3% · 36,8% | 11,3–11,5 · 93–95 s | uguale alla scelta entro il rumore: tenuto il valore più piccolo |
| margine largo + palla 10% + colpo 2 m | 42,3% | 11,1 · 92 s | come sopra, con il colpo spinto di più |
| margine largo + palla 15% + colpo 1 m | 43,9% · 44,8% · 44,4% | 12,3 · 101–103 s | al bordo alto dell'obiettivo |
| margine largo + palla 15% + colpo 1,5 m | 44,7% · 49,0% | 12,1–12,2 · 99–103 s | troppo: una serie a 49 |
| margine medio + palla 10% + colpo 1 m | 35,7% | 11,3 · 94 s | al bordo basso |
| margine medio + palla 10% + colpo 1,5 m | 37,0% · 36,0% | 11,3–11,4 · 92–94 s | al bordo basso |
| margine medio + palla 15% + colpo 1 m | 41,0% · 41,7% · 38,6% | 11,7–11,9 · 97–102 s | vale la scelta. Preferita la palla meno rallentata: si nota meno ed è più lontana dal punto in cui diventa un pallonetto |
| margine medio + palla 15% + colpo 1,5 m | 42,8% · 45,6% | 11,6–11,8 · 97–100 s | al bordo alto |
| con il **campo aperto acceso**: le tre leve della scelta | 49,0% · 49,9% | 8,8–8,9 · 78–79 s | pari: troppo. Lì resta il solo margine largo (39,7% · 41,2%) |
| con il campo aperto acceso: margine medio + palla 10% + colpo 1 m | 42,8% · 43,1% | 7,8–7,9 · 71–73 s | va bene, ma il solo margine largo fa lo stesso con una leva |
| **B** dell'11/11: parte da 30-0 | 43,0% | 4,1 punti a game · 50 s | **tolta: punti regalati** |
| **C** dell'11/11: parte da 15-0 e margine medio | 41,9% | 5,0 punti a game · 75 s | **tolta: punti regalati** |

Le righe B e C sono le misure dell'11/11 e non si possono più rifare: il gioco non sa più dare punti.

### Partite più lunghe e formato classico

Le tabelle sopra valgono per la partita a **1 game in fiera**. Bambino contro adulto medio negli altri formati, 900
partite per riga (prima serie):

| formato | senza aiuto | A · solo margine | **G · in gioco** | durata con G: metà entro |
|---|---|---|---|---|
| in fiera, 1 game | 11,3% | 29,0% | **39,6%** | 95 s |
| classico, 1 game | 6,2% | 29,1% | **36,9%** | 106 s |
| in fiera, al meglio di 3 | 2,0% | 18,8% | **36,0%** | 245 s |
| classico, al meglio di 3 | 0,9% | 13,7% | **31,9%** | 278 s |

Chi è più debole deve vincere due game e l'aiuto pesa meno. In fiera al meglio di 3 l'aiuto resta nell'obiettivo (36
su 100); nel classico al meglio di 3 è appena sotto (32 su 100; la variante C di prima dava 28–32). Non ho fatto
valori diversi per formato: nello stesso schermo il formato di base è quello in fiera.

### Attenzione

- **Un adulto segnato «Bambino»** contro un adulto uguale vince 95–96 partite su 100 (con il solo margine sul tempo
  92–93). L'aiuto si sceglie a mano e si vede sullo schermo: lo controlla lo staff.
- **La palla più lenta si vede.** Chi guarda può notare che le palle dell'adulto verso il bambino sono un po' più
  morbide. È voluto ed è dichiarato («riceve palle più lente»). Il 10% è lontano dal punto in cui la palla diventa
  un pallonetto (dal 25% in su).
- I profili «bambino» e «ragazzo» del banco sono **ipotesi**. Se i bambini veri sono più vicini agli adulti di così,
  l'aiuto è troppo; se sono più lontani, è poco. Va guardato alla prima fiera.
- Il ragazzo contro l'adulto medio e il bambino contro il ragazzo stanno a 41–45 su 100: sotto il 50, ma nella parte
  alta. Il loro aiuto (solo margine sul tempo, piccolo) è quello di prima e non l'ho toccato.

Misure: `natpf-tennis/scripts/audit/b25/risultati/misure-aiuto-gioco.txt` (le tabelle) e
`misure-aiuto-gioco-prove.txt` (le combinazioni provate, gli altri formati).

## Controlli

- **Contro la CPU non cambia niente.** Le «impronte» (riassunto di ogni punto e di ogni colpo, con gli stessi semi)
  di 12 serie contro la CPU (Casual, Pro, Leggenda; 4 profili; 240 punti per riga) sono identiche a quelle di
  `f08243a`. `npm run audit:legend`: 69 criteri su 69, «Tutti i criteri rispettati».
- **Stesso schermo con tutto spento.** Le parti 3 e 4 valgono sempre, quindi le partite dello stesso schermo cambiano
  per forza. Per controllare che non cambi **nient'altro** le ho spente a mano (si può fare solo nelle prove): le
  impronte di 12 serie nello stesso schermo (6 coppie, formato in fiera e classico) sono identiche a quelle di
  `f08243a`. Un test lo ripete a ogni giro.
- File: `natpf-tennis/scripts/audit/b25/risultati/impronte-prima-f08243a.txt` e `impronte-dopo.txt`.
- **Dopo l'aiuto solo di gioco (12/11)** ho rifatto i due controlli: le impronte (stesso schermo con le fasce uguali, e
  contro la CPU) sono identiche a quelle salvate, riga per riga, e `npm run audit:legend` dà di nuovo 69 su 69 con la
  stessa uscita. Tra fasce uguali e contro la CPU l'aiuto non esiste: i fattori sono 1 esatto.

## Test

- **Test di unità**: `natpf-tennis/test/natpf-b25-stesso-schermo.test.mjs`, 26 test (23 prima dell'aiuto solo di
  gioco). Opzioni e pannello; lancio automatico nel motore (30 s, 15 s, servizio automatico nel quadrato giusto per i
  due lati, conto «di fila»); scritte; super relativo e sue condizioni; preparazione; campo aperto (corsa, rientro,
  allungo, palla lontana, **servizio ogni due punti anche nel formato classico**); fasce, aiuto, targhetta «Aiuto»
  sulla scheda; impronte identiche a `f08243a`. Per l'aiuto solo di gioco:
  - **nessun punto regalato**: ogni game parte da 0-0 con ogni coppia di fasce, con il campo aperto acceso o spento,
    in fiera e nel classico; nel codice e nelle scritte non resta niente del 15-0 e del 30-0;
  - **palla più lenta**: lo stesso colpo dell'adulto verso il bambino vola il 10% in più e cade nello stesso punto, da
    Player 1 e da Player 2; anche il servizio; il pallonetto no; il colpo del bambino no;
  - **colpo più in fondo**: 1 metro in più, mai oltre 11,3 m, direzione e voto invariati; colpo fallito, debole, in
    rete, pallonetto e palla corta non cambiano;
  - chi batte e il punteggio sono gli stessi con e senza aiuto.
- Suite complete, rifatte il 12/11 sul codice finale dell'aiuto solo di gioco:
  - `npm test` (gioco): 1.184 test, 1.183 superati, 0 falliti, 1 saltato (quello del server LAN, che chiede `npm ci` in
    `tools/lan`: era saltato anche prima);
  - `node --test tools/test/*.test.mjs` (sito e pagina del telefono): 205 su 205;
  - `npm run build`: riuscita;
  - `npm run audit:legend` (contro la CPU): 69 su 69, uscita identica a quella di prima;
  - impronte (`scripts/audit/b25/impronte.mjs`): identiche a quelle salvate.
- **Prova nel browser**: `tools/e2e/natpf-stesso-schermo-b25.mjs`, 54 verifiche (52 prima dell'aiuto solo di gioco),
  con il gioco vero e due telefoni simulati. Pannello dello stand con dodici pulsanti a 1920×540, 1024×600, 1280×720,
  1366×657, 720×720 e 1920×1080 («Chiudi» e «Nuovo giocatore» interi, niente scorrimento), **misurato anche con il
  chiosco e le opzioni accese**; fasce sulle schede; aiuto dichiarato con la frase nuova, **e con il campo aperto
  acceso la frase del solo margine sul tempo**; targhetta «Aiuto» in vista senza scorrere a 1920×540, 1024×600,
  1280×720 e 1366×657; **la partita parte da 0-0 e il tabellone non mostra punti regalati**; lancio automatico spento
  e acceso fino al servizio automatico; campo aperto spento e acceso, con il servizio ogni due punti nel formato
  classico; «Nuovo giocatore». Ho guardato le schermate.
- **Un difetto trovato dalla prova nel browser sull'aiuto solo di gioco, e corretto**: la prima frase («… riceve palle
  più lente e i suoi colpi vanno più in fondo.») andava a capo a 1366×657 e la barra dell'avvio finiva sotto il piè di
  pagina. Ora è «… riceve palle più lente e tira più in fondo.» e sta su una riga.
- **Tre difetti trovati dalla prova nel browser l'11/11 e corretti**:
  - nel gioco vero il lancio automatico contava come lancio di chi gioca (un pezzo dell'interfaccia perdeva
    l'informazione): niente «Lancio automatico» e mai il servizio automatico;
  - i pulsanti delle fasce allargavano le schede oltre il riquadro a 1280×720 e 1024×600;
  - a 720×720 il pannello dello stand scorreva di 10 punti.
- Altre prove nel browser. Rifatte il 12/11 sul codice finale dell'aiuto solo di gioco, tutte superate:
  `natpf-stesso-schermo-b20` 52 su 52, `natpf-split-ready` 34 su 34, `natpf-formato-fiera` 22 su 22. **Non rifatte**
  dopo l'aiuto solo di gioco (erano passate il 12/11 dopo la revisione, e il codice che provano non è cambiato):
  `natpf-menu` 28 su 28, `natpf-nuovo-giocatore` 28 su 28, `natpf-1v1-p2p` 39 su 39 (sfida tra due computer). `npm ci`
  non è stato rifatto: le dipendenze non sono cambiate.

## File toccati

Gioco (`natpf-tennis/`):

- `src/natpf/natpf_duo_rules.js` (nuovo): le cinque regole, le due opzioni, le fasce, le varianti dell'aiuto, le
  scritte.
- `src/game_engine.js`: regole decise a inizio partita (`natpfDuo`), lancio e servizio automatico, colpo super e
  preparazione tra due persone, finestra del tempo per chi è aiutato o in allungo. Dall'aiuto solo di gioco: tolti i
  punti di vantaggio a inizio game; la palla verso chi è aiutato vola più lenta (colpi e servizio) e il suo colpo
  riuscito cade più in fondo (tre righe, che senza aiuto non cambiano niente).
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
- `scripts/audit/b25/` (nuovo): misure e impronte, con le uscite (dalla revisione anche `misure.mjs battitore`,
  `--game=2` e i file `risultati/misure-battitore.txt` e `risultati/misure-aiuto-meglio-di-3.txt`; dall'aiuto solo di
  gioco le varianti 0, A, G, `aiuto-prove --campo=aperto` e i file `risultati/misure-aiuto-gioco.txt` e
  `misure-aiuto-gioco-prove.txt`). `scripts/audit/b19/due-umani.mjs`: tre valori in più
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
- **Il servizio che passa ogni due punti nel formato classico** (campo aperto acceso): provato nei test e nella
  prova nel browser dando i punti a mano, non in una partita giocata fino in fondo da due persone.
- **Il campo aperto guardato da una persona.** Ho visto le schermate, non il movimento: il rientro a passo svelto e il
  personaggio che non arriva sulla palla vanno guardati dal vivo.
- **L'aiuto solo di gioco guardato da una persona.** La palla più lenta verso il bambino e il suo colpo più in fondo
  sono provati nei test e misurati con i robot. Non ho visto una partita vera: se la palla dell'adulto «si sente»
  rallentata lo può dire solo chi gioca. Il robot «bambino» sbaglia soprattutto il tempo; un bambino vero può
  sbagliare anche in altri modi (gesti troppo piccoli, telefono tenuto male) che questo aiuto non tocca.
- **Le altre coppie con una terza serie di semi, e i formati lunghi con una seconda.** Il bambino contro l'adulto
  medio ha tre serie da 900 partite; le altre coppie due; al meglio di 3 e nel classico una sola.
- **Windows, l'installer, il ledwall.** Solo Chromium su Linux, alle misure di schermo elencate.
- **Schermi stretti.** A 720×720 la pagina dei telefoni scorre (era già così): la riga delle fasce è sotto «Destra ·
  Sinistra» e per vederla bisogna scorrere. A 1024×600 e 1920×540 la barra in fondo, che dichiara l'aiuto, è sotto il
  bordo come prima. Dalla revisione sulla scheda di chi è aiutato c'è la targhetta «Aiuto», che si vede senza
  scorrere a 1920×540, 1024×600, 1280×720 e 1366×657; la frase intera si legge nel conto alla rovescia, e in partita
  c'è «Aiuto: Bambino» sotto il nome.
- **La voce.** Nessuna voce nuova: il lancio e il servizio automatico sono solo scritte.
- **Webcam per due e sfida tra due computer.** Non sviluppate. La sfida tra due computer è passata dalla prova nel
  browser `natpf-1v1-p2p`; la webcam per due non ha una prova sua qui.

## Revisione (12/11/2026)

(Questa sezione è la revisione del lavoro dell'11/11, **prima** della decisione sull'aiuto solo di gioco. Dove parla
della variante C, del 15-0 e dei punti di vantaggio racconta com'era allora: oggi vale la parte 5.)

Un revisore indipendente ha riletto tutto il lavoro e rifatto misure e prove con semi suoi. Ha confermato: contro la
CPU niente cambia; con tutto spento lo stesso schermo è quello di prima; i due lati sono alla pari; la variante C
dell'aiuto arriva a 40 partite su 100; lancio automatico, pannello e altre modalità funzionano. Ha trovato una cosa da
correggere e sette minori.

**Da correggere (fatto): con il campo aperto chi batte era sfavorito, e il documento non lo diceva.**

- Cosa succedeva: con il campo aperto chi batte vince 44–48 punti su 100. Nel formato classico a 1 game, dove batte
  sempre lo stesso, chi batteva per primo vinceva 36–44 partite su 100: decideva il sorteggio.
- Correzione: **con il campo aperto acceso il servizio passa ogni due punti anche nel formato classico**. Chi batte per
  primo ora vince 47–51 partite su 100 a 1 game (tabella in «Chi batte», parte 2). Il pulsante del pannello e l'avviso
  lo dicono.
- Cosa resta: a ogni punto chi batte parte ancora sfavorito. È scritto nella parte 2 e tra le decisioni.
- Test: uno nuovo di unità (sequenza dei battitori nel classico e in fiera, con e senza campo aperto, con i punti di
  vantaggio, contro la CPU; parità e vantaggi invariati) e due verifiche nuove nella prova nel browser.

**Minori**

| cosa ha trovato | cosa ho fatto |
|---|---|
| Due righe della tabella delle tattiche erano ottimiste con altri semi (chi mira con il tempo non è «alla pari»; tra amatori rimandare al centro rende ancora) | Aggiunta la tabella con i suoi numeri e corretto il commento (parte 2) |
| Aiuto: «nessun aiuto» e la variante A più basse con altri semi | Aggiunta la colonna con i suoi numeri e gli intervalli: nessuno 8–11, A 23–29, C 40–42 (parte 5) |
| La tabella dell'aiuto vale solo per 1 game in fiera; nel classico al meglio di 3 la C dà 32 su 100 | Misurato e scritto in «Partite più lunghe»: in fiera al meglio di 3 la C dà 38, nel classico 28–32. Codice non cambiato: decidi tu |
| A 1920×540 e 1024×600 la barra che dichiara l'aiuto è sotto il bordo | Targhetta «Aiuto» sulla scheda di chi è aiutato, in vista senza scorrere; provata nel browser |
| Pannello dello stand a 720×720 con chiosco e opzioni accese: scorreva di 6 punti | Tolti altri 11 punti di margini; la prova nel browser ora misura anche con le opzioni accese |
| Colpo super: «qualche volta a partita» non raggiunto | Non cambiato: è una tua decisione (soglia a 1,2 o condizioni del 29/10). Aggiunti i suoi numeri (parte 3) |
| Con il campo aperto rende più la forza della precisione, e una parte del premio va ai colpi larghi per caso | Non cambiato: l'opzione resta spenta di base. Scritto nella parte 2 e tra le decisioni |

Non rifatto dopo la revisione, perché il codice che le riguarda non è cambiato: le misure del colpo super, della
preparazione, delle tattiche e dell'aiuto a 1 game in fiera (in quel formato il servizio passava già ogni due punti).

## Decisioni che ti chiedo

1. **Aiuto solo di gioco: vanno bene le tre leve?** Margine sul tempo, palla verso il bambino il 10% più lenta, colpo
   del bambino 1 metro più in fondo: il bambino vince 38–42 partite su 100 contro un adulto medio, da 0-0.
   - Se la palla più lenta si nota troppo, o se non vuoi toccare la palla dell'adulto: con il solo margine e il colpo
     2 metri più in fondo il bambino si ferma a 34 su 100.
   - Il ragazzo contro l'adulto e il bambino contro il ragazzo hanno solo un piccolo margine sul tempo e stanno a
     41–45 su 100. Va bene così vicino al 50, o li vuoi più bassi?
   - Con il campo aperto acceso il bambino ha solo il margine sul tempo (40–41 su 100). Va bene che lì la frase
     dichiarata sia più corta?
   - Nel classico al meglio di 3 l'aiuto dà 32 su 100. Vuoi un aiuto più forte per le partite lunghe?
2. **Colpo super: lasci la soglia a 1,3 volte** (uno ogni tre partite a 1 game per chi lo cerca) o la porti a 1,2 (quasi
   il doppio, ma scatta anche per caso)?
3. **Campo aperto: lo provi con persone?** In particolare se «tira sempre fortissimo» diventa il modo di vincere, e
   se va bene che con il campo aperto il servizio passi ogni due punti anche nel formato classico.
4. **Lancio automatico: va bene che dopo due lanci a vuoto batta il gioco?**
5. **Campo aperto e servizio: va bene che chi batte parta sfavorito?** Nel tennis vero è il contrario. Con il servizio
   che passa ogni due punti non cambia chi vince la partita, ma si vede a ogni punto.
