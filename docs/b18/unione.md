# B18.1 · Unione della tappa 1

Unione dei quattro rami della tappa 1 del B18 (decisioni dell'utente del 10/11 sull'audit B16,
`docs/b16/rapporto-gameplay.md`):
- (1) tappa 1 «sì»;
- (2) formato in fiera «ok, dimmi come attivarlo in caso»: opzione **spenta** di base;
- (3) «Nuovo giocatore» «sì»;
- (4) tappa 2 con i livelli Evento e Bambini «sì, ma dimmi sempre come attivarli». La tappa 2 **non** è in questa unione.

Ramo d'unione `b18-int`, nella worktree `.claude/worktrees/b18-int`, nato da `d09357a` (`natpf-simulator`). Niente push e
nessun cambiamento a `natpf-simulator` o `main`. I file di versione (`version.js`, `build.json`, `LEGGIMI.txt`,
`novita.txt`) e i documenti di ripresa (`PIANO_LAVORI.md`, `WORK_PROGRESS.md`, `PASSAGGIO_CONSEGNE.md`) non sono
toccati: si aggiornano quando l'unione entra in `natpf-simulator`.

Documenti dei rami, con il dettaglio di ogni correzione:
- `docs/b18/r1-fine-partita-e-visitatori.md`;
- `docs/b18/r2-motore-piccolo.md`;
- `docs/b18/r3-scritte-e-istruzioni.md` (con `docs/b18/misure-con-persone.md`);
- `docs/b18/r4-formato-fiera.md`.

## Come si attiva

Quasi tutto vale subito e non c'è niente da accendere. Le eccezioni sono due.

**Formato in fiera (spento di base).** Si accende dal pannello dello stand:
1. Dal **menu principale** del gioco premi **Ctrl + Maiusc + K**. In alternativa tieni premuto per 3 secondi il marchio
   **NATPF** in alto a sinistra nel menu.
2. Si apre «Pannello dello stand». Clicca il riquadro **«Formato in fiera»**: la scritta passa da **«No»** a
   **«Sì · punto decisivo»** (in giallo).
3. Clicca **«Chiudi»**. Vale **dalla partita dopo** e **resta salvata**, anche se chiudi il programma.
4. Per spegnerlo rifai lo stesso clic: torna «No».

Nel programma Windows vale solo il pannello. Nella versione web (zip Cloudflare) funziona anche l'indirizzo:
`…/?formato=fiera` lo accende per quella pagina e `…/?formato=classico` lo spegne. Nella sfida tra due computer decide
l'host.

**«Nuovo giocatore»** non si accende: c'è sempre, in tre posti.
- Nella schermata di fine partita, il pulsante rosa grande.
- Nel risultato dei minigiochi, accanto a «Riprova ›».
- Nel pannello dello stand (Ctrl + Maiusc + K), in basso accanto a «Chiudi».

## Unioni (in ordine, prima il motore)

| # | ramo | head del ramo | commit d'unione | conflitti |
|---|---|---|---|---|
| 1 | R2 `worktree-wf_e0bf5d13-3d1-2`: energia, risposta al servizio, servizio dal gesto, tagliato, ritardo, difesa CPU | `6601c29` | `5de2b0a` | nessuno |
| 2 | R3 `worktree-wf_e0bf5d13-3d1-3`: scritte dell'esito, istruzioni del servizio, minigiochi per principianti, misure | `db7808b` | `1949c61` | `game_engine.js` |
| 3 | R1 `worktree-wf_e0bf5d13-3d1-1`: fine partita con i nomi, «0» e «Parità», P2 a 9,8 m/s, «Nuovo giocatore» | `8c6c160` | `86102f0` | nessuno |
| — | correzione dell'unione (R1 + R3) | — | `de2d717` | — |
| 4 | R4 `worktree-wf_e0bf5d13-3d1-4`: formato in fiera, servizio della CPU con la velocità vera | `a716f02` | `2d391f6` | `natpf_point_call.js`, `diag/diag_recorder.js` |

### Conflitti e come sono stati risolti

In tutti e tre i casi sono state tenute tutte e due le versioni.

- **`natpf-tennis/src/game_engine.js`, `startNewMatch` (R2 + R3).** R2 azzera l'energia (`NS.resetFatigue`, D6) e il
  servizio abituale (`natpfServeRef = null`, D12). R3 conta le partite (`natpfMatchSeq`) per le istruzioni del primo
  servizio. Le tre righe stanno insieme.
- **`natpf-tennis/src/natpf/natpf_point_call.js` (R1 + R4).**
  - Resta la `z` di R1, a livello del modulo, che scrive «0» al posto di «00».
  - `viewScore` riceve il `deciding` di R4.
  - Nel banner del punto nello stesso schermo l'ordine è questo: con il formato in fiera a 40-40 «Punto decisivo»
    (R4); poi «Vantaggio Nome»; poi «Parità» a 40-40 (R1); altrimenti «Marco 0 · Giulia 15» (R1).
  - Lo provano i test dei due rami: `natpf-fine-partita` («0», «Parità») e `natpf-formato-fiera` («Punto decisivo»
    anche con i nomi).
- **`natpf-tennis/src/natpf/diag/diag_recorder.js`, riga «partita» (R3 + R4).** Ci sono sia `ruolo` (R3, per contare le
  palle giuste sul computer del P2) sia `formatoFiera` e `gameDaVincere` (R4).

Le unioni automatiche toccano file in comune:
- `game_engine.js`: tutti e quattro i rami;
- `natpf_phone_racket.js`: R2, R3 e R1;
- `index.html` e `natpf-ui.css`: R3, R1 e R4;
- `natpf_kiosk.js` e `natpf_lobby.js`: R1 e R4;
- `natpf_training.js`: R2 e R3;
- `natpf_events.js`: R3 e R1.

Ho riletto i punti dove i rami si toccano:
- **R2 e R4 sul servizio della CPU.** R4 cambia solo la velocità mostrata e gli effetti; `isPowerShot` resta com'era e la
  regola «strong» di R2 vale ancora.
- **R3 e R2 su «Troppo tardi».** R3 lo usa per il colpo a vuoto in ritardo. R2 toglie il «Troppo tardi» falso dovuto al
  ritardo della rete. Le due cose sono coerenti.
- **Pannello dello stand.** Ci sono sia il riquadro «Formato in fiera» (R4) sia il pulsante «Nuovo giocatore» (R1). Lo
  provano le prove nel browser di tutti e due.
- **Fine partita e formato in fiera.** La schermata di R1 compare anche nelle partite con il formato in fiera (prova
  `natpf-formato-fiera`, schermata `formato-fiera-singolo-fine.png`: «Hai vinto!», righe «Tu 1 / CPU 0», «Nuovo
  giocatore»).

### Correzione dovuta all'unione (`de2d717`)

R3 tiene i colpi speciali imparati, che servono alle catene della Combo, e li toglie quando il nickname cambia. Lo fa però
solo se prima c'era un nome (`set nickname` in `natpf_events.js`). «Nuovo giocatore» di R1 azzera il nickname: se il
visitatore di prima era un **ospite** senza nome che aveva imparato pallonetto e palla corta, chi arrivava dopo li
ereditava, e nella Combo gli comparivano colpi che non aveva mai fatto. Era il difetto che R3 voleva evitare.

Correzione: `resetVisitor` (`natpf_new_player.js`) chiama anche `events.forgetLearned()`. Il test nuovo è in
`natpf-tennis/test/natpf-nuovo-giocatore.test.mjs` («unione B18.1: …colpi speciali imparati da un ospite…»): senza la
correzione fallisce, con la correzione passa.

## Verifiche (sull'unione finale)

| verifica | risultato |
|---|---|
| test del gioco dopo l'unione 1 (R2) | 1012 superati, 1 saltato (su 1013) |
| test del gioco dopo l'unione 2 (R3) | 1035 superati, 1 saltato (su 1036) |
| test del gioco dopo l'unione 3 (R1) | 1053 superati, 1 saltato (su 1054) |
| test del gioco dopo l'unione 4 (R4), con la correzione | 1074 superati, 1 saltato (su 1075) |
| test del gioco finale (`npm ci && npm test`, con le dipendenze di `tools/lan` installate) | **1075/1075**, 0 saltati |
| sito (`node --test tools/test/*.test.mjs`) | 201/201 |
| server LAN (`tools/lan`) | 12/12 |
| programma Windows (`natpf-desktop`, `npm test`) | 28/28 |
| `npm run build` | ok |
| `npm run audit:legend` | 69/69, «Tutti i criteri rispettati» |
| test B16 della Leggenda (`natpf-legend-b16.test.mjs`) | 5/5 |

Il test saltato nelle prime quattro prove è «avvio LAN» (`# SKIP npm ci in tools/lan`): mancavano le dipendenze di
`tools/lan`, installate dopo per la prova del server LAN. Nella prova finale passa anche quello.

**Leggenda dopo l'unione** (`audit:legend`, stessi 8 semi fissi), percentuale di game vinti dalla CPU:
- contro «medio» 97%;
- contro «amatore» 99,3%;
- contro «tennista» 90,6%;
- contro «preciso» 70,3%;
- contro «bambino» e «impreciso» 99,8%.

Pro contro «medio»: il giocatore vince l'80,8% dei game. Casual contro «medio»: 100%. Velocità massima della CPU 8,6 m/s
e reazione p10 0,125 s. Sono le stesse cifre che R2 dava dopo la sua revisione: gli altri tre rami non spostano la CPU.

**Prove nel browser** (Chromium, `CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/<nome>.mjs`, una alla volta),
tutte superate al primo giro:

| prova | verifiche | | prova | verifiche |
|---|---|---|---|---|
| natpf-tabellone | 42/42 | | natpf-phone-keep | 13/13 |
| natpf-tutorial-phone | 52/52 | | natpf-leggenda | 7/7 |
| natpf-split-ready | 34/34 | | natpf-nuovo-giocatore (R1) | 28/28 |
| natpf-scritte-2v2 | 73/73 | | natpf-formato-fiera (R4) | 21/21 |
| natpf-menu | 28/28 | | natpf-formato-fiera-p2p (R4) | 9/9 |
| natpf-training-flow | 22/22 | | natpf-servizio-lancio (R3) | 12/12 |
| natpf-rally | 8/8 | | natpf-minigiochi-principianti (R3) | 10/10 |
| natpf-gesti-speciali | 9/9 | | natpf-gameplay-23-10 (toccata da R3) | 11/11 |
| natpf-tutorial-relink | 9/9 | | natpf-latency (R2) | 9/9 |
| natpf-1v1-p2p | 39/39 | | natpf-modale-gesti | 18/18 |

Ho guardato tre schermate:
- pannello dello stand con «Formato in fiera» acceso e «Nuovo giocatore»;
- fine partita a 1 game con il formato in fiera;
- stesso schermo a 40-40 con «Punto decisivo» e i nomi.

## Misure dopo l'unione

Ho rifatto i banchi dei rami sull'albero unito (da `natpf-tennis/`, con
`node --import ./test/register.mjs scripts/audit/<nome>.mjs`).

- **`visitatori.mjs` (R1).** I numeri sono identici a quelli del ramo:
  - bambino dopo adulto: forza letta nei primi 3 colpi 0,12 → 0,30 (riferimento 0,31), gesti non letti 27 → 0 su 120;
  - adulto dopo bambino: forza 0,65 → 0,45 (riferimento 0,45), colpi di tipo diverso 62 → 8 su 120.
- **`scritte-esito.mjs` (R3).** Computer e telefono dicono cose diverse **0%** dopo, in tutti gli 8 casi; prima
  0,8–19,5%. «Punto avversario» falso: 0,1–7,8% → **0%**. Tutti i fuori e in rete hanno il perché.
  - P2 nello stesso schermo: metà dello schermo e telefono diversi 16,0% → **0,0%** (537 colpi).
  - Le quote del «prima» e il numero di fuori sono più bassi della prima tabella di R3. Era già così nel ramo dopo la
    revisione (il «Fuori» vero).
- **`fuori-vero.mjs` (R3).** Le «Fuori» con la palla poi dentro sono **0** in tutti gli 8 casi, contro 9–170 prima.
  Esempio: Pro · umano, 262 «Fuori» di cui 170 dentro → 92 «Fuori» di cui 0 dentro.
- **`precision-combo.mjs` (R3).** I numeri sono identici al ramo:
  - Precision, totale p50: tennista 514 → 636, amatore 338 → 407, bambino 156 → 197;
  - Combo, punti p50: principiante 120 → 680, medio 140 → 1090; partite a zero 42% → 0%.
- **`letture-gesti.mjs` (R2).** «std: 796/796 ok».
- **`formato-fiera.mjs` (R4)**, `--points=400 --seeds=7,11,23,31,47`, partita a 1 game. Il p90 è in secondi, classico →
  fiera, sull'albero unito:

| livello | bambino | amatore | tennista |
|---|---|---|---|
| Casual | 143 → 96 | 93 → 88 | 50 → 46 |
| Pro | 96 → 81 | 174 → 133 | 75 → 72 |
| Leggenda | 65 → 59 | 101 → 105 | 167 → 141 |

  Col formato in fiera la CPU batte il 46–50% dei punti; con il formato classico a 1 game lo 0%. I numeri sono un po'
  diversi da quelli di R4 da solo, perché ora ci sono le correzioni del motore di R2 (energia tra i punti, difesa a Pro,
  servizio). La direzione è la stessa. Solo la Leggenda contro «amatore» ha il p90 un po' più alto (101 → 105), mentre il
  massimo scende da 142 a 135.

  `gesto-rimbalzo.mjs` (R3) non è un banco simulato: legge pacchetti di diagnostica registrati con persone vere, quindi
  qui non l'ho lanciato. Senza argomenti stampa l'uso.

## Decisione da confermare con l'utente: ritocchi di bilanciamento di R2

R2 cambia due valori della CPU, che il rapporto B16 assegna alla tappa 2:
- Pro `cpuErr.rally` da 0,012 a 0,009 (`natpf_skill.js`);
- Leggenda `accel`/`decel` da 20/28 a 22/30 m/s² (`natpf_legend.js`), con la velocità massima invariata.

Servono a tenere Pro e Leggenda come prima dopo le correzioni D6 (energia), D9 (difesa a Pro) e D12 (servizio). Senza i
ritocchi `audit:legend` dava 68/69, con Pro contro «medio» all'89,7% oltre il limite dell'85%. Dopo l'unione dei quattro
rami, con i ritocchi:
- `audit:legend` dà 69/69 (Pro contro «medio» 80,8%);
- i test B16 della Leggenda sono 5/5.

Li ho **tenuti nell'unione**, ma vanno confermati dall'utente prima di portarli in `natpf-simulator`. Se l'utente non li
vuole:
- si tolgono le due righe;
- bisogna rivedere D6, D9 e D12, perché senza i ritocchi la soglia di Pro non passa.

## Cosa resta

- **Conferma dei ritocchi di bilanciamento di R2** (sezione sopra).
- **Non verificato con il telefono vero e con persone vere.** Valgono le stesse riserve dei quattro documenti dei rami:
  - soglie di tagliato, palla corta e servizio;
  - schiacciata voluta in risposta;
  - istruzioni del lancio;
  - minigiochi per principianti;
  - le due misure da raccogliere con `misure-con-persone.md`.
- **Non provato** su Windows, sul PC dell'evento e sul ledwall. L'unione non ha rifatto installer né zip: i pacchetti e i
  file di versione si fanno quando l'unione entra in `natpf-simulator`.
- **Audio.** Non c'è nessuna voce nuova. Il punto decisivo usa «Match Point» o «Game Point», perché non c'è una clip
  «deciding point».
- **Minore notato nelle schermate, non corretto.** A 1280×720, quando si accende il formato in fiera nel pannello dello
  stand, l'avviso in basso copre per qualche secondo la metà inferiore dei pulsanti «Nuovo giocatore» e «Chiudi». Era
  già così con «Chiudi» in R4 da solo. È un avviso temporaneo: i pulsanti tornano liberi quando sparisce.
- **Non fatto (facoltativo, da R4).** La prova con il telefono simulato completo per il servizio del P2 nello stesso
  schermo con il formato in fiera.
- **Tappa 2** (livelli Evento e Bambini, CPU) da fare dopo. Per ogni cosa da accendere bisogna dire all'utente il
  percorso esatto, come chiesto nella decisione (4).

## Revisione dell'insieme (10/11)

Revisore indipendente sul codice unito (`174e637`), solo in lettura: ha rifatto test del gioco 1075/1075, sito 201/201,
build, `audit:legend` (stesse cifre di questo documento) e 8 prove nel browser con gli stessi numeri, e ha **giocato** una
partita nello stesso schermo con il formato in fiera acceso (Marco/Giulia, 1 game, fino al 40-40): battitore A B B A A B B,
pallina del tabellone giusta anche nella copia del P2, «Punto decisivo» nei due tabelloni e nel banner, «0» e non «00»,
fine partita «Vince Marco!» con la voce, «Nuovo giocatore» che rimette «Player 1»/«Player 2» e lascia salvato il formato.
**Nessun bloccante.** Tre minori:
1. *Istruzioni del servizio nello stesso schermo*: un solo conto dei servizi per i due giocatori. Nel formato classico il P2,
   che batte nel secondo game, non vedeva mai le istruzioni piene del primo servizio. **Corretto**: un conto per chi serve
   (`servedBy`, `natpf_serve_coach.js`), test nuovo in `natpf-servizio-istruzioni.test.mjs` (fallisce senza la correzione).
2. *Reset del chiosco* (stand libero dopo l'inattività): toglieva il nome ma non i colpi speciali imparati né i record di
   «Ospite» di un ospite senza nome (stessa fuga corretta nell'unione per «Nuovo giocatore»). **Corretto**:
   `NatpfKiosk.reset()` chiama `forgetGuest` e `forgetLearned`; test nuovo in `natpf-nuovo-giocatore.test.mjs` (fallisce
   senza la correzione).
3. *«Fuori» invece di «In rete»* se una palla finisse in rete per la sola fisica senza il segno del motore: `landingOf` usa
   `predictBall`, che non vede la rete. Misurato dal revisore: 0 casi su 14.253 colpi dal telefono simulato (casual e pro, 4
   profili, 3 semi). **Non corretto** (non succede con il telefono); da guardare se si usano tastiera di prova o webcam.
