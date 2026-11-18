// B67 · Pose della card di fine partita per le mascotte 3D (richiesta dell'utente del 18/11/2026: impugnatura credibile,
// pose simpatiche «Sei-sette» e «Aura», sconfitta visibilmente triste; docs/b67/pose-mascotte.md). Con i modelli veri
// (senza browser): racchetta nel pugno in tutti i fotogrammi, per Drop e Lob, destri e mancini; racchetta fuori dalla
// testa e dal busto; racchetta a terra dove deve; giro chiuso; faccia triste solo nella sconfitta; uscita dalla posa
// pulita (in campo tutto come prima); effetti nel solo layer del ritratto.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { CARD_MOVES, cardMove } from '../src/natpf/natpf_card_moves.js';
import { HAND_CENTER, RACKET_GRIP_Y, FIST_SCALE, MASCOT_HEAD_SHAPE, MASCOT_SCALE, mascotGripProbe } from '../src/natpf/natpf_mascot_rig.js';
import { RACKET_POINTS } from '../src/natpf/natpf_character.js';
import { FACE_LAYOUT, faceMaskTriangles, paintSadFace } from '../src/natpf/natpf_mascot_face.js';
import { updateNatpfCharacters } from '../src/natpf/natpf_character.js';
import { resetMascotModels, setMascotMode } from '../src/natpf/natpf_mascot_models.js';
import { resetCast } from '../src/natpf/natpf_personaggi.js';
import { buildMascotScene } from './mascotte-glb.mjs';
import { FILE, engineOf, useModels } from './mascotte-campo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALL = [...CARD_MOVES.win, ...CARD_MOVES.lose], K = 24;
// canvas finto (le texture della faccia e degli effetti si disegnano anche senza browser)
const calls = [];
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { calls.push(k); return ctx; }), set: (t, k, v) => { t[k] = v; return true; } });
test.before(() => { globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) }; });
test.after(() => { delete globalThis.document; resetMascotModels(); setMascotMode(null); resetCast(); });

function stage(lefty = false){
  useModels();
  const E = engineOf();
  if (lefty) for (const a of [E.player, E.opponent]) a.root.scale.x = -1;
  E.step();
  return E;
}
const pose = (E, who, move, k) => { const a = E[who]; a.natpfCardPose = { move, u: k/K }; updateNatpfCharacters(E); a.root.updateMatrixWorld(true); return a; };
// punti del telaio e della gola della racchetta (sistema della racchetta)
const RIM = (() => { const { center, headA, headB } = RACKET_POINTS, p = []; for (let i = 0; i < 32; i++){ const t = i/32*2*Math.PI; p.push(new THREE.Vector3(headA*Math.cos(t), center + headB*Math.sin(t), 0)); } p.push(new THREE.Vector3(0, center, 0), new THREE.Vector3(0, 0.27, 0), new THREE.Vector3(0, RACKET_POINTS.throat, 0)); return p; })();
const racketWorld = a => RIM.map(p => p.clone().applyMatrix4(a.racketMesh.matrixWorld));
const inside = (p, bone, shapes) => { const l = p.clone().applyMatrix4(new THREE.Matrix4().copy(bone.matrixWorld).invert()); return shapes.some(e => ((l.x - e.cx)/e.rx)**2 + ((l.y - e.cy)/e.ry)**2 + ((l.z - (e.cz || 0))/e.rz)**2 < 1); };

test('B67: racchetta nel pugno in tutti i fotogrammi (Drop e Lob, destri e mancini): manico al centro del guanto, mano dove la vuole la posa', () => {
  let worst = 0, worstReach = 0, maxStretch = 0, n = 0;
  for (const lefty of [false, true]){
    const E = stage(lefty);
    for (const who of ['player', 'opponent']){
      for (const move of ALL){
        for (let k = 0; k < K; k++){
          const a = pose(E, who, move, k), rig = a.natpfMascot3d, spec = move.mascot(k/K, rig);
          assert.ok(rig?.cardPosed, `${move.id}: posa della card`);
          // braccia di peluche corte: si allungano un poco, mai troppo (le due)
          maxStretch = Math.max(maxStretch, rig.left.stretch, rig.right.stretch);
          if (spec.rest) continue;                                 // «Sei-sette»: racchetta appoggiata (prova sotto)
          const g = mascotGripProbe(rig, a);
          worst = Math.max(worst, g.dist); worstReach = Math.max(worstReach, g.reach); maxStretch = Math.max(maxStretch, g.stretchA); n++;
          assert.ok(g.dist < 0.005, `${who} ${lefty ? 'mancino' : 'destro'} ${move.id} ${k}: manico a ${g.dist.toFixed(4)} m dal centro del pugno`);
          assert.ok(g.reach < 0.03, `${who} ${move.id} ${k}: la mano resta a ${g.reach.toFixed(3)} m da dove la vuole la posa`);
          // il pollice va verso la testa della racchetta (la racchetta esce dal pugno dalla parte giusta)
          const head = new THREE.Vector3(0, RACKET_POINTS.center, 0).applyMatrix4(a.racketMesh.matrixWorld);
          assert.ok(head.distanceTo(g.hand) > 0.4, `${move.id}: il piatto sta lontano dalla mano`);
        }
        // la mano della racchetta è quella del suo lato (destra per i destri, sinistra per i mancini) e fa il pugno
        const rig = E[who].natpfMascot3d, side = lefty ? rig.left : rig.right;
        if (!move.mascot(0, rig).rest) assert.deepEqual(side.hand.bone.scale.toArray(), [...FIST_SCALE]);
      }
    }
  }
  assert.ok(n >= 500, `${n} fotogrammi provati`);
  assert.ok(maxStretch < 1.9, `braccia allungate al più ${maxStretch.toFixed(2)} volte`);
  console.log(`   manico-pugno al più ${(worst*1000).toFixed(2)} mm, mano dalla posa al più ${(worstReach*100).toFixed(1)} cm, allungamento ${maxStretch.toFixed(2)} (${n} fotogrammi)`);
});

test('B67: la racchetta non attraversa la testa né il busto in nessun fotogramma', () => {
  for (const lefty of [false, true]){
    const E = stage(lefty);
    for (const who of ['player', 'opponent']){
      for (const move of ALL){
        for (let k = 0; k < K; k += 2){
          const a = pose(E, who, move, k), rig = a.natpfMascot3d;
          const head = MASCOT_HEAD_SHAPE[rig.key];
          // busto: ellissoide intorno alle ossa Spine02 (pancia e petto, sotto la testa)
          const body = [{ cx: 0, cy: 0.0, cz: 0, rx: 0.15, ry: 0.13, rz: 0.08 }];
          for (const p of racketWorld(a)){
            assert.ok(!inside(p, rig.head.bone, head), `${who} ${move.id} ${k}: racchetta nella testa`);
            assert.ok(!inside(p, rig.spine02.bone, body), `${who} ${move.id} ${k}: racchetta nel busto`);
          }
        }
      }
    }
  }
});

test('B67: racchetta a terra con la punta (trascinata, che pende, appoggiata alla gamba, piantata) e appoggiata vicino al fianco', () => {
  const E = stage(false);
  for (const who of ['player', 'opponent']){
    for (const id of ['lose-trascina', 'lose-sospiro', 'lose-lacrima', 'win-sei', 'win-aura']){
      for (let k = 0; k < K; k += 3){
        const a = pose(E, who, cardMove(id), k), y0 = a.root.position.y;
        const low = Math.min(...racketWorld(a).map(p => p.y)) - y0;
        assert.ok(low > -0.03 && low < 0.045, `${who} ${id} ${k}: telaio a ${low.toFixed(3)} m dal campo`);
      }
    }
    // «Sei-sette»: il manico all'altezza del fianco, accanto al personaggio (non sospeso lontano)
    const a = pose(E, who, cardMove('win-sei'), 5), hips = a.natpfMascot3d.hips.bone.getWorldPosition(new THREE.Vector3());
    const grip = new THREE.Vector3(0, RACKET_GRIP_Y, 0).applyMatrix4(a.racketMesh.matrixWorld);
    assert.ok(grip.distanceTo(hips) < 0.55, `${who}: manico a ${grip.distanceTo(hips).toFixed(2)} m dal bacino`);
  }
});

test('B67: giro chiuso anche per le pose delle mascotte (fine = inizio), «Sei-sette» con le mani che si alternano', () => {
  const rig = { key: 'drop', hips: { wp: { y: 0.374 } }, spine: { wp: { y: 0.528 } }, racketReach: 0.5 };
  const flat = (o, pre = '', out = {}) => { for (const [k, v] of Object.entries(o)) if (typeof v === 'number') out[pre + k] = v; else if (v && typeof v === 'object') flat(v, `${pre}${k}.`, out); return out; };
  for (const m of ALL){
    for (const key of ['drop', 'lob']){
      const a = flat(m.mascot(0, { ...rig, key })), b = flat(m.mascot(1 - 1e-9, { ...rig, key }));
      for (const k of Object.keys(a)) assert.ok(Math.abs(a[k] - b[k]) < 1e-6, `${m.id} ${key} ${k}: ${a[k]} ≠ ${b[k]}`);
    }
  }
  const six = cardMove('win-sei');
  let alt = 0;
  for (let i = 0; i < 48; i++){ const p = six.mascot(i/48, rig); alt = Math.max(alt, Math.abs(p.racket.at[1] - p.free.at[1])); assert.ok(p.racket.palm[1] > 0.9 && p.free.palm[1] > 0.9, 'palmi in su'); assert.ok(Math.sign(p.racket.at[1] - p.free.at[1]) === Math.sign(Math.sin(3*2*Math.PI*i/48)) || Math.abs(Math.sin(3*2*Math.PI*i/48)) < 1e-9, 'alternate'); }
  assert.ok(alt > 0.15, `le mani si scostano di ${alt.toFixed(2)} (unità del modello)`);
  assert.equal(cardMove('win-aura').fx, 'aura'); assert.equal(cardMove('lose-sospiro').fx, 'nuvola');
});

test('B67: faccia triste solo nella sconfitta: maschera sui triangoli della faccia, stessa pelle e stesse ossa, accesa solo nella posa', () => {
  for (const m of ALL) for (let i = 0; i < 12; i++) assert.equal(m.mascot(i/12, { key: 'lob' }).face === 'sad', m.id.startsWith('lose'), m.id);
  for (const m of CARD_MOVES.lose) assert.ok(m.camUp < 0, `${m.id}: camera un filo dal basso (faccia sotto la visiera)`);
  // triangoli della maschera dai vertici veri, nel sistema dell'osso della testa
  for (const key of ['drop', 'lob']){
    const S = buildMascotScene(FILE[key]), g = S.mesh.geometry, head = S.mesh.skeleton.bones.indexOf(S.bones.Head);
    const M = new THREE.Matrix4().multiplyMatrices(S.mesh.skeleton.boneInverses[head], S.mesh.bindMatrix), v = new THREE.Vector3();
    const P = i => v.fromBufferAttribute(g.attributes.position, i).applyMatrix4(M).toArray();
    const { index, uv } = faceMaskTriangles(key, g.attributes.position.count, g.index.array, P);
    assert.ok(index.length/3 > 300 && index.length/3 < 3000, `${key}: ${index.length/3} triangoli`);
    const L = FACE_LAYOUT[key];
    // la bocca e i due occhi sono coperti dalla maschera
    for (const [x, y] of [[L.mouth.cx, L.mouth.cy], ...L.eyes.map(e => [e.cx, e.cy + 0.3*e.ry])]){
      let hit = false;
      for (let t = 0; t < index.length && !hit; t += 3){
        const [a, b, c] = [index[t], index[t + 1], index[t + 2]].map(P).map(p => [p[0], p[1]]);
        const d = (b[1] - c[1])*(a[0] - c[0]) + (c[0] - b[0])*(a[1] - c[1]);
        const l1 = ((b[1] - c[1])*(x - c[0]) + (c[0] - b[0])*(y - c[1]))/d, l2 = ((c[1] - a[1])*(x - c[0]) + (a[0] - c[0])*(y - c[1]))/d;
        hit = l1 >= 0 && l2 >= 0 && l1 + l2 <= 1;
      }
      assert.ok(hit, `${key}: (${x}, ${y}) coperto`);
    }
    for (const t of index) assert.ok(uv[2*t] >= 0 && uv[2*t] <= 1 && uv[2*t + 1] >= 0 && uv[2*t + 1] <= 1);
    calls.length = 0; paintSadFace(ctx, key, 320, 228);
    assert.ok(calls.includes('ellipse') && calls.includes('bezierCurveTo') && calls.includes('clip'), 'bocca, palpebre, lacrima');
  }
  // nel gioco: la maschera nasce alla prima posa triste, condivide la pelle e le ossa, e si spegne fuori dalla posa
  const E = stage(false), a = E.opponent;
  pose(E, 'opponent', cardMove('win-aura'), 0);
  assert.equal(a.natpfMascot3d.face, undefined, 'niente maschera per la vittoria');
  pose(E, 'opponent', cardMove('lose-sospiro'), 3);
  const rig = a.natpfMascot3d, face = rig.face;
  let skin = null; rig.model.traverse(o => { if (o.isSkinnedMesh && o !== face && !skin) skin = o; });
  assert.ok(face?.isSkinnedMesh && face.visible, 'maschera accesa nella posa triste');
  assert.equal(face.skeleton, skin.skeleton); assert.equal(face.geometry.attributes.position, skin.geometry.attributes.position);
  assert.equal(face.geometry.attributes.skinWeight, skin.geometry.attributes.skinWeight);
  assert.ok(face.material.transparent && face.material.map?.isCanvasTexture);
  pose(E, 'opponent', cardMove('win-salti'), 3);
  assert.equal(face.visible, false, 'spenta in una posa di vittoria');
  a.natpfCardPose = null; E.step();
  assert.equal(face.visible, false, 'spenta in campo');
});

test('B67: uscita dalla posa della card: in campo spalle, mani, braccia e gambe tornano quelle di sempre', () => {
  // due partite uguali (mancini), una con le fotografie della card in mezzo: dopo poco tutte le ossa sono uguali
  const A = stage(true), B = stage(true);
  // (stage rimette i modelli: i rig di A e B sono distinti perché ogni attore ha la sua copia del modello)
  const bones = E => Object.values(E.player.natpfMascot3d.bones).map(b => [...b.quaternion.toArray(), ...b.scale.toArray(), ...b.position.toArray()]).flat();
  for (let i = 0; i < 5; i++){ A.step(); B.step(); }
  for (const m of ALL) pose(A, 'player', m, 7);
  A.player.natpfCardPose = null;
  assert.ok(A.player.natpfMascot3d !== B.player.natpfMascot3d);
  for (let i = 0; i < 30; i++){ A.step(); B.step(); }
  const a = bones(A), b = bones(B);
  a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < 1e-6, `valore ${i}: ${x} ≠ ${b[i]}`));
  assert.equal(A.player.natpfMascot3d.cardPosed, false);
  for (const n of ['RightShoulder', 'LeftShoulder', 'RightHand', 'LeftHand']){
    const bn = A.player.natpfMascot3d.B[n];
    assert.ok(bn.bone.quaternion.angleTo(bn.q) < 1e-6 && bn.bone.scale.equals(new THREE.Vector3(1, 1, 1)), `${n} a riposo`);
  }
});

test('B67: effetti dell\'Aura e della nuvoletta solo nel layer del ritratto, giro chiuso, riquadro allargato', async () => {
  const { createCardFx, AURA_FLAMES, RAIN_DROPS } = await import('../src/natpf/natpf_card_fx.js');
  const box = new THREE.Box3(new THREE.Vector3(-0.5, 0, -0.3), new THREE.Vector3(0.5, 1.6, 0.3)), cam = new THREE.PerspectiveCamera();
  cam.position.set(0.3, 1, -6);
  for (const [kind, n] of [['aura', 1 + AURA_FLAMES], ['nuvola', 1 + RAIN_DROPS]]){
    const fx = createCardFx(kind, 5);
    assert.ok(fx.parts.length >= n && fx.parts.every(p => p.isSprite && p.layers.mask === 1 << 5), `${kind}: sprite solo nel layer 5`);
    assert.ok(fx.pad.top > 0);
    // (fine = inizio per tutto quello che si vede: una fiammella che rinasce in basso lo fa spenta)
    const at = u => { fx.update(u, box, new THREE.Vector3(0, 1.6, 0), cam); return fx.parts.map(p => [p.material.opacity, ...p.position.toArray(), p.scale.x]); };
    const a = at(0), b = at(1 - 1e-9);
    a.forEach((pa, i) => { if (pa[0] < 1e-3 && b[i][0] < 1e-3) return; pa.forEach((x, j) => assert.ok(Math.abs(x - b[i][j]) < 1e-4, `${kind} parte ${i}: ${x} ≠ ${b[i][j]}`)); });
  }
  const nuv = createCardFx('nuvola', 5); nuv.update(0.3, box, new THREE.Vector3(0, 1.6, 0), cam);
  assert.ok(nuv.parts[0].position.y > 1.6, 'nuvoletta sopra la testa');
});

test('B67: in natpf_ritratti la posa, gli effetti e le ossa si rimettono a posto; senza interruttore niente cambia', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/natpf/natpf_ritratti.js'), 'utf8');
  assert.match(src, /it\.actor\.natpfCardPose = null;\n    it\.fx\?\.group\.removeFromParent\(\);/);
  assert.match(src, /if \(it\.move\) a\.root\.traverse\(o => \{ if \(o\.isSkinnedMesh && o\.visible\) o\.skeleton\.update\(\); \}\);/);
  assert.match(src, /\(it\.move\?\.camUp \?\? 0\.08\)\*f\.dist/);
  assert.match(src, /if \(moves\) this\._prepareMoves\(items\);/);
  // natpf_character usa la posa della card solo se il movimento ce l'ha (interruttore acceso, natpf_ritratti)
  const chr = fs.readFileSync(path.join(ROOT, 'src/natpf/natpf_character.js'), 'utf8');
  assert.match(chr, /const card = actor\.natpfCardPose;\n      if \(card\?\.move\?\.mascot\)/);
  // niente oggetti nuovi per fotogramma nelle funzioni della posa (le pose descritte nascono in natpf_card_moves)
  const rig = fs.readFileSync(path.join(ROOT, 'src/natpf/natpf_mascot_rig.js'), 'utf8');
  for (const name of ['poseMascotCard', 'cardArm', 'handFrame', 'solveCardArm', 'placeRacket', 'holdRacket', 'restRacket', 'leaveCardPose']){
    const at = rig.indexOf(`function ${name}(`); assert.ok(at > 0, name);
    const body = rig.slice(at, rig.indexOf('\n}\n', at));
    assert.ok(!/\bnew\s+[A-Z]|\.clone\(|\[\s*\]|=>\s*\{|\{\s*[a-z]+:/.test(body), `${name} crea oggetti`);
  }
  assert.equal(MASCOT_SCALE, 1.6); assert.equal(HAND_CENTER.length, 3);
});
