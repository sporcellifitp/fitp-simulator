# Prova guidata della consegna del 23/10: prima il telefono Android, poi la webcam del portatile

Scopo: verificare con la persona e i dispositivi veri quello che il codice e i test automatici non possono dire (mano
vera, telefono vero, Wi-Fi vera, webcam e luce della stanza vere). Durata: circa 30 minuti. Ogni parte dentro una
sessione della diagnostica, così il rapporto dà i numeri. Cosa è cambiato e perché: `NATPF_DIAGNOSI_2026-10-23.md` §7.

## 0. Prima di cominciare

- **Avvio**
  - Versione Cloudflare: l'indirizzo pubblicato del gioco.
  - Versione LAN: doppio clic su `AVVIA NATPF LAN.cmd` (istruzioni in `LEGGIMI.txt` nello zip).
- **Registrare**: Maiusc+D (oppure Pausa → *Diagnostica*), poi *● Avvia registrazione*.
  - *video della webcam (chi gioca)* è già spuntato e il video contiene la persona: toglierlo se non lo si vuole
    condividere.
  - *campioni dei sensori del telefono* è già spuntato: lasciarlo, serve a capire i gesti scartati.
- **Segnare un momento strano**, nel momento in cui succede: Maiusc+M sul computer (o *Segna questo momento* nel
  pannello), oppure il pulsante *⚑ Segna un problema* sulla pagina del telefono (compare mentre la diagnostica registra).
- **Esportare**: *■ Ferma la registrazione*, poi *⬇ Scarica* accanto alla sessione. Si ottiene uno zip con:
  - `rapporto.html` (si apre con doppio clic, senza internet);
  - `metriche.json`, `eventi.jsonl`, `telefono-sensori.jsonl`;
  - i video, se scelti.

  Per condividerlo basta inviare lo zip. Se manca qualcosa, il rapporto lo dice in alto.
- **Sequenza ripetibile**: dal menu principale, con la racchetta già scelta e collegata, Maiusc+D → *▶ Prova guidata
  dei colpi* (circa 5 minuti; registra e si ferma da sola). Il lanciapalle chiede dritti, rovesci, pallonetti,
  tagliati, palle corte (con il telefono), incrociati e lungolinea. Il rapporto dice quanti colpi sono stati
  riconosciuti come richiesti. Farla all'inizio e alla fine permette un confronto alla pari.

## 1. Telefono Android della prova (circa 18 minuti)

### 1.1 Collegamento, presa, calibrazione

1. QR sul computer, poi sul telefono *Attiva i sensori*.
2. **Presa di taglio**, come nella figura della lobby e della pagina del telefono:
   - il telefono in piedi nel pugno, come il manico di una racchetta;
   - la cima in alto, un poco in avanti;
   - il display di lato (a destra o a sinistra), non verso di sé: dallo schermo si vede solo il bordo.

   La pagina può restare in orizzontale: compare solo un avviso per qualche secondo.
3. **Calibrazione rapida**: due gesti comodi nel verso indicato, un dritto e un rovescio.

   Atteso: calibrazione superata. Se dice che *un gesto era molto più debole dell'altro*, rifare i due gesti con la
   stessa decisione: è il controllo nuovo, che c'è perché un verso molto più debole dell'altro faceva perdere i colpi.

### 1.2 Lati, colpi e gesti che non devono colpire (Casual)

- 10 dritti e 10 rovesci normali. Atteso: lato sempre giusto, nessun pallonetto o palla corta non voluti.
- Preparazione lenta, poi il colpo vero un attimo dopo. Atteso: gioca il colpo vero, non la preparazione.
- Ritorno del braccio dopo il colpo, e piccoli movimenti a riposo. Atteso: nessun colpo.
- Pallonetto: il braccio sale deciso dal basso verso l'alto. Palla corta: lento e morbido dall'alto verso il basso.
- Ripetere 4 colpi con il display dall'altra parte (destra ↔ sinistra). Atteso: stessi lati e stessi colpi.

### 1.3 Direzione e profondità (Pro)

- 5 colpi un attimo **prima**: incrociati. 5 un attimo **dopo**: lungolinea. 5 nel mezzo: verso il centro. Sia di dritto
  sia di rovescio.

  Atteso: sulla *Mappa dei rimbalzi* del rapporto i colpi vanno da una riga all'altra. Il lungolinea deve arrivare alla
  riga; il 23/10 non superava 1,7 m dal centro.
- Dopo qualche scambio normale: 3 colpi più forti del solito (atteso: più in fondo) e 3 più morbidi (atteso: più
  corti).

### 1.4 Campo aperto (Pro)

Giocare alcuni punti costruendoli: incrociato stretto per spostare l'avversario, poi dall'altra parte.

Atteso:

- vincenti quando l'avversario è lontano;
- un incrociato stretto lo fa correre;
- una palla profonda lo spinge indietro.

Segnare (⚑) i punti in cui l'avversario arriva su una palla che sembrava imprendibile.

### 1.5 Android: schermo, app, rete

1. **Schermo spento** durante uno scambio (tasto laterale).

   Atteso sul computer: pausa subito, con il motivo «la pagina del telefono non è in primo piano». Se il telefono non fa
   in tempo a dirlo, il motivo è «non manda il movimento» o «telefono scollegato»: annotarlo.

   Riaccendere e tornare alla pagina. Atteso:
   - conto alla rovescia 3-2-1;
   - il punto si rigioca;
   - il punteggio non cambia;
   - nessun colpo fantasma.
2. **Un'altra app** e ritorno: come sopra.
3. **Due minuti fermi** in pausa, senza toccare il telefono. Atteso: lo schermo resta acceso.

   Se sul telefono compare *Lo schermo può spegnersi*:
   - toccare *Tieni acceso lo schermo*;
   - annotare se il risparmio energetico era attivo.
4. **Wi-Fi spenta** sul telefono per una decina di secondi, poi riaccesa.

   Atteso:
   - pausa subito: prima «non manda il movimento», dopo 5 secondi «telefono scollegato»;
   - al ritorno della rete il telefono si ricollega da solo (se dopo un minuto non succede, sul telefono c'è il pulsante
     *Riprova*);
   - ripresa con il conto alla rovescia.
5. Se compare *Sensori fermi*, toccare *Riattiva i sensori* e segnare il momento: è il caso che serve capire meglio.

### 1.6 Ritmo a Leggenda (confronto)

Due partite brevi a Leggenda:

- una con l'indirizzo normale;
- una aggiungendo `ritmo=colmo` all'indirizzo (per esempio `…/?lan=1&ritmo=colmo`).

Con `ritmo=colmo` si colpisce più spesso vicino al colmo dopo il rimbalzo, con un po' più di tempo.

Annotare quale delle due dà più tempo e meno colpi in ritardo. Nel rapporto contano:

- il «tempo dei colpi»;
- la quota «oltre la finestra» negli esiti della racchetta;
- l'«impatto dopo il rimbalzo» (altezza della palla e tempo dal rimbalzo al colpo).

È la scelta lasciata aperta: nel banco simulato la palla presa al colmo a Leggenda costa punti, ma il banco non sa
quando colpisce davvero una persona.

## 2. Webcam del portatile (circa 12 minuti)

1. **Posizione**: 1,5–2 metri dalla webcam, la mano che colpisce ben visibile, luce davanti (non una finestra alle
   spalle). Poi *Gioca → Racchetta → Webcam*.
2. **Fluidità**: giocare 2 minuti a Casual. Il rapporto dice:
   - fotogrammi della camera ottenuti;
   - tempo dell'inferenza;
   - quota del gioco occupata dal modello;
   - livello del modello scelto.

   Se scatta:
   - ripetere con `webcamLivello=leggera` nell'indirizzo, poi con `webcamLivello=minima`, una sessione ciascuna;
   - confrontare i rapporti (spuntare *confronta* su due sessioni nel pannello della diagnostica, o le righe «Webcam»
     del riassunto).

   Con poca luce la camera rallenta (meno fotogrammi al secondo) e la mano si sfoca: il rapporto lo mostra nei
   fotogrammi della camera.
3. **Continuità**: durante uno scambio nascondere la mano dietro la schiena per 3 secondi.

   Atteso: pausa con «Non vedo la mano…». Rimetterla in vista. Atteso:
   - conto alla rovescia;
   - punto rigiocato;
   - nessun colpo quando la mano ricompare.
4. **Swing**: 10 dritti e 10 rovesci. Atteso: lato giusto, la preparazione non colpisce.

## 3. Cosa guardare nel rapporto

- **Riassunto in alto**:
  - telefono: sensori, gesti scartati con il motivo, tempi di consegna, pause per il telefono;
  - webcam: camera, inferenza, carico del gioco, stati della mano, pause, livello del modello;
  - gioco: fotogrammi;
  - segni.
- **Mappa dei rimbalzi**: un clic su un punto porta i video un secondo prima di quel rimbalzo.
- **Linea del tempo**: un clic porta i video a quel momento. Nell'elenco degli *Eventi* un clic su una riga (un colpo,
  un punto, un segno) li porta un secondo prima.

## 4. Cosa provano i test automatici e cosa no

- **Provato in automatico**:
  - rilevamento dei gesti e scelta del colpo con un telefono simulato completo, presa di taglio compresa;
  - motore del gioco (direzione, profondità, CPU, ritmo) con il banco degli scambi e i criteri di Leggenda;
  - pausa e ripresa con telefono e computer veri nel browser, con sensori, visibilità e blocco dello schermo simulati;
  - catena della webcam con il modello vero sulla webcam finta del browser.
- **Non provato, perché serve la prova fisica**:
  - mano vera e soglie per la persona;
  - quando Android sospende sensori e pagina, o nega il blocco dello schermo;
  - Wi-Fi vera;
  - costo del modello delle mani sul portatile;
  - luce della stanza;
  - se il ritmo e la difficoltà sono giusti per chi gioca.
