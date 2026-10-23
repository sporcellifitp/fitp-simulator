# Diagnosi della partita del 23/10 e piano di lavoro (telefono, webcam, campo aperto, ritmo, Android)

Documento di lavoro della richiesta del 23/10: prima l'analisi, poi le correzioni, una alla volta e misurate. Le
correzioni e i risultati sono in fondo (§7) e in `WORKLOG.md`. Regola di marchio: niente nomi di giochi, marche o
strumenti esterni; i dispositivi si chiamano per ruolo («il telefono Android della prova», «il portatile con la webcam
integrata»).

Livelli di certezza usati sotto: **[verificato]** letto nei dati o visto nel video; **[codice]** letto nel codice;
**[ipotesi]** non verificabile con il materiale ricevuto.

## 1. Materiale ricevuto e cosa si è potuto leggere

| Allegato | Contenuto | Letto |
|---|---|---|
| `eventi.jsonl` | 8699 eventi della sessione `20261023-080003-5tag`, 173,8 s | tutto |
| `metriche.json` | metriche calcolate a fine sessione | tutto |
| `sessione.json` | dati della sessione, file prodotti | tutto |
| `rapporto.html` | rapporto: contiene gli stessi eventi e le stesse metriche, nessun campione grezzo | tutto |
| video `.mp4` (1280×720, 30 fps, 179,6 s) | registrazione dello schermo del gioco con un riquadro della webcam (persona seduta con il telefono) | fotogrammi ogni 5–10 s, sequenze a 10 fps in 6 episodi |

**Mancano** (dichiarati alla persona che ha fatto la prova):

- il **video dell'impugnatura** desiderata: c'è un solo video, quello della partita. Nel riquadro si vede il telefono in
  verticale nella mano destra; da che parte guardi il display si capisce solo in un tratto (129–130 s e 157,9–158,6 s
  del registro: il display guarda la webcam, cioè in avanti). Altrove la risoluzione del riquadro non basta;
- `telefono-sensori.jsonl` (10 424 campioni del telefono, 1,1 MB): senza i campioni grezzi non si possono far ripassare i
  gesti nel rilevatore né spiegare i gesti che il telefono non ha mandato (§3, T5);
- `video-gioco.mp4` (registrazione del gioco fatta dalla diagnostica): non serve, c'è il video dello schermo.

Allineamento video ↔ registro: **video = registro + 9,35 s (±0,1 s)** [verificato su due eventi: il servizio delle
22,97 s compare a 32,35 s del video, la scritta «gesto ignorato» delle 23,98 s a 33,3 s].

Sessione [verificato]: livello Leggenda, mano destra, presa «upright», collegamento LAN, chi gioca è seduto.
Riscaldamento col lanciapalle (0–43 s, 5 punti) e partita (43–165 s: 17 punti, 7 vinti). Computer (dal registro):
Windows, browser Chromium 155, 8 processori logici, GPU integrata, schermo 1536×864 a 1,25. Il modello e la generazione
del portatile e le caratteristiche della webcam non sono nel registro e non si deducono.

**Webcam**: in questa sessione non è stata usata come controllo (la diagnostica dice «video della webcam non registrato:
Device in use», cioè la webcam era occupata dal programma che registrava lo schermo). **Non ci sono dati della webcam**:
la diagnosi della webcam (§5) viene dal codice e va misurata con una sessione nuova.

## 2. Catena del telefono: tempi misurati [verificato]

| Tratto | Misura (n = 81 colpi) | Giudizio |
|---|---|---|
| Sensori del telefono | 59,9 Hz mediana, intervallo p95 16,9 ms, nessun buco oltre 50 ms | regolare |
| Riconoscimento (picco → invio) | p50 31 ms, p90 39, p99 49 | corretto |
| Attesa «preparazione» sul telefono | 0 ms in 77 colpi; 217–250 ms in 4 gesti deboli trattenuti | vedi T1 |
| Consegna in LAN | p50 6 ms, p90 9,4, p99 17,7 | ottima |
| Totale picco → computer | p50 38 ms, p90 47, p99 298 (i 4 gesti trattenuti) | non è un problema |
| Orologio telefono/computer | viaggio p50 9 ms, p99 42, max 104; deriva 11,9 ppm, residuo 0,8 ms | allineato |
| Gioco | 60 fps mediana; aggiornamento p95 0,8 ms, disegno p95 3,3 ms; nessun compito lungo | vedi R1 |

Conclusione: dal picco del gesto al computer passano circa 40 ms; la rete in LAN non è la causa. I problemi sono **quale
movimento** viene preso per il colpo e **quando** il gioco fa colpire la palla, non il ritardo.

## 3. Telefono: problemi trovati

### T1. La calibrazione rapida ha preso un dritto da 143 °/s: soglie al livello del rumore

- **Sintomo**: colpi partiti da movimenti minimi; palle corte non volute.
- **Evidenza [verificato]**: profilo della calibrazione: dritto tipico 143 °/s, ampiezza 19°, 133 ms; rovescio tipico
  1105 °/s. In partita i dritti forti hanno mediana 1005 °/s (17 colpi oltre 600 °/s) e i rovesci 962 °/s: il dritto di
  calibrazione era 7 volte più debole dei dritti veri. Soglie in partita: inizio 40 °/s, picco minimo 50 °/s, ampiezza
  minima 4,75° (dritto). Dei 81 gesti accettati, **28 sono sotto 200 °/s** (14 nel lancio del servizio, 12 nello
  scambio), con ampiezze di 3–32°.
- **Causa [codice]**: `calibration.js`: nel percorso rapido un gesto è valido da 40 °/s (`minimum`), senza confronto tra
  i due versi; le soglie del profilo sono frazioni del gesto più debole (`base = min(medL, medR)`), con un minimo legato
  al solo rumore. `swing-detect.js` `thr()` prende il minimo dei picchi degli esempi. Un gesto di calibrazione piccolo
  rende il telefono sensibile come un sismografo per tutta la partita.
- **Correzione**: (1) in calibrazione un gesto vale come colpo solo da un minimo assoluto e se non è molto più debole
  dell'altro verso (altrimenti «più deciso»); (2) in partita un pavimento assoluto di velocità e ampiezza che una
  calibrazione sbagliata non abbassa; (3) il colpo tipico per verso si aggiorna con i colpi veri della partita (mediana
  degli ultimi), così una calibrazione storta si corregge da sola in pochi colpi.
- **Verifica**: test del rilevatore con il profilo del 23/10 e i gesti piccoli della sessione (scartati) e quelli veri
  (accettati); test della calibrazione con un primo gesto piccolo.

### T2. La preparazione giocata come colpo, il colpo vero scartato

- **Sintomo**: colpi «troppo presto», palle corte o fuori, e subito dopo «gesto ignorato: palla che si allontana».
- **Evidenza [verificato]**: 10 gesti scartati con «palla che si allontana»; 7 sono colpi veri da 808–1269 °/s arrivati
  0,16–0,45 s dopo un gesto debole (71–286 °/s) che il gioco aveva già giocato. Nel video:
  - **episodio A** (registro 65,97–66,46 s, video 75,3–75,8 s): la mano è ancora ferma davanti alla pancia quando parte
    il gesto da 71 °/s (13°), letto come palla corta e tenuto in attesa; la palla arriva, parte la palla corta
    «molto in anticipo» che esce di lato (punto perso «fuori»); il braccio parte davvero 0,3 s dopo (1246 °/s, 168°) e il
    colpo è scartato;
  - **episodio B** (129,15–129,48 s, video 138,5–138,8 s): stesso schema, 172 °/s (28°) giocato come palla corta, il
    colpo vero da 1176 °/s arriva 40 ms dopo il contatto ed è scartato;
  - stesso schema ai colpi 75/76, 95/96 (schiacciata da un gesto da 134 °/s), 111/112 e nel servizio 82/83 (servizio
    battuto da un gesto da 175 °/s, la battuta vera 0,4 s dopo scartata).
  Altri 4 gesti deboli (55–184 °/s) hanno fatto un colpo a vuoto «molto in anticipo» 0,5–1 s prima della palla, con il
  personaggio che colpisce l'aria.
- **Causa [codice]**: `natpf_impact.js` `resolvePending`: lo swing in attesa si gioca nell'istante in cui la palla
  arriva al punto d'impatto. Il colpo più forte sostituisce quello in attesa solo se arriva **prima** di quell'istante;
  nei casi visti arriva da 10 a 300 ms dopo (nell'episodio B 40 ms dopo). Con T1 i gesti deboli sono tantissimi.
- **Correzione**: (1) T1 toglie la maggior parte dei gesti deboli all'origine; (2) sul computer un gesto in attesa
  debole rispetto al proprio colpo tipico non si gioca subito all'arrivo della palla: si aspetta per un tempo breve dentro
  la finestra del ritardo; se arriva il colpo vero si gioca quello (con il suo tempo vero), altrimenti il gesto debole;
  (3) un gesto debole molto in anticipo non fa più il colpo a vuoto a schermo.
- **Verifica**: test con gli episodi A, B e 111/112 ricostruiti dal registro (palla, tempi e gesti veri): prima si gioca
  il gesto debole, dopo il colpo vero.

### T3. Palle corte dai micro-movimenti

- **Evidenza [verificato]**: 14 gesti letti come palla corta; 12 sono sotto 200 °/s (8 nel lancio del servizio, dove non
  contano, e 4 nello scambio). Due palle corte giocate nello scambio vengono da gesti di 71 e 172 °/s.
- **Causa [codice]**: `natpf_stroke_intent.js` `classifyStroke`: «dall'alto in basso» + «morbido» = palla corta. Un
  micro-movimento che scende un poco soddisfa entrambe le condizioni.
- **Correzione**: T1 e T2; in più la palla corta chiede un gesto vero (ampiezza e velocità minime) e non solo morbido.

### T4. Pallonetto da un dritto normale

- **Evidenza [verificato]**: colpo 64 (1005 °/s, 107°): piano 0,65, salita 0,63 → pallonetto. Il punto è finito in rete.
- **Causa [codice]**: pallonetto con la testa che sale oltre 0,55 e `|piano| ≤ 0,8`, cioè con il piano dello swing
  inclinato anche solo di 37° sull'orizzontale: un dritto in top spin dal basso verso l'alto ci rientra.
- **Correzione**: pallonetto solo con swing nettamente verticale e salita decisa, oppure gesto morbido in salita;
  il dritto in salita resta top spin.

### T5. Gesti che il telefono non ha mandato

- **Evidenza [verificato]**: 5 dei 10 punti persi sono palle della CPU passate senza alcun gesto registrato. In due
  (registro 60,15–60,6 s e 158,0–158,7 s, video 69,5 s e 167,4–168,1 s) il video mostra il braccio che va indietro e poi
  avanti, ma **0,2–0,3 s dopo il rimbalzo**, mentre il gioco aveva fissato l'impatto 0,1 s dopo il rimbalzo (§4, C1).
- **Causa**: perché il telefono non abbia mandato nulla non si può dire senza i campioni grezzi [ipotesi: rilevatore
  rimasto in «rientro» dopo il colpo precedente con il braccio teso che trema; gesto scartato come preparazione]. Il
  ritardo rispetto al gioco invece è verificato e dipende da C1.
- **Correzione**: il telefono manda al computer anche i gesti scartati, con il motivo (pochi al secondo, solo per la
  diagnostica), così la prossima sessione lo dice; C1 sposta l'impatto dove chi gioca se lo aspetta.

### T6. Mira dal piatto satura e instabile

- **Evidenza [verificato]**: 67 gesti con la mira dal piatto; 26 sono saturi (|mira| ≥ 0,9). In 11 rovesci su 17 il piatto
  ha inclinazione −90° (misura degenere: il dorso guarda in basso). Con mira satura il piatto aggiunge ±0,32 alla mira
  del colpo, cioè fino a 1,2 m di lato, da una misura non affidabile.
- **Causa [codice]**: `face-tracker.js` prende come piatto il dorso del telefono (−z), pensato per la presa con il display
  verso chi gioca all'impatto. Con altre prese (display di lato, display in avanti) l'imbardata resta valida rispetto
  alla posa di partenza, l'inclinazione no.
- **Correzione**: la mira dal piatto pesa solo se la misura è credibile (non satura, non degenere, coerente con il
  verso del gesto), con peso minore del tempo; con l'impugnatura di taglio il piatto si legge dall'asse giusto del
  telefono (§3, T7).

### T7. Impugnatura di taglio (richiesta)

- **Richiesta**: telefono di taglio rispetto al corpo, ruotato di circa 90° rispetto alla posizione con il display verso
  di sé, palmo sui lati lunghi, display verso destra o verso sinistra.
- **Stato del codice [codice]**: verso del colpo (dritto/rovescio), piano, salita della testa, inclinazione del manico e
  rotazione sul manico si misurano già rispetto alla gravità (`stroke-shape.js`, `aroundVertical`, `netTurn`): non
  dipendono da quale faccia del telefono guarda dove. Dipendono dalla presa: l'inclinazione del piatto (`face-tracker.js`,
  normale del dorso), il controllo «telefono in verticale» della calibrazione estesa e le istruzioni a schermo («schermo
  verso il palmo», «il dorso guarda la rete»).
- **Correzione**: il piatto è l'asse del telefono che a riposo è orizzontale e perpendicolare al lato lungo verso cui il
  display non guarda; display a destra e a sinistra danno lo stesso significato allo swing; istruzioni nuove con
  l'impugnatura di taglio; nessun obbligo di verticalità perfetta.
- **Da confermare con il video dell'impugnatura**: se il lato lungo del telefono è verticale (testa della racchetta in
  alto) o in avanti lungo l'avambraccio. Il codice deve funzionare in tutti e due i casi; la prova fisica lo conferma.

## 4. Campo aperto e ritmo: problemi trovati

### C1. Si colpisce la palla appena dopo il rimbalzo, a 0,5 m mentre sale

- **Evidenza [verificato]**: tutti i 33 piani d'intercetto «dopo il rimbalzo» hanno l'impatto a 0,50–0,54 m, cioè sul
  limite basso dell'altezza comoda; il contatto avviene in mediana 0,12 s dopo il rimbalzo (36 casi, p75 0,23 s). Nel
  video (episodi dei punti persi) chi gioca fa il gesto 0,2–0,3 s dopo il rimbalzo.
- **Causa [codice]**: con la fisica del motore una palla della CPU (19–29 m/s) dopo il rimbalzo sale solo a 0,6–0,95 m e
  il suo colmo è a 12–18 m dalla rete, dietro la posizione più arretrata permessa (13,4 m): il piano d'intercetto non
  trova il punto comodo in discesa e prende il primo punto oltre 0,5 m, in salita (`planPlayerIntercept`). Rimbalzo
  0,77, attrito 0,86, top spin che aggiunge gravità.
- **Correzione**: la palla dopo il rimbalzo sale di più e rallenta (rimbalzo più alto, contatto vicino al colmo o in
  discesa); chi gioca può stare un poco più dietro quando serve. Un solo gruppo di parametri, misurato prima e dopo.

### C2. Il tempo tra un colpo e l'altro è corto

- **Evidenza [verificato]**: dal colpo della CPU al proprio contatto mediana 1,25 s (minimo 1,00); dal proprio colpo a
  quello della CPU 1,04 s; velocità della palla dopo il colpo: propria mediana 21,7 m/s (fino a 38), della CPU 19,3 m/s
  (fino a 33,5). I punti persi senza gesto sono tutti su palle della CPU a 21–30 m/s lungo il campo.
- **Ipotesi da verificare**: il riferimento dà più tempo. Dal materiale ricevuto non si misura il riferimento; si misura
  il nostro gioco prima e dopo, e la prova fisica dice se il ritmo è giusto.
- **Correzione**: ritmo come parametro unico (tempo di volo dei colpi nello scambio), alzato con misura; la CPU non deve
  guadagnarne: i suoi tempi di reazione e di corsa restano limitati (C5).

### C3. Direzione: lungolinea corto, incrociato quasi sempre

- **Evidenza [verificato]**: dritti nello scambio da −3,3 a +1,7 m (incrociato a sinistra, lungolinea a destra): il
  lungolinea non va mai oltre 1,7 m dal centro (la riga è a 4,1 m). Tempo dei colpi giocati: più spesso in anticipo
  (anche per T2), quindi incrociato. Contributo del piatto: ±0,32 di mira in 19 colpi su 29, spesso da una misura
  saturata (T6). Esempio: colpi 109 e 110, tempo perfetto, piatto saturo a +0,95/+0,99 → +1,2/+1,6 m.
- **Causa [codice]**: a Leggenda `xMax` 3,1 m (mira piena a 1 m dentro la riga) e il tempo sposta la mira al massimo di
  0,58; spinta naturale verso l'incrociato −0,15; il punto neutro segue la palla (0,4 × posizione). Il lungolinea pieno
  chiede tempo in ritardo e piatto insieme.
- **Correzione**: stessa ampiezza del campo a tutti i livelli (il livello cambia la precisione chiesta, non dove si può
  mandare la palla); il tempo dentro la finestra copre da una riga all'altra; il piatto corregge poco e solo se credibile;
  centro voluto possibile con il tempo giusto.

### C4. Profondità

- **Evidenza [verificato]**: i colpi veri cadono quasi tutti a 8,4–11,3 m dalla rete; le palle corte vengono dai
  micro-movimenti (T3), non da una scelta.
- **Correzione**: profondità dall'intensità del gesto rispetto al proprio colpo tipico (aggiornato in partita, T1) e dal
  tipo di colpo, continua; una palla corta voluta resta possibile con il gesto corto e morbido vero.

### C5. L'avversario recupera quasi tutto

- **Evidenza [verificato]**: dei 10 punti persi, 5 sono vincenti della CPU; dei 7 vinti, 5 sono palle della CPU fuori o
  in rete. La CPU di Leggenda corre a 8,0 m/s, prende la palla fino a 2,3 m e reagisce in 0,15 s.
- **Correzione**: misurare nelle partite simulate quanto la CPU arriva sulle palle angolate e profonde; un incrociato
  stretto deve costarle corsa e qualità, una palla profonda farla colpire da dietro, una corta farla avanzare. Prima la
  misura, poi i parametri.

## 5. Webcam (dal codice, nessun dato in questa sessione)

- Richiesta alla camera: 640×480 «ideali», nessuna richiesta sulla frequenza [codice]: quello che la camera dà davvero
  non viene registrato.
- Il modello delle mani gira nel thread principale, con fino a 2 mani e il modello più accurato, ed è lanciato dal ciclo
  di disegno del gioco (un fotogramma nuovo e nessuna inferenza in corso) [codice]: l'inferenza e il disegno si
  contendono lo stesso thread. Quando la mano non si vede da 220 ms parte il flusso ottico, con una lettura dei pixel
  (`getImageData`) nel thread principale.
- Non si misurano oggi: fotogrammi al secondo veri e irregolarità della camera, distribuzione del tempo d'inferenza,
  età del dato quando lo usa il gioco, tempo del fotogramma del gioco con la webcam accesa, durata delle perdite e delle
  riprese della mano.
- **Correzione**: prima la misura (diagnostica della webcam completa e una prova breve sul portatile), poi le scelte
  (risoluzione di lavoro, modello più leggero, inferenza al ritmo della camera e non del disegno, solo l'ultimo
  fotogramma, adattamento al carico) confrontando le misure. Stati della mano: valida, degradata, persa, ripresa; nessun
  colpo durante la perdita, nessun colpo dal salto della ripresa.

## 6. Android: schermo e collegamento (dal codice; in questa sessione nessuna caduta)

[verificato] In questa sessione: 0 cadute, pagina mai nascosta, blocco dello schermo attivo.
[codice]:

- **A1** Il blocco dello schermo si chiede con «Attiva i sensori» e al ritorno in primo piano; se il sistema lo rilascia
  con la pagina visibile (risparmio energetico) non si richiede più fino al prossimo ritorno: lo schermo può spegnersi
  dopo il tempo del telefono. Il computer lo dice una volta con un avviso breve.
- **A2** Pagina nascosta (schermo spento, altra app): il telefono lo dice subito (`vis: 0`), ma il computer mette in
  pausa solo quando dichiara perso il collegamento, dopo 5 s di silenzio: fino a 5 s di gioco senza racchetta (un punto
  perso).
- **A3** Nessun controllo «collegato ma senza dati utili»: se i sensori si fermano con il collegamento vivo il gioco non
  se ne accorge.
- **A4** Ripresa immediata appena il telefono è di nuovo pronto, senza conto alla rovescia e senza controllare che i
  sensori siano tornati.
- **Correzione**: blocco dello schermo richiesto di nuovo dopo ogni rilascio (anche al primo tocco), stato dei sensori
  e del collegamento separati, pausa subito con pagina nascosta o sensori fermi da 0,4 s in campo, ripresa controllata
  (sensori di nuovo regolari, conto alla rovescia, colpi vecchi scartati), messaggio chiaro.

## 6b. Diagnostica

- **R1** Fotogrammi: 60 fps mediana, ma in molti secondi il 5–10% dei fotogrammi dura 33 ms; aggiornamento e disegno del
  gioco restano sotto 5 ms: il carico viene da fuori dal ciclo del gioco (registrazione del gioco 1920×868 a 30 fps,
  programma esterno che registrava lo schermo con la webcam) [verificato il dato; la causa è un'ipotesi]. Da misurare
  senza registrazione.
- **R2** Frequenza dei messaggi del telefono: tra 65 e 70 s arrivano a grappoli (la media mobile segna 200–520 al secondo
  invece di 60); i colpi in quel tratto arrivano comunque in 5–9 ms. La misura come media mobile esagera: va sostituita da
  intervallo tra arrivi e buco più lungo.
- **R3** Gli eventi `piano` hanno il tempo sovrascritto dall'istante del piano (secondi al contatto): non si collocano
  nella sessione.
- Manca il segnaposto «qui è successo un problema» durante la prova.

## 7. Piano e stato

Ordine della richiesta: analisi (questo documento) → misura → affidabilità dei due ingressi → campo aperto ed
equilibrio → verifica e preparazione della prova reale. Ogni passo con il suo test; i parametri si cambiano un gruppo
alla volta, con il prima e il dopo.

| Passo | Contenuto | Stato |
|---|---|---|
| 1 | Diagnosi (questo documento) | fatto |
| 2 | Misura: segnaposto del problema, gesti scartati dal telefono, webcam, fotogrammi, intervalli del collegamento, tempo del piano | — |
| 3a | Telefono: soglie e colpo tipico (T1), attesa del colpo vero (T2), palla corta e pallonetto (T3, T4), mira dal piatto (T6), impugnatura di taglio (T7) | — |
| 3b | Android: blocco dello schermo, pausa e ripresa controllata (A1–A4) | — |
| 3c | Webcam: misura e catena (§5) | — |
| 4 | Campo aperto e ritmo (C1–C5) | — |
| 5 | Verifica, prova guidata, pacchetti | — |
