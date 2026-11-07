# natpf-desktop · NATPF Simulator per Windows (un solo installer, aggiornamenti dal gioco)

Guscio Electron del gioco (richiesta del 04/11/2026). Il gioco è lo stesso della versione browser
(`natpf-tennis/dist`); il processo principale avvia nello stesso processo il server LAN dello zip di Codex
(`tools/lan/certificato.mjs`, `natpf-tennis/lan/server.mjs`: certificati in `%LOCALAPPDATA%\NATPF`, HTTPS 8443,
pagina del certificato 8081) e apre `https://localhost:8443/?lan=1` a schermo intero sul monitor scelto.

Dal 07/11/2026 (richiesta dell'utente: «La versione LAN mi pare la stessa della versione windows. Sviluppa solo quella
windows se è la stessa. La versione windows (installer) deve essere un unico installer che poi deve potersi aggiornare
direttamente dal gioco») c'è **un solo eseguibile**, `NATPF-Simulator-Setup-<versione>.exe`: installa la prima volta e
aggiorna sopra; il portatile e lo zip LAN non si consegnano più (il server LAN resta, dentro il programma).

Collaudo su Windows (punti per l'utente): `docs/COLLAUDO_WINDOWS.md`. Decisioni: `docs/DESKTOP_WINDOWS.md` §13–§15.
Bucket degli aggiornamenti (Cloudflare R2), passi per l'utente: `docs/GUIDA_AGGIORNAMENTI_R2.md`.

## File

| File | Cosa |
|---|---|
| `src/main.mjs` | processo principale: server, certificato, finestra, monitor, menu, scorciatoie, firewall, schermo acceso |
| `src/desktop-core.mjs` | funzioni pure (monitor, finestra, scorciatoie, fiducia nel certificato, firewall, impostazioni, versione) |
| `src/aggiornamenti.mjs` | aggiornamenti dal gioco: manifesto, versioni, download con ripresa, dimensione e sha256, stato (senza Electron) |
| `src/preload.cjs` | ponte con la pagina del gioco: `window.natpfDesktop` (schermo intero, `updates`) |
| `aggiornamenti.json` | indirizzo pubblico del bucket R2 degli aggiornamenti (`base`; vuoto = aggiornamenti spenti) |
| `test/desktop-core.test.mjs` | prove con `node --test` (senza Electron), anche del preload e degli script NSIS |
| `test/aggiornamenti.test.mjs` | prove dell'aggiornatore con un server HTTP locale, del manifesto e del workflow |
| `scripts/prepara.mjs` | crea `app/`: gioco già costruito, pagine del telefono, server LAN, `main.mjs`, `preload.cjs`, `aggiornamenti.json` |
| `scripts/prova-linux.mjs` | prova di `app/` con Electron per Linux in Xvfb (Playwright): schermo intero, tasti, ponte, aggiornamenti |
| `scripts/costruisci.mjs` | electron-builder → `dist/win-unpacked`, poi makensis → l'installer |
| `scripts/manifesto.mjs` | `latest.json` per il bucket (usato dal workflow) e controllo «mai tornare indietro» |
| `scripts/dividi.mjs` | consegna a pezzi da 45 MB (se l'installer non si scarica da un messaggio) |
| `build/installatore.nsi` | installazione e aggiornamento (Programmi, collegamenti, regola del firewall, disinstallazione, `/S /AGGIORNA`) |
| `build/icon.ico`, `build/*.bmp` | icona e grafica dell'installazione |

## Schermo intero senza cornici (blocco B8, 04/11/2026)

- La finestra **nasce già a schermo intero** (`fullscreen` nel costruttore, `show:false`, cornice normale di Windows,
  niente `kiosk` né `frame:false`): niente finestra con la barra del titolo a vista all'avvio. Il rettangolo di
  partenza (`windowedBounds`: al centro del monitor, al massimo 1280×720) decide il monitor ed è la misura a cui si
  torna uscendo dallo schermo intero. La scelta resta in `%LOCALAPPDATA%\NATPF\desktop-app.json` (`fullscreen`).
- **Alt da solo non mostra il menu** sopra il gioco: a schermo intero la barra non è «a scomparsa»
  (`setAutoHideMenuBar(false)` + nascosta); in finestra Alt la mostra.
- **Scorciatoie** lette prima della pagina (`before-input-event`, `shortcutFor`), anche quando il gioco blocca i tasti:
  F11 schermo intero, Ctrl+Maiusc+M monitor successivo, Ctrl+R ricarica, Ctrl+Q esci, Ctrl+Maiusc+I strumenti.
  Esc e le lettere arrivano sempre al gioco (F è lo schermo intero del gioco, che usa `window.natpfDesktop`).
- **Cambio di monitor** a finestra trasparente (esce dallo schermo intero, si sposta, rientra): nessuna cornice a vista.
  Solo quando il monitor è davvero un altro (`placeMode`): con un solo monitor Ctrl+Maiusc+M non fa niente, e il menu
  sul monitor già scelto nemmeno: su Windows `setOpacity` lascia la finestra «a strati» per il resto della sessione
  (dal codice di Electron 45.2.2, non provato su Windows).
- **Monitor che cambia**: se il monitor del gioco cambia risoluzione o scala, lo schermo intero si riadatta (dopo
  300 ms) prima con il rettangolo del monitor restando a schermo intero, e solo se non basta con il giro completo. Se il
  monitor voluto si scollega il gioco va sul principale e ci ritorna quando si ricollega; il monitor voluto è quello
  salvato anche quando all'avvio è spento (ledwall acceso dopo il programma: il gioco ci va quando compare). Gli
  spostamenti automatici non cambiano il monitor salvato.
- **Ponte con la pagina** (`src/preload.cjs`, contextIsolation e sandbox): `window.natpfDesktop = { shell:'electron',
  version:2, isFullScreen(), setFullScreen(on), toggleFullScreen(), onFullScreenChange(cb), updates }` (`updates`
  dal 07/11, sezione sotto). Il processo principale
  risponde solo alla finestra del gioco e alle pagine del proprio server. Con il ponte il gioco non usa
  `requestFullscreen` di HTML (Electron consumerebbe il primo Esc per uscirne).

## Aggiornamenti dal gioco (07/11/2026)

- **Dove**: bucket pubblico di Cloudflare R2 (repository privato: niente download da GitHub). Indirizzo base in
  `aggiornamenti.json` (`{ "base": "https://pub-….r2.dev", "hosts": [] }`) o, al momento della costruzione, nella
  variabile `NATPF_AGGIORNAMENTI_URL` (il workflow la prende dalla variabile del repository con lo stesso nome).
  Vuoto → stato `off`. `hosts`: altri host https verso cui il server può rimandare (redirect); di base nessuno.
  `NATPF_AGGIORNAMENTI_BASE` (ambiente, all'avvio) vale solo nelle prove (`npm start` o `NATPF_AGGIORNAMENTI_PROVA=1`):
  nel programma costruito vince sempre `aggiornamenti.json`.
- **Manifesto** `<base>/windows/latest.json` = `{ build, version, file, size, sha256, notes, published }`, installer in
  `<base>/windows/<file>`. Li carica il workflow (prima l'installer, poi il manifesto), solo per una versione più nuova
  di quella sul bucket: un installer pubblicato non si riscrive. `notes`: righe della versione in `novita.txt`
  (`AAAA-MM-GG.n: testo per chi gioca`), altrimenti «Versione AAAA-MM-GG.n.».
- **Ponte** `window.natpfDesktop.updates`: `state()`, `check()`, `download()` → `Promise<S>`; `install()` →
  `Promise<{ ok, error? }>`; `onChange(cb)` → funzione che toglie l'ascolto. `S = { status, current, latest?, notes?,
  size?, progress?, error?, checkedAt? }`, `status` tra `off`, `idle`, `checking`, `none`, `available`, `downloading`,
  `ready`, `installing`, `error`; testi di `error` in italiano. `download()` risponde a download finito, l'avanzamento
  arriva con `onChange` (al più ogni 250 ms) e sulla barra delle applicazioni.
- **Quando è attivo**: solo nel programma installato (accanto all'eseguibile c'è `Disinstalla NATPF Simulator.exe`)
  e con l'indirizzo; altrimenti `off` (anche nella prova su Linux, salvo `NATPF_AGGIORNAMENTI_PROVA=1`).
- **Controllo**: 8 s dopo l'apertura del gioco e su richiesta (pagina o Alt → Aiuto → Cerca aggiornamenti…), mai
  download o installazione senza clic. Offline o errore → `error` con un testo chiaro, il gioco continua.
- **Download** in `%LOCALAPPDATA%\NATPF\aggiornamenti\NATPF-Simulator-Setup-<versione>.exe` (attraverso `.parziale`):
  ripresa con `Range` se si interrompe (anche al clic successivo), da capo se il server non lo permette; dimensione e
  sha256 controllati (file sbagliato cancellato); redirect solo verso la stessa origine o gli `hosts`; https
  obbligatorio (http solo verso questo computer, per le prove). Installer vecchi cancellati all'avvio successivo.
- **Installazione**: ricontrollo dello sha256, poi `powershell Start-Process -FilePath <installer> -ArgumentList
  '/S','/AGGIORNA' -Verb RunAs` (permesso di Windows: «Sì»; se si rifiuta il programma resta aperto, stato `ready`
  con l'errore), poi il programma si chiude. L'installer con `/AGGIORNA` aspetta fino a 15 s che il programma si
  chiuda, aggiorna in silenzio nella stessa cartella e riapre il gioco tramite Esplora risorse (senza i permessi di
  amministratore). Dati in `%LOCALAPPDATA%\NATPF` intatti. Se l'installazione silenziosa non riesce l'installer mostra
  un messaggio con il percorso del file per riprovare a mano. Permesso di Windows senza risposta per 10 minuti: di nuovo
  `ready` con un avviso; un «Sì» dato dopo chiude comunque il programma.
- **Sicurezza**: l'integrità dipende da HTTPS verso R2 e dal token di scrittura nei segreti di GitHub (sha256 nel
  manifesto: contro file rovinati, non contro chi può scrivere sul bucket). Una firma del manifesto (chiave privata
  solo nei segreti) è un miglioramento possibile, non fatto. Tra il ricontrollo dello sha256 e il «Sì» un programma
  dello stesso utente potrebbe sostituire il file nella cartella dell'utente (rimedio: installer o manifesto firmati).
  http/https di Node non usano proxy e certificati di Windows (reti che ispezionano HTTPS: controllo in errore).

## Costruire (da Linux o da Windows; non serve wine)

```sh
cd natpf-tennis && npm ci && npm run build && cd ..
cd tools/lan && npm ci && cd ../..
cd natpf-desktop
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci   # l'Electron per Windows lo scarica electron-builder
npm test
npm run costruisci                       # prepara + costruisci: alcuni minuti (compressione lzma)
```

Risultato in `natpf-desktop/dist/`: `NATPF-Simulator-Setup-<versione>.exe` (l'unico eseguibile). Con l'indirizzo
degli aggiornamenti: `NATPF_AGGIORNAMENTI_URL=https://pub-….r2.dev npm run costruisci` (o `aggiornamenti.json`).
Il manifesto per il bucket: `node scripts/manifesto.mjs --exe=dist/NATPF-Simulator-Setup-<versione>.exe`. La
versione è quella del gioco (`site/js/tennis/version.js`,
`AAAA-MM-GG.n`), nell'eseguibile come `AAAA.MMGG.n`.

Perché makensis a parte: il target `nsis` di electron-builder da Linux chiede wine per costruire la disinstallazione;
qui la disinstallazione la scrive l'installazione stessa (`WriteUninstaller`), con lo stesso makensis che
electron-builder scarica nella sua cache. Icona e versione dell'eseguibile con `resedit` (rcedit chiederebbe wine).

## Su GitHub e sul bucket degli aggiornamenti

Il workflow `.github/workflows/natpf-windows.yml` costruisce l'installer su GitHub quando cambia la versione del gioco
(`site/js/tennis/version.js`), il programma Windows o il workflow (o a mano: «Run workflow») e:
- lo pubblica come un unico file: Actions → «NATPF eseguibili Windows» → esecuzione → Artifacts
  (`NATPF-Simulator-Windows-<versione>`, con l'`.exe`, `SHA256SUMS.txt`, `latest.json` e `COLLAUDO_WINDOWS.md`;
  resta 30 giorni);
- con i segreti `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET` lo carica sul bucket R2 con
  aws cli (API S3, `https://<account>.r2.cloudflarestorage.com`): `windows/<installer>` (controllo della dimensione),
  poi `windows/latest.json` (senza cache), poi la copia `windows/NATPF-Simulator-Setup.exe` per la prima installazione;
  tiene gli ultimi 5 installer; non pubblica se sul bucket c'è una versione più nuova. Senza segreti: un avviso e
  basta. Con la variabile `NATPF_AGGIORNAMENTI_URL` controlla anche il manifesto dall'indirizzo pubblico.

## Consegnare l'installer a pezzi (se serve)

L'`.exe` intero (~125 MB) non si scaricava dai messaggi (05/11/2026); gli zip da ~60 MB sì. Dopo la costruzione:

```sh
node scripts/dividi.mjs          # dist/consegna/: nome.exe.001, .002, … (45 MB al massimo) + «UNISCI I PEZZI.cmd»
```

Su Windows: tutti i pezzi e `UNISCI I PEZZI.cmd` nella stessa cartella, doppio clic: rimette insieme l'`.exe`
(`copy /b`) e controlla lo sha256 (`certutil`), tutto già presente in Windows.

## Provare il programma su Linux (stesso codice, senza Windows)

```sh
ELECTRON_SKIP_BINARY_DOWNLOAD= node node_modules/electron/install.js   # Electron per Linux
Xvfb :77 -screen 0 1920x1080x24 &
DISPLAY=:77 LOCALAPPDATA=/tmp/natpf NATPF_DATA_DIR=/tmp/natpf/NATPF node_modules/electron/dist/electron app --no-sandbox
```

Prova automatica dello schermo intero (Xvfb e Playwright; serve `npm ci --prefix ../tools/e2e` per playwright-core;
porte 8443, 8081 e 8080 libere; dati in una cartella temporanea):

```sh
node scripts/prepara.mjs
npm run prova-linux            # = node scripts/prova-linux.mjs [--display=:91] [--dati=cartella] [--senza-xvfb] [--scenari=…]
```

Cinque avvii (`--scenari=predefinito,ledwall-spento,finestra,gioco,aggiornamenti`): senza impostazioni, con un monitor
salvato che manca all'avvio, con l'avvio in finestra salvato, il gioco vero con il ponte, e gli aggiornamenti con un
server finto su 127.0.0.1 (`NATPF_AGGIORNAMENTI_BASE` e `NATPF_AGGIORNAMENTI_PROVA=1`: installazione simulata, non si
avvia niente). Gli eventi dei monitor (risoluzione cambiata, ledwall acceso) sono simulati
con `screen.emit`: provano il collegamento, non il comportamento di Windows.
Controlla stati, non misure: senza gestore delle finestre Xvfb riporta posizione e dimensioni sbagliate. La comparsa
senza cornice all'avvio, il cambio di monitor e i cambi di risoluzione si vedono solo su Windows
(collaudo: `docs/COLLAUDO_WINDOWS.md`).

Le parti di Windows (firewall, UAC, collegamenti, SmartScreen, aggiornamento con `/S /AGGIORNA`) si provano solo su
Windows.
