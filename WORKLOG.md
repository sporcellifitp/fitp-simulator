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
- Checkpoint 5: webcam con un solo soggetto, tremolio, diagnostica, calibrazione.
  - Scoperta (prova con più persone nel simulatore): con la mano di chi gioca nascosta per un attimo, il salto sulla
    mano di chi guarda diventava uno swing; e una mano che entrava in movimento dopo una perdita faceva un colpo.
  - Decisioni: memoria delle «altre persone» (mani viste insieme alla propria); ripresa solo vicino a dove era la
    propria per 3 s; la mano ritrovata deve stare ferma prima dei colpi. Scartata la regola «la mano deve muoversi
    prima del salto»: con l'esposizione lunga faceva perdere swing veri (il banco della webcam lo mostrava).
  - Telefono: nessuno swing con il tremolio fino a 160 °/s; il tremolio vero è di pochi °/s.
- Checkpoint 6: test obbligatori, prima/dopo, documento.
  - Scoperte: la prova nel browser del telefono usava rotazioni del telefono sul proprio lato lungo (senza percorso
    della testa); con i gesti fisici la calibrazione falliva sull'apertura lenta (difetto vero, corretto); la prova
    della latenza falliva per un piano d'intercetto vecchio usato per una palla nuova (difetto vero, corretto: il
    piano vale solo per la sua palla); il lanciapalle non calcolava il piano.
  - Decisione: le prove nel browser rigiocano i gesti della racchetta simulata delle prove in Node; nella prova
    dell'allenamento il colpo si misura quando parte (finestra d'impatto), non nell'istante del gesto.
- Checkpoint 7 (fine giro): build, prove nel browser (telefono 10/10, allenamento 13/13, latenza 9/9, ricollegamento
  6/6, rete 6/6, menu 22/22, 1v1 18/18, diagnostica 23/23, LAN 7/8 per il limite noto), zip Cloudflare e LAN estratti
  e provati. Validazione fisica non eseguita: procedura nel documento §5.
- Checkpoint 8 (verifica dopo il confronto con un'altra sessione, che da `84ca878` ha rifatto i passi 10–12 su
  `claude/determined-tesla-8dgaks`): cinque difetti aperti, verificati qui (dettagli in `SESSION_HANDOFF.md`).
  - Regressione mia: l'evento `hand` manda in errore la pagina storica; la prova della CI «gesture and calibration»,
    che non avevo eseguito, fallisce (18/18 prima del giro e con la correzione di una riga).
  - La prova del telefono con la presa del 19/10, com'era prima, passa a `bfd629c` (10/10) e non sul codice finale
    (7/10): avevo sostituito i suoi gesti invece di correggere la lettura dei colpi.
  - Non fatti: calibrazione entro 10 s con il tremolio (criterio di P9), «Salta» durante il passo «fermo»; trovata la
    forza sottostimata negli swing corti.
- Seconda sessione, in parallelo (la prima si era fermata per il limite d'uso all'inizio del passo 10, poi ha
  ripreso): lista dei passi verificata su `SESSION_HANDOFF.md`, documento e commit; nessun lavoro perso dopo
  `84ca878`. Branch `claude/determined-tesla-8dgaks`, portato in avanti su quello della prima sessione.
- Seconda sessione, checkpoint 5: calibrazione tollerante e «Salta» con il gioco completo (passo 10).
  - Misura prima: con il tremolio di 25 °/s il passo «fermo» durava fino a 3,7 s e la calibrazione superava 10 s in
    2 prove su 12; anche con gesti perfetti i quattro gesti portavano a 8,3 s.
  - Decisioni: passo «fermo» sulla mediana (il tremolio resta, un movimento vero no); due gesti, come nel piano di P9;
    «Salta» chiude subito anche il passo «fermo».
  - Le prove nel browser hanno trovato due regressioni del giro, corrette: il riscaldamento non colpiva più le palle
    della calibrazione (finestra d'impatto), la pagina storica andava in errore sull'evento `hand`. Altre due
    (presa verticale e latenza) esistevano già a `84ca878`: annotate nel passo 13.
- Seconda sessione, checkpoint 6: webcam con un solo soggetto e la mano scelta (passo 11).
  - Scoperta: con un'altra persona nell'inquadratura il gioco passava a lei dopo una perdita breve della mano di chi
    gioca (raggio della continuità che cresce con il tempo, scelta da capo dopo 0,5 s): 28 scenari giusti su 72.
  - Decisioni: le altre mani si ricordano e reclamano le mani vicine a loro; per 5 s si riprende solo una mano della
    taglia di chi gioca. Provate e scartate: una regola nel riconoscimento per i viaggi partiti con la mano in
    movimento (inutile negli scenari realistici, peggiorava il solo flusso ottico) e la quiete misurata sulla media di
    più campioni (aiutava con il tremolio, rompeva la «folla»).
- Seconda sessione, checkpoint 7: campi nuovi della diagnostica (passo 12).
  - Decisioni: gesto ed esito si legano con il numero del colpo del telefono (non per vicinanza nel tempo); la
    ripetibilità è la variazione p90 − p10 per colpo richiesto, senza giudizio (il modello non ha caso, varia chi
    gioca); la direzione voluta si legge dal tempo nella finestra (±15%) accanto a quella ottenuta.
- Checkpoint 9 (22/10, sera): **branch unico**. Il branch della seconda sessione (`claude/determined-tesla-8dgaks`,
  `c5b9337`) è stato unito con un merge in `claude/friendly-fermat-dwv2w2`; da qui si lavora solo su questo.
  - Conflitti in 19 file. Dove le due sessioni avevano fatto la stessa cosa in modo diverso se ne è tenuta una, con le
    prove di entrambe: webcam della seconda (54 scenari giusti su 55 contro 49: la versione della prima perdeva colpi
    veri dopo una perdita breve della mano); calibrazione con due gesti e passo «fermo» tollerante (seconda) più i
    colpi completi (prima); calibrazione in campo con il colpo nello stesso istante del gesto (prima) e la palla che
    resta finché il colpo vola (seconda); campi della diagnostica nel formato con i nomi (seconda).
  - Test adattati all'unione, senza cambiare cosa provano: il test dei colpi completi segue `QUICK_PLAN`; il test della
    calibrazione in campo della seconda guarda il colpo per tutto l'intervallo invece che in un istante; la scena
    «mano nuova che entra lontano» è ora un limite noto della webcam (`docs/NATPF_WEBCAM.md`).
  - Risolti dall'unione: errore della pagina storica sull'evento `hand`, calibrazione oltre 10 s con il tremolio,
    «Salta» durante il passo «fermo».
  - Scoperta: il passo «fermo» nuovo di `swing-detect.js` (seconda sessione, `31d20b4`) fa fallire due prove della CI
    della pagina storica («gesture and calibration», «timing-browser»), anche sul branch della seconda sessione da
    solo; con il rilevatore di prima il branch unito le passa (18/18, 8/8). Anche `phone-cal.mjs` (fuori dalla CI) fallisce:
    in partita nessun lancio né colpo del telefono, anche con il rilevatore di prima (non verificato se già prima
    del giro).
  - Prove sul branch unito: `npm test` 276/276, `tools/test` 135/135, prove del gioco nel browser tutte superate (LAN
    7/8, limite noto); presa del 19/10 con i gesti di prima 7/10. Aperti: difetto 6 (pagina storica), presa del 19/10,
    forza degli swing corti, diagnostica in parte doppia; validazione fisica.
