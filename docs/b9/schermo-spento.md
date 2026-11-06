# B9 · Telefono con lo schermo spento: cosa si garantisce, cosa no, come si prova

Punto 3 della richiesta del 05/11 («lo smartphone deve continuare a funzionare come controller se lo schermo si spegne
per sbaglio»). Analisi completa con le fonti: `docs/b9/analisi-telefono.md` §b. Qui: la decisione, cosa fa il gioco dal
compito A di B9, il protocollo di prova sui telefoni veri e l'alternativa con un'app nativa (solo descritta).

## In breve

**Con lo schermo spento una pagina web non riceve i sensori di movimento, su nessun telefono e con nessun browser.**
Le specifiche W3C (DeviceOrientation, Generic Sensor) e il codice di Chromium e WebKit fermano accelerometro e giroscopio
appena la pagina non è visibile. Nessuna impostazione della pagina lo aggira: audio o video muti, Picture-in-Picture,
schermo intero e app installata (PWA) tengono «viva» la pagina, non i sensori. Questi trucchi non sono stati usati.

Il gioco fa quindi la cosa più affidabile possibile senza cambiare architettura:
1. **evita che lo schermo si spenga da solo** (Screen Wake Lock, chiesto e ripreso in ogni occasione utile);
2. **ferma subito la partita** quando il telefono dice che la pagina è nascosta e rigioca il punto;
3. **riprende da solo in pochi secondi** quando lo schermo si riaccende: niente tutorial, niente calibrazione, niente QR;
4. **dice chiaramente cosa fare**, sul telefono e sul computer.

## Cosa si può garantire e cosa no (via browser)

| | Garantito | Note |
|---|---|---|
| Schermo che non si spegne **da solo** durante il gioco | sì, dove il browser concede il blocco | Chrome/Samsung Internet su Android; Safari da iOS 16.4 (nelle app sulla schermata Home da 18.4). Il browser può negarlo (risparmio energetico, batteria scarica): il telefono lo dice |
| Schermo spento con il **tasto di accensione** | **no** | il blocco evita solo lo spegnimento automatico (W3C Screen Wake Lock §11) |
| Colpi con lo schermo spento | **no** | sensori fermi a pagina nascosta (W3C, Chromium `PageVisibilityChanged`, WebKit `setIsVisibleInternal`) |
| Partita ferma subito, punto rigiocato | sì | il telefono manda `st.vis: 0` su `visibilitychange`, prima di essere sospeso; se il messaggio non arriva, la pausa scatta dal flusso dei sensori fermo (0,4 s + 0,3 s di tolleranza) |
| Collegamento tenuto a schermo spento | **non garantito** | Android: in genere sì per qualche minuto (Chrome congela le schede in background dopo ~5 min); iPhone: la pagina è sospesa poco dopo il blocco, durata da misurare |
| Ripresa senza tutorial né calibrazione | sì | tutorial solo con un abbinamento nuovo (QR), calibrazione nel `sessionStorage` della scheda |
| Ripresa senza toccare il telefono | **dipende dal browser** | Android: blocco e sensori ripartono da soli; iPhone: il blocco richiede un tocco (WebKit bug 255363), e lo chiede il velo «Tocca lo schermo per riprendere» |
| Schermo intero dopo la riaccensione | **non garantito** | su Android il browser può uscire dallo schermo intero; la pagina lo richiede al primo tocco dopo il ritorno. Su iPhone lo schermo intero non esiste |

## Cosa fa il gioco (compito A di B9)

### Sul telefono (`site/js/tennis/racchetta.js`, `phone-keep.js`)

- **Wake Lock** (`createWakeKeeper`): richiesto con «Attiva i sensori» (dentro il tocco), di nuovo a ogni ritorno in
  primo piano, dopo un rilascio o un rifiuto a pagina visibile (attese 1, 2, 4, 8 s) e a ogni tocco sullo schermo. Lo
  stato va al computer a ogni cambio (`st.wk`: 1 tenuto, 0 no, −1 non offerto).
- **Avviso «Lo schermo può spegnersi»** anche durante il tutorial e la calibrazione (prima solo in «Pronto»), con il
  pulsante «Tieni acceso lo schermo» o, se il browser non offre il blocco, il consiglio di allungare lo spegnimento
  automatico nelle impostazioni.
- **Velo «Tocca lo schermo per riprendere»** (`createResumeVeil`): al ritorno in primo piano, se dopo 1,5 s il blocco
  non è tenuto o i sensori non sono ripartiti (entro 20 s dal ritorno), un velo a tutto schermo. **Un solo tocco** riprende
  il blocco, il permesso dei sensori su iPhone (va chiesto dentro il tocco), l'ascolto dei sensori e lo schermo intero.
  Se blocco e sensori ripartono da soli (Android) il velo non compare.
- **Collegamento**: al ritorno un ping subito; se il collegamento è caduto, ripresa immediata con la chiave salvata nella
  scheda (non serve il QR). La ripresa **non è un abbinamento nuovo**: il tutorial non ricompare (prima ricompariva
  dalla scheda 1, sopra «Pronto»), il tutorial a metà riprende dalla scheda raggiunta (`gate` nel `sessionStorage`).
- **Schermate esclusive** (`phone-screen.js`): dopo la ripresa il telefono torna dov'era («Pronto», tutorial con le
  schede già viste, o la calibrazione da capo se era a metà), mai due schermate insieme.

### Sul computer (`natpf_phone_watch.js`, `natpf_ui.js`, `natpf_split_ui.js`, `site/js/tennis/link.js`)

- **Pausa immediata** con `st.vis: 0` (nessuna tolleranza), punto rigiocato se era nello scambio, ripresa dopo 0,7 s
  regolari con il conto alla rovescia.
- **Testo della pausa** con il giocatore e **da quanto** lo schermo è spento, aggiornato ogni secondo: «Telefono in pausa
  — Schermo del telefono spento o pagina del gioco non in primo piano da 12 s: riaccendi lo schermo (tasto laterale) e
  torna alla pagina, si riprende da solo. Sul telefono basta un tocco per riprendere.» (titolo «Telefono del Player 1/2
  in pausa» nello stesso schermo).
- **Collegamento caduto con lo schermo spento**: il riquadro dice che si ricollega da solo appena il telefono torna, e
  **non apre il pannello del QR** (prima lo apriva, come se il telefono fosse perso); il QR serve solo se la pagina è
  stata chiusa. Il link ricorda da quando la pagina è nascosta (`L.hiddenAt`) anche attraverso la ripresa.

### Cosa non si è fatto, e perché

- Niente video o audio muti in ciclo (NoSleep.js), niente Picture-in-Picture: non danno i sensori, consumano batteria,
  mostrano controlli multimediali sulla schermata di blocco. I browser senza Wake Lock nel 2026 sono pochi (Safari < 16.4,
  Samsung Internet < 14): meglio dire di aggiornare o di allungare lo spegnimento automatico.
- Nessun riassunto degli episodi nella diagnostica (proposto in `analisi-telefono.md` §b.3 punto 3): la diagnostica
  registra già `vis` e `wk` del telefono e le pause (`tel.pausa`); il riassunto per sessione resta da fare se servirà
  decidere sull'app nativa con i dati degli eventi.

## Protocollo di prova sui telefoni veri (da fare: qui non si può)

Per ogni telefono dello staff: Android con Chrome, Android con Samsung Internet, iPhone con Safari. Computer con la
diagnostica accesa (Opzioni → Diagnostica), Allenamento o stesso schermo, telefono su «Pronto».

| # | Prova | Atteso | Da annotare |
|---|---|---|---|
| 1 | Lasciare il telefono fermo oltre il tempo di spegnimento automatico (es. 2 min con lo spegnimento a 30 s) | lo schermo resta acceso; sul telefono nessun avviso «Lo schermo può spegnersi» | `wk` nella diagnostica (1 = tenuto) |
| 2 | Tasto di accensione durante uno scambio, riaccensione dopo **3 s** | computer in pausa entro 1 s con «da N s»; alla riaccensione si riprende da solo (Android) o con un tocco sul velo (iPhone); punto rigiocato; niente tutorial né calibrazione | tempo dalla riaccensione al gioco; il velo compare? |
| 3 | Come 2, riaccensione dopo **30 s** | come 2; se il collegamento è caduto, il riquadro sul computer dice «si ricollega da solo» e il telefono si ricollega senza QR | collegamento tenuto o rifatto (`tel.ricollega`, `joins`) |
| 4 | Come 2, riaccensione dopo **6 min** | Android: la scheda può essere stata congelata; la ripresa con la chiave deve funzionare comunque. iPhone: idem | tempo di ripresa; serve il QR? (non dovrebbe) |
| 5 | Schermo spento **durante il tutorial** (scheda 5 di 11), riaccensione dopo 10 s | il telefono torna al tutorial con le schede già viste, «Tutto chiaro» ancora spento; il computer riprende dalla scheda raggiunta | — |
| 6 | Schermo spento **durante la calibrazione** | alla riaccensione la calibrazione riparte; nessun tutorial | — |
| 7 | Android: schermo intero prima dello spegnimento | dopo la riaccensione: resta o esce? Al primo tocco la pagina lo richiede | comportamento per browser |
| 8 | Risparmio energetico **attivo** | il blocco può essere negato: il telefono deve dirlo («Lo schermo può spegnersi») e il pulsante deve riprovarci | `wk` = 0 |
| 9 | Presa nel palmo per 5 minuti di gioco | le dita non premono i tasti laterali (dipende dal modello) | modelli con il problema |

Esito da riportare in `docs/COLLAUDO_WINDOWS.md` (sezione dei telefoni) con modello, sistema e browser.

### Preparazione dei telefoni dello staff (consigliata)

- **Android**: Impostazioni → Display → Spegnimento schermo 10 minuti; blocco schermo «Nessuno» o «Scorrimento» (un tasto
  premuto per sbaglio si recupera con una pressione, senza PIN); Risparmio energetico spento; Chrome o Samsung Internet
  fuori dalle app «in sospensione»/ottimizzate per la batteria.
- **iPhone**: Impostazioni → Schermo e luminosità → Blocco automatico «Mai»; Modalità risparmio energetico spenta (con il
  risparmio attivo il blocco automatico è fisso a 30 s, support.apple.com/101604).
- In tutti e due: prima dell'evento, prova 1 con la diagnostica (blocco «tenuto»).

## Alternativa: app Android nativa (solo descritta, non realizzata)

L'unica strada che terrebbe vivo il controller a schermo spento. Da valutare **solo** se le prove sui telefoni veri e le
diagnostiche degli eventi mostrano spegnimenti nonostante le misure sopra.

- **Cosa**: un'app «NATPF Racchetta» per i telefoni dello staff, installata a mano (APK, nessuno store).
- **Come**: un servizio in primo piano di tipo `connectedDevice` (obbligatorio da Android 14) con la notifica fissa; un
  `PARTIAL_WAKE_LOCK` (senza, a SoC sospeso i sensori non «wake-up» traboccano dal FIFO e i campioni si perdono);
  `SensorManager` a 100–200 Hz; la rete (WebRTC nativo, o WebSocket/UDP verso il server LAN) **dentro il servizio**; lo
  stesso protocollo della pagina (`hello`, `st`, `cal`, `sw`, `fo`…), così il computer non cambia.
- **Condizione**: rilevatore dei colpi, calibrazione e orientamento del piatto devono girare **nel servizio** (porting di
  circa 1.000 righe di `swing-detect.js`, `calibration.js`, `face-tracker.js`, o un motore JavaScript incorporato).
  L'«app sottile» con la pagina in una WebView e un ponte verso i sensori **non basta**: a schermo spento la WebView è
  nascosta come la pagina.
- **Limiti**: da prototipare e misurare su un telefono vero prima di promettere qualcosa (batteria, latenza,
  restrizioni dei produttori sui servizi in background); su **iPhone** non esiste una strada equivalente ammessa.

## Verifiche fatte qui (browser simulato)

- Test unitari: `tools/test/phone-keep.test.mjs` (blocco dello schermo, velo), `tools/test/phone-screen.test.mjs`
  (schermate esclusive e ripresa), `tools/test/phone-link-fast.test.mjs` (abbinamento nuovo contro ripresa, pagina
  nascosta da quando), `natpf-tennis/test/natpf-phone-watch.test.mjs` (testo della pausa con la durata).
- Prove nel browser con visibilità e blocco simulati nella pagina (06/11, Chromium headless): `natpf-phone-keep.mjs`
  13/13, `natpf-phone-blackout.mjs` 6/6, `natpf-training-reconnect.mjs` 6/6 e `natpf-tutorial-phone.mjs` 36/36 (pausa
  con «da 3 s», velo «Tocca lo schermo per riprendere» quando il blocco vuole un tocco, ripresa del computer senza
  tutorial né QR, un tocco sul velo riprende il blocco).
- **Non verificato**: tutto quello che riguarda telefoni veri (tabella sopra), Safari su iPhone in particolare.
