# NATPF Simulator · Argon Tennis (MVP)

Primo MVP che unisce il **gameplay di Argon Tennis** con l'**ambientazione delle Nitto ATP Finals** e lo
**smartphone come racchetta** di NATPF Simulator. Solo **1v1**: contro la CPU oppure tra due computer.

- **Gameplay**: quello di Argon Tennis, così com'è: fisica, colpi (topspin, slice, lob, smash), timing con
  sweet spot, IA Casual/Pro, punteggio, replay, camere, animazioni e facce dei Mii, effetti, audio.
- **Arena**: quella di NATPF Simulator (`../site/js/tennis/arena.js`), usata senza modifiche: tabelloni, sponsor,
  pannelli LED, segnapunti, tribune, cubo, stendardi e pianta originali. È simmetrica, quindi ognuno dei due
  giocatori la vede dal proprio lato con lo stesso orientamento.
- **Racchetta**: smartphone NATPF (QR, impugnatura, calibrazione breve, gesti) **oppure** webcam di Argon
  (MediaPipe Hands con optical flow di riserva). Mouse e tastiera di Argon restano sempre disponibili.
- **Visuale**: terza persona di Argon oppure prima persona (racchetta e mani in primo piano). Si sceglie dal menu,
  con il pulsante «Vista» o con il tasto **V**, sia per P1 sia per P2.
- **2v2**: escluso dall'MVP ma non rimosso. Il doppio di Argon resta nel motore dietro `isDoubles`
  (`src/natpf/match_format.js`), per l'Opzione B.

Analisi, architettura, verifiche e limiti: [../docs/NATPF_ARGON_MVP.md](../docs/NATPF_ARGON_MVP.md).

## Menu, onboarding e punto di prova

- **Lobby in stile console** (diversa dal menu di Argon) sopra l'arena, una scelta per schermata:
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

## Avvio

Serve Node.js 20 o più recente. La cartella `../site` del repository deve esserci, perché è da lì che
arrivano i moduli NATPF.

```bash
npm install
npm run dev          # http://localhost:3000 (Vite + relay della partita 1v1)
```

I modelli 3D e i file MediaPipe di Argon (circa 34 MB) non sono nel repository. In sviluppo il server li
prende da gstatic al primo uso. Con `node scripts/download-assets.mjs` si scaricano invece in `public/assets/`,
cosa che `npm run build` fa da solo.

### Smartphone come racchetta

1. Nella lobby, al passo **2 Racchetta**, scegli **Smartphone**: compare il QR.
2. Scegli la **presa** (sotto le tessere, e anche nel pannello del telefono o sul telefono stesso):
   - **Orizzontale · piatto** (predefinita): telefono in orizzontale nel palmo, display verso di te; il dorso guarda
     la rete e fa da corde. Il telefono si usa in landscape.
   - **Verticale · manico**: telefono in verticale nel palmo, come il manico (la presa di NATPF Simulator).
3. Inquadra il QR con il telefono, tocca «Attiva i sensori» e segui i passi. Con la presa orizzontale: **2 secondi
   fermo** in posizione «pronto», piatto verso la rete, poi **quattro gesti comodi** (sinistra, destra, sinistra,
   destra), una prova libera e «Conferma la racchetta».
4. Al servizio un primo gesto lancia la palla e il secondo la colpisce in alto. Nello scambio colpisci quando la
   palla arriva alla racchetta; il verso del gesto sceglie dritto o rovescio.
   - **Presa orizzontale**: la direzione la decide soprattutto **l'angolo del piatto all'impatto**: piatto girato a
     sinistra o a destra (rispetto al tuo gesto dritto della calibrazione) → incrociato o lungolinea. Piatto aperto
     verso l'alto → lob (gesto deciso) o palla corta (gesto morbido); piatto chiuso → colpo coperto. Gesto dal basso
     verso l'alto → topspin, tagliato dall'alto → slice. La velocità del gesto è la velocità della palla; il tempo
     conta ancora, ma meno. Sul telefono una freccia mostra dove punta il piatto e in gioco la racchetta lo segue.
   - **Presa verticale**: verso e inclinazione del gesto per la mira, gesto verso l'alto per il lob, tagliato per lo
     slice (come prima).

Il telefono ha bisogno di una pagina **https** per leggere i sensori di movimento:

- in LAN avvia `npm run dev:https` (certificato autofirmato) e apri il gioco sul computer dall'indirizzo di rete
  mostrato da Vite, per esempio `https://192.168.1.41:3000`; sul telefono accetta l'avviso del certificato;
- oppure pubblica la build in https;
- oppure, se il gioco resta in http, indica una pagina del telefono già pubblicata in https con
  `?phone=https://…/tennis/racchetta.html` (o con `VITE_NATPF_PHONE_PAGE`). Il protocollo deve essere quello di
  `../site/js/tennis/`.

Il collegamento passa da WebRTC con il server di segnalazione pubblico di PeerJS. Per le prove senza internet:
`?peer=127.0.0.1:9000` con `node ../tools/e2e/peer-server.mjs`.

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
sul computer di P1 (host); lo stato e i colpi di P2 passano dal relay di Argon, che vive nel server Vite
(`npm run dev` o `npm run preview`). Su un sito solo statico il 1v1 tra computer non è disponibile.

### Build

```bash
npm run build        # dist/ (gioco + pagina del telefono NATPF in dist/natpf/ + grafiche dell'arena)
npm run preview      # http://localhost:3000 con il relay 1v1
npm test             # test dell'integrazione NATPF ↔ Argon, presa orizzontale e skill gap
npm run audit:rally  # audit degli scambi (colpi per punto, punti vinti per profilo)
```

## Comandi

| | Mouse / tastiera (Argon) | Webcam (Argon) | Smartphone (NATPF) |
|---|---|---|---|
| Servizio | ↑ / W / T lancia, Spazio colpisce | mano verso l'alto, poi swing | gesto, poi gesto in alto |
| Colpo | Spazio o trascinamento; 1–4 per il tipo | swing davanti alla webcam | gesto naturale con il telefono |
| Mira | Q/E o A/D, direzione del trascinamento | direzione dello swing | angolo del piatto (presa orizzontale) o verso e inclinazione del gesto (verticale) |

Altri tasti: **V** prima/terza persona, **C** camera, **R** replay.

Parametri utili: `?view=first|third`, `?mode=casual|pro|1v1`, `?room=…&role=p2`, `?phone=…`, `?peer=…`.

## Struttura

- `src/` – Argon Tennis (riformattato con Prettier). Le modifiche al motore sono agganci brevi, marcati `NATPF:`.
- `src/natpf/` – integrazione: `natpf_arena.js` (arena e luci), `natpf_phone_racket.js` (telefono → colpi e
  inclinazione della racchetta, presa orizzontale), `natpf_skill.js` (skill gap: assistenza, rischio, CPU), `natpf_camera.js` (prima persona), `natpf_ui.js` (menu, QR e calibrazione,
  invito P2), `match_format.js` (1v1 / Opzione B 2v2).
- `scripts/natpf-site-plugin.mjs` – riuso di `../site`: alias `@natpf`, pagina del telefono sotto `/natpf/`,
  copia nella build delle sole dipendenze necessarie.
- `scripts/audit/` – motore senza browser (`headless-engine.mjs`) e audit degli scambi (`rally-balance.mjs`,
  risultati in `results/`).
- `test/` – test Node dell'integrazione.
- `../site/js/tennis/face-tracker.js` – orientamento del piatto sul telefono (presa orizzontale), condiviso con
  la pagina del telefono di NATPF Simulator, dove resta un'opzione: la presa predefinita là è quella verticale.

Modelli, audio e texture di Argon arrivano dalla starter app di Google AI Studio (gstatic). Marchi e grafiche
dell'arena: vedi `../site/assets/arena/README.md`. Uso interno FITP eSports.
