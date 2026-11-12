// B24 · Lob & Drop come personaggi in campo: opzione «Personaggi in campo» (natpf_personaggi.js), assegnazione dei
// personaggi nei vari modi, pezzi delle mascotte (natpf_lob_drop.js), stesso scheletro e stesse animazioni del tennista,
// mancini, prima persona, ritratti, ritorno a «Di sempre». node --import ./test/register.mjs --test test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import {
  CAST_KEY, CAST_PARAM, CASTS, CAST_LABEL, castFromSearch, readSavedCast, readCast, getCast, setCast, resetCast, onCastChange, castLooks, castToast,
} from '../src/natpf/natpf_personaggi.js';
import { MASCOT, MASCOT_COLORS, MASCOT_LIMBS, MASCOT_FACE_SCALE, mascotOf, applyMascot, updateMascotLabels, labelCanvas } from '../src/natpf/natpf_lob_drop.js';
import {
  createNatpfCharacter, createNatpfRacket, finishNatpfActor, updateNatpfActorLimbs, updateNatpfCharacters, applyNatpfLook, CHARACTER_LOOKS,
} from '../src/natpf/natpf_character.js';
import { natpfPortraitSVG, portraitLookFor, getOpponentPortraitLook, getPlayerPortraitLook, setPortraitLooks, setOpponentPortraitLook, onOpponentPortraitLook, PORTRAIT_LOOKS } from '../src/natpf/natpf_portrait.js';
import { getPlayerAvatarSVG } from '../src/player_avatars.js';
import { setupArticulatedPlayerRig, updatePlayerBodyAnimation, triggerPointReaction } from '../src/player_body_animation.js';
import { PlayerFacialFXController } from '../src/player_facial_fx.js';
import { getRacketRimWorldPoints, RacketKinematicsController } from '../src/racket_kinematics.js';
import { upgradePlayerCharacterMaterials, upgradeRacketMaterials } from '../src/player_materials.js';
import { setFirstPersonBody } from '../src/natpf/natpf_camera.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } }; };
// finta tela per la scritta DROP / LOB (128×32 disegnata al volo): nelle prove basta che esista
const drawn = [];
labelCanvas.make = () => ({ width: 0, height: 0, getContext: () => ({ clearRect(){}, fillText(t){ drawn.push(t); } }) });

// Come game_engine._preparePlayerActor (e come test/natpf-character.test.mjs)
const PART_RE = { head: /^head(\.?0*\d+)?$/i, torso: /^torso(\.?0*\d+)?$/i, handL: /^hand_l(\.?0*\d+)?$/i, handR: /^hand_r(\.?0*\d+)?$/i, footL: /^foot_l(\.?0*\d+)?$/i, footR: /^foot_r(\.?0*\d+)?$/i };
function mountActor(look = 'p1', { role = 'player', sideSign = 1 } = {}){
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
  const facial = new PlayerFacialFXController(scene);
  facial.attachFacialRig(actor);
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
  return { actor, scene, facial, rk };
}
const step = ({ actor, rk }, dt = 1/60, extra = {}) => {
  const ctx = { phase: 'RALLY', score: { server: 'player' }, ball: null, elapsedTime: 0, ...extra };
  rk.update(actor, dt, ctx); updatePlayerBodyAnimation(actor, dt, ctx); updateNatpfActorLimbs(actor);
};
const world = o => o.getWorldPosition(new THREE.Vector3());
const visibleUp = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const shown = actor => { const out = []; actor.root.traverse(o => { if (o.isMesh && visibleUp(o)) out.push(o.name); }); return out; };
const engineOf = (multi = false) => ({ isMultiplayer: multi, player: mountActor('p1').actor, opponent: mountActor('cpu', { role: 'opponent', sideSign: -1 }).actor,
  playerPartner: mountActor('p1', { role: 'player_partner' }).actor, opponentPartner: mountActor('cpu', { role: 'opponent_partner', sideSign: -1 }).actor });

test('opzione: di base «Di sempre», chiave natpf-tennis.personaggi, salvata, valori sconosciuti ignorati', () => {
  assert.equal(CAST_KEY, 'natpf-tennis.personaggi'); assert.equal(CAST_PARAM, 'personaggi');
  assert.deepEqual([...CASTS], ['sempre', 'lobdrop']);
  assert.equal(CAST_LABEL.sempre, 'Di sempre'); assert.equal(CAST_LABEL.lobdrop, 'Lob & Drop');
  const storage = mem();
  assert.equal(readSavedCast({ storage }), 'sempre'); assert.equal(readCast({ storage, search: '' }), 'sempre');
  storage.setItem(CAST_KEY, 'lobdrop'); assert.equal(readCast({ storage, search: '' }), 'lobdrop');
  storage.setItem(CAST_KEY, 'boh'); assert.equal(readCast({ storage, search: '' }), 'sempre');
  // memoria del browser che non risponde: «Di sempre», senza errori
  const broken = { getItem(){ throw new Error('no'); }, setItem(){ throw new Error('no'); } };
  assert.equal(readCast({ storage: broken, search: '' }), 'sempre');
  resetCast(); assert.equal(setCast('lobdrop', { storage: broken }), 'lobdrop'); assert.equal(getCast(), 'lobdrop');
  // scelta dalle Opzioni: vale subito, resta salvata, chi ascolta è avvisato una volta sola
  resetCast();
  const seen = [], off = onCastChange(v => seen.push(v));
  assert.equal(setCast('lobdrop', { storage }), 'lobdrop'); assert.equal(storage.getItem(CAST_KEY), 'lobdrop'); assert.equal(getCast(), 'lobdrop');
  setCast('lobdrop', { storage }); setCast('sempre', { storage }); setCast('una cosa strana', { storage });
  assert.deepEqual(seen, ['lobdrop', 'sempre']); assert.equal(storage.getItem(CAST_KEY), 'sempre');
  off(); setCast('lobdrop', { storage }); assert.deepEqual(seen, ['lobdrop', 'sempre']);
  assert.match(castToast('lobdrop'), /Lob & Drop/); assert.match(castToast('sempre'), /di sempre/);
  resetCast();
});

test('parametro ?personaggi=lobdrop|sempre: vale per l\'avvio, vince sul valore salvato e non lo tocca', () => {
  assert.equal(castFromSearch('?personaggi=lobdrop'), 'lobdrop');
  assert.equal(castFromSearch('?intro=0&personaggi=SEMPRE'), 'sempre');
  assert.equal(castFromSearch('?personaggi=altro'), null); assert.equal(castFromSearch(''), null); assert.equal(castFromSearch(undefined), null);
  const storage = mem();
  assert.equal(readCast({ storage, search: '?personaggi=lobdrop' }), 'lobdrop'); assert.equal(storage.getItem(CAST_KEY), null);
  storage.setItem(CAST_KEY, 'lobdrop');
  assert.equal(readCast({ storage, search: '?personaggi=sempre' }), 'sempre'); assert.equal(storage.getItem(CAST_KEY), 'lobdrop');
  assert.equal(readCast({ storage, search: '?personaggi=boh' }), 'lobdrop');
});

test('chi è chi: «Di sempre» come prima; «Lob & Drop» → dalla parte del Player 1 Drop, dall\'altra Lob (CPU e Player 2)', () => {
  assert.deepEqual({ ...castLooks('sempre', false) }, { player: 'p1', opponent: 'cpu' });
  assert.deepEqual({ ...castLooks('sempre', true) }, { player: 'p1', opponent: 'p2' });
  assert.deepEqual({ ...castLooks('lobdrop', false) }, { player: 'drop', opponent: 'lob' });
  assert.deepEqual({ ...castLooks('lobdrop', true) }, { player: 'drop', opponent: 'lob' });
  assert.deepEqual({ ...castLooks('boh', true) }, { player: 'p1', opponent: 'p2' });
  assert.equal(castLooks('lobdrop', false), castLooks('lobdrop', false), 'stesso oggetto: niente allocazioni per fotogramma');
  for (const multi of [false, true]){
    resetCast(); setCast('sempre', { save: false });
    const E = engineOf(multi);
    updateNatpfCharacters(E);
    assert.deepEqual([E.player.natpfLook, E.opponent.natpfLook], ['p1', multi ? 'p2' : 'cpu']);
    assert.equal(E.player.natpfMascotParts, undefined, '«Di sempre»: nessun pezzo delle mascotte nella scena');
    assert.equal(E.player.model.getObjectByName('NatpfDropTesta'), undefined);
    setCast('lobdrop', { save: false });
    updateNatpfCharacters(E);
    assert.deepEqual([E.player.natpfLook, E.opponent.natpfLook, E.playerPartner.natpfLook, E.opponentPartner.natpfLook], ['drop', 'lob', 'drop', 'lob']);
    assert.deepEqual([E.player.natpfMascot, E.opponent.natpfMascot], ['drop', 'lob']);
    assert.deepEqual([getPlayerPortraitLook(), getOpponentPortraitLook()], ['drop', 'lob']);
    assert.deepEqual([portraitLookFor('player1'), portraitLookFor('plate-pl-player'), portraitLookFor('opponent1'), portraitLookFor('setup-pl-opponent')], ['drop', 'drop', 'lob', 'lob']);
    // secondo fotogramma: niente da rifare (stessi oggetti, stesso aspetto)
    const parts = E.player.natpfMascotParts; updateNatpfCharacters(E); assert.equal(E.player.natpfMascotParts, parts);
    setCast('sempre', { save: false });
    updateNatpfCharacters(E);
    assert.deepEqual([E.player.natpfLook, E.opponent.natpfLook], ['p1', multi ? 'p2' : 'cpu']);
    assert.deepEqual([E.player.natpfMascot, E.opponent.natpfMascot], [null, null]);
    assert.deepEqual([getPlayerPortraitLook(), getOpponentPortraitLook()], ['p1', multi ? 'p2' : 'cpu']);
  }
  resetCast();
});

test('pezzi di Drop e di Lob: quelli del tennista nascosti, accessori giusti, colori della foto, geometrie condivise', () => {
  const a = mountActor('p1').actor, b = mountActor('cpu', { role: 'opponent', sideSign: -1 }).actor;
  const human = shown(a);
  applyNatpfLook(a, 'drop'); applyNatpfLook(b, 'lob');
  const drop = shown(a), lob = shown(b);
  // niente polo, capelli, scarpe, maniche, calze
  for (const list of [drop, lob]) for (const n of ['NatpfPolo', 'NatpfColletto', 'NatpfPantaloncini', 'NatpfCollo', 'NatpfTesta', 'NatpfCapelli', 'NatpfFascia', 'NatpfOrecchie', 'NatpfNaso',
    'NatpfManoDx', 'NatpfManoSx', 'NatpfScarpa', 'NatpfSuola', 'NatpfManicaDx', 'NatpfOrloSx', 'NatpfCalzaDx']) assert.ok(!list.includes(n), `${n} ancora visibile`);
  for (const n of ['NatpfDropTesta', 'NatpfDropFascia', 'NatpfDropCiuffo', 'NatpfDropScritta', 'NatpfDropCorpo', 'NatpfDropMano', 'NatpfDropPiede', 'NatpfOcchioContorno', 'NatpfOcchioIride', 'NatpfBoccaAperta', 'NatpfLingua',
    'NatpfPolsinoDx', 'NatpfPolsinoSx', 'NatpfBraccioDxCorpo', 'NatpfCosciaSxCorpo', 'NatpfTelaio']) assert.ok(drop.includes(n), `Drop senza ${n}`);
  for (const n of ['NatpfLobTesta', 'NatpfLobVisiera', 'NatpfLobScritta', 'NatpfLobCorpo', 'NatpfLobMano', 'NatpfLobPiede', 'NatpfLobOcchiali', 'NatpfLobOcchialiPonte', 'NatpfOcchioContorno', 'NatpfOcchioIride', 'NatpfBoccaAperta',
    'NatpfBraccioDxCorpo', 'NatpfTelaio']) assert.ok(lob.includes(n), `Lob senza ${n}`);
  // Drop non ha occhiali né visiera; Lob non ha fascia bianca, ciuffo né polsini
  for (const n of drop) assert.doesNotMatch(n, /^NatpfLob/);
  for (const n of lob){ assert.doesNotMatch(n, /^NatpfDrop/); assert.doesNotMatch(n, /^NatpfPolsino/); }
  assert.equal(drop.filter(n => n === 'NatpfDropMano').length, 2); assert.equal(drop.filter(n => n === 'NatpfDropPiede').length, 2);
  assert.equal(lob.filter(n => n === 'NatpfLobOcchiali').length, 2);
  // colori: Drop blu con fascia e polsini bianchi e occhi verdi, Lob giallo con visiera blu e occhi azzurri
  const hex = (actor, name) => { let m = null; actor.root.traverse(o => { if (!m && o.name === name) m = o; }); return m.material.color.getHex(); };
  assert.equal(hex(a, 'NatpfDropTesta'), MASCOT_COLORS.drop.body); assert.equal(hex(a, 'NatpfDropCorpo'), MASCOT_COLORS.drop.body);
  assert.equal(hex(a, 'NatpfDropFascia'), 0xffffff); assert.equal(hex(a, 'NatpfPolsinoDx'), 0xffffff); assert.equal(hex(a, 'NatpfBraccioDxCorpo'), MASCOT_COLORS.drop.body);
  assert.equal(hex(a, 'NatpfOcchioIride'), MASCOT_COLORS.drop.iris);
  assert.equal(hex(b, 'NatpfLobTesta'), MASCOT_COLORS.lob.body); assert.equal(hex(b, 'NatpfLobVisiera'), MASCOT_COLORS.lob.visor);
  assert.equal(hex(b, 'NatpfOcchioIride'), MASCOT_COLORS.lob.iris); assert.equal(hex(b, 'NatpfCosciaDxCorpo'), MASCOT_COLORS.lob.body);
  { const c = new THREE.Color(MASCOT_COLORS.drop.body), y = new THREE.Color(MASCOT_COLORS.lob.body);
    assert.ok(c.b > c.r*2 && c.b > c.g, 'Drop è blu'); assert.ok(y.r > .8 && y.g > .6 && y.b < .2, 'Lob è giallo'); }
  // scritte disegnate una volta sola per testo
  assert.deepEqual([...new Set(drawn)].sort(), ['DROP', 'LOB']);
  // geometrie e materiali condivisi tra gli attori; nessun pezzo ritoccato dal vecchio aggiornamento dei materiali
  const c = mountActor('p1').actor; applyNatpfLook(c, 'drop');
  const get = (actor, name) => { let m = null; actor.root.traverse(o => { if (!m && o.name === name) m = o; }); return m; };
  for (const n of ['NatpfDropTesta', 'NatpfDropCorpo', 'NatpfDropMano', 'NatpfDropFascia', 'NatpfDropScritta', 'NatpfOcchioIride']){
    assert.equal(get(a, n).geometry, get(c, n).geometry, n); assert.equal(get(a, n).material, get(c, n).material, n);
  }
  const m0 = get(a, 'NatpfDropTesta').material; upgradePlayerCharacterMaterials(a, 'p1'); assert.equal(get(a, 'NatpfDropTesta').material, m0);
  // pochi poligoni: una mascotte intera sta sotto i 12 000 triangoli (il tennista di prima: confronto)
  const tris = list => list.reduce((n, o) => n + (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count)/3, 0);
  const meshes = actor => { const out = []; actor.model.traverse(o => { if (o.isMesh && visibleUp(o) && o.geometry.attributes.position) out.push(o); }); return out; };
  const tMascot = tris(meshes(a)), tHuman = tris(meshes(mountActor('p1').actor));
  assert.ok(tMascot < 12000 && tMascot < tHuman*1.25, `triangoli: mascotte ${tMascot}, tennista ${tHuman}`);
  assert.ok(human.includes('NatpfPolo') && !human.some(n => /Drop|Lob/.test(n)));
  assert.equal(mascotOf('drop'), 'drop'); assert.equal(mascotOf('p1'), null);
  assert.ok(CHARACTER_LOOKS.drop && CHARACTER_LOOKS.lob && PORTRAIT_LOOKS.includes('drop') && PORTRAIT_LOOKS.includes('lob'));
});

test('stesso scheletro e stesse animazioni: parti, racchetta e mano identiche al tennista in corsa, colpi, servizio, esultanza', () => {
  const H = mountActor('p1'), M = mountActor('p1');
  applyNatpfLook(M.actor, 'drop');
  const same = label => {
    for (const k of ['head', 'torso', 'handL', 'handR', 'footL', 'footR']){
      const a = world(H.actor.parts[k]), b = world(M.actor.parts[k]);
      assert.ok(a.distanceTo(b) < 1e-9, `${label}: ${k} diverso (${a.distanceTo(b)})`);
      // stessa rotazione: componenti del quaternione uguali
      const qa = H.actor.parts[k].getWorldQuaternion(new THREE.Quaternion()), qb = M.actor.parts[k].getWorldQuaternion(new THREE.Quaternion());
      assert.ok(Math.max(...qa.toArray().map((v, i) => Math.abs(v - qb.toArray()[i]))) < 1e-12, `${label}: ${k} ruotato (${qa.toArray()} / ${qb.toArray()})`);
    }
    const p = getRacketRimWorldPoints(H.actor), q = getRacketRimWorldPoints(M.actor);
    for (const k of ['centerWorld', 'tipWorld', 'throatWorld']) assert.ok(p[k].distanceTo(q[k]) < 1e-9, `${label}: racchetta ${k}`);
    // la mano della racchetta resta sul manico
    const grip = new THREE.Vector3(0, .08, 0).applyMatrix4(M.actor.racketMesh.matrixWorld);
    assert.ok(world(M.actor.parts.handR).distanceTo(grip) < .03, `${label}: mano staccata dal manico`);
    // braccia e gambe: stessi giunti, solo più grossi
    for (const side of [0, 1]){
      assert.ok(H.actor.natpfLimbs.arms[side].joint.distanceTo(M.actor.natpfLimbs.arms[side].joint) < 1e-9, `${label}: gomito`);
      assert.ok(H.actor.natpfLimbs.legs[side].joint.distanceTo(M.actor.natpfLimbs.legs[side].joint) < 1e-9, `${label}: ginocchio`);
      assert.equal(M.actor.natpfLimbs.arms[side].fore.body.scale.x, MASCOT_LIMBS.arm); assert.equal(H.actor.natpfLimbs.arms[side].fore.body.scale.x, 1);
      assert.equal(M.actor.natpfLimbs.legs[side].shin.body.scale.z, MASCOT_LIMBS.leg);
      assert.equal(M.actor.natpfLimbs.arms[side].fore.body.scale.y, H.actor.natpfLimbs.arms[side].fore.body.scale.y);
    }
  };
  const both = fn => { fn(H); fn(M); };
  for (let i = 0; i < 30; i++) both(c => step(c));
  same('fermo');
  both(c => c.actor.vel.set(-7, 0, 1.5)); for (let i = 0; i < 40; i++) both(c => step(c));
  same('corsa');
  both(c => { c.actor.vel.set(0, 0, 0); c.rk.triggerSwing(c.actor, { shotType: 'topspin', side: 'forehand', speed: 1.3, timing: 'sweet' }); });
  for (let i = 0; i < 12; i++) both(c => step(c));
  same('dritto');
  both(c => c.rk.triggerSwing(c.actor, { shotType: 'slice', side: 'backhand', speed: 1.2, timing: 'sweet' }));
  for (let i = 0; i < 12; i++) both(c => step(c));
  same('rovescio');
  both(c => c.rk.triggerSwing(c.actor, { shotType: 'serve', side: 'overhead', speed: 1.4, timing: 'sweet', isServe: true }));
  for (let i = 0; i < 12; i++) both(c => step(c, 1/60, { phase: 'SERVE_TOSS' }));
  same('servizio');
  both(c => triggerPointReaction(c.actor, 'win'));
  for (let i = 0; i < 30; i++) both(c => step(c, 1/60, { phase: 'POINT_OVER' }));
  same('esultanza');
  // le espressioni del motore funzionano anche sulla mascotte
  for (const s of ['focused_squint', 'effort_shout', 'wide_eyed_panic', 'happy_grin', 'shocked_loss', 'neutral']) assert.equal(M.facial.setExpression(M.actor, s, .5), s);
});

test('mancini: personaggio specchiato come il tennista, racchetta nella stessa mano, scritta leggibile', () => {
  for (const key of ['drop', 'lob']){
    const R = mountActor('p1'), Lf = mountActor('p1');
    applyNatpfLook(R.actor, key); applyNatpfLook(Lf.actor, key);
    Lf.actor.root.scale.x = -1;                                   // natpf_hand.js: il mancino è lo specchio
    for (let i = 0; i < 20; i++){ step(R); step(Lf); }
    updateMascotLabels(R.actor); updateMascotLabels(Lf.actor);
    const label = a => a.natpfMascotParts.labels.find(l => l.visible);
    assert.equal(label(R.actor).scale.x, 1); assert.equal(label(Lf.actor).scale.x, -1);
    assert.equal(label(Lf.actor).name, `Natpf${MASCOT[key].name}Scritta`);
    // la scritta specchiata due volte torna dritta: il verso (determinante della matrice) è quello del destro
    Lf.actor.root.updateMatrixWorld(true); R.actor.root.updateMatrixWorld(true);
    assert.ok(label(Lf.actor).matrixWorld.determinant()*label(R.actor).matrixWorld.determinant() > 0);
    // la mano della racchetta: a destra per il destro, a sinistra per il mancino (rispetto al personaggio, in x del mondo)
    const side = c => (world(c.actor.parts.handR).x - c.actor.root.position.x);
    assert.ok(side(R)*side(Lf) < 0, 'la racchetta non ha cambiato mano');
    const grip = new THREE.Vector3(0, .08, 0).applyMatrix4(Lf.actor.racketMesh.matrixWorld);
    assert.ok(world(Lf.actor.parts.handR).distanceTo(grip) < .03);
    // tornato destro: la scritta torna com'era
    Lf.actor.root.scale.x = 1; updateMascotLabels(Lf.actor); assert.equal(label(Lf.actor).scale.x, 1);
  }
});

test('viso della mascotte: occhi grandi sulla testa nuova, niente sopracciglia; tornando a «Di sempre» tutto come prima', () => {
  const ref = mountActor('p1'), ctx = mountActor('p1'), actor = ctx.actor, rig = actor.facialRig;
  const snap = a => {
    const out = {}; a.updateMatrixWorld?.(true);
    a.root.updateMatrixWorld(true);
    a.root.traverse(o => { if (!/Drop|Lob|Occhio|Bocca|Lingua|Scritta/.test(o.name || '')) (out[o.uuid] = [o.position.toArray(), o.quaternion.toArray(), o.scale.toArray(), o.visible, o.isMesh ? o.material?.uuid : null]); });
    return out;
  };
  const before = snap(actor);
  for (const key of ['drop', 'lob', 'drop']){
    applyNatpfLook(actor, key);
    const M = MASCOT[key];
    assert.equal(rig.faceGroup.scale.x, MASCOT_FACE_SCALE); assert.equal(rig.faceGroup.position.y, M.head.cy);
    for (const eye of [rig.leftEye, rig.rightEye]){
      const r = eye.scleraMesh.scale.x*.038*MASCOT_FACE_SCALE;
      assert.ok(Math.abs(r - M.eye.r) < 1e-6, `occhio di ${key}: raggio ${r}`);
      assert.ok(Math.abs(Math.abs(eye.root.position.x)*MASCOT_FACE_SCALE - M.eye.x) < 1e-6);
      // l'occhio sta sulla superficie della testa (appena dentro), non a mezz'aria né sepolto
      const x = eye.root.position.x*MASCOT_FACE_SCALE, y = eye.root.position.y*MASCOT_FACE_SCALE, z = eye.root.position.z*MASCOT_FACE_SCALE;
      const k = (x/M.head.rx)**2 + (y/M.head.ry)**2 + (z/M.head.rz)**2;
      assert.ok(k > .9 && k < 1.001, `occhio di ${key} fuori dalla testa: ${k}`);
    }
    assert.equal(rig.leftBrow.children[0].visible, false); assert.equal(rig.conformalPatchMesh.visible, false); assert.equal(rig.leftCheek.visible, false);
    assert.equal(rig.neutralMouth.children[0].visible, false);
    assert.equal(rig.leftEye.lidMesh.material.color.getHex(), MASCOT_COLORS[key].body);
  }
  // un battito d'occhi e un'espressione mentre è una mascotte, poi indietro
  ctx.facial.setExpression(actor, 'happy_grin', .2); ctx.facial.setExpression(actor, 'neutral');
  applyNatpfLook(actor, 'p1');
  assert.equal(actor.natpfMascot, null);
  const after = snap(actor);
  for (const [id, v] of Object.entries(before)) assert.deepEqual(after[id], v, `diverso dopo il ritorno a «Di sempre»`);
  assert.deepEqual(shown(actor).filter(n => /Drop|Lob|Occhio|Bocca|Lingua|Scritta|Occhiali/.test(n)), []);
  // e identico a un attore mai stato mascotte (stessi pezzi visibili, stessi materiali per nome)
  assert.deepEqual(shown(actor).sort(), shown(ref.actor).sort());
  assert.equal(actor.natpfLimbs.arms[0].upper.thick, 1); assert.equal(actor.natpfLimbs.legs[0].thigh.body.scale.x, 1);
  // un attore mai stato mascotte non viene toccato da applyMascot
  assert.equal(applyMascot(ref.actor, 'cpu', () => null), null); assert.equal(ref.actor.natpfMascotParts, undefined);
});

test('prima persona con la mascotte: restano avambracci, mani e racchetta; spariscono testa, corpo e gambe', () => {
  const { actor } = mountActor('p1');
  applyNatpfLook(actor, 'drop');
  setFirstPersonBody(actor, true);
  const names = shown(actor);
  for (const n of ['NatpfDropTesta', 'NatpfDropCorpo', 'NatpfDropFascia', 'NatpfDropPiede', 'NatpfOcchioIride', 'NatpfBraccioDxCorpo', 'NatpfCosciaDxCorpo']) assert.ok(!names.includes(n), `${n} visibile in prima persona`);
  for (const n of ['NatpfDropMano', 'NatpfAvambraccioDxCorpo', 'NatpfPolsinoDx', 'NatpfTelaio']) assert.ok(names.includes(n), `${n} sparito in prima persona`);
  setFirstPersonBody(actor, false);
  assert.ok(shown(actor).includes('NatpfDropTesta'));
});

test('ritratti: Drop e Lob nel tabellone, nella lobby e a fine partita quando l\'opzione è accesa', () => {
  const d = natpfPortraitSVG('drop', { uid: 'x' }), l = natpfPortraitSVG('lob', { uid: 'y' });
  assert.match(d, /data-look="drop"/); assert.match(d, />DROP</); assert.match(d, /aria-label="Ritratto di Drop"/); assert.ok(d.includes('#1f6fd6'));
  assert.match(l, /data-look="lob"/); assert.match(l, />LOB</); assert.match(l, /aria-label="Ritratto di Lob"/); assert.ok(l.includes('#ffdd1f'));
  assert.doesNotMatch(d, />LOB</); assert.doesNotMatch(l, />DROP</);
  // identificativi distinti (due ritratti nella stessa pagina non si pestano i gradienti)
  assert.match(d, /id="x-bg"/); assert.match(l, /id="y-bg"/);
  const seen = [], off = onOpponentPortraitLook((o, p) => seen.push(`${p}/${o}`));
  setPortraitLooks('p1', 'cpu'); seen.length = 0;
  assert.equal(setPortraitLooks('drop', 'lob'), true); assert.equal(setPortraitLooks('drop', 'lob'), false);
  assert.match(getPlayerAvatarSVG('player1'), /data-look="drop"/); assert.match(getPlayerAvatarSVG('opponent1'), /data-look="lob"/);
  assert.match(getPlayerAvatarSVG('pl-icon-player'), /class="nt-pl-svg"/);
  setPortraitLooks('p1', 'cpu'); setOpponentPortraitLook('p2'); setPortraitLooks('boh', 'boh');
  assert.deepEqual(seen, ['drop/lob', 'p1/cpu', 'p1/p2', 'p1/cpu']);
  assert.match(getPlayerAvatarSVG('player1'), /data-look="p1"/);
  off();
});

test('pagina e pacchetto: riga «Personaggi in campo» nelle Opzioni, nessun file nuovo da scaricare', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const row = /<span class="lobby-label">Personaggi in campo<\/span>[\s\S]{0,500}?<\/div>/.exec(html)?.[0] || '';
  assert.match(row, /data-natpf-cast="sempre"[^>]*>Di sempre</); assert.match(row, /data-natpf-cast="lobdrop"[^>]*>Lob &amp; Drop</);
  assert.match(row, /role="radiogroup"/);
  // modelli nel codice: nessun file di modello o immagine caricato dai moduli nuovi
  for (const f of ['natpf_lob_drop.js', 'natpf_personaggi.js']){
    const src = fs.readFileSync(path.join(ROOT, 'src/natpf', f), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');   // senza i commenti
    assert.doesNotMatch(src, /\.(glb|gltf|png|jpe?g|webp|obj|fbx)['"`]/i, f); assert.doesNotMatch(src, /fetch\(|Loader\(|Math\.random/, f);
  }
});
