# B41 seconda parte · richieste dell'utente del 14/11/2026 (da fare insieme a B41.4–B41.5)

Parole dell'utente (14/11, dopo la prova della 2026-11-14.1): «in modalità evento quindi fiera, dopo "rivincita", devo poter
impostare i livelli di difficoltà (es. adulto bambino ragazzo). Inoltre ha più senso lasciare la battuta ad un solo
giocatore piuttosto che alternata perché la gente non lo capisce. Infine, tra il momento degli scambi della calibrazione e
del match, prevedi un countdown grosso centrale che dice "Preparati, la partita sta per cominciare".»

1. **Livelli dopo «Rivincita» (fiera).** In modalità fiera «Rivincita» non riparte subito con lo stesso livello: prima si
   sceglie il livello con il mouse (contro la CPU «Chi gioca»: Bambino · Ragazzo · Adulto; nello stesso schermo le fasce
   di ciascun giocatore), poi la partita. Va con la pagina della fiera (B41.5) e «Prossimo giocatore».
2. **Battuta a un solo giocatore (fiera).** Niente servizio alternato game per game. Contro la CPU batte sempre il
   visitatore (regola pura `fairServer` della B41 prima parte, da applicare al punteggio). Nello stesso schermo
   (decisione del coordinatore, da dire all'utente): batte per tutta la partita chi batte il primo game (opzione «Chi
   serve» di sempre). Il tabellone e la casella «Al servizio» restano coerenti; i test del punteggio coprono tie-break e
   formato veloce.
3. **Conto alla rovescia grande prima della partita (tutti i modi).** Tra la fine degli scambi di prova e il primo punto:
   al centro dello schermo, grande, «Preparati, la partita sta per cominciare» con 3 · 2 · 1. Contro la CPU dopo «Sono
   pronto» o «Gioca» (prende il posto del conto piccolo della B41.6), nello stesso schermo subito dopo gli scambi di prova.
   Misure con cqw/cqh, leggibile sul ledwall; la voce del gioco solo in inglese, se c'è.
