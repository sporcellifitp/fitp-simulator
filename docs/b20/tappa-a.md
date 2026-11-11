# B20 · 1v1 tra due persone nello stesso schermo

Blocco deciso dall'utente il 10/11/2026 dopo l'audit `docs/b19/audit-1v1-utenti.md`: tappa A (correzioni piccole),
sorteggio di chi batte, formato in fiera di base nello stesso schermo, «scambio che si scalda» come opzione, «Rivincita»
dai telefoni. Fatto l'11/11/2026 sul ramo di lavoro `worktree-agent-a2fd989d8dd719e89`, partendo da `d8a7557`
(versione 2026-11-10.2). Non fatti, perché l'utente ha detto no: «chi vince resta», «tempo massimo», aiuti per il
giocatore più debole.

Tutto quello che segue riguarda la partita tra **due persone nello stesso schermo**. Contro la CPU non cambia niente
nel gioco. La sfida tra due computer non è stata sviluppata e continua a funzionare come prima.

## Cosa cambia per chi gioca

### Correzioni che valgono sempre (niente da accendere)

1. **Chi gioca a destra (Player 2) risponde al servizio come chi gioca a sinistra.**
   - Prima, una risposta un po' piatta o tagliata del Player 2 diventava una schiacciata da fondo campo, quasi sempre in
     rete. Al Player 1 lo stesso gesto dava il colpo voluto.
   - Ora lo stesso gesto dà lo stesso colpo ai due lati. In risposta al servizio la schiacciata parte solo se è voluta
     (la tua decisione del 31/10, che la tappa 1 aveva applicato solo al Player 1).
   - La schiacciata vera del Player 2 ora parte dall'altezza a cui si colpisce, come quella del Player 1. Prima partiva
     al massimo da 1,92 m e sui pallonetti finiva più spesso in rete.
2. **Le istruzioni del servizio non coprono più il tabellone.**
   - Il riquadro «Alza il telefono: lanci la palla» ora sta sotto il tabellone della metà di chi batte.
   - È largo uguale a sinistra e a destra, su una riga sola. Prima a destra era più stretto e il testo andava su 2–3
     righe.
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
   - Banner del punto: se chi perde il punto ha fatto il gesto ed è andato a vuoto, ora dice «**Colpo a vuoto di
     Marco**». Prima diceva «Vincente di Giulia» anche in quel caso.
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
  colpo**, per tutti e due allo stesso modo, finché uno sbaglia. Dal 10° al 19° colpo la palla passa sempre più bassa
  sulla rete e più carica; poi continua a caricarsi fino al 29° colpo.
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
  - Chi aveva già scelto «Sì» lo ritrova su «Sì». Chi non aveva toccato niente, o aveva rimesso «No» con la versione di
    prima, trova «Solo stesso schermo»: per avere il classico anche nello stesso schermo va scelto «No» una volta.
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

Con più partite e altri semi (`risposta-altri-semi.txt`, circa 8.700 punti per riga): con soli tagliati il Player 1
vince il 51,0% dei punti tra adulti medi e il 50,6% tra amatori. L'obiettivo dell'audit era 50% ± 1.

### Scambio che si scalda

`natpf-tennis/scripts/audit/b20/scambio-caldo.mjs`, 1 game con il formato in fiera, due persone dello stesso livello,
180 partite per riga (60 tra tennisti), 3 semi. Uscite in `natpf-tennis/scripts/audit/b20/risultati/`.

| coppia | opzione | colpi a punto (media / 9 su 10 entro / massimo) | punti oltre 30 colpi | punto più lungo | partita (metà entro / 9 su 10 entro / la più lunga) |
|---|---|---|---|---|---|
| bambini | spenta | 6,7 / 15 / 44 | 0,7% | 59 s | 66 / 106 / 166 s |
| bambini | accesa | 6,5 / 14 / 29 | 0% | 32 s | 66 / 94 / 127 s |
| adulti medi | spenta | 11,5 / 25 / 54 | 5,9% | 65 s | 97 / 145 / 193 s |
| adulti medi | accesa | 10 / 20 / 39 | 1,5% | 36 s | 85 / 112 / 145 s |
| amatori | spenta | 17,8 / 40 / 84 | 18,4% | 104 s | 137 / 210 / 286 s |
| amatori | accesa | 13,8 / 26 / 55 | 5% | 51 s | 102 / 141 / 176 s |
| tennisti | spenta | 53,8 / 98 / 150 | 77,5% | 170 s | 391 / 525 / 654 s |
| tennisti | accesa | 31,3 / 50 / 77 | 47,9% | 65 s | 184 / 251 / 317 s |

- **Spenta non cambia niente.** L'«impronta» di tutti i punti giocati (chi vince, colpi, come finisce) con l'opzione
  spenta è identica a quella misurata prima di aggiungere l'opzione al motore, per tutte e quattro le coppie
  (`prima-dell-opzione.txt` e `scambio-caldo.txt`).
- **Velocità.** Tra amatori la palla al colpo dopo passa da circa 59 km/h a 63 (colpi 10–14), 76 (15–19) e 88–90 km/h
  (dal 20° in poi). Il tempo di volo passa da 1,0 a 0,65 secondi.
- **Come finiscono i punti con l'opzione accesa.** Per un errore di tempo o un colpo a vuoto, come prima. Nessun punto
  finisce in rete per colpa della traiettoria più bassa.
- **I due lati restano alla pari.** 720 partite per riga con altri 4 semi (`equilibrio-lati.txt`): tra adulti medi
  il Player 1 vince il 49,9% dei punti con l'opzione accesa (50,4% spenta); tra amatori il 48,8% (48,9% spenta).
- **Obiettivi dell'audit** (9 scambi su 10 sotto i 30 colpi; 1 game sotto i 3 minuti in 9 casi su 10): raggiunti per
  bambini, adulti medi e amatori. **Non raggiunti tra due «tennisti»**: 9 su 10 entro 50 colpi e partita entro 4,2
  minuti (erano 98 colpi e 8,7 minuti). Il robot «tennista» sbaglia il tempo sempre allo stesso modo anche con la palla
  più veloce; una persona vera sbaglia di più quando la palla accelera. Per chiudere anche quel caso servirebbe la
  regola severa del prototipo dell'audit, che fa finire i punti con un colpo fallito in automatico: non l'ho messa.
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
| 720×720 | 156 px | 174–220 px, 240 px a sinistra e a destra | niente |

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
- `scripts/audit/b20/`: misura dello scambio che si scalda, con le uscite.
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

Tutti l'11/11/2026, sul lavoro finito.

| cosa | risultato |
|---|---|
| `npm test` in `natpf-tennis` | 1.104 test: 1.103 passati, 0 falliti, 1 saltato (l'avvio LAN, che vuole `npm ci` in `tools/lan`: era saltato anche prima) |
| … di cui nuovi | 27: `natpf-b20-specchio` 4, `natpf-b20-stesso-schermo` 17, `natpf-split-ricollega` 6 in più |
| `npm run build` | riuscita |
| `node --test tools/test/*.test.mjs` (sito e pagina del telefono) | 205 su 205 (4 nuovi in `phone-screen`) |
| `natpf-stesso-schermo-b20` (nuova) | 46 su 46 |
| `natpf-split-ready` | 34 su 34 |
| `natpf-formato-fiera` (aggiornata) | 22 su 22 |
| `natpf-formato-fiera-p2p` | 9 su 9 |
| `natpf-tabellone` | 42 su 42 |
| `natpf-nuovo-giocatore` | 28 su 28 |
| `natpf-servizio-lancio` | 12 su 12 |
| `natpf-1v1-p2p` | 39 su 39 |
| `natpf-menu` | 28 su 28 |

Le prove nel browser sono state lanciate una alla volta, con Chromium senza scheda grafica. Le due «p2p» vogliono la
build fatta prima.

Cosa controllano i test nuovi:

- **A specchio** (`natpf-b20-specchio`): con il servizio vero dell'altro giocatore, il tagliato n. 143 della diagnostica
  del 30/10 e un dritto un po' piatto danno lo stesso colpo al Player 1 e al Player 2 (12 casi per lato, e 6 per lato);
  la schiacciata voluta su palla alta è uguale ai due lati e parte dalla stessa altezza. Senza la correzione tre di
  questi quattro test falliscono (controllato).
- **Stesso schermo** (`natpf-b20-stesso-schermo`): sorteggio riproducibile e scritto nel banner; i tre valori del
  formato in fiera, il «Sì» salvato che resta «Sì», l'indirizzo che comanda; le scritte; il richiamo per nome; lo
  scambio che si scalda (spento di base, solo nello stesso schermo, uguale per i due lati nel motore).
- **Telefono caduto e rivincita** (`natpf-split-ricollega`): QR e nome nel riquadro per i due giocatori, avviso
  all'altro telefono, rivincita che parte solo con tutti e due, «Gioca ancora» che resta com'era.
- **Prova nel browser nuova**: pannello dello stand, sorteggio visibile, formato in fiera di base, istruzioni e
  richiamo alle quattro misure, rivincita dai due telefoni simulati, scambio che si scalda acceso e spento, telefono
  chiuso in partita con il QR letto da un lettore di QR.

Non lanciati: i test del server LAN (`tools/lan`) e del programma Windows (`natpf-desktop`).

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
  provato con la webcam.
- **Sfida tra due computer.** Solo le due prove nel browser che c'erano già (vedi «Test»).
- I pacchetti non sono stati rifatti e la versione non è cambiata: lo fa chi unisce questo ramo.
