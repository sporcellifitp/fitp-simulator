# Bambino a Evento e Casual con 24 semi (201–224) × 120 punti, al meglio di 3 game: scambio caldo spento → acceso
# node --import ./test/register.mjs scripts/audit/b42/scambi-lunghi.mjs --cpu --livelli=evento,casual --profili=bambino --semi=201,…,224 --caldo=no --salva=spento.json
# node --import ./test/register.mjs scripts/audit/b42/scambi-lunghi.mjs --cpu --livelli=evento,casual --profili=bambino --semi=201,…,224 --confronta=spento.json

### Contro la CPU (al meglio di 3 game) · scambio caldo: base

| riga | serie | punti (interrotti a 150 colpi) | colpi: media · metà · 9 su 10 · max | oltre 20 | oltre 30 | scambi oltre 20 chiusi entro il 35° | vincenti chi gioca · CPU | in rete chi gioca · CPU | fuori chi gioca · CPU | punti vinti chi gioca | s a punto | partita: media · 9 su 10 (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| evento · bambino | X | 2880 (0) | 7,7 → 7,3 · 6 · 17 → 16 · 48 → 33 | 6,4 → 5,2% | 1,3 → 0,1% | 94 → 100% | 10,9 → 13,2 · 36,9 → 36,4% | 0,2 → 0,1 · 6,4 → 6,6% | 16,9 → 16,5 · 28,6 → 27,4% | 45,9 → 47,1% | 13 → 12,4 | 216,4 → 213 · 315,9 → 323,7 |
| casual · bambino | X | 2880 (0) | 7,7 → 7,4 · 6 → 5 · 17 → 16 · 50 → 36 | 5,9 → 5,5% | 1,2 → 0,2% | 90 → 99,4% | 11,3 → 15,1 · 33,7 → 32,5% | 0,2 → 0,1 · 6,8 → 7,3% | 17,4 → 15,7 · 30,6 → 29,3% | 48,7 → 51,7% | 13 → 12,5 | 214,2 → 213,1 · 322,7 → 334 |

colpi super dei telefoni (quota dei colpi): prima del 20° colpo → dal 20° in poi; perché no, dal 20° in poi
cpu|evento|bambino|X: 0% → 0% (334 colpi) · gesto non abbastanza forte 100%
cpu|casual|bambino|X: 0% → 0% (386 colpi) · gesto non abbastanza forte 100%

