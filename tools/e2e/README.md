# Prove nel browser: NATPF Simulator

Avviare il sito statico in un terminale dalla root del repository:

```bash
python -m http.server 8765 -d site
```

Installare le dipendenze di test una volta:

```bash
cd tools/e2e
npm install
```

Eseguire dalla cartella `tools/e2e`:

- `node run-local.mjs phone-only.mjs timing-browser.mjs gesture-calibration.mjs` — avvia sito e signaling locali, verifica il timing CPU/P1/P2 nel browser, incluse pausa e ripresa. Input sensori normalizzati; non sostituisce la prova fisica.
- `node phone-only.mjs` — rebranding, pairing, rifiuto input mouse/tastiera e accettazione dello swing telefono.
- `node phone-cal.mjs` — pairing QR, calibrazione e partita con telefono simulato.
- `node phone-failures.mjs` — permessi/sensori, swing insufficienti, disconnessione e signaling.
- `node invite.mjs` — partita tra amici.

Le prove con `devicemotion` sintetico non sostituiscono le prove su iPhone Safari e Android Chrome reali. Prima di ogni release eseguire anche `node --test ../../tools/test/*.test.mjs` dalla root del repository e verificare [l'audit completo](../../docs/NATPF_SIMULATOR_AUDIT.md).


`gesture-calibration.mjs` verifica la nuova calibrazione compatta e la prova del colpo, il controllo touch, portrait e il vincolo della racchetta con eventi sintetici.
Il servizio a due movimenti si prova con un fermo immagine all'apice del lancio (motore con `dt = 0`, tela non ridisegnata, fotogramma dell'apice registrato come presentato) e non con `A.netPause`: in pausa il gioco non registra i fotogrammi presentati e scarta i gesti arrivati più di 0,8 s dopo l'ultimo (`INPUT_TIME.maxAge`), per questo prima la prova falliva a intermittenza sui runner lenti. `CPU_THROTTLE=4 node run-local.mjs gesture-calibration.mjs` frena computer e telefono via CDP dal servizio in poi, come un runner lento. Analisi: [docs/b13/gesture-calibration-ci.md](../../docs/b13/gesture-calibration-ci.md).


Arcade/LAN: `node run-local.mjs arcade-visuals.mjs` controlla camera, smash, scie e articolazione; `node lan-browser.mjs` avvia il proprio server LAN e verifica WebRTC diretto, dopo `npm ci --prefix ../lan`. I test si trovano nella matrice GitHub Actions insieme a timing e calibrazione.

NATPF motore base (`natpf-tennis/`):
- `node natpf-phone-upright.mjs` avvia da solo vite (porta 3108) e PeerJS (9108) e prova il telefono simulato con la presa del gioco (verticale): link del QR, calibrazione rapida, dritti con il polso che ruota (mai pallonetti), pallonetto con la mano che sale, piatto girato a destra/sinistra → palla a destra/sinistra. Prende il posto di `natpf-flat-grip.mjs` (presa orizzontale, non più offerta). Su Windows usa Chrome installato (`CHROMIUM_PATH`).
- `node natpf-1v1-p2p.mjs` (dopo la build di `natpf-tennis`): sfida un amico sul sito statico con due sessioni del browser e WebRTC. Prova:
  - l'invito già in vista nella pagina della racchetta;
  - il P2 che entra scrivendo il codice;
  - la riga di stato (in attesa → entrato → pronto) e «Sono pronto»;
  - la partita con il servizio di tutti e due, l'uscita e il rientro del P2 con il link;
  - la stanza chiusa, il link inesistente, l'avviso sul telefono;
  - la rete che blocca il collegamento diretto: candidati ICE riscritti su un indirizzo irraggiungibile, poi rete libera.
- `node natpf-1v1-webcam-p2.mjs` (dopo la build): Player 2 dell'invito con la webcam finta di Chromium. Prova il pannello
  della webcam del P2 (accensione, anteprima, «Cerco la mano…»), la prova in campo in locale con la mano vista
  (simulata), «Salta» → pronto da solo, la webcam spenta in partita detta all'host, la webcam negata. `NOSHOT=1` salta le
  schermate: con il disegno WebGL software acceso per gli scatti il collegamento diretto può cadere per qualche secondo.

  `DIST=cartella` per provarla su uno zip estratto.
- `node natpf-gameplay-23-10.mjs` (3183, 9183): i difetti di gioco della sera del 23/10 nel gioco vero con il telefono simulato: risposta al servizio da fondo campo, messaggio di fine punto (chi vince, chi ha sbagliato), moviola dell'ultimo punto, palla corta ripresa a rete a Leggenda, «In rete» negli scambi lunghi.
- `node natpf-gesti-speciali.mjs` (3184, 9184): pallonetto e palla corta con il telefono mosso da un braccio fisico (presa di taglio, telefono dritto, gesti di polso): calibrazione, esercizi del lanciapalle che imparano il proprio gesto, partita con pallonetti, palle corte e dritti letti giusti.
- `node natpf-training-flow.mjs` (vite 3109, PeerJS 9109): «Allenamento» dal menu con il telefono simulato: gesto nel verso sbagliato, quattro gesti della calibrazione con la palla ferma dal lato del gesto chiesto, giocatore fermo, stesso gesto sui due schermi (con il ritardo del computer a ogni cambio), primo esercizio. `SHOTS=1` salva le schermate del computer.
- `node natpf-training-reconnect.mjs` (3111, 9111): pagina del telefono ricaricata a metà calibrazione → «Telefono scollegato» sul computer, sensori riattivati → calibrazione che riparte e finisce.
- `node natpf-phone-blackout.mjs` (3117, 9117): collegamento che cade e torna (messaggi fermati nelle pagine, canale aperto): il telefono se ne accorge da solo e si ricollega, la calibrazione si riallinea alla ripresa, durante gli esercizi pausa con il pannello del telefono e ripresa automatica.
- `node natpf-rally.mjs` (3151, 9151; `DIFF=pro|casual|leggenda`, con le regole del livello dal B16, `SHOTS=1` per i fotogrammi all'impatto e durante il recupero, `CPU_SHOTS=n` per i primi n fotogrammi all'impatto della CPU): scambio vero contro la CPU con il telefono simulato, il robot colpisce quando la palla arriva: almeno 6 colpi di fila, lato del colpo uguale al gesto, ritorno in fondo dopo ogni colpo (a rete solo dopo una palla corta presa vicino alla rete), cadute in punti diversi con mira e punto neutro del modello, CPU del livello scelto che colpisce entro la portata e non corre più veloce di chi gioca.
- `node natpf-leggenda.mjs` (3161; `POINTS=6`, `CPU_SHOTS=6`, `ALLUNGHI=4`, `ALLUNGHI_GAP=1.2,1.5,1.8,2.1`, B16): partita contro la CPU Leggenda nel gioco vero con il giocatore simulato «preciso» del banco (circa 4 minuti: la partita va al ritmo vero), poi `ALLUNGHI` allunghi forzati (CPU ferma, palla fatta passare a `ALLUNGHI_GAP` m dal corpo, lati alternati: nella partita le palle oltre 1 m sono poche, a volte nessuna); fotogrammi all'impatto della CPU, negli allunghi e nell'affondo. Verifica colpi vari, portata, velocità sotto chi gioca e l'allungo misurato sul disegno: all'impatto, posizioni 3D di centro del piatto, mano destra e testa della CPU verso la palla rispetto agli impatti normali della stessa prova (almeno metà dell'allungo previsto per piatto e mano, 0,3 volte per la testa). Senza palle oltre 1 m la verifica stampa «NON ESERCITATA» e non passa; `ALLUNGO_SPENTO=1` spegne l'allungo del disegno e la verifica deve fallire. La forza si misura senza grafica (`npm run audit:legend` in `natpf-tennis`).
- **Opzione «Calibrazione» nelle prove (B28)**: nel gioco è di base «Giocando» (niente gesti di calibrazione, scambi di
  prova a ogni «Gioca»). Le prove `natpf-*` scritte prima del B28 provano la calibrazione con i gesti, che resta nel gioco:
  mettono da sole `CAL=gesti` (`process.env.CAL ||= 'gesti'` in cima allo script; `th.mjs` lo scrive nell'archivio della
  pagina prima del caricamento). `CAL=play|none` per provarle con le altre opzioni (molte non passano: aspettano i gesti).
  `CAL=base` non scrive niente nell'archivio della pagina: è l'opzione vera di base del gioco («Giocando»). Le prove
  adattate a questa modalità (giro 2 del B28) usano `prova.mjs` (`GESTI`, `phoneReadyNoGestures`, `playTrial`,
  `throughTrial`, `defaultPrep`: telefono pronto senza gesti, scambi di prova giocati dal telefono simulato o saltati con
  «Salta ›») e con `CAL=base` passano: `natpf-nuovo-giocatore`, `natpf-formato-fiera`, `natpf-stesso-schermo-b25`,
  `natpf-rally`, `natpf-phone-blackout` (la parte B, gesti della calibrazione a rete ferma, c'è solo con `CAL=gesti`),
  `natpf-phone-keep`, `natpf-servizio-lancio`, `natpf-diag-session`. Senza `CAL` restano com'erano (con i gesti).
- `node natpf-scambi-di-prova.mjs` (3195, 9195; `FLOW=singolo|stesso`, `HAND=left`, `HITS=all|none|one`,
  `VIEW=1280x720|1024x1024`, `SHOTS=1` per le schermate, `SHORT=1` senza la seconda partita, B28): la calibrazione
  giocando nel gioco vero con il telefono simulato. Tutorial chiuso dalla prima scheda, nessun gesto di calibrazione,
  «Gioca» → scambi di prova (palle alternate dai due lati, il telefono colpisce 0,2 s prima dell'impatto dal lato del
  piano d'intercetto) → «Si comincia!» → partita da 0-0; secondi da «Gioca» al primo punto vero; profilo imparato;
  «Ricalibra» dalla pausa; seconda partita che riparte dal profilo semplice. Con `SHOTS=1` le schermate fermano il gioco
  e i secondi non si verificano.
- `node natpf-flusso-tocchi.mjs` (3181, 9181; dal B28 misura anche i secondi da «Gioca» al primo punto vero, senza colpire; `FLOW=singolo|stesso|1v1`, `MAX_TAPS=n`, B16): tocchi e tasti di chi gioca dall'apertura alla prima palla con il telefono simulato e i comandi veri (tutorial corto, calibrazione, «Gioca»; «Salta ›» solo se parte il riscaldamento). Valori del B16: singolo 13, stesso schermo 19, sfida tra due computer 18. Schermate e `<FLOW>-tocchi.json` in `OUT`.
- `node natpf-mira-lato.mjs` (3191, 9191; `MIN` colpi della prima partita, B16): il percorso di `docs/GUIDA_MISURA_MIRA.md`: «Mira del telefono» nel pannello dello stand (Ctrl+Maiusc+K, non nelle Opzioni) che resta dopo aver ricaricato, diagnostica (Maiusc+D) con due partite a sensibilità diverse, riassunto con il lato delle palle per partita, pacchetto zip (scheda nel rapporto, righe nel LEGGIMI, `latoPalle` in `metriche.json`) e `scripts/audit/lato-palle.mjs` sul pacchetto.
- `node natpf-latency.mjs` (3110, 9110): tempi dal picco del gesto alla risposta a schermo (rilevatore, rete, motore), un solo swing per gesto anche in anticipo, swing all'istante del colpo, etichetta del gesto.
- `node natpf-menu.mjs` (3116): menu principale a 1366 × 657, 1024 × 600 e 1280 × 720: voci visibili senza scorrere, frecce, descrizione, nessuna partita dimostrativa e nessun ridisegno con il menu fermo; pannello dello stand (Ctrl+Maiusc+K) senza scorrere con «Chiudi» in vista.
- `node natpf-schermo.mjs` (vite 3185; `GAME_PORT`): schermo intero senza cornici e calibrazione dello schermo (B8): comando visibile in Opzioni → Schermo a 1280 × 720 e 1920 × 1080, schermo intero al primo tasto della schermata iniziale con `?fs=1`, Esc che resta «indietro», F che entra ed esce, calibrazione (bordi, formato 1:1, annulla, salva e ricarica), «Premi F11» visibile in campo e in pausa, programma Windows simulato (`window.natpfDesktop`).
- `node natpf-aggiornamenti.mjs` (vite 3192; `GAME_PORT`): aggiornamenti del programma Windows nel gioco con un `window.natpfDesktop.updates` finto (iniettato prima del caricamento): niente avviso né sezione nel browser; avviso «Aggiornamento disponibile» nel menu a 1280 × 720, 1920 × 1080, 720 × 720 e 1024 × 600 che non copre voci né pulsanti, download con percentuale e MB, «Riavvia e aggiorna», «Più tardi» con frecce e Invio, sezione «Aggiornamenti» in Opzioni (stati in parole, «Cerca aggiornamenti»), niente avviso in Allenamento, in «Collega» e in partita, un solo avviso nello stesso schermo e nell'area 2×2. Schermate `agg-*.png` in `OUT`.
- `node natpf-inquadratura.mjs` (vite 3186; `GAME_PORT`): inquadratura della partita a 1920 × 1080, 1600 × 1200, 1200 × 1200 e 1080 × 1920: angoli del campo e pali della rete dentro l'immagine con la camera vera, giocatore lontano dal fondo senza la banda nera del maxischermo.
- `node natpf-registro.mjs` (vite 3196, spazio finto 8796; `GAME_PORT`, `SPAZIO_PORT`): registro dello stand (B30, docs/b30/registro-dello-stand.md) con il Worker vero e uno spazio R2 finto in locale: acceso da solo, una partita contro la CPU e una nello stesso schermo con nomi scritti (righe attese nello spazio, nessun nome, nessun campo non previsto), pannello dello stand a 1280 × 720 e 1024 × 600, rete assente (coda, «Scarica la coda», «Invia adesso» senza doppioni), pagina ricaricata, registro spento = nessuna riga, costo per partita e per passo del gioco. Stampa una riga `MISURE`.
- `node natpf-diag-session.mjs` (3118, 9118; `SECONDS=150`, `VIDEOS=webcam,gioco|webcam|gioco|nessuno`, `PARTS=A` per la sola sessione lunga): modalità diagnostica con telefono simulato e webcam finta del browser. Prova tre cose:
  - una sessione lunga: niente stop a 30/60 s, campioni continui, prestazioni al secondo, video della webcam e del gioco, costo del registratore sotto il 2%, pacchetto zip valido;
  - una sessione interrotta da una ricarica, poi recuperata;
  - la prova guidata con il riferimento nelle metriche.
- `node natpf-swing-loss.mjs` (3140, 3141; `MODE=lan|internet`, `N=150`, `LOSS=0,0.03,0.08`, `ROOT` per misurare un altro checkout): consegna dei colpi con perdita di pacchetti simulata (prima/dopo le copie sul percorso veloce). Criteri: nessun colpo perso, p99 ≤ 50 ms con il 3% e ≤ 80 ms con l'8%. Serve iptables (root), quindi è uno script di misura e non sta nella matrice; per la LAN prima `npm run build`.
- `node natpf-telecomando.mjs` (dopo la build di `natpf-tennis`; porte 4902 e 4903, `GAME_PORT`): telecomando dello staff
  (B27) sul server LAN del programma (certificato creato come nel programma, in una cartella temporanea) con il gioco a
  1024 × 1024 e un `window.natpfDesktop` finto con due monitor: abbinamento dal pannello dello stand (QR letto con jsQR)
  che vale solo dopo «Conferma» sul computer con un clic vero (stesso numero sul telefono; un clic fatto dal codice e
  l'OK del telecomando non confermano), QR e codice fotografati e usati a foglio chiuso, secondo telefono che aspetta
  mentre il primo comanda, percorso menu → partita → pausa → menu → nuovo giocatore guidato solo dal telefono, frecce
  spente in partita, ripresa (prova della chiave) dopo la ricarica del gioco e del telefono e dopo il «PC riavviato»,
  rifiuti (racchetta come telecomando e viceversa, codici e prove sbagliate sull'indirizzo fisso), controlli che aprono
  finestre di Windows saltati, schermate della matrice `docs/b27/telecomando.md`, «Scollega» in due passi e codice a
  mano confermato sul computer. Schermate `telecomando-*.png` in `OUT`.
