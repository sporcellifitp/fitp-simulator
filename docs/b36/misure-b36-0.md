# B36.0 · Misurare prima (il gioco non cambia)

**Stato.** Fatto sul ramo `b36-0-misure` (base `natpf-simulator` 2026-11-13.12, `0035e02`), da unire. Prima tappa del piano
`docs/b36/piano-direzionalita.md` (§3 e §8, decisione D6 dell'utente: «B36.0 dopo B43»). **Il gioco non cambia**: impronte
dei banchi e `audit:legend` identici alla base (§7). Si aggiungono solo misure:

1. il **registro dello stand** scrive nove campi nuovi sulla direzione dei colpi (§1);
2. il **riassunto del registro** ha una sezione «Direzione» (§4);
3. i **giocatori simulati** dei banchi mandano anche lo scarto della cima, e ci sono due profili nuovi (§5);
4. il **banco della direzione** misura sul rimbalzo vero, da tre posizioni, con serie, partite, seme e posa «pronto» (§5).

**Cosa serve da te** (solo mouse e telefono): ricaricare **una volta** il Worker del registro (§3) e, allo stand, una
prova di **15–20 minuti a Precision** con tre persone (§6).

Tutti i numeri di questo documento vengono da **simulazioni** (telefono simulato con il braccio, motore vero senza
grafica, giocatori simulati): non sono misure di persone. Le misure vere arrivano dal registro dopo la prova allo stand.

---

## 1. Cosa si misura e dove

Campi nuovi, tutti insieme perché il Worker si ricarichi una volta sola. Il formato delle righe passa da 1 a 2 (campo `v`
della riga «avvio»). Solo numeri di gioco: niente di chi gioca.

| Campo | Riga | Che cosa è | Da dove viene |
|---|---|---|---|
| `pf` | colpo | **piatto**: la mira letta dalla cima del telefono, da −1 (tutta a sinistra) a +1 (tutta a destra) | `natpfLastRacket.intent.face` (`natpf_stroke_intent.faceAimFromDev`); solo telefoni con la forma del colpo, non webcam, mouse o telefoni vecchi (intenzione ricostruita) |
| `dv` | colpo | **scarto della cima** in gradi dal proprio colpo abituale (+ a destra) | `natpf.aimDev` del gesto (`natpf_phone_racket.js:274`); assente finché il gioco non conosce il centro della mira |
| `tu` | colpo | **tempo** in unità della finestra della direzione (+ anticipo, − ritardo; ±1 = bordi della finestra) | `strokeOutcome().t` (tempo vero: il ritardo abituale del B35a non è tolto) |
| `rx`, `rz` | colpo | **primo rimbalzo vero** della palla (metri, stesso riferimento di `x` e `z`) | anello del rimbalzo del motore (`_spawnBounceRing`, chiamato a ogni rimbalzo prima di contarlo) |
| `fu` | colpo | 1 = **fuori al rimbalzo vero** per l'arbitro del motore: oltre la riga laterale del singolare di più di 0,22 m, oltre la riga di fondo di più di 0,28 m, o nella propria metà | `registro_registratore.LINEE`, uguale a `game_engine.js` (un test lo controlla) |
| `nr` | colpo | 1 = colpo giocato con la **regola nuova** della direzione | dalla B36.1 (`out.rule === 'nuova'`, `natpf_direction.usedNewRule`); oggi mai |
| `zp` | colpo | **zona chiesta da Precision**: 0–9 = zone 1–10 di `natpf_arcade.PRECISION_ZONES` | `ui.events.active.zoneIdx` al momento del colpo |
| `dir` | partita, minigioco | **modello della direzione** della partita o del minigioco: `classica` (dalla B36.1 anche `nuova`) | `natpf_direction.dirModelOf(engine)`: oggi sempre `classica` |

I campi di prima restano tutti: `x` e `z` (bersaglio del motore), `d` (mira totale), `ms` (tempo in millisecondi), `lato`
(+1 dritto del destro e rovescio del mancino), `voto`, `e` (colpo fallito)…

**La riga del colpo aspetta il rimbalzo.** Il gioco tiene da parte la riga di ogni colpo della racchetta e la scrive al
primo rimbalzo della palla di quel colpo (con `rx`, `rz` ed eventualmente `fu`), oppure, senza rimbalzo, appena la palla non
può più rimbalzare: palla presa al volo, in rete, punto finito, fine della partita o del minigioco, menu, pagina chiusa, o
dopo 6 secondi. Il tempo `t` e il numero della partita `n` restano quelli del colpo. I colpi di un punto stanno sempre
prima della sua riga «punto» e dentro la loro partita; una riga scritta mentre la palla vola (per esempio un telefono
caduto) può finire prima del colpo. È solo lettura: il motore non cambia.

**Peso.** Una riga «colpo» cresce di circa 57 byte (registri finti: da 122 a 179 byte in media); una partita da 6,3 a 7,5 kB
in chiaro, da 0,94 a 1,23 kB compressa. La stima prudente del B30 (2,5 kB a partita nello spazio) resta valida.

## 2. Compatibilità con il Worker

| Worker | Righe del gioco nuovo (B36.0) | Righe di un gioco di prima |
|---|---|---|
| **di prima** (oggi su Cloudflare) | accettate tutte (200, nessuna scartata); il Worker **toglie in silenzio i campi nuovi**; il resto della riga resta | accettate, come sempre |
| **nuovo** (B36.0) | accettate con i campi nuovi | accettate e scritte identiche |

- Scelta: **il Worker di prima continua ad accettare le righe**, il gioco non le tiene in coda. Il registro quindi non si
  ferma mai; finché il Worker non è ricaricato si perdono **solo** i campi della direzione di quei giorni.
- Il riassunto lo dice: «ATTENZIONE: … partite di un gioco con il formato delle righe 2 senza i campi della direzione: il
  Worker del registro non è stato ricaricato».
- Provato: test `registro-worker.test.mjs` (Worker di prima ricostruito dal file di oggi senza i campi nuovi, nei due versi)
  e una prova una tantum con il file vero del Worker della base (`0035e02`): Worker di prima + righe nuove → 200, 6 righe su
  6, nessun campo della direzione salvato; Worker nuovo + righe nuove → 200, campi salvati; Worker nuovo + righe di prima →
  200, identiche (`natpf-tennis/scripts/audit/b36/risultati/worker-compatibilita.txt`). **Non provato su Cloudflare vero.**
- Il Worker nuovo mostra nella sua pagina **«Formato delle righe: 2»** e lo dice anche a un programma (`formato: 2`): così
  si vede subito che la versione nuova è attiva. Il Worker di prima non ha questa riga.

## 3. Ricaricare il Worker (per te, con il mouse)

Serve **una volta**, prima della prova a Precision. Le variabili (la chiave di lettura, le origini permesse) e il
collegamento al bucket **restano**: non vanno toccati. I nomi dei pulsanti di Cloudflare cambiano spesso: dove è scritto
*(nome non confermato)* cerca la voce con il significato più simile.

1. Prendi il file **`natpf-registro-worker.js`** che ti mando con la versione (è `natpf-tennis/cloudflare/registro-worker.js`
   del repository). Clic destro sul file → **Apri con** → **Blocco note**.
2. Nel Blocco note: menu **Modifica** → **Seleziona tutto**, poi menu **Modifica** → **Copia**. Lascia il Blocco note aperto.
3. Apri https://dash.cloudflare.com con il tuo account.
4. Menu a sinistra: **Workers & Pages** *(a volte dentro «Compute (Workers)»)*. Nell'elenco clicca **natpf-registro**.
5. In alto a destra clicca **Edit code** *(«Modifica codice»; nome non confermato)*. Si apre l'editor con il codice di oggi.
6. Seleziona tutto il codice di oggi con il mouse: clicca alla fine dell'ultima riga (scorri in fondo con la rotella), poi
   tieni premuto il tasto sinistro e trascina verso l'alto oltre il bordo dell'editor finché arriva alla prima riga
   (l'editor scorre da solo). Tutto il testo diventa evidenziato.
7. Clic destro sul testo evidenziato → **Paste** *(«Incolla»)*. Se il browser chiede di permettere l'accesso agli appunti,
   clicca **Consenti**. Ora nell'editor c'è il file nuovo: comincia con «// Registro dello stand di NATPF Simulator» e
   finisce con `};`.
8. In alto a destra clicca **Deploy** *(«Distribuisci»)* e conferma se lo chiede.
9. Prova: apri in una scheda nuova l'indirizzo del Worker (quello del punto 8 della guida `docs/GUIDA_REGISTRO_CLOUDFLARE.md`,
   del tipo `https://natpf-registro.<tuo-sottodominio>.workers.dev`). La pagina «Registro di NATPF Simulator» deve dire:
   - «Spazio R2 collegato: **sì**» e «Chiave di lettura impostata: **sì**» (come prima);
   - **«Formato delle righe: 2 (con la direzione dei colpi)»** — questa riga è nuova: se non c'è, ricarica la pagina; se
     ancora non c'è, il Deploy non è andato (ripeti dal punto 5).
10. Se qualcosa va storto: nella pagina del Worker, **Deployments** *(«Distribuzioni»)* → sulla versione di prima **Rollback**
    *(nome non confermato)*. Il registro dello stand non si ferma: le righe restano in coda sul PC finché il Worker non
    risponde.

Con la tastiera è più veloce, come la prima volta: nell'editor Ctrl+A, poi Ctrl+V. La chiave di lettura non serve per
questi passi: non scriverla in chat né in un file.

## 4. Il riassunto: la sezione «Direzione»

`node natpf-tennis/scripts/registro/riassunto.mjs <cartella dei registri scaricati>` → `riassunto.md` e `riassunto.html`.
La sezione «Direzione (B36.0: misure, il gioco non cambia)» sta dopo «Scambi lunghi». Gruppi: **modello della direzione ·
chi gioca · livello** (per esempio «classica · adulto · evento»; nello stesso schermo «classica · stesso schermo»). Una riga
con meno di 200 colpi lo dice («pochi colpi»): lì i numeri sono indizi.

- **Testo in alto.** Partite con i campi della direzione; colpi della racchetta con il tempo in finestre; l'avviso del Worker
  non ricaricato; per Precision la retta «cima → zona» (quanti gradi gira la cima per metro di zona, **quanto sparge il
  giro voluto** in gradi, R²), «tempo → zona» (R²) e gli scarti oltre 45°.
- **Quanto si gira la cima.** Mediana dello scarto (con il segno: vicino a 0 se il centro della mira è giusto), metà e
  9 su 10 entro ± gradi, dispersione (deviazione standard), quote oltre 45° e oltre 60° (misure dubbie).
- **Tempo e cima: chi decide dove va la palla.** Peso del tempo nella mira di oggi (la mira totale `d` meno il piatto `pf`,
  rispetto al totale), tempo tipico, **correlazione di rango cima → rimbalzo e tempo → rimbalzo** (quale dei due spiega di
  più dove cade la palla), colpi con il rimbalzo, rimbalzo vero − bersaglio di lato (95% entro).
- **Obiettivi dello stand** (piano §7.6): E1 la cima conta (correlazione di rango piatto → rimbalzo, ≥ 0,8 con «Nuova») ·
  E2 palle oltre 2,5 m dal centro (a Evento non sotto «Classica») · E3 fuori con il tempo nella finestra (≤ 3% a Bambini ed
  Evento) · E4 nei primi 10 colpi di una partita, colpi con |piatto| ≥ 0,5 (≥ 30%) · E5 partite storte, almeno il 70% dei
  colpi in una metà come la diagnostica (≤ 10%) · durata media della partita (Bambino, Ragazzo, Adulto entro ±10% da
  «Classica»). Con «Classica» sono i valori di riferimento per le giornate con «Nuova».
- **Centro della mira per partita.** |Mediana dello scarto| nei primi 20 colpi di ogni partita: una **stima** dell'errore
  del seme degli scambi di prova (contiene anche le mire volute).
- **Precision: una riga per partita, in ordine di tempo.** Ora, modello, palle, palle con il rimbalzo, **cima verso la zona**
  (palle delle 7 zone laterali con la cima girata dalla parte della zona oltre 3°), **tempo verso la zona** (anticipo o
  ritardo nel verso della zona), giro medio per le zone a sinistra e a destra, distanza media dal centro della zona, punti
  calcolati sul rimbalzo vero e punti del gioco (il gioco li calcola sul bersaglio).
- **Precision: zona chiesta → dove è caduta.** Per ognuna delle 10 zone: palle, caduta media, distanza, quante dentro la zona.

**Come leggere la prova dello stand** (§6). Il registro non sa chi gioca né che cosa gli è stato detto: le partite a Precision
stanno in ordine di tempo, e con la prova fatta nell'ordine del §6 le prime due di ogni persona sono «come ti viene», le altre
due «gira la cima». Il **cancello** del piano (§3) si legge così:
- giro voluto entro circa **15°** («il giro voluto sparge ±…°» nel testo, su almeno 100 palle di 3 persone);
- nei blocchi «gira la cima», **cima verso la zona in almeno 8 palle su 10** (colonna della tabella per partita);
- scarti oltre 45° **al più il 5%**.
Se nei blocchi «come ti viene» il **tempo verso la zona** è più alto della **cima verso la zona**, le persone mirano con il
momento del colpo: la decisione D1 si rivede con te.

## 5. Giocatori simulati e banchi

- **Scarto della cima dai simulati** (`scripts/audit/b36/simulati.mjs`): i profili con il telefono di `rally-balance.mjs`,
  `b19/due-umani.mjs` e `b19/due-umani-distanza.mjs` mandano `natpf.aimDev` (scarto in gradi, senza il tetto di ±1 del piatto
  di oggi) e `natpf.aimFull` (17°), ricavati dallo **stesso sorteggio** del piatto: con «Classica» le partite sono identiche
  bit per bit (§7). La conversione è l'inversa esatta del gioco (`natpf_direction.devOfFace`).
- **Profili nuovi** (in fondo all'elenco, così i banchi delle impronte non cambiano): `medioTel` «medio con il telefono» (il
  «medio» dei banchi, che finora giocava solo con mouse e tastiera ed era cieco alla regola del telefono); `giraTanto` e
  `giraTanto40` «gira tanto»: quando mirano girano la cima di 30 ± 12° e di 40 ± 12° (oltre la mira piena di 17°). Il
  «bambino» resta il visitatore che non mira.
- **Colpi con la regola nuova**: ogni banco basato sui giocatori simulati stampa alla fine una riga, per esempio
  `[B36] colpi della racchetta simulata con la regola nuova della direzione: 0 su 74351 (con «Classica» sono sempre 0)`
  (sull'uscita degli errori: le uscite in JSON e le impronte restano le stesse). I conti sono anche in `out.direzione` dei
  banchi: dalla B36.1 un test fallirà se con «Nuova» restano 0.
- **Banco della direzione esteso**: `node --import ./test/register.mjs scripts/audit/direzione-telefono.mjs --b36
  [--quick] [--json=file]` (circa 60 s; `--quick` 17 s). Senza `--b36` il banco fa quello di sempre (B35a, sul bersaglio).
  Con `--b36`:
  - **rimbalzo vero**: la palla fino al primo rimbalzo con la fisica del motore, fuori con la regola dell'arbitro (+0,22 m
    di lato, +0,28 m in fondo, propria metà; oggi il B35a giudicava sul bersaglio del motore);
  - **tre posizioni della palla**: chi colpisce al centro e a 2,4 m dalle due parti (il punto neutro di oggi segue la palla);
  - **serie come quote**: lo stesso voluto 14 volte di fila, su 20 serie con semi diversi, con l'errore standard;
  - **partite con il rumore** (`colpi.mjs` partite, ora anche `su: 'rimbalzo'`): persona vera, 24 partite da 80 colpi, seme
    del centro della mira sbagliato di 0, ±4°, ±8°, ±15°;
  - **errore del seme degli scambi di prova**: telefono simulato con rumore di posa e di velocità, centro dopo gli scambi
    contro quello del telefono «assestato» della stessa persona (`scambi-di-prova.settled`), 20 telefoni per riga;
  - **posa «pronto»**: stessa mira (cima girata di 15° verso l'incrociato) con un'attesa ferma di 0, 0,5, 1 e 2 s prima del
    colpo.

## 6. La prova a Precision allo stand (15–20 minuti, mouse e telefono)

Serve a misurare per la prima volta quanto è preciso il giro della cima di una persona vera e se chi ha un bersaglio lo
cerca con la cima o con il momento del colpo. Circa 120 palle con un bersaglio noto.

**Prima.** Worker ricaricato (§3: la sua pagina dice «Formato delle righe: 2»). Programma Windows con la versione B36.0,
registro acceso (lo è di base). La direzione resta quella di oggi: non c'è niente da cambiare.

**Chi.** Tre persone: un tennista, una persona che non gioca, un ragazzo se c'è. Su un foglio scrivi l'ordine e l'ora di
inizio di ognuna (nel registro non ci sono nomi).

**Per ogni persona** (5–6 minuti), una dopo l'altra, senza altre partite a Precision in mezzo. Il telefono può essere
lo stesso per tutti (quello dello stand) o quello di ognuno.
1. **Prima persona.** Telefono collegato come sempre (codice QR). Con il mouse: menu principale → **Minigiochi** →
   **Precision**. Il gioco chiede il nome per la classifica: scrivi «Prova1» (senza tastiera: con la tastiera a schermo del
   gioco quando c'è, B38, altrimenti con la tastiera su schermo di Windows: Start → Impostazioni → Accessibilità → Tastiera →
   «Tastiera su schermo»). Se il gioco propone il tutorial corto e la calibrazione, falli fare: il gioco impara il colpo
   normale di quella persona (il centro della mira da cui si misura lo scarto della cima).
   **Persone dopo**: nella pagina del risultato di Precision clicca **Nuovo giocatore**: il gioco dimentica la persona di
   prima (calibrazione compresa), chiede nome («Prova2», «Prova3») e mano, poi tutorial corto, calibrazione e di nuovo
   Precision.
2. **Precision 1 e 2 · «come ti viene».** Dici solo: «Manda la palla nella zona che vedi in campo, come ti viene». Dieci
   palle, una per zona (in alto c'è scritto «Palla N di 10 · …»). Alla fine **Riprova ›** per la seconda.
3. **Precision 3 e 4 · «gira la cima verso la zona».** Dici: «Al momento del colpo gira la cima del telefono verso la zona:
   a sinistra per le zone a sinistra, a destra per quelle a destra; per le zone al centro tienila dritta». **Riprova ›** tra
   la terza e la quarta.

**Dopo.** Aspetta un minuto (il gioco manda le righe da solo ogni 45 secondi), poi dalla pagina del Worker: chiave →
**Mostra i giorni** → **Scarica** sulla riga di oggi. Mandami il file `registro-AAAA-MM-GG.jsonl.gz` così com'è, con il
foglio dell'ordine e degli orari. Lo leggo con il riassunto (§4) e torno da te con i numeri del cancello.

Facoltativo: la prova guidata della diagnostica (Maiusc+D) richiede la tastiera finché la B39 non la porta al mouse.

## 7. Il gioco non cambia: le prove

- **Impronte** (stessi comandi sulla base `0035e02` e sul ramo, uscite confrontate riga per riga): `b20/impronta-cpu`,
  `b25/impronte`, `b37/impronte --semi=7,11,23`, `palla-corta-impronte`, `fine-partita --impronte`,
  `evento-bambini --impronte`, `b42/scambi-lunghi --cpu --stesso` e `audit:legend` (`legend.mjs`): **identiche**. Uniche
  differenze: la riga nuova `[B36] … 0 su N` sull'uscita degli errori e, in `b42`, i secondi impiegati. `audit:legend`:
  «Tutti i criteri rispettati», 87 righe uguali. Uscite e confronto in `natpf-tennis/scripts/audit/b36/risultati/`
  (`impronte-ramo.txt`, `impronte-confronto.txt`).
- **Test nuovi**: `natpf-b36-misure.test.mjs` (registro sul motore vero: rimbalzo e fuori uguali al motore; modello
  «classica»; scarto della cima dei simulati; impronte leggere di `rally-balance` uguali a quelle della base; banco esteso);
  in `natpf-registro.test.mjs` (colpo che aspetta il rimbalzo, Precision, stesso schermo, righe mai perse, regola
  dell'arbitro uguale a `game_engine.js`); in `registro-worker.test.mjs` (campi e formato uguali nelle due copie, Worker
  di prima e nuovo nei due versi, riga «Formato delle righe: 2»); in `registro-riassunto.test.mjs` (correlazione, retta,
  sezione «Direzione»). Le impronte assolute dello stesso schermo (`natpf-b25-stesso-schermo.test.mjs`) passano invariate.
- **Registri finti** (`finto.mjs`): ora anche i campi della direzione e qualche Precision, da un generatore a parte: le righe
  di prima restano identiche (controllato su quattro semi).
- **Sul codice unito con `natpf-simulator`** (`c47a1ff`): gioco 1504/1504, Worker 21/21, sito 226/226, programma Windows
  43/43, LAN 12/12, build riuscito, `npm run audit:legend` identico alla base, prova nel browser `natpf-registro` 39/39.

## 8. Primi numeri (SIMULATI: telefono simulato, giocatori simulati; non persone)

Banco `direzione-telefono.mjs --b36`, Esperta (pro), destri e mancini, calibrazioni rapida, «Salta» e scambi di prova,
semi 1–4 (`natpf-tennis/scripts/audit/b36/risultati/banco-b36-0.txt`):

| Matrice sul rimbalzo vero, quota di colpi giusti | centro | a destra | a sinistra |
|---|---|---|---|
| gesto «piatto» buono (±5°) | 69% | 64% | 63% |
| gesto «naturale» buono (piatto e tempo) | 74% | 71% | 69% |
| gesto «tempo» buono (solo il momento del colpo) | 58% | 56% | 53% |
| «piatto», persona vera (±12°, tempo +0,35 ± 0,45) | 48% | 49% | 48% |
| «naturale», persona vera | 53% | 52% | 52% |

- Fuori o in rete sul rimbalzo vero: **0%** in tutte le righe (Esperta, da fermi). Incrociato e lungolinea scambiati: 0–3%
  con il piatto e il gesto «naturale» buoni, fino al 7% con il solo tempo; con la persona vera 4–31%. Al centro, gesto
  «piatto» buono: 69% sul bersaglio (come il B35a) e 69% sul rimbalzo vero.
- **Serie** (lo stesso voluto 14 volte, 20 serie, gesto buono): incrociato **69% ± 3**, centro 67% ± 3, lungolinea **48% ± 3**
  con il piatto; quasi uguale con il gesto «naturale». Il criterio 3 del piano chiede almeno il 90%.
- **Partite con il rumore** (persona vera, 24 partite da 80 colpi, sul rimbalzo vero): con il seme giusto |mediana x| per
  partita 0,55–0,64 m e 3–5 partite su 24 oltre 1 m da una parte; con il seme sbagliato di ±15° nei colpi 21–40 0,73–0,81 m
  e 9–11 partite su 24, che tornano 0,54–0,58 m (3–6) nei colpi 61–80.
- **Errore del seme degli scambi di prova** (20 telefoni per riga): adulto con 2+2 colpi **5,8°** in media (metà sotto 4,9°,
  9 su 10 sotto 13,5°), con 1+1 8,9°; bambino debole 6,8° e 10,5°; gesto impreciso 11,3° e 15,9°. Il piano vuole al più 4°
  dopo gli scambi (criterio della B36.8): con il telefono simulato non ci si arriva.
- **Posa «pronto»**: cima girata di 15° e tenuta ferma prima del colpo: il gioco legge il 100% del giro senza attesa, **91%
  dopo 0,5 s, 79% dopo 1 s, 61% dopo 2 s**; la palla perde 0,27 m, **0,66 m** e 1,32 m. Il piano fa la tappa B36.9 se con
  attese fino a 1 s la differenza supera 0,5 m: con il telefono simulato **la supera**.
- **Colpi con la regola nuova**: 0 su 21.904 (oggi c'è solo «Classica»).

`rally-balance.mjs` con i profili nuovi (150 punti, 3 semi; punti vinti da chi gioca;
`natpf-tennis/scripts/audit/b36/risultati/rally-profili-nuovi.txt`):

| Profilo | Casual | Pro | Tre celle di 1 m più colpite (casual · pro) |
|---|---|---|---|
| medio (mouse) | 92,2% | 59,6% | — |
| medio con il telefono | 82,2% | 52,2% | 17,0% · 16,6% |
| amatore | 86,0% | 51,3% | 17,8% · 14,8% |
| gira tanto (30 ± 12°) | 88,4% | 54,9% | **35,2% · 26,6%** |
| gira tanto (40 ± 12°) | 89,8% | 53,6% | **34,9% · 27,0%** |

Con la regola di oggi chi gira tanto manda le palle ammucchiate verso le righe (il piatto si ferma a ±1 e il bordo morbido le
tiene a circa 4 m): è la «calamita» che il piano misura (§4.3) e che la regola nuova deve togliere. A Pro chi gira tanto
perde molti punti con la palla fuori (160–168 su 450 punti).

## 9. Non verificato

- **Cloudflare vero**: il Worker nuovo è provato in node con uno spazio R2 finto e confrontato con il file del Worker della
  base; il ricaricamento nella dashboard non l'ho fatto io (passi del §3 con i nomi dei pulsanti non confermati).
- **Telefono vero, programma Windows, ledwall, persone vere**: nessuna prova. I campi `pf`, `dv`, `tu`, `rx`, `rz`, `fu` sono
  provati con il motore vero senza grafica e con un motore finto; `zp` con un minigioco finto (la riga di Precision vera nel
  browser non è stata provata).
- **Nel browser** solo la prova del registro di sempre, `tools/e2e/natpf-registro.mjs` (39/39 sul codice unito, porte
  4110/4111): gioca con mouse e tastiera, quindi prova righe, Worker nuovo e riga «avvio» con `v: 2`, ma non i campi della
  racchetta. Nessuna prova nel browser con il telefono simulato per questo blocco.
- I numeri del §8 vengono dal telefono simulato e dai giocatori simulati; il rumore vero della cima si misura con la prova del
  §6.
- La prova del §6 richiede di scrivere un soprannome: senza tastiera serve la tastiera a schermo (B38) o quella di Windows.
