# B49 · Doppio 2 contro 2 · piano per lo sviluppo

Analisi del 15/11/2026, 00:57–01:45 UTC. Solo lettura del repository: worktree staccata
`/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b49/wt` su
`natpf-simulator` a `b0c8356` (2026-11-14.4 + traccia). Righe citate: quelle di `b0c8356`. B48 (ramo `b48-servizio`) tocca
`game_engine.js` (servizio, difetto 16) e B41.3 la fine partita: **le righe si spostano**, si cercano con il testo citato.
Script e uscite delle misure: `/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b49/misure/`
(uscite di base in `misure/base/`). Carico della macchina (uptime): load average 2,2–3,8 per le misure di base
(01:02–01:08), poi 4–13 con i due agenti di sviluppo al lavoro (suite sul prototipo 01:25–01:33, load 5–13). Una sola sonda
nel browser, sulla porta 4370 (vite della worktree pulita, Chromium di `/opt/pw-browsers`), per lo spazio del pannello dello
stand (01:34–01:36, load 5,5–7,2); nessun server lasciato acceso. Seconda worktree pulita per le misure «prima» con lo stesso
comando: `…/prep/b49/wt-base` (stesso commit, `node_modules` in comune).

Stato del documento: COMPLETO (15/11, 01:45 UTC). Prototipo e misure rifacibili con i comandi della sezione 2 e 5.3.

## 0. In breve
- **Oggi il doppio è un altro gioco** (confermato sul codice di oggi, `b0c8356`): il colpo di chi gioca non passa dalla
  finestra d'impatto (`game_engine.js:1605`), quindi niente esito della racchetta virtuale (0% dei colpi), niente colpo
  super, profondità ed errori a caso; il personaggio sta a 0,38–0,44 m dalla palla (singolo 0,75–0,77); il compagno
  colpisce **solo con il gesto** e nessuno lo dice (tutorial, guida e pagina «Partita» muti).
- **Misure di oggi** (stessi script del D15, rifatti): vincenti sui punti vinti 10–28% nel doppio contro 27–75% nel
  singolo; il compagno fa il 7–11% dei colpi; senza il gesto sulle palle del compagno i punti vinti scendono a 7–26% (persi
  senza toccare 73–90%). **Nuovo dal D15**: scambi infiniti, 8,5–15,2% dei punti arriva a 60 colpi negli adulti.
- **Progetto** (provato con un prototipo nella mia worktree, mai nel repository): nel doppio contro la CPU chi gioca usa
  **le stesse funzioni del singolo** (finestra d'impatto, esito B15, colpo super, piano d'intercetto, movimento B32); il
  compagno **gioca da solo** le palle che, al colpo della CPU, la traiettoria prevista porta **entro 0,5 m dalla sua
  posizione d'attesa** (fissa, 1,4 m dal centro e 5,1 m dalla rete) ad altezza da volée, mai la risposta al servizio, con
  il colpo e gli errori del compagno della CPU; **anello azzurro** sotto di lui da quando la palla è sua; riga nella
  pagina «Partita» e una volta per partita in campo; opzione del pannello **«Doppio: compagno · Gioca da solo · Con il
  tuo gesto»** (di base «Gioca da solo»); nel doppio la pressione degli scambi lunghi conta lo scambio di chi gioca.
  La sfida tra due computer in doppio resta com'è.
- **Misure col prototipo** (stesso banco, 9 combinazioni livello × profilo): stesso gesto → stesso colpo del singolo (al
  centimetro); laterale 0,76–0,77 m; vincenti 0,92–1,55 × il singolo; compagno 9,8–15,9% dei colpi, errori 2,1–4,0%;
  punti vinti entro −8,0…+0,9 dal singolo; 0% di scambi a 60 colpi.
- **Passi**: B49.1 modulo puro e test; B49.2 motore (colpo, posizionamento, compagno, pressione); B49.3 anello; B49.4 righe;
  B49.5 opzione del pannello (rischio: spazio a 720 × 720 con 16 voci); B49.6 prove nel browser, misure, documenti,
  versione. Dopo B48 (stesse funzioni del motore).

## 1. Mappa del codice di oggi: doppio contro singolo

### 1.1 Come si sceglie il doppio
- Menu: «Gioca» → «Contro la CPU» (o «Sfida un amico») → pagina «Partita» → **«Altre impostazioni»** (chiuse a ogni
  visita) → riga **«Formato: Singolare 1v1 · Doppio 2v2»** (`natpf-tennis/index.html:718-723`). Si salva in
  `localStorage['natpf-tennis.format']` (`match_format.js:5`, `natpf_lobby.js:216-218` e `:395-402`) e **resta per tutti i
  visitatori** (né «Nuovo giocatore» né il chiosco lo rimettono: `natpf_lobby.resetWho` `:456-459` tocca solo il livello).
- «Gioca» chiama `engine.setMatchFormat(this.mode === 'split' ? 'singles' : this.format)` (`natpf_lobby.js:226`;
  `game_engine.js:739-746` mette `isDoubles` e mostra i due compagni). Anche `?format=doubles` (`game_engine.js:282`).
- Nello **stesso schermo il doppio non c'è** (pulsante nascosto, `natpf_lobby.js:282`; «Gioca» forza il singolare): niente
  doppio con due telefoni sullo stesso computer. Con **due computer** («Sfida un amico») sì: «Amico + CPU» contro
  «Tu + CPU» (`natpf_lobby.js:400-401`), ognuno con il compagno che colpisce con il gesto del proprio giocatore.
- Webcam: il formato è indipendente dalla racchetta, il doppio si gioca anche con la webcam (vedi 1.4).
- Riscaldamento, scambi di prova e minigiochi sempre in singolare (`natpf_training.js:271`, `:634`, `:642`;
  `natpf_events.js:198`).
- Nomi: «Tu + CPU» / «2 CPU» (`natpf_scoreboard.js:113-116`), servizio «Voi» (`natpf_lobby.js:424`), fine partita «Avete
  vinto!» / «Vincono le CPU» (`natpf_point_call.js:104-114`), riassunto «doppio» (`natpf_lobby.js:137`); niente classifica
  CPU per il doppio (`natpf_ui.js:305`).
- **Tutorial e guida non dicono niente del doppio**: nessuna occorrenza in `natpf_onboarding.js`, `natpf_tutorial.js`,
  pagina del telefono (`site/tennis/racchetta.html`, `site/js/tennis/`). La guida dello stand cita solo l'opzione
  (`docs/GUIDA_STAND.md:199`). Prima della partita nessuna riga spiega che il compagno colpisce solo con il tuo gesto.

### 1.2 Il colpo dal telefono: singolo contro doppio (`game_engine.js`)
| Passo | Singolo (oggi) | Doppio (oggi) |
|---|---|---|
| Gesto nello scambio | `_handleUserSwingInput` `:1605` → `NI.queueUserSwing(this, e, this.player)` (`natpf_impact.js:406`): finestra d'impatto, tempo vero `natpfTau = lead` | **saltato**: `if (!this.isDoubles && …)` a `:1605`. Al suo posto il percorso vecchio `:1612-1636`: compagno o giocatore scelto **con la geometria al momento del gesto** (palla tra 0,3 e 7,5 m dalla rete e a meno di 3,4 m di lato dal compagno, `:1616-1621`), swing in attesa fino a `NS.assistExpiry` (`natpf_skill.js:220`: 0,30 s Casual `:37`, 0,16 s Pro/Leggenda `:25`, 0,34 s Bambini `:115`) |
| Arrivo della palla | `NI.resolvePending(this, h)` `:3377` (h = giocatore) | stesso punto, ma `h` è il **compagno** se la palla è entro 7,2 m e più vicina a lui (`:3355`): una finestra nata per il giocatore verrebbe misurata sul compagno (oggi non succede solo perché nel doppio nessuno swing ha `natpfWindow`) |
| Chi colpisce | `_attemptPlayerRallyStrike` `:2054`: giocatore | stessa funzione, `l = isDoubles && palla tra 0,3 e 7,6 m && a ≤ 3,95 m dal compagno && più vicina a lui` (`:2062`) → colpisce il compagno |
| Esito | `racketShot = _natpfRacketShot(...)` `:2165` (`natpf_stroke_outcome.strokeOutcome`, deterministico, B15): direzione dal tempo e dal polso, profondità dalla forza, **colpo super** `NO.superShot` (`:2407-2410`), scambio caldo B42 | `racketShot = null` perché manca `natpfTau` (`:2165`): regole vecchie con il caso, profondità `-(8,2 + rand·2,6)` (`:2208`), errori a caso `NS.playerErrorPlan` (`:2236`), volée del compagno `I 0,56/0,68, N −(5,6 + rand·3,4)` (`:2210-2212`), **mai il colpo super** |
| Qualità «allungo» | `NI.stretchQuality` | spenta: `stretch: !this.isDoubles && …` (`:2380`) |
| Dopo il colpo | `NI.recoverAfterShot` (`:2336-2337`, `natpf_impact.js:262`): verso il fondo o a rete dopo un attacco (B31) | `player.targetPos` fisso in fondo (`:2338`); compagno a `x = 0,35·E ± 1,4`, `z = 5,1` (`:2339-2341`) |
| Scritta | grade + nome del colpo nel proprio angolo | uguale; per il colpo del compagno «compagno» nella riga piccola (`:2314` `partner: p === playerPartner`; `natpf_shot_feedback.js:100-113`, `:247-248`): **compare solo dopo il colpo** |

### 1.3 Posizionamento automatico di chi gioca
- Singolo: `_natpfPlanPlayer` → `NI.planPlayerIntercept` (`game_engine.js:2858-2859`, `natpf_impact.js:132-227`): traiettoria
  prevista con la fisica del motore, punto d'impatto al colmo dopo il rimbalzo (o volée/schiacciata), **palla di lato a
  `PLAN.side` = 0,72 m** (`natpf_impact.js:32`, `stand()` `:139`), movimento B32 (split-step, accelerazione:
  `natpf_movement.runProfile`), piano rifatto se la volée o la schiacciata non arrivano (`_natpfReplanMissed` `:2869-2873`).
- Doppio: `_predictBallIntercept(this.player)` (`game_engine.js:2904-2932`): **2,15 m dietro il rimbalzo e 0,38 m di lato**
  (`:2906-2913`), niente piano (`natpfPlan` resta vuoto, quindi `timeToContact` usa la linea retta), niente B32
  (`natpf_movement.js:43` esclude il doppio), niente piano rifatto (`:2870`). Lo stesso metodo muove il compagno: verso la
  palla corta se cade entro 6,6 m e a meno di 2,9 m da lui (`:2914-2920`), altrimenti `x = 0,42·xRimbalzo ± 1,35`, `z = 5,1`
  (`:2921-2925`): **la posizione d'attesa segue la palla**.
- Velocità: compagno 8,6 m/s a Casual, 8,4 a Pro (`game_engine.js:425-438`); compagno della CPU 5,15 / 6,6.

### 1.4 Il compagno di chi gioca: quando colpisce
- **Solo con il gesto di chi gioca** (tabella 1.2). Non c'è nessun colpo automatico del compagno: l'unico tiro senza gesto
  è quello della dimostrazione (`autoPlayMode && !userHasInteracted`, `:3399-3405`). Se nessuno fa il gesto la palla gli
  passa accanto e il punto è perso («Point», `:3407-3409`).
- Webcam (modo «argon», quello di base: `motion_controls.js:29-33`): `_argonWebcamSwing` (`:1667-1712`) ha la sua copia
  della regola del compagno (`:1683-1694`) e il colpo assistito di 0,48 s; anche nel singolo la webcam «argon» non passa
  dalla finestra d'impatto (colpo con le regole vecchie). La webcam «movimento» (`?webcamMovimento=1`) manda eventi con
  `natpf` (`motion_controls.js:775-776`) e passa dal percorso del telefono.
- Sfida tra due computer: il Player 2 ha lo stesso schema per il suo compagno (`_handleP2SwingInput` `:1828` salta la
  finestra nel doppio; `_attemptP2RallyStrike` `:2477-2483`).

### 1.5 La squadra della CPU (per confronto)
- Il compagno della CPU colpisce da solo (`:3306-3320`): palla entro 0,88 m in profondità e 0,85 m (Casual) / 1,3 m (Pro)
  di lato, sotto 1,78 m, dal terzo colpo, non sul colpo potente né sul pallonetto, a Casual solo il 55% delle volte;
  `_executeOpponentReturn(opponentPartner)` (`:2718`): errori di `NS.cpuReturnPlan`, colpo «SLICE» a 5,8–8,4 m
  (`:2761`), volo 0,96 / 0,76 s. Niente regole a rete B31 nel doppio (`natpf_net_play.cpuActive` `:113`).
- La CPU principale mira a chi gioca (`NS.cpuShotChoice` con `playerX`), ignorando il compagno.

### 1.6 Test e prove che toccano il doppio oggi
- `test/natpf-voce-smash.test.mjs:16-35, 104-150`: volée e schiacciata **del compagno con il gesto** (motore senza
  disegno, `isDoubles = true`, gesto senza `natpfTau`). Con il compagno che gioca da solo questi casi valgono solo in
  «Con il tuo gesto» (vanno aggiornati, B49.2).
- `test/natpf-b32-movimento.test.mjs:79-99`: `runProfile` **nullo nel doppio** (`off('doppio', …)` riga 85): cambia se il
  doppio prende il movimento del singolo (B49.2).
- `test/natpf-integration.test.mjs:19-20`, `test/natpf-flows.test.mjs:527`, `test/natpf-lobby.test.mjs:179`,
  `natpf-scoreboard*.test.mjs`, `natpf-fine-partita.test.mjs`: formato, nomi e riassunto (non cambiano).
- Browser: `tools/e2e/natpf-scritte-2v2.mjs` (scritte dell'esito nel doppio contro la CPU, 1280×720, 1920×1080, 720×720,
  con `testInput` e mouse, `openMatch(w, h, 'doubles')` riga 128-140); `natpf-tabellone.mjs:156-162` (sigle «TU+CPU»);
  pannello dello stand: `natpf-menu.mjs` («Chiudi» in vista a 1024×600, 1366×657, 720×720), `natpf-pannello-cadute.mjs`,
  `natpf-solo-mouse.mjs`, `natpf-telecomando.mjs`.

## 2. Misure di base sul codice di oggi (`b0c8356`)

Banco: `scripts/audit/rally-balance.mjs` (motore vero senza disegno, profili di persona `umano`, `amatore`, `bambino`;
`umano` = gesto 0,25 s dopo il rimbalzo), 3 semi × 150 punti per riga. I quattro script dell'audit B16 non c'erano più al
loro posto (`…/b16/wt-audit` cancellata): copiati in `misure/` con il percorso della worktree nuova
(`doppio.mjs`, `v-doppio.mjs`, `v-doubles.mjs` + `v-late.mjs`, `doubles-check.mjs`), uscite in `misure/base/*.txt`; più
uno script nuovo, `misure/b49-misure.mjs` (tutte le misure in una riga, anche il livello Evento, quello di «Chi gioca:
Adulto», e riusabile dopo il B49 con `--wt=`) e `misure/b49-regole.mjs` (stime delle regole del compagno, 3c).
Comando (da `natpf-tennis`): `node --import ./test/register.mjs <script>`; tempi 1–70 s ciascuno.

### 2.1 Il gioco è cambiato dal B16: i numeri del D15 vanno letti con quelli di oggi
| Misura (stesso script del D15) | D15 (08/11) | Oggi (15/11) |
|---|---|---|
| Colpi del compagno sul totale della squadra (`v-doppio`) | 5,6–9% | **6,9–10,6%** |
| Vincenti sui punti vinti, casual/umano: singolo → doppio | 23,6–24,8% → 2,1% | **54,7% → 16,4%** |
| Vincenti sui punti vinti, pro/umano: singolo → doppio | 8,7–9,3% → 1,9–3,0% | **70,9% → 28,3%** |
| Punti vinti pro/amatore: singolo → doppio | 61,3–64,0% → 78,7–83,3% | **51,1% → 41,7%** (ora il doppio è più difficile) |
| Punti vinti casual/umano: gesto su tutte le palle → senza gesto sulle palle del compagno | 95 → 44% | **72,8 → 25,8%** |
| Punti vinti pro/amatore: idem | 79 → 36% | **41,7 → 10,2%** |
| Profondità del colpo con lo stesso gesto (`v-doubles`, lead 0) | −9,72 fisso contro −8,18…−9,90 | **−9,74** fisso contro **−8,18…−9,90** (uguale) |
| Fuori/rete «per caso» con lo stesso gesto, lead 0,15–0,25 | 7–10% | 7–10% (2–3 su 30, uguale) |
| Pro, lead 0,25: colpi a vuoto | 30 su 30 | **30 su 30** (uguale) |
| Distanza laterale palla–corpo al colpo (`doubles-check`, p50) | 0,39–0,42 m contro 0,74–0,76 | **0,38–0,41 m contro 0,76–0,77** |
| Colpi con l'esito della racchetta virtuale (B15) | 0% contro 100% | **0% contro 100%** |

Il singolo oggi dà molti più vincenti di allora (B18.2, B31, B32, B42 tra il 08/11 e oggi); il doppio è rimasto com'era e
la distanza è cresciuta.

### 2.2 Tabella completa (`misure/base/b49-misure.txt`)
Punti vinti / vincenti sui vinti / colpi del compagno / scambio medio (p90) / scambi chiusi d'ufficio a 60 colpi / punti
persi senza toccare la palla. «doppio» = chi gioca fa il gesto su ogni palla (anche quelle del compagno, con il tempo del
proprio punto d'impatto, come il banco di sempre); «senza gesto» = lascia le palle del compagno al compagno.

| Livello · profilo | Singolo | Doppio | Doppio senza gesto sulle palle del compagno |
|---|---|---|---|
| casual · umano | 88,2% · 54,7% · — · 8,7 (20) · 0% · 1,6% | 72,8% · 16,4% · 10,3% · **27,9 (60)** · **10,4%** · 17,6% | 25,8% · 17,2% · 0,1% · 9,3 · 0% · 72,9% |
| casual · amatore | 84,0% · 47,6% · — · 8,6 (20) · 0% · 6,0% | 74,0% · 13,4% · 11,0% · 26,5 (57) · 8,5% · 18,9% | 23,3% · 4,8% · 0% · 9,8 · 0% · 75,3% |
| casual · bambino | 50,9% · 26,6% · — · 7,2 (17) · 0% · 31,8% | 40,2% · 13,3% · 8,7% · 16,7 (34) · 0% · 53,6% | 17,8% · 8,8% · 0,1% · 8,8 · 0% · 80,4% |
| evento · umano | 68,7% · 56,0% · — · 14,6 (27) · 0% · 9,6% | 62,0% · 16,6% · 10,1% · 29,3 (60) · 12,1% · 25,2% | 22,2% · 11,0% · 0,1% · 9,5 · 0,2% · 75,8% |
| evento · amatore | 67,6% · 59,9% · — · 12,8 (26) · 0% · 12,4% | 63,9% · 14,4% · 9,5% · 29,1 (60) · 11,5% · 24,6% | 23,6% · 15,1% · 0,1% · 9,8 · 0% · 75,8% |
| evento · bambino | 47,6% · 29,4% · — · 7,0 (16) · 0% · 36,2% | 38,9% · 10,3% · 8,6% · 16,6 (34) · 0,4% · 55,8% | 20,2% · 2,2% · 0,1% · 9,1 · 0% · 77,6% |
| pro · umano | 61,8% · 70,9% · — · 14,6 (26) · 0% · 10,9% | 42,1% · 28,3% · 7,2% · 29,8 (60) · **15,2%** · 41,9% | 11,6% · 28,8% · 0% · 12,0 · 0,4% · 86,2% |
| pro · amatore | 51,1% · 74,8% · — · 12,4 (25) · 0% · 23,1% | 41,7% · 25,2% · 7,6% · 31,1 (60) · 14,4% · 45,7% | 10,2% · 21,7% · 0% · 10,4 · 0,2% · 87,6% |
| pro · bambino | 17,1% · 41,6% · — · 7,9 (17) · 0% · 60,7% | 18,0% · 23,5% · 9,4% · 14,9 (33) · 0,4% · 76,2% | 6,9% · 12,9% · 0,1% · 8,3 · 0% · 90,4% |

Altre colonne (stesso file): distanza laterale p50 0,75–0,77 m nel singolo, 0,38–0,44 m nel doppio (sotto 0,45 m nel
55–79% dei colpi contro 0,3–3,4%); esito B15 100% contro 0%; colpi a vuoto per 100 gesti 0,8–8,0 nel singolo, 0–3,3 nel
doppio (lo swing in attesa del percorso vecchio aspetta la palla e prende quasi tutto).

### 2.3 Cosa dicono le misure
1. **Il colpo e il posizionamento del doppio sono quelli del motore base** (confermato: 0% di esiti B15, palla a 0,4 m dal
   corpo, profondità a caso, mai il colpo super).
2. **Scambi infiniti, nuovo dal D15**: nel doppio lo scambio medio è 2–3 volte quello del singolo (26–31 colpi contro
   8,6–14,6) e l'8,5–15,2% dei punti arriva al tetto di 60 colpi del banco (chiuso d'ufficio come perso: «scambio infinito»,
   anche per questo i punti vinti scendono). Con gli adulti a Casual, Evento e Pro, mai nel singolo. Le simulazioni del
   doppio non finiscono nemmeno i 150 punti in 4000 s di gioco (n 381–412 invece di 450). Causa probabile: i colpi
   «vecchi» di chi gioca vanno quasi tutti in campo a profondità media, la CPU ha il suo compagno a rete, e quasi
   nessuno sbaglia o chiude (vincenti 10–28% dei punti vinti).
3. **Senza il gesto sulle palle del compagno si perde quasi tutto**: punti vinti 6,9–25,8%, persi senza toccare la palla
   72,9–90,4%. Chi non sa che deve fare il gesto per il compagno perde 3 punti su 4.
4. Il compagno oggi tocca il 7–11% delle palle della squadra, ma solo se chi gioca fa il gesto nel momento giusto per lui.

### 2.4 Non misurato
- Persone vere nel doppio (telefono vero, ledwall): niente. Il profilo `umano` del banco nel doppio non ha il piano
  d'intercetto e il suo gesto «dopo il rimbalzo» cade sul tempo del motore (`rally-balance.mjs:154`, `human` richiede
  `natpfPlan.kind === 'ground'`): nel doppio di oggi `umano` e `amatore` si comportano allo stesso modo.
- Sfida tra due computer in doppio, webcam nel doppio, livello Leggenda nel doppio: non simulati.
- Quante volte allo stand si sceglie il doppio: nessun dato (il registro di gioco B30 potrebbe dirlo: campo `doubles`
  delle partite, `natpf_match_stats.js:52`).

## 3. Progetto

Il progetto è stato **provato con un prototipo** nella mia worktree (mai nel repository, niente commit): diff in
`misure/prototipo.diff` (+66/−13 righe in `game_engine.js`, +1/−1 in `natpf_movement.js`, +2/−2 in `natpf_skill.js`) e
modulo `misure/prototipo-natpf_doubles.js`. Interruttori solo per le misure, con variabili d'ambiente: `B49_PRESS=own` e
`B49_HOT=own` (pressione e scambio caldo sullo scambio di chi gioca: **usati per i numeri finali**), `B49_PRESS=0.7`
(prova con il 70% dei colpi), `B49_CPUPRO=casual` (compagno della CPU di Pro come a Casual: effetto piccolo, scartato);
`b49-misure.mjs` accetta `--homeX=` e `--reach=` per la regola. Comando dei numeri finali (da `wt/natpf-tennis`):
`B49_PRESS=own B49_HOT=own node --import ./test/register.mjs ../../misure/b49-misure.mjs --fmts=singles,doubles`. Serve come riferimento e per i numeri della 3f; **non è il codice da consegnare**
(mancano anello, riga, opzione, test, scritte, la webcam e i controlli per la sfida tra due computer).

Principio: nel **doppio contro la CPU** (`isDoubles && !isMultiplayer`) chi gioca è un giocatore del singolo che copre
tutto il campo da fondo, tranne le palle che passano vicino al compagno a rete; quelle le gioca il compagno da solo
(«Gioca da solo», di base) oppure con il gesto di chi gioca («Con il tuo gesto», l'opzione dello stand). La sfida tra due
computer in doppio resta com'è oggi (3e).

### 3a. Colpo di chi gioca uguale al singolo
- **Stesse funzioni del singolo** per le palle di chi gioca: `NI.queueUserSwing` → `NI.resolvePending` →
  `_attemptPlayerRallyStrike` con `natpfTau` → `_natpfRacketShot` (esito B15, direzione dal tempo e dal polso, profondità
  dalla forza, **colpo super** `NO.superShot`, scambio caldo B42, «in corsa/in allungo» B32), `NI.recoverAfterShot`.
- Nel percorso del gesto (`game_engine.js:1605`) la condizione `!this.isDoubles` diventa «non doppio, oppure doppio contro
  la CPU e palla non del compagno». Sulla **palla del compagno**:
  - «Gioca da solo»: il gesto **non fa niente** alla palla (niente colpo a vuoto, niente «Troppo tardi», niente aptica
    d'errore); si conta (`engine.natpfPartnerIgnored`) e si scrive nella diagnostica (`doppio.gestoPallaCompagno`).
  - «Con il tuo gesto»: il percorso di oggi (swing in attesa con l'attore compagno, `:1614-1636`), ma il compagno è scelto
    dalla regola della 3c e non più dalla geometria al momento del gesto (`:1616-1621`, `:2062`, `:3355`).
- Mai più la scelta geometrica del compagno nel doppio contro la CPU: in `_attemptPlayerRallyStrike` (`:2062`) `l` vale
  solo con «Con il tuo gesto» e palla del compagno; nel ciclo (`:3355`) `h` è il compagno solo in quel caso, così
  `NI.resolvePending(this, h)` misura sempre la finestra sull'attore giusto.
- **Pressione degli scambi lunghi** (`_natpfRacketShot` `:2391` `NO.rallyPressure(b.rallyStrokeCount, …)` e `:2394`
  `NH.hotPressure(b.rallyStrokeCount + 1, …)`): nel doppio contano i colpi di tutti e quattro (volée dei compagni comprese) e
  chi gioca si trova «sotto pressione» prima che nel singolo. Misurato col prototipo a Pro: punti vinti 47,3% (umano) e
  42,9% (amatore) contro 61,8 e 51,1 del singolo, con «perso: Net» 116 e 80 contro 30 e 27; contando lo scambio di chi
  gioca come se fosse un singolo (funzione pura `NDB.exchangeStrokes` = `2 × colpi suoi già fatti nel punto + (2 se ha
  battuto lui, 1 se ha battuto la CPU)`, cioè il numero di colpi che lo scambio avrebbe nel singolo al suo colpo) per tutte
  e due: 53,8% e 51,1%, rete 42 e 25 (`misure/proto-r05.txt`, `proto-r05-pressown*.txt`; il prototipo usava
  `+ rallyStrokeCount % 2` al posto del termine del servizio: al più 2 colpi di differenza). Proposta: nel doppio contro la CPU `pressure0` e `hotPress`
  usano `NDB.exchangeStrokes(this)`; tutto il resto dello scambio caldo (scritta «Scambio caldo», scia, CPU) resta sul
  conto dei colpi come oggi.
- `stretch` (`:2380`): vale anche per chi gioca nel doppio contro la CPU (il piano c'è).
- Webcam «argon» (`_argonWebcamSwing` `:1683-1694`): stesso schema (palla del compagno ignorata con «Gioca da solo»;
  compagno solo con «Con il tuo gesto» e palla sua); le palle di chi gioca restano sul percorso della webcam del singolo.
- Mouse e tastiera: come nel singolo (passano già da `queueUserSwing`).
- Prova del prototipo (`misure/v-doubles-dopo.mjs` → `misure/proto-v-doubles-dopo.txt`): **lo stesso gesto sulla stessa
  palla dà lo stesso colpo nel singolo e nel doppio** (x e z uguali al centimetro, 30/30 con la racchetta virtuale, a
  Casual e Pro, lead 0–0,35; anche Pro lead 0,25: 30 colpite, oggi 0).

### 3b. Posizionamento automatico uguale al singolo
- `_natpfPlanPlayer` (`:2858-2860`), nel doppio contro la CPU:
  1. la regola della 3c decide di chi è la palla (`this.natpfPartnerBall = NDB.partnerBallPlan(this)`);
  2. palla di chi gioca → `NI.planPlayerIntercept(this, this.player, opts)` come nel singolo (palla di lato a 0,72 m,
     colmo dopo il rimbalzo, volée e schiacciata, movimento B32); il compagno torna alla posizione d'attesa;
  3. palla del compagno → il compagno va al punto della volée (0,55 m di lato, 0,35 m dietro); chi gioca va a coprire il
     fondo (`x = 0,3 × x della volée` entro ±1,6 m, `z = PLAN.baseline` 11,74); `natpfPlan = null`.
- `natpf_movement.js:43`: togliere `engine.isDoubles` dall'esclusione (il movimento B32 vale per `engine.player` anche nel
  doppio contro la CPU; il compagno non è `engine.player`). La sfida tra due computer resta esclusa (`isMultiplayer`).
- `_natpfReplanMissed` (`:2869-2873`): anche nel doppio contro la CPU, ma non sulla palla del compagno.
- Dopo il colpo di chi gioca (`:2336-2341`): `NI.recoverAfterShot` anche nel doppio contro la CPU; il compagno torna alla
  **posizione d'attesa fissa** `NDB.partnerHome` = `x = ±1,4` (dal suo lato: segno di `:2340`), `z = 5,1`, che non segue più
  la palla (oggi `0,35·E ± 1,4` e `0,42·x ± 1,35`): così la regola della 3c è prevedibile e l'anello non «salta».
- `_predictBallIntercept` resta per la squadra della CPU e per la sfida tra due computer.
- Misure col prototipo (`misure/proto-finale.txt`): distanza laterale p50 **0,76–0,77 m** nel doppio (singolo 0,75–0,77,
  oggi 0,38–0,44), sotto 0,45 m nello 0,4–3,4% dei colpi (oggi 55–79%), esito B15 nel 100% dei colpi di chi gioca (oggi 0%).

### 3c. Compagno autonomo
**Quali palle sono sue.** Una regola sola, decisa **al colpo della CPU** con la traiettoria prevista (`NI.predictBall`, la
stessa fisica del motore), in `NDB.partnerBallPlan(engine)` (funzione pura):
- la palla è del compagno se, **prima di rimbalzare**, passa **entro 0,5 m dalla sua posizione d'attesa**, ad altezza da
  volée (0,6–1,7 m), tra 2,2 m dalla rete e 0,8 m dietro di lui; restituisce `{ stroke, at, t, contact }`;
- **mai la risposta al servizio** (`rallyStrokeCount ≤ 1`): il servizio della CPU lo prende sempre chi gioca;
- tutte le altre sono di chi gioca: pallonetti sopra il compagno, palle larghe, corte o profonde. In una frase per chi
  gioca: «le palle che passano vicino al compagno le gioca lui, tutte le altre tu».

Perché così (misure, `misure/base/b49-regole*.txt`, stima sul doppio di oggi): con la posizione d'attesa che segue la palla
anche 0,6 m davano il 22–28% delle palle al compagno; con la posizione fissa 0,4 m → 9,5–12,3%, 0,6 m → 16,9–20,8%,
0,8 m → 24,9–28,9%. Le varianti «solo nella sua corsia» e «solo se è più vicino di chi gioca» cambiano meno di 1 punto (le
palle che gli passano vicino sono già dal suo lato e lui è sempre più vicino): non servono. «Palla corta nella sua
corsia» (rimbalzo prima della riga del servizio dal suo lato) sono il 2,7–4,8% delle palle: restano a chi gioca
(`planPlayerIntercept` va avanti da solo), estensione possibile. Nel prototipo (0,5 m) il compagno fa **9,8–15,9%** dei
colpi della squadra (3f).

Posizione d'attesa: `x = ±1,4` (la base di oggi dopo il colpo, `:2340`) o `±2,05` (dove sta al servizio, `:1334`)? Misurate
tutte e due col prototipo (`misure/proto-finale.txt` e `misure/proto-home205.txt`, casual/evento/pro × umano/amatore):
con 2,05 il compagno fa il 12,1–16,3% dei colpi e a Pro il doppio è un poco più facile (umano −5,6 dal singolo invece di
−8,0), ma chiude più punti (volée più angolate da vicino al corridoio): 8,4% dei punti a evento · umano e 6,2% a casual ·
amatore, sopra l'obiettivo 3 (≤ 6%). **Proposta: 1,4**, tutti gli obiettivi rispettati; al servizio il compagno resta a
±2,05 (`:1334`) e al primo colpo della CPU fa 0,65 m verso la posizione d'attesa (meno di un decimo di secondo).

**Come colpisce.** `_executePartnerReturn(pb)` (metodo nuovo, accanto a `_executeOpponentReturn`), chiamato nel ciclo
(`:3349` e seguenti, blocco `lastHitter === 'opponent'`) quando `elapsedTime ≥ pb.at + pb.t`; se in quell'istante la palla
è a più di 1,5 m dal punto previsto (nastro, rimbalzo strano) la palla torna a chi gioca (`natpfPartnerBall = null`,
`_natpfPlanPlayer({ groundOnly: true })`). Il colpo è **quello del compagno della CPU** (`_executeOpponentReturn` con
`t = true`, `:2719-2761`), specchiato verso la metà della CPU:
- volée tagliata a 5,8–8,4 m dalla rete, verso il lato lontano dalla CPU di fondo (`opponent.pos.x ≥ 0 ? −1 : 1`, a
  0,85–2,0 m dal centro), volo 0,96 s (0,82 a Pro e Leggenda); `_launchBallToTarget` + `NS.fixAir`; `lastHitter = 'player'`;
- errori con il modello della CPU, `NS.cpuErrorChance` + `NS.cpuErrorKind`, e un **livello del compagno**
  `PARTNER.err = { base .03, stretch .2, run .06, speed .05, angle 0, pressure 0, soft .7, net .35, max .3 }`
  (allungo = distanza laterale / 1,2 m): rete, largo o lungo come per la CPU;
- registrato per la risposta della CPU con `NS.registerPlayerShot(…, who: 'partner')` (qualità 0,75, forza 0,5): **non
  tocca** la serie dei perfetti né il conto delle palle corte di chi gioca (due righe in `natpf_skill.js:426-436`);
- poi `_natpfPlanOpponent(this.opponent)` e `NS.planCpuRun(this)`, come dopo un colpo di chi gioca;
- campo `natpfTeamHit = 'partner' | 'player'` (+ `natpfTeamHitAt`, `natpfTeamHitGesture`) a ogni colpo della squadra:
  lo leggono statistiche, registro, prove e `misure/b49-misure.mjs`;
- niente scritta dell'esito e niente aptica per il colpo del compagno (come per i colpi della CPU); la statistica della
  partita (`natpfStats.shot`, `:2316`) non lo conta come colpo di chi gioca.
- Misure col prototipo (`misure/proto-finale.txt`): errori del compagno **2,1–4,0%** dei suoi colpi; punti vinti sul suo
  colpo 0–1,6%, persi 1,1–4,0% dei punti.

**Anello sotto di lui** (modulo nuovo `natpf_partner_ring.js`, classe `NatpfPartnerRing(engine)`, aggiornata in
`natpf_ui.tick(dt)` come `serveMark.update`, `natpf_ui.js:264`; creata accanto a `serveMark`, `natpf_ui.js:107`):
- una sola mesh creata una volta: `THREE.RingGeometry(.5, .68, 40)` ruotata a terra, `MeshBasicMaterial` trasparente,
  `depthWrite: false`, `polygonOffset` (come `natpf_serve_marker.js:105-113`), niente ombre, `renderOrder 3`; colore
  diverso dagli anelli dell'esito (verde, giallo, rosso) e dal riquadro del servizio (`0xe8ff3a`): **azzurro `0x46c8ff`**;
- si vede dal colpo della CPU al colpo del compagno (`NDB.partnerBallNow(engine)` vero), sotto i piedi del compagno
  (segue `playerPartner.pos` a ogni fotogramma, senza creare oggetti), entra in 0,12 s (scala 0,6 → 1) e pulsa (opacità
  0,65–0,95 a 1,6 Hz); sparisce al colpo, a fine punto, nella moviola (`cameraMode === 'REPLAY_CAM'`), con il menu aperto,
  nella dimostrazione e fuori dal doppio contro la CPU;
- uguale con «Con il tuo gesto» (lì vuol dire «adesso il gesto vale per lui»);
- costo: 1 mesh, 1 materiale, nessuna luce; nessun asset.

**Riga che lo spiega prima della partita** (testi in italiano; la voce del gioco non cambia):
- pagina «Partita», nota sotto le scelte (`#lobby-match-note`, `natpf_lobby.js:611-617`), con il doppio contro la CPU:
  «Doppio: le palle che passano vicino al compagno le gioca lui (anello azzurro sotto i piedi), tutte le altre tu.»; con
  «Con il tuo gesto»: «Doppio: quando sotto il compagno compare l'anello azzurro, fai il gesto: colpisce lui.» (testi in
  `NDB.partnerLine(mode)`, funzione pura);
- poiché il formato si sceglie in «Altre impostazioni» (lo fa lo staff) e il visitatore può non leggere la nota: **in
  partita, alla prima palla del compagno di ogni partita**, una riga breve per 2,6 s (`ui.toast`, `toastMs` di
  `natpf_stand_mouse.js:54`): «Palla del compagno: gioca lui» / «Palla del compagno: fai il gesto per lui»
  (`NDB.partnerFirstHint(mode)`), una volta per partita (`natpfMatchSeq`).
- la guida dello stand (`docs/GUIDA_STAND.md`, riga del Formato `:199` e tabella del pannello) dice la regola e l'opzione.

### 3d. Opzione nel pannello dello stand «Doppio: compagno · Gioca da solo · Con il tuo gesto»
- Pulsante nuovo nella griglia (`natpf-tennis/index.html:236-251`, dopo `data-staff="open"`):
  `<button type="button" data-staff="partner" title="…"><span>Doppio: compagno</span><b>Gioca da solo</b></button>`;
  valori **«Gioca da solo»** (di base) · **«Con il tuo gesto»**, un clic passa all'altro.
- Salvato in `localStorage['natpf-tennis.compagno']` (`'solo' | 'gesto'`), letto **a inizio partita**
  (`startNewMatch`, accanto a `natpfHot`, `game_engine.js:1259`: `this.natpfPartner = typeof this.natpfPartnerRule ==
  "string" ? NDB.partnerModeOf(this.natpfPartnerRule) : NDB.readPartnerMode()`), così non cambia a metà partita; indirizzo
  `?compagno=solo|gesto` per le prove (come `?battuta=`, `natpf_battuta.js:21-26`). Funzioni pure nello stile di
  `natpf_battuta.js`: `partnerModeOf`, `nextPartnerMode`, `readPartnerMode`, `writePartnerMode`, `partnerForcedByUrl`,
  `partnerButton`, `partnerToast`.
- `natpf_kiosk.js`: `run('partner')` (scrive, avviso, `ui.diag?.recorder?.log?.('stand.compagno', { modo, indirizzo })`) e
  `paint()` (`set('partner', partnerButton(m, forced), m === 'solo')`), come `battuta` (`:262-266`, `:286`).
- **Spiegazione della voce** (il `title`, che la riga sotto le voci mostra con il mouse: `natpf_stand_mouse.js:42`,
  `:116`): «Gioca da solo (di base): nel doppio contro la CPU il compagno colpisce da solo le palle che passano vicino a
  lui, con un anello azzurro sotto i piedi; il gesto di chi gioca vale solo per le sue palle. Con il tuo gesto: come
  prima, il compagno colpisce solo se chi gioca fa il gesto quando la palla va a lui. Vale dalla prossima partita e resta
  salvata.» Avviso dopo il clic: «Compagno nel doppio: gioca da solo le palle vicino a lui (anello azzurro). Vale dalla
  prossima partita; resta salvata» / «Compagno nel doppio: colpisce con il tuo gesto quando la palla va a lui (anello
  azzurro). Vale dalla prossima partita; resta salvata».
- Solo mouse: un clic, nessuna conferma (non chiude la partita, non scollega niente: fuori da `needsConfirm`,
  `natpf_kiosk.js:115`); nel telecomando dello staff c'è da solo (la navigazione prende i `[data-staff]` del foglio,
  `natpf_remote.js:254`; la voce non va in `NO_REMOTE`).
- «Nuovo giocatore» e chiosco **non** la toccano (è dello stand, come le altre opzioni).
- **Spazio nel foglio** (il rischio vero): oggi i pulsanti sono 15. Il CSS (`natpf-ui.css:946-992`) dice «posto fino a 15»
  a 720 × 720 (tre colonne, cinque file: la sesta fila porta «Chiudi» fuori vista; nel B47 con 15 pulsanti e le scritte su
  due righe il foglio scorreva di 38 px prima di stringere i pulsanti) e «fino a 16» a 1024 × 600 e 1366 × 657 (quattro
  colonne); 1920 × 540 ha sei colonne (tre file con 16). Proposta: a 720 × 720 (`@container natpf (min-width: 701px) and
  (max-width: 820px) and (max-height: 760px)`) **quattro colonne** con le scritte un poco più piccole (`span` 11 px, `b`
  `clamp(13px, 2.1cqh, 16px)`), quindi quattro file (in alternativa: la voce compare solo con il formato «Doppio 2v2»
  salvato; sconsigliato: lo staff la cerca prima di scegliere il formato).
- **Sonda nel browser** (`misure/pannello-16.mjs` → `misure/pannello-16.txt`, schermate in `misure/pannello/`): gioco di oggi
  con una sedicesima voce clonata, opzioni di base e opzioni «lunghe» accese (formato in fiera «Sì · punto decisivo»,
  campo aperto, lancio automatico, chiosco, «Con i gesti»):
  | Misura | 15 voci (oggi) | 16 voci | 16 voci, 4 colonne |
  |---|---|---|---|
  | 720 × 720, opzioni di base | 5 file, fondo del foglio 633 px | 6 file, 692 px, «Chiudi» in vista | 4 file, 565 px |
  | 720 × 720, opzioni lunghe | 5 file, 677 px | **6 file, scorre di 28 px, «Chiudi» tagliato (721 > 720)** | 4 file, 605 px, tutto in vista |
  | 1024 × 600, 1366 × 657, 1280 × 720 (anche lunghe) | 4 file | 4 file, uguale | — |
  | 1920 × 540 (anche lunghe) | 3 file (6 colonne) | 3 file, uguale | — |
  Solo 720 × 720 con le opzioni lunghe si rompe; con quattro colonne le scritte restano leggibili (schermata
  `misure/pannello/stand16-4col-720x720-lunghe.png`: «Stesso schermo: campo aperto» va su due righe, il resto su una).
  Con la riga delle cadute (B45.2) non provato: da fare nella prova `natpf-pannello-cadute`.

### 3e. Telecomando, stesso schermo, webcam, sfida tra due computer
- **Telecomando dello staff**: la voce nuova è un `[data-staff]` del pannello: si raggiunge e si attiva con l'OK come le
  altre (prova `natpf-telecomando.mjs` da allargare: la voce c'è, l'OK la cambia, il foglio non scorre).
- **Stesso schermo**: il doppio non esiste (`natpf_lobby.js:226`, `:282`): niente cambia; il `title` lo dice («nel doppio
  contro la CPU»). Da controllare che `NDB.newDoubles` sia falso con `natpfSplit.active` (lo è: il formato è forzato a
  singolare, ma la funzione lo controlla lo stesso).
- **Webcam** (una persona): «argon», di base, vedi 3a: il colpo resta quello della webcam del singolo, cambia solo chi
  prende le palle del compagno; la webcam «movimento» passa dal percorso del telefono. Webcam per due: solo nello stesso
  schermo, quindi niente doppio.
- **Sfida tra due computer in doppio** («Amico + CPU»): **resta com'è oggi** (compagni con il gesto, percorso vecchio,
  `_predictBallIntercept`), per tre motivi: il 2v2 non è tra le modalità degli eventi (decisione del 04/11), servirebbe
  mandare palla del compagno e anello al computer del Player 2 con lo stato dell'host, e il Player 2 avrebbe il percorso
  vecchio. Tutte le condizioni nuove usano `NDB.newDoubles(engine)` (`isDoubles && !isMultiplayer`). Da scrivere nella
  guida. (Decisione 6.2, punto 3.)
- **Leggenda**: le regole valgono anche lì (il compagno vola 0,82 s come a Pro); il modello della Leggenda resta solo per
  la CPU di fondo (`:2771`). Non misurato nel doppio.

### 3f. Bilanciamento: obiettivi con numeri
Obiettivi per l'accettazione (banco `misure/b49-misure.mjs`, 3 semi × 150 punti, livelli Casual, Evento, Pro, profili
umano, amatore, bambino, `--fmts=singles,doubles` nello stesso giro, perché il livello Evento si adatta e i numeri
dipendono dall'ordine delle partite simulate):
1. **Colpo come nel singolo**: esito B15 nel 100% dei colpi di chi gioca; distanza laterale p50 0,70–0,80 m;
   `v-doubles-dopo.mjs`: stessi x e z del singolo (±0,02 m) per tutti i lead.
2. **Vincenti come nel singolo**: vincenti sui punti vinti nel doppio ≥ 0,8 × singolo per ogni livello e profilo (oggi
   0,28–0,56 ×).
3. **Il compagno fa una quota ragionevole**: 8–20% dei colpi della squadra; suoi errori ≤ 6% dei suoi colpi; punti chiusi
   dal suo colpo (vinti + persi) ≤ 6% dei punti.
4. **Né più facile né più difficile di troppo**: punti vinti nel doppio entro **±8 punti** dal singolo per ogni livello e
   profilo.
5. **Niente scambi infiniti**: 0% di punti chiusi d'ufficio a 60 colpi (oggi 8,5–15,2%); scambio medio ≤ 1,4 × singolo.
6. **Chi non fa il gesto sulle palle del compagno non perde**: con «Gioca da solo», `doubles` e `doubles-noswing` uguali
   (il gesto su quelle palle non conta).

Prima (`misure/base/b49-misure-sd.txt`, codice di oggi) e dopo (`misure/proto-finale.txt`, prototipo con regola 0,5 m e
pressione sullo scambio di chi gioca) con lo stesso comando:

| Livello · profilo | Singolo: vinti / vincenti | Doppio oggi: vinti / vincenti / compagno / scambio / ≥60 | Doppio prototipo: vinti / vincenti / compagno / scambio / ≥60 |
|---|---|---|---|
| casual · umano | 88,2 / 54,7 | 72,8 / 16,4 / 10,3 / 27,9 / 10,4 | **89,1 / 56,1 / 15,9 / 11,6 / 0** |
| casual · amatore | 84,0 / 47,6 | 74,0 / 13,4 / 11,0 / 26,5 / 8,5 | **81,8 / 55,4 / 14,8 / 10,7 / 0** |
| casual · bambino | 50,9 / 26,6 | 40,2 / 13,3 / 8,7 / 16,7 / 0 | **45,8 / 41,3 / 15,7 / 8,7 / 0** |
| evento · umano | 68,7 / 56,0 | 62,0 / 16,6 / 10,1 / 29,3 / 12,1 | **66,2 / 60,7 / 14,1 / 16,3 / 0** |
| evento · amatore | 64,9–65,1 / 53,8–59,4 | 63,3 / 19,4 / 9,6 / 29,3 / 11,5 | **64,9 / 58,6 / 11,8 / 13,0 / 0** |
| evento · bambino | 49,6–49,8 / 25,9–26,9 | 38,9 / 10,3 / 8,6 / 16,6 / 0,4 | **43,6 / 37,2 / 14,5 / 8,4 / 0** |
| pro · umano | 61,8 / 70,9 | 42,1 / 28,3 / 7,2 / 29,8 / 15,2 | **53,8 / 65,3 / 13,9 / 18,2 / 0** |
| pro · amatore | 51,1 / 74,8 | 41,7 / 25,2 / 7,6 / 31,1 / 14,4 | **51,1 / 69,6 / 13,1 / 14,3 / 0** |
| pro · bambino | 17,1 / 41,6 | 18,0 / 23,5 / 9,4 / 14,9 / 0,4 | **16,4 / 48,6 / 9,8 / 8,3 / 0** |

(Le due cifre del singolo a Evento sono dei due giri: il livello si adatta e risente delle partite simulate prima.)
Obiettivi col prototipo: 1 sì (100%, 0,76–0,77 m, stesso colpo); 2 sì (0,92–1,55 ×); 3 sì (9,8–15,9%; errori 2,1–4,0%;
punti chiusi 1,3–4,7%); 4 sì, al limite a pro · umano (−8,0), poi evento · bambino (−6,2) e casual · bambino (−5,1); 5 sì
(0%; scambio medio 1,05–1,33 × singolo); 6 sì (`misure/proto-noswing.txt`: righe `doubles` e `doubles-noswing`
identiche a casual e pro × umano e amatore; il banco fa solo 2–3 gesti sulle palle del compagno ogni 450 punti, perché il
suo tempo è quello del proprio punto d'impatto: il controllo vero resta il test di unità 4 e la prova nel browser 3).
Senza la correzione della pressione (solo regola e colpo, `misure/proto-r05.txt`) pro · umano −14,5 e pro · amatore −8,2:
fuori dall'obiettivo 4. Leva provata e scartata: il compagno della CPU di Pro come quello di Casual (portata 0,85 m invece di
1,3 e solo il 55% delle volte, `game_engine.js:3306-3320`): pro · umano 48,7%, amatore 46,9%, bambino 13,1%
(`misure/proto-r05-cpupro-casual.txt`), poco effetto e peggio per il bambino. A Pro il compagno della CPU fa il 50% dei colpi
della sua squadra (31–34% a Casual ed Evento) ma i tuoi errori in rete arrivano tanto dopo il suo colpo quanto dopo quello
della CPU di fondo (50 e 52, `misure/proto-cpu-compagno.txt`): la causa era la pressione, non lui.
«Con il tuo gesto» col prototipo (`misure/proto-gesto-giusto.txt`, gesto fatto per il compagno 0,05 s ± 0,05 prima del
punto previsto): punti vinti 68–90%, compagno 11–16%, ma i punti chiusi dalla sua volée vinti salgono al 5–11% (volée
del percorso vecchio, veloce): accettabile per un'opzione che rimette il comportamento di prima. Se chi gioca fa il
gesto con il tempo del proprio punto d'impatto (`misure/proto-gesto.txt`), il compagno non prende quasi niente (1,5–2,1%)
e i colpi a vuoto sono 25 su 100 gesti: con quell'opzione l'anello serve a dire **quando** fare il gesto.

## 4. Passi per lo sviluppatore (file:riga, test, prove, accettazione)

Ramo nuovo da `natpf-simulator` (es. `b49-doppio`), dopo l'unione di B48 (tocca `game_engine.js` nelle stesse funzioni:
`_handleUserSwingInput`, `_attemptPlayerRallyStrike`; le righe qui sono di `b0c8356`, cercare il testo citato). Ogni passo:
test del gioco e del sito verdi, commit, documenti (CLAUDE.md). Test nuovi scritti **prima** del codice (devono fallire sul
codice di oggi: per ciascuno è detto perché).

### B49.1 · Modulo `natpf-tennis/src/natpf/natpf_doubles.js` (funzioni pure) e suoi test
- Contenuto (modello: `misure/prototipo-natpf_doubles.js` + lo stile di `natpf_battuta.js`):
  - opzione: `PARTNER_KEY = 'natpf-tennis.compagno'`, `PARTNER_MODES = ['solo', 'gesto']`, `PARTNER_DEFAULT = 'solo'`,
    `partnerModeOf`, `nextPartnerMode`, `partnerModeFromUrl` (`?compagno=solo|da-solo|gesto`), `readPartnerMode({ search,
    storage })`, `writePartnerMode`, `partnerForcedByUrl`, `PARTNER_LABEL = { solo: 'Gioca da solo', gesto: 'Con il tuo
    gesto' }`, `partnerButton(m, forced)` (« (indirizzo)» come `serveRuleButton`), `partnerToast(m, forced)`,
    `PARTNER_TITLE` (testo della 3d);
  - regole: `PARTNER` (home `{ x: 1.4, z: 5.1 }`, own `{ reach: .5, yMin: .6, yMax: 1.7, zMin: 2.2, zBack: .8 }`, side .55,
    shot, err, reach 1.2, quality .75, power .5), `partnerTuning` (solo banco), `newDoubles(engine)` (= `isDoubles &&
    !isMultiplayer && !natpfSplit?.active`), `partnerAuto(engine)` (+ `engine.natpfPartner === 'solo'` e non nella
    dimostrazione), `partnerHome(engine)`, `partnerBallPlan(engine)`, `partnerBallNow(engine)`, `partnerShot({ difficulty,
    stretch, speed, running, oppX, rng })`, `exchangeStrokes(engine)` (`2 × natpfOwnStrokes + (score.server === 'player' ?
    2 : 1)`);
  - testi: `partnerLine(mode)` (nota della pagina «Partita»), `partnerFirstHint(mode)` (riga in partita).
- Test nuovo `natpf-tennis/test/natpf-b49-doppio.test.mjs` (fallisce oggi: il modulo non c'è):
  1. opzione: valore di base `solo`; `next` alterna; `write`/`read` con un archivio finto; `?compagno=gesto` comanda e
     `partnerButton(…, true)` dice «(indirizzo)»; valori sconosciuti → `solo`.
  2. `partnerHome`: `x = -1.4` con `deuceSide` vero, `+1.4` con falso, `z = 5.1`.
  3. `partnerBallPlan` con il motore senza disegno (`scripts/audit/headless-engine.mjs`) e palle lanciate con
     `_launchBallToTarget` dalla CPU: passa a 0,3 m dalla posizione d'attesa a 1,0–1,4 m d'altezza → piano con `stroke`,
     `t > 0`, `contact` entro 0,5 m; passa a 0,8 m → `null`; pallonetto sopra 1,95 m → `null`; `rallyStrokeCount = 1`
     (risposta al servizio) → `null`; `lastHitter = 'player'` → `null`; rimbalzo prima di 2,2 m → `null`.
  4. `partnerShot` con `rng` fisso: colpo buono con `z` in [−8,4; −5,8] e `x` dal lato opposto a `oppX`; `rng` che forza
     l'errore → `kind` in `net | wide | long` e, per `net`, `net: true`; probabilità d'errore che cresce con `stretch`
     (0 → 1,2) e resta ≤ 0,3.
  5. `exchangeStrokes`: 0 colpi propri → 1 (ha battuto la CPU) o 2 (ha battuto chi gioca); 5 colpi propri con 30 colpi
     nello scambio → 11 o 12; nel singolo uguale a `rallyStrokeCount` al colpo di chi gioca (controllo con il banco).
  6. testi in italiano, senza «2v2» (sigla) nel testo per il visitatore, ≤ 120 caratteri.

### B49.2 · Motore: colpo e posizionamento del singolo, compagno che gioca da solo
File e righe (`b0c8356`):
- `game_engine.js:48` import `* as NDB from "./natpf/natpf_doubles.js"`.
- `startNewMatch` (`:1259`, accanto a `natpfHot`): `this.natpfPartner = typeof this.natpfPartnerRule == "string" ?
  NDB.partnerModeOf(this.natpfPartnerRule) : NDB.readPartnerMode()`; a ogni punto (`:1346`, accanto a
  `rallyStrokeCount = 0`): `this.natpfOwnStrokes = 0`, `this.natpfPartnerBall = null`, `this.natpfTeamHit = null`.
- `_handleUserSwingInput` (`:1603-1636`): come nel prototipo (`misure/prototipo.diff`, primo blocco): palla del compagno e
  «Gioca da solo» → `return` (contatore e diagnostica); condizione della finestra d'impatto `(!this.isDoubles ||
  (NDB.newDoubles(this) && !mateBall))`; nel percorso vecchio `h` dalla regola (`:1616-1621`).
- `_argonWebcamSwing` (`:1683-1694`): stessa cosa per la webcam «argon».
- `_attemptPlayerRallyStrike` (`:2062`): `l` come nel prototipo (solo «Con il tuo gesto» e palla del compagno nel doppio
  contro la CPU; la geometria resta per la sfida tra due computer); a fine colpo (`:2334-2342`): `natpfTeamHit`,
  `natpfTeamHitAt`, `natpfTeamHitGesture`, `natpfPartnerBall = null`, `natpfOwnStrokes++` (solo colpo di chi gioca);
  `NI.recoverAfterShot` con `racketShot && !l && (!this.isDoubles || NDB.newDoubles(this))`; compagno a
  `NDB.partnerHome(this)` nel doppio contro la CPU.
- `_natpfRacketShot` (`:2380`): `stretch` anche per chi gioca nel doppio contro la CPU; (`:2391`, `:2394`) nel doppio contro
  la CPU e per `p === this.player` `NO.rallyPressure(NDB.exchangeStrokes(this), …)` e `NH.hotPressure(NDB.exchangeStrokes(this)
  + 1, …)`.
- `_executePartnerReturn(pb)` nuovo, prima di `_natpfPlanPlayer` (`:2857`): come nel prototipo, più animazione dello
  swing (`racketKinematics.triggerSwing`, `facialFX`), suono, `natpfStats` che **non** lo conta come colpo di chi gioca.
- `_natpfPlanPlayer` (`:2858-2860`): come nel prototipo (regola, compagno al punto della volée, chi gioca a coprire il fondo,
  `natpfPlan = null`; altrimenti `NI.planPlayerIntercept` e compagno a casa); alla prima palla del compagno della partita
  (`natpfPartnerHintSeq !== natpfMatchSeq`) la riga di B49.4, insieme all'anello.
- `_natpfReplanMissed` (`:2870`): `if ((this.isDoubles && (!NDB.newDoubles(this) || NDB.partnerBallNow(this))) || …) return;`.
- ciclo dello scambio (`:3349-3410`): `h` dalla regola; prima della risoluzione dello swing in attesa, colpo del compagno
  quando arriva la palla (o palla restituita a chi gioca se è a più di 1,5 m dal punto previsto).
- `natpf_movement.js:43`: via `engine.isDoubles` (resta `engine.isMultiplayer`); commento in testa (`:21-24`) aggiornato.
- `natpf_skill.js:428-434`: `who === 'partner'` non tocca `streak`; `dropHabit` solo per `who === 'player'`.
- `diag_recorder.js:307`: il piano del giocatore si registra anche nel doppio contro la CPU (`!E.isDoubles` → `!E.isDoubles
  || NDB.newDoubles(E)`), più un evento `doppio.compagno` (palla sua: `t`, `contact`; colpo: `kind`, `chance`).
- `scripts/audit/rally-balance.mjs`: nessun cambio necessario (il banco chiama `_handleUserSwingInput` e funziona anche col
  doppio); aggiungere **`scripts/audit/doppio.mjs`** = `misure/b49-misure.mjs` ripulito (e `npm run audit:doppio`), così
  le misure di accettazione si rifanno da chiunque.

Test nuovi `natpf-tennis/test/natpf-b49-doppio-motore.test.mjs` (motore senza disegno; tra parentesi perché oggi fallisce):
1. stesso gesto sulla stessa palla di chi gioca, singolo contro doppio con la CPU: stesso `ball.targetLanding` (±0,02 m) e
   `natpfLastRacket` nuovo in tutti e due (oggi nel doppio `racketShot` è nullo: niente `natpfLastRacket`, profondità a caso);
2. nel doppio, palla di chi gioca: `natpfPlan` presente e `|player.targetPos.x − contact.x|` tra 0,6 e 0,85 m (oggi 0,38);
3. palla del compagno: dopo il colpo della CPU `natpfPartnerBall` presente, compagno diretto al punto della volée, chi gioca
   verso il fondo; facendo andare il motore fino a `at + t`, `lastHitter === 'player'`, `natpfTeamHit === 'partner'`, palla
   verso la metà della CPU (`targetLanding.z < 0`) (oggi il compagno non colpisce mai da solo e il punto è perso);
4. «Gioca da solo», gesto sulla palla del compagno: nessuno swing in attesa, nessuna scritta «WHIFF», il compagno colpisce
   lo stesso (oggi il gesto fa colpire il compagno con le regole vecchie);
5. «Con il tuo gesto» (`natpfPartnerRule = 'gesto'`): senza gesto il compagno non colpisce e il punto va alla CPU (doppio
   rimbalzo o palla passata);
   con il gesto all'arrivo della palla colpisce lui (`natpfTeamHitGesture`) (oggi: la scelta è geometrica, non dalla regola);
6. risposta al servizio della CPU: mai del compagno, anche se gli passa vicino;
7. pressione: con 30 colpi nello scambio e 5 colpi propri, `natpfLastRacket.pressure` nel doppio uguale a quella del singolo
   con 11–12 colpi (oggi conta 30);
8. `NS.registerPlayerShot(e, { …, who: 'partner' })` non azzera `streak` (oggi sì);
9. sfida tra due computer in doppio (`isMultiplayer = true`): `_natpfPlanPlayer` come oggi (`_predictBallIntercept`:
   0,38 m di lato) e compagno con il gesto per geometria (passa prima e dopo: protegge quello che non deve cambiare);
10. palla che devia (spostata di 2 m prima del punto previsto): la palla torna a chi gioca e il piano si rifà;
11. singolo invariato: `simulate()` del banco con `--fmts=singles`, stessi numeri prima e dopo (righe identiche).

Test da aggiornare:
- `test/natpf-b32-movimento.test.mjs:85`: `off('doppio', …)` diventa `off('doppio tra due computer', () => { e.isDoubles =
  true; e.isMultiplayer = true; }, …)` più un controllo nuovo: doppio contro la CPU → `R`.
- `test/natpf-voce-smash.test.mjs:104-130`: i casi «il compagno è più vicino alla palla: il colpo è suo» valgono con «Con il
  tuo gesto» e palla del compagno: nel `withEngine` doppio impostare `e.natpfPartner = 'gesto'` e
  `e.natpfPartnerBall = { stroke: e.ball.rallyStrokeCount, at: e.elapsedTime, t: 0, contact: … }` (helper `mateBall(e)`)
  prima di `_attemptPlayerRallyStrike`; i casi con la palla a chi gioca restano.
- Lista completa da `misure/proto-test.txt` (suite del gioco sul prototipo, sezione 5.1).

Accettazione B49.2: suite del gioco verde; `npm run audit:doppio` (o `misure/b49-misure.mjs --wt=…`) dentro gli obiettivi
1, 2, 3, 4, 5, 6 della 3f (tabella da rifare e scrivere nel registro); `npm run audit:legend` uguale a prima (il singolo
non cambia); `v-doubles-dopo.mjs`: righe del doppio uguali a quelle del singolo.

### B49.3 · Anello sotto il compagno
- `natpf-tennis/src/natpf/natpf_partner_ring.js` (nuovo): funzione pura `partnerRingState(engine, t)` → `{ visible, x, z,
  scale, opacity }` e classe `NatpfPartnerRing` (una mesh, 3c). `natpf_ui.js:107` crea, `:264` aggiorna.
- Test `natpf-b49-doppio.test.mjs` (aggiunta): stato visibile solo con `partnerBallNow` vero, nel doppio contro la CPU, non
  nella moviola né nella dimostrazione né con il menu; posizione = piedi del compagno; scala da 0,6 a 1 nei primi 0,12 s;
  opacità tra 0,65 e 0,95 (oggi: il modulo non c'è).
- Browser (sezione 5.2): anello in vista nella schermata del doppio a 1280 × 720, 1920 × 1080, 720 × 720 e 1024 × 600, in
  terza e in prima persona; nessun calo dei fotogrammi misurabile (stesso `renderer.info.render.calls` + 1).

### B49.4 · Riga prima della partita e in partita
- `natpf_lobby.js:611-617`: con `this.format === 'doubles' && this.mode === 'cpu'` la nota è `NDB.partnerLine(mode)` (dopo la
  riga degli scambi di prova, se c'è: le due righe insieme non devono superare due righe a 720 × 720).
- Riga in partita: `_natpfPlanPlayer` (quando la palla diventa del compagno, cioè quando compare l'anello) chiama
  `this.natpfUi?.toast?.(NDB.partnerFirstHint(mode), toastMs(…))` alla prima palla del compagno di ogni partita
  (`natpfPartnerHintSeq` contro `natpfMatchSeq`), con tutte e due le opzioni.
- Test: `test/natpf-flows.test.mjs` (accanto a `:527`): nota con il doppio contro la CPU, niente nota con la sfida tra due
  computer e nello stesso schermo; motore: una sola riga per partita, di nuovo nella partita dopo.

### B49.5 · Opzione del pannello dello stand
- `natpf-tennis/index.html:236-251`: pulsante `data-staff="partner"` con `title` (3d) dopo «Stesso schermo: campo aperto»;
  commento nel blocco (`:228-235`).
- `natpf_kiosk.js`: import dal modulo; `run('partner')` e `paint()` (3d); commento in testa (`:14-26`).
- `natpf-ui.css:980-992`: quattro colonne a 720 × 720 (3d; la sonda `misure/pannello-16.mjs` lo conferma: con tre colonne e
  le opzioni lunghe il foglio scorre di 28 px e «Chiudi» è tagliato).
- Test: `test/natpf-b49-doppio.test.mjs` (aggiunta, come `natpf-b47-battuta.test.mjs:152`): l'HTML ha il pulsante con
  «Doppio: compagno» e «Gioca da solo» e il `title`; un `NatpfKiosk` con DOM finto (come `natpf-b47-battuta.test.mjs`)
  alterna e salva il valore, scrive l'avviso e la riga di diagnostica; `needsConfirm('partner')` falso.
- Guida: `docs/GUIDA_STAND.md` (tabella del pannello, Formato `:199`), `docs/GUIDA_TELECOMANDO.md` se elenca le voci.

### B49.6 · Prove nel browser, misure, documenti, versione
- Prove della sezione 5.2; misure della 3f rifatte e scritte in `docs/WORK_PROGRESS.md`; `docs/PROJECT_MEMORY.md`
  (decisione: compagno che gioca da solo, regola dei 0,5 m, opzione); `docs/b16/rapporto-gameplay.md` difetto 15 segnato
  «risolto nel B49» con i numeri; `docs/TRACCIA_PASSI.md`; versione nuova (`site/js/tennis/version.js`,
  `site/tennis/build.json`) e pacchetti come da `docs/PIANO_LAVORI.md` §6.

## 5. Prove

### 5.1 Test di unità (gioco: `node --import ./test/register.mjs --test test/<file>` in `natpf-tennis`)
- Nuovi: `test/natpf-b49-doppio.test.mjs` (B49.1, B49.3, B49.5) e `test/natpf-b49-doppio-motore.test.mjs` (B49.2, B49.4):
  elenco dei casi nella sezione 4, ognuno scritto prima del codice.
- Da aggiornare: `natpf-b32-movimento.test.mjs:85`, `natpf-voce-smash.test.mjs:104-130`, più quelli che la suite completa
  segnala (prototipo: vedi «Suite sul prototipo» qui sotto).
- Da tenere verdi senza cambiarli: `natpf-integration.test.mjs:19-20` (formato), `natpf-flows.test.mjs:527`,
  `natpf-lobby.test.mjs:179`, `natpf-scoreboard*.test.mjs`, `natpf-fine-partita.test.mjs`, `natpf-b47-battuta.test.mjs`
  (pannello), `natpf-telecomando.test.mjs`.
- Sito, Windows, LAN: non toccati (la pagina del telefono non cambia); le suite si fanno lo stesso come da CLAUDE.md.

Suite sul prototipo (`misure/proto-test.txt`, 7 min 40 s con load average 5–13): **1619 su 1623**, 3 rosse:
`natpf-b32-movimento.test.mjs:79` (atteso: il doppio contro la CPU ora ha il movimento B32), `natpf-voce-smash.test.mjs:105`
(atteso: con «Gioca da solo» il gesto non fa colpire il compagno; il test va fatto con «Con il tuo gesto» e la palla del
compagno), `registro-worker.test.mjs:62` (tempo < 20 ms superato sotto carico: 31,6 ms; rifatto da solo: 21/21 verdi,
non legato al doppio). Il prototipo non ha anello, riga, opzione e test nuovi: la suite vera crescerà.

### 5.2 Prove nel browser (cartella `tools/e2e`)
Esistenti da far girare e, dove detto, aggiornare:
- `natpf-scritte-2v2.mjs`: il caso «colpo del compagno a rete» (righe 243-275) si aspetta che **il gesto** faccia colpire il
  compagno e la scritta «compagno». Con «Gioca da solo» (di base) il gesto su quella palla non conta e il compagno colpisce
  senza scritta: il caso va fatto con `?compagno=gesto` (comportamento di prima, stessa verifica della scritta) e va
  aggiunto il caso «Gioca da solo» (nessuna scritta «compagno» e nessun «WHIFF», palla ripresa dal compagno, anello in
  vista). Il colpo da fondo nel doppio deve dare una scritta come nel singolo.
- `natpf-tabellone.mjs:156-162` (sigle del doppio): invariata.
- `natpf-menu.mjs` (pannello con 16 voci a 1366×657, 1024×600, 1280×720, 1024×1024, 720×720: niente scorrimento, «Chiudi»
  in vista), `natpf-pannello-cadute.mjs` (con la riga delle cadute), `natpf-solo-mouse.mjs` (riga di spiegazione della voce
  nuova sotto il puntatore), `natpf-telecomando.mjs` (la voce si raggiunge e l'OK la cambia), `natpf-pannello-partita.mjs`
  (pannello aperto in partita: la voce non chiede conferma).
- Le prove della partita contro la CPU che passano dal doppio solo per sbaglio: nessuna trovata (`grep doubles|doppio|2v2`
  in `tools/e2e`: solo `natpf-scritte-2v2`, `natpf-tabellone` e testi sul «doppio clic»).
Nuova: `tools/e2e/natpf-doppio.mjs` (gioco vero con vite, come `natpf-scritte-2v2.mjs`: `testInput` e mouse, o il telefono
simulato di `phone-sim`), a 1280×720, 1920×1080, 720×720 e 1024×600:
1. «Partita» con il doppio contro la CPU: la nota dice la regola (testo di `partnerLine`), su al massimo due righe;
2. palla lanciata dalla CPU verso il compagno: anello in vista sotto i suoi piedi (proiezione della mesh entro 20 px dai
   piedi proiettati), il compagno colpisce **senza gesti**, poi l'anello sparisce; riga «Palla del compagno: gioca lui» una
   volta;
3. gesto durante la palla del compagno: nessuna scritta «WHIFF»/«Troppo tardi», nessuno swing in attesa;
4. palla di chi gioca: scritta dell'esito come nel singolo (verde/giallo/rosso, nome del colpo), colpo super possibile
   (`natpfLastRacket.super` con un gesto fortissimo sulla palla alta, come nelle prove del super del singolo);
5. pannello dello stand: «Doppio: compagno · Gioca da solo» → clic → «Con il tuo gesto», salvato, avviso; con «Con il tuo
   gesto» nella partita dopo il compagno non colpisce senza gesto e colpisce con il gesto all'arrivo della palla;
6. nessun errore JavaScript; tempo del fotogramma (media su 300 fotogrammi) entro +5% rispetto alla stessa scena senza
   anello.
Carico: le prove nel browser vanno fatte con la macchina scarica o ripetute (le prove sotto carico del B45.2 sono state
rese robuste per questo motivo); scrivere `uptime` accanto ai risultati.

### 5.3 Misure prima/dopo (stessi script, stesso comando)
- `misure/b49-misure.mjs --fmts=singles,doubles` (e `doubles-noswing`) → `scripts/audit/doppio.mjs`: tutti gli obiettivi della
  3f. Prima: `misure/base/b49-misure-sd.txt` e `misure/base/b49-misure.txt`. Dopo (prototipo): `misure/proto-finale.txt`.
- `misure/v-doubles-dopo.mjs`: righe del doppio identiche a quelle del singolo (prima: `misure/base/v-doubles.txt`).
- `misure/doubles-check.mjs`: laterale p50 0,70–0,80 m, esito B15 100% (prima: `misure/base/doubles-check.txt`).
- `misure/v-doppio.mjs` e `misure/doppio.mjs` (script del D15): **dopo il B49 contano male** il compagno (il primo lo conta
  dalla scritta «compagno», che col compagno autonomo non c'è; il secondo con una regola geometrica): servono solo per il
  confronto con il D15; per l'accettazione vale `b49-misure.mjs` (che legge `natpfTeamHit`).
- `npm run audit:legend` e `npm run audit:rally` (singolo): invariati. Controllo del prototipo: righe del singolo identiche
  tra prima e dopo con `--fmts=singles` (9 righe su 9 identiche: `misure/base/singolo-solo.txt` e
  `misure/proto-singolo-solo.txt`); `audit:legend` non rifatto (il singolo non cambia).
- Attenzione: il livello Evento si adatta durante il giro e i suoi numeri cambiano con l'ordine delle partite simulate;
  confrontare sempre lo stesso comando (stessi `--levels`, `--profiles`, `--fmts`, `--seeds`).

### 5.4 Schermate da guardare (a occhio, prima della consegna)
- anello sotto il compagno: 1280×720, 1920×1080, 720×720, 1024×600; terza e prima persona; personaggi «Classici» e
  «Lob & Drop» (l'anello non deve sparire sotto un personaggio più largo né confondersi con il riquadro giallo del servizio);
- nota della pagina «Partita» con il doppio, a 720×720 e 1024×600 (con «Altre impostazioni» aperte e chiuse);
- riga in partita «Palla del compagno: gioca lui» a 720×720 e 1024×600 (non copre tabellone, barre, scritta dell'esito);
- pannello dello stand con la voce nuova a 720×720 e 1024×600, con le opzioni lunghe accese e con la riga di spiegazione
  della voce sotto il puntatore; telecomando dello staff con la voce a fuoco.

## 6. Rischi e domande aperte

### 6.1 Rischi
1. **Conflitti con B48** (servizio, difetto 16) e con B41.3/B40 (fine partita): stesse funzioni di `game_engine.js`
   (`_handleUserSwingInput`, `_attemptPlayerRallyStrike`, `startNewMatch`). Fare B49 dopo l'unione di B48 e cercare le righe
   con il testo; rifare le misure di base sul codice unito prima di cambiare.
2. **Pannello dello stand a 720 × 720**: con 16 voci serve una fila in più o quattro colonne; «Chiudi» non deve finire fuori
   vista (prova `natpf-menu`). Sonda nel browser (3d): con 16 voci e le opzioni lunghe a 720 × 720 il foglio scorre di
   28 px e «Chiudi» è tagliato; con quattro colonne sta tutto (fondo a 605 px su 720). Le altre misure non cambiano.
3. **Quota del compagno legata ai colpi della CPU**: la CPU mira a chi gioca e ignora il compagno (`NS.cpuShotChoice`); se un
   blocco futuro cambia le scelte della CPU, la quota cambia (rifare `audit:doppio`). Una CPU che evita il compagno a rete
   sarebbe più realistica ma è fuori da B49.
4. **Persone vere non provate**: il banco fa quasi mai il gesto sulle palle del compagno con «Gioca da solo» (2–3 ogni 450
   punti: il suo tempo è quello del proprio punto d'impatto); che il gesto su quelle palle sia davvero ignorato lo dicono
   soprattutto il test 4 (motore) e la prova 3 (browser). Telefono vero, ledwall e webcam nel doppio: non provati.
5. **«Con il tuo gesto» più severo di oggi**: con la regola dei 0,5 m il compagno ha meno palle che con la geometria di oggi,
   e un gesto fatto con il tempo del proprio punto d'impatto va a vuoto (25 su 100 nel banco, `misure/proto-gesto.txt`).
   L'anello dice quando farlo; è l'opzione «di prima», di riserva.
6. **Scambio caldo e pressione**: con la correzione della 3a la pressione di chi gioca segue il suo scambio, mentre la
   scritta «Scambio caldo» e gli effetti sulla CPU restano sul conto di tutti i colpi (arrivano prima, in colpi di chi gioca,
   che nel singolo). Coerente con «scambio» = colpi di tutti; da guardare nelle schermate.
7. **Statistiche e trofei (B40)**: il colpo del compagno non deve contare come colpo di chi gioca (scambio più lungo,
   colpi, km/h): `natpfStats.shot` lo esclude; i trofei del B40 (fatto prima del B49) devono leggere `natpfTeamHit` o
   restare sui colpi di chi gioca. Il registro di gioco (B30) può annotare `compagno: n colpi` per partita.
8. **Sfida tra due computer in doppio** resta con le regole vecchie: due doppi diversi nello stesso gioco (da scrivere nella
   guida e nella spiegazione della voce).
9. **Prestazioni**: `predictBall` una volta per colpo della CPU (al più 336 passi, già fatto oggi nel singolo per il piano),
   una mesh in più: niente di misurabile atteso, ma la misura del fotogramma è nella prova 5.2.6.
10. **Livello Evento adattivo**: i numeri del banco a Evento cambiano con l'ordine delle simulazioni (vedi 5.3).
11. **Modalità fiera (B41 seconda parte, ramo `b41-fiera-2`, non ancora unita)**: la sua pagina sceglie il livello e parte;
    controllare dopo l'unione se usa il formato salvato (allora un doppio lasciato dallo staff arriverebbe anche in fiera)
    o forza il singolare; se il doppio è possibile, la riga della 3c va anche lì.

### 6.2 Decisioni da prendere (con la proposta dell'analista)
1. **Portata della regola**: 0,5 m (compagno 9,8–15,9% dei colpi della squadra, misurato col prototipo). Più presente:
   0,6 m (stima 17–21% delle palle della CPU). **Proposta: 0,5 m.** Posizione d'attesa: **±1,4 m** (con ±2,05 il compagno
   chiude fino all'8,4% dei punti, 3c).
2. **Pannello a 720 × 720**: quattro colonne con scritte un poco più piccole, oppure la voce solo con il formato «Doppio
   2v2» salvato. **Proposta: quattro colonne** (la sonda lo conferma: 3d); da ripetere con la riga delle cadute.
3. **Sfida tra due computer in doppio**: lasciarla com'è (proposta) o dare il compagno autonomo anche lì (stato del compagno
   e anello nello snapshot dell'host, regola anche per il compagno del Player 2). **Proposta: com'è**, il 2v2 non è tra le
   modalità degli eventi.
4. **Pressione degli scambi lunghi nel doppio sullo scambio di chi gioca**: **proposta sì** (senza, a Pro il doppio è 8–15
   punti più difficile del singolo: `misure/proto-r05.txt`).
5. **Gesto sulla palla del compagno con «Gioca da solo»**: ignorato in silenzio più la riga «Palla del compagno: gioca lui»
   una volta per partita (proposta), oppure una scritta a ogni gesto (rumore sul ledwall).
6. **Formato salvato per tutti i visitatori**: oggi un doppio scelto dallo staff resta per tutti (nemmeno il chiosco lo
   rimette). Va bene per lo stand (lo decide lo staff). **Proposta: lasciare così** e dirlo nella guida.
7. **Colpo del compagno a fine partita** (card del B40): **proposta: non mostrarlo** (la card è di chi gioca); se si vuole,
   una riga «Il compagno: N volée».
