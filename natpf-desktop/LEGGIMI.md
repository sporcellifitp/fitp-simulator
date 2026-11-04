# natpf-desktop · NATPF Simulator per Windows (portatile e installabile)

Guscio Electron del gioco (richiesta del 04/11/2026). Il gioco è lo stesso della versione browser
(`natpf-tennis/dist`); il processo principale avvia nello stesso processo il server LAN dello zip di Codex
(`tools/lan/certificato.mjs`, `natpf-tennis/lan/server.mjs`: certificati in `%LOCALAPPDATA%\NATPF`, HTTPS 8443,
pagina del certificato 8081) e apre `https://localhost:8443/?lan=1` a schermo intero sul monitor scelto.

Collaudo su Windows (punti per l'utente): `docs/COLLAUDO_WINDOWS.md`. Decisioni: `docs/DESKTOP_WINDOWS.md` §13.

## File

| File | Cosa |
|---|---|
| `src/main.mjs` | processo principale: server, certificato, finestra, monitor, menu, firewall, schermo acceso |
| `src/desktop-core.mjs` | funzioni pure (monitor, fiducia nel certificato, comandi del firewall, impostazioni, versione) |
| `test/desktop-core.test.mjs` | prove con `node --test` (senza Electron) |
| `scripts/prepara.mjs` | crea `app/`: gioco già costruito, pagine del telefono, server LAN, `main.mjs` |
| `scripts/costruisci.mjs` | electron-builder → `dist/win-unpacked`, poi makensis → i due `.exe` |
| `build/installatore.nsi` | installazione (Programmi, collegamenti, regola del firewall, disinstallazione) |
| `build/portatile.nsi` | portatile (estrae al primo avvio in `%LOCALAPPDATA%\NATPF\portatile\<versione>`) |
| `build/icon.ico`, `build/*.bmp` | icona e grafica dell'installazione |

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

## Provare il programma su Linux (stesso codice, senza Windows)

```sh
ELECTRON_SKIP_BINARY_DOWNLOAD= node node_modules/electron/install.js   # Electron per Linux
Xvfb :77 -screen 0 1920x1080x24 &
DISPLAY=:77 LOCALAPPDATA=/tmp/natpf NATPF_DATA_DIR=/tmp/natpf/NATPF node_modules/electron/dist/electron app --no-sandbox
```

Le parti di Windows (firewall, UAC, collegamenti, SmartScreen) si provano solo su Windows.
