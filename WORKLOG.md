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
- Checkpoint 15 (23/10): Consegna del 23/10 (commit `9244b45`): `natpf-simulator-cloudflare-20261023.zip` (23,7 MiB, 84 file, nessuno oltre 25 MiB, contenuto di `dist` più `_headers`) e `natpf-simulator-lan-windows-20261023.zip` (57,2 MiB, Node.js 22.22.0 per Windows con SHA-256 verificato sull'elenco ufficiale). Provati estratti: lo zip Cloudflare servito come sito statico passa il 1v1 nel browser 18/18; il pacchetto LAN avvia il server HTTPS con il certificato locale e risponde con gioco, pagina del telefono, file della webcam, grafica e stanza del 1v1. Nessun certificato, chiave o nome vietato negli zip.
- Checkpoint 16 (23/10): richiesta del 23/10, passi 1 e 2 (diagnosi e misura).
  - Diagnosi in `docs/NATPF_DIAGNOSI_2026-10-23.md` dagli allegati (registro, metriche, rapporto, video della partita con
    il riquadro della webcam; allineamento video = registro + 9,35 s). Cause verificate: calibrazione rapida con un dritto
    da 143 °/s (soglie al livello del rumore, 28 gesti accettati sotto 200 °/s); preparazione giocata come colpo e colpo
    vero scartato perché arriva 10–300 ms dopo l'arrivo della palla al punto d'impatto (episodi A e B nel video); palle
    corte dai micro-movimenti; impatto sempre a 0,50–0,54 m appena dopo il rimbalzo (palla che dopo il rimbalzo sale
    poco e ha il colmo dietro la posizione più arretrata); a Leggenda il lungolinea non supera 1,7 m dal centro; mira del
    piatto satura in 26 colpi su 67. Mancano il video dell'impugnatura e i campioni grezzi del telefono (chiesti).
  - Misura: il telefono manda i gesti scartati con il motivo (`gx` → `tel.scartato`: debole, corto, lento, verso, rientro,
    in rientro, orientamento, fase), il dispositivo e il browser (`dev` → `tel.dispositivo`) e il segno «qui è successo
    un problema» dal pulsante sulla pagina del telefono (`mk` → `marca`); preparazioni nel registro (`tel.prep`); evento
    `piano` con il suo tempo al contatto in `tc` (prima copriva l'istante dell'evento); collegamento con arrivi al
    secondo, buco più lungo e grappoli (prima una media mobile che segnava 200–520 «Hz»); fotogrammi oltre 25 ms;
    versione della build (`site/js/tennis/version.js`) nella sessione. Metriche e riassunto: gesti scartati sul telefono,
    buchi dei messaggi, fotogrammi doppi, altezza dell'impatto e tempo dal rimbalzo al colpo, segni.
  - Prove: `tools/test` 140/140 (nuovi: `swing-discard.test.mjs`, due prove in `phone-link-fast.test.mjs`), `npm test`
    295/295 (nuove due prove in `natpf-diag.test.mjs`).
- Checkpoint 17 (23/10): passi 3a (telefono) e 3b (Android) della richiesta del 23/10; dettagli in
  `docs/NATPF_DIAGNOSI_2026-10-23.md` §7.
  - Telefono: soglie in proporzione a chi gioca e colpo tipico per direzione, calibrazione con il controllo dello
    squilibrio, attesa del colpo vero dopo un gesto debole (anche al servizio), ritorno del braccio e recupero che non
    blocca, palla corta solo da un gesto vero, pallonetto solo con il braccio che sale, mira dal piatto pesata,
    impugnatura di taglio (forma del colpo rispetto alla gravità; la pagina non blocca più in orizzontale).
  - Scoperta: la prova dello scambio (`natpf-rally.mjs`) non faceva più colpi (0 su 0) con la pausa dei sensori fermi:
    il suo telefono simulato mandava i sensori solo durante i gesti. Un telefono vero li manda di continuo: corrette le
    quattro prove che non lo facevano (scambio, latenza, presa verticale e del 19/10), come le altre cinque.
  - Android: pausa e ripresa controllata sul computer (`natpf_phone_watch.js`), blocco dello schermo ripreso e avvisi sul
    telefono (`phone-keep.js`), ritorno in primo piano senza chiudere un collegamento vivo. Prova nuova nel browser
    `natpf-phone-keep.mjs`; il primo giro ha trovato un difetto mio (l'avviso dei sensori restava dopo la
    riattivazione), corretto.
  - Prove: `tools/test` 148/148, `npm test` 315/315 (prima di cambiare il codice del motore, 5 delle prove nuove
    fallivano sul codice di prima: provano il difetto). CI completa in locale durante il lavoro: telefono 10/10, tempi
    8/8, gesto e calibrazione 18/18, grafica 9/9, pacchetto ridotto 5/5, 6/6 e 10/10, LAN in Node 4/4, nel browser 3/3 e
    7/8 (limite noto), pacchetti; motore nel browser: diagnostica 24/24, allenamento 13/13, latenza 9/9, presa verticale
    10/10, presa del 19/10 10/10, menu 22/22, ricollegamento 6/6, rete che cade 6/6, build, 1v1 18/18; dopo le
    correzioni: scambio 7/7, telefono che smette di funzionare 13/13. Validazione fisica non eseguita.
  - CI completa in locale sul commit `cf3a27d` (copia separata, senza modifiche in corso): tutto come sopra, più scambio
    7/7 e telefono che smette di funzionare 13/13; LAN nel browser 7/8 (limite noto).
- Checkpoint 18 (23/10): passo 3c (webcam), dettagli in `docs/NATPF_DIAGNOSI_2026-10-23.md` §7.
  - Misura: camera chiesta e ottenuta, ritmo al secondo (fotogrammi presentati, buchi, inferenze, età del dato, thread
    occupato), stati della mano, cambi del modello; metriche per livello e nel confronto tra sessioni.
  - Catena: inferenza dal fotogramma nuovo, fuori dal ciclo di disegno, una alla volta sull'ultimo fotogramma; carico
    adattivo del modello (completo → leggero → una mano) con il cambio fuori dai punti.
  - Continuità: niente colpi dal flusso ottico con la mano persa da oltre 0,7 s o mai vista (la prova nuova fallisce
    sul codice di prima); pausa della partita con le istruzioni, ripresa con il conto alla rovescia, punto rigiocato.
  - Scoperte nel browser con la webcam finta e la grafica software: inferenza ~240 ms, thread al 98%, la pagina vede pochi
    richiami dei fotogrammi (per questo i fotogrammi si contano da quelli presentati); ricaricare il modello ferma il
    gioco 2,2–2,4 s (per questo il cambio aspetta la fine del punto). Il video del modello fuori dal documento qui riceve
    i fotogrammi come quello nella pagina (20 Hz): messo comunque nella pagina, come il video della diagnostica.
  - Prove: `npm test` 328/328, `tools/test` 148/148, `natpf-webcam-pipeline.mjs` (nuova) 10/10. Validazione fisica
    non eseguita.
- Checkpoint 19 (23/10): passo 4, campo aperto (C3, C4, C5); misure prima e dopo in `docs/NATPF_DIAGNOSI_2026-10-23.md` §7.
  - C3: il tempo copre da una riga all'altra a tutti i livelli, stessa ampiezza; passo oltre la finestra per livello;
    incrociato stretto solo dalla parte dell'incrociato. Le prove nuove (`natpf-campo-aperto-23-10.test.mjs`) falliscono
    sul codice di prima (lungolinea e ampiezza per livello).
  - Scoperta: con il lungolinea pieno al bordo della finestra il passo oltre la finestra (1,4 m per unità) mandava fuori
    appena oltre il bordo (Pro amatore 79 → 67% al primo tentativo): passo per livello. E l'accorciamento degli angoli
    valeva anche per il lungolinea: palle ammucchiate a 6,5–7 m vicino alle righe (prova della concentrazione 2,02%).
  - C4: forza rispetto al colpo tipico imparato giocando (`powerRefs`, anche nel telefono simulato).
  - C5: misura nuova (`audit:rally -- --cpu`): a Pro 0% di vincenti anche con la palla a 4–6 m dalla CPU; causa: la CPU
    di Casual e Pro cambiava verso all'istante. Ora accelera e frena; a Pro meno errori a caso per restare nel 70–85% di
    game contro «medio» (primo tentativo 89%, KO). Leggenda invariata.
  - La prova nel browser dello scambio (`natpf-rally.mjs`) contava su una CPU che riprende tutto (6 colpi in un punto):
    ora gioca più punti e conta i colpi su tutti; ogni gesto colpisce tranne quelli per una palla della CPU che esce.
  - Prove: `npm test` 333/333, scambio nel browser 7/7. Validazione fisica non eseguita.
  - CI completa in locale sul commit `4623ea1` (copia separata): tutto passa (scambio 7/7, Android 13/13, webcam 10/10,
    diagnostica 24/24, 1v1 18/18…), LAN nel browser 7/8 (limite noto).
- Checkpoint 20 (23/10): passo 4, ritmo (C1–C2), dettagli in `docs/NATPF_DIAGNOSI_2026-10-23.md` §7.
  - Banco nuovo `audit:rhythm`; profilo nuovo «umano» nel banco degli scambi (gesto dal rimbalzo, dato del 23/10).
  - Scoperte: il limite fisso della palla passata (15,6 m) tagliava la finestra in ritardo a chi arretra (Pro medio
    68 → 42% al primo tentativo, «perso: Point» da 64 a 204); arretrare per il colmo a Leggenda costa (palle corte della
    CPU); un volo della CPU più lungo peggiora Leggenda (palle alte → lunghe).
  - Scelta prudente: colmo quando è raggiungibile a Casual, Pro e 1v1; Leggenda invariata; `?ritmo=colmo|prima` per il
    confronto con la prova fisica. Le prove nuove del ritmo falliscono sul codice di prima.
  - Prove: `npm test` 335/335; `audit:legend` tutti i criteri (preciso 71,9%, tennista 95,3%, Pro contro medio 78,3%,
    Casual contro medio 99,8%). Validazione fisica non eseguita.
- Checkpoint 21 (23/10): passo 5, verifica e preparazione della prova reale; dettagli in
  `docs/NATPF_DIAGNOSI_2026-10-23.md` §7.
  - Rapporto: mappa dei rimbalzi; pause per il telefono nelle metriche. Testi della mira con il tempo. Guida alla prova
    fisica `docs/NATPF_PROVA_GUIDATA_2026-10-23.md`, controllata sul codice: corretti in bozza il numero dei gesti della
    calibrazione rapida (due, non quattro), i nomi dei pulsanti della diagnostica, le opzioni già spuntate, i motivi
    della pausa con la Wi-Fi spenta.
  - Banco `-- --cpu` con dove la CPU colpisce e quanto corre. Scoperta: la palla profonda sposta indietro la CPU (colpisce
    a 11,8–12,1 m dalla rete) ma a Pro costa poco in errori (15,6% contro 15,2%): punto aperto per la prova fisica.
  - Pacchetti dal commit `90c4bc1` (build `2026-10-23.2`): `natpf-simulator-cloudflare-20261023-2.zip` (23,7 MiB, 73
    file, nessuno oltre 25 MiB) e `natpf-simulator-lan-windows-20261023-2.zip` (57,2 MiB, Node.js 22.22.0 con SHA-256
    verificato). Provati estratti: 1v1 nel browser sullo zip Cloudflare 18/18; pacchetto LAN con certificato creato e
    server HTTPS che risponde con gioco, pagina del telefono, modelli delle mani, grafiche, avvio guidato e relay 1v1.
    Nessuna chiave privata (gli unici certificati sono le radici pubbliche dentro `node.exe`), nessun nome vietato.
  - CI completa in locale sul commit `90c4bc1` (copia separata): tutto passa, LAN nel browser 7/8 (limite noto). Validazione fisica non eseguita.
- Checkpoint 22 (23/10, sera): due richieste dopo la consegna (sfida online, Player 2, sei punti di gioco); dettagli in
  `docs/NATPF_SEGNALAZIONI_2026-10-23_SERA.md`.
  - Commit: `4699a2e` (Player 2 calibra nel campo d'allenamento), `186d898` (risposta al servizio da fondo campo),
    `9ab1c7f` (fine del punto: chi vince e chi ha sbagliato), `d5a4333` (moviola dell'ultimo punto), `8fe6f27` (a rete
    con il tempo perfetto la palla passa), `3f84f1a` (pallonetto e palla corta), `d216f73` (figura dell'impugnatura),
    `dbc41b4` e `4b6ec72` (sfida online), `da5d1b0` (palla corta in partita), `f0e5abb` (prova LAN della sfida).
  - Scoperte:
    - la risposta al servizio correva a rete nel 100% dei servizi;
    - la moviola non registrava nulla;
    - a Leggenda la palla corta ripresa di corsa andava in rete 67 volte su 70 con il tempo perfetto;
    - il telefono scartava i gesti verticali (44 su 96 riconosciuti) e il tremolio del passo «fermo» alzava le soglie
      a 300 °/s;
    - la sfida online funziona con il server di segnalazione pubblico (collegati in 0,5 s), ma quando la rete blocca il
      collegamento diretto il gioco non lo diceva.
  - Decisioni:
    - a rete con il tempo perfetto la situazione dà una palla debole, non l'errore; la pressione degli scambi lunghi
      resta;
    - i gesti speciali si imparano negli esercizi (prototipi del proprio gesto);
    - nella sfida online, diagnosi del collegamento e lobby più semplice;
    - il relay (TURN o Worker) non è stato aggiunto: decisione chiesta alla persona (§8.4 del documento).
  - CI completa su `dbc41b4`: tutto passa tranne LAN nel browser 7/8 (limite noto), webcam 9/10 una volta (da sola
    10/10 tre volte) e gesti speciali 8/9.
  - Il fallimento dei gesti speciali è un difetto vero, già in `3f84f1a`: il «8 su 8» scritto in quel commit non si
    riproduceva. Causa: gli esercizi speciali insegnavano il colpo normale e la forza del confronto seguiva il colpo
    tipico. Corretto in `da5d1b0`: 9/9 tre volte su tre.
  - La prova LAN della sfida (fuori dalla CI) era ferma dal 20/10 per l'intro e il telefono predefinito: aggiornata,
    10/10.
  - Prove sul codice finale: `npm test` 370/370, `tools/test` 148/148; nel browser 1v1 25/25, gesti speciali 9/9, gioco
    del 23/10 11/11, allenamento 13/13, diagnostica 24/24, scambio 7/7, menu 22/22, LAN 1v1 10/10. Validazione fisica
    non eseguita.
