# natpf-desktop · NATPF Simulator per Windows (portatile e installabile)

Guscio Electron del gioco (richiesta del 04/11/2026). Il gioco è lo stesso della versione browser
(`natpf-tennis/dist`); il processo principale avvia nello stesso processo il server LAN dello zip di Codex
(`tools/lan/certificato.mjs`, `natpf-tennis/lan/server.mjs`: certificati in `%LOCALAPPDATA%\NATPF`, HTTPS 8443,
pagina del certificato 8081) e apre `https://localhost:8443/?lan=1` a schermo intero sul monitor scelto.

Collaudo su Windows (punti per l'utente): `docs/COLLAUDO_WINDOWS.md`. Decisioni: `docs/DESKTOP_WINDOWS.md` §13.

## File

| File | Cosa |
|---|---|
| `src/main.mjs` | processo principale: server, certificato, finestra, monitor, menu, scorciatoie, firewall, schermo acceso |
| `src/desktop-core.mjs` | funzioni pure (monitor, finestra, scorciatoie, fiducia nel certificato, firewall, impostazioni, versione) |
| `src/preload.cjs` | ponte con la pagina del gioco: `window.natpfDesktop` (schermo intero della finestra) |
| `test/desktop-core.test.mjs` | prove con `node --test` (senza Electron), anche del preload |
| `scripts/prepara.mjs` | crea `app/`: gioco già costruito, pagine del telefono, server LAN, `main.mjs`, `preload.cjs` |
| `scripts/prova-linux.mjs` | prova di `app/` con Electron per Linux in Xvfb (Playwright): schermo intero, tasti, ponte |
| `scripts/costruisci.mjs` | electron-builder → `dist/win-unpacked`, poi makensis → i due `.exe` |
| `build/installatore.nsi` | installazione (Programmi, collegamenti, regola del firewall, disinstallazione) |
| `build/portatile.nsi` | portatile (estrae al primo avvio in `%LOCALAPPDATA%\NATPF\portatile\<versione>`) |
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
  version:1, isFullScreen(), setFullScreen(on), toggleFullScreen(), onFullScreenChange(cb) }`. Il processo principale
  risponde solo alla finestra del gioco e alle pagine del proprio server. Con il ponte il gioco non usa
  `requestFullscreen` di HTML (Electron consumerebbe il primo Esc per uscirne).

## Costruire (da Linux o da Windows; non serve wine)

```sh
cd natpf-tennis && npm ci && npm run build && cd ..
cd tools/lan && npm ci && cd ../..
cd natpf-desktop
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci   # l'Electron per Windows lo scarica electron-builder
npm test
npm run costruisci                       # prepara + costruisci: alcuni minuti (compressione lzma)
```

Risultato in `natpf-desktop/dist/`: `NATPF-Simulator-Setup-<versione>.exe` e
`NATPF-Simulator-Portatile-<versione>.exe`. La versione è quella del gioco (`site/js/tennis/version.js`,
`AAAA-MM-GG.n`), nell'eseguibile come `AAAA.MMGG.n`.

Perché makensis a parte: il target `nsis` di electron-builder da Linux chiede wine per costruire la disinstallazione;
qui la disinstallazione la scrive l'installazione stessa (`WriteUninstaller`), con lo stesso makensis che
electron-builder scarica nella sua cache. Icona e versione dell'eseguibile con `resedit` (rcedit chiederebbe wine).

## Consegnare gli eseguibili (a pezzi)

Gli `.exe` interi (~125 MB) non si scaricano dai messaggi (05/11/2026); gli zip da ~60 MB sì. Dopo la costruzione:

```sh
node scripts/dividi.mjs          # dist/consegna/: nome.exe.001, .002, … (45 MB al massimo) + «UNISCI I PEZZI.cmd»
```

Su Windows: tutti i pezzi e `UNISCI I PEZZI.cmd` nella stessa cartella, doppio clic: rimette insieme gli `.exe`
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

Tre avvii (`--scenari=predefinito,ledwall-spento,finestra`): senza impostazioni, con un monitor salvato che manca
all'avvio, con l'avvio in finestra salvato. Gli eventi dei monitor (risoluzione cambiata, ledwall acceso) sono simulati
con `screen.emit`: provano il collegamento, non il comportamento di Windows.
Controlla stati, non misure: senza gestore delle finestre Xvfb riporta posizione e dimensioni sbagliate. La comparsa
senza cornice all'avvio, il cambio di monitor e i cambi di risoluzione si vedono solo su Windows
(collaudo: `docs/COLLAUDO_WINDOWS.md`).

Le parti di Windows (firewall, UAC, collegamenti, SmartScreen) si provano solo su Windows.
