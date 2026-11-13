# B36 · Riferimenti per la direzionalità (agente «riferimenti», sola lettura)

**Base del codice.** Durante l'analisi `natpf-simulator` è passato da `94442a3` a **`c22b6e8` «Unione B35a»**. Tutti i riferimenti file:riga sono a `c22b6e8`, letti con `git show c22b6e8:…`. Non ho toccato nessun file del repository.

**Script e calcoli** (cartella `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b36/agenti/riferimenti/`):
- `righe.py`, `camera_fit2.py`, `confronto_camere.py`, `palla.py`, `volo.py`
- `mappa-oggi.mjs`, `raggiungibile.mjs`, `separabilita.mjs`, `ritmo.mjs`: importano le regole vere di `natpf_stroke_outcome.js` e `natpf_stroke_intent.js`, senza motore, meno di 10 s ciascuno.

**Segni usati.**
- [OSS] osservato nelle miniature
- [CON] conoscenza generale
- [VER] verificato nel codice, o eseguendo le regole vere
- [CALC] mio calcolo, con le ipotesi dichiarate
- [DED] deduzione

---

## 1. Cosa mostrano le immagini

### Video 1 (gioco di tennis commerciale)
È uno Shorts verticale. Le miniature 16:9 sono lo stesso quadro con i lati sfocati.

- **[OSS] Tre fotogrammi distinti:**
  - **A**, scambio da fondo: maxresdefault, maxres2, hq2 e oardefault 1080×1920 sono lo stesso quadro.
  - **B**, lo stesso campo oscurato (dissolvenza): maxres1, hq1.
  - **C**, primo piano del giocatore vicino che esulta col pugno, pubblico dietro: maxres3, hq3. Dopo il punto la regia stacca su chi l'ha vinto.
- **[OSS] Fotogramma A.**
  - Camera alta dietro il giocatore vicino, sull'asse del campo. Si vede tutto il campo lontano (singolare e doppio) e il singolare vicino; il doppio vicino esce dal quadro verticale.
  - Campo indoor grigio scuro, righe bianche molto contrastate; in fondo pubblico, cartelloni e figure in piedi.
  - Il giocatore vicino è appena dietro la sua riga di fondo, a destra del centro, con la racchetta alta sopra la spalla (fine del gesto). La palla gialla è davanti a lui, con l'ombra a terra ben staccata.
  - Il giocatore lontano è dietro la sua riga di fondo, poco a sinistra, in spostamento laterale.
  - Sotto ogni giocatore c'è una barra verde (energia): piena per il vicino, circa 3/4 per il lontano.
  - In questo quadro **non ci sono** mirino, bersaglio a terra, barra della potenza né nome del colpo.
- **[OSS] Titolo:** uno scambio da fondo «che spacca la palla» tra due giocatori del circuito. La descrizione non dice niente sui comandi.
- **[CALC] Posizione delle righe nel quadro A** (`righe.py`, su 1920 px di altezza):

  | Riga | y (px) |
  |---|---|
  | Fondo lontano | 625 |
  | Servizio lontano | 727 |
  | Base della rete | 883 |
  | Servizio vicino | 1101 |
  | Fondo vicino | 1370 |

  Il singolare è largo 578 px al fondo lontano e 1056 px al fondo vicino.
- **[CALC] Camera stimata** (`camera_fit2.py`, modello stenopeico, scarto 1,4 px):
  - alta circa 10,5 m, circa 21 m dietro la riga di fondo vicina;
  - obiettivo stretto, circa 20° orizzontali sul ritaglio;
  - ipotesi: niente rollio, camera sull'asse, campo regolamentare. Il quadro può essere un ritaglio di un video 16:9, quindi i valori assoluti sono indicativi; i rapporti qui sotto no.
  - Palla a circa 1,1 m di altezza, circa 2 m davanti al giocatore (`palla.py`, supponendo l'ombra verticale sotto la palla): appena colpita.
- **[CALC] Leggibilità nel video.** Sul campo lontano, tra servizio e fondo, 1 m di lato vale 70 px e 1 m di profondità 19 px: la direzione si legge circa **3,7 volte meglio** della profondità. Il campo lontano occupa il 13,5% dell'altezza del quadro, quello vicino il 25%.
- **[VER+CALC] Confronto con la camera della partita del gioco.**
  - Dove sta nel codice: `natpf-tennis/src/game_engine.js:4065` (camera in (x·0,16, 7,8, 22,8), sguardo in (x palla·0,12, 0,35, 1,8)); `natpf_camera.js:43` (`MATCH_CAM`); 45° verticali in 16:9 (`natpf_camera.js:48-56`).
  - Stesso rapporto del riferimento (`confronto_camere.py`): 1 m di lato al fondo lontano vale 36,9 px (1,9% della larghezza), 1 m di profondità 9,6 px (0,9% dell'altezza), cioè 3,9:1.
  - La differenza: campo lontano 13,2% dell'altezza ma campo vicino 36%; la larghezza lontano/vicino è 0,37 contro 0,54 del video.
  - In pratica la camera del gioco è più vicina e grandangolare. Quella del riferimento, più lontana e stretta, dà più spazio al campo dove si mira rispetto a quello vicino.
- **[CALC] Per chi guarda.** Su uno schermo da 65" (largo 1,43 m) visto da 3 m, 1 m di lato al fondo lontano sottende circa 0,5°, 1 m di profondità circa 0,14°. Una palla vera da 6,7 cm sarebbe circa 2,5 px a 1080p sul fondo lontano; non ho verificato la grandezza con cui il gioco disegna la palla.
- **[DED]** Gli angoli si leggono da soli. La profondità si capisce solo da ombra, rimbalzo e segno d'arrivo.

### Video 2 (raccolta di 25 colpi «da applauso» del circuito professionistico)
- **[OSS] Le miniature mostrano solo reazioni:**
  - un giocatore che applaude battendo la mano sulle corde, con il titolo grafico;
  - un giocatore che ride, col pubblico in piedi e il tabellone in un angolo;
  - un giocatore che applaude mentre una palla gli passa davanti;
  - un giocatore che sorride a testa bassa mentre il pubblico applaude.
- **[OSS]** oardefault è un segnaposto e la pagina salvata è un rimando alla verifica anti-bot. Sui colpi non c'è niente da osservare: il §3 è conoscenza generale.
- **[DED] Cosa conta per il gioco.** Il colpo memorabile è quello in cui direzione e momento battono la posizione dell'avversario. Anche la reazione (pubblico, avversario) fa parte della ricompensa.

---

## 2. Come un tennista controlla direzione e profondità, e cosa misura il telefono

### Tennis vero ([CON], numeri da `volo.py`)
- **Angolo della faccia all'impatto: è il fattore principale della direzione.** La palla esce vicina alla perpendicolare delle corde. La traiettoria della racchetta pesa meno (ordine del 10–30%) e dà effetto laterale.

  | Distanza | 1° | 2° | 5° |
  |---|---|---|---|
  | 20 m | 0,35 m | 0,70 m | 1,8 m |
  | 22 m | 0,38 m | 0,77 m | 1,9 m |
  | 24 m | 0,42 m | 0,84 m | 2,1 m |

- **Punto d'impatto: decide l'angolo della faccia.**
  - La racchetta gira attorno al corpo a 1000–2000 °/s. Nei dritti veri il telefono misura 1200–1650 °/s (`natpf_stroke_intent.js:49`, [VER]).
  - Palla presa davanti al corpo: la faccia è già girata verso la diagonale, quindi incrociato.
  - Palla presa accanto o dietro: la faccia è ancora aperta verso l'esterno, quindi lungolinea o fuori di lato.
  - A 1500 °/s, 2 ms di differenza valgono 3° (1,1 m a 22 m) e 5 ms valgono 7,5° (2,9 m). Chi gioca bene trasforma il tempo in spazio: piedi, preparazione, palla presa davanti.
- **Traiettoria della racchetta:** dall'interno verso l'esterno (inside-out, lungolinea) oppure attraverso il corpo (incrociato, più effetto, angolo corto).
- **Busto:** girato presto prepara il colpo e nasconde la direzione.
- **Polso:** tenuto fermo nella zona d'impatto dà una faccia stabile; se chiude, dà l'incrociato stretto con molto effetto.
- **Profondità.** Atterraggio a 22 m dal punto d'impatto, cioè 2,8 m dentro la riga di fondo:

  | Colpo | Altezza sopra la rete | Profondità per 1° di angolo verticale |
  |---|---|---|
  | Piatto 126 km/h | 1,38 m | ±1,5 m |
  | Top spin 108 km/h, 2500 giri/min | 1,97 m | ±1,0 m |
  | Top spin carico 97 km/h, 3500 giri/min | 2,40 m | ±0,8 m |
  | Tagliato 90 km/h | 1,99 m | ±0,9 m |

  La profondità si governa con l'altezza sopra la rete e con l'effetto, lasciando 1–2 m di margine dalla riga di fondo. Le righe laterali si cercano in modo più fine.
- **Angolo corto:** giro forte, molta salita, meno velocità, palla presa davanti. Atterra davanti alla riga del servizio, vicino alla laterale.

### Cosa misura il telefono ([VER])
- **Orientamento:** dal giroscopio, corretto con la gravità. L'imbardata non ha un riferimento assoluto e deriva; la posa «pronto» segue il telefono quando sta fermo (`site/js/tennis/face-tracker.js:5-9, 126`).
- **Piatto all'impatto:** imbardata, apertura e rotazione (`face-tracker.js:10-12, 154-171`).
  - La direzione `abs` si misura rispetto alla posa della calibrazione e comprende polso e corpo girati prima del colpo (`face-tracker.js:168-170`).
  - Il piatto è letto all'istante del picco, interpolando campioni a 60 Hz che a 1000 °/s distano 16° (`face-tracker.js:173-174`).
- **Forza, ampiezza, verso (dritto o rovescio) e forma:** piano dello swing, salita della testa, rotazione sul manico, inclinazione, velocità di testa e mano (`swing-message.js:3-8, 51`).
- **Istante del picco:** il gioco lo confronta con l'arrivo della palla per anticipo e ritardo (finestra `IMPACT` in `natpf_stroke_outcome.js:491-499`).
- **Cosa il telefono non misura:**
  - la posizione della mano rispetto al corpo;
  - i piedi;
  - la traiettoria lineare della racchetta: durante lo swing l'accelerometro vede soprattutto la forza centripeta (`face-tracker.js:142-143`).
- **Il punto d'impatto lo ricava il gioco:**
  - palla davanti o dietro: `contactAhead` 0,35 m e `lateBehind` 1,4 m (`natpf_stroke_outcome.js:496-497`);
  - allungo: `reachQuality` (`natpf_skill.js:390`);
  - altezza: `contactY`.
- **Cosa usa oggi la direzione dei colpi da fondo:** solo piatto e tempo.
  - Il verso orizzontale dello swing entra solo nel servizio (`natpf_stroke_outcome.js:567, 627`).
  - L'apertura del piatto entra solo nel ramo dei telefoni senza forma (`natpf_phone_racket.js:83-89, 264`), non nell'esito principale (`natpf_stroke_intent.js:212-233`).
- **[DED]** Il piatto viene letto proprio quando ruota più in fretta: pochi millisecondi di errore sull'istante del picco valgono qualche grado.

---

## 3. Colpi «da applauso» e prima fase ([CON])

**Dentro** significa: rientra nella nuova mappa di direzione.

| Colpo | Come nasce | Atterraggio | Prima fase |
|---|---|---|---|
| Passante lungolinea | da fondo, teso lungo la riga contro chi è a rete | lungolinea medio o profondo | dentro, se l'avversario è a rete |
| Passante incrociato stretto | molto effetto, palla ai piedi che esce di lato | incrociato stretto corto | dentro |
| Angolo corto incrociato | giro forte, salita forte, meno velocità | 4,5–7 m dalla rete, vicino alla laterale | dentro |
| Dritto inside-out | dal lato del rovescio, dritto in diagonale | profondo incrociato rispetto a chi colpisce | dentro |
| Dritto inside-in | dal lato del rovescio, dritto lungo la riga | lungolinea | dentro |
| Cambio lungolinea (rovescio o dritto) | dopo una serie di diagonali | lungolinea profondo | dentro |
| Contropiede | palla dietro all'avversario che corre | dove l'avversario era | dentro (nasce da direzione e momento) |
| Vincente in corsa o in allungo | da fuori posizione | qualunque, con meno controllo | dentro, con più dispersione |
| Risposta vincente | sulle righe | lungolinea o incrociato | dentro, come colpo da fondo |
| Difesa in top spin alto | palla alta e carica | centro profondo | dentro |
| Pallonetto | sopra chi è a rete | profondo | lasciato com'è (esiste già: `natpf_stroke_intent.js:119-122`) |
| Palla corta, volée, demi-volée | | | **fuori** (richiesta dell'utente) |
| Tra le gambe, dietro la schiena, intorno al palo | | | **fuori** (non leggibili col telefono, rari) |
| Servizio vincente, schiacciata | | | lasciati com'è. Oggi il servizio ha una regola sua e niente falli (`natpf_stroke_outcome.js:559-560, 620-640`) |

---

## 4. Come i giochi rendono la direzione centrale (senza nominarli, [CON])

- **Mira più tempo (giochi con levetta).**
  - La levetta durante la preparazione sceglie dove mandare la palla. Il tempo decide quanto ci si arriva: perfetto = dove si mirava; anticipo = tirata verso l'incrociato; ritardo = spinta verso l'esterno.
  - Il tasto sceglie il tipo di colpo. Tenerlo premuto carica la potenza.
  - Il rischio nasce dalla combinazione: potenza, mira vicino alla riga e tempo sbagliato.
- **Giochi simulativi.** Colpo di precisione con un cursore e rilascio a tempo, finestra stretta. Equilibrio, posizione dei piedi e stamina aumentano la dispersione.
- **Giochi con controller di movimento.**
  - Prima generazione (solo accelerometro): direzione dal tempo dello swing.
  - Seconda generazione (con giroscopio): conta anche l'angolo della racchetta all'impatto.
  - In entrambe: la forma dello swing decide l'effetto, la velocità decide la potenza, il movimento del personaggio è automatico.
- **Realtà virtuale.** Fisica 1:1 di racchetta e palla, con aiuti dichiarati e leggeri.
- **Cosa fa sentire il controllo:**
  1. un segno d'arrivo immediato;
  2. una scritta che dice il perché del risultato;
  3. poche famiglie di colpi che si distinguono a vista;
  4. tutto il campo avversario sempre visibile;
  5. stesso input, stesso colpo;
  6. un suono diverso per il colpo pieno;
  7. moviole dei vincenti e mappa dei colpi a fine partita.
- **Cosa li rende prevedibili:** una mappa monotona (più si gira, più angolo) e stabile; un errore con un verso preciso, non casuale; cause che si vedono; un riferimento fisso.
- **Cosa li rende troppo assistiti:**
  - la palla va quasi sempre in campo;
  - molti input diversi finiscono nello stesso punto («calamita»);
  - la direzione verso il campo libero la sceglie il gioco;
  - errori a caso.

  Il risultato è che chi gioca smette di sentire che la palla viene da lui.

---

## 5. Requisiti per un gioco con il telefono come racchetta (in ordine di importanza)

### R1 · Stesso gesto, stesso punto, anche al colpo 40
- **Requisito.** L'esito resta deterministico (lo è già). La mappa deve restare la stessa per tutta la partita: lo stesso gesto ripetuto al colpo 5 e al colpo 45, e una mira tenuta per dieci colpi, cadono entro 0,5 m. Nessun riferimento deve imparare dai colpi mirati. Non ci devono essere salti: gesti vicini danno esiti vicini.
- **[VER] Oggi c'è già:** nei colpi da fondo non c'è caso; il seme vale solo per i colpi controllati a rete (`natpf_stroke_outcome.js:155-164, 336`).
- **[VER] Ma tre riferimenti si adattano durante la partita:**
  - **Centro della mira per verso** (`natpf_gestures.js:159-213`). Il codice stesso dice che «mira tenuta e riferimento sbagliato non si distinguono se non da quanto durano: qui si sceglie il riferimento che si corregge» (`natpf_gestures.js:145-146`). B35a ha ridotto il problema solo con il centro che viene dagli scambi di prova (`natpf_gestures.js:148-160`).
  - **Ritmo** (`natpf_stroke_outcome.js:223-268`; il motore lo usa e lo aggiorna in `game_engine.js:2349-2352`).
  - **Colpo tipico per la forza**: ultimi 24 colpi (`natpf_phone_racket.js:138-149`).
- **[VER+CALC] Il ritmo annulla il tempo usato come comando** (`ritmo.mjs`). Un anticipo tenuto apposta (+0,8 finestre, piatto 0°) dà x −2,99 m per 4 colpi, poi −1,02 m dal quinto in avanti: l'incrociato fatto col tempo torna al centro.
- **[DED]** Servono riferimenti fermi durante il game. Correzioni ammesse: la deriva comune di dritto e rovescio insieme, oppure una ricalibrazione esplicita.
- **Misura:** il banco `scripts/audit/direzione-telefono.mjs --serie` (B35a), esteso a ritmo e forza.

### R2 · La direzione la decide il gesto scelto; il tempo pesa meno
- **[VER] Oggi:**
  - mira = spinta naturale 0,1 + tempo × 1 + piatto × 1 (`natpf_stroke_outcome.js:24, 27, 36, 354-355`);
  - piatto alla mira piena a 17° (`natpf_stroke_intent.js:53-62, 185, 196-201`; percorso del piatto in `natpf_phone_racket.js:260, 263`).
- **[CALC] Mappa di oggi** (`mappa-oggi.mjs`; Pro, da fermo, dritto del destro dal centro, ritmo 0; x in metri, + a destra di chi colpisce):

  | Piatto | x | Profondità |
  |---|---|---|
  | 0° / ±3° | −0,36 (spinta naturale) | 9,5 |
  | +8° | +0,94 | |
  | +12° | +1,98 | |
  | +17° | +3,28 | |
  | −12° | −2,71 | 9,3 |
  | −17° e oltre | −3,79 | 7,7 |

  - La sensibilità è 0,26 m per grado, contro 0,38 del tennis vero.
  - Col solo tempo: ±0,5 finestre spostano la palla tra +1,6 e −2,0 m.
- **[CALC] Matrice voluto → ottenuto** (`separabilita.mjs`, finestra 0,15 s in anticipo e 0,078 s in ritardo). Il gesto buono ha piatto ±5° e tempo ±0,25; la persona vera ha piatto ±12° e tempo +0,35 ±0,45 (come nel banco B35a). Ogni cella dice quale percentuale dei colpi voluti incrociati / al centro / lungolinea finisce nella zona voluta.

  | Parametri | Gesto buono (I/c/L) | Media giusti | Persona vera (I/c/L) | Media giusti | Fuori (persona vera) |
  |---|---|---|---|---|---|
  | Oggi | 82/69/70% | 73% | 82/31/41% | 51% | 2,5% |
  | Peso del tempo 0,35 | 87/85/73% | 82% | 73/43/55% | 57% | 1,2% |
  | Peso del tempo 0,35, mira piena a 25°, gesto a ±18° | 97/93/86% | 92% | 84/55/59% | 66% | 0,9% |

  - La riga «oggi» coincide con il banco B35a (73% e 49–52%), che dà credito alla prova semplificata.
  - Per le varianti ho passato i parametri come ingressi; nessun file cambiato.
  - **[DED]** La terza variante suppone che una persona giri il telefono di 18° con lo stesso rumore: è un'ipotesi da misurare con una sessione vera (prova guidata B35a, `diag.mjs direzione`).
- **Requisito.**
  - Il piatto (più, eventualmente, il verso dello swing) è il comando principale.
  - Il tempo dentro la finestra è solo un ritocco (circa 25–35% della mezza larghezza). Oltre la finestra diventa un errore con un verso preciso (tirata o spinta), con la causa scritta.
  - Vantaggio in più: il ritardo dello schermo, causa 3 del B35a, conta meno.
  - Obiettivo: almeno l'85% di colpi giusti col gesto buono e almeno il 65% con la persona vera. Col gesto buono, 0% di fuori a Pro, 1v1 e Casual.

### R3 · Una misura della direzione che si ripete
- **[DED]** Misurare la ripetibilità vera (deviazione standard in gradi per ogni colpo voluto) su sessioni con un telefono vero, poi tarare la mira piena a 2–2,5 volte quel valore.
- **[DED] Misure da combinare, più stabili del piatto letto all'istante di rotazione massima:**
  - la posa prima del colpo, già dentro `abs`;
  - il verso orizzontale dello swing, come già nel servizio;
  - il piatto mediato su pochi millisecondi attorno al picco.

### R4 · Campo aperto davvero: zone per tarare, misurare e premiare (non calamite)
- **Zone**, specchiate per il rovescio e per i mancini. Incrociato o lungolinea dipendono da dove colpisce chi gioca e dal verso del colpo (`contact`, `natpf_stroke_outcome.js:292-296`):

  | Zona | Laterale | Profondità dalla rete |
  |---|---|---|
  | Profondo d'angolo (incrociato o lungolinea) | 1,4–3,7 m dal centro | ≥ 9 m |
  | Angolo corto | ≥ 2,6 m, lato incrociato | 4,5–7 m |
  | Centro profondo | ≤ 1,2 m | ≥ 9,5 m |
  | Inside-out / inside-in | come incrociato e lungolinea, ma con chi colpisce dal lato del proprio rovescio | |
  | Corpo | entro 0,8 m dall'avversario | |
  | Metà campo (non è un bersaglio: è il colpo debole) | ≤ 2,6 m | 6,4–8,5 m |
  | Fascia della riga (premio per la precisione) | entro 0,5 m dalle righe | |

- **[VER+CALC] Oggi** (`raggiungibile.mjs`, tutte le combinazioni di piatto ±25°, forza 0–1 e tempo nella finestra, da tre posizioni):
  - tutta la larghezza è raggiungibile tra 6 e 11,9 m;
  - la fascia 3–6 m quasi mai (9‰ solo all'angolo estremo);
  - c'è un **accumulo**: l'85‰ delle combinazioni finisce nella cella x −4 m, 7–8 m, e 30–37‰ per riga nella colonna x +4;
  - oltre i 17° di piatto il colpo è identico, perché la mira del piatto si ferma a 1 (`natpf_stroke_intent.js:199-200`) e l'aiuto la tiene al bordo (`natpf_stroke_outcome.js:56-57, 357`);
  - l'incrociato pieno cade corto per regola (`natpf_stroke_outcome.js:64-67, 373`). Con forza 0,5 il profondo incrociato arriva al massimo a x −2,7 m e 9,3 m: l'angolo profondo vero non si raggiunge.
- **Requisito.**
  - Ogni zona deve essere raggiungibile dal centro e dai due angoli, sia di dritto sia di rovescio.
  - L'angolo corto deve essere una scelta (giro forte con salita forte e forza media), non l'effetto automatico del giro massimo.
  - Il profondo d'angolo deve essere raggiungibile.

### R5 · Rischio e ricompensa vicino alle righe, senza fuori inspiegabili
- **[VER] Oggi** l'aiuto tiene dentro qualunque mira, se il colpo è pulito (`natpf_stroke_outcome.js:13-15, 338, 357, 374`). La palla esce solo con il tempo oltre la finestra o in situazioni difficili (`natpf_stroke_outcome.js:193-216`).
- **[DED]** Così mirare oltre la riga non costa niente, e la precisione non viene premiata.
- **Requisito.**
  - Una zona sicura dichiarata (la palla resta dentro fino a 0,5–0,8 m dalle righe).
  - Oltre quella zona, la probabilità di fuori cresce con quanto si va oltre, con la forza e con l'errore di tempo.
  - La scritta dà sempre la causa: «troppo angolato», «troppo forte», «in anticipo».
  - I livelli cambiano la zona sicura e la finestra del tempo, non il campo raggiungibile (principio già scritto nel codice: `natpf_stroke_outcome.js:186-188`).

### R6 · Profondità controllabile, separata dalla direzione
- **[VER] Oggi:**
  - profondità voluta = forza × (0,8 + 0,2 × ampiezza) (`natpf_stroke_intent.js:228-229`);
  - curva 0,7 e intervalli per tipo di colpo (`natpf_stroke_outcome.js:54-56, 363-374`).
  - [CALC] Top spin dal centro: forza 0,2 → 7,9 m; 0,5 → 9,5 m; 0,95 → 11,3 m. Col piatto a −17°: 6,9 / 7,7 / 8,8 m.
- **Requisito.**
  - Tre livelli che si distinguono a vista (metà campo, profondo, sulla riga), decisi dalla forza rispetto al proprio colpo tipico e dalla salita (più salita = più alta e più sicura, come nel tennis vero).
  - Stessa scala di profondità in ogni direzione, tranne l'angolo corto scelto.
  - L'apertura del piatto può essere al massimo un ritocco, dopo averla misurata.

### R7 · Varietà coerente con il gesto
- **[VER] Oggi:** il tipo di colpo si legge dalla forma, con margini e con i gesti personali di chi gioca (`natpf_stroke_intent.js:107-145, 162-174`).
- **Requisito.**
  - Ogni tipo ha un arco riconoscibile: top spin alto e carico; piatto teso, con zona sicura più stretta; tagliato basso e più corto.
  - Vicino alle soglie tra due tipi resta il colpo normale, senza salti di traiettoria.
  - Palla corta e volée restano come sono e non entrano nella nuova mappa.

### R8 · Punto d'impatto e situazione: cambiano qualità e rischio, non la mappa
- **[VER] Oggi:** tempo, allungo, corsa e preparazione formano `quality`, che toglie aiuto e profondità (`natpf_stroke_outcome.js:329-338`). La palla alta passa più bassa (`natpf_stroke_outcome.js:372, 378`).
- **Requisito.**
  - Palla presa davanti e a tempo: più angolo e più velocità.
  - In allungo o in corsa: stessa direzione media, ma più dispersione.
  - Palla alta: il piatto rende di più.
- **Dispersione che resta** (target [DED]): da fermo con il gesto buono, deviazione laterale ≤ 0,9 m (oggi 1,2–1,3 m); in corsa fino a 1,5–2 m. Deve dipendere solo da misura del telefono, esecuzione e rischio, mai dal caso.

### R9 · Segnali a schermo
- **[VER] Oggi ci sono:**
  - l'anello d'arrivo previsto, colorato (`natpf_shot_feedback.js:1-8, 31`);
  - le scritte con il perché (`natpf_shot_feedback.js:53`);
  - la moviola.
  - La scia della palla è stata tolta su richiesta dell'utente (B35b).
- **Requisito.**
  - (a) Nome della zona quando viene centrata («Lungolinea!», «Angolo!») e vincenti per zona a fine partita, come statistiche positive.
  - (b) Un «fantasma» discreto della mira quando il tempo tira o spinge la palla, così si capisce perché è andata altrove.
  - (c) Da provare solo in allenamento e tutorial: un mirino sul campo avversario che segue il telefono durante la preparazione.
  - (d) Da valutare: una camera più lontana e stretta, come nel riferimento, rispettando l'adattamento a ledwall e schermi stretti (`natpf_camera.js:28-56`).
  - (e) La stessa zona scritta anche sul telefono.
- Le dimostrazioni del tutorial devono restare uguali all'algoritmo: oggi usano 22° di giro e «colpisci un attimo prima/dopo» (`natpf_gesture_motion.js:111, 113`; `natpf_training.js:30-31`). Se il peso del tempo cambia, vanno rifatte.

### R10 · La direzione deve vincere i punti
- **[VER] Oggi** la CPU sbaglia soprattutto quando è in allungo o in corsa:
  - Casual: stretch 0,24, corsa 0,1, angolo 0,5 (`natpf_skill.js:51`);
  - Pro: stretch 0,045, corsa 0,022, angolo 0 (`natpf_skill.js:76`).
- **Requisito misurabile** nei banchi (rally-balance, variety, legend): la probabilità di vincere il punto deve crescere con la distanza dell'atterraggio dall'avversario e con la profondità più che con la velocità.

### R11 · Cose da preservare
- Simmetria destro/mancino e dritto/rovescio (la matrice B35a la misura già).
- Webcam e mouse: non hanno il piatto, quindi serve una via con tempo o punto mirato.
- LAN e stesso schermo.
- Impronte delle partite simulate come controllo di regressione.
- Esclusioni della prima fase: palla corta, volée, colpi acrobatici, intorno al palo. Servizio e schiacciata invariati.

---

## 6. Limiti e decisioni da prendere
- **Video:** non li ho visti, solo le miniature. Per vedere i comandi del gioco servono i file o qualche schermata dall'utente. Il quadro A basta per la camera.
- **Numeri del §5:** vengono da regole vere in una prova semplificata (dal centro, ritmo 0, qualità 1). Vanno rifatti con il banco B35a e soprattutto con un telefono vero.
- **Decisioni per l'utente:**
  - quanto deve pesare il tempo (oggi pesa quanto il piatto);
  - mirino solo in allenamento o anche in partita;
  - cambiare o no la camera;
  - fuori «da ambizione» oltre la zona sicura (R5).
