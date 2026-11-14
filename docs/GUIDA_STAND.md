# Guida dello stand · come si attiva ogni cosa

**Vale per la versione 2026-11-14.1** (14/11/2026). Le voci segnate **(B39)** valgono dalla versione che contiene il
blocco B39 «stand con il solo mouse» (la prima dopo la 2026-11-14.1): tasto destro con i comandi dello staff, pannello da
ogni pagina, niente doppi clic che saltano pagine, puntatore grande, calibrazione dello schermo con due clic (dettagli in
`docs/b39/stand-solo-mouse.md`). Dalla stessa versione anche la tastiera a schermo e «Gioca come Ospite» (B38, capitolo
3.6) e l'icona del servizio (B44, capitolo 8.3).

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
3. «Scambi di prova»: circa 10 secondi, 4 palle facili. Il gioco impara il colpo di chi gioca. «Salta ›» (accanto alla
   pausa, in alto a destra) per andare avanti.
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
«Collega i due telefoni»), «Pronto per la partita», «Opzioni», «Classifica» (anche a schermo intero), «Minigiochi» e il
risultato di un minigioco. **Non** c'è nel menu principale (lì è nascosto), nell'intro, in campo (partita, scambi di
prova, allenamento, minigiochi), nella pausa, nella schermata di fine partita e quando un foglio copre la pagina (per
esempio «Come ti chiami?»).

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
| **Modalità chiosco** | **No** · Sì | Sì: dopo il tempo di «Ritorno al menu dopo» senza nessuno il gioco torna al menu principale, cancella il nome, rimette «Chi gioca: Adulto» e **scollega il telefono**: il visitatore dopo rifà il QR. Contano come attività clic (anche sui tasti della tastiera a schermo), tasti, rotellina, tocchi, colpi del telefono e comandi del telecomando; (B39) anche muovere il mouse, e con il pannello, l'abbinamento del telecomando o la diagnostica aperti il chiosco aspetta. Durante una partita aspetta il doppio del tempo, poi chiude la partita. Sotto le voci una riga dice se il chiosco è acceso. | subito |
| **Ritorno al menu dopo** | 30 s · **45 s** · 60 s · 90 s | Il tempo del chiosco. Giro dei valori: 45 → 60 → 90 → 30 → 45. | subito; conta solo con il chiosco acceso |
| **Classifica · A schermo intero** | — | Chiude il pannello e mostra in grande la classifica di oggi (scheda «Partite», 10 righe). Le schede dei minigiochi si cliccano, ma non fanno uscire. In partita chiude la partita. (B39) Per uscire: **«× Chiudi»** in alto a destra (compare muovendo il mouse) o di nuovo questa voce, che diventa «Chiudi lo schermo intero»; si torna al menu. Con il chiosco acceso la classifica lasciata in vista resta. | subito · **secondo clic in partita** |
| **Classifica · Scarica CSV** | — | Salva il file «classifica-natpf-AAAA-MM-GG.csv» con partite e minigiochi di oggi. (B39) Nel programma si salva da solo in **Download › NATPF** (un file con lo stesso nome non si sovrascrive: «… (2).csv»); un avviso nel gioco dice il nome. Nel browser decide il browser. | subito · non dal telecomando |
| **Classifica · Azzera oggi** | — | Cancella la classifica di oggi su questo PC. (B39) **Secondo clic** sul pulsante («Sicuro? Clicca ancora»), niente più finestra di Windows. La classifica si azzera comunque da sola ogni giorno. | subito · non dal telecomando |
| **Telefono** | «Scollega» con un telefono collegato · «Nessuno collegato» | Scollega il telefono del giocatore: per giocare va rifatto il QR. | subito · **secondo clic in partita** (con un telefono collegato) |
| **Musica** | **Sì** · No | Spegne o riaccende **tutto** l'audio del gioco: musica, effetti e la voce del punteggio. **Non resta salvata**: alla riapertura l'audio è acceso. Per spegnere solo la voce e tenere musica ed effetti: Opzioni → «Voci» (o «Voce» nella pausa). | subito |
| **Formato in fiera** | No · **Solo stesso schermo** · Sì · punto decisivo | Punto decisivo sul 40-40 (chi lo vince vince il game) e servizio che passa ogni due punti, come nel tie-break: batte anche la CPU o il Player 2, anche in una partita a 1 game. «Solo stesso schermo»: vale solo tra due persone sullo stesso schermo; contro la CPU e tra due computer resta il formato classico. «Sì»: vale anche contro la CPU e tra due computer, e la partita più lunga è al meglio di 3. Al 40-40 il tabellone mostra «PUNTO DECISIVO» in rosa. Giro: No → Solo stesso schermo → Sì → No. | dalla partita dopo |
| **Battuta** (B47) | **Sempre lo stesso** · Alternata | Sempre lo stesso: il servizio non passa mai all'altro, per tutta la partita e in tutti i formati (anche con il formato in fiera e il campo aperto: resta il punto decisivo, non il cambio ogni due punti). Contro la CPU batte **sempre chi gioca**, anche se «Batte per primo» dice CPU; nello stesso schermo batte per tutta la partita chi batte il primo game («Batte per primo», di base il sorteggio: «Sorteggio: batte sempre Giulia»). Il lato del servizio (destra, sinistra) cambia a ogni punto come sempre. Alternata: come prima, il servizio passa all'altro a ogni game (ogni due punti con il formato in fiera o il campo aperto). Nella sfida tra due computer resta alternata. Giro: Sempre lo stesso ↔ Alternata. | dalla partita dopo |
| **Scambio che si scalda** | **Sì · dal 20° colpo** · No | Dal 20° colpo di uno scambio colpi sempre più forti per tutti e due, colpo super più facile, la CPU rischia di più: gli scambi lunghi finiscono e le partite durano meno. In alto la scritta «SCAMBIO CALDO · colpo 23». Non vale con «Una webcam per due». | dalla partita dopo |
| **Lancio automatico** | **No** · Sì · 30 s | Solo stesso schermo **con i due telefoni** (non con «Una webcam per due»): se chi deve battere resta fermo 30 secondi, il gioco lancia la palla (lo schermo lo annuncia 10 secondi prima). Dopo due lanci a vuoto il gioco batte un servizio morbido. Così la fila non si blocca. | dalla partita dopo |
| **Stesso schermo: campo aperto** | **No** · Sì · il piazzamento conta | Solo stesso schermo **con i due telefoni**: i personaggi corrono come persone e non arrivano più su ogni palla; la palla angolata si prende in allungo o non si prende. Con «Battuta: Alternata» il servizio passa ogni due punti anche con il formato classico (chi batte è un po' sfavorito); con «Sempre lo stesso» non passa mai. | dalla partita dopo |
| **Calibrazione** | **Giocando** · Con i gesti · Nessuna | Giocando: niente gesti a vuoto; prima di ogni partita circa 10 secondi di «Scambi di prova» (4 palle, dritti e rovesci) e il gioco impara il colpo di chi gioca. Con i gesti: la calibrazione di prima (telefono fermo, poi un dritto e un rovescio a vuoto); quel profilo resta fino a «Nuovo giocatore». Nessuna: si gioca subito e il gioco impara dai primi colpi veri (all'inizio la forza è meno precisa). Giro: Giocando → Con i gesti → Nessuna → Giocando. | dal prossimo «Gioca» |
| **Tastiera a schermo** | **Automatica** · Sempre · Mai | La tastiera del gioco per scrivere nomi, codice della sfida e campi della diagnostica (capitolo 3.6). Automatica: compare cliccando un campo con il mouse (o toccandolo), sparisce se si usa una tastiera vera. Sempre: compare in ogni campo, anche con una tastiera vera. Mai: non compare. Giro: Automatica → Sempre → Mai → Automatica. | subito |
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
  - **Livello della CPU**: Bambini · Facile · **Evento** · Esperta · Leggenda. È la stessa scelta di «Chi gioca» e, come
    quella, non resta salvata: Esperta o Leggenda vanno scelti di nuovo per ogni visitatore nuovo. Sul PC, Esperta e
    Leggenda si scelgono solo qui (oppure con il tasto «Chi gioca» del telecomando).
  - **Formato**: **Singolare 1v1** · Doppio 2v2 (resta salvato; nello stesso schermo solo singolare).
  - **Durata**: **1 game** · Al meglio di 3 · Al meglio di 5. A ogni avvio del programma torna «1 game». Con il formato in
    fiera acceso «Al meglio di 5» sparisce.
  - **Batte per primo**: **Tu** · CPU · Sorteggio contro la CPU; nello stesso schermo i due giocatori e **Sorteggio**.
    Resta salvato.
  - **Visuale**: **3ª persona** · 1ª persona.
- In basso: «‹ Indietro», «Riscaldati prima» (facoltativo: dritto, rovescio e servizio con il lanciapalle; non nello
  stesso schermo) e «Gioca ›».
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
| **Giochi con la mano** | **Destra** · Sinistra | La mano di chi gioca. Torna «Destra» con «Nuovo giocatore». |
| **Segnale del momento giusto** | **Di base** · Sì · No | Un anello bianco si stringe sulla palla e diventa verde quando è il momento di colpire; nelle prime 3 palle di ogni partita compare «Colpisci quando il cerchio diventa verde». Di base: acceso con «Bambino» e «Adulto», spento con «Ragazzo», Esperta e Leggenda. Solo contro la CPU. |
| **Visuale** | **3ª persona** · 1ª persona | Camera dietro il giocatore o dai suoi occhi. |
| **Scia della palla** | Sì · **No** | Una scia luminosa dietro la palla veloce. |
| **Dritto come nel video (prova)** | **Sì** · No | Il dritto del personaggio con le movenze del trailer. No: il dritto di prima. |
| **Personaggi in campo** | **Classici** · Lob & Drop | I tennisti di sempre o le due mascotte. È la stessa scelta di «Personaggi» nella pagina «Pronto per la partita». |
| **Audio** | «Audio: **Sì**» · «Voci: **Sì**» | Audio: tutto l'audio, come «Musica» del pannello (non resta salvato). Voci: la voce del punteggio, in inglese. |
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
| **Nuovo giocatore** | Come «Nuovo giocatore» del pannello; con una partita in corso chiede conferma. |
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
| Formato in fiera | Game corti: punto decisivo sul 40-40, servizio ogni due punti (con «Battuta: Alternata») | Pannello → «Formato in fiera». Di base solo nello stesso schermo; «Sì» anche contro la CPU e tra due computer |
| Battuta: Sempre lo stesso (B47) | La gente non capisce il servizio alternato: contro la CPU batte sempre il visitatore, nello stesso schermo sempre chi batte il primo game | Di base (pannello → «Battuta») |
| Conto alla rovescia grande (B47) | «Preparati, la partita sta per cominciare» 3 · 2 · 1 tra gli scambi di prova e la partita | Sempre, con il telefono; non va acceso |
| Livello dopo «Rivincita» (B47) | Cambiare Bambino · Ragazzo · Adulto (o le fasce dei due) prima della rivincita, con un clic | A fine partita, «Rivincita» o «Gioca ancora» |
| Scambio che si scalda | Scambi che finiscono, partite più corte | Acceso di base (pannello) |
| Calibrazione: Giocando | Niente gesti a vuoto: ogni visitatore fa circa 10 secondi di scambi di prova prima di ogni partita | Di base (pannello → «Calibrazione») |
| Chi gioca | Livello per età con un clic | Pagina «Pronto per la partita», o telecomando |
| Nuovo giocatore | Azzera il visitatore senza scollegare il telefono | Fine partita, risultato di un minigioco, pannello, telecomando |
| Modalità chiosco | Stand che torna libero da solo | Pannello → «Modalità chiosco» e «Ritorno al menu dopo». Scollega il telefono |
| Classifica a schermo intero | Il ledwall tra un visitatore e l'altro | Pannello → «Classifica · A schermo intero» |
| Telecomando dello staff | Comandare il gioco senza mouse, anche in partita | Capitolo 6 |
| Lancio automatico, campo aperto | Stesso schermo con i due telefoni: niente attese al servizio, piazzamento che conta | Pannello (spenti di base) |
| Registro di gioco | Dati veri delle partite per migliorare il gioco | Acceso di base (capitolo 9) |

### 8.2 Consigli per la fiera, oggi

- **Un telefono che passa di mano.** Lascialo collegato. Tra un visitatore e l'altro usa «Nuovo giocatore»: non
  «Telefono · Scollega» né il chiosco, che lo scollegano e fanno rifare il QR.
- **Due visitatori insieme.** «Gioca» → «Stesso schermo» → ognuno inquadra il suo QR (Player 1 a sinistra, Player 2 a
  destra). Quando sono pronti tutti e due: conto alla rovescia di 3 secondi, poi (con «Calibrazione: Giocando») gli
  scambi di prova per tutti e due, poi il conto alla rovescia grande e la partita. Il formato in fiera qui è acceso di
  base (con «Battuta: Sempre lo stesso» resta il punto decisivo, il servizio non cambia). Dettagli: capitolo 3.5.
- **Rivincita con un livello diverso** (B47): a fine partita «Rivincita» → clic sul livello (o sulle fasce) → «Gioca».
- **Stand senza staff per un po'.** Pannello → «Modalità chiosco: Sì». Al ritorno il telefono va ricollegato con il QR.
- **Classifica sul ledwall.** Pannello → «Classifica · A schermo intero». (B39) Con il chiosco acceso resta in vista per
  chi è in fila. Per uscire: «× Chiudi» in alto a destra (compare muovendo il mouse), capitolo 11.
- **Telefoni dello staff:** spegnimento dello schermo al massimo (Android 10 minuti, iPhone «Mai»), niente PIN, risparmio
  energetico spento.
- **Minigiochi:** dalla loro pagina chiedono un nome: si scrive con la tastiera a schermo, oppure «Gioca come Ospite»
  (fuori classifica; capitolo 3.4).

### 8.3 In arrivo

**La modalità fiera (B41).** La prima parte è nella 2026-11-14.1 ma **non si accende ancora dal pannello**: arriva con
la seconda parte. Già fatti e attivi per tutti: «Sono pronto» dal telefono (capitolo 3.2) e il profilo del telefono che
riparte da capo per ogni partita, minigioco e allenamento. Il resto segue le decisioni dell'utente del 13/11; i dettagli
possono cambiare.

- Interruttore «Modalità fiera» nel pannello e foglio «Telefoni dello stand»: Telefono 1 e Telefono 2 abbinati **una
  volta** (QR, numero e «Conferma» sul PC, come il telecomando), sempre collegati, che si ricollegano da soli dopo
  riavvii e cali di rete. Niente QR per il pubblico.
- Sul telefono dello stand il numero grande «Telefono 1» o «2» e, tra una persona e l'altra, «Dai il telefono al
  prossimo giocatore»; i pulsanti dello staff nascosti; avviso di batteria bassa.
- **Visitatori numerati** da soli («Visitatore 12», da capo ogni giorno), senza scrivere il nome.
- Per ogni visitatore gli scambi di prova; contro la CPU **batte sempre il visitatore**.
- **«Prossimo giocatore»** a fine partita, con il telefono che resta collegato; il chiosco non scollega più i telefoni
  dello stand.
- Una pagina della fiera con un clic su chi gioca (Bambino, Ragazzo, Adulto, Esperta, Leggenda) e «Mancino».

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

---

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
| diag=1 | Modalità diagnostica (senza intro). |

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
  - Telefoni dello staff con lo schermo acceso: `docs/b9/schermo-spento.md`
  - Stand con il solo mouse (controllo e proposte): `docs/b39/controllo-solo-mouse/LISTA-UNICA-E-PROPOSTA-B39.md`;
    quello che è stato fatto: `docs/b39/stand-solo-mouse.md`
  - Modalità fiera (progetto): `docs/b41/progetto-modalita-fiera.md`
  - Battuta a un solo giocatore, conto alla rovescia grande, livello dopo «Rivincita» (B47): `docs/b47/fiera-subito.md`
    (codice `natpf_battuta.js`, `natpf_prematch.js`, `natpf_rematch.js`)
  - Tastiera a schermo e servizio animato: `docs/coda/B38-tastiera-a-schermo.md`, `docs/coda/B44-servizio-animato.md`;
    quello che è stato fatto: `docs/b38/tastiera-a-schermo.md` (codice `natpf_tastiera.js`, prova
    `tools/e2e/natpf-tastiera-schermo.mjs`) e `docs/b44/servizio-animato.md` (codice `natpf_serve_hint.js`)
