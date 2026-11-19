# B72 · «Avversario» al posto di «CPU» (19/11/2026)

Prodotto: **FIERA** (vale anche per l'ONLINE, che usa lo stesso gioco). Richiesta dell'utente del 19/11, testuale:
«cambiare CPU con Avversario (in singolo): molti non sanno cosa significa CPU». Ramo locale `b72-avversario` (da
`b71-int`, non spinto).

## Cosa cambia per chi gioca

In tutti i testi che si **vedono** (gioco, pagina del sito `site/tennis`, telecomando e pannello dello staff) la parola
«CPU» per il giocatore guidato dal gioco non c'è più:

- **singolo**: «Avversario» (tabellone «TU · AVV», etichetta sotto il ritratto, «Batte per primo: Tu · Avversario ·
  Sorteggio»), con l'articolo giusto nelle frasi: «Punto dell'avversario», «Errore dell'avversario: palla fuori»,
  «L'avversario non ci arriva», «Vantaggio dell'avversario», «Game dell'avversario», «Vince l'avversario», «Ha vinto
  l'avversario questa volta», «Batte per primo l'avversario», «Palla corta dell'avversario»;
- **livelli**: «Avversario esperto», «Avversario Leggenda» (prima «CPU Esperta», «CPU Leggenda», «CPU Pro» sotto il
  ritratto), «Avversario facile, per prendere confidenza» (tessera «Ragazzo»). Il livello «Esperta» diventa **«Esperto»**
  (al maschile come «avversario») ovunque: riga «Livelli per esperti», «livello Esperto» a fine partita, classifica, card,
  regola del punteggio, CSV, telecomando;
- **doppio contro il gioco**: i due avversari sono «Avversari» («Vincono gli avversari», «Hanno vinto gli avversari
  questa volta», «Punto degli avversari», «Gli avversari non ci arrivano», «vincenti che gli avversari non hanno preso»);
  il compagno guidato dal gioco è il «compagno» («Tu + compagno», «Ada + compagno», sigla «TU+COM»; nella sfida tra due
  computer in doppio «Amico + compagno», «Player 2 + compagno»);
- **menu e descrizioni**: «Gioca: Avversario · Sfida un amico», «Una partita contro l'avversario, o contro un amico»,
  tessera «Contro l'avversario» con «Da solo, contro un avversario guidato dal gioco: facile, esperto o Leggenda»,
  «Partite contro l'avversario» (classifica e CSV), «1 giocatore · contro l'avversario» (pagina della fiera); salvaschermo:
  «una partita dimostrativa tra due giocatori del gioco».

## Dove (nomi in un punto solo)

`natpf-tennis/src/natpf/natpf_who.js` ha le costanti esportate, per la traduzione del ramo parallelo `b72-lingua`
(«Avversario» → «Opponent», «Avversari» → «Opponents», «Compagno» → «Partner»):

| costante | valore | uso |
|---|---|---|
| `OPPONENT_NAME` | `Avversario` | nome in singolo (tabellone, ritratto, chi batte, telecomando, schermata finale) |
| `OPPONENTS_NAME` | `Avversari` | nome nel doppio |
| `PARTNER_NAME` | `compagno` | compagno guidato dal gioco; `withPartner(nome)` → «Tu + compagno» |
| `OPPONENT_REF` | `{ of: "dell'avversario", who: "l'avversario", Who: "L'avversario", many: false }` | frasi con l'articolo |
| `OPPONENTS_REF` | `{ of: 'degli avversari', who: 'gli avversari', Who: 'Gli avversari', many: true }` | idem nel doppio (verbo al plurale) |
| `opponentLevelName(level)` | «Avversario esperto», «Avversario Leggenda» | livello scelto per nome (Leggenda è un nome, gli altri aggettivi) |
| `LEVEL_NAME.pro` | `Esperto` (prima `Esperta`) | nome del livello |

Li usano `natpf_point_call.js` (`rivalOf` ha ora `doubles`; `callContext` lo prende da `engine.isDoubles`),
`natpf_scoreboard.js`, `natpf_match_stats.js`, `natpf_lobby.js`, `natpf_prematch.js`, `natpf_rematch.js`,
`natpf_remote_map.js`, `natpf_remote.js`, `hud_ui.js`. Nel sito (`site/js/tennis/main.js`, gioco arcade del sito) una
costante locale `OPPONENT_NAME`.

Prova nel browser nuova: `tools/e2e/natpf-avversario.mjs` (porta 3272). Prove aggiornate al testo nuovo: `natpf-chi-gioca`,
`natpf-tabellone`, `natpf-telecomando`, `natpf-fine-partita`, `natpf-gameplay-23-10`, `natpf-rete`, `natpf-nuovo-giocatore`.

## Tabella: ogni «CPU» trovata (`grep -rn CPU` su `natpf-tennis/index.html`, `natpf-tennis/src`, `site/`, `natpf-desktop/`)

Righe dopo la modifica. Apostrofo: nell'HTML e nei messaggi che ne avevano già uno tipografico «’», nelle costanti JS «'».

### Gioco: `natpf-tennis/index.html`

| riga | prima → dopo |
|---|---|
| 248 | title «Formato in fiera»: «…con «Sì» anche contro la CPU» → «…anche contro l’avversario» |
| 249 | title «Battuta»: «batte chi gioca contro la CPU» → «batte chi gioca contro l’avversario» |
| 253 | title «Doppio: compagno»: «Nel doppio contro la CPU, l’anello…» → «Nel doppio contro due avversari, l’anello…» |
| 256 | title «Salvaschermo»: «una partita dimostrativa (CPU contro CPU)» → «una partita dimostrativa tra due giocatori del gioco» |
| 331 | foglio «Telefoni dello stand»: «Player 1 · contro la CPU e a sinistra» → «Player 1 · contro l’avversario e a sinistra» |
| 408 | `#menu-desc`: «Una partita contro la CPU, o contro un amico.» → «Una partita contro l’avversario, o contro un amico.» |
| 413 | voce «Gioca»: `data-desc` come sopra; sottotitolo «CPU · Sfida un amico» → «Avversario · Sfida un amico» |
| 417 | «Classifica» `data-desc`: «partite contro la CPU e minigiochi» → «partite contro l’avversario e minigiochi» |
| 429 | tessera: «Contro la CPU» → «Contro l’avversario»; «Da solo, contro la CPU: facile, esperta o Leggenda.» → «Da solo, contro un avversario guidato dal gioco: facile, esperto o Leggenda.» |
| 730 | pagina della fiera: «1 giocatore · contro la CPU» → «1 giocatore · contro l’avversario» (`data-fiera-mode="cpu"` resta) |
| 779 | tessera «Ragazzo»: «CPU facile, per prendere confidenza» → «Avversario facile, per prendere confidenza» |
| 814 | «Livelli per esperti»: «Esperta» → «Esperto» |
| 837 | «Batte per primo»: «CPU» → «Avversario» (nel doppio «Avversari», da `_paintServe`) |
| 852 | `#setup-opponent-label`: «CPU» → «Avversario» (classe `cpu-tag` resta) |
| 323, 374, 733, 768, 770, 790, 798, 974 | lasciato: commenti HTML |

### Gioco: `natpf-tennis/src`

| file:riga | prima → dopo |
|---|---|
| `natpf/natpf_who.js:20` | `LEVEL_NAME.pro` «Esperta» → «Esperto» |
| `natpf/natpf_who.js:27-38` | nuove costanti (sopra) |
| `natpf/natpf_who.js:52` | `levelSummary`: «CPU Esperta», «CPU Leggenda» → «Avversario esperto», «Avversario Leggenda» (anche `whoNote` e il riassunto di «Altre impostazioni») |
| `hud_ui.js:116-118` | etichetta sotto il ritratto: «CPU Pro», «CPU Leggenda», «CPU» → «Avversario esperto», «Avversario Leggenda», «Avversario» |
| `natpf/natpf_point_call.js:16-18` | `rivalOf`: «della CPU», «la CPU», «La CPU» → `OPPONENT_REF`; nel doppio `OPPONENTS_REF` (prima «della CPU» anche lì) |
| `natpf/natpf_point_call.js:39` | «La CPU non ci arriva» → «L'avversario non ci arriva» / «Gli avversari non ci arrivano» |
| `natpf/natpf_point_call.js:116-118` | fine partita: «CPU» / «2 CPU» → «Avversario» / «Avversari»; «Vince la CPU» / «Vincono le CPU» → «Vince l'avversario» / «Vincono gli avversari»; «Tu + CPU», «Ada + CPU», «Player 2 + CPU» → «… + compagno» |
| `natpf/natpf_point_call.js:125` | `callContext`: `doubles: engine.isDoubles` (scritte del punto e del game al plurale nel doppio) |
| `natpf/natpf_scoreboard.js:120-121` | righe del tabellone: «CPU», «2 CPU», «Tu + CPU» → «Avversario», «Avversari», «Tu + compagno» (sigle «AVV», «TU+COM») |
| `natpf/natpf_scoreboard.js:151` | «Vantaggio della CPU» → «Vantaggio dell'avversario» / «degli avversari» (screen reader) |
| `natpf/natpf_match_stats.js:251` | riquadro: «vincenti che la CPU non ha preso» → «vincenti che l'avversario non ha preso» / «che gli avversari non hanno preso» |
| `natpf/natpf_match_stats.js:308, 312` | «La CPU ha vinto questa volta» → «Ha vinto l'avversario questa volta»; «Hanno vinto le CPU» → «Hanno vinto gli avversari» |
| `natpf/natpf_lobby.js:366` | nota della classifica: «Partite contro la CPU.» → `MATCH_LABEL` («Partite contro l'avversario.») |
| `natpf/natpf_lobby.js:404-405` | ritratti della pagina «Partita»: «CPU», «2 CPU», «Amico + CPU», «Tu + CPU» → «Avversario», «Avversari», «Amico + compagno», «Tu + compagno» |
| `natpf/natpf_lobby.js:429` | «Batte per primo»: «CPU» → «Avversario» (doppio «Avversari») |
| `natpf/natpf_events.js:74` | `MATCH_LABEL` «Partite contro la CPU» → «Partite contro l'avversario» (classifica e CSV) |
| `natpf/natpf_prematch.js:60` | conto alla rovescia: «Batte sempre la CPU», «Batte per prima la CPU» → «Batte sempre l'avversario», «Batte per primo l'avversario» |
| `natpf/natpf_rematch.js:34` | tessera «Ragazzo»: «CPU facile, …» → «Avversario facile, …» |
| `natpf/natpf_rematch.js:43` | quarta tessera: «CPU Esperta» / «CPU Leggenda» → «Avversario esperto» / «Avversario Leggenda» |
| `natpf/natpf_remote_map.js:41-42` | telecomando: «CPU: Esperta» → «Avversario: Esperto»; suggerimento «poi CPU Esperta» → «poi Avversario esperto» |
| `natpf/natpf_remote_map.js:82` | «Partita contro la CPU» → «Partita contro l'avversario» |
| `natpf/natpf_remote_map.js:136-137` | «Gioca · contro la CPU», «Contro la CPU» → «… contro l'avversario», «Contro l'avversario» |
| `natpf/natpf_remote_map.js:172` | «Non c’è la CPU in questa modalità» → «Niente livello: in questa modalità si gioca tra due persone» |
| `natpf/natpf_remote_map.js:197` | riga del punteggio: «Tu 1 · CPU 0» → «Tu 1 · Avversario 0» |
| `natpf/natpf_remote.js:204, 206` | telecomando: nomi del punteggio (doppio «Avversari»), «Contro la CPU» → «Contro l'avversario» |
| `natpf/natpf_i18n.js:44` | «CPU DROP SHOT» → «Palla corta dell'avversario» (la CHIAVE del motore resta) |
| `natpf/natpf_battuta.js:47` | avviso: «contro la CPU batte sempre chi gioca» → «contro l’avversario batte sempre chi gioca» |
| `natpf/natpf_kiosk.js:81-82` | avvisi del formato in fiera: «batte anche la CPU», «contro la CPU formato classico» → «l’avversario» |
| `natpf/natpf_timing_cue.js:64` | avviso del segnale: «a tutti i livelli contro la CPU» → «contro l’avversario» |
| `natpf/natpf_portrait.js:18` | aria-label «Ritratto dell'avversario CPU» → «Ritratto dell'avversario» |
| `natpf/natpf_doubles.js:24` | `PARTNER_TITLE` come `index.html:253` |
| `game_engine.js:2921` | lasciato: `grade: "CPU DROP SHOT"` è la chiave del motore (tradotta da `natpf_i18n.js`) |
| `natpf/natpf_shot_feedback.js:115` | lasciato: `isCpuGrade` legge la chiave inglese prima della traduzione |
| `natpf/natpf_who.js` `CPU_LEVELS`, `isCpuLevel`; `natpf_remote_map.js` `CPU_LEVELS`, `cpuName`, `cpuLabel`, `nextCpu`; `natpf_skill.js` `CPU_*`; `game_engine.js` `natpfCpu*` | lasciato: nomi interni |
| `natpf/registro/registro_registratore.js:57, 461` | lasciato: registro (`CPU_NET`, modo `cpu`) |
| `natpf/diag/diag_metrics.js:670` e gli altri `diag/` | lasciato: diagnostica per gli sviluppatori («contro la CPU» nel riassunto) |
| tutte le altre | lasciato: commenti. Dopo la modifica restano 527 righe con «CPU» in 70 file (`index.html`, `src`, `site`), di cui solo 73 non cominciano con un commento: commenti in fondo alla riga, nomi interni, le chiavi sopra e i commenti «B72: prima …» |

### Sito e telecomando: `site/`

| file:riga | prima → dopo |
|---|---|
| `site/tennis/index.html:8` | meta description: «tennis arcade contro la CPU o un amico» → «contro l’avversario o un amico» |
| `site/tennis/index.html:124` | «Gioca contro la CPU» → «Gioca contro l’avversario» (`id="btnCpu"` resta) |
| `site/tennis/index.html:129` | «Difficoltà CPU» → «Difficoltà dell’avversario» |
| `site/tennis/telecomando.html:124` | telecomando dello staff, prima della risposta del gioco: «Livello CPU» → «Livello dell’avversario» (`data-c="cpu"` resta) |
| `site/js/tennis/main.js:241, 247-248` | nome nel tabellone del gioco arcade del sito: «CPU» → «Avversario» (id interno `cpu` resta) |
| `site/js/tennis/main.js:239, 361`, `arena.js:142`, `stand-pairing.js:3` | lasciato: commenti |
| `site/js/match/arcade.js` (`CPU` livelli, `chooseCpuShotType`) | lasciato: nomi interni |
| pagina del telefono (`site/tennis/racchetta.html`, `site/js/tennis/*` del telefono) | nessuna «CPU» visibile (i testi del telefono che parlano dell'avversario arrivano dal gioco) |

### Altro

| file | |
|---|---|
| `natpf-desktop/novita.txt` (righe 19, 25, 27, 33, 53, 54, 55) | lasciato: file di versione, note delle versioni già pubblicate. **Per l'agente principale**: nelle prossime righe scrivere «avversario», non «CPU» |
| `natpf-tennis/lan/LEGGIMI.txt` | escluso (file di versione) |
| `natpf-android/` | nessuna «CPU» |

## Decisioni

1. **«Esperto» al maschile anche come nome del livello** (riga «Livelli per esperti», classifica, card, regola del
   punteggio, CSV): «Esperta» si accordava con «la CPU»; con «avversario» resta un solo nome per il livello.
2. **«Avversario esperto» con l'aggettivo minuscolo, «Avversario Leggenda» maiuscolo** (Leggenda è il nome del livello e
   del campione); sul telecomando, dopo i due punti, il nome del livello: «Avversario: Esperto».
3. **Doppio al plurale anche nelle scritte del punto** («Punto degli avversari», «Gli avversari non ci arrivano»,
   «Vantaggio degli avversari»): prima dicevano «della CPU» anche con due avversari in campo. Il conto alla rovescia
   («Batte per primo l'avversario») resta al singolare: batte uno dei due.
4. **Sigle del tabellone**: la regola di sempre (`shortName`, prime 3 lettere): «AVV», «TU+COM», «MAR+COM». Nessuna
   sigla speciale.
5. **Telecomando, livello spento nello stesso schermo e nella sfida tra due computer**: «Niente livello: in questa
   modalità si gioca tra due persone» (dire «non c'è l'avversario» sarebbe stato falso: l'avversario c'è, è una persona).
6. **Tessera della modalità**: «Contro l’avversario» con la descrizione «Da solo, contro un avversario guidato dal gioco»,
   così chi non sa cos'era la CPU capisce che non serve un'altra persona; nessuna parola tecnica nuova.
7. **Apostrofo**: nell'HTML e nei messaggi che ne avevano già uno tipografico «’»; nelle costanti JS «'» come
   `natpf_portrait.js`. Nel tabellone l'HTML scrive `&#39;` (la prova `natpf-scoreboard-ui` lo rilegge come «'»).
8. Chiavi, valori, attributi, classi, nomi di funzioni, registro, diagnostica e commenti restano come sono (vedi tabella).

## Prove

- `cd natpf-tennis && npm test`: **1872 test, 1870 superati, 1 saltato, 1 fallito**: il fallito è
  `natpf-registro.test.mjs:472` («pulire un testo di 1 MB costa pochi millisecondi»: 50,9 ms con la macchina carica,
  load average 12–19 per gli altri agenti in parallelo). Fallisce allo stesso modo **prima** di questo lavoro (stessa
  macchina, `b71-int`: 58,1 ms) e da solo passa: `node --test test/natpf-registro.test.mjs` **34/34**. Non tocca niente
  di questo ramo.
- Test aggiornati al testo nuovo (nessuno indebolito; aggiunte verifiche per il doppio e le sigle):
  `natpf-scoreboard`, `natpf-scoreboard-ui`, `natpf-point-call`, `natpf-fine-partita`, `natpf-b35-fine-partita`,
  `natpf-b33-fine-partita`, `natpf-b31-rete`, `natpf-b47-rivincita`, `natpf-b18-t2-evento-bambini`, `natpf-b54-nome`,
  `natpf-telecomando`, `natpf-formato-fiera`, `natpf-b47-conto`, `natpf-b68-start-breve`, `natpf-b20-stesso-schermo`,
  `natpf-b47-battuta`, `natpf-lob-drop`: i 17 file insieme **189/189**.
- `node --test tools/test/*.test.mjs` (sito): **308/308**.
- `cd natpf-tennis && npm run build`: riuscita.
- Prove nel browser (Chromium headless, deviceScaleFactor 1, porte proprie): vedi la sezione sotto.

### Prove nel browser

Chromium headless (`CHROMIUM_PATH=/opt/pw-browsers/chromium`), deviceScaleFactor 1, `GAME_PORT` propri (altri agenti
facevano girare le loro prove in parallelo), schermate in `OUT` nello scratchpad.

| script | esito | note |
|---|---|---|
| `natpf-avversario.mjs` (**nuovo**) | **9/9** | «Con chi giochi?», «Pronto per la partita» singolo e doppio, partita persa a Esperto, «Rivincita», doppio perso, nessun errore |
| `natpf-menu.mjs` | **45/45** | |
| `natpf-chi-gioca.mjs` (aggiornato) | **55/55** | due giri precedenti fermati a metà da `page.screenshot: Timeout 30000ms` sulla prova dell'anello (load average 19: altri agenti in parallelo), con le 23 verifiche fatte fin lì tutte OK; al terzo giro (load 5) completo |
| `natpf-tabellone.mjs` (aggiornato) | **41/41** | sigle «TU»/«AVV», «TU+COM»/«AVV», nomi interi in `data-sb-name` e `title` |
| `natpf-fine-partita.mjs` (aggiornato) | **68/68** | CSV con «Partite contro l'avversario» |
| `natpf-classifica-fine.mjs` | **11/11** | |
| `natpf-telecomando.mjs` (aggiornato) | **91/91** | «Avversario: Esperto», «Partita contro l'avversario», «Tu 0 · Avversario 0». Primo giro fermo: mancava `tools/lan/node_modules` nel worktree (collegamento a quello del checkout principale) |
| `natpf-rete.mjs` (aggiornato) | **11/11** | «PALLA CORTA DELL'AVVERSARIO», niente «cpu» nella scritta |
| `natpf-nuovo-giocatore.mjs` (aggiornato) | **29/29** | righe finali «Marco 1 · Avversario 0» |
| `natpf-chi-serve.mjs` | **64/64** | |
| `natpf-gameplay-23-10.mjs` (aggiornato) | **9/11** | i 2 KO (B: la prova legge «Palla game» al posto della scritta del punto; E: «Perfetto» su un colpo in rete a Leggenda) ci sono **uguali sul commit di partenza** `b71-int` 65a263bf (copia con `git archive` nello scratchpad, stesso script: 9/11, stessi due KO): non dipendono da questo lavoro. Il mio primo giro si era fermato per un errore mio (apostrofo in una stringa tra apici singoli), corretto |

### Schermate guardate

- `menu-1280x720`: voce «Gioca» con «Avversario · Sfida un amico», a sinistra «Una partita contro l’avversario, o contro un
  amico.»; niente tagli.
- `modo-1280x720`: tessera «CONTRO L’AVVERSARIO» con «Da solo, contro un avversario guidato dal gioco: facile, esperto o
  Leggenda.» su due righe, come le altre due tessere.
- `chi-gioca-720x720`, `livello-esperta-1280x720`: «Ragazzo · Avversario facile, per prendere confidenza» su due righe a
  720×720; sotto il ritratto «AVVERSARIO» / «AVVERSARIO ESPERTO» su una riga (stile `cpu-tag` di prima, poco contrasto
  come prima); riga «Livello: Avversario esperto, scelto in «Altre impostazioni»…» e riassunto «Avversario esperto · 1
  game · singolare · 3ª persona» su una riga.
- `partita-doppio-1280x720` (Altre impostazioni aperte): «Livelli per esperti: Esperto · Leggenda», «Batte per primo: Voi ·
  Avversari · Sorteggio»; `partita-singolo-1920x540`: stessa pagina, la riga «Ragazzo» con «Avversario facile…».
- `tabellone-1280-1v1-cpu-vantaggio`: «TU 0 AD» / «AVV 0 40», pillola «VANTAGGIO»; `tabellone-1280-2v2-cpu-30-30`: «TU+COM» /
  «AVV», il riquadro resta largo come prima.
- `fine-persa-720x720`, `fine-persa-1024x600`: «FINE PARTITA · LIVELLO ESPERTO», «Bella sfida, Ada!», «Ha vinto l'avversario
  questa volta. Ecco cosa ti è venuto meglio:» su una riga, riquadro «vincenti che l'avversario non ha preso» su due righe
  dentro il riquadro, card «Livello Esperto», pillola «Prossima volta prova il livello Evento».
- `fine-doppio-persa-1280x720`: «Hanno vinto gli avversari questa volta…», riquadro «vincenti che gli avversari non hanno
  preso» su due righe.
- `cpu-1280x720` (fine partita vinta) e `classifica-1280x720`: nota «Partite contro l'avversario. …» e regola «… Esperto
  ×1,6 …».
- `rivincita-1280x720`: quarta tessera segnata «AVVERSARIO ESPERTO» su due righe (prima «CPU ESPERTA» su una), dentro la
  tessera, sopra «Livello scelto in «Altre impostazioni»».
- `rete-classici-06-palla-corta-cpu`: presa quando la scritta non era più a schermo; il testo l'ha letto la prova
  («PALLA CORTA DELL'AVVERSARIO», bianca, nell'angolo dell'avversario).

## Non verificato

- Ledwall vero, programma Windows, telefono vero: non provati (i testi sono gli stessi del browser).
- Voce del gioco: invariata (inglese, non dice «CPU»).
- La pagina arcade del sito (`site/tennis/index.html`) solo con i test del sito, non aperta nel browser.
- Il pannello dello stand mostra i `title` cambiati solo al passaggio del mouse: controllati nel codice, non nelle
  schermate.
- Resta com'era prima (non cambiato qui): nel doppio, se dopo il formato si sceglie Esperto o Leggenda, l'etichetta sotto
  il ritratto la riscrive l'HUD con il livello («Avversario esperto», prima «CPU Pro») e non con «Avversari»; cambiando
  formato torna «Avversari».
