# B36 · Vincoli per un cambiamento profondo di direzione e atterraggio (lettura in sola lettura)

**Base letta:** `natpf-simulator` 94442a3 (versione 13.7). Ho letto B35a (`b35-precisione-telefono`, 25a6174, più `docs/b35/precisione-telefono.md` non committato nella sua worktree) e B35b (`b35-collaudo`, fbc4026) con `git show` e `git diff`, senza unirli.

**Legenda:** [V] = verificato nel codice o con un mio script. [D] = dedotto.

**Script miei**, che leggono soltanto i moduli del gioco:
- `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b36/agenti/vincoli-aria.mjs`
- `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b36/agenti/vincoli-aiuto.mjs`
- `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b36/agenti/vincoli-livelli.mjs`

**Premessa [V]: B35a riscrive proprio le parti che B36 toccherà.**
- `natpf_stroke_outcome.js`: `RHYTHM` e `createRhythm` diventano un ritardo abituale (`rhythmLag`, `te`, `rRest` nelle righe 288–321 della base).
- `natpf_gestures.js`: `AIM` riceve `alphaTrusted .03` e `biasDevTrusted 22`.
- `natpf_trial_learn.signedSwing`: gira anche il piatto quando gira il verso.
- `swing-message.js`: nuovo campo `sg`.
- Nuovi: il banco `scripts/audit/direzione-telefono.mjs` e `diag/diag_direction.js`.

B36 deve quindi partire dal codice unito con B35a e B35b (prevista versione 13.8). Le misure «prima» vanno rifatte lì, non su d152035 né su 94442a3.

---

## (a) Vincoli

### A. Esito del colpo di chi gioca (motore)

**A1. Esito senza caso.** [V]
- Nel singolare ogni colpo del P1 passa dalla finestra d'impatto, qualunque sia il controller (telefono, webcam, mouse): `game_engine.js:1567-1576`, `natpf_impact.js:406-438`.
- Poi va in `_natpfRacketShot` → `strokeOutcome`: `game_engine.js:2129` e `2316-2438`.
- Nessun `Math.random`: `natpf_stroke_outcome.js:1-15`. Il seme serve solo alla dispersione a rete: `:155-164`.
- Perché conta: è il punto 5 dell'utente (coerenza).
- Controllo: test `natpf-campo-aperto.test.mjs:79`, `natpf-racchetta-motore.test.mjs:57`, `natpf-colpi-b15.test.mjs:51`.

**A2. Percorsi che restano a caso.** [V]
- **Doppio** (selezionabile, `natpf_lobby.js:384`): direzione da `swingLandingX`/`playerLandingX` (`game_engine.js:2145-2170`) e profondità con `Math.random` (`:2172-2183`).
- **P2 senza telefono** (webcam, tastiera): entra nella finestra solo con `natpf.aim==='swing'` (`:1789-1799`). Altrimenti `Math.random` (`:2530-2537`, `:2546-2557`).
- B36 deve dichiarare se li estende. Se non li estende, deve scrivere che lì la «coerenza» non vale.

**A3. Specchio.** [V]
- P1 e P2 sono speculari: `toward`/`mirror`, `game_engine.js:2324-2333`. Il mancino lo è attraverso il segno di `contact`.
- Test: `natpf-mancini.test.mjs:123,238,292` (96 gesti a specchio) e `natpf-b20-specchio.test.mjs:183`.
- Ogni termine asimmetrico nuovo (per esempio la spinta naturale verso l'incrociato, `natural` a `:24`) va specchiato esattamente.

**A4. La direzione non dipende da dove il movimento automatico mette il corpo.** [V]
- Codice: `game_engine.js:2327-2333`. Test: `natpf-campo-aperto.test.mjs:217`.
- Il «punto d'impatto» del punto 2 dell'utente lo sceglie `natpf_impact` [V]. Chi gioca lo controlla solo con il tempo [D].

**A5. Livelli: decisione dell'utente del 23/10.** [V]
- «Il livello cambia la precisione chiesta, non dove si può mandare la palla»: `natpf_stroke_outcome.js:186-188`, `ASSIST` a `:193-216`, test `natpf-campo-aperto-23-10.test.mjs:30`.
- Oggi la scala dei livelli per chi gioca vive solo nel canale del tempo (finestra della direzione) e in `assistQ`/`failQ`/`pushOut`. Il canale del piatto è identico a tutti i livelli.
- Numeri (script `vincoli-livelli.mjs`): un anticipo di +0,12 s porta la palla a −1,63 m (Bambini), −2,23 (Facile), −2,94 (Pro), −3,64 (Leggenda). Il piatto a 0,5 la porta a 1,63 m a tutti i livelli.
- Il ritardo è uguale per tutti: `lateSpanOf` vale 0,078 s a 18 m/s (`:438`). Fa eccezione il `lateMargin` dei Bambini, +0,06 s (`natpf_impact.js:366-368`).
- Bambini ed Evento non hanno righe proprie in `ASSIST` e `IMPACT`: ricadono su Facile (`:219`, `:463`; `natpf_skill.js:112-149`). Ogni tabella nuova per livello deve averle.

**A6. «Escono solo i colpi estremi».** [V]
- L'aiuto che tiene la palla in campo: `natpf_stroke_outcome.js:13-15`, `302`, `320-321`, `337`.
- Banco B35a: 0% di colpi fuori con il gesto buono a Facile, Pro e 1v1. A Leggenda in corsa 18–22% fuori, che è la regola del livello.
- Il collaudo del 13/11 si lamentava proprio di «molti colpi fuori»: non va riaperto.

**A7. Palla corta, volée e gioco a rete restano fuori da B36.** [V]
- Le regole oggi: `dropControl` (`:144-151`), `netVolley` (`:283-284`), `volleyNet` (`:287`), `netHold` (`:313`), colpo controllato (`:299-300`), chiusura (`:335`, `:374-379`).
- La salita a rete del B31 (`natpf_net_play.js:76-89`) dipende da `out.depth`, `out.q`, `out.shot` e dalla forza. Cambiare la profondità dei colpi da fondo cambia quante volte si sale a rete, e quindi le volée [D].

**A8. Colpo super, schiacciata e colpo potente.** [V]
- `natpf_stroke_outcome.js:409-434`, `486-496`; `game_engine.js:2358-2366`, `2425-2428`.
- Il super chiede «a tempo» (|t| ≤ 0,6) e il colpo dalla parte giusta del corpo.

**A9. Velocità e volo.** [V]
- Il volo dipende da forza e altezza sulla rete: `game_engine.js:2370-2389`.
- I km/h sono quelli veri dal B34. Il «colpo più veloce» conta solo i colpi finiti in campo.

**A10. Voto e segnale del momento giusto.** [V]
- Il voto resta sul tempo vero: `natpf_stroke_outcome.js:359`.
- Il verde dell'anello coincide con la finestra del «Perfetto»: `natpf_timing_cue.js:1-25`, `cueEdges` a `:64`. Test `natpf-b18-t2-evento-bambini.test.mjs:267,293`.
- L'anello è acceso di base a Bambini ed Evento (`:49`). Insegna a colpire «al centro della finestra», cioè con il tempo neutro, che oggi vuol dire palla al centro [D].

**A11. Il bersaglio non è il rimbalzo vero.** [V]
- `fixAir` corregge solo la componente lungo il campo (`natpf_skill.js:867-883`).
- Con il mio script `vincoli-aria.mjs` lo spostamento laterale vero è 0,86–0,89 volte quello voluto. Esempio: bersaglio a −3,5 m, rimbalzo vero a −2,94 m.
- La Leggenda lo compensa (`kLat .865`, `natpf_legend.js:48`); chi gioca no.
- Usano il bersaglio: registro, diagnostica, Precision, Combo, `trainingDirection` (`natpf_training.js:484`), `natpf_events.js:221`.
- Usa il rimbalzo previsto: dentro/fuori nelle scritte (`natpf_shot_feedback.js:31-38`).

**A12. Funzioni agganciate all'esito.** [V]
- `registerPlayerShot` (`natpf_skill.js:425-438`): la pressione sulla CPU cresce con angolo, forza e profondità.
- Aiuto, campo aperto, scambio che si scalda: `helpLevel`/`openTight` (`game_engine.js:2320-2323`), `helpOutcome` (`:2353`), `hotOutcome` (`:2362`), `slowFor` (`:2392`).
- Causa del colpo fallito: `:2365-2366`.

### B. CPU

**B1. Facile, Pro, Bambini ed Evento.** [V]
- Bersagli scelti a caso: `cpuShotChoice` (`natpf_skill.js:939-967`), `game_engine.js:2685-2736`.
- Arrivo sulla palla: lettura con reazione, errore e attesa al centro, più la lettura in ritardo della palla larga `cpuWide` (`planCpuRun`, `:563-610`). Corsa con accelerazione e frenata (`cpuStep`, `:693-707`).
- Portata 1,4 / 1,5 m (`:43`, `:60`), controllata in `game_engine.js:3251` e `3268`.
- Errori (`cpuErrorChance`, `:725-752`): contano allungo², corsa e palla veloce. Angolo e minaccia (forza e profondità, `shotThreat` a `:712`) le moltiplicano.
- Risposta difensiva: `:773-781`.
- Più angolo e più profondità vogliono dire subito più errori e più vincenti contro la CPU [D].

**B2. Leggenda.** [V]
- Sceglie il colpo per utilità (`legendDecide`, `natpf_legend.js:204-291`): stima se chi gioca ci arriva (`humanReach` `:162-183`) e il proprio rischio con le regole di Esperto (`cpuRisk` `:185-200`).
- Esegue con le regole di Esperto e il rischio dei colpi forti × `powerErr .5` (`legendReturn`, `:293-327`).
- Corre a 22/30 m/s² con massimo 8 m/s e affondo a 8,6 (`legendStep`, `:340-375`). Recupera sulla bisettrice (`legendRecover`, `:328-336`).
- Lascia passare le palle che vede fuori, con un errore di lettura di ±0,12 m (`legendLetGo`, `:429-441`). Con più palle vicino alle righe crescono i lasciati passare sbagliati [D].
- La sua qualità cala con la distanza laterale all'impatto (`reachQuality`): palle più larghe le fanno sbagliare di più.

**B3. Bambini.** [V] La CPU tira quasi sempre al centro, mai angoli (test `natpf-b18-t2-evento-bambini.test.mjs:178`).

### C. Livelli e aiuti

**C1. «Chi gioca».** [V]
- Bambino → Bambini, Ragazzo → Facile, Adulto → Evento. Pro e Leggenda solo da «Altre impostazioni» (`natpf_who.js:13-19`).
- Ogni livello contro la CPU ha la sua riga in `SERVE_WEIGHT` (`natpf_skill.js:481`).

**C2. Gli aiuti di oggi passano tutti dal canale del tempo.** [V]
- Bambini: `timingSpan .28`, `perfectLead .22`, `lateMargin .06` (`natpf_skill.js:112-117`).
- Leggenda: `span .115`, `spanPress 3`, `pushOut 1.35`, `assistQ .8` (`natpf_stroke_outcome.js:215`).

**C3. Evento.** [V]
- `k` si ferma quando chi gioca vince 65 punti su 100 (`natpf_evento.js:26-33`).
- Test `natpf-b18-t2-evento-bambini.test.mjs:25`, `68`, `193` (adulto medio 60–70 punti).

### D. Stesso schermo

**D1. Niente punti regalati; aiuto al più giovane solo di gioco (variante G).** [V]
- `natpf_duo_rules.js:129-170` e `247-268`.
- Il margine (finestra ×2, +0,1 s) agisce solo sul tempo. Script `vincoli-aiuto.mjs`: con +0,08 s di errore la palla va a −0,94 m invece di −1,77; con il piatto a 1 resta a 3,31 m con e senza aiuto.
- Se B36 sposta la direzione su un altro canale, la parte di margine sul tempo si svuota per la direzione [D]. Restano la palla più lenta e il colpo più in fondo.

**D2. Opzioni dello stand.** [V]
- «Stesso schermo: campo aperto» esiste già (`:66-94`): il nome si scontra con il «campo aperto» di B36.
- Super relativo: `:96-122`.

**D3. Impronte e giocatori simulati.** [V]
- Impronte con sorteggi fissi: `natpf-b25-stesso-schermo.test.mjs:13` e `:670-690`.
- Il banco dei due umani (`scripts/audit/b19/due-umani.mjs:37-42`) inverte la mappa della mira di oggi.

### E. Sfida tra due computer (LAN/P2P)

**E1. Chi calcola.** [V]
- L'host calcola l'esito di tutti e due.
- Il P2 manda `natpf` con l'intenzione calcolata sul suo computer: `motion_controls.js:1497-1509`, `relayedNatpf` in `natpf_skill.js:301-307`. Usa la sensibilità della mira del suo computer (`natpf_phone_racket.js:275`).
- L'host gioca il P2 a livello «1v1» (`game_engine.js:2520`), con un ritmo per ciascuno (`:2349-2350`) e `P2_LATE_MARGIN` 0,03 s.

**E2. Limiti.** [V]
- Messaggi sotto 16300 byte (`docs/PROJECT_MEMORY.md:111-115`); `compactMatchState` tiene gli ultimi 3 colpi (`natpf_p2p.js:92-93`).
- Ogni campo nuovo viaggia dentro `natpf` e deve poter mancare (P2 di un'altra versione) [D].

**E3. Decisione del 04/11.** [V] La sfida tra due computer non si sviluppa, ma deve restare verde (`docs/PROJECT_MEMORY.md:266`).

### F. Webcam, mouse, telefoni vecchi

**F1. Intenzione ricostruita.** [V]
- Per webcam e mouse il piatto è `wrist` o `dirX`, con peso `faceWeight .7`, e la forza viene dalla velocità (`natpf_stroke_outcome.js:468-478`).
- Webcam: `dirX` = direzione della mano (`webcam_strokes.js:216`, `webcam_argon_track.js:130`).
- Mouse: `dirX` = puntatore (`motion_controls.js:204`).
- Suggerimenti diversi per controller: `natpf_training.js:30-31`.

**F2. Telefono senza forma del colpo.** [V]
- Senza `sh` non c'è intenzione (`natpf_stroke_intent.js:213`) e vale la tabella di prima (`natpf_phone_racket.js:262`).
- La lettura tollera i campi che mancano (`site/js/tennis/swing-message.js:30-46`).
- Ogni segnale nuovo nel messaggio «sw» deve essere facoltativo [D].
- Ogni segnale nuovo va girato con il verso, come fa `signedSwing` di B35a. Il difetto 1 del collaudo era questo: il verso girato senza girare il piatto.

**F3. Simulatori di prova.** [V] `test/phone-sim.mjs` e `test/arm-sim.mjs` sono usati da 27 file tra test e banchi.

### G. Tutorial, allenamento, minigiochi

**G1. Le dimostrazioni devono corrispondere al riconoscimento (CLAUDE.md).** [V]
- Incrociato e lungolinea: «Cima girata verso il centro / Colpisci un attimo prima del solito» e il contrario (`natpf_gesture_motion.js:111-114`).
- Pose: `AIM_TURN` e `AIM_TURN_VIDEO` (`natpf_gesture_pose.js:536-544`), `choreoFor` (`:565-572`), testi delle inquadrature (`:618`, `:647`).
- Il test di fedeltà legge `natpf.wrist` ≥ circa 0,3 (`natpf-gesture-pose.test.mjs:275-296`), non `intent.face`, che è il campo usato dall'esito.

**G2. Allenamento.** [V]
- Suggerimenti e giudizio del gesto: `natpf_training.js:30-31`, `81-86`.
- `trainingDirection` (`:120-125`) lavora sul bersaglio.
- Test `natpf-training-directions.test.mjs:8,21`.

**G3. Tutorial corto.** [V]
- 5 schede a indici fissi, e il protocollo `tp` con il telefono dipende da quegli indici (`natpf_tutorial.js:35-48`).
- Una scheda di direzione nel corto cambierebbe il protocollo [D].

**G4. Minigiochi.** [V]
- Precision lavora sul bersaglio. Le sue zone legano la profondità alla forza, per esempio «Corta al centro: dritto morbido» (`natpf_arcade.js:103-120`, `natpf_events.js:221-236`).
- Combo ha i passi incrociato e lungolinea (`natpf_arcade.js:123-129`, `natpf_events.js:238-245`).

### H. Registro dello stand

**H1. Riga «colpo».** [V] (`registro_registratore.js:333-358`)
- Ha:

  | Campo | Cosa contiene |
  |---|---|
  | `gesto` | il colpo fatto |
  | `voluto` | solo il tipo di colpo voluto, se diverso |
  | `in` | la palla della CPU che arrivava |
  | `ms` | errore di tempo in ms |
  | `voto` | il voto del tempo |
  | `f` | la forza |
  | `d` | la mira dell'esito (`O.aim`) |
  | `e` | debole, rete o fuori |
  | `x`, `z` | il bersaglio del motore, non il rimbalzo vero |
  | `sup`, `supNo` | colpo super, o perché non è scattato |
  | `volee`, `rete`, `mov`, `lato` | volée, colpo a rete, corsa o allungo, lato |
  | `fonte`, `causa` | da dove arriva il colpo, causa del fallito |
  | `aiutato` | solo sì/no |

- Mancano:
  - il tempo in unità della finestra e l'eccesso;
  - il piatto;
  - le parti della mira (tempo, piatto, spinta naturale);
  - il punto neutro e la posizione della palla all'impatto;
  - l'aiuto come numero e la qualità;
  - la profondità voluta e la forma (salita, piano);
  - il rimbalzo vero;
  - la sensibilità della mira colpo per colpo;
  - il ritardo abituale di B35a;
  - la direzione voluta (si conosce solo nella prova guidata e negli esercizi).

**H2. Campi ammessi in due copie.** [V]
- `registro_formato.js:48` e `cloudflare/registro-worker.js:99`; un test le vuole uguali (`test/registro-worker.test.mjs:37-39`).
- Il Worker in linea butta in silenzio i campi che non conosce (`registro-worker.js:129-147`).
- Quindi ogni campo nuovo richiede che l'utente ricarichi il Worker. È già successo con `rete` del B31.

### I. Diagnostica

**I1. Evento «racchetta».** [V]
- È già ricco (`diag/diag_recorder.js:256-276`): tempo, oltre, piatto, mira, neutro, palla, aiuto, volo, altezza sulla rete, effetto, sensibilità della mira.
- B35a aggiunge `ritardoAbitualeMs` e la classifica incrociato/centro/lungolinea (`DIR_LINE` 1,25 m).
- Ogni componente nuova della direzione va registrata qui, altrimenti la prova con il telefono vero non si può leggere [D].

**I2. Lato delle palle per partita.** [V] (`diag/diag_metrics.js:198-262`)
- «Sbilanciata» con almeno il 70% dei colpi in una metà, su almeno 20 colpi.
- «Storto» con |piatto mediano| oltre 0,2. «Angolate» oltre 2,5 m dal centro.
- Con la direzione più voluta crescono i falsi «ricalibrare» [D]. Se cambia il significato del piatto, la soglia 0,2 va rifatta.

### J. Statistiche di fine partita

[V]
- Solo lettura: `natpf_match_stats.js:1-20`, test `natpf-b33-fine-partita.test.mjs:69` (partita identica con e senza statistiche).
- Il peso dei livelli in classifica (`LEVEL_WEIGHT`, `:30-37`) è tarato perché il giocatore simulato «umano» prenda lo stesso punteggio a ogni livello.
- I consigli parlano del tempo (`tipsOf`, `:122-147`).
- B35b riscrive la schermata finale con solo cose positive (`BEST_ORDER`): niente statistiche nuove fuori da quella proposta grafica.

### K. Gli strumenti di misura dipendono dalla mappa di oggi

[V] Questi giocatori simulati calcolano piatto e tempo invertendo la mappa di oggi (spinta naturale, peso del tempo, peso del piatto):
- `scripts/audit/rally-balance.mjs:42-60` (`phoneIntent`): i giocatori simulati di audit:legend e audit:cpu;
- `b19/due-umani.mjs:37-42` e `b19/due-umani-distanza.mjs:26-29`;
- `precision-combo.mjs:56-57`;
- `rete-diag.mjs:19-23`.

Se cambiano le regole e non questi, i banchi misurano «un giocatore che conosce le regole vecchie» [D].

Il banco di B35a `direzione-telefono.mjs` invece parte dal gesto del braccio simulato, quindi resta valido. Il suo «voluto» però è definito con i gesti di oggi (piatto, polso, tempo, naturale) e va esteso ai gesti nuovi.

### L. Prodotto e processo

[V]
- Nessuna clip vocale di direzione: le voci sono solo in inglese, registrate e con licenza (`natpf_voice.js:58-69`).
- Interfaccia misurata con `cqw`/`cqh`.
- Pacchetto Cloudflare sotto 25 MB (`.github/workflows/natpf-tennis.yml:74-77`).
- Versione nuova e pacchetti (installer e zip) a ogni versione.
- Dire sempre all'utente come si attiva ogni opzione nuova (`docs/PROJECT_MEMORY.md:724`).
- Il nome del gioco commerciale non va nei file.

---

## (b) Il cancello di B36

**1. Base.**
- Misure «prima» sul codice unito con B35, con gli stessi semi.
- Correggere prima il documento divergente: `docs/PROJECT_MEMORY.md:832` dice «a Leggenda niente salita a rete automatica».
- Il codice dice il contrario (il revert e5fa4bd è nel ramo e `playerApproachOff` non c'è), e l'utente il 13/11 ha detto «resta com'è» (`docs/TRACCIA_PASSI.md:450`).

**2. Verdi senza toccarli.**
- **Suite:** `npm test` (1416 alla 13.7, più i test di B35), test del sito (226), LAN (12), Windows (42), build, pacchetto sotto 25 MB.
- **Test del gioco da lasciare invariati:**
  - determinismo, specchio e mancini;
  - «direzione indipendente dal corpo»;
  - nessun punto regalato;
  - B33 (statistiche che non cambiano il gioco);
  - fedeltà del tutorial (`natpf-gesture-pose`, `-anim`, `-demo`, `natpf-presa`);
  - P2P (dimensione dei messaggi);
  - registro (copia dei campi nel Worker);
  - segnale (verde = Perfetto);
  - Evento (equilibrio a 65 punti).
- **Prove nel browser:**
  - `natpf-rally` (cadute in punti diversi, mira e punto neutro; `tools/e2e/natpf-rally.mjs:143`);
  - `natpf-phone-upright` (piatto girato a destra o a sinistra: almeno 0,4 m; `:126-130`);
  - `natpf-mira-lato`, `natpf-training-flow`, `natpf-tutorial-phone`;
  - `natpf-gesti-fotogrammi`, `natpf-gesti-sequenze`, `natpf-minigiochi-principianti`;
  - `natpf-diag-session`, `natpf-scambi-di-prova`;
  - `natpf-leggenda`, `natpf-rete`, `natpf-movimento`;
  - `natpf-stesso-schermo-b20` e `-b25`, `natpf-1v1-p2p`, `natpf-formato-fiera-p2p`, `natpf-1v1-webcam-p2`;
  - `natpf-webcam-pipeline`, `natpf-fine-partita`, `natpf-registro`.

**3. Audit con criteri: devono restare dentro.** I valori sono quelli documentati dopo il revert della Leggenda. I primi tre hanno poco margine.

| Audit | Criterio | Ultimo valore documentato | Margine |
|---|---|---|---|
| audit:legend, «tennista» | CPU ≥ 85% dei game | 86,6% | 1,6 punti |
| audit:legend, «amatore» | errori della CPU 2–6% per colpo | 2,2% | 0,2 punti (1,9% con la variante B34 tenuta da parte) |
| audit:legend, Esperta contro «medio» | 70–85% dei game a chi gioca | 75,2% | — |
| audit:legend, «preciso» | CPU ≥ 60% | 76,7% | — |
| audit:legend, «medio» e «amatore» | CPU ≥ 90% | 99,0% e 98,7% | — |
| audit:legend, «bambino» e «impreciso» | CPU ≥ 98% | 100% | — |
| audit:legend, Facile contro «medio» | ≥ 95% a chi gioca | 100% | — |
| Torneo ridotto in `npm test` | punti a chi gioca ≤ 33,5% («tennista») e ≤ 46% («preciso») | — | — |
| `cpu-pressione --obiettivi` | CPU in rete ≤ 12,5%; errori sulle palle facili ≤ 3%; Pro, palla a 4–6 m dalla CPU, vincenti ≥ 15%; Facile, adulto ≥ 90%; Facile, bambino ≥ 31% | — | — |
| `evento-bambini` | adulto 60–70 punti a Evento; il bambino vince game a Bambini | — | — |
| `b25/misure aiuto` | bambino contro adulto medio 38–42%, mai oltre 50% | — | — |
| `rete`, `movimento`, `palla-corta` | invariati dentro il rumore (sono fuori da B36) | — | — |

- Fonti audit:legend: `scripts/audit/legend.mjs:144-168` e `docs/b34/decisioni-revisione.md:147-158`.
- Torneo ridotto: `natpf-legend-b16.test.mjs:90-99`.
- Per i criteri stretti si decide con 24 o 40 semi (`audit:legend -- --seeds=40`), perché il rumore è circa ±3 punti (`docs/PROJECT_MEMORY.md:606-612`).

**4. Da riallineare di proposito, e come dimostrarlo.**
- **Interruttore di B36**, come `netPlayRules.off` del B31. Con B36 spento le impronte devono tornare identiche alla base. Le impronte sono:
  - `natpf-b25-stesso-schermo` (le due serie);
  - `natpf-b32-movimento:152`;
  - `natpf-b18-t2-leggenda-palla-corta`;
  - `fine-partita --impronte`;
  - `evento-bambini --impronte`;
  - le impronte dei «tennista» di B35a.

  Solo dopo questa prova si registrano le impronte nuove con B36 acceso.
- **Prima gli strumenti, poi le regole.**
  1. Un passo che porta i giocatori simulati della sezione K su un modello «gesto → intenzione» che non conosce la mappa, con B36 spento: numeri uguali alla base, oppure scarto documentato.
  2. Un passo che accende B36.
  3. Tabelle prima/dopo su almeno due serie di semi, con l'errore.
- **Test che oggi descrivono la mappa:**
  - `natpf-campo-aperto` (`:22`, `38`, `56`, `68`, `125`, `138`);
  - `natpf-campo-aperto-23-10` (`:15`, `36`, `51`);
  - `natpf-colpi-b15` (`:40`, `89`, `96`);
  - `natpf-aim` (`:73`, `87`, `106`);
  - `natpf-racchetta-motore` (`:72`, `418`, `435`);
  - `natpf-presa-palmo-29-10:170`, `natpf-variety` (`:50`, `126`), `natpf-diag-20261030:159`, `natpf-b35-direzione`.

  Vanno riscritti tenendo le proprietà: determinismo, continuità e ordine, tutto il campo raggiungibile (celle di 1 m), niente palle ammucchiate, specchio, livello = precisione. Si cambiano solo i numeri. In ogni test va un commento «prima X, ora Y, perché».
- **Indicatore principale: la matrice di `direzione-telefono.mjs`.** Non deve peggiorare rispetto a B35a «dopo»:
  - incrociato voluto finito lungolinea: 0%;
  - lungolinea voluto finito incrociato: al massimo 2%;
  - fuori con il gesto buono a Facile, Pro e 1v1: 0%;
  - colpi giusti: almeno 73%;
  - serie di 14 colpi uguali coerente;
  - mancino a specchio, sensori al contrario, ritardo.
- **Una sessione registrata con un telefono vero** (`diag.mjs direzione`), prima e dopo. Senza, si scrive «non verificato».

---

## (c) Decisioni dell'utente che toccano B36

1. **B36 si fa dopo B35a e B35b, senza toccarli.** Nessun codice finché l'utente non approva il piano (`docs/TRACCIA_PASSI.md:500-514`).
2. **All'inizio niente palle corte né volée** (`:504`). Leggo «fuori dal perimetro di B36, regole di oggi invariate», non «tolte dal gioco»: toglierle romperebbe il B31, la T2.3, le 11 schede del tutorial e Combo [D]. Va confermato con l'utente.
3. **23/10: il livello cambia la precisione chiesta, non dove va la palla** (`natpf_stroke_outcome.js:186-188`).
4. **29/10: angolazione più sensibile**, niente palle «sempre al centro»; il piatto da solo arriva alle righe (`:24-36`). Il colpo super è deciso dal gesto, mai a caso (`:391-410`).
5. **31/10:**
   - in risposta al servizio la schiacciata solo se voluta;
   - il pallonetto profondo resta schiacciabile al volo.
6. **B16 (a):** la Leggenda è più dura grazie alla CPU, non con regole più severe per chi gioca; i criteri si controllano sempre (`docs/PROJECT_MEMORY.md:196`).
7. **B16 (d):** la sensibilità della mira (17°, 20°, 23°) è un'opzione dello staff nel pannello dello stand, non dei visitatori (`:204`).
8. **11/11: Pro resta com'è**, con «medio» al 70–85% dei game (`:761`).
9. **12/11: nessun vantaggio di punti.** L'aiuto è solo di gioco e dichiarato a schermo; obiettivo circa 40%, mai oltre 50% (`:783-787`).
10. **12/11, B28:** calibrazione giocando; ogni partita riparte da capo (`:147`); nessuna schermata chiede un gesto per andare avanti (`:137`); regola dei due versi per il segno.
11. **13/11:**
    - la Leggenda resta com'è, con la salita a rete automatica (`docs/TRACCIA_PASSI.md:450`);
    - le decisioni 3–8, 12 e 13 della revisione finale restano come sono: tra queste, la finestra della Leggenda che si stringe negli scambi lunghi;
    - km/h veri; in classifica prima le vinte; scritte «in corsa» solo con la corsa forte;
    - scia spenta di base e fine partita con cose positive (B35b).
12. **04/11 e 28/10:**
    - allo stand: un PC, ledwall, stesso schermo, allenamento, minigiochi, al più 1v1 contro la CPU; la sfida tra due PC non si sviluppa;
    - niente clip video generate per i gesti;
    - voce solo in inglese, con licenza.
13. **Processo (12/11, 23:20):**
    - un agente per blocco e un revisore indipendente alla fine della serie;
    - al più due agenti insieme;
    - pacchetti a ogni versione;
    - dire sempre come si attiva ogni opzione.

---

## (d) Rischi principali di regressione

1. **Equilibrio contro la CPU** (ordinati per probabilità).
   - Più angoli e più profondità alzano gli errori della CPU (angolo e profondità moltiplicano, `natpf_skill.js:734-752`) e i vincenti.
   - Rischio concreto: Esperta oltre l'85%, Leggenda sotto l'85% contro «tennista», Evento che va al tetto (l'adulto vince più di 65 punti e il livello perde senso).
   - La classifica (`LEVEL_WEIGHT`) si sbilancia.
2. **Banchi verdi per la ragione sbagliata.** I giocatori simulati codificano la mappa vecchia (sezione K).
3. **Aiuti e livelli svuotati.** Bambini, aiuto nello stesso schermo e difficoltà della Leggenda passano dal canale del tempo (C2, D1). Se la direzione si sposta su un altro canale, la scala dei livelli si appiattisce e la decisione del 23/10 non regge più senza un equivalente sul canale nuovo.
4. **Tutorial e testi incoerenti con l'algoritmo.** Riguarda testi «cima verso il centro, un attimo prima», pose AIM_TURN, giudizi dell'allenamento, Combo, Precision, prova guidata di B35a, suggerimenti per webcam e mouse (G1–G4).
5. **Segni e compatibilità.** Un segnale nuovo non girato con il verso ripete il difetto 1 del collaudo. Poi telefoni con la pagina vecchia, P2 di un'altra versione, messaggi oltre 16300 byte.
6. **Mancino e P2 non più speculari** per un termine nuovo asimmetrico.
7. **Fuori e in rete senza spiegazione.** «Fuori · troppo presto» viene solo dal voto del tempo (`natpf_shot_feedback.js:43-60`). Un fuori dovuto al piatto o al percorso direbbe una causa falsa, o nessuna, sul computer e sul telefono.
8. **Bersaglio e rimbalzo vero** (A11). Correggere l'aria cambia quante palle escono; non correggerla lascia «direzione voluta ≠ punto d'atterraggio» di circa il 13%.
9. **Effetti indiretti.**
   - Più profondità → più salite a rete automatiche → più volée (A7).
   - Il super scatta più o meno spesso.
   - L'anello del momento giusto spinge al tempo neutro, cioè al centro (A10).
10. **Osservabilità e documenti.**
    - Campi nuovi persi dal Worker non ricaricato (H2).
    - Falsi «ricalibrare» nella guida dello staff (I2).
    - Unione con B35a sugli stessi punti di `natpf_stroke_outcome.js`, `natpf_gestures.js`, `swing-message.js`, `phone-sim.mjs`.
    - Il documento divergente su Leggenda e rete (`docs/PROJECT_MEMORY.md:832`).

Non ho lanciato test, audit, build o prove nel browser. Oltre ai tre script piccoli citati sopra, i numeri dei banchi vengono dai documenti (B34, B35a) e vanno rimisurati sulla base unita.