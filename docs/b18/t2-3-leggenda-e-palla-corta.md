# B18.2 · tappa 2, passo 3 · Leggenda con la stessa regola e palla corta che può sbagliare

Difetti 2 e 8 del rapporto B16 (`docs/b16/rapporto-gameplay.md` §2, §4 «Piano in tre tappe», schede D2 e D8). Lavoro
fatto in una worktree, senza push e senza toccare `natpf-simulator` o `main`. I file di versione e i documenti di ripresa
non sono toccati.

**Base dei confronti.** Il lavoro è partito da `9b8f9cb`; prima di continuarlo è stato unito `natpf-simulator` fino alla
versione 2026-11-12.7 (commit unito `ae68759`, unione `ad28020`). Da lì in avanti **«prima» vuol dire `ae68759`** (il
codice del gioco è identico a `25e46ed` e `813f79d`, che cambiano solo `docs/TRACCIA_PASSI.md`). Le misure «prima»
sono fatte su una copia di quel commit con gli stessi banchi di prova.

Tutti i numeri vengono dal gioco simulato (il motore vero senza disegno, con giocatori simulati): **non sono misure di
persone vere.**

## Niente da accendere

Le regole nuove valgono sempre:
- la parte A solo a **Leggenda**;
- la parte B (palla corta) a **tutti i livelli** contro la CPU e **nello stesso schermo** tra due persone (e nella sfida
  tra due computer, che usa lo stesso esito del colpo).

Non c'è nessuna opzione nuova. Per le prove e i banchi, la regola di Leggenda di prima si può rimettere solo in memoria
(`level.assist`, vedi `natpf-tennis/test/leggenda-b16.mjs`).

## Cosa cambia per chi gioca

### A. Leggenda: la stessa regola degli altri livelli

1. **Niente più colpi «Perfetti» che vanno in rete senza motivo.** Prima, a Leggenda, dal 10° colpo dello scambio la
   qualità dei colpi di chi gioca calava a ogni colpo e sotto una soglia alta (0,63) il colpo falliva, anche con il voto
   «Perfetto». Contro il giocatore simulato «tennista» quasi un punto su due finiva così (43–44 su 100, con la scritta
   piccola «scambio lungo»). Ora vale la regola di Esperta: la soglia è quella di Esperta (0,3) e la stanchezza degli
   scambi lunghi parte dal 16° colpo come a tutti i livelli. Contro «tennista» i punti chiusi da un colpo fallito
   passano da 49 a 9 su 100, e quelli «scambio lungo» da 43–44 a 8–9 su 100 (obiettivo del rapporto: al massimo 10).
2. **A Leggenda il momento giusto è più stretto, e lo si vede.** La finestra del tempo è più stretta che a Esperta
   (0,115 s invece di 0,15): lo stesso anticipo che a Esperta è ancora «Perfetto» a Leggenda è «Anticipo» o «Ritardo» e
   sposta di più la palla verso l'incrociato o il lungolinea. Oltre la finestra la palla esce di lato prima (uscita 1,35
   invece di 1,1).
3. **Negli scambi lunghi il momento giusto si stringe ancora.** Dal 16° colpo, come la stanchezza di tutti, la finestra
   si stringe: al 30° colpo è circa la metà, dal 46° circa un sesto. Quando si sbaglia, il voto e la scritta lo dicono
   («Anticipo», «Fuori · in anticipo», «In rete · in ritardo»).
4. **Le schiacciate e i colpi sopra la testa non falliscono più per la posizione automatica.** Prima, a Leggenda, un
   colpo sopra la testa con il tempo buono falliva da 13 a 51 volte su 100 (in allungo, deciso dal movimento automatico);
   ora 0 su 100 nei banchi (obiettivo del rapporto: al massimo 15).
5. **La CPU Leggenda è più forte da sola.** Regge il ritmo più a lungo (la sua stanchezza parte dal 26° colpo invece che
   dal 20°), comincia a rischiare per chiudere il punto più tardi (dal 24° colpo invece che dal 20°) e sbaglia meno i
   suoi colpi forti. Resta il livello più difficile: tutti i criteri di `npm run audit:legend` sono rispettati senza
   cambiarne nessuno (tabella 1).
6. **Gli scambi a Leggenda durano un poco di più** (da 17 a 20–21 colpi per punto contro «tennista», tabella 5).

### B. La palla corta può sbagliare

1. **Fatta bene, nel momento giusto e da vicino, è la palla corta di sempre.** Da dentro il campo, con un gesto morbido
   e il tempo giusto cade a circa 2–2,5 m dalla rete.
2. **Può venire troppo lunga.** Se il gesto è troppo forte, il tempo non è giusto, si colpisce da lontano (dietro la riga
   di fondo) o in corsa, la palla corta cade più lontana e più alta: fino a 4 m più in là, una palla lenta a metà campo
   che l'avversario prende comodo. Sullo schermo: **«Troppo lunga»** in giallo, con il perché sotto («da troppo lontano»,
   «gesto troppo forte», «in corsa»…), o «Troppo lunga · in ritardo» se è il tempo.
3. **Può finire in rete.** Quando si colpisce molto in ritardo, molto lontano, o con una situazione difficile su una
   palla bassa (sotto il metro), la palla corta va in rete: **«In rete»** con il perché (stesso stile delle scritte del
   passo R3: il perché del tempo nella scritta grande, quello della situazione nella riga piccola).
4. **Il telefono dice la stessa cosa** del computer: «Troppo lunga» o «In rete», sotto il perché e «Palla corta»
   (anche il telefono del Player 2 nello stesso schermo).
5. **La CPU legge la palla corta prevedibile.** La prima palla corta vale intera. Se chi gioca ne fa spesso (nei suoi
   ultimi colpi), la CPU se l'aspetta: sbaglia meno su quella palla e dopo il suo colpo aspetta più avanti (fino a 3,2 m),
   quindi ci arriva prima, ma lascia spazio dietro (pallonetto e colpo profondo tornano utili). Una palla corta che cade
   a metà campo non mette la CPU in difficoltà.
6. **La qualità che manca non accorcia più la palla corta.** Prima una palla corta presa male cadeva più corta, cioè
   migliore: per questo giocare solo palle corte era la tattica che vinceva di più.

## Come funziona (per chi mette le mani nel codice)

**Parte A** (`natpf-tennis/src/natpf/natpf_stroke_outcome.js`, `ASSIST.leggenda`; `natpf_legend.js`, `LEGEND`):

| | prima | dopo |
|---|---|---|
| `failQ` (soglia del colpo fallito di chi gioca) | 0,63 | 0,3 (come Esperta) |
| `pressureFrom` (stanchezza degli scambi lunghi di chi gioca) | dal 10° colpo | tolto: dal 16° come tutti (`RALLY_PRESSURE`) |
| `span` (finestra della direzione e del voto) | 0,15 s (di Esperto) | 0,115 s |
| `spanPress` (la finestra × pressione^3 negli scambi lunghi) | — | 3 |
| `pushOut` (uscita di lato oltre la finestra) | 1,1 | 1,35 |
| `netHold` (bordo morbido laterale vicino alla rete, B17.4) | da `failQ` alta | mantenuto esplicito |
| CPU `pressureFrom` | 20 | 26 |
| CPU `closeFrom` / `closeHard` | 20 / 24 | 24 / 28 |
| CPU `powerErr` | 0,65 | 0,5 |

`span` passa da `directionSpan`, quindi vale anche per la finestra del colpo a vuoto e per il segnale del momento giusto
(`natpf_timing_cue.js`) a Leggenda. `spanPress` vale solo nell'esito del colpo (`strokeOutcome`).

Il colpo controllato a rete del B17.4 e la palla debole sulla palla corta raggiunta valgono solo con `failQ` sopra
`netQMin` (0,45): con la Leggenda di oggi nessun livello li accende più. Il codice resta; le prove di quei meccanismi
usano la regola di prima rimessa a mano (`test/leggenda-b16.mjs`), e una prova nuova controlla che con la Leggenda di oggi
la stessa situazione a rete dia colpi normali.

**Parte B** (`natpf_stroke_outcome.js`: `OUTCOME.drop`, `dropControl`, `dropCause`; `natpf_skill.js`: `DROP_READ`,
`dropThreat`, `dropForward`; `game_engine.js`):

- **Controllo del tocco** (`dropControl`, da 0 a 1, senza caso): situazione di chi colpisce senza la preparazione
  (corsa, allungo, palla veloce) × pressione degli scambi lunghi × tempo (dentro la finestra fino a −45% al bordo, al
  quadrato; oltre, come gli altri colpi) × distanza dalla rete (niente fino a 11,5 m, fino a −50% a 15 m) × forza (un
  gesto oltre 0,3 non è un tocco: fino a −35% a 0,55). Sopra 0,78 (Casual 0,62) è pulita; sotto viene via via più
  lunga (fino a +4 m) e più alta (+0,55 m); sotto 0,42 (Casual 0,3) è sbagliata: in rete se il motivo è il ritardo, la
  distanza o una palla bassa, altrimenti lunga al massimo. Il motivo è quello che pesa di più.
- **Motivo in parole** (`dropCause`): «in ritardo», «troppo tardi», «in anticipo», «troppo presto», «da troppo
  lontano», «gesto troppo forte», «scambio lungo», oppure il motivo della situazione già usato dal motore («in corsa»,
  «palla lontana», «in allungo», «palla veloce»).
- **Lettura della CPU** (`DROP_READ`): la CPU tiene il conto delle palle corte di chi gioca (ogni colpo il conto vale
  la metà, una palla corta aggiunge 1). L'errore in più della CPU sulla palla corta con lei in fondo (`cpuErr.drop`,
  Casual +0,32, Pro +0,22) ora vale quanto la palla è buona (intera entro 3,2 m dalla rete, niente da 5,2 m) e quanto è
  una sorpresa (fino a −85% con il conto a 2). Con il conto alto la CPU aspetta fino a 3,2 m più avanti (a Leggenda nel
  suo recupero). Con nessuna palla corta lo spostamento è 0 esatto.
- **Volo**: la palla corta sbagliata in rete parte più tesa (arriva davvero alla rete invece di cadere prima).
- **Scritte** (`natpf_shot_feedback.js`: `shotQuality` con `long` e `cause`, `dropOutcome`, `shotWhy`;
  `natpf_phone_racket.js`; `site/js/tennis/phone-screen.js`).

Il riconoscimento dei gesti non è toccato: cambia solo l'esito del colpo.

## File toccati

- `natpf-tennis/src/natpf/natpf_stroke_outcome.js`: `ASSIST.leggenda`, `spanPress`, `OUTCOME.drop`, `dropControl`,
  `dropCause`, `touch`, campi `dropQ`, `dropLack`, `dropWhy`, `dropLong` dell'esito; `level.assist` per le prove.
- `natpf-tennis/src/natpf/natpf_legend.js`: `LEGEND` (pressione, chiusura, `powerErr`), recupero più avanti con le palle
  corte prevedibili.
- `natpf-tennis/src/natpf/natpf_skill.js`: `DROP_READ`, `dropExpect`, `dropThreat`, `dropForward`, `dropHabit` in
  `registerPlayerShot`, parametro `drop` di `cpuErrorChance`.
- `natpf-tennis/src/game_engine.js`: `touch`, causa della palla corta, volo teso in rete, CPU che aspetta più avanti.
- `natpf-tennis/src/natpf/natpf_shot_feedback.js`, `natpf-tennis/src/natpf/natpf_phone_racket.js`,
  `site/js/tennis/phone-screen.js`: scritte.
- Banchi: `natpf-tennis/scripts/audit/palla-corta.mjs` (`npm run audit:drop`), `palla-corta-duo.mjs`,
  `palla-corta-impronte.mjs`; risultati in `natpf-tennis/scripts/audit/results/t2-3/`.
- Prove: `test/natpf-b18-t2-leggenda-palla-corta.test.mjs` (nuovo), `test/leggenda-b16.mjs` (nuovo),
  `test/natpf-campo-aperto.test.mjs`, `test/natpf-drop-recovery.test.mjs`, `test/natpf-legend-b16.test.mjs`,
  `test/natpf-rete-b17.test.mjs`.

## Misure prima e dopo

Due serie di semi per ogni banco. Nelle tabelle «a / b → c / d» vuol dire: serie 1 / serie 2 prima → serie 1 / serie 2
dopo. Comandi, da `natpf-tennis`:

    npm run audit:legend
    npm run audit:legend -- --profiles=tennista,preciso --seeds=24
    npm run audit:drop -- --obiettivi                 (serie 1: semi 2001, 2038, 2075; 300 punti per seme)
    npm run audit:drop -- --obiettivi --serie=2       (serie 2: semi 5003, 5044, 5085)
    npm run audit:drop -- --difficulty=casual,pro,bambini,evento,leggenda --profiles=medio,preciso --tattiche=normale [--serie=2]
    node --import ./test/register.mjs scripts/audit/palla-corta-duo.mjs [--semi=8101,8203,8317]
    node --import ./test/register.mjs scripts/audit/palla-corta-impronte.mjs [--senza-speciali]

### 1. `audit:legend` (8 semi × 300 punti): game vinti dalla CPU a Leggenda

| profilo | criterio | prima | dopo | punti di chi gioca prima → dopo | colpi per punto |
|---|---|---|---|---|---|
| medio | ≥ 90% | 97,7% | 99,7% | 20,1 → 13,9% | 13,2 → 12,4 |
| amatore | ≥ 90% | 99,5% | 99,4% | 13,8 → 14,5% | 11,2 → 13,3 |
| tennista | ≥ 85% | 94,1% | 88,8% | 28,5 → 33,1% | 17,3 → 20,4 |
| preciso | ≥ 60% | 72,0% | 68,2% | 41,5 → 42,7% | 20,3 → 22,7 |
| bambino | ≥ 98% | 100% | 100% | 7,6 → 6,9% | 5,9 → 6,7 |
| impreciso | ≥ 98% | 99,8% | 100% | 7,7 → 5,3% | 5,9 → 5,1 |

Tutti gli altri criteri (errori della CPU 2–6% per colpo, incrociati, lungolinea, schemi, entropia, ripetizioni ≤ 20%,
scambi a 60 colpi ≤ 1%, velocità, reazione) restano rispettati. Con 24 semi: CPU contro «tennista» 87,3% dei game,
contro «preciso» 66,0%. Non regressione: Esperta contro «medio» 83,0% → 72,6% dei game di chi gioca (criterio 70–85%;
la differenza viene tutta dalle palle corte che «medio» gioca a caso, vedi tabella 6), Casual contro «medio» 100% →
99,8%.

Nessun criterio è stato cambiato. I margini sono stretti: «tennista» 88,8% (criterio 85%) e «preciso» 66–68% (criterio
60%).

### 2. Palla corta «al momento giusto» (CPU in fondo, chi gioca fermo ed entro 12,5 m, una volta su tre)

| livello | profilo | riuscita | in rete | raggiunta dalla CPU | fa punto | cade a (m, mediana) |
|---|---|---|---|---|---|---|
| Casual | tennista | 99,7 / 100 → 99,3 / 99,7 | 0 / 0 → 0,3 / 0,3 | 87,3 / 88,6 → 89,2 / 92,6 | 49,8 / 49,1 → 43,3 / 42,5 | 1,99 → 2,33 |
| Casual | amatore | 97,8 / 97,2 → 97,0 / 97,0 | 0 / 0 → 2,1 / 2,2 | 79,1 / 81,0 → 89,4 / 90,6 | 53,6 / 53,3 → 38,7 / 37,4 | 1,99 → 2,33 |
| Casual | bambino | 92,7 / 96,0 → 90,1 / 87,2 | 0 / 0 → 7,5 / 9,5 | 73,6 / 71,1 → 87,9 / 87,0 | 52,6 / 60,2 → 42,5 / 37,5 | 1,96 → 2,41 |
| Pro | tennista | 99,0 / 99,4 → 97,1 / 97,3 | 0 / 0 → 2,9 / 2,7 | 94,0 / 91,1 → 97,7 / 97,4 | 29,2 / 34,6 → 17,5 / 20,1 | 1,98 → 2,96 |
| Pro | amatore | 95,5 / 95,2 → 90,2 / 88,5 | 0 / 0 → 8,2 / 10,3 | 89,6 / 90,5 → 98,4 / 99,1 | 34,0 / 33,3 → 19,6 / 18,5 | 1,95 → 2,82 |
| Pro | bambino | 93,6 / 91,9 → 77,4 / 79,0 | 0 / 0 → 21,2 / 18,8 | 82,7 / 88,1 → 96,9 / 98,4 | 40,4 / 30,3 → 17,1 / 14,4 | 1,94 → 3,84 |
| Leggenda | tennista | 98,3 / 98,5 → 87,1 / 90,9 | 0 / 0 → 12,0 / 7,6 | 100 / 100 → 99,8 / 99,9 | 2,3 / 2,5 → 1,9 / 1,6 | 1,80 → 3,65 |
| Leggenda | amatore | 95,2 / 93,6 → 87,2 / 84,1 | 0 / 0 → 9,7 / 12,9 | 99,9 / 100 → 100 / 99,8 | 2,7 / 2,8 → 1,2 / 2,9 | 1,84 → 3,51 |
| Leggenda | bambino | 91,4 / 91,1 → 78,0 / 83,1 | 0 / 0 → 14,6 / 11,0 | 100 / 100 → 100 / 100 | 4,5 / 1,4 → 1,4 / 2,4 | 1,86 → 4,47 |

«Riuscita»: passa la rete e cade in campo. «Fa punto»: il punto finisce per chi gioca prima che tocchi di nuovo la palla.
Prima la palla corta non andava mai in rete.

### 3. Punti vinti da chi gioca per tattica (stesso gesto, cambia solo il tipo di colpo)

| livello | profilo | normale | al momento giusto | solo palle corte |
|---|---|---|---|---|
| Casual | tennista | 99,7 / 99,6 → 99,7 / 99,6 | 99,8 / 99,6 → 99,2 / 99,7 | 98,6 / 98,0 → 56,7 / 63,7 |
| Casual | amatore | 86,9 / 88,4 → 86,9 / 88,4 | 89,4 / 89,9 → 85,6 / 86,3 | 93,4 / 91,9 → 48,9 / 51,2 |
| Casual | bambino | 45,0 / 48,2 → 45,0 / 48,2 | 53,3 / 57,8 → 49,4 / 52,9 | 71,8 / 73,1 → 29,4 / 30,3 |
| Pro | tennista | 95,6 / 97,9 → 95,6 / 97,9 | 97,2 / 97,7 → 95,1 / 96,4 | 82,1 / 80,9 → 10,6 / 11,5 |
| Pro | amatore | 55,5 / 54,8 → 55,5 / 54,8 | 70,0 / 67,5 → 56,4 / 59,1 | 74,8 / 71,9 → 8,0 / 10,0 |
| Pro | bambino | 14,6 / 14,0 → 14,6 / 14,0 | 26,6 / 22,1 → 17,6 / 16,9 | 43,8 / 43,9 → 5,2 / 3,8 |
| Leggenda | tennista | 32,8 / 30,4 → 29,6 / 33,3 | 31,8 / 32,7 → 25,2 / 28,6 | 56,1 / 77,7 → 13,6 / 13,2 |
| Leggenda | amatore | 13,4 / 15,0 → 13,6 / 15,9 | 16,5 / 15,7 → 15,3 / 14,7 | 29,2 / 27,7 → 8,8 / 11,1 |
| Leggenda | bambino | 7,9 / 7,6 → 6,9 / 7,0 | 10,7 / 7,4 → 7,4 / 6,3 | 12,6 / 13,9 → 5,7 / 7,8 |

Solo palle corte, quante riescono (prima 92–100%): Casual 85–96%, Pro 73–87%, Leggenda 80–88%; fanno punto (prima
2–35%) 1–7%. In rete prima mai, ora 4–24%.

### 4. Obiettivi del rapporto (§4, tappa 2) e criteri delle schede

| obiettivo | prima | dopo (serie 1 / serie 2) |
|---|---|---|
| solo palle corte al massimo +3 punti sul colpo normale (9 casi) | 3 casi su 9 rispettati (fino a +29,2 punti) | 9 su 9 / 9 su 9 (da −86 a +0,8 punti) |
| a Leggenda «scambio lungo» al massimo 1 punto su 10 | tennista 43,2 / 44,0, amatore 19,4 / 22,2 | tennista 8,5 / 9,2, amatore 2,1 / 3,3, bambino 0,7 / 0,6 |
| colpi sopra la testa con il tempo buono falliti al massimo 15 su 100 (Leggenda) | 0–51,5% | 0% |
| `audit:legend` dentro i criteri | sì | sì |
| palla corta singola: +2…+5 punti a Casual (scheda D8) | bambino +8,3 / +9,6, amatore +2,5 / +1,5 | bambino +4,4 / +4,7, amatore −1,3 / −2,1 (**non rispettato** per amatore) |

### 5. Colpi falliti e durata degli scambi (tattica normale)

| livello | profilo | colpi per punto | punti chiusi da un colpo fallito | di cui «scambio lungo» |
|---|---|---|---|---|
| Casual | tutti | uguali | uguali | uguali |
| Pro | tutti | uguali | uguali | uguali |
| Leggenda | tennista | 16,9 / 17,1 → 21,7 / 20,9 | 48,9 / 49,2 → 8,5 / 9,2 | 43,2 / 44,0 → 8,5 / 9,2 |
| Leggenda | amatore | 11,3 / 11,7 → 13,1 / 13,8 | 39,7 / 40,8 → 2,3 / 3,3 | 19,4 / 22,2 → 2,1 / 3,3 |
| Leggenda | bambino | 5,4 / 6,3 → 6,6 / 6,5 | 27,1 / 30,9 → 0,7 / 0,8 | 1,6 / 3,0 → 0,7 / 0,6 |

(Questi tre profili del banco non giocano palle corte nella tattica normale: per loro Casual e Pro sono identici.)

### 6. Livelli non toccati dalla parte A: impronte (`palla-corta-impronte.mjs`, 120 punti × semi 7 e 11)

- **Senza colpi speciali** (i profili non giocano pallonetti, palle corte o schiacciate cercate, quindi resta solo la
  parte A): Casual, Pro, Bambini ed Evento, 16 righe su 16, **impronte identiche** a `ae68759`; cambiano solo le 4 righe
  di Leggenda.
- **Con i profili come sono**: identiche le 12 righe su 16 in cui chi gioca non fa palle corte; cambiano solo le righe di
  «medio», che gioca palle corte a caso (33–90 per riga), e Leggenda.

Profili che giocano palle corte a caso, nel gioco normale (`audit:drop` con `--profiles=medio,preciso --tattiche=normale`):

| livello | profilo | game vinti da chi gioca | palle corte riuscite | fanno punto |
|---|---|---|---|---|
| Casual | medio | 99,5 / 100 → 99,5 / 100 | 99,4 / 98,7 → 92,8 / 93,8 | 54,1 / 60,6 → 47,3 / 46,9 |
| Pro | medio | 82,4 / 78,8 → 69,2 / 81,1 | 97,8 / 96,0 → 82,2 / 83,7 | 36,2 / 29,2 → 16,4 / 17,2 |
| Bambini | medio | 100 / 100 → 100 / 100 | 100 / 100 → 98,8 / 98,8 | 51,8 / 48,0 → 43,4 / 47,0 |
| Evento | medio | 95,5 / 90,4 → 89,4 / 90,3 | 96,5 / 98,0 → 84,9 / 86,8 | 37,4 / 37,1 → 26,4 / 19,4 |
| Leggenda | preciso | 37,0 / 35,2 → 40,0 / 38,5 | 99,1 / 99,3 → 88,8 / 89,6 | 3,1 / 2,0 → 2,2 / 2,0 |

### 7. Stesso schermo tra due persone (`palla-corta-duo.mjs`: banco dei due umani B19/B25, 1 game in fiera, 240 partite per riga, metà da ciascun lato)

| coppia | partite vinte dal primo | punti del primo | colpi per punto | palle corte del primo: in rete / troppo lunghe |
|---|---|---|---|---|
| medio contro medio | 50 / 50 → 50 / 50 | 50 / 50 → 50 / 50 | 11,1 / 12,0 → uguali | — |
| medio solo palle corte contro medio | 2,9 / 4,2 → 0 / 0 | 21,5 / 20,1 → 9,9 / 9,4 | 17,0 / 16,2 → 6,7 / 6,5 | 0 → 22 / 41% |
| amatore solo palle corte contro amatore | 5,8 / 7,1 → 0,4 / 0 | 25,2 / 26,3 → 5,3 / 6,3 | 25,3 / 24,6 → 7,6 / 8,2 | 0 → 20–22 / 38% |
| bambino solo palle corte contro bambino | 10,8 / 11,7 → 1,3 / 0,8 | 28,8 / 28,6 → 15,2 / 16,8 | 11,3 / 11,7 → 5,3 / 5,2 | 0 → 24 / 37–38% |
| bambino contro medio, nessun aiuto | 14,2 / 12,9 → uguali | 29,2 / 28,7 → uguali | 7,9 → uguali | — |
| bambino contro medio, **aiuto G** | 40,8 / 39,6 → **uguali** | 45,1 / 43,6 → **uguali** | 11,5 / 11,7 → uguali | — |
| bambino solo palle corte contro medio, aiuto G | 2,5 / 3,8 → 0,4 / 0 | 20,6 / 19,7 → 8,3 / 8,7 | | 0 → 13 / 31–32% |
| medio solo palle corte contro bambino, nessun aiuto | 57,1 / 54,2 → 5,0 / 1,7 | 52,9 / 51,7 → 22,3 / 18,5 | 17,2 / 17,9 → 6,9 / 7,1 | 0 → 19–20 / 39–41% |

L'aiuto al più giovane (`HELP.G`) non cambia nel gioco normale: le righe sono identiche prima e dopo. Nello stesso
schermo «solo palle corte» perdeva già prima; prima però un adulto che giocava solo palle corte batteva un bambino più
di metà delle volte (54–57%), ora 2–5 volte su 100. Questa tattica del banco gioca ogni colpo come palla corta, anche da
fondo campo e in corsa: per questo le palle troppo lunghe sono tante.

## Compromessi e limiti (i punti dove sono meno sicuro)

1. **Leggenda: margini stretti nei criteri.** Contro «tennista» la CPU vince 87–89% dei game (criterio 85%) e contro
   «preciso» 66–68% (criterio 60%). Una correzione futura a Leggenda va rimisurata con `audit:legend` e con
   `--seeds=24`.
2. **La finestra che si stringe negli scambi lunghi è una regola solo di Leggenda.** Non è nascosta (il voto e la
   scritta la dicono) e parte dal 16° colpo come la stanchezza di tutti, ma è un margine in più che gli altri livelli
   non hanno. Senza (solo finestra più stretta) servirebbe una finestra di 0,08 s per tutto lo scambio, che per una
   persona vera renderebbe difficile anche il primo colpo (prove della prima stesura: «tennista» 81,7%, sotto il
   criterio).
3. **Il segnale del momento giusto** (spento di base a Leggenda) mostra la finestra di Leggenda più stretta, ma non la
   stretta degli scambi lunghi.
4. **Palla corta al momento giusto a Casual per «amatore»: −1…−2 punti** invece di +2…+5 (criterio della scheda D8). Per
   «bambino» +4,4…+4,7 (dentro). Il motivo: la palla corta pulita non è più accorciata dalla qualità che manca (cade a
   2,3 m invece di 2,0), e con le palle corte frequenti (una su tre dei momenti buoni) la CPU se l'aspetta. Provato:
   senza lo spostamento in avanti della CPU o senza la riduzione dell'errore, a Casual la differenza resta tra −1 e 0
   (il rumore tra le serie è circa ±1,5 punti); non ho trovato una leva pulita. Resta aperto.
5. **Esperta contro «medio»** passa da 83,0 a 72,6% dei game nel banco di `audit:legend` (criterio 70–85%; in un'altra
   serie 78,8 → 81,1%). Viene solo dalle palle corte che quel profilo simulato gioca a caso, anche da fondo campo; la
   regola di Esperta non è cambiata (impronte identiche senza colpi speciali). Una persona vera fa la palla corta quando
   vuole, non a caso.
6. **Le soglie della palla corta** (distanza 11,5–15 m, forza da 0,3, tempo −45% al bordo) sono scelte sul gioco
   simulato. Il gesto della palla corta simulato (forza 0,2 ± 0,05) è un'ipotesi: va guardato con le diagnostiche delle
   persone vere (forza e tempo delle palle corte vere).
7. **Il colpo controllato a rete del B17.4** non è più acceso da nessun livello; il codice resta, provato con la regola
   di prima.

## Test

- `test/natpf-b18-t2-leggenda-palla-corta.test.mjs` (nuovo, 10 prove): Leggenda con la soglia di Esperta e la pressione
  di tutti, gli altri livelli identici; un colpo perfetto non fallisce più «scambio lungo» (prima sì); la finestra che si
  stringe a Leggenda e non agli altri livelli; i valori della CPU; il controllo del tocco (pulita, lunga, in rete, il
  motivo, continuo, senza caso); l'esito nel colpo (più lunga e più alta, in rete, Casual più largo); il motivo in
  parole; la lettura della CPU (valore, abitudine, solo per chi gioca contro la CPU, 0 esatto senza palle corte); le
  scritte su computer e telefono; il motore (palla corta da dietro la riga di fondo «Troppo lunga · da troppo lontano»).
- Aggiornate, con il perché nel commento: `natpf-campo-aperto` (direzione oltre la riga laterale a Leggenda; profondità
  della palla corta con il gesto forte; colpo controllato con la regola di prima), `natpf-drop-recovery` e
  `natpf-rete-b17` (meccanismi provati con la regola di prima, più la Leggenda di oggi), `natpf-legend-b16` (pressione
  della CPU dal 26° colpo).
- `npm test`: 1360 prove, 1359 superate, 0 fallite (1 saltata, come prima). `node --test tools/test/*.test.mjs`: 226
  su 226.

## Cosa non è verificato

- **Nessuna persona vera**: niente telefono vero, niente partita vera a Leggenda o con le palle corte. Da guardare con
  le persone: se «Troppo lunga» e il perché si capiscono, se la finestra più stretta di Leggenda è giusta per chi gioca
  bene, quanto spesso le persone fanno palle corte da lontano o con il gesto forte.
- Il PC Windows dell'evento e il ledwall non sono provati.
- Le prove nel browser sono quelle già esistenti (sezione «Prove nel browser» qui sotto): non c'è una prova nuova nel
  browser per la scritta «Troppo lunga»; è provata nelle prove di unità e nel motore senza disegno.

## Prove nel browser e verifiche finali

Gioco vero nel browser (Chromium senza schermo, telefono simulato), `CHROMIUM_PATH=/opt/pw-browsers/chromium node
tools/e2e/<nome>.mjs`:

- `natpf-leggenda.mjs`: 7 verifiche su 7 (partita contro la Leggenda, 73 colpi della CPU con 8 schemi, portata e
  corsa, allunghi; punti 1–5 per la CPU, nessun errore JavaScript);
- `natpf-gesti-speciali.mjs`: 9 su 9 (pallonetto e palla corta riconosciuti negli esercizi e in partita, palla corta
  dentro il campo a 1,96 m dalla rete, nessun gesto scartato);
- `natpf-rally.mjs`: 9 su 9.

Altre verifiche: `npm test` 1359 superate, 0 fallite, 1 saltata; `node --test tools/test/*.test.mjs` 226 su 226;
`npm run build` riuscita; `npm run audit:legend` tutti i criteri rispettati; `npm run audit:drop -- --obiettivi`
tutti gli obiettivi rispettati nelle due serie.
