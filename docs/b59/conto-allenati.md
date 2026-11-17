# B59 · Conto alla rovescia «Allenati un po'!» prima degli scambi di prova (FIERA)

Richiesta dell'utente del 16/11/2026: «voglio che quando c'è la sessione di calibrazione con scambi di palla ci sia un
countdown come quando parte il vero match, con una scritta centrale grossa dove al posto di "Si gioca" compaia "Allenati
un po'" con quella transizione centrale. Poi le persone fanno scambi, si allenano, e poi comincia il match.»

## Cosa succede

1. Con «Calibrazione: Giocando» (di base), quando partono gli scambi di prova (dopo «Collega», «Gioca ancora», «Nuovo
   giocatore», «Prossimo giocatore», nello stesso schermo dopo «Gioca»): al centro dello schermo lo **stesso riquadro del
   conto della partita** (B47) con «Preparati · Prima qualche scambio di prova · 3 · 2 · 1» e una riga sotto («Palle
   facili dal lanciapalle: colpiscile, il gioco impara il tuo colpo»; nello stesso schermo «Palleggiate tra voi: il gioco
   impara i vostri colpi»). Il campo è fermo e non parte nessuna palla.
2. A zero, al centro, la **scritta grande «Allenati un po'!»** con la stessa transizione di «Si gioca» (stile della
   scritta d'inizio partita) e la voce «Go!» (voce del gioco in inglese, clip che c'era già).
3. Dopo 1,2 s la prima palla: gli scambi di prova di sempre (circa 10 s, «Salta ›»).
4. Poi, come prima: contro la CPU la pagina «Pronto per la partita» e, con «Gioca», il conto della partita
   («La partita sta per cominciare») e «Si gioca»; nello stesso schermo subito il conto della partita.

I telefoni ripetono il conto: «Allenamento tra 3, 2, 1» e «Allenati un po'!» (poi, per la partita, «Si gioca tra» come
prima). Pausa, pannello dello stand o telefono fermo durante il conto: il conto aspetta e riprende da dove era.
«Salta ›» o il menu durante il conto: il conto sparisce, nessuna scritta. Niente conto con «Ricalibra» a partita in corso
(si rigioca subito il punto).

## Codice e prove

- `natpf-tennis/src/natpf/natpf_prematch.js`: `TRIAL_COUNT`, `prematchTexts`, `beginTrial`, `cancelTrial`; a fine conto
  «Allenati un po'!» e voce invece di «Start»; messaggi ai telefoni con `trial: 1`.
- `natpf-tennis/src/natpf/natpf_trial.js`: fase `count` prima della prima palla (scritta degli scambi nascosta), poi
  `TRIAL.afterCount` (1,2 s, `natpf_trial_learn.js`); `Salta ›` e chiusura annullano il conto.
- `site/js/tennis/phone-screen.js`: `countFlash` con `trial` («Allenamento tra», «Allenati un po'!»).
- Prove: `natpf-tennis/test/natpf-b59-conto-prova.test.mjs` (5: testi, flusso contro la CPU con telefono, scritta e voce,
  poi conto della partita; «Salta ›», menu e pannello durante il conto; «Ricalibra» senza conto; stesso schermo con i due
  telefoni), `tools/test/phone-screen.test.mjs` (+3 controlli). Aggiornati i tempi di 8 prove degli scambi di prova
  (+3,2 s: `COUNT_MS`, `COUNT_EXTRA_S` in `test/trial-world.mjs`).

**Non provato**: con telefoni veri allo stand e sul ledwall.
