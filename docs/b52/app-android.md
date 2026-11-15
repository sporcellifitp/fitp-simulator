# B52 · App Android dello stand «NATPF Racchetta»

Richiesta dell'utente del 15/11/2026 (sera), dopo il B51: «sì all'app Android: la gente esce da Chrome cambiando
schermata». Decisione (domanda a scelta): **«Fissa app» automatico** (consigliato), non il chiosco completo con il
telefono riportato alle impostazioni di fabbrica. iPhone: non si fa (decisione del passaggio §4.7).

## 1. Cosa fa

Un'app sottile (`natpf-android/`, Java, 294 KB, Android 8 o più nuovo) che apre **la stessa pagina** del
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
da tenere privato. Gli aggiornamenti si installano sopra solo se firmati con la stessa chiave.

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
