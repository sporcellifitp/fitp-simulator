# Misure del B20 (1v1 nello stesso schermo)

`scambio-caldo.mjs` misura l'opzione «Scambio che si scalda» (`src/natpf/natpf_hot_rally.js`, spenta di base) con il
banco dei due umani dell'audit B19 (`../b19/due-umani.mjs`: motore vero senza grafica, due persone simulate nello stesso
schermo). Non cambia nessun file del gioco: accende o spegne l'opzione solo in memoria (`engine.natpfHotRally`).

Da `natpf-tennis`, dopo `npm ci`:

```sh
node --import ./test/register.mjs scripts/audit/b20/scambio-caldo.mjs [--partite=1] [--semi=7001,7103,7207] [--coppie=bambino,medio,amatore,tennista] [--modi=spenta,accesa] [--formato=fiera|classico]
```

Per ogni coppia (due persone dello stesso livello) e per l'opzione spenta e accesa stampa: colpi a punto (media, metà,
9 su 10, massimo), punti oltre 30 colpi, durata del punto e della partita a 1 game, punti e partite del Player 1,
e l'«impronta» (riassunto di tutti i punti giocati).

`risultati/` (11/11/2026):

| file | cosa c'è |
|---|---|
| `prima-dell-opzione.txt` | Opzione spenta, misurata **prima** di aggiungere l'opzione al motore (commit `ef4d32f`). |
| `scambio-caldo.txt` | Spenta e accesa, con il motore di oggi. Le impronte di «spenta» sono uguali a quelle del file sopra: spenta, la partita è identica punto per punto. |
| `risposta.txt`, `risposta-altri-semi.txt` | `../b19/misure.mjs risposta` dopo la correzione della risposta del Player 2 (B20, punto A1): nessuna risposta diventa più una schiacciata; con soli tagliati il Player 1 vince il 50,6–51,7% dei punti (prima 60–62%, `../b19/risultati/risposta.txt`). |
| `equilibrio-lati.txt` | 720 partite per riga (4 semi) tra medi e tra amatori: Player 1 e Player 2 alla pari anche con l'opzione accesa. |

Limiti: i profili sono simulati (non si sa quale somigli al visitatore); il robot sbaglia il tempo sempre allo stesso
modo, anche con la palla più veloce, mentre una persona vera sbaglia di più: con persone vere lo scambio caldo dovrebbe
chiudere prima di quanto dicono questi numeri. Non provato con persone.
