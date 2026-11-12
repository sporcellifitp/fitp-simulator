# B24 · Lob & Drop come personaggi in campo

Richiesta dell'utente dell'11/11/2026: «vorrei prevedere la possibilità di usare Lob & Drop come due personaggi del
campo». Fatto il 12/11/2026 sul ramo di lavoro `b24-lob-drop`, partendo da `9b8f9cb` (versione 2026-11-12.2). I file
di versione e i documenti di piano non sono stati toccati: la versione nuova e i pacchetti si fanno all'unione.

Foto di riferimento: `docs/riferimenti/lob-drop-2026-11-11.webp`. Drop è blu, con la fascia bianca in testa. Lob è
giallo, con la visiera blu e gli occhiali.

## In breve

- Nelle Opzioni c'è una riga nuova, **«Personaggi in campo: Classici · Lob & Drop»**. Di base è «Classici».
- Con «Lob & Drop» chi gioca è **Drop** e l'avversario (la CPU o il Player 2) è **Lob**.
- È **solo disegno**: il gioco, i colpi, il riconoscimento dei gesti e la rete tra due computer non cambiano.
- Con «Classici» l'immagine è **identica** a prima, pixel per pixel (controllato su 9 scene).
- Le mascotte sono costruite nel codice, come i personaggi classici: nessun file nuovo da scaricare.

## Come si attiva

| cosa | come |
|---|---|
| Accendere | Menu → **Opzioni** → riga **«Personaggi in campo»** → **«Lob & Drop»**. Vale subito, anche dietro il menu. |
| Spegnere | Stessa riga → **«Classici»**. |
| Valore di base | «Classici». |
| Dove resta salvata | Sul computer, chiave `natpf-tennis.personaggi` (`lobdrop` oppure `sempre`). Resta anche dopo aver chiuso il gioco e dopo «Nuovo giocatore». |
| Dall'indirizzo | `?personaggi=lobdrop` oppure `?personaggi=sempre`. Vale per quell'avvio e non tocca il valore salvato. Se poi si sceglie dalle Opzioni, vale la scelta. |

## Chi è chi

| modo di gioco | con «Classici» | con «Lob & Drop» |
|---|---|---|
| Contro la CPU | chi gioca bianco, CPU blu | chi gioca **Drop**, CPU **Lob** |
| Stesso schermo | Player 1 bianco, Player 2 con i dettagli rosa | Player 1 **Drop**, Player 2 **Lob** |
| Sfida tra due computer | Player 1 bianco, Player 2 rosa | Player 1 **Drop**, Player 2 **Lob** |

**Sfida tra due computer: scelta fatta.** Ogni computer disegna i personaggi secondo la **sua** opzione. Niente passa
in rete: nessun messaggio nuovo e nessun campo nuovo. È la via senza rischi: un computer con una versione di prima non
si accorge di niente, e non può succedere che un dato in più rompa la partita. La conseguenza è che i due schermi
possono essere diversi (uno con le mascotte, l'altro con i personaggi classici) se le due opzioni sono diverse. Su
ogni schermo che ha «Lob & Drop» acceso, Drop è sempre il Player 1 (chi ha aperto la partita) e Lob il Player 2: chi
entra come Player 2 vede sé stesso come Lob.

Dove oggi si vede il personaggio, segue la scelta: in campo, nei ritratti del tabellone, del menu e di fine partita.
I **nomi** («Player 1», «CPU», «Player 2» o il nome scritto da chi gioca) restano quelli di prima: sono i ruoli, non i
nomi dei personaggi. Le schede dei gesti del tutorial mostrano un disegno a parte di una persona con il telefono, non
il personaggio in campo: non cambiano.

## Come sono fatti

I personaggi classici sono fatti nel codice con forme semplici (`natpf-tennis/src/natpf/natpf_character.js`): sei
parti che il motore muove (testa, busto, due mani, due piedi) e braccia e gambe a due pezzi che le seguono. Lob e Drop
sono fatti **nello stesso modo e sullo stesso scheletro** (`natpf-tennis/src/natpf/natpf_lob_drop.js`): le sei parti e
gli arti sono gli stessi oggetti, cambiano solo i pezzi disegnati sopra.

- **Uguale per tutti e due**: testa grande, corpo a pera, braccia e gambe corte e grosse (gli stessi pezzi del
  tennista, una volta e mezza più spessi), mani a manopola con tre dita e il pollice, piedi grandi e tondi, occhi
  grandi con il contorno nero e l'iride colorata, bocca aperta che sorride con la lingua.
- **Drop**: blu, fascia bianca inclinata con la scritta DROP, ciuffo sopra la fascia, polsini bianchi, occhi verdi.
- **Lob**: giallo, testa a goccia con la punta piegata, visiera blu con la tesa e la scritta LOB, occhiali tondi neri,
  occhi azzurri.
- **Animazioni**: corsa, dritto, rovescio, servizio, esultanza e le espressioni del viso sono quelle dei personaggi di
  sempre, perché sono calcolate sulle parti e non sui pezzi disegnati.
- **Racchetta e impatto**: la racchetta è la stessa, nella stessa mano, alla stessa distanza. L'impatto sulla palla è
  quello di prima (il gioco non guarda il disegno).
- **Mancini**: come per i personaggi classici il mancino è lo specchio del destro, quindi la racchetta passa nella
  mano sinistra. La scritta sulla fascia si gira da sola per restare leggibile.
- **Arti**: le mascotte hanno braccia e gambe, quindi non è servito togliere niente. Sono corte nella foto e più lunghe
  nel gioco (vedi sotto).
- **Peso**: nessun modello e nessuna immagine nel pacchetto. La sola immagine è la scritta DROP / LOB, disegnata al
  volo dal gioco (128 × 32 punti). Le forme sono condivise tra i personaggi e nascono la prima volta che si sceglie
  «Lob & Drop»: con «Classici» in scena non c'è niente in più. Niente viene creato a ogni fotogramma.

## Cosa non cambia nel gioco

- La scelta è letta solo da chi disegna (`natpf_character.js`, il menu e i ritratti). Fisica, colpi, esiti, sorteggi e
  riconoscimento dei gesti non la leggono.
- Prova nel browser: una partita senza persone a passi fissi e sorteggi fissi (un game intero, 8 colpi) dà la
  **stessa impronta** di palla, giocatori e punteggio con «Classici», con «Lob & Drop» e sul commit di prima
  (`9b8f9cb`): `105f1405` in tutti e tre i casi.
- Con «Classici» il disegno è **identico a `9b8f9cb`** su 9 scene ferme (in campo, dritto, servizio, esultanza, colpo
  dell'avversario, da vicino i due personaggi, stesso schermo, due persone): stessa impronta dei pixel. È identico
  anche dopo essere passati da «Lob & Drop» e tornati indietro.

## Fogli di immagini

In `docs/b24/img/` (webp, tutti sotto i 300 kB). Li rifà `FOGLI=cartella node tools/e2e/natpf-lob-drop.mjs`.

| foglio | cosa mostra |
|---|---|
| `drop-da-vicino.webp` | la foto e Drop nel gioco: davanti, di lato, dietro |
| `lob-da-vicino.webp` | la foto e Lob nel gioco: davanti, di lato, dietro |
| `gesti-da-vicino.webp` | Drop e Lob durante dritto, servizio, esultanza e rovescio |
| `mancini.webp` | Drop e Lob mancini: specchiati, racchetta nella sinistra, scritta leggibile |
| `in-campo.webp` | dalla camera di gioco: fermo, dritto, servizio ed esultanza di Drop, dritto di Lob (anche ingranditi 3 volte), stesso schermo |
| `confronto-classici.webp` | «Classici» e «Lob & Drop» a confronto, contro la CPU e nello stesso schermo |

Le immagini sono state guardate una per una: le due mascotte si riconoscono dal colore, dalla forma della testa, dalla
fascia bianca (Drop) e dalla visiera con gli occhiali (Lob), anche da lontano e da dietro.

## Cosa della foto non è stato riprodotto, e perché

| cosa | perché |
|---|---|
| Il marchio dell'evento stampato sul petto | Servirebbe l'immagine del marchio (un file in più) e il permesso di usarlo sul personaggio. Si può aggiungere se l'utente dà il file. |
| Il tessuto di peluche | Il gioco usa colori pieni con un bordo di luce morbido, come per i personaggi classici. Un'immagine del tessuto peserebbe e da lontano non si vedrebbe. |
| Le proporzioni esatte | Nella foto la testa è quasi metà del pupazzo e le gambe sono cortissime. Nel gioco lo scheletro è quello dei personaggi classici (serve per avere le stesse animazioni e lo stesso impatto), quindi il corpo e le gambe sono più lunghi. La testa è stata ingrandita quanto si poteva. |
| Le mani con quattro dita aperte | Mano a manopola con tre dita corte e il pollice: è chiusa sul manico della racchetta e da lontano si legge meglio. |
| I denti e i ricami fini degli occhi | Troppo piccoli per vedersi in campo. Restano il contorno nero, l'iride colorata, la pupilla e i riflessi. |
| La visiera di Lob girata di lato con la scritta sul fianco | Nel gioco la visiera è appena inclinata e la scritta sta davanti, sopra la tesa, per leggersi. |
| Il ciuffo di Drop | Semplificato: tre forme tonde sopra la fascia, dalla stessa parte della foto. |
| Le due misure (grande e piccolo) | Nel gioco i due personaggi hanno la stessa altezza, come quelli di sempre. |

Un limite da sapere: **Drop è blu su un campo blu**. Si stacca meno del personaggio bianco di sempre. Lo aiutano il suo
blu, più chiaro di quello del campo, la fascia e i polsini bianchi e l'ombra. Chi gioca vede Drop di spalle: la scritta DROP si legge
solo da davanti (per esempio nei replay o nello stesso schermo, sul personaggio lontano).

## Prestazioni

Misure fatte nel browser del banco di prova, con la grafica in software e la macchina occupata da altri lavori: i
tempi sono lunghi e servono solo per il confronto tra le due scelte.

| misura (stesso fotogramma) | Classici | Lob & Drop |
|---|---|---|
| chiamate di disegno | 248 | **219** |
| triangoli | 1.454.220 | **1.443.812** |
| tempo del disegno, giro A (il più breve di 14 disegni per 3 giri alternati) | 1441,8 ms | 1444,8 ms |
| tempo del disegno, giro B (ultimo giro completo della prova) | 1099,5 ms | 1150,1 ms |
| fotogrammi al secondo con il gioco che gira, giro A (il migliore di 2) | 0,79 | 0,90 |
| fotogrammi al secondo con il gioco che gira, giro B | 0,80 | 0,77 |

Le mascotte hanno **meno** pezzi e meno triangoli dei personaggi classici. Sul tempo le due scelte sono pari entro
l'errore della misura: con le mascotte il tempo del disegno è +0,2% e +4,6% nei due giri, i fotogrammi al secondo +14%
e −4% (il segno cambia da un giro all'altro). Quasi tutti i triangoli sono dell'arena e del pubblico, non dei personaggi. La prova accetta fino al 12% sul
tempo e al 10% sui fotogrammi al secondo.

Le misure di tempo sono state rifatte più volte perché la macchina era occupata da altri lavori. In due giri
precedenti, a macchina molto carica e con la misura di prima (mediana, fotogrammi contati in una finestra fissa), una
volta il tempo del disegno è risultato peggiore per le mascotte (1212 → 1723 ms) e una volta migliore (1477 → 1220 ms),
e i fotogrammi al secondo erano 0,7 e 0,6 contati su quattro fotogrammi: quella prova è **fallita una volta** per
questo. Ora la prova prende il disegno più breve a giri alternati e misura i fotogrammi al secondo tra il primo e
l'ultimo fotogramma. I conti di chiamate e triangoli non dipendono dal carico e sono sempre stati uguali.

**Peso del pacchetto**: il programma del gioco cresce di 15,3 kB (5,2 kB compresso), da 1.720.572 a 1.735.885 byte.
Nessun altro file.

## Prove

Ultimo giro, il 12/11/2026: gioco 1196 test (1195 passati, 1 saltato come prima: vuole `npm ci` in `tools/lan`),
sito 205 su 205, `npm run build` riuscito, `npm run audit:legend` «Tutti i criteri rispettati», prova nel browser
72 verifiche su 72 con il confronto con `9b8f9cb`.

- **Test di unità** (11, in `natpf-tennis/test/natpf-lob-drop.test.mjs` e `natpf-personaggi-opzione.test.mjs`):
  opzione e chiave salvata, parametro dell'indirizzo, chi è chi contro la CPU e tra due persone, pezzi e colori delle
  due mascotte, stesso scheletro e stesse animazioni (parti, racchetta e mano identiche al tennista in corsa, colpi,
  servizio, esultanza), mancini, viso, prima persona, ritratti, riga nelle Opzioni, nessun file nuovo nel pacchetto.
- **Prova nel browser** `tools/e2e/natpf-lob-drop.mjs`: scene ferme e ripetibili, confronto con il commit di prima,
  opzione e parametro, ritratti, mancini, partita a sorteggi fissi, costo del disegno e fotogrammi al secondo.

```sh
cd tools/e2e
CHROMIUM_PATH=/opt/pw-browsers/chromium node natpf-lob-drop.mjs            # tutta la prova
# confronto con il commit di prima: impronte fatte sul gioco di 9b8f9cb, poi confronto
GAME=/percorso/del/gioco/a/9b8f9cb/natpf-tennis BASELINE=/tmp/prima.json CHROMIUM_PATH=… node natpf-lob-drop.mjs
CONFRONTA=/tmp/prima.json CHROMIUM_PATH=… node natpf-lob-drop.mjs
SOLO=1 …     # solo le scene ferme e la partita      COSTO=1 …   # solo costo e fotogrammi al secondo
FOGLI=../../docs/b24/img …                           # rifà i fogli di immagini
```

## Cosa non è provato

- **Niente è stato visto da una persona su uno schermo vero.** Le immagini vengono dal browser del banco di prova
  (grafica in software) e sono state guardate dall'agente.
- **Telefono Android, Windows (installer), ledwall**: non provati. Sui fotogrammi al secondo di un computer o di un
  telefono vero non c'è una misura: ci sono i conti di chiamate e triangoli, che sono più bassi di prima.
- **Sfida tra due computer veri** con le mascotte: non provata. La rete non è stata toccata e i test di unità
  controllano chi è chi tra due persone; la prova nel browser copre la CPU e lo stesso schermo.
- **La scritta DROP / LOB** usa un carattere del computer (Arial o simile): su un computer senza quel carattere il
  disegno delle lettere può cambiare un poco.
- **Doppio**: i compagni seguono la stessa regola (dalla parte del Player 1 Drop, dall'altra Lob), ma con le mascotte
  non è stato guardato.
- **Il giudizio «si riconoscono»** è dell'agente sulla foto: l'ultima parola è dell'utente.
