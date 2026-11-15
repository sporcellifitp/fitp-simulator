# B40 fine partita v2 — appunti di ripresa
Worktree: scratchpad/b40/wt, ramo b40-fine-partita (base natpf-simulator 9e19f75).
Piano: docs/coda/B40-piano-analisi.md; decisioni utente nel prompt (vedi sotto).
## Stato
- [x] B40.1 contatori (commit, npm test 1670/1669 pass 0 fail, 6m40)
- [x] B40.2 trofei + banco (commit; asso 3/4/5 sqrt; banco in scratchpad/b40/banco)
- [x] B40.3 prima partita + record (commit, 1683 test)
- [x] B40.4 card SVG (commit; e2e fine-partita 55/56 prima della correzione del record dello scambio, da rifare)
- [x] B40.5 esultanza/applauso (commit 27ce719)
- [x] B40.6 ritratti 3D + arena ferma (commit 401eaee; npm test 1700/1699 ok)
- [ ] B40.7 documenti (niente versione/pacchetti: vietato dal coordinatore)
- [ ] merge natpf-simulator + prove finali
## Decisioni
Prima volta: solo bronzo, sempre visibile (al posto del 3° se bronzo). Cornici: Bambini azzurra, Evento giallo-verde, Pro oro,
Leggenda arcobaleno, Facile argento; stesso schermo colore fascia; 2 computer giallo-verde. Re di oggi: vinte, in classifica
(nome o Visitatore N), >=5 partite oggi. Record oggi: kmh e scambio, solo valore. Prossimo trofeo anche a chi vince senza.
Arena ferma sotto card + ridisegno resize + ripartenza su tutte le strade. Bambini stesse soglie. Ritratti tecnica C, SVG
ripiego, Android/poca memoria K=8. Asso ridefinito raggiungibile ma raro. natpfTeamHit (B49) campo o nota.
Porte browser 4350-4389.
Baseline: legend-prima.txt e impronte-prima.txt in scratchpad/b40 (prima delle modifiche).
## B40.4 in corso
Bozze in scratchpad/b40/draft (natpf_end_card.js, card.css). Piano DOM: .end-body (display: contents senza card) con
#victory-cards + #victory-stats; split: card = .end-player (end-pname, end-chip, 2 riquadri) e #victory-stats nascosto.
Card orizzontale: finestra del ritratto 4:5 a sinistra, info a destra; riquadri B35 in colonna accanto (16:9).
Arena ferma: _natpfFrame controlla ritratti.frozen() a ogni fotogramma (copre tutte le strade). Cattura prima di render().
Artifact della tavola: non leggibile (404) -> descrizione scritta.
## B40.5 e B40.6 (in corso, non ancora in commit al momento di questa nota)
- player_body_animation: cheer/clap (conversione in MATCH_OVER della reazione del motore, niente lastPointWinner nel motore);
  mascotte 3D: racchetta orizzontale, nearMascot; natpf_mascot_rig: clap -> mano libera vera. Test natpf-b40-esultanza (5) verdi.
- natpf_ritratti.js + game_engine (_updatePlayerAnimation own/hold, _natpfFrame frozen) + natpf_ui. Prova a mano
  scratchpad/b40/prova-card.mjs (RITRATTI=1): ready dopo ~2 s dall'apertura (SwiftShader), fogli guardati: ok.
- Da fare: test di unità ritratti, e2e nuovo natpf-fine-partita-ritratti.mjs, commit B40.5 e B40.6, documenti, merge.

## Ripresa dopo il limite d'uso (coordinatore): natpf-simulator locale ora alla versione 2026-11-14.5. Restano: e2e ritratti,
rifare e2e fine-partita, schermate, documenti (docs/b40, GUIDA_STAND, WORK_PROGRESS, PROJECT_MEMORY), merge, prove finali.
- e2e ritratti: A+B 23/24 al giro 2 (C2 corretto), C 5/5 -> commit 0dd7225. fps card aperta 25 (SwiftShader), rivincita aperta 0,8; cattura 2040 ms (1 personaggio), 2114 (2). Programmi 0.
- Unione natpf-simulator fatta (fdbfcc7, nessun conflitto). Sul ramo unito: gioco 1700/1700, sito 272/272, desktop 51/51,
  LAN 13/13, build ok, audit:legend identico (69 OK). fine-partita 52/56 -> correzione nomi trofei (commit dopo l'unione).
- Batch e2e in corso: scratchpad/b40/e2e-batch.sh, log in e2e-batch.log, uscite e2e-<nome>.txt.
- Restano: compilare MISURE_RITRATTI e PROVE_B40 in docs/b40/fine-partita-v2.md, WORK_PROGRESS, schermate finali, rapporto.
