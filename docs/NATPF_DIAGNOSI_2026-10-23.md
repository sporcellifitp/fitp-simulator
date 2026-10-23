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
| 2 | Misura: segnaposto del problema, gesti scartati dal telefono, webcam, fotogrammi, intervalli del collegamento, tempo del piano | fatto per telefono, collegamento e gioco (`bce996f`); webcam con il passo 3c |
| 3a | Telefono: soglie e colpo tipico (T1), attesa del colpo vero (T2), palla corta e pallonetto (T3, T4), mira dal piatto (T6), impugnatura di taglio (T7) | fatto nel codice, provato in automatico; prova fisica da fare |
| 3b | Android: blocco dello schermo, pausa e ripresa controllata (A1–A4) | fatto nel codice, provato in automatico; prova fisica da fare |
| 3c | Webcam: misura e catena (§5) | fatto nel codice, provato in automatico e nel browser con la webcam finta; misura sul portatile da fare |
| 4 | Campo aperto e ritmo (C1–C5) | C3, C4, C5 fatti e misurati nel banco; C1–C2 (ritmo) fatti in parte (Casual), con il confronto per la prova fisica |
| 5 | Verifica, prova guidata, pacchetti | — |

### Passo 3a · telefono (fatto)

- **T1** Soglie del rilevatore in proporzione alla scala di chi gioca (la direzione più forte della calibrazione), con
  minimi bassi solo di sicurezza: i «colpetti» lenti di chi gioca piano restano colpi, il tremolio no. Colpo tipico per
  direzione imparato giocando (75° percentile degli ultimi 8). Calibrazione rifiutata se un verso è oltre 3,5 volte
  l'altro («squilibrio», con il verso debole da rifare).
- **T2** Gesto debole (picco sotto il 30% del colpo tipico) arrivato presto: si aspetta il colpo vero fino a 0,22 s
  (0,3 s al servizio) e vince lui anche se arriva tardi; un gesto debole ma ampio (≥ 25°) si gioca; gli altri si
  scartano senza colpo a vuoto, e il registro lo dice (`vuoto`, perché `debole`). Il ritorno del braccio entro 0,9 s e
  più debole del colpo non è un secondo colpo; il rilevatore non resta bloccato nel recupero oltre 0,65 s. I gesti non
  mandati hanno il motivo nel registro (debole, lento, corto).
- **T3** Palla corta solo da un gesto vero (almeno 15° di arco): i micro-movimenti non la fanno più.
- **T4** Pallonetto solo con il braccio che sale davvero (salita 0,6 e piano 0,55): il dritto in salita resta top spin.
- **T6** Mira dal piatto pesata con la sua affidabilità (piena fino a 45°, a zero 15° oltre): niente salti a fondo scala.
- **T7** Impugnatura di taglio: la forma del colpo si misura rispetto alla gravità, quindi il telefono ruotato di 90°
  attorno al lato lungo (display a destra o a sinistra) dà lo stesso lato, lo stesso colpo e la stessa forza della presa
  di riferimento, per destri e mancini, dritto o inclinato di 35° (`natpf-presa-di-taglio.test.mjs`). La pagina del
  telefono non chiede più di raddrizzarlo (un avviso in basso, che non blocca); testi e disegni dicono la presa di taglio.
- Cosa provano i test: il rilevatore e il motore con gesti simulati (telefono simulato completo). Non provano la mano
  vera: soglie, attese e presa vanno provate con il telefono (prova guidata).

### Passo 3b · Android (fatto)

- **A2–A4** Sul computer (`natpf_phone_watch.js`): pausa appena il telefono non è utilizzabile in campo (scollegato, non
  pronto, pagina nascosta: subito; sensori fermi da 0,4 s a collegamento vivo; tolleranza 0,3 s per i ricollegamenti
  lampo), ripresa dopo 0,7 s di telefono regolare e il conto alla rovescia 3-2-1, punto rigiocato se la pausa è
  arrivata nello scambio o nel lancio, colpi in sospeso cancellati, nessun punto assegnato. Con i tocchi non si
  aspettano i sensori. Registro: `tel.pausa`, `tel.ripresa`.
- **A1** Sul telefono (`phone-keep.js`): blocco dello schermo richiesto di nuovo dopo un rilascio o un rifiuto a pagina
  visibile (1, 2, 4, 8 s), al ritorno in primo piano e a ogni tocco; avviso fisso sul telefono quando lo schermo può
  spegnersi, con il pulsante o con cosa cambiare nelle impostazioni. Sensori fermi a pagina visibile: avviso con
  «Riattiva i sensori» (poi «Ricarica la pagina», che tiene collegamento e calibrazione). Al ritorno in primo piano: un
  ping e 2 s per la risposta prima di chiudere il collegamento, ricollegamento subito se era perso.
- Cosa provano i test: `natpf-phone-keep.mjs` (telefono e computer veri nel browser, sensori, visibilità e blocco dello
  schermo simulati) 13/13. Quando Android sospende i sensori, rilascia o nega il blocco si vede solo con il telefono.

### Passo 3c · webcam (fatto)

- **Misura** (registro e rapporto): camera chiesta (640×480, ora anche 30 fps) e ottenuta, con il nome del dispositivo;
  ogni secondo fotogrammi della camera (dai fotogrammi presentati, non dai richiami: con il thread occupato il browser ne
  salta), intervallo p95 e buco più lungo, fotogrammi che la pagina non ha visto, inferenze al secondo con p50/p95/max,
  fotogrammi senza inferenza, età del dato della mano quando il gioco lo usa, quota del thread del gioco occupata dal
  modello; stati della mano con le durate; cambi del modello. Metriche anche per livello del modello (confronto sullo
  stesso computer) e nel confronto tra due sessioni.
- **Catena**: l'inferenza parte dal fotogramma nuovo della camera (richiamo del fotogramma), in un compito a sé dopo il
  fotogramma del gioco (prima partiva dentro il ciclo di disegno e ne allungava il fotogramma); una alla volta, sempre
  sull'ultimo fotogramma; quello arrivato durante un'inferenza si elabora appena finisce. Se i richiami non arrivano
  (browser senza supporto, thread molto occupato) la fa partire il ciclo di disegno, sempre in un compito a sé. Il video
  del modello è nella pagina (2 px, invisibile).
- **Carico adattivo** (`webcam_load.js`): modello completo con 2 mani → leggero con 2 mani → leggero con 1 mano, quando
  la mediana dell'inferenza supera 16 ms (metà del thread con la camera a 30 Hz; dopo 10 misure se è oltre 48 ms). Il
  modello nuovo si carica solo senza un punto in gioco (ricaricarlo ferma il gioco per un attimo: 2,2–2,4 s qui con la
  grafica software). `?webcamLivello=piena|leggera|minima` lo impone per confrontare i livelli sullo stesso computer.
  Il costo vero sul portatile della prova si sa solo dal registro: qui l'inferenza dura ~240 ms (grafica software).
- **Continuità**: stati della mano valida, degradata (persa da 0,25 s), persa (da 0,7 s o mai vista), ripresa (0,6 s
  dopo una perdita). Con il modello attivo il flusso ottico di riserva può solo finire un colpo appena perso per il
  mosso (fino a 0,7 s): niente colpi inventati con la mano persa a lungo o mai vista (prima sì, dalla zona centrale).
  Senza modello delle mani il flusso resta l'unico ingresso. La ripresa: i colpi contano da quando la mano è ferma (già
  prima). Partita in pausa con le istruzioni (`natpf_webcam_watch.js`): mano persa da 0,8 s nello scambio o nel lancio
  (prima che il punto sia perso: si rigioca), da 1,5 s nelle altre fasi; webcam ferma da 1 s; ripresa con la mano vista
  di nuovo per 0,7 s e il conto alla rovescia.
- Cosa provano i test: simulatore della webcam (stesso codice del gioco) per colpi, flusso e stati; partita con
  l'orologio virtuale per pausa e ripresa; nel browser (`natpf-webcam-pipeline.mjs`, modello vero sulla webcam finta)
  10/10. Non provano la mano vera, la luce della stanza né la webcam del portatile: quelle con la prova guidata.

### Passo 4 · campo aperto (C3, C4, C5: fatti) — misure del banco prima e dopo

Banco: `npm run audit:rally` (punti vinti e colpi per punto, 3 semi × 150 punti), `-- --cpu` (nuovo: per ogni colpo di chi
gioca, distanza laterale tra la caduta e la CPU quando il colpo parte, profondità, ed esito: vincente, errore della CPU,
ripresa), `-- --campo` (distribuzione delle cadute), `npm run audit:legend` (criteri di Leggenda e di non regressione).
Base: commit `cd2aaa7` (stesso motore del 23/10 per il campo).

- **C3 direzione**: il tempo dentro la finestra copre da una riga all'altra a tutti i livelli (peso del tempo 1, prima
  0,72 e 0,58 a Leggenda; la spinta naturale verso l'incrociato vale solo vicino al tempo neutro); stessa mira piena a
  tutti i livelli (3,65 m; Leggenda era 3,1). Lungolinea al bordo della finestra: prima il 57% della mira (43% a
  Leggenda), ora la riga (3,6 m dal centro). Oltre la finestra la palla va verso l'esterno con un passo per livello (0,8
  m per unità a Casual, 0,9 a Pro e 1v1, 1,1 a Leggenda: prima 1,4 per tutti, che con il lungolinea pieno portava fuori
  appena oltre il bordo). L'incrociato stretto (più corto) solo dalla parte dell'incrociato: il lungolinea resta profondo.
  Cadute di chi gioca, 10° e 90° percentile laterale: prima ±3,1–3,2 m, ora ±3,6–3,9 m; le tre celle più colpite
  scendono (es. Pro tennista 26,3% → 22%).
- **C4 profondità**: la forza (e la profondità voluta) si misura rispetto al proprio colpo tipico imparato giocando
  (mediana degli ultimi colpi dello scambio), non più rispetto ai gesti della calibrazione: con i colpetti della
  calibrazione la parte relativa era sempre piena. Nel telefono simulato: colpo solito a metà, più forte più in fondo,
  più morbido più corto, con differenze circa una volta e mezzo quelle di prima.
- **C5 CPU**: a Casual e Pro la CPU accelera e frena (10 e 16 m/s² a Casual, 11 e 17 a Pro; prima cambiava verso
  all'istante); a Pro meno errori a caso (base 0,004, velocità 0,07, angolo 0,14; erano 0,015, 0,12, 0,2) e punta 5,3 m/s
  (era 5,0): restano gli errori forzati dall'allungo. Vincenti di chi gioca per distanza della caduta dalla CPU:

  | Pro, profilo tennista | prima | dopo |
  |---|---|---|
  | palla a meno di 2 m dalla CPU | 0% vincenti, 15% errori CPU | 0%, 15% |
  | 2–4 m | 0%, 20% | 0,4%, 17–20% |
  | 4–6 m | 0%, 23% | 13–21%, 18–21% |
  | oltre 6 m | (mai: la CPU era sempre vicina) | 56–86% |

  Casual, profilo medio, 4–6 m: prima 1,5% vincenti, ora 41%.
- **Equilibrio** (punti vinti, prima → dopo): Casual medio 85,3 → 89,8%, bambino 45,1 → 60,2%, tennista 100 → 97,6%;
  Pro medio 61,6 → 68,0%, amatore 79,3 → 74,0%, tennista 99,8 → 94,2%, impreciso 22,7 → 21,1%. Colpi per punto: Casual
  9–13 → 5–9, Pro 7–13 → 5–11. Leggenda: tutti i criteri rispettati (preciso 71,9%, tennista 95,3% di game alla CPU);
  non regressione Pro contro medio 81,3% (70–85%), Casual contro medio 99,8% (≥ 95%).
- Cosa provano: il banco usa le regole vere del motore con profili simulati (tempo, mira, forza). Non dice se il ritmo e
  la difficoltà sono giusti per una persona: questo lo dice la prova guidata.

### Passo 4 · ritmo (C1–C2): fatto in parte, da decidere con la prova fisica

Banco nuovo: `npm run audit:rhythm` (per ogni palla della CPU ripresa: tempo dal colpo della CPU all'impatto e dal
rimbalzo all'impatto, altezza e posizione dell'impatto, velocità, colmo dopo il rimbalzo).

- **Misura di base** (conferma C1): impatto 0,12 s dopo il rimbalzo a 0,8 m, colpi dopo il colmo 0–3%, colmo dopo il
  rimbalzo a 14–17 m dalla rete (oltre la posizione più arretrata, 13,4 m). Dal colpo della CPU all'impatto: Casual
  1,17 s, Pro 1,03 s, Leggenda 1,12–1,15 s.
- **Provato e misurato**:
  - contatto al colmo dopo il rimbalzo arretrando fino a 14,6 m: Casual +0,35 s, Pro +0,13 s, Leggenda +0,08 s; ma a
    Leggenda la CPU vince l'85,6% dei game contro il profilo «preciso» (prima 71,9%): le sue palle corte puniscono chi
    è arretrato (il proprio colpo non è più lento: lo è la posizione);
  - con il colmo solo quando è davvero raggiungibile (13,8 m): Leggenda 80,3%, e a Pro e Leggenda il guadagno di tempo è
    quasi nullo (le palle della CPU sono veloci, il colmo resta oltre);
  - volo della CPU più lungo dell'8% (un parametro di ritmo unico): peggio, Leggenda 92,4% (palle più alte, più palle
    lunghe di chi gioca a Leggenda). Tolto;
  - un profilo che colpisce dal rimbalzo come la persona del 23/10 (0,2–0,3 s dopo): il contatto al colmo non lo aiuta
    nel banco (la finestra d'impatto tollera già quel ritardo). Il modello a ritardo fisso è grossolano: la prova fisica
    lo dirà meglio.
- **Scelta**: contatto al colmo quando è raggiungibile (fino a 13,8 m), sulle palle oltre la riga del servizio, a Casual,
  Pro e 1v1; a Leggenda come prima. Le palle corte si prendono presto, avanzando (approccio, poi volée e schiacciate
  dove la palla le chiede). Risultato: Casual da 1,17 a circa 1,46 s, un quarto delle palle prese al colmo o in discesa;
  Pro e Leggenda invariati; equilibrio come dopo C3–C5, tutti i criteri di Leggenda rispettati.
- **Per la prova fisica**: `?ritmo=colmo` accende il contatto al colmo a tutti i livelli (anche Leggenda), `?ritmo=prima`
  lo spegne. Due partite brevi a Leggenda con la diagnostica, una per modo, si confrontano nel rapporto (tempo dei
  colpi, colpi in ritardo, punti).
- **Correzioni nate qui** (valgono sempre): la palla è «passata» solo 2,8 m dietro chi gioca (prima a 15,6 m fissi:
  tagliava la finestra in ritardo a chi era arretrato); la volée si decide confrontandola con il primo punto comodo dopo
  il rimbalzo.

