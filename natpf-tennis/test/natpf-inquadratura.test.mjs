// B8 (05/11, «adatta il fullscreen in base alla finestra/monitor in utilizzo»): la camera della partita in terza persona
// aveva sempre 45° in verticale e la stessa posa, pensate per il 16:9. Audit B8: sul quadrato (ledwall 2×2) gli angoli
// vicini del doppio uscivano dallo schermo (±1,05), in verticale anche singolare e pali della rete (±1,4 e ±1,15).
// Ora (natpf_camera.js thirdPersonFrame): da 16:9 in su tutto come prima; più stretto, campo visivo più ampio fino a 58°,
// poi la camera arretra lungo lo sguardo, poi (solo in verticale) campo visivo fino a 70°. Qui: la funzione pura, la
// geometria con la camera vera del motore (servizio e scambio, P1 e P2) e il ridimensionamento (_onResize).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import {
  thirdPersonFrame, thirdPersonCoverage, THIRD_PERSON, MATCH_CAM, NEAR_BASELINE_DEPTH, dollyCamera, isMatchCamera,
  renderPixelRatio, watchPixelRatio, firstPersonFov, firstPersonPose,
} from '../src/natpf/natpf_camera.js';
import { SPLIT_CAM } from '../src/natpf/natpf_split.js';

const BASE = 11.89, DOUBLES = 5.485, SINGLES = 4.115, POST_X = 6.4, POST_H = 1.07;   // game_engine.js, costanti S
const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

test('B8: da 16:9 in su la camera è esattamente quella di prima (45°, nessun arretramento)', () => {
  for (const a of [16/9, 1920/1080, 1.8, 2, 2560/1080, 21/9, 3, 32/9, 10]) assert.deepEqual(thirdPersonFrame(a), { fov: 45, dolly: 1 }, `aspetto ${a}`);
  // misure senza senso (finestra a zero, valori mancanti): la camera di sempre, mai NaN
  for (const a of [0, -1, NaN, undefined, null, 'x', Infinity]) assert.deepEqual(thirdPersonFrame(a), { fov: 45, dolly: 1 }, `aspetto ${a}`);
  assert.equal(THIRD_PERSON.fov, 45);
  // il tetto del primo allargamento è quello dello split screen (45° + 13°)
  assert.equal(THIRD_PERSON.maxFov, SPLIT_CAM.fov + SPLIT_CAM.tallFov);
  assert.equal(THIRD_PERSON.maxFov, 58);
});

test('B8: più stretto del 16:9 prima si allarga il campo visivo, poi la camera arretra, poi (in verticale) ancora il campo', () => {
  // 16:10, 3:2, 4:3: solo il campo visivo (Hor+), la camera resta dov'era
  for (const [a, fov] of [[1.6, 49.43], [1.5, 52.29], [4/3, 57.82]]){
    const f = thirdPersonFrame(a);
    assert.equal(f.dolly, 1, `aspetto ${a}`);
    assert.ok(close(f.fov, fov, .01), `aspetto ${a}: ${f.fov}`);
  }
  // quadrato (ledwall 2×2): 58° e un arretramento di circa il 19%, sotto il tetto
  const sq = thirdPersonFrame(1);
  assert.equal(sq.fov, 58);
  assert.ok(sq.dolly > 1.18 && sq.dolly < 1.2 && sq.dolly <= THIRD_PERSON.maxDolly, `quadrato: ${sq.dolly}`);
  // verticale 9:16: arretramento al tetto e campo visivo al secondo tetto
  assert.deepEqual(thirdPersonFrame(9/16), { fov: THIRD_PERSON.tallFov, dolly: THIRD_PERSON.maxDolly });
  // monotono e senza scatti dal 16:9 al 9:16 (finestra trascinata per il bordo)
  let prev = thirdPersonFrame(16/9);
  for (let a = 16/9 - .001; a >= .4; a -= .001){
    const f = thirdPersonFrame(a);
    assert.ok(f.fov >= prev.fov - 1e-9 && f.dolly >= prev.dolly - 1e-9, `aspetto ${a.toFixed(3)}: ${JSON.stringify(prev)} → ${JSON.stringify(f)}`);
    assert.ok(f.fov - prev.fov < .2 && f.dolly - prev.dolly < .005, `scatto a ${a.toFixed(3)}: ${JSON.stringify(prev)} → ${JSON.stringify(f)}`);
    assert.ok(f.fov <= THIRD_PERSON.tallFov + 1e-9 && f.dolly <= THIRD_PERSON.maxDolly + 1e-9);
    if (f.dolly > 1) assert.ok(f.fov >= THIRD_PERSON.maxFov - 1e-9, `aspetto ${a.toFixed(3)}: arretra solo dopo il tetto del campo visivo`);
    if (f.fov > THIRD_PERSON.maxFov + 1e-9) assert.ok(close(f.dolly, THIRD_PERSON.maxDolly), `aspetto ${a.toFixed(3)}: secondo allargamento solo ad arretramento finito`);
    prev = f;
  }
});

test('B8: la larghezza vista sulla riga di fondo vicina resta quella del 16:9 fino al quadrato e cala solo in verticale', () => {
  assert.ok(NEAR_BASELINE_DEPTH > .5 && NEAR_BASELINE_DEPTH < .65, `${NEAR_BASELINE_DEPTH}`);
  for (const a of [16/9, 1.6, 1.5, 4/3, 1.25, 1, .9, .8]) assert.ok(close(thirdPersonCoverage(a), 1, 1e-9), `aspetto ${a}: ${thirdPersonCoverage(a)}`);
  assert.ok(close(thirdPersonCoverage(21/9), (21/9)/(16/9), 1e-9), 'più largo: si vede di più, come prima');
  // dal più largo al più stretto mai di più
  let prev = Infinity;
  for (let a = 3; a >= .4; a -= .005){ const c = thirdPersonCoverage(a); assert.ok(c <= prev + 1e-9, `aspetto ${a.toFixed(3)}: ${prev} → ${c}`); prev = c; }
  assert.ok(thirdPersonCoverage(9/16) > .7, `9:16: ${thirdPersonCoverage(9/16)}`);
});

test('B8: dolly lungo lo sguardo e camere che arretrano', () => {
  const look = new THREE.Vector3(.1, .35, 1.8), pos = new THREE.Vector3(.2, 7.8, 22.8), dir0 = pos.clone().sub(look).normalize();
  const d0 = pos.distanceTo(look);
  dollyCamera(pos, look, 1.2);
  assert.ok(close(pos.distanceTo(look), d0*1.2, 1e-9));
  assert.ok(pos.clone().sub(look).normalize().distanceTo(dir0) < 1e-12, 'stessa direzione dello sguardo');
  const same = new THREE.Vector3(1, 2, 3); dollyCamera(same, look, 1); assert.deepEqual(same.toArray(), [1, 2, 3]);
  for (const m of ['SERVE_CAM', 'RALLY_CAM']) assert.equal(isMatchCamera(m), true, m);
  for (const m of ['INTRO_PAN', 'SHOWCASE_CAM', 'REPLAY_CAM']) assert.equal(isMatchCamera(m), false, m);
});

// ── con il motore vero (senza browser): _onResize, _snapCameraImmediate, _computeTargetCameraPose ──
function engineAt(w, h, { dpr = 1 } = {}){
  globalThis.innerWidth = w; globalThis.innerHeight = h; globalThis.window.devicePixelRatio = dpr;
  const e = createHeadlessEngine({ difficulty: 'pro' });
  const calls = [];
  e.renderer = { pr: 1, getPixelRatio(){ return this.pr; }, setPixelRatio(v){ this.pr = v; calls.push(['pr', v]); }, setSize(a, b){ calls.push(['size', a, b]); } };
  e.renderer.calls = calls;
  e.camera = new THREE.PerspectiveCamera(45, 16/9, .1, 500);
  e.cameraPosSmooth = new THREE.Vector3(0, 7.8, 22.8); e.cameraLookSmooth = new THREE.Vector3(0, .35, 1.8);
  e._onResize();
  return e;
}
const ndc = (e, p) => new THREE.Vector3(...p).project(e.camera);
// pose della partita: al servizio (P1 da destra e da sinistra) e nello scambio (chi gioca e la palla di lato, anche
// oltre il fondo campo), per il P1 e per il P2 (camera dall'altra metà)
function* matchPoses(){
  for (const role of ['p1', 'p2']){
    for (const x of [-1.15, 1.15]) yield { role, mode: 'SERVE_CAM', x, z: BASE, ballX: x };
    for (const x of [-3, 0, 3]) for (const ballX of [-4, 0, 4]) for (const z of [BASE, 13.5]) yield { role, mode: 'RALLY_CAM', x, z, ballX };
  }
}
function pose(e, { role, mode, x, z, ballX }){
  const s = role === 'p2' ? -1 : 1, a = role === 'p2' ? e.opponent : e.player;
  e.playerRole = role; e.cameraMode = mode; e.phase = mode === 'SERVE_CAM' ? 'SERVE_STANCE' : 'RALLY';
  a.pos.set(x*s, 0, z*s); e.ball.pos.set(ballX*s, 1, 0);
  e._snapCameraImmediate();
  return s;
}
// angoli del doppio (vicini e lontani) e pali della rete (piede e cima); angoli del singolare
const doublesAndPosts = s => [
  [-DOUBLES, 0, s*BASE], [DOUBLES, 0, s*BASE], [-DOUBLES, 0, -s*BASE], [DOUBLES, 0, -s*BASE],
  [-POST_X, 0, 0], [POST_X, 0, 0], [-POST_X, POST_H, 0], [POST_X, POST_H, 0],
];
const singlesAndPosts = s => [
  [-SINGLES, 0, s*BASE], [SINGLES, 0, s*BASE], [-SINGLES, 0, -s*BASE], [SINGLES, 0, -s*BASE],
  [-POST_X, 0, 0], [POST_X, 0, 0], [-POST_X, POST_H, 0], [POST_X, POST_H, 0],
];
function worst(e, s, pts){
  let m = 0;
  for (const p of pts){ const q = ndc(e, p); assert.ok(q.z < 1, `${p} dietro la camera`); m = Math.max(m, Math.abs(q.x), Math.abs(q.y)); }
  return m;
}

test('B8: la posa della camera del motore è quella che natpf_camera.js conosce (MATCH_CAM)', () => {
  const e = engineAt(1920, 1080);
  for (const mode of ['SERVE_CAM', 'RALLY_CAM']){
    pose(e, { role: 'p1', mode, x: 0, z: BASE, ballX: 0 });
    assert.deepEqual(e.camera.position.toArray(), [0, MATCH_CAM.height, MATCH_CAM.z], mode);
    assert.deepEqual(e.cameraLookSmooth.toArray(), [0, MATCH_CAM.lookY, MATCH_CAM.lookZ], mode);
  }
});

const SHAPES = [['16:9', 1920, 1080], ['16:10', 1920, 1200], ['3:2', 1800, 1200], ['4:3', 1600, 1200], ['1:1 (ledwall 2×2)', 1200, 1200]];
for (const [name, w, h] of SHAPES){
  test(`B8: ${name} a ${w}×${h}, campo del doppio e pali della rete dentro ±0,97 (servizio e scambio, P1 e P2)`, t => {
    const e = engineAt(w, h), f = thirdPersonFrame(w/h);
    assert.ok(close(e.camera.aspect, w/h) && close(e.camera.fov, f.fov, .011), `fov ${e.camera.fov} invece di ${f.fov}`);
    let m = 0;
    for (const P of matchPoses()){
      const s = pose(e, P), k = worst(e, s, doublesAndPosts(s));
      assert.ok(k <= .97, `${JSON.stringify(P)}: ${k.toFixed(3)}`);
      m = Math.max(m, k);
      // chi gioca largo (fin dove la corsa automatica si ferma, game_engine.js) resta in vista: piedi e testa
      if (P.mode === 'RALLY_CAM') for (const px of [-5.085, 5.085]) for (const y of [0, 1.9]){
        const q = ndc(e, [px*s, y, P.z*s]);
        assert.ok(Math.abs(q.x) <= .97 && Math.abs(q.y) <= .97, `${JSON.stringify(P)}: giocatore a x ${px}, y ${y} → ${q.x.toFixed(2)}, ${q.y.toFixed(2)}`);
      }
    }
    t.diagnostic(`${name}: fov ${e.camera.fov.toFixed(1)}°, dolly ${f.dolly.toFixed(3)}, punto più esterno ${m.toFixed(3)}`);
  });
}

test('B8: in verticale (9:16, 1080×1920) singolare e pali della rete in vista, e anche gli angoli del doppio', t => {
  const e = engineAt(1080, 1920);
  let ms = 0, md = 0;
  for (const P of matchPoses()){
    const s = pose(e, P);
    ms = Math.max(ms, worst(e, s, singlesAndPosts(s))); md = Math.max(md, worst(e, s, doublesAndPosts(s)));
  }
  assert.ok(ms <= .97, `singolare e pali: ${ms.toFixed(3)}`);
  assert.ok(md <= .97, `doppio: ${md.toFixed(3)}`);
  t.diagnostic(`9:16: fov ${e.camera.fov.toFixed(1)}°, singolare e pali ${ms.toFixed(3)}, doppio ${md.toFixed(3)} (prima ±1,4 e ±1,8)`);
});

test('B8: ledwall 2×2 dentro una finestra 16:9 (area 1:1 al centro): conta la forma dell\'area, non quella della finestra', async () => {
  const { NatpfScreen } = await import('../src/natpf/natpf_screen.js');
  const e = engineAt(1920, 1080);
  const scr = new NatpfScreen(e);
  try {
    scr.set('2x2');
    assert.ok(close(e.camera.aspect, 1) && close(e.camera.fov, 58, .011), `aspetto ${e.camera.aspect}, fov ${e.camera.fov}`);
    pose(e, { role: 'p1', mode: 'RALLY_CAM', x: 0, z: BASE, ballX: 0 });
    assert.ok(worst(e, 1, doublesAndPosts(1)) <= .97);
  } finally { scr.set('full'); scr.releaseWakeLock?.(); }
  assert.ok(close(e.camera.aspect, 16/9) && e.camera.fov === 45);
});

// C16 (natpf-camera-profondita.test.mjs) con l'inquadratura adattata: chi gioca fino a 4 m oltre il fondo campo resta in
// vista (piedi e punto d'impatto), con il campo dell'avversario, anche sugli schermi stretti
for (const [name, w, h] of [['4:3', 1600, 1200], ['ledwall 2×2 quasi quadrato', 1320, 1200], ['1:1', 1200, 1200], ['9:16', 1080, 1920]]){
  test(`B8 + C16: chi gioca in profondità resta in vista con l'inquadratura adattata (${name}, P1 e P2)`, () => {
    const e = engineAt(w, h);
    for (const role of ['p1', 'p2']) for (let z = 11; z <= 16.001; z += .5){
      const s = pose(e, { role, mode: 'RALLY_CAM', x: 1, z, ballX: .5 });
      const feet = ndc(e, [s, 0, s*(z + .35)]), contact = ndc(e, [s*1.7, .9, s*(z - .2)]);
      assert.ok(Math.abs(feet.x) <= 1 && feet.y >= -.95 && feet.y <= 1, `${role} a ${z} m: piedi a ${feet.x.toFixed(2)}, ${feet.y.toFixed(2)}`);
      assert.ok(Math.abs(contact.x) <= 1 && contact.y >= -.9 && contact.y <= 1, `${role} a ${z} m: impatto a ${contact.x.toFixed(2)}, ${contact.y.toFixed(2)}`);
      for (const p of [[0, 0, -s*11.89], [0, 1.9, -s*12.2], [4.1, 1, 0], [-4.1, 1, 0]]){
        const q = ndc(e, p);
        assert.ok(Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1 && q.z < 1, `${role} a ${z} m: ${p} fuori`);
      }
    }
  });
}

test('B8: prima persona, moviola, vista aerea e vetrina non arretrano; lo split screen tiene la sua camera', () => {
  const e = engineAt(1200, 1200), f = thirdPersonFrame(1);
  // prima persona: campo visivo e posa di sempre (viewpoint.js, condiviso con il sito)
  e.viewMode = 'first'; e.phase = 'RALLY'; e.cameraMode = 'RALLY_CAM'; e.player.pos.set(.5, 0, BASE);
  e._snapCameraImmediate();
  assert.equal(e.camera.fov, firstPersonFov(1));
  assert.deepEqual(e.camera.position.toArray(), firstPersonPose(e.player, BASE).position.toArray());
  e.viewMode = 'third';
  // camere con pose loro: solo il campo visivo
  for (const mode of ['REPLAY_CAM', 'INTRO_PAN', 'SHOWCASE_CAM']){
    e.cameraMode = mode; e.phase = 'POINT_OVER';
    const { targetPos } = e._computeTargetCameraPose();
    e._snapCameraImmediate();
    assert.ok(e.camera.position.distanceTo(targetPos) < 1e-9, `${mode} non arretra`);
    assert.ok(close(e.camera.fov, f.fov, .011), `${mode}: fov ${e.camera.fov}`);
  }
  // camera scelta a mano (tasto C): Rally e Servizio arretrano come quelle automatiche
  e.cameraMode = 'REPLAY_CAM'; e.manualCameraOverride = 'RALLY_CAM'; e.phase = 'RALLY';
  const { targetPos: tp, targetLook: tl } = e._computeTargetCameraPose();
  e._snapCameraImmediate();
  assert.ok(close(e.camera.position.distanceTo(tl), tp.distanceTo(tl)*f.dolly, 1e-9));
  e.manualCameraOverride = null;
  // split screen visibile: il campo visivo della camera è quello che ha scritto natpf_split.js
  e.natpfSplit.shown = true; e.camera.fov = 51.3; e.camera.updateProjectionMatrix();
  e._updateCameraFov();
  assert.equal(e.camera.fov, 51.3);
  e.natpfSplit.shown = false;
});

test('B8: _onResize cambia subito campo visivo e (con il menu fermo o in pausa) la posa; nitidezza del monitor in uso', () => {
  const e = engineAt(1920, 1080, { dpr: 1 });
  assert.equal(e.camera.fov, 45);
  assert.deepEqual(e.renderer.calls.filter(c => c[0] === 'pr'), [], 'stessa densità: nessun setPixelRatio');
  // sfondo del menu (inquadratura ferma): si passa al ledwall 2×2 → la camera è già quella nuova, senza aspettare il gioco
  e.natpfBackdrop = true; e.cameraMode = 'RALLY_CAM'; e.phase = 'POINT_OVER'; e.player.pos.set(.9, 0, BASE - .2); e.ball.pos.set(0, -5, 0);
  e._snapCameraImmediate();
  const far = e.camera.position.distanceTo(e.cameraLookSmooth);
  globalThis.innerWidth = 1200; globalThis.innerHeight = 1200;
  e._onResize();
  const f = thirdPersonFrame(1);
  assert.ok(close(e.camera.fov, f.fov, .011) && close(e.camera.aspect, 1));
  assert.ok(close(e.camera.position.distanceTo(e.cameraLookSmooth), far*f.dolly, 1e-9), 'arretrata subito');
  assert.ok(worst(e, 1, doublesAndPosts(1)) <= .97, 'campo intero nello sfondo del menu');
  // di nuovo 16:9: tutto come prima
  globalThis.innerWidth = 1920; globalThis.innerHeight = 1080;
  e._onResize();
  assert.equal(e.camera.fov, 45);
  assert.ok(close(e.camera.position.distanceTo(e.cameraLookSmooth), far, 1e-9));
  // in partita (non in pausa) la posa la porta il ciclo della camera, morbida: _onResize cambia solo il campo visivo
  e.natpfBackdrop = false; e.natpfPaused = false;
  const before = e.camera.position.clone();
  globalThis.innerWidth = 1200; globalThis.innerHeight = 1200;
  e._onResize();
  assert.ok(e.camera.position.equals(before) && close(e.camera.fov, 58, .011));
  for (let i = 0; i < 240; i++) e._updateCameraRig(1/60);
  assert.ok(close(e.camera.position.distanceTo(e.cameraLookSmooth), far*f.dolly, 1e-3), 'il ciclo della camera arriva alla posa nuova');
  // finestra spostata su un monitor al 150% e poi al 300% (si ferma a 2, prestazioni)
  globalThis.window.devicePixelRatio = 1.5; e._onResize();
  globalThis.window.devicePixelRatio = 3; e._onResize();
  globalThis.window.devicePixelRatio = undefined; e._onResize();
  assert.deepEqual(e.renderer.calls.filter(c => c[0] === 'pr'), [['pr', 1.5], ['pr', 2], ['pr', 1]]);
  assert.deepEqual(e.renderer.calls.at(-1), ['size', 1200, 1200]);
});

test('B8: densità dei pixel, al massimo 2, e avviso quando cambia (matchMedia sulla risoluzione)', () => {
  assert.equal(renderPixelRatio(1), 1); assert.equal(renderPixelRatio(1.25), 1.25); assert.equal(renderPixelRatio(3), 2);
  for (const v of [0, -2, NaN, undefined, null]) assert.equal(renderPixelRatio(v), 1);
  // finestra finta: una media query per la densità attuale, che avvisa una volta quando non vale più
  const queries = [];
  const w = { devicePixelRatio: 1, matchMedia(q){ const m = { q, l: null, addEventListener(ev, fn, o){ assert.equal(ev, 'change'); assert.equal(o?.once, true); this.l = fn; }, removeEventListener(ev, fn){ if (this.l === fn) this.l = null; } }; queries.push(m); return m; } };
  const seen = [];
  const stop = watchPixelRatio(v => seen.push(v), w);
  assert.deepEqual(queries.map(m => m.q), ['(resolution: 1dppx)']);
  w.devicePixelRatio = 1.5; queries.at(-1).l();
  assert.deepEqual(seen, [1.5]);
  assert.equal(queries.at(-1).q, '(resolution: 1.5dppx)', 'riarmata sulla densità nuova');
  w.devicePixelRatio = 2; queries.at(-1).l();
  assert.deepEqual(seen, [1.5, 2]);
  stop();
  assert.equal(queries.at(-1).l, null, 'smette di ascoltare');
  // senza matchMedia (test, browser vecchi): nessun errore
  assert.equal(typeof watchPixelRatio(() => {}, {}), 'function');
});
