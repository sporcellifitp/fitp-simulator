// B45.1 «telefono che non si scollega» · perché cade il collegamento (natpf_cadute.js): motivo finale dal computer e dal
// racconto del telefono, caduta prima della pagina del gioco (ricaricata), cadute di oggi per posto e riga del pannello.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MOTIVI, MOTIVO_TESTO, motivoFinale, cadutaPrimaDellaPagina, cadutePulite, contaCaduta, correggiCaduta, motivoFrequente, rigaCadute, leggiCadute, segnaCaduta, chiarisciCaduta, CADUTE_KEY } from '../src/natpf/natpf_cadute.js';
import { CAMPI } from '../src/natpf/registro/registro_formato.js';

test('motivo finale: il computer dice cosa ha visto, il telefono lo corregge quando sa di più', () => {
  // senza racconto del telefono (pagina di prima, o il telefono non torna): quello del computer
  assert.deepEqual(motivoFinale({ motivo: 'silenzio', causa: 'computer' }), { motivo: 'silenzio', causa: 'computer' });
  assert.deepEqual(motivoFinale(null), { motivo: 'chiuso', causa: null });
  assert.deepEqual(motivoFinale({ motivo: 'boh', causa: 'x' }), { motivo: 'chiuso', causa: null }, 'solo motivi previsti');
  // il telefono aveva cambiato rete poco prima: vale più di tutto
  assert.deepEqual(motivoFinale({ motivo: 'silenzio', causa: 'computer' }, { w: 'silenzio', rete: 1 }), { motivo: 'rete cambiata', causa: 'telefono' });
  // pagina del telefono nascosta o chiusa
  assert.deepEqual(motivoFinale({ motivo: 'chiuso', causa: 'telefono' }, { w: 'nascosta' }), { motivo: 'telefono: pagina nascosta', causa: 'telefono' });
  assert.deepEqual(motivoFinale({ motivo: 'chiuso', causa: 'telefono' }, { w: 'pagina' }), { motivo: 'telefono: pagina chiusa', causa: 'telefono' });
  // «Ricollega»: chiesto dal gioco resta del computer, toccato sul telefono è del telefono
  assert.deepEqual(motivoFinale({ motivo: 'ricollega', causa: 'computer' }, { w: 'ricollega' }), { motivo: 'ricollega', causa: 'computer' });
  assert.deepEqual(motivoFinale({ motivo: 'chiuso', causa: 'telefono' }, { w: 'ricollega' }), { motivo: 'ricollega', causa: 'telefono' });
  // il telefono ha visto il silenzio e ha chiuso: per il computer era solo «chiuso»
  assert.deepEqual(motivoFinale({ motivo: 'chiuso', causa: 'telefono' }, { w: 'silenzio' }), { motivo: 'silenzio', causa: 'telefono' });
  // tutti e due hanno visto il silenzio: resta chi se n'è accorto per il computer
  assert.deepEqual(motivoFinale({ motivo: 'silenzio', causa: 'computer' }, { w: 'silenzio' }), { motivo: 'silenzio', causa: 'computer' });
  // parole sconosciute del telefono (pagine future): si ignorano
  assert.deepEqual(motivoFinale({ motivo: 'silenzio', causa: 'computer' }, { w: 'altro' }), { motivo: 'silenzio', causa: 'computer' });
});

test('caduta raccontata da un telefono che rientra: prima della pagina del gioco = pagina del gioco ricaricata', () => {
  assert.equal(cadutaPrimaDellaPagina({ tel: { w: 'chiuso', ms: 9000 }, now: 10000, pageStart: 2000 }), true, 'caduto a 1000, pagina partita a 2000');
  assert.equal(cadutaPrimaDellaPagina({ tel: { w: 'chiuso', ms: 1000 }, now: 10000, pageStart: 2000 }), false, 'caduto a 9000, con la pagina già aperta');
  assert.equal(cadutaPrimaDellaPagina({ tel: null, now: 10000, pageStart: 2000 }), false);
  assert.equal(cadutaPrimaDellaPagina({ tel: { w: 'chiuso' }, now: 10000, pageStart: 2000 }), false, 'senza età non si dice');
});

test('cadute di oggi per posto: conto, correzione del motivo, giorno nuovo da zero, riga del pannello', () => {
  let s = cadutePulite(null, '2026-11-14');
  assert.equal(rigaCadute(s), '', 'nessuna caduta: nessuna riga');
  s = contaCaduta(s, 'p1', 'silenzio'); s = contaCaduta(s, 'p1', 'chiuso'); s = contaCaduta(s, 'p1', 'silenzio');
  assert.deepEqual(s.p1, { n: 3, m: { silenzio: 2, chiuso: 1 } });
  assert.equal(rigaCadute(s), 'Telefono 1: 3 cadute oggi · motivo più frequente: Wi-Fi ferma (10 s senza messaggi)');
  // il racconto del telefono chiarisce l'ultima: «chiuso» era una pagina nascosta
  s = correggiCaduta(s, 'p1', 'chiuso', 'telefono: pagina nascosta');
  assert.deepEqual(s.p1.m, { silenzio: 2, 'telefono: pagina nascosta': 1 }); assert.equal(s.p1.n, 3, 'il numero non cambia');
  assert.deepEqual(correggiCaduta(s, 'p1', 'ricollega', 'silenzio').p1.m, s.p1.m, 'un motivo mai contato non si sposta');
  s = contaCaduta(s, 'p2', 'ricollega');
  assert.equal(rigaCadute(s), 'Telefono 1: 3 cadute oggi · motivo più frequente: Wi-Fi ferma (10 s senza messaggi) · Telefono 2: 1 caduta oggi · motivo più frequente: «Ricollega»');
  assert.equal(motivoFrequente({ chiuso: 2, silenzio: 2 }), 'silenzio', 'a parità prima le cause di rete');
  // giorno nuovo, o dati rovinati: da zero
  assert.equal(cadutePulite(s, '2026-11-15').p1.n, 0);
  assert.deepEqual(cadutePulite({ giorno: 'x', p1: { n: 'a', m: { boh: 3 } } }, 'x').p1, { n: 0, m: {} });
  // ogni motivo ha la sua frase per lo staff
  for (const m of MOTIVI) assert.ok(MOTIVO_TESTO[m], m);
});

test('memoria della giornata nel browser (anche con la pagina del gioco ricaricata e il registro spento)', () => {
  const mem = new Map(), storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  segnaCaduta('p1', 'silenzio', { storage, giorno: '2026-11-14' });
  segnaCaduta('p1', 'chiuso', { storage, giorno: '2026-11-14' });
  chiarisciCaduta('p1', 'chiuso', 'rete cambiata', { storage, giorno: '2026-11-14' });
  assert.deepEqual(leggiCadute(storage, '2026-11-14').p1, { n: 2, m: { silenzio: 1, 'rete cambiata': 1 } });
  assert.ok(mem.has(CADUTE_KEY));
  assert.equal(leggiCadute(storage, '2026-11-15').p1.n, 0, 'il giorno dopo da capo');
  // storage che non funziona (finestra privata, quota): niente errori
  const bad = { getItem(){ throw new Error('no'); }, setItem(){ throw new Error('no'); } };
  assert.doesNotThrow(() => segnaCaduta('p2', 'silenzio', { storage: bad, giorno: '2026-11-14' }));
});

test('registro: i campi delle righe delle cadute sono già previsti (il Worker non va ricaricato)', () => {
  for (const f of ['chi', 'stato', 'motivo', 'causa', 'dove', 'ms', 'dopoS', 'prove', 'fallite', 'tipo', 'inPartita']) assert.ok(CAMPI.includes(f), f);
});
