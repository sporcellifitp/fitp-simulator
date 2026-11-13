# Revisione finale della serie B23 · T2.3 · B31 · B32 · B33 (13/11/2026)

Serie rivista: `25e46ed..7c72b70` (versione 2026-11-13.4). Due revisori indipendenti hanno guardato la serie e hanno
trovato 4 difetti bloccanti (due sono lo stesso difetto visto da tutti e due), 14 minori e 13 decisioni per l'utente.
Questo documento dice cosa ho corretto, cosa no e perché, e le decisioni che restano all'utente, con i numeri.

Lavoro nel ramo `revisione-finale`, partito da `7c72b70`, **senza push**. Non ho toccato i documenti di ripresa
(`PIANO_LAVORI`, `TRACCIA_PASSI`, `WORK_PROGRESS`, `PASSAGGIO_CONSEGNE`, `PROJECT_MEMORY`) né i file di versione: la
versione nuova e i pacchetti li fa chi unisce il ramo.

**Tutti i numeri delle partite vengono dal gioco simulato** (motore vero senza disegno, giocatori simulati del banco), o
dal gioco vero nel browser con colpi simulati. Non sono persone vere, telefoni veri, il PC dell'evento o il ledwall.

## In breve

- **Corretto: la palla corta della CPU** ora si annuncia davvero «Palla corta della CPU», in bianco, nell'angolo della
  CPU. Prima chi gioca leggeva in rosso «Fuori · Palla corta» nel proprio angolo, come un suo errore.
- **Corretto: il «passo corto a rete» nascosto.** Il B31 rendeva lento chi gioca a rete solo nei calcoli (dove andare,
  cosa è raggiungibile), mentre il personaggio correva a velocità piena. Tolto: ora a rete vale lo stesso movimento del
  resto del campo (B32: passo di attesa, accelerazione, frenata), che si vede. La Leggenda rispetta tutti i suoi criteri.
- **Corretto nei documenti: i km/h** del «colpo più veloce» non sono km/h veri (sono 1,89 volte la palla del motore,
  fino a 334 a Leggenda). Quale scala usare è una decisione dell'utente: il codice non è cambiato.
- **Minori corretti**: posizione in classifica oltre le prime 50 partite, telefono che perdeva la causa della palla corta,
  riga piccola della scritta troppo piccola a 720×720, test di «Stanco!» che misurava un'altra cosa, test della salita a
  rete dal fondo troppo largo, prova del registro senza la coda in IndexedDB, prova del dritto dal video non aggiornata.
- **Decisioni per l'utente**: 13, sotto, con opzioni e numeri. Le più importanti: la classifica (una sconfitta fortunata
  a Leggenda sta sopra tutte le vittorie) e la scala dei km/h.

## 1. Difetti bloccanti

### 1.1 «Palla corta della CPU» (B31) — corretto

**Il difetto** (trovato da tutti e due i revisori). L'involucro della scritta dell'esito (`natpf_shot_feedback.js`)
trattava ogni scritta come un colpo di chi gioca. Per «CPU DROP SHOT» calcolava se la palla cadeva nella metà della CPU:
la palla della CPU cade nella metà di chi gioca, quindi «Fuori». Chi gioca vedeva **«Fuori · Palla corta» in rosso,
nel suo angolo**; con la palla corta in rete «In rete · Palla corta».

**La correzione.** Le scritte che cominciano con «CPU» passano senza esito: testo tradotto («PALLA CORTA DELLA CPU»),
colore bianco (classe `q-cpu`), nell'angolo dell'avversario (come il colpo dell'altro giocatore), nessun anello.
File: `natpf-tennis/src/natpf/natpf_shot_feedback.js` (`isCpuGrade`, `cpuPopupPlace`), `natpf-tennis/natpf-ui.css`.

**Le prove.**
- Test nuovo in `test/natpf-b31-rete.test.mjs`: chiamata vera del motore (`_executeOpponentReturn`) con l'involucro
  installato, a Pro, Evento e Casual, palla che cade dentro (z 2,95). Senza la correzione il test fallisce con «Fuori».
- `tools/e2e/natpf-rete.mjs`: scena nuova che legge `#timing-popup-grade`. **11/11** (Classici e Lob & Drop 3D).
- Script del revisore rifatto sul ramo: a 1280×720, 720×720 e 1920×540 la scritta è «PALLA CORTA DELLA CPU», bianca,
  in basso a destra. Schermate guardate.

### 1.2 Passo corto a rete nascosto (B31, si vedeva soprattutto a Leggenda) — corretto

**Il difetto.** Il documento B31 diceva «a rete ci si muove meno in fretta (si reagisce un poco dopo e il passo è più
corto)». Nel codice la regola (reazione +0,12 s, passo × 0,55 entro 7 m dalla rete) c'era **solo nel piano
d'intercetto** (dove andare, volée o dopo il rimbalzo, cosa è raggiungibile) e nella stima della Leggenda. Il personaggio
vero, a rete, correva a 8,8 m/s come prima, e il B32 lasciava a rete il movimento di prima («entro 7 m resta il B31»).
Chi gioca vedeva un personaggio velocissimo che il gioco trattava come lento: una regola nascosta. Era anche la causa
principale del salto di «preciso» a Leggenda (ablazione del revisore).

**Le strade provate** (Leggenda, game vinti dalla CPU, 8 semi ufficiali; criteri: «tennista» ≥ 85%, «preciso» ≥ 60%):

| Strada | «tennista» | «preciso» | Esito |
|---|---|---|---|
| 7c72b70 (regola nascosta) | 88,9% | 82,5% | regola nascosta |
| (b) togliere il passo corto dal piano, movimento di prima a rete | 81,4% | 72,4% | **KO** «tennista» |
| (b) e anche la stima della Leggenda uguale al movimento vero | 77,7% | 66,9% | **KO** |
| **scelta: niente passo corto, a rete il movimento del B32** | **86,6%** | **76,7%** | **OK** |
| (solo per confronto) a Leggenda nessuna salita a rete automatica | 89,0% | 62,6% | OK, ma toglie il B31 a Leggenda |

**La correzione scelta.** Tolta la regola nascosta dal piano (`natpf_impact.planPlayerIntercept`): il piano usa la
velocità vera. Anche a rete e verso la rete vale il movimento del B32 (`natpf_movement.runProfile`, che prima a 7 m dalla
rete restituiva «movimento di prima»): passo di attesa dopo il colpo della CPU, accelerazione, frenata, arrivo «giusto in
tempo». È una regola che **si vede** ed è la stessa di tutto il campo. Il «passo corto» resta solo nella **stima** che la
Leggenda fa di chi è a rete quando sceglie il passante (`natpf_legend.humanReach`, `netMoveOf`); con la stima uguale al
movimento vero la Leggenda sceglie peggio («tennista» 77,7%). Dove il B32 non vale (Bambini, stesso schermo, sfida tra due
computer, Player 2, doppio, allenamento, eventi, demo) a rete c'è il movimento di prima, e ora anche il piano lo tratta
così (prima il piano li trattava come lenti anche lì).

**Le misure dopo la correzione.**
- `npm run audit:legend`: **tutti i criteri OK** (`results/revisione-finale/legend-dopo.txt`). Leggenda: medio 99%,
  amatore 98,7%, tennista 86,6%, preciso 76,7%, bambino 100%, impreciso 100%. Pro contro «medio» 75,2% (fascia 70–85),
  Casual 100%.
- Con più semi: 24 semi (SEEDS + MORE_SEEDS) «tennista» 88,1%, «preciso» 76,4%; i 24 semi nuovi del revisore
  (1009…1163) «tennista» 86,9%, «preciso» 78,9% (a 7c72b70: 89,0 / 80,1; base 25e46ed: 89,7 / 68,2).
- Scena del revisore (chi gioca a rete a 5,2 m, Pro, 48 passanti della CPU): prima 8,8 m/s sempre e piani volée 26 /
  dopo il rimbalzo 19 / non raggiunta 3; ora velocità da 2,6 a 8,6 m/s (va «giusto in tempo»), piani volée 17 / dopo il
  rimbalzo 31, **48/48 palle prese** come prima.
- `audit:rete` (3 semi × 300 punti, serie 1 e 2; `results/revisione-finale/rete-dopo*.txt`), 7c72b70 → ora:
  - volée per game: Casual/tennista 0,62 → 0,41 e 0,63 → 0,59; Pro/amatore 1,2 → 1,66 e 1,09 → 1,12: **non crollano**
    (il B32 aveva misurato 54 → 13 piani di volée mettendo l'accelerazione a rete insieme al passo corto nascosto);
  - **Leggenda/tennista**: chi gioca a rete nel 6 → 15,5% e 4,7 → 14,6% dei colpi della CPU, volée per game 0,84 → 6,2;
    punti vinti 28,7 → 33,8% e 29,9 → 32,3%. A Leggenda il gioco a rete prima era quasi spento dalla regola nascosta;
  - schiacciate riuscite a rete rimandate dalla Leggenda («tennista»): 52 → 28,6% e 61 → 54% (punto 22 un poco meglio).
- `audit:movimento` (serie 1 e 2, `results/revisione-finale/movimento-dopo-s*.txt`), punti vinti 7c72b70 → ora:
  - Bambini/bambino 79,7 → 80,6 e 82,5 → 82,4 (Bambini resta facile);
  - Pro (media delle due serie): tennista 93,4 → 93,8, amatore 53,2 → 54,0, umano 61,8 → 60,1, piazza 55,0 → 53,1,
    centro 49,1 → 47,8, bambino 17,1 → 16,0: dentro il rumore (circa ±2–3 punti tra due serie);
  - Leggenda/tennista 28,7 → 33,8 e 29,9 → 32,3 (vedi sopra); amatore, umano, bambino uguali entro 1–2 punti.
  - «Stanco!» (palla in gioco): Pro/amatore 1,2% → 1,2%; Evento/umano 2,8 → 2,7%.
- Stesso schermo (`scripts/audit/b25/misure.mjs`, 900 partite per riga; `results/revisione-finale/b25-*.txt`): tra pari
  si vince 50% esatto (i due lati tra 46,3 e 53,7%, dentro il rumore di 600 partite). Aiuto al più giovane (variante G)
  contro nessun aiuto: bambino-medio 36,7 contro 10,9%, bambino-amatore 19,9 contro 4,3%, ragazzo-medio 41,2 contro
  24,4%, ragazzo-amatore 25,1 contro 10,6%, bambino-ragazzo 39,2 contro 32,8% (l'aiuto funziona ancora; nell'ultima riga
  dà meno di prima, +6 invece di +14, perché senza aiuto il bambino vince di più).
- `audit:drop --obiettivi` serie 1 e 2: **tutti OK**; Leggenda/tennista «scambio lungo» 6,5% e 7,3% (al massimo 10;
  a 7c72b70 era 9,9%: il margine che il revisore chiedeva è tornato).
- `audit:evento`: Evento/medio 71,9 e 69,3% dei punti, umano 70,1 e 68,1%; Bambini/bambino 82,0 e 82,4%.

**Test.** `test/natpf-b32-movimento.test.mjs`: a rete vale il movimento B32; scena dei passanti contro chi è a rete
(niente partenza a tutta, palle tutte prese, velocità massima mai oltre quella del personaggio). Senza la correzione il
test fallisce. Impronte nuove dello stesso schermo in `test/natpf-b25-stesso-schermo.test.mjs` (le partite tra due
persone cambiano perché il piano non tratta più come lento chi è a rete; prima `1eb7dff8db39`, `7ac4aa5b8ef1`).

Documenti corretti: `docs/b31/gioco-a-rete.md` (riquadro in cima, §1, §3, «Cosa non è riuscito» punto 1 con
l'ablazione), `docs/b32/movimento.md` (riquadro in cima e «Non vale»).

### 1.3 Colpo più veloce e scala dei km/h (B33) — corretto il documento, la scala è una decisione

Il revisore ha ragione: il campo è in metri, la palla in m/s; la scritta del colpo usa velocità × 6,8 invece di × 3,6,
cioè **1,89 volte** la palla del motore. A Leggenda la schermata finale arriva a 334 «km/h» (177 veri), oltre il record
del servizio; i servizi escono più lenti dei colpi di scambio. Il B33 non ha creato la scala, ma la mette in primo piano
come «dato vero». Ho corretto `docs/b33/fine-partita.md` (non sono km/h veri; fino a oltre 330 a Leggenda). Non ho
cambiato la scala: cambierebbe tutte le scritte dei colpi e il telefono, è la **decisione 10** sotto.

## 2. Difetti minori

| # | Minore | Cosa ho fatto |
|---|---|---|
| 1 | Classifica: dalla 51ª partita «57° su 57» per una partita già tolta (B33) | **Corretto**: posizione e totale sulle 50 tenute; oltre, «Fuori dalle prime 50 partite di oggi · N punti». Test in `natpf-b33-fine-partita` |
| 2 | Telefono: palla corta lunga o in rete con tempo e causa diversi, la causa si perdeva (T2.3) | **Corretto**: il telefono riceve «in ritardo · da troppo lontano» (`phoneWhy`); la causa uguale al tempo non si ripete. Test in `natpf-b18-t2-leggenda-palla-corta` |
| 3 | Prova del registro senza nome: non guardava la coda in IndexedDB (B33) | **Corretto**: `natpf-fine-partita.mjs` legge `natpf-registro/testi` dopo un blocco: 1 blocco, 21 291 caratteri, nessun nome. **34/34** |
| 4 | Riga piccola della scritta a 720×720 a 8,6 px (B32) | **Corretto**: almeno 10 px (`max(0.78em, 10px)`). «Perfetto · in corsa · 189 km/h» su una riga a 720×720 e 1920×540 |
| 5 | Test «Stanco!» con soglia alzata guardando una partita sola (B31) | **Corretto, e c'era un errore nel test**: confrontava la stanchezza con 0,25 invece di 0,75, cioè contava come «Stanco!» l'energia sotto il 75% (il «18,6%» del B31 era quello). Ora soglia giusta e misura su 3 semi × 100 punti con la palla in gioco, Pro/amatore ≤ 5% (oggi circa 2,2%) |
| 6 | Test della salita a rete dal fondo: «< 20%» per una regola detta «mai» (B31) | **Corretto**: il test controlla che nessuna salita a rete parta da più di 11,2 m dalla rete. Documento B31: il colpo forte e profondo porta a rete fino a 10,8 m (1,1 m dentro la riga di fondo), il tagliato fino a 11,2 m |
| 7 | `natpf-dritto-video` 51/58: base ae68759 superata da B31 e B32 (B23) | **Corretto**: le pagine della prova spengono le regole B31 e B32 (`REGOLE=oggi` le lascia accese). Ossa **28/28** (su «No» 0 fotogrammi diversi da ae68759), partite **14/14** identiche alla base. Con le regole di oggi: accesa = spenta, cpu e schermo diverse dalla base (atteso) |
| 8 | Il documento B32 non diceva che la palla corta della CPU (bersaglio entro 7 m) restava senza accelerazione | **Superato dal punto 1.2**: ora anche quella corsa ha passo di attesa e accelerazione. Scritto nel documento B32 |
| 9 | Documento B32 «Leggenda uguale entro il rumore» | **Numeri nuovi** al punto 1.2: con il movimento anche a rete Leggenda/tennista vince 3–5 punti in più (resta sopra il criterio) |
| 10 | Obiettivo T2.3 «scambio lungo ≤ 10» senza margine | **Risolto dalle misure**: 6,5% e 7,3% (serie 1 e 2) |
| 11 | Documento B33: equità della classifica solo in media | **Corretto il documento**: aggiunta la distribuzione per partita (simulazione del revisore) e il rimando alla decisione 9 |
| 12 | Schiacciate a rete rimandate dalla Leggenda tornate su con il B32 | **Misurato**: ora 28,6% e 54% («tennista», serie 1 e 2; a 7c72b70 52 e 61%). Campioni piccoli (7–26 schiacciate per casella): non ho cercato quale parte del B32 lo causava |
| 13 | Racchetta che attraversa la testa nel recupero di corsa dopo il dritto dal video (B23 × B32) | **Non corretto**: non sono riuscito a riprodurlo con una misura (distanza telaio–testa nel recupero di corsa uguale con la prova accesa e spenta: 0,25–0,30 m a 6,5–7,6 m/s, sonda in `scratchpad/rf/testa.mjs`). Il difetto l'ha visto il revisore sui fogli dei fotogrammi; senza una misura non so se una correzione lo toglie. Da guardare con i fogli |
| 14 | Tagliato oltre il tetto di +3 in più caselle; CPU a rete; Bambini con un adulto a rete | Sono decisioni (4, 5, 6): numeri sotto |

## 3. Decisioni per l'utente (non le ho prese io)

1. **Leggenda e gioco a rete (B31).** Ora, senza la regola nascosta: «preciso» perde il 76,7% dei game contro la
   Leggenda (8 semi; 76,4% con 24 semi, 78,9% con i semi del revisore), sulla base 25e46ed era 68,2%. Criterio ≥ 60%
   rispettato. Opzioni: (a) tenere così; (b) a Leggenda nessuna salita a rete automatica dopo un attacco (come la CPU, che
   a Leggenda resta in fondo): «preciso» 62,6%, «tennista» 89,0% (8 semi), cioè circa come prima del B31; (c) ritarare i
   passanti della Leggenda. A Leggenda chi gioca bene ora gioca molte più volée (6 a game invece di 0,8).
2. **Scritte «in corsa / in allungo» a Evento (B32).** Revisore (7c72b70): Evento/umano 18,9% dei colpi «in corsa»,
   1,59 scritte per punto, fino a 15 in un punto; Evento/amatore 0,92 per punto; Pro 0,3–0,6; Casual 0,1; Leggenda
   0,3–0,8; «in allungo» 0,1–3% dei colpi. Dopo la correzione del punto 1.2 (serie 1): Evento/umano 22,9% in corsa.
   Opzioni: (a) tenere; (b) «in corsa» solo con la corsa forte (soglia da 0,5 a 0,8); (c) al massimo una volta per
   punto; (d) a Evento corsa minima più lunga (da 3,2 a 4,5 m), che cambia la frequenza ma non i punti.
3. **Palla corta a Facile (scheda D8, +2…+5 punti).** Con le regole di oggi (palla corta «al momento giusto» contro il
   gioco normale, 3 semi × 300 punti): «amatore» −0,2 e +3,9, «bambino» −2,2 e −1,9 (serie 1 e 2); il revisore con altri
   semi +3,3 e +4,1 a 7c72b70. Il rumore è ±2–3 punti. Opzioni: (a) chiudere il punto aperto; (b) misurare con 6 semi.
4. **Tagliato utile (B31), tetto di +3 per «solo tagliati».** Revisore (7c72b70): Pro/amatore +3,4, Pro/umano +4,3; con
   il solo B31 Casual/amatore +4,6; il documento B31 diceva «una casella su 18». Non rimisurato dopo la correzione.
   Opzioni: (a) accettare +4–5 (il tagliato serve per andare a rete); (b) abbassare `SLICE_ERR.pro` (0,003) e rimisurare.
5. **CPU a rete (B31).** Punti vinti dalla CPU quando sale a rete, ora (serie 1 e 2): contro Pro/amatore 32 e 38%,
   Pro/tennista 3 e 12%; sale nel 7% dei suoi colpi a Pro contro «amatore». Opzioni: (a) tenere (si vede poco, non
   regala niente); (b) volée della CPU più forti e salite più rare, da rimisurare.
6. **Bambini con un adulto bravo.** Revisore: «tennista» a Bambini a rete nel 34,8% dei colpi della CPU, 166 schiacciate
   in 900 punti; il bambino a rete nel 5%. Non rimisurato. Opzioni: (a) tenere (il livello è per i bambini); (b) a
   Bambini nessuna salita a rete automatica dopo un attacco «drive».
7. **Il Pro resta com'è (decisione dell'11/11).** Dopo la correzione, Pro contro «medio» 75,2% (fascia 70–85);
   `audit:movimento` Pro dentro ±2 punti da 7c72b70 (media delle due serie). Revisore sulla serie intera (base → 7c72b70,
   altri semi): Pro/medio 81,2 → 76,1% dei game, amatore 63,3 → 66,7, umano 83,9 → 81,3. Opzioni: (a) accettare (dentro
   il rumore); (b) Pro identico, spegnendo B31 e B32 a Pro (non consigliato).
8. **Leggenda, finestra del tempo che si stringe negli scambi lunghi (spanPress, T2.3).** Si vede dal voto («Anticipo»,
   «Ritardo»). Opzioni: (a) tenere; (b) toglierla: serve una finestra fissa di 0,08 s e «tennista» scende sotto il
   criterio (81,7% secondo gli autori).
9. **Classifica delle partite: una sconfitta a Leggenda sopra le vittorie (B33).** Punteggio = % punti × livello
   (Leggenda × 5). In media è giusto (umano 91/96/96/102/97 ai cinque livelli), ma con 1 game (4–7 punti) un punto in
   più a Leggenda vale circa 70 punti. Massimo di una vittoria perfetta: 100 Bambini, 110 Facile, 140 Evento, 160
   Esperta; a Leggenda una sconfitta 3-4 vale 214. Simulazione del revisore (1 game): l'adulto medio che perde a
   Leggenda supera 160 nel 25% delle partite, il «tennista» nel 50%, l'«amatore» nel 14% (2 game: 13,6% e 44%).
   Opzioni: (A) tenere; (B) prima le vinte poi le perse; (C) tetto per le sconfitte (es. 160); (D) una classifica per
   livello; (E) bonus fisso per la vittoria (+30: non basta contro il 90° percentile 167); (F) Leggenda in classifica
   solo con 2 game o più.
10. **Scala dei km/h (scritte e «colpo più veloce»).** Oggi velocità × 6,8 = 1,89 volte la palla vera: Evento fino a
    233 (123 veri), Leggenda 334 (177 veri), servizi 126–145 (67–77 veri). Opzioni: (A) tenere × 6,8; (B) km/h veri
    (× 3,6: scambi 60–125, massimo circa 177, servizi circa 70); (C) scala intermedia con un tetto dichiarato (es. 200
    scambio, 230 servizio), senza chiamarli «veri»; (D) togliere il riquadro «Colpo più veloce». In ogni caso servizio e
    scambio dovrebbero avere la stessa scala; e il «colpo più veloce» oggi conta anche un colpo finito fuori o in rete.
11. **Frequenza di «in corsa» / «in allungo» (B32).** Banco: a Evento 16–22% dei colpi in corsa; partita vera del
    revisore a Evento: 9%. Opzioni: (A) tenere; (B) soglie più alte solo a Evento; (C) «in corsa» solo quando il colpo è
    debole o fallisce.
12. **«In corsa» sul telefono.** Oggi solo sul computer (dichiarato). Opzioni: lasciare così, o aggiungere il motivo
    nella riga piccola del telefono come per «Troppo lunga».
13. **Ace e vincenti per il Player 2 nella sfida tra due computer (B33).** Opzioni: tenere così, o aggiungere il motivo
    del punto al messaggio dell'host (tocca i messaggi tra i due computer; `natpf-1v1-p2p` oggi è verde).

## 4. Verifiche fatte (sul ramo `revisione-finale`)

| Verifica | Risultato |
|---|---|
| `npm test` (gioco) | **1410 superati, 0 falliti**, 1 saltato (server LAN: serve `npm ci` in `tools/lan`), 3 min 15 s |
| `npm run build` | riuscita (uscita in `/dev/shm`: il disco del computer era pieno) |
| `node --test tools/test/*.test.mjs` (sito e telefono) | **226/226** |
| `npm run audit:legend` | **tutti i criteri OK** (punto 1.2) |
| `audit:rete`, `audit:movimento` (serie 1 e 2), `audit:drop --obiettivi` (serie 1 e 2), `audit:evento`, B25 pari e aiuto | rifatti, in `natpf-tennis/scripts/audit/results/revisione-finale/` |
| `natpf-rete.mjs` | **11/11** (con la scena nuova della palla corta della CPU) |
| `natpf-fine-partita.mjs` | **34/34** (con la coda del registro in IndexedDB) |
| `natpf-dritto-video.mjs` ossa e partite | **28/28** e **14/14** (regole B31 e B32 spente nella prova) |
| altre prove nel browser | vedi «Prove nel browser» sotto |

## 5. Cosa non è provato

- Niente con **persone vere**, **telefoni veri**, il **PC Windows** dell'evento o il **ledwall**.
- La **sensazione** del movimento a rete con l'accelerazione (passo di attesa dopo il colpo della CPU anche da vicino) va
  vista con persone vere: nei numeri le volée non calano, ma il ritmo a rete è diverso da prima.
- La **racchetta nella testa** nel recupero di corsa (minore 13) non è stata riprodotta né corretta.
- Tagliati (decisione 4) e Bambini con l'adulto a rete (decisione 6) non sono stati rimisurati dopo la correzione.
- Il programma Windows (`natpf-desktop`) e il server LAN non sono stati riprovati (non toccati).
- Versione nuova e pacchetti non fatti (vietato in questo ramo).
