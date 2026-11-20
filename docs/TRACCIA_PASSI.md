# TRACCIA DEI PASSI · da leggere per primo quando si riparte

File breve, aggiornato **a ogni passo** (prima di un'operazione lunga e subito dopo). Dice dove si è arrivati e cosa
fare adesso. Il dettaglio sta in `docs/PIANO_LAVORI.md` (checkpoint, decisioni, regole) e `docs/WORK_PROGRESS.md`
(misure). Repository: `sporcellifitp/fitp-simulator`, branch `natpf-simulator`. Indice di `docs/`: `docs/LEGGIMI.md`.

Segni: `[x]` fatto e su GitHub · `[~]` in corso (c'è scritto il punto esatto) · `[ ]` da fare.

**Storia completa fino al 18/11/2026** (tutte le sezioni dal 12/11, versioni, sha256, decisioni giorno per giorno):
`docs/archivio/TRACCIA_PASSI_fino_al_2026-11-18.md`. Si consulta, non si aggiorna. Le nuove sezioni vanno **in fondo**
a questo file; quando supera ~300 righe si sposta di nuovo la parte vecchia in un file d'archivio datato.

## STATO ATTUALE (19/11/2026)

- **Versione pubblicata: 2026-11-19.1** (`c3adeae1`, B71 + B72: casella «Al servizio» che lampeggia e alone dopo 3 s,
  «Avversario» al posto di «CPU», lingua IT/EN dal telefono per giocatore, correzioni dai registri della fiera). Pacchetti
  verificati: installer dal link fisso 131.406.666 B, sha256
  `0f1b11ea4a2c18ce65dd9fad334e4c242c717e625ee8cc7d260008ffb466ee72`; zip Cloudflare 24.022.691 B, sha256
  `a87fb88d2a0128f17d53b50fcd4bde0117f4a10d446943d186b8b0b9482ee3ed`, provato estratto (stessi errori attesi della 18.3:
  CORS del TURN e 404 dei servizi LAN e del registro che il pacchetto Cloudflare non ha).
- **App NATPF Racchetta 1.0.5** su R2 (`android/NATPF-Racchetta-1.0.5.apk` = link fisso, 686.665 B, sha256
  `e5a34907bd86a92a05703f6c108a56c5cff470c181f210a3faab0acdf848983b`, chiave dello stand: la CI pubblica solo se firmata).
- **Worker del registro**: da ricaricare dall'utente con il file della 19.1 (formato 4 del B71; la pagina deve dire «Formato delle righe: 4»).
- **Prove** (19/11): gioco 1915/1915, sito 322/322, LAN 13/13, desktop 56/56, build ok.

**Prima (18/11):**
- **Versione pubblicata: 2026-11-18.3** (`e9409c5`, B70: mascotte 3D che ballano nella card **solo nel programma
  Windows** della fiera). Pacchetti verificati: installer dal link fisso 131.385.957 B, sha256
  `6e9ad5e40b31abf9be5529458ee7fa2382c2071d78451a2e20124d9c13bb63a1`; zip Cloudflare 23.979.122 B, sha256
  `d95b66f5bb6d2c512d9766eec0f61d2c1d9ae58fa66071824481cc7b003c68dc`, provato estratto. Tre workflow verdi.
- **App NATPF Racchetta 1.0.4** su R2 (`android/NATPF-Racchetta-1.0.4.apk` = link fisso, sha256
  `cdcacbd00d44bacef27552be979ae2e5bcf669c5b102ab33595ddaaec19968a5`, versionCode 5, chiave dello stand).
- **Worker del registro** ricaricato dall'utente con il formato 3 (B66): risposta pubblica
  `{"ok":true,"registro":"pronto","spazio":true,"chiave":true,"formato":3}`.
- **Prove** (18/11): gioco 1844/1844, sito 289/289, LAN 13/13, desktop 56/56, build ok.
- **Ultimi blocchi**: B66 registro con sensori e calibrazione (18.1) · B67 + B69 mascotte 3D con pose e balletti, B68
  «Batte per primo» più breve (18.2) · B70 mascotte solo nel programma Windows (18.3). Dettagli in `docs/WORK_PROGRESS.md`.
- **HW1** in roadmap (18/11): grip-racchetta come controller hardware al posto del telefono, progetto parallelo; piano in
  `docs/hardware/grip-controller.md`, voce in `docs/PIANO_LAVORI.md` §5. Requisiti: 4 grip + chiavetta USB; piano A modulo a clip su racchetta, piano B
  grip verticale con vibrazione (valutazione nel documento). Ricerca del 18/11 in
  `docs/hardware/ricerca-grip-controller-2026-11-18.md`: consiglio grip B, piano a fasi; decisione dell'utente: prodotto solo per sé
  (4 grip + chiavetta, scheda pronta in manico stampato), niente produzione; prossimo passo: lista d'ordine del kit di prova.
- Punto aperto noto: `tools/e2e/natpf-lob-drop.mjs` 136/137, il controllo dei piedi in corsa (3,08 % contro 3 %) fallisce
  uguale dalla 17.3 (non è una regressione dei blocchi dopo).

## DECISIONI ANCORA VALIDE (riassunto; le durature per esteso in `docs/PROJECT_MEMORY.md`)

Modo di lavorare (utente):
- Risposte **sintetiche**; le domande all'utente si fanno **solo a scelta** (opzioni da cliccare).
- Un agente per blocco, **revisore indipendente** prima dell'unione dei blocchi grandi, poi prove complete.
- Pacchetti (installer su R2 + zip Cloudflare) dopo ogni versione, con «come si attiva» per ogni opzione nuova; se il
  commit non cambia i pacchetti si riconsegnano gli ultimi dicendolo. Niente zip LAN né portatile (dal 07/11).
- Se un agente si ferma per il limite d'uso: il lavoro resta nella sua worktree (`git worktree list`); lavoro non salvato
  in un commit «IN CORSO … NON verificato», poi ripresa con un messaggio, non da capo.
- Ogni richiesta si segna con il prodotto in `docs/PRODOTTI_FIERA_E_ONLINE.md` §3: **di base FIERA**.

Prodotti (18/11, `docs/PRODOTTI_FIERA_E_ONLINE.md` §4.1):
- Mascotte 3D che ballano **solo nel programma Windows** della fiera (web: spente salvo `?mascotte3d=1`;
  `natpf-tennis.mascotte3d` = '0' o `?mascotte3d=0` le spegne).
- **Lob e Drop sono del solo evento** di Torino: a fine fiera il prodotto torna ai personaggi **Classici**, senza marchio
  dell'evento.
- **FITP Simulator = white label** brandizzabile per evento (pacchetto di marchio da definire), torna sul campo esports
  FITP. Da chiarire alla separazione: contenuto del pacchetto di marchio, funzioni dello stand online sì/no.

Gioco e stand:
- **B36.1 direzione dei colpi: FERMA**, decide l'utente con i numeri (la cima del telefono è troppo imprecisa nei dati di
  Torino; oggi la palla la dirige il tempo). Piano e cancello in `docs/b36/piano-direzionalita.md`, misure in
  `docs/b36/misure-torino.md`.
- B56: correzione dell'anticipo di 100 ms **solo in modalità fiera** (`ANTICIPATION_S`): da rimisurare con il registro.
- Trofei ritarati sui dati di Torino (16.7); Razzo e In serie non ritarati (`docs/b36/misure-torino.md` §4).
- In fiera batte sempre il visitatore; battuta «Sempre lo stesso» di base (B47); nello stesso schermo a fine partita solo
  chi vince in evidenza (B57) e classifica dopo la card per 8 s (B65).
- Ridondanze (B64): sì a fascia una volta sola, livello CPU senza doppioni, impostazioni in un posto per il visitatore e
  uno per lo staff; **no** alla mano in due posti.
- B55: «Torna alla versione di prima» solo nelle Opzioni del programma Windows (non interruttori per dinamica).
- App Android dello stand con «Fissa app» automatico (non il chiosco completo); movenze «come nel video» su tutti i colpi
  (B23 + B53, stesso interruttore).

## PROSSIMI PASSI (aspettano l'utente)

1. **Collaudo allo stand** della 18.3: mascotte che ballano sul ledwall e sul PC dello stand (tempi veri della cattura con
   la GPU), salvaschermo, ridondanze, classifica di fine partita; telefoni veri con l'app 1.0.4; Windows vero.
2. **Registro della prossima giornata** (lo scarica l'utente dal Worker, mai la chiave in chat): rimisurare l'anticipo
   (B56: mediana dell'errore di tempo vicina a 0, più «Perfetto»), i trofei, il Razzo con i km/h (B60), le sezioni nuove
   del B66 (sensori, collegamento, calibrazione, precisione), dritto e rovescio dalla parte opposta (campo `pl`, B61).
3. **Dopo la fiera**: separazione FIERA / ONLINE (white label, Classici di base) quando l'utente risponde alle domande
   rimaste di `docs/PRODOTTI_FIERA_E_ONLINE.md` §4.
4. **HW1**: scelta dell'utente tra piano A e piano B (o prototipo con tutti e due), poi prototipo con schede di sviluppo.
5. Pulizia del repository, parti **da confermare** con l'utente (non fatte): vecchio sito «Foro Italico World», immagini
   di analisi in `docs/`, rami remoti vecchi e ramo predefinito, artifact delle Actions, riorganizzazione dei documenti
   fermi al 21–27/10 e di `docs/coda/`.

## 18/11 · Pulizia sicura del repository (approvata dall'utente: «Pulizia sicura»)

- [x] Tolti dall'albero (restano nella storia di git): `undefined/` (cartella creata per errore), `docs/b9/wip/` e
      `docs/b17/wip/` (patch e diff di rami già uniti), `docs/consegna/2026-11-15/` (bundle `rami-b40-b48` già riportato a
      mano, sonde, appunti, revisioni), `docs/SESSION_HANDOFF.md` (era solo un rimando). Del passaggio del 15/11 restano in
      archivio il testo e gli script di rilascio: `docs/archivio/consegna-2026-11-15/`.
- [x] In `docs/archivio/`: `GAMEPLAY_PROPOSAL.md`, `PRIORITY_AUDIT.md`, `NATPF_REFACTOR_AUDIT_2026-10-15.md`,
      `NATPF_GESTURE_CONTACT_2026-10-16.md`, `NATPF_ARCADE_LAN_2026-10-16.md` e i diari della radice `MEMORY.md`,
      `SESSION_HANDOFF.md`, `WORKLOG.md`.
- [x] Accorciati senza perdere niente: questa traccia (copia integrale in archivio), `docs/WORK_PROGRESS.md` (blocchi
      B0–B52 in `docs/archivio/WORK_PROGRESS_dal_2026-11-04_al_2026-11-15.md`), il §1 di `docs/PIANO_LAVORI.md` (checkpoint
      vecchi in `docs/archivio/PIANO_LAVORI_checkpoint_fino_al_2026-11-18.md`). Nuovo indice `docs/LEGGIMI.md`.
- Nessun file di versione: niente pacchetti nuovi (valgono quelli della 2026-11-18.3).

**Prossima azione esatta (18/11)**: aspettare l'utente (punti 1–5 qui sopra).

## 19/11 · B71 registri del 18 e 19/11: correzioni in giornata (richiesta dell'utente: «fixiamo subito… calibrazione
## giocando (importantissima), dritto e rovescio, sensori… tutto in giornata»)

Registri caricati dall'utente (263 partite il 18, 62 il 19; versioni 17.4 e 18.3; tutti Android 17 + Chrome 157 nell'app
1.0.4, collegamento LAN). Riassunti con `natpf-tennis/scripts/registro/riassunto.mjs` (fuori dal repository, nello
scratchpad della sessione). Anomalie uguali nei due giorni:
- calibrazione giocando: «none» per ~50% dei giocatori (imparato niente), «full» 1–2%;
- lato del colpo (`pl`) diverso dal lato della palla (`lato`) nel ~36% dei colpi, `aiutato` nel ~64%;
- confidenza del tipo di colpo (`cf`) sempre 0,45;
- sensori a 60 Hz esatti (intervallo 16 ms dichiarato), accelerazione satura nel 97% delle partite;
- colpi in anticipo di +80–90 ms in media (DROP +179), «perfect» ~25%;
- segnale Wi-Fi e batteria dall'app non registrati.

- [x] Indagine nel codice (quattro filoni). Rapporti nello scratchpad della sessione (`registri/analisi-gesti.md`,
      `analisi-tempo.md`, `analisi-sensori.md`); i punti entrano nei documenti `docs/b71/*.md`.
- [~] Workflow `wf_cc5b32ae-280` (B71): tre rami locali in worktree `b71-gesti` (calibrazione giocando, segno, verso,
      lato dalla palla se incerto, palla corta/KEEP), `b71-sensori` (app 1.0.5: Wi-Fi, sensori nativi a 60 Hz con ripiego al
      browser, schermo che si riaccende; misure dei buchi e del fondo scala), `b71-registro` (cf vero, pause P2, lead nei
      colpi a vuoto, riassunto: perfect/segnale/batteria; in fiera finestra «Perfetto» 0,55/0,35 e finestra in ritardo
      allargata dei 100 ms del B56); poi unione in `b71-int`, quattro revisori + verifica avversaria, sistemazione, prove.
      **Ripresa se si ferma**: `git branch --list 'b71-*'`, `git worktree list`; rilanciare il workflow con
      `resumeFromRunId` oppure unire a mano i rami pronti in `b71-int`. Poi: versione nuova, push, pacchetti, APK 1.0.5.
- [x] Tre rami pronti (`b71-gesti` 9167f106, `b71-sensori` bd3f28e1, `b71-registro` 9ccf2187) uniti nel ramo locale
      **`b71-int`** (da `natpf-simulator` 9546b9a1, `git merge --no-ff` nell'ordine gesti, sensori, registro; niente push).
      Conflitti solo nell'elenco dei campi del registro e nella riga «colpo»: i campi si sommano, `CAMPI_B71` resta ai campi
      del verso e il ritardo dello schermo è `CAMPI_B71T` (`docs/b71/unione.md`). Prove dell'unione in `docs/b71/unione.md` §2.
      **Prossimo passo**: revisori e verifica avversaria sul ramo `b71-int` (workflow), poi versione nuova, push, pacchetti,
      APK 1.0.5 (CI), Worker del registro da ricaricare (dodici campi nuovi).
- [x] Revisori e verifica avversaria: undici rilievi confermati, **tutti applicati** sul ramo `b71-int` (commit locali,
      niente push, file di versione non toccati): calibrazione giocando con il verso incerto in fiera (il colpo si conta
      nel verso che si vede), KEEP con il lato del gesto, riaccensione dello schermo con wake lock parziale, «in uso»
      azzerato sulla schermata dello staff, ritardo tra browser e app misurato (`lg`), formato del registro 4 con l'avviso,
      modalità fiera nel registro (`stand.modo`), `cf` per versione, nota della fiera sul ritardo dello schermo, prove
      sistemate. Documento `docs/b71/revisione.md` (prove e numeri). **Prossimo passo**: unione in `natpf-simulator`,
      versione nuova, push, pacchetti, APK 1.0.5 (CI); Worker del registro da ricaricare (la pagina deve dire «Formato
      delle righe: 4»).

## 19/11 · B72 richieste dell'utente (FIERA) e versione 2026-11-19.1 con il B71

Richiesta (19/11): «1) rendere lampeggiante il box che dice che devi battere (al servizio) + aggiungi un alone pulsante
attorno allo schermo (in singolo e in doppio nell'area specifica del player che deve servire se passano 3 secondi 2)
cambiare CPU con Avversario (in singolo) 3) selettore lingua IT/EN dall'app del telefono: permette di tradurre anche solo
uno dei due campi in modalità doppio».

- [x] Workflow `wf_0254ca96-a86`: tre rami (`b72-servizio`, `b72-avversario`, `b72-lingua`) dal B71, unione in `b72-int`
      (nessun conflitto), tre revisori (aspetto, lingua, regressioni) + verifica avversaria: sette rilievi corretti
      (`docs/b72/unione.md` §5; il più grave: espressione regolare che non caricava la pagina del telefono su iOS < 16.4).
      Documenti `docs/b72/servizio.md`, `avversario.md`, `lingua.md`, `unione.md`.
- [x] Unione di `b71-int` (473b9e9d, revisione B71) in `b72-int` → a2937f1f, nessun conflitto; `natpf-simulator` portato in
      avanti. Workflow `wf_d699edcb-840` (incroci B71×B72, percorso dello stand in IT/EN, verifica, sistemazione, prove):
      quattro rilievi corretti (F1–F4, `docs/b72/unione.md` §6) e i documenti vivi aggiornati (U1). Un controllo B51 di
      `natpf-fiera-telefoni.mjs` aggiornato: nel telefono bloccato c'è di proposito il selettore della lingua (due tocchi).
- [x] Prove sul codice finale: gioco 1915/1915, sito 322/322, LAN 13/13, desktop 56/56, build ok, prove nel browser verdi
      (fiera-telefoni 66/66, lingua 46/46, servizio-alone 27/27, fine-partita-en 101/101 e le altre in `docs/b72/unione.md` §6).
- [x] Versione **2026-11-19.1** (`c3adeae1`, quattro file), push; CI verde: installer Windows su R2 verificato dal link
      fisso (sha256 `0f1b11ea…ee72`), APK 1.0.5 su R2 (sha256 `e5a34907…983b`, link fisso uguale); zip Cloudflare
      24.022.691 B (sha256 `a87fb88d…e3ed`) provato estratto. Consegnati all'utente.
- Da fare dall'utente: ricaricare il Worker del registro (pagina «Formato delle righe: 4»).
- Non verificato: telefono vero (sensori dell'app 1.0.5, schermo che si riaccende, IT/EN), iPhone vecchi, programma
  Windows installato, ledwall (leggibilità del lampeggio e dell'alone da lontano).

## 20/11 · B73 direzione dei colpi (B36.1), passi delle mascotte, prove rotte (richiesta dell'utente: «Vai avanti su 4, 6
## (falli), tecnico»)

4 = direzione dei colpi (tappa B36.1 del piano `docs/b36/piano-direzionalita.md`, «Nuova» interna, «Classica» di base e
identica); 6 = passi veri delle mascotte nella card (avanti, indietro, destra, sinistra, con i piedi); tecnico = prove nel
browser rotte da prima (`natpf-lob-drop` 136/137, `natpf-chi-serve` che si blocca, `natpf-registro-sensori` che non esce,
`lan-e2e` rossa da prima del B8) e misura della saturazione dell'accelerazione sui registri del 18–19/11.

- [x] Workflow `wf_d697e29c-598` (B73): cinque rami (`b73-registri`, `b73-direzione`, `b73-mascotte`, `b73-prove-a`,
      `b73-prove-b`) uniti in `b73-int` senza conflitti; tre revisori + due scettici: sei rilievi confermati e corretti
      (`docs/b73/unione.md` §7). Prove: gioco 1954/1954, sito 322/322, LAN 13/13, desktop 56/56, build ok, prove nel browser
      tutte verdi (lob-drop **137/137**, chi-serve **64/64** e registro-sensori che ora finiscono da sole; `lan-e2e`
      telefono, 1v1 e webcam 32/32). `natpf-stesso-schermo-b20`/`-b25` aggiornate a 20 pulsanti (voce nuova): 52/52 e 57/57;
      `natpf-mascotte-3d-anteprima` 29/29 (prima si fermava per il disco pieno del contenitore).
- Esiti per l'utente:
  - **Direzione (4)**: voce «Direzione dei colpi» nel pannello dello stand, «Classica» di base = gioco identico; «Nuova»
    interna, da non far provare. Misure del 18–19/11: la cima è imprecisa come a Torino (metà ±58°, 60% oltre 45°).
    **Indizio**: il gioco legge gli assi del giroscopio di Chrome Android nell'ordine W3C (alpha = z) mentre Chrome manda
    alpha = x; sui campioni veri del 28/10 l'ordine di Chrome torna molto meglio. Da verificare sul telefono dello stand.
  - **Mascotte (6)**: passi veri nella card (piede d'appoggio fermo), «Quattro passi di festa» e «Passi indietro, a testa
    bassa»; salti e trascinata camminano; nelle altre pose i piedi non scivolano più (prima fino a 66 cm per giro).
  - **Tecnico**: piedi delle mascotte in campo che entravano nel terreno (gioco, corretto); risposte di rete mai lette che
    dopo ~180 colpi bloccavano tutte le richieste della pagina (gioco, corretto, `natpf_fetch.js`); chi-serve e
    registro-sensori sistemate nella prova; `lan-e2e` aggiornata al flusso di oggi. Saturazione dell'accelerazione: pesa
    poco, nessuna correzione.
- [~] Versione **2026-11-20.1** (quattro file), test veloci, push, CI, zip Cloudflare, consegna. **Ripresa se si ferma**:
      `git log --oneline origin/natpf-simulator..`, test veloci, `git fetch`, push, `attesa-installer.sh 2026-11-20.1`.
- Worker del registro: nessun campo nuovo nel B73 (`dir` e `nr` c'erano dal B36.0): basta il file della 19.1 (formato 4).
- Non verificato: telefono vero, scheda grafica vera, programma Windows, ledwall; ordine degli assi sul telefono dello stand.
