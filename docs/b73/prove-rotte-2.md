# B73 · Prove rotte da prima (2): `natpf-registro-sensori.mjs` e `lan-e2e.mjs` (20/11/2026)

Prodotto: **FIERA**. Richiesta dell'utente del 20/11 («Vai avanti su 4, 6 (falli), tecnico»; tecnico = le prove nel browser
rotte da prima). Ramo locale `b73-prove-b` da `natpf-simulator` 8d374b7f (09cdac6b più i soli documenti di avvio del B73).
Niente push, file di versione e documenti vivi non toccati. Contenitore Linux, Node 22, Chromium 1243 senza scheda grafica
(`CHROMIUM_PATH=/opt/pw-browsers/chromium`), 4 core condivisi con altri agenti (carico 6–7), disco quasi pieno (vedi §4).

In breve:

| Prova | Prima | Causa | Dopo |
| --- | --- | --- | --- |
| `tools/e2e/natpf-registro-sensori.mjs` | 23/23 ma Node non esce (due `Timeout` attivi) | il server PeerJS del pacchetto `peer` dentro il processo della prova: due cicli di pulizia che non si fermano | PeerJS in un processo a parte, chiuso alla fine come vite: esce da sola, 0 se verde, 1 se rossa |
| `natpf-tennis/test/e2e/lan-e2e.mjs` | 6/8, ferma alla calibrazione (oggi); il 05/11 «campioni 0», racchetta ferma, nessun colpo | **prova** vecchia (calibrazione «Giocando», telefono simulato senza gravità né campioni continui, servizio con il gesto, assi del piatto), **ambiente** (WebGL in software: 1,5–3,0 s a fotogramma), **gioco** (risposte mai lette: dopo circa 180 ogni richiesta della pagina fallisce, la sfida tra due computer andava in crash; corretto) | telefono, 1v1 e webcam **32/32**, uscita 0; «segui il corpo» non verificabile qui (11/16, §2.4) |

## 1. `tools/e2e/natpf-registro-sensori.mjs`: il processo non usciva

### 1.1 Chi lascia i timer

Sonda in Node (stessi moduli della prova, senza browser):

| Cosa | Risorse attive (`process.getActiveResourcesInfo()`) |
| --- | --- |
| dopo l'import di `registro-worker.js`, `r2-finto.mjs` (con `r2Finto()`), `registro_formato.js`, `riassunto.mjs` | nessuna: il codice del gioco caricato in Node non lascia niente |
| `ExpressPeerServer` (pacchetto `peer` 1.0.2) montato e in ascolto | `TCPServerWrap, Timeout, Timeout` |
| dopo `server.close()` | `Timeout, Timeout`: il processo resta acceso (`timeout 10` → uscita 124) |

I due `Timeout` sono di `peer` (`node_modules/peer/dist/module.mjs`): al «mount» del server partono
`CheckBrokenConnections.start()` (ogni 300 ms) e `MessagesExpire.startMessagesExpiration()` (ogni `cleanup_out_msgs`,
1000 ms), due `setTimeout` che si riprogrammano da soli, senza `unref()` e senza un comando pubblico per fermarli; chiudere
il server HTTP non li tocca. Le altre 36 prove con `ExpressPeerServer` finiscono tutte con `process.exit` (anche
`run-local.mjs`: «PeerServer owns housekeeping intervals»); questa no. Il vite figlio, il Worker finto e il browser non
lasciano niente. Non è codice del gioco.

### 1.2 Correzione

- `tools/e2e/peer-server.mjs` (il server PeerJS delle prove, prima fisso sulla porta 9000) prende la porta come argomento
  (`node peer-server.mjs 4511`, o `PEER_PORT`; predefinita ancora 9000).
- `natpf-registro-sensori.mjs` lo avvia come **processo figlio** (aspetta «peer server on …») e lo chiude in `stop()` insieme
  a vite: nel processo della prova non resta nessun timer e Node esce da solo con il `process.exitCode` di `summary()`.
  Niente `process.exit`.
- Un'eccezione a metà (tempo scaduto, pagina chiusa) prima usciva con 1 ma dopo un sommario «n/n superate»; ora è il rosso
  «prova arrivata alla fine senza eccezioni» nel sommario (come in `lan-e2e.mjs`).

Sonda con la stessa struttura (PeerJS figlio, `check`/`summary` di `th.mjs`, senza browser): verde → uscita 0 in 1,5 s;
una verifica rossa → uscita 1 in 1,7 s; un'eccezione → uscita 1 in 1,4 s.

### 1.3 Prova

`cd tools/e2e && CHROMIUM_PATH=/opt/pw-browsers/chromium node natpf-registro-sensori.mjs` (con la correzione del §2 nel
gioco): **23/23**, **uscita 0 dopo 91 s** da sola, nessun processo `peer-server.mjs` o vite rimasto. Prima: 23/23 e
processo fermo dopo il sommario (docs/b71/unione.md §2).

## 2. `natpf-tennis/test/e2e/lan-e2e.mjs` (`npm run test:e2e-lan`, fuori dalla CI)

Come provarla qui: `npm run build`, poi dalla cartella `natpf-tennis`
`NO_PROXY="$NO_PROXY,<IP del PC>" no_proxy="$no_proxy,<IP del PC>" CHROMIUM_PATH=/opt/pw-browsers/chromium node test/e2e/lan-e2e.mjs`
(senza `NO_PROXY` Chromium manda l'indirizzo di rete del PC al proxy del contenitore). `ONLY=telefono,1v1,webcam,corpo`
per le singole parti.

### 2.1 Prima (oggi, 8d374b7f)

`6/8`: la prova si fermava dopo «Attiva i sensori» aspettando il passo «swings» della calibrazione con i gesti, mentre il
telefono era già «Pronto»; in più una richiesta fuori dal computer (il trailer dell'intro dal bucket pubblico). Il 05/11 (prima
del B28) arrivava in partita e falliva in «campioni in 0,7 s: 0», «racchetta che non segue il polso», «gesto → colpo», e con la
webcam la racchetta non seguiva la mano.

### 2.2 Cause, una per una

**Prova (flusso cambiato dopo che è stata scritta):**

1. **Calibrazione** (B28): di base l'opzione dello stand è «Giocando»: niente gesti di calibrazione, il telefono è pronto
   subito con il profilo semplice. La prova aspettava i gesti della calibrazione rapida. Ora aspetta il telefono pronto (e
   chiude l'eventuale tutorial vedendo tutte le schede, B9, con `seeAllCards` di `tools/e2e/th.mjs`). La calibrazione con i
   gesti resta provata dalle prove `natpf-*` con `CAL=gesti`.
2. **Intro** (B21): l'intro prova prima il trailer dello stesso server (`./media/trailer-….mp4`, che c'è solo nel programma
   Windows: `natpf-desktop/scripts/prepara.mjs` lo copia in `dist/media`) e poi il bucket pubblico: con la build di sviluppo
   la richiesta al bucket è voluta (`natpf_intro.introPlan`). Le pagine del gioco si aprono con `?intro=0` come le altre prove
   (il server aggiunge comunque `?lan=1`, verificato).
3. **Telefono simulato vecchio** (`tools/e2e/motion.js`): campioni solo mentre la prova muoveva il telefono (tra un passo e
   l'altro, anche 15 s di silenzio: la pagina del telefono diceva «Sensori fermi») e gravità sempre lungo y anche con il
   telefono ruotato. Il piatto del telefono (`face-tracker.js`, dal 21/10) corregge l'inclinazione con la gravità: con la
   gravità ferma le rotazioni attorno a x e z tornavano indietro da sole (X: 20–28° invece di 31,5°; Z: quasi 0). Nuovo
   telefono simulato nella prova (`PHONE_SIM`): campioni continui a 100 Hz con un poco di rumore, giroscopio integrato e
   gravità che gira con il telefono, come uno vero. `motion.js` resta com'è (lo usa `lan-browser.mjs` della CI).
4. **Assi della racchetta**: la verifica «X → beccheggio, Y → rollio, Z → imbardata» era della racchetta che seguiva il
   giroscopio integrato (`racketTiltFromRotation`). Oggi la racchetta segue il piatto (`racketTiltFromFace`, messaggi «fo»):
   asse X del telefono (piatto aperto/chiuso) → apertura della racchetta (roll), asse Y (manico) → imbardata, asse Z
   (normale allo schermo) → beccheggio. Misurato: X 64,0° di roll tra i due versi, Y 63,4° di imbardata, Z −15,9° / −15,7°
   di beccheggio dalla presa di riposo. **Corretto nella revisione del B73** (`docs/b73/unione.md` §7): queste misure sono
   del telefono simulato che parte dritto (asse y verticale), una posa che non è la presa insegnata; lì il roll del piatto
   perde il verso (vedi l'osservazione sotto) e la prova era stata cambiata per non guardarlo. Ora il telefono simulato parte
   dalla presa insegnata «racchetta» e gli assi sono: X → imbardata, Y → apertura (roll), Z → beccheggio, tutti con il
   verso.
5. **Servizio**: dal B51 il telefono in partita è bloccato e i tocchi non lanciano; si lancia con il gesto (come
   `tools/e2e/natpf-servizio-lancio.mjs`) e si batte con un secondo gesto vicino al punto più alto. Il gesto arriva al motore
   come «swing» del telefono, che al servizio diventa il lancio.

**Ambiente (non il gioco):**

6. **WebGL in software**: un fotogramma della partita disegnato costa 1,5–3,0 s (misurato con il telefono in cinque giri:
   1500, 2633, 2778, 2850, 2983 ms; senza il disegno 16–17 ms, 215 ms nel giro con la macchina più carica); con la webcam
   1,3 s disegnato e 89 ms senza (landmark sintetici), e con l'inferenza vera di MediaPipe la pagina andava a 1 fotogramma
   al secondo. Il ciclo del gioco (update, orientamento della racchetta, webcam) girava una volta ogni 1,5–3 s e nelle
   finestre di 0,7 s della prova spesso non c'era nessun fotogramma: la racchetta «non seguiva». Come la parte 1v1 e le
   prove `natpf-*`, la prova toglie **solo il disegno WebGL** (`renderer.render`; `render()` con i personaggi resta, e le
   matrici del mondo e della camera si aggiornano come nel disegno) dopo averne misurato il costo, e disegna un fotogramma
   vero per ogni schermata (`stopDrawing`, `drawOnce`). Senza scheda grafica non si può fare di meglio: che la racchetta
   segua a 60 fotogrammi con il disegno acceso qui non si vede (vedi §4).

**Gioco (corretto):**

7. **Risposte mai lette** (`natpf-tennis/src/natpf/natpf_fetch.js`, nuovo): con il disegno tolto la parte 1v1 andava in
   **crash** (pagina dell'host o del P2, «Target crashed», 9 giri su 9) dopo ~8 s di partita. Causa: lo snapshot dell'host
   (`/api/match/sync`, 22 al secondo) partiva con `fetch(...).catch(() => {})` e la risposta non si leggeva mai. In Chromium
   una risposta mai letta tiene aperta la richiesta per sempre (anche dopo due raccolte della memoria forzate: 149 aperte su
   150) e da circa 160–185 aperte **ogni** richiesta della pagina fallisce con `net::ERR_INSUFFICIENT_RESOURCES` (anche le
   letture dello stato del relay). Misure con il server LAN vero:

   | Sonda | Aperte | Fallite | Dopo |
   | --- | --- | --- | --- |
   | pagina vuota, 600 POST senza leggere la risposta (ogni 45 ms) | 185 | 414 (`ERR_INSUFFICIENT_RESOURCES`) | — |
   | stessa, risposta letta | 0 | 0 | 601/601 finite |
   | **gioco vero**, 250 «colpi» (`motionController.triggerHapticFeedback`, chiamato a ogni colpo di chi gioca: POST `/api/racket/feedback`) | 201 | 56 | `fetch('/lan/status')` → «Failed to fetch» |
   | stesso, con la correzione | 0 | 0 | `/lan/status` 200 |
   | sfida 1v1 (host), prima | 58 → 120 in 4 s | poi tutte | crash |

   **Non è solo la sfida tra due computer**: la conferma del colpo `/api/racket/feedback` parte a **ogni colpo di chi
   gioca, in tutte le modalità** (dal motore base, ottobre). Nel programma Windows il gioco è servito dal server LAN
   (`https://localhost:…/?lan=1`), quindi dopo circa 180 colpi dall'avvio della pagina ogni richiesta del gioco (invio del
   registro, voce, `/lan/status`, relay) fallirebbe fino al ricaricamento. Misurato qui in Chromium 1243 (lo stesso motore di
   Electron); **nel programma Windows vero non provato**: da guardare nei registri dello stand se gli invii si fermano dopo
   un certo numero di colpi dall'avvio e riprendono solo dopo un riavvio.

   Correzione: `drain(r)` legge e scarta il corpo (risposte di poche decine di byte), `sendAndForget(url, init)` è il fetch
   «spara e dimentica» che legge sempre la risposta e non dà mai errori. Usati in: `game_engine.js` (tre POST
   `/api/match/sync`: chiusura, lobby, snapshot), `motion_controls.js` (conferma del colpo; letture dello stato del relay e
   colpi/lanci del P2 leggono anche le risposte d'errore: senza relay, per esempio sul sito statico, la lettura dello stato
   parte ogni 0,5 s), `natpf_versus_ui.js` (snapshot di pausa), `webcam_body_follow.js` (corpo del P2),
   `registro/registro_invio.js` (la risposta del Worker non si leggeva: un invio = una richiesta aperta). Test:
   `test/natpf-fetch.test.mjs` (4: aiuto, registro, punti del gioco che lo usano).

**Osservazione sul gioco (rivista nella revisione del B73, `docs/b73/unione.md` §7):** il «roll» del piatto
(`face-tracker.js`, rotazione attorno alla normale dello schermo) è `asin(y·alto) − roll0`. Perde il verso **solo** quando a
riposo l'asse y del telefono è verticale (telefono dritto: `asin` vicino a 90°), che era la posa del telefono simulato della
prova, non la presa insegnata: lì la racchetta in gioco (beccheggio = roll × 0,5) si inclinava allo stesso modo nei due
versi (−15,9° e −15,7°). Con la presa insegnata «racchetta» (`gripQuat`, gravità a riposo ≈ [0,86, 0,34, 0,37] negli assi
del telefono) il verso c'è: in node ±30° → beccheggio −14,1° / +13,5°, nel browser polso −9,7° / +9,1°. Il gioco non è
cambiato. Rendere il roll con il verso in ogni posa resta un miglioramento facoltativo, da decidere a parte (il campo `fr`
va nei colpi e nel registro).

### 2.3 Cosa verifica adesso la prova

| Parte | Verifiche | Cosa cambia rispetto a prima |
| --- | --- | --- |
| 1. server LAN | server in HTTPS con gli indirizzi di rete, gioco con `?lan=1` aggiunto dal server, `/lan/status` | pagina aperta con `?intro=0` |
| 2. telefono | QR con l'IP di rete e `?lan=1`, trasporto `lan-webrtc`; telefono pronto (profilo semplice); **campioni**: più di 20 in 0,95 s per asse (il telefono ne manda 40 al secondo); **piatto** («fo») sul computer per tutti e tre gli assi; **racchetta**: X e Y tra i due versi > 4°, Z (inclinazione di lato) > 4° del polso dalla presa di riposo **nei due versi, con segni opposti** (revisione del B73); **assi** (presa insegnata «racchetta», revisione del B73): X → imbardata, Y → apertura (roll), Z → beccheggio, sulla differenza fra i due versi; **servizio**: gesto → lancio, gesto vicino al punto più alto → battuta (scambio) | calibrazione «Giocando», telefono simulato nuovo, assi del piatto, servizio con due gesti, disegno WebGL tolto |
| 3. 1v1 | link del P2 con l'IP di rete, P2 nella stanza; **richieste del relay chiuse** (al più 6 aperte per pagina); colpi del P2 all'host; scambio; punteggio sincronizzato | nuova la verifica delle richieste aperte |
| 4. webcam (`?webcamMano=1`) | MediaPipe dal pacchetto locale con inferenza vera; poi landmark sintetici: racchetta a destra/sinistra, in alto/in basso, ruotata in terza e prima persona, niente colpi dai movimenti lenti; mano del personaggio; swing → colpo | disegno WebGL tolto; terza persona misurata nel campo (vedi §2.4); attesa della ripresa prima dello swing |
| 5. corpo | Pose e Hands dal pacchetto locale; corpo sintetico → posizione in campo (P1, e P2 attraverso il relay) | tasto B al posto del pulsante (nascosto dal B17.3), tempo di gioco al posto di quello d'orologio, host della sfida con la racchetta di prova; **non verificabile qui** (§2.4) |
| sempre | nessuna richiesta fuori dal computer, nessun errore nelle pagine (anche «pagina andata in crash»), **nessuna richiesta rifiutata per troppe richieste aperte** | nuove le ultime due |

### 2.4 Webcam

**Mano → racchetta (parte 4).** Con l'inferenza vera di MediaPipe sul fotogramma finto (3–5 s ciascuna in software) e il
disegno WebGL la pagina andava a 1 fotogramma al secondo: tra una posa e l'altra il gioco non avanzava. Con i landmark
sintetici al posto dell'inferenza e il disegno tolto, la webcam elabora 41–50 fotogrammi al secondo e la racchetta segue:
prima persona Δx 0,194 e Δy 0,326 di schermo, rotazione 15,7°; terza persona Δy 0,031, rotazione 23°.

In terza persona la soglia di schermo della prova del 20/10 (Δx > 0,01) **con la camera di oggi è al limite o sotto**:
la racchetta si sposta di **0,141 m nel campo** (la mano del personaggio di 0,144 m) quando la mano va da destra a sinistra,
ma la camera del servizio è a **13,1 m** e di sbieco (fov 49°): sullo schermo sono **0,006–0,010** (circa 3–5 px su 1100),
in cinque giri. Anche messa di fronte, 0,141 m a 13,1 m con fov 49° e formato 1100×680 darebbero al più 0,015. La
verifica in terza persona guarda ora lo spostamento **nel campo** (≥ 8 cm, nel verso giusto) e il **verso** sullo schermo
(Δx > 0); in prima persona (camera a 1,2 m) resta la soglia sullo schermo. Stessa cosa per la mano del personaggio (prima
Δx > 0,02 di schermo).

Lo swing veloce della mano non partiva perché la partita era in pausa: il fotogramma vero disegnato per la schermata
appena prima (`drawOnce`, ~2,5 s in software) ferma la webcam più di `WEBCAM_WATCH.frameGapMs` (1 s), il gioco va in pausa
«webcam ferma» e in pausa i colpi non valgono (`natpf_ui._gateDesktopInput`): misurato `natpfPaused: true` all'istante del
colpo, riconosciuto come «anticipato: swing veloce di lato». La prova ora aspetta la ripresa prima dello swing (succede solo
per la schermata).

**Corpo (parte 5): non verificabile qui.** Con la webcam predefinita (argon, 1280×720) un fotogramma costa 0,4–0,7 s
anche senza disegno e senza inferenza (macchina scarica; 2,6 s con le prove del gioco in parallelo): il gioco va in pausa
«webcam ferma» a ogni buco oltre 1 s e, con il passo del motore al più 0,08 s, avanza 5–30 volte più piano del tempo vero.
Misurato: P1 a x = 1,35 / 0,40 / −0,55 / −1,51 (servono > 2 a destra e < −2 a sinistra) in un giro, fermo a 1,35 in un
altro; P2 attraverso il relay −1,99 / +1,98 sull'host (soglia ±2: il verso è giusto, il bersaglio arriva in ritardo dalla
pagina lenta del P2) e la pagina del P2 ferma a −2,35. Corretti nella prova i punti vecchi (tasto B, tempo di gioco, host
con la racchetta di prova); le verifiche restano quelle di prima e qui restano rosse: vanno provate su un PC con la scheda
grafica.

### 2.5 Esito

Giro finale (ramo `b73-prove-b` con la correzione del gioco, build rifatta), dalla cartella `natpf-tennis`:
`ONLY=telefono,1v1,webcam … node test/e2e/lan-e2e.mjs` → **32/32**, uscita 0, 175 s. **Attenzione** (revisione del B73,
`docs/b73/unione.md` §7): in quel giro la verifica dell'asse Z non guardava il verso; con il verso, sulla posa dritta di
allora, la parte del telefono è 7/9 (polso −10,4° / −10,2°, stesso segno). Con il telefono simulato nella presa insegnata e
il verso controllato: parte del telefono **9/9** (polso con Z −9,7° / +9,1°), `ONLY=telefono` 15/15.

| Parte | Esito | Numeri |
| --- | --- | --- |
| 1. server LAN | 3/3 | — |
| 2. telefono | 9/9 | campioni 33/33/33; racchetta X 46,3°, Y 35,1° tra i due versi, polso con Z −10,4° / −10,2°; assi X [−0,2, 63,9, 0], Y [0, 0, −63,4], Z [−15,9, 0, 0,1] / [−15,6, 0, −0,1]; lancio e battuta dal telefono, scambio |
| 3. 1v1 | 6/6 | link del P2 con l'IP di rete, P2 nella stanza; scambio di 35 colpi, 17 colpi del P2 all'host, punteggio uguale sui due computer, richieste del relay aperte alla fine: 0 e 1 |
| 4. webcam | 11/11 | vedi §2.4 |
| sempre | 3/3 | nessuna richiesta fuori dal computer, nessun errore, nessuna richiesta rifiutata |

Parte 5 (corpo) a parte, `ONLY=corpo`, con tutte le correzioni della prova: **11/16** (giro con le prove del gioco in
parallelo): rosse le cinque verifiche della posizione in campo (tre del P1, due del P2), per i motivi del §2.4; verdi
Pose e Hands dal pacchetto locale, il corpo visto e calibrato, il ritorno al movimento automatico. Un giro prima della
correzione dell'host della sfida: 11/15 (la parte del P2 si fermava ad aspettare lo scambio). Prima del B73 la prova non
arrivava a questa parte (si fermava alla calibrazione o andava in crash nella parte 1v1).

Giri intermedi, per la storia della causa: la parte 1v1 senza la correzione del gioco è andata in crash in **9 giri su 9**
(«Target crashed», una o tutte e due le pagine, dopo 5–15 s di partita); con la correzione 2 giri su 2 senza crash
(12/12 da sola: scambio di 14 colpi, 7 colpi del P2, richieste aperte 0 e 0).

## 3. Prove

| Suite | Comando | Esito |
| --- | --- | --- |
| Gioco | `cd natpf-tennis && npm test` | **1919/1919** (1915 + 4 di `natpf-fetch.test.mjs`), 7 min 11 s con una prova nel browser in parallelo |
| Sito e pagina del telefono | `node --test tools/test/*.test.mjs` | **322/322** |
| Server LAN | `(cd tools/lan && node --test test/*.test.mjs)` | **13/13** |
| Programma Windows | `(cd natpf-desktop && npm test)` | **56/56** |
| Build | `cd natpf-tennis && npm run build` | ok |
| Registro con le misure del telefono | `cd tools/e2e && node natpf-registro-sensori.mjs` | **23/23**, esce da sola (0) dopo 91 s |
| LAN nel browser | `node test/e2e/lan-e2e.mjs` (vedi §2.5) | telefono, 1v1, webcam verdi; corpo rosso (ambiente) |

Sonde (non nel repository, nella cartella temporanea dell'agente): `sonda-post-tmp.mjs` (POST dal browser al server LAN
letti e non letti, con la raccolta della memoria forzata) e `sonda-colpi-tmp.mjs` (250 colpi nel gioco vero servito dal
server LAN, prima e dopo la correzione).

Commit locali sul ramo `b73-prove-b` (niente push): la correzione del gioco, la prova del registro, la prova LAN con
questo documento.

## 4. Non verificato

- Nessun telefono vero, nessuna webcam vera, nessun programma Windows (Electron) vero: Chromium senza scheda grafica,
  telefono simulato, camera finta di Chromium, landmark sintetici della mano e del corpo.
- La perdita di richieste con le risposte mai lette è misurata in Chromium 1243 headless (gioco vero servito dal server
  LAN); nel programma Windows non provata. Da verificare nei registri della fiera (§2.2 punto 7).
- Con il disegno WebGL acceso la prova non può dire niente qui (1,5–3,0 s a fotogramma): che la racchetta segua il telefono
  e la mano a schermo, fotogramma per fotogramma, va guardato su un PC con la scheda grafica. Lo stesso per «segui il
  corpo» (parte 5), rossa qui per la lentezza della webcam in software.
- La parte webcam usa la traccia della mano di confronto (`?webcamMano=1`); la webcam predefinita (argon) qui non è provata
  con una mano, solo dalla parte 5 e dai test in Node.
- Disco del contenitore quasi pieno durante le prove (da 0 a ~390 MB liberi): non ho cancellato niente di altri; i crash
  della parte 1v1 sono stati ripetuti più volte anche per questo dubbio, prima di trovare la causa vera (§2.2 punto 7).
- Il «roll» del piatto senza verso con il telefono dritto (§2.2, osservazione): non è la presa insegnata e il gioco non è
  cambiato; la prova ora parte dalla presa insegnata e controlla il verso (revisione del B73). Roll con il verso in ogni
  posa: miglioramento facoltativo, da decidere.
