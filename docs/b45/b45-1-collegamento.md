# B45.1 · Telefono che non si scollega (14/11/2026)

Richiesta urgente dell'utente, in fiera con la gente allo stand: «C'è un problema urgente: se faccio giocare la gente con
un solo cellulare molte volte la connessione e la ledwall si disconnette e dice "scollegato", pensa ad una soluzione
urgente per risolvere questo problema dovuto probabilmente alle tante persone in stand.»

Analisi di partenza: `docs/b45/telefono-che-si-scollega.md` (B45, sola lettura) e la sua revisione indipendente.

---

## In breve (per l'utente)

- **Il chiosco non scollega più il telefono.** Prima, con il chiosco acceso, dopo 45 s senza clic sul computer il gioco
  scollegava di proposito il telefono col QR, e i gesti fatti sul telefono non contavano come «qualcuno c'è». Ora il
  telefono resta collegato: il chiosco azzera solo chi gioca (come «Nuovo giocatore»), e anche i gesti, i tocchi e il
  telefono preso in mano contano come attività.
- **Un buco della Wi-Fi di qualche secondo non fa più cadere niente.** Prima bastavano 5 s senza messaggi (in partita
  circa 3 s) per dire «scollegato». Ora il gioco aspetta **10 s di silenzio vero** e conta come segno di vita ogni
  messaggio del telefono, anche i sensori. La partita si ferma subito, come prima, ma riparte da sola quando il telefono
  torna.
- **Sul ledwall una scritta calma.** Quando il telefono tace: «**Telefono 1: segnale debole, aspetto che torni…**».
  Dopo 10 s: «**Telefono 1 scollegato · si ricollega da solo**» con «Senza segnale da N s». Il pannello con il QR si apre
  da solo solo se il telefono non torna entro 20 s.
- **Il telefono non si arrende più.** In LAN (programma Windows) la racchetta col QR riprova senza fine (attese che
  crescono fino a 6 s) e riprova subito quando la rete torna o cambia; tornato, non chiede né il QR né la calibrazione.
- **Per sapere perché cade:** nel registro dello stand ogni caduta ha il motivo, e nel pannello dello stand (F9) una riga
  «Telefono 1: N cadute oggi · motivo più frequente: …» (§3).

## 1. Le cause, in ordine

| # | Causa | Dove | Cosa succedeva |
|---|---|---|---|
| 1 | **Il chiosco scollegava il telefono col QR** | `natpf_kiosk.js` (reset → `ui.phone.forget()`) | Dopo il tempo del chiosco (di base 45 s) senza tasti, clic o colpi sul computer, anche al menu: il telefono diceva «Scollegato – Il computer ha scollegato il telefono… inquadra il nuovo QR». I gesti della calibrazione e i tocchi sul telefono non contavano |
| 2 | **Controllo di vita di 5 s** sui due lati, solo sul canale affidabile | `link.js`, `racchetta.js` | Tra la folla la Wi-Fi del telefono si ferma per qualche secondo: ogni buco di 5 s era una caduta, anche con i sensori che arrivavano |
| 3 | **«Ricollega» automatico in partita a ~2,9 s** anche con tutto muto | `natpf_phone_watch.js` (createResync) | Nato per il solo canale veloce bloccato, scattava anche in un buio totale: al ritorno della rete il telefono rifaceva il collegamento (una caduta nel registro) |
| 4 | **La racchetta col QR smetteva di riprovare** dopo 10 tentativi (1–3 minuti) | `racchetta.js` (lost) | Un buco lungo (router riavviato, canale radar sui 5 GHz) diventava una caduta per sempre, mentre il telefono diceva ancora «Riprovo da solo tra poco» |
| 5 | **Il lato rimasto fermo dava la caduta appena ripartito** | `link.js`, `racchetta.js` | Una pagina ferma qualche secondo (gioco pesante, telefono occupato) giudicava il silenzio prima di leggere i messaggi arrivati intanto |
| 6 | **Sul ledwall «Scollegato» e il pannello con il QR subito** | `natpf_ui.js` | In fiera sembrava rotto anche quando il telefono tornava da solo un secondo dopo |

## 2. Cosa cambia (fase A, la parte urgente)

### 2.1 Il chiosco non scollega (`natpf_kiosk.js`)
- Il chiosco non chiama più «Scollega» sui telefoni (Player 1 e Player 2, col QR o dello stand). Azzera chi gioca come
  «Nuovo giocatore»: nome, mano destra per tutti e due, profilo e calibrazione del telefono (`resetPlayer`, causa
  `chiosco`), tutorial da rivedere, nomi e fasce dello stesso schermo, «Chi gioca».
- Attività: oltre a tasti, clic, tocchi e colpi, anche i gesti della calibrazione, i tocchi sul telefono («Tutto
  chiaro», frecce, «Sono pronto», «Avanti», mano, rivincita), i sensori attivati, un QR nuovo e il telefono preso in mano
  (rotazione oltre 25 °/s: `link-life.MOVE`). Vale anche per il Telefono 2 dello stesso schermo.
- «A riposo»: al menu senza nome e senza nessuno dall'ultimo azzeramento il chiosco non riparte a ogni giro.
- Lo stesso schermo: la pagina «Collega» lasciata aperta non riapre più il tutorial al menu con i telefoni collegati
  (`natpf_split_ui._drive` non fa niente al menu e nella classifica).

### 2.2 Il telefono riprova senza fine in LAN (`link-life.retryPlan`, `racchetta.js`)
- Attese di 1, 2, … fino a 6 s; in LAN (programma Windows) e per il telefono dello stand **senza fine**; via internet
  (versione web) 10 tentativi e poi «Tocca «Riprova»» (il testo non promette più un tentativo che non arriva).
- Subito un tentativo quando la rete torna (`online`) o cambia il **tipo** di rete (Chrome su Android: wifi ↔ cellular;
  le stime di velocità no), solo in attesa del prossimo tentativo: mai da collegato, mai a tentativo in corso (né durante
  la prova della chiave del telefono dello stand) (`link-life.kickNow`).

### 2.3 Controllo di vita paziente (`link-life.LIFE`, `lifeCheck`)
- **10 s** di silenzio vero sui due lati (prima 5). Ogni messaggio vale come segno di vita: sul computer anche i sensori
  e il percorso veloce; il computer manda il suo battito anche sul percorso veloce («hb»), e il telefono lo conta.
- Un controllo arrivato con più di 2,5 s di ritardo (quel lato era fermo) per quel giro non giudica: prima si legge la
  coda dei messaggi.
- «Ricollega» automatico in partita solo se il telefono **risponde ancora** sul canale affidabile con i sensori che
  vanno (`phoneHealth.answers`): il caso del canale veloce bloccato. Con tutto muto decidono la pausa e il controllo di
  vita.
- La pausa della partita resta com'era (si vede subito che il telefono si è fermato), e la partita riprende da sola con il
  conto alla rovescia quando il telefono torna (punto rigiocato se era nello scambio).
- Il telefono che torna dopo un buco entra con la sua chiave di ripresa: niente QR, niente calibrazione.

### 2.4 Scritte calme sul ledwall (`natpf_phone_watch.js`, `natpf_ui.js`, `natpf_split_ui.js`)
- Motivo nuovo della pausa **«segnale debole»**: i dati del telefono non arrivano ma i suoi sensori vanno, oppure tace del
  tutto. Riquadro: «**Telefono 1: segnale debole, aspetto che torni…**» · «La partita è in pausa e riprende da sola
  appena il telefono torna.» (nello stesso schermo con il nome: «Telefono di Giulia: …»). Prima: «Il telefono non manda
  più il movimento: sul telefono tocca «Riattiva i sensori»», che non c'entrava.
- Dopo 10 s, a collegamento chiuso: «**Telefono 1 scollegato · si ricollega da solo**» · «Senza segnale da 12 s: si
  ricollega da solo appena torna la rete. Se non torna, riapri la pagina del gioco sul telefono.» (il tempo si aggiorna
  ogni secondo).
- Il pannello del telefono con il QR (gioco singolo) si apre da solo solo dopo **20 s** da scollegato
  (`PANEL_AFTER_MS`): prima si apriva subito alla caduta, sopra il campo, con «Scollegato». Il pulsante «Ricollega il
  telefono» del riquadro resta.
- Pagina «Collega» dello stesso schermo: scheda «Segnale debole · Aspetto che il telefono torni: si riprende da solo»;
  il telefono perso dice «si ricollega da solo. Pagina chiusa? Inquadra il QR».
- «Sono pronto» (B41.6) e la sfida tra due computer conoscono il motivo nuovo.

## 3. Perché è caduto (fase B)

Il B45.1 non aspetta più una giornata di misure per correggere (le correzioni della fase A sono quelle già provate in
laboratorio dall'analisi B45, §5), ma da questa versione **ogni caduta dice perché**, sui due lati, con poca spesa.

- **Computer** (`link.js`, evento `drop` `{ motivo, causa, ms }`): `silenzio` (controllo di vita: nessun messaggio per
  10 s, `ms` = da quanto taceva), oppure alla chiusura del canale il motivo più sicuro (`link-life.closeMotivo`):
  «Ricollega» chiesto dal gioco da poco (causa `computer`), la parola breve del telefono arrivata prima di chiudere
  (messaggio `cl`: `silenzio`, `ricollega`, `pagina`, `scollega`), la pagina del telefono nascosta nel suo ultimo segnale,
  poi il silenzio (il computer non sentiva il telefono da almeno 5 s: il canale l'ha chiuso il controllo di vita del
  telefono, la sua parola `cl` si è persa con la rete; causa `computer` se la strada l'ha data per persa il browser,
  `failed`); altrimenti `chiuso`.
- **Telefono** (`racchetta.js`, `link-life.createDropStory`): tiene il racconto dell'ultima caduta nella memoria della
  scheda (resta anche se la pagina si ricarica): parola (`silenzio`, `chiuso`, `nascosta`, `pagina`, `ricollega`, `rete`:
  rete cambiata nei 15 s prima, `online`/`offline` o tipo di rete di Chrome su Android), da quanto, tentativi e quanti
  falliti, tipo di rete. Lo racconta **una volta** nel primo messaggio `dev` dopo il benvenuto (campo `cd`, solo parole e
  numeri previsti: `link-life.readStory`); i computer di prima ignorano il campo.
- **Motivo finale** (`natpf_cadute.motivoFinale`): quello del computer, corretto dal telefono quando sa di più (rete
  cambiata, pagina nascosta o chiusa, «Ricollega» toccato da lui, silenzio visto prima da lui). Un racconto di una caduta
  di prima che la pagina del gioco partisse vuol dire **pagina del gioco ricaricata** (o programma chiuso e riaperto).
- **Registro dello stand** (righe `tel`, solo campi già in `CAMPI`: il Worker **non** va ricaricato): alla caduta
  `{ stato: 'caduto', motivo, causa, ms, dove, inPartita? }`; al ritorno `{ stato: 'ricollegato', dopoS, motivo, causa,
  prove, fallite, tipo, strada, so, browser }` con il motivo chiarito; una caduta che il computer non ha fatto in tempo a
  vedere (il telefono è rientrato prima) ha `fonte: 'telefono'`. Riassunto (`scripts/registro/riassunto.mjs`): «Perché
  cadono (motivo · chi se n'è accorto)», «Dove si era alla caduta», «Motivo chiarito al ritorno».
- **Pannello dello stand** (F9): nello spazio libero della riga dei pulsanti in basso (il foglio non si allunga: «Chiudi»
  resta in vista a 1024 × 600), solo se oggi è successo, «**Telefono 1: 3 cadute oggi · motivo più frequente: Wi-Fi ferma
  10 s**», una riga per telefono (Telefono 2 nello stesso schermo). Conto nella memoria del gioco (`natpf-tennis.cadute`, da
  capo ogni giorno), anche con il registro spento. Motivi in breve: «Wi-Fi ferma 10 s», «rete cambiata», «pagina
  nascosta», «pagina chiusa», ««Ricollega»», «gioco ricaricato», «collegamento chiuso», ««Scollega» sul telefono».

## 4. Rifiniture della 14.2 (revisione del B46)

- La moviola a metà partita (`REPLAY`) arriva al telefono come `pause` (prima `menu`): i tocchi lì non votano più il
  segno dei sensori; il telefono dice «Moviola del punto: guarda il computer, si riprende da solo.»
- Registro: le righe `mano` del chiosco e di «Nuovo giocatore» non sono più `inPartita` (chiudono la partita); il segno
  imparato che torna a +1 con scambi di prova nuovi, «Nuovo giocatore» o il chiosco si scrive (`motivo: 'segno'`); causa
  `telefono nuovo` quando il segno cambia con un altro telefono (abbinamento nuovo o telefono e browser diversi), `pagina`
  solo per lo stesso telefono con la pagina ricaricata.
- `docs/b46/lato-sicuro.md`: il caso ACC_DOPO come «doppia inversione» non si produceva con la pagina vera (la
  ricalibrazione rimette già a +1 il segno imparato); il caso SEGNO è «reso visibile», non chiuso; schermata di «Pronto per
  la partita» con «Mancino» accanto al titolo rifatta sul codice finale. Il test 4 del caso dell'utente ora simula la
  ricalibrazione della pagina vera.

## 5. Programma Windows: Alt in finestra (prova `prova-linux`)

Il controllo «finestra: Alt mostra il menu, Alt di nuovo lo nasconde» falliva con B38 e B39 insieme (e a volte anche
quello di «predefinito»). Cercato con un registro dei cambi di fuoco della pagina e dello stato di Electron, su copie
della prova (non nel repository):
- **Non è il gioco a bloccare Alt**: keydown e keyup di Alt arrivano alla pagina senza `preventDefault` (anche con la
  tastiera a schermo del B38), e con la barra del menu aperta un `focus()` di un elemento dentro la pagina (come quello
  dell'intro) non la richiude (`document.hasFocus()` resta vero).
- **È la prova sotto Xvfb** (senza gestore delle finestre) che manda i tasti con `webContents.sendInputEvent`: dopo una
  barra chiusa con Alt il fuoco resta alla barra nascosta (`webContents.isFocused()` falso) e gli Alt mandati dopo non la
  riaprono; quando la finestra dice di non avere il fuoco l'aiuto `key()` lo ridava alla pagina dal programma
  (`webContents.focus()`) anche con la barra aperta, e così la chiudeva (l'Alt dopo la riapriva). In più alla fine del trailer l'intro sposta il fuoco su «Premi un tasto»
  (`natpf_intro.finishAnimation`): con il B38 la pagina è un po' più lenta e quel momento cadeva proprio durante la prova.
- **Correzione nella prova** (`natpf-desktop/scripts/prova-linux.mjs`): prima di provare Alt aspetta la fine dell'intro;
  per aprire la barra dà il fuoco alla pagina se non ce l'ha; per chiuderla non tocca il fuoco; se il controllo non
  riesce, dice chi ha spostato il fuoco nella pagina. Con la macchina molto carica un Alt mandato con `sendInputEvent` a
  volte si perde (un giro su sei: la barra resta aperta e nella pagina non cambia niente): per chiudere la barra la prova
  riprova una volta e lo scrive nel dettaglio del controllo («riprovato»). Il gioco non cambia. Con un Windows vero e una tastiera vera non
  provato (la barra con Alt in finestra era già nel B8 e nessuno l'ha segnalata rotta).

## 6. Come si attiva

Niente da attivare: vale da questa versione, con il programma Windows e con la versione web. Allo stand: si può
riaccendere il chiosco (pannello → «Modalità chiosco: Sì»), il telefono col QR resta collegato.

## 7. Prove

- Test di unità: `tools/test/b45-collegamento.test.mjs` (soglie del controllo di vita, lato fermo, tentativi senza fine
  in LAN e dieci via internet, ripartenza solo in attesa, racconto della caduta; il computer vero con un telefono finto:
  7 s nessuna caduta, 11 s caduta, sensori e percorso veloce come segno di vita, battito «hb»), `natpf-phone-watch`
  (segnale debole e testi), `natpf-split-ricollega` («Ricollega» solo se il telefono risponde), `natpf-flows` (pannello
  dopo 20 s), test del chiosco (`natpf-fiera`, `natpf-giocando-revisione`, `natpf-b46-caso-utente` caso 3).
- Nel browser `tools/e2e/natpf-phone-blackout.mjs`, parte D: partita contro la CPU, la rete trattiene i messaggi e li
  consegna al ritorno (come le ritrasmissioni di una Wi-Fi vera). Buio di **3 s**: nessuna caduta né «Ricollega»,
  «segnale debole», la partita riprende 3,2 s dopo. **7 s**: lo stesso, riprende 3,2–3,3 s dopo. **12 s**: caduta a
  10,3–10,6 s, «scollegato · si ricollega da solo» con il tempo, il telefono torna da solo (niente QR, calibrazione
  tenuta), la partita riprende 3,2 s dopo. Pannello con il QR mai aperto. Fase B: riga `tel` «caduto» con `motivo:
  'silenzio'`, `causa: 'computer'`, `ms` ≈ 10,5 s, `dove: 'partita'`; «ricollegato» con il motivo e i tentativi del
  telefono; nel pannello «Telefono 1: N cadute oggi · motivo più frequente: Wi-Fi ferma 10 s».
- Fase A (commit `506ec41`): gioco 1584/1584, sito 265/265, Windows 51/51, LAN 13/13, build, `audit:legend` uguale alla
  base; nel browser natpf-phone-blackout 10/10, natpf-training-reconnect 6/6, natpf-tutorial-relink 9/9,
  natpf-split-ready 34/34, natpf-scambi-di-prova 30/30, natpf-fiera-telefoni 38/38, natpf-mano-sicura 17/17,
  natpf-telecomando 88/88 (due giri a 87/88 sotto carico: «Salta» degli scambi di prova arriva alla pagina dopo più di 15 s
  perché la grafica software rallenta il gioco; non tocca il collegamento), natpf-swing-loss senza nessuna caduta a 0, 3 e
  8 % di pacchetti persi (i limiti di ritardo a 0 e 3 % non rispettati con la macchina carica, load 10: è una misura, da
  rifare con la macchina scarica).
- Fase B (commit «B45.1 FASE B PRONTA»): gioco 1584/1584, sito 265/265, Windows 51/51, LAN 13/13, build (stessi file
  della build messa nel programma provato), `audit:legend` uguale alla base. Nel browser natpf-phone-blackout **11/11**
  con la verifica dei motivi (riga «caduto» `motivo: 'silenzio'`, `ms` 10045, `dove: 'partita'`; «ricollegato» dopo 2,1 s
  con un tentativo; nel pannello «Telefono 1: 3 cadute oggi · motivo più frequente: Wi-Fi ferma 10 s»), natpf-menu 45/45;
  pannello dello stand con due telefoni caduti a 1024×600, 1280×720 e 1920×1080: righe in vista e «Chiudi» dentro lo
  schermo. Programma Windows su Linux (`prova-linux`, 8 scenari): **101/101** nell'ultimo giro (l'Alt riprovato non è
  servito); nei giri di prima della correzione finale 100/101 (l'Alt che chiude la barra in «predefinito», e una volta un
  tasto destro mancato in «solo-mouse» con la macchina a load 14). Il sito ha dato 264/265 in due giri con la macchina
  carica: `remote-pairing` «chiave sbagliata, risposta riusata», che aspetta la risposta del gioco con attese fisse di
  30 ms; da solo 18/18 tre volte, con una prova alla volta 265/265, e a confronto alla stessa ora con i file della fase A
  265/265 due volte con gli uni e due con gli altri: è il tempo, non il B45.1 (il test non tocca il codice cambiato).

## 8. Cosa non è stato verificato

- Nessuna rete vera della fiera, nessun router, nessun telefono vero (Android o iPhone), niente Windows vero né il
  ledwall: prove con Chromium su Linux, telefono simulato, rete finta nella pagina (messaggi trattenuti o buttati).
- La prova nel browser del buio usa la versione web (PeerJS) e non il server LAN del programma Windows: il controllo di
  vita e le scritte sono gli stessi, i tentativi senza fine della LAN sono provati con i test di unità.
- Su Chrome per Android il tipo di rete (`navigator.connection.type`) c'è; su iPhone no: lì vale solo l'evento `online`.
