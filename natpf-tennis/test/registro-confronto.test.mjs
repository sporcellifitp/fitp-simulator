// B75 · riassunto del registro: sezione «Confronto: assi del giroscopio × direzione dei colpi» (docs/b75/confronto-registro.md).
// Quattro gruppi (assi «oggi»/«corretti» × direzione «classica»/«nuova») e, con «corretti», per telefono (Android
// riordinato, iPhone come oggi). Prove: righe scritte a mano con i numeri attesi, registri finti con i quattro gruppi (il
// riassunto deve dare i numeri della verità del generatore), registri come quelli veri del 18–19/11 (un gruppo solo,
// nessun avviso), Worker non ricaricato (avviso chiaro, gruppi «non noti» fuori dai quattro).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { giornoFinto, scriviFinto, GRUPPI_FINTI } from '../scripts/registro/finto.mjs';
import { riassumi, Riassunto, rapporto, CONFRONTO_GRUPPI, CONFRONTO_MIN, TIPI_COLPO, tipoColpo, telefonoCfr } from '../scripts/registro/riassunto.mjs';
import { controllaRiga, REGISTRO } from '../src/natpf/registro/registro_formato.js';
import { PRECISION_ZONES } from '../src/natpf/natpf_arcade.js';

const L0 = { file: 1, blocchi: 1, righe: 1, byte: 1 };
const TITOLO = 'Confronto: assi del giroscopio × direzione dei colpi';
const confronto = S => S.find(x => x.titolo.startsWith(TITOLO));
const tabella = (sz, t) => sz.tabelle.find(x => x.titolo.startsWith(t));
const riga = (sz, t, k) => tabella(sz, t)?.righe.find(r => r[0] === k);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-confronto-'));

test('B75: nomi dei tipi di colpo, telefoni e gruppi', () => {
  assert.deepEqual(['TOPSPIN', 'FLAT', 'SLICE', 'LOB', 'DROP', 'SMASH', 'MOON', 'dritto', 'palla corta', null].map(tipoColpo), ['topspin', 'piatto', 'tagliato', 'pallonetto', 'palla corta', 'schiacciata', 'altri', 'altri', 'palla corta', 'altri']);
  assert.deepEqual(TIPI_COLPO, ['topspin', 'piatto', 'tagliato', 'pallonetto', 'palla corta', 'schiacciata']);
  assert.equal(telefonoCfr({ so: 'Android 14', assi: 'corretti' }, 'corretti'), 'Android riordinato');
  assert.equal(telefonoCfr({ so: 'iPhone iOS 17', assi: 'oggi' }, 'corretti'), 'iPhone e altri, come oggi');
  assert.equal(telefonoCfr({ so: 'Android 14' }, 'corretti'), 'senza risposta (pagina di prima)');
  assert.equal(telefonoCfr({ so: 'Android 14' }, 'oggi'), 'Android'); assert.equal(telefonoCfr({ so: 'iPhone iOS 17' }, 'oggi'), 'iPhone'); assert.equal(telefonoCfr(undefined, 'oggi'), 'altro o non noto');
  assert.deepEqual(CONFRONTO_GRUPPI, GRUPPI_FINTI.map(g => g.join(' · ')), 'il generatore finto usa le chiavi del riassunto');
  assert.deepEqual(CONFRONTO_MIN, { partite: 20, colpi: 200 });
});

test('B75: valori noti nei quattro gruppi (righe scritte a mano), per telefono, Precision', () => {
  const A = { giorno: '2026-11-21', postazione: 'abcd1234' }, B = { giorno: '2026-11-21', postazione: 'wxyz5678' }, R = new Riassunto(), V = '2026-11-20.2';
  R.aggiungi({ k: 'avvio', t: 0, v: 5, versione: V, ora: '2026-11-21T09:00:00.000Z', fuso: 60 }, A);
  // oggi · classica: contro l'avversario a Evento, Android. Una calibrazione giocando prima della partita (none) e una dentro (ok)
  R.aggiungi({ k: 'calibrazione', t: 5, chi: 'g', tipo: 'giocando', finita: true, prove: 6, livello: 'none' }, A);
  R.aggiungi({ k: 'partita', t: 10, n: 1, versione: V, modo: 'cpu', chi: 'adulto', livello: 'evento', ctrl: 'telefono', displayLagMs: 0, stand: {}, tel: { strada: 'lan', so: 'Android 14' }, dir: 'classica' }, A);
  R.aggiungi({ k: 'calibrazione', t: 11, chi: 'g', tipo: 'giocando', finita: true, prove: 5, livello: 'ok' }, A);
  const gesti = ['TOPSPIN', 'SLICE', 'LOB', 'LOB', 'SMASH'], dv = [10, -20, 50, 70, -5], voti = ['perfect', 'early', 'very early', 'late', 'perfect'], ms = [10, 80, 200, -60, -5];
  const plLato = [[1, 1], [1, -1], [-1, -1], [-1, 1], [1, 1]], ls = ['g', 'g', 'a', 'p', 'g'], vc = [.1, .5, .9, .3, .7], vg = [1, -1, 0, 1, 1], pf = [-1, -.5, 0, .5, 1];
  for (let i = 0; i < 5; i++) R.aggiungi({ k: 'colpo', t: 20 + i, n: 1, gesto: gesti[i], voto: voti[i], ms: ms[i], dv: dv[i], pl: plLato[i][0], lato: plLato[i][1], ls: ls[i], vc: vc[i], vg: vg[i],
    ...(i === 0 || i === 2 ? { aiutato: true } : {}), ...(i === 1 ? { e: 'debole' } : i === 3 ? { e: 'rete' } : {}), pf: pf[i], d: pf[i] + .25, tu: 0, rx: 3*pf[i], rz: -9, ...(i === 4 ? { fu: 1 } : {}) }, A);
  R.aggiungi({ k: 'vuoto', t: 30, n: 1, perche: 'tardi', ms: -200 }, A);
  ['g', 'g', 'a'].forEach((vince, i) => R.aggiungi({ k: 'punto', t: 40 + i, n: 1, p: i + 1, vince, fine: 'vincente', colpi: 3 }, A));
  R.aggiungi({ k: 'partita.fine', t: 60, n: 1, esito: 'finita', vince: 'g', durS: 120 }, A);
  // oggi · nuova: a Bambini, iPhone; due colpi con la regola nuova e una schiacciata senza; abbandonata
  R.aggiungi({ k: 'partita', t: 100, n: 2, versione: V, modo: 'cpu', chi: 'bambino', livello: 'bambini', ctrl: 'telefono', displayLagMs: 0, stand: {}, tel: { strada: 'lan', so: 'iPhone iOS 17' }, dir: 'nuova' }, A);
  R.aggiungi({ k: 'colpo', t: 101, n: 2, gesto: 'TOPSPIN', voto: 'perfect', ms: 0, lato: 1, pf: .6, d: .6, tu: 0, rx: 2, rz: -9, nr: 1 }, A);
  R.aggiungi({ k: 'colpo', t: 102, n: 2, gesto: 'FLAT', voto: 'perfect', ms: 0, lato: 1, pf: -.6, d: -.6, tu: 0, rx: -2, rz: -9, nr: 1 }, A);
  R.aggiungi({ k: 'colpo', t: 103, n: 2, gesto: 'SMASH', voto: 'perfect', ms: 0, lato: 1, pf: .2, d: .2, tu: 0, rx: 1, rz: -9 }, A);
  R.aggiungi({ k: 'partita.fine', t: 110, n: 2, esito: 'abbandonata', come: 'menu', durS: 30 }, A);
  // corretti · classica: stesso schermo, Android riordinato (chi gioca) e iPhone come oggi (Player 2)
  R.aggiungi({ k: 'partita', t: 200, n: 3, versione: V, modo: 'stesso-schermo', ctrl: 'telefono', displayLagMs: 0, stand: { assi: 'corretti' }, tel: { strada: 'lan', so: 'Android 14', assi: 'corretti' }, tel2: { strada: 'lan', so: 'iPhone iOS 17', assi: 'oggi' }, dir: 'classica' }, A);
  R.aggiungi({ k: 'colpo', t: 201, n: 3, gesto: 'TOPSPIN', voto: 'perfect', ms: 0, pl: 1, lato: 1 }, A);
  R.aggiungi({ k: 'colpo', t: 202, n: 3, gesto: 'LOB', voto: 'late', ms: -50, pl: -1, lato: -1 }, A);
  R.aggiungi({ k: 'colpo', t: 203, n: 3, chi: 'a', gesto: 'SLICE', voto: 'early', ms: 90, pl: 1, lato: -1 }, A);
  R.aggiungi({ k: 'vuoto', t: 204, n: 3, chi: 'a', perche: 'presto', ms: 500 }, A);
  R.aggiungi({ k: 'partita.fine', t: 210, n: 3, esito: 'finita', vince: 'a', durS: 90 }, A);
  // corretti · nuova: a Evento, telefono che non ha risposto (pagina di prima), poi una Precision con «nuova»
  R.aggiungi({ k: 'partita', t: 300, n: 4, versione: V, modo: 'cpu', chi: 'adulto', livello: 'evento', ctrl: 'telefono', displayLagMs: 0, stand: { assi: 'corretti' }, tel: { strada: 'lan', so: 'Android 13' }, dir: 'nuova' }, A);
  R.aggiungi({ k: 'colpo', t: 301, n: 4, gesto: 'DROP', voto: 'perfect', ms: 0 }, A);
  R.aggiungi({ k: 'partita.fine', t: 310, n: 4, esito: 'finita', vince: 'a', durS: 60 }, A);
  const precision = (ctx, t0, dir) => { for (const [zp, z] of PRECISION_ZONES.entries()) R.aggiungi({ k: 'colpo', t: t0 + zp, amb: 'minigioco', gesto: 'TOPSPIN', ms: 0, lato: zp % 2 ? 1 : -1, pf: z.x/3, dv: 4*z.x, tu: 0, rx: z.x, rz: z.z, zp }, ctx); R.aggiungi({ k: 'minigioco', t: t0 + 20, gioco: 'precision', finito: true, punti: 1000, durS: 60, dir }, ctx); };
  precision(A, 400, 'nuova');
  // un'altra postazione: una Precision e nessuna partita (assi non noti); allenamento e scambi di prova fuori dal confronto
  R.aggiungi({ k: 'avvio', t: 0, v: 5, versione: V }, B);
  precision(B, 10, 'classica');
  R.aggiungi({ k: 'colpo', t: 50, amb: 'allenamento', gesto: 'TOPSPIN', ms: 0, dv: 90 }, B);
  R.fine();

  const C = R.cfr;
  assert.deepEqual(Object.keys(C.gruppi).sort(), [...CONFRONTO_GRUPPI].sort(), 'solo i quattro gruppi');
  assert.deepEqual(C.partite, { formato5: 4, vecchie: 0, conAssi: 2, assiNonNoti: 0, dirNonNota: 0, p2: 0, senzaTelefono: 0 });
  assert.equal(C.precisionSenzaPartita, 1); assert.equal(C.calSenzaPartita, 0);
  const S = confronto(rapporto(R, L0)), testo = S.testo.join('\n');
  assert.ok(S, 'sezione del confronto');
  assert.ok(!testo.includes('ATTENZIONE'), testo);
  assert.match(testo, /Gruppi: oggi · classica 1 partite, 5 colpi · oggi · nuova 1 partite, 3 colpi · corretti · classica 1 partite, 3 colpi · corretti · nuova 1 partite, 1 colpi\./);
  assert.match(testo, /Pochi dati \(meno di 20 partite o di 200 colpi: i numeri sono indizi, non bastano per decidere\): oggi · classica \(1 partite, 5 colpi\)/);
  assert.match(testo, /Con «oggi · nuova» la palla va dalla parte della cima\? Cima → rimbalzo 1,00 \(obiettivo E1: almeno 0,80\), tempo → rimbalzo —; con la cima girata \(\|piatto\| da 0,5\) la palla cade dalla sua parte in 100,0% dei colpi \(2\)\. Colpi giocati con la regola nuova: 2 su 3 colpi con la forma\./);
  assert.match(testo, /Partite a Precision senza nessuna partita della postazione \(assi non noti\): 1\./);
  // le tabelle, riga per riga
  assert.deepEqual(tabella(S, 'Gruppi').righe, [
    ['oggi · classica', '1', '1', '120 s', '5', '0 su 5 (0%)', 'pochi dati (servono 20 partite e 200 colpi)'],
    ['oggi · nuova', '1', '0', '—', '3', '2 su 3 (67%)', 'pochi dati (servono 20 partite e 200 colpi)'],
    ['corretti · classica', '1', '1', '90 s', '3', '—', 'pochi dati (servono 20 partite e 200 colpi)'],
    ['corretti · nuova', '1', '1', '60 s', '1', '—', 'pochi dati (servono 20 partite e 200 colpi)'],
  ]);
  assert.deepEqual(riga(S, 'Cima rispetto', 'oggi · classica'), ['oggi · classica', '5 (100%)', '10,0', '20,0', '70,0', '40,0%', '20,0%', '—']);
  assert.deepEqual(riga(S, 'Lato del colpo', 'oggi · classica'), ['oggi · classica', '5', '40,0%', '40,0%', '60% · 20% · 20%', '40,0%', '0,50', '20% · 20% · 60%']);
  assert.deepEqual(riga(S, 'Lato del colpo', 'corretti · classica'), ['corretti · classica', '3', '33,3%', '0,0%', '—', '—', '—', '—']);
  assert.deepEqual(riga(S, 'Tipi di colpo', 'oggi · classica'), ['oggi · classica', '20,0%', '0,0%', '20,0%', '40,0%', '0,0%', '20,0%', '0,0%', '—']);
  assert.deepEqual(riga(S, 'Tipi di colpo', 'corretti · nuova'), ['corretti · nuova', '0,0%', '0,0%', '0,0%', '0,0%', '100,0%', '0,0%', '0,0%', 'palla corta +100,0 punti']);
  assert.deepEqual(riga(S, 'Tempo del colpo', 'oggi · classica'), ['oggi · classica', '40,0%', '40,0%', '20,0%', '10', '60', '20,0%', '20,0%', '20,0 (1)']);
  assert.deepEqual(riga(S, 'Tempo del colpo', 'corretti · classica'), ['corretti · classica', '33,3%', '33,3%', '33,3%', '0', '50', '0,0%', '0,0%', '33,3 (1)']);
  assert.deepEqual(tabella(S, 'Calibrazione giocando').righe, [['oggi · classica', '2', '50,0%', '0,0%', '50,0%', '0,0%', '0,0%']]);
  assert.deepEqual(tabella(S, 'Contro l’avversario').righe, [
    ['oggi · classica · evento', '1', '1', '100,0%', '66,7%', '40,0%', '20,0%'],
    ['oggi · nuova · bambini', '1', '0', '—', '—', '0,0%', '0,0%'],
    ['corretti · classica · stesso schermo', '1', '1', '—', '—', '—', '—'],
    ['corretti · nuova · evento', '1', '1', '0,0%', '—', '—', '—'],
  ]);
  assert.deepEqual(riga(S, 'Dove va la palla', 'oggi · classica'), ['oggi · classica', '5', '1,00', '—', '100,0% di 4', '29%', '40,0%', '20,0%', '80,0%', '—']);
  assert.deepEqual(riga(S, 'Dove va la palla', 'oggi · nuova'), ['oggi · nuova', '3', '1,00', '—', '100,0% di 2', '0%', '0,0%', '0,0%', '66,7%', '—']);
  assert.deepEqual(tabella(S, 'Precision').righe, [
    ['corretti · nuova', '1', '10', '1000', '1000', '100% di 7', '0,00', '100% di 10'],
    ['non noti · classica', '1', '10', '1000', '1000', '100% di 7', '0,00', '100% di 10'],
  ]);
  assert.deepEqual(tabella(S, 'Per telefono').righe.map(r => r.slice(0, 3)), [
    ['oggi · classica · Android', '1', '5'], ['oggi · nuova · iPhone', '1', '3'],
    ['corretti · classica · Android riordinato', '1', '2'], ['corretti · classica · iPhone e altri, come oggi', '1', '1'],
    ['corretti · nuova · senza risposta (pagina di prima)', '1', '1'],
  ]);
  assert.deepEqual(riga(S, 'Per telefono', 'oggi · classica · Android'), ['oggi · classica · Android', '1', '5', '20,0', '40,0%', '40,0%', '40,0%', '40,0%', '40,0% · 20,0%', '1,00', '50%']);
  assert.deepEqual(riga(S, 'Per telefono', 'corretti · classica · iPhone e altri, come oggi').slice(5), ['100,0%', '—', '0,0%', '0,0% · 100,0%', '—', '—']);
  assert.equal(C.telefoni['corretti · classica · iPhone e altri, come oggi'].vuoti, 1, 'il colpo a vuoto del Player 2 va al suo telefono');
});

test('B75: centro della mira per partita e partite storte (E5) dai primi colpi di ogni giocatore; partite del P2 della sfida e senza telefono fuori', () => {
  const A = { giorno: '2026-11-21', postazione: 'abcd1234' }, R = new Riassunto();
  R.aggiungi({ k: 'avvio', t: 0, v: 5, versione: '2026-11-20.2' }, A);
  R.aggiungi({ k: 'partita', t: 1, n: 1, modo: 'cpu', livello: 'evento', ctrl: 'telefono', displayLagMs: 0, stand: { assi: 'corretti' }, tel: { so: 'Android 14', assi: 'corretti' }, dir: 'nuova' }, A);
  // 24 colpi: scarto della cima 30° nei primi 20 (gli ultimi non contano), palla sempre a destra (partita storta)
  for (let i = 0; i < 24; i++) R.aggiungi({ k: 'colpo', t: 2 + i, n: 1, gesto: 'TOPSPIN', voto: 'perfect', ms: 0, dv: i < 20 ? 30 + (i % 3) - 1 : -80, pf: .8, d: .8, tu: 0, lato: 1, rx: 3, rz: -9, nr: 1 }, A);
  R.aggiungi({ k: 'partita.fine', t: 30, n: 1, esito: 'finita', vince: 'g', durS: 60 }, A);
  // partita del computer del P2 della sfida e partita con il mouse: fuori
  R.aggiungi({ k: 'partita', t: 40, n: 2, modo: 'due-computer', ruolo: 'p2', ctrl: 'telefono', displayLagMs: 0, dir: 'classica' }, A);
  R.aggiungi({ k: 'colpo', t: 41, n: 2, gesto: 'TOPSPIN', voto: 'perfect', ms: 0 }, A);
  R.aggiungi({ k: 'partita.fine', t: 42, n: 2, esito: 'finita', vince: 'g', durS: 60 }, A);
  R.aggiungi({ k: 'partita', t: 50, n: 3, modo: 'cpu', livello: 'evento', ctrl: 'mouse', dir: 'classica' }, A);
  R.aggiungi({ k: 'colpo', t: 51, n: 3, gesto: 'TOPSPIN', voto: 'perfect', ms: 0 }, A);
  R.aggiungi({ k: 'partita.fine', t: 52, n: 3, esito: 'finita', vince: 'g', durS: 60 }, A);
  R.fine();
  const G = R.cfr.gruppi['corretti · nuova'];
  assert.equal(G.colpi, 24); assert.equal(G.seme.n, 1); assert.equal(G.seme.media, 30, 'mediana dei primi 20');
  assert.deepEqual([G.giudicate, G.storte], [1, 1]); assert.deepEqual([G.primi, G.primi05], [10, 10]);
  assert.deepEqual([R.cfr.partite.p2, R.cfr.partite.senzaTelefono], [1, 1]);
  assert.equal(Object.keys(R.cfr.gruppi).length, 1);
  const S = confronto(rapporto(R, L0)), testo = S.testo.join('\n');
  assert.match(testo, /Partite del computer del Player 2 della sfida: 1, fuori dal confronto\./);
  assert.match(testo, /Partite senza il telefono \(mouse, tastiera, webcam\): 1, fuori dal confronto\./);
  assert.match(testo, /Nessuna partita in: oggi · classica, oggi · nuova, corretti · classica\./);
  assert.equal(riga(S, 'Cima rispetto', 'corretti · nuova')[7], '30,0 · 30,0 (1 partite)');
  assert.equal(riga(S, 'Dove va la palla', 'corretti · nuova')[9], '100,0% (1)');
});

test('B75: registri finti con i quattro gruppi: il riassunto dà i numeri della verità del generatore', async () => {
  // il generatore senza «confronto» resta com'era (le altre prove dipendono dalle sue righe): con «confronto» righe valide
  const a = giornoFinto({ partite: 120, seme: 4, confronto: true }), b = giornoFinto({ partite: 120, seme: 4, confronto: true });
  assert.deepEqual(a.righe, b.righe, 'ripetibile');
  for (const l of a.righe) assert.deepEqual(controllaRiga(JSON.parse(l)), [], l);
  assert.equal(JSON.parse(a.righe[0]).v, REGISTRO.versione);
  assert.equal(giornoFinto({ partite: 20, seme: 4 }).verita.confronto, undefined);
  const dir = tmp();
  try {
    const f = await scriviFinto({ out: dir, giorni: 2, partite: 240, seme: 6, confronto: true });
    const r = await riassumi(dir, { quando: 'prova' }), C = r.R.cfr;
    const verita = k => f.verita.map(v => v.confronto[k]).filter(Boolean);
    const tot = (k, campo) => verita(k).reduce((s, v) => s + v[campo], 0);
    const mappa = (k, campo, fn = x => x) => { const o = {}; for (const v of verita(k)) for (const [x, n] of Object.entries(v[campo])) { const y = fn(x); o[y] = (o[y] || 0) + n; } return o; };
    assert.deepEqual(Object.keys(C.gruppi).sort(), [...CONFRONTO_GRUPPI].sort());
    assert.equal(C.partite.formato5, 480); assert.equal(C.partite.conAssi, 240); assert.deepEqual([C.partite.assiNonNoti, C.partite.dirNonNota, C.partite.vecchie], [0, 0, 0]);
    for (const k of CONFRONTO_GRUPPI){
      const G = C.gruppi[k];
      assert.equal(G.partite, 120, k); assert.equal(G.partite, tot(k, 'partite'), k);
      for (const campo of ['finite', 'colpi', 'vuoti', 'nr', 'conPf', 'conPl', 'opposti']) assert.equal(G[campo], tot(k, campo), `${k}: ${campo}`);
      assert.deepEqual(G.tipi, mappa(k, 'tipi', tipoColpo), `${k}: tipi`);
      assert.deepEqual(G.cal, mappa(k, 'cal'), `${k}: calibrazione giocando`);
      for (const [t, n] of Object.entries(mappa(k, 'telefoni'))) assert.equal(C.telefoni[`${k} · ${t}`].colpi, n, `${k} · ${t}`);
      const P = C.precision[k]; assert.equal(P?.partite || 0, tot(k, 'precision'), `${k}: Precision`); assert.equal(P?.palle || 0, tot(k, 'palle'), `${k}: palle`);
      const livelli = {}; for (const v of verita(k)) for (const [lv, w] of Object.entries(v.livelli)){ const o = livelli[lv] || (livelli[lv] = { partite: 0, finite: 0, vinte: 0, punti: 0, vinti: 0 }); for (const c of Object.keys(o)) o[c] += w[c]; }
      for (const [lv, w] of Object.entries(livelli)){ const L = C.livelli[`${k} · ${lv}`]; assert.deepEqual([L.partite, L.finite, L.vinte, L.punti, L.vinti], [w.partite, w.finite, w.vinte, w.punti, w.vinti], `${k} · ${lv}`); }
    }
    // le differenze messe apposta nel generatore si vedono nel rapporto
    const G = k => C.gruppi[k];
    for (const k of ['oggi · nuova', 'corretti · nuova']) assert.ok(G(k).cima.rango > .85 && G(k).tempoX.rango < .45, `${k}: la cima comanda (${G(k).cima.rango}, ${G(k).tempoX.rango})`);
    for (const k of ['oggi · classica', 'corretti · classica']) assert.ok(G(k).cima.rango < .82 && G(k).tempoX.rango > .5, `${k}: il tempo pesa (${G(k).cima.rango}, ${G(k).tempoX.rango})`);
    for (const k of ['oggi · classica', 'corretti · classica']) assert.equal(G(k).nr, 0, `${k}: nessun colpo con la regola nuova`);
    const opp = k => G(k).opposti/G(k).conPl, vcb = k => G(k).vcBassa/G(k).vc.n;
    assert.ok(opp('corretti · classica') < opp('oggi · classica') && opp('corretti · nuova') < opp('oggi · nuova'), 'Android riordinati: meno colpi dalla parte opposta');
    const T = k => C.telefoni[k];
    assert.equal(T('corretti · classica · Android riordinato').vcBassa, 0, 'verso sicuro con gli Android riordinati (vc da 0,4)');
    assert.ok(vcb('oggi · classica') > .2, 'verso incerto di oggi');
    const S = confronto(r.sezioni), testo = S.testo.join('\n');
    assert.ok(!testo.includes('ATTENZIONE') && !testo.includes('Pochi dati') && !testo.includes('Nessuna partita'), testo);
    for (const x of tabella(S, 'Gruppi').righe) assert.equal(x[6], '—', `${x[0]}: abbastanza dati`);
    assert.match(riga(S, 'Tipi di colpo', 'corretti · classica')[8], /^(pallonetto \+|topspin −)\d/, 'più pallonetti con gli Android riordinati');
    assert.match(riga(S, 'Tipi di colpo', 'oggi · nuova')[8], /^\S+( corta)? [+−]?\d,\d punti$/);
    assert.equal(tabella(S, 'Per telefono').righe.length, 8, 'Android e iPhone in ognuno dei quattro gruppi');
    assert.equal(tabella(S, 'Contro l’avversario').righe.length, 16, 'tre livelli e lo stesso schermo per gruppo');
    assert.equal(tabella(S, 'Precision').righe.length, 4);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('B75: registri come quelli del 18–19/11 (prima del B74, solo «classica»): un gruppo solo, nessun avviso', async () => {
  const dir = tmp();
  try {
    // il generatore di sempre: formato 4, «classica», niente assi (i registri veri del 18–19/11 sono dei formati 2 e 3)
    const f = await scriviFinto({ out: dir, giorni: 1, partite: 150, seme: 8 });
    const r = await riassumi(dir, { quando: 'prova' }), C = r.R.cfr, S = confronto(r.sezioni), testo = S.testo.join('\n');
    assert.deepEqual(Object.keys(C.gruppi), ['oggi · classica']);
    assert.equal(C.gruppi['oggi · classica'].partite, f.verita[0].partite); assert.equal(C.gruppi['oggi · classica'].colpi, f.verita[0].colpi);
    assert.ok(!testo.includes('ATTENZIONE'), testo);
    assert.match(testo, /Partite di versioni del gioco prima del B74 \(formato delle righe sotto 5, senza la voce degli assi\): 150, contate con gli assi «oggi»\./);
    assert.match(testo, /Nessuna partita in: oggi · nuova, corretti · classica, corretti · nuova\./);
    assert.deepEqual(tabella(S, 'Gruppi').righe.map(x => [x[0], x[6]]), [['oggi · classica', '—'], ['oggi · nuova', 'nessuna partita'], ['corretti · classica', 'nessuna partita'], ['corretti · nuova', 'nessuna partita']]);
    assert.equal(tabella(S, 'Cima rispetto').righe.length, 1, 'le tabelle delle misure hanno solo i gruppi con i colpi');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  // e una giornata di formato 2 e 3 come quelle vere: «dir» c'è, niente displayLagMs nel formato 3 (era del B71), nessun avviso
  const A = { giorno: '2026-11-18', postazione: 'abcd1234' }, R = new Riassunto();
  R.aggiungi({ k: 'avvio', t: 0, v: 3, versione: '2026-11-18.3' }, A);
  R.aggiungi({ k: 'partita', t: 1, n: 1, versione: '2026-11-18.3', modo: 'stesso-schermo', ctrl: 'telefono', tel: { so: 'Android 17' }, tel2: { so: 'Android 17' }, dir: 'classica' }, A);
  R.aggiungi({ k: 'colpo', t: 2, n: 1, gesto: 'TOPSPIN', voto: 'early', ms: 120 }, A);
  R.aggiungi({ k: 'colpo', t: 3, n: 1, chi: 'a', gesto: 'SLICE', voto: 'perfect', ms: 0 }, A);
  R.aggiungi({ k: 'partita.fine', t: 4, n: 1, esito: 'finita', vince: 'g', durS: 60 }, A);
  R.fine();
  const S = confronto(rapporto(R, L0));
  assert.ok(!S.testo.join('\n').includes('ATTENZIONE'));
  assert.deepEqual(Object.keys(R.cfr.gruppi), ['oggi · classica']);
  assert.deepEqual(tabella(S, 'Per telefono').righe.map(x => x.slice(0, 3)), [['oggi · classica · Android', '2', '2']]);
});

test('B75: Worker non ricaricato: avviso chiaro, partite nei gruppi «non noti» e «non nota» fuori dai quattro', () => {
  const A = { giorno: '2026-11-21', postazione: 'abcd1234' };
  // gioco del B74 (formato 5) e Worker di prima del B71 (formato 3) o del B36.0 (formato 1): via displayLagMs, assi e dir
  const R = new Riassunto();
  R.aggiungi({ k: 'avvio', t: 0, v: 5, versione: '2026-11-20.2' }, A);
  R.aggiungi({ k: 'partita', t: 1, n: 1, versione: '2026-11-20.2', modo: 'cpu', livello: 'evento', ctrl: 'telefono', stand: {}, tel: { so: 'Android 14' } }, A);
  R.aggiungi({ k: 'colpo', t: 2, n: 1, gesto: 'TOPSPIN', voto: 'perfect', ms: 0 }, A);
  R.aggiungi({ k: 'partita.fine', t: 3, n: 1, esito: 'finita', vince: 'g', durS: 60 }, A);
  R.aggiungi({ k: 'partita', t: 4, n: 2, versione: '2026-11-20.2', modo: 'cpu', livello: 'evento', ctrl: 'telefono', stand: {}, tel: { so: 'Android 14' }, dir: 'nuova' }, A);
  R.aggiungi({ k: 'partita.fine', t: 5, n: 2, esito: 'finita', vince: 'g', durS: 60 }, A);
  R.fine();
  assert.deepEqual(Object.keys(R.cfr.gruppi).sort(), ['non noti · non nota', 'non noti · nuova']);
  assert.deepEqual([R.cfr.partite.assiNonNoti, R.cfr.partite.dirNonNota], [2, 1]);
  const S = confronto(rapporto(R, L0)), testo = S.testo.join('\n');
  assert.match(testo, /ATTENZIONE: 2 partite con il telefono di un gioco con il formato delle righe 5 o più senza displayLagMs: il Worker del registro non è stato ricaricato e ha tolto anche `assi`\. Non si sa se avevano «Corretti»: sono nel gruppo «non noti», fuori dai quattro/);
  assert.ok(testo.includes(`«Formato delle righe: ${REGISTRO.versione}»`), testo);
  assert.match(testo, /ATTENZIONE: 1 partite di un gioco con il formato delle righe 2 o più senza `dir`: il Worker del registro non è stato ricaricato e ha tolto il modello della direzione\. Non si sa se avevano «Nuova»: sono nel gruppo «non nota», fuori dai quattro\./);
  assert.match(testo, /Nessuna partita in: oggi · classica, oggi · nuova, corretti · classica, corretti · nuova\./);
  assert.deepEqual(tabella(S, 'Gruppi').righe.map(x => x.slice(0, 2)), [['oggi · classica', '0'], ['oggi · nuova', '0'], ['corretti · classica', '0'], ['corretti · nuova', '0'], ['non noti · non nota', '1'], ['non noti · nuova', '1']]);
  // Worker del B71 (formato 4): lascia displayLagMs e toglie solo `assi`: non si vede, il riassunto lo dice come dubbio
  const W = new Riassunto();
  W.aggiungi({ k: 'avvio', t: 0, v: 5, versione: '2026-11-20.2' }, A);
  W.aggiungi({ k: 'partita', t: 1, n: 1, versione: '2026-11-20.2', modo: 'cpu', livello: 'evento', ctrl: 'telefono', displayLagMs: 0, stand: {}, tel: { so: 'Android 14' }, dir: 'classica' }, A);
  W.aggiungi({ k: 'partita.fine', t: 2, n: 1, esito: 'finita', vince: 'g', durS: 60 }, A);
  W.fine();
  const t2 = confronto(rapporto(W, L0)).testo.join('\n');
  assert.ok(!t2.includes('ATTENZIONE'));
  assert.match(t2, /Nessuna partita con «Corretti»: o la voce dello stand era spenta, o il Worker è fermo al formato 4 \(lascia displayLagMs e toglie solo `assi`: il riassunto non può accorgersene\)\. Prima della prova controllare che la pagina del Worker dica «Formato delle righe: 5»\./);
});
