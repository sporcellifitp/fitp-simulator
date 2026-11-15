# B49 · Doppio contro la CPU: il compagno gioca da solo le sue palle

Piano dell'analista: `docs/coda/B49-piano-analisi.md` (passi B49.1–B49.6, obiettivi §3f). Codice entrato in
`natpf-simulator` con la versione **2026-11-14.7** (`8018967`, un solo commit insieme a B40, B48 e B50), senza documento
del blocco: questo file è stato scritto nella ripresa del 15/11/2026 (dopo la 14.8) leggendo il codice e rifacendo le
misure del piano.

## 1. Cosa fa

- Nel **doppio contro la CPU** (non nella sfida tra due computer, non nello stesso schermo) il compagno di chi gioca
  **colpisce da solo** le palle che gli arrivano: volée entro 0,5 m dalla sua posizione d'attesa (1,4 m dal centro, 5,1 m
  dalla rete), ad altezza da volée, mai la risposta al servizio (`natpf_doubles.partnerBallPlan`). Il colpo è una volée
  tagliata verso il lato libero; gli errori usano il modello della CPU con un livello proprio (`PARTNER.err`).
- **Anello azzurro** sotto il compagno quando la palla è sua (`natpf_partner_ring.js`).
- **Riga prima della partita** nella sala d'attesa e avviso al primo colpo del compagno (`natpf_lobby.js:645`,
  `game_engine.js:2948`).
- **Voce del pannello dello stand** «Doppio: compagno · Gioca da solo / Con il tuo gesto» (di base **Gioca da solo**,
  salvata in `natpf-tennis.compagno`; nell'indirizzo `?compagno=gesto|solo`). «Con il tuo gesto» rimette il comportamento
  di prima: il compagno colpisce quando chi gioca fa il gesto.
- Pressione degli scambi lunghi contata sullo scambio di chi gioca (`exchangeStrokes`), così il doppio non diventa più
  difficile del singolo.
- I colpi del compagno **non contano nei trofei** del B40: con il compagno autonomo `natpfStats.shot` non viene chiamato
  per lui (`game_engine.js:2374`, `:2930`).

**Come si attiva con il mouse:** nel menu scegli «Doppio» contro la CPU. Per cambiare il compagno: tasto destro → pannello
dello stand → «Doppio: compagno» (vale dalla prossima partita). Guida dello stand §8.7.

## 2. Misure (ripresa del 15/11, codice della 14.8)

Banco del piano (`docs/consegna/2026-11-15/sonde/b49/b49-misure.mjs`, 3 semi × 150 punti, livelli Casual, Evento, Pro,
profili umano, amatore, bambino, `--fmts=singles,doubles,doubles-noswing`). Uscita completa:
`docs/b49/misure-b49-2026-11-15.txt`.

| Livello · profilo | Singolo: vinti / vincenti | Doppio: vinti / vincenti / compagno / scambio | Differenza punti vinti |
|---|---|---|---|
| casual · umano | 84,9 / 57,1 | 84,0 / 57,4 / 16,9% / 10,5 | −0,9 |
| casual · amatore | 90,0 / 50,9 | 82,2 / 53,8 / 14,8% / 10,8 | **−7,8** |
| casual · bambino | 54,9 / 26,3 | 49,1 / 39,4 / 14,2% / 9,3 | −5,8 |
| evento · umano | 70,4 / 56,8 | 68,2 / 57,7 / 13,1% / 14,5 | −2,2 |
| evento · amatore | 65,8 / 56,4 | 64,9 / 61,3 / 12,3% / 12,5 | −0,9 |
| evento · bambino | 49,6 / 25,6 | 47,8 / 31,6 / 13,5% / 9,0 | −1,8 |
| pro · umano | 58,7 / 68,2 | 53,6 / 63,5 / 15,3% / 17,0 | −5,1 |
| pro · amatore | 54,9 / 67,2 | 49,3 / 67,6 / 12,7% / 14,1 | −5,6 |
| pro · bambino | 17,3 / 33,3 | 17,3 / 52,6 / 10,1% / 8,2 | 0 |

Obiettivi del piano (§3f):

1. **Colpo come nel singolo**: esito B15 100%, distanza laterale p50 0,76–0,77 m (obiettivo 0,70–0,80). **Sì.**
2. **Vincenti** nel doppio ≥ 0,8 × singolo: 0,93–1,58 ×. **Sì.**
3. **Quota del compagno** 8–20% dei colpi: 10,1–16,9%; suoi errori 0,6–3,8% (≤ 6%); punti chiusi dal suo colpo 0,2–4,9%
   (≤ 6%). **Sì.**
4. **Punti vinti entro ±8** dal singolo: da −7,8 a 0. **Sì, al limite a casual · amatore (−7,8).**
5. **Niente scambi infiniti**: 0% di punti chiusi a 60 colpi; scambio medio 0,99–1,24 × singolo (≤ 1,4). **Sì.**
6. **Chi non fa il gesto non perde**: `doubles` e `doubles-noswing` identici a Casual e Pro; a Evento piccole differenze
   perché il livello Evento si adatta e dipende dall'ordine delle partite simulate (come nel piano). **Sì.**

## 3. Prove

- Test del gioco: `natpf-tennis/test/natpf-b49-doppio.test.mjs` (3: scelta di base e da indirizzo, pressione e anello per
  modalità, colpo del compagno che non aggiunge un colpo di chi gioca). Il piano chiedeva anche
  `natpf-b49-doppio-motore.test.mjs` (posizionamento, riga, B49.2/B49.4): **non scritto**; le misure sopra coprono il
  bilanciamento.
- Prova nel browser dedicata al doppio (B49.6): **non scritta**. Il pannello dello stand con la voce nuova è coperto da
  `tools/e2e/natpf-stand-layout.mjs` e `natpf-fiera-layout.mjs` (14.8).

## 4. Cosa non è provato

- Persone vere: le misure sono giocatori simulati. Il caso più stretto è casual · amatore (−7,8 punti sul singolo).
- Telefoni veri, Windows vero, ledwall.
- Nessuna prova nel browser fa vedere l'anello azzurro durante uno scambio vero.
