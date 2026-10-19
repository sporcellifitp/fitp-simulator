# NATPF Simulator · tennis 1v1 (MVP)

Primo MVP del tennis di NATPF Simulator: un motore arcade 3D (il «motore base», three.js) con l'**ambientazione
delle Nitto ATP Finals**, lo **smartphone come racchetta**, musiche e voce del giudice di sedia proprie. Versione
white label per uso interno. Solo **1v1**: contro la CPU oppure tra due computer.

- **Gameplay**: quello del motore base, così com'è: fisica, colpi (topspin, slice, lob, smash), timing con
  sweet spot, CPU facile/esperta, punteggio, moviola, camere, animazioni ed espressioni dei personaggi, effetti.
- **Arena**: quella di NATPF Simulator (`../site/js/tennis/arena.js`), usata senza modifiche: tabelloni, sponsor,
  pannelli LED, segnapunti, tribune, cubo, stendardi e pianta originali. È simmetrica, quindi ognuno dei due
  giocatori la vede dal proprio lato con lo stesso orientamento.
- **Racchetta**: smartphone NATPF (QR, impugnatura, calibrazione breve, gesti) **oppure** webcam
  (MediaPipe Hands con optical flow di riserva). Mouse e tastiera restano sempre disponibili.
- **Visuale**: terza persona oppure prima persona (racchetta e mani in primo piano). Si sceglie dal menu,
  con il pulsante «Vista» o con il tasto **V**, sia per P1 sia per P2.
- **2v2**: escluso dall'MVP ma non rimosso. Il doppio del motore base resta dietro `isDoubles`
  (`src/natpf/match_format.js`), per l'Opzione B.

Analisi, architettura, verifiche e limiti: [../docs/NATPF_TENNIS_MVP.md](../docs/NATPF_TENNIS_MVP.md).

## Menu per chi gioca la prima volta, riscaldamento in campo e pausa

Pensato per fiere ed eventi: ogni visitatore vede il gioco per la prima volta. Una pagina alla volta, un pulsante
grande per andare avanti, «Indietro» sempre visibile, forme arrotondate (`natpf-round.css`, `natpf-flow.css`).

1. **Benvenuto**: «Il tuo telefono è la racchetta», «Gioca» e «Come si gioca».
2. **Con cosa giochi?** Smartphone o webcam (toccare la tessera porta avanti) e mano destra o sinistra.
3. **Collega**:
   - smartphone: QR nella pagina e tre passi che si spuntano da soli (inquadra il QR, «Attiva i sensori», impugna
     in verticale); appena i sensori sono attivi si entra in campo da soli;
   - webcam: anteprima, controllo della mano e scelta fra corsa automatica e corsa col corpo.
4. **Riscaldamento in campo** (`natpf_training.js`), con un lanciapalle e senza avversario. **Calibrazione e
   allenamento sono la stessa cosa**: ogni gesto chiesto dal telefono è una palla che rallenta, si ferma davanti alla
   racchetta e riparte quando il gesto è riconosciuto. La calibrazione si conferma da sola, poi dritto 2, rovescio 2,
   servizio 1, angoli 3. «Salta il riscaldamento» è sempre visibile: con il telefono non calibrato si gioca in
   **modalità semplice** (dritto e rovescio li sceglie il gioco).
5. **Partita**: CPU facile, CPU esperta o sfida un amico; durata (1 game di default) e visuale; poi **Gioca**.

Dietro il menu gira una dimostrazione: con il menu aperto nessun colpo arriva al motore, da nessuna racchetta.
Tastiera: Invio avanti, Esc indietro, H guida. **Come si gioca** è una finestra unica con tutte le istruzioni
visibili insieme, ciascuna con una clip del gioco vero (`public/guide/*.jpg`, rigenerabili con
`node scripts/guide-clips.mjs` mentre gira `npm run dev`).

- **Mouse e tastiera nascosti**: servono solo per le prove al computer. Digita **natpf** nel menu (easter egg)
  per mostrarli e attivarli. Digitandolo di nuovo si nascondono.
- **Esito del colpo senza barra del tempo**:
  - un anello colorato a terra, nel punto in cui atterrerà la palla, che pulsa al rimbalzo: verde perfetto,
    giallo in anticipo, in ritardo o buono, rosso fuori o mancata;
  - un lampo dello stesso colore sulla racchetta e una scritta breve;
  - sul telefono una vibrazione: lunga per il perfetto, doppia corta per l'errore.
- **Mancino**:
  - il proprio personaggio è specchiato, in prima e in terza persona, con la racchetta nella sinistra;
  - dritto e rovescio si scambiano;
  - al servizio la palla parte dall'altra mano.

  In prima persona la mano libera si vede solo al proprio servizio, per il lancio di palla.
- **HUD pulito**: restano tabellone, riga dei game sotto il tabellone, esito del colpo e il pulsante **pausa**
  (❚❚ o Esc). La pausa raccoglie musica, voce, visuale, corsa col corpo, moviola, telefono, aiuto, «Torna al
  menu» e «Riprendi».
- **Player 2** con link di invito: una scheda con racchetta, visuale e mano, poi «Entra in campo».

Codice: `src/natpf/natpf_lobby.js` (pagine ed easter egg), `natpf_training.js` (riscaldamento), `natpf_onboarding.js` (guida), `natpf_shot_feedback.js`,
`natpf_hand.js`, `natpf_pause.js`, `natpf_tiles.js`; stili in `natpf.css`, `natpf-round.css` e `natpf-flow.css`.

## Musica, voce e HUD

- **Musica originale generata in tempo reale** con Web Audio (`src/natpf/natpf_music.js`): sei brani composti
  per NATPF, scritti nota per nota nel sorgente (accordi, basso, arpeggio, melodia, batteria) e suonati da un
  sequencer con look-ahead, quindi in loop senza stacchi, offline e senza file audio né licenze:
  «Notte a Torino» (lobby), «Ingresso in campo» (presentazione, poi passa da sola allo scambio), «Scambio a tutto
  campo» (partita), «Punto decisivo» (palla game, break o match), «Moviola» (replay), «Gloria al Pala» (vittoria).
  Pulsante «Musica» dell'HUD per spegnere e riaccendere musica ed effetti.
- **Effetti** di colpo, rimbalzo, rete, lancio, pubblico e interfaccia: sintetizzati (`src/audio_engine.js`).
- **Voce del punteggio in italiano** con la sintesi vocale del browser (`src/natpf/natpf_voice.js`): «quindici
  zero», «trenta pari», «parità», «vantaggio», «palla game», «palla break», «palla match», «game», «game, set e
  partita», «fuori», «rete», «ace», «bel colpo». Usa una voce italiana del sistema (per esempio Microsoft Elsa o
  Cosimo su Windows, Google italiano su Chrome); se non c'è resta in silenzio. Pulsante «Voce» dell'HUD per
  spegnerla (la scelta resta salvata).
- **HUD** in stile regia televisiva NATPF (`natpf-hud.css`): tabellone a striscia, esito del colpo, banner, moviola, pulsanti e schermata finale, tutti in italiano (`src/natpf/natpf_i18n.js` traduce le
  etichette del motore quando le mostra).

## Avvio

Serve Node.js 20 o più recente. La cartella `../site` del repository deve esserci, perché è da lì che
arrivano i moduli NATPF.

```bash
npm install
npm run dev          # http://localhost:3000 (Vite + relay della partita 1v1)
```

Non servono file esterni: arena, personaggi, racchetta, pallina, musica, voce e QR sono creati nel codice, e
MediaPipe Hands (webcam) arriva con `npm install`. Per giocare senza internet vedi la **versione LAN** qui sotto.

## Versione LAN (anche senza internet)

Un computer fa da server HTTPS sulla rete locale: serve il gioco, la pagina del telefono NATPF (`/natpf/`), il
relay della partita 1v1 (`/api/*`) e la segnalazione del telefono (`/lan-signal`). Internet serve solo la prima
volta, per installare le dipendenze e scaricare il pacchetto offline.

### Pacchetto LAN pronto per Windows

`node lan/pacchetto.mjs --out=cartella --node=node-vXX-win-x64.zip` (dopo `npm run build` e `npm ci` in
`../tools/lan`) prepara una cartella da zippare con: gioco già costruito e pacchetto offline, server LAN con le sue
dipendenze, Node.js portatile, `AVVIA NATPF LAN.cmd`, `PREPARA I TELEFONI.cmd` e `LEGGIMI.txt` (istruzioni in
`lan/LEGGIMI.txt`). Il certificato lo crea `../tools/lan/certificato.mjs` al primo avvio, senza mkcert: autorità
locale del computer, certificato del server per gli indirizzi di rete attuali (rifatto da solo se cambiano) e
`natpf-ca.crt` da installare su telefoni e computer, distribuito da `PREPARA I TELEFONI.cmd` con una pagina e un QR.

### Avvio su Windows (dai sorgenti)

1. Installa Node.js 20 o più recente. Collega computer, telefono ed eventuale secondo computer alla stessa Wi-Fi
   (senza isolamento tra dispositivi).
2. **Certificato, una volta per computer e rete**: è lo stesso di NATPF Simulator in `../tools/lan/certs/`
   (`cert.pem`, `key.pem`), per l'IP di rete esatto del computer e firmato da una CA che il telefono considera
   attendibile, per esempio mkcert. La procedura è in [../tools/lan/README.md](../tools/lan/README.md). Il solo avviso
   di certificato ignorato **non basta**: il browser del telefono non dà i sensori e la pagina non è un contesto
   sicuro.
3. Doppio clic su **`avvia-lan.cmd`**. La prima volta installa le dipendenze (`tools/lan` e questa cartella),
   completa il pacchetto offline e fa la build; le volte successive rifà la build solo se i sorgenti sono cambiati.
   Poi avvia il server e scrive nella finestra gli **indirizzi di rete** (per esempio
   `https://192.168.1.41:8443/?lan=1`). Si apre anche la guida su `http://127.0.0.1:8080/lan/`, visibile solo dal
   computer, che controlla certificato, scadenza e IP e mostra i pulsanti per aprire il gioco.
4. Apri il gioco sul computer dall'indirizzo di rete (va bene anche `https://localhost:8443`: QR e link di invito
   usano comunque l'IP di rete). Tieni aperta la finestra del programma mentre giochi.

Opzioni: `avvia-lan.cmd --build` (rifà la build), `--offline` (non prova mai gstatic per gli asset mancanti),
`--port=8443`, `--setup-port=8080`, `--cert=… --key=…`. Su macOS/Linux, da questa cartella:
`node lan/prepare.mjs && npm run lan`.

Firewall: consenti Node.js sulla rete privata (TCP 8443 per HTTPS, UDP per il WebRTC diretto del telefono).

### Telefono in LAN

Racchetta → Smartphone, poi inquadra il QR. In LAN il QR porta `?lan=1`: il telefono si collega con il trasporto
LAN di NATPF (segnalazione WebSocket sul computer, due DataChannel WebRTC diretti, nessun server STUN/TURN o
PeerJS). Così arriva anche il **flusso continuo dei sensori** (circa 33–40 campioni al secondo) e la racchetta
virtuale segue il polso tra un colpo e l'altro, con l'impugnatura NATPF: telefono in verticale nel palmo, schermo
verso il palmo. Rotazione attorno al lato corto del telefono → beccheggio della testa, attorno al manico → apertura e
chiusura del piatto, attorno alla normale dello schermo → testa che oscilla a destra e a sinistra.

### 1v1 tra due computer in LAN

Scegli 1v1 nel menu: il link per il Player 2 usa l'IP di rete, per esempio
`https://192.168.1.41:8443/?room=AT-XXXX&role=p2&lan=1`. Aprilo sull'altro computer (anche lì il certificato deve
essere attendibile, oppure i sensori e la webcam non sono garantiti). Il relay della stanza vive nel server LAN.

### Webcam in LAN e offline

MediaPipe Hands arriva dal pacchetto npm `@mediapipe/hands` (versione fissata, Apache-2.0; Pose da `@mediapipe/pose`) ed è servito dal
computer sotto `/assets/mediapipe/hands/`; il CDN della stessa versione resta solo come riserva, e se mancano
entrambi la webcam usa l'optical flow. Oltre a far partire i colpi, la mano ora muove **di continuo** racchetta e mano
del personaggio, in prima e in terza persona: spostamento a destra/sinistra e in alto/in basso, rotazione della mano
→ rotazione del piatto. La posizione di riposo si adatta in pochi secondi a dove tieni la mano; se la mano sparisce
la racchetta torna alla posa di riposo.

**Movimento: automatico / segui il corpo.** Con la racchetta Webcam compare nell'HUD il pulsante «Movimento»
(tasto **B**, oppure `?move=body`). Con «segui il corpo» MediaPipe Pose (pacchetto `@mediapipe/pose`, modello lite,
offline) trova spalle e anche: spostarti a destra o a sinistra davanti alla webcam porta il giocatore a destra o a
sinistra in campo, avvicinarti alla webcam lo porta verso la rete, allontanarti verso il fondo. La posizione in cui
ti vede per la prima volta vale come centro del campo. Vale solo durante lo scambio (al servizio i giocatori restano
al loro posto) e per P1 e P2, in prima e in terza persona; il colpo resta legato alla mano. Se esci
dall'inquadratura o la webcam non ti vede per più di 0,4 s, torna il movimento automatico e il pulsante lo dice. Il
valore predefinito è **automatico**: seguire il corpo chiede 2–3 m liberi davanti allo schermo, il busto intero
nell'inquadratura e di giocare in piedi, mentre l'automatico funziona anche da seduti o vicino al monitor.

### Pacchetto offline

L'unico pacchetto da preparare è MediaPipe per la webcam (Hands e Pose lite, circa 41 MB, dai pacchetti npm):
`npm run assets` lo copia in `public/assets/` e scrive `public/assets/manifest.json` con dimensioni e sha256;
`npm run assets:check` dice cosa manca. Senza MediaPipe la webcam usa l'optical flow.

### Diagnostica del telefono

Maiusc+D (o `?diag=1`) apre il pannello con i tempi di ogni colpo (rilevamento, preparazione, consegna, attesa della
palla, schermo), le frequenze dei flussi e «Registra» per salvare una sessione; `scripts/audit/replay-recording.mjs`
la rianalizza. Analisi completa, mappatura dei gesti e problemi aperti:
[../docs/NATPF_GESTI_E_LATENZA.md](../docs/NATPF_GESTI_E_LATENZA.md).

### Smartphone come racchetta

1. Nel menu scegli **Smartphone**: nella pagina «Collega» compare il QR.
2. Si gioca solo con il telefono **in verticale nel palmo**, schermo verso il palmo, come il manico (la presa
   orizzontale è stata provata e tolta: scomoda).
3. Inquadra il QR, tocca «Attiva i sensori»: si entra in campo e il riscaldamento fa la calibrazione con quattro palle
   (dritto e rovescio alternati).
4. Al servizio un primo gesto lancia la palla e il secondo la colpisce in alto. Nello scambio:
   - **tempo**: conta l'istante vero del colpo misurato dal telefono. Un attimo prima → incrociato, un attimo dopo →
     lungolinea (finestra più larga contro la CPU facile);
   - **polso**: ruotando il manico all'impatto, rispetto al proprio dritto, si apre o si chiude l'angolo;
   - **forza**: metà dal gesto rispetto alla calibrazione, metà dalla velocità vera del telefono; un gesto lento
     resta corto e la CPU attacca;
   - **preparazione**: mentre la palla arriva si può portare indietro il telefono (nel verso opposto al colpo) e fare
     tutti i micro-movimenti dell'attesa. Il gioco dice al telefono da che parte arriva la palla: un gesto nel verso
     opposto resta in attesa e, se subito dopo arriva il colpo, conta come preparazione (la racchetta in campo si
     carica da quella parte e il colpo vale come «preparato»: più pulito e un poco più forte); se il colpo non arriva
     vale come colpo, con il suo istante vero. Online il telefono manda anche il giroscopio a 30 Hz, così la
     racchetta in gioco segue i movimenti prima del colpo (in LAN c'era già il canale binario);
   - **colpi speciali** rispetto al proprio dritto: dal basso verso l'alto lob, dall'alto verso il basso tagliato,
     tagliato e lento palla corta.

Il telefono ha bisogno di una pagina **https** per leggere i sensori di movimento:

- in LAN avvia `npm run dev:https` (certificato autofirmato) e apri il gioco sul computer dall'indirizzo di rete
  mostrato da Vite, per esempio `https://192.168.1.41:3000`; sul telefono accetta l'avviso del certificato;
- oppure pubblica la build in https;
- oppure, se il gioco resta in http, indica una pagina del telefono già pubblicata in https con
  `?phone=https://…/tennis/racchetta.html` (o con `VITE_NATPF_PHONE_PAGE`). Il protocollo deve essere quello di
  `../site/js/tennis/`.

Fuori dalla LAN il collegamento passa da WebRTC con il server di segnalazione pubblico di PeerJS (solo gesti e
servizio, niente flusso continuo dei sensori). Per le prove senza internet: `?peer=127.0.0.1:9000` con
`node ../tools/e2e/peer-server.mjs`, oppure la versione LAN (`?lan=1`), che è quella consigliata.

### Skill gap: angolo e forza contano

Gli scambi non sono più infiniti e non li vince sempre la CPU: chi colpisce in tempo, angolato e forte fa il punto,
chi sbaglia lo paga. Vale per telefono, webcam, mouse e tastiera (`src/natpf/natpf_skill.js`).

- **Tempo.** Lo swing in anticipo viene tenuto fino allo sweet spot per poco (Casual 0,30 s, Pro 0,16 s, 1v1
  0,22 s; prima 0,48 s per tutti) ed è «perfetto» solo con poco anticipo. Il voto dipende dal tempo, non dalla mira.
- **Colpo del giocatore.** La mira decide la direzione (prima i colpi centrali andavano da soli nel campo libero);
  con potenza alta vicino alle righe si può uscire, fuori tempo si va in rete o lunghi. I colpi perfetti di fila
  accelerano la palla, fino a quella che passa ancora la rete.
- **CPU.** Tempo di reazione, lettura imperfetta delle palle veloci e angolate, velocità e portata limitate: i colpi
  angolati e potenti possono essere vincenti. I suoi errori crescono con angolo, velocità, pressione e lunghezza
  dello scambio; sotto pressione rimanda palle alte da smash, sulle palle deboli attacca. Palle corte da fondo e
  lob sopra la CPU a rete sono sfruttabili.
- **Casual** resta per principianti: assistenza più lunga e CPU più lenta, ma gli scambi finiscono.

Audit su molti punti simulati con il motore vero (profili preciso, medio, impreciso):

```bash
npm run audit:rally                     # Casual e Pro, tutti i profili
npm run audit:rally -- --difficulty=pro --points=300
```

### 1v1 tra due computer

Scegli **Sfida un amico** nella lobby: il gioco crea una stanza e mostra il link per il Player 2
(`/?room=AT-XXXX&role=p2`). Il P2 sceglie racchetta e visuale e vede il campo dal proprio lato. La partita gira
sul computer di P1 (host); lo stato e i colpi di P2 passano dal relay della partita, che vive nel server Vite
(`npm run dev` o `npm run preview`) e nel server LAN (`avvia-lan.cmd`). Su un sito
solo statico il 1v1 tra computer non è disponibile.

### Build

```bash
npm run build        # dist/ (gioco + pagina del telefono NATPF in dist/natpf/ + grafiche dell'arena)
npm run preview      # http://localhost:3000 con il relay 1v1
npm test             # test dell'integrazione NATPF e della versione LAN
npm run lan          # server LAN HTTPS sulla build (vedi «Versione LAN»)
npm run test:e2e-lan # prova nel browser della versione LAN: Chrome con GPU, openssl, npm ci in ../tools/lan e
                     # ../tools/e2e; ONLY=telefono,1v1,webcam per una parte sola
npm test             # test dell'integrazione NATPF ↔ motore base, menu, riscaldamento, colpo del telefono e skill gap
npm run audit:rally  # audit degli scambi (colpi per punto, punti vinti per profilo)
```

## Comandi

| | Mouse / tastiera | Webcam | Smartphone (NATPF) |
|---|---|---|---|
| Servizio | ↑ / W / T lancia, Spazio colpisce | mano verso l'alto, poi swing | gesto, poi gesto in alto |
| Colpo | Spazio o trascinamento; 1–4 per il tipo | swing davanti alla webcam | gesto naturale con il telefono |
| Mira | Q/E o A/D, direzione del trascinamento | direzione dello swing | tempo vero del colpo (prima incrociato, dopo lungolinea) e rotazione del polso |

Altri tasti: **V** prima/terza persona, **C** camera, **R** moviola.

Parametri utili: `?view=first|third`, `?mode=casual|pro|1v1`, `?room=…&role=p2`, `?phone=…`, `?peer=…`.

## Struttura

- `src/` – motore base (riformattato con Prettier). Le modifiche al motore sono agganci brevi, marcati `NATPF:`.
- `src/natpf/` – integrazione: `natpf_arena.js` (arena e luci), `natpf_phone_racket.js` (telefono → colpi e
  inclinazione della racchetta), `natpf_camera.js` (prima persona), `natpf_ui.js` (menu, QR e calibrazione,
  invito P2), `match_format.js` (1v1 / Opzione B 2v2), `natpf_music.js` (colonna sonora), `natpf_voice.js`
  (voce italiana), `natpf_i18n.js` (testi dell'HUD), `natpf_character.js` e `natpf_portrait.js` (personaggio,
  racchetta, pallina e ritratti), `natpf_lobby.js`, `natpf_onboarding.js`, `natpf_tiles.js` (lobby e aiuto).
- `lan/` – server LAN: `server.mjs` (avvio guidato di `../tools/lan`), `game-handler.mjs` (build, relay, pacchetto
  offline, pagina del telefono, `?lan=1`), `prepare.mjs` (dipendenze, asset, build se serve); `avvia-lan.cmd`.
- il relay 1v1 in `scripts/`, `scripts/offline-assets.mjs` e `download-assets.mjs` (pacchetto offline).
- `src/natpf/webcam_hand_pose.js` (mano dalla webcam → racchetta), `natpf_lan.js` (IP di rete per QR e invito).
  inclinazione della racchetta, presa orizzontale), `natpf_skill.js` (skill gap: assistenza, rischio, CPU), `natpf_camera.js` (prima persona), `natpf_ui.js` (menu, QR e calibrazione,
  invito P2), `match_format.js` (1v1 / Opzione B 2v2).
- `scripts/natpf-site-plugin.mjs` – riuso di `../site`: alias `@natpf`, pagina del telefono sotto `/natpf/`,
  copia nella build delle sole dipendenze necessarie.
- `scripts/audit/` – motore senza browser (`headless-engine.mjs`) e audit degli scambi (`rally-balance.mjs`,
  risultati in `results/`).
- `test/` – test Node dell'integrazione.
- `../site/js/tennis/face-tracker.js` – orientamento del piatto sul telefono (presa orizzontale), condiviso con
  la pagina del telefono di NATPF Simulator, dove resta un'opzione: la presa predefinita là è quella verticale.

Marchi e grafiche dell'arena: vedi `../site/assets/arena/README.md`. Uso interno FITP eSports.
