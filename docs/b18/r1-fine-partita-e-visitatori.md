# B18 · R1 · Fine partita e visitatori

Ramo R1 della tappa 1 del B18 (punti 1, 2 e 10 del §4 di `docs/b16/rapporto-gameplay.md`), decisioni dell'utente del
10/11: tappa 1 «sì», pulsante «Nuovo giocatore» «sì». Corregge il difetto 4 (stesso schermo, fine partita), il difetto 5
(il visitatore dopo eredita tutto) e il punto 18 (rating finto a fine partita).

Base: `natpf-simulator` a `d09357a` (versione 2026-11-10.1). Commit del ramo: `b09f215` (fine partita), `29dd847` («Nuovo
giocatore» e record), `7389716` (banco `visitatori.mjs`), più il commit di questo documento. I file di versione non sono
toccati: li aggiorna l'unione.

## 1. Cosa cambia per chi gioca

### Fine partita (difetto 4 e punto 18)
- **Schermata finale con i nomi.** In grande chi ha vinto: «Vince Marco!» nello stesso schermo, con i nomi scritti nella
  pagina dei due telefoni (o Player 1 / Player 2). Sotto, una riga per giocatore con il nome e i game (la riga di chi ha
  vinto è gialla), e «Game 0-1». Prima, se vinceva il Player 2, il vincitore leggeva «Riprova!» con il nome «Tu».
- **Contro la CPU, la stessa schermata.** «Hai vinto!» (o «Vince Ada!» se c'è un nome, scelto con «Nuovo giocatore» o per i
  minigiochi), «Vince la CPU» quando perde (prima «Riprova!»), righe «Ada 0 · CPU 1». Nella sfida tra due computer ognuno
  vede la sua riga per prima e «Hai vinto!» o «Vince Player 1!».
- **Voce di fine partita per chiunque vinca**: «Game, set and match» (clip già presente, nessun audio nuovo). Prima la diceva
  solo se vinceva il Player 1; se vinceva il Player 2 (o la CPU) diceva solo «Game». Anche il Player 2 della sfida tra due
  computer la sente (arriva con il messaggio dell'host).
- **Banner del punto nello stesso schermo**: «Giulia 0 · Marco 15» invece di «Giulia 00 · Marco 15», «Parità» a 40-40
  (prima «Giulia 40 · Marco 40»). Il banner di fine partita dice «Vince Marco!» (prima «Partita Marco»).
- **Stessa velocità di corsa** per i due giocatori del 1v1 (stesso schermo e due computer): il Player 2 a 9,8 m/s come il
  Player 1 (prima 9,6 m/s, il 2% più piano); nel doppio 1v1 i compagni CPU a 8,4 m/s tutti e due (prima 8,4 e 8,2).
- **Niente rating finto**: tolti il numero fisso (1145 se vinci, 1020 se perdi), il grafico disegnato sempre uguale e
  l'intestazione «Rating NATPF»; l'intestazione ora è «Fine partita».

### «Nuovo giocatore» (difetto 5)
Pulsante grande rosa **a fine partita** (sopra «Gioca ancora» e «Menu»), **nel risultato dei minigiochi** (accanto a
«Riprova ›») e **nel pannello dello stand** (Ctrl+Maiusc+K, o 3 s sul marchio NATPF del menu: accanto a «Chiudi»).

Cosa azzera, **senza scollegare il telefono** (niente `link.forget`, niente QR da rifare, stesso abbinamento):
- il nome (nickname);
- il tutorial visto, anche quello corto a 5 schede (prima era legato all'abbinamento del telefono e lo vedeva solo il primo
  visitatore);
- la calibrazione: il telefono cancella il profilo salvato e ricalibra (dopo il tutorial);
- il colpo tipico, la salita, il piatto, il verso e la mira abituali, i prototipi del pallonetto e della palla corta, i
  riferimenti della forza (`powerRefs`: profilo e colpo tipico vuoti) e, sul telefono, i colpi giocati di `effRef`
  (la calibrazione nuova li azzera, `swing-detect setProfile`);
- la **mano**: torna «Destra» e si sceglie nel passo del nome («Giochi con la mano: Destra · Sinistra»). Motivo: è del
  giocatore, non dello stand; un mancino dopo un destro (o il contrario) giocherebbe specchiato, con i colpi letti al
  contrario. Nove visitatori su dieci sono destri: chi non tocca niente ha quasi sempre la scelta giusta;
- record, medaglie ed esperienza **non si vedono più** per il visitatore nuovo, perché ora sono per nome e per giorno (sotto).

Cosa **resta**: il **livello** (Casual, Pro, Leggenda: è una scelta dello staff, come ha deciso l'utente per i livelli),
durata e formato della partita, chi batte, la mira del telefono, il chiosco, la musica e la classifica del giorno.

Dove porta chi arriva:

| da dove | poi |
|---|---|
| fine partita contro la CPU | nome e mano («Come ti chiami?», «Salta» per andare avanti senza nome) → in campo il tutorial corto (5 schede) → la calibrazione → pagina «Partita» con «Gioca» |
| risultato di un minigioco | nome e mano → tutorial corto → calibrazione → lo stesso minigioco |
| fine partita nello stesso schermo | pagina dei due telefoni con i nomi vuoti e le mani su «Destra» → tutorial nelle due metà → calibrazioni → conto alla rovescia → partita. Tutti e due i giocatori sono azzerati |
| pannello dello stand con il menu in vista (o dall'Allenamento) | si azzera e si resta al menu: il visitatore sceglie |
| pannello dello stand durante una partita o una sfida | come a fine partita (la partita in corso si chiude) |
| sfida tra due computer | **a fine partita il pulsante non c'è**: la rivincita è tra le stesse due persone e l'altro computer la aspetta. Dal pannello dello stand si azzera il giocatore di **questo** computer e si torna al menu principale: sull'host la stanza si chiude (l'altro computer lo vede come quando l'host cambia modalità), il Player 2 lascia la stanza. L'altro computer non viene azzerato |

Con la webcam o mouse e tastiera: nome e mano, poi subito la pagina «Partita» (niente da calibrare).
Telefono scollegato in quel momento (schermo spento, pagina ricaricata): la calibrazione si chiede appena torna, anche se il
telefono aveva ancora il profilo di prima.

### Record per nome e per giorno
Record personali, medaglie ed esperienza (livello del giocatore nei minigiochi) erano uno solo per computer: il secondo
visitatore vedeva quelli del primo. Ora sono **per nickname e per giorno** (senza nickname: «Ospite», come nella
classifica). Si tengono gli ultimi 7 giorni. **Migrazione innocua**: l'archivio di prima (non si sa di chi) resta salvato
a parte nella stessa chiave (`natpf-tennis.records`, campo `legacy`), non si cancella e non si mostra più. La classifica
del giorno non cambia.

## 2. Come si attiva

Niente da accendere: il pulsante «Nuovo giocatore» c'è sempre, nei tre posti:
- **a fine partita**: schermata finale → «Nuovo giocatore» (in alto, rosa);
- **nei minigiochi**: pagina del risultato → «Nuovo giocatore» (accanto a «Riprova ›»);
- **per lo staff**: Ctrl+Maiusc+K (o tenere premuto 3 secondi il marchio NATPF in alto a sinistra nel menu) → «Pannello dello
  stand» → «Nuovo giocatore» (in basso, accanto a «Chiudi»).

Il ritorno automatico al menu (chiosco) resta com'era e resta **spento** di default: quando scatta continua a scollegare il
telefono (non è stato cambiato in questo ramo).

## 3. File toccati

- `natpf-tennis/src/natpf/natpf_point_call.js`: «0» e «Parità» nel banner dello stesso schermo, «Vince X!» a fine partita,
  `matchEndView` (schermata finale dal lato di chi guarda) e `MATCH_VOICE`.
- `natpf-tennis/src/game_engine.js`: voce di fine partita per chiunque vinca (anche nel messaggio al Player 2), `view` della
  schermata finale (`_natpfMatchEndView`, anche sul Player 2 della sfida tra due computer), Player 2 del 1v1 a 9,8 m/s.
- `natpf-tennis/src/hud_ui.js`: `showVictoryModal` con nomi e righe; tolti rating e grafico (`_drawSkillGraph`).
- `natpf-tennis/index.html`: schermata finale nuova con «Nuovo giocatore»; passo del nome con la mano; «Nuovo giocatore» nel
  risultato dei minigiochi e nel pannello dello stand.
- `natpf-tennis/natpf-hud.css`, `natpf-tennis/natpf-ui.css`: stili (misure dello schermo in `cqw`).
- `natpf-tennis/src/natpf/natpf_new_player.js` (nuovo): cosa si azzera e dove si va (`newPlayerRoute`, `resetVisitor`).
- `natpf-tennis/src/natpf/natpf_phone_racket.js`: `resetPlayer` (azzera senza scollegare; calibrazione al ricollegamento se
  il telefono non c'era).
- `natpf-tennis/src/natpf/natpf_ui.js`: `newPlayer()`, pulsante della schermata finale (nascosto nella sfida tra due
  computer).
- `natpf-tennis/src/natpf/natpf_lobby.js`: passo del nome per il visitatore nuovo (con la mano e «Salta»), «Nuovo giocatore»
  nel risultato dei minigiochi, il telefono che aspetta il tutorial non aspetta più se si torna al menu.
- `natpf-tennis/src/natpf/natpf_kiosk.js`: «Nuovo giocatore» nel pannello dello stand.
- `natpf-tennis/src/natpf/natpf_events.js`: record, medaglie ed esperienza per nickname e per giorno, migrazione.
- Test: `natpf-tennis/test/natpf-fine-partita.test.mjs` (8), `natpf-tennis/test/natpf-nuovo-giocatore.test.mjs` (8).
- Banco: `natpf-tennis/scripts/audit/visitatori.mjs`. Prova nel browser: `tools/e2e/natpf-nuovo-giocatore.mjs`.

Il riconoscimento dei gesti non è toccato (né sul telefono né sul computer): `resetPlayer` usa solo i `reset()` già
esistenti dei modelli e il comando «cal» già esistente del telefono.

## 4. Misure prima e dopo

**Visitatore dopo visitatore** (`node --import ./test/register.mjs scripts/audit/visitatori.mjs`, telefono simulato con il
braccio, 12 semi × 10 colpi della seconda persona, bambino = 0,5 del colpo dell'adulto; «prima» = stesso telefono come
oggi, «dopo» = «Nuovo giocatore» e calibrazione della seconda persona; riferimento = telefono della seconda persona
assestato):

| chi arriva dopo chi | forza letta, primi 3 colpi (prima → dopo · riferimento) | \|forza − rif\| primi 3 | colpi di tipo diverso dal rif | gesti non letti |
|---|---|---|---|---|
| bambino dopo adulto | 0,12 → 0,30 · 0,31 | 0,24 → 0,02 | 0 → 0 | 27 → 0 su 120 |
| adulto dopo bambino | 0,65 → 0,45 · 0,45 | 0,20 → 0,02 | 62 → 8 su 120 | 0 → 0 |
| adulto dopo adulto (controllo) | 0,44 → 0,45 · 0,45 | 0,03 → 0,02 | 5 → 8 su 120 | 0 → 0 |

Conferma il calcolo del B16 («un bambino dopo un adulto colpisce con circa un terzo della forza»: 0,12 contro 0,31) e
aggiunge che oggi più di un gesto su cinque del bambino non viene letto; un adulto dopo un bambino «tira troppo forte» e
metà dei suoi colpi cambia tipo. Con «Nuovo giocatore» la seconda persona è letta come sul suo telefono (scarto 0,02,
come adulto dopo adulto). Limite: il «dopo» è un telefono simulato nuovo, cioè lo stato che lascia `resetPlayer` più la
calibrazione; che `resetPlayer` azzeri davvero quei campi lo controllano i test di unità e la prova nel browser.

**Velocità nel 1v1**: Player 2 9,6 → 9,8 m/s (uguale al Player 1), compagni 8,2 → 8,4 m/s.

**Leggenda** (`npm run audit:legend`): vedi §5.

## 5. Verifiche

- Gioco: `cd natpf-tennis && npm test` → **1006 superati su 1007, 0 falliti, 1 saltato** (il saltato c'è già sulla base).
  Nuovi: `natpf-fine-partita.test.mjs` 8/8, `natpf-nuovo-giocatore.test.mjs` 8/8.
- Sito: `node --test tools/test/*.test.mjs` → **200/200**.
- Build: `cd natpf-tennis && npm run build` → ok.
- Leggenda: `npm run audit:legend` → **69/69 criteri rispettati** («Tutti i criteri rispettati»; il ramo non tocca la CPU
  né i livelli contro la CPU: cambia solo la velocità del Player 2 nel 1v1).
- Prove nel browser (Chromium, telefoni simulati, `CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/<nome>.mjs`):
  - `natpf-nuovo-giocatore.mjs` (nuova) **26/26**: tutorial corto e calibrazione del primo visitatore (mancino), partita
    portata alla fine, «Vince Marco!» con le righe e senza rating, voce «Game Set and Match», «Nuovo giocatore» con nome,
    tutorial, calibrazione e colpo tipico azzerati e il telefono collegato con lo stesso abbinamento (sulla pagina del
    telefono: schermata del tutorial), passo del nome con la mano, di nuovo tutorial corto (5 schede) e calibrazione, pagina
    «Partita»; schermata finale e passo del nome interi a 1024×600; stesso schermo vinto dal Player 2 («Punto Marco ·
    Giulia 0 · Marco 15», banner e schermata «Vince Marco!», voce), poi «Nuovo giocatore» con nomi vuoti, tutorial nelle due
    metà e telefoni collegati con lo stesso abbinamento;
  - `natpf-split-ready.mjs` **34/34**, `natpf-menu.mjs` **28/28** (pannello dello stand a 1024×600 con «Chiudi» in vista),
    `natpf-training-flow.mjs` **22/22**, `natpf-tutorial-phone.mjs` **52/52**, `natpf-tabellone.mjs` **42/42**.

Schermate della prova nuova (cartella `nuovo-giocatore/` sotto `OUT`, guardate): schermata finale contro la CPU «Vince
Marco!» (1280×720 e 1024×600), passo del nome con la mano (1280×720 e 1024×600), tutorial di Bea, schermata finale nello
stesso schermo «Vince Marco!» vinta dal Player 2, pagina dei due telefoni dopo «Nuovo giocatore». Nello stesso schermo le
due metà del tutorial coprono i campi dei nomi finché non si chiudono: è com'era già prima per i giocatori nuovi (i nomi
si scrivono dopo il tutorial, prima che parta il conto).

## 6. Cosa NON è verificato

- **Telefono vero**: la ricalibrazione senza scollegare (comando «cal» con il tutorial in attesa) è provata solo con la
  pagina del telefono simulata in Chromium. Non è provato un telefono che si spegne proprio mentre si preme «Nuovo
  giocatore» (il codice chiede la calibrazione al ricollegamento: c'è un test di unità, non una prova nel browser).
- **Persone vere**: nessuno ha usato il passo del nome con la mano; non è misurato quanti visitatori lo saltano. La misura
  della forza è un banco con un braccio simulato (bambino = metà del colpo dell'adulto), non persone.
- **Windows, ledwall, GPU vera**: non provati. La schermata finale e il passo del nome sono visti solo a 1280×720 nelle
  schermate della prova e a 1024×600; non sono stati guardati nell'area del ledwall.
- **Sfida tra due computer**: il pulsante nascosto a fine partita è provato con un test di unità; «Nuovo giocatore» dal
  pannello dello stand in una stanza aperta (chiusura della stanza, effetto sull'altro computer) **non** è provato nel
  browser.
- **Voce**: la frase «Game, set and match» per la CPU e per il Player 2 è la stessa clip di prima; l'ascolto non è stato
  fatto (si controlla solo che il gioco la chieda).
- Il chiosco (ritorno automatico al menu) non è cambiato: quando scatta continua a scollegare il telefono e non rimette la
  mano su «Destra».
