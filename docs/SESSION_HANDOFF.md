# SESSION_HANDOFF · ultimo stato verificato

Aggiornato: 28/10/2026 · branch `natpf-simulator`.

## Stato finale (28/10/2026, sera) — leggere per primo

Branch `natpf-simulator`; ultimo commit pubblicato su GitHub `2533180` (pacchetto LAN 2026-10-28.2). Dopo, solo in
locale finché l'utente non autorizza il push: **revisione voce e tutorial** (vedere `git log -1`).

Cosa c'è nel gioco adesso:
- Intro: video dell'arena (Higgsfield Cinema Studio, senza scritte né marchi), titolo «NATPF Simulator» in HTML,
  partner in una riga piccola in basso. Menu con «NATPF Simulator» come titolo principale, partner in secondo piano.
- Tutorial: lezione con **foto reali** (presa di lato con «Così no», presa vista dallo schermo, posizione di partenza);
  gli esercizi mostrano i gesti con l'**animazione 3D** verificata con il rilevatore (`natpf_gesture_demo.js`).
  Le clip video generate dei colpi sono state **tolte** su richiesta dell'utente (la persona sembrava tenere un
  telecomando, pose non coerenti con il tennis e con i testi). Non riproporle senza una richiesta esplicita.
- Voce: **solo inglese**, una sola voce cartoon (preset Higgsfield «Pixie», ElevenLabs v4) per arbitro, annunci dei
  minigiochi e versi del giocatore; 47 clip in `public/voce/`, trascritte con Vosk inglese. Le clip italiane maschili
  sono state tolte. Senza clip: sintesi inglese del browser. I testi dell'interfaccia restano in italiano.
- Pacchetto LAN 2026-10-28.2 (sotto) **non** contiene ancora questa revisione: il prossimo pacchetto sarà 2026-10-28.3.

Verifiche dell'ultima revisione: gioco 421/421, sito 152/152, build riuscita; nel browser 47 clip caricate, annunci
in inglese («Thirty fifteen», «Deuce»), esercizi con l'animazione 3D, nessun errore in console.
Non verificato: ascolto umano della nuova voce (timbro «cartoon» giudicato solo da descrizione e altezza 220–350 Hz),
telefono reale, Windows.

Crediti Higgsfield: 125,5 per foto/clip/intro + 10,81 per le 47 voci inglesi = 136,3 (saldo 728,12). Le spese
«Voice Element» (2 × 40) ed «Eleven v4» (≈ 48) tra le 15:10 e le 15:30 non sono di questa sessione: probabilmente le voci
personalizzate dell'account («flavio», «ANDRE-1», «Roger»); da confermare con l'utente.

## Prossima azione esatta

1. Se l'utente autorizza: `git push -u origin natpf-simulator`.
2. Far ascoltare la nuova voce e guardare la lezione (menu → Allenamento, Opzioni → volume voce fa sentire «Perfect!»).
   Per cambiare voce: rigenerare le 47 frasi (testi e nomi in `src/natpf/natpf_voice.js`, procedura in
   `docs/PROJECT_MEMORY.md` §Decisioni, voce) — costo ≈ 11 crediti.
3. Nuovo pacchetto LAN 2026-10-28.3 con questa revisione (procedura in `docs/WORK_PROGRESS.md`, «Pacchetto LAN
   2026-10-28.2»: versione in `site/js/tennis/version.js` e `site/tennis/build.json`, `npm run build`,
   `node natpf-tennis/lan/pacchetto.mjs --out=… --node=node-v22.22.0-win-x64.zip`, zip, prova sullo zip estratto).
4. Prova fisica con S24 Ultra e PC Windows (sotto, consegna 2026-10-28.1).

## Pacchetto LAN 2026-10-28.2 (sessione Claude, 28/10, pomeriggio)

`natpf-simulator-lan-windows-20261028-2.zip` · 61.518.360 byte · 290 file. SHA256:
`8d2e5f9d386577259a5175be4bfe85217008724828f471b3ba412e1316a08928`. Codice: commit `2533180`.
Contiene la consegna LAN 2026-10-28.1 + redesign, foto, clip dei colpi (poi tolte nel codice), intro video, voci
italiane (poi sostituite). Node.js 22.22.0 win-x64 verificato con SHASUMS256; nessun certificato né chiave privata.
Correzione: `.mp4` servito come `video/mp4` (prima octet-stream con `nosniff`).
Prova sullo zip estratto (Linux): certificato, HTTPS con la CA del pacchetto, gioco, intro video, pagina del telefono,
versione, MediaPipe offline, nessun errore. Non provato su Windows.

Due linee di lavoro unite con un merge il 28/10 (nessuna riscrittura di storia): consegna LAN 2026-10-28.1 della
sessione di sergio4 (`e4af4ce`, `2401fc9`, `641fa02`, sotto invariata) e redesign della sessione Claude (`636a5e2`…).

## Consegna LAN 2026-10-28.1 (sessione di sergio4)

Versione LAN Windows **2026-10-28.1**, codice **2401fc9481dbe2ced0c19990c36a4b950b709f0f**.
Questo commit aggiorna soltanto i documenti di consegna. Il checkpoint precedente è e4af4ce.

Correzioni: riconnessione del telefono isolata dagli eventi vecchi; webcam Hands/Pose in worker con lifecycle e modello leggero; riconoscimento della palla corta morbida e filtro preparazione; risposte raggiunte in tempo alle palle corte CPU a Leggenda senza errore obbligato. Dettagli in `WORK_PROGRESS.md` e `PROJECT_MEMORY.md`.

- 400/400 test gioco (`cd natpf-tennis && npm test`), 152/152 root (`node --test tools/test/*.test.mjs`).
- Build di produzione riuscita, worker incluso, 21 asset MediaPipe offline.
- Quattro regressioni telefono e quattro regressioni palla corta/Leggenda falliscono sulla base 59ce56c e passano dopo le correzioni.
- ZIP estratto verificato: HTTPS con CA attendibile, 76 file build confrontati SHA256, pagina telefono e versione, stanza/snapshot/colpo P2, segnalazione WSS, certificato pubblico e chiave privata non esposta.

### Pacchetto consegnato

`natpf-simulator-lan-windows-20261028-1.zip` · 60.343.718 byte · 219 file.
SHA256: `0787d151aa5fa974b0daef76b7aef3292c0228a43d4e8201425e520a7121c1e2`.
[Download salvato](https://chatgpt.com/library?file_id=libfile_be85b026256c81919cddad1a9ef17bc7&account_id=personal).
Node.js 22.22.0 Windows x64 incluso, identico al pacchetto precedente. Nessun certificato o chiave privata incluso.

### Prova fisica della 2026-10-28.1 (vale anche per i pacchetti successivi)

Prova fisica sul PC Lenovo E14 e S24 Ultra: chiudere vecchio server, estrarre ZIP in cartella nuova, aprire `AVVIA NATPF LAN.cmd`, seguire configurazione del certificato e nuovo QR. Controllare versione 2026-10-28.1.
1. Chiudere e riaprire più volte il browser del telefono; attendere Pronto senza loop.
2. Attivare webcam e provare anche spegnimento/riaccensione rapidi; valutare fluidità e continuità del polso.
3. Gesti morbidi dall'alto in basso, alternati a dritti normali; verificare palle corte senza falsi positivi.
4. A Leggenda rispondere alle palle corte CPU con vari colpi, in tempo e fuori tempo.
In caso di problema, raccogliere registro diagnostico e ripartire da questo commit. Non ricreare main, non sovrascrivere il lavoro di Claude. Redesign T1–T6 conservato in `WORK_PROGRESS.md`, non svolto in questa richiesta.

### Limiti dichiarati

Telefono e webcam reali non provati. Chromium Playwright non scaricabile in questo ambiente (archivio vuoto/troncato): nessun test browser completato. L'ambiente di Claude che aveva Chromium funzionante era diverso. I test webcam sono simulazioni e prove del protocollo/lifecycle worker, non misure delle prestazioni hardware.
La copia temporanea iniziale è stata rimossa da manutenzione automatica; le correzioni sono state ricostruite e ora sono pubblicate su GitHub. Per la continuità usare il repository e questi documenti.
