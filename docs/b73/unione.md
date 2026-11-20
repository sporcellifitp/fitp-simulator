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
