# B13 · Prova `gesture-calibration.mjs` instabile sui runner lenti

Data: 07/11/2026. Branch di lavoro `b13-gc` (base `be91ec1`). File toccati: `tools/e2e/gesture-calibration.mjs`,
`tools/e2e/README.md`, questo documento. Nessun cambiamento al gioco né alla pagina del telefono.

## Sintomo

Su GitHub Actions (ubuntu-latest, GPU software) la prova falliva a intermittenza sempre nello stesso punto,
`gesture-calibration.mjs:73`, aspettando il contatto del servizio: `page.waitForFunction: Timeout 15000ms exceeded`.
Diagnostica della CI (run 42400304390, e uguale nei run 42376190304, 42274534607, 42274522893, 42269308699,
42233511982, 42382700016, 42367695527): fase `serve`, `toss: null`, `contacts: []`, due gesti ricevuti (il primo ha
lanciato la palla, il secondo, seq 2, picco 117, `vert: 'up'`, `sentLat` 189 ms, è arrivato). In locale passava.

## Come funzionava la prova

1. Punto deterministico: batte il giocatore vero (`c.score.server=0; c.setupPoint()`).
2. Primo movimento verticale del telefono simulato → `toss` (lancio della palla).
3. Un aggancio su `S.render` riconosce il fotogramma con la palla in cima (età del lancio vicino a `TOSS_APEX`) e
   ferma la partita con `A.netPause = true` (in un `setTimeout(0)`), per non dipendere dai tempi di Playwright.
4. Secondo movimento del telefono; quando il computer l'ha ricevuto, `A.netPause = false` e si aspetta il contatto.

## Riproduzione in locale

Variante di sola diagnostica (nello scratchpad, non nel repository) con la CPU frenata via CDP
(`Emulation.setCPUThrottlingRate`) su computer e telefono dall'inizio del servizio:

| Variante | Freno CPU | Esito |
|---|---|---|
| prova di prima | nessuno | 18/18 (gesto 0,565 s dopo l'apice) |
| prova di prima | ×4 | fallita (gesto 1,209 s dopo l'apice), stesso quadro della CI |
| prova di prima | ×6 | fallita (gesto 0,828 s dopo l'apice) |
| prova di prima, ciclo | ×4 | 0 superate su 5, tutte al punto della CI (riga 73) |
| prova di prima, secondo gesto ritardato di 1,5 s | nessuno | 0 superate su 2 |

Il quadro del fallimento è identico a quello della CI: `phase: 'serve'`, `toss: null`, `contacts: []`, due gesti, e
nel registro degli eventi del motore un `tossCaught` subito dopo la ripresa.

## Causa

`main.js` associa ogni gesto al fotogramma che si vedeva quando è stato fatto (`presented`, `input-time.js`):
`presented.seenAt(at)` scarta un gesto il cui istante è più di `INPUT_TIME.maxAge` (0,8 s) dopo l'ultimo
fotogramma registrato. I fotogrammi si registrano solo se `!A.netPause`. Con la pausa della prova l'ultimo fotogramma
registrato resta quello dell'apice; se il secondo gesto arriva più di 0,8 s dopo, al rilascio il gesto è scartato,
il motore riparte, la palla ricade (`tossCaught`: fase di nuovo `serve`, `toss` null) e il contatto non arriva mai.

Misure (computer, `performance.now`):

- con la GPU software un fotogramma del computer costa ~0,45 s (il JavaScript di `render()` 2 ms; anche con la tela a
  320 × 240 ~0,4 s): il `setTimeout(0)` che metteva la pausa partiva solo ~0,45–0,8 s dopo il fotogramma dell'apice;
- il secondo gesto arrivava 0,565 s dopo l'apice in locale senza freno (margine di soli 0,23 s), 0,83–1,21 s con la
  CPU frenata; sulla CI (macchina ~1,6 volte più lenta in questo tratto: 9,0 s contro 5,7 s tra «drop» e «first
  vertical») oltre 0,8 s.
- l'orologio stimato tra telefono e computer è esatto (errore 0,1 ms, viaggio minimo < 1 ms): non c'entra.

**Non è un difetto del gioco.** Nel gioco vero `A.netPause` si toglie solo dai percorsi di ripresa (amico che
rientra, collegamento ritrovato, pausa del telefono finita), e ognuno chiama `resetInputTimeline()`, che scarta di
proposito i colpi fatti in pausa («Never ... count paused wall time»). La prova usava la pausa come fermo immagine e
contava su un gesto fatto in pausa: un comportamento che il gioco non garantisce.

## Correzione (solo nella prova)

Fermo immagine all'apice senza pausa di rete:

- `core.update` avvolto: con `__hold` il motore avanza con `dt = 0` (tempo di gioco fermo, palla in cima);
- `S.render` avvolto: durante il fermo non si ridisegna, la tela continua a mostrare il fotogramma dell'apice
  (schermata `serve-apex-hold.png`: battitore con il braccio alzato, palla in alto, «Ora colpisci quando la palla è in
  cima»); senza lavoro per la GPU software il ciclo del computer gira a ~16 ms (mediana 16 ms, massimo 60 ms con la
  CPU ×4) e `presented` registra di continuo il fotogramma dell'apice;
- il secondo gesto passa per la catena vera (pagina del telefono, collegamento, `controls`, `presented.seenAt`,
  `addSwing`, `updateToss`, `serveShot`) e vale per la palla che si vede in cima qualunque sia il ritardo di
  Playwright: con la CPU ×4 e una schermata in mezzo il gesto è arrivato 1,073 s dopo l'apice e ha colpito
  «perfetto» (timing −0,028);
- il contatto si aspetta durante il fermo (30 s di attesa massima, nessuna scadenza nel gioco), poi il gioco riparte
  e si controlla che il telefono torni in `play`.

Le verifiche restano le stesse: il servizio parte dal primo movimento del telefono, il secondo colpisce il fotogramma
dell'apice (|età − apice| < 0,12 s, |timing| < 0,15 s), il telefono torna all'input dello scambio. L'esito della
verifica ora stampa età, timing e distanza del gesto dall'apice. La diagnostica in caso di errore è più compatta
(eventi del lancio con tempi, gesti con istante, arrivo e ritardo).

## Verifiche

Con la variante di sola diagnostica (stesso freno via CDP dal servizio in poi, `loop.sh` nello scratchpad):

| Prova | Freno CPU | Esito |
|---|---|---|
| prova di prima | ×4 | 0/5 (tutte ferme al contatto del servizio, diagnostica identica alla CI: picco 117, `vert: 'up'`, `sentLat` 181 ms) |
| prova nuova | ×4 | **12/12** consecutive (timing −0,028, età all'apice 0,500) |
| prova nuova | ×6 | **5/5** consecutive |
| prova nuova, secondo gesto ritardato di 1,5 s | nessuno | 3/3 (gesto 2,08–2,09 s dopo l'apice, timing −0,025/−0,028) |
| prova nuova, secondo gesto ritardato di 1,5 s | ×4 | 2/2 (gesto 1,63–1,65 s dopo l'apice) |
| prova di prima, tutto su un core (`taskset -c 0`) con un processo che lo occupa al 100% | — | 0/2 (ferme al contatto del servizio) |
| prova nuova, stesso core occupato | — | **3/3** (18/18, ~100 s a run) |

Con il file vero del repository: 3/3 senza freno (18/18 ciascuna, gesto 0,57–0,60 s dopo l'apice) e 2/2 con
`CPU_THROTTLE=4` (18/18, gesto 0,12 s dopo l'apice). `node --test tools/test/*.test.mjs`: 195/195. Il gioco
(`natpf-tennis`) e il codice del sito non sono toccati.

Non verificato: un run vero su GitHub Actions (nessun push da questo ramo); la prova sulla CI resta da guardare dopo
l'integrazione.

## Rischio residuo

Il primo movimento (quello che lancia la palla) si gioca con il gioco in movimento e il disegno normale: se un
fotogramma del computer costasse più di 0,8 s, il gesto potrebbe cadere nella stessa finestra di `seenAt`. Nei 8 run
falliti della CI il primo gesto è sempre passato; in locale i fotogrammi sono ~0,45 s.

## `timing-browser.mjs` («P2 timing still correct after shared pause»)

Non è la stessa causa: nessuna pausa coinvolta nel punto che fallisce. Nei run della CI ci sono due quadri:

- 4 run (42389216842, 42382700016, 42368842186, 42367695527): fallisce «P1: real host loop accepts phone contact»,
  `received: []`: il colpo del finto telefono (nella stessa pagina, via PeerJS) non diventa mai un evento `swing`;
- 1 run (42394865431): fallisce «P2 timing still correct after shared pause», il colpo è arrivato al collegamento del
  P2 2,56 s dopo il suo picco (`at` 97,88, arrivo 100,444) e non è mai stato inoltrato all'host.

Riprodotto in locale con la CPU ×4 su tutte le pagine (variante di sola diagnostica che registra anche gli eventi
`dropped` del collegamento): 2 run su 2 falliti a «P2: interpolated green -> phone -> guest -> host callback» con
`received: []` e `dropped: [{ reason: 'istante del colpo non valido', path: 'reliable' }]`, colpo arrivato 3,5–3,7 s
dopo il picco; i fotogrammi della pagina erano a ~1,2–1,3 s l'uno (come nella CI: `now − frameT` 1,26 s). Senza freno
8/8. Causa: con due pagine WebGL sulla GPU software il messaggio del finto telefono, che parte e arriva nella stessa
pagina con il thread principale occupato, ci mette più di 2,5–3 s; il gioco scarta giustamente un colpo così vecchio
(`phoneInputTime` oltre `INPUT_TIME.presentationAge`, 3 s, oppure `presented` che non ha più il fotogramma di allora).
Non è il fermo della prova né un difetto del gioco; resta da sistemare a parte nella prova (per esempio meno pagine
WebGL attive insieme, o tela più piccola anche per la pagina che non si giudica). Non toccato in questo lavoro.
