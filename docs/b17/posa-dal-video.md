# B17.1 · passo B · La posa dei gesti dal video: che cosa si è fatto, che cosa il riconoscimento NON legge, scelte proposte

> Stato (09/11/2026, worktree B17.1, passo B del piano `docs/b17/analisi-e-piano.md` §1.4 punti 2–3). File di ripresa:
> `docs/b17/STATO-posa.md`. Qui le misure (numeri, non impressioni) e le scelte da prendere con l'utente.
> **Non fingere**: tutto ciò che segue è misurato con il telefono simulato completo (`natpf-tennis/test/pose-sensors.mjs`
> → `phone-sim.mjs`: rilevatore vero, forma del colpo, calibrazione rapida, mappatura del gioco), non con un telefono vero.

## 1. Presa «racchetta» (fatto, verificato)
Dalle foto dell'utente del 09/11 (`docs/b17/presa-foto.md`): telefono disteso lungo l'avambraccio, cima in avanti, dorso sul
palmo, quattro dita attorno al bordo lungo inferiore, pollice disteso lungo il bordo superiore, polso dritto, cima alzata di
20° rispetto all'avambraccio (`GRIP_POSE.racchetta.cock`).
- `site/js/tennis/grip-art.js`: terzo stile `racchetta`, **predefinito** (`GRIP_STYLE`), con nome, testi dell'interfaccia e
  della lezione («Telefono disteso nel palmo, cima in avanti», «Dita sotto, attorno al bordo», «Pollice lungo il bordo, schermo
  verso lo schermo di gioco»), figura di lato e di fronte (guardata: `scratchpad/b17/posa/grip.png`), foto
  `natpf-tennis/public/media/presa-racchetta-davanti.webp` (ritaglio della foto «davanti», 900×610, 23 KB, nome neutro).
  «palmo» e «martello» restano come rollback (un interruttore).
- `natpf_gesture_motion.js`: `GRIP_POSE.racchetta` (cock 20°, euler della posa della scheda «Presa»), `GRIP_CUES.racchetta`.
- `natpf_gesture_pose.js`: mano `HAND_RACCHETTA` (polso dietro la base, dita attorno al bordo −x, pollice lungo +x), telefono
  rigido nella mano `PHONE_IN_HAND_RACCHETTA` (cima lungo le dita girata di 20° verso il pollice, schermo = normale del palmo:
  verificato numericamente, la cima va verso il pollice), posa della scheda «Presa» `REST_RACCHETTA` (polso dritto, avambraccio
  in avanti e a destra di 40°, cima in avanti-destra e 20° in su, schermo in avanti-sinistra); camera della scheda «Presa» per
  questa presa: dallo schermo di gioco e di lato (`CAMERAS.grip.viewsBy`).
- **Verifica di fedeltà con la presa a racchetta e le coreografie di oggi** (`CHOREO`, partenza `REST`): tutte le schede e i
  due esercizi della mira sono letti come il colpo mostrato (destro e mancino, calibrazione con l'animazione e con il braccio
  simulato, 0,8× / 1× / 1,25×) **tranne un caso**: il **piatto con la calibrazione del braccio simulato** è letto top spin
  (forza 0,63 ≥ 0,62, ma salita della testa 0,07 contro la salita abituale 0,23 che il braccio simulato dà con il telefono lungo
  l'avambraccio: fuori da ±0,12, `natpf_stroke_intent flatRise`). Con la calibrazione fatta con i gesti dell'animazione (quella
  di chi imita il tutorial) il piatto si legge (forza 0,64, salita 0,07 contro 0,13). Il caso è ammesso nei test con la
  spiegazione (`allowLimit` in `natpf-gesture-pose.test.mjs`).
- Con la presa a racchetta la posizione di partenza dei colpi è ancora `REST` (quella della presa nel palmo): la mano davanti
  allo sterno con il polso piegato di 27°, quindi il telefono NON prosegue l'avambraccio nel disegno della partenza dei colpi
  (lo fa nella scheda «Presa»). È un'incoerenza visibile e dichiarata: si toglie quando le coreografie partono da `REST_VIDEO`
  (§3), oppure, se l'utente preferisce, ripartendo le coreografie di oggi da `REST_RACCHETTA` (misurato: il rientro da lì
  dà rotazioni di 300–550 °/s lette come un secondo colpo, `scratchpad/b17/posa/diag.mjs` modo b: 8 schede su 9 sbagliate).

## 2. Coreografie dai dati del video (fatto come dati, NON ancora usate nel tutorial)
`CHOREO_VIDEO` in `natpf_gesture_pose.js` (dritto, rovescio a due mani, tagliato di dritto = tagliato 2, tagliato di rovescio
= tagliato 1 come variante `sliceBackhand`, servizio = ripetizione 2), partenza `REST_VIDEO` (la posizione ferma del video,
9,4–9,7 s), raggiungibili con `gesturePlan(id, { grip: 'racchetta', set: 'video' })`. Costruzione (`scratchpad/b17/posa/costruisci.mjs`):
- pose chiave = cinematica inversa della catena del gioco sulle **posizioni** misurate di spalla, gomito e polso al netto del
  bacino (`gesti-video.json`, pose `carica`/`impatto`/`fine`; servizio anche l'arrivo in alto), busto misurato (tau, lat, y
  limitato a 0,03 m); errore di riproiezione 0–51 mm sul gomito (dove la rotazione dell'omero è regolarizzata), 0–16 mm sul polso;
- rotazione dell'omero `r` regolarizzata verso la posa prima (con il gomito quasi disteso non è osservabile: nel rovescio la
  ricostruzione saltava da −65° a +75° in 0,17 s);
- polso tenuto a quello della partenza (`pro` 14,5, `fl` −7, `dv` −2: polso dritto, schermo verso lo schermo di gioco), perché
  l'orientamento del telefono nel video è a bassa confidenza (`STATO-dati.md` §2.2) e le alternative misurate sono peggiori (§3);
- **tempi del video**: carica → impatto e impatto → fine sono quelli misurati (dritto 0,50 + 0,17 s; rovescio 0,17 + 0,20;
  tagliati 0,23–0,27 + 0,17–0,23; servizio: salita 0,27 s, fermo in alto, battuta, discesa 0,30); fermo finale 0,3 s e
  **ritorno lento 2 s a velocità costante** (`backFlat`, opzione nuova) perché l'utente tiene la fine e abbassa il braccio piano
  (il ritorno veloce di prima, 0,72 s, da queste pose dava 300–550 °/s letti come un colpo).
- Il gomito nelle pose chiave è quello della ricostruzione (49–51° al contatto del dritto dove il video mostra ~20–30°): per
  raddrizzarlo servirebbe scalare i segmenti dell'utente (provato k = 1,1: gomito 32° ma gomito fuori di 50 mm); non fatto.
- Test: `natpf-gesture-pose.test.mjs` «insieme del video»: si costruisce, continuo, ciclo chiuso su `REST_VIDEO`, angoli nei
  limiti, tempi del video rispettati; la lettura con il telefono simulato è un test **todo** che stampa che cosa legge oggi.

## 3. Il limite misurato: il riconoscimento NON legge le pose dal video come il colpo mostrato
Letture con la calibrazione del braccio simulato (`cal=arm`, destro, 1×), prese dai log `scratchpad/b17/posa/fid-*.log` e
dal test todo (ultima variante = quella in `CHOREO_VIDEO`):

| Scheda | Polso ricostruito (WIP, json) | Polso «schermo in avanti» risolto, continuo | Polso fermo a REST_VIDEO, r regolarizzato (**CHOREO_VIDEO**) | Idem con parte veloce 0,26 s («fast») |
|---|---|---|---|---|
| Dritto | 2 colpi, lato rovescio, picco −370 ms | 3 colpi, lato rovescio | **2 colpi: top spin/rovescio + palla corta; lato rovescio; picco −311 ms** | 1 colpo top spin 668 °/s ma **lato rovescio** |
| Rovescio 2 mani | 3 colpi (drop + top + slice 1451 °/s) | 2 colpi, lato dritto | **slice 809 °/s, lato nullo** | 3 colpi, lato dritto |
| Tagliato dritto | 2 colpi, letto drop | 2 colpi, drop + flat | **2 colpi: drop + top spin, picco −662 ms** | 2 colpi |
| Tagliato rovescio | 3 colpi | 2 colpi, top + lob 1885 °/s | **top spin, picco −593 ms** | top spin |
| Servizio | 5 gesti | 3 gesti (1074/341/499) | **3 gesti (933/200/595)** | 3 gesti |
| Calibrazione con dritto+rovescio dell'animazione (`cal=pose`) | fallisce | fallisce («squilibrio») | **fallisce** | fallisce |

Picchi disegnati della variante in `CHOREO_VIDEO`: dritto 477 °/s (il video: 150–1 168 a bassa confidenza), rovescio 898,
tagliati 522/662, servizio 615; carica ≤ 71–457 °/s, ritorno ≤ 31–122 °/s (sotto il limite dei colpi speciali ≈ 164–184 °/s
della calibrazione veloce, `gesture-intent.js:64`: il rientro NON è più il problema).

Che cosa dicono i numeri:
1. **Il verso del dritto è letto «rovescio»**: con il telefono lungo l'avambraccio la rotazione dominante del telefono nel dritto
   dell'utente (mano dall'anca destra in alto davanti al viso: l'avambraccio si alza di ~80°) è un **beccheggio** (attorno a x),
   non l'imbardata attorno alla verticale che il rilevatore proietta sull'asse della calibrazione; la poca imbardata che resta ha
   il segno del rientro dell'avambraccio verso sinistra alla fine (lato rovescio). Con la presa nel palmo la stessa traiettoria
   della mano fa girare il telefono attorno alla verticale (il B13/B14 lo misurava): è la presa a cambiare la lettura, non la
   traiettoria. Non è un difetto da correggere nel riconoscimento di nascosto: il riconoscimento è calibrato sui gesti VERI
   dell'utente in partita (1 200–1 400 °/s, diagnostiche dell'08/11), che evidentemente girano il telefono in modo leggibile.
2. **La parte veloce del video è lenta** (0,50 s dalla carica all'impatto nel dritto contro 0,26 s delle schede e ~0,2 s in
   partita): il rilevatore (plateau 40 ms, rawDrop 0,88) spezza il gesto in due colpi o legge il picco 300–660 ms prima del
   contatto. Con la parte veloce portata a 0,26 s («fast») il dritto diventa un colpo solo ma resta dal lato sbagliato (1).
3. **Il rovescio a due mani** della ricostruzione non è attendibile (STATO-dati §2.5): le pose chiave hanno il gomito da 18° a 129°
   in 0,37 s e la lettura è «slice» (la mano scende e il polso resta fermo): servono posizioni rifatte, non angoli.
4. **Il servizio** dell'utente non ha lancio (la sinistra non sale): la salita della destra dall'anca sopra la testa in 0,27 s
   è letta come un primo gesto (933 °/s), poi la battuta (595) e la discesa (200): tre gesti. Il gioco si aspetta lancio +
   battuta con la stessa mano o un contesto «toss» dopo il primo gesto: qui il primo gesto È la salita del braccio (ok come
   «lancio»), ma la discesa davanti fino all'anca sinistra dà un terzo gesto.

Dove si vede il **limite esatto del riconoscimento** rispetto al gesto del video (non modificato): `swing-detect.js` — direzione
del colpo dal segno della rotazione attorno all'asse di calibrazione (`way`/`verticalTurn`), `plateau` 40 ms e `rawDrop` 0,88
per il taglio del gesto, `recoverWindow`/`recoverLate` per il rientro; `gesture-intent.js:64` soglia dei colpi speciali 0,28 ×
colpo di calibrazione (qui NON toccata: la carica di queste pose sta sotto, 71 °/s nel dritto). Nessuna modifica al
riconoscimento è stata fatta: una modifica «piccola e sicura» non esiste per il punto 1 (è la fisica della presa), e per il
punto 2 il video è una dimostrazione lenta, non un colpo di partita.

## 4. Scelte proposte all'utente (minime, in ordine)
A. **Registrare i gesti con il telefono collegato** (una partita di prova o la «Prova libera» con la diagnostica accesa):
   la diagnostica salva i campioni grezzi del telefono (`telefono-sensori.jsonl`) con i colpi riconosciuti; la coreografia si
   adatta allora alla **rotazione vera del telefono** (quella che il gioco legge), con le posizioni del video come forma. È la
   strada che evita qualunque compromesso: ciò che si disegna è esattamente ciò che il telefono ha letto come dritto. Costo:
   10 minuti dell'utente + un passo di lavoro (adattamento della catena ai campioni, come `ricostruisci.mjs` ma con il
   giroscopio al posto della camera).
B. Tenere la forma del video e **cercare il polso (pro/fl/dv) e i tempi con il rilevatore nel costo** (ottimizzatore come nel
   B13, `scratchpad/b13/fix`): fattibile, ~un passo di lavoro per 5 schede; rischio di un gesto «ottimizzato» che non è più
   quello del video (il compromesso che il B13 ha già pagato).
C. Tenere le coreografie di oggi con la presa a racchetta (quello che c'è adesso, tutto verde): le schede non somigliano ai
   gesti del video (è il motivo del B17), ma sono lette; incoerenza della partenza (§1, ultimo punto) da sistemare.
Consigliata: **A**, poi B solo dove A non basta.

## 5. Non verificato
- Nessun telefono vero, nessun browser per queste pose (le prove nel browser del passo B riguardano le schede di oggi).
- L'ipotesi che in partita il dritto dell'utente con questa presa giri il telefono attorno alla verticale (le diagnostiche
  danno 1 200–1 400 °/s e il lato giusto, ma la presa registrata lì era `upright`): da confermare con A.
- La posa `REST_RACCHETTA` (schermo in avanti-sinistra, avambraccio a destra di 40°) è una lettura delle due foto, scattate da
  lati diversi: se l'utente tiene l'avambraccio dritto in avanti, lo schermo guarda a sinistra, non lo schermo di gioco
  (sono perpendicolari: con il telefono lungo l'avambraccio non possono essere entrambi «in avanti»). Da chiarire con lui.
