# B37 · Collaudo del 13/11, seconda parte (fuori vero, chi serve, segnale spiegato, pannello dal programma Windows)

Collaudo dell'utente del 13/11 (11:25 UTC) su una versione con B35a e B35b uniti (base `1043c85`). Quattro punti, tutti
fatti in questo blocco (ramo `b37-collaudo-bis`):

1. **«Fuori» e punto solo quando la palla esce davvero** (anche quando finisce la partita);
2. **chi deve servire con un elemento di gioco**: il riquadro di servizio colorato a terra e, sopra il personaggio, la
   casella gialla tonda «Al servizio» (la gemma del primo giro è stata tolta dopo il riscontro dell'utente della sera:
   **B37.1**, più sotto nel punto 2);
3. **il «cerchietto bianco che segue la palla» spiegato** le prime volte che compare;
4. **pannello dello stand dal programma Windows**: tasto **F9** e voce del menu.

Il gioco non cambia: esito dei colpi, direzione (B35a), punti, livelli e CPU sono quelli di prima (impronte e
`audit:legend` uguali, più sotto). Il riconoscimento dei gesti non è toccato.

## In breve: cosa cambia per chi gioca

| Punto | Prima | Adesso |
|---|---|---|
| 1 · fuori | Appena colpita la palla compariva «Fuori» (o «In rete»), un anello rosso a terra dove sarebbe caduta e il telefono vibrava l'errore, quasi un secondo prima che la palla cadesse | «Fuori» / «In rete», l'anello rosso (dove è caduta davvero), il telefono (scritta e vibrazione dell'errore), il punto e la voce arrivano **insieme, quando la palla tocca terra fuori o tocca la rete**. Al colpo solo il colpo (scritta neutra sul telefono). Se l'avversario prende la palla al volo, nessun «Fuori» |
| 1 · fine partita | La schermata di fine arrivava 1,8 s dopo l'ultima palla, ma il «Fuori» si leggeva già al colpo | L'ultima palla atterra, poi «Fuori» e «Partita della CPU», e la schermata di fine 1,8 s dopo: si vede tutta |
| 2 · chi serve | Solo la scritta «Al servizio» sopra chi batte, sempre a 2,25 m da terra | Il **riquadro dove deve cadere il servizio** è colorato a terra con il contorno luminoso e sopra chi batte c'è la **casella gialla tonda «Al servizio»** del B35b, **appena sopra la testa** (Classici e Lob & Drop), più grande sugli schermi grandi; spariscono quando parte la palla. (Nel primo giro del B37 sopra la testa girava una gemma gialla: tolta nel B37.1, «il triangolino in alto è orribile») |
| 3 · cerchietto bianco | Un anello bianco seguiva la palla senza spiegazione | Nelle prime 3 palle di ogni partita in cui compare, in alto al centro: **«Colpisci quando il cerchio diventa verde»** (con un cerchio bianco e uno verde disegnati); poi sparisce. La guida dice le stesse parole |
| 4 · pannello | Solo Ctrl+Maiusc+K (sul PC dello stand non funzionava) o 3 s sul marchio NATPF | Nel programma Windows anche **F9** (funziona anche a schermo intero) e il menu **NATPF → «Pannello dello stand (F9)»**. Ctrl+Maiusc+K resta |

## Come si attiva / come si spegne

- **Punto 1 · fuori all'atterraggio**: sempre, in partita (contro la CPU, stesso schermo, sfida tra due computer). Non ci
  sono opzioni. Nell'**allenamento**, nei **minigiochi** e negli **scambi di prova** resta come prima (l'esito subito fa
  parte della lezione: la scheda dell'esercizio dice «Fuori: troppo presto» al colpo).
- **Punto 2 · riquadro e casella «Al servizio»**: sempre, quando qualcuno deve battere (prima che lanci la palla e mentre
  la palla è in aria), in partita e anche nell'esercizio «Servizio» dell'allenamento (lì non provato nel browser). Non ci
  sono opzioni. In **prima persona** la casella non sta sopra di sé (la camera è lì, com'era già): resta il riquadro.
  Nella moviola e nella dimostrazione dietro il menu non ci sono.
- **Punto 3 · scritta del cerchio**: compare da sola quando il segnale del momento giusto è acceso: menu → **Opzioni** →
  **«Segnale del momento giusto: Di base · Sì · No»** (di base acceso con «Bambino» e «Adulto», spento con gli altri
  livelli). Le prime 3 palle di ogni partita; si rivede con una partita nuova e con **«Nuovo giocatore»**. Per non vedere
  né la scritta né l'anello: **«Segnale del momento giusto: No»**.
- **Punto 4 · pannello dello stand dal programma Windows**: tasto **F9** (da solo, senza Ctrl, Maiusc o Alt), anche a
  schermo intero; oppure, in finestra, menu **NATPF → «Pannello dello stand (F9)»** (la barra del menu compare con Alt).
  Un altro F9 lo chiude. Valgono ancora **Ctrl+Maiusc+K** e **3 secondi sul marchio NATPF** del menu, e dal telecomando
  dello staff il tasto «Pannello dell'addetto». Nel browser (zip Cloudflare) F9 non fa niente: resta del browser.

## Punto 1 · «Fuori» e punto solo quando la palla esce davvero

**Dove il gioco anticipava.** Il punto vero (punteggio, scritta grande «Punto della CPU», voce «Out!», game, fine
partita, statistiche, registro dello stand) il motore lo assegnava già quando la palla tocca terra fuori o tocca la rete
(`game_engine._awardPoint`): quello non anticipava. Anticipavano le cose che il gioco mostrava **al colpo**, perché sa già
dove cadrà la palla (`natpf_stroke_outcome.strokeOutcome`, `ball.targetLanding`, rimbalzo previsto):

| Dove | Prima, al colpo | Adesso |
|---|---|---|
| Scritta dell'esito nell'angolo | «Fuori · troppo presto», «In rete · in ritardo» in rosso | niente al colpo; la stessa scritta quando la palla tocca terra fuori o la rete |
| Anello a terra | rosso nel punto (fuori dal campo) dove sarebbe caduta | niente al colpo; rosso dove è caduta, quando cade (con la pulsazione del rimbalzo) |
| Lampo sulla racchetta | rosso | bianco (neutro): dice solo «colpita» |
| Etichetta del gesto (in basso) | «Fuori · troppo presto» | «Colpita», poi «Fuori · troppo presto» quando la palla cade |
| Telefono | «Fuori» con la vibrazione dell'errore | al colpo «Colpo!» (o il nome del colpo) con una vibrazione breve; quando la palla cade «Fuori» con la vibrazione dell'errore, poi «Punto avversario» con il motivo («Fuori · In anticipo») |
| Stesso schermo | come sopra, in tutte e due le metà e sul telefono del Player 2 | come sopra, per tutti e due i giocatori: la scritta nella propria metà e il proprio telefono quando la palla cade (il Player 2 non ha l'anello a terra, né prima né adesso) |
| Sfida tra due computer | il Player 2 vedeva «Fuori» al suo colpo sul suo computer; l'host vedeva «Fuori» del Player 2 al colpo | l'host decide il punto quando la palla cade (come prima); il Player 2 vede il verdetto quando la palla cade sul suo computer o, se lì non è ancora caduta, quando arriva la scritta del punto dall'host |
| Palle della CPU | niente scritte: il punto arrivava già quando la palla toccava terra | come prima (provato: nessun segno prima dell'atterraggio, punto e «Punto tuo» sul telefono quando cade) |
| Servizio fuori, doppio fallo | non esistono: il servizio dal gesto e quello della CPU cadono sempre nel riquadro (provato con 400 servizi dal gesto a caso e 24 servizi veri del motore, di chi gioca e della CPU) | come prima |
| Punteggio, voce, scritta del punto, game, set, partita, statistiche, registro dello stand | quando la palla tocca terra o la rete | uguale |

Se la previsione diceva «fuori» ma la palla cade dentro (di rado, a pochi centimetri dalle righe), al primo rimbalzo
compare l'esito in campo («Anticipo», «Buono»…). Se l'avversario prende al volo una palla che sarebbe uscita, nessun
«Fuori»: la palla è in gioco. Il volo della palla e l'esito dei colpi sono quelli di prima (impronte uguali).

**Fine partita.** Sul punto della partita la palla cade, nello stesso istante compaiono «Fuori», «Partita della CPU» e il
tabellone finale, e la schermata di fine arriva 1,8 s dopo (come prima): la palla ferma a terra e la scritta si vedono.

**Misure (prova nel browser `natpf-fuori-vero`).** Partita vera a 1 game contro la CPU con il telefono simulato (pagina del
telefono e collegamento veri). Batte la CPU; il primo colpo di chi gioca è lasciato com'è, i quattro dopo sono mandati
apposta fuori largo, in rete, fuori largo e fuori largo sul 0-40 (punto della partita): si cambia solo dove cade la palla
di quel colpo, poi tutto il resto è il gioco vero. Millisecondi dal colpo, orologio del computer (il telefono è una seconda
pagina nello stesso browser); due giri prima e due dopo.

| Che cosa (ms dal colpo) | Prima, giro 1 | Prima, giro 2 | Adesso, giro 1 | Adesso, giro 2 |
|---|---|---|---|---|
| **Palla a terra fuori** (largo) / **sulla rete** | 967, 815, 849 / 534 | 994, 833, 850 / 484 | 946, 830, 866 / 517 | 947, 848, 816 / 515 |
| Scritta «Fuori» / «In rete» nell'angolo | **7, 9, 9 / 7** (al colpo) | **11, 7, 6 / 6** (al colpo) | 959, 837, 874 / 525 | 968, 855, 823 / 524 |
| Anello rosso a terra | **5, 7, 8** (al colpo, dove cadrà) | **10, 5, 4** (al colpo) | 949, 833, 869 (dove è caduta); rete: nessuno | 956, 851, 819; rete: nessuno |
| Telefono: «Fuori» / «In rete» e vibrazione dell'errore | **11, 8, 11 / 6** (al colpo) | **10, 7, 5 / 6** (al colpo) | 951, 834, 869 / 521 | 958, 852, 820 / 527 |
| Tabellone (punto assegnato) | 970, 816, 851 / 536 | 997, 834, 852 / 486 | 952, 834, 871 / 522 | 961, 853, 821 / 521 |
| Scritta grande del punto | 973, 817, 852 / 537 | 998, 835, 852 / 488 | 957, 835, 872 / 523 | 964, 854, 822 / 522 |
| Voce «Out!» / «Net!» (sul punto della partita la voce della fine partita) | 974, 817, – / 537 | 998, 835, – / 488 | 957, 835, – / 523 | 964, 854, – / 522 |
| Telefono «Punto avversario» | 971, 816, 852 / 537, sotto «Fuori» | 997, 835, 854 / 486, sotto «Fuori» | 959, 836, 871 / 524, sotto «Fuori» o «Fuori · In anticipo» | 970, 854, 824 / 527, sotto «Fuori» o «… · In anticipo» |
| Schermata di fine partita (ultima palla) | 2654 (1,80 s dopo la palla a terra) | 2654 (1,80 s dopo) | 2673 (1,81 s dopo) | 2623 (1,81 s dopo) |
| Scritta di un colpo rimasto in campo | 17 | 18 | 20 | 21 |

In breve: **prima** la scritta, l'anello rosso e il telefono dicevano l'errore 4–11 ms dopo il colpo, cioè da mezzo
secondo a un secondo **prima** che la palla toccasse terra o la rete; **adesso** arrivano 3–21 ms **dopo**, nello stesso giro
del gioco in cui la palla tocca terra (i millisecondi sono il tempo di calcolo di quel giro sulla macchina di prova); il
telefono 3–12 ms dopo. Il punto, il tabellone, la voce e la schermata di fine partita arrivano quando arrivavano prima. I
colpi che restano in campo hanno la scritta subito, come prima.

**Schermate** (`natpf-fuori-vero` con `SHOTS=1`: il gioco si ferma un attimo subito dopo il primo colpo mandato fuori
largo e subito dopo che quella palla ha toccato terra; gioco a 1280×720 ridotto a 960 pixel, telefono a 260):

| | Gioco | Telefono |
|---|---|---|
| Subito dopo il colpo | ![](img/fuori-vero-colpo.jpg) | ![](img/fuori-vero-colpo-telefono.jpg) |
| Palla appena caduta fuori | ![](img/fuori-vero-terra.jpg) | ![](img/fuori-vero-terra-telefono.jpg) |

Cosa si vede, guardate una per una. **Al colpo**: la palla appena partita dalla racchetta con il lampo bianco, l'etichetta
in basso «Rovescio · Top spin · Colpita», il punteggio 0-0, nessun «Fuori» e nessun anello rosso (l'anello giallo in fondo
al campo è quello del colpo di prima, finito dentro); il telefono dice «Colpo!». **Con la palla a terra**: tabellone 0-15
per la CPU, la scritta grande «Punto della CPU · Errore tuo: palla fuori · 0-15», in basso a sinistra «Fuori · 103 km/h»;
il telefono «Punto avversario» con «Fuori» sotto.

**Da sapere**: la palla di chi gioca cade nella metà lontana, e lì la scritta grande del punto, che compare nello stesso
istante (com'era già prima), copre il punto dove è caduta: l'anello rosso a terra resta sotto la scritta e quasi non si
vede. Si vede la palla scendere fino a terra, poi la scritta. Prima del B37 l'anello si vedeva durante il volo, ma era
proprio l'anticipo da togliere. Se si vuole vedere anche la palla ferma e l'anello prima della scritta grande, la scritta
del punto potrebbe arrivare qualche decimo di secondo dopo: non fatto, è una scelta da fare con l'utente (cambia il ritmo
del punto, insieme alla voce).

## Punto 2 · Chi deve servire: riquadro a terra e casella «Al servizio» sopra il personaggio

**B37.1 · la gemma tolta (riscontro dell'utente, 13/11 sera).** Nel primo giro del B37 sopra chi batte girava una gemma
3D gialla (due piramidi unite a punta in giù, con il bordo blu scuro, ingrandita per ogni camera) e la scritta «Al
servizio» era diventata piccola e scura, sopra la gemma. L'utente, vedendola: **«Il triangolino in alto è orribile,
meglio la casella tonda che usavi prima "al servizio"»**. Quindi la gemma non c'è più (nessun oggetto 3D sopra la testa,
nessuna misura per camera) e torna la casella del B35b; il riquadro a terra, che l'utente non ha contestato, resta
com'era. Le schermate della gemma sono state sostituite con quelle della casella.

- **Casella «Al servizio»**, com'era nel B35b: fondo giallo accento, scritta blu scura in corsivo maiuscolo, bordo scuro
  (si stacca anche sopra Lob, gialla come lei), angoli tondi. **Misura**: 14 px come nel B35b sugli schermi normali
  (1280×720) e nelle aree strette del ledwall (720×720); sugli schermi più grandi cresce con l'area del gioco: 21 px a
  1920×1080, al più 24 px (`natpf-hud.css`: `clamp(14px, min(1.09cqw, 1.94cqh), 24px)`, con i margini e il bordo che
  crescono con lei; sono misure dell'area del gioco, non della finestra, quindi valgono anche in un riquadro del ledwall).
- **Dove**: **appena sopra la testa** di chi batte, centrata su di lui. Prima del B37 stava sempre a 2,25 m da terra,
  qualunque personaggio. Adesso il fondo della casella sta 12 cm sopra la parte più alta del personaggio, misurata sul
  modello: con i Classici i capelli, con Lob & Drop la racchetta alzata (la mascotte è più bassa dei Classici). Tre cose
  trovate misurando:
  - si conta **solo quello che si vede**: con i modelli 3D di Lob & Drop nella scena restano, nascosti, il tennista e la
    mascotte costruita nel codice, più alti del modello (la testa di Lob nel codice arriva a 2,18 m, il modello di Drop con
    la racchetta a circa 1,8–1,9 m). La misura del primo giro del B37 li contava: con Lob & Drop la casella sarebbe stata
    mezzo metro sopra la testa;
  - la racchetta alzata di Lob & Drop sta 0,5–0,7 m **davanti** al personaggio, verso la rete, e vista dalla camera alta
    dietro chi batte una cosa più avanti sale sullo schermo: con la casella sopra il centro del personaggio la racchetta
    la toccava (visto nelle schermate). Il punto della casella è sopra la parte più alta **alla sua profondità** (il
    vertice più alto vero, non il centro del riquadro della racchetta): così sta sopra la racchetta in tutte le viste
    (dietro chi batte, dal fondo opposto, nelle due metà);
  - in attesa del servizio la racchetta oscilla avanti e indietro, la testa dei Classici dondola (fino a 14 cm) e la posa
    del servizio arriva dopo la prima misura: per 1,2 s di gioco (un giro dell'oscillazione) si tengono il punto più alto
    e il più avanti, poi la casella resta ferma (non sobbalza).
- **Dove si vede**, come nel B35b: contro la CPU (batte chi gioca o la CPU, in fondo), nello stesso schermo (una casella
  per metà, in tutte e due le metà, batte il Player 1 o il Player 2) e sul computer del Player 2 della sfida tra due
  computer; in prima persona niente casella sopra di sé (la camera è nella testa), quella sopra la CPU sì. Solo al
  servizio (fermo e con la palla in aria), poi sparisce.
- **Riquadro di servizio** (com'era nel B37): il quadrato in diagonale nella metà di chi riceve, dove deve cadere il
  servizio, con un riempimento giallo leggero che pulsa e il contorno giallo appena dentro le righe bianche del campo. È lo
  stesso quadrato dove il gioco manda davvero il servizio (provato con 24 servizi veri: chi gioca e CPU, lato della parità
  e del vantaggio, servizio dal gesto e senza). Sparisce quando parte la palla.

**Prova nel browser `natpf-chi-serve` (riscritta per il B37.1: 64 controlli, tutti superati)**. Partita vera al
servizio; per ogni caso: la casella ha l'aspetto del B35b (colori, corsivo maiuscolo, angoli tondi, bordo scuro); è
appena sopra la testa di chi batte, cioè il suo fondo sta sopra il punto più alto della **sagoma vera** del personaggio
(tutti i vertici visibili proiettati sullo schermo, anche quelli dei modelli 3D) e non più su di una volta e mezza
l'altezza della casella, centrata su di lui entro 3 px; sta dentro lo schermo (o la sua metà) e lontana dal tabellone;
carattere di 21 px a 1920×1080 e di 14 px a 1280×720 e a 720×720; nella scena nessuna gemma; il riquadro è nella metà di
chi riceve, in diagonale, e si vede; quando la palla parte casella e riquadro spariscono; in prima persona niente
casella sopra di sé. Casi: Classici e Lob & Drop (modelli 3D come nel programma), contro la CPU, sul computer del Player
2 e nello stesso schermo a 1920×1080; Classici contro la CPU a 1280×720 e in prima persona; un'area stretta 720×720 (Lob
& Drop contro la CPU, Classici nello stesso schermo). Distanza tra il fondo della casella e la cima della sagoma: nel
giro finale, a 1920×1080, da 5 a 26 px sopra chi batte vicino (di solito 6–9; i valori alti sono il punto più alto
tenuto della racchetta che oscilla o della testa che dondola) e da 1 a 8 px sopra chi batte lontano; a 1280×720 8 e 3
px; nell'area 720×720 da 1 a 3 px; mai sotto.

Schermate guardate una per una (ridotte qui a 960 pixel; l'area stretta a 480):

| | Batte chi gioca / il Player 1 | Batte la CPU / il Player 2 |
|---|---|---|
| Classici, contro la CPU, 1920×1080 | ![](img/chi-serve-sempre-cpu-player.jpg) | ![](img/chi-serve-sempre-cpu-opponent.jpg) |
| Classici, contro la CPU, 1280×720 (la misura del B35b) | ![](img/chi-serve-1280-sempre-cpu-player.jpg) | ![](img/chi-serve-1280-sempre-cpu-opponent.jpg) |
| Lob & Drop, contro la CPU | ![](img/chi-serve-lobdrop-cpu-player.jpg) | ![](img/chi-serve-lobdrop-cpu-opponent.jpg) |
| Classici, computer del Player 2 (sfida tra due computer) | ![](img/chi-serve-sempre-p2-player.jpg) | ![](img/chi-serve-sempre-p2-opponent.jpg) |
| Classici, stesso schermo | ![](img/chi-serve-sempre-schermo-player.jpg) | ![](img/chi-serve-sempre-schermo-opponent.jpg) |
| Lob & Drop, stesso schermo | ![](img/chi-serve-lobdrop-schermo-player.jpg) | ![](img/chi-serve-lobdrop-schermo-opponent.jpg) |
| Area stretta 720×720, Lob & Drop contro la CPU | ![](img/chi-serve-stretta-lobdrop-cpu-player.jpg) | ![](img/chi-serve-stretta-lobdrop-cpu-opponent.jpg) |
| Area stretta 720×720, Classici stesso schermo | ![](img/chi-serve-stretta-sempre-schermo-player.jpg) | ![](img/chi-serve-stretta-sempre-schermo-opponent.jpg) |

Cosa si vede, guardate una per una: la casella gialla «AL SERVIZIO» con il bordo scuro sopra chi batte, centrata su di
lui, appena sopra i capelli (Classici) o sopra la racchetta alzata (Lob & Drop, con la mascotte più bassa); quando batte
chi è lontano (la CPU, il Player 2, il Player 1 visto dal computer del Player 2) la casella sta appena sopra la sua
testa, in fondo, davanti ai cartelloni, lontana dal tabellone; nello stesso schermo una casella in ogni metà; il
riquadro giallo dall'altra parte della rete, in diagonale. A 1920×1080 la casella è più grande che a 1280×720 (21 px
contro 14) e occupa la stessa parte dello schermo; a 720×720 resta di 14 px e si legge. In alto al centro la scritta del
servizio («Premi ↑ o W: lanci la palla», nello stesso schermo «Alza il telefono: lanci la palla») c'era già; sotto il
tabellone del computer del Player 2 «In attesa di Player 2…» viene dalla prova (sfida senza rete). Nelle schermate a
volte resta un anello verde a terra: è l'anello di rimbalzo del servizio provato nel caso prima (la prova serve due
volte nella stessa pagina), non un elemento nuovo. Guardate anche la prima persona (niente casella sopra di sé, quella
sopra la CPU sì) e le schermate dei giri di prova, non messe qui.

**Costo.** La casella è una scritta della pagina, come nel B35b. Nella scena resta solo il riquadro: 5 mesh (6 oggetti),
solo al servizio, materiali senza luci, nessuna ombra. Misurato nel browser con la grafica in software del banco (il
caso peggiore: niente scheda grafica) a 1920×1080 con Lob & Drop, mediana di 10 giri di 10 disegni: riquadro spento 3,90
ms, acceso 4,03 ms a disegno nel giro finale; nei giri di prova 2,64 → 3,03, 3,09 → 2,73, 3,23 → 3,31 e, con la macchina
più carica, 6,19 → 7,12 ms: sempre meno di 1 ms in più, dentro il rumore della macchina, e solo mentre si aspetta il
servizio. La misura della cima del personaggio si fa una volta per modello (con i modelli 3D di Lob & Drop 3–9 ms,
perché il corpo con la pelle va piegato vertice per vertice; con i Classici meno di 1 ms), poi per 1,2 s di gioco solo
le parti rigide vicine alla cima (i capelli o la racchetta: uno o due migliaia di vertici, circa 0,1 ms a fotogramma),
poi più niente (tempi misurati senza browser).

## Punto 3 · Il «cerchietto bianco che segue la palla»

È il **segnale del momento giusto** (B18.2): un anello bianco che si stringe sulla palla e diventa verde quando è il
momento di colpire. Non è cambiato niente su quando è acceso e su come si stringe. Adesso **le prime volte si spiega**:

- nelle **prime 3 palle di ogni partita** in cui l'anello compare, in alto al centro (sopra il campo: in basso copriva il
  proprio giocatore) c'è la scritta **«Colpisci quando il cerchio diventa verde»** con un cerchio bianco e uno verde
  disegnati accanto; resta finché c'è l'anello e 0,7 s dopo, poi sparisce; dalla quarta palla niente;
- si rivede con una **partita nuova** e con **«Nuovo giocatore»**;
- la **guida** (passo «Colpisci quando la palla arriva») e l'avviso delle **Opzioni** dicono le stesse parole: «un cerchio
  bianco si stringe sulla palla: colpisci quando il cerchio diventa verde»;
- con il segnale spento (di base con «Ragazzo» e con i livelli Facile, Esperta e Leggenda, oppure sempre con «Segnale del
  momento giusto: No») né anello né scritta.

**Prova nel browser `natpf-segnale-spiegato` (14 controlli, tutti superati)**, livello «Adulto» (Evento), palle della CPU
verso chi gioca, a 1280×720 e 1920×1080: l'anello c'è su ogni palla; la scritta c'è nelle palle 1, 2 e 3 e non nella 4 e
nella 5; sparisce dopo la palla; sta tutta nello schermo, in alto al centro; una partita nuova e «Nuovo giocatore» la
fanno rivedere; a livello Esperta (segnale spento di base) né anello né scritta; la guida dice le stesse parole.
Prima versione guardata: la scritta stava in basso al centro e copriva il proprio giocatore (che in terza persona sta
proprio lì): spostata in alto.

| Prima palla: anello bianco e scritta | Quarta palla: solo l'anello |
|---|---|
| ![](img/segnale-palla-1.jpg) | ![](img/segnale-palla-4.jpg) |

## Punto 4 · Pannello dello stand dal programma Windows

Sul PC dello stand Ctrl+Maiusc+K non apriva il pannello (nel gioco la scorciatoia è giusta: un altro programma del PC la
prende prima). Nel programma Windows adesso:

- **F9** apre e chiude il pannello. Lo legge il programma prima della pagina (`before-input-event`), quindi funziona anche
  a schermo intero, dove la barra del menu non c'è; F9 con Ctrl, Maiusc o Alt non fa niente (arriva al gioco);
- la voce **NATPF → «Pannello dello stand (F9)»** fa la stessa cosa (in finestra, con la barra del menu);
- il comando va solo alla finestra del gioco e solo se mostra una pagina del proprio server (stesse regole degli altri
  canali del programma: `natpf:staff-panel`, `window.natpfDesktop.staffPanel.onToggle` del ponte del preload, versione 5);
- nel gioco (`natpf_kiosk.js`) solo l'aggancio al ponte: Ctrl+Maiusc+K e i 3 secondi sul marchio restano com'erano;
- i testi che citano Ctrl+Maiusc+K dicono anche «F9 nel programma Windows» (nota della diagnostica, pagina del
  telecomando dello staff, guide del telecomando, del registro, della mira e del collaudo Windows, LEGGIMI del programma).

## Il gioco non cambia: impronte delle partite e Leggenda

Le stesse partite a sorteggi fissi, giocate dal motore vero senza grafica con il codice di prima (`1043c85`) e con
quello di adesso, hanno la stessa impronta (punti, vinti, scambi, motivi dei punti, voti dei colpi, colpi della
racchetta, cadute, colpi a vuoto): `scripts/audit/b37/impronte.mjs`, risultati in `scripts/audit/b37/risultati/`.

| Serie di semi | Partite (3 livelli × 5 profili × 3 semi, 80 punti) | Impronte |
|---|---|---|
| 7, 11, 23 | 45 | tutte uguali, 15 righe su 15 (impronta di tutto `a5c9e11211f7f618` prima e dopo) |
| 31, 37, 41 | 45 | tutte uguali, 15 righe su 15 (impronta di tutto `86df03aa53e1f297` prima e dopo) |

`npm run audit:legend`: **stesso risultato del codice di prima, riga per riga** (87 righe uguali: 69 controlli superati,
nessuno mancato, «Tutti i criteri rispettati»). Rifatto alla chiusura del blocco sul codice finale e sulla base `1043c85`
(estratta a parte): di nuovo uguale riga per riga. Le impronte non sono state rifatte alla chiusura: dopo `bdb56cb` il
codice del gioco non è cambiato (solo la prova `natpf-fuori-vero`, un test di unità e documenti).

Il blocco non tocca l'esito dei colpi, la direzione (B35a), la fisica, le regole del punteggio né la CPU: il motore
chiama solo il verdetto rimandato (`natpfUi.shot.settle`) all'inizio di `_awardPoint` e mette la scritta «Al servizio»
appena sopra la testa di chi batte (B37.1).
Senza grafica (impronte) quelle parti non ci sono; nel gioco cambiano solo quello che si vede e quando, non quello che
succede in campo.

## Verifiche

Fatte alla chiusura del blocco sul codice finale del ramo (dopo il commit «IN CORSO» `2bfe09a`, ricontrollato), su una
macchina condivisa con un altro agente che lavorava in parallelo (carico fino a 13 su 4 processori). Prove nel browser
con Chromium e la grafica in software, il telefono simulato e il mouse.

| Verifica | Risultato |
|---|---|
| Test del gioco (`cd natpf-tennis && npm test`) | 1463 su 1463 al primo giro; 1463 su 1464 al secondo (con il test nuovo), con un solo controllo non passato: un tempo della LAN (`natpf-lan-letture`, «prima lettura entro 30 ms») con la macchina a carico 13; rifatto da solo, 5 su 5 per tre volte |
| Test del sito (`node --test tools/test/*.test.mjs`) | 226 su 226 |
| Programma Windows (`cd natpf-desktop && npm test`) | 43 su 43 |
| Server LAN (`cd tools/lan && node --test test/*.test.mjs`) | 12 su 12 |
| Build (`npm run build`) | riuscita (10 s) |
| `npm run audit:legend` | uguale alla base `1043c85` rifatta adesso, riga per riga (87 righe, 69 controlli superati) |

| Prova nel browser | Risultato | Note |
|---|---|---|
| `natpf-fuori-vero` (nuova) | 10 su 10 | girata quattro volte: com'era nel commit «IN CORSO», normale e con `SHOTS=1`, poi corretta, con `SHOTS=1` e normale: sempre 10 su 10. Giro finale: palla a terra 962, 850, 813 / 517 ms dal colpo; scritta, anello e telefono 3–15 ms dopo; fine partita 1,81 s dopo l'ultima palla; colpo rimasto in campo: scritta dopo 24 ms |
| `natpf-chi-serve` (nuova) | 36 su 36 | con la gemma; 20 minuti (grafica in software a 1920×1080, modelli 3D di Lob & Drop nello stesso schermo, macchina carica). Riscritta e rifatta per il B37.1: vedi «Verifiche del B37.1» |
| `natpf-segnale-spiegato` (nuova) | 14 su 14 | |
| `natpf-rally` | 9 su 9 | |
| `natpf-servizio-lancio` | 12 su 12 | |
| `natpf-1v1-p2p` | 39 su 39 | sulla build |
| `natpf-formato-fiera` | 25 su 25 | |
| `natpf-fine-partita` | 47 su 47 | |
| `natpf-tabellone` | 42 su 42 | |
| `natpf-menu` | 45 su 45 | |
| `natpf-telecomando` | 85 su 85 | sulla build |
| `natpf-stesso-schermo-b20` | 50 su 52, poi 52 su 52 | i 2 controlli non passati volevano il testo del banner d'inizio di prima del B35b (vedi sotto); aggiornati, rifatta: 52 su 52 |
| `natpf-lob-drop` (intera) | 131 su 136, poi 133 su 136 | restano i 3 controlli «al colpo le corde sono dove erano», difetto noto dal B32, uguali sulla base; il primo giro e la correzione della prova sono spiegati sotto |

Test nuovo in `natpf-b37-collaudo.test.mjs` (24 test): nello stesso schermo il «Fuori» del Player 2 aspetta la palla a
terra, nella scritta della sua metà e sul suo telefono (il telefono del Player 1 non riceve niente).

## Verifiche del B37.1 (gemma tolta, casella «Al servizio»)

Sul codice finale del B37.1, sulla stessa macchina condivisa (carico 4–8 su 4 processori, un altro agente in parallelo),
Chromium con la grafica in software. L'ultimo ritocco (l'affinamento della cima non fa niente se non ci sono parti rigide
in vista; nelle prove non capita mai) è arrivato con le prove già avviate: quelle partite prima sono state rifatte dopo,
con lo stesso risultato.

| Verifica | Risultato |
|---|---|
| Test del gioco (`cd natpf-tennis && npm test`) | 1465 su 1465 (7 min, sul codice finale; anche prima dell'ultimo ritocco 1465 su 1465) |
| Test del sito (`node --test tools/test/*.test.mjs`) | 226 su 226 |
| Build (`npm run build`) | riuscita (12 s) |
| `natpf-b37-collaudo.test.mjs` | 25 su 25 (punto 2 riscritto: niente gemma; il punto della casella; i personaggi veri, Classici e Lob & Drop con i modelli 3D, anche a schermo con le camere del gioco) |

| Prova nel browser | Risultato | Note |
|---|---|---|
| `natpf-chi-serve` (riscritta) | 64 su 64 (giro finale; sesto giro sul codice di prima dell'ultimo ritocco: 64 su 64) | casella (aspetto, misura, sopra la sagoma vera, dentro lo schermo, lontana dal tabellone), riquadro, palla che parte, prima persona, computer del Player 2, 1920×1080, 1280×720, 720×720; costo del riquadro |
| `natpf-stesso-schermo-b20` | 52 su 52 (due volte) | |
| `natpf-servizio-lancio` | 12 su 12 (due volte) | |
| `natpf-tabellone` | 42 su 42 (due volte) | |
| `natpf-lob-drop` con `SERVIZIO=1` (chi serve con Lob & Drop) | 13 su 13 | |
| `natpf-lob-drop` intera (anche le partite a sorteggi fissi) | 131 su 136; la parte del costo rifatta da sola (`COSTO=1`): 15 su 15 | i 3 controlli «al colpo le corde sono dove erano» sono il difetto noto dal B32, uguali sulla base e nel B37; gli altri 2 erano i fotogrammi al secondo (classici 0,91 e 0,59 nei due giri della stessa misura, macchina carica): da sola 0,89 / 0,89 / 0,90, passati. Le partite a sorteggi fissi hanno le impronte del B37 (senza persone `7bf8d71a`, contro la CPU `daab2297`, stesso schermo `7031e211`) e gli stessi numeri del rig (32, 29 e 71 passi con tutti e due i piedi alzati): togliere la gemma non le cambia |


## Cosa non è riuscito e perché

- **Schermate di `natpf-fuori-vero` lasciate a metà** (commit «IN CORSO»): con `SHOTS=1` la prova passava, ma la
  schermata «palla a terra» non mostrava né «Fuori» né la scritta del punto né l'anello rosso, e il telefono era già
  tornato a «Pronto» anche in quella del colpo. Perché: il disegno con la grafica in software dura 2–3 s e nel frattempo
  le scritte, che si nascondono da sole dopo 0,65–2,6 s, erano sparite; l'anello prende colore solo al primo
  aggiornamento del gioco dopo la caduta, che il gioco fermo non faceva. Corretto nella prova, non nel gioco: si ferma un
  aggiornamento dopo l'evento, i timer delle due pagine stanno fermi con il gioco, il telefono si fotografa per primo.
  Riprovata: 10 su 10 e le schermate del punto 1.
- **`natpf-stesso-schermo-b20`: 2 controlli su 52 non passavano, non per questo blocco.** Volevano il sottotitolo del
  banner d'inizio esattamente «Sorteggio: batte Giulia» (e «… Marco»), ma dal B35b (`0e8782e`, già nella base) con il
  servizio che cambia ogni 2 punti il banner aggiunge « · Formato veloce: il servizio cambia ogni 2 punti», come voluto.
  Rifatta sulla base `1043c85`: gli stessi 2 controlli non passano, con lo stesso testo (in quel giro, con la macchina
  molto carica, anche 6 controlli di tempi e visibilità). I 2 controlli adesso vogliono il testo intero di oggi, parola
  per parola (non sono stati allargati): 52 su 52.
- **La scritta grande del punto copre la caduta nella metà lontana** (schermate del punto 1): non cambiato, da decidere
  con l'utente.
- **`natpf-lob-drop` intera: al primo giro 131 su 136.** Quattro sono i controlli «al colpo le corde sono dove erano»,
  il difetto noto dal B32 (`docs/b32/movimento.md`, già così nel B35): falliscono uguali sulla base. Il quinto, «3D,
  partita schermo: piedi sul campo» (94 passi su 2600 con tutti e due i piedi alzati, il limite è il 3 %, cioè 78),
  veniva da una partita diversa, non da un gioco diverso. La prova sorteggia con un `Math.random` a seme fisso da quando
  si apre la pagina; la gemma e il riquadro erano 9 oggetti three.js nuovi (dal B37.1 la gemma non c'è più e restano
  quelli del riquadro), creati prima dei personaggi, che consumano
  sorteggi per il loro nome; così cambiava il primo battito delle palpebre dei personaggi, che sorteggia ancora durante
  la partita, e da lì tutta la sequenza dei sorteggi si spostava (sulla base la stessa partita dava 66 passi). Provato
  con una sonda (partita senza persone, 3600 passi): con le palpebre uguali prima del seme base e ramo giocano la stessa
  identica partita (stessa impronta, stessi 5215 sorteggi). Corretta la prova, non il gioco: `play()` mette le palpebre
  uguali prima del seme (come già il disegno «a vuoto» dello stesso schermo). Rifatte le parti 3D (`TRE_D=1`) sulla base
  e sul ramo con la prova corretta: le tre partite sono identiche (impronte `7bf8d71a`, `daab2297`, `7031e211`, stessi
  numeri del rig; piedi: 71 passi su 2600, sotto il limite) e resta su tutti e due solo un controllo «corde». Nel giro
  sul ramo, fatto in parallelo con quello sulla base e con l'altro agente, non passava anche il tempo di disegno (1263 →
  1668 ms); rifatto da solo (`COSTO=1`): 15 su 15. Con la prova corretta la prova intera sul ramo, da sola: 133 su 136,
  e i 3 che non passano sono solo «corde» (le due partite con le mascotte costruite nel codice e quella con i modelli
  contro la CPU).

- **B37.1, i primi cinque giri di `natpf-chi-serve` riscritta** (log nella cartella di lavoro dell'agente): la casella
  passava i controlli, ma guardando le schermate e misurando la sagoma vera c'erano tre difetti, corretti uno alla volta:
  con Lob & Drop la cima contava i pezzi nascosti (casella mezzo metro sopra la testa), poi la racchetta davanti al
  personaggio toccava la casella (0 px), poi con i Classici la casella stava 33 px sopra i capelli (spazio di 0,2 m più il
  dondolio della testa). Il controllo della sagoma vera è stato aggiunto alla prova proprio per questo. Il sesto giro, sul
  codice finale: 64 su 64.

## Cosa non è provato

- **Telefono vero, programma Windows vero, ledwall vero e persone vere**: le prove sono nel browser con un telefono
  simulato (eventi di movimento finti) e il mouse; l'installer non è stato rifatto in questo blocco.
- **F9 nel programma Windows**: provato con i test del programma (scorciatoia, voce del menu, canale solo verso la pagina
  del proprio server, ponte del preload) e del gioco (il pannello si apre e si chiude dal ponte); non premendo F9 in
  Electron su Windows. Se F9 non funzionasse sul PC dello stand (un altro programma che prende anche F9), resta la voce
  del menu NATPF (in finestra) e il marchio da tenere premuto.
- **Sfida tra due computer**: il verdetto rimandato sul computer del Player 2 è provato con i test di unità (anche con la
  scritta del punto dall'host) e con la prova `natpf-1v1-p2p` (che non manda palle fuori apposta). Un caso raro non è
  provato: se il Player 1 prende al volo una palla del Player 2 che sarebbe uscita e la rete è lenta, sul computer del
  Player 2 la palla può cadere fuori «da sola» prima che arrivi la palla dell'host, e lì comparirebbe «Fuori» (prima
  compariva sempre, al colpo).
- **Stesso schermo con palle mandate fuori**: provato con i test di unità (anche quello nuovo del Player 2), non nel
  browser: `natpf-stesso-schermo-b20` non manda palle fuori apposta.
- **Esercizio «Servizio» dell'allenamento**: riquadro e casella «Al servizio» ci sono per il codice (è la stessa fase del
  servizio della partita), non provati nel browser.
- **Schermate del fuori**: un colpo solo (fuori largo contro la CPU, 1280×720); rete, palle della CPU, stesso schermo e
  ledwall non sono stati fotografati.
- **Il riquadro con una scheda grafica vera** e su Android: il costo è misurato con la grafica in software del banco.
- **La casella «Al servizio» in una partita lunga con persone vere**: la cima di chi batte si misura al primo servizio e
  si tiene il punto più alto di 1,2 s; se una posa del servizio mai vista in quel tempo (per esempio un'animazione nuova)
  alzasse la racchetta più in alto, la racchetta potrebbe toccare la casella di qualche pixel. Nelle prove (Classici e
  Lob & Drop, 20 schermate) la casella resta sempre sopra la sagoma.
- **La casella «Al servizio» su un ledwall vero, guardata da lontano**: provata nel browser a 1280×720, 1920×1080 e in
  un'area 720×720; se sul ledwall servisse più grande, il limite è il numero più alto (24 px) e la crescita (1,09 cqw,
  1,94 cqh) in `natpf-hud.css`.
- **La scritta del segnale con persone vere**: non si sa se 3 palle bastano; il numero è una costante
  (`CUE_HINT.balls` in `natpf_timing_cue.js`).
