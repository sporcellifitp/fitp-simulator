// B35a (collaudo dell'utente del 13/11/2026 con il telefono vero): «ho provato a fare un dritto che partiva da destra
// andando verso sinistra per incrociare e ho ottenuto un dritto lungolinea; lo stesso per i rovesci». Due cause trovate con
// il banco scripts/audit/direzione-telefono.mjs e corrette:
//   1. sensori con l'accelerazione al contrario (verso girato dagli scambi di prova o dal voto del telefono): si girava il
//      verso del colpo ma non la direzione del piatto, e la mira restava specchiata (incrociato ↔ lungolinea);
//   2. centro della mira che inseguiva una mira tenuta: dal settimo incrociato di fila la palla andava al centro.
// Qui: le regole pure (signedSwing, swingMessage, profilo imparato, centro della mira) e la catena del telefono simulato per
// ogni combinazione di mano, colpo, calibrazione e segno dei sensori.
import test from 'node:test';
import assert from 'node:assert/strict';
import { signedSwing, createTrialLearner } from '../src/natpf/natpf_trial_learn.js';
import { createAimModel, AIM } from '../src/natpf/natpf_gestures.js';
import { swingMessage, parseSwingMessage } from '@natpf/tennis/swing-message.js';
import { rng } from './phone-sim.mjs';
import { CALS, stroke, serie, match, matrix } from '../scripts/audit/direzione-telefono.mjs';

test('signedSwing: con il segno −1 si girano insieme verso, mira del gesto, polso, direzione del piatto e piatto; con +1 niente', () => {
  const s = { dir: 1, aim: .3, twist: -.2, heading: 14.5, face: { yaw: 12, pitch: 5, roll: 1, aim: .28 }, peak: 700, shape: { rise: .2 } };
  assert.equal(signedSwing(s, 1), s, 'segno giusto: lo stesso oggetto');
  const g = signedSwing(s, -1);
  assert.deepEqual({ dir: g.dir, aim: g.aim, twist: g.twist, heading: g.heading, face: g.face }, { dir: -1, aim: -.3, twist: .2, heading: -14.5, face: { yaw: -12, pitch: 5, roll: 1, aim: -.28 } });
  assert.equal(g.peak, 700); assert.deepEqual(g.shape, { rise: .2 }, 'forza e forma non cambiano');
  // campi che mancano restano mancanti (telefoni senza direzione assoluta, piatto non credibile)
  const h = signedSwing({ dir: -1, face: { yaw: 3, pitch: 0, roll: 0, aim: null } }, -1);
  assert.equal(h.dir, 1); assert.ok(!('heading' in h) && !('aim' in h) && !('twist' in h)); assert.equal(h.face.aim, null); assert.equal(h.face.yaw, -3);
});

test('profilo degli scambi di prova con il segno girato: il centro della mira per verso è la direzione del piatto girata', () => {
  const L = createTrialLearner(), S = (dir, peak, heading) => ({ dir, peak, rawPeak: peak, heading, head: 0, shape: { rise: .1 } });
  // il telefono legge tutto al contrario: palla a destra (+1) letta −1, con la direzione del piatto al contrario
  [[1, S(-1, 700, 18)], [-1, S(1, 600, -9)], [1, S(-1, 720, 22)], [-1, S(1, 610, -11)]].forEach(([want, s], i) => { L.vote({ ball: i + 1, want, s }); L.mark(i + 1, true); });
  assert.equal(L.sign, -1);
  const p = L.profile({ simple: true });
  assert.equal(p.faceRef[1].heading, -20); assert.equal(p.faceRef[-1].heading, 10);
  // senza segno girato resta com'era
  const A = createTrialLearner();
  [[1, S(1, 700, 18)], [-1, S(-1, 600, -9)], [1, S(1, 720, 22)], [-1, S(-1, 610, -11)]].forEach(([want, s], i) => { A.vote({ ball: i + 1, want, s }); A.mark(i + 1, true); });
  assert.equal(A.sign, 1); assert.equal(A.profile({ simple: true }).faceRef[1].heading, 20);
});

test('messaggio «sw»: con il verso girato dal voto del telefono (absSign −1) piatto e direzione assoluta si girano, e il computer lo sa (sg)', () => {
  const base = { power: .6, lift: .1, dur: 200, dir: 1, aim: 0, confidence: .8, peakT: 1000, t: 1030, peak: 700, face: { yaw: 10, pitch: 2, roll: 0, abs: 25 } };
  const a = swingMessage(base, { now: 1040 }), b = swingMessage({ ...base, absSign: -1 }, { now: 1040 });
  assert.equal(a.fh, 25); assert.equal(b.fh, -25);
  assert.equal(a.fy, 10); assert.equal(b.fy, -10); assert.ok(a.fa > 0 && b.fa === -a.fa);
  const pa = parseSwingMessage(a, { at: 1, now: 1000 }), pb = parseSwingMessage(b, { at: 1, now: 1000 });
  assert.equal(pa.heading, 25); assert.equal(pb.heading, -25);
  assert.ok(!('sg' in a) && !('absSign' in pa)); assert.equal(b.sg, -1); assert.equal(pb.absSign, -1);
  assert.deepEqual(swingMessage({ ...base, absSign: 1 }, { now: 1040 }), a, 'segno giusto: messaggio di sempre');
});

test('centro della mira seminato dagli scambi di prova (trusted): una mira tenuta di 10–14° non viene assorbita, un seme sbagliato di 30° sì', () => {
  const R = rng(5), g = () => (R() - .5)*2;
  // incrociato tenuto: 14 colpi a −12° ± 2 dopo un seme giusto (0°)
  const held = trusted => { const m = createAimModel(); m.seed(1, 0, { trusted }); const out = []; for (let i = 0; i < 14; i++){ const h = -12 + 2*g(); out.push(m.aim(1, h).aim); m.add(1, h); } return { out, center: m.center(1) }; };
  const T = held(true), U = held(false);
  assert.ok(T.out.slice(-4).every(a => a <= -.3), `seme dagli scambi di prova: la mira resta ${T.out}`);
  assert.ok(Math.abs(T.center) < 6, `centro ${T.center}`);
  assert.ok(Math.abs(U.center) > Math.abs(T.center) + 3, `seme dei gesti a vuoto: il centro insegue come prima (${U.center} contro ${T.center})`);
  // seme sbagliato di 30° (oltre biasDevTrusted): i colpi normali lo riportano al loro centro anche con trusted
  // (lo sbilanciamento lo porta sotto biasDevTrusted, poi la deriva lenta: più piano che con i gesti a vuoto)
  const m = createAimModel(); m.seed(1, 30, { trusted: true });
  for (let i = 0; i < 20; i++) m.add(1, 2*g());
  assert.ok(Math.abs(m.center(1)) < 15, `seme sbagliato di 30°, dopo 20 colpi: centro ${m.center(1)}`);
  for (let i = 0; i < 20; i++) m.add(1, 2*g());
  assert.ok(Math.abs(m.center(1)) < 8, `seme sbagliato di 30°, dopo 40 colpi: centro ${m.center(1)}`);
  assert.ok(AIM.biasDevTrusted > 17 && AIM.biasDevTrusted < 30, 'oltre la mira piena (17°), sotto gli errori grandi del seme');
  // verifica dei primi colpi (oltre 35°): si prende la mediana e il seme non è più «trusted»
  const v = createAimModel(); v.seed(-1, 120, { trusted: true }); for (let i = 0; i < AIM.verify; i++) v.add(-1, 5 + g());
  assert.ok(Math.abs(v.center(-1) - 5) < 2 && !v.trusted(-1));
  // reset: niente resta
  v.reset(); assert.equal(v.center(-1), null); assert.equal(v.trusted(-1), false);
});

// Catena del telefono simulato (braccio, presa della foto): piatto girato di 15° verso l'incrociato o verso il lungolinea,
// letto con il segno della mira giusto per ogni mano, colpo, calibrazione e segno dei sensori
test('per ogni combinazione (destro e mancino, dritto e rovescio, 5 calibrazioni con e senza sensori al contrario): il piatto verso l\'incrociato si legge incrociato', () => {
  for (const hand of ['right', 'left']) for (const cal of Object.keys(CALS)){
    const p = CALS[cal].make(3, hand); p.hand = hand;
    const R = rng(11);
    // colpi normali di qualche punto (con «Salta» e i sensori al contrario il telefono gira il verso dopo 4–5 colpi e il centro
    // della mira riparte da capo: 3 colpi per verso)
    for (let i = 0; i < 12; i++){ const m = stroke(p, { side: i % 2 ? 'backhand' : 'forehand', R }); if (m.length === 1) p.game(m[0]); }
    for (const side of ['forehand', 'backhand']){
      // contatto: +1 dritto del destro e rovescio del mancino; l'incrociato va dall'altra parte (x di segno −contatto)
      const c = (side === 'forehand' ? 1 : -1)*(hand === 'left' ? -1 : 1);
      for (const want of [1, -1]){                       // +1 incrociato, −1 lungolinea
        const m = stroke(p, { side, turn: -c*want*15, R });
        assert.equal(m.length, 1, `${hand} ${cal} ${side}`);
        const ev = p.game(m[0], { learn: false }).ev, face = ev.natpf.intent?.face;
        assert.equal(ev.side, side, `${hand} ${cal} ${side}: lato`);
        assert.ok(Number.isFinite(face) && -c*want*face > .4, `${hand} ${cal} ${side} ${want > 0 ? 'incrociato' : 'lungolinea'}: mira ${face}`);
      }
    }
  }
});

test('nel motore: incrociati voluti mai lungolinea con il gesto buono, anche con i sensori al contrario; dieci incrociati di fila restano incrociati', () => {
  for (const cal of ['prova', 'prova-inv', 'salta-inv']) for (const hand of ['right', 'left']){
    const r = match({ cal, hand, seed: 1, n: 3, model: 'naturale', warm: 12 });
    const M = matrix(r.rows);
    assert.equal(M.m.cross.line, 0, `${cal} ${hand}: ${JSON.stringify(M.m)}`);
    assert.equal(M.m.line.cross, 0, `${cal} ${hand}: ${JSON.stringify(M.m)}`);
    assert.ok(M.m.cross.cross >= 50 && M.m.line.line >= 25, `${cal} ${hand}: ${JSON.stringify(M.m)}`);
  }
  const s = serie({ want: 'cross', model: 'piatto', seed: 1 });
  assert.ok(s.filter(g => g === 'cross').length >= 12 && !s.includes('line'), s.join(' '));
  assert.ok(s.slice(-5).filter(g => g === 'cross').length >= 4, `gli ultimi colpi della serie restano incrociati: ${s.join(' ')}`);
});

// Strumento per la sessione vera (scripts/diag/diag.mjs direzione): voluto dalla prova guidata o dai blocchi tra i segni
test('analisi della sessione registrata: voluto → ottenuto, piatto e tempo nel verso voluto, oltre la finestra, segno e fuori', async () => {
  const { directionReport, gotOf } = await import('../src/natpf/diag/diag_direction.js');
  // dritto del destro (contatto +1): incrociato a sinistra (x < 0), lungolinea a destra
  assert.equal(gotOf({ x: -2.5, z: -9, lato: 1 }), 'incrociato'); assert.equal(gotOf({ x: 2.5, z: -9, lato: 1 }), 'lungolinea');
  assert.equal(gotOf({ x: 2.5, z: -9, lato: -1 }), 'incrociato', 'rovescio del destro: incrociato a destra');
  assert.equal(gotOf({ x: .3, z: -9, lato: 1 }), 'centro'); assert.equal(gotOf({ x: -4.6, z: -9, lato: 1 }), 'fuori'); assert.equal(gotOf({ rete: true }), 'rete');
  assert.equal(gotOf({ x: 1, z: -12.4, lato: 1 }), 'fuori', 'lunga');
  let t = 0;
  const k = o => ({ t: (t += 900), k: 'racchetta', chi: 'player', ...o });
  // prova guidata: 4 dritti incrociati voluti, il telefono girato verso il lungolinea e in ritardo (come nel collaudo)
  const ev = [{ t: 0, k: 'tel.profilo', profilo: { trialSign: -1 } }];
  for (let i = 0; i < 4; i++){ ev.push({ t: (t += 100), k: 'atteso', lato: 'forehand', direzione: 'incrociato', finestraMs: 4000 }); ev.push(k({ n: i, lato: 1, piatto: .5, tempo: -1.3, tempoMs: -110, oltre: .3, x: i < 3 ? 2.6 : 4.6, z: -9.5 })); }
  const R = directionReport(ev, { meta: { gioco: { ritardoSchermoMs: 0, difficolta: 'pro' } } });
  assert.equal(R.colpi, 4); assert.equal(R.perVoluto.incrociato.ottenuto.lungolinea, 75); assert.equal(R.perVoluto.incrociato.ottenuto.fuori, 25);
  assert.equal(R.perVoluto.incrociato.piattoGiusto, 0); assert.equal(R.perVoluto.incrociato.piattoMediano, -.5); assert.equal(R.oltreTardi, 100);
  assert.ok(R.segnoGirato);
  const notes = R.diagnosi.join('\n');
  assert.match(notes, /cima verso il centro/); assert.match(notes, /ritardo dello schermo/); assert.match(notes, /segno al contrario/);
  // blocchi tra i segni Maiusc+M: dritti lungolinea poi rovesci incrociati, colpi buoni
  t = 0; const ev2 = [];
  for (let i = 0; i < 3; i++) ev2.push(k({ n: i, lato: 1, piatto: .6, tempo: -.2, x: 2.4, z: -9.6 }));
  ev2.push({ t: (t += 10), k: 'marca', testo: 'segno da tastiera' });
  for (let i = 0; i < 3; i++) ev2.push(k({ n: 10 + i, lato: -1, piatto: .5, tempo: .3, x: 2.2, z: -9.4 }));
  const B = directionReport(ev2, { blocks: 'dl,ri' });
  assert.equal(B.perVoluto.lungolinea.giusti, 100); assert.equal(B.perVoluto.incrociato.giusti, 100);
  assert.equal(B.perVoluto.incrociato.piattoGiusto, 100, 'rovescio del destro: piatto a destra = verso l\'incrociato');
  assert.match(B.diagnosi.join(' '), /segue il gesto/);
  assert.equal(directionReport(ev2).colpi, 0, 'senza prova guidata né blocchi: nessun voluto');
});
