# B41 prima parte · Telefoni dello stand e «Sono pronto» (13/11/2026)

Ramo `b41-fiera-1` sopra la versione 2026-11-13.12 (B43 compreso). Progetto completo: `docs/b41/progetto-modalita-fiera.md`.
Compito: `docs/coda/B41-modalita-fiera-parte-1.md`. In questo blocco anche il B28.1 (`docs/b28/calibrazione-giocando.md`).

Richieste dell'utente del 13/11:
1. «durante l'evento fiera i telefoni sono sempre gli stessi, quindi è inutile ogni volta collegare il telefono,
   scansionare un QR code e fare la calibrazione: io seleziono solo il livello di difficoltà, i telefoni sono già pronti,
   le persone devono solo giocare e io gli do i telefoni»;
2. «nella schermata "Pronto per la partita" l'utente deve toccare sullo smartphone "Sono pronto" e quando entrambi sono
   pronti la partita parte da sola, senza che uno clicchi su Gioca».

## 1. In breve, per lo staff

**Pronto adesso**
- **«Sono pronto» dal telefono** (vale sempre, anche senza la modalità fiera). Sulla pagina «Pronto per la partita»:
  - il telefono mostra un grande pulsante giallo «Sono pronto» al posto di «Pronto»;
  - sul computer, in basso accanto a «Gioca», c'è una spunta per giocatore: «Telefono: tocca «Sono pronto»» e poi
    «Telefono pronto ✓» (nello stesso schermo «Player 1 pronto ✓», «Player 2: tocca «Sono pronto»»);
  - quando hanno toccato tutti (uno contro la CPU, due nello stesso schermo) compare il conto alla rovescia di 3 s, sul
    computer e sui telefoni, e la partita parte da sola;
  - «Gioca» sul computer funziona sempre, anche senza tocchi; «Aspetta» (o Esc) ferma il conto e tutti ritoccano;
  - un telefono che cade durante il conto (scollegato, schermo spento, sensori fermi) lo ferma: sul computer compare
    il perché («Conto annullato · Player 2: schermo del telefono spento») e quel telefono deve toccare di nuovo;
  - con la calibrazione «Giocando» gli scambi di prova restano **prima** della pagina «Pronto per la partita», come oggi.
- **Telefoni dello stand** (modalità fiera), la parte «motore»:
  - ogni telefono si abbina **una volta** al suo posto (Telefono 1 o Telefono 2), con il QR e la conferma dello staff;
  - poi **niente più QR**: se si ricarica il gioco, si riavvia il programma o il PC, o si ricarica la pagina del
    telefono, il telefono torna da solo al suo posto;
  - il chiosco (azzeramento automatico del visitatore) **non scollega** più il telefono dello stand;
  - sul telefono: numero grande del posto, «Dai il telefono al prossimo giocatore» tra una persona e l'altra, i pulsanti
    Ricalibra / Ricollega / Scollega **nascosti** (lo staff tiene premuto il numero per 3 s), avviso di batteria bassa
    (sotto il 20 %, solo dove il browser la dà: Chrome su Android, Safari su iPhone no), schermo tenuto acceso;
  - il visitatore non vede tutorial: il telefono dello stand conta come «tutorial già visto».

**Manca (B41 seconda parte: tappe B41.4 e B41.5, dopo il blocco dello stand con il solo mouse)**
- l'interruttore «Modalità fiera: No · Sì» nel pannello dello stand e il foglio «Telefoni dello stand» con il QR, il
  numero e «Conferma» da cliccare con il mouse. **Oggi l'abbinamento si fa solo con le funzioni del gioco** (vedi §2): non
  c'è ancora un pulsante;
- la pagina della fiera (Chi gioca, 1 o 2 giocatori, mano) e «Prossimo giocatore» a fine partita;
- la battuta sempre al visitatore contro la CPU: la regola c'è (`fairServer` in `natpf_fiera.js`, con i test), la userà
  la pagina della fiera; oggi la partita usa ancora «Batte per primo» delle impostazioni;
- i visitatori numerati da soli («Visitatore 12»), l'avviso della batteria bassa **sul ledwall** (il dato arriva già:
  `__natpfTennis.natpfUi.fiera.status('p1')`), i colpi del Telefono 2 contati come attività dal chiosco;
- nel pannello dello stand «Telefono: Scollega» con la modalità fiera accesa **scollega il posto** (il telefono va
  riabbinato): la B41.4 lo sostituisce con «Telefoni dello stand ›».

## 2. Come si prova oggi

**«Sono pronto»** (nessuna impostazione): gioco → Gioca → Contro la CPU (o Stesso schermo) → telefono collegato →
pagina «Pronto per la partita» → sul telefono «Sono pronto».

**Telefoni dello stand** (per le prove; il foglio con il mouse arriva con la B41.4):
1. aprire il gioco con `?stand=fiera` nell'indirizzo (per esempio `…/?stand=fiera`; `?stand=normale` la spegne per quella
   pagina). In alternativa la scelta salvata: `__natpfTennis.natpfUi.fiera.setOn(true)` dalla console del browser (resta salvata);
2. dalla console del browser del computer: `__natpfTennis.natpfUi.fiera.openPairing('p1')`, poi il link del QR è in
   `__natpfTennis.natpfPhone.standPairingUrl` (da aprire sul telefono: per ora non è disegnato come QR da nessuna parte);
3. il telefono mostra un numero (per esempio 482); lo stesso è in `__natpfTennis.natpfUi.fiera.status('p1')`: «Un
   telefono chiede il posto · numero 482»;
4. conferma: `__natpfTennis.natpfUi.fiera.confirm('p1', { isTrusted: true })` (nel foglio della B41.4 sarà un clic vero
   dello staff);
5. sul telefono «Attiva i sensori» (dello staff). Fatto: da ora il telefono torna da solo.
Lo stesso con `'p2'` per il Telefono 2 (`__natpfTennis.natpfPhone2`). «Scollega»: `__natpfTennis.natpfUi.fiera.forget('p1')`.

Prova automatica nel browser (telefoni simulati): `CHROMIUM_PATH=… GAME_PORT=… PEER_PORT=… node tools/e2e/natpf-fiera-telefoni.mjs`.

## 3. Come funziona

### 3.1 Abbinamento e sicurezza (B41.1, `site/js/tennis/stand-pairing.js`)
Sul modello del telecomando dello staff (B27):
- il QR dell'abbinamento (`#sp=racchetta-stand-abbina-…&k=…`) vale solo a foglio aperto, per 5 minuti, una volta;
  5 tentativi sbagliati cambiano il codice, 15 chiudono l'abbinamento;
- il QR giusto **non basta**: il gioco mostra un numero (100–999), lo stesso compare sul telefono, e serve la conferma
  dello staff; `natpfUi.fiera.confirm` rifiuta un clic che non è vero (`isTrusted`);
- alla conferma nascono l'**indirizzo fisso** del posto (`racchetta-stand-…`, 130 bit) e la **chiave**: viaggiano una
  volta sola nel canale cifrato e restano salvati sul computer (`natpf-tennis.stand.p1`, `.p2`; nel programma Windows
  tra un riavvio e l'altro) e sul telefono (`natpf-racchetta-stand`). L'indirizzo fisso **non è mai nel QR**;
- **la chiave non viaggia mai**: a ogni ripresa il telefono manda un numero casuale, il gioco risponde con
  HMAC-SHA-256(chiave, «stand-game»|numero|indirizzo) e un suo numero, il telefono controlla e risponde con la sua prova
  («stand-phone»). Le due prove non si scambiano tra loro né con quelle del telecomando. A chi non prova la chiave il
  telefono non manda niente, e un rifiuto arrivato prima della prova non gli fa dimenticare il posto;
- **riabbinare** un posto cambia indirizzo e chiave: il telefono di prima riceve «Non sei più il Telefono 1: chiama lo
  staff» (se era collegato) e comunque non trova più il gioco; **«Scollega»** butta indirizzo e chiave;
- la stessa chiave aperta in due schede: entra l'ultima, la prima si ferma («aperto in un'altra scheda»);
- QR e saluti separati: la racchetta normale (anche una pagina vecchia in cache) non legge il QR dello stand, il posto
  dello stand rifiuta il saluto della racchetta normale e del telecomando, la racchetta normale rifiuta il saluto dello
  stand.

**Chi vede il ledwall o sta sulla stessa Wi-Fi**: senza foglio aperto non c'è nessun indirizzo d'abbinamento; il QR
fotografato non vale dopo la chiusura del foglio; all'indirizzo fisso (che non conosce) serve la chiave, e la prova del
gioco rimandata indietro non vale. Il riquadro del QR, per un telefono dello stand scollegato, mostra «Telefono 1 · si
ricollega da solo, se non torna chiama lo staff» (nessun QR). Niente dati personali: solo posto, indirizzo e chiave.

### 3.2 Collegamento fisso lato gioco (B41.2)
- `link.js`, `createPhoneLink({ stand: { slot } })`: in ascolto all'indirizzo fisso solo se il posto è abbinato;
  ingresso solo con la prova; con l'indirizzo ancora occupato dal collegamento di prima (gioco ricaricato, programma
  riavviato) si riprova ogni 3 s finché il server lo libera. Dopo l'ingresso è una racchetta come le altre (stessi
  messaggi, stessi controlli di vita, stessa pausa a schermo spento).
- `natpf_fiera.js`: modalità salvata (`natpf-tennis.fiera`) o dall'indirizzo (`?stand=fiera`); all'avvio i posti
  abbinati diventano telefoni dello stand (anche il Telefono 2, che prima nasceva solo con lo stesso schermo); un posto
  non abbinato resta la racchetta normale con il QR. Funzioni per la B41.4: `openPairing`, `closePairing`, `confirm`,
  `refuse`, `forget`, `status`, `setOn`.
- `NatpfPhoneRacket.useStand(slot)` cambia il collegamento di un telefono; `standSlot` dice il posto; `pairingUrl` è
  `null` per un telefono dello stand.

### 3.3 Pagina del telefono dello stand (B41.3, `racchetta.js`, `phone-screen.js`, `racchetta.html`)
- posto salvato; si ricollega **senza fine** (ogni 1–6 s) e subito quando torna la rete (`online`), quando la pagina
  torna in primo piano e quando il browser la riprende dalla cache (`pageshow`). La racchetta normale fa come prima
  (10 tentativi), più il nuovo tentativo immediato su `online` e `pageshow`;
- numero grande del posto in alto (1 giallo, 2 rosa); tra una persona e l'altra «Pronto ✓ · Dai il telefono al
  prossimo giocatore», a partita finita «Partita finita · Dai il telefono al prossimo giocatore»;
- Ricalibra, Ricollega, Scollega solo dopo 3 s di pressione sul numero (un anello si riempie), poi per 20 s;
- segno dei sensori («taratura»): confermato dai tocchi (4 concordi) si salva sul telefono e non si vota più: un
  visitatore che tocca «Sono pronto» con il telefono storto non fa ricalibrare;
- batteria bassa (sotto il 20 %, non in carica) nell'avviso in alto, se non c'è un avviso più urgente.

### 3.4 «Sono pronto» (B41.6, `natpf_ready_go.js`)
- Vale sulla pagina «Pronto per la partita» contro la CPU (Telefono 1) e nello stesso schermo (i due telefoni); non
  nella sfida tra due computer (c'è già il «Sono pronto» del Player 2), non con la webcam, non durante gli scambi di
  prova.
- Il gioco offre «Sono pronto» con il messaggio dell'«Avanti ›» del B28 più `rd 1`: la pagina del telefono di oggi lo
  mostra grande; una pagina del B28 in cache lo mostra come il pulsante «Avanti ›» con la scritta «Sono pronto» (e
  funziona); una pagina più vecchia lo ignora (resta «Gioca»). Un tocco arrivato senza l'offerta non conta.
- Un telefono non è pronto se è scollegato, ha lo schermo spento, non è pronto o ha i sensori fermi da almeno 0,7 s
  (come la pausa in partita) **e per almeno 0,3 s di fila**: il computer fermo per un attimo fa sembrare fermi i sensori
  di tutti.
- A zero il conto preme lo stesso «Gioca» (con tutti i controlli di sempre).

### 3.5 Chiosco (minimo indispensabile, `natpf_kiosk.js`)
- non scollega il telefono dello stand (lo scollegava a ogni azzeramento);
- un telefono dello stand collegato non vuol dire «c'è qualcuno»: al menu il chiosco non riazzera di continuo.

## 4. Verifiche

Sul codice unito con la 2026-11-13.12 (B43), commit `09c7ad8` più i ritocchi finali (13–14/11):

| Prova | Esito |
|---|---|
| gioco, `cd natpf-tennis && npm test` | **1513/1513** (nuovi: `natpf-fiera` 6, `natpf-ready-go` 9; B28.1 6 in `natpf-giocando-revisione`) |
| sito e pagina del telefono, `node --test tools/test/*.test.mjs` | **247/247** (nuovi: `stand-pairing` 11, `stand-phone` 10) |
| programma Windows, `cd natpf-desktop && npm test` | 43/43 |
| server LAN, `cd tools/lan && node --test test/*.test.mjs` | 12/12 |
| build, `cd natpf-tennis && npm run build` | ok |
| `npm run audit:legend` | uguale byte per byte alla base `c47a1ff` (tutti i criteri rispettati) |
| `natpf-fiera-telefoni` (nuova) | **38/38**: abbinamento con numero e conferma (0,5 s), gioco ricaricato e telefono di nuovo dentro senza QR (9 e 17,5 s nei due giri: ricarica del gioco più l'attesa del telefono, al massimo 6 s), pagina del telefono ricaricata (0,2–0,4 s), chiosco, «Sono pronto» contro la CPU e nello stesso schermo, «Aspetta», Telefono 2 spento durante il conto |
| `natpf-scambi-di-prova` | 30/30; `FLOW=minigioco` 10/10 |
| `natpf-phone-keep` | `CAL=gesti` 13/13, `CAL=base` 13/13 |
| `natpf-stesso-schermo-b20` | 53/53 |
| `natpf-menu` | 45/45 |
| `natpf-nuovo-giocatore` | 28/28 |
| `natpf-formato-fiera` | 25/25 |
| `natpf-telecomando` (porte fisse, con `flock`) | 85/85 |

Le prove di prima sono girate mentre si facevano gli ultimi ritocchi (testo del riquadro del conto, stato dello stesso
schermo e testi del telefono **solo** per i telefoni dello stand): non toccano quei percorsi; `natpf-fiera-telefoni` è
stata rifatta sul codice finale (38/38).

**Schermate guardate** (telefono simulato 390 × 844, gioco 1920 × 1080 e 720 × 720): telefono dello stand tra un
visitatore e l'altro, con i pulsanti dello staff dopo la pressione lunga, con «Sono pronto», durante il conto; numero
dell'abbinamento; pagina «Pronto per la partita» con le spunte (contro la CPU e nello stesso schermo), riquadro del conto
(«Pronto · si gioca tra» contro la CPU, «Tutti pronti · si gioca tra» in due), conto annullato con il motivo a 720 × 720.
Nello stesso schermo le schede in alto dicono lo stato del telefono («Pronto» = sensori pronti), le spunte in basso
«Sono pronto»: la pagina della fiera (B41.5) le metterà insieme.

Problemi trovati con le prove nel browser e corretti:
- un tocco su «Sono pronto» si perdeva se il computer restava fermo un attimo (i sensori di tutti i telefoni sembravano
  «fermi»): ora serve che i sensori restino fermi almeno 0,7 s e per 0,3 s di fila;
- nella prova un fotogramma intero ridisegnato a 1920 × 1080 (Chromium senza scheda video) fermava la pagina per più di
  5 s e i telefoni cadevano (giusto: è il controllo di vita): niente ridisegni durante i tocchi nella prova.

## 5. Non verificato
- telefoni veri (Android e iPhone), persone vere, Windows, ledwall, rete dello stand: tutte le prove sono con il
  telefono simulato (eventi devicemotion sintetici) e la segnalazione PeerJS locale;
- **la LAN** (programma Windows, `?lan=1`): il collegamento fisso usa lo stesso `LanPeer` della racchetta, ma la prova
  nel browser è via PeerJS locale; il rilascio dell'indirizzo dopo un riavvio in LAN (entro due giri di ping, circa
  20 s, secondo il server) non è stato provato;
- via internet con PeerJS pubblico un indirizzo fisso dopo un riavvio non è mai stato provato;
- su iPhone, dopo una ricarica, i sensori ripartono solo con «Attiva i sensori» (permesso dentro un tocco): resta allo
  staff;
- la batteria: il valore vero di `navigator.getBattery` non è stato provato (nella prova non c'è);
- il foglio della B41.4 con il clic vero (`isTrusted`): non c'è ancora; nelle prove la conferma è chiamata dal codice.
