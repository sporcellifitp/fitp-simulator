# NATPF Simulator su base Argon Tennis: analisi e MVP

Checkpoint: 17 ottobre 2026. Branch `feature/natpf-argon-mvp`, cartella `natpf-argon/`, partito da
`refactor/natpf-audit-20261015` (160b648), che contiene già la PR #1. La versione NATPF Simulator esistente
(`site/tennis/`) non è stata modificata.

## Obiettivo

Primo MVP giocabile **1v1** con:

- il gameplay di **Argon Tennis**;
- l'arena delle **Nitto ATP Finals** di NATPF Simulator;
- **smartphone o webcam** come racchetta;
- visuale in **prima o terza persona**, per entrambi i giocatori.

Il 2v2 è escluso, ma l'architettura resta pronta per introdurlo (Opzione B).

## Analisi dei progetti

### remix-argon-tennis (base principale)

App Vite di Google AI Studio, con sorgenti minificati che ho riformattato con Prettier senza toccarne la logica
(commit `chore: import Argon Tennis remix…`).

| Modulo | Ruolo |
|---|---|
| `game_engine.js` | Motore: scena three.js 0.160, fisica a 120 Hz, regole e punteggio, IA Casual/Pro, servizio con lancio, timing con sweet spot e assistenza, replay, camere (Rally, Serve, Net, Aerial, Showcase), multiplayer host/guest |
| `motion_controls.js` | Input: mouse (trascinamento), tastiera, webcam (MediaPipe Hands con optical flow di riserva), telefono tramite relay HTTP |
| `racket_kinematics.js`, `mii_body_animation.js`, `mii_facial_fx.js`, `mii_model_overhaul.js`, `swing_vfx.js` | Racchetta (anche con inclinazione dal telefono), animazioni ed espressioni dei Mii, scie e impatti |
| `hud_ui.js`, `mii_avatars.js`, `audio_engine.js` | HUD stile Wii, menu, vittoria, audio Lyria e annunci |
| `vite.config.ts` | Relay della partita (`/api/match/*`, `/api/racket/*`) e proxy degli asset gstatic |

Cosa ho trovato, rilevante per l'integrazione:

- **Argon è un gioco di doppio.** Ci sono sempre 4 attori; i compagni giocano volée e coprono la rete.
- **La pagina del telefono di Argon non c'è.** `companion.html` e i QR puntavano al sandbox AI Studio
  (appspot, gstatic) e il pulsante «Pocket Racket» era nascosto via CSS.
- **Il 1v1 tra computer funziona davvero:** l'host è autorevole e manda uno snapshot ogni 45 ms; il guest manda i
  colpi. Però passa dal relay del server Vite, quindi non funziona su un sito solo statico.
- **La racchetta segue già l'inclinazione del telefono** (`phoneState.orientation` → `liveInput`).
- **P2 vede già il campo dal proprio lato** (camera specchiata a z negativo).

### next-gen-atp-finals-1v1-tennis

Altro remix AI Studio di Argon, già passato a 1v1. Ha `stadium_makeover.js`, ma con sponsor generici (Emirates,
PIF, Lexus…) invece dell'arena NATPF. Ha anche una propria `companion.html` collegata al relay. Non l'ho usato
come base, su indicazione esplicita. Mi è servito come riferimento leggibile (nomi delle variabili) e come
controprova che il passaggio a 1v1 è fattibile. L'arena e il telefono vengono da NATPF.

### NATPF Simulator (riferimento per arena e telefono)

| Modulo | Riuso |
|---|---|
| `site/js/tennis/arena.js` | **Usato così com'è.** Stesse coordinate di Argon (origine al centro, asse z lungo il campo, misure ITF), quindi nessuna conversione |
| `site/js/tennis/link.js`, `pairing.js`, `racket-motion.js`, `input-time.js`, `sensor-packet.js`, `lan-transport.js` | **Usati così come sono** per il collegamento del telefono dal computer: WebRTC/PeerJS, QR monouso, chiave di ripresa, orologi |
| `site/tennis/racchetta.html` e `racchetta.js`, `calibration.js`, `swing-detect.js`, `gesture-intent.js` | **La pagina del telefono è quella di NATPF**, servita sotto `/natpf/`: calibrazione breve, impugnatura personale, gesti |
| `site/js/tennis/viewpoint.js` | Campo visivo della prima persona |
| `site/js/match/shot-quality.js` | `gestureAim`: dal gesto NATPF alla mira |
| `site/js/match/*`, `scene.js`, `character.js`, `main.js` | **Non usati.** Il gameplay è quello di Argon |

## Cosa ho mantenuto, riutilizzato e integrato

| Area | Scelta |
|---|---|
| Gameplay, IA, colpi, timing, punteggio, replay, camere, animazioni, audio, webcam, mouse/tastiera, 1v1 tra computer | **Argon, mantenuto** |
| Doppio | **Argon, mantenuto nel codice ma disattivato** (`isDoubles`) |
| Arena e luci al chiuso | **NATPF, riutilizzata.** Lo stadio GLB, il cielo e il pubblico di Argon sono caricati ma nascosti |
| Telefono come racchetta | **NATPF, riutilizzato.** Ho scritto solo il ponte verso gli eventi di Argon |
| Prima persona | **Integrata** nel sistema di camere di Argon, con il campo visivo di NATPF |
| Menu | **Argon, con aggiunte:** Racchetta e Visuale, pannello del telefono, invito P2 |

Non c'è codice NATPF copiato in `natpf-argon/`: l'alias `@natpf` punta a `../site/js` e la build copia solo i file
che servono (`scripts/natpf-site-plugin.mjs`).

## Architettura dell'integrazione

```
                ┌──────────── natpf-argon (Vite) ────────────┐
 telefono       │  src/natpf/natpf_phone_racket.js            │      ../site/js (NATPF, invariato)
 racchetta.html │   createPhoneLink() ───────────────────────────────► tennis/link.js, pairing.js, …
 (NATPF) ─WebRTC┤   sw/toss → MotionController._emitSwing/Toss │
                │   rotazione → phoneState.orientation         │
 webcam ───────►│  src/motion_controls.js (Argon)             │
 mouse/tastiera►│        │ onSwing / onToss / onP2Swing        │
                │        ▼                                     │
                │  src/game_engine.js (Argon) ── isDoubles=false (1v1)
                │        │ scena          │ camera             │
                │  natpf_arena.js ─────────────────────────────────► tennis/arena.js
                │  natpf_camera.js (prima persona) ────────────────► tennis/viewpoint.js
                │  relay Vite (/api/*) ◄──── 1v1 host/guest ──►│
                └─────────────────────────────────────────────┘
```

### Decisioni

- **1v1.** I compagni sono nascosti, non entrano nelle scelte di chi colpisce (`isDoubles &&` nei punti in cui
  Argon sceglie tra giocatore e compagno) e non vengono animati. In/out usava già le linee del singolare.
  Tabellone con un solo Mii per lato.
- **Arena.** `buildArena()` di NATPF viene aggiunta alla scena di Argon. Luci e nebbia vengono da
  `tennis/scene.js`, con un po' più di luce sul campo per i materiali dei Mii, pensati per il sole. I segnapunti
  arancioni dell'arena mostrano punteggio del game e velocità del servizio.
- **Telefono → colpo.** `dir` NATPF (+1 da destra a sinistra) diventa dritto o rovescio secondo la mano scelta
  in calibrazione. La mira è `gestureAim`, quindi `aim` se c'è, altrimenti il verso, ed è già nel riferimento del
  giocatore (Argon specchia per P2). La forza passa da 0,3…1 a una velocità 0,8…1,65; lob, slice e palla corta
  diventano lob, slice e slice morbido. Al servizio vale la logica di Argon: il primo gesto lancia, il secondo
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
  Sudore ed emoticon del giocatore locale sono spenti. La scelta vale per prima persona, terza persona di Argon e
  camere manuali (C), e il browser la ricorda.

## Menu e onboarding (17 ottobre 2026, branch `feature/natpf-argon-lobby`)

Il menu di Argon è diventato una **lobby in stile console**, scelta dall'utente fra tre proposte (A Broadcast TV,
B Lobby console, C Editoriale FITP). Ha un aspetto proprio, con colori NATPF (blu notte, giallo palla, rosa),
angoli tagliati, tipografia condensata e una scelta per schermata. Gli id letti dall'HUD di Argon
(`#difficulty-mode-group`, `#match-length-group`, `#btn-start-match`, `#setup-mii-*`) restano, quindi
difficoltà, durata, stanza 1v1 e avvio sono quelli di Argon. In più ci sono un onboarding guidato in cinque passi,
che si adatta a smartphone, webcam o mouse/tastiera, e un punto di prova con allenatore che non conta per il
punteggio. Lo stesso stile vale per il collegamento del telefono e per il pannello del Player 2. HUD di gioco e
schermata di vittoria restano quelli di Argon.

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
- **Webcam reale**: il codice di Argon non è cambiato, l'ho solo collegato al menu.
- **Inclinazione continua della racchetta con il telefono reale.** NATPF invia il flusso dei sensori solo nel
  trasporto LAN (`?lan=1`). Con PeerJS arrivano solo gesti e servizio, quindi la racchetta si muove con l'animazione
  di Argon a ogni colpo e non segue di continuo il polso. Il ponte usa il flusso appena c'è.
- **`npm run lint`** dava già 50 errori di tipo nel relay di Argon (`vite.config.ts`) prima di queste modifiche;
  non ne ho aggiunti.

## Limiti e prossimi passi

1. **Prova fisica breve** con telefono reale: scelta della visuale, calibrazione, servizio, scambio.
2. **Istante del colpo.** Argon risolve il colpo all'arrivo dell'evento; NATPF manda anche l'istante del picco
   (`at`). Usarlo, con la storia dei fotogrammi mostrati di `input-time.js`, toglierebbe la latenza di rete dal
   timing.
3. **Flusso dei sensori anche con PeerJS** (canale non affidabile dedicato), per l'inclinazione continua: tocca
   la pagina del telefono condivisa con NATPF Simulator, quindi va concordato.
4. **1v1 tra computer su sito statico:** sostituire il relay di Argon con la sessione WebRTC di NATPF
   (`session.js`).
5. HUD di Argon in inglese: tradurre le scritte rimaste.
6. Asset 3D e audio di Argon da gstatic (starter app AI Studio): verificare licenza e disponibilità prima di un
   uso pubblico.

## Opzione B: 2v2 (solo su richiesta)

1. `src/natpf/match_format.js`: `DOUBLES_ENABLED = true`.
2. Menu: un pulsante «2v2» che apre il gioco con `?format=doubles`. Il motore legge il formato in
   `resolveMatchFormat`, rimette in campo i compagni (`_applyMatchFormat`) e riattiva volée e posizionamento di
   Argon, che non sono stati rimossi.
3. Da progettare: chi comanda i compagni (CPU o altri giocatori), un telefono per giocatore (`NatpfPhoneRacket`
   per ruolo), relay con quattro ruoli, prima persona per ciascun giocatore locale.
