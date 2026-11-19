# B71 · Sensori del telefono più affidabili e app NATPF Racchetta 1.0.5 (19/11/2026)

Richiesta dell'utente del 19/11: «fixiamo subito i punti più importanti: … sensori». Prodotto **FIERA**. Ramo locale
`b71-sensori` (agente B71-sensori), da unire in `b71-int`. Analisi di partenza: rapporto `analisi-sensori.md` della
sessione (registri veri del 18 e 19/11: 325 partite, 437 partite-telefono, tutti Android 17 + Chrome 157 nell'app 1.0.4,
LAN).

## 1. Cosa dicevano i registri

| Problema | Numeri (18–19/11) | Causa |
| --- | --- | --- |
| Buchi nei campioni da ~200 ms | buco più lungo 100–300 ms in **137** partite-telefono su 437 (moda 200–220 ms); 85 partite sotto 50 Hz per un buco così | vanno con i **tocchi sul blocco B51** (correlazione **0,87**; 0,14 buchi/min senza tocchi, 15,9/min con più di 50 tocchi). Nella pagina il tocco fa pochissimo: il blocco è nel thread della pagina di Chromium (ipotesi: il timer di devicemotion salta dei giri mentre la pagina dà la precedenza all'input) |
| Buchi ≥ 1 s | **36** su 36 con lo schermo spento | tasto di accensione premuto impugnando (P1 23 e P2 30 schermi spenti, pause di 5–8 s) |
| Accelerazione satura | nel **97%** delle partite, ~2,3 campioni per colpo | fondo scala del sensore (di solito ±8 g = 78,5 m/s²); la pagina non lo sa |
| Wi-Fi «—» | segnale, banda e velocità **mai** registrati | `MainActivity.java`: `getNetworkId() != -1`, che da Android 10 senza il permesso della posizione è sempre −1 |

## 2. Cosa è cambiato

### App NATPF Racchetta 1.0.5 (`natpf-android/`, codice 6)

- **Wi-Fi** (`PhoneStatus.wifiCollegata`): collegata se frequenza > 0 e segnale > −127 dBm; niente più `networkId`.
- **Sensori dall'app, fase A** (`SensoriNativi.java`, `CampioniNativi.java`): accelerometro, accelerazione lineare e
  giroscopio con `SensorManager` a 16 667 µs (il ritmo di Chrome), in un thread a parte. Ogni evento del giroscopio
  diventa un campione con l'ultima accelerazione, **con l'istante vero** (`SensorEvent.timestamp`, orologio
  `elapsedRealtime`; se la base dei tempi è strana, l'ora d'arrivo). Al più un campione ogni 16,7 ms (griglia con
  tolleranza di 4 ms, come il timer di Chrome): un sensore a 104 o 200 Hz dà comunque ~60 campioni al secondo, quindi
  soglie, filtri e profili dei gesti restano validi. Buffer di 600 campioni (10 s): la pagina li prende a lotti
  (`Bridge.campioni`, testo di interi); se la pagina si ferma li riceve dopo, **tutti**; oltre i 600 si buttano i più
  vecchi e si contano.
- **Unità e assi identici a devicemotion di Chrome su Android**, controllati sul codice di Chromium (19/11):
  `accelerationIncludingGravity` = `TYPE_ACCELEROMETER`, `acceleration` = `TYPE_LINEAR_ACCELERATION` (m/s², segno grezzo
  di Android), `rotationRate` = `TYPE_GYROSCOPE` in °/s con **alpha = x, beta = y, gamma = z**
  (`third_party/blink/renderer/modules/device_orientation/device_motion_event_pump.cc`:
  `Create(RadToDeg(gyro.x), RadToDeg(gyro.y), RadToDeg(gyro.z))`), tutti arrotondati a multipli di 0,1 come Chromium
  (`services/device/generic_sensor/platform_sensor_util.h`; anche i campioni veri del 28/10 sono tutti multipli di 0,1).
  **Attenzione**: la consegna e il rapporto di analisi dicevano alpha/beta/gamma = z/x/y (la specifica W3C); Chrome su
  Android fa x/y/z, e qui si segue Chrome, perché tutto il riconoscimento è tarato su quei numeri.
- **Ponte** (`MainActivity.Bridge`): `sensoriVersione()` (protocollo 1, 0 se manca un sensore), `sensoriAvvia()`,
  `sensoriFerma()`, `campioni()`, `orologio()`, `infoSensori()` (fondo scala, risoluzione, periodo minimo, FIFO dei tre
  sensori: solo numeri), `inUso(boolean)`. Sensori accesi solo se la pagina li chiede e solo in primo piano.
- **Schermo spento giocando** (`RisveglioSchermo.java`): attività sopra il blocco (`setShowWhenLocked`,
  `setTurnScreenOn`); allo `SCREEN_OFF`, se la pagina ha detto `inUso(true)` (o, con una pagina di prima, se l'app è fissata
  con la pagina aperta), dopo 0,3 s un wake lock `SCREEN_BRIGHT_WAKE_LOCK | ACQUIRE_CAUSES_WAKEUP` per 3 s riaccende lo
  schermo. Tre spegnimenti in 20 s: resta spento (staff). Nessun permesso nuovo (`WAKE_LOCK` c'era già; con `targetSdk`
  34 non serve `TURN_SCREEN_ON`, che Android chiede solo dalle app per Android 15: compat change
  `REQUIRE_TURN_SCREEN_ON_PERMISSION`, letto nel framework di Android 14). Pausa attesa: ~1 s invece di 5–8 s.

### Pagina del telefono (`site/js/tennis/sensori-nativi.js`, `racchetta.js`)

- `nativeBridge(window)`: il ponte vale **solo** se ha i metodi nuovi e `sensoriVersione() === 1`. Senza (Chrome, app
  1.0.4) `native.state` resta `'off'` e il percorso dei sensori è **quello di sempre**: `onMotion` chiama `feedSample` con
  gli stessi passi di prima (la sola differenza è la funzione in due pezzi).
- **Prova all'avvio**: a «Attiva i sensori» partono devicemotion e i sensori dell'app insieme; **i colpi li guida ancora il
  browser**. Blocchi di 1 s: gravità media uguale entro 0,5 m/s² per asse a telefono quasi fermo (segno e unità
  dell'accelerazione), e sugli assi che ruotano almeno 15 °/s tratti da 50 ms con correlazione (con il segno) ≥ 0,8 e
  misura app/browser tra 0,8 e 1,25 (segno, assi e unità della rotazione; un ritardo di 10–20 ms tra i due flussi non
  conta). Si passa ai sensori dell'app solo con un blocco di gravità e uno di rotazione giusti; gravità sbagliata o due
  blocchi di rotazione sbagliati → resta il browser. Telefono fermo: la prova aspetta (niente cambia per chi gioca).
  Il segno salvato del telefono dello stand (`motion-sign.js`) non si ribalta: l'app ha lo stesso segno del browser,
  altrimenti la prova la scarta.
- **Con l'app**: un poll ogni 16 ms prende il lotto; l'orologio dell'app è allineato a `performance.now()` (lettura con
  l'andata e ritorno più breve, rifatta ogni 5 s e al ritorno in primo piano: nel sonno profondo i due orologi si staccano);
  al rilevatore sempre in avanti. devicemotion si toglie. Nessun campione dell'app per 0,5 s a pagina visibile (dopo
  1,5 s di tolleranza all'avvio o al ritorno) → di nuovo devicemotion (motivo `f`); ponte che dà errore → `p`. A pagina
  nascosta (schermo spento) niente ritorno al browser: l'app ha spento i sensori, non è un guasto.
- **Buchi da tocco nella pagina**: cercata la causa, non trovata nella pagina. Gli ascoltatori del blocco B51 sono di
  `pointer*` (non bloccano lo scorrimento come quelli di `touch*`, che non ci sono), fanno solo un conto e
  `preventDefault`; il velo ha già `touch-action: none`. Non li ho toccati. Per verificarlo c'è la misura nuova `tk` (§3);
  la correzione vera è il percorso dell'app (campioni a lotti: un thread fermo non li perde).
- All'app la pagina dice se il telefono è in uso (`tellAppInUse`, ogni 0,5 s solo se cambia): tocchi bloccati,
  calibrazione, oppure sensori pronti e fase `serve`/`toss`/`play`/`pause`.

### Misure (telefono e registro dello stand)

- `phone-stats.js`: `touch(t)` (istante dell'ultimo tocco, da un ascoltatore `pointerdown` passivo in cattura su
  `window`), per ogni buco i ms dall'ultimo tocco (`gapTouches`), e in `sq` due numeri in più: accelerazione e rotazione
  più grandi viste su un asse.
- Stato `st` del telefono: `sr` (`n`/`b`), `fs` (fondo scala dell'app), `rp` (motivo del ritorno al browser), `tk`.
- Registro (`registro_misure.js`, `registro_formato.js` `CAMPI_B71S`, Worker): in `tq` della riga `partita.fine` i campi
  `sr`, `fs`, `vs`, `tk`, `rp` (tabella in `docs/b66/registro-sensori.md` §8). **Il Worker va ricaricato** perché arrivino
  (senza, si tolgono in silenzio; formato delle righe ancora 3). Il riassunto non li mostra ancora.

## 3. Prove (19/11, in questo contenitore)

| Prova | Esito |
| --- | --- |
| App: `javac` di tutti i sorgenti contro `android-all` 14 (API 34) + zxing + androidx.core | nessun errore (un avviso di deprecazione, quello di prima) |
| App: JUnit delle classi pure (`PhoneStatusTest`, `RacketLinkTest`, `CampioniNativiTest`, `RisveglioSchermoTest`) | **21/21** |
| App: `gradle testReleaseUnitTest lintRelease assembleRelease` + `controlla-classi.mjs` | **non fatto: manca l'Android SDK** (lo fa la CI `natpf-android.yml` al push) |
| `tools/test/sensori-nativi.test.mjs` (lotti, ponte, orologio, prova all'avvio con gravità/assi/unità/segni sbagliati, lotti in ritardo, ritorno al browser, gesti veri del 28/10 dal percorso dell'app con **la stessa impronta `933e330650269e1e`**) | **9/9** |
| `tools/test/phone-stats.test.mjs` (impronta del browser invariata, tocchi prima dei buchi, valori più grandi) | **8/8** |
| Sito completo `node --test tools/test/*.test.mjs` | **299/299** |
| `natpf-tennis/test/natpf-b71-sensori-registro.test.mjs` (campi nuovi, Worker copia esatta, Worker di prima) | **2/2** |
| Gioco completo `npm test` (con i 2 test nuovi del registro) | **1845/1846**, 0 rossi, 1 saltato (come prima) |
| `npm run build` | ok |
| Browser `tools/e2e/natpf-sensori-nativi.mjs` (pagina vera, ponte finto 1.0.5; aggiunto alla CI «phone and timing») | **15/15** |
| Browser `natpf-app-android.mjs` 5/5, `natpf-telefono-bloccato.mjs` 12/12 | invariati |
| Browser `natpf-registro-sensori.mjs` (gioco vero, ponte finto 1.0.4, Worker vero con R2 finto, peso della partita) | **23/23** |

## 4. Cosa NON è verificato

- **Niente su un telefono vero**: frequenza vera dei sensori dell'app, assi e segni rispetto a Chrome 157 (la prova
  all'avvio li controlla e, se non tornano, resta il browser: va visto quante volte succede), costo del ponte (~60
  chiamate al secondo) e della batteria su Android 17, il wake lock che riaccende lo schermo (dipende dal produttore),
  `setShowWhenLocked` con il blocco dello schermo, la Wi-Fi letta davvero senza la posizione su Android 17.
- **APK non costruito qui** (niente Android SDK): lint e `controlla-classi.mjs` solo nella CI. Windows e ledwall: non
  toccati da questo blocco.
- **Istante dei colpi**: con l'app il picco ha l'istante vero del sensore, che con Chrome era l'istante dell'evento (in
  media ~8–15 ms dopo, stima non misurata). Il PC vedrà i colpi qualche ms prima (più «anticipo»): da guardare nel
  registro confrontando il campo `ms` dei colpi delle partite con `sr` `n` e `b` (le finestre del tempo non le ho toccate).
- Saturazione: il valore saturo ora si vede (`vs`) con il fondo scala (`fs`); usarlo nel riconoscimento (asse tagliato
  pesato a zero in `lift` e nella forma del colpo) tocca i gesti e non è in questo blocco.
- Fase B (200 Hz): non fatta (gesti da ritarare, decisione dell'utente).

## 5. Rischi e ripieghi

- La pagina usa i sensori dell'app solo dopo la prova; qualunque dubbio → browser, cioè il comportamento della 18.3.
- Un'app 1.0.5 con una pagina di prima: nessun sensore dall'app (la pagina non li chiede), Wi-Fi giusta, schermo che si
  riaccende con l'app fissata.
- Una pagina nuova con l'app 1.0.4 o in Chrome: tutto come oggi.

## 6. Come si verifica sul telefono vero (per lo staff, passo passo)

1. **Installare la 1.0.5** sopra la 1.0.4 (stessa chiave dello stand: la costruisce e la pubblica il workflow
   «NATPF app Android» al push; link fisso `android/NATPF-Racchetta.apk`). Tre volte «volume giù» → la schermata dello
   staff deve dire **«App 1.0.5»**. Poi «Riapri l'ultimo collegamento».
2. **Partita di prova** con il telefono: «Attiva i sensori», tutorial e calibrazione come sempre, poi qualche scambio. Il
   telefono deve comportarsi come prima (dritto, rovescio, servizio).
3. **Tocchi sul blocco**: durante uno scambio toccare più volte lo schermo bloccato (anche con il palmo) e continuare a
   colpire: i colpi devono arrivare come senza tocchi.
4. **Tasto di accensione**: durante uno scambio premere **una volta** il tasto di accensione. Lo schermo deve
   **riaccendersi da solo entro ~1 s**, la partita va in pausa e riparte. Poi premerlo **tre volte di fila**: deve restare
   spento (è il modo per spegnerlo apposta). Se il telefono ha il blocco con PIN o segno, l'app deve comparire sopra il
   blocco senza chiederlo.
5. **Registro della partita** (lo scarica l'utente dal Worker, mai la chiave in chat), riga `partita.fine`, telefono `g`:
   - `tq.sr` = **`n`** (o `nb`: prova all'inizio con il browser, poi l'app). Se è `b` con `tq.rp` = `g` o `r`, la prova ha
     visto sensori diversi da Chrome: annotare modello del telefono e versione di Android;
   - `tq.fs` ≈ `[78.5, 2000]` (o il fondo scala di quel telefono) e `tq.vs`: se `vs[0]` = `fs[0]`, la saturazione è il
     fondo scala del sensore;
   - `tq.b` e `tq.bm`: buchi e buco più lungo, attesi quasi zero con `sr` = `n` (prima 100–300 ms in un terzo delle partite);
     `tq.tk` dice quanti buchi erano vicini a un tocco;
   - `wifi.rssi`, `wifi.bd`, `wifi.mbps` **presenti** (prima mai);
   - pause: «pagina nascosta» di ~1 s invece di 5–8 s dopo il tasto di accensione.
   Per i campi `sr`, `fs`, `vs`, `tk`, `rp` il Worker deve essere stato ricaricato (`docs/b66/registro-sensori.md` §5).
6. Se qualcosa non va: modello del telefono, versione di Android, cosa è successo e a che ora (per trovare la partita nel
   registro). Il ripiego è immediato e non chiede niente: la pagina torna da sola ai sensori del browser; in ultima
   istanza si reinstalla la 1.0.4.
