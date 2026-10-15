# Proposta gameplay — skill gap, angoli e scambi più brevi

Data: 15 ottobre 2026  
Branch di riferimento: `claude/lucid-cannon-us9l0g`  
Branch di lavoro: `analysis/priorities-audit-v2`

## Obiettivo

Rendere Racchetta più competitivo e leggibile, premiando timing, direzione e scelta tattica. Ridurre gli scambi interminabili attraverso vantaggi creati dal giocatore, non con un limite artificiale alla durata o con errori casuali.

## Stato attuale osservato

In `site/js/match/arcade.js`:
- `arcadeShot()` combina il timing (`pull`) con la mira opzionale del mouse (`sw.aim`), e deriva potenza, profondità, clearance e margine d'errore.
- Il timing influenza direttamente la direzione: anticipo e ritardo generano una componente di angolo.
- `CPU` usa livelli Facile e Normale con parametri di velocità, reazione, attacco, ritmo e probabilità d'errore.
- `cpuShot()` considera qualità e potenza del colpo precedente, velocità della palla e numero di colpi nello scambio.
- `site/js/match/ai.js` contiene `shotTarget()`, che converte mira e profondità in un bersaglio sul campo; `makeShot()` applica una dispersione gaussiana.
- `site/js/tennis/swing-detect.js` ricava dal telefono potenza, direzione del movimento e componente verticale, usando l'asse appreso in calibrazione.

Questi meccanismi permettono un intervento incrementale, senza riscrivere fisica e input.

## Proposta di gameplay

### P0 — Separare le variabili del colpo

Non usare più il timing come principale fonte di direzione. Il modello concettuale del colpo dovrebbe essere:

- **Timing:** qualità del contatto e stabilità.
- **Direzione del gesto:** direzione desiderata, ricavata dai sensori calibrati.
- **Posizione rispetto alla palla:** difficoltà del gesto e margine di controllo.
- **Potenza:** velocità della palla e contributo alla profondità.
- **Scelta del bersaglio:** punto d'arrivo, limitato dalla geometria del campo.

Il telefono non può stimare in modo affidabile una mira assoluta solo dal giroscopio: mappare il gesto calibrato in una direzione relativa al giocatore, con una zona neutra, una curva di sensibilità e limiti ai valori estremi. Per mouse/tastiera mantenere la mira esplicita esistente.

### P0 — Introdurre un modello d'errore basato su rischio e difficoltà

La dispersione non dovrebbe essere principalmente casuale. Calcolare un indice di difficoltà usando:
- distanza del bersaglio dalle linee;
- timing lontano dal contatto ideale;
- potenza richiesta;
- altezza e distanza della palla dal punto d'impatto;
- equilibrio/posizione del giocatore, se stimabile in modo affidabile.

Il risultato deve essere deterministico per gli stessi input, salvo una piccola variabilità controllata. Una mira centrale offre margine; un angolo stretto è più premiante ma richiede un gesto e un timing migliori. Evitare penalità invisibili o errori casuali che sembrano ingiusti.

### P0 — Dare al giocatore un vero controllo dell'angolo

Implementare e testare tre famiglie di traiettorie:
1. **Sicura:** centro, margine ampio, profondità controllabile.
2. **Incrociata:** mira diagonale che allarga il campo.
3. **Lungolinea:** cambio di direzione con difficoltà superiore se la palla arriva lateralmente o il giocatore è in ritardo.

La direzione del gesto controlla l'angolo in modo continuo; non aggiungere tre pulsanti obbligatori. Mostrare per breve tempo un feedback visuale sulla direzione prevista e il risultato del contatto, senza sovraccaricare lo schermo.

### P1 — Creare vantaggio posizionale dopo un buon angolo

L'angolo deve avere una conseguenza sulla successiva risposta:
- far correre la CPU verso il punto d'intercetto reale;
- applicare tempo di reazione e recupero coerenti con il livello;
- se raggiunge la palla in allungo o fuori equilibrio, limitare precisione e aggressività della risposta;
- se arriva in posizione comoda, consentirle di contrattaccare.

Non assegnare automaticamente un punto a un colpo angolato: il vantaggio nasce dalla geometria e dalla qualità della risposta.

### P1 — Rendere la CPU un avversario tattico

Aggiungere livelli distinti:
- **Facile:** restituisce molte palle, commette errori comprensibili, lascia spazio.
- **Normale:** recupera il centro e punisce palle corte/deboli.
- **Esperto:** legge meglio il bersaglio, recupera più rapidamente e contrattacca le palle comode; può comunque essere spostato e messo sotto pressione.

La CPU non deve conoscere il bersaglio futuro prima che il giocatore colpisca. L'intercetto deve dipendere dalla traiettoria effettiva e da una reazione plausibile.

### P1 — Ridurre gli scambi infiniti senza errori artificiali

Non aumentare semplicemente la probabilità d'errore in funzione di `rally.hits`. Il sistema attuale include già un contributo della lunghezza dello scambio alla pressione e all'errore della CPU. Va verificato se questo produce punti in modo percepibile o solo casuale.

Preferire questa sequenza:
1. colpo angolato → avversario si sposta;
2. risposta in allungo → palla più corta o meno precisa;
3. attacco sulla palla corta → possibilità di chiudere il punto.

Un aumento graduale della fatica o della pressione dopo scambi molto lunghi può essere valutato solo se i test mostrano che le dinamiche tattiche non bastano. Deve colpire soprattutto precisione e recupero, non generare un errore casuale inevitabile.

### P1 — Feedback per imparare e padroneggiare

Dopo ogni colpo, mostrare un solo feedback sintetico:
- timing: Perfetto / Buono / In ritardo;
- qualità: Preciso / Sbilanciato / Troppo rischioso;
- esito: Incrociato / Lungolinea / Centrale.

Non mostrare tutti i valori numerici durante il rally. Una breve revisione a fine punto può indicare la causa principale: colpo fuori tempo, angolo troppo stretto, palla corta o mancato recupero.

## Ordine d'implementazione

1. Registrare baseline ripetibile: durata dei punti, colpi medi per punto, errori non forzati, percentuale di colpi angolati che producono una risposta debole.
2. Separare timing e direzione, mantenendo la compatibilità con mouse/tastiera e input telefono.
3. Implementare il rischio di errore legato alla difficoltà del bersaglio.
4. Rendere la CPU sensibile alla qualità dell'intercetto e al recupero posizionale.
5. Bilanciare Facile, Normale ed Esperto con partite ripetute e test di regressione.
6. Fare una prova moderata con 5–10 giocatori, raccogliendo impressioni su controllo, giustizia percepita e durata degli scambi.

## Metriche di successo

Misurare prima e dopo, con la stessa configurazione:
- mediana e 90° percentile dei colpi per punto;
- durata mediana e 90° percentile degli scambi;
- punti conclusi con un vincente o una risposta mancata rispetto agli errori non forzati;
- percentuale di angoli richiesti effettivamente raggiunti;
- correlazione tra qualità del timing e precisione/velocità;
- vittorie di giocatori esperti rispetto a principianti, a parità di avversario;
- feedback qualitativo: il giocatore capisce perché ha vinto o sbagliato?

Non fissare subito target numerici assoluti senza una baseline. Come ipotesi da verificare, cercare una riduzione degli scambi estremamente lunghi senza far crescere in modo marcato gli errori percepiti come casuali.

## Test di regressione necessari

- stessa sequenza di input → bersaglio e risultato ripetibili;
- dritto e rovescio: entrambe le direzioni del gesto funzionano;
- anticipo, timing perfetto e ritardo influenzano la qualità senza invertire in modo imprevedibile la mira;
- mira centrale più affidabile di un angolo estremo a parità di timing e potenza;
- input telefono e mouse/tastiera producono una logica di colpo coerente;
- avversario spostato lateralmente richiede più tempo per recuperare;
- livello Facile rimane accessibile e livello Esperto è più forte senza diventare infallibile;
- gli scambi si accorciano grazie a vantaggi posizionali, non solo per aumento casuale degli errori.

## Non fare subito

- Non riscrivere il motore fisico.
- Non introdurre spin complesso, stamina, equipaggiamento o statistiche del personaggio prima di validare il controllo base.
- Non aumentare semplicemente la velocità di ogni colpo.
- Non usare un limite massimo di colpi per chiudere il punto.
- Non cambiare simultaneamente timing, sensibilità, potenza, velocità CPU e probabilità d'errore: renderebbe impossibile capire quale modifica migliora il gameplay.
