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
2. Scegli cosa registrare. Le tre opzioni sono attive all'inizio:
   - video della webcam del computer, che inquadra chi gioca;
   - video del gioco;
   - campioni dei sensori del telefono.
3. Premi **● Avvia registrazione** e gioca normalmente.
   - In alto compare **● REC** con il tempo.
   - **Maiusc+M** segna un momento («qui il colpo era sbagliato»).
   - Non c'è un limite di durata.
4. **Maiusc+D → ■ Ferma la registrazione**. Il pannello mostra un riassunto in parole.
5. **⬇ Scarica il pacchetto**: uno zip. Estrailo e apri `rapporto.html` con un doppio clic.
6. Per confrontare due sessioni, spunta **confronta** su tutte e due: compare la tabella prima/dopo.

**Prova guidata dei colpi**, circa 4 minuti, dal menu principale:

- il lanciapalle chiede in ordine 10 dritti, 10 rovesci, 6 pallonetti, 8 + 8 dritti incrociati e lungolinea, 6 + 6 rovesci incrociati e lungolinea, 10 misti;
- ogni richiesta finisce nel registro;
- alla fine la registrazione si ferma da sola e il pannello mostra il riassunto.

È l'unico modo per misurare automaticamente se il gioco riconosce il colpo giusto (vedi più sotto).

## Cosa si registra

Tutto è scritto in `eventi.jsonl`, un evento JSON per riga. `t` è in ms dall'inizio della sessione, sull'orologio del computer.

| Evento | Contenuto |
|---|---|
| `sessione`, `sessione.fine` | dispositivi, browser, scheda grafica, impostazioni, conteggi |
| `tel.colpo` | colpo del telefono: numero, percorso (veloce o affidabile), lato, tipo, perché, mira, istante del picco, tempi di riconoscimento, preparazione, consegna e totale; anche i colpi scartati, con il motivo |
| `tel.cal` | passi della calibrazione |
| `tel.stato` | collegamento, stato del telefono, presa, pagina visibile o nascosta, blocco dello schermo |
| `tel.orologio` | ogni scambio dell'orologio (invio e ricezione sul computer, ora del telefono) |
| `tel.link` | ogni secondo: da quale percorso è arrivata la prima copia dei colpi, frequenze dei messaggi |
| `palla` | posizione e velocità a ogni fotogramma mentre la palla è in gioco |
| `rimbalzo`, `punto`, `fase` | eventi del motore |
| `tentativo` | swing del giocatore: distanza palla–giocatore, correzione della latenza, velocità, se l'ha colpita |
| `colpo.gioco` | esito del colpo (tempo, qualità, punto di rimbalzo, direzione incrociato/lungolinea/centro) e colpi della CPU |
| `input` | ogni comando arrivato al motore (telefono, webcam, mouse) |
| `webcam.frame`, `webcam.evento` | tracciamento della webcam: istante di cattura, fonte, mani viste, mano scelta, ms di riconoscimento, perdite e riprese |
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
- **Gioco.** Il video del gioco cattura i fotogrammi disegnati sullo stesso orologio.

## Prestazioni, memoria, sessioni lunghe, recupero

- **Prima.** La registrazione (Maiusc+D → Registra) teneva tutto in memoria e si fermava da sola dopo 60 s. Il campione del telefono viaggiava sul canale ordinato dei colpi.
- **Scrittura progressiva.** Ogni 0,5 s gli eventi diventano righe di testo, cedute senza copia a un worker. Il worker le scrive nel file system privato del browser (`diag_worker.js`).
  - In memoria resta solo l'ultimo mezzo secondo.
  - Video in pezzi da 1 s, scritti allo stesso modo.
  - CRC calcolato mentre i dati arrivano.
- **Disco in ritardo.** Se la coda supera 24 MB, si saltano i campioni del telefono di quel giro e si annota un avviso (`coda`): il gioco non rallenta mai per aspettare il disco.
- **Recupero.** `meta.json` viene riscritto ogni 3 s. Se la pagina si chiude o il browser si blocca, al riavvio la sessione compare come «Interrotta», con i dati fino all'ultimo pezzo scritto. **Recupera** ricalcola dimensioni e CRC, poi si scarica come le altre.
- **Costo misurato.** Ogni secondo `prestazioni.regMs` registra i ms che il registratore ha usato sul thread del gioco. La prova nel browser richiede meno di 20 ms al secondo, cioè il 2%, e nessuna scrittura oltre 8 ms.
- **Senza file system privato** (browser vecchi): la sessione resta in memoria, con un limite di 300 MB e senza recupero. Il pannello lo dice.
- **Pacchetto.** Uno zip senza compressione: i file su disco entrano per riferimento, senza copie in memoria. Il limite è 4 GB.

## Cosa si misura da solo e cosa no

**Automatico, affidabile**
- tempi: riconoscimento, consegna, jitter e picchi;
- frequenza dei sensori e buchi;
- colpi persi in rete (numerazione);
- cadute del collegamento e pagina del telefono nascosta;
- fps e fotogrammi lunghi;
- perdite del tracciamento della webcam e mani multiple;
- costo del registratore.

**Automatico, ma solo con un riferimento**
- lato, tipo e direzione giusti, solo nella prova guidata;
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
- `colpi`: input, esiti, tempo, direzione;
- `riferimento`, solo nella prova guidata;
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
  - `diag_metrics.js`, `diag_zip.js`, `diag_viewer.js`, `diag_export.js`;
  - `diag_protocol.js`: prova guidata.
- **Pannello:** `natpf_diag.js`.
- **Prove:**
  - `natpf-tennis/test/natpf-diag.test.mjs`, unitarie;
  - `tools/e2e/natpf-diag-session.mjs`, nel browser: sessione di 150 s, ricarica a metà, prova guidata.
- **Limiti:**
  - le prove usano sensori sintetici, una webcam finta e grafica software;
  - la prima sessione vera con telefono e webcam conferma i numeri reali.
