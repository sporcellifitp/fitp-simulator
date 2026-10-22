# Modalità diagnostica di NATPF Simulator

Serve a migliorare il gioco con dati veri invece che con impressioni. Il ciclo è sempre lo stesso:

1. registri una sessione;
2. analizzi i dati;
3. trovi il problema;
4. si corregge;
5. ripeti la stessa sessione e confronti.

## Come si usa (senza competenze tecniche)

1. Apri la diagnostica in uno di questi modi:
   - **Maiusc+D**, in qualunque momento;
   - **Pausa → Diagnostica**;
   - l'indirizzo con `?diag=1`.
2. Scegli cosa registrare:
   - video della webcam del computer, che inquadra chi gioca (attivo all'inizio);
   - campioni dei sensori del telefono (attivi all'inizio);
   - video del gioco: spento all'inizio, perché pesa sulle prestazioni (vedi «Costo dei video»). Si accende quando serve vedere cosa mostrava lo schermo.
3. Premi **● Avvia registrazione** e gioca normalmente.
   - In alto compare **● REC** con il tempo.
   - **Maiusc+M** segna un momento («qui il colpo era sbagliato»).
   - Non c'è un limite di durata.
4. **Maiusc+D → ■ Ferma la registrazione**. Il pannello mostra un riassunto in parole.
5. **⬇ Scarica il pacchetto**: uno zip. Estrailo e apri `rapporto.html` con un doppio clic. Una registrazione lunga
   si salva in parti da 30 minuti: ogni parte compare nell'elenco («parte 2», «parte 3»…) e si scarica da sola.
6. Per confrontare due sessioni, spunta **confronta** su tutte e due: compare la tabella prima/dopo.

**Prova guidata dei colpi**, circa 5 minuti, dal menu principale:

- il lanciapalle chiede in ordine 10 dritti, 10 rovesci, 6 pallonetti, 6 tagliati, 6 palle corte (solo con il telefono),
  8 + 8 dritti incrociati e lungolinea, 6 + 6 rovesci incrociati e lungolinea, 10 misti;
- con il telefono la richiesta dice come si ottiene la direzione (racchetta virtuale, dal 22/10): un attimo in anticipo
  per l'incrociato, un attimo più tardi per il lungolinea;
- ogni richiesta finisce nel registro;
- alla fine la registrazione si ferma da sola e il pannello mostra il riassunto.

È l'unico modo per misurare automaticamente se il gioco riconosce il colpo giusto (vedi più sotto).

## Cosa si registra

Tutto è scritto in `eventi.jsonl`, un evento JSON per riga. `t` è in ms dall'inizio della sessione, sull'orologio del computer.

| Evento | Contenuto |
|---|---|
| `sessione`, `sessione.fine` | dispositivi, browser, scheda grafica, impostazioni, conteggi |
| `tel.colpo` | colpo del telefono: numero, percorso (veloce o affidabile), lato, tipo, perché, mira, istante del picco, tempi di riconoscimento, preparazione, consegna e totale; anche i colpi scartati, con il motivo. Racchetta virtuale: velocità al picco (`pk`, °/s), ampiezza (gradi), `forma` del gesto (piano, salita della testa, polso, manico, velocità della testa e della mano) e `intenzione` letta dal computer (tipo, sicurezza, forza, portata, profondità voluta, mira del piatto); null con i telefoni di prima |
| `tel.cal` | passi della calibrazione |
| `tel.stato` | collegamento, stato del telefono, presa, pagina visibile o nascosta, blocco dello schermo |
| `tel.orologio` | ogni scambio dell'orologio (invio e ricezione sul computer, ora del telefono) |
| `tel.link` | ogni secondo: da quale percorso è arrivata la prima copia dei colpi, frequenze dei messaggi |
| `palla` | posizione e velocità a ogni fotogramma mentre la palla è in gioco |
| `rimbalzo`, `punto`, `fase` | eventi del motore |
| `tentativo` | swing del giocatore: distanza palla–giocatore, correzione della latenza, velocità, se l'ha colpita |
| `colpo.gioco` | esito del colpo (tempo, qualità, punto di rimbalzo, direzione incrociato/lungolinea/centro) e colpi della CPU. Racchetta virtuale: `racchetta` con il numero del colpo del telefono (`n`, lo lega a `tel.colpo`), tempo nella finestra d'impatto (−1…+1, + anticipo), eccesso oltre la finestra, qualità, assistenza, fallito, in rete, tipo, punto di caduta nel riferimento di chi colpisce, volée |
| `input` | ogni comando arrivato al motore (telefono, webcam, mouse) |
| `webcam.frame`, `webcam.evento` | tracciamento della webcam: istante di cattura, fonte, mani viste, mano scelta, ms di riconoscimento, perdite e riprese; colpo anticipato (`event`, quello che usa il gioco) e conferma a fine gesto (`confirm`, solo qui) |
| `prestazioni` | ogni secondo: fps, fotogramma p50/p95/massimo, fotogrammi oltre 50 ms, aggiornamento e disegno p95, memoria, compiti lunghi, coda del disco, costo del registratore |
| `video`, `video.frame` | inizio e fine dei video; istante di cattura di ogni fotogramma della webcam |
| `atteso` | colpo richiesto dalla prova guidata (riferimento) |
| `marca`, `avviso` | segni di chi gioca; avvisi (pagina del telefono nascosta, schermo non bloccato acceso, disco indietro) |

I campioni grezzi del telefono stanno in un file a parte, `telefono-sensori.jsonl`. Ogni riga ha:
- `t`, l'arrivo sul computer;
- `k`, l'istante sul telefono;
- `q`, il numero del campione, per contare quelli persi.

## Orologi e sincronizzazione

- **Un solo orologio di riferimento**: `performance.now()` del computer, monotono e sotto il millisecondo. L'inizio della sessione è salvato anche in ora del giorno.
- **Telefono.** Ha un suo orologio, che viene allineato in due passaggi:
  - ogni secondo il computer chiede l'ora al telefono e tiene lo scambio con il viaggio più breve (`createClock`);
  - l'istante del picco di ogni colpo viene portato sull'orologio del computer.
  
  Tutti gli scambi restano nel registro: dopo la sessione, scarto e deriva si ricalcolano con una retta sugli scambi migliori di ogni finestra di 10 s (`clockFit`). Una deriva di 50 ppm vale 3 ms al minuto: per questo non basta lo scarto iniziale.
- **Webcam.**
  - L'istante in cui la registrazione parte è sull'orologio del computer.
  - Ogni fotogramma ha l'istante di cattura (`requestVideoFrameCallback`, stesso orologio).
  - Il rapporto porta i video all'istante di un evento con `t_video = t_evento − t_inizio_video`.
  - Il cursore «Allineamento webcam» corregge l'eventuale scarto residuo (decine di ms): si fa combaciare un gesto visibile con il suo colpo.
- **Gioco.** Il video del gioco cattura i fotogrammi disegnati sullo stesso orologio. Il menu è un fotogramma fermo e non si ridisegna: lì il video non riceve fotogrammi nuovi, e una parte passata tutta nel menu può non avere il video del gioco.

## Prestazioni, memoria, sessioni lunghe, recupero

- **Prima.** La registrazione (Maiusc+D → Registra) teneva tutto in memoria e si fermava da sola dopo 60 s. Il campione del telefono viaggiava sul canale ordinato dei colpi.
- **Scrittura progressiva.** Ogni 0,5 s gli eventi diventano righe di testo, cedute senza copia a un worker. Il worker le scrive nel file system privato del browser (`diag_worker.js`).
  - In memoria resta solo l'ultimo mezzo secondo.
  - Video in pezzi da 1 s, scritti allo stesso modo.
  - CRC calcolato mentre i dati arrivano.
- **Disco in ritardo.** Se la coda supera 24 MB, si saltano i campioni del telefono di quel giro e si annota un avviso (`coda`): il gioco non rallenta mai per aspettare il disco.
- **Rotazione.** Una registrazione lunga passa da sola a una parte nuova ogni 30 minuti o oltre 1 GB.
  - Stesso orologio: `t` continua dalla prima parte.
  - Parti collegate: `parte`, `precedente`, `prossima`, `gruppo` in `sessione.json`.
  - Ogni parte è un pacchetto completo, con i suoi video e le sue metriche.
  - Al cambio i video si chiudono con gli ultimi pezzi e ripartono sullo stesso flusso della webcam. Gli eventi arrivati nel frattempo finiscono nella parte nuova: nessun buco né doppione, e i campioni del telefono restano numerati di seguito.
  - Così nessun pacchetto si avvicina al limite dello zip (4 GB) e le metriche si calcolano su una parte alla volta.
- **Spazio su disco.** Ogni 10 s si legge la stima dello spazio libero del browser:
  - sotto 200 MB si fermano i video, che sono la parte più pesante (fino a circa 1,3 GB all'ora con tutti e due, ai bitrate impostati; in 10 s al massimo ~4 MB), e il registro continua;
  - sotto 50 MB si fermano anche i campioni del telefono;
  - sotto 20 MB la registrazione si chiude da sola, prima che le scritture falliscano.
  
  Chi gioca vede un avviso a ogni passo, e il registro lo annota (`spazio-video`, `spazio-campioni`, `spazio`). Nessuna sessione si cancella da sola: si eliminano dal pannello.
- **Analisi a righe.** Metriche e rapporto si calcolano nel worker, leggendo il registro a pezzi e tenendo in memoria solo gli eventi che servono (`diag_analysis.js`): il thread del gioco non legge mai il registro, nemmeno per preparare il pacchetto.
- **Recupero.** `meta.json` viene riscritto ogni 3 s. Se la pagina si chiude o il browser si blocca, al riavvio la sessione compare come «Interrotta», con i dati fino all'ultimo pezzo scritto. **Recupera** ricalcola dimensioni e CRC, poi si scarica come le altre.
- **Costo misurato.** Ogni secondo `prestazioni.regMs` registra i ms che il registratore ha usato sul thread del gioco. La prova nel browser richiede meno di 20 ms al secondo, cioè il 2%, e nessuna scrittura oltre 8 ms. Sessione di 150 s su macchina scarica: mediana 0,8 ms al secondo, massimo 3,9, scrittura più lunga 1,2 ms.
- **Costo dei video.** I video si codificano fuori dal thread del gioco, ma usano processore e scheda video. Prova sullo stesso computer (4 core, grafica e codifica software, 2 giri da 40 s, mediane):

  | Video | Consegna dei colpi p50 / p99 | Fotogrammi al secondo p50 / 5° percentile | Fotogrammi oltre 50 ms |
  |---|---|---|---|
  | nessuno | 4,7 / 19,6 ms | 60 / 59 | 0 |
  | solo webcam | 7,8 / 24,1 ms | 60 / 58,6 | 1 |
  | webcam e gioco | 17,9 / 61,9 ms | 56,5 / 48,2 | 10 |

  La webcam non cambia nulla di misurabile; il video del gioco sì, per questo parte spento. Su un computer con codifica video nella scheda il costo dovrebbe essere minore: lo dicono le `prestazioni` della prima sessione vera. Due sessioni con video diversi non si confrontano alla pari: il confronto lo segnala. Si ripete con `VIDEOS=nessuno|webcam|webcam,gioco PARTS=A node natpf-diag-session.mjs`.
- **Senza file system privato** (browser vecchi): la sessione resta in memoria, con un limite di 300 MB e senza recupero. Il pannello lo dice.
- **Pacchetto.** Uno zip senza compressione: i file su disco entrano per riferimento, senza copie in memoria. Il limite dello zip (4 GB) non si raggiunge, perché le parti si chiudono a 1 GB.

## Cosa si misura da solo e cosa no

**Automatico, affidabile**
- tempi: riconoscimento, consegna, jitter e picchi;
- frequenza dei sensori e buchi;
- colpi persi in rete (numerazione);
- cadute del collegamento e pagina del telefono nascosta;
- fps e fotogrammi lunghi;
- perdite del tracciamento della webcam e mani multiple;
- quanto spesso il colpo anticipato della webcam coincide con la sua conferma a fine gesto (coerenza, non precisione);
- costo del registratore.

**Automatico, ma solo con un riferimento**
- lato, tipo e direzione giusti, solo nella prova guidata;
- direzione voluta con il tempo del colpo (racchetta virtuale): dice se chi gioca ha colpito nel momento giusto per la
  direzione chiesta, prima del piatto e dell'esecuzione;
- il riferimento è il colpo richiesto, quindi resta da verificare nel video: chi gioca può aver fatto un altro gesto;
- senza prova guidata le metriche riportano solo le distribuzioni (quanti dritti, quanti pallonetti…) e non dichiarano mai un colpo «riconosciuto male».

**Video o verifica manuale**
- se un colpo era davvero un pallonetto;
- se la palla è andata dove chi giocava voleva;
- il ritardo dello schermo, con un video a 240 fps del telefono e del televisore insieme;
- la postura;
- la qualità della luce per la webcam.

## Metriche e confronto

`metriche.json` contiene:
- `telefono`: sensori, colpi, tempi, orologio, collegamento, tipi;
- `webcam`;
- `gioco`, con il costo del registratore;
- `colpi`: input, esiti, tempo, direzione; `racchetta`: tempo nella finestra d'impatto, colpi oltre la finestra,
  falliti, in rete, assistiti, volée, qualità;
- `riferimento`, solo nella prova guidata (anche `direzioneDalTempoPercento`);
- `ripetibilita`: per ogni colpo richiesto (o, senza prova guidata, per lato e tipo letti) quanto spesso il tipo letto è
  lo stesso e quanto variano (p90 − p10) salita della testa, forza, tempo nella finestra e punto di caduta. Il modello
  del colpo non ha caso: la variazione è di chi gioca e delle palle, ed è il riferimento per tarare le soglie;
- `registrazione`.

Per ogni distribuzione: quanti, media, mediana, p90, p99, massimo e jitter (p90 − p10).

Per il confronto (`compareMetrics`):
- ogni metrica ha il suo verso «migliore» e una soglia di rumore;
- l'esito è *meglio*, *peggio* o *uguale*.

Da riga di comando, dalla cartella `natpf-tennis`:

```
node scripts/diag/diag.mjs metriche sessione.zip
node scripts/diag/diag.mjs colpi sessione.zip
node scripts/diag/diag.mjs confronta prima.zip dopo.zip   # codice 2 se qualcosa peggiora
```

## Codice e prove

- **Codice:** `natpf-tennis/src/natpf/diag/`:
  - `diag_recorder.js`: registratore;
  - `diag_store.js` e `diag_worker.js`: disco;
  - `diag_metrics.js`, `diag_analysis.js` (analisi a righe), `diag_zip.js`, `diag_viewer.js`, `diag_export.js`;
  - `diag_protocol.js`: prova guidata.
- **Pannello:** `natpf_diag.js`.
- **Prove:**
  - `natpf-tennis/test/natpf-diag.test.mjs`, unitarie;
  - `tools/e2e/natpf-diag-session.mjs`, nel browser: sessione di 150 s, registrazione in parti (una ogni 6 s nella prova), spazio su disco quasi finito, ricarica a metà, prova guidata.
- **Limiti:**
  - le prove usano sensori sintetici, una webcam finta e grafica software;
  - la prima sessione vera con telefono e webcam conferma i numeri reali.
