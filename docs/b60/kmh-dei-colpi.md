# B60 · Velocità dei colpi nel registro dello stand (per il trofeo Razzo)

Dalle misure di Torino (`docs/b36/misure-torino.md` §4): il trofeo **Razzo** («colpo più forte», km/h) non si poteva
ritarare perché il registro aveva i km/h solo dei **servizi**, non dei colpi in partita. Senza questo dato le soglie
restavano quelle di prima (gli altri trofei sono stati ritarati nella 2026-11-16.7).

## Cosa cambia

- **Riga «colpo»** del registro (solo colpi in partita, come il trofeo): nuovo valore `kmh`, i km/h scritti sopra il
  colpo. Il motore li dà alle statistiche della partita subito dopo il colpo (`natpf_match_stats.shot`); il registratore
  (`registro_registratore._kmhColpo`) li copia nella riga del colpo ancora aperta (aspetta il primo rimbalzo), solo se
  sono di chi ha colpito; non i servizi (hanno già la loro riga), non il compagno del doppio, il primo valore.
- Il campo `kmh` era già tra quelli accettati dal Worker (lo usa la riga «servizio»): **non serve ricaricare il Worker**.
  Nessun nome, nessun dato personale: solo un numero per colpo.
- **Riassunto** (`natpf-tennis/scripts/registro/riassunto.mjs`): nuova sezione «Velocità dei colpi (B60, trofeo Razzo)»:
  velocità dei colpi in partita e **colpo più forte di ogni giocatore in ogni partita** (colpi e servizi, come «km/h, il
  tuo colpo più forte» della fine partita): metà, tre quarti e 9 su 10, cioè i valori per le soglie di bronzo, argento e
  oro. Le partite delle versioni di prima (solo i servizi) non entrano nel massimo.

## Prove

- `natpf-tennis/test/natpf-registro.test.mjs` (+1): la riga «colpo» porta i km/h del colpo di chi ha colpito; non quelli
  del servizio, dell'altro giocatore, del compagno; il primo valore; niente valori non numerici.
- `natpf-tennis/test/registro-riassunto.test.mjs` (+1): velocità e massimo per partita (colpi e servizi, avversario umano
  a parte), scambi di prova fuori, registro vecchio detto nella sezione.

**Da fare con i dati**: con lo scarico del registro della prossima giornata (versione 2026-11-17.1 o dopo), soglie del
Razzo dalle percentuali del riassunto, come per gli altri trofei. Non provato: registro vero della fiera con la 17.1.
