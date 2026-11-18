# Progetto parallelo · Grip-racchetta come controller (al posto del telefono)

Richiesta dell'utente del 18/11/2026: «una sorta di controller fatto da me: tu me lo dovrai progettare (circuiti, schede
elettriche, scheda madre), io lo farò realizzare da professionisti e qualcuno metterà insieme i pezzi, per far sì che
venga fuori il posto del cellulare. Una sorta di grip per la racchetta da usare come controller. Progetto side, ma che
richiede attenzione». Prodotto: FIERA (e poi white label).

Stato: **requisiti in corso** (18/11). Requisiti dati dall'utente: **4 grip e una chiavetta USB**; forma semplice,
realizzabile ed esteticamente bella (bocciati i primi mockup «a impugnatura tonda»). Scelta dell'utente: **piano A =
modulo a clip su una racchetta vera** (concept 3); **piano B da valutare = piccolo grip verticale con feedback aptico,
solo sensore, senza piatto corde**. Valutazione dei due piani nella sezione «Piano A e piano B» in fondo.
**Decisione dell'utente (18/11, dopo la ricerca): «Io voglio generare un prodotto per me»**: niente produzione in serie,
niente certificazioni da prodotto: 4 grip + 1 chiavetta per uso proprio, strada «scheda pronta in un manico stampato».
La parte della ricerca su CE, qualifica Bluetooth e lotti 20–100 resta solo come riferimento.
**Seconda decisione (18/11): «voglio montare io ma niente saldature»**. Grip «a incastro» con cavetti Qwiic/STEMMA QT:
SparkFun Pro nRF52840 Mini (DEV-15025: Bluetooth, carica LiPo, interruttore, presa Qwiic) + Adafruit LSM6DSO32 (4692,
±32 g ma giroscopio solo ±2000 °/s: limite per colpi molto forti) + SparkFun Qwiic Haptic Driver DA7280 (motorino LRA già
montato) + SparkFun Qwiic Button + LiPo 400–500 mAh con presa JST-PH (polarità e presa da verificare all'ordine) + cavetti
Qwiic; chiavetta Nordic nRF52840 Dongle (programmata con nRF Connect Programmer, nessuna saldatura). Pezzi fissati nel
manico stampato con viti, alloggiamenti a incastro o biadesivo. ~75–80 € a grip (prezzi USA del 18/11, da ricontrollare).
**Ricerca approfondita del 18/11** (fornitori, prezzi, norme, piano a fasi da zero alla produzione):
`docs/hardware/ricerca-grip-controller-2026-11-18.md`. Consiglio: grip verticale B («solo un grip»), scheda Nordic
pronta + scheda d'appoggio (sensore ±32 g/±4000 °/s, vibrazione, ricarica), chiavetta Nordic; fiera in ~6–10 settimane e
~1.500–3.500 € (stime); produzione di 20–100 pezzi decisa dopo la fiera (CE completa, ~15–30 mila € fissi, stime).

## Perché conviene (rispetto al telefono)

- Niente Chrome, niente pagina chiusa, niente tocchi sullo schermo, niente «Fissa app»: il grip fa solo il controller.
- Sensori scelti da noi e sempre uguali (oggi ogni telefono ha frequenza, rumore e saturazione diversi: vedi il registro B66).
- Frequenza alta e costante (400–1000 Hz contro 60–200 Hz dei telefoni) e ritardo più basso: colpi letti meglio.
- Batteria e forma pensate per l'impugnatura; costa meno di un telefono e regge le cadute.

## Architettura proposta

| Parte | Proposta | Perché |
|---|---|---|
| Microcontrollore + radio | modulo **già certificato** (CE/RED) con Bluetooth LE, per esempio nRF52840 o ESP32-S3 | evita la certificazione radio della scheda (costosa); BLE va bene con pochi ms di ritardo |
| Sensori di movimento | IMU a 6 assi (accelerometro ±16 g, giroscopio ±2000 °/s, per esempio famiglia ICM-42688 / LSM6DSO / BMI270) | stessi dati che oggi legge il gioco dal telefono, senza saturare sui colpi forti |
| Collegamento al PC | chiavetta USB dedicata (stesso chip, un grip per chiavetta) oppure Bluetooth del PC | la chiavetta evita i problemi del Bluetooth di Windows e della Wi-Fi della fiera |
| Alimentazione | LiPo 300–500 mAh, carica USB-C, protezione, interruttore | una giornata di fiera |
| Interfaccia | 1 pulsante (= «Sono pronto» / «Salta»), LED RGB di stato, motorino di vibrazione (colpo letto) | sostituisce i pochi tocchi che oggi servono sul telefono |
| Involucro | grip stampato in 3D (poi stampo), dimensioni e peso di un manico di racchetta, cinghietta da polso | sicurezza: il grip non deve volare via |

## Lato gioco

- Il grip manda gli stessi messaggi del telefono (colpo con picco, tempo, assi) dentro un nuovo tipo di controller: il
  riconoscimento dei gesti esistente si riusa, con soglie tarate sul sensore nuovo (test obbligatori come per i telefoni).
- Abbinamento dal pannello dello stand come i «Telefoni dello stand» (Grip 1, Grip 2), stato della batteria nel pannello.
- Il registro dello stand (B66) misura anche il grip: confronto diretto telefono contro grip.

## Fasi

1. **Requisiti** con l'utente: quanti pezzi, budget per pezzo, collegamento (chiavetta o Bluetooth), forma, chi stampa e
   chi monta, tempi.
2. **Prototipo senza scheda custom** (2–3 settimane): schede di sviluppo pronte (modulo radio + IMU + batteria) in un
   grip stampato in 3D, firmware e integrazione nel gioco. Serve a validare colpi, ritardo e batteria prima di spendere
   per le schede.
3. **Scheda custom**: schema elettrico e PCB in KiCad, distinta dei componenti (BOM), file per la produzione (Gerber,
   foratura, posizionamento) per un servizio di produzione e montaggio (PCBA). **Revisione di un elettronico
   professionista prima di ordinare**: posso progettare e controllare con le regole, ma non posso misurare una scheda vera.
4. **Involucro definitivo** (file CAD/STL), montaggio, collaudo di un piccolo lotto.
5. **Produzione** e documentazione per chi monta e per lo staff.

## Cosa posso fare io e cosa no

- Posso: requisiti e architettura, scelta dei componenti, schema e PCB (KiCad), BOM, file di produzione, firmware,
  integrazione nel gioco, involucro parametrico, istruzioni di montaggio e collaudo.
- Non posso: saldare, misurare, provare la radio o la batteria su un pezzo vero, certificare. Ogni passo fisico va
  verificato da chi realizza e monta, e i file vanno rivisti da un professionista prima dell'ordine.

## Piano A e piano B (valutazione del 18/11)

Mockup (immagini generate, solo idea di forma, non disegni tecnici): piano B in tre varianti, manico con gola aperta a V
bianca, manico sfaccettato grafite/lime con gola triangolare e pulsante, set di quattro colori con chiavetta.

**L'elettronica è la stessa nei due piani**: cambia solo il guscio. Quindi la scelta della forma non blocca il prototipo.

| Parte (prototipo) | Proposta | Costo indicativo |
|---|---|---|
| Scheda radio + IMU + carica | Seeed XIAO nRF52840 Sense (BLE, IMU 6 assi, caricatore LiPo, USB-C) | ~15 € |
| Vibrazione (feedback aptico) | motorino LRA 10 mm + driver DRV2605L (effetti già pronti: clic, colpo, ronzio) | ~8 € |
| Batteria | LiPo 400 mAh con protezione | ~5 € |
| Comandi | 1 pulsante («Sono pronto»/«Salta»), interruttore, LED di stato | ~3 € |
| Chiavetta USB | Nordic nRF52840 Dongle, una sola per i 4 grip (BLE regge più collegamenti) | ~15 € (una) |

Nella scheda definitiva: IMU **±32 g / ±4000 °/s** (per esempio LSM6DSV32X, da verificare sul datasheet) al posto di
quella ±16 g della XIAO. Stima: un colpo da visitatore (testa a 15–20 m/s) dà ~12 rad/s; a ~1 m dalla spalla (gola
della racchetta) sono ~14–15 g, al limite di ±16 g; nel manico (~0,75 m) ~11 g. Con colpi forti si satura.

### Piano A · modulo a clip sulla racchetta vera
- Scatolina ~55×35×15 mm stampata in 3D, fissata alla gola o al fondo del manico con fascetta in silicone; 4 racchette junior.
- Pro: effetto «racchetta vera», guscio semplice ed economico, si cambia la racchetta senza cambiare il modulo.
- Contro: **sicurezza allo stand** (testa e corde di 4 racchette tra pubblico e ledwall); più accelerazione sulla gola
  (saturazione); il fissaggio può allentarsi o ruotare e falsare gli assi; peso e bilanciamento diversi da racchetta a racchetta.
- Costo per pezzo ~35 € di modulo + 15–25 € di racchetta: ~230–260 € per 4 più la chiavetta.

### Piano B · grip verticale con feedback aptico (solo sensore)
- Manico ~25–28 cm con overgrip, gola aperta (solo forma, niente piatto corde), pulsante sotto il pollice, USB-C e
  laccio da polso in fondo, elettronica dentro il manico, motorino LRA nel palmo; 150–200 g con un peso in gola per la sensazione.
- Pro: **più sicuro** in mezzo al pubblico; il sensore sta dove oggi c'è il telefono, quindi **gli algoritmi dei gesti
  si riusano meglio**; assi sempre uguali (niente fascetta che ruota); vibrazione sentita bene nel palmo; 4 pezzi identici.
- Contro: meno «racchetta vera»; il guscio è da disegnare (prima stampa 3D in nylon SLS/MJF, poi eventuale stampo).
- Costo per pezzo prototipo ~55–65 € (guscio stampato 20–30 €): ~250–280 € per 4 più la chiavetta.

### Feedback aptico (piano B, utile anche nel piano A)
- **Colpo letto**: il firmware riconosce il picco e vibra subito sul grip (nessun ritardo di radio).
- **Palla presa / punto vinto / turno**: il gioco manda l'evento via chiavetta (pochi ms) e il grip vibra con un effetto diverso.

### Consiglio
Prototipo con l'elettronica comune e **due gusci**: piano B come principale per lo stand (sicurezza e riuso dei gesti),
piano A per dimostrazioni o eventi con spazio. Si decide dopo la prova di colpi, ritardo e batteria con i visitatori
(il registro B66 confronta telefono e grip). Prezzi indicativi, da verificare con i fornitori al momento dell'ordine.
