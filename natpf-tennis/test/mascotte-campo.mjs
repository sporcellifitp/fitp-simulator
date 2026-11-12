// B29 · Aiuto per le prove senza browser: attori montati come nel motore (game_engine._preparePlayerActor), un «motore»
// con i quattro attori che fa un passo di animazione e poi il lavoro di prima del disegno, e i modelli veri delle
// mascotte messi in gioco senza GLTFLoader.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { setCast, resetCast } from '../src/natpf/natpf_personaggi.js';
import { labelCanvas } from '../src/natpf/natpf_lob_drop.js';
import { createNatpfCharacter, createNatpfRacket, finishNatpfActor, updateNatpfCharacters } from '../src/natpf/natpf_character.js';
import { setupArticulatedPlayerRig, updatePlayerBodyAnimation } from '../src/player_body_animation.js';
import { PlayerFacialFXController } from '../src/player_facial_fx.js';
import { RacketKinematicsController } from '../src/racket_kinematics.js';
import { upgradePlayerCharacterMaterials, upgradeRacketMaterials } from '../src/player_materials.js';
import { setMascotMode, adoptMascotModel, resetMascotModels } from '../src/natpf/natpf_mascot_models.js';
import { buildMascotScene } from './mascotte-glb.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FILE = { drop: path.join(ROOT, 'public/media/mascotte-drop.glb'), lob: path.join(ROOT, 'public/media/mascotte-lob.glb') };
export const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } }; };
labelCanvas.make = () => ({ width: 0, height: 0, getContext: () => ({ clearRect(){}, fillText(){} }) });

// Come game_engine._preparePlayerActor (e come test/natpf-lob-drop.test.mjs)
const PART_RE = { head: /^head(\.?0*\d+)?$/i, torso: /^torso(\.?0*\d+)?$/i, handL: /^hand_l(\.?0*\d+)?$/i, handR: /^hand_r(\.?0*\d+)?$/i, footL: /^foot_l(\.?0*\d+)?$/i, footR: /^foot_r(\.?0*\d+)?$/i };
export function mountActor(look = 'p1', { role = 'player', sideSign = 1 } = {}){
  const scene = new THREE.Scene();
  const actor = { role, sideSign, root: new THREE.Group(), model: null, parts: {}, racketPivot: new THREE.Group(), pos: new THREE.Vector3(0, 0, sideSign*11.89),
    vel: new THREE.Vector3(), targetPos: new THREE.Vector3(), stridePhase: 0, swingTimer: 0, swingDuration: .34, swingType: 'forehand', maxSpeed: 9 };
  const model = createNatpfCharacter(look);
  actor.model = model;
  model.traverse(s => {
    s.userData.basePos = s.position.clone(); s.userData.baseRot = s.rotation.clone();
    const n = (s.name || '').trim();
    for (const [k, re] of Object.entries(PART_RE)) if (re.test(n) && (!actor.parts[k] || !s.isMesh)){ actor.parts[k] = s; break; }
  });
  model.scale.setScalar(1.16);
  actor.root.add(model);
  upgradePlayerCharacterMaterials(actor, sideSign > 0 ? 'p1' : 'p2');
  new PlayerFacialFXController(scene).attachFacialRig(actor);
  setupArticulatedPlayerRig(actor);
  const racket = createNatpfRacket();
  upgradeRacketMaterials(racket);
  racket.scale.setScalar(1.22);
  actor.racketMesh = racket;
  actor.racketPivot.position.set(-.36, .9, .16);
  actor.racketPivot.add(racket);
  actor.root.add(actor.racketPivot);
  actor.root.rotation.y = sideSign > 0 ? Math.PI : 0;
  actor.root.position.copy(actor.pos);
  scene.add(actor.root);
  const rk = new RacketKinematicsController();
  rk.initActor(actor);
  finishNatpfActor(actor);
  return { actor, scene, rk };
}
// Un «motore» con i quattro attori; i compagni del doppio sono nascosti come nel singolo
export function engineOf(){
  const P = mountActor('p1'), O = mountActor('cpu', { role: 'opponent', sideSign: -1 }), PP = mountActor('p1', { role: 'player_partner' }), OP = mountActor('cpu', { role: 'opponent_partner', sideSign: -1 });
  PP.actor.root.visible = false; OP.actor.root.visible = false;
  const E = { isMultiplayer: false, elapsedTime: 0, ball: null, player: P.actor, opponent: O.actor, playerPartner: PP.actor, opponentPartner: OP.actor, fpBodyActor: null };
  const ctx = { phase: 'RALLY', score: { server: 'player' }, ball: null, elapsedTime: 0 };
  // un passo: animazioni del motore, poi il lavoro di prima del disegno
  E.step = (dt = 1/60, extra = null) => {
    E.elapsedTime += dt; ctx.elapsedTime = E.elapsedTime; Object.assign(ctx, extra || {});
    for (const m of [P, O]){ m.rk.update(m.actor, dt, ctx); updatePlayerBodyAnimation(m.actor, dt, ctx); }
    updateNatpfCharacters(E);
  };
  E.rk = { player: P.rk, opponent: O.rk };
  return E;
}
export const swing = (E, who, type) => {
  const a = E[who]; a.swingType = type; a.swingDuration = a.swingTimer = type === 'serve' ? .38 : .36;
  E.rk[who].triggerSwing(a, type === 'serve' ? { shotType: 'serve', side: 'overhead', speed: 1.2, timing: 'sweet', isServe: true, dirX: 0 }
    : type === 'smash' ? { shotType: 'smash', side: 'overhead', speed: 1.2, timing: 'sweet', dirX: 0 } : { shotType: 'topspin', side: type, speed: 1.1, timing: 'sweet', dirX: 0 });
};
export const world = o => o.getWorldPosition(new THREE.Vector3());
export const seen = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
// Mette in gioco i due modelli veri (senza browser: senza texture) e sceglie «Lob & Drop»
export function useModels(){
  resetMascotModels(); setMascotMode('3d'); resetCast(); setCast('lobdrop', { storage: mem() });
  for (const key of ['drop', 'lob']) adoptMascotModel(key, buildMascotScene(FILE[key]).scene);
}
