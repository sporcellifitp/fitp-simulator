# Passaggio di consegne · 15/11/2026, 13:15 UTC

> **SUPERATO IN PARTE (aggiornamento del 15/11/2026, 16:15 UTC).** Dopo questo passaggio sono uscite tre versioni
> (commit di `sporcellifitp`, senza firma di sessione): **2026-11-14.6** (`d77f21c`, B51 telefono bloccato),
> **2026-11-14.7** (`8018967`, in un solo commit: B48 + B48.1, B40, B49, B50) e **2026-11-14.8** (`3149115`, pannello
> dello stand compatto a 720×720 e tre prove di impaginazione in `tools/e2e/`). Il contenuto dei due rami del bundle è
> già in `natpf-simulator`: **non riunire `rami-b40-b48.bundle`**. Le §0, §1, §3 e §4.1–§4.5 sotto descrivono lo stato
> delle 13:15 e non valgono più; valgono ancora §4.6 (revisore finale), §4.7 (APK), §4.8 (cose da dire all'utente), §5
> (procedura) e §7 (regole). Lo stato attuale e cosa resta sono in `docs/TRACCIA_PASSI.md` (sezione in fondo) e nel
> Checkpoint di `docs/PIANO_LAVORI.md`.

Scritto dall'agente coordinatore (Claude Code) su richiesta dell'utente: «salva tutto il lavoro fatto fin'ora, devo
passarlo a un altro agente; nei minimi dettagli, soprattutto come farlo e cosa fare secondo te». Questo file è il punto
d'ingresso: dice **dove si è arrivati**, **cosa c'è di salvato e dove**, **come riprendere ogni blocco** e **cosa farei
io, in quale ordine e perché**. Le regole permanenti restano in `CLAUDE.md` (leggilo per primo).

---

## 0. In tre righe

1. **Pubblicato e verificato:** ramo `natpf-simulator`, versione **2026-11-14.5** (modalità fiera con il solo mouse). Il
   programma Windows si aggiorna dal link fisso dell'installer. Tutto è spinto su `origin/natpf-simulator`.
2. **Lavoro a metà, NON unito, salvato nel file `rami-b40-b48.bundle` di questa cartella:** B40 (fine partita v2: card,
   trofei, personaggi che esultano) quasi finito; B48 + B48.1 (servizio con scelte, servizio della CPU vario, Leggenda
   campione, correzioni della revisione) quasi finito.
3. **Prossimo lavoro, in cima alla lista per richiesta urgente dell'utente: B51 «Telefono bloccato»** (lo schermo del
   telefono ignora i tocchi durante scambi di prova e partita). Non è iniziato: il compito completo è al §4.1.

---

## 1. Stato del repository

- Repository GitHub: `sporcellifitp/fitp-simulator` (il remoto locale può ancora chiamarsi `sergio4/foro-italico-world`:
  è lo stesso, trasferito). Ramo di lavoro **unico**: `natpf-simulator`. Mai `main`, mai altri rami sul remoto, mai
  `--force`, mai riscrivere la storia.
- `origin/natpf-simulator` contiene tutto fino a questo passaggio (l'ultimo commit è quello che aggiunge questa cartella).
- Versione nei quattro file (`site/js/tennis/version.js`, `site/tennis/build.json`, riga 1 di
  `natpf-tennis/lan/LEGGIMI.txt`, `natpf-desktop/novita.txt`): **2026-11-14.5**.
- Suite sulla 14.5 (controllo rapido del rilascio): gioco **1660/1660**, sito **272/272**, desktop **51/51**, LAN
  **13/13**, build ok. Prove nel browser sulla 14.5: natpf-fiera-telefoni 54/54, natpf-pannello-cadute 33/33,
  natpf-stesso-schermo-b25 55/55, natpf-menu 45/45, natpf-fine-partita 47/47.
- Rami locali che esistevano solo nel contenitore di questa sessione (non spinti, perché la regola vieta altri rami sul
  remoto): `b40-fine-partita` e `b48-servizio` sono nel bundle; `b51-telefono-bloccato` era appena creato e vuoto (nessun
  commit): non serve.

### Come riavere i due rami dal bundle

```sh
cd <repository>                      # checkout di natpf-simulator aggiornato (git fetch origin natpf-simulator)
git bundle verify docs/consegna/2026-11-15/rami-b40-b48.bundle
git fetch docs/consegna/2026-11-15/rami-b40-b48.bundle \
  b40-fine-partita:b40-fine-partita b48-servizio:b48-servizio
git log --oneline natpf-simulator..b40-fine-partita   # 10 commit, testa dc64d2e
git log --oneline natpf-simulator..b48-servizio       # 18 commit, testa 450256e
```

Il bundle ha come prerequisiti `81b2887` e `e5d62ad`, che sono già in `natpf-simulator`. Consiglio: lavorare ogni ramo in
una worktree propria (`git worktree add ../wt-b40 b40-fine-partita`) e unire in `natpf-simulator` solo dal checkout
principale, dopo le prove.

---

## 2. Versioni pubblicate in questa serie (14/11–15/11)

Tutte con zip Cloudflare provato estratto (sotto 25.000.000 B, senza `natpf/registro.json`) e installer verificato dal
link fisso `https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev/windows/NATPF-Simulator-Setup.exe`.

| versione | cosa (come si attiva) | zip (B · sha256) | installer (B · sha256) |
|---|---|---|---|
| 2026-11-14.2 | Dritto e rovescio al sicuro (mano: due tocchi sul telefono, «Mancino» visibile, ogni visitatore nuovo destro); tastiera a schermo e «Gioca come Ospite»; icona animata del servizio; stand con il solo mouse (tasto destro, puntatore grande, calibrazione dello schermo con due clic) | 23.891.833 · `9d55a3f91ab457a3d6f9c669f3ce8a285286c0fdd6fff2062920a2c3936d46ad` | 128.094.408 · `f4d1b8e750b869faea95284cf4857a4810bb0c1e380a71bbfb2279d6383d5881` |
| 2026-11-14.3 | Il telefono non si scollega più per un buco della Wi-Fi (10 s di attesa, pausa e ripresa da sola, tentativi senza fine); il chiosco non scollega i telefoni; «Battuta: Sempre lo stesso · Alternata» (pannello, di base Sempre lo stesso); conto alla rovescia grande; livello dopo «Rivincita» | 23.908.079 · `941eb4d9bb3aa5e385dfb0de564e7589f636a8902553df161743a3f2bfb73764` | 128.127.554 · `411ea0192563bab87c133ffbafb4906db3598ffd2358f786e4fb3b98c3e70432` |
| 2026-11-14.4 | Motivi delle cadute dei telefoni (riga nel pannello dello stand «Telefono 1: N cadute oggi · motivo più frequente»), «Scollega» dello staff non è una caduta, pagina chiusa detta sul ledwall con il QR subito, 720×720 corretto | 23.909.825 · `d9efc5387edba64578e79213aaa9bd1efaab2b09a707142474cea23789332d63` | 128.102.449 · `df052b1cef8f09d7e090b1060338821d4ba48bd0d1283eaafb7bab97fe8db004` |
| 2026-11-14.5 | **Modalità fiera** (pannello dello stand → «Modalità fiera: Sì», foglio «Telefoni dello stand», pagina della fiera, «Prossimo giocatore ›», visitatori numerati), correzioni B41.3 | 23.920.328 · `fac39ddcc4a4472b94e8840e9c00c08dcd18dda5f56c0c88d46183c8d772ab7e` | 128.141.130 · `7154833e43744756f1dd548a5d875c5534459216ac0bab51caf6fce42c74b490` |

I passi esatti con il solo mouse per la modalità fiera sono in `docs/GUIDA_STAND.md` capitolo **8.4** (già mandati
all'utente in chat il 15/11). La guida dello stand intera vale per la 14.5.

---

## 3. Cosa è finito e cosa no (registro completo in `docs/TRACCIA_PASSI.md`)

| blocco | stato | dove |
|---|---|---|
| B45.1 + B45.2 telefono che si scollega (cadute, motivi, pannello) | **unito**, 14.3–14.4 | `docs/b45/` |
| B46 dritto/rovescio scambiati (mano sicura) | **unito**, 14.2 | `docs/b46/` |
| B47 richieste fiera 14/11 (battuta, conto alla rovescia, livello dopo Rivincita) | **unito**, 14.3 | `docs/b47/` |
| B41 seconda parte + B41.3 modalità fiera | **unito**, 14.5 | `docs/b41/modalita-fiera-2.md` |
| B48 + B48.1 servizio e Leggenda | **ramo `b48-servizio` nel bundle**, prove finali quasi finite | §4.2 |
| B40 fine partita v2 | **ramo `b40-fine-partita` nel bundle**, manca B40.7 | §4.3 |
| **B51 telefono bloccato (URGENTE)** | **da fare**, nessun codice | §4.1 |
| B49 doppio 2v2 | da fare, **piano pronto** `docs/coda/B49-piano-analisi.md` | §4.4 |
| B50 ritardo del ledwall + pulizie | da fare, **piano pronto** `docs/coda/B50-piano-analisi.md` + resti B41.3 | §4.5 |
| Revisore finale della serie B37–B51 | da fare | §4.6 |
| APK Android | **solo se** dopo il B51 serve ancora (decisione dell'utente) | §4.7 |

---

## 4. Cosa fare, in quest'ordine (le mie indicazioni)

### 4.1 B51 «Telefono bloccato» — PRIMO, URGENTE

**Richiesta dell'utente (15/11, 12:30 UTC):** «Molte delle persone che giocano cliccano sul display, chiudono il browser o
comunque interagiscono col touchscreen… escono da Chrome e perdono la connessione al telefono. Ci sarebbe una modalità
dove se anche l'utente clicca sul display non appare nulla, come se fosse bloccata fino alla fine del match?»
**Decisioni dell'utente (domande a scelta):** prima il blocco nella pagina (APK solo dopo, se servirà); allo stand **solo
Android con Chrome**; sblocco con **gesto dello staff sul telefono oppure dal PC**, da solo a fine partita.
Già detto all'utente in chat: subito, senza sviluppo, «Fissa app» di Android (Impostazioni → Sicurezza → Fissa app con
PIN; Samsung: Sicurezza e privacy → Altre impostazioni di sicurezza → Fissa finestre; poi App recenti → icona di Chrome →
«Fissa»).

**Compito (lo stesso dato all'agente fermato; il ramo era vuoto):**
1. Pagina del telefono (`site/tennis/racchetta.html`, `site/js/tennis/racchetta.js`, `phone-screen.js` e vicini):
   modalità «Telefono bloccato» attiva durante scambi di prova, conto alla rovescia e partita (anche in pausa e con il
   «segnale debole»). Schermo scuro con poche parole grandi («Telefono 1 · Gioca!» e il colore del giocatore) e
   **nessun pulsante**; ogni tocco ignorato (niente clic che arrivano ai pulsanti sotto: «Salta ›», «Scollega»,
   «Ricollega», menu; niente zoom con due dita, menu del tocco lungo, selezione, tirare giù per ricaricare). Indietro
   intrappolato con `history` e conferma prima di lasciare la pagina dove il browser lo permette. Schermo sempre acceso
   (Wake Lock, ripreso a pagina di nuovo visibile). Schermo intero e orientamento verticale presi **all'ultimo tocco
   vero** prima della partita («Attiva i sensori», «Sono pronto», «Pronto»): il browser li concede solo con un gesto.
   Correggere `let screen` (`racchetta.js:72` nasconde `window.screen`: il blocco dell'orientamento non è mai partito dal
   05/11; vedi `docs/coda/B50-piano-analisi.md` §1a, con i rischi) e il suo test. Sensori e collegamento come prima; se
   c'è il «tocca per colpire» (`#touchHit`) il blocco non deve romperlo.
2. Sblocco: da solo quando il gioco offre un tocco (fine partita, «Sono pronto», «Rivincita», calibrazione chiesta dal
   PC); gesto dello staff **difficile da fare impugnando il telefono come racchetta** (proposta: due dita ferme 3 s, poi
   un pulsante «Sblocca» che compare per pochi secondi in un altro punto e va toccato); dal PC: pannello dello stand e
   riquadro del telefono («Sblocca il telefono»). Il PC mostra se il telefono è bloccato.
3. Pannello dello stand: voce «Blocco del telefono in partita: Sì · No», di base **Sì** per tutti i telefoni, salvata,
   con la spiegazione della voce (B39.3), senza far scorrere il pannello alle misure della B41.3 (720×720, 1024×600,
   1280×720, 1366×768, 1366×657, 1920×540, 1920×1080, con e senza modalità fiera e righe delle cadute: rifare
   natpf-pannello-cadute e natpf-stesso-schermo-b25). Attenzione: il pannello ha già 16 voci ed è al limite a 720×720.
4. Facoltativo, solo se a basso rischio: manifest della pagina della racchetta (display fullscreen) per aprirla dalla
   schermata Home senza barre, mantenendo l'abbinamento dei telefoni dello stand (B41).
5. Guida dello stand: capitolo nuovo accanto all'8.4 (come funziona, come si sblocca, passi di «Fissa app» per Android
   puro e Samsung, con la nota che dipendono dal modello e non sono provati). Documento `docs/b51/telefono-bloccato.md`.

**Prove:** test di unità della macchina degli stati (tocchi ignorati, sblocchi, history, voce del pannello, `screen`)
che falliscono senza la correzione; nel browser con telefono simulato ed emulazione Android: tocchi sintetici che non
mandano niente al PC, Indietro intrappolato, gesto dello staff e sblocco dal PC, sblocco da solo a fine partita; più
natpf-fiera-telefoni, natpf-flusso-tocchi FLOW=fiera VISITORS=10 (il tetto «2 clic e 1 tocco» non deve cambiare),
natpf-phone-blackout, natpf-scambi-di-prova, natpf-stesso-schermo-b20, natpf-telecomando, natpf-menu,
natpf-training-flow. **Poi subito una versione** (2026-11-14.6 o la successiva libera).

### 4.2 B48 + B48.1 servizio e Leggenda — finire e unire

- Ramo `b48-servizio` (testa `450256e`). Documento `docs/b48/servizio-e-leggenda.md`. Appunti dettagliati:
  `appunti/b48-notes.md` (sezione «B48.1»). Revisione indipendente del B48 con tutti i numeri: `revisioni/revisione-b48.md`.
- Fatto nel B48: difetto 16 su tutti i percorsi (ritardo dello schermo anche per il telefono del P2), servizio con scelte
  (telefono: prima del punto più alto → al centro «T», dopo → largo, in cima → centro del quadrato; riga nella scheda
  «Servizio», sotto «Colpisci!» e nella guida «Come si gioca»; webcam, mouse e tastiera come prima), servizio della CPU
  vario (direzione ed effetto, a Casual e Bambini mai più veloce di chi gioca), Leggenda al più una smorzata ogni 8 colpi.
- Fatto nel B48.1 (tutti i punti della revisione): niente volée/schiacciata sulla risposta al servizio (`31a0f6f`, test
  `natpf-b48-risposta-servizio`), firstKmh per racchetta (telefono 64, altre 59), servizio della CPU nei terzi veri (~1/3
  ciascuno, al più 2 di fila) e una parte di servizi profondi a Pro/Evento/Leggenda (`7d3d795`), test che proteggono le
  tarature (`7f444ba`), test seme per seme e impronte dello stesso schermo con la regola accesa (`a446634`), documenti
  (`ec9ec96`), unione della 14.5 (`3072637`), test B20 A1 (`450256e`).
- Verificato sul ramo unito `450256e`: build ok, audit:legend «Tutti i criteri rispettati» (Pro 73,1%), e2e
  servizio-scelta 18/18, servizio-peso 8/8, training-flow 21/21, scambi-di-prova 30/30, fine-partita 47/47,
  stesso-schermo-b20 52/52 da sola, chi-serve 64/64. Prima della correzione B20 A1 la suite era 1686/1687.
- **Resta:** (1) suite completa su `450256e` (era in corso quando l'agente è stato fermato) + sito, desktop, LAN; (2)
  riempire i segnaposto `__PROVE_B481__` e `__VERIFICHE_B481__` in `docs/b48/servizio-e-leggenda.md` (riga ~438) con i
  numeri; (3) **revisione indipendente mirata delle correzioni B48.1** (consiglio: un revisore che rifà le misure del
  revisore di prima con le sue sonde `sonde/b48/b481-tools/` e che prova a togliere ogni correzione); (4) unione in
  `natpf-simulator`, versione, zip, installer.
- Da dire all'utente: la Leggenda con meno smorzate dà da +0,1 a +1,9 punti ai profili simulati (dentro i criteri, ma
  non più dura); allo stand «Adulto» (livello Evento) non ha il tetto di velocità del servizio della CPU (scritto nella
  guida); il servizio della CPU si vede solo con «Battuta: Alternata».

### 4.3 B40 fine partita v2 — finire, revisione, unire (dopo il B48)

- Ramo `b40-fine-partita` (testa `dc64d2e`, già unita la 14.5). Piano seguito: `docs/coda/B40-piano-analisi.md`
  (decisioni prese sulle proposte dell'analista: `appunti/b40-notes.md` «Decisioni»). Richiesta: `docs/coda/B40-fine-partita-v2.md`.
- Fatto: B40.1 contatori (`natpf_match_stats.js`), B40.2 12 trofei in un modulo puro con banco delle soglie (Asso
  ridefinito raggiungibile, soglie 3/4/5 con √game), B40.3 prima partita e record di oggi, B40.4 card (cornice per
  livello, MVP/Bella sfida, medaglie, record, prossimo trofeo, stesso schermo con due card e corona), B40.5 esultanza e
  applauso in loop, B40.6 ritratti dai modelli 3D resi una volta con le luci dell'arena e arena ferma sotto la card, e2e
  nuova `tools/e2e/natpf-fine-partita-ritratti.mjs`, correzione dei nomi dei trofei a 1280×720 (`dc64d2e`).
- Verificato sul ramo unito: gioco 1700/1700, sito 272/272, desktop 51/51, LAN 13/13, build, audit:legend identico;
  natpf-fine-partita era 52/56 prima di `dc64d2e` (da rifare).
- **Resta (B40.7):** rifare natpf-fine-partita, natpf-fine-partita-ritratti, natpf-lob-drop, natpf-stesso-schermo-b20,
  natpf-fiera-telefoni, natpf-flusso-tocchi FLOW=fiera, natpf-menu, natpf-nuovo-giocatore; riempire `MISURE_RITRATTI`
  (riga ~157) e `PROVE_B40` (riga ~168) in `docs/b40/fine-partita-v2.md`; WORK_PROGRESS; schermate guardate (vittoria,
  sconfitta, stesso schermo, Classici e Lob & Drop, 1920×1080, 1280×720, 720×720, 1920×540). Misure già prese: card
  aperta 25 fps in SwiftShader, cattura ritratti ~2,0–2,1 s, nessun programma shader nuovo.
- Poi: **revisione indipendente** (blocco grande di interfaccia), unione **dopo il B48** e **rimisura delle soglie di Asso
  e Razzo** sul codice con il B48 (il servizio cambia ace e km/h; banco: `sonde/b40-sim/`, script del ramo).
- Da dire all'utente: soglie provvisorie da ritarare con il registro dello stand dopo una giornata (cambia una tabella).

### 4.4 B49 doppio 2v2 — dopo l'unione del B48

Seguire `docs/coda/B49-piano-analisi.md` (passi B49.1–B49.6). Prototipo misurato dell'analista: `sonde/b49/prototipo.diff`
e `sonde/b49/prototipo-natpf_doubles.js`; misure di base e script in `sonde/b49/` (da lanciare da `natpf-tennis` con
`node --import ./test/register.mjs <script>`). Decisioni già prese dal coordinatore: compagno che gioca da solo le sue
palle con un anello azzurro sotto di lui; voce del pannello «Doppio: compagno · Gioca da solo · Con il tuo gesto» (di
base da solo); pressione degli scambi lunghi contata sullo scambio di chi gioca; sfida tra due computer in doppio lasciata
com'è; colpi del compagno fuori dai trofei del B40 (campo `natpfTeamHit`). Attenzione: il pannello dello stand a
720×720 è al limite (con B51 una voce in più): può servire la griglia a 4 colonne.

### 4.5 B50 ritardo del ledwall e pulizie — dopo B48/B49

Seguire `docs/coda/B50-piano-analisi.md` (passi B50-0…B50-10: prova del ritardo dello schermo di 20 s nella diagnostica,
«Parità»/«Vantaggio» nella pillola, istruzioni del servizio a 720×720, prova della Leggenda per lato; la correzione di
`let screen` passa al B51). In più i **resti della revisione B41.3** (`revisioni/revisione-b41-3.md`):
1. «o Invio» per «Conferma» nei documenti (`docs/b41/modalita-fiera-2.md:25-26,256`) e nei commenti
   (`natpf_fiera_sheet.js:9,110`, `natpf_fiera.js:230`) è falso: Invio viene preso da `motion_controls.js:1620-1621`.
   Togliere la frase o lasciar passare Invio a foglio dello staff aperto.
2. Portare nel repository le sonde del pannello e della pagina della fiera (`sonde/b41-3/panel.mjs`, `fierapage.mjs`,
   `settle.mjs`) come prove in `tools/e2e/`: oggi nessuna prova del repository misura il tremolio del pannello con il
   puntatore sulle voci né la pagina della fiera a 1920×540 (i documenti le citano come procedura).
3. `?stand=fiera` con la calibrazione salvata «Con i gesti»: il pannello scrive «Giocando (fiera)» ma vale «gesti»
   (`natpf_kiosk.js:380`, `natpf_fiera.js:135`).
4. Guida 8.4: la finestra «Indirizzi e certificato per i telefoni…» non ha un QR (solo l'indirizzo); la strada
   alternativa (spegni e riaccendi la fiera) sovrascrive le scelte ricordate; «Classifica · A schermo intero» in fiera a
   partita in corso azzera il visitatore.
5. Spazio vuoto di 45–50 px sotto la nota del chiosco (riga ad altezza fissa).
Note della revisione B45.2 da chiudere: test del chiosco col collegamento vero poco stringente (messaggi ogni 10 s con
limite 30 s), guardia `d.end` in `natpf_phone_racket.js` non coperta da test. Nota per il revisore finale (B50 analisi):
oltre 160 ms di ritardo dello schermo la palla riparte 2–4 m dietro il personaggio.

### 4.6 Revisore indipendente finale della serie B37–B51

Un revisore senza il contesto degli sviluppatori: rilegge le diff da `ff90b5a` (14.3) in avanti, rifà le prove nel
browser principali, cerca regressioni tra blocchi (pannello dello stand con tutte le voci, fiera + blocco del telefono +
chiosco, fine partita v2 + fiera + stesso schermo). Correzioni, poi la versione finale.

### 4.7 APK Android — solo se serve

Decisione dell'utente: prima il B51. Se dopo il B51 la gente esce ancora da Chrome o il telefono cade ancora, proporre
un'app Android sottile (WebView o TWA) che carica la pagina dal PC, con modalità chiosco (lock task), Wi-Fi tenuta sveglia
(WifiLock a bassa latenza) e riapertura automatica. Costo 1–2 giorni; va installata a mano su ogni telefono; non
provabile senza un telefono vero. iPhone: non si fa (Accesso guidato).

### 4.8 Cose da dire o chiedere all'utente alla fine

- Ricaricare il Worker del registro e fare la prova a Precision con 3 persone (sblocca B36.1+, `docs/b36/`).
- Parere sul dritto del B23 (estenderlo o no).
- Decisioni aperte: Musica e «Chi gioca» salvati; «Schermo intero» salvato; chiosco e calibrazione; tasto «indietro»
  del mouse.
- Collaudo allo stand di tutto quello che non si può provare qui (telefoni veri, Windows vero, ledwall, rete della fiera,
  «Fissa app»).
- Leggenda un po' più facile dopo il B48 (vedi §4.2) e servizio della CPU ad «Adulto» senza tetto.
- Soglie dei trofei provvisorie (§4.3).

---

## 5. Come lavoravo (procedura che ha funzionato)

### 5.1 Un blocco = un agente, nella sua worktree

- Worktree per blocco fuori dal checkout principale; ramo locale `bNN-nome`; **niente push dei rami**; il coordinatore
  unisce in `natpf-simulator` dal checkout principale. Al più **due blocchi di sviluppo insieme** (regola dell'utente),
  più 1–2 analisi che non toccano il repository.
- Ogni agente: commit piccoli in italiano con le righe di attribuzione; non tocca i file di versione né
  `docs/TRACCIA_PASSI.md`/`PIANO_LAVORI.md`/`RIPRESA_AGENTE.md`; scrive `notes.md` di ripresa a ogni passo; alla fine
  unisce il `natpf-simulator` locale nel suo ramo e rifà le prove.
- Porte del browser separate per agente (esempi usati: 4100–4149, 4250–4299, 4300–4349, 4350–4399, 4400–4449; il
  coordinatore 4160–4199 e 4205 per lo zip). Porte fisse con lock: 4902/4903 (`natpf-telecomando`) con
  `flock <cartella>/telecomando.lock`, 8443/8080/8081 (LAN, prova del programma) con `flock <cartella>/lan.lock`.
- Dopo ogni blocco un **revisore indipendente** (non modifica niente, lavora su copie, prova a togliere le correzioni per
  vedere se i test le prendono). Ha trovato difetti veri in B45.1, B41.2, B48: vale il costo.

### 5.2 Il limite d'uso

Scatta ogni ~5 ore e ferma tutti gli agenti (in questa serie 5 volte). Cosa fare: commit «IN CORSO … NON verificato» nelle
worktree con il lavoro a metà, rilancio con una sezione «RIPRESA» (o messaggio allo stesso agente se è ancora
riprendibile), e un promemoria programmato dopo l'azzeramento per ripartire da soli. Scrivere la traccia **prima** di
ogni operazione lunga.

### 5.3 Rilascio di una versione (copie degli script in `strumenti/rilascio/`; cambiare la variabile `S` in cima)

1. Unire il ramo nel checkout principale: `git merge --no-ff <ramo>` (messaggio in italiano con le righe di attribuzione).
2. Intestazione di `docs/GUIDA_STAND.md` («Vale per la versione …») e novità.
3. `versione.sh <vecchia> <nuova> "<novità>"` (quattro file) e altre righe in `natpf-desktop/novita.txt`, commit.
4. `flock <S>/lan.lock bash rapido.sh <file>`: gioco, sito, desktop, LAN, build. Tutto verde.
5. `git fetch origin natpf-simulator`, controllo lineare (`git merge-base --is-ancestor origin/natpf-simulator HEAD`),
   `git push origin natpf-simulator`. La spinta con la versione cambiata fa partire il workflow GitHub che costruisce e
   pubblica l'installer su R2 (nessun segreto da toccare).
6. `zip.sh <versione>`: zip Cloudflare **senza** `--registro-url`, < 25.000.000 B, provato estratto con
   `cf-browser.mjs` (porta 4205; i 404 di `/api/match/state`, `registro.json`, `/lan/status` e il CORS del TURN sono
   normali con il server statico). Controllare che non ci sia `natpf/registro.json`.
7. `attesa-installer.sh <versione> <cartella>`: aspetta `latest.json` e verifica lo sha256 dal link fisso.
8. `e2e.sh <prove…>` (porte dal 4160) sulle prove chiave del blocco; guardare le schermate.
9. Traccia aggiornata, commit, push. All'utente: zip (file) e «come si attiva».

### 5.4 Comandi utili

```sh
cd natpf-tennis && npm test                              # suite del gioco (~5–9 min sotto carico)
node --import ./test/register.mjs --test test/<file>     # un file (senza register.mjs dà falsi rossi)
npm run build && npm run audit:legend                    # build e criteri della Leggenda (deve dire «Tutti i criteri rispettati»)
cd .. && node --test tools/test/*.test.mjs               # sito e pagina del telefono
(cd tools/lan && node --test test/*.test.mjs)            # server LAN
(cd natpf-desktop && npm test)                           # programma Windows
CHROMIUM_PATH=/opt/pw-browsers/chromium GAME_PORT=4160 PEER_PORT=4161 OUT=<cartella> node tools/e2e/<prova>.mjs
```

Prove instabili sotto carico (verdi da sole): remote-pairing «chiave sbagliata, risposta riusata», natpf-registro «1 MB
in pochi ms», natpf-stesso-schermo-b20 «richiamo per nome», natpf-telecomando «Salta», natpf-webcam-load; tools/e2e
natpf-registro sbaglia se passa la mezzanotte UTC. Rifarle da sole prima di dichiararle rosse.

---

## 6. Contenuto di questa cartella

| percorso | cosa |
|---|---|
| `rami-b40-b48.bundle` | rami `b40-fine-partita` (dc64d2e) e `b48-servizio` (450256e) |
| `appunti/b40-notes.md`, `b48-notes.md`, `b51-notes.md`, `b41-2-e-b41-3-notes.md` | appunti di ripresa degli agenti, con misure e comandi |
| `revisioni/revisione-b48.md`, `revisione-b41-3.md` | revisioni indipendenti con i problemi, i controlli e il rapporto dello sviluppatore |
| `strumenti/rilascio/` | `rapido.sh`, `versione.sh`, `zip.sh`, `attesa-installer.sh`, `e2e.sh`, `cf-browser.mjs` |
| `sonde/b41-3/` | sonde del pannello e della pagina della fiera da portare in `tools/e2e` (B50) |
| `sonde/b48/` | script di misura del B48 e del B48.1 (difficoltà, servizio della CPU, volée sul servizio, mutazioni) |
| `sonde/b40-sim/` | banco delle partite simulate per le soglie dei trofei e risultati |
| `sonde/b49/` | misure di base del doppio, prototipo del compagno autonomo (`prototipo.diff`) e risultati |

Piani pronti nel repository: `docs/coda/B40-piano-analisi.md`, `docs/coda/B49-piano-analisi.md`,
`docs/coda/B50-piano-analisi.md`. Registro passo per passo: `docs/TRACCIA_PASSI.md`. Decisioni durature:
`docs/PROJECT_MEMORY.md`.

---

## 7. Regole dell'utente da non dimenticare

- Testi dell'interfaccia in italiano; **voce del gioco solo in inglese**. Domande all'utente solo a scelta, brevi.
- L'utente gioca solo dal **programma Windows su un ledwall, con il solo mouse**: ogni novità deve dire come si attiva con
  il mouse.
- Ogni commit verificato va spinto subito (test del gioco e del sito verdi + build); pacchetti dopo ogni versione.
- Mai segreti nei file, nei log o in chat (token R2 e TURN solo nei segreti di GitHub o nella dashboard di Cloudflare);
  il repository è pubblico: niente chiavi, niente dati personali, niente email dell'utente; il nome del gioco commerciale
  di riferimento non va nei file.
- CSS con `cqw/cqh` e `@container natpf` (niente `vw/vh/@media`), JS con `viewport()` di `natpf_screen.js`.
- Ogni cambio al riconoscimento dei gesti con test; le dimostrazioni del tutorial uguali agli algoritmi veri.
- Non fingere: scrivere sempre cosa non è provato (telefoni veri, Windows vero, ledwall, rete vera).
- L'ultima istruzione generale dell'utente (14/11 sera) era: «Riprendi il lavoro e torna da me solo quando sarà finita
  l'intera roadmap» — cioè lavorare da soli blocco dopo blocco, pubblicando le versioni, e fare un riepilogo unico alla
  fine (versioni, zip, installer, come si attiva, cosa non è provato, cose da decidere).
