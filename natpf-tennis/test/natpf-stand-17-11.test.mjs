// Collaudo dell'utente del 17/11/2026 sulla 2026-11-17.1 (ledwall, stesso schermo, Lob & Drop):
//   «su stesso schermo dovrei vedere sempre TORINO dritto e invece adesso è tutto specchiato ed invertito» → la metà del
//     Player 2 (camera dall'altra parte) gira le scritte del campo solo mentre si disegna (natpf_split.render,
//     natpf_arena.viewFrom);
//   «il cerchio di anteprima di dove finisce la palla non mi pare ci sia da entrambi» → anche i colpi del Player 2 hanno
//     l'anello a terra dove cadrà la palla (natpf_shot_feedback.onSplitFeedback, natpf_ui.feedback).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { NatpfSplit } from '../src/natpf/natpf_split.js';
import { NatpfShotFeedback } from '../src/natpf/natpf_shot_feedback.js';
import { courtWordTurn } from '@natpf/tennis/arena.js';

function splitEngine(){
  const calls = [];
  const renderer = {
    getSize: v => v.set(1920, 1080), setScissorTest(){}, setViewport(){}, setScissor(){}, getClearColor: c => c, getClearAlpha: () => 1,
    setClearColor(){}, clear(){}, shadowMap: { autoUpdate: true },
    render: (_scene, cam) => calls.push(['render', cam === E.camera ? 'p1' : 'p2', viewer]),
  };
  let viewer = 1;
  const E = {
    renderer, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(45, 1, .1, 500), phase: 'RALLY',
    player: { pos: new THREE.Vector3(0, 0, 11) }, opponent: { pos: new THREE.Vector3(0, 0, -11) }, ball: { pos: new THREE.Vector3() },
    natpfArena: { viewFrom: s => { calls.push(['viewFrom', s]); viewer = s == null ? 1 : s; } },
  };
  E.natpfSplit = new NatpfSplit(E); E.natpfSplit.active = true;
  return { E, calls, get viewer(){ return viewer; } };
}

test('17/11 · stesso schermo: TORINO dritto anche nella metà del Player 2 (le scritte girate solo per disegnarla)', () => {
  const w = splitEngine();
  assert.equal(w.E.natpfSplit.render(), true);
  assert.deepEqual(w.calls, [['render', 'p1', 1], ['viewFrom', -1], ['render', 'p2', -1], ['viewFrom', null]]);
  assert.equal(w.viewer, 1, 'dopo il disegno le scritte tornano come prima (Player 1, menu, schermo intero)');
  // la camera della metà del Player 2 guarda davvero dall'altra parte: con le scritte girate le legge dritte
  const cam = w.E.natpfSplit.cam2, word = new THREE.Object3D();
  word.position.set(0, .008, -14); word.rotation.x = -Math.PI/2; word.rotation.z = courtWordTurn(-1); word.updateMatrixWorld(true);
  cam.updateMatrixWorld(true);
  const right = new THREE.Vector3(1, 0, 0).transformDirection(word.matrixWorld), camRight = new THREE.Vector3(1, 0, 0).transformDirection(cam.matrixWorld);
  assert.ok(right.dot(camRight) > .9, 'il verso della scritta va da sinistra a destra nella metà del Player 2');
  // il disegno che si rompe non lascia le scritte girate
  const v = splitEngine(); v.E.renderer.render = (_s, c) => { if (c !== v.E.camera) throw new Error('perso il contesto'); };
  assert.throws(() => v.E.natpfSplit.render());
  assert.equal(v.viewer, 1);
  // fuori dallo stesso schermo nessun giro
  const f = splitEngine(); f.E.phase = 'MATCH_OVER';
  assert.equal(f.E.natpfSplit.render(), false); assert.deepEqual(f.calls, []);
});

function feedbackEngine({ split = true, role = 'p1' } = {}){
  const opp = { name: 'p2' }, me = { name: 'p1' };
  const E = {
    scene: new THREE.Scene(), playerRole: role, natpfSplit: { active: split }, elapsedTime: 10, player: me, opponent: opp,
    ball: { targetLanding: { x: 1.5, z: 6 }, pos: { x: 0, y: 1, z: -10 }, rallyStrokeCount: 4 },
    racketKinematics: { getRacketRimWorldPoints: a => ({ centerWorld: new THREE.Vector3(a === opp ? 3 : -3, 1, a === opp ? -10 : 10) }) },
  };
  return E;
}
test('17/11 · stesso schermo: il colpo del Player 2 ha il suo anello a terra dove cadrà la palla, e il lampo sulla sua racchetta', () => {
  const E = feedbackEngine(), S = new NatpfShotFeedback(E);
  const q = S.onSplitFeedback({ kind: 'hit', grade: 'P2 PERFECT • FOREHAND TOPSPIN', role: 'p2' });
  assert.equal(q?.color, 'green');
  const m = S.markers.find(k => k.active);
  assert.ok(m && m.g.visible, 'anello acceso');
  assert.deepEqual([m.g.position.x, m.g.position.z], [1.5, 6], 'dove cadrà la palla, nella metà del Player 1');
  const f = S.flashes.find(k => k.active);
  assert.ok(f && f.s.position.x === 3 && f.s.position.z === -10, 'lampo sulla racchetta del Player 2');
  assert.equal(S.last, null, 'l\'esito «di chi gioca qui» (allenamento, etichetta del gesto) non cambia');
  // contro la CPU, tra due computer o sul computer del Player 2: niente (là l'anello è già di chi gioca)
  for (const o of [{ split: false }, { role: 'p2' }]){
    const S2 = new NatpfShotFeedback(feedbackEngine(o));
    assert.equal(S2.onSplitFeedback({ kind: 'hit', grade: 'P2 PERFECT • FOREHAND TOPSPIN' }), null, JSON.stringify(o));
    assert.ok(!S2.markers.some(k => k.active));
  }
  assert.equal(new NatpfShotFeedback(feedbackEngine()).onSplitFeedback({ kind: 'whiff', grade: 'TOO LATE! • WHIFF' }), null, 'colpo mancato: nessun anello');
});

test('17/11 · stesso schermo: colpo del Player 2 che aspetta il verdetto (fuori o in rete): anello solo quando la palla tocca terra, l\'etichetta del Player 1 non cambia', () => {
  const E = feedbackEngine(), S = new NatpfShotFeedback(E);
  let late = 0; E.natpfUi = { gesture: { lateOutcome: () => late++ } };
  S.verdict = { stroke: 4, hitter: 'opponent', p2: true, q: { color: 'red', label: 'Fuori' }, grade: 'P2 GOOD • FOREHAND TOPSPIN', drop: null, at: 10, show(){}, local: null, phone: null, settled: false };
  E.ball.targetLanding = { x: 9, z: 6 };   // fuori di lato: il verdetto aspetta
  S.onSplitFeedback({ kind: 'hit', grade: 'P2 GOOD • FOREHAND TOPSPIN', role: 'p2' });
  assert.ok(!S.markers.some(k => k.active), 'niente anello prima del rimbalzo');
  assert.deepEqual(S.verdict.local, { net: false, other: true });
  E.ball.lastHitter = 'opponent'; E.ball.pos = { x: 8.6, y: 0, z: 6.2 };
  assert.equal(S.settle('player', 'Out'), true);
  const m = S.markers.find(k => k.active);
  assert.ok(m && Math.abs(m.g.position.x - 8.6) < 1e-9, 'anello rosso dove è caduta');
  assert.equal(late, 0, 'l\'etichetta del gesto del Player 1 non riceve il verdetto del Player 2');
});

test('17/11 · natpf_ui.feedback: i colpi del Player 2 nello stesso schermo accendono il suo anello, non negli scambi di prova', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../src/natpf/natpf_ui.js', import.meta.url), 'utf8');
  assert.match(src, /if \(\(e\.role \|\| 'p1'\) !== this\.engine\.playerRole\)\{ if \(!this\.trial\?\.active\) this\.shot\.onSplitFeedback\?\.\(e\); return null; \}/);
});
