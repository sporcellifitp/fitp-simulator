# B35a letto per costruirci sopra B36 (stato alle 11:13 UTC, sola lettura)

Legenda: **[V]** = verificato nel codice, nei commit o nei file di risultati; **[D]** = dedotto o calcolato da me.
Percorsi relativi alla worktree B35a `/home/user/foro-italico-world/.claude/worktrees/wf_a87c484e-11a-1`, salvo dove indicato.

## 0. Stato del ramo
- **Commit [V].** Ramo `b35-precisione-telefono`, base `d152035`, 7 commit: d571581, fb4ee73, a0112ac, f219338, e47d200, 25a6174, 6d3ac20 (11:08). Albero pulito.
- **Non è unito [V].** `natpf-simulator` (94442a3) dopo d152035 ha solo commit «Traccia» e la versione 13.7. La traccia dice «B35a e B35b andranno nella 13.8» (docs/TRACCIA_PASSI.md:478).
- **Il documento è una bozza [V].** `docs/b35/precisione-telefono.md` ha ancora il segnaposto «VERIFICHE_DA_COMPLETARE» al §8 (riga 293). L'immagine citata alla riga 287 (`img/b35-prova-guidata-incrociato.jpg`) non esiste ancora. B35a è nella fase delle verifiche.
- **Verifiche negli appunti di B35a** (`/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b35/`):
  - npmtest2.txt (11:02) [V]: 1426 test, 1425 ok, 0 falliti, 1 saltato. Che sia girato su 25a6174 lo deduco dall'ora [D].
  - npmtest1.txt (10:41) [V]: 4 falliti, di un tentativo precedente.
  - legend-dopo.txt [V]: tutti OK, ma solo i blocchi Leggenda. Il criterio «pro contro medio 70–85 %» (scripts/audit/legend.mjs:165) lì non compare.
  - Impronte rally-balance [V]: 5 profili × 3 livelli, identiche prima e dopo (fp-prima.txt = fp-dopo.txt).
- **B35b non tocca la direzione [V].** Ramo `b35-collaudo`, HEAD fbc4026. In game_engine.js cambia solo `bannerSub` (circa 1263–1272); natpf_trial.js cambia il flusso verso la pagina «Pronto». Unico file in comune con B35a: `test/natpf-scambi-di-prova.test.mjs`, in test diversi.

## 1. Cause trovate e misure
Tutte le misure vengono dal telefono simulato (banco deterministico). Nessuna prova con un telefono vero: quale causa valesse nel collaudo resta ignoto (documento B35a, §9).

**Causa 1 · Sensori al contrario.** Era il difetto «volevo incrociare e usciva lungolinea».
- **Meccanismo [V].** Quando il gioco (scambi di prova) o il telefono (voto del rilevatore) giravano il verso del colpo, si giravano `dir`, `aim` e `twist`, ma non la direzione del piatto (`heading`, `face`). L'incrociato diventava lungolinea e viceversa.
- **Numeri [V]** (Pro, gesto buono, semi 1,2; incrociato voluto → % incrociato / % lungolinea):

  | Calibrazione | prima | dopo |
  |---|---|---|
  | «Salta», sensori al contrario | 11 / 66 | 70 / 0 |
  | scambi di prova, sensori al contrario | 18 / 57 | 78 / 0 |
  | stesse due, persona vera | 19/59 e 23/49 | 64/14 e 67/9 |

  Lungolinea voluto → incrociato: 39 % → 1 % e 53 % → 0 %.
- **Sfumatura importante [V]** (prima-1,2.txt). Il 25 % di «incrociato → lungolinea» nella tabella generale viene tutto dalle 2 calibrazioni su 5 con i sensori al contrario. Con rapida, «Salta» e scambi di prova era già 0 % prima (76/24/0, 72/28/0, 78/23/0).

**Causa 2 · Il centro della mira inseguiva una mira tenuta** (calibrazione con gli scambi di prova) [V].
- Serie di 14 dritti incrociati del destro.
- Seme 1: prima `I×7 c×7` (7/14), dopo 12/14. Seme 3: 11/14 → 13/14.

**Causa 3 · Schermo in ritardo non misurato:** tutto lungolinea, poi fuori di lato.
- **Finestre [V]** (calcolate con i moduli della worktree; Pro, 18 m/s):
  - anticipo pieno 150 ms, ritardo pieno solo 78 ms (58 ms a 24 m/s);
  - il vecchio tetto del ritmo (±0,6 unità) prendeva 90 ms di anticipo e solo 47 ms di ritardo.
- **Numeri [V]** (Pro, gesto «naturale», 3 calibrazioni, destri e mancini):

  | Ritardo costante | incrociato → incr. / lung. | lungolinea → fuori | giusti | fuori o rete |
  |---|---|---|---|---|
  | 1,2 finestre (~93 ms), semi 1,2 | 28/21 → 64/2 | 63 → 20 % | 27 → 66 % | 24 → 8 % |
  | 1,8 finestre (~140 ms), semi 1,2 | 0/77 → 44/1 | 100 → 41 % | 0 → 50 % | 60 → 15 % |
  | 1,2 finestre, semi 3,4 | – | – | 29 → 69 % | 23 → 6 % |
  | 1,8 finestre, semi 3,4 | – | – | 1 → 51 % | 60 → 17 % |

  Fino a 0,6 finestre non cambia niente. Nel confronto `--fuori` (Pro, tempo −1,2, tre gesti): fuori 25 → 9 %, giusti 29 → 62 %.

**«Tanti colpi fuori»** [V].
- Con il gesto buono, a Pro, 1v1 e Casual: 0 % fuori prima e dopo, anche in corsa (dopo-casual.txt, dopo-1v1.txt).
- I fuori vengono solo da due cose:
  - il tempo oltre la finestra in ritardo (causa 3);
  - Leggenda in corsa. È la regola del livello, lasciata com'è: assistenza solo sopra qualità 0,8 (`assistQ`, natpf_stroke_outcome.js:215). Fuori 18 → 19 % con i semi 1,2 e 22 → 22 % con i semi 3,4.
- Leggenda in corsa, dettaglio dopo B35a: gesto «naturale» 14 %, «vicino» 5 %, «riga» 38 %. L'incrociato voluto con «riga» esce il 69 %. Con la mira bassa (23°) il totale scende a 11 %.
- Mio controllo con il banco (`b35a-lettura-cause-fuori.mjs`) [V]: **tutti i fuori sono di lato**. Nessuno lungo, in rete o fallito, sia a Leggenda in corsa sia con il tempo in ritardo.

**Totali** [V].
- Pro, gesto buono: giusti 58 → 73 % (semi 1,2) e 56 → 71 % (semi 3,4).
- Matrice dopo (incrociato / centro / lungolinea ottenuti):
  - voluto incrociato: 75 / 26 / 0;
  - voluto centro: 10 / 78 / 13;
  - voluto lungolinea: 0 / 34 / 66.
- Persona vera: giusti 40 → 49 % e 42 → 52 %; incrociato → lungolinea 28 → 11 % e 23 → 6 %; lungolinea → incrociato 33 → 19 % e 29 → 20 %.

## 2. Correzioni salvate [V]
Righe della worktree a 6d3ac20.

**fb4ee73 · Sensori al contrario e centro della mira**
- `natpf-tennis/src/natpf/natpf_trial_learn.js`
  - 115–121: `signedSwing(s, sign)` gira insieme `dir`, `aim`, `twist`, `heading`, `face.yaw` e `face.aim`.
  - 203: nel profilo imparato, `faceRef[d].heading` moltiplicato per il segno.
- `natpf-tennis/src/natpf/natpf_phone_racket.js`
  - 765: `s = signedSwing(s, this.learner.sign)`.
  - 768–769: quando il telefono gira il verso da sé (`absSign`), ripartono `aimModel`, `riseModel` e `faceModel`.
  - 891: il centro della mira è seminato dagli scambi di prova con `{ trusted: true }`.
- `site/js/tennis/swing-detect.js:437`: `sw.absSign = -1`.
- `site/js/tennis/swing-message.js`: 17 gira `yaw` e `abs`; 29 aggiunge il campo `sg: -1`; 48 lo legge come `absSign`.
- `natpf-tennis/src/natpf/natpf_gestures.js`
  - 159–160: `AIM` con `alphaTrusted .03` e `biasDevTrusted 22`.
  - 174–178: `seed(dir, heading, { trusted })` e `trusted(dir)`.
  - 187: la verifica dei primi colpi toglie la fiducia.
  - 196 e 202: con il seme affidabile valgono `alphaTrusted` e `biasDevTrusted`.

**e47d200 · Ritardo abituale**
- `natpf_stroke_outcome.js`
  - 244: `RHYTHM` con `insideLate 2,2`, `lateMax 2,2`, `lagQ ,9`, `lagKeep 10`, `lagMin 8`, `lagFrom ,045`, `lagRamp ,03`, `lagMax ,1`.
  - 246–266: `createRhythm` con `add(t, secs)`, `value` e `lag`.
  - 304: `strokeOutcome` riceve `rhythmLag`.
  - 322–328: `unitsOf`, `lag`, `te`, `excess`, `rRest`.
  - 354: `aimT = te − rRest`.
  - 356: la spinta fuori usa `sign(te)`.
  - 419: l'esito restituisce `lag`.
- `game_engine.js:2351–2352`: `rhythmLag: rhythm.lag` e `rhythm.add(out.t, e.natpfTau)`.
- `diag_recorder.js:264`: campo `ritardoAbitualeMs` nel registro.

**a0112ac · Analisi delle sessioni registrate**
- `src/natpf/diag/diag_direction.js` (nuovo).
- `scripts/diag/diag.mjs`: comando `direzione`.
- `diag_protocol.js:20–23`: i suggerimenti dicono «cima del telefono verso il centro / verso l'esterno».

**Banco e documento**
- d571581, f219338, 25a6174: `scripts/audit/direzione-telefono.mjs`.
- 6d3ac20: documento e prova nel browser del suggerimento (`tools/e2e/natpf-diag-session.mjs:238–245`).

**Test**
- `test/natpf-b35-direzione.test.mjs`: 10 test nuovi.
- `test/natpf-scambi-di-prova.test.mjs:110` e `:327–329`: centri della mira girati.
- `test/phone-sim.mjs`.

**In corso:** solo verifiche e schermata. Nella worktree non c'è codice in sospeso [V]. Altre modifiche sono possibili solo se una verifica fallisce [D].

## 3. Strumenti riutilizzabili e numeri di partenza

**a) Banco della direzione**
```sh
cd natpf-tennis
node --import ./test/register.mjs scripts/audit/direzione-telefono.mjs [--seeds=1,2] [--n=4] [--level=pro] [--quick] [--serie] [--fuori] [--ritardo] [--json=f]
```
- **Cosa stampa [V]** (riga 25 e 185–223):
  - matrici voluto → ottenuto (`in/ce/lu/fu %`, giusti, fuori) per gesto buono e persona vera;
  - righe per mano × colpo, per le 5 calibrazioni e per i 5 gesti;
  - la stessa cosa in corsa;
  - `--serie`: 14 colpi uguali in lettere `I/c/L`;
  - `--fuori` e `--ritardo` come nella §1.
- **Esporta** `stroke`, `strike`, `match`, `serie`, `matrix`, `audit`, `report`, `got`, `LINE`, `MODELS`, `NOISE`, `CALS`, `WANTS` (righe 43–183).
- **Costo:** misurato 16 partite in 1,8 s e 36 partite in 6,5 s. Il banco completo, stimato, dura 1–1,5 min [D]; non l'ho lanciato.
- **Numeri di partenza per B36:** i «dopo» della §1.
- **Limiti [V]:**
  - 3 fasce sole, con soglia di 1,25 m dal centro (113–114).
  - Una sola situazione di palla: 18 m/s, palla a z 10,9 e 0,6 m di lato, giocatore a x = 0 (94–101). Il punto d'impatto e il punto neutro (`neutralX`, che segue la palla del 40 %, natpf_stroke_outcome.js:285) non vengono esplorati.
  - `Math.random` fissato a 0,5 (92).
  - Il «fuori» è giudicato sull'esito senza la tolleranza del motore, che è +0,22 di lato e +0,28 in fondo (riga 105 contro game_engine.js:3187–3188).
  - Forza 1 ± 0,15 (131): la profondità non viene esplorata.
  - I gesti «piatto» (giro attorno alla verticale, riga 76) e «polso» (arco spostato, riga 81) cambiano entrambi solo la direzione del piatto all'impatto. Le matrici sono uguali (71/29/0) [V]. Il banco quindi non può simulare una traiettoria del braccio diversa dal piatto [D].

**b) Misure continue con la stessa catena** (`b35a-lettura-continuo.mjs`) [V].
Pro, scambi di prova, destri e mancini, semi 1,2. `xc` = metri dal centro verso l'incrociato; profondità in metri dalla rete; «sd» = dispersione dello stesso voluto.

| Gesto | Voluto | xc p10 / p50 / p90 | profondità p50 | sd |
|---|---|---|---|---|
| naturale, buono | incrociato | 1,06 / 2,40 / 3,99 | 8,34 | 0,92 |
| naturale, buono | centro | −0,95 / 0,13 / 1,14 | 9,19 | 0,85 |
| naturale, buono | lungolinea | −3,94 / −1,90 / −0,59 | 9,05 | 1,08 |
| «riga» | incrociato | p50 3,94 | 7,21 (stretto più corto, natpf_stroke_outcome.js:373) | 0,34 |
| «riga» | lungolinea | p50 −3,51 | – | 0,65 |
| naturale, persona vera | tutti | – | – | 1,6–2,1 (il centro voluto cade da −3,0 a +2,5) |

Il calcolo torna con il codice [D]: 5° di piatto ≈ 1 m (natpf_stroke_intent.js:62), quindi ±12° di rumore ≈ ±2,3 m; ±0,45 finestre di tempo ≈ ±1,6 m.

**c) Serie estese** (`b35a-lettura-serie-tempo.mjs`) [V]. B35a aveva misurato le serie solo con gli scambi di prova.
- Solo il tempo tenuto («tempo»): incrociato 4–7/14 (seme 1: ultimi 7 tutti persi), lungolinea 2–3/14, con tutte le calibrazioni. Il ritmo personale assorbe la scelta (natpf_stroke_outcome.js:258–262 e 354).
- Calibrazione rapida e «Salta», incrociato con il piatto, seme 1: ancora `I×7 c×7`. La correzione B35a vale solo con il seme degli scambi di prova (`play` è la calibrazione predefinita, natpf_trial_learn.js:42).
- Lungolinea tenuto: 4–9/14 con tutte le calibrazioni. Lo spiega lo spostamento lento del centro per gli scarti oltre 10° (0,03 a colpo, natpf_gestures.js:196): un piatto tenuto a 12° vale circa 8° dopo 14 colpi [D].

**d) Sessioni vere**
- `node scripts/diag/diag.mjs direzione sessione.zip [--blocchi=di,dl,ri,rl] [--righe]`. Funziona con la prova guidata (Maiusc+D) o con i segni Maiusc+M.
- Stampa: voluto → ottenuto, piatto e tempo nel verso giusto (mediani), colpi oltre la finestra, ritardo abituale, cause dei fuori, segno dei sensori, frasi semplici.
- L'evento `racchetta` (diag_recorder.js:264–276) registra piatto, tempo, tempoMs, oltre, x, z, lato, mira, neutro, palla, aiuto e miraPiena.
- Strumenti già esistenti prima di B35a:
  - `scripts/audit/zip-replay.mjs`: rigioca i campioni grezzi nella catena del telefono, anche con un rilevatore di prima (`--prima`);
  - `replay-recording.mjs`;
  - `colpi.mjs --mode=lato`;
  - `lato-palle.mjs`;
  - `legend.mjs`.
- Nessuna sessione vera esiste ancora.

**e) Test che fanno da paletti**
- `natpf-b35-direzione.test.mjs:101–113`: incrociato → lungolinea = 0 e lungolinea → incrociato = 0 nel motore, con scambi di prova, scambi al contrario e «Salta» al contrario.
- `:202–209`: con il ritardo, fuori ≤ 8 %, incrociato ≥ 50 %, lungolinea ≥ 60 %.

## 4. File toccati da B35a e rischio di conflitto con B36
| File (righe B35a) | Cosa farà probabilmente B36 | Rischio |
|---|---|---|
| natpf_stroke_outcome.js (244–270, 304, 322–328, 354–356, 419) | Formula della mira, punto d'atterraggio, assistenza, profondità | **Alto** |
| natpf_gestures.js (159–202, `AIM` e `createAimModel`) | Sensibilità e centro della mira | **Medio-alto** |
| game_engine.js 2351–2352 | Nuovi ingressi della chiamata a `strokeOutcome` | Medio (stessa riga) |
| swing-message.js (17, 29, 48) e swing-detect.js 437 | Nuovi campi del messaggio (per esempio la traiettoria del braccio) | Medio (stessa espressione `return`) |
| natpf_phone_racket.js (765–769, 891) e natpf_trial_learn.js (115–121, 203) | Nuovi segnali in `natpfSwingToEngine` | Basso-medio |
| diag_direction.js, diag.mjs, diag_protocol.js, banco | Estensioni (metriche continue, esercizi nuovi) | Basso (si aggiunge) |

Non toccati da B35a, quindi liberi [V]: natpf_stroke_intent.js (`faceAimFromDev`, `faceDead` 3 e `faceSpan` 14), natpf_aim_level.js, natpf_impact.js, face-tracker.js, stroke-shape.js, gesture-intent.js.

Regola [D]: B36 parte dopo l'unione di B35a nella 13.8 e tiene la semantica di `te`, `rRest` e `lag`. Il tempo per la direzione deve restare `te − rRest`, la spinta fuori deve restare `sign(te)·excess`, e `out.lag` deve restare nel registro. Prima di allora B36 può solo aggiungere file nuovi (banco).

## 5. Cosa B35a lascia aperto per B36
1. **La traiettoria del braccio non conta** (documento §9, righe 308–309). Con i telefoni aggiornati la direzione viene solo dal piatto all'impatto (`intent.face` da `faceAimFromDev`, natpf_stroke_intent.js:232) e dal tempo. `dirX`, `wrist`, `twist` e `aim` non entrano: `eventIntent` restituisce `n.intent` (natpf_stroke_outcome.js:506–508). Il telefono calcola ancora una vecchia `aim` da rotazione del polso e ampiezza (site/js/tennis/gesture-intent.js:48–50). È il cuore della richiesta dell'utente.
2. **Le scelte tenute svaniscono:** il tempo assorbito dal ritmo, il piatto oltre 10° che sposta lentamente il centro, e la calibrazione rapida e «Salta» con la regola di prima (§3 c). Va contro il punto 5 dell'utente, la coerenza.
3. **Il lungolinea è più difficile dell'incrociato.** Lungolinea → centro 34 % contro incrociato → centro 26 %. Con il solo tempo, lungolinea giusto 44 %. Il ritardo pesa il doppio dell'anticipo: 10 ms valgono circa 0,47 m contro 0,24 m [D].
4. **Coerenza con la persona vera:** dispersione 1,6–2,1 m per lo stesso voluto, contro 0,9–1,1 m con il gesto buono.
5. **Precisione o rischio.** A Pro l'assistenza tiene dentro anche «riga» (0 % fuori: mirare alla riga non costa niente). A Leggenda in corsa «riga» incrociato esce il 69 %. Va deciso il modello del rischio, con un vincolo: limitare la mira rendeva il giocatore troppo forte (84 → 91 % dei game, natpf_stroke_outcome.js:41–42; criterio 70–85 % in legend.mjs:165).
6. **Profondità, colpi stretti e punto d'impatto mai misurati da B35a.** Nel banco nessun fuori lungo.
7. **Strumenti da estendere:** esercizi della prova guidata per la profondità e i colpi stretti; metriche continue a zone in diag_direction, che oggi ha 3 fasce con soglia `DIR_LINE` 1,25 m.
8. **Da rifare con ogni cambio di regola:**
   - i suggerimenti della prova guidata e le dimostrazioni del tutorial (diag_protocol.js:20–23, natpf_training.js, natpf_gesture_motion.js), che devono seguire la regola nuova;
   - le impronte delle partite, che B36 cambierà per forza.
9. **Mai provato con un telefono vero:** né il telefono, né la misura del ritardo dello schermo, né la webcam. Serve la sessione registrata descritta al §1 del documento B35a.

I miei script, tutti di sola lettura, sono in `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b36/agenti/`:
- b35a-lettura-tempo.mjs
- b35a-lettura-continuo.mjs
- b35a-lettura-finestre.mjs
- b35a-lettura-cause-fuori.mjs
- b35a-lettura-serie-tempo.mjs

Si lanciano dalla cartella `natpf-tennis` della worktree con `node --import ./test/register.mjs <script>`.