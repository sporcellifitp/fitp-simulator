# B66 · Registro dello stand: sensori, calibrazione, prestazioni, precisione dei gesti (18/11/2026)

Richiesta dell'utente (18/11): più dati nel registro dello stand per migliorare **qualità dei sensori, calibrazione,
prestazioni e precisione dei gesti**; «aggiungili tutti subito; il percorso del visitatore non conta; salute del PC non
fondamentale». Prodotto: **FIERA** (il registro è solo nell'installer; app Android 1.0.4).

Tutto è **solo misura**: il gioco e il riconoscimento dei gesti non cambiano (provato: i gesti veri del 28/10 danno gli
stessi colpi, scarti e preparazioni del rilevatore di prima, impronta `933e330650269e1e` in `tools/test/phone-stats.test.mjs`).
Mai campioni grezzi: numeri riassunti per partita e per telefono, più pochi campi per colpo.

**Cosa serve da te:** ricaricare **una volta** il Worker del registro (§5). Finché non lo fai, le righe arrivano lo
stesso ma senza le misure nuove, e il riassunto lo dice («ATTENZIONE: … il Worker del registro non è stato ricaricato»).

## 1. Cosa si registra

Formato delle righe **3** (campo `v` della riga `avvio`). Campi nuovi: `CAMPI_B66` in
`natpf-tennis/src/natpf/registro/registro_formato.js` (la stessa riga nel Worker).

### Qualità dei sensori (riga `partita.fine`, campo `tq`, per telefono `g` / `a`)

| Campo | Cosa | Da dove |
| --- | --- | --- |
| `hz` | frequenza vera dei campioni [mediana, minima] della partita, Hz (campioni contati sul telefono ÷ tempo, un valore per ogni stato di almeno 0,5 s) | telefono, `phone-stats.createSampleStats` |
| `n` | campioni nella partita | telefono |
| `b`, `bm` | buchi (intervallo oltre 2 volte il periodo tipico, e oltre 25 ms) e il più lungo in ms | telefono |
| `bg` | colpi con un buco nei campioni durante il gesto | telefono (campo `gw` del colpo) |
| `iv` | intervallo dei sensori dichiarato dal browser (`DeviceMotionEvent.interval`, ms) | telefono |
| `sat` | campioni saturi [accelerazione, rotazione] (stesso valore grande ripetuto: oltre 15 m/s² o 300 °/s) | telefono |
| `fonte` | `telefono` = pagina di prima: solo la frequenza che il telefono dichiara (media mobile) | PC |

Nelle righe `partita` (oggetto `tel`) e `tel` (collegato): `pv` versione della pagina del telefono **se diversa** da
quella del PC (telefono rimasto indietro), `app` versione dell'app NATPF Racchetta.

### Calibrazione (riga `partita.fine`, campo `cal`, per telefono)

`tip` colpo tipico [inizio, fine] °/s · `tipN` colpi prima che il colpo tipico sia quello imparato giocando · `cen`
colpi prima del centro della mira · `dvi` scarto della cima, mediana [primi 10, ultimi 10] colpi (gradi: quanto cambia in
partita) · `seg` cambi di segno del verso in partita · `mano` cambi di mano · `ric` calibrazioni rifatte in partita ·
`ref` riferimento della calibrazione [inizio, fine] · `tipo` profilo (calibrato · semplice · tocchi) · `soglia` [inizio
del gesto, picco minimo] °/s. I gesti di calibrazione ripetuti e il perché erano già nella riga `calibrazione` (sezione
«Tutorial e calibrazione»); il perché dei cambi di segno nelle righe `tel` del B46.

### Precisione dei gesti (riga `colpo`, colpi del telefono)

`cf` confidenza del riconoscimento del tipo di colpo (0–1, dal telefono) · `mg` picco del gesto diviso la soglia che ha
superato (vicino a 1 = colpo «al limite»; dal telefono, `swing-detect.js`, solo misura) · `gb` buco nei campioni durante il
gesto (ms, solo se c'è). Dritto o rovescio dalla parte opposta alla palla: c'era già (`pl` e `lato`, 17/11); errore di
tempo, voto, esito, scarti: già presenti, non duplicati.

### Prestazioni del collegamento

Riga `colpo`: `rit` [ms dal picco del gesto all'arrivo sul PC, ms dal picco alla risposta del gioco]. Solo con gli orologi
allineati (altrimenti l'istante del picco è una stima del telefono). La «risposta» è il momento in cui il motore gioca il
colpo: se il gesto arriva prima della palla comprende l'attesa della palla.

Riga `partita.fine`, campo `lat` per telefono: `arr`, `ris` [p50, p90, p99] ms · `jit` sbalzo medio del ritardo tra
colpi consecutivi · `n` colpi arrivati · `stimati` senza orologi allineati · `persi` numeri dei colpi mancanti (nessuna
delle quattro copie arrivata) · `ordine` colpi arrivati fuori ordine · `vie` [prima copia dalla strada veloce,
dall'affidabile]. Campo `pause` (elenco): `{ motivo: [volte, secondi] }` delle pause della partita per il telefono
(«segnale debole», «pagina nascosta», «scollegato»…; con « (2)» il Player 2 dello stesso schermo). I fotogrammi al secondo
c'erano già (`fps`).

### Rete e stato del telefono dall'app (riga `partita.fine`, campo `wifi`, per telefono)

`rssi` segnale Wi-Fi [mediana, minimo] dBm · `bd` banda (2,4 · 5 · 6 GHz) · `mbps` velocità del collegamento [mediana,
minima] · `bt` batteria [inizio, fine] % · `ch` in carica a fine partita · `tc` temperatura della batteria (la più alta, °C)
· `fx` quota della partita con «Fissa app» attiva. Senza l'app c'è solo la batteria quando il browser la dà.
**Mai** nome della rete (SSID), BSSID, indirizzi IP o MAC, identificativi del telefono: l'app non li legge
(`PhoneStatus.java` riceve solo numeri) e la pagina tiene solo numeri (`phone-stats.appStatus`).

### Telefono bloccato (B51; riga `partita.fine`, campo `blocco`, per telefono)

`durS` secondi bloccato · `tb` tocchi fermati dal blocco · `ss` sblocchi dello staff sul telefono (due dita 3 s) · `sp`
sblocchi dal PC (pannello dello stand, foglio della fiera) · `sd` blocchi finiti da soli (fine del gioco, avviso o velo da
toccare) · `us` pagina nascosta durante il blocco (schermo spento o altra app) · `sc` schermi spenti (dall'app).

Non si registrano (decisione dell'utente): percorso del visitatore, salute del PC.

## 2. Dove sta il codice

- Telefono: `site/js/tennis/phone-stats.js` (misure), `racchetta.js` (stato `st` con `sq`, `lc`, `ap`; `dev` con `av`;
  colpo con `gw`), `swing-message.js` (`mg`, `gw`), `swing-detect.js` (`margin`, solo un campo in più), `link.js` (`app`).
- App: `natpf-android/.../PhoneStatus.java` (testo per la pagina, test JUnit), `MainActivity.java` (`Bridge.stato()`,
  conto degli schermi spenti); versione **1.0.4** (versionCode 5).
- PC: `natpf_phone_racket.onState`, `registro/registro_misure.js` (`MisureTelefono`, `Pause`), `registro_registratore.js`
  (agganci, `_misFine`, `_misColpo`), `registro_formato.js` (`CAMPI_B66`, formato 3, `pause` fra le MAPPE),
  `cloudflare/registro-worker.js` (stessa lista, formato 3).
- Riassunto: `natpf-tennis/scripts/registro/riassunto.mjs` (`sezioniB66`), registri finti `finto.mjs` (misure del B66 da
  un generatore a parte: le righe di prima restano le stesse).

## 3. Come si legge nel riassunto

`node natpf-tennis/scripts/registro/riassunto.mjs <registri scaricati>` → sei sezioni nuove, dopo «Collegamento del
telefono»:

1. **Sensori del telefono** — frequenza vera (mediana e la più bassa di ogni partita, partite sotto 50 Hz), buchi, colpi
   con un buco durante il gesto, saturazione; tabelle per telefono e browser, intervallo dichiarato, versione della pagina
   rispetto al PC, app.
2. **Calibrazione: stabilità** — colpi prima del colpo tipico proprio e del centro della mira, quanto cambia il colpo
   tipico e lo scarto della cima, cambi di segno / mano / calibrazioni in partita; profili, soglie; **errore di tempo per
   numero di colpo nella partita** (1–5, 6–10, 11–20, dal 21°: vale anche per i registri di prima).
3. **Precisione dei gesti** — per tipo di colpo: confidenza, confidenza sotto 0,5, margine, colpi al limite (margine sotto
   1,2), colpi dalla parte opposta alla palla; colpi al limite contro colpi pieni (errore di tempo, deboli, rete o fuori).
4. **Collegamento: distribuzione** — arrivo e risposta (metà · 9 su 10 · 99 su 100), sbalzi, persi, fuori ordine, strada
   veloce; per strada (LAN, relay, internet); ritardo contro errore di tempo; pause per il telefono.
5. **Rete del telefono (app)** — segnale, banda, velocità, batteria e consumo, temperatura, «Fissa app»; segnale contro
   ritardo, colpi persi e pause.
6. **Telefono bloccato** — tempo, tocchi fermati, sblocchi per tipo, pagina nascosta, schermi spenti.

Esempio (registri finti, 200 partite: numeri inventati, servono solo a vedere la forma):

> Dal picco del gesto all'arrivo sul PC (orologi allineati; comprende il riconoscimento sul telefono), metà · 9 su 10 ·
> 99 su 100: 56 · 111 · 139 ms. Dal picco alla risposta del gioco (…): 67 · 122 · 150 ms.
>
> Colpi con un buco nei campioni durante il gesto: 89 su 3713 colpi arrivati (2,4%).

## 4. Peso

Registri finti (3 giorni × 300 partite): **7,37 → 8,53 kB in chiaro a partita** (+1,16 kB, +16 %), **1,23 → 1,52 kB
compressi** (come li salva il Worker). Partita vera nel browser (telefono simulato): vedi §6.

## 5. Ricaricare il Worker (per te, con il mouse)

Stessi passi del B36.0 (`docs/b36/misure-b36-0.md` §3), con il file nuovo:

1. Prendi il file **`natpf-registro-worker.js`** della versione 2026-11-18.1 (è `natpf-tennis/cloudflare/registro-worker.js`
   del repository). Clic destro → **Apri con** → **Blocco note**; **Modifica** → **Seleziona tutto**, **Modifica** → **Copia**.
2. https://dash.cloudflare.com → **Workers & Pages** → **natpf-registro** → **Edit code** *(nome non confermato)*.
3. Nell'editor seleziona tutto il codice di oggi (Ctrl+A, o trascinando con il mouse dall'ultima riga alla prima), clic
   destro → **Paste** (o Ctrl+V). Il codice comincia con «// Registro dello stand di NATPF Simulator».
4. **Deploy** in alto a destra, e conferma.
5. Prova: apri l'indirizzo del Worker (`https://natpf-registro.<tuo-sottodominio>.workers.dev`): deve dire
   **«Formato delle righe: 3 (con la direzione dei colpi e le misure dei sensori del B66)»**. Se dice ancora 2, il Deploy
   non è andato: ripeti dal punto 2.
6. Se qualcosa va storto: **Deployments** → sulla versione di prima **Rollback** *(nome non confermato)*. Il registro non
   si ferma: le righe restano in coda sul PC finché il Worker risponde.

Variabili, chiave di lettura e collegamento al bucket **restano**: non vanno toccati. La chiave non serve per questi passi:
non scriverla in chat né in un file.

## 6. Prove

- Test di unità: `natpf-tennis/test/natpf-registro.test.mjs` (misure di un telefono, partita con il telefono finto, partita
  senza telefono), `registro-worker.test.mjs` (Worker del 17/11: accetta le righe nuove senza le misure; Worker nuovo:
  intere), `registro-riassunto.test.mjs` (sei sezioni dai registri finti, numeri esatti, avviso del Worker non ricaricato),
  `tools/test/phone-stats.test.mjs` (misure del telefono, app solo numeri, gesti del 28/10 identici).
- App: build locale con l'SDK 34 (`gradle testReleaseUnitTest lintRelease assembleRelease`): test 9/9, lint con gli
  stessi avvisi di prima, `controlla-classi.mjs` verde.
- Nel browser: `tools/e2e/natpf-registro-sensori.mjs` (gioco vero, pagina vera del telefono con eventi sintetici e ponte
  dell'app finto, Worker vero con R2 finto): esiti nella traccia del 18/11 e in `docs/WORK_PROGRESS.md`.

## 7. Cosa non è provato

- Telefoni veri, l'app 1.0.4 su un telefono vero (segnale, banda, batteria, temperatura e «Fissa app» letti da Android
  veri), una Wi-Fi vera, il Worker vero su Cloudflare: niente di questo si può provare qui.
- La saturazione è riconosciuta da un valore grande ripetuto: su un telefono vero un sensore saturo potrebbe dare valori
  appena diversi; i numeri allo stand diranno se la regola va cambiata.
- La «risposta del gioco» comprende l'attesa della palla quando il gesto arriva in anticipo: per il ritardo puro vale
  l'arrivo (`arr`).
- `getConnectionInfo()` di Android è deprecato dalla 12 ma funziona; segnale, banda e velocità non chiedono il permesso
  della posizione (il nome della rete sì, e non si legge).

## 8. B71 (19/11/2026): sensori dell'app, fondo scala, tocchi prima dei buchi

Dai registri del 18 e 19/11 (`docs/b71/sensori.md`). Cinque campi nuovi in `tq` (riga `partita.fine`, per telefono),
`CAMPI_B71S` in `registro_formato.js` (stessa riga nel Worker, tra quelli del B66 e quelli del B36.0). Solo numeri e codici
di una lettera; una pagina di prima non li manda e la riga resta identica.

| Campo | Cosa | Da dove |
| --- | --- | --- |
| `sr` | sorgente dei sensori nella partita: `n` app NATPF Racchetta 1.0.5, `b` browser (devicemotion), `nb` tutte e due | telefono (`sensori-nativi.js`, campo `sr` dello stato) |
| `fs` | fondo scala dichiarato dall'app [accelerazione m/s², rotazione °/s] (`Sensor.getMaximumRange`), solo con l'app 1.0.5 | app → telefono (`infoSensori`, campo `fs`) |
| `vs` | valori più grandi visti su un asse [accelerazione con la gravità m/s², rotazione °/s]: con `fs` dice se la saturazione è il fondo scala | telefono (`sq[7]`, `sq[8]`) |
| `tk` | tocchi prima dei buchi: [mediana dei ms dall'ultimo tocco all'inizio del buco, buchi con un tocco nell'ultimo secondo (o durante il buco)] | telefono (campo `tk` dello stato: un valore per buco) |
| `rp` | motivo del ritorno al browser: `g` gravità diversa nella prova, `r` rotazione diversa, `f` sensori dell'app fermi a pagina visibile, `p` ponte che non risponde | telefono |

Il Worker va ricaricato (§5, file della versione con il B71) perché i cinque campi arrivino: un Worker non ricaricato li
toglie in silenzio e accetta le righe con tutto il resto (formato delle righe ancora **3**, prova in
`natpf-tennis/test/natpf-b71-sensori-registro.test.mjs`). Il riassunto (`riassunto.mjs`) non li mostra ancora.
