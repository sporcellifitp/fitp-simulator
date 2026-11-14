# B47 · Fiera subito: battuta a un solo giocatore, conto alla rovescia grande, livello dopo «Rivincita»

Ramo `b47-fiera-subito` (da `int-b38-b39`, `55e818a`), 14/11/2026. Niente push e niente versione: li fa chi unisce.

## Le richieste (parole dell'utente del 14/11)

«in modalità evento quindi fiera, dopo "rivincita", devo poter impostare i livelli di difficoltà (es. adulto bambino
ragazzo). Inoltre ha più senso lasciare la battuta ad un solo giocatore piuttosto che alternata perché la gente non lo
capisce. Infine, tra il momento degli scambi della calibrazione e del match, prevedi un countdown grosso centrale che dice
"Preparati, la partita sta per cominciare".»

Le decisioni del coordinatore (prese per non fermare lo stand con domande) sono riportate qui sotto con quello che è
stato fatto. Il programma si usa sul ledwall con il solo mouse: le tre novità si usano con un clic (o non vanno usate).

## 1. Battuta a un solo giocatore

**Cosa vede lo staff.** Pannello dello stand → voce nuova **«Battuta: Sempre lo stesso · Alternata»**, di base **«Sempre
lo stesso»**, salvata. Un clic cambia; vale dalla partita dopo.

**Cosa succede con «Sempre lo stesso»** (di base):
- contro la CPU batte **sempre chi gioca** (il visitatore), in tutti i game, anche se «Batte per primo» dice «CPU»;
- nello stesso schermo batte **per tutta la partita chi batte il primo game** («Batte per primo», di base il sorteggio:
  la scritta d'inizio dice «Sorteggio: batte sempre Giulia»);
- in tutti i formati: game classico, formato in fiera (resta il punto decisivo sul 40-40, non il servizio ogni due punti),
  campo aperto; nessun tie-break nel gioco (la partita si vince a game);
- il lato del servizio (destra, sinistra) cambia a ogni punto come sempre;
- tabellone (pallina e «Al servizio»), icona del servizio del B44, servizio automatico, telefono («Al servizio») e CPU
  seguono `score.server`, quindi restano coerenti senza cambi;
- nella sfida tra due computer resta alternata, come prima.

Con «Alternata» tutto come prima della B47. L'indirizzo `?battuta=fissa|alternata` la forza per la pagina (prove).

**Pannello a 720 × 720.** Con la voce nuova i pulsanti sono 15 (cinque file da tre): con le opzioni accese (scritte su due
righe) il foglio scorreva di 38 px e «Chiudi» finiva sotto il bordo. A questa misura pulsanti e foglio sono un poco più
bassi e il foglio sta in alto invece che al centro: la riga che spiega la voce sotto il puntatore (B39.3) va su più
righe e, con il foglio al centro, tutto saliva sotto il mouse e il clic finiva fuori dal pulsante (lo ha trovato la
prova `natpf-menu`: il clic su «Calibrazione» a 720 × 720 non arrivava al pulsante).

**Codice.** `natpf-tennis/src/natpf/natpf_battuta.js` (nuovo, funzioni pure: regola salvata, scritte del pannello,
`matchServe`; `fairServer` della B41 spostata qui e riesportata da `natpf_fiera.js`); `natpf_fair_format.nextServe`
(parametro `fixed`); `game_engine.startNewMatch` (`score.fixed`) e `_awardPoint`; `natpf_kiosk.js` e `index.html` (voce
del pannello); `natpf_point_call.firstServeText` («batte sempre»); `natpf_ui.backToMenu` azzera `score.fixed`.

**Banco delle simulazioni.** `scripts/audit/headless-engine.mjs` usa `natpfServeRule: 'alternata'`: il banco della
Leggenda (`npm run audit:legend`) simula partite contro la CPU con il servizio alternato come prima, così i numeri restano
confrontabili (con «Sempre lo stesso» la CPU non batterebbe mai e i numeri cambierebbero per questo).

## 2. Conto alla rovescia grande prima della partita

**Cosa si vede.** Al centro dello schermo intero, grande: **«Preparati» · «La partita sta per cominciare» · 3 · 2 · 1**
(3 secondi) e sotto chi batte («Batti sempre tu: lancia la palla e colpisci», «Batte sempre Marco»). Nello stesso schermo
è **uno solo**, al centro dello schermo intero. I telefoni lo ripetono («Si gioca tra 3», poi «Si gioca!»: lo stesso
messaggio del conto dello stesso schermo, nessun cambio alla pagina del telefono). Intanto la partita è ferma al primo
servizio; alla fine la scritta e la voce «Start» di sempre e si gioca.

**Quando.** A ogni partita con il telefono: contro la CPU (dopo gli scambi di prova e la pagina «Pronto per la partita»,
con «Gioca» o «Sono pronto») e nello stesso schermo con i due telefoni (subito dopo gli scambi di prova, o dopo il conto
della pagina dei telefoni se non ci sono scambi di prova), e dopo la rivincita. Non con webcam, mouse o tastiera, non
nella sfida tra due computer (l'altro computer aspetta la stessa partita: lì resta com'era).

**Il conto piccolo della B41.6** («Sono pronto» → 3 s sulla pagina) non c'è più: al tocco di tutti la partita parte e il
conto è quello grande (prima erano due conti di fila).

**Non blocca più di 3 s.** Se intanto si apre la pausa, il pannello dello stand o un telefono cade, il conto aspetta
(riquadro nascosto, telefoni avvisati) e riprende **da dove era**, non da 3. Non torna a «Riprendi» dopo una pausa a
partita in corso. Tornando al menu sparisce senza far partire niente.

**Codice.** `natpf-tennis/src/natpf/natpf_prematch.js` (nuovo); `#natpf-prematch` in `index.html`; stile in
`natpf-ui.css` (cqw/cqh, niente vw/vh); `game_engine.startNewMatch` lo chiede solo per l'inizio vero (con la scritta
d'inizio: test e simulazioni che chiamano `startNewMatch({ showStartBanner: false })` non cambiano) e
`natpfStartCall()` dice «Start» alla fine; `natpf_ui._syncPause` tiene ferma la partita; `natpf_ready_go.js`
(`READY_GO.ms = 0`).

## 3. Livello dopo «Rivincita»

**Cosa vede lo staff.** A fine partita **«Rivincita»** (o «Gioca ancora») apre una scelta grande, da fare con il mouse,
**già segnata con il livello di prima**: basta un clic su **«Gioca»**.
- Contro la CPU: «Chi gioca? **Bambino · Ragazzo · Adulto**» (le stesse tessere della pagina «Partita»). Se il livello
  di adesso è «CPU Esperta» o «CPU Leggenda» (scelto in «Altre impostazioni») c'è anche quella tessera, segnata.
- Nello stesso schermo: per ciascun giocatore il nome e **Bambino · Ragazzo · Adulto**, con la frase dell'aiuto al più
  giovane quando le fasce sono diverse.
- **«Gioca»** → (scambi di prova, se dovuti) → conto alla rovescia grande → partita, senza ripassare dal menu.
- **«Altre impostazioni»** → la pagina «Pronto per la partita» di sempre (durata, formato, chi batte…).
- **«‹ Indietro»** (o Esc) → di nuovo la schermata finale.
- **Tastiera:** frecce tra i pulsanti, Invio, Esc. **Telecomando dello staff:** frecce, OK, Indietro; «Gioca!» fa
  partire con il livello segnato; «Chi gioca» cambia il livello anche da qui.

**Scambi di prova: regola di prima.** Dal pulsante del computer si rifanno se dovuti (come «Rivincita» → pagina
«Partita» → «Gioca» prima della B47). Dalla rivincita chiesta **dai due telefoni** nello stesso schermo no (B20: la
stessa partita da capo). La rivincita dai telefoni apre la stessa scelta, che **parte da sola dopo 10 s** se nessuno la
tocca (così si gioca anche senza nessuno al computer, come prima); un clic dello staff ferma la partenza da sola.

Nella sfida tra due computer «Rivincita» resta immediata. Il menu, il chiosco e «Nuovo giocatore» chiudono la scelta.

**Codice.** `natpf-tennis/src/natpf/natpf_rematch.js` (nuovo); `#natpf-rematch` in `index.html`; stile in
`natpf-ui.css` (`@container natpf` per il ledwall quadrato); `natpf_ui.js` («Gioca ancora»), `natpf_split_ui.js`
(rivincita dai telefoni), `natpf_lobby.js` (tasti), `natpf_remote_map.js` e `natpf_remote.js` (strato «rematch» del
telecomando).

## Prove

Test del gioco nuovi: `test/natpf-b47-battuta.test.mjs` (opzione, regola, motore contro la CPU e nello stesso schermo,
formato veloce, campo aperto, lato del servizio, palla break, sfida tra due computer), `test/natpf-b47-conto.test.mjs`
(quando c'è, 3·2·1, partita ferma, «Start» alla fine, stesso schermo dopo gli scambi di prova, menu durante il conto),
`test/natpf-b47-rivincita.test.mjs` (tessere, fasce, CPU con «Nessuna» e con «Giocando», Esc/Invio, «Altre
impostazioni», stesso schermo dal computer e dai telefoni con la partenza da sola, telecomando).

Test aggiornati (con il motivo): la partita resta ferma 3 s all'inizio (`natpf-flows`, `natpf-giocando-revisione`,
`natpf-nuovo-giocatore`, `natpf-split-ricollega`, `natpf-split`: avanzano di 3 s prima di provare la partita); il conto di
«Sono pronto» non c'è più (`natpf-ready-go`, riscritti); «Rivincita» non riparte subito né va al menu (`natpf-flows`,
`natpf-scambi-di-prova`, `natpf-split-ricollega`). `test/natpf-battuta.test.mjs` («Chi batte per primo», del 29/10) è
rimasto com'era: il commit `8a04040` lo aveva sovrascritto per sbaglio, il commit dopo lo ha ripristinato.

Prove nel browser aggiornate: `natpf-formato-fiera` (il servizio ogni due punti con `?battuta=alternata`; parte nuova con
la battuta di base: pannello, sempre chi gioca contro la CPU con «Batte per primo: CPU», sempre Giulia nello stesso
schermo), `natpf-stesso-schermo-b20` (15 voci nel pannello, conto grande, «Sorteggio: batte sempre…», rivincita dai
telefoni con la scelta delle fasce che parte da sola), `natpf-stesso-schermo-b25` (15 voci), `natpf-scambi-di-prova`
(il telefono dice «Si gioca tra» prima del servizio). Prova nuova `tools/e2e/natpf-b47-fiera.mjs` (pannello, scelta del
livello contro la CPU con mouse e tastiera, conto alla rovescia a 1920×1080 e 720×720 nello stesso schermo, scelta delle
fasce e partita con le fasce scelte).

I numeri delle prove sono nella voce B47 di `docs/WORK_PROGRESS.md`.

## Non verificato

- Telefoni veri (il conto «Si gioca tra» sul telefono, la rivincita dai telefoni veri), ledwall vero, programma Windows,
  mouse fisico: provati solo con il telefono simulato e Chromium senza schermo.
- Il conto alla rovescia nella sfida tra due computer: escluso apposta (vedi sopra).
- Voce: nessuna voce nuova (la voce «Start» di sempre arriva a fine conto).
