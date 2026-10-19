// Riconoscimento dei colpi con la presa vera (video del 19/10): telefono in verticale nel pugno, inclinato in avanti,
// schermo girato di lato, polso che prona di 60–90° a fine dritto, mano mai ferma. Telefono simulato completo
// (test/phone-sim.mjs: stessi T, L, piatto e verso della pagina del telefono) e riferimenti che si adattano come in
// partita. Difetti riprodotti: dritti letti come pallonetti o tagliati per la sola rotazione del polso; colpi spariti
// con l'impugnatura cambiata dopo la calibrazione; dopo tre pallonetti di fila il quarto usciva dritto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simPhone } from './phone-sim.mjs';
import { classifyPhoneShot } from '../src/natpf/natpf_gestures.js';

// una serie di colpi uguali dopo la calibrazione: { shots, sides, n }
function series({ setup = null, gesture, n = 4, seed = 7, ballHigh = false }){
  const p = simPhone({ seed }); p.calibrate(); setup?.(p);
  for (let i = 0; i < n; i++){ gesture(p, i); p.rest(700, 6); }
  const r = p.msgs.map(d => p.game(d, { ballHigh }));
  return { shots: r.map(x => x.ev.natpf.shot), sides: r.map(x => x.ev.side), why: r.map(x => x.ev.natpf.why.join(', ')), n: r.length, conf: r.map(x => x.ev.natpf.conf) };
}
const grip = (tilt, yaw) => p => { p.pose([0, 1, 0], yaw); p.pose([1, 0, 0], -tilt); p.rest(500, 4); };

test('dritto: inclinazioni, schermo di lato e pronazione del polso non lo trasformano in pallonetto o tagliato', () => {
  let total = 0;
  for (const tilt of [0, 35, 60]) for (const yaw of [0, 60]) for (const wrist of [0, 450, -450, 800]){
    const r = series({ setup: grip(tilt, yaw), gesture: p => p.swing({ axis: [0, 1, 0], peak: 750, wrist, wristAxis: [0, 0, -1], tremor: 8 }) });
    const tag = `inclinazione ${tilt}°, schermo ${yaw}°, polso ${wrist}°/s`;
    assert.equal(r.n, 4, `${tag}: un gesto, un colpo (${r.n} su 4)`);
    assert.ok(r.shots.every(s => s === 'topspin' || s === 'flat'), `${tag}: ${r.shots} · ${r.why.join(' | ')}`);
    assert.ok(r.sides.every(s => s === 'forehand'), `${tag}: ${r.sides}`);
    total += r.n;
  }
  assert.equal(total, 96);
});

test('rovescio con la stessa presa: resta un rovescio normale', () => {
  for (const tilt of [0, 45]) for (const wrist of [0, 500, -500]){
    const r = series({ setup: grip(tilt, 30), gesture: p => p.swing({ axis: [0, -1, 0], peak: 700, wrist, wristAxis: [0, 0, -1], tremor: 8 }) });
    assert.equal(r.n, 4); assert.ok(r.sides.every(s => s === 'backhand'), String(r.sides));
    assert.ok(r.shots.every(s => s === 'topspin' || s === 'flat'), `inclinazione ${tilt}, polso ${wrist}: ${r.shots}`);
  }
});

test('lento, normale, veloce: sempre un colpo e sempre un dritto quando il gesto è un dritto', () => {
  for (const peak of [330, 600, 1200]){
    const r = series({ setup: grip(35, 30), gesture: p => p.swing({ axis: [0, 1, 0], peak, ms: peak > 900 ? 200 : 280, wrist: peak*.6, wristAxis: [0, 0, -1], tremor: 8 }) });
    assert.equal(r.n, 4, `picco ${peak}°/s: ${r.n} colpi`);
    assert.ok(r.shots.every(s => s === 'topspin' || s === 'flat'), `picco ${peak}°/s: ${r.shots} · ${r.why[0]}`);
  }
});

test('pallonetto: la mano sale davvero (anche con il telefono inclinato e in ogni verso di rotazione), quattro di fila', () => {
  for (const sx of [1, -1]) for (const fh of [0, .5]) for (const tilt of [0, 35]){
    const r = series({ setup: grip(tilt, 0), gesture: p => p.swing({ axis: [sx, fh, 0], peak: 650, vy: 9, push: 2, tremor: 6 }) });
    assert.equal(r.n, 4); assert.deepEqual(r.shots, ['lob', 'lob', 'lob', 'lob'], `asse ${sx}/${fh}, inclinazione ${tilt}: ${r.why.join(' | ')}`);
  }
});

test('traiettoria della mano: dritto dal basso verso l’alto = top spin, decisamente verso l’alto = pallonetto, con o senza polso', () => {
  for (const wrist of [0, 600, -600]){
    const shot = (vy, push) => series({ setup: grip(35, 0), gesture: p => p.swing({ axis: [0, 1, 0], peak: 750, vy, push, wrist, wristAxis: [0, 0, -1], tremor: 6 }) }).shots;
    for (const [vy, push] of [[0, 4], [2, 4], [3, 4], [4, 8], [6, 8]]) assert.ok(shot(vy, push).every(s => s === 'topspin'), `su ${vy}, avanti ${push}, polso ${wrist}`);
    for (const [vy, push] of [[5, 4], [9, 4], [9, 8]]) assert.ok(shot(vy, push).every(s => s === 'lob'), `su ${vy}, avanti ${push}, polso ${wrist}`);
  }
});

test('palla corta: come prima (taglio morbido con il piatto che scende), quattro di fila; un dritto lento resta un dritto', () => {
  const drop = series({ gesture: p => p.swing({ axis: [.6, 1, 0], peak: 430, vy: -8, push: 2 }) });
  assert.deepEqual(drop.shots, ['drop', 'drop', 'drop', 'drop'], drop.why.join(' | '));
  const slow = series({ gesture: p => p.swing({ axis: [0, 1, 0], peak: 420, push: 2 }) });
  assert.ok(slow.shots.every(s => s === 'topspin'), String(slow.shots));
  // tabella: un gesto lento da solo non è una palla corta; la palla corta con T resta quella di prima
  assert.equal(classifyPhoneShot({ dir: 1, power: .3, speed: .5, head: 0, lift: 0 }).shot, 'topspin');
  assert.equal(classifyPhoneShot({ dir: 1, power: .35, speed: .5, head: -.6, lift: -.2 }).shot, 'drop');
});

test('rumore della mano e piccoli aggiustamenti dell’impugnatura: nessun colpo', () => {
  const p = simPhone({ seed: 9 }); p.calibrate();
  p.rest(3000, 25);
  for (const [ax, deg] of [[[0, 1, 0], 25], [[1, 0, 0], -30], [[0, 0, 1], 40], [[0, 1, 0], -20]]){ p.pose(ax, deg, 80); p.rest(400, 15); }
  assert.equal(p.msgs.length, 0, `${p.msgs.length} colpi da tremolio e aggiustamenti`);
});

test('impugnatura cambiata dopo la calibrazione (telefono girato di 90° nella mano): dritto e rovescio restano riconosciuti', () => {
  const fh = series({ setup: p => { p.pose([0, 0, 1], 90); p.rest(500, 4); }, gesture: p => p.swing({ axis: [0, 1, 0], peak: 750, tremor: 6 }) });
  assert.equal(fh.n, 4, 'prima i colpi sparivano senza messaggio'); assert.ok(fh.sides.every(s => s === 'forehand'), String(fh.sides));
  const bh = series({ setup: p => { p.pose([0, 0, 1], 90); p.rest(500, 4); }, gesture: p => p.swing({ axis: [0, -1, 0], peak: 700, tremor: 6 }) });
  assert.equal(bh.n, 4); assert.ok(bh.sides.every(s => s === 'backhand'), String(bh.sides));
});

test('tabella: la sola rotazione del piatto non fa colpi speciali; la diagnostica dice perché e con che confidenza', () => {
  const wristUp = classifyPhoneShot({ dir: 1, lift: 0, head: .7, power: .7, speed: 1 });
  assert.equal(wristUp.shot, 'topspin'); assert.match(wristUp.why.join(), /rotazione del polso/);
  const wristDown = classifyPhoneShot({ dir: 1, lift: 0, head: -.7, power: .7, speed: 1 });
  assert.equal(wristDown.shot, 'topspin');
  const lob = classifyPhoneShot({ dir: 1, lift: .3, head: .7, power: .7, speed: 1 });
  assert.equal(lob.shot, 'lob'); assert.ok(lob.conf > 0 && lob.conf <= 1);
  assert.equal(classifyPhoneShot({ dir: 1, lift: .6, head: -.3, power: .7, speed: 1 }).shot, 'lob', 'la traiettoria conta più della rotazione');
  // senza T (telefoni senza orientamento) la tabella è quella di prima
  assert.equal(classifyPhoneShot({ dir: 1, lift: .6, power: .7, speed: 1 }).shot, 'lob');
  assert.equal(classifyPhoneShot({ dir: 1, lift: .1, power: .7, speed: 1 }).shot, 'topspin');
});
