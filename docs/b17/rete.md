# B17.4 · Colpi sotto rete: cosa succedeva, cosa cambia, numeri (08/11/2026 sera)

Richiesta dell'utente (punto 4): «Quando ricevo una palla corta e mi avvicino alla rete per colpirla, succede quasi sempre una
delle due cose: compare "palla persa", oppure parte una palla morbidissima e lentissima, praticamente identica ogni volta.
Voglio poter scegliere ed eseguire colpi diversi anche in questa situazione». Base: `7936011` (versione 2026-11-08.4), su
`docs/b17/analisi-e-piano.md` §4. Lavoro in un worktree proprio, niente push (un altro agente lavora al B16).

## 1. Riproduzione: i colpi delle due diagnostiche rigiocati nella funzione vera

Script nuovo `natpf-tennis/scripts/audit/rete-diag.mjs` (`node --import ./test/register.mjs scripts/audit/rete-diag.mjs
[eventi.jsonl …]`): dai registri `racchetta` (intenzione, tempo, qualità, pressione, lato, mira), `palla` (posizione e
velocità all'impatto), `rimbalzo` (palla corta) e `tel.colpo` (salita e confidenza della forma) ricostruisce tutti gli
ingressi di `strokeOutcome` e li rigioca. Il ritmo di chi gioca si ricava dalla mira registrata (inversione numerica).
Senza file usa i colpi estratti (`FIXTURE`), così la prova `natpf-rete-b17` non ha bisogno delle diagnostiche.

**Correzione all'analisi di §4.1**: nel registro `racchetta` i campi `x` e `z` sono il **punto di caduta** (z = −profondità),
non la posizione della palla. La posizione viene da `palla`. Letti così, i colpi «vicini alla rete» sono questi (8 colpi:
palla entro 7 m all'impatto *oppure* caduta entro 7 m; il nono della tabella di §4.1 era il colpo a vuoto delle 42,8 s):

| Sessione·n | s | Palla z (m) | y | vz | Gesto | Forza | Conf | Tempo | q | A rete | Corta | Registrato: x · prof · rete · volo · esito | **Rigiocato ora**: x · prof · rete · volo · km/h · esito |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| wqdk·112 | 22,5 | 9,15 | 0,93 | 11,7 | drop (forma, conf 0,14) | 0,26 | 0,14 | +0,65 | 0,73 | no | no | −1,77 · 1,88 · 1,56 · 1,32 · drop | uguale (DROP da 9 m: fuori dalla zona di rete, non toccato) |
| **wqdk·121** | 36,6 | **3,49** | 0,53 | 5,5 | flat 1210 °/s | 0,75 | 0,62 | +0,78 | 0,62 | sì | sì | −5,04 · **6,79** · **2,32** · 1,22 · **debole** | −4,99 · 6,80 · 1,42 · 0,86 · 53 · **controllato** (fuori di lato come prima: mira piena −1,3 dal piatto girato e dall'anticipo) |
| wqdk·131 | 54,4 | 6,88 | 0,51 | 10,5 | slice 1239 °/s | 0,78 | 1 | +0,37 | 1,00 | no | sì | 2,82 · 9,87 · 1,30 · 0,90 · ok | uguale |
| q79f·139 | 3,1 | 12,21 | 1,79 | 21,5 | drop (forma, conf 0,83) | 0,10 | 0,83 | −0,02 | 0,94 | no | no | −3,16 · 1,93 · 1,43 · 1,41 · drop | uguale (DROP da fondo campo, forma chiara e gesto lento) |
| **q79f·142** | 6,2 | **4,03** | 0,51 | 3,8 | topspin 1344 °/s | 0,85 | 1 | +0,35 | 0,62 | sì | sì | −2,85 · **6,80** · **2,51** · 1,17 · **debole** | −2,89 · **10,17** · 1,62 · 0,91 · **56** · **controllato** |
| q79f·145 | 13,4 | 11,69 | 0,45 | 16,5 | topspin | 0,77 | 1 | +1,27 | 0,99 | no | no | 6,01 · 6,86 · 1,51 · 0,91 · fuori | uguale (molto in anticipo con il piatto girato: fuori di lato, non è un colpo a rete) |
| q79f·148 | 19,4 | 11,33 | 1,69 | 19,5 | flat | 0,77 | 0,45 | +0,78 | 0,83 | no | no | −4,69 · 6,96 · 1,27 · 0,68 · ok | uguale |
| **q79f·159** | 43,0 | **6,29** | 0,96 | 7,4 | lob 759 °/s | 0,36 | 0,24 | +0,11 | 0,62 | no | sì | 2,40 · **6,80** · **3,93** · 2,01 · **debole** | 2,14 · **8,79** · 2,99 · 2,01 · 27 · **controllato** (pallonetto vero) |

Sulla base `7936011` il rigiocato coincide con il registrato in 8/8 (riproduzione). Dopo la correzione cambiano solo i tre
colpi deboli (5/8 uguali). «Tempo» in unità della finestra della direzione; «q» qualità di situazione × pressione.

Che cosa si vede: i **tre colpi giocati davvero a rete su una palla corta** (3,5–6,3 m, gesti da 760 a 1344 °/s: piatto, top
spin, pallonetto) avevano qualità di situazione **0,57–0,62** («in allungo»), sotto `failQ = 0,63` di Leggenda, e diventavano
tutti la stessa palla «debole»: **6,8 m** (`weakDepth`) e **+0,9 m** sulla rete (`weakFloat`), 24–37 km/h, qualunque fosse il
gesto. Le due «palle corte per forma» (n.112 e n.139) non erano a rete: erano a 9 e 12 m, con un gesto morbido in discesa
(626 e 440 °/s) letto come palla corta (la seconda con confidenza 0,83: era una palla corta voluta). In più il telefono ha
scartato «debole» 22 + 8 gesti da 164–469 °/s e 10–29° di ampiezza (soglia del picco ≈ 250 °/s con il colpo tipico ~1300 °/s;
ampiezza minima 23°), e alle 42,8 s della seconda partita un gesto 0,97 s prima della palla è stato un colpo a vuoto
(«VERY EARLY • WHIFF») mentre il pallonetto vero è arrivato 0,2 s dopo.

## 2. Correzioni (§4.3 del piano) e costanti

`natpf-tennis/src/natpf/natpf_stroke_outcome.js`:
- **Colpo controllato a rete** (`controlled`): a rete (`net`: chi colpisce entro 5 m; oppure palla corta `shortBall`;
  oppure palla entro `attackZ` 6,4 m, solo se `hitZ` è noto) la qualità **di situazione** sotto `failQ` non fa più fallire
  il colpo finché `q ≥ max(netQMin 0,45, failQ − netQSpan 0,25)` e il tempo è entro `netControlExcess 0,5` unità fuori
  dalla finestra. Il colpo è normale: la forza decide profondità (tabella del tipo) e velocità (volo base dalla forza nel
  motore, o `attackSpeed` 20–34 m/s nella chiusura), il tipo decide l'arco, la direzione resta piena da tempo e piatto. La
  qualità che manca aggiunge **dispersione** (`spread = (failQ − q)/netQSpan`, 0…1): fino a `netSpread.x` 1,2 m di lato e
  `netSpread.clear` 0,35 m sull'altezza sulla rete, con due numeri in [−1, 1] dal **seme del colpo** (`strokeSeed`: tempo,
  forza, piatto, salita, posizione della palla, altezza, distanza dalla rete, hash FNV): stessi ingressi, stesso esito;
  ingressi vicini, esiti diversi. Sotto `netQMin` (palla raggiunta all'ultimo) resta la palla debole di prima (palla corta
  con il tempo nella finestra, o a rete con il tempo perfetto), altrimenti fallito come prima; la pressione degli scambi
  lunghi (`pressured`) fa ancora fallire. A Pro, 1v1 e Casual `failQ` (0,30/0,34/0,20) è già sotto `netQMin`: lì non cambia
  niente.
- **`attackQ` che scala con la forza**: `attackQ − attackQPower 0,3 × (forza − attackPower)/(1 − attackPower)`: a Leggenda
  un gesto da 0,9 chiude sopra la rete con qualità 0,55 (prima 0,82), uno medio (0,5) ancora no.
- **Palla corta per forma a rete** (`netVolley`): la palla corta resta tale solo con forma chiara (`conf ≥ dropNet.conf
  0,6`) e gesto davvero lento (`forza ≤ dropNet.power 0,25`); altrimenti è una **volée controllata**: tagliata, profondità
  lineare dalla forza tra `volleyDepth` 3 e 7 m, volo del tagliato nel motore (il minimo di 1,32 s del ramo DROP non si
  applica perché l'esito non è più `DROP`). Da fondo campo, e senza confidenza (intenzione ricavata da webcam o controlli
  di prova), la palla corta resta una palla corta.
- `hitZ` assente: prima `finite(null)` valeva 0 (zona della chiusura); ora la zona di rete chiede `hitZ` noto (`zKnown`).
  Il motore lo passa sempre; cambia solo per chi chiama la funzione senza.
- Esito: campi nuovi `controlled`, `spread`, `netVolley`.

`natpf-tennis/src/natpf/natpf_impact.js`: `earlyWindow(engine) = IMPACT.early × slowFactor(vz)` (fino a ×1,8 sotto
15 m/s): la finestra del colpo a vuoto in anticipo si allarga sulle palle lente come quella della direzione, in
`queueUserSwing` e `resolvePending`. A Leggenda su una palla a 7,4 m/s: 0,40 → 0,72 s (il gesto delle 42,8 s, 0,97 s prima,
resterebbe a vuoto: era la preparazione, il pallonetto è arrivato dopo).

Telefono: `natpf_phone_racket.js` manda `cfg net:1` quando chi gioca è entro `NET_Z.in` 5 m dalla rete nello scambio
(`atNet`, isteresi: si esce oltre 5,6 m) e di nuovo `cfg` senza `net` al rientro; `racchetta.js` lo passa a
`det.setNet`; `swing-detect.js` a rete usa la soglia del picco `netMinPeak 0,10 × scala di chi gioca` (min `playMinPeak`
45 °/s e 5 × rumore), inizio del gesto `netOn 0,08 × scala`, ampiezza minima `netMinAngle` 10° e la sola soglia del picco
al posto della soglia dell'intenzione (metà del colpo tipico). Con il colpo tipico di 1300 °/s: picco 130 °/s invece di
~250, ampiezza 10° invece di 23°: dei 30 gesti scartati «deboli» nelle due partite (163–469 °/s, 10–103°) tutti e 30
passano la soglia nuova del telefono e arrivano al gioco.

**Revisione (motore coerente con il telefono, `natpf_impact.js`)**: arrivare al gioco non bastava. Con `WEAK.rel .3` e
`WEAK.ample 25` il motore trattava i tocchi sotto 390 °/s come «deboli» (preparazione): all'arrivo della palla aspettava
`WEAK.wait` 0,22 s il colpo vero e poi, **sotto 25° di ampiezza**, li scartava in silenzio (`_natpfWeakDropped`: niente
swing, niente messaggio, la palla passa). Dei 30 gesti: 25 erano «deboli» per il motore, **8 con ampiezza 10–20° sarebbero
stati scartati** (lo stesso «palla persa» di prima, spostato dal telefono al motore), 17 giocati solo dopo l'attesa, 5
«forti». Riprodotto nel motore vero senza browser (Leggenda, chi gioca a 4,5 m, palla corta a 6 m/s): tocco da 200 °/s e
15° fatto 0,2 s prima della palla → nessun colpo; 300 °/s e 20° 0,3 s prima → nessun colpo; lo stesso gesto da 30° →
colpito dopo l'attesa. Ora a rete (`nearNetActor`: chi colpisce entro `WEAK.netZ` 5 m, la stessa regola di `NET_Z.in`
del telefono e di `net` in `_natpfRacketShot`) un gesto è «debole» solo sotto `WEAK.netRel` **0,15** × colpo tipico
(195 °/s con 1300: i tocchi di volée si giocano all'arrivo della palla, come gesto morbido in attesa `SOFT` 0,065 s) e un
gesto debole si gioca da `WEAK.netAmple` **10°** (= `netMinAngle` del telefono) invece di 25°. Dei 30 gesti: 22 giocati
all'arrivo, 8 (163–189 °/s) giocati dopo l'attesa del colpo vero, **0 scartati**. Fuori dalla zona di rete niente cambia
(rel 0,3 e 25°: la preparazione da fondo campo resta scartata). Il gesto in attesa ricorda se era a rete (`cand.net`);
alla risoluzione vale anche la posizione del momento. Con il test `natpf-rete-b17` (9) che fissa l'uguaglianza delle
tre soglie (`netAmple = netMinAngle`, `netZ = NET_Z.in`, `netRel ≥ netMinPeak`) e il conteggio 8 → 0 sui 30 gesti.

Non toccati: `game_engine.js` (il ramo DROP con il minimo di 1,32 s resta per le palle corte vere), il disegno dei gesti
del tutorial, `natpf_stroke_intent.js` (la lettura della palla corta per forma resta; cambia solo l'esito a rete).

## 3. Prove

- Nuovo `natpf-tennis/test/natpf-rete-b17.test.mjs` (9, di cui 2 dalla revisione: motore a rete «tocco da 200 °/s e 15°
  0,2 s prima della palla → giocato all'arrivo, non scartato; 300 °/s e 20° 0,3 s prima → giocato; 160 °/s e 12° → giocato
  dopo l'attesa del colpo vero; 6° → scartato; da fondo campo 11,5 m lo stesso tocco → scartato come prima»; soglie
  coerenti telefono/motore e conteggio 8 → 0 sui 30 gesti delle diagnostiche): stessa situazione a rete (palla corta a 4 m, 0,9 m, 8 m/s,
  qualità 0,6) con cinque gesti → cinque esiti diversi e coerenti (forte teso: chiusura, ≥ 9 m, basso, volo < 0,8 s;
  tagliato: effetto all'indietro, più basso del top spin; smorzata: ≤ 4,6 m; anticipo e ritardo: incrociato e lungolinea a
  più di 3 m; piatto ±1: più di 4 m; forza → profondità in ordine); determinismo e dispersione dal seme; palla debole sotto
  `netQMin`, fallito fuori tempo e sotto pressione, da fondo campo come prima; palla corta per forma a rete; `attackQ`
  dalla forza; i tre colpi deboli delle diagnostiche → controllati e gli altri cinque identici; `earlyWindow`; `cfg net`
  con isteresi.
- Nuovo `tools/test/swing-net.test.mjs` (2): con la calibrazione a 1300 °/s un tocco da 200 °/s e 30° è scartato «debole»
  in gioco, a rete (`setNet`) è un colpo, al rientro torna scartato; a rete un micro-movimento da 40 °/s non è un colpo e un
  colpo pieno resta un colpo.
- Prove adattate alla regola nuova: `natpf-campo-aperto` («a rete con il tempo nella finestra la palla passa la rete»:
  controllato invece di debole, debole sotto `netQMin`, fallito molto fuori tempo), `natpf-drop-recovery` (il recupero
  oltre 5 m: debole *o* controllato), `natpf-grip-skill` (colpo a vuoto a 1,0 s con la palla a 10 m/s, non più a 0,7 s:
  la finestra è allargata di 1,5).
- Gioco **936/936** (927 + 9), sito **199/199** (197 + 2), `npm run build` ok (il `dist` contiene `netAmple`). Nel
  browser (porte 9651/3651), rifatte dopo la revisione: `natpf-rally` 7/7, `natpf-gesti-speciali` 9/9, `natpf-1v1-p2p`
  39/39 (tutte al primo tentativo). Banco `colpi.mjs --mode=rete` rifatto: identico (12/12, esiti distinti 12; il banco e
  `audit:legend` non passano da `queueUserSwing`, la soglia WEAK non li tocca).

## 4. Banco

`scripts/audit/colpi.mjs --mode=rete` (scenario nuovo «palla corta e rete», Leggenda, palla a 4 m, 0,9 m, lenta; dodici
gesti: dritto 1,4× / 1× / 0,6×, rovescio, tagliato, palla corta chiara, palla corta vaga, pallonetto, piatto ±20°,
anticipo/ritardo ±0,7; i colpi speciali come intenzione letta, perché il braccio simulato con la presa della foto non li
produce). `strike()` ha le opzioni nuove `ballZ`, `short`, `lateral`, `run` (la situazione «in allungo e di corsa» dà
qualità 0,61 come nelle diagnostiche).

| Situazione | Prima (7936011) | Dopo |
|---|---|---|
| In allungo e di corsa (q 0,61) | 2/12 colpi non deboli (solo le due palle corte); gli altri 10 tutti a **6,8 m**, 36–44 km/h, 2,3–3,1 m sulla rete; esiti distinti 2 | **12/12**; profondità 1,8…10,1 m, x −4,1…+3,3 m, 25…70 km/h, rete 1,4–2,2 m (pallonetto 4,4); esiti distinti 12 |
| Comodi (q 1) | 12/12, 2,4…10,9 m, 26…100 km/h, esiti distinti 12 | uguale, tranne la palla corta vaga (conf 0,14, forza 0,3): volée a 4,2 m e 34 km/h invece di palla corta a 2,6 m |

Dettaglio «in allungo» dopo: dritto forte 1,4× → piatto 10,1 m, 70 km/h, 1,36 m sulla rete; dritto 1× → 8,4 m, 54 km/h;
dritto 0,6× → 6,8 m, 44 km/h; tagliato → 8,1 m, 51 km/h, 1,43 m; palla corta chiara → 1,8 m (uguale a prima); palla corta
vaga → volée tagliata 3,3 m; pallonetto → 9,0 m, 4,4 m sulla rete; piatto +20°/−20° → x +3,3/−4,1; anticipo/ritardo → x
−2,4/+2,8.

Banco Leggenda (`audit:legend`, 300 punti, 8 semi, come lo pubblica il progetto), game vinti dalla CPU prima → dopo:
medio 92,2 → 92,2 %, amatore 98,5 → 97,6 %, tennista 67,3 → 63,7 %, preciso 25,9 → 24,7 %, bambino 100 → 99,8 %,
impreciso 99,8 → 99,8 %; errori della CPU 3,4–5,3 % → 3,7–5 %; pro contro medio (giocatore) 84,1 → 83,5 %, casual 100 → 100 %.
**La CPU Leggenda non crolla**: perde 1–4 punti di game con i profili che vanno a rete (i colpi a rete non sono più regali).
I due criteri KO (tennista ≥ 85 %, preciso ≥ 60 %) **erano già KO sulla base** `7936011` (67,3 e 25,9 %): è il «Leggenda
più dura» deciso dall'utente per il B16, non un effetto di questo passo.

## 5. Non verificato e note

- Telefono vero, Windows, ledwall: niente. La soglia bassa a rete è provata solo con il rilevatore simulato; su un telefono
  vero potrebbe far passare la preparazione come colpo debole (il gioco la gestisce come gesto debole in attesa, WEAK), e
  a rete con il verso atteso sconosciuto (palla non ancora colpita dall'avversario) l'assestamento da 180–300 °/s e 14–27°
  può diventare un gesto: nel motore senza palla in arrivo non costa il punto (al più animazione), ma va provato con il
  telefono. Con `netRel` 0,15 nel motore, a rete un gesto da 195 °/s in su si gioca all'arrivo della palla: un
  assestamento fatto nell'ultimo mezzo secondo prima della palla diventa il colpo (a meno di uno swing 1,15 volte più
  forte entro 0,065 s). È il prezzo della coerenza con il telefono; se sul campo dà colpi non voluti, alzare `netRel`
  (es. 0,2) senza toccare il telefono.
- `earlyWindow × slowFactor` vale a tutti i livelli (Casual 0,6 × 1,8 = 1,08 s): un gesto non morbido 0,4–0,7 s prima
  di una palla lenta, che prima restava in attesa e veniva sostituito dal colpo vero, ora è giocato all'arrivo con il suo
  anticipo e il colpo vero successivo è ignorato; non provato con la sequenza «gesto anticipato non morbido + colpo vero».
- `attackQPower` abbassa `attackQ` con la forza a tutti i livelli (Pro: 0,65 → 0,35 a forza piena), non solo a rete:
  nessun banco a Pro/Casual lo copre.
- Le due «palle corte per forma» da 9 e 12 m (n.112, n.139) non cambiano: non sono a rete. Se l'utente le sente come «palla
  morbidissima» anche da lì, la stessa regola (`dropNet`) si può estendere a tutto il campo: decisione sua.
- wqdk·121 era e resta fuori di lato (x −5): il piatto girato di −1 e l'anticipo danno la mira piena oltre la riga, senza
  assistenza perché la qualità è sotto `assistQ`; è la regola del B15, non del gioco a rete.
- Il colpo a vuoto delle 42,8 s (0,97 s prima) resta a vuoto anche con la finestra allargata (0,72 s): era la preparazione.
- Il banco `colpi.mjs` sul resto (`--mode=banco|reale|partite`) non è stato rifatto: le modifiche a `strike()` sono solo
  opzioni nuove con i valori di prima.
