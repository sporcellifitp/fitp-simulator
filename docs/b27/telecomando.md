# B27 · Postazione dello staff: telecomando e schermo del gioco (12/11/2026)

Richiesta dell'utente allo stand delle Nitto ATP Finals: il gioco gira nel programma Windows su un portatile collegato a
un ledwall 2×2 da 1024×1024 («Estendi», schermo 2); niente più OBS per portarlo sul ledwall, niente air mouse né
tastiere: **un telefono dello staff che fa da telecomando**, «installato una volta per tutte». «Assicurati che copra
tutti i casi.»

Codice: `site/js/tennis/remote-pairing.js` (regole dell'abbinamento e della ripresa, puro), `remote-link.js`
(collegamento lato gioco), `remote-client.js` (lato telefono, senza DOM), `site/tennis/telecomando.html` +
`site/js/tennis/telecomando.js` (pagina del telefono, manifest, icone), `natpf-tennis/src/natpf/natpf_remote_map.js`
(schermata e comandi, puro), `natpf-tennis/src/natpf/natpf_remote.js` (comandi nel gioco, foglio «Telecomando dello
staff»), `natpf_kiosk.js` (voci del pannello dello stand), `natpf-desktop/src/{desktop-core,main}.mjs` e `preload.cjs`
(domanda del monitor all'avvio, `natpfDesktop.displays`). Guida per lo staff: `docs/GUIDA_TELECOMANDO.md`.

**Revisione indipendente del 12/11** (§5): il foglio del telecomando è sul ledwall, quindi lo vede il pubblico; un
visitatore con un telefono non deve mai poter diventare il telecomando. L'abbinamento e la ripresa descritti qui sotto
sono quelli dopo la revisione.

## 1. Come funziona

- **Abbinamento, sempre confermato sul computer**: Pannello dello stand → «Telecomando dello staff». Il foglio mostra
  un QR (pagina `/natpf/tennis/telecomando.html`, `#tc=telecomando-abbina-…&k=…`) e un codice di 8 caratteri da
  scrivere a mano. Chi li presenta **non** diventa il telecomando: il foglio passa a «Un telefono chiede di diventare
  il telecomando · numero NNN», lo stesso numero di tre cifre compare sul telefono, e serve **«Conferma» sul computer**
  con un clic o un tasto veri (`event.isTrusted`; il telecomando in carica non raggiunge quel pulsante con le frecce e
  il suo OK è rifiutato). Fino alla conferma quel telefono non manda comandi e il telecomando di prima resta in carica.
  «Rifiuta» lo lascia fuori. Dopo la conferma il foglio dice «Telecomando abbinato ✓» e non mostra più né QR né
  codice; «Abbina un altro telefono» apre un abbinamento nuovo.
- **QR e codice solo a foglio aperto**: portano a indirizzi che esistono solo allora (`telecomando-abbina-…`,
  `telecomando-codice-…`), valgono una volta e per 5 minuti dall'apertura (la finestra non si riallunga: scaduta, serve
  «Nuovo QR»); chiuso il foglio non valgono più da subito, anche se fotografati. Un tentativo per collegamento; 5
  tentativi sbagliati → QR e codice nuovi, 15 → abbinamento chiuso.
- **Indirizzo fisso e chiave**: nascono alla conferma, viaggiano una volta sola nel canale cifrato verso il telefono
  confermato e restano salvati nel gioco (`localStorage`, `natpf-tennis.telecomando`; nel programma Windows il profilo
  è `%LOCALAPPDATA%\NATPF\programma` e resta tra riavvii e aggiornamenti) e sul telefono (`natpf-telecomando`).
  L'indirizzo fisso (`telecomando-` + 26 caratteri) non compare mai in un QR. Indirizzo e chiave **cambiano a ogni
  abbinamento confermato e con «Scollega»**: il telefono di prima non trova più nessuno.
- **Ripresa da sola, senza mandare la chiave**: il gioco, se abbinato, si rimette in ascolto all'avvio sull'indirizzo
  fisso; il telefono riprova senza fine (1…5 s, subito quando lo schermo si riaccende, la pagina torna in primo piano o
  la rete torna). Prova reciproca con HMAC-SHA-256 (`crypto.subtle`): il telefono manda un numero casuale, il gioco
  risponde con HMAC(chiave, «game»|numero|indirizzo) e un suo numero, il telefono controlla e risponde con
  HMAC(chiave, «phone»|numero del gioco|indirizzo); solo allora i comandi sono accettati. A chi si mette
  sull'indirizzo al posto del gioco (il server di segnalazione lascia registrare un indirizzo libero) il telefono manda
  solo il numero casuale e non dimentica la chiave. Senza `crypto.subtle` (pagina non in https) niente ripresa: nessuna
  strada in chiaro. Ping ogni 2 s, perso dopo 8 s di silenzio.
- **Un solo telecomando**: un abbinamento confermato sostituisce il precedente (che riceve «scollegato» e dimentica la
  chiave). La stessa chiave aperta in due pagine: la pagina di prima si ferma («Telecomando aperto in un'altra pagina ·
  tocca per riprendere qui»), niente tira e molla.
- **Ruoli**: QR e pagine separati da quelli della racchetta (prefissi `telecomando-…` contro `racchetta-tel-`, chiave
  `tc` contro `s`); il gioco pretende `role:'remote'` e la racchetta lo rifiuta (`link.js`).
- **Cosa il telecomando non tocca**: i controlli che aprono una finestra di Windows che dal telefono non si chiude
  («Azzera oggi», «Scarica CSV», «Elimina» e «Scarica» della diagnostica), i link (`target=_blank`) e «Conferma»
  dell'abbinamento: le frecce li saltano e OK li rifiuta (`NO_REMOTE` in `natpf_remote.js`; un test controlla che ogni
  `confirm()` del gioco sia nell'elenco). «Scollega il telecomando» è in due passi nella pagina, senza `confirm()`.
- **Comandi**: navigazione (↑ ↓ ← → OK Indietro) e diretti (Gioca / Pronto, Torna al menu, Pausa / Riprendi, Nuovo
  giocatore, Salta, Ricalibra il telefono, Rivedi i gesti, Chi gioca / livello della CPU (dalla 2026-11-12.5 gira tra Bambino, Ragazzo, Adulto, Esperta, Leggenda), Schermo del gioco, Schermo intero, Pannello
  dell'addetto). Il telefono riceve lo stato appena cambia (il gioco controlla ogni 0,4 s): pagina, dettaglio (punteggio), telefono del giocatore
  (collegato, pronto, batteria dove il browser la dà) e per ogni pulsante «acceso» o il motivo per cui è spento.
  «Torna al menu» e «Nuovo giocatore» con una partita in corso chiedono conferma sul telefono.
- **In campo** frecce e OK non fanno niente (con la tastiera ↑ lancia la palla e ← → muovono il giocatore): il
  telecomando non tira colpi e non interferisce con la racchetta. Indietro apre la pausa. Nel tutorial dei gesti
  («Rivedi i gesti» compreso) e nella lezione valgono ← → OK e Indietro; ↑ e ↓ sono spente (arriverebbero al motore).
  La pausa aperta sopra «partita ferma: telefono scollegato» comanda lei.

### Decisioni

| Domanda | Decisione | Perché |
|---|---|---|
| Basta il QR per diventare il telecomando? | **No**: serve «Conferma» sul computer con lo stesso numero di tre cifre. | Il foglio è sul ledwall: il QR lo vede (e lo fotografa) chiunque. La conferma viene da chi ha in mano il PC. |
| La chiave viaggia alla ripresa? | **No**: prova reciproca HMAC, prima il gioco poi il telefono. | L'indirizzo fisso si può occupare al posto del gioco sul server di segnalazione: a chi non prova la chiave il telefono non manda niente. |
| Uno o due telecomandi? | **Uno**: l'ultimo abbinamento confermato vince. | Il QR è solo nel pannello dello staff: abbinarne un altro è un gesto voluto (telefono di riserva = si inquadra di nuovo il QR). Due chiavi valide raddoppiano il rischio di una chiave dimenticata su un telefono perso. |
| Il telecomando anche sul web (Cloudflare)? | **Sì, con la stessa segnalazione della racchetta** (PeerJS fuori dalla LAN, `/lan-signal` in LAN). Senza abbinamento il gioco non apre nessun collegamento. | Costa poco: stesso codice, la pagina è nel pacchetto (≈30 KB). Provato con il server LAN del programma; il percorso PeerJS solo nei test di unità con un Peer finto, **non** sul server PeerJS pubblico. Sul web «Schermo del gioco» e «Schermo intero» sono spenti (servono il programma o un tasto vero). |
| Frecce in partita | Spente, con il motivo; Indietro = Pausa. | Con la tastiera muovono il giocatore e ↑ lancia la palla. |
| Codice da scrivere | 8 caratteri, ascolto su `telecomando-codice-<codice>` solo con il foglio aperto. | iPhone: l'icona sulla schermata Home ha una memoria sua (non vede la chiave salvata in Safari) e da lì non si inquadra un QR. Serve anche se la fotocamera non legge il QR sul ledwall. |
| Domanda del monitor all'avvio | Con ≥2 monitor e nessuno scelto, o il salvato assente e nessun monitor con la sua misura. Senza risposta in 30 s (o con «Decidi tu», o Esc) vale la proposta: si salva solo se non era mai stato scelto niente; con un monitor salvato che adesso manca vale per quell'avvio soltanto (il ledwall salvato e ancora spento resta la scelta: acceso, il gioco ci va). Un clic su un monitor si salva sempre. | Un solo monitor all'avvio: il ledwall può accendersi dopo (il gioco ci va da solo, come prima). Due monitor e il salvato assente: quasi sempre Windows ha dato un id nuovo allo stesso ledwall (altra porta): se un solo monitor non principale ha la misura salvata lo si usa senza chiedere. La risposta nel tempo: il programma può partire da solo senza nessuno davanti. |
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
| Pannello dello stand | Pannello dello stand | OK sulle voci (non «Azzera oggi» e «Scarica CSV»: finestre di Windows, solo dal computer); «Pannello dell'addetto» apre e chiude | Indietro = Chiudi | fuoco tra i pulsanti (salta quei due) | E |
| Telecomando dello staff (foglio: QR, richiesta con il numero, «abbinato») | Telecomando dello staff | OK su Rifiuta / Abbina un altro telefono / Scollega (due passi) / Indietro; **«Conferma» no: solo dal computer** | Indietro → pannello dello stand (QR e codice non valgono più) | fuoco (salta «Conferma») | E |
| Finestra del certificato (pagina «Collega» in LAN) | Finestra di avviso | OK su «Chiudi» | Indietro la chiude | fuoco | E |
| Guida «Come si gioca» | Guida «Come si gioca» | → / OK (Avanti) | Indietro = Esc (chiude) | tastiera | E |
| Rivedi i gesti (modale del tutorial, dal menu o in campo nell'allenamento) | Rivedi i gesti | → sfoglia | Indietro chiude | ← → OK; ↑ ↓ spente | E |
| Tutorial prima della calibrazione (gioco singolo, in campo) | Tutorial dei gesti | ← → sfogliano; «Tutto chiaro» si tocca sul telefono del giocatore | Indietro = Esc (salta il tutorial, come lo staff da tastiera) | tastiera | U |
| Lezione dell'allenamento (presa, mano, posizione) | Lezione: presa e posizione | → / OK avanti, ← indietro; **Salta la lezione** | Pausa; Torna al menu | tastiera | U (con mouse e tastiera la lezione non c'è: E solo per gli esercizi) |
| Calibrazione del telefono in campo | Calibrazione del telefono | la fa il giocatore; **Salta la calibrazione** | Indietro = Pausa; Torna al menu (conferma) | spente (motivo) | U |
| Riscaldamento / Allenamento (lanciapalle) | Riscaldamento / Allenamento | **Salta il riscaldamento**; negli esercizi dell'allenamento (B28) **Avanti: esercizio dopo** (il pulsante «Avanti ›») | Indietro = Pausa; Torna al menu (conferma) | spente | E (allenamento) |
| Scambi di prova (B28, «Calibrazione: Giocando»: dopo «Gioca», prima della partita; anche nello stesso schermo, prima di un minigioco, nella sfida tra due computer e con «Ricalibra» in partita) | Scambi di prova | li gioca il giocatore; **Salta gli scambi di prova** (la partita parte subito con quello che il gioco ha imparato) | Indietro = Pausa; Torna al menu (conferma); «Ricalibra il telefono» spento (stanno già calibrando) | spente (motivo) | U (mondo di prova con il telecomando vero: pagina, frecce spente, Indietro = pausa, Salta, Ricalibra) |
| Partita contro la CPU | Partita contro la CPU + punteggio | — | Indietro = Pausa; Torna al menu (conferma); Nuovo giocatore (conferma) | **spente: il giocatore non si muove** | E |
| Partita stesso schermo | Partita · stesso schermo | — | come sopra | spente | U |
| Sfida tra due computer in campo | Sfida tra due computer | — | come sopra | spente | U |
| Minigioco in corso | Minigioco: «nome» + punti | — | Indietro = Pausa; Torna al menu (conferma) | spente | E |
| Pausa | Pausa (Riprendi) | Riprendi (pulsante Pausa) | Indietro = Riprendi; Torna al menu (conferma) | fuoco tra i pulsanti della pausa | E |
| Partita ferma: telefono scollegato (riquadro con QR e «Ricollega») | Partita ferma: telefono scollegato | OK su «Ricollega il telefono» | Indietro = Pausa (e la pausa aperta sopra comanda lei: Indietro la chiude); Torna al menu | fuoco | U |
| Pannello del telefono (QR, passi della calibrazione) | Pannello del telefono | OK sui pulsanti (Conferma, Rifai i gesti…) | Indietro = «Torna al campo» | fuoco | E |
| Fine partita | Fine partita + punteggio | **Gioca ancora** | Indietro = Menu; Nuovo giocatore (senza conferma: la partita è finita) | fuoco | E |
| Diagnostica (Maiusc+D) | Diagnostica | OK sui pulsanti (non «Elimina» e «Scarica») | Indietro la chiude | fuoco | E |
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
  probabile ledwall», «Monitor 1 · 1920×1080 (principale) · scala 125%») più «Decidi tu» (anche Esc), proposta
  preselezionata, 30 s per rispondere. Un clic su un monitor salva `displayId` e la misura (`display`) in
  `desktop-app.json`; senza risposta la proposta si salva solo se non c'era nessuna scelta, altrimenti vale per
  quell'avvio (`displayAnswer`).
- **«Schermo del gioco»** nel pannello dello stand (solo con `window.natpfDesktop.displays`, nel programma): mostra il
  monitor attuale, un clic → il successivo (salvato). Dal telefono: «Schermo del gioco».
- **1024×1024**: `windowedBounds` dentro il ledwall, `needsRefit`/`placeMode` provati con un ledwall esteso a destra di un
  portatile al 125% (test `desktop-core`); il gioco a 1024 × 1024 guardato in schermata (menu in colonna, pannello dello
  stand senza scorrere, foglio del telecomando, «Pronto per la partita», partita, pausa, nome, fine partita, gesti).

## 4. Prove (12/11/2026, dopo la revisione)

- Unità: gioco 1194/1194 (9 in `natpf-telecomando.test.mjs`), sito 223/223 (18 in `tools/test/remote-pairing.test.mjs`:
  il cancello, e gioco + telefono insieme su una rete finta), LAN 12/12, programma Windows 33/33.
- Browser: `natpf-telecomando` 80/80 (server LAN del programma, 1024 × 1024), `natpf-menu` 38/38 (con 1024 × 1024),
  `natpf-training-flow` 22/22, `natpf-tutorial-phone` 52/52.
- Programma su Linux (`prova-linux`, Xvfb): 69/69 sui sei scenari; `domanda-monitor` con due monitor finti
  (`NATPF_PROVA_MONITOR`): domanda, proposta del 1024×1024, attesa scaduta, salvataggio con la misura, nessuna domanda
  al riavvio, e con un ledwall salvato e spento la proposta solo per quell'avvio; controlli di `displays` e della voce
  del pannello in `gioco`.
- **Due monitor veri in Xvfb: impossibile qui** (provati `+xinerama` con due schermi e i monitor RandR 1.5 creati a mano:
  Electron vede sempre un monitor). Il cambio di monitor vero, la finestra della domanda vista a occhio e il ledwall
  si provano solo su Windows (`docs/COLLAUDO_WINDOWS.md` §5a).
- **Non provato**: telefoni veri (Android, iPhone), «Aggiungi a schermata Home» e l'icona, la scelta per l'iPhone
  (riconosciuto dal nome del browser), il certificato sul telefono dello staff, Windows vero, ledwall vero, Wi-Fi che
  cade davvero, schermo del telefono spento davvero (simulati con ricarica della pagina, riavvio del server e del
  gioco), il server PeerJS pubblico (web).

## 5. Revisione indipendente del 12/11: difetti e correzioni

Ogni difetto è stato riprodotto con gli script del revisore prima della correzione; i casi sono diventati test.

| # | Difetto | Correzione | Prova |
|---|---|---|---|
| 1 | Abbinamento dirottabile: il QR valeva a foglio chiuso (fotografato, usato 4 minuti dopo); dopo un abbinamento il foglio mostrava un QR nuovo valido (un secondo telefono scalzava lo staff); il codice valeva sull'indirizzo fisso a foglio chiuso | QR e codice solo a foglio aperto su indirizzi temporanei; conferma sul computer con il numero; dopo l'abbinamento niente QR; «Abbina un altro telefono» | `remote-pairing.test` A, B, E; e2e (QR e codice fotografati, secondo telefono, «Conferma» dal codice e dal telecomando rifiutata) |
| 2 | Tasti ignorati dopo la riapertura della pagina del telefono (il filtro delle copie ricordava i numeri di prima) | Filtro tolto (niente ritrasmette); il numero serve solo all'esito | `remote-pairing.test` D |
| 3 | `confirm()` raggiungibile dal telecomando: gioco fermo su una finestra di Windows | Controlli saltati (`NO_REMOTE`); «Scollega» in due passi nella pagina; «Azzera oggi» con mouse e tastiera invariato | `natpf-telecomando.test`; e2e (30 frecce nel pannello, OK su «Azzera» rifiutato, nessuna finestra) |
| 4 | Link `target=_blank` raggiungibili: OK apriva una finestra nel programma | Link saltati dal telecomando; tolto il link dal foglio del telecomando. `main.mjs` non toccato: il gioco usa `target=_blank` e `window.open` anche nel programma («Apri il link del controller», link dell'invito, finestra della webcam): negarli tutti cambierebbe quei percorsi | `natpf-telecomando.test` |
| 5 | Chiave di ripresa mandata a chiunque tenesse l'indirizzo fisso (pubblico nel QR) | Prova reciproca HMAC; indirizzo fisso mai nel QR e ruotato a ogni abbinamento e con «Scollega»; senza `crypto.subtle` niente ripresa | `remote-pairing.test` (chiave sbagliata, risposta riusata e riflessa, finto gioco, rotazione, senza https) |
| 6 | Domanda del monitor senza risposta sovrascriveva un ledwall salvato e spento | Proposta solo per quell'avvio (`displayAnswer`); un clic salva; «Decidi tu»/Esc = nessuna risposta | `desktop-core.test`; `prova-linux` |
| 7 | Due pagine del telecomando si scalzavano senza fine | «bye other» alla pagina sostituita, che si ferma e riprende con un tocco | `remote-pairing.test` |
| 8 | ↑ ↓ con «Rivedi i gesti» o la lezione in campo arrivavano al motore (↑ lancia la palla) | Spente lì | `natpf-telecomando.test`; e2e |
| 9 | Pausa aperta sopra «telefono scollegato»: le frecce comandavano il riquadro dietro | La pausa viene prima nell'ordine degli strati | `natpf-telecomando.test` |
| 10 | «5 tentativi» non era un limite (mille hello su un collegamento, finestra riallungata dai cambi di codice) | Un tentativo per collegamento; finestra fissata all'apertura; 15 sbagliati → chiuso | `remote-pairing.test` C |
| 11 | Errore di un comando diretto senza esito al telefono | `await` dentro il `try`: l'esito arriva con il motivo | `natpf-telecomando.test` |
| 12 | `buildIsStale` non guardava pagina, manifest e icone del telecomando | Aggiunti | `natpf-telecomando.test` |

Trovati rifacendo le prove: il collegamento del telefono in attesa della conferma cadeva quando l'abbinamento era
chiesto con il codice (l'indirizzo del codice si rifaceva subito); un QR inquadrato con la pagina del telecomando già
aperta cambiava solo la parte dopo il «#» e non faceva niente (ora `hashchange`); a fine partita Menu e Nuovo giocatore
chiedevano una conferma inutile; il monitor successivo con l'id come testo tornava sempre al primo.
