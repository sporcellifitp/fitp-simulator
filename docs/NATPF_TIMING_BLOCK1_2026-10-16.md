# Blocco 1 — contatto e sincronizzazione

Il campo rimane sul computer; lo smartphone è la racchetta. Il portrait riguarda il controller. Il riferimento Nintendo Switch Sports Tennis guiderà il POV rialzato nel blocco camera, dopo la conferma di questo blocco.

## Correzioni

- `tennis/main.js`, `tennis/input-time.js`: il ricevitore host confronta secondi di partita con secondi di partita. Prima confrontava il timestamp dell'ospite con `performance.now()` in millisecondi, spostando gli swing in un tempo errato. Le code sono limitate; timestamp non finiti, troppo vecchi o futuri sono scartati.
- `tennis/link.js`: conserva il picco originale del sensore entro la cronologia visiva di 3 secondi (la finestra di input resta limitata a 800 ms di partita); elimina il taglio a 350 ms che spostava artificialmente i gesti tardivi su fotogrammi successivi. I picchi troppo vecchi o futuri sono scartati.
- Gli swing sono associati alla cronologia dei fotogrammi effettivamente presentati, sia in locale sia sull'ospite. Un blocco del rendering non fa avanzare artificialmente il tempo attribuito a una palla ferma sullo schermo.
- `match/contact.js`, `match/arcade.js`, `tennis/sweet-spot.js`: un unico modello di contatto usa posizione e velocità relative. Il piano della racchetta è a 1 m davanti al giocatore, con riferimento laterale a 0,7 m. Il verde richiede portata, altezza utile, legalità dello scambio e scarto temporale entro 60 ms.
- La cronologia contiene insieme palla e giocatori. Un impatto verde viene risolto nello stato storico corrispondente, anche durante la corsa. La tolleranza di consegna resta aperta dall'ultimo fotogramma giocabile: non può prolungarsi dopo un secondo rimbalzo invalidante.
- `tennis/net.js`: gli snapshot aggiungono velocità del giocatore e legalità del contatto, mantenendo la lettura degli snapshot precedenti. Il tempo della vista si ferma quando si ferma l'estrapolazione. Dopo pausa/riconnessione si attende uno snapshot fresco e si riparte con la stima dell'orologio azzerata.
- `tennis/scene.js`: anello ancorato alla zona racchetta, colore valutato con lo stesso modello del motore. Fase d'impatto allineata allo 0,43 del modello (129 ms su 300 ms). Il feedback animato parte alla conferma del contatto, mentre il giudizio conserva l’istante storico: un pacchetto tardivo non può far terminare l’animazione prima che venga mostrata. Questo non sostituisce il successivo lavoro sul rig e sull'aderenza delle corde alla palla.

## Verifiche riproducibili

```bash
node --test tools/test/*.test.mjs
npm install --prefix tools/e2e --no-audit --no-fund
node tools/e2e/node_modules/playwright-core/cli.js install --with-deps chromium
node tools/e2e/run-local.mjs phone-only.mjs timing-browser.mjs
```

- Suite Node: 54 test, comprendenti le 42 regressioni precedenti.
- La griglia di contatto copre 48 combinazioni: due lati, corsa automatica attiva/disattiva, 30/60/120 FPS, ritardi di 0/60/180/320 ms.
- Altre 12 combinazioni verificano gli snapshot interpolati a 30 Hz, ritardo snapshot di 40 ms, vista arretrata di 140 ms e consegna input dopo ulteriori 120 ms.
- Casi mirati: timestamp non finiti e unità errate, cronologia interpolata, pausa, ripartenza dell'orologio, secondo rimbalzo e assenza di input desktop.
- Il test browser usa pacchetti di sensore normalizzati e stati di scambio riproducibili: non misura la qualità del riconoscimento del gesto fisico o i permessi dei sensori di un telefono reale.

## Limiti e prova richiesta

La finestra di accettazione degli input è al massimo 800 ms; la cronologia conserva 900 ms. La tolleranza effettiva di chiusura del punto dipende anche dalla latenza stimata della sessione. Un recupero tardivo può rendere visibile la correzione della posizione della palla: non si promette continuità perfetta con latenze estreme. La geometria del personaggio è ancora procedurale; il vincolo mano/manico/corde verrà trattato nel blocco animazioni.

Prova sul dispositivo reale, prima di proseguire:

1. Computer + telefono, contro CPU: colpire durante il verde su dritto e rovescio, anche dopo la corsa automatica; verificare che il feedback non sia sistematicamente «Anticipo».
2. Ripetere dopo una pausa e una ripresa.
3. Due computer con due telefoni: verificare lo stesso comportamento sul secondo giocatore, poi mettere in pausa dall'host e riprendere.
4. Segnalare un eventuale caso residuo con modalità, dispositivo/browser, fase del colpo e possibilmente un breve video dello schermo.

Questo checkpoint attende la conferma dell'utente. Non sono ancora implementati mira continua, nuovo POV, nuovo skill gap, calibrazione portrait e revisione completa delle animazioni. Nessun merge su main o deploy fa parte del blocco.
