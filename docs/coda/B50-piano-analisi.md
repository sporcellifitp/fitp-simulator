# B50 · piano: prova del ritardo del ledwall per lo staff e pulizie trovate per strada

Analista: preparazione senza modifiche al repository. Base letta: `natpf-simulator` a `b0c8356` (15/11, 01:40 UTC).
Worktree di lettura e prove: `scratchpad/prep/b50/wt` (staccata). Porte del browser riservate: 4390–4399.

Stato: COMPLETO (sezioni 0–6). Ripreso il 15/11 alle 07:10 UTC dopo il limite d'uso del primo analista: §1 riletta e
controllata sul codice (righe giuste), §1b-2 e §1d misurate nel browser, §2–§6 scritte. Sul remoto `natpf-simulator` è a
`656f3dc` (solo documenti dopo `b0c8356`); la B48 è sul ramo `b48-servizio` (`aa9b08f` passo 1, poi fino a `a12c299` «passi 2–4»), non unita.

## 0. Riassunto per lo sviluppatore

- **Quando**: dopo l'unione della B48 (porta il ritardo dello schermo nei due telefoni e cambia servizio e Leggenda).
  Ramo `b50-ritardo`, porte del browser 4390–4399.
- **Difetto 16**: chiuso nel motore dal B18 (`natpf_impact.js:395-433`, `ballAtGesture`; test `natpf-b18-ritardo` 3/3
  verdi oggi). Con il ritardo impostato giusto il colpo a tempo per gli occhi è PERFETTO fino a 160 ms; oltre 160 ms resta
  un limite (colpo appena in ritardo perso, palla che riparte 2–4 m dietro): fuori dal B50, al revisore finale.
- **Pulizie** (passi B50-1…B50-5):
  - `racchetta.js` `let screen` (`:72`) nasconde `window.screen`: il blocco in verticale non parte dal 05/11 e il
    messaggio «dev» manda `or: null`, `sc: [null, null, dpr]`. Correzione in due righe (`:516`, `:697`) con test che
    fallisce prima; **cambia il comportamento sui telefoni veri** (pagina sempre verticale a schermo intero): proposta di
    accenderlo, non provato su telefoni veri.
  - Dubbi del B43: «Parità/Vantaggio» nella pillola del tabellone (proposta: sì, `scoreTag` con due tipi nuovi, nessun CSS);
    istruzioni del servizio a 720×720 **misurate: coprono ancora il tabellone di 12×46 px** (lancio a vuoto, «Aspetta che
    salga…» e, con la B48, «Colpisci!» con la riga della direzione) → in aree ≤ 800 px un poco a destra
    (`translateX(calc(-50% + 4cqw))`: misurato 0 px² ovunque); `?diag=1` che ferma la partita: solo documenti.
  - Leggenda: riferimento per lato in `tools/e2e/natpf-leggenda.mjs:84-86` e `:161-169` (solo la prova).
  - Avviso della mano a 720×720: la B45.2 l'ha chiuso; misurato nel browser, non resta niente (solo un controllo in più in
    `natpf-mano-sicura`).
- **Prova del ritardo dello schermo** (passi B50-6…B50-9): nella diagnostica, riquadro «Ritardo dello schermo» →
  «▶ Prova del ritardo (20 s)». Palla che rimbalza sul ledwall, chi tiene il telefono fa un colpo secco a ogni contatto;
  18 rimbalzi con intervalli a caso 0,8–1,4 s (la caduta si vede sempre), 3 di riscaldamento, 3 palle che spariscono in
  cima (chi colpisce a ritmo viene scoperto), nessun voto durante la prova. Ritardo = mediana di (picco del gesto −
  contatto) con scarto dei fuori misura (3·MAD, minimo 40 ms), valida con ≥ 8 colpi su 12, ≤ 1 colpo sui catch,
  dispersione ≤ 70 ms. Valore proposto = misurato − riferimento del monitor (stessa prova sul monitor del computer, che
  toglie anticipo di chi prova e disegno del computer), arrotondato a 5, 0–200 ms; «Salva» passa da `saveLag` e vale per i
  due telefoni. I colpi della prova non vanno al gioco né al profilo (sonda in `_onSwing`).
- **Precisione** (Monte Carlo sul prototipo `misure/lag-stima.mjs`): telefono simulato errore p90 4 ms (atteso nel browser
  80 ± 20 e 160 ± 20); persona costante (σ 35 ms) entro ±30 ms nel 97% delle prove valide; σ 50 ms nell'87%.
- **Resta da provare con il ledwall vero**: persone vere, ritardo vero (video a 240 fps), canvas 2D contro WebGL,
  riferimento sul monitor del PC dello stand.

## 1. Pulizie

### 1a. `racchetta.js`: `let screen` che nasconde `window.screen` — ESISTE ANCORA

**Dove.** `site/js/tennis/racchetta.js:72`:
`let gate = pair ? gateRestore(ss.get('gate')) : null, screen = 'link', tutLitT = null, wantFs = false;`
(introdotta da `cb32d43`, «B9 A», 05/11). La pagina è un modulo (`site/tennis/racchetta.html:194`, `type="module"`): la
`let` di modulo nasconde il globale `screen` in tutto il file. Due punti volevano lo schermo vero:
- `:697` `lockOrientation()`: `screen.orientation?.lock?.(…)` → `'link'.orientation` (o `'ready'`, `'cal'`…) è
  `undefined`, la catena opzionale si ferma senza errori: **il blocco in verticale non parte mai dal 05/11** (dal 21/10,
  `a307100`, al 05/11 c'era);
- `:516` `sendDevice()`: `or: screen.orientation?.type || null` → sempre `null`; `sc: [screen.width, screen.height, dpr]`
  → `[undefined, undefined, dpr]`, nel JSON `[null, null, dpr]`.

Unico altro uso di `window.screen` nel sito: `site/js/tennis/main.js:25`, già scritto `window.screen.width` (giusto).
Nessun altro modulo di `site/js/tennis/` ha una variabile che nasconde `screen`.

**Cosa provoca oggi.**
1. Android (Chrome, Samsung, Firefox): con il telefono «di taglio» nel colpo il sistema può girare la pagina; il gioco va
   avanti (i sensori sono nel riferimento del telefono), ma la pagina si ridisegna in orizzontale e per 3 s compare
   «Il telefono si è girato · Il gioco continua. Per leggere meglio, raddrizzalo.» (`racchetta.html:193`,
   `checkOrientation()` `racchetta.js:700-706`). Il commento sopra `lockOrientation` (`:691-696`) dice che la pagina
   «prova a restare in verticale»: oggi non ci prova.
2. Diagnostica: `tel.dispositivo` / `tel2.dispositivo` (`natpf-tennis/src/natpf/diag/diag_recorder.js:101`, `:453`) hanno
   `orientation: null` e `screen: [null, null, dpr]` in tutte le sessioni dal 05/11. Non tocca il gioco: `orientation` e
   `screen` del messaggio «dev» finiscono solo in `this.device` (`natpf_phone_racket.js:655`) e nella diagnostica; il
   registro dello stand usa solo `ua` (`registro_registratore.js:294`).

**Correzione minima (proposta).** Due righe e un commento:
- `:697` → `window.screen.orientation?.lock?.(…)`;
- `:516` → `or: window.screen.orientation?.type || null, sc: [window.screen.width, window.screen.height, …]`;
- `:72`, commento: «screen = la schermata della pagina (phoneView); lo schermo del telefono è window.screen».

Alternativa più pulita ma più larga: rinominare la variabile (`view`) in tutto il file (`:72`, `:144`, `:152`, `:154`,
`:157-160`, `:788` `tapVotesSign({ screen: view, phase, trial })`, `:878` `screen: view` nel getter) e aggiornare i due
controlli sul testo di `tools/test/b46-lato-sicuro.test.mjs:84` e `:87`, che cercano proprio `{ screen, phase, trial }` e
`if (v.screen !== screen){ screen = v.screen;`. `window.__racchetta.state.screen` e `document.body.dataset.screen` vanno
tenuti con questi nomi: li leggono natpf-nuovo-giocatore, natpf-scambi-di-prova, natpf-training-flow, natpf-tutorial-phone,
natpf-tutorial-relink. Consiglio la minima.

**Rischi del blocco vero (cambia il comportamento sui telefoni veri).**
- `lock()` vale solo a schermo intero. La pagina va a schermo intero con «Attiva i sensori» (`:544`, `fullScreen()` poi
  `.then(lockOrientation)` `:698`) e ci torna al primo tocco dopo lo schermo spento (`:780`, `:808`, `:856`). Con la
  correzione, su Android la pagina **resta in verticale per tutto il gioco**: niente più «Il telefono si è girato», niente
  ridisegno della pagina a metà scambio. Chi volesse leggere il telefono in orizzontale non può più (la pagina è disegnata in
  verticale; la presa piatta in orizzontale è spenta, `ALLOW_FLAT = false`, `:46`, quindi si chiede sempre `'portrait'`).
- Uscita dallo schermo intero (gesto «indietro», schermo spento): il browser toglie il blocco da solo; torna al tocco che
  rimette lo schermo intero. Nessuno stato da pulire.
- Al tocco di «Attiva i sensori» con il telefono tenuto in orizzontale la pagina gira subito in verticale (una rotazione
  in più in quel momento).
- iPhone/Safari: `lock` assente o rifiutato → `?.` e `.catch(() => {})` → come oggi. `enableTouch` (`:731`) chiama il blocco
  senza schermo intero → rifiutato, nessun effetto.
- Riconoscimento dei gesti: invariato. `devicemotion` è nel riferimento del telefono e nessun codice rimappa gli assi con
  l'orientamento della pagina (cercato in `site/js/tennis/`: nessun `screen.orientation.angle`, nessun `window.orientation`).
- Prove nel browser: i telefoni simulati sono contesti `isMobile` 390×844 (`tools/e2e/th.mjs:17`), già verticali.
  `tools/e2e/gesture-calibration.mjs:124-126` gira il viewport in orizzontale per vedere «Il telefono si è girato»: senza
  schermo intero il blocco non vale, deve restare verde; da rifare.
- Decisione proposta (il coordinatore la può prendere da solo, va scritta nella guida e nel riepilogo all'utente): accendere
  il blocco, che era il disegno del 21/10; se allo stand desse fastidio, togliere `lockOrientation` (non lasciare codice che
  non fa niente). **Da provare su un Android vero e un iPhone** (non possibile qui): «Attiva i sensori» col telefono in
  orizzontale → la pagina si raddrizza; colpi di taglio → la pagina non gira; schermo spento e riacceso, tocco → di nuovo
  bloccata.

**Test che fallisce prima.** Nuovo `tools/test/b50-pulizie.test.mjs` (stile di `tools/test/stand-phone.test.mjs:68-90`:
pezzo vero del sorgente in `vm`): prende dal sorgente la riga della dichiarazione (`let gate = … screen = 'link' …`),
`function lockOrientation(){…}` (una riga) e `const sendDevice = …` (una riga) e le esegue con un contesto che ha
`window.screen` **e** `screen` globale uguali a un finto `{ orientation: { type: 'portrait-primary', lock: spia }, width:
412, height: 915 }`, `devicePixelRatio: 2.625`, `grip: 'upright'`, `checkOrientation(){}`, `send` che raccoglie. Attesi:
`lock` chiamato con `'portrait'`, messaggio `dev` con `or: 'portrait-primary'` e `sc: [412, 915, 2.63]`. Sul codice di
oggi: spia mai chiamata, `or: null`, `sc[0] === undefined` → rosso. (Il test passa anche con il rinomino, perché il globale
`screen` finto è lo stesso oggetto.)

**Prova nel browser.** Aggiungere a `tools/e2e/natpf-tutorial-phone.mjs` (o una prova piccola nuova
`tools/e2e/natpf-b50-orientamento.mjs`): `init` del telefono che sostituisce `ScreenOrientation.prototype.lock` con una
spia che registra il tipo e risolve; dopo il clic su «Attiva i sensori» la spia ha `'portrait'` almeno una volta (oggi
zero); sul computer, la riga della diagnostica `tel.dispositivo` (oppure `__natpfTennis.natpfPhone.device`) ha
`screen[0] > 0` e `orientation` stringa (oggi `null`).

### 1b. Dubbi del B43 — ESISTONO ANCORA TUTTI E TRE (sono scelte, non difetti)

Fonte: `docs/TRACCIA_PASSI.md:753-755` («Dubbi del B43 da portare all'utente»), `docs/b43/tabellone-e-pannello.md:59`,
`:83-87`, `:231-233`.

**(1) «Parità» / «Vantaggio» non più scritti sul tabellone.**
- Oggi: `natpf-tennis/src/natpf/natpf_scoreboard.js:138-149` calcola ancora la scritta (`label`), ma `scoreboardHtml`
  (`:159-169`) la mette solo nel testo per lo screen reader (`.sb-sr`, `data-sb-label`). Si vedono le caselle «40 · 40» e
  «AD»; l'etichetta tonda (`scoreTag`, `.sb-tag`, `natpf-round.css:493`, `:509`) dice il formato («1 GAME», «AL MEGLIO DI
  3») e diventa rosa «PUNTO DECISIVO» solo nel formato in fiera.
- «Parità» e «Vantaggio tuo / della CPU / di …» restano detti dalla scritta grande del punto, 0,5 s dopo l'atterraggio
  (`natpf_point_call.js:23-25` e `:46-49`), e dalla voce inglese.
- Cosa provoca: per tutta la durata del 40-40 o del vantaggio, chi non conosce il tennis vede «40 40» o «AD» e niente
  parole; la decisione del B16/B18 (difetto 4: «0» e «Parità» al posto di «Love»/«Deuce») resta vera solo nella scritta del
  punto.
- Correzione minima proposta (nessuna riga in più, rispetta la richiesta dell'utente del 13/11 «metti etichetta sullo
  scoreboard»): usare la **stessa pillola**: al 40-40 «PARITÀ» (azzurra, come il formato), al vantaggio «VANTAGGIO» (chi ce
  l'ha lo dice già la casella «AD» nella sua riga), nel formato in fiera resta «PUNTO DECISIVO». Codice: `scoreTag(gamesToWin,
  { decisive, deuce, adv })` in `natpf_scoreboard.js` (stessa funzione che oggi riceve solo `decisive`, chiamata a `:149`);
  `kind: 'deuce' | 'adv'` con il colore del formato (nessuna regola CSS nuova se si riusa quella di `format`).
- Test: in `natpf-tennis/test/natpf-scoreboard.test.mjs` (helper `sc(...)` del file, usato a `:44-56`):
  `scoreboardView(sc(3, 3)).tag` → `{ text: 'Parità', kind: 'deuce' }` (maiuscolo dal CSS), `sc(4, 3)` e `sc(3, 4)` →
  `'Vantaggio'`, `sc(3, 3)` con `score.fair = true` → `'Punto decisivo'` (come oggi), `sc(2, 1)` → il formato. Oggi i primi
  due danno il formato («1 game») → rossi. Nel browser: `natpf-tabellone` con un controllo al
  40-40 e al vantaggio; schermate a 1920×1080, 720×720 e 1920×540 (la pillola «VANTAGGIO» è la più larga: deve stare
  nel riquadro; misurare la larghezza come fa la prova per «PUNTO DECISIVO»).
- È una scelta di prodotto (il B43 l'ha tolta su richiesta): se il coordinatore preferisce non toccare, scrivere nel
  riepilogo finale la domanda all'utente con le due possibilità.

**(2) Istruzioni del servizio a 720×720 contro la CPU vicine all'angolo del tabellone. — ANCORA VERO (misurato: 12×46 px, tre stati su quattro).**
- Il B43 misurava circa 12 px di sovrapposizione con il riquadro «Alza il telefono: lanci la palla…». Dopo il B44
  (`natpf_serve_coach.js:4-16`) prima del lancio non c'è più quel riquadro (c'è l'icona del telefono nella casella «Al
  servizio»): il riquadro `#natpf-serve-coach` (`index.html:98`) compare solo durante il lancio («Colpisci!») e dopo un
  lancio a vuoto («Colpisci quando la palla è in alto» + «Lancio a vuoto: riprova», il testo più lungo), più il richiamo
  per nome e il lancio automatico nello stesso schermo (già provati da `natpf-stesso-schermo-b20` punto 3 a quattro misure).
- **Misura dell'analista** (`misure/b50-misure-720.mjs`, uscita `misure/b50-misure-720.txt`, schermata
  `misure/servizio-miss-720x720.png`; partita contro la CPU con il mouse, riquadro dipinto con
  `natpfUi.serveCoach.paint(...)`): **a 720×720 il riquadro del lancio a vuoto copre ancora il bordo destro del
  tabellone di 12 px per 46 px** (riquadro x 180–540, y 108–256; `.sb-box` x 17–192, y 43–154), uguale con la finestra
  720×720 e con l'area del ledwall 720×720 dentro 1280×720. «Colpisci!» (più stretto) no: 47 px di distanza. A 1920×1080,
  1280×720, 1024×600 e 1920×540 nessuna sovrapposizione (distanza in orizzontale 220, 146, 101, 562 px). Nella schermata il
  bordo rosso del riquadro tocca le caselle gialle dei game.
- **Seconda misura** (`misure/b50-misure-720b.mjs`, uscita `misure/b50-misure-720b.txt`, 7 misure con anche 800×600,
  carico 20–22): a 720×720 (finestra e area) coprono il tabellone di 12×46 px **anche «Aspetta che salga…»** (stato
  `wait`, oggi) e **«Colpisci!» con la riga della B48** («Prima del punto più alto: palla al centro · dopo: larga»,
  `SERVE_CHOICE` sul ramo `b48-servizio`, `a12c299`): il riquadro arriva a 360 px di larghezza e va a capo. A 800×600 e
  oltre nessuna sovrapposizione (distanza minima 35 px). Con la correzione proposta qui sotto (`FIX=destra`, CSS iniettato)
  **0 px² in tutti gli stati e a tutte le 7 misure**, distanza minima 17 px a 720×720, bordo destro a 569 px (pulsante della
  pausa ≈ 650). Con l'alternativa «sotto il tabellone» (`FIX=sotto`) anche 0 px², ma la distanza scende a 6 px a 720×720 e
  1 px a 800×600 e il riquadro copre il campo fino a 308 px.
- La prova del repository che lo controlla esiste solo per lo stesso schermo (`tools/e2e/natpf-stesso-schermo-b20.mjs:54-59`
  e `:162-210`); contro la CPU nessuna.
- **Correzione minima (proposta)**: nelle aree strette **spostare il riquadro un poco a destra**, senza abbassarlo. Il B43
  non l'aveva abbassato perché sotto il tabellone (160–308 px a 720×720) coprirebbe il campo lontano e la parte alta del
  riquadro di servizio evidenziato (293–345 px nella schermata). In `natpf-tennis/natpf-ui.css`, dopo le regole del
  riquadro (`:1993-2017`): `@container natpf (max-width: 800px) { .natpf-serve-coach[data-side="center"]:not([data-call]) {
  transform: translateX(calc(-50% + 4cqw)); } }`. A 720×720: +28,8 px → riquadro x 209–569, 17 px dal tabellone (192) e
  80 px dal pulsante della pausa (≈650); «Colpisci!» x 268–510. Le versioni dello stesso schermo (`data-side`,
  `data-call`) restano come sono (provate dalla `natpf-stesso-schermo-b20`). Alternativa del B43 se il coordinatore la
  preferisce: sotto il tabellone, `top: calc(clamp(12px, 6cqh, 64px) + 5.4 * clamp(17px, 3cqh, 40px))` come
  `.natpf-cue-hint` (`natpf-hud.css:1118-1120`), con il campo lontano coperto per i 4 s della scritta.
- **Dopo l'unione della B48** rifare la misura con i testi veri (la B48 aggiunge la riga `SERVE_CHOICE` a «Colpisci!» con
  il telefono: misurata qui iniettando il testo, coperta dalla correzione). Condizione perché 4cqw bastino: riquadro più
  largo ≤ 2·(54cqw − bordo destro del tabellone − 1cqw), cioè ≤ 364 px a 720×720; oggi tutti gli stati arrivano a 360 px
  (larghezza massima del riquadro in quell'area).
- **Test**: in `natpf-tennis/test/` un controllo sul testo del CSS (stile dei test B45.2: la regola esiste dentro
  `@container natpf (max-width: 800px)` per `.natpf-serve-coach[data-side="center"]:not([data-call])` con `translateX`) —
  fallisce prima; nel browser un
  controllo nuovo in `tools/e2e/natpf-tabellone.mjs` (dopo la partita contro la CPU che già apre, `:99-104`): riquadro
  `miss`, `wait` e `go` (con e senza la riga `SERVE_CHOICE` della B48) dipinti a 1920×1080, 1280×720, 1024×600, 800×600,
  720×720, 1920×540 e area 720: intersezione con `#natpf-scoreboard
  .sb-box` = 0 px² e riquadro dentro l'area (`bottom ≤ innerHeight`). Oggi a 720×720: 552 px² → rosso; accettazione: 0 px² e distanza dal tabellone ≥ 8 px a tutte le misure.

**(3) La diagnostica ferma la partita anche con `?diag=1`.**
- Oggi: `natpf_diag.js:47` (`this.on = …get('diag') === '1'`) e `:63` (`if (this.on) this._build()`): con `?diag=1` il
  pannello è aperto dall'avvio, quindi `staffOpen()` (`natpf_ui.js:254`) è vero e `_syncPause` (`:256-259`, ricalcolata
  ogni 100 ms `:209`) tiene ferma ogni partita finché non si chiude con «×». In alto si legge «Partita ferma finché la
  diagnostica è aperta: × per giocare» (`natpf_diag.js:111`, `:290-293`). È voluto dal B43 (commento `natpf_ui.js:207-208`).
- Cosa provoca: chi apre il gioco con `?diag=1` per registrare trova la partita ferma; `docs/NATPF_DIAGNOSTICA.md:16-20`
  dice ancora «Premi ● Avvia registrazione e gioca normalmente», senza «chiudi con ×»; `docs/GUIDA_STAND.md:843` dice solo
  «Modalità diagnostica (senza intro)».
- Correzione minima proposta: **solo documenti** (il comportamento è coerente con gli altri fogli dello staff):
  NATPF_DIAGNOSTICA.md passo 3 «Premi ● Avvia registrazione, chiudi il pannello con × (finché è aperto la partita resta
  ferma) e gioca»; GUIDA_STAND.md riga `diag=1` «… il pannello si apre all'avvio: la partita resta ferma finché non lo chiudi
  con ×». Nessun test di codice (la prova nel browser `natpf-pannello-partita.mjs:126-128` controlla già la scritta).

### 1c. Prova della Leggenda con il riferimento per lato — ESISTE ANCORA

- Dove: `tools/e2e/natpf-leggenda.mjs:161-169`. Il «posto normale» del piatto, della mano e della testa è **una mediana
  unica** degli impatti normali della CPU (palla a 0,3–0,8 m dal corpo), che mescola dritto (centro del piatto a 0,53–0,54
  m dal corpo) e rovescio (0,78–0,79 m). Secondo quanti dritti e rovesci capitano il riferimento va da 0,56 a 0,77 m, e un
  allungo di dritto confrontato con un riferimento quasi tutto di rovescio risulta «indietro» (esempio misurato nel B42:
  −0,05 contro il riferimento unico, +0,16 contro i soli dritti). Fonti: `docs/b42/scambi-lunghi.md:432-457`,
  `docs/PROJECT_MEMORY.md:951-954`, `docs/WORK_PROGRESS.md:1763-1779`.
- Cosa provoca: la prova `natpf-leggenda` passa una volta su tre (6/7 nelle altre due), sempre sulla stessa verifica
  («nell'allungo … piatto, mano e testa vanno verso la palla»), con e senza il B42: rumore nelle prove di ogni blocco che
  tocca la Leggenda (B48 compreso).
- Correzione minima (solo la prova, non la soglia): in `_executeOpponentReturn` (`:84-86`) salvare anche il lato del colpo
  nel record (`lato: s`, il segno della palla rispetto al corpo che `pose(s)` già usa: con la CPU destra è dritto da una
  parte e rovescio dall'altra); a `:163` calcolare `ref` per lato (mediana degli impatti normali con lo stesso `lato`);
  `judge(c)` usa `ref[c.lato]`; se un lato ha meno di 2 impatti normali usare la mediana unica **e scriverlo** nella riga
  («riferimento unico: pochi impatti di rovescio»). La riga a `:165` stampa i due riferimenti.
- Cosa resta anche dopo (dal B42, `:450-457`): l'allungo **corto in corsa** (palla a 1,05 m, CPU a 5,3 m/s): +0,03 invece
  di +0,05 anche con il riferimento per lato. È il disegno (`legendReachPose` in `natpf_legend.js`, che stima la distanza
  contando metà della velocità della CPU, e la racchetta di `racket_kinematics.js`, che nella corsa laterale va dalla parte
  opposta fino a 9 cm), non la prova: decisione aperta («sistemare o accettare»), fuori dal B50 se non la si prende.
- Test: è una prova nel browser; accettazione = 3 giri di `natpf-leggenda` uno alla volta, ognuno 7/7 oppure, se fallisce,
  solo per un allungo corto in corsa (palla < 1,15 m) con lato e riferimento stampati; prima della correzione rifare un giro
  con le righe nuove di stampa per vedere almeno un caso che cambia esito.

### 1d. Avviso della mano a 720×720 — CORRETTO DALLA B45.2; misurato: non resta niente

- Corretto in `natpf-tennis/natpf-ui.css:1475` (`body { overflow: clip; }`) e `:1477` (`html.natpf-area body { …
  overflow: clip; … }`), con il commento `:1470-1474`; test sul testo `natpf-tennis/test/natpf-b45-2-rifiniture.test.mjs:301-305`;
  prova nel browser `natpf-mano-sicura` con `AREA=720` 17/17 (prima 16/17). Causa trovata dalla B45.2: il fuoco sul nome in
  fondo alla pagina dei telefoni faceva scorrere il body (con `overflow: hidden` un riquadro che scorre) di 45 px e
  nell'area del ledwall il body è il riferimento degli elementi `fixed` (ha un `transform`).
- **Misura dell'analista** (`misure/b50-misure-scroll.mjs`, uscite `misure/b50-misure-scroll.txt` e
  `misure/b50-misure-scroll-split.txt`; pagina dei telefoni dello stesso schermo, fuoco sul nome del Player 2):
  - `html` ha `overflow: hidden` (`natpf-tennis/styles.css:23-27`), quindi il dubbio (b) «il body passa il suo overflow
    alla finestra» **non si applica**: il `clip` resta sul body;
  - **area del ledwall 720×720**: niente scorre, né con il fuoco su un campo messo apposta sotto il bordo, né da codice
    (`scrollingElement.scrollTop = 80` resta 0; altezza del documento 720): il caso della B45.2 è chiuso;
  - **finestra intera senza area** (720×720 e 1920×1080): la pagina vera non scorre (altezza del documento = altezza della
    finestra, `scrollTop` 0 dopo il fuoco sul nome); la finestra **può** scorrere solo se un elemento `position: absolute`
    con il riferimento sulla finestra esce dal bordo (campo di prova a `top: 130%`: la finestra scorre di 235 px a 720×720).
    Oggi nessun elemento del gioco lo fa; e senza area gli avvisi `fixed` restano comunque al loro posto.
- **Conclusione: niente da correggere nel B50.** Unica aggiunta proposta, piccola: in `tools/e2e/natpf-mano-sicura.mjs`, dopo
  il fuoco sul nome, `document.scrollingElement.scrollTop === 0` e `scrollHeight === innerHeight` (con e senza `AREA`), così
  un elemento futuro che fa scorrere la finestra si vede subito. Il revisore della B45.2 diceva «provato solo dal CSS»: con
  questa misura è provato anche nel browser (non intermittente: tre giri uguali in due script).

## 2. Prova del ritardo dello schermo per lo staff
### 2.1 Dove sta oggi il ritardo dello schermo e come entra nel giudizio «palla passata»

Catena di oggi (base `b0c8356`; `656f3dc` sul remoto aggiunge solo documenti):
- **Valore salvato**: `localStorage['natpf.displayLagMs']`, 0–200 ms, intero (`natpf-tennis/src/natpf/natpf_phone_racket.js:236-238`,
  `DISPLAY_LAG_KEY`, `readDisplayLagMs`, `writeDisplayLagMs`). Ogni telefono lo legge **alla nascita**
  (`natpf_phone_racket.js:451`, `this.displayLagMs = readDisplayLagMs()`).
- **Dove si imposta**: solo nella diagnostica (pannello dello stand → «Diagnostica», o Maiusc+D), riquadro chiuso
  `<details class="diag-lag">` con un campo numerico e «Salva» (`natpf-tennis/src/natpf/natpf_diag.js:216-218`); il clic
  chiama `saveLag()` (`:130-136`), che scrive il valore e lo mette in `engine.natpfPhone.displayLagMs` **solo del primo
  telefono** (il secondo lo tiene dalla nascita: lo corregge la B48, sotto). Tastierino a schermo per il campo:
  `natpf_tastiera.js:77` (`[data-lag]`, cifre). Il testo dice di misurarlo «con la prova guidata … o meglio con un video a
  240 fps»: oggi non esiste una prova del ritardo.
- **Diagnostica**: ogni sessione registra `gioco.ritardoSchermoMs` (`natpf-tennis/src/natpf/diag/diag_recorder.js:90`); il
  riassunto dà «Tempo dei colpi del telefono, mediana» e, oltre −40 ms su 20 colpi, l'ipotesi «misura il ritardo dello
  schermo» (`diag/diag_metrics.js:618`, `:660-661`).
- **Come entra nel colpo**: in `_onSwing` (`natpf_phone_racket.js:866`) `natpfSwingToEngine(s, { now:
  performance.now()/1000, displayLag: this.displayLagMs/1000, … })`; lì (`:276`) `latency = clamp(now − s.at +
  clamp(displayLag, 0, .2), 0, .3)`. `s.at` è il picco del gesto sul telefono portato sull'orologio del computer
  (`site/js/tennis/input-time.js:45-51` `phoneInputTime` con `clock.toLocal`, orologio tipo NTP sul viaggio più breve,
  `site/js/tennis/pairing.js:76-90`; `site/js/tennis/link.js:249-250`). Nel motore `eventLatency(e)` =
  `clamp(e.natpf.latency, −0,15, 0,3)` (`natpf_skill.js:296`).
- **Giudizio del tempo e «palla passata»** (`natpf-tennis/src/natpf/natpf_impact.js:406-436`, `queueUserSwing`):
  `lead = ttc + lat` (ttc = tempo all'impatto della palla **adesso**, lat = latenza sopra). Con `ttc < 0` (palla già oltre
  il punto d'impatto all'arrivo del messaggio) il colpo in ritardo vale se `lead ≥ −lateSpan·extra`, se la palla **al
  momento del gesto** (`ballAtGesture(b, lat)` = `pos − vel·max(0, lat)`, `:398-401`, usata a `:425`) non era oltre
  `IMPACT.lateBehind·extra + 0,2` m e se era a portata in x. La palla poi parte da dov'è adesso (`_attemptPlayerRallyStrike`),
  non da dove era.
- **Cosa vuol dire il valore** (ricavato dalla formula, controllato con la misura `misure/d16-schermo.txt`): chi gioca
  colpisce la palla che vede, cioè quella di `P + L` prima (P = disegno del computer, 1–2 fotogrammi; L = schermo o
  processore del ledwall), con il suo anticipo abituale `b` (diagnostiche vere: mediana +49 ms di anticipo,
  `docs/NATPF_RACCHETTA_VIRTUALE.md:118`). Allora `lead = −(P + L) + b + displayLag`: il valore giusto è quello che
  riporta `lead` a quello che si avrebbe su un monitor normale, cioè **il ritardo in più del ledwall rispetto a un monitor**
  (i tempi del gioco sono stati tarati da persone su monitor e televisori normali, P e L del monitor compresi).
  Impostarlo troppo alto sposta i colpi verso «in anticipo» (finestra «perfetto» di 0,07 s a Pro, `natpf_skill.js:25`).

### 2.2 Difetto 16 (B18): verifica sul codice di oggi — CHIUSO nel motore; la B48 chiude il secondo telefono

- **Codice**: presente come descritto in `docs/b18/r2-motore-piccolo.md:44-46` e `:199-220`: `ballAtGesture`
  (`natpf_impact.js:395-401`, solo latenza positiva) e il ramo `ttc < 0` di `queueUserSwing` (`:419-433`).
- **Test**: `natpf-tennis/test/natpf-b18-ritardo.test.mjs` (3 test: lead −0,02 con 130 ms a tutti i livelli, palla veloce
  e normale; limite «palla passata» non allargato; latenza negativa). Rifatti nella worktree dell'analista: **3/3 verdi**
  (2,8 s, carico 10).
- **Misura dell'analista sul motore vero** (`misure/d16-schermo.mjs`, uscita `misure/d16-schermo.txt`; modello: chi gioca
  colpisce la palla che vede, gesto nel motore a `ttc = leadVis − L`, rete T = 30 ms):
  - con il ritardo **impostato giusto** il colpo «a tempo per gli occhi» (`leadVis = 0`) è PERFETTO con tau ≈ 0 (|tau|
    ≤ 3 ms) a Casual, Pro e Leggenda, palla veloce (volo 0,6 s) e normale (0,85 s), per L = 0, 80 e 160 ms;
  - **non** impostarlo costa: palla veloce a Casual, primo ritardo ancora colpito −0,045 s con L = 80 (contro −0,09
    impostato) e +0,035 con L = 160 (cioè bisogna colpire 35 ms *prima* di quello che si vede); a Leggenda palla veloce
    con L = 160 non si prende più niente, nemmeno colpendo 50 ms prima di quello che si vede (`null`), a Leggenda palla normale −0,05 con L = 80 contro −0,13;
  - **limite che resta anche impostato**: con L = 200 ms il colpo a tempo per gli occhi su palla veloce è perso a tutti
    i livelli (il messaggio arriva 234 ms dopo il contatto e il punto è già finito, `misure/d16-perche.txt`: fase
    POINT_OVER) e con L = 160 basta un ritardo di 30 ms per perderlo (Casual e Leggenda, palla 0,6 s);
  - **la palla parte da dov'è**: con L impostato e colpo a tempo per gli occhi la palla è già oltre il punto d'impatto
    di 0,7 m (L 0), 2,4 m (L 80) e 4,0 m (L 160) quando riparte, palla veloce (`dietro0` in `d16-schermo.txt`). Sul
    ledwall, che mostra tutto L dopo, si vede la palla passare il personaggio e tornare indietro da 2–4 m dietro. È la
    scelta del B18 («senza riportarla indietro»); con un ritardo vero di 100–150 ms diventa visibile. **Non è nel B50**:
    va scritto nei rischi e portato al revisore finale (vedi §6).
- **B48 (ramo `b48-servizio`, in corso, non unito)**: `aa9b08f` «B48 passo 1» corregge `saveLag()` per tutti e due i
  telefoni (`for (const ph of [this.engine.natpfPhone, this.engine.natpfPhone2]) …`) e aggiunge
  `test/natpf-b48-ritardo.test.mjs` (6 livelli, Player 2 dello stesso schermo, catena 30 + 100 ms). Dopo c'è solo il commit
  «IN CORSO» `2750e73`. **Il B50 parte dopo l'unione della B48** e non deve rifare quella correzione: il salvataggio della
  prova (§2.5) passa da `saveLag()` (o dalla stessa funzione condivisa) così vale per i due telefoni. Se il B50 partisse
  prima, la correzione di `aa9b08f` va presa con `git cherry-pick` (due file, nessun conflitto atteso con il B50).
### 2.3 Progetto della prova di 20 s

**Dove.** Nella **diagnostica**, dentro il riquadro «Ritardo dello schermo» che c'è già (`natpf_diag.js:216-218`), non
nel pannello dello stand: il pannello non ha posto (a 1024×600 «Chiudi» finiva fuori vista, commento in
`natpf-tennis/index.html` sopra `.pause-grid`) e la diagnostica è già a un clic («Diagnostica» in alto a destra del
pannello, `data-staff="diag"`, `natpf_kiosk.js:206`). Il riquadro `<details class="diag-lag">` si apre da solo quando la
prova finisce, con il risultato.

**Percorso con il solo mouse.** Pannello dello stand (F9, Ctrl+Maiusc+K o 3 s sul marchio) → «Diagnostica» →
«Ritardo dello schermo: N ms» → **«▶ Prova del ritardo (20 s)»**. Con la diagnostica aperta la partita è ferma
(`natpf_ui.js:254-259`): la prova si fa anche a metà giornata senza chiudere niente.

**Cosa serve prima.** Un telefono collegato e pronto (`ui.phone.ready`, `natpf_phone_racket.js:553`; in alternativa il
Telefono 2, `engine.natpfPhone2`). Senza: pulsante spento e sotto «Collega il telefono e tocca «Attiva i sensori»: la
prova usa i suoi colpi». Durante la prova si usano solo i colpi di quel telefono.

**Cosa si vede sul ledwall** (strato nuovo `.natpf-lagtest`, figlio di `body`, `position: fixed; inset: 0`, sopra
`.natpf-diag` che ha z-index 200 in `natpf-flow.css:286`; misure in `cqw/cqh` dentro `@container natpf`, come chiede
CLAUDE.md; nell'area del ledwall il `body` è già il riferimento dei `fixed`, `natpf-ui.css:1477`):
- fondo scuro pieno (niente campo 3D dietro: il gioco è fermo e non serve), una linea di terra larga al 78% dell'altezza,
  una palla gialla grande (diametro 9cqh) che rimbalza **in verticale al centro**, con la sua ombra sulla linea che si
  stringe quando sale (aiuta a prevedere il contatto);
- in alto una riga: «Chi tiene il telefono: un colpo secco ogni volta che la palla tocca terra. Se la palla sparisce, non
  colpire.»; prima di partire «3 · 2 · 1» grandi (3 s, non contati nei 20 s);
- in basso una barra sottile del tempo che passa e «Colpi ricevuti: n» (solo il numero, **nessun voto** «presto/tardi»:
  il voto insegnerebbe a correggersi durante la prova);
- a destra «Annulla» (anche Esc o clic destro): torna alla diagnostica senza cambiare niente.
- Il disegno è un `canvas` 2D con il suo `requestAnimationFrame`; la posizione della palla a ogni fotogramma si calcola dal
  tempo del fotogramma (`performance.now()` del rAF), quindi il contatto disegnato coincide con il tempo del piano a meno
  di metà fotogramma. Dimensioni del canvas con `viewport()` di `natpf_screen.js` e `devicePixelRatio`. Peso: un cerchio,
  una linea, un'ellisse per fotogramma, niente asset.

**Il ritmo** (piano deterministico da un seme, funzione pura, §3 passo B50-3):
- 18 rimbalzi; intervallo tra due contatti a caso tra 0,8 e 1,4 s (la stessa «gravità» per tutti: altezza del rimbalzo
  `H = g'·T²/8` con `g'` tale che T = 1,4 s salga al 60% dell'altezza utile): il ritmo cambia sempre, ma ogni contatto
  si prevede guardando la caduta, come in partita (non è un tempo di reazione);
- i primi **3** sono di riscaldamento e non contano;
- **3 «palle che spariscono»** tra i rimbalzi misurati, mai due di fila e mai l'ultimo: arrivata in cima la palla si
  dissolve (100 ms) con l'ombra, e ricompare 0,15 s dopo il contatto mancato, già in salita verso il rimbalzo dopo (la
  caduta seguente si vede tutta);
- durata misurata sul prototipo: 18,6–22,8 s, mediana 20,4 s su 500 semi (`misure/lag-stima.txt`).
- Intervallo minimo 0,8 s > 600 ms di `recoverWindow` del rilevatore del telefono (`site/js/tennis/swing-detect.js:35`):
  il ritorno della mano viene scartato dal telefono come «in rientro», non arriva come colpo.

**Come si toglie l'anticipo** (la condizione del B16: le persone anticipano di suo, mediana +49 ms nelle diagnostiche
vere, `docs/NATPF_RACCHETTA_VIRTUALE.md:118`, e chi ha giocato sul ledwall ha imparato ad anticipare il suo ritardo):
1. **ritmo che cambia**: chi va a tempo «interno» sbaglia di centinaia di ms e finisce fuori dalla finestra o tra i fuori
   misura;
2. **palla che a volte sparisce**: chi colpisce anche quando la palla non arriva va a ritmo; con più di 1 colpo sui 3
   catch la prova è rifiutata («Hai colpito anche quando la palla spariva: guarda la palla, non il ritmo»). Nel
   prototipo: rifiutata 500 volte su 500 per chi va a ritmo;
3. **nessun voto durante la prova** e riscaldamento escluso;
4. **prova di riferimento sul monitor del computer**, facoltativa ma consigliata: la stessa persona fa la stessa prova
   con il gioco su un monitor normale (nel programma Windows: «Schermo del gioco» nel pannello porta il gioco sul monitor
   successivo, `natpf_kiosk.js:213` `cmd === 'display'`); il suo risultato è il «riferimento». Il valore da salvare è
   **ledwall − riferimento**: l'anticipo di chi prova, il disegno del computer (P) e il monitor su cui il gioco è stato
   tarato si tolgono (§2.1). Senza riferimento il valore proposto è il ritardo misurato così com'è, con l'avviso che
   comprende anche l'anticipo di chi prova (di solito qualche decina di ms in meno del vero).

### 2.4 Calcolo robusto del ritardo

Funzioni pure in un modulo nuovo `natpf-tennis/src/natpf/natpf_lag_measure.js` (prototipo provato:
`misure/lag-stima.mjs`):
- `LAG_TEST = { cycles: 18, warm: 3, catches: 3, tMin: .8, tMax: 1.4, win: [−.25, .45], minHits: 8, madK: 3, madFloor:
  .04, maxSpread: .07, maxCatchSwings: 1 }`;
- `lagPlan(seed)` → `{ seed, cycles: [{ i, T, touch, kind: 'warm'|'hit'|'catch' }], end }` (tempi in s dall'inizio);
- `estimateLag(plan, peaks)` con `peaks` = tempi dei picchi dei colpi (`s.at` portato sull'inizio della prova) →
  `{ ok, why, lagMs, spreadMs, hits, measured, dropped, catchSwings, stray }`:
  1. abbinamento: per ogni contatto il picco non ancora usato con `d = picco − contatto` dentro `[−250, +450] ms`, il più
     vicino al centro della finestra (secondo giro: il più vicino alla mediana del primo); un picco vale per un solo
     contatto;
  2. contano solo i contatti `hit` (riscaldamento escluso); i `catch` contano i colpi «a ritmo»;
  3. mediana `m0`, MAD·1,4826; tengo `|d − m0| ≤ max(3·MAD, 40 ms)` (fuori misura: colpi a caso, doppi, persi); di nuovo
     la mediana → `lagMs`; dispersione robusta `spreadMs` (MAD·1,4826 dei tenuti);
  4. prova **valida** solo con almeno 8 colpi tenuti (su 12 misurati), al più 1 colpo sui catch e dispersione ≤ 70 ms;
     altrimenti `why` = `'pochi'` | `'ritmo'` | `'irregolari'`, con la frase per lo staff (§2.5).
- Il valore proposto: `clamp(round5(lagMs − ref), 0, 200)` (`ref` = riferimento del monitor, 0 se non c'è); arrotondato a
  5 ms come il campo di oggi (`step="5"`).

**Quanto è preciso** (Monte Carlo sul prototipo, 2000 prove per riga, `misure/lag-stima.txt`):

| chi colpisce | valide | errore ≤ 20 ms | ≤ 30 ms | p90 |
|---|---|---|---|---|
| telefono simulato (σ 5 ms + campioni a 60 Hz), ritardo 80 o 160 ms | 100% | 100% | 100% | 4 ms |
| persona costante (σ 35 ms, 10% persi, 5% a caso), 80 ms | 97,5% | 87,1% | 97,4% | 22 ms |
| persona normale (σ 50 ms, 15% persi, 8% a caso), 80 ms | 85,3% | 70,4% | 86,9% | 33 ms |
| persona irregolare (σ 80 ms) | 41% (le altre «irregolari: rifai») | 48% | 65% | 53 ms |
| differenza ledwall − monitor, persona costante (anticipo ±50 ms a caso, uguale nelle due prove) | 94,8% | 70,1% | 88,5% | 32 ms |
| idem, persona normale | 69,2% | 53,7% | 72,6% | 48 ms |

Lettura: con il telefono simulato la prova ritrova il ritardo finto entro pochi ms; con una persona vera una prova sola
sta entro ±30 ms quasi 9 volte su 10 se la persona è costante. Per questo il pannello **tiene le ultime 3 prove valide
dello stesso tipo** (ledwall o monitor) e propone la loro mediana, e se due prove differiscono di più di 40 ms scrive
«Prove diverse tra loro: rifalla una volta». (Questi numeri vengono da un modello di persona, non da persone vere: §2.7.)

### 2.5 Proposta e salvataggio del valore; cosa vede lo staff

Alla fine dei 20 s lo strato mostra una scheda (testi in italiano, nessuna voce):
- valida: «Ritardo misurato: **135 ms** · 11 colpi su 12, regolarità ±28 ms». Con il riferimento: «Riferimento del
  monitor: 35 ms (oggi, 10:42) → ritardo del ledwall: **100 ms**». Senza: «Senza riferimento: il valore comprende anche
  l'anticipo di chi prova. Per un valore più giusto fai la stessa prova sul monitor del computer e segnala «Questa era
  sul monitor»». Se ci sono altre prove valide di oggi: «Ultime prove: 130 · 140 · 135 ms → 135 ms».
- pulsanti: **«Salva 100 ms»** (principale), «Rifai la prova», «Questa era sul monitor (riferimento)», «Chiudi senza
  salvare»;
- non valida: il motivo in una frase e «Rifai la prova» / «Chiudi»:
  - `pochi`: «Pochi colpi presi (6 su 12): il telefono deve fare un colpo secco a ogni rimbalzo»;
  - `ritmo`: «Hai colpito anche quando la palla spariva: guarda la palla, non il ritmo»;
  - `irregolari`: «Colpi troppo irregolari (±95 ms): rifai con un colpo corto e secco a ogni contatto».
- «Salva»: passa da `saveLag()` (o da una sua variante `saveLag(ms)` con il valore dato), cioè `writeDisplayLagMs` e
  `displayLagMs` di **tutti e due** i telefoni (correzione della B48), il sommario del riquadro aggiorna «Ritardo dello
  schermo: 100 ms» e il campo numerico; avviso «Ritardo dello schermo: 100 ms (colpi del telefono)» come oggi.
- «Questa era sul monitor»: salva il riferimento in `localStorage['natpf.displayLagRef']` = `{ ms, at }` e non tocca il
  ritardo; il riferimento vale per il giorno (più vecchio di 12 ore: ignorato e detto «riferimento di ieri: rifallo»).
- Le ultime prove: `localStorage['natpf.displayLagTests']` = al più 6 righe `{ at, kind: 'schermo'|'monitor', ms,
  spread, hits }` (solo questo computer, come il valore di oggi).
- Registro della diagnostica: `recorder.log('stand.provaRitardo', { seme, misuratoMs, riferimentoMs, salvatoMs, colpi,
  dispersioneMs, catch, motivo })` (anche quando non si salva), così una sessione registrata dice con che valore si giocava
  e da dove veniva.
- Annulla, Esc, clic destro o il telefono che cade durante la prova: si chiude lo strato, «Prova interrotta: niente
  salvato» e si torna alla diagnostica.

**Durante la prova i colpi non vanno al gioco.** In `NatpfPhoneRacket._onSwing` (`natpf_phone_racket.js:824`), subito
dopo il controllo del colpo arrivato troppo tardi (`:829-833`): `if (this.lagProbe){ this.lagProbe(s); return; }`. Così
il colpo non arriva al motore (nessun servizio o colpo che parte dietro lo strato) e **non insegna niente** ai modelli
del giocatore (`typicalModel`, `liftModel`, `faceModel`, `aimModel`, `riseModel`, `shapeModel`, `:876-889`): i colpi
secchi della prova non sono il colpo di chi gioca. La sonda si toglie alla fine in ogni caso (`finally`). Il chiosco
non azzera durante la prova perché la diagnostica resta aperta sotto lo strato (`natpf_kiosk.js:134`).

### 2.6 Prova nel browser con ritardo finto noto (80 e 160 ms, ±20 ms)

Prova nuova `tools/e2e/natpf-ritardo-schermo.mjs`, sullo stampo di `tools/e2e/natpf-latency.mjs` (vite + peer server
propri, telefono simulato con la pagina vera del telefono e il collegamento WebRTC vero; porte con `GAME_PORT` e
`PEER_PORT`, per l'analista e lo sviluppatore del B50 nel giro 4390–4399):
1. telefono collegato e pronto («Attiva i sensori»), diagnostica aperta dal pannello dello stand con il mouse
   (`[data-staff="diag"]`), riquadro del ritardo aperto, clic su «▶ Prova del ritardo (20 s)»;
2. il gioco espone la prova in corso: `__natpfTennis.natpfUi.diag.lagTest` = `{ seed, t0 (performance.now in ms), plan }`;
   la prova accetta il seme da `?lagseed=` per essere ripetibile;
3. lo script porta i contatti sull'orologio della pagina del telefono (`epoch = game.timeOrigin + t0 + touch·1000`,
   `telefono = epoch − phone.timeOrigin`: le due pagine sono nello stesso browser) e li dà al telefono simulato in un colpo
   solo; un piccolo «bot» nella pagina del telefono programma con `setTimeout` uno swing (`__up.swing(1, { peak: 900,
   dur: 240 })`, picco a metà) con il picco a **contatto + ritardo finto**, su tutti i contatti `hit` e `warm`, su nessun
   `catch`; registra in `window.__sentPk` il tempo vero del campione più alto (verità del giro, che sotto carico può
   slittare per i timer);
4. due giri, ritardo finto **80 ms** e **160 ms**, semi diversi; terzo giro **«a ritmo»**: colpi anche sui catch → prova
   rifiutata con la frase giusta e niente salvato; quarto giro «Questa era sul monitor» con 30 ms, poi 130 ms sullo
   schermo → proposta 100 ± 20 ms;
5. verifiche: prova valida; `|lagMs − 80| ≤ 20` e `|lagMs − 160| ≤ 20`; `|lagMs − mediana(sentPk − contatto)| ≤ 10`
   (separa l'errore della prova da quello dei timer della macchina); «Salva» → `localStorage['natpf.displayLagMs']` = valore
   proposto e `natpfPhone.displayLagMs` uguale; nessun colpo arrivato al motore durante la prova
   (`__natpfTennis.natpfPhone.typicalModel.seen.length` invariato e nessun `strike`/servizio: `engine.phase` invariata);
   nessun errore nella console delle due pagine;
6. schermate (con `SHOTS=1`): strato a metà prova e scheda del risultato a 1920×1080, 1280×720, 1024×600, 720×720 e
   1920×540 (area del ledwall come in `natpf-mano-sicura` con `AREA=…`): palla e scritte intere, «Annulla» e «Salva» in
   vista, niente scorrimento.

Il test di unità (§4) prova le stesse cose sul calcolo senza browser: ritardi 0, 80, 160, 200 ms con rumore finto noto.

### 2.7 Cosa resta da provare con il ledwall vero (non possibile qui)

- **Persone vere**: quanto sono costanti (σ) con un colpo secco a ogni rimbalzo; se il «colpo secco» del telefono fa un
  picco vicino al contatto visto (nel tennis il picco della rotazione cade poco prima o al contatto); quante prove sono
  valide al primo colpo. I numeri della §2.4 sono di un modello.
- **Il ritardo vero del ledwall** non è misurato da nessuno (`docs/b16/rapporto-gameplay.md:369`). Controllo
  indipendente consigliato una volta: video a 240 fps che riprende insieme il telefono e il ledwall durante la prova
  (contare i fotogrammi tra il contatto sul ledwall e il colpo), confrontato con il risultato della prova.
- **Canvas 2D contro WebGL**: la prova disegna con un canvas 2D, il gioco con WebGL; nello stesso browser passano dallo
  stesso compositore, ma una differenza di un fotogramma (16 ms) non è esclusa. Si vede solo con il video a 240 fps.
- **Monitor duplicato o esteso** nel PC dello stand: la prova di riferimento richiede di portare il gioco sul monitor
  del computer («Schermo del gioco», solo programma Windows) o un monitor qualsiasi; da provare sul PC vero.
- **Il limite che resta** (§2.2): anche con il ritardo giusto, oltre 160 ms su palla veloce il margine per il colpo in
  ritardo è quasi zero e la palla riparte da 2–4 m dietro il personaggio. Lo si vede solo sul ledwall vero.

## 3. Passi di sviluppo (ordine, file:riga, test che falliscono prima, accettazione)

Regole comuni: un passo = un commit verificato (test del gioco e del sito verdi; build se tocca `site/` o il gioco), push
subito, Checkpoint e `docs/WORK_PROGRESS.md` aggiornati (CLAUDE.md). Testi in italiano, nessuna voce nuova, misure in
`cqw/cqh` dentro `@container natpf`, misure JS con `viewport()`. Nessun asset. Porte del browser del B50: 4390–4399.

**B50-0 · Partenza (dopo l'unione della B48).**
- `git fetch origin natpf-simulator`; la B48 deve essere unita (porta `saveLag` per i due telefoni, `aa9b08f`, e cambia
  `natpf_serve_coach.js`, `natpf_legend.js`). Ramo nuovo `b50-ritardo` da `natpf-simulator`, worktree propria, `npm ci`.
- Base da scrivere nel Checkpoint: `npm test` (alla 14.4: 1623/1623, più i test della B48), sito (269/269 alla 14.4), LAN,
  desktop, build. Rifare le due misure dell'analista sulla base unita (`misure/b50-misure-720.mjs` copiato in
  `tools/e2e/` solo nella worktree, non nel commit): se il riquadro del servizio non tocca più il tabellone, il passo
  B50-2 si riduce al solo controllo nella prova del tabellone.

**B50-1 · Blocco dell'orientamento del telefono (pulizia 1a).**
- `site/js/tennis/racchetta.js:697`: `screen.orientation?.lock?.(…)` → `window.screen.orientation?.lock?.(…)`;
  `:516` (`sendDevice`): `or: window.screen.orientation?.type || null`, `sc: [window.screen.width, window.screen.height, …]`;
  `:72`: commento «screen = la schermata della pagina (phoneView); lo schermo del telefono è window.screen».
- Test che fallisce prima: `tools/test/b50-pulizie.test.mjs` come descritto in §1a (sorgente vero in `vm`, finto
  `window.screen` con `lock` spia): oggi `lock` mai chiamato, `or: null`, `sc[0] === undefined`.
- Prove nel browser: `natpf-tutorial-phone` (52/52 alla 14.x: invariata) con il controllo nuovo della spia su
  `ScreenOrientation.prototype.lock` (≥ 1 chiamata con `'portrait'` dopo «Attiva i sensori»; oggi 0) e `tel.dispositivo`
  con `screen[0] > 0`; `gesture-calibration.mjs` (rotazione del viewport, `:124-126`): resta verde.
- Accettazione: test nuovo verde e rosso sulla base; sito tutto verde; le due prove nel browser verdi.
- Da scrivere nella guida e nel riepilogo all'utente: «sui telefoni Android a schermo intero la pagina resta in verticale
  durante il gioco» (non provato su un telefono vero).

**B50-2 · Istruzioni del servizio a 720×720 (pulizia 1b-2).**
- `natpf-tennis/natpf-ui.css` dopo `:2017`: la regola delle aree strette con `translateX(calc(-50% + 4cqw))` (§1b-2).
- Test che fallisce prima: in `natpf-tennis/test/natpf-b45-2-rifiniture.test.mjs` o in un file nuovo
  `natpf-tennis/test/natpf-b50-pulizie.test.mjs`, controllo sul testo del CSS (la regola dentro `@container natpf
  (max-width: 800px)`).
- Prova nel browser: `tools/e2e/natpf-tabellone.mjs`, controlli nuovi (§1b-2) a sette misure e quattro scritte; oggi a
  720×720 552 px² di sovrapposizione in tre scritte su quattro. Accettazione: 0 px² e ≥ 8 px dal tabellone ovunque, riquadro dentro l'area; schermate 720×720 (finestra
  e area) guardate.

**B50-3 · «Parità» e «Vantaggio» nella pillola del tabellone (pulizia 1b-1; scelta di prodotto, proposta: sì).**
- `natpf-tennis/src/natpf/natpf_scoreboard.js:36-40` `scoreTag(gamesToWin, { decisive, deuce, adv })`: con `deuce` (non
  fair) `{ text: 'Parità', kind: 'deuce' }`, con `adv` `{ text: 'Vantaggio', kind: 'adv' }`; `:149` passa `deuce:
  !!pts.deuce && !score.fair`, `adv: !!pts.adv`. CSS: nessuna regola nuova: `.sb-tag` (`natpf-round.css:493`) è già
  l'aspetto del formato e solo `[data-sb-tag="decisive"]` (`:509`) è rosa; `data-sb-tag` viene da `kind`
  (`natpf_scoreboard.js:167`).
- Test che fallisce prima: `natpf-tennis/test/natpf-scoreboard.test.mjs` (§1b-1). Il testo per lo screen reader resta
  quello di oggi («Vantaggio tuo», `label`).
- Prova nel browser: `natpf-tabellone.mjs` con il punteggio a 40-40 e a vantaggio (`setScore`, `:69`): la pillola dice
  «PARITÀ» / «VANTAGGIO», dentro il riquadro a 1920×1080, 720×720 e 1920×540 (larghezza ≤ quella del riquadro, come la
  prova fa per «PUNTO DECISIVO»). Schermate guardate.
- Se il coordinatore non lo vuole fare: niente codice, la domanda va nel riepilogo finale all'utente (due possibilità).

**B50-4 · Diagnostica con `?diag=1` (pulizia 1b-3): solo documenti.**
- `docs/NATPF_DIAGNOSTICA.md:16-20` passo 3: «Premi ● Avvia registrazione, chiudi il pannello con × (finché è aperto la
  partita resta ferma) e gioca»; `docs/GUIDA_STAND.md:843` riga di `diag=1`: «il pannello si apre all'avvio: la partita
  resta ferma finché non lo chiudi con ×». Nessun test (la scritta è già provata da `natpf-pannello-partita.mjs:126-128`).

**B50-5 · Prova della Leggenda con il riferimento per lato (pulizia 1c).**
- `tools/e2e/natpf-leggenda.mjs:84-86` (record dell'impatto con `lato`), `:161-169` (riferimento per lato, ripiego
  dichiarato sotto 2 impatti). Dopo l'unione della B48 (che cambia la Leggenda: al più una smorzata ogni 8 colpi).
- Accettazione: 3 giri uno alla volta, ognuno 7/7, oppure il solo fallimento ammesso è un allungo corto in corsa (palla
  < 1,15 m) con lato e riferimento stampati. Prima della correzione un giro con le sole righe nuove di stampa.

**B50-6 · Calcolo della prova (funzioni pure).**
- File nuovo `natpf-tennis/src/natpf/natpf_lag_measure.js`: `LAG_TEST`, `lagPlan(seed)`, `estimateLag(plan, peaks)`,
  `ballY(plan, t)` (altezza 0…1 della palla al tempo t, `null` quando è sparita), `proposeLag({ lagMs, refMs, recent })`
  (arrotondato a 5, 0–200, mediana delle ultime 3 dello stesso tipo), `lagReason(why, numbers)` (le frasi della §2.5).
  Base: il prototipo `misure/lag-stima.mjs` (da riscrivere pulito; l'abbinamento a due giri della §2.4).
- Test nuovi `natpf-tennis/test/natpf-b50-ritardo-prova.test.mjs` (tutti falliscono prima perché il modulo non c'è):
  1. piano: 18 contatti, 3 di riscaldamento, 3 catch non vicini e non ultimi, intervalli 0,8–1,4 s, durata 18–23 s su
     200 semi, stesso seme = stesso piano;
  2. `ballY`: 0 al contatto (±1e−9), massimo a metà intervallo, `null` tra la cima di un catch e 0,15 s dopo il suo
     contatto;
  3. ritardi finti 0, 80, 160, 200 ms con rumore finto noto (σ 5 ms, generatore con seme): `|lagMs − vero| ≤ 10` su 200
     semi ciascuno;
  4. persona simulata σ 35 ms, 10% persi, 5% a caso: valida ≥ 95% e `|errore| ≤ 30 ms` ≥ 95% delle valide (dal Monte
     Carlo: 97,5% e 97,4%);
  5. colpi anche sui catch → `why: 'ritmo'`; 6 colpi su 12 → `'pochi'`; σ 120 ms → `'irregolari'`;
  6. 2 colpi fuori misura (+400 ms, −200 ms) non spostano il risultato di più di 5 ms;
  7. `proposeLag`: 135 − 35 → 100; negativo → 0; 260 → 200; mediana di 130/140/135 → 135; riferimento più vecchio di 12 h
     ignorato.

**B50-7 · I colpi della prova non vanno al gioco.**
- `natpf-tennis/src/natpf/natpf_phone_racket.js:824-833`: dopo il controllo del colpo troppo vecchio,
  `if (this.lagProbe){ try { this.lagProbe(s); } catch (e){ console.error(e); } return; }`; metodo
  `probeSwings(fn){ this.lagProbe = fn; return () => { if (this.lagProbe === fn) this.lagProbe = null; }; }`.
- Test che fallisce prima (in `natpf-b50-ritardo-prova.test.mjs`, con `new NatpfPhoneRacket(…)` e il motore finto come in
  `natpf-tennis/test/natpf-b46-lato-sicuro.test.mjs` o `natpf-integration.test.mjs`): con la sonda attiva un colpo arriva alla sonda con il suo `at`, **non** arriva al
  motore (`mc._emitSwing` mai chiamato) e non cambia `typicalModel.seen.length`; tolta la sonda tutto come prima.

**B50-8 · Lo strato della prova e la diagnostica.**
- File nuovo `natpf-tennis/src/natpf/natpf_lag_test.js`, classe `NatpfLagTest({ ui, engine, now = () => performance.now(),
  raf = requestAnimationFrame })`: `start({ seed, phone })`, `cancel(why)`, `get running`, `plan`, `t0`, `result`; disegno
  sul canvas; sonda sul telefono scelto; alla fine `estimateLag` e la scheda; «Salva» → `diag.saveLag(ms)`.
- `natpf_diag.js`: `:216-218` aggiunge «▶ Prova del ritardo (20 s)» (spento senza telefono pronto, con la frase), il
  riquadro mostra «Ultime prove» e il riferimento; `:130-136` `saveLag(ms = null)` accetta il valore (senza: dal campo come
  oggi); `:108-109` comando `lagtest` nel dizionario dei clic; espone `this.lagTest` per le prove.
- CSS nuovo (in `natpf-flow.css`, vicino a `.natpf-diag` `:282-340`): `.natpf-lagtest` `position: fixed; inset: 0;
  z-index: 205` (sopra la diagnostica, 200, e sotto il pulsante «● REC», 210, `natpf-flow.css:438`; da controllare che la calibrazione dello schermo resti sopra), testi in `cqh` con minimo e massimo come
  gli altri fogli, scheda centrata `max-width: min(820px, 90cqw)`.
- Registro: `recorder.log('stand.provaRitardo', …)` (§2.5).
- Test (falliscono prima): con `now`/`raf` finti e il telefono finto: la prova finisce dopo `plan.end` + 3 s di conto alla
  rovescia; con colpi finti a contatto + 120 ms la scheda propone 120 (senza riferimento) e 100 con riferimento 20; «Salva»
  scrive `natpf.displayLagMs` = 100 e `displayLagMs` di tutti e due i telefoni; «Annulla» e il telefono che cade a metà:
  niente salvato, sonda tolta; con la prova in corso `ui.staffOpen()` resta vero (partita ferma) e il chiosco non azzera.
- Accettazione: tutti i test del gioco verdi; nessun errore in console nelle prove sotto.

**B50-9 · Prove nel browser della prova del ritardo.**
- `tools/e2e/natpf-ritardo-schermo.mjs` (§2.6). Accettazione: ritardo finto 80 → 80 ± 20 ms, 160 → 160 ± 20 ms, e
  `|risultato − verità del giro| ≤ 10 ms`; giro «a ritmo» rifiutato; monitor 30 + schermo 130 → proposta 100 ± 20;
  «Salva» scrive il valore; nessun colpo al motore; nessun errore in console. Tre giri di fila verdi (macchina carica:
  scrivere il carico con `uptime`).
- Aggiunta a `tools/e2e/natpf-mano-sicura.mjs` (§1d): dopo il fuoco sul nome `scrollTop === 0` e `scrollHeight ===
  innerHeight`, con e senza `AREA=720`.

**B50-10 · Documenti, versione, pacchetti.**
- `docs/GUIDA_STAND.md`: capitolo «Prova del ritardo dello schermo» (quando farla: a ogni montaggio del ledwall; chi: una
  persona che non ha appena giocato su quel ledwall; come: riferimento sul monitor, poi ledwall, con il solo mouse; cosa
  vuol dire il numero; «Annulla»). `docs/NATPF_DIAGNOSTICA.md` (riquadro del ritardo). `docs/PROJECT_MEMORY.md`: decisione
  «valore = ledwall − riferimento; senza riferimento il misurato», formula della §2.1, blocco dell'orientamento acceso.
  Documento del blocco `docs/b50/ritardo-e-pulizie.md` con misure, cosa non è provato e le domande per il riepilogo finale.
- Versione nuova (`site/js/tennis/version.js`, `site/tennis/build.json`), zip Cloudflare e installer come da
  `docs/PIANO_LAVORI.md` §6 (il blocco cambia `site/` e il gioco).

## 4. Elenco delle prove (unità, browser, schermate)

**Test di unità nuovi** (tutti rossi sulla base, verdi dopo):
| file | cosa | passo |
|---|---|---|
| `tools/test/b50-pulizie.test.mjs` | `lockOrientation` e `sendDevice` usano lo schermo vero (spia `lock('portrait')`, `or`, `sc`) | B50-1 |
| `natpf-tennis/test/natpf-b50-pulizie.test.mjs` | regola CSS del riquadro del servizio nelle aree strette | B50-2 |
| `natpf-tennis/test/natpf-scoreboard.test.mjs` (aggiunte) | pillola «Parità» / «Vantaggio» / «Punto decisivo» / formato | B50-3 |
| `natpf-tennis/test/natpf-b50-ritardo-prova.test.mjs` | piano, `ballY`, stima con ritardi finti 0/80/160/200 ms (±10), persona simulata, rifiuti, fuori misura, proposta | B50-6 |
| idem | sonda dei colpi: niente motore, niente apprendimento | B50-7 |
| idem | strato con tempo finto: durata, proposta 120 / 100 con riferimento, «Salva» sui due telefoni, «Annulla», telefono che cade, partita ferma | B50-8 |

Test esistenti da tenere verdi e da guardare in particolare: `natpf-b18-ritardo`, `natpf-b48-ritardo` (dalla B48),
`natpf-diag`, `natpf-b45-2-rifiniture`, `tools/test/b46-lato-sicuro.test.mjs` (cerca `{ screen, phase, trial }` nel
sorgente di `racchetta.js`: con la correzione minima non cambia), `tools/test/stand-phone.test.mjs`.

**Suite complete** a ogni passo che tocca il codice: gioco `npm test`, sito `node --test tools/test/*.test.mjs`, LAN, desktop;
build (`npm run build`) nei passi B50-1, B50-2, B50-3, B50-8.

**Prove nel browser** (una alla volta, porte 4390–4399, carico scritto):
| prova | perché | accettazione |
|---|---|---|
| `natpf-ritardo-schermo` (nuova) | la prova del ritardo dall'inizio alla fine | §2.6: 80 ± 20, 160 ± 20, verità ± 10, ritmo rifiutato, riferimento, salvataggio, niente al motore |
| `natpf-tutorial-phone` (+ spia del blocco) | B50-1 | come oggi + `lock('portrait')` ≥ 1 volta, `screen[0] > 0` |
| `gesture-calibration` | il viewport girato mostra ancora «Il telefono si è girato» | verde |
| `natpf-tabellone` (+ servizio e pillola) | B50-2, B50-3 | 0 px² e ≥ 8 px a sette misure e quattro scritte; pillola dentro il riquadro |
| `natpf-stesso-schermo-b20` | il riquadro dello stesso schermo non cambia | 52/52 |
| `natpf-leggenda` × 3 | B50-5 | 7/7 o solo allungo corto in corsa, con lato e riferimento stampati |
| `natpf-mano-sicura` con e senza `AREA=720` | §1d | come oggi + `scrollTop` 0 |
| `natpf-pannello-partita` | la diagnostica ferma ancora la partita | come oggi |
| `natpf-diag-session` | la diagnostica registra ancora (nuova riga `stand.provaRitardo`) | come oggi |
| `natpf-latency` | la sonda non cambia il percorso dei colpi fuori dalla prova | come oggi |
| `natpf-solo-mouse`, `natpf-menu` | pannello e diagnostica con il solo mouse | come oggi |

**Schermate da guardare** (in `$OUT`):
- prova del ritardo: conto alla rovescia, palla a metà caduta, palla «sparita», scheda valida con e senza riferimento,
  scheda rifiutata (`ritmo`), a 1920×1080, 1280×720, 1024×600, 720×720 (finestra e area), 1920×540: palla e scritte intere,
  «Salva» e «Annulla» in vista, contrasto sul fondo scuro;
- servizio contro la CPU a 720×720 (finestra e area): riquadro del lancio a vuoto staccato dal tabellone (oggi:
  `misure/servizio-miss-720x720.png`, tocca);
- tabellone a 40-40 e a vantaggio: «PARITÀ», «VANTAGGIO» a 1920×1080, 720×720, 1920×540;
- diagnostica con il riquadro del ritardo aperto: pulsante della prova, «Ultime prove», riferimento.

## 5. Misure fatte dall'analista (con script) e cose non misurate

Tutte nella worktree staccata `prep/b50/wt` (base `b0c8356`), script e uscite in `prep/b50/misure/`. Carico della macchina
durante le misure: da 7,4 a 22,7 (`uptime`; due agenti di sviluppo al lavoro).

| misura | script | risultato |
|---|---|---|
| difetto 16 con il ritardo dello schermo, motore vero senza grafica | `d16-schermo.mjs` → `d16-schermo.txt` (4,5 s) | ritardo impostato giusto: colpo a tempo per gli occhi PERFETTO (\|tau\| ≤ 3 ms) fino a 160 ms; non impostato: margine perso (es. Casual palla veloce −0,045 invece di −0,09 con 80 ms; Leggenda palla veloce nessun colpo con 160 ms); con 200 ms colpo perso anche impostato; palla che riparte 0,7 / 2,4 / 4,0 m dietro il punto d'impatto con 0 / 80 / 160 ms |
| perché si perde con ritardi grandi | `d16-perche.mjs` → `d16-perche.txt` | il messaggio arriva 192–263 ms dopo il contatto; con 160 ms e 30 ms di ritardo il punto è già finito (POINT_OVER) a palla veloce |
| test del difetto 16 | `node --import ./test/register.mjs --test test/natpf-b18-ritardo.test.mjs` | 3/3 verdi |
| stima robusta del ritardo (prototipo e Monte Carlo) | `lag-stima.mjs` → `lag-stima.txt` (1,2 s) | durata 18,6–22,8 s; telefono simulato: errore p90 4 ms; persona σ 35 ms: 87% entro ±20, 97% entro ±30; σ 50 ms: 70% / 87%; chi va a ritmo rifiutato 500/500 (tabella in §2.4) |
| riquadro del servizio contro la CPU e tabellone, sei misure | `b50-misure-720.mjs` → `b50-misure-720.txt`, schermate `servizio-*.png` (1 min 32 s, porta 4390) | a 720×720 (finestra e area) il riquadro del lancio a vuoto copre il tabellone di 12×46 px; altrove nessuna sovrapposizione |
| idem con il testo della B48, lo stato «Aspetta che salga…», 800×600 e le due correzioni iniettate | `b50-misure-720b.mjs` → `b50-misure-720b.txt` (porta 4392, carico 20–22) | oggi a 720×720 tre stati su quattro coprono 12×46 px (anche con la riga della B48); con «un poco a destra» 0 px² ovunque, distanza minima 17 px; con «sotto» 0 px² ma 6 px / 1 px di distanza |
| scorrimento con il fuoco sul nome (B45.2) | `b50-misure-scroll.mjs` → `b50-misure-scroll*.txt` (porta 4391) | area 720: niente scorre, nemmeno da codice; finestra intera: pagina vera non scorre (altezza documento = finestra), scorre solo con un elemento messo apposta fuori dal bordo |

**Non misurato** (e perché):
- telefoni veri (blocco dell'orientamento su Android e iPhone, picco del «colpo secco» rispetto al contatto visto): non ci
  sono telefoni qui;
- persone vere nella prova del ritardo: la precisione della §2.4 viene da un modello (σ, persi, a caso);
- il ritardo vero di un ledwall o di un televisore, e la differenza canvas 2D / WebGL: servono il ledwall e un video a
  240 fps;
- la prova nel browser della prova del ritardo: non esiste ancora (la scrive lo sviluppatore, §2.6); i ±20 ms del browser
  sono attesi dal prototipo (errore p90 4 ms) più i timer della pagina del telefono sotto carico, non misurati;
- `natpf-leggenda` (1c): non rifatta dall'analista (macchina carica e la B48 cambia la Leggenda: va rifatta dopo l'unione);
- la «Parità» nella pillola: larghezza di «VANTAGGIO» nel riquadro non misurata (la misura la fa la prova del tabellone).

## 6. Rischi e decisioni aperte

**Rischi**
1. **Blocco dell'orientamento acceso** (B50-1): cambia il comportamento sui telefoni veri (Android a schermo intero:
   pagina sempre verticale durante il gioco; rotazione in più se si tocca «Attiva i sensori» con il telefono in
   orizzontale). Era il disegno del 21/10 e del commento a `racchetta.js:691-696`; non provato su telefoni veri. Se allo
   stand desse fastidio: togliere `lockOrientation`, non lasciarlo spento per sbaglio.
2. **Prova del ritardo con persone vere**: precisione stimata da un modello; con una persona irregolare la prova si rifiuta
   spesso (σ 80 ms: 59% rifiutate). Mitigazione: mediana delle ultime 3 prove, avviso se due prove differiscono di più di
   40 ms, guida «colpo corto e secco».
3. **Senza riferimento il valore è più basso del vero** (comprende l'anticipo di chi prova, mediana +49 ms nelle diagnostiche
   vere): è la direzione sicura (sottocompensare lascia il gioco come oggi; sovracompensare darebbe colpi «in anticipo»),
   ma va detto nella scheda e nella guida.
4. **Adattamento di chi ha giocato sul ledwall**: ritmo che cambia, palle che spariscono e nessun voto tolgono l'anticipo
   «a tempo»; l'anticipo imparato e costante resta e lo toglie solo il riferimento fatto dalla stessa persona. Guida: farla
   fare a chi non ha appena giocato su quel ledwall.
5. **I colpi della prova non devono insegnare niente** al profilo del giocatore: la sonda esce prima dei modelli
   (`natpf_phone_racket.js:876-889`); test B50-7. Se la sonda restasse attiva per errore il telefono non giocherebbe più:
   tolta in `finally`, alla caduta del telefono e ad «Annulla» (test B50-8).
6. **Ritardi grandi (oltre 160 ms)**: anche con il valore giusto il colpo appena in ritardo su palla veloce si perde e la
   palla riparte da 2–4 m dietro il personaggio, visibile sul ledwall (§2.2). Non è nel B50; il valore della prova va
   comunque salvato (fino a 200 ms). Da portare al revisore finale come punto aperto: «riportare la palla al punto
   d'impatto quando il colpo è giudicato in tempo con il ritardo dello schermo».
7. **Dipendenza dalla B48**: `saveLag` per i due telefoni (`aa9b08f`), testi del servizio (B50-2: rifare la misura), Leggenda
   (B50-5: rifare i giri). Il B50 parte dopo l'unione della B48. **Da dire al coordinatore subito**: la riga nuova della B48
   sotto «Colpisci!» (`SERVE_CHOICE`) a 720×720 copre il tabellone di 12×46 px (misurato iniettando il testo nel riquadro di
   oggi, `misure/b50-misure-720b.txt`); se il revisore della B48 non lo fa correggere lì, lo corregge B50-2.
8. **Carico della macchina** nelle prove nel browser: i timer della pagina del telefono slittano; la prova
   `natpf-ritardo-schermo` confronta anche con la «verità del giro» (picchi davvero inviati) per non confondere la prova
   con la macchina.
9. **Pacchetti**: il blocco cambia `site/` e il gioco: versione nuova, zip Cloudflare e installer, provati estratti.

**Decisioni aperte** (il coordinatore può prenderle da solo, istruzione dell'utente del 14/11; vanno scritte nel riepilogo
finale):
- D1. Accendere davvero il blocco dell'orientamento (proposta: sì, era il disegno; da togliere se dà fastidio).
- D2. «Parità» e «Vantaggio» nella pillola del tabellone (proposta: sì, stessa pillola, nessun CSS nuovo; altrimenti
  domanda all'utente con le due possibilità).
- D3. Riquadro del servizio a 720×720: un poco a destra (proposta, non copre il campo) o sotto il tabellone (copre il campo
  lontano per 4 s).
- D4. `?diag=1` che ferma la partita: tenere il comportamento e correggere solo i documenti (proposta).
- D5. Prova del ritardo nella diagnostica, non nel pannello dello stand (proposta: il pannello non ha posto a 1024×600).
- D6. Riferimento sul monitor facoltativo, con l'avviso (proposta) o obbligatorio (più giusto, ma allo stand può mancare un
  secondo monitor).
- D7. Palla che riparte da dietro con ritardi grandi (rischio 6): fuori dal B50, al revisore finale.
- D8. Leggenda, allungo corto in corsa (+0,03 invece di +0,05 anche con il riferimento per lato, B42): accettare o
  sistemare (`legendReachPose`): fuori dal B50 se non la si prende.

