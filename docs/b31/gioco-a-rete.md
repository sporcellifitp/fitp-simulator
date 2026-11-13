# B31 · Tappa 3.1 · Più gioco a rete per tutti e due

Tappa 3, punto 1 del rapporto `docs/b16/rapporto-gameplay.md` (§3 punto 6 «Più gioco a rete», §4 tappa 3 punto 1,
appendice M6 e punto 22 «A rete contro la Leggenda»). Lavoro fatto nel ramo `b31-gioco-a-rete`, partito da `1906562`
(versione 2026-11-13.1), senza push e senza toccare `natpf-simulator`, `main`, i file di versione e i documenti di
ripresa.

**Tutti i numeri qui sotto vengono dal gioco simulato** (il motore vero senza disegno, con i giocatori simulati del
banco). Non sono misure di persone vere, telefoni veri, del PC dell'evento o del ledwall.

## In breve

- **Chi gioca sale a rete da solo** dopo un attacco riuscito e lì gioca volée e schiacciate. Prima tornava sempre in
  fondo: le volée erano 0,1 per game, ora 0,4–1,6 per game a Casual, Pro ed Evento.
- **La CPU sa andare a rete** quando ha un colpo d'attacco che fa correre chi gioca, gioca la volée, **schiaccia le
  palle alte** e fa **qualche rara palla corta** (al massimo una per game, con la scritta «Palla corta della CPU»).
- **Il tagliato rimbalza più basso** e la CPU in fondo lo sbaglia un poco di più. Non è diventato la tattica che vince.
- **Difetti della rete (punto 22)**: le volée non escono più di lato più dei colpi da fondo; la schiacciata riuscita a
  rete contro la Leggenda torna indietro meno spesso; a rete ci si muove meno in fretta, così chi sale male viene
  passato o scavalcato dal pallonetto, e la Leggenda ora gioca i passanti.
- Il **riconoscimento dei gesti non è toccato**: cambiano solo movimento, esiti dei colpi e scelte della CPU.

## Cosa cambia per chi gioca

### 1. Chi gioca va a rete (e ci resta dopo la volée)

Il personaggio sale da solo verso la rete (fino a 5,2 m dalla rete) dopo il suo colpo se è stato **un attacco
riuscito**:
- una palla corta presa **alta** (sopra 0,85 m) da dentro il campo e giocata **profonda** (oltre 8 m) e pulita;
- un **tagliato** profondo giocato da poco dentro la riga di fondo (il tagliato basso è il colpo per avvicinarsi);
- un colpo **forte, profondo e pulito** da dentro la riga di fondo.

Dopo una **volée o una schiacciata riuscite** resta a rete. Dopo un colpo fallito, debole, in rete, un pallonetto o una
palla corta torna in fondo come prima. Dalla riga di fondo non si va mai a rete.

**A rete ci si muove meno in fretta** (si reagisce un poco dopo e il passo è più corto, come nel tennis vero): la palla
che passa lontana (passante) o sopra la testa (pallonetto) può battere chi è salito male. Prima il movimento automatico
arrivava su tutto anche a rete, e salire non costava mai niente.

### 2. La volée

- La volée vicino alla rete ha **più margine sulla direzione** (la palla veloce non la spinge più fuori di lato) e il
  bordo morbido sulle righe laterali a tutti i livelli (prima solo a Leggenda).
- Il **voto** («Perfetto», «Anticipo», «Ritardo») resta quello di sempre: coincide ancora con l'anello verde del momento
  giusto.

### 3. La CPU a rete, la sua schiacciata, la sua palla corta (Casual, Pro, Evento)

- **Sale a rete** dopo il suo attacco su una palla debole di chi gioca, solo se la sua palla fa correre chi gioca (cade ad
  almeno 3,5 m da lui), e al massimo una volta per punto. Probabilità: Casual 25%, Pro 40% di quegli attacchi (Evento in
  mezzo, secondo il livello raggiunto). A **Bambini** e a **Leggenda** non sale mai (la Leggenda ha le sue scelte).
- **A rete gioca la volée** (spesso corta e angolata) e **schiaccia** le palle che le passano alte sopra la testa; se il
  pallonetto la scavalca torna indietro. Anche dal fondo schiaccia al volo il pallonetto corto che raggiunge. La
  schiacciata ha la posa da sopra la testa (anche con Lob & Drop) e la scia della schiacciata.
- La CPU a rete può sbagliare la volée e la schiacciata (un po' di più con la palla veloce): in rete, lunga o larga.
- **Palla corta della CPU: rara e dichiarata.** Solo quando chi gioca è lontano dietro la riga di fondo e la CPU è dentro
  il campo, mai sulla risposta, **al massimo una per game**; può finire in rete. Sullo schermo, vicino alla CPU, compare
  la scritta **«Palla corta della CPU»**. A Bambini e a Leggenda no (la Leggenda ha già le sue smorzate: vedi «Cosa non
  è riuscito»).

### 4. Il tagliato

- Il tagliato forte (quello di chi gioca e il tagliato pieno della CPU) **rimbalza più basso**: nella prova nel browser
  il primo rimbalzo risale a 0,53 m contro 1,12 m del top spin nella stessa scena. Il tagliato morbido e la palla corta
  rimbalzano come prima.
- La CPU che lo prende **da dietro** lo sbaglia un poco di più (Casual +0,6%, Pro +0,3% a colpo, per la qualità del
  colpo); la Leggenda lo prende da oltre 10 m con il 6% di qualità in meno.

### 5. Schiacciata di chi gioca contro la CPU (punto 22)

- La schiacciata riuscita si prende **solo vicino al corpo** (al massimo 0,9 m di lato), **non appena rimbalzata** (in
  salita sotto 0,9 m) e la Leggenda non fa l'affondo su di lei; la Leggenda la legge in ritardo (0,15 s) e risponde
  peggio.

### 6. La Leggenda contro chi è a rete (punto 22)

- Prima la Leggenda stimava sempre il punto dopo il rimbalzo, come se chi è a rete dovesse tornare in fondo: le palle
  profonde le sembravano vincenti e i passanti inutili. Ora guarda **dove passa la palla quando arriva all'altezza di
  chi è a rete** e quanto lui si muove lì, e ha due colpi nuovi: **passante** stretto incrociato e **passante** teso
  lungolinea, lontani da chi gioca.

### Stesso schermo tra due persone

Stessa regola per tutti e due (approccio, volée, passo a rete, tagliato). La CPU non c'è, quindi niente CPU a rete né
palla corta della CPU. L'aiuto al più giovane (HELP.G) funziona come prima (tabella 6).

### Registro dello stand

- Ogni colpo di chi gioca ha il campo nuovo **`rete: 1`** quando è giocato entro 7 m dalla rete; il campo `in` (la palla
  che arrivava) ora dice anche **«volée»**, **«schiacciata»** o **«palla corta»** quando è un colpo a rete della CPU, a
  tutti i livelli.
- Lo strumento di riassunto (`natpf-tennis/scripts/registro/riassunto.mjs`) ha la sezione nuova **«Gioco a rete»**:
  colpi a rete di chi gioca, volée, colpi a rete della CPU per tipo.
- Il campo `rete` è aggiunto anche al **Worker del registro** (`natpf-tennis/cloudflare/registro-worker.js`): **va
  ricaricato su Cloudflare** con la prossima versione, altrimenti il Worker vecchio non conosce il campo nuovo.

## Come si attiva / come si spegne

- **Si attiva da solo**: le regole nuove valgono sempre, a tutti i livelli contro la CPU (Bambini, Casual, Evento, Pro,
  Leggenda, con le eccezioni dette sopra) e nello stesso schermo tra due persone. **Non c'è nessuna opzione nuova** nel
  menu né nel pannello dello staff.
- **Non si spegne dal gioco.** Solo per le prove e i banchi si possono rimettere le regole di prima in memoria:
  `netPlayRules.off = true` in `natpf-tennis/src/natpf/natpf_net_play.js` (lo usano `test/natpf-b31-rete.test.mjs`,
  `test/natpf-b25-stesso-schermo.test.mjs` e il banco con `--senza-b31`). Con le regole spente il gioco è **identico**
  alla base `1906562`: stesse partite punto per punto (verificato, vedi «Verifiche»).
- Tutti i valori stanno in un posto solo: `NET_PLAY` in `natpf-tennis/src/natpf/natpf_net_play.js` (approccio, passo a
  rete, CPU a rete, palla corta della CPU, schiacciata), più `OUTCOME.volleyHoldZ` e `volleySpan` in
  `natpf_stroke_outcome.js` (volée), `SLICE_BOUNCE`, `SLICE_ERR` e `LEGEND_SMASH` in `natpf_skill.js`, `netReach`,
  `sliceQ` e `sliceFrom` in `natpf_legend.js` (`LEGEND`).

## Misure prima e dopo

Banco nuovo: `npm run audit:rete` (`natpf-tennis/scripts/audit/rete.mjs`), 3 semi × 300 punti per casella, due serie
di semi (serie 1: 2001, 2038, 2075; serie 2: 5003, 5044, 5085). «Prima» = la base `1906562` con lo stesso banco. Ogni
casella è **«serie 1 / serie 2 prima → serie 1 / serie 2 dopo»**. Risultati completi in
`natpf-tennis/scripts/audit/results/b31/` (`prima-s1.json`, `prima-s2.json`, `dopo-s1.json`, `dopo-s2.json`); la tabella
si rifà con `node scripts/audit/rete-confronto.mjs <colonne> [--tattica=tagliati] [--livelli=…] [--profili=…]`.

Comandi (da `natpf-tennis`):

    npm run audit:rete -- --difficulty=casual,pro,leggenda,bambini,evento --profiles=tennista,amatore,bambino,umano,preciso --tattiche=normale,tagliati [--serie=2] [--json]
    npm run audit:rete -- … --senza-b31        (regole spente: deve dare gli stessi numeri della base)
    npm run audit:legend
    npm run audit:evento
    node --import ./test/register.mjs scripts/audit/b25/misure.mjs aiuto | pari

Profili del banco: «tennista» (bravo), «amatore» e «umano» (adulto medio), «bambino», «preciso» (il più bravo).

### 1. Punti e game vinti da chi gioca, durata degli scambi

| livello | profilo | punti vinti % | game vinti % | colpi per punto |
|---|---|---|---|---|
| Casual | tennista | 99,7 / 99,6 → 99,3 / 99 | 100 / 100 → 100 / 100 | 4,73 / 4,72 → 4,61 / 4,51 |
| Casual | amatore | 86,9 / 88,4 → 85,2 / 87,4 | 100 / 100 → 99,4 / 99,5 | 9,42 / 8,86 → 8,79 / 8,71 |
| Casual | bambino | 45 / 48,2 → 48,8 / 50,4 | 36,6 / 48,1 → 47,4 / 50,7 | 7,51 / 7,45 → 7,23 / 7,08 |
| Casual | umano | 87,9 / 87,6 → 88,3 / 85,9 | 99,5 / 99,4 → 100 / 98,9 | 8,89 / 9,08 → 9,04 / 9,11 |
| Pro | tennista | 95,6 / 97,9 → 96,8 / 96,7 | 100 / 100 → 100 / 100 | 9,61 / 10,02 → 8,86 / 8,66 |
| Pro | amatore | 55,5 / 54,8 → 54,6 / 56,5 | 63,2 / 63 → 62,9 / 67 | 14,8 / 14,25 → 13,31 / 14,17 |
| Pro | bambino | 14,6 / 14 → 16,9 / 19,5 | 0 / 0,5 → 1,6 / 1,2 | 7,39 / 7,42 → 7,77 / 8,44 |
| Pro | umano | 60,4 / 63 → 65,5 / 66,1 | 76,5 / 80,2 → 81,6 / 86 | 16,79 / 16,08 → 15,38 / 16,17 |
| Leggenda | tennista | 29,6 / 33,3 → 29,9 / 31,2 | 11,8 / 10,4 → 12,5 / 12,2 | 21,71 / 20,87 → 21,89 / 21,44 |
| Leggenda | amatore | 13,6 / 15,9 → 12,8 / 15,2 | 0 / 0,8 → 0 / 1,5 | 13,14 / 13,78 → 12,67 / 13,82 |
| Leggenda | umano | 20,3 / 18,4 → 22,3 / 20,1 | 0 / 2 → 3,1 / 3,1 | 17,61 / 18,58 → 18,2 / 18,9 |
| Leggenda | preciso | 45,9 / 45,3 → 37,8 / 35,7 | 40 / 38,5 → 19,4 / 16,7 | 23,33 / 22,72 → 23,84 / 24,25 |
| Bambini | bambino | 73 / 76,1 → 79,7 / 82,5 | 93,3 / 94,7 → 96,6 / 99,3 | 10,6 / 10,14 → 9,7 / 10,2 |
| Bambini | umano | 88,4 / 89,3 → 89,2 / 90,8 | 99,4 / 100 → 98,9 / 100 | 9,65 / 10,13 → 9,56 / 8,46 |
| Evento | amatore | 65 / 64,4 → 65,3 / 64,5 | 86,5 / 81,7 → 85,3 / 80,9 | 14,19 / 14,49 → 14,96 / 13,27 |
| Evento | bambino | 44,1 / 46,6 → 44,4 / 50,4 | 34,4 / 41,4 → 35,5 / 52,2 | 7,3 / 6,98 → 7,21 / 7,57 |
| Evento | umano | 68,1 / 67,5 → 70,4 / 69,2 | 85,6 / 92,4 → 91,7 / 89,8 | 16,36 / 18,16 → 16,52 / 17,18 |

Gli scambi durano quasi come prima (± 1 colpo). Chi vince di più: il bambino a Casual (+2–4 punti), a Pro (+2–5) e a
Bambini (+6); l'«umano» a Pro (+3–5). Chi vince di meno: «preciso» a Leggenda (−8 / −10 punti, vedi «Cosa non è
riuscito»).

### 2. Chi gioca a rete

«a rete»: quota dei colpi della CPU con chi gioca entro 7 m dalla rete. «vinti a rete»: punti vinti tra quelli in cui
chi gioca è stato a rete. «fuori di lato»: volée e colpi da fondo che cadono oltre la riga laterale.

| livello | profilo | a rete % | vinti a rete % | volée per game | volée fuori di lato % | colpi da fondo fuori di lato % |
|---|---|---|---|---|---|---|
| Casual | tennista | 0,1 / 0 → 13,3 / 14,9 | 100 / 100 → 98,9 / 96,9 | 0,1 / 0,09 → 0,59 / 0,68 | 4,3 / 0 → 3,8 / 4,6 | 0,5 / 0,8 → 0,9 / 0,7 |
| Casual | amatore | 0,2 / 0 → 5,6 / 6,2 | 100 / 90,5 → 87,4 / 80,8 | 0,11 / 0,06 → 0,77 / 0,76 | 0 / 0 → 2,9 / 8,5 | 5,2 / 5,3 → 5,9 / 5,5 |
| Casual | bambino | 0,1 / 0,1 → 0,9 / 1,9 | 60,9 / 60,7 → 55,9 / 50 | 0,08 / 0,13 → 0,16 / 0,39 | 0 / 5,6 → 4,5 / 0 | 8,9 / 9,7 → 10,1 / 10 |
| Casual | umano | 0,1 / 0,1 → 3,2 / 4,5 | 88,9 / 90,9 → 87,6 / 85,1 | 0,1 / 0,08 → 0,43 / 0,64 | 0 / 13,3 → 3,8 / 3,5 | 7,3 / 7,3 → 6,3 / 7 |
| Pro | tennista | 0,1 / 0,1 → 8,2 / 9,7 | 86,7 / 100 → 94,3 / 95,2 | 0,03 / 0,04 → 0,97 / 1,15 | 14,3 / 0 → 3,3 / 2 | 3,2 / 2,3 → 2,2 / 3 |
| Pro | amatore | 0,1 / 0 → 5,6 / 4 | 57,1 / 66,7 → 61,5 / 57,4 | 0,03 / 0,03 → 1,63 / 1,11 | 0 / 0 → 5,7 / 3 | 9,8 / 9,9 → 9,8 / 9 |
| Pro | umano | 0,1 / 0,1 → 3,7 / 3,8 | 72,7 / 71,4 → 76,9 / 73,2 | 0,06 / 0,09 → 1,04 / 1,23 | 20 / 12,5 → 2 / 2,8 | 8,2 / 8,9 → 9,4 / 8,2 |
| Leggenda | tennista | 4,4 / 5 → 5,3 / 5,4 | 26,1 / 32,8 → 24,8 / 25,2 | 2,33 / 2,58 → 0,9 / 0,85 | 18,2 / 10,6 → 4,2 / 2,9 | 16,9 / 16,2 → 17,5 / 17,9 |
| Leggenda | umano | 0,1 / 0,2 → 1,3 / 1,4 | 23 / 20,3 → 26,3 / 21,9 | 0,14 / 0,15 → 0,18 / 0,22 | 0 / 6,7 → 17,6 / 4,8 | 15,4 / 14 → 15,1 / 14,4 |
| Leggenda | preciso | 6,6 / 7,6 → 3,1 / 2,8 | 46,7 / 45,8 → 31,9 / 29,9 | 4,46 / 5,15 → 0,82 / 0,7 | 2,1 / 1,5 → 2 / 2,2 | 9,8 / 10,3 → 11 / 11,2 |
| Evento | amatore | 0 / 0 → 2,5 / 2,2 | 66,7 / 44,4 → 71,7 / 65,2 | 0,06 / 0,09 → 0,6 / 0,49 | 0 / 0 → 3,5 / 5,6 | 8,2 / 8,6 → 8,5 / 9,2 |
| Evento | umano | 0,1 / 0 → 1 / 1,1 | 70 / 71,4 → 76,8 / 74,6 | 0,09 / 0,06 → 0,24 / 0,28 | 22,2 / 20 → 0 / 12 | 7,8 / 7,3 → 7,8 / 7,4 |

- **Tetto**: chi gioca è a rete al massimo nel 15% dei colpi della CPU a Casual, Pro, Evento e Leggenda (obiettivo del
  rapporto: 10–15%). Fa eccezione «tennista» al livello **Bambini** (35%): un adulto bravo contro la CPU dei bambini
  attacca quasi ogni palla. Il bambino a Bambini è a rete nel 5,6–7,4%.
- **Volée fuori di lato**: prima a Casual e Pro le volée uscivano di lato da 1,5 a 40 volte più dei colpi da fondo
  (pochi casi), ora quasi sempre meno o uguale. Alcune caselle con pochissime volée (Leggenda/umano, Evento/umano serie
  2) restano sopra: 1–3 volée su 17–25.
- **A rete paga, ma non sempre**: a Casual e Pro chi gioca vince a rete più o meno quanto in tutto il resto della
  partita; a Leggenda meno (vedi punto 22).

### 3. Schiacciate e pallonetti di chi gioca (Casual, Pro, Leggenda)

«schiacciate a rete rimandate»: schiacciate colpite entro 7 m dalla rete, cadute in campo, che la CPU rimette in gioco.

| livello | profilo | schiacciate | rimandate % | a rete | a rete rimandate % | pallonetti | pallonetti che fanno punto % |
|---|---|---|---|---|---|---|---|
| Casual | tennista | 5 / 2 → 34 / 26 | 20 / 0 → 14,7 / 15,4 | 5 / 2 → 34 / 26 | 20 / 0 → 14,7 / 15,4 | 36 / 39 → 55 / 50 | 2,8 / 5,1 → 5,5 / 4 |
| Casual | amatore | 10 / 11 → 31 / 50 | 40 / 9,1 → 23,3 / 30,6 | 10 / 11 → 31 / 50 | 40 / 9,1 → 23,3 / 30,6 | 15 / 20 → 22 / 17 | 6,7 / 10 → 4,5 / 0 |
| Pro | amatore | 14 / 10 → 20 / 17 | 50 / 55,6 → 60 / 62,5 | 14 / 10 → 20 / 17 | 50 / 55,6 → 60 / 62,5 | 17 / 26 → 42 / 52 | 0 / 0 → 2,4 / 7,7 |
| Pro | umano | 11 / 10 → 25 / 28 | 80 / 70 → 52 / 39,3 | 11 / 10 → 25 / 28 | 80 / 70 → 52 / 39,3 | 10 / 18 → 24 / 15 | 0 / 0 → 25 / 13,3 |
| Leggenda | tennista | 31 / 49 → 23 / 19 | 54,8 / 59,6 → 52,2 / 31,6 | 19 / 35 → 18 / 15 | 52,6 / 67,6 → 55,6 / 33,3 | 48 / 31 → 38 / 38 | 8,3 / 3,2 → 0 / 0 |
| Leggenda | amatore | 15 / 41 → 22 / 26 | 66,7 / 66,7 → 23,8 / 26,9 | 11 / 31 → 16 / 18 | 62,5 / 65,5 → 33,3 / 22,2 | 22 / 27 → 23 / 33 | 4,5 / 3,7 → 0 / 9,1 |
| Leggenda | umano | 16 / 30 → 14 / 15 | 66,7 / 73,1 → 7,7 / 28,6 | 10 / 23 → 10 / 10 | 44,4 / 68,4 → 11,1 / 33,3 | 3 / 1 → 3 / 1 | 0 / 0 → 0 / 0 |

- Le schiacciate per 900 punti passano da 2–14 a 13–50 a Casual e Pro.
- **Leggenda, schiacciata riuscita a rete rimandata (punto 22)**: prima 44–68% (una su due), ora 11–56%. Migliora
  molto con «amatore» e «umano», poco con «tennista» (55,6 / 33,3%). I casi sono pochi (10–18 per casella): ± 10–15
  punti di incertezza.
- I pallonetti di chi gioca sono pochi nel banco (i profili li giocano solo con la CPU avanti): fanno punto 0–25%.

### 4. La CPU a rete, le sue schiacciate e le sue palle corte

| livello | profilo | CPU a rete (% dei suoi colpi) | punti con la CPU a rete % | vinti dalla CPU % | volée della CPU per game | schiacciate della CPU per game | palle corte della CPU per game | volée e schiacciate di tutti e due per game |
|---|---|---|---|---|---|---|---|---|
| Casual | amatore | 0 / 0 → 1,4 / 0,8 | 0 / 0 → 2 / 1,3 | – → 5,9 / 9,1 | 0 / 0,01 → 0,24 / 0,15 | 0 → 0,01 | 0 → 0,31 / 0,31 | 0,17 / 0,13 → 1,2 / 1,18 |
| Casual | bambino | 0,3 / 0,1 → 3,4 / 3,4 | 1,1 / 0,3 → 4,4 / 5,3 | 40 / 0 → 52,5 / 37,5 | 0 → 0,57 / 0,54 | 0 → 0 | 0 → 0,36 / 0,35 | 0,2 / 0,22 → 0,91 / 1,12 |
| Casual | umano | 1,1 / 1 → 2,6 / 2,5 | 4 / 4 → 6,3 / 5,7 | 2,9 / 0 → 0 / 6,3 | 0,03 / 0,05 → 0,28 / 0,3 | 0 → 0,01 / 0 | 0 → 0,23 / 0,28 | 0,17 / 0,19 → 0,82 / 1,1 |
| Pro | tennista | 0 → 3 / 2,2 | 0 → 3,7 / 3,1 | – → 6,1 / 3,6 | 0 → 0,45 / 0,32 | 0 → 0,02 / 0 | 0 → 0,04 / 0,04 | 0,08 / 0,07 → 1,5 / 1,53 |
| Pro | amatore | 0 → 8,5 / 7,8 | 0,2 / 0 → 9,4 / 10,2 | – → 46,8 / 30,2 | 0 → 3,36 / 3,34 | 0 → 0,11 / 0,1 | 0 → 0,68 / 0,65 | 0,2 / 0,14 → 5,31 / 4,74 |
| Pro | umano | 1,3 / 1,1 → 7 / 8,1 | 9,7 / 7,9 → 14,5 / 18,1 | 21,2 / 22,7 → 20,2 / 24,8 | 0,06 / 0,05 → 2,41 / 3,33 | 0 → 0,03 | 0 → 0,44 / 0,55 | 0,26 / 0,26 → 3,73 / 4,92 |
| Evento | amatore | 0 / 0,1 → 6,9 / 5,9 | 0,2 / 0,7 → 8,2 / 7,6 | – → 28,6 / 24 | 0 → 2,87 / 2,07 | 0 → 0,09 / 0,05 | 0 → 0,65 / 0,62 | 0,09 / 0,11 → 3,72 / 2,72 |
| Evento | umano | 1,5 → 5,7 / 6,7 | 10,3 / 11,7 → 19,1 / 17 | 19,3 / 20,3 → 21 / 19,8 | 0,07 / 0,18 → 1,95 / 2,69 | 0 → 0,02 / 0,05 | 0 → 0,54 / 0,49 | 0,22 / 0,29 → 2,32 / 3,11 |
| Leggenda | umano | 2,5 / 2,4 → 2 / 2,2 | 18,2 / 20 → 14,4 / 17,4 | 74,7 / 79,8 → 68,5 / 80 | 0 → 0 | 0 → 0 | 7,04 / 7,02 → 7,67 / 8,21 | 0,31 / 0,45 → 0,32 / 0,37 |

- **Obiettivo del rapporto «almeno una schiacciata o volée per game a Casual»**: raggiunto contando tutti e due
  (0,8–1,2 per game a Casual, prima 0,1–0,2); con chi gioca da solo 0,4–0,8 per game.
- **Palle corte della CPU** (Casual, Pro, Evento): 0,2–0,7 per game, mai più di una per game. Nel banco non fanno mai
  punto da sole (chi gioca ci arriva sempre col movimento automatico), ma portano chi gioca avanti.
- **«Punti con la CPU a rete»** conta anche le palle corte di chi gioca che la CPU va a prendere vicino alla rete (per
  questo non era zero prima).
- **La CPU a rete vince poco** contro chi gioca bene (Pro/umano 20–25% dei punti in cui è stata a rete): vedi «Cosa non
  è riuscito».

### 5. Tagliato: solo tagliati contro il colpo normale

Tattica «tagliati» del banco: ogni colpo dello scambio è un tagliato, stesso gesto e stesso tempo. Il criterio della
tappa 2 per la palla corta (al massimo +3 punti sul colpo normale) è usato anche qui.

| livello | profilo | punti, solo tagliati (prima → dopo) | punti, colpo normale (dopo) | differenza dopo | tagliati che fanno punto % |
|---|---|---|---|---|---|
| Casual | tennista | 99,8 / 99,8 → 99 / 99 | 99,3 / 99 | −0,3 / 0 | 32,4 / 30 → 36,4 / 36,4 |
| Casual | amatore | 84,7 / 87,1 → 88,7 / 87,9 | 85,2 / 87,4 | +3,5 / +0,5 | 19,1 / 20 → 24,5 / 24,7 |
| Casual | umano | 88,2 / 86 → 88,2 / 88 | 88,3 / 85,9 | −0,1 / +2,1 | 18,8 / 19,1 → 24,9 / 25,5 |
| Pro | tennista | 88,9 / 91 → 94 / 93,1 | 96,8 / 96,7 | −2,8 / −3,6 | 9 / 9,4 → 13,9 / 14,1 |
| Pro | amatore | 52,4 / 52,4 → 59,5 / 57,5 | 54,6 / 56,5 | **+4,9** / +1 | 7,5 / 6,9 → 8,8 / 8,5 |
| Pro | umano | 59,8 / 61,1 → 65,1 / 67,3 | 65,5 / 66,1 | −0,4 / +1,2 | 6,8 / 7,1 → 9,6 / 10,3 |
| Leggenda | tennista | 27,6 / 26,1 → 27,7 / 24,9 | 29,9 / 31,2 | −2,2 / −6,3 | 2,1 / 2,1 → 2,4 / 2,2 |
| Evento | amatore | 65,4 / 65,7 → 66,3 / 66,8 | 65,3 / 64,5 | +1 / +2,3 | 9,3 / 9,3 → 9,9 / 10,4 |
| Evento | umano | 66,9 / 67,1 → 68,7 / 69,2 | 70,4 / 69,2 | −1,7 / 0 | 7,5 / 7,8 → 9,7 / 9 |

- Prima il tagliato non serviva (giocando solo tagliati si vinceva da 0 a 8 punti in meno). Ora fa punto più spesso
  (+1–6 punti su 100 tagliati) e giocando solo tagliati si vince più o meno quanto con il colpo normale.
- **Non è dominante nella maggior parte delle caselle**, ma **in una casella su 18 supera il +3**: Pro/amatore serie 1
  (+4,9; la serie 2 dà +1,0). Casual/amatore serie 1 è al limite (+3,5).

### 6. Stesso schermo tra due persone (banchi B25)

`scripts/audit/b25/misure.mjs aiuto` (3 semi × 300 partite di 1 game in fiera, 900 partite per riga). «vince» = partite
vinte dal più giovane (media dei due lati). File: `results/b31/b25-aiuto-prima.txt`, `b25-aiuto-dopo.txt`.

| coppia | nessun aiuto, prima → dopo | aiuto G, prima → dopo |
|---|---|---|
| bambino contro medio | 11,3 → 10,1% | 39,6 → 35,9% |
| bambino contro amatore | 3,8 → 4,3% | 22,6 → 21,3% |
| ragazzo contro medio | 22,4 → 24,7% | 41,8 → 45,9% |
| ragazzo contro amatore | 10,2 → 11,4% | 26,3 → 24,1% |
| bambino contro ragazzo | 30,2 → 27,4% | 42 → 41% |

L'aiuto al più giovane (G) **funziona come prima**: dà da +17 a +26 punti di partite vinte (prima da +12 a +28). Tra
pari (`misure.mjs pari`, `results/b31/b25-pari-dopo.txt`) si vince 50% esatto e i due lati restano tra il 48 e il 52%.

### 7. Criteri dei livelli

- **`npm run audit:legend`: tutti i criteri rispettati**, nessuno cambiato (`results/b31/legend-prima.txt`,
  `legend-dopo.txt`). Game vinti dalla CPU Leggenda: medio 99,7 → 100%, amatore 99,4 → 98,9%, **tennista 88,8 → 88,9%
  (criterio ≥ 85%)**, **preciso 68,2 → 83,5% (criterio ≥ 60%)**, bambino 100 → 99,8%, impreciso 100 → 100%. Non
  regressione: Pro contro «medio» 72,6 → 77,9% dei game del giocatore (criterio 70–85%), Casual contro «medio» 99,8 →
  99,8%.
- **`npm run audit:evento`** (`results/b31/evento-prima.txt`, `evento-dopo.txt`; 1 game in fiera, serie A / B): punti
  vinti a Evento dall'adulto medio — amatore 61,8 / 61 → 63,4 / 65%, umano 66,9 / 71 → 69,7 / 70,6%, medio 68,9 / 69,2
  → 70,6 / 71,1% (obiettivo del rapporto 60–70%: «medio» ora appena sopra). A Bambini il bambino 77,2 / 78,4 → 79,2 /
  78,8%.

## Schermate

Prova nel browser `tools/e2e/natpf-rete.mjs` (gioco vero, scene messe in campo a mano), guardate una per una:

- Volée di chi gioca a rete: `docs/b31/img/rete-classici-01-volee.webp` e da vicino
  `docs/b31/img/rete-classici-02-volee-vicino.webp` (il personaggio a rete colpisce la palla al volo davanti a sé).
- Schiacciata della CPU a rete, da vicino: `docs/b31/img/rete-classici-04-schiacciata-cpu-vicino.webp` (racchetta
  sopra la testa, scia e scoppio dell'impatto in alto).
- La stessa con Lob & Drop (modelli 3D): `docs/b31/img/rete-lobdrop-09-schiacciata-cpu-vicino.webp` (Lob con la
  racchetta sopra la testa) e la volée di Drop `docs/b31/img/rete-lobdrop-07-volee-vicino.webp`.
- Tagliato di chi gioca dal fondo, con il rimbalzo basso nella metà della CPU:
  `docs/b31/img/rete-classici-05-tagliato.webp`.

## Verifiche

- `npm test` (natpf-tennis): **1386 superati, 0 falliti** (1 saltato, come prima). Prove nuove: `test/natpf-b31-rete.test.mjs` (12: approccio,
  recupero e passo a rete, volée, tagliato, CPU a rete, piano al volo della CPU, palla corta della CPU, schiacciata di chi
  gioca, interruttore, motore con il tetto, registro).
- **Impronte**: con le regole spente (`netPlayRules.off`) il banco `audit:rete` dà numeri **identici** alla base
  `1906562` (3 livelli × 2 profili × 2 tattiche, confronto con `diff`), e le partite dello stesso schermo sono identiche
  punto per punto a quelle di `f08243a` (prova B25, impronte `909a097fe488`, `f25564be9708`, `b557aa21ae9f`). Con le
  regole accese le impronte nuove sono `1eb7dff8db39` e `7ac4aa5b8ef1`. Le scelte nuove della CPU usano un generatore
  loro, così non spostano i sorteggi del resto della partita.
- `npm run build`: riuscito. `node --test tools/test/*.test.mjs`: **226 superati**.
- `npm run audit:legend`: tutti i criteri rispettati.
- Prove nel browser (Chromium): `natpf-rete.mjs` **9/9**, `natpf-rally.mjs` **9/9**, `natpf-gesti-speciali.mjs`
  **9/9**, `natpf-leggenda.mjs` **7/7**.
- Il programma Windows (`natpf-desktop`) non è toccato: le sue prove non sono state rifatte.

### Prove già esistenti cambiate (le regole sono cambiate apposta)

- `test/natpf-racchetta-motore.test.mjs`: «mai a rete dal fondo» → «a rete solo dopo un attacco, al massimo un colpo su
  quattro».
- `test/natpf-variety.test.mjs`: il tagliato forte rimbalza fino a 0,8 (prima minimo 0,88); il tagliato morbido e la
  palla corta come prima.
- `test/natpf-b18-stanchezza.test.mjs`: soglia del tempo su «Stanco!» da 15 a 22% per la partita del test (seme 7, 40
  punti: 18,6%). Su 6 semi × 100 punti «amatore» a Pro passa dallo 0,5 al **4,4%** del tempo: chi gioca corre di più
  (va a rete e torna indietro sui pallonetti). Il difetto di allora era 93–96%. Il conto «fuori dallo scambio» ora segue
  le fasi del motore.
- `test/natpf-b18-t2-servizio.test.mjs`: il controllo «con i valori di prima» dei pesi del servizio si fa con le regole
  di rete spente (è una prova dei pesi di allora con il gioco di allora).
- `test/natpf-b25-stesso-schermo.test.mjs`: impronte di `f08243a` con le regole di rete spente, più le impronte nuove.
- `tools/e2e/natpf-rally.mjs`: «dopo ogni colpo si torna in fondo» → «si torna in fondo o, dopo un attacco da dentro il
  campo o una volée, si sale a rete; mai dal fondo né a metà campo».

## Cosa non è riuscito, e perché

1. **La Leggenda è diventata più dura per il giocatore più bravo.** Contro «preciso» la CPU vince l'83,5% dei game invece
   del 68,2% (criterio ≥ 60% rispettato, ma il margine si è spostato molto). «preciso» prima giocava 4,5–5 volée per game
   e vinceva a rete come nel resto della partita; ora ne gioca meno di una e a rete vince il 30% dei punti. Ho provato a
   togliere una per volta le parti nuove (passo a rete, approccio, schiacciata, volée, tagliato, passanti della
   Leggenda): nessuna da sola spiega la differenza, e togliendo i passanti della Leggenda «tennista» scende sotto il suo
   criterio (84,3% invece di ≥ 85%). Ho lasciato così e lo segnalo: va guardato con persone vere.
2. **La CPU a rete vince poco** contro chi gioca bene (Pro/umano 20–25% dei punti in cui è salita, Pro/amatore 30–47%).
   Il movimento automatico di chi gioca arriva quasi su tutte le volée della CPU; le volée della CPU più veloci e corte
   finivano fuori (con la fisica del motore una volée corta da 5,6 m non può essere anche veloce). Per non regalare
   punti la CPU sale di rado (2–9% dei suoi colpi) e solo con un attacco che fa correre chi gioca. In fiera la CPU a rete
   si vedrà poco.
3. **Il tagliato in una casella supera il tetto di +3 punti** (Pro/amatore serie 1: +4,9; serie 2: +1,0). Ho abbassato
   l'errore della CPU sul tagliato tre volte (0,05 → 0,02 → 0,008 → 0,006 a Casual); più in basso il tagliato tornerebbe
   inutile.
4. **Schiacciata contro la Leggenda**: migliorata molto con «amatore» e «umano», poco con «tennista» (una su due o una
   su tre rimandata a seconda della serie). Una parte delle schiacciate rimandate la Leggenda le prende dopo il rimbalzo,
   da lontano.
5. **Palla corta della CPU**: rara e dichiarata come chiesto, ma nel banco non fa mai punto da sola. Le smorzate della
   **Leggenda** (2–8 per game contro «umano») non sono cambiate: sono il punto 8 del rapporto, tappa 3 punto 5.
6. **Il bambino vince qualche punto in più** a Casual, Pro e Bambini (+2–6): la volée con più margine aiuta chi comincia.
   È un aiuto di gioco, non di punteggio.
7. **«Medio» a Evento** è ora appena sopra il 70% dei punti (70,6–71,1%; prima 68,9–69,2%).
8. A Bambini un adulto bravo («tennista») va a rete nel 35% dei colpi della CPU (sopra il tetto del 10–15%).

## Cosa non è provato

- Niente con **persone vere**, **telefoni veri**, il **PC Windows dell'evento** o il **ledwall**: tutto è gioco simulato
  o il gioco vero nel browser con colpi simulati.
- Le scene della prova nel browser sono **messe in campo a mano** (posizioni e palla impostate), non partite intere
  giocate a rete.
- Il **Worker del registro su Cloudflare** con il campo nuovo `rete` non è stato caricato né provato su Cloudflare (solo
  il Worker in locale delle prove).
- La **sensazione** della volée e della schiacciata della CPU (tempi, se si capisce cosa succede) va vista con persone
  vere; anche la scritta «Palla corta della CPU» non è stata vista sul ledwall.
- Le misure di fotogrammi al secondo non sono state rifatte: il blocco aggiunge pochi calcoli per colpo (una traiettoria
  prevista in più quando chi gioca colpisce), non per fotogramma.
- `natpf-desktop`: non toccato e non riprovato.

## File toccati

- Nuovi: `natpf-tennis/src/natpf/natpf_net_play.js` (regole), `natpf-tennis/scripts/audit/rete.mjs` (banco,
  `npm run audit:rete`), `natpf-tennis/scripts/audit/rete-confronto.mjs`, `natpf-tennis/test/natpf-b31-rete.test.mjs`,
  `tools/e2e/natpf-rete.mjs`, `natpf-tennis/scripts/audit/results/b31/`, `docs/b31/`.
- Gioco: `natpf-tennis/src/game_engine.js` (approccio dopo il colpo, piano al volo e colpo a rete della CPU, palla corta
  della CPU con la scritta, portata della CPU a rete e contro la schiacciata, `contactY` del colpo),
  `natpf_impact.js` (recupero a rete, passo a rete), `natpf_stroke_outcome.js` (volée), `natpf_skill.js` (rimbalzo del
  tagliato, errore della CPU sul tagliato, reazione della Leggenda alla schiacciata), `natpf_legend.js` (passanti, stima
  di chi è a rete, tagliato, schiacciata, niente affondo sulla schiacciata), `natpf_i18n.js` (scritta «Palla corta della
  CPU»).
- Registro: `natpf-tennis/src/natpf/registro/registro_registratore.js`, `registro_formato.js`,
  `natpf-tennis/cloudflare/registro-worker.js`, `natpf-tennis/scripts/registro/riassunto.mjs`.
- `natpf-tennis/package.json` (comando `audit:rete`).
