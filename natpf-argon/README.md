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

Analisi, architettura, verifiche e limiti: [../docs/NATPF_ARGON_MVP.md](../docs/NATPF_ARGON_MVP.md).

## Menu, onboarding e punto di prova

- **Lobby in stile console** sopra l'arena, una scelta per schermata:
  **1 Partita** (CPU facile, CPU esperta, sfida un amico; durata), **2 Racchetta** (smartphone, webcam,
  mouse/tastiera, con lo stato di ognuna), **3 Visuale** (terza o prima persona), poi **Gioca**. Si naviga
  anche con la tastiera: ← → scegli, Invio avanti, Esc indietro, H aiuto.
- **Come si gioca**: cinque passi (presa, giocatore che corre da solo, servizio, colpi, tempo giusto), con le
  istruzioni della racchetta scelta. Si apre da solo la prima volta e poi con «Come si gioca», con il pulsante
  «Aiuto» durante la partita o con **H**. A partita in corso, mentre è aperto, il gioco resta in pausa.
- **Punto di prova**: un punto contro la CPU facile che non conta per il punteggio, con un allenatore che dice
  cosa fare («Servi tu», «Colpisci adesso, mentre è in alto», «Colpisci ora!») e com'è andato il colpo; alla
  fine torna alla lobby con il riepilogo e il pulsante «Riprova».

Codice: `src/natpf/natpf_lobby.js`, `natpf_onboarding.js`, `natpf_tiles.js`, stili in `natpf.css`.

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
- **HUD** in stile regia televisiva NATPF (`natpf-hud.css`): tabellone a striscia, esito del colpo, tempo del
  colpo, banner, moviola, pulsanti e schermata finale, tutti in italiano (`src/natpf/natpf_i18n.js` traduce le
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

### Avvio su Windows

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

MediaPipe Hands arriva dal pacchetto npm `@mediapipe/hands` (versione fissata, Apache-2.0) ed è servito dal
computer sotto `/assets/mediapipe/hands/`; il CDN della stessa versione resta solo come riserva, e se mancano
entrambi la webcam usa l'optical flow. Oltre a far partire i colpi, la mano ora muove **di continuo** racchetta e mano
del personaggio, in prima e in terza persona: spostamento a destra/sinistra e in alto/in basso, rotazione della mano
→ rotazione del piatto. La posizione di riposo si adatta in pochi secondi a dove tieni la mano; se la mano sparisce
la racchetta torna alla posa di riposo. Lo spostamento del corpo davanti alla webcam (il giocatore che si muove in
campo) è in sviluppo; per ora il giocatore si muove da solo.

### Pacchetto offline

L'unico pacchetto da preparare è MediaPipe Hands per la webcam (circa 23 MB, dal pacchetto npm):
`npm run assets` lo copia in `public/assets/` e scrive `public/assets/manifest.json` con dimensioni e sha256;
`npm run assets:check` dice cosa manca. Senza MediaPipe la webcam usa l'optical flow.

### Smartphone come racchetta

1. Nella lobby, al passo **2 Racchetta**, scegli **Smartphone**: compare il QR.
2. Inquadralo con il telefono, tocca «Attiva i sensori» e segui i passi: impugna, prova, verifica, pronto.
3. **Impugnatura**: telefono in verticale nel palmo, schermo verso il palmo, come il manico di una racchetta.
   Bastano quattro gesti comodi; poi una prova libera e «Conferma la racchetta».
4. Al servizio un primo gesto lancia la palla e il secondo la colpisce in alto. Nello scambio colpisci quando la
   palla arriva alla racchetta: il verso del gesto sceglie dritto o rovescio, l'inclinazione la mira, la forza
   la velocità. Un gesto verso l'alto fa un lob, un gesto tagliato uno slice.

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
```

## Comandi

| | Mouse / tastiera | Webcam | Smartphone (NATPF) |
|---|---|---|---|
| Servizio | ↑ / W / T lancia, Spazio colpisce | mano verso l'alto, poi swing | gesto, poi gesto in alto |
| Colpo | Spazio o trascinamento; 1–4 per il tipo | swing davanti alla webcam | gesto naturale con il telefono |
| Mira | Q/E o A/D, direzione del trascinamento | direzione dello swing | verso e inclinazione del gesto |

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
- `scripts/natpf-site-plugin.mjs` – riuso di `../site`: alias `@natpf`, pagina del telefono sotto `/natpf/`,
  copia nella build delle sole dipendenze necessarie.
- `test/` – test Node dell'integrazione.

Marchi e grafiche dell'arena: vedi `../site/assets/arena/README.md`. Uso interno FITP eSports.
