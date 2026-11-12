# B29 · Lob & Drop dai modelli 3D

Richiesta dell'utente del 12/11/2026: al posto delle mascotte costruite nel codice (B24, `docs/b24/lob-e-drop.md`)
usare in campo i due modelli 3D che ha fatto generare dalla foto dei peluche. Fatto il 12/11/2026 sul ramo di lavoro
`b29-lob-drop-3d`, partito da `fb6169e` (versione 2026-11-12.4) e unito poi con `natpf-simulator` a `a6188ba`
(versione 2026-11-12.5: telecomando dello staff, calibrazione giocando). I file di versione e i documenti di piano non
sono stati toccati: la versione nuova e i pacchetti si fanno all'unione.

## In breve

- Con **«Personaggi: Lob & Drop»** in campo ci sono i **due modelli 3D** dei peluche: **Drop** (blu) dalla parte del
  Player 1, **Lob** (giallo) dall'altra, come prima.
- I modelli si scaricano **solo quando servono** (la prima volta che in campo c'è una mascotte). Con «Classici» non si
  scarica niente e l'immagine è **identica** a prima.
- Finché i modelli non sono arrivati, o se non arrivano (file mancante, rete, errore), restano **le mascotte costruite
  nel codice** del B24: nessun buco, nessun avviso a schermo, una riga nella console.
- È **solo disegno**: palla, colpi, punto d'impatto, punteggio, riconoscimento dei gesti, webcam e rete non cambiano
  (partite a sorteggi fissi identiche al commit di prima, anche con i modelli in campo).
- I due file pesano **0,32 e 0,33 MB** (erano 2,9 e 3,0 MB). Nella texture di Drop il marchio sul petto, scritto dal
  generatore «Nittto», è corretto in «Nitto».

## Come si attiva

| cosa | come |
|---|---|
| Accendere | Pagina della partita oppure Menu → **Opzioni** → **«Personaggi: Classici · Lob & Drop»** → **«Lob & Drop»** (la scelta del B24, non cambia). |
| Spegnere | Stessa scelta → **«Classici»**. |
| Modelli 3D o mascotte nel codice | Dall'indirizzo: `?mascotte=3d` (valore di base) oppure `?mascotte=codice` (sempre le mascotte del B24: serve per confrontare e per le prove). Valori diversi sono ignorati. |

## I file dei modelli

| | Drop | Lob |
|---|---|---|
| file di partenza (fuori dal repository) | `drop.glb` 2.885.704 byte | `lob.glb` 2.992.640 byte |
| file nel gioco | `natpf-tennis/public/media/mascotte-drop.glb` **321.988 byte** | `natpf-tennis/public/media/mascotte-lob.glb` **331.184 byte** |
| triangoli / vertici | 8.268 / 8.466 | 8.210 / 8.404 |
| texture | WebP 1024 × 1024, 62.926 byte | WebP 1024 × 1024, 73.990 byte |
| ossa | 24, stessi nomi del file di partenza | 24 |

Insieme: **653.172 byte (0,65 MB)**, sotto il tetto di 0,8 MB.

Li rifà lo strumento `natpf-tennis/scripts/mascotte-modelli.py` (Python con numpy e Pillow, solo per chi sviluppa: il
gioco non ha dipendenze nuove):

```sh
python3 natpf-tennis/scripts/mascotte-modelli.py --sorgente <cartella con drop.glb e lob.glb> \
  --uscita natpf-tennis/public/media --fogli docs/b29/img
```

Cosa fa:

- **texture** ridotta a 1024 punti in **WebP** (qualità 80). Prove fatte: 1024 in JPEG (0,40 e 0,42 MB i file: troppo),
  512 in WebP (0,29 MB: solo 30 kB in meno, e da vicino le scritte DROP, LOB e il marchio si sfaldano; dalla camera di
  gioco non si vede differenza). Scelta: 1024 WebP. Foglio `img/texture-1024-512.webp`.
- **via** le tangenti e la clip inutile di 0,03 s;
- **attributi compatti** con `KHR_mesh_quantization` (posizioni a 16 bit, normali a 8 bit, coordinate della texture a
  16 bit, pesi a 8 bit), che three.js legge da sé: niente Draco né meshopt, che chiederebbero un decodificatore;
- vertici uguali uniti, scheletro portato in metri (la scala 0,01 dell'armatura), gamba e piede un pezzo solo nei pesi;
- **solo Drop**: nella texture il marchio sul petto «Nittto» diventa «Nitto», come nella texture di Lob e sui peluche.
  Foglio `img/nitto-prima-dopo.webp` (prima e dopo, vista da davanti).

I due file stanno in `public/media/`: la build li copia in `dist/media/`, da lì finiscono nello **zip Cloudflare** e
nell'**installer Windows** (che prende il gioco da `dist` attraverso il pacchetto LAN; il server del programma conosce
già il tipo `.glb`). Peso dello zip: vedi «Prestazioni e peso».

## Nel gioco

- `natpf-tennis/src/natpf/natpf_mascot_models.js`: carica un modello con `GLTFLoader` di three (già tra le dipendenze),
  una volta sola, alla prima richiesta; lo stato è «mai chiesto», «in arrivo», «pronto», «non arrivato». Ogni attore
  riceve una sua copia (con lo scheletro suo). Se il file non arriva: una riga nella console
  (`[natpf-mascotte] modello 3D di Drop non caricato (…): in campo resta la mascotte costruita nel codice`), niente a schermo.
- `natpf-tennis/src/natpf/natpf_character.js`: a ogni fotogramma decide se in campo c'è il modello o la mascotte nel
  codice. Il modello si usa con «Lob & Drop», `?mascotte=3d`, file pronto, attore visibile e non in prima persona (in
  prima persona del corpo si vedono solo avambracci e racchetta: restano quelli di sempre).
- **Materiale semplice**: `MeshLambertMaterial` (luce diffusa, niente riflessi, niente PBR), la texture anche come luce
  propria leggera (sotto le luci fredde dell'arena il colore resta quello del peluche) e un **bordo di luce** morbido
  sulla sagoma: più deciso per Drop (0,2), che è blu su un campo blu, appena accennato per Lob (0,1). Foglio
  `img/bordo-drop.webp` (senza e con il bordo).
- **Ombra a terra** come gli altri personaggi (il modello proietta la sua ombra).
- **Scala**: in campo le mascotte sono alte **1,6 m** (il tennista 1,91 m). La testa è metà del pupazzo: a 1,6 m è larga
  0,85 m come quella delle mascotte del B24, sta sotto la zona dove passano mano e racchetta e copre meno campo. Dalla
  camera di gioco si riconoscono bene e non coprono la palla (fogli `img/in-campo.webp`, `img/confronto-in-campo.webp`).

## Animazione: dalle parti del tennista alle 24 ossa

Il motore non muove ossa: muove sei parti del tennista (busto, testa, due mani, due piedi) e la racchetta. Il modulo
`natpf-tennis/src/natpf/natpf_mascot_rig.js` le legge a ogni fotogramma e scrive le ossa del modello, **senza creare
oggetti** (provato da un test che cerca `new` nelle funzioni di posa). Così valgono tutte le animazioni del gioco
(attesa, corsa, dritto, rovescio, servizio, schiacciata, volée, esultanza; destri e mancini; giocatore, CPU, Player 2,
stesso schermo, moviola, schermo del Player 2) senza toccare il motore.

| parte del tennista | ossa del modello |
|---|---|
| busto | `Hips`: posizione (di quanto il busto si è spostato dal riposo) e rotazione |
| testa | `Head` (rotazione, smorzata al 60 %: una testa così grande che gira quanto quella del tennista sembra cadere) e `Spine02` (si piega di quanto la testa si sposta rispetto al busto) |
| mano della racchetta | `RightArm`, `RightForeArm`, `RightHand` (per i mancini `LeftArm`, `LeftForeArm`, `LeftHand`): il palmo va dove sta la mano del tennista, cioè sul manico |
| mano libera | le ossa dell'altro braccio: bassa a riposo, la posizione vera quando il tennista la alza (lancio, esultanza), sempre fuori dalla testa |
| piedi | `RightLeg` e `LeftLeg` (gamba e piede un pezzo solo): la pianta segue lo spostamento del piede del tennista |
| restano a riposo | `Spine01`, `Spine`, `neck`, le spalle, `UpLeg`, `Foot`, `ToeBase`, `head_end`, `headfront` |

Assi: il modello guarda verso +z come il tennista; la sua sinistra è a x > 0. **Mancini**: il motore specchia l'attore;
il modello invece **non** si specchia (le scritte DROP, LOB e il marchio sarebbero al contrario): la racchetta passa
nell'osso `LeftHand`. Foglio `img/mancino.webp`.

Cose curate:

- **Racchetta e impatto**: la racchetta resta esattamente dove la mette il motore; è la mano della mascotte che va sul
  manico (palmo a meno di 2 mm dal manico in tutte le partite di prova). Con le braccia corte, nei colpi lontani dal
  corpo il braccio si allunga come quello di un peluche (fino a 3,5 volte nei casi più estremi).
- **Testa grande**: la racchetta non resta dentro la testa nelle pose tenute. Si riusa `keepRacketClear`
  (`natpf_racket_clear.js`) con la forma della testa dei due modelli: per Drop la testa e il ciuffo sopra la fascia, per
  Lob la testa, la punta in cima e la tesa della visiera. Al colpo la racchetta non è mai scostata.
- **Mano libera davanti al petto**: il tennista nel dritto e nel rovescio porta la mano libera avanti all'altezza della
  spalla, che nella mascotte è l'altezza degli occhi (sembrava che si strofinasse un occhio). Ora lì il palmo scende
  sotto il mento, davanti al petto; se il tennista alza la mano sopra la testa (esultanza, lancio) resta libera.
- **Piedi sul campo e passo**: le piante non scendono mai sotto il campo; il piede si alza al più di 22 cm nel passo.
  Il piede insegue il suo bersaglio a velocità limitata: il passo di corsa resta intero (prima un ritardo lo accorciava
  di un terzo e le gambe sembravano ferme) e un salto del bersaglio non diventa uno scatto.
- **Niente scatti** tra un'animazione e l'altra: ossa, mano libera e piedi controllati a ogni passo di tre partite.

## Cosa non cambia

- Con «Classici» il disegno è **identico** al commit di prima (`a6188ba`), pixel per pixel, su 9 scene; anche con
  `?mascotte=3d` e dopo essere passati al volo da «Lob & Drop» con i modelli a «Classici».
- Partite senza persone a sorteggi fissi (contro la CPU, stesso schermo, scambi): **impronta identica** al commit di
  prima con «Classici», con le mascotte nel codice e con i modelli 3D. Al colpo le corde sono dove erano.
- Riconoscimento dei gesti, telefono, webcam, rete: nessun file toccato.

## Prestazioni e peso

Misure con la grafica in software del banco di prova (Chromium senza scheda grafica, 640 × 360), sulla stessa scena
(dritto), il disegno più breve di 14 per 3 giri alternati. La macchina era carica (altre prove in corso): un primo giro
aveva dato 850 ms per i modelli 3D, rifatto a macchina più libera.

| aspetto | chiamate di disegno | triangoli nella scena | tempo del disegno |
|---|---|---|---|
| Classici | 248 | 1.454.220 | 651,3 ms (giro prima: 612,7) |
| Lob & Drop nel codice | 219 | 1.443.092 | 604,4 ms (617,1) |
| **Lob & Drop dai modelli 3D** | **143** | **1.435.822** | **602,7 ms** (610,4) |

Fotogrammi al secondo con il gioco che gira (stessa grafica in software, migliore di due giri): classici 1,30, mascotte
nel codice 1,45, modelli 3D 1,49 (giro prima: 0,91, 1,01, 0,95). Con la grafica in software i numeri dipendono molto da
quanto è carica la macchina; il confronto vale tra aspetti misurati a giri alternati nella stessa pagina. Il modello è una sola mesh con una sola texture: meno chiamate delle
mascotte del B24, fatte di tanti pezzi.

Peso dello **zip Cloudflare** (`scripts/pacchetto-cloudflare.mjs` dopo `npm run build`, stessa macchina):

| | byte | margine sotto 25.000.000 |
|---|---|---|
| `a6188ba` (prima) | 23.354.566 (137 file) | 1.645.434 |
| questo ramo | **23.809.123** (139 file) | **1.190.877** |
| differenza | **+454.557** (i due modelli compressi: 219.141 + 229.890; il codice: +4.935) | |

Il caricatore dei modelli (`GLTFLoader`) era già nel gioco: il codice nuovo pesa meno di 5 kB nello zip. Nell'installer
Windows i due file entrano allo stesso modo (copiati da `dist`); l'installer non è stato rifatto qui.

## Prove

- Test di unità `natpf-tennis/test/natpf-mascotte-3d.test.mjs` (13): file leggeri e compatti con le 24 ossa; tabella
  delle ossa, lato e mano della racchetta per destri e mancini, scala, riposo del motore; parametro `?mascotte=`;
  materiale; ripiego (con «Classici» e `?mascotte=codice` non si carica niente, file mancante → mascotte nel codice e
  una riga nella console); modello in campo e ritorno a «Classici»; palmo sul manico in tutte le pose; piedi sul campo;
  niente scatti; forma della testa; mano libera (riposo, esultanza, dritto e rovescio); niente allocazioni. I modelli
  veri si leggono senza browser (`test/mascotte-glb.mjs`, `test/mascotte-campo.mjs`).
- Prova nel browser `tools/e2e/natpf-lob-drop.mjs` (le parti del B24 più la parte 6 per i modelli):

```sh
# impronte del commit di prima (cartella del gioco a6188ba con node_modules)
CHROMIUM_PATH=/opt/pw-browsers/chromium GAME=<gioco a6188ba> BASELINE=impronte.json node tools/e2e/natpf-lob-drop.mjs
# tutto, con il confronto
CHROMIUM_PATH=/opt/pw-browsers/chromium CONFRONTA=impronte.json node tools/e2e/natpf-lob-drop.mjs
# solo modelli 3D e costo · solo i fogli di questa pagina
CHROMIUM_PATH=/opt/pw-browsers/chromium TRE_D=1 CONFRONTA=impronte.json node tools/e2e/natpf-lob-drop.mjs
CHROMIUM_PATH=/opt/pw-browsers/chromium FOGLI3D=docs/b29/img TEXTURE512=<modelli a 512> node tools/e2e/natpf-lob-drop.mjs
```

Ultimi giri (12/11, sera):

- tutto (`CONFRONTA` con le impronte di `a6188ba`): 132 verifiche su 138 al primo giro. Le 6 non superate sono state
  corrette o spiegate: alzata del piede fino a 30 cm (ora un tetto morbido, al più 22 cm), un confronto di «Classici al
  volo» fatto contro una pagina con una storia diversa (una partita giocata prima lascia resti nel disegno: ora si
  confronta con una pagina appena aperta, ed è identico) e due misure di tempo a macchina carica (rifatte sotto).
- `TRE_D=1` dopo le correzioni: **54 su 54** (modelli chiesti solo con «Lob & Drop», ripiego con il file di Drop
  bloccato, «Classici» al volo identico, tre partite identiche ad `a6188ba`, corde al colpo dove erano, palmo sul manico,
  piedi sul campo, niente scatti, racchetta fuori dalla testa nell'attesa, costo).
- `FOGLI3D`: 10 fogli, tutti sotto i 300 kB, guardati uno per uno.

## Fogli (docs/b29/img)

| foglio | cosa mostra |
|---|---|
| `drop-foto-codice-3d.webp`, `lob-foto-codice-3d.webp` | la foto dei peluche, la mascotte nel codice (davanti, lato, dietro) e il modello 3D (tre quarti, davanti, lato, dietro), stessa camera |
| `gesti-drop.webp`, `gesti-lob.webp` | attesa, corsa, dritto (apertura, impatto, finale), rovescio, servizio, schiacciata, esultanza, da vicino |
| `mancino.webp` | mancini: racchetta in `LeftHand`, scritte leggibili |
| `in-campo.webp` | dalla camera di gioco (e ingrandito 3 volte): attesa, corsa, dritto, rovescio, servizio, esultanza, dritto di Lob, stesso schermo |
| `confronto-in-campo.webp` | stessa scena con classici, mascotte nel codice, modelli 3D |
| `bordo-drop.webp` | Drop senza e con il bordo di luce |
| `texture-1024-512.webp` | texture a 1024 (scelta) e a 512 punti |
| `nitto-prima-dopo.webp` | il marchio sul petto di Drop prima e dopo la correzione |

## Cosa non è riuscito, e perché

- **Braccia corte**: il tennista è alto 1,91 m, la mascotte 1,6 m con braccia corte. Perché la racchetta resti dove la
  vuole il motore (punto d'impatto invariato), nei colpi lontani dal corpo il braccio si allunga, fino a 3,5 volte nei
  casi estremi. Dalla camera di gioco si nota poco; da vicino sì.
- **Racchetta davanti alla faccia** in qualche istante del servizio e del dritto, viste da davanti o di lato: è la
  posizione della racchetta del motore, che non si sposta (cambierebbe il punto d'impatto). Dalla camera di gioco, da
  dietro, non si vede. Nelle pose tenute la racchetta resta fuori dalla testa.
- **Gamba e piede un pezzo solo**: il modello ha le ossa del piede, ma con le gambe così corte piegare caviglia e
  ginocchio dava piedi storti; la gamba gira tutta intera e scorre un poco (è un peluche).
- La **mano libera** non segue sempre il tennista: in basso a riposo, davanti al petto nei colpi, vera solo quando si
  alza sopra la testa.

## Cosa non è provato

- Telefono vero, schede grafiche vere (desktop e Android), ledwall: tutte le misure sono con la grafica in software del
  banco di prova. Il costo lì è uguale a quello delle mascotte nel codice; con una scheda vera dovrebbe essere più
  basso (meno chiamate di disegno), ma non è misurato.
- Caricamento da Cloudflare e dall'installer Windows su un PC vero: provato solo con il server di sviluppo.
- Rete lenta: il ripiego con il file bloccato è provato; un file che arriva dopo molti secondi no (il modello prende il
  posto della mascotte nel codice quando arriva).
- Partite tra due computer (P2P) con «Lob & Drop»: ogni computer disegna i suoi personaggi, come nel B24; non riprovate.
