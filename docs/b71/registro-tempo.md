# B71 · registro, riassunto e tempo dei colpi in fiera (19/11/2026)

Agente B71-registro, ramo `b71-registro` (da `natpf-simulator` 9546b9a1). Prodotto **FIERA** (richiesta dell'utente del
19/11: «fixiamo subito i punti più importanti … procediamo per fixare tutto in giornata»). Dati: registri veri della
fiera del 18 e 19/11 (325 partite, 7.542 colpi, 1.502 colpi a vuoto, tutti Android 17 + Chrome 157 nell'app 1.0.4, LAN,
tutte in modalità fiera). Analisi di partenza: `analisi-tempo.md`, `analisi-gesti.md` §1, `analisi-sensori.md` §2 e §4
(nella cartella di lavoro della sessione, non nel repository). Niente versione nuova: i file di versione non sono toccati.

## 1. Registro (righe scritte dal gioco)

| Cosa | Prima (registri del 18–19/11) | Adesso | Dove |
|---|---|---|---|
| `cf` nella riga «colpo» | confidenza del **telefono**: 0,45 in 5.313 colpi su 5.313 (classificatore vecchio senza modelli, mai usato dal gioco) | confidenza del **gioco** (`natpfLastRacket.intent.conf`, 2 decimali: margine 0…1 dalla soglia più vicina, 0,5 il colpo normale); si scrive per ogni colpo che ce l'ha | `registro_registratore.js` (riga «colpo»); `registro_misure.js` non tiene più la confidenza del telefono |
| Pause del Player 2 | la chiave salvata («pagina nascosta (2)») si confrontava con il motivo nudo: la pausa si chiudeva e riapriva a ogni controllo al secondo. «pagina nascosta (2)» 82 volte in 82 s il 18, 45 in 45 s il 19; «sensori fermi (2)» 26 in 26 e 7 in 7 | una pausa per ogni pausa vera, con i suoi secondi (i secondi di prima erano già giusti) | `registro_misure.js`, `Pause.cambia` |
| Colpi a vuoto «tardi» | 779 righe `vuoto` «tardi» senza `ms` (il motore non passava l'errore di tempo) | `ms` (errore di tempo, come i colpi: negativo = in ritardo) e `f` (forza del gesto) | `natpf_impact.lateWhiffMeasure`, `game_engine.js` (due chiamate di `_natpfEarlyWhiff` «tardi», P1 e P2) |
| Ritardo dello schermo | mancava (chiesto già in misure-torino §5) | `displayLagMs` nella riga «partita» con il telefono (ms, 0 = mai misurato) | `registro_registratore.js`, `registro_formato.js` (`CAMPI`, `CAMPI_B71T`: nell'unione B71 il nome `CAMPI_B71` è dei campi del verso), copia nel Worker |

**Worker del registro.** `displayLagMs` è un campo nuovo: il Worker caricato dall'utente il 18/11 lo toglie in silenzio e
accetta la riga (provato: `registro-worker.test.mjs`, «Worker del 18/11»). Per averlo nello spazio bisogna ricaricare
`natpf-tennis/cloudflare/registro-worker.js` (formato sempre 3: nessun altro cambiamento). Gli altri tre punti non
chiedono niente al Worker.

## 2. Riassunto (`scripts/registro/riassunto.mjs`)

| Cosa | Prima | Adesso (stessi registri) |
|---|---|---|
| «Perfetti» per numero di colpo | sempre 0,0 %: si cercava `'perfetto'`, il registro scrive `'perfect'` | 18/11: 23,7 · 25,2 · 26,2 · 25,4 %; 19/11: 23,2 · 23,6 · 26,3 · 36,4 % (`perfetto()` accetta anche i voti italiani) |
| Confidenza bassa | «sotto 0,5» = 100 % (costante 0,45) | «sotto 0,2» (`CF_INCERTA`): colpo vicino al confine con un altro tipo; nei registri di prima 0 % e il testo dice che fino alla 18.3 era la confidenza del telefono |
| Segnale Wi-Fi assente | «senza app» per 310 (18/11) e 118 (19/11) telefoni-partita che l'app ce l'hanno | «segnale non letto (app)»; «senza app» solo senza app (correzione dell'app nell'analisi sensori §2, non qui) |
| Consumo della batteria | per partita: 60 s a passi dell'1 % → mediana 0,0 punti/h | per telefono e per giorno, sui tratti senza ricarica (almeno 0,5 h): 18/11 P1 **5,4** (6,2 h, 1 ricarica vista) e P2 **4,5** punti %/h (8,4 h); 19/11 P1 **4,7**, P2 **5,3** (2,3 h). Tabella nuova «Batteria per telefono e per giorno» |
| Pause del Player 2 | — | il titolo della tabella dice che fino alla 18.3 le volte del Player 2 sono una al secondo (i secondi sono giusti) |
| Ritardo dello schermo | — | riga nuova in «Collegamento: distribuzione» con i valori di `displayLagMs` |

**Registri finti** (`scripts/registro/finto.mjs`): voti veri del registro (`perfect`, `early`, `very early`, `late`,
`very late`; servizi `good serve`, `power serve!`…), `cf` sulla scala del gioco, colpi a vuoto «tardi» con `ms` negativo,
`displayLagMs: 0`. Le estrazioni a caso sono le stesse di prima: partite, punti e colpi dei test non cambiano.

## 3. Tempo dei colpi in fiera (solo modalità fiera; fuori dalla fiera niente cambia, provato)

### 3a. «Perfetto» asimmetrico

`swingGrade` (`natpf_skill.js`) legge `level.perfectEarly`; `fairPerfect(level, fiera)` lo mette a **0,55** unità solo in
fiera (`FAIR_PERFECT`), in `_natpfRacketShot` (`game_engine.js`, il livello `lv`). In ritardo resta 0,35. Fuori dalla fiera
`fairPerfect` restituisce lo stesso oggetto del livello. Il segnale del momento giusto (`natpf_timing_cue.cueEdges`) diventa
verde quando il voto diventa Perfetto anche in fiera.

Simulazione sui colpi veri, con il campo `tu` (tempo in unità della finestra) di ogni riga: il voto ricostruito da `tu`
coincide con quello scritto in 7.416 colpi su 7.542 (98,3 %; i 126 diversi sono per lo più volée a rete, finestra più
larga, e arrotondamenti di `tu` a 2 decimali: per loro la simulazione tiene il voto vero). Script: `b71r/sim_perfect.py`
nella cartella di lavoro.

| Colpi | n | Perfect prima → dopo | Early | Very early · Late · Very late |
|---|---|---|---|---|
| tutti | 7.542 | **25,7 → 34,4 %** | 29,8 → 21,1 % | 20,5 · 18,6 · 5,4 % (uguali) |
| in partita | 5.618 | 24,5 → 33,4 % | 30,3 → 21,4 % | uguali |
| scambi di prova | 1.924 | 29,2 → 37,4 % | 28,3 → 20,1 % | uguali |
| stesso schermo | 5.195 | 24,4 → 33,2 % | 30,6 → 21,8 % | uguali |

Con 0,5 sarebbe 32,3 %, con 0,6 36,4 % (tutti). I 660 colpi che diventano Perfetto hanno un anticipo da 15 a 215 ms
(mediana 82, 9 su 10 entro 107 ms; i più lunghi sono palle lente, con la finestra allargata da `slowFactor`).

Cosa cambia oltre al voto (direzione, profondità, qualità e colpi a vuoto usano il tempo, non il voto: provato, l'esito è
identico campo per campo salvo `grade` e `cursor`):

- **Serie di perfetti → palla più veloce** (`streakFlight`, −4,5 % del volo a ogni perfetto di fila oltre il primo):
  fattore medio del volo 0,9988 → 0,9973 (−0,15 %); colpi con il volo accorciato 2,2 → 4,5 %; lati con 3 o più perfetti
  di fila in uno scambio da 29 a 71 su 610. Trascurabile.
- **Palla debole a rete invece dell'errore** (`natpf_stroke_outcome.js`, `weak` con il voto PERFECT): dei 229 colpi falliti
  (rete o fuori) solo 4 cadono nella fascia nuova e nessuno è a rete o al volo. Nessun effetto.
- **Trofeo Cecchino** (B40, soglie 8 · 12 · 15 perfetti × game; conta solo i colpi, non i servizi). Partite finite, 603
  lati (601 a un game): perfetti per lato da 2,27 a 3,09 in media; bronzo **2,0 → 6,8 %**, argento 0,2 → 0,7 %, oro
  0,2 → 0,3 %. L'obiettivo del B40 (ritaratura del 16/11 su Torino) è bronzo 10–12 %, argento circa 3 %, oro sotto l'1 %:
  in fiera, con le partite a un game, il Cecchino era molto più raro dell'obiettivo e resta sotto anche dopo. **Soglie non
  ritarate**: per tenerlo raro come prima servirebbero 10 · 14 · 18 (2,7 · 0,3 · 0,2 %), cioè ancora più lontano
  dall'obiettivo. Se l'utente lo vuole raro come il 18–19/11, è un cambio di una riga in `natpf_trofei.js`.

### 3b. Effetto del B56 sul ritardo

La correzione `ANTICIPATION_S` (0,1 s, solo fiera) entra nel `lead` e accorciava di altrettanto, in tempo vero, la
finestra in cui un colpo arrivato dopo il punto d'impatto è ancora buono: palla a 15 m/s fino a +68 ms (prima del B56
+168), da 28 m/s in su −10 ms (bisognava colpire prima che la palla arrivasse). Adesso:

- `natpfSwingToEngine` mette la correzione nell'evento (`natpf.ant`, solo se c'è: fuori dalla fiera l'evento è identico);
- `queueUserSwing` (`natpf_impact.js`) allarga di `ant` il limite in ritardo (`lead ≥ −(lateSpan·extra + ant)`), la
  scadenza dello swing in attesa (`lateWin + ant`) e calcola «palla passata» con il tempo vero dal gesto
  (`ballAtGesture(b, lat + ant)`, B18). Il voto non cambia (resta con la correzione: un colpo così è «very late»).
- Effetto collaterale voluto: un gesto debole in attesa (`WEAK`, il colpo vero può ancora arrivare in ritardo) aspetta
  `min(0,22 s; lateWin)`, adesso con `lateWin` più lungo di 0,1 s: in fiera fino a 0,22 s invece di 0,17 (15 m/s) e 0,19
  invece di 0,09 s (28 m/s). Il colpo vero in ritardo, accettato più a lungo, ha il tempo di prendere il suo posto (è il
  «gesto doppio» dell'analisi); se non arriva, la palla parte un poco più tardi.

Limite in tempo vero dopo il punto d'impatto, livello 1v1: 15 m/s **+68 → +168 ms**, 28 m/s **−10 → +90 ms** (uguale a
fuori dalla fiera). Prove: palla a 15 m/s, picco 50 ms dopo il punto d'impatto, in fiera → 'late' (passava già prima: il
limite era +68 ms); 100 ms dopo → 'late' (prima 'whiff'); 28 m/s, 30 ms dopo → 'late' (prima 'whiff'); 180 ms dopo a 15
m/s → 'whiff' dentro e fuori dalla fiera (stesso limite vero). Quanti dei 779 colpi a vuoto «tardi» diventeranno colpi
non si può dire: le righe di prima non hanno `ms` (le prossime sì, §1).

### 3c. Ritardo dello schermo in fiera

Oggi il ritardo dello schermo è 0 su tutte e due le postazioni. Se lo staff lo misura (prova del B50) e lo salva, prima
si sommava alla correzione: con 80 ms ogni gesto risultava 80 ms più in anticipo (i colpi forti da +26 a circa +106 ms).
Adesso in fiera **la latenza totale non cambia con il ritardo dello schermo** (`natpfSwingToEngine`: in fiera il termine
dello schermo non si somma); fuori dalla fiera si somma come prima. Provato con 0, 30, 80 e 200 ms.

Nota sulla formula della richiesta, «correzione efficace max(0; 0,1 − displayLag)». Con i segni del codice
(`latency = now − at + displayLag − correzione`) quella formula darebbe, con 80 ms salvati, una latenza di +60 ms
invece di −100 ms (ogni gesto 160 ms più in anticipo), e la prova chiesta dall'analisi («con displayLag 0,08 e fiera la
latenza totale non cambia rispetto a displayLag 0») non passerebbe. Ho seguito la prova e il motivo dell'analisi (la
correzione di 0,1 s è misurata sui colpi veri guardando lo schermo dello stand, quindi il suo ritardo c'è già dentro).
Se in futuro lo stand usa uno schermo molto più lento di quello del 18–19/11, servirà rimisurare la correzione con il
registro (adesso `displayLagMs` c'è).

## 4. Prove

- Nuovo `natpf-tennis/test/natpf-b71-registro-tempo.test.mjs` (9 prove): «Perfetto» asimmetrico (unità e esito del colpo:
  +90 ms con finestra 0,17 → PERFECT in fiera, EARLY fuori; −40 ms con finestra in ritardo 0,09 → LATE uguale; resto
  dell'esito identico), segnale del momento giusto, `natpf.ant` solo in fiera, ritardo dello schermo non sommato in fiera,
  finestra in ritardo a 15 e 28 m/s dentro e fuori dalla fiera, scadenza dello swing in attesa, misura del colpo a vuoto
  «tardi», e due prove sul **motore vero** senza grafica (stesso colpo Perfetto in fiera e Early fuori; colpo a vuoto
  «tardi» con `lead` e `strength`). Con il `natpf_impact.js` di prima falliscono 5 prove su 9.
- `natpf-registro.test.mjs`: pause del Player 2 (5 s di «pagina nascosta» → [1, 5]; anche dal controllo al secondo del
  registratore), colpo a vuoto «tardi» con `ms` e `f`, `displayLagMs` nella riga «partita»; `cf` = confidenza del gioco.
- `registro-riassunto.test.mjs`: due prove nuove (voti veri, confidenza, «segnale non letto», batteria per telefono e
  giorno, ritardo dello schermo; registri finti con i voti veri): **con il riassunto e i registri finti di prima falliscono
  tutte e due**, adesso passano.
- `registro-worker.test.mjs`: il Worker del 18/11 accetta la riga «partita» nuova togliendo solo `displayLagMs`.
- `natpf-b56-anticipo.test.mjs`: aggiornata la riga che provava la somma dei due ritardi in fiera (adesso non si sommano).
- Suite: gioco **1857/1858** (1 saltata, come prima; 1844 + 14 prove nuove), sito **289/289**, build ok. Nel browser
  (Chromium, gioco vero con vite, telefono simulato): `natpf-registro-sensori.mjs` **23/23** (le righe «colpo» hanno `cf`
  del gioco: 0,5 i top spin normali, 0,42–0,44 i piatti), `natpf-registro.mjs` **39/39**, `natpf-fiera-telefoni.mjs`
  **66/66**. `docs/WORK_PROGRESS.md`,
  `PIANO_LAVORI.md` e `TRACCIA_PASSI.md` non sono aggiornati da questo ramo (lo fa chi unisce i rami B71).

## 5. Non verificato

- Telefono vero, programma Windows, ledwall: niente provato fuori dai test e dal motore senza grafica.
- Effetto vero su persone vere del «Perfetto» più largo (le simulazioni assumono che chi gioca non cambi gesto) e dei
  colpi in ritardo accettati (schiacciate meno vincenti, qualche palla fuori in più dopo un colpo molto in ritardo).
- Quanti colpi a vuoto «tardi» diventano colpi (manca il loro `ms` nei registri di prima).
- Ritardo vero del ledwall (mai misurato allo stand); la scelta di non sommarlo in fiera vale finché lo schermo è quello
  su cui è stata misurata la correzione del B56.
- Il segnale del momento giusto in fiera non tiene conto della correzione di 0,1 s (era già così dal B56): chi colpisce
  quando l'anello diventa verde risulta più in ritardo della correzione. Il segnale si vede solo contro la CPU con
  «Adulto» e «Bambino» (non nello stesso schermo, 292 partite su 325). Non toccato.
- La confidenza del gioco nei registri veri: nessun registro la ha ancora (la soglia 0,2 del riassunto è da rivedere con
  i dati della prossima giornata).
