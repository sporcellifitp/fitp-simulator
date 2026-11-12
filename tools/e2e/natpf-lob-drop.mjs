// NATPF motore base (natpf-tennis/): B24, Lob & Drop come personaggi in campo (src/natpf/natpf_lob_drop.js) e la loro
// opzione «Personaggi in campo: Classici · Lob & Drop» (src/natpf/natpf_personaggi.js, chiave natpf-tennis.personaggi,
// parametro ?personaggi=lobdrop|sempre). Prova nel browser:
//   1) scene ferme e ripetibili (ciclo del gioco fermo, sorteggi fissi, stesse pose): con «Classici» il disegno è
//      identico pixel per pixel a quello di prima del B24 (CONFRONTA=file.json con le impronte fatte sul commit di prima
//      con BASELINE=file.json e GAME=cartella del gioco di prima); con «Lob & Drop» cambia;
//   2) opzione e parametro: di base «Classici», clic su «Lob & Drop» → personaggi cambiati subito e scelta salvata,
//      resta dopo aver ricaricato; ?personaggi= vale per l'avvio senza toccare il valore salvato;
//   3) in campo contro la CPU e nello stesso schermo: chi gioca è Drop, l'altro è Lob, ritratti compresi; i pezzi del
//      tennista sono nascosti, la racchetta resta nella mano, anche per il mancino;
//   4) partita senza persone a passi e sorteggi fissi (un game, colpi di tutti e due): stessa impronta di palla,
//      giocatori e punteggio con i due valori dell'opzione, in pagine appena aperte, e sul commit di prima;
//   5) costo: tempo del disegno dello stesso fotogramma con i due aspetti e fotogrammi al secondo (FPS_MS, DRAW_N).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-lob-drop.mjs
//   SHOTS=cartella (schermate; predefinita nella cartella temporanea) · GAME_PORT (3164) · GAME=cartella del gioco
//   BASELINE=file.json: solo la parte 1, scrive le impronte (da fare sul commit di prima) · CONFRONTA=file.json
//   SOLO=1: solo la parte 1 · TESTA=1: solo la parte 1b (racchetta e testa) · COSTO=1: solo la parte 5 · FOGLI=cartella: solo i fogli di immagini (docs/b24/img)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, check, summary } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = process.env.GAME || path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3164), FPS_MS = +(process.env.FPS_MS || 6000), DRAW_N = +(process.env.DRAW_N || 14);
const SHOTS = process.env.SHOTS || path.join(tmpdir(), 'natpf-lob-drop'); mkdirSync(SHOTS, { recursive: true });
const BASELINE = process.env.BASELINE || '', CONFRONTA = process.env.CONFRONTA || '', FOGLI = process.env.FOGLI || '';
const KEY = 'natpf-tennis.personaggi';
const PHOTO = path.resolve(here, '../../docs/riferimenti/lob-drop-2026-11-11.webp');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const B = await launch();

// pagina del gioco pronta; cast: valore salvato dell'opzione prima dell'avvio ('lobdrop', 'sempre' o null = niente)
async function game({ cast = null, query = 'intro=0', w = 1280, h = 720, hand = null } = {}){
  const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  // sorteggi ripetibili (pubblico, battito degli occhi): stesso generatore a ogni avvio
  await p.addInitScript(({ KEY, cast, hand }) => {
    let a = 20261112; window.__seed = n => { a = n >>> 0; }; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
    try { localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); } catch {}
    // solo al primo avvio della pagina (una ricarica deve trovare quello che ha salvato il gioco)
    try {
      if (!sessionStorage.getItem('b24-prova')){
        if (cast == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, cast);
        if (hand) localStorage.setItem('natpf-tennis.hand', hand);
      }
      sessionStorage.setItem('b24-prova', '1');
    } catch {}
  }, { KEY, cast, hand });
  for (let k = 0; ; k++){
    await p.goto(`http://127.0.0.1:${GAME_PORT}/?${query}`, { waitUntil: 'domcontentloaded', timeout: 120000 });   // a macchina carica il primo avvio è lento
    const ok = await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby, null, { timeout: 60000 }).then(() => true, () => false);
    if (ok) break;
    if (k >= 3) throw new Error('gioco non avviato');
    errs.length = 0;
  }
  await p.waitForTimeout(1500);
  return { ctx, p, errs };
}

// Scena ferma: ciclo del gioco fermato, pagina nascosta tranne il campo, stato delle animazioni azzerato (orologio,
// battito degli occhi, espressioni, molle del corpo), posa scelta, camera scelta, un disegno. Restituisce l'impronta
// dei pixel (FNV-1a), chi c'è in campo e tiene i pixel in window.__px[name] per i confronti.
//   o.pose: 'fermo' | 'dritto' | 'rovescio' | 'servizio' | 'esultanza' · o.who: 'player' | 'opponent' (chi fa il gesto)
//   o.cam: 'gioco' | 'split' | { actor, from: [dx, dy, dz], look: [dx, dy, dz], fov } (camera vicina, davanti = dz < 0
//   nel verso in cui guarda il personaggio) · o.steps: passi di animazione a 1/60 s dopo l'inizio del gesto
const scene = (p, name, o = {}) => p.evaluate(({ name, o }) => {
  const E = __natpfTennis;
  E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
  if (!E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
  for (const el of document.body.querySelectorAll('*')){ const cv = E.renderer.domElement; if (el !== cv && !el.contains(cv)) el.style.visibility = 'hidden'; }
  for (const s of E.starParticles || []){ s.active = false; if (s.mesh) s.mesh.visible = false; }
  E.natpfSplit.active = false; E.swingVfx?.clearAllTrails?.();
  const actors = [E.player, E.opponent];
  // stato di partenza uguale a ogni scena
  E.elapsedTime = 100; E.cheerEnergy = .22;
  for (const a of actors){
    const f = a.facialRig;
    if (f){ f.state = 'neutral'; f.stateTimer = f.stateDuration = 0; f.blinkTimer = 30; f.blinkActiveTimer = 0; f.sweatCooldown = f.panicEmoteCooldown = 9; f.lastSwingTimer = 0; E.facialFX._applyStateVisuals(f); }
    // molle del corpo e della racchetta ricreate da capo: lo stato non dipende da quello che è successo prima
    a.model.scale.setScalar(1.16); a.rig = null; E.bodyAnimator.setupArticulatedPlayerRig(a);   // 1.16: scala del modello nel motore (base del rig)
    a.racketKinematics = null; E.racketKinematics.initActor(a);
    a.natpfReach = null; if (a.model) a.model.rotation.z = 0; if (a.userData) a.userData.natpfPrep = null;
    a.stridePhase = 0; a.swingTimer = 0; a.arcVisibleTimer = 0; a.vel?.set(0, 0, 0);
  }
  for (const s of E.facialFX?.sweatDrops || []){ s.active = false; s.mesh.visible = false; }
  for (const s of E.facialFX?.emoteParticles || []){ s.active = false; s.mesh.visible = false; }
  // scintille e lampi rimasti dalla partita dimostrativa: si lasciano spegnere
  if (!E.__flushed){ E.__flushed = true; for (let i = 0; i < 240; i++){ E._updateEffects(1/30); E.swingVfx?.update(1/30, { actors, ball: E.ball, camera: E.camera }); } }
  for (let i = 0; i < 6; i++) E._natpfBackdropPose();
  const who = o.who === 'opponent' ? E.opponent : E.player, steps = o.steps ?? 10;
  const anim = n => { for (let i = 0; i < n; i++){ E.elapsedTime += 1/60; for (const a of actors) E._updatePlayerAnimation(a, 1/60); } };
  if (o.pose === 'dritto' || o.pose === 'rovescio'){
    E.phase = 'RALLY';
    who.swingType = o.pose === 'dritto' ? 'forehand' : 'backhand'; who.swingDuration = who.swingTimer = .36;
    E.racketKinematics.triggerSwing(who, { shotType: 'topspin', side: who.swingType, speed: 1.1, timing: 'sweet', dirX: 0 });
    anim(steps);
  } else if (o.pose === 'servizio'){
    E.phase = 'SERVE_TOSS'; E.score.server = who.role;
    who.swingType = 'serve'; who.swingDuration = who.swingTimer = .38;
    E.racketKinematics.triggerSwing(who, { shotType: 'serve', side: 'overhead', speed: 1.2, timing: 'sweet', isServe: true, dirX: 0 });
    anim(steps);
  } else if (o.pose === 'esultanza'){
    E.bodyAnimator.triggerPointReaction(who, 'win'); E.facialFX.setExpression(who, 'happy_grin', 3);
    anim(steps);
  }
  E.cameraMode = 'RALLY_CAM';
  E._snapCameraImmediate(); E._updateEffects(0);
  const multi0 = E.isMultiplayer; if (o.multi) E.isMultiplayer = true;       // tra due persone: l'altro è il Player 2
  E.natpfDrawnAt = NaN;                                  // scena ferma: la racchetta scostata va subito al suo posto (natpf_racket_clear.js)
  const cam = o.cam || 'gioco';
  if (cam === 'split'){ E.phase = 'RALLY'; E.natpfSplit.active = true; E.render(); E.render(); }
  else {
    if (typeof cam === 'object'){
      const a = cam.actor === 'opponent' ? E.opponent : E.player, f = a.sideSign > 0 ? -1 : 1;   // f: verso in cui guarda (z)
      const at = (d) => [a.pos.x - f*d[0], d[1], a.pos.z + f*d[2]];
      E.camera.fov = cam.fov || 30; E.camera.updateProjectionMatrix();
      E.camera.position.set(...at(cam.from)); E.camera.lookAt(...at(cam.look)); E.camera.updateMatrixWorld();
    }
    E.render();
  }
  const gl = E.renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W*H*4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let hash = 0x811c9dc5; for (let i = 0; i < px.length; i++){ hash ^= px[i]; hash = Math.imul(hash, 0x01000193) >>> 0; }
  (window.__px ||= {})[name] = px;
  if (typeof cam === 'object'){ E._onResize?.(); }
  E.isMultiplayer = multi0; E.natpfSplit.active = false;
  const seen = a => { const out = []; a.root.traverse(o => { if (!o.isMesh) return; for (let q = o; q; q = q.parent) if (!q.visible) return; out.push(o.name); }); return out; };
  const hand = a => { const g = a.racketMesh, v = g.localToWorld(g.position.clone().set(0, .08, 0)), h = a.parts.handR.getWorldPosition(v.clone()); return +h.distanceTo(v).toFixed(3); };
  return { hash: hash.toString(16), W, H, looks: [E.player.natpfLook, E.opponent.natpfLook], mascots: [E.player.natpfMascot || null, E.opponent.natpfMascot || null],
    seen: [seen(E.player), seen(E.opponent)], grip: [hand(E.player), hand(E.opponent)], mirror: [E.player.root.scale.x < 0, E.opponent.root.scale.x < 0] };
}, { name, o });
const diff = (p, a, b) => p.evaluate(({ a, b }) => { const A = __px[a], Bx = __px[b]; let n = 0; for (let i = 0; i < A.length; i += 4) if (A[i] !== Bx[i] || A[i + 1] !== Bx[i + 1] || A[i + 2] !== Bx[i + 2]) n++; return n; }, { a, b });
// dove stanno i pixel diversi tra due scene (riquadro, dal basso a sinistra): serve quando una scena non è ripetibile
const where = (p, a, b) => p.evaluate(({ a, b }) => { const A = __px[a], Bx = __px[b], E = __natpfTennis, gl = E.renderer.getContext(), W = gl.drawingBufferWidth; let n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let i = 0; i < A.length; i += 4) if (A[i] !== Bx[i] || A[i + 1] !== Bx[i + 1] || A[i + 2] !== Bx[i + 2]){ n++; const x = (i/4) % W, y = Math.floor(i/4/W); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return n ? `${n} pixel diversi tra x ${x0}–${x1} e y ${y0}–${y1}` : 'nessun pixel diverso'; }, { a, b });
const shot = (p, name) => p.locator('canvas').first().screenshot({ path: path.join(SHOTS, `${name}.png`) });
const setCast = (p, v) => p.evaluate(v => __natpfTennis.natpfUi.lobby.setCast(v), v);

const NEAR = { front: { from: [0, 1.35, 5.3], look: [0, 1.08, 0], fov: 28 }, back: { from: [0, 1.35, -5.3], look: [0, 1.08, 0], fov: 28 }, side: { from: [5.3, 1.35, 0], look: [0, 1.08, 0], fov: 28 } };
const SCENES = {
  fermo: { pose: 'fermo' },
  dritto: { pose: 'dritto', steps: 6 },
  servizio: { pose: 'servizio', steps: 5 },
  esultanza: { pose: 'esultanza', steps: 22 },
  avversario: { pose: 'dritto', who: 'opponent', steps: 6 },
  vicino: { pose: 'fermo', cam: { actor: 'player', ...NEAR.front } },
  'vicino-cpu': { pose: 'fermo', cam: { actor: 'opponent', ...NEAR.front } },
  split: { pose: 'fermo', cam: 'split', multi: true },
  'due-persone': { pose: 'rovescio', who: 'opponent', steps: 6, multi: true },
};

// Partita senza persone (le due parti giocano da sole) a passi fissi e sorteggi fissi, un minuto di gioco: impronta di
// palla, giocatori e punteggio. Deve essere la stessa con i due valori dell'opzione e sul commit di prima (niente cambia
// nel gioco). Si confronta tra pagine appena aperte.
// o.mode: 'demo' (le due parti giocano da sole; è la partita di sempre), 'cpu' (partita vera contro la CPU, un robot fa
// i gesti di chi gioca), 'schermo' (stesso schermo: due robot). A ogni passo si fa anche il lavoro che il gioco fa prima
// di disegnare (personaggi, racchetta fuori dalla testa grande), senza disegnare: la partita deve restare la stessa.
// o.clip: misura a ogni passo di quante volte il telaio della racchetta è dentro la testa della mascotte, prima (dove
// la mette il motore) e dopo lo scostamento di natpf_racket_clear.js; al colpo, distanza tra corde e palla prima e dopo.
// o.stops: passi a cui fare una foto da vicino (prima e dopo).
const play = (p, o = {}) => p.evaluate(o => {
  const E = __natpfTennis, { steps = 3600, mode = 'demo', seed = 4242, clip = false, stops = [] } = o;
  if (!E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
  E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.userHasInteracted = true; E.natpfPaused = false;
  for (const a of [E.player, E.opponent]){
    a.model.scale.setScalar(1.16); a.rig = null; E.bodyAnimator.setupArticulatedPlayerRig(a); a.racketKinematics = null; E.racketKinematics.initActor(a);
    a.natpfReach = null; if (a.userData) a.userData.natpfPrep = null; a.stridePhase = 0; a.swingTimer = 0; a.vel?.set(0, 0, 0);
  }
  E._natpfBackdropPose();
  // stesso schermo: un disegno «a vuoto» con il Player 2 PRIMA del seme. I pezzi e i materiali che nascono al primo
  // cambio di aspetto chiedono un nome a three.js, che lo sorteggia con Math.random: senza questo passo la sequenza dei
  // sorteggi si sposta e le partite a seme fisso non sono confrontabili (non cambia il gioco, solo la prova)
  if (mode === 'schermo'){ const m0 = E.isMultiplayer; E.isMultiplayer = true; E.render(); E.isMultiplayer = m0; }
  window.__seed(seed); E.elapsedTime = 0; E.physicsAccumulator = 0;
  if (mode === 'demo'){ E.autoPlayMode = true; E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = true; }
  else { E.autoPlayMode = false; if (mode === 'schermo') E.startSplit(); E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = false; }
  // il lavoro di prima del disegno, senza disegnare
  const draw = E.renderer.render, before = () => { E.renderer.render = () => {}; try { E.render(); } finally { E.renderer.render = draw; } };
  let h = 0x811c9dc5, hits = 0, last = 0, pts = 0, score = '';
  const eat = v => { const n = Math.round(v*1000) | 0; for (let k = 0; k < 4; k++){ h ^= (n >>> (k*8)) & 255; h = Math.imul(h, 0x01000193) >>> 0; } };
  const evt = extra => ({ speed: 1.18, shotType: 'topspin', source: 'keyboard', ...extra });
  // misura della racchetta nella testa (metodo della revisione: 24 punti del telaio contro l'ellissoide della testa)
  const HEADS = { drop: { rx: .385, ry: .33, rz: .34, cy: .13 }, lob: { rx: .35, ry: .335, rz: .33, cy: .135 }, uomo: { rx: .27, ry: .245, rz: .235, cy: .18 } };
  const v3 = E.player.pos.clone(), w3 = v3.clone(), actors = [['player', E.player], ['opponent', E.opponent]];
  const C = { n: 0, prima: { player: 0, opponent: 0 }, dopo: { player: 0, opponent: 0 }, pose: {}, scostata: { player: 0, opponent: 0 }, max: { player: 0, opponent: 0 }, somma: { player: 0, opponent: 0 },
    salto: { player: 0, opponent: 0 }, uomo: { player: 0, opponent: 0 }, colpi: [], foto: [], esempi: {} };
  const depth = (a, M = HEADS[a.natpfMascot]) => {
    if (!M) return 9;
    a.root.updateMatrixWorld(true);
    const inv = a.parts.head.matrixWorld.clone().invert(); let f = 9;
    for (let q = 0; q < 24; q++){ const t = q/24*Math.PI*2; v3.set(.172*Math.cos(t), .545 + .215*Math.sin(t), 0); a.racketMesh.localToWorld(v3).applyMatrix4(inv); f = Math.min(f, (v3.x/M.rx)**2 + ((v3.y - M.cy)/M.ry)**2 + (v3.z/M.rz)**2); }
    return Math.sqrt(f);
  };
  const strings = a => { a.root.updateMatrixWorld(true); return a.racketMesh.localToWorld(v3.set(0, .545, 0)).distanceTo(E.ball.pos); };
  // foto da vicino della testa (il lavoro di prima del disegno è già stato fatto: qui solo il disegno, da un'altra camera)
  const photo = (a, label) => {
    const cam = E.camera.clone(), fz = a.sideSign > 0 ? -1 : 1, hp = a.parts.head.getWorldPosition(w3);
    cam.fov = 24; cam.aspect = E.camera.aspect; cam.updateProjectionMatrix();
    cam.position.set(hp.x + 2.6, hp.y + .9, hp.z + fz*2.4); cam.lookAt(hp.x, hp.y, hp.z); cam.updateMatrixWorld();
    E.renderer.render(E.scene, cam);
    return { label, src: E.renderer.domElement.toDataURL('image/jpeg', .9) };
  };
  // dove la racchetta la mette il motore (senza lo scostamento): profondità nella testa e distanza corde–palla
  const rawOf = a => { const q = a.racketMesh.position, x = q.x, y = q.y, z = q.z; q.set(0, 0, 0); const r = [depth(a), strings(a), depth(a, HEADS.uomo)]; q.set(x, y, z); return r; };
  const prev = { player: 0, opponent: 0 }, since = { player: 99, opponent: 99 };   // since: passi dalla fine dell'ultimo colpo
  for (let i = 0; i < steps; i++){
    if (mode !== 'demo'){
      const s = E.score.server, b = E.ball;
      if (E.phase === 'SERVE_STANCE' && E.phaseTimer > .9){ if (s === 'player') E._handleUserTossInput({}); else if (mode === 'schermo') E._handleP2TossInput({}); }
      else if (E.phase === 'SERVE_TOSS' && b.vel.y < .6 && E.phaseTimer > .3 && i % 3 === 0){ if (s === 'player') E._handleUserSwingInput(evt({ shotType: 'flat', speed: 1.3 })); else if (mode === 'schermo') E._handleP2SwingInput(evt({ shotType: 'flat', speed: 1.3 })); }
      else if (E.phase === 'RALLY' && i % 7 === 0){
        if (b.lastHitter === 'opponent' && b.pos.z > 5) E._handleUserSwingInput(evt({ shotType: i % 3 ? 'topspin' : 'slice' }));
        if (mode === 'schermo' && b.lastHitter === 'player' && b.pos.z < -5) E._handleP2SwingInput(evt({ shotType: i % 2 ? 'topspin' : 'lob' }));
      }
    }
    E.update(1/60);
    const b = E.ball, s = E.score, hit = b.rallyStrokeCount > last;
    if (b.rallyStrokeCount !== last){ if (hit) hits++; last = b.rallyStrokeCount; }
    if (o.noClear) for (const [, a] of actors) a.natpfHeadShape = null;      // senza la correzione (per le foto di «prima»)
    const raw = clip ? actors.map(([, a]) => rawOf(a)) : null;
    // una volta per passo, come nel gioco: ogni tanto disegnando davvero, le altre volte solo il lavoro di prima
    if (i % 300 === 0) E.render(); else before();
    if (clip){
      C.n++;
      actors.forEach(([k, a], n) => {
        since[k] = a.swingTimer > 0 ? 0 : since[k] + 1;
        const now = depth(a), push = a.natpfRacketPush || 0;
        const kind = `${a.natpfMascot}:${a.swingTimer > 0 ? a.swingType : since[k] <= 20 ? 'ritorno dopo il colpo' : E.phase === 'RALLY' ? 'attesa nello scambio' : E.phase}`;
        if (raw[n][2] < 1) C.uomo[k]++;
        if (raw[n][0] < 1){ C.prima[k]++; (C.pose[kind] ||= [0, 0])[0]++; }
        if (now < 1){ C.dopo[k]++; (C.pose[kind] ||= [0, 0])[1]++; }
        if (push > 0){ C.scostata[k]++; C.somma[k] += push; C.max[k] = Math.max(C.max[k], push); }
        C.salto[k] = Math.max(C.salto[k], Math.abs(push - prev[k])); prev[k] = push;
        if (push > (C.esempi[kind]?.push || 0) && now >= 1) C.esempi[kind] = { passo: i, push };
        if (hit && b.lastHitter === k) C.colpi.push({ passo: i, chi: a.natpfMascot, tipo: a.swingType, scostamento: +push.toFixed(4), prima: +raw[n][1].toFixed(3), dopo: +strings(a).toFixed(3) });
      });
    }
    if (stops.includes(i)) for (const [, a] of actors) C.foto.push(photo(a, `${a.natpfMascot === 'drop' ? 'Drop' : 'Lob'}, passo ${i}`));
    const sc = `${s.playerPoints}-${s.opponentPoints}/${s.playerGames}-${s.opponentGames}`;
    if (sc !== score){ score = sc; pts++; }
    if (i % 6 === 0) for (const v of [b.pos.x, b.pos.y, b.pos.z, E.player.pos.x, E.player.pos.z, E.opponent.pos.x, E.opponent.pos.z, s.playerPoints, s.opponentPoints, s.playerGames, s.opponentGames]) eat(v);
  }
  E.autoPlayMode = false;
  return { hash: h.toString(16), hits, changes: pts - 1, score, looks: [E.player.natpfLook, E.opponent.natpfLook], clip: clip ? C : null, foto: C.foto };
}, o);
// partite a sorteggi fissi con i robot (parte 1b): contro la CPU e nello stesso schermo
const RUNS = { cpu: { mode: 'cpu', seed: 31337, steps: 2600 }, schermo: { mode: 'schermo', seed: 555, steps: 2600 } };

/* ---------- fogli di immagini (docs/b24/img): solo con FOGLI=cartella ---------- */
if (FOGLI){
  mkdirSync(FOGLI, { recursive: true });
  const photo = `data:image/webp;base64,${readFileSync(PHOTO).toString('base64')}`;
  const png = async (p) => `data:image/png;base64,${(await p.locator('canvas').first().screenshot()).toString('base64')}`;
  const blank = await (await B.newContext({ viewport: { width: 800, height: 600 } })).newPage();
  // foglio: griglia di immagini con la didascalia sotto; webp sotto i 300 kB (la qualità scende finché ci sta)
  async function sheet(file, tiles, { cols, w, h, title }){
    const out = await blank.evaluate(async ({ tiles, cols, w, h, title }) => {
      const rows = Math.ceil(tiles.length/cols), pad = 8, cap = 26, top = title ? 40 : 0;
      const c = document.createElement('canvas'); c.width = cols*(w + pad) + pad; c.height = top + rows*(h + cap + pad) + pad;
      const g = c.getContext('2d'); g.fillStyle = '#10131c'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#ffffff'; g.font = 'bold 20px Arial, sans-serif'; g.textBaseline = 'middle';
      if (title) g.fillText(title, pad, 22);
      for (let i = 0; i < tiles.length; i++){
        const img = new Image(); img.src = tiles[i].src; await img.decode();
        const x = pad + (i % cols)*(w + pad), y = top + pad + Math.floor(i/cols)*(h + cap + pad);
        // ritaglio al centro, senza deformare
        const k = Math.max(w/img.width, h/img.height)*(tiles[i].zoom || 1), sw = w/k, sh = h/k;
        g.fillStyle = '#ffffff'; g.fillRect(x, y, w, h);
        g.drawImage(img, (img.width - sw)/2 + (tiles[i].dx || 0)*img.width, (img.height - sh)/2 + (tiles[i].dy || 0)*img.height, sw, sh, x, y, w, h);
        g.fillStyle = '#dfe6f5'; g.font = '15px Arial, sans-serif'; g.fillText(tiles[i].label, x + 2, y + h + cap/2 + 1);
      }
      for (let q = .86; q > .3; q -= .06){ const u = c.toDataURL('image/webp', q); if (u.length*.75 < 290000) return { u, q, W: c.width, H: c.height }; }
      return { u: c.toDataURL('image/webp', .3), q: .3, W: c.width, H: c.height };
    }, { tiles, cols, w, h, title });
    const buf = Buffer.from(out.u.split(',')[1], 'base64');
    writeFileSync(path.join(FOGLI, file), buf);
    console.log(`foglio ${file}: ${out.W}×${out.H}, ${buf.length} B, qualità ${out.q.toFixed(2)}`);
    check(`foglio ${file} sotto i 300 kB`, buf.length < 300000, `${buf.length} B`);
  }
  // FOGLIO=nome: solo un gruppo di fogli (racchetta, vicino, mancini, campo)
  const want = n => !process.env.FOGLIO || process.env.FOGLIO === n;
  // 0) racchetta e testa grande: gli stessi passi della stessa partita, prima e dopo la correzione
  if (want('racchetta')){
    const g0 = await game({ cast: 'lobdrop', w: 640, h: 480 }), m = await play(g0.p, { ...RUNS.cpu, clip: true }); await g0.ctx.close();
    const kinds = ['drop:attesa nello scambio', 'lob:attesa nello scambio', 'drop:ritorno dopo il colpo', 'lob:backhand'].filter(k => m.clip.esempi[k]);
    const stops = kinds.map(k => m.clip.esempi[k].passo), shots = {};
    for (const noClear of [true, false]){ const g = await game({ cast: 'lobdrop', w: 640, h: 480 }); shots[noClear] = (await play(g.p, { ...RUNS.cpu, noClear, stops })).foto; await g.ctx.close(); }
    const order = [...stops].sort((a, b) => a - b), tiles = [];
    kinds.forEach((k, n) => {
      const at = order.indexOf(stops[n])*2 + (k.startsWith('drop') ? 0 : 1), what = k.split(':')[1].replace('backhand', 'rovescio');
      tiles.push({ src: shots.true[at].src, label: `${shots.true[at].label}, ${what}: prima` }, { src: shots.false[at].src, label: `Dopo: racchetta scostata di ${(m.clip.esempi[k].push*116).toFixed(0)} cm` });
    });
    await sheet('racchetta-e-testa.webp', tiles, { cols: 4, w: 400, h: 300, title: 'Racchetta e testa grande: gli stessi passi della stessa partita, prima e dopo la correzione' });
  }
  // 1) da vicino: davanti, dietro, di lato, accanto alla foto
  if (want('vicino')){
  const near = await game({ cast: 'lobdrop', w: 560, h: 640 });
  const closeUp = async (actor, view, extra = {}) => { await scene(near.p, `v-${actor}-${view}`, { pose: 'fermo', ...extra, cam: { actor, ...NEAR[view] } }); return png(near.p); };
  for (const [actor, nome] of [['player', 'Drop'], ['opponent', 'Lob']]){
    const tiles = [{ src: photo, label: 'Foto di riferimento', zoom: 1.5, dx: actor === 'player' ? -.2 : .257, dy: .05 }];
    for (const [v, l] of [['front', 'davanti'], ['side', 'di lato'], ['back', 'dietro']]) tiles.push({ src: await closeUp(actor, v), label: `${nome} nel gioco, ${l}` });
    await sheet(`${nome.toLowerCase()}-da-vicino.webp`, tiles, { cols: 4, w: 400, h: 460, title: `${nome}: foto di riferimento e personaggio nel gioco` });
  }
  // 2) i gesti da vicino: dritto, rovescio, servizio, esultanza (stesse animazioni del tennista)
  const gest = [];
  for (const [actor, nome] of [['player', 'Drop'], ['opponent', 'Lob']])
    for (const [pose, steps, l, view] of [['dritto', 6, 'dritto', 'front'], ['servizio', 5, 'servizio', 'front'], ['esultanza', 22, 'esultanza', 'front'], ['rovescio', 6, 'rovescio', 'back']])
      gest.push({ src: await closeUp(actor, view, { pose, steps, who: actor }), label: `${nome}: ${l}${view === 'back' ? ' (da dietro)' : ''}` });
  await sheet('gesti-da-vicino.webp', gest, { cols: 4, w: 380, h: 430, title: 'Lob & Drop: stesse animazioni dei personaggi classici' });
  await near.ctx.close();
  }
  // 3) mancini: lo specchio, la scritta resta leggibile
  if (want('mancini')){
  const left = await game({ cast: 'lobdrop', w: 560, h: 640, hand: 'left' });
  await left.p.evaluate(() => { const E = __natpfTennis; E.natpfUi.hand?.update?.(null); E.opponent.root.scale.x = -Math.abs(E.opponent.root.scale.x); });
  const lt = [];
  for (const [actor, nome] of [['player', 'Drop'], ['opponent', 'Lob']])
    for (const [pose, steps, l] of [['fermo', 0, 'fermo'], ['dritto', 6, 'dritto']]){
      await left.p.evaluate(() => { const E = __natpfTennis; E.natpfUi.hand?.update?.(null); E.opponent.root.scale.x = -Math.abs(E.opponent.root.scale.x); });
      const info = await scene(left.p, `m-${actor}-${pose}`, { pose, steps, who: actor, cam: { actor, ...NEAR.front } });
      lt.push({ src: await png(left.p), label: `${nome} mancino: ${l}${info.mirror[actor === 'player' ? 0 : 1] ? '' : ' (NON specchiato)'}` });
    }
  await sheet('mancini.webp', lt, { cols: 4, w: 380, h: 430, title: 'Mancini: personaggio specchiato, racchetta nella mano sinistra, scritta leggibile' });
  await left.ctx.close();
  }
  // 4) in campo dalla camera di gioco: fermo, dritto, servizio, esultanza; stesso schermo; «Classici» accanto
  if (want('campo')){
  const court = await game({ cast: 'lobdrop', w: 1280, h: 720 });
  const ct = [];
  for (const [n, l] of [['fermo', 'In campo, camera di gioco'], ['dritto', 'Dritto di Drop'], ['servizio', 'Servizio di Drop'], ['esultanza', 'Esultanza di Drop'], ['avversario', 'Dritto di Lob'], ['split', 'Stesso schermo: Player 1 = Drop, Player 2 = Lob']]){
    await scene(court.p, `c-${n}`, SCENES[n]); const src = await png(court.p);
    ct.push({ src, label: l });
    // ingrandimento della stessa immagine su chi fa il gesto (3 volte)
    if (n !== 'split') ct.push({ src, label: `${l} (ingrandito 3 volte)`, zoom: 3, dx: n === 'avversario' ? -.005 : .05, dy: n === 'avversario' ? -.1 : .26 });
  }
  await sheet('in-campo.webp', ct, { cols: 4, w: 480, h: 270, title: 'Lob & Drop in campo dalla camera di gioco' });
  await setCast(court.p, 'sempre');
  const cmp = [];
  for (const [cast, l] of [['sempre', 'Classici'], ['lobdrop', 'Lob & Drop']]){
    await setCast(court.p, cast);
    for (const n of ['fermo', 'split']){ await scene(court.p, `k-${cast}-${n}`, SCENES[n]); cmp.push({ src: await png(court.p), label: `${l}${n === 'split' ? ', stesso schermo' : ''}` }); }
  }
  await sheet('confronto-classici.webp', cmp, { cols: 2, w: 640, h: 360, title: 'Opzioni → Personaggi in campo: «Classici» e «Lob & Drop»' });
  await court.ctx.close();
  }
  await B.close(); summary(); process.exit(process.exitCode || 0);
}

const HUMAN = /^Natpf(Polo|Colletto|Abbottonatura|Bottoni|Pantaloncini|Collo|Testa|Capelli|Fascia|Orecchie|Naso|ManoDx|ManoSx|Scarpa|Suola|Manica|Orlo|Calza)/;
const MASCOT = /^Natpf(Drop|Lob)|^NatpfOcchio|^NatpfBoccaAperta|^NatpfLingua/;

/* ---------- 1) scene ferme: «Classici» identico a prima, «Lob & Drop» diverso, ritorno identico ---------- */

const prints = {};
if (!process.env.COSTO && !process.env.TESTA){
  const g = await game({ cast: BASELINE ? null : 'sempre' }), p = g.p;
  // la partita si gioca per prima, a pagina appena aperta: una seconda partita nella stessa pagina parte da uno stato
  // diverso (resti della prima) e non è confrontabile; il confronto si fa tra pagine nuove (qui sotto, con Lob & Drop)
  const pa = await play(p);
  prints.partita = pa.hash;
  check('partita senza persone, sorteggi fissi: giocata (colpi e punti)', pa.hits >= 8 && pa.changes >= 3 && pa.looks.join() === 'p1,cpu', `${pa.hash}, ${pa.hits} colpi, punteggio ${pa.score} (${pa.changes} cambi)`);
  for (const [name, o] of Object.entries(SCENES)){
    const a = await scene(p, `${name}-a`, o), b = await scene(p, `${name}-b`, o);
    prints[name] = a.hash;
    check(`${name}: scena ripetibile (stessa impronta due volte)`, a.hash === b.hash && await diff(p, `${name}-a`, `${name}-b`) === 0, `${a.hash} / ${b.hash}, ${await where(p, `${name}-a`, `${name}-b`)}`);
    if (!BASELINE){
      check(`${name}: «Classici» → i personaggi di prima, nessun pezzo delle mascotte`, a.looks[0] === 'p1' && a.looks[1] === (o.multi ? 'p2' : 'cpu') && !a.seen.flat().some(n => MASCOT.test(n)) && a.seen[0].some(n => HUMAN.test(n)), JSON.stringify(a.looks));
      await shot(p, `b24-${name}-sempre`);
    }
  }
  check('«Classici»: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  if (BASELINE){
    for (const [name, run] of Object.entries(RUNS)){ const m = await game({ cast: null, w: 640, h: 360 }); prints[`partita-${name}`] = (await play(m.p, run)).hash; await m.ctx.close(); }
    writeFileSync(BASELINE, JSON.stringify(prints, null, 2));
    console.log(`impronte di riferimento scritte in ${BASELINE}`);
    await g.ctx.close(); await B.close(); summary(); process.exit(process.exitCode || 0);
  }
  if (CONFRONTA && existsSync(CONFRONTA)){
    const ref = JSON.parse(readFileSync(CONFRONTA, 'utf8'));
    for (const name of Object.keys(prints)) check(`${name}: «Classici» → ${name === 'partita' ? 'partita identica' : 'disegno identico'} a prima del B24`, ref[name] === prints[name], `${ref[name]} prima, ${prints[name]} ora`);
  } else console.log('(senza CONFRONTA=file.json: niente confronto con il commit di prima del B24)');

  // stessa pagina, «Lob & Drop» al volo: il disegno cambia, il gioco no; di nuovo «Classici»: disegno di prima
  await setCast(p, 'lobdrop');
  for (const [name, o] of Object.entries(SCENES)){
    const a = await scene(p, `${name}-m`, o), d = await diff(p, `${name}-a`, `${name}-m`);
    await shot(p, `b24-${name}-lobdrop`);
    check(`${name}: «Lob & Drop» → chi gioca è Drop, l'altro è Lob; disegno diverso`, a.looks.join() === 'drop,lob' && a.mascots.join() === 'drop,lob' && a.hash !== prints[name] && d > 150, `${a.looks}, ${d} pixel diversi`);
    if (name === 'fermo' || name === 'split'){
      const [dr, lo] = a.seen;
      check(`${name}: pezzi di Drop e di Lob in scena, quelli del tennista nascosti, racchetta nella mano`,
        dr.includes('NatpfDropTesta') && dr.includes('NatpfDropFascia') && dr.includes('NatpfDropScritta') && !dr.some(n => /^NatpfLob/.test(n) || HUMAN.test(n))
        && lo.includes('NatpfLobTesta') && lo.includes('NatpfLobVisiera') && lo.includes('NatpfLobOcchiali') && lo.includes('NatpfLobScritta') && !lo.some(n => /^NatpfDrop/.test(n) || HUMAN.test(n))
        && dr.includes('NatpfTelaio') && lo.includes('NatpfTelaio') && a.grip[0] < .05 && a.grip[1] < .05, `mano–manico ${a.grip.join(' e ')} m`);
    }
  }
  await setCast(p, 'sempre');
  for (const [name, o] of Object.entries(SCENES)){
    const a = await scene(p, `${name}-r`, o);
    check(`${name}: tornati a «Classici» → disegno identico a prima`, a.hash === prints[name] && await diff(p, `${name}-a`, `${name}-r`) === 0, `${a.hash} / ${prints[name]}`);
  }
  check('cambio al volo: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
  // la stessa partita in due pagine nuove, una con «Lob & Drop» e una con «Classici»: stessa impronta (niente cambia
  // nel gioco, e la partita è ripetibile)
  for (const [cast, looks] of [['lobdrop', 'drop,lob'], ['sempre', 'p1,cpu']]){
    const m = await game({ cast }), pm = await play(m.p);
    check(`pagina nuova con «${cast === 'lobdrop' ? 'Lob & Drop' : 'Classici'}»: partita con la stessa impronta (niente cambia nel gioco)`, pm.hash === prints.partita && pm.looks.join() === looks && !m.errs.length, `${pm.hash} / ${prints.partita}, in campo ${pm.looks}, ${pm.hits} colpi, punteggio ${pm.score}`);
    await m.ctx.close();
  }
  if (process.env.SOLO){ await B.close(); summary(); process.exit(process.exitCode || 0); }
}

/* ---------- 1b) racchetta fuori dalla testa grande, partita vera contro la CPU e nello stesso schermo ---------- */
// Revisione del 12/11: con la testa grande la racchetta entrava nella testa. Stessa partita della revisione (contro la
// CPU, seme 31337, 2600 passi, un robot al posto di chi gioca): quanti passi con il telaio dentro la testa prima e dopo,
// quanto si scosta la racchetta, e al colpo le corde sono dove erano. La partita è la stessa con i due valori
// dell'opzione, contro la CPU e nello stesso schermo (con il disegno a vuoto prima del seme: vedi play).
if (!process.env.COSTO){
  const ref = CONFRONTA && existsSync(CONFRONTA) ? JSON.parse(readFileSync(CONFRONTA, 'utf8')) : {};
  for (const [name, run] of Object.entries(RUNS)){
    if (process.env.TESTA && process.env.TESTA !== '1' && process.env.TESTA !== name) continue;
    const out = {};
    for (const cast of ['sempre', 'lobdrop']){
      const g = await game({ cast, w: 640, h: 360 });
      out[cast] = await play(g.p, { ...run, clip: cast === 'lobdrop' });
      check(`partita ${name} con «${cast === 'lobdrop' ? 'Lob & Drop' : 'Classici'}»: nessun errore`, !g.errs.length, g.errs.join(' | ').slice(0, 300));
      await g.ctx.close();
    }
    const A = out.sempre, M = out.lobdrop, c = M.clip;
    check(`partita ${name}, sorteggi fissi: giocata, stessa impronta con «Classici» e con «Lob & Drop» (niente cambia nel gioco)`, A.hits >= 6 && A.hash === M.hash && M.looks.join() === 'drop,lob', `${A.hash} / ${M.hash}, ${A.hits} colpi, ${M.looks}`);
    if (ref[`partita-${name}`]) check(`partita ${name}: identica a prima del B24`, ref[`partita-${name}`] === A.hash, `${ref[`partita-${name}`]} / ${A.hash}`);
    const pct = n => `${n} su ${c.n} (${(n*100/c.n).toFixed(1)}%)`;
    console.log(`racchetta e testa, partita ${name}: telaio dentro la testa · Drop prima ${pct(c.prima.player)}, dopo ${pct(c.dopo.player)} · Lob prima ${pct(c.prima.opponent)}, dopo ${pct(c.dopo.opponent)}`);
    console.log(`  per confronto, sugli stessi passi con la testa del tennista di sempre: ${pct(c.uomo.player)} e ${pct(c.uomo.opponent)}`);
    console.log(`  dove (passi prima → dopo): ${Object.entries(c.pose).map(([k, v]) => `${k} ${v[0]} → ${v[1]}`).join(' · ')}`);
    for (const [k, n] of [['player', 'Drop'], ['opponent', 'Lob']]) console.log(`  ${n}: racchetta scostata in ${pct(c.scostata[k])}, in media ${(c.somma[k]/Math.max(1, c.scostata[k])*116).toFixed(1)} cm, al massimo ${(c.max[k]*116).toFixed(1)} cm; salto più grande tra due passi ${(c.salto[k]*116).toFixed(1)} cm`);
    const moved = c.colpi.filter(x => x.scostamento > 0);
    console.log(`  colpi ${c.colpi.length}, con la racchetta scostata al colpo: ${moved.length}${moved.length ? ' → ' + JSON.stringify(moved) : ''}`);
    check(`partita ${name}: prima il telaio entrava nella testa (la misura morde)`, c.prima.player + c.prima.opponent > 100, `${c.prima.player} + ${c.prima.opponent}`);
    // nelle pose tenute (attesa nello scambio) la racchetta è fuori; restano i passaggi veloci (colpo e ritorno dopo
    // il colpo), dove lo scostamento è morbido e parziale: meno di metà di prima e non più spesso di quanto capita al
    // tennista di sempre con la sua testa piccola
    const wait = Object.entries(c.pose).filter(([k]) => /attesa/.test(k)).reduce((t, [, v]) => [t[0] + v[0], t[1] + v[1]], [0, 0]);
    check(`partita ${name}: nell'attesa dello scambio il telaio non resta più nella testa (al più un ottavo di prima: l'ingresso nella posa e la palla in arrivo)`, wait[0] > 100 && wait[1] <= wait[0]*.125, `${wait[0]} → ${wait[1]} passi`);
    check(`partita ${name}: telaio dentro la testa in meno di metà dei passi di prima`, c.dopo.player <= c.prima.player*.5 && c.dopo.opponent <= c.prima.opponent*.5, `Drop ${c.prima.player} → ${c.dopo.player}, Lob ${c.prima.opponent} → ${c.dopo.opponent}`);
    check(`partita ${name}: non più spesso che al tennista di sempre con la sua testa`, c.dopo.player + c.dopo.opponent <= c.uomo.player + c.uomo.opponent, `mascotte ${c.dopo.player} + ${c.dopo.opponent}, tennista ${c.uomo.player} + ${c.uomo.opponent}`);
    check(`partita ${name}: la racchetta non fa scatti (al più 16 cm tra due passi, cioè la velocità di rientro con la palla in arrivo)`, Math.max(c.salto.player, c.salto.opponent)*116 <= 16, `${(c.salto.player*116).toFixed(1)} e ${(c.salto.opponent*116).toFixed(1)} cm`);
    check(`partita ${name}: al colpo le corde sono dove erano (punto d'impatto non cambiato)`, c.colpi.length >= 6 && c.colpi.every(x => Math.abs(x.dopo - x.prima) < .001), JSON.stringify(moved).slice(0, 300));
  }
  if (process.env.TESTA){ await B.close(); summary(); process.exit(process.exitCode || 0); }
}

/* ---------- 2) opzione e parametro ---------- */
if (!process.env.COSTO){
  const def = await game({ cast: null }), p = def.p;
  const d0 = await p.evaluate(K => ({ saved: localStorage.getItem(K), looks: [__natpfTennis.player.natpfLook, __natpfTennis.opponent.natpfLook] }), KEY);
  check('niente di salvato: personaggi classici', d0.saved == null && d0.looks.join() === 'p1,cpu', JSON.stringify(d0));
  await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options'));
  await p.waitForSelector('[data-natpf-cast="lobdrop"]', { state: 'visible', timeout: 10000 });
  const row = await p.evaluate(() => { const b = document.querySelector('[data-natpf-cast="sempre"]'), r = b.closest('.lobby-row'), bb = r.getBoundingClientRect(), m = document.getElementById('title-modal').getBoundingClientRect();
    return { label: r.querySelector('.lobby-label').textContent.trim(), btns: [...r.querySelectorAll('[data-natpf-cast]')].map(x => x.textContent.trim() + (x.classList.contains('selected') ? '*' : '')), inside: bb.left >= m.left - 1 && bb.right <= m.right + 1 }; });
  check('Opzioni: riga «Personaggi in campo» con «Classici» (scelto) e «Lob & Drop»', row.label === 'Personaggi in campo' && row.btns.join(' | ') === 'Classici* | Lob & Drop' && row.inside, JSON.stringify(row));
  await p.locator('[data-natpf-cast="lobdrop"]').scrollIntoViewIfNeeded();
  await p.screenshot({ path: path.join(SHOTS, 'b24-opzioni.png') });
  await p.click('[data-natpf-cast="lobdrop"]');
  const changed = await p.waitForFunction(() => __natpfTennis.player.natpfLook === 'drop' && __natpfTennis.opponent.natpfLook === 'lob', null, { timeout: 15000 }).then(() => true, () => false);
  const s1 = await p.evaluate(K => ({ saved: localStorage.getItem(K), sel: document.querySelector('[data-natpf-cast].selected')?.dataset.natpfCast, aria: document.querySelector('[data-natpf-cast="lobdrop"]').getAttribute('aria-checked'), toast: document.getElementById('natpf-toast')?.textContent }), KEY);
  check('clic su «Lob & Drop»: personaggi cambiati subito (anche dietro il menu), scelta salvata', changed && s1.saved === 'lobdrop' && s1.sel === 'lobdrop' && s1.aria === 'true' && /Lob & Drop/.test(s1.toast || ''), JSON.stringify(s1));
  await p.screenshot({ path: path.join(SHOTS, 'b24-opzioni-lobdrop.png') });
  // ritratti: chi gioca è Drop, l'avversario è Lob (tabellone, lobby, targhetta)
  const por = await p.evaluate(() => [...document.querySelectorAll('svg.nt-pl-svg')].map(s => `${s.dataset.plId}:${s.dataset.look}`));
  check('ritratti: giocatore Drop, avversario Lob', por.length >= 4 && por.every(x => /^player\d:drop$|^opponent\d:lob$/.test(x)), por.join(' '));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby && __natpfTennis.player.natpfLook === 'drop', null, { timeout: 60000 }).catch(() => {});
  const s2 = await p.evaluate(K => ({ saved: localStorage.getItem(K), looks: [__natpfTennis.player.natpfLook, __natpfTennis.opponent.natpfLook] }), KEY);
  check('pagina ricaricata: resta «Lob & Drop»', s2.saved === 'lobdrop' && s2.looks.join() === 'drop,lob', JSON.stringify(s2));
  await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options'));
  await p.click('[data-natpf-cast="sempre"]');
  const back = await p.waitForFunction(() => __natpfTennis.player.natpfLook === 'p1' && __natpfTennis.opponent.natpfLook === 'cpu', null, { timeout: 15000 }).then(() => true, () => false);
  const s3 = await p.evaluate(K => ({ saved: localStorage.getItem(K), sel: document.querySelector('[data-natpf-cast].selected')?.dataset.natpfCast, por: [...document.querySelectorAll('svg.nt-pl-svg')].map(s => s.dataset.look) }), KEY);
  check('clic su «Classici»: tornano i personaggi di prima, ritratti compresi, scelta salvata', back && s3.saved === 'sempre' && s3.sel === 'sempre' && s3.por.every(l => l === 'p1' || l === 'cpu'), JSON.stringify(s3));
  check('Opzioni: nessun errore', !def.errs.length, def.errs.join(' | ').slice(0, 300));
  await def.ctx.close();
  // parametro: vale per l'avvio, non tocca il valore salvato; vince sul valore salvato
  const q1 = await game({ cast: null, query: 'intro=0&personaggi=lobdrop' });
  const r1 = await q1.p.evaluate(K => ({ saved: localStorage.getItem(K), looks: [__natpfTennis.player.natpfLook, __natpfTennis.opponent.natpfLook] }), KEY);
  check('?personaggi=lobdrop: Drop e Lob in campo, niente di salvato', r1.saved == null && r1.looks.join() === 'drop,lob', JSON.stringify(r1));
  check('?personaggi=lobdrop: nessun errore', !q1.errs.length, q1.errs.join(' | ').slice(0, 300));
  await q1.ctx.close();
  const q2 = await game({ cast: 'lobdrop', query: 'intro=0&personaggi=sempre' });
  const r2 = await q2.p.evaluate(K => ({ saved: localStorage.getItem(K), looks: [__natpfTennis.player.natpfLook, __natpfTennis.opponent.natpfLook] }), KEY);
  check('?personaggi=sempre con «Lob & Drop» salvato: personaggi classici per questo avvio, il valore salvato resta', r2.saved === 'lobdrop' && r2.looks.join() === 'p1,cpu', JSON.stringify(r2));
  await q2.ctx.close();

  /* ---------- 3) mancini: specchio, racchetta nella mano, scritta leggibile ---------- */
  const lf = await game({ cast: 'lobdrop', hand: 'left' });
  const mirror = () => lf.p.evaluate(() => { const E = __natpfTennis; E._natpfFrame = () => 'paused'; E.natpfUi.hand?.update?.(null); E.opponent.root.scale.x = -Math.abs(E.opponent.root.scale.x); });
  await mirror();
  const m = await scene(lf.p, 'mancino', { pose: 'dritto', steps: 6, cam: { actor: 'player', ...NEAR.front } });
  const lab = await lf.p.evaluate(() => [__natpfTennis.player, __natpfTennis.opponent].map(a => a.natpfMascotParts.labels.filter(l => l.visible).map(l => l.scale.x)));
  await shot(lf.p, 'b24-mancino');
  check('mancini: Drop e Lob specchiati, racchetta nella mano, scritta girata per restare leggibile', m.mirror.every(Boolean) && m.grip.every(g => g < .05) && lab.every(l => l.length === 1 && l[0] === -1) && m.looks.join() === 'drop,lob', `${JSON.stringify(m.mirror)} mano–manico ${m.grip.join(' e ')} m, scritte ${JSON.stringify(lab)}`);
  check('mancini: nessun errore', !lf.errs.length, lf.errs.join(' | ').slice(0, 300));
  await lf.ctx.close();
}

/* ---------- 5) costo: stesso fotogramma disegnato con i due aspetti, fotogrammi al secondo ---------- */
{
  // finestra piccola: con la grafica in software del banco di prova il disegno è lento, e qui conta il confronto
  const g = await game({ cast: 'sempre', w: 640, h: 360 }), p = g.p;
  // conti del disegno (chiamate e triangoli per fotogramma: non dipendono dal carico della macchina) e tempo del
  // disegno: il più breve di tanti disegni a giri alternati (il più breve risente meno degli altri lavori in corso)
  const draw = () => p.evaluate(async N => {
    const E = __natpfTennis, gl = E.renderer.getContext(), px = new Uint8Array(4);
    const one = () => { const t = performance.now(); E.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return performance.now() - t; };
    for (let i = 0; i < 4; i++) one();
    const t = []; for (let i = 0; i < N; i++) t.push(one());
    const info = E.renderer.info.render;
    return { ms: +Math.min(...t).toFixed(2), calls: info.calls, tris: info.triangles };
  }, DRAW_N);
  const cost = {};
  for (const round of [1, 2, 3]) for (const cast of ['sempre', 'lobdrop']){
    await setCast(p, cast); await scene(p, `costo-${cast}-${round}`, SCENES.dritto);
    const d = await draw();
    cost[cast] = cost[cast] ? { ...d, ms: Math.min(d.ms, cost[cast].ms) } : d;
  }
  const A = cost.sempre, M = cost.lobdrop;
  console.log(`disegno dello stesso fotogramma (il più breve di ${DRAW_N} disegni per 3 giri alternati): classici ${A.ms} ms, ${A.calls} chiamate, ${A.tris} triangoli · Lob & Drop ${M.ms} ms, ${M.calls} chiamate, ${M.tris} triangoli`);
  check('costo del disegno: chiamate e triangoli non più del 10% sopra i personaggi classici', M.calls <= A.calls*1.1 + 2 && M.tris <= A.tris*1.1, `chiamate ${A.calls} → ${M.calls}, triangoli ${A.tris} → ${M.tris}`);
  check('costo del disegno: tempo non peggiorato (entro il 12%, misura a macchina condivisa)', M.ms <= A.ms*1.12 + .5, `${A.ms} ms → ${M.ms} ms`);
  // fotogrammi al secondo con il gioco che gira (scambio senza persone), due giri alternati
  const fps = cast => p.evaluate(async ({ cast, ms }) => {
    const E = __natpfTennis;
    E.natpfUi.lobby.setCast(cast);
    E.natpfSplit.active = false; E.natpfPaused = false; E.autoPlayMode = true; window.__seed(99); E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = true;
    E._natpfFrame = E.__frame0;
    await new Promise(r => setTimeout(r, 800));
    // tempo tra il primo e l'ultimo fotogramma diviso per i fotogrammi in mezzo (almeno 8): con la grafica in software
    // i fotogrammi sono pochi, e contarli in una finestra fissa sbaglierebbe di uno su pochi
    let n = 0, first = 0, last = 0; const t0 = performance.now();
    await new Promise(done => { const f = () => { last = performance.now(); if (!n++) first = last; if (last - t0 >= ms && n >= 9) done(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
    E._natpfFrame = () => 'paused';
    return { fps: +((n - 1)*1000/(last - first)).toFixed(2), frames: n, looks: [E.player.natpfLook, E.opponent.natpfLook] };
  }, { cast, ms: FPS_MS });
  const f = { sempre: [], lobdrop: [] };
  for (const round of [1, 2]) for (const cast of ['sempre', 'lobdrop']){ const r = await fps(cast); f[cast].push(r.fps); if (cast === 'lobdrop') check(`giro ${round}: in partita ci sono Drop e Lob`, r.looks.join() === 'drop,lob', r.looks.join()); }
  const best = k => Math.max(...f[k]);
  console.log(`fotogrammi al secondo (grafica in software, ${FPS_MS} ms per misura): classici ${f.sempre.join(' e ')} · Lob & Drop ${f.lobdrop.join(' e ')}`);
  check('fotogrammi al secondo non peggiorati (il migliore dei due giri entro il 10% dei personaggi classici)', best('lobdrop') >= best('sempre')*.9, `classici ${best('sempre')}, Lob & Drop ${best('lobdrop')}`);
  check('costo: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}
await B.close(); summary();
