// Personaggio procedurale NATPF: parti cercate dal motore, rig, viso, braccia e gambe, prima persona, varianti,
// racchetta, pallina e ritratti. node --import ./test/register.mjs --test test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import {
  createNatpfCharacter, createNatpfCast, createNatpfRacket, createNatpfBall, finishNatpfActor, updateNatpfActorLimbs,
  updateNatpfCharacters, applyNatpfLook, solveTwoBone, CHARACTER_LOOKS, PART_BASE, PART_NAMES, RACKET_POINTS, BALL_RADIUS,
} from '../src/natpf/natpf_character.js';
import { natpfPortraitSVG, getOpponentPortraitLook, portraitLookFor } from '../src/natpf/natpf_portrait.js';
import { getMiiAvatarSVG } from '../src/mii_avatars.js';
import { setupArticulatedMiiRig, updateMiiBodyAnimation, triggerPointReaction } from '../src/mii_body_animation.js';
import { MiiFacialFXController } from '../src/mii_facial_fx.js';
import { getRacketRimWorldPoints, RacketKinematicsController } from '../src/racket_kinematics.js';
import { upgradeMiiCharacterMaterials, upgradeRacketMaterials } from '../src/mii_model_overhaul.js';
import { setFirstPersonBody } from '../src/natpf/natpf_camera.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

// Come game_engine._prepareMiiActor: stesse espressioni regolari per le parti, stessa scala, stesso ordine
const PART_RE = { head: /^head(\.?0*\d+)?$/i, torso: /^torso(\.?0*\d+)?$/i, handL: /^hand_l(\.?0*\d+)?$/i, handR: /^hand_r(\.?0*\d+)?$/i, footL: /^foot_l(\.?0*\d+)?$/i, footR: /^foot_r(\.?0*\d+)?$/i };
function mountActor(look = 'p1', { role = 'player', sideSign = 1, kinematics = true } = {}){
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
  upgradeMiiCharacterMaterials(actor, sideSign > 0 ? 'p1' : 'p2');
  const facial = new MiiFacialFXController(scene);
  facial.attachFacialRig(actor);
  setupArticulatedMiiRig(actor);
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
  const rk = kinematics ? new RacketKinematicsController() : null;
  rk && rk.initActor(actor);
  finishNatpfActor(actor);
  return { actor, scene, facial, rk };
}
const world = o => o.getWorldPosition(new THREE.Vector3());
const step = ({ actor, rk }, dt = 1/60, extra = {}) => {
  const ctx = { phase: 'RALLY', score: { server: 'player' }, ball: null, elapsedTime: 0, ...extra };
  rk && rk.update(actor, dt, ctx);
  updateMiiBodyAnimation(actor, dt, ctx);
  updateNatpfActorLimbs(actor);
};

test('il personaggio espone le sei parti con i nomi e le posizioni che il motore si aspetta', () => {
  const model = createNatpfCharacter('p1');
  for (const name of PART_NAMES){
    const part = model.getObjectByName(name);
    assert.ok(part, `manca ${name}`);
    assert.ok(!part.isMesh, `${name} è un gruppo`);
    assert.deepEqual(part.position.toArray(), PART_BASE[name]);
  }
  // nessun altro nodo «ruba» il nome di una parte
  let matches = 0;
  model.traverse(o => { if (Object.values(PART_RE).some(re => re.test((o.name || '').trim()))) matches++; });
  assert.equal(matches, 6);
  const { actor } = mountActor('p1');
  for (const k of Object.keys(PART_RE)) assert.ok(actor.parts[k], `parte ${k}`);
  assert.ok(actor.rig?.initialized && actor.rig.hipPivot && actor.rig.handRPivot);
  // la mano destra del personaggio (x < 0, verso il campo è la sinistra di chi guarda da dietro) tiene la racchetta
  assert.ok(actor.rig.handRPivot.position.x < 0 && actor.rig.handLPivot.position.x > 0);
});

test('viso dinamico agganciato al centro della testa, occhi piccoli e scuri, bocca concentrata', () => {
  const { actor, facial } = mountActor('p1');
  const rig = actor.facialRig;
  assert.ok(rig?.faceGroup);
  near(rig.skullY, .18, 1e-3);                                       // centro dell'ellissoide della testa
  assert.equal(rig.leftEye.scleraMesh.scale.x < .8, true);
  assert.equal(rig.neutralMouth.children[1].visible, false);
  assert.equal(rig.leftBrow.children[0].material.color.getHex(), CHARACTER_LOOKS.p1.brow);
  // le espressioni continuano a funzionare
  for (const s of ['focused_squint', 'effort_shout', 'wide_eyed_panic', 'happy_grin', 'shocked_loss', 'neutral'])
    assert.equal(facial.setExpression(actor, s, .5), s);
  // capelli e testa non vengono deformati dal vecchio ritocco delle sopracciglia
  const hair = actor.model.getObjectByName('NatpfCapelli');
  assert.equal(hair.geometry, createNatpfCharacter('cpu').getObjectByName('NatpfCapelli').geometry);
});

test('braccia e gambe collegano spalle e mani, anche e piedi, anche durante corsa, swing, servizio e reazioni', () => {
  const ctx = mountActor('p1');
  const { actor } = ctx;
  const check = label => {
    actor.root.updateMatrixWorld(true);
    const L = actor.natpfLimbs;
    for (const a of L.arms){
      const fore = a.fore.group, upper = a.upper.group;
      // il gomito è dove finisce il braccio e comincia l'avambraccio
      const upperEnd = new THREE.Vector3(0, a.upper.body.scale.y, 0).applyMatrix4(upper.matrixWorld);
      assert.ok(upperEnd.distanceTo(world(fore)) < 1e-3, `${label}: gomito staccato`);
      // l'avambraccio arriva al polso, a pochi centimetri dal centro della mano
      const foreEnd = new THREE.Vector3(0, a.fore.body.scale.y, 0).applyMatrix4(fore.matrixWorld);
      const gap = foreEnd.distanceTo(world(a.hand));
      assert.ok(gap < .09, `${label}: mano staccata di ${gap.toFixed(3)}`);
      assert.ok(world(upper).distanceTo(world(a.shoulderAnchor)) < 1e-3, `${label}: spalla staccata`);
    }
    for (const l of L.legs){
      const shinEnd = new THREE.Vector3(0, l.shin.body.scale.y, 0).applyMatrix4(l.shin.group.matrixWorld);
      assert.ok(shinEnd.distanceTo(world(l.ankle)) < 1e-3, `${label}: piede staccato`);
      assert.ok(world(l.thigh.group).distanceTo(world(l.hipAnchor)) < 1e-3, `${label}: anca staccata`);
      // il ginocchio piega in avanti (verso +z del personaggio, che per P1 è -z nel mondo)
      const knee = world(l.shin.group), hip = world(l.thigh.group), ankle = world(l.ankle);
      const mid = hip.clone().lerp(ankle, .5);
      assert.ok((knee.z - mid.z)*-actor.sideSign >= -1e-3, `${label}: ginocchio all'indietro`);
    }
  };
  for (let i = 0; i < 30; i++) step(ctx);
  check('fermo');
  actor.vel.set(-7, 0, 1.5);
  for (let i = 0; i < 40; i++) step(ctx);
  check('corsa');
  actor.vel.set(0, 0, 0);
  ctx.rk.triggerSwing(actor, { shotType: 'topspin', side: 'forehand', speed: 1.3, timing: 'sweet' });
  for (let i = 0; i < 12; i++) step(ctx);
  check('dritto');
  ctx.rk.triggerSwing(actor, { shotType: 'slice', side: 'backhand', speed: 1.2, timing: 'sweet' });
  for (let i = 0; i < 12; i++) step(ctx);
  check('rovescio');
  ctx.rk.triggerSwing(actor, { shotType: 'smash', side: 'overhead', speed: 1.4, timing: 'sweet' });
  for (let i = 0; i < 12; i++) step(ctx);
  check('servizio/smash');
  for (let i = 0; i < 20; i++) step(ctx, 1/60, { phase: 'SERVE_TOSS', ball: { pos: new THREE.Vector3(0, 2.4, 11.6), vel: new THREE.Vector3(0, 1, 0) } });
  check('lancio');
  triggerPointReaction(actor, 'win');
  for (let i = 0; i < 30; i++) step(ctx, 1/60, { phase: 'POINT_OVER', lastPointWinner: 'player' });
  check('esultanza');
  triggerPointReaction(actor, 'loss');
  for (let i = 0; i < 30; i++) step(ctx, 1/60, { phase: 'POINT_OVER', lastPointWinner: 'opponent' });
  check('delusione');
});

test('IK a due ossa: lunghezze rispettate, piega verso il polo, allungamento limitato', () => {
  const S = new THREE.Vector3(0, 1, 0), T = new THREE.Vector3(0, .75, .1), J = new THREE.Vector3();
  solveTwoBone(S, T, .15, .15, new THREE.Vector3(0, 0, -1), J);
  near(S.distanceTo(J), .15, 1e-6); near(J.distanceTo(T), .15, 1e-6);
  assert.ok(J.z < .05, 'il gomito va verso il polo (dietro)');
  const far = new THREE.Vector3(0, 1.5, 0);
  solveTwoBone(S, far, .15, .15, new THREE.Vector3(0, 0, 1), J, 1.5);
  near(S.distanceTo(J), .225, 1e-6);                              // allungato al massimo del 50%
});

test('prima persona: restano avambracci, mani e racchetta; spariscono testa, busto, gambe e parte alta delle braccia', () => {
  const { actor } = mountActor('p1');
  setFirstPersonBody(actor, true);
  const visibleUp = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  for (const a of actor.natpfLimbs.arms){
    assert.equal(visibleUp(a.fore.group), true);
    assert.equal(visibleUp(a.upper.group), false);
    assert.equal(visibleUp(a.hand), true);
  }
  for (const l of actor.natpfLimbs.legs) assert.equal(visibleUp(l.thigh.group) || visibleUp(l.shin.group), false);
  assert.equal(visibleUp(actor.model.getObjectByName('NatpfTesta')), false);
  assert.equal(visibleUp(actor.model.getObjectByName('NatpfPolo')), false);
  assert.equal(visibleUp(actor.racketMesh.getObjectByName('NatpfTelaio')), true);
  setFirstPersonBody(actor, false);
  for (const a of actor.natpfLimbs.arms) assert.equal(visibleUp(a.upper.group), true);
  assert.equal(visibleUp(actor.model.getObjectByName('NatpfTesta')), true);
});

test('varianti P1, CPU e P2: geometrie e materiali condivisi, colori diversi, cambio a partita in corso', () => {
  const a = createNatpfCharacter('p1'), b = createNatpfCharacter('cpu'), c = createNatpfCharacter('p2'), d = createNatpfCharacter('p1');
  const polo = m => m.getObjectByName('NatpfPolo');
  assert.equal(polo(a).geometry, polo(b).geometry);
  assert.equal(polo(a).material, polo(d).material);                       // stesso colore, stesso materiale
  assert.equal(polo(b).material.color.getHex(), CHARACTER_LOOKS.cpu.polo);
  assert.equal(c.getObjectByName('NatpfFascia').material.color.getHex(), CHARACTER_LOOKS.p2.band);
  assert.equal(a.getObjectByName('NatpfTesta').material.name, 'natpf-Skin');
  // nessun nome del gioco di partenza nei nodi nuovi
  for (const m of [a, createNatpfRacket(), createNatpfBall()]) m.traverse(o => assert.doesNotMatch(o.name || '', /mii|argon/i));

  const engine = { isMultiplayer: false, player: mountActor('p1').actor, opponent: mountActor('cpu', { role: 'opponent', sideSign: -1 }).actor };
  updateNatpfCharacters(engine);
  assert.equal(engine.opponent.natpfLook, 'cpu');
  assert.equal(getOpponentPortraitLook(), 'cpu');
  engine.isMultiplayer = true;                                          // 1v1 tra persone: l'avversario è P2
  updateNatpfCharacters(engine);
  assert.equal(engine.opponent.natpfLook, 'p2');
  assert.equal(engine.player.natpfLook, 'p1');
  assert.equal(engine.opponent.model.getObjectByName('NatpfFascia').material.color.getHex(), CHARACTER_LOOKS.p2.band);
  const sock = engine.opponent.natpfLimbs.legs[0].shin.group.getObjectByName('NatpfCalzaDx');
  assert.equal(sock.material.color.getHex(), CHARACTER_LOOKS.p2.socks);
  assert.equal(getOpponentPortraitLook(), 'p2');
  assert.equal(portraitLookFor('opponent1'), 'p2');
  engine.isMultiplayer = false;
  updateNatpfCharacters(engine);
  assert.equal(engine.opponent.natpfLook, 'cpu');
  applyNatpfLook(engine.player, 'p1');
});

test('racchetta procedurale: stessi punti del piatto usati da colpi ed effetti, impugnata nella mano destra', () => {
  const racket = createNatpfRacket();
  const box = new THREE.Box3().setFromObject(racket);
  near(box.min.y, 0, .002);                                             // fondello all'origine
  near(box.max.y, RACKET_POINTS.center + RACKET_POINTS.headB + .0145, .003);
  assert.ok(box.max.y > .75 && box.max.y < .8 && Math.abs(box.max.x - .187) < .01 && Math.abs(box.max.z) < .03);
  const { actor } = mountActor('p1', { kinematics: false });
  actor.racketPivot.position.set(0, 0, 0); actor.racketPivot.rotation.set(0, 0, 0);
  actor.root.position.set(0, 0, 0); actor.root.rotation.set(0, 0, 0);
  const pts = getRacketRimWorldPoints(actor);
  near(pts.centerWorld.y, RACKET_POINTS.center*1.22, 1e-6);
  near(pts.tipWorld.y, RACKET_POINTS.tip*1.22, 1e-6);
  near(pts.throatWorld.y, RACKET_POINTS.throat*1.22, 1e-6);
  // il centro delle corde è davvero dentro l'ovale del telaio
  const frame = racket.getObjectByName('NatpfTelaio');
  frame.geometry.computeBoundingBox();
  near((frame.geometry.boundingBox.min.y + frame.geometry.boundingBox.max.y)/2, RACKET_POINTS.center, 1e-3);
  // materiali propri, non ritoccati dal vecchio aggiornamento delle racchette
  const m = frame.material;
  upgradeRacketMaterials(racket);
  assert.equal(frame.material, m);
  // la mano destra resta sul manico vicino al fondello
  const ctx = mountActor('p1');
  for (let i = 0; i < 20; i++) step(ctx);
  const grip = new THREE.Vector3(0, .08, 0).applyMatrix4(ctx.actor.racketMesh.matrixWorld);
  assert.ok(world(ctx.actor.parts.handR).distanceTo(grip) < .03);
});

test('pallina procedurale: raggio del modello precedente, feltro giallo-verde e cucitura chiara', () => {
  const ball = createNatpfBall();
  const felt = ball.getObjectByName('NatpfFeltro'), seam = ball.getObjectByName('NatpfCucitura');
  felt.geometry.computeBoundingSphere();
  near(felt.geometry.boundingSphere.radius, BALL_RADIUS, 1e-6);
  const c = felt.material.color; assert.ok(c.g > c.b && c.r > c.b);
  assert.ok(seam.material.color.getHSL({}).l > .8);
  const box = new THREE.Box3().setFromObject(ball);
  assert.ok(box.max.x < .075 && box.max.x > .064);
  assert.equal(createNatpfBall().children[0].geometry, felt.geometry);      // geometria condivisa
});

test('il cast di una partita costruisce attori validi anche per i compagni del doppio', () => {
  const cast = createNatpfCast();
  for (const k of ['player', 'playerPartner', 'opponent', 'opponentPartner']) for (const n of PART_NAMES) assert.ok(cast[k].getObjectByName(n));
  assert.equal(cast.opponentPartner.userData.natpfCharacter.look, 'cpu');
  const partner = mountActor('p1', { role: 'player_partner' });
  assert.ok(partner.actor.natpfLimbs.arms.length === 2 && partner.actor.natpfLimbs.legs.length === 2);
  // un attore nascosto (doppio disattivato) non viene ricalcolato
  partner.actor.root.visible = false;
  const before = partner.actor.natpfLimbs.arms[0].upper.group.position.clone();
  partner.actor.parts.handR.position.x += 1;
  updateNatpfActorLimbs(partner.actor);
  assert.ok(partner.actor.natpfLimbs.arms[0].upper.group.position.equals(before));
});

test('ritratti HUD: personaggio con fascia e capelli nei colori della variante, senza vecchi nomi', () => {
  for (const look of ['p1', 'cpu', 'p2']){
    const svg = natpfPortraitSVG(look, { uid: 't' });
    assert.match(svg, /^<svg[^>]+viewBox="0 0 120 120"/);
    assert.match(svg, /data-look="/);
    assert.doesNotMatch(svg, /mii|argon|ammaar/i);
  }
  assert.match(natpfPortraitSVG('p2'), /#ff3d8b/);
  const hud = getMiiAvatarSVG('mii-icon-player');
  assert.match(hud, /class="wii-mii-svg"/);                             // classe dei fogli di stile esistenti
  assert.match(hud, /data-look="p1"/);
  assert.doesNotMatch(hud, /Mii Portrait|Ammaar/);
});

test('niente più modelli di personaggi, racchetta e pallina da scaricare', () => {
  const dl = fs.readFileSync(path.join(ROOT, 'scripts/download-assets.mjs'), 'utf8');
  const engine = fs.readFileSync(path.join(ROOT, 'src/game_engine.js'), 'utf8');
  for (const f of ['mii_player.glb', 'mii_opponent.glb', 'tennis_racket.glb', 'tennis_ball.glb']){
    assert.ok(!dl.includes(f), `download-assets scarica ancora ${f}`);
    assert.ok(!engine.includes(f), `il motore carica ancora ${f}`);
  }
  // anche stadio, rete e pubblico del motore base non si caricano più: al loro posto c'è l'arena NATPF
  for (const f of ['stadium_court.glb', 'tennis_net.glb', 'mii_crowd.glb']) assert.ok(!engine.includes(f), `il motore carica ancora ${f}`);
});
