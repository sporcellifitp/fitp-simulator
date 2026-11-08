# B17.3 · Riferimento del punteggio (schermata mandata dall'utente l'08/11 sera)

La schermata è di un videogioco di tennis commerciale (il file resta fuori dal repository, in
`scratchpad/b17-riferimenti/punteggio-riferimento.webp`): si prende la **disposizione**, non la grafica.
Schermata 1280×720; il tabellone sta in alto a sinistra a circa 30 px dal bordo sinistro e 45 px dall'alto.

## Com'è fatto (misure in px sulla schermata 1280×720)
- **Riquadro** scuro semitrasparente (nero ~80%), angoli appena smussati, circa **165 × 60 px**: due righe da ~28 px.
- A sinistra una **linguetta colorata** verticale per riga (colore della squadra/giocatore) larga ~6 px.
- Colonne, da sinistra: **chi serve** (pallina gialla ~8 px, solo sulla riga di chi serve) · **nome** abbreviato in
  maiuscolo (3 caratteri, bianco, ~17 px, grassetto) · **set** · **game** (cifre bianche ~17 px, tabellari) · **punti del
  game in corso** in una **casella piena gialla/oro** (~24 × 26 px) con la cifra scura, allineata al bordo destro del
  riquadro (la casella è il punto più luminoso del tabellone: si legge da lontano).
- Niente intestazioni («Game», «Punti»), niente formato in parole: la lettura è «nome · numeri · punti evidenziati».
- Il resto dell'angolo è libero; a destra in alto, separati, gli avvisi di rete.

## Traduzione per NATPF (stesse funzioni di `natpf_scoreboard.js`, cambia il disegno)
- Posizione: angolo in alto a sinistra dell'area di gioco, `left` ≈ 2,3 cqw, `top` ≈ 6 cqh (mai sopra il campo).
- Grandezza: a 1280×720 il riquadro ≈ **200 × 72 px** (un terzo più grande del riferimento, come chiesto: «più grande e
  leggibile»); misure in cqh: riga ≈ 4,6 cqh, testo nome/numeri ≈ 2,6 cqh (≥ 15 px), casella dei punti ≈ 3,6 × 4 cqh con
  cifra ≈ 2,8 cqh. Su 1920×1080 scala con lo schermo; sul ledwall 720×720 resta leggibile da 3 m (testo ≥ 16 px).
- Righe: prima chi guarda (come oggi), linguetta colorata (giallo per «me», rosa per «them» come nei colori attuali),
  pallina di chi serve nella prima colonna, **nome abbreviato** (prime 3–4 lettere maiuscole: «TU», «CPU», «P1»/«P2» o
  le prime lettere del nome scelto; il nome intero nel `title`), **game**, **punti** nella casella piena gialla (0, 15,
  30, 40, «AD» per il vantaggio: la casella deve restare della stessa larghezza).
- Niente intestazione «Game/Punti» e formato della partita spostato in un **sottotitolo piccolo** sotto il riquadro
  (≥ 11 px), insieme a «Parità»/«Vantaggio …» quando c'è.
- Set: la partita del motore non ha set; la colonna non si mostra (resta game + punti).
- Stesso schermo: lo stesso riquadro in alto a sinistra di ciascuna metà, con P1 e P2.
