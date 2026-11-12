# Misure del B25 (stesso schermo tra due persone)

Script che fanno i numeri di `docs/b25/stesso-schermo-equilibrio.md`. Usano il banco dei due umani dell'audit B19
(`../b19/due-umani.mjs`: motore vero senza grafica, due persone simulate nello stesso schermo) e non cambiano nessun file
del gioco: opzioni, fasce e valori di prova si impostano solo in memoria.

Da `natpf-tennis`, dopo `npm ci`:

```sh
node --import ./test/register.mjs scripts/audit/b25/impronte.mjs [--partite=20] [--punti=120] [--regole=prima,oggi]
node --import ./test/register.mjs scripts/audit/b25/misure.mjs <gruppo> [--partite=1] [--semi=7001,7103,7207] [--formato=fiera|classico] [--game=1]
```

`--game=2` vuol dire due game per vincere (al meglio di 3); vale per i gruppi dell'aiuto, delle tattiche e tra pari.

| file | cosa fa |
|---|---|
| `impronte.mjs` | Controllo «con tutto spento non cambia niente». Impronta (sha1) di ogni punto e di ogni colpo di una serie di partite con semi fissi: nello stesso schermo (6 coppie, formato in fiera e classico) e contro la CPU (Casual, Pro, Leggenda; 4 profili). `--regole=prima` spegne a mano le due regole del B25 che valgono sempre (colpo super sulla forza relativa, preparazione che non conta): le impronte devono essere quelle di `f08243a`. `--regole=oggi`: il gioco com'è, con le opzioni spente e le fasce uguali. |
| `misure.mjs pari` | Tra pari con le regole di prima e di oggi: i due lati, come finiscono i punti, durate. |
| `misure.mjs super` | Colpo super: gioco normale, «ogni tanto fortissimo» (un colpo su cinque), «sempre fortissimo»; prima e oggi; soglie da 1,2 a 1,5 volte; chi vince. |
| `misure.mjs preparazione` | Chi porta sempre indietro il braccio contro chi non lo fa mai, prima e oggi. |
| `misure.mjs campo` | Campo aperto spento e acceso: vincenti, errori provocati, colpi a punto, durate, i due lati (5 semi), tattiche (piazza, mira le righe, al centro, sempre fortissimo, palle corte). |
| `misure.mjs battitore` | Revisione: con il campo aperto quanto vale battere e battere per primo. Formato classico (1 game e al meglio di 3) e in fiera; campo aperto spento, acceso con un battitore per game (com'era prima della revisione, `openTuning.altServe = false`) e acceso con il servizio ogni due punti (in gioco). |
| `misure.mjs campo-prove` | Altri valori del campo aperto: `--prove=speed:react:stretchCost:reach,…` `--profilo=medio`. |
| `misure.mjs aiuto` | Aiuto al più giovane: varianti 0, A, B, C per bambino–adulto, ragazzo–adulto, bambino–ragazzo. |
| `misure.mjs aiuto-altro` | L'aiuto con il campo aperto acceso; i soli punti di vantaggio (15-0, 30-0, 40-0); un adulto segnato «Bambino». |
| `misure.mjs aiuto-prove` | Altri valori per una coppia: `--coppia=bambino:adulto --profili=bambino:medio --prove='{"span":2}|{"head":1,"late":0.06}'`. |
| `misure.mjs tutti` | Tutti i gruppi di fila (circa un'ora con 4 processori condivisi). Meglio un gruppo per volta: di fila nello stesso processo la memoria non è bastata (`node --max-old-space-size=6144 …` se serve). |

«prima» vuol dire le regole di `f08243a` rimesse a mano (`engine.natpfSuperRel = false`, `engine.natpfNoPrep = false`).

`risultati/` (11/11/2026):

| file | cosa c'è |
|---|---|
| `impronte-prima-f08243a.txt` | `impronte.mjs` sul commit `f08243a`, **prima** di ogni modifica. |
| `impronte-dopo.txt` | `impronte.mjs` con il motore di oggi: le righe «super e preparazione come prima» e quelle contro la CPU hanno le stesse impronte del file sopra; le righe «regole di oggi» cambiano solo per le due regole che valgono sempre. |
| `misure-fiera.txt` | `misure.mjs` gruppi `pari`, `super`, `preparazione`, `campo`, `aiuto`, formato in fiera (quello di base nello stesso schermo). |
| `misure-altre.txt` | `misure.mjs aiuto-altro`: l'aiuto con il campo aperto acceso (nessuno, A, B, C), i soli punti di vantaggio, l'adulto segnato «Bambino». Le righe «campo aperto · variante C» sono state misurate **prima** della correzione della variante C per il campo aperto (`HELP.C.open`): per il bambino contro l'adulto mostrano la C con il 15-0 (53,6%); la C di oggi lì è uguale alla riga della variante A (39,7%). |
| `misure-battitore.txt` | Revisione (12/11): `misure.mjs battitore`, due serie di semi. |
| `misure-aiuto-meglio-di-3.txt` | Revisione (12/11): `misure.mjs aiuto-prove --game=2`, bambino contro adulto medio al meglio di 3, formato classico e in fiera: nessun aiuto, A, B, C e due prove più forti. |
| `legend.txt` | `npm run audit:legend` (contro la CPU): 69/69 (rifatto il 12/11 dopo la revisione: uscita identica). |

Cambi al banco dell'audit B19 (`../b19/due-umani.mjs`), tutti spenti di base (le impronte dei profili di sempre non
cambiano):

- `liveTyp`: il colpo abituale del robot si impara giocando, come sul telefono (mediana degli ultimi 24 colpi normali);
  prima restava fisso, e «tira sempre fortissimo» sembrava sempre più forte del proprio solito;
- `strongP`: ogni tanto un colpo fortissimo cercato (probabilità a colpo), come chi vuole il colpo super;
- `aimLo`, `aimHi`: quanto vicino alla riga mira chi piazza (di base da 0,7 a 1 della mira piena, come sempre).

Il profilo «ragazzo» (10–14 anni) è un'ipotesi di `misure.mjs`, tra il bambino e l'adulto medio del banco: errore di tempo
±0,115 s, gesto da 560 °/s.

Limiti: i profili sono simulati (non si sa quale somigli al visitatore, e il bambino e il ragazzo sono ipotesi); il robot
sbaglia il tempo sempre allo stesso modo, anche quando corre o tira forte; chi «piazza» nel banco mira dalla parte opposta
a dove l'altro ha appena colpito. Niente di tutto questo è provato con persone.
