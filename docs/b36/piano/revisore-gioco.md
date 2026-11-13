# B36 · Revisione contraria della bozza · lente «gioco e obiettivi dell'utente»

**Cosa ho letto.** `piano/bozza.md`; le cinque letture, i tre piani e il video 1 in `docs/b36/analisi/`;
`docs/RIPRESA_AGENTE.md` §4 e `docs/PROJECT_MEMORY.md` (decisioni del 13/11); i documenti di B37
(`docs/b37/collaudo-13-11-bis.md`) e B42 (`docs/b42/scambi-lunghi.md`) dai loro rami; il codice della 13.9 nella worktree
di riferimento. Sola lettura: nessun file del repository toccato, nessun commit.

**Cosa ho eseguito** (sola lettura, ognuno sotto i 2 s, nella cartella
`docs/b36/piano/revisore-gioco/`):
`controlli.mjs`, `controlli2.mjs`, `controlli3.mjs`, `controlli4.mjs`, `caldo.mjs`, con i risultati nei `.txt` accanto.
Usano la regola della bozza come la scrive il suo prototipo (`piano-prove/mappa-lib.mjs`) e le funzioni vere del gioco
(`strokeOutcome`, `createRhythm`, `strokePower`). Stessi limiti del prototipo: una palla, niente motore, niente telefono
simulato.

**Segni.** [V] verificato nel codice (file:riga) o eseguito · [P] numero del prototipo · [D] deduzione.

---

## In breve

La bozza va nella direzione giusta su tre cose: niente caso, cima e tempo che non si annullano più, campo intero
raggiungibile. Ma letta con gli occhi dell'utente e di un visitatore della fiera ha sei problemi seri.

1. **Sette tappe su un numero che nessuno ha misurato.** Quanto è preciso il giro della cima di una persona vera, e se
   le persone mirano con la cima o con il momento del colpo: la bozza lo misura per ultimo (B36.8). Lo strumento c'è già
   e funziona con la versione di oggi.
2. **Le partite simulate non vedono «Nuova» fino alla B36.7.** Con la regola della bozza i giocatori simulati dei banchi
   giocano con la regola di oggi. Bambino e Adulto, i livelli dei visitatori, arrivano all'utente senza una partita
   misurata.
3. **Chi non scopre la cima vede un campo più chiuso**, e la bozza non insegna la cima da nessuna parte prima della
   partita o durante.
4. **Il punto 2 («tempo e punto d'impatto») quasi sparisce**: peso 0,3, ritmo che si mangia l'80% del tempo tenuto,
   ritocchi di velocità sotto la soglia di percezione.
5. **Restano aiuti e scalini nascosti** contro il punto 5: calamita sulla riga (fino all'87% delle palle in 20 cm per
   chi gira tanto), scalino di 4 m a 60°, angolo corto con soglie nette (salto di 2 m) che per i bambini scatta da solo.
6. **Le tappe che l'utente prova sono incoerenti**: la cima comanda ma il riferimento si sposta ancora, riga e
   incrociato profondo arrivano tre tappe dopo, la Leggenda è più facile «fino alla B36.4».

Con le modifiche dell'ultima sezione il piano può consegnare i cinque punti. Così com'è, no.

---

## I cinque punti dell'utente, uno per uno

| Punto dell'utente | Cosa dà la bozza | Cosa manca o va contro | Rilievi |
|---|---|---|---|
| 1. La direzione impressa decide traiettoria e atterraggio, è il fattore principale | Cima all'impatto a peso pieno, tempo a 0,3 | «Movimento» ridotto alla cima all'impatto senza chiederlo all'utente; per chi non gira la cima il campo si chiude; il rumore vero della cima (che decide se «comanda» o «sembra caso») non è misurato | R1, R3 |
| 2. Colpi diversi per gesto, angolo, tempo e punto d'impatto | Tipo dalla forma (come oggi), angolo dalla cima | Il tempo diventa quasi invisibile: peso 0,3, ritmo che assorbe, ritocchi ±5–8% senza criterio di percezione | R4 |
| 3. Incrociati, lungolinea, stretti e profondi su tutto il campo, premiando la precisione | Zone raggiungibili (prototipo 74–95%) | La riga si prende girando tanto, non girando bene; nessun criterio «la direzione vince i punti»; la decisione 10 può togliere il premio | R5, R11 |
| 4. Arcade, comandi immediati; all'inizio niente palle corte e volée | Spente con «Nuova» | `groundOnly` toglie anche la schiacciata e cambia la partenza del movimento; la smorzata della Leggenda resta; il comando principale non si insegna | R10, R3 |
| 5. Gesti simili → risultati coerenti, niente traiettorie casuali o troppo assistite | Niente caso [V]; scogliera del tempo tolta [P] | Scalino a 60°, scalino dell'angolo corto, calamita sulla riga, ritmo che si adatta, riferimento giudicato senza rumore | R4–R8 |

---

## Rilievi, dal più grave

### R1 · BLOCCANTE · La misura che decide tutto arriva per ultima

**Problema.** Il piano fa della cima «il fattore principale» e porta il tempo a 0,3. La bozza stessa dice che il rumore
della cima «non è mai stato misurato con telefoni veri» e che con ±18° «la direzione comandata sembrerà caso». La prova
con il telefono vero sta nella B36.8, dopo sette tappe di codice. Le prove a favore del peso 0,3 sono circolari: il
banco conta «giusto» rispetto alla cima voluta, quindi abbassare il tempo alza i «giusti» per costruzione. Chi mira con
il momento del colpo (gesto «tempo» del banco: 58% di giusti oggi) con 0,3 va «quasi solo al centro» (rischio 6). In
più l'utente, giocando la 13.9 (tempo a peso 1), ha appena detto «direi bene con la precisione». E chi gioca a tennis
mira anche con il punto d'impatto, cioè con il momento del colpo [D].

**Prove.** Bozza §2.3 (righe 129–130), §7 rischi 1 e 6, §6 B36.8, decisioni 1 e 8; `piano-prove/direzione-1-2.txt`
(gesto «tempo»: 58% con il gesto buono, 40% con la persona vera); `docs/TRACCIA_PASSI.md` («direi bene con la
precisione», 13/11 15:00 UTC). Lo strumento esiste: `src/natpf/diag/diag_direction.js:1-12`, comando
`scripts/diag/diag.mjs direzione`, legge una sessione registrata con la prova guidata o con i segni Maiusc+M e dice per
ogni voluto «quanto il piatto e il tempo vanno nel verso giusto».

**Proposta.** Una tappa **B36.0 senza codice di gioco, prima di tutto**: 10–15 minuti allo stand con la versione di
oggi, un tennista e una persona che non gioca, blocchi «come ti viene» senza istruzioni e blocchi «gira la cima»,
registrati e letti con `diag.mjs direzione`. Ne escono: rumore del giro voluto, chi mira con il tempo e chi con la
cima, errore del seme degli scambi di prova, quota di scarti oltre 45°. Le decisioni 1, 4 e 6 si prendono con questi
numeri. Cancello: se il giro voluto sparge più di circa 15°, o se le persone mirano soprattutto con il tempo, si cambia
modello prima del codice (per esempio «il tempo amplifica la cima», R4). La prova guidata oggi si apre con Maiusc+D:
serve una tastiera per quei minuti, o il percorso con il mouse di B39, che in coda viene prima di B36.

### R2 · BLOCCANTE · Le partite simulate non vedono «Nuova» fino alla B36.7

**Problema.** La bozza passa a `strokeOutcome` lo scarto `natpf.aimDev` e scrive che senza `aimDev` vale la regola di
oggi (§5.3). I giocatori simulati con il telefono di `rally-balance.mjs` (tennista, amatore, bambino, umano: quelli di
`audit:legend`, `evento-bambini`, `cpu-pressione`, b25 e del banco di B42) mandano `intent.face` e nessun `aimDev`.
Quindi con «Nuova» accesa quei banchi giocano la regola di oggi: non «si muovono» come dice §5.5, sono ciechi. Il
cambio dei giocatori simulati è nella B36.7, mentre la bozza scrive «Prima gli strumenti». Risultato: dalla B36.1 alla
B36.6 l'utente riceve versioni con «Nuova» senza una partita simulata con le regole nuove a Bambino e Adulto. Se i
bambini e chi viene per la prima volta giocano ancora un game divertente non si sa fino alla B36.7.

**Prove** [V]. Nel gioco `aimDev` nasce solo in `natpf_phone_racket.js:274`; tra i banchi lo scrive a mano `colpi.mjs`
(:218, :342), non `rally-balance.mjs`, dove il colpo simulato porta `intent` con `face`, senza `aimDev` né `aimFull`
(`scripts/audit/rally-balance.mjs:59, :63-64`); bozza §5.3 riga 301, §5.5 righe 315–329,
B36.1 riga 365, B36.7 righe 439–447. Il criterio «il bambino vince game come oggi» è solo nella tabella §5.1, non tra i
criteri numerati.

**Proposta.** Spostare in B36.0 i giocatori simulati con `aimDev` e la mira con l'inversa della regola attiva, più un
profilo «visitatore che non mira» (il «bambino» del banco lo è già: `intent: 0`). Da B36.1, criteri di partita con
«Nuova» a Bambino e Adulto: punti vinti, durata, fuori, palle oltre 2,5 m entro ±2 punti da «Classica». Il criterio del
bambino va tra quelli numerati.

### R3 · IMPORTANTE · Il visitatore che non scopre la cima vede un campo più chiuso

**Problema.** Oggi, per chi non gira la cima apposta, il campo si apre grazie al tempo, che pesa quanto la cima. Con il
tempo a 0,3 le sue palle restano più al centro, e la CPU sbaglia meno (il suo errore cresce con l'angolo). Il tutorial
corto non ha la direzione, la decisione 7 esclude scritte nuove in partita, il «fantasma» è solo in allenamento e
tutorial (in fiera, di solito, non si fanno [D]). Il rischio 9 lo nota («non misurato»), ma il piano non propone niente. In fiera il
visitatore gioca un game: se non scopre la cima, il «campo completamente aperto» per lui è un campo più chiuso.

**Prove** [P, `controlli.mjs` e `controlli3.mjs`, sul rimbalzo vero]. Palle oltre 2,5 m dal centro, oggi → bozza:
- «bambino» del banco (non mira: tempo ±0,14 s, piatto ±0,45 unità), Bambini: 30% → 13–14% (fuori 4,5% → 0,8–1,2%);
- «amatore» quando non mira (±0,075 s, ±0,3), Evento: 26–29% → 5–8%;
- persona vera che non mira (cima ±12°, tempo +0,35 ± 0,45), Evento: 33% → 26%;
- bambino della bozza (±16°): 38% → 38%.

Quanto si chiude dipende dal rumore della cima, che non è misurato (R1). Tutorial corto: `natpf_tutorial.js:42`
(presa, posizione, dritto, rovescio, servizio).

**Proposta.**
1. Insegnare la cima **prima della partita**, dove non disturba: dopo gli scambi di prova (seme già preso) due palle
   «Gira la cima verso sinistra» e «verso destra», con il nome della zona quando cade. Oppure almeno una riga nella
   pagina «Pronto per la partita» (oggi «Colpo imparato ✓ · scegli la partita e premi «Gioca»», `natpf_trial.js:57`) e
   la stessa sul telefono. Decide l'utente: costa 3–5 s a visitatore, e le due palle misurano anche il giro vero di
   ogni visitatore.
2. Misure allo stand dal registro: colpi con |piatto| ≥ 0,5 nei primi 10 colpi, palle oltre 2,5 m per partita (gli E2 ed
   E4 del piano «prima il gioco», tolti dalla bozza).
3. Criterio di banco: con il profilo che non mira, palle oltre 2,5 m e punti vinti non sotto «Classica» − 2 punti a
   Bambini ed Evento.

### R4 · IMPORTANTE · «Tempo e punto d'impatto» (punto 2) quasi spariscono

**Problema.** Tre cose insieme tolgono il tempo dal gioco. Il peso scende a 0,3. Il ritmo resta nella formula
(`tempo = clamp(te − ritmo)`): chi colpisce sempre «un attimo prima» per incrociare perde l'80% dell'effetto dal quinto
colpo. Il «punto d'impatto» della B36.5 cambia il volo del 5–8% e l'altezza di 8–12 cm, e nessun criterio dice che si
veda (l'unico chiede che i km/h dei colpi a tempo restino ±3%). La promessa del §1 punto 3 («un attimo prima la palla va
un po' più incrociata») vale per quattro colpi.

**Prove** [V, `controlli.mjs` §5, `createRhythm` vero]. Tempo tenuto +0,5: colpi 1–4 spostamento 0,48 m con peso 0,3;
dal 5° il ritmo vale 0,40 e restano 0,10 m (oggi 1,60 → 0,32 m). Codice: `natpf_stroke_outcome.js:328` (`rRest`), `:354`
(`aimT = te − rRest`). Bozza §2.2 riga 84, §3.2 righe 197–198, B36.5 riga 423. Il piano «prima il gioco» (§2.5) proponeva
di togliere dalla direzione la parte «mediana × 0,8» del ritmo: la bozza non lo riprende e non dice perché.

**Proposta.** Con «Nuova» togliere `rRest` dalla direzione e tenere solo il ritardo abituale di B35a (`lag`), che serve
allo schermo in ritardo. Dare al tempo un ruolo che si vede: prima = più teso e veloce, dopo = più alto e lento, con un
criterio di percezione (stessa cima, anticipo pieno contro ritardo pieno: almeno 10 km/h e 25 cm sulla rete di
differenza). Nella decisione 1 mostrare anche l'alternativa «il tempo amplifica la cima, non la ribalta» (per esempio
mira = piatto × (1 + 0,4 × tempo nel verso del piatto), ±0,3 con la cima dritta): niente annullamenti, e chi mira con il
momento del colpo, come a tennis, non perde il controllo. Si misura in pochi secondi con lo stesso prototipo.

### R5 · IMPORTANTE · Calamita sulla riga: la riga si prende girando tanto, non girando bene

**Problema.** La bozza scrive «Più giri, più angolo» e «Niente calamite». Ma da circa 25° (1,6 unità di mira con P 17°) fino a 60°
la palla cade sempre a 4,00 m, 11 cm dentro la riga. Per chi gira tanto la calamita è più forte di oggi, e sta sulla riga: il
colpo più prezioso lo dà il gesto meno preciso, senza costo (decisione 3 «mai»). Il premio va a chi gira di più, non a
chi gira bene. La misura della bozza («cella 1×1 m più piena 7,2–7,5%») non la vede: è in due dimensioni, con i giri
uniformi fino a ±40°, e la profondità sparge la striscia laterale su molte celle.

**Prove** [P, `controlli4.mjs`: finestra mobile di 20 cm sul rimbalzo vero, giro G ± 12°, Pro, tempo pulito].

| Giro voluto | Oggi | Bozza |
|---|---|---|
| 20° | 36% tra 3,14 e 3,34 m | 42% tra 3,80 e 4,00 m |
| 25° | 42% | 59% |
| 30° | 45% | 72% |
| 40° | 39% | 87% |

Bozza §2.2 riga 114 (25°, 50° e 60° = 4,00 m); `piano-prove/mappa.mjs` (copertura con lo scarto da −40° a 40° a passi
di 2°).

**Proposta.** Correggere le due frasi. Misurare la calamita con la finestra mobile di 20 cm su |x| e un profilo «gira
tanto» (criterio: non oltre oggi, circa 45%). Portare la decisione 3 all'utente con questi numeri: ai livelli dei
visitatori la riga può restare «sicura»; a Esperta e Leggenda, oltre 1,6 × P la tenuta dovrebbe calare con il giro in
più («troppo angolato»), così premia chi gira giusto. La causa «troppo angolato» va data solo quando il giro c'entra:
con la decisione 3 «mai», una palla sulla riga esce solo per corsa, palla veloce o scambio caldo, e la scritta deve
dire quello.

### R6 · IMPORTANTE · Scalino di 4 m a 60°

**Problema.** «Oltre 60°: piatto non letto = 0». A 60° la palla va sulla riga, a 60,5° al centro: 4 m per mezzo grado.
Va contro il punto 5 e contro il criterio 4 della bozza stessa (≤ 0,35 m per grado). Oggi tra 45° e 60° il piatto cala
piano: continuo, anche se non monotono.

**Prove** [P, `controlli.mjs` §1]. Bozza: 59° −4,00 · 60° −4,00 · 60,5° 0,00 · 70° 0,00 m. Oggi: 50° −2,73 · 55° −1,42 ·
60° −0,11 m. Prototipo `mappa-lib.mjs` (`ad > B.MAXDEV ? 0`); bozza §2.2 riga 83. Dati veri: dopo lo swing-twist ancora
11 direzioni oltre 60° in quattro sessioni (`docs/archivio/WORK_PROGRESS_fino_al_2026-11-04.md:701`). Chi gira 40° ± 12°
manda circa il 5% delle palle al centro senza un perché visibile (`controlli.mjs` §2).

**Proposta.** Niente ritorno a 0: oltre il limite di credibilità tenere la saturazione (o scendere piano verso la mira
piena) e segnare la misura come dubbia nella diagnostica. Estendere il criterio 4 a tutto il campo 0–90°. Contare nella
sessione vera (R1) la quota di scarti oltre 45°.

### R7 · IMPORTANTE · Angolo corto a soglie nette, e per i bambini scatta da solo

**Problema.** La regola «diagonale, piatto ≥ 1, forza ≤ 0,45 → 4,6–6,6 m» è a soglie nette: due metri di salto per gesti
quasi uguali (punto 5). In più `intent.power` è per metà assoluta: il colpo tipico di un bambino (circa 380 °/s) vale
circa 0,36, quindi ogni suo incrociato alla mira piena diventa da solo un angolo corto; per un adulto il 35–40% dei colpi
è sotto 0,45. Non è una «scelta». «Piatto ≥ 1» vuol dire alla mira piena, non «oltre» come scrive §3.1. Il prototipo ha
misurato l'angolo corto con un segnale `short: true` che nella regola non esiste: il «≤ 10% senza il gesto» del criterio
5 non è misurato.

**Prove** [P, `controlli.mjs` §3]. Profondità con la forza 0,44 / 0,45 / 0,46: 6,56 / 6,60 / 8,74 m; con la cima 16,9° /
17° (forza 0,4): 8,53 / 6,38 m. Prototipo: `chosen = short && … && power <= .45`, `depth = 4.6 + 2*power/.45`.
`natpf_stroke_intent.js:84-89` (forza = 0,5 × assoluta + 0,5 × relativa); commento B15 nello stesso file (persona vera:
forza p10/p90 0,23/0,85).

**Proposta.** Angolo corto con una miscela continua (come `pick` del piano «prima il gioco»), sulla sola parte relativa
della forza (più morbido del proprio colpo tipico, per esempio sotto 0,8 volte) e da oltre 1,2 × P. Criterio di
continuità anche in profondità: ≤ 0,5 m per 0,05 di forza e ≤ 0,35 m per grado. Misurare il «senza» sulla regola vera,
con il rumore della forza.

### R8 · IMPORTANTE · Il riferimento fermo (B36.3) è giudicato con le misure che il progetto ha già scartato

**Problema.** B36.3 tiene il centro della mira entro ±4° dal seme e lo giudica con serie senza rumore (13 su 14; mira di
15° tenuta 30 colpi). Il progetto ha già provato centri più lenti nel B15 e li ha tolti: tenevano la mira tenuta senza
rumore, ma per partita, con il rumore, lasciavano più palle da una parte. La regola scritta da allora è «il centro si
giudica per partita, con il rumore». La bozza non la cita. In fiera un seme sbagliato resta per tutto il game: nessuno
ricalibra a metà.

**Prove** [V]. `natpf_gestures.js:134-146` (|mediana x| ai colpi 21–40: 0,96 contro 0,93 m; ai 61–80: 0,90 contro 0,66;
errore del centro fino a 8,9° contro 4,4°); `docs/PROJECT_MEMORY.md`, B15: «Il centro della mira si giudica per partita,
con il rumore (`--mode=partite`) … nel secondo giro B15 dicevano «meglio» e per partita era peggio»; bozza B36.3 righe
390–400, decisione 5.

**Proposta.** Criteri per partita con il rumore (`colpi.mjs --mode=partite`: |mediana x| per partita, partite oltre 1 m
da una parte, semi sbagliati di ±4°, ±8° e ±15°, seme degli scambi di prova con l'errore misurato in R1). Il centro
fermo si adotta solo se non è peggio di oggi. Le serie restano come controllo in più.

### R9 · IMPORTANTE · Le tappe che l'utente prova sono incoerenti

**Problema.** Ogni tappa esce come versione con «come si attiva». La B36.1 dà «Nuova» con il centro che assorbe ancora
la mira tenuta (fino alla B36.3), aria e bordi di oggi, incrociato profondo e riga irraggiungibili (fino alla B36.5 e
alla B36.4), palle corte e volée accese (fino alla B36.2), Leggenda più facile «fino alla B36.4». L'utente gioca solo
sul ledwall: proverà un modello a metà e lo giudicherà.

**Prove.** Bozza §6 righe 349–351 e 359–379, §5.4.

**Proposta.** Le tappe B36.1–B36.5 si fanno dietro l'interruttore, ma l'annuncio «da provare» arriva solo quando ci sono
tutti e cinque i punti: cima, riferimento fermo, tutto il campo, niente palle corte e volée, righe senza scogliere. Le
versioni prima dicono «Nuova: non ancora da provare». Dire sempre che «Nuova» vale solo con il telefono.

### R10 · IMPORTANTE · Spegnere volée e palle corte: `groundOnly` toglie troppo, e la smorzata della Leggenda resta

**Problema.** La bozza spegne la volée con `groundOnly` e dice che la schiacciata resta. Usata com'è, `groundOnly` toglie
anche la schiacciata sui pallonetti e la partenza ritardata del movimento B32: chi gioca partirebbe prima e arriverebbe
su più palle. Per la CPU la bozza tocca solo `NET_PLAY.cpu.approach` e `drop`, ma la Leggenda sceglie la sua smorzata in
`legendDecide`: con «Nuova» la Leggenda farebbe ancora palle corte, contro il punto 4.

**Prove** [V]. `natpf_impact.js:149` (`hold = R && !groundOnly ? firstStep(…) : 0`), `:169` (schiacciata solo con
`!groundOnly`), `:205` (volée); `natpf_legend.js:239` (candidato «smorzata», `shot: 'DROP'`); bozza §3.3 righe 204–208,
B36.2 riga 383.

**Proposta.** Un'opzione nuova che salta solo il ramo della volée, lasciando schiacciata e partenza. Con «Nuova» togliere
anche la smorzata della Leggenda. Test: 0 palle corte della CPU a tutti i livelli, Leggenda compresa; schiacciate e
colpi «in corsa» come con «Classica».

### R11 · IMPORTANTE · Manca il criterio «la direzione vince i punti»

**Problema.** Il punto 3 chiede di premiare la precisione; nel video i punti si vincono aprendo il campo e giocando
dall'altra parte. La bozza non ha un criterio che lo misuri (§4.2 si affida all'errore della CPU), e la decisione 10
consiglia, se Esperta diventa più facile, di rinforzare la difesa della CPU: può togliere proprio il premio della
direzione. La lettura «riferimenti» chiedeva un requisito misurabile (R10) che la bozza non riprende.

**Prove.** Bozza §4.2 righe 235–243, §5.1 righe 278–281, decisione 10; `docs/b36/analisi/lettura-riferimenti.md` §5 R10;
`video1-gioco-commerciale.md` («Il punto si vince con la direzione»); `rally-balance.mjs` registra già per ogni colpo
dove cade, dov'era la CPU e come è finito (campo `shots`).

**Proposta.** Criterio nuovo dai dati che il banco registra già: la probabilità di vincere il punto entro il colpo dopo
cresce con la distanza tra rimbalzo e CPU e con la profondità, più che con la velocità; più un indice «cambio di
direzione» (palla dall'altra parte dopo una palla larga). La decisione 10 si prende guardando anche questo criterio, non
solo i game.

### R12 · MINORE · Leggenda: i fuori in corsa crescono più di quanto dice la bozza

**Problema.** La bozza dice «+2…3 punti di fuori in corsa» a Leggenda. Con il giro «naturale» a 17° il suo prototipo dà
+5,6–6 punti, oltre il suo criterio «+5». I +2…3 valgono solo con il giro insegnato di 15°. E il criterio è solo «non
oltre»: una Leggenda più facile passa (B36.1: 14% → 0,4%). L'utente ha deciso «Leggenda com'è».

**Prove** [P]. `piano-prove/mappa-vero-full17.txt` (Leggenda, qualità 0,75: gesto buono 3% → 9%, persona vera 15,3% →
20,9%); `mappa-vero-full17g15.txt` (2,4% → 4,5%; 14,1% → 17,5%); bozza §5.1 riga 276, B36.4 righe 411–412.

**Proposta.** Dare i numeri per gesto. Criterio a due vie per la Leggenda: entro ±3 punti da «Classica», da ferma e in
corsa.

### R13 · MINORE · Lo scambio caldo finirebbe con più fuori, non con più spettacolo

**Problema.** B42 nasce perché la partita sia «più spettacolare» e gli scambi lunghi finiscano con colpi forti o
speciali. La bozza lega la tenuta della riga anche alla pressione dello scambio caldo: le palle sulla riga escono di più
dal 24° colpo circa a Esperta, dal 28° a Evento, dal 22° a Leggenda. Gli scambi caldi finiscono con più errori. B42 ha
già visto che tra giocatori precisi lo scambio caldo finisce soprattutto in rete.

**Prove.** [V, `caldo.mjs`, aritmetica della formula della bozza con `HOT_RALLY` di B42] tenuta della riga con un colpo
pulito: colpo 24 Esperta 0,88, colpo 26 Esperta 0,46, colpo 28 Esperta 0,07 ed Evento 0,67, colpo 30 Evento 0,29.
Bozza §2.2 righe 95–98, §2.4 righe 154–157; `docs/b42/scambi-lunghi.md` §6 (in rete dal 4% al 31% tra due «tennisti»).

**Proposta.** Togliere la pressione dello scambio caldo dalla tenuta della riga (resta dove B42 la usa). Criterio: con
«Nuova», quota di punti oltre il 20° colpo che finiscono con un vincente o un super non sotto la base di B42.

### R14 · MINORE · Vicino alla rete varrebbe ancora la regola di oggi

**Problema.** La bozza non dice se la regola nuova vale quando chi gioca colpisce vicino alla rete (entro 6,4 m o palla
corta raggiunta). Anche senza smorzate della CPU ci sono palle che cadono corte (per esempio l'incrociato stretto della Leggenda, 5,2–6,6 m
dalla rete: `natpf_legend.js:229`) e portano chi gioca lì: varrebbero ancora tempo a peso 1, spinta verso l'incrociato e
punto neutro che segue la palla. Due regole nello stesso scambio.

**Prove** [V]. `natpf_stroke_outcome.js:309` (`nearNet = net || shortBall || zc ≤ 6,4`), `game_engine.js:2352`
(`shortBall`). Ho controllato anche che lì non c'è caso: il colpo «controllato» con il seme non può scattare (`failQ`
al massimo 0,34, sotto `netQMin` 0,45: `natpf_stroke_outcome.js:118`, `:196-215`, `:335`).

**Proposta.** Con «Nuova» la direzione nuova vale per tutti i colpi tranne la schiacciata (la chiusura tiene la sua
velocità). Contare nel banco la quota di colpi nella zona di rete.

### R15 · MINORE · «Punta» non è «gira»; e la camera

**Problema.** Il §1 dice «la palla va dove punta la cima». Davanti al ledwall, puntare gli angoli del campo lontano vuol
dire girare pochi gradi, dentro o vicino alla zona morta di 3°; la mira piena è a 17°. Chi prova «puntando», l'utente
compreso, vedrà la palla andare al centro. Sulla camera la bozza tace: nel video il campo lontano, dove si mira, pesa di
più rispetto a quello vicino.

**Prove** [L + D]. Camera di oggi (in 16:9): 1 m di lato al fondo lontano vale l'1,9% della larghezza dell'immagine,
quindi il singolare circa il 16% (`lettura-riferimenti.md` §1; camera in `natpf_camera.js:43-56`). Scheda «Posizione di
partenza»: «A 1,5–2 m dallo schermo» (`natpf_tutorial.js:37`). Con uno schermo largo 1,4–2 m gli angoli lontani stanno
a ±3–6° (la misura del ledwall non la conosco). Video: campo vicino 25% dell'altezza, da noi 36% (`lettura-riferimenti.md`).

**Proposta.** Nel §1 e in tutti i testi: «gira la cima di circa 15–20° rispetto al tuo colpo normale», mai «punta».
Mettere la camera, con una riga, tra le cose fuori da B36 e proporla all'utente come prova a parte dopo B36.

---

## Cosa la bozza fa bene (controllato)

- **Niente caso** nel singolare con il telefono: il colpo «controllato» a rete non può scattare (R14) [V].
- **Scogliera del tempo tolta**: 10 ms valgono 0,23–0,48 m invece di 1,61–1,98 m [P, `mappa-vero-full17.txt`].
- **Cima e tempo non si annullano più**: cima lungolinea con anticipo pieno da 0,29 a 2,24 m [P].
- **Incrociato profondo raggiungibile** e aria corretta di lato [P].
- **Interruttore** con «Classica» identica, e la richiesta di una prova vera prima dell'accensione.

## Modifiche proposte al piano (riassunto)

1. **B36.0 nuova, prima di ogni regola**: sessione vera con la versione di oggi (R1); giocatori simulati con `aimDev` e
   profilo «visitatore che non mira» (R2); misure «prima».
2. **Ordine**: la prima tappa di regole unisce cima, ritmo fuori dalla direzione (R4), niente scalino a 60° (R6) e
   riferimento fermo se passa R8. La prima versione «da provare» arriva quando ci sono tutti e cinque i punti (R9).
3. **Criteri nuovi**: Bambino e Adulto con «Nuova» entro ±2 punti (R2); campo aperto per chi non mira (R3); tempo che si
   vede (R4); calamita non oltre oggi (R5); continuità 0–90° e in profondità (R6, R7); riferimento per partita con il
   rumore (R8); la direzione vince i punti (R11); Leggenda a due vie (R12); fine degli scambi caldi (R13).
4. **Decisioni per l'utente, nuove o riscritte**:
   - **D0** «Che cosa vuol dire movimento»: la cima all'impatto (consigliata se la sessione vera lo conferma) oppure
     anche il momento del colpo, come a tennis;
   - **D1** con l'alternativa «il tempo amplifica la cima»;
   - **D3** con i numeri della calamita;
   - **insegnare la cima prima della partita** (due palle dopo gli scambi di prova, o una riga nella pagina «Pronto»);
   - **D10** legata al criterio R11.
5. **Testi**: «gira», non «punta»; correggere «niente calamite» e «più giri, più angolo»; «troppo angolato» solo quando
   il giro c'entra.

## Non verificato

- Tutti i miei numeri [P] usano il prototipo della bozza: una palla, niente motore, niente telefono simulato, niente
  centro che impara, rimbalzo vero di oggi stimato con 0,86 dello spostamento.
- Non ho lanciato banchi del motore (rally-balance, `audit:legend`), prove nel browser, telefoni veri o il ledwall.
- La misura del ledwall non la conosco: i gradi di R15 sono un esempio.
- Il bambino del banco (piatto ±0,45 unità) e quello della bozza (±16°) sono due ipotesi diverse: quale vale lo dice solo
  la sessione vera.
- I numeri di B37 e B42 vengono dai loro rami con il commit «IN CORSO … NON verificato».
