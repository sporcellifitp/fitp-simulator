# Telefono come racchetta virtuale: diagnosi e nuovo modello del colpo (22/10/2026)

Richiesta: il gesto fisico è l'input del gameplay. Direzione, potenza, altezza e traiettoria vengono dal gesto, con
un'assistenza arcade e senza caso: gesti simili danno risultati simili. Riferimenti: Wii Sports Tennis e Switch Sports.

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
- Video di riferimento (YouTube, `shorts/TQorjBl0vdU`): da qui il video non si scarica. Si leggono solo i metadati
  (titolo «Nintendo switch sports: (56) #switchsports #tennis») e quattro immagini (tre miniature automatiche e la
  copertina). Si vede Switch Sports Tennis in doppio: telecamera dietro chi gioca a media altezza, scia dello swing
  ben visibile e lampo all'impatto del servizio. Le meccaniche non si possono osservare da quattro immagini statiche.
  Dalla pagina dei consigli di Nintendo: topspin ruotando il polso sopra la palla all'impatto; effetto all'indietro e
  palla che curva con una rotazione del polso «a cucchiaio»; pallonetto con uno swing dal basso verso l'alto. Che nel
  tennis di Wii Sports e Switch Sports la direzione dipenda dal tempo del colpo (in anticipo incrociato, in ritardo
  lungolinea) è conoscenza generale, non verificata dal video. Il doppio del video non si riprende: si resta al 1 contro 1.

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
  - Dopo un colpo d'attacco riuscito chi gioca sale a rete, poi torna in posizione.
- **Criterio**: negli scambi automatici si vedono volée dopo i colpi d'attacco e schiacciate al volo su palle alte
  raggiungibili.

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

## 3. Nuovo modello del colpo (in costruzione)

### Intenzione ed esecuzione

1. **Lateralità unica** (P1): la mano del gioco sul computer va al telefono.
2. **Verso del gesto** dalla gravità (P2).
3. **Forma del gesto**, sul telefono, all'impatto, nel riferimento della gravità:
   - **piano**: asse di rotazione rispetto alla verticale (orizzontale, obliquo, verticale);
   - **percorso**: verso della testa della racchetta, cioè velocità di rotazione × asse lungo del telefono (su o giù);
   - **ampiezza** dello swing e **velocità** al picco;
   - **piatto all'impatto**: apertura e rotazione che lo chiude (topspin) o lo apre (taglio).
   La forma non dipende da come si tiene il telefono ed è speculare tra destri e mancini.
4. **Intenzione** (computer):
   - tipo di colpo dalla forma, con margini chiari, più il contesto della palla (alta: schiacciata; a rete: volée);
   - direzione dal tempo dentro la finestra e dal piatto rispetto al proprio colpo abituale;
   - profondità dalla forza e dall'ampiezza;
   - altezza dal percorso.
5. **Esecuzione**: tempo fuori dalla finestra comoda e allungo tolgono qualità (palla più lenta, più corta, più alta)
   in modo deterministico. Nessun numero casuale nel colpo di chi gioca.
6. **Finestra d'impatto**: traiettoria prevista, swing in attesa fino all'arrivo, colpo a vuoto oltre la finestra (P4).
7. **Movimento automatico** con volée e schiacciate al volo (P6).
8. **Servizio** dal gesto (P5).
9. **Avversario**: un angolo buono lo fa correre e gli toglie qualità nella risposta, in modo sistematico. Gli scambi
   finiscono.
10. **Diagnostica**: forma, intenzione ed esito di ogni colpo negli eventi; prova guidata con il colpo richiesto.

### Test obbligatori

| # | Prova | Dove |
|---|---|---|
| 1 | Specchio destro/mancino | banco sintetico del telefono |
| 2 | Inclinazioni diverse del telefono | banco sintetico del telefono |
| 3 | Swing corto e ampio | banco sintetico del telefono |
| 4 | Swing orizzontale, verticale e obliquo | banco sintetico del telefono |
| 5 | Incrociato e lungolinea | motore vero, senza grafica |
| 6 | Schiacciata prima del rimbalzo | motore vero |
| 7 | Palla corta e pallonetto ripetibili | motore vero |
| 8 | Finestra d'impatto | motore vero |
| 9 | Webcam con più persone | banco sintetico della webcam |
| 10 | Perdita del tracciamento | webcam e telefono |
| 11 | Tremolio | telefono e webcam |
| 12 | Scambi dinamici | motore vero, partite automatiche |
| 13 | Collegamento del telefono | test esistenti più la mano sincronizzata |
| 14 | Regressioni | `npm test`, e2e |

Prima/dopo sugli stessi dati: i campioni grezzi dello ZIP rigiocati nella catena di prima e in quella nuova
(`scripts/audit/zip-replay.mjs <cartella dello ZIP estratto>`; lo ZIP non entra nel repository).

## 4. Risultati

Da completare a fine lavoro. Restano separati:
- codice implementato;
- test automatici superati;
- validazione fisica (telefono e webcam veri).
