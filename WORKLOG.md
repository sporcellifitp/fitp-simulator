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
