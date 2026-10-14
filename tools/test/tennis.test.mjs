// node --test tools/test: Tennis 1 contro 1 (set corti e tie-break, let, colpo con lo swing, servizio con il lancio,
// rilevatore dei colpi del telefono, abbinamento con il QR)
import test from 'node:test';
import assert from 'node:assert/strict';
import { COURTS, newBall, stepBall, predict } from '../../site/js/match/physics.js';
import { newScore, awardPoint, pointLabels, Rally } from '../../site/js/match/rules.js';
import { MatchCore, mulberry32, tossY } from '../../site/js/match/core.js';
import { rel, S0 } from '../../site/js/match/racket.js';
import { gauss } from '../../site/js/match/ai.js';
import { createSwingDetector } from '../../site/js/tennis/swing-detect.js';
import { createGate, parsePairing, pairingUrl, newSessionId, SESSION_PREFIX } from '../../site/js/tennis/pairing.js';

const game = (s, t) => { for (let i = 0; i < 4; i++) awardPoint(s, t); };

test('set corto a 4: due game di scarto, tie-break sul 4-4', () => {
  let s = newScore({ gamesToWin: 4, set: true, firstServer: 0 });
  for (let i = 0; i < 3; i++){ game(s, 0); game(s, 1); }             // 3-3
  game(s, 0); assert.equal(s.winner, null);                          // 4-3: non basta
  game(s, 0); assert.equal(s.winner, 0); assert.deepEqual(s.games, [5, 3]);

  s = newScore({ gamesToWin: 4, set: true, firstServer: 0 });
  for (let i = 0; i < 4; i++){ game(s, 0); game(s, 1); }             // 4-4
  assert.equal(s.tiebreak, true); assert.deepEqual(pointLabels(s), ['0', '0']);
  const first = s.server, order = [s.server];
  for (let i = 0; i < 6; i++){ awardPoint(s, i % 2); order.push(s.server); }   // 3-3 nel tie-break
  // serve uno, poi due a testa
  assert.deepEqual(order, [first, 1 - first, 1 - first, first, first, 1 - first, 1 - first]);
  assert.deepEqual(pointLabels(s), ['3', '3']);
  awardPoint(s, 1); awardPoint(s, 1); awardPoint(s, 1); assert.equal(s.winner, null);   // 3-6
  awardPoint(s, 0); awardPoint(s, 0); awardPoint(s, 0); assert.equal(s.winner, null);   // 6-6: serve il doppio scarto
  awardPoint(s, 1); const r = awardPoint(s, 1);
  assert.equal(r.match, true); assert.equal(s.winner, 1); assert.deepEqual(s.games, [4, 5]);
});

test('partita a 1 game e formato del mondo invariato (primo a N game)', () => {
  const s = newScore({ gamesToWin: 1 }); game(s, 1); assert.equal(s.winner, 1);
  const w = newScore({ gamesToWin: 2 }); game(w, 0); game(w, 1); game(w, 0); assert.equal(w.winner, 0); assert.equal(w.tiebreak, false);
});

test('let: il servizio tocca il nastro ed entra nel riquadro, si ripete senza perdere la prima', () => {
  const r = new Rally(COURTS.tennis, { server: 0, fromRight: true });
  r.hit(0);
  assert.equal(r.event({ type: 'net', tape: true, x: 0, y: .9, z: 0 }), null);
  assert.deepEqual(r.event({ type: 'bounce', x: -2, z: -4, side: 1 }), { let: true });
  assert.equal(r.attempt, 1); assert.equal(r.state, 'serve');
  // sul nastro e fuori: fallo normale
  r.hit(0); r.event({ type: 'net', tape: true, x: 0, y: .9, z: 0 });
  assert.equal(r.event({ type: 'bounce', x: 2, z: -4, side: 1 }).fault, true);
});

test('fisica: palla sul nastro passa rallentata, palla bassa torna indietro', () => {
  const c = COURTS.tennis;
  const tape = newBall({ x: 0, y: .88, z: 1 }, { x: 0, y: 0, z: -15 }), ev = [];
  stepBall(tape, .1, c, ev);
  assert.ok(ev.some(e => e.type === 'net' && e.tape)); assert.ok(tape.p.z < 0 && tape.v.z > -10);
  const low = newBall({ x: 0, y: .5, z: 1 }, { x: 0, y: 0, z: -15 }), ev2 = [];
  stepBall(low, .1, c, ev2);
  assert.ok(ev2.some(e => e.type === 'net' && !e.tape)); assert.ok(low.p.z > 0);
});

/* ---------- colpo con lo swing ---------- */
// scambio in corso: il computer ha appena risposto, la palla arriva al giocatore (fermo a z = 11) sul dritto
function rallyScene(seed = 1){
  const core = new MatchCore({ sport: 'tennis', teams: [[{ human: true, id: 'me' }], [{ id: 'cpu' }]], level: 'normale', gamesToWin: 4, set: true, firstServer: 0, rng: mulberry32(seed) });
  const h = core.players[0];
  core.phase = 'live'; core.rally.hit(0); core.rally.event({ type: 'bounce', x: -2, z: -4, side: 1 }); core.rally.hit(1);
  core.sinceHit = .5; core.ball.held = false;
  Object.assign(h, { x: 0, z: 11, tx: 0, tz: 11 });
  core.ball.p = { x: .6, y: 1.2, z: 3 }; core.ball.v = { x: 0, y: 1.88, z: 16 };
  // quando la palla passa davanti al giocatore nel punto ideale
  const tc = predict(core.ball, core.court, 1.5, 1/600).find(k => k.z >= 11 - S0).t;
  return { core, h, tc };
}
function runSwing(core, delay, after = 0, win = .085){
  const dt = 1/120; let t = 0, out = null;
  const evs = [];
  while (t < after){ evs.push(...core.update(dt, { move: { x: 0, y: 0 } })); t += dt; }
  for (const e of core.update(dt, { move: { x: 0, y: 0 }, swing: { power: .6, delay, win } })){ evs.push(e); if ((e.type === 'contact' || e.type === 'whiff') && e.player === 'me') out = e; }
  for (let i = 0; i < 120 && !out; i++){
    for (const e of core.update(dt, { move: { x: 0, y: 0 } })){ evs.push(e); if ((e.type === 'contact' || e.type === 'whiff') && e.player === 'me') out = e; }
  }
  return { out, vx: core.ball.v.x, evs };
}

test('swing: in tempo «perfetto», in anticipo incrociato, in ritardo lungolinea, troppo presto a vuoto', () => {
  const res = { perfetto: [], anticipo: [], ritardo: [] };
  for (let s = 1; s <= 25; s++){
    for (const [k, d] of [['perfetto', 0], ['anticipo', -.06], ['ritardo', .06]]){
      const { core, tc } = rallyScene(s);
      const r = runSwing(core, tc + d);
      assert.equal(r.out && r.out.type, 'contact', `${k}: c'è il contatto`);
      assert.equal(r.out.label, k, `${k}: giudizio del tempo`);
      res[k].push(r.vx);
    }
  }
  const avg = a => a.reduce((x, y) => x + y, 0)/a.length;
  // dritto del giocatore in basso (squadra 0, guarda verso -z): in anticipo la palla va a sinistra (x < 0)
  assert.ok(avg(res.anticipo) < avg(res.perfetto) - 1 && avg(res.perfetto) < avg(res.ritardo) - 1, JSON.stringify([avg(res.anticipo), avg(res.perfetto), avg(res.ritardo)]));
  const { core, tc } = rallyScene(3);
  assert.equal(runSwing(core, tc - .3).out.type, 'whiff');
});

test('swing dal telefono arrivato in ritardo di rete: la palla torna al punto d\'impatto e il colpo è in tempo', () => {
  const { core, h, tc } = rallyScene(7);
  // il colpo è avvenuto all'istante giusto ma il messaggio arriva 70 ms dopo
  const r = runSwing(core, -.07, tc + .07 - 1/120, .11);
  assert.equal(r.out.type, 'contact'); assert.equal(r.out.label, 'perfetto');
  assert.ok(r.evs.some(e => e.type === 'hit' && e.player === 'me'));
  assert.ok(core.ball.v.z < 0, 'la palla torna verso il computer');
  assert.ok(Math.abs(rel(h, core.ball.p).s) < 3);
});

test('servizio con il lancio: in tempo parte, a vuoto è fallo, lancio non colpito si riprende', () => {
  const mk = () => { const c = new MatchCore({ sport: 'tennis', teams: [[{ human: true, id: 'me' }], [{ id: 'cpu' }]], firstServer: 0, rng: mulberry32(5) }); return c; };
  const dt = 1/120, idle = { move: { x: 0, y: 0 } };
  // in tempo: lancio, poi swing che arriva a 0,77 s dal lancio
  let c = mk(); c.update(dt, { ...idle, toss: true });
  for (let t = 0; t < .6; t += dt) c.update(dt, idle);
  let ev = c.update(dt, { ...idle, swing: { power: .7, delay: .09 } });
  for (let i = 0; i < 30 && c.phase === 'serve'; i++) ev = ev.concat(c.update(dt, idle));
  assert.equal(c.phase, 'live'); assert.ok(ev.some(e => e.type === 'contact' && e.serve));
  // a vuoto: palla già scesa
  c = mk(); c.update(dt, { ...idle, toss: true });
  for (let t = 0; t < 1.05; t += dt) c.update(dt, idle);
  ev = []; ev = ev.concat(c.update(dt, { ...idle, swing: { power: .7, delay: 0 } })); ev = ev.concat(c.update(dt, idle));
  assert.ok(ev.some(e => e.type === 'fault' && e.reason === 'mancata'), JSON.stringify(ev.map(e => e.type)));
  assert.equal(c.rally.attempt, 2);
  // lancio lasciato cadere: niente fallo, si rilancia
  c = mk(); c.update(dt, { ...idle, toss: true }); ev = [];
  for (let t = 0; t < 1.6; t += dt) ev = ev.concat(c.update(dt, idle));
  assert.ok(ev.some(e => e.type === 'tossCaught')); assert.equal(c.phase, 'serve'); assert.equal(c.rally.attempt, 1);
  assert.ok(Math.abs(tossY(.77) - 2.75) < .1);
});

// un giocatore «robot» con gli stessi comandi di mouse e telefono: movimento automatico, swing con un errore di tempo
function botInput(core, rng, st){
  const h = core.players[0], inp = { move: { x: 0, y: 0 }, auto: true };
  if (core.phase === 'serve' && core.serverP === h){
    if (!core.toss && !st.tossT){ inp.toss = true; st.tossT = core.t; st.served = false; }
    else if (core.toss && !st.served && core.t - core.toss.t0 > .66 + (rng() - .5)*.12){ inp.swing = { power: .5 + rng()*.4, delay: .09 }; st.served = true; }
    return inp;
  }
  st.tossT = 0;
  if (core.phase !== 'live' || core.rally.lastHitter === h.team || st.waiting) { if (core.rally.lastHitter === h.team) st.waiting = false; return inp; }
  const b = core.ball, r = rel(h, b.p), vin = b.v.z;              // squadra 0: la palla viene verso +z
  if (r.s > S0 && vin > 2 && r.s < 9 && Math.abs(r.l) < 1.4 && core.rally.canHit(0) && !(core.rally.isServe && core.rally.bouncesSinceHit === 0)){
    const eta = (r.s - S0)/vin;
    // come una persona: il tempo sbaglia di qualche centesimo di secondo (deviazione 50 ms)
    if (eta < .1){ inp.swing = { power: .4 + rng()*.5, delay: .09 + gauss(rng)*.05, lift: 0 }; st.waiting = true; }
  }
  return inp;
}
test('partita completa con lo swing contro il computer: set corto a 4, il punteggio torna', () => {
  for (const seed of [11, 14]){
    const rng = mulberry32(seed);
    const core = new MatchCore({ sport: 'tennis', teams: [[{ human: true, id: 'me' }], [{ id: 'cpu' }]], level: 'normale', gamesToWin: 4, set: true, rng: mulberry32(seed + 100) });
    const st = {}; let t = 0, contacts = 0, perfect = 0, points = [0, 0], over = false;
    while (t < 3600 && !over){
      for (const e of core.update(1/120, botInput(core, rng, st))){
        if (e.type === 'contact' && e.player === 'me'){ contacts++; if (e.label === 'perfetto') perfect++; st.waiting = false; }
        if (e.type === 'whiff') st.waiting = false;
        if (e.type === 'point'){ points[e.team]++; st.waiting = false; }
        if (e.type === 'match') over = true;
      }
      t += 1/120;
    }
    const g = core.score.games;
    assert.ok(over, `partita finita (seed ${seed}) dopo ${Math.round(t)} s`);
    assert.ok(Math.max(...g) >= 4 && (Math.abs(g[0] - g[1]) >= 2 || (Math.max(...g) === 5 && Math.min(...g) === 4)), `punteggio del set valido: ${g}`);
    assert.ok(contacts > 20 && perfect > 3, `colpi del giocatore: ${contacts}, perfetti ${perfect}`);
    assert.ok(points[0] > 3 && points[1] > 3, `punti ${points}`);
  }
});

/* ---------- rilevatore dei colpi ---------- */
// tracce sintetiche a 100 Hz: rotazione a campana attorno a un asse, con accelerazione verso l'alto o verso il basso
function trace(det, t0, { axis = [0, 0, 1], peak = 1000, dur = 220, up = 0 }){
  const n = Math.round(dur/10);
  for (let i = 0; i <= n; i++){
    const u = i/n, m = peak*Math.sin(Math.PI*u)**2;
    const acc = [8*Math.sin(Math.PI*u), up*6*Math.sin(Math.PI*u), 0];
    det.feed({ t: t0 + i*10, rot: axis.map(a => a*m), acc, accG: [acc[0], acc[1] + 9.81, acc[2]] });
  }
  return t0 + n*10;
}
const still = (det, t0, ms, noise = 4) => { let t = t0; for (; t < t0 + ms; t += 10) det.feed({ t, rot: [noise*Math.sin(t), -noise*Math.cos(t), 2], acc: [0, 0, 0], accG: [0, 9.81, 0] }); return t; };

test('rilevatore: calibrazione, dritto e rovescio, potenza, colpo dal basso in alto', () => {
  const det = createSwingDetector(), sw = [], st = [];
  det.on('swing', s => sw.push(s)).on('status', s => st.push(s.s));
  det.calibrate();
  let t = still(det, 0, 900);
  assert.equal(det.mode, 'practice');
  t = trace(det, t + 10, { peak: 900 }); t = still(det, t + 10, 500, 2);
  assert.equal(det.mode, 'ready'); assert.equal(sw.length, 0, 'il dritto di prova non è un colpo');
  t = trace(det, t + 10, { peak: 1300, up: 1 }); t = still(det, t + 10, 500, 2);
  t = trace(det, t + 10, { axis: [0, 0, -1], peak: 650, up: -1 }); t = still(det, t + 10, 500, 2);
  assert.equal(sw.length, 2);
  assert.equal(sw[0].side, 'fh'); assert.equal(sw[1].side, 'bh');
  assert.ok(sw[0].power > sw[1].power && sw[0].power > .7, JSON.stringify(sw));
  assert.ok(sw[0].lift > .2 && sw[1].lift < -.2, 'verso del colpo');
  assert.deepEqual(st.slice(0, 3), ['still', 'practice', 'ready']);
});

test('rilevatore: niente colpi per tremolii, movimenti lenti o il ritorno del braccio', () => {
  const det = createSwingDetector(), sw = [];
  det.on('swing', s => sw.push(s));
  det.calibrate(); let t = still(det, 0, 900); t = trace(det, t + 10, { peak: 900 }); t = still(det, t + 10, 400, 2);
  t = trace(det, t + 10, { peak: 200 });                       // tremolio
  t = still(det, t + 10, 400, 2);
  t = trace(det, t + 10, { peak: 300, dur: 1200 });            // movimento lento (sotto la soglia del picco)
  t = still(det, t + 10, 400, 2);
  assert.equal(sw.length, 0);
  t = trace(det, t + 10, { peak: 1100 });                       // colpo…
  t = trace(det, t + 10, { axis: [0, 0, -1], peak: 700 });     // …e subito il ritorno del braccio
  still(det, t + 10, 400, 2);
  assert.equal(sw.length, 1);
  // calibrazione da fermo disturbata: si ricomincia
  const d2 = createSwingDetector(), st = []; d2.on('status', s => st.push(s.s)); d2.calibrate();
  let t2 = still(d2, 0, 300); trace(d2, t2, { peak: 400 });
  assert.ok(st.includes('move')); assert.equal(d2.mode, 'still');
});

/* ---------- abbinamento ---------- */
test('abbinamento: QR monouso, chiave di ripresa, sessioni separate, scadenza', () => {
  let now = 0; const gate = createGate({ now: () => now });
  const id = newSessionId();
  assert.ok(id.startsWith(SESSION_PREFIX) && id.length > 30);
  const url = pairingUrl('https://x.example/tennis/racchetta.html', '', id, gate.token);
  const p = parsePairing(new URL(url).hash);
  assert.deepEqual(p, { session: id, token: gate.token });
  assert.equal(parsePairing('#s=altro&k=abc'), null);
  const first = gate.admit('phone1', { k: p.token });
  assert.equal(first.ok, true);
  assert.equal(gate.admit('phone2', { k: p.token }).ok, false, 'il codice del QR vale una volta');
  assert.notEqual(gate.token, p.token, 'dopo l\'uso il QR cambia');
  assert.equal(gate.admit('phone1b', { r: first.resume }).ok, true, 'lo stesso telefono si ricollega');
  assert.equal(gate.admit('x', { r: 'chiave-sbagliata-xxxxxxxxx' }).ok, false);
  // un'altra sessione non accetta i codici di questa
  const other = createGate({ now: () => now });
  assert.equal(other.admit('phone1', { k: p.token }).ok, false); assert.equal(other.admit('phone1', { r: first.resume }).ok, false);
  // scadenza del QR
  const tok = gate.token; now += 6*60*1000;
  assert.deepEqual(gate.admit('p', { k: tok }), { ok: false, why: 'expired' });
  // troppi tentativi sbagliati: QR nuovo
  const g2 = createGate({}), t0 = g2.token;
  for (let i = 0; i < 5; i++) g2.admit('bad', { k: 'tentativo' + i });
  assert.notEqual(g2.token, t0);
  // «Scollega»: la chiave di ripresa non vale più
  gate.forget(); assert.equal(gate.admit('phone1', { r: first.resume }).ok, false);
});
