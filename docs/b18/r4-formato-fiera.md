# B18 · ramo R4 · Formato in fiera

Tappa 1, punto 11 del piano B16 (`docs/b16/rapporto-gameplay.md` §4), miglioramento 1 del §3, più il punto 17 (servizio
della CPU). Decisione dell'utente del 10/11: «ok, dimmi come attivarlo in caso». Quindi è un'**opzione spenta di base**.

## Cosa cambia per chi gioca

**Con l'opzione spenta** (di base) non cambia niente nella partita: batte una sola persona per game, ci sono parità e
vantaggi, «Al meglio di 5» c'è ancora. La simulazione dà risultati identici, punto per punto, alla versione di partenza
(d09357a), su 9 combinazioni di livello e profilo.
Due cose cambiano per tutti, perché riguardano il servizio della CPU (punto 17):

- il tabellone dell'arena mostra la **velocità vera** del servizio della CPU. Prima era sempre 194 km/h. Ora a Casual
  va da 185 a 199 km/h, a Pro da 216 a 239 km/h, a Leggenda da 191 a 235 km/h (40 servizi per livello);
- il servizio della CPU **non fa più tremare la telecamera** come un colpo eccezionale. La scia e le stelline restano.

**Con l'opzione accesa:**

- **Punto decisivo sul 40-40.** Chi vince quel punto vince il game. Non ci sono più vantaggi.
- **Il servizio passa come nel tie-break.** Il primo punto del game lo batte uno, poi due punti a testa: A, B B, A A,
  B B. Il punto decisivo (il 7°) lo batte chi non ha iniziato il game. Il game dopo lo inizia l'altro. Il primo game
  lo inizia chi è scelto in «Batte per primo»: di base chi gioca.
  - Contro la CPU, in una partita a 1 game, ora **batte anche la CPU**: circa metà dei punti (47–50%).
  - Nello stesso schermo **batte anche il Player 2**, con il suo telefono. Il suo telefono passa ad «al servizio» nei
    suoi punti, come quello del Player 1.
- **Tabellone** (in alto a sinistra, e la copia nella metà del P2 nello stesso schermo):
  - sul 40-40 il sottotitolo dice **«Punto decisivo»** invece di «Parità»; «Vantaggio» non compare mai;
  - la pallina di chi serve si sposta a ogni cambio di battitore;
  - i tabelloni arancioni dell'arena mostrano «40-40».
- **Banner:**
  - il punto che porta sul 40-40 mostra sotto «… · Punto decisivo» (anche nello stesso schermo, con i nomi);
  - al servizio del punto decisivo compare in grande **«Punto decisivo»**, in oro;
  - con questa regola non compare mai «Palla break»: il game non è di chi batte. Resta «Palla game» o «Palla match».
- **Voce inglese.** Non c'è una clip «deciding point» e non ne ho generate di nuove:
  - dopo il punto del 40-40 l'arbitro dice «Deuce», come fa anche nel tennis vero con il punto decisivo;
  - al servizio del punto decisivo dice **«Match point»** se quel game chiude la partita, altrimenti **«Game point»**.
    Sono clip che c'erano già, e sono vere: con il punto decisivo è palla game (o match) per tutti e due.
  - nella sfida tra due computer il Player 2 sente la stessa frase.
- **Partite più lunghe.** Con l'opzione accesa la partita più lunga è **al meglio di 3**:
  - nella pagina «Partita» → «Altre impostazioni» il pulsante «Al meglio di 5» sparisce;
  - se era già scelto, si passa da soli a «Al meglio di 3»;
  - il motore fa lo stesso controllo, anche se il 5 arrivasse da un'altra strada.
  
  Con l'opzione spenta «Al meglio di 5» resta per tutti. Il motivo è nelle misure qui sotto: anche con il punto
  decisivo, il meglio di 5 arriva a 8 minuti al p90 e a 10 al massimo.
- Il riassunto di «Altre impostazioni» dice «… · formato fiera · …», così chi prepara la partita vede che l'opzione è
  accesa.
- La regola vale **dalla partita dopo**. La partita in corso resta con la regola con cui è cominciata, anche se si
  cambia l'opzione nel frattempo.

**Sfida tra due computer (P2P o LAN).** La regola vale uguale su tutte e due le macchine:

- decide l'host. La regola (`score.fair`) e chi ha iniziato il game (`score.gameServer`) stanno nel punteggio, che
  l'host manda al Player 2 con ogni snapshot, insieme alla durata (`gamesToWin`);
- il computer del P2 non assegna punti (`_awardPoint` si ferma lì) e ignora la sua scelta salvata;
- quindi non può desincronizzarsi;
- anche la ripresa dopo un ricaricamento dell'host salva la regola. Se la regola nel frattempo è cambiata, si riparte
  da 0-0, senza mescolare le regole.

La regola si prova con l'unità e nel browser solo da un computer. Una partita P2P vera con la regola accesa non l'ho
provata: la prova `natpf-1v1-p2p` gira con la regola spenta (vedi «Non verificato»).

**Doppio 2v2.** La regola vale uguale: le due squadre si passano il servizio. Batte sempre il giocatore della squadra,
come prima: i compagni guidati dalla CPU non battono.

**Allenamento, riscaldamento e minigiochi** non usano la regola: hanno il loro punteggio.

## Come si attiva

Dal pannello dello stand (riservato all'addetto):

1. Dal **menu principale** del gioco premi **Ctrl + Maiusc + K**. Oppure tieni premuto per 3 secondi il marchio
   **NATPF** in alto a sinistra nel menu.
2. Si apre «Pannello dello stand». Clicca il riquadro **«Formato in fiera»**: la scritta passa da **«No»** a
   **«Sì · punto decisivo»** (in giallo). Un avviso in basso conferma la regola.
3. Clicca **«Chiudi»**. Vale **dalla prossima partita** e **resta salvata** anche chiudendo il programma.
4. Per spegnerla: stesso riquadro, un altro clic, torna «No».

Senza aprire il pannello, si può usare l'indirizzo (versione web o LAN). Così vale solo per quella pagina e non
cambia la scelta salvata:

- `…/?formato=fiera` la accende;
- `…/?formato=classico` la spegne;
- con il parametro, il pannello scrive «(indirizzo)» accanto allo stato. Un clic cambia solo la scelta salvata, e
  l'avviso lo dice.

Dettagli tecnici: la scelta salvata è nel `localStorage` del browser (o del programma Windows), chiave
`natpf-tennis.formatoFiera` (`1` accesa, `0` o assente spenta).

**Perché non sta nelle Opzioni dei visitatori.** È una decisione dello stand, come la «Mira del telefono» (B16, decisione
(d)). Se un visitatore la cambiasse, la troverebbe cambiata anche chi viene dopo. Per questo sta nel pannello dello
staff.
Chi gioca vede comunque che è accesa:

- «formato fiera» nel riassunto della pagina «Partita»;
- «Punto decisivo» sul tabellone;
- «Al meglio di 5» sparito.

## File toccati

- `natpf-tennis/src/natpf/natpf_fair_format.js` (nuovo): la regola in funzioni pure:
  - chi vince il game (`gameWinner`) e chi batte (`pointServer`, `nextServe`);
  - punto decisivo (`isDecidingPoint`) e voce (`decidingVoice`);
  - al massimo al meglio di 3 (`fairGamesToWin`);
  - lettura e scrittura dell'opzione e del parametro dell'indirizzo.
- `natpf-tennis/src/game_engine.js`:
  - `startNewMatch`: `score.fair`, `score.gameServer` e il limite del meglio di 5. Sul P2 della sfida resta spenta
    e decide l'host;
  - `_awardPoint`: regola del game e del battitore. Con l'opzione spenta il percorso è identico a prima;
  - `_formatCurrentScore` e `_getHighStakesPointLabel`: «Deciding Point» e niente «Break Point» con l'opzione accesa;
  - `_setupPointServe`: voce e `call.voice` per il P2;
  - `_executeServeHit`: velocità vera e niente tremolio per il servizio della CPU.
- `natpf-tennis/src/natpf/natpf_scoreboard.js`: «Punto decisivo» nel sottotitolo.
- `natpf-tennis/src/natpf/natpf_point_call.js`: «Punto decisivo» nel banner del punto, anche con i nomi dello stesso
  schermo. Un messaggio dell'host senza «kind» resta com'è sul P2.
- `natpf-tennis/src/natpf/natpf_i18n.js`: «Deciding Point» → «Punto decisivo».
- `natpf-tennis/src/natpf/natpf_kiosk.js` e `natpf-tennis/index.html`: il riquadro «Formato in fiera» nel pannello
  dello stand.
- `natpf-tennis/natpf-ui.css`: il pannello dello stand passa a 3 colonne (2 sotto gli 820 px, 1 sotto i 640, con
  `@container natpf`). Con 9 riquadri su 2 colonne «Chiudi» finiva fuori vista a 1024×600 e a 1366×657.
- `natpf-tennis/src/natpf/natpf_lobby.js`: «Al meglio di 5» nascosto con l'opzione accesa, «formato fiera» nel
  riassunto.
- `natpf-tennis/src/natpf/natpf_versus.js`: la ripresa della sfida salva regola e primo battitore del game.
- `natpf-tennis/src/natpf/diag/diag_recorder.js`: la diagnostica registra, a ogni partita, `formatoFiera` e
  `gameDaVincere`.
- Misure:
  - `natpf-tennis/scripts/audit/formato-fiera.mjs` (nuovo);
  - `natpf-tennis/scripts/audit/rally-balance.mjs`: aggancio facoltativo `setup(e)` prima della partita.
- Prove:
  - `natpf-tennis/test/natpf-formato-fiera.test.mjs` (nuovo, 16 test);
  - `tools/e2e/natpf-formato-fiera.mjs` (nuovo, 20 verifiche).

## Misure prima e dopo

Banco: `node --import ./test/register.mjs scripts/audit/formato-fiera.mjs --points=400 --seeds=7,11,23,31,47`.

- Motore vero senza disegno, con i profili del telefono di `rally-balance.mjs` (bambino, amatore, tennista).
- 400 punti per seme e 5 semi per ogni riga.
- Durata: tempo di gioco simulato dal primo servizio al punto che chiude la partita, comprese le pause tra i punti e
  la moviola. Non conta la scritta d'inizio né la schermata finale.
- Le partite cominciano da un game battuto da chi gioca (scelta di base).

«Prima» è la versione d09357a. I suoi numeri sono **identici** a quelli di questa versione con l'opzione spenta, su
tutte le 9 righe. «Dopo» è questa versione con l'opzione accesa.

**Partita a 1 game** (il formato di base in fiera). Tempi in secondi; «CPU batte» è la quota di punti serviti dalla CPU:

| Livello | Profilo | p50 prima → dopo | p90 prima → dopo | max prima → dopo | partite vinte prima → dopo | CPU batte prima → dopo |
|---|---|---|---|---|---|---|
| Casual | bambino | 81 → 69 | 149 → 104 | 297 → 140 | 44,4 → 40,4% | 0 → 49,6% |
| Casual | amatore | 65 → 62 | 94 → 88 | 135 → 142 | 99,1 → 99,5% | 0 → 47,0% |
| Casual | tennista | 38 → 35 | 50 → 45 | 69 → 69 | 100 → 100% | 0 → 49,5% |
| Pro | bambino | 58 → 55 | 100 → 84 | 145 → 127 | 2,0 → 1,5% | 0 → 48,1% |
| Pro | amatore | 91 → 89 | 162 → 129 | 422 → 175 | 86,5 → 73,4% | 0 → 49,9% |
| Pro | tennista | 56 → 51 | 73 → 70 | 96 → 93 | 100 → 100% | 0 → 48,7% |
| Leggenda | bambino | 46 → 43 | 64 → 64 | 88 → 84 | 0 → 0% | 0 → 47,6% |
| Leggenda | amatore | 74 → 71 | 100 → 99 | 167 → 158 | 0,5 → 1,9% | 0 → 47,4% |
| Leggenda | tennista | 110 → 106 | 172 → 142 | 353 → 172 | 9,5 → 8,9% | 0 → 49,2% |

In sintesi:

- **9 partite su 10** finiscono entro **0,8–2,9 minuti prima** e **0,75–2,4 minuti dopo**;
- **la più lunga** passa da 1,2–7,0 minuti a **1,2–2,9 minuti**.

Il rapporto B16 dava 2,2–3,4 → 1,6–2,4 minuti al p90. La direzione è la stessa, ma i numeri sono diversi: il banco è
diverso (gli script dell'audit B16 non sono nel repository) e qui la partita comincia sempre dal servizio di chi gioca.

**Chi vince.** Ora batte anche la CPU, quindi chi vince solo grazie al proprio servizio vince un po' meno:

- il bambino a Casual passa dal 44 al 40% delle partite;
- l'amatore a Pro dall'86 al 73%;
- il resto cambia di poco.

Come diceva il rapporto, va abbinato al livello per bambini e al livello Evento della tappa 2.

**Al meglio di 3 e al meglio di 5.** p90 e massimo, in secondi, prima → dopo:

| Livello | Profilo | meglio di 3 p90 | meglio di 3 max | meglio di 5 p90 | meglio di 5 max |
|---|---|---|---|---|---|
| Casual | bambino | 303 → 254 | 412 → 331 | 471 → 396 | 643 → 506 |
| Casual | amatore | 167 → 170 | 251 → 240 | 244 → 245 | 311 → 350 |
| Casual | tennista | 86 → 88 | 111 → 116 | 128 → 124 | 152 → 144 |
| Pro | bambino | 153 → 157 | 276 → 267 | 236 → 225 | 316 → 316 |
| Pro | amatore | 361 → 304 | 546 → 414 | 585 → 490 | 714 → 607 |
| Pro | tennista | 129 → 124 | 164 → 171 | 185 → 188 | 226 → 211 |
| Leggenda | bambino | 110 → 112 | 168 → 146 | 163 → 166 | 229 → 194 |
| Leggenda | amatore | 182 → 188 | 249 → 292 | 263 → 267 | 319 → 355 |
| Leggenda | tennista | 369 → 337 | 754 → 401 | 556 → 475 | 675 → 548 |

Con il punto decisivo:

- il **meglio di 3** resta entro 5,6 minuti al p90 e 6,9 al massimo;
- il **meglio di 5** arriverebbe ancora a 8,2 minuti al p90 e 10,1 al massimo.

Da qui la scelta: con l'opzione accesa il 5 diventa 3.

**Game al punto decisivo** (7 punti): dal 26–27% dei game per il bambino a Casual e l'amatore a Pro, allo 0% per il
tennista. Prima la stessa quota di game andava ai vantaggi, e qualcuno durava molto di più.

**Servizio della CPU** (40 servizi per livello, motore senza disegno), velocità sul tabellone:

- prima: sempre 194 km/h;
- dopo: Casual 185–199 (mediana 193), Pro 216–239 (mediana 228), Leggenda 191–235 (mediana 224).

Il tremolio della telecamera sul servizio della CPU è 0 in tutti i 120 servizi.
**Varietà del servizio della CPU:** non l'ho toccata.

- A Pro e a Leggenda il servizio della CPU varia già (`cpuServeEvent`, `legendServe`).
- A Casual resta uguale e corto.

Cambiarlo vuol dire cambiare il gioco e la Leggenda («non indebolirlo», `natpf_skill.js`), e non è «piccolo e sicuro»:
resta per la tappa 3 (punto 17 del rapporto).

**Leggenda.** `npm run audit:legend` dà «Tutti i criteri rispettati»: 69 criteri su 69. Con l'opzione spenta il motore
gioca come prima, e il banco della Leggenda la usa spenta.

## Test

- `cd natpf-tennis && npm test`: **1006 su 1007 superati, 1 saltato** (era già saltato), 0 falliti.
  
  Al primo giro completo i falliti erano 2:
  - il primo era il mio. `natpf-mira-sensibilita` cercava il riquadro «Mira del telefono» come ultimo del pannello.
    L'ho corretto mettendo «Formato in fiera» prima della mira;
  - il secondo era `natpf-lan-letture`, una prova a tempo. È fallita mentre girava insieme alle prove nel browser, e
    nel giro finale passa.
- `node --test test/natpf-formato-fiera.test.mjs`: 16 su 16. Coprono:
  - opzione e indirizzo;
  - sequenza A B B A A B B e regola del game, accesa e spenta;
  - battitore dopo il punto;
  - voce con le clip esistenti e traduzione;
  - meglio di 5 → 3;
  - tabellone e banner, anche nello stesso schermo e dal lato del P2;
  - ripresa della sfida;
  - scritte del pannello;
  - motore accesa e spenta, con «Break Point» solo spenta;
  - limite del 5 e P2 della sfida;
  - telefono del P2 al servizio nello stesso schermo;
  - servizio della CPU (velocità vera, niente tremolio).
- Prova nel browser `tools/e2e/natpf-formato-fiera.mjs`: **20/20**. Con i tasti veri si accende dal pannello dello
  stand. Poi:
  - singolo contro la CPU avviato da «Gioca»: battitore A B B A A B B; la CPU serve davvero nei suoi punti a 189,
    197 e 185 km/h; sul 40-40 «Punto decisivo» nel tabellone e in grande; voce «Match Point»; il punto decisivo
    chiude la partita;
  - stesso schermo: telefoni «serve/play» alternati come A B B A A B B; il P2 lancia e colpisce 3 servizi su 3 dagli
    ingressi del secondo telefono; «Punto decisivo» anche nella copia del P2;
  - `?formato=classico`: «No (indirizzo)», «Al meglio di 5» presente, battitore fisso, «Parità».
  
  I punti si assegnano con la regola del motore e la fisica si fa avanzare a mano. Il Chromium senza GPU delle prove
  avanza di circa 0,08 s di gioco al secondo.
- Altre prove nel browser, tutte verdi:
  - `natpf-menu` 28/28, compreso il pannello dello stand a 3 colonne a 1366×657, 1024×600 e 1280×720. Con 2 colonne
    era 26/28: «Chiudi» fuori vista;
  - `natpf-tabellone` 42/42;
  - `natpf-split-ready` 34/34;
  - `natpf-1v1-p2p` 39/39, dopo la build.
- `node --test tools/test/*.test.mjs` (sito): 200/200.
- `cd natpf-tennis && npm run build`: ok.
- `npm run audit:legend`: tutti i 69 criteri rispettati.

## Non verificato

- **Persone vere, telefono vero, PC Windows dell'evento, ledwall.** Niente di questo è provato. Il servizio del P2
  nello stesso schermo è provato con gli ingressi del secondo telefono nel motore, non con un telefono simulato
  completo né con uno vero.
- **Sfida tra due computer con l'opzione accesa.** Ci sono:
  - la regola, che passa nello snapshot;
  - la prova di unità sul computer del P2 (`score.fair` resta spento, decide l'host);
  - la ripresa della sfida.
  
  Una partita P2P o LAN vera tra due browser con l'opzione accesa no. `natpf-1v1-p2p` gira con l'opzione spenta.
- **Voce.** Le frasi sono clip esistenti scelte dal motore, provate con le funzioni (`callout`). Non le ho ascoltate in
  un browser con l'audio. Non c'è una frase «deciding point»: per averla bisognerebbe generare una clip nuova con la
  stessa voce (`public/voce/LEGGIMI.txt`).
- **Durate.** Sono del gioco simulato: le persone vere fanno pause, sbagliano il lancio, guardano il telefono.
- **Il colpo del servizio** con l'opzione accesa e la webcam (P2 con la webcam nello stesso schermo) non è provato. La
  regola però non dipende dal tipo di racchetta.
