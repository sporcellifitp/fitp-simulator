# B18.2 · tappa 2, passo 2 · La CPU sbaglia per la pressione e non a caso; a Pro il campo aperto fa punto

Difetti 1 e 9 del rapporto B16 (`docs/b16/rapporto-gameplay.md` §2, appendice D1 e D9). Base: il passo 1 finito e
rivisto (`1f170bb`, `docs/b18/t2-1-servizio.md`). Lavoro fatto in una worktree, senza push e senza toccare
`natpf-simulator` o `main`. I file di versione e i documenti di ripresa non sono toccati.

Tutti i numeri di questo documento vengono dal gioco simulato (il motore vero senza disegno, con giocatori simulati):
non sono misure di persone vere. «Prima» è sempre il commit `1f170bb`.

## Niente da accendere

Vale sempre, in ogni partita contro la CPU a Casual e a Pro. Non c'è nessuna opzione nuova.

Non cambia niente:
- a **Leggenda** (gli stessi numeri di prima, uguali fino al decimale: tabella 6);
- nello **stesso schermo** e nella **sfida tra due computer**, dove dall'altra parte c'è una persona;
- nel **servizio** del passo 1 (tabella 9).

## Cosa cambia per chi gioca

1. **La CPU non regala più il punto sulla palla comoda.** Prima, a Casual e a Pro, più di metà dei punti finiva con un
   errore della CPU tirato a sorte: sbagliava anche le palle facili (da 4 a 14 volte su 100) e un punto su tre lo mandava in
   rete. Adesso sulla palla comoda sbaglia circa 2 volte su 100 a Casual e meno di 1 su 100 a Pro.
2. **Sbaglia quando è messa in difficoltà.** Conta com'è messa nell'istante in cui colpisce:
   - **in allungo**: la palla è lontana dal suo corpo (è la cosa che pesa di più);
   - **in corsa**: sta ancora correndo quando colpisce;
   - a Casual anche la **palla veloce**, e l'angolo e la serie di colpi buoni di chi gioca rendono più grave un colpo
     già difficile. Da soli, su una palla che la CPU colpisce comoda, non bastano.
3. **Lo scambio lungo, da solo, non la fa più sbagliare.** Prima ogni colpo in più dopo il quarto aumentava la
   probabilità d'errore, qualunque palla arrivasse: bastava rimandare la palla e aspettare. Adesso bisogna farla
   correre o allungare.
4. **Quando sbaglia, la palla va quasi sempre fuori, non in rete.** In allungo o in corsa esce di lato, dalla parte
   dove la CPU ha colpito; la palla veloce o profonda scappa lunga; in rete finiscono soprattutto i colpi tagliati e
   le palle corte. Prima 42 errori su 100 finivano in rete, sempre. (Prima, inoltre, metà degli errori «di lato»
   cadeva dentro il campo e il punto continuava: adesso l'errore deciso esce davvero.)
5. **Più vincenti veri.** A Casual i punti chiusi da un vincente di chi gioca passano da 22–32 a 43–49 su 100; a Pro
   da 7–11 a 40–45 su 100.
6. **A Casual la CPU corre più piano** (4,4 metri al secondo invece di 4,7, e parte un poco più lenta): la difficoltà
   del livello sta nella corsa, non in un dado. Casual resta il livello facile: un adulto vince più di 99 game su
   100, come prima.
7. **A Pro il campo aperto fa punto.** Quando la palla va lontano dalla CPU (più di 2,5 metri di lato), la CPU la
   legge in ritardo: resta ferma fino a 2 decimi di secondo in più prima di partire. Una palla messa a 4–6 metri da
   lei adesso è un vincente circa 1 volta su 5 (prima 1 su 50).
8. **A Pro la CPU si stanca se la si fa correre.** Contano le corse lunghe: ogni palla che deve andare a prendere a
   più di un metro e mezzo. Dopo due o tre palle negli angoli comincia a stancarsi, dopo cinque è stanca del tutto:
   corre fino al 15% più piano e in allungo sbaglia di più. Sulla palla comoda non sbaglia nemmeno da stanca. A ogni
   punto riparte fresca. Sullo schermo non c'è nessuna scritta: si vede solo che arriva più tardi.
9. **Pro è più difficile per chi si limita a rimandare la palla.** Chi angola e tira forte vince come prima (83–84
   game su 100). Chi gioca più piano e meno preciso ne vince 64–65 su 100 invece di 75. È la conseguenza voluta del
   punto 1, ed è il compromesso più importante di questo passo: vedi «Compromessi e limiti».
10. **A Pro gli scambi sono un poco più lunghi**, e contro chi non sbaglia mai qualche scambio diventa molto lungo
    (tabella 8).

## Come funziona (per chi mette le mani nel codice)

Tutto in `natpf-tennis/src/natpf/natpf_skill.js`, più una riga in `game_engine.js`.

**Quanto è difficile la palla** (`cpuStrain`, soglie in `CPU_STRAIN`). Quattro numeri da 0 a 1, letti quando la CPU
colpisce:
- `reach` (allungo): distanza della palla dalla CPU divisa per la sua portata; niente sotto il 40% della portata, poi
  sale al quadrato fino alla portata piena;
- `run` (corsa): velocità della CPU divisa per la sua massima; niente sotto il 30%;
- `pace` (palla veloce): niente sotto 18 m/s, piena a 28 m/s;
- `angle`: quanto la palla è angolata.

**Probabilità d'errore** (`cpuErrorChance`):

    base + q × (stretch × reach + run × run + speed × pace) × (1 + angle × angolo) × (1 + pressure × pressione) × (1 + tired × stanchezza)

`q` è la qualità del colpo di chi gioca (una palla lenta, corta e fuori tempo mette meno in difficoltà; mai sotto `soft`).
Restano come prima le aggiunte per la palla corta con la CPU in fondo, il pallonetto con la CPU avanti, la schiacciata
e il colpo super potente. Il numero dei colpi dello scambio non c'è più (`rally` è stato tolto dai livelli).

| | Casual prima | Casual dopo | Pro prima | Pro dopo |
|---|---|---|---|---|
| velocità massima / accelerazione | 4,7 m/s · 10 m/s² | **4,4 m/s · 9 m/s²** | 5,3 · 11 | 5,3 · 11 |
| portata / reazione | 1,4 m · 0,24 s | uguale | 1,5 m · 0,20 s | uguale |
| ritardo sulla palla lontana (`cpuWide`) | – | fino a 0,06 s, da 2 a 4,5 m | – | **fino a 0,19 s, da 2,5 a 4,5 m** |
| stanchezza (`cpuFatigue`) | – | – | – | oltre 1,5 m a corsa; niente fino a 6 m, piena a 14 m; fino a −15% di velocità |
| errore sulla palla comoda (`base`) | 3% + 1,4% a colpo dopo il quarto | **1,7%** | 0,4% + 0,9% a colpo dopo il quarto | **0,5%** |
| in pieno allungo (`stretch`) | +25% | +24% | +18% | +4,5% |
| in piena corsa (`run`) | – | +10% | – | +2,2% |
| palla veloce (`speed`) | +12% | +10% | +4% | 0 |
| angolo, pressione | si sommavano (+20%, +6% a gradino) | moltiplicano la palla difficile (angolo fino a × 1,5; pressione × 1,4 a gradino, fino a × 2,2) | si sommavano (+8%, +3,5% a gradino) | 0 |
| da stanca (`tired`) | – | – | – | la parte «difficile» × 3,5 |

Esempi a Pro: palla comoda 0,5%; in pieno allungo 5%; in allungo e in corsa 7,2%; lo stesso da stanca 24%.
A Casual: palla comoda 1,7%; in pieno allungo 25,7%; in allungo, in corsa, angolata e dopo due colpi buoni si arriva al
tetto del 70%.

**Che errore fa** (`cpuErrorKind`): tre pesi. In rete 0,2 (0,5 su tagliato e palla corta); di lato 0,3 più l'allungo e
la corsa; lunga 0,3 più la velocità e la profondità della palla. Nel motore (`game_engine._executeOpponentReturn`)
l'errore «di lato» esce dalla parte da cui la CPU colpisce, 0,6–1,3 m oltre la riga. Prima il lato era a caso:
attraversando il campo l'aria frenava la palla e 44–55 errori «di lato» su 100 cadevano dentro (misurato: con il
motore di prima perde il punto il 45% a Casual e il 56% a Pro, adesso il 98%).

**Palla lontana a Pro** (`planCpuRun`, `cpuWide`): quando chi gioca colpisce, se il punto dove la CPU deve andare è
lontano di lato più di `from` metri, la lettura parte più tardi; il ritardo è pieno da `to` metri.

**Stanchezza a Pro** (`cpuFatigue`, `cpuTired`, `cpuStep`): a ogni colpo di chi gioca si aggiungono a `cpuRun` i metri
che la CPU deve correre oltre `near` (1,5 m). Niente fino a `free` (6 m), poi sale fino a 1 in `span` (8 m). Stanca
corre più piano (`slow`) e la parte «difficile» dell'errore cresce (`cpuErr.tired`). `resetRally` la azzera a ogni
punto. Casual e Leggenda non hanno `cpuFatigue`.

**Servizio (passo 1).** Le sue costanti (`SERVE_WEIGHT`) sono state moltiplicate per 0,84 e non dipendono più da
quelle degli scambi (`stretch` è un numero suo). Serve a lasciare il servizio com'era: prima una parte degli errori
decisi non diventava un errore (quelli «di lato» che cadevano dentro), adesso sì. A Casual il ritardo di lettura del
servizio forte scende da 0,075 a 0,037 s, perché la CPU ora corre più piano e con il ritardo di prima gli ace sul
servizio perfetto salivano oltre l'obiettivo del passo 1. La tabella 9 mostra che i punti diretti sono rimasti quelli.

**Solo per le misure.** `cpuTuning` (vuoto nel gioco) permette al banco di provare valori diversi senza toccare il
codice: `npm run audit:cpu -- --prova=pro.cpuWide.react=.2,pro.cpuErr.stretch=.04`.

## File toccati

| file | cosa |
|---|---|
| `natpf-tennis/src/natpf/natpf_skill.js` | valori di Casual e Pro, `CPU_STRAIN`, `cpuStrain`, `cpuErrorChance`, `cpuErrorKind`, `cpuWide` in `planCpuRun`, `cpuFatigue` / `cpuTired` / `cpuStep`, `cpuReturnPlan`, `SERVE_WEIGHT` × 0,84, `cpuTuning` |
| `natpf-tennis/src/game_engine.js` | una riga: l'errore «di lato» esce dalla parte della palla |
| `natpf-tennis/scripts/audit/cpu-pressione.mjs` | **nuovo**: banco degli errori della CPU (`npm run audit:cpu`) |
| `natpf-tennis/package.json` | il comando `audit:cpu` |
| `natpf-tennis/test/natpf-b18-t2-cpu-pressione.test.mjs` | **nuovo**: 14 test |
| `natpf-tennis/test/natpf-grip-skill.test.mjs`, `natpf-swing.test.mjs` | due test che fissavano la regola vecchia, riscritti (vedi «Test») |
| `natpf-tennis/test/natpf-b18-stanchezza.test.mjs`, `natpf-b18-t2-servizio.test.mjs` | una soglia e un controllo aggiornati (vedi «Test») |
| `docs/b18/t2-2-cpu-pressione.md` | questo documento |

## Misure prima e dopo

    cd natpf-tennis
    npm run audit:cpu -- --nsemi=16 --obiettivi      # tabelle 1–4 e 6b: come finiscono i punti, errori, campo aperto, game
    npm run audit:legend                             # criteri della Leggenda e dei livelli (69)
    npm run audit:legend -- --table                  # tabella 6
    npm run audit:serve -- --nsemi=8                 # tabella 9

Il banco nuovo gioca partite intere (300 punti per seme) con i profili simulati: «umano» e «amatore» (telefono, gioco
medio; «umano» fa il gesto dopo il rimbalzo come le persone riprese il 23/10), «medio» (tira più forte e angolato),
«tennista» (preciso e forte), «bambino» (piano e a caso). Le tabelle 1–4 sono su 16 semi × 300 punti per casella
(4800 punti). Errore di misura: circa ±0,5 punti sui punti vinti, **±2 sui game vinti**. I game si contano sulla
sequenza dei punti (primo a 4 con 2 di scarto).

«Palla facile» ha una definizione fisica, che non usa la regola dell'errore: colpo normale dello scambio (non la
risposta al servizio, non palla corta, pallonetto, schiacciata o super), caduto a meno di 2 m di lato dalla CPU e non
profondo, che la CPU colpisce con la palla entro metà della sua portata e quasi ferma. «Palla dura»: in allungo oltre
l'80% della portata, o in corsa oltre il 60% della velocità, o caduta a 4 m o più dalla CPU.

### 1. Come finiscono i punti (su 100 punti)

| livello · profilo | | CPU in rete | CPU fuori | vincente di chi gioca | errore di chi gioca | palla non presa da chi gioca |
|---|---|---|---|---|---|---|
| Casual · umano | prima | 37,1 | 30 | 22,1 | 9,8 | 1,1 |
|  | dopo | 7,3 | 33,6 | 47,2 | 10,1 | 1,6 |
| Casual · medio | prima | 33,3 | 28,4 | 31,7 | 1,1 | 5,5 |
|  | dopo | 8 | 36,1 | 49,4 | 0,9 | 5,7 |
| Casual · amatore | prima | 35,2 | 29,5 | 21,8 | 9,5 | 4 |
|  | dopo | 7,1 | 36,6 | 42,6 | 9 | 4,5 |
| Casual · tennista | prima | 20,6 | 17,4 | 61,2 | 0,8 | 0 |
|  | dopo | 4,8 | 31,6 | 63,2 | 0,5 | 0 |
| Casual · bambino | prima | 21,2 | 18 | 6,5 | 18,1 | 36,3 |
|  | dopo | 5,5 | 30 | 12,9 | 17,2 | 34,4 |
| Pro · umano | prima | 34,1 | 32,4 | 6,9 | 18,5 | 8,2 |
|  | dopo | 5,2 | 19,1 | 42,3 | 21,6 | 10,2 |
| Pro · medio | prima | 30,5 | 24,8 | 10,6 | 11,9 | 22,2 |
|  | dopo | 4,6 | 15,8 | 44,9 | 13,1 | 21,5 |
| Pro · amatore | prima | 27,2 | 26,4 | 7,2 | 22,6 | 16,8 |
|  | dopo | 2,6 | 13,5 | 39,7 | 24,9 | 18,7 |
| Pro · tennista | prima | 25 | 20,5 | 51,5 | 2,8 | 0,3 |
|  | dopo | 1,7 | 9,4 | 85,2 | 3,2 | 0,3 |
| Pro · bambino | prima | 8,2 | 7,9 | 0,9 | 22,5 | 60,5 |
|  | dopo | 1,3 | 7,1 | 7 | 22,1 | 62,6 |

| livello · profilo | punti chiusi da un errore della CPU prima → dopo | vincenti sui punti vinti da chi gioca prima → dopo |
|---|---|---|
| Casual · umano | 67,1 → 41 | 24,8 → 53,5 |
| Casual · medio | 61,7 → 44,1 | 33,9 → 52,9 |
| Casual · amatore | 64,7 → 43,7 | 25,2 → 49,4 |
| Casual · tennista | 38 → 36,4 | 61,7 → 63,5 |
| Casual · bambino | 39,2 → 35,6 | 14,2 → 26,6 |
| Pro · umano | 66,5 → 24,3 | 9,4 → 63,5 |
| Pro · medio | 55,3 → 20,4 | 16,1 → 68,7 |
| Pro · amatore | 53,5 → 16,2 | 11,8 → 71,1 |
| Pro · tennista | 45,5 → 11,2 | 53,1 → 88,4 |
| Pro · bambino | 16,1 → 8,3 | 5,2 → 45,6 |

### 2. Errori della CPU su 100 colpi

| livello · profilo | | tutti i colpi | palle facili | palle medie | palle dure | per numero del colpo: 1–6 / 7–16 / dal 17° | solo palle facili: 1–6 / 7–16 / dal 17° |
|---|---|---|---|---|---|---|---|
| Casual · umano | prima | 16,5 | 11,8 (su 6011) | 15,3 | 23,3 | 12,5 / 19,6 / 30,3 | 7,1 / 14,4 / 23,8 |
|  | dopo | 10 | 1,5 (su 6239) | 3,6 | 22,2 | 10,3 / 9,1 / 8,6 | 1,7 / 1,6 / 1,1 |
| Casual · medio | prima | 18,1 | 12,5 (su 3141) | 14,7 | 24,6 | 15,6 / 21,2 / 32,2 | 8 / 15,1 / 27,9 |
|  | dopo | 14,2 | 2,1 (su 2848) | 3,6 | 26,4 | 14,7 / 13,7 / 14 | 1,7 / 2,4 / 2,1 |
| Casual · amatore | prima | 15,6 | 11,4 (su 5649) | 14,1 | 21,1 | 12 / 16,9 / 28,3 | 7,2 / 12,5 / 24,6 |
|  | dopo | 10,4 | 1,6 (su 5593) | 3,3 | 21,2 | 10,1 / 9,9 / 9,3 | 1,8 / 1,6 / 1,5 |
| Casual · tennista | prima | 20,4 | 13,6 (su 330) | 16,6 | 30,8 | 22,5 / 25,6 / 41,2 | 13,1 / 13,8 / 28,6 |
|  | dopo | 20,5 | 2,5 (su 317) | 12,6 | 34,5 | 24,3 / 20,3 / 13,7 | 2,5 / 2,7 / 0 |
| Casual · bambino | prima | 11,6 | 9,3 (su 4352) | 10 | 12,7 | 7,1 / 14 / 24,7 | 5,2 / 11,8 / 24,2 |
|  | dopo | 11 | 1,6 (su 3481) | 2,6 | 18 | 11,1 / 9,9 / 10 | 2 / 1,5 / 0,5 |
| Pro · umano | prima | 10,1 | 7,4 (su 7914) | 9,8 | 14,7 | 6,2 / 10,1 / 17,6 | 3,8 / 6,9 / 14 |
|  | dopo | 3,1 | 0,4 (su 8617) | 0,8 | 8,7 | 2,1 / 3,1 / 4 | 0,5 / 0,4 / 0,4 |
| Pro · medio | prima | 10,8 | 6,8 (su 4782) | 9,1 | 16,7 | 7,6 / 12,2 / 20,1 | 3,5 / 7,3 / 14,7 |
|  | dopo | 4 | 0,3 (su 4747) | 0,7 | 10 | 3,2 / 4,1 / 5,6 | 0,3 / 0,3 / 0,4 |
| Pro · amatore | prima | 8,7 | 7,4 (su 7404) | 8,4 | 12,4 | 4,9 / 9,1 / 17,3 | 2,5 / 7,5 / 15,9 |
|  | dopo | 2,4 | 0,4 (su 7874) | 0,6 | 6,3 | 1,5 / 2 / 3,2 | 0,4 / 0,5 / 0,4 |
| Pro · tennista | prima | 11,3 | 9 (su 1504) | 9 | 18,2 | 9,5 / 13,9 / 20,7 | 4,6 / 10 / 20,7 |
|  | dopo | 2,7 | 0,4 (su 1899) | 1,6 | 4,5 | 2,5 / 2 / 2,5 | 0,3 / 0,4 / 0,7 |
| Pro · bambino | prima | 5 | 4,2 (su 4347) | 5,2 | 5,8 | 2,6 / 7,2 / 14 | 1,8 / 5,6 / 13,7 |
|  | dopo | 2,5 | 0,4 (su 4747) | 0,6 | 5,3 | 1,5 / 2,6 / 3,6 | 0,4 / 0,4 / 0,6 |

Le ultime due colonne sono la prova che lo scambio lungo da solo non conta più: sulle palle facili l'errore resta
uguale dal primo colpo al trentesimo. Su tutte le palle, a Casual è piatto; a Pro sale ancora un poco (per esempio
«umano» 2,1 → 3,1 → 4,0%) perché negli scambi lunghi la CPU è stanca (tabella 7): prima saliva di 11–13 punti,
adesso di 0–2,5.

### 3. Campo aperto: cosa succede alla palla secondo la distanza dalla CPU

Per ogni colpo di chi gioca, la distanza di lato tra dove cade la palla e dov'era la CPU. In ogni casella:
**vincenti** / errori della CPU / palle riprese, su 100 colpi.

| livello · profilo | | palla a meno di 2 m | a 2–4 m | a 4–6 m |
|---|---|---|---|---|
| Casual · umano | prima | **0,6** / 12,6 / 86,8 (su 8674) | **5,1** / 18,9 / 76 (su 6690) | **21,3** / 24,5 / 54,2 (su 1395) |
|  | dopo | **0,6** / 3,6 / 95,9 (su 9236) | **9,3** / 14,3 / 76,4 (su 6622) | **62,7** / 15 / 22,2 (su 1310) |
| Casual · medio | prima | **1,1** / 14,1 / 84,9 (su 6517) | **11,6** / 19,6 / 68,8 (su 7242) | **32,8** / 17,5 / 49,6 (su 1632) |
|  | dopo | **1,3** / 6,3 / 92,3 (su 6362) | **17,9** / 16,9 / 65,1 (su 6960) | **62,9** / 13,6 / 23,5 (su 1514) |
| Casual · amatore | prima | **0,4** / 12,1 / 87,5 (su 7881) | **5,6** / 16,9 / 77,6 (su 7253) | **15,6** / 19,9 / 64,5 (su 1687) |
|  | dopo | **0,3** / 2,8 / 96,9 (su 8108) | **9,4** / 13,2 / 77,4 (su 7520) | **39,3** / 20,2 / 40,5 (su 1590) |
| Casual · tennista | prima | **4,1** / 18 / 77,9 (su 4383) | **45** / 17,2 / 37,8 (su 3974) | **87** / 4,7 / 8,4 (su 1053) |
|  | dopo | **4,2** / 16,3 / 79,5 (su 4248) | **50,8** / 17,7 / 31,5 (su 4018) | **95,3** / 1,5 / 3,2 (su 801) |
| Casual · bambino | prima | **0,2** / 9,1 / 90,7 (su 5903) | **2,1** / 11,5 / 86,4 (su 6061) | **2** / 13,3 / 84,7 (su 1473) |
|  | dopo | **0,1** / 3,2 / 96,7 (su 5905) | **3,1** / 12,8 / 84,1 (su 5702) | **7,1** / 27 / 65,8 (su 1306) |
| Pro · umano | prima | **0,1** / 8,3 / 91,6 (su 9382) | **1** / 10,9 / 88,1 (su 8173) | **2** / 16,2 / 81,8 (su 2558) |
|  | dopo | **0,1** / 1,4 / 98,6 (su 9989) | **2** / 3 / 95 (su 8449) | **18,2** / 9,1 / 72,7 (su 2489) |
| Pro · medio | prima | **0,1** / 8,5 / 91,5 (su 7709) | **2,1** / 12,1 / 85,8 (su 8121) | **4,5** / 16,2 / 79,3 (su 3033) |
|  | dopo | **0,1** / 2 / 97,9 (su 7766) | **4,8** / 4 / 91,2 (su 8427) | **33,8** / 7,6 / 58,6 (su 2978) |
| Pro · amatore | prima | **0** / 7,5 / 92,5 (su 8521) | **0,8** / 9,3 / 89,9 (su 8267) | **1,4** / 13,6 / 85 (su 2501) |
|  | dopo | **0** / 0,5 / 99,4 (su 8883) | **1,4** / 2,1 / 96,5 (su 8675) | **19,9** / 6,7 / 73,4 (su 2322) |
| Pro · tennista | prima | **0,8** / 9,2 / 90 (su 9165) | **13,5** / 12,7 / 73,8 (su 7121) | **47,6** / 10,9 / 41,4 (su 2599) |
|  | dopo | **0,7** / 2 / 97,2 (su 10300) | **18,5** / 2,1 / 79,4 (su 7776) | **81,5** / 1 / 17,5 (su 2551) |
| Pro · bambino | prima | **0,1** / 4,3 / 95,6 (su 4957) | **0,1** / 4,9 / 95,1 (su 5340) | **0,2** / 6,5 / 93,2 (su 1635) |
|  | dopo | **0,1** / 0,5 / 99,4 (su 5393) | **0,3** / 1,5 / 98,1 (su 5682) | **1,3** / 7 / 91,6 (su 1580) |

### 4. Punti e game vinti da chi gioca

| livello · profilo | punti vinti prima | punti vinti dopo | game vinti prima | game vinti dopo | colpi per punto prima (9 punti su 10 entro) | colpi per punto dopo |
|---|---|---|---|---|---|---|
| Casual · umano | 89,1 ± 0,46 | 88,1 ± 0,48 | 99,6 | 99,8 | 8,93 (18) | 9,24 (20) |
| Casual · medio | 93,4 ± 0,32 | 93,5 ± 0,34 | 100 | 99,9 | 7,65 (16) | 7,23 (15) |
| Casual · amatore | 86,5 ± 0,43 | 86,3 ± 0,5 | 99,3 | 99,9 | 9,1 (19) | 9,43 (21) |
| Casual · tennista | 99,2 ± 0,13 | 99,5 ± 0,12 | 100 | 100 | 4,85 (9) | 4,68 (9) |
| Casual · bambino | 45,7 ± 0,61 | 48,4 ± 0,98 | 39,3 | 46,5 | 7,51 (16) | 7,23 (16) |
| Pro · umano | 73,3 ± 0,71 | 66,6 ± 0,69 | 93 | 83,3 | 13,95 (28) | 16,53 (36) |
| Pro · medio | 65,9 ± 0,61 | 65,3 ± 0,7 | 83,7 | 83,3 | 10,92 (22) | 11,15 (24) |
| Pro · amatore | 60,7 ± 0,75 | 55,8 ± 0,89 | 75,7 | 65,2 | 13,01 (25) | 14,49 (31) |
| Pro · tennista | 97 ± 0,2 | 96,4 ± 0,29 | 100 | 100 | 9,05 (18) | 9,77 (20) |
| Pro · bambino | 17 ± 0,49 | 15,3 ± 0,43 | 1,4 | 0,5 | 7,16 (15) | 7,37 (16) |

### 5. Pro su più semi

La casella «Pro contro medio» decide un obiettivo e sta vicino al bordo della fascia: l'ho misurata su 56 semi (i 40
di `audit:legend` più i 16 del banco, 16 800 punti), «umano» e «amatore» su 32 (16 + 16).

| Pro · profilo | punti vinti prima | punti vinti dopo | game vinti prima | game vinti dopo (semi di `audit:legend` / semi del banco) | vincenti con la palla a 4–6 m prima → dopo |
|---|---|---|---|---|---|
| medio (56 semi) | 65,9 ± 0,37 | 64,9 ± 0,35 | 83,9 | **83,6** (83,7 / 83,3) | 4,6 → 33,6 |
| umano (32 semi) | 73,2 ± 0,53 | 66,3 ± 0,55 | 93,5 | 84,6 (86,0 / 83,3) | 2,2 → **19,5** |
| amatore (32 semi) | 60,5 ± 0,52 | 55,6 ± 0,59 | 74,9 | 64,2 (63,2 / 65,2) | 1,4 → 19,1 |

### 6. Tutti i livelli con i semi di `audit:legend` (`--table`, 8 semi × 300 punti)

| livello · profilo | punti vinti prima → dopo | game vinti prima → dopo | colpi per punto prima → dopo | errori della CPU per colpo prima → dopo |
|---|---|---|---|---|
| Casual · medio | 92,6 → 94 (± 0,28) | 99,8 → 100 | 7,48 → 7,26 | 18 → 14,2 |
| Casual · amatore | 87,7 → 86,2 (± 0,52) | 99,6 → 99,3 | 8,96 → 9,34 | 16 → 10,7 |
| Casual · tennista | 99 → 99,5 (± 0,23) | 100 → 100 | 4,88 → 4,77 | 20,9 → 20,7 |
| Casual · preciso | 100 → 100 (± 0) | 100 → 100 | 4,35 → 3,89 | 21,4 → 23,2 |
| Casual · bambino | 44,2 → 47,2 (± 0,59) | 36,7 → 43,6 | 7,63 → 7,15 | 11,1 → 10,4 |
| Casual · impreciso | 56,4 → 58,9 (± 1,41) | 65,8 → 71,8 | 7,18 → 6,66 | 13,4 → 11,9 |
| Pro · medio | 67 → 64,4 (± 0,81) | 84,1 → 83 | 10,96 → 11,1 | 10,6 → 4 |
| Pro · amatore | 60,2 → 54,9 (± 0,99) | 74,1 → 62,8 | 13,21 → 14,6 | 8,5 → 2,3 |
| Pro · tennista | 96,8 → 96,4 (± 0,41) | 100 → 100 | 8,95 → 9,58 | 11,7 → 3 |
| Pro · preciso | 99,5 → 99,5 (± 0,13) | 100 → 100 | 8,35 → 7,19 | 14,6 → 6,7 |
| Pro · bambino | 16 → 15,5 (± 0,62) | 1,2 → 1 | 7,1 → 7,35 | 4,7 → 2,8 |
| Pro · impreciso | 19,7 → 19,6 (± 0,69) | 2,3 → 1,7 | 6,33 → 6,42 | 5,7 → 2,4 |
| Leggenda · medio | 20,1 → 20,1 (± 0,89) | 2,3 → 2,3 | 13,16 → 13,16 | 3 → 3 |
| Leggenda · amatore | 13,8 → 13,8 (± 0,92) | 0,5 → 0,5 | 11,16 → 11,16 | 2,6 → 2,6 |
| Leggenda · tennista | 28,5 → 28,5 (± 0,83) | 5,9 → 5,9 | 17,32 → 17,32 | 2,6 → 2,6 |
| Leggenda · preciso | 41,5 → 41,5 (± 1,35) | 28 → 28 | 20,3 → 20,3 | 2,9 → 2,9 |
| Leggenda · bambino | 7,6 → 7,6 (± 0,5) | 0 → 0 | 5,88 → 5,88 | 2,9 → 2,9 |
| Leggenda · impreciso | 7,7 → 7,7 (± 0,72) | 0,2 → 0,2 | 5,89 → 5,89 | 2,9 → 2,9 |

Leggenda: nessuna differenza, nemmeno all'ultimo decimale (il suo codice non è toccato). `npm run audit:legend`:
**69 criteri su 69** prima e dopo; «Pro contro medio» 84,1% → 83,0% dei game, «Casual contro medio» 99,8% → 100%.

### 7. La stanchezza della CPU a Pro

| profilo (Pro) | colpi dello scambio giocati dalla CPU stanca | errori da stanca | errori da fresca | errori da stanca sulle palle facili |
|---|---|---|---|---|
| umano | 47,3 | 4,8 | 1,6 | 0,4 |
| medio | 39,7 | 7,7 | 1,7 | 0,3 |
| amatore | 45,9 | 3,3 | 1,3 | 0,4 |
| tennista | 10 | 2,9 | 2,3 | 1 |
| bambino | 45,5 | 3,2 | 1,3 | 0,6 |

Quando si stanca, secondo il numero del colpo nello scambio (8 semi × 300 punti): contro «umano» è stanca nel 4% dei
colpi 1–6, nel 29% dei colpi 7–12, nel 67% dei colpi 13–20, nel 93% dei colpi 21–30 e sempre oltre il trentesimo.
Contro «tennista», che chiude prima, quasi mai (0%, 4%, 21%, 48%). Allo stesso numero di colpi la stanchezza cambia
molto da uno scambio all'altro (colpi 13–20 contro «umano»: da 0 a 0,93, metà sotto 0,20): dipende da dove sono andate
le palle. Ma negli scambi molto lunghi dei profili simulati la CPU finisce sempre stanca: vedi «Compromessi e limiti».

### 8. Scambi lunghi (6 semi × 300 punti)

| livello · profilo | punti con 30 colpi o più prima → dopo | con 40 o più | arrivati a 60 (chiusi d'ufficio dal banco) |
|---|---|---|---|
| Pro · umano | 6,8 → 15,2 | 1,4 → 7,8 | 0 → 1,38 |
| Pro · amatore | 5,5 → 10,9 | 0,9 → 4 | 0 → 0,5 |
| Pro · medio | 3 → 5,2 | 0,2 → 1,4 | 0 → 0,07 |
| Pro · tennista | 0,9 → 2,7 | 0,1 → 0,8 | 0 → 0,06 |
| Casual · umano | 0,6 → 3,4 | 0 → 0,8 | 0 → 0,06 |
| Casual · amatore | 0,8 → 3,7 | 0 → 1,1 | 0 → 0,24 |
| Casual · medio | 0,2 → 1,4 | 0,1 → 0,3 | 0 → 0 |
| Casual · bambino | 0,3 → 1,5 | 0 → 0,3 | 0 → 0 |

### 9. Il servizio del passo 1 resta com'era

Banco del servizio (`npm run audit:serve -- --nsemi=8`, 3200 servizi per riga; errore circa ±0,7 punti sul punto
diretto). Lo scambio dopo il servizio lo gioca «amatore»: per questo a Pro i punti vinti da chi batte scendono (è il
punto 9 di «Cosa cambia»), mentre i punti diretti restano gli stessi.

| livello | servizio | ace prima → dopo | punto diretto (ace + risposta sbagliata) prima → dopo | punti vinti da chi batte prima → dopo |
|---|---|---|---|---|
| Casual | insegnato nel tutorial | 0 → 0 | 14,7 → 14,6 | 88,3 → 86,3 |
| Casual | piatto e forte | 0 → 0 | 16,8 → 16,8 | 88,6 → 87,3 |
| Casual | perfetto, forte e sulla riga | 4,2 → 3,8 | 23,6 → 23,3 | 89,6 → 88,9 |
| Casual | in ritardo | 0 → 0 | 12,6 → 14,1 | 85,8 → 85,5 |
| Casual | forte in ritardo | 0 → 0 | 13,9 → 13,3 | 86,2 → 85,1 |
| Pro | insegnato nel tutorial | 0 → 0 | 5 → 4,3 | 63,1 → 53,8 |
| Pro | piatto e forte | 0 → 0 | 8,1 → 9 | 63,2 → 55,7 |
| Pro | perfetto, forte e sulla riga | 3,4 → 3,4 | 13,6 → 13,4 | 67,4 → 60,6 |
| Pro | in ritardo | 0 → 0 | 3,6 → 2,9 | 61,3 → 52,8 |
| Pro | forte in ritardo | 0 → 0 | 3,6 → 2,3 | 62 → 54 |

Partite normali con il servizio del telefono (`--naturale --servizio=insegnato,tardi`, 12 semi × 300 punti, circa 1800
servizi per riga; errore circa ±2 punti sui punti al servizio, ±4 sui game):

| livello | profilo | servizio del telefono | punti diretti prima → dopo | punti al servizio prima → dopo | punti in risposta prima → dopo | game vinti prima → dopo |
|---|---|---|---|---|---|---|
| Casual | bambino | insegnato | 15,6 → 14,9 | 52,1 → 51,5 | 40 → 44,1 | 41,5 → 44,5 |
| Casual | bambino | in ritardo | 13,6 → 14,5 | 48,1 → 50,4 | 38,9 → 45,8 | 34,8 → 45 |
| Casual | amatore | insegnato | 14,2 → 15 | 86,7 → 85 | 86,9 → 84,3 | 99,7 → 99,7 |
| Casual | amatore | in ritardo | 13,5 → 15,9 | 86,7 → 85,9 | 85,7 → 84,9 | 99,5 → 99,1 |
| Casual | medio | insegnato | 14,9 → 13,7 | 95,2 → 95,5 | 91,7 → 93,8 | 99,9 → 100 |
| Casual | medio | in ritardo | 14,3 → 13,5 | 94,8 → 94,1 | 90,8 → 92,4 | 99,9 → 100 |
| Pro | bambino | insegnato | 5,2 → 5,8 | 20,7 → 18,5 | 12,4 → 13,1 | 0,6 → 0,4 |
| Pro | bambino | in ritardo | 3,4 → 3,8 | 17,9 → 15,5 | 14,6 → 13,1 | 1,3 → 0,5 |
| Pro | amatore | insegnato | 4,1 → 5 | 62,9 → 55,8 | 57,9 → 54,3 | 75 → 61,8 |
| Pro | amatore | in ritardo | 3,3 → 4,4 | 61,4 → 55 | 57,6 → 53,8 | 72,5 → 61 |
| Pro | medio | insegnato | 6 → 5 | 68,4 → 66,9 | 62,9 → 64,1 | 83,1 → 82,9 |
| Pro | medio | in ritardo | 4,5 → 4,4 | 68,1 → 66,8 | 64,4 → 61,8 | 85 → 81,2 |

Il visitatore debole a Casual (la riga «bambino») non perde niente rispetto al passo 1, né battendo come nel
tutorial né battendo tardi.

## Obiettivi

| obiettivo | prima | dopo | raggiunto |
|---|---|---|---|
| CPU in rete al massimo in 1 punto su 8 (12,5%) | Casual 21–37%, Pro 8–34% | Casual 4,8–8,0%, Pro 1,3–5,2% | **sì** |
| errori della CPU sulle palle facili non oltre il 3% | Casual 9,3–13,6%, Pro 4,2–9,0% | Casual 1,5–2,5%, Pro 0,3–0,4% | **sì** (Casual contro «tennista» con poco margine: limite 7) |
| l'errore non dipende dalla lunghezza dello scambio da sola | palle facili dal 17° colpo: 14–29% | 0–2,1% a Casual, 0,4–0,7% a Pro | **sì** (a Pro resta un legame indiretto con la stanchezza: limite 3) |
| più vincenti veri di chi gioca | Casual 22–32% dei punti, Pro 7–11% | Casual 43–49%, Pro 40–45% | **sì** |
| vincenti almeno il 35% dei punti vinti a Casual (criterio del rapporto) | umano, medio, amatore 25–34%; bambino 14% | 49–54%; bambino 27% | **sì** per gli adulti, **no** per «bambino» |
| Pro, palla a 4–6 m: almeno il 15% di vincenti («umano») | 2,0% (riprese 82%) | 18,2% su 16 semi, 19,5% su 32 (riprese 73%) | **sì** |
| Pro contro «medio»: 70–85% dei game | 83,7–84,1% | 83,0% (`audit:legend`), 83,3% (banco), 83,6% su 56 semi | **sì**, ma vicino al bordo alto come prima (limite 1) |
| Casual: adulto medio almeno il 90% dei game | 99,3–100% | 99,8–99,9% | **sì** |
| Casual: «bambino» non peggio di oggi (31–48%) | 39,3% (banco), 36,7% (`audit:legend`) | 46,5% e 43,6% | **sì** (un poco più facile) |
| `audit:legend` 69/69 e Leggenda non più debole | 69/69 | 69/69, Leggenda identica | **sì** |
| stesso schermo e sfida tra due computer: non cambia niente | | regole e corsa della CPU spente (test) | **sì** nel codice e nei test; non giocato da due persone |
| Pro non deve diventare molto più difficile per l'amatore | 75,7% dei game (74,9 su 32 semi) | 65,2% (64,2 su 32 semi) | **in parte**: non crolla (senza taratura sarebbe sceso al 31%), ma perde 10 game su 100 (limite 2) |

## Compromessi e limiti (i punti dove sono meno sicuro)

1. **«Pro contro medio» è vicino al bordo alto della fascia, come prima.** La stima migliore è 83,6% ± 1 (56 semi); le
   due famiglie di semi danno 83,7 e 83,3. Una misura su soli 8 semi oscilla di ±3: chi rifà la misura con altri semi
   può leggere da 81 a 86. Prima del passo era nella stessa posizione (83,9% sugli stessi 56 semi). Si può scendere
   (con `stretch` 0,04 e `run` 0,02 «medio» va all'82%), ma «amatore» scende dal 64 al 58% dei game: ho scelto di non farlo.
2. **A Pro «amatore» e «umano» vincono meno di prima** (amatore 75 → 64–65% dei game, umano 93 → 83–85%). Prima più di
   metà dei loro punti erano errori regalati; quei punti adesso bisogna guadagnarli. In tutte le tarature provate (una
   ventina, sezione dopo) «medio» resta 9–10 punti su cento sopra «amatore»; prima erano 5. Non ho trovato una regola
   «per la pressione» che aiuti l'amatore senza aiutare di più chi tira forte e angolato: la sola che lo faceva era
   proprio l'errore legato alla lunghezza dello scambio. Se per l'evento Pro risulta troppo duro per la gente
   comune, la manopola è `pro.cpuWide.react` (ogni centesimo di secondo in più vale circa 2 punti su cento per
   «amatore» e 1 per «medio») insieme a `stretch`/`run` più bassi per tenere «medio» nella fascia.
3. **La stanchezza della CPU a Pro è legata, di fatto, anche alla lunghezza dello scambio.** Per regola contano solo le
   corse lunghe (uno scambio giocato addosso alla CPU non la stanca: c'è il test), ma i profili simulati mandano la
   palla lontano spesso, e dopo trenta colpi la CPU è sempre stanca. Sulle palle facili l'errore non cresce (0,3–1%
   anche da stanca); su tutte le palle a Pro passa da 2,1% (colpi 1–6) a 4,0% (dal 17°) contro «umano», da 3,2 a 5,6
   contro «medio». Prima andava da 6 a 18–20%. Una prima versione contava tutti i metri corsi, anche il rientro al
   centro: erano 4–6 metri a colpo per tutti i profili, cioè il numero dei colpi con un altro nome. L'ho scartata.
4. **A Pro alcuni scambi diventano molto lunghi.** Contro «umano», che sbaglia poco, i punti con 40 colpi o più passano
   dall'1,4 al 7,8% e l'1,4% arriva a 60 colpi (dove il banco chiude lo scambio d'ufficio; nel gioco vero non c'è un
   tetto). La media passa da 14 a 16,5 colpi per punto. La stanchezza serve a questo: in una taratura intermedia senza
   stanchezza arrivava a 60 colpi il 3,2% dei punti (misura di chi ha cominciato il passo, non rifatta sui valori
   finali). Non so se le persone vere reggono scambi così: probabilmente sbagliano prima dei profili simulati. Ho provato una stanchezza
   che continua a crescere negli scambi lunghissimi: li accorcia (0,3% a 60 colpi) ma porta «medio» all'86,5% dei
   game, fuori dalla fascia. Scartata.
5. **A Casual «bambino» vince un poco di più** (39 → 46,5% dei game nel banco, 37 → 44% con i semi di `audit:legend`;
   «impreciso» 66 → 72%). L'obiettivo era «non peggio». Con la stanchezza anche a Casual saliva al 55–64%: per questo a
   Casual la CPU non si stanca.
6. **Vincenti a 4–6 m a Pro: l'obiettivo è raggiunto con un margine piccolo.** 18–19,5% contro il 15% chiesto; una
   casella da 8 semi oscilla di ±2,5.
7. **A Casual la palla comoda ma veloce conta come palla difficile.** La definizione di «palla facile» del banco non
   guarda la velocità; la regola a Casual sì. Contro «tennista», che tira forte, gli errori sulle palle facili sono al
   2,5% (16 semi, 317 palle); con soli 8 semi (circa 160 palle, errore ±1,3) ho letto anche 3,2%. Per questo la tabella
   degli obiettivi del banco lascia decidere solo le caselle con almeno 300 palle facili, e scrive le altre a parte.
8. **L'errore «lungo» non esce sempre.** Quando la regola decide un errore «lungo», la palla cade dentro 14 volte su 100
   a Casual e 7 a Pro (era già così). Gli errori in rete e di lato escono 98–100 volte su 100.
9. **Servizio.** I punti diretti sono rimasti entro l'errore della misura, non identici: a Casual il servizio in
   ritardo 12,6 → 14,1%, a Pro quello forte in ritardo 3,6 → 2,3%. Il ritardo di lettura a Casual (0,075 → 0,037 s)
   l'ho controllato solo con il banco.
10. **I profili simulati non sono persone.** Tutte le percentuali di game valgono per quei profili. In particolare non
   so quanto spesso una persona vera, con il telefono, riesce a mettere la palla a 4–6 metri dalla CPU.

## Taratura: cosa ho provato

Il rapporto avvertiva che togliere solo la parte legata alla lunghezza dello scambio rende Pro molto più difficile
(amatore dall'81 al 31% dei game). Le tre manopole di Pro vanno girate insieme: il ritardo sulla palla lontana
(`cpuWide.react`), gli errori in allungo e in corsa (`stretch`, `run`), la stanchezza. Alcune delle prove, in punti
vinti su cento e (tra parentesi) game vinti; 40–56 semi per «medio», 24–32 per gli altri:

| prova (Pro) | medio | amatore | umano | vincenti a 4–6 m («umano») | esito |
|---|---|---|---|---|---|
| prima del passo | 65,9 (83,9) | 60,5 (74,9) | 73,2 (93,5) | 2,2 | |
| ritardo 0,215 s, allungo 6%, corsa 3%, stanchezza leggera su tutti i metri | 67,4 (86,4) | 57,0 (67,1) | 67,1 (86,2) | 23 | medio fuori dalla fascia |
| ritardo 0,19 s, stessi errori, stessa stanchezza leggera | 64,7 (83,6) | 52,7 (57,4) | 63,5 (80,5) | 17 | amatore e umano perdono troppo |
| ritardo 0,18 s, allungo 5%, corsa 2,5%, stanchezza forte su tutti i metri | 65,8 (83,5) | 56,4 (66,0) | 66,7 (85,1) | 18 | scartata: quella stanchezza era il numero dei colpi (limite 3) |
| ritardo 0,18 s, allungo 5%, corsa 2,5%, stanchezza sulle corse lunghe × 4,5 | 65,2 (83,7) | 55,6 (63,6) | 67,1 (85,2) | 16,5 | margine troppo piccolo sul 15% |
| **scelta: ritardo 0,19 s, allungo 4,5%, corsa 2,2%, stanchezza × 3,5** | **64,9 (83,6)** | **55,6 (64,2)** | **66,3 (84,6)** | **19,5** | |
| ritardo 0,20 s, allungo 4%, corsa 2%, stanchezza × 3,5 | 65,6 (84,0) | 56,0 (64,1) | 66,2 (84,7) | 22 | equivalente, medio più vicino al bordo |
| ritardo 0,21 s, allungo 3,5%, corsa 1,8%, stanchezza × 3 | 65,7 (84,5) | 55,3 (62,6) | 66,4 (86,2) | 24 | equivalente, meno errori «per la pressione» |
| ritardo 0,19 s, allungo 4%, corsa 2%, stanchezza × 3,5 | 64,5 (82,0) | 53,3 (57,8) | 66,3 (84,2) | 20 | medio più al sicuro, amatore perde troppo |
| la scelta, con la stanchezza che sale oltre il massimo | 66,8 (86,5) | 55,5 (63,4) | 67,8 (87,0) | 22 | medio fuori dalla fascia |

A Casual la taratura (velocità 4,4 m/s, errore di base 1,7%, allungo 24%) viene dall'esperimento E1b del rapporto e
dal lavoro precedente su questo passo; io ho tolto la stanchezza (limite 5) e rifatto tutte le misure.

## Test

| prova | risultato |
|---|---|
| test del gioco (`npm test`) | **1103/1103** (prima del passo 1089). In una delle tre esecuzioni complete 1102/1103: vedi sotto «Un test instabile che c'era già» |
| build (`npm run build`) | ok |
| `npm run audit:legend` | **69/69** |
| test del sito (`node --test tools/test/*.test.mjs`) | **201/201** |
| prova nel browser `natpf-rally` | 9/9 |
| prova nel browser `natpf-leggenda` | 7/7 |
| prova nel browser `natpf-servizio-peso` | 8/8 |
| prova nel browser `natpf-training-flow` | 22/22 |

Test nuovi (`natpf-tennis/test/natpf-b18-t2-cpu-pressione.test.mjs`, 14):
- la difficoltà della palla (`cpuStrain`): zero sulla palla comoda, piena in allungo, in corsa, sulla palla veloce;
- sulla palla facile resta solo la base (al massimo 3%), qualunque sia la lunghezza dello scambio, l'angolo e la pressione;
- l'errore cresce con allungo, corsa e velocità; angolo e pressione aggravano solo la palla difficile; a Pro contano
  solo allungo e corsa; Leggenda senza dado;
- la palla lenta e corta mette meno in difficoltà, mai sotto il minimo del livello;
- il tipo di errore segue il motivo (in rete poche palle, in allungo di lato, veloce e profonda lunga);
- nel motore: il piano della risposta legge la corsa e l'allungo veri; l'errore di lato esce dal lato della palla;
- la palla lontana letta in ritardo a Pro (poco a Casual, mai a Leggenda);
- stanchezza: contano le corse lunghe e non il numero dei colpi (40 palle addosso alla CPU: zero); riparte a ogni
  punto; Casual e Leggenda non si stancano;
- stanca corre più piano e sbaglia di più le palle difficili, non quelle comode;
- stesso schermo e due computer: nessun errore a dado, nessuna corsa della CPU, nessuna stanchezza;
- la difficoltà del livello passa dalla corsa (Casual più lenta di Pro, Pro di Leggenda);
- le costanti del servizio non dipendono più da quelle degli scambi;
- il banco legge i valori di prova o dà errore; nel gioco non ce ne sono;
- banco ridotto (5 semi × 300 punti, sei caselle): CPU in rete, palle facili, palle facili negli scambi lunghi,
  vincenti, campo aperto a Pro, livelli.

Test che fissavano i numeri vecchi, aggiornati:
- `natpf-grip-skill.test.mjs` («gli errori della CPU crescono con…»): chiedeva che l'errore crescesse con la lunghezza
  dello scambio, con l'angolo e con la pressione anche sulla palla comoda. Era il difetto. Ora chiede il contrario.
- `natpf-swing.test.mjs` («CPU: sbaglia sui colpi pericolosi…»): la palla forte e profonda valeva più del doppio di
  quella lenta e corta anche con la CPU comoda. Ora conta se la CPU è in allungo o in corsa.
- `natpf-b18-stanchezza.test.mjs` (stanchezza di chi gioca): soglia del tempo su «Stanco!» da 10 a 15%. Quella partita
  (un seme, 40 punti) era già al 9,9% ed è al 10,3% perché gli scambi di Pro sono un poco più lunghi. Su 12 semi la
  media è la stessa (7,2% prima, 6,9% dopo; su 150 punti «amatore» 6,2 → 6,9%, «umano» 6,9 → 8,1%).
- `natpf-b18-t2-servizio.test.mjs` (passo 1): il controllo «con i valori di prima della revisione» usava la base 0,135
  nella scala vecchia; nella scala nuova (× 0,84) è 0,113. Il test e le sue soglie sono gli stessi.

Un test instabile che c'era già (non toccato): `natpf-formato-fiera.test.mjs`, «servizio della CPU: velocità vera sul
tabellone (non 194 km/h fissi)». Il servizio della CPU ha una velocità a caso e il test chiede che non sia 194 km/h:
ogni tanto lo è. Lanciato da solo 12 volte fallisce 1 volta con questo passo e 2 volte sul commit di prima (`1f170bb`):
non dipende da questo lavoro (il servizio della CPU non è toccato). Si sistema fissando il caso nel test.

## Cosa non è verificato

- **Persone vere e telefoni veri.** Tutto è misurato con giocatori simulati. Non so se in fiera Pro risulterà troppo
  duro (limite 2) né quanto dureranno gli scambi (limite 4).
- **A occhio.** Non ho guardato su uno schermo vero, né sul ledwall, la CPU che esita sulla palla lontana e che
  rallenta da stanca, né gli errori che escono di lato. Nel browser delle prove ho controllato solo che le partite
  girano e che i controlli automatici passano.
- **Windows, GPU vera, audio.** Niente di questo passo li tocca, ma non sono stati provati. L'installer non è stato
  rifatto (i file di versione non si toccano in questo passo).
- **Stesso schermo e due computer veri.** Provati nel codice e nei test (le regole nuove sono spente quando risponde
  una persona), non giocati da due persone.
- **Doppio 2v2 contro la CPU e Allenamento.** Usano la stessa CPU (l'Allenamento quella di Casual): le regole nuove
  valgono anche lì. Non sono misurati.
- **Livelli «Evento» e «Bambini».** Non sono in questo passo e in questo ramo non esistono. Quando arrivano va
  controllato da quale livello prendono i valori della CPU.
- **Webcam e mouse.** Il profilo «medio» simula un comando diretto; i colpi dalla webcam non sono misurati a parte.
