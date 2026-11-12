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
- Dopo la revisione del 12/11: la racchetta **non resta più dentro la testa grande** delle mascotte, gli occhi seguono
  la curva della testa, nel tabellone la linguetta ha il colore del personaggio. Vedi «Revisione» in fondo.

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

Dove oggi si vede il personaggio, segue la scelta: **in campo** (anche dietro il menu) e nel **tabellone**, dove con
«Lob & Drop» la linguetta colorata della riga è blu per chi è Drop e gialla per chi è Lob (con «Classici» resta gialla
per chi guarda e rosa per l'altro, come prima).
I **ritratti** (i disegni piccoli del viso) seguono la scelta nel codice, ma **oggi nessuna schermata li mostra**: a
1280 × 720 sono nascosti nel menu, nei passi della lobby, in partita e a fine partita, e a schermo si leggono solo i
nomi. Era così anche prima di questo lavoro (lo stile della pagina non è stato toccato): se un giorno torneranno a
schermo, mostreranno già Drop e Lob.
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
- **Racchetta e impatto**: la racchetta è la stessa, nella stessa mano. L'impatto sulla palla è quello di prima (il
  gioco non guarda il disegno). Le pose della racchetta sono pensate per la testa piccola del tennista: con la testa
  grande delle mascotte la racchetta si scosta dalla testa solo quanto serve, e la mano la segue (vedi «Racchetta e
  testa grande»).
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

- Dopo la revisione, altre due partite a sorteggi fissi, giocate dai robot con il lavoro di prima del disegno fatto
  a ogni passo (quindi anche lo scostamento della racchetta): contro la CPU (seme 31337, 2600 passi, 36 colpi)
  `714cce1b` e nello stesso schermo (seme 555, 2600 passi, 34 colpi) `c41965d4`, uguali con «Classici», con
  «Lob & Drop» e su `9b8f9cb`.
- Una cosa da sapere per chi fa prove a seme fisso: è solo disegno, ma **la creazione dei pezzi consuma numeri
  casuali** (la libreria grafica sorteggia un nome per ogni materiale nuovo). Succede al primo disegno con un aspetto
  nuovo (il Player 2 rosa, oppure il primo passaggio a «Lob & Drop»). Nel gioco non conta; in una prova a seme fisso
  sposta la sequenza dei sorteggi. Per questo la prova nello stesso schermo fa un disegno «a vuoto» prima del seme.

## Racchetta e testa grande

Le pose della racchetta (attesa, colpi, servizio) sono nate per la testa del tennista. La testa di Lob e di Drop è
molto più larga e profonda: nella posa d'attesa dello scambio il telaio finiva dentro il viso e ci restava.

**Come è corretto.** In un punto solo, `natpf-tennis/src/natpf/natpf_racket_clear.js`, chiamato a ogni fotogramma
prima del disegno (`updateNatpfCharacters` in `natpf_character.js`):

- la racchetta si scosta dalla testa **solo quanto serve** e solo quando la attraversa; la mano resta sul manico e il
  braccio la segue;
- lo scostamento è **morbido**: cresce al più di 7,7 cm per fotogramma e rientra al più di 15,5 cm per fotogramma,
  senza scatti; non supera 1,3 volte il raggio della testa (53 cm per Drop);
- con la **palla in arrivo** vicino alle corde lo scostamento si spegne: al colpo la racchetta è dove la mette il
  motore. Nelle due partite di prova, su 36 e 34 colpi, la distanza tra corde e palla al colpo è la stessa di prima
  in tutti i colpi;
- è **solo disegno**: si sposta il disegno della racchetta dentro il suo perno, che il motore riscrive a ogni passo.
  Il gioco non legge la posizione della racchetta per decidere un colpo. Con «Classici» e in prima persona (testa
  nascosta) non fa niente.

**Misura, con il metodo della revisione** (24 punti del telaio contro l'ellissoide della testa, a ogni passo di una
partita vera a passi fissi). «Dentro» = almeno un punto del telaio dentro la testa.

| partita (2600 passi) | Drop prima | Drop dopo | Lob prima | Lob dopo | tennista di sempre, stessi passi |
|---|---|---|---|---|---|
| contro la CPU, seme 31337 | 292 (11,2%) | **126 (4,8%)** | 293 (11,3%) | **26 (1,0%)** | 150 (5,8%) e 61 (2,3%) |
| stesso schermo, seme 555 | 512 (19,7%) | **99 (3,8%)** | 264 (10,2%) | **82 (3,2%)** | 268 (10,3%) e 174 (6,7%) |

L'ultima colonna dice quante volte, sugli stessi passi, il telaio entra nella testa piccola del tennista: ora alle
mascotte capita **meno spesso** che ai personaggi classici.
Nell'**attesa dello scambio** (la posa tenuta, quella che si vedeva): contro la CPU da 343 passi a 29, nello stesso
schermo da 440 a 35. La revisione aveva contato, con un altro orologio di prova, 476 e 287 passi su 2600.

**Il limite che resta.**

- Nei **passaggi veloci** (durante il colpo e nel ritorno dopo il colpo, pochi fotogrammi) la racchetta attraversa
  ancora la testa: lì lo scostamento è volutamente parziale, perché portarla fuori del tutto la farebbe saltare di
  40-60 cm da un fotogramma all'altro. Sono i passi «dopo» della tabella.
- Nei passi dell'attesa che restano, la racchetta sta entrando nella posa oppure la palla è in arrivo (lo scostamento
  si spegne per non spostare il colpo).
- La forma tenuta libera è l'**ellissoide della testa**: la tesa della visiera e la punta di Lob e il ciuffo di Drop
  non sono compresi, e la racchetta può sfiorarli. La tesa non è stata accorciata (è il segno che fa riconoscere Lob).
- Nell'attesa la racchetta ora sta **davanti al viso** e ne copre una parte, come per chiunque tenga la racchetta
  davanti a sé.

**Per i modelli 3D che verranno** (GLB con lo scheletro, testa ancora più grande): la funzione da riusare è

```js
import { keepRacketClear } from './natpf_racket_clear.js';
keepRacketClear(actor, forma, dt, palla, nodoTesta, nodoMano);
```

- `forma`: un ellissoide `{ rx, ry, rz, cx, cy, cz }` nel sistema del nodo della testa (semiassi = metà di larghezza,
  altezza e profondità del riquadro della testa), oppure una lista di ellissoidi (testa più cappello, orecchie…).
  Oggi la dichiara `mascotHeadShape()` in `natpf_lob_drop.js` e finisce in `actor.natpfHeadShape`: per un modello
  nuovo basta scrivere lì la sua forma.
- `nodoTesta` e `nodoMano`: per un modello con lo scheletro, l'osso della testa e quello della mano che tiene la
  racchetta (se mancano valgono le parti del tennista).
- Il tetto dello scostamento è in proporzione alla testa, quindi vale anche per teste più grandi. Il test di unità lo
  prova con una testa di semiassi 0,52 / 0,46 / 0,50, con una testa spostata e con una testa più un accessorio.
- La misura da rifare è `racketInHead(actor, forma)` (stesso file) o la parte 1b della prova nel browser.

## Fogli di immagini

In `docs/b24/img/` (webp, tutti sotto i 300 kB). Li rifà `FOGLI=cartella node tools/e2e/natpf-lob-drop.mjs`
(`FOGLIO=racchetta|vicino|mancini|campo` ne rifà un gruppo solo). Sono stati rifatti tutti dopo la revisione.

| foglio | cosa mostra |
|---|---|
| `racchetta-e-testa.webp` | gli stessi passi della stessa partita prima e dopo la correzione: attesa di Drop e di Lob, ritorno dopo il colpo, rovescio |
| `drop-da-vicino.webp` | la foto e Drop nel gioco: davanti, di tre quarti, di lato, dietro |
| `lob-da-vicino.webp` | la foto e Lob nel gioco: davanti, di tre quarti, di lato, dietro |
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

Dopo la revisione (12/11, macchina meno carica): chiamate 248 → **219**, triangoli 1.454.220 → **1.443.092**, tempo
del disegno 890,9 → 884,1 ms, fotogrammi al secondo 0,99 e 1,03 contro 1,00 e 1,01. Lo scostamento della racchetta
costa una trentina di punti e due matrici per personaggio a fotogramma: non si vede nella misura.

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

**Peso del pacchetto**: il programma del gioco cresce di 18,6 kB (6,6 kB compresso), da 1.720.572 a 1.739.196 byte
(prima della revisione 1.735.885: la correzione della racchetta e il resto pesano 3,3 kB). Nessun altro file.

## Prove

Ultimo giro, dopo la revisione del 12/11/2026: vedi i numeri in «Revisione» qui sotto.

- **Test di unità** (15, in `natpf-tennis/test/natpf-lob-drop.test.mjs` e `natpf-personaggi-opzione.test.mjs`):
  opzione e chiave salvata, parametro dell'indirizzo, chi è chi contro la CPU e tra due persone, pezzi e colori delle
  due mascotte, stesso scheletro e stesse animazioni (parti, racchetta e mano identiche al tennista in corsa, colpi,
  servizio, esultanza), racchetta fuori dalla testa grande (tre test), mancini, viso e contorno degli occhi, prima
  persona, ritratti, linguette del tabellone, riga nelle Opzioni, nessun file nuovo nel pacchetto.
- **Prova nel browser** `tools/e2e/natpf-lob-drop.mjs`: scene ferme e ripetibili, confronto con il commit di prima,
  partite a sorteggi fissi (senza persone, contro la CPU, nello stesso schermo), racchetta e testa grande, opzione e
  parametro, ritratti, mancini, costo del disegno e fotogrammi al secondo.

```sh
cd tools/e2e
CHROMIUM_PATH=/opt/pw-browsers/chromium node natpf-lob-drop.mjs            # tutta la prova
# confronto con il commit di prima: impronte fatte sul gioco di 9b8f9cb, poi confronto
GAME=/percorso/del/gioco/a/9b8f9cb/natpf-tennis BASELINE=/tmp/prima.json CHROMIUM_PATH=… node natpf-lob-drop.mjs
CONFRONTA=/tmp/prima.json CHROMIUM_PATH=… node natpf-lob-drop.mjs
SOLO=1 …     # solo le scene ferme e la partita      COSTO=1 …   # solo costo e fotogrammi al secondo
TESTA=1 …    # solo la parte 1b: racchetta e testa grande (TESTA=cpu oppure TESTA=schermo: una partita sola)
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

## Revisione (12/11/2026)

Una revisione indipendente ha rifatto le prove e ha trovato un punto bloccante e sei minori. L'utente ha chiesto in
più di chiamare l'opzione «Classici».

### Corretto

| punto | cosa è stato fatto |
|---|---|
| **Bloccante: la racchetta entrava nella testa delle mascotte** | Modulo nuovo `natpf_racket_clear.js`, un punto solo e riusabile per qualunque testa grande: vedi «Racchetta e testa grande». Telaio dentro la testa: Drop da 292 a 126 passi su 2600 e Lob da 293 a 26 contro la CPU; Drop da 512 a 99 e Lob da 264 a 82 nello stesso schermo. Nell'attesa dello scambio da 343 a 29 e da 440 a 35. Al colpo le corde sono dove erano (36 e 34 colpi su 36 e 34). Tre test di unità e la parte 1b della prova nel browser. |
| Nome dell'opzione | «Classici» al posto di «Di sempre» in tutti i testi, nei test, nella prova e in questo documento. La chiave salvata e il parametro restano `sempre`. L'avviso dice «In campo: i personaggi classici». |
| Occhi che uscivano dal profilo della testa | Il contorno nero dell'occhio è ora una calotta curva come la testa (prima un disco piatto, che ai bordi sporgeva di 8 mm e più) e gli occhi sono un poco più vicini e più piccoli (Drop 0,128 / 0,095, Lob 0,12 / 0,086). Test sul bordo del contorno. |
| Linguetta del tabellone | Con «Lob & Drop» è del colore del personaggio della riga: blu per Drop, gialla per Lob (anche nello stesso schermo e per chi è entrato come Player 2). Con «Classici» resta com'era. Cambia subito quando si cambia l'opzione. |
| Prova a sorteggi fissi anche nello stesso schermo | Aggiunte alla prova due partite giocate dai robot, contro la CPU e nello stesso schermo, con il disegno a vuoto prima del seme. Stessa impronta con i due valori dell'opzione e su `9b8f9cb`. Scritta in «Cosa non cambia nel gioco» la nota sui numeri casuali consumati alla creazione dei pezzi. |
| Ritratti | Corretta la frase del documento: i ritratti seguono la scelta nel codice ma oggi nessuna schermata li mostra. |
| La prova nel browser non finiva da sola | Alla fine ora esce (prima restava appesa al server del gioco). |

### Non corretto, e perché

| punto | perché |
|---|---|
| La racchetta attraversa ancora la testa nei passaggi veloci dei colpi | Scelta voluta: lì lo scostamento è parziale e morbido. Portarla fuori del tutto voleva dire salti di 40-60 cm tra due fotogrammi (provato: 77 cm al massimo). Ora capita meno spesso che al tennista di sempre con la sua testa. |
| Ridurre la testa (rz più piccolo, centro arretrato), come proponeva la revisione | Non fatto: i modelli 3D che arriveranno hanno la testa ancora più grande, quindi serviva una correzione che non dipendesse dalla misura della testa. La somiglianza con la foto resta quella di prima. |
| Tesa della visiera di Lob più corta | Non fatto: è il segno che fa riconoscere Lob. La racchetta può sfiorare la tesa, la punta e il ciuffo (non sono nella forma tenuta libera). |
| Ritratti a schermo | Non fatto: oggi sono nascosti dallo stile della pagina in tutte le schermate, anche con «Classici». Rimetterli a schermo è una scelta di interfaccia fuori da questo lavoro. |
| Drop blu sul campo blu | Non toccato: va visto dall'utente su uno schermo vero. Se serve si può dare più luce propria al corpo di Drop. |
| Ciuffo e punta dal lato opposto per i mancini, bocca che di tre quarti sembra una macchia | Non fatto (facoltativo): il mancino è lo specchio del destro, come per i personaggi classici. |
| Occhio lontano di tre quarti | Migliorato, non tolto del tutto: il bianco dell'occhio è ancora un pezzo del motore, poco bombato; oltre i 45-50 gradi circa un filo di bianco può ancora sporgere. |

### Numeri dell'ultimo giro

- Gioco (`npm test`): 1200 test, 1199 passati, 0 falliti, 1 saltato (vuole `npm ci` in `tools/lan`, come prima).
- Sito (`node --test tools/test/*.test.mjs`): 205 su 205.
- `npm run build`: riuscito. `npm run audit:legend`: «Tutti i criteri rispettati».
- Prova nel browser `natpf-lob-drop.mjs` con il confronto con `9b8f9cb` (impronte rifatte sul commit di prima con la
  prova aggiornata): **92 verifiche su 92**. Le 9 scene con «Classici» sono identiche a prima; le tre partite a
  sorteggi fissi danno `105f1405`, `714cce1b` e `c41965d4` su `9b8f9cb`, con «Classici» e con «Lob & Drop».
- Prova nel browser del tabellone (`natpf-tabellone.mjs`, toccato dalla linguetta): 42 su 42.
- `npm ci` non rifatto: `node_modules` c'era già e `package-lock.json` non è stato toccato.
- Nessuna misura di fotogrammi al secondo è fallita in questo giro.

Non provato dopo la revisione: tutto quello che è scritto in «Cosa non è provato» qui sopra; in più le prove nel
browser della sfida tra due computer e dello stesso schermo B25 (`natpf-1v1-p2p`, `natpf-split-ready`,
`natpf-stesso-schermo-b25`) non sono state rifatte dopo la correzione (la revisione le aveva trovate verdi prima; la
rete non è stata toccata), e la racchetta scostata non è stata guardata nel doppio né in prima persona su uno schermo
(in prima persona il test di unità dice che non fa niente).

