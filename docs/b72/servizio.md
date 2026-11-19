# B72 · Servizio: la casella «Al servizio» lampeggia e, dopo 3 s fermi, un alone attorno allo schermo

Ramo `b72-servizio` (worktree del workflow), base `b71-int` (`65a263b`, correzioni B71 già unite). Prodotto: **FIERA**
(di base, `docs/PRODOTTI_FIERA_E_ONLINE.md` §3: la voce nel registro la segna l'agente principale).

Richiesta dell'utente (19/11, testuale): «rendere lampeggiante il box che dice che devi battere (al servizio) + aggiungi un
alone pulsante attorno allo schermo (in singolo e in doppio nell'area specifica del player che deve servire) se passano 3
secondi».

## Cosa si vede adesso

| Momento | Prima | Adesso |
|---|---|---|
| Batte chi gioca su questo computer, in posizione di servizio (`SERVE_STANCE`) | casella gialla «Al servizio» ferma sopra di lui | la casella **lampeggia a 1 Hz**: un lampo di luce (la casella diventa giallo chiaro quasi bianco) con un anello giallo che si allarga e svanisce; fondo, scritta, bordo scuro e posizione sono quelli di prima |
| Resta fermo senza lanciare per **3 s** | niente (l'icona del lancio a 6 s, il richiamo per nome a 9 s nello stesso schermo) | in più un **alone giallo che pulsa** (1 Hz) ai margini interni dell'area di gioco; icona e richiamo per nome restano come prima |
| Lancia la palla (`SERVE_TOSS`) | casella ferma | casella di nuovo **ferma**, alone **via subito** |
| Lancio a vuoto, di nuovo in posizione | – | lampeggia di nuovo; l'alone dopo altri 3 s fermi |
| Batte la CPU, o il giocatore dell'altro computer (sfida tra due computer) | casella ferma | **uguale a prima**: casella ferma, niente alone |
| Stesso schermo (due metà) | casella ferma in tutte e due le metà | lampeggia **solo la casella della metà di chi batte** (quella dell'altra metà, che dice «batte lui», resta ferma); l'alone **solo attorno alla sua metà** (P1 sinistra, P2 destra) |
| Doppio contro la CPU (una vista) | – | come il singolo: batte la squadra di chi gioca → lampeggio e alone attorno a tutta l'area; batte la squadra della CPU → niente |
| Sfida tra due computer | – | sul computer di chi batte lampeggio e alone (tutta l'area); sull'altro niente |
| Pausa (menu della pausa, tutorial, telefono da ricollegare, pannelli dello staff), fine punto, menu, moviola | – | niente lampeggio, niente alone; alla ripresa il lampeggio torna subito e l'alone di nuovo solo dopo 3 s fermi |
| Allenamento (anche l'esercizio «Servizio»), minigiochi, scambi di prova | – | **niente** (decisione sotto) |
| Movimento ridotto (impostazione del sistema) | – | stessa indicazione **più lenta e morbida** (2,4 s, lampo più leggero, alone tra 55 % e 90 %), non spenta |

## Dove sta e come è fatto

- **Logica**: `natpf-tennis/src/natpf/natpf_serve_alert.js` (nuovo).
  - `SERVE_HALO.afterS = 3` (costante esportata).
  - `serveAlertView(g, idle)` funzione pura → `{ blink, halo, half }`. `g` è la fotografia del gioco che già calcola
    `NatpfServeCoach.snapshot()` (B18/B44): `mine` (chi batte gioca da questo computer: la CPU mai, il giocatore
    dell'altro computer mai, nello stesso schermo tutti e due), `drill` (allenamento), `split`, `server`, `paused`,
    `replay`, `phase`. `idle` è il tempo fermo in posizione di servizio del coach (`serveCoachStep`), che riparte da zero a
    ogni nuova fase. `blink` solo in `SERVE_STANCE` di un giocatore umano di questo computer in partita; `halo` quando
    `idle ≥ 3`; `half` = `'p1' | 'p2'` nello stesso schermo (la metà di chi batte), `null` a una vista.
  - `NatpfServeAlert.paint(v)`: tocca la pagina **solo quando lo stato cambia** (a ogni fotogramma solo il confronto di una
    chiave di tre caratteri). La classe `serve-blink` va su `#server-tag` (una vista) o su `#server-tag-p1/-p2` (stesso
    schermo); l'alone è `#natpf-serve-halo`, creato la prima volta come **primo figlio di `#hud-root`**, con
    `data-half` nello stesso schermo. Le caselle dello stesso schermo nascono al primo disegno diviso
    (`natpf_split.js`, dopo il passo del gioco): finché la casella manca si riprova al fotogramma dopo.
- **Collegamento**: `natpf_serve_coach.js` crea l'`alert` e lo aggiorna in `tick()` con la stessa fotografia e lo stesso
  `idle`; nuovo `hold()` (partita ferma: lampeggio e alone via, `idle` a zero). `natpf_ui.js` `_syncPause()` chiama
  `serveCoach.hold()` quando la partita si ferma.
- **Stile**: `natpf-tennis/natpf-servizio.css`, sezione «B72».
  - Casella: `.nt-server-tag.serve-blink { animation: natpf-serve-blink 1s ease-out infinite }`: si animano solo
    `filter` (`brightness(1.35) saturate(0.55)` al lampo) e le ombre (le prime due sono quelle di sempre, poi un anello
    giallo da 6/14 em che si allarga a 18/14 em e svanisce, e un bagliore giallo). Misure in `em`: la casella cresce con lo
    schermo (14–24 px, `natpf-hud.css`), quindi anche l'anello è più grande sul ledwall. **Niente scala e niente fondo che
    cambia**: la casella resta dov'è (le prove della posizione del B37.1 la misurano) e il fondo resta `#E8FF3A`.
  - Alone: `position: absolute; inset: 0` dentro `#hud-root` (che sta nel `body` = contenitore `natpf` = area del
    ledwall), `pointer-events: none`, `z-index: auto` e primo nella pagina → tabellone, caselle, scritte, riquadro del
    coach e banner gli stanno sopra. Bordo pieno `inset 0 0 0 var(--halo-w)` + sfumatura interna 5×, con
    `--halo-w: clamp(4px, min(0.8cqw, 1.2cqh), 18px)` (13 px a 1920×1080, 5,8 px nell'area 720×720). Stesso schermo:
    `[data-half="p1"] { right: 50.2cqw }`, `[data-half="p2"] { left: 50.2cqw }` (le metà di `splitViewports`:
    0–956 e 964–1920 px a 1920). Si anima solo `opacity` (0,3 ↔ 1), con `will-change: opacity`: lavoro della scheda
    grafica, nessun ridisegno della pagina.
  - `@media (prefers-reduced-motion: reduce)`: `natpf-serve-blink-soft` e `natpf-serve-halo-soft`, 2,4 s.
  - Niente `vw/vh`, niente `@media` per le misure.

## Decisioni prese

1. **Solo in partita.** Nell'allenamento (anche l'esercizio «Servizio», che ha già la sua scheda e l'icona del lancio a
   ogni servizio), nei minigiochi e negli scambi di prova niente lampeggio e niente alone: lì chi gioca sta facendo un
   esercizio guidato, non c'è una partita che aspetta. Stessa regola del coach (`inMatch`).
2. **Stesso schermo: lampeggia solo la casella della metà di chi batte.** La casella c'è in tutte e due le metà; quella
   nella metà dell'altro dice «batte lui» e resta ferma, così il lampeggio vuol dire sempre «tocca a te».
3. **La pausa rimette a zero il tempo fermo** (`serveCoach.hold()`). Con la partita ferma il motore non chiama `tick` e il
   conto riprendeva da dove era: l'alone sarebbe tornato subito alla ripresa. Era già l'intenzione scritta nel coach
   (`!g.paused` in `serveCoachStep`); ora vale davvero. Effetto anche sull'icona del lancio (6 s) e sul richiamo per nome
   dello stesso schermo (9 s): dopo una pausa ricontano da zero.
4. **Prima persona**: la casella sopra di sé non c'è (B35b/B37.1), quindi non c'è niente che lampeggi; l'alone sì (stesse
   regole). Il lampeggio non è stato aggiunto all'icona in basso al centro della prima persona.
5. **Lampeggio senza scala**: per «scala/bordo» c'è l'anello che si allarga, non la casella che si ingrandisce (la
   posizione sopra la testa, verificata dal B37.1 al pixel, resta identica).
6. Il lampeggio e l'alone non si sincronizzano fra loro (partono ognuno al suo cambio di stato); tutti e due a 1 Hz.

## Prove (19/11, worktree)

- **Gioco** `cd natpf-tennis && npm test`: vedi il risultato in fondo (nuovo file
  `test/natpf-b72-servizio-alone.test.mjs`, **9 test**): funzione pura (lampeggio subito, alone a 2,99 s no / 3 s sì, metà
  P1/P2, mai con CPU/altro computer/lancio/scambio/fine punto/fine partita/menu/pausa/moviola/allenamento), dalla
  fotografia del coach (CPU, doppio, sfida tra due computer host e Player 2, stesso schermo, esercizio «Servizio»,
  minigiochi, scambi di prova, menu, dimostrazione, moviola, pausa), tempo fermo del coach (2,98 s no, 3 s sì, lancio e
  CPU lo azzerano, `hold()` lo azzera), pagina finta (nessuna scrittura in 100 fotogrammi con lo stesso stato, casella
  giusta, alone primo figlio di `#hud-root`, metà, si riprova finché la casella dello stesso schermo manca), **motore vero
  senza grafica** (lampeggio subito; alone quando l'idle passa 3 s, nella finestra 2,85–3,05 s di gioco dal passo in cui
  l'idle era 0,09 s; via al lancio; mai con la CPU al servizio ferma 4 s), stile (niente vw/vh, 1 Hz, cqw/cqh, metà, movimento ridotto 2,4 s non spento, niente `background` nel
  lampeggio, `_syncPause` chiama `hold`).
- **Sito e telefono** `node --test tools/test/*.test.mjs`: **308/308**.
- **Build** `npm run build`: ok (12,2 s; con `public/assets` preso dal checkout principale con un link temporaneo, tolto
  dopo; nessun file nuovo nel ramo).
- **Browser** `CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/natpf-servizio-alone.mjs` (nuovo, porta 3174):
  **27/27**. Gioco vero (vite), Classici, mouse; passi del gioco a mano (tempi esatti) salvo l'ultimo caso:
  - contro la CPU, batte chi gioca: `serve-blink` con animazione `natpf-serve-blink` 1 s in corso, fondo
    `rgb(232, 255, 58)`; alone assente a idle 2,03 s, presente a 3,25 s: rettangolo 0,0–1920×1080, primo figlio di
    `#hud-root`, `pointer-events: none`, `z-index: auto`, prima di `#top-hud-bar`, dei due tabelloni,
    `#world-labels-layer`, `#natpf-serve-coach`, `#center-banner-layer`; al lancio casella ferma e alone via;
  - pausa con l'alone acceso: via subito, idle 0; ripresa: lampeggia a 0,52 s senza alone, alone a 3,33 s;
  - «Torna al menu»: via (e `#hud-root` nascosto); batte la CPU (ferma 4 s): casella ferma, niente alone;
  - doppio: batte chi gioca → lampeggio + alone a tutta l'area; batte la squadra della CPU → niente;
  - computer del Player 2 (ruolo p2, senza rete): batte lui → lampeggio + alone; batte l'host → niente;
  - stesso schermo: batte Giulia (P1) → lampeggia solo `server-tag-p1`, `server-tag-p2` visibile e ferma, alone
    0–956 px; batte Marco (P2) → solo `server-tag-p2`, alone 964–1920 px;
  - area del ledwall `?area=0,0,720,720` in una finestra 1920×1080: alone 0,0–720×720 (contro la CPU) e 0–359×720 (stesso
    schermo, P1): sta nell'area, non nella finestra;
  - movimento ridotto: `natpf-serve-blink-soft` e `natpf-serve-halo-soft`, 2,4 s, in corso;
  - ciclo vero del gioco (rAF → `_natpfFrame` → `update` → coach, senza il disegno 3D che con la grafica in software del
    banco costa secondi a fotogramma): 57 campioni ogni 50 ms; ultimo senza alone a idle 2,976 s, primo con l'alone a
    idle 3,026 s (2,95 s dall'inizio della misura, quando l'idle era già 0,147); nessun campione con l'alone prima dei 3 s;
    la casella lampeggia in tutti i campioni prima.
  - nessun errore nelle pagine.
- **Schermate guardate** (deviceScaleFactor 1, animazioni ferme al lampo e all'alone pieno, in
  `$OUT/servizio-alone/`): `alone-2-singolo-3s-1920.png` (bordo giallo luminoso su tutti e quattro i lati dell'area,
  tabellone «TU/CPU» e pulsante di pausa sopra l'alone e leggibili, casella «AL SERVIZIO» giallo chiaro con l'anello e il
  bagliore gialli, icona del lancio a sinistra); `alone-7-stesso-schermo-p1/p2-1920.png` (alone solo sulla metà di chi
  batte; nella sua metà la casella con il lampo, nell'altra la casella gialla piena ferma sopra il giocatore lontano;
  tabelloni delle due metà sopra l'alone); `alone-8-casella-lampo-vicino.png` e `alone-8-casella-ferma-vicino.png` (stessa
  casella al lampo e ferma: si vede la differenza di luce e l'anello); `alone-3-pausa-1920.png` (menu della pausa, niente
  alone); `alone-4-batte-la-cpu-1920.png` (casella ferma sopra la CPU, niente alone); `alone-9-area-720-cpu.png` (alone
  dentro il riquadro 720×720); `alone-10-movimento-ridotto-1280.png` (alone più tenue, casella ferma in quell'istante).

## Cosa NON è verificato

- **Ledwall vero** (lettura da lontano del lampo e dell'alone, colori del pannello LED), **telefono vero**, **Windows**
  (programma Electron 45: stesso Chromium moderno, `filter` e `box-shadow` animati non provati lì), schermi con GPU vera
  (il costo è stato guardato solo con la grafica in software: l'alone anima solo l'opacità, la casella è piccola).
- La lettura «da lontano» del lampo è giudicata solo dalle schermate: il lampo cambia la luce della casella e aggiunge un
  anello giallo di circa mezza casella; se in fiera non basta, si può rendere più forte (più bianco, anello più grosso)
  cambiando solo i fotogrammi chiave di `natpf-serve-blink`.
- Non provati nel browser: allenamento/esercizio «Servizio», minigiochi, scambi di prova e moviola (coperti dai test del
  gioco sulla fotografia del coach e sulla funzione pura); sfida tra due computer con la rete vera (provata con il ruolo
  del Player 2 sullo stesso motore, come `natpf-chi-serve`).
- `tools/e2e/natpf-chi-serve.mjs` (posizione e aspetto della casella del B37.1) e `natpf-stesso-schermo-b20.mjs`: vedi
  il risultato in fondo.
