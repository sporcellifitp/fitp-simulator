# App nativa, Bluetooth e collegamento in tempo reale: valutazione (21/10/2026)

Domanda: un'app nativa per il telefono, o il Bluetooth, migliorerebbero davvero il controller rispetto alla pagina web via LAN di oggi?

Risposta breve: **non adesso**. I ritardi che si sentono oggi vengono da tre punti:
- la gestione delle perdite di rete, già corretta (vedi sotto);
- il riconoscimento del gesto, legato alla frequenza dei sensori;
- lo schermo, che dipende dall'installazione.

L'app nativa aiuta solo il secondo, di circa 13 ms; il Bluetooth non abbassa la latenza rispetto a un Wi-Fi LAN dedicato. Quando conviene comunque l'app, e come misurarlo, è più sotto.

## 1. Dove va il tempo oggi

Il percorso: dal picco del gesto alla risposta a schermo. [V] = misurato; [I] = stima, da misurare sul campo con la modalità diagnostica.

| Tratto | Tempo | Note |
|---|---|---|
| Campionamento dei sensori (pagina web) | 1 campione ogni ~16,7 ms a 60 Hz | [I] la frequenza vera del telefono è nel registro (`tel.stato.hz`, `telefono-sensori.jsonl`) |
| Riconoscimento del gesto (dal picco alla decisione) | 24 ms nel browser con sensori sintetici [V]; 33 ms nel simulatore a 60 Hz [V] | serve vedere il picco e un paio di campioni dopo; dipende dalla frequenza (tabella sotto) |
| Rete telefono → computer, Wi-Fi pulito | 1–5 ms [V sul computer locale] | [I] su Wi-Fi vero: da misurare (`tel.colpo.consegna`) |
| Rete con perdite di pacchetti, prima della correzione | via internet p99 153–293 ms e fino al 14% dei colpi oltre 100 ms; in LAN p99 34–66 ms [V] | il colpo aspettava la ritrasmissione sul canale ordinato |
| Rete con perdite, dopo la correzione del 21/10 | vedi tabella del §2 [V] | copie del colpo sul percorso senza attesa |
| Computer: dal messaggio al fotogramma | 0–17 ms | il colpo entra nel fotogramma successivo |
| Disegno e composizione del browser | 16–33 ms [I] | 1–2 fotogrammi |
| Televisore | 10–20 ms in modalità gioco; 50–150 ms in modalità normale [I] | da misurare con un video a 240 fps |

Il giudizio del tempo del colpo (anticipo/ritardo) usa l'istante del picco misurato sul telefono, portato sull'orologio del computer. Rete e computer **non** spostano il giudizio: ritardano solo la risposta a schermo. Lo schermo invece sposta anche il giudizio (chi gioca colpisce la palla che vede), e non è compensato.

## 2. Correzione già fatta: colpi senza attesa di ritrasmissione

Prima, ogni colpo viaggiava solo sul canale ordinato e affidabile. Un pacchetto perso fermava tutto fino alla ritrasmissione.

Ora il telefono manda il colpo così:
- tre copie sul percorso senza ritrasmissioni (in LAN il canale dei sensori; via internet una seconda connessione non ordinata);
- una sul canale affidabile.

Il computer tiene la prima copia e scarta le altre con il numero del colpo. Il piatto e i campioni della diagnostica viaggiano solo sul percorso veloce.

Misura: perdita casuale di pacchetti UDP sul computer locale, 150 colpi per condizione, consegna in ms. Telefono simulato nel browser, stesso banco di prova prima e dopo (`tools/e2e/natpf-swing-loss.mjs`; per il «prima» `ROOT` punta a un checkout del commit 726b5e3).

| Modo | Perdita | Prima: p90 / p99 / max | Dopo: p90 / p99 / max | Colpi oltre 50 ms prima → dopo |
|---|---|---|---|---|
| LAN | 0% | 3 / 6 / 8 | 3 / 11 / 33 | 0 → 0 |
| LAN | 3% | 4 / 34 / 36 | 4 / 9 / 22 | 0 → 0 |
| LAN | 8% | 34 / 66 / 66 | 4 / 15 / 35 | 5 → 0 |
| Internet | 0% | 3 / 6 / 6 | 3 / 10 / 21 | 0 → 0 |
| Internet | 3% | 34 / 153 / 221 | 3 / 6 / 9 | 13 → 0 |
| Internet | 8% | 114 / 293 / 321 | 4 / 11 / 29 | 39 → 0 (oltre 100 ms: 21 → 0) |

- Senza perdite le differenze stanno nel rumore della macchina di prova. Un confronto mirato di 300 colpi, con un riscaldamento escluso, dà prima p99 8 ms e massimo 44 ms: anche il codice vecchio ha picchi isolati sotto carico.
- Tutti i colpi sono arrivati in ogni condizione, prima e dopo.
- Con le perdite, la prima copia arriva dal percorso veloce nel 95–97% dei casi.
- Si ripete con `tools/e2e/natpf-swing-loss.mjs`. Serve iptables, e i criteri sono: nessun colpo perso, p99 ≤ 50 ms con il 3% di perdita e ≤ 80 ms con l'8%.

## 3. Cosa cambierebbe un'app nativa

**Sensori più veloci: è il vantaggio vero.** Una pagina web riceve `devicemotion` a circa 60 Hz (iPhone fisso a 60 Hz; Android dipende dal browser). Un'app nativa può leggere i sensori a 100–200 Hz.

Misura con lo stesso rilevatore, telefono simulato, 80 colpi per frequenza:

| Frequenza | Colpi riconosciuti | Ritardo di riconoscimento p50 / p90 |
|---|---|---|
| 30 Hz | 80/80 | 50 / 50 ms |
| 60 Hz (oggi) | 80/80 | 33 / 34 ms |
| 100 Hz | 80/80 | 20 / 26 ms |
| 200 Hz | calibrazione non riuscita (0/4) | — |

- A 100 Hz si guadagnano circa **13 ms** di risposta e un istante del picco più preciso (±5 ms invece di ±8 ms).
- A 200 Hz il rilevatore attuale non funziona: è tarato su 60 Hz, con finestre in numero di campioni. Andrebbe adattato prima.

**Latenza di rete: nessun vantaggio rilevante.** Un'app nativa userebbe comunque WebRTC o UDP sullo stesso Wi-Fi. Il problema vero, il blocco del canale ordinato, è già risolto anche nella pagina web.

**Stabilità.**
- Un'app tiene lo schermo acceso e il processo vivo in modo più affidabile. La pagina web dipende dal blocco dello schermo del browser: con il risparmio energetico o in alcuni browser «dentro» altre app può mancare, e dopo il tempo di spegnimento del telefono (spesso 30 s) la pagina si sospende.
- Ora il telefono comunica se il blocco è attivo, e il computer avvisa.
- Le registrazioni diranno quanto spesso succede davvero (`tel.stato.visibile`, `schermo`).

**Costi.**
- Sviluppo per iPhone e Android, poi distribuzione e aggiornamenti.
- Chi visita la fiera dovrebbe installarla. Con telefoni dello staff il problema sparisce: si installa una volta.

## 4. Bluetooth e altre strade

| Strada | Latenza tipica | Pro | Contro |
|---|---|---|---|
| Wi-Fi LAN dedicato + WebRTC (oggi, con la correzione) | 1–5 ms; picchi contenuti anche con perdite | niente app; QR e via | serve un access point dedicato in fiera |
| Bluetooth LE (app nativa sul telefono, Bluetooth web o programma sul computer) | 7,5–30 ms secondo l'intervallo di connessione (iPhone almeno 15 ms) [I] | non serve il Wi-Fi | app obbligatoria; abbinamento a ogni sessione; radio a 2,4 GHz affollata in fiera; dalla pagina web del telefono è impossibile (iPhone non ha Bluetooth web, Android non può fare da periferica) |
| Bluetooth classico «gamepad» (solo Android, app) | legata alla lettura del gamepad nel browser, un campione per fotogramma | si collega come un controller | perde l'istante del picco, quindi peggiora il giudizio del tempo; niente iPhone |
| Cavo USB (Android, rete via cavo) | ~1 ms | nessuna perdita radio | impraticabile con il telefono che si muove come una racchetta; utile solo in laboratorio, per separare i problemi radio da quelli del software |
| WebSocket verso il server LAN | 2–10 ms [I] | semplice | stesso blocco del canale ordinato, timeout TCP peggiori |
| WebTransport (datagrammi) | come WebRTC [I] | niente blocco | iPhone da verificare; serve un server HTTP/3 con certificato |

Il Bluetooth non abbassa la latenza rispetto a un Wi-Fi LAN dedicato. Ha senso solo dove il Wi-Fi non si può controllare, e comunque con un'app.

## 5. «Sempre collegato, senza ritardo percepibile»: cosa è possibile

**Limiti inevitabili**
- vedere il picco del gesto prima di decidere: almeno 1–2 campioni dopo il picco;
- disegnare il fotogramma;
- il ritardo del televisore;
- le perdite radio, che si possono nascondere con le copie ma non eliminare.

**Limiti che dipendevano dall'implementazione** (corretti o misurabili)
- il canale ordinato per i colpi: corretto;
- il flusso del piatto sullo stesso canale: corretto;
- il blocco dello schermo del telefono non controllato: ora segnalato;
- il ritardo dello schermo non compensato: si misura con un video, poi si compensa;
- le soglie del rilevatore legate a 60 Hz.

**Obiettivo realistico.**
- Con un access point dedicato a 5 GHz, la versione LAN, la correzione delle copie e un televisore in modalità gioco: dal picco del gesto alla risposta a schermo circa 60–90 ms, con il giudizio del tempo esatto.
- Con un televisore in modalità normale: 100–200 ms, che si percepiscono.
- Il collegamento resta su anche con cadute brevi: controllo di vita a 5 s, ripresa automatica, pausa e ripresa della partita (20/10).

## 6. Proposta

- **Ora:**
  - niente app;
  - access point dedicato, versione LAN, televisore in modalità gioco;
  - correzione delle copie (fatta);
  - sessioni diagnostiche sui telefoni veri.
- **Regola per decidere l'app nativa**, con i dati di almeno tre sessioni vere per telefono. Conviene se si verifica almeno uno di questi casi:
  - sensori sotto i 50 Hz, o buchi oltre 50 ms in più dell'1% del tempo;
  - pagina del telefono nascosta o blocco dello schermo assente in partita, nonostante le istruzioni;
  - consegna p99 oltre 50 ms sull'access point dedicato, dopo la correzione;
  - un guadagno di 13 ms nel riconoscimento che migliori in modo misurabile la prova guidata (tempo dei colpi, lato giusto).
- **Se conviene, architettura consigliata:**
  - un'app sottile che contiene la stessa pagina del telefono e aggiunge solo un ponte verso i sensori nativi (100 Hz, istanti hardware) e lo schermo sempre acceso;
  - stesso protocollo (`sw`, `cal`, `st`…) e stesso WebRTC, quindi il gioco non cambia;
  - il QR apre l'app se è installata, altrimenti la pagina web: il collegamento resta semplice e i telefoni senza app funzionano come oggi;
  - prima di salire oltre 60 Hz, il rilevatore va reso indipendente dalla frequenza, con finestre in millisecondi.
- **Come verificarla:**
  - stessa prova guidata con lo stesso telefono, prima nella pagina web e poi nell'app;
  - `node scripts/diag/diag.mjs confronta web.zip app.zip`: frequenza dei sensori, riconoscimento p50, consegna p99, pagina nascosta, tempo dei colpi e lato giusto.
