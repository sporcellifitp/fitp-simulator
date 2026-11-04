// B8 (04/11): MediaPipe solo SIMD nel pacchetto offline, riserva dal CDN per i browser senza SIMD, loghi del gioco.
// Serve a tenere lo zip Cloudflare sotto i 25 MB senza perdere la mano e il corpo dalla webcam.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEDIAPIPE_FILES, MEDIAPIPE_POSE_FILES, MEDIAPIPE_PACKAGES, MEDIAPIPE_EXCLUDED, mediapipeAssets, offlineStatus, localAsset, defaultAssetDirs } from '../scripts/offline-assets.mjs';
import { mediapipeFileUrl, mediapipeLocator, MEDIAPIPE_NO_SIMD_FILE } from '../src/natpf/mediapipe_locate.js';
import { MEDIAPIPE_LOCAL_BASE, MEDIAPIPE_CDN_BASE } from '../src/motion_controls.js';
import { MEDIAPIPE_POSE_LOCAL_BASE, MEDIAPIPE_POSE_CDN_BASE, NatpfBodyFollow } from '../src/natpf/webcam_body_follow.js';
import { brandFiles } from '../scripts/natpf-site-plugin.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.resolve(ROOT, '../site');

test('MediaPipe offline: solo il motore SIMD, niente .data vuoti, ogni file c’è in node_modules', () => {
  for (const list of [MEDIAPIPE_FILES, MEDIAPIPE_POSE_FILES]){
    assert.ok(!list.some(f => /_solution_wasm_bin\./.test(f)), `niente motore senza SIMD: ${list}`);
    assert.ok(!list.some(f => /_wasm_bin\.data$/.test(f)), `niente .data vuoti: ${list}`);
    assert.ok(!list.some(f => MEDIAPIPE_EXCLUDED.test(f)));
    assert.equal(new Set(list).size, list.length);
  }
  assert.deepEqual(MEDIAPIPE_FILES, ['hands.js', 'hands_solution_packed_assets_loader.js', 'hands_solution_packed_assets.data', 'hands_solution_simd_wasm_bin.js', 'hands_solution_simd_wasm_bin.wasm', 'hands.binarypb', 'hand_landmark_full.tflite', 'hand_landmark_lite.tflite']);
  assert.deepEqual(MEDIAPIPE_POSE_FILES, ['pose.js', 'pose_solution_packed_assets_loader.js', 'pose_solution_packed_assets.data', 'pose_solution_simd_wasm_bin.js', 'pose_solution_simd_wasm_bin.wasm', 'pose_web.binarypb', 'pose_landmark_lite.tflite']);
  for (const { rel, src } of mediapipeAssets()){
    const stat = fs.statSync(src, { throwIfNoEntry: false });
    assert.ok(stat?.isFile() && stat.size > 0, `${rel}: manca o è vuoto in ${src}`);
  }
  assert.equal(offlineStatus(ROOT, defaultAssetDirs(ROOT)).missing.filter(r => r.startsWith('mediapipe/')).length, 0);
  // il server LAN e il server di sviluppo non servono più i file esclusi (anche se sono in node_modules)
  assert.equal(localAsset('mediapipe/hands/hands_solution_wasm_bin.wasm', defaultAssetDirs(ROOT)), null);
  assert.equal(localAsset('mediapipe/pose/pose_solution_simd_wasm_bin.data', defaultAssetDirs(ROOT)), null);
  assert.ok(localAsset('mediapipe/hands/hands_solution_simd_wasm_bin.wasm', defaultAssetDirs(ROOT)));
});

test('MediaPipe offline: la lista segue quella di hands.js e pose.js (tutto tranne il motore senza SIMD)', () => {
  for (const pkg of MEDIAPIPE_PACKAGES){
    const loader = fs.readFileSync(path.join(ROOT, 'node_modules/@mediapipe', pkg.name, `${pkg.name}.js`), 'utf8');
    const listed = [...loader.matchAll(/\{([^{}]*)url:"([^"]+)"([^{}]*)\}/g)].map(m => ({ url: m[2], simd: /simd:!0/.test(m[1] + m[3]) ? true : /simd:!1/.test(m[1] + m[3]) ? false : undefined }));
    assert.ok(listed.length >= 4, `${pkg.name}.js: lista dei file non trovata (versione cambiata?)`);
    for (const f of listed){
      if (f.simd === false){ assert.ok(!pkg.files.includes(f.url), f.url); assert.match(f.url, MEDIAPIPE_NO_SIMD_FILE); }
      else assert.ok(pkg.files.includes(f.url), `${pkg.name}: manca ${f.url}`);
    }
    // il .js SIMD carica il suo .wasm, il caricatore dei dati il suo .data
    assert.ok(pkg.files.includes(`${pkg.name}_solution_simd_wasm_bin.wasm`) && pkg.files.includes(`${pkg.name}_solution_packed_assets.data`));
  }
});

test('MediaPipe senza SIMD: con la base locale i due file del motore vengono dal CDN fissato, il resto no', () => {
  const hands = { base: MEDIAPIPE_LOCAL_BASE, localBase: MEDIAPIPE_LOCAL_BASE, cdnBase: MEDIAPIPE_CDN_BASE };
  assert.equal(mediapipeFileUrl('hands_solution_wasm_bin.js', hands), 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands_solution_wasm_bin.js');
  assert.equal(mediapipeFileUrl('hands_solution_wasm_bin.wasm', hands), MEDIAPIPE_CDN_BASE + 'hands_solution_wasm_bin.wasm');
  for (const f of ['hands_solution_simd_wasm_bin.js', 'hands_solution_simd_wasm_bin.wasm', 'hands_solution_packed_assets_loader.js', 'hands_solution_packed_assets.data', 'hands.binarypb', 'hand_landmark_lite.tflite', 'hand_landmark_full.tflite'])
    assert.equal(mediapipeFileUrl(f, hands), `/assets/mediapipe/hands/${f}`, f);
  // base già sul CDN (hands.js locale mancante): tutto dal CDN, come prima
  assert.equal(mediapipeFileUrl('hands_solution_wasm_bin.js', { ...hands, base: MEDIAPIPE_CDN_BASE }), MEDIAPIPE_CDN_BASE + 'hands_solution_wasm_bin.js');
  assert.equal(mediapipeFileUrl('hands.binarypb', { ...hands, base: MEDIAPIPE_CDN_BASE }), MEDIAPIPE_CDN_BASE + 'hands.binarypb');
  // un'altra base (es. assoluta): nessuna deviazione
  assert.equal(mediapipeFileUrl('hands_solution_wasm_bin.js', { ...hands, base: 'https://lan.example/assets/mediapipe/hands/' }), 'https://lan.example/assets/mediapipe/hands/hands_solution_wasm_bin.js');
  const pose = mediapipeLocator({ base: MEDIAPIPE_POSE_LOCAL_BASE, localBase: MEDIAPIPE_POSE_LOCAL_BASE, cdnBase: MEDIAPIPE_POSE_CDN_BASE });
  assert.equal(pose('pose_solution_wasm_bin.wasm'), 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose_solution_wasm_bin.wasm');
  assert.equal(pose('pose_solution_simd_wasm_bin.wasm'), '/assets/mediapipe/pose/pose_solution_simd_wasm_bin.wasm');
  assert.equal(pose('pose_landmark_lite.tflite'), '/assets/mediapipe/pose/pose_landmark_lite.tflite');
  // stessa versione del pacchetto npm sul CDN
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).dependencies;
  assert.ok(MEDIAPIPE_CDN_BASE.endsWith(`@mediapipe/hands@${pkg['@mediapipe/hands']}/`));
  assert.ok(MEDIAPIPE_POSE_CDN_BASE.endsWith(`@mediapipe/pose@${pkg['@mediapipe/pose']}/`));
});

const withGlobals = async (values, fn) => {
  const names = Object.keys(values), saved = names.map(k => Object.getOwnPropertyDescriptor(globalThis, k));
  try { Object.assign(globalThis, values); globalThis.window = globalThis; return await fn(); }
  finally {
    delete globalThis.Hands; delete globalThis.Pose;
    names.forEach((k, i) => { if (saved[i]) Object.defineProperty(globalThis, k, saved[i]); else delete globalThis[k]; });
  }
};

test('MediaPipe senza SIMD: Hands e Pose nella pagina passano locateFile con la riserva dal CDN', async () => {
  const { MotionController } = await import('../src/motion_controls.js');
  const made = [];
  class FakeModel { constructor(o){ this.o = o; made.push(this); } setOptions(){} onResults(){} async initialize(){} send(){ return Promise.resolve(); } close(){} }
  await withGlobals({ location: { href: 'https://localhost/', search: '' }, Hands: FakeModel, Pose: FakeModel, window: undefined }, async () => {
    const mc = Object.create(MotionController.prototype);
    Object.assign(mc, { webcamMode: 'argon', webcamActive: true, phoneState: {}, _notifyStatus(){}, _updateWebcamBadgeUI(){} });
    await mc._ensureMediaPipeHands();
    assert.equal(made.length, 1); assert.equal(mc.mpHands, made[0]);
    const hands = made[0].o.locateFile;
    assert.equal(hands('hands_solution_wasm_bin.js'), MEDIAPIPE_CDN_BASE + 'hands_solution_wasm_bin.js');
    assert.equal(hands('hands_solution_wasm_bin.wasm', '/prefisso/'), MEDIAPIPE_CDN_BASE + 'hands_solution_wasm_bin.wasm');
    assert.equal(hands('hands_solution_simd_wasm_bin.wasm'), MEDIAPIPE_LOCAL_BASE + 'hands_solution_simd_wasm_bin.wasm');
    assert.equal(hands('hand_landmark_lite.tflite'), MEDIAPIPE_LOCAL_BASE + 'hand_landmark_lite.tflite');
    // Pose («segui il corpo»)
    const body = Object.create(NatpfBodyFollow.prototype);
    Object.assign(body, { engine: { motionController: { webcamActive: true, _visionEpoch: 0 } }, _changed(){} });
    await body._ensurePose();
    assert.equal(made.length, 2); assert.equal(body.pose, made[1]); assert.equal(body.status, 'searching');
    const pose = made[1].o.locateFile;
    assert.equal(pose('pose_solution_wasm_bin.js'), MEDIAPIPE_POSE_CDN_BASE + 'pose_solution_wasm_bin.js');
    assert.equal(pose('pose_solution_wasm_bin.wasm'), MEDIAPIPE_POSE_CDN_BASE + 'pose_solution_wasm_bin.wasm');
    assert.equal(pose('pose_solution_simd_wasm_bin.js'), MEDIAPIPE_POSE_LOCAL_BASE + 'pose_solution_simd_wasm_bin.js');
    assert.equal(pose('pose_web.binarypb'), MEDIAPIPE_POSE_LOCAL_BASE + 'pose_web.binarypb');
  });
});

test('build del gioco: solo i loghi che il gioco nomina, un logo nominato ma mancante ferma la build', () => {
  assert.deepEqual(brandFiles(SITE, ROOT), ['assets/brand/esports-fitp-neg.png', 'assets/brand/nitto-atp-finals-white.png']);
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const f of brandFiles(SITE, ROOT)) assert.ok(index.includes(`./natpf/${f}`), f);
  // gioco finto: un logo nominato in src/ entra, uno inesistente ferma la build
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-brand-'));
  try {
    fs.mkdirSync(path.join(tmp, 'src/natpf'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'index.html'), '<img src="./natpf/assets/brand/nitto-atp-finals-white.png">');
    fs.writeFileSync(path.join(tmp, 'src/natpf/logo.js'), "export const L = 'natpf/assets/brand/fitp-logo-2023.png';");
    assert.deepEqual(brandFiles(SITE, tmp), ['assets/brand/fitp-logo-2023.png', 'assets/brand/nitto-atp-finals-white.png']);
    fs.writeFileSync(path.join(tmp, 'gioco.css'), '.x { background: url(./natpf/assets/brand/non-esiste.png); }');
    assert.throws(() => brandFiles(SITE, tmp), /logo mancante: site\/assets\/brand\/non-esiste\.png/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
