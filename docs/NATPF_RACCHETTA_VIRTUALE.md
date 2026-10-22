# Telefono come racchetta virtuale: diagnosi e nuovo modello del colpo (22/10/2026)

Richiesta: il gesto fisico è l'input del gameplay. Direzione, potenza, altezza e traiettoria vengono dal gesto, con
un'assistenza arcade e senza caso: gesti simili danno risultati simili. Riferimenti: i giochi di tennis da console con
il controller di movimento indicati nella richiesta.

Ogni affermazione è marcata così:
- **[dati]**: dimostrato dai dati della sessione reale;
- **[codice]**: confermato leggendo il codice;
- **[ipotesi]**: plausibile, non dimostrato;
- **[insufficiente]**: i dati non bastano.

## 1. Materiale analizzato

- ZIP `natpf-diagnostica-20261022-080527-6s13.zip`: sessione di 119,4 s su LAN (WebRTC), livello Leggenda, Chrome su
  Windows. Contiene 6945 eventi, 7162 campioni grezzi del telefono, il video del gioco (1920×868) e il video della
  webcam (5,5 s). Estratto in una cartella di lavoro fuori dal repository, senza modificare l'originale. Il materiale
  non è nel repository: contiene il video della webcam con la persona.
- Codice della catena: `site/js/tennis/swing-detect.js`, `face-tracker.js`, `calibration.js`, `racchetta.js`,
  `swing-message.js`; `natpf-tennis/src/natpf/natpf_phone_racket.js`, `natpf_gestures.js`, `natpf_skill.js`,
  `natpf_hand.js`; `natpf-tennis/src/game_engine.js` (swing, colpo, servizio, movimento automatico).
- Video di riferimento (breve video pubblico indicato nella richiesta): da qui il video non si scarica. Si leggono solo
  i metadati (titolo con il nome del gioco di riferimento) e quattro immagini (tre miniature automatiche e la
  copertina). Si vede il tennis del gioco di riferimento in doppio: telecamera dietro chi gioca a media altezza, scia
  dello swing ben visibile e lampo all'impatto del servizio. Le meccaniche non si possono osservare da quattro
  immagini statiche. Dalla pagina dei consigli del produttore del gioco: topspin ruotando il polso sopra la palla
  all'impatto; effetto all'indietro e palla che curva con una rotazione del polso «a cucchiaio»; pallonetto con uno
  swing dal basso verso l'alto. Che nei giochi di riferimento la direzione dipenda dal tempo del colpo (in anticipo
  incrociato, in ritardo lungolinea) è conoscenza generale, non verificata dal video. Il doppio del video non si
  riprende: si resta al 1 contro 1.

Strumenti usati sui dati (fuori dal repository, ripetibili sullo ZIP):
- la catena di ogni colpo, dal gesto all'esito;
- la ricostruzione dell'orientamento dai campioni grezzi (filtro complementare con la gravità) per misurare, per ogni
  colpo, l'asse di rotazione nel riferimento del mondo e il percorso della mano;
- i fotogrammi del video nei momenti chiave.

## 2. Diagnosi

Formato: problema → evidenza → causa → verifica → soluzione → criterio di successo.

### P1. Mano del telefono e del gioco diverse

- **Evidenza [dati]**: il profilo del telefono dice `hand: "left"` (sia il profilo iniziale sia quello in uso dal
  secondo 7,7), mentre il gioco sul computer dice `mano: "right"`. Lati giocati: 37 rovesci e 17 dritti.
- **Causa [codice]**: le impostazioni sono due e nessuno le sincronizza:
  - sul telefono, il menu `#hand` della pagina, che entra nel profilo;
  - sul computer, `NatpfHand` (`localStorage` `natpf-tennis.hand`), che specchia il personaggio.
  A calibrazione finita, `natpf_phone_racket.js` copia la mano del profilo in `natpfPhone.hand`. Da lì in poi i colpi
  vengono letti come da un mancino e giocati da un personaggio destro.
- **[insufficiente]** Con questi dati non si sa quale mano usasse chi giocava.
  - In 12 tentativi con il lato della palla e il verso del gesto entrambi netti, in 9 lo swing va dal lato della palla
    verso l'altro.
  - Questo vale sia per un destro sia per un mancino (il dritto del mancino va da sinistra a destra con la palla a
    sinistra), quindi non distingue la mano.
  - La scelta «Sinistra» sul telefono è stata fatta a mano (il menu parte da «Destra» e non viene salvato).
- **Soluzione**: una sola mano, quella del gioco sul computer. Va al telefono, la pagina del telefono la mostra, e la
  calibrazione non la cambia più.
- **Criterio**:
  - in ogni sessione registrata la mano del profilo e quella del gioco coincidono;
  - test «specchio destro/mancino»: lo stesso gesto, specchiato, dà lo stesso colpo dall'altro lato.

### P2. Il verso del gesto (dritto o rovescio) non si misurava

- **Evidenza [dati]**: in tutti i 61 colpi `dir = 0`.
  - Al secondo 7,7 la calibrazione è stata saltata («Salta» sul computer) e da lì il telefono usava il profilo
    «semplice», che non ha l'asse del colpo.
  - Il lato è venuto quindi dalla posizione della palla, con la mano sbagliata.
  - Il lato giocato concorda con il verso del gesto in 15 casi su 35 se chi gioca è mancino, in 20 su 35 se è
    destro. In entrambi i casi è vicino al caso.
- **Causa [codice]**: in `swing-detect.js`, con il profilo senza asse, il verso è sempre 0. Anche i ripieghi
  indipendenti dall'impugnatura (rotazione attorno alla verticale) partono solo se esiste l'asse.
- **Verifica [dati]**: ricostruendo l'orientamento dai campioni grezzi, la componente verticale dell'asse di rotazione
  al picco (riferimento della gravità, nessuna calibrazione) è netta (|cos| ≥ 0,6) in 35 colpi su 54. Il verso si
  può quindi misurare senza calibrazione. Gli altri colpi sono gesti verticali o deboli.
- **Soluzione**: verso dalla rotazione attorno alla verticale (gravità), sempre disponibile; la calibrazione lo affina
  soltanto.
- **Criterio**:
  - nel banco sintetico, verso giusto ≥ 95% con il telefono tenuto in modi diversi (inclinazioni), per destri e
    mancini;
  - con il profilo semplice il verso non è mai sempre 0.

### P3. La mira veniva dalla rotazione del telefono: satura e instabile

- **Evidenza [dati]**:
  - la mira è |≥ 0,8| in 22 colpi su 54 e |≥ 0,5| in 31;
  - la fonte è sempre il piatto (`face`);
  - il punto di caduta segue la mira (circa 3,4 m per unità di mira, più il tempo), fino a fuori di lato (x 4,5–5 m);
  - la direzione assoluta del piatto inviata dal telefono gira su tutto il cerchio (da −164° a +178°).
- **Causa [codice]**:
  - con il verso a 0, i modelli che centrano la mira sul colpo abituale non si attivano: esistono solo per i versi
    +1 e −1;
  - la mira resta quindi quella grezza del telefono: tanh(rotazione attorno alla verticale tra la posa più ferma prima
    del colpo e il picco / 40°);
  - in un colpo completo quella rotazione è lo swing stesso (decine di gradi) e cambia molto con la fase del gesto in
    cui cade il picco: satura e cambia segno.
- **Causa secondaria [dati]**: la «deriva» del giroscopio misurata nel passo «fermo» della calibrazione era
  [3,4; 6,8; 4,4] °/s. Nei tratti davvero fermi della sessione il giroscopio dà invece [−0,4; 0,5; 0,1] e
  [1,5; −0,1; −0,9] °/s. La deriva tolta era il movimento della mano (rumore misurato 26 °/s), e il filtro
  d'orientamento girava di circa 8 °/s per conto suo.
- **Soluzione**:
  - **intenzione**: la direzione viene dal tempo del colpo dentro la finestra (in anticipo incrociato, in ritardo
    lungolinea, come nei riferimenti), più il piatto all'impatto rispetto al proprio colpo abituale per lato, con una
    zona morta e un guadagno moderato;
  - **esecuzione**: il tempo fuori dalla finestra comoda non sposta più la direzione, toglie qualità (palla più corta
    e più lenta) in modo deterministico;
  - deriva del giroscopio accettata solo se plausibile (piccola).
- **Criterio**:
  - stesso gesto e stessa palla danno lo stesso punto di caduta (nessuna componente casuale);
  - nel banco: incrociato e lungolinea distinti in ≥ 90% dei colpi voluti;
  - mira mai satura con gesti normali.

### P4. Colpi a vuoto «troppo presto» con la palla lontana

- **Evidenza [dati]**:
  - 6 colpi a vuoto «VERY EARLY», con la palla ancora a 3–10 m (a volte vicino alla rete);
  - 21 tentativi su 54 colpi;
  - tempo del colpo del telefono: mediana +49 ms, p90 +206 ms (in anticipo);
  - nel video, a 17,10–17,30 s la palla passa la rete quando parte lo swing.
- **Causa [codice]**:
  - a Esperto e Leggenda lo swing in anticipo resta in attesa della palla al massimo 0,16 s (`assistWindow`); oltre,
    è un colpo a vuoto;
  - con la palla tra 4,85 m e 0,95 m davanti, lo swing poteva anche colpire subito, cioè un impatto anticipato con la
    palla ancora lontana.
- **Soluzione**: finestra d'impatto con la traiettoria prevista.
  - Il colpo si gioca solo quando la palla arriva al punto d'impatto, mai prima.
  - Uno swing in anticipo entro la finestra resta in attesa ed è giocato all'arrivo della palla, con il suo tempo vero
    (che decide direzione e qualità).
  - Oltre la finestra è un colpo a vuoto visibile.
  - La finestra è ampia a tutti i livelli (arcade); i livelli cambiano quanto costa il tempo sbagliato, non se si
    prende la palla.
- **Criterio**:
  - nel motore vero, gli swing fino a 0,35 s in anticipo prendono la palla;
  - nessun impatto con la palla oltre 1,2 m dal punto d'impatto;
  - gli swing oltre la finestra sono colpi a vuoto.

### P5. Servizio senza controllo

- **Evidenza [dati]**: 11 servizi su 11 «POWER SERVE! Perfetto», a 184–204 km/h, qualunque fosse il gesto (anche
  tagliati, pallonetti e gesti lenti). Nessun fallo.
- **Causa [codice]**: lo swing di servizio resta in attesa fino al punto più alto del lancio. Lì l'altezza (≥ 2,68 m)
  è sempre nella zona «potente». Direzione e profondità contengono `Math.random()` e il fallo in rete è disattivato.
- **Soluzione**: servizio dal gesto, cioè lancio con il primo gesto e battuta con il secondo.
  - Forza dalla velocità del gesto; altezza d'impatto dal tempo rispetto al lancio.
  - Angolo (esterno, al corpo, al centro) dalla direzione del colpo; effetto dal percorso.
  - Fallo solo quando la traiettoria calcolata esce: per esempio con forza massima e un tempo molto sbagliato.
- **Criterio**:
  - gesti diversi danno servizi diversi (velocità, angolo); un gesto lento dà un servizio lento;
  - lo stesso gesto dà lo stesso servizio.

### P6. Niente volée né schiacciate prima del rimbalzo

- **Evidenza [dati]**: nessuna volée nella sessione; chi gioca resta sempre in fondo al campo.
- **Causa [codice]**:
  - il movimento automatico porta chi gioca 2,15 m dietro il punto di rimbalzo (`_predictBallIntercept`);
  - dopo ogni colpo lo riporta sulla linea di fondo;
  - la schiacciata è solo un colpo su palla alta dopo il rimbalzo.
- **Soluzione**: il movimento automatico sceglie dove prendere la palla.
  - Dopo il rimbalzo all'altezza comoda.
  - Al volo, se chi gioca è avanti o la palla è alta da schiacciare.
  - Dopo un colpo d'attacco riuscito chi gioca sale a rete, poi torna in posizione (tolto nella fase C del 22/10 notte:
    portava a rete troppo spesso; ora si va avanti solo quando la palla lo chiede, §6).
- **Criterio**: negli scambi automatici si vedono volée e schiacciate al volo su palle raggiungibili (dalla fase C solo
  quando la palla le chiede: palle corte, pallonetti corti).

### P7. Pallonetti e tagli decisi con poca sicurezza

- **Evidenza [dati]**: su 54 colpi, 15 pallonetti, 15 tagliati, 4 palle corte e 20 normali. Molti pallonetti hanno
  confidenza 0,05–0,49 («la mano sale molto»).
- **Causa [codice]**: in `classifyPhoneShot` la regola del pallonetto scatta anche con un margine minimo. Il segnale
  «su/giù» viene dall'accelerazione lineare, che durante un colpo misura soprattutto la forza centripeta.
- **Soluzione**: tipo di colpo dalla forma del gesto, nel riferimento della gravità:
  - piano dello swing: orizzontale, obliquo o verticale;
  - percorso della testa della racchetta, dal giroscopio: verso l'alto o verso il basso;
  - ampiezza, velocità e apertura del piatto all'impatto.
  Un colpo speciale vale solo con un margine chiaro; altrimenti è un colpo normale.
- **Criterio**:
  - lo stesso gesto dà lo stesso tipo di colpo;
  - nel banco: pallonetti e palle corte voluti riconosciuti ≥ 90%, pallonetti falsi nei colpi normali ≤ 5%.

### P8. Caso artificiale nel risultato del colpo

- **Evidenza [codice]**: `Math.random` e rumore gaussiano entrano in:
  - dispersione laterale (`landingScatter`);
  - profondità (`swingDepthZ`, `playerDepthZ`, profondità per tipo di colpo);
  - errori «lungo / largo / in rete» (`playerErrorPlan`);
  - volo del pallonetto;
  - posizione del servizio.
- **Soluzione**: dal gesto un'intenzione (bersaglio, tipo, forza, altezza) e un'esecuzione (tempo, allungo), entrambe
  deterministiche.
  - L'errore nasce solo quando la traiettoria calcolata esce.
  - Assistenza: i colpi ragionevoli restano in campo, quelli estremi escono.
- **Criterio**: lo stesso colpo sulla stessa palla, ripetuto, dà lo stesso punto di caduta.

### P9. Calibrazione: saltarla lasciava il gioco senza verso; la deriva veniva dalla mano

- **Evidenza [dati]**:
  - «Salta» a 7,7 s ha dato il profilo semplice senza verso (vedi P2);
  - nella ricalibrazione finale (114,5 s) il passo «fermo» ha dato più di 100 avvisi «movimento» in 2,5 s. In quei
    secondi il telefono si muoveva davvero (mediana 30–110 °/s); quando si è fermato (mediana 15 °/s) il passo è
    passato (117,6 s). Il passo «fermo» quindi funziona; gli avvisi sono uno per campione.
- **Causa [codice]**: il passo «fermo» accetta fino a 35 °/s con il telefono in mano e prende come deriva del
  giroscopio la media di quel movimento (vedi P3).
- **Soluzione**: calibrazione breve e tollerante.
  - Deriva solo se plausibile (piccola); altrimenti nessuna, perché il giroscopio del browser è già compensato.
  - Avvisi «movimento» non più di uno ogni mezzo secondo.
  - Poi due swing facoltativi per la forza tipica.
  - Senza calibrazione il gioco funziona lo stesso: verso dalla gravità, forza dalla velocità assoluta.
- **Criterio**:
  - la calibrazione finisce entro 10 s con il tremolio naturale della mano (simulato 15–25 °/s);
  - dopo «Salta» si gioca con verso e tipi di colpo.

### P11. La preparazione giocata come colpo, il colpo vero scartato

- **Evidenza [dati]**: rigiocando i campioni grezzi nella catena del telefono di prima, i colpi riconosciuti
  coincidono con quelli registrati in partita (39 su 40). Mancano 13 colpi forti, da 900 a 1874 °/s, che arrivano
  0,1–0,5 s dopo un gesto lento (175–528 °/s, la preparazione): il telefono ha mandato al gioco la preparazione e ha
  ignorato il colpo vero. 3 dei 6 colpi a vuoto «troppo presto» dello scambio sono così:
  - a 17,15 s: preparazione 301 °/s, colpo vero 1228 °/s a 17,38 s;
  - a 22,57 s: preparazione 257 °/s, colpo vero 1352 °/s a 22,67 s;
  - a 37,21 s: preparazione 260 °/s, colpo vero 1160 °/s a 37,45 s.
  Gli altri tre sono swing forti fatti circa 1 s prima dell'arrivo di palle corte e lente (5–8 m/s), con chi gioca
  fermo 2,15 m dietro il rimbalzo (P6).
- **Causa [codice]**: dopo un gesto mandato al gioco, il rilevatore aspetta che il telefono torni fermo (almeno
  300 ms e 70 ms di quiete) prima di accettarne un altro. Inoltre un gesto nel verso opposto entro 600 ms è il
  «rientro» della mano. Tra preparazione e colpo la quiete non c'è, e il colpo è nel verso opposto.
- **Soluzione**:
  - una rotazione nel verso opposto chiaramente più forte del gesto appena mandato (oltre 1,2 volte) è il colpo vero:
    non si aspetta la quiete e non è un rientro;
  - sul computer lo swing più forte sostituisce quello in attesa (P4).
- **Criterio**:
  - sugli stessi dati, i colpi forti dopo una preparazione sono riconosciuti;
  - nel banco: un colpo dopo la preparazione è sempre riconosciuto, e la preparazione è più debole e nel verso opposto.

### P10. Webcam

- **[dati]** La webcam è stata il controller solo nei primi 5,7 s: 338 fotogrammi su 341 senza mano. Il video mostra
  una persona seduta alla scrivania con le mani fuori inquadratura, prima di passare al telefono.
- **[insufficiente]** Nessun dato sul tracciamento con più persone o sui colpi fatti con la webcam.
- **[codice]** La scelta della mano segue già la continuità e la lateralità, e il banco sintetico copre la folla.
- **Soluzione**: la webcam prende la mano dalla stessa impostazione del gioco (P1); aggiunte prove su più persone,
  perdita del tracciamento e tremolio.

### Cosa funziona e non si tocca

- **[dati]** Collegamento e prestazioni:
  - sensori a 59,9 Hz senza buchi (intervallo p99 17,3 ms);
  - riconoscimento 31,8 ms, consegna 6,7 ms, nessuna caduta;
  - gioco a 60 fotogrammi al secondo.
- **[dati]** I colpi della CPU sono vari: x da −4,45 a +3,89 m; TOPSPIN, SLICE e FLAT.

### Esito della sessione

**[dati]** Chi giocava ha fatto 2 punti (entrambi per palle fuori della CPU) e la CPU 8. Due partite sono finite (a
70,7 e 112,4 s).

### Dati insufficienti

- **[insufficiente]** Manca un riferimento dell'intenzione: la prova guidata non è stata usata, quindi non si sa quale
  colpo si voleva fare.
- **[insufficiente]** La webcam non riprende il gioco.
- **[insufficiente]** Non c'è un confronto destro/mancino.
- **[insufficiente]** Il percorso della mano ottenuto integrando l'accelerazione non è affidabile:
  - a 60 Hz e 1000–1700 °/s l'orientamento sbaglia di decine di gradi tra un campione e l'altro;
  - le velocità verticali ottenute non sono coerenti con il tipo di gesto.
  Per questo il nuovo modello usa il percorso della testa della racchetta calcolato dal giroscopio
  (velocità di rotazione × asse lungo del telefono), non l'accelerazione integrata.

## 3. Nuovo modello del colpo

Il gesto dice che colpo si vuole (intenzione); il tempo dell'impatto e la situazione dicono come riesce (esecuzione).
Nessun numero casuale nel colpo di chi gioca: lo stesso gesto, sulla stessa palla, dà sempre lo stesso esito.

### Dal gesto all'intenzione (telefono e computer)

1. **Mano unica** (P1). La decide il gioco sul computer (`natpf_hand.js`) e va al telefono (`cfg.hand`). Se la si
   cambia sul telefono, il telefono la rimanda (`{t:'hand'}`). La calibrazione non la cambia più.
2. **Verso del gesto senza calibrazione** (P2, `site/js/tennis/swing-detect.js`).
   - Viene dalla rotazione attorno alla verticale, misurata con la gravità.
   - Un telefono con i sensori di segno opposto si riconosce dai colpi (voti contro il verso atteso).
   - La deriva del giroscopio del passo «fermo» vale solo fino a 1,5 °/s: oltre era la mano che si muoveva (P9).
3. **Preparazione e colpo** (P11). Una rotazione nel verso opposto più forte di 1,2 volte la precedente è il colpo, non
   il «rientro». Il telefono manda anche la preparazione; il computer la sostituisce con il colpo (finestra d'impatto).
4. **Forma del colpo** (`site/js/tennis/stroke-shape.js`), all'impatto, nel riferimento della gravità:
   - **piano**: asse di rotazione rispetto alla verticale (1 orizzontale, 0 verticale);
   - **salita**: componente verticale della velocità della testa della racchetta (mano + rotazione × 0,45 m di manico);
   - **manico**: inclinazione del telefono sopra l'orizzonte;
   - **rotazione del polso** sul manico: solo diagnostica, non validata;
   - velocità della testa e della mano.
   La forma non dipende da come si tiene il telefono ed è speculare tra destri e mancini (test 1 e 2).
5. **Intenzione** (`natpf_stroke_intent.js`), sul computer:

   | Colpo | Quando |
   |---|---|
   | Schiacciata | solo con la palla alta: testa che scende, o swing verticale con il manico alto |
   | Pallonetto | testa che sale decisa (salita ≥ 0,55) con swing verticale od obliquo (piano ≤ 0,8) o gesto lento (forza ≤ 0,3) |
   | Tagliato | testa che scende (salita ≤ −0,22) |
   | Palla corta | tagliato morbido (forza ≤ 0,36) o corto (swing ≤ 48°) |
   | Top spin | testa che sale un poco (≥ 0,15), oppure colpo normale |
   | Piatto | testa in piano (\|salita\| ≤ 0,12) e gesto forte (forza ≥ 0,62) |

   - **Forza**: velocità del telefono al picco, da 250 a 1350 °/s. Con la calibrazione completa è per metà relativa al
     proprio colpo tipico.
   - **Profondità voluta** = forza × (0,55 + 0,45 × ampiezza dello swing). Uno swing di 30° o meno vuole il 55%.
   - **Piatto**: scarto della direzione del piatto all'impatto dal proprio colpo abituale per lato. Zona morta 8°,
     mira piena a 36°.
   - Il pallonetto «morbido» vale fino a forza 0,3 (circa 580 °/s). Era 0,55 (circa 850 °/s): un dritto arrotato da
     amatore, inclinato di 35°, diventava un pallonetto. Sui 55 colpi reali dello ZIP non cambia nessun tipo.
   - **Salita abituale** (presa del 19/10): con il telefono in verticale nel pugno la rotazione principale del dritto è
     attorno al lato lungo, e la testa della racchetta virtuale si muove solo con il polso; una pronazione di
     450–800 °/s la abbassa (salita da −0,3 a −0,65) anche nel colpo normale. La calibrazione salva la salita dei due
     gesti per verso (`profile.rises`); il computer legge top spin e piatto rispetto a questa e sposta le soglie dei
     colpi speciali solo per renderli più difficili (pallonetto più in alto se l'abituale sale; tagliato, palla corta
     e schiacciata dall'alto più in basso se scende), al massimo di 0,6. Con «Salta» restano le soglie della tabella.

### Dall'intenzione all'esito (motore)

6. **Esito** (`natpf_stroke_outcome.js`, `_natpfRacketShot` in `game_engine.js`; campo aperto dalla fase C del 22/10
   notte, §6).
   - Il tempo dentro la finestra è una scelta: in anticipo incrociato, in ritardo lungolinea. Il lungolinea pieno vale
     quanto la palla impiega a passare 1,4 m dietro il punto d'impatto.
   - Oltre la finestra è esecuzione: qualità più bassa e palla che continua ad andare verso l'esterno, in modo continuo
     fino alla fine della finestra d'impatto, dove esce (prima si fermava a 1,6 volte la finestra: nell'ultimo 40% della
     finestra tutte le palle uguali).
   - Il lato del colpo (da che parte va la palla in anticipo) viene dal gesto, dritto o rovescio, non da dove il
     movimento automatico ha messo il corpo rispetto alla palla.
   - La mira si misura attorno a un punto neutro che segue la posizione laterale della palla all'impatto (40%); −1 e +1
     sono le due righe (0,45 m dentro). Da ogni posizione si arriva a tutte e due le righe con il tempo e il piatto.
   - Profondità continua dalla profondità voluta (forza, salita, ampiezza dello swing): top spin da 6 a 11,4 m dalla
     rete (il proprio colpo tipico attorno a 8,7 m), piatto 6,4–11,6, tagliato 5,2–10,6, palla corta 1,8–4,6, pallonetto
     8,6–11,4 (prima il top spin 7,4–10,9). Gli angoli stretti cadono più corti in proporzione.
   - Assistenza «morbida»: avvicina le palle alle righe senza superarle e senza cambiare l'ordine delle direzioni; sfuma
     oltre la finestra e attorno alla qualità del livello (prima un taglio netto: molte palle sulla stessa riga).
   - Qualità = portata × preparazione × corsa × palla difficile (veloce, profonda, alta) × pressione degli scambi lunghi.
   - Assistenza per livello. Sotto `assistQ` la palla non è più tenuta in campo; sotto `failQ` il colpo fallisce (in rete
     se colpito sotto 1 m, altrimenti lungo):

     | Livello | mira piena (m) | assistQ | failQ |
     |---|---|---|---|
     | Casual | 3,65 | 0,5 | 0,2 |
     | Esperto | 3,55 | 0,62 | 0,3 |
     | 1v1 | 3,6 | 0,6 | 0,34 |
     | Leggenda | 3,1 | 0,8 | 0,63 (pressione dal 10° colpo) |

7. **Finestra d'impatto** (`natpf_impact.js`, P4).
   - Lo swing resta in attesa fino a quando la palla arriva al punto d'impatto, 0,35 m davanti a chi colpisce.
   - Uno swing più forte (di almeno il 15%) arrivato dopo sostituisce quello in attesa: era la preparazione.
   - Colpo a vuoto, con il motivo: troppo presto (oltre 0,5 s a Casual, 0,42 a Esperto, 0,4 a Leggenda), troppo tardi,
     palla fuori portata.
   - Il tempo all'impatto viene dal piano d'intercetto (conta il rimbalzo) solo se il piano è di questa palla: la palla
     di adesso è dove la traiettoria prevista dice, entro 0,6 m. Prima un piano di meno di 3 s prima valeva per
     qualunque palla: una palla rimessa in gioco subito dopo (lanciapalle, prove) prendeva il tempo del piano vecchio
     e lo swing poteva risultare «troppo presto» (test «piano vecchio», che fallisce con il codice di prima). Lo stesso
     controllo vale per le palle lasciate andare e per la corsa.
   - Il lanciapalle dell'allenamento e delle sfide calcola il piano come in partita (prima usava ancora il vecchio
     posizionamento, 2,15 m dietro il rimbalzo, senza piano).
8. **Movimento automatico** (P6; contestuale dalla fase C). La traiettoria si prevede con la stessa fisica del motore.
   - Dopo il rimbalzo all'altezza comoda; schiacciata al volo sui pallonetti che salgono oltre 3,3 m.
   - Al volo solo quando conviene: aspettare il rimbalzo costerebbe almeno 0,35 s di corsa in più (chi è vicino alla
     rete), nel punto prima del rimbalzo che costa meno corsa. Prima bastava essere a meno di 8 m dalla rete.
   - Le palle che rimbalzerebbero fuori si lasciano andare.
   - Dopo il colpo si torna verso il fondo se si fa in tempo prima del colpo dell'avversario (all'indietro al 55% della
     corsa); a rete si resta solo quando una palla corta ha portato lì e il tempo non basta. Prima: a rete dopo un
     attacco o da dentro il campo, anche con il tempo per tornare (verso la rete dopo il 46–89% dei colpi).
   - Arrivare al limite costa qualità (fino al 40%): un buon angolo dell'avversario si paga.
9. **Servizio dal gesto** (P5). Il colpo parte all'arrivo del gesto. La qualità dipende da quanto il gesto è lontano dal
   punto più alto del lancio; un gesto oltre 0,42 s prima fa ancora parte del lancio. Piatto, kick (testa che sale) o
   slice (swing obliquo); posizione dal piano e dal piatto, sempre nel quadrato. I falli di servizio non ci sono, come
   prima.
10. **Avversario e scambi.**
    - La CPU sbaglia di più con angolo, allungo e pressione (`cpuReturnPlan`, c'era già); a Leggenda conta anche la
      portata.
    - Leggenda ritarata, perché la sua forza veniva dagli errori casuali di chi gioca: CPU a 8 m/s con portata 2,3 m e
      lettura ±0,18 m; cerca il vincente dove chi gioca non arriva; niente affondo durante la reazione.
    - Gli scambi finiscono: palle fuori lasciate andare, pressione dal 16° colpo (dal 10° a Leggenda), `failQ`.
11. **Player 2 del 1v1** con il telefono: stesso esito e stesso piano d'intercetto, calcolati nel suo riferimento e
    specchiati; mano dal suo telefono. Senza telefono il P2 colpisce come prima (si muove con il nuovo piano).

### Webcam, calibrazione, diagnostica

12. **Webcam con un solo soggetto** (`webcam_strokes.js`, `motion_controls.js`; `docs/NATPF_WEBCAM.md`).
    - Le altre mani viste insieme a quella di chi gioca si ricordano (`trackOthers`) e non ne prendono il posto.
    - Persa la mano di chi gioca, per 5 s (`HAND_KEEP`) si riprende solo una mano della sua taglia, anche altrove.
    - Il 22/10 le due sessioni ne avevano fatta una versione ciascuna; si è tenuta questa, che con le prove di entrambe
      fa 54 scenari giusti su 55 (l'altra 49: perdeva colpi veri dopo una perdita breve della mano).
13. **Calibrazione.**
    - Con «Salta» il gioco è completo: verso dalla gravità, intenzione dalla forma, forza assoluta; «Salta» vale anche
      durante il passo «fermo».
    - Percorso rapido con due gesti facoltativi (dritto e rovescio) e passo «fermo» sulla mediana della rotazione: circa
      4,5 s anche con un tremolio di 25 °/s (prima quattro gesti, 8,3 s e oltre 10 s con il tremolio).
    - Colpi completi accettati: un gesto nel verso opposto a quello chiesto può essere l'apertura lenta. Si aspetta fino
      a 0,9 s il colpo nel verso giusto, finché la mano non si ferma davvero (0,4 s). Prima l'apertura veniva giudicata
      da sola («altro verso») e il colpo non contava.
14. **Diagnostica** (`docs/NATPF_DIAGNOSTICA.md`).
    - `tel.colpo` con velocità al picco, forma e intenzione.
    - Esito nel campo `racchetta` di `colpo.gioco` (legato al gesto con il numero del colpo) ed eventi `racchetta`,
      `piano`, `servizio`, `vuoto` (colpo a vuoto con il motivo): in parte doppi, da tenerne uno.
    - Ripetibilità: per colpo richiesto (p90 − p10) e per colpo voluto (mediana e scarto interquartile).
    - Prova guidata con tagliati e palle corte (circa 5 minuti).

### Test obbligatori

| # | Prova | Test |
|---|---|---|
| 1 | Specchio destro/mancino | `natpf-racchetta`: «forma: specchio destro/mancino», «verso senza calibrazione»; `natpf-racchetta-motore`: «1v1 … specchiato» |
| 2 | Inclinazioni diverse del telefono | `natpf-racchetta`: «forma: inclinazioni e rotazioni del telefono in mano» |
| 3 | Swing corto e ampio | `natpf-racchetta`: «swing corto e ampio»; `natpf-racchetta-motore`: «swing corto e ampio nel motore» |
| 4 | Swing orizzontale, verticale e obliquo | `natpf-racchetta`: «forma: swing orizzontale, obliquo e verticale», «colpi vari dal gesto» |
| 5 | Incrociato e lungolinea | `natpf-racchetta-motore`: «incrociato e lungolinea»; prova nel browser `natpf-phone-upright` (mira) |
| 6 | Schiacciata prima del rimbalzo | `natpf-racchetta-motore`: «schiacciata prima del rimbalzo», «1v1 … schiacciata al volo» |
| 7 | Palla corta e pallonetto ripetibili | `natpf-racchetta-motore`: «palla corta e pallonetto ripetibili»; `natpf-racchetta`: «colpi vari dal gesto» |
| 8 | Finestra d'impatto | `natpf-racchetta-motore`: «finestra d'impatto»; `natpf-webcam-classifier`: «nel motore: lo swing della webcam …» |
| 9 | Webcam con più persone | `natpf-webcam-classifier`: «più persone (prova 9)», «webcam con più persone, mano persa e tremolio», «folla» |
| 10 | Perdita del tracciamento | `natpf-webcam-classifier`: «perdita del tracciamento (prova 10, webcam)», «flusso ottico di riserva»; `natpf-racchetta`: «perdita del tracciamento (prova 10, telefono)» |
| 11 | Tremolio | `natpf-racchetta`: «tremolio», «tremolio in partita (prova 11, telefono)», calibrazione con il tremolio; `natpf-webcam-classifier`: «tremolio (prova 11, webcam)», «… e tremolio» |
| 12 | Scambi dinamici | `natpf-racchetta-motore`: «scambi che finiscono e dinamici», «palla che va fuori»; audit della Leggenda |
| 13 | Collegamento del telefono | `natpf-racchetta`: «mano: una sola»; `tools/test`; prove nel browser (§4.2) |
| 14 | Regressioni | `npm test`, `tools/test`, prove nel browser, banco della webcam |

## 4. Risultati

Tre risultati diversi, tenuti separati: codice implementato, test automatici superati, validazione fisica.

### 4.1 Codice implementato

| Parte | File |
|---|---|
| Telefono: verso, preparazione, deriva, forma, messaggio, mano | `site/js/tennis/swing-detect.js`, `stroke-shape.js` (nuovo), `face-tracker.js`, `swing-message.js`, `racchetta.js`, `link.js` |
| Calibrazione | `site/js/tennis/calibration.js` |
| Intenzione ed esito | `natpf-tennis/src/natpf/natpf_stroke_intent.js`, `natpf_stroke_outcome.js` (nuovi), `natpf_phone_racket.js`, `natpf_hand.js`, `natpf_ui.js` |
| Finestra d'impatto, movimento, servizio, Player 2 | `natpf-tennis/src/natpf/natpf_impact.js` (nuovo), `src/game_engine.js`, `natpf_shot_feedback.js` |
| Avversario | `natpf-tennis/src/natpf/natpf_legend.js`, `natpf_skill.js` |
| Webcam | `natpf-tennis/src/natpf/webcam_strokes.js`, `src/motion_controls.js` |
| Diagnostica | `natpf-tennis/src/natpf/diag/` (registratore, metriche, rapporto, prova guidata), `natpf_diag.js` |
| Testi della modalità semplice | `natpf_lobby.js`, `natpf_training.js` |

### 4.2 Test automatici superati

Eseguiti in questo contenitore il 22/10/2026. I numeri sono quelli rifatti la sera sul branch unico, dopo l'unione
del lavoro delle due sessioni del giorno (vedi `SESSION_HANDOFF.md`), salvo dove indicato.

- **`natpf-tennis`**: `npm test`, 276 test su 276.
- **`tools/test`** (pagina del telefono e codice condiviso): 135 su 135. Il test nuovo della calibrazione con colpi
  completi fallisce con il codice di prima.
- **Prove nel browser** (browser senza schermo, telefono simulato, pagina vera del telefono e collegamento vero), con il
  codice unito e la build:

  | Prova | Esito |
  |---|---|
  | `natpf-phone-upright`: QR, calibrazione rapida con colpi completi, colpi normali mai pallonetti, pallonetto, mira | 10/10 con i gesti della racchetta simulata; con i gesti di prima (presa del 19/10) 7/10, vedi §4.4 |
  | `natpf-training-flow`: allenamento dal menu, calibrazione in campo, esercizi | 13/13 |
  | `natpf-latency`: dal gesto alla risposta, un solo swing per gesto, swing all'istante del colpo | 9/9 |
  | `natpf-training-reconnect`, `natpf-phone-blackout`: telefono scollegato, rete che cade | 6/6, 6/6 |
  | `natpf-menu` | 22/22 |
  | `natpf-1v1-p2p`: 1v1 tra due browser (anche sul pacchetto Cloudflare estratto, prima dell'unione) | 18/18, 18/18 |
  | `natpf-diag-session`: diagnostica lunga, parti, spazio, ricarica, prova guidata | 24/24 |
  | `lan-e2e` | 7/8: la verifica che manca è il limite noto del contenitore (il browser di prova non raggiunge l'indirizzo di rete del contenitore), come nei giri precedenti |

  I gesti della prova del telefono vengono dalla racchetta simulata (`natpf-tennis/test/racket-gestures.mjs`).
- **Prove della CI della pagina storica** (`.github/workflows/natpf-simulator-tests.yml`): telefono 10/10, grafica 9/9,
  pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4; **«gesture and calibration» e «timing-browser» falliscono**
  (§4.4). Fuori dalla CI, `phone-cal.mjs` (partita intera col telefono) fallisce (§4.4).
- **Pacchetti** (fuori dal repository, prima dell'unione): Cloudflare 23,7 MiB, 84 file, nessuno oltre 25 MiB; estratto e servito da un
  server statico risponde su gioco, pagina del telefono (con il codice nuovo), risorse e `_headers`. LAN per Windows
  57,2 MiB con Node 22.22.0 (somma SHA-256 uguale a quella ufficiale); estratto: certificato, server, gioco, pagina
  del telefono e stanza 1v1 rispondono.

#### Difetti trovati dalle prove nel browser e corretti

- **Calibrazione con colpi completi**: l'apertura lenta nel verso opposto veniva giudicata da sola («altro verso») e il
  colpo non contava. Corretto in `calibration.js`; test nuovo in `tools/test` (fallisce con il codice di prima).
- **Piano d'intercetto vecchio**: una palla rimessa in gioco senza piano usava il tempo del piano precedente, lo swing
  risultava «troppo presto» (prova della latenza 7/9 → 9/9). Corretto: il piano vale solo per la sua palla; il
  lanciapalle calcola il piano. Test «piano vecchio» (fallisce con il codice di prima).
- **Colpo della calibrazione in campo**: con la finestra d'impatto il colpo partiva al fotogramma dopo il gesto, e la
  palla del gesto successivo (o la verifica, dopo l'ultimo) lo cancellava (prova dell'allenamento 11/13 → 13/13, con
  la prova originale). Corretto in `natpf_training.js`; test nuovo in `natpf-flows` (fallisce con il codice di prima).
- **Gesti della prova del telefono**: erano rotazioni del telefono sul proprio lato lungo, senza percorso della testa
  della racchetta; ora vengono dalla racchetta simulata delle prove in Node. Questa non è una correzione del codice:
  con i gesti di prima il codice finale fa 7/10 (§4.4).
- **Audit della Leggenda** (`npm run audit:legend`, punti e semi predefiniti): tutti i criteri rispettati con i sei
  profili. Per esempio contro «preciso»: game vinti dalla CPU 89,2% (≥ 60%), incrociati 32,1% (30–50%), lungolinea
  29,1%; contro «tennista» 97,3% (≥ 85%).
- **Banco della webcam** (`webcam-sweep`, griglie ridotte): uscita identica riga per riga prima e dopo questo giro, 16
  criteri su 18. I due che mancano mancavano già: tempo del colpo rispetto all'impatto negli swing secchi, pallonetto
  voluto riconosciuto (19%).
- **Scambi simulati** (`simulate`, profilo «tennista», 60 punti, seme 4):

  | Livello | punti vinti | colpi/punto | colpi | al volo | schiacciate | tagliati | lasciate andare |
  |---|---|---|---|---|---|---|---|
  | Casual | 98,3% | 8,3 | 213 | 140 | 3 | 17 | 21 |
  | Esperto | 95% | 13,2 | 353 | 239 | 5 | 27 | 33 |
  | Leggenda | 6,7% | 9,8 | 272 | 103 | 28 | 21 | 5 |

  A Leggenda il 19% dei colpi fallisce (pressione e `failQ` alto, senza caso). Nessuno scambio arriva a 60 colpi.

#### 4.2.1 Prima e dopo sugli stessi dati

- **Telefono, campioni grezzi della sessione reale** (`scripts/audit/zip-replay.mjs` con il rilevatore di `bfd629c`):

  | | prima | adesso |
  |---|---|---|
  | colpi rigiocati | 40 | 55 |
  | con il verso del gesto | 0 | 47 |
  | colpi forti (900–1874 °/s) riconosciuti | — | 13 in più (prima al loro posto la preparazione, 175–528 °/s) |

  La versione di prima, rigiocata, coincide con i colpi registrati in partita in 39 casi su 40: il rigioco è fedele.
  Tipi sugli stessi 40 colpi: registrati in partita {pallonetto 15, top spin 14, tagliato 7, palla corta 4}; modello
  nuovo {top spin 21, palla corta 9, tagliato 4, piatto 3, pallonetto 3}. Le palle corte sono soprattutto preparazioni
  deboli, che in partita la finestra d'impatto sostituisce con il colpo.
- **Webcam con più persone** (`scripts/audit/webcam-crowd.mjs`, stesse scene sintetiche): colpi fantasma nelle scene
  con altre persone 6 prima, 0 con la versione della prima sessione, 1 con quella tenuta all'unione dei due branch
  (la mano nuova della stessa taglia che entra lontano dopo 0,6 s: limite noto, in cambio dei colpi veri che l'altra
  perdeva dopo una perdita breve della mano). Nella scena «chi gioca ritrovato dopo 0,9 s, poi rovescio»: prima un
  colpo fantasma e il rovescio perso, adesso il rovescio. Tremolio fino a 3,6 cm a 2 m: 0 colpi prima e dopo (60
  prove).
- **Calibrazione con colpi completi** (apertura lenta e colpo): prima fallisce («altro verso» sull'apertura), adesso
  passa con i colpi del percorso rapido (`tools/test`, test nuovo, e prova nel browser).

### 4.3 Validazione fisica

**Non eseguita.** In questo lavoro non c'erano un telefono, una webcam o lo schermo del gioco reali. I test sopra usano
sensori e mani simulati: dicono che la catena fa quello che deve con gesti fisicamente plausibili, non che i gesti
veri di chi gioca diano gli stessi numeri. Soglie da confermare con il telefono vero: salita del pallonetto (0,55), del
tagliato (−0,22), forza del pallonetto «morbido» (0,3), zona morta del piatto (8°). La procedura è in §5.

### 4.4 Limiti noti

- **Difetti verificati dopo la fine del giro** (misure in `SESSION_HANDOFF.md`, «Difetti verificati»):
  - non è un difetto del rilevatore (fasi B ed E): le due prove della CI della pagina storica che fallivano dopo
    l'unione, «gesture and calibration» e «timing-browser», passano 20 volte su 20 a macchina scarica (5 per prova e per
    rilevatore, quello attuale e quello di `84ca878`); sotto carico falliscono allo stesso modo con tutti e due i
    rilevatori (2 su 3 e 1 su 3 superate), e «timing-browser» non usa nemmeno il rilevatore. Sono prove sensibili al
    carico della macchina: vanno lanciate una alla volta;
  - risolto (fase B): nella partita intera della pagina storica (`phone-cal.mjs`, fuori dalla CI) il telefono non
    lanciava e non colpiva. Le cause erano nella prova, non nel gioco: il controllo «mouse e tastiera non producono input»
    spegneva i comandi della partita e non li riaccendeva (da lì ogni colpo del telefono veniva scartato; prova e filtro
    sono entrati insieme il 15/10); il robot programmava i gesti come se la partita andasse in tempo reale, mentre con la
    grafica software il tempo della partita va più piano (un passo al massimo 0,1 s per fotogramma) e il colpo arrivava
    anche un secondo prima; il lancio non si riprovava. Ora 17/17, partita finita (punti 4–6);
  - presa del 19/10 (fase B, sensori simulati): la prova con il telefono coerente (calibrazione e partita con la stessa
    pronazione, `natpf-phone-upright-19-10.mjs`) e quella con la racchetta simulata passano 10/10. La prova di `84ca878`
    resta 7/10 ed è servita da riferimento diagnostico: calibra senza pronazione e gioca con la pronazione (salita
    abituale 0, quindi i dritti con la testa che scende di 0,27–0,40 sono tagliati); il suo «pallonetto» inclina in
    avanti la cima del telefono, che per la racchetta virtuale è la testa che scende (−0,42); il piatto sposta la palla di
    1,2 m con ±25° (la prova chiedeva 1,5 m, tarata quando il piatto valeva 3,9 m). Corretto il caso di chi salta la
    calibrazione: la salita abituale si impara giocando (mediana degli ultimi colpi per verso, da tre colpi); dal quarto
    colpo dritti e rovesci con la pronazione sono normali. Resta: chi calibra senza pronazione e poi gioca con la
    pronazione vede tagliati finché non ricalibra con il proprio colpo;
  - risolto nel codice e nei test automatici (fase B, da provare con il telefono vero): negli swing corti la forza era
    sottostimata perché il picco era quello della media mobile, che negli swing di pochi campioni resta sotto il
    picco vero. Il telefono manda anche il picco dei campioni grezzi (vertice della parabola, `vr`), la calibrazione ne
    impara il riferimento (`rawRef`) e la forza usa quello; la portata del gesto pesa poco sulla profondità (80% dalla
    forza), così uno swing compatto ma veloce non è punito;
  - risolto (fase B): l'esito della racchetta e la ripetibilità erano registrati due volte nella diagnostica; ora
    l'esito è solo nell'evento `racchetta` e la variazione solo in `ripetibilita`;
  - risolti dall'unione: errore della pagina storica sull'evento `hand`; calibrazione oltre 10 s con il tremolio
    (ora circa 4,5 s); «Salta» durante il passo «fermo».
- Webcam: all'avvio vince la mano più grande con la lateralità giusta, quindi un'altra persona più vicina alla webcam
  di chi gioca può essere scelta. Persa la mano di chi gioca, una mano nuova della stessa taglia che entra entro 5 s
  viene presa anche lontano e il suo swing conta (`docs/NATPF_WEBCAM.md`).
- Webcam: un tremolio di 4,8 cm a 12 Hz (molto oltre un tremolio vero) fa colpi in 6 semi su 20.
- Telefono: la rotazione del polso sul manico è misurata ma non usata (non validata).
- La direzione dipende soprattutto dal tempo dell'impatto; il piatto sposta la palla di circa 0,7 m con 25° (per
  progetto, pesa meno del tempo).
- I falli di servizio non ci sono, come prima.

## 5. Procedura di validazione fisica

Serve: il computer del gioco, un telefono Android e un iPhone, una webcam, una seconda persona, una videocamera o un
telefono che riprende a 240 fotogrammi al secondo (per il ritardo dello schermo). Ogni prova si registra con la
diagnostica (Maiusc+D → Registra) e si salva il pacchetto.

1. **Collegamento e mano** (test 13, 1). Mano destra nel gioco → il telefono la mostra; cambiarla sul telefono → il
   gioco la mostra. Ripetere con «mancino». Atteso: sempre la stessa mano sui due schermi.
2. **Calibrazione con colpi completi** (test 13). Calibrazione rapida facendo colpi veri, con l'apertura, con la presa e
   il polso di sempre (da qui il gioco impara la salita abituale del proprio colpo). Atteso:
   superata al primo giro (evento `tel.cal` con `pass`). Poi «Salta» in una seconda sessione: atteso il gioco completo
   (verso del gesto negli eventi `tel.colpo`, campo `dir` diverso da 0 in più di 8 colpi su 10).
3. **Prova guidata** (Maiusc+D → Prova guidata, circa 5 minuti), con il telefono, una volta per mano e per persona
   (almeno tre persone). Dal riassunto e da `metriche.json`:
   - lato giusto ≥ 90%, tipo giusto ≥ 80% (dritti e rovesci normali);
   - pallonetti: tipo giusto ≥ 70%; tagliati ≥ 70%; palle corte ≥ 60%;
   - direzione giusta (incrociato e lungolinea) ≥ 70%;
   - ogni errore va guardato nel video prima di cambiare una soglia (chi gioca può aver fatto un altro gesto).
4. **Ripetibilità** (test 7). Dieci palle corte e dieci pallonetti uguali (meglio dalla prova guidata, un gruppo per
   colpo richiesto). In `metriche.json`, `ripetibilita.gruppi`: variazione della profondità (`profondita`, p90 − p10)
   entro 1 m e tipo uguale (`tipoUgualePercento`) almeno all'80%.
5. **Inclinazioni e impugnature** (test 2). Dieci dritti tenendo il telefono più dritto, dieci più inclinato e dieci
   ruotato nella mano. Atteso: stesso tipo (`tel.colpo.intenzione.colpo`) e salita entro ±0,15.
6. **Swing corto e ampio** (test 3). Dieci colpi bloccati (corti) e dieci ampi alla stessa velocità. Atteso: profondità
   dei colpi corti più vicina alla rete.
7. **Swing orizzontale, verticale, obliquo** (test 4). Dieci per tipo: atteso top spin (orizzontale e obliquo in
   salita), pallonetto (verticale dal basso), tagliato (dall'alto).
8. **Movimento, schiacciata e volée** (test 6, fase C). Partita a Esperto e a Leggenda. Atteso: dopo i colpi dal fondo
   si torna in fondo (nessuna corsa a rete senza una palla corta); su una palla corta si va avanti e, se l'avversario
   risponde subito, si gioca al volo; sui pallonetti corti della CPU si schiaccia al volo. Negli eventi `piano`: `volley`
   e `smash` solo in questi casi; negli eventi `racchetta`: `volee: true`.
9. **Finestra d'impatto** (test 8). Swing volutamente in anticipo e in ritardo. Atteso: eventi `vuoto` con motivo
   «presto» o «tardi», mai un colpo con la palla lontana.
10. **Tremolio** (test 11). Telefono tenuto fermo 30 s in posizione di attesa. Atteso: nessun `tel.colpo`.
11. **Webcam con più persone** (test 9, 10). Chi gioca al centro a 2 m; una seconda persona accanto che fa swing, poi
    che passa davanti alla webcam; chi gioca nasconde la mano per 1–2 s. Atteso: nessun evento `input` della webcam per
    gli swing dell'altra persona; i colpi di chi gioca riprendono dopo la mano nascosta. Ripetere con l'altra persona
    più vicina alla webcam di chi gioca (limite noto: all'avvio può essere scelta lei).
12. **Scambi dinamici** (test 12). Tre partite a Casual, Esperto e Leggenda. Atteso: scambi che finiscono e palle
    lasciate andare negli eventi; volée solo dopo palle corte; a Leggenda nessuno scambio oltre 40 colpi.
13. **Ritardo dello schermo**. Video a 240 fotogrammi al secondo dello schermo e del telefono: se i colpi arrivano in
    ritardo di più di 40 ms in ogni sessione (riassunto: «tempo dei colpi del telefono»), impostare il ritardo dello
    schermo nella diagnostica.
14. **Campo aperto** (fase C, §6). Dalla stessa palla del lanciapalle (allenamento), con il telefono, una persona per
    volta:
    - dieci dritti con il tempo che va dal molto in anticipo al molto in ritardo: nella diagnostica (`racchetta`) `mira`
      e `x` cambiano in ordine con `tempo`, senza colpi con la stessa caduta per tempi diversi; ai due estremi la palla
      esce di lato;
    - dieci dritti dal più morbido al più forte: `profondita` cresce in ordine, dalla zona della riga del servizio alla
      riga di fondo; il colpo abituale cade attorno a 8–9 m;
    - lo stesso dritto ripetuto dieci volte: `ripetibilita` con variazione della caduta entro 1 m;
    - nel riassunto, «scarto tra caduta calcolata e rimbalzo vero» con mediana entro 0,3 m;
    - in partita: dopo i colpi dal fondo il giocatore torna in fondo; va a rete solo dopo una palla corta.
    Ogni cosa che non torna va guardata nel video (la persona può aver fatto un altro gesto) prima di cambiare il modello.

Analisi dei pacchetti: `node scripts/diag/diag.mjs colpi sessione.zip` e, per i campioni grezzi,
`node --import ./test/register.mjs scripts/audit/zip-replay.mjs <cartella estratta>`.

## 6. Confronto con il gioco di riferimento, campo aperto e movimento (fasi A e C, 22/10 notte)

### Il riferimento

Il gioco di riferimento indicato nella richiesta esiste con quel nome ed è uscito il 22/10/2026 (pagina ufficiale
dell'editore, enciclopedia, quattro recensioni del 20–22/10). Il tennis è uno dei suoi dodici sport. Da qui non si
possono guardare video: le osservazioni vengono da testi. Le fonti, con i nomi, sono nel rapporto della sessione e non
nei documenti (regola di marchio).

Livelli di certezza: **[osservato]** detto da una fonte sul tennis di questo gioco; **[inferito]** detto per il tennis
del gioco precedente della stessa serie, che una recensione dice identico («esattamente come lo ricordate»);
**[ipotesi]** non detto da nessuna fonte.

| Meccanica | Riferimento | NATPF adesso (misurato) | Differenza | Intervento | Verifica |
|---|---|---|---|---|---|
| Movimento | [osservato] il personaggio corre da solo dove va la palla; non si può muovere con la levetta | piano d'intercetto sulla traiettoria prevista; dopo il colpo «a rete» se si colpisce da dentro il campo o dopo un attacco: nelle partite simulate il bersaglio dopo il colpo è a rete nel 56–89% dei colpi, metà dei colpi del profilo migliore a 2,9 m dalla rete, 70% volée | il nostro giocatore va e resta a rete senza che la palla lo chieda | recupero dopo il colpo verso il fondo quanto il tempo permette; avanti solo per prendere una palla corta | `audit:rally --campo`: quota verso la rete, profondità dell'impatto; test del movimento |
| Tempo e direzione | [osservato] in anticipo da una parte, in ritardo dall'altra; la direzione dipende molto dal tempo | stessa regola, ma piena già a 0,15–0,2 s di anticipo mentre lo swing si tiene fino a 0,42–0,5 s: oltre 0,26–0,32 s ogni colpo cade nello stesso punto (x −4,0 m) | il 40% della finestra dà la stessa palla | mappa continua su tutta la finestra, angolo dalla posizione di chi colpisce | test di continuità, copertura, ripetibilità |
| Profondità e forza | [inferito] la velocità dello swing dà la velocità della palla | profondità di un colpo normale da 8,45 m (forza 0,3) a 10,9 m (forza 1): 2,5 m; con i gesti tipici 9,5–10,9 m, tetto 11,3 m | metà campo e centro irraggiungibili con un colpo normale | profondità continua su tutto il campo dalla forza rispetto al proprio colpo, dalla salita e dall'ampiezza; lunga possibile se si esagera | test della profondità controllabile |
| Tipi di colpo | [osservato] più tipi di colpo, schiacciate; [inferito] polso sopra la palla = top spin, «a cucchiaio» = taglio, dal basso in alto = pallonetto | forma del colpo (salita della testa, piano), salita abituale dalla calibrazione | il polso sul manico è solo diagnostica | nessuno in questa fase | prova guidata (§5) |
| Partita | [osservato] doppio due contro due; partita «tranquilla» con palla grande e lenta | 1 contro 1 per richiesta; nessuna palla lenta | voluta (niente doppio) | nessuno | — |
| Assistenza | [osservato] le recensioni la trovano a volte «un po' casuale», «poco prevedibile» con gli avversari forti | nessun caso nel colpo di chi gioca; tetti e spinte deterministici | voluto: più controllo del riferimento | tenere la palla dentro senza cambiare la direzione voluta | test «l'assistenza non cancella l'intenzione» |
| Grafica, telecamera | [ipotesi] non descritte dalle fonti | visuale alle spalle, specchiata per il P2 | non verificabile da qui | nessuno | prova fisica |

### Campo aperto: cause trovate nel codice

- **Saturazione del tempo** (`natpf_stroke_outcome.js`): `inside = clamp(t, −1, 1)` con t = anticipo / finestra della
  direzione (0,15–0,2 s), mentre lo swing in attesa vale fino a 0,42–0,5 s prima (`IMPACT.early`). Oltre la finestra
  l'anticipo diventa solo «errore» (spinta oltre la riga laterale), sempre uguale.
- **Profondità compressa**: tabella `OUTCOME.depth` (top spin 7,4–10,9 m), tetto `maxDepth` 11,3 m, forza che satura a
  1350 °/s (i dritti veri arrivano a 1200–1650 °/s).
- **Mira assoluta**: la caduta laterale è `aim × xMax` indipendente da dove si trova chi colpisce; la posizione non
  conta.
- Non trovati: bersagli a zone, angoli quantizzati, caso. La continuità c'è, ma è schiacciata in pochi metri e
  satura.

### Movimento: cause trovate nel codice

- `recoverAfterShot` (`natpf_impact.js`): colpito a meno di 8,2 m dalla rete → sempre a rete; colpo profondo e forte o
  angolato da meno di 10,6 m → a rete («attacco»). Una palla corta porta avanti, e da lì non si torna più.
- `planPlayerIntercept`: chi è entro 8 m dalla rete prende la palla al volo, quindi resta avanti.

### Campo aperto e movimento: cosa è cambiato (fase C)

Codice: `natpf_stroke_outcome.js` (mira attorno al punto neutro, tempo continuo su tutta la finestra, profondità su
tutto il campo, assistenza morbida), `natpf_impact.js` (volée solo quando conviene, recupero secondo il tempo),
`game_engine.js` (lato del colpo dal gesto, posizione della palla all'impatto, tempo di volo al recupero), diagnostica
(evento `racchetta` con mira, punto neutro, palla all'impatto, assistenza, volo, altezza sulla rete, effetto; metrica
dello scarto tra la caduta calcolata e il rimbalzo vero). Test: `natpf-campo-aperto.test.mjs` (12 prove; con il codice
di prima ne falliscono 11, tutte tranne «stessi ingressi, stesso esito»).

Misure con i giocatori simulati (`npm run audit:rally -- --campo`, tre partite da 150 punti per riga; prima = codice
della fase B):

| | prima | dopo |
|---|---|---|
| verso la rete dopo il colpo | 46–89% dei colpi | 0–0,1% |
| volée | 33–69% | 0–0,1% a Casual ed Esperto; a Leggenda su palle corte e pallonetti |
| impatto, mediana della distanza dalla rete | 2,9–10,5 m | 9,9–12,4 m |
| celle di 1 m usate (profili del telefono) | 35–46 | 38–60 |
| profondità p10–p90, tutti i profili | 5,4–10,2 m | 4,8–10,4 m |
| caduta del dritto in anticipo oltre 0,32 s (Casual) | sempre −4,02 m | da −4,0 a −5,2 m, continua |
| profondità del dritto, forza 0,3 → 1 | 8,45 → 10,90 m | 7,62 → 11,31 m (6,0 m a forza 0) |

- Leggenda (`npm run audit:legend`): tutti i criteri rispettati; contro chi resta in fondo usa più palle corte.
- Equilibrio (`npm run audit:rally`): nessuno scambio infinito. Chi gioca con il telefono vince più punti di prima, perché
  non viene più passato a rete: a Esperto il profilo «amatore» dal 57% all'80%, «tennista» dal 94% al 99,8%, «bambino»
  dal 24,5% al 28%; il controllo esistente «Esperto contro medio» resta nel 70–85% dei game (83%). Da rivedere con le
  partite vere della diagnostica prima di toccare la CPU.
- Limiti: il lungolinea pieno chiede anche il piatto (in ritardo, dentro la finestra, la mira arriva a +0,57 contro −0,87
  in anticipo, perché la palla passa il corpo); un colpo molto in anticipo (oltre circa 1,7 volte la finestra della
  direzione) esce di lato; la varietà della CPU e la sua difficoltà non sono state ritarate.

