// Catena completa del telefono-racchetta con gesti sintetici riproducibili: sensori a 60 Hz (come un telefono vero)
// → rilevatore e filtro d'orientamento del telefono → messaggio «sw» → lettura sul computer → mappatura del gioco.
// Gli stessi gesti passano per il percorso LAN (flusso binario dei sensori) e per quello via internet (solo JSON):
// i colpi e l'orientamento della racchetta devono venire identici.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector } from '@natpf/tennis/swing-detect.js';
import { createFaceTracker } from '@natpf/tennis/face-tracker.js';
import { createCalibration } from '@natpf/tennis/calibration.js';
import { swingMessage, parseSwingMessage } from '@natpf/tennis/swing-message.js';
import { encodeSensor, decodeSensor } from '@natpf/tennis/sensor-packet.js';
import { natpfSwingToEngine } from '../src/natpf/natpf_phone_racket.js';
import { classifyPhoneShot } from '../src/natpf/natpf_gestures.js';
import * as NS from '../src/natpf/natpf_skill.js';

const G = 9.81, DT = 1000/60;
const qmul = (a, b) => [a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1], a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0], a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3], a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
const qconj = q => [-q[0], -q[1], -q[2], q[3]];
const rotate = (q, v) => qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q)).slice(0, 3);
// telefono simulato come racchetta.js: piatto prima del rilevatore, calibrazione rapida, messaggi JSON
function phone({ transport = 'internet', rtt = 80 } = {}){
  const det = createSwingDetector(), face = createFaceTracker({ quietHold: 400, relax: 2.5 });
  det.on('swing', s => { if (face.ready) s.face = face.faceAt(s.peakT); });
  det.on('status', s => { if (s.s === 'still-ok') face.setRest(s.gravity, det.profile.bias); });
  const cal = createCalibration(det);
  const out = { msgs: [], faces: [], bin: [], preps: [] };
  let t = 0, seq = 0, ready = false, lastFace = -1e9;
  det.on('swing', s => { if (ready) out.msgs.push(JSON.parse(JSON.stringify(swingMessage(s, { grip: 'upright', faceRef: det.profile.faceRef, rtt, now: s.t + 5, seq: ++seq })))); });
  det.on('prep', p => out.preps.push(p));
  // orientamento vero del telefono simulato: la gravità misurata (riferimento del telefono) ruota con lui
  let q = [0, 0, 0, 1];
  const sample = (rot, acc = [0, 0, 0]) => {
    const w = [rot[1], rot[2], rot[0]].map(v => v*Math.PI/180), th = Math.hypot(...w)*DT/1000;
    if (th > 1e-9){ const sn = Math.sin(th/2)/Math.hypot(...w); q = qmul(q, [w[0]*sn, w[1]*sn, w[2]*sn, Math.cos(th/2)]); }
    // gravità e accelerazione della mano sono nel riferimento del campo (y in alto): nel telefono ruotano con lui
    const g = rotate(qconj(q), [0, G, 0]), a = rotate(qconj(q), acc);
    const k = { t, rot, acc: a, accG: [g[0] + a[0], g[1] + a[1], g[2] + a[2]] };
    if (transport === 'lan'){ const p = decodeSensor(encodeSensor(k, out.bin.length)); out.bin.push(p); }
    if (face.ready){ const f = face.feed(k); if (f && t - lastFace >= 33){ lastFace = t; out.faces.push(JSON.parse(JSON.stringify(f))); } }
    det.feed(k); if (cal.state.step !== 'done' && cal.state.step !== 'idle') cal.tick(t, k);
    t += DT;
  };
  const rest = ms => { for (const end = t + ms; t < end;) sample([0, 0, 0]); };
  // gesto: velocità di rotazione a campana attorno a «axis» [α(z), β(x), γ(y)] e accelerazione lineare della mano
  // (vy > 0 sale, < 0 scende; si spinge nella prima metà e si frena nella seconda)
  // colpo realistico: apertura lenta all'indietro (sotto la soglia dei colpi), colpo a campana con il picco nel punto
  // d'impatto, rientro lento al centro. Il piatto all'impatto torna così dove era a riposo, a qualunque velocità.
  const slow = (axis, deg, rate) => { const m = Math.round(Math.abs(deg)/rate*1000/DT); for (let i = 0; i < m; i++) sample(axis.map(a => a*rate*Math.sign(deg))); };
  const move = ({ axis = [0, 0, 1], peak = 700, ms = 260, vy = 0, back = true } = {}) => {
    const n = Math.round(ms/DT), travel = peak*ms/1000*.5;
    if (back) slow(axis, -travel/2, 90);
    for (let i = 0; i <= n; i++){ const u = i/n, w = peak*Math.sin(Math.PI*u)**2; sample(axis.map(a => a*w), [4*Math.sin(Math.PI*u), vy*Math.sin(2*Math.PI*u), 0]); }
    if (back){ rest(120); slow(axis, -travel/2, 90); }
  };
  const calibrate = () => {
    cal.start({ quick: true, hand: 'right' }); rest(800);
    for (const w of ['L', 'R', 'L', 'R']){ move({ axis: [0, 0, w === 'L' ? 1 : -1] }); rest(500); }
    assert.equal(cal.state.step, 'review', JSON.stringify(cal.state.result));
    assert.ok(cal.state.result.pass, 'calibrazione riuscita');
    cal.confirm(); ready = true; rest(600);
  };
  return { det, face, out, rest, move, sample, calibrate, get t(){ return t; } };
}
// sul computer: lettura del messaggio e mappatura del gioco (stessa catena del gioco)
const toGame = (d, { ballHigh = false, hand = 'right' } = {}) => {
  const s = parseSwingMessage(d, { at: 10, now: 10060 });
  return { s, ev: natpfSwingToEngine(s, { hand, now: 10.06, ballHigh, liftBaseline: 0 }) };
};
// rotazione lenta del polso (sotto la soglia dei colpi) di «deg» gradi attorno all'asse verticale: piatto girato
const turn = (p, deg, ms = 160) => { const n = Math.round(ms/DT), w = -deg/(ms/1000); for (let i = 0; i < n; i++) p.sample([0, 0, w]); };
const tilt = (p, deg, ms = 200) => { const n = Math.round(ms/DT), w = deg/(ms/1000); for (let i = 0; i < n; i++) p.sample([0, w, 0]); };

test('dritto e rovescio: lato dal verso del gesto, colpo normale, mira al centro quando il gesto è quello solito', () => {
  const p = phone(); p.calibrate();
  p.move({ axis: [0, 0, 1] }); p.rest(500);
  p.move({ axis: [0, 0, -1] }); p.rest(500);
  const [fh, bh] = p.out.msgs.map(d => toGame(d));
  assert.equal(fh.ev.side, 'forehand'); assert.equal(bh.ev.side, 'backhand');
  assert.equal(fh.ev.natpf.shot, 'topspin');
  assert.equal(fh.ev.natpf.aimSource, 'face');
  assert.ok(Math.abs(fh.ev.natpf.wrist) < .3 && Math.abs(bh.ev.natpf.wrist) < .3, `${fh.ev.natpf.wrist} ${bh.ev.natpf.wrist}`);
});

test('direzione dal piatto all’impatto: girato a destra → palla a destra, a sinistra → a sinistra, anche di rovescio', () => {
  const p = phone(); p.calibrate();
  turn(p, 15); p.move({ axis: [0, 0, 1] }); p.rest(300); turn(p, -15); p.rest(700);       // dritto, piatto a destra
  turn(p, -15); p.move({ axis: [0, 0, 1] }); p.rest(300); turn(p, 15); p.rest(700);       // dritto, piatto a sinistra
  turn(p, -15); p.move({ axis: [0, 0, -1] }); p.rest(300); turn(p, 15); p.rest(700);      // rovescio, piatto a sinistra (lungolinea del destro)
  const [right, left, bhLine] = p.out.msgs.map(d => toGame(d).ev);
  assert.ok(right.natpf.wrist > .3, `destra ${right.natpf.wrist}`);
  assert.ok(left.natpf.wrist < -.3, `sinistra ${left.natpf.wrist}`);
  assert.equal(bhLine.side, 'backhand'); assert.ok(bhLine.natpf.wrist < -.3, `rovescio ${bhLine.natpf.wrist}`);
  // nel campo: il rovescio con il piatto a sinistra va lungolinea (x < 0 per chi è a destra del campo del destro)
  const x = NS.swingLandingX({ timing: 0, contact: -1, wrist: bhLine.natpf.wrist, aimSource: 'face', quality: 1, power: .2, level: NS.skillLevel('pro'), rng: () => .5 });
  assert.ok(x < -1, `rovescio lungolinea ${x}`);
});

test('pallonetto e schiacciata: gesti verticali (dal basso verso l’alto, dall’alto verso il basso)', () => {
  const p = phone(); p.calibrate();
  p.move({ axis: [0, 1, 0], peak: 650, vy: 9 }); p.rest(600);          // dal basso verso l'alto
  p.move({ axis: [0, -1, 0], peak: 750, vy: -9 }); p.rest(600);        // dall'alto verso il basso
  p.move({ axis: [0, -1, 0], peak: 750, vy: -9 }); p.rest(600);
  const [lob, smash, chop] = p.out.msgs;
  assert.equal(lob?.vt, 'up', JSON.stringify(p.out.msgs.map(m => ({ dir: m.dir, vt: m.vt, l: m.l }))));
  assert.equal(toGame(lob).ev.natpf.shot, 'lob'); assert.equal(toGame(lob).ev.shotType, 'lob');
  assert.equal(smash.vt, 'down');
  assert.equal(toGame(smash, { ballHigh: true }).ev.natpf.shot, 'smash');
  assert.equal(toGame(chop, { ballHigh: false }).ev.natpf.shot, 'slice');
});

test('palla corta: taglio dall’alto, piatto aperto e gesto morbido insieme; uno solo dei segnali non basta', () => {
  const p = phone(); p.calibrate();
  tilt(p, 20); p.move({ axis: [0, 0, 1], peak: 420, vy: -9 }); p.rest(300); tilt(p, -20); p.rest(700);   // aperto, morbido, giù
  p.move({ axis: [0, 0, 1], peak: 420, vy: -9 }); p.rest(700);                                         // stesso gesto, piatto dritto
  const [drop, cut] = p.out.msgs.map(d => toGame(d).ev);
  assert.ok(drop.natpf.why.join(' ').includes('aperto'), JSON.stringify(drop.natpf));
  assert.equal(drop.natpf.shot, 'drop');
  assert.equal(cut.natpf.shot, 'slice');
  // tabella: il piatto aperto da solo, o la mano che scende da sola, non fanno una palla corta
  assert.equal(classifyPhoneShot({ dir: 1, lift: 0, facePitch: 20, power: .2 }).shot, 'topspin');
  assert.equal(classifyPhoneShot({ dir: 1, lift: -.5, facePitch: 0, power: .2 }).shot, 'slice');
  assert.equal(classifyPhoneShot({ dir: 1, lift: -.5, facePitch: 20, power: .8 }).shot, 'slice');
});

test('tabella dei colpi: topspin, piatto, lob orizzontale, schiacciata su palla alta', () => {
  assert.equal(classifyPhoneShot({ dir: 1, lift: .25, power: .6 }).shot, 'topspin');
  assert.equal(classifyPhoneShot({ dir: 1, lift: 0, power: .9, facePitch: 2 }).shot, 'flat');
  assert.equal(classifyPhoneShot({ dir: 1, lift: 0, power: .9, facePitch: -18 }).shot, 'topspin');
  assert.equal(classifyPhoneShot({ dir: -1, lift: .5 }).shot, 'lob');
  assert.equal(classifyPhoneShot({ dir: -1, lift: .35, facePitch: 14 }).shot, 'lob');
  assert.equal(classifyPhoneShot({ dir: -1, lift: .35, facePitch: 0 }).shot, 'topspin');
  assert.equal(classifyPhoneShot({ dir: 1, lift: -.25, ballHigh: true }).shot, 'smash');
  assert.equal(classifyPhoneShot({ dir: 1, lift: .3, liftBaseline: .25 }).shot, 'topspin', 'si confronta con il proprio dritto');
});

test('micro-movimenti della mano in attesa: nessun colpo', () => {
  const p = phone(); p.calibrate();
  for (let i = 0; i < 6; i++){ p.move({ axis: [Math.sin(i), Math.cos(i), (i % 2 ? 1 : -1)].map(v => v*.6), peak: 140, ms: 180 }); p.rest(120); }
  turn(p, 10); turn(p, -10); tilt(p, 12); tilt(p, -12); p.rest(400);
  assert.equal(p.out.msgs.length, 0, JSON.stringify(p.out.msgs.map(m => ({ v: m.v, dir: m.dir, vt: m.vt, l: m.l }))));
});

test('stessi gesti in LAN e via internet: stessi colpi, stessa direzione, stesso orientamento della racchetta', () => {
  const run = transport => {
    const p = phone({ transport, rtt: transport === 'lan' ? 19 : 90 }); p.calibrate();
    turn(p, 12); p.move({ axis: [0, 0, 1] }); p.rest(300); turn(p, -12); p.rest(600);
    p.move({ axis: [0, 0, -1], peak: 900 }); p.rest(600);
    p.move({ axis: [0, 1, 0], peak: 650, vy: 9 }); p.rest(600);
    return p;
  };
  const lan = run('lan'), net = run('internet');
  assert.ok(lan.out.bin.length > 100 && lan.out.bin.every(Boolean), 'flusso binario LAN decodificato senza perdite');
  const strip = m => { const { lat, ...rest } = m; return rest; };       // solo la stima del ritardo dipende dalla rete
  assert.deepEqual(lan.out.msgs.map(strip), net.out.msgs.map(strip));
  assert.deepEqual(lan.out.faces, net.out.faces);
  const games = p => p.out.msgs.map(d => { const { ev } = toGame(d); return [ev.side, ev.natpf.shot, ev.natpf.wrist]; });
  assert.deepEqual(games(lan), games(net));
  // il tempo del colpo si conta dall'istante del picco: la latenza di rete non sposta il voto
  const tau = lat => NS.swingTiming(-1.9 + 15*lat, 15, lat);
  assert.ok(Math.abs(tau(.019) - tau(.09)) < 1e-9);
});

test('tempi misurati sul telefono: riconoscimento poco dopo il picco, istante del picco preciso, nessuna attesa senza preparazione', () => {
  const p = phone(); p.calibrate();
  const n = Math.round(260/DT), t0 = p.t;
  p.move({ axis: [0, 0, 1], back: false }); p.rest(400);
  const m = p.out.msgs[0], truePeak = t0 + n/2*DT;
  assert.ok(Math.abs(m.pk - truePeak) <= DT/2 + .5, `picco ${m.pk} vero ${truePeak}`);
  assert.ok(m.sd >= 0 && m.sd <= 3*DT, `riconoscimento ${m.sd} ms`);
  assert.equal(m.hd, 0);
});

test('pagina del telefono: tutti i moduli si leggono senza errori di sintassi (racchetta.js non si può importare in Node)', async () => {
  const { execFileSync } = await import('node:child_process');
  const fs = await import('node:fs'), path = await import('node:path');
  const dir = path.resolve(import.meta.dirname, '../../site/js/tennis');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) execFileSync(process.execPath, ['--experimental-default-type=module', '--check', path.join(dir, f)], { stdio: 'pipe' });
});
