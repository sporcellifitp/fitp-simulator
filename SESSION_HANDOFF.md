# SESSION_HANDOFF · NATPF Simulator, giro «racchetta virtuale» (dal 22/10/2026)

Stato persistente del lavoro: da leggere all'inizio di ogni sessione e aggiornare a ogni checkpoint. La memoria
generale del progetto resta `MEMORY.md`; la cronologia delle decisioni è in `WORKLOG.md`.

## Obiettivo (richiesta del 22/10)

Il telefono come racchetta virtuale: il gesto fisico è l'input del gameplay. Direzione, potenza, altezza e traiettoria
devono venire dal gesto in modo comprensibile, con assistenza arcade (riferimenti: Wii Sports Tennis, Switch Sports).
Fasi della richiesta: diagnosi dallo ZIP → telefono come racchetta → lateralità e calibrazione → webcam con un solo
soggetto → riconoscimento e finestra d'impatto → colpi al volo e smash → traiettorie libere e assistenza → fisica e
avversario → diagnostica e 14 test obbligatori → checkpoint. Priorità: gameplay libero e divertente insieme a gesti
prevedibili (entrambi, non uno solo).

## Stato corrente

- Branch: `claude/friendly-fermat-dwv2w2` (branch del progetto; mai `main`). Ultimo commit prima di questo giro:
  `bfd629c`. Working tree pulito all'inizio.
- Fase in corso: **1 — diagnosi** (ZIP letto; lettura del codice della catena in corso).

## Evidenze dallo ZIP (`natpf-diagnostica-20261022-080527-6s13.zip`, sessione di 119 s)

Il materiale non è nel repository (dati personali: video della webcam e del gioco). Copia di lavoro estratta fuori
dal repository; si ricostruisce con `unzip` dallo ZIP originale in una cartella vuota.

Dimostrato dai dati:
1. **Lateralità incoerente**: il profilo del telefono ha `hand: "left"` (calibrazione fatta da mancino), il gioco
   sul computer `mano: "right"`. Due impostazioni separate (pagina del telefono `#hand`; `NatpfHand` del computer, in
   `localStorage`), nessuna sincronizzazione: i colpi sono interpretati per un mancino e giocati da un personaggio
   destro. 37 rovesci contro 17 dritti.
2. **Servizio senza controllo**: ogni servizio è «POWER SERVE! Perfetto», 184–204 km/h, qualunque sia il gesto
   (tagliati, pallonetti, colpi lenti). Il gesto al lancio e quello al colpo sono due gesti separati; il gesto dopo il
   servizio viene scartato («palla che si allontana», 7 volte).
3. **Classificazione**: su 54 colpi 15 pallonetti, 15 tagliati, 4 palle corte, 20 normali. Molti pallonetti con
   confidenza 0,05–0,49 («la mano sale molto»): il colpo speciale vince anche quando il classificatore è incerto.
4. **Direzione dal piatto (polso)**: il punto di caduta segue il segno della «mira» calcolata dal piatto del telefono
   (es. mira 0,9 → x +3,8 m; −0,95 → −3,8 m), spesso saturata (|mira| ≥ 0,8 in molti colpi) e fuori (x 4,5–5,05 m).
   `dirX` inviato al motore ha spesso il segno opposto alla mira (es. mira 0,9 → dirX −0,76): il motore usa la mira
   per la direzione e `dirX` per altro. Da verificare nel codice.
5. **Impatti e tempi**: 21 tentativi su 54 colpi; 6 colpi a vuoto «VERY EARLY» con la palla ancora a 3–10 m (anche
   vicino alla rete); tempo del colpo del telefono mediana +49 ms (in anticipo), p90 +206 ms. Livello Leggenda
   (finestra d'aiuto stretta, regole di Esperto per chi gioca).
6. **Collegamento e prestazioni non sono il problema**: sensori 59,9 Hz senza buchi, riconoscimento 31,8 ms,
   consegna 6,7 ms (copie sul percorso veloce), nessuna caduta, gioco 60 fps.
7. **Webcam**: selezionata come controller per i primi 5,7 s, poi spenta (passaggio al telefono): il video della
   webcam dura 5,5 s, 338 fotogrammi su 341 senza mano. Nessun dato sul tracciamento con più persone in questo ZIP.
8. Ricalibrazione avviata dal telefono alla fine (114,5 s).

Insufficiente: nessun riferimento dell'intenzione (prova guidata non usata), video della webcam di 5,5 s (non si vede
chi gioca durante gli scambi).

## Prossimi passi (in ordine)

1. Leggere la catena nel codice: `site/js/tennis/swing-detect.js`, `swing-message.js`, `face-tracker.js`,
   `calibration.js`, `natpf-tennis/src/natpf/natpf_phone_racket.js` (`natpfSwingToEngine`), `natpf_gestures.js`,
   `natpf_skill.js` (mira, tempo, qualità), `game_engine.js` (`_handleUserSwing`, `_attemptPlayerRallyStrike`,
   servizio, stati della palla), `natpf_hand.js`.
2. Rianalizzare i campioni grezzi dei colpi (telefono-sensori.jsonl) per capire che gesto è stato fatto.
3. Guardare il video del gioco nei momenti chiave.
4. Scrivere la diagnosi completa (problema → evidenza → causa → soluzione → criterio) e passare all'implementazione.
