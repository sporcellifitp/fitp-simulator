# Guida dello stand · come si attiva ogni cosa

**Vale per la versione 2026-11-18.3** (18/11/2026). Le voci segnate **(B41 parte 2)** e **(B41.3)** (modalità fiera con il
solo mouse e le correzioni dopo la revisione: capitolo 8.4) valgono dalla 2026-11-14.5. Le voci segnate **(B39)**
valgono dalla versione che contiene il blocco B39 «stand con il solo mouse» (dalla 2026-11-14.2): tasto destro con i
comandi dello staff, pannello da ogni pagina, niente doppi clic che saltano pagine, puntatore grande, calibrazione dello
schermo con due clic (dettagli in `docs/b39/stand-solo-mouse.md`). Dalla stessa versione anche la tastiera a schermo e
«Gioca come Ospite» (B38, capitolo 3.6) e l'icona del servizio (B44, capitolo 8.3). Le voci segnate **(B45.1)** sono del
blocco «telefono che non si scollega» (capitolo 8.5 e `docs/b45/b45-1-collegamento.md`): chiosco che non scollega più il
telefono, telefono che si ricollega da solo e scritte calme sul ledwall dalla 2026-11-14.3; i motivi delle cadute nel
pannello e nel registro dalla 2026-11-14.4. Le voci segnate **(B45.2)** (rifiniture dopo la revisione del B45.1:
«Scollega» che non è una caduta, schermo spento contato bene, pagina chiusa detta sul ledwall, chiosco e telefono del
visitatore) valgono dalla 2026-11-14.4.

Per chi gestisce lo stand di **NATPF Simulator** con il programma Windows, il ledwall e **solo il mouse**. Ogni voce è
controllata sul codice di questa versione.

**Come leggere questa guida**

- **Mouse:** i clic da fare, in ordine. «→» vuol dire «poi».
- **Tastiera:** la scorciatoia, se al PC è collegata una tastiera (tutti i tasti nel capitolo 12).
- **Telecomando:** il tasto sul telefono dello staff (capitolo 6).
- Il valore **in grassetto** è quello di base: c'è finché nessuno lo cambia.
- Le scelte restano salvate su questo PC, anche dopo un riavvio o un aggiornamento. **Non** restano salvati: «Musica»
  (e «Audio»), «Chi gioca» con il livello della CPU (torna «Adulto») e la durata della partita (torna «1 game»).
- **In arrivo**: non c'è ancora in questa versione.
- **Non provato** su un PC Windows vero, sul ledwall vero e con telefoni veri, salvo dove è scritto. Se qualcosa non va,
  segnalalo.

Capitoli: 1 · Aprire il pannello dello stand — 2 · Le voci del pannello — 3 · Ogni visitatore — 4 · In campo: la pausa
e il riquadro del telefono — 5 · Le Opzioni del gioco — 6 · Il telecomando dello staff — 7 · Il programma Windows —
8 · Fiera ed eventi — 9 · Il registro dello stand — 10 · Il solo mouse: cosa si fa e cosa ancora no — 11 · Se qualcosa
non va — 12 · Con una tastiera — Appendice: solo per la versione web — Per chi sviluppa.

---

## In breve: la giornata allo stand

(B41 parte 2) Con la **modalità fiera** accesa (capitolo 8.4) i due telefoni dello stand si abbinano una volta e restano
collegati, e al posto del menu c'è la pagina della fiera: per ogni visitatore un clic su chi gioca, «Sono pronto» sul
telefono (o «Gioca ›»), a fine partita «Prossimo giocatore ›». Qui sotto la giornata senza la modalità fiera.

**Prima di aprire (una volta al giorno)**

1. Accendi il ledwall, poi il PC. Apri **NATPF Simulator** (icona sul desktop).
2. Se compare «Su quale schermo mostro il gioco?», clicca lo schermo con scritto «probabile ledwall». Se nessuno
   risponde, dopo 30 secondi lo sceglie il programma.
3. Intro: due clic. Il primo (o «Salta ›» in basso a destra) mostra il titolo, il secondo su «Clicca o premi un tasto
   per iniziare» apre il menu.
4. Controlla le opzioni dello stand: **tasto destro sul gioco → «Pannello dello stand»** (B39), oppure tieni premuto 3
   secondi il titolo grande «NATPF Simulator» (B39: anche nella pagina principale; prima: «Opzioni» → marchio in alto a
   sinistra) → controlla le voci (capitolo 2) → «Chiudi».
5. Sul telefono dello staff apri l'icona **NATPF Telecomando**: si ricollega da sola.

**Per ogni visitatore, contro la CPU**

1. Primo visitatore (telefono non ancora collegato): «Gioca» → «Contro la CPU» → «Smartphone» → pagina «Collega il
   telefono». Il telefono inquadra il QR, tocca il link, poi «Attiva i sensori»: il gioco va avanti da solo.
2. Tutorial corto sul ledwall (5 schede): si chiude subito con «Tutto chiaro, ho capito» sul telefono, o con la × sul PC.
3. «Scambi di prova»: (B59) prima il **conto alla rovescia grande** come per la partita («Preparati · Prima qualche
   scambio di prova · 3 · 2 · 1»), poi al centro la scritta grande **«Allenati un po'!»**; poi circa 10 secondi, 4 palle
   facili. Il gioco impara il colpo di chi gioca. «Salta ›» (accanto alla pausa, in alto a destra, dopo il conto; dal
   telefono anche durante il conto) per andare avanti.
4. «Pronto per la partita»: clicca «Bambino», «Ragazzo» o «Adulto» (si parte sempre da «Adulto»). Poi **un solo clic**
   su «Gioca ›». (B47) In campo, prima del primo punto, il **conto alla rovescia grande** al centro: «Preparati · La
   partita sta per cominciare · 3 · 2 · 1» (3 secondi), poi si gioca. Di base **batte sempre chi gioca** (pannello →
   «Battuta»).
5. A fine partita:
   - **«Gioca ancora»** (o **«Rivincita»**), stessa persona: (B47) si apre la **scelta del livello** grande, già segnata
     con quello di prima: un clic su «Bambino», «Ragazzo» o «Adulto» se va cambiato, poi **«Gioca»**. Prima di nuovo gli
     scambi di prova (circa 10 secondi; «Salta ›» li salta), poi il conto alla rovescia e la partita.
   - **«Nuovo giocatore»**, persona nuova: il telefono resta collegato e «Collega il telefono» si salta. Nel foglio
     «Come ti chiami?» scegli la mano («Destra» o «Sinistra»), poi clicca il campo del nome: compare la **tastiera a
     schermo**, scrivi cliccando i tasti, «Fatto», «Avanti ›». Oppure **«Gioca come Ospite»** (accanto al campo): senza
     nome, fuori classifica. Poi tutorial corto, scambi di prova e «Pronto per la partita».
6. Se apri «Collega il telefono» con il telefono **già collegato** (per esempio tornando dal menu), il gioco non va avanti
   da solo: clicca il pulsante in basso a destra, «In campo ›» (o «Alla partita ›»).

**A fine giornata**

1. Pannello dello stand → guarda la riga sotto «Registro di gioco». Se dice «… in coda», clicca «Invia adesso».
2. Classifica in un file: pannello → «Classifica · Scarica CSV». (B39) Nel programma si salva da solo in **Download ›
   NATPF** e un avviso nel gioco dice il nome; tasto destro → Programma → «Cartella dei file salvati» la apre. (Prima: la
   finestra di Windows «Salva con nome».)
3. Chiudere il programma con il mouse: capitolo 7.6.

---

## 1. Aprire il pannello dello stand

Il pannello dello stand («Riservato all'addetto · Pannello dello stand») contiene le opzioni dello staff. Compare sul
ledwall: lo vede anche il pubblico.

| Modo | Dove funziona | Come |
|---|---|---|
| **Mouse:** tasto destro (B39) | nel programma Windows, ovunque, anche in partita e sulla pagina di avvio | tasto destro sul gioco → «Pannello dello stand» (il menu si apre dove c'è il puntatore) |
| **Mouse:** marchio | in ogni pagina del menu (B39: anche nella pagina principale, sul titolo grande «NATPF Simulator») | tieni premuto il tasto sinistro per 3 secondi sul marchio in alto a sinistra (o sul titolo grande): un anello giallo si riempie |
| **Mouse:** ❚❚ tenuto (B39) | in campo (partita, scambi di prova, allenamento, minigiochi) | tieni premuto 3 secondi ❚❚ in alto a destra: si apre il pannello (il clic breve resta la pausa) |
| **Telecomando:** «Pannello dell'addetto» | ovunque, tranne l'intro | lo stesso tasto lo chiude |
| **Tastiera:** F9 | solo nel programma Windows; ovunque, anche in partita e a schermo intero | F9 da solo (senza Ctrl, Maiusc o Alt). Un altro F9 lo chiude |
| **Tastiera:** Ctrl+Maiusc+K | ovunque (programma e browser) | sul PC dello stand a volte un altro programma la prende: allora F9 |
| **Tastiera:** menu del programma | solo in finestra | Alt → NATPF → «Pannello dello stand (F9)» |

**Dove si vede il marchio.** In queste pagine del menu: «Con chi giochi?», «Con cosa giochi?», «Collega il telefono» (e
«Collega i due telefoni»), «Pronto per la partita» (e la pagina della fiera, B41 parte 2: capitolo 8.4), «Opzioni»,
«Classifica» (anche a schermo intero), «Minigiochi» e il risultato di un minigioco. **Non** c'è nel menu principale (lì
è nascosto), nell'intro, in campo (partita, scambi di prova, allenamento, minigiochi), nella pausa, nella schermata di
fine partita e quando un foglio copre la pagina (per esempio «Come ti chiami?»).

- (B39) Mentre tieni premuto, un anello giallo si riempie con la scritta «Pannello dello stand». Un piccolo tremolio
  della mano non annulla; se rilasci prima o ti sposti di molto, ricomincia. Prima della versione B39 non c'era nessun
  segno e nella pagina principale il marchio era nascosto: «Opzioni» → marchio 3 secondi.

**In partita, con il solo mouse.** (B39) Tasto destro → «Pannello dello stand», oppure ❚❚ tenuto 3 secondi. Prima del B39
non c'era una via diretta (❚❚ → «Torna al menu» chiudeva la partita): telecomando «Pannello dell'addetto», oppure F9.

**Quando il pannello è aperto**

- La partita **si ferma** (anche scambi di prova, allenamento e minigiochi) e alla chiusura riparte dal punto esatto. Se
  prima c'era la pausa, resta la pausa.
- Il pannello sta sopra la pausa e sopra tutto (tranne la calibrazione dello schermo e gli avvisi brevi).
- Il chiosco non azzera lo stand mentre il pannello è aperto.

**Chiudere:** «Chiudi» (mouse) · Esc, F9 o Ctrl+Maiusc+K (tastiera) · «Pannello dell'addetto» o «Indietro»
(telecomando).

---

## 2. Le voci del pannello dello stand

**Come funzionano.** Ogni pulsante mostra il nome e, sotto, il valore di adesso. Un clic passa al valore successivo.
Per le opzioni di gioco (formato, scambio, lancio, campo aperto, calibrazione, mira, registro, schermo) compare anche un
avviso breve che dice cosa cambia. Per il chiosco e il suo tempo cambia solo la riga sotto le voci; per «Musica» e
«Telefono» solo la scritta del pulsante. (B39) Passando con il puntatore su una voce, la riga sotto le voci spiega cosa
fa. (B39) **Un doppio clic vale un clic solo** (prima faceva due passi: «Calibrazione» passava da «Giocando» a
«Nessuna»). In alto a destra del pannello c'è **«Diagnostica»** (B39): chiusa con ×, si torna al pannello.

**Mouse, per tutte le voci:** apri il pannello (capitolo 1) → clic sulla voce.

| Voce | Valori | Cosa fa | Da quando vale |
|---|---|---|---|
| **Modalità fiera** (B41 parte 2) | **No** · Sì | La prima voce. Sì: al posto del menu c'è la **pagina della fiera** (chi gioca con un clic, niente QR, niente tutorial per i visitatori) e i telefoni dello stand sono abbinati una volta e sempre collegati; accendendola la «Calibrazione» va su «Giocando» (ogni visitatore fa i suoi scambi di prova) e si apre il foglio «Telefoni dello stand». No: il menu di sempre; (B41.3) «Con cosa giochi» e «Calibrazione» tornano come erano prima della fiera. Resta salvata. Tutto nel capitolo 8.4. | subito |
| **Modalità chiosco** | **No** · Sì | Sì: dopo il tempo di «Ritorno al menu dopo» senza nessuno il gioco torna al menu principale, cancella il nome, rimette «Chi gioca: Adulto» e (B45.1) **azzera chi gioca come «Nuovo giocatore»** (mano destra, calibrazione e tutorial da capo): **il telefono resta collegato**, niente QR da rifare (prima il chiosco scollegava il telefono col QR, e in fiera sembrava una caduta della rete). Contano come attività clic (anche sui tasti della tastiera a schermo), tasti, rotellina, tocchi, colpi del telefono e comandi del telecomando; (B45.1) anche i gesti e i tocchi sul telefono e il telefono preso in mano; (B39) anche muovere il mouse, e con il pannello, l'abbinamento del telecomando o la diagnostica aperti il chiosco aspetta. Durante una partita aspetta il doppio del tempo, poi chiude la partita. Sotto le voci una riga dice se il chiosco è acceso; (B45.2) sotto di lei, solo se oggi un telefono è caduto, una riga per telefono «Telefono 1: N cadute oggi · motivo più frequente: …» (capitolo 8.5). (B45.2) Con il telefono di un visitatore (QR) il chiosco **non libera il posto**: per collegare un altro telefono serve «Scollega» (capitolo 8.2). (B41 parte 2) Con la modalità fiera fa «Prossimo giocatore» e torna alla pagina della fiera (capitolo 8.4). | subito |
| **Ritorno al menu dopo** | 30 s · **45 s** · 60 s · 90 s | Il tempo del chiosco. Giro dei valori: 45 → 60 → 90 → 30 → 45. | subito; conta solo con il chiosco acceso |
| **Classifica · A schermo intero** | — | Chiude il pannello e mostra in grande la classifica di oggi (scheda «Partite», 10 righe). Le schede dei minigiochi si cliccano, ma non fanno uscire. In partita chiude la partita. (B39) Per uscire: **«× Chiudi»** in alto a destra (compare muovendo il mouse) o di nuovo questa voce, che diventa «Chiudi lo schermo intero»; si torna al menu. Con il chiosco acceso la classifica lasciata in vista resta. | subito · **secondo clic in partita** |
| **Classifica · Scarica CSV** | — | Salva il file «classifica-natpf-AAAA-MM-GG.csv» con partite e minigiochi di oggi. (B39) Nel programma si salva da solo in **Download › NATPF** (un file con lo stesso nome non si sovrascrive: «… (2).csv»); un avviso nel gioco dice il nome. Nel browser decide il browser. | subito · non dal telecomando |
| **Classifica · Azzera oggi** | — | Cancella la classifica di oggi su questo PC. (B39) **Secondo clic** sul pulsante («Sicuro? Clicca ancora»), niente più finestra di Windows. La classifica si azzera comunque da sola ogni giorno. | subito · non dal telecomando |
| **Telefono** | «Scollega» con un telefono collegato · «Nessuno collegato» | Scollega il telefono del giocatore: per giocare va rifatto il QR. (B41 parte 2) Con la modalità fiera accesa la voce si chiama **«Telefoni dello stand»** e dice lo stato dei due posti (per esempio «1 ✓ · 2 da abbinare ›»): apre il foglio dei telefoni dello stand (capitolo 8.4), non scollega niente. | subito · **secondo clic in partita** (con un telefono collegato, fuori dalla fiera) |
| **Musica** | **Sì** · No | Spegne o riaccende **tutto** l'audio del gioco: musica, effetti e la voce del punteggio. **Non resta salvata**: alla riapertura l'audio è acceso. Per spegnere solo la voce e tenere musica ed effetti: Opzioni → «Voci» (o «Voce» nella pausa). | subito |
| **Formato in fiera** | No · **Solo stesso schermo** · Sì · punto decisivo | Punto decisivo sul 40-40 (chi lo vince vince il game) e servizio che passa ogni due punti, come nel tie-break: batte anche la CPU o il Player 2, anche in una partita a 1 game. «Solo stesso schermo»: vale solo tra due persone sullo stesso schermo; contro la CPU e tra due computer resta il formato classico. «Sì»: vale anche contro la CPU e tra due computer, e la partita più lunga è al meglio di 3. Al 40-40 il tabellone mostra «PUNTO DECISIVO» in rosa. Giro: No → Solo stesso schermo → Sì → No. | dalla partita dopo |
| **Battuta** (B47) | **Sempre lo stesso** · Alternata | Sempre lo stesso: il servizio non passa mai all'altro, per tutta la partita e in tutti i formati (anche con il formato in fiera e il campo aperto: resta il punto decisivo, non il cambio ogni due punti). Contro la CPU batte **sempre chi gioca**, anche se «Batte per primo» dice CPU; nello stesso schermo batte per tutta la partita chi batte il primo game («Batte per primo», di base il sorteggio: «Sorteggio: batte sempre Giulia»). Il lato del servizio (destra, sinistra) cambia a ogni punto come sempre. Alternata: come prima, il servizio passa all'altro a ogni game (ogni due punti con il formato in fiera o il campo aperto). Nella sfida tra due computer resta alternata. Giro: Sempre lo stesso ↔ Alternata. | dalla partita dopo |
| **Scambio che si scalda** | **Sì · dal 20° colpo** · No | Dal 20° colpo di uno scambio colpi sempre più forti per tutti e due, colpo super più facile, la CPU rischia di più: gli scambi lunghi finiscono e le partite durano meno. In alto la scritta «SCAMBIO CALDO · colpo 23». Non vale con «Una webcam per due». | dalla partita dopo |
| **Lancio automatico** | **No** · Sì · 30 s | Solo stesso schermo **con i due telefoni** (non con «Una webcam per due»): se chi deve battere resta fermo 30 secondi, il gioco lancia la palla (lo schermo lo annuncia 10 secondi prima). Dopo due lanci a vuoto il gioco batte un servizio morbido. Così la fila non si blocca. | dalla partita dopo |
| **Stesso schermo: campo aperto** | **No** · Sì · il piazzamento conta | Solo stesso schermo **con i due telefoni**: i personaggi corrono come persone e non arrivano più su ogni palla; la palla angolata si prende in allungo o non si prende. Con «Battuta: Alternata» il servizio passa ogni due punti anche con il formato classico (chi batte è un po' sfavorito); con «Sempre lo stesso» non passa mai. | dalla partita dopo |
| **Calibrazione** | **Giocando** · Con i gesti · Nessuna | Giocando: niente gesti a vuoto; prima di ogni partita circa 10 secondi di «Scambi di prova» (4 palle, dritti e rovesci) e il gioco impara il colpo di chi gioca. Con i gesti: la calibrazione di prima (telefono fermo, poi un dritto e un rovescio a vuoto); quel profilo resta fino a «Nuovo giocatore». Nessuna: si gioca subito e il gioco impara dai primi colpi veri (all'inizio la forza è meno precisa). Giro: Giocando → Con i gesti → Nessuna → Giocando. (B41.3) Con la modalità fiera accesa dice «Giocando (fiera)» e non cambia: un clic lo spiega (per cambiarla, prima spegni la modalità fiera). | dal prossimo «Gioca» |
| **Tastiera a schermo** | **Automatica** · Sempre · Mai | La tastiera del gioco per scrivere nomi, codice della sfida e campi della diagnostica (capitolo 3.6). Automatica: compare cliccando un campo con il mouse (o toccandolo), sparisce se si usa una tastiera vera. Sempre: compare in ogni campo, anche con una tastiera vera. Mai: non compare. Giro: Automatica → Sempre → Mai → Automatica. | subito |
| **Salvaschermo** (B62, dalla 17.3) | **Dopo 1 min** · Dopo 2 min · Dopo 5 min · No | Dopo quel tempo senza nessuno, con il gioco al menu (o alla pagina della fiera, «Collega», «Pronto per la partita»), il menu sparisce e a schermo intero gira una partita dimostrativa CPU contro CPU con la fascia «Gioca a tennis con il telefono · Chiedi allo staff». Si chiude con il mouse, un clic, un tasto, un tocco o un telefono e si torna alla pagina di prima; il primo clic non preme niente. Mai in partita né con un foglio aperto o la classifica a schermo intero. Di base «Dopo 1 min» nel programma Windows. |
| **Direzione dei colpi** (B36.1) | **Classica** · Nuova · in lavorazione | Classica: la direzione dei colpi di sempre (lascia questa). **Nuova: in lavorazione, non da provare** (si prova al «traguardo A» del piano B36): con il telefono la cima decide la direzione e il momento del colpo la ritocca. Vale solo per i telefoni; webcam, mouse e tastiera restano come sempre. Il chiosco e «Nuovo giocatore» non la cambiano; nella sfida tra due computer vale quella dell'host. Resta salvata. | dalla prossima partita, minigioco, riscaldamento o scambi di prova |
| **Mira del telefono** | **Alta · 17°** · Media · 20° · Bassa · 23° | Quanto girare il telefono per mandare la palla sulla riga. Alta: più palle angolate; Media e Bassa un po' meno. Vale per i telefoni di questo PC. | dal colpo dopo |
| **Registro di gioco** | **Sì** · No | Il gioco annota da solo come vanno le partite (solo dati di gioco, mai i nomi) e le manda allo spazio Cloudflare. Sotto c'è lo stato in parole, con «Invia adesso» e «Scarica la coda» (capitolo 9). | subito |
| **Telecomando dello staff** | «Abbina» · «Abbinato, non collegato» · «Collegato ✓» | Apre il foglio del telecomando: QR, codice, «Conferma», «Abbina un altro telefono», «Scollega il telecomando» (capitolo 6). «Indietro» riporta al pannello. | — |
| **Schermo del gioco** | lo schermo di adesso, per esempio «Monitor 2 · 1024×1024 · probabile ledwall ›» (con «(principale)» o «· scala 125%» quando valgono) | Sposta il gioco sullo schermo successivo; la scelta resta salvata. C'è solo nel programma Windows; serve con due o più schermi. | subito |
| **Nuovo giocatore** | — | Per chi arriva: azzera nome, mano (torna «Destra»), tutorial visto, quello che il gioco ha imparato dal telefono, «Chi gioca» (torna «Adulto»), i record dell'«Ospite» e l'icona del servizio (di nuovo ai primi 2 servizi); nello stesso schermo anche nomi e fasce. Il telefono **resta collegato**. Porta al passo giusto: contro la CPU il foglio «Come ti chiami?» (mano, nome con la tastiera a schermo o «Gioca come Ospite»), poi tutorial corto, scambi di prova e «Pronto per la partita»; con un minigioco scelto lo stesso foglio, poi lo stesso minigioco (capitolo 3.4); nello stesso schermo la pagina dei due telefoni; dal menu principale e dall'allenamento il menu. Nella sfida tra due computer azzera chi gioca su questo PC e torna al menu: la sfida si chiude. | subito · **secondo clic in partita** |
| **Chiudi** | — | Chiude il pannello; la partita riparte. | — |

**Il secondo clic in partita (dalla versione del 13/11, B43).** In partita (anche negli scambi di prova, nell'allenamento
e nei minigiochi) tre voci non partono al primo clic: «Nuovo giocatore», «Classifica · A schermo intero» e «Telefono ·
Scollega» (solo con un telefono collegato).

1. Primo clic: il pulsante diventa rosa e dice «Sicuro? Clicca ancora».
2. Secondo clic, da mezzo secondo a 5 secondi dopo: la voce parte. Il doppio clic non basta.
3. Dopo 5 secondi, o con un clic su un'altra voce, il pulsante torna com'era.

Fuori dalla partita (menu, fine partita) queste voci partono al primo clic. «Torna al menu» della pausa vuole sempre il
secondo clic. Dal telecomando: OK due volte sul pulsante rosa.

---

## 3. Ogni visitatore

### 3.1 La pagina «Collega il telefono»

- **Telefono nuovo:** inquadra il QR, tocca il link, poi «Attiva i sensori». Appena il telefono è pronto il gioco va
  avanti da solo: tutorial corto, scambi di prova, «Pronto per la partita».
- **Telefono già collegato quando la pagina si apre:** il gioco **non** va avanti da solo. Clicca il pulsante in basso a
  destra: «In campo ›» (tutorial o scambi di prova da fare) o «Alla partita ›» (si va dritti a «Pronto per la partita»).
- Per un telefono che passa di mano la via giusta è «Nuovo giocatore» (3.3): questa pagina si salta.
- «Prima volta su questo telefono» (sotto il QR, quando il PC è in rete): il QR della pagina del certificato
  (capitolo 7.4).
- «Apri il link del controller ↗» è per il telefono: (B39) nel programma un clic mostra solo un avviso (prima apriva una
  seconda finestra sopra il gioco).
- La mano si sceglie già nella pagina prima, «Con cosa giochi?» (riga «Giochi con la mano: Destra · Sinistra»).

### 3.2 La pagina «Pronto per la partita»

Ci si arriva dopo «Collega il telefono», il tutorial corto e gli scambi di prova. Con «Gioca ancora» si torna qui dopo
un nuovo giro di scambi di prova (con «Calibrazione: Giocando»).

- **«Chi gioca?»** (solo contro la CPU): Bambino (livello Bambini: palla più lenta, più tempo per colpire) · Ragazzo (CPU
  facile) · **Adulto** (livello Evento: la partita si regola su come giochi). Un clic. **Non resta salvato**: torna
  «Adulto» a ogni avvio del programma (anche dopo un aggiornamento o «Ricarica il gioco»), con «Nuovo giocatore» e con
  il chiosco. **Telecomando:** «Chi gioca» (ogni tocco passa al successivo, anche CPU Esperta e Leggenda).
- **«Personaggi»**: **Classici** · Lob & Drop. Vale subito e resta salvato.
- **«Altre impostazioni ›»**: un clic la apre o la chiude; a ogni visita della pagina è chiusa. Accanto c'è il riassunto
  (per esempio «1 game · singolare · 3ª persona»). Dentro:
  - **Livelli per esperti** (dalla B64; prima «Livello della CPU» con tutti e cinque): Esperta · Leggenda. Bambini, Facile
    ed Evento si scelgono solo con le tessere di «Chi gioca» (erano doppioni). Non resta salvato: Esperta o Leggenda vanno
    scelti di nuovo per ogni visitatore nuovo; una tessera di «Chi gioca» torna ai livelli di sempre. Sul PC si scelgono
    solo qui (oppure con il tasto «Chi gioca» del telecomando).
  - **Formato**: **Singolare 1v1** · Doppio 2v2 (resta salvato; nello stesso schermo solo singolare).
  - **Durata**: **1 game** · Al meglio di 3 · Al meglio di 5. A ogni avvio del programma torna «1 game». Con il formato in
    fiera acceso «Al meglio di 5» sparisce.
  - **Batte per primo**: **Tu** · CPU · Sorteggio contro la CPU; nello stesso schermo i due giocatori e **Sorteggio**. Dalla B64 contro la CPU si vede solo con «Battuta: Alternata» del pannello: con «Sempre lo stesso» (di base) batte sempre chi gioca e la voce non cambiava niente.
    Resta salvato.
  - **Visuale**: **3ª persona** · 1ª persona.
- In basso: «‹ Indietro», «Riscaldati prima» (facoltativo: dritto, rovescio e servizio con il lanciapalle; non nello
  stesso schermo) e «Gioca ›».
- **(B54) Nome dal telefono** (dalla 2026-11-16.1, non va acceso): arrivando su questa pagina, prima di «Sono pronto», il
  telefono di chi gioca chiede **«Come ti chiami?»**. Il visitatore scrive il suo nome con la tastiera del telefono e
  tocca **«Conferma»**, oppure tocca **«Salta»** (in alto a destra) se non lo vuole. Il nome va sul tabellone in alto a
  sinistra (contro la CPU al posto di «Tu»), sulla schermata finale e nella classifica del giorno; nello stesso schermo
  ognuno scrive il suo sul suo telefono. Accanto a «Gioca ›» vedi «Telefono: scrive il nome» finché non risponde. A ogni
  partita si chiede di nuovo: dopo «Prossimo giocatore» il campo è vuoto, nella rivincita c'è il nome di prima (si tiene
  con «Conferma» o «Salta», o si cambia). Parolacce, bestemmie e insulti (anche scritti con i numeri) non passano: il
  telefono dice «Scegli un altro nome». (Dalla 2026-11-16.5) «Nuovo giocatore» per una partita con il telefono non apre più
  la tastiera del PC per il nome: lo chiede il telefono; per i minigiochi la tastiera del PC resta. Per correggere un nome dal PC: «Nome» sulla pagina della fiera (contro la CPU) o
  il campo del nome di ciascuno (stesso schermo). Nel registro dello stand c'è solo se il nome è stato scritto, mai il
  nome. Con una pagina del telefono più vecchia (un telefono rimasto aperto da prima dell'aggiornamento) il nome non si
  chiede e resta «Sono pronto» come prima. Dopo l'aggiornamento del PC alla 2026-11-16.2, **una volta sola** su ogni
  telefono: tre volte «volume giù» → «Riapri l'ultimo collegamento» (o chiudi e riapri l'app; in Chrome ricarica la
  pagina). Dalla 16.2 in poi i telefoni prendono da soli la pagina nuova dopo ogni aggiornamento, fuori dalla partita.
- **«Sono pronto» dal telefono** (dalla 2026-11-14.1, non va acceso): su questa pagina il telefono di chi gioca mostra un
  grande pulsante giallo «Sono pronto». Quando hanno toccato tutti (uno contro la CPU, due nello stesso schermo) la
  partita comincia da sola. Accanto a «Gioca ›» vedi chi è pronto («Telefono pronto ✓»). «Gioca ›» resta sempre per te.
  Se un telefono cade prima del tocco (scollegato, schermo spento) il computer dice perché e quel telefono ritocca.
  (B47) Il conto di 3 secondi di questa pagina non c'è più: al suo posto il **conto alla rovescia grande in campo**
  (capitolo 4), uguale per «Sono pronto» e per «Gioca ›».
- Se sotto c'è scritto «Con «Gioca» prima qualche scambio di prova…», il primo «Gioca ›» fa gli scambi di prova e
  riporta qui: scegli e clicca di nuovo «Gioca ›».
- (B39) Un doppio clic sul pulsante della pagina prima («Alla partita ›», nello stesso punto di «Gioca ›») non salta più
  questa pagina: il secondo clic non conta, e nemmeno un clic arrivato meno di mezzo secondo dopo il cambio di pagina.

### 3.3 A fine partita

**Cosa vede il visitatore (B40, fine partita v2; dettagli in `docs/b40/fine-partita-v2.md`).** Il personaggio della
partita (Classici o Lob & Drop) fa festa in campo: chi vince salta con la racchetta alzata, chi perde dopo un secondo
applaude battendo la mano sulle corde. Poi la schermata finale di sempre (titolo grande, game, i tre riquadri con le cose
migliori, pulsanti) ha accanto la **card della partita**: il suo personaggio che si muove in loop, la cornice del livello
(Bambini azzurra, Facile argento, Evento giallo-verde, Esperta oro, Leggenda arcobaleno), «MVP della partita» o «Bella
sfida», fino a **3 trofei** con le medaglie (bronzo, argento, oro; per esempio «Razzo 142 km/h», «Prima volta» alla prima
partita, «Re di oggi» per i primi tre della classifica di oggi con almeno 5 partite), il **record di oggi** del computer
(«Record di oggi! 150 km/h», solo il numero, mai il nome di un altro) e, a chi perde o vince senza trofei, il **prossimo
trofeo** detto in positivo. Nello stesso schermo le due card una contro l'altra, la corona su chi vince. Non c'è niente da
accendere. Se il personaggio nella card è quello disegnato e non si muove come in campo: il PC non ha fatto in tempo a
preparare i fotogrammi o l'indirizzo ha `?ritratti=svg` (va bene lo stesso). «Azzera oggi» (pannello dello stand) azzera
anche i record di oggi.

**(B65, dalla 17.4) Classifica di oggi a fine partita.** Nel programma Windows, 5 secondi dopo la card compare per 8 s la
classifica del giorno: le prime 5 partite con il punteggio e, sotto, la riga di chi ha giocato con la sua posizione (per
esempio 221°). Un tocco la chiude. Nello stesso schermo entra in classifica solo chi vince (con un nome vero), con
«stesso schermo». Niente da accendere; si spegne solo a mano (`natpf-tennis.classificaFine` = '0').

**(B58, dalla 16.10) Lob o Drop nella card.** Nel programma Windows la finestra del personaggio della card (a sinistra)
mostra una delle due mascotte al posto del personaggio: festeggia se quella card vince, consola se perde; un'animazione a
caso, mai una della partita prima (nello stesso schermo una per card). **Dalla 17.2**: Drop sulla card del Player 1 (chi
gioca contro la CPU) e Lob su quella del Player 2 o della CPU, come in campo con «Lob & Drop»; sempre animate, anche con
«riduci movimento» del computer, e la figura intera salta e fa passi avanti, indietro e di lato. Non c'è niente da
accendere. Se il file manca torna il personaggio disegnato. Nel gioco dal browser (Cloudflare) non c'è. (La 16.9 la
metteva accanto al titolo: corretta il 16/11 su richiesta dell'utente.)

**(B67/B69, dalla 2026-11-18.2) Con «Lob & Drop» le mascotte 3D ballano nella card.** Se in campo ci sono Lob e Drop
(«Personaggi: Lob & Drop» in «Pronto per la partita»), la card mostra la mascotte vera della partita, fotografata a fine
partita con le luci dell'arena (circa 3 secondi dopo la card; prima si vede il personaggio disegnato): chi vince fa uno
di dieci movimenti (salti, giravolta, «Sei-sette», «Aura» con l'alone, robot a scatti, disco con il dab, corsa
all'indietro, passi incrociati, braccia a pendolo con la racchetta piantata a terra, saltelli che spingono il soffitto),
chi perde è visibilmente triste (faccia triste, testa bassa; cinque movimenti: racchetta trascinata, sospiro con la
nuvoletta, lacrima, calcia un sassolino, capriccio). A caso, mai lo stesso della partita prima. Con i **Classici** nulla
cambia (le GIF di Lob e Drop qui sopra). Niente da accendere; vale anche nel gioco dal browser. Se servisse spegnerle:
`natpf-tennis.mascotte3d` = '0' (tornano le GIF) o `?mascotte3d=0` nell'indirizzo.

- **«Gioca ancora»** (contro la CPU, se vince chi gioca) o **«Rivincita»**: la stessa persona. (B47) Si apre la **scelta
  del livello**, grande, già segnata con il livello di prima: contro la CPU «Chi gioca? Bambino · Ragazzo · Adulto»
  (c'è anche «CPU Esperta» o «CPU Leggenda» se era quello il livello); nello stesso schermo la fascia di ciascun
  giocatore con il suo nome. Un clic per cambiare, poi **«Gioca»** (un clic solo se il livello va bene così). Con il
  telefono e «Calibrazione: Giocando» prima di nuovo gli scambi di prova (circa 10 secondi; «Salta ›» li salta), poi il
  conto alla rovescia grande e la partita, senza ripassare dal menu. **«Altre impostazioni»** porta alla pagina «Pronto
  per la partita» di sempre (durata, formato, chi batte…); **«‹ Indietro»** (o Esc) torna alla schermata finale.
  **Tastiera:** frecce, Invio, Esc. **Telecomando:** frecce, OK, Indietro; «Gioca» gioca con il livello segnato; «Chi
  gioca» cambia il livello anche da qui. Nella sfida tra due computer è la rivincita, subito.
- **«Nuovo giocatore»**: una persona nuova; il telefono resta collegato. Si apre il foglio «Come ti chiami?»:
  1. «Giochi con la mano»: clicca «Sinistra» per un mancino (per ogni persona nuova torna «Destra»).
  2. Il nome: clic sul campo → tastiera a schermo → clic sui tasti → «Fatto» → «Avanti ›» (capitolo 3.6). Oppure
     **«Gioca come Ospite»** accanto al campo: un clic, senza nome; il punteggio resta **fuori classifica**.
  3. Poi tutorial corto, scambi di prova e «Pronto per la partita».

  Nella sfida tra due computer questo pulsante non c'è.
- **«Menu»**: il menu principale.

### 3.4 Minigiochi con il solo mouse

Dalla pagina «Minigiochi» il foglio «Il tuo nickname» chiede un nome (almeno 2 caratteri, per la classifica del giorno):

1. Menu principale → «Minigiochi» → clic sul minigioco.
2. Clic sul campo → tastiera a schermo → scrivi il nome cliccando i tasti → «Fatto» → «Avanti ›» (capitolo 3.6).
3. Oppure **«Gioca come Ospite»** (accanto al campo): un clic, senza nome. Il punteggio resta **fuori classifica**; il
   risultato lo dice («Fuori classifica: hai giocato come Ospite»). Record e medaglie dell'ospite si vedono lo stesso.
   Per i minigiochi dopo il nome non viene più chiesto, fino a «Nuovo giocatore».
4. Se il telefono non è collegato, prima «Collega il telefono»; poi il minigioco.

Sul risultato: «Riprova ›» per la stessa persona; «Nuovo giocatore» per la persona dopo, con lo stesso minigioco (nel
foglio «Come ti chiami?» nome o «Gioca come Ospite»). **Telecomando:** «Nuovo giocatore», poi «Salta il nome» (è «Gioca
come Ospite»), oppure le frecce fino a «Gioca come Ospite» e OK. Il telecomando non scrive i nomi.

### 3.5 Due visitatori sullo stesso schermo

«Gioca» → «Stesso schermo» → pagina «Collega i due telefoni».

- In alto: i due nomi (clic sul campo: la tastiera a schermo compare nella metà di chi scrive, capitolo 3.6; senza nome
  restano «Player 1» e «Player 2») e la scelta **«Due telefoni»** · «Una webcam per due». Mentre la tastiera è aperta su
  un nome il conto alla rovescia aspetta.
- Ogni scheda (Player 1 a sinistra, Player 2 a destra) ha il suo QR, la mano (Destra · Sinistra) e «Bambino · Ragazzo ·
  Adulto». Con fasce diverse il più giovane ha un aiuto di gioco, mai punti regalati.
- «Gioca senza calibrare» compare su una scheda solo mentre quel telefono calibra con i gesti: si gioca subito e il gioco
  impara dai colpi veri.
- Si parte così:
  1. ognuno inquadra il suo QR e chiude il suo tutorial;
  2. quando sono pronti tutti e due, conto alla rovescia di 3 secondi. «Aspetta» lo ferma; poi «Gioca ›» fa partire;
  3. con «Calibrazione: Giocando», gli scambi di prova per tutti e due;
  4. (B47) il conto alla rovescia grande, **uno solo** al centro dello schermo intero: «Preparati · La partita sta per
     cominciare · 3 · 2 · 1» con chi batte («Batte sempre Giulia»);
  5. la partita.
- (B47) A fine partita: «Rivincita» sul computer apre la scelta delle fasce (Bambino · Ragazzo · Adulto per ciascuno, con
  i nomi; capitolo 3.3). Se la chiedono **tutti e due i telefoni** si apre la stessa scelta, che **parte da sola dopo 10
  secondi** se nessuno la tocca (senza scambi di prova, come prima); un clic dello staff ferma la partenza da sola e si
  aspetta «Gioca».
- Per cambiare durata o chi batte: «Aspetta», poi «Impostazioni partita ›» in basso a destra (si attiva quando i due
  telefoni sono pronti). Nella pagina «Stesso schermo» che si apre, «Gioca ›» fa partire; resta grigio se un telefono
  non è pronto.
- Opzioni dello stand che contano qui: «Formato in fiera» (di base acceso solo qui), «Lancio automatico» e «Stesso
  schermo: campo aperto» (spenti di base). Lancio automatico, campo aperto e l'aiuto al più giovane valgono **solo con
  «Due telefoni»**: con «Una webcam per due» restano spenti, e non vale nemmeno «Scambio che si scalda».

### 3.6 Scrivere con il solo mouse: la tastiera a schermo (B38)

- **Dove:** il nome del giocatore («Come ti chiami?» e «Il tuo nickname»), i due nomi dello stesso schermo, il codice della
  sfida tra due computer, la nota e il ritardo dello schermo della diagnostica.
- **Come:** clic sul campo → la tastiera compare in basso (il foglio sale se serve: il campo resta in vista) → clic sui
  tasti → **«Fatto»** chiude la tastiera → poi il pulsante del foglio («Avanti ›», «Entra ›»). Esc o un clic fuori la
  chiudono anche loro.
- **Tasti:** cifre, lettere, **à è é ì ò ù**, punto, trattino, **⇧** (maiuscola per la lettera dopo; nei nomi la prima
  lettera e quella dopo uno spazio sono già maiuscole), spazio, **⌫** (cancella). Nel codice della sfida solo maiuscole,
  cifre e trattino; nel ritardo dello schermo un tastierino con le cifre.
- **Stesso schermo:** la tastiera sta nella metà di chi scrive (Player 1 a sinistra, Player 2 a destra); sugli schermi
  stretti sta sotto i due nomi.
- **Con una tastiera vera:** basta scrivere; la tastiera a schermo sparisce al primo tasto.
- **Doppio clic su «Fatto»:** il secondo clic non arriva al pulsante sotto.
- **Opzione** nel pannello: «Tastiera a schermo: Automatica · Sempre · Mai» (capitolo 2).
- **Senza nome = Ospite = fuori classifica.** «Gioca come Ospite» (accanto al campo del nome) gioca senza nome: il
  punteggio non entra nella classifica del giorno (minigiochi e partite contro la CPU) né nel CSV. Anche chi gioca
  contro la CPU dal menu senza scrivere il nome è fuori classifica: per entrarci serve il nome («Nuovo giocatore» lo
  chiede). «Ospite» non si può scrivere come nome.

---

## 4. In campo: la pausa e il riquadro del telefono

**(B47) Il conto alla rovescia grande prima del primo punto.** A ogni partita con il telefono (contro la CPU e nello
stesso schermo con i due telefoni, non con webcam o mouse e non nella sfida tra due computer), dopo gli scambi di prova o
dopo «Gioca», compare al centro dello schermo «Preparati · La partita sta per cominciare · 3 · 2 · 1» con chi batte; i
telefoni dicono «Si gioca tra 3». Intanto la partita è ferma al primo servizio: 3 secondi, poi «Start» e si gioca. Non
si apre niente con il mouse: è solo da guardare. Se intanto si apre la pausa (o il pannello dello stand, o un telefono
cade) il conto aspetta e poi riprende da dove era; non torna a «Riprendi» dopo una pausa a partita in corso.

**Aprire la pausa.** **Mouse:** ❚❚, il pulsante tondo in alto a destra (un clic breve; tenuto 3 secondi apre il pannello
dello stand, B39). **Tastiera:** Esc. **Telecomando:** «Pausa». La partita resta ferma finché la pausa è aperta. (B39) Il
riquadro «Telefono in pausa» sta sotto la pausa e sotto il pannello del telefono: non copre più «Riprendi ›» né il QR.

| Voce della pausa | Cosa fa |
|---|---|
| Volumi (in alto) | Musica, Effetti, Voci: trascina i cursori. Restano salvati. |
| **Musica** · Sì / No | Tutto l'audio, come «Musica» del pannello (non resta salvato). |
| **Voce** · Sì / No | Solo la voce del punteggio, come Opzioni → «Voci» (resta salvata). |
| **Visuale** | 3ª persona · 1ª persona. |
| **Schermo** | Schermo intero sì / no. |
| **Movimento** | Solo con la webcam. |
| **Moviola** · Rivedi il punto | L'ultimo punto al rallentatore, poi si torna al servizio. Solo in partita, dopo il primo punto. |
| **Telefono** · Ricalibra | Solo con il telefono. Apre il riquadro del telefono (sotto): **da sola non ricalibra**. |
| **Aiuto** · Come si gioca | La guida a schede. |
| **Diagnostica** · Registra la sessione | Apre la diagnostica, per chi sviluppa (lì si registra la sessione). La partita resta ferma; chiudendo si torna alla pausa. |
| «Torna al menu» | Chiude la partita. Vuole sempre il secondo clic («Sicuro? Clicca ancora»). |
| «Riprendi ›» | Chiude la pausa: la partita riparte. |

**Il riquadro del telefono.** Si apre dalla pausa con «Telefono · Ricalibra». In alto i passi Collega · Impugna · Prova ·
Verifica · Pronto. La partita resta ferma finché è aperto. I pulsanti cambiano con lo stato del telefono:

- Telefono **«Pronto»**:
  - «Ricalibra»: con «Calibrazione: Giocando», in partita, scambi di prova e poi si rigioca il punto con il punteggio
    com'era (fuori dalla partita il gioco reimpara dai colpi); con «Con i gesti», di nuovo i gesti.
  - «Calibra con i gesti»: la calibrazione di prima (telefono fermo, poi un dritto e un rovescio a vuoto).
  - «Scollega»: toglie il telefono a chi gioca. **Un clic, senza conferma**: per giocare va rifatto il QR.
- Durante la calibrazione con i gesti: «Salta l'impugnatura», «Rifai i gesti», «Inverti direzioni» (se i versi sono
  letti al contrario), «Conferma la racchetta», «Salta la calibrazione» (si gioca subito, il gioco impara dai colpi veri).
- Sensori in errore: «Ricalibra».
- In fondo «Torna al campo» chiude il riquadro (prima di una partita può dire «Continua ›»).

**Telecomando:** «Ricalibra il telefono» fa tutto con un tasto solo.

**(B45.1) Quando il telefono tace.** Tra la folla la Wi-Fi del telefono si ferma ogni tanto per qualche secondo. La partita
si ferma subito e il riquadro dice, con calma:

- «**Telefono 1: segnale debole, aspetto che torni…**» · «La partita è in pausa e riprende da sola appena il telefono
  torna.» Il collegamento resta aperto per **10 secondi** di silenzio: se il telefono torna prima, conto alla rovescia e
  si riprende (il punto interrotto si rigioca). Non serve toccare niente.
- Dopo 10 s: «**Telefono 1 scollegato · si ricollega da solo**» · «Senza segnale da N s: …». Il telefono riprova da solo
  senza fine e rientra con la sua chiave: **niente QR e niente calibrazione da rifare**.
- Solo se dopo altri **20 s** non è tornato si apre il riquadro del telefono con il QR (per esempio se il visitatore ha
  chiuso la pagina del gioco sul telefono). «Ricollega il telefono» nel riquadro della pausa resta per lo staff.
- Nello stesso schermo il riquadro dice il nome: «Telefono di Giulia: segnale debole, aspetto che torni…».

---

## 5. Le Opzioni del gioco

**Mouse:** menu principale → «Opzioni» (pulsante piccolo in basso a destra, accanto a «Classifica») → clic sul valore
voluto. Vale subito e resta salvato (tranne «Audio»). Si torna con «‹ Indietro». Su un ledwall quadrato la pagina è più
lunga dello schermo: scorri con la rotellina.

| Riga | Valori | Cosa fa |
|---|---|---|
| **Schermo** | «Schermo intero» / «Esci da schermo intero» | Entra o esce dallo schermo intero. Lo stesso pulsante è in alto a destra in ogni pagina del menu. **Tastiera:** F (nel programma anche F11). «All'avvio» c'è solo nella versione web: il programma ricorda da solo l'ultimo stato. |
| **Area** | **Intero** · Ledwall 2×2 · Ledwall 3×2 | Ledwall 2×2: area quadrata al centro dello schermo; 3×2: area 3:2. |
| Area · «Calibra lo schermo…» | — | Frecce agli angoli, cerchio e griglia. (B39) **Clicca l'angolo in alto a sinistra e quello in basso a destra che vedi sul ledwall** (una scritta gialla accanto al puntatore dice cosa cliccare): l'area diventa quel rettangolo e «Salva» ci sta dentro. Poi, se serve, **trascina le frecce dei bordi**, o «−» e «+» (tenuti premuti ripetono, poi a passi da 5 %). «Formato» (Intero, 16:9, 16:10, 4:3, 3:2, 1:1), «Bordo», «Schermo intero», «Clicca i due angoli» (rifà i due angoli). Il cerchio deve restare rotondo. «Salva», «Annulla» o «Azzera». Nel programma anche tasto destro → «Calibra lo schermo…» o «Azzera la calibrazione dello schermo». Tasti: capitolo 12. |
| **Puntatore** (B39) | Normale · **Grande** (nel programma; nel browser Normale) | Grande: freccia gialla con il bordo nero alta circa il 5 % dell'area, al posto della freccia di Windows e del mirino sul campo. In campo il puntatore sparisce dopo 3 secondi fermo (e quando la partita parte), nei menu dopo 10 secondi; ricompare muovendo il mouse, con un anello. Con un'area calibrata più piccola della finestra, se il puntatore esce dalla parte che si vede una freccia gialla sul bordo dice dove sta. Resta salvato. |
| **Giochi con la mano** | **Destra** · Sinistra | La mano di chi gioca. Torna «Destra» con «Nuovo giocatore» e con il chiosco (per tutti e due i giocatori). Dal telefono si cambia con **due tocchi** («Mancino? Tocca di nuovo»): sul computer compare per 3 s «Telefono 1: mano sinistra (mancino)», e chi ha la mano sinistra ha «Mancino» accanto al nome negli scambi di prova, nella sua metà e in «Pronto per la partita». Se un destro vede «Mancino», tocca due volte «Destra» sul telefono (o cambia la mano qui). |
| **Segnale del momento giusto** | **Di base** · Sì · No | Un anello bianco si stringe sulla palla e diventa verde quando è il momento di colpire; nelle prime 3 palle di ogni partita compare «Colpisci quando il cerchio diventa verde». Di base: acceso con «Bambino» e «Adulto», spento con «Ragazzo», Esperta e Leggenda. Solo contro la CPU. |
| ~~Visuale~~ | (dalla B64 non più qui) | Doppione: la visuale si sceglie in «Altre impostazioni» prima della partita e in pausa. |
| **Scia della palla** | Sì · **No** | Una scia luminosa dietro la palla veloce. |
| **Movimenti come nel video** (fino alla 2026-11-16.2 «Dritto come nel video (prova)») | **Sì** · No | Il dritto e, dalla 2026-11-15.1, il rovescio, (2026-11-15.2) la schiacciata e (2026-11-15.3) le volée a rete, corte, (2026-11-16.4) il servizio, del personaggio con le movenze del trailer (B53: poi il servizio). No: i colpi di prima. |
| ~~Personaggi in campo~~ | (dalla B64 non più qui) | Doppione: i personaggi (Classici · Lob & Drop) si scelgono in «Pronto per la partita». |
| ~~Audio~~ | (dalla B64 non più qui; restano i Volumi) | Doppione: musica e voci si accendono e spengono in pausa, la musica anche dal pannello dello stand. |
| **Volumi** | Musica **65** · Effetti **85** · Voci **90** | Trascina i cursori (da 0 a 100). Ci sono anche nella pausa. |
| **Telefono** | «Dimentica pallonetto e palla corta imparati» · «Rivedi l'intro» | Il primo fa reimparare i colpi speciali nel prossimo allenamento; il secondo rimostra l'intro. |
| **Aggiornamenti** | solo nel programma Windows | Versione installata, ultima verifica, «Cerca aggiornamenti», «Aggiorna», «Riavvia e aggiorna» (capitolo 7.3). |

---

## 6. Il telecomando dello staff

Un telefono dello staff (non quello dei visitatori) comanda il gioco: frecce, OK, Indietro, Pausa, Torna al menu, Nuovo
giocatore, Pannello dell'addetto… Con il solo mouse è l'unico modo di aprire il pannello senza chiudere la partita.
C'è anche una guida a parte, con tutti i casi (vedi «Per chi sviluppa»).

### 6.1 Una volta sola: abbinare il telefono

Serve: il programma aperto e il telefono dello staff sulla **stessa Wi-Fi** del PC (non quella per ospiti); Android con
Chrome o iPhone con Safari.

1. **Certificato** (solo la prima volta su quel telefono; se ha già fatto da racchetta, salta questo passo).
   **Mouse:** «Gioca» → «Contro la CPU» → «Smartphone» → sotto il QR clicca «Prima volta su questo telefono» (compare
   quando il PC è in rete) → il telefono inquadra il QR che compare e installa il certificato seguendo la pagina → sul
   PC «Chiudi» → «‹ Indietro» fino al menu. Oppure (B39) tasto destro → «Rete per i telefoni» → «Indirizzi e certificato
   per i telefoni…». **Tastiera:** in finestra Alt → Rete → «Indirizzi e certificato per i telefoni…».
2. **Abbinamento.** Pannello dello stand → «Telecomando dello staff». Compaiono un QR e un codice (per esempio
   K3ZQ-7M2P). Valgono 5 minuti e solo con questo foglio aperto.
   - **Android:** inquadra il QR. Sul telefono e sul PC compare lo stesso numero di tre cifre («Un telefono chiede di
     diventare il telecomando · numero 417»). Se è uguale, sul PC clicca **«Conferma»**; se è diverso, «Rifiuta». Poi sul
     telefono «Installa» nel riquadro verde, oppure menu ⋮ → «Aggiungi a schermata Home».
   - **iPhone:** si abbina l'icona, non Safari. Inquadra il QR, poi Condividi → «Aggiungi alla schermata Home» → apri
     l'icona **NATPF Telecomando** → scrivi il codice che vedi sotto il QR sul PC → «Collega con il codice». Compare il
     numero: sul PC «Conferma».
   - Fatto: sul PC «Telecomando abbinato ✓», sul telefono «Collegato al gioco». Il QR sparisce.
3. **Sicurezza.** Il foglio si vede sul ledwall, ma il QR da solo non basta: serve «Conferma» sul PC. Non confermare mai
   un numero che non è sul telefono dello staff.
4. **Consiglio:** abbina con la «Modalità chiosco» spenta. Se nessuno clicca per il tempo del chiosco, il gioco può
   tornare al menu e il foglio si chiude.
5. Tempo scaduto (5 minuti) o «Troppi tentativi sbagliati: abbinamento chiuso»: «Nuovo QR». Cambiare telefono: «Abbina
   un altro telefono» (quello di prima non comanda più). Telefono perso: «Scollega il telecomando»: il primo clic chiede
   «Sicuro? Premi ancora per scollegare», il secondo scollega (B39: un doppio clic non basta più).

### 6.2 Ogni giorno

Apri l'icona **NATPF Telecomando**: si ricollega da sola, anche dopo il riavvio del gioco o del PC, un aggiornamento o un
calo del Wi-Fi. In alto dice dove è il gioco (menu, «Pronto per la partita», partita con il punteggio, pausa…) e se il
telefono del giocatore è collegato, con la batteria su Android. Nel pannello la voce dice «Collegato ✓».

### 6.3 I pulsanti

| Pulsante | Cosa fa |
|---|---|
| ↑ ↓ ← → e **OK** | Come le frecce e Invio nel menu e nei fogli. **In partita non fanno niente**: non muovono il giocatore e non tirano colpi. |
| **Indietro** | Come Esc: pagina precedente o foglio chiuso; chiude anche il pannello dello stand; in campo mette in pausa; a fine partita porta al menu. |
| **Pausa / Riprendi** | Solo in campo. |
| **Gioca** | Dal menu verso la partita contro la CPU; in «Pronto per la partita» è «Gioca!»; a fine partita «Gioca ancora» (B47: apre la scelta del livello; lì «Gioca!» fa partire con il livello segnato); sul risultato di un minigioco lo rigioca. |
| **Torna al menu** | Da dove sei; con una partita in corso il telefono chiede conferma. |
| **Nuovo giocatore** | Come «Nuovo giocatore» del pannello; con una partita in corso chiede conferma. (B41 parte 2) Con la modalità fiera si chiama **«Prossimo giocatore»** e fa quello della fiera (i telefoni restano collegati, capitolo 8.4). |
| **Salta** | Intro, nome, scambi di prova (contro la CPU si va a «Pronto per la partita», nello stesso schermo parte la partita), riscaldamento, calibrazione con i gesti (anche nel riquadro del telefono), lezione. Negli esercizi dell'allenamento passa all'esercizio dopo. |
| **Ricalibra il telefono** | Come «Ricalibra» del riquadro del telefono, ma in un tasto solo. Con «Calibrazione: Giocando», in partita: scambi di prova, poi si rigioca il punto con il punteggio com'era. |
| **Rivedi i gesti** | Il tutorial dei gesti (Indietro lo chiude). |
| **Chi gioca** | Bambino → Ragazzo → Adulto → CPU Esperta → CPU Leggenda: solo contro la CPU, dal menu, prima o dopo la partita. |
| **Schermo del gioco** | Schermo successivo (programma Windows, con due o più schermi). |
| **Schermo intero** | Sì o no. |
| **Pannello dell'addetto** | Apre e chiude il pannello dello stand. |

**Cosa non fa:** non preme «Conferma» dell'abbinamento, «Azzera oggi», «Scarica CSV», «Scarica la coda» e i link (si
fanno dal PC); non scrive i nomi; un solo telecomando alla volta. Un pulsante grigio e tratteggiato non serve in quella
pagina: sotto c'è scritto perché. Ogni comando del telecomando conta come attività per il chiosco.

### 6.4 Sul telefono del telecomando

- **«Non usare più questo telefono»** (in basso): due tocchi («Tocca ancora per togliere il telecomando da questo
  telefono»). Toglie l'abbinamento dal telefono: per usarlo di nuovo va abbinato da capo.
- **«Il gioco non si trova…»** con **«Scrivi il codice»**: il gioco è spento, o il telefono non è sulla stessa Wi-Fi.
  Se il gioco è acceso e la rete è giusta, il telefono non è più il telecomando (scollegato o sostituito): inquadra di
  nuovo il QR dello staff, o tocca «Scrivi il codice».
- **«Telecomando aperto in un'altra pagina · tocca per riprendere qui»**: lo stesso telecomando è aperto anche in
  un'altra pagina. Un tocco lo riprende qui; l'altra pagina si ferma.

**Non provato** con telefoni veri, su Windows vero, sul ledwall e con il Wi-Fi dello stand (provato nel browser con un
telefono simulato).

---

## 7. Il programma Windows

### 7.1 All'avvio: su quale schermo

- Con due o più schermi e nessuna scelta salvata, prima del gioco compare sullo schermo principale (il portatile)
  «**Su quale schermo mostro il gioco?**». Un pulsante per schermo, con nome e misura; il ledwall quadrato ha «probabile
  ledwall». Clicca quello del ledwall: resta salvato e la domanda non torna.
- «Decidi tu», o nessuna risposta per 30 secondi: il programma usa lo schermo «probabile ledwall».
- Ledwall spento all'avvio e altri due schermi accesi: la domanda torna. Senza risposta il gioco parte su un altro
  schermo solo per quella volta, e va sul ledwall appena si accende.
- Ledwall acceso dopo il programma: il gioco ci va da solo, se è lo schermo salvato.

**Cambiare schermo dopo.** **Mouse:** tasto destro → «Schermo del gioco» → il monitor (B39), oppure pannello dello stand
→ «Schermo del gioco» (ogni clic: schermo successivo; resta salvato). (B39) In finestra, anche trascinando la finestra su
un altro monitor: resta salvato. **Telecomando:** «Schermo del gioco». **Tastiera:** Ctrl+Maiusc+M; in finestra Alt →
Schermo → il monitor.

### 7.2 Schermo intero

- Il programma parte a schermo intero e si ricorda l'ultima scelta.
- **Mouse:** «Schermo intero» / «Esci da schermo intero» in alto a destra in ogni pagina del menu (accanto a «Come si
  gioca»); oppure Opzioni → Schermo; in partita ❚❚ → «Schermo». **Telecomando:** «Schermo intero». **Tastiera:** F11
  (programma) o F (gioco).
- A schermo intero la barra del menu del programma non si vede; in finestra compare solo premendo Alt. (B39) Con il mouse
  gli stessi comandi sono nel menu del tasto destro, a schermo intero e in finestra.
- Per far stare il gioco nel ledwall: Opzioni → Area, o «Calibra lo schermo…» (capitolo 5).

### 7.3 Aggiornamenti

- Con internet, pochi secondi dopo l'avvio il programma controlla se c'è una versione nuova. Niente si scarica da solo.
- Nel menu principale compare «Aggiornamento disponibile · <versione>». **Mouse:** «Aggiorna» (si scarica mentre giochi;
  «Più tardi» o «Nascondi» tolgono l'avviso) → quando dice «Aggiornamento pronto»: «Riavvia e aggiorna» → Windows chiede
  il permesso: «Sì». Il gioco si chiude e si riapre aggiornato in meno di un minuto. Impostazioni, certificati e telefoni
  restano.
- Lo stesso da Opzioni → in fondo «Aggiornamenti»: versione installata, ultima verifica, «Cerca aggiornamenti».
  **Tastiera:** in finestra Alt → Aiuto → «Cerca aggiornamenti…».
- La finestra del permesso di Windows può comparire sullo schermo del portatile, non sul ledwall.
- Senza internet il gioco funziona come sempre.

### 7.4 Rete per i telefoni (firewall e certificato)

- I telefoni devono stare sulla stessa Wi-Fi del PC, e la rete non deve isolare i dispositivi tra loro.
- **Firewall.** La regola «NATPF Simulator» la crea l'installazione. Se manca, il programma lo chiede all'avvio: «I
  telefoni devono poter raggiungere questo computer.» → **Mouse:** «Apri la rete ai telefoni» → Windows chiede il
  permesso → «Sì». Con «Più tardi» il gioco parte, ma i telefoni potrebbero non collegarsi. (B39) Se nessuno risponde
  entro 60 secondi vale «Più tardi» (prima il gioco aspettava su «Avvio del gioco…» per sempre).
- Riaprire la rete più tardi: **Mouse (B39):** tasto destro → «Rete per i telefoni» → «Apri la rete ai telefoni
  (firewall)…». **Tastiera:** in finestra Alt → Rete → «Apri la rete ai telefoni (firewall)…».
- **Certificato** sui telefoni, una volta per telefono: «Collega il telefono» → «Prima volta su questo telefono» → il
  telefono inquadra il QR e installa il certificato. **Tastiera:** Alt → Rete → «Indirizzi e certificato per i
  telefoni…».
- Se il PC cambia rete o indirizzo, i telefoni rifanno il QR e il telecomando l'abbinamento. Consiglio: nel router dai al
  PC un indirizzo fisso.

### 7.5 Porta occupata

- Il programma usa due porte: **8443** (gioco e telefoni) e **8081** (pagina del certificato). (B39) La 8080 non serve
  più (prima la usava l'avvio guidato e, se era occupata, il gioco non partiva).
- (B39) Se la 8443 è occupata compaiono, in italiano, la finestra «La porta 8443 è già in uso da …» (con il nome del
  programma che la tiene, se Windows lo dice) e lo stesso testo sulla pagina di avvio, con **«Riprova»** e **«Chiudi il
  programma»**. Prima: un errore in inglese («A JavaScript error occurred in the main process … EADDRINUSE») con il solo
  «OK». Provato su Linux, su Windows non provato.
- Cosa fare: chiudi l'altro programma che usa la porta (per esempio una vecchia finestra «AVVIA NATPF LAN» o un altro
  server), poi «Riprova». Se non sai quale programma è, «Chiudi il programma» e riavvia il PC.
- Se è occupata solo la 8081, il gioco parte ma la pagina del certificato no: i telefoni che hanno già il certificato
  funzionano.
- Aprire il programma due volte non occupa le porte: la seconda volta porta davanti la finestra già aperta.

### 7.6 Chiudere e ricaricare

- **Mouse (B39):** tasto destro sul gioco → **«Esci» → «Sì, chiudi NATPF Simulator»**. Lo schermo intero resta salvato.
  **«Ricarica il gioco»** ricarica il gioco (si riparte dal menu); **«Riavvia il programma» → «Sì, riavvia adesso»**
  chiude e riapre il programma (per esempio dopo un cambio di rete). Il menu del tasto destro c'è anche sulla pagina
  «Avvio del gioco…».
- Prima del B39, con il solo mouse: «Esci da schermo intero» → X della finestra (e il programma si ricordava
  «finestra»).
- **Tastiera:** Ctrl+Q esce, Ctrl+R ricarica il gioco; in finestra Alt → NATPF → «Esci» o «Ricarica il gioco».
- Se il gioco si chiude per un errore, il programma lo ricarica da solo dopo un secondo: si riparte dall'inizio.
- (B39) Se il gioco si blocca (non risponde), dopo 10 secondi compare «Il gioco non risponde» con «Ricarica il gioco»,
  «Aspetta» e «Chiudi il programma»; la finestra sparisce da sola se il gioco torna a rispondere, e se nessuno risponde
  entro un minuto il gioco si ricarica da solo.
- (B39) Il tasto laterale «indietro» del mouse non fa più sparire il gioco.

### 7.7 Dove sono i dati

Impostazioni del gioco, certificati, registri e aggiornamenti scaricati stanno in una cartella del PC e restano anche se
disinstalli il programma. Per aprirla: **Mouse (B39):** tasto destro → Programma → «Cartella dei dati». **Tastiera:** in
finestra Alt → Aiuto → «Cartella dei dati». (Il percorso è in «Per chi sviluppa».) I file salvati dal gioco (classifica,
coda del registro, diagnostica) vanno in Download › NATPF: tasto destro → Programma → «Cartella dei file salvati». Tasti
e menu del programma: capitolo 12.

---

## 8. Fiera ed eventi

### 8.1 Cosa c'è oggi

| Cosa | A cosa serve in fiera | Come si attiva |
|---|---|---|
| Modalità fiera (B41 parte 2) | Telefoni dello stand abbinati una volta e sempre collegati, pagina della fiera al posto del menu (chi gioca con un clic, niente QR né tutorial), «Prossimo giocatore», visitatori numerati, avviso della batteria | Pannello → «Modalità fiera: Sì» (capitolo 8.4) |
| Formato in fiera | Game corti: punto decisivo sul 40-40, servizio ogni due punti (con «Battuta: Alternata») | Pannello → «Formato in fiera». Di base solo nello stesso schermo; «Sì» anche contro la CPU e tra due computer |
| Battuta: Sempre lo stesso (B47) | La gente non capisce il servizio alternato: contro la CPU batte sempre il visitatore, nello stesso schermo sempre chi batte il primo game | Di base (pannello → «Battuta») |
| Conto alla rovescia grande (B47) | «Preparati, la partita sta per cominciare» 3 · 2 · 1 tra gli scambi di prova e la partita | Sempre, con il telefono; non va acceso |
| Conto «Allenati un po'!» (B59) | Prima degli scambi di prova lo stesso conto 3 · 2 · 1, poi la scritta grande «Allenati un po'!»: chi gioca capisce che è un allenamento e che la partita viene dopo | Sempre con «Calibrazione: Giocando»; non con «Ricalibra» a partita in corso |
| Livello dopo «Rivincita» (B47) | Cambiare Bambino · Ragazzo · Adulto (o le fasce dei due) prima della rivincita, con un clic | A fine partita, «Rivincita» o «Gioca ancora» |
| Scambio che si scalda | Scambi che finiscono, partite più corte | Acceso di base (pannello) |
| Calibrazione: Giocando | Niente gesti a vuoto: ogni visitatore fa circa 10 secondi di scambi di prova prima di ogni partita | Di base (pannello → «Calibrazione») |
| Chi gioca | Livello per età con un clic | Pagina «Pronto per la partita», o telecomando |
| Nuovo giocatore | Azzera il visitatore senza scollegare il telefono | Fine partita, risultato di un minigioco, pannello, telecomando |
| Modalità chiosco | Stand che torna libero da solo | Pannello → «Modalità chiosco» e «Ritorno al menu dopo». (B45.1) Il telefono resta collegato: si azzera solo chi gioca |
| Classifica a schermo intero | Il ledwall tra un visitatore e l'altro | Pannello → «Classifica · A schermo intero» |
| Telecomando dello staff | Comandare il gioco senza mouse, anche in partita | Capitolo 6 |
| Lancio automatico, campo aperto | Stesso schermo con i due telefoni: niente attese al servizio, piazzamento che conta | Pannello (spenti di base) |
| Registro di gioco | Dati veri delle partite per migliorare il gioco | Acceso di base (capitolo 9) |

### 8.2 Consigli per la fiera, oggi

- **Un telefono che passa di mano.** Lascialo collegato. Tra un visitatore e l'altro usa «Nuovo giocatore» (o lascia fare
  al chiosco, che dalla B45.1 non scollega più il telefono): non «Telefono · Scollega», che fa rifare il QR. (B41 parte 2)
  Meglio ancora la **modalità fiera** (capitolo 8.4): telefoni dello stand sempre collegati, «Prossimo giocatore» senza
  nome né tutorial da rifare.
- **(B45.2) Con il telefono del visitatore il chiosco non libera il posto.** Azzera chi gioca ma il telefono resta
  collegato: chi se ne va con la pagina del gioco aperta tiene il posto, e chi arriva dopo vede «C'è già un altro
  telefono collegato» (e un telefono che si muove in tasca tiene sveglio il chiosco).
- **(B45.2) Per collegare un altro telefono:** «Scollega» nel riquadro del telefono (pausa → «Telefono · Ricalibra») oppure
  pannello dello stand → «Telefono: Scollega»; poi il visitatore nuovo inquadra il QR.
- **Due visitatori insieme.** «Gioca» → «Stesso schermo» → ognuno inquadra il suo QR (Player 1 a sinistra, Player 2 a
  destra). Quando sono pronti tutti e due: conto alla rovescia di 3 secondi, poi (con «Calibrazione: Giocando») gli
  scambi di prova per tutti e due, poi il conto alla rovescia grande e la partita. Il formato in fiera qui è acceso di
  base (con «Battuta: Sempre lo stesso» resta il punto decisivo, il servizio non cambia). Dettagli: capitolo 3.5.
- **Rivincita con un livello diverso** (B47): a fine partita «Rivincita» → clic sul livello (o sulle fasce) → «Gioca». Dalla B64 nello stesso schermo la rivincita non chiede più la fascia: «Stessi giocatori, stesse fasce» con le fasce di prima scritte e «Gioca»; per cambiarle «Cambia fascia». Contro la CPU resta la scelta del livello. Nelle Opzioni il pulsante «Schermo intero» in alto a destra non c'è (c'è già nella riga «Schermo»).
- **Stand senza staff per un po'.** Pannello → «Modalità chiosco: Sì». (B45.1) Il telefono resta collegato e pronto per
  chi arriva (prima andava ricollegato con il QR).
- **Classifica sul ledwall.** Pannello → «Classifica · A schermo intero». (B39) Con il chiosco acceso resta in vista per
  chi è in fila. Per uscire: «× Chiudi» in alto a destra (compare muovendo il mouse), capitolo 11.
- **Telefoni dello staff:** spegnimento dello schermo al massimo (Android 10 minuti, iPhone «Mai»), niente PIN, risparmio
  energetico spento.
- **Minigiochi:** dalla loro pagina chiedono un nome: si scrive con la tastiera a schermo, oppure «Gioca come Ospite»
  (fuori classifica; capitolo 3.4).

### 8.3 In arrivo

**La modalità fiera (B41)**: la seconda parte, con l'interruttore nel pannello, il foglio «Telefoni dello stand», la pagina
della fiera e «Prossimo giocatore», è descritta nel capitolo 8.4 (dalla 2026-11-14.5).

**Altri blocchi:**

- **Tastiera a schermo e «Gioca come Ospite» (B38): fatto** nella versione che li contiene (capitoli 3.3, 3.4, 3.5 e
  3.6; `docs/b38/tastiera-a-schermo.md`).
- **Stand con il solo mouse (B39): fatto** nella versione che lo contiene (voci segnate «(B39)» in questa guida e
  `docs/b39/stand-solo-mouse.md`).
- **Servizio (B44, fatto).** Al posto del riquadro «Alza il telefono: lanci la palla / Poi colpisci quando la palla è in
  alto» (e delle versioni per webcam e tastiera) accanto alla casella gialla «Al servizio» di chi batte c'è una **piccola
  icona: un telefono che sale con la palla sopra, in loop, senza scritte**. Si vede ai primi 2 servizi di ogni giocatore
  nuovo («Nuovo giocatore» e chiosco la rimettono; «Gioca ancora» no) e di nuovo se chi batte resta fermo 6 secondi; mai
  quando batte la CPU. Nello stesso schermo solo nella metà di chi batte; nella sfida tra due computer sul computer di chi
  batte. Restano la casella «Al servizio», il riquadro di servizio a terra, «Colpisci!» vicino al punto più alto (ai primi
  servizi), «Colpisci quando la palla è in alto · Lancio a vuoto: riprova» dopo un lancio a vuoto e, nello stesso
  schermo, «<nome>, batti tu» dopo 9 secondi (senza più il testo del lancio) e l'avviso del lancio automatico («Tra 8 s
  la lancia il gioco»). La stessa icona è nel tutorial (scheda «Servizio»), nell'allenamento (esercizio «Servizio») e
  nella guida «Come si gioca».
- **Direzione del servizio dal telefono (B48, dalla versione che lo contiene).** Una regola sola, da dire a chi chiede
  «come lo mando dove voglio?»: **colpire prima del punto più alto del lancio manda la palla al centro (alla «T»), dopo
  il punto più alto larga**; nel punto più alto va al centro del quadrato. Forza e profondità non cambiano. Il gioco la
  scrive sotto «Colpisci!» ai primi servizi, nella scheda «Servizio» del tutorial e nella guida «Come si gioca». Solo con
  il telefono: con la webcam e con mouse e tastiera il servizio va dove andava prima (mouse e tastiera: Q/E o A/D
  mirano). Niente da attivare.
- **Servizio della CPU (B48 e B48.1).** Si vede solo con «Battuta: Alternata»: con «Sempre lo stesso», che è la scelta di
  base, contro la CPU batte sempre il visitatore. La CPU serve ogni volta in modo diverso: al centro, addosso o largo,
  piatto, con il kick o tagliato.
  - **«Bambino» e «Ragazzo»: la CPU non serve mai più forte di chi gioca.** Va al massimo alla media dei suoi servizi
    di quella partita. Se batte per prima, prima che il visitatore abbia servito va piano come il servizio più lento che
    si può fare: con il telefono al massimo 64 km/h. La palla è lenta e alta: chi risponde fa qualche passo avanti e la
    prende mentre sale.
  - **«Adulto» (livello Evento): questo tetto in pratica non c'è.** La CPU serve forte, di solito 110–125 km/h anche se
    il visitatore serve a 70, con più varietà e ogni tanto un servizio profondo, vicino alla riga del servizio. Il tetto
    torna solo se la partita va così male per il visitatore da scendere fino al livello di «Ragazzo». Se a un adulto il
    servizio della CPU sembra troppo forte, scegliete «Ragazzo» oppure lasciate «Battuta: Sempre lo stesso».

### 8.4 Modalità fiera: telefoni dello stand e pagina della fiera (B41 parte 2)

Richiesta dell'utente del 13/11: «durante l'evento fiera i telefoni sono sempre gli stessi, quindi è inutile ogni volta
collegare il telefono, scansionare un QR code e fare la calibrazione: io seleziono solo il livello di difficoltà». Lo staff
prepara i telefoni dello stand **una volta**; ogni visitatore fa solo i suoi scambi di prova (circa 10 secondi). Tutto con
il **solo mouse**.

**Prima di cominciare**

- Il programma aperto; i due telefoni dello stand carichi e sulla **stessa Wi-Fi** del PC (non quella per ospiti), con
  Chrome (Android) o Safari (iPhone).
- Se un telefono non ha mai fatto da racchetta su questo PC, prima il **certificato**, con la modalità fiera ancora
  spenta: capitolo 6.1, passo 1 (oppure tasto destro → «Rete per i telefoni» → «Indirizzi e certificato per i
  telefoni…»).
- Sui telefoni: spegnimento dello schermo al massimo (Android 10 minuti, iPhone «Mai»), niente PIN, risparmio energetico
  spento (lo ricorda anche il foglio).

**Accendere la modalità fiera e abbinare i due telefoni (una volta sola, circa 2 minuti a telefono)**

1. **Apri il pannello dello stand.** Nel programma Windows: tasto destro sul gioco → «Pannello dello stand». Oppure, nel
   menu principale, tieni premuto il tasto sinistro per 3 secondi sul titolo grande «NATPF Simulator», finché l'anello
   giallo si riempie.
2. Nel pannello la prima voce è **«Modalità fiera»** e dice **«No»**: cliccala. Diventa **«Sì»** e resta salvata, anche
   dopo un riavvio del programma. Un avviso dice «Modalità fiera accesa…»; se la «Calibrazione» non era «Giocando», ci va
   da sola, e finché la modalità è accesa resta «Giocando (fiera)» (un clic sulla voce lo spiega e non la cambia). Al posto del pannello si apre il foglio **«Telefoni dello stand»** con due schede: **Telefono 1** (numero 1 nel
   cerchio giallo: Player 1, contro la CPU e a sinistra) e **Telefono 2** (numero 2 nel cerchio rosa: Player 2, a destra
   nello stesso schermo). Tutte e due dicono «… da abbinare».
3. Nella scheda **Telefono 1** clicca **«Abbina»**. Nella scheda compare un QR (solo qui, valido 5 minuti) con la scritta
   «Inquadra il QR con il telefono dello stand».
4. Prendi il **primo telefono**: apri la fotocamera, inquadra il QR e tocca il link. Sul telefono compare un **numero di
   tre cifre**, grande; nella scheda «Un telefono chiede il posto · numero 482» e lo stesso numero, grande.
5. Se i due numeri sono uguali clicca **«Conferma»** con il mouse (dal telecomando dello staff non si può); se sono
   diversi clicca **«Rifiuta»**. Un avviso dice «Telefono 1 abbinato: ora sul telefono «Attiva i sensori»».
6. Sul telefono tocca **«Attiva i sensori»** (su iPhone poi «Consenti»). La scheda diventa verde: **«Telefono 1 pronto ✓
   · batteria 82%»** (la batteria solo con Android). Sul telefono: «Telefono 1» in grande, «Pronto ✓» e «Dai il telefono
   al prossimo giocatore».
7. Per giocare anche in due: lo stesso nella scheda **Telefono 2** con il secondo telefono («Abbina» → QR → numero →
   «Conferma» → «Attiva i sensori»). Un QR alla volta: cliccando «Abbina» nell'altra scheda il primo QR si chiude.
8. Clicca **«‹ Pannello»** (in basso a destra del foglio): torni al pannello, dove la voce «Telefoni dello stand» dice
   «1 ✓ · 2 ✓ ›». Clicca **«Chiudi»**. Al posto del menu c'è la **pagina della fiera** («Chi gioca?»).

Dal giorno dopo niente QR: il programma riparte in modalità fiera e i telefoni si ricollegano da soli. Sul telefono basta
riaprire la pagina (la scheda del browser rimasta aperta; conviene aggiungerla alla schermata Home) e, se lo chiede,
toccare «Attiva i sensori».

**Riaprire il pannello con la modalità fiera accesa.** Il titolo grande del menu non c'è più: tasto destro → «Pannello
dello stand» (programma), oppure tieni premuto 3 secondi il marchio **«NATPF Simulator» in alto a sinistra** della pagina
della fiera. I telefoni si guardano da pannello → **«Telefoni dello stand»**.

**Per ogni visitatore, contro la CPU (al massimo 2 clic e 2 tocchi)**

1. Nella pagina della fiera è scelto **«1 giocatore · contro la CPU»** (se c'è «2 giocatori», clicca «1 giocatore · contro
   la CPU»). Clicca **chi gioca**: «Bambino», «Ragazzo» o «Adulto» (già scelto). Per un mancino clicca **«Sinistra»**
   accanto a «Mano». Dai il **Telefono 1**.
2. (B54) Il visitatore scrive il suo nome sul telefono e tocca **«Conferma»** (o **«Salta»** in alto a destra), poi tocca
   **«Sono pronto»**; oppure clicchi tu **«Gioca ›»** (allora il nome non si chiede).
3. Partono gli **scambi di prova** (circa 10 secondi, 4 palle: il gioco impara il suo colpo; «Salta ›» sul telefono li
   chiude prima, ma vale solo dopo il primo secondo: (B41.3) un doppio tocco su «Sono pronto», o «Sono pronto» toccato
   mentre clicchi «Gioca ›», non li salta), poi il **conto alla rovescia grande** («Preparati, la partita sta per cominciare», 3 · 2 · 1) e la
   partita. Contro la CPU **batte sempre il visitatore**, anche con «Battuta: Alternata».
4. A fine partita: **«Prossimo giocatore ›»** (rosa) per la persona dopo, oppure **«Rivincita»** («Gioca ancora» se ha
   vinto) per la stessa persona: si sceglie di nuovo il livello, poi «Gioca». In fiera «Menu» non c'è.

Chi gioca contro la CPU senza un nome («Salta» sul telefono) diventa **«Visitatore 12»** (numerati da capo ogni giorno,
dal primo che gioca) e con quel nome va nella classifica del giorno. Il nome lo scrive il visitatore sul telefono (B54);
per correggerlo dal PC: **«Nome»** accanto a «Visitatore 12» (tastiera a schermo, capitolo 3.6).

**In due, nello stesso schermo (al massimo 3 clic)**: clicca **«2 giocatori · stesso schermo»** (resta scelto anche per i
visitatori dopo). Per ciascuno la fascia («Bambino», «Ragazzo», «Adulto») e la mano («Destra», «Sinistra»); poi (B54)
ognuno scrive il suo nome sul suo telefono («Conferma» o «Salta») e tocca «Sono pronto», oppure «Gioca ›». Telefono 1 a sinistra, Telefono 2 a destra (il numero è scritto in grande su
ogni telefono). Per tornare a uno solo: «1 giocatore · contro la CPU».

**«Prossimo giocatore»** (fine partita, pannello, telecomando dello staff, e il chiosco in fiera): azzera nome, mano (torna
«Destra»), livello («Adulto»), fasce e quello che i telefoni hanno imparato da chi c'era; **i telefoni restano collegati e
pronti**, niente QR, tutorial o nome da scrivere; si torna alla pagina della fiera. (B41.3) In fiera fanno lo stesso anche
pausa → **«Torna al menu»** e **«Torna al menu»** del telecomando dello staff: prima riportavano alla pagina della fiera con il nome,
la mano e il livello di chi c'era, e chi arrivava dopo giocava con il nome di prima (e, se destro, con la mano sinistra).

**Se un telefono dello stand non va**

- **«Gioca ›» grigio**: contro la CPU sotto c'è il perché (per esempio «Telefono 1 scollegato: si ricollega da solo (se
  non torna, «Telefoni dello stand ›»)») e il pulsante **«Telefoni dello stand ›»**; (B41.3) in due il perché è nella
  scheda di quel giocatore (per esempio «Telefono 2: schermo del telefono spento, riaccendilo», in arancione) e
  «Telefoni dello stand ›» è in alto a destra, nella riga di «2 giocatori». Di solito il telefono torna da solo in pochi
  secondi; se no, riapri la pagina sul telefono. Il pubblico non vede mai un QR.
- **Batteria sotto il 20 %** e non in carica (solo Android): sulla pagina della fiera, in basso a sinistra (nelle aree
  strette, per esempio 720×720, in basso a destra accanto a «Gioca ›»), «🔋 Telefono 2: batteria 15% · mettilo in
  carica»; nel foglio la scheda di quel telefono ha il bordo arancione e dice «Batteria 15% · bassa: mettilo in carica».
  Durante la partita e sulla fine partita l'avviso non c'è (copriva il gioco). Sparisce appena il telefono è in carica.
- **Telefono rotto o perso**: pannello → «Telefoni dello stand» → nella sua scheda **«Abbina un altro telefono»** e poi
  come ai passi 3–6 (il telefono di prima non vale più appena confermi quello nuovo), oppure **«Scollega»** (due clic:
  «Sicuro? Clicca ancora»; (B41.3) dal telecomando dello staff due OK). Un telefono nuovo che **non ha mai fatto da
  racchetta su questo PC** vuole prima il **certificato** (capitolo 6.1, passo 1): nel programma tasto destro → «Rete per
  i telefoni» → «Indirizzi e certificato per i telefoni…». La finestra mostra l'indirizzo da aprire sul telefono. Per usare
  il QR dal menu, spegni la modalità fiera e apri «Gioca» → «Contro la CPU» → «Smartphone» → «Prima volta su questo
  telefono». Riaccendere la modalità fiera salva di nuovo le scelte correnti del controller e della calibrazione.
- **Classifica a schermo intero durante una partita**. In modalità fiera, confermare «Classifica · A schermo intero»
  termina la partita e azzera il visitatore prima di aprire la classifica.
- **Il PC ha cambiato rete o indirizzo** (nel programma i telefoni usano l'indirizzo del PC): i telefoni dello stand vanno
  abbinati di nuovo, un minuto a telefono. Consiglio: indirizzo fisso per il PC nel router dello stand.
- **Spegnere la modalità**: pannello → «Modalità fiera · Sì» → diventa «No». Torna il menu di sempre (allenamento,
  minigiochi, sfida tra due computer, webcam, Opzioni) e i telefoni tornano racchette con il QR; (B41.3) «Con cosa giochi»
  e «Calibrazione» tornano come erano prima della fiera (lo dice l'avviso). Riaccesa, i telefoni già
  abbinati si ricollegano da soli.

**Cosa non provato**: telefoni veri, programma Windows vero (tasto destro), ledwall e rete dello stand. Provato nel
browser con telefoni simulati (documento `docs/b41/modalita-fiera-2.md`).

### 8.5 (B45.1) Telefono che si scollega: cosa fa il gioco e com'è fatta la rete dello stand

**Cosa fa il gioco da solo** (niente da attivare):

- Il **chiosco non scollega più** il telefono: azzera chi gioca e lo lascia collegato (capitolo 2).
- Un **buco della Wi-Fi fino a 10 secondi** non fa cadere niente: la partita si ferma con «Telefono 1: segnale debole,
  aspetto che torni…» e riprende da sola (capitolo 4). Prima bastavano 5 secondi (in partita circa 3) per vedere
  «Scollegato».
- Oltre i 10 secondi il telefono **si ricollega da solo** appena la rete torna (programma Windows: riprova senza fine;
  versione web: 10 tentativi, poi «Riprova» sul telefono), senza QR e senza rifare la calibrazione. Sul ledwall «Telefono 1
  scollegato · si ricollega da solo» con da quanti secondi.
- **(B45.2) Pagina del telefono chiusa o «Scollega» toccato sul telefono:** questi non tornano da soli, e il ledwall lo
  dice: «Telefono 1: pagina chiusa» con «Se non torna tra pochi secondi (pagina ricaricata), inquadra di nuovo il QR», oppure
  «Telefono 1 scollegato dal telefono · inquadra il QR»; il QR compare subito (nello stesso schermo dentro il riquadro),
  senza aspettare i 20 secondi degli altri casi.
- **Perché è caduto.** Pannello dello stand (F9): (B45.2) sotto la riga del chiosco, solo se è successo, «Telefono 1: 3
  cadute oggi · motivo più frequente: Wi-Fi ferma 10 s» (una riga per telefono, sempre intera). Gli altri motivi: «rete
  cambiata» (dati mobili, un'altra Wi-Fi), «pagina nascosta» (schermo spento, altra app), «pagina chiusa», ««Ricollega»»,
  «gioco ricaricato», «collegamento chiuso», ««Scollega» sul telefono». Il conto riparte ogni giorno. Il dettaglio sta nel
  registro dello stand (capitolo 9: righe «tel» con motivo, chi se n'è accorto e dove si era). (B45.2) «Scollega» fatto
  dal computer (pannello, telecomando, riquadro del telefono) **non è una caduta** e non si conta; lo schermo del telefono
  spento conta come «pagina nascosta» (non «Wi-Fi ferma»), una volta sola anche se il telefono torna dopo minuti.

**La rete dello stand** (vale con e senza il B45.1; dall'analisi `docs/b45/telefono-che-si-scollega.md` §6):

- **Un router (o access point) solo per lo stand**, non la Wi-Fi della fiera: quella ha migliaia di persone, spesso isola
  i dispositivi tra loro o chiede di accedere da una pagina.
- **Vicino ai giocatori e in alto** (2–3 m, sopra le teste), in vista dei telefoni: i corpi delle persone fermano il
  segnale. Non dietro al ledwall, non in mobili di metallo, non per terra.
- **Computer collegato al router con il cavo** e Wi-Fi del computer spenta (con due reti il QR può indicare quella
  sbagliata).
- **5 GHz su un canale fisso tra 36 e 48** (niente canale automatico, niente canali da 52 a 144: con un radar il router
  tace per almeno un minuto), larghezza 20 o 40 MHz; «smart connect» / «band steering» spenti.
- **Il limite della 2,4 GHz:** pochi telefoni dei visitatori (vecchi o economici) vedono solo la 2,4 GHz e con una rete
  «solo 5 GHz» non trovano lo stand. Se capita, una seconda rete a 2,4 GHz con un nome suo, **canale fisso 1, 6 o 11**
  (il meno usato), 20 MHz; oppure fai giocare quel visitatore con un telefono dello stand. La 2,4 GHz in fiera è la più
  affollata: è lì che i buchi di qualche secondo sono più probabili.
- **Password** (WPA2 o WPA3), niente rete ospiti né isolamento dei client, niente pagina di accesso. **Indirizzo fisso**
  per il computer (prenotazione DHCP nel router).
- **Telefoni dello stand** (quelli che lo staff dà ai visitatori): dati mobili spenti (o senza SIM); «Passa ai dati
  mobili», «Wi-Fi adattivo», «Assistenza Wi-Fi» spenti; altre reti Wi-Fi salvate dimenticate; se il router non ha
  internet, alla domanda «Questa rete non ha accesso a internet» rispondi «Rimani connesso»; risparmio energetico spento;
  carichi; «Non disturbare»; **app fissata** («Fissa app» su Android, «Accesso guidato» su iPhone), così un tocco sul
  bordo non fa uscire dalla pagina del gioco.
- **Computer** alla corrente, risparmio energetico della scheda di rete spento. **Router di riserva** configurato uguale.
- **Prova con la gente intorno**, con i telefoni in mano come in partita.

**Non provato** con la rete vera di una fiera, con telefoni veri né su Windows vero: le prove del B45.1 sono nel browser,
con una rete finta che si ferma per 3, 7 e 12 secondi.

---

### 8.6 (B51) Blocco del telefono in partita

Dal **pannello dello stand**, apribile con il tasto destro nel programma Windows, la voce
**Blocco del telefono in partita → Sì** è già attiva. Durante gli scambi di prova, il conto alla rovescia e la partita
(anche in pausa), ogni telefono in gioco mostra il proprio numero e ignora i tocchi accidentali. I gesti con il telefono
continuano a funzionare. Lo staff può premere «Salta ›» dal PC durante gli scambi di prova. Con la racchetta a tocchi,
il comando «Colpisci» rimane disponibile. A fine partita e quando il PC chiede la calibrazione o «Sono pronto» tornano
i comandi necessari.

- **Dal PC.** Apri il pannello dello stand e premi «Sblocca Telefono 1» o «Sblocca Telefono 2». In modalità fiera trovi
  anche «Sblocca il telefono» nella sua scheda in «Telefoni dello stand».
- **Dal telefono.** Appoggia due dita ferme sullo schermo per tre secondi. Solleva entrambe e premi «Sblocca» quando
  compare in basso a destra. Lo sblocco manuale vale per l'attività in corso.
- **Per tenere Chrome in primo piano su Android.** Nelle impostazioni cerca «Fissa app» e attiva la richiesta del PIN
  per uscire. Su Samsung cerca «Fissa finestre» in Sicurezza e privacy → Altre impostazioni di sicurezza. Apri le app
  recenti, tocca l'icona di Chrome e scegli «Fissa». I nomi possono variare con il modello. Il blocco nella pagina e
  «Fissa app» operano su livelli diversi. I comandi Android e la navigazione di Chrome restano sotto il controllo del
  dispositivo. I passaggi di «Fissa app» richiedono una prova sul telefono dello stand.
- **Con l'app Android dello stand** (8.9) «Fissa app» parte da solo: non serve fissare Chrome a mano.

### 8.7 Compagno nel doppio contro la CPU

Scegli «Doppio» contro la CPU. L’anello azzurro indica che la palla spetta al compagno. Dal pannello dello stand,
«Doppio: compagno» permette di scegliere «Gioca da solo» oppure «Con il tuo gesto». La scelta vale dalla prossima partita.

### 8.8 Misurare il ritardo del ledwall

Apri «Diagnostica» dal pannello dello stand, espandi «Ritardo dello schermo» e avvia «Prova del ritardo (20 s)».
Con un telefono pronto, chi lo impugna fa un colpo breve a ogni rimbalzo visibile. Se la palla sparisce, aspetta il
rimbalzo successivo. Per isolare meglio il ritardo, fai una prova sul monitor del PC, scegli «Questa era sul monitor»,
quindi ripeti sul ledwall con la stessa persona. «Salva» applica la stima ai due telefoni. Puoi annullare e ripetere.

### 8.9 (B52) App Android dello stand «NATPF Racchetta»

Al posto di Chrome, sui telefoni Android dello stand: la stessa pagina della racchetta in un'app che **si fissa da
sola** (i visitatori non escono più cambiando schermata), tiene lo schermo acceso e la Wi-Fi sveglia e riapre da sola
l'ultimo collegamento. Il blocco dei tocchi in partita (8.6) resta.

- **Installare (una volta per telefono).** Copia sul telefono il file `NATPF-Racchetta-<versione>.apk` (da WhatsApp,
  Drive o dal link fisso quando c'è) e aprilo: Android chiede di permettere l'installazione al programma da cui lo apri
  (per esempio «File» o «Chrome») → Consenti → Installa. Con l'app il certificato NATPF del PC (7.4) sul telefono **non
  serve** (dalla 1.0.2). **Usa la 1.0.2 o più nuova**: la 1.0.0 si chiudeva da sola toccando «Inquadra il QR del PC», la
  1.0.1 senza il certificato si fissava e restava ferma su uno schermo vuoto.
- **Se qualcosa non va** l'app lo scrive in alto e non si fissa. Tre volte «volume giù»: in fondo alla schermata dello
  staff ci sono le versioni (app, Android, WebView) e l'ultimo errore: mandale a chi segue il programma.
- **Aggiornare.** Togli «Fissa app» (vedi sotto), poi apri il file della versione nuova come sopra → «Aggiorna»:
  abbinamento e collegamento salvati restano. Se Android dice che l'app non è compatibile o è firmata in un altro modo, il
  file non viene dallo stand: non disinstallare, chiedi il file giusto.
- **Abbinare.** Apri «NATPF Racchetta» → «Inquadra il QR del PC» e inquadra il QR dell'abbinamento sul PC (in fiera:
  pannello dello stand → «Telefoni dello stand» → «Abbina»). La pagina si apre nell'app e l'app si fissa: se Android
  chiede «Fissare l'app?» rispondi Sì. Dal giorno dopo basta aprire l'app: riapre da sola il collegamento.
- **Se non si fissa.** Su alcuni telefoni va prima attivato «Fissa app» nelle impostazioni (passi in 8.6); poi riapri
  l'app.
- **Uscire o abbinare di nuovo (staff).** Tre pressioni di fila di «volume giù» portano alla schermata dell'app («Inquadra
  il QR del PC» o «Riapri l'ultimo collegamento»). Per uscire del tutto: il gesto di Android per togliere «Fissa app»
  (di solito Indietro e Panoramica tenuti insieme) e, se attivo, il PIN.
- **Se il PC non risponde** l'app lo scrive in alto e riprova da sola ogni 5 secondi.
- **Non provata su un telefono vero** (documento `docs/b52/app-android.md`, §4: cosa provare sul primo telefono).

### 8.10 (B55) Una versione nuova ha rotto qualcosa: «Torna alla versione di prima»

Dalla 2026-11-16.6, solo nel programma Windows. **Opzioni → Aggiornamenti → «Torna alla versione X»** (X è la versione di
prima), poi di nuovo il pulsante, che ora dice **«Conferma: torna alla X»**, entro 6 secondi. Windows chiede il permesso
(«Sì»): il gioco si chiude e si riapre con la versione di prima in meno di un minuto; impostazioni, certificati e telefoni
abbinati restano. I telefoni prendono da soli la pagina giusta tra una partita e l'altra. La versione lasciata non viene più
proposta come aggiornamento finché non ne esce una più nuova (che va provata prima di installarla allo stand).
Il pulsante compare dopo il primo avvio con internet della versione nuova (il programma tiene da parte la versione di
prima); se dice che serve internet, collega il PC per un minuto e riprova.

## 9. Il registro dello stand (Cloudflare)

**Cosa registra.** Il gioco annota da solo come vanno le partite: partite, punti, colpi, servizi, tutorial,
calibrazione, collegamento del telefono, prestazioni del PC, errori del programma. **Mai il nome** (solo «nome inserito:
sì/no»); niente video, niente audio, niente immagini della webcam, niente dati grezzi dei sensori, niente indirizzi di
rete. Le righe partono da sole circa ogni 45 secondi (di orologio, non di gioco, quando ci sono righe nuove), a fine
partita e quando il gioco si chiude. Vanno verso il tuo spazio Cloudflare (il Worker e il bucket privato
«natpf-registro»). Sul PC resta solo quello che non è ancora partito.

**È acceso di base.** L'indirizzo del tuo spazio è dentro il programma Windows (dalla versione 2026-11-13.7): lo staff non
deve fare niente. La versione web oggi non ha l'indirizzo: lì le righe restano sul computer.

**Da aggiornare una volta (versione 2026-11-14.1).** Il registro ora annota anche la direzione dei colpi (per preparare
la «Direzione dei colpi: Nuova» del B36). Il Worker su Cloudflare va ricaricato **una volta** con il file nuovo
(`natpf-registro-worker.js`, arriva con la versione): passi con il solo mouse nel documento `docs/b36/misure-b36-0.md` §3.
Finché non lo fai il registro non si ferma: il Worker vecchio accetta le righe e toglie solo i campi nuovi.

**Nel pannello dello stand**

- «Registro di gioco: Sì / No»: acceso o spento; resta salvato.
- Sotto, lo stato in parole, per esempio: «Oggi 37 partite registrate · ultimo invio riuscito alle 15:42 · niente in
  coda.» Altri casi: «indirizzo dello spazio non configurato…», «invio non riuscito: …; si riprova da solo», «… con un
  giorno non accettato (orologio del computer?)».
- «Invia adesso»: manda subito la coda (di solito non serve). È grigio con il registro spento e la coda vuota.
- «Scarica la coda»: uno zip con quello che non è ancora partito («natpf-registro-coda-AAAAMMGG-HHMM.zip»); (B39) nel
  programma si salva da solo in Download › NATPF (prima la finestra «Salva con nome»). Serve solo se lo stand è rimasto
  senza rete e il PC va restituito. È grigio quando la coda è vuota. Non dal telecomando.

**Leggere i dati** (da un tuo computer, non serve lo stand)

1. Apri nel browser l'indirizzo del tuo Worker «natpf-registro» (lo trovi in Cloudflare → Workers & Pages).
2. Si apre «Registro di NATPF Simulator». Controlla «Spazio R2 collegato: sì» e «Chiave di lettura impostata: sì».
3. Scrivi la tua chiave di lettura (quella che hai scelto tu) → «Mostra i giorni».
4. Per ogni giorno: «Scarica» (file «registro-AAAA-MM-GG.jsonl.gz») o «Cancella»; sotto, «Scarica tutti i giorni in un
   file». Manda i file così come sono a chi sviluppa il gioco.

**Spazio.** Circa 2–2,5 kB a partita; il tetto di base è 2 GB (circa 800 giorni da 1.000 partite). Quando è pieno il
Worker non accetta altre righe, che restano in coda sul PC; non cancella mai niente da solo. La pagina del Worker avvisa
in rosso. Guida completa (bucket, Worker, chiave, costi): vedi «Per chi sviluppa».

---

## 10. Il solo mouse: cosa si fa e cosa ancora no

**Con il B38 (tastiera a schermo) e il B39 (stand con il solo mouse) si fanno con il mouse** (dettagli nei capitoli
indicati, in `docs/b38/tastiera-a-schermo.md` e in `docs/b39/stand-solo-mouse.md`):

- **Scrivere un testo** (nome, nomi dello stesso schermo, codice della sfida tra due computer, campi della
  diagnostica): tastiera a schermo del gioco (B38, capitolo 3.6); senza nome, «Gioca come Ospite» (fuori classifica,
  capitolo 3.4).
- **Pannello in partita e dal menu principale**: tasto destro → «Pannello dello stand», ❚❚ tenuto 3 secondi, titolo
  grande o marchio tenuto 3 secondi con l'anello che si riempie (capitolo 1).
- **Menu del programma** (Esci, Ricarica, Riavvia, Rete, Schermo, Aggiornamenti, Cartelle, Scheda grafica): tasto destro
  sul gioco, anche a schermo intero e sulla pagina «Avvio del gioco…» (capitolo 7).
- **Uscire dalla classifica a schermo intero**: «× Chiudi» in alto a destra (capitolo 2).
- **Porta occupata**: finestra e pagina in italiano con la porta, «Riprova» e «Chiudi il programma» (7.5).
- **Doppio clic**: il secondo clic non conta più, nemmeno un clic arrivato subito dopo un cambio di pagina (2, 3.2).
- **Diagnostica**: pannello → «Diagnostica», o tasto destro → «Diagnostica».
- **Tasto laterale «indietro» del mouse**: non fa più sparire il gioco (7.6).
- **Finestre di Windows**: «Azzera oggi» ed «Elimina» con il secondo clic sul pulsante; «Scarica CSV», «Scarica la
  coda» e il pacchetto della diagnostica si salvano da soli in Download › NATPF (2, 9).
- **Chiosco**: il movimento del mouse conta come attività; non chiude l'abbinamento del telecomando né la diagnostica;
  la classifica a schermo intero lasciata in vista resta (2).
- **«Apri il link del controller ↗»**: nel programma non apre più una seconda finestra; un avviso dice che il link è per
  il telefono.
- **Puntatore piccolo**: Opzioni → «Puntatore: Grande» (5).
- **Calibrare lo schermo**: due clic sugli angoli che si vedono, frecce da trascinare (5).
- **«Certificato» o «Prima volta su questo telefono»**: il foglio del telecomando ora dice il pulsante vero.

**Ancora no con il solo mouse:**

- **Audio non salvato.** «Musica» del pannello e «Audio» delle Opzioni tornano «Sì» a ogni avvio (il pannello ora lo
  dice). *Intanto:* se vuoi il silenzio, pannello → «Musica: No» dopo ogni avvio. *Da decidere* con l'utente.
- **«Chi gioca» non salvato** (torna «Adulto» a ogni avvio): *da decidere* con l'utente.

B44 (fatto) non riguarda il mouse: cambia le istruzioni del servizio sul ledwall (capitolo 8.3).

---

## 11. Se qualcosa non va

| Cosa vedi | Cosa fare |
|---|---|
| Tengo premuto il marchio ma il pannello non si apre | Tieni premuto finché l'anello giallo si riempie (3 secondi), senza spostarti di molto. Nel programma: tasto destro → «Pannello dello stand». In partita: ❚❚ tenuto 3 secondi. (Prima del B39 nel menu principale il marchio era nascosto: «Opzioni» e riprova.) |
| F9 non fa niente | Clicca prima su una parte vuota del gioco (la finestra del gioco deve essere attiva). Nel browser F9 non vale: Ctrl+Maiusc+K. |
| «Collega il telefono»: il telefono è collegato ma non succede niente | Con il telefono già collegato quando la pagina si apre, il gioco non va avanti da solo: clicca «In campo ›» (o «Alla partita ›») in basso a destra. |
| In partita un clic su «Nuovo giocatore», «Classifica · A schermo intero» o «Telefono · Scollega» non parte | È la conferma: il pulsante è rosa con «Sicuro? Clicca ancora». Clicca ancora, una volta, entro 5 secondi. Lo stesso per «Torna al menu» della pausa. |
| Un'opzione è saltata di due valori | Doppio clic, prima del B39 (dal B39 il secondo clic non conta). Clicca ancora, un clic alla volta, fino al valore giusto. |
| Un minigioco non parte: chiede il nickname | Clic sul campo → tastiera a schermo → nome → «Fatto» → «Avanti ›»; oppure «Gioca come Ospite» (capitolo 3.4). |
| Clic sul campo del nome ma la tastiera a schermo non compare | Pannello → «Tastiera a schermo»: se dice «Mai», cliccala fino ad «Automatica». Se al PC qualcuno ha appena usato una tastiera vera, per 30 secondi il clic non la apre (si scrive con quella). |
| Un nome non compare nella classifica | Chi gioca senza nome («Gioca come Ospite», o contro la CPU senza il passo del nome) è fuori classifica: per entrarci serve il nome («Nuovo giocatore» lo chiede). |
| Classifica a schermo intero senza «‹ Indietro» | (B39) Muovi il mouse: in alto a destra compare «× Chiudi». Oppure pannello → «Classifica · Chiudi lo schermo intero». Telecomando «Indietro»; tastiera Esc. |
| Il telefono dice «connessione non sicura» o non si collega | Certificato: «Collega il telefono» → «Prima volta su questo telefono». Stessa Wi-Fi del PC, rete che non isola i dispositivi. Firewall: chiudi e riapri il programma e rispondi «Apri la rete ai telefoni» → «Sì». |
| In partita compare «Telefono in pausa» | Il telefono si è fermato (schermo spento, rete). Riaccendi lo schermo del telefono: si riparte da soli con il conto alla rovescia e il punto si rigioca. Se non torna: «Ricollega il telefono» nel riquadro. |
| (B45.1) In partita compare «Telefono 1: segnale debole, aspetto che torni…» o «scollegato · si ricollega da solo» | La Wi-Fi del telefono si è fermata (tra la folla capita). Non toccare niente: torna da solo e la partita riprende con il conto alla rovescia. Se succede spesso: pannello (F9) → la riga «Telefono 1: N cadute oggi · motivo più frequente» dice perché; poi la rete dello stand (capitolo 8.5). Se dopo 30 s non è tornato si apre il QR: la pagina del gioco sul telefono è stata chiusa, riaprila o inquadra il QR. |
| I colpi sono letti male | ❚❚ → «Telefono · Ricalibra»: si apre il riquadro del telefono. Quando dice «Pronto», clicca **«Ricalibra»** (con «Giocando»: scambi di prova, poi si rigioca il punto). Telecomando: «Ricalibra il telefono», un tasto solo. |
| Il gioco è sullo schermo sbagliato, in finestra o tagliato | Tasto destro → «Schermo del gioco» → il monitor, e «Schermo intero»; oppure pannello → «Schermo del gioco» (clic finché è sul ledwall); Opzioni → Area o «Calibra lo schermo…». |
| All'avvio resta «Avvio del gioco…» | Una finestra di Windows aspetta una risposta (la domanda del firewall, forse sullo schermo del portatile): rispondi; (B39) dopo 60 secondi vale «Più tardi». Porta occupata: la pagina lo dice, «Riprova» (7.5). Tasto destro: Esci, Riavvia. |
| «Il gioco non risponde» (B39) | «Aspetta» qualche secondo; se resta bloccato «Ricarica il gioco». Senza risposta il gioco si ricarica da solo dopo un minuto. |
| Il puntatore non si vede sul ledwall | Muovi il mouse: ricompare con un anello (in campo sparisce dopo 3 secondi fermo). Se una freccia gialla sul bordo indica una direzione, il puntatore è fuori dalla parte visibile: muovilo da quella parte al contrario. Opzioni → «Puntatore: Grande». |
| L'area del gioco è sbagliata (tagliata, spostata) | Tasto destro → «Azzera la calibrazione dello schermo», poi tasto destro → «Calibra lo schermo…» → clicca i due angoli che vedi → «Salva». |
| Il gioco sparisce e ricomincia da solo | Si è chiuso per un errore e il programma l'ha ricaricato: riparti dal menu. Se capita spesso, segnalalo. |
| Il telecomando dice «Mi ricollego…» | Gioco aperto? Stessa Wi-Fi? Firewall (come per il telefono, sopra). PC con un indirizzo nuovo: rifai l'abbinamento. |
| Il telecomando dice «Il gioco non si trova…» | Gioco spento o Wi-Fi diversa. Se è tutto a posto, quel telefono non è più il telecomando: inquadra di nuovo il QR dello staff o tocca «Scrivi il codice». |
| Telefono dello staff perso o rubato | Pannello → «Telecomando dello staff» → «Scollega il telecomando» (due clic), poi abbina il nuovo. |
| Il registro dice «invio non riuscito» o «giorno non accettato» | Rete assente: si riprova da solo. Giorno non accettato: controlla data e ora del PC. PC da restituire senza rete: «Scarica la coda». |
| «Aggiornamento non riuscito» | «Riprova»; al permesso di Windows «Sì». Senza internet il gioco funziona lo stesso. |

---

## 12. Con una tastiera

Se colleghi una tastiera al PC dello stand, questi tasti aiutano. I tasti del programma arrivano solo se la finestra del
gioco è quella attiva: se non rispondono, clicca prima su una parte vuota del gioco.

| Tasto | Cosa fa |
|---|---|
| Tasto destro del mouse (B39) | Menu dei comandi dello staff, dove c'è il puntatore (solo nel programma) |
| F9 | Pannello dello stand, apre e chiude (solo nel programma; anche in partita) |
| Ctrl+Maiusc+K | Pannello dello stand, apre e chiude (anche nel browser) |
| Esc | Menu: pagina precedente (anche Backspace) · in campo: pausa sì / no · chiude il pannello dello stand e la guida |
| Invio · frecce | Menu: Invio va avanti, le frecce spostano la scelta |
| F | Schermo intero sì / no |
| F11 | Schermo intero sì / no (programma) |
| H | Menu: «Come si gioca» |
| Maiusc+D | Diagnostica, apre e chiude (non mentre si scrive in un campo di testo: lì è una «D») |
| Maiusc+M | Segna il momento nella registrazione della diagnostica (non mentre si scrive in un campo di testo) |
| Ctrl+Maiusc+M | Gioco sullo schermo successivo (programma) |
| Ctrl+R | Ricarica il gioco (programma) |
| Ctrl+Q | Esce dal programma |
| Ctrl+Maiusc+I | Strumenti per sviluppatori (programma) |
| Alt, in finestra | Mostra il menu del programma: **NATPF** (Schermo intero, Ricarica il gioco, Pannello dello stand, Esci) · **Schermo** (gli schermi, Monitor successivo) · **Rete** (Apri la rete ai telefoni, Indirizzi e certificato per i telefoni) · **Aiuto** (Cerca aggiornamenti, Cartella dei dati, Scheda grafica in uso, Strumenti per sviluppatori, Versione) |
| In «Calibra lo schermo…» | 1–6 formato · Tab bordo · frecce (con Maiusc 5 %) · R azzera · F schermo intero · Invio salva · Esc annulla (con il mouse: due angoli, frecce da trascinare, − e + tenuti premuti) |

**Modalità prova «Mouse e tastiera».** Nel menu scrivi «natpf»: compare l'avviso «Modalità prova: mouse e tastiera
attivi» e in «Con cosa giochi?» c'è una racchetta in più, «Mouse e tastiera» (Spazio colpisce, ↑ lancia, Q/E mirano).
Resta accesa anche dopo un riavvio; si spegne scrivendo di nuovo «natpf». Serve solo per provare il gioco senza
telefono: allo stand lasciala spenta.

---

## Appendice · Solo per la versione web

Il programma Windows apre il gioco sempre allo stesso modo: lì non serve niente di questo. Nella versione web (nel
browser) si può aggiungere all'indirizzo del gioco, dopo «?», una o più di queste voci, separate da «&» (per esempio
«…/?formato=fiera&cal=giocando»):

| Voce | Cosa fa |
|---|---|
| formato=fiera · formato=classico | Formato in fiera acceso o spento per quella pagina. Il pannello mostra «(indirizzo)» accanto al valore: lì si cambia la scelta salvata, ma per quella pagina vale l'indirizzo. |
| cal=giocando · cal=gesti · cal=nessuna | Calibrazione del telefono per quella pagina; anche qui «(indirizzo)» nel pannello. |
| battuta=fissa · battuta=alternata | (B47) Battuta «Sempre lo stesso» o «Alternata» per quella pagina; anche qui «(indirizzo)» nel pannello. |
| mode=bambini · casual · evento · pro · leggenda (o difficulty=) | Livello della CPU di base (casual = Facile, pro = Esperta); vale anche dopo «Nuovo giocatore» e il chiosco. |
| schermo=intero · 2x2 · 3x2 (anche 16x9, 16x10, 4x3) | Area dello schermo, senza salvarla. |
| area=x,y,larghezza,altezza | Area esatta in pixel, senza salvarla. |
| view=first · view=third | Visuale in 1ª o 3ª persona. |
| intro=0 | Niente intro. |
| trailer=0 | Intro con il video di prima, non il trailer. |
| diag=1 | Modalità diagnostica (senza intro): il pannello si apre all'avvio e la partita resta ferma finché non lo chiudi con ×. |

---

## Per chi sviluppa

- Guida controllata sul codice della versione 2026-11-13.12 (ramo natpf-simulator) da chi l'ha scritta e poi da un
  verificatore indipendente; le sue correzioni sono applicate.
- Il programma apre il gioco su https://localhost:8443/?lan=1: nessuna voce dell'appendice.
- Cartella dei dati: `%LOCALAPPDATA%\NATPF`: impostazioni del gioco (`programma`), certificati (`certs`), registro del
  programma (`log\programma.log`), coda del registro dello stand (`log\registro`), aggiornamenti scaricati
  (`aggiornamenti`), scelta dello schermo (`desktop-app.json`). Resta anche se si disinstalla.
- Cloudflare: Worker `natpf-registro` e bucket privato `natpf-registro`.
- Da decidere (dopo il B39): «Chi gioca» / livello della CPU non salvati (`hud_ui.js` `selectedDifficulty`,
  `natpf_lobby.js` `resetWho`); audio non salvato. Sistemati dal B39: «Scollega il telecomando» con l'intervallo minimo
  delle conferme; «QR Certificato» → «Prima volta su questo telefono».
- B39 (stand con il solo mouse): `docs/b39/stand-solo-mouse.md`; codice `natpf-tennis/src/natpf/natpf_stand_mouse.js`,
  `natpf_click_guard.js`, `natpf_hold.js`, `natpf_cursor.js`, `natpf_calibra.js`; programma `natpf-desktop/src/desktop-core.mjs`
  (`COMMANDS`, `staffMenu`) e `main.mjs`; prove `tools/e2e/natpf-solo-mouse.mjs` e `natpf-desktop/scripts/prova-linux.mjs`
  (scenari `solo-mouse`, `porta-occupata`).
- Codice di riferimento: pannello `natpf-tennis/src/natpf/natpf_kiosk.js`; pagine del menu `natpf_lobby.js`; «Nuovo
  giocatore» `natpf_new_player.js`; pausa `natpf_pause.js`; riquadro del telefono e «Gioca ancora» `natpf_ui.js`;
  telecomando `natpf_remote.js` e `site/js/tennis/telecomando.js`; stesso schermo `natpf_split_ui.js`,
  `natpf_duo_rules.js`; servizio `natpf_serve_coach.js`; registro `natpf/registro/`; programma
  `natpf-desktop/src/desktop-core.mjs` e `main.mjs`.
- Documenti:
  - Telecomando dello staff: `docs/GUIDA_TELECOMANDO.md` (e `docs/b27/telecomando.md`)
  - Programma Windows, collaudo: `docs/COLLAUDO_WINDOWS.md`, `natpf-desktop/LEGGIMI.md`
  - Registro su Cloudflare: `docs/GUIDA_REGISTRO_CLOUDFLARE.md`, `docs/b30/registro-dello-stand.md`
  - Pannello che ferma la partita, conferme in due clic, tabellone: `docs/b43/tabellone-e-pannello.md`
  - Scambio che si scalda: `docs/b42/scambi-lunghi.md`
  - Calibrazione giocando: `docs/b28/calibrazione-giocando.md`
  - Pannello dal programma (F9), fuori e chi serve: `docs/b37/collaudo-13-11-bis.md`
  - Mira del telefono (come misurarla): `docs/GUIDA_MISURA_MIRA.md`
  - Direzione dei colpi «Classica · Nuova» (B36.1, Nuova in lavorazione): `docs/b73/direzione-b36-1.md`, piano `docs/b36/piano-direzionalita.md`
  - Telefoni dello staff con lo schermo acceso: `docs/b9/schermo-spento.md`
  - Stand con il solo mouse (controllo e proposte): `docs/b39/controllo-solo-mouse/LISTA-UNICA-E-PROPOSTA-B39.md`;
    quello che è stato fatto: `docs/b39/stand-solo-mouse.md`
  - Modalità fiera (progetto): `docs/b41/progetto-modalita-fiera.md`
  - Battuta a un solo giocatore, conto alla rovescia grande, livello dopo «Rivincita» (B47): `docs/b47/fiera-subito.md`
    (codice `natpf_battuta.js`, `natpf_prematch.js`, `natpf_rematch.js`)
  - Tastiera a schermo e servizio animato: `docs/coda/B38-tastiera-a-schermo.md`, `docs/coda/B44-servizio-animato.md`;
    quello che è stato fatto: `docs/b38/tastiera-a-schermo.md` (codice `natpf_tastiera.js`, prova
    `tools/e2e/natpf-tastiera-schermo.mjs`) e `docs/b44/servizio-animato.md` (codice `natpf_serve_hint.js`)
