// node --test tools/test: regole, fisica e partite complete tra IA
import test from 'node:test';
import assert from 'node:assert/strict';
import { COURTS, newBall, stepBall, aimShot, predict } from '../../site/js/match/physics.js';
import { newScore, awardPoint, pointLabels, Rally } from '../../site/js/match/rules.js';
import { MatchCore, mulberry32 } from '../../site/js/match/core.js';

test('punteggio: 15-30-40, vantaggi e game', () => {
  const s = newScore({ gamesToWin: 2, firstServer: 0 });
  for (let i = 0; i < 3; i++) awardPoint(s, 0);
  for (let i = 0; i < 3; i++) awardPoint(s, 1);
  assert.deepEqual(pointLabels(s), ['40', '40']);
  awardPoint(s, 0); assert.deepEqual(pointLabels(s), ['V', '40']);
  awardPoint(s, 1); assert.deepEqual(pointLabels(s), ['40', '40']);
  awardPoint(s, 0); const r = awardPoint(s, 0);
  assert.equal(r.game, true); assert.deepEqual(s.games, [1, 0]); assert.equal(s.server, 1);
});

test('punto d\'oro sul 40 pari', () => {
  const s = newScore({ goldenPoint: true });
  for (let i = 0; i < 3; i++){ awardPoint(s, 0); awardPoint(s, 1); }
  assert.equal(awardPoint(s, 1).game, true);
});

test('fine partita al numero di game stabilito', () => {
  const s = newScore({ gamesToWin: 2 });
  for (let g = 0; g < 2; g++) for (let i = 0; i < 4; i++) awardPoint(s, 1);
  assert.equal(s.winner, 1);
});

test('servizio: riquadro in diagonale, fuori e doppio fallo', () => {
  const c = COURTS.tennis, r = new Rally(c, { server: 0, fromRight: true });
  assert.equal(r.serveX() > 0, true);                  // da destra: x > 0 per chi guarda verso -z
  const box = r.serveBox();
  assert.ok(box.x1 <= 0 && box.z0 < 0 && box.z1 === 0);  // riquadro a sinistra dall'altra parte
  r.hit(0);
  assert.equal(r.event({ type: 'bounce', x: 2, z: -3, side: 1 }).fault, true);
  r.hit(0);
  assert.deepEqual(r.event({ type: 'bounce', x: -2, z: -8, side: 1 }), { team: 1, reason: 'doppio fallo' });
});

test('scambio: fuori, rete, doppio rimbalzo, vetro del padel', () => {
  const t = new Rally(COURTS.tennis, { server: 0, fromRight: true });
  t.hit(0); t.event({ type: 'bounce', x: -2, z: -3, side: 1 });
  assert.equal(t.canHit(1), true); assert.equal(t.canHit(0), false);
  t.hit(1);
  assert.deepEqual(t.event({ type: 'bounce', x: 5, z: 6, side: 0 }), { team: 0, reason: 'fuori' });

  const p = new Rally(COURTS.padel, { server: 1, fromRight: false });
  p.hit(1); p.event({ type: 'bounce', x: -2, z: 3, side: 0 }); p.hit(0);
  assert.deepEqual(p.event({ type: 'wall', axis: 'z', x: 0, y: 1, z: -10, side: 1 }), { team: 1, reason: 'vetro' });

  const q = new Rally(COURTS.padel, { server: 0, fromRight: true });
  q.hit(0); q.event({ type: 'bounce', x: -2, z: -3, side: 1 }); q.hit(1); q.event({ type: 'bounce', x: 1, z: 5, side: 0 });
  assert.equal(q.event({ type: 'wall', axis: 'z', x: 1, y: 1, z: 10, side: 0 }), null);   // dopo il rimbalzo il vetro è buono
  assert.deepEqual(q.event({ type: 'bounce', x: 1, z: 7, side: 0 }), { team: 1, reason: 'vincente' });
});

test('fisica: il colpo mirato passa la rete e cade dove deve', () => {
  const c = COURTS.tennis, from = { x: 0, y: 1, z: 11 }, to = { x: -2, z: -9 };
  const v = aimShot(from, to, .9, c);
  const b = newBall(from, v), ev = [];
  for (let i = 0; i < 200 && !ev.some(e => e.type === 'bounce'); i++) stepBall(b, 1/60, c, ev);
  const bounce = ev.find(e => e.type === 'bounce');
  assert.ok(!ev.some(e => e.type === 'net'), 'la palla non deve prendere la rete');
  assert.ok(Math.hypot(bounce.x - to.x, bounce.z - to.z) < .6, `rimbalzo in ${bounce.x.toFixed(2)}, ${bounce.z.toFixed(2)}`);
});

test('fisica: nel padel la palla torna dal vetro di fondo', () => {
  const c = COURTS.padel, s = predict(newBall({ x: 0, y: 1, z: -6 }, { x: 0, y: 3, z: 14 }), c, 2);
  assert.ok(s.some(p => p.walls > 0) && s.at(-1).z < 10);
});

for (const sport of ['tennis', 'padel']){
  test(`partita completa tra IA: ${sport}`, () => {
    for (const seed of [1, 7, 42]){
      const teams = sport === 'padel' ? [[{}, {}], [{}, {}]] : [[{}], [{}]];
      const m = new MatchCore({ sport, teams, level: 'normale', gamesToWin: 2, rng: mulberry32(seed) });
      let t = 0, hits = 0, points = 0;
      while (m.phase !== 'over' && t < 1800){
        const ev = m.update(1/60); t += 1/60;
        hits += ev.filter(e => e.type === 'hit').length; points += ev.filter(e => e.type === 'point').length;
      }
      assert.equal(m.phase, 'over', `seed ${seed}: partita non finita (${points} punti in ${Math.round(t)} s)`);
      assert.ok(m.score.games[m.score.winner] === 2);
      assert.ok(hits/points > 2, `seed ${seed}: scambi troppo corti (${hits} colpi, ${points} punti)`);
    }
  });
}

test('giocatore umano: si muove, salta e colpisce', () => {
  const m = new MatchCore({ sport: 'tennis', teams: [[{ human: true }], [{}]], level: 'facile', gamesToWin: 1, rng: mulberry32(3), firstServer: 0 });
  const h = m.players.find(p => p.human), x0 = h.x;
  const idle = { move: { x: 0, y: 0 }, jump: false, hit: false, lob: false };
  for (let i = 0; i < 30; i++) m.update(1/60, { ...idle, move: { x: 1, y: 0 } });
  assert.ok(h.x > x0 + 2, 'freccia a destra: x cresce');
  m.update(1/60, { ...idle, hit: true });                    // servizio
  assert.equal(m.phase, 'live');
  let y = 0; m.update(1/60, { ...idle, jump: true });
  for (let i = 0; i < 10; i++){ m.update(1/60, idle); y = Math.max(y, h.y); }
  assert.ok(y > .5, 'il salto alza il giocatore');
});

import { encodeChallenge, decodeChallenge } from '../../site/js/ugc/challenge.js';
test('codici sfida: andata e ritorno, codici alterati rifiutati', () => {
  const code = encodeChallenge({ game: 'vetro', seed: 123456789, score: 27, nick: 'Falco Rapido' });
  assert.deepEqual(decodeChallenge(code), { game: 'vetro', seed: 123456789, score: 27, nick: 'Falco Rapido' });
  assert.equal(decodeChallenge(code.replace('.1', '.2')), null);
  assert.equal(decodeChallenge('ciao'), null);
  assert.equal(encodeChallenge({ game: 'tennis', seed: 1, score: 1 }), null);
  const nasty = encodeChallenge({ game: 'serve', seed: 5, score: 3, nick: '<script>alert(1)</script>' });
  assert.equal(decodeChallenge(nasty).nick, 'scriptalertscript');
});
