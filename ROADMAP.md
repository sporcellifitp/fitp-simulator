# Roadmap di prodotto

Ultimo aggiornamento: 24 settembre 2026. Responsabile: Sergio Porcelli, FITP eSports.

## Obiettivo

Un mondo giocabile nel browser, ambientato al Foro Italico, che tenga vicini al tennis e al padel ragazzi e famiglie tutto l'anno e che abbia il suo picco durante gli Internazionali BNL d'Italia e il BNL Italy Major Premier Padel. Obiettivo del pilota: pubblicarlo prima di IBI 2027.

## Dove siamo: v0.1 (settembre 2026)

- Foro stilizzato a blocchi, percorribile a piedi, con i principali impianti.
- Un minigioco: la sfida al servizio sul Campo Centrale.
- Si gioca come ospite, interfaccia in italiano, comandi da computer e da telefono.

### Problemi noti

- **La planimetria non corrisponde al Foro reale.** Posizioni, orientamento e proporzioni degli impianti sono stati disegnati a memoria. Va rifatta su una base cartografica vera.
- Il padel manca del tutto, eppure il Foro ospita anche il BNL Italy Major Premier Padel.
- C'è un solo minigioco, e per giunta simile a quello che si trova in molti giochi di tennis.
- Nessuna prova su un telefono vero.

## v0.2 in corso (settembre 2026)

Dettagli e fonti in [docs/v0.2-planimetria.md](docs/v0.2-planimetria.md).

- [x] Mondo costruito da dati (`data/layout.json`) invece che da coordinate nel codice, con impianti ruotati, edifici, strade, fiume e ponti.
- [x] Importatore da OpenStreetMap con test automatici e attribuzione ODbL nel gioco.
- [x] Impianti e nomi 2026: BNP Paribas Arena dentro lo Stadio dei Marmi, SuperTennis Arena di fronte al Centrale, schede aggiornate con fonti.
- [ ] Import dei dati reali: bloccato dalla rete del container. Serve abilitare `overpass-api.de` oppure esportare a mano da overpass-turbo (procedura nel documento).
- [ ] Correzioni manuali dopo l'import (SuperTennis Arena, BNP Paribas Arena, ingressi degli stadi).
- [ ] Mappa ufficiale del sito IBI 2026: numerazione dei campi e varchi.

## Prossimi passi (dalle prime settimane sul repository)

1. **Planimetria fedele.** Ricostruire la mappa da OpenStreetMap (licenza ODbL, da citare) e dalla mappa ufficiale del torneo. Servono i materiali IBI 2026: mappa del sito, nomi dei campi e dei varchi d'ingresso.
2. **Nomi e contenuti verificati.** Controllare i nomi ufficiali 2026 di ogni campo e i testi delle schede sui luoghi.
3. **Padel nel mondo.** Un'area con campi da padel veri: pareti in vetro, rete metallica, proporzioni 10 × 20 metri.
4. **Secondo e terzo minigioco**, scelti dall'elenco sotto: uno di padel e uno di tennis diverso dal servizio.
5. **Prova su telefono** (Android e iPhone) e misura dei tempi di caricamento.
6. **Anteprima condivisibile** su Cloudflare Pages, con accesso limitato agli indirizzi @fitp.it.

## Minigiochi candidati

| Minigioco | Sport | Idea | Perché |
|---|---|---|---|
| Sfida al servizio | Tennis | Direzione e profondità, ace nelle zone gialle | Già presente (v0.1) |
| Il vetro | Padel | La palla rimbalza sulla parete di fondo e va colpita al momento giusto dopo il rimbalzo | È il gesto che distingue il padel dal tennis e si impara giocando |
| Por tres | Padel | Smash da far uscire dal campo sopra la parete laterale, con bersagli a punti | Spettacolare, breve, adatto al telefono |
| Raccattapalle | Tennis | Recuperare le palline in campo a tempo durante il cambio campo | Usa il movimento del mondo e racconta un ruolo vero del torneo, amato dai più piccoli |
| Volée a rete | Tennis | Riflessi: palle in arrivo da direzioni diverse, si risponde con un tocco | Partite da 30 secondi, rigiocabili |
| Occhio di falco | Tennis e padel | Si decide se la palla è dentro o fuori sui replay, poi si vede la risposta | Insegna le regole e funziona anche per chi non gioca |
| Caccia alle statue | Esplorazione | Trovare le statue dello Stadio dei Marmi e del Pietrangeli, ognuna con una curiosità | Fa girare tutto il Foro e porta contenuti storici |

## Roadmap

| Versione | Contenuto | Periodo indicativo |
|---|---|---|
| **v0.2 · Planimetria** | Mappa fedele da OpenStreetMap e mappa ufficiale, nomi verificati, schede aggiornate | ottobre 2026 |
| **v0.3 · Padel** | Area padel, primo minigioco di padel, modalità «Italy Major» che trasforma un campo in campo da padel | novembre 2026 |
| **v0.4 · Minigiochi** | Da due a tre minigiochi nuovi, collezione di premi dentro il mondo, sfida del giorno | dicembre 2026 - gennaio 2027 |
| **v0.5 · Qualità** | Prove su telefono, prestazioni, accessibilità, test con 20-30 utenti della community eSeries | febbraio 2027 |
| **v1.0 · Pilota IBI 2027** | Accesso con account myFITP, classifiche, premi legati agli eventi, dominio FITP | lancio 4-6 settimane prima di IBI 2027 |

## Decisioni aperte

- **Pubblico:** bambini, famiglie o community eSports 16+. Cambia tono, grafica e regole sui dati.
- **Obiettivo principale:** attivazione di IBI e del Major di padel, acquisizione per myFITP e Tessera E-Sport FITP, oppure inventario per gli sponsor.
- **Permessi:** Sport e Salute per l'uso dell'immagine del Foro Italico, marchi degli Internazionali BNL d'Italia e del BNL Italy Major Premier Padel, nessun atleta reale senza accordo sui diritti d'immagine.
- **Tutela dei minori:** età, consenso dei genitori, niente acquisti diretti dal gioco.
- **Ruolo di Higgsfield:** solo asset (personaggi, modelli 3D, video di lancio). Codice e dati restano su infrastruttura FITP.
- **Rapporto con Tennis Clash:** posizionare il gioco come esperienza casual di brand, non come alternativa al circuito FITP eSeries by BMW. Verificare il contratto con WildLife.
- **Integrazione:** chi realizza l'accesso con myFITP (Bitkit) e con quali tempi.
