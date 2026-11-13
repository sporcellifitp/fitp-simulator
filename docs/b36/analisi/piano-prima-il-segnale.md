# B36 · Piano tecnico «prima il segnale» (direzionalità al centro, campo aperto, arcade)

**Base.** `natpf-simulator` 1d0f6a5 (versione 13.8, con B35a unito in c22b6e8). B35b (`b35-collaudo`, d2a0aad) non è ancora unito. Tocca `game_engine.js` (~10 righe del banner), `natpf_trial.js`, `natpf_match_stats.js` e altro, non la direzione. Nessun file del repository è stato toccato.

**Legenda.** **[V]** = verificato nel codice a 1d0f6a5 oppure con un mio script. **[D]** = dedotto o proposto. **[L:x]** = preso dalla lettura «x» e non riverificato.

**Script** (tutti in sola lettura, nella cartella `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b36/agenti/`):
- `segnale-prese.mjs` e `segnale-prese36.mjs`
- `segnale-pronto.mjs` e `segnale-hz.mjs`, che usano le copie modificabili in `sim36/`: frequenza `HZ`, posa «pronto» ferma o svelta, deriva `GYRO_BIAS`
- `mappa-b36.mjs`, `mappa-b36-lib.mjs`, `mappa-b36-ablazione.mjs`, `mappa-b36-riferimento.mjs`
- `profondita-b36.mjs`

Si lanciano da `natpf-tennis` con `[HZ=30] node --import ./test/register.mjs <script>`; quelli `mappa*` e `profondita*` non hanno bisogno di `--import`.

Il telefono è simulato: sensori ideali e braccio di `test/arm-sim.mjs`. **Nessun telefono vero.**

---

## Premessa: cosa il telefono misura bene (prove fatte per questo piano)

**P1 · La presa non conta [V sim].** Ho provato quattro prese (foto, palmo 65°, martello 80°, pugno 30°), destro e mancino. Lo stesso gesto dà lo stesso Δfh entro 0,2° su tutte le prese:

| gesto | foto | palmo 65° | martello 80° | pugno 30° |
|---|---|---|---|---|
| corpo girato −20° | 21,6° | 21,6° | 21,7° | 21,7° |
| impatto spostato −8° nell'arco | 13,6° | 13,6° | 13,6° | 13,6° |
| gesto ×0,7 | 6,9° | 6,9° | 6,9° | 7,0° |

- La ragione è la scomposizione attorno alla gravità (`site/js/tennis/face-tracker.js:82`, `:167`).
- `fh` ≈ `base` + `fy` entro 0,3°.
  - Il corpo girato prima del colpo cambia solo `base`, 1:1.
  - L'impatto spostato nell'arco cambia `fy` di circa 1,1 volte lo spostamento.
  - La pronazione (da 0 a ×2) e un tremolio di 150 °/s spostano `fy` di 0,3° al massimo.
- Mancino: si ottengono gli stessi valori a specchio, entro 0,6–1,3° dopo la correzione della posa «pronto» descritta in P3.

**P2 · Oggi la velocità del colpo e la frequenza dei sensori entrano nella direzione [V sim].**
- Lo stesso dritto (picco 714 °/s) dà `fh` −5,9° a 60 Hz e −10,8° a 30 Hz.
- Un gesto da ×0,7 a ×1,3 sposta `fh` di 3,8° a 60 Hz e di 7,4° a 30 Hz.
- Leggendo il piatto a `peakT − dt/2`:
  - gli scarti scendono a −0,5° (60 Hz) e −0,9° (30 Hz);
  - le escursioni con la velocità scendono a 1,5° e 2,0°.
- Le pendenze restano 1:1: −0,98 e −1,03 a 60 Hz, −1,01 e −1,01 a 30 Hz.
- La fase dei campioni conta poco: 0,8–0,9°.
- Causa [D]: l'istante del picco viene dai campioni della velocità (`swing-detect.js:266-273`, `:354`), mentre l'orientamento è integrato con la velocità di fine intervallo (`face-tracker.js:112-123`, `:175-184`). Ne nasce uno sfasamento di mezzo campione, che vale (dt/2)·ω.
- Se il browser vero si comporta come il simulato **va misurato**: basta una regressione di `fh` sul picco.

**P3 · La posa «pronto» assorbe le mire tenute e crea mire fantasma [V sim].** Oggi la posa segue il telefono fermo (`face-tracker.js:126`; `racchetta.js:39`: quietHold 400 ms, relax 2,5 s). Ho provato due varianti:
- «ferma»: la posa non si muove mentre la palla arriva;
- «ferma+svelta»: come «ferma», e in più a palla lontana la posa segue in fretta (dopo 300 ms fermo, costante 0,5 s).

| prova | oggi | ferma | ferma+svelta |
|---|---|---|---|
| corpo girato −15° tenuto con la palla in arrivo: resta dopo 0,3 / 1 / 2 s | 103 / 83 / 56% | 103 / 104 / 104% | 101 / 102 / 103% |
| mira fantasma dopo un colpo girato di −20° e tenuto 2 s (riposo 0,5 / 1 / 1,5 s) | −7,6 / −6,3 / −5,1° | circa −0,3° | 0,0 / −0,8 / −0,8° |
| deriva 0,8 °/s per asse, «Giocando» (deriva non tolta): Δfh dopo 20 colpi | −6,4° | −15,2° | −0,8° |

A 30 Hz le conclusioni sono le stesse: con ferma+svelta la mira tenuta resta all'87–93%, la mira fantasma è al massimo 1,2° e la deriva 0,6°.

**P4 · Mappa laterale: la regola vera di oggi (`strokeOutcome`) contro il prototipo B36 [V calcolo].** Ipotesi: Pro, dritto con la palla a hitX 0,72, 18 m/s, ritmo 0; zone come il banco B35a (soglia ±1,25 m).
- Il calcolo è tarato sul banco: oggi, con voluto ±12°, dà 75% (gesto buono) e 52% (persona vera); il banco B35a dà 73% e 49–52%.
- Oggi con voluto ±18° contro il prototipo Pro (A 20°, tempo 0,3):

| | oggi | prototipo |
|---|---|---|
| colpi giusti, gesto buono | 88% | 96% |
| colpi giusti, persona vera | 59% | 72% |
| fuori, persona vera | 2,6% | 0,3% |
| sd laterale dello stesso voluto (gesto buono), angolo / centro | 0,89 / 1,17 m | 0,57 / 0,71 m |

- **Ablazione:**
  - portare il peso del tempo da 1 a 0,3 vale +7–8 punti (gesto buono) e +7–9 (persona vera);
  - i gradini (β da 0 a 0,85) valgono al massimo +1 punto e riducono la sd di circa 0,1 m;
  - in cambio la cella più piena passa dal 10,1% al 14,6% (6,3% se uniforme): sono **calamite che non servono**.
- **Riferimento sbagliato** di 0 / 4 / 6 / 8 / 12° → colpi giusti 96 / 90 / 84 / 75 / 57% (gesto buono). Il centro è il collo di bottiglia: deve sbagliare di **4° al massimo**.

**P5 · Profondità dalla forza [V calcolo].**
- Il colpo tipico ripetuto (±10%) cade a ±0,34 m: già buono.
- La persona vera (±30% del colpo tipico) cade a ±1,06 m.
- I gradini e un piano largo non aiutano: da ±1,06 a ±0,95 m, e il colpo morbido voluto peggiora (da ±0,42 a ±0,61 m).

**Conclusione «prima il segnale».**
1. Il comando principale è lo **scarto del piatto dal proprio centro** (`dev`), con due correzioni sul telefono (P2, P3) e un **centro che non impara dai colpi mirati** (P4).
2. Il **tempo** diventa un ritocco (peso ≈0,3) più un errore con un verso preciso oltre la finestra.
3. Le «poche zone chiare» stanno **nei gesti** (neutro, girato di circa A, girato oltre 1,3A) e nel riscontro, con A scelta sul rumore misurato. **Non** stanno in calamite dentro la mappa, che resta continua: la decisione già scritta in `natpf_stroke_outcome.js:9-11` resta valida.
4. La profondità resta continua; la varietà viene dal **tipo di colpo** (un segnale a categorie) e dall'**angolo corto voluto**.

---

## 1. Obiettivi misurabili

**Strumenti.**
- `scripts/audit/direzione-telefono.mjs` esteso (B35a): `--model=b35|b36`, gesti B36, 5 zone laterali e la profondità.
- `scripts/audit/b36/mappa.mjs`, rapido.
- La sessione vera con `scripts/diag/diag.mjs direzione`.

**Rumore.**
- «Gesto buono»: piatto ±5°, tempo ±0,25.
- «Persona vera»: ±12°, tempo +0,35 ±0,45 (B15/B35a).
- «Bambino»: ±16°, ±0,6. È un'**ipotesi**, da sostituire con la sessione vera.

**Voluto.** 0 / ±A / ±1,3A (riga).

| Criterio | Bambini | Evento / Ragazzo | Pro / 1v1 | Leggenda | Oggi (B35a, Pro) |
|---|---|---|---|---|---|
| Zona giusta (3 zone), gesto buono | ≥95% | ≥95% | ≥93% | ≥90% | 73% |
| Zona giusta, persona vera | ≥72% | ≥70% | ≥68% | ≥65% | 49–52% |
| Incrociato ↔ lungolinea scambiati: buono / persona | 0 / ≤2% | 0 / ≤2% | 0 / ≤2% | 0 / ≤2% | 0 / 6–20% |
| Fuori da fermo, gesto buono | 0% | 0% | 0% | 0% (in corsa ≤ oggi, 18–22%) | 0% |
| Fuori, persona vera | ≤1% | ≤1% | ≤2% | ≤4% | 2,5% (calcolo) |
| sd laterale dello stesso voluto, buono | ≤0,5 m | ≤0,6 m | ≤0,7 m | ≤0,9 m | 0,85–1,08 m |
| sd laterale, persona vera | ≤1,3 m | ≤1,4 m | ≤1,4 m | ≤1,6 m | 1,6–2,1 m |
| Serie di 14 colpi uguali (mira tenuta), tutte le calibrazioni | ≥13/14 | ≥13/14 | ≥13/14 | ≥13/14 | 7/14 con rapida e «Salta» |
| «Riga» voluta: oltre 3,4 m (buono) / fuori (buono, persona) | ≥80% / 0, ≤1% | ≥80% / 0, ≤1% | ≥80% / 0, ≤2% | ≥75% / 0, ≤3% | — |
| Zone raggiungibili quando volute (buono, q=1) | ognuna ≥80% | ognuna ≥80% | ognuna ≥80% | ognuna ≥80% | profondo incrociato irraggiungibile [L:esito] |
| Rimbalzo vero − bersaglio (di lato) | ≤0,25 m | ≤0,25 m | ≤0,25 m | ≤0,25 m | 0,35–0,6 m [L:esito] |

**Zone** (nel riferimento di chi colpisce, specchiate per rovescio e mancini), da controllare dal centro e dai due angoli, di dritto e di rovescio:
- profondo incrociato: |x| ≥ 2,6 m dall'altra parte, d ≥ 9 m;
- profondo lungolinea: |x| ≥ 2,6 m dalla stessa parte, d ≥ 9 m;
- centro profondo: |x| ≤ 1,2 m, d ≥ 9,5 m;
- angolo corto: |x| ≥ 3,0 m, d 4,5–7 m;
- inside-out e inside-in: il dritto colpito dal lato del rovescio, verso l'incrociato e verso il lungolinea;
- riga: |x| ≥ 3,4 m.

Il riferimento del video 1 va nella stessa direzione: rimbalzi a 1–2 m dalle righe laterali e di fondo (`scratchpad/b36/video1/analisi-video1.md`; fogli 2 e 4 guardati).

**Segnale** (test di unità con il telefono simulato):
- tra le 4 prese |Δfh| ≤ 0,5°;
- destro e mancino a specchio entro 1,5°;
- gesto da ×0,7 a ×1,3: escursione di `fh` ≤ 2° a 60 e a 30 Hz;
- mira tenuta 2 s con la palla in arrivo: resta ≥95%;
- mira fantasma ≤1°;
- deriva di 0,8 °/s: ≤2° in 20 colpi.

**Telefono vero** (B36.0 e B36.10):
- errore del centro ≤4° dopo gli scambi di prova;
- σ del piatto per ogni voluto misurata e dichiarata.

**Equilibrio** (criteri invariati) [L:vincoli]:
- audit:legend:
  - «tennista»: CPU ≥85% (86,6);
  - «amatore»: errori della CPU 2–6% (2,2);
  - Esperta contro «medio»: 70–85% (75,2);
  - «preciso» ≥60%;
  - «medio» e «amatore» ≥90%;
  - «bambino» e «impreciso» ≥98%;
  - Facile contro «medio» ≥95%.
- Torneo ridotto in `npm test`.
- `cpu-pressione --obiettivi`.
- `evento-bambini`: adulto a 60–70 punti.
- b25: bambino contro adulto 38–42%.
- Con 24 o 40 semi.

---

## 2. Il modello

### 2.1 Chi governa cosa

| Uscita | Grandezza | Affidabilità |
|---|---|---|
| Lato del colpo, segno di c | `dir` (`swing-detect.js:333-351`) | Alta dopo B35a |
| Direzione laterale (comando principale) | `dev = fh_c − C_dir` | Strumento ≤2° dopo B36.1; umana da misurare |
| Ritocco laterale | tempo `aimT = clamp(te − rRest, ±1)` (`natpf_stroke_outcome.js:354`) | Strumento ±1 ms, umana ±0,45 finestre |
| Errore oltre la finestra | `excess` (`:327`), spinta `pushOut` (`:356`) | Si vede (voto, anello) |
| Profondità, velocità, altezza | forza (`strokePower`, `natpf_stroke_intent.js:84-89`) | ±30% umana |
| Arco ed effetto | forma: tipo (`classifyStroke`, `:107-145`) | A categorie |
| Angolo corto | `dev` oltre l'angolo + forza bassa | Somma di due segnali buoni |
| Rischio | `excess`, q (corsa, allungo, preparazione, palla veloce) | Si vede |

**Non entrano:** `tw`, `a`, `wrist`, `dirX` (misurano la pronazione) [L:telefono]; il percorso della mano dall'accelerometro.

### 2.2 Direzione laterale (formula)

Riferimento di chi colpisce, x positiva a destra, c = ±1 (`game_engine.js:2329-2331`).

```
dev  = fh_c − C_dir     (°, + a destra nel riferimento del campo; fh_c letto a picco − dt/2; C_dir fermo, §2.7)
       |dev| > 60°, fu, dir = 0 → dev = 0 («piatto non letto»: la palla va al centro, ± il tempo)
u    = clamp(dev/A, −1,6, 1,6) − c·kT·aimT
T(u) = u                                           per |u| ≤ 1
     = sgn(u)·[1 + (L/W − 1)·S((|u| − 1)/ρ)]       per |u| > 1   (S(s) = 3s² − 2s³ su [0,1]: fascia della riga, poi ferma)
xc   = f·clamp(hitX, ±W)                           f = 0,15 (oggi 0,4: :45, :285)
xF   = landingFromAim(T, xc, W)                    (:287, con xMax = W)
raw  = xF − c·sgn(te)·excess·pushOut               (come :356, pushOut per livello :196-215)
x    = raw + (sgn(raw)·softEdge(|raw|; L, L+0,2) − raw)·hold
hold = clamp(1 − excess/0,25)·clamp((q − assistQ)/0,1 + 0,5)   (come :338, con il ginocchio spostato da 3,1 m a L)
```

**Costanti uguali per tutti i livelli** (decisione del 23/10: `:186-188`):
- W = 3,2 m (angolo, 0,9 m dentro la riga);
- L = 3,85 m (riga);
- ρ = 0,45;
- f = 0,15;
- `natural` = 0 (oggi 0,1: `:24`);
- `widePull` tolto (`:67`, `:373`).

**Per livello (proposta, da tarare in B36.4):**

| Livello | A (°) | kT | Note |
|---|---|---|---|
| Bambini | 25 | 0,25 | finestra .28 e assistenza Casual come oggi |
| Evento («Adulto») | 22 | 0,30 | uguale alle dimostrazioni di oggi (`preYaw ±22`, `natpf_gesture_motion.js:111-114`) |
| Casual («Ragazzo») | 22 | 0,30 | |
| 1v1 | 20 | 0,30 | |
| Pro | 20 | 0,30 | |
| Leggenda | 18 | 0,35 | span .115 e spanPress restano |

- La «Mira del telefono» dello staff (`natpf_aim_level.js`; oggi 17/20/23°, `natpf_stroke_intent.js:185`) diventa alta/media/bassa = A × 0,85 / 1 / 1,15.
- β (gradini) = 0. Resta solo come parametro di prova per Bambini (0,3) se la sessione vera lo giustifica.

**Esempio** (Pro, prototipo [V calcolo]):
- dev 0 → x ≈ +0,1 m;
- ±20° → ±3,1 m;
- ±26° → circa ±3,45 m;
- da ±29° in su la palla resta a circa ±3,85 m: **il piatto da solo non manda mai fuori**.

### 2.3 Quanta dispersione resta e da cosa dipende

Dentro la fascia sicura: σx ≈ (W/A)·√(σdev² + (kT·A)²·σaimT²).
- A Pro valgono 0,16 m per grado di piatto e 0,96 m per finestra di tempo.
- Verifica: con il gesto buono la formula dà 0,83 m e il calcolo 0,81 m [V].

Le fonti sono tutte misurabili:
- la costanza del piatto (σdev);
- la costanza del tempo (σaimT, già nel ritmo);
- `excess`;
- q (assistenza).

Nessun termine casuale. La dispersione con il seme a rete (`:155-164`, `:356`) resta, ma fuori da B36. La diagnostica mostra le due σ di ogni giocatore.

### 2.4 Centratura evitata

Si tolgono o si riducono:
- la spinta naturale (0);
- il punto neutro (da 0,4 a 0,15);
- l'accorciamento automatico dell'incrociato (via);
- il bordo morbido 3,1→4,0 (sostituito dalla fascia della riga, `:57`, `:357`);
- la somma del tempo con peso 1 (`:27`), che con i versi opposti annullava il piatto;
- il centro della mira che impara dai colpi mirati (§2.7);
- l'aria che si mangiava il 12–15% dello spostamento laterale (§3, `natpf_skill.js:867-883`).

### 2.5 Righe e rischio (arcade)

- **Fascia sicura**, |x| ≤ W: il piatto non manda mai fuori.
- **Fascia della riga**, da W a L: ci si arriva solo con il gesto «oltre l'angolo». Con un'esecuzione pulita resta dentro a tutti i livelli.
  - Costa margine: con la palla a L bastano 0,54 unità oltre la finestra per uscire (circa 42 ms in ritardo a 18 m/s, Pro). Partendo da W ne servono 1,26 (circa 98 ms) [D: (4,335 − x)/0,9, con la tolleranza `natpf_shot_feedback.js:20`].
- **Fuori solo per il tempo oltre la finestra o per q sotto assistQ**, come oggi (Leggenda 0,8, `:215`). La scritta ha sempre una causa che si vede: «in ritardo», «in corsa» (`natpf_shot_feedback.js:43-60`).
- Mai fuori per il rumore del piatto: con σ 12° un «fuori da troppo angolato» colpirebbe il 18–25% delle mire all'angolo [D].

### 2.6 Profondità, altezza, potenza, tipo

- **Profondità voluta** = forza·(0,8 + 0,2·ampiezza) (`natpf_stroke_intent.js:229`), con la curva 0,7 e gli intervalli per tipo (`natpf_stroke_outcome.js:54-55`, `:363`): **invariata** (P5).
- La **diagonale** (`:368-369`) resta.
- Senza `widePull` il **profondo incrociato** si raggiunge: x −3,2 m dalla palla a 0,72, con forza 0,5, cade a circa 9,1 m [D calcolo].
- **Angolo corto voluto** (nuovo):
  - condizioni: colpo dalla parte dell'incrociato (cioè −sgn(hitX) se |hitX| > 1, altrimenti −c), |u_piatto| ≥ 1,2, forza ≤ 0,45, top spin o piatto;
  - esito: depth = lerp(4,8, 6,8, forza/0,45), x verso L, etichetta «Angolo corto».
- **Altezza sulla rete, effetto e volo**: regole B15 invariate (`:376-383`; `game_engine.js:2370-2392`).
  - La varietà viene dal tipo: piatto teso, top spin alto e sicuro, tagliato basso e corto.
  - Si somma alla forza e alla zona.
- **Pallonetto**: la direzione segue la stessa mappa; profondità e volo restano quelli di oggi.
- **Schiacciata, servizio** (`serveOutcome`, `:620-637`) **e super** (`:459-472`): invariati.
- **Fuori da B36**: palla corta, volée e zona di rete. La mappa non si applica con `nearNet`, `volleyNet` (`:309`, `:315`), DROP o SMASH.

### 2.7 Riferimento fermo (il collo di bottiglia di P4)

- **Seme dagli scambi di prova con intenzione nota.**
  - Una scritta e un cerchio «Rimanda la palla al centro», senza bloccare niente.
  - 3 colpi per lato invece di 2 (`TRIAL.perSide`, `natpf_trial_learn.js:78`), con la media che scarta i valori oltre 2,5σ.
  - Profilo in `:188-209`; seme fidato in `natpf_phone_racket.js:891`.
- **In partita** (`createAimModel`, `natpf_gestures.js:164-221`):
  - il centro segue solo i colpi dentro la zona centrale (|dev| < A/2), con α 0,03 (`alphaTrusted`, `:159`);
  - oltre A/2 non si muove (`drift` 0; oggi 0,03, `:196`);
  - niente `biasPull` con il seme fidato;
  - la pendenza comune scatta solo oltre 1,2A, mantenuta per 12 colpi per verso (oggi `commonDev` 8°, `:205-213`).
- **Calibrazione «gesti» (rapida)**: seme non fidato, verificato dopo 6 colpi se la mediana supera 0,75A.
- **Calibrazione «Nessuna»**: centro dai primi 3 colpi, più la verifica.
- Senza deriva sul telefono (P3) il centro fermo regge [V sim]. Resta il caso di chi cambia presa a metà partita (§9).

---

## 3. Architettura

**Nuovo modulo: `natpf-tennis/src/natpf/natpf_direction.js`**
- `DIRECTION`: W, L, ρ, f e le righe di **tutti e sei** i livelli: bambini, evento, casual, 1v1, pro, leggenda. Oggi Bambini ed Evento ricadono su Facile [L:vincoli A5].
- `directionRules = { model: 'b35' }` e `directionModel()`, che legge:
  - l'opzione dello staff `natpf-tennis.direzione`;
  - `?direzione=b36|b35` nell'indirizzo;
  - `directionRules.model` nei banchi.
- `dirParamsOf(level, { aimLevel, help })`.
- `lateralB36()` (§2.2).
- `shortAngle()`.
- `zoneOf(x, hitX, c, depth)`, che restituisce 'incrociato' | 'centro' | 'lungolinea' | 'riga' | 'angolo corto'.

**Moduli cambiati**

| File | Cosa cambia |
|---|---|
| `natpf_stroke_outcome.js` | `strokeOutcome` (`:304-427`): con b36, lontano dalla rete e per i colpi da fondo usa `lateralB36` al posto di `:355-358` e l'angolo corto al posto di `:373`; aggiunge in uscita `dev`, `u`, `uFace`, `uTime`, `zone`, `zoneFace`, `model`. Con b35 resta **identico byte per byte** (test con le impronte). |
| `natpf_stroke_intent.js` | `strokeIntent` (`:212-234`): aggiunge `dev` (gradi grezzi) e `devOk`; `face` resta (serve al servizio e alla catena di prima). |
| `natpf_phone_racket.js` | `natpfSwingToEngine` (`:238-283`): A dal livello (`:263`, `aimFull: aimFullNow()` a `:780`). `update()` (`:963-976`): campo `in` nel messaggio `ex`. `feedback()` (`:936-950`): `z` e `zo` nel messaggio `ev`. |
| `natpf_gestures.js` | modo b36 di `createAimModel` (§2.7). |
| `natpf_trial_learn.js`, `natpf_trial.js` | Seme dai colpi «al centro» e 3 per lato. `natpf_trial.js` è già toccato da B35b: si parte dal suo codice unito. |
| `natpf_skill.js` | `airScale` / `fixAir` (`:867-883`): opzione `lateral` (corregge anche vx) **solo** per i colpi della racchetta (`game_engine.js:2223`, `:2600`). Non per la CPU (`:2759`), perché la Leggenda compensa già con `kLat` (`natpf_legend.js:48`, `:310`, `:330`). |
| `game_engine.js` | `_natpfRacketShot` (`:2316-2425`): solo la chiamata a `:2351` (la stessa riga di B35a, già unita) e i campi di `natpfLastRacket`. |
| `natpf_kiosk.js` | Comando `dir` («Direzione dei colpi: nuova · di prima»), accanto ad `aim` (`:134`). |
| `diag/diag_recorder.js`, `diag/diag_direction.js` | Campi nuovi nell'evento `racchetta` (`diag_recorder.js:263-276`); `diag_direction.js` passa a 5 zone (§6). |
| `registro/registro_registratore.js`, `registro/registro_formato.js`, `cloudflare/registro-worker.js` | Campi nuovi nella riga `colpo` (`registro_registratore.js:343-358`), nell'elenco CAMPI (`registro_formato.js:48`) e nella sua copia nel Worker [L:vincoli H2] (§6). |
| Telefono | §4. |
| Tutorial e allenamento | §6. |

**Restano come oggi:**
- `serveOutcome`, `smashAt`, `superShot`, `dropControl`, il gioco a rete (B31, B17.4), `classifyStroke`;
- il ritmo e il ritardo abituale di B35a (`te`, `rRest`, `lag`, `out.lag` nel registro);
- voto e anello (verde = Perfetto);
- la CPU fino a B36.7;
- il doppio e il P2 senza telefono, con le catene a sorteggio (`game_engine.js:2145-2215`, `:2530-2557`) [L:vincoli A2];
- webcam, mouse e tastiera: `eventIntent` ricostruita (`natpf_stroke_outcome.js:506-516`) → mappa di prima.

**Interruttore.** `b35` resta il valore predefinito fino a B36.10. Con `b35` le impronte devono restare identiche: è il cancello prima di registrare quelle nuove. I banchi girano i due modelli con gli stessi semi.

---

## 4. Telefono

**4.1 Lettura del piatto a picco − dt/2.**
- In `face-tracker.js` (`strokeFace`, `:154-172`), dt è l'intervallo mediano tra i campioni (lo stesso da cui viene `hz`, `swing-message.js:29`). L'alternativa è l'integrazione al punto medio.
- Prima di accenderla si sceglie sui dati veri, con la regressione di `fh` sulla velocità al picco.
- Il telefono manda un campo `ph` (versione delle correzioni), che serve alla diagnostica.

**4.2 Posa «pronto» ferma con la palla in arrivo, svelta a palla lontana.**
- In `face-tracker.js` si aggiungono `setHold(b)` e `setFast(b)`, con idleHold 300 ms e idleRelax 0,5 s.
- `racchetta.js` (`:265`) legge `ex` con il campo `in`.
- Oggi `ex` vale 0 anche per le palle centrali (`BODY_ZONE` 0,6 m, `natpf_phone_racket.js:364`, `:410`) [V]: per questo serve il campo `in` a parte.

**4.3 Campi facoltativi nel messaggio `sw`.**
- `bs` (base), `br` (baseRate) e `tn` (turn) sono già calcolati e oggi scartati (`face-tracker.js:171`; `swing-detect.js:392`).
- Servono solo alla diagnostica.
- `parseSwingMessage` ignora i campi che non conosce (`swing-message.js:33-52`) [V].

**4.4 Zona sul telefono.** Dopo il messaggio `ev`, il telefono mostra la zona letta dal piatto e la zona ottenuta, con una barra a 3 settori più la riga (`phone-screen.js`).

**4.5 Versione e compatibilità.**
- Nuova versione in `site/js/tennis/version.js` e `site/tennis/build.json`.
- Telefono nuovo con computer vecchio: i campi in più vengono ignorati.
- Telefono vecchio con computer nuovo: B36 funziona senza le correzioni (più rumore); la diagnostica segna la mancanza di `ph`.

**4.6 Calibrazione.** §2.7. «Giocando» resta il valore predefinito (`CAL_MODE_DEFAULT`, `natpf_trial_learn.js:42`).

**4.7 Mancini.**
- Niente codice dedicato.
- `dev` è nel riferimento del campo (`face-tracker.js:10`) e c segue la mano: lo specchio è verificato nel simulato (entro 1,5°).
- Restano verdi i test `natpf-mancini` e `natpf-b20-specchio`.

**4.8 Telefoni a 30 Hz.** Le pendenze sono verificate nel simulato. Il rilevatore a 30 Hz su telefoni veri **non è verificato**.

**4.9 Saturazione del giroscopio.** Oggi non è gestita [L:telefono]. Proposta [D]: con 2 campioni grezzi oltre 1800 °/s entro l'1% del massimo, il piatto non è credibile (`fu`) e lo si segnala nella diagnostica.

**4.10 Escluse:** bussola, Generic Sensor API, percorso dall'accelerometro, `tw` e `a` per la direzione.

---

## 5. CPU e livelli

**Difesa del campo aperto.**
- La CPU non legge il telefono in anticipo: reagisce alla palla come oggi (`planCpuRun`, `natpf_skill.js:563`; `cpuStep`, `:693`).
- Leve permesse:
  1. recupero verso la bisettrice degli angoli che chi gioca può raggiungere, a Casual, Evento e Pro, come fa `legendRecover` (`natpf_legend.js:328`);
  2. reazione ed errore per allungo (`cpuErrorChance`, `natpf_skill.js:734`);
  3. Evento si riequilibra da sé, perché il suo k si ferma a 65 punti [L:vincoli C3].
- La portata resta fissa: allungarla sarebbe un trucco che si vede [L:vincoli].
- Più angoli e più profondità alzano subito gli errori della CPU (`cpuErrorChance`) [D]: si tara solo con gli audit.

**Attacco.**
- La CPU usa la stessa geometria (W, L, profondità) e lo stesso rischio: i suoi errori vengono dalla sua «qualità» (`cpuShotChoice`, `natpf_skill.js:945`).
- Scelta delle zone per livello:
  - Bambini: centro (il test lo vuole) [L:vincoli B3];
  - Evento: centro e angoli;
  - Pro: tutte le zone;
  - Leggenda: per utilità (`legendDecide`, `natpf_legend.js:204`).
- Il caso resta solo nella CPU: è l'avversario, non il comando di chi gioca.

**Livelli.**
- La tabella §2.2 si somma a finestra, assistQ, failQ e pushOut di oggi.
- Dove si può mandare la palla è uguale per tutti; cambia la precisione chiesta (23/10).

**Stesso schermo.**
- L'aiuto al più giovane usa, per la direzione, la riga del livello più facile (A +3°, kT −0,05), oltre a finestra ×2 e +0,1 s [L:vincoli D1].
- È un aiuto solo di gioco, dichiarato a schermo.
- Obiettivi b25 invariati.
- Il nome «Campo aperto» dello stesso schermo (`natpf_duo_rules.js:66-94`) si scontra con il nome della fase: nei testi chiamare B36 «Direzione dei colpi».

**Due computer.**
- Il P2 manda `intent.dev` e l'host applica i parametri del suo livello.
- Con un P2 vecchio vale `face` (cioè u ≈ face).
- Il campo deve poter mancare. Messaggi sotto 16300 B [L:vincoli E2].

---

## 6. Riscontro, tutorial, registro

**Computer (senza appesantire).**
- L'anello d'arrivo resta com'è (`landingOf`, `natpf_shot_feedback.js:31-38`).
- Il nome della zona va nella riga piccola dell'esito solo per angolo, riga e angolo corto: «Lungolinea», «Incrociato», «Angolo corto», «Sulla riga». Nessuna voce nuova.
- Un «fantasma» discreto nella zona letta dal piatto, per 0,8 s, solo quando il tempo l'ha spostata, con la scritta «in ritardo → lungolinea». È acceso nell'allenamento e nei primi colpi.
- Il video 1 mostra un segno a terra dove rimbalza la palla e un cerchietto del tempo vicino a chi colpisce: non serve un mirino in partita. Un mirino che segue `fo` (`racchetta.js:413`) solo nell'allenamento, se l'utente lo vuole.

**Telefono.** Zona letta e zona ottenuta (§4.4): è l'unico posto in cui chi gioca vede che cosa il telefono ha capito.

**Tutorial (le dimostrazioni devono corrispondere al riconoscimento).**
- Le dimostrazioni restano a `preYaw ±22` (`natpf_gesture_motion.js:111-114`), uguale ad A di Evento.
- I testi cambiano. Prima: «Cima girata verso il centro: incrociato». Dopo, come cosa secondaria: «colpire prima la tira ancora un po'».
- Il test di fedeltà legge `intent.dev` e la zona al posto di `natpf.wrist` [L:vincoli G1: `natpf-gesture-pose.test.mjs:275-296`].
- Il tutorial corto, a 5 schede, non cambia struttura [L:vincoli G3].

**Allenamento.**
- Testi degli esercizi Incrociato e Lungolinea da rifare (`natpf_training.js:30-31`).
- Esercizi nuovi «Riga» e «Angolo corto» solo nell'allenamento completo.
- Precision e Combo passano alle zone [L:vincoli G4].
- Prova guidata dello staff (`diag_protocol.js:20-23`): esercizi centro, incrociato, lungolinea, riga, corpo girato e fermo, morbido e forte.

**Registro dello stand** (riga `colpo`, `registro_registratore.js:343-358`). Campi nuovi:

| Campo | Contenuto |
|---|---|
| `dv` | scarto del piatto, gradi interi |
| `zp` | zona letta dal piatto, da −2 a 2 |
| `zo` | zona ottenuta |
| `tu` | tempo in unità della finestra ×100 |
| `ex` | eccesso ×100 |
| `xr` | rimbalzo vero, m |

- Vanno aggiunti in CAMPI in due copie (`registro_formato.js:48` e il Worker); un test le vuole uguali.
- **L'utente deve ricaricare il Worker** [L:vincoli H2].
- Dalle partite vere si misura: la probabilità che la zona letta dal piatto sia la zona ottenuta, σ di `dv` e le cause dei fuori.

**Diagnostica** (evento `racchetta`, `diag_recorder.js:263-276`).
- Campi nuovi: `scarto`, `u`, `uTempo`, `zonaPiatto`, `zona`, `rimbalzoX`, `fhGrezzo`, `base`, `baseRate`, `ph`.
- `diag_direction.js` passa a 5 zone, con la distinzione «piatto giusto, tempo che sposta».

---

## 7. Banchi e test

**Prima e dopo.**
- Banco B35a (`direzione-telefono.mjs`) con `--model`, i modelli e i rumori nuovi e le metriche di §1: zone, sd per voluto, serie di 14 colpi, mancino, sensori al contrario, ritardo. Semi 1,2 e 3,4.
- I miei prototipi vanno in `scripts/audit/b36/`:
  - `mappa.mjs`: taratura di A, kT, ρ e f in pochi secondi;
  - `zone.mjs`: raggiungibilità, dal centro e dagli angoli;
  - `segnale.mjs`: prese × mani × Hz × posa ferma o svelta × lettura a picco − dt/2 × deriva.
- Per `segnale.mjs` `test/phone-sim.mjs` deve accettare `hz`, `faceOpts` e `gyroBias`.

**Prima gli strumenti, poi le regole.** I giocatori simulati che rovesciano la mappa di oggi vanno riscritti come «gesto → intenzione», cioè zona scelta e poi dev = ±A più rumore:
- `rally-balance.mjs:42-60`;
- `b19/due-umani.mjs:37-42` e `b19/due-umani-distanza.mjs:26-29`;
- `precision-combo.mjs:56-57`;
- `rete-diag.mjs:19-23`.

Con B36 spento i numeri devono restare uguali alla base, oppure lo scarto va documentato [L:vincoli K].

**Test nuovi.**
- `natpf-b36-mappa.test.mjs`: monotonia, continuità (al massimo 0,2 m per grado), specchio, determinismo, righe per tutti e sei i livelli, nessun fuori dal solo piatto.
- `natpf-b36-riferimento.test.mjs`: 14 incrociati tenuti tutti incrociati; pendenza comune solo oltre 1,2A.
- Nei test del sito: `face-tracker` (posa ferma, posa svelta, dt/2) e compatibilità dei messaggi.

**Impronte.** Con B36 spento identiche. Con B36 acceso si registrano di nuovo, con un commento «prima X, ora Y, perché», per:
- b25;
- `b32-movimento:152`;
- b18 Leggenda e palla corta;
- `fine-partita` e `evento-bambini` con `--impronte`;
- le impronte «tennista» di B35a.

**Test da riallineare di proposito a B36.10** [L:vincoli]:
- `natpf-campo-aperto` (:22, 38, 56, 68, 125, 138);
- `-23-10` (:15, 36, 51);
- `natpf-colpi-b15` (:40, 89, 96);
- `natpf-aim` (:73, 87, 106);
- `natpf-racchetta-motore` (:72, 418, 435);
- `natpf-presa-palmo-29-10:170`;
- `natpf-variety` (:50, 126);
- `natpf-diag-20261030:159`;
- `natpf-b35-direzione`: i paletti `:101-113` e `:202-209` restano verdi anche con B36 acceso.

**Audit:** legend (24/40 semi), `cpu-pressione`, `evento-bambini`, b25. Rete, movimento e palla corta devono restare invariati entro il rumore.

**Prove nel browser.**
- L'elenco di vincoli §(b)2.
- `natpf-phone-upright`: piatto girato ≥0,4 m.
- Una prova nuova, `tools/e2e/natpf-direzione-b36.mjs`: messaggi `sw` con `fh` noti → anelli e scritte nelle zone giuste; la zona compare sul telefono.

---

## 8. Tappe

| Tappa | File | Chiusura |
|---|---|---|
| **B36.0 Base e misure prima** (dopo l'unione di B35b; dopo B37 se va prima). Nessun cambio al gioco. | `scripts/audit/b36/*`, `diag_protocol.js`, `diag_direction.js`, `docs/b36/misure-prima.md`; correggere `PROJECT_MEMORY.md:83-91` e `:832` [L] | Tabelle di §1 con i due modelli; una o più sessioni vere (prova guidata estesa, due telefoni, due prese) con σ del piatto per voluto, ampiezza voluta, errore del centro, effetto dt/2, memoria della posa. Senza sessione vera si scrive «non verificato». |
| **B36.1 Segnale del telefono** | `face-tracker.js`, `racchetta.js`, `swing-message.js`, `natpf_phone_racket.js` (`in`), `test/phone-sim.mjs`, versione del telefono | Criteri del segnale di §1 nel simulato; banco B35a con B36 spento non peggiore; test del sito, del gioco e LAN verdi. |
| **B36.2 Interruttore e modulo** | `natpf_direction.js`, `natpf_stroke_outcome.js`, `natpf_stroke_intent.js`, `natpf_kiosk.js` | Impronte identiche con b35; test di unità verdi. |
| **B36.3 Riferimento fermo** | `natpf_gestures.js`, `natpf_trial_learn.js`, `natpf_trial.js` | Serie di 14 ≥13/14 con tutte le calibrazioni; errore del centro ≤4° nel simulato con il rumore di prova. |
| **B36.4 Mappa laterale** (accesa nei banchi) | `natpf_direction.js`, `natpf_stroke_outcome.js` | Criteri laterali di §1; paletti B35a verdi; A e kT tarati con i dati di B36.0. |
| **B36.5 Aria di lato** | `natpf_skill.js`, `game_engine.js:2223`, `:2600` | Rimbalzo vero − bersaglio ≤0,25 m; Leggenda invariata. |
| **B36.6 Profondità e angolo corto** | `natpf_stroke_outcome.js`, `natpf_direction.js` | Zone raggiungibili ≥80%. |
| **B36.7 CPU e livelli** | `natpf_skill.js`, `natpf_legend.js`, `natpf_duo_rules.js` | Tutti i criteri degli audit con 24–40 semi. |
| **B36.8 Riscontro, tutorial, allenamento, minigiochi** | `natpf_shot_feedback.js`, `natpf_gesture_motion.js`, `natpf_gesture_pose.js`, `natpf_training.js`, `natpf_arcade.js`, `natpf_events.js`, `phone-screen.js` | Test di fedeltà e prove nel browser. |
| **B36.9 Registro e diagnostica** | §6 | Test del Worker verdi; detto all'utente di ricaricare il Worker. |
| **B36.10 Accensione** | — | B36 diventa il valore predefinito; test e impronte riallineati; suite complete, build, prove nel browser, versione, installer e zip; documenti; «come si attiva» (opzione dello stand «Direzione dei colpi»). |

**Fuori da B36:**
- palle corte, volée e gioco a rete (regole di oggi, mappa non applicata);
- doppio e P2 senza telefono;
- webcam, mouse e tastiera (mappa di prima);
- servizio e schiacciata;
- camera (un eventuale B36-bis);
- mirino in partita;
- bussola e sensori a 100 Hz.

---

## 9. Rischi, punti deboli del piano, domande

**Rischi e punti deboli**
1. **Il rumore umano del piatto non è misurato.** Il «±12°» delle diagnostiche B15 comprende anche mire volute ed errori del riferimento. Il guadagno di B36 suppone che le persone girino di 20–25° apposta con lo stesso rumore. B36.0 è il cancello.
2. **La correzione dt/2** è verificata solo nel simulato, i cui campioni sono a velocità costante su ogni intervallo. Nei browser veri va misurata prima di accenderla.
3. **La posa svelta a palla lontana** suppone che chi gioca torni verso lo schermo tra un colpo e l'altro. Con il ledwall di sbieco e la posa d'attesa obliqua serve la misura. Da sola, la posa ferma peggiora la deriva (−15,2° in 20 colpi).
4. **Centro fermo.** Chi riprende in mano il telefono in un altro modo a metà partita resta spostato finché non scatta la valvola (oltre 1,2A per 12 colpi) o finché non si ricalibra. Con 2 colpi per lato l'errore del seme può arrivare a 8° circa: senza «al centro» e 3 colpi per lato l'obiettivo dei 4° non si raggiunge.
5. **Equilibrio.** Gli audit hanno poco margine: «tennista» 86,6% contro ≥85%, «amatore» 2,2% contro 2–6%. Più angoli possono rompere Leggenda, Esperta ed Evento.
6. **Aiuti che vivono nel canale del tempo** (Bambini, aiuto nello stesso schermo). Con il tempo a 0,3 perdono effetto sulla direzione e vanno spostati su A e kT.
7. **Effetti indiretti.** Più profondità vuol dire più salite a rete automatiche (B31) e quindi più volée [L:vincoli A7]. Il super resta legato al tempo (|t| ≤ 0,6, `:467`).
8. **Due regole di direzione nello stesso prodotto:** telefono B36 da una parte, webcam, mouse e doppio con quella di prima.
9. **Abitudini.** Chi ha imparato «prima/dopo» deve imparare di nuovo. Testi, dimostrazioni e prova guidata vanno rifatti insieme.
10. **Il mio calcolo della mappa è semplificato:** una sola palla, ritmo 0, qualità 1, bersaglio prima dell'aria. I numeri veri vanno rifatti con il banco del motore.

**Domande per l'utente** (opzione consigliata in grassetto)
1. Il tempo da «pesa quanto il piatto» a «ritocco» (circa 0,3), con l'errore oltre la finestra che resta come oggi? **Sì.** Nel calcolo vale +7–9 punti di colpi giusti.
2. Zone chiare nei gesti e nelle scritte, mappa continua senza calamite? **Sì.** I gradini danno al massimo +1 punto e alzano la cella più piena dal 10% al 15%.
3. Negli scambi di prova una scritta e un cerchio «Rimanda la palla al centro», senza blocchi, e 3 palle per lato invece di 2 (circa 6 s in più)? **Sì.** È la misura del riferimento: con 8° di errore i colpi giusti scendono dal 96% al 75%.
4. Fuori mai per il solo piatto, solo per il tempo oltre la finestra e per la situazione, con la fascia della riga che costa margine? **Sì.**
5. Prima di tarare, 10–15 minuti con un telefono vero e la prova guidata estesa (anche due telefoni diversi)? **Sì.** È il cancello di B36.4.
