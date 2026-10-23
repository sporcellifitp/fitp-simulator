// Motore del motore base/NATPF senza browser: le stesse regole del gioco (colpi, CPU, fisica della palla, punteggio),
// senza disegno, audio e HUD. Serve all'audit degli scambi e ai test dello skill gap.
// Si esegue con gli alias dei test: node --import ./test/register.mjs …
import * as THREE from 'three';

const noop = () => {};
if (!globalThis.window) globalThis.window = { addEventListener: noop, removeEventListener: noop, location: { search: '' }, innerWidth: 1280, innerHeight: 720 };
const { NatpfTennisEngine } = await import('../../src/game_engine.js');
const { NatpfReplay } = await import('../../src/natpf/natpf_replay.js');

// HUD, scia e arena finti: ogni metodo esiste e non fa nulla
const sink = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop) });

// random: generatore deterministico (Math.random viene sostituito durante la simulazione)
export function mulberry32(seed){
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
}
export const gauss = rng => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };

export function createHeadlessEngine({ difficulty = 'casual' } = {}){
  const e = Object.create(NatpfTennisEngine.prototype);
  Object.assign(e, {
    params: new URLSearchParams(''), urlState: '', urlRoom: '', urlRole: 'p1', urlMode: difficulty, urlAutoPlay: false,
    roomId: 'default', playerRole: 'p1', isMultiplayer: false, isDoubles: false, matchFormat: { id: 'singles', teamSize: 1 },
    viewMode: 'third', cameraMode: 'RALLY_CAM', cameraTrauma: 0, bannerSeq: 0,
    matchConfig: { gamesToWin: 999, inputMode: 'mouse', difficulty },
    score: { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true },
    phase: 'TITLE', phaseTimer: 0, selectedShotType: 'TOPSPIN', p2SelectedShotType: 'TOPSPIN',
    autoPlayMode: false, userHasInteracted: true, persistentStateLock: false,
    pendingUserSwing: null, pendingP2Swing: null, pendingServeSwing: null,
    ball: { mesh: null, pos: new THREE.Vector3(0.85, 1.15, 11.6), vel: new THREE.Vector3(), spin: new THREE.Vector3(), inPlay: false, lastHitter: 'player',
      bounceCountOnCurrentSide: 0, shotType: 'TOPSPIN', isPowerShot: false, rallyStrokeCount: 0, targetLanding: new THREE.Vector3(0, 0, -8.5) },
    hud: sink(), ballTrail: sink(), natpfArena: sink(), audioEngine: null, racketKinematics: null, swingVfx: null, facialFX: null, bodyAnimator: null, motionController: null,
    elapsedTime: 0, physicsAccumulator: 0, cheerEnergy: 0, roomStatus: {}, lastAppliedSnapshotSeq: 0, lastSyncSentAt: 0,
  });
  e.player = e._createActorState('player', 1, new THREE.Vector3(1.15, 0, 11.89));
  e.playerPartner = e._createActorState('player_partner', 1, new THREE.Vector3(-2.1, 0, 5.4));
  e.opponent = e._createActorState('opponent', -1, new THREE.Vector3(-1.35, 0, -11.89));
  e.opponentPartner = e._createActorState('opponent_partner', -1, new THREE.Vector3(2.1, 0, -5.4));
  for (const a of [e.player, e.playerPartner, e.opponent, e.opponentPartner]) a.swingArcMesh = { visible: false };
  e._applyDifficultyTuning(difficulty);
  e._projectToScreen = () => ({ x: 0, y: 0 });
  e._applyMatchFormat = noop; e._spawnStarBurst = noop; e._spawnBounceRing = noop;
  e.natpfReplay = new NatpfReplay(e);
  // un passo fisso della fisica (come update() del gioco, senza disegno)
  e.step = dt => { e.elapsedTime += dt; e._stepPhysics(dt); e.natpfReplay?.record(dt); };   // con la moviola che registra
  return e;
}
