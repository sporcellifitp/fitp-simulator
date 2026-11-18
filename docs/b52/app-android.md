# B52 · App Android dello stand «NATPF Racchetta»

Richiesta dell'utente del 15/11/2026 (sera), dopo il B51: «sì all'app Android: la gente esce da Chrome cambiando
schermata». Decisione (domanda a scelta): **«Fissa app» automatico** (consigliato), non il chiosco completo con il
telefono riportato alle impostazioni di fabbrica. iPhone: non si fa (decisione del passaggio §4.7).

## 1. Cosa fa

Un'app sottile (`natpf-android/`, Java, 681 KB dalla 1.0.2, Android 8 o più nuovo) che apre **la stessa pagina** del
telefono-racchetta che oggi si apre in Chrome (`site/tennis/racchetta.html`, dal PC dello stand o da Cloudflare) dentro
una WebView, e in più:

- **si fissa da sola** appena la pagina è aperta (`startLockTask()` senza essere amministratore del telefono: è il «Fissa
  app» di Android). Home e app recenti non portano fuori; per uscire serve il gesto di sistema (di solito Indietro e
  Panoramica tenuti insieme) e, se è attivo, il PIN. Android può chiedere una conferma la prima volta;
- **schermo sempre acceso** e **Wi-Fi sveglia a bassa latenza** mentre l'app è in primo piano;
- **riapre da sola l'ultimo collegamento** all'avvio (i telefoni dello stand si abbinano una volta, B41); se la pagina
  non arriva (PC spento, rete) lo dice in alto e riprova ogni 5 secondi; se la pagina si chiude (memoria) rifà la WebView;
- **legge il QR del PC** con la fotocamera (da Android 12 i link aperti dalla fotocamera vanno sempre al browser, quindi
  serve il lettore nell'app); accetta anche il link condiviso da Chrome («Condividi» → «NATPF Racchetta») e, fino ad
  Android 11, il link aperto dalla fotocamera;
- **Indietro** va alla pagina (che durante il gioco lo intrappola, B51): l'app non si chiude mai con Indietro;
- **schermata dello staff**: tre pressioni di fila di «volume giù» → schermata d'avvio (QR nuovo o riapri l'ultimo);
- il **blocco dell'orientamento** della pagina passa all'app (ponte `NATPFApp.lock`), perché la WebView non lo sa fare
  da sola; lo schermo intero, che l'app ha già, risponde subito di sì alla pagina.

La pagina non cambia: il B51 (tocchi bloccati in partita) resta e lavora insieme all'app. Il PC riconosce l'app dalla
scritta `NATPFApp/<versione>` alla fine dello user agent (riga `dev` della diagnostica).

**Sicurezza.** Dentro l'app si naviga solo sulla pagina del PC che l'ha aperta (stessa origine); i link della pagina
verso altri siti non si aprono. Ci si fida dei certificati installati dall'utente (il certificato NATPF del PC dello
stand, `tools/lan/certificato.mjs`) e http resta permesso in rete locale: scelte volute per un'app che parla solo con il
PC dello stand (gli avvisi del lint di Android lo dicono e sono accettati). La pagina non può chiedere fotocamera o
microfono (sempre rifiutati); il lettore di QR usa la fotocamera solo nella sua schermata.

## 2. Firma e aggiornamenti

La chiave dello stand **non sta nel repository** (è pubblico). L'APK 1.0.0 consegnato all'utente il 15/11 è firmato con
la chiave dello stand (certificato «CN=NATPF Racchetta, O=NATPF stand», SHA-256 del certificato
`a1c16e0b01a1e625f7669ad8cf4dc0cfb49ab9501286b80e03ec713f4c422e1d`). L'utente ha ricevuto la chiave in un file a parte
da tenere privato. Gli aggiornamenti si installano sopra solo se firmati con la stessa chiave. La 1.0.1 (16/11, §5) è
firmata con la stessa chiave (certificato verificato con `apksigner`) e si installa sopra la 1.0.0.

Per far costruire e pubblicare gli aggiornamenti a GitHub (`.github/workflows/natpf-android.yml`), una volta: GitHub →
repository → Settings → Secrets and variables → Actions → New repository secret:
- `NATPF_ANDROID_KEYSTORE_B64`: il contenuto del file `natpf-stand.jks.base64.txt`;
- `NATPF_ANDROID_KEYSTORE_PASSWORD`: il contenuto del file `password.txt`.

Da quel momento ogni modifica a `natpf-android/` costruisce l'APK firmato e, con i segreti R2 già usati per l'installer
Windows, lo pubblica su R2: `android/NATPF-Racchetta-<versione>.apk` e il nome fisso `android/NATPF-Racchetta.apk`
(per una versione nuova si alza `appVersion` e `appCode` in `natpf-android/app/build.gradle`). Senza i segreti il
workflow costruisce e prova lo stesso e lascia un APK di prova negli Artifacts (firmato con una chiave di prova: non si
installa sopra quello vero).

Costruire a mano (Android SDK con la piattaforma 34, Gradle 8.9 o più nuovo, Java 17 o più nuovo):

```sh
cd natpf-android
echo "sdk.dir=<cartella dell'Android SDK>" > local.properties
gradle testReleaseUnitTest lintRelease assembleRelease          # APK di prova
NATPF_KEYSTORE=<file .jks> NATPF_KEYSTORE_PASSWORD=<password> gradle assembleRelease   # APK firmato
node controlla-classi.mjs                                       # classi mancanti nell'APK: deve dire VERDE
```

## 3. Prove (15/11/2026)

- Test di unità `RacketLinkTest` (4): riconoscimento del link della racchetta in rete locale e su Cloudflare, rifiuto di
  altri link e schemi (`javascript:`, `file:`, `intent:`, percorsi simili), link dentro un testo condiviso con la chiave
  intera, stessa origine con le porte di base.
- Lint di Android: 0 errori, 10 avvisi tutti voluti (verticale fisso, niente finestre multiple, JavaScript, certificati
  dell'utente, http in rete locale, `allowBackup`, icona senza versione monocromatica).
- Firma verificata con `apksigner`.
- Nel browser `tools/e2e/natpf-app-android.mjs` (pagina vera del telefono, Chromium con lo schermo intero e il blocco
  dell'orientamento rifiutati come nella WebView, lo script dell'app letto da `MainActivity.java`): **5/5**. Senza lo
  script le richieste d'orientamento vanno alla WebView e l'app non ne sa niente; con lo script al tocco su «Attiva i
  sensori» la pagina chiede «portrait» all'app; la pagina va avanti (calibrazione), nessun errore.

```sh
mkdir -p /tmp/radice && ln -sfn "$PWD/site" /tmp/radice/natpf
CHROMIUM_PATH=/opt/pw-browsers/chromium NATPF_SITE_ROOT=/tmp/radice node tools/e2e/run-local.mjs natpf-app-android.mjs
```

## 4. Cosa non è provato

**Niente su un telefono vero** (nel contenitore non c'è un emulatore Android: manca la virtualizzazione). Da provare sul
primo telefono dello stand, nell'ordine:

1. installazione dell'APK (Android chiede di permettere le app da «origini sconosciute» al programma che lo apre);
2. lettore del QR del PC e apertura della pagina; il certificato NATPF installato sul telefono deve bastare anche
   all'app (se la pagina non si apre in rete locale, è la prima cosa da guardare);
3. sensori del telefono nella WebView (la calibrazione e il colpo), collegamento al PC, vibrazione;
4. «Fissa app»: la conferma di Android, Home e app recenti che non escono, il gesto per uscire; su alcuni telefoni
   bisogna prima attivare «Fissa app» nelle impostazioni (guida dello stand §8.6);
5. schermo acceso e Wi-Fi per una partita intera; riapertura dopo un riavvio del telefono;
6. tre volte «volume giù» per la schermata dello staff.

Se uno di questi punti non va, le strade sono: il chiosco completo (Device Owner: telefono riportato alle impostazioni
di fabbrica e preparato una volta dal PC con il cavo), oppure tornare a Chrome con «Fissa app» a mano (§8.6).

## 5. Versione 1.0.1 (16/11/2026): l'app si chiudeva su «Inquadra il QR del PC»

**Segnalato dall'utente il 16/11**, provando l'app su un telefono: toccando «Inquadra il QR del PC» l'app si chiudeva da sola.

- **Causa** (trovata nell'APK, non sul telefono): il lettore di QR della libreria (`CaptureManager` di
  `zxing-android-embedded` 4.3.0) chiede il permesso della fotocamera con `ContextCompat` e `ActivityCompat` di AndroidX,
  ma la libreria **non dichiara** quella dipendenza (il suo POM porta solo `zxing:core`) e l'app, che non usa AndroidX, non
  l'aveva. Nel `classes.dex` della 1.0.0 le classi `androidx` erano zero: all'apertura della schermata della fotocamera
  Android non trovava la classe (`NoClassDefFoundError`) e chiudeva l'app. Build, test di unità e lint erano verdi: nessuno
  dei tre guarda le classi che mancano dentro le librerie.
- **Correzione**: dipendenza `androidx.core:core:1.6.0` (versione leggera, senza Kotlin: l'APK passa da 294 KB a 680 KB);
  il lettore si apre con `ScanOptions` e `startActivityForResult` invece di `IntentIntegrator` (che rimanda anche ai
  Fragment di AndroidX, non presenti); se la schermata della fotocamera non si apre l'app lo dice invece di fermarsi.
  Versione dell'app 1.0.1 (`appCode` 2).
- **Controllo nuovo** `natpf-android/controlla-classi.mjs` (anche nel workflow, dopo la build): legge con `dexdump` tutte
  le classi a cui rimanda il codice dell'APK e controlla che ognuna sia nell'APK o in Android 34. Sulla 1.0.0 dà **rosso**
  proprio su `androidx/core/app/ActivityCompat` e `androidx/core/content/ContextCompat` richiamate da `CaptureManager`;
  sulla 1.0.1 **verde** (1128 classi nell'APK, 1659 richiamate). Tollerate e scritte nel file: `IntentIntegrator` e
  `ScanContract`, che l'app non usa.
- Verifiche della 1.0.1: test di unità 4/4, lint 0 errori, firma con la chiave dello stand (stesso certificato
  `a1c16e0b…2e1d`), `versionCode` 2, prova nel browser `natpf-app-android` 5/5. APK 679.677 B, sha256
  `fe332244e4609538fd1083072f69e43ad6f2f9b1f2a308b26ea3aa6c56cc96a7`, consegnato all'utente il 16/11.
- **Non provata su un telefono vero** neanche questa: la causa è certa sull'APK 1.0.0, ma che dopo il lettore si apra la
  fotocamera (permesso chiesto da Android la prima volta, inquadratura, lettura) va visto sul telefono. Se si chiude
  ancora servono il modello del telefono e la versione di Android.

## 6. Versione 1.0.2 (16/11/2026): schermo vuoto senza il certificato NATPF sul telefono

**Segnalato dall'utente il 16/11** con la 1.0.1: QR del PC dello stand (rete locale, `https://192.168…:8443`), sul
telefono solo l'app (niente certificato NATPF, guida 7.4) → l'app mostra «App fissata» e poi resta ferma.

- **Causa**: il PC usa un certificato fatto da sé (`tools/lan/certificato.mjs`, un'autorità per ogni PC). Senza quel
  certificato installato la WebView rifiuta la pagina **in silenzio** (in Chrome c'è «Procedi»); e l'app, che si fissava
  alla fine di ogni caricamento, si fissava anche sulla pagina d'errore vuota. In più l'avviso degli errori di rete
  compariva e spariva subito (la fine del caricamento della pagina d'errore lo nascondeva): c'era già nella 1.0.0.
- **Correzione**: `onReceivedSslError` va avanti (`proceed`) **solo** per l'indirizzo della pagina del QR, se è in https
  su un indirizzo di rete locale scritto in cifre (10.x, 172.16–31.x, 192.168.x, 169.254.x, 127.x) e la richiesta va
  allo stesso indirizzo (`RacketLink.trustStandCertificate`, 1 test nuovo); mai su Cloudflare né su nomi. Non è più
  debole di ciò che l'app già permette in rete locale (http in chiaro). Altrimenti avviso con il motivo. La WebView
  ricorda la scelta per lo stesso indirizzo e certificato (documentazione di `onReceivedSslError`; `clearSslPreferences`),
  quindi passano anche i file della pagina e il collegamento `wss://…/lan-signal` del PC. Dopo un errore della pagina
  principale (rete, HTTP, certificato) l'avviso resta e l'app **non si fissa**. La schermata dello staff mostra le
  versioni di app, Android e WebView e l'ultimo errore (rete, certificato o errore JavaScript della pagina).
- **Prova** `tools/e2e/natpf-app-certificato.mjs` (Chromium, lo stesso motore della WebView, con il server LAN vero e il
  certificato fatto da `certificato.mjs`, **senza** «ignora i certificati»): senza «Procedi» la pagina non si apre
  (`ERR_CERT_AUTHORITY_INVALID`, quello che succedeva nella 1.0.1); con «Procedi» (che come `proceed()` fa ricordare la
  scelta) si apre la pagina vera, il contesto resta sicuro, `wss` e WebRTC si collegano, i sensori sono pronti e un colpo
  arriva al PC: **7/7**. Il «ricordare la scelta» di Chrome e della WebView sono due implementazioni diverse dello stesso
  meccanismo di Chromium: è la cosa da guardare per prima sul telefono se la pagina si apre ma non si collega.
- Verifiche della 1.0.2: test di unità 5/5, lint 0 errori, `controlla-classi.mjs` verde, firma con la chiave dello stand
  (stesso certificato), `versionCode` 3, `natpf-app-android` 5/5. APK 680.905 B, sha256
  `99902fa99644735e91221255138cdb1c65543e0c86e72beedcd936f1c291439f`, consegnato all'utente il 16/11.
- **Non provata su un telefono vero.**

```sh
(cd tools/lan && npm ci) && (cd tools/e2e && npm ci)
CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/natpf-app-certificato.mjs
```

## 7. Versione 1.0.4 (18/11/2026): stato del telefono per il registro dello stand (B66)

- Il ponte della pagina ha un metodo in più, `NATPFApp.stato()`: un JSON piccolo con **solo numeri** (`PhoneStatus.java`):
  segnale Wi-Fi (dBm), banda (2,4 · 5 · 6 GHz), velocità del collegamento (Mbps), batteria (%), in carica, temperatura
  della batteria (decimi di °C), «Fissa app» attiva, schermi spenti dall'avvio dell'app (ricevitore di `ACTION_SCREEN_OFF`,
  nessun permesso nuovo). **Mai** nome della rete (SSID), BSSID, indirizzi o identificativi: l'app non li legge.
- La pagina lo legge al più ogni 5 s e lo manda al PC nello stato `st` (campo `ap`); il registro dello stand lo riassume
  per partita (`docs/b66/registro-sensori.md`). Nel messaggio `dev` la pagina manda anche la versione dell'app (`av`).
- Prove qui (SDK Android 34 installato nel contenitore, Gradle 8.14.3): `testReleaseUnitTest` 9/9 (4 nuovi di
  `PhoneStatusTest`), `lintRelease` con gli stessi avvisi della 1.0.3, `assembleRelease`, `controlla-classi.mjs` verde.
  L'APK firmato con la chiave dello stand lo fa e lo pubblica il workflow «natpf-android» (versione salita: 1.0.4, codice 5).
- **Non provata su un telefono vero**: i valori di Wi-Fi, batteria, temperatura e «Fissa app» vengono da Android vero solo lì.
