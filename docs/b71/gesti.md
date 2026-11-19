# B71 · Gesti: calibrazione giocando, dritto e rovescio, palla corta (19/11/2026)

Prodotto: **FIERA**. Richiesta dell'utente del 19/11: «fixiamo subito i punti più importanti: calibrazione giocando
(importantissima), dritto e rovescio, sensori». Dati: registri della fiera del 18 e 19/11 (325 partite, 7542 colpi, 493
scambi di prova; tutti Android 17 + Chrome 157 nell'app 1.0.4, LAN). Analisi di partenza: `analisi-gesti.md` (punti 2, 3,
4) e `analisi-tempo.md` (gesti doppi) nello scratchpad della sessione. Ramo locale `b71-gesti` (non spinto).

## 1. Calibrazione giocando che impara davvero

**Prima**: livello imparato negli scambi di prova none 49% · partial 24% · ok 23% · full 2%. Contavano solo top spin e
piatto: chi colpisce scendendo con la testa della racchetta (44% dei colpi di prova dei «none» letti SLICE) non imparava
niente, e la salita abituale, che avrebbe corretto la lettura, si impara proprio da quei colpi. In più `mark` sovrascriveva
il colpo tenuto per una palla con la lettura di un gesto più debole già ignorato (rientro o preparazione).

**Cambiato** (`natpf_trial_learn.js`, `natpf_phone_racket.js`):
- `mark` vale solo per il gesto tenuto dall'ultimo voto della stessa palla.
- Conta ogni colpo non debole per il gioco con un verso, uno per palla, di ogni tipo (`trialMark`). Tra questi
  (`TRIAL_SHOTS`): il colpo tipico senza le palle corte; la salita abituale da tutti tranne pallonetti, schiacciate e palle
  corte riconosciute dalla forma (come la salita imparata in partita); il centro della mira senza pallonetti e palle corte;
  il verso verticale del piatto dai soli normali (com'era).
- In partita valgono: salita abituale (`profile.rises`, per i primi 5 colpi per verso, poi quella imparata in partita),
  centro della mira (seme), soglie del telefono (`pf`), colpo tipico (dai colpi di prova), segno.

**Ricalcolo sui registri veri** (stima: il registro non ha il picco, uso la forza `f` per il filtro dei deboli e `lato` come
verso; senza palle corte): none da **243 (50%) a circa 56 (11%)**; ok 210 (43%), partial 139 (28%), full 84 (17%). Dei
none che restano, 43 erano none anche così (0–2 colpi registrati in 43 scambi). Script:
`scratchpad/b71g/none.py`.

**Giocatore simulato «dall'alto in basso»** (braccio simulato, asse del colpo inclinato a caso; 73% dei colpi di prova letti
tagliati), 5 telefoni × destro e mancino: prima del B71 4 «none» e 6 «ok» su 10; dopo, 10 «full». Tagliati nei colpi
della partita: 7/80 → 0/80 (primi 4 colpi: 3 → 0). Nessun lato sbagliato.

## 2. Segno del verso in fiera

**Prima**: il segno degli scambi di prova si girava con 2 colpi al contrario, uno per lato (147 cambi su 493 scambi); quello
del rilevatore del telefono con 4 voti (74 cambi in partita), con lo stesso telefono tutto il giorno.

**Cambiato** (solo in modalità fiera): negli scambi di prova servono almeno **6** voti concordi (contrari da tutti e due i
lati, al più il 25% d'accordo: `TRIAL_SIGN.fiera`, `learner.signNeed`); sul telefono almeno **8** voti contrari concordi
(`cfg sn`, `swing-detect.setSignNeed`). Fuori dalla fiera la regola di prima. Ogni cambio scrive la riga «tel» `segno` con
la causa e ora i voti `[d'accordo, contrari]`. Rischio: un telefono davvero al contrario non si corregge più da solo in
fiera (resta il segno del sistema operativo, `motion-sign.js`, e il voto dei tocchi).

## 3. Verso del gesto

**Cambiato**:
- Il verso del profilo semplice si misura **attorno al picco** (`swing-detect.simpleVerse`, `peakWindow`: dal picco indietro
  finché la velocità resta sopra il 35% del picco), non su tutto il gesto, con una **confidenza** 0…1 (quanto il gesto gira
  attorno alla verticale lì; ridotta se tutto il gesto direbbe il contrario; bassa se il verso viene solo dall'asse al
  picco o da tutto il gesto).
- In fiera, preparazione trattenuta e poi il colpo nel verso atteso: basta il **50%** del gesto trattenuto (prima l’80%).
- In fiera, con il verso **incerto** (confidenza sotto 0,35, gesto trattenuto ≥ 20 ms, arrivo ≥ 150 ms dopo il picco) il lato
  si prende **dalla palla** (verso atteso, o piano/posizione della palla) e il colpo super non è bloccato per «lato
  sbagliato» (`superShot sideFromBall`). Nel registro `ls` dice da dove viene il lato.

**Validazione**: i gesti veri del 28/10 con il profilo calibrato danno gli stessi colpi di prima (impronta B66 invariata,
`phone-stats.test.mjs`); con il profilo semplice il verso attorno al picco è uguale a quello di tutto il gesto in tutti i
colpi (nessun colpo cambia). Sessione del 23/10, `natpf-gesture-*`, `natpf-sessione-23-10`: verdi. Destri e mancini: stessi
test per tutti e due. Con un gesto sintetico «preparazione lenta unita al colpo» il verso di tutto il gesto è 0 o
sbagliato, quello attorno al picco è giusto.
**Da sapere**: con il profilo semplice il dritto vero del 28/10 (telefono dritto nel pugno) è letto rovescio sia prima sia
dopo (il giro attorno alla verticale va al contrario per quella presa): la finestra non lo corregge. Per questo in fiera
conta il lato dalla palla quando il verso è incerto, e i campi nuovi del registro (`vg`, `vc`, `dur`, `hold`, `ls`)
servono a misurare il prossimo giorno di fiera quanto pesano le due cause.

## 4. Palla corta

- `KEEP` (palla corta o pallonetto voluti in attesa che bloccano il colpo dall'altra parte) solo se fatti **entro la
  finestra della direzione** (`cur.lead ≤ span`), come durante il rinvio (`keepsSpecial`). Prima valeva anche per le palle
  corte «very early» (43% delle palle corte), con un lato su tre letto al contrario.
- Una palla corta o un pallonetto della forma ma **sotto il 30% del colpo tipico**, fatti oltre la finestra della direzione
  (e dentro quella del colpo a vuoto), valgono come un gesto debole (`earlySoftSpecial`): il colpo vero che arriva dopo li
  sostituisce sempre, anche fino a 0,22 s dopo l'arrivo della palla; se non arriva si giocano solo se ampi (≥ 25°).
- Tutorial: le dimostrazioni dei colpi passano dagli stessi algoritmi (le prove `natpf-gesture-*` e `natpf-lob-drop` sono
  verdi); il riconoscimento della forma della palla corta e del pallonetto non è cambiato, cambia solo quando si gioca un
  gesto lento fatto molto in anticipo.

## 5. Campi nuovi

Messaggio del colpo (`swing-message.js`): `vg` verso grezzo prima del segno (−1/0/1), `vc` confidenza del verso (0–1, 2
decimali), `sv` voti del segno girato (solo nel colpo che lo gira). Durata (`dur`) e attesa (`hd`) c'erano già. Messaggio
`sgn`: `v` voti. Riga `colpo` del registro: `vg`, `vc`, `dur`, `hold` (solo se > 0), `ls` ('g' gesto, 'a' verso atteso, 'p'
palla). Riga `tel` del segno: `voti`. Elenco dei campi: `registro_formato.js` (`CAMPI`, `CAMPI_B71`) e
`cloudflare/registro-worker.js`: **il Worker va ricaricato** perché i campi nuovi restino (quello di oggi li toglie e
accetta le righe). `cf` non toccato (altro agente). Documento dei campi: `docs/b66/registro-sensori.md`.

## Prove

Nuove: `natpf-tennis/test/natpf-b71-gesti.test.mjs` (12), `tools/test/b71-gesti.test.mjs` (9). Aggiornate:
`natpf-racchetta-motore.test.mjs` (KEEP entro la finestra, e molto in anticipo vince il colpo che segue),
`natpf-b46-lato-sicuro.test.mjs` e `tools/test/b46-lato-sicuro.test.mjs` (voti nella riga del segno e nel messaggio
`sgn`). `phone-sim.mjs` usa `trialMark` come il gioco (`legacyMark` solo per i confronti).

Suite (19/11, ramo `b71-gesti`): gioco **1855/1856** (1 saltata, come prima; 0 rosse), sito **298/298**, build ok.
Gesti veri del 28/10: in fiera (sn 8) e fuori, profilo semplice e calibrato, con ogni verso atteso, gli stessi colpi.
Nel browser (Chromium, telefono simulato): `tools/e2e/natpf-scambi-di-prova.mjs` **32/32**; `tools/e2e/natpf-lob-drop.mjs`
135/137 (riguarda le mascotte Lob e Drop, non i colpi: il controllo dei piedi in corsa già noto, e il costo del disegno
1121 → 1728 ms misurato con la macchina carica da altre prove; codice del disegno non toccato dal B71).

La regola del 50% per la preparazione trattenuta vale **solo in fiera** (telefono con `sn`): fuori dalla fiera resta
l'80% perché il caso «rovescio lungolinea su palla appena dal lato del dritto, poi il rientro della mano» (natpf-prep)
tornava un dritto. In fiera quel colpo prende comunque il lato dalla palla.

## Non verificato

- Telefono vero, programma Windows, ledwall, browser: niente provato fuori dai test in Node.
- L'ipotesi «preparazione unita al colpo» come causa del 37% di lati opposti: resta da misurare con `vg`, `vc`, `dur`,
  `hold`, `ls` del prossimo registro. La soglia di confidenza 0,35 è scelta senza dati veri.
- Il ricalcolo dei «none» è una stima dal registro (forza al posto del picco, lato al posto del verso).
- Da riportare in `docs/PROJECT_MEMORY.md` §Gesti all'integrazione: segno di fiera (6 e 8 voti), lato dalla palla con il
  verso incerto in fiera, colpi che contano negli scambi di prova.
