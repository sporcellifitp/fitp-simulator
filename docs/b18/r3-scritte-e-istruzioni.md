# B18 · ramo R3 «scritte e istruzioni»

Tappa 1 dell'audit del gameplay (`docs/b16/rapporto-gameplay.md` §4), punti 5, 7, 8 e 12: difetto 10 (scritte
dell'esito), miglioramento 2 (istruzioni del primo servizio), difetto 14 (Precision e Combo per chi arriva per la prima
volta), due misure nella diagnostica da raccogliere con persone vere. Base `natpf-simulator` a `d09357a`.

Niente da accendere: tutto vale subito, senza opzioni (non c'è una sezione «Come si attiva»). La guida per raccogliere le
due misure con le persone è `docs/b18/misure-con-persone.md`.

## Cosa cambia per chi gioca

### Le scritte spiegano l'errore (difetto 10)

- Sul grande schermo, quando la palla va fuori o in rete per il tempo, la scritta dice il perché:
  «Fuori · troppo presto», «In rete · troppo tardi», «Fuori · in anticipo», «In rete · in ritardo».
  Senza un errore di tempo resta «Fuori» o «In rete» (il motivo della situazione, «in allungo», «scambio lungo», resta
  nella riga piccola come prima).
- Il colpo a vuoto in ritardo dice «Troppo tardi» (prima «Mancata»); «Troppo presto» e «Troppo lontana» come prima.
- Il telefono dice la stessa cosa del computer: «Fuori» o «In rete» con il perché nella riga piccola (prima ignorava il
  fuori e diceva «In anticipo» mentre il computer diceva «Fuori»), e il voto preso dall'esito del computer. Vale anche
  per il telefono del Player 2 nello stesso schermo (corretto nella revisione).
- «Fuori» vuol dire che la palla rimbalza davvero fuori: l'esito si calcola dal rimbalzo previsto con la fisica del gioco
  e con la tolleranza delle righe del gioco. Prima veniva dal bersaglio del colpo, e più di metà delle «Fuori» dello
  scambio avevano poi la palla dentro e il punto vinto (trovato nella revisione, vedi sotto). Anche l'anello colorato
  a terra ora sta dove la palla rimbalza.
- «Punto avversario» sul telefono arriva solo a punto finito. Prima il colpo difensivo (molto fuori tempo, la palla
  resta in gioco) mandava al telefono «Punto avversario» per 1,3 s con lo scambio ancora aperto. Il motivo del punto sul
  telefono è in italiano («Fuori», «In rete», «Vincente», «Palla non presa»; prima «Out», «Net», «Nice Shot!»).
- Nell'allenamento il messaggio di un fuori per il tempo dice «Fuori: troppo presto» invece di «Fuori: meno angolo o meno
  forza».

### Istruzioni del primo servizio sul grande schermo (miglioramento 2)

- Al servizio, in alto al centro: «Alza il telefono: lanci la palla» (con la webcam «Alza la mano…», nella prova con la
  tastiera «Premi ↑ o W…»), sotto «Poi colpisci quando la palla è in alto».
- Durante il lancio: «Aspetta che salga…», poi «Colpisci!» in verde da 0,24 s prima a 0,32 s dopo il punto più alto
  (con la gravità del gioco nel lancio, 9,15 m/s²; corretto nella revisione).
- Se si lancia e non si colpisce, la palla ricade **nella mano** di chi serve (prima restava ferma a mezz'aria, a 0,95 m)
  e lo schermo dice «Colpisci quando la palla è in alto» con «Lancio a vuoto: riprova. Alza il telefono: lanci la palla»;
  anche il telefono dice «Lancio a vuoto» (1,8 s). Si rilancia subito.
- Quando compare: nei primi due servizi riusciti di ogni partita; dopo, solo dopo un lancio a vuoto (finché un servizio
  non parte) o se chi serve resta fermo 6 s senza lanciare. Non nell'allenamento (la scheda dell'esercizio ha già il suo
  testo) né nei minigiochi. Nello stesso schermo sta nella metà di chi serve; con la webcam per due dice «Alza la mano…».
- Il lancio a vuoto è quello segnalato dal gioco (palla ricaduta senza battuta): una partita ricominciata con la palla
  in aria non lo fa più comparire, e la seconda palla dopo un fallo a 0-0 non rimette le istruzioni dall'inizio.
- Leggibile sul ledwall: misure in `cqh` (`@container natpf`), testo bianco su fondo blu scuro quasi pieno, bordo giallo
  (lancio), verde («Colpisci!»), rosso (lancio a vuoto). In una striscia 1920×540 la scritta grande è di 34 px.
- La voce non cambia: nessuna frase nuova (non si genera audio).

### Precision e Combo per chi arriva per la prima volta (difetto 14)

- **Precision**: le due zone corte sono a 5,2 m («Corta al centro: dritto morbido») e 5,4 m («Corta a destra: dritto
  morbido») invece che a 3 m: prima davano sempre zero a chi non conosceva la palla corta (il dritto più morbido cade a
  6,2 m). La palla corta ci prende ancora punti. Medaglie 200/420/650 (prima 250/480/700, oro irraggiungibile).
- **Combo**:
  - le prime due catene solo dritto e rovescio;
  - poi anche incrociato e lungolinea; i colpi speciali (pallonetto, tagliato, palla corta) solo se già imparati:
    riusciti nell'allenamento o nella sfida stessa da chi gioca adesso (restano per la sessione della pagina, come il
    nickname; `events.forgetLearned()` li toglie, e dalla revisione anche un nickname diverso o dimenticato);
  - dopo due errori sullo stesso passo il passo cambia con un dritto o un rovescio («Cambiamo: al posto di Pallonetto,
    Rovescio»); prima ricominciava la stessa catena e chi non sapeva fare il primo colpo restava a zero per 90";
  - quando il passo chiesto è incrociato, lungolinea o uno speciale, in alto a destra c'è l'animazione del gesto (la
    stessa del tutorial, `natpf_gesture_demo`), che sparisce con un dritto o un rovescio;
  - medaglie 300/750/1300 (prima 150/400/800): con le catene nuove i punti salgono per tutti e con le soglie vecchie
    quasi tutti avrebbero preso l'oro;
  - nella pagina dei minigiochi la terza riga della Combo dice «Due errori sullo stesso colpo: si cambia» (prima
    «Colpo sbagliato: catena da capo») e la seconda «Prime catene: dritto e rovescio».

### Due misure nella diagnostica (tappa 1 punto 12)

Durante una registrazione della diagnostica (Maiusc+D → «Avvia registrazione») il pannello mostra, e il rapporto
scaricato riassume:

- **variazione del gesto** per lato: deviazione della salita della testa rispetto alla propria abituale (verdetto
  «varia molto: soglia relativa da considerare» oltre 0,15), del piano e della forza, colpi normali vicini alla soglia del
  tagliato e sotto quella della schiacciata;
- **dal rimbalzo al gesto**: ms dal rimbalzo della palla dell'avversario al picco del gesto, e ms dal gesto all'impatto
  previsto dal gioco (+ = in anticipo).

Lo script `natpf-tennis/scripts/audit/gesto-rimbalzo.mjs` le legge da uno o più pacchetti (come `lato-palle.mjs`).
Come raccoglierle: `docs/b18/misure-con-persone.md`.

## File toccati

| file | intervento |
|---|---|
| `natpf-tennis/src/natpf/natpf_shot_feedback.js` | `timingWhy`, `qualityText`, `shotQuality` con `why`/`text`; «Troppo tardi»; scritta intera nel popup; esito del colpo a vuoto per il telefono |
| `natpf-tennis/src/game_engine.js` | colpo difensivo `kind: "hit"` con `defensive` (prima `"fault"`); palla del lancio a vuoto nella mano |
| `natpf-tennis/src/natpf/natpf_phone_racket.js` | `phoneLabel`, `pointReason`; `feedback` con `out`/`net`/`why`; `tossMissed` |
| `natpf-tennis/src/natpf/natpf_ui.js` | colpo difensivo = tentativo fuori tempo per allenamento e minigiochi (come prima); `NatpfServeCoach` |
| `natpf-tennis/src/natpf/natpf_gesture_hud.js`, `natpf_training.js` | scritta intera; messaggio del fuori per il tempo; colpo speciale riuscito → imparato |
| `natpf-tennis/src/natpf/natpf_serve_coach.js` (nuovo) | istruzioni del servizio |
| `natpf-tennis/src/natpf/natpf_arcade.js` | zone di Precision, medaglie, `comboPool`, `comboChain` con `chainsDone`/`learned`, `comboSwapStep`, `COMBO_LEARN` |
| `natpf-tennis/src/natpf/natpf_events.js` | catene per principianti, `_comboMiss`, colpi imparati (`learned`, `learnShot`, `forgetLearned`), `paintDemo` |
| `natpf-tennis/src/natpf/diag/diag_gesture.js` (nuovo), `diag_metrics.js`, `natpf_diag.js` | le due misure, nel rapporto e nel pannello |
| `natpf-tennis/index.html`, `natpf-tennis/natpf-ui.css` | `#natpf-serve-coach`, `#natpf-challenge-demo` e i loro stili |
| `site/js/tennis/phone-screen.js`, `site/js/tennis/racchetta.js` | `eventFlash`: esito del colpo, colpo a vuoto, lancio a vuoto, punto |
| `natpf-tennis/scripts/audit/scritte-esito.mjs`, `precision-combo.mjs`, `gesto-rimbalzo.mjs` (nuovi) | banchi e lettura delle misure |
| `tools/e2e/natpf-servizio-lancio.mjs`, `natpf-minigiochi-principianti.mjs` (nuovi), `natpf-gameplay-23-10.mjs` | prove nel browser; la prova del 23/10 accetta «In rete · …» |
| test | `natpf-scritte-esito`, `natpf-lobby`, `natpf-servizio-istruzioni` (nuovo), `natpf-arcade`, `natpf-diag-gesto-rimbalzo` (nuovo); `tools/test/phone-screen.test.mjs` |

Per chi unisce i rami: il ramo «Nuovo giocatore» dovrebbe chiamare anche `ui.events.forgetLearned()` (colpi imparati
per la Combo); dalla revisione un nickname diverso li toglie comunque (`events.nickname`), ma se «Nuovo giocatore» non
cambia il nickname serve la chiamata. Il servizio del P2 nello stesso schermo usa `natpfPhone2.tossMissed()`. Il giro
dell'aptica verso i telefoni è ora `relayPhoneFeedback` in `natpf_shot_feedback.js` (chiamato da
`game_engine._initNatpfPhone`); `landsIn` e `landingOf` sono cambiati (rimbalzo previsto).

Revisione: file toccati in più `natpf-tennis/src/natpf/natpf_events.js` (nickname), `diag/diag_recorder.js` (ruolo
nell'evento «partita»), `natpf-tennis/scripts/audit/fuori-vero.mjs` (nuovo), test `natpf-gesture-hud`.

## Misure prima/dopo

### Computer e telefono (scripts/audit/scritte-esito.mjs, 150 punti × semi 7/11/23)

Il «prima» è il telefono di prima ricostruito dagli stessi eventi (stessi colpi): il colpo difensivo, che ora arriva come
«hit» con `defensive`, prima arrivava come «fault».

| livello · profilo | colpi | computer e telefono diversi prima → dopo | «Punto avversario» con la palla in gioco prima → dopo | fuori o in rete con il perché del tempo |
|---|---|---|---|---|
| Casual · umano | 2010 | 6,7% → 0% | 1,5% → 0% | 120 su 120 |
| Casual · amatore | 1858 | 6,9% → 0% | 1,9% → 0% | 94 su 94 |
| Casual · bambino | 1747 | 17,3% → 0% | 5,8% → 0% | 160 su 160 |
| Casual · tennista | 1166 | 1,4% → 0% | 0,1% → 0% | 16 su 16 |
| Pro · umano | 3031 | 9,9% → 0% | 3,7% → 0% | 245 su 245 |
| Pro · amatore | 2748 | 12,9% → 0% | 2,8% → 0% | 254 su 254 |
| Pro · bambino | 1686 | 21,8% → 0% | 7,3% → 0% | 197 su 197 |
| Pro · tennista | 2015 | 3,4% → 0% | 0,1% → 0% | 64 su 64 |

L'audit B16 dava 7,5–21% di colpi diversi e 0,3–3,6% di «Punto avversario» falsi: stesso ordine di grandezza. Il «dopo»
a zero vuol dire che le due scritte vengono dalla stessa funzione: le parole sono le stesse; non vuol dire che il
telefono sia stato guardato da qualcuno. Nei profili simulati tutti i fuori e in rete di chi gioca hanno un voto di tempo
diverso da «perfetto» (quindi un perché): con persone vere non è misurato.

### Precision (scripts/audit/precision-combo.mjs, 40 partite da 10 palle per profilo, solo dritto)

| profilo | totale p50 prima → dopo | bronzo/argento/oro prima | dopo |
|---|---|---|---|
| tennista (mira, errore piccolo) | 514 → 636 | 100/73/0% | 100/100/40% |
| amatore (mira, errore medio) | 338 → 407 | 88/3/0% | 98/48/0% |
| bambino (gesto lento) | 156 → 197 | 3/0/0% | 48/0/0% |
| ingenuo (non mira) | 111 → 111 | 0/0/0% | 0/0/0% |

Zone corte (la 7ª e la 10ª): prima zero nel 98–100% delle palle per tutti i profili; dopo, punti medi 56 e 61 (tennista),
29 e 35 (amatore), 21 e 22 (bambino). Chi non mira resta senza medaglia: Precision chiede di mirare.

### Combo (stesso script, 400 partite da 90" per profilo; un colpo ogni 3,6 s, stima)

| profilo | punti p50 prima → dopo | primo passo speciale | partite a zero prima → dopo | bronzo/argento/oro prima (150/400/800) | dopo (300/750/1300) |
|---|---|---|---|---|---|
| principiante (dritto e rovescio 55%, direzioni 30%, speciali mai) | 120 → 680 | 42% → 0% | 42% → 0% | 40/5/0% | 99/29/1% |
| medio (75%, 50%, speciali mai) | 140 → 1090 | 42% → 0% | 42% → 0% | 49/14/0% | 100/95/17% |
| esperto (90%, 70%, tre speciali imparati al 60%) | 1140 → 1290 | 42% → 0% | 0% → 0% | 100/100/85% | 100/100/48% |

L'audit dava il primo passo speciale nel 43% delle sfide (3 su 7): qui 42%.

## Test

- Gioco: `cd natpf-tennis && npm test` 1005 test: 1004 superati, 0 falliti, 1 saltato (quello già saltato sulla base).
- Sito: `node --test tools/test/*.test.mjs` 201/201.
- Build: `npm run build` ok.
- `npm run audit:legend`: tutti i 69 criteri rispettati (Pro contro «medio» 83,5% dei game, Casual 100%). Il ramo non
  tocca la CPU né l'esito dei colpi: il motore cambia solo nel tipo dell'evento del colpo difensivo e nella palla del
  lancio a vuoto.
- Nuovi test di unità: scritte e telefono (4 in `natpf-scritte-esito`, compreso il motore vero che non manda più
  «fault» con la palla in gioco: con il codice di prima fallisce), servizio (3 in `natpf-servizio-istruzioni`), Precision
  e Combo (3 in `natpf-arcade`), misure della diagnostica (4 in `natpf-diag-gesto-rimbalzo`), telefono (1 in
  `tools/test/phone-screen.test.mjs`).
- Prove nel browser (Chromium senza schermo, telefono simulato): `natpf-servizio-lancio` 12/12 e
  `natpf-minigiochi-principianti` 10/10 (nuove), `natpf-training-flow` 22/22, `natpf-tutorial-phone` 52/52,
  `natpf-rally` 8/8, `natpf-gameplay-23-10` 11/11 (accetta ora «In rete · …»). Non esisteva una prova nel browser dei
  minigiochi: è la nuova `natpf-minigiochi-principianti`.

## Cosa NON è verificato

- Nessuna prova con un telefono vero, con persone vere, sul PC Windows dell'evento o sul ledwall: tutto è provato con il
  gioco simulato e con il telefono simulato nel browser (Chromium senza schermo).
- Leggibilità delle istruzioni del servizio sul ledwall vero: misurata solo come dimensione in pixel in una pagina
  1920×540.
- Le medaglie nuove vengono da profili simulati e, per la Combo, da un ritmo stimato (un colpo ogni 3,6 s): vanno
  ricontrollate con i punteggi veri della classifica dopo una giornata di evento.
- Le due misure della diagnostica non sono ancora state raccolte con nessuno: le prove sono su eventi costruiti nei test.
- Voce: nessuna frase nuova (decisione di non generare audio); il lancio a vuoto non ha una voce.

## Revisione (10/11)

Il revisore indipendente ha trovato un bloccante e sette minori. Correzioni, ciascuna con test:

### Bloccante: il telefono del Player 2 nello stesso schermo diceva una cosa diversa dalla sua metà dello schermo

`natpf_ui.feedback` calcola l'esito solo per chi gioca su questo computer (il P1) e restituisce null per i colpi del P2;
il motore passava lo stesso null a `natpfPhone2.feedback`. Il P2 che tirava fuori in anticipo leggeva sul telefono «In
anticipo» con l'anello verde, mentre la metà destra dello schermo diceva «Fuori · in anticipo». Il banco
`scritte-esito.mjs` non lo vedeva perché guardava solo il P1.

Correzione: il giro dell'aptica verso i telefoni è una funzione (`relayPhoneFeedback` in `natpf_shot_feedback.js`,
chiamata da `game_engine._initNatpfPhone`); per i colpi del P2 con lo stesso schermo attivo l'esito si calcola con
`eventQuality` (stesso calcolo della scritta della sua metà, verso z > 0, senza anello né lampo) tramite
`splitPhoneQuality`. Nella sfida tra due computer non cambia nulla (l'esito del P2 lo calcola il suo computer).

Test (`natpf-scritte-esito`): il caso del revisore con un evento `role: 'p2'` (fuori, in rete, in campo, colpo a vuoto,
P1 invariato), i casi in cui non si calcola, e il motore vero nello stesso schermo con sette colpi del P2 (due o più
fuori): scritta della metà destra e telefono uguali. Con il codice di prima due di questi test falliscono.

Misura (`scritte-esito.mjs`, nuova parte «P2 nello stesso schermo»: colpi del P2 nello scambio sul motore vero, griglia
di 19 tempi × 5 piatti × 2 forze, semi 7/11/23; non c'è un profilo simulato del P2): 537 colpi; metà dello schermo e
telefono del P2 diversi **16,0% prima della revisione → 0,0% dopo** (86 fuori o in rete). Con il «Fuori» calcolato
ancora sul bersaglio (prima della correzione qui sotto) erano 21,8% → 0,0% con 117 fuori o in rete.

Il banco considera uguali le scritte dei colpi speciali del telefono («Lob!», «Tagliato!»…) con qualunque voto del
computer in campo: il telefono mostra il nome del colpo al posto del voto, per scelta. La metrica «diversi» conta quindi
le contraddizioni (fuori o in rete contro un colpo buono, voto diverso), non ogni scritta diversa. Ora è scritto anche
nel commento dello script.

### Trovato estendendo il banco: «Fuori» con la palla poi dentro

Guardando i colpi fuori del P2 si è visto che «Fuori» veniva dal bersaglio del colpo (`ball.targetLanding`, tolleranza
2 cm), non dal rimbalzo vero: l'effetto e l'aria portano la palla fino a 1,3 m più verso il centro (scarto laterale
mediano 0,24 m, 90% entro 0,65–0,89 m), e il gioco giudica la riga con 22 cm di tolleranza di lato e 28 cm in fondo.
Il difetto c'era già prima di questo ramo, ma con il ramo il telefono dice anche lui «Fuori», quindi l'ho corretto:
`landingOf` prevede il primo rimbalzo con la fisica del gioco (`natpf_impact.predictBall`) e `landsIn` usa la tolleranza
del gioco per il rimbalzo previsto (il servizio resta sul riquadro del servizio, la palla ferma o senza velocità resta
sul bersaglio). Anche l'anello colorato a terra va al rimbalzo previsto.

Misura (`scripts/audit/fuori-vero.mjs`, nuovo: 150 punti × semi 7/11/23, colpi di chi gioca nello scambio, giudizio vero
del gioco al primo rimbalzo):

| livello · profilo | «Fuori» prima: totale / con la palla poi dentro | dopo | «in campo» poi Out prima → dopo |
|---|---|---|---|
| Casual · umano | 120 / 75 | 45 / 0 | 0 → 0 |
| Casual · amatore | 94 / 50 | 44 / 0 | 0 → 0 |
| Casual · bambino | 160 / 72 | 88 / 0 | 0 → 0 |
| Casual · tennista | 16 / 13 | 4 / 0 | 1 → 0 |
| Pro · umano | 245 / 159 | 86 / 0 | 0 → 0 |
| Pro · amatore | 254 / 157 | 97 / 0 | 0 → 0 |
| Pro · bambino | 195 / 94 | 101 / 0 | 0 → 0 |
| Pro · tennista | 64 / 48 | 17 / 0 | 1 → 0 |

Effetto collaterale voluto: allenamento e minigiochi ricevono «Fuori» solo per le palle davvero fuori (prima un colpo
dentro poteva contare come errore). Non toccato: le zone di Precision si giudicano ancora sul bersaglio
(`natpf_events`, riga del bersaglio della zona) e `precision-combo.mjs` usa i suoi atterraggi: da vedere nell'unione o
dopo. La tabella del difetto 10 qui sopra è misurata con il «Fuori» sul bersaglio. Rifatta con il codice finale
(`scritte-esito.mjs`, stessi semi), «diversi dopo» resta 0,0% e «Punto avversario» falso resta uguale; «diversi prima»
scende (il telefono di prima, che ignorava il fuori, ora sbaglia meno perché ci sono meno «Fuori»): Casual umano 3,8%,
amatore 4,7%, bambino 14,2%, tennista 0,3%; Pro umano 7,1%, amatore 8,1%, bambino 17,9%, tennista 1,0%. Fuori o in rete
con il perché del tempo: 45/45, 44/44, 88/88, 4/4, 86/86, 97/97, 103/103, 17/17.

Test: `landsIn`/`landingOf` puri e il motore vero (60 punti, profilo umano, Pro): prima almeno 5 «Fuori» con la palla
dentro, dopo 0, e nessun colpo dato in campo poi «Out».

### Minori

- **Colpo difensivo nell'etichetta del gesto** (`natpf_gesture_hud.gestureOutcome`): arrivando ora come «hit» perdeva
  «Molto in anticipo/ritardo» in rosso e diceva «Anticipo» in giallo. Ora il colpo difensivo dice di nuovo «Molto in
  anticipo» / «Molto in ritardo» (rosso), o «Fuori · troppo presto» se esce; tolto il ramo «fault» non più raggiunto.
  Test in `natpf-gesture-hud`.
- **Gravità del lancio** (`natpf_serve_coach`): 9,81 → 9,15, quella del gioco nel lancio. Test.
- **Lancio a vuoto e partita nuova** (`natpf_serve_coach.serveCoachStep`, `game_engine`): il gioco ora segnala il lancio
  a vuoto con un contatore (`natpfTossMisses`, nel ramo della palla ricaduta) e le partite con `natpfMatchSeq`
  (`startNewMatch`). Una partita ricominciata con la palla in aria non dà più «Colpisci quando la palla è in alto» né
  «Lancio a vuoto» al telefono; la seconda palla dopo un fallo a 0-0 non rimette le istruzioni piene. Sul computer del
  Player 2 della sfida tra due computer (il gioco non fa la fisica lì) vale la palla che stava ricadendo sotto 1,6 m e il
  punteggio a zero arrivando da fuori dal punto. Tre test nuovi, test dello stato riscritto.
- **Stesso schermo con la webcam per due**: le istruzioni dicevano «Alza il telefono…»; ora `snapshot` legge
  `ui.split.webcam` e dice «Alza la mano…». Test.
- **Colpi imparati in fiera**: un nickname diverso o dimenticato (stand di nuovo libero) toglie i colpi speciali
  imparati dal visitatore prima; il primo nickname no (chi si è allenato senza nickname è la stessa persona). Test in
  `natpf-arcade`. Resta la nota per l'unione su «Nuovo giocatore».
- **Misura del rimbalzo sul computer del P2**: la registrazione scrive `ruolo` nell'evento «partita»; con `ruolo: 'p2'`
  contano le palle del P1 (`da: 'player'`) e il piano del P2. Registrazioni senza ruolo: computer del P1, come prima.
  Test con eventi costruiti; scritto anche nella guida `misure-con-persone.md`.
- **CSS della Combo**: padding e gap dell'animazione in `cqh` con il minimo in px.

### Verifiche dopo la revisione

- Gioco: `cd natpf-tennis && npm test` 1014 test: 1013 superati, 0 falliti, 1 saltato (lo stesso di prima).
- Sito: `node --test tools/test/*.test.mjs` 201/201.
- Build: `npm run build` ok.
- `npm run audit:legend`: 69 criteri su 69 rispettati («Tutti i criteri rispettati»; Pro contro «medio» 83,5% dei game,
  come prima). Il motore cambia solo in due contatori (`natpfTossMisses`, `natpfMatchSeq`) e nel giro dell'aptica verso i
  telefoni: la CPU non è toccata.
- Prove nel browser (Chromium senza schermo): `natpf-servizio-lancio` 12/12 («Colpisci!» a y 3,15 con la gravità
  nuova, prima 3,11; palla di nuovo in mano a 1,12 m; telefono «Lancio a vuoto»), `natpf-minigiochi-principianti` 10/10,
  `natpf-training-flow` 22/22, `natpf-tutorial-phone` 52/52, `natpf-rally` 8/8, `natpf-gameplay-23-10` 11/11,
  `natpf-scritte-2v2` 73/73, `natpf-split-ready` 34/34, `natpf-1v1-p2p` 39/39.
- Non verificato nella revisione: il telefono del P2 nello stesso schermo è provato con il motore senza grafica e con
  telefoni finti (messaggi al collegamento), non con due telefoni nel browser né con telefoni veri; il caso del Player 2
  sull'altro computer per il lancio a vuoto e per la misura del rimbalzo è provato solo con funzioni pure ed eventi
  costruiti.
