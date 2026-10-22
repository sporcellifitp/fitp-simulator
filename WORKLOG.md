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
- Checkpoint 10 (22/10, notte): unito nel branch unico l'ultimo commit della seconda sessione (`40d58b2`, fatto sul
  branch vecchio dopo il merge del checkpoint 9), con un merge e senza doppioni.
  - Tenuto dal branch unico: piano d'intercetto valido solo per la sua palla (`livePlan`, traccia entro 0,6 m) e
    lanciapalle con il piano. La correzione di `40d58b2` per lo stesso difetto (piano cancellato a ogni lancio e nella
    palla della calibrazione, piano tolto a mano nella prova della latenza) e i suoi due test sono stati lasciati
    fuori: il test «piano vecchio» del branch unico prova già lo stesso caso.
  - Portato dentro: salita abituale per verso dalla calibrazione (`profile.rises`, `riseRefOf`, `classifyStroke` con
    `riseRef`, campo `abituale` nell'intenzione della diagnostica) per la presa del 19/10; telefono simulato con la
    forma del colpo (`simPhone({ shape })`) e audit della calibrazione con `--forma`; prova nel browser della presa
    del 19/10 come file a parte (`tools/e2e/natpf-phone-upright-19-10.mjs`, gesti di `84ca878` resi fisicamente
    coerenti), accanto a quella con i gesti della racchetta simulata; commento della webcam corretto; testo del
    pulsante della prova guidata (5 minuti, tagliati e palle corte).
  - Prove dopo l'unione: `npm test` 279/279, `tools/test` 135/135. Le prove nel browser e le misure della presa del
    19/10 sul branch unito sono il primo lavoro del passo 16.
- Checkpoint 11 (22/10, notte): richiesta nuova, gameplay come il gioco di riferimento indicato (benchmark vincolante).
  - Il nome del gioco è stato verificato in rete (uscito oggi): il tennis c'è; le meccaniche si conoscono solo dai testi
    (pagina ufficiale e quattro recensioni), non dai video, che da qui non si guardano.
  - Audit (fase A): la mira è continua ma schiacciata e satura (tempo pieno a 0,15–0,2 s mentre lo swing vale fino a
    0,5 s prima; profondità dei colpi normali in 2,5 m; caduta indipendente dalla posizione di chi colpisce); il
    recupero dopo il colpo manda e tiene a rete chi colpisce da dentro il campo (56–89% dei colpi nelle partite
    simulate). Nuova sintesi `npm run audit:rally -- --campo`.
- Checkpoint 12 (22/10, notte): fase B del passo 17 (il passo 16 di prima).
  - Swing corti (difetto 5): forza dal picco vero dei campioni grezzi (`vr`, vertice della parabola) con il riferimento
    grezzo della calibrazione (`rawRef`); profondità voluta per l'80% dalla forza.
  - Diagnostica: esito della racchetta registrato una volta sola (evento `racchetta`, con il numero del colpo e il tempo
    nella finestra); tolti `colpo.gioco.racchetta`, `colpi.racchetta` e `racchetta.perColpo`; `ripetibilita` parte dai
    gesti o, senza, dagli esiti.
  - Partita intera col telefono della pagina storica (difetto 7): cause nella prova (comandi lasciati spenti dal
    controllo di mouse e tastiera, robot che ignorava il tempo lento della partita con la grafica software, lancio senza
    nuovo tentativo); ora 17/17.
  - Prove della CI della pagina storica (difetto 6): 20/20 a macchina scarica con il rilevatore attuale e con quello di
    `84ca878`; non riprodotto.
  - Presa del 19/10: prova attuale 10/10, prova coerente della seconda sessione 10/10, prova di `84ca878` 7/10 (spiegata:
    calibrazione senza pronazione, «pallonetto» che per la racchetta virtuale è la testa che scende, piatto tarato sul
    modello di prima). Nuovo: salita abituale imparata giocando quando la calibrazione manca («Salta»).
  - Prove: `tools/test` 135/135, `npm test` 281/281; CI del sito in locale: telefono 10/10, tempi 8/8, gesto e calibrazione 18/18, grafica 9/9, pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4, nel browser 3/3 e 7/8 (limite noto del contenitore), pacchetti creati; motore base nel browser: diagnostica 24/24, allenamento 13/13, risposta al gesto 9/9, presa verticale 10/10, presa del 19/10 10/10, menu 22/22, ricollegamento 6/6, rete che cade 6/6; partita intera della pagina storica (`phone-cal.mjs`) 17/17.
- Checkpoint 13 (22/10, notte): fase C del passo 17, campo aperto e movimento.
  - Esito: tempo continuo su tutta la finestra d'impatto (prima piatto oltre 1,6 volte la finestra), mira attorno a un
    punto neutro che segue la palla, lato del colpo dal gesto (prima dalla palla rispetto al corpo: il movimento
    automatico poteva ribaltare la direzione), profondità su tutto il campo (top spin 6–11,4 m, prima 7,4–10,9),
    assistenza morbida che non cambia l'ordine delle direzioni.
  - Movimento: volée solo quando aspettare il rimbalzo costerebbe almeno 0,35 s di corsa in più; dopo il colpo verso il
    fondo se si fa in tempo prima del colpo dell'avversario, a rete solo se una palla corta ha portato lì.
  - Diagnostica: mira, punto neutro, palla all'impatto, assistenza, volo nell'evento `racchetta`; scarto tra caduta
    calcolata e rimbalzo vero nelle metriche.
  - Misure (giocatori simulati): verso la rete 46–89% → 0–0,1%, volée 33–69% → 0–0,1% a Casual ed Esperto (a Leggenda su palle
    corte e pallonetti), Leggenda con tutti i criteri; i profili del telefono vincono più punti (Esperto, amatore
    57% → 80%): da rivedere con partite vere.
  - Prove: `tools/test` 135/135, `npm test` 293/293; CI del sito in locale: telefono 10/10, tempi 8/8, gesto e calibrazione 18/18, grafica 9/9, pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4, nel browser 3/3 e 7/8 (limite noto), pacchetti creati; motore base nel browser: scambio vero (`natpf-rally.mjs`, nuova) 7/7, diagnostica 24/24, allenamento 13/13, risposta al gesto 9/9, presa verticale 10/10, presa del 19/10 10/10, menu 22/22, ricollegamento 6/6, rete che cade 6/6, build e 1v1 18/18.
- Checkpoint 14 (22/10, notte): fasi D ed E del passo 17.
  - Sincronia, animazioni, recupero, prospettive e continuità guardati nel browser con una prova nuova, lo scambio vero
    contro la CPU (`natpf-rally.mjs`): racchetta sulla palla all'impatto dal lato del gesto, ritorno in fondo dopo ogni
    colpo, personaggio rivolto alla rete, visuale che segue. Nessun difetto da correggere trovato.
  - Regola di marchio: tolti i nomi del gioco di riferimento e del suo editore da documenti vecchi e codice (commento,
    nomi interni del materiale dei personaggi, selettore CSS non usato); il passaggio di consegne del 17/10 (con il nome di uno strumento esterno nel titolo) rinominato
    `docs/NATPF_PASSAGGIO_2026-10-17.md`.
  - Validazione fisica: punto 14 (campo aperto) nella procedura del §5 di `docs/NATPF_RACCHETTA_VIRTUALE.md`.
  - Difetto 6 sotto carico: con due processi che occupano la CPU, «gesture and calibration» passa 2 volte su 3 sia con il rilevatore attuale sia con quello di `84ca878`, «timing-browser» 1 su 3 con tutti e due; «timing-browser» non usa nemmeno il rilevatore (manda pacchetti di colpo già pronti). Il difetto 6 non è nel passo «fermo»: le due prove sono sensibili al carico (a macchina scarica 20/20). Meccanismo visto in «gesture and calibration»: la prova congela la partita al colmo del lancio e aspetta il secondo gesto; sotto carico il gesto arriva oltre 0,8 s dopo l'ultimo fotogramma mostrato e il gioco lo scarta come colpo vecchio (regola voluta: i colpi non si rimappano su fotogrammi vecchi).
  - Trovato: le prove degli inviti della pagina storica (`tools/e2e/invite.mjs`, `invite-timing.mjs`, fuori dalla CI) sono ferme dal 15/10: cliccano la scelta dei comandi (`#ctrlMouse`, `#ctrlPhone`), tolta quel giorno con i comandi solo dal telefono (`ca4548a`, `23e6cac`); vanno riscritte con un telefono simulato anche per chi invita.
  - Prove: `tools/test` 135/135, `npm test` 293/293; CI del sito in locale: telefono 10/10, tempi 8/8, gesto e calibrazione 18/18, grafica 9/9, pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4, nel browser 3/3 e 7/8 (limite noto), pacchetti creati; motore base nel browser: scambio vero 7/7, diagnostica 24/24, allenamento 13/13, risposta al gesto 9/9, presa verticale 10/10, presa del 19/10 10/10, menu 22/22, ricollegamento 6/6, rete che cade 6/6, build e 1v1 18/18.
