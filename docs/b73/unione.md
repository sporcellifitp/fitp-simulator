# B73 · Unione dei cinque rami nel ramo `b73-int` (20/11/2026)

**Stato.** Ramo locale `b73-int`, creato da `natpf-simulator` (`8d374b7f` = `09cdac6b`, versione pubblicata 2026-11-19.1,
più il solo commit di documenti «B73 avviato»: `docs/PIANO_LAVORI.md`, `docs/PRODOTTI_FIERA_E_ONLINE.md`,
`docs/TRACCIA_PASSI.md`). **Niente push.** File di versione e documenti vivi non toccati (li aggiorna l'agente principale).
Richiesta dell'utente del 20/11 (prodotto FIERA): «Vai avanti su 4, 6 (falli), tecnico».

**In breve.**
- Cinque rami uniti con `git merge --no-ff`, nell'ordine dato: **nessun conflitto** di testo.
- Due file toccati da due rami (`natpf_mascot_rig.js`, `game_engine.js`): riletti a mano, i comportamenti dei due rami
  restano tutti. Nel rig i due cambiamenti si aiutano: nella card i piedi fermi a terra entravano nel campo fino a
  **2,4 cm** con il solo ramo delle mascotte, con l'unione al più **0,5 cm** (§3).
- L'unione **non ha rotto niente**: nessuna correzione è servita.
- Gioco **1942/1942**, sito **322/322**, LAN **13/13**, programma Windows **56/56**, build riuscita; nel browser tutte verdi
  tranne la seconda parte di `natpf-mascotte-3d-anteprima`, che si ferma allo stesso punto anche sul solo ramo delle
  mascotte e sul codice di prima del B73 (ambiente, §4.2).
- **Dopo la revisione** (§7): sei rilievi confermati e corretti (sei commit «B73 sistemazione»); gioco **1954/1954**, sito
  **322/322**, `lan-e2e` 32/32 con il verso dell'asse Z controllato di nuovo.

---

## 1. Rami uniti

| Ordine | Ramo | Testa | Base | Commit | Cosa porta |
|---|---|---|---|---|---|
| 1 | `b73-registri` | `ccb5820c` | `09cdac6b` | 1 | solo il documento `docs/b73/misure-fiera-18-19.md` (misure della fiera del 18 e 19/11: direzione dei colpi e saturazione dell'accelerazione, numeri aggregati) |
| 2 | `b73-direzione` | `74968bfb` | `09cdac6b` | 2 (`4f9e70ad`, `74968bfb`) | tappa B36.1 «La cima comanda (interna)»: voce «Direzione dei colpi: Classica · Nuova · in lavorazione» nel pannello dello stand (di base Classica, gioco identico), campo `dir` nello snapshot della sfida tra due computer, banchi e prove; `docs/b73/direzione-b36-1.md`, riga nuova in `docs/GUIDA_STAND.md` |
| 3 | `b73-mascotte` | `dbceb379` | `8d374b7f` | 3 (`0a38be02`, `3c48d136`, `dbceb379`) | passi veri delle mascotte 3D nella card (avanti, indietro, destra, sinistra): `natpf_card_passi.js` nuovo, piedi nel riferimento del suolo (`cardLeg`), due movimenti nuovi; `docs/b73/passi-mascotte.md` |
| 4 | `b73-prove-a` | `e89857ca` | `8d374b7f` | 4 | `natpf-lob-drop` (piedi delle mascotte che entravano nel campo: `footRaise`/`soleSupport` nel rig, prova sul punto più basso vero) e `natpf-chi-serve` (non si ferma più); `docs/b73/prove-rotte.md` |
| 5 | `b73-prove-b` | `94720eeb` | `8d374b7f` | 3 | richieste «spara e dimentica» che leggono la risposta (`natpf_fetch.js`, `sendAndForget`), `natpf-registro-sensori` che esce da sola (PeerJS in un processo a parte), `lan-e2e.mjs` aggiornata; `docs/b73/prove-rotte-2.md` |

Commit di unione su `b73-int`: `d5af17a7` (registri), `a0b82038` (direzione), `ba8a95a6` (mascotte), `160f2ed2` (prove-a),
`1a9eadbf` (prove-b), più il commit di questo documento.

## 2. Conflitti e file toccati da più rami

`git merge --no-ff` non ha dato conflitti di testo in nessuno dei cinque passi. Solo due file sono cambiati in due rami;
li ho riletti a mano nel risultato.

### 2.1 `natpf-tennis/src/game_engine.js` (direzione + prove-b)

- **direzione:** import di `natpf_direction.js`, `natpfDirModel` letto a inizio partita (il P2 della sfida parte da
  «Classica»), `dir` passato a `strokeOutcome`, `dir` mandato nello snapshot dell'host e letto dal P2.
- **prove-b:** i tre `fetch("/api/match/sync", …).catch(() => {})` diventano `sendAndForget(…)` (chiusura della stanza,
  lobby, snapshot della partita).
- Parti diverse del file. Lo snapshot che porta il campo `dir` della direzione parte proprio dalla chiamata che prove-b
  ha cambiato: nel risultato ci sono tutte e due le cose (`dir: NDIR.dirModelOf(this)` dentro l'oggetto `t`, mandato con
  `sendAndForget`). Nessuna `fetch` nuova senza lettura della risposta negli altri rami (controllato con grep sulle
  aggiunte di direzione e mascotte; la prova `natpf-fetch.test.mjs` di prove-b è verde sul risultato).

### 2.2 `natpf-tennis/src/natpf/natpf_mascot_rig.js` (mascotte + prove-a)

- **mascotte:** `cardLeg` con `legs.frame = 'ground'` (piede fermo nel mondo mentre il personaggio si sposta) e
  `poseMascotCard` che la chiama con l'attore.
- **prove-a:** `soleSupport` (punti del piede che fanno da punto più basso), `footRaise` (quanto alzare il piede
  inclinato perché punta o tallone non entrino nel campo) usato in `legTo`.
- `cardLeg` (mascotte) mette il piede in `side.foot` e poi chiama `legTo`, che ora (prove-a) alza il piede con
  `footRaise`. Quindi nella card l'alzata nuova vale anche per i passi: è voluto da tutti e due i rami (piede che non entra
  nel campo), ma nessuno dei due l'aveva provato insieme all'altro. Misurato nel §3.

## 3. I due cambiamenti del rig insieme, nella card

Sonda in node (modelli veri, come la cattura di `natpf_ritratti`: giro di prova, poi 96 campioni per giro con la reazione
del corpo e il movimento di tutto il personaggio), per i 17 movimenti, Drop e Lob, destro e mancino: punto più basso vero
del piede (vertici della pelle legati alla gamba) rispetto al suolo del posto di partenza. File:
`/tmp/claude-0/-home-user/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b73/unione/piedi-card.mjs` (fuori dal
repository), lanciato sul ramo `b73-mascotte` da solo e su `b73-int`.

| | Solo `b73-mascotte` | `b73-int` (con `footRaise` di prove-a) |
|---|---|---|
| Punto più basso, il peggiore di tutti i movimenti | **−2,4 cm** (Lob, «Quattro passi di festa») | **−0,5 cm** |
| «Quattro passi di festa», Lob destro (piede A / B) | −1,2 / −2,4 cm | +0,1 / 0,0 cm |
| «Passi indietro, a testa bassa», Lob destro (piede A / B) | −1,6 / −2,0 cm | −0,4 / −0,3 cm |
| «Corsa all'indietro», Lob destro | −2,2 cm | +0,1 cm |
| Combinazioni (movimento × mascotte × destro/mancino) con un piede più di 2 mm nel campo | 26 su 68 | 6 su 68 |
| Piede a terra più staccato dal suolo (nei campioni con la posa a terra) | per esempio 1,1 cm nei salti, 1,3 cm nella trascinata | uguale, al più +0,2 cm (Lob nella trascinata e nei passi indietro) |

- L'alzata di prove-a non stacca i piedi a terra (il punto più alto del piede a terra cambia al più di 0,2 cm) e toglie
  quasi tutto l'ingresso nel campo; nessuna combinazione peggiora.
- Resta −0,4/−0,5 cm in «Testa bassa, passi trascinati» e «Passi indietro» (uguale sul solo ramo delle mascotte per la
  trascinata): sono i due movimenti con il personaggio intero un po' piegato in avanti (`pitch` 0,03–0,04 in `at`), e
  `footRaise` misura il «giù» nel riferimento del personaggio. Provato con la stessa sonda togliendo solo quel `pitch`
  (`NOPITCH=1`): il peggiore di tutti i movimenti diventa −0,1 cm. Non è un effetto dell'unione; lo lascio com'è (al più
  5 mm) e lo segnalo all'agente principale.
- Nel browser `natpf-mascotte-passi` (91/91) dà sul risultato gli stessi numeri del documento del ramo: scivolata del piede
  a terra al più 0,1 mm per campione, 4 passi per piede nei «Quattro passi di festa», 2 negli altri, corpo 24 cm di lato e
  27,2 cm avanti-indietro nella festa, 24 cm avanti-indietro nei passi indietro, 20,8 cm di lato nella trascinata.

## 4. Prove sul risultato

Macchina a 4 core condivisa con altri agenti (carico 1,4–4,2 durante le prove), disco quasi pieno (350–410 MB liberi:
ho cancellato solo le mie schermate dopo ogni prova). Prove nel browser una alla volta, Chromium
`/opt/pw-browsers/chromium` senza scheda grafica.

### 4.1 Suite

| Suite | Comando | Esito |
|---|---|---|
| Gioco | `cd natpf-tennis && npm test` | **1942/1942**, 5 min 36 s (1915 di prima + 14 direzione + 5 mascotte + 4 prove-a + 4 prove-b) |
| Sito e pagina del telefono | `node --test tools/test/*.test.mjs` | **322/322** |
| Server LAN | `(cd tools/lan && node --test test/*.test.mjs)` | **13/13** |
| Programma Windows | `(cd natpf-desktop && npm test)` | **56/56** |
| Build | `cd natpf-tennis && npm run build` | riuscita (6,6 s) |

### 4.2 Nel browser

| Prova | Esito | Note |
|---|---|---|
| `natpf-lob-drop` | **137/137**, 18 min 38 s, finita da sola | piedi delle mascotte in campo (prove-a): punto più basso −0,1 cm nelle pose e nelle partite; passi con tutti e due i piedi in aria: 2 nelle pose, 1 nella partita senza persone, 1 contro la CPU (con il centro della pianta, la misura di prima del B73: 276, 453, 440); partita dello stesso schermo verde; fotogrammi al secondo (grafica in software): classici 0,87, mascotte nel codice 0,87, modelli 3D 0,85 |
| `natpf-chi-serve` | **64/64**, 2 min 36 s | finisce da sola (prove-a) |
| `natpf-registro-sensori` | **23/23**, 1 min 31 s | esce da sola con codice 0, nessun `peer-server.mjs` o vite rimasto (prove-b) |
| `natpf-menu` | **58/58**, 1 min 46 s | con la voce «Direzione dei colpi» alle cinque misure di schermo (direzione) |
| `natpf-fine-partita` | **68/68**, 1 min 29 s | |
| `natpf-fine-partita-en` | **101/101**, 58 s | |
| `natpf-servizio-alone` | **27/27**, 1 min 40 s | |
| `natpf-lingua` | **46/46**, 48 s | |
| `natpf-mascotte-passi` (nuova, mascotte) | **91/91**, 1 min 57 s | numeri nel §3 |
| `natpf-fine-partita-ritratti` | **28/28**, 2 min 30 s | card con le mascotte 3D |
| `natpf-tennis/test/e2e/lan-e2e.mjs` (prove-b), `ONLY=telefono,1v1,webcam` | **32/32**, 2 min 53 s | campioni 33/32/32 in 0,95 s; 16 colpi del P2 all'host attraverso il relay; scambio 1v1 più lungo 33 colpi; nessun `net::ERR_INSUFFICIENT_RESOURCES`. Con la build di `b73-int` e `NO_PROXY` con l'indirizzo del PC (come in `docs/b73/prove-rotte-2.md` §2) |
| `natpf-mascotte-3d-anteprima` (aggiornata da mascotte) | **25/25 verifiche fatte**, poi si ferma | vedi sotto |

**`natpf-mascotte-3d-anteprima`.** La prima parte (due partite dello stesso schermo, 22 giri di fotografie, i 17
movimenti per Drop e per Lob, nessun programma shader nuovo, griglia animata, nessun errore nella pagina) è tutta verde:
25/25. Poi la prova apre una **seconda pagina a 1920 × 1080** (la card vera e quella in un'area di ledwall), con la prima
ancora aperta, e lì si ferma:
- su `b73-int`, primo giro: «Target crashed» all'apertura della seconda pagina; secondo giro (da sola, disco liberato):
  la cattura della seconda pagina non dà i fogli (`ritratti.last` senza `items`, errore della prova a riga 53);
- sul solo ramo `b73-mascotte` (cartella del ramo, porta 3196): «Page crashed» allo stesso punto, dopo 25/25;
- sul codice di prima del B73 (`8d374b7f`, la prova con 15 movimenti): attesa di 180 s scaduta allo stesso punto, dopo
  23/23.

Quindi non viene dall'unione e nemmeno dal B73: è la seconda pagina WebGL grande con la grafica in software, oggi su questa
macchina (il ramo delle mascotte la dava 29/29 in mattinata). Restano non fatte qui 4 verifiche (card a 1920 × 1080 e
nell'area 640 × 360: «card con le mascotte 3D» e «nessun errore» per ciascuna). La card con le mascotte 3D a schermo è
coperta da `natpf-fine-partita-ritratti` (28/28) e da `natpf-mascotte-passi` (1280 × 720, 91/91). La prova non è stata
toccata.

## 5. Correzioni fatte dall'unione

Nessuna: l'unione non ha rotto niente che le prove vedano, e la rilettura dei due file in comune non ha trovato
comportamenti persi.

## 6. Non verificato

- La seconda parte di `natpf-mascotte-3d-anteprima` (card a 1920 × 1080 e nell'area di ledwall 640 × 360): ferma per
  l'ambiente anche sul codice di prima (§4.2). Da rifare su una macchina con la scheda grafica o più libera.
- `lan-e2e.mjs` parte 5 («corpo»): non rifatta; nel ramo prove-b era 11/16 per la lentezza della webcam in software
  (`docs/b73/prove-rotte-2.md` §2.5).
- Con la direzione «Nuova» accesa (`NATPF_DIREZIONE=nuova npm test`) non ho rifatto il giro: nel ramo direzione erano 30
  rosse attese, la lista del traguardo C (`docs/b73/direzione-b36-1.md` §7); l'unione non tocca quella regola.
- Le altre prove nel browser che non sono nella lista (per esempio `natpf-pannello-cadute`, che il ramo direzione dava
  33/33) non le ho rifatte.
- Telefono vero, webcam vera, programma Windows (Electron) vero, schede grafiche vere, ledwall: niente di questo qui.
- L'aspetto dei piedi della card con le due correzioni insieme: misurato con la sonda (§3) e dalle verifiche di
  `natpf-mascotte-passi`; le strisce e i fotogrammi non li ho guardati a occhio.

## 7. Revisione e sistemazione

Dopo l'unione una revisione (con due scettici per ogni rilievo) ha confermato **sei rilievi**. Li ho corretti sul ramo
`b73-int`, un commit per rilievo («B73 sistemazione: …»), **niente push**, file di versione e documenti vivi non toccati.
Per ognuno: prima la prova rossa, poi la correzione minima; dove uno scettico indicava una correzione migliore ho seguito
quella. Sonde e registri fuori dal repository, in
`/tmp/claude-0/-home-user/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b73/sistemazione/`.

| # | Rilievo | Commit | Cosa cambia | Prova |
|---|---|---|---|---|
| 1 | direzione letta solo a inizio partita (importante) | `b9a6644d` | gioco | `natpf-b36-attivita` (4, nuova): rossa 3 su 4 prima, verde dopo |
| 2 | sul P2 della sfida il registro scrive «classica» (minore) | `2760d24e` | registro, riassunto, diagnostica | `natpf-b36-sfida` (+3): rosse prima, verdi dopo |
| 3 | colpo super con «Nuova» non scritto (minore) | `44e532b0` | solo documenti e una prova | `natpf-b36-interruttore` (+2): verdi prima e dopo (il codice non cambia); rossa con la scelta opposta |
| 4 | prova «bordi e profondità come oggi» vuota (minore) | `a8731590` | solo la prova | `natpf-b36-direzione` (+1): verde; due errori finti nel codice passano la prova vecchia e non la nuova |
| 5 | piedi delle mascotte sollevati tra una fetta e l'altra (minore) | `3cb6bb7c` | gioco (card) | `natpf-b73-passi-mascotte` (+1): rossa prima (7,9 cm), verde dopo |
| 6 | `lan-e2e` senza il verso sull'asse Z (importante) | `890fd2ad` | solo la prova nel browser e una prova in node | `lan-e2e` con il verso: 13/15 prima, 15/15 dopo; `natpf-b73-presa-verso` (1, nuova) |

### 7.1 Direzione letta anche fuori dalla partita (rilievo «dir-stantia-fuori-partita»)

**Difetto.** `natpfDirModel` si leggeva solo in `startNewMatch`. Scambi di prova, riscaldamento e minigiochi non chiamano
`startNewMatch` e giocavano la regola dell'ultima partita:
- pannello di nuovo su «Classica» dopo una partita con «Nuova»: Precision, riscaldamento e scambi di prova con la regola
  nuova (in fiera gli scambi di prova li fa ogni visitatore);
- «Nuova» salvata e PC appena acceso: Precision con «Classica», quindi la misura a Precision della B36 misurava la regola
  sbagliata.

**Correzione.** Un metodo solo nel motore, `natpfReadDir()` (`game_engine.js`), con la regola di prima (P2 della sfida:
«Classica» fino allo snapshot; altrimenti `dirModelFor({ forced: natpfDirRule })`). Lo usano `startNewMatch`,
`natpf_events.start`, `natpf_training.start` e `natpf_trial.start`. Negli scambi di prova non con `resume` («Ricalibra» a
partita in corso: la partita tiene la sua regola). Avviso del pannello: «Vale dalla prossima partita o minigioco».
Aggiornati il commento di `natpf_direction.js`, `docs/b73/direzione-b36-1.md` §1 e la riga di `docs/GUIDA_STAND.md`.

**Prova.** `natpf-b36-attivita.test.mjs` (interfaccia vera): partita con «Nuova», pannello di nuovo su «Classica», poi
Precision, riscaldamento e scambi di prova → colpo del telefono senza `rule`, riga «minigioco» con `dir: 'classica'`;
«Nuova» salvata a PC appena acceso → `rule: 'nuova'` e riga «minigioco» `dir: 'nuova'`; «Ricalibra» non cambia la regola
della partita; il forzato dei banchi comanda anche nei minigiochi. Prima: 3 rosse su 4 (la terza, «Ricalibra», era già
verde: protegge dalla correzione esagerata). La sonda della revisione dopo la correzione: Precision `classica · rule
undefined`, riscaldamento uguale, scambi di prova uguale; «Nuova» salvata → Precision `nuova · rule nuova`.

### 7.2 Registro del P2 della sfida (rilievo «p2-registro-dir»)

**Difetto.** Sul computer del P2 la riga «partita» si scriveva subito dopo `startNewMatch`, quando la direzione vale
ancora «Classica»; lo snapshot dell'host porta poi «Nuova» e i colpi del P2 (`nr: 1`) finivano nel gruppo «classica ·
due-computer» del riassunto. In più quei colpi c'erano due volte: li scrive già il registro dell'host (`chi: 'a'`).

**Correzione (quella degli scettici, non quella del rilievo).** Gli scettici hanno mostrato che una riga «senza dir» o la
direzione scritta solo a fine partita non bastano (il riassunto mette ogni colpo nel gruppo appena lo legge, e una riga
senza `dir` diventa il falso allarme «Worker non ricaricato»).
- `registro_registratore.js`: sul P2 (modo `due-computer`) la riga «partita» aspetta il primo snapshot della partita
  dell'host applicato (non la lobby né la pausa, che non portano `dir`) e scrive la sua direzione. Un host di prima, senza
  `dir`, dà «classica», che è la sua regola. Se la partita finisce prima, la riga si scrive alla fine, prima di
  «partita.fine». Il formato delle righe non cambia (nessun tipo nuovo, Worker invariato). Sull'host, contro la CPU e
  nello stesso schermo la riga si scrive subito, come prima.
- `scripts/registro/riassunto.mjs`: le partite con `ruolo: 'p2'` restano fuori dai gruppi della direzione, contate a parte
  (`dir.partiteP2`, una riga nel testo).
- `diag_recorder.js`: sul P2 un evento `partita.direzione` (`da: 'host'`) quando lo snapshot cambia la direzione, e la
  partita in corso (anche la copia per le parti dopo) dice quella dell'host.

**Prove** in `natpf-b36-sfida.test.mjs`: (a) P2 con lo snapshot `dir: 'nuova'` → riga «partita» con `dir: 'nuova'`, colpo
`nr: 1` dopo la riga, nessuna riga «classica», riassunto senza gruppi «classica» e `senzaCampi` 0; host di prima → «classica»;
partita chiusa prima di uno snapshot della partita → `partita`, `partita.fine`, `partita` nell'ordine giusto. (b) Righe
dell'host e del P2 insieme al riassunto: solo `nuova · due-computer` con 1 colpo e 1 partita (prima: anche
`classica · due-computer` con 1 colpo). (c) Diagnostica del P2: un evento `partita.direzione` con `n: 1, direzione:
'nuova'`. Tutte e tre rosse prima.

### 7.3 Colpo super con «Nuova» (rilievo «super-regola-nuova»)

**Difetto.** Il piano §5.2 metteva il super tra gli «invariati» con schiacciata e servizio; il codice gli dà la direzione
della regola nuova e il documento della B36.1 non ne parlava.

**Scelta (dei due scettici), da confermare dall'agente principale perché tocca il piano.** Il codice resta: il super
scatta e agisce come oggi (stesse condizioni, profondità, altezza sul nastro, effetto, velocità; `superShot` non dipende
dalla regola), la sua direzione è quella del colpo da cui nasce. L'altra strada (rifare l'esito con la regola di oggi solo
quando scatta il super) darebbe un salto nascosto sulla soglia della forza (0,58 m che diventano 1,9 m) e due regole nello
stesso scambio, contro la D1 e contro la frase finale del §5.2. Corretti `docs/b36/piano-direzionalita.md` §5.2 (riga a
parte per il super, scritta come chiarimento), `docs/b73/direzione-b36-1.md` §2 e il commento di `natpf_direction.js`.

**Prove** in `natpf-b36-interruttore.test.mjs`: sui 10 000 casi con il gesto forte (3746 super, 1473 con la regola nuova,
tutti con la palla altrove) `superShot` dà lo stesso esito con le due regole; nel motore, palla alta e gesto 0,95, il
super «alta» ha clear, effetto e profondità minima di «Classica» e `rule: 'nuova'`. Verdi prima e dopo, perché il codice
non cambia; la seconda diventa rossa se il super torna alla regola di oggi (provato con il codice cambiato apposta, poi
rimesso).

### 7.4 Prova dei bordi (rilievo «test-bordi-vuoto»)

**Difetto.** La prova confrontava solo `topspin` e `clear`, che non dipendono né dalla mira né dal punto neutro, e con mire
diverse (1 contro 0,9) e palle in posti diversi: passava con qualunque regola della direzione.

**Correzione (degli scettici).** Regola nuova e regola di oggi con la stessa mira **esatta** (tempo 0 e oltre la finestra,
dove la mira si ricava senza arrotondamenti; il piatto di oggi compensa la spinta naturale e il peso del tempo), lo stesso
punto neutro (palla al centro) e la stessa posizione: x, profondità e mira entro 1 mm (un arrotondamento dell'uscita), il
resto uguale. 3564 casi: 1848 oltre `sideKnee`, 1236 oltre `sideLine`, 3036 oltre la finestra (`pushOut`); differenza
massima 1,0 mm in x, 0 in profondità. Il codice del gioco non cambia: la prova è verde. Due errori messi apposta nella
regola nuova (spinta oltre la finestra 1,2 volte, bordo morbido tolto) passano la prova di prima (6/6) e fanno rossa la
nuova; poi tolti.

### 7.5 Piedi delle mascotte tra una fetta e l'altra (rilievo «M1»)

**Difetto (portato dal B73).** Dopo ogni fetta della fotografia `natpf_ritratti._capture` rimette il personaggio al posto di
partenza e l'arena lo disegna così per circa mezzo secondo prima della card. `cardLeg` spostava i piedi con lui solo in x
e z; nei «Salti di gioia» il saltello alza anche i piedi, che restavano staccati fino a 8,2 cm (Drop) e 7,4 cm (Lob).

**Correzione.** `applyCardMove` salva anche `py`; `cardLeg` aggiunge `min(0, root.y − py)` all'altezza del piede. Il
`min(0, …)` è la cautela del secondo scettico: un movimento futuro con i piedi a terra e il corpo più in basso, rimesso al
suo posto, non deve staccare i piedi. Durante il movimento non cambia niente (lì `root.y = py`). Aggiornato
`docs/b73/passi-mascotte.md`.

**Prova** in `natpf-b73-passi-mascotte.test.mjs`: «Salti di gioia» a metà passo (u 0,33 e 0,58; a 0,5 il saltello vale 0 e
la prova passerebbe comunque), destro e mancino, P1 e P2: piedi dove stavano rispetto al corpo e piede più basso entro 2
cm dalla quota di riposo. Prima rossa (7,9 cm), dopo verde. Sonda della revisione dopo la correzione: «win-salti» rimesso
al posto 1,1 cm (Drop) e 0,3 cm (Lob), 0 fasi su 96 sopra 2 cm (prima 52 e 48).

### 7.6 Verso dell'asse Z in `lan-e2e` (rilievo «R1»)

**Difetto della prova.** La verifica dell'asse Z era stata riscritta per passare anche con la racchetta che si inclina dalla
stessa parte nei due versi (polso −10,4° / −10,2°).

**Correzione: quella del secondo scettico, non «KO noto».** Il roll del piatto (`face-tracker.js`, `asin(y·alto) − roll0`)
perde il verso **solo** quando a riposo l'asse y del telefono è verticale. Era la posa del telefono simulato (dritto), non
la presa insegnata. Con la presa «racchetta» (`gripQuat`, gravità a riposo ≈ [0,86, 0,34, 0,37] negli assi del telefono)
il gioco dà già il verso: in node ±30° → beccheggio −14,1° / +13,5°. Tenere la verifica rossa avrebbe segnato come difetto
del gioco una cosa della posa di prova. Il gioco non cambia.
- `lan-e2e.mjs`: il telefono simulato parte da `gripQuat(GRIP_STYLE)`; Z di nuovo con il verso (polso nei due versi, segni
  opposti) e con la differenza fra i due versi; assi della presa insegnata: X → imbardata, Y → apertura (roll), Z →
  beccheggio. Commento corretto.
- `natpf-b73-presa-verso.test.mjs` (nuova, in node): roll e beccheggio con il verso e zero a riposo, gli altri due assi.
  Diventa rossa se il roll perde il segno (provato con il codice cambiato apposta, poi rimesso).
- `docs/b73/prove-rotte-2.md`: osservazione rivista, il 32/32 di allora corretto (con il verso sulla posa dritta la parte
  del telefono era 7/9).

**Nel browser**, `ONLY=telefono`: con il verso controllato e la posa dritta **13/15** (le due verifiche dell'asse Z
rosse); con la presa insegnata **15/15** (polso con Z −9,7° / +9,1°; il servizio con il gesto funziona anche con la presa
nuova). Margine stretto da sapere: con questa presa la rotazione attorno a Z dà anche imbardata (nel browser beccheggio
28,9° contro 24,3° di imbardata fra i due versi; in node 27,6° contro 20,6°). Il roll con il verso in ogni posa resta un
miglioramento facoltativo, da decidere a parte (il campo `fr` va nei colpi e nel registro).

### 7.7 Prove sul risultato (`890fd2ad`)

| Suite | Esito |
|---|---|
| Gioco (`npm test`) | **1954/1954**, 5 min 33 s (1942 + 12 nuove) |
| Sito e pagina del telefono | **322/322** |
| Server LAN | **13/13** |
| Programma Windows | **56/56** |
| Build | riuscita (5,5 s) |
| `lan-e2e.mjs`, `ONLY=telefono,1v1,webcam` | **32/32**, 167 s (polso con Z −9,7° / +9,2°; 14 colpi del P2 all'host; scambio più lungo 28 colpi) |
| `natpf-mascotte-passi` | **91/91**, 118 s |
| `natpf-training-flow` | **21/21**, 35 s |
| `natpf-menu` | **58/58**, 105 s |

**Da decidere (agente principale).**
- §7.3: il chiarimento del piano §5.2 sul colpo super (direzione con la regola nuova) tocca il piano: se l'utente lo
  vuole diverso, la prova di `natpf-b36-interruttore` dice dove cambiare.
- §7.6: il roll del piatto con il verso in ogni posa (non solo nella presa insegnata).
- Il rilievo 1 ha mostrato lo stesso schema per altre opzioni lette solo a inizio partita (per esempio lo scambio che si
  scalda): fuori da questa sistemazione, non guardato.

**Non verificato.** Telefono vero, sfida tra due computer veri (il registro del P2 l'ho provato solo con l'interfaccia vera
in node e il motore senza disegno), le altre prove nel browser fuori dalla tabella, `NATPF_DIREZIONE=nuova npm test`
(la lista del traguardo C), la parte 5 di `lan-e2e` («corpo»).
