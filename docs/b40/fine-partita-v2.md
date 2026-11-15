# B40 · Fine partita v2: card della partita, 12 trofei, personaggi che esultano

> **Nota del 15/11/2026 (ripresa dopo la 14.8).** Il codice del B40 è entrato in `natpf-simulator` con la versione
> **2026-11-14.7** (`8018967`, un solo commit insieme a B48, B49 e B50), non con un'unione del ramo: i commit citati qui
> sotto (`401eaee`, `dc64d2e`…) esistono solo nel ramo `b40-fine-partita` dentro
> `docs/consegna/2026-11-15/rami-b40-b48.bundle`. Questo documento e `b40-trofei-risultati.txt` non erano stati portati
> nella 14.7: ripresi dal ramo, con le misure (§5) e le prove (§7) rifatte sul codice unito.

Richiesta approvata dall'utente il 13/11 (sera): `docs/coda/B40-fine-partita-v2.md`. Piano dell'analista con la mappa del
codice e le prime misure: `docs/coda/B40-piano-analisi.md`. Decisioni dell'utente del 15/11 sulle proposte del piano: in
fondo a questo documento (§8). Ramo `b40-fine-partita` (worktree dello sviluppatore), passi B40.1–B40.6 in commit
separati.

La tavola grafica approvata (artifact `PMb2Gg3ZiakcHuqynZ2pJL`, righe «v2») **non si può più leggere** (l'apertura
risponde «non trovato»): la card è costruita dalla descrizione scritta della richiesta. Da guardare con l'utente.

## 1. Cosa vede chi gioca

A fine partita, dopo la scritta della partita (come prima: 1,8 s dopo), la schermata del B35 ha in più la **card della
partita**, tra il titolo e i pulsanti:

- **Contro la CPU**: a sinistra la card, a destra i **tre riquadri del B35** (le cose migliori della partita: restano
  quelli, con gli stessi numeri; a 16:9 sono in colonna con l'icona a sinistra, sul ledwall 1920×540 e nelle aree quasi
  quadrate 720×720 in fila come prima). Titolo grande («Vince Ada!», «Bella sfida, Visitatore 12!»), pillola dei game,
  pillola in basso (classifica o consiglio sul livello) e pulsanti **non cambiano**; il titolo resta largo quanto la
  scheda (il rimpicciolimento della B41.5 si comporta come prima).
- **La card**: una carta da collezione con
  - la **finestra del personaggio** scelto per la partita (Classici o Lob & Drop) **che si muove in loop**: chi vince
    **esulta** (salta con la racchetta alzata), chi perde **applaude** battendo la mano sulle corde della racchetta.
    Sono fotogrammi presi dal modello 3D vero della partita (§5); mentre si preparano (o se non si possono fare) c'è il
    ritratto disegnato di sempre che salta o dondola;
  - la **cornice del livello**: Bambini **azzurra**, Facile **argento**, Evento **giallo-verde**, Esperta **oro**,
    Leggenda **arcobaleno**; nello stesso schermo il colore della fascia di ciascuno (Bambino azzurra, Ragazzo argento,
    Adulto giallo-verde); nella sfida tra due computer giallo-verde;
  - il nastro **«MVP della partita»** (chi vince, del colore della cornice) o **«Bella sfida»** (chi perde);
  - il **nome** (o «Visitatore 12» in fiera, «Tu» senza nome) e il livello;
  - **fino a 3 trofei** con le medaglie di **bronzo, argento, oro**, l'icona, il nome e il valore («Razzo · 142 km/h»);
  - il **record di oggi**: «Record di oggi! 142 km/h» se questa partita ha fatto (o pareggiato) il colpo più forte del
    giorno su questo computer, o lo scambio più lungo (da 8 colpi); altrimenti il record da battere («Record di oggi:
    150 km/h»). Solo il valore, **mai il nome** di chi l'ha fatto;
  - il **prossimo trofeo** per chi perde e per chi vince senza trofei della partita, sempre in positivo: «Prossimo
    trofeo: Razzo d'argento a 155 km/h · 12 km/h in più» (se niente è vicino: «Cecchino di bronzo · colpisci quando
    l'anello diventa verde»).
- **Stesso schermo**: due card **una contro l'altra** («VS» in mezzo), la **corona** su quella di chi vince; dentro ogni
  card nome, nastro, i due riquadri del B35 di quel giocatore, i trofei e il record. La riga «Rivincita dai telefoni»
  resta sotto, libera.
- **Sfida tra due computer**: ognuno la sua card; sul computer del Player 2 niente Asso, Vincente e Muro (come finiscono i
  punti lì non si sa).
- **Doppio contro la CPU**: una card per la squadra di chi gioca (i colpi del compagno: §6).

Testi solo italiani e positivi (regola del B35: niente errori, niente numeri negativi); la voce del gioco non cambia
(nessuna voce nuova).

## 2. Come si attiva

Sempre acceso, non c'è un interruttore: la card c'è in ogni fine partita con i numeri (contro la CPU, stesso schermo, due
computer, fiera). Per le prove: `?ritratti=svg` nell'indirizzo lascia il ritratto disegnato (niente fotogrammi 3D).
Classifica del giorno, «Azzera oggi» e CSV come prima: «Azzera oggi» azzera anche i record di oggi; il CSV non cambia.

## 3. I 12 trofei e le soglie

Una sola tabella in `natpf-tennis/src/natpf/natpf_trofei.js` (`TROPHY_TIERS`): ritoccare una soglia è una riga.

| Trofeo | Valore | Bronzo | Argento | Oro |
|---|---|---|---|---|
| **Cecchino** | colpi Perfetti, soglia × game giocati | 16 | 21 | 27 |
| **Razzo** | colpo più forte finito in campo (km/h veri, B34) | 140 | 155 | 170 |
| **Maratoneta** | colpi dello scambio più lungo | 30 | 34 | 38 |
| **Asso** | **servizi vincenti**: ace o servizio non rimandato in campo (risposta in rete, fuori o a vuoto), soglia × √game | 3 | 4 | 5 |
| **Vincente** | vincenti (palla non presa), soglia × game | 4 | 5 | 6 |
| **Super** | colpi super riusciti | 1 | 2 | 3 |
| **Game a zero** | game vinti a zero; base dal livello della CPU (Bambini/Facile/Evento bronzo, Esperta argento, Leggenda oro; stesso schermo e due computer bronzo) + 1 per ogni game a zero in più | | | |
| **Rimonta** | solo partite vinte: 1 palla match annullata, o un game vinto da 2 punti sotto (0-30, 15-40), o la partita vinta da un game sotto = bronzo; 2 palle match = argento; 3 o più (da 0-40) = oro | | | |
| **In serie** | punti vinti di fila, + 2 per ogni game in più | 4 | 5 | 7 |
| **Muro** | colpi di gioco rimandati in campo di fila (servizio escluso; si azzera con un proprio errore), soglia × √game | 36 | 44 | 52 |
| **Prima volta** | prima partita di chi gioca (decisione del 15/11: un livello solo, bronzo di benvenuto) | sempre | | |
| **Re di oggi** | posto nella classifica delle partite di oggi: solo partita vinta, in classifica (con un nome o «Visitatore N», mai «Ospite»), con almeno 5 partite di oggi | 3° | 2° | 1° |

Regole della card: i trofei dal più alto (oro, argento, bronzo) e a parità dal più raro; «In serie» non si conta quando
«Game a zero» o «Rimonta» lo contengono con un livello uguale o più alto; **«Prima volta» si vede sempre**: con già tre
trofei prende il posto del terzo (§8, punto 1).

**Asso ridefinito** (richiesta del coordinatore: «raggiungibile ma raro»): con i servizi del telefono simulati l'ace non
è uscito in nessuna delle 8000 partite (come nell'analisi). Ora conta anche il servizio che l'avversario non rimanda in
campo; soglie 3 / 4 / 5 scelte dai dati: miscela «prima volta» bronzo 2,3 %, argento 0,6 %, oro 0 % (visto solo nel
gruppo bambino · Facile, 0,8 %).

### Misure (banco `scripts/audit/b40-trofei.mjs`, motore vero senza grafica, contatori e trofei veri del gioco)

`cd natpf-tennis && node --import ./test/register.mjs scripts/audit/b40-trofei.mjs --jobs=3` (8000 partite, 5 min 33 s a
3 processi, carico 4–8; `--veloce` 2 gruppi × 40 partite; `--righe=f.jsonl` salva le partite, `--da=f.jsonl` rifà solo
le tabelle). Uscita completa: `docs/b40/b40-trofei-risultati.txt`. Configurazione come allo stand: battuta «Sempre lo
stesso», formato classico, scambio caldo, 1 game; giocatori simulati del telefono e un profilo «principiante» (adulto alla
prima volta). Per tutti i trofei tranne l'Asso i numeri sono **identici** a quelli dell'analisi (stessi semi).

Miscela «chi gioca la prima volta» (ipotesi: 35 % principiante a Evento, 25 % umano a Evento, 25 % bambino a Bambini, 10 %
principiante a Facile, 5 % bambino a Facile):

| Trofeo | bronzo o più | argento o più | oro |
|---|---|---|---|
| Cecchino | 14,5 % | 4,0 % | 1,0 % |
| Razzo | 12,2 % | 2,4 % | 0,1 % |
| Maratoneta | 10,7 % | 2,2 % | 0,6 % |
| Asso | 2,3 % | 0,6 % | 0 % |
| Vincente | 7,0 % | 1,1 % | 0,3 % |
| Super | 0,1 % | 0 % | 0 % |
| Game a zero | 27,6 % | 0 % | 0 % |
| Rimonta | 12,7 % | 4,7 % | 1,4 % |
| In serie | 6,9 % | 0 % | 0 % |
| Muro | 10,8 % | 2,8 % | 0,6 % |

- Trofei della partita (senza Prima volta e Re di oggi): 0 → 33,6 %, 1 → 39,4 %, 2 → 18,9 %, 3+ → 8,2 %. Con «Prima
  volta» chi gioca la prima volta ne vede **1 nel 33,6 %, 2 nel 39,4 %, 3 nel 27,1 %**; almeno un oro nel **3,5 %**.
  «Prima volta» toglie dalla card un terzo trofeo d'argento o d'oro nello 0,6 % delle prime partite.
- Re di oggi (giornate simulate di 20 / 40 / 80 / 150 partite): oro 4,6 / 2,8 / 1,8 / 1,1 %, argento 6,3 / 3,7 / 2,1 /
  1,3 %, bronzo 7,1 / 4,5 / 2,6 / 1,5 % delle partite.
- Raggiungibili (miglior gruppo, bronzo · argento · oro): tutti; l'Asso d'oro solo nello 0,8 % delle partite del gruppo
  più fortunato. Bambini: stesse soglie per tutti (decisione del 15/11): a Bambini prendono qualcosa in più (Game a zero
  50 %, Razzo 39 %).
- **Da rimisurare**: (1) dopo il **B48** (servizio con le scelte, ramo `b48-servizio`, **non ancora unito** quando il B40
  è finito): cambia ace e km/h, cioè **Asso e Razzo**; (2) con i dati veri del registro dello stand dopo una giornata.
  Sono giocatori simulati, non persone: vincono molto e fanno scambi lunghi.

## 4. Contatori nuovi e dati del giorno

- `natpf_match_stats.js` (solo lettura, il gioco non cambia: impronte uguali, test): serie di punti, rimonta in punti
  (massimo svantaggio in un game poi vinto), palle match annullate (formato classico e veloce, `gameWinner` di
  `natpf_fair_format.js`), rimonta in game, game a zero (dai game già contati), colpi a vuoto (gesti senza palla),
  servizi non rimandati, muro; tutti in `sideSummary`. Il colpo del compagno del doppio non conta se il motore lo passa
  con `partner: true` (§6).
- `natpf_events.js`: partite giocate da chi gioca adesso nella sessione della pagina (la prima vale «Prima volta»; con un
  nome anche «nessuna partita di oggi con lo stesso nome»); si azzera con un nome diverso, «Nuovo giocatore»,
  «Prossimo giocatore» e il chiosco. Record di oggi (colpo più forte, scambio più lungo) nel tabellone del giorno
  (`best`): si azzera il giorno dopo e con «Azzera oggi», il CSV non cambia, niente nomi.
- Stesso schermo: partite di ciascuno dei due in `natpf_split_ui.notePlayed` (un nome diverso è un giocatore nuovo;
  «Nuovo giocatore» azzera).

## 5. Personaggi che esultano e ritratti dai modelli 3D

- **Movimento** (`player_body_animation.js`): a fine partita la reazione del punto diventa un loop. Chi vince: «cheer»,
  il salto della reazione di sempre senza il calo e con tutte le oscillazioni a 9,2 rad/s (periodo 0,683 s, due salti),
  racchetta alzata. Chi perde: un secondo a testa bassa, poi «clap»: racchetta davanti al petto e mano libera sulle
  corde due volte per periodo, piccolo molleggio, testa che annuisce. Lob & Drop 3D: racchetta orizzontale
  all'altezza della pancia (testa grande) e la mano della mascotte che batte dall'alto. Si vede anche in campo durante la
  scritta della partita. I punti normali non cambiano.
- **Ritratti** (`natpf_ritratti.js`, tecnica C del piano scelta dall'utente): durante la scritta della partita si
  fotografa un periodo di ciascun personaggio della card, **12 fotogrammi** (**8 su Android o con meno di 4 GB**) di al
  più 256×320 pixel, resi **una volta** dal renderer del gioco con le luci e la nebbia dell'arena (nessun programma
  shader nuovo), solo il personaggio, in una finestra al centro del canvas sotto la card; durante la cattura il
  personaggio non segue il motore e **l'inclinazione del telefono è spenta** (né la mano della webcam). Foglio: 3,9 MB a
  personaggio (7,9 MB in due). La card sfoglia i fotogrammi solo con la schermata in vista (17,6 al secondo; fermi con
  «riduci movimento»).
- **Arena ferma sotto la card**: con la schermata finale in vista il gioco continua (telefoni, rete, telecomando) ma
  l'arena non si ridisegna; si ridisegna al ridimensionamento e torna a ogni fotogramma su **qualunque** strada chiuda la
  schermata (il controllo è sulla schermata stessa, a ogni fotogramma: Rivincita, Indietro, Menu, Nuovo/Prossimo
  giocatore, chiosco, telecomando, rivincita dai telefoni, «Torna al menu» in fiera).
- **Ripiego**: `?ritratti=svg`, contesto WebGL perso, errore → ritratto disegnato (SVG) con il salto o il dondolio in CSS.
- Diagnostica: riga `fine.ritratti` con `ms` della cattura, fotogrammi, pixel, programmi nuovi (da leggere sul PC dello
  stand).

### Misure (Chromium con WebGL in software, SwiftShader: nessuna scheda grafica qui; il caso peggiore)

Rifatte nella ripresa del 15/11 sul codice della 14.8 (`tools/e2e/natpf-fine-partita-ritratti.mjs`, 24/24, Chromium
con SwiftShader, macchina di 4 processori con carico 3–4):

| caso | misura |
|---|---|
| un personaggio (vittoria contro la CPU) | cattura **807 ms** per 12 fotogrammi 256×320, foglio 3,9 MB, 0 programmi shader nuovi; ritratti pronti 1,86 s dopo l'apertura della schermata |
| due personaggi (stesso schermo, Drop e Lob) | cattura **1.429 ms** per 24 fotogrammi, foglio 7,9 MB |
| card aperta (un personaggio) | 0 disegni dell'arena in 3 s, 46,7 fps della pagina |
| card aperte (stesso schermo) | 0 disegni dell'arena in 3 s, 42,3 fps |
| programmi shader della pagina | 23 prima, 26 dopo (nessuno nuovo durante la cattura) |

In software la cattura è molto più lenta della stima del piano su una scheda grafica vera (≤ 150 ms in tutto): sul PC
dello stand va letta la riga `fine.ritratti` della diagnostica.

## 6. Doppio e B49

I colpi del compagno nel doppio **non contano** nei trofei quando il motore lo dice: `MatchStats.shot(E, { …, partner:
true })` li ignora. Il campo `natpfTeamHit` del B49 **non c'è ancora**: oggi nel doppio il compagno colpisce con il gesto di
chi gioca e conta come prima. Il B49 deve passare `partner: natpfTeamHit === 'partner'` alla chiamata di
`natpfStats.shot` (game_engine, colpo del Player 1), con il campo deciso **prima** di quella chiamata.

## 7. Prove

Rifatte nella ripresa del 15/11 sul codice della 14.8 (con il B48 dentro), Chromium con SwiftShader:

- Suite del gioco 1734/1734 (test `natpf-b40-card`, `-contatori`, `-esultanza`, `-giorno`, `-ritratti`, `-trofei`).
- Nel browser: `natpf-fine-partita` **56/56** (era 52/56 prima di `dc64d2e`), `natpf-fine-partita-ritratti` **24/24**,
  `natpf-fiera-telefoni` 61/61, `natpf-menu` 45/45, `natpf-stesso-schermo-b25` (pannello dello stand con le voci nuove).
  Le altre prove del passo B40.7 (`natpf-lob-drop`, `natpf-stesso-schermo-b20`, `natpf-flusso-tocchi` `FLOW=fiera`,
  `natpf-nuovo-giocatore`): nel registro dei passi della ripresa (`docs/WORK_PROGRESS.md`).
- Schermate guardate: vittoria contro la CPU a 1920×1080 e 720×720 (card con ritratto 3D, tre medaglie, «Record di
  oggi», tre numeri, «1° posto nella classifica di oggi»), stesso schermo a 1920×540 (due card con corona, «Prossimo
  trofeo», «Rivincita dai telefoni»). Testi interi, niente sovrapposto.
- Soglie di Asso e Razzo rimisurate con il B48 (§8 punto 9).
- Revisione indipendente del blocco: fatta nella ripresa insieme alla revisione finale della serie (passaggio §4.6),
  senza difetti del B40 trovati.

## 8. Decisioni dell'utente (15/11, sulle proposte del piano) e dubbi

1. **Prima volta**: un livello solo (bronzo di benvenuto), sempre visibile: al posto del terzo trofeo. Dubbio: «al posto
   del terzo se è un bronzo» — con tre trofei d'argento o d'oro (0,6 % delle prime partite) qui il benvenuto vince lo
   stesso; se l'utente preferisce tenere l'argento, è una riga in `cardTrophies`.
2. **Cornici**: come la richiesta; Facile argento; stesso schermo dalla fascia; due computer giallo-verde.
3. **Re di oggi**: vinte, in classifica (nome o «Visitatore N», mai «Ospite»), da 5 partite di oggi.
4. **Record di oggi**: colpo più forte e scambio più lungo di questo computer, solo il valore. In più (scelta dello
   sviluppatore): lo scambio conta da 8 colpi, perché pareggiare uno scambio di 3 colpi non è un vanto.
5. **Prossimo trofeo** anche a chi vince senza trofei della partita («Prima volta» non conta come trofeo della partita).
6. **Arena ferma** sotto la card, con ridisegno e ripartenza (§5).
7. **Bambini**: stesse soglie per tutti.
8. **Ritratti**: tecnica C, ripiego SVG, K = 8 su Android o con poca memoria.
9. **Asso** ridefinito (§3); **Asso e Razzo rimisurati con il B48** (ripresa del 15/11, 8000 partite simulate,
   `docs/b40/b40-trofei-risultati-dopo-b48.txt`): nella miscela delle prime partite Razzo bronzo o più 12,2 → 13,0%,
   argento o più 2,4 → 2,8%, oro 0,1 → 0,1%; Asso bronzo o più 2,3 → 3,3%, argento o più 0,6 → 0,4%, oro 0 → 0; trofei
   per partita 0/1/2/3+ da 33,6/39,4/18,9/8,2% a 34,7/40,1/18,2/7,1%, almeno un oro 3,5 → 2,4%. Differenze sotto un
   punto e mezzo: **soglie lasciate come sono**.

## 9. Cosa non è provato

- Telefoni veri, Android vero (K = 8, memoria, tempi), Windows vero, ledwall vero, una **scheda grafica vera**: tutte le
  misure dei ritratti sono in software (SwiftShader). Sul PC dello stand: leggere la riga `fine.ritratti` della
  diagnostica (atteso dalla stima del piano: cattura ≤ 150 ms in tutto).
- Persone vere per le soglie dei trofei (giocatori simulati).
- La tavola grafica approvata (non leggibile): la card segue la descrizione scritta.
