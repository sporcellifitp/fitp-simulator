// B29 · Lob & Drop dai modelli 3D: file alleggeriti, tabella delle ossa, mano della racchetta per destri e mancini,
// ripiego sulle mascotte nel codice, parametro ?mascotte=, scala, forma della testa, piedi sul campo, niente scatti,
// niente allocazioni per fotogramma. node --import ./test/register.mjs --test test/natpf-mascotte-3d.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { setCast, resetCast } from '../src/natpf/natpf_personaggi.js';
import { labelCanvas } from '../src/natpf/natpf_lob_drop.js';
import { createNatpfCharacter, createNatpfRacket, finishNatpfActor, updateNatpfCharacters } from '../src/natpf/natpf_character.js';
import { setupArticulatedPlayerRig, updatePlayerBodyAnimation, triggerPointReaction } from '../src/player_body_animation.js';
import { PlayerFacialFXController } from '../src/player_facial_fx.js';
import { RacketKinematicsController } from '../src/racket_kinematics.js';
import { upgradePlayerCharacterMaterials, upgradeRacketMaterials } from '../src/player_materials.js';
import { racketInHead } from '../src/natpf/natpf_racket_clear.js';
import {
  MASCOT_MODE_PARAM, MASCOT_MODES, MASCOT_MODEL_FILES, MASCOT_LOOK, mascotModeFromSearch, getMascotMode, setMascotMode, mascotMaterial,
  loadMascotModel, adoptMascotModel, resetMascotModels, mascotModelStatus, mascotModelError, mascotModelInstance,
} from '../src/natpf/natpf_mascot_models.js';
import {
  MASCOT_BONES, RIG_TABLE, MASCOT_SCALE, ENGINE_REST, MASCOT_HEAD_SHAPE, GRIP_LOCAL, FREE_HAND_REST, ARM_MAX_STRETCH,
  racketSide, racketHandBone, mascotModelHeadShape, createMascotRig, poseMascotBody, poseMascotArms, mascotRigProbe,
} from '../src/natpf/natpf_mascot_rig.js';
import { readGlb, accessor, buildMascotScene, skinnedVertices } from './mascotte-glb.mjs';
import { FILE, mem, mountActor, engineOf, swing, world, seen, useModels } from './mascotte-campo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quiet = fn => { const w = console.warn, lines = []; console.warn = (...a) => lines.push(a.join(' ')); try { return [fn(), lines]; } finally { console.warn = w; } };
test.after(() => { resetMascotModels(); setMascotMode(null); resetCast(); });

test('file dei modelli: leggeri, senza tangenti né clip, attributi compatti, 24 ossa con i nomi attesi, alti 1', () => {
  let total = 0;
  for (const key of ['drop', 'lob']){
    assert.equal(MASCOT_MODEL_FILES[key], `./media/mascotte-${key}.glb`);
    const glb = readGlb(FILE[key]), j = glb.json;
    total += glb.bytes;
    assert.ok(glb.bytes <= 400_000, `${key}: ${glb.bytes} byte, al più 0,4 MB`);
    assert.equal(j.animations, undefined, 'niente clip');
    const prim = j.meshes[0].primitives[0];
    assert.deepEqual(Object.keys(prim.attributes).sort(), ['JOINTS_0', 'NORMAL', 'POSITION', 'TEXCOORD_0', 'WEIGHTS_0'], 'niente tangenti');
    // solo estensioni che three.js legge senza un decodificatore
    assert.deepEqual([...j.extensionsRequired].sort(), ['EXT_texture_webp', 'KHR_mesh_quantization']);
    assert.ok(!JSON.stringify(j).match(/draco|meshopt/i));
    assert.equal(j.accessors[prim.attributes.POSITION].componentType, 5122); assert.equal(j.accessors[prim.attributes.NORMAL].componentType, 5120);
    assert.equal(j.accessors[prim.attributes.WEIGHTS_0].componentType, 5121); assert.equal(j.bufferViews[0].byteStride, 24);
    assert.equal(j.images.length, 1); assert.equal(j.images[0].mimeType, 'image/webp');
    assert.ok(j.bufferViews[j.images[0].bufferView].byteLength < 120_000, 'texture sotto i 120 kB');
    assert.deepEqual(j.skins[0].joints.map(i => j.nodes[i].name).sort(), [...MASCOT_BONES].sort());
    assert.equal(j.nodes.find(n => n.name === 'Armature').scale, undefined, 'scheletro in metri');
    const tri = j.accessors[prim.indices].count/3;
    assert.ok(tri > 7500 && tri < 9000, `${tri} triangoli`);
    // la pelle a riposo è alta 1 e ha i piedi a terra
    const M = buildMascotScene(FILE[key]), ys = skinnedVertices(M.mesh).map(v => v.y);
    assert.ok(Math.abs(Math.min(...ys)) < 0.002 && Math.abs(Math.max(...ys) - 1) < 0.002, `${key}: da ${Math.min(...ys)} a ${Math.max(...ys)}`);
    // pesi: somma 255 per ogni vertice
    const w = accessor(glb, prim.attributes.WEIGHTS_0).array;
    for (let i = 0; i < w.length; i += 4) assert.equal(w[i] + w[i + 1] + w[i + 2] + w[i + 3], 255);
  }
  assert.ok(total <= 800_000, `i due modelli insieme: ${total} byte`);
});

test('tabella «parte del tennista → osso», lato e mano della racchetta, scala, riposo del motore', () => {
  assert.equal(MASCOT_BONES.length, 24);
  assert.deepEqual(Object.keys(RIG_TABLE), ['torso', 'head', 'handRacket', 'handFree', 'footRacketSide', 'footFreeSide']);
  for (const row of Object.values(RIG_TABLE)) for (const b of row.bones) for (const side of ['Left', 'Right'])
    assert.ok(MASCOT_BONES.includes(b.replace('Lato', side)), `osso ${b}`);
  assert.deepEqual([...RIG_TABLE.torso.bones], ['Hips']); assert.ok(RIG_TABLE.head.bones.includes('Head'));
  assert.equal(racketSide(false), 'Right'); assert.equal(racketSide(true), 'Left');
  assert.equal(racketHandBone(false), 'RightHand'); assert.equal(racketHandBone(true), 'LeftHand');
  // scala: più bassa del tennista (1,91 m) perché la testa è metà del pupazzo; larga in campo come le mascotte nel codice
  assert.ok(MASCOT_SCALE >= 1.5 && MASCOT_SCALE <= 1.75, `scala ${MASCOT_SCALE}`);
  // il riposo delle parti scritto nel rig è quello vero del motore
  const { actor } = mountActor('p1');
  actor.root.updateMatrixWorld(true);
  const inv = actor.root.matrixWorld.clone().invert(), at = o => world(o).applyMatrix4(inv).toArray();
  const near = (a, b, what) => a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < 2e-3, `${what}: ${a} invece di ${b}`));
  near(at(actor.parts.torso), ENGINE_REST.torso, 'busto'); near(at(actor.parts.head), ENGINE_REST.head, 'testa');
  near(at(actor.parts.footL), ENGINE_REST.footA, 'piede dal lato della racchetta'); near(at(actor.parts.footR), ENGINE_REST.footB, 'altro piede');
  near(at(actor.parts.handL), ENGINE_REST.handFree, 'mano libera');
  assert.ok(at(actor.parts.handR)[0] < 0, 'nel motore la mano della racchetta sta a x < 0');
});

test('parametro ?mascotte=3d|codice: di base 3d, valori sconosciuti ignorati', () => {
  assert.equal(MASCOT_MODE_PARAM, 'mascotte'); assert.deepEqual([...MASCOT_MODES], ['3d', 'codice']);
  assert.equal(mascotModeFromSearch(''), '3d'); assert.equal(mascotModeFromSearch('?mascotte=3d'), '3d');
  assert.equal(mascotModeFromSearch('?personaggi=lobdrop&mascotte=codice'), 'codice'); assert.equal(mascotModeFromSearch('?mascotte=CODICE'), 'codice');
  assert.equal(mascotModeFromSearch('?mascotte=boh'), '3d'); assert.equal(mascotModeFromSearch(null), '3d');
  assert.equal(setMascotMode('codice'), 'codice'); assert.equal(getMascotMode(), 'codice');
  assert.equal(setMascotMode(null), '3d');
});

test('materiale semplice: luce diffusa, niente riflessi, bordo di luce più deciso per Drop', () => {
  const tex = new THREE.Texture(), m = mascotMaterial('drop', tex);
  assert.ok(m.isMeshLambertMaterial); assert.equal(m.map, tex); assert.equal(m.emissiveMap, tex);
  assert.ok(m.emissiveIntensity > 0.1 && m.emissiveIntensity < 0.5);
  assert.ok(MASCOT_LOOK.drop.rim > MASCOT_LOOK.lob.rim, 'Drop è blu su un campo blu: bordo più deciso');
  assert.equal(m.userData.natpfRim.value, MASCOT_LOOK.drop.rim);
  const shader = { uniforms: {}, fragmentShader: '#include <common>\nvoid main(){\n#include <opaque_fragment>\n}' };
  m.onBeforeCompile(shader);
  assert.equal(shader.uniforms.natpfRimK, m.userData.natpfRim); assert.match(shader.fragmentShader, /natpfRimK/);
});

test('ripiego: con «Classici» e con ?mascotte=codice non si carica niente; se il file manca restano le mascotte nel codice, con una riga sola nella console', async () => {
  const hidden3d = a => !a.natpfMascot3dOn && seen(a.model) && seen(a.natpfLimbs.container);
  // «Classici»: nessuna richiesta
  resetMascotModels(); setMascotMode('3d'); resetCast(); setCast('sempre', { storage: mem() });
  let E = engineOf(); E.step(); E.step();
  assert.equal(mascotModelStatus('drop'), 'idle'); assert.equal(mascotModelStatus('lob'), 'idle');
  assert.equal(E.player.natpfMascot3d, undefined); assert.ok(hidden3d(E.player));
  // «Lob & Drop» ma ?mascotte=codice: nessuna richiesta, mascotte costruite nel codice
  setMascotMode('codice'); setCast('lobdrop', { storage: mem() });
  E.step();
  assert.equal(E.player.natpfMascot, 'drop'); assert.equal(mascotModelStatus('drop'), 'idle'); assert.ok(hidden3d(E.player));
  // file mancante: il caricamento fallisce senza errori, una riga nella console, in campo la mascotte nel codice
  setMascotMode('3d');
  let asked = 0;
  const broken = { load(url, ok, progress, fail){ asked++; setTimeout(() => fail(new Error('404')), 0); } };
  const [okDrop, lines] = await (async () => { const w = console.warn, out = []; console.warn = (...a) => out.push(a.join(' ')); try { return [await loadMascotModel('drop', { loader: broken }), out]; } finally { console.warn = w; } })();
  assert.equal(okDrop, false); assert.equal(mascotModelStatus('drop'), 'failed'); assert.match(mascotModelError('drop'), /404/);
  assert.equal(lines.length, 1); assert.match(lines[0], /Drop.*mascotte costruita nel codice/);
  assert.equal(await loadMascotModel('drop', { loader: broken }), false); assert.equal(asked, 1, 'non si riprova a ogni fotogramma');
  assert.equal(mascotModelInstance('drop'), null);
  // un caricatore che lancia un errore o un file senza mesh: stesso ripiego
  const [okLob] = await (async () => { const w = console.warn; console.warn = () => {}; try { return [await loadMascotModel('lob', { loader: { load(u, ok){ ok({ scene: new THREE.Group() }); } } })]; } finally { console.warn = w; } })();
  assert.equal(okLob, false); assert.equal(mascotModelStatus('lob'), 'failed');
  for (let i = 0; i < 5; i++) E.step();
  for (const a of [E.player, E.opponent]){ assert.ok(a.natpfMascot); assert.ok(hidden3d(a), 'resta la mascotte costruita nel codice'); assert.ok(a.natpfHeadShape); }
});

test('con i modelli pronti: in campo c\'è il modello, i pezzi nel codice sono nascosti; tornando a «Classici» torna il tennista', () => {
  useModels();
  const E = engineOf();
  E.step();
  for (const [who, key] of [['player', 'drop'], ['opponent', 'lob']]){
    const a = E[who], rig = a.natpfMascot3d;
    assert.equal(a.natpfMascot, key); assert.equal(a.natpfMascot3dOn, true); assert.equal(rig.key, key);
    assert.equal(rig.group.parent, a.root); assert.equal(rig.scale, MASCOT_SCALE);
    assert.ok(!seen(a.model) && !seen(a.natpfLimbs.container), 'pezzi costruiti nel codice nascosti');
    assert.ok(seen(a.racketMesh), 'la racchetta resta');
    let mesh = null; rig.group.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
    assert.ok(mesh && seen(mesh) && mesh.castShadow && !mesh.frustumCulled); assert.ok(mesh.material.isMeshLambertMaterial);
    // ogni attore ha lo scheletro suo, geometria e materiale in comune
    assert.equal(Object.keys(rig.bones).length, 24);
  }
  let mp = null, mo = null; E.player.natpfMascot3d.group.traverse(o => { if (o.isSkinnedMesh) mp = o; }); E.opponent.natpfMascot3d.group.traverse(o => { if (o.isSkinnedMesh) mo = o; });
  assert.notEqual(mp.skeleton, mo.skeleton);
  // compagni del doppio nascosti: niente modello montato
  assert.equal(E.playerPartner.natpfMascot3d, undefined);
  // doppio: anche i compagni, con una copia loro (stessa geometria, scheletro diverso)
  E.playerPartner.root.visible = true; E.step();
  let mpp = null; E.playerPartner.natpfMascot3d.group.traverse(o => { if (o.isSkinnedMesh) mpp = o; });
  assert.equal(mpp.geometry, mp.geometry); assert.equal(mpp.material, mp.material); assert.notEqual(mpp.skeleton, mp.skeleton);
  // prima persona: del corpo si vedono solo avambracci, mani e racchetta → la mascotte costruita nel codice
  E.fpBodyActor = E.player; E.step();
  assert.equal(E.player.natpfMascot3dOn, false); assert.ok(!seen(E.player.natpfMascot3d.group) && seen(E.player.model));
  E.fpBodyActor = null; E.step();
  assert.equal(E.player.natpfMascot3dOn, true);
  // ?mascotte=codice a partita in corso (prove): tornano i pezzi nel codice
  setMascotMode('codice'); E.step();
  assert.ok(!seen(E.player.natpfMascot3d.group) && seen(E.player.model) && seen(E.player.natpfLimbs.container));
  setMascotMode('3d'); E.step(); assert.ok(seen(E.player.natpfMascot3d.group));
  // «Classici»: il modello sparisce, il tennista torna com'era
  setCast('sempre', { storage: mem() }); E.step();
  for (const a of [E.player, E.opponent]){ assert.equal(a.natpfMascot, null); assert.ok(!seen(a.natpfMascot3d.group) && seen(a.model) && seen(a.natpfLimbs.container)); assert.equal(a.natpfMascot3dOn, false); }
});

// Palmo della mano della racchetta contro la mano del tennista (dove sta il manico), per tutta un'animazione
function gripError(E, who, frames, each = null){
  const a = E[who], probe = {};
  let worst = 0, stretch = 0;
  for (let i = 0; i < frames; i++){
    E.step();
    mascotRigProbe(a.natpfMascot3d, a, probe);
    worst = Math.max(worst, probe.palmA.distanceTo(world(a.parts.handR)));
    stretch = Math.max(stretch, probe.stretchA);
    each?.(i, probe);
  }
  return { worst, stretch, bone: probe.racketHandBone };
}

test('racchetta nella mano giusta: RightHand per i destri, LeftHand per i mancini; il palmo sta sul manico in attesa, corsa, dritto, rovescio, servizio, schiacciata, esultanza', () => {
  for (const lefty of [false, true]){
    useModels();
    const E = engineOf();
    if (lefty) for (const a of [E.player, E.opponent]) a.root.scale.x = -1;        // come natpf_hand: radice specchiata
    for (const who of ['player', 'opponent']){
      const moves = { attesa: () => {}, corsa: () => E[who].vel.set(5, 0, 2), dritto: () => swing(E, who, 'forehand'), rovescio: () => swing(E, who, 'backhand'),
        servizio: () => swing(E, who, 'serve'), schiacciata: () => swing(E, who, 'smash'), esultanza: () => triggerPointReaction(E[who], 'win') };
      for (const [name, start] of Object.entries(moves)){
        for (let i = 0; i < 20; i++) E.step();
        E[who].vel.set(0, 0, 0); start();
        const r = gripError(E, who, name === 'esultanza' ? 90 : 45);
        assert.equal(r.bone, lefty ? 'LeftHand' : 'RightHand', `${who} ${name}`);
        assert.ok(r.worst < 0.03, `${who} ${lefty ? 'mancino' : 'destro'} ${name}: palmo a ${r.worst.toFixed(3)} m dal manico`);
        assert.ok(r.stretch < ARM_MAX_STRETCH, `${name}: braccio allungato ${r.stretch.toFixed(2)} volte`);
      }
      // il modello non è specchiato (le scritte restano leggibili): la sua sinistra resta la sinistra del personaggio
      const rig = E[who].natpfMascot3d;
      rig.group.updateMatrixWorld(true);
      assert.ok(rig.group.matrixWorld.determinant() > 0, 'modello non specchiato');
      assert.equal(rig.mirrored, lefty);
      // la mano della racchetta sta dal lato della racchetta
      const hand = world(rig.bones[racketHandBone(lefty)]), other = world(rig.bones[racketHandBone(!lefty)]), racket = world(E[who].racketMesh);
      assert.ok(hand.distanceTo(racket) < other.distanceTo(racket));
    }
  }
});

test('piedi sul campo: a riposo, in corsa, nei colpi e nell\'esultanza nessun punto del modello scende sotto il campo', () => {
  useModels();
  const E = engineOf();
  const lowest = a => { let mesh = null; a.natpfMascot3d.group.traverse(o => { if (o.isSkinnedMesh) mesh = o; }); return Math.min(...skinnedVertices(mesh).map(v => v.y)); };
  for (let i = 0; i < 30; i++) E.step();
  for (const who of ['player', 'opponent']){
    const a = E[who], y0 = lowest(a);
    assert.ok(y0 > -0.012 && y0 < 0.03, `${who} fermo: punto più basso a ${y0.toFixed(3)} m`);
    const probe = mascotRigProbe(a.natpfMascot3d, a);
    assert.ok(Math.abs(probe.soleA.y) < 0.03 && Math.abs(probe.soleB.y) < 0.03, 'piante a terra');
    assert.ok(Math.abs(probe.soleA.x - probe.soleB.x) + Math.abs(probe.soleA.z - probe.soleB.z) > 0.25, 'gambe non incrociate');
  }
  const a = E.player;
  let min = Infinity, lift = 0;
  a.vel.set(5, 0, 2);
  for (let i = 0; i < 40; i++){ E.step(); if (i % 4 === 0) min = Math.min(min, lowest(a)); const p = mascotRigProbe(a.natpfMascot3d, a); lift = Math.max(lift, p.soleA.y, p.soleB.y); }
  assert.ok(min > -0.02, `in corsa: ${min.toFixed(3)} m`); assert.ok(lift > 0.02, 'in corsa i piedi si alzano');
  a.vel.set(0, 0, 0);
  for (const start of [() => swing(E, 'player', 'forehand'), () => swing(E, 'player', 'serve'), () => triggerPointReaction(a, 'win'), () => triggerPointReaction(a, 'loss')]){
    for (let i = 0; i < 20; i++) E.step();
    start(); min = Infinity;
    for (let i = 0; i < 60; i++){ E.step(); if (i % 5 === 0) min = Math.min(min, lowest(a)); }
    assert.ok(min > -0.02, `${min.toFixed(3)} m`);
  }
});

test('niente scatti: da un fotogramma all\'altro le ossa girano poco e la mano libera non salta, anche tra un\'animazione e l\'altra', () => {
  for (const lefty of [false, true]){
    useModels();
    const E = engineOf(), a = E.player;
    if (lefty) a.root.scale.x = -1;
    for (let i = 0; i < 30; i++) E.step();
    const rig = a.natpfMascot3d, names = ['Hips', 'Spine02', 'Head', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftLeg', 'RightLeg'];
    const prev = Object.fromEntries(names.map(n => [n, rig.bones[n].quaternion.clone()])), probe = {};
    let last = mascotRigProbe(rig, a, probe).palmB.clone(), lastRacket = world(a.parts.handR);
    let worstTurn = 0, worstFree = 0, which = '';
    const script = [[0, () => { a.vel.set(5, 0, 1); }], [25, () => { a.vel.set(0, 0, 0); swing(E, 'player', 'forehand'); }], [60, () => swing(E, 'player', 'backhand')], [95, () => swing(E, 'player', 'serve')],
      [130, () => swing(E, 'player', 'smash')], [165, () => triggerPointReaction(a, 'win')], [260, () => triggerPointReaction(a, 'loss')], [330, () => { a.vel.set(-5, 0, -2); }]];
    for (let f = 0; f < 380; f++){
      for (const [at, fn] of script) if (at === f) fn();
      E.step();
      const racket = world(a.parts.handR), moved = racket.distanceTo(lastRacket); lastRacket = racket;
      const free = mascotRigProbe(rig, a, probe).palmB, freeMoved = free.distanceTo(last);
      worstFree = Math.max(worstFree, freeMoved); last = free.clone();
      for (const n of names){
        const turn = 2*Math.acos(Math.min(1, Math.abs(prev[n].dot(rig.bones[n].quaternion))))*180/Math.PI;
        // le braccia seguono le mani, che nei colpi vanno veloci: lì si misura rispetto a quanto si è mossa la mano
        // (quella della racchetta la muove il motore; quella libera la muove il rig, con il suo ritardo)
        const arm = n.includes('Arm'), racketArm = n.startsWith(lefty ? 'Left' : 'Right'), limit = arm ? 40 + (racketArm ? moved : freeMoved)*400 : 25;
        if (turn > limit && turn - limit > worstTurn){ worstTurn = turn - limit; which = `${n} al fotogramma ${f}: ${turn.toFixed(1)} gradi (mano ${(racketArm ? moved : freeMoved).toFixed(3)} m)`; }
        prev[n].copy(rig.bones[n].quaternion);
      }
    }
    assert.equal(worstTurn, 0, which);
    assert.ok(worstFree < 0.2, `mano libera: ${worstFree.toFixed(3)} m in un fotogramma`);
  }
});

test('forma della testa dichiarata a keepRacketClear: contiene la testa dei due modelli senza gonfiarla; nelle pose tenute la racchetta sta fuori', () => {
  for (const key of ['drop', 'lob']){
    const M = buildMascotScene(FILE[key]), shape = mascotModelHeadShape(key), list = Array.isArray(shape) ? shape : [shape], main = list[0];
    assert.equal(shape, MASCOT_HEAD_SHAPE[key]);
    const w = M.mesh.geometry.attributes.skinWeight, j = M.mesh.geometry.attributes.skinIndex, hi = M.mesh.skeleton.bones.indexOf(M.bones.Head);
    const headOnly = i => { let s = 0; for (let c = 0; c < 4; c++) if (j.getComponent(i, c) === hi) s += w.getComponent(i, c); return s > 0.9; };
    const inv = M.bones.Head.matrixWorld.clone().invert(), pts = skinnedVertices(M.mesh, headOnly).map(v => v.applyMatrix4(inv));
    assert.ok(pts.length > 2500);
    const inside = (p, s, k = 1) => ((p.x - (s.cx || 0))/(s.rx*k))**2 + ((p.y - (s.cy || 0))/(s.ry*k))**2 + ((p.z - (s.cz || 0))/(s.rz*k))**2 <= 1;
    const covered = pts.filter(p => list.some(s => inside(p, s, 1.06))).length/pts.length;
    assert.ok(covered > 0.97, `${key}: ${(covered*100).toFixed(1)}% dei punti della testa dentro la forma`);
    // non gonfiata: i semiassi stanno dentro il riquadro della testa
    const box = new THREE.Box3().setFromPoints(pts), half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    assert.ok(main.rx <= half.x*1.05 && main.ry <= half.y*1.05 && main.rz <= half.z*1.05, `${key}: forma più grande della testa`);
    assert.ok(main.rx > 0.2 && main.ry > 0.18 && main.rz > 0.2);
  }
  // attesa nello scambio (posa tenuta): dopo qualche fotogramma il telaio è fuori dalla testa del modello
  useModels();
  const E = engineOf();
  for (let i = 0; i < 90; i++) E.step();
  for (const who of ['player', 'opponent']){
    const a = E[who], rig = a.natpfMascot3d, shape = mascotModelHeadShape(rig.key), main = Array.isArray(shape) ? shape[0] : shape;
    assert.ok(racketInHead(a, main, rig.head.bone) >= 1, `${who}: telaio fuori dalla testa nell'attesa`);
  }
  // palla in arrivo vicino alle corde: la racchetta torna dove la mette il motore (l'impatto non cambia)
  const a = E.player, ball = { pos: world(a.racketMesh).add(new THREE.Vector3(0, .5, .3)), vel: new THREE.Vector3(0, 0, 12) };
  E.ball = ball;
  for (let i = 0; i < 30; i++) E.step();
  assert.ok(a.racketMesh.position.length() < 1e-6, 'con la palla sulle corde la racchetta non è scostata');
});

test('mano libera: bassa a riposo, fuori dalla testa quando il tennista la alza (lancio, esultanza)', () => {
  useModels();
  const E = engineOf(), a = E.player, rig = a.natpfMascot3d || (E.step(), a.natpfMascot3d);
  for (let i = 0; i < 40; i++) E.step();
  const probe = mascotRigProbe(rig, a);
  assert.ok(probe.palmB.y < world(a.parts.handL).y - 0.15, 'a riposo la mano libera sta più in basso di quella del tennista');
  assert.ok(FREE_HAND_REST[1] < 0.5);
  const shape = MASCOT_HEAD_SHAPE.drop[0];
  triggerPointReaction(a, 'win');
  let worst = Infinity;
  for (let i = 0; i < 90; i++){
    E.step();
    const p = mascotRigProbe(rig, a).palmB.applyMatrix4(rig.head.bone.matrixWorld.clone().invert());
    worst = Math.min(worst, Math.sqrt(((p.x - shape.cx)/shape.rx)**2 + ((p.y - shape.cy)/shape.ry)**2 + ((p.z - shape.cz)/shape.rz)**2));
  }
  assert.ok(worst > 1.02, `esultanza: palmo libero a ${worst.toFixed(2)} raggi dal centro della testa`);
});

test('mano libera nel dritto e nel rovescio: davanti al petto, mai davanti agli occhi', () => {
  for (const key of ['drop', 'lob']){
    useModels();
    const E = engineOf(), who = key === 'drop' ? 'player' : 'opponent', a = E[who];
    for (let i = 0; i < 40; i++) E.step();
    const rig = a.natpfMascot3d, shape = MASCOT_HEAD_SHAPE[key][0], inv = new THREE.Matrix4();
    for (const type of ['forehand', 'backhand']){
      for (let i = 0; i < 30; i++) E.step();
      swing(E, who, type);
      let face = 0;
      for (let i = 0; i < 50; i++){
        E.step();
        const p = mascotRigProbe(rig, a).palmB.applyMatrix4(inv.copy(rig.head.bone.matrixWorld).invert());
        // davanti alla faccia (in avanti e al centro) e più in alto di metà testa sotto il centro: la mano copre gli occhi
        if (p.z > shape.cz + 0.1 && Math.abs(p.x - shape.cx) < 0.9*shape.rx && p.y > shape.cy - 0.5*shape.ry) face++;
      }
      assert.equal(face, 0, `${key}, ${type}: ${face} fotogrammi con la mano libera davanti agli occhi`);
    }
  }
});

test('niente allocazioni per fotogramma nel rig: nelle funzioni di posa non nasce nessun oggetto', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/natpf/natpf_mascot_rig.js'), 'utf8');
  for (const name of ['readPart', 'poseMascotBody', 'poseLeg', 'poseMascotArms', 'poseArm', 'basis']){
    const at = src.indexOf(`function ${name}(`);
    assert.ok(at > 0, name);
    const body = src.slice(at, src.indexOf('\n}\n', at));
    assert.ok(!/\bnew\s+[A-Z]|\.clone\(|\[\s*\]|=>\s*\{|\{\s*[a-z]+:/.test(body), `${name} crea oggetti`);
  }
  // e i modelli si caricano solo da natpf_mascot_models.js, mai all'avvio
  const chr = fs.readFileSync(path.join(ROOT, 'src/natpf/natpf_character.js'), 'utf8');
  assert.match(chr, /status === 'idle'\) loadMascotModel\(key\)/);
  // stesse posizioni chiamando il rig a mano due volte: non dipende da uno stato nascosto
  useModels();
  const E = engineOf(), a = E.player; E.step();
  const rig = a.natpfMascot3d;
  poseMascotBody(rig, a); poseMascotArms(rig, a);
  const q0 = rig.bones.RightForeArm.quaternion.clone();
  poseMascotBody(rig, a); poseMascotArms(rig, a);
  assert.ok(q0.toArray().every((x, i) => Math.abs(x - rig.bones.RightForeArm.quaternion.toArray()[i]) < 1e-9));
  assert.equal(createMascotRig(new THREE.Group(), 'drop'), null, 'senza le ossa attese niente rig');
  assert.equal(GRIP_LOCAL.length, 3);
});
