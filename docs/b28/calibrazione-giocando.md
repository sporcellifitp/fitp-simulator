# B28 · Calibrazione giocando e tutorial senza blocco (12/11/2026)

Richiesta dell'utente allo stand delle Nitto ATP Finals (12/11, testuale): «Se ho tanta gente, la calibrazione ogni volta
me la rallenta. La farò una volta e poi farò giocare tante persone diverse spiegando loro i movimenti. […] Per quanto
riguarda la calibrazione, togli il check che uno deve aver fatto quel gesto per ogni schermata. Oggi se arrivo all'ultima
schermata e non ho fatto il servizio non posso andare avanti o chiudere quella modale, è molto fastidioso. Per me la
calibrazione deve avvenire direttamente giocando: si parte con qualche scambio, il software deve capire bene destra e
sinistra, velocità ed i parametri necessari, e poi dopo circa 10-15 secondi di scambi, parte il match vero.»

Contesto: un solo telefono dello staff passa di mano tra molti visitatori; l'addetto spiega i gesti a voce.

Base: `origin/natpf-simulator` `8b85a3c` (2026-11-12.2). Ramo `b28-cal-giocando`. Niente cambio di versione qui.

## 1. Cosa cambia per chi gioca

Con l'opzione dello stand di base («Calibrazione: Giocando») e il telefono come racchetta:

1. Menu → Gioca → Contro la CPU → Smartphone → QR → «Attiva i sensori».
2. Tutorial corto sul computer (5 schede), **una volta per abbinamento del telefono**: si chiude **subito, da qualunque
   scheda**, con «Tutto chiaro, ho capito» sul telefono, la X o Invio (o Esc) sul computer.
3. **Nessuna calibrazione con i gesti.** Il telefono è pronto da solo e si arriva alla pagina «Partita» (154 ms dal tocco
   di «Tutto chiaro» nella prova nel browser).
4. «Gioca»: scritta grande «**Scambi di prova · Colpisci la palla**» con quattro puntini (due per il dritto, due per il
   rovescio). Il lanciapalle manda palle facili alternate sul dritto e sul rovescio; sul telefono «Scambi di prova».
5. Dopo due colpi per lato (di solito quattro palle, circa 10 s) «**Si comincia!**» e la partita vera parte **da 0-0**
   con le sue regole (sorteggio, formato in fiera…). Nessun tocco in più, né sul computer né sul telefono.

| Percorso | Tocchi fino alla prima palla (prima → ora) | Da «Gioca» al primo punto vero |
|---|---|---|
| Contro la CPU | 13 → **9** | **11,4–11,6 s** colpendo le quattro palle; 16,3 s senza colpire mai |
| Stesso schermo (due telefoni) | 19 → **11** | **14,7 s** dalla fine del conto colpendo tutti e due; 18,6 s senza colpire mai |
| Sfida tra due computer | 18 → **14** | 0 s: gli scambi di prova si fanno prima, in campo (vedi §4) |

(`tools/e2e/natpf-flusso-tocchi.mjs` e `natpf-scambi-di-prova.mjs`, telefono simulato; i tocchi tolti sono le quattro
frecce «Avanti» del tutorial per telefono. Il tempo di una persona vera non è misurato. Chi colpisce una palla per lato e
perde le altre: 16,1 s.)

## 2. Parte A · Niente più blocchi nelle schermate guidate

Regola nuova: **in nessuna schermata guidata serve aver fatto un gesto per andare avanti.** Elenco dei punti cercati:

| Dove | Prima | Ora | Dal computer | Dal telefono |
|---|---|---|---|---|
| Modale del tutorial (gioco singolo, sfida, minigiochi, Allenamento) | «Tutto chiaro» e la X spenti finché tutte le schede non restavano 1 s a schermo; un «ok» in anticipo era rifiutato | sempre chiudibile | X (accesa da subito), Invio, Esc | «Tutto chiaro, ho capito» acceso da subito |
| Tutorial nelle due metà (stesso schermo) | come sopra, per ognuno | sempre chiudibile | X di ogni metà; Invio chiude le metà aperte; Esc resta «indietro» | «Tutto chiaro» di ciascun telefono |
| Esercizi dell'Allenamento e del riscaldamento: dritto, rovescio, servizio, incrociato, lungolinea | nessun limite di tentativi: chi non riusciva restava lì (solo «Salta ›», che chiudeva tutto) | «**Avanti ›**» passa all'esercizio dopo | `#coach-next`; «Salta tutto ›» chiude | pulsante «Avanti ›» sotto «Pronto» (messaggio `nx`) |
| Esercizi con 4 tentativi (volée, pallonetto, palla corta, tagliato, schiacciata, piatto) | passavano da soli dopo 4 tentativi | anche «Avanti ›» | come sopra | come sopra |
| Calibrazione con i gesti in campo (opzione «Con i gesti», «Calibra con i gesti») | «Modalità semplice» solo dopo una verifica fallita; «Salta ›» chiudeva tutto | «Salta la calibrazione ›» sempre | `#coach-next` | «Salta la calibrazione» nella schermata della calibrazione |
| Calibrazione con i gesti nel pannello del telefono (partita) | nessun modo di saltarla dal pannello | «Salta la calibrazione» | `#natpf-phone-skip` | «Salta la calibrazione» |
| Calibrazione nello stesso schermo | «Gioca senza calibrare» sul computer; profilo semplice dopo 3 verifiche fallite | uguale, più il telefono | `[data-split-skip]` | «Salta la calibrazione» |
| Scambi di prova | (nuovi) | finiscono da soli entro 14 s dalla prima palla | «Salta ›» accanto alla pausa | «Salta ›» sotto «Scambi di prova» |
| Lezione con la webcam | «Avanti ›» c'era già | invariata | sì | (niente telefono) |
| Minigiochi | a tempo o a numero di palle: nessun blocco | invariati | | |
| «Sono pronto» (sfida), conto alla rovescia (stesso schermo) | pulsanti e tempo, nessun gesto | invariati | | |
| Servizio in partita | serve il lancio (gesto o tocco sullo schermo del telefono); nello stesso schermo c'è «Lancio automatico» | invariato: è il gioco, non una schermata guidata | | |

Gli esercizi dell'Allenamento restano (lì si impara): semplicemente non bloccano.

**Telefono con la pagina vecchia in cache.** Verificato sul protocollo (test `natpf-tutorial`, `phone-screen`): il
computer manda `tp` con `all: 1` sempre, così una pagina di prima (che tiene «Tutto chiaro» spento finché non lo riceve) lo
accende subito; il testo di quella pagina dice «Hai visto tutto… poi si calibra» (sbagliato ma innocuo). Il profilo
semplice si chiede con il comando `skip`, che ogni pagina conosce. Una pagina vecchia non mostra «Scambi di prova» (resta
«Pronto»), né «Avanti ›» e «Salta la calibrazione», e ignora le soglie imparate (`pf`): gioca con le soglie del profilo
semplice. Non provato con una pagina vecchia vera nel browser.

## 3. Parte B · Cosa si impara dagli scambi di prova, e come

Codice: `natpf-tennis/src/natpf/natpf_trial_learn.js` (opzione e apprendimento, puro), `natpf_trial.js` (scambi di prova in
campo), `natpf_phone_racket.js` (`autoSimple`, `freshPlayer`, `beginTrial`/`trialBall`/`endTrial`, `ballSideNow`).

- **Telefono senza gesti.** Con «Giocando» e «Nessuna» il telefono, appena comincia a calibrare, riceve il comando di
  «Salta»: profilo semplice (verso dalla gravità, tipo di colpo dalla forma, forza dalla velocità vera).
- **Da capo a ogni partita.** All'inizio degli scambi di prova il telefono riparte dal profilo semplice (`cal` + `skip`):
  sul telefono si azzerano i colpi giocati e il segno imparato, sul computer colpo tipico, salita, piatto, mira, verso e
  prototipi dei colpi speciali. Chi gioca dopo non eredita niente (difetto 5 dell'audit B16).
- **Verso** (destra e sinistra). Il gioco sa da che parte della palla si mette il personaggio (piano d'intercetto): una
  palla alla destra di chi gioca chiede un gesto antiorario visto dall'alto (+1), a sinistra −1, **uguale per destri e
  mancini** (la mano decide solo quale dei due si chiama dritto). Il lato della palla vale come prova sul segno **solo se
  chi gioca ha mostrato i due versi, uno per lato**: almeno un colpo letto «a sinistra» su una palla a destra *e* almeno uno
  letto «a destra» su una palla a sinistra. Con i due versi al contrario e un quarto o meno dei colpi d'accordo (da due
  colpi in su) il segno si gira; il computer legge al contrario i colpi di quel telefono, anche quelli di prova già fatti,
  e manda al telefono il verso atteso girato. **Chi fa sempre lo stesso gesto non fa girare niente, mai**: non ha il
  telefono al contrario, gioca da un lato solo; senza i due versi non c'è informazione e resta la lettura della gravità
  (revisione, difetto 1: prima bastavano due dritti su due palle di rovescio, o un dritto mancato, per specchiare destra e
  sinistra per tutta la partita, perché la quinta e la sesta palla vanno dal lato «che manca»). La stessa regola vale nel
  voto del telefono (`swing-detect.js`, quattro colpi netti), che durante gli scambi di prova non vota (decide il
  computer: `setSignVote`, messaggio `ph` con `tr`) e gira solo su un colpo al contrario.
- **Forza** per verso (`refs`, mediana dei picchi), `ref`, `rawRef` sul picco vero; **salita** abituale per verso
  (`rises`); verso verticale del piatto (`heads`); **centro della mira** per verso (`faceRef[verso].heading`, che semina
  `aimModel`): gli stessi campi della calibrazione con i gesti. Il colpo tipico resta quello dei colpi di prova (come dopo
  il riscaldamento). Al telefono vanno le soglie sul proprio colpo (messaggio `pf`).
- **Quanti colpi.** Conta un colpo normale, con un verso, non debole (sotto metà degli altri); per ogni palla il gesto più
  forte. Livelli: `full` due per verso · `ok` uno per verso (quanto i due gesti di prima) · `partial` almeno due da una
  parte sola · `none` meno di due → resta il profilo semplice e il gioco impara dai primi colpi veri, come «Salta».
- **Palle e fine.** Dritto, rovescio, dritto, rovescio; poi dal lato che manca, fino a 6. Fine a due colpi per lato, a 6
  palle, o a 14 s dalla prima palla (più 1 s prima e 1 s di «Si comincia!»): non si resta mai fermi.
- **Non contano.** Nessun punto (il punto del motore diventa «palla finita»), nessuna scritta dell'esito, niente
  statistiche, classifiche, minigiochi, moviola o stanchezza; nella diagnostica `allenamento: true` e `prova: true`, quindi
  fuori dal «lato delle palle». Energia e servizio abituale ripartono con la partita.

### Decisioni prese

- **Scambi di prova a ogni «Gioca», senza eccezioni a tempo.** La proposta «saltarli se la partita di prima è finita da
  meno di N secondi» non regge allo stand: proprio quando c'è la fila il visitatore dopo arriva entro N secondi, e
  l'errore sarebbe silenzioso (forza tarata sul braccio di un altro). Rifarli alla stessa persona costa 10 s e non fa danni.
  Si saltano solo dove è certo che sono le stesse persone: **rivincita dai telefoni** nello stesso schermo e «**Gioca
  ancora**» del risultato di un minigioco (lì chi cambia usa «Nuovo giocatore», che serve anche per il nome in classifica).
- **Niente passa da un visitatore al successivo: il profilo ricorda come è stato fatto** (revisione, difetto 4;
  `NatpfPhoneRacket.madeBy`: `gesti`, `salta`, `auto`, `prova`).
  - «**Giocando**»: ogni «Gioca» rifà gli scambi di prova da un profilo nuovo. Unica eccezione: una calibrazione con i
    gesti fatta apposta («Calibra con i gesti» nel pannello del telefono) **dopo la fine dell'ultima partita** vale per la
    partita che segue, e basta (`gestureAt`, `keepsGesture`); fatta a partita in corso vale per quella partita. Prima un
    solo «Calibra con i gesti» spegneva gli scambi di prova per tutti i visitatori dopo.
  - «**Con i gesti**»: conta come calibrato solo un profilo fatto con i gesti (o saltato apposta con «Salta»), con la
    durata di prima del B28 (fino a «Nuovo giocatore» o «Ricalibra»). Un telefono rimasto con il profilo dato dal gioco o
    imparato dagli scambi di prova (l'opzione era un'altra) **rifà i gesti, senza rifare il QR**: subito se si è nel menu,
    altrimenti al prossimo «Gioca» (`calStale`, `demoteIfStale`).
  - «**Nessuna**»: profilo semplice da capo a ogni partita (con la stessa eccezione di una partita per chi ha appena
    calibrato apposta con i gesti: l'ha chiesto l'addetto, e non passa comunque a chi viene dopo).
  - **Cambiare l'opzione** vale dal prossimo «Gioca» senza riabbinare il telefono, e annulla il «vale per la prossima
    partita» di una calibrazione con i gesti fatta prima del cambio.
  - Restano le eccezioni dove le persone sono di sicuro le stesse: rivincita dai telefoni nello stesso schermo, «Gioca
    ancora» di un minigioco, il «Gioca» subito dopo «Riscaldati prima», la rivincita della sfida tra due computer.
- **«Ricalibra»** (pausa → Telefono): a partita in corso contro la CPU o nello stesso schermo rifà gli scambi di prova e
  rigioca il punto, con il punteggio com'era; nel menu, nei minigiochi e nella sfida tra due computer il telefono riparte
  dal profilo semplice. «Ricalibra» sul telefono: profilo semplice da capo, senza scambi di prova.
- **Stesso schermo: un palleggio assistito con una palla sola.** Il motore ha una palla: ogni colpo, comunque tirato, è
  rimandato dal gioco sul lato giusto dell'altro; una palla persa riparte per l'altro. Chi tiene il profilo dei gesti
  (calibrato apposta prima di questa partita) gioca il palleggio ma conta come «fatto»: gli scambi di prova finiscono
  quando ha imparato l'altro (revisione, difetto 7: prima arrivavano sempre al tetto di tempo). La pausa del telefono di
  uno dei due durante uno scambio di prova non «rigioca il punto»: la palla dopo arriva da sola (difetto 3).
- **Sfida tra due computer.** Alla partenza l'altro computer aspetta: gli scambi di prova si fanno prima, in campo, una
  volta. Chi invita dopo «Collega» (e dopo il tutorial), il Player 2 al posto della calibrazione in campo. Le rivincite
  tengono il profilo. Il Player 2 che li lascia a metà (pausa → «Torna al menu», chiosco) torna Player 2 non pronto nel suo
  pannello e li rifà con «Sono pronto», come con la calibrazione con i gesti interrotta (revisione, difetto 2).
- **Allenamento e «Riscaldati prima».** Niente tappa della calibrazione: i primi due esercizi (dritto e rovescio, palle dal
  lato noto) insegnano il profilo allo stesso modo; vale appena ci sono due colpi per lato. Dopo «Riscaldati prima» il
  «Gioca» che segue parte subito, senza scambi di prova (una volta: il colpo è appena stato imparato).
- **«Nessuna».** Niente scambi di prova, ma a ogni «Gioca» il telefono riparte comunque dal profilo semplice.
- **Rete lenta.** Il profilo da capo chiesto dal gioco all'inizio degli scambi di prova (o della partita con «Nessuna»)
  fa dire al telefono «calibrazione» per un attimo: è previsto, e per 2,5 s la guardia del telefono non lo prende per
  «Telefono non pronto» (`NatpfPhoneRacket.resetting`); la prima palla aspetta che il telefono sia pronto. Oltre 2,5 s
  la pausa arriva come sempre; in partita la guardia non cambia (revisione, difetto 6: con 0,5 s di rete la prima palla
  arrivava dopo 4,3 s invece di 1 s).
- **Telecomando dello staff (B27).** Gli scambi di prova sono una pagina «in campo» («Scambi di prova»: frecce e OK
  spenti, Indietro = pausa); «Salta» li salta, negli esercizi dell'allenamento è «Avanti ›», nel pannello del telefono
  «Salta la calibrazione»; «Ricalibra il telefono» fa quello che fa «Ricalibra» (in partita con «Giocando»: scambi di
  prova, anche nello stesso schermo). Matrice in `docs/b27/telecomando.md`.

## 4. Come si attiva

Pannello dello stand: **Ctrl+Maiusc+K**, oppure tenere premuto 3 secondi il marchio NATPF in alto a sinistra nel menu.
Voce «**Calibrazione**»: un clic passa a **Giocando → Con i gesti → Nessuna → Giocando**. Resta salvata su quel computer
(`localStorage`, chiave `natpf-tennis.calibrazione`); l'avviso dopo il clic e il `title` del pulsante dicono cosa fa.

| Valore | Cosa succede |
|---|---|
| **Giocando** (di base) | niente gesti a vuoto; a ogni «Gioca» circa 10 s di scambi di prova, poi il match da 0-0 |
| **Con i gesti** | come prima del B28: telefono fermo, un dritto e un rovescio a vuoto, poi la pagina «Partita» |
| **Nessuna** | si gioca subito; il gioco impara dai primi colpi veri (forza meno precisa nei primi tre colpi) |

Vale dalla prossima partita. Per le prove: `?cal=giocando|gesti|nessuna` nell'indirizzo comanda senza cambiare la scelta
salvata. La calibrazione con i gesti resta raggiungibile anche con «Giocando»: pausa → Telefono → «**Calibra con i gesti**».

Il pannello ha 13 voci nella griglia (tre colonne da 700 px di larghezza, file più strette sotto 680 px di altezza) e,
dal B27, «Telecomando dello staff» e «Schermo del gioco» nella riga in basso. Con le voci vere del B27 e «Calibrazione»
`natpf-menu` lo prova senza scorrere e con «Chiudi» in vista a 1366×657, 1024×600, 1280×720, 1024×1024 e **720×720**.

## 5. Banco: i tre percorsi a confronto

`node --import ./test/register.mjs scripts/audit/scambi-di-prova.mjs` (da `natpf-tennis/`; telefono simulato con il
braccio; 12 telefoni × 10 colpi per riga, cioè 120 colpi; non è una misura di persone). Riferimento: lo stesso gesto letto
da un telefono «assestato» della stessa persona. «2 gesti» in tre versioni: **colpetto** (forza 0,4–0,7 del proprio colpo
e piatto girato a caso, come nei colpi veri: nessuno mira un gesto a vuoto), **colpetto con il piatto dritto**, **da
manuale** (forti come il proprio colpo, piatto dritto: il caso migliore possibile).

### Mano destra

| Persona | Percorso | lato≠ | persi | \|Δforza\| (primi 3) | \|Δmira\| | senza mira | seme della mira |
|---|---|---|---|---|---|---|---|
| adulto | 2 gesti (colpetto) | 0 | 0 | 0,07 (0,11) | 6,6° | 0 | 6,0° |
| | 2 gesti (colpetto, piatto dritto) | 0 | 0 | 0,07 (0,11) | 3,5° | 0 | 3,5° |
| | 2 gesti (da manuale) | 0 | 0 | 0,04 (0,02) | 2,6° | 0 | 1,7° |
| | «Salta» / Nessuna | 0 | 0 | 0,05 (0,07) | 6,4° | 69 | – |
| | **scambi di prova 2+2** | **0** | **0** | **0,04 (0,03)** | **4,5°** | **0** | **4,7°** |
| | scambi di prova 1+1 | 0 | 0 | 0,04 (0,04) | 7,3° | 0 | 8,6° |
| | scambi, solo dal dritto | 0 | 0 | 0,04 (0,04) | 5,4° | 33 | 6,0° |
| | scambi, mai un colpo | 0 | 0 | 0,05 (0,07) | 6,5° | 69 | – |
| adulto forte | 2 gesti (colpetto) | 0 | 0 | 0,07 (0,12) | 6,8° | 0 | 6,3° |
| | 2 gesti (da manuale) | 0 | 0 | 0,04 (0,03) | 2,5° | 0 | 1,6° |
| | «Salta» / Nessuna | 0 | 0 | 0,06 (0,07) | 6,3° | 69 | – |
| | **scambi di prova 2+2** | **0** | **0** | **0,04 (0,03)** | **4,2°** | **0** | **4,7°** |
| bambino debole | 2 gesti (colpetto) | 0 | 0 | 0,06 (0,09) | 7,0° | 0 | 6,5° |
| | 2 gesti (da manuale) | 0 | 0 | 0,04 (0,02) | 2,4° | 0 | 1,8° |
| | «Salta» / Nessuna | 0 | 1 | 0,10 (0,23) | 7,5° | 69 | – |
| | **scambi di prova 2+2** | **0** | **0** | **0,04 (0,03)** | **5,0°** | **0** | **5,5°** |
| gesto impreciso | 2 gesti (colpetto) | 0 | 1 | 0,09 (0,16) | 11,0° | 0 | 10,4° |
| | 2 gesti (da manuale) | 0 | 16 | 0,05 (0,04) | 3,3° | 0 | 3,0° |
| | «Salta» / Nessuna | 0 | 3 | 0,06 (0,05) | 12,4° | 62 | – |
| | **scambi di prova 2+2** | **0** | **12** | **0,05 (0,05)** | **9,4°** | **0** | **9,7°** |

Mancino: stessi numeri entro uno o due colpi (adulto: scambi 2+2 lato≠ 0, persi 0, \|Δforza\| 0,04 (0,03), \|Δmira\| 4,7°;
bambino 0 / 0 / 0,04 (0,04) / 5,5°; impreciso 0 / 13 / 0,05 (0,05) / 9,6°). Tabelle complete: uscita del comando.

### Verso della gravità invertito (il telefono dà l'accelerazione con il segno opposto)

| Persona (destro) | «Salta»: colpi letti dal lato sbagliato | Scambi di prova 2+2 |
|---|---|---|
| adulto | 36 su 120 | **0** (segno girato in 12 telefoni su 12) |
| adulto forte | 36 su 120 | **0** |
| bambino debole | 45 su 120 | **0** |
| gesto impreciso | 42 su 120 | **0** |

Mancino: 36, 36, 46, 42 → 0. I due gesti di prima gestivano questo caso con tre tentativi sul primo gesto (non simulato qui).
(Dal giro 2, con la regola dei due versi anche nel voto del telefono, «Salta» con il verso invertito dà 38, 38, 48, 44
colpi su 120 dal lato sbagliato per il destro e 38, 38, 49, 44 per il mancino: il telefono aspetta un colpo al contrario
da tutti e due i lati prima di girarsi. Gli scambi di prova restano a 0.)

### Chi colpisce da un lato solo (revisione, difetto 1)

Scambi di prova con lo stesso gesto su ogni palla, poi in partita 4 dritti e 4 rovesci fatti bene; 12 telefoni, adulto.
«Girati» = telefoni in cui il segno è stato girato (dal gioco o dal telefono).

| Negli scambi di prova (destro e mancino uguali) | Girati | Colpi della partita letti dal lato sbagliato |
|---|---|---|
| solo dritti, nessuna palla persa | 0 su 12 | **0 su 96** |
| solo dritti, la prima persa (prima della correzione: 48 su 48 dritti letti rovesci) | 0 su 12 | **0 su 96** |
| solo dritti, due perse | 0 su 12 | **0 su 96** |
| solo rovesci | 0 su 12 | **0 su 96** |
| verso invertito, i due gesti | 12 su 12 | **0 su 96** |
| verso invertito, solo dritti (limite scritto al §7) | 12 su 12, in partita, dal telefono | 37 su 96 (i primi colpi) |

Le altre righe del banco (forza, tipo, persi, mira, telefono che passa di mano, lato delle palle) sono uguali al giro 1:
cambiano solo le righe «Salta, verso invertito» dette sopra (confronto riga per riga delle due uscite).

### Telefono che passa di mano (senza «Nuovo giocatore»): forza dei primi 3 colpi del secondo

| Chi gioca | Prima (gesti del primo, o «Salta») | Scambi di prova a ogni partita | Sua forza assestata |
|---|---|---|---|
| adulto forte → bambino debole | **0,05** (errore 0,29; 4 colpi persi su 36) | **0,32** (errore 0,03; 0 persi) | 0,32–0,35 |
| bambino debole → adulto forte | **0,81** (errore 0,21) | **0,59** (errore 0,03) | 0,60 |

(L'audit B16 misurava 0,08 invece di 0,25 e 0,68 invece di 0,37: stesso difetto, stesso verso.)

### Lato delle palle (`colpi.mjs --mode=lato`, mira alta 17°, 48 partite da 40 colpi) con l'errore del seme di ogni percorso

| Percorso | Errore del seme | Partite sbilanciate | \|mediana x\| | Riferimento storto |
|---|---|---|---|---|
| seme giusto (riferimento) | 0° | 0 % | 0,47 m | 0 su 24 |
| 2 gesti (da manuale) | ±2,0° | 0 % | 0,50 m | 1 |
| 2 gesti (colpetto, piatto dritto) | ±3,4° | 2,1 % | 0,53 m | 3 |
| **scambi di prova 2+2** | **±6,3°** | **6,3 %** | **0,66 m** | **7** |
| 2 gesti (colpetto) | ±7,4° | 8,3 % | 0,73 m | 9 |
| scambi di prova 1+1 | ±10,5° | 25 % | 0,96 m | 24 |

### Come leggerli

- **Forza**: gli scambi di prova sono pari ai due gesti fatti da manuale (0,04, primi tre colpi 0,03) e meglio dei gesti a
  vuoto deboli (0,07; 0,11 nei primi tre) e di «Salta» per chi è lontano dalla media (bambino: 0,23 nei primi tre).
- **Lato**: mai sbagliato in nessun percorso con il verso giusto; con il verso invertito solo gli scambi di prova lo
  correggono subito.
- **Dove sono peggio dei due gesti, con i numeri**:
  - **mira**: il centro seminato da due colpi veri per lato sbaglia di 4,7–5,5° (9,7° il gesto impreciso), contro 1,6–1,8°
    dei gesti da manuale e 2,1–4,6° del colpetto con il piatto dritto; \|Δmira\| nei primi 10 colpi 4,2–5,0° contro
    2,4–2,6°. È meglio dei gesti a vuoto con il piatto variabile (6,0–6,5°). Quale dei due casi somigli ai gesti a vuoto di
    una persona vera non lo sappiamo: le diagnostiche del 23 e del 29/10 mostravano semi della calibrazione molto sbagliati.
    Il centro si corregge da solo sui primi colpi veri (verifica dopo 4 colpi, come per i gesti);
  - **una palla per lato** (chi ne perde quattro su sei): seme ±8,6–10,5°, partite sbilanciate 25 % nel modello del lato;
  - **colpi persi del gesto impreciso** (forza ±40 %): 12–13 su 120, contro 1 con i gesti a vuoto deboli, 3 con «Salta»
    e 16 con i gesti da manuale. Sono i colpi sotto il 40–50 % del proprio colpo tipico, che il telefono scarta come
    «deboli»: la stessa regola della calibrazione con i gesti, con il colpo tipico vero. Provato e scartato: mandare al
    telefono il colpo tipico ridotto a tre quarti (impreciso 12 → 7, ma al bambino debole 0 → 6 colpi doppi).
- **Chi non colpisce mai**: identico a «Salta» (nessun danno, nessun guadagno).

## 6. Prove fatte (numeri)

- Gioco `npm test`: **1214/1214** (base 1185/1185). Nuovi: `natpf-scambi-di-prova` (25), `natpf-niente-blocchi` (4);
  aggiornati `natpf-tutorial` (17), `natpf-split`. I test nuovi non esistono sulla base (i moduli non ci sono).
  **Nel mondo di prova dei test l'opzione è «Con i gesti» di base** (`makeWorld({ cal })`): i test di prima provano la
  calibrazione con i gesti, che resta; quelli nuovi passano `cal: 'play'`.
- Sito `node --test tools/test/*.test.mjs`: **208/208** (base 205). LAN: **12/12**. `npm run build`: ok.
  `npm run audit:legend`: tutti i criteri rispettati (il motore della CPU non è toccato).
- Nel browser (Chromium, telefono simulato, una prova alla volta):

| Prova | Esito |
|---|---|
| `natpf-scambi-di-prova` (nuova) singolo destro, completa | 25/25 · 11,4 s |
| … mancino (`HAND=left`) | 20/20 · 11,6 s · palle −1, +1, −1, +1 |
| … nessun colpo (`HITS=none`) | 18/18 · 16,3 s · profilo semplice |
| … una palla per lato (`HITS=one`) | 18/18 · 16,1 s · profilo «ok» |
| … stesso schermo (`FLOW=stesso`) | 12/12 · 14,7 s · 4 colpi a testa |
| … 1024×1024 con le schermate (singolo e stesso) | 19/19 e 11/11 |
| `natpf-flusso-tocchi` singolo · stesso · 1v1 | 9 · 11 · 14 tocchi (5/5, 6/6, 8/8) |
| `natpf-training-flow` destro e mancino (con i gesti) | 21/21 e 21/21 |
| `natpf-tutorial-phone` destro e mancino | 46/46 e 46/46 |
| `natpf-tutorial-relink` | 9/9 |
| `natpf-split-ready` | 34/34 |
| `natpf-menu` (pannello dello stand a tre misure) | 28/28 |
| `natpf-modale-gesti` | 29/29 |
| `natpf-mira-lato` | 23/23 |
| `natpf-diag-session` | 24/24 |
| `natpf-1v1-p2p` (sulla build) | 39/39 |
| `gesture-calibration` (run-local) | 20/20 |

Le prove scritte prima del B28 girano con `CAL=gesti` (lo mettono da sole: `process.env.CAL ||= 'gesti'`).
Schermate guardate: 1280×720 e 1024×1024, contro la CPU e nello stesso schermo. A 1024×1024 il titolo è circa 61 px,
l'occhiello 31 px, la riga sotto 25 px; misure in `cqw`/`cqh`.

### Giro 2 (12/11, dopo la revisione indipendente e l'unione con il B27, versione di base 2026-11-12.3)

Ogni difetto della revisione è stato prima riprodotto con lo script del revisore (`scratchpad b28/review/`), poi fissato
in un test che fallisce senza la correzione (controllato togliendo la correzione), poi corretto.

| Difetto della revisione | Esito | Test |
|---|---|---|
| 1 · chi colpisce da un lato solo resta specchiato | corretto: regola dei due versi, nel gioco e nel voto del telefono | `natpf-scambi-di-prova` «revisione 1» (2), `natpf-racchetta` (voto del telefono), banco |
| 2 · Player 2 dell'invito che lascia gli scambi di prova: computer da ricaricare | corretto | `natpf-giocando-revisione` «revisione 2» |
| 3 · pausa del telefono del Player 2 negli scambi di prova: 21 s fermi | corretto (17,7 s con 1 s di telefono fermo e il conto alla rovescia, tutti e due `full`) | «revisione 3» |
| 4 · opzione cambiata, eredità tra visitatori | corretto: il profilo ricorda come è stato fatto | «revisione 4» (3) |
| 5 · colpi pianissimi | **non corretto, limite scritto** (provato e scartato: colpi doppi) | `natpf-scambi-di-prova` «limite scritto (revisione 5)» |
| 6 · pausa di 3 s all'inizio con la rete lenta | corretto: prima palla a 1,0 s con 0,5 s di rete, a 1,5 s con 1,5 s; nessuna pausa | «revisione 6» |
| 7 · stesso schermo con un giocatore che tiene i gesti: sempre al tetto | corretto (13,1–13,7 s) | «revisione 7» |

- Gioco `npm test`: **1242/1242** (dopo l'unione, prima delle correzioni: 1223/1223). Sito: **226/226**. LAN: **12/12**. Programma
  Windows (`natpf-desktop`, `npm test`): **33/33**. `npm run build`: ok. `npm run audit:legend`: tutti i criteri rispettati (il motore della CPU non è toccato).
- Banco (`scripts/audit/scambi-di-prova.mjs`, 12 telefoni × 10 colpi, uscita in `scratchpad b28/banco/giro2.txt`): tabelle
  uguali al giro 1 tranne «Salta, verso invertito» (§5); nuova tabella «da un lato solo» (§5).
- Prove della modalità di base nei test: `natpf-giocando-revisione.test.mjs` (15), con il mondo di prova in `cal: 'play'`.
- Nel browser (Chromium, telefono simulato, una prova alla volta, dopo tutte le correzioni):

| Prova | Modalità | Esito |
|---|---|---|
| `natpf-scambi-di-prova` singolo destro | di base | 25/25 · 11,4 s (con le schermate 24/24) |
| … mancino · nessun colpo · una palla per lato | di base | 25/25 · 18/18 (16,2 s) · 18/18 (16,2 s) |
| … stesso schermo · stesso schermo 1024×1024 con le schermate | di base | 12/12 (14,7 s) · 11/11 |
| `natpf-flusso-tocchi` singolo · stesso · 1v1 | di base | 5/5 · 6/6 · 8/8 (9 · 11 · 14 tocchi; senza colpire 17,1 s e 18,8 s) |
| `natpf-menu` (pannello dello stand a 5 misure, con «Calibrazione» e le voci del B27) | di base | 45/45 |
| `natpf-telecomando` (sulla build, porte 4902/4903) | **di base** (senza `CAL`) | 80/80 |
| `natpf-training-flow` destro · mancino | `CAL=gesti` | 21/21 · 21/21 |
| `natpf-tutorial-phone` destro · mancino | `CAL=gesti` | 46/46 · 46/46 |
| `natpf-tutorial-relink` · `natpf-split-ready` | `CAL=gesti` | 9/9 · 34/34 |
| `natpf-1v1-p2p` (sulla build) | `CAL=gesti` | 39/39 |
| `natpf-stesso-schermo-b20` (13 pulsanti nel pannello) | `CAL=gesti` | 52/52 |
| `natpf-diag-session` | `CAL=gesti` · **di base** (`CAL=base`) | 24/24 · 24/24 |
| `natpf-nuovo-giocatore` (adattata: scambi di prova giocati dopo «Gioca») | **di base** | 30/30 |
| `natpf-formato-fiera` (senza modifiche) | **di base** | 22/22 |
| `natpf-stesso-schermo-b25` (adattata: scambi di prova saltati con «Salta ›») | **di base** | 55/55 |
| `natpf-rally` (adattata: telefono pronto senza gesti, scambi di prova, poi lo scambio sul profilo imparato) | **di base** | 9/9 |
| `natpf-servizio-lancio` (adattata allo stesso modo) | **di base** | 12/12 |
| `natpf-phone-blackout` (adattata: parti A e C; la B riguarda solo i gesti della calibrazione) | **di base** | 6/6 |
| `natpf-phone-keep` (adattata) | `CAL=gesti` · **di base** | 13/13 · **12/13, tre volte su tre** |
| `natpf-mira-lato` · `natpf-modale-gesti` | `CAL=gesti` | 23/23 · 29/29 |
| `gesture-calibration` (run-local, pagina del telefono: il rilevatore dei gesti è cambiato nel voto sul segno) | — | 20/20 |

**`natpf-phone-keep` nella modalità di base: una verifica di tempo non passa.** «A · sensori fermi: il computer va in
pausa» chiede la pausa entro 1500 ms; nella modalità di base arriva a 1508, 1663 e 1563 ms (tre prove, l'ultima da sola),
con `CAL=gesti` a 1392 ms. Le altre 12 verifiche passano. Spiegazione dalle costanti, non misurata: la pausa arriva quando
un segnale del telefono (uno al secondo) dice «ultimo campione da più di 700 ms», più 300 ms di grazia, quindi tra 1,0 e
2,0 s dopo lo stop dei sensori secondo il momento del segnale; nella modalità di base la prova arriva a quel punto in un
altro momento (scambi di prova al posto della calibrazione). La soglia della prova non è stata toccata.

## 7. Limiti e cose non provate

- **Non provato**: telefoni veri (iPhone e Android), persone vere, Windows, ledwall. Tutte le misure sono del telefono
  simulato; i 10–15 s sono con colpi a tempo perfetto.
- Con una **pagina del telefono vecchia in cache** il percorso funziona ma senza le scritte e i pulsanti nuovi (§2); non
  provato con una pagina vecchia vera.
- **Telefono al contrario e un gesto solo**: chi fa sempre lo stesso gesto non dà al gioco modo di capire un telefono
  con il verso della gravità invertito: resta la lettura dalla gravità (i suoi dritti letti rovesci) finché non fa anche
  l'altro gesto dall'altro lato; da lì il telefono si corregge con i suoi quattro voti (banco: 37 colpi su 96 dal lato
  sbagliato nei primi colpi della partita, 12 telefoni su 12 poi corretti). È la scelta della revisione: meglio questo
  che specchiare chi ha il telefono giusto e gioca da un lato solo.
- **Colpi pianissimi** (revisione, difetto 5: 0,2 volte il colpo di un adulto, picco attorno a 130 °/s): restano sotto le
  soglie del profilo semplice (inizio 70, picco 120 °/s). Gli scambi di prova non imparano in 6 telefoni su 8 e in partita
  si leggono 20 colpi su 80 (con i due gesti 80 su 80); a 0,25× 74 su 80, da 0,3× tutti. **Provato e scartato**: abbassare
  le soglie del telefono durante gli scambi di prova. Con il profilo semplice (senza l'asse dei gesti, che scarta i
  movimenti nel verso sbagliato) le soglie basse fanno **colpi doppi a tutti**: 17 su 80 a chi colpisce pianissimo, 9–18 su
  80 alle altre persone del banco se scattano per errore (`scratchpad b28/banco/giro2-colpi-deboli.txt`). Per questo
  giocatore la via è pausa → Telefono → «**Calibra con i gesti**» (vale per la partita). Un test fissa il limite.
- **Pagina del telefono ricaricata a metà partita** con «Giocando»: il telefono torna da calibrare, riceve il profilo
  semplice e si gioca; il profilo imparato dagli scambi di prova è perso fino alla partita dopo (il gioco reimpara dai
  colpi veri, come «Salta»). Caduta e ritorno del collegamento e schermo spento tengono profilo e verso.
- **Pagine del telefono di prima in cache**: non hanno la regola dei due versi nel voto sul segno né `setSignVote`; lì
  chi gioca da un lato solo può ancora essere specchiato dal voto del telefono durante la partita (non dal computer).
- **Sfida tra due computer**: scambi di prova una volta sola per pagina aperta; un'altra persona sullo stesso computer
  deve usare «Nuovo giocatore» dal pannello dello stand (come prima).
- **Stesso schermo**: nel palleggio assistito ogni colpo va in campo comunque; chi non colpisce mai allunga gli scambi di
  prova fino a 18,6 s dalla fine del conto.
- **Trovato e non toccato** (causa trovata dalla revisione, di prima del B28, del lavoro sul gameplay): a ogni contatto
  il gioco fa un fermo di 34–48 ms (`swing_vfx.js`, la classe del tempismo vale «PERFECT» se manca) che ferma la fisica
  (`game_engine.js`) mentre l'orologio del piano d'intercetto (`plan.at`) continua: dopo il primo colpo dello scambio il
  piano non «combacia» più con la palla e `natpf_impact.livePlan` risulta falso vicino all'impatto (visto nel browser sul
  Player 2 dello stesso schermo, che riceve dopo il colpo del Player 1). Qui non si tocca: per il lato della palla degli
  scambi di prova `ballSideNow(engine, ruolo, da)` accetta anche il piano fatto **da quando è partita quella palla**
  (`trial.at`), che dice lo stesso lato.
- Le prove nel browser non rifatte dopo questo blocco: tutte le `natpf-*` non elencate al §6 (hanno solo ricevuto
  `CAL=gesti`). Nel giro 1 `natpf-stesso-schermo-b20` e `b25` non erano state rifatte e contavano ancora 12 pulsanti nel
  pannello dello stand (sono 13 dal B28): corrette e rifatte nel giro 2.

## 8. File toccati

Nuovi: `natpf-tennis/src/natpf/natpf_trial_learn.js`, `natpf_trial.js`, `natpf-tennis/scripts/audit/scambi-di-prova.mjs`,
`natpf-tennis/test/natpf-scambi-di-prova.test.mjs`, `natpf-niente-blocchi.test.mjs`, `trial-world.mjs`,
`tools/e2e/natpf-scambi-di-prova.mjs`, questo documento.

Modificati (gioco): `natpf_phone_racket.js`, `natpf_tutorial.js`, `natpf_training.js`, `natpf_lobby.js`, `natpf_ui.js`,
`natpf_split_ui.js`, `natpf_versus_ui.js`, `natpf_kiosk.js`, `natpf_pause.js`, `natpf_replay.js`, `natpf_serve_coach.js`,
`diag/diag_recorder.js`, `game_engine.js` (tre righe: gli scambi di prova non sono «partita»), `index.html`,
`natpf-ui.css`. Telefono: `site/js/tennis/racchetta.js`, `phone-screen.js`, `link.js`, `site/tennis/racchetta.html`.
Prove: `test/ui-world.mjs`, `test/phone-sim.mjs`, `scripts/audit/colpi.mjs` (una riga), `tools/e2e/th.mjs` e gli script
`natpf-*`.

Giro 2. Nuovi: `natpf-tennis/test/natpf-giocando-revisione.test.mjs`, `tools/e2e/prova.mjs`. Modificati (gioco):
`natpf_trial_learn.js`, `natpf_trial.js`, `natpf_phone_racket.js`, `natpf_phone_watch.js`, `natpf_ui.js`,
`natpf_split_ui.js`, `natpf_versus_ui.js`, `natpf_kiosk.js`, `natpf_training.js`, `natpf_remote.js`,
`natpf_remote_map.js`. Telefono: `site/js/tennis/swing-detect.js`, `racchetta.js`. Prove: `test/trial-world.mjs`,
`test/phone-sim.mjs`, `test/natpf-scambi-di-prova.test.mjs`, `test/natpf-racchetta.test.mjs`,
`test/natpf-telecomando.test.mjs`, `tools/test/phone-screen.test.mjs`, `scripts/audit/scambi-di-prova.mjs`,
`scripts/audit/colpi.mjs`, `tools/e2e/th.mjs`, `natpf-menu.mjs`, `natpf-rally.mjs`, `natpf-servizio-lancio.mjs`,
`natpf-phone-keep.mjs`, `natpf-nuovo-giocatore.mjs`, `natpf-stesso-schermo-b20.mjs`, `natpf-stesso-schermo-b25.mjs`,
`natpf-phone-blackout.mjs`. Documenti: questo, `docs/b27/telecomando.md`, `docs/GUIDA_TELECOMANDO.md`,
`docs/PROJECT_MEMORY.md`, `docs/WORK_PROGRESS.md`, `tools/e2e/README.md`.
