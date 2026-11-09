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
- Risultati: `docs/b17/gesti-video.json` (11 voci: grip, ready, forehand, backhand, serve1–3, slice1–4) e
  `docs/b17/gesti-video.md` §2; fogli `docs/b17/img/V-*.webp` (11), guardati: dritto, tagliato 1, servizio 3, presa.
- Prove: gioco `npm test` 975/975 (sull'albero prima delle ultime modifiche agli script, che i test non importano), sito
  200/200, `npm run build` ok.

## Che cosa manca / punti aperti per chi riprende
- Il gomito nei tratti con il braccio disteso è sottostimato (49–64° di flessione dove il video mostra ~20–30°) e la mano
  del servizio 1 viene messa a 1,39 m: limiti della profondità con una camera e della spalla fissa del modello (§2.5 del
  documento). Il passo B deve usare le posizioni misurate, non gli angoli del gomito, in quei tratti, o adattare le
  lunghezze dei segmenti a chi gioca.
- Orientamento del telefono a bassa confidenza (errore d'asse 37,5° con il modello `upright` corretto): rifare con la
  presa delle foto del 09/11 come modello di partenza.
- Rovescio a due mani: riproiezione 24 px (mani sovrapposte); da guardare il foglio `V-backhand.webp` prima di usarlo.
- Fogli guardati solo per dritto, tagliato 1, servizio 3 e presa; gli altri 7 sono generati ma non ancora esaminati.
- Il video e i fotogrammi restano fuori dal repository; i JSON di MediaPipe stanno nel blocco appunti della sessione.
