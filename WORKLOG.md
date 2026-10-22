# WORKLOG · decisioni e checkpoint

Cronologia breve delle decisioni e dei checkpoint dei giri di lavoro lunghi. Lo stato da cui ripartire è in
`SESSION_HANDOFF.md`; la memoria del progetto in `MEMORY.md`.

## 22/10/2026 · giro «racchetta virtuale»

- Checkpoint 1: ZIP della sessione reale letto (eventi, metriche, profilo). Prime evidenze in `SESSION_HANDOFF.md`:
  lateralità del telefono e del computer non allineate, servizio sempre automatico, pallonetti con confidenza bassa,
  direzione dal piatto spesso saturata, colpi a vuoto con la palla lontana. Collegamento e prestazioni in ordine.
- Checkpoint 2 (fine diagnosi): `docs/NATPF_RACCHETTA_VIRTUALE.md` §2 (P1–P10).
  - Scoperte dai campioni grezzi:
    - dopo «Salta» della calibrazione il verso del gesto era sempre 0;
    - la deriva del giroscopio tolta era il movimento della mano;
    - il verso si misura dalla gravità senza calibrazione;
    - il percorso ottenuto integrando l'accelerazione non è affidabile a 60 Hz.
  - Decisioni:
    - la mano la decide il gioco sul computer;
    - il percorso della racchetta si calcola dal giroscopio (rotazione × asse lungo del telefono);
    - la direzione viene dal tempo dentro la finestra e dal piatto rispetto al proprio colpo abituale;
    - nessun numero casuale nel colpo di chi gioca;
    - finestra d'impatto arcade a tutti i livelli.
- Checkpoint 3: intenzione ed esito deterministici, finestra d'impatto, movimento automatico con volée e
  schiacciate.
  - Scoperta (P11): rigiocando i campioni grezzi, 13 colpi forti venivano scartati dopo la preparazione lenta, che il
    gioco giocava al loro posto.
  - Decisioni: errori di chi gioca solo dall'esecuzione, deterministici: tempo oltre la finestra, qualità sotto
    `failQ`, che dipende da corsa, palla pesante e pressione degli scambi lunghi.
  - Leggenda ritarata perché la sua forza veniva dagli errori casuali di chi gioca: CPU più veloce e con più portata,
    che cerca il vincente dove chi gioca non arriva.
  - Le palle che vanno fuori si lasciano andare: senza, gli scambi arrivavano a 60 colpi.
- Checkpoint 4: servizio dal gesto; Player 2 del 1v1 con lo stesso modello della racchetta.
  - Servizio: il gesto colpisce quando arriva, la qualità dipende dal momento rispetto al colmo del lancio; il gesto
    del lancio non serve.
  - Decisione: il P2 usa lo stesso esito e lo stesso piano d'intercetto di chi gioca qui, calcolati nel suo
    riferimento e poi specchiati (test con la stessa palla specchiata: stesso piano).
- Ripresa (seconda sessione, la prima si è fermata per il limite d'uso all'inizio del passo 10): lista dei passi
  verificata su `SESSION_HANDOFF.md`, documento e commit; nessun lavoro perso dopo `84ca878`. Branch
  `claude/determined-tesla-8dgaks`, portato in avanti su quello della prima sessione.
- Checkpoint 5: calibrazione tollerante e «Salta» con il gioco completo (passo 10).
  - Misura prima: con il tremolio di 25 °/s il passo «fermo» durava fino a 3,7 s e la calibrazione superava 10 s in
    2 prove su 12; anche con gesti perfetti i quattro gesti portavano a 8,3 s.
  - Decisioni: passo «fermo» sulla mediana (il tremolio resta, un movimento vero no); due gesti, come nel piano di P9;
    «Salta» chiude subito anche il passo «fermo».
  - Le prove nel browser hanno trovato due regressioni del giro, corrette: il riscaldamento non colpiva più le palle
    della calibrazione (finestra d'impatto), la pagina storica andava in errore sull'evento `hand`. Altre due
    (presa verticale e latenza) esistevano già a `84ca878`: annotate nel passo 13.
- Checkpoint 6: webcam con un solo soggetto e la mano scelta (passo 11).
  - Scoperta: con un'altra persona nell'inquadratura il gioco passava a lei dopo una perdita breve della mano di chi
    gioca (raggio della continuità che cresce con il tempo, scelta da capo dopo 0,5 s): 28 scenari giusti su 72.
  - Decisioni: le altre mani si ricordano e reclamano le mani vicine a loro; per 5 s si riprende solo una mano della
    taglia di chi gioca. Provate e scartate: una regola nel riconoscimento per i viaggi partiti con la mano in
    movimento (inutile negli scenari realistici, peggiorava il solo flusso ottico) e la quiete misurata sulla media di
    più campioni (aiutava con il tremolio, rompeva la «folla»).
- Checkpoint 7: campi nuovi della diagnostica (passo 12).
  - Decisioni: gesto ed esito si legano con il numero del colpo del telefono (non per vicinanza nel tempo); la
    ripetibilità è la variazione p90 − p10 per colpo richiesto, senza giudizio (il modello non ha caso, varia chi
    gioca); la direzione voluta si legge dal tempo nella finestra (±15%) accanto a quella ottenuta.
- Checkpoint 8: regressioni del passo 13 (prove nel browser che fallivano già a `84ca878`).
  - Latenza: la palla messa a mano dalla prova arrivava con la risposta della CPU ancora in volo, e il motore misurava
    il tempo sul piano d'intercetto di quella risposta (una palla sì e una no, riprodotto senza browser). Cercando la
    causa è emerso un errore vero: un piano «lascia andare» rimasto dalla partita scartava in silenzio ogni swing in
    anticipo sulle palle del lanciapalle e su quelle della calibrazione in campo. Decisione: ogni lancio cancella il
    piano della palla di prima; la palla della calibrazione (senza lancio) lo cancella da sé.
  - Presa verticale: la forma del colpo leggeva tagliati nei dritti con il polso che prona (presa del 19/10). Le prove
    della presa vera passavano solo perché il telefono simulato non mandava la forma. Decisione: salita abituale per
    verso dai due gesti della calibrazione, come già il piatto e la mira («rispetto al proprio colpo abituale»); le
    soglie dei colpi speciali si spostano solo per renderli più difficili, al massimo di 0,6. Scartate: il percorso
    della mano (accelerazione integrata) come conferma del tagliato, perché nei colpi veloci veri l'orientamento
    sbaglia e l'accelerazione centripeta finisce nella verticale (§2, dati insufficienti); una soglia legata
    all'inclinazione del manico, che non separa: con la presa inclinata di 60° il manico all'impatto è inclinato quanto
    nei tagliati veri del banco della racchetta (0,23 contro 0,26). Banco: colpi speciali non voluti da 1944 a 148 su
    5184; pallonetti uguali (638/864), palle corte da 172 a 106.
  - Prova nel browser della presa verticale: il telefono finto teneva la gravità sempre lungo il lato lungo; ora ruota
    con il telefono (anche la mira dal piatto girato torna a vedersi) e il pallonetto parte con il telefono inclinato
    in avanti, come il simulatore Node.
