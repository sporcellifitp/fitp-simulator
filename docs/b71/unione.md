# B71 · Unione dei tre rami (gesti, sensori, registro) nel ramo `b71-int` (19/11/2026)

Prodotto: **FIERA**. Agente di unione del workflow B71 (richiesta dell'utente del 19/11: «fixiamo subito i punti più
importanti: calibrazione giocando (importantissima), dritto e rovescio, sensori»). Ramo locale `b71-int` creato da
`natpf-simulator` 9546b9a1; niente push, file di versione non toccati (la versione pubblicata resta la 2026-11-18.3, app
1.0.4). Dati e motivazioni dei cambiamenti: nei documenti dei tre rami, qui non ripetuti.

| Ramo | Testa | Documento | In breve |
| --- | --- | --- | --- |
| `b71-gesti` | 9167f106 | `docs/b71/gesti.md` | calibrazione giocando che impara da ogni colpo non debole («none» stimati da 50% a ~11% sui registri), segno di fiera (6 e 8 voti), verso attorno al picco con confidenza, lato dalla palla con il verso incerto in fiera, palla corta molto in anticipo e debole = gesto debole |
| `b71-sensori` | bd3f28e1 | `docs/b71/sensori.md` | app 1.0.5 (Wi-Fi letta, sensori nativi a 60 Hz con prova e ritorno al browser, schermo che si riaccende), misure di fondo scala e tocchi prima dei buchi |
| `b71-registro` | 9ccf2187 | `docs/b71/registro-tempo.md` | `cf` del gioco, pause del Player 2, colpi a vuoto «tardi» con `ms`, riassunto corretto (perfetti, segnale, batteria), in fiera «Perfetto» 0,55 in anticipo e finestra in ritardo senza l'effetto del B56 |

Ordine: `git merge --no-ff` di `b71-gesti` (9d56b36c), `b71-sensori` (12bc280e), `b71-registro` (65a263bf). Mai rebase
né reset.

## 1. Conflitti e come sono stati risolti

`b71-gesti` e `b71-sensori` si uniscono senza conflitti (righe diverse di `registro_formato.js`, del Worker, di
`racchetta.js` e di `docs/b66/registro-sensori.md`). Con `b71-registro` tre file in conflitto, tutti risolti tenendo il
comportamento dei tre rami:

- **`registro_formato.js` e `cloudflare/registro-worker.js`** (elenco dei campi): i campi si sommano, ognuno sulla sua
  riga dopo `pl` o tra B66 e B36.0 come li avevano messi gli agenti (`vg vc dur hold ls voti`, poi `displayLagMs`; `sr fs vs
  tk rp`). Il nome `CAMPI_B71` era usato da due rami: resta ai campi del verso (b71-gesti); il ritardo dello schermo passa a
  **`CAMPI_B71T`** (`['displayLagMs']`). Il Worker e il gioco hanno ancora la stessa lista (prova
  `natpf-b71-sensori-registro`), formato delle righe ancora 3.
- **`registro_registratore.js`, riga «colpo»**: `cf` è la confidenza del **gioco** (b71-registro; prima quella del
  telefono, 0,45 fissa), `mg`, `gb`, `rit` restano dal telefono, e `versoColpo` aggiunge `vg vc dur hold ls` (b71-gesti).
- Unioni automatiche controllate a mano: `natpf_impact.js` (`earlySoftSpecial`/`specialSpan`/`KEEP` dei gesti accanto a
  `eventAnticipation`/`lateWhiffMeasure`/`ant` del registro: indipendenti), `game_engine.js` (`sideFromBall` nel colpo
  super e `fairPerfect` sul livello, righe 2424–2470; `lateWhiffMeasure` nei due colpi a vuoto «tardi»),
  `natpf_phone_racket.js` (lato dalla palla e segno di fiera; `ant` e ritardo dello schermo non sommato in fiera),
  `registro_misure.js` (campi dei sensori in `tq`; `Pause.cambia` con la chiave salvata; niente più `cf` del telefono).

Test toccati dall'unione (solo per il nome del campo e per una prova più fedele): `natpf-registro.test.mjs` (usa
`CAMPI_B71T`) e `registro-worker.test.mjs` «Worker del 18/11»: il Worker del 18/11 si ricostruisce togliendo **tutte e
tre** le righe del B71 (prima, nel ramo del registro, solo quella di `displayLagMs`) e deve accettare la riga «partita»
togliendo solo il campo nuovo. Documento `docs/b71/registro-tempo.md`: nome `CAMPI_B71T`.

Il **Worker del registro va ricaricato una volta sola** con il file di questa unione perché arrivino tutti e dodici i campi
nuovi (`vg vc dur hold ls voti displayLagMs sr fs vs tk rp`); quello caricato il 18/11 li toglie in silenzio e accetta le
righe.

## 2. Prove (19/11, ramo `b71-int`)

Tutte sul ramo `b71-int` dopo le tre unioni (testa 65a263bf più i soli documenti di questo passo), contenitore Linux,
Node 22, Chromium senza scheda grafica (`CHROMIUM_PATH=/opt/pw-browsers/chromium`), telefono simulato. Nello stesso
contenitore giravano altri agenti (carico medio 13–17 durante le prove nel browser): le soglie di tempo e di fotogrammi al
secondo ne risentono.

| Suite | Comando | Esito |
| --- | --- | --- |
| Gioco | `cd natpf-tennis && npm ci && npm test` | **1872/1872**, 0 rosse, 0 saltate (1844 + 12 gesti + 14 registro + 2 sensori) |
| Sito e pagina del telefono | `node --test tools/test/*.test.mjs` | **308/308** (289 + 9 gesti + 10 sensori) |
| Server LAN | `(cd tools/lan && npm ci && node --test test/*.test.mjs)` | **13/13** |
| Programma Windows | `(cd natpf-desktop && ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci && npm test)` | **56/56** |
| Build | `cd natpf-tennis && npm run build` | ok (`dist/natpf/js/tennis/sensori-nativi.js` presente) |

Prove nel browser (una alla volta, porte fisse):

| Script | Esito | Cosa copre per il B71 |
| --- | --- | --- |
| `natpf-training-flow.mjs` | **21/21** | percorso di allenamento con il telefono simulato |
| `natpf-scambi-di-prova.mjs` | **32/32** | calibrazione giocando (scambi di prova, livello imparato) |
| `natpf-registro.mjs` | **39/39** | registro dello stand, `cf` del gioco, campi nuovi, Worker vero |
| `natpf-registro-sensori.mjs` | **23/23** | registro con le misure del telefono (B66 + B71), riassunto, peso 5942 → 6940 byte |
| `natpf-b47-fiera.mjs` | **20/20** | modalità fiera |
| `natpf-formato-fiera.mjs` | **29/29** | formato della partita in fiera |
| `natpf-stesso-schermo-b20.mjs` | **52/52** | stesso schermo, due telefoni |
| `natpf-fiera-telefoni.mjs` | **66/66** | telefoni dello stand |
| `natpf-tutorial-phone.mjs` | **46/46** | tutorial con il telefono |
| `natpf-gesti-speciali.mjs` | **9/9** | pallonetto, palla corta, schiacciata dal telefono simulato |
| `natpf-gesti-sequenze.mjs` | **47/47** | dimostrazioni dei gesti del tutorial (fotogrammi) |
| `natpf-sensori-nativi.mjs` (run-local) | **15/15** | ponte finto dell'app 1.0.5, prova e ritorno al browser |
| `natpf-app-android.mjs` (run-local, `dist`) | **5/5** | pagina del telefono dentro l'app |
| `natpf-telefono-bloccato.mjs` (run-local, `dist`) | **12/12** | blocco dei tocchi |
| `gesture-calibration.mjs` (run-local) | **21/21** | calibrazione dei gesti sul sito |
| `phone-only.mjs` + `timing-browser.mjs` (run-local) | **10/10** e **8/8** | telefono come unico controller, tempo |

Rossi che non vengono dall'unione (nessuno dei tre rami tocca il disegno, la modale dei gesti o le mascotte):

- `natpf-modale-gesti.mjs`: due giri, **28/29** il primo (fermato poi da un errore della prova stessa: la cartella delle
  schermate passata con `OUT` non esisteva; rosso «modale sopra il campo che gioca ≥ 55 fps o ≥ 85% del campo da solo»:
  1,3 contro 1,7 fps, cioè il 76%) e **27/29** il secondo (rossi «modale sopra l'arena ferma ≥ 55 fps»: 53,3 fps, e «due
  animazioni insieme ≥ 50 fps»: 49,0 fps). Sono soglie di fotogrammi al secondo in Chromium senza scheda grafica con la
  macchina carica; i rossi cambiano da un giro all'altro.
- `natpf-lob-drop.mjs` (mascotte Lob e Drop, problema già noto, 136/137 dalla 17.3): nel primo giro fermato dal limite di
  900 s della prova durante la misura del costo del disegno, con **123 OK e 1 rosso**, il rosso già noto dei piedi in
  corsa (80 passi su 2600 con tutti e due i piedi alzati, 3,08%, contro il 3%). Secondo giro senza limite stretto
  (2654 s): **136/137**, lo stesso rosso già noto e nient'altro.
- `natpf-registro-sensori.mjs`: 23/23, ma il processo di Node non esce da solo dopo il sommario (fermato a mano):
  succede uguale su `natpf-simulator` 9546b9a1 senza il B71 (provato in una copia di lavoro staccata: dopo il sommario
  restano dei timer attivi, `process.getActiveResourcesInfo()` = due `Timeout`), quindi non è dell'unione. Altre prove della
  stessa famiglia finiscono con `process.exit`; questa no. Da sistemare a parte se serve (la prova non è nella CI).
- Confronto per la modale dei gesti, stessa macchina e stesso carico, su `natpf-simulator` 9546b9a1 senza il B71:
  **25/29** (quattro rossi di fotogrammi al secondo: 39,6 · 0,4 contro 0,9 · 35,7 · 25,5 fps). Stessa famiglia di rossi,
  anche più numerosi: è il carico della macchina, non l'unione.

## 3. Interazioni tra i rami da tenere d'occhio (non errori trovati, cose da misurare)

- **Istante del picco con i sensori dell'app** (b71-sensori) e **arrivo ≥ 150 ms = verso incerto** (b71-gesti,
  `VERSE_FAIR.late`): con i campioni dell'app il picco ha l'istante vero del sensore, qualche ms prima dell'evento di
  Chrome, e i campioni arrivano a lotti; l'arrivo misurato dal PC può crescere di poco e far prendere il lato dalla palla
  a qualche colpo in più. Da guardare nel registro: `ls` e `rit` dei colpi con `sr` `n` contro `b`.
- **Attesa del colpo vero dopo un gesto debole** in fiera: si allungano tutte e due le cose (palla corta debole molto in
  anticipo = gesto debole, b71-gesti; scadenza in ritardo allargata della correzione del B56, b71-registro). Ognuno dei due
  documenti dice «fino a ~0,22 s dopo l'arrivo della palla» misurato sul proprio ramo; l'effetto dei due insieme non è
  misurato a parte, le prove (gioco, scambi di prova, registro, fiera) sono verdi.
- **«Perfetto» più largo in anticipo** (b71-registro) e **calibrazione giocando** (b71-gesti): gli scambi di prova contano i
  colpi non deboli, non il voto; il voto più largo non cambia cosa si impara.

## 4. Non verificato

- Nessuna prova con un telefono vero, con l'app 1.0.5 vera, con il programma Windows installato o sul ledwall: solo Node,
  Chromium senza scheda grafica e telefono simulato (anche il ponte dell'app è finto).
- APK 1.0.5 non costruito qui (manca l'Android SDK nel contenitore): `gradle testReleaseUnitTest lintRelease
  assembleRelease` e `controlla-classi.mjs` li farà la CI `natpf-android.yml` al push.
- Worker del registro non ricaricato (lo fa l'utente).
- Le soglie nuove (confidenza del verso 0,35, segno 6/8 voti, «Perfetto» 0,55) sono scelte sui registri del 18–19/11 o
  senza dati veri: da rivedere con il prossimo registro, che ha i campi per misurarle.

## 5. Revisione dopo l'unione (19/11)

Revisori e verifica avversaria sul ramo `b71-int`: undici rilievi confermati, **tutti applicati** sullo stesso ramo
(dettagli, numeri e prove in `docs/b71/revisione.md`): calibrazione giocando con il verso incerto in fiera, KEEP con il lato
del gesto, prove che confrontavano un valore con se stesso (gesti); riaccensione dello schermo con il wake lock parziale,
«in uso» azzerato sulla schermata d'avvio e a ogni pagina nuova, ritardo tra browser e app misurato e compensato (sensori);
formato delle righe 4 con l'avviso del riassunto, modalità fiera nel registro (`stand.modo`), `cf` per versione, nota della
fiera nel pannello del ritardo dello schermo (registro e tempo). Il Worker del registro va ricaricato con il file di questa
revisione: la pagina deve dire «Formato delle righe: 4».
