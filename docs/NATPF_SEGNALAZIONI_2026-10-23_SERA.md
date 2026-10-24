# Segnalazioni della sera del 23/10: sfida online, Player 2, gioco a rete, gesti verticali, impugnatura

Due richieste della sera del 23/10, dopo la consegna del giorno (`NATPF_DIAGNOSI_2026-10-23.md`):

1. «La modalità multiplayer su Cloudflare non va; la calibrazione dei gesti del Player 2 non vede l'arena di
   allenamento; la lobby 1v1 online va resa più semplice e immediata».
2. Sei punti di gioco: colpi a rete con il tempo perfetto che finiscono in rete; punto con la palla fuori (chi ha
   sbagliato, chi vince); moviola che non mostra l'ultimo punto; pallonetti e palle corte quasi mai riusciti; figura
   dell'impugnatura poco chiara; corsa in avanti senza motivo dopo il servizio. «Verifica ogni punto nel gameplay
   effettivo prima di considerarlo risolto».

Per ogni punto: causa trovata, correzione, verifica automatica (test, banchi, prove nel browser con il telefono
simulato), prova fisica da fare. **Nessuna prova fisica è stata eseguita**: qui non ci sono telefoni veri, persone,
webcam né due computer su reti diverse.

## 1. Stato

| Punto | Commit | Stato |
|---|---|---|
| Player 2: calibrazione nel campo d'allenamento | `4699a2e` | fatto, provato nel browser; prova fisica da fare |
| Corsa in avanti dopo il servizio | `186d898` | fatto, provato nel browser a Casual, Pro e Leggenda; prova fisica da fare |
| Fine del punto: chi vince, chi ha sbagliato | `9ab1c7f` | fatto, provato nel browser; prova fisica da fare |
| Moviola dell'ultimo punto | `d5a4333` | fatto, provato nel browser; prova fisica da fare |
| Colpi a rete con il tempo perfetto | `8fe6f27` | fatto, banco e browser; prova fisica da fare |
| Pallonetto e palla corta | `3f84f1a`, `da5d1b0` | fatto, braccio simulato e browser (la prova in partita è passata solo con `da5d1b0`, §7); **prova fisica necessaria** |
| Figura dell'impugnatura | `d216f73` | fatto, schermate delle quattro pagine; da confermare con chi gioca |
| Sfida online: perché non va, lobby più semplice | questo giro (§8) | diagnosi e lobby fatte; **decisione aperta sul relay** (§8.4) |

## 2. Player 2: la calibrazione nel campo d'allenamento (`4699a2e`)

- Causa: il Player 2 calibrava nel pannello del telefono, senza campo e senza palle. Dopo i due gesti chiedeva un
  «colpetto libero», poi due pulsanti («Conferma la racchetta», «Continua»). Chi non li trovava restava lì e l'host
  aveva «Gioca» spento. Riprodotto nel browser con il telefono simulato sul sito statico.
- Ora «Collega il telefono ›» → QR → appena il telefono ha i sensori attivi, calibrazione nel campo d'allenamento (lo
  stesso riscaldamento del Player 1, solo calibrazione); finita, il Player 2 è pronto da solo. Durante la calibrazione
  il motore del Player 2 gioca in locale, e l'host non può far partire la partita.
- Verifica: `npm test`, 1v1 nel browser 18/18, percorso del Player 2 con il telefono simulato (invito → QR →
  calibrazione in campo → pronto → partita).

## 3. Corsa in avanti dopo il servizio (`186d898`)

- Causa (banco): il servizio rimbalza sempre nel quadrato e il piano d'intercetto lo trattava come una palla corta.
  Chi rispondeva correva dalla riga di fondo a 5,5–6,5 m dalla rete nel 100% dei servizi, a tutti i livelli.
- Ora la risposta si prende dal punto comodo raggiungibile con meno strada, fino a 1,72 m d'altezza: si risponde da
  11,2–11,9 m. La corsa era anche un handicap nascosto: a Leggenda i punti vinti in risposta erano il 6,1% (ora 47,1%).
  La difficoltà ora sta nel servizio della CPU per livello.
- Verifica: test nuovo (fallisce sul codice di prima); nel gioco vero con il telefono simulato
  (`tools/e2e/natpf-gameplay-23-10.mjs`, parte A) chi risponde resta in fondo e colpisce da 11,1–12,5 m a Casual, Pro e
  Leggenda; `audit:legend` tutti i criteri.

## 4. Fine del punto: chi vince e chi ha sbagliato (`9ab1c7f`)

- Causa: il messaggio era il punteggio («30 - 15», «Vantaggio» senza dire di chi) con sotto «Fuori» o «Rete». Non
  diceva chi avesse sbagliato né a chi andasse il punto; la vittoria della CPU diceva «Game!».
- Ora in grande «Punto tuo» (verde) o «Punto della CPU» (rosa); sotto «Errore della CPU: palla fuori», «Errore tuo:
  palla in rete», «Vincente!», «Ace della CPU», «Palla non presa», e il punteggio dal proprio lato. Nel 1v1 il Player 2
  vede il messaggio dal suo lato.
- Verifica: `natpf-point-call.test.mjs`; nel gioco vero (`natpf-gameplay-23-10.mjs`, parte B) a ogni fine punto il
  messaggio corrisponde a chi ha vinto e perché.

## 5. Moviola dell'ultimo punto (`d5a4333`)

- Causa: «Rivedi il punto» non registrava nulla. Metteva in scena sempre lo stesso scambio a rete del modello di
  partenza.
- Ora `natpf_replay.js` registra il punto (30 volte al secondo: palla, giocatori, inizio dei colpi) e la moviola lo
  rimette in scena al rallentatore (0,55), con la telecamera di lato; poi si torna al servizio. La voce «Moviola» della
  pausa c'è solo dopo un punto finito.
- Verifica: `natpf-replay.test.mjs`; nel gioco vero dalla pausa (parte C): 79 campioni su 79 sulla traiettoria
  registrata, 4,9 s di punto in 9,5 s di moviola.

## 6. Colpi a rete con il tempo perfetto (`8fe6f27`)

- Causa 1 (esito): a Leggenda la palla corta della CPU ripresa di corsa arrivava a qualità 0,55–0,62 (soglia 0,63) per
  la situazione (corsa, allungo, palla veloce, preparazione). Il colpo falliva in rete anche con il tempo perfetto:
  67 riprese su 70.
- Causa 2 (messaggio): per la palla in rete il motore lascia il bersaglio in campo e abbassa la traiettoria; il
  messaggio leggeva il bersaglio e diceva «Perfetto» con l'anello verde in campo.
- Ora a rete (entro 5 m) con il tempo perfetto la situazione rende la palla debole (corta e alta), non la manda in rete
  né lunga. Resta l'errore degli scambi lunghi (pressione). Il messaggio dice «In rete» (rosso, senza anello), e il
  colpo debole o fallito ha il motivo («palla debole: in allungo», «scambio lungo»).
- Verifica: scenario a Leggenda 70/70 oltre la rete; `audit:legend` tutti i criteri (contro «preciso» 60,5%); nel
  gioco vero (parti D–E) 11/11.

## 7. Pallonetto, palla corta e impugnatura (`3f84f1a`, `d216f73`)

- Cause, trovate con un braccio simulato (`test/arm-sim.mjs`: il telefono gira con il braccio attorno a spalla, gomito
  o polso, con l'accelerazione vera della mano):
  - il telefono scartava i gesti verticali senza verso di dritto o rovescio: la palla corta dall'alto verso il basso a
    ogni velocità, il pallonetto sotto il 40% del proprio colpo; e i gesti lenti sotto il 28%. Banco di 96 gesti
    verticali: prima 44 riconosciuti e 52 persi, ora 94 riconosciuti, 2 letti come top spin, 0 persi;
  - il tremolio misurato nel passo «fermo» prendeva la coda della presa sistemata con calma: soglie a 300 °/s per tutta
    la partita. Ora al massimo 30 °/s;
  - con il telefono capovolto il pallonetto si leggeva top spin;
  - con il telefono dritto e il gesto di polso, salita e piano non distinguono pallonetto, palla corta e dritto: gli
    esercizi dicevano «Ho imparato il tuo gesto» senza imparare niente. Ora imparano il proprio pallonetto e la propria
    palla corta (salita, piano, forza) e il messaggio dice il vero.
- Impugnatura: una figura nuova (`site/js/tennis/grip-art.js`), la stessa nella lobby, nel pannello del telefono, nella
  guida e sulla pagina del telefono: di lato (si vede il display, a destra o a sinistra; la cima in alto e un poco in
  avanti), dallo schermo (si vede solo il bordo), «così no» (piatto, display verso lo schermo).
- **Correzione di questo resoconto.** Il commit `3f84f1a` diceva «in partita 8 colpi su 8 come il gesto», ma sul
  codice salvato la prova nel browser falliva sempre: 8/9, in partita la seconda e la terza palla corta erano «colpo
  normale» (trovato dalla CI completa, ripetuto tre volte, uguale su `3f84f1a`). Cause, dai dati di ogni colpo:
  - i primi gesti degli esercizi, letti «normali» prima che il gioco li avesse imparati, insegnavano il colpo normale:
    in partita, con pochi dritti, il colpo normale diventava la propria palla corta e il prototipo della palla corta non
    si usava più;
  - la forza del confronto con i propri gesti seguiva il colpo tipico, che si sposta con i colpi della partita.

  Correzione (`da5d1b0`):
  - i gesti chiesti dagli esercizi speciali non insegnano più niente del colpo normale;
  - prototipi e colpo normale usano la forza assoluta del gesto, la stessa per tutta la sessione, e il colpo normale parte
    da quello della calibrazione.
- Verifica dopo la correzione:
  - `natpf-gesti-speciali.test.mjs`, con un test nuovo che rifà la sequenza della prova nel browser (con la logica di
    prima, a 0°, tutte le palle corte diventano top spin);
  - gioco vero nel browser (`tools/e2e/natpf-gesti-speciali.mjs`, telefono dritto, gesti di polso): 9/9 in tre
    ripetizioni su tre; esercizi superati, in partita 8 colpi su 8 come il gesto, nessun gesto scartato;
  - schermate delle quattro pagine con la figura.
- Prova fisica necessaria: il braccio simulato non è una mano vera.

## 8. Sfida online sul sito pubblicato (questo giro)

### 8.1 Cosa è stato provato

- Il codice della sfida senza server funziona con il server di segnalazione pubblico, lo stesso del sito pubblicato.
  Build di questo giro, due finestre del browser sullo stesso computer, uscita verso internet dal contenitore: il
  Player 2 si collega in 0,5 s, l'host lo vede pronto, la partita parte (con la build di prima: 1 s). Lo stesso percorso con il server di
  segnalazione locale è nella prova `tools/e2e/natpf-1v1-p2p.mjs`.
- Quello che qui non si può provare: due computer veri su due reti diverse. La segnalazione mette in contatto i due
  computer; poi i browser cercano una strada diretta (rete locale, indirizzo pubblico trovato con STUN, server TURN).
  Il sito non ha un relay proprio: si usano i server pubblici di STUN e TURN della libreria, senza garanzie. Dietro un
  firewall, un NAT simmetrico (reti d'ufficio, di scuola, d'albergo, alcune reti mobili) o una VPN la strada diretta
  può non esistere.
- Il difetto trovato è che il gioco non lo diceva. Il Player 2 restava su «Mi collego…» e l'host su «In attesa del
  Player 2…», per sempre, senza un motivo né un consiglio.

### 8.2 Diagnosi del collegamento (`natpf_p2p.js`)

- Ogni tentativo che non apre il canale si classifica:
  - **rete che blocca**: l'altro computer ha risposto (stato ICE «checking») o ICE è fallito;
  - **host muto**: nessuna risposta; dopo 20 s «forse ha chiuso la partita»;
  - **host introvabile**: non registrato sul server di segnalazione.
- P2 e host lo dicono subito, con i consigli: un'altra rete (per esempio casa invece di ufficio o scuola), senza VPN,
  oppure i due computer sulla stessa Wi-Fi. Il Player 2 riprova da solo e, appena la rete lo permette, entra; gli
  avvisi spariscono.
- Il Player 2 aspetta il canale 12 s (prima 8 s), l'host 15 s.
- Gli errori del server di segnalazione hanno testi chiari, con il codice tra parentesi.
- Diagnostica (Maiusc+D): evento `sfida.collegamento` con stato, errore, tentativi bloccati e dettaglio (stato ICE e
  tipi dei candidati di questo computer, per esempio «checking · host+srflx»: senza «srflx» lo STUN è bloccato, senza
  «relay» nessun TURN raggiungibile). Il dettaglio è anche nel suggerimento della riga di stato.

### 8.3 Lobby più semplice

- **Invito subito**. Scelto «Sfida un amico», la barra dell'invito (codice, link, «Copia link», «Condividi» dove il
  browser lo permette, una riga con lo stato del Player 2) sta in cima alla lobby. Resta in vista in «Racchetta»,
  «Collega» e «Partita». Prima codice e link comparivano solo nell'ultima pagina, dopo racchetta, telefono e
  riscaldamento: l'amico non poteva entrare mentre l'host si preparava.
- **Una riga di stato**:
  - «In attesa di Player 2: mandagli il link (lo apre sul suo computer) o dettagli il codice»;
  - «Player 2 è entrato: collega la racchetta e la prova in campo»;
  - «Player 2 è pronto ✓ Premi «Gioca»»;
  - oppure il problema di rete.
  
  Prima c'erano tre righe di passi più una riga del collegamento. «Creo la stanza…» mentre nasce; dopo 20 s l'errore
  con «Riprova».
- **Entra con il codice**. Nella pagina «Scegli la modalità» c'è il campo «Ti hanno invitato? Scrivi il codice della
  stanza»: va bene anche minuscolo, senza trattino o senza «AT». Porta alla pagina del Player 2: sul sito pubblicato
  con il collegamento diretto, in LAN con il server.
- Pagina «Partita» della sfida: senza la tessera del livello (la modalità è già scelta). Ora sta in una schermata con
  «Gioca» in vista a 1280 × 800; prima «Gioca» finiva sotto il bordo.
- Pagina «Collega» compatta sugli schermi bassi: pannello e passi più stretti, figura dell'impugnatura a 200 px (170 px
  sotto i 700 px d'altezza, come il QR). Misurato senza gli avvisi di «localhost», che sul sito pubblicato non ci sono:
  con la barra dell'invito le pagine «Racchetta», «Collega» e «Partita» stanno in una schermata, con il pulsante in
  vista, a 1280 × 800, 1366 × 657 e 1920 × 1080. Prima a 1366 × 657 il pulsante di «Collega» finiva sotto il bordo già
  senza la barra.
- **Player 2**:
  - una riga sola con lo stato e, se non si collega, il perché;
  - aperto sul telefono (l'invito arriva spesso in una chat), un avviso dice che la partita si gioca dal computer, con
    «Copia link»;
  - nel campo, l'HUD non dice più «inquadra il QR per usare il telefono»: il telefono-racchetta si collega al computer
    del Player 2, non al relay, e quel messaggio compariva sempre;
  - l'host non legge più «Player 2 pronto» sotto l'avatar appena il Player 2 entra.

### 8.4 Decisione aperta: un relay perché funzioni su ogni rete

Senza un relay proprio, la sfida online non può funzionare su ogni rete: la diagnosi dice quando è la rete, non la
risolve. Tre strade, da scegliere:

1. **Server TURN di Cloudflare** con un piccolo Worker che crea credenziali temporanee.
   - Serve un token dell'account e il Worker nel deploy: il sito non sarebbe più solo statico.
   - Il gioco resta in collegamento diretto quando si può e passa dal TURN quando la rete lo blocca.
2. **Relay della partita su Worker** (WebSocket attraverso Cloudflare, senza WebRTC tra i due computer).
   - Funziona dove funziona il sito.
   - Il ritardo dipende dal punto d'appoggio della rete di Cloudflare; serve codice lato server (Worker e lo stato
     della stanza).
3. **Nessun relay**: restano la diagnosi e i consigli di §8.2.

### 8.5 Verifica

- Test: `natpf-p2p.test.mjs` (rete finta: canale bloccato con l'host che risponde, ICE fallito, host muto, rete che
  torna libera; i test della rete bloccata falliscono sul codice di prima, che restava su «connecting» senza errore),
  `natpf-versus.test.mjs` (riga dell'host, riga del Player 2, codice scritto a mano, pagina del Player 2),
  `natpf-flows.test.mjs` (invito in vista dai passi giusti, stanza che non nasce, ingresso con il codice, HUD del Player
  2 e dell'host), `natpf-diag.test.mjs` (evento `sfida.collegamento`).
- Browser (`tools/e2e/natpf-1v1-p2p.mjs`, due sessioni vere, PeerJS e server di segnalazione locale), oltre al
  percorso completo di prima:
  - invito già nella pagina della racchetta;
  - Player 2 che entra scrivendo il codice;
  - riga di stato in attesa → entrato → pronto;
  - avviso sul telefono;
  - **rete che blocca**: i candidati dell'altro computer riscritti su un indirizzo irraggiungibile, su tutti e due i
    computer. Host e Player 2 lo dicono con i consigli e con il dettaglio ICE; rete di nuovo libera → il Player 2 entra
    da solo.
- Prova fisica da fare: due computer su due reti diverse (per esempio uno a casa e uno con l'hotspot del telefono),
  poi sulla stessa Wi-Fi. Con la diagnostica accesa su tutti e due, il rapporto dice stato e dettaglio del collegamento.

## 9. Verifica complessiva (automatica)

- **CI completa** sul commit `dbc41b4`, in una copia separata, in sequenza.
  - Test: del sito 148/148, del gioco 368/368.
  - Pagina storica:
    - telefono 10/10 e tempi 8/8;
    - gesto e calibrazione 18/18;
    - grafica 9/9;
    - pacchetto ridotto 5/5, 6/6 e 10/10;
    - LAN in Node 4/4, nel browser 3/3 e 7/8 (il limite noto del contenitore);
    - pacchetti creati.
  - Gioco nel browser:
    - scambio 7/7, diagnostica 24/24, allenamento 13/13, latenza 9/9;
    - presa verticale 10/10, presa del 19/10 10/10;
    - menu 22/22, ricollegamento 6/6, rete che cade 6/6, schermo del telefono 13/13;
    - gioco del 23/10 11/11, 1v1 25/25.
  - Due prove non passate:
    - **gesti speciali 8/9**: difetto vero, presente già in `3f84f1a`, corretto in `da5d1b0` (§7);
    - **webcam 9/10**: con la webcam finta senza mano è partito un colpo, mentre il modello cambiava livello (in quel
      secondo un'inferenza è durata 2,1 s). Da sola la prova passa 10/10 tre volte su tre. Il codice della webcam
      stasera non è cambiato. Resta da tenere d'occhio su un computer molto lento.
- **Prova LAN della sfida** (`natpf-tennis/test/e2e/lan-e2e.mjs`, parte 1v1, fuori dalla CI): dava 7/10 anche sul commit
  della consegna precedente. Era la prova, non la sfida: l'host restava sull'intro e con il telefono come racchetta,
  senza telefono, quindi in pausa. Aggiornata (`f0e5abb`): 10/10, colpi del Player 2 attraverso il relay del server LAN,
  scambio di 14 colpi, punteggio uguale sui due computer.
- **Sul codice finale**, dopo le correzioni:
  - test del sito 148/148, del gioco 370/370;
  - allenamento 13/13, diagnostica 24/24, scambio 7/7, menu 22/22;
  - gesti speciali 9/9 (tre volte su tre), gioco del 23/10 11/11;
  - 1v1 25/25, LAN 1v1 10/10.

- **Pacchetti** dal commit `21dc579`, build `2026-10-23.3` (la versione nella diagnostica di ogni sessione), provati
  estratti in cartelle nuove:
  - `natpf-simulator-cloudflare-20261023-3.zip`: 23,7 MiB, 74 file, nessuno oltre 25 MiB; la sfida 1v1 nel browser sullo
    zip servito come sito statico 25/25;
  - `natpf-simulator-lan-windows-20261023-3.zip`: 57,2 MiB, Node.js 22.22.0 per Windows verificato; certificato creato e
    server HTTPS che risponde con gioco, pagina del telefono, modelli delle mani, grafiche, avvio guidato e relay 1v1;
  - nessun file di certificati o chiavi, nessun nome vietato.

## 10. Prova fisica (da fare)

Con la diagnostica accesa (`NATPF_PROVA_GUIDATA_2026-10-23.md` §0):

1. **Impugnatura**: guardare la figura nella lobby o sulla pagina del telefono e tenere il telefono così. Va bene?
2. **Pallonetto e palla corta**: nel riscaldamento i due esercizi; in partita 5 pallonetti (dal basso verso l'alto,
   deciso) e 5 palle corte (dall'alto verso il basso, morbido). Atteso: colpi come il gesto, nessun gesto scartato nel
   rapporto.
3. **A rete**: a Leggenda, riprendere di corsa le palle corte della CPU con il tempo giusto. Atteso: palla debole ma
   oltre la rete; se va in rete, il messaggio dice «In rete» e perché.
4. **Fine del punto**: dopo una palla fuori, il messaggio dice chi ha sbagliato e di chi è il punto.
5. **Moviola**: dopo un punto, Pausa → Moviola. Atteso: l'ultimo punto, al rallentatore.
6. **Risposta al servizio**: si risponde da fondo campo, senza corsa in avanti.
7. **Sfida online**: §8.5.
