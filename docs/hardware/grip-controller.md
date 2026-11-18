# Progetto parallelo · Grip-racchetta come controller (al posto del telefono)

Richiesta dell'utente del 18/11/2026: «una sorta di controller fatto da me: tu me lo dovrai progettare (circuiti, schede
elettriche, scheda madre), io lo farò realizzare da professionisti e qualcuno metterà insieme i pezzi, per far sì che
venga fuori il posto del cellulare. Una sorta di grip per la racchetta da usare come controller. Progetto side, ma che
richiede attenzione». Prodotto: FIERA (e poi white label).

Stato: **in roadmap, non iniziato**. Le scelte qui sotto sono proposte da confermare con l'utente.

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
