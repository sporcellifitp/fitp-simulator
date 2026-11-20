// B73 · Piedi delle mascotte 3D: gamba e piede sono un pezzo solo, e quando la gamba si inclina (corsa veloce in avanti,
// piedi larghi dei colpi) punta o tallone scendevano nel campo fino a 6 cm (FOOT_EDGE alzava il piede di metà del
// necessario). Ora il piede si alza quanto serve (natpf_mascot_rig.footRaise, punti del piede da soleSupport); il passo
// resta quello di prima. docs/b73/prove-rotte.md §1. node --import ./test/register.mjs --test test/natpf-b73-piedi.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { resetCast } from '../src/natpf/natpf_personaggi.js';
import { setMascotMode, resetMascotModels } from '../src/natpf/natpf_mascot_models.js';
import { FOOT_EDGE, LEG_TILT, SOLE_TILTS, createMascotRig, soleSupport, footRaise, mascotRigProbe } from '../src/natpf/natpf_mascot_rig.js';
import { buildMascotScene, skinnedVertices } from './mascotte-glb.mjs';
import { FILE, engineOf, swing, useModels } from './mascotte-campo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOWN = new THREE.Vector3(0, -1, 0);
test.after(() => { resetMascotModels(); setMascotMode(null); resetCast(); });

// vertici della pelle legati per almeno metà all'osso della gamba (gamba e piede), con le ossa di adesso
function legVertices(mesh, legName){
  const bi = mesh.skeleton.bones.findIndex(b => b.name === legName), si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
  const idx = [];
  for (let i = 0; i < si.count; i++){
    let w = 0;
    for (const [I, W] of [[si.getX(i), sw.getX(i)], [si.getY(i), sw.getY(i)], [si.getZ(i), sw.getZ(i)], [si.getW(i), sw.getW(i)]]) if (I === bi) w += W;
    if (w >= .5) idx.push(i);
  }
  return idx;
}

test('punti del piede (soleSupport): pochi, a riposo il più basso è a terra, ci sono in tutti e due i modelli e i due lati', () => {
  for (const key of ['drop', 'lob']){
    const M = buildMascotScene(FILE[key]), rig = createMascotRig(M.scene, key);
    for (const side of [rig.left, rig.right]){
      const S = side.support;
      assert.ok(S && S.pts.length >= 3*8 && S.pts.length <= 3*120, `${key} ${side.name}: ${S && S.pts.length/3} punti`);
      assert.ok(Math.abs(S.rest) < 0.004, `${key} ${side.name}: punto più basso a riposo a ${S.rest}`);
    }
  }
  // senza la pelle niente punti: resta la correzione di prima
  assert.equal(soleSupport(new THREE.Group(), new THREE.Matrix4(), 'LeftLeg', new THREE.Vector3()), null);
});

test('footRaise: con il piede a terra e la gamba inclinata fino a 40° in ogni verso il punto più basso vero del piede resta sul campo (al più 3 mm sotto il riposo) e lo tocca quando serve alzarlo; il piede alzato non cambia', () => {
  for (const key of ['drop', 'lob']){
    // vertici nel sistema del modello (prima di metterlo nel contenitore del rig, che lo scala)
    const M = buildMascotScene(FILE[key]);
    M.scene.updateMatrixWorld(true);
    const toModel = M.scene.matrixWorld.clone().invert(), V = skinnedVertices(M.mesh).map(p => p.applyMatrix4(toModel));
    const rig = createMascotRig(M.scene, key);
    for (const side of [rig.left, rig.right]){
      const c = new THREE.Vector3(side.leg.wp.x, 0, side.leg.wp.z), P = legVertices(M.mesh, `${side.name}Leg`).map(i => V[i].clone().sub(c));
      const rest = Math.min(...P.map(p => p.y));
      let worstBelow = 0, worstOver = 0, oldBelow = 0;
      for (const deg of [5, 12, 20, 28, 36, 40]) for (let a = 0; a < 360; a += 10){
        const t = deg*Math.PI/180, az = a*Math.PI/180, d = new THREE.Vector3(Math.sin(t)*Math.cos(az), -Math.cos(t), Math.sin(t)*Math.sin(az));
        const q = new THREE.Quaternion().setFromUnitVectors(DOWN, d), w = new THREE.Vector3(0, 1, 0).applyQuaternion(q.clone().invert());
        const low = Math.min(...P.map(p => p.dot(w)));                 // quota del punto più basso rispetto al centro della pianta
        side.foot.set(c.x, 0, c.z);
        const r = footRaise(side, q), edge = FOOT_EDGE*Math.hypot(d.x, d.z);
        worstBelow = Math.max(worstBelow, rest - (r + low));
        if (r > edge + 1e-9) worstOver = Math.max(worstOver, r + low - rest);   // alzato più di prima: tocca il campo
        oldBelow = Math.max(oldBelow, rest - (edge + low));
        // piede alzato del passo (14 cm in campo): con il punto più basso sopra il campo l'alzata è quella di prima
        side.foot.y = 0.14/rig.scale;
        if (side.foot.y + edge + low > rest + 1e-9) assert.ok(Math.abs(footRaise(side, q) - edge) < 1e-9, `${key} ${side.name} ${deg}° ${a}°: piede alzato cambiato`);
      }
      assert.ok(worstBelow*rig.scale < 0.003, `${key} ${side.name}: sotto il campo di ${(worstBelow*rig.scale*100).toFixed(2)} cm`);
      assert.ok(worstOver*rig.scale < 0.006, `${key} ${side.name}: alzato ${(worstOver*rig.scale*100).toFixed(2)} cm più del necessario`);
      // prima: punta o tallone fino a 4–7 cm nel campo (con FOOT_EDGE da solo)
      assert.ok(oldBelow*rig.scale > 0.03, `${key} ${side.name}: con la correzione di prima ${(oldBelow*rig.scale*100).toFixed(1)} cm`);
    }
  }
  assert.ok(LEG_TILT > 0 && SOLE_TILTS.at(-1) >= 40);
});

test('in campo: corsa veloce in avanti e di lato, colpi in corsa, cambi di direzione: i piedi non entrano nel campo e il passo è alto come prima', () => {
  useModels();
  const inv = new THREE.Matrix4(), v = new THREE.Vector3();
  const lowest = (a, legs) => {
    let mesh = null; a.natpfMascot3d.group.traverse(o => { if (!mesh && o.isSkinnedMesh) mesh = o; });
    a.natpfMascot3d.group.updateMatrixWorld(true);
    return legs.map(L => { let m = 9; for (const i of L){ mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld).applyMatrix4(inv); m = Math.min(m, v.y); } return m; });
  };
  const run = (each, n) => {
    const E = engineOf(); for (let i = 0; i < 30; i++) E.step();
    const a = E.player; let mesh = null; a.natpfMascot3d.group.traverse(o => { if (!mesh && o.isSkinnedMesh) mesh = o; });
    const legs = ['RightLeg', 'LeftLeg'].map(n => legVertices(mesh, n));
    let min = 9, max = 0, center = 0;
    for (let i = 0; i < n; i++){
      each(E, a, i); E.step(1/60, { phase: 'RALLY' });
      a.root.updateMatrixWorld(true); inv.copy(a.root.matrixWorld).invert();
      const L = lowest(a, legs), pr = mascotRigProbe(a.natpfMascot3d, a);
      min = Math.min(min, ...L); max = Math.max(max, ...L); center = Math.max(center, pr.soleA.applyMatrix4(inv).y, pr.soleB.applyMatrix4(inv).y);
    }
    return { min, max, center };
  };
  const cases = {
    'corsa in avanti 9 m/s': run((E, a) => a.vel.set(0, 0, -9), 150),
    'corsa di lato 9 m/s': run((E, a) => a.vel.set(9, 0, 0), 150),
    'dritto in corsa in avanti 9 m/s': run((E, a, i) => { a.vel.set(0, 0, -9); if (i === 30) swing(E, 'player', 'forehand'); a.swingTimer = Math.max(0, a.swingTimer - 1/60); }, 75),
    'rovescio in corsa in avanti 9 m/s': run((E, a, i) => { a.vel.set(0, 0, -9); if (i === 30) swing(E, 'player', 'backhand'); a.swingTimer = Math.max(0, a.swingTimer - 1/60); }, 75),
    'cambi di direzione 9 m/s': run((E, a, i) => { const k = Math.floor(i/24) % 4; a.vel.set(k === 0 ? 9 : k === 2 ? -9 : 0, 0, k === 1 ? -9 : k === 3 ? 9 : 0); }, 192),
  };
  for (const [name, r] of Object.entries(cases)){
    // prima del B73 qui il punto più basso arrivava a 1–3 cm sotto il campo (nel browser, in partita, fino a 6 cm)
    assert.ok(r.min > -0.005, `${name}: punto più basso dei piedi ${(r.min*100).toFixed(1)} cm`);
    assert.ok(r.max > 0.05 && r.center < 0.23, `${name}: piede alzato al più ${(r.max*100).toFixed(1)} cm, centro della pianta ${(r.center*100).toFixed(1)} cm`);
  }
  // passo come prima (misurato prima del B73: 11,2 cm in avanti e 14,8 di lato, punto più basso del piede alzato)
  assert.ok(cases['corsa in avanti 9 m/s'].max > 0.1 && cases['corsa di lato 9 m/s'].max > 0.13, JSON.stringify(cases));
});

test('niente allocazioni per fotogramma: footRaise e legTo non creano oggetti', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/natpf/natpf_mascot_rig.js'), 'utf8');
  for (const name of ['footRaise', 'legTo']){
    const at = src.indexOf(`function ${name}(`);
    assert.ok(at > 0, name);
    const body = src.slice(at, src.indexOf('\n}\n', at));
    assert.ok(!/\bnew\s+[A-Z]|\.clone\(|\[\s*\]|=>\s*\{|\{\s*[a-z]+:/.test(body), `${name} crea oggetti`);
  }
});
