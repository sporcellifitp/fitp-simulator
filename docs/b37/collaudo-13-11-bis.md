# B37 · Collaudo del 13/11, seconda parte (fuori vero, chi serve, segnale spiegato, pannello dal programma Windows)

Collaudo dell'utente del 13/11 (11:25 UTC) su una versione con B35a e B35b uniti (base `1043c85`). Quattro punti, tutti
fatti in questo blocco (ramo `b37-collaudo-bis`):

1. **«Fuori» e punto solo quando la palla esce davvero** (anche quando finisce la partita);
2. **chi deve servire con un elemento di gioco**: una gemma sopra il personaggio e il riquadro di servizio colorato a terra;
3. **il «cerchietto bianco che segue la palla» spiegato** le prime volte che compare;
4. **pannello dello stand dal programma Windows**: tasto **F9** e voce del menu.

Il gioco non cambia: esito dei colpi, direzione (B35a), punti, livelli e CPU sono quelli di prima (impronte e
`audit:legend` uguali, più sotto). Il riconoscimento dei gesti non è toccato.

## In breve: cosa cambia per chi gioca

| Punto | Prima | Adesso |
|---|---|---|
| 1 · fuori | Appena colpita la palla compariva «Fuori» (o «In rete»), un anello rosso a terra dove sarebbe caduta e il telefono vibrava l'errore, quasi un secondo prima che la palla cadesse | «Fuori» / «In rete», l'anello rosso (dove è caduta davvero), il telefono (scritta e vibrazione dell'errore), il punto e la voce arrivano **insieme, quando la palla tocca terra fuori o tocca la rete**. Al colpo solo il colpo (scritta neutra sul telefono). Se l'avversario prende la palla al volo, nessun «Fuori» |
| 1 · fine partita | La schermata di fine arrivava 1,8 s dopo l'ultima palla, ma il «Fuori» si leggeva già al colpo | L'ultima palla atterra, poi «Fuori» e «Partita della CPU», e la schermata di fine 1,8 s dopo: si vede tutta |
| 2 · chi serve | Solo la scritta «Al servizio» sopra chi batte | Una **gemma gialla (accento #E8FF3A) con il bordo scuro** gira sopra la testa di chi deve battere e il **riquadro dove deve cadere il servizio** è colorato a terra con il contorno luminoso; spariscono quando parte la palla. La scritta «Al servizio» resta, più piccola, sopra la gemma |
| 3 · cerchietto bianco | Un anello bianco seguiva la palla senza spiegazione | Nelle prime 3 palle di ogni partita in cui compare, in basso al centro: **«Colpisci quando il cerchio diventa verde»** (con un cerchio bianco e uno verde disegnati); poi sparisce. La guida dice le stesse parole |
| 4 · pannello | Solo Ctrl+Maiusc+K (sul PC dello stand non funzionava) o 3 s sul marchio NATPF | Nel programma Windows anche **F9** (funziona anche a schermo intero) e il menu **NATPF → «Pannello dello stand (F9)»**. Ctrl+Maiusc+K resta |

## Come si attiva / come si spegne

- **Punto 1 · fuori all'atterraggio**: sempre, in partita (contro la CPU, stesso schermo, sfida tra due computer). Non ci
  sono opzioni. Nell'**allenamento**, nei **minigiochi** e negli **scambi di prova** resta come prima (l'esito subito fa
  parte della lezione: la scheda dell'esercizio dice «Fuori: troppo presto» al colpo).
- **Punto 2 · gemma e riquadro**: sempre, quando qualcuno deve battere (prima che lanci la palla e mentre la palla è in
  aria), in partita e nell'allenamento. Non ci sono opzioni. In **prima persona** la gemma non sta sopra di sé (la camera è
  lì): resta il riquadro. Nella moviola e nella dimostrazione dietro il menu non ci sono.
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
| Stesso schermo | come sopra, in tutte e due le metà e sul telefono del Player 2 | come sopra, per tutti e due i giocatori |
| Sfida tra due computer | il Player 2 vedeva «Fuori» al suo colpo sul suo computer; l'host vedeva «Fuori» del Player 2 al colpo | l'host decide il punto quando la palla cade (come prima); il Player 2 vede il verdetto quando la palla cade sul suo computer o, se lì non è ancora caduta, quando arriva la scritta del punto dall'host |
| Palle della CPU | niente scritte: il punto arrivava già quando la palla toccava terra | come prima (provato: nessun segno prima dell'atterraggio, punto e «Punto tuo» sul telefono quando cade) |
| Servizio fuori, doppio fallo | non esistono: il servizio dal gesto e quello della CPU cadono sempre nel riquadro (provato con 400 servizi a caso) | come prima |
| Punteggio, voce, scritta del punto, game, set, partita, statistiche, registro dello stand | quando la palla tocca terra o la rete | uguale |

Se la previsione diceva «fuori» ma la palla cade dentro (di rado, a pochi centimetri dalle righe), al primo rimbalzo
compare l'esito in campo («Anticipo», «Buono»…). Se l'avversario
prende al volo una palla che sarebbe uscita, nessun «Fuori»: la palla è in gioco. Il volo della palla e l'esito dei colpi
sono quelli di prima (impronte uguali).

**Fine partita.** Sul punto della partita la palla cade, nello stesso istante compaiono «Fuori», «Partita della CPU» e il
tabellone finale, e la schermata di fine arriva 1,8 s dopo (come prima): la palla ferma a terra e la scritta si vedono.

**Misure (prova nel browser `natpf-fuori-vero`).** Partita vera a 1 game contro la CPU con il telefono simulato (pagina del
telefono e collegamento veri). Batte la CPU; il primo colpo di chi gioca è lasciato com'è, i quattro dopo sono mandati
apposta fuori largo, in rete, fuori largo e fuori largo sul 0-40 (punto della partita): si cambia solo dove cade la palla
di quel colpo, poi tutto il resto è il gioco vero. Millisecondi dal colpo, orologio del computer (il telefono è una seconda
pagina nello stesso browser); due giri prima e due dopo.

| Che cosa (ms dal colpo) | Prima, giro 1 | Prima, giro 2 | Adesso, giro 1 | Adesso, giro 2 |
|---|---|---|---|---|
| **Palla a terra fuori** (largo) / **sulla rete** | 967, 815, 849 / 534 | 994, 833, 850 / 484 | 946, 830, 866 / 517 | DOPO2_VOLO |
| Scritta «Fuori» / «In rete» nell'angolo | **7, 9, 9 / 7** (al colpo) | **11, 7, 6 / 6** (al colpo) | 959, 837, 874 / 525 | DOPO2_SCRITTA |
| Anello rosso a terra | **5, 7, 8** (al colpo, dove cadrà) | **10, 5, 4** (al colpo) | 949, 833, 869 (dove è caduta); rete: nessuno | DOPO2_ANELLO |
| Telefono: «Fuori» / «In rete» e vibrazione dell'errore | **11, 8, 11 / 6** (al colpo) | **10, 7, 5 / 6** (al colpo) | 951, 834, 869 / 521 | DOPO2_TEL |
| Tabellone (punto assegnato) | 970, 816, 851 / 536 | 997, 834, 852 / 486 | 952, 834, 871 / 522 | DOPO2_TAB |
| Scritta grande del punto | 973, 817, 852 / 537 | 998, 835, 852 / 488 | 957, 835, 872 / 523 | DOPO2_BANNER |
| Voce «Out!» / «Net!» (sul punto della partita la voce della fine partita) | 974, 817, – / 537 | 998, 835, – / 488 | 957, 835, – / 523 | DOPO2_VOCE |
| Telefono «Punto avversario» | 971, 816, 852 / 537, sotto «Fuori» | 997, 835, 854 / 486, sotto «Fuori» | 959, 836, 871 / 524, sotto «Fuori» o «Fuori · In anticipo» | DOPO2_TELP |
| Schermata di fine partita (ultima palla) | 2654 (1,80 s dopo la palla a terra) | 2654 (1,80 s dopo) | 2673 (1,81 s dopo) | DOPO2_FINE |
| Scritta di un colpo rimasto in campo | 17 | 18 | 20 | DOPO2_CAMPO |

In breve: **prima** la scritta, l'anello rosso e il telefono dicevano l'errore 4–11 ms dopo il colpo, cioè da mezzo
secondo a un secondo **prima** che la palla toccasse terra o la rete; **adesso** arrivano 3–13 ms **dopo** (lo stesso fotogramma del
punto, il telefono entro pochi millesimi). Il punto, il tabellone, la voce e la schermata di fine partita arrivano quando
arrivavano prima. I colpi che restano in campo hanno la scritta subito, come prima.

## Punto 2 · Chi deve servire: gemma sopra il personaggio e riquadro a terra

- **Gemma** (`natpf_serve_marker.js`): due piramidi unite a punta in giù, gialla accento con il bordo blu scuro, che gira e
  oscilla piano sopra la testa di chi deve battere. Si misura la cima del personaggio (Classici, mascotte di Lob & Drop
  con la testa grande e la racchetta alzata) e la gemma sta 34 cm più su. Per ogni camera ha quasi la stessa misura a
  schermo: quando chi batte è lontano (la CPU in fondo, il Player 2 visto dalla metà del Player 1) la gemma si ingrandisce
  fino a 2,6 volte, solo per quella camera; nello stesso schermo ogni metà la vede della misura giusta.
- **Riquadro di servizio**: il quadrato in diagonale nella metà di chi riceve, dove deve cadere il servizio, con un
  riempimento giallo leggero che pulsa e il contorno giallo appena dentro le righe bianche del campo. È lo stesso
  quadrato dove il gioco manda davvero il servizio (provato con 24 servizi veri: chi gioca e CPU, lato della parità e del
  vantaggio, servizio dal gesto e senza).
- Si vedono solo prima che la palla parta (giocatore fermo al servizio e palla lanciata), poi spariscono.
- **La scritta «Al servizio» resta**, più piccola e scura (testo giallo su blu), sopra la gemma: è secondaria.
- Contro la CPU (batte chi gioca o la CPU), nello stesso schermo (tutte e due le metà, batte il Player 1 o il Player 2),
  nella sfida tra due computer (la gemma è nella scena: ogni computer la disegna sopra chi batte secondo il punteggio che
  arriva dall'host) e nell'allenamento.

SCHERMATE_SERVIZIO

COSTO_SERVIZIO

## Punto 3 · Il «cerchietto bianco che segue la palla»

È il **segnale del momento giusto** (B18.2): un anello bianco che si stringe sulla palla e diventa verde quando è il
momento di colpire. Non è cambiato niente su quando è acceso e su come si stringe. Adesso **le prime volte si spiega**:

- nelle **prime 3 palle di ogni partita** in cui l'anello compare, in basso al centro c'è la scritta **«Colpisci quando il
  cerchio diventa verde»** con un cerchio bianco e uno verde disegnati accanto; resta finché c'è l'anello e 0,7 s dopo,
  poi sparisce; dalla quarta palla niente;
- si rivede con una **partita nuova** e con **«Nuovo giocatore»**;
- la **guida** (passo «Colpisci quando la palla arriva») e l'avviso delle **Opzioni** dicono le stesse parole: «un cerchio
  bianco si stringe sulla palla: colpisci quando il cerchio diventa verde»;
- con il segnale spento (di base con «Ragazzo» e con i livelli Facile, Esperta e Leggenda, oppure sempre con «Segnale del
  momento giusto: No») né anello né scritta.

SCHERMATE_SEGNALE

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
