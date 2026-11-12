# B27 · Postazione dello staff: telecomando e schermo del gioco (12/11/2026)

Richiesta dell'utente allo stand delle Nitto ATP Finals: il gioco gira nel programma Windows su un portatile collegato a
un ledwall 2×2 da 1024×1024 («Estendi», schermo 2); niente più OBS per portarlo sul ledwall, niente air mouse né
tastiere: **un telefono dello staff che fa da telecomando**, «installato una volta per tutte». «Assicurati che copra
tutti i casi.»

Codice: `site/js/tennis/remote-pairing.js` (abbinamento, puro), `site/js/tennis/remote-link.js` (collegamento lato
gioco), `site/tennis/telecomando.html` + `site/js/tennis/telecomando.js` (pagina del telefono, manifest, icone),
`natpf-tennis/src/natpf/natpf_remote_map.js` (schermata e comandi, puro), `natpf-tennis/src/natpf/natpf_remote.js`
(comandi nel gioco, foglio «Telecomando dello staff»), `natpf_kiosk.js` (voci del pannello dello stand),
`natpf-desktop/src/{desktop-core,main}.mjs` e `preload.cjs` (domanda del monitor all'avvio, `natpfDesktop.displays`).
Guida per lo staff: `docs/GUIDA_TELECOMANDO.md`.

## 1. Come funziona

- **Abbinamento**: Pannello dello stand → «Telecomando dello staff» → QR (pagina `/natpf/tennis/telecomando.html`,
  `#tc=telecomando-…&k=…`) e un codice di 8 caratteri da scrivere a mano. Il telefono riceve una chiave di ripresa; il
  gioco salva id della sessione e chiave in `localStorage` (`natpf-tennis.telecomando`; nel programma Windows il profilo
  è `%LOCALAPPDATA%\NATPF\programma` e resta tra riavvii e aggiornamenti), il telefono in `localStorage`
  (`natpf-telecomando`).
- **Ripresa da sola**: il gioco, se abbinato, si rimette in ascolto all'avvio sullo stesso indirizzo
  (`telecomando-` + 26 caratteri, fisso); il telefono riprova senza fine (1…5 s, subito quando lo schermo si riaccende,
  la pagina torna in primo piano o la rete torna). Ping ogni 2 s, perso dopo 8 s di silenzio.
- **Sicurezza**: QR e pagine separati da quelli della racchetta (prefisso `telecomando-` contro `racchetta-tel-`,
  chiave `tc` contro `s`); il gioco pretende `role:'remote'` e la racchetta lo rifiuta (`link.js`); codice del QR e codice
  scritto valgono una volta, 5 minuti, 5 tentativi sbagliati → codici nuovi; **un solo telecomando abbinato**: un
  abbinamento nuovo sostituisce il vecchio (che alla ripresa si sente dire «non più il telecomando»). Un secondo
  telefono senza il QR dello staff non entra.
- **Comandi**: navigazione (↑ ↓ ← → OK Indietro) e diretti (Gioca / Pronto, Torna al menu, Pausa / Riprendi, Nuovo
  giocatore, Salta, Ricalibra il telefono, Rivedi i gesti, Livello CPU, Schermo del gioco, Schermo intero, Pannello
  dell'addetto). Il telefono riceve lo stato appena cambia (il gioco controlla ogni 0,4 s): pagina, dettaglio (punteggio), telefono del giocatore
  (collegato, pronto, batteria dove il browser la dà) e per ogni pulsante «acceso» o il motivo per cui è spento.
  «Torna al menu» e «Nuovo giocatore» con una partita in corso chiedono conferma sul telefono.
- **In campo** frecce e OK non fanno niente (con la tastiera ↑ lancia la palla e ← → muovono il giocatore): il
  telecomando non tira colpi e non interferisce con la racchetta. Indietro apre la pausa.

### Decisioni

| Domanda | Decisione | Perché |
|---|---|---|
| Uno o due telecomandi? | **Uno**: l'ultimo abbinato vince. | Il QR è solo nel pannello dello staff: abbinarne un altro è un gesto voluto (telefono di riserva = si inquadra di nuovo il QR). Due chiavi valide raddoppiano il rischio di una chiave dimenticata su un telefono perso. |
| Il telecomando anche sul web (Cloudflare)? | **Sì, con la stessa segnalazione della racchetta** (PeerJS fuori dalla LAN, `/lan-signal` in LAN). Senza abbinamento il gioco non apre nessun collegamento. | Costa poco: stesso codice, la pagina è nel pacchetto (≈30 KB). Provato con il server LAN del programma; il percorso PeerJS solo nei test di unità con un Peer finto, **non** sul server PeerJS pubblico. Sul web «Schermo del gioco» e «Schermo intero» sono spenti (servono il programma o un tasto vero). |
| Frecce in partita | Spente, con il motivo; Indietro = Pausa. | Con la tastiera muovono il giocatore e ↑ lancia la palla. |
| Codice da scrivere | 8 caratteri, ascolto su `telecomando-codice-<codice>` solo con il foglio aperto. | iPhone: l'icona sulla schermata Home ha una memoria sua (non vede la chiave salvata in Safari) e da lì non si inquadra un QR. Serve anche se la fotocamera non legge il QR sul ledwall. |
| Domanda del monitor all'avvio | Con ≥2 monitor e nessuno scelto, o il salvato assente e nessun monitor con la sua misura. Senza risposta in 30 s vale la proposta e si salva. | Un solo monitor all'avvio: il ledwall può accendersi dopo (il gioco ci va da solo, come prima). Due monitor e il salvato assente: quasi sempre Windows ha dato un id nuovo allo stesso ledwall (altra porta): se un solo monitor non principale ha la misura salvata lo si usa senza chiedere. La risposta nel tempo: il programma può partire da solo senza nessuno davanti. |
| Monitor proposto («probabile ledwall») | Il quadrato (lati entro il 2%), altrimenti il più grande non principale. | Il ledwall è 1024×1024; lo schermo del portatile è il principale. |
| Pannello dello stand senza posto | «Telecomando dello staff» e «Schermo del gioco» nella riga in basso, non nella griglia. | La griglia resta di tre file: «Chiudi» in vista a 1024 × 600, 1366 × 657 e 1024 × 1024 (prova `natpf-menu`). |

## 2. Matrice di tutte le schermate

Per ogni schermata: come la chiama il telefono (in alto), come si va avanti e come si torna indietro o al menu senza
toccare il PC, cosa fanno frecce e OK. **Esito**: E = provato nel browser con `tools/e2e/natpf-telecomando.mjs` (gioco
vero sul server LAN del programma a 1024 × 1024, telefono in un secondo contesto); U = provato solo nei test di unità
(`natpf-tennis/test/natpf-telecomando.test.mjs`, fotografia del gioco → schermata e comandi); — = non provato.

| Schermata | Sul telefono | Avanti | Indietro / menu | Frecce e OK | Esito |
|---|---|---|---|---|---|
| Intro (marchi, trailer, «Premi un tasto») | Intro | OK (due volte: fine animazione, poi menu) o **Salta l'intro** | — (dopo l'intro c'è il menu) | ← → spente con il motivo; OK = tasto | E (Salta) · U |
| Menu principale | Menu principale | Gioca (→ racchetta, o Collega se il telefono è già collegato); OK sulla voce | — (già al menu) | come la tastiera (joypad) | E |
| Modalità | Scegli la modalità | «Contro la CPU»; OK sulla tessera | Indietro → menu | tastiera | E |
| Racchetta | Scegli la racchetta | Avanti → Collega | Indietro; Torna al menu | tastiera | E |
| Collega (telefono, webcam, mouse) | Collega il telefono / Accendi la webcam | Avanti quando il controller è pronto (spento con il motivo: «Il telefono del giocatore non è ancora collegato»); con il telefono pronto il gioco entra in campo da solo | Indietro; Torna al menu | tastiera | E (mouse) · U (telefono, webcam) |
| Pronto per la partita (pagina «Partita», «Altre impostazioni») | Pronto per la partita | **Gioca!**; OK su «Altre impostazioni» le apre | Indietro → Collega; Torna al menu | tastiera (tessere della CPU, seg) | E |
| Opzioni | Opzioni | OK sulle voci | Indietro → menu | tastiera | E |
| Calibrazione dello schermo (Opzioni → Schermo) | Calibrazione dello schermo | frecce, OK come la tastiera | Indietro = Annulla | tastiera (bordi, Invio salva) | E (Indietro) |
| Minigiochi | Minigiochi | OK sulla tessera | Indietro → menu | tastiera | E |
| Nome del giocatore («Il tuo nickname», «Come ti chiami?») | Nome del giocatore | **Salta il nome** (con «Nuovo giocatore») o OK su «Avanti» (il nome lo scrive chi gioca sulla tastiera) | Indietro = «Indietro/Salta» | fuoco tra campo, mano, pulsanti | E (Salta) |
| Classifica del giorno | Classifica del giorno | OK sulle schede | Indietro → menu | tastiera | E |
| Risultato del minigioco | Risultato del minigioco | **Gioca ancora** (= «Riprova»); OK su Nuovo giocatore, Classifica, Menu | Indietro → menu | tastiera | U |
| Stesso schermo: i due telefoni | Stesso schermo: i due telefoni | Avanti spento finché i due telefoni non sono pronti, poi conto alla rovescia del gioco | Indietro → Modalità (ferma il conto) | tastiera | E (pagina, Indietro) · U |
| Stesso schermo: tutorial nelle due metà | Stesso schermo: tutorial dei due giocatori | ← → sfogliano (come A/D e frecce); «ho capito» si tocca sui telefoni dei giocatori | Indietro (Esc ferma il conto) | tastiera | U |
| Sfida un amico (host: invito, Collega, Partita) | pagine del menu | come sopra | come sopra | tastiera | U |
| Player 2 dell'invito (scelta racchetta e visuale) | Player 2: racchetta e visuale | OK sui pulsanti | Torna al menu (lascia la stanza) | fuoco tra i pulsanti | U |
| Pannello dello stand | Pannello dello stand | OK sulle voci; «Pannello dell'addetto» apre e chiude | Indietro = Chiudi | fuoco tra i pulsanti | E |
| Telecomando dello staff (foglio con il QR) | Telecomando dello staff | OK su Scollega / Indietro | Indietro → pannello dello stand | fuoco | E |
| Finestra del certificato (pagina «Collega» in LAN) | Finestra di avviso | OK su «Chiudi» | Indietro la chiude | fuoco | E |
| Guida «Come si gioca» | Guida «Come si gioca» | → / OK (Avanti) | Indietro = Esc (chiude) | tastiera | E |
| Rivedi i gesti (modale del tutorial, dal menu o in campo nell'allenamento) | Rivedi i gesti | → sfoglia | Indietro chiude | tastiera | E |
| Tutorial prima della calibrazione (gioco singolo, in campo) | Tutorial dei gesti | ← → sfogliano; «Tutto chiaro» si tocca sul telefono del giocatore | Indietro = Esc (salta il tutorial, come lo staff da tastiera) | tastiera | U |
| Lezione dell'allenamento (presa, mano, posizione) | Lezione: presa e posizione | → / OK avanti, ← indietro; **Salta la lezione** | Pausa; Torna al menu | tastiera | U (con mouse e tastiera la lezione non c'è: E solo per gli esercizi) |
| Calibrazione del telefono in campo | Calibrazione del telefono | la fa il giocatore; **Salta la calibrazione** | Indietro = Pausa; Torna al menu (conferma) | spente (motivo) | U |
| Riscaldamento / Allenamento (lanciapalle) | Riscaldamento / Allenamento | **Salta il riscaldamento** | Indietro = Pausa; Torna al menu (conferma) | spente | E (allenamento) |
| Partita contro la CPU | Partita contro la CPU + punteggio | — | Indietro = Pausa; Torna al menu (conferma); Nuovo giocatore (conferma) | **spente: il giocatore non si muove** | E |
| Partita stesso schermo | Partita · stesso schermo | — | come sopra | spente | U |
| Sfida tra due computer in campo | Sfida tra due computer | — | come sopra | spente | U |
| Minigioco in corso | Minigioco: «nome» + punti | — | Indietro = Pausa; Torna al menu (conferma) | spente | E |
| Pausa | Pausa (Riprendi) | Riprendi (pulsante Pausa) | Indietro = Riprendi; Torna al menu (conferma) | fuoco tra i pulsanti della pausa | E |
| Partita ferma: telefono scollegato (riquadro con QR e «Ricollega») | Partita ferma: telefono scollegato | OK su «Ricollega il telefono» | Indietro = Pausa; Torna al menu | fuoco | U |
| Pannello del telefono (QR, passi della calibrazione) | Pannello del telefono | OK sui pulsanti (Conferma, Rifai i gesti…) | Indietro = «Torna al campo» | fuoco | E |
| Fine partita | Fine partita + punteggio | **Gioca ancora** | Indietro = Menu; Nuovo giocatore | fuoco | E |
| Diagnostica (Maiusc+D) | Diagnostica | OK sui pulsanti | Indietro la chiude | fuoco | E |
| Chiosco che azzera lo stand | (torna) Menu principale | — | — | — | E (il telecomando resta collegato) |
| «Nuovo giocatore» | (dove porta) | nome → tutorial → calibrazione → Pronto | — | — | E (dalla pagina «Pronto») |

Comandi sempre disponibili (tranne l'intro): Nuovo giocatore, Pannello dell'addetto, Torna al menu (tranne al menu).
Stato del telefono del giocatore: E (collegato, con la racchetta vera); batteria: solo nel codice (Chrome su Android la
dà, Safari su iPhone no) — non vista con un telefono vero.

### Casi non coperti o coperti a metà

- **Scrivere il nome**: il telecomando non ha una tastiera. Il nome lo scrive chi gioca sul PC, oppure si salta (gioca come
  «Ospite»). Scelta voluta: niente tastiera sul telefono dello staff (più comandi, più errori).
- **Cursori del volume** nella pausa e nelle Opzioni: le frecce spostano il fuoco, non cambiano il valore (la musica sì/no
  c'è come pulsante).
- **Schermo intero nel browser**: il browser lo concede solo a un tasto vero; dal telefono solo nel programma Windows.
- **Webcam** (pagina «Collega» con la webcam): «Avanti» si accende quando la webcam vede la mano; accendere la webcam è
  un pulsante raggiungibile con le frecce (non provato nel browser con il telecomando).
- Le righe U non sono state guidate dal telefono nel browser (stesso schermo in campo, sfida tra due computer, telefono
  scollegato in partita, tutorial della racchetta, calibrazione in campo): la fotografia del gioco è provata nei test, il
  comando finale è lo stesso tasto o pulsante già provato altrove.

## 3. Schermo del gioco (programma Windows)

- **Domanda all'avvio** (`startupDisplayQuestion`, `askDisplay` in `main.mjs`): finestra di Windows sullo schermo
  principale, prima del gioco: «Su quale schermo mostro il gioco?», un pulsante per monitor («Monitor 2 · 1024×1024 ·
  probabile ledwall», «Monitor 1 · 1920×1080 (principale) · scala 125%»), proposta preselezionata, 30 s per rispondere.
  Si salva `displayId` e la misura (`display`) in `desktop-app.json`.
- **«Schermo del gioco»** nel pannello dello stand (solo con `window.natpfDesktop.displays`, nel programma): mostra il
  monitor attuale, un clic → il successivo (salvato). Dal telefono: «Schermo del gioco».
- **1024×1024**: `windowedBounds` dentro il ledwall, `needsRefit`/`placeMode` provati con un ledwall esteso a destra di un
  portatile al 125% (test `desktop-core`); il gioco a 1024 × 1024 guardato in schermata (menu in colonna, pannello dello
  stand senza scorrere, foglio del telecomando, «Pronto per la partita», partita, pausa, nome, fine partita, gesti).

## 4. Prove (12/11/2026)

- Unità: gioco 1191/1191 (6 nuovi in `natpf-telecomando.test.mjs`), sito 213/213 (8 nuovi in
  `tools/test/remote-pairing.test.mjs`), LAN 12/12, programma Windows 32/32 (domanda del monitor, stato per la pagina,
  ledwall esteso, contratto del preload v3).
- Browser: `natpf-telecomando` 69/69 (server LAN del programma, 1024 × 1024), `natpf-menu` 38/38 (con 1024 × 1024),
  `natpf-training-flow` 22/22, `natpf-tutorial-phone` 52/52.
- Programma su Linux (`prova-linux`, Xvfb): 67/67 sui sei scenari (al primo giro 66/67: il controllo del contratto
  voleva ancora la versione 2 del ponte, aggiornato); nuovo scenario `domanda-monitor` (due monitor finti con `NATPF_PROVA_MONITOR`:
  domanda, proposta del 1024×1024, attesa scaduta, salvataggio con la misura, nessuna domanda al riavvio) e controlli
  nuovi in `gioco` (un solo monitor: niente domanda, `displays.list/next/choose`, voce del pannello).
- **Due monitor veri in Xvfb: impossibile qui** (provati `+xinerama` con due schermi e i monitor RandR 1.5 creati a mano:
  Electron vede sempre un monitor). Il cambio di monitor vero, la finestra della domanda vista a occhio e il ledwall
  si provano solo su Windows (`docs/COLLAUDO_WINDOWS.md`).
- **Non provato**: telefoni veri (Android, iPhone), «Aggiungi a schermata Home» e l'icona, il certificato sul telefono
  dello staff, Windows vero, ledwall vero, Wi-Fi che cade davvero, schermo del telefono spento davvero (simulati con
  ricarica della pagina, riavvio del server e del gioco).
