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
| `misure.mjs aiuto` | Aiuto al più giovane (solo di gioco, decisione del 12/11): nessun aiuto, A (solo margine sul tempo, per confronto), G (in gioco) per bambino–adulto, ragazzo–adulto, bambino–ragazzo. |
| `misure.mjs aiuto-altro` | L'aiuto con il campo aperto acceso (nessuno, A, G con i valori che ha lì); un adulto segnato «Bambino». |
| `misure.mjs aiuto-prove` | Altri valori per una coppia: `--coppia=bambino:adulto --profili=bambino:medio --prove='{}|{"span":2,"late":0.1}|{"span":2,"late":0.1,"slow":1.1,"deep":1}'` (`{}` = nessun aiuto); `--campo=aperto` accende il campo aperto. Sotto ogni riga, come finiscono i punti e il piano del più giovane a ogni colpo («smash» e «volley» salgono se la palla dell'altro diventa un pallonetto). |
| `misure.mjs tutti` | Tutti i gruppi di fila (circa un'ora con 4 processori condivisi). Meglio un gruppo per volta: di fila nello stesso processo la memoria non è bastata (`node --max-old-space-size=6144 …` se serve). |

«prima» vuol dire le regole di `f08243a` rimesse a mano (`engine.natpfSuperRel = false`, `engine.natpfNoPrep = false`).

Leve dell'aiuto (`natpf_duo_rules.HELP`): `span` × finestra del tempo, `late` secondi in più in ritardo, `slow` × tempo
di volo della palla che va verso il più giovane, `deep` metri più in fondo il suo colpo riuscito. **Nessun punto di
vantaggio**: il 15-0 e il 30-0 delle varianti B e C dell'11/11 sono tolti dal gioco e dal banco (decisione dell'utente
del 12/11); i loro numeri restano nei file dell'11/11 qui sotto, che non si possono più rifare.

`risultati/` (11/11/2026, con le aggiunte del 12/11):

| file | cosa c'è |
|---|---|
| `impronte-prima-f08243a.txt` | `impronte.mjs` sul commit `f08243a`, **prima** di ogni modifica. |
| `impronte-dopo.txt` | `impronte.mjs` con il motore di oggi (rifatto il 12/11 dopo l'aiuto solo di gioco: uscita identica): le righe «super e preparazione come prima» e quelle contro la CPU hanno le stesse impronte del file sopra; le righe «regole di oggi» cambiano solo per le due regole che valgono sempre. |
| `misure-fiera.txt` | `misure.mjs` gruppi `pari`, `super`, `preparazione`, `campo`, `aiuto`, formato in fiera (quello di base nello stesso schermo). Il gruppo `aiuto` è quello dell'11/11, con le varianti B e C (punti di vantaggio) che non esistono più: vale `misure-aiuto-gioco.txt`. |
| `misure-altre.txt` | Dell'11/11, superato da `misure-aiuto-gioco.txt`. `misure.mjs aiuto-altro` di allora: l'aiuto con il campo aperto acceso (nessuno, A, B, C), i soli punti di vantaggio, l'adulto segnato «Bambino». Le righe «campo aperto · variante C» sono state misurate **prima** della correzione della variante C per il campo aperto (`HELP.C.open`): per il bambino contro l'adulto mostrano la C con il 15-0 (53,6%); la C di oggi lì è uguale alla riga della variante A (39,7%). |
| `misure-battitore.txt` | Revisione (12/11): `misure.mjs battitore`, due serie di semi. |
| `misure-aiuto-meglio-di-3.txt` | Revisione (12/11, prima della decisione sull'aiuto solo di gioco): `misure.mjs aiuto-prove --game=2`, bambino contro adulto medio al meglio di 3, formato classico e in fiera: nessun aiuto, A, B, C e due prove più forti. Le righe con i punti di vantaggio non si possono più rifare; quelle di oggi sono in fondo a `misure-aiuto-gioco-prove.txt`. |
| `misure-aiuto-gioco.txt` | **Aiuto solo di gioco (12/11)**: `misure.mjs aiuto` e `aiuto-altro`, due serie di semi (di base e `--semi=8101,8203,8317`), 900 partite per riga: nessun aiuto, A, G per le cinque coppie; con il campo aperto acceso; l'adulto segnato «Bambino». |
| `misure-aiuto-gioco-prove.txt` | **Le combinazioni provate (12/11)** per il bambino contro l'adulto medio, `misure.mjs aiuto-prove`, 900 partite per riga: tre serie di semi a 1 game in fiera, due con il campo aperto acceso, al meglio di 3 in fiera e classico, 1 game classico. |
| `legend.txt` | `npm run audit:legend` (contro la CPU): 69/69 (rifatto il 12/11 dopo la revisione e dopo l'aiuto solo di gioco: uscita identica). |

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
