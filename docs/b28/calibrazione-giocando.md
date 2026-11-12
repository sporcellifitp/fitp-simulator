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
frecce «Avanti» del tutorial per telefono. Il tempo di una persona vera non è misurato.)

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
  mancini** (la mano decide solo quale dei due si chiama dritto). Se dopo almeno due colpi netti un quarto o meno
  concordano, il segno si gira; il computer legge al contrario i colpi di quel telefono, anche quelli di prova già fatti, e
  manda al telefono il verso atteso girato. Chi tira sempre lo stesso gesto (metà d'accordo) non fa girare niente.
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
- **Chi ha calibrato apposta con i gesti tiene il suo profilo** («Calibra con i gesti» nel pannello del telefono): niente
  scambi di prova finché non si preme «Nuovo giocatore» o «Ricalibra».
- **«Ricalibra»** (pausa → Telefono): a partita in corso contro la CPU o nello stesso schermo rifà gli scambi di prova e
  rigioca il punto, con il punteggio com'era; nel menu, nei minigiochi e nella sfida tra due computer il telefono riparte
  dal profilo semplice. «Ricalibra» sul telefono: profilo semplice da capo, senza scambi di prova.
- **Stesso schermo: un palleggio assistito con una palla sola.** Il motore ha una palla: ogni colpo, comunque tirato, è
  rimandato dal gioco sul lato giusto dell'altro; una palla persa riparte per l'altro.
- **Sfida tra due computer.** Alla partenza l'altro computer aspetta: gli scambi di prova si fanno prima, in campo, una
  volta. Chi invita dopo «Collega» (e dopo il tutorial), il Player 2 al posto della calibrazione in campo. Le rivincite
  tengono il profilo.
- **Allenamento e «Riscaldati prima».** Niente tappa della calibrazione: i primi due esercizi (dritto e rovescio, palle dal
  lato noto) insegnano il profilo allo stesso modo; vale appena ci sono due colpi per lato.
- **«Nessuna».** Niente scambi di prova, ma a ogni «Gioca» il telefono riparte comunque dal profilo semplice.

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

Il pannello ora ha 13 pulsanti: tre colonne da 700 px di larghezza e file più strette sotto 680 px di altezza. Provato
senza scorrere e con «Chiudi» in vista a 1024×600, 1366×657, 1280×720, 720×720, 1920×540, 1024×1024 e 1920×1080, **anche
con 15 pulsanti** (i due del telecomando dello staff, B27, simulati).

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

- Gioco `npm test`: **1213/1213** (base 1185/1185). Nuovi: `natpf-scambi-di-prova` (24), `natpf-niente-blocchi` (4);
  aggiornati `natpf-tutorial` (17), `natpf-split`. I test nuovi non esistono sulla base (i moduli non ci sono).
  **Nel mondo di prova dei test l'opzione è «Con i gesti» di base** (`makeWorld({ cal })`): i test di prima provano la
  calibrazione con i gesti, che resta; quelli nuovi passano `cal: 'play'`.
- Sito `node --test tools/test/*.test.mjs`: **208/208** (base 205). LAN: **12/12**. `npm run build`: ok.
  `npm run audit:legend`: tutti i criteri rispettati (il motore della CPU non è toccato).
- Nel browser (Chromium, telefono simulato, una prova alla volta):

| Prova | Esito |
|---|---|
| `natpf-scambi-di-prova` (nuova) singolo destro, completa | 25/25 · 11,6 s |
| … mancino (`HAND=left`) | 20/20 · 11,4 s · palle −1, +1, −1, +1 |
| … nessun colpo (`HITS=none`) | 18/18 · 16,3 s · profilo semplice |
| … una palla per lato (`HITS=one`) | 18/18 · 16,3 s · profilo «ok» |
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

## 7. Limiti e cose non provate

- **Non provato**: telefoni veri (iPhone e Android), persone vere, Windows, ledwall. Tutte le misure sono del telefono
  simulato; i 10–15 s sono con colpi a tempo perfetto.
- Con una **pagina del telefono vecchia in cache** il percorso funziona ma senza le scritte e i pulsanti nuovi (§2); non
  provato con una pagina vecchia vera.
- **Verso sbagliato con un solo gesto**: chi tira sempre di dritto, anche sulle palle a sinistra, non dà al gioco modo di
  capire un telefono al contrario (voti metà e metà): resta la lettura dalla gravità, come prima.
- **Sfida tra due computer**: scambi di prova una volta sola per pagina aperta; un'altra persona sullo stesso computer
  deve usare «Nuovo giocatore» dal pannello dello stand (come prima).
- **Stesso schermo**: nel palleggio assistito ogni colpo va in campo comunque; chi non colpisce mai allunga gli scambi di
  prova fino a 18,6 s dalla fine del conto.
- **Trovato e non toccato**: il piano d'intercetto del Player 2 nello stesso schermo non «combacia» più con la palla circa
  0,2 s prima dell'impatto (`natpf_impact.livePlan` falso nel browser). Per gli scambi di prova si usa il piano fatto da
  quando è partita la palla; l'effetto sul resto del gioco non è stato indagato.
- Le prove nel browser non rifatte dopo questo blocco: tutte le `natpf-*` non elencate al §6 (hanno solo ricevuto
  `CAL=gesti`), `natpf-nuovo-giocatore`, `natpf-stesso-schermo-b20`/`b25`, `natpf-formato-fiera`.

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
