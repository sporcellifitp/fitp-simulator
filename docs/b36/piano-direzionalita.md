# B36 · Piano finale: la direzione al centro del gioco, campo aperto, stile arcade

**Stato.** Piano finale, dopo tre revisioni contrarie: «gioco e obiettivi», «tecnica e regressioni», «stand e
misurabilità». Solo analisi: nessun file del repository toccato, nessun commit. **Niente codice prima del sì
dell'utente**, nemmeno per la prima tappa.

**Base.** `natpf-simulator` 2026-11-13.9 (worktree di riferimento `a2ef49e`). Letti in sola lettura i due rami che stanno
per essere uniti: B37 (`b37-collaudo-bis`, `2bfe09a` più lavoro non salvato) e B42 (`b42-scambi-lunghi`, documento del
13/11 alle 17:32). I loro numeri vanno rifatti sul codice unito. Con B42 unito la chiamata a `strokeOutcome` passa da
`game_engine.js:2355` a `:2360` e riceve anche `hotPress`.

**Da dove viene.** La bozza (`piano/bozza.md`), le tre revisioni (`piano/revisore-gioco.md`, `revisore-tecnica.md`,
`revisore-stand.md`), le cinque letture, i tre piani e il video 1 di `docs/b36/analisi/`, le decisioni dell'utente ancora
valide (`docs/RIPRESA_AGENTE.md` §4, `docs/PROJECT_MEMORY.md`).

**Segni.**
- **[V]** verificato sul codice della 13.9 (file:riga) o eseguendo il codice vero.
- **[P]** prototipo: una palla (18 m/s, contatto a 11,4 m dalla rete), niente motore, niente telefono simulato, niente centro
  che impara. «Oggi» = `strokeOutcome` vero, con il rimbalzo vero stimato a 0,86 dello spostamento laterale. Da rifare
  con il banco vero.
- **[R]** numero di una revisione, letto nei suoi file di uscita.
- **[L]** dalle letture, non ricontrollato. **[D]** deduzione o proposta. **[B37]**, **[B42]** dai rami non ancora uniti.

**Prove nuove per questo piano** (sola lettura, cartella
`docs/b36/piano/verifica-finale/`):
`finale.mjs` → `finale.txt` (regola finale contro oggi: curva da 0 a 90°, calamita, riga, 10 ms, tempo, matrice);
`corto.mjs` → `corto.txt` (angolo corto continuo); `prova.mjs` → `prova.txt` (valori della prova di due minuti);
`qspan.txt` e `cont.txt` (taratura della riga in corsa).

---

## 1. In breve

1. Nella modalità nuova («Direzione dei colpi: Nuova») la palla va dal lato dove **giri** la cima del telefono, rispetto al
   tuo colpo normale. Non si «punta» lo schermo: si gira di circa 15° per l'angolo, un po' di più per la riga.
2. Il momento del colpo è un ritocco. Sposta la palla al massimo di circa un metro (oggi fino a 3 m). Con la cima girata non
   la manda più dall'altra parte. Esempio [P]: cima girata verso il centro e colpo un attimo dopo: oggi 1,5 m dal centro,
   con la nuova 3,3 m.
3. Colpendo a tempo, fino a circa 17° di giro, la palla va quasi dove va oggi. La differenza si vede in due casi: quando il
   momento del colpo va contro la cima, e quando giri di più. Oggi oltre 17° la palla non va più in là; con la nuova arriva
   alla riga.
4. La riga si prende con il giro giusto, circa una volta e mezza il giro dell'angolo. Girando ancora di più la palla rientra
   piano verso l'angolo. Con un colpo pulito non esce mai per il solo giro, a nessun livello. In corsa, in allungo o molto
   fuori tempo la palla vicino alla riga può uscire, e la scritta lo dice quando la palla cade (B37).
5. Si arriva dappertutto: incrociato profondo, lungolinea, centro, angolo corto (cima girata e colpo più morbido del tuo
   solito). La palla cade dove hai mirato: oggi l'aria la porta circa il 14% verso il centro.
6. All'inizio, nella modalità nuova, niente palle corte e niente volée, né tue né della CPU (Leggenda compresa). Schiacciata,
   pallonetto, servizio e colpo super restano.
7. «Classica» resta il valore di base ed è identica a oggi. Webcam, mouse e tastiera non cambiano.
8. Prima di cambiare il gioco si misura (prima tappa): quanto le persone girano davvero la cima e se mirano con la cima o con
   il momento del colpo. Se le misure dicono che la cima è troppo imprecisa, si torna da te prima di scrivere la regola.
9. Si prova a tre traguardi: **A** (regola completa, da provare a Bambino, Ragazzo e Adulto), **B** (insegnata ed
   equilibrata a tutti i livelli), **C** (accesa di base). Le versioni in mezzo dicono «Nuova: in lavorazione, non da
   provare».
10. Il 13/11 hai detto «direi bene con la precisione»: la modalità nuova cambia proprio questo. Per questo resta un
    interruttore, e decidi tu.

---

## 2. Decisioni per te

Per ognuna la risposta consigliata è la prima, in grassetto.

**D1 · Chi decide la direzione nella modalità nuova.**
- **La cima decide il lato. Il momento del colpo sposta la palla di circa un metro. Con la cima girata la palla resta dal
  lato della cima.**
- Il momento del colpo conta un po' di più: fino a circa un metro e mezzo, sempre dal lato della cima.
- Come oggi: cima e momento contano uguale. B36 fa solo il resto (campo intero, righe, niente palle corte e volée).
- Perché: è il tuo punto 1 (la direzione che dai decide dove cade la palla ed è il fattore principale) e toglie i colpi che
  si annullano. Oggi, cima girata verso l'esterno del tutto e colpo un attimo prima: la palla cade a 0,35 m dal centro; con
  la nuova a 2,2 m [P].
- Prezzo: chi oggi mira con «un attimo prima, un attimo dopo» perde gran parte di quel comando. Testi e dimostrazioni
  cambiano.
- La scelta si conferma con le misure della prima tappa. Se le persone mirano soprattutto con il momento del colpo, si torna
  da te prima di scrivere la regola.

**D2 · Palle corte e volée nella modalità nuova.**
- **Spente, per te e per la CPU (Leggenda compresa).** Il gesto della palla corta diventa un tagliato morbido. Chi gioca
  aspetta il rimbalzo e non sale a rete da solo. La CPU non fa palle corte e non sale a rete. Restano schiacciata,
  pallonetto, servizio e super. Allenamento, minigiochi e tutorial non cambiano. Con «Classica» tutto come oggi.
- Restano, con le regole di oggi.
- Perché: è la tua richiesta (all'inizio niente palle corte e niente volée) e nel video si gioca tutto da fondo campo.

**D3 · Le righe.**
- **Un colpo pulito non esce mai per il solo giro, a nessun livello. La riga si prende con il giro giusto; girando troppo la
  palla rientra verso l'angolo. In corsa, in allungo o fuori tempo la palla vicino alla riga può uscire, e la scritta dice
  perché.**
- A Leggenda (oppure a Esperta e Leggenda) girando troppo la palla esce («troppo angolato»).
- Perché: la precisione si premia senza fuori a sorpresa. Con un colpo pulito la riga voluta cade tra 3,6 m e la riga 72
  volte su 100, fuori mai [P]. La seconda risposta renderebbe la Leggenda più dura con una regola per chi gioca; la tua
  decisione dell'8/11 (B16 a) dice che la Leggenda è più dura grazie alla CPU.

**D4 · Come si impara la cima e cosa vedi.**
- **Una riga nella pagina in cui il visitatore aspetta di cominciare (oggi «Pronto per la partita»): «Gira la cima: la palla
  va da quella parte». Quando la palla cade, una parola in più nella scritta che c'è già («Lungolinea», «Angolo», «Sulla
  riga»). Nessun mirino e nessuna scritta nuova durante il gioco.**
- In più, dopo gli scambi di prova, due palle «gira la cima a sinistra» e «a destra» (3–5 secondi in più a visitatore;
  misurano anche il giro vero di ognuno).
- Niente di nuovo.
- Perché: chi non scopre la cima, con la modalità nuova, vede palle più al centro. Simulato: un bambino che non mira passa
  dal 30% al 13–14% di palle oltre 2,5 m dal centro [R]. Il tutorial corto non parla della direzione. Le due palle costano
  tempo a ogni visitatore: si aggiungono solo se il registro mostra che i visitatori non scoprono la cima.

**D5 · Come proviamo.**
- **Due prove da due minuti, scritte passo per passo, con il solo mouse e il telefono (traguardi A e B). In fiera resta
  «Classica» fino al traguardo C. Se vuoi, giornate con una regola sola: il registro le confronta e la classifica di ogni
  giorno resta con una regola sola.**
- Solo le prove da due minuti.
- Perché: due minuti dicono se la sensazione è giusta. I numeri veri (fuori, palle angolate, durata delle partite) li dà il
  registro su molte partite.

**D6 · Quando si comincia.**
- **La prima tappa (solo misure: il gioco non cambia) parte subito dopo B43, accanto alla prima parte di B41. Ti chiede due
  cose: ricaricare una volta il Worker del registro, e 15–20 minuti con tre persone a Precision.**
- Dopo tutta la coda, come deciso.
- Perché: le misure servono prima di scrivere la regola, e così il registro raccoglie dati mentre si fanno B41, B38, B39 e
  B40. Le tappe che cambiano il gioco restano dopo la coda.

**Scelte tecniche** (non te le chiedo: si scrivono nel documento con il numero che le decide).
- Sensibilità della mira: resta 17° («alta»), si rivede con il registro (B16 d: «ok ma come lo misuro?»).
- Riferimento della mira: si sceglie per partita, con il rumore (B36.3).
- Scambi di prova: restano come sono (4–6 palle).
- Accensione per gruppi: prima Bambino, Ragazzo e Adulto, poi Pro e Leggenda.
- Se un livello diventa più facile si corregge la CPU (B16 a; «Pro resta com'è» dell'11/11), senza togliere il premio della
  direzione (criterio 10).
- Webcam, mouse e tastiera restano con la regola di oggi.
- Peso del tempo: 0,3, oppure proporzionale alla cima (D1, seconda risposta).
- I documenti non sono d'accordo su «Leggenda e salita a rete» (`docs/PROJECT_MEMORY.md:832` e RIPRESA §4 contro il codice,
  `natpf_net_play.js:76-89`): si chiarisce fuori da B36. Con «Nuova» la salita non c'è a nessun livello.

---

## 3. Prima tappa: B36.0 «Misurare prima» (il gioco non cambia)

**Perché.** Tutta la regola poggia su un numero che nessuno ha misurato: quanto è preciso il giro della cima di una persona
vera. E su una domanda: le persone mirano con la cima o con il momento del colpo? La bozza lo misurava per ultimo. Ora si
misura per primo. In più oggi i giocatori simulati dei banchi giocano solo la regola di oggi: senza questa tappa nessun
banco vedrebbe «Nuova».

**Cosa fa** (è codice, ma il gioco non cambia: impronte e `audit:legend` identici).
1. **Registro dello stand.** Tutti i campi insieme, così il Worker si ricarica una volta sola.
   - Riga «colpo» del telefono: piatto, scarto della cima in gradi, tempo in unità della finestra, rimbalzo vero (x e z),
     fuori al rimbalzo vero, colpo giocato con la regola nuova. Nei minigiochi: la zona chiesta da Precision.
   - Riga «partita»: il modello della direzione.
   - Nomi proposti: `pf`, `dv`, `tu`, `rx`, `rz`, `fu`, `nr`, `zp`, `dir`. Vanno nelle due copie (`registro_formato.js:48` e
     `cloudflare/registro-worker.js`), che un test vuole uguali.
   - Oggi la riga «colpo» ha la mira totale e il bersaglio del motore, non il piatto né il tempo in finestre, e segna
     «fuori» solo i colpi falliti (`registro_registratore.js:343-356`) [V]. I colpi dei minigiochi ci sono già (`:331`) [V].
2. **Riassunto del registro** (`scripts/registro/riassunto.mjs`): una sezione «Direzione» per modello e livello, come «Scambi
   lunghi» di B42. Dentro: quanto si gira la cima (mediana, dispersione, quota oltre 45° e oltre 60°), quanto pesa il tempo,
   Precision «zona chiesta → dove è caduta», gli obiettivi dello stand E1–E5 (§7.6).
3. **Giocatori simulati.**
   - I profili con il telefono di `scripts/audit/rally-balance.mjs` (tennista, amatore, bambino, umano) e `b19/due-umani*.mjs`
     mandano anche `aimDev` e `aimFull`, ricavati dagli stessi sorteggi. Con «Classica» le impronte restano identiche bit per
     bit. Oggi non li mandano (`rally-balance.mjs:42-64`) [V], e da `rally-balance` dipendono 18 banchi della 13.9 più
     quello di B42 (`legend`, `cpu-pressione`, `evento-bambini`, `rete`, `movimento`, `palla-corta`, `b25/impronte`…) [V].
   - Profili nuovi: «medio con il telefono» e «gira tanto» (giro 30 ± 12° e 40 ± 12°). Il «bambino» del banco è già il
     visitatore che non mira (`intent: 0`, `rally-balance.mjs:27`) [V].
   - Ogni banco stampa quanti colpi hanno usato la regola nuova. Dalla B36.1 un test fallisce se con «Nuova» sono zero.
4. **Banco della direzione esteso** (`scripts/audit/direzione-telefono.mjs`):
   - tre posizioni della palla; serie come quote su almeno 20 serie con semi diversi; partite con il rumore
     (`colpi.mjs --mode=partite`);
   - fuori giudicato sul rimbalzo vero, con la tolleranza dell'arbitro (+0,22 m di lato, `game_engine.js:3191`) [V]. Oggi il
     banco lo giudica sul bersaglio (`direzione-telefono.mjs:104`) [V];
   - errore del seme degli scambi di prova, con il telefono simulato (rumore di posa e di velocità);
   - stessa mira con un'attesa della posa «pronto» di 0, 0,5, 1 e 2 secondi.

**Cosa fai tu** (solo mouse e telefono).
1. Ricaricare una volta il Worker del registro. Le istruzioni, passo per passo, arrivano con la versione.
2. 15–20 minuti con tre persone: un tennista, una persona che non gioca, un ragazzo se c'è. Ognuna fa due Precision «come
   ti viene» e due «gira la cima verso la zona» (Minigiochi → Precision, con «Classica»). In tutto circa 120 palle con un
   bersaglio noto. Precision si avvia con il mouse e ha dieci zone fisse (`natpf_arcade.js:103-114`) [V].
3. Facoltativo: la prova guidata della diagnostica. Oggi si apre con Maiusc+D, quindi serve una tastiera; dopo B39 con il
   mouse.

**Cosa ne esce.**
- Quanto sparge il giro voluto: con circa 100 palle la dispersione si stima con un errore di 1–1,5° [D].
- Se chi ha un bersaglio lo cerca con la cima o con il momento del colpo.
- Quante mire vere superano 45° e 60°.
- L'errore del seme degli scambi di prova: simulato subito, dal registro quando ci sono partite vere.
- Quanto conta l'attesa della posa «pronto».

**Il cancello** (dopo B36.0, prima di qualunque regola nuova). Si va avanti con il piano se:
- il giro voluto sparge entro circa 15°, su almeno 100 palle di Precision di almeno 3 persone;
- nei blocchi «gira la cima» la cima va verso la zona in almeno 8 palle su 10;
- gli scarti oltre 45° sono al più il 5%.

Altrimenti si torna da te con i numeri e una proposta: sensibilità più bassa, più peso al momento del colpo (D1, seconda o
terza risposta), oppure prima la tappa del telefono (B36.9). Se nei blocchi «come ti viene» le persone mirano soprattutto
con il momento del colpo, la D1 si rivede con te.

**Lavoro e rischio.** Un blocco medio, come B35a. Rischio basso. Può andare accanto a B41 parte 1: B41.1–B41.3 toccano
soprattutto `site/js/tennis` (`docs/b41/progetto-modalita-fiera.md` §6). Se più avanti B41.4 aggiunge campi al registro, il
Worker si ricarica una seconda volta.

---

## 4. La regola della direzione

### 4.1 Chi decide cosa

| Cosa fa chi gioca | Cosa misura il gioco | Cosa decide |
|---|---|---|
| Gira la cima all'impatto | scarto in gradi dal proprio colpo normale (`natpf.aimDev`, `natpf_phone_racket.js:274`) [V] | **la direzione**, peso pieno |
| Colpisce prima o dopo | tempo in unità della finestra (B35a: `te`, con il ritardo abituale `lag`) | un ritocco (0,3); oltre la finestra un errore con un verso preciso |
| Colpisce più forte o più morbido del solito | forza; per l'angolo corto solo la parte relativa al proprio colpo tipico | profondità, velocità, altezza sulla rete (come oggi); angolo corto |
| Testa che sale, in piano, dall'alto | forma del colpo (`classifyStroke`) | tipo di colpo (come oggi) |
| Corre, si allunga, non prepara; palla veloce; scambio lungo | qualità della situazione, senza lo scambio caldo | quanto tiene la fascia della riga, profondità; **non** aggiunge caso |
| Niente: lo decide il movimento automatico | dove sta la palla | niente sulla direzione (punto neutro al centro) |

### 4.2 La formula

```
scarto  = cima all'impatto − proprio centro, in gradi                 natpf.aimDev
r       = max(0 ; |scarto| − 3°) / (P − 3°)                           P = mira piena dello staff (17/20/23°)
piatto  = segno · curva:  r                   fino a 1,6  (a 25,4° con P 17°)
                          da 1,6 rientra a 1,0 a 45°   (la riga si prende con il giro giusto)
                          da 1,0 a 45° scende piano a 0,7 a 90°   (oltre 60° misura dubbia, segnata in diagnostica)
          aimDev nullo (centro non ancora imparato, gesto verticale, telefono senza direzione): piatto 0, regola nuova
tempo   = clamp(te ; −1 ; +1)              te di B35a con il ritardo abituale (lag); il ritmo (rRest) esce dalla direzione
mira    = piatto − c · 0,3 · tempo         c = +1 dritto del destro e rovescio del mancino, −1 l'altro lato
FASCIA SICURA       |mira| ≤ 1            x = mira · A               A = 3,2 m (0,9 m dentro la riga); punto neutro al centro
FASCIA DELLA RIGA   |mira| da 1 a 1,6     x = A + h · (L − A) · (|mira| − 1)/0,6     L = 4,0 m; lineare: niente accumulo
                    oltre 1,6 (solo con il tempo nello stesso verso) resta su L
PARTE NON TENUTA    x += (1 − h) · K · (eccesso del giro senza il rientro)          K = 2 m per unità
                    h = clamp((qualità della situazione − assistQ)/0,2 + 0,5)
OLTRE LA FINESTRA   x −= c · segno(te) · min(D · eccesso ; 45 m/s · secondi oltre il bordo)      al più 0,45 m ogni 10 ms
LANCIO              il rimbalzo vero cade su x (aria corretta anche di lato): solo telefoni con la forma, solo «Nuova»
```

- `assistQ` è quello di oggi: 0,5 Bambini, Facile ed Evento · 0,6 1v1 · 0,62 Esperta · 0,8 Leggenda
  (`natpf_stroke_outcome.js:196-215`; Bambini ed Evento passano dalla riga «casual» di `assistOf`, `:219`) [V].
- La «qualità della situazione» è `quality × pressure` di oggi senza il tempo (`game_engine.js:2348-2350`) [V] e senza la
  pressione dello scambio caldo (`hotPress` di B42) [B42].
- D è quello della bozza (1,6 Bambini, Facile ed Evento · 1,8 Esperta e 1v1 · 2,7 Leggenda); il tetto di 45 m/s vale a
  tutte le velocità.
- Con h = 1 (colpo pulito) la parte non tenuta è zero: girando troppo la palla rientra e non esce. Con h < 1 (in corsa,
  in allungo, palla veloce, scambio lungo) girare oltre il giusto manda fuori, con la causa.
- Valori di partenza, da tarare al banco: 0,3 · 1,6 · 45° · 0,7 · A 3,2 m · L 4,0 m · K 2 m · 45 m/s. K è stato scelto
  perché a Leggenda in corsa i fuori restino come oggi (criterio 8): con K = 3,2 i fuori della persona vera salivano dal
  14,2% al 19,4%, con K = 2 restano al 14,1% [P `cont.txt`].
- **Variante del tempo** (D1, seconda risposta): ritocco proporzionale alla cima, `mira = piatto · (1 + 0,4 · tempo nel
  verso del piatto)`, più ±0,3 con la cima dritta. Con la cima piena la mira va da 1,4 a 0,6 invece che da 1,3 a 0,7; con la
  cima dritta non cambia [D, aritmetica].

**Oggi** [V `natpf_stroke_outcome.js`]:
- `mira = −c·0,1·(1−|t|) − c·1·t + piatto` (`:355`), con `t = te − ritmo` (`:328`, `:354`): spinta verso l'incrociato
  (`:24`) e tempo con lo stesso peso del piatto (`:27`, `:36`).
- Piatto pieno a P e poi in calo: da 45° conta meno, a 60° vale zero (`natpf_stroke_intent.js:53, :63, :196-201`).
- Punto neutro che segue la palla al 40% (`:45`, `:285`).
- Tenuta della riga che sparisce con 0,25 unità di tempo oltre la finestra (`:59`, `:338`).
- Aria corretta solo lungo il campo (`natpf_skill.js:883`); il servizio la corregge anche di lato (`:903-919`).

**Numeri** (Esperta, 18 m/s, dritto del destro dal centro, P 17°, rimbalzo vero; − = incrociato) [P `finale.txt`]:

| | Oggi | Piano finale |
|---|---|---|
| x con la cima a 10 / 17 / 25 / 35 / 45 / 60°, a tempo | −1,68 / −3,17 / −3,17 / −3,17 / −3,17 / 0,01 m | −1,60 / −3,20 / −3,96 / −3,61 / −3,20 / −2,88 m |
| Solo tempo, da anticipo pieno a ritardo pieno | da −2,99 a +3,19 m | da −0,96 a +0,96 m |
| Cima incrociata piena e ritardo pieno | +0,35 m (dall'altra parte) | −2,24 m |
| Cima lungolinea piena e anticipo pieno | +0,35 m | +2,24 m |
| Salto più grande per 1° di cima, da 0 a 90°, Esperta e Leggenda, anche in corsa | 0,24 m | 0,23 m |
| Salto più grande per 10 ms oltre la finestra, da 18 a 35 m/s | 1,61–2,01 m [R] | 0,23–0,45 m |
| Calamita: quota più alta di palle in 20 cm, chi gira da 12 a 40° (± 12°) | 24–45% | 11–23% |
| Riga voluta (giro 1,45 × P ± 5°), da fermo, a ogni livello | la riga non si raggiunge | 72% tra 3,6 m e la riga, 0% fuori |
| Rimbalzo vero / spostamento voluto, di lato | 0,85–0,91, mediana 0,86 [V `aria.mjs`] | 1 |

### 4.3 Cosa è deterministico, cosa resta di rumore e di aiuto

- **Deterministico.** Stessi ingressi, stesso esito. Già oggi nei colpi da fondo non c'è caso, e il colpo «controllato» a
  rete non scatta a nessun livello: `failQ` vale al più 0,34 e `netQMin` 0,45 (`natpf_stroke_outcome.js:118`, `:196-215`,
  `:335`) [V]. Il piano non aggiunge termini casuali.
- **Il rumore che resta è solo quello del gesto.**
  - Cima: 0,23 m per grado con P 17°. Un gesto buono (±5°) sparge circa ±1 m; una persona vera (±12°, stima [L]) circa
    ±2,5 m. Il rumore vero si misura per la prima volta in B36.0.
  - Tempo: con peso 0,3, ±0,5 unità valgono circa ±0,5 m (oggi ±1,5–1,7 m).
  - Forza: profondità, come oggi.
- **Aiuti che restano, dichiarati.**
  - Zona morta di 3°: i colpi normali non si spostano.
  - Fascia sicura: con un colpo pulito il solo giro non manda mai fuori. Serve ai bambini.
  - La riga è una finestra di giro, non un tetto.
  - La tenuta della riga dipende dalla situazione, e la scritta la dice.
  - Il tempo pesa poco, quindi pesa poco anche un ritardo dello schermo. Con 60 ms fissi di ritardo, prima che il ritardo
    abituale di B35a se ne accorga: incrociato voluto oggi al centro (0,0 m), con la regola nuova a −2,0 m [P bozza].
- **Niente calamite.** Si misurano con una finestra mobile di 20 cm su |x|: la «cella di 1×1 m» della bozza non le vedeva.
  Con la bozza (riga piatta da 25° a 60°) chi girava 40 ± 12° mandava l'87% delle palle negli stessi 20 cm [R]; con il
  rientro il massimo è il 23%, oggi il 45% [P].

### 4.4 Come si incastra con il resto

- **Tempo.** Non cambiano il voto (Anticipo, Perfetto, Ritardo), il segnale del momento giusto (verde = Perfetto), la
  finestra d'impatto e il super (|t| ≤ 0,6, `natpf_stroke_outcome.js:467`) [V].
- **Ritmo.** Oggi il ritmo (`RHYTHM`: `keep 8`, `min 4`, `gain 0,8`, `:244`) [V] toglie dalla direzione l'80% di un tempo
  tenuto, dal quinto colpo. Con il tempo tenuto a +0,5 lo spostamento scende da 1,60 a 0,32 m con il peso di oggi, e da 0,48
  a 0,10 m con il peso 0,3 se il ritmo restasse [R]. Con «Nuova» il ritmo esce dalla direzione: chi colpisce sempre un po' in
  anticipo ha la palla spostata di circa 0,5 m, e la cima lo corregge. Resta il ritardo abituale di B35a (`lag`), che serve
  allo schermo in ritardo.
- **Centro della mira (B35a).** Con la cima al comando l'errore del centro diventa errore di direzione: con 8° di errore i
  colpi giusti scendono dal 90% al 63% [P bozza]. Il centro si sceglie per partita (B36.3). Dopo un azzeramento (telefono
  ricollegato senza «Ricollega», `natpf_phone_racket.js:550`; verso girato dal telefono, `:769`) [V] il centro riparte dal
  profilo imparato, come già fa `:626` con la calibrazione con i gesti, non da zero.
- **Scambi di prova (B28).** Restano la calibrazione di base e danno il seme fidato del centro
  (`natpf_phone_racket.js:891`) [V]. In fiera ogni visitatore li fa (decisione del 13/11).
- **Scambio caldo (B42).** La tenuta della riga non usa la pressione dello scambio caldo. B42 chiude gli scambi con la palla
  più veloce, il super più facile, la CPU che attacca e i colpi falliti (`failQ`) [B42]. La fascia sicura però toglie una
  parte dei fuori che oggi chiudono gli scambi caldi: per questo il banco di B42 diventa un criterio (§7.5, criterio 9).
- **«Fuori» all'atterraggio (B37).** L'esito si decide al colpo, come oggi; B37 lo dice quando la palla tocca terra o la
  rete [B37].
  - La causa viaggia nel verdetto rimandato. Vale anche quando la previsione diceva «dentro» e il motore dice «fuori»: oggi
    `settledQuality` rifà «Fuori» dal solo voto (ramo b37 `natpf_shot_feedback.js:135-140`) [B37].
  - Cause: «in corsa», «in allungo», «palla veloce», «scambio lungo», «in anticipo», «in ritardo». «Troppo angolato» non
    serve (D3).
  - Con «Classica» le scritte di B37 restano identiche.
- **Opzione letta a inizio partita**, come lo scambio caldo (ramo b42 `game_engine.js:1243`) [B42]: se lo staff tocca il
  pannello, la regola cambia dalla partita dopo.
- **L'aria si corregge solo insieme alla fascia sicura** (B36.4), mai da sola. Oggi l'aria è un margine nascosto del 14%: a
  Leggenda in corsa, con il gesto buono, il 3% di fuori sul rimbalzo vero diventerebbe il 20% con l'aria corretta e i bordi
  di oggi [P bozza].

---

## 5. Colpi per gesto

### 5.1 Dal gesto al colpo

| Gesto | Colpo | Note |
|---|---|---|
| Cima girata verso il centro / verso l'esterno all'impatto | incrociato / lungolinea; cima dritta: centro | più giri, più angolo fino a circa 25°; oltre la palla rientra verso l'angolo |
| Gesto più lento / come il solito / più veloce | metà campo / profondo / in fondo e veloce | come oggi (`natpf_stroke_intent.js:229`, curva 0,7) [V] |
| Testa che sale / in piano e forte / dall'alto | top spin / piatto / tagliato | come oggi |
| Cima girata oltre la mira piena verso la diagonale, gesto più morbido del solito | **angolo corto**, 4,5–7 m dalla rete | nuovo, continuo (§5.3) |
| Un attimo prima / un attimo dopo | ritocco di circa un metro; velocità e altezza solo se si percepiscono (§5.4) | |
| Molto prima / molto dopo | la palla scivola verso fuori, al più 0,45 m ogni 10 ms | con la causa |
| Gesto fortissimo, a tempo, da fermo | colpo super | invariato (B42 lo rende più facile nello scambio caldo) |
| Palla alta e gesto dall'alto | schiacciata | invariata |

### 5.2 Quali colpi usano la regola nuova (con «Nuova»)

| Colpo | Regola |
|---|---|
| Dritto e rovescio da fondo (top spin, piatto, tagliato) | nuova |
| Colpo vicino alla rete dopo il rimbalzo (palla corta raggiunta, entro 6,4 m: `nearNet`, `:309`) [V] | nuova per la direzione; la chiusura sopra la rete tiene la sua altezza e la sua velocità |
| Pallonetto | nuova per la direzione; con un gesto verticale senza verso il piatto vale 0 |
| Gesto della palla corta | diventa un tagliato morbido (D2) |
| Volée | spenta: si aspetta il rimbalzo (D2) |
| Schiacciata, servizio, colpo super | invariati |
| Webcam, mouse, tastiera, telefoni senza la forma (intenti ricostruiti, `:506-516`) [V] | regola di oggi |
| Doppio, P2 senza telefono | regola di oggi con i sorteggi [L]: lì la coerenza non vale, e si scrive |

Così nello stesso scambio vale una regola sola: niente ritorno alla regola di oggi vicino alla rete o quando `aimDev` manca.

### 5.3 Angolo corto, continuo

- Peso `w` = rampa della cima × rampa della morbidezza × diagonale. Niente soglie nette.
  - Cima: da 1,2 a 1,6 × P (la proposta del revisore «gioco»; anche da 1,1 passa).
  - Morbidezza: il gesto relativo al proprio colpo tipico (picco / colpo tipico), da 0,8 (niente) a 0,4 (pieno). La parte
    assoluta della forza non conta.
  - Diagonale: una fascia di passaggio tra 0,6 e 1,4 m di posizione della palla, invece del salto a 1 m.
- Profondità: `d −= (d − 5,8) · 0,8 · w`.
- Perché relativo. La forza è per metà assoluta (`strokePower`, `natpf_stroke_intent.js:84-89`) [V]. Il colpo tipico di un
  bambino (circa 380 °/s) vale forza 0,36 [V, aritmetica di `strokePower`]: con la soglia «forza ≤ 0,45» della bozza ogni suo
  incrociato pieno sarebbe diventato da solo un angolo corto. Con il gesto relativo il suo colpo solito vale 1: niente angolo
  corto finché non colpisce più morbido del suo solito.
- Numeri [P `corto.txt`], dal centro, dritto del destro, per le quattro coppie di soglie provate:
  - gesto buono: angolo corto voluto nella zona il 73–77% delle volte, non voluto 0%;
  - persona vera (cima ±12°, gesto ±0,3 del colpo tipico): voluto 52–54%, non voluto 3,3–3,6% (con la regola della bozza il
    non voluto era 12–18% [R]);
  - la parte aggiunta sposta la profondità al più di 0,32–0,37 m per 0,05 di forza e di 0,08–0,12 m per grado. Già oggi,
    nei colpi molto morbidi, la profondità cambia fino a 0,66 m per 0,05 di forza [P].

### 5.4 Tempo = punto d'impatto

Il corpo lo mette il movimento automatico (palla a 0,72 m di lato e 0,35 m davanti: `natpf_impact.js:32`) [V]. Chi gioca
sceglie il punto d'impatto solo con il tempo:
- palla presa davanti: un po' più incrociata (il ritocco), più tesa e più veloce;
- palla presa di fianco: un po' più lungolinea, più alta e più lenta.

Si tiene **solo se si percepisce**: stessa cima, anticipo pieno contro ritardo pieno, almeno 10 km/h e 25 cm sopra la rete di
differenza, senza cambiare i km/h dei colpi a tempo (±3%) né la continuità. Valori di partenza [D]: volo × (1 − 0,05·u) e
−0,1·u m di altezza in anticipo; volo × (1 + 0,08·|u|) e +0,15·|u| m in ritardo. A 90 km/h fanno circa 11 km/h e 25 cm di
differenza. Se il criterio non si raggiunge, il ritocco di velocità e altezza si toglie.

---

## 6. Campo aperto e precisione

### 6.1 Zone

Riferimento di chi colpisce, specchiato per il rovescio e per i mancini. «Diagonale» = la metà opposta alla palla quando la
palla è lontana dal centro, il lato dell'incrociato quando è vicina, con una fascia di passaggio tra 0,6 e 1,4 m.

| Zona | Dove | Gesto | Oggi | Piano |
|---|---|---|---|---|
| Profondo in diagonale | diagonale, oltre 1,4 m dal centro, oltre 9 m dalla rete | cima alla mira piena | 40 / 25 / 65% [P bozza] | 93 / 94 / 93% [P bozza] |
| Lungolinea profondo | metà della palla, oltre 1,4 m, oltre 8,5 m | cima dall'altra parte | 89 / 99 / 71% [P bozza] | 94 / 95 / 93% [P bozza] |
| Centro profondo | entro 1,2 m, oltre 9,5 m | cima dritta, forza piena | 78 / 44 / 31% [P bozza] | 89 / 90 / 89% [P bozza] |
| Angolo corto | diagonale, oltre 2,6 m, 4,5–7 m | cima oltre la mira piena, gesto morbido | 43 / 57 / 0% [P bozza] | 73% dal centro [P] |
| Sulla riga | tra 3,6 m e la riga | cima a 1,45 × mira piena | 0% | 72% dal centro, 0% fuori [P] |

Gesto buono, Esperta; tre numeri = palla dal centro / dall'angolo del dritto / dritto dall'angolo del rovescio. La metà
campo (palla debole, 6,4–8,5 m) non è un bersaglio: è il colpo morbido.

### 6.2 Come si premia la precisione

- **La CPU in difficoltà.** `cpuErrorChance` moltiplica allungo, corsa e velocità (`natpf_skill.js:734-752`) [V].
  L'angolo moltiplica solo dove `angle` non è zero: a Facile, e a Evento con k basso (`angle 0,5`, `natpf_skill.js:51`). A
  Esperta `angle` e `speed` valgono 0 (`:76`) [V]: lì l'angolo conta solo perché fa correre o allungare la CPU.
- **La riga è una finestra di giro**, non una calamita: troppo poco va all'angolo, il giusto va sulla riga, troppo rientra.
- **Il criterio «la direzione vince i punti»** (§7.5, criterio 10) controlla che il premio ci sia davvero, anche dopo un
  eventuale rinforzo della CPU.
- **Riscontro**: una parola nella scritta che c'è già (D4).

### 6.3 Quanto costa un gesto sbagliato

| Errore | Piano finale | Oggi |
|---|---|---|
| Cima sbagliata di 5° | circa 1,1 m di lato, dentro | circa 1,1 m, ma il tempo può coprirla o raddoppiarla |
| Tempo sbagliato dentro la finestra (±0,5 unità) | circa ±0,5 m | ±1,5–1,7 m |
| 10 ms oltre la finestra | al più 0,45 m in più verso fuori | fino a 2 m |
| Esperta in corsa (qualità 0,75), giro insegnato | 0% fuori | 0% fuori |
| Leggenda in corsa, persona vera | 14,1% fuori | 14,2% fuori |
| Leggenda in corsa, riga voluta | 41% sulla riga, 41% fuori (rischio dichiarato) | la riga non si raggiunge |

Numeri [P `finale.txt`], 18 m/s, giro insegnato 15°.

### 6.4 Chi non mira

Oggi, per chi non gira la cima apposta, il campo si apre grazie al tempo, che pesa quanto la cima. È una dispersione a caso,
proprio quella che il tuo punto 5 chiede di togliere. Con la regola nuova le sue palle restano più al centro [R]:
- il «bambino» del banco (non mira): palle oltre 2,5 m dal 30% al 13–14% a Bambini, fuori dal 4,5% allo 0,8–1,2%;
- l'«amatore» quando non mira: dal 26–29% al 5–8% a Evento;
- una persona vera che non mira (cima ±12°): dal 33% al 26%;
- un bambino con la cima ±16°: dal 38% al 38%.

Quanto si chiude dipende dal rumore vero della cima (B36.0). Rimedi: insegnare la cima prima della partita (D4), misurare
allo stand la scoperta e le palle angolate (E2 ed E4), e un criterio sui punti vinti da chi non mira (criterio 7).

---

## 7. Il gioco resta equilibrato

### 7.1 Livelli contro la CPU

Regole di base: **il livello cambia la precisione chiesta, non dove può andare la palla** (23/10,
`natpf_stroke_outcome.js:184-188`) [V]; **la Leggenda è più dura grazie alla CPU**, non con regole più severe per chi gioca
(B16 a); **Pro resta com'è** (11/11). Se un criterio cade si corregge la CPU, mai le regole di chi gioca.

| Livello («Chi gioca») | Cosa cambia per chi gioca | Rischio | Criterio |
|---|---|---|---|
| Bambini (Bambino) | più direzione, meno fuori | il bambino che non mira vede palle più al centro | criterio 7 |
| Facile (Ragazzo) | più angoli | basso | adulto medio ≥ 90% dei game; bambino ≥ 31% (`cpu-pressione.mjs:179-180`) [V bozza] |
| Evento (Adulto) | più angoli: il livello si alza da solo | k che arriva al tetto | adulto 60–70 punti e k finale < 0,95 |
| Esperta (Pro) | più vincenti | più facile | criterio 8 |
| Leggenda | in corsa sbaglia come oggi (14,2% → 14,1% [P]); alla B36.1 interna sbaglia molto meno (14% → 0,4% [R]) | margini stretti di `audit:legend` | criterio 8 |

**CPU in difesa**, solo se un criterio cade [D]: prima il recupero dopo il proprio colpo. Oggi a Facile, Evento ed Esperta la
CPU torna a x = clamp(−0,25·g; ±1,6) (`game_engine.js:2800`), la Leggenda sulla bisettrice (`legendRecover`, `:2803`) [V]:
si porta la bisettrice agli altri livelli. Poi la lettura della palla larga (`cpuWide`). La portata resta fissa.

**CPU in attacco**: sceglie i bersagli con il suo modello (`cpuShotChoice`; `legendDecide`, `natpf_legend.js:204`) [V]; la
sua aria resta com'è (la Leggenda la compensa con `kLat`). Con «Nuova» non fa palle corte e non sale a rete (D2).

### 7.2 Stesso schermo

- La regola vale per tutti e due i telefoni, a specchio.
- L'aiuto al più giovane resta (variante G: finestra × 2, +0,1 s, palla verso di lui più lenta, il suo colpo più in fondo:
  `natpf_duo_rules.js:163-167`) [V bozza]. Con il tempo che pesa poco, la parte sul tempo conta meno per la direzione [D].
- Criterio b25: bambino contro adulto medio 38–42% dei punti, mai oltre il 50%. Se scende sotto il 38%, per chi è aiutato
  la deriva oltre la finestra si dimezza («più margine sulle righe», detto a schermo). Mai punti regalati (12/11).
- Nome: il «Campo aperto» dello stesso schermo esiste già (`natpf_duo_rules.js:24`); l'interruttore di B36 si chiama
  «Direzione dei colpi».

### 7.3 Sfida tra due computer

- L'host calcola l'esito. Il gesto del P2 arriva con tutto `natpf` (`relayedNatpf`, `natpf_skill.js:301-307`), compresi
  `aimDev` e `aimFull` [V]: **il messaggio del colpo non cambia**.
- Sul computer del P2, però, il colpo del P2 è una previsione locale (`game_engine.js:2546`, `:2612`) [V], fatta con
  l'opzione di quel computer. Con l'host su «Nuova» e il P2 su «Classica» la palla partirebbe in un posto e poi salterebbe.
  Per questo l'host manda il modello della direzione nello snapshot (campo facoltativo, come `hot` di B42) e il P2 lo usa per
  la previsione. Un P2 di una versione vecchia ignora il campo: prevede con la regola di oggi e poi segue l'host.
- La sfida non si sviluppa (04/11), ma resta verde: `natpf-1v1-p2p` con l'host su «Nuova» e il P2 sul valore di base.

### 7.4 Fuori dalla regola

- Webcam, mouse, tastiera, telefoni senza la forma: regola di oggi anche con «Nuova» (con il tempo a 0,3 perderebbero il
  lungolinea, che oggi ottengono con il ritardo [L]). L'aria laterale per loro non cambia.
- Doppio e P2 senza telefono: catena vecchia con i sorteggi [L]. Va scritto.

### 7.5 Criteri

I numeri dicono sempre su quanti colpi o semi. Fino alla B36.0 i banchi dell'equilibrio non vedono «Nuova»; da lì in poi sì.

1. **Matrice della direzione** (banco B35a esteso, semi 1,2 e 3,4, tre posizioni, rimbalzo vero): gesto «piatto 12°» ≥ 78%
   giusti e persona vera ≥ 55% (oggi 73% e 49% [V bozza]); gesto insegnato ≥ 88% e ≥ 62%; incrociato e lungolinea scambiati:
   0% con il gesto buono, ≤ 2% con la persona vera.
2. **Fuori con il gesto pulito**: 0% a Bambini, Facile, Evento, Esperta e 1v1, da fermi e in corsa leggera.
3. **Coerenza**: almeno il 90% dei colpi nella fascia voluta, su almeno 20 serie da 14 colpi con semi diversi (circa 280
   colpi: l'errore è circa ±3 punti). Riferimento giudicato per partita, con il rumore (`colpi.mjs --mode=partite`, 24
   partite da 80 colpi): |mediana x| e partite oltre 1 m da una parte non peggio di oggi, anche con semi sbagliati di ±4°,
   ±8° e ±15°.
4. **Continuità**, su tutto l'intervallo da 0 a 90°: ≤ 0,35 m per grado di cima; ≤ 0,5 m per 10 ms fino a 35 m/s (scambio
   caldo compreso); la sola parte aggiunta dall'angolo corto ≤ 0,4 m per 0,05 di forza e ≤ 0,35 m per grado.
5. **Campo e calamite**: zone del §6.1 da tre posizioni con il gesto buono: profondo in diagonale, lungolinea e centro ≥ 85%;
   angolo corto ≥ 65% con il gesto e ≤ 10% senza (sulla regola vera, con il rumore della forza); riga voluta ≥ 70% tra
   3,6 m e la riga; calamita (finestra di 20 cm su |x|) non oltre oggi, anche con «gira tanto» 30 ± 12° e 40 ± 12°.
6. **Rimbalzo vero − bersaglio** ≤ 0,15 m nel 95% dei colpi del telefono.
7. **Livelli dei visitatori** (24 semi × 120 punti per riga; l'errore della differenza è circa ±2,5 punti [D]; se il
   risultato è al limite, 48 semi):
   - Bambini con il «bambino»: punti vinti entro ±3 da «Classica», e il bambino vince game come oggi;
   - Evento: adulto 60–70 punti e k finale < 0,95;
   - profilo che non mira, a Bambini ed Evento: punti vinti non sotto «Classica» − 3;
   - durata della partita e secondi per punto a Bambini, Facile ed Evento entro ±10% da «Classica» (il banco B42 li stampa
     già: per esempio Evento contro «umano» 19,4 s a punto [B42]);
   - le palle oltre 2,5 m del profilo che non mira si stampano accanto (non sono un cancello: §13).
8. **Esperta e Leggenda** (40 semi): tutti i criteri di `audit:legend`; punti vinti dai profili con il telefono entro ±3 da
   «Classica», a due vie; Esperta contro «medio» 70–85%; fuori di chi gioca a Leggenda entro ±3 punti da «Classica», da
   fermi e in corsa, per gesto (buono, insegnato, persona vera). Oggi il criterio più stretto è «errori della CPU contro
   amatore» al 2,1% con la soglia al 2% [B42, da rifare].
9. **Scambi lunghi** (banco B42 con i profili di B36.0): punti oltre 30 colpi al più la base B42 + 2 punti; punti oltre il
   20° colpo chiusi da un vincente o da un super non sotto la base B42.
10. **La direzione vince i punti** (dati `shots` di `rally-balance`: dove cade la palla, dov'era la CPU, com'è finito il
    punto): la quota di punti vinti entro il colpo dopo cresce con la distanza tra rimbalzo e CPU (fasce di 1 m) e con la
    profondità; la differenza tra la fascia più lontana e la più vicina supera quella tra i colpi più veloci e i più lenti;
    l'indice «cambio di direzione» (palla dall'altra parte dopo una palla larga) non scende sotto «Classica».
11. **Gioco a rete con «Nuova»**: in 200 punti per livello 0 volée di chi gioca, 0 palle corte e 0 salite a rete della CPU, a
    tutti i livelli, Leggenda compresa; schiacciate e colpi in corsa entro ±10% da «Classica». Con «Classica» `audit:rete`
    invariato.
12. **«Classica» identica**: esito bit per bit su 10 000 casi a caso; impronte (b25, b32, B18 Leggenda e palla corta, fine
    partita, `evento-bambini`, B37, B42) e `audit:legend` identici.

### 7.6 Obiettivi allo stand (dal registro)

Per modello e per livello, almeno 200 colpi per livello e per modello.

| Obiettivo | Misura | Soglia |
|---|---|---|
| E1 la cima conta | correlazione di rango tra piatto e scarto del rimbalzo dal centro, con «Nuova» | ≥ 0,8 |
| E2 campo aperto | palle oltre 2,5 m dal centro a Evento | non sotto «Classica» |
| E3 niente fuori a caso | fuori con il tempo nella finestra, a Bambini ed Evento | ≤ 3% |
| E4 la cima si scopre | nei primi 10 colpi di una partita, colpi con \|piatto\| ≥ 0,5 | ≥ 30% |
| E5 partite non storte | partite con almeno il 70% dei colpi in una metà (`diag_metrics.js:198`) | ≤ 10% |
| Durata | durata della partita a Bambino, Ragazzo e Adulto | entro ±10% da «Classica» |

**Classifica del giorno.** Il peso dei livelli (`LEVEL_WEIGHT`, `natpf_match_stats.js:30`) [V] è tarato sul simulato
«umano»: si rimisura al traguardo C. Regola per lo staff: la direzione si cambia solo tra un giorno e l'altro, oppure si usa
«Classifica: Azzera oggi». Il registro scrive il modello in ogni partita.

---

## 8. Tappe e traguardi

**Regole per ogni tappa.** Un agente per tappa, al più due in parallelo. Test del gioco e del sito verdi, build se serve,
prove nel browser, schermate guardate, commit, push, versione nuova con i pacchetti e «come si attiva». Fino al traguardo C
**«Classica» resta il valore di base**: con l'interruttore su «Classica» il gioco è identico e `audit:legend` non cambia.
Prima del traguardo A ogni versione dice «Direzione dei colpi: Nuova, in lavorazione, non da provare». Il pulsante mostra il
traguardo («Nuova · A», «Nuova · B»), così i tuoi pareri si confrontano. Tra A e B il pulsante resta «Nuova · A», e la nota
della versione dice in una riga che cosa è cambiato (testi, CPU, telefono).

**Ordine.** B36.0 → B36.1 → (B36.2 ∥ B36.3) → B36.4 → B36.5 → **traguardo A** → (B36.6 ∥ B36.7) → B36.9 → B36.8 →
**traguardo B** → **traguardo C**. Poi, su richiesta, B36.10.

**Quando.** B36.0 subito dopo B43, se dici sì (D6). Le altre tappe dopo la coda (B43, B41 parte 1, B38 e B39, B41 parte 2,
B40). File in comune da tenere d'occhio: `natpf_kiosk.js` e `index.html` (B39, B41, B43), `natpf_shot_feedback.js` (B37),
`game_engine.js` (B42, B43), `natpf_trial*.js` e `natpf_phone_racket.js` (B41, B28.1), il registro (B41.4).

**Il posto dell'interruttore** si decide dopo B39 e B41. Oggi la riga in basso del pannello ha posto per un solo pulsante in
più a 1024×600, e B39 vuole metterci «Diagnostica» (`LISTA-UNICA-E-PROPOSTA-B39.md:354-355`; `index.html:260-262`) [V]. Strade:
un foglio «Telefono ›» con mira e direzione, oppure il menu dello staff con il tasto destro (B39). In ogni caso: si raggiunge
con il solo mouse; non si azzera con il chiosco né con «Nuovo giocatore»; vale dalla partita dopo; il registro lo scrive per
partita; `natpf-menu` controlla «Chiudi» in vista a 1024×600, 1366×657 e 1024×1024.

**Lavoro e rischio** (S = meno di un blocco; M = un blocco come B35a, cioè 7 commit, un banco, 10 test e 7 prove nel
browser; L = più di un blocco):

| Tappa | Lavoro | Rischio | Interruttore | Per te |
|---|---|---|---|---|
| B36.0 Misurare prima | M | basso | gioco invariato | Worker da ricaricare; 15–20 minuti a Precision |
| B36.1 La cima comanda | M | medio | in lavorazione | niente da provare |
| B36.2 Solo da fondo campo | S–M | medio | in lavorazione | niente da provare |
| B36.3 Riferimento della mira | S–M | alto | in lavorazione | niente da provare |
| B36.4 Righe e aria | M–L | alto | in lavorazione | niente da provare |
| B36.5 Tutto il campo | M | medio | in lavorazione | niente da provare |
| **Traguardo A** | — | — | «Nuova · A» | prova di due minuti |
| B36.6 Insegnare e vedere | M | medio (testi, B43) | «Nuova · A» più la tappa | schermate |
| B36.7 Equilibrio | L | alto | «Nuova · A» più la tappa | numeri nel documento |
| B36.9 Posa «pronto» | M | medio | «Nuova · A» più la pagina del telefono | aggiornare i telefoni dello stand |
| B36.8 Prova vera allo stand | S più il tuo tempo | medio | «Nuova · A» con tutte le tappe | registro, Precision |
| **Traguardo B** | — | — | «Nuova · B» | prova di due minuti |
| **Traguardo C** | S | alto (fiera) | «Nuova» di base, per gruppi | una domanda |

### B36.0 · Misurare prima
Descritta nel §3. **File**: `registro_registratore.js`, `registro_formato.js`, `cloudflare/registro-worker.js`,
`scripts/registro/riassunto.mjs`, `scripts/audit/rally-balance.mjs`, `b19/due-umani*.mjs`, `direzione-telefono.mjs`,
`colpi.mjs`, una lettura della zona di Precision (`natpf_events.js`). **Criteri**: criterio 12; test del Worker (campi
uguali nelle due copie); contatore dei colpi pronto. **Per te**: ricaricare il Worker; 15–20 minuti a Precision.

### B36.1 · La cima comanda (interna)
- **Cambia** (solo «Nuova», solo telefoni con la forma): peso del tempo 0,3; spinta naturale 0; punto neutro al centro; il
  ritmo esce dalla direzione (resta `lag`); `aimDev` nullo → piatto 0 con la regola nuova. Curva della cima **come oggi**
  (piena da P, calo tra 45° e 60°): nessun gradino nuovo. Bordi, aria e profondità come oggi.
- Opzione letta a inizio partita e mandata al P2 nello snapshot. Giocatori simulati con l'inversa della regola nuova.
- I test dell'esito del telefono girano con tutte e due le regole (parametro): l'accensione del traguardo C cambierà solo il
  valore di base. Si scrive già qui la lista dei test e delle impronte che cambieranno, con il motivo. Oggi 34 file di test
  usano l'esito del colpo [R].
- **File**: `natpf_direction.js` (nuovo: costanti, `directionRules`, lettura dell'opzione, `zoneOf`);
  `natpf_stroke_outcome.js` (`strokeOutcome` riceve `dir`; `:285`, `:328`, `:354-356`); `game_engine.js` (chiamata a `:2360`
  con B42, snapshot); voce del pannello (dove deciso); `diag/diag_recorder.js:263`; `rally-balance.mjs`,
  `b19/due-umani*.mjs`.
- **Prove**: `natpf-b36-interruttore` (con «Classica» esito identico su 10 000 casi; intenti ricostruiti sempre con la regola
  di oggi; opzione letta a inizio partita); `natpf-b36-direzione` (monotonia fino a P, specchio P1/P2 e mancino,
  determinismo, `aimDev` nullo); test della sfida (snapshot); banco esteso; colpi nuovi > 0 in ogni banco con «Nuova»;
  `natpf-menu`.
- **Criteri**: 1 (senza la riga), 12; solo tempo entro ±1 m.
- **Stima** [R, variante «minima» della revisione tecnica, uguale salvo oltre 45°]: Esperta, giro insegnato 15°, giusti
  83 → 90%, persona vera 55 → 64%. A Leggenda in corsa la persona vera esce molto meno (14% → 0,4%): per questo la tappa è
  interna.

### B36.2 · Solo da fondo campo (interna; insieme alla B36.3)
- **Cambia** (solo «Nuova»):
  - un'opzione nuova del piano di chi gioca salta **solo** il ramo della volée (`natpf_impact.js:205`). Non si usa
    `groundOnly`, che toglie anche la schiacciata (`:169`) e lo split-step del B32 (`:149`, `:216`) [V];
  - chi gioca non sale a rete da solo (`approachOf`, `natpf_net_play.js:76-89`);
  - la CPU non fa palle corte (`cpuDropShot`) e non sale a rete (`cpuRecover`) [V];
  - la Leggenda non fa la «smorzata»: è un candidato di `legendDecide` (`natpf_legend.js:239`), perché `cpuDropShot` esclude
    la Leggenda (`natpf_net_play.js:180`) [V];
  - il gesto della palla corta di chi gioca diventa un tagliato morbido.
- **Prove**: 200 punti per livello con «Nuova» (criterio 11); punti persi da chi viene tirato avanti, per esempio
  dall'incrociato stretto della Leggenda a 5,2–6,6 m (`natpf_legend.js:229`) [V]; `audit:rete` e `audit:movimento` invariati
  con «Classica».
- **Criteri**: 11, 12.

### B36.3 · Riferimento della mira (interna; dopo B41 parte 1 e B28.1, che toccano gli stessi file)
- **Cambia** (solo «Nuova»):
  - sempre: dopo un azzeramento il centro riparte dal profilo imparato (`faceRef`), come `natpf_phone_racket.js:626`;
  - poi si sceglie tra quattro centri, giudicati per partita con il rumore: (a) quello di oggi (B35a: `alphaTrusted 0,03`,
    `biasDevTrusted 22`, verifica oltre 35°); (b) come (a), ma senza deriva per i colpi oltre 10°; (c) il centro entro ±4°
    dal seme, della bozza; (d) come (a), più una verifica dopo 6–8 colpi normali per verso che ri-semina se sono lontani dal
    seme.
  - Un centro diverso da (a) si adotta solo se per partita non è peggio. Il progetto l'ha già imparato nel B15: centri più
    lenti tenevano la mira senza rumore, ma per partita lasciavano più palle da una parte (`natpf_gestures.js:134-146`;
    `docs/PROJECT_MEMORY.md`, «Il centro della mira si giudica per partita, con il rumore») [V].
- **Prove**: `colpi.mjs --mode=partite`; semi sbagliati di ±4°, ±8°, ±15° e l'errore del seme misurato in B36.0; serie
  come quote.
- **Criteri**: 3, 12.

### B36.4 · Righe e aria (interna)
- **Cambia** (solo «Nuova»): fascia sicura fino ad A; fascia della riga lineare fino a L; rientro oltre 1,6 × P; parte non
  tenuta con K; tenuta senza scambio caldo; deriva oltre la finestra in metri al secondo; aria corretta di lato per i colpi
  dei telefoni con la forma (P1 `game_engine.js:2227`, P2 `:2604`; la CPU no); causa del fuori nel verdetto di B37, anche in
  `settledQuality`.
- **File**: `natpf_direction.js`; `natpf_stroke_outcome.js` (`:338`, `:354-358`); `natpf_skill.js` (`fixAirRally`, come
  `fixAirServe` `:903-919`, ma senza il controllo della rete, che fa già il lancio); `game_engine.js`;
  `natpf_shot_feedback.js`.
- **Prove**: test di continuità da 0 a 90°; fuori per livello; rimbalzo vero con `flyAir`; prova nel browser nuova
  `tools/e2e/natpf-direzione-b36.mjs` (colpi del telefono simulato con il piatto noto → anello e causa del fuori quando la
  palla cade); banco B42.
- **Criteri**: 2, 4, 5 (riga e calamita), 6, 8 (fuori a Leggenda), 9, 12.

### B36.5 · Tutto il campo (interna)
- **Cambia** (solo «Nuova», colpi da fondo): via l'accorciamento automatico dell'incrociato largo (`:373`; resta nella
  chiusura a rete); angolo corto continuo (§5.3), con il gesto relativo nell'intento (`natpf_stroke_intent.js`); tempo =
  punto d'impatto solo se si percepisce (§5.4).
- **File**: `natpf_stroke_outcome.js:364-374`, `natpf_stroke_intent.js` (solo il campo del gesto relativo),
  `natpf_direction.js`; il volo in `game_engine.js` se serve.
- **Prove**: banco delle zone da tre posizioni; `colpi.mjs` (km/h e profondità); `audit:rete`.
- **Criteri**: 4, 5, 12; forza 0,3 / 0,5 / 0,8 → profondità mediane separate di almeno 1 m in ogni direzione.

### Traguardo A · «Nuova · A», da provare a Bambino, Ragazzo e Adulto
- **Condizioni**: criteri 1–7, 9, 11 e 12 verdi. Pro e Leggenda portano l'avviso «non ancora equilibrati» fino al
  traguardo B.
- **Prova di due minuti** (solo mouse e telefono; valori attesi [P `prova.txt`], da rifare al banco prima di mandarli):
  1. Pannello dello stand con il mouse (tasto destro dopo B39, oppure 3 secondi sul marchio NATPF in «Opzioni») →
     «Direzione dei colpi: Nuova · A» → «Chiudi».
  2. Minigiochi → Precision, una volta con «Nuova · A» e una con «Classica»: segna punteggio e zone prese su 10.
  3. Partita contro la CPU, «Adulto». Sei dritti alternando: cima girata decisa verso il centro (20–25°) e colpo un attimo
     dopo; cima girata decisa verso l'esterno e colpo un attimo prima. Atteso con «Nuova»: almeno 5 su 6 nella metà esterna,
     a 3,3–3,8 m dal centro; con «Classica» a 1,5–1,7 m.
  4. Quattro dritti con la cima dritta, alternando un attimo prima e un attimo dopo: con «Nuova» entro mezzo metro dal
     centro; con «Classica» a 1,5–1,7 m.
  5. Tre dritti girando molto più del solito (circa 25°): la palla va vicino alla riga e resta dentro. Uno ancora di più
     (35° o oltre): la palla rientra verso l'angolo.
  6. In tutto il game nessuna volée e nessuna palla corta, né tue né della CPU.
  7. Risposta: sì o no ai punti 3–6, i due punteggi di Precision, una frase sulla sensazione.
- Si alterna perché a tempo, fino a 17°, le due regole danno quasi la stessa palla (−2,74 contro −2,87 m a 15° [P]), e
  perché un errore di tempo ripetuto oggi viene tolto dal ritmo dal quinto colpo [R].

### B36.6 · Insegnare e vedere (ridotta; insieme alla B36.7)
- **Cambia** (solo «Nuova»):
  - la riga «Gira la cima: la palla va da quella parte» nella pagina «Pronto per la partita» (`natpf_trial.js:57`) [V] e,
    dopo B41, nella pagina della fiera;
  - la parola della zona nella scritta che c'è già, solo sul grande schermo («Lungolinea», «Incrociato», «Angolo», «Sulla
    riga», «Angolo corto»);
  - testi del tutorial (schede dritto e rovescio), dell'allenamento (`natpf_training.js:30-31`) e della prova guidata
    (`diag_protocol.js:20-23`): sempre «gira la cima di circa 15° rispetto al tuo colpo normale», mai «punta». Davanti al
    ledwall gli angoli del campo lontano stanno a pochi gradi, vicino alla zona morta di 3°: chi «punta» manda la palla al
    centro [R];
  - dimostrazioni di incrociato e lungolinea con il giro insegnato (circa 0,85 × mira piena) **durante** il colpo, non prima:
    oggi girano prima del colpo (`preYaw` ±22°, `natpf_gesture_motion.js:111, :113`) [V], e la posa «pronto» si mangia parte
    di un giro fatto prima e tenuto fermo (B36.9).
- **Tolti** rispetto alla bozza: la parola sul telefono, il «fantasma» della mira, Precision e Combo «a zone», gli esercizi
  nuovi della prova guidata. I vincenti per zona, se l'utente li vuole, andranno nella card di fine partita (B40), non qui.
- **Prove**: test di fedeltà su `aimDev` e sulla zona (oggi `natpf-gesture-pose.test.mjs:286` legge `natpf.wrist`) [V];
  `natpf-training-flow`, `natpf-tutorial-phone`, `natpf-gesti-*`, `natpf-minigiochi-principianti`; schermate a 1920×1080,
  nell'area del ledwall e a schermo diviso; misure in `cqw`/`cqh`; nessuna voce nuova.

### B36.7 · Equilibrio (insieme alla B36.6)
- **Cambia**: solo se un criterio cade, la CPU (§7.1), i valori della CPU nello scambio caldo (`cpuAttack`, `cpuErr`, solo con
  «Nuova», se cade il criterio 9) e l'aiuto dello stesso schermo (§7.2). `LEVEL_WEIGHT` si rimisura.
- **Prove**: `audit:legend` (40 semi), `audit:cpu -- --obiettivi`, `audit:evento`, b25, `audit:rete`, `audit:movimento`,
  banco B42, `natpf-1v1-p2p` con l'host su «Nuova», prove nel browser dello stesso schermo con «Nuova».
- **Criteri**: 7, 8, 9, 10.

### B36.9 · Posa «pronto» (prima della B36.8)
- **Perché**: con la cima al comando, quello che il telefono misura è il segnale principale. La posa «pronto» segue il
  telefono fermo (sotto 25 °/s per 400 ms, costante 2,5 s: `racchetta.js:39`, `face-tracker.js:126`) [V]. Chi gira la cima
  e poi aspetta la palla perde parte del giro: fermo 1 s si legge circa l'83%, fermo 2 s il 57% [L, telefono simulato]. Con un
  giro di 17°, l'83% vale circa 0,7 m in meno [D].
- **Si fa** se il banco di B36.0 conferma più di 0,5 m di differenza con attese fino a 1 s (la lettura del telefono lo fa
  prevedere).
- **Cambia**: posa «pronto» ferma quando la palla arriva, svelta quando la palla è lontana (il computer manda al telefono un
  segnale breve); `base`, `baseRate`, `turn` solo nella diagnostica. Campi facoltativi e girati con il verso (`signedSwing`,
  `natpf_trial_learn.js:115`) [V]. Versione nuova della pagina del telefono.
- **Telefoni dello stand**: con B41 restano collegati per giorni e la pagina nuova arriva solo dopo una ricarica e «Attiva i
  sensori» (`progetto-modalita-fiera.md:50`). Il documento della tappa dice allo staff come aggiornarli e dove vedere la
  versione della loro pagina.
- **Criterio**: stessa mira con attesa di 0, 0,5, 1 e 2 s: differenza ≤ 0,5 m.

### B36.8 · Prova vera allo stand
- **Cosa**: Precision con «Nuova» (tutte le tappe fatte) di almeno 3 persone (almeno 100 palle); partite dello staff o, se
  dici sì, giornate con
  una regola sola; obiettivi E1–E5 dal registro; errore del seme dalle partite vere; legame tra forza e scarto della cima
  (oltre 3° tra un gesto lento e uno veloce si corregge per giocatore).
- **Criteri**: errore del centro ≤ 4° dopo gli scambi di prova, su almeno 20 partite; giusti di Precision con «Nuova» non
  sotto quelli con «Classica», su almeno 100 palle per regola.

### Traguardo B · «Nuova · B», tutti i livelli
- **Condizioni**: criteri 1–12 verdi; B36.6, B36.7, B36.9 (se serviva) e B36.8 chiuse; schermate guardate.
- **Prova di due minuti**:
  1. Pannello → «Direzione dei colpi: Nuova · B» → «Chiudi».
  2. Guarda la pagina «Pronto per la partita»: c'è la riga «Gira la cima»?
  3. Partita a «Adulto»: cinque dritti girando la cima verso zone diverse; dopo ogni rimbalzo, la parola della zona nella
     scritta di sempre. Un dritto molto in ritardo: «Fuori · in ritardo» quando la palla tocca terra.
  4. Partita a «Leggenda»: ti sembra dura come prima?
  5. Risposta: sì o no ai punti 2–4 e una frase.

### Traguardo C · Accensione per gruppi
- **Prima** Bambino, Ragazzo e Adulto, quando i loro obiettivi dello stand (E1–E5, durata) non sono peggio di «Classica».
  **Poi** Pro e Leggenda, quando passa `audit:legend` con «Nuova».
- I test cambiano solo il valore di base (sono parametrizzati dalla B36.1). Si rimisura `LEVEL_WEIGHT`.
- In fiera resta «Classica» fino a questo traguardo. Dopo l'accensione «Classica» resta nel pannello almeno fino alla fiera
  successiva: lo staff torna indietro con un clic.
- **Domanda per te**: «Nuova di base per Bambino, Ragazzo e Adulto: sì o no?».

### B36.10 · (dopo, quando lo chiedi) Palle corte e volée nella mappa nuova
La palla corta con la direzione della cima e la profondità dalla forza; la volée come colpo bloccato con la direzione della
cima (la tenuta laterale della volée c'è già: `natpf_stroke_outcome.js:89-95, :315, :349`) [V bozza].

---

## 9. Rischi e cosa non si sa

1. **Il rumore vero della cima non è misurato.** I ±12° della «persona vera» vengono da diagnostiche che mescolano mire
   volute ed errori del centro [L]. Nel repository non ci sono registrazioni di telefoni veri [L]. Copertura: B36.0 e il suo
   cancello.
2. **Il centro della mira e il seme degli scambi di prova.** Il seme nasce da 1–2 colpi normali per verso
   (`natpf_trial_learn.js:78`) [V]. In fiera un seme sbagliato resta per tutto il game: nessuno ricalibra in due minuti.
   Copertura: B36.3 giudicata per partita, ri-semina dopo un azzeramento, misura del seme in B36.0 e B36.8.
3. **Posa «pronto».** Un giro fatto prima e tenuto fermo si perde in parte. Copertura: B36.9 e dimostrazioni che girano
   durante il colpo.
4. **Equilibrio.** Esperta può diventare più facile (più vincenti) ed Evento può arrivare al tetto di k. A Leggenda la B36.1
   interna toglie quasi tutti i fuori in corsa. Il criterio più stretto è «errori della CPU contro amatore» (2,1%, soglia 2%)
   [B42]. Copertura: criteri 7–10 e CPU (B16 a).
5. **Chi non mira vede un campo più chiuso** (§6.4). Copertura: D4, criterio 7, E2 ed E4.
6. **Chi mira con il momento del colpo perde il controllo.** Oggi, nel banco B35a, il gesto «tempo» fa il 58% di giusti
   [V bozza]; con il tempo a 0,3 quasi solo il centro [D]. Copertura: B36.0, D1, testi e dimostrazioni.
7. **Scambio caldo**: con meno fuori gli scambi tra il 20° e il 34° colpo possono allungarsi. Copertura: criterio 9.
8. **La riga come finestra può sorprendere**: girando troppo la palla rientra invece di uscire. Copertura: prova A, punto 5.
9. **Due regole nello stesso prodotto**: telefono con la regola nuova; webcam, mouse e doppio con quella di oggi.
10. **Prototipo semplificato**: una palla, niente motore, niente telefono simulato, niente centro che impara. Ritrova però il
    banco vero per oggi (gesto da 12°: 74–75% e 51% contro 73% e 49% del banco [P/V bozza]).
11. **Registro**: un Worker non ricaricato butta in silenzio i campi nuovi [L]. Copertura: test del Worker e controllo nel
    riassunto («campi della direzione presenti»).
12. **Pannello senza posto** fino a B39 e B41; **telefoni dello stand** con la pagina vecchia (B36.9).
13. **Documenti in disaccordo su Leggenda e salita a rete**: fuori da B36 (§2, scelte tecniche).
14. **Stand con il solo mouse**: le prove di B36 usano Precision e il pannello con il mouse; la prova guidata della
    diagnostica resta facoltativa finché B39 non la porta al mouse.

---

## 10. Cosa non si tocca

- Riconoscimento dei gesti sul telefono e pagina del telefono, fino alla B36.9.
- Tipo di colpo (`classifyStroke`), forza e profondità voluta (`natpf_stroke_intent.js`: si aggiunge solo il gesto relativo
  nell'intento, B36.5), schiacciata, servizio, colpo super con le regole di B42.
- Finestre d'impatto, voto, segnale del momento giusto (verde = Perfetto), ritardo abituale di B35a (`lag`,
  `ritardoAbitualeMs` nella diagnostica).
- Verdetto all'atterraggio di B37 (si aggiunge solo la causa), gemma di chi serve, F9.
- Scambio caldo di B42: valori invariati. Con «Nuova» si ritoccano solo i valori della CPU (`cpuAttack`, `cpuErr`), e solo
  se cade il criterio 9.
- Con «Classica»: tutto, compresi il gioco a rete del B31, il movimento del B32 e la Leggenda.
- Webcam, mouse, tastiera, doppio, P2 senza telefono.
- Messaggio del colpo nella sfida tra due computer (si aggiunge solo un campo facoltativo nello snapshot dell'host), km/h
  veri, soglia «in corsa», fine partita (B35b, B40), modalità fiera (B41), «Chi gioca» e nomi dei livelli.
- Nessuna voce nuova; nessuna clip video dei gesti; il nome del gioco commerciale non va nei file.
- La camera della partita (`natpf_camera.js:43-56`). Nel video il campo lontano, dove si mira, pesa di più: da noi il campo
  vicino occupa il 36% dell'altezza, nel video il 25% [L]. Si propone all'utente come prova a parte, dopo B36.

---

## 11. Non verificato (da sapere prima di decidere)

- Tutti i numeri [P]: prototipo semplificato, da rifare con il banco vero e il motore. I valori della prova di due minuti si
  rifanno al banco prima di mandarli.
- I numeri di B37 e B42 vengono dai loro rami, con il commit «IN CORSO … NON verificato» e documenti chiusi mentre lavoravo.
- Nessuna prova con un telefono vero, con il ledwall, con il programma Windows o con persone, né oggi né per il piano.
- Rumore vero della cima, errore del seme, mira persa nella posa «pronto»: solo simulati o stimati [L], fino alla B36.0.
- Effetto su `audit:legend`, `audit:evento`, b25, `cpu-pressione` e banco B42: non misurato, solo il verso atteso [D].
- L'opzione «solo volée», la smorzata della Leggenda spenta e il tagliato morbido al posto della palla corta: non provati.
- Il rientro verso l'angolo oltre la riga: non provato con persone.
- Precision come strumento di misura: serve il campo della zona chiesta, non provato.
- Che il visitatore scopra la cima in una partita da due minuti: non misurato (E4).
- La misura del ledwall non è nota: i gradi a cui stanno gli angoli del campo per chi «punta» sono un esempio [R].
- Il posto dell'interruttore dipende da come B39 e B41 chiuderanno il pannello. La data della fiera non è nei documenti.

---

## 12. Come sono state usate le revisioni

**Revisore «gioco e obiettivi»**
- R1 (bloccante, misure per ultime) → B36.0 e il suo cancello (§3); D1 con il «che cosa vuol dire movimento».
- R2 (bloccante, simulati ciechi) → B36.0, punto 3; criterio 7 con il bambino tra i criteri numerati.
- R3 (campo più chiuso per chi non mira) → D4, §6.4, criterio 7, E2 ed E4 (in parte: §13).
- R4 (il tempo sparisce) → ritmo fuori dalla direzione (§4.4), criterio di percezione (§5.4), variante nella D1.
- R5 (calamita sulla riga) → rientro oltre 1,6 × P, fascia lineare, finestra di 20 cm (criterio 5), «troppo angolato» tolto.
- R6 (scalino a 60°) → curva continua da 0 a 90°, misura dubbia segnata, criterio 4 su tutto l'intervallo.
- R7 (angolo corto a soglie) → angolo corto continuo sul gesto relativo (§5.3).
- R8 (riferimento senza rumore) → B36.3 giudicata per partita, con il rumore.
- R9 (tappe incoerenti) → tre traguardi, versioni «in lavorazione».
- R10 (`groundOnly` e smorzata) → B36.2 con l'opzione solo per la volée e la smorzata della Leggenda spenta.
- R11 (la direzione vince i punti) → criterio 10.
- R12 (Leggenda) → criterio 8 a due vie, con i numeri per gesto; K tarato (§4.2).
- R13 (scambio caldo) → tenuta senza scambio caldo, criterio 9.
- R14 (vicino alla rete) → tabella §5.2: una regola sola.
- R15 («punta» e camera) → «gira», mai «punta»; camera fuori da B36, da proporre come prova a parte.

**Revisore «tecnica e regressioni»**
- B1 (banchi ciechi) → B36.0, contatore dei colpi nuovi, test che fallisce.
- B2 (B36.1 descritta ≠ misurata) → B36.1 con la curva di oggi (tetto 1), numeri e avviso della stessa variante.
- B3 (scogliera e altopiano) → curva continua con rientro; criterio 4 da 0 a 90°; «gira tanto» nel criterio 5; quota
  oltre 45° contata nel registro.
- I1 (seme sbagliato permanente) → B36.3 a candidati, ri-semina dopo un azzeramento, errore del seme misurato.
- I2 (`aimDev` nullo) → piatto 0 con la regola nuova; tabella §5.2.
- I3 (previsione del P2) → modello nello snapshot (§7.3).
- I4 (`groundOnly`, smorzata) → B36.2.
- I5 (angolo corto) → §5.3 e criterio 4.
- I6 (10 ms a Leggenda) → deriva con il tetto di 45 m/s; criterio fino a 35 m/s.
- I7 (scambio caldo e righe di codice) → criterio 9; base con B37 e B42 uniti; `:2360`.
- I8 (posa «pronto») → banco in B36.0, dimostrazioni durante il colpo, B36.9 prima della B36.8 se il banco la conferma.
- I9 (test tutti alla fine) → test parametrizzati dalla B36.1.
- M1 → causa nel verdetto rimandato e in `settledQuality`. M2 → aria solo per i telefoni con la forma e solo «Nuova». M3 →
  tabella §5.2 (in parte: §13). M4 → opzione letta a inizio partita. M5 → legame forza-scarto misurato in B36.8. M6 →
  frase corretta (§6.2).

**Revisore «stand, tappe e misurabilità»**
- S1 (prova vera per ultima) → B36.0 con registro, riassunto, Precision come strumento, soglie con il numero di colpi; prova
  guidata facoltativa.
- S2 (B36.1 non si vede) → B36.1 interna; primo traguardo dopo la B36.5; prova con il tempo in conflitto e alternato.
- S3 (otto versioni) → tre traguardi, etichetta «Nuova · A/B», «Classica» in fiera fino a C, accensione per gruppi.
- S4 (obiettivi allo stand) → §7.6: E1–E5, durata, classifica, `LEVEL_WEIGHT`.
- S5 (undici decisioni) → sei domande in parole semplici, le altre come scelte tecniche.
- S6 (criteri su un campione) → criteri con semi, colpi e margine (§7.5).
- S7 (posto nel pannello) → deciso dopo B39 e B41, con le regole del §8.
- S8 (lavoro e rischio) → tabella e ordine del §8, parti tolte (in parte: §13).
- S9 (seme in fiera) → B36.3 per partita, candidato (d), dopo B41 parte 1 e B28.1.
- S10 → B36.9 dice come aggiornare i telefoni dello stand; parola sul telefono tolta. S11 → «una parola in più nella scritta
  che c'è già». S12 → «Classica» in fiera fino a C e nel pannello almeno fino alla fiera successiva.

---

## 13. Critiche non accolte

Nessun rilievo bloccante o importante è stato respinto per intero. Queste parti delle proposte non sono state accolte, o lo
sono in un'altra forma.

1. **R2 e R3, «palle oltre 2,5 m del profilo che non mira entro ±2 punti da Classica» come criterio.** Non è un cancello.
   Le palle larghe di chi non mira, oggi, vengono dal rumore del tempo, cioè da una dispersione a caso, che il punto 5
   dell'utente chiede di togliere. Il prototipo prevede già il calo (dal 30% al 13–14% [R]): un criterio così bloccherebbe
   la regola per come è fatta. Al suo posto: punti vinti da chi non mira (criterio 7), insegnamento (D4), E2 con persone vere
   «non sotto Classica» al traguardo C. Le palle larghe dei simulati si stampano accanto.
2. **R2, tolleranza ±2 punti sui punti vinti a Bambino e Adulto.** Diventa ±3. Con 24 semi × 120 punti la differenza tra due
   regole ha un errore di circa ±2,5 punti [D]: ±2 non si distingue dal caso. Al limite si rifà con 48 semi.
3. **R2, criteri di partita vincolanti dalla B36.1.** Si misurano e si scrivono dalla B36.1, ma diventano vincolanti al
   traguardo A: prima nessuna versione è «da provare» (R9, S3), e con «Classica» di base il gioco non cambia.
4. **R3, due palle «gira la cima» dopo gli scambi di prova come scelta di base.** Diventano la seconda risposta della D4. Costano
   3–5 s a ogni visitatore, contro la decisione del 13/11 (circa 10 s di scambi di prova); si aggiungono se il registro
   mostra che i visitatori non scoprono la cima (E4 sotto il 30%).
5. **R5, tenuta della riga che cala oltre 1,6 unità a Esperta e Leggenda.** Non è la scelta consigliata: sarebbe una regola
   più severa per chi gioca (contro B16 a e «Pro resta com'è»). Resta come seconda risposta della D3. La calamita si toglie
   in un altro modo: la riga è una finestra di giro e oltre la palla rientra.
6. **B3 della revisione tecnica, «un costo che cresce oltre la riga».** Il costo c'è, ma non è il fuori: girando troppo la
   palla perde la riga e rientra verso l'angolo. Il fuori resta solo con la situazione (h < 1) o con il tempo; per chi lo vuole
   anche da fermo c'è la seconda risposta della D3.
7. **R4, «il tempo amplifica la cima» come decisione a parte.** È nella D1 come seconda risposta, non come domanda separata:
   con la cima piena cambia la mira da 1,3–0,7 a 1,4–0,6, con la cima dritta non cambia [D]. Si sceglie insieme al peso del
   tempo.
8. **R1, la prova guidata con la tastiera come strada principale.** La strada principale è il registro con Precision, che si
   gioca con il solo mouse e ha un bersaglio noto (S1). La prova guidata resta facoltativa finché B39 non la porta al mouse.
9. **R7 e I5, «≤ 0,5 m per 0,05 di forza» sulla profondità totale.** Il criterio vale per la sola parte aggiunta dall'angolo
   corto (≤ 0,4 m). Già oggi, nei colpi molto morbidi, la profondità cambia fino a 0,66 m per 0,05 di forza [P]: sulla
   profondità totale il criterio cadrebbe anche con «Classica». Il resto di R7 e I5 (miscela continua, solo la parte relativa,
   soglie del revisore) è accolto.
10. **I5, «profondità che scende in modo continuo con la morbidezza sotto circa 0,35».** Accolta la miscela continua, ma sulla
    morbidezza relativa al proprio colpo tipico (R7), non sulla forza: la forza è per metà assoluta, e un bambino con il suo
    colpo solito (forza 0,36) starebbe già sul bordo, metà delle volte sotto.
11. **S8, ordine «traguardo A dopo B36.2 e B36.3».** Il traguardo A viene dopo la B36.5. Prima della B36.4, a tempo, la regola
    nuova cambia la palla di 0,1–0,6 m e l'incrociato a 10–15° cade anzi un po' più al centro (S2); mancherebbero anche due
    dei cinque punti dell'utente (tutto il campo, righe senza scogliere: R9).
12. **S9, ri-semina automatica nei primi 6–8 colpi come regola.** È il candidato (d) della B36.3, adottato solo se per partita
    non è peggio. Mira tenuta e seme sbagliato non si distinguono se non da quanto durano (`natpf_gestures.js:145-146`), e nel
    B15 una seconda verifica del seme era stata provata e tolta (`docs/PROJECT_MEMORY.md`, B15) [V].
13. **I8, B36.9 sempre obbligatoria.** Lo diventa se il banco di B36.0 conferma più di 0,5 m di differenza con attese fino a
    1 s. Il numero di oggi (circa 0,7 m) viene da un telefono simulato [L].
14. **M3, la dispersione del colpo «controllato» a rete che con «Nuova» sembrerebbe caso.** Non si applica: con i valori di
    oggi quel colpo non scatta a nessun livello (`failQ` al più 0,34, `netQMin` 0,45: `natpf_stroke_outcome.js:118, :335`)
    [V]. La tabella dei colpi (§5.2) invece è accolta.
15. **B2 della revisione tecnica, seconda strada (tenere 1,6 nella B36.1 e correggere l'avviso).** Scelta la prima strada, con
    la curva di oggi (S2, «B36.1 ridotta»): nella B36.1 non cambia niente oltre P, quindi nessun gradino nuovo e nessuna
    Leggenda più dura per errore.
