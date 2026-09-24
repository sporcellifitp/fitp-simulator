// Catalogo di negozi e chioschi. I prezzi sono in gettoni, che si guadagnano giocando (nessun acquisto con denaro vero).
// Ogni capo del guardaroba è una «patch» sull'aspetto dell'avatar (entities/avatar.js).
export const CATS = [
  { id: 'maglia', label: 'Maglie' }, { id: 'pantaloncini', label: 'Pantaloncini' }, { id: 'testa', label: 'Cappellini e fasce' },
  { id: 'occhiali', label: 'Occhiali' }, { id: 'polsini', label: 'Polsini' }, { id: 'scarpe', label: 'Scarpe' }, { id: 'racchetta', label: 'Racchette' },
];
const it = (id, cat, name, price, look, color) => ({ id, cat, name, price, look, color: color ?? Object.values(look).find(v => typeof v === 'number') });
export const WARDROBE = [
  it('maglia-blu', 'maglia', 'Maglia blu', 0, { shirt: 0x1f4fa3, stripe: null }),
  it('maglia-bianca', 'maglia', 'Maglia bianca', 0, { shirt: 0xffffff, stripe: null }),
  it('maglia-rossa', 'maglia', 'Maglia rossa', 0, { shirt: 0xd8342c, stripe: null }),
  it('maglia-verde', 'maglia', 'Maglia verde', 0, { shirt: 0x2f8f57, stripe: null }),
  it('maglia-gialla', 'maglia', 'Maglia gialla', 20, { shirt: 0xf3c623, stripe: null }),
  it('maglia-viola', 'maglia', 'Maglia viola', 20, { shirt: 0x7a3fa0, stripe: null }),
  it('maglia-arancio', 'maglia', 'Maglia terra rossa', 25, { shirt: 0xc8643b, stripe: null }),
  it('maglia-notte', 'maglia', 'Maglia blu notte', 25, { shirt: 0x0b2a5b, stripe: null }),
  it('maglia-azzurra-righe', 'maglia', 'Maglia azzurra a righe', 40, { shirt: 0x2b7bd6, stripe: 0xffffff }),
  it('maglia-tricolore', 'maglia', 'Maglia con fascia tricolore', 60, { shirt: 0xffffff, stripe: 'tricolore' }, 0x2f8f57),
  it('pant-bianchi', 'pantaloncini', 'Pantaloncini bianchi', 0, { shorts: 0xffffff }),
  it('pant-blu', 'pantaloncini', 'Pantaloncini blu', 0, { shorts: 0x0b2a5b }),
  it('pant-neri', 'pantaloncini', 'Pantaloncini neri', 15, { shorts: 0x1d2430 }),
  it('pant-rossi', 'pantaloncini', 'Pantaloncini rossi', 15, { shorts: 0xd8342c }),
  it('cap-bianco', 'testa', 'Cappellino bianco', 0, { hasCap: true, cap: 0xffffff, headband: null }),
  it('cap-blu', 'testa', 'Cappellino blu', 10, { hasCap: true, cap: 0x1f4fa3, headband: null }),
  it('cap-rosso', 'testa', 'Cappellino rosso', 10, { hasCap: true, cap: 0xd8342c, headband: null }),
  it('cap-giallo', 'testa', 'Cappellino giallo', 15, { hasCap: true, cap: 0xf3c623, headband: null }),
  it('fascia-bianca', 'testa', 'Fascia bianca', 20, { hasCap: false, headband: 0xffffff }),
  it('fascia-rossa', 'testa', 'Fascia rossa', 20, { hasCap: false, headband: 0xd8342c }),
  it('capelli', 'testa', 'Senza niente in testa', 0, { hasCap: false, headband: null }, 0x3a2a1c),
  it('occhiali-sole', 'occhiali', 'Occhiali da sole', 35, { glasses: true }, 0x1d1d1f),
  it('niente-occhiali', 'occhiali', 'Senza occhiali', 0, { glasses: false }, 0xe0b48f),
  it('polsini-bianchi', 'polsini', 'Polsini bianchi', 15, { wrist: 0xffffff }),
  it('polsini-blu', 'polsini', 'Polsini blu', 15, { wrist: 0x1f4fa3 }),
  it('niente-polsini', 'polsini', 'Senza polsini', 0, { wrist: null }, 0xe0b48f),
  it('scarpe-bianche', 'scarpe', 'Scarpe bianche', 0, { shoes: 0xf7f7f7 }),
  it('scarpe-nere', 'scarpe', 'Scarpe nere', 15, { shoes: 0x1d1d1f }),
  it('scarpe-arancio', 'scarpe', 'Scarpe arancio', 20, { shoes: 0xf08a3c }),
  it('scarpe-azzurre', 'scarpe', 'Scarpe azzurre', 20, { shoes: 0x2b7bd6 }),
  it('racchetta-blu', 'racchetta', 'Racchetta blu', 0, { racket: 0x1f4fa3 }),
  it('racchetta-rossa', 'racchetta', 'Racchetta rossa', 25, { racket: 0xd8342c }),
  it('racchetta-gialla', 'racchetta', 'Racchetta gialla', 25, { racket: 0xf3c623 }),
  it('racchetta-nera', 'racchetta', 'Racchetta nera', 30, { racket: 0x1d1d1f }),
  it('racchetta-oro', 'racchetta', 'Racchetta d\'oro', 80, { racket: 0xd4a017 }),
];
export const FREE = WARDROBE.filter(i => i.price === 0).map(i => i.id);

// Store del torneo: spille da collezione (finiscono nell'album)
export const PINS = [
  { id: 'spilla-centrale', name: 'Spilla Campo Centrale', price: 15, color: 0x1f4fa3 },
  { id: 'spilla-pietrangeli', name: 'Spilla Stadio Pietrangeli', price: 15, color: 0xe4d8c0 },
  { id: 'spilla-marmi', name: 'Spilla Stadio dei Marmi', price: 15, color: 0xf2ede3 },
  { id: 'spilla-fontana', name: 'Spilla Fontana della Sfera', price: 15, color: 0x86bccb },
  { id: 'spilla-padel', name: 'Spilla del padel', price: 15, color: 0x2b7bd6 },
  { id: 'spilla-pallina', name: 'Spilla pallina gialla', price: 10, color: 0xd9f24a },
  { id: 'spilla-museo', name: 'Spilla Museo FITP', price: 20, color: 0x0b2a5b },
  { id: 'spilla-village', name: 'Spilla Fan Village', price: 10, color: 0xc8643b },
];

// Punto ristoro: danno energia (si corre più veloci per un po')
export const FOOD = [
  { id: 'granita', name: 'Granita al limone', price: 5, boost: 45 },
  { id: 'gelato', name: 'Gelato alla fragola', price: 6, boost: 60 },
  { id: 'acqua', name: 'Bottiglietta d\'acqua', price: 2, boost: 20 },
];

export const CART_PRICE = 25;       // noleggio della golf car, in gettoni
export const WELCOME_COINS = 40;    // regalo di benvenuto, basta per la golf car
