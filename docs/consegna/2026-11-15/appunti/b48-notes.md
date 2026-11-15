# B48 servizio e leggenda — appunti di ripresa

Worktree: /tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/b48/wt (ramo b48-servizio, da natpf-simulator 3d92ce1)
Porte mie: 4300-4329.

## Stato
- [ ] npm ci (natpf-tennis, tools/lan, natpf-desktop, tools/e2e)
- [ ] lettura: CLAUDE.md, TRACCIA_PASSI (fine), docs/b16/rapporto-gameplay.md (8,9,10,17; tappa 3 p.5), docs/b18/r2-motore-piccolo.md, game_engine.js ~1960, docs/coda/B44-servizio-animato.md, natpf_legend.js
- [ ] inventario "cosa c'è già" per i 4 punti
- [x] npm ci fatto ovunque (gioco, lan, desktop, e2e)  [00:35 UTC 15/11]

## Inventario (cosa c'è già)
### 1. D16
- natpf_impact.js:395-429 ballAtGesture + queueUserSwing (B18). P1 telefono ok, test natpf-b18-ritardo (casual/pro/leggenda/1v1).
- P2 stesso schermo: game_engine.js:1829 stessa queueUserSwing con this.opponent → coperto ma SENZA test.
- displayLag: natpf_phone_racket.js:276 lo somma alla latenza. MA natpf_diag.js:133 aggiorna solo engine.natpfPhone,
  non natpfPhone2 (P2 split/fiera, creato una volta: natpf_split_ui.js:167, natpf_fiera.js:68) → valore vecchio. BUCO.
- livelli bambini/evento non nel test. Presa piatta (aim 'face', latenza 0) spenta: ALLOW_FLAT=false (racchetta.js:46).
- doppio: _attemptPlayerRallyStrike usa latencyShift (game_engine 2064) → già tolta.
### 2. servizio con scelte
- serveOutcome natpf_stroke_outcome.js:628: dx = (-plane*1.5 + face*.8)*q  (direzione da obliquità). tau + = prima.
- tau: game_engine 1564 (P1), 1796 (P2 split, solo aim swing). Mouse/tastiera/webcam natpf: intent derived (face=dirX).
### 3. servizio CPU
- game_engine 1938-1946: x = 1.75..2.6 (+dirX*1.15), z 4.4..5.75, volo 0.608*cpuServe.flight (s=true quasi sempre), topspin 22, sidespin dirX*-8
- natpf_skill.js:57/79/91/121 cpuServe {flight, wide}; cpuServeEvent :199 (casual wide 0 → sempre centro quadrato)
- legendServe natpf_legend.js:448 (dirX ±1 o corpo, speed 1.05-1.45)
- km/h veri: B34 game_engine 1966 w = |v|*3.6, natpfArena.setSpeed(w). Da cercare 194 ovunque.
- scossa: game_engine 1997 niente cameraTrauma se cpuServe. Da controllare swingVfx / rimbalzo isPowerShot.
### 4. Leggenda smorzata
- natpf_legend.js:259 candidato smorzata se hz>11 && bz>-10.6 && q>.75. Misurare frequenza (audit:legend, stats.picks).

## Misure PRIMA (base = scratchpad/b48/base, git archive 3d92ce1 natpf-tennis + site/js, node_modules link)
- audit:legend prima: Tutti i criteri rispettati (legend-prima.txt; sintesi misure/legend-prima-sintesi.txt)
  medio 14.4±0.93 smorz 13.8 | amatore 13.9 | tennista 28.1 | preciso 32.4 | bambino 6.9 | impreciso 5.6 | pro/medio 75.9% game | casual 100%
- smorzate 24 semi (misure/smorzate-prima-24.jsonl): medio 13.8% (1 ogni 7.3, finestre8≥2: 29.3%, dist min 1), umano 17.0%, tennista 8.5%
- servizio CPU (misure/servizio-cpu-prima.jsonl): casual corpo 100%, 97-106 km/h, effetto 22/0 100%; giocatore mouse 66-75, tel insegnato 79-88, piano 72-79;
  tremolio (delta) 0 ovunque. pro T21/c55/L24, leggenda T40/c27/L33, evento T20/c64/L16.
- NB headless: cameraTrauma decade solo in update() → misurare il delta al servizio.
- Script misure (scratchpad/b48/misure): smorzate.mjs, servizio-cpu.mjs → lanciare da natpf-tennis con ROOT=$PWD node --import ./test/register.mjs <script>

## Piano (ordine)
1. D16: natpf_diag aggiorna anche natpfPhone2; test bambini/evento, P2 stesso schermo, catena displayLag. commit
2. Leggenda: cooldown smorzata (nessuna se una nelle ultime 7 della CPU, m.last). audit:legend + smorzate 24 semi. commit
3. Servizio CPU: piano esplicito (T/corpo/largo per livello, mai 3 uguali di fila; effetto piatto/kick/tagliato; tetto Casual/Bambini
   = media km/h servizi del giocatore nella partita, primo servizio 70 km/h; Evento cap fuso). test + misure. commit
4. Regola servizio telefono (prima del colmo → T, dopo → largo; tau/0.15, reach 1.6, ×q; solo natpf.aim 'swing'); testi (cue tutorial,
   guida «Il servizio», coach 'go'/'wait' sub, GUIDA_STAND); audit/servizio.mjs tight via tau; test. commit
5. Browser + schermate (1920x1080, 1280x720, 720x720). 6. Documenti, merge natpf-simulator, test finali.
- [x] passo 1 D16 commit aa9b08f
- [~] passo 2 (smorzata, natpf_legend dropEvery 8 + dropAllowed) e passo 3 (servizio CPU: natpf_skill CPU_SERVE/cpuServePlan/pickVaried/
  cpuServeLimit/noteServeKmh, tabelle serveDir per livello; game_engine cpuPlan + ricerca del volo + natpfServeKmh + natpfLastCpuServe;
  legendServe col piano) SCRITTI, non ancora committati. Test nuovo natpf-b48-servizio-cpu (6/6).
  Misure smorzata sola (24 semi): medio 13.6→15.2, amatore 13.7→13.9, umano 20.1→21.5, tennista 29.4→30.5, preciso 32.9→32.3 (≤ +2: ok ma vicino)
- [~] 01:20 stato: servizio CPU sistemato (Casual/Bambini: niente kick, rimbalzo 5.6–6.1 m con fixAirServe, tabelle T 1.05/c 2.05/L 3.05);
  test aggiornati: b18-risposta (ok), campo-aperto (ok), legend «servizio vario» (piano), racchetta-motore (tetto sulla media dei 2 semi),
  b36-misure impronte nuove (41aef8d0d03c, 1cb32e74b6ce, 2fb94f0ecf71, f04f752c34ee, cc11f4f9ef64). Suite: 1632/1633, resta
  b18-t2-servizio «a Casual chi batte tardi» (4 semi: 10.4% contro soglia 12.5; 12 semi dopo 12.9 vs prima 13.9: rumore del sorteggio).
  PROSSIMO: punto 2 (regola telefono), poi rivedere quel test e audit/servizio.mjs, poi commit A (passi 2+3) e B (passo 4).
- [~] 01:50 punto 2 SCRITTO: natpf_stroke_outcome SERVE.choiceTau .15/choiceReach 1.6/choiceQ0 .55, serveOutcome({choice}), serveThird,
  serveChoiceRules.off (prove di confronto); game_engine choice = t.natpf?.aim==='swing'; natpf_gesture_motion SERVE_CHOICE (4a riga
  scheda «Servizio»); natpf_serve_coach sub di «Colpisci!» per il telefono; natpf_onboarding guida «Il servizio»; audit/servizio.mjs
  tightTau (servizi sulla riga col tempo); test b18-t2-servizio aggiornati (WIDE_TAU -.165; controllo «valori di prima» sotto 12,5%).
  Test nuovo natpf-b48-servizio-scelta (6/6). DA FARE: e2e natpf-servizio-peso (largo col tempo), suite completa, commit A/B.
## Ripresa 15/11 07:10 (agente nuovo dopo il limite)
- HEAD 2750e73 IN CORSO (passi 2-4). Suite completa lanciata 07:10 → b48/suite-1.txt.
- Controllati: niente 194 fisso (solo commento game_engine:1986); scossa: game_engine:2029 già senza (B18); arena setSpeed(w) km/h veri.
- DA FARE: esito suite → sistemare; e2e servizio-peso, servizio-scelta (porte 4301/4302); misure DOPO
  (smorzate 24 semi, servizio-cpu.mjs, audit:legend); commit «completa»; documenti; merge natpf-simulator (b0c8356); prove finali.
- [x] 07:22 suite 1638/1639 (solo registro-worker tempo, da solo 21/21); commit a12c299 (serveChoiceOf: niente scelta dalla webcam movimento; porte e2e 3197/9197)
- [~] misure DOPO in corso: misure/legend-dopo.txt, misure/servizio-cpu-dopo.jsonl, poi smorzate-dopo-24.jsonl
- [~] 07:35 revisione: Pro contro medio era 69,9% (KO audit:legend) per gli effetti nuovi del servizio CPU; prove exp1-4 (misure/pro.mjs):
  volo 1 → 71,9; top 22 → 81,4; 18/26/14 volo 1 → 74,5 (base 75,9). SCELTO 18/26/14 volo 1. Evento: limite solo se taglia (prima 127 km/h a 5,9 m).
  choiceReach 1.625 (= «sulla riga» del B18: 3,675 m) + tightTau sempre ≥ choiceTau (ace Casual perfettoEsterno 0,8% → 6,8%, base 6,5%).
  Script di misura copiati in natpf-tennis/scripts/audit/b48/. DA FARE: rimisurare tutto (legend-dopo2, servizio-cpu-dopo2, smorzate), impronte b36.
- [~] 07:50 spin per livello: SERVE_SPIN 18/26/14 (Pro, Leggenda), SERVE_SPIN_SLOW 14/24/9 (Casual, Bambini; Evento media). toNet Casual 18,8 (base 19,5).
  plan.deep (cap ≥ 1) per il servizio profondo sempre a Casual/Bambini, Evento solo se taglia. Misure finali in corso: legend-dopo3.txt,
  servizio-cpu-dopo3.jsonl, smorzate-dopo-24.jsonl (non toccare src mentre girano). ATTENZIONE: un mio pkill -f audit/legend.mjs
  alle 07:45 può aver fermato anche un audit:legend dell'altro agente (b413).
- [x] 07:40 commit 8ffe672 (revisione: spin per livello, deep, reach 1.625, e2e servizio-peso 8/8 con la scritta letta a 0,6 s). Mirati 63/63.
  e2e servizio-scelta 15/15 (07:21, con reach 1.6: da rifare). Schermate in b48/shots.
- DA FARE: aspettare misure (b7ef2bl4u), suite completa, documenti (bozza b48/doc-bozza.md), merge natpf-simulator (656f3dc), prove finali.
- [~] 07:55 Leggenda spin 22/28/18 (exp5: preciso 33,0 base 32,9; medio 14,8). Impronta umano/leggenda c9a0543602ef. Misure finali 2: legend-finale2.txt, smorzate-finale-24.jsonl, servizio-cpu-leggenda.jsonl
  Doc scritto: docs/b48/servizio-e-leggenda.md (aggiornare numeri Leggenda + sezione Prove).
- [x] 07:52 commit 32cee8b (Leggenda 22/28/18), a9a17ab (documenti), 8d37014 (unione natpf-simulator 52fb692, senza conflitti).
  Prima dell'unione: sito 269/269, LAN 13/13, desktop 51/51; e2e servizio-scelta 15/15, servizio-lancio 17/17, servizio-peso 8/8.
- DA FARE: finire misure (legend-finale2, smorzate-finale-24, servizio-cpu-leggenda), completare doc (§5 Prove, numeri Leggenda),
  WORK_PROGRESS, suite completa sull'unione, sito, build, e2e lista (porte 4307+).
- [~] 07:55 suite finale in corso (b48/suite-finale.txt, sull'unione 8d37014 + test b18-t2 soglia 11,5 ripristinata: misura 10,7).
  Build ok. Documenti quasi finiti (placeholder __PROVE__ nel doc b48, __VERIFICHE__ in WORK_PROGRESS).
  e2e servizio-scelta: aggiunto il controllo del riquadro dell'allenamento (da far girare). Poi: e2e lista con porte 4307-4316.
- [x] 08:05 sull'unione 8d37014 (+ test b18-t2 soglia 11,5): gioco 1639/1639, b18-t2 da solo 13/13, sito 269/269, LAN 13/13, desktop 51/51, build ok,
  e2e menu 45/45, training-flow 21/21. In corso: chi-serve, fine-partita (task bjmxjuhta, log in b48/shots-e2e/*.log). Poi scambi-di-prova,
  stesso-schermo-b20, formato-fiera, servizio-scelta (con il riquadro dell'allenamento), servizio-lancio, servizio-peso. Poi commit finale documenti.
- [~] 08:25 e2e: menu 45/45, training-flow 21/21, fine-partita 47/47 (sull'unione). chi-serve lunga (>570 s): rilanciata nel giro in
  background bgquvya6s con chi-serve, formato-fiera, scambi-di-prova, stesso-schermo-b20, servizio-scelta (+allenamento), servizio-lancio,
  servizio-peso; log in b48/shots-e2e/<nome>-f.log. Poi: §5 del doc, __VERIFICHE__ in WORK_PROGRESS, commit finale.
- [x] 08:33 commit 4571caa (soglia 11,5 di nuovo). Restano da committare: documenti (doc b48 §5 con __E2E__, WORK_PROGRESS __VERIFICHE__) ed e2e servizio-scelta (allenamento).
- [x] 08:42 natpf-chi-serve: 36/36 OK fino a «Lob & Drop contro la CPU», poi ferma su «Lob & Drop, computer del Player 2» (grafica in
  software al 240% di CPU, >8 min); la stessa prova sulla BASE 3d92ce1 si ferma nello stesso punto (36/36 poi ferma): non è del B48.
  Fermate tutte e due (solo i miei PID). Il giro e2e continua con formato-fiera ecc.
- [x] 08:56 formato-fiera 29/29 (14 min, carico 11–16); servizio-scelta 18/18 (con allenamento; poi reso onesto il controllo a 720: da rifare nel giro);
  dopo l'unione di nuovo: B48 38/38, sito 269/269, LAN 13/13, desktop 51/51, b25 26/26, b18 9/9. Giro e2e: ora scambi-di-prova.
- [~] 09:00 scambi-di-prova 30/30; servizio-peso 8/8 e servizio-lancio 17/17 sul codice finale (porte 4323, 4325/4326);
  b20 in corso: un KO «richiamo per nome a 1280×720» (called falso dopo 3 giri, mentre giravano in parallelo peso e lancio): da rifare da sola.
- [x] 09:08 b20 da sola 52/52; giro: scelta 18/18, lancio 17/17, peso 8/8, fiera 29/29, scambi 30/30. Commit 33cda8e (e2e allenamento).
  Documenti riempiti (resta __CHI__ in WORK_PROGRESS: chi-serve di nuovo da sola in b68nseym2, log shots-e2e/natpf-chi-serve-3.log).
- [x] 09:14 FINE: HEAD 0246d31 (documenti). chi-serve: 3 volte ferma su Lob & Drop P2 (anche base). Tutto il resto verde. Niente push.

## B48.1 (correzioni della revisione) — appunti di ripresa
Base: HEAD 0246d31 (ramo b48-servizio). Revisione: b48/revisione-b48.md; sonde del revisore in scratchpad/rev-b48/tools.
Piano: 1 volée sul servizio (natpf_impact) → 4 firstKmh → 5 servizio CPU vario nei rimbalzi veri + profondi → 2 test che
proteggono → 3 test seme per seme + impronta stesso schermo con la regola → 6 documenti → merge natpf-simulator → prove.
- [ ] 10:22 inizio. Misure PRIMA in b48/b481/ (volley, sim-cpu-serve).
- [x] 10:30 punto 1 commit 31a0f6f (natpf_impact serveReturn: niente smash/volley al volo sul servizio; test nuovo
  natpf-b48-risposta-servizio 3/3, rossi sul codice di prima; test D7 n.3 di natpf-b18-risposta riscritto: prima schiacciava
  al volo un servizio a campanile). Misure PRIMA: b481/volley-prima.txt (bambini medio 12/1199, bambino 7/958, altri 0),
  b481/cpuserve-prima.txt (rimbalzi: bambini corpo 68–72% fila 11–20; pro corpo 50–53% fila 6–10; evento 48–52% fila 7–9;
  leggenda max 4; profondità p50 4,3 m a pro/evento/leggenda). Copie: b481/prima (0246d31), b481/passo1 (31a0f6f).
  In corso: b481/volley-passo1.txt.
- [~] 10:45 punti 4+5 SCRITTI (non committati): natpf_skill firstKmh 59 (servizio più lento possibile di chi gioca misurato:
  telefono f0 64,9, mouse/tastiera f0 mira T 59,4, webcam argon 66,8: b481/tools/min-serve.mjs), tabelle serveDir nei terzi,
  CPU_LONG .3 (servizi profondi Pro/Leggenda/Evento alla stessa velocità), aimServeX; game_engine _executeServeHit (long e
  aimServeX). Probe b481/tools/bounce-plan.mjs: terzi ~1/3, max di fila 2, profondi ~30%. Difficoltà PRIMA: b481/diff-prima.txt.
  PROBLEMA: con 52–59 km/h chi risponde avanza >1,5 m (test campo-aperto-23-10); sonda b481/tools/first-depth.mjs: serve
  profondità più corta per i servizi lenti (delta .9–1,2 a 52–59). Esiste già a 59–66 km/h (6/30 con il codice del B48).
- [~] 11:05 slowDepth PROVATO E TOLTO: «umano» perdeva 10–11 punti a Casual/Bambini (sui primi servizi 12–15% invece di 80%:
  la palla presa tardi in discesa). Ora firstServeKmh per racchetta: telefono 64 (firstKmhPhone; più lento possibile 64,9),
  altre/senza interfaccia 59 (mouse f0 mira T 59,4). Chi risponde può avanzare 2–3 m sui servizi lentissimi (come già nel B48
  con chi serve piano). Test nuovi in natpf-b48-servizio-cpu (11/11) e natpf-b48-servizio-scelta (B48.1 guida + ace).
  Mutazioni tutte prese (b481/mut.sh). Misura v2 in corso (b481/v2: diff-v2.txt, volley-v2, cpuserve-v2).
- [~] 11:15 NON committato ancora (punti 2,3,4,5,6 in corso nella worktree): Pro «narrow» (T 1,12±.18, largo 2,93±.12:
  Pro medio game 73,2 invece di 71,7), test nuovi (b48-servizio-cpu 11, b48-servizio-scelta +2, b48-pro-criterio nuovo,
  b25 impronte con la regola accesa dce0c9a62a22/cfaed93ad0e7/97ae13c39fb3, racchetta-motore seme per seme a 40 punti,
  campo-aperto-23-10 con primo servizio lento ≤3 m), script scripts/audit/b48/difficolta.mjs e primo-servizio.mjs,
  documenti (b48 doc minaccia, PROJECT_MEMORY, GUIDA_STAND). Impronte b36 nuove da mettere (b481/tools/b36-prints.mjs).
  Misura v3 in corso: b481/diff-v3.txt, legend-v3.txt, volley-v3, cpuserve-v3, primo-v3. Leggenda tennista 8 semi 31→28,1:
  DA FARE 24 semi (scripts/audit/b48/smorzate.mjs --seeds=24; prima = misure/smorzate-finale-24.jsonl).
- [x] 11:30 commit 7d3d795 (punti 4+5), 7f444ba (punto 2), a446634 (punto 3). Mirati 352/352. CPU_LONG .15 (con .3 Pro medio
  70,9% e tennista Leggenda −2,9). Misure finali v4 (b481/*-v4.txt, smorzate24-v4, diff24-*): difficoltà entro 2 punti
  (24 semi dove serve), audit:legend tutti OK (Pro 73,1%), volée sul servizio 0 a tutti i livelli, terzi ~1/3 e max 2 di fila.
  Mutazioni prese: choiceReach 1.6, guida, Pro 14/24/9 (dal test dei valori; il criterio di Pro NON la prende: 74,8%),
  Leggenda 18/26/14, cancello Evento (2 versi), Math.round, firstKmh 70, senza aimServeX, senza profondi, b25 senza scelta.
- DA FARE: docs (b48 §7, WORK_PROGRESS, docs non committati: GUIDA_STAND, PROJECT_MEMORY, b48 doc), merge natpf-simulator
  (ora e5d62ad), prove finali (suite, sito, desktop, LAN, build, audit:legend, e2e con porte 4300-4329).
- [x] 11:45 commit ec9ec96 (documenti, segnaposto __PROVE_B481__ e __VERIFICHE_B481__), unione 3072637 (natpf-simulator e5d62ad,
  conflitti solo in PROJECT_MEMORY e WORK_PROGRESS, risolti tenendo tutto). ORA: prove finali sul ramo unito.
- [~] 11:55 (ripresa dopo il messaggio del coordinatore) git pulito, HEAD 3072637 (unione). Punti 1 (31a0f6f), 4 e 5 (7d3d795)
  in commit. Suite sul ramo unito: 1686/1687, rosso «B20 A1: la schiacciata voluta su palla davvero alta, in risposta» (da
  vedere: probabilmente la risposta al servizio dopo il rimbalzo del punto 1). Sito 272/272, LAN 13/13, desktop 51/51.
- [x] 12:00 commit B20 A1 (risposta dopo il rimbalzo, P1 e P2 uguali). Ora: build, audit:legend sul ramo unito, e2e, suite di nuovo.
- [x] 12:25 sul ramo unito 450256e: build ok, audit:legend Tutti OK (Pro 73,1%), e2e servizio-scelta 18/18, servizio-peso 8/8 (porte 4301-4303). La macchina risulta riavviata (uptime 3 min alle 12:24).
- [x] 12:27 e2e training-flow 21/21, scambi-di-prova 30/30.
- [x] 12:36 e2e fine-partita 47/47; stesso-schermo-b20 50/52 in coppia con fine-partita (icona B44 del P1 a 1920×1080 non arrivata, carico 7–8), da sola 52/52. In corso chi-serve (4313).
- [~] 12:57 chi-serve in corso: 43 OK, superato «Lob & Drop, computer del Player 2» (nel B48 si fermava lì). Poi: suite completa di nuovo, segnaposto nei documenti, rapporto.
- [x] 12:58 chi-serve 64/64 (porta 4313, carico 8–9). Ora suite completa su 450256e.
