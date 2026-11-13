# PROGETTO · Modalità fiera (B41)

Base: `natpf-simulator` @ `bbd6083`, versione 2026-11-13.9. Il codice è uguale a `4ac755c`: dopo sono cambiati solo i
documenti. Lavoro in sola lettura: nessun file del repository toccato, nessuna suite lanciata.
Segni:
- **[V]** verificato leggendo il codice; le righe chiave sono ricontrollate per questo progetto.
- **[VS]** verificato con uno script. Nello scratchpad `fiera/` ho rieseguito `gate-check.mjs`, `retry-check.mjs` e
  `flusso/puri.mjs`: risultati uguali a quelli delle letture. `soglie.out.txt` e `presa.out.txt` vengono dalle letture.
- **[D]** dedotto o proposto, non provato.

Mai provato: telefoni veri, browser, Windows, ledwall.

---

## 0. Per l'utente, in breve

**Cosa vuol dire «telefoni calibrati da me».** Il telefono lo colleghi e lo provi tu, una volta. La forza di ogni
persona la impara il gioco da solo nei primi colpi, senza gesti. Un bambino e un adulto colpiscono in modo troppo
diverso: con la calibrazione di un adulto, un bambino perderebbe 7–8 colpi su 9 (domanda 1).

**a) All'inizio della giornata (una volta, circa 2 minuti a telefono)**
1. Accendi il programma. Sul ledwall basta un clic per entrare.
2. Apri il pannello dello stand e scegli «Modalità fiera: Sì». La scelta resta salvata.
3. Si apre «Telefoni dello stand». Per il Telefono 1:
   - inquadri il QR con il telefono, tocchi il link e poi «Attiva i sensori»;
   - sul ledwall e sul telefono compare lo stesso numero (per esempio 482): clicchi «Conferma»;
   - fai la prova: un dritto (deve comparire ←) e un rovescio (→);
   - la scheda dice «Telefono 1 pronto ✓ · batteria 82%».
   Fai lo stesso con il Telefono 2, se si gioca anche in due.
4. Sul telefono imposta lo spegnimento dello schermo al massimo, togli il blocco con PIN e spegni il risparmio
   energetico. Il foglio te lo ricorda.

Dal secondo giorno niente QR: riapri la pagina sul telefono (icona sulla schermata Home), tocchi «Attiva i sensori» e il
telefono si ricollega da solo.

**b) Per ogni visitatore (tu usi solo il mouse)**
- Tu: nella pagina della fiera clicchi chi gioca (Bambino, Ragazzo o Adulto; Esperta o Leggenda per i più bravi),
  «Mancino» se serve, e dai il telefono.
- Il visitatore tocca «Sono pronto» sul telefono, oppure clicchi tu «Gioca». Poi gioca: solo dritti e rovesci. Niente
  QR, niente calibrazione, niente tutorial.
- A fine partita clicchi «Prossimo giocatore», oppure si va avanti da soli dopo 20 s. Il telefono resta collegato e
  riparte da zero per chi arriva.
- In due: scegli «2 giocatori» e chi gioca per ciascuno. Il Telefono 1 sta a sinistra, il Telefono 2 a destra; il
  numero è scritto in grande sul telefono.

**c) Se un telefono si spegne, si blocca o si scollega**
- Schermo spento: la partita si ferma subito e il punto si rigioca. Riaccendi lo schermo (su iPhone serve anche un
  tocco) e si riparte da soli.
- Wi-Fi caduta, programma o PC riavviati: il telefono si ricollega da solo, in rete locale entro circa 20 s. Niente QR.
- Pagina del telefono ricaricata o browser chiuso: riapri la pagina e tocca «Attiva i sensori» (su iPhone anche
  «Consenti»). Il telefono si ricollega da solo.
- Telefono rotto o scarico: in «Telefoni dello stand» abbini un altro telefono a quel posto, con QR e «Conferma»
  (un minuto).
- Sul ledwall il pubblico non vede più un QR utilizzabile: compare «Telefono 1 scollegato: chiama lo staff».
- Batteria sotto il 20%: compare un avviso sul ledwall. Solo con Android: iPhone non dà la batteria.

---

## 1. Cosa c'è già e cosa manca

**Riprendere senza QR**
- C'è già [V]:
  - la chiave di ripresa: guardiano in pairing.js:42-63, hello con `r` in racchetta.js:205, ammissione in
    link.js:199-216;
  - la chiave vale anche dopo 24 h, una sola per posto [VS gate-check].
- Manca [V]:
  - nel gioco id e chiave stanno solo in memoria (link.js:78-80, pairing.js:43);
  - sul telefono stanno nella sessionStorage della scheda (racchetta.js:24-28);
  - quindi, se si ricarica il gioco, tutti i telefoni rifanno il QR.

**Abbinare una volta per tutte**
- C'è già il modello del telecomando dello staff [V]:
  - indirizzo fisso e chiave in localStorage;
  - conferma sul computer;
  - prova HMAC;
  - riferimenti: remote-pairing.js:1-25, :86-92, :97-154; remote-link.js:21-27, :51-54, :205-219;
    natpf_remote.js:50-51, :59.
- Manca: lo stesso per la racchetta.

**Ricollegarsi da solo**
- C'è già nel telecomando [V]: riprova senza fine (remote-client.js:37-45) e subito a ogni visibilitychange, online e
  pageshow (telecomando.js:166-170).
- Manca nella racchetta:
  - fa 10 tentativi in 45 s, poi si ferma (racchetta.js:299) [VS retry-check];
  - non ascolta online né pageshow [V, ricerca nel codice].

**Nessun QR per il pubblico**
- C'è già: niente.
- Manca [V, VS]:
  - quando un telefono cade, il QR torna sul ledwall (natpf_ui.js:347-350, :699-711);
  - chi lo inquadra prende il posto e annulla la chiave del telefono dello stand.

**Telefoni collegati all'avvio**
- C'è già: il telecomando si rimette in ascolto all'avvio (natpf_remote.js:50-51).
- Manca [V]:
  - la racchetta si collega solo da «Collega» o dal pannello (natpf_lobby.js:520-524, natpf_ui.js:539-541);
  - il Telefono 2 solo con lo stesso schermo (natpf_split_ui.js:159-176).

**Azzerare il visitatore senza scollegare**
- C'è già: «Nuovo giocatore» (natpf_new_player.js:53-100) [V].
- Manca: oggi rifà calibrazione e tutorial e chiede il nome (:81-82, :98) [V].

**Profilo neutro per ogni persona**
- C'è già [V]: con «Calibrazione: Nessuna» ogni «Gioca» riparte dal profilo semplice (natpf_ui.js:474-475; freshPlayer
  in natpf_phone_racket.js:846-850).
- Manca: il segno del telefono confermato non si salva; accSign è solo in memoria (racchetta.js:42) [V].

**Adattarsi da solo**
- C'è già [V]: colpo tipico, salita, piatto, mira e livello Evento (§3.3).
- Manca: facoltativa, una forza di partenza per fascia (B41.7).

**Livello**
- C'è già [V]: «Chi gioca» (natpf_who.js:13-19, index.html:649-671).
- Manca: niente.

**Due telefoni**
- C'è già [V]: stesso schermo con schede, conto di 3 s e rivincita (natpf_split_ui.js:70-104, :437-466;
  natpf_ready.js:18-21).
- Manca:
  - i posti fissi;
  - il numero sul telefono: oggi il `cfg` non dice il posto (natpf_phone_racket.js:640) [V].

**Schermo acceso**
- C'è già [V]: Wake Lock e velo «Tocca lo schermo» (phone-keep.js:13-49, :74).
- Manca: l'icona sulla schermata Home per la racchetta (il telecomando ce l'ha: telecomando.html:9-14) [V].

**Batteria**
- C'è già [V]: il dato arriva (racchetta.js:333-335 → link.js:230 → natpf_remote.js:197-201).
- Manca: l'avviso sul ledwall.

**Partire dal telefono**
- C'è già [V]: «Avanti ›» offerto dal gioco (offerNext in natpf_phone_racket.js:676-685; phone-screen.js:61;
  link.js:241).
- Manca: «Sono pronto» che fa partire la partita (richiesta 2 dell'utente del 13/11).

**Pannello e chiosco**
- C'è già: natpf_kiosk.js e natpf_remote.js [V].
- Manca [V]:
  - il chiosco scollega il telefono P1 (natpf_kiosk.js:80, :104);
  - non conta i colpi del P2 come attività (:57).

---

## 2. Collegamento

### 2.1 Abbinamento una volta, dal foglio «Telefoni dello stand» [D]
Copia del telecomando, per due posti (1 e 2).
- **Il QR**:
  - porta a un indirizzo d'abbinamento temporaneo (`racchetta-tel-abbina-…`), che esiste solo a foglio aperto;
  - parsePairing lo accetta, perché chiede solo il prefisso `racchetta-tel-` (pairing.js:37-38) [V];
  - il codice monouso resta quello di oggi, valido 5 minuti (pairing.js:21) [V].
- **La conferma**:
  - chi inquadra il QR non entra subito: il gioco mostra «Un telefono chiede il posto 1 · numero 482»;
  - lo stesso numero compare sul telefono (newPairNumber, remote-pairing.js:67-70);
  - serve «Conferma» con un clic vero (come natpf_remote.js:59), fuori dalla portata del telecomando (NO_REMOTE,
    natpf_remote.js:33).
- **Alla conferma**:
  - nascono indirizzo fisso `racchetta-tel-<26>` e chiave del posto;
  - viaggiano una volta sola nel canale cifrato;
  - si salvano nella localStorage del gioco e del telefono;
  - nel programma Windows la localStorage resta tra i riavvii (main.mjs:24-26) [V].
- **La ripresa**:
  - usa la prova HMAC del telecomando (remoteProof, remote-pairing.js:86-92): la chiave non viaggia;
  - l'indirizzo fisso non compare mai nel QR.
- **Un posto, un telefono**, come oggi (link.js:199) [V]:
  - riabbinare un posto annulla il telefono di prima;
  - quel telefono lo dice: «Non sei più il Telefono 1: chiama lo staff».

### 2.2 Ricollegamento da solo [D]
- **Gioco**:
  - con la modalità accesa, all'avvio ascolta i due indirizzi fissi (come natpf_remote.js:50-51);
  - se l'indirizzo è ancora occupato dal processo di prima, riprova dopo 3 s (come remote-link.js:51-54); oggi
    link.js:134 segna solo 'error' [V];
  - in LAN il server libera l'id entro due giri di ping da 10 s (tools/lan/server.mjs:40-45, :56) [V].
- **Telefono**:
  - legge posto, indirizzo e chiave dalla localStorage;
  - riprova senza fine (attese da 1 a 6 s);
  - riprova subito a ogni visibilitychange, online e pageshow (come telecomando.js:166-170).
- **Resta com'è** [V]:
  - pausa immediata con la pagina nascosta e punto rigiocato (natpf_phone_watch.js:8-16, :31-34);
  - «Ricollega il telefono» (natpf_ui.js:717-722);
  - il contatore degli abbinamenti, per cui con la ripresa il tutorial non riparte (link.js:216).
- **Correzione alla lettura 1** [V]: il server LAN chiede all'id solo `[a-z0-9-]{10,90}` (server.mjs:56). Il prefisso
  lo chiede parsePairing (pairing.js:38).

### 2.3 Schermo acceso e pagina che non si chiude
- Il Wake Lock c'è già (phone-keep.js:13-49) [V].
- Le impostazioni dei telefoni dello staff sono già scritte (docs/b9/schermo-spento.md:92-100) [V]. In più servono il
  blocco app su Android («Fissa app») o l'Accesso guidato su iPhone [D].
- Icona sulla schermata Home anche per la racchetta, con un manifest come telecomando.html:9-14 [D].
- Dopo una ricarica i sensori ripartono solo con «Attiva i sensori».
  - Su iPhone il permesso va chiesto dentro un tocco (racchetta.js:360-364) [V].
  - Su Android si può provare a farli ripartire da soli, perché devicemotion non chiede permesso [D, da provare].
- Va spento il voto del segno con i tocchi (racchetta.js:584-588) sui telefoni tarati: un tocco storto non deve far
  ricalibrare [D].

### 2.4 Cosa mostra il telefono [D]
- **Oggi** [V]: «Pronto · Guarda il computer per iniziare.» con Ricalibra, Ricollega e Scollega (racchetta.js:132, :168;
  phone-screen.js:57; racchetta.html:164-166).
- **Tra una persona e l'altra**:
  - numero grande «1» (o «2») con il colore del posto;
  - «Telefono dello stand · Player 1»;
  - «Pronto ✓ · Dai il telefono a chi gioca».
- **Con la pagina della fiera pronta**: «Sono pronto» (§4.3) e una riga piccola «Destra · Mancino».
- **A fine partita**: «Partita finita · ridai il telefono» (oggi «guarda il computer»: racchetta.js:168 [V]).
- **Ricalibra e Scollega**: nascosti al pubblico, compaiono tenendo premuto 3 s il numero («Staff»).
- **Il posto** arriva nel `cfg` (oggi non c'è: natpf_phone_racket.js:640 [V]). Le pagine di prima lo ignorano.

### 2.5 Due telefoni, posti fissi
- **Telefono 1** = `ui.phone`: P1, contro la CPU e a sinistra.
- **Telefono 2** = `engine.natpfPhone2`: P2, a destra.
  - In fiera nasce all'avvio [D]; oggi nasce solo con lo stesso schermo (natpf_split_ui.js:159-162) [V].
- **Contro la CPU gioca sempre il Telefono 1** [D].
  - Il Telefono 2 resta collegato e fermo.
  - I suoi colpi, fuori da una partita in due, non arrivano al motore (game_engine.js:1735) [V].
  - Scambiare i ruoli dei due telefoni è un lavoro a parte: mano e chiavi del P2 sono salvate a parte
    (natpf_phone_racket.js:416-426) [V].
- **Riserva**: un terzo telefono si abbina al posto di quello rotto (§2.1).

### 2.6 Rete allo stand [D]
- In LAN la pagina del telefono sta sull'indirizzo del PC, https://IP:8443 (natpf_lan.js:10-19) [V].
  - Se l'IP cambia, il telefono perde la pagina e i dati salvati.
  - Serve un IP fisso: router dello stand o prenotazione DHCP.
  - Altrimenti si riabbinano i telefoni ogni mattina, un minuto a telefono.
- Il certificato vale anche per i nuovi IP (tools/lan/certificato.mjs:53-77, dalla lettura 1).
- Via internet con PeerJS, un indirizzo fisso dopo un riavvio non è mai stato provato.

---

## 3. Calibrazione

### 3.1 Cosa salva lo staff e cosa si riusa: la «taratura» del telefono [D]
- **Cosa contiene**: solo quello che dipende dal telefono, cioè il segno dei sensori.
  - Safari su iPhone dà l'accelerazione con il segno opposto (motion-sign.js:1-19) [V].
  - Oggi il segno parte da quello del sistema, si conferma con 4 tocchi e resta solo in memoria (racchetta.js:42;
    motion-sign.js:12, :21-37) [V].
- **La prova nel foglio**:
  - «fai un dritto»: deve comparire ←; «fai un rovescio»: deve comparire →;
  - se è al contrario, si preme «Inverti»;
  - il segno confermato si salva nella localStorage del telefono e diventa il punto di partenza.
- **Cosa non contiene**: forza, asse e piatto abituale, perché sono della persona e della presa
  (calibration.js:220-229) [V].
  - Con l'asse dello staff, un visitatore che tiene il telefono capovolto ha tutti i colpi letti al contrario.
  - Con il verso dalla gravità no [VS presa.out.txt].
- **Controlla anche** sensori, frequenza, Wake Lock e batteria (messaggi st e dev: racchetta.js:335-337) [V].
- **Il profilo dello staff riusato per tutti** si ha solo con «Calibrazione: Con i gesti», che lo tiene fino a
  «Nuovo giocatore» (natpf_phone_racket.js:505-508) [V]. È sconsigliato (§3.6).

### 3.2 Per ogni visitatore
- Si usa il profilo neutro, cioè il profilo semplice di «Salta» (calibration.js:325-331: ref 420, on 70, minPeak 120)
  [V], più il segno della taratura [D].
- Il meccanismo c'è già [V]: con «Nessuna» ogni «Gioca» chiama freshPlayer (natpf_ui.js:474-475).
  - Sul telefono `cal` + `skip` azzerano i colpi giocati e i voti (swing-detect.js:473).
  - Sul computer `_onCal done` azzera colpo tipico, salita, piatto, mira, forma e colpi speciali
    (natpf_phone_racket.js:612-630).
- In fiera continua a valere l'opzione «Calibrazione» (domanda 1):
  - «Nessuna», consigliata: si parte subito;
  - «Giocando»: circa 10 s di scambi di prova, 4 palle tra destra e sinistra (natpf_trial_learn.js:78);
  - «Con i gesti»: profilo dello staff per tutti, sconsigliato.
- Niente gesti e niente tutorial: i telefoni dello stand contano come «tutorial visto». Oggi il tutorial visto vale per
  abbinamento e sta solo in memoria (natpf_phone_racket.js:706) [V].

### 3.3 Cosa si adatta da solo durante la partita [V]
- **Telefono**:
  - colpo tipico per verso dopo 3 colpi, sugli ultimi 8 (swing-detect.js:64, :183-188);
  - posa «pronto» (racchetta.js:39);
  - segno che si gira dopo almeno 4 colpi netti al contrario, da tutti e due i lati (swing-detect.js:45-46, :413-423).
- **Computer**:
  - colpo tipico da 3 colpi sopra 200 °/s, sugli ultimi 24 (natpf_phone_racket.js:138);
  - salita da 3 colpi (:120);
  - lift, piatto e centro della mira da 3 colpi per verso (natpf_gestures.js:83, :105, :159);
  - livello Evento che si regola a ogni punto, più in fretta nei primi 6 (natpf_evento.js:26-33).
- **Banco del B28** (docs/b28/calibrazione-giocando.md:177-199):
  - con «Salta» o «Nessuna» l'errore di forza nei primi 3 colpi è 0,07 per l'adulto e 0,23 per il bambino debole;
  - con gli scambi di prova è 0,03;
  - con «Salta» o «Nessuna» si perdono da 0 a 3 colpi su 120, e i primi 3 colpi per lato non hanno ancora il centro
    della mira.

### 3.4 Cosa si azzera tra due persone e cosa resta [D; righe V]
- **Si azzera**:
  - nome, record dell'Ospite e colpi speciali imparati (natpf_new_player.js:61-66);
  - «Chi gioca» e livello Evento (:68);
  - mano, che torna Destra (:80);
  - nomi e fasce dello stesso schermo (:72-73);
  - quello che il gioco ha imparato dal visitatore (freshPlayer, §3.2).
- **Resta**: abbinamento, taratura, ritardo dello schermo, mira dello stand, opzioni, tutorial visto.
- **Non si chiamano**:
  - resetPlayer, che toglie il tutorial e fa ricalibrare (natpf_phone_racket.js:919-928);
  - il foglio del nome (natpf_new_player.js:98).
- **Telefono scollegato** al momento dell'azzeramento: si azzera appena torna, come fa già recalPending
  (natpf_phone_racket.js:557, :925).

### 3.5 Mancini
- Il verso letto non dipende dalla mano (calibration.js:159-167; expectedStrokeDir in natpf_phone_racket.js:404-413)
  [V].
- Un mancino lasciato su «Destra» gioca lo stesso, ma con il personaggio destro (natpf_new_player.js:12-15) [V].
- «Mancino» si sceglie con un clic nella pagina della fiera, e sul telefono con la riga «Destra · Mancino» [D].
  - Quei pulsanti esistono già (racchetta.js:538-539).
  - Oggi compaiono solo prima dei sensori e alla verifica della calibrazione (phone-screen.js:49) [V].
- La mano torna Destra a ogni visitatore.

### 3.6 Bambini
- «Chi gioca: Bambino» porta al livello Bambini (natpf_who.js:14) [V].
- Con il profilo neutro i colpi da 250–450 °/s passano tutti; sotto circa 180–200 °/s vengono scartati [VS soglie,
  presa].
- Con il profilo di un adulto vengono scartati 7–8 colpi su 9 [VS soglie].
- Se nel collaudo i bambini perdono colpi, si può mandare all'inizio una forza di partenza per fascia con `pf`. Il
  telefono la applica solo sul profilo semplice (racchetta.js:273) [V]. È la tappa B41.7, solo dopo le misure [D].
- Laccetto al polso per tutti [D].

---

## 4. Flusso

### 4.1 Pagina della fiera [D]
- Con la modalità accesa prende il posto del menu principale.
- È la pagina «Pronto per la partita» in versione fiera: stesso passo `match` (index.html:641-732), con le tessere
  «Chi gioca» (:649-671) e le schede dello stesso schermo (:644).
- Così motore e telecomando la conoscono già (natpf_remote_map.js:133) [V].

```
┌ Chi gioca? ───────────────────────────────────── Stand ⚙ ┐
│ [ 1 giocatore · contro la CPU ]  [ 2 giocatori ]          │
│ [ Bambino ]  [ Ragazzo ]  [ Adulto ]   Esperta · Leggenda │
│ Mano: (Destra) Mancino                       + Nome       │
│ Telefono 1 ✓ 82%                             [ Gioca › ]  │
└───────────────────────────────────────────────────────────┘
```

- **In due**, per ciascun giocatore:
  - la fascia, che oggi sta nella pagina «Collega» (index.html:592-594) [V];
  - la mano;
  - lo stato del telefono (natpf_ready.js:18-30).
- **Telefono non pronto**:
  - «Gioca» è spento e dice il perché, con il pulsante «Telefoni dello stand ›»;
  - oggi invece apre il pannello del telefono con il QR (natpf_ui.js:458) [V].
- **«Stand ⚙»**:
  - apre il pannello se lo si tiene premuto 2 s, con un anello che si riempie;
  - serve perché oggi, nel menu principale, il marchio da tenere premuto è nascosto (natpf-ui.css:552) [V].
- **Col solo mouse**:
  - bersagli di almeno 5,5 cqh;
  - la guardia del doppio clic del B39.2: oggi «Alla partita ›» e «Gioca ›» stanno nello stesso punto
    (index.html:743-744) [V].

### 4.2 Cosa si salta [V sul codice; D la scelta]
- Le pagine Modalità, Racchetta e Collega (natpf_lobby.js:55-62, :520-524).
- Il QR.
- «Attiva i sensori»: resta allo staff.
- Il tutorial corto (natpf_lobby.js:757, :813).
- Gli scambi di prova, con «Nessuna» (natpf_trial.js:45-51).
- Il foglio del nome (natpf_new_player.js:98).
- «‹ Indietro», «Riscaldati prima» e «Altre impostazioni» (natpf_lobby.js:557-560). Durata, formato e visuale passano
  nel pannello.

### 4.3 Partenza [D]
- Due modi, entrambi attivi: «Sono pronto» sul telefono (richiesta 2 del 13/11) oppure «Gioca» dello staff.
- **Con «Sono pronto»**:
  - il gioco lo offre ai telefoni che giocano, con offerNext (natpf_phone_racket.js:678);
  - quando l'hanno toccato tutti parte un conto di 3 s (natpf_ready.js:21), poi la partita;
  - un telefono che cade ferma il conto (come natpf_split_ui.js:454-457).
- **Con «Giocando»**: prima gli scambi di prova, poi subito la partita (natpf_ui.js:465-470).
- **Se il visitatore tocca «Sono pronto» prima che lo staff abbia scelto**: gioca al livello di base, Adulto. È il
  livello Evento, che si regola da solo.

### 4.4 Fine partita e prossimo giocatore [D]
- **Pulsanti in fiera**:
  - «Prossimo giocatore ›», il principale;
  - «Rigioca»: stessa persona e stesso livello, senza azzeramento.
  - Oggi i pulsanti sono «Menu», «Nuovo giocatore» e «Gioca ancora» (index.html:826-828) [V].
- **Si va avanti da soli** dopo N s: di base 20, si cambia nel pannello. Sullo schermo compare «Prossimo giocatore tra
  12 s».
- **«Prossimo giocatore»**:
  - azzera come al §3.4;
  - torna alla pagina della fiera;
  - non scollega nessun telefono.
- **Stesso schermo**: la «Rivincita» dai telefoni resta com'è (natpf_split_ui.js:96-104) [V].

### 4.5 Nome facoltativo [D]
- «+ Nome» apre il campo con la tastiera a schermo del B38: scrive lo staff.
- Senza nome, vedi domanda 3. Oggi tutte le partite senza nome vanno in classifica come «Ospite»
  (natpf_events.js:157-158) [V].

### 4.6 Telecomando dello staff
- Funziona già sulla pagina «Pronto per la partita» [VS puri.mjs]:
  - il tasto «Chi gioca» passa tra i 5 livelli (natpf_remote_map.js:36-41);
  - il tasto «Gioca!» fa partire (natpf_remote_map.js:133).
- In fiera [D]:
  - «Nuovo giocatore» diventa «Prossimo giocatore»; oggi il telecomando scrive «nome, tutorial e calibrazione da
    capo» (natpf_remote.js:329-333) [V];
  - «Menu» porta alla pagina della fiera.
- La batteria dei due telefoni compare già sul telecomando (natpf_remote.js:197-201) [V].

**Guadagno atteso** [D, dai numeri del telefono simulato delle letture]:
- Contro la CPU, per visitatore:
  - oggi: 3–4 clic, 1 tocco, il tutorial e circa 14,5 s di scambi di prova;
  - in fiera: 1–2 clic e 1 tocco («Sono pronto»), oppure 0 tocchi se lo staff clicca «Gioca».
- Stesso schermo:
  - oggi: 1 clic, 2 tocchi, 3 s di conto e circa 15 s di scambi;
  - in fiera: 1–3 clic e 3 s di conto.

---

## 5. Interruttore, impostazioni, compatibilità [D]

**Pannello dello stand**
- Voce nuova «Modalità fiera: No · Sì», salvata in localStorage come le altre (natpf_kiosk.js:71).
- Per le prove, l'indirizzo `?stand=fiera`. Non `?formato=fiera`, che serve già al formato (natpf_fair_format.js:17-18)
  [V].
- «Telefoni dello stand ›» prende il posto di «Telefono: Scollega» (natpf_kiosk.js:121, :185).
- Spazio:
  - il foglio è già al limite a 1024×600 (index.html:224-227) [V];
  - le tre voci che valgono solo nello stesso schermo (Scambio che si scalda, Lancio automatico, Campo aperto) vanno
    in un sotto-foglio «Stesso schermo ›».
- «Formato in fiera» diventa «Formato veloce», la parola già usata sul tabellone (natpf_fair_format.js:66) [V]. Così
  non si confonde con la modalità fiera.

**Con la modalità accesa**
- La pagina della fiera compare all'avvio (initialStep, natpf_lobby.js:115) e dopo ogni partita.
- Batte la CPU se l'utente dice sì (domanda 2). È l'opzione che esiste già, «Batte per primo»
  (match_format.js:17-25) [V].
- La partita resta da 1 game, come oggi (natpf_lobby.js:227-228) [V].

**Compatibilità**
- **Chiosco**: in fiera il suo azzeramento diventa «Prossimo giocatore».
  - Niente forget né forgetTutorial (natpf_kiosk.js:103-104).
  - Ritorno alla pagina della fiera (:105).
  - «A riposo» senza la condizione sul telefono (:80).
  - Anche i colpi del Telefono 2 contano come attività (:57).
- **Formato veloce, scambio caldo, lancio automatico, campo aperto**: non cambiano.
- **Registro dello stand**:
  - riga «stand.fiera», come natpf_kiosk.js:140;
  - righe «telefono dello stand»: abbinato, ricollegato, batteria bassa;
  - solo dati di gioco.
- **Sfida tra due computer, Allenamento, Minigiochi, webcam**: non si raggiungono dalla pagina della fiera. Si usano
  spegnendo la modalità, e il menu di oggi torna identico.
- **Modalità spenta**: tutto come oggi (QR, «Giocando», chiosco che scollega).

---

## 6. Tappe

Ogni tappa chiude con:
- test del gioco e del sito verdi;
- build, se la tappa tocca site/ o index.html;
- commit, push e pacchetti con versione nuova;
- Checkpoint aggiornato (CLAUDE.md).

Le prove nel browser usano il telefono simulato (devicemotion sintetici) e il solo mouse.

**B41.1 · Guardiano dello stand, solo funzioni pure (piccolo-medio)**
- File:
  - `site/js/tennis/stand-pairing.js`, nuovo, sul modello di remote-pairing.js:97-154; riusa remoteProof e
    newPairNumber;
  - `tools/test/stand-pairing.test.mjs`, sul modello di tools/test/remote-pairing.test.mjs.
- Prove:
  - il QR vale solo a foglio aperto;
  - senza conferma non si entra;
  - l'indirizzo fisso non è mai nel QR;
  - dopo un «riavvio» (guardiano nuovo, stesso salvataggio) il telefono con la chiave entra;
  - dopo un riabbinamento il telefono di prima è rifiutato;
  - «Scollega» funziona;
  - le prove HMAC del gioco e del telefono non si possono scambiare;
  - il QR normale non vale per lo stand, e viceversa.
- Chiusa quando: test nuovi e suite del sito verdi, nessun file del gioco toccato.

**B41.2 · Collegamento fisso lato gioco (medio)**
- File:
  - link.js: createPhoneLink con `stand`; con l'id occupato riprova come remote-link.js:51-54;
  - natpf_phone_racket.js: avvio con il posto, posto nel `cfg` (:640), tutorial visto per lo stand (:706);
  - natpf_fiera.js, nuovo: opzione, avvio dei due telefoni, stato;
  - natpf_ui.js: niente QR pubblico per i posti dello stand (:344-350, :699-711).
- Prove:
  - test con il Peer finto di tools/test/phone-link-net.test.mjs:14-44: stesso id dopo il riavvio, ripresa con la
    prova, abbinamento senza conferma rifiutato, id occupato;
  - natpf-tennis/test/natpf-fiera.test.mjs;
  - nel browser: ricarichi il gioco e il telefono simulato rientra senza QR.
- Chiusa quando: a modalità spenta i test di oggi restano uguali (phone-*.test.mjs, natpf-split-ricollega).

**B41.3 · Pagina del telefono dello stand (medio)**
- File:
  - racchetta.js: dati dello stand in localStorage, prova HMAC, ritentativi senza fine, online e pageshow, testi senza
    QR, taratura, voto dei tocchi spento;
  - phone-screen.js: schermata con il numero, mano, «Staff» tenendo premuto;
  - racchetta.html: manifest e icona, facoltativi.
- Prove:
  - tools/test/phone-screen.test.mjs per le viste dello stand;
  - test nuovo nella sandbox di phone-reconnect.test.mjs:
    - pagina ricaricata: niente QR;
    - gioco riavviato: il telefono riprova finché il gioco torna;
    - telefono tolto dal posto: «chiama lo staff»;
    - il segno della taratura resta dopo `cal` + `skip`.
- Chiusa quando: test verdi e prova nel browser con telefono e gioco ricaricati, in tutti e due gli ordini.

**B41.4 · Interruttore e foglio «Telefoni dello stand» (medio; dopo l'unione di B37, B38 e B39)**
- File: natpf_kiosk.js; index.html (pannello, foglio, sotto-foglio); natpf-ui.css (misure in cqh/cqw); natpf_fiera.js;
  natpf_registro.js; natpf_fair_format.js (solo l'etichetta).
- Prove:
  - natpf-fiera.test.mjs: opzione, etichette, stato delle schede;
  - natpf-telecomando.test.mjs: «Conferma» resta fuori dalla portata del telecomando;
  - natpf-menu alle 5 misure, con le schermate;
  - prova col solo mouse: pannello → «Sì» → due telefoni simulati abbinati con «Conferma» → prova dritto e rovescio
    → «Fatto».
- Chiusa quando:
  - foglio e pannello si vedono interi a 1024×600 e a 1920×1080;
  - si abbina solo con un clic vero.

**B41.5 · Pagina della fiera e «Prossimo giocatore» (medio)**
- File:
  - natpf_lobby.js: variante del passo `match`, initialStep, niente «Indietro»;
  - natpf_ui.js: _bindStart (:439-477) e fine partita (:145-153);
  - natpf_new_player.js: azzeramento della fiera;
  - hud_ui.js: fine partita (:339);
  - natpf_kiosk.js: :80 e :86-109;
  - natpf_split_ui.js: stato e conto fuori dalla pagina «Collega» (:86, :313, :439);
  - natpf_remote.js e natpf_remote_map.js.
- Prove:
  - natpf-fiera.test.mjs: cosa si azzera, cosa resta, dove si va;
  - aggiornati natpf-nuovo-giocatore, natpf-events (chiosco), natpf-telecomando, natpf-lobby;
  - tools/e2e/natpf-flusso-tocchi.mjs con FLOW=fiera e FLOW=fiera-due, e un tetto di tocchi (MAX_TAPS):
    - contro la CPU, per visitatore, al massimo 2 clic e 1 tocco, nessun QR;
    - in due al massimo 3 clic;
  - doppio clic a 110, 250 e 300 ms su «Gioca» e «Prossimo giocatore»;
  - schermate a 1280×720, a 1920×1080 e nell'area 1080×1080.
- Chiusa quando: nel browser passano dieci visitatori di fila senza un QR né una calibrazione, con i telefoni sempre
  collegati.

**B41.6 · «Sono pronto» dal telefono (piccolo; richiesta 2, vale anche fuori dalla fiera)**
- File: natpf_lobby.js, natpf_ui.js, natpf_split_ui.js (conto), phone-screen.js e racchetta.js («Sono pronto» al posto
  di «Pronto»).
- Prove:
  - di unità: chi manca, conto fermato se un telefono cade;
  - nel browser: i telefoni simulati toccano «Sono pronto».
- Chiusa quando: la partita parte con i tocchi e anche con «Gioca».

**B41.7 · Misure per i bambini (facoltativa; tocca il riconoscimento dei gesti, quindi servono test)**
- Strumenti: scripts/audit/scambi-di-prova.mjs con un percorso «fiera», e colpi.mjs --mode=lato.
- Oggi, nei primi 3 colpi del bambino, l'errore di forza è 0,23.
- Si accende la forza di partenza per fascia (`pf`) solo se porta l'errore sotto 0,10 senza colpi falsi per gli
  adulti forti. Altrimenti non si fa niente.

**B41.8 · Collaudo vero e guida, con l'utente**
- Telefoni: due Android e un iPhone.
- Cosa provare:
  - 30 minuti fermi con lo schermo acceso;
  - consumo di batteria all'ora;
  - PC riavviato;
  - Wi-Fi spenta e riaccesa;
  - pagina del telefono ricaricata;
  - un bambino e un adulto.
- Guida «come si attiva» nei pacchetti, documento in docs/b41/.

**Ordine** [D]
- B41.1–B41.3 toccano soprattutto site/js/tennis e possono partire prima. B37 tocca appena racchetta.js e
  phone-screen.js.
- B41.4–B41.6 vanno dopo l'unione di B37, B38 e B39, che toccano gli stessi file: index.html, natpf-ui.css,
  natpf_kiosk.js, natpf_ui.js.
- B42 e B43 toccano campo e tabellone: nessun conflitto previsto.

**Rischi**
1. I telefoni veri non sono mai stati provati: Wake Lock, iPhone che chiede un tocco dopo lo sblocco, batteria con lo
   schermo sempre acceso (docs/b9/schermo-spento.md:22-31). Il collaudo B41.8 è obbligatorio.
2. L'IP del PC può cambiare (§2.6).
3. Bambini con colpi sotto circa 200 °/s (§3.6).
4. PeerJS con un indirizzo fisso via internet dopo un riavvio: mai provato.
5. Sicurezza: il ledwall è pubblico, quindi servono la conferma sul computer e la prova HMAC (§2.1).
6. Col solo mouse: doppio clic (B39.2) e poco spazio nel pannello a 1024×600.
7. Il visitatore può uscire dalla pagina del telefono (tasto Home): servono il blocco app o l'Accesso guidato.

**Cosa NON si tocca**
- Gameplay: motore, CPU, regole, punteggio, formato. Si usano solo opzioni che esistono già.
- Riconoscimento dei gesti e direzione dei colpi del B35a (natpf_stroke_outcome.js, createAimModel in
  natpf_gestures.js, soglie di swing-detect.js). Unica eccezione la B41.7, solo se le misure la giustificano e con i
  test.
- Webcam, sfida tra due computer, server LAN.
- A modalità spenta il gioco resta identico.

---

## 7. Domande per l'utente

1. **«Telefoni calibrati da me»: va bene così?**
   - Consigliata, A: prepari e provi i telefoni una volta (collegamento, sensori, un dritto e un rovescio di prova).
     La forza di ogni persona la impara il gioco dai primi colpi, senza gesti né scambi di prova.
   - B, già nel pannello: «Calibrazione: Giocando». Prima di ogni partita circa 10 s di scambi di prova (4 palle,
     destra e sinistra). È più precisa dal primo punto, ma costa 14 s in più a persona.
   - C, sconsigliata: «Con i gesti», cioè il tuo profilo per tutti. Con il profilo di un adulto un bambino perde 7–8
     colpi su 9 (prova con il telefono simulato).
2. **Contro la CPU, in fiera batte sempre la CPU?**
   - Consigliata: sì, con «Batte per primo: CPU», un'opzione che c'è già. Nella partita da 1 game il visitatore non
     batte mai e fa solo dritti e rovesci.
   - Altrimenti batte il visitatore, come oggi: alza il telefono e colpisce.
   - In due si batte come oggi. Il «Lancio automatico» del pannello aiuta chi resta fermo.
3. **Nomi e classifica in fiera.**
   - Consigliata: nessun nome da scrivere. Il gioco numera i visitatori da solo («Visitatore 12», da capo ogni giorno),
     così la classifica del giorno ha senso. Il nome resta facoltativo: lo scrive lo staff con la tastiera a schermo
     del B38.
   - Alternative: «Ospite» per tutti, come oggi; oppure classifica nascosta in fiera.
