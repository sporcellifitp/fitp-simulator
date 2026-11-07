# B11 · procedura dei pacchetti dal 07/11/2026 (da spostare in `docs/PIANO_LAVORI.md` §6 · Pacchetti)

Richiesta dell'utente del 07/11/2026: «La versione LAN mi pare la stessa della versione windows. Sviluppa solo quella
windows se è la stessa. La versione windows (installer) deve essere un unico installer che poi deve potersi aggiornare
direttamente dal gioco». Risposte: aggiornamenti su **Cloudflare R2**; si consegnano **solo l'installer Windows e lo
zip Cloudflare** (niente più zip LAN né portatile). Questo testo sostituisce i punti «Pacchetti» 1–6 del §6; Ripresa,
Test e Rollback restano come sono.

**Pacchetti** (dopo ogni commit che li cambia; se il commit non li cambia si riconsegnano gli ultimi, stessa versione e
sha256, dicendolo):
1. Versione nuova `AAAA-MM-GG.n` in `site/js/tennis/version.js` e `site/tennis/build.json`, commit, push. Il push
   fa partire il workflow `natpf-windows.yml` (installer e aggiornamento su R2, vedi 4).
2. `cd natpf-tennis && npm run build`.
3. **Cloudflare** (come dal B8): `node scripts/pacchetto-cloudflare.mjs --out=<cartella nuova>
   --zip=<altra cartella>/natpf-simulator-cloudflare-<versione>.zip --turn-url=https://natpf-turn.s-porcelli.workers.dev/`;
   lo script si ferma a 25.000.000 byte e avvisa sopra 24.000.000. Prova sullo zip estratto (server statico), sha256.
4. **Installer Windows** (unico eseguibile, stessa versione): `npm ci` in `tools/lan`, poi in `natpf-desktop`:
   `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci`, `npm test`, `npm run costruisci` (~15 minuti, lzma) →
   `natpf-desktop/dist/NATPF-Simulator-Setup-<versione>.exe`. Con l'indirizzo degli aggiornamenti (quando l'utente l'ha
   dato): in `natpf-desktop/aggiornamenti.json` (`"base"`) o `NATPF_AGGIORNAMENTI_URL=<indirizzo> npm run costruisci`;
   senza, l'installer ha gli aggiornamenti spenti (stato `off`). Controllo con il 7zz della cache di electron-builder
   (`~/.cache/electron-builder/7zip@*/…/bin/7zz l`): ~300 file, nessun `.pem` o chiave, `resources/app` uguale a
   `dist/win-unpacked`, `resources/app/aggiornamenti.json` con l'indirizzo giusto; sha256; dimensioni e sha256 in
   `docs/COLLAUDO_WINDOWS.md` §0 se cambiano.
   **Su GitHub** lo stesso installer lo costruisce il workflow a ogni cambio di versione: Artifacts
   (`NATPF-Simulator-Windows-<versione>`: `.exe`, `SHA256SUMS.txt`, `latest.json`, lista di collaudo; 30 giorni) e,
   con i segreti R2 dell'utente, **aggiornamento pubblicato su R2**: `windows/NATPF-Simulator-Setup-<versione>.exe`,
   poi `windows/latest.json`, poi `windows/NATPF-Simulator-Setup.exe` (link fisso per la prima installazione). Da lì
   i programmi installati con l'indirizzo vedono la versione nuova e si aggiornano dal gioco. Controllo: riepilogo
   dell'esecuzione («Aggiornamento … pubblicato su Cloudflare R2») e `<indirizzo>/windows/latest.json` nel browser.
   Senza segreti il workflow avvisa e l'installer resta solo negli Artifacts.
5. **Consegna all'utente**: zip Cloudflare (sha256) e installer (link dell'esecuzione di GitHub o del bucket; se
   serve, a pezzi con `node scripts/dividi.mjs` → `dist/consegna/`, pezzi da 45 MB e `UNISCI I PEZZI.cmd`).
   Annotazione in `docs/WORK_PROGRESS.md` e nel Registro (§4).
6. **Niente più** zip LAN (`natpf-tennis/lan/pacchetto.mjs` resta: lo usa `natpf-desktop/scripts/prepara.mjs` per
   mettere il server dei telefoni nel programma) né portatile (`build/portatile.nsi` tolto).

**Aggiornamenti: cose da sapere per chi coordina**
- Contratto con il gioco: `window.natpfDesktop.updates` (versione 2 del ponte), descritto in
  `natpf-desktop/src/preload.cjs` e `natpf-desktop/LEGGIMI.md` § «Aggiornamenti dal gioco».
- Il bucket e i segreti li prepara l'utente con `docs/GUIDA_AGGIORNAMENTI_R2.md`; poi manda l'indirizzo pubblico (o
  imposta la variabile del repository `NATPF_AGGIORNAMENTI_URL`). La prima versione con l'indirizzo si installa a mano.
- Ogni aggiornamento chiede il permesso di Windows (UAC): l'installazione è per il computer (Programmi e firewall).
- Prova su Linux: `cd natpf-desktop && node scripts/prepara.mjs && node scripts/prova-linux.mjs` (scenario
  `aggiornamenti` con un server finto; porte 8443, 8081, 8080 libere).
