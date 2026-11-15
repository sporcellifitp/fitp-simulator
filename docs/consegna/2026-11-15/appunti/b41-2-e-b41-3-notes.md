# B41 seconda parte (B41.4 + B41.5) · appunti di ripresa

Worktree: scratchpad/b412/wt, ramo b41-fiera-2, base 6348253 (natpf-simulator con B47 unito).
Porte: 4250–4299 (8443/8080/8081 con flock scratchpad/lan.lock; 4902/4903 con flock scratchpad/telecomando.lock).
NIENTE push, niente file di versione, non toccare TRACCIA_PASSI/PIANO_LAVORI/RIPRESA_AGENTE.
Prima di finire: merge di natpf-simulator (B45.1 di un altro agente su natpf_kiosk.js, link.js, racchetta.js,
natpf_phone_racket.js) tenendo le due parti.

## Stato
- [x] worktree creata, node_modules con cp -al (package-lock uguali)
- [ ] lettura del codice
- [x] lettura del codice (natpf_fiera, kiosk, lobby, ui, new_player, rematch, prematch, ready_go, battuta, remote, remote_map,
      split_ui, events, stand_mouse, click_guard; e2e fiera-telefoni, flusso-tocchi)

## Disegno (deciso)
- Pannello: voce nuova «Modalità fiera: No · Sì» (data-staff="fiera"); con la fiera accesa la voce «Telefono» diventa
  «Telefoni dello stand ›» (apre il foglio). Accendere = salva '1', calibrazione portata a «Giocando» se non lo era, foglio
  aperto. 16 voci: a 720×720 serve CSS (6 file su 3 colonne).
- Foglio #natpf-fiera (natpf_fiera_sheet.js): due schede Telefono 1/2, stato (standSlotView), «Abbina» → QR solo a foglio
  aperto (un posto alla volta), numero + «Rifiuta» / «Conferma» (data-no-remote, isTrusted), «Scollega» (due clic,
  TwoStep), batteria, ultimo colpo letto (dritto/rovescio). Strato 'fiera' nel telecomando (focus, Indietro = chiude).
  staffOpen conta il foglio (partita ferma), Esc lo chiude, chiosco fermo.
- Avviso batteria sul ledwall: #natpf-fiera-alert, telefoni dello stand collegati con batteria < 20 e non in carica.
- Pagina della fiera = passo 'match' con #title-modal[data-fair="1"]: go('menu') → 'match' con la modalità della fiera
  (cpu | split). Nascosti: Indietro, Riscaldati prima, barra dei passi, versus. Nuovi: «1 giocatore · 2 giocatori»,
  mano (Destra · Mancino), blocco di due colonne per lo stesso schermo (fasce, mano, stato), riga dei telefoni con
  «Telefoni dello stand ›», «Visitatore N». «Gioca» spento con il motivo se il telefono non è pronto.
- In fiera «Gioca» con «Giocando» → scambi di prova → conto B47 → partita (niente ritorno alla pagina).
- Fine partita in fiera: «Prossimo giocatore ›» (btn-new-player rinominato) + «Rivincita» (B47), «Menu» nascosto.
  Prossimo giocatore = fieraNext: nome '', guest, learned, resetWho, resetHands(ui,'fiera'), split.resetNames, telefoni
  freshPlayer (profilo da capo), trialPlayed false, visitatore nuovo, backToMenu → pagina della fiera; niente forget.
- Chiosco in fiera: reset → come «Prossimo giocatore» (niente forget).
- Telecomando: «Nuovo giocatore» in fiera = «Prossimo giocatore»; «Chi gioca» già funziona sul passo match.
- Battuta: matchServe({ fair }) → in fiera contro la CPU fissa e batte chi gioca anche con «Alternata».
- Visitatori: contatore { day, n } in localStorage natpf-tennis.fiera.visitatori; numero assegnato al primo «Gioca» contro
  la CPU del visitatore (se non ha un nome), «Prossimo giocatore» lo libera.
- [x] codice scritto (non ancora in un commit, 17:5x UTC): natpf_fiera.js (funzioni pure, visitatori, avviso batteria, play),
      natpf_fiera_sheet.js (nuovo), natpf_fiera_page.js (nuovo), natpf_new_player.resetFairVisitor, natpf_lobby (go/paint/back/
      next/_key/askNickname force), natpf_ui (fieraSheet, fieraPage, staffOpen, newPlayer, _bindStart, _paintVictory, tick),
      natpf_kiosk (voce fiera, Telefoni dello stand, reset in fiera, _calChanged), remote/remote_map (strato fiera, fair),
      natpf_battuta.matchServe({fair}) + game_engine (fair), index.html, natpf-ui.css, test/ui-world.mjs (SHEETS).
- Sonda d'impaginazione: scratchpad/b412/probe/layout.mjs (WT=… SHOTS=… SIZES=…): pannello, foglio, pagina della fiera
  senza scorrere a 1024×600, 720×720, 1280×720, 1920×1080 (misurato 18:00 UTC).
- [ ] test di unità nuovi (natpf-fiera.test.mjs), suite completa, commit
- [x] commit 2f8c5f0 (18:0x UTC): codice B41.4–B41.5 + test (natpf-fiera 15/15). Suite gioco prima del commit: 1608/1610
      (KO: natpf-mancini «Mancino» nelle scelte della mano → corretto in «Sinistra»; natpf-lan-letture a tempo, da sola verde).
- [ ] prove nel browser: aggiornare natpf-fiera-telefoni (chiosco → pagina della fiera; B47 senza conto piccolo; foglio con
      clic veri), FLOW=fiera / fiera-due in natpf-flusso-tocchi (+ dieci visitatori, doppio clic con ?guardia=1)
- [x] natpf-fiera-telefoni riscritta (pannello con il mouse, foglio, Conferma vera, pagina della fiera, Prossimo giocatore,
      batteria, due giocatori): 38/38 (18:10 UTC). Tolta la «prova dritto/rovescio» dal foglio (il telefono non manda colpi
      fuori dal gioco: servirebbe cambiare racchetta.js); «Sono pronto» non offerto con un foglio dello staff aperto.
- [ ] FLOW=fiera / fiera-due in natpf-flusso-tocchi; poi le prove di regressione; documenti; merge di natpf-simulator
- [x] commit 2ffa80f (18:3x UTC): «Sono pronto» non salta gli scambi di prova (natpf_ready_go._fire con setTimeout), e2e
      fiera-telefoni 38/38, FLOW=fiera 46/46 (10 visitatori), FLOW=fiera-due 13/13. Suite gioco 1611/1611 (prima del commit).
- Documenti scritti ma NON ancora in un commit: docs/b41/modalita-fiera-2.md (segnaposto VEDI_*), GUIDA_STAND.md (cap. 8.4 e
  righe del pannello), PROJECT_MEMORY.md (sezione B41 seconda parte), WORK_PROGRESS.md (voce con VEDI_VERIFICHE).
- [ ] merge di natpf-simulator (ff90b5a: B45.1 fase A + versione 14.3). Conflitti attesi: natpf_kiosk.js (reset/check: tenere
      il ramo fiera in testa a reset, e clean=true; atMenu con la pagina della fiera), forse natpf_ui.js, ready_go, GUIDA.
      resetPlayer ora accetta { gate, causa } (B45.1): passare causa in resetFairVisitor.
- [x] merge di natpf-simulator (af42330, 18:4x UTC): conflitti solo in natpf_kiosk.js (tenute le due parti) e, al ritorno dei
      documenti, nella prima riga della guida. Test di unità vicini 125/125 sul codice unito.
- [ ] dopo l'unione: suite complete (gioco, sito, desktop, LAN), build, audit:legend (confronto con scratchpad/b47/legend-b47.txt
      o con la base), prove nel browser (fiera-telefoni, flusso fiera/fiera-due, menu, telecomando con flock, nuovo-giocatore,
      b47-fiera, mano-sicura, solo-mouse), immagini del documento (probe/imgs.sh), segnaposto VEDI_* nei documenti, commit.
- [x] dopo l'unione (18:4x–18:5x UTC): gioco 1618/1619 (registro a tempo, da solo 27/27), sito 264/265 (remote-pairing a
      tempo, da solo 18/18), LAN 13/13, desktop 51/51, build OK, audit:legend identico a scratchpad/b47/legend-b47.txt
      (tolte le righe di time). Prove nel browser (probe/e2e-all.sh → e2e2/riassunto.txt): flusso-fiera 46/46,
      flusso-fiera-due 13/13; fiera-telefoni 20/23 PERCHÉ la prova aspettava la partita 8 s dopo «Sono pronto": ora (dopo
      2ffa80f) prima vengono gli scambi di prova (la modalità fiera porta CAL su play) → prova corretta in
      patch/natpf-fiera-telefoni.mjs (scambi di prova + «Salta ›» dal telefono), da copiare in wt/tools/e2e a corsa finita.
- Documenti già corretti in patch/docs/ (da copiare a corsa finita): modalita-fiera-2.md (base e unione, causa di
  resetPlayer, «visitatori»), PROJECT_MEMORY.md (causa, nota sulle prove), WORK_PROGRESS.md (unione, prova; VEDI_* restano).
- TROVATO: fine partita 1280×720 con «Visitatore N»: il titolo va su due righe e la scheda (justify-content center +
  overflow hidden, natpf-hud.css B35) taglia la pillola in alto. Sonda probe/fine.mjs (WT GAME_PORT SHOTS). Idea: titolo
  più piccolo quando è lungo (classe o --len in hud_ui.showVictoryModal), misurato a 1280×720, 1920×1080, 1366×768,
  1024×600, 720×720, 1920×540, 1024×1024.
- Commento natpf_fiera_page.js riga 6 «Destra · Mancino» → «Destra · Sinistra» (a corsa finita).
- [x] corsa e2e2 finita: menu 45/45, nuovo-giocatore 28/28, b47-fiera 20/20, mano-sicura 17/17, solo-mouse 42/42,
      telecomando 91/91 (flock), mano-sicura-720 16/17 = UGUALE sulla base ff90b5a (worktree b412/base, e2e3/base-mano-720.log:
      avviso della mano a y=256 invece del centro; nella revisione B46 delle 14:22 era a y=301): difetto di natpf-simulator,
      non della B41.
- [x] correzione titolo fine partita (NON ancora in un commit, 19:2x UTC): hud_ui._fitEndTitle, natpf_match_stats.titleFit,
      natpf-hud.css --fit; test nuovo natpf-b41-fine-titolo.test.mjs; sonda probe/fine.mjs: prima 12/63 KO, dopo 0/63.
      Gioco 1621/1621, sito 265/265, build OK. e2e patch applicata in wt (scambi di prova + «Salta ›» + endFit a tre misure).
- [ ] corsa e2e3 (probe/e2e-3.sh → e2e3/riassunto.txt): fiera-telefoni, fine-partita, b47-fiera, mano-sicura-720; poi commit
      del codice; poi sonda layout (shots2) e immagini; documenti (patch/docs pronti con le note, VEDI_* da riempire); commit.

## RIPRESA 2 (14/11 21:58 UTC, agente nuovo; macchina appena riavviata, carico 0,3)
- HEAD 8c37a98 «IN CORSO» = 77260ad + avviso batteria a destra sulla pagina della fiera in un'area stretta (natpf-ui.css
  .natpf-fiera-alert.on-page, NatpfFiera.tick, test in natpf-fiera, controllo alertFree in e2e fiera-telefoni) + documenti.
  Prima dell'interruzione (20:12–20:14): gioco 1621/1621 (test-gioco-5), build OK (build-5), e2e4 fiera-telefoni 47/47.
- natpf-simulator è a 401a6d6 (dopo ff90b5a solo docs/TRACCIA_PASSI.md): merge banale, da fare alla fine.
- Da fare: commento pagina (verificare), suite complete, prove nel browser (elenco del compito), sonda misure 7 formati,
  immagini e documenti (VEDI_*), GUIDA 8.4 con passi esatti, commit, merge, test sul risultato.
- 22:06 UTC: gioco 1621/1621 e sito 265/265 su 8c37a98 (carico 6-8, l'agente B45.2 fa girare i suoi test)
- 22:08 UTC: desktop 51/51, LAN 13/13, build OK (build-6.txt) su 8c37a98. In corso: audit:legend (legend-6.txt) e la sonda
  delle misure a 7 formati con telefoni simulati (probe/misure.mjs → misure/, porte 4252/4253).
- 22:1x UTC: audit:legend 69 OK, uguale a b47/legend-b47.txt e a legend-b412.txt (tolte le righe dei tempi).
- TROVATO (NON della B41, c'è già sulla 14.3: base 15 punti su 280 a 1366×657 e 10 a 1024×600): il pannello dello stand
  centrato trema sotto il puntatore fermo sul confine tra due voci (la riga sotto le voci, B39.3, cambia numero di righe →
  il foglio si sposta di 9–12 px → un'altra voce sotto il puntatore → …). Sonda probe/flicker.mjs; risultati
  flicker-base.txt, flicker-ramo-*.txt. Non corretto qui (CSS del pannello: ci lavora il B45.2): da segnalare.
- sonda delle misure: probe/misure.mjs (puntatore nell'angolo prima del pannello) → misure/ (rilanciata).
- 22:2x UTC: sonda misure2 (7 formati, telefoni simulati): 36/36 a posto (pagina CPU e due, pannello 16 voci, foglio,
  fine partita «Bella sfida, Visitatore 1!» su una riga). Schermate guardate (misure2/v/*.jpg). TROVATO (della B41):
  l'avviso della batteria copre il consiglio «Prossima volta prova il livello Facile» della fine partita a 1280×720,
  1024×600, 1920×540 (e sta sopra l'intro, z 240 > 200). Correzione decisa: l'avviso solo sulla pagina della fiera (tra un
  visitatore e l'altro, dove lo staff può metterlo in carica), nascosto subito appena si lascia la pagina
  (NatpfFiera.tick); test di unità e controllo in natpf-fiera-telefoni (in partita niente avviso). IN CORSO.
- 22:38 UTC: correzione dell'avviso (natpf_fiera.js tick, test natpf-fiera, controllo in e2e fiera-telefoni, commento css):
  gioco 1621/1621 (test-gioco-7.txt). NON ancora in un commit. Avviate le prove nel browser: probe/e2e-5.sh → e2e5/
  (riassunto.txt), porte 4260–4279, telecomando con flock.
- 22:4x UTC: commit bee3649 (avviso della batteria solo sulla pagina della fiera). e2e5 fiera-telefoni 48/48. Documenti in
  corso nella wt (non ancora in un commit): modalita-fiera-2.md (testi aggiornati; mancano tabella delle verifiche,
  immagini, sezione misure e «trovato»), GUIDA 8.4 riscritta con i passi esatti (patch2/guida-8-4.md), PROJECT_MEMORY
  (avviso, titolo, Personaggi/Altre impostazioni, pannello che trema). Manca WORK_PROGRESS.
- 22:5x UTC: e2e5 finora: fiera-telefoni 48/48, flusso-fiera 46/46 (10 visitatori ≤2 clic e ≤1 tocco, ~16 s di scambi di
  prova ciascuno, doppi clic 110/250/300 ms ok), flusso-fiera-due 13/13, fine-partita 47/47, b47-fiera 20/20, menu 45/45.
  Immagini del documento fatte (docs/b41/img, 7 jpg, 576 KB). modalita-fiera-2.md: §5 misure, §6 trovato, §7 non
  verificato; manca la tabella §4. GUIDA: 8.4 riscritto, «In breve» e «Dove si vede il marchio». Manca WORK_PROGRESS.
- 23:0x UTC: e2e5 completa: fiera-telefoni 48/48, flusso-fiera 46/46, flusso-fiera-due 13/13, fine-partita 47/47,
  b47-fiera 20/20, menu 45/45, nuovo-giocatore 28/28, mano-sicura 17/17, mano-sicura-720 17/17 (y=301: prima 16/17 sotto
  carico anche sulla base), solo-mouse 42/42, telecomando 90/91 (KO «Salta dal telecomando» di tempi, già visto sulla 14.3:
  da rifare da sola), stesso-schermo-b25 44/55.
- b25: (1) conta 15 voci (la B41 ne aggiunge una: 16) → 11 KO di conteggio; (2) VERO DIFETTO DELLA B41: a 720×720 con le
  quattro opzioni del B25 accese e il puntatore fuori dal pannello il foglio scorre di 28 px e «Chiudi» esce (sulla base
  0 px: 15 voci = 5 file da 3, 16 = 6 file). Sonda probe/panel-opts.mjs (panel-opts-base.txt / -ramo.txt). (3) la prova
  misura con il puntatore lasciato dove capita: la spiegazione della voce sotto il puntatore (B39.3) allunga il foglio (sulla
  base 15 px sopra «Calibrazione» a 720×720, 6 px a 1920×540, 28 px a 1024×600: difetto della 14.3).
  Correzione in corso: pulsanti del pannello più bassi a ≤820×760 (min-height 48, padding 5/10) in fondo a natpf-ui.css
  (sezione B41); b25: 16 voci e puntatore nell'angolo prima delle misure.
- 23:1x UTC: regola compatta del pannello (natpf-ui.css, fondo, sezione B41) e prove b25/b20 aggiornate (16 voci, puntatore
  nell'angolo). Sonda: 720×720 con le opzioni accese ora «Chiudi» a 670 (margine 50). Rilancio e2e6: b25, b20, menu,
  solo-mouse, fiera-telefoni, telecomando (da sola).
- 23:3x UTC: commit 202cf3f (pannello 720×720 compatto, b25/b20 16 voci e puntatore nell'angolo). e2e6: fiera-telefoni
  48/48, menu 45/45, solo-mouse 42/42, b25 54/55 (solo il 1024×600 della 14.3), b20 51/52 (punto 6 del B45.1), telecomando
  91/91. Prossimo: documenti finiti (tabella §4, WORK_PROGRESS da patch2/wp.md), commit dei documenti, merge di
  natpf-simulator (9bfa9cf, solo TRACCIA), test gioco+sito sul risultato, build, risultato strutturato.
- 23:3x UTC: merge da243e0 (natpf-simulator 9bfa9cf, solo TRACCIA). Test gioco+sito+build sul risultato in corso (test-gioco-8, test-sito-8, build-8).
- 23:4x UTC: commit d38bc16 (documenti finiti, immagini). Sul codice unito da243e0: gioco 1621/1621 (test-gioco-8), sito
  265/265 (test-sito-9; al primo giro 264/265 remote-pairing di tempi, da solo 18/18 ×3), build ok (build-8).
  natpf-simulator ancora a 9bfa9cf (già unito). FATTO tutto il compito; resta solo il risultato strutturato.
- 23:4x UTC: sonda misure3 sul codice finale 36/36 (fine partita senza avviso). Commit 5dda8aa. HEAD finale 5dda8aa,
  natpf-simulator 9bfa9cf già unito (da243e0). COMPITO FINITO: manca solo la risposta strutturata.

## B41.3 · correzioni della revisione (15/11, 00:3x UTC, agente nuovo)
Compito: passo 0 merge di natpf-simulator 3d92ce1 (B45.1 fase B + B45.2), poi 8 difetti della revisione (vedi compito:
1 «Salta ›» per sbaglio con id dell'offerta + telefono che spegne + tempo minimo 1 s; 2 «Scollega» dal telecomando in due
passi; 3 «Torna al menu» in fiera azzera il visitatore; 4 pagina della fiera 1920×540 2 giocatori senza scorrere; 5 accendi/
spegni fiera rimette «Con cosa giochi» e «Calibrazione»; 6 calibrazione bloccata a «Giocando» in fiera; 7 testi; 8 riga
di spiegazione del pannello ad altezza fissa). Porte 4250–4279. Sonde revisore: scratchpad/rev-b412/probe/.
- [ ] passo 0: merge natpf-simulator
- [x] passo 0 (00:4x UTC): merge di natpf-simulator 3d92ce1 (natpf-simulator è poi andato a 4dc7a6d = versione 14.4: da
      unire alla fine). Conflitti: kiosk (nota), stand_mouse (hint), GUIDA (fiera = 8.4, B45.1 → 8.5), PM, WP. Gioco
      1635/1635, sito 269/269 (scratchpad/b413/test-*-m0.txt). Commit dell'unione fatto. Prossimo: e2e b25, b20,
      pannello-cadute, fiera-telefoni (uscite in scratchpad/b413/).
- e2e sul codice unito (fotografia scratchpad/b413/snap-m0, runner scratchpad/b413/probe/e2e.sh, snap.sh): fiera-telefoni
  48/48, b25 55/55, b20 52/52, pannello-cadute (in corso 00:48).
- [~] difetto 1 (01:0x UTC, NON in commit): natpf_phone_racket (NEXT_TAP, nextTapVerdict, offerNext con id e graceMs,
  _onNext, _renewNext), link.js (next con id), phone-screen (nextOnMsg id, nextTap, NEXT_REARM_MS, readyView sent),
  racchetta.js (click con nextTap, pulsante spento, riarmo), natpf_trial (Salta con graceMs, offerta tolta all'outro),
  diag_recorder (tel.tocco). Test nuovi: natpf-tennis/test/natpf-b41-3-tocchi.test.mjs 12/12, tools/test/b41-3-tocchi
  3/3; aggiornati natpf-ready-go, niente-blocchi (noId), phone-screen (regex). Manca: e2e (fiera-telefoni con i tre casi).
- [x] commit 077cadc (01:1x UTC): difetto 1 (id delle offerte, telefono che spegne il pulsante, «Salta ›» 1 s).
- [x] commit ee2994c (01:3x UTC): difetti 2, 3, 5, 6 (test natpf-b41-3-fiera 8/8, vicini 111/111).
- TROVATO dopo l'unione: natpf-pannello-cadute 27/33 (720×720 con le righe delle cadute: il foglio scorre 9–32 px con 16
  voci). Da sistemare insieme al difetto 8 (riga di spiegazione ad altezza fissa / foglio in alto).
- Prossimo: difetto 8 + pannello-cadute; poi 4 (pagina della fiera 1920×540), 7 (testi), e2e, documenti.
- [x] commit (01:4x UTC) difetto 8: _fitNote (altezza fissa della riga sotto le voci), CSS compatto (720×720 4 colonne,
      aree basse più piccole, cadute su 2 colonne), test natpf-b41-3-pannello 3/3. Sonda b413/probe/panel.mjs quick 16/16.
      In corso: sonda completa (tutte le varianti) e e2e su scratchpad/b413/snap-1 (e2e-1/).

## RIPRESA 3 (15/11 07:1x UTC, agente nuovo; macchina appena riavviata)
- HEAD 80239be «IN CORSO» = difetto 4 a metà (index.html pulsante #fiera-bar [data-fiera-sheet], css .fiera-bar-sheet,
  natpf_fiera_page splitCardState + paint). Sonda fp-1 (b413/fp-1) 63/63 su quel codice; schermate guardate: a posto.
- [x] test nuovo natpf-tennis/test/natpf-b41-3-pagina.test.mjs 2/2 (difetto 4). NON ancora in un commit.
- In corso: suite gioco+sito su b413/snap-2 (= 80239be) → b413/test-gioco-2.txt, test-sito-2.txt.
- TROVATO in e2e-1 (dopo il difetto 8): pannello-cadute 29/33, KO a 1280×720 con 2 righe delle cadute (scroll 21 px): la
  riga ad altezza fissa allunga il foglio. La sonda panel.mjs non misurava 1280×720: da sistemare (CSS) e misurare anche
  1280×720, 1366×768, 1920×1080, 1024×1024. b20 51/52 in e2e-1 (richiamo per nome 1920×1080, da rifare da sola).
- Poi: difetto 7 (testi), e2e complete, sonde del revisore, desktop prova-linux, documenti, merge natpf-simulator (b0c8356).
- 07:2x UTC: NON in commit: test natpf-b41-3-pagina (2/2), e2e fiera-telefoni +5b (tre casi del difetto 1) + controllo difetto 4
  in sezione 6 (seq relativi), GUIDA 8.4 (B41.3: Gioca grigio in due, certificato per telefono nuovo, Torna al menu in fiera,
  Salta dopo 1 s, Scollega due OK, spegnere rimette le scelte, Calibrazione «Giocando (fiera)»), modalita-fiera-2.md riga 25
  (Conferma: mouse o Invio, telecomando no), natpf-ui.css regola nuova in fondo per 1280×720 con le cadute.
- In corso: e2e-3 fiera-telefoni su b413/snap-3 (= wt alle 07:15, prima della regola css); sonda panel-6 1280×720
  VARIANTS=cadute su wt (probe/panel.mjs ha VARIANTS=cadute). Script nuovo b413/probe/snapwt.sh <cartella> (fotografia della wt).
- La sonda panel.mjs con VARIANTS=all è lenta (~30 s a variante sotto carico): usare SIZES mirate.
- 07:20 UTC: su 80239be gioco 1658/1658, sito 272/272 (b413/test-*-2.txt). Commit c53d178 (test difetto 4).
  e2e-3 fiera-telefoni: C e C2 OK, D eccezione di tempi (g.click aspettava il pulsante fermo) → corretto con g.mouse.click;
  in corso e2e-4 su snap-4. Sonde del revisore: copie in b413/rev-probe (porte 4276/4277), runner b413/probe/rev.sh
  (SRC=<albero> rev.sh <uscite> [p2 p8 …]).
- 07:23 UTC: e2e-4 fiera-telefoni 54/54 (snap-4); commit dell'e2e. Docs (GUIDA, modalita-fiera-2 §1 e §8 tabella) scritti, NON in commit. Electron per Linux installato in wt/natpf-desktop (dalla cache).
- 07:3x UTC: commit della regola 1280×720 (panel-6 8/8). In corso: panel-7 (1366x657,1920x540,1280x720 tutte le varianti, snap-4), rev-1 (p2 p8 p9 su snap-4). PROJECT_MEMORY scritto (non in commit).
- 07:25 UTC: avviata e2e-5 (tutto tranne fiera-telefoni) su snap-4 (= codice di 3126c8f) → b413/e2e-5/riassunto.txt. Poi: rev p3 p5 p6, desktop (build + prepara + registro vuoto + prova-linux con flock lan.lock), suite gioco/sito/desktop/LAN/build/audit:legend, documenti WP + §8.2/8.3, merge natpf-simulator (ora 656f3dc), test sul risultato.
- 07:27 UTC: rev-1: p8 6/6, p9 6/6, p2 16/17 (D: g.click della sonda in gara con il tocco a 60 ms sotto carico; copia di p2 corretta con mouse.click) → rev-2 (p2 p3 p5 p6) in corso.
- 07:3x UTC: commit aaafc8a (documenti) e unione di natpf-simulator 656f3dc (conflitto solo nella prima riga della GUIDA). Da rifare sul risultato: gioco+sito (+build, desktop prova-linux). audit:legend su snap-4 = uguale a b412 (69 OK); LAN 13/13, desktop 51/51 su snap-4.
- 07:30 UTC: rev-2 p2 22/22 (con mouse.click), p3 11/12 (KO = nota sotto le voci misurata con il puntatore su «Scarica CSV» prima e senza dopo: spiegazione B39.3, non una scelta rimasta).
- 07:31 UTC: rev-2 p5 9/9, p6 5/5 (rev-1 p8 6/6, p9 6/6). In corso: e2e-5 (b20…), panel-7, gioco/sito/build su snap-6 (= 3403546 unito).
- 07:43 UTC: e2e-5 b25 55/55, b20 50/52 (richiamo per nome a 1920×1080 e 1920×540: called falso in 3 giri, carico 18; da rifare da sola).
- 07:44 UTC: su snap-6 (= 3403546, unito con natpf-simulator 656f3dc): gioco 1660/1660, sito 272/272, build ok, prepara ok (2026-11-14.4, registro.json svuotato). In corso: prova-linux (flock lan.lock) → b413/prova-linux-6.txt; e2e-5 (pannello-cadute…); panel-7.
- 07:46 UTC: docs §8.2/§8.3 scritti (segnaposto VEDI_PANNELLO in §8.2 da riempire con panel-7); manca §8.4 verifiche, §8.5 non verificato, WP verifiche. pannello-cadute 33/33.
- 07:5x UTC: prova-linux su snap-6 101/101 (8 scenari, riprovati 0, registro.json svuotato, flock lan.lock).
- 07:50 UTC: e2e-5 flusso-fiera 46/46 (10 visitatori, 1–2 clic, 0–1 tocco, scambi 15,8–16,8 s), flusso-fiera-due 13/13.
- 07:57 UTC: e2e-5 fine-partita 47/47, b47-fiera 20/20, menu 45/45, nuovo-giocatore 28/28.
- 08:01 UTC: e2e-5 mano-sicura 17/17, mano-sicura-720 17/17, solo-mouse 42/42. Restano phone-blackout, telecomando; poi b20 da sola.
- 08:05 UTC: e2e-5 phone-blackout 11/11; telecomando KO perché snap-4 non ha dist (il server LAN serve la build) → rifatta su snap-6 con b20 (e2e-6).
- 08:1x UTC: TROVATO panel-7 68/72: 1280×720 fiera=1 cadute=0 scorre 18 px (Telefoni dello stand «1 da abbinare · 2 da abbinare ›» su due righe). Regola css estesa (sempre, max-height 800: anche 1366×768), test aggiornato 3/3, NON in commit. Sonde panel-8 (1280x720,1366x768 all) e panel-9 (1920x1080,1024x1024 fiera) su snap-7.
- 08:16 UTC: e2e-6 su snap-6: b20 52/52 (da sola), telecomando 91/91.
- 08:2x UTC: docs §8.4 e §8.5 scritti (segnaposto VEDI_ORA, VEDI_PANNELLO, VEDI_PANNELLO2). Dopo panel-8/9: commit css+test, poi rifare su fotografia finale fiera-telefoni, pannello-cadute, menu, solo-mouse, b25, b20 (toccano il pannello a 1280×720), gioco+sito.
- 08:3x UTC: panel-8/9 KO finora = misura «fuori» presa durante l'animazione d'apertura del foglio (scala 0,98, sonda settle.mjs: h 745→760). Sonda panel.mjs corretta (aspetta le animazioni) + PICK=fiera:cadute:opzioni:programma; rifare i KO alla fine.
- 08:4x UTC: panel-9 (1920x1080,1024x1024 fiera) 23/24 + il KO rifatto con la sonda corretta 1/1 = 24/24.
- 08:4x UTC: commit 5880ca0 (regola compatta sempre a 1280×720/1366×768). Pannello: 720/1024x600/1366x657/1920x540/1280x720/1366x768 tutte 24/24, 1920x1080 e 1024x1024 fiera 12/12. Fotografia finale snap-8 (5880ca0): e2e-8 (fiera-telefoni b25 b20 pannello-cadute menu solo-mouse) + gioco/sito.
- 08:5x UTC: unione di natpf-simulator 52fb692 (558b106, solo documenti). snap-8 = 558b106: e2e-8 (fiera-telefoni b25 b20 pannello-cadute menu solo-mouse) e gioco/sito/build in corso. Docs aggiornati (non in commit): §8.2 numeri del pannello, §8.1 riga 8, PM, WP difetto 8. Mancano: VEDI_ORA in §8.4, verifiche in WP, commit documenti.
- 09:00 UTC: snap-8 (558b106): gioco 1659/1660 (natpf-registro «1 MB pochi ms» 81,8 ms sotto carico 12–16; da solo 27/27 due volte), sito 272/272, build ok; e2e-8 fiera-telefoni 54/54, b25 55/55, b20 52/52; in corso pannello-cadute, menu, solo-mouse.
- 09:1x UTC: e2e-8 tutte verdi (fiera-telefoni 54/54, b25 55/55, b20 52/52, pannello-cadute 33/33, menu 45/45, solo-mouse 42/42). Docs con segnaposto VEDI_GIOCO (modalita-fiera-2 §8.4 e WP) in attesa di test-gioco-8b.
- 09:2x UTC: FATTO. HEAD 1ec3517 (natpf-simulator 52fb692 unito in 558b106). Gioco 1660/1660 e sito 272/272 sulla fotografia finale. Resta solo la risposta strutturata.
