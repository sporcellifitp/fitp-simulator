# WORK_PROGRESS · registro dei passi (dal 04/11/2026)

Registro dettagliato dei blocchi di `docs/PIANO_LAVORI.md` (§4): per ogni passo file toccati, intervento, verifiche
con i numeri, ciò che non è verificato, commit e pacchetti. Lo stato sintetico e la prossima azione sono in
`docs/PIANO_LAVORI.md`. Qui restano i blocchi **dal 16/11/2026** (da B53.1). Archivio (solo consultazione): blocchi
B0–B52 dal 04/11 al 15/11 in `docs/archivio/WORK_PROGRESS_dal_2026-11-04_al_2026-11-15.md`; registro fino al 04/11 in
`docs/archivio/WORK_PROGRESS_fino_al_2026-11-04.md`. Le sezioni citate nei commenti del codice come «WORK_PROGRESS, «…»»
sono in uno di questi due file.

Legenda: [x] fatto, verificato e pubblicato · [~] in corso · [ ] da fare.

Modello di una voce:

```
## Bn · titolo · stato · date
Obiettivo · criterio di fine
- [x] Bn.k · cosa (commit abc1234, push sì, pacchetti <versione> | invariati)
  File: … · Verifiche: comando → numeri · Non verificato: …
```

---

## B53.1 · Rovescio «come nel video», versione 2026-11-15.1 (15/11 23:15 – 16/11 07:15 UTC)

- [x] File: `natpf-tennis/src/natpf/natpf_strokes_video.js` (nuovo), `natpf-tennis/src/player_body_animation.js`
  (svPre/svPost), `natpf-tennis/test/natpf-colpi-video.test.mjs` (nuovo, 6 test), `natpf-tennis/test/natpf-dritto-video.test.mjs`
  (due test aggiornati: il rovescio con la prova accesa ora cambia), `tools/e2e/natpf-dritto-video.mjs` (`COLPO=rovescio`,
  stato del B53 rimesso da capo, misura degli scatti con il segno dei quaternioni continuo), `docs/b53/` (documento e
  immagini), guida dello stand (riga delle Opzioni, «Vale per»), `PROJECT_MEMORY`, versione 2026-11-15.1.
- Trailer guardato: rovescio (4,5–6 s) e schiacciata (7–8 s) ci sono; servizio e volée no.
- Verifiche: test dei colpi 6/6, del B23 15/15, mascotte 3D tutti verdi; gioco 1746/1746 (al primo giro 1744: mano libera
  delle mascotte davanti agli occhi nel finale a due mani e salto di 33 cm, corretti); controllo rapido sito 275/275,
  desktop 51/51, LAN 13/13, build; `natpf-dritto-video` 50/58 al primo giro (scatto della racchetta 740 mm, scatti della CPU
  fuori dallo swing, falso scatto di 4 rad della misura), poi **54/58 con gli stessi 4 rossi della 14.9** (verificato
  facendo girare la prova su una copia della 14.9: 54/58). Fogli del rovescio guardati (camera di gioco e ravvicinata).
- Non verificato: telefono vero, ledwall, scheda video vera; il giudizio sul rovescio spetta all'utente.

## B53.2 · Schiacciata «come nel video», versione 2026-11-15.2 (16/11, 07:15–07:40 UTC)

- [x] File: `natpf_strokes_video.js` (voce `smash`; mano per posa `hands`, salto per colpo `hop`, `racket.fin` facoltativo),
  `test/natpf-colpi-video.test.mjs` (+3), `test/natpf-dritto-video.test.mjs` (la schiacciata non è più «immutata»),
  `tools/e2e/natpf-dritto-video.mjs` (`COLPO=schiacciata`: pallonetto con `flight`/`landZ`, secondo colpo dello scambio),
  `docs/b53/` (§3 e immagini), guida, versione 2026-11-15.2.
- Trailer (7–8 s) guardato fotogramma per fotogramma: salto con il braccio libero verso la palla, racchetta dietro la
  testa, colpo in aria, atterraggio a braccia aperte. Picco delle corde della schiacciata a 0,36 dello swing (sonda).
- Verifiche: test dei colpi 9/9 e del B23 13/13, mascotte 3D verdi; controllo rapido gioco 1749/1749, sito 275/275,
  desktop 51/51, LAN 13/13, build; `natpf-dritto-video` 54/58 (i 4 rossi della 14.9); fogli della schiacciata 4/4,
  guardati (camera di gioco e ravvicinata). Salto alzato da 10 a 14 cm dopo aver guardato i fogli.
- Installer e zip della 2026-11-15.1 verificati (vedi traccia).
- Non verificato: telefono vero, ledwall; il salto parte dopo l'impatto (nel trailer il colpo è in aria): scelta dovuta
  al vincolo della racchetta del motore all'impatto.

## B52.1 · App Android 1.0.1: si chiudeva su «Inquadra il QR del PC» (16/11/2026, 08:10–08:25 UTC, urgente)

- [x] Segnalazione dell'utente: toccando «Inquadra il QR del PC» l'app 1.0.0 si chiudeva da sola. Lavoro del B53.3
  sospeso (resta nel working tree, non committato).
- Causa trovata nell'APK: `CaptureManager` di `zxing-android-embedded` 4.3.0 richiama `androidx.core.content.ContextCompat`
  e `androidx.core.app.ActivityCompat` (permesso della fotocamera), il POM della libreria porta solo `zxing:core`, l'app
  non usava AndroidX: `dexdump` della 1.0.0 = 0 classi `androidx` → `NoClassDefFoundError` all'apertura del lettore.
- File: `natpf-android/app/build.gradle` (`androidx.core:core:1.6.0`, 1.0.1 / codice 2), `MainActivity.java` (`ScanOptions`
  e `ScanIntentResult` al posto di `IntentIntegrator`, avviso se il lettore non si apre), `natpf-android/controlla-classi.mjs`
  (nuovo), `.github/workflows/natpf-android.yml` (controllo dopo la build), `docs/b52/app-android.md` §5, guida 8.9
  (aggiornare l'app, usare la 1.0.1), CLAUDE.md (comando).
- Verifiche: `controlla-classi.mjs` sulla 1.0.0 → rosso con esattamente le due classi; sulla 1.0.1 → verde (1128 classi
  nell'APK, 1659 richiamate, 3 tollerate da `IntentIntegrator`/`ScanContract` non usate); test di unità 4/4; lint 0 errori;
  `apksigner`: certificato `a1c16e0b…2e1d` (chiave dello stand), `versionCode` 2; `natpf-app-android` 5/5; sito 275/275.
  APK 679.677 B, sha256 `fe332244e4609538fd1083072f69e43ad6f2f9b1f2a308b26ea3aa6c56cc96a7`, consegnato all'utente.
- Non verificato: telefono vero (fotocamera, permesso, lettura del QR). Gioco e pacchetti del gioco invariati (2026-11-15.2).

## B52.2 · App Android 1.0.2: schermo vuoto senza il certificato NATPF (16/11/2026, 08:30–08:45 UTC, urgente)

- [x] Segnalazione dell'utente con la 1.0.1: QR del PC dello stand (rete locale `192.168…`), sul telefono solo l'app →
  «App fissata» in alto e poi niente. Prima di questo: workflow Android con le chiavi R2 ripulite (`53333aa`), 1.0.1
  pubblicata su R2.
- Causa (dal codice, verificata in Chromium): certificato del PC (`tools/lan/certificato.mjs`) non attendibile senza il
  certificato NATPF sul telefono → la WebView annullava in silenzio; `onPageFinished` della pagina d'errore fissava
  l'app e nascondeva l'avviso (anche quello di rete, dalla 1.0.0).
- File: `RacketLink.java` (`trustStandCertificate`, `isLocalIpv4`), `RacketLinkTest.java` (+1), `MainActivity.java`
  (`onReceivedSslError`, `onReceivedHttpError`, `onPageStarted`/`pageFailed`, `onConsoleMessage`, versioni e ultimo errore
  nella schermata dello staff, avviso azzerato a ogni QR), `app/build.gradle` (1.0.2 / 3),
  `tools/e2e/natpf-app-certificato.mjs` (nuovo), `docs/b52/app-android.md` §6, guida 8.9.
- Verifiche: `natpf-app-certificato` 7/7 (senza «Procedi» `ERR_CERT_AUTHORITY_INVALID`; con «Procedi» pagina vera,
  `isSecureContext`, `wss` + WebRTC, sensori, colpo al PC, nessun errore); unità 5/5; lint 0 errori; `controlla-classi`
  verde; `apksigner` certificato `a1c16e0b…2e1d`, `versionCode` 3; `natpf-app-android` 5/5. APK 680.905 B, sha256
  `99902fa99644735e91221255138cdb1c65543e0c86e72beedcd936f1c291439f`, consegnato.
- Non verificato: telefono vero; che la WebView ricordi la scelta anche per la `wss` è dalla documentazione e dal
  meccanismo comune di Chromium, provato solo in Chrome.

## B54 · Nome del giocatore scritto sul telefono, versione 2026-11-16.1 (16/11/2026, 11:00–13:30 UTC)

- [x] Richiesta dell'utente (16/11): il visitatore scrive il suo nome sul telefono prima di «Sono pronto», per ogni telefono
  abbinato e a ogni partita (era stato chiesto anche all'altro agente con l'app 1.0.3: non fatto). Decisioni (domande a
  scelta): facoltativo con «Salta» in alto a destra, prima di «Sono pronto», campo vuoto per un giocatore nuovo e nome di
  prima nella rivincita, filtro delle parolacce + correzione dello staff dal PC. Documento `docs/b54/nome-dal-telefono.md`.
- File: `site/js/tennis/player-name.js` (nuovo: regole del nome e filtro, usate da telefono e computer), `phone-screen.js`
  (`nameOnMsg`, `nameSubmit`, `#nameBox` in `phoneView`), `phone-touch-lock.js` (`nameTap`), `racchetta.js` e
  `racchetta.html` (schermata «Come ti chiami?», `dev` con `nm 1`), `link.js` (messaggio `nm` → `name`, `device.names`);
  gioco: `natpf_ready_go.js` (richiesta, risposta, dove va il nome, chip «scrive il nome», registro senza il nome),
  `natpf_phone_racket.js` (`offerName`, `_sendName`, `_onName`, `asksName`), `natpf_events.js` (regole da
  `player-name.js`), `natpf_scoreboard.js` e `natpf_ui.js` (nome al posto di «Tu»); prove `natpf-b54-nome.test.mjs` (9),
  `tools/test/b54-nome-telefono.test.mjs` (5), `phone-link-fast.test.mjs`, `tools/e2e/natpf-nome-telefono.mjs` (nuovo),
  `natpf-fiera-telefoni.mjs` e `natpf-flusso-tocchi.mjs` aggiornati; guida (3, 8.4), memoria, versione 2026-11-16.1.
- Correzioni durante il passo: nomi azzerati rientrando sulla pagina dopo un foglio dello staff (ora solo uscendo);
  «tolta» mandata anche alle pagine di prima (ora solo a chi aveva la richiesta); pulsanti dello staff nascosti sul
  telefono dello stand durante il nome (trovato da `natpf-fiera-telefoni`, 65/66 → 66/66); nella prova del telefono la
  gravità finta al contrario faceva rifare la calibrazione al terzo tocco (voto del segno, motion-sign.js: prova, non gioco).
- Verifiche: gioco 1761/1761, sito 280/280, LAN 13/13, desktop 51/51, build; `natpf-nome-telefono` 20/20 (misure a
  390 × 844: «Salta» in alto a destra, «Conferma» fino a 404 px; con la tastiera, 390 × 470: tutto in vista);
  `natpf-fiera-telefoni` 66/66 (nome scritto in fiera, tabellone «Giulia», «Bella sfida, Giulia!» su una riga a 1920×1080,
  1280×720 e 720×720, stesso schermo con «Anna» e un «Salta»); `natpf-flusso-tocchi` FLOW=fiera 20/20 (al massimo 2 clic e
  2 tocchi per visitatore, prima 1 tocco) e FLOW=fiera-due 13/13 (al massimo 4 tocchi a coppia, prima 2).
- Filtro: 70 nomi veri passano, 42 parole da bloccare no; limite noto: cognomi rari come «Merdani» (li scrive lo staff).
- Non verificato: telefono vero (tastiere di Android e iPhone, app 1.0.3 con la tastiera aperta), ledwall.
- Pacchetti (commit `3135a0d`): installer 2026-11-16.1 dal link fisso = `latest.json` (128.155.172 B, sha256 `d9ee30a7…4eab50`);
  zip Cloudflare 23.951.030 B, sha256 `6be7b8d3…7e98d04b6`, provato estratto, consegnato. GitHub verde (tre workflow).

## B54.1 · Telefoni dello stand con la pagina di prima, versione 2026-11-16.2 (16/11/2026, 13:10–14:30 UTC)

- [x] Foto dell'utente: telefono dello stand senza la richiesta del nome. Causa: il telefono si ricollega dopo
  l'aggiornamento del PC senza ricaricare la pagina (pagina di prima, niente `dev nm 1`). File: `natpf_phone_racket.js`
  (`_sendBuild`, messaggio `bv`), `racchetta.js` (`buildReload`: fuori dalla partita, una volta per versione, con
  `pageGoing`), prove `natpf-b54-nome.test.mjs` (+1) e `natpf-nome-telefono.mjs` (+3), guida 3, documento B54 §4, versione.
- Verifiche: gioco 1762/1762, sito 280/280 (dopo aver rimesso la riga di `case 'ph'` come la vuole il test del B46),
  LAN 13/13, desktop 51/51, build; `natpf-nome-telefono` 23/23.
- Non verificato: telefono vero; la ricarica nell'app (WebView) e il ricollegamento dello stand dopo la ricarica sono
  quelli già provati per la pagina ricaricata (`natpf-fiera-telefoni`), non questo caso preciso.
- Pacchetti 16.2: installer = `latest.json` (sha256 `f0e95275…137a`), zip `768829c0…1bba` provato estratto, consegnato.

## B53.5 · Voce «Movimenti come nel video», versione 2026-11-16.3 (16/11/2026)

- [x] File: `natpf-tennis/index.html` (etichetta e `aria-label`), `natpf_forehand_video.js` (avvisi), prove
  `natpf-dritto-video-opzione.test.mjs` e `natpf-dritto-video.test.mjs`, `tools/e2e/natpf-dritto-video.mjs` (riga delle
  Opzioni), guida, `docs/b53/colpi-dal-video.md` §5, versione. Stessa chiave salvata (`natpf-tennis.drittoVideo`).
- Verifiche: gioco 1762/1762, sito 280/280, LAN 13/13, desktop 51/51, build. Non rifatta `natpf-dritto-video` nel browser
  (cambia solo la scritta; la riga delle Opzioni si controlla lì).
- Pacchetti 16.3: installer = `latest.json` (sha256 `61f14209…13e3`), zip `6b728776…8a37` provato estratto, consegnato.

## B53.4 · Servizio «come nel video», versione 2026-11-16.4 (16/11/2026)

- [x] File: `natpf_strokes_video.js` (voce `serve`; durante una reazione la posa si chiude sotto l'1 %), prove
  `natpf-colpi-video.test.mjs` (+2, tipi e sequenza aggiornati) e `natpf-dritto-video.test.mjs` (sequenza), documento B53 §6,
  guida, versione.
- Sonda: swing del servizio 0,352 s, parte da 0,063 s (l 0,18) anche per la CPU; la posa della preparazione resta quasi a
  zero, quindi niente gambe piegate dentro lo swing (scelta: il lancio resta quello di sempre).
- Verifiche: gioco 1764/1764, sito 280/280, LAN 13/13, desktop 51/51, build. Non fatti: fogli nel browser del servizio,
  `natpf-dritto-video` nel browser.
- Pacchetti 16.4: installer = `latest.json` (128.161.534 B, sha256 `95bce704…f31b`), zip 23.951.506 B (sha256 `0122f717…85f8`)
  provato estratto, consegnato. GitHub verde sui tre workflow.

## B54.2 · Niente tastiera del PC con «Nuovo giocatore», versione 2026-11-16.5 (16/11/2026)

- [x] `natpf_new_player.js` (`phoneAsksName`: partita, telefono collegato che sa chiedere il nome → niente
  `askNickname`), prova in `natpf-b54-nome.test.mjs`, guida, documento B54 §5. Gioco 1765/1765.
- Worker del registro: stato pubblico `{"registro":"pronto","spazio":true,"chiave":true,"formato":2}`: già alla versione
  del B36.0, non va ricaricato.

## B55 · Torna alla versione di prima, versione 2026-11-16.6 (16/11/2026)

- [x] File: `natpf-desktop/src/aggiornamenti.mjs` (storia, versione di prima, `prefetchPrevious`, `rollback`), `main.mjs`,
  `preload.cjs`, `desktop-core.mjs` (azione `rollback`), `scripts/versioni.mjs` e `versioni-pubblicate.json` (nuovi),
  `.github/workflows/natpf-windows.yml` (passo 5: `windows/versioni.json`), `natpf-tennis/src/natpf/natpf_updates.js`
  (pulsante con conferma), prove (desktop +5, gioco +2), guida 8.10, documento B55, memoria, versione.
- Verifiche: gioco 1767/1767, sito 280/280, LAN 13/13, desktop 56/56, build; bash del passo del workflow controllato
  (`bash -n`), `versioni.mjs` provato con l'elenco del bucket finto. Non provati: Windows vero, `prova-linux.mjs`.

## Registro di Torino: partite, trofei ritarati (versione 2026-11-16.7), direzione ferma (16/11/2026)

- [x] Letto lo scarico del Worker dell'utente con `scripts/registro/riassunto.mjs` (587 partite) e uno script dei trofei
  (nella cartella di lavoro della sessione; calcolo descritto in `docs/b36/misure-torino.md` §4).
- File: `natpf_trofei.js` (soglie di 5 trofei), `test/natpf-b40-trofei.test.mjs` e `natpf-b40-card.test.mjs` (esempi alle
  soglie nuove), `docs/b36/misure-torino.md` (nuovo), `docs/b40/fine-partita-v2.md` §3.1, registro dei prodotti, versione.
- Verifiche: gioco 1768/1768, sito 280/280, LAN 13/13, desktop 56/56, build.
- Non verificato: i contatori ricostruiti dal registro sono un'approssimazione di quelli del gioco.

## B65 · Classifica di oggi a fine partita, versione 2026-11-17.4 (17/11/2026)

- [x] Richiesta dell'utente e decisioni (solo chi vince nello stesso schermo; dopo la card per 8 s): `docs/b65/classifica-fine.md`.
- File: `natpf_classifica_fine.js` (nuovo), `natpf_events.js` (`MATCH_KEEP` 3000, `recordSplitWin`, CSV), `natpf_ui.js`,
  `natpf-ui.css`, `tools/e2e/th.mjs` (spenta nelle prove), prove `natpf-b65-classifica-fine` (5) e
  `tools/e2e/natpf-classifica-fine.mjs` (11).
- Verifiche: gioco 1820/1820, sito 282/282, build; nel browser classifica-fine 11/11; lob-drop 136/137: il controllo dei
  piedi in corsa (3,08 % contro 3 %) fallisce uguale sulla 17.3 (`1633240`, provata in una copia a parte): non è di oggi.
- Non verificato: ledwall, programma Windows vero.

## B63 + B64 · Mascotte 3D (anteprima) e ridondanze tolte, versione 2026-11-17.4 (17/11/2026)

- [x] B63 (`docs/b63/mascotte-3d.md`): `natpf_card_moves.js` (nuovo), `natpf_ritratti.js`, `player_body_animation.js`
  (reazione `sad`), `hud_ui.js`; interruttore spento di base; anteprima `tools/e2e/natpf-mascotte-3d-anteprima.mjs`
  (sei fogli, `docs/analisi/mascotte-3d-anteprima.webp`); prova `natpf-b63-mascotte-3d` (6). Interruttore per spegnere le
  GIF (`natpf-tennis.mascotteGif`), usato dalla prova dei ritratti 3D (prima 22/24 nel server di sviluppo per le GIF, ora 24/24).
- [x] B64 (`docs/b64/ridondanze.md`): `index.html`, `natpf_rematch.js`, `natpf_lobby.js`, `natpf_kiosk.js`, `natpf-ui.css`;
  prove `natpf-b47-rivincita` (aggiornata), e2e chi-gioca, lob-drop, b47-fiera aggiornate.
- [x] Salvaschermo spento di base nel server di sviluppo e in `tools/e2e/th.mjs` (copriva le prove ferme nel menu).
- Verifiche: gioco 1815/1815, sito 282/282; nel browser l'elenco nella voce della traccia.
- Non verificato: mascotte 3D sul PC dello stand (GPU vera), ledwall.

## B62 · Salvaschermo e analisi delle ridondanze, versione 2026-11-17.3 (17/11/2026)

- [x] Richiesta dell'utente: «dopo un periodo di inattività sul ledwall vorrei mettere un finto gameplay in loop.
  Inattività di almeno 1 minuto che si sblocca come screensaver». Documento `docs/b62/salvaschermo.md`.
- File: `natpf_screensaver.js` (nuovo), `natpf_ui.js`, `natpf_kiosk.js`, `index.html` (voce «Salvaschermo» del pannello),
  `natpf-ui.css`; prove `test/natpf-b62-salvaschermo.test.mjs` (8), `tools/e2e/natpf-salvaschermo.mjs` (21); prove dello
  stesso schermo b20 e b25 con il pannello a diciannove voci; versione 2026-11-17.3.
- [x] Analisi delle ridondanze (richiesta dell'utente: fascia ripetuta): `docs/analisi/ridondanze-2026-11-17.md`; nessun
  cambiamento, proposte da approvare.
- Verifiche: gioco 1808/1808, sito 282/282; nel browser salvaschermo 21/21, stand-layout 8/8 (1024×600 e 1920×540, rapide),
  solo-mouse 42/42, pannello-partita 25/25, stesso-schermo-b25 57/57, stesso-schermo-b20 52/52; LAN 13/13, desktop 56/56, build.
- Non verificato: ledwall e programma Windows vero (qui il disegno è senza GPU), telefoni veri appoggiati sul tavolo.

## B61 · Collaudo dello stand del 17/11, versione 2026-11-17.2 (17/11/2026)

- [x] Segnalazioni dell'utente (foto del ledwall, stesso schermo, Lob & Drop): due Lob a fine partita, mascotte ferme,
  dritto e rovescio invertiti a volte, anello a terra non per tutti e due, TORINO capovolto. Documento `docs/b61/collaudo-17-11.md`.
- File: `natpf_mascotte.js` (personaggio dalla card, sempre animate, `mascotMove`), `natpf_end_card.js` (`data-move`),
  `hud_ui.js`, `natpf-hud.css` (giri della figura), `natpf_split.js` + `natpf_arena.js` (`viewFrom`), `natpf_shot_feedback.js`
  (`onSplitFeedback`, `_ring`, `_flash` con l'attore) + `natpf_ui.js`, registro `pl` (`registro_registratore.js`,
  `registro_formato.js`, `cloudflare/registro-worker.js`, `scripts/registro/riassunto.mjs`); versione 2026-11-17.2.
- Misura delle 20 animazioni (cambio dei pixel tra fotogrammi): metà sotto il 2%, spostamento 1–4 px su 320; salti 56–61 px.
- Verifiche: gioco 1800/1800 (nuovi: `natpf-stand-17-11` 4, `natpf-b58-mascotte` +2, registro +1, riassunto +1), sito
  282/282, LAN 13/13, desktop 56/56, build (22 file in `dist/media/mascotte`); nel browser `natpf-fine-partita` 68/68,
  `natpf-stesso-schermo-b25` 57/57 (schermata con TORINO dritto nelle due metà e l'anello del Player 2).
- Pacchetti (`d8183f1`): installer 131.379.955 B, sha256 `f3788fa9…ca2d` (= `latest.json`); zip 23.955.734 B, sha256
  `a0fc630f…f89a`, provato estratto. Prova `natpf-fine-partita` con `FRAMES=cartella` per i fotogrammi dell'anteprima.
- Non verificato: ledwall, Windows vero con «riduci movimento», telefoni veri; dritto e rovescio non riprodotto.

## Versione 2026-11-17.1 (17/11/2026): B59, B60 e correzioni

- B59 conto «Allenati un po'!» (`docs/b59/conto-allenati.md`); B60 km/h dei colpi nel registro (`docs/b60/kmh-dei-colpi.md`).
- Correzioni: `natpf_rematch.rematchAutoLine` («tra 11 s»); `phone-touch-lock` + `racchetta.js` (blocco sopra
  «Riattiva i sensori» e il velo); `natpf_new_player.afterPhoneReset` («Nuovo giocatore» con i gesti).
- Prove nel browser: scambi-di-prova 32/32, flusso-tocchi 5/5, fiera-telefoni 66/66, nuovo-giocatore 32/32 (Giocando) e
  29/29 (gesti), rally 10/10, phone-keep 13/13, mano-sicura 17/17, servizio-lancio 17/17, servizio-scelta 18/18,
  solo-mouse 42/42, stesso-schermo-b25 55/55, pannello-partita 25/25, telefono-bloccato 12/12, nome-telefono 23/23,
  fine-partita 66/66, fogli del servizio 4/4.

## B60 · km/h dei colpi nel registro e correzione della rivincita (17/11/2026)

- [x] `registro_registratore.js` (`_kmhColpo`, aggancio a `natpf_match_stats.shot`), `scripts/registro/riassunto.mjs`
  (sezione «Velocità dei colpi», `_kmhMax`), `docs/b60/kmh-dei-colpi.md`.
- [x] `natpf_rematch.rematchAutoLine`: margine di 1e-6 s nell'arrotondamento (10000,000000002 ms diceva «tra 11 s»).
- [x] Prove: gioco 1791/1791 (registro +1, riassunto +1, rivincita +3 controlli), sito 280/280.

## B59 · conto alla rovescia «Allenati un po'!» prima degli scambi di prova (17/11/2026)

- [x] `natpf_prematch.js` (`TRIAL_COUNT`, `prematchTexts`, `beginTrial`, `cancelTrial`; a zero «Allenati un po'!»
  `style-start` e `cue('go')`), `natpf_trial.js` (fase `count`, scritta nascosta durante il conto), `natpf_trial_learn.js`
  (`TRIAL.afterCount` 1,2 s), `site/js/tennis/phone-screen.js` (`countFlash` con `trial`).
- [x] Prove: `natpf-b59-conto-prova` 5/5; aggiornati i tempi di `natpf-b43-pannello-partita`, `natpf-b47-conto`,
  `natpf-giocando-revisione` (4), `natpf-scambi-di-prova` (3) con `COUNT_MS`/`COUNT_EXTRA_S`; `phone-screen` +3 controlli.
  Gioco 1789/1789, sito 280/280, build.
- Non provato: telefoni veri, ledwall. Prove nel browser in corso.

## B58 · mascotte senza velo, versione 2026-11-16.11 (17/11/2026)

- [x] `docs/b58/fondo-trasparente.py`: alfa sotto 20/255 a zero sul fondo e sul bordo (4 GIF di Lob con il fondo a
  248–249 lasciavano un velo sul 60 % dell'immagine, visibile come riquadro sulla card). Rifatte le 20 dalle GIF del commit
  `9d48127`: velo 0 % in tutti i fotogrammi, figura identica (0,00 % di pixel cambiati con alfa sopra 128), 136–181 KB.
- [x] Prove: gioco 1784/1784, sito 280/280, LAN 13/13, desktop 56/56, build, `natpf-fine-partita` 66/66.

## B58 · mascotte nella card, versione 2026-11-16.10 (16/11/2026)

- Richiesta dell'utente dopo la 16.9: «devono essere l'immagine del personaggio a sinistra, non sopra la schermata della
  vittoria; dentro la card». La 16.9 era già su R2 quando è arrivata (workflow finito alle 23:10, annullo rifiutato).
- [x] `natpf_mascotte.js` (`mascotPlan`, `withMascots`, `takeFor`, `mountMascots`), `natpf_end_card.js` (`cardHtml`:
  `img.card-mascot` nella finestra del personaggio), `hud_ui.js`, `natpf_ritratti.js` (niente 3D sulle card con la
  mascotte), `natpf-hud.css`; tolto `#victory-mascot` da `index.html`.
- [x] Prove: `natpf-b58-mascotte` 13/13, `natpf-fine-partita` 66/66 (mascotte nella finestra a sette misure, due nello
  stesso schermo).

## B58 · Lob e Drop a fine partita (solo fiera), versione 2026-11-16.9 (16/11/2026)

- [x] Materiale: 20 GIF dell'utente (320×320, 10 fotogrammi, fondo bianco) → WebP animati con il fondo trasparente,
  150–210 KB, 3,6 MB in tutto (`docs/b58/fondo-trasparente.py`); controllo a occhio dei 200 fotogrammi su fondo blu
  (`lob-win-01` 6–8: due o tre punti chiari vicino alla visiera).
- [x] Codice: `src/natpf/natpf_mascotte.js` (nuovo), `src/hud_ui.js`, `src/natpf/natpf_ui.js`, `index.html`
  (`#victory-mascot`), `natpf-hud.css`, `scripts/pacchetto-cloudflare.mjs` (`FIERA_ONLY`).
- [x] Prove: `natpf-b58-mascotte` 11/11, `pacchetto-cloudflare-zip` +1, gioco 1783/1783, sito 280/280, build,
  `tools/e2e/natpf-fine-partita.mjs` 66/66 (+10). Zip Cloudflare con le mascotte 28,32 MB (rifiutato), senza 23,95 MB.
- Non provato: programma Windows vero, ledwall, «riduci movimento» in un browser vero.

## B56 + B57 · anticipo dei colpi (fiera) e chi vince sopra a fine partita, versione 2026-11-16.8 (16/11/2026)

- [x] B56: `natpf_phone_racket.js` (`ANTICIPATION_S` 0,1 s, `anticipationFor`: solo in modalità fiera), prova
  `natpf-b56-anticipo` 2/2, analisi in `docs/b36/misure-torino.md` §5.
- [x] B57: `natpf_end_card.js` (`splitOrder`), `natpf-hud.css`, prove `natpf-b40-card` (+1) e `tools/e2e/natpf-fine-partita.mjs`
  56/56, documento `docs/b57/`.
- Verifiche: vedi la voce della traccia (suite complete prima del commit della versione).


## B66 · Registro dello stand: sensori, calibrazione, prestazioni, precisione dei gesti, rete e blocco del telefono · [x] · 18/11/2026

- [x] Telefono: `site/js/tennis/phone-stats.js` (nuovo), `racchetta.js` (stato `st` con `sq`, `lc`, `ap`; `dev` con `av`;
  colpo con `gw`), `swing-message.js` (`mg`, `gw`), `swing-detect.js` (`margin`, solo misura), `link.js` (`app`).
- [x] App NATPF Racchetta **1.0.4** (codice 5): `PhoneStatus.java` (nuovo, solo numeri), `MainActivity.java`
  (`Bridge.stato()`, schermi spenti), test `PhoneStatusTest` (4).
- [x] Gioco: `registro/registro_misure.js` (nuovo), `registro_registratore.js`, `registro_formato.js` (formato 3,
  `CAMPI_B66`, `pause` fra le MAPPE), `natpf_phone_racket.js` (`onState`), Worker `cloudflare/registro-worker.js` (stessi
  campi, formato 3: **da ricaricare**), riassunto `scripts/registro/riassunto.mjs` (sei sezioni), `finto.mjs`.
- [x] Prove: gioco 1826/1826 (+6), sito 289/289 (+7), desktop 56/56, LAN 13/13, build (2026-11-18.1 nel bundle); app con
  l'SDK 34 nel contenitore: test 9/9, lint come la 1.0.3, `controlla-classi.mjs` verde; nel browser `natpf-registro-sensori`
  (nuova) 23/23, `natpf-registro` 39/39, `natpf-phone-blackout` 11/11, `natpf-training-flow` 21/21, `natpf-fiera-telefoni`
  66/66, `natpf-fine-partita` 68/68, `natpf-telefono-bloccato` 12/12 e `natpf-nome-telefono` 23/23 (con `run-local.mjs`,
  porte fisse 8765/9000, e `NATPF_SITE_ROOT`). Gesti veri del 28/10: impronta del rilevatore identica a prima.
- [x] Peso: partita vera nel browser 4,79 → 5,72 kB in chiaro (25 righe, 15 colpi del telefono); registri finti 7,37 →
  8,53 kB a partita in chiaro, 1,23 → 1,52 kB compressi.
- Non provato: telefono vero, app 1.0.4 su un telefono vero, Wi-Fi vera, Worker vero (da ricaricare dall'utente).
- [x] Pacchetti 18.1: installer = `latest.json` (131.385.673 B, sha256 `2a79bc0f…8abbe`), zip `f24a6212…58d4b`
  (23.969.237 B) provato estratto, APK 1.0.4 `cdcacbd0…68a5` (682.229 B) pubblicato e firmato con la chiave dello stand.

## B67 + B69 · Mascotte 3D approvate e accese di base, balletti di vittoria, versione 2026-11-18.2 (18/11/2026)

- [x] B67 (ramo `b67-mascotte-pose`, commit `9ef4774`, `8b069ec`, `4cd6375`): racchetta nel pugno, «Sei-sette», «Aura»,
  sconfitta triste con la faccia disegnata (`docs/b67/pose-mascotte.md`). Approvato dall'utente il 18/11.
- [x] B69 (ramo `b69-mascotte-balletti`, `docs/b69/balletti-mascotte.md`): `natpf_card_balli.js` (nuovo: robot a scatti,
  disco con il dab, corsa all'indietro, passi incrociati, braccia a pendolo, su il soffitto; sconfitte «Calcia un
  sassolino» e «Capriccio»; `beats`, `mixPose`), `natpf_card_moves.js` (15 movimenti, acceso di base, `cardUses3d`,
  `cardsUse3d`, `pickCardMoves`, posto di partenza in `natpfCardPose.base`, giro verso il lato libero per i mancini),
  `natpf_mascot_rig.js` (`legs`, racchetta `rest` con `frame: 'ground'`, `fist`), `natpf_ritratti.js`, `hud_ui.js`
  (mascotte 3D solo con Lob e Drop in campo; GIF del B58 per i Classici). B68 «Batte per primo» più breve nella stessa
  versione.
- [x] Prove: gioco 1843/1843 (+15), sito 289/289, LAN 13/13, desktop 56/56, build; test nuovo
  `natpf-b69-balletti` (7): manico-pugno 0,00 mm su 576 fotogrammi dei balletti (1.152 con quelli del B67), braccia al più
  1,88 volte, racchetta mai in testa, busto o gambe, piedi mai sotto il campo, giro chiuso, 15 movimenti su 400 partite
  senza ripetere. Nel browser: `natpf-fine-partita-ritratti` 28/28 (+3: mascotte accese con le GIF accese, Classici con le
  GIF), `natpf-mascotte-3d-anteprima` 27/27, `natpf-fine-partita` 68/68, `natpf-classifica-fine` 11/11,
  `natpf-stesso-schermo-b20` 52/52, `natpf-fiera-telefoni` 66/66, `natpf-lob-drop` 136/137 (il controllo dei piedi in corsa 3,08 % contro 3 %, uguale a prima: non del B69).
- [x] Misure (SwiftShader): cattura di due personaggi da 24 fotogrammi 2,6–3,1 s (20 giri), card a 1920×1080 4,1–4,6 s,
  area 640×360 2,5–2,8 s (fotogrammi 256×320 anche lì); 0 programmi shader nuovi; fogli 15,0 MB (2 × 24 × 256 × 320 × 4)
  come il B63; Android e meno di 4 GB: 12 fotogrammi (7,9 MB).
- Non provato: PC dello stand, Windows vero, ledwall vero, GPU vera.
- [x] Pacchetti 18.2: installer = `latest.json` (131.398.459 B, sha256 `93251e5c…26c3`, dal link fisso e dal file della
  versione, contenuto controllato con 7zz: gioco 18.2, `index-DM15r9DB.js` come la build locale), zip `2b876777…3475`
  (23.979.096 B) provato estratto (5 verifiche, l'unico KO il CORS del Worker TURN vero da 127.0.0.1). Workflow verdi.

## Pulizia sicura del repository (18/11/2026) · [x] · nessuna versione nuova

Richiesta dell'utente («Pulizia sicura», 18/11) sull'analisi in sola lettura del coordinatore (§2.2 S1–S6, §2.3 C3, §3.4).
Prodotto: entrambi (solo repository). Vecchio sito, immagini dei blocchi, rami, `main` e storia **non toccati**.
- [x] Tolti con `git rm` (restano nella storia): `undefined/` (2 file, 0,71 MiB), `docs/b9/wip/` (5 patch, 3,74 MiB),
  `docs/b17/wip/` (2 file, 1,07 MiB), `docs/consegna/2026-11-15/` (96 file su 103: bundle `rami-b40-b48`, sonde, appunti,
  revisioni; ~1,0 MiB), `docs/SESSION_HANDOFF.md` (rimando). Prima di ognuno `git grep` del percorso: nessun uso da codice,
  test, workflow o script dei pacchetti.
- [x] `git mv` in `docs/archivio/`: `GAMEPLAY_PROPOSAL.md`, `PRIORITY_AUDIT.md`, `NATPF_REFACTOR_AUDIT_2026-10-15.md`,
  `NATPF_GESTURE_CONTACT_2026-10-16.md`, `NATPF_ARCADE_LAN_2026-10-16.md`; `MEMORY.md`, `SESSION_HANDOFF.md`, `WORKLOG.md`
  dalla radice; `PASSAGGIO_2026-11-15.md` e `strumenti/rilascio/` del passaggio del 15/11 in
  `docs/archivio/consegna-2026-11-15/` (la traccia diceva che §4.6–§4.8, §5 e §7 valevano ancora: conservati).
- [x] Accorciati senza perdere niente: `docs/TRACCIA_PASSI.md` 1.743 → 92 righe (copia integrale in
  `docs/archivio/TRACCIA_PASSI_fino_al_2026-11-18.md`); `docs/WORK_PROGRESS.md` 2.691 → 358 righe (B0–B52, righe 21–2380,
  in `docs/archivio/WORK_PROGRESS_dal_2026-11-04_al_2026-11-15.md`); `docs/PIANO_LAVORI.md` 807 → 445 righe (§1 con il solo
  ultimo checkpoint; gli altri in `docs/archivio/PIANO_LAVORI_checkpoint_fino_al_2026-11-18.md`). Indice nuovo `docs/LEGGIMI.md`.
- [x] Rimandi: `CLAUDE.md` (archivio, indice, numeri dei test), `AGENTS.md` (TRACCIA, archivio, niente più zip LAN),
  `docs/PROJECT_MEMORY.md`, `docs/PASSAGGIO_CONSEGNE.md`, `docs/b51/telefono-bloccato.md`, link di `docs/NATPF_ROADMAP.md`.
  I due commenti di codice indicati come «MEMORY.md» (`natpf-tennis/src/natpf/webcam_motion.js`,
  `natpf-tennis/public/media/LEGGIMI.txt`) citano `docs/PROJECT_MEMORY.md`, che non si sposta: lasciati.
- Albero: 1.793 → 1.691 file, 83,90 → 77,36 MiB.
- Verifiche: gioco `npm test` 1844/1844 (~270 s), sito `node --test tools/test/*.test.mjs` 289/289, LAN 13/13, desktop
  56/56, `npm run build` ok; `git grep` dei percorsi tolti o spostati: nessun uso in codice, test, workflow o script.
  Nessun file di versione, pacchetti invariati (quelli della 2026-11-18.3). Nessun test leggeva i documenti spostati.

## 18/11/2026 · HW1: piano A e piano B del grip controller (solo documenti)
- File: `docs/hardware/grip-controller.md` (requisiti, valutazione piano A modulo a clip / piano B grip con vibrazione,
  componenti, costi indicativi, consiglio), `docs/TRACCIA_PASSI.md`, `docs/PIANO_LAVORI.md` §5.
- Mockup generati con Higgsfield (immagini consegnate all'utente, non nel repository).
- Non verificato: prezzi e specifiche dei componenti (da controllare sui datasheet e con i fornitori); nessun pezzo fisico.
  Nessun file di versione, pacchetti invariati (2026-11-18.3).
