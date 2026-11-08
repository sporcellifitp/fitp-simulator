# PIANO_LAVORI · stato, punti aperti e piano condiviso (leggere per primo, a ogni apertura)

Questo è **il** file di ripresa per qualunque agente (Claude, Codex, altri) e per l'utente. Contiene: il checkpoint
(ultimo stato verificato e prossima azione esatta), le regole di lavoro decise dall'utente, le sue decisioni, e per
ogni punto aperto **stato, cosa fare, come e perché**. È pensato per riprendere dopo un'interruzione (limite d'uso,
sessione chiusa) senza ricostruire il contesto.

Come si aggiorna:
- Il **Checkpoint** si riscrive (non si accoda) a ogni passo finito: commit, test, prossima azione esatta.
- Lo stato dei blocchi si aggiorna nel **Registro dei blocchi**; il dettaglio dei passi (file, misure, verifiche) va
  in `docs/WORK_PROGRESS.md`; le decisioni tecniche durature in `docs/PROJECT_MEMORY.md`.
- Se il repository e questo file divergono, vale il repository: si corregge il file.
- Storico fino al 04/11/2026: `docs/archivio/SESSION_HANDOFF_fino_al_2026-11-04.md` e
  `docs/archivio/WORK_PROGRESS_fino_al_2026-11-04.md` (solo consultazione).

---

## 1. Checkpoint (riscritto a ogni passo)

- Aggiornato: 08/11/2026 · agente: Claude · branch `natpf-simulator`.
- **Per riprendere leggere `docs/PASSAGGIO_CONSEGNE.md`** (lavoro dal 05/11, punti aperti §3, controlli §4) e, per i
  gesti del tutorial, `docs/b13/gesti-nuovi.md`. Checkpoint precedente (storia dal 04/11):
  `docs/archivio/PIANO_checkpoint_fino_al_2026-11-07.md`.
- **B13 fatto (08/11, richiesta «sistema la prova gesture-calibration. In parallelo, rivedi ancora i gesti del
  tutorial, il dritto non mi sembra tale e ci sono troppi colpi che non simulano la fisica del movimento del braccio
  con il telefono in mano»):**
  - (a) `tools/e2e/gesture-calibration.mjs` stabile (`9f9ca9e`…`67845e6`): la prova fermava il gioco con la pausa di
    rete, e un gesto fatto più di 0,8 s dopo l'ultimo fotogramma registrato viene scartato apposta
    (`input-time.js`); sui runner lenti succedeva. Ora fermo immagine all'apice del lancio senza pausa; `CPU_THROTTLE`
    per simulare un runner lento (prima 0/5 con CPU ×4, ora 12/12). Analisi `docs/b13/gesture-calibration-ci.md`.
  - (b) Gesti del tutorial sulla catena fisica spalla-gomito-polso (`e82f35b`): braccio intero dalla spalla con busto,
    testa e manica; dritto, piatto, incrociato, rovescio, servizio, schiacciata, volée e pallonetto rifatti; nuovo test
    `natpf-gesture-physics` (12). Riconoscimento non toccato. **Limite rimasto**: all'impatto la mano del dritto va in
    diagonale avanti-sinistra (57° dalla rete, prima 77°): con la presa nel palmo e i limiti del riconoscimento non può
    andare dritta verso la rete con il palmo davanti (`docs/b13/gesti-nuovi.md` §0).
  - Versione **2026-11-08.1** (novità per chi aggiorna dal gioco).
- Test: gioco 887/887, sito 195/195, LAN 12/12, programma Windows 28/28, build ok; nel browser vedi
  `docs/WORK_PROGRESS.md` B13.
- Non verificato: Windows (installazione, aggiornamento dal gioco 07.4 → 07.5 → 08.1), telefoni veri, ledwall, GPU vera,
  persone vere sull'animazione nuova; l'utente non ha ancora visto i fogli dei gesti nuovi.
- **Decisioni chieste all'utente** (B13): tenere la sagoma del busto; aggiungere una racchetta fantasma o il braccio
  libero in servizio e schiacciata; camera alta da dietro (stile TV) per i colpi da fondo.
- GitHub: le tre esecuzioni del push sono verdi («NATPF Simulator tests» con `gesture-calibration` al primo tentativo);
  installer **2026-11-08.1 pubblicato su R2** (sha256 `4000b1b7…60753204`). Zip Cloudflare sha256 `34889962…cf5a3cf0`.
- **B14 (08/11, seguito del B13):** il «vincolo del riconoscimento» del dritto è smentito (33° dalla rete senza
  toccarlo, verificato); camere più basse per il dritto e i colpi da fondo integrate: versione **2026-11-08.2**
  (`04a702d`), tutte le prove verdi, tre esecuzioni di GitHub verdi, installer pubblicato su R2 (sha256 `18559a51…bc5049a8`),
  zip Cloudflare sha256 `cf51aa20…b10fd4f6`. La revisione a occhi nuovi ha trovato il problema vero del dritto:
  l'orientamento del telefono (racchetta verso la rete in carica, palmo verso chi gioca all'impatto). Dettaglio in
  `docs/WORK_PROGRESS.md` B14.
- **B14.2 fatto, versione 2026-11-08.3:** disegno più pulito (persona da dietro con la testa leggibile, fantasmi di sola
  mano e telefono, palla sempre visibile all'impatto), schiacciata che finisce in basso, palla corta, tagliato e pallonetto
  inquadrati meglio, prova nuova alle velocità intermedie. **Il dritto non è cambiato**: la versione con la racchetta
  portata indietro e il palmo verso la rete (quella da manuale) è bloccata da tre cose misurate: (1) il riconoscimento
  vero (`site/js/tennis/gesture-intent.js:64`: con la calibrazione veloce una carica che gira il telefono a più di
  ~150 °/s è letta come un colpo speciale, quindi i 120–150° della racchetta portata indietro chiedono una carica lenta
  e una scheda di ~4 s; con la presa a martello la fine della carica è letta rovescio); (2) le regole del disegno (nessuna
  camera fa vedere quella carica senza il telefono di taglio); (3) l'ampiezza 85±3° del B9. Le versioni intermedie
  sbagliavano a velocità che i test non campionavano. Dettaglio: `docs/b14/dritto-orientamento.md`.
- Test: gioco 894/894, sito 195/195, LAN 12/12, programma Windows 28/28, build ok, sette prove nel browser verdi; letture
  identiche alla base. Dettaglio in `docs/WORK_PROGRESS.md` B14.
- **Decisioni chieste all'utente:** (a) se vuole il dritto da manuale bisogna toccare il riconoscimento (soglia dei colpi
  speciali nella calibrazione veloce) e provarlo con telefoni veri, accettare una scheda del dritto più lunga e ammorbidire
  le regole del disegno; (b) racchetta fantasma (prototipo spento: oggi mostrerebbe la racchetta verso la rete); (c) sagoma
  del busto e camere.
- GitHub: tre esecuzioni verdi su `ddd4428`; installer **2026-11-08.3 pubblicato su R2** (sha256 `d5ead1f7…27fb2f79`);
  zip Cloudflare sha256 `2bc87923…5084487f`.
- **Richiesta nuova (08/11): B15.** «Fai un nuovo audit per migliorare la sensibilità del dispositivo e la precisione dei
  colpi rispetto ai gesti eseguiti. I colpi non sono ancora da campo aperto, anzi, tutti gli scambi vanno quasi sempre
  nella stessa direzione con stessa velocità e angolazione. Assicurati che per i giocatori mancini sia tutto uguale. Per
  quanto riguarda la UX UI, rivedi l'intero flusso dall'accesso al gioco fino alla partita. Semplifica eventuali
  ridondanze, testi lunghi, rendi tutto semplice e di facile lettura e comprensione.»
- **Blocco in corso:** B15 in tre rami locali da `8a996e3` (`b15-colpi`, `b15-mancini`, `b15-ux`, cartella
  `scratchpad/b15/`, non pubblicati): (A) banco sul pipeline vero telefono → intenzione → esito → motore e correzioni
  alla compressione di direzione, forza e angolo; (B) prova a specchio del mancino su tutta la catena e correzioni;
  (C) audit UX/UI con screenshot del flusso completo (gioco e pagina del telefono), semplificazioni. Poi verifiche
  indipendenti, integrazione, versione 2026-11-08.4 o 09.1.
- **B15 fatto, versione 2026-11-08.4** (richiesta dell'08/11 su colpi, mancini e flusso; poi «Quando hanno finito integra
  tutto e fai la versione nuova»): tre rami con verifiche indipendenti a ogni giro, uniti in `b15-int`. Colpi: la palla
  segue il gesto (velocità +29 %, profondità +17 %, direzione +12 % nella distribuzione di una persona vera; mira piena a
  17°; centro della mira quello di prima). Mancini: specchio esatto in tutta la catena, calibrazione prima del dritto,
  corpo e racchetta, servizio, 1v1. Flusso: testi brevi, una scelta per pagina, telefono con un pulsante. Dettaglio in
  `docs/WORK_PROGRESS.md` B15 e `docs/b15/`.
- Test: gioco 927/927, sito 197/197, LAN 12/12, programma Windows 28/28, build ok, prove nel browser verdi (vedi
  WORK_PROGRESS B15 · Integrazione; il costo del disegno sopra 4 ms è della macchina, uguale sulla base).
- **Decisioni chieste all'utente:** `docs/PASSAGGIO_CONSEGNE.md` §3.13 (Leggenda più dura o colpi forti meno tesi; tutorial
  corto prima della partita; riscaldamento facoltativo; mira più sensibile; unire le due pagine della scelta). Restano
  quelle sul dritto (§3.4).
- GitHub: tre esecuzioni verdi su `d888fb3` (`timing-browser` verde alla ripetizione, instabilità nota); installer
  **2026-11-08.4 pubblicato su R2** (sha256 `95485927…e3dfa15164`); zip Cloudflare sha256 `e5e67f5e…cce5c70de`.
- **Prossima azione esatta:** aspettare le decisioni dell'utente (§3.13 del passaggio di consegne).
## 2. Regole di lavoro decise dall'utente (04/11/2026, valgono per tutti gli agenti)

1. **Push**: dopo ogni commit verificato, subito, su `origin natpf-simulator`. Verificato = test del gioco e del sito
   verdi, più `npm run build` se il passo tocca build, asset, vite o `site/`. Solo avanzamento lineare: prima
   `git fetch origin natpf-simulator`; se il remoto è avanti, si integra (rebase dei soli commit non pubblicati o
   merge) e si rifanno i test. Mai `--force`, mai altri branch. Niente push con test rossi (eccezione: un WIP
   dichiarato, solo se l'utente lo autorizza caso per caso).
2. **Pacchetti ZIP (LAN Windows e Cloudflare)**: l'utente li vuole **sempre dopo ogni commit, senza doverli
   chiedere**. Se il commit cambia il contenuto dei pacchetti (codice, asset, pagina del telefono, server LAN) si
   rifanno con una versione nuova, si provano estratti e si consegnano. Se il commit non li cambia (solo documenti o
   prove), si riconsegnano gli ultimi ZIP (stessa versione e sha256) dicendolo. Ogni pacchetto nuovo alza la
   versione in `site/js/tennis/version.js` **e** `site/tennis/build.json` (formato `AAAA-MM-GG.n`). Procedura in §6.
3. **Un agente alla volta** sul branch: Codex lavora ancora al progetto ma non in parallelo. Chi inizia fa fetch e
   controlla che non ci siano commit nuovi di altri; chi finisce lascia il Checkpoint aggiornato.
4. **Blocchi autonomi**: ogni blocco ha passi piccoli; ogni passo lascia il repository funzionante (test verdi),
   committato, pubblicato e scritto qui. Prima di un'operazione ampia, commit di checkpoint.
5. **Higgsfield**: budget massimo complessivo **100 crediti** per la richiesta del 04/11 (intro e, se serve, la foto
   della presa). Prima di ogni generazione si controlla il costo; ogni spesa si annota nel Checkpoint.
6. **Non fingere**: ciò che non si può provare qui (telefoni veri, Windows, ledwall, persone) si scrive come «non
   verificato».

---

## 3. Richiesta del 04/11/2026 e risposte dell'utente

Richiesta (5 punti): (1) intro Higgsfield: una pallina sola e il campo del gioco; (2) impugnatura del telefono dalla
foto di riferimento; (3) tutorial come modale prima della calibrazione con «Tutto chiaro, ho capito», anche nel 1v1
sullo stesso schermo, indipendente per ciascun giocatore; (4) valutazione di una versione Windows installabile e audit
dell'architettura, **senza implementarla**; (5) continuità del lavoro con commit e push incrementali.

Risposte alle domande del piano (04/11):
1. Presa: il «martello» da sostituire è la **foto**; l'impugnatura riconosciuta oggi va bene. La presa della foto di
   riferimento sostituisce il martello (foto, figura, animazione 3D, testi), **con un rollback pronto** se l'utente lo
   chiede.
2. Immagine della presa: **la foto allegata dall'utente il 04/11** (telefono nel palmo, schermo verso chi gioca con
   «Pronto» di NATPF, dita attorno alla parte bassa, pollice sul bordo in alto, cima inclinata in avanti verso lo
   schermo). Originale: `docs/riferimenti/presa-palmo-utente-2026-11-04.webp` (fuori da `public/`, quindi non finisce
   nei pacchetti; da ritagliare e pulire: sullo sfondo ci sono un monitor e l'ufficio). La 6.png del 04/11 resta solo
   come riferimento della geometria: non entra nel repository (cornice di screenshot, app di un altro prodotto,
   persone sullo sfondo).
3. Intro: **una sola pallina**.
4. Se i due tentativi Higgsfield falliscono: **avvisare l'utente** e decidere insieme (nessun ripiego automatico).
5. «Tutto chiaro, ho capito»: **sul telefono di ciascun giocatore**.
6. Modale: in tutti i percorsi con il telefono, una volta per sessione e per giocatore, «Rivedi i gesti» sempre
   disponibile; per la webcam una versione breve senza il 3D del telefono.
7. Riquadro «Guarda e ripeti» in alto a destra: **tolto in calibrazione**, **resta negli esercizi dell'Allenamento**.
8. 1v1 sullo stesso schermo: tutorial e calibrazione nelle due metà della pagina «Collega i due telefoni», senza campo.
9. Regole di lavoro: sì (§2). Codex lavora ancora ma non in parallelo. ZIP sempre dopo ogni commit, senza richiesta.
   Controlli automatici di GitHub anche su questo branch: sì (in B1, dopo aver sistemato le prove nel browser).
10. Contesto Windows: telefoni **dello staff**; allo stand **rete dedicata**; ledwall come **monitor esteso**;
    **Windows 10**; GPU non nota in anticipo (PC noleggiato, probabilmente integrata); **nessun certificato di firma
    del codice**; **niente 1v1 tra due PC** né multiplayer: un solo PC con stesso schermo, allenamento, minigiochi
    (engagement), al massimo 1v1 contro la CPU.

---

## 4. Registro dei blocchi

Legenda: [ ] da fare · [~] in corso · [x] fatto, verificato e pubblicato.

| Blocco | Stato | Contenuto | Commit | Pacchetti |
|---|---|---|---|---|
| B0 Continuità | [x] | questo file, istruzioni (CLAUDE.md, AGENTS.md), archivio dei documenti lunghi | — | invariati |
| B1 Prove nel browser e CI | [x] | telefono simulato aggiornato, script e2e verdi, CI sul branch | — | — |
| B2 Intro | [x] | video con una pallina e il campo del gioco (Higgsfield, ≤100 crediti) | vedi WORK_PROGRESS B2 | 2026-11-04.2 |
| B3 Presa | [x] | foto, figura, 3D e testi della presa nuova; piatto tollerante con test; tocchi; rollback | vedi WORK_PROGRESS B3 | 2026-11-04.3 |
| B4 Modale tutorial | [x] | modale prima della calibrazione, «Tutto chiaro, ho capito» sul telefono | vedi WORK_PROGRESS B4 | 2026-11-04.4 |
| B5 Stesso schermo | [x] | modale e calibrazione indipendenti nelle due metà di «Collega» | vedi WORK_PROGRESS B5 | 2026-11-04.5 |
| B6 Windows | [~] | A+ portatile implementato; collaudo Windows reale e F0/F1 da completare | commit di questo checkpoint | 2026-11-04.1 |
| B7 Eseguibili Windows | [x] | `natpf-desktop/`: Electron, portatile (un .exe) e installabile (setup .exe), firewall e certificati; collaudo Windows dell'utente in `docs/COLLAUDO_WINDOWS.md` | vedi WORK_PROGRESS B7 | 2026-11-04.5 |
| B8 Schermo intero e monitor | [x] | schermo intero senza cornici in tutte le versioni, adattamento al monitor e calibrazione, Cloudflare < 25 MB; collaudo Windows dell'utente in `docs/COLLAUDO_WINDOWS.md` | vedi WORK_PROGRESS B8 | 2026-11-05.1 |
| B9 Tutorial, telefono, 1v1 | [x] | modale compatta con frecce, animazione nuova dei gesti (Canvas 2D sopra `natpf_gesture_pose.js`), «Tutto chiaro» dopo l'ultima finestra, schermo del telefono spento, «Pronto» per giocatore | `4ed5eab`…`f386f89` | 2026-11-06.1–.3 |
| B10 Voce, tabellone, scritte, prove | [x] | voce «smash» solo per la schiacciata, tabellone come in TV, scritte del colpo fuori dal campo nel 2v2, palla corta e salita abituale, blocco di 1 s, prove rifatte | `8a12f2b`…`f490c7b` | 2026-11-07.1–.3 |
| B11 Installer unico con aggiornamenti | [x] | un solo installer Windows che si aggiorna dal gioco (Cloudflare R2, bucket UE `natpfsimulator`), zip LAN e portatile tolti; collaudo Windows dell'utente in corso | `8623bd9`…`fa190f2` | 2026-11-07.4 |
| B12 Forza del colpo e CI | [x] | colpo tipico solo dai colpi normali (palle corte non abbassano più la forza); azioni di GitHub a Node 24 | vedi WORK_PROGRESS B12 | 2026-11-07.5 |
| B13 Prova del servizio e gesti del tutorial | [x] | `gesture-calibration` senza pausa di rete (stabile con CPU ×4); gesti del tutorial sulla catena fisica del braccio (dritto ancora in diagonale: limite del riconoscimento) | vedi WORK_PROGRESS B13 | 2026-11-08.1 |
| B14 Dritto: limite, camere, orientamento | [x] | vincolo smentito; camere più basse (08.2); disegno, schiacciata, camere di palla corta/tagliato/pallonetto, prova alle velocità intermedie (08.3); dritto da manuale bloccato (decisione dell'utente) | vedi WORK_PROGRESS B14 | 2026-11-08.3 |
| B15 Colpi, mancini, flusso | [x] | palla che segue il gesto (forza, piatto); mancini a specchio in tutta la catena; testi brevi e meno scelte | vedi WORK_PROGRESS B15 | 2026-11-08.4 |

Ordine: B0 → B1 → B2 → B3 → B4 → B5 → B6. B2 e B6 non dipendono dagli altri e possono essere anticipati se un blocco
resta in attesa di una decisione. B4 dipende da B3 (il contenuto della modale mostra la presa nuova).

---

## 5. Punti aperti: stato, cosa fare, come, perché

### B0 · Continuità del lavoro
- **Stato**: `docs/SESSION_HANDOFF.md` (343 righe) e `docs/WORK_PROGRESS.md` (1.128 righe) erano diari lunghi con
  molte «Prossima azione» vecchie; CLAUDE.md vietava ancora il push senza autorizzazione (regola del 28/10); Codex
  legge `AGENTS.md`, che non esisteva.
- **Cosa**: questo file come ingresso unico; i due diari in `docs/archivio/`; `docs/SESSION_HANDOFF.md` ridotto a un
  rimando; `docs/WORK_PROGRESS.md` nuovo, a blocchi; CLAUDE.md con le regole del §2; `AGENTS.md` che rimanda a
  CLAUDE.md e a questo file.
- **Perché**: l'utente vuole riprendere da qualunque interruzione senza ricostruire il contesto, con lo stesso punto
  di partenza per tutti gli agenti.
- **Fine**: file presenti, test invariati (solo documenti), commit e push fatti.

### B1 · Prove nel browser (e2e) e controlli automatici di GitHub
- **Stato**: KO già presenti dalla build .17: `natpf-phone-keep`, `natpf-phone-blackout` (4/6), `natpf-training-flow`
  (6/13), `natpf-rally` (4/7), `natpf-menu` (19/22), `lan-browser` (7/8). Causa comune: il telefono simulato degli
  script non completa più la calibrazione dopo i cambi di presa e calibrazione del 29/10 (oggi calibrazione rapida:
  fermo, dritto, rovescio, `racchetta.js:62` `quick:true`); `natpf-menu` controlla un centro della pagina vecchio.
  Cause trovate il 04/11: (a) gli script che passano da «Allenamento» non chiudevano la **lezione iniziale**, e durante
  la lezione il computer ignora la calibrazione che il telefono fa comunque da solo (`natpf_training._onCal`); (b) gli
  script con tempi fissi facevano il primo gesto dopo 0,5 s, ma dal 29/10 il telefono vuole 0,6 s di quiete
  (`CAL.firstSettle`) e 1,5 s di preparazione (`CAL.lead`); (c) il menu è a due colonne dal 31/10.
  CI: ci sono **due** workflow e nessuno parte su `natpf-simulator`. `.github/workflows/natpf-simulator-tests.yml`
  (Node 20) fa solo i test del sito, alcuni e2e del sito (compreso `lan-browser`) e il pacchetto con
  `tools/package-natpf.py`, che impacchetta solo `site/`; `.github/workflows/natpf-tennis.yml` (Node 22) fa `npm test` e
  `npm run build` del gioco, ma solo su `feature/natpf-tennis-mvp`. Nessuno script `natpf-*` è nella CI.
- **Cosa**: script e2e allineati al gioco attuale; poi CI su `natpf-simulator` che provi davvero gioco, build e sito.
- **Come**: (1) un aiuto comune `quickCalibrate` in `tools/e2e/th.mjs` che fa i gesti quando il telefono è pronto,
  come una persona, e la lezione scorsa con «Avanti» negli script che passano da «Allenamento»; cambiare solo gli script
  di prova, non il gioco (un difetto vero del gioco si annota qui e si decide); (2) aggiungere `natpf-simulator` ai push
  di **entrambi** i workflow, portare `natpf-simulator-tests.yml` a Node 22, aggiungere al matrix almeno
  `natpf-training-flow`; prima di attivare il trigger, provare in locale gli script già nel matrix e
  `tools/package-natpf.py`.
- **Perché**: senza prove nel browser verdi la modale (B4) e lo stesso schermo (B5) non si possono verificare
  end-to-end, e con i push frequenti serve una seconda rete di sicurezza remota.
- **Fine**: gli script elencati verdi (o KO residui spiegati, con causa fuori dal gioco), CI verde sul branch.

### B2 · Intro (Higgsfield)
- **Stato**: `natpf-tennis/public/media/intro.mp4` (1280×720, 8,04 s, 193 fotogrammi; job Higgsfield `32ab262f`) e
  il fotogramma finale `intro-fine.webp`. Difetti verificati sui fotogrammi: **due palline insieme tra ~4,3 e ~5,1 s**;
  fuori campo rosa/magenta e **due reti** nella vista aerea finale; nessuna somiglianza con l'arena del gioco (campo
  blu `0x294a94`, fuori campo azzurro `0x2a80d2`, `site/js/tennis/arena.js`). In più il CSS fa entrare la pallina del
  titolo a 5,6 s e il titolo a 5,7 s (`natpf-ui.css:395-399`, `INTRO_MS.full` 7800 in `natpf_intro.js:11`): una
  pallina del video ancora in scena dopo ~5,4 s sembrerebbe una seconda pallina.
- **Cosa**: un video nuovo con **una sola pallina** (un rimbalzo, fuori scena entro ~5 s) e il campo dell'arena del
  gioco; stessa durata e stessa sequenza del titolo.
- **Come**:
  1. Catturare dal motore del gioco il fotogramma iniziale e quello finale (camera a ≤ 16 m: sopra ~20 m il motore
     vede nero), senza scritte né marchi (regola di `public/media/LEGGIMI.txt` e `PROJECT_MEMORY.md`).
  2. Generazione video da immagini con fotogramma iniziale e finale; prima il **controllo del costo** (non spende).
  3. **Massimo 2 tentativi** (stima ~40 crediti ciascuno, ≤ 100 in tutto). Prompt: una sola pallina, un solo
     rimbalzo, rete unica, colori del campo come nei fotogrammi.
  4. Verifica fotogramma per fotogramma con ffmpeg: ≤ 1 pallina in ogni fotogramma (script
     `conta-palline.py` dell'analisi, da portare in `natpf-tennis/scripts/audit/`), una sola rete, colori vicini a
     quelli del gioco, niente scritte. Poi `intro-fine.webp` dall'ultimo fotogramma e prova nella pagina.
  5. Se tutti e due i tentativi falliscono: **fermarsi e avvisare l'utente** (decisione 4), senza altri tentativi.
- **Perché**: due palline in scena non rispettano la dinamica del tennis; il campo deve essere quello del simulatore.
- **Fine**: video sostituito, verifiche superate, crediti annotati, pacchetti consegnati.

### B3 · Presa (foto dell'utente al posto del martello), con rollback
- **Stato**: oggi la presa mostrata è il **martello**: foto `presa-martello.webp` (`natpf_media.js:10`,
  `index.html:398`), testo `GRIP_TEXT` (`site/js/tennis/grip-art.js:42`), 3D `q0` (`natpf_gesture_demo.js:196`,
  `GRIP_TILT` 80° in `natpf_gesture_motion.js:16`), testi della calibrazione (`natpf_cal_view.js:45`), guida
  (`natpf_onboarding.js:20`), `PROJECT_MEMORY.md` §Gesti; altri testi «martello»: `index.html:397` (Collega) e
  `index.html:439` (`.split-grip`, stesso schermo), `natpf_training.js:46` (passo «presa» della lezione),
  `natpf_gesture_motion.js:36` e `:38`, `grip-art.js:35` (aria-label). Elenco completo: `git grep -in martello`. La presa della foto dell'utente (uguale alla 6.png di
  riferimento) è quella che la guida del 28/10 mostrava come «Così no» (`presa-sbagliata.webp`).
  Simulazione sul riconoscitore vero (analisi del 04/11, `sim-presa.mjs`): presa nuova **516/540**, calibrazione e
  servizio sempre giusti, **tutti i 24 errori sono piatti letti come top spin** (soglie `flatRise .12`,
  `flatPower .62` in `natpf_stroke_intent.js:38-39`); martello 60/60. L'utente dice che con la presa reale il
  riconoscimento va già bene: la simulazione non sostituisce un telefono vero.
  Rischio tocchi: con lo schermo verso chi gioca le dita sono vicine al display, e ogni tocco può rivotare il segno
  dei sensori e far ripartire la calibrazione (`racchetta.js:478-484`).
- **Cosa**: foto, figura SVG, animazione 3D, testi (gioco, telefono, guida, calibrazione) con la presa nuova;
  piatto riconosciuto anche con la presa nuova; tocchi involontari che non rompono la calibrazione; rollback.
- **Come**:
  1. Definire la presa in numeri in un solo modulo (profilo `palmo`: cima ~35–40° verso l'interno e ~40° in avanti,
     schermo verso chi gioca; destro e mancino) accanto al profilo `martello`, con un'unica costante che sceglie
     quale mostrare (**rollback = cambiare la costante**; asset del martello conservati).
  2. Test nel `natpf-gesture-demo`: tutti i gesti mostrati nel tutorial riconosciuti con la presa nuova (destro e
     mancino, intervallo di angoli) **e** ancora con il martello.
  3. Piatto più tollerante con la pronazione naturale della presa nuova, con test e senza peggiorare gli altri colpi
     (banchi esistenti invariati).
  4. Foto dalla foto dell'utente: ritaglio su mano e telefono, sfondo pulito (in locale; Higgsfield solo se serve,
     pochi crediti dai 100), webp leggero; niente monitor né ufficio.
  5. Figura SVG, `GRIP_TEXT`, 3D `q0`, testi di calibrazione e guida coerenti con la foto.
  6. Tocchi: durante calibrazione e gioco un tocco sullo schermo non riavvia la calibrazione (il voto del segno si fa
     solo nei momenti e nelle zone previsti), con test del sito.
  7. `PROJECT_MEMORY.md` §Gesti aggiornato con la presa nuova e la procedura di rollback.
- **Perché**: la foto del martello è innaturale (richiesta del 04/11); le dimostrazioni del tutorial devono
  corrispondere agli algoritmi reali (CLAUDE.md).
- **Fine**: test verdi (gioco, sito, gesture-demo con le due prese), screenshot di guida, calibrazione e «Collega»,
  pacchetti consegnati. Non verificabile qui: telefono vero con la presa nuova.

### B4 · Modale del tutorial prima della calibrazione (gioco singolo)
- **Stato**: il riquadro «Guarda e ripeti» in alto a destra (`.coach-demo`, 232 px fissi, `natpf-ui.css:172-180`;
  `natpf_training.js:581-617`) è l'unica dimostrazione in calibrazione ed è piccolo. La lezione introduttiva esiste
  solo in «Allenamento» dal menu (`natpf_lobby.js:465-469`, `natpf_training.js:189`): mancano riscaldamento prima
  della partita, sfide e Player 2 invitato. Il telefono avvia la calibrazione da solo appena si attivano i sensori
  (`racchetta.js:306`). Testi incoerenti: il telefono dice «Guarda il computer e conferma» (`racchetta.js:120`) ma il
  computer conferma da solo (`natpf_training.js:273`); la guida dice «Nel riscaldamento il gioco impara il tuo
  pallonetto e la tua palla corta» (`natpf_onboarding.js:43`), ma lo fanno solo gli esercizi «Pallonetto» e «Palla
  corta» dell'Allenamento (`learnSpecial`): il riscaldamento prima della partita ha solo dritto, rovescio e servizio
  (`WARMUP_IDS`). Correzione: «Nell'Allenamento…».
- **Cosa**: una modale grande, prima della calibrazione, con illustrazioni e animazioni chiare di tutti i gesti
  (presa, posizione ferma, dritto, rovescio, servizio, colpi con effetto); pulsante **«Tutto chiaro, ho capito» sul
  telefono** che avvia la calibrazione; durante la calibrazione restano le istruzioni in basso a sinistra e il
  riquadro in alto a destra **non** c'è; negli esercizi dell'Allenamento il riquadro resta. Modale in tutti i percorsi
  con il telefono, una volta per sessione e per giocatore, «Rivedi i gesti» sempre disponibile; per la webcam una
  versione breve senza il 3D del telefono. Testi incoerenti corretti.
- **Come**:
  1. Protocollo: il computer manda al telefono «aspetta il tutorial» (campo nella configurazione); il telefono, dopo
     «Attiva i sensori», **non** avvia `cal.start` ma mostra il pulsante in alto, lontano dalle dita; al tocco manda
     un messaggio al computer, che chiude la modale e avvia la calibrazione. La calibrazione oggi parte da più punti e
     tutti devono rispettare l'attesa: `racchetta.js:306` (attivazione dei sensori), `command('cal')` sul telefono
     (`racchetta.js:374`) mandato da `recalibrate()` del computer (`natpf_phone_racket.js:560`, chiamato da
     `natpf_training.js:223` in `_begin` e da `natpf_split_ui.js:150` in `_drive`), il cambio di presa
     (`racchetta.js:369`) e il voto del segno a un tocco (`racchetta.js:480-484`). Compatibilità: un telefono con una
     pagina vecchia (senza il messaggio) fa partire la calibrazione come oggi e il computer chiude la modale da solo.
  2. Modale in `cqw/cqh` con `@container natpf` (CLAUDE.md), schede per gesto con l'animazione 3D esistente
     ingrandita (stesso contesto WebGL di `getGestureDemo`), foto della presa nuova, ripiego statico senza WebGL.
  3. Test: protocollo (telefono in attesa, messaggio, compatibilità), stato della modale, niente riquadro in
     calibrazione, riquadro negli esercizi; prova nel browser con `natpf-training-flow` (B1) e screenshot.
- **Perché**: chi gioca per la prima volta deve capire da solo presa, colpi e calibrazione; il riquadro attuale è
  troppo piccolo.
- **Fine**: test e prove nel browser verdi, screenshot a 1920×1080 e in un'area di ledwall, pacchetti consegnati.

### B5 · Stesso schermo (1v1): tutorial e calibrazione indipendenti per giocatore
- **Stato**: nella pagina «Collega i due telefoni» ogni metà mostra solo titolo e sottotitolo della calibrazione
  (`natpf_split_ui.js:35-45`); il computer conferma da solo e dopo 3 verifiche fallite fa giocare senza calibrazione
  (`natpf_split_ui.js:136-152`). Il testo della presa comune alle due metà è ancora sul martello (`index.html:439`,
  `.split-grip`, da cambiare in B3).
- **Cosa**: in ciascuna metà la propria modale e poi la propria calibrazione con le istruzioni; l'«ho capito» del P1
  non tocca il P2 e viceversa; webcam per due con la versione breve.
- **Come**: due istanze del componente della modale (stato per giocatore, legate al rispettivo telefono), layout per
  metà in `cqw`; un solo contesto WebGL che disegna l'animazione nelle due metà (o una animazione alla volta con il
  ripiego statico nell'altra, se le misure lo chiedono); test con due telefoni simulati.
- **Perché**: due persone alla prima esperienza devono poter impugnare, capire i colpi e calibrare da sole, insieme.
- **Fine**: test, prova nel browser con due telefoni simulati, screenshot, pacchetti consegnati.

### B6 · Versione Windows e architettura (sviluppo A+ autorizzato dopo la valutazione)
- **Stato**: A+ portatile implementato in 2026-11-04.1; collaudo Windows reale da fare. Analisi iniziale del 04/11: il guscio (Electron, Tauri, browser) usa lo stesso Chromium,
  quindi non cambia le prestazioni del 3D. Margini veri: livelli di qualità grafica (oggi sempre al massimo: ~1,5
  milioni di triangoli di pubblico, 417 draw call, MSAA 4×, DPR fino a 2, ombre 2048), riconoscimento della webcam
  fuori dal thread del disegno, ritardo dello schermo compensato solo con un valore manuale 0–200 ms nella diagnostica
  (`natpf.displayLagMs`, 0 finché non si misura), robustezza su Windows (firewall, certificati in una cartella stabile,
  indirizzo fisso, chiosco sul monitor esteso). Comunicazioni: `POST /api/racket/feedback` a ogni colpo, che nessuno
  legge (eliminabile); lettura dello stato ogni 0,5 s senza stanza 1v1 (`PHONE_POLL.idleMs`, scelta del 31/10 per
  tenere il P1 online nel relay, test `natpf-lan-letture.test.mjs`): da togliere solo dopo aver verificato che nessuno
  usa la presenza del P1 o i colpi del relay senza stanza.
- **Cosa**: `docs/DESKTOP_WINDOWS.md` con confronto (browser/Edge app e chiosco, Electron, Tauri, NW.js,
  Neutralino, PWA), architettura consigliata, benefici attesi, piano di migrazione a fasi e compatibilità con la
  versione browser.
- **Come**: partire dalle risposte del §3 punto 10: Windows 10, GPU ignota (qualità grafica automatica in cima alle
  priorità), nessuna firma del codice (un installer non firmato mostra SmartScreen: favorisce il pacchetto portatile
  con `node.exe` ufficiale firmato e Edge in modalità app/chiosco sul monitor esteso; Electron solo come fase
  facoltativa), telefoni dello staff (certificato installato una volta), nessun 1v1 tra due PC (la fase dei trasporti
  tra PC esce dal piano).
- **Perché**: il prodotto gira soprattutto su un PC Windows noleggiato con telefoni in LAN: servono stabilità e
  avvio semplice più di un nuovo guscio.
- **Fine**: valutazione pubblicata e primo blocco A+ sviluppato su autorizzazione successiva. Prima di dichiarare
  F2 conclusa serve il collaudo Windows. F0 misure e restante F1 ancora aperti; Electron e worker non implementati.

### B7 · Eseguibili Windows: portatile e installabile (richiesta del 04/11 sera)
- **Stato**: fatto e consegnato (2026-11-04.5); **collaudo su Windows dell'utente da fare** con
  `docs/COLLAUDO_WINDOWS.md`.
- **Cosa**: `NATPF-Simulator-Portatile-<versione>.exe` (un solo file, nessuna installazione, estrae al primo avvio in
  `%LOCALAPPDATA%\NATPF\portatile\<versione>`) e `NATPF-Simulator-Setup-<versione>.exe` (Programmi, collegamenti,
  regola del firewall, disinstallazione), con lo stesso gioco della versione browser.
- **Come**: Electron 45.2.2 in `natpf-desktop/`. Il processo principale avvia nello stesso processo il server LAN di
  A+ (certificati in `%LOCALAPPDATA%\NATPF`, HTTPS 8443, pagina del certificato 8081), si fida del proprio
  certificato solo per i propri indirizzi, apre il gioco a schermo intero sul monitor più grande non principale (il
  ledwall), schermo sempre acceso, webcam consentita, WebGL in software se la scheda è bloccata, menu (Alt) con
  monitor, rete e scheda grafica. Costruzione da Linux senza wine: electron-builder per `win-unpacked`, script NSIS
  propri (`build/installatore.nsi`, `build/portatile.nsi`) con il makensis della cache di electron-builder.
- **Perché**: l'utente vuole eseguibili veri, uno da copiare e uno da installare, sul PC noleggiato con Windows 10.
- **Fine**: raggiunta per la parte verificabile qui (costruzione, contenuto, prove del processo principale, avvio con
  Electron per Linux). Resta il collaudo su Windows; se segnala problemi si correggono qui con un blocco nuovo.

### B8 · Schermo intero senza cornici, adattamento al monitor, Cloudflare sotto 25 MB (04/11 sera)
- **Stato**: fatto (2026-11-05.1); collaudo su Windows, Edge e ledwall dell'utente da fare.
- **Cosa**: (1) in ogni versione (programma Windows installato e portatile, zip LAN con Edge, browser/Cloudflare)
  una modalità a schermo intero senza cornici: niente bordi, barra del titolo, barre del browser o menu; (2) il gioco
  si adatta alla finestra e al monitor in uso (proporzioni qualsiasi: campo sempre visibile, interfaccia e
  risoluzione) e ha una **calibrazione dello schermo** come nei videogiochi (bordi/area visibile, formato, prova del
  cerchio); (3) zip Cloudflare **sempre sotto 25 MB** (oggi 26,9 MB), con un controllo automatico.
- **Come**: zip LAN con Edge a schermo intero per impostazione (`--start-fullscreen`); Electron con la finestra creata
  già a schermo intero, senza menu che compare con Alt; nel browser schermo intero al primo tasto o clic della
  schermata iniziale, pulsante visibile, Esc che resta «indietro» (Keyboard Lock dove c'è); campo visivo orizzontale
  minimo della camera per monitor non 16:9; pagina «Calibra lo schermo» in Opzioni → Schermo; via i `.wasm` non SIMD
  di MediaPipe (Edge, Chrome ed Electron usano quelli SIMD) e controllo del peso nello script del pacchetto.
- **Perché**: agli eventi il gioco va su ledwall e monitor noleggiati con proporzioni e bordi diversi; la versione
  Cloudflare deve stare sotto il limite di 25 MB indicato dall'utente.
- **Fine**: prove automatiche (unità, browser a più proporzioni, Electron per Linux), zip Cloudflare < 25.000.000 byte,
  pacchetti ed eseguibili nuovi consegnati, punti nuovi in `docs/COLLAUDO_WINDOWS.md`.

### B9 · Modale e animazioni del tutorial, telefono, schermo spento, «Pronto» nel 1v1 (richiesta del 05/11)
- **Stato**: in corso.
- **Cosa**: vedi Checkpoint (5 punti dell'utente).
- **Come**: analisi delle cause prima di cambiare; modale compatta al centro (nello stesso schermo al centro della
  propria metà) con frecce ‹ › e avanzamento anche dal telefono; animazione nuova (direzione artistica scelta
  confrontando prototipi) costruita sui gesti realmente riconosciuti (`docs/PROJECT_MEMORY.md` §Gesti); stato del
  tutorial sincronizzato con il telefono (pulsante acceso solo dopo l'ultima finestra); telefono con Wake Lock,
  ripresa automatica e avviso sul PC quando lo schermo del telefono si spegne; stato «pronto» per giocatore nel 1v1.
- **Perché**: richiesta dell'utente con priorità alla qualità visiva e all'affidabilità.
- **Fine**: prove automatiche e nel browser (PC, telefono simulato, schermi grandi), schermate controllate, documenti,
  pacchetti ed eseguibili nuovi.

### Punti aperti precedenti (non della richiesta del 04/11; restano validi)
- **`natpf-tennis/test/e2e/lan-e2e.mjs` (non in CI) con controlli rossi da prima di B8** (verificato il 05/11 anche su
  `b74af13`): in partita il computer non riceve campioni continui dal telefono simulato («campioni in 0,7 s: 0»),
  racchetta che non segue il polso, gesto → colpo assente; con la webcam finta la racchetta non segue la mano (in
  WebGL software il gioco va a 1 fotogramma al secondo). Cosa: capire se è la prova (flusso dei sensori cambiato dopo
  la calibrazione rapida) o il gioco; `lan-browser.mjs` in CI dice che il flusso vero del telefono funziona. Come:
  `NO_PROXY="$NO_PROXY,<IP del PC>"` in questo ambiente, poi confrontare con `tools/e2e/lan-browser.mjs`. Perché: una
  prova rossa nasconde regressioni vere.
- **Prove dal vivo** (non verificabili qui). Cosa: iPhone (calibrazione e lati dei colpi), webcam a 1–4 m e per due
  con due persone, ledwall reale e fullscreen, nomi nel 1v1, pacchetto LAN su Windows 10, telefoni dello staff sulla
  rete dello stand. Come: l'utente prova con la diagnostica accesa e manda lo zip della diagnostica. Perché: i
  simulatori non sostituiscono telefoni, webcam e schermi veri.
- **C13 · anticipo sistematico dei colpi** (diagnostiche 20261030-142317 e -142438, archivio WORK_PROGRESS, sezione
  «Richiesta del 30/10 sera»). Il dettaglio della misura non è nel repository (era in un file temporaneo). Cosa:
  rimisurare l'anticipo medio su quelle diagnostiche o su una nuova. Come: script di analisi in
  `natpf-tennis/scripts/diag/`. Perché: decisione rinviata dall'utente il 31/10, va proposta con i numeri.
- **Sfida tra due computer** (P2 su un altro PC, compensazione della latenza, TURN): **sospesa** — l'utente il 04/11
  ha detto che agli eventi non serve. Cosa: niente; non si toglie e non si sviluppa oltre.
- **«Personaggio dell'iPhone che si muoveva sempre»** (29/10): non riprodotto; nel video si vede solo il dondolio
  d'attesa di P1 e P2. Cosa: prima chiedere all'utente che cosa si muoveva (personaggio, racchetta o schermata del
  telefono), poi una diagnostica con l'iPhone. Perché: senza sapere cosa guardare non si può riprodurre.
- **Pacchetto LAN di Codex del 04/11**: conteneva un file duplicato di Node, non identificato (`lan/pacchetto.mjs:34-39`
  cancella già `.node-tmp`). Cosa: al prossimo pacchetto controllare con `unzip -l` che `node.exe` ci sia una sola
  volta (in `node/`) e che non ci siano cartelle temporanee.

---

## 6. Procedure

**Ripresa**: `git fetch origin natpf-simulator` · `git status -sb` · `git log --oneline -5` · leggere §1 · eseguire
la prossima azione esatta.

**Test** (da `natpf-tennis/`): `npm ci` · `npm test` · `npm run build`. Sito (dalla radice):
`node --test tools/test/*.test.mjs`. LAN: `cd tools/lan && npm ci && node --test test/*.test.mjs`. Prove nel browser:
`npm ci --prefix tools/e2e`, poi `CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/<script>.mjs` per gli script
`natpf-*` (avviano da soli vite e la segnalazione) o `node tools/e2e/run-local.mjs <script>.mjs` per quelli del sito.
In questo ambiente `CHROMIUM_PATH` è obbligatorio: `playwright-core` di `tools/e2e` cerca un Chromium diverso da quello
installato in `/opt/pw-browsers`.

**Pacchetti** (dopo ogni commit che li cambia; se il commit non li cambia si riconsegnano gli ultimi, stessa versione e
sha256, dicendolo):
1. Versione nuova `AAAA-MM-GG.n` in `site/js/tennis/version.js` e `site/tennis/build.json` e, se si vuole un testo
   per chi gioca, righe `AAAA-MM-GG.n: novità` in `natpf-desktop/novita.txt` (mostrate nel gioco con l'aggiornamento;
   senza: «Versione AAAA-MM-GG.n.»); commit, push. Il push fa partire il workflow `natpf-windows.yml` (installer e
   aggiornamento su R2, vedi 4). **Solo una versione nuova si pubblica**: rifare il workflow o cambiare il programma
   senza cambiare versione costruisce l'Artifact ma non tocca il bucket (un installer pubblicato non si riscrive).
2. `cd natpf-tennis && npm run build`.
3. **Cloudflare** (come dal B8): `node scripts/pacchetto-cloudflare.mjs --out=<cartella nuova>
   --zip=<altra cartella>/natpf-simulator-cloudflare-<versione>.zip --turn-url=https://natpf-turn.s-porcelli.workers.dev/`;
   lo script si ferma a 25.000.000 byte e avvisa sopra 24.000.000. Prova sullo zip estratto (server statico), sha256.
4. **Installer Windows** (unico eseguibile, stessa versione): `npm ci` in `tools/lan`, poi in `natpf-desktop`:
   `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci`, `npm test`, `npm run costruisci` (~15 minuti, lzma) →
   `natpf-desktop/dist/NATPF-Simulator-Setup-<versione>.exe`. Con l'indirizzo degli aggiornamenti (quando l'utente l'ha
   dato): in `natpf-desktop/aggiornamenti.json` (`"base"`) o `NATPF_AGGIORNAMENTI_URL=<indirizzo> npm run costruisci`;
   senza, l'installer ha gli aggiornamenti spenti (stato `off`). Controllo con il 7zz della cache di electron-builder
   (`~/.cache/electron-builder/7zip@*/…/bin/7zz l`): ~300 file, nessun `.pem` o chiave, `resources/app` uguale a
   `dist/win-unpacked`, `resources/app/aggiornamenti.json` con l'indirizzo giusto; sha256; dimensioni e sha256 in
   `docs/COLLAUDO_WINDOWS.md` §0 se cambiano.
   **Su GitHub** lo stesso installer lo costruisce il workflow a ogni cambio di versione: Artifacts
   (`NATPF-Simulator-Windows-<versione>`: `.exe`, `SHA256SUMS.txt`, `latest.json`, lista di collaudo; 30 giorni) e,
   con i segreti R2 dell'utente, **aggiornamento pubblicato su R2**: `windows/NATPF-Simulator-Setup-<versione>.exe`,
   poi `windows/latest.json`, poi `windows/NATPF-Simulator-Setup.exe` (link fisso per la prima installazione). Da lì
   i programmi installati con l'indirizzo vedono la versione nuova e si aggiornano dal gioco. Controllo: riepilogo
   dell'esecuzione («Aggiornamento … pubblicato su Cloudflare R2») e `<indirizzo>/windows/latest.json` nel browser.
   Senza segreti il workflow avvisa e l'installer resta solo negli Artifacts.
5. **Consegna all'utente**: zip Cloudflare (sha256) e installer (link dell'esecuzione di GitHub o del bucket; se
   serve, a pezzi con `node scripts/dividi.mjs` → `dist/consegna/`, pezzi da 45 MB e `UNISCI I PEZZI.cmd`).
   Annotazione in `docs/WORK_PROGRESS.md` e nel Registro (§4).
6. **Niente più** zip LAN (`natpf-tennis/lan/pacchetto.mjs` resta: lo usa `natpf-desktop/scripts/prepara.mjs` per
   mettere il server dei telefoni nel programma) né portatile (`build/portatile.nsi` tolto).

**Aggiornamenti: cose da sapere per chi coordina**
- Contratto con il gioco: `window.natpfDesktop.updates` (versione 2 del ponte), descritto in
  `natpf-desktop/src/preload.cjs` e `natpf-desktop/LEGGIMI.md` § «Aggiornamenti dal gioco».
- Il bucket e i segreti li prepara l'utente con `docs/GUIDA_AGGIORNAMENTI_R2.md`; poi manda l'indirizzo pubblico (o
  imposta la variabile del repository `NATPF_AGGIORNAMENTI_URL`). La prima versione con l'indirizzo si installa a mano.
- Ogni aggiornamento chiede il permesso di Windows (UAC): l'installazione è per il computer (Programmi e firewall).
- Un correttivo dell'installer va pubblicato con una **versione nuova**: con la stessa versione il workflow salta il
  bucket («Aggiornamenti già pubblicati»).
- Prova su Linux: `cd natpf-desktop && node scripts/prepara.mjs && node scripts/prova-linux.mjs` (scenario
  `aggiornamenti` con un server finto; porte 8443, 8081, 8080 libere).

**Rollback della presa** (dopo B3): cambiare la costante del profilo di presa da `palmo` a `martello` (modulo
indicato in `PROJECT_MEMORY.md` §Gesti), `npm test`, pacchetti. In alternativa `git revert` dei commit di B3 elencati
nel Registro.
