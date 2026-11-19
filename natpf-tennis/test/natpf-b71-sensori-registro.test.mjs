// B71 · misure dei sensori del telefono nel registro dello stand (docs/b71/sensori.md, docs/b66/registro-sensori.md §8):
// sorgente dei sensori (app NATPF Racchetta 1.0.5 o browser), fondo scala dichiarato dall'app, valori più grandi visti, ms
// dall'ultimo tocco all'inizio dei buchi, motivo del ritorno al browser. Solo numeri e codici di una lettera; le pagine di
// prima (senza i campi nuovi) danno le stesse righe di prima.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/natpf/registro/registro_formato.js';
import { MisureTelefono } from '../src/natpf/registro/registro_misure.js';
import * as W from '../cloudflare/registro-worker.js';

test('registro, B71: sorgente, fondo scala, valori più grandi, tocchi prima dei buchi e ritorno al browser nella riga di fine partita', () => {
  const M = new MisureTelefono();
  // pagina con l'app 1.0.5: prima la prova (browser), poi i sensori dell'app; sq con i due numeri in più (valori più grandi)
  M.stato({ sq: [60, 1000, 1, 210, 16, 0, 0, 12.4, 35], sr: 'b', fs: [78.45, 2000.2], tk: [40] }, 1000);
  M.stato({ sq: [60, 1000, 0, 0, 16.7, 3, 0, 78.5, 1450], sr: 'n', fs: [78.45, 2000.2] }, 2000);
  M.stato({ sq: [60, 1000, 2, 230, 16.7, 1, 0, 60.1, 1890], sr: 'n', tk: [-50, 1800, 'x', null] }, 3000);
  const o = JSON.parse(JSON.stringify(M.fine(4000)));
  assert.deepEqual(o.tq, { hz: [60, 60], n: 180, b: 3, bm: 230, iv: 16.7, sat: [4, 0], sr: 'nb', fs: [78.5, 2000], vs: [78.5, 1890], tk: [40, 2] });
  // ritorno al browser con il motivo (codice di una lettera)
  const R = new MisureTelefono();
  R.stato({ sq: [60, 1000, 0, 0, 16, 0, 0], sr: 'b', rp: 'g' }, 1000);
  R.stato({ sr: 'z', rp: 'gravità sbagliata', fs: [0, 2000], tk: 'tanti' }, 2000);
  assert.deepEqual(JSON.parse(JSON.stringify(R.fine(3000))).tq, { hz: [60, 60], n: 60, iv: 16, sr: 'b', rp: 'g' });
  // B71 revisione: ritardo del browser sull'app misurato dalla prova all'avvio (ms interi 0–100; l'ultimo detto)
  const G = new MisureTelefono();
  G.stato({ sq: [60, 1000, 0, 0, 16, 0, 0], sr: 'n', lg: 12 }, 1000); G.stato({ lg: 13.5 }, 1500); G.stato({ lg: -3 }, 1600); G.stato({ lg: 'tanto' }, 1700);
  assert.deepEqual(JSON.parse(JSON.stringify(G.fine(2000))).tq, { hz: [60, 60], n: 60, iv: 16, sr: 'n', lg: 12 });
  // pagina di prima (B66, sq di 7 numeri e niente campi nuovi): la riga resta identica a prima
  const V = new MisureTelefono();
  V.stato({ sq: [60, 1000, 0, 0, 16, 0, 0] }, 1000); V.stato({ sq: [55, 1000, 2, 140, 16, 0, 1] }, 2000);
  assert.deepEqual(JSON.parse(JSON.stringify(V.fine(3000))).tq, { hz: [57.5, 55], n: 115, b: 2, bm: 140, iv: 16, sat: [0, 1] });
});

test('registro, B71: i campi nuovi sono previsti nel gioco e nel Worker (copia esatta), solo numeri e codici; righe pulite identiche', () => {
  for (const c of F.CAMPI_B71S){ assert.ok(F.CAMPI.includes(c), c); assert.ok(W.CAMPI.includes(c), `Worker: ${c}`); assert.ok(!F.CAMPI_VIETATI.includes(c), c); }
  assert.deepEqual([...W.CAMPI], [...F.CAMPI]);
  assert.deepEqual(F.CAMPI_B71S, ['sr', 'fs', 'vs', 'tk', 'rp', 'lg']);
  const riga = { k: 'partita.fine', t: 90000, n: 3, tq: { g: { hz: [60, 59.5], n: 3600, b: 4, bm: 220, iv: 16.7, sat: [12, 0], sr: 'nb', fs: [78.5, 2000], vs: [78.5, 1890], tk: [35, 3], rp: 'f', lg: 12 } } };
  assert.deepEqual(F.pulisci(riga), riga);
  assert.deepEqual(W.pulisci(riga), riga);
  assert.deepEqual(F.controllaRiga(riga), []);
  // un Worker di prima (senza i campi del B71) toglie i campi nuovi in silenzio e tiene il resto
  const vecchio = new Set(F.CAMPI.filter(c => !F.CAMPI_B71S.includes(c)));
  const senza = JSON.parse(JSON.stringify(riga), (k, v) => (k && !/^\d+$/.test(k) && !vecchio.has(k) ? undefined : v));
  assert.deepEqual(senza.tq.g, { hz: [60, 59.5], n: 3600, b: 4, bm: 220, iv: 16.7, sat: [12, 0] });
});
