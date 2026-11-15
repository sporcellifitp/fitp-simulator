# B48 · Servizio con delle scelte, servizio della CPU vario, Leggenda più da campione

> **Nota del 15/11/2026 (ripresa dopo la 14.8).** Il codice del B48 e del B48.1 è entrato in `natpf-simulator` con la
> versione **2026-11-14.7** (`8018967`, un solo commit insieme a B40, B49 e B50), non con un'unione del ramo: i commit
> citati qui sotto (`31a0f6f`, `7d3d795`, `450256e`…) esistono solo nel ramo `b48-servizio` dentro
> `docs/consegna/2026-11-15/rami-b40-b48.bundle`. Questo documento non era stato portato nella 14.7: ripreso dal ramo,
> con le prove del §7.7 rifatte sul codice unito.

Tappa 3, punto 5 del rapporto B16 (`docs/b16/rapporto-gameplay.md`), prima parte: difetto 16 ricontrollato su tutti i
percorsi, miglioramento 10 (un servizio con delle scelte), punto 17 (servizio della CPU) e miglioramento 8 (una Leggenda
più da campione). Il miglioramento 9 (prova del ritardo del ledwall) non è in questo blocco.

Ramo `b48-servizio` da `natpf-simulator` a `3d92ce1` (15/11/2026). Le misure «prima» sono su un albero estratto da
`3d92ce1`. Tutto è misurato con partite simulate senza grafica (motore vero, `scripts/audit/headless-engine.mjs`) e con il
gioco vero nel browser e un telefono simulato. Niente è provato con persone vere, telefoni veri, il PC Windows
dell'evento o il ledwall.

## In breve

- **Servizio dal telefono con una scelta**: colpire **prima** del punto più alto del lancio manda la palla **al centro**
  (alla «T»), **dopo** il punto più alto **larga**; nel punto più alto al centro del quadrato. Profondità, forza ed effetto
  come prima. Vale per il Player 1 e per il Player 2 dello stesso schermo, destri e mancini. Webcam, mouse e tastiera
  come prima. La regola è scritta nella scheda «Servizio» del tutorial e dell'allenamento, nella guida «Come si gioca» e
  sotto «Colpisci!» ai primi servizi sul grande schermo.
- **Servizio della CPU vario**: direzione («T», corpo, largo) ed effetto (piatto, kick, tagliato) cambiano a ogni
  servizio, mai tre uguali di fila; dal B48.1 la direzione è il terzo dove la palla rimbalza davvero, a ogni livello, e a
  Pro, Evento e Leggenda una parte dei servizi è profonda. A Casual e Bambini la CPU non serve mai più forte della media
  dei servizi di chi gioca in quella partita (prima del suo primo servizio, dal B48.1, mai più forte del servizio più lento
  possibile di chi gioca: 64 km/h con il telefono, 59 con le altre racchette) e la palla rimbalza in fondo al quadrato.
  Niente tremolio della telecamera, km/h veri sul tabellone dell'arena (nessun 194 fisso rimasto).
- **B48.1** (correzioni della revisione indipendente, §7): la risposta al servizio si gioca dopo il rimbalzo (a Bambini
  il servizio lento della CPU si schiacciava al volo); test che proteggono le tarature del B48; impronte dello stesso
  schermo con la regola del servizio accesa; documenti corretti.
- **Leggenda**: al più una smorzata ogni 8 colpi della CPU (prima una ogni 7,3 contro l'adulto medio, a volte due di
  fila). `audit:legend`: «Tutti i criteri rispettati» prima e dopo; l'adulto medio contro la Leggenda 13,6 → 14,8% dei
  punti (24 semi × 300 punti, +1,2; limite chiesto +2).
- **Difetto 16**: già chiuso dal B18 per il Player 1; mancava il ritardo dello schermo nel telefono del Player 2 (pannello
  della diagnostica). Chiuso e provato a tutti i livelli.

Attenzione per lo stand: con «Battuta: Sempre lo stesso» (B47, di base) contro la CPU batte sempre chi gioca, quindi il
servizio della CPU si vede solo con «Battuta: Alternata».

## 1. Difetto 16 · «palla passata» con il ritardo

**Cosa c'era.** Il B18 (`docs/b18/r2-motore-piccolo.md`, D16) giudica «palla passata» e la portata di lato dove era la
palla al momento del gesto, non dove è quando il messaggio arriva: `natpf_impact.js` `ballAtGesture` (riga 398) e
`queueUserSwing` (riga 406). La latenza del gesto comprende il ritardo dello schermo impostato dallo staff
(`natpf_phone_racket.js` riga 276: `now − s.at + displayLag`, tetto 0,3 s). Il Player 2 dello stesso schermo passa dalla
stessa `queueUserSwing` (`game_engine.js` riga 1830); il doppio usa `latencyShift` (righe 2094 e 2514). Misura del B18:
con lead −0,02 s e 130 ms di ritardo, palla veloce, prima mancata a tutti i livelli, dopo colpita.

**Cosa mancava.**
- Il pannello della diagnostica (`natpf_diag.js` `saveLag`) metteva il ritardo dello schermo solo nel primo telefono. Il
  telefono del Player 2 (stesso schermo e fiera: `natpf_split_ui.js`, `natpf_fiera.js`), creato una volta sola, teneva il
  valore letto alla nascita fino al riavvio: con il ritardo impostato dopo, i suoi colpi appena in ritardo su una palla
  veloce tornavano «Troppo tardi».
- Nessun test per Bambini ed Evento (nati dopo il B18), per il Player 2 dello stesso schermo e per la catena intera con
  il ritardo dello schermo.

**Cosa ho fatto** (commit `aa9b08f`): `saveLag` aggiorna tutti e due i telefoni; test nuovo
`natpf-tennis/test/natpf-b48-ritardo.test.mjs`:
- colpo con lead −0,02 s e 130 ms di ritardo, palla veloce (volo 0,6 s) e normale (0,85 s): colpito a Casual, Pro,
  Leggenda, Bambini, Evento e nell'1v1, con il tempo vero del gesto;
- lo stesso colpo dal Player 2 dello stesso schermo;
- 30 ms di rete + 100 ms di schermo attraverso `natpfSwingToEngine` (la catena che usa il gioco);
- il pannello con due telefoni.

Provati sulla base: senza la correzione del B18 falliscono tutti; sulla base del B48 solo quello del pannello.

## 2. Un servizio con delle scelte (miglioramento 10)

**Cosa c'era.** `natpf_stroke_outcome.serveOutcome` (riga 628 della base): la direzione del servizio veniva da quanto era
obliquo il gesto, `dx = (−piano·1,5 + piatto·0,8)·q`. Il servizio insegnato (piano 0,5) andava largo in un quadrato e
verso la «T» nell'altro, senza che chi gioca lo scegliesse; il tutorial non ne parlava. Il momento del colpo
(`natpfServeTau`, s prima del punto più alto, con la latenza tolta: `game_engine.js` righe 1564 e 1796) decideva solo la
qualità (piena entro 0,18 s dal punto più alto).

**La regola** (`SERVE.choiceTau`, `choiceReach`, `choiceQ0`; `serveOutcome({ choice })`):
- il momento del colpo sceglie la direzione: `aim = tau / 0,15` (tra −1 e +1); +1 (0,15 s prima del punto più alto) la
  palla va 1,625 m verso la riga centrale (a 0,425 m dalla «T»), −1 (0,15 s dopo) 1,625 m verso il corridoio (a 3,675 m
  dalla riga centrale, 0,44 m dentro la riga), 0 al centro del quadrato. Sono i punti del servizio «sulla riga» del banco
  del B18: la scelta piena arriva dove arrivava il servizio più angolato di prima, non oltre;
- 0,15 s sta dentro la finestra «perfetto» (0,18 s): si sceglie senza perdere qualità;
- fuori dalla finestra la scelta cala con la pulizia del colpo (piena a q 1, nulla da q 0,55 in giù): mezzo secondo dopo il
  punto più alto il servizio torna lento e centrale, non diventa un servizio largo che fa correre la CPU;
- profondità, velocità, effetto («Gran servizio», kick, tagliato) e voto restano quelli di prima (il piano dello swing
  decide ancora l'effetto, non più la direzione);
- la **minaccia per la CPU** (`natpf_skill.serveInfo`) ha la formula di prima, ma legge il punto di rimbalzo x, che ora lo
  sceglie il momento del colpo (correzione della revisione, B48.1: qui prima c'era scritto che restava quella di prima).
  Lo stesso gesto (servizio insegnato, forza 0,9, 150 km/h) colpito 0,15 s prima o dopo il punto più alto va alla «T» o
  largo, e la minaccia passa da 0,7 a 1,0 e «sharp» da 0 a 1: la CPU legge la risposta in ritardo, come sul servizio
  «sulla riga» del B18. Colpito nel punto più alto va al centro del quadrato e la minaccia è quella della sola velocità
  (0,7);
- uguale per destri e mancini, nei due quadrati, per il Player 1 e per il Player 2 (nel suo riferimento, specchiato come i
  colpi dello scambio).

**Webcam, mouse e tastiera: come prima** (`serveChoiceOf`): mouse e tastiera hanno già una mira esplicita (Q/E, A/D:
`dirX`), che resta; la webcam non sa quando è il colpo con la precisione del telefono (nessuna latenza misurata; la webcam
di base «argon» batte con un'altra regola, quella «movimento», `?webcamMovimento=1`, stima l'istante del colpo anche in
negativo) e la regola sullo schermo compare solo con il telefono. Il servizio automatico dello stesso schermo (B25) batte
nel punto più alto: al centro, come prima.

**Dove è scritta** (una riga, `SERVE_CHOICE` in `natpf_gesture_motion.js`: «Prima del punto più alto: palla al centro ·
dopo: larga»):
- scheda «Servizio» del tutorial e «Guarda e ripeti» dell'esercizio «Servizio» dell'allenamento (quarta riga);
- sul grande schermo, ai primi servizi di ogni giocatore nuovo, sotto «Colpisci!» (solo con il telefono;
  `natpf_serve_coach.js`), cioè proprio quando si sceglie;
- guida «Come si gioca», scheda «Il servizio» (telefono): «colpisci quando è in alto: **prima** del punto più alto la
  palla va **al centro**, **dopo** va **larga**».

La dimostrazione 3D del tutorial batte nel colmo della palla (`serveTimeline`): per la regola vera è un servizio al centro
del quadrato, quindi coerente (non mostra dove cade la palla).

**Prove.**
- `natpf-tennis/test/natpf-b48-servizio-scelta.test.mjs` (6): la regola nei due quadrati (T, largo, centro; monotona; molto
  fuori tempo torna centrale); la scelta cambia solo la direzione; nel motore vero Player 1 destro e mancino e Player 2
  dello stesso schermo destro e mancino, nei due quadrati, con il rimbalzo vero nel terzo giusto; mouse e webcam
  «movimento» come prima; i testi.
- Nel browser con il telefono simulato (`tools/e2e/natpf-servizio-scelta.mjs`, pagina del telefono, PeerJS e motore veri):
  gesto prima del punto più alto → «T», dopo → largo, nei due quadrati; la riga sotto «Colpisci!», nella scheda del
  tutorial, nella guida e nel riquadro «Guarda e ripeti» dell'allenamento (a 720×720 quel riquadro piccolo non ha righe,
  come per tutti i colpi), con le schermate a 1920×1080, 1280×720 e 720×720: 18/18.
- Il banco del servizio (`scripts/audit/servizio.mjs`) batte i servizi «sulla riga» con il tempo (`tightTau`). Servizio
  perfetto, forte ed esterno a Casual (2 semi × 200 punti): ace 6,5% → 6,8%, punti diretti 30,8 → 26,8%; a Pro ace 7,5 →
  6,8%, punti diretti 17,8 → 17,8%; a Leggenda nessun ace prima e dopo. Con `choiceReach` 1,6 (prima versione) gli ace a
  Casual scendevano allo 0,8%.

## 3. Servizio della CPU vario (punto 17)

**Cosa c'era.** `game_engine._executeServeHit` (righe 1938–1946 della base): punto di rimbalzo a 1,75–2,6 m dalla riga
centrale (+ `dirX`·1,15), 4,4–5,75 m dalla rete, top spin 22 sempre, laterale `dirX`·−8. `natpf_skill.cpuServeEvent`: a
Casual e Bambini `dirX` 0 (sempre al centro del quadrato), a Pro ed Evento ±0,8 o al corpo; Leggenda
(`natpf_legend.legendServe`) ±1 o al corpo, con forza 1,05–1,45. Già fatti nel B18 e B34: niente tremolio della telecamera
né stelline sul servizio della CPU (`game_engine.js` riga 2029), km/h veri sul tabellone (`natpfArena.setSpeed(w)`, w =
|v|·3,6). Cercato «194» in `natpf-tennis/src`, `site/js` e `site/tennis`: resta solo il commento che ricorda i 194 km/h
fissi di prima.

**Cosa ho fatto** (`natpf_skill.cpuServePlan`, `CPU_SERVE`, tabelle `cpuServe` per livello):
- **direzione**: «T», corpo o largo con i pesi del livello, mai tre volte di fila la stessa (`pickVaried`). A Pro e
  Leggenda gli stessi punti e pesi di prima (ora con il nome); a Casual lontano dalle righe (1,05 / 2,05 / 3,05 m ± 0,2–0,3);
  a Bambini quasi al centro (B48.1: questi punti a Pro, Leggenda e Bambini sono cambiati, §7);
- **effetto**: piatto, kick o tagliato (il tagliato con la curva verso la sinistra di chi batte), mai tre uguali di fila.
  Top spin per livello: Pro 18 / 26 / 14, Leggenda 22 / 28 / 18, Casual e Bambini 14 / 24 / 9 (niente kick: così lento
  rimbalzerebbe sopra la testa di chi risponde), Evento la media tra Casual e Pro; il volo è quello di prima;
- **velocità a Casual e Bambini**: mai più della media dei km/h veri dei servizi di chi gioca **in questa partita**
  (`natpfServeKmh`, si azzera a ogni partita), tra l'88 e il 100% di quella; prima del suo primo servizio 70 km/h (B48.1:
  il servizio più lento possibile di chi gioca, 64 o 59 km/h, §7). La
  palla rimbalza nella metà di fondo del quadrato (5,6–6,1 m dalla rete) con l'aria corretta come per il servizio dal
  gesto (`fixAirServe`), e il volo si allunga finché la velocità non scende sotto il limite. A Evento il limite vale media
  / (1 − k) e cambia il servizio solo quando taglia davvero; a Pro e Leggenda nessun limite.

**Correzioni dopo le misure** (commit `8ffe672`, `adc171d`, `32cee8b`; il primo giro aveva gli effetti del servizio di chi
gioca, 14 / 24 / 9, a tutti i livelli):
- Pro contro «medio» scendeva da 75,9 a 69,9% dei game vinti da chi gioca (sotto il criterio 70–85% di `audit:legend`).
  Prove con gli 8 semi dell'audit (`scripts/audit/b48/pro.mjs`): volo uguale 71,9%; top spin 22 per tutti 81,4%; 18 / 26 /
  14 con il volo di prima 74,5%. Scelto l'ultimo.
- Con 18 / 26 / 14 anche a Casual chi risponde avanzava verso la rete nel 37% delle mosse («tennista», 6 semi × 30 punti;
  base 19,5%): la palla lenta rimbalzava più alta. Con 14 / 9 18,8%.
- A Evento il limite (quasi mai sotto il servizio di prima) spostava comunque il rimbalzo in fondo: 127 km/h a 5,9 m invece
  di 117 a 4,3. Ora no. Il limite arrotondato al decimo lasciava 1 servizio su 500 0,04 km/h sopra la media: ora in giù.
- Leggenda: con 18 / 26 / 14 «preciso» vinceva il 35,0% dei punti contro il 32,9% della base (24 semi): il servizio della
  Leggenda era più facile da rispondere. Con 22 / 28 / 18 (il piatto come il servizio di prima) 33,0%.

**Misure** (`scripts/audit/b48/servizio-cpu.mjs`, profilo «medio», 3 semi × 300 punti, battuta alternata; direzione =
terzo del quadrato dove la palla rimbalza davvero):

| livello | direzione T / corpo / largo (%) | km/h min–p50–max | effetti (top spin) | punti di chi gioca sul servizio CPU |
|---|---|---|---|---|
| Bambini prima | 0 / 100 / 0 | 85–88–92 | 22 sempre | 98,9% |
| Bambini dopo | 15 / 70 / 15 | 60–66–71 | 14 (56%), 9 tagliato (44%) | 99,1% |
| Casual prima | 0 / 100 / 0 | 97–102–106 | 22 sempre | 90,4% |
| Casual dopo | 29 / 39 / 32 | 60–66–71 | 14 (52%), 9 tagliato (48%) | 95,0% |
| Evento prima | 20 / 64 / 16 | 108–117–126 | 22 sempre | 66,8% |
| Evento dopo | 28 / 45 / 27 | 106–115–125 | tre tipi (secondo k) | 64,4% |
| Pro prima | 21 / 56 / 24 | 114–120–126 | 22 sempre | 58,5% |
| Pro dopo | 24 / 54 / 22 | 114–120–126 | 18 / 26 / 14, un terzo ciascuno | 58,7% |
| Leggenda prima | 40 / 27 / 33 | 98–116–125 | 22 sempre | 12,2% |
| Leggenda dopo | 34 / 29 / 37 | 99–116–125 | 22 / 28 / 18, un terzo ciascuno | 11,6% |

Chi gioca, con il servizio del profilo, serve a 66–75 km/h (p50 70). Servizi della CPU più veloci della media di chi gioca
nella stessa partita: Casual e Bambini prima 100%, dopo 0% (anche con i servizi del telefono «insegnato», «piano», «tardi»
e «forte»: 0%; la CPU segue chi serve forte fino a 99 km/h). Tremolio della telecamera sul servizio della CPU: 0 prima e
dopo. Profondità del rimbalzo a Casual e Bambini: 4,0 → 5,9 m dalla rete (p50).

**Test**: `natpf-tennis/test/natpf-b48-servizio-cpu.test.mjs` (6): scelta senza tre uguali; piano a ogni livello (tre
direzioni, gli effetti del livello, mai tre uguali, sempre nel quadrato, il limite solo a Casual e Bambini); nel motore a
ogni livello direzione ed effetto che cambiano, km/h veri sul tabellone dell'arena, nessun tremolio, nessun 194; a Casual e
Bambini mai più veloce dei servizi di chi gioca nella partita (primo servizio ≤ 70 km/h, si riparte a ogni partita); a Pro
e Leggenda nessun limite; la smorzata della Leggenda (sotto).

## 4. Leggenda più da campione (miglioramento 8)

**Cosa c'era.** `natpf_legend.legendDecide` (riga 259 della base): la smorzata entrava tra i colpi candidati ogni volta che
chi gioca era in fondo e la CPU in equilibrio (`hz > 11`, `bz > −10,6`, `q > 0,75`), senza memoria.

**Cosa ho fatto**: `LEGEND.dropEvery` 8 e `dropAllowed`: la smorzata è candidata solo se nessuno degli ultimi 7 colpi della
CPU nella partita lo era (`m.last`). Niente altro cambia nella scelta.

**Misure** (`scripts/audit/b48/smorzate.mjs`, Leggenda, 24 semi × 300 punti; «finestre» = 8 colpi consecutivi della CPU
nella stessa partita):

| contro | smorzate prima | dopo | finestre di 8 con 2 o più, prima → dopo | distanza minima | punti di chi gioca prima → dopo |
|---|---|---|---|---|---|
| medio (adulto medio) | 13,8% (1 ogni 7,3) | 7,5% (1 ogni 13,4) | 29,3% → 0% | 1 → 8 | 13,6 ± 0,5 → 14,8 ± 0,6 |
| amatore | 13,8% | 7,6% | 28,9% → 0% | 1 → 8 | 13,7 → 14,6 |
| umano | 17,0% (1 ogni 5,9) | 8,9% (1 ogni 11,2) | 43,1% → 0% | 1 → 8 | 20,1 → 22,0 |
| tennista | 8,5% | 5,7% | 12,8% → 0% | 1 → 8 | 29,4 → 30,7 |
| preciso | 12,9% | 7,4% | 26,0% → 0% | 1 → 8 | 32,9 → 33,0 |
| bambino | 11,0% | 5,0% | 22,9% → 0% | 1 → 8 | 7,2 → 7,8 |

L'adulto medio sale di 1,2 punti (limite chiesto: 2). Quasi tutto viene dalla smorzata: con la sola smorzata limitata
(servizio di prima) medio 15,2, amatore 13,9, umano 21,5, tennista 30,5, preciso 32,3, bambino 7,2. La smorzata vinceva
punti contro chi resta in fondo; ora la Leggenda gioca al suo posto incrociati, colpi al corpo e tagliati, e la quota del
tagliato resta 14–20% dei suoi colpi (prima 13–19%). «umano» sale di 1,9 punti: è vicino al limite chiesto per l'adulto
medio, e va guardato se si decide di rendere la Leggenda più dura.

`npm run audit:legend` (8 semi × 300 punti), prima → dopo: **«Tutti i criteri rispettati» in tutti e due**. Punti di chi
gioca contro la Leggenda: medio 14,4 → 14,7%, amatore 13,9 → 14,8%, tennista 28,1 → 31,0%, preciso 32,4 → 34,3%,
bambino 6,9 → 7,9%, impreciso 5,6 → 5,8% (con 8 semi la deviazione tra i semi è 1,4–3,6 punti: per decidere valgono i 24
semi della tabella); Pro contro medio 75,9 → 74,5% dei game (criterio 70–85%); Casual contro medio 100 → 100%.

## 5. Prove

Sul ramo dopo l'unione di `natpf-simulator` (`52fb692`, versione 2026-11-14.4), macchina condivisa con un altro agente
(carico 5–22 su 4 processori):

- gioco `npm test` **1639/1639** (8 min 25 s); sito `node --test tools/test/*.test.mjs` **269/269**; LAN **13/13**;
  programma Windows **51/51**; `npm run build` ok; `npm run audit:legend` **«Tutti i criteri rispettati»**.
  Prima dell'unione la suite del gioco sul commit «IN CORSO» dava 1638/1639: l'unico rosso era il tempo del Worker del
  registro con il carico 12 (da solo 21/21).
- Test nuovi: `natpf-b48-ritardo` (4), `natpf-b48-servizio-scelta` (6), `natpf-b48-servizio-cpu` (6).
- Nel browser (Chromium, `CHROMIUM_PATH=/opt/pw-browsers/chromium`, porte 4301–4329):
  - `natpf-servizio-scelta` (nuova): 18/18 (gesto prima del punto più alto → «T», dopo → largo, nei due
    quadrati; la riga sotto «Colpisci!», nella scheda del tutorial, nella guida e nel riquadro dell'allenamento);
  - `natpf-servizio-lancio` 17/17; `natpf-servizio-peso` 8/8 (prima della correzione della lettura di «Ace!»
    7/8 anche sulla base);
  - `natpf-training-flow` 21/21, `natpf-menu` 45/45, `natpf-fine-partita` 47/47, `natpf-formato-fiera` 29/29 (14 min,
    carico 11–16: la parte dello stesso schermo con la grafica in software è lenta; fermata a 580 s la prima volta),
    `natpf-scambi-di-prova` 30/30, `natpf-stesso-schermo-b20` 52/52 (da sola; nel giro con altre due prove in parallelo
    51/52: il richiamo per nome a 1280×720 non era arrivato in tre giri, carico 7–11);
  - `natpf-chi-serve`: 36 controlli su 36 fino a «Lob & Drop contro la CPU», poi ferma su «Lob & Drop, computer del
    Player 2» (tre volte, anche con il carico a 6–8; la grafica in software al 150–240% di CPU per minuti). La stessa prova
    sull'albero della base del B48 (`3d92ce1`) si ferma nello stesso punto: non dipende dal B48 (nel B45.2 e nel B47 la
    prova dava 64/64; qualcosa nell'ambiente di oggi la rallenta lì). Prima di fermarsi la prova è tutta verde: Classici contro
    la CPU (anche in prima persona), computer del Player 2 e stesso schermo, Lob & Drop contro la CPU (batte chi gioca e
    batte la CPU) e il costo del disegno (+0,07–0,39 ms).

**Schermate guardate** (1920×1080, 1280×720, 720×720): «Colpisci!» con la regola sotto, scheda «Servizio» del tutorial
con la quarta riga, guida «Come si gioca» con la regola, riquadro «Guarda e ripeti» dell'esercizio «Servizio»; ledwall
1920×540 del lancio (`natpf-servizio-lancio`). Testi leggibili e dentro lo schermo; a 720×720 la riga sotto «Colpisci!» va
su due righe.

## 6. Cosa non è provato

- Telefoni veri: il tempo del gesto rispetto al punto più alto (±0,15 s) è misurato con il telefono simulato; con un
  telefono vero e la rete della fiera il ritardo del collegamento è tolto come per gli altri colpi, ma non l'ho provato.
  Non so se le persone capiscono la regola dalla sola riga (andrebbe guardato allo stand).
- Ledwall e PC Windows dell'evento: le schermate sono di Chromium su Linux a 1920×1080, 1280×720 e 720×720.
- Le partite simulate usano profili di gioco inventati (B16), non persone vere.
- La Leggenda resta dentro i criteri chiesti, ma con meno smorzate i profili simulati vincono da 0,1 a 1,9 punti in più
  (24 semi): non è più dura di prima. Se serve, si può compensare altrove (per esempio con il colpo che prende il posto
  della smorzata); non l'ho fatto per non cambiare altro.
- Il servizio della CPU si vede solo con «Battuta: Alternata» (B47): con l'opzione di base dello stand la CPU non serve mai.
- La schermata di «Colpisci!» a 720×720 è presa con il gioco fermo: la casella «Al servizio» resta dove era a 1280×720
  (la posizione si ricalcola a ogni fotogramma, che nella prova è fermo); nella partita vera si sposta.

## 7. B48.1 · Correzioni della revisione indipendente

La revisione del B48 (non approvato: un difetto medio, sette bassi) chiedeva sei correzioni. Ramo `b48-servizio` da
`0246d31`; misure «prima» su un albero estratto da `0246d31`, «dopo» sul codice finale; partite simulate senza grafica come
sopra. Script: `natpf-tennis/scripts/audit/b48/` (`servizio-cpu.mjs`, `difficolta.mjs`, `primo-servizio.mjs`,
`smorzate.mjs`, `pro.mjs`).

### 7.1 La risposta al servizio si gioca dopo il rimbalzo (difetto medio)

**Cosa succedeva.** A Bambini il servizio lento e profondo della CPU sale a circa 3,8 m, oltre `PLAN.lobApex` (3 m), e il
piano di chi risponde (`natpf_impact.planPlayerIntercept`) sceglieva la «schiacciata prima del rimbalzo»: il personaggio
correva fino a 2,6–5,6 m dalla rete e colpiva al volo, e il punto continuava. Nel tennis vero quel punto va a chi batte.
Misura (battuta alternata, la CPU batte per prima nei semi pari, 8 semi × 300 punti): «medio» 12 servizi su 1199 (1,0%),
«bambino» 7 su 958 (0,7%), negli altri livelli 0. Con i semi dell'audit «impreciso», che serve piano, 363 su 1157 (31,4%).

**Correzione.** Sulla risposta al servizio (`rallyStrokeCount` ≤ 1, non le palle del lanciapalle e degli scambi di prova,
`natpfFeed`) il piano non sceglie né la schiacciata né la volée al volo: si gioca dopo il rimbalzo. **Dopo:** 0 servizi
colpiti al volo a tutti i livelli («medio» e «bambino», 8 semi × 300 punti; anche «impreciso» e «umano» a Casual e
Bambini).

La regola del 31/10 sulla schiacciata in risposta resta: in risposta la palla è «alta» solo sopra 2,3 m e lì la
schiacciata voluta si legge e si gioca. Il test D7 del B18 che faceva schiacciare al volo un servizio «a campanile» (apice
5,5 m, contatto prima del rimbalzo) ora controlla la risposta dopo il rimbalzo e la schiacciata voluta sulla palla davvero
alta; lo stesso il test B20 A1 dello stesso schermo (`natpf-b20-specchio`): la risposta a quella palla è ora dopo il
rimbalzo e uguale per il Player 1 e il Player 2, la schiacciata voluta resta nello scambio (trovato solo dalla suite completa
dopo l'unione: non era tra i test mirati).

**Test** `natpf-b48-risposta-servizio.test.mjs` (3): il caso della revisione, la volée da vicino alla rete, il lanciapalle
come prima, partite simulate a Bambini senza servizi colpiti al volo. Sul codice di prima falliscono tutti e tre; togliendo
la sola esclusione della volée fallisce il secondo.

### 7.2 Test che proteggono davvero le tarature del B48

Prima le tarature del B48 erano protette solo da impronte. Ora ogni taratura ha un test, e ogni test è stato provato in una
copia togliendo la correzione (fallisce in tutti i casi):

| taratura | test | togliendo la correzione |
|---|---|---|
| `choiceReach` 1,625 | banco del servizio, servizio perfetto, forte ed esterno: ace a Casual 5–9,5%, a Pro 5–10% (misura 6,8 e 6,8%) | con 1,6: Casual 2,5% |
| riga della regola nella guida «Come si gioca» | la scheda «Il servizio» del telefono dice prima → al centro, dopo → larga; webcam e mouse no | senza la riga: fallisce |
| effetti per livello (Pro 18/26/14, Leggenda 22/28/18, Casual e Bambini 14/9, Evento la media) | top spin della palla vera nel motore per ogni effetto e livello | Pro 14/24/9 o Leggenda 18/26/14: fallisce |
| cancello di Evento (`cpuPlan.deep ‖ v > limite`) | a Evento il servizio non profondo resta a 3,8–5,3 m e oltre 100 km/h; a Casual e Bambini con chi serve forte sempre profondo | senza cancello: 129 km/h a 6,0 m; senza `deep`: Casual a 3,7 m |
| limite arrotondato in giù | con lo scarto più alto e la media 66,667 il limite resta sotto la media | con l'arrotondamento al decimo: 66,7 |

In più `natpf-b48-pro-criterio.test.mjs` porta in `npm test` il criterio di non regressione di Pro di `audit:legend` (contro
«medio» 70–85% dei game, gli stessi 8 semi × 300 punti): 73,1%. **Attenzione:** con il servizio del B48.1 questo criterio
non distingue più gli effetti di Pro: con 14/24/9 Pro contro «medio» dà 74,8% (24 semi 74,7%), con 18/26/14 73,1% (24 semi
75,1%). La scelta 18/26/14 resta (è più vicina al servizio di prima, top spin 22) ed è protetta dal test dei valori.

### 7.3 Controllo seme per seme e impronte dello stesso schermo

- `natpf-racchetta-motore`: il tetto delle mosse verso la rete (< 25%) è di nuovo seme per seme. Con il servizio del B48.1
  a Pro il seme 4 in 30 punti non aveva più nessuna palla fuori da lasciare andare (prima 2; in 100 punti 12, prima 7):
  la prova gioca 40 punti per seme invece di 30, con tutti i controlli seme per seme (Casual 22,7 e 23,0%, Pro 13,9 e
  10,0%, Leggenda 3,7 e 8,5% di mosse verso la rete).
- `natpf-b25-stesso-schermo`: le impronte B31 girano con la direzione del servizio di prima; in più le stesse due partite
  con la scelta del servizio accesa (`dce0c9a62a22`, `cfaed93ad0e7`) e la partita con tutte le regole di oggi
  (`97ae13c39fb3`). Togliendo la scelta dal telefono il test fallisce.

### 7.4 Il primo servizio della CPU non va più forte del servizio più lento possibile di chi gioca

**Cosa succedeva.** Prima di conoscere un servizio vero di chi gioca (con «Battuta: Alternata» e «Batte per primo: CPU», il
primo game) la CPU serviva a 70 km/h (61,6–70), più forte di un bambino che poi serviva a 64–69 km/h.

**Servizio più lento possibile di chi gioca**, misurato nel motore (Casual e Bambini, i due quadrati, ogni momento del colpo):

| racchetta | servizio più lento |
|---|---|
| telefono, forza 0 (ogni momento, forma e mano) | 64,9 km/h |
| mouse e tastiera, forza 0, con la mira verso la «T» | 59,4 km/h |
| webcam (servizio di «argon», ogni altezza del lancio) | 66,8 km/h |

**Correzione** (`natpf_skill.firstServeKmh`): prima del primo servizio di chi gioca la media vale 64 km/h con il telefono
(`firstKmhPhone`) e 59 con le altre racchette, con la modalità prova (mouse e tastiera accesi accanto al telefono) e senza
interfaccia (`firstKmh`). La CPU serve allora a 56–64 o a 52–59 km/h. Più in basso la palla non arriva in fondo al
quadrato sotto il limite (a 55 km/h 4 servizi su 40 restavano sopra).

Una palla così lenta sale (apice 4–5 m) e rimbalza alta: chi risponde la prende in salita, fino a 2–3 m più avanti
(contatto a 8,3–10 m dalla rete), come già nel B48 con chi serve piano. **Provato e scartato:** farla rimbalzare a metà del
quadrato (4,1–4,6 m). Chi risponde arretrava e la prendeva in discesa a 13,7 m, e «umano» (il profilo che colpisce 0,2–0,3
s dopo il rimbalzo) vinceva il 12–15% dei punti sul servizio della CPU invece dell'80%; con le partite normali −10 punti a
Casual e Bambini.

Caso peggiore del primo game (`primo-servizio.mjs`: ogni servizio della CPU come se chi gioca non avesse ancora servito, 4
semi × 200 punti; punti di chi gioca sul servizio della CPU, prima → dopo con il telefono → dopo senza interfaccia):

| profilo | Casual | Bambini |
|---|---|---|
| umano | 80,8 → 86,0 → 74,0 | 74,0 → 88,7 → 82,0 |
| bambino | 51,8 → 52,8 → 51,7 | 82,6 → 81,2 → 83,3 |
| medio | 94,0 → 92,6 → 97,7 | 98,8 → 99,0 → 99,0 |
| amatore | 86,1 → 86,9 → 89,0 | 98,3 → 98,0 → 99,0 |
| impreciso | 61,9 → 66,3 → 67,0 | 82,8 → 87,1 → 84,2 |

Chi risponde avanza di 1,5 m o più nel 21–75% di questi servizi prima, nel 48–80% con il telefono e nel 64–90% senza
interfaccia.

**Test** (`natpf-b48-servizio-cpu`): il servizio più lento possibile per racchetta, misurato nel test, sta sopra
`firstKmh` e `firstKmhPhone`; nelle partite (battuta alternata, batte per prima la CPU) i primi 4 servizi della CPU con il
telefono, con mouse e tastiera, con il telefono e la modalità prova, con la webcam e senza interfaccia non lo superano mai.
Con 70 km/h fallisce. `natpf-campo-aperto-23-10`: il controllo di prima (chi risponde avanza meno di 1,5 m) resta con il
servizio a velocità normale; sul primo servizio lento chi risponde avanza meno di 3 m e colpisce oltre 8 m dalla rete
(la corsa a metà campo di prima era di 5–6 m).

### 7.5 Servizio della CPU vario nei rimbalzi veri; servizi profondi a Pro, Evento e Leggenda

**Cosa succedeva.** Il piano non ripeteva mai tre volte la stessa direzione, ma il rimbalzo vero no: a Pro, Evento e
Leggenda il servizio volava con l'aria senza correzione e rimbalzava a circa 0,865 dello spostamento voluto, e a Bambini
«T» e «largo» erano a cavallo dei terzi del quadrato. I servizi di questi livelli erano anche sempre corti (p50 4,3 m dalla
rete, mai oltre 5,3).

**Correzione.**
- La x del piano è il rimbalzo vero a ogni livello. Con il limite o il servizio profondo la correzione dell'aria c'era già
  (`fixAirServe`); per gli altri servizi `aimServeX` corregge solo la velocità di lato, quindi profondità e velocità restano
  quelle di prima.
- Ogni direzione sta nel suo terzo (`serveThird`), con almeno 7 cm di margine. Pro e Leggenda usano i punti dei rimbalzi
  veri di prima: «T» 1,12 ± 0,18 e 1 ± 0,3 m, corpo 2,05 ± 0,55 e ± 0,5, largo 2,93 ± 0,12 e 3,12 ± 0,28. A Bambini «T»
  1,1 ± 0,15, largo 3 ± 0,15, pesi 0,3 / 0,4 / 0,3.
- A Pro e Leggenda il 15% dei servizi è profondo (`cpuServe.long`, Evento la media con Casual): rimbalzo a 5,6–6,1 m dalla
  rete, alla velocità che il servizio normale avrebbe avuto.

Con il 30% di servizi profondi Pro contro «medio» scendeva al 70,9% dei game (8 semi; 24 semi 73,5, prima 75,2) e
«tennista» contro la Leggenda da 31,0 a 28,1% dei punti. Con «T» a 1,05 ± 0,25 e largo a 3,02 ± 0,2 a Pro (più angolati di
prima) 71,7%.

**Misure** (`servizio-cpu.mjs`, 4 semi × 240 punti, battuta alternata con la CPU che batte per prima nei semi pari,
servizio di chi gioca del profilo, «insegnato» e «forte»; rimbalzo vero):

| livello | rimbalzi T / corpo / largo (%) prima → dopo | massimo di fila nello stesso terzo | profondità p50 / p90 (m) | km/h p50 |
|---|---|---|---|---|
| Bambini | 12–16 / 68–72 / 13–20 → 30–33 / 36–40 / 29–31 | 11–20 → 2 | 5,9 / 6,1 → 5,9 / 6,1 | uguali |
| Casual | 31–34 / 34–40 / 27–32 → 29–33 / 38–41 / 29–32 | 2 → 2 | 5,9 / 6,1 → 5,9 / 6,1 | uguali |
| Evento | 26–28 / 48–52 / 22–25 → 31–32 / 32–37 / 32–36 | 7–9 → 2 | 4,3 / 4,8 → 4,3–4,4 / 5,6–5,7 | 116–117 → 116–117 |
| Pro | 24–26 / 50–53 / 23–25 → 31–34 / 33–34 / 32–36 | 6–10 → 2 | 4,4 / 4,8 → 4,5 / 5,8 | 120 → 120 |
| Leggenda | 35–37 / 28–31 / 34 → 34–35 / 31–32 / 32–36 | 4 → 2 | 4,2–4,3 / 4,8 → 4,3–4,4 / 5,7–5,8 | 116 → 116 |

Servizi della CPU più veloci della media di chi gioca: 0 prima e dopo. Tremolio della telecamera: 0. Tabellone diverso dai
km/h veri: 0.

**Difficoltà** (`difficolta.mjs`: punti di chi gioca, gli 8 semi di `audit:legend` × 300 punti, battuta alternata; prima
→ dopo):

| livello | medio | amatore | umano | tennista | preciso | bambino | impreciso |
|---|---|---|---|---|---|---|---|
| Bambini | 99,2 → 99,5 | 98,7 → 98,7 | 80,6 → 82,6 | 100 → 100 | 100 → 100 | 83,8 → 83,9 | 88,1 → 85,7 |
| Casual | 94,5 → 94,5 | 87,0 → 87,0 | 84,5 → 84,5 | 99,0 → 99,0 | 99,9 → 99,9 | 51,8 → 51,8 | 63,5 → 65,9 |
| Evento | 66,3 → 66,0 | 65,2 → 65,4 | 69,1 → 68,5 | 91,2 → 91,7 | 94,0 → 93,9 | 50,3 → 49,7 | 59,0 → 58,7 |
| Pro | 60,7 → 60,1 | 53,2 → 53,8 | 61,7 → 62,3 | 92,0 → 93,2 | 97,0 → 96,8 | 17,8 → 18,0 | 21,1 → 22,5 |
| Leggenda | 14,7 → 13,9 | 14,8 → 14,1 | 21,6 → 20,8 | 31,0 → 28,6 | 34,3 → 31,4 | 7,9 → 7,5 | 5,8 → 6,0 |

Le cinque differenze oltre 2 punti con 8 semi sono state rifatte con 24 semi:

| livello e profilo | 8 semi | 24 semi |
|---|---|---|
| Bambini «umano» | +2,0 | 80,7 → 82,5 (+1,8) |
| Bambini «impreciso» | −2,4 | 87,6 → 85,9 (−1,7) |
| Casual «impreciso» | +2,4 | 63,6 → 64,5 (+0,9) |
| Leggenda «tennista» | −2,4 | 30,7 → 29,3 (−1,4) |
| Leggenda «preciso» | −2,9 | 33,0 → 33,2 (+0,2) |

Con 24 semi tutte le differenze stanno entro 2 punti. Leggenda con 24 semi (`smorzate.mjs`): medio 14,8 → 14,2, amatore
14,6 → 14,7, umano 22,0 → 21,4, tennista 30,7 → 29,3, preciso 33,0 → 33,2, bambino 7,8 → 7,2. Le smorzate restano al più
una ogni 8 colpi: 0 finestre di 8 con due smorzate, distanza minima 8. A Casual e Bambini le differenze per «impreciso»
vengono dalla risposta al servizio dopo il rimbalzo (7.1), già sul commit `31a0f6f`, non dal servizio della CPU: a Bambini
«impreciso» schiacciava al volo il 31% dei servizi della CPU.

`audit:legend`: **«Tutti i criteri rispettati»** prima e dopo; Pro contro medio 74,5 → 73,1% dei game, Casual 100 → 100%.

### 7.6 Documenti

- §2: la minaccia per la CPU non resta quella di prima (correzione sopra).
- `docs/PROJECT_MEMORY.md` §B48: minaccia, rimbalzi nei terzi, servizi profondi, `firstServeKmh`, risposta dopo il rimbalzo.
- `docs/GUIDA_STAND.md` 8.3: «Bambino» e «Ragazzo» (la CPU non serve mai più forte di chi gioca), «Adulto» (livello Evento:
  in pratica nessun tetto, servizio forte e più vario).

### 7.7 Prove del B48.1

Rifatte nella ripresa del 15/11 sul codice unito (versione 2026-11-14.8, poi 14.9):

- Suite del gioco **1734/1734** (dopo la correzione del test del pannello; sulla 14.8 1733/1734 per quel solo test),
  sito 275/275, desktop 51/51, LAN 13/13.
- `audit:legend`: **«Tutti i criteri rispettati»**, Pro contro medio 73,1% dei game, Casual 100% (uguale al §7.5).
- Nel browser: `natpf-servizio-scelta` **18/18**, `natpf-leggenda` **7/7** (riferimento per lato, B50), `natpf-fine-partita`
  56/56; `natpf-servizio-peso`, `natpf-chi-serve`, `natpf-scambi-di-prova`: nel registro dei passi della ripresa.
- **Revisione mirata del B48.1** (mai fatta prima: il passaggio §4.2 la consigliava): ogni correzione tolta a turno in una
  copia, con `mut.sh` (`docs/consegna/2026-11-15/sonde/b48/mut.sh`). Tutte prese dai test:

| correzione tolta | test che se ne accorgono |
|---|---|
| risposta al servizio di nuovo al volo (`natpf_impact.js`, `serveReturn = false`) | `natpf-b48-risposta-servizio` 3 su 3 rossi |
| `firstKmhPhone` 64 → 70 (valore di prima) | `natpf-b48-servizio-cpu` test 11 |
| `repeat: 0` (stesso servizio senza limite) | `natpf-b48-servizio-cpu` test 1, 2, 7 |
| niente servizio profondo (`long = false`) | `natpf-b48-servizio-cpu` test 2, 7 |
| terzi di Pro squilibrati (15/70/15) | `natpf-b48-servizio-cpu` test 8 |


### 7.8 Cosa non è provato nel B48.1

- Persone vere: non so se a una persona vera il servizio lentissimo del primo game (52–64 km/h, alto) piace o la fa
  avanzare troppo. Nelle partite simulate «umano» vince il 74–89% dei punti su quel servizio, come prima.
- Telefoni veri, PC Windows dell'evento, ledwall: come per il B48.
- Il criterio di Pro in `npm test` non distingue più gli effetti 18/26/14 da 14/24/9 (7.2).
