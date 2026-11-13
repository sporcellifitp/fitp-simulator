# B36 · Piano tecnico «prima la sicurezza»: direzione al centro del gioco, campo aperto, stile arcade

**Base.**
- `natpf-simulator` a7cd5f9, versione 2026-11-13.8.
- B35a è **già unito**: c22b6e8, versione 6159b7e [V `git log`].
- B35b non è ancora unito: worktree `b35-collaudo` a d2a0aad [V `git worktree list`].
- Le righe dei file sono verificate su a7cd5f9.

**Segni.**
- [V] verificato da me nel codice o con uno script.
- [L] preso dalle letture, con il loro riferimento.
- [D] dedotto.

**Prove numeriche.** Sola lettura; gli script importano i moduli veri. Cartella: `/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/b36/agenti/sicurezza/`.
- `b36-1-prova.mjs`: replica della parte laterale di `strokeOutcome`. Controllata sul codice vero: scarto massimo 5·10⁻⁴ m su 4000 casi a Casual, Pro e Leggenda.
- `b36-1b-senzarampa.mjs`, `b36-2-follow.mjs`, `b36-4-insidein.mjs`.
- `b36-3-profondita.mjs`: replica della profondità (8,357 m contro 8,356 m del codice).

**Condizioni delle prove.**
- Parametri di Pro, salvo dove detto.
- Palla a 18 m/s.
- Si misura il bersaglio del motore, non il rimbalzo vero.
- Ritmo 0, qualità 1.
- Da 2000 a 3000 colpi per ogni direzione voluta.
- Fasce del banco B35a: 1,25 m dal centro.

Misurano la regola, non il telefono. Non ho lanciato test, build, audit né prove nel browser.

## 0. Cosa non si rompe e cosa ne segue

**Regola del piano.**
- Un solo interruttore. Spento, il gioco è identico bit per bit, e un test lo dimostra.
- Si accende un livello alla volta.
- Ogni tappa ha misure prima e dopo con gli stessi semi.
- Per tornare indietro: opzione «classica» nel pannello dello stand (senza ricostruire), oppure revert della sola tappa.

**Fatti che decidono la forma del piano.**

1. **[V] Webcam, mouse, tastiera e telefoni vecchi restano fuori da B36.**
   - Questi controlli, e i telefoni senza forma, arrivano all'esito con l'intenzione ricostruita (`derived: true`, natpf_stroke_outcome.js:506-516).
   - B36 vale solo per `!intent.derived`, quindi questi controlli restano identici.
   - Con il tempo che pesa meno, mouse e webcam «argon» perderebbero il lungolinea: oggi lo ottengono solo con il ritardo [L gioco §6].

2. **[V] I due criteri d'equilibrio più citati non vedono B36.**
   - I profili `medio`, `preciso` e `impreciso` mandano `dirX` senza intenzione (scripts/audit/rally-balance.mjs:129-133): per il gioco sono intenti ricostruiti.
   - Quindi «Pro contro medio 70–85 %» e «Casual contro medio ≥ 95 %» (legend.mjs:164-168) non cambiano con B36.
   - B36 lo misurano solo i profili con il telefono: `tennista`, `amatore`, `bambino`, `umano` (rally-balance.mjs:25-31).
   - Tra questi ci sono i due criteri con meno margine [L vincoli]:
     - Leggenda contro «tennista»: ≥ 85 %, oggi 86,6 %;
     - errori della CPU contro «amatore»: 2–6 %, oggi 2,2 %.
   - Nessuno di questi profili gioca a Pro né a Leggenda prima di B36.5. Quindi l'uscita di `audit:legend` deve restare **identica fino a B36.4**: è un criterio di chiusura che si controlla subito.

3. **[V] I livelli non hanno `name`.**
   - Con node: `skillLevel(k).name` è `undefined` per tutti i livelli.
   - `assistOf` sceglie la riga in base a `cpuLegend` e `assistWindow` (:219). Bambini (0,34) ed Evento (0,3) prendono la riga di casual.
   - La tabella B36 va quindi indicizzata con `matchConfig.difficulty`, con righe proprie per bambini ed evento.

4. **[V] Agganci già pronti.**
   - Peso del tempo per livello: `finite(AS.timingAim, O.timingAim)` (:355), oggi mai usato.
   - Interruttore per prove e banchi: `netPlayRules.off` (natpf_net_play.js:20-23). Lo usano il banco `rete.mjs --senza-b31` (:147-148) e il test b25 (:679-685).
   - Opzione dello staff salvata: «Mira del telefono» (natpf_aim_level.js; natpf_kiosk.js:134, 186).
   - Correzione dell'aria:
     - `fixAir` corregge solo la componente lungo il campo (natpf_skill.js:866, :883);
     - `fixAirServe` corregge anche quella laterale (:903-919).

5. **[V] Il lavoro di B35a resta com'è.**
   - `te`, `rRest` e `lag` (:322-328).
   - `aimT = clamp(te − rRest, ±1)` (:354).
   - Spinta fuori `−c·sign(te)·E·pushOut` (:356).
   - Il campo `ritardoAbitualeMs` nella diagnostica (diag_recorder.js:264).

6. **[L vincoli] Vincoli che valgono in ogni tappa.**
   - L'esito resta senza caso.
   - P1 e P2, destro e mancino restano a specchio.
   - La direzione non dipende da dove il movimento automatico mette il corpo.
   - «Il livello cambia la precisione chiesta, non dove va la palla» (:184-188) [V].
   - Escono solo i colpi estremi.
   - Palla corta, volée, gioco a rete (B31), servizio e schiacciata restano invariati.
   - LAN: i campi nuovi sono facoltativi e i messaggi restano sotto i 16 300 byte.
   - Registro: ogni campo nuovo va in due copie, e l'utente deve ricaricare il Worker.
   - Il tutorial mostra quello che il gioco riconosce davvero.
   - Nessuna voce nuova.

7. **[V] Lavori già in coda (docs/TRACCIA_PASSI.md:507-529).**
   - B37 tocca le scritte e il momento del fuori, il motore e l'anello del tempo.
   - B38 e B39 toccano l'interfaccia.
   - Il codice di gioco di B36 parte dopo che B35b e B37 sono uniti. Solo B36.0 (strumenti) può girare accanto a B38 e B39.

**Riferimenti dai video.**
- **Video 1** (gioco di tennis commerciale) [L `scratchpad/b36/video1/analisi-video1.md`]:
  - palle profonde e larghe, a 1–2 m dalle righe;
  - incrociati e lungolinea alternati: il punto si vince con la direzione;
  - nessuna palla corta e nessuna volée;
  - a schermo: una X a terra dove rimbalzerà la palla in arrivo, e un piccolo segnale del tempo accanto a chi colpisce;
  - nessun mirino durante lo scambio.
  - [V] L'ho controllato anche nel foglio `fogli/sheet_02.jpg`.
- **Video 2**: visto solo nelle miniature [L].

## 1. Obiettivi misurabili

**Strumento.** `scripts/audit/direzione-telefono.mjs`, esteso come al §7:
- telefono simulato, semi 1,2 e 3,4;
- destro e mancino, dritto e rovescio, 5 calibrazioni;
- **3 posizioni della palla all'impatto**: 0,6 m, +3 m e −3 m. Oggi ce n'è una sola, 0,6 m (:98-108) [V];
- rumore del tempo della «persona» **in millisecondi**. Oggi è in finestre (:55) [V], per questo Casual e 1v1 danno gli stessi numeri di Pro (precisione-telefono.md §6.8) [V].

**Zone.** Si misurano dal punto di vista di chi colpisce.
- «Diagonale» vuol dire la metà del campo opposta a quella della palla, se la palla è ad almeno 1 m dal centro. Altrimenti è il lato opposto al colpo.
- Oggi incrociato e lungolinea si decidono dal lato del colpo (direzione-telefono.mjs:124-125; natpf_stroke_outcome.js:373). Per questo il dritto lungolinea dall'angolo del rovescio («inside-in») viene trattato come un incrociato (§2.2).

| Zona | Dove | Laterale | Profondità |
|---|---|---|---|
| Z1 incrociato profondo | diagonale | 1,4–3,9 m | ≥ 9 m |
| Z2 angolo corto | diagonale | ≥ 2,6 m | 4,5–7 m |
| Z3 lungolinea | stessa metà della palla | 1,4–3,9 m | ≥ 8 m |
| Z4 inside-out | dritto dalla metà del rovescio (palla ad almeno 1,5 m da quella parte) verso la diagonale | – | ≥ 8,5 m |
| Z5 centro profondo | – | ≤ 1,2 m | ≥ 9,5 m |

**Criteri.** Bambino = livello bambini, Ragazzo = casual, Adulto = evento.

Definizioni usate in tabella:
- **giusti**: colpi che finiscono nella zona voluta;
- **gesto buono**: direzione voluta ±12°, piatto ±5°, tempo ±0,25 finestre;
- **colpo alla riga**: piatto girato di 16° e tempo spostato di 0,4 finestre verso la riga.

| Criterio | Bambino · Ragazzo · Adulto | Pro, 1v1 | Leggenda | Oggi |
|---|---|---|---|---|
| Giusti con il gesto buono, dalle 3 posizioni | ≥ 80 % | ≥ 80 % | ≥ 78 % | 73 % e 71 % dal centro (doc B35a §6.1) [V]; replica: 74 % al centro, 72 % e 62 % dagli angoli [V] |
| Giusti con il giro insegnato, ±18° | ≥ 90 % | ≥ 90 % | ≥ 88 % | – |
| Incrociato voluto che va lungolinea, o il contrario (gesto buono) | 0 % | ≤ 1 % | ≤ 1 % | 0 % e 0–2 % [V doc] |
| Fuori con il gesto buono, da fermo e in corsa | 0 % | 0 % | 0 % da fermo, ≤ 20 % in corsa | 0 %; Leggenda in corsa 19 % e 22 % [V doc §6.7] |
| Fuori con il colpo alla riga, gesto buono | 0 % | ≤ 3 % | 10–25 % in corsa | Pro 0 %; Leggenda in corsa 38 % [L], replica 37,7 % [V] |
| Persona vera: giusti / fuori | ≥ 58 % / non più di oggi | ≥ 57 % / oggi + 1 punto al massimo | ≥ 52 % / oggi + 3 punti al massimo | giusti 49 % e 52 % [V doc]; fuori 2,2 % a Pro [V replica] |
| Stesso gesto ripetuto (tremolio 2°, ±10 ms): deviazione standard laterale | ≤ 0,5 m | ≤ 0,5 m | ≤ 0,5 m | non misurata |
| Gesto buono: deviazione standard laterale | ≤ 0,9 m | ≤ 0,9 m | ≤ 0,9 m | 0,85–1,08 m [L]; replica 1,19–1,32 m [V] |
| Serie di 14 colpi uguali: quanti finiscono nella zona voluta | ≥ 13 su 14 | ≥ 13 su 14 | ≥ 13 su 14 | 12 e 13 su 14 [V doc §6.6] |
| Mira di 15° tenuta per 30 colpi: spostamento della mediana tra i colpi 3–7 e 26–30 | ≤ 1,0 m | ≤ 1,0 m | ≤ 1,0 m | la mira scende da 0,86 a 0,23, circa 2,3 m [L, D] |
| Z1, Z3 e Z5 raggiunte da ogni posizione | ≥ 70 % | ≥ 70 % | ≥ 70 % | Z1 irraggiungibile oltre 2,6–3,1 m di lato con profondità > 10 m [L] |
| Z4 raggiunta | ≥ 60 % | ≥ 60 % | ≥ 60 % | – |
| Z2 con il gesto scelto / senza | ≥ 50 % / ≤ 10 % | come a sinistra | come a sinistra | oggi l'angolo corto non si sceglie [L] |
| Metri per grado: rapporto tra il massimo e il minimo delle 3 posizioni | ≤ 1,25 | ≤ 1,25 | ≤ 1,25 | 0,347 / 0,175 = 1,98 [V] |
| Forza 0,3 / 0,5 / 0,8: distanza tra le profondità mediane, in ogni direzione | ≥ 1,0 m | ≥ 1,0 m | ≥ 1,0 m | incrociato largo: 6,93 / 7,41 / 8,03 m [V] |
| Precisione chiesta: di quanto sposta la palla un anticipo di 40 ms | 0,17 m (Bambino) / 0,24 m (Ragazzo) / 0,29 m (Adulto) | 0,31 m | 0,41 m | 0,48 / 0,67 / 0,84 / 0,90 / 1,17 m [D: circa 3,4 m per unità × 40 ms / finestra] |

**Equilibrio.** I criteri restano quelli di oggi; per B36 contano i profili del telefono.
- `audit:legend` con 40 semi.
- A Pro e 1v1, contro «tennista», «amatore» e «umano»: percentuale di game entro ±5 punti dalla base.
- `audit:evento`: l'adulto fa 60–70 punti e il valore k (con cui Evento si regola da solo) si ferma sotto 0,95.
- `cpu-pressione --obiettivi`.
- b25: aiuto al più giovane tra il 38 e il 42 %, mai sopra il 50 %.
- `audit:rete`: la quota di volée resta entro ±2 punti.

**Telefono vero.** Prima di accendere B36 di base serve una sessione registrata (protocollo B35a, `diag.mjs direzione`). Obiettivo: almeno il 65 % di giusti con il livello Adulto. Senza sessione si scrive «non verificato».

## 2. Il modello

### 2.1 Direzione laterale

Vale solo se `dir = dirParams(difficulty, intent) ≠ null`, cioè con un telefono con la forma e il livello acceso. Altrimenti restano le righe :355-358 di oggi.

```
c    = ±1 lato del colpo (game_engine.js:2330-2331); f = intent.face (natpf_stroke_intent.js:196-201, invariato)
u    = clamp(te − rRest, −1, 1);  E = max(0, |te| − 1)                 (B35a: :327-328, :354, invariati)
aimV = f·1 − c·wT·u        wT = 0,35, spinta naturale 0       (oggi: −c·0,1·(1−|u|) − c·u + f, :355)
x0   = clamp(hitX, ±xMax)·φ        φ = 0 da B36.2              (oggi 0,4: :45, :285)
xv   = landingFromAim(aimV, x0, xMax), xMax 3,65               (:287)
B36.1–B36.4: tenuta e spinta di oggi
   raw = xv − c·sgn(te)·E·pushOut(liv);  xa = raw + (sgn·softEdge(|raw|; 3,1; 4,0) − raw)·assist    (:338, :356-357)
B36.5: tenuta solo dalla qualità e solo sulla parte voluta; fuori dalla finestra deriva continua
   h = clamp((q − assistQ)/0,1 + 0,5);  xh = xv + (sgn·softEdge(|xv|; 3,1; 4,0) − xv)·h;  xa = xh − c·sgn(te)·E·P(liv)
x    = come oggi oltre la riga (tetto 1,9 m, :358)
lancio (B36.2): velocità laterale corretta per l'aria come fixAirServe → rimbalzo vero = x ± 0,05 m
```

**Perché così.** Numeri della replica a Pro [V].
- **Il piatto decide, il tempo ritocca.** Gesto buono dal centro:
  - giusti da 74 a 82 %;
  - centro voluto da 71 a 88 %;
  - deviazione standard del colpo al centro da 1,19 a 0,80 m.
- **Persona vera:** giusti da 49 a 57 %, fuori da 2,2 a 0,9 %.
- **Piatto e tempo opposti non si annullano più.** Con piatto +1 e anticipo pieno la palla va a 0,24 m oggi e a 2,46 m con B36.
- **wT 0,25 dà gli stessi numeri** (82 %). Tengo 0,35 perché il tempo si deve ancora sentire.
- **Il prezzo:** chi mira con il solo tempo, come insegnano oggi tutorial e allenamento, scende da 63 a 38 % di giusti. Per questo i testi cambiano nella stessa tappa (B36.1).
- **Niente rampa oltre la finestra.**
  - Ho provato una rampa che riporta il peso del tempo a 1 entro 0,25 unità oltre la finestra. Oltre quel punto l'esito resta identico a oggi (scarto 0 [V]).
  - Però crea una «scogliera» nuova: il colpo neutro passa da 1,43 a 3,88 m in 0,25 unità.
  - Senza rampa il colpo neutro scorre liscio: 1,43 m a E = 0, 2,15 m a E = 0,8.
  - Il colpo mirato alla riga e sbagliato di tempo esce ancora. Ma il salto si dimezza: oggi va da 4,00 a 6,01 m in 0,25 unità, senza rampa da 3,96 a 5,07 m.
  - Fuori della persona vera a Pro: 0,9 % senza rampa, 1,6 % con la rampa.
- **φ = 0: la stessa mappa da ogni punto del campo.**
  - Dagli angoli i giusti passano da 72 % e 71 % (φ 0,4) a 82 % e 82 %.
  - Il piatto vale 0,261 m per grado da ogni posizione; oggi 0,175 o 0,347 a seconda del lato.
  - Con φ 0,2 i giusti sono 82 % e 81 %, ma il rapporto di sensibilità resta 1,39 [D].
  - [D] Allo stand chi gioca resta fermo davanti allo schermo e mira «al campo che vede».
- **Conta più il giro insegnato che la sensibilità.**
  - Se il giro voluto è ±16° invece di ±12°: 92 % con il gesto buono, 63 % con la persona vera.
  - La mira piena a 20° o 23° cambia poco: 79 % e 76 % con ±12°.
  - Quindi l'opzione dello staff resta com'è, e il tutorial insegna un giro di circa 20°. Le pose usano già 22° (natpf_gesture_motion.js:111-114).

### 2.2 Profondità, altezza, potenza, tipo di colpo

**Profondità (B36.4).**
- Restano come oggi:
  - `want = forza·(0,8 + 0,2·ampiezza)` (natpf_stroke_intent.js:229);
  - la curva 0,7 e gli intervalli per tipo (:54-55, :363-364);
  - la diagonale (:369), il top spin carico, la tenuta sul fondo (:374).
- Cambia l'accorciamento automatico dell'incrociato largo (:373). Oggi scatta oltre 3,2 m e si decide dal **lato del colpo**.
  - [V] Il dritto lungolinea dall'angolo del rovescio (x −3,74) cade a 8,06 m con forza 0,5 e a 8,82 m con forza 0,8.
  - Lo stesso lungolinea dal lato del dritto (x 3,39) cade a 9,46 e 10,73 m.
- Regola nuova:

```
angoloCorto = diagonale per geometria ∧ |aimV| ≥ 0,75 ∧ (rise − riseRef) ≥ 0,3 ∧ forza ≤ 0,6
d ← angoloCorto ? 5,5 + (d − 5,5)·0,2 : d        (niente accorciamento automatico)
```

- [V] Effetto sull'incrociato a x −3,9 m, con forza 0,3 / 0,5 / 0,8 / 1:
  - oggi: 6,93 / 7,41 / 8,03 / 8,40 m;
  - senza accorciamento automatico: 7,97 / 8,97 / 10,27 / 11,05 m.

**Restano invariati:**
- altezza sulla rete ed effetto, che dipendono da tipo, forza e salita (:376-378);
- volo (game_engine.js:2370-2392);
- colpo super (:447-472);
- tipo di colpo, letto dalla forma (`classifyStroke`).

[D] La varietà nasce dalla combinazione di quattro cose, senza tipi nuovi:
- piatto → lato;
- forza → profondità;
- forma → arco ed effetto: top spin alto e carico, piatto teso, tagliato basso e corto;
- angolo corto come scelta.

Palla corta e volée restano con le loro regole, fuori dalla mappa nuova.

### 2.3 Dispersione

- **Nessun termine casuale nuovo.** L'unica dispersione con un seme resta quella dei colpi a rete (:155-165, :356), che è fuori da B36.
- La dispersione che resta dipende solo da misure del gesto:
  1. rumore del piatto: 0,26 m per grado [V];
  2. rumore del tempo per wT: circa 1,2 m per unità, contro circa 3,4 m di oggi [D];
  3. qualità della situazione (corsa, allungo, palla veloce), attraverso la tenuta h. Per esempio, a Leggenda in corsa la palla mirata alla riga può uscire: deterministico, con la causa scritta.
- [D] Niente dispersione «in corsa» basata su un seme: a chi gioca sembrerebbe caso (lettura telefono §4.12).

### 2.4 Centratura: cosa la toglie

| Causa | Rimedio | Tappa |
|---|---|---|
| Spinta naturale −0,1 (:24): −0,36 m a ogni colpo neutro | spinta 0 | B36.1 |
| Tempo con lo stesso peso del piatto; l'anello del momento giusto insegna il tempo neutro, cioè il centro [L A10] | wT 0,35 | B36.1 |
| Punto neutro che segue la palla al 40 % (:45) | φ 0 | B36.2 |
| Aria non corretta di lato: il rimbalzo vero copre solo l'85–88 % dello spostamento [L] | correzione laterale | B36.2 |
| Centro della mira che assorbe le mire tenute | riferimenti fermi | B36.3 |
| Incrociato largo sempre accorciato verso 6 m | solo se scelto | B36.4 |

### 2.5 Righe: premiare la precisione senza fuori a caso

**Fino a B36.4 i fuori seguono la regola di oggi:** dentro la finestra e con la qualità del livello la palla resta in campo; oltre la finestra c'è la spinta (:356).

**B36.5 rende i fuori continui e spiegabili.**
- La tenuta (bordo morbido tra 3,1 e 4,0 m) vale sempre sulla parte voluta e dipende solo dalla qualità. Non sparisce più in 0,25 unità di eccesso (:338): oggi è quella la scogliera, da 4,00 a 6,01 m in 15 ms [L].
- Fuori dalla finestra la palla deriva di P(liv)·E nel verso del tempo.
- Risultato:
  - con un gesto pulito non esce nessuna palla, a Bambino, Ragazzo, Adulto e Pro;
  - esce il colpo mirato vicino alla riga e sbagliato di tempo nello stesso verso. Il rischio è «mira vicino alla riga × errore di tempo», come nei giochi con la levetta [L riferimenti §4].
- Scritte (natpf_shot_feedback.js:43-66):
  - «Fuori · troppo angolato» se |xh| ≥ 3,3 m ed E ≤ 0,3;
  - altrimenti «Fuori · in ritardo» o «Fuori · in anticipo».

**Taratura di P(liv).**
- Regola: i fuori dei profili con il telefono restano entro ±2 punti dalla base di B36.4, a ogni livello.
- Valori di partenza: il doppio del pushOut di oggi, cioè Casual 1,6, Pro 1,8, Leggenda 2,7 (:193-216).
- [D] Con P 1,8 a Pro il colpo alla riga esce circa 16 ms oltre la finestra in ritardo. Il colpo neutro esce solo con errori di tempo molto grandi.

**Leggenda.** Resta la soglia di qualità 0,8 (:215).
- [V replica] B36.1 abbassa i fuori in corsa:
  - colpo alla riga: da 37,7 % a 9,0 %;
  - persona vera: da 19,9–34,5 % a 6,5–16,7 %.
- La Leggenda diventerebbe più facile. Per questo si accende per ultima (B36.6), con la sua taratura.

### 2.6 Parametri per livello

La chiave è `matchConfig.difficulty`. Finestre, `failQ`, `assistQ` e `lateMargin` restano quelli di oggi.

| Livello | Acceso in | wT | Spinta naturale | φ | Aria laterale | Accorciamento dell'incrociato | Tenuta (`assistQ`) | P (B36.5, partenza) |
|---|---|---|---|---|---|---|---|---|
| bambini | B36.1 | 0,35 | 0 | 0 | sì | solo se scelto | 0,5 | 1,6 |
| casual (Ragazzo) | B36.1 | 0,35 | 0 | 0 | sì | solo se scelto | 0,5 | 1,6 |
| evento (Adulto) | B36.1 | 0,35 | 0 | 0 | sì | solo se scelto | 0,5 | 1,6 |
| 1v1 (P2 in LAN) | B36.5 | 0,35 | 0 | 0 | sì | solo se scelto | 0,6 | 1,8 |
| pro | B36.5 | 0,35 | 0 | 0 | sì | solo se scelto | 0,62 | 1,8 |
| leggenda | B36.6 | 0,35 | 0 | 0 | sì | solo se scelto | 0,8 | 2,7 |

Il livello cambia solo la precisione chiesta: la finestra (0,28 / 0,2 / circa 0,16 / 0,15 / 0,115 s), la tenuta e P. Non cambia dove può andare la palla: `xMax` resta 3,65 a tutti i livelli.

### 2.7 Riferimenti fermi (B36.3, natpf_gestures.js:159-213)

```
seme affidabile (scambi di prova) e direzione nuova accesa nel livello della partita:
  primi 2 colpi (seedAlpha 0,35) solo se |dev| < 4°
  alpha e drift come oggi, ma |centro − seme| ≤ 4° (maxShiftTrusted)
  senza limite, come oggi: verifica dopo 4 colpi (> 35°), sbilanciamento oltre 22° (biasDevTrusted), pendenza comune dei due versi (commonPull)
seme non affidabile (rapida, Salta, Nessuna): regola di oggi (B35a)
ritmo: invariato (con wT 0,35 pesa al massimo 0,21 unità, circa 0,7 m)
```

[D] Nel caso peggiore una mira tenuta a 15° scende da 0,86 a 0,57, cioè da 3,1 a 2,1 m. Oggi scende a 0,23, cioè 0,8 m [L].

## 3. Architettura

**File nuovo `natpf-tennis/src/natpf/natpf_direction.js`.** È l'unica fonte della regola:
- `DIR36`: la tabella del §2.6; in B36.0 tutte le righe sono spente;
- `directionRules = { model: null }`: solo per prove e banchi, come `netPlayRules`;
- `readDirModel()` e `writeDirModel()`: chiave `natpf-tennis.direzione`, valori «classica» o «nuova», di base «classica»;
- `dirParams(difficulty, intent)`: restituisce null con il modello classico, con il livello spento o se `intent.derived`;
- `aimPlan({ x, hitX, contact, lv, dir })`: la mappa al contrario, per i giocatori simulati. Con il modello classico usa le stesse espressioni di oggi (rally-balance.mjs:51-53), nello stesso ordine;
- `zoneOf(x, depth, hitX, contact)`: le zone del §1, con un'unica definizione per banco, diagnostica, registro, scritte e allenamento.

**File che cambiano.**

| File | Cosa cambia |
|---|---|
| `natpf_stroke_outcome.js` | `strokeOutcome` riceve `dir`, facoltativo. Con null il codice è quello di oggi. Cambiano :355-357 (B36.1, B36.5), :285 (φ), :373 (B36.4). L'esito restituisce anche le parti della mira (`aimF`, `aimT`, `aimN`) e `dir` |
| `game_engine.js` | :2351 passa `dir`: è la stessa riga già toccata da B35a. La correzione laterale si applica a :2223 (P1) e :2600 (P2), solo se `out.dir` |
| `natpf_skill.js` | nuova `fixAirRally`, come `fixAirServe` (:903-919) ma senza il controllo della rete, che fa già il lancio [L game_engine.js:2834-2846] |
| `natpf_gestures.js`, `natpf_phone_racket.js` (circa :800) | B36.3 |
| `natpf_shot_feedback.js` | causa «troppo angolato» e nome della zona (dopo B37) |
| `diag/diag_recorder.js` (:263-275) | parti della mira, modello, zona, rimbalzo previsto (`landingOf`, natpf_shot_feedback.js:31-36) |
| registro: `registro_formato.js:48`, `cloudflare/registro-worker.js:99`, `registro_registratore.js:343-356` | campi del §6 |
| `natpf_kiosk.js` | voce «Direzione dei colpi: classica · nuova» accanto a «Mira del telefono» (:134, :186) |
| testi | `natpf_gesture_motion.js:111-114`, `natpf_training.js:30-31`, `natpf_arcade.js:103-129`, `natpf_events.js:221-245`: un testo per modello |

**Cosa resta com'è.**
- La pagina del telefono, fino a B36.8.
- `natpf_stroke_intent.js`: mira del piatto, tipo di colpo, forza.
- `natpf_impact.js`.
- Ritmo e ritardo abituale di B35a.
- La CPU, fino a B36.5.
- Rete, palla corta, servizio, schiacciata, colpo super.
- Doppio e P2 senza telefono: restano sulla catena con i sorteggi (game_engine.js:2145-2183, 2530-2557 [L]). Lì la coerenza non vale, e va scritto.

**L'interruttore ha tre livelli.**
1. Opzione dello staff: serve per la prova allo stand.
2. Righe di `DIR36`: servono per accendere un livello alla volta.
3. `directionRules`: serve per test e banchi.

Diagnostica e registro scrivono il modello a ogni colpo.

## 4. Telefono

**Da B36.0 a B36.7 la pagina del telefono non cambia.**
- Lo stesso messaggio `sw` basta: `fh` → centro della mira → `intent.face`.
- Cambia solo la versione del gioco (`site/js/tennis/version.js`, `site/tennis/build.json`).

**B36.8, facoltativa e solo dopo una sessione vera.** Si mandano dati che il telefono calcola già ma oggi scarta [L telefono §3g, §6.9]:
- `turn` e `along` (swing-detect.js:392-393);
- `base` e `baseRate` (face-tracker.js:171);
- eventualmente l'imbardata senza la posa «pronto», per vedere la mira fantasma: fino a circa 0,6 di mira, cioè circa 2 m [L].

Regole per questi campi:
- sono facoltativi e si girano insieme al verso, come `sg` (swing-message.js:17, 29, 48);
- prima finiscono solo nella diagnostica;
- entrano nella mira (al massimo con peso 0,3) solo se le sessioni vere mostrano che riducono di almeno il 15 % la dispersione della persona vera;
- serve una versione nuova della pagina.

**Calibrazione: invariata.**
- B36 si appoggia al seme affidabile degli scambi di prova, cioè la calibrazione di base «Giocando» [L natpf_trial_learn.js:42].
- Con «Salta» e «Nessuna» resta il centro adattivo [D: meno coerente]. Va scritto nella guida dello staff.
- [L] Con «Giocando» la deriva del giroscopio non viene tolta (swing-detect.js:319). Va misurata nella sessione vera.

**Mancini.**
- I termini nuovi usano solo c, hitX e f nel riferimento del campo.
- Test: `lateral(−c, −hitX, −f) = −lateral(c, hitX, f)`, esatto.
- `natpf-mancini` e `natpf-b20-specchio` si girano con B36 acceso.

## 5. CPU e livelli

**Difesa: la CPU non si tocca fino a B36.5.**
- Più angolo e profondità vogliono dire più errori della CPU (`cpuErrorChance`, natpf_skill.js:725-752 [L]).
- Più palle vicino alle righe vogliono dire più palle lasciate passare per sbaglio dalla Leggenda (natpf_legend.js:429-441 [L]).
- Se un criterio cade si corregge **la CPU**, mai le regole di chi gioca (decisione B16 (a)):
  1. prima l'attesa sulla bisettrice, come `legendRecover` (natpf_legend.js:328-336 [L]), per Pro e per il livello Evento difficile (`EVENTO_ENDS.hard`, natpf_skill.js:140);
  2. poi la lettura della palla larga (`planCpuRun`, :563-610 [L]).

**Attacco: in B36 la CPU non usa le regole di chi gioca.**
- La CPU sceglie i bersagli (`cpuShotChoice` :939-967, `legendDecide` [L]) e sbaglia con il suo modello.
- Uniformarla cambierebbe tutte le tarature: è un blocco a parte.
- B36 controlla solo che la CPU usi le stesse zone: profondo d'angolo a Pro e Leggenda, centro a Bambini (test b18-t2:178 [L]).

**Livelli.**
- Si parte da Bambino, Ragazzo e Adulto: sono i livelli dei visitatori [L natpf_who.js:13-19] e i loro criteri sono a favore di chi gioca.
- Per Evento si guarda la traccia di k, non solo i punti, perché k compensa. Se k arriva a 1, si tara la CPU di `EVENTO_ENDS.hard`.
- Pro e 1v1 si accendono in B36.5. La Leggenda in B36.6, con 40 semi.

**Stesso schermo: nessun vantaggio di punti.**
- Oggi l'aiuto al più giovane passa dal tempo: finestra ×2 e +0,1 s (natpf_duo_rules.js:163-168 [L]). Con wT 0,35 sulla direzione l'aiuto pesa meno [D].
- Se b25 scende sotto il 38 %, per chi è aiutato: P × 0,5 e mira piena × 1,2. È un aiuto di gioco e va dichiarato a schermo.
- Non chiamarlo «campo aperto»: quel nome esiste già (:66-94 [L]).

**Due computer.**
- L'host calcola tutti gli esiti; il P2 gioca a livello «1v1» (game_engine.js:2520 [L]).
- `intent.face` non cambia significato, quindi un P2 con un'altra versione funziona.
- Fino a B36.8 nessun campo nuovo nei messaggi.
- Prova `natpf-1v1-p2p` con l'opzione accesa.

## 6. Riscontro a schermo, tutorial, registro

**Riscontro (B36.7, leggero, dopo B37).** Nel video 1 il controllo si sente da tre cose: il rimbalzo mostrato, un segnale del tempo piccolo, esiti coerenti. Nessun mirino. Quindi:
- **nome della zona** nella scritta che già c'è, per esempio «Perfetto · Lungolinea» o «Buono · Angolo». Solo per chi gioca su questo computer e solo con la palla dentro;
- **la stessa parola sul telefono**, sotto la scritta: il telefono riceve già la riga con la causa (natpf_shot_feedback.js:49-51);
- **«fantasma» della mira solo in allenamento e nel tutorial**: un anello tenue dove sarebbe andata la palla con il solo piatto, quando il tempo l'ha spostata di 1 m o più;
- **«vincenti per zona» a fine partita** solo se entra nella schermata di B35b.

Niente mirino in partita: già il cerchietto del tempo non si capiva (B37, punto 3). Misure con `cqw` e `cqh`.

**Tutorial e allenamento (B36.1, seguono l'interruttore).**
- Oggi «Cima girata verso il centro / Colpisci un attimo prima del solito» (natpf_gesture_motion.js:111-114) e i suggerimenti dell'allenamento (natpf_training.js:30-31) insegnano il tempo.
- Con il modello nuovo diventano: «Gira la cima verso il centro (o verso l'esterno); più giri, più angolo; colpisci a tempo».
- La posa resta: `preYaw` di 22° è già oltre la mira piena.
- Il test di fedeltà oggi legge `natpf.wrist` (natpf-gesture-pose.test.mjs:286). Deve leggere `intent.face` e la zona ottenuta con i due modelli.
- Cambiano allo stesso modo Precision e Combo.
- Webcam e mouse restano invariati.

**Registro dello stand (B36.0).**
- Nella riga «colpo» (registro_registratore.js:343-356) tre campi nuovi:
  - `pf`: piatto, da −1 a 1;
  - `tu`: tempo in finestre;
  - `zn`: zona, con i valori `I1`, `I2`, `L`, `C`, `IO`, `F`.
- Nella riga «partita»: `dir`, il modello usato.
- Nomi controllati: nessuno è già usato in registro_formato.js [V].
- Insieme a `d`, `lato`, `x` e `z`, che ci sono già, bastano per scomporre la direzione delle partite vere.
- Vanno nelle due copie (con il test di uguaglianza [L]). **L'utente deve ricaricare il Worker**, altrimenti i campi si perdono in silenzio [L].

**Diagnostica.** Le stesse informazioni, più dettagliate, nell'evento «racchetta».

## 7. Banchi e test

**Misure «prima».** Sulla base unita (13.8 + B35b + B37), a macchina libera, con gli stessi comandi di B35a (§6 del suo documento):
- `direzione-telefono.mjs --seeds=1,2` e `--seeds=3,4`, con `--fuori --ritardo --serie`;
- `audit:legend -- --seeds=40`, `audit:evento`, `audit:cpu -- --obiettivi`, b25 (aiuto), `audit:rete`, `audit:movimento`, `audit:drop`;
- impronte: rally-balance (30 partite), b25, b32:152, `fine-partita --impronte`, `evento-bambini --impronte`, «tennista» di B35a.

Tutto va salvato in `docs/b36/misure-prima/`.

**Estensioni (B36.0), che non cambiano le uscite di oggi.**
- `direzione-telefono.mjs`:
  - `--dir`, `--pos`, `--zone` (Z1–Z5 e celle di 1 m), `--livelli`, `--ms`, `--serie=30`, `--json`;
  - modelli «insegnato» (18°) e «angolo corto».
  - Il modello «arco» si aggiunge solo in B36.8: oggi i gesti «piatto» e «polso» danno matrici identiche [L].
- `--dir` (attraverso `directionRules`) anche in rally-balance, legend, evento-bambini, cpu-pressione e b25.
- I giocatori simulati (rally-balance.mjs:42-64, b19/due-umani*.mjs, precision-combo.mjs, rete-diag.mjs) mirano con `aimPlan`. Con il modello classico le impronte devono restare identiche.
- [D] Punto debole: nei profili il piatto sbaglia di 0,12–0,45 unità, cioè 2–6° (rally-balance.mjs:25-27). Con B36 i banchi diventano ottimisti. Serve un profilo «umano» con il rumore del piatto preso da una sessione vera.

**Test nuovi.**
- `test/natpf-b36-interruttore.test.mjs`:
  - 10 000 casi a caso;
  - con `dir` null, `strokeOutcome` dà gli stessi valori di oggi, bit per bit, su tutti i campi;
  - gli intenti ricostruiti restano classici.
- `test/natpf-b36-direzione.test.mjs`:
  - la x cresce sempre con il piatto;
  - dentro la finestra |Δx| ≤ 0,15 m per ogni grado e ogni millisecondo; da B36.5 ovunque;
  - specchio esatto;
  - zone e celle raggiungibili dalle 3 posizioni;
  - 0 % fuori con il gesto buono ai livelli accesi;
  - rimbalzo vero uguale al bersaglio ±0,05 m (`flyAir`, natpf_skill.js:885);
  - un'intenzione senza campi nuovi (LAN) funziona.

**Test da riallineare apposta, solo in B36.9** [L vincoli (b)4]. In ognuno un commento «prima X, ora Y, perché»:
- `natpf-campo-aperto` e `natpf-campo-aperto-23-10`;
- `natpf-colpi-b15`, `natpf-aim`, `natpf-racchetta-motore`;
- `natpf-presa-palmo-29-10:170`, `natpf-variety`, `natpf-diag-20261030:159`, `natpf-b35-direzione`;
- le impronte.

Fino ad allora l'opzione è spenta di base e i test di oggi non si toccano.

**Prove nel browser.**
- Con `natpf-tennis.direzione=nuova`: `natpf-rally`, `natpf-phone-upright`, `natpf-mira-lato`, `natpf-training-flow`, `natpf-tutorial-phone`, `natpf-scambi-di-prova`, `natpf-diag-session`, `natpf-stesso-schermo-b25`, `natpf-1v1-p2p`, `natpf-registro`.
- Con l'opzione spenta: l'elenco completo dei vincoli (b)2.

## 8. Tappe

Ogni tappa: uno o pochi commit, test del gioco e del sito verdi, build se tocca `site/`, documenti aggiornati.

**B36.0 · Strumenti, interruttore, misure «prima».** Il gioco non cambia.
- File:
  - `natpf_direction.js`, con tutte le righe spente;
  - parametro `dir` e parti della mira in `natpf_stroke_outcome.js`;
  - `game_engine.js:2351`;
  - diagnostica e registro (tre campi più il Worker);
  - voce nel pannello dello stand, nascosta finché nessun livello è acceso;
  - banchi (§7) e test dell'interruttore.
- Chiusura:
  - impronte identiche;
  - `audit:legend` identico;
  - banco con `--dir=classica` uguale ai numeri «dopo» di B35a.
- Cosa può rompersi e come si vede: l'ordine delle operazioni nel refactor cambia i numeri. Lo segnala subito il test bit per bit.
- Ritorno indietro: revert.

**B36.1 · Il piatto decide, il tempo ritocca (Bambino, Ragazzo, Adulto).**
- Cambia:
  - wT 0,35 e spinta naturale 0;
  - testi di tutorial, allenamento, Precision e Combo;
  - test di fedeltà su `intent.face`.
- Chiusura:
  - almeno 80 % di giusti dal centro;
  - 0 % di incrociati voluti finiti lungolinea e 0 % di fuori, ai tre livelli;
  - colpi ricostruiti (webcam, mouse, tastiera) identici;
  - Evento: 60–70 punti e k sotto 0,95;
  - `cpu-pressione` dentro i suoi obiettivi;
  - b25 tra 38 e 42 %;
  - `audit:legend` identico.
- Cosa può rompersi e come si vede:
  - chi mira con il tempo: lo mostra la riga «tempo» del banco (da 63 a 38 %);
  - Evento che arriva al tetto: traccia di k;
  - aiuto al più giovane: b25.
- Ritorno indietro: opzione «classica».

**B36.2 · Stessa mappa da ogni punto; la palla cade dove si mira.**
- Cambia: φ 0 e `fixAirRally`.
- Chiusura:
  - rimbalzo vero uguale al bersaglio ±0,05 m;
  - Z1, Z3 e Z5 raggiunte almeno al 70 %;
  - rapporto di sensibilità ≤ 1,25;
  - prova `natpf-rally`.
- Cosa può rompersi: più palle sulle righe, quindi più errori della CPU (Evento, `cpu-pressione`); l'anello «Fuori» previsto (test su `landingOf`).

**B36.3 · Riferimenti fermi.**
- Chiusura:
  - serie di 14 colpi: almeno 13 giusti;
  - mediana stabile entro 1 m;
  - un riferimento sbagliato di 26–40° si corregge come oggi.
- Cosa può rompersi: un seme sbagliato di 4° o meno resta per tutta la partita, circa 1 m. Si vede con `sideBalance` («Storto», diag_metrics.js:234) e con le calibrazioni «-inv» del banco.

**B36.4 · Profondità e angolo corto voluto.**
- Cambia: `natpf_stroke_outcome.js:373`.
- Chiusura:
  - profondità separate di almeno 1 m;
  - Z2 almeno al 50 % con il gesto scelto e al massimo al 10 % senza;
  - nessuna palla lunga con il gesto buono;
  - volée e colpi super entro ±2 punti.
- Cosa può rompersi: più salite a rete B31 [L natpf_net_play.js:76-89].

**B36.5 · Righe senza scogliera; si accendono Pro e 1v1.**
- Cambia: tenuta e deriva del §2.1, P tarato, scritta «troppo angolato».
- Chiusura:
  - continuità ovunque;
  - colpi alla riga fuori al massimo al 3 % a Pro;
  - profili con il telefono entro ±5 punti;
  - P2P e mancini a posto.
- Cosa può rompersi: l'equilibrio di Pro; fuori con la causa sbagliata.

**B36.6 · Leggenda.**
- Chiusura: `audit:legend` con 40 semi e tutti i criteri rispettati.
- Se non regge si corregge la CPU. Se non basta, la Leggenda resta classica.

**B36.7 · Riscontro a schermo.**
- Chiusura: prove nel browser, ledwall e schermi stretti, schermate.

**B36.8 · Segnali dell'arco dal telefono (facoltativa), solo in diagnostica.**
- Cambiano: swing-detect, swing-message, `signedSwing`, la versione della pagina.
- Chiusura: telefoni vecchi e LAN funzionano; i segnali si girano con il verso.

**B36.9 · Accensione di base.** Dopo la prova dell'utente e la sessione vera.
- Si riallineano test e impronte.
- La «classica» resta un'opzione per una versione.

**Restano fuori:**
- palla corta, volée e gioco a rete (B31), servizio, schiacciata e pallonetto, con le regole di oggi;
- doppio e P2 senza telefono;
- webcam, mouse e tastiera;
- la camera;
- la CPU con le regole di chi gioca;
- il percorso del braccio, fino a B36.8.

## 9. Rischi, punti deboli, domande

**Rischi.**
1. **Il rumore vero del piatto non è noto.** Se è ±18° invece di ±12°, la direzione «dominante» sembra caso. Lo coprono l'interruttore e la sessione vera.
2. **Chi ha imparato a mirare con il tempo perde il controllo** (63 → 38 %).
3. **Equilibrio:**
   - Leggenda contro «tennista» ha 1,6 punti di margine;
   - Evento può arrivare al tetto di k;
   - l'aiuto nello stesso schermo può indebolirsi.
4. **Banchi ottimisti**, e criteri sul profilo «medio» ciechi a B36.
5. **Riferimenti fermi:** un piccolo errore del seme dura tutta la partita.
6. **Più profondità** vuol dire più salite a rete, quindi più volée.
7. **Registro e lavori in coda:** Worker da ricaricare; possibili conflitti con B37 sulle scritte del fuori.

**Punti deboli del piano.**
- Per qualche versione ci sono due regole: nuova a Bambino, Ragazzo e Adulto, classica a Pro e Leggenda. Va scritto nel pannello dello stand.
- wT, φ e P vengono da una replica: Pro, una sola velocità della palla, bersaglio e non rimbalzo vero, niente ritmo.
- Fino a B36.5 resta mezza scogliera.
- Il «movimento del braccio» entra solo in B36.8, e forse mai. Fino ad allora il movimento che conta è il giro della racchetta all'impatto.
- Con φ 0 il colpo neutro va al centro da ogni punto: va controllato che non sembri «centrato».
- Fasce e zone le ho scelte io.

**Domande all'utente** (la prima opzione è quella consigliata).
1. **Peso del tempo:** il tempo diventa un ritocco, circa un terzo del piatto, e la direzione la decide la cima del telefono · oppure resta come oggi.
2. **Ordine:** prima Bambino, Ragazzo e Adulto, poi Pro e Leggenda dopo le misure · oppure tutti insieme.
3. **Righe:** con il gesto pulito la palla resta sempre dentro; a Pro e Leggenda «mira alla riga + tempo sbagliato = fuori», con la scritta del perché · oppure nessun fuori dovuto alla mira, come oggi · oppure rischio anche ai livelli facili.
4. **Palle corte e volée:** restano come oggi, fuori dalla mappa nuova · oppure si spengono (si rompono tutorial, gioco a rete B31 e Combo).
5. **Prova allo stand:** voce «Direzione dei colpi: classica · nuova» nel pannello dello stand, spenta di base, più una sessione di 5 minuti con un telefono vero prima di accenderla per tutti · oppure accesa subito.
6. **Webcam, mouse e tastiera:** in B36 restano con la regola di oggi · oppure entrano subito, ma perdono il lungolinea che oggi ottengono con il ritardo.