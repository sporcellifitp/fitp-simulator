# B17.1 · passo A (dati dal video) · stato dei lavori

> File di ripresa del passo A (chi riprende legge questo, poi `docs/b17/gesti-video.md` §2 RISULTATI). Aggiornato a ogni commit.

## Fatto (09/11/2026)
- `estrai-posa.mjs`: opzione `--ranges`; Pose *full* al posto di *heavy* (provato: ≤ 6 px di scarto su gomito/polso, 5× più
  veloce). Estrazione completa dei tratti dei colpi più la presa: 887 fotogrammi (p1 30–150 e 225–360, p2 432–612 e
  660–720, p3 807–1010, p4 721–756 e 1011–1158) in 4 processi, 14 min; JSON di MediaPipe nel blocco appunti
  `scratchpad/b17/mp-p1..p4.json` (fuori dal repository come i fotogrammi).
- `ricostruisci.mjs`: **errore corretto** (costo con `dot` a 3 componenti: l'ottimizzatore non faceva passi; riproiezione
  35 → 6–12 px); peso della profondità 0,25 → 0,6 e continuità 0,12 → 0,3; ricerca della scala ±10 % (conferma ×1,00);
  segmentazione rifatta (impatto dalla velocità 2D, carica = ultimo minimo di velocità o punto più lontano, battuta del
  servizio = mano più alta, lancio debole non vincola, finestra del servizio 3 chiusa a 29,6 s); presa in primo piano
  come misure 2D (`grip`, `tipo: presa_2d`); flag `mano_interpolata`/`schermo_visto` nei campioni e conteggi per colpo;
  misure aggiunte: apertura del gomito, inclinazione del telefono, strada della mano, mano più a destra/più alta prima
  dell'impatto.
- `fogli.mjs`: foglio della presa in primo piano, scritta «MANO INTERPOLATA».
- Risultati: `docs/b17/gesti-video.json` (12 voci: grip, forehand0, ready, forehand, backhand, serve1 (errore), serve2–3,
  slice1–4) e `docs/b17/gesti-video.md` §2; fogli `docs/b17/img/V-*.webp` (11, tutti guardati: vedi sotto).
- Prove: gioco `npm test` 975/975 (sull'albero prima delle ultime modifiche agli script, che i test non importano), sito
  200/200, `npm run build` ok.

## Correzioni dopo la revisione (09/11, stesso giorno; commit nel worktree B17.1)
- Riprodotti sui fotogrammi originali e corretti i quattro bloccanti della revisione del passo «dati»:
  1. **ready** 7,5–9,2 s conteneva il 1º dritto (posa salvata = fotogramma 250 con il braccio disteso, 3,9 m/s) → tratto
     `ready` 9,4–9,7 s (fermo: velocità 2D massima 0,16 m/s, controllo `mano_ferma`/`avviso` nello script) e nuovo tratto
     `forehand0` 7,6–9,2 s (impatto 8,43 s, 2,9 m/s 2D, confrontato con il 2º dritto in §2.3).
  2. **serve1** 17,4–20,4 s non era un servizio (telefono con due mani davanti al viso, polso destro 63 px sotto il naso) →
     regola «polso destro sopra il naso» obbligatoria; il tratto è `errore` nel JSON con `diagnostica`, riga marcata in
     tabella, `V-serve1.webp` tolto, §2.5 non spiega più il 1,39 m con la profondità.
  3. **serve2**: carica = ultimo fotogramma con la mano all'anca (23,00 s), arrivo in alto 23,27, battuta 23,70, fine 24,00;
     `lancio_visto` solo con la sinistra ≥ 0,10 m sopra le spalle (mai nei servizi: `lancio_visto false`, nota).
  4. **slice3** in carica su un falso minimo (27 px, p −90° e −10°) → in `reconstruct` ogni fotogramma con riproiezione
     > 18 px o oltre i limiti di > 3° si rifà dalla griglia di 72 partenze e si tiene la soluzione con il costo delle
     osservazioni minore (margine 20 %): tagliato 3 in carica 8 px, p 82° e 64° come il tagliato 1; 14 fotogrammi cambiati
     su 115 rifatti (anche rovescio e servizio 3).
- Minori: `metodo.tracciamento` dai metadati dei file d'ingresso (Pose *full*); «LANCIO» nei fogli solo se visto (e
  didascalia «IN ALTO», «RIFATTO DA GRIGLIA», «oltre i limiti»); limiti superati riportati per campione e per colpo
  (ora ≤ 1,6° nei colpi); velocità 3D dichiarate indicative; camera alla **destra** di chi gioca (era scritto a sinistra);
  indizio quantitativo sulle lunghezze dei segmenti in §2.5; §2 dice il vero sui fogli guardati (ora tutti gli 11).
- Verifiche: JSON rigenerato due volte identico byte per byte; fogli rigenerati (11) e **tutti guardati**: V-ready,
  V-forehand0, V-serve2, V-serve3, V-slice3, V-slice4, V-backhand guardati in questo giro, dritto/tagliati 1–2/presa
  invariati nei numeri; `npm test` 975/975, sito 200/200, `npm run build` ok. Non verificato: l'ipotesi della focale
  (720 px), le lunghezze dei segmenti dell'utente, il telefono reale.
- Numeri cambiati rispetto al commit precedente: rovescio (riproiezione 24 → 15 px, angoli diversi ma ancora non
  attendibili), servizio 2 e 3 (carica/inizio), tagliato 3 (carica); dritto 2ª rip., tagliati 1, 2, 4 e presa invariati.

## Che cosa manca / punti aperti per chi riprende
- Il gomito nei tratti con il braccio disteso è sottostimato (49–64° di flessione dove il video mostra ~20–30°, anche
  nella partenza ferma): limiti della profondità con una camera e segmenti del modello ~15–20 % troppo lunghi rispetto al
  corpo in pixel (§2.5 del documento). Il passo B deve usare le posizioni misurate, non gli angoli del gomito, in quei
  tratti, o adattare le lunghezze dei segmenti a chi gioca.
- Orientamento del telefono a bassa confidenza (errore d'asse 37,5° con il modello `upright` corretto): rifare con la
  presa delle foto del 09/11 come modello di partenza.
- Rovescio a due mani: riproiezione 15 px (mani sovrapposte); foglio `V-backhand.webp` guardato. Nel foglio del rovescio la catena segue i punti solo grossolanamente (18–32 px): con
  il busto girato di ~70° e le due mani sovrapposte la ricostruzione del rovescio **non va usata** per le pose, solo i
  tempi e la traiettoria 2D del polso di Pose. Il servizio dell'utente non ha lancio (sinistra mai sopra le spalle): il
  passo B lo tratti come «mano dall'anca sopra la testa, fermo, discesa». Il tagliato 2 (dritto) è pulito (8–12 px): cima alta alla spalla destra,
  impatto al petto, fine bassa a sinistra con il telefono quasi orizzontale.
- Il video e i fotogrammi restano fuori dal repository; i JSON di MediaPipe stanno nel blocco appunti della sessione.
