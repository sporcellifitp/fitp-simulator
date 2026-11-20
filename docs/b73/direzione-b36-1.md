# B73 · Direzione dei colpi: tappa B36.1 «La cima comanda (interna)»

**Stato.** Fatto sul ramo locale `b73-direzione` (base `natpf-simulator` `09cdac6b`, versione pubblicata 2026-11-19.1),
**non** pubblicato: niente push, file di versione non toccati, documenti vivi non toccati (li aggiorna l'agente principale).
Richiesta dell'utente del 20/11 (prodotto FIERA): «Vai avanti su 4 …», dove 4 = direzione dei colpi (B36.1).
Fatta **esattamente** la tappa B36.1 del §8 di `docs/b36/piano-direzionalita.md`, niente delle tappe dopo.

**In breve.**
- Nel pannello dello stand c'è una voce nuova, **«Direzione dei colpi: Classica · Nuova · in lavorazione»**. Di base
  **Classica**: il gioco è **identico** a prima (provato su 10 000 colpi a caso e con tutte le prove e le impronte di sempre).
- Con **Nuova** (da non provare con le persone: è «interna», il piano la apre al traguardo A, dopo le tappe B36.3–B36.5),
  solo per i telefoni con la forma del colpo: la **cima comanda** (il tempo pesa 0,3 invece di 1), niente spinta naturale,
  punto neutro al centro, il ritmo esce dalla direzione (resta il ritardo abituale). Curva della cima, bordi, aria e
  profondità come oggi.
- **Attenzione** (non cambia il lavoro di questa tappa, ma va detto): il registro di Torino (`docs/b36/misure-torino.md` §2)
  dice che nell'uso vero la cima è molto imprecisa (metà dei colpi entro ±52–60°). Il piano prevedeva di tornare
  dall'utente prima di scrivere la regola; l'utente il 20/11 ha detto «vai avanti». Con «Classica» di base non cambia
  niente per i visitatori; i numeri qui sotto sono tutti simulati.

---

## 1. Dove sta l'interruttore e perché lì

**Pannello dello stand** (Ctrl+Maiusc+K, F9 nel programma Windows, 3 s sul marchio NATPF del menu, ❚❚ tenuto 3 s in campo),
voce **«Direzione dei colpi»**, subito prima di **«Mira del telefono»**.

Perché lì (il piano diceva di deciderlo dopo B39 e B41, che sono fatti):
- dopo B39 e B41 **tutte** le opzioni di gioco dello stand stanno in questo pannello (formato in fiera, battuta, scambio
  caldo, calibrazione, mira…), si raggiungono con il **solo mouse** (marchio tenuto 3 s, ❚❚ tenuto 3 s in campo) e dal
  telecomando dello staff; il menu del tasto destro del programma Windows ha solo comandi del programma (diagnostica,
  calibrazione dello schermo) e nel browser non c'è;
- **accanto a «Mira del telefono»** perché tutte e due decidono dove va la palla del telefono;
- **posto**: il pannello aveva 19 voci e l'ultima fila non era piena (a sei colonne una voce sola, a quattro colonne tre):
  la voce nuova riempie un posto vuoto, il foglio non cresce (provato nel browser, §6). Il foglio «Telefono ›» proposto dal
  piano avrebbe tolto un clic diretto alla «Mira», che lo staff usa già.

Come funziona (come le altre opzioni dello stand):
- un clic: Classica → Nuova · in lavorazione → Classica; l'avviso dice «Direzione dei colpi: Nuova (in lavorazione, non da
  provare): con il telefono la cima decide la direzione, il momento del colpo la ritocca. Vale dalla prossima partita;
  resta salvata»; con «Nuova» la voce si vede accesa (gialla);
- **resta salvata** su quel PC (`localStorage`, chiave `natpf-tennis.direzione`); **non** la toccano il chiosco né «Nuovo
  giocatore» (né «Prossimo giocatore» in fiera): è dello stand, non di chi gioca;
- **vale dalla partita dopo**: il motore la legge a inizio partita (`startNewMatch` → `engine.natpfDirModel`); cambiarla
  durante una partita non cambia quella partita;
- **sfida tra due computer**: vale quella dell'host, che la manda nello snapshot (campo facoltativo `dir`, come `hot` del
  B42); il P2 la usa per la previsione locale del suo colpo. Il P2 parte da «Classica» finché l'host non la manda: un host
  di una versione di prima non manda il campo e la sua regola è quella di oggi;
- scritta nel **registro dello stand** per partita e minigioco (`dir`) e per colpo (`nr: 1` = colpo con la regola nuova);
  nella **diagnostica** `partita.direzione`, `racchetta.regola: 'nuova'` e l'evento `stand.direzione` al cambio.

Schermate guardate (prova `natpf-menu`, non nel repository): pannello con «Nuova · in lavorazione» a 1024 × 600, 1024 × 1024 e
720 × 720; la voce sta nell'ultima fila, «Nuova · in lavorazione» va su due righe solo dove i pulsanti sono stretti, il foglio
non scorre. L'avviso dopo il clic copre per 6 s la riga in basso, come gli avvisi delle altre voci.

## 2. La regola nuova (B36.1, solo «Nuova»)

Vale **solo** per i colpi dei telefoni con la forma del colpo (intenzione dal telefono, `natpf.intent`), **non** per la
schiacciata (il piano la lascia com'è). Webcam, mouse, tastiera, telefoni senza la forma (intenzione ricostruita,
`eventIntent` con `derived`) restano con la regola di oggi anche con «Nuova». Il servizio non passa di qui.

```
tempo   = clamp(te ; −1 ; +1)       te = tempo vero meno il solo ritardo abituale del B35a (lag); il ritmo (rRest) non conta
mira    = piatto − c · 0,3 · tempo   c = +1 dritto del destro e rovescio del mancino, −1 l'altro lato; niente spinta naturale
x       = landingFromAim(mira, 0)    punto neutro al centro del campo (oggi segue la palla al 40%)
poi     come oggi: spinta oltre la finestra, bordo morbido della riga, fuori, profondità in diagonale, incrociato stretto
piatto  = natpf_stroke_intent.faceAimFromDev: la curva di oggi (piena alla mira piena dello staff 17/20/23°, poi in calo
          tra 45° e 60°). Scarto della cima nullo (centro non imparato, gesto verticale, telefono senza direzione):
          piatto 0, sempre con la regola nuova (mai il ritorno alla regola di oggi)
```

Valori in `natpf_direction.DIRECTION` (`timeWeight 0,3`, `natural 0`, `follow 0`). L'esito porta `rule: 'nuova'`
(`natpf_direction.usedNewRule`); con la regola di oggi il campo non c'è, così l'esito «Classica» resta identico.

Esempio (Esperta, dritto del destro, palla a 0,6 m dal centro, sul bersaglio del motore; + = lungolinea, − = incrociato;
mira piena 17°; «ritardo pieno» −0,08 s = −1 unità, «un attimo prima» +0,08 s = +0,53 unità; calcolo diretto di
`strokeOutcome` con `dir` nullo e `'nuova'`):

| Colpo | Classica | Nuova |
|---|---|---|
| cima dritta, a tempo | −0,15 m (spinta naturale) | 0 |
| cima dritta, ritardo pieno / un attimo prima | +3,59 / −2,02 m | +1,10 / −0,58 m |
| cima girata di 10° (piatto 0,5), a tempo | +1,60 m | +1,83 m |
| cima girata di 17° (piatto 1), a tempo | +3,31 m | +3,59 m |
| cima girata di 17°, un attimo prima (tempo contro) | +1,67 m | +3,07 m |

## 3. File toccati

| File | Cosa |
|---|---|
| `natpf-tennis/src/natpf/natpf_direction.js` | costanti della regola nuova (`DIRECTION`), `newRuleFor`, opzione salvata (`readDirModel`, `writeDirModel`, `nextDirModel`, `dirModelFor`), scritte del pannello (`dirButton`, `dirToast`), `zoneOf` |
| `natpf-tennis/src/natpf/natpf_stroke_outcome.js` | `strokeOutcome` riceve `dir`; con la regola nuova tempo, mira e punto neutro come sopra; `rule: 'nuova'` |
| `natpf-tennis/src/game_engine.js` | `startNewMatch` legge la direzione (`natpfDirModel`; `natpfDirRule` a mano per test e banchi; P2 della sfida «Classica»); `_natpfRacketShot` passa `dir`; snapshot `dir` (invio e lettura) |
| `natpf-tennis/index.html`, `src/natpf/natpf_kiosk.js` | voce del pannello dello stand `data-staff="dir"` |
| `natpf-tennis/src/natpf/diag/diag_recorder.js` | `partita.direzione`, `racchetta.regola` |
| `scripts/audit/rally-balance.mjs`, `b19/due-umani.mjs`, `b19/due-umani-distanza.mjs` | opzione `dir`; con «Nuova» i giocatori simulati mirano con l'inversa della regola nuova (punto neutro al centro, cima per tutta la mira, colpo a tempo), con gli stessi sorteggi: con «Classica» le partite sono identiche |
| `scripts/audit/direzione-telefono.mjs` | `--dir=nuova`, `--modelli=…`, gesto «insegnato» (cima a 15°, tempo solito) |
| `scripts/audit/b36/confronto-regole.mjs` (nuovo) | la stessa misura con «Classica» e con «Nuova»: `matrice` (criterio 1), `fuori`, `partite`; uscite del 20/11 in `scripts/audit/b36/risultati/b36-1-*.txt` (con `b36-1-legend-nuova.txt` e `b36-1-prove-nuova.txt`, §7) |
| `natpf-tennis/test/alias-hooks.mjs` | `NATPF_DIREZIONE=nuova` fa girare test e banchi con «Nuova» di base (prova del traguardo C, §7) |
| test nuovi | `natpf-b36-interruttore`, `natpf-b36-direzione`, `natpf-b36-sfida`, `test/b36-casi.mjs` (i 10 000 casi) |
| `tools/e2e/natpf-menu.mjs` | la voce nuova in vista, il clic, «Chiudi» in vista |
| `docs/GUIDA_STAND.md` | riga «Direzione dei colpi» nella tabella del pannello e rimando a questo documento |

**Registro e Worker.** Il campo per partita (`dir`) e quello per colpo (`nr`) **ci sono già** dal B36.0 (formato delle righe
2) in tutte e due le copie, `registro_formato.js` e `cloudflare/registro-worker.js`, e il test del Worker li controlla
uguali: B36.1 li riempie. **Niente campo nuovo e niente Worker da ricaricare.** Un campo in più con lo stesso significato
sarebbe stato un doppione.

## 4. «Classica» resta identica: le prove

- **10 000 colpi a caso** (`test/b36-casi.mjs`: tutti i tipi di colpo, intenzioni del telefono e ricostruite, tempo dentro e
  fuori dalla finestra, ritmo e ritardo abituale, volée, rete, palla corta, cinque livelli): l'impronta sha256 dell'esito,
  presa sulla base `09cdac6b` **prima** di toccare il codice (`c71d83aa…94df`), è uguale con il codice nuovo senza `dir`, con
  `dir: 'classica'` e con un valore sconosciuto (prova `natpf-b36-interruttore`).
- Con «Nuova» le intenzioni ricostruite (1 595 casi) e le schiacciate danno l'esito **identico** a quello di oggi; negli
  altri 7 000 e più casi cambiano solo la direzione e quello che ne dipende (profondità in diagonale), mai voto, tempo,
  qualità, effetto, colpo fallito o in rete.
- **Prove del gioco**: 1928 su 1929 verdi (1 saltata: il server LAN senza `npm ci` nella worktree, come sempre).
  Dentro ci sono tutte le impronte dei banchi che girano nelle prove (stesso schermo b25, rally-balance B36.0, B42, B37…).
- **`npm run audit:legend`**: uscita **identica riga per riga** a quella della base (presa sulla base prima delle modifiche;
  differiscono solo i secondi), «Tutti i criteri rispettati». La riga `[B36] … 0 su 75490` resta: con «Classica» nessun colpo
  con la regola nuova.
- **Prove del sito**: 322/322. **Build** di produzione riuscita (`npm run build`).
- I banchi dei giocatori simulati usano gli stessi sorteggi con le due regole: con «Classica» le partite sono le stesse di
  prima (impronte di `natpf-b36-misure` e `natpf-b25-stesso-schermo` invariate).

## 5. Numeri della regola nuova (SIMULATI: non persone)

Telefono simulato con il braccio, motore vero senza grafica, giudice sul **rimbalzo vero** (fuori con la regola
dell'arbitro). Banco `scripts/audit/b36/confronto-regole.mjs` (`matrice`, `fuori`, `partite`), uscite in
`scripts/audit/b36/risultati/b36-1-matrice.txt`, `b36-1-fuori.txt`, `b36-1-partite.txt`.

**Criterio 1 del piano, senza la riga** (matrice della direzione B35a estesa: Esperta, semi 1–4, tre posizioni della palla,
destri e mancini, calibrazioni rapida, «Salta» e scambi di prova; 1 728 colpi per riga). «Gesto buono»: cima ±5°, tempo
±0,25; «persona vera»: cima ±12°, tempo +0,35 ± 0,45; «insegnato»: cima girata di 15° (circa 0,85 della mira piena).

| Gesto | giusti Classica → Nuova | criterio | incrociato↔lungolinea scambiati (Nuova) | criterio |
|---|---|---|---|---|
| piatto 12°, gesto buono | 65% → **75%** | ≥ 78% | 0% · 0% | 0% ✓ |
| piatto 12°, persona vera | 48% → **57%** | ≥ 55% ✓ | 4% · 12% | ≤ 2% |
| insegnato 15°, gesto buono | 73% → **86%** | ≥ 88% | 0% · 0% | 0% ✓ |
| insegnato 15°, persona vera | 52% → **61%** | ≥ 62% | 2% · 9% | ≤ 2% |
| naturale (cima 10° e tempo), buono / vero | 71% → 71% · 53% → 55% | — | 0% · 0% / 5% · 14% | — |
| solo tempo (cima dritta), buono / vero | 56% → **39%** · 41% → 37% | — | — | — |

Fuori o in rete: **0%** in tutte le righe, con le due regole. Le tre posizioni ora danno quasi lo stesso risultato (piatto
buono 75/75/74%, oggi 69/64/63%): il punto neutro al centro toglie la differenza tra palla al centro e palla di lato.

**Criterio 1: in parte.** Migliora in tutte le righe della cima e passa «persona vera» con il piatto; restano sotto di 1–3
punti «piatto buono», «insegnato» buono e vero, e gli scambi della persona vera. Da dove viene il resto (matrice voluto →
ottenuto al centro, `direzione-telefono.matrix`):
- con il gesto buono gli errori sono quasi tutti **«centro» invece dell'angolo** (insegnato: incrociato voluto 89% giusto,
  11% al centro; lungolinea 83%, 17% al centro): sul rimbalzo vero l'aria porta la palla circa il 14% verso il centro, e
  l'aria laterale si corregge nella **B36.4** (con la fascia sicura), non qui;
- gli scambi della persona vera vengono dal rumore della cima (±12° attorno a 12–15° passa dall'altra parte) e dal centro
  della mira imparato con il rumore: è la **B36.3** (riferimento della mira per partita). Nessuna regola li porta a zero con
  quel rumore; e la cima vera di Torino è molto più rumorosa (vedi «In breve»).
Non ho toccato altri valori per far tornare i numeri: la tappa dice «curva della cima, bordi, aria e profondità come oggi».

**Serie** (lo stesso voluto 14 volte di fila, 20 serie, dritto del destro, scambi di prova, gesto buono): «insegnato»
incrociato 78% ± 2, centro 67 → 78% ± 2, lungolinea 61% ± 3 (uguali o meglio di oggi); «piatto» centro 67 → 78%, incrociato
69 → 67%, lungolinea 48 → 50%. Il criterio 3 (≥ 90%) è della B36.3–B36.4.

**Solo tempo entro ±1 m** (criterio della B36.1 nel piano): cima dritta, tempo da ritardo pieno ad anticipo pieno, sul
rimbalzo vero, dalle tre posizioni: la palla si sposta di **−0,86…+1,03 m** al centro, di ±0,94 m attorno al colpo a tempo da
tutte e tre (oggi da −3,0 a +3,2 m). Sul bersaglio del motore al più 0,3 × 3,65 = 1,10 m. Provato da `natpf-b36-direzione`.

**Fuori** (Esperta e Leggenda, da fermi e in corsa con corsa 0,7 e palla a 1,6 m; 288 colpi per riga, rimbalzo vero):

| Livello, situazione | gesto | Classica | Nuova |
|---|---|---|---|
| Esperta, da fermo | tutti (naturale, insegnato, riga; buono e vero) | 0% | 0% |
| Esperta, in corsa | naturale / insegnato / riga, persona vera | 3% / 2% / 3% | 0% / 0% / 0% |
| Leggenda, da fermo | naturale / riga, persona vera | 3% / 3% | 0% / 1% |
| Leggenda, in corsa | naturale / insegnato / riga, persona vera | 8% / 7% / 16% | **0% / 0% / 0%** |
| Leggenda, in corsa | riga, gesto buono | 17% | 0% |

Come il piano diceva («alla B36.1 interna la persona vera a Leggenda esce molto meno, 14% → 0,4%»): con il tempo che pesa
0,3 un colpo in tempo non porta più la palla oltre la riga. Per questo la tappa è interna; i fuori «come nel tennis vero»
(decisione D3) arrivano con la B36.4.

**Partite dei giocatori simulati contro la CPU** (`rally-balance`, 150 punti × 3 semi per riga, «Classica» → «Nuova»; con
«Nuova» chi mira gira la cima verso il lato libero e colpisce a tempo; il «bambino» non mira mai). Solo indicazioni per la
B36.7 (equilibrio): non sono un cancello di questa tappa.

| Livello | Profilo | punti vinti | palle oltre 2,5 m | 3 celle di 1 m più colpite | punti persi con la palla fuori o in rete |
|---|---|---|---|---|---|
| Bambini | bambino (non mira) | 84,0 → 82,9% | 35 → 16% | 19 → 27% | 5,3 → 0,4% |
| Bambini | amatore | 99,1 → 99,8% | 29 → 35% | 21 → 22% | 0,4 → 0% |
| Casual | bambino | **55,6 → 42,4%** | 47 → 19% | 17 → 28% | 15,6 → 1,6% |
| Evento | bambino | **46,9 → 40,4%** | 47 → 18% | 19 → 30% | 18,2 → 2,9% |
| Evento | amatore | 65,1 → 65,3% | 46 → 35% | 15 → 17% | 22,4 → 7,8% |
| Evento | tennista | 93,8 → 96,0% | 43 → 65% | 17 → 25% | 5,3 → 1,8% |
| Esperta | amatore | 54,4 → 43,8% | 47 → 34% | 15 → 19% | 27,8 → 18,0% |
| Esperta | gira tanto (30°) | 50,2 → 70,0% | 78 → 67% | 28 → 28% | 41,8 → 9,3% |
| Leggenda | tennista | **28,2 → 44,0%** | 56 → 71% | 17 → 26% | 56,9 → 50,9% |
| Leggenda | bambino | 6,0 → 13,1% | 54 → 22% | 15 → 23% | 30,0 → 7,1% |

Tabella completa (7 profili × 5 livelli) in `scripts/audit/b36/risultati/b36-1-partite.txt`. Quello che dice:
- **chi non mira** (il «bambino» del banco) manda la palla molto più al centro (oltre 2,5 m: da 35–51% a 16–22%), esce
  quasi mai, ma a Casual ed Evento vince meno punti (−13 e −6,5): è il rischio del §6.4 del piano (oggi le sue palle larghe
  vengono dal rumore del tempo). Criterio 7 del piano: rosso a Casual ed Evento con «Nuova» (rimedi: B36.6 insegnare la cima,
  B36.7 la CPU);
- **chi mira con la cima** vince di più, soprattutto a Esperta e Leggenda (gira tanto a Esperta +20 punti, tennista a
  Leggenda +16): «Leggenda contro tennista» di `audit:legend` passa da 92,3% a 67,7% di game della CPU (criterio ≥ 85%);
- **le palle si ammucchiano di più** (3 celle più colpite +5–10 punti): è la «calamita» del criterio 5, che il piano toglie
  con la fascia della riga (B36.4) e il campo intero (B36.5).
- Nota sul profilo «umano»: quando la palla non ha ancora rimbalzato il banco gli fa mandare colpi «come il mouse»
  (intenzione ricostruita, regola di oggi): con «Nuova» solo metà dei suoi colpi usa la regola nuova (1 771 su 4 126 a
  Evento). È un limite del banco di sempre, non del gioco.

## 6. Prove nuove

| Prova | Cosa controlla |
|---|---|
| `natpf-b36-interruttore` (5) | «Classica» identica su 10 000 casi (impronta della base); con «Nuova» cambia solo per i telefoni con la forma, non per webcam, mouse, telefoni vecchi e schiacciata; opzione di base «Classica», salvata, valori sconosciuti, archivio che non risponde; il motore la legge **a inizio partita** (cambiata in partita vale dalla dopo), il forzato dei banchi comanda, il P2 della sfida parte da «Classica»; scarto della cima nullo → regola nuova con piatto 0; registro: `dir` nella riga «partita» e `nr` nei colpi (non nel colpo del mouse) |
| `natpf-b36-direzione` (6) | **monotonia** fino alla mira piena (17°, 20°, 23°), a ogni tempo nella finestra, da ogni posizione, a ogni livello, dritto e rovescio; curva della cima di oggi oltre la mira piena; tempo che pesa 0,3, niente spinta naturale, punto neutro al centro, cima girata con il tempo contro che resta dal lato della cima; **ritmo fuori** dalla direzione e ritardo abituale che resta; **specchio** dritto/rovescio e destro/mancino (sull'esito) e P1/P2, mancino e rovescio **nel motore**; **determinismo**; **solo tempo entro circa un metro** sul rimbalzo vero dalle tre posizioni, e monotonia anche sul rimbalzo vero; i banchi `rally-balance`, `due-umani`, `due-umani-distanza` con «Nuova» giocano la regola nuova (tutti i colpi del telefono con la forma, nessuno ricostruito) e con «Classica» mai |
| `natpf-b36-sfida` (3) | l'host manda `dir` nello snapshot (Classica di base, Nuova salvata); il P2 segue l'host, un host di prima non cambia niente, la previsione del colpo del P2 usa la regola dell'host; pannello: Classica ↔ Nuova, scritta e avviso, salvata, il chiosco e «Nuovo giocatore» non la toccano, la partita dopo la legge |
| `tools/e2e/natpf-menu.mjs` (browser) | 58/58: in più, a 1366 × 657, 1024 × 600, 1280 × 720, 1024 × 1024 e 720 × 720 la voce «Direzione dei colpi» in vista, il clic del mouse la porta a «Nuova · in lavorazione» (salvata) e la riporta a «Classica», il foglio non scorre e «Chiudi» resta in vista |
| `tools/e2e/natpf-pannello-cadute.mjs` (browser) | 33/33, invariata: il pannello con le righe delle cadute a 1024 × 600, 1280 × 720, 1920 × 1080, 720 × 720, 1366 × 657, 1920 × 540 |

La voce prima della «Mira del telefono» e non dopo: la prova di sempre `natpf-mira-sensibilita` vuole la «Mira» ultima della
griglia e nessun percorso di file del repository nell'HTML del pannello (il primo tentativo li violava tutti e due:
corretto il codice, non la prova).

## 7. Test e impronte che cambieranno al traguardo C

Il piano chiede che i test dell'esito girino con tutte e due le regole e che l'accensione del traguardo C cambi solo il valore
di base. Per questo c'è il parametro **`NATPF_DIREZIONE=nuova`** (`test/alias-hooks.mjs`): fa caricare il gioco con
«Nuova» come valore di base (`natpf_direction.DIR_DEFAULT`) senza toccare il codice, per tutte le prove e per tutti i banchi
che si lanciano con `--import ./test/register.mjs`:

```sh
cd natpf-tennis
NATPF_DIREZIONE=nuova npm test                 # prove del gioco con «Nuova» di base
NATPF_DIREZIONE=nuova npm run audit:legend     # e così ogni banco (audit:cpu, audit:evento, b25, b42, …)
```

Risultato di oggi (20/11, ramo `b73-direzione`): **1897 su 1929**, 31 rosse. Una (`registro-worker`, «testi enormi costano
pochi millisecondi»: 39 ms con la macchina carica) è di tempo e non della direzione: da sola, con `NATPF_DIREZIONE=nuova`, è
verde (24/24). Le altre **30, in 19 file**, sono la lista del traguardo C (elenco con il messaggio di ognuna in
`scripts/audit/b36/risultati/b36-1-prove-nuova.txt`). Il motivo di ognuna:

**A. Dicono che oggi la base è «Classica»** (al traguardo C si cambia il valore atteso, niente altro):
- `natpf-b36-interruttore` (3), `natpf-b36-sfida` (3), `natpf-b36-direzione` («con Classica mai»: `simulate` senza `dir`),
  `natpf-b36-misure` («oggi solo classica» e la riga «partita» con `dir: 'classica'`), `natpf-registro` (2: `dir: 'classica'`
  nelle righe «partita» e «minigioco» di Precision).

**B. Impronte di partite simulate** (i giocatori simulati del telefono mirano con l'inversa della regola nuova, le palle
cadono altrove: si riprendono le impronte, come al B48):
- `natpf-b36-misure` (impronte di `rally-balance` della base: `tennista/pro`, …);
- `natpf-b25-stesso-schermo` («partite identiche a f08243a, punto per punto»);
- `natpf-b42-scambi-lunghi` («le partite cambiano solo dal 20° colpo»: confronto con le partite di riferimento);
- `natpf-b33-fine-partita` (partita a sorteggi fissi che deve avere colpi fuori: con «Nuova» il bambino a Bambini non ne fa,
  0 su 173; serve un altro seme o profilo);
- `natpf-b32-movimento` (B34: «in corsa» scritto 50 volte in 80 punti a Evento contro 201 di prima: il numero di confronto
  è quello della regola di oggi);
- `natpf-scritte-esito` (revisione B18: la prova vuole almeno 5 colpi «Fuori» in 60 punti di «umano» a Pro; con «Nuova» ce
  n'è 1, ed è davvero fuori: la coerenza «Fuori» ↔ palla fuori resta, 0 errori su 407; serve un campione più lungo).

**C. Provano la regola di oggi (il tempo comanda)**: con «Nuova» vanno scritte per le due regole (parametro `dir`):
- `natpf-colpi-b15` (3): «tempo → direzione uguale a ogni livello» (con «Nuova» il tempo sposta al più 1,1 m: 1,095 / 0,547 /
  0 / −0,547 / −1,095); «persona vera: palle più aperte» (x p90−p10 6,16 m, sotto la soglia di oggi: chi non mira apposta
  manda la palla più al centro, §6.4 del piano); «forza più ampia» (profondità p90−p10 3,15 m);
- `natpf-racchetta-motore` (3): «in anticipo incrociata, in ritardo lungolinea» (anticipo −0,70 m: il ritocco piccolo è
  voluto); «scambi dinamici» (tre celle più colpite 42% a Casual: chi non mira resta più al centro); «ritmo nel motore» (con
  «Nuova» il ritmo non conta più nella direzione: è voluto);
- `natpf-campo-aperto` («conta dove è la palla»: con «Nuova» il punto neutro è al centro e non segue più la palla: voluto);
- `natpf-b35-direzione` («tempo sempre 1,2 finestre in ritardo: il lungolinea voluto resta lungolinea» 56% con «Nuova»: il
  lungolinea viene dalla cima, non dal tempo);
- `natpf-rete-b17` («dodici gesti → dodici esiti diversi» a rete: la dispersione voluta copre −0,85…+0,82 m invece di tutta
  la larghezza, perché il tempo pesa 0,3).

**D. Equilibrio** (tappe B36.3 e B36.7, si correggono la CPU o il riferimento della mira, mai le regole di chi gioca):
- `natpf-legend-b16`: «la Leggenda batte i profili forti»: il «tennista» vince il 44% dei punti (massimo 33,5%);
- `natpf-b18-t2-cpu-pressione`: «bambino» a Casual vince il 29,4% dei game (criterio ≥ 31%);
- `natpf-b18-t2-servizio` (D11): chi batte tardi a Casual vince il 43,5% dei punti al servizio (criterio di oggi più alto);
- `natpf-mira-lato`: con il seme giusto 1 partita storta (criterio 0): è il riferimento della mira per partita, B36.3.

`NATPF_DIREZIONE=nuova npm run audit:legend` (informazione per la B36.7, non un cancello della B36.1): **un criterio rosso**,
«Leggenda contro tennista: game vinti dalla CPU ≥ 85%» → **67,7%** (con «Classica» 92,3%). Punti di chi gioca contro la
Leggenda, «Classica» → «Nuova»: tennista 28,6 → 41,4%, amatore 14,1 → 22,9%, bambino 7,5 → 11,1%; «medio», «preciso» e
«impreciso» giocano con mouse e tastiera e restano identici (13,9%, 31,4%, 6%). È quello che il piano prevedeva per la
B36.1 interna («a Leggenda in corsa la persona vera esce molto meno», §7.1): chi mira con la cima non sbaglia più per il
tempo. Si corregge la CPU (B16 a), mai le regole di chi gioca.

**Banchi con impronte da riprendere** (non sono prove di `npm test`, li lancia chi fa la tappa; con «Classica» restano
identici): `audit:legend`, `b20/impronta-cpu`, `b25/impronte`, `b37/impronte --semi=7,11,23`, `palla-corta-impronte`,
`fine-partita --impronte`, `evento-bambini --impronte`, `b42/scambi-lunghi --cpu --stesso`. Con `NATPF_DIREZIONE=nuova`
girano già con «Nuova».

## 8. Non verificato

- **Telefono vero, persone, ledwall, programma Windows**: nessuna prova. Tutti i numeri sono del telefono simulato e dei
  giocatori simulati. I dati di Torino dicono che la cima vera è molto più imprecisa del «persona vera» simulato (±12°).
- **Sfida tra due computer nel browser** (`natpf-1v1-p2p` con l'host su «Nuova»): non fatta; provati in node lo snapshot
  (invio e lettura) e la previsione del colpo del P2 con l'interfaccia vera senza disegno (`natpf-b36-sfida`).
- **Doppio 2v2** con «Nuova»: i colpi del telefono passano dalla stessa funzione e prendono la regola nuova; non provato.
- **Equilibrio dei livelli** con «Nuova» (criteri 7–10 del piano): non è un cancello della B36.1; i numeri del §5 sono
  indicazioni per le tappe B36.4–B36.7.
- **Webcam con «Nuova»**: regola di oggi, provata solo in node (intenzione ricostruita).

## 9. Come riprendere

- Unire il ramo `b73-direzione` in `natpf-simulator` (commit locali, niente push da qui), poi le prove di sempre e la versione
  nuova: con «Classica» di base i pacchetti cambiano solo per la voce nuova del pannello.
- Prossima tappa del piano: **B36.2 è caduta** (decisione D2: palle corte e volée accese come oggi); poi **B36.3**
  (riferimento della mira, dopo B41 parte 1 e B28.1, già fatte) e **B36.4** (righe e aria: fascia sicura, riga, aria di
  lato, causa del fuori). Il traguardo A arriva dopo la B36.5. Fino ad allora la voce resta «Nuova · in lavorazione».
- Prima di andare avanti conviene rivedere con l'utente i dati di Torino (`docs/b36/misure-torino.md`): con la cima vera
  così imprecisa la regola nuova va misurata allo stand (Precision, B36.0 §6) prima del traguardo A.
- Per misurare con «Nuova»: `node --import ./test/register.mjs scripts/audit/direzione-telefono.mjs --b36 --dir=nuova
  --modelli=piatto,naturale,tempo,insegnato`; `npm run audit:rally -- --dir=nuova`; ogni banco con `NATPF_DIREZIONE=nuova`.
