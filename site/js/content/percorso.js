// Il Percorso del Foro: l'itinerario guidato che parte dal Fan Village appena si entra nel mondo e porta, tappa dopo
// tappa, in tutti i luoghi del torneo. Una traccia gialla a terra indica la strada, una colonna di luce la meta.
// Testi dalle schede verificate della v0.2 (docs/v0.2-planimetria.md) e da fonti controllate il 24 settembre 2026
// (docs/v0.5-village.md). Foto da Wikimedia Commons in assets/photos/, con autore e licenza nel campo `credit`.
// `play` collega la tappa a un'attività del menu «Vai a…» (systems/activities.js).
export const ROUTE = [
  { id: 'village', name: 'Fan Village', short: 'Si parte da qui',
    text: 'Il Fan Village riunisce tutti i giochi: cinque postazioni, un campo da tennis e uno da padel, i negozi e il noleggio della golf car. Il percorso ti porta a scoprire il Foro in dieci tappe: segui la traccia gialla a terra.',
    logo: true },
  { id: 'fontana', name: 'Fontana della Sfera', short: 'Marmo di Carrara, 1933-1935',
    text: 'Realizzata tra il 1933 e il 1935 su progetto di Mario Paniconi e Giulio Pediconi. La sfera è un unico blocco di marmo di Carrara, la vasca è decorata con mosaici a soggetto marino.',
    photo: 'fontana-sfera.jpg' },
  { id: 'viale', name: 'Viale del Foro Italico', short: 'I mosaici',
    text: 'Un tempo Piazzale dell\'Impero: circa 7.000 metri quadrati di mosaici in bianco e nero. Collega il lungotevere al piazzale della Fontana della Sfera.',
    photo: 'viale-mosaici.jpg' },
  { id: 'obelisco', name: 'L\'Obelisco', short: 'Un monolite di 17 metri',
    text: 'Un unico blocco di marmo di Carrara lungo 17,40 metri, il più grande mai estratto dalle Alpi Apuane, disegnato da Costantino Costantini. Arrivò a Roma via mare e risalendo il Tevere, e fu inaugurato il 4 novembre 1932: porta ancora le iscrizioni dell\'epoca.',
    photo: 'obelisco.jpg', tall: true },
  { id: 'marmi', name: 'Stadio dei Marmi', short: 'Sessanta statue di atleti',
    text: 'La pista di atletica è circondata da circa sessanta statue di atleti in marmo di Carrara, donate dalle province italiane. Dal 2013 porta anche il nome di Pietro Mennea. Nel 2026 al centro della pista c\'è la BNP Paribas Arena, il secondo stadio del torneo.',
    photo: 'stadio-marmi.jpg', play: 'medaglie', playLabel: 'Caccia alle medaglie' },
  { id: 'padel', name: 'Campo da padel', short: 'Vetro e rete metallica',
    text: 'Un campo da 10 metri per 20, chiuso da pareti di vetro e rete metallica: la palla si gioca anche dopo il rimbalzo sul vetro. Il Foro ospita il BNL Italy Major Premier Padel, uno dei quattro Major del circuito.',
    photo: 'padel.jpg', play: 'padel', playLabel: 'Gioca a padel con Giulia' },
  { id: 'pietr', name: 'Stadio Nicola Pietrangeli', short: 'L\'ex Pallacorda, 1934',
    text: 'Costruito tra il 1931 e il 1933 su progetto di Costantino Costantini e inaugurato nel 1934 come Stadio della Pallacorda. Il campo è sotto il livello del viale, tra le statue di marmo. Dal 2006 porta il nome di Nicola Pietrangeli.',
    photo: 'pietrangeli-2012.jpg', play: 'live', playLabel: 'Guarda la partita' },
  { id: 'esterni', name: 'Campi esterni', short: 'Qualificazioni e allenamenti',
    text: 'I campi in terra rossa di qualificazioni e allenamenti. Nel 2026 il torneo contava 21 campi: 19 al Foro Italico e 2 sul Lungotevere. Qui lavorano i raccattapalle, anche durante i cambi di campo.',
    photo: 'campi-esterni.jpg', play: 'raccattapalle', playLabel: 'Fai il raccattapalle' },
  { id: 'centrale', name: 'Campo Centrale', short: 'Le finali degli Internazionali',
    text: 'Il campo principale degli Internazionali BNL d\'Italia, dove si giocano le finali. Da giugno 2026 è in corso il rifacimento: copertura mobile e 12.500 posti, con la fine dei lavori prevista per il 2028.',
    photo: 'centrale-2015.jpg', play: 'tennis', playLabel: 'Gioca sul Centrale' },
  { id: 'st', name: 'SuperTennis Arena', short: '3.000 posti',
    text: 'Lo stadio da 3.000 posti che porta il nome del canale televisivo della Federazione, nato nel 2008. Dal 2026 si trova di fronte al Campo Centrale, accanto all\'ex Ostello della Gioventù.',
    photo: 'supertennis.jpg' },
  { id: 'tour', name: 'FITP Trophy Tour', short: 'Il gran finale',
    text: 'Il museo itinerante della Federazione: la Coppa Davis vinta nel 1976 e poi tre volte di fila dal 2023 al 2025, la Billie Jean King Cup, la storia azzurra dal 1910. Il camion cambia tappa ogni cinque minuti: la traccia ti porta dove si trova adesso.',
    photo: 'davis-2016.jpg' },
];

// Crediti delle foto (mostrati sotto ogni immagine). Una tappa senza credito mostra il logo FITP al posto della foto.
export const PHOTO_INFO = {
  'fontana-sfera.jpg': 'La Fontana della Sfera nel 2016 · Wikimau60 · CC BY-SA 4.0',
  'viale-mosaici.jpg': 'Un mosaico del piazzale nel 1963 · Fortepan / Pierre Varga · CC BY-SA 3.0',
  'obelisco.jpg': 'L\'Obelisco nel 2014 · Livioandronico2013 · CC BY-SA 4.0',
  'stadio-marmi.jpg': 'Lo Stadio dei Marmi nel 2005 · Anthony Majanlahti · CC BY 2.0',
  'padel.jpg': 'Un campo da padel all\'aperto (Svezia, 2019), ritagliato · Ainali · CC BY-SA 4.0',
  'campi-esterni.jpg': 'I campi secondari nel 2012 · Itto Ogami · CC BY 3.0',
  'pietrangeli-2012.jpg': 'Campo Pietrangeli nel 2012 · Itto Ogami · CC BY 3.0',
  'centrale-2015.jpg': 'Il Campo Centrale nel 2015 · Stefano Cappa · CC BY 3.0',
  'davis-2016.jpg': 'La Coppa Davis · Carine06 · CC BY-SA 2.0',
};
