// Scia luminosa della palla (B22, src/natpf/natpf_ball_glow.js): opzione salvata (di base accesa), intensità e lunghezza
// dalla velocità, nastro costruito dalla storia della palla senza allocazioni, storia che riparte al colpo e ai salti,
// spenta = niente nella scena, nessun numero preso da Math.random (la sequenza casuale del gioco non cambia).
// La parte disegnata (pixel, opzione spenta identica a prima) è in tools/e2e/natpf-scia-palla.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRAIL_KEY, BALL_GLOW, GLOW_ORDER, readBallTrail, writeBallTrail, trailToast, glowLevel, glowLength, NatpfBallGlow } from '../src/natpf/natpf_ball_glow.js';

const mem = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const scene = () => ({ items: [], add(o){ this.items.push(o); } });
// volo dritto verso la CPU a `speed` m/s per `secs` secondi, passi della fisica a 1/120 s e un fotogramma ogni due
function fly(G, { speed = 26, secs = .5, from = [1, 1, 10], dir = [0, 0, -1], power = false } = {}){
  const p = { x: from[0], y: from[1], z: from[2] }, h = 1/120;
  for (let k = 0; k < Math.round(secs/h); k++){
    p.x += dir[0]*speed*h; p.y += dir[1]*speed*h; p.z += dir[2]*speed*h;
    G.sample(p);
    if (k % 2) G.frame(p, speed, 1/60, true, power);
  }
  return p;
}

test('opzione: accesa di base, «No» salvato come 0, chiave natpf-tennis.sciaPalla', () => {
  assert.equal(TRAIL_KEY, 'natpf-tennis.sciaPalla');
  assert.equal(readBallTrail({ storage: mem() }), true, 'niente di salvato: accesa');
  assert.equal(readBallTrail({ storage: mem({ [TRAIL_KEY]: '1' }) }), true);
  assert.equal(readBallTrail({ storage: mem({ [TRAIL_KEY]: '0' }) }), false);
  assert.equal(readBallTrail({ storage: { getItem(){ throw new Error('bloccato'); } } }), true, 'memoria del browser bloccata: accesa');
  const s = mem();
  assert.equal(writeBallTrail(false, { storage: s }), false); assert.equal(s.getItem(TRAIL_KEY), '0'); assert.equal(readBallTrail({ storage: s }), false);
  assert.equal(writeBallTrail(true, { storage: s }), true); assert.equal(s.getItem(TRAIL_KEY), '1');
  assert.doesNotThrow(() => writeBallTrail(true, { storage: { setItem(){ throw new Error('pieno'); } } }));
  assert.match(trailToast(true), /accesa/); assert.match(trailToast(false), /spenta.*come prima/);
});

test('intensità e lunghezza crescono con la velocità della palla', () => {
  assert.equal(glowLevel(0), 0); assert.equal(glowLevel(BALL_GLOW.minSpeed), 0, 'lancio del servizio, palla lenta: niente');
  assert.equal(glowLevel(BALL_GLOW.fullSpeed), 1); assert.equal(glowLevel(60), 1); assert.equal(glowLevel(NaN), 0);
  let prev = -1;
  for (let v = 0; v <= 40; v += .5){ const l = glowLevel(v); assert.ok(l >= prev && l >= 0 && l <= 1, `v ${v}`); prev = l; }
  assert.ok(glowLevel(15) > .2 && glowLevel(15) < .8, 'a metà velocità a metà intensità');
  assert.equal(glowLength(0), 0); assert.ok(Math.abs(glowLength(20) - 20*BALL_GLOW.seconds) < 1e-9);
  assert.equal(glowLength(200), BALL_GLOW.maxLen); assert.ok(glowLength(12) < glowLength(24));
  // «leggermente meno luminosa» del trailer: mai piena, e più larga della scia bianca di prima ma non un muro
  assert.ok(BALL_GLOW.alpha > .5 && BALL_GLOW.alpha < .9); assert.ok(BALL_GLOW.width <= .5); assert.ok(BALL_GLOW.head >= .2, 'la palla non è coperta');
});

test('crearla non prende numeri da Math.random (three.js li userebbe per gli uuid): sequenza casuale intatta', () => {
  const real = Math.random; let calls = 0; const spy = () => { calls++; return real(); };
  Math.random = spy;
  try {
    const G = new NatpfBallGlow(scene(), { enabled: true });
    fly(G); G.clear(); G.setEnabled(false); G.setEnabled(true); fly(G, { speed: 30, power: true });
    assert.equal(calls, 0);
    assert.equal(Math.random, spy, 'Math.random rimesso al suo posto');
    assert.ok(/^[0-9a-f-]{36}$/i.test(G.mesh.uuid) && G.mesh.uuid !== G.geometry.uuid, 'gli oggetti hanno comunque il loro uuid');
  } finally { Math.random = real; }
});

test('accesa: nastro dietro la palla veloce, lungo velocità × tempo, dal più nuovo al più vecchio', () => {
  const sc = scene(), G = new NatpfBallGlow(sc, { enabled: true });
  assert.equal(sc.items[0], G.mesh); assert.equal(G.mesh.visible, false); assert.equal(G.mesh.name, 'NatpfSciaPalla');
  const p = fly(G, { speed: 26 });
  assert.equal(G.mesh.visible, true); assert.ok(G.level > .95, `livello ${G.level}`);
  assert.ok(Math.abs(G.length - glowLength(26)) < 1e-9); assert.ok(G.segments >= 10 && G.segments < BALL_GLOW.points);
  assert.equal(G.geometry.drawRange.count, G.segments*6);
  // primo vertice sulla palla, ultimo a `length` metri dietro, sulla traiettoria (z crescente verso chi ha colpito)
  const P = G.pos, S = G.side, last = G.segments;
  assert.ok(Math.abs(P[2] - p.z) < 1e-4 && Math.abs(P[0] - p.x) < 1e-4);
  assert.ok(Math.abs((P[last*6 + 2] - p.z) - G.length) < 1e-3, `coda a ${(P[last*6 + 2] - p.z).toFixed(3)} m, attesi ${G.length}`);
  for (let i = 1; i <= last; i++){ assert.ok(P[i*6 + 2] > P[(i - 1)*6 + 2], 'vertici in ordine lungo il volo'); assert.ok(S[i*4 + 1] > S[(i - 1)*4 + 1], 'sfumatura crescente verso la coda'); }
  assert.equal(S[1], 0); assert.ok(Math.abs(S[last*4 + 1] - 1) < 1e-5); assert.equal(S[0], 1); assert.equal(S[2], -1, 'i due bordi del nastro');
  // direzione del nastro: lungo il volo (verso la palla)
  assert.ok(Math.abs(G.dir[last*6 + 2] + 1) < 1e-5 && Math.abs(G.dir[last*6]) < 1e-5);
  assert.ok(G.material.uniforms.uAlpha.value > 0 && G.material.uniforms.uAlpha.value <= BALL_GLOW.alpha);
  // palla più lenta: scia più corta e più tenue; lentissima: niente
  const slow = new NatpfBallGlow(scene(), { enabled: true }); fly(slow, { speed: 14 });
  assert.ok(slow.mesh.visible && slow.level < G.level && slow.length < G.length, `${slow.level} / ${slow.length}`);
  const toss = new NatpfBallGlow(scene(), { enabled: true }); fly(toss, { speed: 5, dir: [0, 1, 0] });
  assert.equal(toss.mesh.visible, false, 'lancio del servizio: nessuna scia');
});

test('niente allocazioni per fotogramma: stessi vettori, riscritti sul posto', () => {
  const G = new NatpfBallGlow(scene(), { enabled: true });
  const arrays = [G.pos, G.dir, G.side, G.hist, G.last, G.geometry.attributes.position.array, G.geometry.index.array], geo = G.geometry, mat = G.material;
  for (let i = 0; i < 20; i++) fly(G, { speed: 20 + i, from: [1, 1, 10] });
  assert.deepEqual([G.pos, G.dir, G.side, G.hist, G.last, G.geometry.attributes.position.array, G.geometry.index.array].map((a, i) => a === arrays[i]), arrays.map(() => true));
  assert.equal(G.geometry, geo); assert.equal(G.material, mat); assert.equal(G.geometry.attributes.position.array, G.pos);
  assert.ok(G.count <= BALL_GLOW.points, 'storia ad anello: mai più di points campioni');
  // il codice del fotogramma non crea oggetti: niente new, niente letterali di vettori o oggetti in sample, frame e _build
  const src = readFileSync(new URL('../src/natpf/natpf_ball_glow.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('  sample(p){'), src.lastIndexOf('}'));
  assert.doesNotMatch(body, /\bnew\b|\.clone\(|\.slice\(|\.map\(|\[\s*\.\.\./, 'allocazioni nel percorso del fotogramma');
  assert.doesNotMatch(src, /Math\.random\(/, 'nessun sorteggio');
});

test('colpo: la palla torna indietro lungo il campo → la scia riparte dalla racchetta; rimbalzo: continua', () => {
  const G = new NatpfBallGlow(scene(), { enabled: true });
  const p = fly(G, { speed: 24, secs: .4, from: [0, 1, -8], dir: [0, 0, 1] });         // verso chi gioca
  const before = G.count; assert.ok(before > 20);
  fly(G, { speed: 26, secs: .05, from: [p.x, p.y, p.z], dir: [0, .1, -1] });            // colpita: torna verso la CPU
  assert.ok(G.count <= 8, `storia dopo il colpo: ${G.count} campioni (prima ${before})`);
  assert.ok(G.pos[G.segments*6 + 2] <= p.z + 1e-3, 'niente scia davanti alla palla (oltre la racchetta)');
  // rimbalzo: la direzione lungo il campo non cambia, la storia continua
  const R = new NatpfBallGlow(scene(), { enabled: true });
  const q = fly(R, { speed: 22, secs: .2, from: [0, 2, 8], dir: [0, -.5, -1] }), n = R.count;
  fly(R, { speed: 22, secs: .1, from: [q.x, q.y, q.z], dir: [0, .5, -1] });
  assert.ok(R.count > n, 'dopo il rimbalzo la storia continua');
  // un piccolo passo all'indietro (correzione di rete sul computer del Player 2) non fa ripartire la scia
  const J = new NatpfBallGlow(scene(), { enabled: true });
  const j = fly(J, { speed: 22, secs: .3 }), m = J.count;
  J.sample({ x: j.x, y: j.y, z: j.z + .1 }); J.sample({ x: j.x, y: j.y, z: j.z - .15 });
  assert.ok(J.count >= m, `storia tenuta: ${J.count} (prima ${m})`);
});

test('salto (palla rimessa in gioco altrove) e clear: storia vuota; fuori dal gioco la scia si spegne', () => {
  const G = new NatpfBallGlow(scene(), { enabled: true });
  fly(G, { speed: 26 });
  G.sample({ x: 0, y: 1, z: -11 });
  assert.equal(G.count, 1, 'dopo un salto resta solo il punto nuovo');
  fly(G, { speed: 26, from: [0, 1, -11], dir: [0, 0, 1] }); assert.equal(G.mesh.visible, true);
  G.clear(); assert.equal(G.mesh.visible, false); assert.equal(G.count, 0); assert.equal(G.level, 0); assert.equal(G.geometry.drawRange.count, 0);
  // punto finito: la palla non è più in gioco → l'intensità scende a zero in pochi fotogrammi
  const p = fly(G, { speed: 26 }); assert.equal(G.mesh.visible, true);
  for (let i = 0; i < 40; i++) G.frame(p, 26, 1/60, false);
  assert.equal(G.mesh.visible, false); assert.equal(G.level, 0);
  // moviola (velocità null): scia a velocità fissa finché arrivano passi della palla, poi si spegne
  const R = new NatpfBallGlow(scene(), { enabled: true }), q = { x: 0, y: 1, z: 8 };
  for (let k = 0; k < 60; k++){ q.z -= .1; R.sample(q); if (k % 2) R.frame(q, null, 1/60, true); }
  assert.equal(R.mesh.visible, true); assert.ok(Math.abs(R.length - glowLength(BALL_GLOW.replaySpeed)) < 1e-9);
  for (let i = 0; i < 40; i++) R.frame(q, null, 1/60, true);
  assert.equal(R.mesh.visible, false, 'moviola ferma: niente scia');
});

test('spenta: niente nella scena e nessun calcolo; riaccesa riparte da vuota', () => {
  const G = new NatpfBallGlow(scene(), { enabled: false });
  fly(G, { speed: 30 });
  assert.equal(G.mesh.visible, false); assert.equal(G.count, 0); assert.equal(G.segments, 0); assert.equal(G.level, 0);
  assert.deepEqual([...G.pos.slice(0, 12)], new Array(12).fill(0), 'vertici mai scritti');
  assert.equal(G.setEnabled(true), true); fly(G, { speed: 30 }); assert.equal(G.mesh.visible, true);
  assert.equal(G.setEnabled(false), false); assert.equal(G.mesh.visible, false); assert.equal(G.count, 0);
  const p = fly(G, { speed: 30 }); G.frame(p, 30, 1/60, true); assert.equal(G.mesh.visible, false);
});

test('colpo potente, colpo super, scambio caldo: la scia di prima (bianca e azzurra) resta sopra', () => {
  const G = new NatpfBallGlow(scene(), { enabled: true });
  fly(G, { speed: 26 }); assert.equal(G.mesh.renderOrder, GLOW_ORDER.over);
  fly(G, { speed: 30, power: true }); assert.equal(G.mesh.renderOrder, GLOW_ORDER.under);
  assert.ok(GLOW_ORDER.under < 6 && GLOW_ORDER.over > 6, 'la scia di prima ha renderOrder 6 (game_engine.js, classe te)');
  const eng = readFileSync(new URL('../src/game_engine.js', import.meta.url), 'utf8');
  assert.match(eng, /this\.mesh\.renderOrder = 6\)/); assert.match(eng, /this\.glow && this\.glow\.sample\(e\)/); assert.match(eng, /this\.glow && this\.glow\.clear\(\)/);
  assert.match(eng, /this\.natpfBallGlow\.frame\(bp, rp \? null : this\.ball\.vel\.length\(\), e, rp \|\| \(this\.phase === "RALLY" && this\.ball\.inPlay\), !!this\.ballTrail\.power\)/);
});

test('Opzioni: riga «Scia della palla» con Sì e No nella pagina', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const row = /<span class="lobby-label">Scia della palla<\/span>[\s\S]{0,400}?<\/div>/.exec(html)?.[0] || '';
  assert.match(row, /data-natpf-trail="1"[^>]*>Sì</); assert.match(row, /data-natpf-trail="0"[^>]*>No</); assert.match(row, /role="radiogroup"/);
});

test('partita simulata con gli stessi semi: stessi punti, scambi e colpi con la scia accesa, spenta o assente', async () => {
  const { simulate } = await import('../scripts/audit/rally-balance.mjs');
  // la scia riceve i passi della palla dalla scia di prima (te.pushPoint, te.clear) e un fotogramma ogni due passi, come nel gioco
  const run = glow => {
    let k = 0, lit = 0;
    const r = simulate({ profile: 'amatore', difficulty: 'pro', points: 30, seed: 11,
      setup: e => { if (glow) e.ballTrail = { setStyle(){}, seedArc(){ glow.clear(); }, updateGeometry(){}, clear(){ glow.clear(); }, pushPoint(p){ glow.sample(p); } }; },
      onStep: e => { if (glow && k++ % 2){ glow.frame(e.ball.pos, e.ball.vel.length(), 1/60, e.phase === 'RALLY' && e.ball.inPlay, !!e.ball.isPowerShot); if (glow.mesh.visible) lit++; } } });
    return { print: JSON.stringify([r.points, r.won, r.rallies, r.shots]), points: r.points, lit };
  };
  const none = run(null), on = run(new NatpfBallGlow(scene(), { enabled: true })), off = run(new NatpfBallGlow(scene(), { enabled: false }));
  assert.equal(none.points, 30);
  assert.equal(on.print, none.print, 'scia accesa'); assert.equal(off.print, none.print, 'scia spenta');
  assert.ok(on.lit > 200, `la scia accesa si è vista in ${on.lit} fotogrammi`); assert.equal(off.lit, 0);
});
