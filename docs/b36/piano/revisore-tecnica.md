# B36 · Revisione tecnica della bozza (riconoscimento, regressioni, misure)

**Cosa ho guardato.** La bozza `piano/bozza.md`, le cinque letture e i tre piani di `docs/b36/analisi/`, i documenti di
B37 (`collaudo-13-11-bis.md`) e B42 (`scambi-lunghi.md`), il codice della 13.9 (worktree di riferimento `a2ef49e`) e i rami
B37 (`2bfe09a`) e B42 (`ae76bdf`) in sola lettura. Nessun file del repository toccato, nessun commit.

**Cosa ho eseguito** (sola lettura, `nice -n 10`, niente browser). Script e uscite in
`docs/b36/piano/revisore-tecnica/`:
- `curva.mjs` → `curva.txt`: curva della bozza contro oggi da 0° a 70°, salto per grado, chi gira «tanto»;
- `salto-10ms.mjs` → `salto-10ms.txt`: salto per 10 ms a 18, 25, 30 e 35 m/s;
- `angolo-corto.mjs` → `angolo-corto.txt`: angolo corto non voluto con il rumore vero della forza;
- prototipi della bozza rifatti: `rifatto-tappa1.txt`, `rifatto-tappa1-aria.txt`, `rifatto-tappa1-minima.txt`,
  `rifatto-tappa1-g15.txt`; `aria.mjs` della bozza (rapporto 0,849 / 0,86 / 0,913: confermato);
- `colpi.mjs --mode=banco --quick --hand=right` sul codice vero → `colpi-banco.txt`.

Le funzioni «bozza» dei miei script sono quelle del prototipo della bozza (`piano-prove/mappa-lib.mjs`): misuro la regola
come l'ha scritta l'autore, non una mia versione.

---

## 1. In breve

La direzione proposta (cima del telefono al comando, tempo come ritocco, fascia sicura, deriva continua oltre la finestra)
è sana e i riferimenti al codice della 13.9 sono quasi tutti giusti. Ma la bozza **non si può ancora misurare** e in tre
punti **contraddice sé stessa**:

1. con la sua regola «senza `aimDev` la regola di oggi», **tutti i banchi dell'equilibrio** (`audit:legend`, B42, Evento,
   stesso schermo, rete, movimento) restano sulla regola di oggi anche con «Nuova»: i giocatori simulati non mandano
   `aimDev`;
2. i numeri e l'avviso della **B36.1** vengono da una variante diversa da quella descritta: con la regola descritta la
   Leggenda in corsa diventa **più dura** (fuori 15 → 23%), non più facile, e il criterio «0% fuori» della tappa cade;
3. la formula ha una **scogliera di 4 m in un grado a 60°** (criterio 4: ≤ 0,35 m per grado) e un **altopiano sulla
   riga** da 25° a 60°: chi gira «tanto» manda il 58% delle palle sulla riga, sempre dentro.

Poi ci sono sei punti importanti (centro fermo, regole miste, P2 su due computer, mezzi della B36.2, angolo corto, palle
veloci) e qualche dettaglio. Tutti hanno una correzione semplice. Proposta in fondo: una **tappa B36.0 «strumenti»**
prima di ogni modifica al gioco.

---

## 2. Cosa ho verificato e regge

- Formula di oggi: `aim = −c·0,1·(1−|aimT|) − c·aimT·1 + face` (`natpf_stroke_outcome.js:355`), `natural` 0,1 (:24),
  `timingAim` e `faceAim` 1 (:27, :36), punto neutro al 40% (:45, :285), tenuta che sparisce in 0,25 unità (:59, :338).
- Curva del piatto: piena a P, calo da 45° a 60° (`natpf_stroke_intent.js:53, :63, :196-201`).
- `assistOf`: Bambini (`assistWindow` 0,34) ed Evento (0,3 a tutti e due gli estremi, `natpf_skill.js:142`) usano la riga
  Casual (assistQ 0,5): giusto.
- Tra 13.8 e 13.9 l'unico file della direzione che cambia è `game_engine.js` (`git diff --stat 6159b7e a2ef49e`).
- Aria: il rimbalzo vero fa 0,85–0,91 dello spostamento laterale voluto, mediana 0,86 (`aria.mjs` rifatto); `fixAir`
  corregge solo z (`natpf_skill.js:883`), il servizio anche x (:903-919).
- Tolleranza dell'arbitro +0,22 m di lato (`game_engine.js:3191`); il banco B35a giudica sul bersaglio
  (`direzione-telefono.mjs:104`).
- Banco B35a: 73% e 49%, serie 12/9/7 su 14 (uscita della bozza `direzione-1-2.txt`, letta).
- Super legato al tempo (`natpf_stroke_outcome.js:467`), finestra in ritardo 1,4/|vz| (:476), intenti ricostruiti
  (:506-516), `relayedNatpf` passa tutto `natpf` (`natpf_skill.js:301-307`), recupero della CPU (`game_engine.js:2800`,
  :2803), salita a rete senza controllo del livello (`natpf_net_play.js:76-89`, `game_engine.js:2305`).
- B37 decide il «Fuori» sul rimbalzo previsto con la fisica (`landingOf`, ramo b37 `natpf_shot_feedback.js:38-43`), non
  sul bersaglio: con l'aria corretta di lato le due cose coincidono meglio, come dice la bozza.

---

## 3. Problemi

### Bloccanti

#### B1 · I banchi dell'equilibrio non vedono «Nuova»
- **Dove**: §5.3, §5.5 («Si muovono»), §6 (B36.1 «Criteri» e «Avviso», B36.2, B36.4, B36.7).
- **Problema**: la bozza dice che un colpo senza `aimDev` gioca con la regola di oggi (§5.3; B36.1 «con `null` il
  codice di oggi»). I giocatori simulati con il telefono mandano l'intenzione ma **non** `aimDev` né `aimFull`:
  `rally-balance.mjs:63`, `b19/due-umani.mjs:62` e `:70`. Quindi con «Nuova» giocano con la regola di oggi.
  Da `rally-balance.simulate` dipendono 19 banchi, tra cui `legend.mjs`, `cpu-pressione.mjs`, `evento-bambini.mjs`,
  `rete.mjs`, `movimento.mjs`, `palla-corta.mjs`, `b25/impronte.mjs`, e il banco B42 (`b42/scambi-lunghi.mjs:18`).
  La bozza scrive che i profili con il telefono «si muovono»: con la sua regola **non si muovono**. I criteri 7, 8, 9,
  `audit:legend` e il banco B42 sono ciechi fino alla B36.7. «Prima gli strumenti» (§5.5) è contraddetto dall'ordine
  delle tappe.
- **Prova**: `grep aimDev` in `scripts/` e `test/`: solo `colpi.mjs`, `scambi-di-prova.mjs`, `riscaldamento.mjs` e
  qualche test; `grep rally-balance` in `scripts/audit`: 19 file.
- **Proposta**: **tappa B36.0 «strumenti»** prima di ogni modifica al gioco. I profili simulati mandano `aimDev` e
  `aimFull`, ricavati dagli stessi sorteggi (così con «Classica» le impronte restano identiche bit per bit). Ogni banco
  stampa quanti colpi hanno usato la regola nuova; un test fallisce se con «Nuova» sono 0. Solo dopo la B36.1.

#### B2 · La B36.1 descritta non è quella misurata
- **Dove**: §2.2 ultimo paragrafo, §6 B36.1 «Stima» e «Avviso».
- **Problema**: la B36.1 accende «le prime quattro righe» della formula, cioè il piatto fino a **1,6**, con bordi e aria
  di oggi. I suoi numeri (Esperta 83 → 90%, persona vera 55 → 64%; Leggenda in corsa fuori 14% → 0,4%) vengono invece
  dalla variante **«minima»** del prototipo, con il tetto a **1** (`tappa1-g15.mjs`, `tappa1-minima.mjs`). Ho rifatto la
  variante descritta (`tappa1-aria.mjs`: tetto 1,6, aria di oggi): Leggenda in corsa, persona vera, fuori
  **15,2% → 23,0%**; gesto buono **3,1% → 10,1%**. La Leggenda diventa più dura, non più facile. Il criterio della tappa
  «fuori del gesto buono 0% a ogni livello» cade a Leggenda.
- **Prova**: `rifatto-tappa1-aria.txt` (righe «leggenda … in corsa»), `rifatto-tappa1-g15.txt`, `rifatto-tappa1-minima.txt`.
- **Proposta**: scrivere in chiaro «B36.1: tetto 1, niente fascia della riga fino alla B36.4», con numeri e avviso della
  stessa variante. In alternativa tenere 1,6 e correggere l'avviso («Leggenda in corsa più dura»).

#### B3 · Scogliera a 60° e altopiano sulla riga
- **Dove**: §2.2 («oltre 60°: piatto non letto = 0»), §2.3 «Niente calamite», §5.5 criteri 4 e 5.
- **Problema**: da 1,6 × P (25,4° con P 17°) a 60° la palla va sempre a **4,00 m**; a 60,5° torna a **0 m**. Salto di
  **4,00 m in un grado**. Il criterio 4 chiede ≤ 0,35 m per grado; oggi il salto più grande è **0,28 m** per grado
  (il calo dolce tra 45° e 60°). In più chi gira «tanto» va sempre sulla riga: gesto 30 ± 12°, **58%** delle palle tra
  3,9 e 4,05 m (Esperta, da fermo); 40 ± 12°, 72%, e il 5% va al centro per la scogliera. È una calamita sulla riga e
  una strategia che vince **senza** precisione (punto 3 dell'utente). La «cella più piena ≤ 10%» è misurata solo sul
  gesto insegnato con il rumore, non su chi gira più del dovuto.
- **Prova**: `curva.txt` (righe «bozza» e «salto massimo per 1 grado»; la Leggenda in corsa ha l'altopiano a 4,84 m, fuori).
- **Proposta**: niente gradini. Oltre 1,6 × P un calo continuo (per esempio da 45° a 75° verso la mira piena, non verso il
  centro), oppure «non letto» solo quando il centro non è affidabile. Prima di scegliere, contare nella diagnostica quante
  mire vere superano 45°. Criterio 4 su tutto l'intervallo 0–90°; criterio 5 anche con un profilo «gira più del dovuto».
  Se l'utente vuole premiare la precisione (punto 3), anche oltre la riga ci vuole un costo che cresce piano.

### Importanti

#### I1 · Centro fermo (B36.3): un seme sbagliato resta per tutta la partita
- **Dove**: §6 B36.3, §8 decisione 5, §7 rischio 2.
- **Problema**: con il centro entro ±4° dal seme e mosso solo dai colpi entro 5°, un seme sbagliato tra 5° e 35° **non si
  corregge mai**: i colpi normali stanno tutti oltre 5°. La verifica dopo 4 colpi scatta solo oltre 35°
  (`natpf_gestures.js:185-187`); senza `biasPull` restano anche 22–35° (oggi `biasDevTrusted` 22, :202). Il criterio
  della tappa «un riferimento sbagliato di 26–40° si corregge come oggi» è impossibile con il meccanismo descritto.
  Il seme viene da 1–2 colpi per verso (`TRIAL.perSide` 2 e livello «ok» con 1: `natpf_trial_learn.js:78, :185`).
  Secondo la bozza stessa 8° di errore valgono 63% di giusti invece di 90%. Il seme poi si perde: un telefono ricollegato
  senza «Ricollega» azzera il centro (`natpf_phone_racket.js:550`), così il verso girato dal telefono (:769). Da lì 3 colpi
  per verso senza `aimDev` e un centro adattivo.
- **Proposta**: prima misurare l'errore del seme (telefono simulato con rumore di posa e di velocità; poi telefono vero).
  Tenere una correzione lenta tra 5° e 22° (oggi `alphaTrusted` 0,03) e il `biasPull` oltre 22°: la serie B35a resta
  12/14. Dopo un azzeramento riseminare dal `faceRef` del profilo imparato (come fa `natpf_phone_racket.js:626` con la
  calibrazione con i gesti).

#### I2 · Senza `aimDev` la regola cambia a metà partita
- **Dove**: §1 punto 2, §3.1 (pallonetto), §5.3, §6 B36.1.
- **Problema**: `aimDev` è nullo quando il centro non c'è ancora (primi 3 colpi per verso con «Salta» e «Nessuna», dopo un
  azzeramento, scambi di prova con un verso solo), con i gesti verticali senza verso (`aim(0)` → null:
  `natpf_gestures.js:215-218`) e senza `heading`. In quei colpi la bozza usa la regola di oggi (tempo a peso 1, spinta
  naturale, punto neutro che segue la palla). Due regole nella stessa partita, contro «la regola è la stessa per tutta la
  partita». Il pallonetto verticale «con la direzione della cima» non ha la cima.
- **Proposta**: con «Nuova» e `aimDev` nullo, piatto 0 con la regola nuova (tempo 0,3, neutro al centro); la regola di
  oggi solo per gli intenti ricostruiti (webcam, mouse, telefoni senza forma). Contare questi colpi nella diagnostica.

#### I3 · Sfida tra due computer: il P2 prevede il suo colpo con le sue regole
- **Dove**: §5.3, §9 («nessun campo nuovo»).
- **Problema**: sul computer del P2 il colpo del P2 è una previsione locale: `_natpfRacketShot` gira lì, con l'opzione e
  l'aria di quel computer (`game_engine.js:2546`, `GV.markLocalHit` :2612). L'opzione «Direzione dei colpi» è salvata
  per computer. Host «Nuova» e P2 «Classica» (la base): la palla parte in un posto e poi salta a quella dell'host; il
  verdetto B37 sul P2 si decide sulla palla locale. B42 ha avuto lo stesso problema e manda la scelta dell'host nello
  snapshot (`hot`, documento B42 §1 e §8).
- **Proposta**: il modello della direzione nello snapshot dell'host, usato dal P2 per la previsione (campo facoltativo;
  un P2 vecchio resta come oggi). Prova `natpf-1v1-p2p` con host «Nuova» e P2 di base. Il messaggio del colpo resta senza
  campi nuovi, come dice la bozza.

#### I4 · B36.2: `groundOnly` toglie anche schiacciata e split-step; la Leggenda fa ancora palle corte
- **Dove**: §3.3, §6 B36.2.
- **Problema**: `groundOnly` è l'opzione del piano rifatto dopo una volée mancata. Toglie anche la schiacciata al volo
  (`natpf_impact.js:169`, `&& !groundOnly`), contro «restano … schiacciata». E toglie lo split-step del B32: `hold` = 0
  (:149) e `startHold` riceve 0 (:216): chi gioca partirebbe prima su ogni palla, un vantaggio nascosto. La palla corta
  della CPU Leggenda non passa da `NET_PLAY.cpu.drop` (`cpuDropShot` esclude la Leggenda, `natpf_net_play.js:180`): è la
  «smorzata» di `natpf_legend.js:239`. Con i file elencati il criterio «0 palle corte della CPU» cade a Leggenda. Chi viene
  tirato avanti (smorzata, o «incrociatoStretto» a 5,2–6,6 m, `natpf_legend.js:229`) non può più giocare al volo: la bozza
  non dice cosa succede.
- **Proposta**: un'opzione nuova solo per la volée (il ramo di :205), schiacciata e split-step intatti; smorzata della
  Leggenda spenta con «Nuova»; misurare i punti persi da chi è tirato avanti (`audit:rete`, `audit:movimento` con i profili
  di B36.0).

#### I5 · Angolo corto: una soglia a metà della forza normale
- **Dove**: §3.1, §6 B36.5, §5.5 criterio 5.
- **Problema**: «diagonale, piatto ≥ 1, forza ≤ 0,45» è un interruttore. Il colpo tipico ha forza 0,5 per costruzione
  (`natpf_stroke_intent.js:67-78`); una persona vera ha forza p10/p90 0,23/0,85. Con il gesto insegnato (0,85 × P) verso
  la diagonale e la forza solita, angolo corto **non voluto** nel **12%** degli incrociati (piatto ±5°) e nel **16–18%**
  (piatto ±12°). Il criterio vuole ≤ 10%. Il prototipo della bozza usa forza fissa 0,6 e non lo vede. A forza 0,45 la
  palla cade a 6,60 m, a 0,46 a 8,93 m: 2,3 m per un centesimo di forza. Stesso salto tra piatto 0,99 e 1,00, e quando la
  palla passa da 0,99 a 1,01 m dal centro (la «diagonale» cambia lato).
- **Prova**: `angolo-corto.txt`.
- **Proposta**: profondità che scende in modo continuo con la morbidezza (sotto circa 0,35, la zona della palla corta) e con
  il giro oltre P; diagonale con una fascia di passaggio; criterio di continuità anche sulla profondità (per esempio
  ≤ 0,5 m per 0,05 di forza).

#### I6 · Criterio 4 rotto a Leggenda con le palle veloci
- **Dove**: §2.2 («OLTRE LA FINESTRA»), §5.5 criterio 4.
- **Problema**: la deriva è in unità della finestra, e in ritardo la finestra è 1,4/|vz| (`natpf_stroke_outcome.js:476`).
  Quindi 10 ms di ritardo valgono D × 0,01 × |vz| / 1,4 metri. Con D 2,7 (Leggenda): **0,58 m a 30 m/s, 0,68 m a 35 m/s**.
  Il criterio è ≤ 0,5 m. La bozza l'ha provato solo a 18 e 25 m/s. B42 accorcia il volo fino al 42%.
- **Prova**: `salto-10ms.txt` (Pro resta sotto 0,5 fino a 35 m/s: 0,45).
- **Proposta**: deriva in metri per secondo di ritardo, o con un tetto di pendenza; oppure il criterio con la velocità
  scritta e una riga a 30–35 m/s.

#### I7 · Scambio caldo (B42): la fascia sicura toglie una parte dei fuori che chiudono gli scambi
- **Dove**: §2.4 «Scambio caldo», §6 (banco B42 solo nella B36.2).
- **Problema**: oggi nello scambio caldo la qualità scende sotto `assistQ` e la tenuta sparisce: anche la mira piena può
  uscire (`natpf_stroke_outcome.js:338, :357`). Con la fascia sicura la mira fino all'angolo non esce mai, in nessuna
  situazione. Nei banchi B42 i fuori di chi gioca sono ancora il 16–33% dei punti nei profili con scambi lunghi (tabella
  3.3). Gli scambi tra il 20° e il 34° colpo possono allungarsi (dopo resta il colpo fallito: B42 regge). Il banco B42 è
  solo nella B36.2 ed è cieco (B1). B42 cambia anche `strokeOutcome`: parametro nuovo `hotPress`,
  `q = qs × pressure × hotPress` (ramo b42 `natpf_stroke_outcome.js:306, :331`; chiamata a `game_engine.js:2360`). I
  riferimenti di riga della bozza (`game_engine.js:2355`, `natpf_stroke_outcome.js:354-358`) sono della 13.9.
- **Proposta**: banco B42 con i profili di B36.0 come criterio di B36.1 e B36.4 («oltre 30 colpi» non più della base B42 +
  2 punti). Partire dal codice con B37 e B42 uniti e rifare i riferimenti di riga.

#### I8 · La posa «pronto» cancella la mira di chi gira prima e aspetta
- **Dove**: §7 rischio 3, §6 B36.9 («facoltativa»), §6 B36.6 (dimostrazioni).
- **Problema**: con la cima al comando, quello che il telefono misura diventa il segnale principale. La posa «pronto»
  segue il telefono fermo: sotto 25 °/s per 400 ms, costante 2,5 s (`site/js/tennis/racchetta.js:39`,
  `face-tracker.js:31-33, :126`). Chi gira la cima e aspetta la palla perde parte della mira: fermo 1 s si legge circa
  l'83% del giro, 2 s il 57% (lettura-telefono §5, telefono simulato). Le dimostrazioni di oggi insegnano proprio a girare
  prima del colpo (`preYaw` ±22°: `natpf_gesture_motion.js:9-10, :111, :113`). Stesso gesto, risultato diverso secondo
  l'attesa: contro il punto 5 dell'utente.
- **Proposta**: B36.9 non facoltativa e prima della B36.8 (posa «pronto» ferma con la palla in arrivo), oppure insegnare a
  girare durante il colpo. Banco con il telefono simulato: stessa mira con attesa 0 / 0,5 / 1 / 2 s, differenza ≤ 0,5 m.

#### I9 · Test e impronte riallineati tutti insieme alla fine
- **Dove**: §6 B36.8.
- **Problema**: 34 file di test usano l'esito del colpo (`grep strokeOutcome|_natpfRacketShot|natpfLastRacket` in
  `natpf-tennis/test`). Con «Classica» di base non cambiano fino alla B36.8; lì cambia tutto insieme: impronte B25, B37,
  B42, fine partita, B18, più i test che mirano con il tempo. «Riallineati» non dice come.
- **Proposta**: dalla B36.1 i test dell'esito del telefono girano con tutte e due le regole (parametro); la B36.8 cambia
  solo il valore di base. La lista dei test e delle impronte che cambieranno, con il motivo, già nella B36.1.

### Minori

- **M1 · La causa del «Fuori» si perde in un caso di B37.** `settledQuality` (ramo b37 `natpf_shot_feedback.js:135-140`)
  rifà «Fuori» dal solo voto (`timingWhy`) quando la previsione era «dentro» e il motore dice «Out»: le cause nuove vanno
  portate nel verdetto rimandato. Con «Classica» le scritte B37 devono restare identiche. «Troppo angolato» con h < 1 è
  in realtà la situazione (corsa, scambio caldo): meglio dirlo così.
- **M2 · Aria corretta di lato: per quali colpi?** I lanci di `game_engine.js:2227` e :2604 valgono per tutti i colpi della
  racchetta, anche webcam e mouse. Se la correzione vale per tutti, webcam e mouse cambiano (§1 punto 11) e il profilo
  «medio» non è più cieco (§5.5). Scrivere: solo telefono con la forma, solo «Nuova».
- **M3 · Quali colpi usano la mappa nuova.** Non è scritto per schiacciata, pallonetto, volée e colpo controllato a rete.
  Il colpo controllato a rete (B17.4) ha una dispersione dal seme fino a 1,2 m (`natpf_stroke_outcome.js:118, :336`): con
  le palle corte resta anche con «Nuova» e a chi gioca sembra caso (punto 5).
- **M4 · Opzione letta una volta per partita**, come lo scambio caldo (`natpfHot` alla partenza, ramo b42
  `game_engine.js:1243`): niente cambio di regola a partita in corsa se lo staff tocca il pannello.
- **M5 · Forza e direzione legate.** Nel telefono simulato la velocità del gesto sposta poco il piatto letto (da ×1 a ×1,6
  il piatto passa da 0 a −0,09; pendenza 0,49 con R² 0,04: `colpi-banco.txt`); la lettura del telefono stima fino a 6°
  tra ×0,6 e ×1,4. Con la cima al comando 6° sono 1,4 m. Da misurare con il telefono vero.
- **M6 · «Più angolo, più errori della CPU».** A Pro `cpuErr` ha `angle: 0` e `speed: 0` (`natpf_skill.js:76`): l'angolo
  conta solo perché fa correre o allungare la CPU. La previsione «Esperta più facile» passa dalla corsa, non dall'angolo.

---

## 4. Proposte di modifica al piano

1. **B36.0 · Strumenti (nuova, prima di tutto).** Profili simulati con `aimDev` e `aimFull` (dagli stessi sorteggi);
   contatore dei colpi per regola in ogni banco; test che fallisce se con «Nuova» nessun colpo usa la regola nuova; banco
   della serie con attese diverse della posa «pronto» (I8); banco dell'errore del seme degli scambi di prova (I1).
2. **B36.1** con tetto 1, scritto (B2); con «Nuova» e `aimDev` nullo piatto 0 e regola nuova (I2); opzione letta una
   volta per partita e mandata al P2 (I3, M4); test parametrizzati sulle due regole (I9).
3. **Formula**: niente scogliera a 60°, calo continuo (B3); deriva in metri per secondo (I6); angolo corto continuo (I5).
4. **B36.2** con un'opzione solo per la volée, smorzata della Leggenda spenta (I4).
5. **B36.3** con correzione lenta tra 5° e 22° e `biasPull` oltre 22°; riseminare dopo un azzeramento (I1).
6. **Banco B42** come criterio di B36.1 e B36.4 (I7); partire dal codice con B37 e B42 uniti.
7. **B36.9** obbligatoria prima della B36.8, oppure dimostrazioni che girano durante il colpo (I8).

## 5. Non verificato da me

- Nessuna prova con un telefono vero, con il programma Windows o con il ledwall; nessuna prova nel browser.
- Non ho lanciato `audit:legend`, `audit:cpu`, `audit:evento` né il banco B42: solo letto il codice che li costruisce.
- I numeri di B42 (tabelle 3.1–3.4) e di B37 li ho letti dai loro documenti, sui rami con il commit «IN CORSO».
- I numeri della posa «pronto» (83% a 1 s, 57% a 2 s) e dei 6° legati alla velocità vengono dalla lettura del telefono
  (telefono simulato); ho verificato solo le costanti nel codice.
- Il prototipo della bozza resta semplificato (una palla, niente centro che impara, ritmo 0): i miei numeri sulla bozza
  hanno gli stessi limiti.
