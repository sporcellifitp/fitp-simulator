# B20 · 1v1 tra due persone nello stesso schermo

Blocco deciso dall'utente il 10/11/2026 dopo l'audit `docs/b19/audit-1v1-utenti.md`: tappa A (correzioni piccole),
sorteggio di chi batte, formato in fiera di base nello stesso schermo, «scambio che si scalda» come opzione, «Rivincita»
dai telefoni. Fatto l'11/11/2026 sul ramo di lavoro `worktree-agent-a2fd989d8dd719e89`, partendo da `d8a7557`
(versione 2026-11-10.2). Non fatti, perché l'utente ha detto no: «chi vince resta», «tempo massimo», aiuti per il
giocatore più debole.

Tutto quello che segue riguarda la partita tra **due persone nello stesso schermo**. Contro la CPU non cambia niente
nel gioco (controllato punto per punto, vedi «Revisione»). La sfida tra due computer non è stata sviluppata e continua a
funzionare; due correzioni del Player 2 valgono anche lì, perché il suo colpo è la stessa funzione: la risposta al
servizio non più letta come schiacciata (punto 1) e il tagliato che curva dalla parte giusta (vedi «Revisione»).

## Cosa cambia per chi gioca

### Correzioni che valgono sempre (niente da accendere)

1. **Chi gioca a destra (Player 2) risponde al servizio come chi gioca a sinistra.**
   - Prima, una risposta un po' piatta o tagliata del Player 2 diventava una schiacciata da fondo campo, quasi sempre in
     rete. Al Player 1 lo stesso gesto dava il colpo voluto.
   - Ora lo stesso gesto dà lo stesso colpo ai due lati. In risposta al servizio la schiacciata parte solo se è voluta
     (la tua decisione del 31/10, che la tappa 1 aveva applicato solo al Player 1).
   - La schiacciata vera del Player 2 ora parte dall'altezza a cui si colpisce, come quella del Player 1. Prima partiva
     al massimo da 1,92 m e sui pallonetti finiva più spesso in rete.
   - Il **tagliato** e la palla corta del Player 2 ora curvano verso il centro come quelli del Player 1. Prima curvavano
     verso l'esterno e uscivano più spesso di lato (trovato dal revisore).
   - Vale anche per il Player 2 della **sfida tra due computer**: sul computer che ospita la partita le sue risposte
     lette come schiacciata vanno a zero.
2. **Le istruzioni del servizio non coprono più il tabellone.**
   - Il riquadro «Alza il telefono: lanci la palla» ora sta sotto il tabellone della metà di chi batte.
   - È largo uguale a sinistra e a destra, su una riga sola. Prima a destra era più stretto e il testo andava su 2–3
     righe.
   - Quando la partita va in pausa il riquadro sparisce (prima restava sotto il riquadro della pausa) e torna alla
     ripresa.
3. **Telefono che si scollega in partita.**
   - Il riquadro della pausa mostra dentro di sé il **QR del telefono caduto**, per il Player 1 e per il Player 2. Prima
     per il Player 1 il riquadro copriva un quarto del QR, e per il Player 2 il QR non c'era.
   - I testi dicono il **nome**: «Telefono di Giulia in pausa», «Telefono di Giulia: inquadra questo QR». Senza un nome
     scritto resta «Telefono del Player 2 in pausa».
   - Il riquadro comincia sotto i due tabelloni e non copre il punteggio.
   - Il **telefono dell'altro** lo dice: «Pausa · Partita in pausa: aspetto il telefono di Giulia. Si riprende da
     soli.». Prima restava su «Pronto · Colpisci quando la palla arriva».
4. **Scritte più chiare.**
   - «**Palla match Giulia**», «Palla game Marco»: dicono di chi sono. La voce resta «Match point» (nessuna voce nuova).
   - Sotto il tabellone, con il formato in fiera: «**1 game · punto decisivo sul 40-40**». Prima restava «Partita a 1
     game». Sul 40-40 resta «1 game» con accanto «PUNTO DECISIVO».
   - Banner del punto: se chi perde il punto ha fatto il gesto ed è andato a vuoto (troppo presto o troppo tardi), ora
     dice «**Colpo a vuoto di Marco**». Prima diceva «Vincente di Giulia» anche in quel caso. Se la palla era fuori
     portata resta «Vincente di Giulia»: lì il gesto non poteva prenderla.
5. **Richiamo per nome a chi deve battere.**
   - Se chi deve battere resta fermo 9 secondi, in alto al centro compare «**Giulia, batti tu**» con sotto «Alza il
     telefono: lanci la palla». Così l'altro e la fila capiscono chi sta aspettando il gioco.
   - È solo una scritta: nessuna voce nuova, e il gioco non lancia la palla da solo.

### Chi batte per primo: sorteggio

- Nello stesso schermo «Batte per primo» ora parte da «**Sorteggio**». Prima batteva sempre il Player 1.
- Il sorteggio si rifà a ogni partita, anche alla rivincita.
- Si vede: all'inizio della partita, sotto «Si gioca», c'è scritto «**Sorteggio: batte Giulia**». Se scegli un
  giocatore a mano la scritta è «Batte Marco».
- La scelta dello stesso schermo è salvata a parte. Contro la CPU resta com'era (di base batti tu).

### Formato in fiera acceso di base nello stesso schermo

- Tra due persone nello stesso schermo ora vale **di base** il formato in fiera: punto decisivo sul 40-40 e servizio
  che passa ogni due punti. Quindi battono tutti e due anche in una partita a 1 game, e non ci sono vantaggi senza fine.
- Contro la CPU e nella sfida tra due computer resta il formato classico, finché non scegli «Sì» nel pannello dello
  stand.
- Nella pagina «Partita» dello stesso schermo il riassunto dice «formato fiera» e «Al meglio di 5» non c'è (con questo
  formato la partita più lunga è al meglio di 3, come deciso nella tappa 1).

### «Scambio che si scalda» (opzione, spenta di base)

- Spenta, non cambia niente: la partita è identica a prima, punto per punto (controllato, vedi «Misure»).
- Accesa, nello stesso schermo con i due telefoni: **dal 10° colpo dello scambio la palla va via via più veloce a ogni
  colpo**, per tutti e due allo stesso modo, finché uno sbaglia. Dal 10° al 16° colpo la palla passa sempre più bassa
  sulla rete e più carica; poi continua a caricarsi fino al 26° colpo. Il 10° colpo è già più veloce di circa il 15%
  (dopo la revisione: prima la scritta compariva al 10° colpo ma la palla accelerava davvero solo dal 13°).
- Il tagliato resta un tagliato: passa più basso sulla rete, ma il suo effetto non cambia. Per questo con soli tagliati
  lo scambio si scalda meno (vedi «Misure»).
- Si vede: in alto al centro compare «**SCAMBIO CALDO** · Colpo 12 · palla sempre più veloce». La scritta «batte» a
  ogni colpo e cambia colore con lo scambio (giallo, arancione, rosso). La palla ha la scia del colpo potente.
- Non riguarda pallonetti, palle corte e schiacciate, che hanno già il loro volo.
- Non vale contro la CPU, nella sfida tra due computer e con la webcam per due.

### «Rivincita» dai telefoni

- A fine partita nello stesso schermo ogni telefono mostra il pulsante «**Rivincita**».
- Quando uno lo tocca, sul grande schermo (nella scheda di fine partita) compare «**Giulia vuole la rivincita · manca
  Marco**», e sul telefono dell'altro «Giulia vuole la rivincita: tocca «Rivincita».».
- Quando l'hanno toccato **tutti e due**, parte subito una partita nuova con le stesse impostazioni, senza toccare il
  computer. Chi batte si sorteggia di nuovo.
- Sul computer resta tutto com'era: «Gioca ancora» torna alla pagina «Partita», «Nuovo giocatore» e «Menu» come prima.
- Con la webcam per due il pulsante non c'è (non ci sono telefoni).

## Come si attiva

Il **pannello dello stand** si apre dal menu principale con **Ctrl + Maiusc + K**, oppure tenendo premuto 3 secondi il
marchio NATPF in alto a sinistra. Le sue scelte restano salvate anche chiudendo il programma, e valgono **dalla partita
dopo**.

| cosa | dove | valori | di base |
|---|---|---|---|
| **Batte per primo** | Menu → Gioca → «Stesso schermo» → pagina «Partita» → «Altre impostazioni» → «Batte per primo» | Player 1 (o il suo nome) · Player 2 (o il suo nome) · Sorteggio | **Sorteggio** |
| **Formato in fiera** | Pannello dello stand → riquadro «Formato in fiera» (ogni clic passa al valore dopo) → «Chiudi» | No · Solo stesso schermo · Sì | **Solo stesso schermo** |
| **Scambio che si scalda** | Pannello dello stand → riquadro «Scambio che si scalda» (un clic) → «Chiudi» | No · Sì | **No** |

Dettagli:

- **Batte per primo.** Niente da accendere: il sorteggio vale già. Per cambiarlo basta un clic sul nome di chi deve
  battere; resta salvato per lo stesso schermo.
- **Formato in fiera.**
  - «No»: formato classico dappertutto.
  - «Solo stesso schermo»: formato in fiera tra due persone nello stesso schermo, classico contro la CPU e nella sfida
    tra due computer.
  - «Sì · punto decisivo»: formato in fiera dappertutto, com'era il «Sì» di prima.
  - Chi aveva già scelto «Sì» lo ritrova su «Sì».
  - **Attenzione al vecchio «No».** Chi non aveva toccato niente trova «Solo stesso schermo». Lo trova anche chi con la
    versione di prima aveva acceso l'opzione e poi l'aveva rimessa su «No»: quel «No» era il valore di base di allora e
    non si distingue da «non ho scelto». **Per avere il formato classico anche nello stesso schermo va scelto «No» una
    volta** dal pannello dello stand; da quel momento resta «No».
  - Nella versione web o LAN l'indirizzo continua a comandare per quella pagina: `…/?formato=fiera` lo accende
    dappertutto, `…/?formato=classico` lo spegne dappertutto. Nel programma Windows vale solo il pannello.
- **Scambio che si scalda.** Il riquadro passa da «No» a «Sì · dal 10° colpo» (in giallo), con un avviso in basso. Un
  altro clic lo spegne.
- **Rivincita dai telefoni, richiamo per nome, scritte, QR nel riquadro della pausa**: niente da accendere.

Dettagli tecnici: le scelte sono nel `localStorage` del browser o del programma Windows.
`natpf-tennis.serve.split` (`player`, `opponent`, `random`), `natpf-tennis.formatoFiera` (`1` Sì, `split`, `no`),
`natpf-tennis.scambioCaldo` (`1` acceso).

## Misure

Tutte con il banco dei due umani dell'audit B19 (`natpf-tennis/scripts/audit/b19/`): motore vero senza grafica, due
persone simulate. Tempi di gioco simulato.

### Risposta del Player 2 (punto 1)

`misure.mjs risposta`, prima (audit B19, `scripts/audit/b19/risultati/risposta.txt`) e dopo la correzione
(`scripts/audit/b20/risultati/risposta.txt`, stessi semi):

| | prima | dopo |
|---|---|---|
| adulto medio, gioco normale: risposte del Player 2 giocate come schiacciata | 114 su 1.955 (66 perse subito in rete) | 0 su 1.971 |
| tennista, gioco normale | 20 su 192 | 0 su 180 |
| adulto medio, soli tagliati: risposte del Player 2 giocate come schiacciata | 1.055 su 1.253 (84%) | 0 su 1.576 |
| … punti in risposta persi subito dal Player 2 (Player 1) | 54,5% (5,7%) | 4,8% (5,1%) |
| … punti vinti dal Player 1 | 60,3% | 51,6% |
| amatore, soli tagliati: punti vinti dal Player 1 | 61,7% | 51,7% |
| risposte del Player 1 giocate come schiacciata | 0 | 0 |

L'obiettivo dell'audit era 50% ± 1 anche con soli tagliati. Dopo la prima correzione restava un po' sopra: il revisore
ha misurato 51,5–52,1% dei punti e 53,6–54,4% delle partite per il Player 1, e ha trovato il motivo (il tagliato del
Player 2 curvava verso l'esterno). Dopo la correzione del tagliato, con semi nuovi (`risposta-dopo-revisione.txt`, circa
8.700 punti per riga):

| soli tagliati | punti del Player 1 | partite del Player 1 |
|---|---|---|
| adulti medi | 50,3% | 50,5% |
| amatori | 50,3% | 50,6% |

Nel gioco normale tra adulti medi: 50,1% dei punti e 49,8% delle partite (10.903 punti).

### Scambio che si scalda

`natpf-tennis/scripts/audit/b20/scambio-caldo.mjs`, 1 game con il formato in fiera, due persone dello stesso livello,
180 partite per riga (90 tra precisi, 60 tra tennisti), 3 semi. Uscite in `natpf-tennis/scripts/audit/b20/risultati/`.
Numeri rifatti dopo la revisione (tagliato corretto, accelerazione dal 10° colpo).

| coppia | opzione | colpi a punto (media / 9 su 10 entro / massimo) | punti oltre 30 colpi | punto più lungo | partita (metà entro / 9 su 10 entro / la più lunga) |
|---|---|---|---|---|---|
| bambini | spenta | 6,7 / 15 / 44 | 0,7% | 59 s | 66 / 106 / 166 s |
| bambini | accesa | 6,3 / 13 / 28 | 0% | 30 s | 63 / 91 / 120 s |
| adulti medi | spenta | 11,6 / 26 / 76 | 6,3% | 91 s | 99 / 145 / 191 s |
| adulti medi | accesa | 9,6 / 18 / 37 | 0,7% | 34 s | 80 / 107 / 137 s |
| amatori | spenta | 17,4 / 39 / 74 | 17,6% | 94 s | 136 / 212 / 282 s |
| amatori | accesa | 13,5 / 26 / 55 | 3,5% | 50 s | 100 / 135 / 174 s |
| precisi | spenta | 39,7 / 81 / 144 | 56,8% | 163 s | 261 / 415 / 615 s |
| precisi | accesa | 23,9 / 46 / 90 | 28,8% | 77 s | 149 / 202 / 233 s |
| tennisti | spenta | 53,5 / 94 / 150 | 78,2% | 169 s | 351 / 491 / 600 s |
| tennisti | accesa | 29,6 / 50 / 73 | 41,9% | 62 s | 165 / 224 / 299 s |
| adulti medi, soli tagliati | spenta | 16,6 / 39 / 88 | 16,3% | 130 s | 146 / 235 / 366 s |
| adulti medi, soli tagliati | accesa | 14,6 / 31 / 64 | 10,9% | 81 s | 126 / 180 / 291 s |
| amatori, soli tagliati | spenta | 27,4 / 57 / 150 | 40,2% | 225 s | 245 / 357 / 515 s |
| amatori, soli tagliati | accesa | 20,3 / 40 / 86 | 21,1% | 106 s | 166 / 233 / 329 s |

- **Spenta non cambia niente.** L'«impronta» di tutti i punti giocati (chi vince, colpi, come finisce) con l'opzione
  spenta è identica a quella misurata prima di aggiungere l'opzione al motore, per bambini, medi, amatori e tennisti
  (`prima-dell-opzione.txt`). Ricontrollato dopo la revisione, rimettendo per un momento il tagliato di prima: le
  quattro impronte tornano uguali. Le impronte di oggi in `scambio-caldo.txt` sono diverse da quelle di allora solo per
  la correzione del tagliato del Player 2, che cambia le partite anche con l'opzione spenta (i bambini, che non fanno
  tagliati, hanno la stessa impronta di allora).
- **Velocità.** Tra amatori il tempo di volo passa da 1,00 secondi a 0,87 al 10° colpo, 0,81 al 12°, 0,75 al 14°,
  0,68 al 16° e 0,65 dal 20° in poi. La palla arriva a chi deve colpire a circa 59 km/h con l'opzione spenta; accesa a
  68 km/h dopo il 10° colpo, 74 dopo il 12°, 84 dopo il 15° e 88–89 km/h dal 18° in poi.
- **Come finiscono i punti con l'opzione accesa.** Per un errore di tempo o un colpo a vuoto, come prima. Nessun punto
  finisce in rete per colpa della traiettoria più bassa.
- **I due lati restano alla pari.** 720 partite per riga con altri 4 semi (`equilibrio-lati.txt`): tra amatori il
  Player 1 vince il 50,0% dei punti con l'opzione accesa (49,1% spenta); tra adulti medi il 51,7% (50,5% spenta). Quel
  51,7% era sopra il resto: rifatto con altri 5 semi e 1.200 partite (`equilibrio-lati-medi-altri-semi.txt`) dà 49,7%
  su 6.978 punti. Messe insieme le tre serie, tra medi con l'opzione accesa: 50,3% su circa 12.200 punti.
- **Obiettivi dell'audit** (9 scambi su 10 sotto i 30 colpi; 1 game sotto i 3 minuti in 9 casi su 10): raggiunti per
  bambini, adulti medi e amatori. **Non raggiunti tra due «precisi» e tra due «tennisti»**:
  - precisi: 9 su 10 entro 46 colpi, partita entro 3,4 minuti (erano 81 colpi e 6,9 minuti);
  - tennisti: 9 su 10 entro 50 colpi, partita entro 3,7 minuti (erano 94 colpi e 8,2 minuti).

  Questi robot sbagliano il tempo sempre allo stesso modo anche con la palla più veloce; una persona vera sbaglia di
  più quando la palla accelera. Per chiudere anche questi casi servirebbe la regola severa del prototipo dell'audit,
  che fa finire i punti con un colpo fallito in automatico: non l'ho messa.
- **Soli tagliati.** Il tagliato si scalda meno, perché resta un tagliato: tra adulti medi che fanno solo tagliati 9
  scambi su 10 stanno entro 31 colpi (39 spenta), tra amatori entro 40 (57 spenta). Chi fa solo tagliati allunga gli
  scambi, ma contro chi gioca normale perde quasi sempre (audit B19: vince circa una partita su quattro o cinque).
- **Una cosa scoperta misurando.** Accorciare solo il tempo di volo non cambiava niente: nel motore il volo è quello che
  serve per passare la rete all'altezza voluta. Per questo l'opzione abbassa la palla sulla rete e la carica di più.
  Vuol dire anche che l'accelerazione «fino all'8° colpo» che c'è da sempre nel 1v1 in pratica non si sente.

### Istruzioni del servizio e tabellone

Prova nel browser `tools/e2e/natpf-stesso-schermo-b20.mjs`, riquadro delle istruzioni contro i due tabelloni (riquadro
e sottotitolo), per chi batte a sinistra e a destra:

| schermo | tabellone (fino a) | istruzioni (da–a, larghezza) | coperto |
|---|---|---|---|
| 1920×1080 | 233 px | 259–360 px, 519 px a sinistra e a destra | niente |
| 1280×720 | 156 px | 174–240 px, 346 px a sinistra e a destra | niente |
| 1920×540 | 123 px | 137–188 px, 259 px a sinistra e a destra | niente |
| 720×720 | 156 px | 174–229 px, 288 px a sinistra e a destra (carattere 14,4 px; prima della revisione 12 px) | niente |

Prima (audit B19): seconda riga del tabellone coperta per il 12–16% a 1280×720 e 1920×1080, per il 29–50% a 720×720;
a destra riquadro di 320×99 px contro 346×67 a sinistra. Le misure sono con la finestra del browser a quella grandezza,
non con l'area di un ledwall dentro uno schermo più grande.

## File toccati

Gioco (`natpf-tennis/`):

- `src/game_engine.js`: risposta e schiacciata del Player 2; sorteggio con il generatore iniettabile (`natpfRng`) e
  scritta d'inizio; formato in fiera per modalità; «Palla match <nome>»; colpo a vuoto per il banner; scambio che si
  scalda (`natpfHot`, solo nei colpi di chi gioca). La logica della CPU non è stata toccata.
- `src/natpf/natpf_hot_rally.js` (nuovo): regola, opzione e scritta dello «scambio che si scalda».
- `src/natpf/natpf_fair_format.js`: i tre valori del formato in fiera.
- `src/natpf/match_format.js`, `src/natpf/natpf_lobby.js`: scelta di chi batte salvata a parte per lo stesso schermo.
- `src/natpf/natpf_kiosk.js`: pannello dello stand (tre valori, opzione nuova).
- `src/natpf/natpf_point_call.js`, `src/natpf/natpf_scoreboard.js`: scritte.
- `src/natpf/natpf_serve_coach.js`: richiamo per nome.
- `src/natpf/natpf_phone_watch.js`, `src/natpf/natpf_ui.js`, `src/natpf/natpf_split_ui.js`: telefono caduto (nome, QR,
  avviso all'altro) e rivincita dai telefoni.
- `src/natpf/natpf_phone_racket.js`: messaggi della rivincita.
- `index.html`, `natpf-ui.css`: pulsanti del pannello, scritta «Scambio caldo», riga della rivincita, posizione delle
  istruzioni del servizio, QR nel riquadro della pausa.
- `scripts/audit/b20/`: misura dello scambio che si scalda e controllo «contro la CPU non cambia niente»
  (`impronta-cpu.mjs`), con le uscite.
- Test: `test/natpf-b20-specchio.test.mjs` e `test/natpf-b20-stesso-schermo.test.mjs` (nuovi),
  `test/natpf-split-ricollega.test.mjs`, `test/natpf-flows.test.mjs`, `test/natpf-formato-fiera.test.mjs`.

Pagina del telefono (`site/`): `site/tennis/racchetta.html`, `site/js/tennis/racchetta.js`,
`site/js/tennis/phone-screen.js`, `site/js/tennis/link.js` (pulsante «Rivincita», motivo della pausa). Test:
`tools/test/phone-screen.test.mjs`.

Prove nel browser (`tools/e2e/`): `natpf-stesso-schermo-b20.mjs` (nuova), più quelle aggiornate dove cambia il
comportamento di base: `natpf-formato-fiera.mjs` (di base «Solo stesso schermo», contro la CPU resta il classico). Le
altre passano senza modifiche.

Non toccati: i file di versione, `natpf_skill.js`, la logica della CPU, i documenti di piano. Il riconoscimento dei
gesti sul telefono non è cambiato: cambia solo, nel motore, come si gioca la risposta del Player 2 (punto 1).

## Test

Tutti l'11/11/2026, sul lavoro finito e dopo le correzioni della revisione.

| cosa | risultato |
|---|---|
| `npm test` in `natpf-tennis` | 1.106 test: 1.105 passati, 0 falliti, 1 saltato (l'avvio LAN, che vuole `npm ci` in `tools/lan`: era saltato anche prima) |
| … di cui nuovi | 29: `natpf-b20-specchio` 5, `natpf-b20-stesso-schermo` 18, `natpf-split-ricollega` 6 in più |
| `npm run build` | riuscita |
| `node --test tools/test/*.test.mjs` (sito e pagina del telefono) | 205 su 205 (4 nuovi in `phone-screen`) |
| `natpf-stesso-schermo-b20` (nuova) | 52 su 52 |
| `natpf-split-ready` | 34 su 34 |
| `natpf-formato-fiera` (aggiornata) | 22 su 22 |
| `natpf-menu` | 28 su 28 |
| `natpf-1v1-p2p` | 39 su 39 |
| `natpf-formato-fiera-p2p` | 9 su 9 |
| `natpf-servizio-lancio` | 12 su 12 |
| `natpf-tabellone` | 42 su 42 |
| `natpf-nuovo-giocatore` | 28 su 28 |

Le prove nel browser sono state lanciate una alla volta, con Chromium senza scheda grafica. Le due «p2p» vogliono la
build fatta prima.

Cosa controllano i test nuovi:

- **A specchio** (`natpf-b20-specchio`): con il servizio vero dell'altro giocatore, il tagliato n. 143 della diagnostica
  del 30/10 e un dritto un po' piatto danno lo stesso colpo al Player 1 e al Player 2 (12 casi per lato, e 6 per lato);
  la schiacciata voluta su palla alta è uguale ai due lati e parte dalla stessa altezza. Senza la correzione tre di
  questi quattro test falliscono (controllato). Dopo la revisione un quinto test: il tagliato del Player 2 ha la stessa
  traiettoria di quello del Player 1, specchiata, punto per punto fino al rimbalzo (tre situazioni; scarto sotto 6 cm).
  Senza la correzione del tagliato fallisce (controllato).
- **Stesso schermo** (`natpf-b20-stesso-schermo`): sorteggio riproducibile e scritto nel banner; i tre valori del
  formato in fiera, il «Sì» salvato che resta «Sì», l'indirizzo che comanda; le scritte; il richiamo per nome; lo
  scambio che si scalda (spento di base, solo nello stesso schermo, uguale per i due lati nel motore).
- **Telefono caduto e rivincita** (`natpf-split-ricollega`): QR e nome nel riquadro per i due giocatori, avviso
  all'altro telefono, rivincita che parte solo con tutti e due, «Gioca ancora» che resta com'era.
- **Prova nel browser nuova**: pannello dello stand (anche a 1920×540 e 1024×600), sorteggio visibile, formato in fiera di base, istruzioni e
  richiamo alle quattro misure, rivincita dai due telefoni simulati, scambio che si scalda acceso e spento, telefono
  chiuso in partita con il QR letto da un lettore di QR.

Non lanciati: i test del server LAN (`tools/lan`) e del programma Windows (`natpf-desktop`).

## Revisione

Un revisore indipendente ha ricontrollato il lavoro. Queste sono le cose che ha trovato e come sono state corrette
(commit `eb45234` e `957d608`, più questo documento).

**Bloccante: pannello dello stand nelle aree larghe e basse.**
- Con il decimo pulsante («Scambio che si scalda») il pannello faceva una quarta fila. A 1920×540 «Chiudi» e «Nuovo
  giocatore» finivano fuori vista; a 1024×600 restavano 23 px.
- Ora da 1000 px di larghezza i pulsanti stanno su quattro colonne (tre file, come prima del B20) e nelle aree larghe e
  basse su cinque (due file).
- Misurato nella prova nel browser: niente scorrimento e i due pulsanti interi nello schermo a 1280×720 (margine sotto
  119 px), 1920×540 (65 px), 1024×600 (59 px), 1366×657 (87 px), 1920×1080 e 720×720 (47 px).

**Il tagliato del Player 2 curvava dalla parte sbagliata.**
- L'effetto laterale del tagliato e della palla corta spinge la palla verso il centro. Per il Player 2 aveva il segno
  rovesciato: curvava verso l'esterno. Con soli tagliati il Player 1 vinceva il 51,5–52,1% dei punti e il 53,6–54,4%
  delle partite (misura del revisore).
- Corretto in `game_engine.js` (`_natpfRacketShot`). Ora, con semi nuovi: 50,3% dei punti e 50,5–50,6% delle partite,
  tra adulti medi e tra amatori. Obiettivo 50 ± 1 raggiunto.
- **Contro la CPU non cambia niente**: 12 serie di 240 punti (Casual, Pro e Leggenda, quattro profili) hanno la stessa
  impronta prima e dopo tutte le correzioni della revisione (`impronta-cpu-prima-della-revisione.txt` e
  `impronta-cpu-dopo-la-revisione.txt`). Il colpo del Player 1 non è stato toccato: nel test a specchio il suo tagliato
  curva verso il centro come prima.
- Vale anche per il Player 2 della sfida tra due computer (stessa funzione).

**Correzioni minori.**
1. Documento: la correzione della risposta vale anche per il Player 2 della sfida tra due computer. Scritto.
2. Formato in fiera: il vecchio «No» diventa «Solo stesso schermo». Il revisore è d'accordo; ora è scritto chiaro in
   «Come si attiva».
3. Scambio che si scalda:
   - il tagliato resta un tagliato (più basso sulla rete, effetto invariato);
   - la palla accelera davvero dal 10° colpo, quando compare la scritta. Prima al 10° colpo era +1% e si sentiva dal
     13°; ora il volo del 10° colpo è il 13% più corto;
   - l'obiettivo dei 30 colpi manca anche tra due «precisi», non solo tra due «tennisti». Scritto in «Misure»;
   - numeri rifatti: sono quelli della tabella in «Misure».
4. Banner «Colpo a vuoto di …»: non compare più se la palla era fuori portata (è un vincente dell'altro). Il segno del
   colpo a vuoto si azzera a ogni servizio.
5. In pausa il riquadro delle istruzioni del servizio sparisce, e anche la scritta «Scambio caldo».
6. Finito lo stesso schermo, lo «scambio che si scalda» si spegne nel motore.
7. In più, rapida: istruzioni del servizio a 720×720 con il carattere a 14,4 px invece di 12 (sempre su una riga).

**Rimasti aperti** (segnalati dal revisore come minori, non corretti):
- **Chiosco.** Non ho toccato il ritorno al menu del chiosco in rapporto alla rivincita dai telefoni e alla scheda di
  fine partita: da ricontrollare.
- **Testo al rientro con il QR.** Chi rientra inquadrando il QR del riquadro della pausa trova sul grande schermo il
  testo di sempre («Telefono non pronto: finisci la calibrazione sul telefono»), senza il nome e senza dire che la
  partita lo aspetta. Il rientro con il QR non è provato nel browser.
- **Webcam per due.** Il tagliato del Player 2 con le regole vecchie ha ancora l'effetto laterale di prima (vedi «Cosa
  non è provato»).
- **Soli tagliati con lo scambio caldo.** Si scaldano meno degli altri colpi (vedi «Misure»).

## Cosa non è provato

- **Telefoni veri.** Tutto è provato con telefoni simulati sulla stessa macchina: il pulsante «Rivincita», l'avviso
  della pausa, il QR nel riquadro della pausa inquadrato da una fotocamera vera.
- **Persone vere.** Lo «scambio che si scalda» è misurato solo con i robot del banco: non so a che colpo le persone
  cominciano a sbagliare, né se la scritta e la scia si notano da lontano. Il sorteggio e il richiamo per nome non sono
  stati visti da un pubblico.
- **Windows e ledwall.** Niente installer, niente prova sul PC dell'evento. Le misure delle istruzioni sono con la
  finestra a quella grandezza, non con l'area di un ledwall.
- **Voce.** Nessuna clip nuova e nessuna prova d'ascolto.
- **Webcam per due.** Lo «scambio che si scalda» e la rivincita dai telefoni lì non valgono; il resto non è stato
  provato con la webcam. Con la webcam per due il Player 2 gioca con le regole vecchie (audit B19, punto 16): lì il suo
  tagliato ha ancora l'effetto laterale di prima. Non l'ho toccato: la webcam per due è una domanda rimasta senza
  risposta.
- **Sfida tra due computer.** Solo le due prove nel browser che c'erano già (vedi «Test»).
- I pacchetti non sono stati rifatti e la versione non è cambiata: lo fa chi unisce questo ramo.
