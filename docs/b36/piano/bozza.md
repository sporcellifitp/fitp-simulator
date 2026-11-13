# B36 · Piano unico (BOZZA): la direzione al centro del gioco, campo aperto, stile arcade

**Stato.** Bozza per i revisori. Solo analisi: nessun file del repository toccato, nessun commit. **Niente codice prima
del sì dell'utente.**

**Base.** `natpf-simulator` alla **2026-11-13.9** (worktree di riferimento, `a2ef49e` = 13.9 più documenti). Letti in sola
lettura anche i due rami che stanno per essere uniti: **B37** (`b37-collaudo-bis`, `2bfe09a`) e **B42**
(`b42-scambi-lunghi`, `ae76bdf`). Tutti e due finiscono con un commit «IN CORSO … NON verificato»: i loro numeri vanno
rifatti sul codice unito.

**Da dove viene.** Le cinque letture e i tre piani di `docs/b36/analisi/` (scritti sulla 13.7–13.8), il video 1 e le
decisioni dell'utente ancora valide (`docs/RIPRESA_AGENTE.md` §4, `docs/PROJECT_MEMORY.md` «Decisioni dell'utente del
13/11/2026»). Ogni affermazione che tengo l'ho ricontrollata sulla 13.9, o la segno.

**Segni.**
- **[V]** verificato da me sulla 13.9: file:riga, oppure codice vero eseguito.
- **[P]** numero del mio prototipo. «Oggi» = funzioni vere del gioco; «bozza» = la regola di questo piano, scritta solo
  nello script. Una palla sola (18 m/s, contatto a 11,4 m dalla rete), niente telefono simulato, niente centro della mira
  che impara, ritmo 0; «oggi» giudicato sul rimbalzo vero (0,86 dello spostamento laterale). Va rifatto con il banco vero.
- **[L]** preso dalle letture o dai tre piani, non ricontrollato.
- **[D]** deduzione o proposta.
- **[B37]**, **[B42]** dai rami non ancora uniti, non verificati da me.

**Prove fatte per questa bozza** (sola lettura; cartella
`docs/b36/piano/prove/`):
- `direzione-1-2.txt`: banco B35a `scripts/audit/direzione-telefono.mjs --seeds=1,2 --serie` sulla 13.9 (25 s). Esperta,
  gesto buono: giusti **73%**, fuori 0%; persona vera **49%**. Serie di 14 colpi uguali: incrociato **12/14**, centro
  **9/14**, lungolinea **7/14**. [V]
- `aria.mjs`: rimbalzo vero con la fisica del motore (lancio, `fixAir`, `flyAir`). [V]
- `mappa.mjs`, `tappa1*.mjs`, `riga.mjs`, `centro*.mjs`, `ritardo*.mjs` e i file `mappa-vero-*.txt`: oggi contro bozza. [P]

**Cosa è cambiato dalla 13.8** e qui si rispetta:
- **B35b (13.9)**: «Pronto per la partita» dopo gli scambi di prova, fine partita nuova, «Al servizio», scia spenta.
  Non tocca la direzione [V: tra la 13.8 e la 13.9 `game_engine.js` cambia solo `bannerSub`; `natpf_stroke_outcome.js`,
  `natpf_stroke_intent.js` e `natpf_gestures.js` sono identici].
- **B37**: «Fuori» e punto solo quando la palla tocca terra o la rete; l'esito resta deciso al colpo
  (`natpf_shot_feedback.js`: `defersVerdict`, `settle`) [B37]. Gemma su chi serve, scritta del segnale, F9.
- **B42**: «scambio che si scalda» acceso di base dal 20° colpo. Moltiplica la qualità di chi colpisce per
  (1 − 0,35 × calore), fino a 0,4, e rende il super più facile [B42: `natpf_hot_rally.js`, `game_engine.js` `hotPress`].

---

## 1. In breve

1. La palla va dove punta la cima del telefono quando colpisci. Più giri, più angolo. Cima dritta: centro.
2. La regola è la stessa per tutta la partita e da ogni punto del campo.
3. Il momento del colpo conta poco: un attimo prima la palla va un po' più incrociata, un attimo dopo un po' più
   lungolinea (al massimo un metro). Oggi il momento pesa quanto la cima, e i due a volte si annullano.
4. Molto in anticipo o molto in ritardo la palla scivola verso fuori, piano, nel verso dell'errore. Niente più salti di
   due metri per pochi millesimi.
5. Girando ancora un po' si arriva sulla riga. Con un colpo pulito resta dentro a ogni livello. Con il tempo sbagliato,
   in corsa o nello scambio caldo la palla sulla riga può uscire.
6. Si arriva dappertutto: incrociato profondo, lungolinea, centro, angolo corto (cima girata e colpo morbido). Oggi
   l'incrociato profondo e la riga quasi non si raggiungono.
7. La palla cade dove hai mirato. Oggi l'aria la porta circa il 14% più verso il centro.
8. Forza = profondità e velocità, come oggi. Testa che sale = top spin; dall'alto = tagliato.
9. All'inizio, nella modalità nuova, niente palle corte e niente volée (da confermare): si gioca da fondo campo, come nel
   video.
10. «Fuori» arriva quando la palla tocca terra (B37), con la causa: «troppo angolato», «in ritardo», «in corsa».
11. Si prova con un interruttore nel pannello dello stand: «Direzione dei colpi: Classica · Nuova». Con «Classica» il
    gioco resta identico. Webcam, mouse e tastiera non cambiano.

---

## 2. La regola della direzione

### 2.1 Chi decide cosa

| Cosa fa chi gioca | Cosa misura il gioco | Cosa decide |
|---|---|---|
| Gira la cima del telefono all'impatto | scarto in gradi dal proprio colpo normale (`natpf.aimDev`: `natpf_phone_racket.js:260, :274`) [V] | **la direzione**, peso pieno |
| Colpisce prima o dopo | tempo in unità della finestra (B35a: `te`, ritmo) | un ritocco (peso 0,3); oltre la finestra, un errore con un verso preciso |
| Colpisce più forte o più piano del solito | forza rispetto al proprio colpo tipico | profondità, velocità, altezza sulla rete (come oggi) |
| Testa che sale, in piano, dall'alto | forma del colpo (`classifyStroke`) | tipo di colpo (come oggi) |
| Corre, si allunga, non prepara; palla veloce; scambio lungo o caldo | qualità della situazione | quanto è sicura la fascia della riga e quanto è profonda la palla; **non** aggiunge caso |
| Niente: lo decide il movimento automatico | dove sta la palla all'impatto | niente sulla direzione (punto neutro = centro del campo) |

### 2.2 La formula

```
scarto   = cima all'impatto − proprio centro, in gradi        (centro B35a: natpf_gestures.js:164-220)
piatto   = segno · min(1,6 ; max(0 ; |scarto| − 3°) / (P − 3°))     P = mira piena, opzione dello staff (17/20/23°)
           oltre 60°: «piatto non letto» = 0
tempo    = clamp(te − ritmo ; −1 ; +1)                         B35a, invariato
mira     = piatto − c · 0,3 · tempo                             c = +1 dritto del destro (rovescio del mancino), −1 l'altro
FASCIA SICURA      |mira| ≤ 1:  x = mira · A                    A = 3,2 m (0,9 m dentro la riga): mai fuori
FASCIA DELLA RIGA  |mira| da 1 a 1,6: da A verso L = 4,0 m con una curva dolce, tenuta h
                   h = clamp((qualità della situazione − assistQ)/0,2 + 0,5)      senza il tempo
                   h = 1: si ferma sulla riga, dentro · h = 0: continua dritta e può uscire
OLTRE LA FINESTRA  x += −c · segno(te) · eccesso · D            D = 1,6 Bambini/Facile/Evento · 1,8 Esperta/1v1 · 2,7 Leggenda
LANCIO             il rimbalzo vero cade su x: aria corretta anche di lato, come nel servizio
```

`assistQ` è quello di oggi: 0,5 Bambini, Facile ed Evento · 0,6 1v1 · 0,62 Esperta · 0,8 Leggenda
(`natpf_stroke_outcome.js:196-215`) [V]. La «qualità della situazione» è corsa × allungo × preparazione × palla veloce ×
pressione degli scambi lunghi × scambio caldo, cioè `quality` e `pressure` di oggi senza il tempo
(`game_engine.js:2348-2350`) [V; scambio caldo B42]. La tappa B36.1 accende solo le prime quattro righe, con i bordi e
l'aria di oggi; fascia della riga, deriva e aria arrivano insieme nella B36.4 (vedi §2.4, ultimo punto).

**Oggi** [V `natpf_stroke_outcome.js`]:
- `mira = −c·0,1·(1−|t|) − c·1·t + piatto` (:355): spinta verso l'incrociato (:24) e tempo con lo stesso peso del
  piatto (:27, :36).
- Piatto pieno a 17° e poi in calo: da 45° conta meno, da 60° zero (`natpf_stroke_intent.js:53, :63, :196-201`).
- Punto neutro che segue la palla al 40% (:45, :285).
- Tenuta della riga che sparisce con 0,25 unità di tempo oltre la finestra (:59, :338): il bersaglio salta.
- Aria corretta solo lungo il campo (`natpf_skill.js:883`); il servizio la corregge anche di lato (:903-919).
- Bambini ed Evento usano la riga «Facile» dell'assistenza: i livelli non hanno `name` e `assistOf` sceglie da
  `assistWindow` (:219) [V con node].

**Numeri** (Esperta, 18 m/s, dritto del destro dal centro, mira piena 17°) [P]:

| | Oggi | Bozza |
|---|---|---|
| x con la cima a 0 / 10 / 17 / 25 / 50 / 60° | −0,11 / −2,08 / −3,80 / −3,80 / −2,73 / −0,11 m | 0 / −1,60 / −3,20 / −3,99 / −4,00 / −4,00 m |
| Solo tempo, da anticipo pieno a ritardo pieno | da −3,59 a +3,59 m | da −0,96 a +0,96 m |
| Cima lungolinea piena con anticipo pieno | +0,29 m: si annullano | +2,24 m |
| Salto più grande per 10 ms (Esperta e Leggenda, 18 e 25 m/s) | 1,61–1,98 m | 0,23–0,48 m |
| Lungolinea pieno, ritardo da 78 a 90 ms | bersaglio da 4,03 a 5,88 m; sul rimbalzo vero fuori da circa 84 ms | da 3,61 a 3,88 m; fuori solo verso 109 ms |
| Rimbalzo vero / spostamento voluto, di lato | 0,85–0,91, mediana 0,86 [V `aria.mjs`] | 1 (aria corretta) |

Esempio dell'aria [V]: dal centro, bersaglio −3,8 m → rimbalzo −3,13 m; dall'angolo del dritto (palla a +3,5),
bersaglio −3,8 m → rimbalzo −2,69 m.

### 2.3 Cosa è deterministico, cosa resta di rumore e di aiuto, e perché

- **Deterministico.** Stessi ingressi, stesso esito. Già oggi nei colpi da fondo non c'è caso: il seme vale solo per il
  colpo controllato a rete (`natpf_stroke_outcome.js:1-15, :336`) [V]. La bozza non aggiunge termini casuali.
- **Il rumore che resta è solo quello del gesto.**
  - Cima: 0,23 m per grado con P 17° (0,19 con P 20°). Un gesto buono (±5°) sparge circa ±1 m; una persona vera (±12°,
    stima delle diagnostiche [L]) circa ±2,3–2,8 m. **È il rumore principale e non è mai stato misurato con telefoni veri.**
  - Tempo: con peso 0,3, ±0,45 unità valgono ±0,4 m (oggi ±1,6 m).
  - Forza: profondità, circa ±1 m per una persona vera [L].
- **Aiuti che restano, e perché.**
  - Zona morta di 3° e tetto a 1,6 × P: i colpi normali non si spostano; chi gira troppo non va oltre la riga.
  - Fascia sicura: fino alla mira piena il solo piatto non manda mai fuori, a ogni livello e in ogni situazione. Serve ai
    bambini: con il rumore ipotizzato ±16° fuori 1,7% invece di 4,2% [P].
  - Tenuta della fascia della riga legata alla sola situazione: vicino alla riga il rischio c'è, ma si vede e si dice.
  - Il tempo pesa poco, quindi un ritardo dello schermo pesa poco. Il ledwall non è misurato: «Ritardo dello schermo» è 0
    di base (`natpf_phone_racket.js:228, :268`) [V]. Con 60 ms di ritardo fisso, prima che il ritardo abituale B35a se ne
    accorga: incrociato voluto oggi a 0,0 m (al centro), bozza −2,0 m; centro voluto oggi +2,5 m, bozza +0,7 m. Con
    90 ms il lungolinea oggi esce (5,0 m), con la bozza resta dentro (3,6 m) [P, gesto a 15°, rimbalzo vero].
- **Niente calamite.** La cella di 1×1 m più piena raccoglie il 7,2–7,5% delle combinazioni (oggi 10–11,8%) [P].

### 2.4 Come si incastra con il resto

- **Tempo.** Non cambiano il voto (Anticipo, Perfetto, Ritardo), il segnale del momento giusto (verde = Perfetto) né la
  finestra d'impatto. Il super resta legato al tempo (|t| ≤ 0,6: `natpf_stroke_outcome.js:467`) [V].
- **Centro della mira (B35a).** Con la cima al comando, l'errore del centro diventa errore di direzione. Gesto buono,
  Esperta, P 17°: centro giusto 90% di colpi nella fascia voluta; sbagliato di 4° 82%; di 8° 63%; di 12° 46% [P]. Per
  questo la tappa B36.3 lo ferma dopo gli scambi di prova.
- **Scambi di prova (B28).** Sono la calibrazione di base (`natpf_trial_learn.js:42`) e danno il seme fidato del centro
  (`natpf_phone_racket.js:891`) [V]. In fiera ogni visitatore li fa (decisione del 13/11). Con «Salta» o «Nessuna» il
  centro resta adattivo come oggi: meno coerente, da scrivere nella guida dello staff.
- **Scambio caldo (B42).** Dal 20° colpo la qualità scende [B42]. Nella bozza la qualità decide la tenuta della riga:
  nello scambio caldo la palla mirata sulla riga esce più spesso, quella mirata all'angolo no. Va d'accordo con B42 (lo
  scambio finisce), ma la scritta lo dice: «Fuori · scambio caldo». La palla più veloce stringe anche la finestra in
  ritardo (1,4 m/|vz|: `natpf_stroke_outcome.js:476`) [V]: lo stesso errore in ms vale più eccesso.
- **«Fuori» all'atterraggio (B37).** L'esito si decide al colpo, come oggi; B37 lo dice quando la palla tocca terra o la
  rete [B37]. La bozza aggiunge solo la causa: «troppo angolato» (fascia della riga), «in anticipo / in ritardo»
  (eccesso), «in corsa / palla veloce / scambio caldo» (situazione). Con l'aria corretta di lato il rimbalzo previsto e
  quello vero coincidono meglio [D].
- **Una scoperta per le misure** [V + P]. Il banco B35a giudica il fuori sul bersaglio (`direzione-telefono.mjs:104`),
  senza l'aria e senza la tolleranza dell'arbitro (+0,22 m: `game_engine.js:3191`). L'aria di oggi è un margine nascosto
  del 14%: i fuori veri di oggi sono meno di quelli del banco. Esempio [P]: Leggenda, qualità 0,75, gesto buono: 11% di
  fuori giudicando il bersaglio, 3% giudicando il rimbalzo vero. Con l'aria corretta il margine sparisce: per questo la
  correzione dell'aria va insieme alla fascia sicura (tappa B36.4), mai da sola. Con l'aria corretta e i bordi di oggi,
  Leggenda in corsa con il gesto buono passerebbe dal 3% al 20% di fuori [P].

---

## 3. Colpi per gesto

### 3.1 Dal gesto al colpo

| Gesto | Colpo | Note |
|---|---|---|
| Cima verso il centro / verso l'esterno all'impatto | incrociato / lungolinea; dritta: centro | più giri, più angolo; oltre la mira piena «sulla riga» |
| Gesto più lento / come il solito / più veloce | metà campo / profondo / in fondo e veloce | forza relativa al colpo tipico, curva 0,7 (`:54-55, :363`) [V] |
| Testa che sale | top spin: più alto sulla rete, più carico, più sicuro | come oggi |
| In piano e forte | piatto: teso e veloce | come oggi |
| Dall'alto verso il basso | tagliato: basso, più corto | come oggi |
| Dal basso in alto, verticale (o lento) | pallonetto, con la direzione della cima | come oggi |
| Cima oltre la mira piena verso la diagonale + gesto morbido | **angolo corto**, 4,6–6,6 m dalla rete | nuovo (tappa B36.5) |
| Un attimo prima / dopo | ritocco di direzione; prima un po' più veloce e bassa, dopo un po' più lenta, alta e corta | il ritocco di velocità e altezza è nuovo (B36.5) |
| Molto prima / molto dopo | la palla scivola verso fuori e si accorcia | continuo, con la causa |
| Gesto fortissimo, a tempo, da fermo, palla giusta | colpo super | invariato (B42 lo rende più facile nello scambio caldo) |
| Palla alta e gesto dall'alto | schiacciata | invariata |
| Servizio | servizio | invariato (`serveOutcome`, :620-638) |

### 3.2 Punto d'impatto = tempo

Il corpo lo mette il movimento automatico: palla a 0,72 m di lato e 0,35 m davanti (`natpf_impact.js:32`;
`natpf_stroke_outcome.js:496`) [V]. Chi gioca sceglie il punto d'impatto solo con il tempo:
- prima (palla davanti): un po' più incrociata, un po' più veloce e bassa;
- dopo (palla di fianco): un po' più lungolinea, un po' più lenta, alta e corta.

Valori di partenza, piccoli, da tarare con `colpi.mjs` [D, dal piano «prima il gioco»]: anticipo u → volo × (1 − 0,05·u),
altezza − 0,08·u m; ritardo → volo × (1 + 0,08·|u|), altezza + 0,12·|u| m, profondità − 0,4·|u| m.

### 3.3 Spenti all'inizio: palla corta e volée

Proposta (decisione D2), **solo con «Nuova»**:
- il gesto della palla corta diventa un tagliato morbido;
- chi gioca non prende la palla al volo: il piano aspetta il rimbalzo (l'opzione `groundOnly` c'è già:
  `natpf_impact.js:132, :205`) e non sale a rete dopo un attacco (`approachOf`, `natpf_net_play.js:76-89`) [V];
- la CPU non fa palle corte e non sale a rete (`NET_PLAY.cpu.approach` :44, `drop` :61) [V].

Restano pallonetto, schiacciata sulle palle molto alte, servizio e super. Tutorial, allenamento e minigiochi non cambiano.
Con «Classica» il gioco a rete del B31 resta com'è.

**Come tornano** (tappa B36.10, quando l'utente lo chiede): la palla corta con la direzione della cima e la profondità
dalla forza; la volée come colpo bloccato con la direzione della cima (la tenuta laterale della volée c'è già:
`natpf_stroke_outcome.js:89-95, :315, :349`) [V].

---

## 4. Campo aperto e precisione

### 4.1 Zone

Riferimento di chi colpisce, specchiato per il rovescio e i mancini. «Diagonale» = la metà opposta alla palla se la palla
è ad almeno 1 m dal centro, altrimenti il lato dell'incrociato. Così il dritto dall'angolo del rovescio ha inside-out e
inside-in giusti. Gesto buono, Esperta, palla dal centro / dall'angolo del dritto / dritto dall'angolo del rovescio [P]:

| Zona | Dove | Gesto | Oggi | Bozza |
|---|---|---|---|---|
| Profondo in diagonale | diagonale, oltre 1,4 m dal centro, oltre 9 m dalla rete | cima alla mira piena | 40 / 25 / 65% | 93 / 94 / 93% |
| Lungolinea profondo | metà della palla, oltre 1,4 m, oltre 8,5 m | cima dall'altra parte | 89 / 99 / 71% | 94 / 95 / 93% |
| Centro profondo | entro 1,2 m, oltre 9,5 m | cima dritta, forza piena | 78 / 44 / 31% | 89 / 90 / 89% |
| Angolo corto | diagonale, oltre 2,6 m, 4,5–7 m | cima oltre la mira piena, gesto morbido | 43 / 57 / 0% | 78 / 78 / 79% |
| Sulla riga | tra 3,6 m e la riga | cima a 1,45 × mira piena | 0 / 0 / 0% | 76 / 74 / 75% |

La metà campo (palla debole, 6,4–8,5 m) non è un bersaglio: è il colpo morbido.

### 4.2 Come si premia la precisione

- **Vincenti dalla CPU in difficoltà.** `cpuErrorChance` moltiplica allungo, corsa e velocità per l'angolo e per la
  minaccia (forza e profondità) (`natpf_skill.js:712, :734-752`) [V]. Più angolo e più profondità danno più errori e più
  vincenti, senza regole nuove.
- **La riga è una conquista.** Ci si arriva solo girando oltre la mira piena. Con un colpo pulito resta dentro. Costa solo
  se il tempo o la situazione sono sbagliati, e la scritta dice quale dei due.
- **Riscontro.** Nome della zona al rimbalzo e, se l'utente vuole, i vincenti per zona a fine partita (dentro la schermata
  di B40).

### 4.3 Quanto costa un gesto sbagliato

| Errore | Effetto con la bozza | Oggi |
|---|---|---|
| Cima sbagliata di 5° | ~1,1 m di lato, dentro | ~1,1 m (ma il tempo può coprirla o raddoppiarla) |
| Tempo sbagliato dentro la finestra (±0,5 unità) | ±0,5 m | ±1,6–1,8 m |
| Tempo oltre la finestra (1 unità oltre) | la palla scivola di D metri verso fuori, più corta di 0,8 m | salto fino a 2 m in 15 ms |
| Mira sulla riga e ritardo | fuori circa 14 ms oltre la finestra (Esperta, 18 m/s) | fuori circa 6 ms oltre (rimbalzo vero) |
| Mira all'angolo e ritardo | fuori circa 31 ms oltre la finestra | fuori circa 6 ms oltre |
| In corsa (qualità 0,75) a Esperta | niente di nuovo: la fascia della riga tiene (h = 1) | come oggi |
| Situazione molto difficile (qualità 0,6), riga voluta | Evento 0% fuori, Esperta 58%, Leggenda 71% | non misurato |

Numeri [P], Esperta, 18 m/s; l'ultima riga da `riga.mjs` (P 20°).

---

## 5. Il gioco resta equilibrato

### 5.1 Livelli contro la CPU

Regola di base (decisione del 23/10, `natpf_stroke_outcome.js:184-188`) [V]: **il livello cambia la precisione chiesta,
non dove può andare la palla**. Nella bozza cambiano per livello solo la finestra (come oggi), `assistQ` (come oggi) e la
deriva D. Il campo raggiungibile è uguale per tutti. Se un criterio cade si corregge **la CPU**, mai le regole di chi gioca
(decisione B16 a).

| Livello («Chi gioca») | Cosa cambia per chi gioca | Rischio | Criterio |
|---|---|---|---|
| Bambini (Bambino) | più direzione, meno fuori [P 4,2 → 1,7%] | la CPU va sempre al centro (test B18) | il bambino vince game come oggi |
| Facile (Ragazzo) | più angoli | basso | adulto medio ≥ 90% dei game; bambino ≥ 31% (`cpu-pressione.mjs:179-180`) [V] |
| Evento (Adulto) | più angoli: il livello si alza da solo (k si ferma a 65 punti) | k che arriva al tetto | adulto 60–70 punti **e k finale < 0,95** (nuovo) |
| Esperta (Pro) | più vincenti | diventa più facile; l'utente ha detto «Pro resta com'è» (11/11) | profili con il telefono entro ±5 punti dalla base (nuovo) |
| Leggenda | come Esperta; nella fascia della riga in corsa un po' più di rischio [P +2…3 punti di fuori] | margine dei criteri | quelli di `audit:legend` |

**CPU in difesa** [D]: prima leva il recupero dopo il proprio colpo. Oggi a Facile, Evento ed Esperta la CPU torna a
x = clamp(−0,25·g; ±1,6) (`game_engine.js:2800`), la Leggenda sulla bisettrice (`legendRecover`, :2803) [V]. Si porta
la bisettrice agli altri livelli. Poi la lettura della palla larga (`cpuWide`, `natpf_skill.js:44, :61`) [V]. La portata
resta fissa: allungarla sarebbe un trucco che si vede [L].

**CPU in attacco**: invariata. Sceglie i bersagli con il suo modello (`cpuShotChoice`, `natpf_skill.js:945`;
`legendDecide`, `natpf_legend.js:204`) [V]. Il suo caso non tocca la coerenza di chi gioca. La sua aria resta com'è (la
Leggenda la compensa con `kLat`, `natpf_legend.js:48, :310, :330`) [V].

### 5.2 Stesso schermo

- La bozza vale per tutti e due i telefoni, a specchio (test `natpf-mancini`, `natpf-b20-specchio` [L]).
- Aiuto al più giovane (variante G: finestra × 2, +0,1 s, palla verso di lui 10% più lenta, il suo colpo 1 m più in
  fondo: `natpf_duo_rules.js:163-167`) [V] resta. Con il tempo che pesa poco, la parte dell'aiuto sul tempo conta meno per
  la direzione [D]. Criterio b25: bambino contro adulto medio 38–42% dei punti, mai oltre 50%. Se scende sotto 38%: per
  chi è aiutato deriva D × 0,5 («più margine sulle righe», detto a schermo). Mai punti regalati (decisione del 12/11).
- Nome: il «Campo aperto» dello stesso schermo esiste già (`natpf_duo_rules.js:24, :87`) [V]. L'interruttore di B36 si
  chiama «Direzione dei colpi».

### 5.3 Sfida tra due computer

L'host calcola l'esito. Il gesto del P2 arriva con tutto `natpf` (`relayedNatpf`, `natpf_skill.js:301-307`), compresi
`aimDev` e `aimFull` (`natpf_phone_racket.js:274-275`) [V]. La bozza usa proprio questi due: **nessun campo nuovo nei
messaggi**; un P2 senza `aimDev` gioca con la regola di oggi. Il centro della mira del P2 sta sul suo computer: il
centro fermo (B36.3) vale solo se il P2 ha la stessa versione. Decisione del 04/11: la sfida non si sviluppa, ma resta
verde (`natpf-1v1-p2p` con «Nuova»).

### 5.4 Fuori dalla bozza

- **Webcam, mouse, tastiera, telefoni senza forma**: l'intenzione è ricostruita (`derived: true`,
  `natpf_stroke_outcome.js:506-516`) [V]. Restano con la regola di oggi anche con «Nuova» (con il tempo a 0,3
  perderebbero il lungolinea, che oggi ottengono solo con il ritardo [L]).
- **Doppio e P2 senza telefono**: catena vecchia con i sorteggi [L `game_engine.js:2145-2183, :2530-2557`]. Lì la
  coerenza non vale: va scritto.

### 5.5 `audit:legend` e gli altri banchi

**Si muovono** (profili con il telefono: `rally-balance.mjs:24-31`) [V]:
- Leggenda contro «tennista»: CPU ≥ 85% dei game. Base: 86,6% prima di B42, **92,2% con B42** [B42, da rifare].
- Leggenda contro «amatore»: CPU ≥ 90%; **errori della CPU 2–6%: 2,2% prima di B42, 2,1% con B42** [B42], sul bordo.
  Con più angoli dovrebbero salire [D].
- Leggenda contro «bambino»: CPU ≥ 98%.
- Anche le righe della CPU («incrociati 30–50%», schemi, «palle lasciate passare») possono muoversi un poco.

**Non si muovono, ma diventano ciechi**: «medio», «preciso», «impreciso» mandano `dirX`, cioè un'intenzione ricostruita
(`rally-balance.mjs:16-18, :129-133`) [V]. Quindi «Esperta contro medio 70–85%» (oggi 75,2%, con B42 75,9% [B42]) e
«Facile contro medio ≥ 95%» non vedono B36.

**Prima gli strumenti.** I giocatori simulati con il telefono mirano invertendo la mappa di oggi, soprattutto con il tempo
(`rally-balance.mjs:42-63`) [V]; così fanno anche `b19/due-umani*.mjs`, `precision-combo.mjs`, `rete-diag.mjs` [L]. Se
non si cambiano, i banchi misurano «uno che conosce le regole vecchie». Vanno portati a mirare con l'inversa della regola
attiva (con «Classica»: numeri uguali alla base).

**Criteri nuovi** (tutti con «Nuova»; semi 1,2 e 3,4; per l'equilibrio 24–40 semi):
1. Matrice della direzione (banco B35a esteso): gesto «piatto 12°» di oggi ≥ 78% giusti, persona vera ≥ 55% (oggi 73% e
   49% [V]); gesto insegnato ≥ 88% e ≥ 62%; incrociato ↔ lungolinea scambiati 0% (buono) e ≤ 2% (persona).
2. Fuori con il gesto pulito: 0% a Bambini, Facile, Evento, Esperta e 1v1, da fermi e in corsa leggera.
3. Serie di 14 colpi uguali: ≥ 13/14 per incrociato, centro e lungolinea (oggi 12, 9 e 7 su 14 [V]).
4. Continuità: ≤ 0,5 m per 10 ms e ≤ 0,35 m per grado.
5. Zone del §4.1 da tre posizioni: profondo in diagonale, lungolinea, centro ≥ 85%; angolo corto ≥ 65% con il gesto e ≤
   10% senza; cella più piena ≤ 10%.
6. Rimbalzo vero − bersaglio ≤ 0,15 m nel 95% dei colpi della racchetta.
7. Profili con il telefono a Esperta entro ±5 punti dalla base; profilo nuovo «medio con il telefono».
8. Evento: adulto 60–70 punti e k finale < 0,95. b25: 38–42%, mai oltre 50%.
9. `audit:rete`: con «Classica» invariato; con «Nuova» e fondo campo, volée e palle corte a 0.
10. Con «Classica»: esito identico bit per bit (10 000 casi a caso), impronte identiche, `audit:legend` identico.

---

## 6. Tappe

Regole per ogni tappa: un agente, al più due in parallelo; test del gioco e del sito verdi, build se serve, prove nel
browser, schermate guardate, commit, push, **versione nuova con i pacchetti** e «come si attiva» all'utente. Fino alla
tappa B36.8 **«Classica» resta il valore di base**: con l'interruttore spento il gioco è identico e `audit:legend` non
cambia. L'interruttore dello staff vale per tutta la modalità nuova; dentro, ogni parte ha una sua riga in
`natpf_direction.js` per i banchi.

**Quando.** Dopo la coda decisa dall'utente (B43, B41 parte 1, B38+B39, B41 parte 2, B40). File in comune da tenere
d'occhio: `natpf_kiosk.js` (B39, B41, B43: la voce nuova va nella riga in basso del pannello, `index.html:260` [V]),
`natpf_shot_feedback.js` (B37), `game_engine.js` (B42, B43), `natpf_trial*.js` e `natpf_phone_racket.js` (B41, B28.1).

### B36.1 · La cima comanda (prima tappa che si vede)
- **Cambia** (solo «Nuova», solo telefono con la forma): peso del tempo 0,3; spinta naturale 0; punto neutro al centro;
  curva del piatto senza il calo tra 45° e 60° (piena da P, oltre 60° non letta). Bordi, aria e profondità **come oggi**.
  Testi dell'allenamento e delle schede incrociato/lungolinea: «gira la cima» (solo con «Nuova»).
- **File**: `natpf_direction.js` (nuovo: costanti, `directionRules`, lettura dell'opzione, `zoneOf`);
  `natpf_stroke_outcome.js` (`strokeOutcome` riceve `dir`; con `null` il codice di oggi; :285, :354-356);
  `game_engine.js:2355` (passa `dir` con `natpf.aimDev` e `natpf.aimFull`, che già arrivano: `natpf_phone_racket.js:274-275`);
  `natpf_kiosk.js` (voce);
  `diag/diag_recorder.js:263` (modello e parti della mira); `natpf_training.js:30-31`, `natpf_gesture_motion.js:111-114`.
- **Prove**: test `natpf-b36-interruttore` (con «Classica» esito identico su 10 000 casi; intenti ricostruiti sempre
  classici) e `natpf-b36-direzione` (monotonia, specchio P1/P2 e mancino, determinismo); banco
  `direzione-telefono.mjs --modello=classica|nuova` con il gesto «insegnato» e tre posizioni della palla; banco veloce
  `scripts/audit/b36/mappa.mjs` dal prototipo.
- **Criteri**: criterio 1 del §5.5; fuori del gesto buono 0% a ogni livello; solo tempo ≤ ±1,2 m; con «Classica»
  impronte (b25, b32, B18 Leggenda e palla corta, `fine-partita`, `evento-bambini`, B37, B42) e `audit:legend` identici.
  Stima [P]: Esperta gesto buono 83 → 90%, persona vera 55 → 64%.
- **Interruttore**: pannello dello stand → «Direzione dei colpi: Classica · Nuova» (chiave `natpf-tennis.direzione`;
  indirizzo `?direzione=nuova`); `directionRules.model` per test e banchi.
- **L'utente vede**: girando la cima la palla va più larga; il tempo la sposta poco; niente colpi che si annullano.
  **Avviso**: in questa tappa la Leggenda con «Nuova» è più facile (fuori in corsa della persona vera [P] 14% → 0,4%)
  fino alla B36.4.

### B36.2 · Solo da fondo campo (se D2 = sì)
- **Cambia** (solo «Nuova»): il §3.3.
- **File**: `natpf_direction.js` (`baselineOnly`), `natpf_impact.js:132-205`, `natpf_net_play.js:44, :61, :76-89`,
  `natpf_stroke_outcome.js` (palla corta → tagliato morbido).
- **Prove**: test (con «Nuova», 200 punti simulati: 0 volée di chi gioca, 0 palle corte e 0 salite a rete della CPU; con
  «Classica» identico); `audit:rete` invariato con «Classica»; banco B42 degli scambi lunghi.
- **Criteri**: volée e palle corte a 0 con «Nuova»; punti oltre 30 colpi non più della base B42 + 2 punti.
- **L'utente vede**: con «Nuova» si gioca solo da fondo campo, come nel video.

### B36.3 · Riferimento fermo
- **Cambia** (solo «Nuova», seme fidato degli scambi di prova): il centro della mira resta entro ±4° dal seme; si
  muove solo con i colpi quasi dritti (entro 5°, 0,03 a colpo) e con la pendenza comune di dritto e rovescio; niente
  `biasPull`; resta la verifica dopo 4 colpi (oltre 35°: si prende la mediana). Con «Salta» o «Nessuna» come oggi.
  Da misurare: colpo tipico della forza fermo dopo gli scambi di prova (oggi mediana degli ultimi 24:
  `natpf_phone_racket.js:138`) [V].
- **File**: `natpf_gestures.js:159-220`, `natpf_phone_racket.js:800, :891`.
- **Prove**: banco `--serie` esteso (mira tenuta 8°, 15°, 25°; tempo tenuto; calibrazioni al contrario); test della serie.
- **Criteri**: serie ≥ 13/14 per incrociato, centro e lungolinea; mira di 15° tenuta 30 colpi: mediana degli ultimi 5
  entro 0,5 m dai primi 5; un riferimento sbagliato di 26–40° si corregge come oggi.
- **L'utente vede**: lo stesso gesto va nello stesso posto anche dopo molti colpi.

### B36.4 · Righe vere, senza scogliere
- **Cambia** (solo «Nuova»): fascia sicura fino ad A = 3,2 m; fascia della riga fino a 4,0 m girando oltre la mira piena
  (curva fino a 1,6); tenuta dalla sola situazione; deriva continua oltre la finestra; **aria corretta di lato** per i
  colpi della racchetta; causa del fuori nel verdetto di B37.
- **File**: `natpf_direction.js`; `natpf_stroke_outcome.js:338, :354-358`; `natpf_skill.js` (`fixAirRally`, come
  `fixAirServe` :903-919 ma senza il controllo della rete, che fa già il lancio); `game_engine.js:2227, :2604`;
  `natpf_shot_feedback.js` (causa).
- **Prove**: test di continuità e dei fuori per livello; rimbalzo vero con `flyAir`; prova nel browser nuova
  `tools/e2e/natpf-direzione-b36.mjs` (messaggi `sw` con `fh` noti → anello e «Fuori · troppo angolato» all'atterraggio).
- **Criteri**: 2, 4, 6 del §5.5; riga voluta ≥ 70% tra 3,6 m e la riga; Leggenda in corsa: fuori non oltre «Classica»
  + 5 punti [P: +2…3].
- **L'utente vede**: girando di più si arriva sulla riga; sulla riga si esce solo con il tempo sbagliato o in corsa, e la
  scritta lo dice quando la palla cade.

### B36.5 · Tutto il campo: profondo d'angolo, angolo corto, tempo = punto d'impatto
- **Cambia** (solo «Nuova», colpi da fondo): via l'accorciamento automatico dell'incrociato largo (:373; resta nella
  chiusura a rete); angolo corto scelto (diagonale, piatto ≥ 1, forza ≤ 0,45 → 4,6–6,6 m); ritocco di velocità e
  altezza dal tempo (§3.2).
- **File**: `natpf_stroke_outcome.js:364-374`, `natpf_direction.js`; il volo in `game_engine.js:2393` se serve.
- **Prove**: banco delle zone da tre posizioni; `colpi.mjs` (km/h e profondità); `audit:rete`.
- **Criteri**: 5 del §5.5; forza 0,3 / 0,5 / 0,8 → profondità mediane separate di almeno 1 m in ogni direzione (oggi
  incrociato largo 6,9 / 7,4 / 8,0 m [L]); nessuna palla lunga con il gesto pulito; km/h dei colpi a tempo ±3%.
- **L'utente vede**: incrociati profondi e angoli corti che oggi non escono.

### B36.6 · Riscontro e insegnamento
- **Cambia**: nome della zona al rimbalzo nella scritta che già c'è («Lungolinea», «Incrociato», «Angolo», «Sulla riga»,
  «Angolo corto») e la stessa parola sul telefono; «fantasma» della mira solo in allenamento e tutorial; dimostrazioni con
  il giro insegnato (circa 0,85 × mira piena: il gesto insegnato deve cadere all'angolo con un margine); suggerimenti
  dell'allenamento; Precision e Combo a zone; esercizi nuovi della prova guidata (riga, angolo corto, profondo).
- **File**: `natpf_shot_feedback.js`, `natpf_training.js`, `natpf_gesture_motion.js`, `natpf_gesture_pose.js`,
  `natpf_arcade.js`, `natpf_events.js`, `diag/diag_protocol.js`, `site/js/tennis/phone-screen.js` (versione del telefono).
- **Prove**: test di fedeltà su `natpf.aimDev` e zona (oggi legge `natpf.wrist`: `natpf-gesture-pose.test.mjs:286`) [V];
  prove nel browser `natpf-training-flow`, `natpf-tutorial-phone`, `natpf-gesti-*`, `natpf-minigiochi-principianti`;
  schermate a 1920×1080, nell'area del ledwall e a schermo diviso; telefono con la pagina vecchia.
- **Criteri**: fedeltà verde con «Nuova»; schermate guardate; misure in `cqw`/`cqh`; nessuna voce nuova.
- **L'utente vede**: «Sulla riga!» quando la palla cade, anche sul telefono.

### B36.7 · Equilibrio
- **Cambia**: giocatori simulati che mirano con l'inversa della regola attiva (con «Classica»: numeri uguali alla base);
  profilo «medio con il telefono»; poi, solo se un criterio cade, la CPU (§5.1) e l'aiuto dello stesso schermo (§5.2).
- **File**: `scripts/audit/rally-balance.mjs`, `b19/due-umani*.mjs`, `precision-combo.mjs`, `rete-diag.mjs`;
  `natpf_skill.js`, `game_engine.js:2800`, `natpf_legend.js`, `natpf_duo_rules.js`.
- **Prove**: `audit:legend` (40 semi), `audit:cpu -- --obiettivi`, `audit:evento`, b25 aiuto, `audit:rete`,
  `audit:movimento`, `natpf-1v1-p2p` e le prove nel browser dello stesso schermo con «Nuova».
- **Criteri**: 7, 8, 9 del §5.5 e tutti quelli di `audit:legend`.
- **L'utente vede**: niente di nuovo; i numeri nel documento.

### B36.8 · Prova allo stand e accensione
- **Cambia**: registro dello stand con i campi nuovi (scarto, tempo in finestre, zona, rimbalzo vero, fuori al rimbalzo,
  modello) nelle due copie (`registro_formato.js:48`, `cloudflare/registro-worker.js:99`) [V]; **l'utente ricarica il
  Worker**. Oggi la riga «colpo» segna fuori solo i colpi falliti, non i fuori di lato (`registro_registratore.js:352`)
  [V]. Poi la prova con un telefono vero; poi, se l'utente dice sì, «Nuova» di base, test e impronte riallineati con il
  commento «prima X, ora Y, perché». «Classica» resta un'opzione per almeno una versione.
- **Criteri**: telefono vero: errore del centro ≤ 4° dopo gli scambi di prova; giusti con il gesto insegnato ≥ 65%;
  suite complete, build, prove nel browser.
- **L'utente vede**: la modalità nuova di base.

### B36.9 · (facoltativa) Segnale del telefono
Solo se la prova vera mostra mire fantasma o deriva: posa «pronto» ferma con la palla in arrivo e svelta a palla lontana;
piatto letto a metà campione; `base`, `baseRate`, `turn` solo nella diagnostica. Versione nuova della pagina del
telefono. Tutti i campi facoltativi e girati con il verso (`signedSwing`, `natpf_trial_learn.js:115`) [V].

### B36.10 · (dopo) Palle corte e volée nella mappa nuova
Quando l'utente lo chiede (§3.3).

---

## 7. Rischi e cosa non si sa

1. **Il rumore vero della cima non è misurato.** I ±12° della «persona vera» vengono da diagnostiche che mescolano mire
   volute ed errori del centro [L]. Nel repository non ci sono registrazioni di telefoni veri [L]. Se il rumore vero è
   ±18°, la direzione «comandata» sembrerà caso. Coperture: l'interruttore, l'opzione della sensibilità, la prova vera.
2. **Il centro della mira è il collo di bottiglia.** Con 4° di errore si perdono 8 punti di giusti, con 8° circa 27 [P].
   Con 2 colpi normali per lato negli scambi di prova l'errore del seme non è noto.
3. **Posa «pronto» e deriva del giroscopio.** Simulate: mira fantasma fino a circa 2 m dopo una pausa con il corpo
   girato; deriva non tolta con «Giocando» [L]. Con la cima al comando diventano errori di direzione.
4. **Equilibrio.** Esperta e Leggenda possono diventare più facili (più vincenti), Evento può arrivare al tetto di k.
   Il criterio più stretto: errori della CPU contro «amatore» al 2,1–2,2% (soglia 2%) [B42, da rifare].
5. **Banchi verdi per la ragione sbagliata** se i giocatori simulati non si cambiano (§5.5).
6. **Chi ha imparato «un attimo prima / dopo»** perde il controllo. Prova B35a, gesto «tempo»: oggi 58% giusti [V]; con il
   tempo a 0,3 quasi solo «centro» [D]. Testi e dimostrazioni cambiano nella stessa tappa.
7. **Scambio caldo**: dal 20° colpo più fuori sulla riga (voluto, ma da spiegare). Le misure di B42 vanno rifatte con
   «Nuova».
8. **Due regole nello stesso prodotto**: telefono con la regola nuova, webcam, mouse e doppio con quella di oggi.
9. **Si scopre in due minuti?** Il tutorial corto non ha la direzione (5 schede: `natpf_tutorial.js:42`) [V]. Che un
   visitatore scopra «la cima decide» solo dal riscontro non è misurato; l'angolo corto (girato + morbido) ancora meno.
10. **Prototipo semplificato**: una palla, niente telefono simulato, niente centro che impara, niente ritmo, rimbalzo vero
    di oggi stimato con 0,86. Il prototipo ritrova però il banco vero per oggi: gesto da 12°, 74–75% e 51% contro 73% e
    49% del banco [P/V].
11. **Documenti in disaccordo sulla Leggenda a rete.** Nel codice chi gioca sale a rete dopo un attacco anche a Leggenda
    (`approachOf` senza controllo del livello: `natpf_net_play.js:76-89`; `game_engine.js:2305`) [V]. La traccia dice che
    la decisione 1 (Leggenda senza salita) è stata tenuta da parte e che l'utente il 13/11 ha detto «resta com'è»
    (`docs/TRACCIA_PASSI.md:438-441, :456`) [V]; `docs/PROJECT_MEMORY.md:832` e `docs/RIPRESA_AGENTE.md` §4 dicono invece
    «Leggenda senza salite a rete automatiche». B36 non lo cambia (con «Nuova» e fondo campo la salita non c'è a nessun
    livello); il documento va chiarito con l'utente.
12. **Stand con il solo mouse**: la prova guidata si apre con Maiusc+D; allo stand c'è solo il mouse. Serve una tastiera
    per la prova vera, o la strada con il mouse di B39.

---

## 8. Decisioni per l'utente

Per ognuna la scelta consigliata è la prima, in grassetto.

1. **Peso del tempo nella direzione: ritocco (0,3)** · 0,5 · come oggi (1). Perché: [P] +7–10 punti di colpi giusti,
   solo tempo ±1 m invece di ±3,6, un ritardo dello schermo pesa 3 volte meno. Prezzo: «un attimo prima / dopo» non mira
   più; si rifanno i testi.
2. **Palla corta e volée all'inizio: spente nella modalità nuova, per chi gioca e per la CPU** (tutorial, allenamento e
   minigiochi non cambiano) · restano con le regole di oggi, fuori dalla mappa nuova. Perché: è la richiesta e il video
   è tutto da fondo campo; le misure della direzione vengono più pulite. Prezzo: a Esperta e Leggenda la CPU non sale più
   a rete con «Nuova»; l'equilibrio va rimisurato.
3. **Fuori «per ambizione» (girare troppo con tempo e corsa perfetti): mai** · solo a Leggenda · anche a Esperta.
   Perché: il rischio vicino alla riga viene già dal tempo e dalla situazione, con la causa scritta. [P] A Leggenda, con
   la tenuta a metà, la riga voluta esce il 53% delle volte anche da fermi: troppo duro.
4. **Sensibilità nella modalità nuova: resta l'opzione dello staff, di base «alta» 17° (quella che l'utente ha trovato
   buona), e si insegna un giro di circa 15°** · «media» 20° con un giro di circa 17°. Perché: stessa sensibilità di oggi.
   Con 20° [P]: +2–3 punti di giusti e, a Leggenda in corsa, fuori come oggi invece di +2–3 punti; ma meno sensibile.
5. **Riferimenti fermi durante la partita** (centro della mira entro ±4° dal seme degli scambi di prova) · adattivi come
   oggi. Perché: oggi una mira tenuta lungolinea va nella fascia giusta 7 volte su 14 [V]. Prezzo: un seme sbagliato di
   pochi gradi resta per tutta la partita; si vede in diagnostica e c'è «Ricalibra».
6. **Scambi di prova come sono (4–6 palle); prima si misura l'errore del seme con un telefono vero, e solo se supera 4°
   si aggiunge la scritta «Rimanda la palla al centro»** · subito scritta e 2 palle in più (circa 5 s a visitatore).
   Perché: decisione del 13/11 (circa 10 s a visitatore in fiera); l'errore vero non è noto.
7. **Riscontro: nome della zona quando la palla cade (grande schermo e telefono), fantasma della mira solo in
   allenamento e tutorial, nessuna scritta nuova in partita** · fantasma anche in partita · niente di nuovo. Perché:
   l'utente ha chiesto meno testi durante la partita (B43); nel video non c'è mirino.
8. **Prova di 10–15 minuti con un telefono vero prima dell'accensione di base** (con la prova guidata: serve una tastiera,
   o la strada con il mouse di B39) · accendere senza. Perché: il rumore vero della cima è l'incognita più grande.
9. **Interruttore «Direzione dei colpi: Classica · Nuova» nel pannello dello stand, «Classica» di base fino alla tappa
   B36.8; poi «Nuova» per tutti i livelli insieme** · un livello alla volta (prima Bambino, Ragazzo, Adulto). Perché: una
   regola sola è più facile da capire; l'equilibrio si controlla per livello prima di accendere.
10. **Se Esperta diventa più facile: si rinforza la difesa della CPU** (recupero sulla bisettrice, come la Leggenda) · si
    lascia più facile. Perché: «Pro resta com'è» (11/11) e la difficoltà viene dalla CPU (B16 a).
11. **Webcam, mouse e tastiera restano con la regola di oggi** · entrano subito. Perché: senza la cima misurata
    perderebbero il lungolinea.

---

## 9. Cosa non si tocca

- Riconoscimento dei gesti sul telefono e la pagina del telefono (fino alla tappa facoltativa B36.9).
- Tipo di colpo (`classifyStroke`), forza e profondità voluta (`natpf_stroke_intent.js`), schiacciata, servizio, colpo
  super (con le regole di B42).
- Finestre d'impatto, voto, segnale del momento giusto (verde = Perfetto), ritmo e ritardo abituale di B35a (`te`, `rRest`,
  `lag`; `ritardoAbitualeMs` nella diagnostica).
- Verdetto all'atterraggio di B37 (si aggiunge solo la causa), gemma di chi serve, F9.
- Valori dello scambio caldo di B42.
- Con «Classica»: tutto, compresi gioco a rete del B31, movimento del B32 e la Leggenda.
- Webcam, mouse, tastiera, doppio, P2 senza telefono.
- Protocollo LAN (nessun campo nuovo), km/h veri, soglia «in corsa», fine partita (B35b/B40), modalità fiera (B41),
  «Chi gioca» e nomi dei livelli (`natpf_who.js:16, :19`) [V].
- Nessuna voce nuova; nessuna clip video dei gesti; il nome del gioco commerciale non va nei file.

---

## 10. Non verificato (da sapere prima di decidere)

- Tutti i numeri [P]: prototipo semplificato, da rifare con il banco vero e il motore.
- I numeri di B37 e B42 vengono dai loro rami con il commit «IN CORSO … NON verificato».
- Nessuna prova con un telefono vero, con il ledwall, con il programma Windows o con persone: né oggi né per la bozza.
- Rumore vero della cima, errore del seme degli scambi di prova, mira fantasma della posa «pronto»: solo simulati o
  stimati [L].
- Effetto della bozza su `audit:legend`, `audit:evento`, b25, `cpu-pressione`: non misurato, solo il verso atteso [D].
- Che spegnere palla corta e volée con `groundOnly`, `approach`, `drop` e palla corta → tagliato non abbia effetti
  collaterali: non provato [D].
- Che il visitatore scopra la regola della cima in una partita da due minuti: non misurato.
