// B36.0 «Misurare prima» (docs/b36/misure-b36-0.md): il gioco non cambia, si aggiungono solo misure.
//   - registro dello stand sul motore vero (senza grafica): la riga «colpo» porta il primo rimbalzo vero della palla (rx,
//     rz) e «fuori» (fu) esattamente come lo chiama il motore;
//   - modello della direzione (natpf_direction.js): oggi solo «classica», nessun colpo con la regola nuova.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { RegistroStand } from '../src/natpf/registro/registro_registratore.js';
import { codaMemoria } from '../src/natpf/registro/registro_coda.js';
import { skillLevel } from '../src/natpf/natpf_skill.js';
import { directionSpan, lateSpanOf, slowFactor } from '../src/natpf/natpf_stroke_outcome.js';
import { dirModelOf, usedNewRule, DIR_MODELS, DIR_DEFAULT } from '../src/natpf/natpf_direction.js';

const storageFinto = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } }; };
// colpo del telefono con la forma: piatto face (−1…+1), scarto della cima dev (gradi)
const colpoTel = (face, dev) => ({ source: 'natpf-phone', side: 'forehand', shotType: 'topspin', speed: 1.2, dirX: 0, timing: null,
  natpf: { aim: 'swing', shot: 'topspin', power: .5, latency: 0, hand: 'right', aimDev: dev, peak: 800, typical: 780, aimFull: 17,
    intent: { shot: 'topspin', power: .5, typePower: .5, depth: .5, rise: .3, face, conf: 1 } } });

test('B36.0: modello della direzione — oggi solo «classica», nessun colpo con la regola nuova', () => {
  assert.deepEqual([...DIR_MODELS], ['classica', 'nuova']); assert.equal(DIR_DEFAULT, 'classica');
  assert.equal(dirModelOf(null), 'classica'); assert.equal(dirModelOf({}), 'classica'); assert.equal(dirModelOf({ natpfDirModel: 'boh' }), 'classica');
  assert.equal(dirModelOf({ natpfDirModel: 'nuova' }), 'nuova');
  assert.equal(usedNewRule(null), false); assert.equal(usedNewRule({ x: 1 }), false); assert.equal(usedNewRule({ rule: 'nuova' }), true);
  const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
  assert.equal(dirModelOf(e), 'classica', 'il motore di oggi non sceglie un modello: classica');
});

test('B36.0: sul motore vero il registro scrive il primo rimbalzo vero e «fuori» come l’arbitro del motore', async () => {
  const real = Math.random; Math.random = () => .5;
  try {
    const e = createHeadlessEngine({ difficulty: 'pro' }), coda = codaMemoria();
    // rimbalzi e punti come li vede il motore (prima del registro: il registro li avvolge da fuori)
    const visti = [], punti = [], ring = e._spawnBounceRing, award = e._awardPoint.bind(e);
    e._spawnBounceRing = (x, z) => { visti.push({ x, z, chi: e.ball.lastHitter, n: e.ball.bounceCountOnCurrentSide }); return ring(x, z); };
    e._awardPoint = (who, why = '') => { punti.push({ who, why, rimbalzi: visti.length }); return award(who, why); };
    const R = new RegistroStand({ engine: e, ui: {}, coda, storage: storageFinto(), now: () => e.elapsedTime*1000, wallNow: () => Date.UTC(2026, 10, 14, 10), win: null, raf: () => {}, timers: false });
    e.startNewMatch({ showStartBanner: false });
    const lv = skillLevel('pro'), vz = 18, span = directionSpan(lv)*slowFactor(vz), late = lateSpanOf(vz, lv);
    const casi = [[0, 0], [.6, .3], [-.6, -.3], [1, 1.1], [-1, -1.2], [1, -1.6], [.3, 1.5], [-.2, 0]];
    const attesi = [];
    for (const [face, u] of casi){
      e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 3; e.pendingUserSwing = null;
      e.player.pos.set(0, 0, 11.4); e.player.vel.set(0, 0, 0); e.player.targetPos.copy(e.player.pos); e.player.swingCooldown = 0;
      e.ball.pos.set(.6, 1, 10.9); e.ball.vel.set(0, 0, vz); e.ball.targetLanding.set(.6, 0, 9);
      const tau = u >= 0 ? u*span : u*late, primaV = visti.length, primaP = punti.length;
      const ok = e._attemptPlayerRallyStrike({ ...colpoTel(face, 3 + 14*face), natpfTau: tau, natpfLateSpan: late }, false);
      assert.ok(ok, `colpo ${face}/${u}`);
      for (let i = 0; i < 900 && punti.length === primaP && !(visti.length > primaV && e.ball.bounceCountOnCurrentSide >= 1 && e.ball.pos.y > .5); i++) e.step(1/120);
      const primo = visti.slice(primaV).find(b => b.chi === 'player' && b.n === 0) || null;
      const fuori = !!primo && punti.slice(primaP).some(p => p.why === 'Out' && p.rimbalzi === visti.indexOf(primo) + 1);
      attesi.push({ face, u, rx: primo ? +primo.x.toFixed(2) : undefined, rz: primo ? +primo.z.toFixed(2) : undefined, fu: fuori ? 1 : undefined });
      // il punto si chiude (la palla dentro va avanti fino alla CPU o al secondo rimbalzo: qui basta il primo)
      if (e.ball.inPlay) e._awardPoint('player', 'Nice Shot!');
    }
    await R.blocco();
    const rows = []; for (const b of await coda.elenco()) for (const l of (await coda.leggi(b.id)).trim().split('\n')) rows.push(JSON.parse(l));
    const colpi = rows.filter(r => r.k === 'colpo');
    assert.equal(colpi.length, casi.length);
    assert.deepEqual(colpi.map(c => ({ rx: c.rx, rz: c.rz, fu: c.fu })), attesi.map(a => ({ rx: a.rx, rz: a.rz, fu: a.fu })));
    assert.ok(attesi.some(a => a.fu) && attesi.some(a => a.rx != null && !a.fu), `dentro e fuori tra i casi: ${JSON.stringify(attesi)}`);
    // piatto e scarto della cima del gesto, tempo in finestre dell'esito; il modello «classica» nella partita
    assert.deepEqual(colpi.map(c => c.pf), casi.map(([f]) => f));
    assert.deepEqual(colpi.map(c => c.dv), casi.map(([f]) => +(3 + 14*f).toFixed(1)));
    for (const [i, c] of colpi.entries()) assert.ok(Math.abs(c.tu - casi[i][1]) < .02, `tempo ${c.tu} contro ${casi[i][1]}`);
    assert.equal(rows.find(r => r.k === 'partita').dir, 'classica');
    assert.ok(colpi.every(c => c.nr === undefined), 'nessun colpo con la regola nuova');
  } finally { Math.random = real; }
});

/* ---------- giocatori simulati che vedono la direzione (scripts/audit/b36/simulati.mjs) ---------- */
test('B36.0: scarto della cima dei giocatori simulati — inversa esatta del piatto del gioco, senza il tetto; «gira tanto» oltre la mira piena', async () => {
  const { devOfFace, FACE_DEAD } = await import('../src/natpf/natpf_direction.js');
  const { faceAimFromDev, INTENT } = await import('../src/natpf/natpf_stroke_intent.js');
  const { cimaSimulata } = await import('../scripts/audit/b36/simulati.mjs');
  assert.equal(FACE_DEAD, INTENT.faceDead);
  for (const full of [17, 20, 23]) for (let f = -1; f <= 1.0001; f += .05) assert.ok(Math.abs(faceAimFromDev(devOfFace(f, full), full) - Math.max(-1, Math.min(1, f))) < 1e-9, `${f} ${full}`);
  assert.equal(devOfFace(0), 0); assert.equal(devOfFace(1.5, 17), 3 + 1.5*14, 'oltre la mira piena, senza tetto');
  // stesso sorteggio, stesso piatto di sempre (clamp(face + g·sd)); lo scarto viene dallo stesso numero
  const P = { wristSd: .3 }, a = cimaSimulata(P, .4, true, 1.5);
  assert.equal(a.face, Math.max(-1, Math.min(1, .4 + 1.5*.3))); assert.equal(a.aimFull, 17); assert.equal(a.aimDev, +(3 + (.4 + 1.5*.3)*14).toFixed(1));
  assert.equal(cimaSimulata(P, 0, false, 0).aimDev, 0);
  // «gira tanto» (30 ± 12°): quando mira la cima gira di 30° (piatto di oggi tagliato a 1), quando non mira come gli altri
  const G = { wristSd: .3, giro: 30, giroSd: 12 };
  assert.equal(cimaSimulata(G, -.6, true, 0).aimDev, -30); assert.equal(cimaSimulata(G, -.6, true, 0).face, -1);
  assert.equal(cimaSimulata(G, .6, true, 1).aimDev, 42); assert.equal(cimaSimulata(G, .6, false, 0).aimDev, +(3 + .6*14).toFixed(1));
});

// Impronte prese sulla base 0035e02 (2026-11-13.12) con gli stessi argomenti: con «Classica» i profili del telefono, che
// ora mandano anche natpf.aimDev e natpf.aimFull, giocano identici, punto per punto e colpo per colpo
test('B36.0: rally-balance con lo scarto della cima — partite identiche alla base, colpi contati, nessuno con la regola nuova', async () => {
  const { createHash } = await import('node:crypto');
  const { simulate, PHONE_PROFILES } = await import('../scripts/audit/rally-balance.mjs');
  const sha = x => createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 12);
  const BASE = { 'tennista/pro': '39e0eab60444', 'amatore/casual': '3c9754821f05', 'bambino/bambini': '3e60257b2773', 'umano/leggenda': '3d0b93d57253', 'medio/evento': '71ff6a88fcb7' };
  for (const [k, atteso] of Object.entries(BASE)){
    const [profile, difficulty] = k.split('/'), r = simulate({ profile, difficulty, points: 40, seed: 7 });
    assert.equal(sha([r.points, r.won, r.rallies, r.reasons, r.grades, r.racket, r.landings, r.whiffs, r.shots]), atteso, k);
    if (PHONE_PROFILES[profile]){ assert.ok(r.direzione.colpi > 30, `${k}: colpi della racchetta ${r.direzione.colpi}`); assert.equal(r.direzione.nuova, 0); }
  }
  // i primi tre profili del telefono restano quelli delle impronte (b20, b25, b37); i nuovi in fondo
  assert.deepEqual(Object.keys(PHONE_PROFILES).slice(0, 4), ['tennista', 'amatore', 'bambino', 'umano']);
  for (const k of ['medioTel', 'giraTanto', 'giraTanto40']) assert.ok(PHONE_PROFILES[k]?.swing, k);
  // il gesto arriva al motore con lo scarto della cima e la mira piena
  let visto = null;
  simulate({ profile: 'giraTanto', difficulty: 'pro', points: 12, seed: 3, onStep: e => { const L = e.natpfLastRacket; if (L?.who === 'player' && L.aimFull) visto = L; } });
  assert.equal(visto?.aimFull, 17);
});

/* ---------- banco della direzione esteso (scripts/audit/direzione-telefono.mjs --b36) ---------- */
test('B36.0: banco della direzione sul rimbalzo vero — fuori come l’arbitro, attesa della posa «pronto», serie e seme', async () => {
  const D = await import('../scripts/audit/direzione-telefono.mjs');
  // stesso colpo giudicato sul bersaglio e sul rimbalzo: la palla vera cade più al centro (l'aria), la x è quella del rimbalzo
  const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
  const tB = D.strike(colpoTel(.9, 15.6), { e, u: 0 }), tR = D.strike(colpoTel(.9, 15.6), { e, u: 0, giudice: 'rimbalzo' });
  assert.equal(tR.xBersaglio, tB.x); assert.ok(Number.isFinite(tR.bx) && Math.abs(tR.bx) < Math.abs(tB.x) && Math.abs(tR.bx) > .7*Math.abs(tB.x), `${tR.bx} ${tB.x}`);
  assert.equal(tR.x, tR.bx); assert.equal(tR.fuori, false);
  const fuori = D.strike(colpoTel(1, 17), { e, u: -1.6, giudice: 'rimbalzo' });
  assert.ok(fuori.fuori && fuori.side && Math.abs(fuori.bx) > 4.335, JSON.stringify(fuori));
  // tre posizioni: la palla arriva a chi colpisce dove sta
  const dx = D.strike(colpoTel(0, 3), { e, u: 0, posizione: 2.4, giudice: 'rimbalzo' }), sx = D.strike(colpoTel(0, 3), { e, u: 0, posizione: -2.4, giudice: 'rimbalzo' });
  assert.ok(dx.hitX > 2.5 && sx.hitX < -1.5 && dx.bx > sx.bx, `${dx.hitX} ${sx.hitX} ${dx.bx} ${sx.bx}`);
  // attesa della posa «pronto»: con la cima ferma 2 s il gioco legge meno giro (la posa «pronto» lo assorbe)
  const A = D.attesaB36({ semi: 1, attese: [0, 2000] });
  assert.equal(A[0].giroPct, 100); assert.ok(A[1].giroPct < 90 && A[1].dx < 0, JSON.stringify(A));
  const S = D.serieB36({ semi: 2, models: ['piatto'], wants: ['cross'] });
  assert.equal(S[0].colpi, 28); assert.ok(S[0].giusti >= 40, JSON.stringify(S));
  const E = D.semeB36({ semi: 2, persone: ['adulto'], percorsi: { 'scambi 2+2': {} } });
  assert.equal(E[0].versi, 4); assert.ok(E[0].medio >= 0 && E[0].medio < 20, JSON.stringify(E));
});
