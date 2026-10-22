# NATPF Simulator · telefono-racchetta: reattività, riconoscimento dei gesti e direzione

Analisi della catena completa, dal sensore del telefono al colpo in gioco, in LAN e via internet, con le cause trovate,
le correzioni, la mappatura dei gesti, i test e i problemi ancora aperti.

## 1. La catena e i file

| Passo | Dove | Note |
|---|---|---|
| Sensori (giroscopio, accelerometro con e senza gravità) | `site/js/tennis/racchetta.js` → `sampleFromMotion` | istante del campione = `event.timeStamp`; frequenza vera misurata e mandata al computer (`hz`) |
| Orientamento del telefono (filtro con correzione della gravità, senza deriva da fermo) | `site/js/tennis/face-tracker.js` | prima solo con la presa orizzontale, ora con entrambe |
| Riconoscimento del colpo: preparazione, colpo, impatto, rientro | `site/js/tennis/swing-detect.js` | picco, verso, gesto verticale, attesa della preparazione |
| Calibrazione (asse del colpo, soglie personali, piatto abituale all'impatto) | `site/js/tennis/calibration.js` | 2 gesti nel riscaldamento in campo (dal 22/10; prima 4), facoltativi con «Salta» |
| Messaggio del colpo (scritto e letto in un solo posto) | `site/js/tennis/swing-message.js` | usato da telefono, computer e test |
| Trasporto | LAN: `lan-transport.js` (WebRTC diretto, canale comandi + canale binario dei sensori); internet: PeerJS (`link.js`) | stessi messaggi JSON in entrambi |
| Orologi e istante del colpo sul computer | `pairing.js` (`createClock`), `input-time.js` (`phoneInputTime`) | il colpo vale all'istante del picco, non all'arrivo |
| Mappatura gesto → colpo | `natpf-tennis/src/natpf/natpf_gestures.js` | tabella sotto |
| Ponte verso il motore | `natpf-tennis/src/natpf/natpf_phone_racket.js` | lato, forza, mira, latenza |
| Tempo, direzione, profondità, rischio | `natpf-tennis/src/natpf/natpf_skill.js`, blocchi «NATPF» di `game_engine.js` | |
| Racchetta a schermo | `natpf_phone_racket.js` (`_syncPhoneState`) → `racket_kinematics.js` | |
| Diagnostica e registrazioni | `natpf-tennis/src/natpf/natpf_diag.js`, `scripts/audit/replay-recording.mjs` | |

## 2. LAN e internet: cosa cambiava davvero

Il riconoscimento del colpo avviene **sul telefono**, con lo stesso codice nei due casi. La rete trasporta solo il
colpo già deciso, con l'istante del picco: il motore conta il tempo da quell'istante, quindi la latenza di rete non
cambia né il voto né la direzione. I 19 ms misurati sono il giro di andata e ritorno; il ritardo tra gesto e risposta
è fatto di riconoscimento (tipicamente 1–3 campioni, 16–50 ms a 60 Hz) + consegna (metà del giro + code) + l'attesa
voluta della palla quando si colpisce in anticipo.

La differenza che si **vedeva** era la racchetta a schermo:
- in LAN seguiva l'integrazione grezza del giroscopio dal canale binario, che deriva, era ridotta di proposito al 55%
  e passava da una molla del motore (salita di circa 100 ms): movimenti «molli» e non fedeli;
- via internet stava ferma (solo l'animazione del colpo): per contrasto sembrava più netta.

C'era poi una differenza nascosta in LAN: tra un pacchetto binario e l'altro poteva partire anche il flusso JSON dei
sensori, e i due flussi si mescolavano nella stessa integrazione.

## 3. Cause trovate e correzioni

| # | Problema | Effetto | Correzione |
|---|---|---|---|
| 1 | Racchetta a schermo diversa tra LAN (giroscopio grezzo) e internet (ferma) | tracciamento «meno fedele» proprio in LAN | il telefono manda l'orientamento filtrato (gravità + giroscopio, `fo`) in entrambi i casi: stessa misura; in LAN a ogni campione, via internet 30 volte al secondo |
| 2 | In LAN il flusso JSON poteva intercalarsi a quello binario | integrazione sporca | il flusso JSON parte solo se manca il canale binario e manca l'orientamento filtrato |
| 3 | In calibrazione il **rientro della mano** dopo un gesto veniva preso per il gesto successivo | il gesto vero risultava «direzione sbagliata», il profilo usciva con soglie bassissime (90 °/s): poi in partita i micro-movimenti diventavano colpi. Vale per LAN e internet | un movimento sotto il 40% dei gesti già riconosciuti è un rientro, non un tentativo |
| 4 | La pausa contro i doppi picchi (170 ms) bloccava anche il gesto **nel verso opposto** | dopo una preparazione il colpo veniva preso solo al suo picco: circa 50 ms in ritardo, istante e orientamento sbagliati; in calibrazione si misurava un colpo di 24° invece di 81° | la pausa vale solo nello stesso verso |
| 5 | In partita il rientro dopo un colpo poteva diventare un colpo opposto; il motore animava swing e fruscio anche con la palla che si allontanava | racchetta che «si muove da sola» | sul telefono il gesto opposto entro 0,6 s da un colpo è un rientro; nel gioco si ignorano i colpi mentre la palla si allontana |
| 6 | Istante del picco preso dalla media mobile | circa un campione di ritardo sul tempo del colpo | parabola sui tre campioni grezzi attorno al massimo (precisione sotto il campione) |
| 7 | Con la presa verticale la direzione non usava l'orientamento del telefono all'impatto | direzione «a caso» o solo dal tempo | mira dal piatto all'impatto rispetto al proprio colpo abituale (calibrazione), interpolata all'istante del picco; uguale per dritto e rovescio, quindi anche il rovescio va lungolinea |
| 8 | Il riferimento della mira veniva scalato con l'ampiezza del gesto, misurata con soglie diverse in calibrazione e in partita | lo stesso gesto della calibrazione risultava mirato fino al 90% di lato | niente scala con la presa verticale: il riferimento è la posa ferma prima del colpo, che si aggiorna solo dopo 0,4 s fermi (le pause della preparazione non la spostano) |
| 9 | I gesti verticali (pallonetto, schiacciata) venivano scartati perché non sono né dritto né rovescio | nessun pallonetto o schiacciata con il gesto | riconoscimento dei gesti verticali: asse di rotazione orizzontale **e** mano che sale o scende |
| 10 | I colpi speciali nascevano da un solo segnale (verso verticale della mano) | palla corta confusa con un colpo normale o con un'inclinazione per sbaglio | tabella con più segnali insieme (sotto) |

Durante la verifica i test hanno trovato anche due errori introdotti in questa revisione e corretti subito: un nome
duplicato nel modulo del collegamento (avrebbe bloccato il collegamento) e il confronto tra l'asse di rotazione e la
gravità in due ordini di assi diversi (i gesti verticali non venivano mai riconosciuti).

## 4. Mappatura dei gesti

> **Dal 22/10/2026** i telefoni con la pagina aggiornata mandano la forma del colpo e il tipo di colpo, la forza, la
> profondità e la mira vengono dal nuovo modello della racchetta virtuale: `docs/NATPF_RACCHETTA_VIRTUALE.md` §3
> (`natpf_stroke_intent.js`, `natpf_stroke_outcome.js`). La direzione dipende soprattutto dal tempo dell'impatto,
> il piatto pesa meno. Con «Salta» (modalità semplice) il verso H si legge dalla gravità. La tabella qui sotto vale
> ancora solo per i messaggi senza forma (pagina del telefono vecchia).

Segnali: **H** verso orizzontale (giroscopio, rispetto all'asse imparato in calibrazione), **V** gesto verticale
riconosciuto sul telefono, **L** verso verticale della mano durante la spinta (accelerazione lungo la gravità,
rispetto al proprio gesto abituale **nello stesso verso**: prima dalla calibrazione, poi la mediana degli ultimi 12
colpi veri in quel verso), **F** piatto all'impatto (orientamento filtrato: imbardata → mira, apertura in gradi),
**P** forza (metà rispetto alla calibrazione, metà dalla velocità vera), **S** velocità rispetto al proprio colpo
tipico, palla alta. Le soglie di L si allargano con la variabilità dei propri colpi (k = variabilità/0,12, tra 1 e 1,8).

| Colpo | Condizione (decide la prima riga che vale) |
|---|---|
| Pallonetto | gesto verticale verso l'alto senza verso orizzontale; oppure orizzontale non lento (S ≥ 0,45) con L ≥ 0,55, o L ≥ 0,4 e piatto aperto ≥ 10° |
| Schiacciata | gesto verticale verso il basso (senza verso orizzontale) con palla alta; oppure orizzontale con palla alta e L ≤ −0,25 |
| Tagliato (chop) | gesto verticale verso il basso (senza verso orizzontale) con palla bassa |
| Palla corta | orizzontale con L ≤ −0,35 **e** piatto aperto ≥ 8° **e** gesto morbido (P < 0,45) |
| Tagliato | orizzontale non lento con L ≤ −0,35 (senza le altre due condizioni) |
| Topspin | orizzontale con L ≥ 0,2, gesto lento, oppure il caso normale |
| Piatto (potente) | orizzontale veloce (P ≥ 0,78) con piatto dritto (\|F\| < 10°) |

- **Dritto / rovescio**: dal verso H e dalla mano (dritto del destro = da destra a sinistra; del mancino il contrario).
  Senza H (gesto verticale o modalità semplice) il lato lo danno la preparazione o la posizione della palla.
- **Direzione**: soprattutto il piatto all'impatto (dorso del telefono girato a destra → palla a destra, a sinistra →
  a sinistra, rispetto al proprio colpo abituale), poi un poco il tempo del colpo (prima = più incrociato). È la
  stessa regola per dritto e rovescio: il rovescio va lungolinea quanto il dritto. L'angolo è la rotazione del telefono
  attorno alla verticale dalla posa più ferma prima del colpo all'impatto (vale con qualunque inclinazione del dorso);
  dopo tre colpi in un verso si misura rispetto alla mediana dei propri colpi in quel verso (il colpo normale va al
  centro) e passa per una curva morbida (40° ≈ 3/4 della mira); oltre 80° la misura non è credibile e la direzione la
  decide solo il tempo del colpo (fonte «timing» nel pannello).
- **Preparazione**: il gesto nel verso opposto al colpo atteso (il gioco dice al telefono da che parte arriva la
  palla) aspetta fino a 250 ms solo se è più debole dell'85% del proprio colpo tipico; se arriva il colpo è una
  preparazione, se no vale come colpo con il suo istante vero. Un colpo pieno parte subito.
- **Gioco con i tocchi**: il colpo scelto sul telefono vale così com'è.
- I valori soglia sono il punto di partenza: vanno tarati con le registrazioni di persone vere (sezione 5).

## 5. Strumentazione

- **Pannello di diagnostica**: Maiusc+D in qualsiasi momento, oppure `?diag=1` nell'indirizzo. Mostra trasporto, giro
  di andata e ritorno, fotogrammi al secondo, frequenza dei sensori del telefono, frequenza ed età di ogni flusso
  (orientamento, binario, JSON), e per gli ultimi colpi: lato, tipo e perché, mira e sua fonte, **rilevamento**
  (dal picco alla decisione, sul telefono), **attesa della preparazione**, **consegna** (rete + code, con gli orologi
  allineati), **totale** dal picco all'arrivo, **attesa della palla**, tempo **a schermo**, esito e punto di caduta.
- **Registrazione** (dal 21/10 modalità diagnostica, guida in [NATPF_DIAGNOSTICA.md](NATPF_DIAGNOSTICA.md)): senza
  limite di durata, scritta su disco mentre si gioca, con video della webcam e del gioco, eventi del motore, colpi,
  campioni grezzi del telefono, orologio, prestazioni e prova guidata dei colpi; si scarica come zip con un rapporto
  da aprire con un doppio clic. Prima: fino a 60 s, tutto in memoria, in un file JSON.
- **Rianalisi**: `node --import ./test/register.mjs scripts/audit/replay-recording.mjs file.json|file.zip` (da `natpf-tennis`):
  frequenza vera e buchi del flusso, tempi di ogni colpo giocato e gli stessi campioni ripassati nel rilevatore e
  nella tabella attuali. Serve a tarare le soglie sui movimenti veri e a confrontare LAN e internet.

## 5b. Cosa hanno mostrato le prime registrazioni vere (LAN) e cosa è cambiato

La rete andava bene (sensori a 60 Hz senza buchi, giro di andata e ritorno 7–9 ms, consegna 2–13 ms); i problemi
erano nel riconoscimento:

| Problema | Causa | Correzione |
|---|---|---|
| Mira quasi sempre in fondo (16 colpi su 24) | posa «pronto» che con la mano vera non sta mai ferma (riposo a 49 °/s di mediana); mira lineare con ±30° | angolo dalla posa più ferma prima del colpo, curva morbida, oltre 80° mira dal tempo |
| Tagliati non voluti («taglio −0,44» sempre uguale) | L tagliata a ±0,6 nel messaggio, riferimento della calibrazione no | L intera, riferimento per verso del colpo |
| Pallonetti di rovescio non voluti | il rovescio in partita sale di suo ~0,9 più dei due rovesci della calibrazione | riferimento che si adatta ai colpi veri, soglie più larghe con la variabilità |
| Quasi tutto «piatto» | colpi a 1200–1650 °/s con la forza al massimo da 1,55 volte il colpo tipico e scala assoluta fino a 1180 °/s | forza al massimo da 2 volte il colpo tipico, scala assoluta fino a 1680 °/s |
| Riconoscimento 30–67 ms dopo il picco | si aspettava il calo della media mobile | si parte dal calo della velocità grezza (sotto l'88%, o due campioni in calo): 19–40 ms sulle stesse registrazioni |
| Tre colpi trattenuti ~200 ms | ogni gesto nel verso «sbagliato» era trattenuto come possibile preparazione | trattenuti solo i gesti deboli |
| Gesti a 212–325 °/s diventati colpi speciali | nessun limite di velocità per lob e tagliato | sotto 0,45 del colpo tipico niente colpi speciali dalla sola L |
| Colpi senza esito non spiegabili | la registrazione non diceva lo stato della partita; i colpi scartati (palla che si allontana) non c'erano | stato della partita per ogni colpo, colpi scartati registrati con il motivo |
| Prima registrazione senza campioni grezzi | dopo la riconnessione il telefono non riceveva più la richiesta | la richiesta si rimanda a ogni riconnessione mentre si registra |

Le prove: `test/natpf-recording.test.mjs` e la rianalisi delle registrazioni con `replay-recording.mjs`.

### Secondo giro (tre registrazioni LAN, 80 colpi)

Rete sempre buona (60 Hz senza buchi, consegna 4–15 ms), riconoscimento a 17–42 ms. Restava:

| Problema | Causa | Correzione |
|---|---|---|
| Palle alte impossibili da colpire | lo swing anticipato aspettava la palla solo sotto 2,35 m: sopra scadeva senza colpo | attesa fino a 3,4 m; sopra 1,78 m il motore fa la schiacciata |
| Schiacciate su palle a metà volo | «palla alta» guardava solo l'altezza, anche a 12 m di distanza | palla alta solo se è entro 6 m da chi gioca |
| Pallonetto quasi impossibile | soglia allargata fino a 1,8 volte con gesti variabili (mano che sale ≥ 1) | allargamento al massimo 1,2 (soglia ≤ 0,6); gesto verticale con un po' di lato e mano che sale = pallonetto |
| Pallonetti e palle corte «invisibili» | il messaggio dell'esito diceva solo «Perfetto»/«Anticipo» | nome del colpo speciale nel messaggio (Pallonetto, Palla corta, Schiacciata, Tagliato) |
| Mira persa in metà dei colpi | imbardata della normale del dorso senza senso con il dorso molto inclinato (aperture misurate fino a 90°) | direzione dalla rotazione attorno alla verticale (scomposizione swing-twist), poi ricentrata sui propri colpi della partita |
| Palle corte da «piatto aperto» non voluto | apertura del piatto lontana da quella della calibrazione | apertura ricentrata sui propri colpi della partita |
| Preparazioni lente diventate colpi dopo 250 ms | il gesto trattenuto senza seguito valeva sempre come colpo | se è lento (sotto 0,45 del colpo tipico) resta una preparazione |
| Pannello del riscaldamento sopra il campo | il pannello stava in alto al centro, sopra la metà campo da cui arrivano le palle | campo d'allenamento dedicato (tribune vuote, luci di lavoro, «PROVA» sui tabelloni) e pannello di lato |

Lo stato della partita nelle registrazioni ha mostrato anche che molti colpi «senza esito» erano lanci e colpi di servizio
(il pannello ora li indica come servizio).

### Terzo giro: pallonetto e palla corta

- **Traiettoria del pallonetto** (motore): 2 s di volo con la compensazione dell'aria (`NS.LOB_FLIGHT`), sale a ~6 m e
  cade in fondo; prima 1,32 s, 2,5 m e caduta a metà campo. La CPU risponde fino a 3,1 m.
- **Verso verticale del colpo T** (`face-tracker.headAt`, campo `he` del messaggio): (ω × n)·alto / |ω|, cioè di quanto
  il piatto sale o scende mentre ruota, dal giroscopio e dall'orientamento filtrato. Il telefono lo misura sul dorso
  (−z); nel dritto colpisce il palmo (lo schermo, +z) e il segno si inverte sul computer. Si usa V = 0,6·T + 0,4·L
  (L = segnale dell'accelerometro di prima), ricentrato sui propri colpi per verso; soglie con T: pallonetto ≥ 0,38,
  tagliato ≤ −0,28, topspin ≥ 0,12; palla corta = tagliato morbido (forza < 0,45 o velocità < 0,7 del proprio colpo).
- **Soglie personali** (`learnSpecials`): gli esercizi «Pallonetto» e «Palla corta» del riscaldamento (solo
  smartphone) registrano V dei tentativi; la soglia diventa il 55% del proprio gesto (pallonetto tra 0,18 e 0,5,
  palla corta tra −0,4 e −0,15). Si azzerano con una nuova calibrazione o dalle Opzioni.
- Il messaggio dell'esito mostra il nome del colpo speciale (Pallonetto, Palla corta, Schiacciata, Tagliato).

## 6. Test

- `test/natpf-pipeline.test.mjs` (nuovo): telefono simulato a 60 Hz con orientamento fisicamente coerente (la
  gravità ruota con il telefono), calibrazione vera, apertura–colpo–rientro come una mano vera. Verifica:
  dritto e rovescio; mira dal piatto (destra, sinistra, rovescio lungolinea); pallonetto e schiacciata verticali;
  palla corta solo con tre segnali insieme; tabella completa; micro-movimenti senza colpi; **stessi gesti in LAN e
  via internet → stessi messaggi, stessi colpi, stessa direzione, stesso orientamento della racchetta**; istante del
  picco entro mezzo campione e riconoscimento entro tre campioni.
- Tutte le prove esistenti: `npm test` 103/103, `node --test tools/test/*.test.mjs` 124/124 (calibrazione estesa del
  sito compresa), `tools/lan` 4/4, controllo di sintassi di tutti i moduli del telefono.

## 7. Problemi aperti

- **Taratura con persone vere**: le soglie sono state corrette su quattro registrazioni vere, ma senza sapere quale
  colpo si voleva fare. Serve una registrazione con una sequenza nota (per esempio 5 dritti incrociati, 5 rovesci
  lungolinea, 3 pallonetti, 3 tagliati) per confrontare il colpo voluto con quello riconosciuto, soprattutto per la mira.
- **Racchetta a schermo**: segue l'orientamento attraverso la molla del motore (salita circa 100 ms, ampiezza ridotta):
  è un effetto di presentazione, non tocca il colpo; renderla più diretta va valutato a parte.
- **Mira dal piatto**: nei gesti molto ampi (oltre 130°) l'imbardata del piatto è poco ripetibile; per ora lì decide il
  tempo del colpo. Va rivista con la registrazione a sequenza nota.
- **Player 2 nel 1v1**: il relay della stanza porta ancora i campi del motore base; tabella, mira dal piatto e
  preparazione valgono per il Player 1.
- **Telefoni a bassa frequenza** (alcuni iPhone e Android in risparmio energetico, 30 Hz): istante e piatto restano
  interpolati, ma il riconoscimento richiede più tempo; il pannello mostra la frequenza vera.
- Le prove con telefoni veri non sono possibili in questo ambiente: tutto quello sopra è verificato con test e
  simulazioni, non sul campo.

## 8. Quarto giro (20/10): allenamento, calibrazione, risposta del giocatore, collegamento

### Allenamento e calibrazione in campo

| Problema | Causa | Correzione |
|---|---|---|
| In calibrazione il giocatore correva da solo e mostrava colpi diversi da quelli chiesti dal telefono | due percorsi separati: il telefono decideva i passi, il computer lanciava una palla, la rallentava e «armava» il gesto. Se il telefono era già ai gesti quando si entrava in campo (parte appena si attivano i sensori) la palla non partiva mai; un gesto fatto prima della palla colpiva la palla del gesto dopo, dal lato sbagliato | il computer mostra sempre il passo del telefono (`natpf_cal_view.js`, funzione pura degli eventi); giocatore fermo al centro, palla ferma dal lato del gesto chiesto, colpo con il lato del gesto riconosciuto. Prova nel browser `natpf-training-flow.mjs`: 5/9 con il codice di prima, 13/13 dopo |
| Istruzioni piccole in un pannello di lato | pannello pensato per non coprire il campo | in basso al centro, sotto il giocatore: gesto grande con la freccia del telefono, stato (aspetta / ora / riprova / ✓), tappe in alto; il telefono ripete le stesse parole |
| Primo gesto al contrario: calibrazione invertita | il primo gesto fissava il verso, qualunque fosse | verso assoluto dalla rotazione attorno alla verticale: un primo gesto chiaramente al contrario si rifà (alla terza volta di fila si accetta: telefoni con il segno opposto) |
| Calibrazione impossibile con il polso che prona (168 combinazioni su 432 nell'audit) | il verso dei gesti dopo il primo veniva dall'asse del primo gesto, che contiene anche la rotazione del polso | verso dalla rotazione netta attorno alla verticale durante il gesto (`netTurn`), poi dall'asse al picco, poi dall'asse imparato; in partita la rotazione netta dà il verso quando l'asse non basta |
| Dritti morbidi con pronazione letti come palle corte (623 colpi su 5184) | il riferimento del verso del piatto (T) partiva da 0 e imparava solo dai colpi normali | riferimento iniziale dai quattro gesti della calibrazione (`profile.heads`) |

Audit: `node --import ./test/register.mjs scripts/audit/calibration-matrix.mjs [--lefty]` (4 inclinazioni, 3 rotazioni
dello schermo, 6 ampiezze/velocità, 3 pronazioni, tremolio, destro e mancino): 864/864 calibrazioni, 10368 colpi senza
colpi persi, lati sbagliati o colpi speciali non voluti.

### Tempi dal gesto alla risposta (misurati, `tools/e2e/natpf-latency.mjs`)

| Tratto | Tempo |
|---|---|
| picco del gesto → decisione del rilevatore (60 campioni/s) | ~24 ms (registrazioni vere: 17–42 ms) |
| telefono → computer (WebRTC in locale) | 1–10 ms (registrazioni vere in LAN: 2–15 ms) |
| arrivo → motore e animazione | < 2 ms |
| totale picco → risposta a schermo | 26–35 ms, più 1–2 fotogrammi di disegno |

La rete non è il collo di bottiglia. Quello che si percepiva come ritardo o incoerenza era nella risposta del giocatore:
con un gesto in anticipo lo swing partiva subito e ripartiva da capo quando arrivava la palla (due swing per un gesto);
con un gesto in tempo la palla partiva subito ma la racchetta arrivava all'impatto dell'animazione ~0,1 s dopo; un gesto
troppo in anticipo spariva senza segni. Ora: racchetta che si carica subito dal lato del colpo, swing nell'istante del
colpo partendo da poco prima dell'impatto, swing a vuoto visibile con «Troppo presto», etichetta del gesto sul computer
(rilevato → letto → applicato).

### Alternative al collegamento

| Soluzione | Latenza | Stabilità | Compatibilità | Valutazione |
|---|---|---|---|---|
| WebRTC DataChannel (attuale: diretto in LAN, PeerJS via internet) | 2–15 ms in LAN | buona; SCTP su UDP. Il colpo però viaggiava su un canale ordinato e affidabile: un pacchetto perso fermava i messaggi dopo fino alla ritrasmissione (corretto il 21/10, §9) | tutti i browser dei telefoni | **si tiene** |
| WebSocket sul server LAN | simile in LAN (+ un salto nel server) | TCP: con una perdita i messaggi dopo aspettano | ovunque | nessun vantaggio sulla latenza; utile solo come ripiego se WebRTC è bloccato |
| Bluetooth (Web Bluetooth) | intervalli di connessione BLE 7,5–30 ms | — | una pagina web sul telefono non può fare da periferica BLE e Safari su iPhone non ha Web Bluetooth: servirebbe un'app | non praticabile senza app, e non più veloce del Wi-Fi |
| Sensori più frequenti (Generic Sensor API, solo Chrome per Android) | riconoscimento più presto di ~8 ms a 120 Hz | da provare | non su iPhone; Chrome può limitare la frequenza | possibile miglioramento futuro, da provare con telefoni veri |

Il margine vero resta sulla frequenza dei sensori (il picco si riconosce 1–2 campioni dopo) e sulla durata del gesto
stesso; per questo il tempo del colpo si misura all'istante del picco sul telefono, non all'arrivo.

### Cadute e riprese del collegamento (audit)

| Situazione | Prima | Ora |
|---|---|---|
| Rete del telefono ferma senza che il canale si chiuda | il computer segnalava «scollegato» dopo 5 s, il telefono restava «collegato» per sempre e nessuno si ricollegava | anche il telefono controlla il silenzio (5 s, il computer risponde ogni secondo) e si ricollega con la chiave di ripresa |
| Ripresa a calibrazione in corso | il telefono aveva continuato (gesti fatti a rete ferma), il computer restava al gesto di prima: i due schermi chiedevano cose diverse | il telefono rimanda gli eventi del passo attuale (`calibration.replay`): il computer torna allo stesso passo e, se la verifica è superata, la conferma |
| Telefono che cade a partita, esercizi o sfida in corso | il gioco andava avanti e i colpi si perdevano senza avviso | dopo mezzo secondo pausa con il pannello del telefono; quando torna pronto il pannello si chiude da solo |
| Colpi consegnati tutti insieme quando la rete torna | accettati fino a 3 s dopo il picco e giocati come appena fatti | ignorati se arrivano più di 0,6 s dopo il picco (di solito arrivano in 30–60 ms) |
| Pagina del telefono ricaricata entro 5 s | il computer non rimandava fase e impostazioni: il telefono restava su «menu» e scartava i colpi | contatore dei collegamenti: a ogni collegamento nuovo si rimandano presa, impostazioni, fase e verso atteso |
| Errore del solo server di segnalazione | il telefono chiudeva anche il canale diretto, sano | con il canale aperto si ignora e ci si ricollega al server |

Prova: `tools/e2e/natpf-phone-blackout.mjs` ferma i messaggi nelle pagine (il canale resta aperto, come una rete che si
blocca): computer → telefono, poi nei due sensi durante la calibrazione, poi durante gli esercizi. 6/6; con il codice di
prima 3 verifiche su 3 fallite. La rete vera (Wi-Fi spento, schermo spento, cambio di rete) resta da provare con il
telefono in mano.

## 9. Quinto giro (21/10): colpi senza attesa di rete, modalità diagnostica, app nativa

- **Colpi senza attesa di ritrasmissione.** Il colpo viaggiava solo sul canale ordinato e affidabile: con un pacchetto
  perso aspettava la ritrasmissione (perdita simulata, via internet: p99 153–293 ms, fino a 39 colpi su 150 oltre
  50 ms). Ora il telefono manda tre copie sul percorso senza ritrasmissioni e una sul canale affidabile; il computer
  tiene la prima. Stessa prova: p99 6–15 ms, nessun colpo oltre 50 ms, nessun colpo perso. Tabella completa e
  ripetizione in [NATPF_APP_NATIVA_E_TRASPORTI.md](NATPF_APP_NATIVA_E_TRASPORTI.md) §2.
- **Stato della pagina del telefono.** Il telefono comunica se la pagina è visibile e se il blocco dello schermo è
  attivo; il computer avvisa se lo schermo può spegnersi (pagina sospesa, sensori fermi).
- **Colpi scartati** (istante del picco non valido, telefono non pronto): prima sparivano senza traccia, ora finiscono
  nel registro della diagnostica con il motivo.
- **Ritardo dello schermo.** Si può impostare nel pannello della diagnostica (0–200 ms): si somma alla correzione del
  ritardo del telefono nel giudizio del tempo. Resta a 0 finché non lo si misura con un video a 240 fps.
- **Modalità diagnostica**: [NATPF_DIAGNOSTICA.md](NATPF_DIAGNOSTICA.md).
- **App nativa, Bluetooth, sensori più frequenti**: [NATPF_APP_NATIVA_E_TRASPORTI.md](NATPF_APP_NATIVA_E_TRASPORTI.md).
