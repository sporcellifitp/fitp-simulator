# Misure dell'audit B19 (1v1 tra utenti)

Script che rifanno i numeri principali di `docs/b19/audit-1v1-utenti.md`. Usano il motore vero senza grafica
(`../headless-engine.mjs`) e non cambiano nessun file del gioco: le regole di prova (aiuto per giocatore, vantaggio di
punti, corsa più lenta) sono applicate solo in memoria.

Si lanciano da `natpf-tennis`, dopo `npm ci`:

```sh
node --import ./test/register.mjs scripts/audit/b19/misure.mjs <gruppo> [--partite=1] [--semi=7001,7103,7207]
node --import ./test/register.mjs scripts/audit/b19/ritardo-p2.mjs [--n=300] [--d=0,30,50,100,200,irr] [--local=1]
node --import ./test/register.mjs scripts/audit/b19/agitare.mjs [--partite=30] [--ritmi=800x3,650x2,800x4]
node --import ./test/register.mjs scripts/audit/b19/partite-distanza.mjs [--pairs=bambino:bambino] [--fair=0,1] [--first=player] [--n=200]
```

| file | cosa misura | voci del rapporto |
|---|---|---|
| `due-umani.mjs` | Il banco: due persone simulate nello stesso schermo (`play`, `many`, `sum`). Profili: bambino, impreciso, umano, amatore, medio, preciso, tennista. Non si lancia da solo. | tutte |
| `misure.mjs pari` | Tra pari: i due lati, punti a game, come finiscono i punti, vincenti veri. | 2, 3, «Cosa va bene» |
| `misure.mjs debole` | Livelli diversi; vantaggio di punti; prototipo dell'aiuto per giocatore. | 4 |
| `misure.mjs risposta` | Risposte al servizio che diventano schiacciata, Player 1 contro Player 2. | 1 |
| `misure.mjs battitore` | Chi batte: formato di base e formato in fiera, punto decisivo. | 6 |
| `misure.mjs tattiche` | Mirare, tirare forte, palle corte, pallonetti; corsa più lenta. | 2 |
| `misure.mjs tempo` | Un ritardo o un anticipo fisso del gesto. | 4 |
| `misure.mjs rimbalzo` | Quanto dopo il rimbalzo cade il momento giusto del colpo. | 5 |
| `misure.mjs durate` | Durata e colpi a punto per formato. | 3 |
| `misure.mjs tutti` | Tutti i gruppi di fila (circa 10–15 minuti). | |
| `ritardo-p2.mjs` | Sfida tra due computer: gesto perfetto del Player 2 con ritardo. | D1 |
| `agitare.mjs` | Telefono scosso senza guardare la palla (catena vera del telefono, `test/phone-sim.mjs`). | 7 |
| `due-umani-distanza.mjs` | Secondo banco: il robot fa il gesto quando la palla è a una distanza fissa dal personaggio, come `../rally-balance.mjs`. Non si lancia da solo. | 3, 6 |
| `partite-distanza.mjs` | Partite con il secondo banco: chi batte, durate, come finiscono i punti, personaggi più lenti. | 2, 3, 6 |

`risultati/` contiene le uscite del 10/11/2026 sul commit `f0e66d3` (versione 2026-11-10.2), con i valori di base.

Limiti:
- i profili sono simulati: non si sa quale somigli al visitatore;
- in `due-umani.mjs` il robot fa il gesto attorno al momento che il motore considera giusto (`timeToContact`), più un
  errore; in `due-umani-distanza.mjs` quando la palla è a una distanza fissa dal personaggio. Il profilo «umano» lo fa
  0,25 s dopo il rimbalzo. Dove i due banchi non concordano (chi batte tra bambini, colpi a punto tra due bravi) il
  rapporto lo dice;
- i banchi interrompono gli scambi a 150 e a 80 colpi; nel gioco vero quel limite non c'è;
- con 4 processori condivisi ogni gruppo dura da 30 secondi a 3 minuti.

Le prove nel browser degli auditor (due telefoni simulati, due sessioni per la sfida tra due computer) non sono qui:
dipendono da porte, schermate e cartelle di lavoro. I loro nomi sono nell'appendice del rapporto.
