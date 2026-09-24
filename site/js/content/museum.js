// FITP Trophy Tour: il museo itinerante della Federazione. Fatti dalle voci «Federazione Italiana Tennis e Padel»,
// «Internazionali d'Italia», «Coppa Davis» e «Billie Jean King Cup» di it.wikipedia.org, consultate il 24 settembre 2026
// (vedi docs/v0.5-village.md). Da validare con l'ufficio stampa FITP prima di qualunque uso pubblico.
//
// Le foto sono di Wikimedia Commons, con licenza libera: autore e licenza vanno sempre mostrati accanto all'immagine
// (campo `credit`). Nessuna foto ritrae da vicino un atleta riconoscibile: i diritti d'immagine degli atleti restano fuori.

// Tappe del tour: il camion resta TOUR_STAY minuti in ogni tappa, poi si sposta alla successiva (orario uguale per tutti).
export const TOUR_STAY = 5;
export const TOUR_STOPS = [
  { id: 'village', name: 'Fan Village', hint: 'nel Fan Village, accanto al campo da padel' },
  { id: 'obelisco', name: 'Piazzale del Foro', hint: 'sul Piazzale del Foro, verso l\'Obelisco' },
  { id: 'marmi', name: 'Stadio dei Marmi', hint: 'davanti allo Stadio dei Marmi' },
  { id: 'centrale', name: 'Viale dei campi', hint: 'tra il Pietrangeli e il Campo Centrale' },
];

// Pannelli della galleria (totem a due facce davanti al camion). `photo` è in assets/photos/.
export const EXHIBITS = [
  { id: 'origini', year: '1910', title: 'Le origini',
    text: 'Il 18 maggio 1910 a Firenze nasce la Federazione Italiana Lawn Tennis, con 26 circoli. Primo presidente è il marchese Piero Antinori.',
    long: 'Il primo tentativo è del 16 aprile 1894, con l\'Associazione Italiana Lawn Tennis, che si scioglie presto. Il 18 maggio 1910 a Firenze nasce la Federazione Italiana Lawn Tennis (FILT) con 26 circoli affiliati; il primo presidente è il marchese Piero Antinori. Nel 1922 l\'Italia gioca per la prima volta la Coppa Davis e vince contro il Giappone.',
    photo: 'davis-1922.png', credit: 'La Coppa Davis nel 1922 · The Sporting Globe · pubblico dominio' },
  { id: 'internazionali', year: '1930', title: 'Gli Internazionali d\'Italia',
    text: 'Nascono nel 1930 al Tennis Club Milano. Dal 1950 si giocano sempre al Foro Italico, tranne il 1961 a Torino.',
    long: 'Nei primi anni Trenta la parola «Lawn» esce dal nome: nasce la Federazione Italiana Tennis. Le prime cinque edizioni degli Internazionali si giocano al Tennis Club Milano, dal 1930. Nel 1935 il torneo maschile si disputa a Roma; poi il torneo si ferma fino al 1949. Da allora si gioca sempre al Foro Italico, con l\'eccezione del 1961, a Torino. Nel 2026 è arrivato all\'83ª edizione.',
    photo: 'centrale-2015.jpg', credit: 'Il Campo Centrale nel 2015 · Stefano Cappa · CC BY 3.0' },
  { id: 'pietrangeli', year: '1934', title: 'Lo Stadio della Pallacorda',
    text: 'Costruito tra il 1931 e il 1933 e inaugurato nel 1934 come Stadio della Pallacorda. Dal 2006 porta il nome di Nicola Pietrangeli.',
    long: 'Lo stadio fu costruito tra il 1931 e il 1933 su progetto di Costantino Costantini, dentro il piano del Foro di Enrico Del Debbio, e inaugurato nel 1934 come Stadio della Pallacorda. Il campo è incassato sotto il livello del viale, tra le statue di marmo. Nel 2006 è stato intitolato a Nicola Pietrangeli.',
    photo: 'pietrangeli-2012.jpg', credit: 'Campo Pietrangeli nel 2012 · Itto Ogami · CC BY 3.0' },
  { id: 'davis76', year: '1976', title: 'La prima Coppa Davis',
    text: 'Nel 1976 l\'Italia vince la Coppa Davis in Cile, 4-1. È la prima «insalatiera» azzurra.',
    long: 'Nel 1976 la squadra azzurra vince la finale di Coppa Davis in Cile per 4-1: è il primo titolo dell\'Italia. Seguono le finali del 1977, 1979, 1980 e 1998. La Coppa Davis è un grande vaso d\'argento, soprannominato «insalatiera», su una base a più piani con le targhe dei vincitori.',
    photo: 'davis-2016.jpg', credit: 'La Coppa Davis · Carine06 · CC BY-SA 2.0' },
  { id: 'fedcup', year: '2006', title: 'Le azzurre',
    text: 'La squadra femminile vince la Fed Cup nel 2006, 2009, 2010 e 2013, e la Billie Jean King Cup nel 2024 e nel 2025.',
    long: 'Tra il 2006 e il 2013 la squadra femminile vince quattro volte la Fed Cup (2006, 2009, 2010, 2013). La competizione, dal 2020 Billie Jean King Cup, torna azzurra nel 2024 e nel 2025. Curiosità: l\'edizione del 1966 si giocò in Italia, a Torino.',
    photo: 'fedcup-2018.jpg', credit: 'Coppa della Fed Cup (copia del vincitore, 2016) · Peter Menzel · CC BY-SA 2.0' },
  { id: 'davis2325', year: '2023', title: 'Tre Davis di fila',
    text: 'L\'Italia vince la Coppa Davis nel 2023, nel 2024 e nel 2025: tre volte consecutive.',
    long: 'Dopo il 1976 la Coppa Davis torna in Italia nel 2023, e la squadra azzurra la vince anche nel 2024 e nel 2025: tre successi consecutivi, l\'ultimo nella finale di Bologna contro la Spagna, vinta 2-0 il 23 novembre 2025.',
    photo: 'davis-2016b.jpg', credit: 'La Coppa Davis · Carine06 · CC BY-SA 2.0' },
  { id: 'padel', year: '2023', title: 'Tennis e Padel',
    text: 'Con la crescita del padel la Federazione cambia nome: dal 1º gennaio 2023 è la Federazione Italiana Tennis e Padel, con un nuovo logo.',
    long: 'Nel 2022, vista la crescente popolarità del padel in Italia, viene proposto il cambio di nome. Dopo l\'approvazione del CONI, nome e logo cambiano ufficialmente dal 1º gennaio 2023: la FIT diventa FITP.',
    logo: true },
  { id: 'media', year: '2008', title: 'SuperTennis ed eSports',
    text: 'Nel 2008 nasce SuperTennis, canale in chiaro della Federazione. Oggi FITP eSports porta tennis e padel nei videogiochi, con il circuito FITP eSeries.',
    long: 'Nel 2008 la Federazione fonda il canale televisivo SuperTennis, disponibile in chiaro. Con FITP eSports la Federazione organizza tornei ai videogiochi di tennis e padel, come il circuito FITP eSeries: lo stesso mondo in cui stai giocando adesso.',
    logo: true },
];

export const TROPHIES = [
  { id: 'trofeo-davis', title: 'Coppa Davis', years: '1976 · 2023 · 2024 · 2025',
    text: 'Le quattro Coppe Davis vinte dall\'Italia: la prima nel 1976, poi tre di fila dal 2023 al 2025. Il modello riprende la forma del trofeo vero: il vaso d\'argento sulla base di legno a piani, con le targhe dei vincitori.' },
  { id: 'trofeo-bjk', title: 'Billie Jean King Cup', years: 'Fed Cup 2006 · 2009 · 2010 · 2013 · BJK Cup 2024 · 2025',
    text: 'Sei titoli della squadra femminile: quattro in Fed Cup, due in Billie Jean King Cup. Il modello riprende la coppa d\'argento con i manici del trofeo vero.' },
];

// Crediti mostrati nel pannello «Fonti» del tour.
export const PHOTO_CREDITS = EXHIBITS.filter(e => e.credit).map(e => e.credit);
