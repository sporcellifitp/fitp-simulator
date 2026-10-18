# NATPF Simulator, tennis 1v1: analisi e MVP

Checkpoint: 17 ottobre 2026. Branch `feature/natpf-argon-mvp`, cartella `natpf-argon/`, partito da
`refactor/natpf-audit-20261015` (160b648), che contiene già la PR #1. La versione NATPF Simulator esistente
(`site/tennis/`) non è stata modificata.

## Obiettivo

Primo MVP giocabile **1v1** con:

- il gameplay di un **tennis arcade 3D** già pronto (il «motore base», three.js);
- l'arena delle **Nitto ATP Finals** di NATPF Simulator;
- **smartphone o webcam** come racchetta;
- visuale in **prima o terza persona**, per entrambi i giocatori.

Il 2v2 è escluso, ma l'architettura resta pronta per introdurlo (Opzione B).

## Analisi dei progetti

### Motore base (base principale)

App Vite di partenza, con sorgenti minificati che ho riformattato con Prettier senza toccarne la logica
(commit di importazione 529ec20).

| Modulo | Ruolo |
|---|---|
| `game_engine.js` | Motore: scena three.js 0.160, fisica a 120 Hz, regole e punteggio, IA Casual/Pro, servizio con lancio, timing con sweet spot e assistenza, replay, camere (Rally, Serve, Net, Aerial, Showcase), multiplayer host/guest |
| `motion_controls.js` | Input: mouse (trascinamento), tastiera, webcam (MediaPipe Hands con optical flow di riserva), telefono tramite relay HTTP |
| `racket_kinematics.js`, `mii_body_animation.js`, `mii_facial_fx.js`, `mii_model_overhaul.js`, `swing_vfx.js` | Racchetta (anche con inclinazione dal telefono), animazioni ed espressioni dei personaggi, scie e impatti |
| `hud_ui.js`, `mii_avatars.js`, `audio_engine.js` | HUD, menu, vittoria, musica e annunci (ora sostituiti: vedi «Identità NATPF») |
| `vite.config.ts` | Relay della partita (`/api/match/*`, `/api/racket/*`) e proxy degli asset remoti |

Cosa ho trovato, rilevante per l'integrazione:

- **Il motore base è un gioco di doppio.** Ci sono sempre 4 attori; i compagni giocano volée e coprono la rete.
- **La pagina del telefono del motore base non c'è.** `companion.html` e i QR puntavano al server pubblico
  dell'app di partenza e il pulsante del telefono era nascosto via CSS.
- **Il 1v1 tra computer funziona davvero:** l'host è autorevole e manda uno snapshot ogni 45 ms; il guest manda i
  colpi. Però passa dal relay del server Vite, quindi non funziona su un sito solo statico.
- **La racchetta segue già l'inclinazione del telefono** (`phoneState.orientation` → `liveInput`).
- **P2 vede già il campo dal proprio lato** (camera specchiata a z negativo).

### Variante 1v1 del motore base

Altra variante dello stesso motore, già passata a 1v1. Ha `stadium_makeover.js`, ma con sponsor generici (Emirates,
PIF, Lexus…) invece dell'arena NATPF. Ha anche una propria `companion.html` collegata al relay. Non l'ho usato
come base, su indicazione esplicita. Mi è servito come riferimento leggibile (nomi delle variabili) e come
controprova che il passaggio a 1v1 è fattibile. L'arena e il telefono vengono da NATPF.

### NATPF Simulator (riferimento per arena e telefono)

| Modulo | Riuso |
|---|---|
| `site/js/tennis/arena.js` | **Usato così com'è.** Stesse coordinate del motore base (origine al centro, asse z lungo il campo, misure ITF), quindi nessuna conversione |
| `site/js/tennis/link.js`, `pairing.js`, `racket-motion.js`, `input-time.js`, `sensor-packet.js`, `lan-transport.js` | **Usati così come sono** per il collegamento del telefono dal computer: WebRTC/PeerJS, QR monouso, chiave di ripresa, orologi |
| `site/tennis/racchetta.html` e `racchetta.js`, `calibration.js`, `swing-detect.js`, `gesture-intent.js` | **La pagina del telefono è quella di NATPF**, servita sotto `/natpf/`: calibrazione breve, impugnatura personale, gesti |
| `site/js/tennis/viewpoint.js` | Campo visivo della prima persona |
| `site/js/match/shot-quality.js` | `gestureAim`: dal gesto NATPF alla mira |
| `site/js/match/*`, `scene.js`, `character.js`, `main.js` | **Non usati.** Il gameplay è quello del motore base |

## Cosa ho mantenuto, riutilizzato e integrato

| Area | Scelta |
|---|---|
| Gameplay, IA, colpi, timing, punteggio, replay, camere, animazioni, audio, webcam, mouse/tastiera, 1v1 tra computer | **Motore base, mantenuto** |
| Doppio | **Motore base, mantenuto nel codice ma disattivato** (`isDoubles`) |
| Arena e luci al chiuso | **NATPF, riutilizzata.** Lo stadio GLB e il pubblico del motore base sono caricati ma nascosti; il cielo non carica più texture |
| Telefono come racchetta | **NATPF, riutilizzato.** Ho scritto solo il ponte verso gli eventi del motore base |
| Prima persona | **Integrata** nel sistema di camere del motore base, con il campo visivo di NATPF |
| Menu | **Motore base, con aggiunte:** Racchetta e Visuale, pannello del telefono, invito P2 |

Non c'è codice NATPF copiato in `natpf-argon/`: l'alias `@natpf` punta a `../site/js` e la build copia solo i file
che servono (`scripts/natpf-site-plugin.mjs`).

## Architettura dell'integrazione

```
                ┌──────────── natpf-argon (Vite) ────────────┐
 telefono       │  src/natpf/natpf_phone_racket.js            │      ../site/js (NATPF, invariato)
 racchetta.html │   createPhoneLink() ───────────────────────────────► tennis/link.js, pairing.js, …
 (NATPF) ─WebRTC┤   sw/toss → MotionController._emitSwing/Toss │
                │   rotazione → phoneState.orientation         │
 webcam ───────►│  src/motion_controls.js (base)              │
 mouse/tastiera►│        │ onSwing / onToss / onP2Swing        │
                │        ▼                                     │
                │  src/game_engine.js (base) ── isDoubles=false (1v1)
                │        │ scena          │ camera             │
                │  natpf_arena.js ─────────────────────────────────► tennis/arena.js
                │  natpf_camera.js (prima persona) ────────────────► tennis/viewpoint.js
                │  relay Vite (/api/*) ◄──── 1v1 host/guest ──►│
                └─────────────────────────────────────────────┘
```

### Decisioni

- **1v1.** I compagni sono nascosti, non entrano nelle scelte di chi colpisce (`isDoubles &&` nei punti in cui
  il motore base sceglie tra giocatore e compagno) e non vengono animati. In/out usava già le linee del singolare.
  Tabellone con un solo personaggio per lato.
- **Arena.** `buildArena()` di NATPF viene aggiunta alla scena del motore base. Luci e nebbia vengono da
  `tennis/scene.js`, con un po' più di luce sul campo per i materiali dei personaggi, pensati per il sole. I segnapunti
  arancioni dell'arena mostrano punteggio del game e velocità del servizio.
- **Telefono → colpo.** `dir` NATPF (+1 da destra a sinistra) diventa dritto o rovescio secondo la mano scelta
  in calibrazione. La mira è `gestureAim`, quindi `aim` se c'è, altrimenti il verso, ed è già nel riferimento del
  giocatore (il motore base specchia per P2). La forza passa da 0,3…1 a una velocità 0,8…1,65; lob, slice e palla corta
  diventano lob, slice e slice morbido. Al servizio vale la logica del motore base: il primo gesto lancia, il secondo
  colpisce. Il computer manda al telefono la fase (`serve`, `toss`, `play`, `over`, `menu`) e l'esito dei colpi
  (vibrazione e scritta sul telefono).
- **Impugnatura.** Telefono in verticale nel palmo, schermo verso il palmo. L'asse lungo Y è il manico, la
  normale allo schermo Z è la normale del piatto, X corre lungo l'ovale. La rotazione integrata dal giroscopio
  (relativa alla presa di riposo) diventa beccheggio (X), apertura/chiusura del piatto (Y) e oscillazione nel piano
  del piatto (Z). Come in `character.js` di NATPF, se ne mostra al massimo il 55%, perché il valore deriva nel
  tempo. Il riconoscimento dei gesti resta quello calibrato da NATPF sulla presa personale.
- **Prima persona.** La camera sta 0,78 m dietro e 1,38 m sopra il giocatore locale (P1 o P2), con lo sguardo
  fisso verso il fondo campo avversario e il campo visivo di `viewpoint.js` (78° circa). Testa, busto e piedi
  sono nascosti, mani e racchetta restano in primo piano. Al proprio servizio lo sguardo sale con il lancio.
  Sudore ed emoticon del giocatore locale sono spenti. La scelta vale per prima persona, terza persona del motore base e
  camere manuali (C), e il browser la ricorda.

## Menu e onboarding (17 ottobre 2026, branch `feature/natpf-argon-lobby`)

Il menu del motore base è diventato una **lobby in stile console**, scelta dall'utente fra tre proposte (A Broadcast TV,
B Lobby console, C Editoriale FITP). Ha un aspetto proprio, con colori NATPF (blu notte, giallo palla, rosa),
angoli tagliati, tipografia condensata e una scelta per schermata. Gli id letti dall'HUD del motore base
(`#difficulty-mode-group`, `#match-length-group`, `#btn-start-match`, `#setup-mii-*`) restano, quindi
difficoltà, durata, stanza 1v1 e avvio sono quelli del motore base. In più ci sono un onboarding guidato in cinque passi,
che si adatta a smartphone, webcam o mouse/tastiera, e un punto di prova con allenatore che non conta per il
punteggio. Lo stesso stile vale per il collegamento del telefono e per il pannello del Player 2. HUD di gioco e
schermata di vittoria sono stati rifatti dopo (vedi «Identità NATPF»).

## Identità NATPF (white label, 18 ottobre 2026)

Il gioco non deve sembrare il tennis arcade da cui deriva il motore. Cambiato rispetto al motore base:

- **Musica originale** generata in tempo reale con Web Audio (`src/natpf/natpf_music.js`): sei brani composti per
  NATPF (lobby, ingresso in campo, scambio, punto decisivo, moviola, vittoria), con melodie, accordi e ritmi
  scritti nel sorgente e un sequencer con look-ahead: loop senza stacchi, offline, nessun file audio né licenza.
  L'ingresso in campo passa da solo allo scambio; palla game/break/match e moviola hanno il loro brano.
- **Voce del punteggio in italiano** con `speechSynthesis` (`src/natpf/natpf_voice.js`): «quindici zero»,
  «parità», «vantaggio», «palla game», «palla break», «game, set e partita», «fuori», «rete», «ace»… Solo voci
  italiane del sistema; senza, silenzio. Pulsante «Voce» nell'HUD. Gli effetti (colpi, rimbalzi, pubblico) erano
  già sintetizzati e restano.
- **HUD** rifatto nello stile della lobby (`natpf-hud.css`) e **testi in italiano** (`src/natpf/natpf_i18n.js`
  traduce le etichette del motore quando l'HUD le mostra, così telefono e partita in rete continuano a usare
  quelle interne). Nomi neutri: «Tu», «CPU», «CPU Pro», «Player 1/2».
- **Nessun file esterno** per musica, annunci, texture del cielo e QR del companion (ora generati sul link vero).
- Nomi, descrizioni e documenti senza riferimenti al gioco di partenza. Restano solo nomi interni che non si
  vedono giocando (cartella `natpf-argon/`, file `mii_*.js`, classi CSS `wii-*`/`mii-*`, chiavi `natpf-argon.*` in
  localStorage, classe `ArgonTennisEngine`), da rinominare all'unione dei branch.

## Personaggio procedurale (17 ottobre 2026)

Le figurine scaricate da gstatic (`mii_player.glb`, `mii_opponent.glb`) sono sostituite da un tennista «toy» in
vinile costruito nel codice (`src/natpf/natpf_character.js`): testa grande con capelli castani voluminosi e fascia
bianca, sopracciglia decise e occhi piccoli scuri, polo bianca con colletto e due bottoni, pantaloncini bianchi,
polsino bianco a destra e blu a sinistra, calze blu, scarpe bianche con suola blu. Varianti di colore: **P1** come il
riferimento, **CPU** con la polo blu NATPF, **P2** con dettagli rosa; l'avversario passa da CPU a P2 da solo nelle
partite 1v1 tra persone (`isMultiplayer`).

- **Stesse parti del motore.** Il modello espone `Torso`, `Head`, `Hand_L`, `Hand_R`, `Foot_L`, `Foot_R` nelle
  posizioni di riposo dei vecchi GLB, quindi rig del corpo, espressioni del viso e cinematica della racchetta
  funzionano senza modifiche. Il viso dinamico viene solo adattato (occhi piccoli, sopracciglia aggrottate, bocca
  chiusa a riposo).
- **Braccia e gambe vere.** A ogni fotogramma, dopo tutte le animazioni (in `render()`), un'IK a due ossa collega
  spalla e mano, anca e caviglia. Le braccia possono allungarsi fino al 70% come un giocattolo morbido.
- **Racchetta e pallina** procedurali (`createNatpfRacket`, `createNatpfBall`) con le stesse misure e gli stessi
  punti del piatto usati da colpi ed effetti. Si scaricano solo `stadium_court`, `tennis_net` e `mii_crowd`.
- **Prima persona.** Restano avambracci, polsini, mani e racchetta (`natpfFirstPersonHidden` in `natpf_camera.js`).
- **Ritratti HUD** (`src/natpf/natpf_portrait.js`): SVG del personaggio nei colori della variante; `mii_avatars.js`
  mantiene solo l'API e gli id usati da HUD e lobby.
- **Prestazioni.** Geometrie e materiali sono condivisi tra gli attori (un materiale per colore). Ogni personaggio
  ha 39 mesh e circa 15 mila triangoli; i vecchi modelli avevano 24 mesh ma circa 42 mila vertici.

Interventi nel motore, marcati `NATPF`: import e creazione del cast in `loadAssetsAndStart`, `finishNatpfActor` in
fondo a `_prepareMiiActor`, `updateNatpfCharacters` in `render()`. `mii_model_overhaul.js` salta i materiali del
personaggio. Test: `test/natpf-character.test.mjs`.

## Verifiche fatte (17 ottobre 2026)

| Verifica | Esito |
|---|---|
| `npm test` (9 test: formato, gesti → colpi, impugnatura, fasi, esiti al telefono, prima persona per P1/P2, corpo nascosto, pagina del telefono, file della build) | 9/9 |
| `node --test tools/test/*.test.mjs` del repository (NATPF invariato) | 124/124 |
| `vite build` + `vite preview`: grafiche dell'arena, pagina del telefono, relay | ok |
| Browser: arena NATPF, singolare, terza e prima persona; scambio con un bot contro CPU Casual | rally fino a 53 colpi |
| Browser: 1v1 tra due istanze (host e P2 in iframe), colpi del P2 via relay, punteggio sincronizzato, P2 in prima persona | rally fino a 16 colpi |
| Browser: pagina del telefono NATPF in vista smartphone con `devicemotion` sintetico (strumenti `tools/e2e`), PeerJS locale, calibrazione rapida, prova libera, conferma, servizio e scambi | servizio ok, scambi fino a 27 colpi |
| `npm run dev:https` (certificato autofirmato) | risponde in https |

### Non verificato

- **Telefoni reali** (Android/Chrome, iPhone/Safari), prese e mobilità diverse, latenza su Wi-Fi reale.
- **Webcam reale**: il codice del motore base non è cambiato, l'ho solo collegato al menu.
- **Inclinazione continua della racchetta con il telefono reale.** NATPF invia il flusso dei sensori solo nel
  trasporto LAN (`?lan=1`). Con PeerJS arrivano solo gesti e servizio, quindi la racchetta si muove con l'animazione
  del motore base a ogni colpo e non segue di continuo il polso. Il ponte usa il flusso appena c'è.
- **`npm run lint`** dava già 50 errori di tipo nel relay della partita (`vite.config.ts`) prima di queste modifiche;
  di Argon a ogni colpo e non segue di continuo il polso. Il ponte usa il flusso appena c'è.
- **Non verificato nella prima versione e ora coperto dalla versione LAN**: flusso continuo del telefono (vedi
  «Versione LAN e webcam» più sotto).
- **`npm run lint`** dava già 50 errori di tipo nel relay di Argon (`vite.config.ts`) prima di queste modifiche;
  non ne ho aggiunti.

## Limiti e prossimi passi

1. **Prova fisica breve** con telefono reale: scelta della visuale, calibrazione, servizio, scambio.
2. **Istante del colpo.** Il motore base risolve il colpo all'arrivo dell'evento; NATPF manda anche l'istante del picco
   (`at`). Usarlo, con la storia dei fotogrammi mostrati di `input-time.js`, toglierebbe la latenza di rete dal
   timing.
3. **Flusso dei sensori anche con PeerJS** (canale non affidabile dedicato), per l'inclinazione continua: tocca
   la pagina del telefono condivisa con NATPF Simulator, quindi va concordato.
4. **1v1 tra computer su sito statico:** sostituire il relay della partita con la sessione WebRTC di NATPF
   (`session.js`).
5. ~~HUD in inglese~~: fatto, vedi «Identità NATPF».
6. Modelli 3D dei personaggi e dello stadio: arrivano ancora dal server dell'app di partenza e li sostituisce il
   lavoro sul personaggio 3D. Musica, voce, cielo e QR non hanno più file esterni.

## Versione LAN e webcam (17 ottobre 2026, branch `feature/natpf-argon-lan`)

Obiettivo: giocare su una rete locale anche **senza internet**, con il telefono NATPF come racchetta (flusso
continuo dei sensori), il 1v1 tra due computer e la webcam di Argon che segue la mano reale.

### Come si avvia

Doppio clic su `natpf-argon/avvia-lan.cmd` (istruzioni complete in [natpf-argon/README.md](../natpf-argon/README.md),
sezione «Versione LAN»). `lan/prepare.mjs` installa le dipendenze mancanti (`tools/lan`, `natpf-argon`), completa il
pacchetto offline e rifà la build solo se i sorgenti sono più recenti di `dist/`; poi `lan/server.mjs` avvia il
server HTTPS e scrive gli indirizzi di rete. Il certificato è quello di NATPF (`tools/lan/certs/`, mkcert o altra CA
locale attendibile, per l'IP esatto): l'avvio guidato ne controlla coppia, scadenza e IP.

```
 telefono ─ https://IP:8443/natpf/tennis/racchetta.html?lan=1 ─┐            ┌─ PC 2 (P2): https://IP:8443/?room=…&role=p2&lan=1
            WebRTC diretto (DataChannel control + motion)      │            │
                                                                ▼            ▼
                      ┌──────────── PC host: node lan/server.mjs (HTTPS :8443) ────────────┐
                      │ tools/lan/server.mjs: TLS, /lan/status, /lan/ (guida), /lan-signal │
                      │ lan/game-handler.mjs: dist/ · /natpf/ (../site) · /api/* relay 1v1  │
                      │                       /assets/* pacchetto offline (disco → gstatic) │
                      └────────────────────────────────────────────────────────────────────┘
```

### Scelte

- **Server Node invece di `vite preview` in HTTPS.** Un solo processo che riusa l'avvio guidato di `tools/lan`
  (stesso certificato, stessi controlli, stessa pagina `/lan/`, stessa segnalazione WebSocket `/lan-signal` del
  trasporto `?lan=1`), serve la build statica senza le dipendenze di sviluppo di Vite e senza trasformazioni al
  volo, e monta lo stesso relay 1v1. Con `vite preview` avrei dovuto rifare in Vite la segnalazione WebSocket e i
  controlli del certificato. `tools/lan` ha due opzioni nuove retrocompatibili: `handler` (un altro gioco al posto
  dei file di `site/`) e `gamePath`.
- **Relay di Argon estratto** da `vite.config.ts` in `scripts/argon-relay.mjs` senza cambiarne la logica: lo usano
  sia Vite sia il server LAN. Nel server LAN i link della stanza riportano l'indirizzo con cui il computer è stato
  raggiunto.
- **Sempre `?lan=1`.** Il server aggiunge il parametro a `/`: `link.js` di NATPF usa allora `LanPeer` (segnalazione
  sul computer, `iceServers: []`) al posto di PeerJS cloud, e il QR lo passa al telefono.
- **IP di rete al posto di localhost** (`src/natpf/natpf_lan.js`): se il gioco è aperto da `localhost`, QR e link
  del Player 2 usano il primo indirizzo https di `/lan/status` coperto dal certificato.
- **Pacchetto offline** (`scripts/offline-assets.mjs`, `download-assets.mjs`): modelli, audio (musiche Lyria e
  annunci TTS), texture e QR di Argon in `public/assets/` (lista letta dai sorgenti, `manifest.json` con dimensioni,
  sha256 e licenza; 57 file, circa 37 MB); MediaPipe Hands dal pacchetto npm `@mediapipe/hands@0.4.1675469240`
  (Apache-2.0, identico byte per byte ai file wasm/data di gstatic). Nei sorgenti di Argon gli indirizzi gstatic
  restano scritti ma passano da `argonAssetUrl` → `./assets/…` (audio, texture, QR) come Argon già faceva per i
  modelli. Il server risponde dal disco; se un file manca prova gstatic solo se c'è rete, altrimenti 404 e il gioco
  continua (modello vuoto, niente suono, cielo senza texture, webcam con optical flow).
- **Webcam → racchetta continua** (`src/natpf/webcam_hand_pose.js`). Argon usava la mano solo per far partire i
  colpi (e la velocità della traccia per un piccolo ondeggiamento). Ora i landmark di MediaPipe (polso, nocche di
  indice, medio e mignolo) danno posizione e rotazione della mano; con l'optical flow solo la posizione. Il filtro
  ha una posizione di riposo che si adatta in ~5 s e sfuma quando la mano sparisce. Il risultato entra in
  `liveInput` di `racket_kinematics.js`, come l'inclinazione del telefono: inclinazioni (rollio, beccheggio,
  imbardata) e uno spostamento del polso fino a ±26 cm di lato e ±24 cm in altezza, che sposta racchetta e mano del
  personaggio in prima e in terza persona. Colpi, mira e timing restano quelli di Argon.
- **Corpo non collegato.** «Tracciare i movimenti dell'utente» potrebbe voler dire anche lo spostamento laterale
  del giocatore: non l'ho implementato, resta il movimento automatico di Argon, in attesa di una decisione.

### Verifiche (17 ottobre 2026)

| Verifica | Esito |
|---|---|
| `npm test` in natpf-argon (9 test precedenti + 10 nuovi: relay, pacchetto offline, server LAN, build da rifare, avvio con `tools/lan` in HTTPS e `/lan-signal`, IP di rete per QR e invito, posa della mano) | 19/19 |
| `node --test tools/test/*.test.mjs` | 124/124 |
| `node --test tools/lan/test/setup.test.mjs` (+1 test per `handler`) | 4/4 |
| `npm run test:e2e-lan` (`natpf-argon/test/e2e/lan-e2e.mjs`): server LAN vero, Chrome, ogni richiesta fuori dal computer bloccata e contata | vedi sotto |

La prova nel browser verifica:

- **Offline**: nessuna richiesta fuori dal computer in tutta la prova, nessun errore nelle pagine; `/lan/status`
  riporta build presente e pacchetto completo.
- **Telefono simulato** (pagina NATPF vera in vista smartphone, `devicemotion` sintetici di `tools/e2e/motion.js`):
  QR con l'IP di rete e `?lan=1`, trasporto `lan-webrtc`, calibrazione rapida vera guidata dal computer (quattro
  gesti, prova libera, conferma). Flusso continuo: 23–32 campioni in 0,7 s (tetto NATPF 40 Hz); ruotando il
  telefono attorno a ciascun asse la racchetta ruota di 30–80° e l'asse dominante è quello dell'impugnatura NATPF (X → beccheggio,
  manico Y → rollio del piatto, normale dello schermo Z → imbardata). Un gesto lancia il servizio.
- **1v1 tra due istanze** attraverso il server LAN: link del P2 con IP di rete, stanza e `?lan=1`; colpi del P2
  ricevuti dall'host tramite il relay; scambio tra le due istanze; punteggio e fase uguali sul P2; P2 in prima
  persona.
- **Webcam**: stream finto di Chrome (`--use-fake-device-for-media-stream`), MediaPipe Hands caricato da
  `/assets/mediapipe/hands/` e un'inferenza vera sul fotogramma finto, tutto offline. Poi landmark sintetici con
  gli stessi campi di MediaPipe, uno per fotogramma: mano a destra/sinistra e in alto/in basso → racchetta e mano
  del personaggio nello stesso verso sullo schermo, in terza persona (spostamento di ~27 cm, piccolo da 23 m di
  distanza) e in prima persona (circa un quinto dello schermo); mano ruotata → racchetta ruotata di 15–19°; i
  movimenti lenti non fanno partire colpi, uno swing veloce sì (colpo di Argon con sorgente «webcam»). Con la GPU il
  gioco gira a 50–60 FPS, con la webcam e MediaPipe a ~30 FPS; un'inferenza di MediaPipe costa 10–40 ms.
- **Esito**: 28/28 verifiche superate (18 ottobre 2026, Chrome 155 con GPU, Windows 11).

Le prove usano un certificato di prova (openssl) e Chrome con `--ignore-certificate-errors`, al posto del
certificato mkcert attendibile: con il solo avviso ignorato il WebRTC del telefono non partiva, a conferma di quanto
dice `tools/lan/README.md`. Servono Chrome con la GPU: con il rendering software (`E2E_SWIFTSHADER=1`) il gioco
scende a 1–2 FPS e la traccia della mano di Argon, che lavora per fotogrammi, non riconosce più posa e swing.

### Da provare con hardware reale

- **Telefoni veri** in LAN (Android/Chrome, iPhone/Safari) con il certificato mkcert installato: calibrazione,
  inclinazione continua, latenza e perdita di pacchetti sulla Wi-Fi dell'evento (isolamento tra dispositivi,
  firewall di Windows per Node.js e UDP).
- **Webcam vera con una mano vera**: qualità del riconoscimento di MediaPipe con luce e sfondo reali, segni e
  ampiezza della posa (pensati per una webcam frontale a specchio), soglie degli swing di Argon, frame rate su un PC
  da evento. Il riconoscimento della mano non è stato provato su immagini reali.
- **Secondo computer reale** per il 1v1 (anche lui deve fidarsi della CA).
- **Avvio da `avvia-lan.cmd` su un PC pulito** (prima installazione con internet, poi senza).

## Opzione B: 2v2 (solo su richiesta)

1. `src/natpf/match_format.js`: `DOUBLES_ENABLED = true`.
2. Menu: un pulsante «2v2» che apre il gioco con `?format=doubles`. Il motore legge il formato in
   `resolveMatchFormat`, rimette in campo i compagni (`_applyMatchFormat`) e riattiva volée e posizionamento del
   motore base, che non sono stati rimossi.
3. Da progettare: chi comanda i compagni (CPU o altri giocatori), un telefono per giocatore (`NatpfPhoneRacket`
   per ruolo), relay con quattro ruoli, prima persona per ciascun giocatore locale.
