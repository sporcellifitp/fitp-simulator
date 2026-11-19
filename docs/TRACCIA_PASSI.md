# TRACCIA DEI PASSI · da leggere per primo quando si riparte

File breve, aggiornato **a ogni passo** (prima di un'operazione lunga e subito dopo). Dice dove si è arrivati e cosa
fare adesso. Il dettaglio sta in `docs/PIANO_LAVORI.md` (checkpoint, decisioni, regole) e `docs/WORK_PROGRESS.md`
(misure). Repository: `sporcellifitp/fitp-simulator`, branch `natpf-simulator`. Indice di `docs/`: `docs/LEGGIMI.md`.

Segni: `[x]` fatto e su GitHub · `[~]` in corso (c'è scritto il punto esatto) · `[ ]` da fare.

**Storia completa fino al 18/11/2026** (tutte le sezioni dal 12/11, versioni, sha256, decisioni giorno per giorno):
`docs/archivio/TRACCIA_PASSI_fino_al_2026-11-18.md`. Si consulta, non si aggiorna. Le nuove sezioni vanno **in fondo**
a questo file; quando supera ~300 righe si sposta di nuovo la parte vecchia in un file d'archivio datato.

## STATO ATTUALE (18/11/2026)

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
