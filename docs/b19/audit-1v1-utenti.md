# NATPF Simulator · l'1v1 tra due persone: cosa non va e cosa migliorare

Audit B19 del 10/11/2026 sulla versione **2026-11-10.2** (commit `f0e66d3`), dopo la tappa 1 del B18. Risponde alla
richiesta «fai un nuovo audit delle migliorie da apportare adesso sul gameplay nell'1v1 tra utenti».

L'1v1 tra due persone è stato guardato da tre lati:
- lo **stesso schermo** nel gioco vero, con due telefoni simulati;
- la **sfida tra due computer**, con due sessioni del browser e ritardi di rete aggiunti;
- l'**equilibrio** tra due persone, con migliaia di partite simulate sul motore vero.

Ogni risultato è stato ricontrollato da un secondo agente con script suoi e semi diversi. Qui c'è solo quello che il
secondo controllo ha confermato o corretto, con i numeri corretti, più quello che ha trovato lui. I risultati smentiti
sono in fondo all'appendice. Niente è stato provato con persone vere, telefoni veri, il PC Windows dell'evento, il ledwall
o due computer veri: l'elenco completo è nel §7.

La tappa 2 del B18 va avanti in parallelo e lavora sulla CPU. Per ogni voce è scritto se la tocca. Questo audit non ha
cambiato il gioco: prima servono le tue risposte del §5.

---

## 1. In tre righe

- **Com'è oggi.** Nello stesso schermo i due lati sono alla pari negli scambi, e tra due persone dello stesso livello la
  partita è tirata: un game su tre va ai vantaggi. Però il punto non lo fa mai un colpo: finisce solo quando uno dei due
  sbaglia il tempo. I vincenti sono meno di 1 punto su 100, e chi prova a piazzare la palla perde più spesso di chi la
  rimanda al centro.
- **Cosa pesa di più.** Tra livelli diversi non c'è partita (un bambino batte un adulto medio 7 volte su 100) e non
  esiste un aiuto. La durata non ha un tetto: due persone brave possono non finire mai uno scambio. Chi batte è deciso in
  partenza: di base il Player 2 non batte mai.
- **Cosa si vede subito.** Al Player 2 la risposta al servizio diventa una schiacciata che finisce in rete; al Player 1
  no. Le istruzioni del servizio coprono il tabellone. A fine partita servono due clic sul computer, e «Nuovo giocatore»
  manda via anche chi ha vinto.

La **sfida tra due computer** non è alla pari: il Player 2 è giudicato in ritardo anche con il gesto giusto. Per la tua
decisione del 04/11 non si sviluppa: i suoi difetti sono raccolti a parte (§2, ultima parte) e si toccano solo se la
riapri.

---

## 2. Cosa non va

Priorità: **alta** se decide le partite o si vede a ogni partita, poi **media** e **bassa**. Costo: **piccolo** (poche
righe e una prova), **medio** (va tarato con le prove simulate), **grande** (un comportamento nuovo).

Le voci da 1 a 20 riguardano lo stesso schermo, che è la modalità degli eventi.

### Cosa va già bene (misurato, da non toccare)

- **I due lati sono uguali.** Con lo stesso profilo ai due lati il Player 1 vince tra il 49,6 e il 50,8% dei punti, su
  campioni da 4.000 a 17.000 punti. L'unica eccezione è il difetto 1.
- **Tra pari la partita è tirata.** 6,5–6,9 punti a game, il 26–34% dei game ai vantaggi, l'11–15% a zero, a ogni livello.
- **La regola del «colpo fallito» di Leggenda** (difetto 2 del rapporto B16) nel 1v1 quasi non c'è: 0,1–0,2% dei colpi.
- **Stessa velocità di corsa** (9,8 m/s) e palla della stessa grandezza nelle due metà. Pausa tra un punto e l'altro
  2,15–2,2 secondi, sempre uguale.
- **Fine partita con il nome giusto** anche quando vince il Player 2 («Vince Giulia!»), come deciso nella tappa 1.
- **Telefono che ricarica la pagina in partita**: pausa entro 1,3 secondi, un tocco su «Attiva i sensori», partita
  ripresa dopo 5,5 secondi senza rifare la calibrazione.
- Prova esistente `natpf-split-ready` rilanciata: 34/34.

### Priorità alta

**1. Al Player 2 la risposta al servizio diventa una schiacciata, che finisce in rete.** Costo piccolo.
- *Cosa vede chi gioca.* Chi gioca a destra risponde al servizio con un colpo un po' piatto o che scende. Parte una
  schiacciata da fondo campo, con le stelline, e la palla si ferma in rete. Nessuna scritta spiega perché. Al Player 1 lo
  stesso gesto dà il colpo voluto. Va contro la tua decisione del 31/10 («in risposta al servizio la schiacciata solo se
  voluta»): la tappa 1 l'ha applicata solo al Player 1.
- *Quanto spesso.*
  - Gioco simulato normale: diventa schiacciata il 2,5–2,8% delle risposte del Player 2 «amatore» (4 su 5 in rete) e il
    10–11% di quelle del «tennista». Al Player 1: 0 su circa 1.800.
  - Non serve un tagliato vero. Basta un colpo normale un po' più piatto del proprio solito. Con la variazione naturale
    del gesto diventa schiacciata l'11–18% delle risposte del Player 2, e quattro su cinque finiscono in rete.
  - Con il gesto del tagliato: l'82–84% delle risposte del Player 2 diventa schiacciata, e lui perde subito il 53–55%
    dei punti in risposta, contro il 4–5% del Player 1.
  - Dal gesto vero, passando per la lettura del telefono: il tagliato n. 143 della diagnostica del 30/10 dà al Player 2
    107 schiacciate su 125 (77 in rete), al Player 1 170 tagliati su 170.
  - Nel gioco vero nel browser: 8 risposte del Player 2, 7 giocate come schiacciata, 5 in rete. 6 risposte del Player 1,
    tutte normali.
  - Nel formato di base il Player 2 risponde a tutti i servizi.
  - Succede solo in risposta: nello scambio 0 casi su 33.000 tagliati.
  - Sul risultato di una partita normale simulata pesa al massimo 1 punto su 100. Pesa di più su chi risponde con un
    colpo piatto o che scende.
- *In più.* Ogni schiacciata vera del Player 2 parte da più in basso di quella del Player 1 (al massimo 1,92 m contro
  3,1 m). Sui pallonetti il Player 2 ne manda in rete il 2%, il Player 1 quasi nessuna.
- *Proposta.* Dare al Player 2 le due regole che il Player 1 ha già. Più una prova automatica «a specchio» con il colpo
  143 e con una schiacciata su palla alta. Non tocca la CPU.
- *Tappa 2.* Non lo tocca. Si può fare subito.

**2. Tra due persone non esistono vincenti: il punto finisce solo per un errore di tempo, e mirare fa perdere.** Costo
da medio a grande. Serve una tua decisione.
- *Cosa vede chi gioca.* Qualunque palla, anche angolata o fortissima, l'altro la prende: il personaggio corre da solo e
  arriva sempre. Lo scambio va avanti finché uno fa il gesto troppo presto o troppo tardi. Chi prova a piazzare la palla
  sbaglia di più e non guadagna niente. Palla corta e pallonetto sono un regalo. Per la fila sono scambi tutti uguali,
  senza il colpo che fa applaudire.
- *Quanto spesso.*
  - Palle che l'altro non raggiunge: 0–0,6% dei punti tra adulti, 1–3,5% tra bambini. Nel browser: 0 su 84 punti.
  - Come finiscono i punti tra due adulti medi: palla fuori per il tempo 54%, colpo a vuoto 41%, errori di mira o di
    forza 3–4%.
  - Chi non mira mai batte chi gioca normale: 65–75% delle partite. Chi mira sempre contro chi non mira mai: 18–28%.
  - Tirare sempre fortissimo: 61–65%, con 8 errori di forza su 1.656 punti.
  - Solo palle corte: 4–6% delle partite. Solo pallonetti: 0–3%, e tre su quattro diventano una schiacciata
    dell'altro.
  - Rallentare i personaggi non basta. Tra adulti medi le palle non raggiunte restano sotto il 2% anche a metà velocità
    (4,7 m/s invece di 9,8) e arrivano al 12% solo a 3,5 m/s. Tra due bravi salgono al 3–9% a 4,5 m/s e al 16–35% a
    3,5 m/s.
- *Perché.* La palla lascia 1,2–1,45 secondi tra un colpo e l'altro, e il personaggio parte subito a velocità piena. Il
  colpo preso in corsa o in allungo perde solo un po' di qualità, e nel 1v1 non fallisce mai.
- *Proposta.* Far contare il piazzamento, solo tra due persone (miglioramento 7). Tocca una scelta di progetto: oggi il
  personaggio arriva ovunque e chi gioca controlla solo il gesto.
- *Tappa 2.* Non lo tocca: il «campo aperto» della tappa 2 riguarda solo la CPU. Due attenzioni. La «palla corta che può
  sbagliare» va applicata solo contro la CPU: tra due persone la palla corta perde già. Il «movimento più naturale» è
  nella tappa 3 e va fatto d'accordo con questa voce.

**3. La durata non ha un tetto: scambi lunghi, e tra due bravi senza fine.** Costo piccolo per il tetto, medio per gli
scambi.
- *Cosa vede chi gioca.* Due adulti palleggiano a lungo e la fila aspetta senza sapere quanto manca. Due persone che
  hanno preso il tempo si rimandano la palla per minuti, sempre «Perfetto». La barra passa ad «Affaticato» ma non cambia
  niente.
- *Quanto spesso.* Tempo di gioco simulato; i due banchi danno numeri un po' diversi e qui c'è l'intervallo.

  | coppia | colpi a punto (media) | 1 game: metà oltre | 1 game: una su dieci oltre | 1 game: la più lunga |
  |---|---|---|---|---|
  | due bambini | 7–9 | 1,2–1,8 min | 2,2–3,3 min | 3,7–7,6 min |
  | due adulti medi | 12 | 1,7 min | 3,4 min | 5,8 min |
  | due amatori | 14–17 | 2,1–2,3 min | 3,9–4,2 min | 8,8–9,7 min |
  | due bravi | 23–53 | 3–5,8 min | 5–11 min | 10–20 min |

  - Al meglio di 3: due amatori metà oltre 5,6–6,5 minuti, una su dieci oltre 9,4–10,5, la più lunga 15–20 minuti.
  - Al meglio di 5: due amatori fino a 24 minuti, due bravi 28–46 minuti.
  - Con il formato in fiera acceso i casi lunghi calano del 18–30%: due amatori una su dieci oltre 3–3,4 minuti.
  - Nel gioco vero nel browser: con errori da amatore, primo punto di 54 colpi e 75 secondi. Con due robot precisi un
    punto è arrivato a 298 colpi in 6,6 minuti senza finire. Due robot con il tempo di un adulto medio che fanno solo
    tagliati: un punto di 277 colpi e 7 minuti.
  - Le prove simulate fermano lo scambio a 80 o 150 colpi. Nel gioco vero quel limite non c'è.
- *Attenzione.* Vale per chi fa il gesto nel momento che il gioco considera giusto. Chi lo fa un quarto di secondo dopo
  il rimbalzo, come la persona filmata il 23/10, ha il problema opposto: 2–5 colpi a punto e partite da mezzo minuto
  (vedi il punto 5). Senza persone vere non so quale dei due casi vedrai in fiera.
- *Perché.* Nel 1v1 la qualità del colpo cala dal 16° colpo, ma non scende mai sotto la soglia che fa sbagliare. La palla
  accelera solo fino all'8° colpo. La stanchezza toglie al massimo il 10% alla corsa, e la corsa non decide.
- *Proposta.* Un «Tempo massimo» come rete di sicurezza e uno «scambio che si scalda» che si vede (miglioramento 2).
- *Tappa 2.* Non lo tocca. Attenzione al «segnale del momento giusto»: se aiuta tutti e due a colpire a tempo, tra due
  persone gli scambi si allungano ancora. Va misurato insieme.

**4. Tra livelli diversi il più debole non ha possibilità, e non c'è nessun aiuto.** Costo medio.
- *Cosa vede chi gioca.* Genitore contro figlio, o chi ha già giocato contro chi prova per la prima volta: finisce a
  zero o quasi, in un minuto. Nello stesso schermo il livello non si sceglie: la pagina dei telefoni chiede solo nome e
  mano, la pagina «Partita» solo formato, durata, chi batte e visuale.
- *Quanto spesso.* Partite da 1 game vinte dal più debole:

  | coppia | vince il più debole |
  |---|---|
  | bambino contro adulto medio | 7% (14% se tutti e due anticipano come le persone vere) |
  | bambino contro amatore | 2% |
  | adulto medio contro amatore | 26–29% |
  | adulto medio o amatore contro uno bravo | 0% |

  - Game finiti a zero: 43% tra amatore e bambino, 64–72% tra uno bravo e gli altri.
  - Basta pochissimo. A parità di tutto, chi sbaglia il tempo di ±0,075 secondi batte chi sbaglia di ±0,09 secondi 70
    volte su 100.
  - Il ritardo costa molto più dell'anticipo. Tra due adulti medi uguali, chi colpisce 40 millesimi tardi vince il 22%
    delle partite e chi colpisce 40 millesimi prima il 66%. In anticipo si colpisce fino a 0,45 secondi prima; in
    ritardo solo fino a 0,10–0,21 secondi, secondo la velocità della palla.
- *Limite.* Il profilo «bambino» è un'ipotesi: non so quanto sia grande il divario vero tra un bambino e un adulto.
- *Proposta.* Un aiuto scelto a mano per ogni giocatore (miglioramento 1).
- *Tappa 2.* Non lo tocca: i livelli Evento e Bambini sono contro la CPU. Il livello Bambini può dare i parametri
  dell'aiuto «Facile».

**5. Il momento giusto per colpire cambia da palla a palla, e niente lo mostra.** Costo medio.
- *Cosa vede chi gioca.* In risposta al servizio di un'altra persona la palla va colpita tardi, quando è alta (1,6 m).
  Nello scambio due palle su tre vanno colpite subito dopo il rimbalzo, quando sono all'altezza delle ginocchia. Chi si
  regola sul rimbalzo sbaglia tutte e due: in risposta è in anticipo, nello scambio è in ritardo.
- *Quanto spesso.*
  - Risposta al servizio di una persona: il momento giusto è 0,52–0,68 secondi dopo il rimbalzo. Contro la CPU è
    0,31–0,35.
  - Scambio: entro 0,2 secondi dal rimbalzo il 54–62% delle palle tra bambini, il 67–72% tra amatori, l'83% tra
    bravi.
  - Nessun ritardo fisso dal rimbalzo funziona: con il gesto sempre allo stesso tempo gli scambi durano 2–7 colpi.
  - Il profilo che colpisce 0,25 secondi dopo il rimbalzo rimette in gioco la risposta solo nel 18% dei servizi.
- *Limite.* Non so quante persone si regolano sul rimbalzo e quante sulla palla vicina al personaggio. Le due misure
  aggiunte alla diagnostica nella tappa 1 (`docs/b18/misure-con-persone.md`) aspettano ancora i dati veri.
- *Proposta.* Due passi. Primo: il «segnale del momento giusto» della tappa 2 va disegnato anche per le due metà dello
  stesso schermo e per i due momenti diversi. Secondo, solo dopo le misure con persone: nel 1v1 prendere la palla più
  tardi e più in alto anche nello scambio, così «colpisco dopo il rimbalzo» vale sempre.
- *Tappa 2.* Sì: il «segnale del momento giusto» è la prima risposta. Va provato con una palla di 4–7 pixel (punto 13).

**6. Chi batte è deciso in partenza, e può decidere la partita.** Costo piccolo.
- *Cosa vede chi gioca.* Nel formato di base batte sempre il Player 1, cioè chi sta a sinistra. Il Player 2 non serve
  mai e non vede mai le istruzioni del servizio. Alla rivincita batte di nuovo lo stesso. Con il formato in fiera acceso
  battono tutti e due, ma il punto decisivo sul 40-40 lo batte sempre chi non ha iniziato.
- *Quanto pesa.* Dipende da come le persone prendono il tempo, e le prove simulate danno tre risposte.
  - Chi colpisce nel momento giusto del gioco (adulti medi, amatori, bravi): chi batte vince il 50–53% dei punti e
    il 53–59% delle partite da 1 game. Un vantaggio piccolo.
  - Chi colpisce un quarto di secondo dopo il rimbalzo: chi batte vince il 64–81% dei punti. Nel formato di base il
    Player 1 vince l'82–98% delle partite. Con il formato in fiera vince più spesso chi **non** batte per primo
    (56–62%), perché batte 4 punti su 7 compreso quello decisivo.
  - Tra bambini i due banchi non concordano: in uno chi batte vince solo il 37–41% delle partite, nell'altro circa la
    metà. È incerto (vedi appendice, A6).
  - Il punto decisivo lo batte chi non ha iniziato in tutte le partite controllate (oltre 370).
- *Proposta.* «Sorteggio» di base e servizio che passa all'altro a ogni rivincita (miglioramento 3).
- *Tappa 2.* In parte. La tappa 2 dà peso al servizio contro la CPU; nello stesso schermo il servizio resta com'è. Se un
  giorno cambia anche il servizio tra persone, queste percentuali vanno rimisurate.

### Priorità media

**7. Agitare il telefono senza guardare la palla rende quanto provarci.** Costo medio. Da provare prima con un
telefono vero.
- *Cosa vede chi gioca.* Un bambino che scuote il telefono avanti e indietro di continuo rimanda quasi tutte le palle,
  spesso con la scritta «in anticipo». L'altro bambino, che prova a colpire a tempo, perde.
- *Quanto spesso.* Telefono simulato con la catena vera del riconoscimento. Agitando 3 volte al secondo: contro un
  bambino che ci prova vince il 73–87% delle partite, contro un adulto medio il 25–35%, contro un amatore il 12%. Ad
  altri ritmi rende meno (20–49% contro il bambino). Il 70% dei suoi colpi ha il voto «in anticipo», ma la palla torna.
- *Perché.* Ogni gesto fatto fino a 0,45 secondi prima del momento giusto resta in attesa e colpisce la palla.
- *Proposta.* Prima due minuti allo stand con un telefono vero: il telefono simulato ruota in modo troppo regolare. Poi
  una di due strade.
  - Stringere l'anticipo ammesso nel 1v1 da 0,45 a circa 0,30 secondi. Provato solo in memoria: chi agita scende dall'87
    al 34% contro il bambino. Però chi anticipa di 70 millesimi, come fanno le persone, perderebbe il 36% dei punti per
    «troppo presto» (oggi lo 0,6%).
  - Dal secondo gesto sulla stessa palla il colpo perde qualità. Chi fa un gesto solo non cambia niente. Non provata.
- *Tappa 2.* Non lo tocca. Il «segnale del momento giusto» aiuta chi prova a colpire a tempo, ma non toglie il vantaggio
  a chi agita.

**8. Le istruzioni del servizio coprono il tabellone.** Costo piccolo.
- *Cosa si vede.* Il riquadro «Alza il telefono: lanci la palla» si mette sopra la seconda riga del tabellone di quella
  metà. Nella metà di destra il riquadro è più stretto e il testo va su 2–3 righe.
- *Quanto spesso.* Nei primi 2 servizi di ogni giocatore, e ogni volta che chi batte aspetta più di 6 secondi. Riga
  coperta per il 12–16% a 1280×720 e a 1920×1080, per il 29–50% nell'area quadrata 720×720. Niente nelle aree larghe e
  basse (1920×540).
- *Proposta.* Riquadro sotto il tabellone o in basso sopra il nome, largo uguale nelle due metà. Più una prova nel
  browser «nessuna sovrapposizione» a cinque misure dello schermo.
- *Tappa 2.* Non lo tocca. Il segnale del momento giusto e la scritta del colpo super dovranno trovare posto senza
  coprire tabellone e istruzioni.

**9. Se chi deve battere resta fermo, il gioco aspetta per sempre e non lo chiama per nome.** Costo piccolo.
- *Cosa si vede.* Nella metà di chi batte resta solo «Alza il telefono: lanci la palla». L'altro e la fila non capiscono
  chi sta bloccando. Provato fino a 40 secondi: nessun banner, nessun nome. Se resta fermo chi risponde, perde il punto
  senza un aiuto.
- *Proposta.* Dopo 8–10 secondi un richiamo a tutta larghezza: «Marco, batti tu: alza il telefono». Per chi risponde e
  non ha ancora colpito: «Giulia, colpisci quando la palla arriva», una volta sola. In più, se vuoi, il lancio che parte
  da solo dopo 30 secondi (domanda 9).
- *Tappa 2.* Non lo tocca.

**10. Telefono che si scollega in partita: QR coperto, niente nome, l'altro telefono non lo sa.** Costo piccolo.
- *Cosa si vede.*
  - Cade il telefono del Player 1: si apre da sola la finestra con il QR nuovo, ma il riquadro «Telefono del Player 1 in
    pausa» le sta sopra e copre un quarto del QR. A 1920×1080 il lettore delle prove non l'ha mai letto (0 su 12).
  - Cade il telefono del Player 2: nessun QR.
  - Il riquadro dice «Player 2» anche se il nome scritto è Giulia.
  - Il telefono dell'altro continua a dire «Pronto · Colpisci quando la palla arriva».
  - Chi rientra con il QR nuovo rifà tutorial e calibrazione a partita ferma: 32 secondi con un robot che non esita.
- *Quanto spesso.* Ogni volta che la pagina del telefono si chiude in partita. Se il telefono ricarica la stessa
  pagina, invece, tutto si sistema in 5,5 secondi.
- *Proposta.* Il QR del telefono caduto dentro il riquadro della pausa, uguale per i due giocatori e con il nome. Avviso
  all'altro telefono. A partita in corso chi rientra non rifà il tutorial.
- *Tappa 2.* Non lo tocca.

**11. Fine partita e rivincita poco adatte alla fila.** Costo medio.
- *Cosa si vede.*
  - La scheda finale è larga 520 pixel su 1920, con il nome di chi vince alto 30 pixel.
  - In una partita a 1 game c'è scritto «Game 0-1», che non dice com'è andata.
  - Per rigiocare servono due clic sul computer («Gioca ancora», poi «Gioca»). I telefoni dicono solo «Partita finita:
    guarda il computer».
- *Proposta.* Miglioramento 5.
- *Tappa 2.* Non lo tocca. La fine partita con i dati veri è nella tappa 3: conviene farle insieme.

**12. «Nuovo giocatore» manda via tutti e due, e chi eredita la calibrazione di un altro perde colpi.** Costo medio.
- *Cosa si vede.*
  - A fine partita «Nuovo giocatore» azzera i due nomi e tutti e due rifanno tutorial e calibrazione, anche chi ha vinto
    e vorrebbe sfidare il prossimo. Dal clic al primo servizio servono almeno 57–59 secondi con due robot che non
    esitano.
  - Se arriva un bambino dopo un adulto e nessuno preme «Nuovo giocatore», alcuni suoi gesti sono letti come «deboli» e
    non vengono giocati: la palla passa.
- *Quanto spesso.* A ogni cambio di coppia. Un bambino con la calibrazione di un adulto vince il 30% delle partite
  contro un bambino uguale, invece della metà: il 18% dei punti lo perde con un gesto non giocato. Nel gioco vero dura
  meno: il telefono impara il colpo nuovo dopo circa 12 colpi normali (non misurato).
- *Proposta.* «Chi vince resta» (miglioramento 4). In più una sicurezza: se tre colpi veri di fila sono sotto metà del
  colpo abituale salvato, il gioco lo reimpara subito. Tocca la lettura della forza del gesto: vuole test.
- *Tappa 2.* Non lo tocca.

**13. Palla e scritte piccole nelle due metà.** Costo piccolo.
- *Cosa si vede.* Quando la palla è dall'altra parte della rete è un puntino. La scritta dell'esito sta nell'angolo
  esterno in basso, lontano da dove si guarda. Nelle aree quadrate metà dell'altezza è pavimento vuoto.
- *Quanto spesso.* Sempre.

  | schermo | palla vicina / alla rete / lontana | scritta dell'esito: parola e motivo |
  |---|---|---|
  | 1280×720 | 10 / 7 / 5 pixel | 17 e 10 pixel |
  | 1920×1080 | 16 / 10 / 7 pixel | 25 e 15 pixel |
  | area 1920×540 | 10 / 6 / 4 pixel | 14 e 9 pixel |
  | area 720×720 | 7 / 5 / 4 pixel | 14 e 9 pixel |

- *Proposta.* Miglioramento 9.
- *Tappa 2.* Sì, in parte: il segnale del momento giusto e il colpo super spiegato vanno disegnati per una palla di 4–7
  pixel e per due metà.

**14. Il colpo super tra due persone quasi non esiste.** Costo medio. Tocca la tua decisione del 29/10.
- *Cosa vede chi gioca.* La barra della potenza è piena ma il super non parte. Un bambino non lo vedrà mai, qualunque
  gesto faccia.
- *Quanto spesso.*
  - Giocando normalmente: bambino 0 su 10.057 colpi, adulto medio 3 su 18.719, uno bravo 37 su 85.956.
  - Tirando sempre fortissimo: bambino 0, adulto medio 0,9% dei colpi, uno bravo 0,5%.
  - Per il super serve un gesto da circa 1.045 gradi al secondo. Per un bambino è 2,75 volte il suo colpo, per un adulto
    medio 1,5 volte.
  - Quando parte chiude il punto una volta su quattro tra adulti medi e una su venti tra bravi.
- *Proposta.* Miglioramento 8.
- *Tappa 2.* Sì: il «colpo super spiegato» va fatto insieme, altrimenti a un bambino comparirebbe sempre «gesto non
  abbastanza forte», senza rimedio.

**15. La forza del braccio pesa anche da calibrati.** Costo piccolo. Da decidere con il punto 4.
- *Cosa vede chi gioca.* Chi ha il gesto piccolo manda palle più lente e più corte anche dopo la calibrazione, e l'altro
  ha più tempo.
- *Quanto spesso.* Stesso tempo e stessa mira, cambia solo la forza del gesto: il gesto debole (380 gradi al secondo
  contro 790) vince il 40% delle partite da calibrato e il 23% senza calibrazione. Il gesto forte (1.150) vince il 59%.
- *Proposta.* Nel 1v1 la forza tutta relativa al proprio colpo abituale: il colpo normale di un bambino vale quello di
  un adulto.
- *Tappa 2.* Non lo tocca.

**16. Una webcam per due: Player 1 e Player 2 sono giudicati con regole diverse.** Costo medio.
- *Cosa succede.* Con una webcam per due il colpo del Player 1 passa dalle regole nuove (il tempo del gesto decide
  direzione e qualità) e quello del Player 2 dalle regole vecchie. A parità di gesti il Player 1 non sbaglia quasi mai
  in rete e va spesso a vuoto; il Player 2 sbaglia spesso fuori e in rete e quasi mai a vuoto.
- *Quanto spesso.* Sempre, con la webcam per due. Chi dei due è favorito dipende da come la webcam legge i gesti: nelle
  due prove simulate il Player 1 ha vinto il 75% e il 46% delle partite. Con due telefoni, stessa prova: 53%.
- *Limite.* È certa la differenza di regole, non la grandezza del vantaggio: i gesti della webcam erano costruiti a
  mano. È una scelta scritta in una prova automatica, non una svista.
- *Proposta.* Portare il Player 2 senza telefono sulle stesse regole del Player 1, con una prova «a specchio».
- *Tappa 2.* Non lo tocca.

**17. Le due viste disegnano il doppio: da misurare sul PC dell'evento.** Costo piccolo.
- *Cosa succede.* Nello stesso schermo il gioco disegna la scena due volte: circa 2,96 milioni di triangoli a
  fotogramma contro 1,51 milioni. Se la scheda grafica del PC noleggiato è debole, il gioco va a scatti proprio nella
  modalità più importante, e il tempo del colpo diventa più difficile per tutti e due.
- *Proposta.* Prima misurare (miglioramento 10). Solo se serve, pubblico e tribune più leggeri a schermo diviso.
- *Tappa 2.* Non lo tocca.

### Priorità bassa (in breve)

La tappa 2 non tocca nessuna di queste tre voci.

18. **Scritte da rendere più chiare.**
    - Il banner dice «Vincente di Giulia» anche quando Marco ha fatto il gesto ed è andato a vuoto: succede in un punto
      su tre.
    - «Palla match» non dice di chi è.
    - Sotto il tabellone resta «Partita a 1 game» anche con il formato in fiera acceso.
    - La fascia del banner del punto copre per 1,5–2 secondi la metà lontana del campo.

    Costo piccolo.
19. **La preparazione del colpo conta, ma nessuna scritta la insegna.** Tra due persone uguali, chi porta indietro il
    braccio prima del colpo vince il 55–57% delle partite. Basta una riga nel tutorial («porta indietro il braccio, poi
    colpisci»), oppure decidere che nel 1v1 non conta. Costo piccolo.
20. **La barra «Energia / Affaticato» nello stesso schermo dà un'informazione che non conta.** La stanchezza non sposta
    i risultati. Si può lasciare o nascondere. Costo piccolo.

### Sfida tra due computer (ferma per la tua decisione del 04/11)

Il 04/11 hai deciso: «niente 1v1 tra due PC né multiplayer agli eventi», la sfida resta com'è e non si sviluppa. Tutte
le proposte qui sotto toccano quella decisione. Le prove esistenti della sfida sono verdi (`natpf-1v1-p2p` 39/39,
`natpf-formato-fiera-p2p` 9/9). La tappa 2 non tocca nessuno di questi punti.

**D1. Il Player 2 è giudicato in ritardo anche con il gesto giusto.** Priorità alta, costo medio (primo passo piccolo).
- *Cosa vede chi gioca.* Il Player 2 colpisce quando sul suo schermo la palla è al punto giusto. Per il computer che
  ospita la partita quel gesto è «in ritardo»: la palla va sempre lungolinea, poi esce, poi il colpo va a vuoto.
- *Quanto spesso.* Nel browser vero, con due sessioni.
  - Senza ritardo aggiunto: 21 gesti giusti su 74 giudicati in ritardo (28%). Il Player 2 vede la palla vecchia di 20–40
    millesimi anche con la rete perfetta.
  - Con 50 millesimi di rete in più: 19 su 19 in ritardo. Con 100: nessuno giusto su 31, e 3 a vuoto. Con 150: 5 a
    vuoto su 8.
  - Con la pagina vera del telefono collegata al Player 2 e 80 millesimi: 0 giusti su 22.
  - Partite simulate tra due amatori uguali, punti vinti dal Player 2: 63% senza ritardo, 49% con 30 millesimi, 42% con
    50, 20% con 100.
- *Perché.* Oggi il Player 2 ha solo 30 millesimi fissi di tolleranza in più. Senza ritardo lo favoriscono; con la rete
  vera non bastano.
- *Proposta.* Primo passo piccolo: il computer del Player 2 porta avanti la palla dell'età che conosce già. Poi il
  giudizio del gesto dove la palla era sul suo schermo. Stima sulle prove simulate: gesto giusto riconosciuto al 100%
  fino a 150 millesimi di ritardo.

**D2. Computer e telefono del Player 2 dicono «Perfetto» mentre il colpo è in ritardo o a vuoto.** Alta, costo medio.
Con 80 millesimi di ritardo il telefono ha scritto «Perfetto!» in 21 gesti su 22, mentre per il computer che ospita
erano 19 in ritardo, 2 molto in ritardo e 1 a vuoto. La palla del Player 2 scatta: 5 salti in 50 secondi senza ritardo,
19 con 100 millesimi. Proposta: il computer che ospita manda l'esito vero del colpo, e scritta e telefono mostrano
quello.

**D3. Fine partita e rivincita: i due computer non si parlano.** Alta, costo piccolo.
- Chi ospita preme «Gioca ancora»: sul Player 2 la schermata finale resta sopra il campo per i primi punti (10 secondi
  nella prova).
- Il Player 2 preme «Gioca ancora»: la schermata sparisce e ricompare; l'altro non sa niente.
- Il Player 2 preme «Menu»: l'altro resta sulla schermata finale senza avviso.
- Chi ospita torna al menu a metà partita: il Player 2 si ritrova nel pannello d'inizio, ancora «pronto», senza
  spiegazioni.

Proposta: «Rivincita» a due, con «Aspetto Player 2…» e «Player 2 è uscito».

**D4. Se il Player 2 si scollega, l'altro prende punti gratis per 9 secondi.** Alta, costo piccolo. Due prove: pausa
dopo 9,1 e 9,4 secondi, 2 punti regalati ogni volta; in una l'altro ha vinto il game. Proposta: fermo dopo 1,5–2 secondi
e punteggio riportato a quando il Player 2 c'era.

**D5. Con il programma Windows il codice d'invito non porta a nessuna stanza.** Media, costo medio. Il codice funziona
solo sul sito. Con un programma per computer ognuno cerca il codice sul proprio computer e non lo trova. Il link di chi
ospita funziona. Simulato con due server locali; non provato su Windows.

**D6. Servizio del Player 2: il lancio riparte e la battuta torna indietro.** Media, costo piccolo. Con 30 millesimi di
ritardo o più: 17 servizi su 17. Le istruzioni si ripetono e al secondo servizio non compaiono.

**D7. Le pause non valgono per tutti e due.** Media, costo piccolo.
- Il Player 2 apre la pausa: legge «Partita in pausa» ma dall'altra parte si gioca e i punti contano (da 0-0 a 30-0 in
  10 secondi).
- Chi ospita mette in pausa a metà scambio: sul Player 2 la palla continua a volare ed esce. Alla ripresa ricompare a
  metà campo senza «3, 2, 1».

La regola del 30/10 dice che il Player 2 non mette in pausa da solo. La correzione più piccola è chiamare il suo
pannello «Impostazioni · la partita continua».

**D8. Con la rete lenta la palla del Player 2 va a scatti.** Media, costo medio. Gli aggiornamenti arrivano solo a
richiesta: 18–20 al secondo senza ritardo, 11 con 50 millesimi, 6–7 con 100.

**D9. Informazioni che mancano.** Da media a bassa, costo da piccolo a medio.
- Niente nomi: sempre «Player 1», «Player 2» e «Tu».
- Chi batte: sempre chi ospita, anche in tre rivincite di fila.
- Nessun indicatore del collegamento.
- Il Player 2 non sa quanto dura la partita né chi batte finché non comincia.

**D10. Altri difetti a priorità bassa.**
- Se chi ospita ricarica la pagina, la durata torna a «1 game» e il Player 2 deve ripremere «Sono pronto». Il punteggio
  salvato c'è ancora: basta salvare anche la durata.
- Con il collegamento fermo per più di 4–5 secondi il Player 2 rivede tutto il pannello d'inizio sopra il campo.
- Chi sta perdendo lo scambio può annullarlo nascondendo la finestra: il punto si rigioca.
- Sul computer del Player 2 la voce dice il punteggio dal lato dell'altro («Fifteen – Love») mentre la scritta dice
  «0-15».

---

## 3. Cosa migliorare (in ordine di valore per l'evento)

Per ogni opzione nuova è scritto **come si attiverebbe**. Oggi non esiste nessuna di queste: sono proposte.

Il **pannello dello stand** è quello che c'è già: dal menu principale Ctrl+Maiusc+K, oppure 3 secondi sul marchio NATPF
in alto a sinistra. Le sue scelte restano salvate.

**1. Un aiuto per giocatore: «Vantaggio» e «Facile».** Risponde al punto 4.
- *Oggi.* Regole uguali per tutti e due. Un bambino contro un adulto medio vince 7 partite su 100.
- *Proposta.* Due aiuti scelti a mano, mai automatici.
  - **«Vantaggio»**: il più debole parte da 15-0 o 30-0 a ogni game. Si vede sul tabellone e si spiega in una parola.
  - **«Facile»**: più tolleranza sul ritardo per quel giocatore (circa 60 millesimi). Non si vede come un trucco.
- *Effetto misurato* (prove simulate, regole cambiate solo in memoria).
  - Vantaggio, bambino contro adulto medio: 15-0 → 16%, 30-0 → 37%, 40-0 → 66%.
  - Facile: tra livelli vicini basta (adulto medio contro amatore: dal 28 al 56%). Tra bambino e adulto no: si ferma al
    15–18%.
  - Dare al più debole le regole di Casual e al più forte quelle di Leggenda porterebbe bambino contro adulto al
    50%, ma funziona quasi solo con il «colpo fallito» automatico (17–18% dei punti): sembra truccato. La tappa 2
    cambia proprio quella regola. Non lo propongo adesso.
- *Come si attiverebbe.* Sulla scheda di ciascun giocatore nella pagina dei telefoni dello stesso schermo, accanto a
  nome e mano: «Aiuto: Normale · Facile» e «Vantaggio: No · 15-0 · 30-0». Di base «Normale» e «No»: senza toccarli non
  cambia niente. La scelta è ripetuta nel riassunto della pagina «Partita». Sul tabellone compare una scritta piccola
  accanto al nome. Lo staff può fissarli dal pannello dello stand (dal menu Ctrl+Maiusc+K). «Nuovo giocatore» li riporta
  a «Normale» e «No».
- *Costo.* Medio. Il «Vantaggio» da solo è piccolo.

**2. Un tetto alla durata: «Tempo massimo» e «scambio che si scalda».** Risponde al punto 3.
- *Tempo massimo.* Allo scadere, finito il punto in corso, compare «Ultimo punto: chi lo vince, vince la partita», con
  la voce «Match Point» che c'è già. Un orologio piccolo nel tabellone dice alla fila quanto manca.
  - *Come si attiverebbe.* Pannello dello stand (dal menu Ctrl+Maiusc+K) → riquadro «Tempo massimo»: No · 2 min · 3 min →
    «Chiudi». Spento di base. Costo piccolo. Non provato.
- *Scambio che si scalda.* Dal 10° colpo la palla va un po' più veloce a ogni colpo, per tutti e due, in modo che si
  veda (scia che cambia colore, pubblico che sale), finché uno sbaglia.
  - *Effetto.* Misurato solo un prototipo diverso, con le regole severe dal 9° colpo: scambio più lungo 36 colpi, 1 game
    tra due bravi da 5,8 a 2,8 minuti. Ma tra bravi il 72% dei punti finirebbe con il colpo fallito automatico. La
    versione da fare è l'accelerazione che si vede, e nessuno l'ha ancora provata.
  - *Obiettivi.* 9 scambi su 10 sotto i 30 colpi con qualunque coppia; 1 game sotto i 3 minuti in 9 casi su 10; Player 1
    e Player 2 sempre alla pari.
  - *Come si attiverebbe.* Acceso di base nello stesso schermo. Per spegnerlo: pannello dello stand → riquadro «Scambio
    che si scalda»: Sì · No. Costo medio.
- *Senza codice, da oggi.* Per gli eventi usare 1 game, meglio con il formato in fiera acceso (pannello dello stand →
  «Formato in fiera»). Evitare «al meglio di 5» nello stesso schermo.

**3. Chi batte: sorteggio, alternanza, punto decisivo.** Risponde al punto 6.
- *Proposta.*
  - Nello stesso schermo «Batte per primo» parte da «Sorteggio» invece che da «Player 1».
  - Alla rivincita batte per primo l'altro.
  - Nel formato in fiera il punto decisivo lo batte chi viene sorteggiato, scritto nel banner: «Punto decisivo: batte
    Giulia».
- *Come si attiverebbe.* Niente da accendere. La scelta resta dov'è oggi: «Stesso schermo» → pagina «Partita» → «Altre
  impostazioni» → «Batte per primo» (Player 1 · Player 2 · Sorteggio).
- *Da chiederti.* Il formato in fiera acceso di base solo nello stesso schermo. Farebbe battere tutti e due anche in 1
  game e toglierebbe i vantaggi senza fine. Tocca la tua decisione del 10/11 («spento di base»).
- *Costo.* Piccolo.

**4. «Chi vince resta».** Risponde al punto 12.
- *Proposta.* A fine partita nello stesso schermo due pulsanti al posto di uno.
  - «Cambia chi ha perso»: chi ha vinto tiene nome, tutorial visto e calibrazione. L'altro riparte da zero, con il
    telefono che resta collegato.
  - «Cambiano tutti e due»: come «Nuovo giocatore» di oggi.

  Sul tabellone un piccolo conto delle vittorie di fila («Marco · 2 di fila»).
- *Come si attiverebbe.* Niente da accendere: i due pulsanti sono nella schermata di fine partita. Lo stesso comando
  per un giocatore solo anche sulla sua scheda nella pagina dei telefoni.
- *Costo.* Medio.

**5. Fine partita grande e rivincita dai telefoni.** Risponde al punto 11.
- *Proposta.*
  - Prima della scheda, 3 secondi di «VINCE GIULIA!» a tutta larghezza.
  - Nella scheda i punti del game («4-2») quando la partita è a 1 game.
  - «Rivincita» dai telefoni: a fine partita ciascuno conferma dal suo telefono, e parte il conto di 3 secondi che c'è
    già per il «pronto».
- *Come si attiverebbe.* Niente da accendere: a fine partita sul telefono compare il pulsante «Rivincita». Il computer
  resta com'è per l'addetto: «Gioca ancora» torna alla pagina «Partita», come hai chiesto il 28/10.
- *Costo.* Medio. Conviene farlo con la fine partita della tappa 3.

**6. Il segnale del momento giusto anche nelle due metà, e il richiamo per nome.** Risponde ai punti 5 e 9.
- Il segnale della tappa 2 deve funzionare in tutte e due le metà, per la risposta (palla alta, tardi) e per lo scambio
  (subito dopo il rimbalzo), con una palla di 4–7 pixel.
- Il richiamo «Marco, batti tu» dopo 8–10 secondi.
- *Come si attiverebbe.* Niente da accendere. Solo il lancio automatico dopo 30 secondi sarebbe un'opzione: pannello
  dello stand → riquadro «Lancio automatico»: No · 30 s. Spento di base.
- *Costo.* Piccolo per il richiamo. Il segnale è già nel conto della tappa 2.

**7. Far contare il piazzamento tra due persone.** Risponde al punto 2.
- *Proposta.* Solo nel 1v1 tra persone; la CPU non si tocca.
  - Chi arriva sulla palla di corsa o in allungo rimanda una palla più corta e più lenta, che l'altro può chiudere.
  - Una palla corta e debole si può chiudere con un colpo che l'altro davvero non prende.
  - Un po' di rischio a piena forza quando il tempo non è centrato.
- *Obiettivi.* Almeno 10–15 punti su 100 chiusi da un piazzamento o da un errore provocato. Chi mira vince almeno la
  metà delle volte contro chi non mira. «Sempre forte» non oltre il 55%.
- *Effetto.* Non misurato. Un prototipo più semplice («la palla presa di corsa chiede più precisione») dell'auditor non
  è stato ricontrollato.
- *Come si attiverebbe.* Finché non l'hai provato con persone: pannello dello stand → riquadro «Stesso schermo: campo
  aperto»: No · Sì. Spento di base.
- *Costo.* Da medio a grande. Va fatto d'accordo con il «movimento più naturale» della tappa 3.

**8. Un colpo super per tutti.** Risponde al punto 14.
- *Proposta.* Nel 1v1 il «gesto fortissimo» si misura solo sul proprio colpo abituale (per esempio da 1,35 volte). Le
  altre condizioni restano le tue del 29/10. Chi riceve un super ha meno tempo per colpire, non solo una corsa più
  lenta.
- *Obiettivi.* Almeno un super a partita per chi lo cerca, a ogni età. Un super chiude il punto almeno una volta su tre.
- *Come si attiverebbe.* Niente da accendere: varrebbe sempre nel 1v1 tra persone.
- *Costo.* Medio. Va fatto insieme al «colpo super spiegato» della tappa 2.

**9. Palla e scritte più grandi nelle due metà.** Risponde al punto 13.
- Palla e scia un po' più grandi quando è nella metà lontana, solo nel disegno.
- Scritta dell'esito più grande, in basso al centro della propria metà, sopra il nome. È sul pavimento, non sul campo:
  rispetta la regola di oggi.
- Nelle metà strette e alte, nome e punteggio grandi nello spazio vuoto.
- *Come si attiverebbe.* Niente da accendere. Costo piccolo.

**10. Misurare lo stesso schermo sul PC dell'evento.** Risponde al punto 17.
- Una partita nello stesso schermo con la diagnostica aperta (Maiusc+D) e leggere i fotogrammi al secondo.
- Solo se scende sotto circa 50: un'opzione «Pubblico leggero a schermo diviso» nel pannello dello stand (No · Sì,
  spenta di base).
- Costo: nessuno per la misura.

**11. Il banco dei due umani come controllo fisso.**
- Gli script di questo audit sono nel repository (`natpf-tennis/scripts/audit/b19/`). Dopo ogni gruppo della tappa 2
  conviene rilanciarli: la regola del colpo è la stessa funzione per la CPU e per il 1v1.

**12. La sfida tra due computer, solo se la riapri.**
- Ordine consigliato: D1 (primo passo piccolo, poi il giudizio del gesto), D2, D3 e D4, poi il resto.
- Il «segnale del momento giusto» sul computer del Player 2 direbbe «ora» su una palla in ritardo: va fatto dopo D1,
  oppure spento per lui.

---

## 4. Piano in tappe piccole

Ogni tappa parte solo dopo le tue risposte (§5). Dopo ogni passo: prove simulate prima e dopo con il banco dei due
umani, Player 1 e Player 2 alla pari, `audit:legend` 69/69.

**Tappa A: correzioni piccole che si vedono subito.** Costo piccolo, niente da accendere.
1. Player 2: risposta al servizio e schiacciata come il Player 1, con la prova «a specchio» (punto 1).
2. Istruzioni del servizio che non coprono il tabellone (punto 8).
3. Telefono caduto: QR visibile per tutti e due, nome nei testi, avviso all'altro telefono (punto 10).
4. Scritte: «Palla match Giulia», «1 game · punto decisivo sul 40-40», banner giusto sul colpo a vuoto (punto 18).
5. Richiamo per nome a chi deve battere (punto 9).
6. Se dici sì: «Sorteggio» di base e servizio alternato alla rivincita (miglioramento 3).

**Tappa B: la fila.** Costo da piccolo a medio.
1. «Tempo massimo» (miglioramento 2).
2. «Chi vince resta» (miglioramento 4).
3. Fine partita grande e «Rivincita» dai telefoni (miglioramento 5).
4. Palla e scritte più grandi (miglioramento 9).

**Tappa C: l'equilibrio tra due persone.** Costo medio. Una cosa alla volta.
1. «Vantaggio» di punti, poi «Facile» (miglioramento 1).
2. «Scambio che si scalda» (miglioramento 2).
3. Agitare il telefono, dopo la prova con un telefono vero (punto 7).
4. Colpo super per tutti e forza relativa al proprio colpo (punti 14 e 15).

**Tappa D: insieme alle tappe 2 e 3 del B18.**
1. Segnale del momento giusto nelle due metà (con il passo 6 della tappa 2).
2. Piazzamento che conta, con il movimento della tappa 3 (miglioramento 7).
3. Webcam per due con le stesse regole (punto 16), se la usi agli eventi.

**Tappa E: sfida tra due computer.** Solo se la riapri (miglioramento 12).

**Misure da fare tu, senza codice.**
- Due minuti allo stand con un telefono vero scosso senza guardare lo schermo (punto 7).
- Una partita nello stesso schermo sul PC dell'evento con la diagnostica aperta (miglioramento 10).
- Qualche partita vera nello stesso schermo con la diagnostica: dice quando le persone colpiscono dopo il rimbalzo e
  quanto durano gli scambi (`docs/b18/misure-con-persone.md`).

---

## 5. Decisioni che ti chiedo

Si risponde con sì, no o una lettera. Per ogni opzione nuova è scritto come si attiverebbe.

1. **Tappa A** (correzioni piccole, niente da accendere): parto? Sì / no.
2. **Chi batte per primo nello stesso schermo.**
   - (a) Resta «Player 1».
   - (b) «Sorteggio» di base.
   - (c) «Sorteggio» alla prima partita, poi a ogni rivincita batte l'altro.

   Resta modificabile in «Stesso schermo» → pagina «Partita» → «Altre impostazioni» → «Batte per primo».
3. **Formato in fiera acceso di base solo nello stesso schermo?** Sì / no. Oggi è spento di base per la tua decisione del
   10/11. Se sì, si spegne dallo stesso posto di oggi: menu → Ctrl+Maiusc+K → «Formato in fiera», che avrebbe tre valori:
   No · Solo stesso schermo · Sì.
4. **Punto decisivo del formato in fiera: chi lo batte?**
   - (a) Come oggi: chi non ha iniziato.
   - (b) Sorteggio, scritto nel banner.

   Niente da accendere.
5. **«Tempo massimo».** Sì / no. Se sì: menu → Ctrl+Maiusc+K → «Tempo massimo»: No · 2 min · 3 min. Spento di base.
6. **Aiuto per giocatore.**
   - (a) Solo «Vantaggio» (15-0 o 30-0).
   - (b) Solo «Facile» (più tolleranza sul ritardo).
   - (c) Tutti e due.
   - (d) Niente.

   Si sceglierebbe sulla scheda di ciascun giocatore nella pagina dei telefoni dello stesso schermo; di base «Normale» e
   «No».
7. **«Scambio che si scalda».** Sì / no. Se sì: acceso di base nello stesso schermo; per spegnerlo menu → Ctrl+Maiusc+K →
   «Scambio che si scalda»: Sì · No.
8. **«Chi vince resta»** e **«Rivincita» dai telefoni.** Sì / no per ciascuno. Niente da accendere: pulsanti a fine
   partita, sullo schermo e sul telefono.
9. **Lancio automatico dopo 30 secondi** se chi batte resta fermo. Sì / no. Se sì: menu → Ctrl+Maiusc+K → «Lancio
   automatico»: No · 30 s. Spento di base. Il richiamo per nome è nella tappa A.
10. **Piazzamento che conta tra due persone.** Vuoi che lo prepari e lo misuri? Sì / no. Cambia la regola «il
    personaggio arriva ovunque». Se sì: menu → Ctrl+Maiusc+K → «Stesso schermo: campo aperto»: No · Sì. Spento di base
    finché non l'hai provato.
11. **Forza misurata sul proprio colpo abituale, nel 1v1 tra persone.**
    - (a) Solo per il colpo super.
    - (b) Per il colpo super e per i colpi normali (il colpo normale di un bambino vale quello di un adulto).
    - (c) Resta com'è.

    Tocca la tua decisione del 29/10 sul super: le condizioni restano, cambia come si misura la forza. Niente da
    accendere.
12. **Agitare il telefono.**
    - (a) Prima lo provi tu con un telefono vero, poi si decide.
    - (b) Anticipo ammesso più stretto.
    - (c) Dal secondo gesto il colpo perde qualità.

    Consiglio (a). Niente da accendere in nessun caso.
13. **Preparazione del colpo.**
    - (a) Una riga nel tutorial.
    - (b) Nel 1v1 non conta.
    - (c) Resta com'è.
14. **Barra «Energia» nello stesso schermo.**
    - (a) Resta.
    - (b) Nascosta: tra due persone non conta.
15. **Webcam per due**: la usi agli eventi? Se sì, porto il Player 2 sulle stesse regole del Player 1. Sì / no.
16. **Sfida tra due computer**: confermi che resta ferma? Sì / no. Se la riapri, parto da D1.

Non chiedo una decisione, ma te lo dico: per gli eventi consiglio 1 game ed evitare «al meglio di 5» nello stesso
schermo.

---

## 6. Appendice tecnica

**Base.** Commit `f0e66d3` del ramo `natpf-simulator`, versione 2026-11-10.2. Nessun file del gioco è stato cambiato:
auditor e verificatori hanno lavorato in sola lettura; le regole di prova sono state applicate solo in memoria.

**Cartelle.** Tutte sotto
`/tmp/claude-0/-home-user-foro-italico-world/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b19/`.

| sigla | cartella | cosa c'è |
|---|---|---|
| SA | `stesso-schermo/` | auditor: browser con due telefoni simulati, 78 schermate, circa 6.000 partite simulate |
| SV | `stesso-schermo-verifica/` | verificatore: banco `sim.mjs`, giri nel browser `giro1…5.mjs` |
| DA | `due-computer/` | auditor: due sessioni del browser, ritardi aggiunti, banchi `equita-*.mjs` |
| DV | `due-computer-verifica/` | verificatore: `v-*.mjs` |
| EA | `equilibrio/` | auditor: banco `h2h.mjs`, circa 60 esperimenti (`run-exp.mjs`) |
| EV | `equilibrio-verifica/` | verificatore: banco `vh.mjs`, `mio*.mjs`, `shake*.mjs`, browser `vb2.mjs` |

**Script nel repository.** `natpf-tennis/scripts/audit/b19/` (vedi il suo `README.md`):
- `due-umani.mjs`: il banco dei due umani (è `vh.mjs` di EV con i percorsi relativi);
- `misure.mjs <gruppo>`: `pari`, `debole`, `risposta`, `battitore`, `tattiche`, `tempo`, `rimbalzo`, `durate`, `tutti`;
- `ritardo-p2.mjs`: gesto del Player 2 con ritardo (è `v-colpo.mjs` di DV);
- `agitare.mjs`: telefono scosso (è `shake2.mjs` di EV);
- `due-umani-distanza.mjs` e `partite-distanza.mjs`: il secondo banco (sono `sim.mjs` e `h2h.mjs` di SV);
- `risultati/`: le uscite rifatte per questo rapporto il 10/11.

Si lanciano da `natpf-tennis` con `node --import ./test/register.mjs scripts/audit/b19/<script>`. Le prove nel browser
vogliono `CHROMIUM_PATH=/opt/pw-browsers/chromium`, porte libere e la cartella delle schermate: sono rimaste nelle
cartelle SA, SV, DA, DV, EA, EV.

**Percorsi.** Salvo indicazione diversa i file sono in `natpf-tennis/src/natpf/`. `game_engine.js`, `hud_ui.js` e
`motion_controls.js` sono in `natpf-tennis/src/`. Per il codice sono indicati i nomi delle funzioni: i numeri di riga
cambiano con la tappa 2.

**Precisione.** Con 3.000 punti l'errore statistico è circa ±1 punto percentuale, con 500 partite circa ±2. I tempi
sono di gioco simulato: i robot lanciano il servizio dopo 0,6–1,5 secondi, le persone ci mettono di più. I profili
(bambino, impreciso, umano, amatore, medio, preciso, tennista) sono quelli di `scripts/audit/rally-balance.mjs`: non si
sa quale somigli al visitatore.

**I due banchi.** Danno numeri diversi dove conta il modello del tempo, ed è scritto voce per voce.
- SV (`sim.mjs`) e SA (`h2h.mjs`): il robot fa il gesto quando la palla è a una distanza fissa dal personaggio, come
  `rally-balance`. Scambio interrotto a 80 colpi. Servizio lanciato dopo 1,5 s.
- EV (`vh.mjs`) ed EA (`h2h.mjs`): il robot fa il gesto attorno al momento che il motore considera giusto
  (`natpf_impact.timeToContact`). Scambio interrotto a 150 colpi. Servizio lanciato dopo 0,6 s.
- Nel repository ci sono tutti e due: `due-umani.mjs` (EV) e `due-umani-distanza.mjs` (SV).
- Variante «anticipo delle persone vere» (`~ant`): gesto in anticipo di 0,78 volte il proprio errore di tempo, come
  nelle diagnostiche del 23–29/10.

**Rifatto per questo rapporto** (10/11, dal repository; uscite in `natpf-tennis/scripts/audit/b19/risultati/`). I numeri
dei verificatori si ritrovano, con semi diversi.
- `misure.mjs pari` (450 partite per profilo): punti del P1 49,8% (bambino), 50,0% (medio), 50,5% (amatore); vincenti
  veri 0,2–0,3% dei punti; 6,6–6,8 punti a game, 29–32% ai vantaggi.
- `misure.mjs debole` (360–720 partite per riga): bambino–medio 7,3%, bambino–amatore 2,1%, medio–amatore 29,2%,
  medio–tennista 0%, amatore–tennista 0,2%; ±0,075 contro ±0,09 s 71,1%, ±0,06 s 90,4%; vantaggio 15-0 13,3%, 30-0
  35,0%, 40-0 66,7%; debole Casual e forte Leggenda: bambino–medio 53,6% (18,3% dei punti chiusi dal colpo fallito per
  regola), amatore–tennista 44,4% (38,6%), medio–amatore ribaltato a 78,1%.
- `misure.mjs risposta`: gioco normale del medio, risposte del P2 giocate come schiacciata 114 su 1.955 (5,8%, 66 punti
  persi subito in rete), del P1 0 su 2.029; soli tagliati 84,2% e 81,4% al P2, 0% al P1; punti in risposta persi subito
  54–55% contro 3–6%; nello scambio 0 su 20.281 tagliati.
- `misure.mjs tattiche` (300 partite per riga): non mirare mai 64,7% (medio) e 75,3% (amatore); mira sempre contro non
  mira mai 28,3% e 16,3%; sempre fortissimo 61,3% e 63,0%; solo palle corte 6,0% e 4,3%; solo pallonetti 2,7% e 0,3%.
  Vincenti veri con la corsa più lenta: medi 0,2% a 7,5 m/s, 1,9% a 4,7, 11,9% a 3,5; tennisti 0%, 3,1%, 34,3%.
- `misure.mjs tempo` (600 partite per riga): 70 ms di ritardo 9,0%, 40 ms 21,8%; 40 ms di anticipo 64,0%, 70 ms 63,3%.
- `misure.mjs rimbalzo`: risposta al servizio p50 0,63 s (bambini), 0,57 s (amatori), 0,49 s (tennisti), contatto a
  1,6 m; scambio p50 0,09–0,10 s, contatto a 0,52–0,53 m; entro 0,2 s 61,8%, 72,4%, 78,6%.
- `misure.mjs durate`: 1 game classico bambini 73 / 130 / 222 s, medi 101 / 206 / 316, amatori 137 / 245 / 582,
  tennisti 349 / 664 / 1.203; in fiera medi 95 / 143 / 202, amatori 135 / 213 / 365; al meglio di 3 amatori 375 / 617 /
  1.195.
- `partite-distanza.mjs` (secondo banco): bambini, chi batte vince il 38,3% delle partite su 400 (specchiato: 61,8%
  all'altro); «umano» 98,5% delle partite e 81,1% dei punti, in fiera chi batte per primo 38,5%, punto decisivo nel
  41,5% delle partite e vinto da chi lo batte nell'85,5%; amatori 127 / 237 / 530 s e 14,2 colpi a punto; tennisti 184 /
  315 / 605 s e 23,3 colpi; pausa tra i punti 2,16 s.
- `ritardo-p2.mjs` (300 palle per ritardo): uguale a DV; senza il margine dei 30 ms (`--local=1`) il gesto è in ritardo
  nel 27,7% dei casi già a 30 ms e nel 98,7% a 60 ms.
- `agitare.mjs` (120 partite per riga): 3 volte al secondo 79,2% contro il bambino, 35,0% contro il medio, 11,7% contro
  l'amatore; 2 volte 37,5%, 7,5%, 0%; 4 volte 40,8%, 4,2%, 0,8%.

### A1 · Risposta del Player 2 letta schiacciata (ST-1, EQ-2)
- **Codice.**
  - `game_engine.js`, `_attemptPlayerRallyStrike`: `NO.smashAt(e, ball.pos.y, { serveReturn: rallyStrokeCount <= 1 })`.
  - `game_engine.js`, `_attemptP2RallyStrike`: `NO.smashAt(e, this.ball.pos.y)`, senza `serveReturn`.
  - Stessa funzione, più sotto: `k.y = Math.max(0.78, Math.min(1.92, k.y))` per il Player 2; la schiacciata del
    Player 1 parte fino a 3,1 m.
  - Regola: `natpf_stroke_outcome.js`, `smashAt` e `SMASH_FROM` (gesture 1,5, always 2,3, rise −0,15).
  - Decisione: 31/10, `docs/PROJECT_MEMORY.md` («in risposta al servizio la schiacciata solo se voluta»); tappa 1,
    `docs/b18/r2-motore-piccolo.md` (D7).
- **Misure.**
  - SV `st1.mjs` (300 partite per coppia, formato in fiera): P2 amatore 23 su 865 (2,7%), 18 in rete; P2 tennista 85 su
    864 (9,8%), 30 in rete; P1 0 su 887 e 0 su 903. Formato di base: 50 su 2.007 (40 in rete) e 208 su 2.081 (83 in
    rete). Partenza a 13,5–13,8 m dalla rete.
  - SA `risposta.mjs`, `smash.mjs`, `rete.mjs`: 24 su 857 e 95 su 854; in rete 54 contro 7 su 2.920 punti.
  - SV `st1-telefono.mjs`: colpo 143 → P1 170 tagliati su 170, P2 107 schiacciate su 125 (77 in rete); dritto letto
    «topspin» in leggera discesa → P1 176 su 176, P2 102 schiacciate su 118 (76 in rete). EV `ret143.mjs`: 200 su 200,
    187 in rete.
  - SV `st1-variazione.mjs`: variazione ±0,15 → 10,9% delle risposte del P2 (8,7% in rete); ±0,25 → 17,7% (15%).
  - EV `mio2.mjs lato` (800 partite): con il gesto del tagliato 82–84% «SMASH» al P2, 0% al P1; punti in risposta persi
    subito 53–55% contro 4–5%; vinti 22% contro 48–51%; soli tagliati: P1 61–63% dei punti e 71–74% delle partite.
  - Pallonetti: schiacciate del P2 in rete 121 su 5.819 e 116 su 6.766; del P1 2 su 5.356 e 6 su 6.269.
  - Scambio: 0 su 16.500 e 17.100 (`tagli-scambio.txt`); la palla è sotto 1,5 m, in risposta è a 1,53–1,65 m.
  - Browser: EV `vb2.mjs` (14 punti): 7 risposte del P2 su 8 schiacciate, 5 in rete; schermate
    `shots3/mia-p2-schiacciata-in-rete-corsa1.png`, `tagli-06-fine.png`.
  - Partita normale: medio P1 50,6% dei punti con i colpi speciali, 49,6% senza (incertezza 0,4).
- **Correzione.** `serveReturn` anche per il Player 2; partenza della schiacciata dall'altezza vera. Test «specchio»
  come `natpf-versus-equita.test.mjs`. Obiettivo nel banco: 50% ± 1 anche con soli tagliati.

### A2 · Niente vincenti, mirare perde (ST-2, EQ-3)
- **Codice.**
  - `natpf_impact.js`, `planPlayerIntercept` (reazione 0,12 s) e recupero dopo il colpo.
  - `game_engine.js`, `_applyDifficultyTuning` (1v1: 9,8 m/s per tutti e due), `_stepActorFootwork` (velocità piena
    subito).
  - `natpf_stroke_outcome.js`, `ASSIST['1v1']` (`failQ` 0,34: l'allungo non fa mai sbagliare), `strokeOutcome`.
  - Banner: `natpf_point_call.js`, motivo `'Nice Shot!'` → «Vincente …» anche sul colpo a vuoto dell'altro.
- **Misure.**
  - SV `h2h.mjs` (300 partite per coppia): palla non raggiunta 0–0,6% (amatore), 0% (tennista), 1–3,5% (bambino); tra
    amatori fuori 61%, a vuoto 35–36%, rete 1–3%.
  - EV `mio2.mjs tattiche`, `lato` e `out/log-kinds.txt`: vincenti veri 0–0,4% (0,6% con l'anticipo, 2,3% tra bambini
    che anticipano); colpi in allungo 6 su 55.132; tra due medi fuori per il tempo 54% (79% con l'anticipo), a vuoto 41%
    (10%), mira o forza 3–4%, fallito per regola 1–5%.
  - Tattiche (500 partite per riga, media dei due lati): non mirare mai 65% (medio), 68% (amatore), 92–97% con
    l'anticipo; mira sempre contro non mira mai 26% e 18%; con il polso 27% e 21%; sempre forte 64–65%; solo palle corte
    4–6% (27% dei punti); solo pallonetti 1,2–1,4%; solo tagliati 16–20% (dal P1 23–26%, dal P2 10–14% per A1);
    servizio sempre forte 52–55%.
  - Velocità: SV `velocita.mjs`: amatori 0,6% a 4,5 m/s e 6,2% a 3 m/s; tennisti 3,4% (9,3% contando la distanza) a
    4,5 m/s e 16–35% a 3,5 m/s. EV: medi 1,6% a 4,7 m/s.
  - Browser: EA 70 punti medio contro medio, EV 14 punti: 0 palle irraggiungibili.
- **Non ricontrollato.** Il prototipo «la palla presa di corsa chiede più precisione» (EA `run-exp.mjs`).

### A3 · Durata e scambi (ST-3, EQ-4, MV-5)
- **Codice.**
  - `natpf_stroke_outcome.js`: `RALLY_PRESSURE` (from 16, step 0,015, max 0,45) vale anche nel 1v1, perché
    `rallyPressure` usa 16 quando il livello non ha `pressureFrom` (ce l'ha solo Leggenda: 10); ma con `failQ` 0,34 la
    qualità non scende mai sotto la soglia.
  - `game_engine.js`, `_natpfRacketShot`: palla più veloce solo fino all'8° colpo (−12% del tempo di volo).
  - `natpf_skill.js`, `FATIGUE.maxSlow` (−10%).
  - Formato: `natpf_fair_format.js`; fine partita in `game_engine.js`, `_awardPoint`.
- **Misure**, in secondi (p50 / p90 / massimo).

  | coppia, 1 game classico | SV | EV |
  |---|---|---|
  | bambini | 109 / 198 / 456 | 76 / 132 / 277 |
  | medi | — | 100 / 203 / 346 |
  | amatori | 128 / 237 / 530 | 139 / 251 / 582 |
  | tennisti | 180 / 303 / 605 | 348 / 608 / 1.203 |

  - Formato in fiera, 1 game. SV: amatori 120 / 183 / 257, bambini 105 / 157 / 244, tennisti 156 / 245 / 327. EV:
    bambini 67 / 103 / 168, medi 94 / 143 / 212, amatori 133 / 206 / 365.
  - Al meglio di 3. SV: amatori 339 / 563 / 926. EV: medi 276 / 439 / 777, amatori 392 / 629 / 1.195, tennisti 1.040 /
    1.458 / 1.825. Al meglio di 5 (EV): amatori 628 / 960 / 1.417, tennisti 28–46 minuti.
  - Colpi a punto (media / p90 / massimo). SV: amatore 14 / 30–31, tennista 23 / 50–52 (1,8–1,9% a 80 colpi), bambino 9.
    EV: bambini 7 / 15 / 42, medi 12 / 26 / 63, amatori 17 / 39 / 99, tennisti 52 / 93 / 150 (1% interrotti a 150; 36,9%
    se uno dei due non mira). Con l'anticipo: 10,5, 15, 22 e 72 di media.
  - Browser. SV `giro2.mjs`: primo punto 54 colpi e 75 s. SV `giro3.mjs`: 298 colpi in 6,6 minuti, non finito. EV
    `vb2.mjs` (`out2/browser-tagli-sd09.txt`): un punto di 277 colpi e 428 s; 14 punti in 1.093 s.
  - Profilo «umano» (gesto 0,25 s dopo il rimbalzo). SV `umano.mjs`: 2,1 colpi a punto, partita di 31 s (43 s con la
    fiera). Banco del repository: 5,4 colpi a punto.
  - Prototipo «scambio che si scalda» (EV `mio.mjs formati`, regole di Pro e Leggenda dal 9° colpo): massimo 36 colpi;
    tennisti 168 s (p90 292); medi 83–86 s; bambini 66–70 s; tra tennisti il 72% dei punti finisce con il colpo fallito
    per regola.
- **Nota.** MV-5 diceva «il livello 1v1 non ha la pressione dello scambio lungo». Il codice dice che ce l'ha dal 16°
  colpo, ma non chiude mai il punto. La sostanza resta.

### A4 · Livelli diversi e aiuti (EQ-1, V-EQ-2)
- **Codice.**
  - `game_engine.js`, `_applyDifficultyTuning` e `startSplit`: con lo stesso schermo il livello è sempre `'1v1'`.
  - `natpf_skill.js`, `SKILL_LEVELS['1v1']`; `natpf_stroke_outcome.js`, `ASSIST['1v1']` e `IMPACT['1v1']` (early 0,45,
    lateExtra 1,8), `lateSpanOf`.
  - `natpf_impact.js`, `queueUserSwing`, `lateMargin` e `P2_LATE_MARGIN` (0,03, solo tra due computer).
  - Il livello si legge da `matchConfig.difficulty`: per un aiuto a giocatore va letto per chi colpisce.
- **Misure** (EV `mio.mjs debole`, `mio3.mjs`, 500–800 partite per riga, media dei due lati).
  - Vince il più debole: bambino–medio 7,3% (14,2% con l'anticipo); bambino–amatore 2,4%; medio–amatore 25,6% (25,2%);
    medio–tennista 0% su 800; amatore–tennista 0% su 500. L'auditor dava 8–9%, 2%, 30%.
  - Game a zero: 43% (amatore–bambino), 64–72% (tennista contro gli altri).
  - Solo il tempo: ±0,075 contro ±0,09 s 70,3% su 1.000; ±0,06 contro ±0,09 s 91,3%.
  - Regole per chi deve colpire: debole Casual e forte Leggenda: bambino–medio 49,8%, bambino–amatore 32,3%,
    amatore–tennista 43,8%; debole normale e forte Leggenda: bambino–medio 40,5%, medio–amatore 73,8% (ribaltato). Casual
    o Pro al posto di 1v1: 9,5–12,5%. Colpo fallito per regola: 17–18% dei punti (bambino–medio), 38% (amatore–tennista).
  - Vantaggio di punti (bambino–medio): 15-0 15,6%, 30-0 37,4%, 40-0 65,6%.
  - Il forte che corre a 5 m/s: 7,2%, nessun effetto.
  - Ritardo o anticipo fisso (EV `mio5.mjs`, 600 partite): 40 ms di ritardo 21,8%; 70 ms di ritardo 9,8%; 40 ms di
    anticipo 66,2%; 70 ms di anticipo 65,2%.
  - Tolleranza in più sul ritardo data a uno solo (EV `mio6.mjs` con `reg-lm.mjs`, 800 partite): +30 ms: medio–medio
    dal 44 al 69,5%, bambini dal 52 al 67,5%, medio–amatore dal 28 al 48,5%, bambino–medio dal 6 al 12,5%. Con 60, 90 e
    120 ms: medio–amatore 56, 59, 63%; bambino–medio 15, 18, 18%; amatore–tennista 1–3%.
  - Browser (EV `shots3/tagli-01-telefoni.png`, `tagli-02-partita.png`): solo nome e mano; solo formato, durata, batte
    per primo, visuale.
- **Limite.** L'aiuto è provato solo nel banco, con il debole sempre come P2 per la tolleranza sul ritardo.

### A5 · Il momento giusto (MV-1)
- **Codice.** `natpf_impact.js`, `planPlayerIntercept` (`PLAN.returnTop` 1,72 m per la risposta; `PLAN.apexBack` 13,8 m
  e `PLAN.maxBack` 13,4 m: se il colmo cade più indietro si prende il primo punto a 0,5 m) e `impactWindow`.
- **Misure** (SV `dopo-rimbalzo.mjs`, `dopo-rimbalzo2.mjs`, `colmo.mjs`, `finestra-risposta.mjs`,
  `finestra-scambio.mjs`, `umano.mjs`).
  - Risposta al servizio di una persona: p10 0,52, p50 0,60, p90 0,68 s; contatto a 1,61 m; uguale per P1 e P2 (174
    palle a testa). Servizio della CPU: 0,31–0,35 s.
  - Scambio tra persone: 4.235 palle, p50 0,10 s, contatto a 0,53 m. Entro 0,2 s: 54% (bambini), 67% (amatori), 83%
    (tennisti); contro la CPU 50% a Casual e 76% a Pro.
  - Finestra della risposta: gesto tra 0,35 e 0,65 s dopo il rimbalzo → in campo 94–100%; a 0,25 s → 54–57%; a 0,15 s →
    6%.
  - Browser (SV `giro4.mjs`): contatto della risposta 0,46–0,49 s dopo il rimbalzo a 1,6 m, uguale per P1 e P2.
- **Legame.** È il punto 23 del rapporto B16, descritto lì solo per Pro e Leggenda.

### A6 · Chi batte (MV-2, ST-9, EQ-5)
- **Codice.** `match_format.js` (`SERVE_CHOICES` `['player','opponent','random']`, base `'player'`); `natpf_lobby.js`,
  `setServe` (resta salvato); `natpf_fair_format.js`, `nextServe` (A, B B, A A, B B); `natpf_stroke_outcome.js`,
  `serveOutcome` (il servizio non esce mai: voti «Good serve» 72%, «Power serve» 28%).
- **Misure.**
  - Punto decisivo battuto da chi non ha iniziato: 91 su 91, 107 su 107, 89 su 89 (SV); con il P2 primo lo batte il P1,
    85 su 85.
  - Amatori e tennisti (SV `ruoli.mjs`): chi batte 53% dei punti quando batte il P1, 50% quando batte il P2 (la
    differenza è A1). EV: chi batte vince il game 53–54% (amatori), 56% (medi), 57–59% (tennisti).
  - Profilo «umano». SV: chi batte 81% dei punti; formato di base, P1 98,5% delle partite (200); fiera: chi batte per
    primo 38,5% (200), l'altro 64,5% (altre 200); punto decisivo nel 42% delle partite, vinto da chi lo batte 85–87%.
    EV: chi batte 63–64% dei punti e 80–82% dei game; fiera: chi batte per primo 44%.
  - **Bambini, incerto.** SV `bambini.mjs`: chi batte 44,9% dei punti (2.758), P1 37,5% delle partite su 400 e 40,7%
    su altre 150, risultato specchiato esatto con il P2 a battere; chi ha battuto colpisce dal 5° colpo a 8,3 m dalla
    rete con la palla a 0,93 m, chi ha risposto a 12,2 m con la palla a 1,33 m. EV: chi batte vince il game 48–50%.
  - **Rifatto per questo rapporto** con il banco del repository (`misure.mjs battitore`, 450 partite per riga, batte
    sempre la stessa persona; `risultati/battitore.txt`). Chi batte vince, se batte il P1 e se batte il P2: bambini
    46,9% e 52,7% delle partite (48,5% e 51,0% dei punti); medi 58,9% e 53,8% (53,4% e 51,8%); amatori 55,6% e 53,1%;
    «umano» 82,4% e 83,3% (64,1% e 64,8% dei punti). Tra bambini chi ha battuto colpisce a 10,7 m dalla rete con la palla
    a 0,83 m e chi ha risposto a 11,6 m con la palla a 1,02 m: la differenza di posizione c'è, ma è piccola e non
    sposta il risultato. Con il formato in fiera chi batte per primo vince 52,4% (bambini), 48,4% (medi), 46,9%
    (amatori), 42% («umano»); il punto decisivo capita nel 27–33% delle partite e lo batte sempre chi non ha iniziato.
  - La differenza tra SV ed EV viene dal modello del tempo dei due banchi (vedi «I due banchi»): non si può decidere
    senza persone vere.
- **Correzione al risultato dell'auditor.** ST-9 diceva «tra pari chi batte vince il 48–51%, quindi il servizio non dà
  vantaggio»: vale solo per gli amatori.

### A7 · Agitare il telefono (V-EQ-1)
- **Codice.** `natpf_impact.js`, `queueUserSwing` (ogni gesto fino a 0,45 s prima resta in attesa; tra più gesti vale il
  più vicino al momento giusto); `natpf_stroke_outcome.js`, `IMPACT['1v1']` (early 0,45); `natpf_phone_racket.js`,
  `ballMovingAway`.
- **Misure** (EV `shake2.mjs`, `shake3.mjs`; 120–180 partite per riga, due serie di semi).
  - 3 volte al secondo: contro il bambino 87% (gesto da ±800 °/s) e 73–74% (±500–600); contro il medio 25–35% (40–44%
    dei punti); contro l'amatore 12%.
  - 2 volte al secondo 31–37%; 2,5 volte 20%; 3,5 volte 49%; 4 volte 41%.
  - Voti di chi agita: 70% «Early» o «Very early».
  - Un gesto ogni 0,25 s dato direttamente al motore, senza il rilevatore: 93–94% contro un pari livello
    (`out/logx-spam.txt`).
  - Prova della finestra a 0,30 s (`reg-early.mjs`, solo in memoria): chi agita dall'87 al 34% contro il bambino, dal 33
    al 10% contro il medio; medi 11,1 colpi a punto invece di 11,7; chi anticipa di 70 ms perde il 36% dei punti per
    «troppo presto» (oggi 0,6%); a 0,22 s 83%.

### A8 · Interfaccia dello stesso schermo (ST-4, ST-5, ST-6, ST-7, ST-8, ST-10, ST-11, ST-12, MV-3)
- **Istruzioni del servizio** (ST-4). `natpf_serve_coach.js`; regole `.natpf-serve-coach` in `natpf-ui.css`; tabellone
  in `natpf-round.css`. SV `giro1.mjs`: riga coperta 15% e 13% (1280×720), 16% e 12% (1366×768), 15% e 12% (1920×1080),
  50% e 29% (720×720), nessuna a 1920×540 e 1600×400; riquadro 346×67 contro 320×99 px, e 331×99 contro 180×147 px.
  SA `misure-ui.mjs`: anche 47% e 28% a 1080×1080.
- **Battitore fermo** (ST-8). `natpf_serve_coach.js` (`idleS` 6 s, nessun passo dopo); `natpf_kiosk.js`, `kioskAction`.
  SV `giro2.mjs`: 40 s fermi, schermate `shots/g2-07-fermo-12s.png`, `g2-08-fermo-40s.png`. Sul telefono di chi batte
  l'aiuto c'è («Al servizio · Alza il telefono…»).
- **Telefono caduto** (ST-11, MV-3). `natpf_ui.js`, `_holdAction`, `_paintHold`, `relinkAction`; `natpf_split_ui.js`,
  `_watchP2`; `natpf_phone_watch.js`. SV `giro5.mjs`, `qr.mjs`: QR coperto per il 24% a 1280×720; 0 letture su 12 a
  1920×1080 (lo stesso lettore legge 4 su 4 un QR non coperto); ricarica della pagina 5,5 s; QR nuovo 31,9 s.
- **Fine partita e rivincita** (ST-5). `natpf_ui.js` (ascoltatore di `btn-play-again`), `hud_ui.js`,
  `showVictoryModal`, `natpf_lobby.js`, `setServe`, `site/js/tennis/racchetta.js`. SV `giro2.mjs`: scheda da x 700 a
  1220, titolo 30 px, «GAME 0-1» 15 px; rivincita 2 clic, 4,0 s.
- **«Nuovo giocatore»** (ST-6). `natpf_new_player.js`, `resetVisitor`. SV con i due telefoni collegati: primo servizio
  dopo 58,7 s (prima volta 59,0 s; auditor 57,2 s).
- **Palla e scritte** (ST-7). `natpf_split.js`, `splitCameraPose`; `natpf_shot_feedback.js`, `popupPlace`;
  `natpf_power_hud.js`. SV `giro1.mjs`: anche 1366×768 (11 / 7 / 5 px) e 1600×400 (6 / 4 / 3 px); nome 18,7 / 28,1 /
  14 px; «Energia» 13 / 19,4 / 11 px.
- **Disegno doppio** (ST-10). `natpf_split.js`, `NatpfSplit.render`. SV `giro3.mjs`: 2.956.856 triangoli e 610 chiamate
  di disegno contro 1.506.412 e 378.
- **Scritte** (ST-12). `natpf_point_call.js`, `natpf_scoreboard.js`, `game_engine.js`, `_getHighStakesPointLabel`,
  `natpf_i18n.js`. Banner a 1920×1080: fascia da y 403 a y 526. Il giocatore lontano fermo sulla riga di fondo resta
  sopra la fascia; è coperto quando è dentro il campo.

### A9 · Colpo super, forza, calibrazione, preparazione (EQ-6, EQ-7, V-EQ-3)
- **Super.** `natpf_stroke_outcome.js`, `SUPER.power` 0,86, `SUPER.reach` 0,8, `superStrength`, `superShot`;
  `natpf_skill.js`, `moveFactor`. EV `mio2.mjs super`, `mio4.mjs superlato`: soglia a 380 °/s di colpo tipico 1.045 °/s
  (2,75 volte); a 535 1,95; a 700 1,58; a 790 1,48; a 1.150 1,20. Tirando sempre fortissimo: amatore 0,2%, medio 0,9%,
  preciso 0,6%, tennista 0,5%. Chiude il punto: medio 37 su 148, amatore 9 su 50, preciso 21 su 381, tennista 18 su
  424. Uguale ai due lati (0,7% e 0,7–0,8%). Motivo più frequente: «gesto non abbastanza forte», 60–99,9% dei colpi.
- **Forza e calibrazione.** `natpf_stroke_intent.js`, `strokePower`; `natpf_phone_racket.js`, `createTypicalModel`
  (mediana degli ultimi 24 colpi normali, minimo 3); `natpf_impact.js`, `WEAK.rel` 0,3 e `SOFT.rel` 0,5;
  `natpf_new_player.js`, `resetVisitor`. EV `mio2.mjs calib` (800 partite per riga): 380 contro 790 °/s 39,9% da
  calibrato e 23,4% senza; 1.150 °/s 58,9% e 69,1%; bambino con il colpo tipico di un adulto 29,9% delle partite e 41%
  dei punti, 472 punti su 2.580 persi con il gesto non giocato; contro un medio 2,9% invece di 6,9%; bambino senza
  calibrazione 42,1%. Forza letta: gesto da 380 °/s 0,36 con il proprio colpo tipico, 0,10 con quello di un adulto.
- **Preparazione.** `natpf_skill.js`, `prepQuality` (0,86 senza preparazione). EV `mio4.mjs prep` (1.500 partite per
  riga): 57,5% da P1 e 55,2% da P2; qualità media 0,84 contro 0,73. Nessun testo la spiega in `natpf_tutorial.js`,
  `natpf_i18n.js`, `natpf_onboarding.js`, `natpf_shot_feedback.js` e nella pagina del telefono.

### A10 · Webcam per due (MV-4)
- **Codice.** `game_engine.js`: per il P1 il colpo della racchetta vale per ogni gesto con il tempo misurato
  (`_attemptPlayerRallyStrike`, condizione su `e.natpfTau`); per il P2 solo se arriva dal telefono
  (`_attemptP2RallyStrike`, `natpfSwing = e.natpf.aim === 'swing'`). `motion_controls.js`, `_duoEmit` e `_emitP2Swing`.
  Scelta dichiarata in `natpf-tennis/test/natpf-versus-equita.test.mjs` («C2: senza natpf (webcam, tastiera) il P2 resta
  sul percorso di prima»).
- **Misure** (SV `webcam-duo.mjs`, `webcam-duo2.mjs`, `webcam-duo3.mjs`, 150 partite per prova). Senza mira: P1 74,7%
  delle partite; punti persi dal P1: 309 palle non colpite, 7 fuori, 4 in rete; dal P2: 49, 327, 134. Con mira casuale:
  P1 46%. Con due telefoni: 52,7%.

### A11 · Sfida tra due computer (DU-1…DU-13, V-1…V-6, EQ-8)
- **Decisioni.** 04/11 («niente 1v1 tra due PC né multiplayer agli eventi»); regole del 30/10 in
  `docs/PROJECT_MEMORY.md` (messaggi sotto 16.300 byte, una lettura alla volta, il P2 non mette in pausa da solo,
  scambio interrotto rigiocato, compensazione decisa con le misure).
- **D1** (DU-1, V-1, EQ-8).
  - Codice: `natpf_skill.js`, `eventLatency` e `relayedNatpf`; `natpf_impact.js`, `queueUserSwing`, `P2_LATE_MARGIN`,
    `lateMargin`; `natpf_guest_view.js` (`snapshotAgeMs` usato solo per la diagnostica); `game_engine.js`,
    `_handleRoomStateUpdate` e `_broadcastMultiplayerSnapshot`; `natpf_versus.js`, `VERSUS.matchEvery` 0,045.
  - Browser (DV `v-ritardo.mjs`): +0 ms 53 perfetti e 21 in ritardo su 74; rete locale 11 e 8 su 19; +30 ms 12 in
    ritardo e 4 perfetti; +50 ms 19 su 19; +80 ms 17 su 17; +100 ms 19 in ritardo, 9 molto in ritardo, 3 a vuoto su 31;
    +150 ms 3 molto in ritardo e 5 a vuoto su 8; irregolare 10, 8 e 2 su 20. Rete locale: +20 ms 11 in ritardo e 3
    perfetti; +40 ms 10 su 10.
  - Pagina vera del telefono (DV `v-telefono.mjs`): +0 ms 20 perfetti su 24; +80 ms 0 su 22.
  - Motore senza grafica (DV `v-colpo.mjs`, nel repository `ritardo-p2.mjs`; 300 palle per ritardo): perfetto 100% a 0
    e 20 ms; in ritardo 1% a 30, 23% a 40, 45% a 50, 83% a 60, 100% a 80 e 100 ms (palla 2,1 m più di lato); a 150 ms
    16% molto in ritardo e 3% a vuoto; a 200 ms 22% a vuoto.
  - Partite (DV `v-partita.mjs`, 1.200 punti per riga, amatore): P2 63,0% a 0 ms, 49,2% a 30, 41,8% a 50, 20,2% a 100.
    Senza il margine: 45,3% (amatore), 47,7% (bambino); quel banco consegna il gesto del P2 un passo (8 ms) dopo.
  - EV `mio.mjs versus` (750 partite per riga, medio, tempo centrato): l'host vince 28,4% senza ritardo, 51,2% a 30 ms,
    74,9% a 60, 93,6% a 100. Con l'anticipo: 46,1, 35,3, 39,1, 64,7%.
  - Stima della compensazione (DV `v-colpo-compensa.mjs`): 100% perfetto fino a 150 ms, 88% a 200, 93% irregolare.
- **D2** (DU-2). `game_engine.js`, `_attemptP2RallyStrike` (`showTimingPopup`, `GV.markLocalHit`);
  `natpf_guest_view.js`, `holdBall` (500 ms); `natpf_ui.js`, `feedback`. «In ritardo» sul P2: 5 volte su circa 190
  gesti.
- **D3** (DU-3, V-5). `hud_ui.js`, `btn-play-again` → `game_engine.js`, `onPlayAgain`; `_handleRoomStateUpdate`;
  `natpf_ui.js`, `backToMenu`; `natpf_versus_ui.js`, `leave`, `_tickGuest`, `setReady`. DV `v-fine.mjs`, `v-esplora.mjs`.
- **D4** (DU-4). I 9 secondi sono 4 + 5: `natpf-tennis/scripts/match-relay.mjs`, `p2Online` (`< 4e3`), poi
  `natpf_versus_ui.js`, `tick` (`VERSUS.lostMs` 5.000). `LIVE_MS` di `natpf_p2p.js` non c'entra. DV `v-scollega.mjs`.
- **D5** (DU-5). `natpf_lobby.js`, `joinWithCode`; `natpf_lan.js`, `guestInviteUrl`; `natpf-desktop/src/main.mjs`
  (`startNatpfLan`). DV `v-codice.mjs`.
- **D6** (DU-6). `game_engine.js`, `_handleP2TossInput`; `natpf_serve_coach.js`, `serveCoachStep`. Succede anche senza
  ritardo aggiunto (1 servizio su 1).
- **D7** (DU-7, V-2). `natpf_versus.js`, `p2HoldWhy`; `natpf_ui.js`, `_syncPause`; `natpf_versus_ui.js`, `tick` e
  `_watchAction`. DV `v-esplora2.mjs`: palla del P2 da −2,7 a −15,6 m in 2,4 s di pausa.
- **D8** (DU-8). `motion_controls.js`, `startPhonePolling`; `natpf_p2p.js`, `createRpcClient` e `serveRpc`. Rete locale:
  17,8 aggiornamenti al secondo a +0, 15,1 a +20, 11,4 a +40 ms.
- **D9** (DU-10, DU-11, DU-12, V-6). `natpf_point_call.js`, `rivalOf` (nomi fissi); `natpf_scoreboard.js`, `rowNames`;
  `natpf_versus_ui.js`, `_logClock`; `natpf_versus.js`, `guestBoard`, `guestText`, `p2pStatusText`. Il nome del P2 oggi
  non ha una strada per arrivare: il costo dei nomi è piccolo-medio.
- **D10** (DU-9, DU-13, V-3, V-4). `natpf_versus.js`, `checkpointFor`, `guestState`, `HOLD_NOW`;
  `natpf_phone_watch.js`, `createPhoneWatch`; `game_engine.js`, `_awardPoint` (`voice`) e `callFromBroadcast` in
  `natpf_point_call.js`.

### Risultati smentiti, corretti o non verificabili

**Numeri dell'auditor che il verificatore non ha ritrovato** (nel rapporto ci sono quelli corretti).
- EQ-2 e EQ-9: «tra due tennisti il P1 vince il 52,2% dei punti, 50,4% senza tagliati». Ritrovato: 50,2% su 4.059 punti
  (prima 50,4% su 6.775), 49,2% senza colpi speciali. Per il tennista i punti in risposta persi subito sono il 17%, non
  il 44–56%.
- EQ-6: super tirando sempre fortissimo «preciso 2,8%, tennista 3,1%» → 0,6% e 0,5%; sui colpi normali del tennista
  «0,3%» → 0,04%; «torna indietro 9 volte su 10 per tutti» → chiude una su quattro tra medi, una su venti tra bravi;
  soglia per l'adulto medio «1,67 volte» → 1,48.
- EQ-7: gesto debole senza calibrazione «33%» → 23,4%.
- EQ-1: vantaggio 15-0 «20%» → 15,6%. Formato in fiera «taglia i casi lunghi del 25–35%» → 18–30%.
- EQ-5: il file è `natpf-tennis/src/natpf/match_format.js`, non `src/match_format.js`.
- ST-2: «le palle non raggiunte salgono solo a 3 m/s» vale per gli amatori; tra tennisti salgono già a 4,5 m/s. «Scambi
  lunghi» vale solo per chi colpisce nel momento giusto del motore: i numeri del profilo «umano» erano nei file
  dell'auditor ma non nel suo risultato.
- ST-9: «il servizio non dà vantaggio» vale solo per gli amatori (vedi A6).
- ST-11: «in 128 s la partita non è ripartita» dipendeva dal link vecchio; il ricollegamento vero funziona. Il QR non
  manca sempre: per il P1 si apre ma è coperto.
- DU-1: «+0 ms: 27 su 27 perfetto» non si ripete (53 su 74). DU-2: palla che scatta «0 salti a +0 ms» → 5 salti in 50 s.
- DU-3: quando chi ospita preme «Gioca ancora» dopo l'uscita del P2 la pausa arriva entro 1 s: la partita non fa in
  tempo a partire.
- DU-4: la causa non è `LIVE_MS` ma i 4 s del relay più i 5 s dell'attesa.
- DU-6: succede anche senza ritardo aggiunto.
- DU-10: costo piccolo-medio, non piccolo.

**Incerti: i banchi non concordano.**
- Tra bambini chi batte perde (SV: 37,5–41% delle partite) oppure no (EV: 48–50% dei game): vedi A6.
- Colpi a punto tra due bravi: 23 (SV) o 52 (EV).
- Quanto pesa il servizio per chi colpisce dopo il rimbalzo: chi batte vince il 64% dei punti (EV) o l'81% (SV).

**Non rifatti dal verificatore.**
- Il prototipo «la palla presa di corsa chiede più precisione» (EA).
- `mirror.mjs` (EA): 4 cm di differenza sull'effetto laterale del tagliato tra P1 e P2. Nel banco non sposta i
  risultati.
- «Adulto con il colpo tipico di un bambino»: il primo verificatore dà 64% (ci guadagna); il secondo non l'ha rifatto.
- Chi risponde e resta fermo perde il punto: è la regola del motore, non rigiocata nel browser dal verificatore.

**Non verificabili qui.**
- I fotogrammi al secondo veri: la grafica delle prove è software.
- La voce: sono state registrate le frasi chieste al motore della voce, non ascoltato l'audio.
- La moviola nello stesso schermo: non è mai scattata nelle prove.
- Il punto decisivo sul 40-40 nel browser: non è capitato (lo copre la prova `natpf-formato-fiera`, non rilanciata).

---

## 7. Cosa non è stato provato

- **Persone vere.** Tutti i giocatori sono robot. Non si sa quale profilo somigli al visitatore, quanto è grande il
  divario tra un bambino e un adulto, quante persone colpiscono dopo il rimbalzo, quante rispondono con un colpo piatto,
  quanto durano davvero gli scambi. Nel repository non ci sono diagnostiche di partite vere nello stesso schermo.
- **Telefoni veri.** I telefoni sono simulati: pagina vera con sensori simulati, oppure gesti dati direttamente al
  motore. Il telefono scosso ruota in modo regolare attorno a un asse solo.
- **Il PC Windows dell'evento, il programma installato, il ledwall.** Le aree di ledwall sono provate nel browser alle
  misure 1920×540, 720×720, 1080×1080 e 1600×400. I fotogrammi al secondo non sono misurabili qui.
- **Due computer veri e una rete vera.** I ritardi sono aggiunti ai messaggi del Player 2 su una sola macchina. Il
  codice d'invito tra due programmi Windows è simulato con due server locali.
- **Una webcam vera con due persone.** La partita con una webcam per due non è stata giocata nel browser: i gesti delle
  prove simulate sono costruiti a mano.
- **Le proposte.** Nessuna è stata scritta nel gioco. Vantaggio di punti, tolleranza sul ritardo, regole per giocatore,
  finestra dell'anticipo più stretta e «scambio che si scalda» sono provati solo in memoria nelle prove simulate.
  «Tempo massimo», «Chi vince resta», «Rivincita» dai telefoni, richiamo per nome, piazzamento che conta, super
  relativo, accelerazione visibile dello scambio e seconda strada contro chi agita non sono stati provati affatto.
- **La tappa 2.** Le misure sono sul commit `f0e66d3`, prima della tappa 2. Il suo primo passo (personaggi fermi a ogni
  servizio, servizio che conta contro la CPU) dichiara di non cambiare il servizio nello stesso schermo: non l'ho
  rimisurato.
- **L'audio.** La voce a fine partita e sul computer del Player 2 non è stata ascoltata.
- **I test del progetto.** Questo passo aggiunge solo il rapporto e gli script di misura, che nessun test usa: `npm test`,
  il sito e `audit:legend` non sono stati rilanciati. Gli script nuovi sono stati provati uno per uno dal repository.
