# NATPF Simulator · cosa non va e cosa migliorare nel gioco

> **Nota (integrazione B16, 08/11/2026 sera).** Le misure sono fatte sulla versione **2026-11-08.4**, prima delle
> modifiche B16 (Leggenda più dura, tutorial corto, riscaldamento facoltativo, mira dello staff: versione 2026-11-08.5).
> Un'altra sessione lavora in parallelo al **B17** (`docs/b17/analisi-e-piano.md`); tre punti si sovrappongono e vanno
> fatti d'accordo:
> - difetto 2 «A Leggenda chi gioca perde palle in rete» ↔ **B17.4 «colpi sotto rete»**: tutte e due toccano la stessa
>   regola del colpo fallito (`failQ` di Leggenda → palla `weak` in `natpf_stroke_outcome.js`);
> - difetto 4 «Stesso schermo, fine partita» (banner con «00» e senza «Parità») ↔ **B17.3 punteggio in alto a sinistra**
>   (`natpf_scoreboard.js`);
> - tutorial corto (5 schede, B16) ↔ **B17.2 X per uscire dal tutorial** (la X lavora con qualunque numero di schede).

Audit B16 dell'08/11/2026 sulla versione 2026-11-08.4, prima delle modifiche B16 (a)–(d).

Il gioco è stato guardato da sei lati: scambi e CPU, movimento, servizio, sensazione del colpo, colpi speciali e
rete, partita e modalità. Ogni risultato è stato ricontrollato da un secondo agente, e qui c'è solo quello che il
secondo controllo ha confermato, con la priorità che ha corretto. Le misure vengono dal gioco simulato e dal gioco vero
nel browser con un telefono simulato. Non ci sono prove con persone vere, telefoni veri, il PC Windows dell'evento o il
ledwall.

---

## 1. In tre righe

- **Com'è oggi.** Il gioco funziona: i colpi seguono il gesto e le pause tra i punti sono giuste. Però il punto lo
  decide troppo spesso il caso. A Casual e Pro tra metà e due terzi dei punti finiscono con un errore della CPU. A
  Leggenda chi gioca perde palle in rete per una regola automatica, anche con il gesto perfetto.
- **Cosa pesa di più.** Manca una partita tirata: un adulto vince quasi sempre a Casual e Pro e perde quasi sempre a
  Leggenda, mentre un bambino perde anche a Casual. In fiera, con un game solo, batte sempre la stessa persona.
- **Cosa si vede subito.** Nello stesso schermo, se vince il Player 2, il vincitore legge «Riprova!». Il visitatore dopo
  eredita nome, record e calibrazione. La barra «Stanco!» non si ricarica mai, e «Fuori» non dice perché.

---

## 2. Cosa non va (difetti)

Priorità: **alta** se rovina partite o si vede a ogni punto, poi **media** e **bassa**. Costo: **piccolo** (poche righe
e una prova), **medio** (va ritarato con le prove simulate), **grande** (un comportamento nuovo).

### Priorità alta

**1. A Casual e Pro il punto lo decide il «dado» della CPU.** Costo medio.
- *Cosa vede chi gioca.* La CPU manda in rete o fuori palle normali, anche facili e anche quando è comoda. Chi gioca
  vince senza aver fatto niente. Negli scambi lunghi basta rimandare la palla: l'errore della CPU cresce con la
  lunghezza dello scambio, qualunque palla arrivi.
- *Quanto spesso.*
  - Tra il 51 e il 70% dei punti finisce con un errore della CPU, e in un punto su tre la CPU manda in rete.
  - Sulle palle facili la CPU sbaglia il 7–11% dei colpi.
  - Anche a Leggenda il 93–97% dei punti vinti da un adulto medio viene da un errore «a caso» della CPU.
  - Nel browser, a Casual, chi gioca ha vinto 10 punti su 11 e 11 su 12; la maggior parte venivano da errori della CPU.
- *Proposta.* La CPU sbaglia solo quando è messa in difficoltà: palla veloce, angolata, colpita in corsa. La difficoltà
  del livello passa sulla sua corsa. Obiettivi:
  - CPU in rete al massimo in 1 punto su 8;
  - errori sulle palle facili non oltre il 3%;
  - più vincenti veri di chi gioca.
- *Attenzione.* Togliere solo la parte legata alla lunghezza dello scambio rende Pro molto più difficile: un amatore
  passerebbe dall'81 al 31% dei game vinti. Va tarato insieme al punto 3.

**2. A Leggenda chi gioca perde palle in rete con il gesto giusto.** Costo medio.
- *Cosa vede chi gioca.* Negli scambi lunghi la sua palla va in rete anche con il voto PERFETTO. La scritta dice
  «scambio lungo» o «palla veloce», non il motivo vero, quindi non sa cosa correggere: sembra truccato.
- *Perché.* Sotto una certa qualità il colpo di chi gioca fallisce sempre, senza margine; la CPU invece sbaglia solo con
  una certa probabilità. La qualità poi cala per cose che chi gioca non sceglie: lo scambio lungo, l'allungo e la
  posizione in fondo al campo decisa dal movimento automatico. Le palle alte prese dopo una corsa all'indietro
  falliscono sempre, qualunque gesto si faccia.
- *Quanto spesso.*
  - Tra il 23 e il 43% dei punti finisce con un colpo «fallito» di chi gioca.
  - Nel browser tutti e 9 i colpi falliti avevano il voto PERFETTO.
  - La sola penalità per la posizione causa circa un terzo delle palle in rete.
  - Le palle alte dopo una corsa all'indietro falliscono nel 46–74% dei casi: 14 su 14 con il tempo perfetto.
- *Proposta.*
  - Stessa regola per chi gioca e per la CPU: l'errore arriva con una probabilità, oppure come palla debole e corta
    invece che in rete.
  - Nessuna penalità per il punto in cui ti mette il movimento automatico.
  - La schiacciata dopo una corsa all'indietro deve poter riuscire.
  - La scritta dice il motivo vero.
- *Legame con la decisione (a), «Leggenda più dura».* La versione appena preparata rafforza la CPU, non punisce chi
  gioca. È la strada giusta: adesso si può ammorbidire la regola di chi gioca e prendere la forza dalla CPU, con gli
  stessi criteri di prova.

**3. Nessun livello dà una partita tirata.** Costo medio.
- *Cosa vede chi gioca.* A Casual vince 40-0 in un minuto, senza tensione. A Leggenda perde quasi sempre. Il bambino
  perde anche a Casual.
- *Quanto spesso.* Partite da 1 game:

  | chi gioca | Casual | Pro | Leggenda |
  |---|---|---|---|
  | adulto medio | vince 99–100% (40-0 nel 56–70%) | 82–95% | 1–13% |
  | bambino | 31–48% | circa 1% | circa 0% |

  Con la «Leggenda più dura» appena preparata il salto cresce ancora: un buon giocatore vince circa 8 game su 100,
  prima circa 32.
- *Limite.* Non è misurato quale profilo simulato somigli di più al visitatore vero. La pendenza però resta: a ogni
  livello si passa da quasi tutto a quasi niente tra profili vicini.
- *Proposta.*
  - Un livello «Evento» che si adatta durante la partita. Dentro limiti fissi la CPU corre e sbaglia di più o di meno,
    così chi gioca resta intorno al 55–70% dei punti.
  - Un livello per bambini sotto Casual.

**4. Nello stesso schermo la fine partita parla solo al Player 1.** Costo piccolo.
- *Cosa si vede.*
  - Se vince il Player 2 compare «Riprova!», con il nome «Tu» e un punteggio da sconfitta.
  - La voce dice solo «Game» invece di «Game, set and match».
  - Chi guarda dalla fila non capisce chi ha vinto.
  - A ogni punto il banner con i nomi scrive «00» invece di «0», e a 40-40 non scrive «Parità».
  - Il Player 2 corre il 2% più piano.
- *Quanto spesso.* In ogni partita vinta dal Player 2, cioè circa metà. Il «00» compare a ogni punto.
- *Proposta.*
  - Schermata finale con i nomi («Vince Marco!»).
  - Voce di fine partita per chiunque vinca.
  - «0» e «Parità» nei banner.
  - Stessa velocità per i due giocatori.

**5. Il visitatore dopo eredita nome, record, livello, mano, calibrazione e tutorial già visto.** Costo da piccolo a
medio.
- *Cosa si vede.*
  - Il secondo visitatore legge «Giochi come Marco», gioca e va in classifica con il nome di chi c'era prima, e vede
    record e medaglie non suoi.
  - Gioca con la calibrazione dell'altro. Secondo il calcolo, un bambino dopo un adulto colpisce con circa un terzo
    della forza nei primi colpi, e un adulto dopo un bambino risulta troppo forte per tutta la sessione.
  - Il tutorial, anche quello corto appena fatto, lo vede solo il primo visitatore che usa quel telefono.
- *Quanto spesso.* A ogni cambio di visitatore. Il ritorno automatico al menu è spento di default; anche acceso, scatta
  solo dopo 30–90 s senza input, e con la fila non succede mai.
- *Proposta.*
  - Un pulsante grande «Nuovo giocatore» a fine partita, nel risultato dei minigiochi e nel pannello dell'addetto.
    Azzera nome, tutorial visto, calibrazione e colpi imparati, senza scollegare il telefono.
  - Record per nome e per giorno.
  - Attenzione: accendere di default il ritorno automatico oggi scollegherebbe anche il telefono, e bisognerebbe
    rifare il QR.

**6. La barra «Stanco!» non si ricarica mai.** Costo piccolo.
- *Cosa si vede.*
  - A Pro e Leggenda, dopo pochi scambi lunghi, la barra «Energia» resta su «Stanco!» per tutta la partita e chi gioca
    corre il 10% più piano.
  - Il visitatore dopo parte già «Stanco!».
  - A Leggenda chi gioca, quando è stanco, diventa più lento della CPU, contro la regola del gioco.
- *Quanto spesso.* A Pro la barra segna «Stanco!» per l'87–95% del tempo di gioco, a Leggenda per il 35–94%, a Casual
  quasi mai.
- *Proposta.* Recupero tra un punto e l'altro, come già previsto («si stanchi, ma non troppo»), e azzeramento a ogni
  partita nuova. Sui risultati pesa poco: la correzione serve perché l'informazione sbagliata resta sempre in vista.

**7. In risposta al servizio tagliati e pallonetti diventano schiacciate.** Costo piccolo.
- *Cosa si vede.* Chi risponde con un tagliato o un pallonetto vede partire una schiacciata a circa 180 km/h, con la voce
  «Smash». Va contro la tua decisione del 31/10: in risposta, schiacciata solo se voluta. Il colpo 143 della diagnostica
  del 30/10, che si credeva risolto, oggi dà ancora la schiacciata 60 volte su 60.
- *Quanto spesso.* Con i gesti del tutorial, tagliato e pallonetto in risposta diventano schiacciata il 100% delle volte.
  Per i colpi normali non è misurato: dipende da quanto varia il gesto di una persona vera.
- *Proposta.* In risposta al servizio la palla conta come «alta» solo quando è molto sopra la testa, e un gesto che sale
  non è mai una schiacciata. Più una prova automatica che parte proprio dal colpo 143.

**8. Giocare solo palle corte è la tattica che vince di più.** Costo medio.
- *Cosa si vede.* Chi scopre il «colpetto verso il basso» vince quasi sempre, anche contro la Leggenda. Ne escono scambi
  di sole smorzate, che non sono tennis vero.
- *Perché.*
  - La palla corta non sbaglia mai.
  - Fatta male, cade ancora più vicino alla rete.
  - L'errore della CPU su una palla corta è sempre lo stesso, qualunque sia la palla.
- *Quanto pesa.* Con sole palle corte un buon giocatore a Leggenda passa dal 41–43% al 71–82% dei punti, e un bambino a
  Pro dal 19% al 39–41%. Così la «Leggenda più dura» non serve più. Misurato prima di quella modifica: va rifatto.
- *Proposta.*
  - La palla corta fatta male galleggia o va in rete, e la CPU la attacca.
  - L'errore della CPU dipende da quanto è buona la palla corta.
  - Dopo una palla corta la CPU resta avanti.
  - Obiettivo: giocare solo palle corte non deve dare più di 3 punti su 100 rispetto al colpo normale.

### Priorità media

**9. A Pro mettere la palla lontano dalla CPU non fa punto.** Costo medio, con una parte piccola.
- *Cosa vede chi gioca.* Angolare non porta il vincente: per fare punto l'unico modo è tirare fortissimo. La richiesta
  «campo aperto» a Pro non si sente.
- *Quanto spesso.* Con la palla a 4–6 m dalla CPU i vincenti sono l'1–2%, perché la CPU la riprende nell'83–88% dei casi.
  Solo il profilo che tira a 113 km/h arriva al 41–44%. In più c'è una risposta «difensiva» della CPU in allungo, una
  palla debole e corta da attaccare: esiste nel gioco, ma a Pro non scatta mai per una soglia sbagliata.
- *Proposta.*
  - Correggere la soglia (costo piccolo): la palla larga darà una risposta debole da attaccare.
  - CPU più lenta sulle palle larghe.
  - Obiettivo: almeno 15% di vincenti con la palla a 4–6 m. Da fare insieme al punto 1.

**10. Le scritte non spiegano l'errore, e computer e telefono si contraddicono.** Costo piccolo, da fare tra le prime
cose.
- *Cosa vede chi gioca.*
  - Quando sbaglia per il tempo, cioè quasi sempre, il grande schermo dice solo «Fuori» o «In rete»; un colpo a vuoto
    in ritardo dice «Mancata». Il telefono intanto dice «In anticipo».
  - Peggio: un colpo molto in anticipo o molto in ritardo fa comparire sul telefono, per più di un secondo, «Punto
    avversario» in inglese, mentre lo scambio continua.
- *Quanto spesso.*
  - A Casual circa un punto su cinque finisce con «Fuori» senza il perché (adulto medio).
  - Computer e telefono dicono cose diverse nel 7,5–21% dei colpi.
  - Il falso «Punto avversario» compare nello 0,3–3,6% dei colpi con la palla ancora in gioco, più spesso con i bambini.
- *Proposta.*
  - Scritte come «Fuori · troppo presto» e «In rete · troppo tardi», e «Troppo tardi» anche sul computer.
  - Il telefono dice la stessa cosa del computer.
  - «Punto avversario» solo quando il punto è finito davvero.

**11. Il servizio pesa poco, e tra un punto e l'altro la CPU resta «in corsa».** Costo piccolo più medio.
- *Cosa vede chi gioca.*
  - La CPU risponde quasi sempre al servizio. Colpire al momento giusto o forte cambia poco: un servizio colpito molto
    in ritardo è più corto di soli 19 cm.
  - Gli unici ace di oggi nascono da un difetto. Tra un punto e l'altro i personaggi conservano la velocità del punto
    prima: al servizio la CPU scatta di lato nel verso sbagliato, e durante la pausa le gambe corrono sul posto.
  - La risposta della CPU dipende da com'era l'ultimo colpo del punto prima, non dal servizio.
- *Quanto spesso.*
  - Gli ace sono il 4–7% dei servizi a Casual e Pro, tutti dovuti allo scatto sbagliato. Con la CPU ferma: 0 ace in
    migliaia di servizi.
  - La CPU parte «in corsa» nel 59–75% dei servizi.
  - Il servizio fa punto diretto nel 12–18% dei casi a Casual, ma solo nel 2–8% a Pro e Leggenda.
- *Proposta.* Fermare i personaggi a ogni servizio (una riga). Insieme, dare peso al servizio per livello: forza, angolo
  e tempo rendono più difficile la risposta. Obiettivo per un servizio perfetto, forte e stretto: punto diretto nel
  20–25% dei casi a Casual, nel 10–15% a Pro e intorno al 5% a Leggenda. Le due cose vanno fatte insieme, altrimenti gli
  ace spariscono del tutto.

**12. Il servizio insegnato dà sempre un tagliato, e più forte diventa più lento.** Costo piccolo.
- *Cosa vede chi gioca.* Chi imita il tutorial batte sempre lo stesso tagliato lento e legge «Buono». Se prova a colpire
  più forte con la presa insegnata, il servizio diventa un kick più lento del 20%. «Gran servizio» quasi non arriva.
- *Quanto spesso.* A ogni servizio. Nella partita simulata «Gran servizio» è uscito 25 volte su 296.
- *Proposta.*
  - Il tipo di servizio si giudica rispetto al proprio servizio abituale.
  - Un gesto più forte non dà mai una palla più lenta.
  - «Gran servizio» si misura sulla propria forza di servizio.

**13. Un tagliato appena più lento diventa una palla corta.** Costo piccolo.
- *Cosa vede chi gioca.* Un tagliato un po' morbido «muore» dopo la rete: cade a 2 m invece che a 8 m. Il colpo non
  segue il gesto.
- *Quanto spesso.* Con la variazione di velocità di una persona vera, il 31–43% dei tagliati.
- *Proposta.* Palla corta solo con un gesto nettamente morbido e verticale, come nella scheda del tutorial. Tra i due,
  il colpo resta un tagliato più corto.

**14. Precision e Combo chiedono colpi mai provati.** Costo piccolo.
- *Cosa vede chi gioca.*
  - Nella Combo tre visitatori su quattro incontrano subito un colpo speciale che non conoscono.
  - Dopo un errore ricomincia la stessa catena: chi non sa fare il primo colpo resta a zero per tutti i 90 secondi. Il
    primo colpo è uno speciale nel 43% delle sfide.
  - In Precision due zone su dieci danno sempre zero senza la palla corta, quindi l'oro è irraggiungibile.
- *Proposta.*
  - Le prime catene solo con dritto e rovescio.
  - Colpi speciali solo se già imparati, con la scheda animata accanto.
  - Dopo due errori il passo cambia.
  - In Precision zone corte raggiungibili con un dritto morbido, e soglie delle medaglie ricalcolate.

**15. Il doppio (2v2) è un altro gioco.** Costo medio.
- *Cosa vede chi gioca.*
  - Il compagno CPU non colpisce da solo, ma solo con il tuo gesto, e prima della partita nessuno lo dice. Se non fai
    il gesto sulla palla che va a lui perdi il punto; giocando così i punti vinti scendono da circa 8–9 su 10 a circa 4.
  - Nel 2v2 il colpo del telefono usa le regole vecchie: un po' di caso, errori casuali, niente colpo super.
  - Il personaggio si mette con la palla quasi addosso.
  - Quasi nessun vincente: si vince sugli errori delle CPU. I vincenti sono il 2% dei punti vinti, contro il 9–25% nel
    singolo.
- *Nota.* Il 2v2 non è tra le modalità scelte per gli eventi: per questo la priorità è media.
- *Proposta.* Prima scegliere tra un compagno che gioca da solo le palle sue e una riga che lo spiega, con un anello
  sotto il compagno quando la palla va a lui. Poi dare al 2v2 lo stesso colpo e lo stesso posizionamento del singolo.

**16. Il ritardo della connessione non viene tolto quando si giudica «palla passata».** Costo piccolo. Diventa alta se si
imposta il ritardo del ledwall.
- *Cosa vede chi gioca.* Oggi, in rete locale, quasi niente: meno dell'1% dei colpi. In un colpo su quattro, però, la
  palla parte da un po' dietro il personaggio. Ma se lo staff imposta il ritardo dello schermo (già possibile nella
  diagnostica), o se la connessione è lenta, a Leggenda un colpo PERFETTO su una palla veloce diventa «Troppo tardi».
- *Proposta.* Giudicare con la posizione che la palla aveva al momento del gesto. Va fatto prima di misurare o impostare
  il ritardo del ledwall.

### Priorità bassa (in breve)

17. **Servizio della CPU.** È sempre uguale e corto. La telecamera trema come per un colpo eccezionale, e la velocità
    sul tabellone è inventata (194 km/h fissi). Oggi in fiera la CPU non serve mai: diventa media se si cambia il formato
    (miglioramento 1). Costo da piccolo a medio.
18. **Rating finto a fine partita.** Segna sempre 1145 se vinci e 1020 se perdi, con un grafico fisso. Toglierlo costa
    poco (vedi miglioramento 5).
19. **Pallonetto e palla corta partono 65 millesimi dopo gli altri colpi.** Si sentono un po' «staccati». Costo piccolo.
20. **«Troppo presto» arriva da mezzo secondo a un secondo dopo il gesto.** Nel frattempo la scritta dice «aspetta la
    palla». Costo piccolo.
21. **La racchetta del personaggio non tocca mai la palla.** La manca di circa 40 cm. È solo visivo. Costo medio.
22. **A rete contro la Leggenda.** Una schiacciata riuscita torna indietro una volta su due. Andare a rete paga troppo,
    perché la Leggenda quasi non fa passanti né pallonetti. Le volée escono di lato circa 1,5 volte più spesso dei colpi
    da fondo. Oggi capita di rado; conterà quando ci sarà più gioco a rete (miglioramento 6).
23. **A Pro e Leggenda il personaggio prende la palla all'altezza delle ginocchia, appena dopo il rimbalzo.** Da
    confermare con persone vere prima di toccarlo.
24. **Lato del gesto e posizione del personaggio non sempre coincidono.** Ne esce un rovescio con la palla dall'altra
    parte del corpo, che non può diventare super. Con persone vere la frequenza non è misurata. Conviene correggere solo
    l'animazione. Costo piccolo.
25. **La soglia del tagliato è uguale per tutti.** Se il gesto di una persona varia molto, un colpo normale ogni 15–20
    può diventare tagliato o palla corta. Prima va misurato (tappa 1).

---

## 3. Cosa migliorare (in ordine di valore per l'evento)

**1. Formato della partita in fiera. Serve una tua decisione.**
- *Oggi.* In un game batte sempre la stessa persona. Contro la CPU chi gioca non risponde mai al servizio, e nello
  stesso schermo il Player 2 non batte mai.
- *Quanto pesa.* Chi batte cambia molto il risultato: un bambino vince il 43–48% se batte lui e il 23–25% se batte la
  CPU. Un game su tre va ai vantaggi, e qualche volta dura 4–7 minuti.
- *Perché chiedo a te.* Un solo battitore per game è la regola vera del tennis.
- *Proposta.* Punto decisivo sul 40-40 e servizio che passa come nel tie-break: il primo punto lo batte uno, poi due
  punti a testa.
- *Effetto misurato.*
  - Nove partite su dieci finiscono entro 1,6–2,4 minuti, invece di 2,2–3,4.
  - La più lunga resta sotto i 3 minuti circa, invece di 4–10.
  - Battono tutti e due.
  - I bambini vincono un po' meno, perché ora serve anche la CPU: va abbinato al livello per bambini.
- *Costo.* Piccolo per la regola. In più servono una frase nuova della voce inglese, la scritta sul tabellone e un
  controllo della sfida tra due computer. «Al meglio di 5», che può durare 8–13 minuti, andrebbe tolto o sostituito da un
  tie-break.

**2. Istruzioni del primo servizio sul grande schermo.**
- *Oggi.* Lo schermo dice solo «Al servizio». L'istruzione è sul telefono, che in fiera nessuno guarda. Se chi gioca
  lancia e non colpisce, la palla ricade senza un messaggio, e il gioco aspetta per sempre.
- *Proposta.* Prima «Alza il telefono: lanci la palla». Poi «Colpisci!» vicino al punto più alto. Dopo un lancio a vuoto,
  «Colpisci quando la palla è in alto».
- *Costo.* Piccolo.

**3. Un segnale del momento giusto per colpire.**
- *Oggi.* Il voto più frequente è «Anticipo»: 50–68% dei colpi in un profilo realistico, mentre «Perfetto» è al 21–44%.
- *Proposta.* Il voto resta com'è, perché è una decisione già presa. Si aggiunge un segnale ben visibile anche sul
  ledwall, per esempio la palla o la sua ombra che si illumina quando è il momento.
- *Misura.* La quota di «Perfetto» prima e dopo.
- *Costo.* Piccolo.

**4. Spiegare il colpo super.**
- *Oggi.* La barra dice «Fortissimo» molto più spesso di quanto il super scatti: il super arriva in 5–32 casi su 100, meno
  ai livelli alti. Il motivo non si vede, quindi sembra casuale.
- *Proposta.* Le regole del super restano le tue. Sotto la barra compare il motivo in una parola («palla bassa», «fuori
  tempo», «in corsa», «lato sbagliato»). Quando la palla in arrivo è da super, la circonda un alone.
- *Perché conta.* Il super è uno dei momenti più divertenti per il pubblico.
- *Costo.* Piccolo.

**5. Fine partita con dati veri e una classifica delle partite.**
- *Oggi.* Le partite contro la CPU non lasciano traccia.
- *Proposta.*
  - Al posto del rating finto: punti vinti, scambio più lungo, colpo più veloce, ace e vincenti.
  - Il passo successivo, per esempio «Ora prova Pro».
  - Una classifica del giorno anche per le partite, da mostrare sul ledwall (per esempio «punti contro la Leggenda» e
    «scambio più lungo»).
- *Costo.* Medio.

**6. Più gioco a rete: volée, schiacciate, pallonetti utili.**
- *Oggi.* La CPU resta sempre in fondo, gioca quasi solo in top spin, non fa mai palle corte e non schiaccia mai. Chi
  gioca va a rete solo se una palla corta lo costringe.
- *Risultato.* Schiacciate e volée sono meno dell'1% dei colpi: in una partita breve, circa 0,2 schiacciate. Il
  pallonetto insegnato non vince mai punti (0–1% di vincenti), e il tagliato non cambia niente.
- *Proposta.*
  - Chi gioca sale a rete dopo un attacco riuscito, con un tetto del 10–15% dei colpi, per non tornare al vecchio
    «sempre a rete».
  - La CPU ogni tanto sale a rete, fa qualche rara palla corta e schiaccia i pallonetti corti.
  - Il tagliato basso mette in difficoltà la CPU.
  - Obiettivo: almeno una schiacciata o volée per game a Casual.
- *Prima vanno sistemati* i difetti 2 e 8 e quelli della rete (punto 22).
- *Costo.* Grande.

**7. Movimento più naturale.**
- *Oggi.* Il personaggio parte a velocità piena, si ferma di colpo e poi aspetta fermo quasi un secondo: non colpisce
  mai in corsa.
- *Proposta.*
  - Accelerazione e frenata come la CPU, e arrivo giusto in tempo.
  - Dopo il colpo, il personaggio torna verso il punto giusto del campo.
- *Attenzione.* Una velocità più bassa rende la Leggenda più difficile per l'adulto medio (dal 30 al 23% dei punti) e
  va contro la regola «la CPU di Leggenda è più lenta di chi gioca». Va ritarato.
- *Costo.* Da medio a grande.

**8. Una Leggenda più da campione.**
- *Oggi.* Nelle simulazioni la Leggenda gioca una smorzata ogni 5–9 colpi, e un terzo dei suoi colpi è tagliato o
  smorzato. Il livello più forte sembra il più morbido.
- *Proposta.* Al massimo una smorzata ogni 8 colpi: non le toglie forza.
- *Nota.* Misurato prima della «Leggenda più dura»: va ricontrollato.
- *Costo.* Piccolo.

**9. Misurare il ritardo del ledwall in fiera.**
- *Oggi.* Si può fare solo a mano, dalla diagnostica.
- *Proposta.* Una prova di 20 secondi per lo staff: chi tiene il telefono colpisce a ritmo una palla che rimbalza.
- *Condizioni.*
  - Solo dopo il difetto 16, altrimenti il gioco peggiora.
  - La prova deve togliere l'abitudine di chi gioca ad anticipare.
  - Il ritardo vero del ledwall non è ancora misurato.
- *Costo.* Medio.

**10. Un servizio con delle scelte.**
- *Oggi.* Direzione ed effetto del servizio dipendono da quanto è obliquo il gesto, non da una scelta, e il tutorial non
  ne parla.
- *Proposta.*
  - Una regola semplice, per esempio: prima del punto più alto la palla va verso il centro, dopo verso l'esterno.
  - Una riga nella scheda del servizio.
  - Un servizio della CPU vario e, a Casual, non più veloce di quello di chi gioca.
- *Costo.* Medio.

**11. Piccole finezze da provare con persone vere.**
- La racchetta che tocca davvero la palla.
- Con un gesto in anticipo, il personaggio parte subito in avanti invece di caricare all'indietro.
- Una breve vibrazione «letto» al momento del gesto.

---

## 4. Piano in tre tappe

**Tappa 1: correzioni piccole che si vedono di più.** Tutte a costo piccolo.
1. Stesso schermo: fine partita con i nomi, voce per chi vince, «0» e «Parità», stessa velocità (difetto 4).
2. «Nuovo giocatore»: azzera nome, tutorial, calibrazione e colpi imparati senza scollegare il telefono; record per
   giorno (difetto 5).
3. Stanchezza che si ricarica tra i punti e riparte da zero a ogni partita (difetto 6).
4. Niente schiacciate non volute in risposta, con la prova del colpo 143 (difetto 7).
5. Scritte che spiegano l'errore, telefono coerente con il computer, niente falso «Punto avversario» (difetto 10).
6. Il tagliato non diventa più palla corta; un servizio più forte è più veloce (difetti 12 e 13).
7. Istruzioni del primo servizio sul grande schermo (miglioramento 2).
8. Precision e Combo adatte a chi arriva per la prima volta (difetto 14).
9. Ritardo della connessione tolto dal giudizio «palla passata» (difetto 16). Risposta difensiva della CPU a Pro, che
   oggi non scatta mai (parte del difetto 9).
10. Togliere il rating finto (punto 18).
11. Se decidi per il formato evento: punto decisivo e servizio alternato (miglioramento 1).
12. Due misure dalla diagnostica, con persone vere, che servono per decidere dopo:
    - quanto varia il gesto da un colpo all'altro: decide la soglia del tagliato e il rischio di schiacciate non volute;
    - quando le persone colpiscono dopo il rimbalzo.

**Tappa 2: equilibrio del gioco.** Costo medio. Una cosa alla volta, con le prove simulate prima e dopo.
1. Per primi: personaggi fermi a ogni servizio (oggi questo difetto falsa anche le misure) e un servizio che conta
   (difetto 11).
2. CPU che sbaglia per la pressione e non a caso; a Pro il campo aperto fa punto (difetti 1 e 9).
3. Leggenda: stessa regola per chi gioca e per la CPU, nessuna penalità per la posizione automatica, schiacciata
   possibile. La forza viene dalla CPU, partendo dalla «Leggenda più dura» (difetto 2).
4. Palla corta che può sbagliare (difetto 8).
5. Livello «Evento» adattivo e livello per bambini (difetto 3).
6. Segnale del momento giusto e colpo super spiegato (miglioramenti 3 e 4).

Obiettivi da controllare alla fine della tappa:
- CPU in rete al massimo in 1 punto su 8;
- a Leggenda «in rete per scambio lungo» al massimo in 1 punto su 10;
- giocare solo palle corte non dà più di 3 punti su 100 rispetto al colpo normale;
- l'adulto medio intorno al 60–70% dei punti al livello Evento.

**Tappa 3: più tennis vero.** Costo da medio a grande.
1. Gioco a rete per tutti e due; la CPU schiaccia e fa qualche rara palla corta; il tagliato diventa utile
   (miglioramento 6). Insieme vanno corretti i difetti della rete (punto 22).
2. Movimento con accelerazione e colpi in corsa (miglioramento 7).
3. Fine partita con dati veri e classifica delle partite (miglioramento 5).
4. 2v2 con lo stesso colpo e lo stesso posizionamento del singolo, e un compagno spiegato o autonomo (difetto 15).
5. Prova del ritardo del ledwall, servizio con scelte, servizio della CPU vario, Leggenda più da campione (miglioramenti
   9, 10 e 8; punto 17).

Tutto questo è misurato con il gioco simulato o con il gioco vero nel browser e un telefono simulato. Niente è provato
con persone vere, telefoni veri, il PC Windows dell'evento o il ledwall.

---

## 5. Appendice tecnica

**Base.** Worktree `wt-audit` a `7936011`, versione 2026-11-08.4, prima dei rami B16 (a) `b16-legend`, (b)/(c)
`b16-flow` e (d) `b16-mira`.

**Cartelle.** Tutte sotto
`/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b16/`. Nelle voci qui sotto
si usano queste sigle:

| sigla | cartella |
|---|---|
| AS | `audit-scambi/` |
| VS | `verify-audit-scambi/` |
| AM | `audit-movimento/` |
| VM | `verify-audit-movimento/` |
| ASE | `audit-servizio/` |
| VSE | `verify-audit-servizio/` |
| AC | `audit-sensazione/` |
| VC | `verify-audit-sensazione/` |
| AP | `audit-speciali/` |
| VP | `verify-audit-speciali/` |
| AR | `audit-partita/` |
| VR | `verify-audit-partita/` |

**Esecuzione.** Gli script senza grafica si lanciano da `wt-audit/natpf-tennis` con
`node --import ./test/register.mjs <script>`. Gli script del browser vogliono `CHROMIUM_PATH=/opt/pw-browsers/chromium`,
`GAME_PORT`/`PEER_PORT` liberi e `OUT` nella cartella dell'audit.

**Percorsi.** Salvo indicazione diversa, i file sono in `natpf-tennis/src/natpf/`. Fanno eccezione `game_engine.js`,
`hud_ui.js`, `match_format.js`, `player_body_animation.js` e `racket_kinematics.js`, che stanno nelle cartelle del motore
e dell'interfaccia di `natpf-tennis/src/`.

**Precisione.** Con 300 punti × 3 semi l'errore statistico è di circa ±3 punti percentuali. Le misure di tempo sono
indicative: la macchina aveva 4 CPU condivise. I profili (umano, amatore, tennista, preciso, bambino, impreciso, medio)
sono simulati, e non si sa quale rappresenti il visitatore.

### D1 · Errori «a dado» della CPU (scambi F1 + mancati 1 e 5)
- **Codice.**
  - `natpf_skill.js:406`: termine `k.rally*max(0, rally-4)`; rally vale 0,014 a Casual (`:36`) e 0,012 a Pro (`:46`).
  - `natpf_skill.js:434`: il 42% degli errori è in rete.
  - `game_engine.js:2531`: bersaglio della palla in rete a 3,2–5,6 m.
  - Leggenda: `natpf_legend.js:223-227` (`playerErrorPlan`), che contraddice `docs/NATPF_LEGGENDA.md:16` («niente
    probabilità d'errore a dado»).
  - L'intenzione contraria è scritta in `docs/NATPF_SIMULATOR_AUDIT.md:72-74` e `:109` e nel commento di
    `natpf_skill.js:44-45`. `GAMEPLAY_PROPOSAL.md` è superata.
- **Misure dell'auditor** (AS `scambi.mjs`, 300 punti × 3 semi; `scambi-base.txt`, `analisi-base.txt`).
  - Punti chiusi da un errore della CPU: casual/umano 66,5% (in rete 34,7%), pro/umano 65,7%, pro/medio 51,4%.
  - Errore della CPU per colpo: 16–18% a casual, 10–11% a pro.
  - Per numero del colpo (casual/umano): 12% ai colpi 1–6, 32% dal 17° in poi.
- **Misure del verificatore** (VS `verify.mjs`, semi 5/13/31; `verify-base.txt`, `an1.txt`).
  - Casual/umano 70,0%, pro/umano 70,2%.
  - Palle innocue: 9,3–11% di errori a casual, 7,0–8,9% a pro.
  - `rally-balance --cpu`, palla a meno di 2 m dalla CPU: 12,3–12,8% di errori a casual.
- **Leggenda** (VS `an3.txt`). Il 93–97% dei punti vinti da umano, amatore e medio viene da errori della CPU: per umano,
  189 su 194 vengono da `playerErrorPlan` (110 lunghi, 68 larghi, 11 in rete).
- **Browser.**
  - AS `browser/partita-casual.txt`: 10 punti vinti su 11, di cui 9 per errori della CPU.
  - VS `browser/casual.txt`, robot con il tempo centrato: 11 su 12, di cui 7 per errori della CPU e 4 vincenti.
- **Esperimenti** (sulla copia `exp/`).
  - E1 (rally a 0): pro/umano dal 76,3 al 55,8% dei punti. Game a Pro: umano dal 94,5 al 64,4%, amatore dall'80,9 al
    31,0%, medio dall'86,7 al 63,6% (sotto il criterio di `legend.mjs`, 70–85%). File VS `exp-E1-norally.txt`.
  - E1b (casual con errore di base 0,012, rally 0, CPU a 4,2 m/s): vincenti di chi gioca dal 21,7 al 37,6%, errori della
    CPU dal 66,5 al 47,0%. File AS `exp-E1b.txt`.
- **Criteri.**
  - CPU in rete al massimo nel 12% dei punti.
  - Errori sulle palle innocue al massimo il 3%.
  - Vincenti almeno il 35% dei punti vinti a casual.
  - `legend.mjs`: Pro contro medio nel 70–85% dei game.

### D2 · Leggenda, colpi falliti di chi gioca (scambi F2 + mancato 2, movimento MOV-2, speciali M1)
- **Codice.**
  - `natpf_stroke_outcome.js:122`: `ASSIST.leggenda`, con failQ 0,63 e pressureFrom 10.
  - `:151-152`: dal 10° colpo la qualità cala dell'1,5% a colpo.
  - `:228-232`: gradino a failQ. Il commento dice che senza questa regola la Leggenda vinceva il 43% dei game contro
    preciso.
  - `natpf_impact.js:50` e `:219`: `stretchQuality = 1 − 0,4·allungo`, con l'allungo deciso dal piano automatico.
  - `natpf_impact.js:54-59`: maxBack 13,4, apexBack 13,8, deepBack 14,3.
  - `game_engine.js:2208`: `pace` fino a −15% tra 12,2 e 13,4 m.
  - Causa mostrata: `game_engine.js:2225`, letta da `natpf_shot_feedback.js:46` (`shotWhy`).
  - CPU: `natpf_legend.js:158` (pressione), `:224` (`playerErrorPlan`), `:129` (`cpuRisk`).
- **Misure dell'auditor** (AS `analisi4.txt`). Punti chiusi da un colpo fallito: umano 42,9%, amatore 35,6%, tennista
  38,9%.
- **Misure del verificatore** (VS `an1.txt`).

  | profilo | colpo fallito | di cui «scambio lungo» |
  |---|---|---|
  | umano | 39,3% | 24,3% |
  | amatore | 35,4% | 13,2% |
  | medio | 23,2% | 15,5% |
  | tennista | 37,3% | 28,1% |
  | preciso | 33,0% | 32,4% |

  Falliti con il voto PERFETTO: 3,6–5,8% dei punti; per preciso il 18,7%.
- **Browser** (VS `browser-mio.mjs`, `browser/leggenda.txt`). Chi gioca vince 1 punto su 9. I 9 colpi falliti sono tutti
  PERFETTO: 7 «in allungo» (qualità 0,536–0,619) e 2 «scambio lungo» (0,618–0,626). Il robot dell'auditor
  (`browser-partita.mjs`) estraeva l'anticipo a ogni giro e colpiva in anticipo: usare `browser-mio.mjs`.
- **Profondità** (AM `depth-cf.mjs`, 10 semi; `depth-cf-10semi.txt`, rifatto uguale dal verificatore).
  - Palle in rete dal 28,5–34,6% al 18,3–23,9% dei punti.
  - Punti vinti: umano dal 30 al 36,9%, tennista dal 43 al 52,4%, preciso dal 58,9 al 73,1%.
  - Per fasce (VM `zbands.mjs`): falliti 0–1,8% tra 9 e 12,2 m, 9,6–12,3% tra 12,8 e 13,4 m, 15–25% oltre 13,4 m.
  - Origine: la penalità arriva con `2f2a77d` (22/10), quando l'arretramento massimo era 13,4 m; apexBack e deepBack
    arrivano dopo (`e0f9bfb`, 29/10). È un'incoerenza tecnica, non una decisione dell'utente.
  - La webcam (percorso argon, `game_engine.js:1444`) non paga la penalità: è una decisione dell'utente del 29/10, da
    non toccare.
- **Sopra la testa** (VP `v-smashfail.mjs`, `v-smashfail2.mjs`).
  - Piani 'smash' falliti: 26 su 35 (amatore), 38 su 82 (tennista), 27 su 45 (umano).
  - Con PERFETTO e allungo ≥ 0,9: 14 falliti su 14. L'allungo mediano è 0,94–0,96, quindi la qualità arriva al massimo a
    0,62–0,64.
  - La regola di `8fe6f27` (a rete col tempo perfetto la palla è debole, non fallita) non copre questi colpi.
- **Esperimento E2** (pressione dal 16° colpo solo per chi gioca; VS `exp-E2a-player16.txt`). Game vinti: tennista dal
  41,4 al 55,6%, preciso dal 73,3 al 94,3%. I falliti per pressione restano il 14–20% dei punti.
- **Ramo (a)** (`b16-legend`, `5ffa530`). Accelerazione 20/28, pressione della CPU dal 20° colpo, chiusura misurata,
  `powerErr` 0,65. Non tocca la failQ di chi gioca. `audit:legend` dopo il ramo, game vinti dalla CPU: medio 97,7%,
  tennista 92,4%, preciso 70,8% (`notes-legend.md`). Togliere il gradino abbassa la forza: rifare `audit:legend`.
- **Correzioni.**
  - Sotto failQ il colpo fallisce con una probabilità (come `playerErrorChance`) oppure diventa una palla debole.
  - In `pace`, niente termine di profondità entro deepBack (o farlo partire da 14,3 m).
  - Sui piani 'smash', tetto all'allungo, oppure fallimento «debole» con PERFETTO o GOOD.
  - `shotWhy` mostra la causa vera.
- **Criteri.**
  - «G in rete per scambio lungo» al massimo nel 10% dei punti.
  - Colpi sopra la testa con tempo buono falliti al massimo nel 15% dei casi.
  - `audit:legend` dentro i criteri.

### D3 · Curva di difficoltà (scambi F3, partita P7)
- **Game vinti** (VS `verify-base.txt`; casual / pro / leggenda).

  | profilo | casual | pro | leggenda |
  |---|---|---|---|
  | umano | 100% | 94,5% | 10,5% |
  | amatore | 98,3% | 80,9% | 2,1% |
  | medio | 100% | 86,7% | 12,6% |
  | tennista | 100% | 100% | 41,4% |
  | preciso | 100% | 100% | 73,3% |
  | bambino | 39,8% | 1,1% | 0,5% |
  | impreciso | 63,8% | 3,5% | 0% |

  - L'auditor (AS `scambi-base.txt`) dà umano 99,5 / 92,1 / 6,5 e bambino 31,3 / 1,1 / 0,5.
  - Game vinti a zero a casual: umano 63,5–70,2%, amatore 51,7–55,7%.
  - Bambino a casual: il 38% dei punti è perso per palla non presa (AS `bambino-casual.txt`).
- **Partita da 1 game** (AR `match-sim.mjs` → `match-sim-player.txt` e `match-sim-opp.txt`; VR `v-game1.txt`).
  - Casual/bambino: 42,7–48,2% se batte lui, 23,3–24,6% se batte la CPU.
  - Leggenda/umano: 7–13%.
- **Salto tra Pro e Leggenda.**
  - Per chi gioca: `natpf_stroke_outcome.js:121-122` (failQ da 0,3 a 0,63, pressione dal 16° al 10° colpo).
  - Per la CPU: `natpf_skill.js:42` e `:58` (da 5,3 a 8,0 m/s, portata da 1,5 a 2,3 m).
- **Criterio esistente.** Casual contro medio ≥ 95% dei game (`docs/NATPF_LEGGENDA.md:136`,
  `docs/NATPF_DIAGNOSI_2026-10-23.md:383`). Un livello «Evento» separato non lo tocca.
- **Limite.** Il profilo «umano» viene dalla partita del 23/10, giocata da una persona che conosceva il gioco. Per il
  visitatore della fiera vedi `docs/NATPF_EVENTI_E_BACKLOG.md:9`.

### D4 · Stesso schermo, fine partita (partita P1 + mancato 5, movimento MOV-8)
- **Codice.**
  - `hud_ui.js:334-344`: testi fissi «Hai vinto!/Riprova!», «Tu» e rating.
  - `game_engine.js:3253-3257`: `playerWon` dal lato del P1.
  - `game_engine.js:3247`: «Game Set and Match» solo se vince il P1.
  - `natpf_point_call.js:41`: punteggio grezzo (`W=['00',…]` in `game_engine.js:79`), niente «Parità»; `:57`: stile di
    `gameCall`.
  - `game_engine.js:400-407`: velocità 9,8 contro 9,6 m/s; le righe `420-421` saltano il 1v1.
- **Prove.**
  - AR `scripts/browser-fine.mjs` (porta 4650), schermata `shots/fine-split-vince-p2.png`.
  - VR `scripts/v-browser-modal.mjs` (4656) e `v-browser.mjs` (4655).
- **Decisione.** B10 dell'utente: tabellone come in TV, con 0/15/30/40.
- **Test da aggiungere.** Unitari su `pointCall` e `gameCall`, una prova split fino a MATCH_OVER e il controllo delle
  velocità uguali.

### D5 · Visitatore successivo (partita P3 + mancati 1, 2 e 4)
- **Codice.**
  - Nickname: `natpf_events.js:78` (sessionStorage). Record, medaglie e XP: `:71`, `:82` e `:269`, unici per PC.
  - Richiesta del nickname saltata: `natpf_lobby.js:234`.
  - Chiosco: `natpf_kiosk.js:21` (spento) e `:54-69` (reset). `:64` chiama `link.forget` e scollega il telefono.
  - Mano: `natpf_hand.js:7-10`.
  - Pannello dell'addetto: `natpf-tennis/index.html:208-214`.
  - Calibrazione rifatta solo se il telefono non è pronto: `natpf_training.js:213`.
  - Forza per metà relativa al riferimento: `natpf_stroke_intent.js:79-83`; `site/js/tennis/swing-detect.js:180`
    (`effRef`).
  - Tutorial visto per abbinamento del telefono: `natpf_phone_racket.js:542`.
- **Prove.** AR `scripts/browser-visitatori.mjs` (4652) → `browser-visitatori.log`; VR `v-browser.mjs` (4655).
- **Rami B16.** Nel ramo `b16-flow` `tutorialSeenFor(set)` resta legato all'abbinamento: il tutorial corto della
  decisione (b) lo vedrebbe solo il primo visitatore. Da verificare se il pavimento della forza dello stesso ramo
  (`BOOT.self 0,75`) attenua il riferimento ereditato.
- **Correzione.** Comando «Nuovo giocatore» che azzera nickname, `tutorialSeen`, calibrazione, colpo tipico e prototipi
  senza `link.forget`. Record per nickname e giorno (costo medio).

### D6 · Stanchezza (movimento MOV-1)
- **Codice.**
  - `game_engine.js:3168`: unica chiamata a `fatigueStep`.
  - `:2980-2986`: solo in RALLY con la palla in gioco; `:2897-2901` e `:2839-2896` escono prima.
  - `natpf_skill.js:352` e `:371`: `pointRecover` 0,12/s, mai usato.
  - `startNewMatch` (`game_engine.js:1190-1210`) non azzera `natpfFatigue`.
  - Il test `natpf-super-stanchezza.test.mjs:119` chiama `fatigueStep` a mano e non vede il buco.
  - Regola sulla velocità: `natpf_skill.js:52-54`. Stanco, chi gioca va a 7,92 m/s, sotto la CPU Leggenda (8,0).
- **Misure.**
  - VM `verify-mov.mjs` (10 semi × 150 punti). Quota del tempo su «Stanco»: Pro 86,5–93,4%, Leggenda 44,9–94,3%,
    Casual 0%. Stanchezza al contatto a Pro 0,86–0,91. Con la correzione: 0% e 0,05–0,09; punti vinti ±3.
  - Browser: AM `browser-stanchezza.mjs` (4610), stanchezza ferma a 0,983 anche nella partita nuova; VM
    `browser-check.mjs` (4611).
- **Decisione.** Utente, 29/10: «si stanchi, ma non troppo» (`docs/PROJECT_MEMORY.md`, §Stanchezza).
- **Correzione.** `fatigueStep(engine, actor, {dt, inPoint:false})` fuori dallo scambio, azzeramento in `startNewMatch` e
  `startSplit`, più un test sul motore.

### D7 · Risposta al servizio letta schiacciata (speciali S1 + M2 e M3)
- **Codice.**
  - `natpf_impact.js:34`: `PLAN.returnTop` 1,72.
  - `natpf_phone_racket.js:298`: `ballIsHigh` con `SMASH_FROM.gesture` 1,5.
  - `natpf_stroke_intent.js:109`: `classifyStroke` restituisce 'smash'.
  - `natpf_stroke_outcome.js:353`: `smashAt` accetta `it.shot==='smash'` anche con serveReturn.
- **Misure dell'auditor** (AP `risposta-alta.log` e `risposta-blend.log`).
  - Tagliato e pallonetto del tutorial a 1× e 1,2×: SMASH 36/36.
  - Palla corta a 1,2×: 18/18.
  - Dritto in discesa (salita −0,10): 18/18.
- **Misure del verificatore** (VP `v-s1.mjs`, servizio vero della CPU).
  - `ballIsHigh` vero 60/60.
  - Colpo n. 143 (salita −0,588, abituale −0,189): SMASH 60/60 a 177–187 km/h.
  - Colpi normali dal telefono simulato: 0 su 720 (`v-s1b.log`). La stima del 6–22% (modello gaussiano) non va usata.
- **Test mancante.** `natpf-tennis/test/natpf-diag-20261030.test.mjs:189-199` (C12) inietta direttamente 'slice'.
- **M2.** `PLAN.volley` arriva a 1,95 m: il 18,5% dei piani di volée a Casual ha il contatto a 1,5 m o più (VP
  `v-volhigh.log`).
- **Correzione.**
  - `ballIsHigh` in risposta (`rallyStrokeCount ≤ 1`) con `SMASH_FROM.always` 2,3.
  - Ramo «piano verticale e manico alto» solo se la salita è ≤ 0.
  - Test dalla forma del n. 143 con il servizio vero, come in `v-s1.mjs`.

### D8 · Palle corte dominanti (speciali S2)
- **Codice.**
  - `natpf_stroke_outcome.js:232`: DROP mai fallito, dal 22/10 (`c69023f`/`2f2a77d`); non è una decisione dell'utente.
  - `:201` e `:212`: la qualità mancante accorcia anche la palla corta.
  - `natpf_skill.js:407`: +0,32 a Casual e +0,22 a Pro, fissi.
- **Misure.** Punti vinti, colpo normale → sole palle corte:

  | caso | auditor (AP `spam.log`, 400 × 3) | verificatore (VP `v-s2.log`, semi 31/37/41) |
  |---|---|---|
  | Leggenda/tennista | 43,4 → 71,3% | 41,4 → 82,2% |
  | Leggenda/amatore | 18,7 → 32,8% | 18,9 → 36,3% |
  | Pro/bambino | 19,1 → 38,9% | 19,2 → 40,6% |
  | Casual/bambino | 45,6 → 66,1% | 45,3 → 67,9% |

  - Palla corta secondo la qualità (VP `v-s2b.log`): q 1 → 2,50 m; q 0,6 → 1,84 m; q 0,3 → 1,65 m.
  - A Leggenda gli errori fuori della CPU salgono da 176 a 286 per `playerErrorPlan`.
- **Nota.** Misurato prima del ramo (a): va rifatto.
- **Criteri** (AP `tattica.mjs`, modo spam). Sole palle corte al massimo +3 punti sul top spin; la palla corta singola
  vale +2…+5 a Casual.

### D9 · Pro, campo aperto (scambi F4 + mancato 4)
- **Codice.**
  - `natpf_skill.js:42`: CPU Pro a 5,3 m/s, portata 1,5 m, reazione 0,2 s.
  - `game_engine.js:2513`: soglia della risposta difensiva a 1,55 m (`:2541-2546`).
  - `:3049`: la CPU colpisce solo entro cpuReach (1,5 m).
- **Misure.**
  - VS `rb-cpu-pro.txt`. Palla a 4–6 m: vincenti 1,8% (umano), 1,0% (amatore), 44,4% (tennista); riprese 83–88%.
  - VS `difesa.txt`: colpi difensivi della CPU a Pro 0,0%, a casual 14%.
  - «Angolare raddoppia gli errori della CPU» vale solo per umano (15,0% contro 8,9%).
- **E1b.** CPU a 4,7 m/s: vincenti dal 7,5 al 13,7%, punti dal 73,7 al 55,8%.
- **Criteri.** Palla a 4–6 m → almeno il 15% di vincenti (umano); Pro contro medio nel 70–85% dei game.

### D10 · Scritte dell'esito (sensazione S1 + mancati 1, 2 e 3)
- **Codice.**
  - `natpf_shot_feedback.js:29-30`: «In rete» e «Fuori» decisi prima di EARLY/LATE; `:132` dettaglio; `:28`
    «Mancata»; `:239` restituisce null per 'fault'.
  - `game_engine.js:3145`: «TOO LATE! • WHIFF».
  - `game_engine.js:2166`: kind 'fault' sul colpo difensivo (excess > 0,6, `:2259`).
  - `natpf_phone_racket.js:665`: `out` solo per «Fuori»; `:667` trasforma 'fault' in 'point'.
  - `site/js/tennis/racchetta.js:258`: ignora `d.out`; `:260`: «Punto avversario».
  - `natpf_gesture_hud.js:20`.
- **Misure.**
  - Auditor AC `scripts/fuori.mjs`: 63–90% dei Fuori o In rete hanno voto VERY.
  - Verificatore VC `v-rally.log`: 65–86% per umano, bambino e amatore; 33–44% per tennista; 17–50% a Leggenda.
    Casual/umano: 118 errori su 450 punti, circa il 70% per il tempo.
  - VC `v-mismatch.log`: computer e telefono diversi nel 7,5–21% dei colpi. Colpi difensivi (tra parentesi con la palla
    in campo): casual/umano 1,5% (0,3%), casual/bambino 6,3% (3,6%), pro/umano 3,9% (0,5%), pro/bambino 8,3% (3,3%).
- **Correzione.**
  - «Fuori · troppo presto/tardi» e «In rete · …»; «Troppo tardi» per il colpo a vuoto in ritardo.
  - Il telefono usa sia out sia net.
  - kind 'hit' per ogni colpo, 'fault' solo in `_awardPoint`.
  - Test in `natpf-scritte-esito`.

### D11 · Servizio senza peso e velocità residua (servizio S2 e S3 + mancati 1 e 2; movimento mancati 1 e 2)
- **Codice.**
  - `_setupPointServe` (`game_engine.js:1212-1252`) non azzera `vel`.
  - `:2980-2986`: i piedi si aggiornano solo in RALLY. L'unico azzeramento è nella posa del menu (`:3950`).
  - Inerzia: `natpf_skill.js:382-396` (`cpuStep`), `natpf_legend.js:266` (`legendStep`).
  - Animazione: `player_body_animation.js:282-314` fa il passo di corsa se `|vel| > 0,25`.
  - Servizio:
    - `natpf_skill.js:402-444` (`cpuErrorChance` e `cpuReturnPlan`);
    - `natpf_stroke_outcome.js:393-406` (`serveOutcome`);
    - `_executeServeHit` non chiama `registerPlayerShot`;
    - `resetRally` (`natpf_skill.js:88`) non azzera `lastQuality`, letta a `:424`;
    - `shotThreat` (`:401`) giudica innocua una palla che rimbalza a meno di 7,6 m dalla rete;
    - `planCpuRun` parte solo dopo i colpi di scambio (`game_engine.js:2186`); dopo il servizio c'è solo
      `_predictBallIntercept` (`:1895`).
- **Misure dell'auditor** (ASE `scripts/serve-match.mjs` con `ace-why.mjs`).
  - Ace: casual 22/296, pro 22/304, leggenda 2/315.
  - Con `FIXVEL=1`: 0/295, 0/281, 0/308.
- **Misure del verificatore** (VSE `v-aces-tut.log`, `v-aces-flat.log`).
  - Servizio del tutorial: casual 12/283, pro 16/309, leggenda 0/355.
  - Piatto 0,9: 24/270, 34/302, 1/359.
  - Con la velocità azzerata: 0 ace.
  - Velocità laterale della CPU al servizio: 4,2–4,8 m/s negli ace, 0,2–1,5 m/s negli altri. Servizi con più di
    0,5 m/s residui: 59–67%.
- **Corsa sul posto** (VM `vel-freeze.mjs`).
  - CPU con `|vel| > 0,25` al servizio successivo nel 53–95% dei punti.
  - VM `browser-check.mjs`: 3,17–3,6 m/s per 3 s, `stridePhase` a circa 15,6 rad/s.
  - Non verificato a occhio sul ledwall.
- **Peso del servizio.**
  - ASE `serve-sweep.mjs`: 0 ace su 3240 servizi.
  - VSE: risposte sbagliate con la CPU ferma 11,7 / 3,8 / 2,2% (tutorial) e 18,4 / 8,1 / 3,5% (piatto 0,9).
  - Effetto di `lastQuality` (VSE `v-lastq.log`): 16,2% e 7,1% con lastQ 1, contro 11,5% e 5,4% con 0,3.
  - Con il tempo di reazione aggiunto gli ace restano allo 0–0,4% (VSE `v-aces-react-*.log`).
- **Falli.** Assenti per «come prima» (`docs/NATPF_RACCHETTA_VIRTUALE.md` §9), non per una decisione dell'utente.
- **Correzione.**
  - Azzerare `vel` e lo stato di corsa dei quattro giocatori in `_setupPointServe`, con un test.
  - Una minaccia propria del servizio in `cpuErrorChance` per `rallyStrokeCount ≤ 1` (velocità, angolo, q del
    servizio), senza passare da `shotThreat`.
  - Un aggancio di reazione per la «lettura in ritardo».
  - Non indebolire la Leggenda (decisione a).

### D12 · Tipo del servizio (servizio S4)
- **Codice.** `natpf_stroke_outcome.js:397` (soglia assoluta del kick: salita 0,12). `SERVE.flight`: kick
  `[1.12, .84]`, slice `[.98, .64]`.
- **Misure** (ASE `serve-phone-rates.mjs`; VSE `v-phone-serve.mjs` e `v-phone-serve-pre*.log`).
  - Da 0,7 a 1,1×: slice con |piano| 0,50–0,60, volo da 0,89 a 0,80 s.
  - Presa nel palmo a 1,2×: kick con volo 0,94–0,96 s.
  - POWER da 1,3×, oppure da 1,2× se il riferimento viene solo dalla calibrazione.
  - Presa a martello: slice fino a 1,3×, piatto a 1,5×.
  - «Gran servizio» 25 su 296 (`match-tutorial.log`).
- **Non verificato.** A che velocità servono le persone vere.

### D13 · Tagliato letto palla corta (speciali S3)
- **Codice.** `natpf_stroke_intent.js:119-124` (typePower ≤ 0,36 o ampiezza ≤ 48°). `scripts/audit/letture-gesti.mjs:20`
  accetta slice → drop sotto 1×.
- **Misure.**
  - AP `rumore.log`: 30,7%. VP `v-s3.log`: 43% (77 su 180).
  - La palla corta del tutorial letta tagliato: 17 su 180.
  - Esito: tagliato a 7,8–8,2 m, palla corta a 2,1–2,5 m.
- **Correzione.** Soglia 0,28 più la condizione sul piano (≤ 0,55) o sull'ampiezza (≤ 48°). La soglia da sola renderebbe
  tagliato la palla corta del tutorial a 1,2× (typePower 0,30).

### D14 · Precision e Combo (partita P6 + mancato 3)
- **Codice.**
  - `natpf_arcade.js:88-99` (zone 7 e 10), `:103-123` (Combo), `:111-114` (`precisionPoints`).
  - `natpf_events.js:100` e `:174`; `:177` rimette `chainIdx=0` sulla stessa catena.
  - `natpf_training.js:43`, `natpf_lobby.js:563-566`.
  - `natpf_stroke_outcome.js:53` (TOPSPIN da 6,2 a 11,5 m) e `:201`.
- **Misure.**
  - AR `scripts/precision-zone.mjs` → `precision-zone.txt`: p01 dei rimbalzi a 5,5–7,5 m.
  - Combo: almeno uno speciale nel 71,4% delle catene da 2 colpi e nell'85,7% di quelle da 3; primo passo speciale 3
    volte su 7.
- **Non misurato.** Quanto spesso un visitatore nuovo fa un colpo speciale che viene riconosciuto.

### D15 · Doppio 2v2 (partita P5, sensazione S3, movimento MOV-4)
- **Codice.**
  - `game_engine.js:1496`: `queueUserSwing` solo se `!isDoubles`.
  - `game_engine.js:1505-1515`, `:1520-1527`, `:1902-1911`.
  - `game_engine.js:2012`: `racketShot` è null senza `natpfTau`.
  - `game_engine.js:2617-2618` e `:2662-2671`: `_predictBallIntercept`.
  - `natpf_skill.js:21` e `:29`: `assistWindow` 0,30 e 0,16 s.
  - `natpf_shot_feedback.js:56` e `:129`: la scritta «compagno» compare solo dopo il colpo.
  - `natpf-tennis/index.html:549`.
- **Misure.**
  - AR `doppio.mjs` e VR `v-doppio.mjs`: il compagno fa il 5,6–9% dei colpi. Vincenti: casual/umano dal 23,6–24,8% al
    2,1%, pro/umano dall'8,7–9,3% all'1,9–3,0%. Pro/amatore dal 61,3–64,0% al 78,7–83,3% dei punti.
  - Senza il gesto sulle palle del compagno: dal 95 al 44% (casual/umano) e dal 79 al 36% (pro/amatore).
  - VC `v-doubles.mjs`: profondità z da −8,18 a −9,90 contro −9,72 fisso nel singolo; 7–10% fuori per caso; a Pro con
    lead 0,25, 30 colpi a vuoto su 30.
  - VM `doubles-check.mjs`: distanza laterale 0,39–0,42 m contro 0,74–0,76; esito B15 nello 0% dei colpi.
- **Non confermato.** Che nel doppio si perdano più palle senza colpire: è un artefatto del profilo umano.
- **Decisione** del 04/11: il 2v2 è fuori dalle modalità per gli eventi.

### D16 · Latenza e «palla passata» (sensazione S2 + mancato 4)
- **Codice.**
  - `natpf_impact.js:336`: lead = ttc + latenza.
  - `natpf_impact.js:346-348`: il limite «behind» usa la posizione della palla all'arrivo del messaggio.
  - `game_engine.js:2100`: B = ball.pos, alzata ad almeno 0,78 m.
  - `natpf_phone_racket.js:187-189` e `:225`: displayLag, che si somma alla latenza.
  - `natpf_diag.js:179-181`: impostazione a mano.
- **Misure** (AC `scripts/window.mjs`, VC `v-late.mjs`). Primo ritardo ancora colpito, con latenza 0 / 35 / 80 / 130 ms:

  | livello, palla veloce | 0 ms | 35 ms | 80 ms | 130 ms |
  |---|---|---|---|---|
  | Casual | −0,14 | −0,12 | −0,08 | −0,03 |
  | Pro | −0,13 | −0,11 | −0,06 | −0,01 |
  | Leggenda | −0,11 | −0,08 | −0,04 | +0,01 |

  - Latenza in rete locale nel browser: 26–44 ms (`natpf-latency.mjs` 9/9).
  - Palla 0,75 m oltre il punto d'impatto con lead 0 (VC `v-timing.log`), circa nel 27–29% dei colpi B15.
- **Non verificato.** 80–200 ms via internet: la documentazione dà 2–15 ms per WebRTC diretto
  (`docs/NATPF_GESTI_E_LATENZA.md:227`).
- **Correzione.** Calcolare il limite su `b.pos − b.vel·lat` e lanciare la palla da dov'è, senza riportarla indietro.
- **Test.** Lead −0,02 con lat 0,13 deve colpire a tutti i livelli.

### Voci a priorità bassa
- **17. Servizio della CPU** (servizio S5 + mancato 3).
  - Codice: `game_engine.js:1806-1818`; `:1825` (fixAirServe solo per natpfServe); `:1826-1835` (km/h da formula);
    `:1861` (cameraTrauma); `:2881-2887`. Commenti di livello: `natpf_skill.js:38` e `:70-74` (a Pro e Leggenda il
    servizio è l'arma della CPU: non indebolirlo).
  - VSE `v-cpu-serve.log`: rimbalzo 0,62–1,02 m prima del bersaglio, |z| 4,19–4,47 m, isPowerShot 60/60.
  - Tabellone fisso a 194 km/h; velocità vera 186–199 a Casual e 220–234 a Pro.
- **18. Rating finto** (partita P4). `hud_ui.js:343-344`, `_drawSkillGraph`. Classifiche solo dei minigiochi:
  `natpf_events.js:268-269`.
- **19. Rinvio dei colpi morbidi** (sensazione S4).
  - Codice: `natpf_impact.js:318` e `:398` (`SOFT.wait` 65 ms). VC `v-timing.log`: 163/263 ms contro 96/196 ms.
  - La proposta va ristretta: rischio della diagnostica 20261030-142317 (`natpf_impact.js:308-316`); niente rinvio solo
    entro la finestra della direzione (`keepsSpecial`, `:378-382`).
- **20. «Troppo presto» in ritardo** (sensazione S10). `natpf_impact.js:333-376` e `:398-401`;
  `natpf_gesture_hud.js:37`. VC `v-timing.log`: 613–1163 ms dopo il gesto.
- **21. Racchetta e palla** (sensazione S8).
  - Codice: `racket_kinematics.js:82-301` e `:829-835`; `natpf_skill.js:95-110` (il commento «si toccano davvero» è
    smentito).
  - VC `v-racket-fisso.log`: distanza minima 0,26–0,53 m, mediana 0,41.
  - La moviola (`natpf_replay.js:129`) non è misurata.
- **22. Rete contro la Leggenda** (speciali S6, S7 e S8).
  - Codice: `natpf_skill.js:59` (cpuErr null), `natpf_legend.js:158` (legendQ solo sul super), `natpf_skill.js:564`,
    `natpf_legend.js:175`, `natpf_stroke_outcome.js:317` (lateBehind).
  - VP `v-net.log`: la Leggenda riprende il 67,9% delle schiacciate (amatore) e il 52,2% (tennista). Rete contro fondo:
    tennista dal 39,2 al 60,7%. Volée fuori 6,9–10,1% contro 0,4–4,2%.
  - VP `v-s8.log`: a parità di condizioni le volée escono 1,5 volte più dei colpi da fondo, non 3.
- **23. Contatto basso** (movimento MOV-3).
  - Codice: `natpf_impact.js:117-123` e `:161-177`.
  - AM `early-contact.mjs` e `bounce-cf.mjs`; VM `alto-check.mjs`. Piani presi entro 0,15 s dal rimbalzo: Casual
    42–47%, Pro 68–76%, Leggenda 80–84%.
  - Le diagnostiche reali dicono che le persone anticipano (mediana +49 ms, `docs/NATPF_RACCHETTA_VIRTUALE.md` §P4).
  - La variante «punto più alto» peggiora l'amatore (dal 15,3 al 16,7%) e la Leggenda.
  - Prima va registrato il tempo dal rimbalzo al gesto nella diagnostica.
- **24. Lato del colpo** (movimento MOV-7).
  - Codice: `natpf_impact.js:134`, `natpf_skill.js:103-106`, `game_engine.js:1921-1944`,
    `natpf_stroke_outcome.js:269` e `:286`.
  - Non spostare il punto dove stare in base al gesto in attesa: la preparazione è spesso letta dal lato opposto (§P11,
    B14.2). Correggere animazione e blocco del super sul colpo finale; registrare `plan.side` nella diagnostica.
- **25. Soglia del tagliato** (speciali S10).
  - Codice: `natpf_stroke_intent.js:33`, `:106` e `:119`.
  - AP `rumore.log`: con σ 0,15 tagliato 4,7% e palla corta 2,0%; con σ 0,25 tagliato 14,7%.
  - Telefono simulato: 0 su 720 (VP `v-s1b.log`).
  - Misura da fare: deviazione della salita (campo rise di `tel.colpo`) dalle diagnostiche vere. Soglia relativa solo
    se supera circa 0,15.

### Miglioramenti
- **M1. Formato** (servizio S1, partita P2, scambi F5).
  - Codice: `natpf_lobby.js:158-165`, `match_format.js:20-22`, `game_engine.js:3225-3234`, `natpf_scoreboard.js:5`
    (nessun tie-break) e `:12`, `natpf_versus.js:324`; voci: 47 clip fisse in `public/voce`.
  - Misure: AR `match-sim.mjs` e `formato-evento.mjs` (`formato-evento.txt`); VR `v-game1.mjs` e `v-game1b.mjs`. p90 da
    131–204 a 97–142 s; massimo da 216–607 a 131–184 s.
  - Al meglio di 5: p90 455–670 s, massimo 790 s. Il cambio del servizio va messo in POINT_OVER, non in SERVE_STANCE.
  - Decisioni: 1 game (`docs/NATPF_EVENTI_E_BACKLOG.md:22`); chi batte per primo (richiesta del 29/10); il sorteggio
    esiste già (`match_format.js:20`).
- **M2. Primo servizio** (servizio S6). `game_engine.js:2844-2851`, `:2891-2895` e `:1445-1447`. ASE
  `scripts/browser-serve.mjs`, VSE `v-browser.mjs` (4622).
- **M3. Segnale del tempo** (sensazione S6).
  - Codice: `natpf_skill.js:187-189` (`swingGrade`), `natpf_impact.js:117` (`apexContactOn`).
  - VC `v-rally.log`: casual/umano 62% «Anticipo» e 21% «Perfetto»; distribuzione B15 (`docs/b15/audit-colpi.md:37`):
    44 / 50 / 6%.
  - Decisione: voto sul tempo vero (`docs/PROJECT_MEMORY.md`, §Direzione).
- **M4. Super** (sensazione S7). `natpf_stroke_outcome.js:279-293` (`superWhy`), `game_engine.js:2247`,
  `natpf_power_hud.js:22-26`. VC `v-rally.log` (tennista): super sul 32% dei «Fortissimo» a Casual, 10% a Pro, 4,5% a
  Leggenda. Super condizionato: decisione dell'utente del 29/10.
- **M5. Fine partita** (partita P4). `game_engine.js:3238-3258`, `natpf_ui.js:114-118` («Gioca ancora»: decisione del
  28/10).
- **M6. Gioco a rete** (scambi F6, movimento MOV-6, speciali S4, S5 e S9).
  - Codice: `natpf_impact.js:226-233`, `game_engine.js:2612`, `natpf_legend.js:47`, `natpf_skill.js:556-558`
    (CPU_PATTERNS senza palla corta), `:560-579`, `natpf_legend.js:160-175` (senza SMASH), `natpf_skill.js:408`, `:37`
    e `:47` (cpuWeak).
  - Misure: AP `attacchi.log`, `campo.log`, `tipi.log`, `cpu-pos.log`; VP `v-s4.log` e `v-s4b.log`; VM `net-check.mjs`;
    VS `an2.txt` e `lato.txt`.
  - La fase C del 22/10 (`docs/NATPF_RACCHETTA_VIRTUALE.md` §6) è una scelta tecnica, non una decisione dell'utente.
    La palla corta della CPU è promessa in `docs/NATPF_SIMULATOR_AUDIT.md:109`.
- **M7. Movimento** (movimento MOV-5 e MOV-9).
  - Codice: `game_engine.js:3169-3174`, `natpf_skill.js:386-393`, `:24`, `:37` e `:52-54`; recupero:
    `natpf_impact.js:231`, `game_engine.js:2179`, `natpf_legend.js:254-261`.
  - Misure: AM `speed-7.json`; VM `verify-mov`, con umano a Leggenda dal 30 al 23,3% e palle perse dal 23 al 34,5%.
- **M8. Leggenda da campione** (scambi F7). `natpf_legend.js:64` (closeFrom). AS `exp-E3-smorzata.txt`. Velocità
  mediana: Leggenda 79–90 km/h, Pro 87,6–92 km/h. Smorzate 11–20% dei colpi della CPU.
- **M9. Ritardo del ledwall** (sensazione S5). `natpf_phone_racket.js:187-189`, `natpf_diag.js:179-181`,
  `docs/NATPF_GESTI_E_LATENZA.md:262`.
- **M10. Scelte del servizio** (servizio S7). `natpf_stroke_outcome.js:399-404`, `natpf_onboarding.js:37-41`,
  `natpf_training.js:29`. VSE `v-serve-dir.log`.
- **M11. Finezze** (sensazione S9). `holdSwingPrep` in `natpf_skill.js:95-101`. Scelta del 20/10 «un gesto, un solo
  swing» (`docs/NATPF_GESTI_E_LATENZA.md:216-219`).

### Da indagare
- **Pro, palle non prese.** A Pro il profilo amatore perde il 15,3% dei punti con palle passate senza colpire, contro lo
  0,3% del tennista (VM `alto-pro.txt`). Non dipende dal movimento: il piano arriva sempre in tempo. Causa non trovata.
- **Ritmo.** Tra un colpo e l'altro passano 1,0–1,25 s a tutti i livelli (AS `analisi3.txt`). Non è un difetto: il
  ritmo non distingue i livelli.
