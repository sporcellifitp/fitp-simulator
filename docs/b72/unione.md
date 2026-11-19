# B72 · Unione dei tre rami (avversario, servizio, lingua) nel ramo `b72-int` (19/11/2026)

Prodotto: **FIERA** (vale anche online). Agente di unione del workflow B72. Ramo locale `b72-int` dal commit di `b71-int`
`b4fb3446`; niente push. File di versione (`site/js/tennis/version.js`, `site/tennis/build.json`,
`natpf-tennis/lan/LEGGIMI.txt`, `natpf-desktop/novita.txt`) e documenti di stato (`TRACCIA_PASSI`, `PIANO_LAVORI`,
`WORK_PROGRESS`, `PROJECT_MEMORY`) non toccati: li aggiorna l'agente principale. I dati e i motivi dei cambiamenti sono
nei documenti dei tre rami e qui non si ripetono.

| Ramo | Testa | Documento | In breve |
| --- | --- | --- | --- |
| `b72-avversario` | 563df0f5 | `docs/b72/avversario.md` | «Avversario» / «Avversari» / «compagno» al posto di «CPU» in tutti i testi che si vedono; livello «Esperto» |
| `b72-servizio` | d9f4c1df | `docs/b72/servizio.md` | la casella «Al servizio» lampeggia a 1 Hz quando batte chi gioca qui; dopo 3 s fermi un alone attorno all'area (nello stesso schermo attorno alla metà di chi batte) |
| `b72-lingua` | 0a4b9d39 | `docs/b72/lingua.md` | IT / EN scelta sul telefono da ciascun giocatore; testi della partita nella sua lingua (nello stesso schermo per metà) |

Unioni (fatte dall'agente prima dell'interruzione, controllate in questa ripresa), sempre `git merge --no-ff`, mai rebase
né reset: `8c343591` (avversario), `7b98a7b7` (servizio), `43230546` (lingua). Poi il commit di questa unione `2fb11679`
(correzioni sotto) e questo documento.

## 1. Conflitti

**Nessun conflitto di testo.** Controllo: `git merge-tree --write-tree` rifà le tre unioni da sé e dà alberi identici a
quelli dei tre commit di unione (6b0be11b, 2c38fa13, 8facd98e): nessuna riga è stata scelta a mano. Il ramo
`b72-servizio` partiva da `65a263bf` (prima del commit di soli documenti `b4fb3446` di `b71-int`): l'unione a tre vie
tiene i documenti del B71 (`docs/b71/unione.md`, `PIANO_LAVORI`, `PROJECT_MEMORY`…) come in `b71-int`; il diff
`b4fb3446..b72-int` sotto `docs/` contiene solo `docs/b72/*`.

Cinque file toccati da due rami, uniti da git e controllati a mano:

- **`natpf_serve_coach.js`** (servizio + lingua): `tick` chiama `alert.paint(serveAlertView(…))` (servizio) dopo `paint`
  che scrive le istruzioni nella lingua di chi batte (lingua); `hold()` (servizio) e `repaint()` (lingua) convivono. La
  casella che lampeggia non dipende dalla lingua: la lingua cambia solo il testo `.server-tag-text`
  (`NatpfLang.refresh`), il lampeggio è la classe `serve-blink` sull'elemento.
- **`natpf_ui.js`** (servizio + lingua): `_syncPause` con `serveCoach.hold()` (servizio); `NatpfLang`, tabellone per metà
  e riquadro della pausa per giocatore (lingua). Righe diverse.
- **`hud_ui.js`** (avversario + lingua): etichetta sotto il ritratto con `OPPONENT_NAME` / `opponentLevelName` nella pagina
  «Partita» (avversario, resta in italiano: è il menu) e scritte dei colpi, dei punti e della fine partita con `ltx`
  (lingua).
- **`natpf_scoreboard.js`** (avversario + lingua): nomi `Avversario` / `Avversari` / `Tu + compagno` e
  `rivalOf({ doubles })` (avversario), opzione `serving` di `scoreboardHtml` (lingua).
- **`natpf_prematch.js`** (avversario + lingua): «Batte per primo l'avversario» (avversario) passa da `LG.say` (lingua).

## 2. Le tre funzioni dopo l'unione, e cosa mancava

Controllato con i testi veri prodotti dal codice unito (`pointCall`, `gameCall`, `matchEndView`, `endScreen`,
`bestOf`, `cpuPill`, `prematchServeLine`, `firstServeText`, `scoreboardView`, `opponentLevelName`) passati per il
dizionario inglese del ramo lingua: per singolo, doppio, sfida in rete, entrambe le viste e tutti i livelli.
Il ramo lingua conosceva già quasi tutte le forme nuove del ramo avversario: «Punto dell'avversario» → «Opponent's
point», «Gli avversari non ci arrivano» → «The opponents can't reach it», «Vince l'avversario», «Vincono gli
avversari», «Batte sempre / per primo l'avversario» → «The opponent always serves / serves first», «Tu + compagno» →
«You + partner» (sigle YOU+PAR / OPP), «vincenti che gli avversari non hanno preso», «livello Esperto» → «Expert level».
Il ramo servizio non ha testi nuovi (solo classe e alone).

**Mancava** (commit `2fb11679`, «B72 unione: …»):

1. **Schermata finale persa contro l'avversario, in inglese.** Il ramo avversario scrive «Ha vinto l'avversario questa
   volta. Ecco cosa ti è venuto meglio:» (articolo dopo il verbo); il dizionario si aspettava «L'avversario ha vinto…» e
   con EN usciva «**l'avversario won this time.** Here is what you did best:». Ora chi ha vinto passa anche da `whoEn`:
   «The opponent won this time. Here is what you did best:»; i nomi restano come sono (anche minuscoli), «Player 2 +
   compagno» → «Player 2 + partner». (Nel doppio «Hanno vinto gli avversari…» era già giusto.)
2. **Avversario con il livello** (`opponentLevelName`: «Avversario esperto», «Avversario Leggenda», «Avversario facile»…)
   → «Expert opponent», «Legend opponent», «Easy opponent»; **«Palla corta dell'avversario / degli avversari»** già in
   italiano → «Opponent's / Opponents' drop shot». Oggi nessuna delle due passa dalla traduzione in partita (l'etichetta
   del ritratto è nel menu, la palla corta arriva come chiave del motore «CPU DROP SHOT», già tradotta): aggiunte perché
   il dizionario conosca tutte le forme nuove.
3. **Telecomando dello staff**: la risposta a «Gioca» dal menu diceva ancora «Contro la CPU» (`natpf_remote.js`, sfuggita
   al ramo avversario): ora «Contro l'avversario» (`OPPONENT_REF`, come le altre scritte del telecomando).

Con IT niente cambia (prova). Non toccati: gesti, sensori, registro, Worker.

Prova nuova `natpf-tennis/test/natpf-b72-unione.test.mjs` (6 prove): oltre 300 testi veri di punti, game, fine partita e
conto in inglese senza parole italiane; schermata finale persa in singolo e doppio a tutti i livelli (titolo, riga, pillole,
riquadri, righe dei game); tabellone, livelli, palla corta e IT identico; **servizio + lingua sul gioco vero senza disegno**
(mondo di prova `ui-world`): contro l'avversario con il telefono in inglese e in italiano la casella lampeggia subito,
l'alone arriva dopo 3 s, al lancio spariscono e l'istruzione è nella lingua di chi batte («Wait for it to rise…» /
«Aspetta che salga…»), in pausa tutto spento e tempo fermo a zero, alla ripresa di nuovo il lampeggio e l'alone dopo altri
3 s; stesso schermo con il P2 in inglese e il P1 in italiano: lampeggio e alone nella metà di chi batte, istruzione nella
sua lingua. Senza la correzione 1–2, 2 prove su 6 sono rosse.

## 3. Prove (numeri)

Worktree `/tmp/claude-0/-home-user/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b72/int`, `node_modules` collegati a
quelli del checkout principale (stesso `package-lock`), Chromium `/opt/pw-browsers/chromium`, schermate a
deviceScaleFactor 1. La macchina era condivisa con le prove nel browser del B71 (carico 6–13 su 4 core).

| Suite | Esito |
| --- | --- |
| `cd natpf-tennis && npm test` | **1900/1900** (6 min 9 s), 0 saltati (anche l'avvio del server LAN). Una corsa partita sull'unione `43230546` prima delle correzioni (scritte mentre girava, quindi non del tutto pulita): 1894/1894 |
| `node --test tools/test/*.test.mjs` | **316/316** (anche la copertura del dizionario del telefono) |
| `(cd tools/lan && node --test test/*.test.mjs)` | **13/13** |
| `(cd natpf-desktop && npm test)` | **56/56** |
| `cd natpf-tennis && npm run build` | verde (5,2 s): `dist` 41 MB, pacchetto offline 15 file 29,0 MB, `dist/natpf/js/tennis/lingua.js` incluso, CSS del servizio nel CSS unico |

Prove nel browser sul codice finale (tranne dove detto):

| Script | Esito | Note |
| --- | --- | --- |
| `natpf-avversario.mjs` | **9/9** | |
| `natpf-servizio-alone.mjs` | **27/27** | |
| `natpf-lingua.mjs` | **40/40** | ora «Opponent's point» arriva da «Punto dell'avversario» (forma del ramo avversario) |
| `natpf-menu.mjs` | **45/45** | |
| `natpf-nuovo-giocatore.mjs` | **29/29** | |
| `natpf-fine-partita.mjs` | **68/68** | |
| `natpf-chi-gioca.mjs` | **55/55** | primo giro fermato da `page.screenshot Timeout 30000ms` sulla prova dell'anello con carico 12 (28 verifiche OK fino lì, come nel ramo avversario con carico 19); secondo giro completo |
| `natpf-rete.mjs` | **11/11** | |
| `natpf-tabellone.mjs` | **41/41** | |
| `natpf-telecomando.mjs` | **91/91** | |
| `natpf-nome-telefono.mjs` | **23/23** | da una copia temporanea con la porta 8875 (la 8765 era occupata dalle prove del B71), poi cancellata |
| `natpf-telefono-bloccato.mjs` | **12/12** | stessa copia temporanea |
| `natpf-gameplay-23-10.mjs` | 9/11 | i 2 KO (B: legge «Palla game» invece della scritta del punto; E: «Perfetto» su un colpo in rete a Leggenda) sono gli stessi che il ramo avversario ha trovato su `b71-int` (copia con `git archive`): **non vengono dall'unione** |
| `natpf-chi-serve.mjs` | **36/36 + 29/29** | vedi sotto |

**`natpf-chi-serve.mjs` si blocca, ma non per il B72.** Il giro completo ha fatto 36/36 (Classici contro l'avversario
1920 e 1280, prima persona, computer del Player 2, stesso schermo; Lob & Drop contro l'avversario; costo del disegno +0,2
ms) e poi è rimasto fermo più di 20 minuti nel primo caso «Lob & Drop, computer del Player 2» (`page.evaluate` di
`atServe` che non torna, processo grafico di Chromium al 200%): lo stesso punto in cui si era fermato il ramo servizio.
Con una copia ridotta dello script (solo Lob & Drop, non salvata nel ramo):
- Lob & Drop contro l'avversario **con la misura del costo** e poi computer del Player 2: bloccato anche con la casella che
  lampeggia e l'alone spenti nella pagina, e bloccato **uguale su `b4fb3446` (`b71-int`, senza nessun cambiamento del
  B72)** in un worktree a parte, poi rimosso: viene dalla misura del costo (400 disegni) seguita dal computer del Player
  2, già prima del B72; il ramo avversario, sullo stesso codice di base, aveva fatto 64/64 (dipende dalla macchina);
- senza la misura del costo, sul codice unito, i casi rimasti **29/29**: Lob & Drop computer del Player 2 (batte il Player
  1 / il Player 2), Lob & Drop stesso schermo, aree strette 720×720 (Lob & Drop contro l'avversario, Classici stesso
  schermo). Con i 36 del primo giro sono coperte tutte le 64 verifiche dello script.

Schermate guardate (deviceScaleFactor 1), in `…/scratchpad/b72/e2e/`:
- `servizio-alone/alone-2-singolo-3s-1920.png`: bordo giallo luminoso sui quattro lati, tabellone «TU / AVV» e pausa
  leggibili sopra, casella «AL SERVIZIO» con l'alone del lampo; `alone-7-stesso-schermo-p2-1920.png`: alone solo attorno
  alla metà destra, casella del P2 che lampeggia, quella del P1 ferma.
- `lingua/B2-contro-avversario-servizio-en.png`: «SERVING», «YOU / OPP», «Hit when the ball is high / Missed toss: try
  again», «ENERGY»; `lingua/C2-stesso-schermo-p1-it-p2-en.png`: metà sinistra «AL SERVIZIO», «ENERGIA», metà destra
  «SERVING», «ENERGY»; `lingua/B4-fine-partita-en.png`: «You win!», «MATCH OVER · EVENT LEVEL», card «YOU / Event
  level / On a roll / First time», «4 points won», pulsanti in italiano (voluto).
- `avversario/fine-doppio-persa-1280x720.png`: «Hanno vinto gli avversari questa volta…», «vincenti che gli avversari non
  hanno preso».
- `diag/chi-serve/chi-serve-lobdrop-schermo-opponent.png`: casella del P2 con l'alone del lampo nella sua metà, quella
  sopra il P2 nella metà del P1 ferma; `diag/chi-serve/chi-serve-stretta-sempre-schermo-player.png`: area 720×720, caselle
  dentro le metà.

## 4. Non verificato

- Telefono vero (anche l'app NATPF Racchetta 1.0.5), programma Windows, ledwall: non provati; solo Chromium con tocchi e
  sensori simulati.
- La schermata finale **persa** in inglese è provata solo dai test del gioco (funzioni vere, `hud_ui` la traduce come le
  altre righe), non nel browser: `natpf-lingua.mjs` prova la partita vinta. (Revisione, §5: ora anche persa, B7.)
- Il blocco di `natpf-chi-serve.mjs` dopo la misura del costo resta (non viene dal B72): da guardare a parte.
- Non rifatte: le altre prove nel browser `natpf-*` (per esempio `natpf-stesso-schermo-b20.mjs` con due telefoni, il ramo
  servizio non l'aveva rifatta), allenamento, minigiochi, scambi di prova e moviola con l'alone (coperti dai test del
  gioco).
- Restano in italiano anche con EN le parti elencate in `docs/b72/lingua.md` §1 e §4 (menu, lobby, staff, toast, pulsanti
  della schermata finale, «Scambio caldo»…; l'etichetta del gesto è tradotta dalla revisione, §5).

Per l'agente principale: `natpf-desktop/novita.txt` contiene ancora «CPU» nelle note delle versioni già pubblicate (lo
segnala `docs/b72/avversario.md`); il registro delle richieste di `docs/PRODOTTI_FIERA_E_ONLINE.md` §3 non è stato
toccato.

## 5. Revisione e sistemazione

Dopo l'unione una revisione ha trovato 7 problemi (2 del B72 rispetto a prima: B72-REG-1 e B72-REG-2; 5 di lingua: L1–L5).
L'agente della sistemazione li ha corretti **tutti** nel ramo `b72-int`, con un test per ciascuno (commit «B72
sistemazione: …»). Non toccati: riconoscimento dei gesti, sensori, registro, Worker, file di versione, documenti di stato.

| Id | Gravità | Problema | Correzione | Prova |
| --- | --- | --- | --- | --- |
| **B72-REG-1** | alta | `site/js/tennis/lingua.js` costruiva al caricamento un `RegExp` con il lookbehind: su Safari/iOS prima del 16.4 (ogni browser di iOS è WebKit; iPhone 6s/7/SE di prima generazione restano a iOS 15.8) lancia `SyntaxError` e **la pagina del telefono non si caricava più**, anche in italiano. Prima del B72 nessun file di `site/js` lo usava | `phrasesRe`: il carattere prima del pezzo (o l'inizio) lo prende un gruppo e si rimette com'era (`(^|[^\p{L}\p{N}])(…)(?![\p{L}\p{N}])`, `replace(RE, (all, pre, w) => pre + …)`); il lookahead non consuma, quindi due pezzi separati da un solo carattere si trovano lo stesso. Il `RegExp` è in un try/catch: se non si può costruire si saltano solo i pezzi (frasi esatte e schemi restano) | `tools/test/b72-lingua.test.mjs`: guardia «nessun file di `site/js/tennis` contiene `(?<`»; import di `lingua.js` con un `RegExp` che rifiuta il lookbehind come iOS 15 (si carica e traduce; con il file di prima: «Invalid regular expression: invalid group specifier name»); pezzi vicini («corsa corsa-corsa» → «run run-run»), dentro una parola niente. Dopo la build `dist/natpf/js/tennis/lingua.js` non contiene `(?<` |
| **B72-REG-2** | bassa | «Nuovo giocatore» con la lobby su «Stesso schermo» (strada `split`) azzerava le mani per giocatore e usciva prima di `resetHands`, l'unico punto da cui partiva `resetLangs`: la coppia dopo trovava telefoni e metà in inglese. La prova nel browser passava perché entrava nello stesso schermo con `E.startSplit()` lasciando la lobby su «contro l'avversario» | `natpf_new_player.resetVisitor`: nel ramo `split` anche `resetLangs(ui, 'nuovo giocatore')` | test del gioco «revisione B72 (B72-REG-2)» (lobby `setMode('split')`, due telefoni EN → `newPlayer()` = `split`, IT a tutti e due, `cfg lg it` ai due telefoni; rosso con il file di prima); `natpf-lingua.mjs` D1 ora sceglie lo stesso schermo dalla lobby |
| **L1** | media | partita singola in EN: la scritta del segnale del momento giusto (prime 3 palle a Bambini ed Evento, cioè a ogni visitatore della fiera) restava «Colpisci quando il cerchio diventa verde» | `natpf_timing_cue.js`: `cueHintParts(lang)` e `_hintText` scrivono la scritta a pezzi con `textContent` nella lingua di chi gioca (`natpfLang.at('left')`: il segnale c'è solo a una vista), `data-lang` per riscriverla solo quando la lingua cambia, `relang()` da `NatpfLang.refresh`. EN: «Hit when the circle turns **green**» | test «revisione B72 (L1)»; B37 rafforzato (guarda gli elementi creati: due pallini, testo, `<b>verde</b>`); `natpf-lingua.mjs` B5 |
| **L2** | media | l'etichetta del gesto in basso al centro restava italiana a ogni colpo («ROVESCIO / Tagliato», «Gesto ignorato», «Molto in anticipo») | `natpf_gesture_hud._paint`: titolo, colpo ed esito da `natpfLang.say(…, at('left'))` (l'etichetta ascolta il telefono del P1); chiave del ridisegno con la lingua; `repaint()` da `NatpfLang.refresh`. Dizionario: «Gesto ignorato», «Colpo», «Top spin», «Piatto», «Molto in anticipo/ritardo», «aspetta la palla», «nessuna palla da colpire», i due motivi dei gesti scartati | test «revisione B72 (L2)» (tutte le combinazioni di lato, colpo, esito e motivo in inglese senza parole italiane; in italiano identiche); `natpf-lingua.mjs` B6 |
| **L3** | bassa | i nomi scritti dai giocatori passavano dal dizionario: «Vince» → «Wins» (tabellone «WIN», card «WINS»), «Asso» → «Ace» | `natpf_lang.nameTx` (solo i nomi dati dal gioco: «Tu», «CPU», «Avversario», «Avversari», «X + compagno»); `localizeBoard` e le righe dei game della fine partita lo usano; `translateEl` salta `.card-name, .end-pname` e li passa da `nameTx`; «Vince» tolto dalle frasi esatte: la pastiglia di chi vince (`data-tx="vince"`) e la corona (`data-tx-title`) si traducono per ruolo (`ROLE_EN`). I trofei («Asso» → «Ace») restano tradotti | test «revisione B72 (L3)» con «Vince», «vince», «Asso», «Muro», «Super» (tabellone, card, schede del B35 lette con l'HTML vero dei generatori, ritorno in italiano); `natpf-lingua.mjs` B5/B7 |
| **L4** | bassa | telefono in EN, tutorial prima della partita: «Card 1 of 5 · Presa a racchetta», «… · Posizione di partenza» | `PHONE_EXACT`: «Presa a racchetta», «Presa nel palmo», «Impugnatura a martello», «Impugnatura», «Posizione di partenza», «Colpo piatto», «Volée», «Tagliato di rovescio», «Incrociato», «Lungolinea». Corretta la frase di `docs/b72/lingua.md` §5 | prova di copertura estesa ai titoli di `TUTORIAL_CARDS` (letti dai sorgenti) e ai nomi di `GRIPS`; `natpf-lingua.mjs` A8 |
| **L5** | bassa | inglese sbagliato: «Match over · 1 games to 0», «Giulia wants a rematch · Marco is missing», «The game serves for the server» | «1 game to 0» (singolare con 1), «waiting for Marco», «The game serves for whoever is serving» | test «revisione B72 (L5)»; aggiornata l'attesa del test di prima sulla rivincita (testo voluto cambiato) |

### Prove (numeri)

Sul codice finale della sistemazione, stesso worktree e stessi `node_modules` collegati (carico della macchina 4–5 su 4
core durante le prove nel browser).

| Suite | Esito |
| --- | --- |
| `cd natpf-tennis && npm test` | **1905/1905** (prima 1900: +5 prove della revisione in `natpf-b72-lingua.test.mjs`; due corse, 5 min 15 s e 5 min 31 s) |
| `node --test tools/test/*.test.mjs` | **320/320** (prima 316: +4 in `b72-lingua.test.mjs`) |
| `(cd tools/lan && node --test test/*.test.mjs)` | **13/13** |
| `(cd natpf-desktop && npm test)` | **56/56** |
| `cd natpf-tennis && npm run build` | verde (7,5 s e 5,5 s); `dist/natpf/js/tennis/lingua.js` senza `(?<` |

Prove nel browser (Chromium `/opt/pw-browsers/chromium`):

| Script | Esito | Note |
| --- | --- | --- |
| `natpf-lingua.mjs` | **46/46** (prima 40) | nuove: A8 (tutorial dal computer in inglese sul telefono), B5 (scritta del segnale in inglese, tabellone «VIN» con il nome «Vince»), B6 (etichetta del gesto «Backhand / Slice»), B7 (partita persa da «Vince»: «Great match, Vince!», card «Vince», righe «Vince / Opponent»); D1 ora con lo stesso schermo scelto dalla lobby. Una corsa prima 45/46: A8 mandava il tutorial con i sensori spenti (dopo la ricarica la pagina mostra «Attiva i sensori», non il tutorial): attesa della prova sbagliata, ora attiva i sensori prima |
| `natpf-servizio-alone.mjs` | **27/27** | |
| `natpf-segnale-spiegato.mjs` | **14/14** | la scritta in italiano identica a prima («Colpisci quando il cerchio diventa verde») |
| `natpf-menu.mjs` | **45/45** | |
| `natpf-nuovo-giocatore.mjs` | **29/29** | |
| `natpf-fine-partita.mjs` | **68/68** | |
| `natpf-avversario.mjs` | **9/9** | |
| `natpf-nome-telefono.mjs` (con `run-local.mjs`) | **23/23** | pagina del telefono con il `lingua.js` nuovo, da una radice nello scratchpad che punta al `site/` del worktree |
| `natpf-telefono-bloccato.mjs` (con `run-local.mjs`) | **12/12** | |
| `natpf-chi-serve.mjs` | **36/36 + 36/36** | come nell'unione (§3): il giro completo ha fatto 36/36 fino alla misura del costo compresa (+0,03 ms) e poi è rimasto fermo più di 9 minuti su «Lob & Drop, computer del Player 2» (blocco già noto, non del B72), fermato a mano; poi una copia temporanea senza la misura del costo e senza i Classici (già fatti), cancellata dopo: **36/36** (Lob & Drop contro l'avversario, computer del Player 2, stesso schermo, aree 720×720). Tutte le verifiche dello script coperte |

Schermate guardate (deviceScaleFactor 1, tranne `natpf-nome-telefono.mjs` che usa 2 da sé), in
`…/scratchpad/b72/sist-shots/` e `/tmp/tennis-e2e/lingua/` (prima corsa di `natpf-lingua.mjs`):
- `lingua/B5-segnale-en.png`: in alto al centro i due pallini e «Hit when the circle turns **green**» («green» verde e in
  grassetto), anello bianco sulla palla in arrivo, tabellone «VIN / OPP · 1 GAME», barra «ENERGY»;
- `lingua/B6-gesto-en.png`: in basso al centro la freccia ← e «BACKHAND / Slice»;
- `lingua/B7-fine-persa-vince-en.png`: «MATCH OVER · EVENT LEVEL», «Great match, Vince!», «The opponent won this time…»,
  card con il nastro «GREAT MATCH», nome «VINCE» (maiuscolo dal CSS; il testo è «Vince»), «Event level», «Next trophy…»,
  «0 to 1», «Next time try the Easy level», pulsanti in italiano (voluto);
- `lingua/A8-telefono-tutorial-en.png` (390×844): «Look at the screen», «Card 2 of 5 · Starting position», «Seen 2 of 5»,
  «‹ Back», «Next ›», «All clear, got it»;
- `segnale/segnale-1280x720-palla-1.png`: in italiano la scritta è uguale a prima («Colpisci quando il cerchio diventa
  **verde**»);
- `nuovo-giocatore/B2-fine-split-vince-p2-1280.png`: fine partita nello stesso schermo in italiano, corona su «MARCO»,
  pastiglie «MVP DELLA PARTITA» / «BELLA SFIDA»: niente cambia in italiano;
- `servizio-alone/alone-2-singolo-3s-1920.png`: alone giallo e casella «AL SERVIZIO» come nell'unione.

### Cosa NON è verificato

- **iPhone vero con iOS 15–16.3** (il motivo di B72-REG-1): provato solo con un `RegExp` che rifiuta il lookbehind in Node
  (come WebKit prima del 16.4) e con la guardia sui sorgenti; nessun iPhone vecchio a disposizione. Nemmeno un telefono
  vero recente, il programma Windows o il ledwall.
- La scritta del segnale e l'etichetta del gesto che cambiano lingua **mentre sono in vista** (tocco sul telefono durante
  la palla): provato nei test del gioco (`relang`, `repaint`), non nel browser.
- La traduzione per ruolo della pastiglia «Vince» delle schede del B35 (stesso schermo senza card) e della corona: provata
  nei test del gioco con l'HTML vero dei generatori letto da un DOM minimo; nel browser solo la card a una vista.
- Restano in italiano, come prima, le parti elencate in `docs/b72/lingua.md` §5 (menu, lobby, staff, toast, pulsanti della
  schermata finale, «Scambio caldo», «perché il super non è scattato», allenamento e minigiochi…).

## 6. Unione con la revisione B71 (a2937f1f)

`a2937f1f` unisce nel ramo `natpf-simulator` la revisione B71 (`473b9e9d`: calibrazione giocando, dritto/rovescio,
sensori, registro formato 4) e il B72 (questo documento). Nessun conflitto di testo; file toccati da tutti e due:
`natpf_phone_racket.js` e `site/js/tennis/racchetta.js` (attenzione: nel messaggio di stato del telefono `lg` è il ritardo
browser/app del B71, nel `cfg` del gioco `lg` è la lingua del B72). Una verifica avversaria sul flusso della fiera (telefono
simulato, IT ed EN, più misure dello schermo) ha confermato 4 rilievi minori, ciascuno votato da due scettici. Tutti
**prodotto FIERA**. Corretti con commit locali «B71+B72 sistemazione: …» (niente push, file di versione non toccati).

| Id | Origine | Problema | Correzione | Prova |
| --- | --- | --- | --- | --- |
| **F1** | B72 | Fine partita con il telefono in EN: «Cecchino» → «Sharpshooter» andava a capo a metà parola («Sharpshoote» / «r», per `.trophy-txt b { overflow-wrap: anywhere }`); con «Marathoner» e la riga del prossimo trofeo la card non conteneva più tutto: il nome sopra il bordo e la riga del prossimo trofeo sotto (5 px a 1280×720, 6 a 1366×768, 8 a 1920×1080). In IT tutto entrava | Seguito il voto del secondo scettico: nel dizionario «Cecchino» → **«Sniper»** (traduzione letterale), una riga a tutte le misure, card con gli stessi margini dell'italiano. **CSS non toccato**: la regola proposta (`overflow-wrap: normal; word-break: keep-all`) faceva sovrapporre i nomi nella card stretta di chi perde nello stesso schermo, anche in italiano; la classe `long` di `cardHtml` avrebbe visto i nomi italiani (la traduzione arriva dopo, `translateEl`) | `natpf-b72-lingua.test.mjs` (riga del prossimo trofeo «Next trophy: Silver Sniper · …»); prova nel browser nuova `tools/e2e/natpf-fine-partita-en.mjs` (vista di una partita vera della fiera e tre varianti, IT ed EN, 1280×720, 1366×768, 1920×1080, 1024×768: niente fuori dalla card, nomi su una riga nelle card larghe, nessuna sovrapposizione): **prima 79/101, dopo 101/101** (commit `e061d1df`) |
| **F2** | B72 | Stesso schermo con tutti e due i telefoni in EN: sotto i ritratti delle card finali la fascia restava «Adulto» / «Bambino» / «Ragazzo» (il dizionario la traduceva solo dentro «Aiuto: X») | Tre frasi esatte in `GAME_EXACT`: Bambino → Child, Ragazzo → Teen, Adulto → Adult (non tutto `BAND`, che porterebbe anche «Sì» → «Yes»). I nomi scritti dai giocatori restano com'erano (`NAME_SEL`, `nameTx`) | `natpf-b72-lingua.test.mjs` (+2: card dello stesso schermo con l'HTML vero di `cardsHtml`, fasce in inglese, ritorno in italiano; rosse prima) (commit `e061d1df`) |
| **F3** | preesistente (B28) | Scambi di prova: dopo ogni colpo che prende la palla l'etichetta del gesto in basso diceva, 1,2 s dopo, «nessuna palla da colpire» / «no ball to hit», mentre il riquadro diceva «Colpo letto ✓». `natpf_ui.feedback` negli scambi di prova usciva prima di `gesture.onFeedback` e dopo `GESTURE_HUD.wait` l'etichetta trovava `pendingUserSwing` già consumato | `natpf_ui.feedback`, ramo degli scambi di prova: per un colpo preso (`kind 'hit'`) l'etichetta riceve un esito neutro, `{ kind: 'hit' }` con `{ color: 'green', text: 'Colpo letto' }` (evento con il solo `kind`, così un colpo difensivo non diventa «Molto in anticipo»). Il resto come prima: nessun anello, niente registro, allenamento e minigiochi. Dizionario: «Colpo letto» → **«Shot read»** (senza, in EN la riga era «Forehand · Topspin · Colpo letto») | `natpf-scambi-di-prova.test.mjs` (+2: scambi di prova veri con il telefono simulato, IT ed EN, mai «nessuna palla da colpire», almeno 2 «Colpo letto» / «Shot read» in verde; colpo difensivo di prova «Colpo letto», in partita ancora «Molto in anticipo»); `natpf-b72-lingua.test.mjs` L2 (+1 controllo, «Colpo letto» nella lista dei testi dell'etichetta): **3 rosse prima, verdi dopo** (commit `6e0445da`). Nel browser (sonda del rilievo adattata, nello scratchpad): etichetta «← DRITTO Top spin · Colpo letto» poi nascosta a 1,6 s; in EN «← FOREHAND Topspin · Shot read»; **4/4 in IT e in EN** |
| **F4** | preesistente (B37 + B28) | Scambi di prova a livello Evento (in fiera a ogni visitatore): la scritta del segnale del momento giusto (`#natpf-cue-hint`, z-index 31) finiva sotto il riquadro `.trial-card` (z-index 41, semitrasparente) e si leggeva in mezzo ai suoi testi, a 1280×720, 1366×768, 1920×1080 e 1024×1024 (non a 720×720). Le 3 palle con la scritta si consumavano lì | `natpf_timing_cue._hint`: con gli scambi di prova attivi (`engine.natpfUi.trial.active`) la scritta **non si accende e non si conta**: le prime 3 palle restano per la partita, anche dopo «Ricalibra» a partita in corso (stessa partita, `natpfStats.m` uguale: solo il CSS le avrebbe consumate nascoste). L'anello resta. In più `body.natpf-trial-on #natpf-cue-hint { display: none !important; }` in `natpf-ui.css`, accanto a quella di `#timing-popup` | `natpf-b37-collaudo.test.mjs` (+1, motore vero senza grafica: due palle di prova senza scritta poi le tre della partita, scritta mai messa nella pagina negli scambi, scritta accesa da una palla della partita che si spegne con «Ricalibra», regola CSS presente): **rossa prima, verde dopo** (commit `2e1ef319`). Nel browser (sonda nello scratchpad: fiera, Evento, telefono simulato, scambi giocati, poi la partita): **prima 6/8** (scritta visibile e contata negli scambi), **dopo 8/8 in IT e in EN** (anello in 113–115 campioni su circa 490, scritta mai; nella partita la scritta nelle prime 3 palle, «Colpisci quando il cerchio diventa verde» / «Hit when the circle turns green», non nella quarta) |

### Prove (numeri)

Sul codice finale (`2e1ef319`, dopo i tre commit della sistemazione `e061d1df`, `6e0445da`, `2e1ef319`), stesso
repository, macchina condivisa a 4 core; le prove nel browser una alla volta, con deviceScaleFactor 1.

| Suite | Esito |
| --- | --- |
| `cd natpf-tennis && npm test` | **1915/1915** (4 min 42 s; +5 prove della sistemazione: 2 di F1/F2, 2 di F3 in `natpf-scambi-di-prova.test.mjs`, 1 di F4 in `natpf-b37-collaudo.test.mjs`; più un controllo nella prova L2) |
| `node --test tools/test/*.test.mjs` | **322/322** (12 s) |

| Prova nel browser | Esito | Note |
| --- | --- | --- |
| `natpf-fine-partita-en.mjs` (nuova, F1) | **101/101** | prima della correzione 79/101 |
| `natpf-segnale-spiegato.mjs` | **14/14** | la scritta del segnale nella partita come prima |
| `natpf-scambi-di-prova.mjs` | **32/32** | 1 min 25 s |
| `natpf-lingua.mjs` | **46/46** | |
| sonda F4 nello scratchpad (`b7172/sistema2/f4/sonda-f4.mjs`) | prima **6/8**, dopo **8/8** IT e **8/8** EN | schermate `out/prima-it-scambi-anello.png` (scritta in trasparenza nel riquadro) e `out/dopo-it-scambi-anello.png` (riquadro libero, anello sulla palla) |
| sonda F3 nello scratchpad (`b7172/sistema2/f3-browser/prova-scambi2.mjs`, quella del rilievo con la misura della scritta che non c'è più) | **4/4** IT e **4/4** EN | etichetta «← DRITTO Top spin · Colpo letto» / «← FOREHAND Topspin · Shot read», poi nascosta a circa 1,6 s; mai «nessuna palla da colpire» |

### Cosa cambia per chi gioca (da sapere)

- **F4**: negli scambi di prova l'anello del segnale si vede senza la scritta che lo spiega, a tutte le misure (anche a
  720×720, dove prima non si sovrapponeva). La spiegazione arriva alle prime 3 palle della partita, come il segnale del
  B37 prevede (3 palle per partita). È lo stesso compromesso di `#timing-popup`, già nascosto negli scambi di prova.
- **F3**: negli scambi di prova un colpo preso mostra «Colpo letto» in verde, anche se è un colpo difensivo (non si
  giudica, come dice il riquadro). Un colpo a vuoto di prova resta senza esito, come prima: dopo 1,2 s l'etichetta può
  ancora dire «nessuna palla da colpire» (scelta voluta per non dare un giudizio «Troppo presto» / «Troppo tardi» negli
  scambi di prova; si può cambiare passando anche i colpi a vuoto).
- **F1**: il trofeo si chiama «Sniper» in inglese (prima «Sharpshooter»).

### Cosa NON è verificato

- Telefono vero (Android/iPhone, app NATPF Racchetta 1.0.5), programma Windows, ledwall: non provati; solo Chromium con
  sensori simulati.
- **Card stretta di chi perde nello stesso schermo** (difetto vecchio, B57, anche in italiano): i nomi dei trofei vanno a
  capo a metà parola («Cecchin o», «Sniper» su due righe). Non toccata: la prova nuova guarda lì solo che niente esca e
  niente si sovrapponga. Da decidere a parte (per esempio solo le medaglie, senza i nomi, in quella card).
- F4 con «Ricalibra» a partita in corso: provato nei test del gioco (motore vero senza grafica), non nel browser.
- Il riquadro degli scambi di prova («Scambi di prova · Colpisci la palla», «Il gioco impara il tuo colpo…») resta in
  italiano anche con il telefono in EN: è nelle parti non tradotte elencate in `docs/b72/lingua.md` §5.
- Non rifatte dopo la sistemazione le altre prove nel browser `natpf-*` (stesso schermo, fiera con i telefoni, servizio
  con l'alone, menu): i file toccati sono `natpf_lang.js` (tre voci nuove e una cambiata), `natpf_ui.feedback` (solo il
  ramo degli scambi di prova), `natpf_timing_cue._hint` e una riga di `natpf-ui.css`; i test del gioco li coprono.
- I documenti vivi (`PIANO_LAVORI`, `TRACCIA_PASSI`, `WORK_PROGRESS`, `PROJECT_MEMORY`) non sono aggiornati da questa
  sistemazione: li aggiorna l'agente principale.
