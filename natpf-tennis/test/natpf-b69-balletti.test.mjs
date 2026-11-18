// B69 · Balletti di vittoria e sconfitte buffe delle mascotte 3D nella card (richiesta dell'utente del 18/11/2026: «Le
// mascotte ok, integra queste e butta dentro altre animazioni simili alle esultanze e balletti»; docs/b69/balletti-mascotte.md).
// Con i modelli veri (senza browser): racchetta nel pugno o ferma a terra, mai dentro testa, busto o gambe, in TUTTI i
// fotogrammi (Drop e Lob, destri e mancini, con il movimento di tutto il personaggio); piedi mai sotto il campo; giro
// chiuso; ritmo (pose diverse sulle battute); scelta senza ripetere; acceso di base solo con Lob e Drop.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { CARD_MOVES, CARD_LOOP, CARD_MOVES_KEY, CARD_MOVES_LAST, cardMove, cardMovesOn, cardUses3d, cardsUse3d, pickCardMove, pickCardMoves, applyCardMove } from '../src/natpf/natpf_card_moves.js';
import { DANCE_MOVES, beats, mixPose } from '../src/natpf/natpf_card_balli.js';
import { MASCOT_HEAD_SHAPE, mascotGripProbe, RACKET_GRIP_Y } from '../src/natpf/natpf_mascot_rig.js';
import { RACKET_POINTS, updateNatpfCharacters } from '../src/natpf/natpf_character.js';
import { resetMascotModels, setMascotMode } from '../src/natpf/natpf_mascot_models.js';
import { resetCast } from '../src/natpf/natpf_personaggi.js';
import { engineOf, useModels } from './mascotte-campo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DANCES = [...DANCE_MOVES.win, ...DANCE_MOVES.lose], K = 24;
const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m }; };
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ctx), set: (t, k, v) => { t[k] = v; return true; } });
test.before(() => { globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) }; });
test.after(() => { delete globalThis.document; resetMascotModels(); setMascotMode(null); resetCast(); });

function stage(lefty = false){
  useModels();
  const E = engineOf();
  if (lefty) for (const a of [E.player, E.opponent]) a.root.scale.x = -1;
  E.step();
  return E;
}
// come natpf_ritratti: tutto il personaggio nel movimento (dal posto di partenza), poi la posa sulle ossa
const bases = new WeakMap();
function pose(E, who, move, k){
  const a = E[who];
  if (!bases.has(a)) bases.set(a, { pos: a.root.position.clone(), rotY: a.root.rotation.y, rotX: a.root.rotation.x, rotZ: a.root.rotation.z });
  applyCardMove(a, move, (k + 1e-6)/K*CARD_LOOP, bases.get(a), (a.sideSign || 1) > 0 ? -1 : 1);
  updateNatpfCharacters(E); a.root.updateMatrixWorld(true);
  return a;
}
const RIM = (() => { const { center, headA, headB } = RACKET_POINTS, p = []; for (let i = 0; i < 32; i++){ const t = i/32*2*Math.PI; p.push(new THREE.Vector3(headA*Math.cos(t), center + headB*Math.sin(t), 0)); } p.push(new THREE.Vector3(0, center, 0), new THREE.Vector3(0, 0.27, 0), new THREE.Vector3(0, RACKET_POINTS.throat, 0), new THREE.Vector3(0, 0, 0)); return p; })();
const racketWorld = a => RIM.map(p => p.clone().applyMatrix4(a.racketMesh.matrixWorld));
const inside = (p, bone, shapes) => { const l = p.clone().applyMatrix4(new THREE.Matrix4().copy(bone.matrixWorld).invert()); return shapes.some(e => ((l.x - e.cx)/e.rx)**2 + ((l.y - e.cy)/e.ry)**2 + ((l.z - (e.cz || 0))/e.rz)**2 < 1); };
const BODY = [{ cx: 0, cy: 0.0, cz: 0, rx: 0.15, ry: 0.13, rz: 0.08 }];
const segDist = (p, a, b) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab)/ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };

test('B69: sei balletti di vittoria e due sconfitte buffe, in più dei sette del B67; nomi originali', () => {
  assert.deepEqual(DANCE_MOVES.win.map(m => m.id), ['win-robot', 'win-disco', 'win-corsa', 'win-incrocio', 'win-pendolo', 'win-tetto']);
  assert.deepEqual(DANCE_MOVES.lose.map(m => m.id), ['lose-sasso', 'lose-capriccio']);
  assert.equal(CARD_MOVES.win.length, 10); assert.equal(CARD_MOVES.lose.length, 5);
  for (const m of DANCES){
    assert.equal(cardMove(m.id), m); assert.ok(m.dance && m.name.length > 3);
    assert.equal(m.base, m.id.startsWith('win') ? 'cheer' : 'sad');
    if (m.id.startsWith('lose')) assert.ok(m.camUp < 0);
  }
  // niente nomi di giochi, marchi o balli con nome proprio nei file
  const src = ['src/natpf/natpf_card_balli.js', 'src/natpf/natpf_card_moves.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  for (const w of ['fortnite', 'floss', 'tiktok', 'carlton', 'gangnam', 'moonwalk', 'macarena', 'orange justice', 'take the l', 'emote']) assert.ok(!src.toLowerCase().includes(w), w);
});

test('B69: racchetta nel pugno (manico al centro del guanto) o ferma a terra, in tutti i fotogrammi, Drop e Lob, destri e mancini', () => {
  let n = 0, worst = 0, maxStretch = 0;
  for (const lefty of [false, true]){
    const E = stage(lefty);
    for (const who of ['player', 'opponent']){
      for (const move of DANCES){
        let fixed = null;
        for (let k = 0; k < K; k++){
          const a = pose(E, who, move, k), rig = a.natpfMascot3d, spec = move.mascot(k/K, rig);
          assert.ok(rig?.cardPosed);
          maxStretch = Math.max(maxStretch, rig.left.stretch, rig.right.stretch);
          if (spec.rest){
            // a terra: ferma nel mondo mentre il personaggio si muove, appoggiata al campo
            const g = new THREE.Vector3(0, RACKET_GRIP_Y, 0).applyMatrix4(a.racketMesh.matrixWorld);
            if (!fixed) fixed = g; else assert.ok(g.distanceTo(fixed) < 1e-6, `${move.id} ${k}: la racchetta a terra si sposta di ${g.distanceTo(fixed)}`);
            const low = Math.min(...racketWorld(a).map(p => p.y)) - bases.get(a).pos.y;
            assert.ok(low > -0.005 && low < 0.03, `${who} ${move.id} ${k}: racchetta a terra a ${low.toFixed(3)} m`);
            continue;
          }
          const p = mascotGripProbe(rig, a);
          worst = Math.max(worst, p.dist); n++;
          assert.ok(p.dist < 0.005, `${who} ${lefty ? 'mancino' : 'destro'} ${move.id} ${k}: manico a ${p.dist.toFixed(4)} m dal pugno`);
          assert.ok(p.reach < 0.03, `${who} ${move.id} ${k}: mano a ${p.reach.toFixed(3)} m dalla posa`);
        }
      }
    }
  }
  assert.ok(n > 500, `${n} fotogrammi con la racchetta in mano`);
  assert.ok(maxStretch < 1.9, `braccia allungate al più ${maxStretch.toFixed(2)} volte`);
  console.log(`   B69: manico-pugno al più ${(worst*1000).toFixed(2)} mm su ${n} fotogrammi, allungamento ${maxStretch.toFixed(2)}`);
});

test('B69: la racchetta non entra mai nella testa, nel busto o nelle gambe; piedi mai sotto il campo; giro chiuso', () => {
  for (const lefty of [false, true]){
    const E = stage(lefty);
    for (const who of ['player', 'opponent']){
      for (const move of DANCES){
        for (let k = 0; k < K; k++){
          const a = pose(E, who, move, k), rig = a.natpfMascot3d, y0 = bases.get(a).pos.y;
          const legs = [rig.left, rig.right].map(s => [s.upleg.bone.getWorldPosition(new THREE.Vector3()), s.leg.bone.getWorldPosition(new THREE.Vector3()), s.foot.clone().applyMatrix4(rig.group.matrixWorld)]);
          for (const p of racketWorld(a)){
            assert.ok(!inside(p, rig.head.bone, MASCOT_HEAD_SHAPE[rig.key]), `${who} ${move.id} ${k}: racchetta nella testa`);
            assert.ok(!inside(p, rig.spine02.bone, BODY), `${who} ${move.id} ${k}: racchetta nel busto`);
            for (const [u, l, f] of legs) assert.ok(Math.min(segDist(p, u, l), segDist(p, l, f)) > 0.05, `${who} ${lefty ? 'mancino' : 'destro'} ${move.id} ${k}: racchetta nella gamba`);
          }
          for (const s of [rig.left, rig.right]) assert.ok(s.foot.y >= 0, `${move.id} ${k}: piede sotto il campo`);
          assert.ok(a.root.position.y - y0 >= -1e-9);
        }
      }
    }
  }
  const flat = (o, pre = '', out = {}) => { for (const [k, v] of Object.entries(o)) if (typeof v === 'number') out[pre + k] = v; else if (v && typeof v === 'object') flat(v, `${pre}${k}.`, out); return out; };
  for (const m of DANCES) for (const key of ['drop', 'lob']){
    const rig = { key, racketReach: 0.5 }, a = flat(m.mascot(0, rig)), b = flat(m.mascot(1 - 1e-9, rig));
    for (const k of Object.keys(a)) assert.ok(Math.abs(a[k] - b[k]) < 1e-5, `${m.id} ${key} ${k}: ${a[k]} ≠ ${b[k]}`);
    const A = m.at(0), B = m.at(1 - 1e-9);
    for (const k of ['right', 'fwd', 'up', 'yaw']) assert.ok(Math.abs(A[k] - B[k]) < 1e-5, `${m.id} ${k}`);
  }
});

test('B69: ritmo: pose diverse sulle battute, mani e piedi che si muovono abbastanza da vedersi nella card', () => {
  const rig = { key: 'drop', racketReach: 0.5 };
  for (const m of DANCES){
    let hand = 0, foot = 0, beatsDiff = 0;
    const p0 = m.mascot(0, rig), at = p => (p.racket?.at || [0, 0, 0]).concat(p.free?.at || [0, 0, 0]);
    for (let i = 0; i < K; i++){
      const p = m.mascot(i/K, rig), d = Math.hypot(...at(p).map((v, j) => v - at(p0)[j]));
      hand = Math.max(hand, d);
      foot = Math.max(foot, ...['a', 'b'].map(s => Math.hypot(...(p.legs?.[s] || [0, 0, 0]))));
    }
    for (let b = 0; b < 8; b++) beatsDiff = Math.max(beatsDiff, Math.hypot(...at(m.mascot(b/8, rig)).map((v, j) => v - at(m.mascot(((b + 1) % 8)/8, rig))[j])));
    assert.ok(m.mascot(0, rig).legs, `${m.id}: i piedi li mette la posa`);
    assert.ok(hand > 0.08 || foot > 0.06, `${m.id}: mani ${hand.toFixed(2)}, piedi ${foot.toFixed(2)} (unità del modello)`);
    assert.ok(beatsDiff > 0.04 || foot > 0.06, `${m.id}: due battute vicine troppo uguali`);
  }
  // robot: a scatti (pose tenute: fra due fotogrammi della stessa battuta niente cambia)
  const robot = cardMove('win-robot').mascot;
  assert.deepEqual(robot(4/24 + 1e-6, rig).racket, robot(5/24, rig).racket);
  assert.notDeepEqual(robot(5/24, rig).racket, robot(6/24 + 1e-6, rig).racket);
  // disco: finisce con il dab tenuto (stessa posa nelle ultime due battute)
  const disco = cardMove('win-disco').mascot;
  assert.deepEqual(disco(6.2/8, rig), disco(6.9/8, rig));
  assert.ok(disco(6.5/8, rig).racket.dir[1] > 0.4 && disco(6.5/8, rig).head.pitch > 0.2, 'dab: racchetta in alto in fuori, testa china');
  // aiuti: fusione di pose e battute
  assert.deepEqual(mixPose({ a: [0, 2], s: 'x', b: 1 }, { a: [2, 4], s: 'y' }, 0.5), { a: [1, 3], s: 'y', b: 1 });
  assert.equal(beats(0.5, [0, 10], { hold: 0.5 }), 10); assert.equal(beats(0.25, [0, 10], { hold: 0.6 }), 0);
});

test('B69: il giro di tutto il personaggio va verso il lato libero anche per il mancino (radice specchiata)', () => {
  const mk = sx => { const root = new THREE.Object3D(); root.scale.x = sx; return { root }; };
  const R = mk(1), L = mk(-1), base = { pos: new THREE.Vector3(), rotY: 0, rotX: 0, rotZ: 0 }, m = cardMove('win-corsa');
  applyCardMove(R, m, 0.3*CARD_LOOP, base); applyCardMove(L, m, 0.3*CARD_LOOP, base);
  assert.ok(Math.abs(R.root.rotation.y + L.root.rotation.y) < 1e-12 && Math.abs(R.root.rotation.y) > 0.3);
  assert.equal(R.natpfCardPose.base, base, 'posto di partenza per la racchetta a terra');
});

test('B69: scelta a caso fra tutti i movimenti dell\'esito, mai quello della partita prima, mai due uguali nella stessa partita', () => {
  const st = memory();
  let r = 7; const rnd = () => ((r = (r*1103515245 + 12345) % 2147483648)/2147483648);
  let lastW = null, lastL = null; const seen = new Set();
  for (let i = 0; i < 400; i++){
    const w = pickCardMove('win', { storage: st, rnd }), l = pickCardMove('lose', { storage: st, rnd });
    assert.notEqual(w.id, lastW); assert.notEqual(l.id, lastL);
    lastW = w.id; lastL = l.id; seen.add(w.id); seen.add(l.id);
  }
  assert.equal(seen.size, 15, 'tutti e quindici escono');
  // a pari nello stesso schermo (due card che perdono): diversi, e la partita dopo nessuno dei due
  const s2 = memory();
  for (let i = 0; i < 200; i++){
    const prev = [].concat(JSON.parse(s2.map.get(CARD_MOVES_LAST) || '{}').lose || []);
    const [a, b] = pickCardMoves(['lose', 'lose'], { storage: s2, rnd });
    assert.notEqual(a.id, b.id); assert.ok(!prev.includes(a.id) && !prev.includes(b.id), `${prev} → ${a.id} ${b.id}`);
  }
  assert.deepEqual(JSON.parse(s2.map.get(CARD_MOVES_LAST)).lose.length, 2);
});

test('B69: acceso di base solo con Lob e Drop in campo; ?mascotte3d=0, la chiave a 0 o ?ritratti=svg lo spengono; i Classici come prima', () => {
  assert.equal(cardMovesOn({ desktop: true, search: '', storage: memory() }), true);
  assert.equal(cardMovesOn({ desktop: true, search: '', storage: memory({ [CARD_MOVES_KEY]: '0' }) }), false);
  assert.equal(cardMovesOn({ desktop: true, search: '?mascotte3d=0', storage: memory() }), false);
  assert.equal(cardMovesOn({ desktop: true, search: '?mascotte3d=1', storage: memory({ [CARD_MOVES_KEY]: '0' }) }), true);
  assert.equal(cardMovesOn({ desktop: true, search: '', storage: { getItem(){ throw new Error('x'); } } }), true);
  assert.equal(cardUses3d({ look: 'drop' }, { on: true, search: '' }), true);
  assert.equal(cardUses3d({ look: 'lob' }, { on: true, search: '?ritratti=svg' }), false);
  assert.equal(cardUses3d({ look: 'p1' }, { on: true, search: '' }), false);
  assert.equal(cardUses3d({ look: 'lob' }, { on: false, search: '' }), false);
  assert.equal(cardsUse3d({ cards: [{ look: 'drop' }, { look: 'lob' }] }, { on: true, search: '' }), true);
  assert.equal(cardsUse3d({ cards: [{ look: 'drop' }, { look: 'p2' }] }, { on: true, search: '' }), false);
  assert.equal(cardsUse3d({ cards: [] }, { on: true, search: '' }), false);
  // la card: niente GIF dove fanno le mascotte 3D; i ritratti 3D con i movimenti solo se tutte le card sono Lob e Drop
  const hud = fs.readFileSync(path.join(ROOT, 'src/hud_ui.js'), 'utf8'), rit = fs.readFileSync(path.join(ROOT, 'src/natpf/natpf_ritratti.js'), 'utf8');
  assert.match(hud, /rot = cv0 && !cardsUse3d\(cv0\) \? mascotRotation\(\) : null/);
  assert.match(rit, /const moves = cardsUse3d\(model\)/);
  assert.match(rit, /pickCardMoves\(model\.cards\.map\(c => \(c\.won \? 'win' : 'lose'\)\)\)/);
});
