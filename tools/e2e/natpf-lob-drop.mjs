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
// B29, modelli 3D di Lob e di Drop (src/natpf/natpf_mascot_models.js e natpf_mascot_rig.js, ?mascotte=3d|codice):
//   le parti qui sopra provano le mascotte costruite nel codice (aprono il gioco con ?mascotte=codice: restano il
//   ripiego); la parte 6 prova i modelli: caricati solo con «Lob & Drop», ripiego con il file bloccato, partite a
//   sorteggi fissi identiche, impatto sulla palla, palmo sul manico, piedi a terra, niente scatti; la parte 5 misura
//   il costo dei tre aspetti (classici, mascotte nel codice, modelli 3D).
// B35 (collaudo dell'utente del 13/11: «con Lob & Drop non si vede chi serve»), parte 7: chi serve si vede come con i
//   Classici, contro la CPU (scritta «Al servizio» sopra chi batte, pallina del tabellone) e nello stesso schermo (una
//   scritta per metà); schermate b35-servizio-*.png. SERVIZIO=1: solo la parte 7
//   TRE_D=1: solo le parti 6 e 5 · FOGLI3D=cartella: solo i fogli di docs/b29/img · MODELLI=cartella: modelli da
//   un'altra cartella al posto di quelli del gioco (per confrontare texture diverse) · SEMI=cpu:777,schermo:2024,demo:9090:
//   partite della parte 6 con altri sorteggi (il confronto con il commit di prima si salta: le impronte salvate sono
//   dei sorteggi di base; resta quello con «Classici» giocato sugli stessi sorteggi)
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
const TRE_D = !!process.env.TRE_D, FOGLI3D = process.env.FOGLI3D || '', MODELLI = process.env.MODELLI || '';
const KEY = 'natpf-tennis.personaggi';
const PHOTO = path.resolve(here, '../../docs/riferimenti/lob-drop-2026-11-11.webp');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const B = await launch();
const SERVIZIO = !!process.env.SERVIZIO;

// pagina del gioco pronta; cast: valore salvato dell'opzione prima dell'avvio ('lobdrop', 'sempre' o null = niente)
// mascotte: 'codice' (di base: le mascotte costruite nel codice, come prima del B29) o '3d' (i modelli: si aspetta che
// siano montati); block: espressione dei file dei modelli da far fallire; models: cartella con altri modelli
async function game({ cast = null, query = 'intro=0', w = 1280, h = 720, hand = null, mascotte = 'codice', block = null, models = MODELLI } = {}){
  const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [], warns = [], glb = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (/natpf-mascotte/.test(m.text())) warns.push(m.text()); });
  p.on('request', r => { if (/mascotte-(drop|lob)\.glb/.test(r.url())) glb.push(r.url().split('/').pop()); });
  if (block) await p.route(block, r => r.abort());
  else if (models) await p.route(/mascotte-(drop|lob)\.glb/, r => r.fulfill({ body: readFileSync(path.join(models, r.request().url().split('/').pop().split('?')[0])), contentType: 'model/gltf-binary' }));
  if (!/mascotte=/.test(query)) query += `&mascotte=${mascotte}`;
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
  // modelli 3D: si aspetta che siano in campo (se un file è bloccato, solo l'altro)
  const want3d = /mascotte=3d/.test(query) && (cast === 'lobdrop' || /personaggi=lobdrop/.test(query)) && !/personaggi=sempre/.test(query);
  if (want3d) await p.waitForFunction(b => { const E = __natpfTennis, ok = a => a.natpfMascot3dOn || (b && new RegExp(b).test(`mascotte-${a.natpfMascot}.glb`)); return ok(E.player) && ok(E.opponent); }, block ? block.source : null, { timeout: 90000 }).catch(() => errs.push('modelli 3D non montati'));
  await p.waitForTimeout(1500);
  return { ctx, p, errs, warns, glb };
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
  } else if (o.pose === 'schiacciata'){
    E.phase = 'RALLY';
    who.swingType = 'smash'; who.swingDuration = who.swingTimer = .36;
    E.racketKinematics.triggerSwing(who, { shotType: 'smash', side: 'overhead', speed: 1.2, timing: 'sweet', dirX: 0 });
    anim(steps);
  } else if (o.pose === 'corsa'){
    // corsa di lato (o.vx) o in avanti (o.vz), metri al secondo nel campo
    E.phase = 'RALLY'; who.vel.set(o.vx ?? 5, 0, o.vz ?? 0);
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
  return { hash: hash.toString(16), W, H, looks: [E.player.natpfLook, E.opponent.natpfLook], mascots: [E.player.natpfMascot || null, E.opponent.natpfMascot || null], on3d: [!!E.player.natpfMascot3dOn, !!E.opponent.natpfMascot3dOn],
    seen: [seen(E.player), seen(E.opponent)], grip: [hand(E.player), hand(E.opponent)], mirror: [E.player.root.scale.x < 0, E.opponent.root.scale.x < 0] };
}, { name, o });
const diff = (p, a, b) => p.evaluate(({ a, b }) => { const A = __px[a], Bx = __px[b]; let n = 0; for (let i = 0; i < A.length; i += 4) if (A[i] !== Bx[i] || A[i + 1] !== Bx[i + 1] || A[i + 2] !== Bx[i + 2]) n++; return n; }, { a, b });
// dove stanno i pixel diversi tra due scene (riquadro, dal basso a sinistra): serve quando una scena non è ripetibile
const where = (p, a, b) => p.evaluate(({ a, b }) => { const A = __px[a], Bx = __px[b], E = __natpfTennis, gl = E.renderer.getContext(), W = gl.drawingBufferWidth; let n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let i = 0; i < A.length; i += 4) if (A[i] !== Bx[i] || A[i + 1] !== Bx[i + 1] || A[i + 2] !== Bx[i + 2]){ n++; const x = (i/4) % W, y = Math.floor(i/4/W); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return n ? `${n} pixel diversi tra x ${x0}–${x1} e y ${y0}–${y1}` : 'nessun pixel diverso'; }, { a, b });
const shot = (p, name) => p.locator('canvas').first().screenshot({ path: path.join(SHOTS, `${name}.png`) });
const setCast = (p, v) => p.evaluate(v => __natpfTennis.natpfUi.lobby.setCast(v), v);

const NEAR = { front: { from: [0, 1.35, 5.3], look: [0, 1.08, 0], fov: 28 }, back: { from: [0, 1.35, -5.3], look: [0, 1.08, 0], fov: 28 }, side: { from: [5.3, 1.35, 0], look: [0, 1.08, 0], fov: 28 },
  quarter: { from: [3.9, 1.35, 3.6], look: [0, 1.08, 0], fov: 28 } };
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
  // (B37) anche il primo battito delle palpebre: ogni personaggio nasce con un intervallo sorteggiato con Math.random
  // (player_facial_fx), quindi dipende da quanti sorteggi ha fatto la pagina prima, anche per dare il nome agli oggetti
  // three.js del gioco (per esempio la gemma di chi serve del B37, tolta nel B37.1). Le palpebre sorteggiano ancora
  // durante la partita: senza questo passo la sequenza dei sorteggi si sposta. Uguale per tutti prima del seme (non cambia
  // il gioco)
  for (const a of [E.player, E.opponent, E.playerPartner, E.opponentPartner]){ const r = a?.facialRig; if (r){ r.blinkTimer = 3; r.blinkActiveTimer = 0; } }
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
    // B29: con il modello 3D la testa è quella del modello (osso Head e forma dichiarata nel rig), non la parte del tennista
    let head = a.parts.head;
    if (a.natpfMascot3dOn && M !== HEADS.uomo){ M = a.natpfMascot3d.headShape; head = a.natpfMascot3d.head.bone; }
    const inv = head.matrixWorld.clone().invert(); let f = 9;
    for (let q = 0; q < 24; q++){ const t = q/24*Math.PI*2; v3.set(.172*Math.cos(t), .545 + .215*Math.sin(t), 0); a.racketMesh.localToWorld(v3).applyMatrix4(inv); f = Math.min(f, ((v3.x - (M.cx || 0))/M.rx)**2 + ((v3.y - M.cy)/M.ry)**2 + ((v3.z - (M.cz || 0))/M.rz)**2); }
    return Math.sqrt(f);
  };
  // B29, misure del rig dei modelli 3D a ogni passo: palmo sul manico, piante sul campo, scatti delle ossa
  // (posizioni nel sistema della radice dell'attore: il saltello della corsa e gli spostamenti in campo li fa il motore
  // sulla radice, uguali per tutti i personaggi. Gli scatti si misurano rispetto a quanto si sono mosse, nello stesso
  // passo, le parti del tennista che il motore anima: così un taglio del motore, per esempio un punto nuovo, non conta)
  const R3 = { n: 0, on: { player: 0, opponent: 0 }, presa: 0, piantaMin: 9, piantaMax: 0, inAria: 0, allungo: 0, allungoDove: null, scatto: 0, dove: '', manoLibera: 0 };
  const BONES3 = ['Hips', 'Spine02', 'Head', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftLeg', 'RightLeg'], mem3 = { player: null, opponent: null };
  const PARTS3 = ['torso', 'head', 'handR', 'handL', 'footL', 'footR'], inv3 = E.player.root.matrixWorld.clone();
  const rig3 = (k, a, i) => {
    const rig = a.natpfMascot3d;
    if (!a.natpfMascot3dOn || !rig?.probe) return;
    R3.on[k]++;
    a.root.updateMatrixWorld(true); inv3.copy(a.root.matrixWorld).invert();
    const pr = rig.probe(a), hand = a.parts.handR.getWorldPosition(w3), m = mem3[k] || (mem3[k] = { q: {}, part: {}, free: null, first: true });
    R3.presa = Math.max(R3.presa, pr.palmA.distanceTo(hand));
    const stretch = Math.max(pr.stretchA, pr.stretchB);
    if (stretch > R3.allungo){ R3.allungo = stretch; R3.allungoDove = { passo: i, chi: a.natpfMascot }; }
    for (const pt of [pr.palmA, pr.palmB, pr.soleA, pr.soleB]) pt.applyMatrix4(inv3);
    R3.piantaMin = Math.min(R3.piantaMin, pr.soleA.y, pr.soleB.y); R3.piantaMax = Math.max(R3.piantaMax, pr.soleA.y, pr.soleB.y);
    if (Math.min(pr.soleA.y, pr.soleB.y) > .05) R3.inAria++;
    // quanto si sono mosse le parti del tennista in questo passo (metri, e gradi per busto e testa)
    const mv = {}, turnOf = {};
    for (const n of PARTS3){
      const now = a.parts[n].getWorldPosition(v3).applyMatrix4(inv3), was = m.part[n];
      mv[n] = was ? now.distanceTo(was.p) : 0;
      const q = a.parts[n].quaternion;
      turnOf[n] = was ? 2*Math.acos(Math.min(1, Math.abs(was.q.dot(q))))*180/Math.PI : 0;
      if (was){ was.p.copy(now); was.q.copy(q); } else m.part[n] = { p: now.clone(), q: q.clone() };
    }
    const freeMoved = m.free ? pr.palmB.distanceTo(m.free) : 0, body = mv.torso + mv.head, racketSide = rig.mirrored ? 'Left' : 'Right';
    if (!m.first) R3.manoLibera = Math.max(R3.manoLibera, freeMoved - mv.handL);
    for (const n of BONES3){
      const q = rig.bones[n].quaternion, was = m.q[n];
      if (was && !m.first){
        const turn = 2*Math.acos(Math.min(1, Math.abs(was.dot(q))))*180/Math.PI;
        const limit = n.includes('Arm') ? 40 + ((n.startsWith(racketSide) ? mv.handR : Math.max(freeMoved, mv.handL)) + body)*400
          : n.includes('Leg') ? 25 + (Math.max(mv.footL, mv.footR) + body)*400 : 25 + body*400 + turnOf.torso + turnOf.head;
        if (turn - limit > R3.scatto){ R3.scatto = turn - limit; R3.dove = `${a.natpfMascot} ${n} al passo ${i}: ${turn.toFixed(1)} gradi (limite ${limit.toFixed(0)})`; }
      }
      (m.q[n] ||= q.clone()).copy(q);
    }
    (m.free ||= pr.palmB.clone()).copy(pr.palmB); m.first = false;
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
    if (o.rig3d){ R3.n++; for (const [k, a] of actors) rig3(k, a, i); }
    if (stops.includes(i)) for (const [, a] of actors) C.foto.push(photo(a, `${a.natpfMascot === 'drop' ? 'Drop' : 'Lob'}, passo ${i}`));
    const sc = `${s.playerPoints}-${s.opponentPoints}/${s.playerGames}-${s.opponentGames}`;
    if (sc !== score){ score = sc; pts++; }
    if (i % 6 === 0) for (const v of [b.pos.x, b.pos.y, b.pos.z, E.player.pos.x, E.player.pos.z, E.opponent.pos.x, E.opponent.pos.z, s.playerPoints, s.opponentPoints, s.playerGames, s.opponentGames]) eat(v);
  }
  E.autoPlayMode = false;
  return { hash: h.toString(16), hits, changes: pts - 1, score, looks: [E.player.natpfLook, E.opponent.natpfLook], clip: clip ? C : null, foto: C.foto, rig: o.rig3d ? R3 : null, on3d: [!!E.player.natpfMascot3dOn, !!E.opponent.natpfMascot3dOn] };
}, o);
// partite a sorteggi fissi con i robot (parte 1b): contro la CPU e nello stesso schermo
const RUNS = { cpu: { mode: 'cpu', seed: 31337, steps: 2600 }, schermo: { mode: 'schermo', seed: 555, steps: 2600 } };
// SEMI: altri sorteggi per le partite della parte 6 (demo = la partita senza persone)
const SEMI = Object.fromEntries((process.env.SEMI || '').split(',').filter(Boolean).map(x => x.split(':')).map(([k, v]) => [k, +v]));

/* ---------- fogli di immagini (docs/b24/img): solo con FOGLI=cartella ---------- */
if (!SERVIZIO && (FOGLI || FOGLI3D)){
  mkdirSync(FOGLI3D || FOGLI, { recursive: true });
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
    writeFileSync(path.join(FOGLI3D || FOGLI, file), buf);
    console.log(`foglio ${file}: ${out.W}×${out.H}, ${buf.length} B, qualità ${out.q.toFixed(2)}`);
    check(`foglio ${file} sotto i 300 kB`, buf.length < 300000, `${buf.length} B`);
  }
  // FOGLIO=nome: solo un gruppo di fogli (racchetta, vicino, mancini, campo)
  const want = n => !!FOGLI && !FOGLI3D && (!process.env.FOGLIO || process.env.FOGLIO === n);
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
    for (const [v, l] of [['front', 'davanti'], ['quarter', 'di tre quarti'], ['side', 'di lato'], ['back', 'dietro']]) tiles.push({ src: await closeUp(actor, v), label: `${nome} nel gioco, ${l}` });
    await sheet(`${nome.toLowerCase()}-da-vicino.webp`, tiles, { cols: 5, w: 340, h: 400, title: `${nome}: foto di riferimento e personaggio nel gioco` });
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
    if (n !== 'split') ct.push({ src, label: `${l} (ingrandito 3 volte)`, zoom: 3, dx: n === 'avversario' ? -.02 : .05, dy: n === 'avversario' ? -.17 : .26 });
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
  /* ---------- B29: fogli dei modelli 3D (docs/b29/img), solo con FOGLI3D=cartella; FOGLIO=nome per un gruppo solo ---------- */
  if (FOGLI3D){
    const want3 = n => !process.env.FOGLIO || process.env.FOGLIO === n;
    const refresh = p => p.evaluate(() => { const E = __natpfTennis; E.natpfUi.hand?.update?.(null); });
    // a) foto, mascotte nel codice e modello 3D affiancati, stessa camera: davanti, lato, dietro
    if (want3('vicino')){
      const code = await game({ cast: 'lobdrop', w: 560, h: 640 }), m3 = await game({ cast: 'lobdrop', w: 560, h: 640, mascotte: '3d' });
      const closeUp = async (g, actor, view) => { await scene(g.p, `v3-${actor}-${view}`, { pose: 'fermo', cam: { actor, ...NEAR[view] } }); return png(g.p); };
      for (const [actor, nome] of [['player', 'Drop'], ['opponent', 'Lob']]){
        const tiles = [{ src: photo, label: 'Foto dei peluche', zoom: 1.5, dx: actor === 'player' ? -.2 : .257, dy: .05 }];
        for (const [v, l] of [['front', 'davanti'], ['side', 'di lato'], ['back', 'dietro']]) tiles.push({ src: await closeUp(code, actor, v), label: `${nome} costruito nel codice, ${l}` });
        tiles.push({ src: await closeUp(m3, actor, 'quarter'), label: `${nome} dal modello 3D, di tre quarti` });
        for (const [v, l] of [['front', 'davanti'], ['side', 'di lato'], ['back', 'dietro']]) tiles.push({ src: await closeUp(m3, actor, v), label: `${nome} dal modello 3D, ${l}` });
        await sheet(`${nome.toLowerCase()}-foto-codice-3d.webp`, tiles, { cols: 4, w: 340, h: 390, title: `${nome}: la foto, la mascotte costruita nel codice (sopra) e il modello 3D (sotto), stessa camera` });
      }
      await code.ctx.close(); await m3.ctx.close();
    }
    // b) i gesti da vicino con i modelli
    if (want3('gesti')){
      const g = await game({ cast: 'lobdrop', w: 560, h: 640, mascotte: '3d' });
      const LOW = { front: { from: [0, 1.15, 5.6], look: [0, .92, 0], fov: 28 }, side: { from: [5.6, 1.15, 0], look: [0, .92, 0], fov: 28 }, quarter: { from: [-4.0, 1.25, 3.9], look: [0, .92, 0], fov: 28 } };
      const list = [['fermo', 0, 'attesa', 'front'], ['fermo', 0, 'attesa, di lato', 'side'], ['corsa', 12, 'corsa', 'front'], ['corsa', 20, 'corsa, di lato', 'side'],
        ['dritto', 3, 'dritto, apertura', 'front'], ['dritto', 6, 'dritto, impatto', 'front'], ['dritto', 6, 'dritto, impatto (tre quarti)', 'quarter'], ['dritto', 12, 'dritto, finale', 'front'],
        ['rovescio', 6, 'rovescio, impatto', 'front'], ['rovescio', 12, 'rovescio, finale', 'front'], ['servizio', 1, 'servizio, caricamento', 'front'], ['servizio', 5, 'servizio, impatto', 'front'],
        ['servizio', 5, 'servizio, impatto (di lato)', 'side'], ['schiacciata', 5, 'schiacciata', 'front'], ['esultanza', 40, 'esultanza', 'front'], ['esultanza', 40, 'esultanza (tre quarti)', 'quarter']];
      for (const [actor, nome] of [['player', 'Drop'], ['opponent', 'Lob']]){
        const tiles = [];
        for (const [pose, steps, l, view] of list){ await scene(g.p, `g3-${actor}`, { pose, steps, who: actor, cam: { actor, ...LOW[view] } }); tiles.push({ src: await png(g.p), label: `${nome}: ${l}` }); }
        await sheet(`gesti-${nome.toLowerCase()}.webp`, tiles, { cols: 4, w: 300, h: 340, title: `${nome} dal modello 3D: attesa, corsa, dritto, rovescio, servizio, schiacciata, esultanza` });
      }
      await g.ctx.close();
    }
    // c) mancini: il modello non si specchia (scritte leggibili), la racchetta passa nella mano sinistra
    if (want3('mancino')){
      const g = await game({ cast: 'lobdrop', w: 560, h: 640, hand: 'left', mascotte: '3d' });
      const flip = () => g.p.evaluate(() => { const E = __natpfTennis; E.natpfUi.hand?.update?.(null); E.opponent.root.scale.x = -Math.abs(E.opponent.root.scale.x); });
      const tiles = [];
      for (const [actor, nome] of [['player', 'Drop'], ['opponent', 'Lob']])
        for (const [pose, steps, l] of [['fermo', 0, 'attesa'], ['dritto', 6, 'dritto'], ['rovescio', 6, 'rovescio'], ['servizio', 5, 'servizio']]){
          await flip();
          const info = await scene(g.p, `m3-${actor}-${pose}`, { pose, steps, who: actor, cam: { actor, from: [0, 1.15, 5.6], look: [0, .92, 0], fov: 28 } });
          const bone = await g.p.evaluate(k => { const a = __natpfTennis[k], r = a.natpfMascot3d; return r?.probe ? r.probe(a).racketHandBone : '?'; }, actor);
          tiles.push({ src: await png(g.p), label: `${nome} mancino, ${l}: racchetta in ${bone}${info.mirror[actor === 'player' ? 0 : 1] ? '' : ' (NON mancino)'}` });
        }
      await sheet('mancino.webp', tiles, { cols: 4, w: 320, h: 365, title: 'Mancini con i modelli 3D: racchetta nella mano sinistra, scritte e marchio leggibili (il modello non è specchiato)' });
      await g.ctx.close();
    }
    // d) in campo dalla camera di gioco, anche ingrandito 3 volte; stesso schermo
    if (want3('campo')){
      const g = await game({ cast: 'lobdrop', w: 1280, h: 720, mascotte: '3d' });
      const S3 = { ...SCENES, corsa: { pose: 'corsa', steps: 12 }, rovescio: { pose: 'rovescio', steps: 6 } }, tiles = [];
      for (const [n, l] of [['fermo', 'Attesa'], ['corsa', 'Corsa di Drop'], ['dritto', 'Dritto di Drop'], ['rovescio', 'Rovescio di Drop'], ['servizio', 'Servizio di Drop'], ['esultanza', 'Esultanza di Drop'], ['avversario', 'Dritto di Lob']]){
        await scene(g.p, `c3-${n}`, S3[n]); const src = await png(g.p);
        tiles.push({ src, label: `${l}, camera di gioco` }, { src, label: `${l} (ingrandito 3 volte)`, zoom: 3, dx: n === 'avversario' ? -.02 : .05, dy: n === 'avversario' ? -.17 : .26 });
      }
      await scene(g.p, 'c3-split', SCENES.split); tiles.push({ src: await png(g.p), label: 'Stesso schermo: Drop a sinistra, Lob a destra' });
      await scene(g.p, 'c3-split2', { pose: 'dritto', steps: 6, cam: 'split', multi: true }); tiles.push({ src: await png(g.p), label: 'Stesso schermo: dritto di Drop' });
      await sheet('in-campo.webp', tiles, { cols: 4, w: 400, h: 225, title: 'Lob & Drop dai modelli 3D, in campo dalla camera di gioco' });
      // confronto in campo: classici, mascotte nel codice, modelli 3D
      const cmp = [];
      for (const [cast, mode, l] of [['sempre', 'codice', 'Classici'], ['lobdrop', 'codice', 'Lob & Drop costruiti nel codice'], ['lobdrop', '3d', 'Lob & Drop dai modelli 3D']]){
        await g.p.evaluate(m => __natpfTennis.natpfMascotMode(m), mode); await setCast(g.p, cast);
        await scene(g.p, `k3-${cast}-${mode}`, SCENES.fermo); const src = await png(g.p);
        cmp.push({ src, label: l }, { src, label: `${l} (ingrandito 3 volte)`, zoom: 3, dx: .05, dy: .26 });
      }
      await sheet('confronto-in-campo.webp', cmp, { cols: 2, w: 600, h: 338, title: 'In campo dalla camera di gioco: classici, mascotte nel codice, modelli 3D' });
      await g.ctx.close();
    }
    // e) Drop blu sul campo blu: con e senza il bordo di luce
    if (want3('bordo')){
      const g = await game({ cast: 'lobdrop', w: 1280, h: 720, mascotte: '3d' }), tiles = [];
      const rim = v => g.p.evaluate(v => { let m = null; __natpfTennis.player.natpfMascot3d.group.traverse(o => { if (o.isSkinnedMesh) m = o.material; }); const was = m.userData.natpfRim.value; if (v != null) m.userData.natpfRim.value = v; return was; }, v);
      const full = await rim(null);
      for (const [v, l] of [[0, 'senza bordo'], [full, `bordo ${String(full).replace('.', ',')} (gioco)`]]){
        await rim(v);
        for (const [n, what] of [['fermo', 'attesa'], ['dritto', 'dritto']]){ await scene(g.p, `b3-${n}`, SCENES[n]); tiles.push({ src: await png(g.p), label: `${l}: ${what}, ingrandito 3 volte`, zoom: 3, dx: .05, dy: .26 }); }
        await scene(g.p, 'b3-vicino', { pose: 'fermo', cam: { actor: 'player', from: [0, 1.15, -5.6], look: [0, .92, 0], fov: 28 } }); tiles.push({ src: await png(g.p), label: `${l}: da dietro, da vicino` });
      }
      await sheet('bordo-drop.webp', tiles, { cols: 3, w: 420, h: 300, title: 'Drop è blu su un campo blu: senza e con il bordo di luce' });
      await g.ctx.close();
    }
    // e2) scala in campo da scegliere con l'utente: 1,6 m (nel gioco), 1,75 e 1,9 m (le mascotte nel codice sono alte
    // 1,95). La racchetta resta dove la mette il motore (punto d'impatto uguale): cambia dove sta la testa rispetto
    // alla mano. Righe: camera di gioco; Lob nell'attesa da davanti (come lo vede la camera di gioco); Drop nel dritto
    // al passo 5 di tre quarti da sinistra; Drop nel servizio al passo 7 dal basso
    if (want3('scala')){
      const g = await game({ cast: 'lobdrop', w: 1280, h: 720, mascotte: '3d' }), tiles = [];
      const setScale = v => g.p.evaluate(v => { for (const k of ['player', 'opponent']){ const r = __natpfTennis[k].natpfMascot3d; if (r) r.scale = v; } }, v);
      const CAM = { sx34: { from: [-3.6, 1.3, 3.4], look: [0, .85, 0], fov: 30 }, basso: { from: [.6, .25, 4.2], look: [0, .45, 0], fov: 30 } };
      const rows = [
        ['Drop dalla camera di gioco (ingrandito 3 volte)', SCENES.fermo, { zoom: 3, dx: .05, dy: .26 }],
        ['Lob dalla camera di gioco (ingrandito 4 volte)', SCENES.fermo, { zoom: 4, dx: -.02, dy: -.17 }],
        ['Lob in attesa, da davanti', { pose: 'fermo', cam: { actor: 'opponent', ...NEAR.front } }, {}],
        ['Lob nel dritto (passo 5), da davanti', { pose: 'dritto', steps: 5, who: 'opponent', cam: { actor: 'opponent', ...NEAR.front } }, {}],
        ['Drop nel dritto (passo 5), tre quarti', { pose: 'dritto', steps: 5, cam: { actor: 'player', ...CAM.sx34 } }, {}],
        ['Drop nel servizio (passo 7), dal basso', { pose: 'servizio', steps: 7, cam: { actor: 'player', ...CAM.basso } }, {}],
      ];
      for (const [l, sc, crop] of rows) for (const v of [1.6, 1.75, 1.9]){
        await setScale(v); await scene(g.p, `s3-${v}`, sc);
        tiles.push({ src: await png(g.p), label: `${String(v).replace('.', ',')} m${v === 1.6 ? ' (gioco)' : ''}: ${l}`, ...crop });
      }
      await setScale(1.6);
      check('fogli, scala: nessun errore', !g.errs.length, g.errs.join(' | '));
      await sheet('scala.webp', tiles, { cols: 3, w: 400, h: 250, title: 'Altezza dei modelli in campo: 1,6 m (nel gioco), 1,75 m, 1,9 m. La racchetta non cambia posto' });
      await g.ctx.close();
    }
    // f) texture a 1024 e a 512 punti (TEXTURE512=cartella con i modelli a 512)
    if (want3('texture') && process.env.TEXTURE512){
      const tiles = [];
      for (const [dir, l] of [['', '1024 punti (nel gioco)'], [process.env.TEXTURE512, '512 punti']]){
        const g = await game({ cast: 'lobdrop', w: 640, h: 640, mascotte: '3d', models: dir });
        for (const [actor, nome] of [['player', 'Drop'], ['opponent', 'Lob']]){
          await scene(g.p, `t3-${actor}`, { pose: 'fermo', cam: { actor, from: [.25, 1.2, 2.9], look: [0, 1.0, 0], fov: 28 } }); tiles.push({ src: await png(g.p), label: `${nome}, texture a ${l}: da vicino` });
        }
        await g.ctx.close();
        const c = await game({ cast: 'lobdrop', w: 1280, h: 720, mascotte: '3d', models: dir });
        await scene(c.p, 't3-campo', SCENES.fermo); tiles.push({ src: await png(c.p), label: `Texture a ${l}: dalla camera di gioco (ingrandito 4 volte)`, zoom: 4, dx: .05, dy: .26 });
        await c.ctx.close();
      }
      await sheet('texture-1024-512.webp', tiles, { cols: 3, w: 420, h: 420, title: 'Texture dei modelli: 1024 punti (scelta) e 512 punti' });
    }
  }
  await B.close(); summary(); process.exit(process.exitCode || 0);
}

const HUMAN = /^Natpf(Polo|Colletto|Abbottonatura|Bottoni|Pantaloncini|Collo|Testa|Capelli|Fascia|Orecchie|Naso|ManoDx|ManoSx|Scarpa|Suola|Manica|Orlo|Calza)/;
const MASCOT = /^Natpf(Drop|Lob)|^NatpfOcchio|^NatpfBoccaAperta|^NatpfLingua/;

/* ---------- 1) scene ferme: «Classici» identico a prima, «Lob & Drop» diverso, ritorno identico ---------- */

const prints = {}, partite = {};
if (!SERVIZIO && !process.env.COSTO && !process.env.TESTA && !TRE_D && !FOGLI3D){
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
// (mascotte costruite nel codice; per i modelli 3D la stessa misura è nella parte 6)
// Revisione del 12/11: con la testa grande la racchetta entrava nella testa. Stessa partita della revisione (contro la
// CPU, seme 31337, 2600 passi, un robot al posto di chi gioca): quanti passi con il telaio dentro la testa prima e dopo,
// quanto si scosta la racchetta, e al colpo le corde sono dove erano. La partita è la stessa con i due valori
// dell'opzione, contro la CPU e nello stesso schermo (con il disegno a vuoto prima del seme: vedi play).
if (!SERVIZIO && !process.env.COSTO && !TRE_D && !FOGLI3D){
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
    partite[name] = A.hash;
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
if (!SERVIZIO && !process.env.COSTO && !TRE_D && !FOGLI3D){
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

/* ---------- 6) B29 · modelli 3D di Lob e di Drop ---------- */
if (!SERVIZIO && !process.env.COSTO && !process.env.TESTA){
  const ref = CONFRONTA && existsSync(CONFRONTA) ? JSON.parse(readFileSync(CONFRONTA, 'utf8')) : {};
  const CODE = /^Natpf(Drop|Lob)[A-Z]|^NatpfOcchio|^NatpfBoccaAperta|^NatpfLingua|^Natpf(Braccio|Avambraccio|Coscia|Stinco)/;
  // a) con «Lob & Drop» i due modelli si caricano e sono loro in campo; niente pezzi costruiti nel codice
  const g = await game({ cast: 'lobdrop', mascotte: '3d' }), p = g.p;
  const a = await scene(p, '3d-fermo-a', SCENES.fermo), b = await scene(p, '3d-fermo-b', SCENES.fermo);
  await shot(p, 'b29-fermo-3d');
  check('3D: i due modelli sono stati chiesti e sono in campo (Drop chi gioca, Lob l\'altro)', a.on3d.every(Boolean) && a.looks.join() === 'drop,lob' && g.glb.includes('mascotte-drop.glb') && g.glb.includes('mascotte-lob.glb'), `${a.on3d} · ${[...new Set(g.glb)]}`);
  check('3D: in scena il modello e la racchetta, nessun pezzo costruito nel codice né del tennista', a.seen[0].includes('NatpfMascotte3dDrop') && a.seen[1].includes('NatpfMascotte3dLob') && a.seen.every(l => l.includes('NatpfTelaio') && !l.some(n => CODE.test(n) || HUMAN.test(n))), JSON.stringify(a.seen).slice(0, 300));
  check('3D: scena ripetibile (stessa impronta due volte)', a.hash === b.hash && await diff(p, '3d-fermo-a', '3d-fermo-b') === 0, `${a.hash} / ${b.hash}, ${await where(p, '3d-fermo-a', '3d-fermo-b')}`);
  // palmo sul manico e piante sul campo nelle pose (misure del rig), destri
  const poses = [['fermo', 0], ['corsa', 12], ['dritto', 3], ['dritto', 6], ['dritto', 12], ['rovescio', 6], ['servizio', 1], ['servizio', 5], ['schiacciata', 5], ['esultanza', 40]];
  const probe = () => p.evaluate(() => ['player', 'opponent'].map(k => { const a = __natpfTennis[k], r = a.natpfMascot3d.probe(a), h = a.parts.handR.getWorldPosition(r.palmA.clone());
    return { bone: r.racketHandBone, grip: +r.palmA.distanceTo(h).toFixed(3), sole: [+r.soleA.y.toFixed(3), +r.soleB.y.toFixed(3)], stretch: +r.stretchA.toFixed(2) }; }));
  let worst = { grip: 0, low: 9, high: 0, stretch: 0 }, bones = new Set();
  for (const who of ['player', 'opponent']) for (const [pose, steps] of poses){
    await scene(p, '3d-posa', { pose, steps, who });
    for (const r of await probe()){ bones.add(r.bone); worst = { grip: Math.max(worst.grip, r.grip), low: Math.min(worst.low, ...r.sole), high: Math.max(worst.high, ...r.sole), stretch: Math.max(worst.stretch, r.stretch) }; }
  }
  check('3D, nelle pose (attesa, corsa, dritto, rovescio, servizio, schiacciata, esultanza): racchetta nella mano destra (RightHand), palmo sul manico', bones.size === 1 && bones.has('RightHand') && worst.grip < .035, `${[...bones]}, palmo–manico al più ${worst.grip} m, braccio allungato al più ${worst.stretch} volte`);
  check('3D, nelle pose: piante sul campo (mai sotto; al più 23 cm sopra: 18 di alzata più l\'inclinazione del piede, nel passo di corsa e nel saltello dell\'esultanza)', worst.low > -.005 && worst.high < .23, `da ${worst.low} a ${worst.high} m`);
  // «Classici» al volo: il modello sparisce, il disegno è quello di prima; di nuovo «Lob & Drop»: tornano i modelli
  await setCast(p, 'sempre');
  const c = await scene(p, '3d-classici', SCENES.fermo);
  check('3D → «Classici» al volo: i personaggi di prima, nessun modello in scena', c.looks.join() === 'p1,cpu' && !c.on3d.some(Boolean) && !c.seen.flat().some(n => /Mascotte3d/.test(n)) && c.seen[0].some(n => HUMAN.test(n)), `${c.looks}`);
  // confronto con «Classici» in una pagina appena aperta con la stessa storia (solo scene, nessuna partita: una partita
  // giocata prima lascia resti nel disegno, per questo non si confronta con le impronte della parte 1)
  { const k = await game({ cast: 'sempre', mascotte: '3d' }), f = await scene(k.p, '3d-classici-nuova', SCENES.fermo);
    check('3D → «Classici» al volo: disegno identico a «Classici» in una pagina appena aperta', c.hash === f.hash && f.looks.join() === 'p1,cpu', `${c.hash} / ${f.hash}`);
    check('«Classici» con ?mascotte=3d: nessun modello chiesto', !k.glb.length, `${k.glb}`);
    await k.ctx.close(); }
  await setCast(p, 'lobdrop');
  const d = await scene(p, '3d-fermo-c', SCENES.fermo);
  check('«Classici» → «Lob & Drop»: tornano i modelli, stesso disegno', d.on3d.every(Boolean) && d.hash === a.hash, `${d.hash} / ${a.hash}`);
  check('3D: nessun errore, nessuna riga di avviso', !g.errs.length && !g.warns.length, [...g.errs, ...g.warns].join(' | ').slice(0, 300));
  await g.ctx.close();
  // mancino: il modello non è specchiato, la racchetta è nell'osso LeftHand
  const lf = await game({ cast: 'lobdrop', mascotte: '3d', hand: 'left' });
  await lf.p.evaluate(() => { const E = __natpfTennis; E._natpfFrame = () => 'paused'; E.natpfUi.hand?.update?.(null); });
  const m = await scene(lf.p, '3d-mancino', { pose: 'dritto', steps: 6, cam: { actor: 'player', ...NEAR.front } });
  const lm = await lf.p.evaluate(() => { const a = __natpfTennis.player, r = a.natpfMascot3d, pr = r.probe(a); r.group.updateMatrixWorld(true);
    return { bone: pr.racketHandBone, grip: +pr.palmA.distanceTo(a.parts.handR.getWorldPosition(pr.palmB.clone())).toFixed(3), det: Math.sign(r.group.matrixWorld.determinant()), mirrored: r.mirrored }; });
  await shot(lf.p, 'b29-mancino-3d');
  check('3D, mancino: radice specchiata ma modello no (scritte leggibili), racchetta nell\'osso LeftHand, palmo sul manico', m.mirror[0] && lm.bone === 'LeftHand' && lm.det > 0 && lm.mirrored && lm.grip < .035 && !lf.errs.length, JSON.stringify(lm));
  await lf.ctx.close();
  // b) niente peso per chi non li usa: con «Classici» e con ?mascotte=codice i file non si chiedono
  for (const [cast, mascotte, what] of [['sempre', '3d', '«Classici»'], ['lobdrop', 'codice', '«Lob & Drop» con ?mascotte=codice']]){
    const q = await game({ cast, mascotte, w: 640, h: 360 });
    await q.p.waitForTimeout(1500);
    const s0 = await scene(q.p, '3d-niente', SCENES.fermo);
    check(`${what}: i modelli non si scaricano${cast === 'lobdrop' ? ', in campo le mascotte costruite nel codice' : ''}`, !q.glb.length && !s0.on3d.some(Boolean) && (cast !== 'lobdrop' || s0.seen[0].includes('NatpfDropTesta')) && !q.errs.length, `richieste ${q.glb.length}, ${s0.looks}`);
    await q.ctx.close();
  }
  // c) ripiego: il file di Drop non arriva → Drop resta quello costruito nel codice, Lob è il modello; una riga nella console
  const f = await game({ cast: 'lobdrop', mascotte: '3d', block: /mascotte-drop\.glb/ });
  await f.p.waitForTimeout(1500);
  const fs3 = await scene(f.p, '3d-ripiego', SCENES.fermo);
  await shot(f.p, 'b29-ripiego');
  const overlay = await f.p.evaluate(() => !!document.querySelector('vite-error-overlay'));
  check('ripiego (file di Drop bloccato): Drop costruito nel codice, Lob dal modello, racchetta in mano, nessun buco', !fs3.on3d[0] && fs3.on3d[1] && fs3.seen[0].includes('NatpfDropTesta') && fs3.seen[0].includes('NatpfTelaio') && fs3.seen[1].includes('NatpfMascotte3dLob') && fs3.grip.every(x => x < .05), `${fs3.on3d}`);
  check('ripiego: nessun errore a schermo, una riga sola nella console', !f.errs.length && !overlay && f.warns.length === 1 && /Drop.*mascotte costruita nel codice/.test(f.warns[0]), `${f.errs.join(' | ')} · ${f.warns.join(' | ')}`.slice(0, 300));
  await f.ctx.close();
  // d) partite a sorteggi fissi con i modelli: stessa impronta di «Classici» e del commit di prima; al colpo le corde
  // sono dove erano; palmo sul manico, piante sul campo, niente scatti, a ogni passo
  for (const [name, run0] of [['senza persone', { steps: 3600 }], ...Object.entries(RUNS)]){
    if (process.env.PARTITA && process.env.PARTITA !== name) continue;
    const key = name === 'senza persone' ? 'partita' : `partita-${name}`, seme = SEMI[name === 'senza persone' ? 'demo' : name];
    const run = seme ? { ...run0, seed: seme } : run0;
    let base = seme ? null : name === 'senza persone' ? prints.partita : partite[name];
    if (!base){ const g0 = await game({ cast: 'sempre', w: 640, h: 360 }); base = (await play(g0.p, run)).hash; await g0.ctx.close(); }
    const g3 = await game({ cast: 'lobdrop', mascotte: '3d', w: 640, h: 360 });
    const M = await play(g3.p, { ...run, clip: true, rig3d: true }), c3 = M.clip, R = M.rig;
    check(`3D, partita ${name}: giocata con i modelli in campo, stessa impronta di «Classici» (niente cambia nel gioco)`, M.hits >= 6 && M.hash === base && M.on3d.every(Boolean) && R.on.player === R.n && R.on.opponent === R.n && !g3.errs.length, `${M.hash} / ${base}, ${M.hits} colpi, modelli in ${R.on.player} e ${R.on.opponent} passi su ${R.n} ${g3.errs.join(' | ')}`);
    if (seme) console.log(`3D, partita ${name}: sorteggi ${seme} (SEMI), confronto con il commit di prima saltato`);
    else if (ref[key]) check(`3D, partita ${name}: identica al commit di prima`, ref[key] === M.hash, `${ref[key]} / ${M.hash}`);
    const pct = n => `${n} su ${c3.n} (${(n*100/c3.n).toFixed(1)}%)`;
    console.log(`3D, partita ${name}: telaio dentro la testa del modello · Drop prima ${pct(c3.prima.player)}, dopo ${pct(c3.dopo.player)} · Lob prima ${pct(c3.prima.opponent)}, dopo ${pct(c3.dopo.opponent)}`);
    console.log(`  dove (passi prima → dopo): ${Object.entries(c3.pose).map(([k, v]) => `${k} ${v[0]} → ${v[1]}`).join(' · ')}`);
    console.log(`  rig: palmo–manico al più ${(R.presa*100).toFixed(1)} cm, piante da ${(R.piantaMin*100).toFixed(1)} a ${(R.piantaMax*100).toFixed(1)} cm, passi con tutti e due i piedi alzati più di 5 cm ${R.inAria}, braccio allungato al più ${R.allungo.toFixed(2)} volte (${R.allungoDove?.chi} al passo ${R.allungoDove?.passo}), mano libera al più ${(R.manoLibera*100).toFixed(1)} cm per passo, scatto oltre il limite ${R.scatto.toFixed(1)} gradi ${R.dove}`);
    check(`3D, partita ${name}: al colpo le corde sono dove erano (punto d'impatto non cambiato), su tutti i colpi`, c3.colpi.length >= 6 && c3.colpi.every(x => Math.abs(x.dopo - x.prima) < .001), `${c3.colpi.length} colpi · ${JSON.stringify(c3.colpi.filter(x => x.scostamento > 0)).slice(0, 200)}`);
    check(`3D, partita ${name}: la racchetta è sempre nella mano (palmo a meno di 3,5 cm dal manico a ogni passo)`, R.presa < .035, `${(R.presa*100).toFixed(1)} cm`);
    check(`3D, partita ${name}: piedi sul campo (le piante non scendono mai sotto; un piede si alza al più di 23 cm nel passo: 18 di alzata più l'inclinazione; tutti e due in aria, cioè la fase di volo della corsa, in meno del 3 % dei passi)`, R.piantaMin > -.005 && R.piantaMax < .23 && R.inAria < R.n*.03, `da ${(R.piantaMin*100).toFixed(1)} a ${(R.piantaMax*100).toFixed(1)} cm, ${R.inAria} passi su ${R.n} con tutti e due i piedi alzati`);
    check(`3D, partita ${name}: niente scatti (ossa e mano libera, a ogni passo, anche tra un'animazione e l'altra)`, R.scatto === 0 && R.manoLibera < .2, `${R.dove || 'nessuno'} · mano libera al più ${(R.manoLibera*100).toFixed(1)} cm per passo oltre la mano del tennista`);
    const wait = Object.entries(c3.pose).filter(([k]) => /attesa/.test(k)).reduce((t, [, v]) => [t[0] + v[0], t[1] + v[1]], [0, 0]);
    check(`3D, partita ${name}: nell'attesa dello scambio il telaio non resta nella testa del modello (al più un quinto di prima)`, wait[1] <= Math.max(12, wait[0]*.2), `${wait[0]} → ${wait[1]} passi`);
    check(`3D, partita ${name}: la racchetta non fa scatti (al più 22 cm tra due passi)`, Math.max(c3.salto.player, c3.salto.opponent)*160 <= 22, `${(c3.salto.player*160).toFixed(1)} e ${(c3.salto.opponent*160).toFixed(1)} cm`);
    await g3.ctx.close();
  }
}

/* ---------- 7) B35 · chi serve si vede anche con Lob & Drop ---------- */
// Collaudo dell'utente del 13/11: «con i personaggi Lob & Drop non si vede chi serve». Partita vera (ciclo del gioco
// acceso, modelli 3D come nel programma), al servizio: contro la CPU la scritta «Al servizio» del motore sopra chi batte
// e la pallina del tabellone sulla sua riga; nello stesso schermo una scritta per metà (prima mancava, con tutti e due
// i personaggi), dentro la sua metà, sopra chi batte. Con «Classici» e con «Lob & Drop», battitore Player e CPU/Player 2.
if (!process.env.COSTO && !process.env.TESTA && !TRE_D && !FOGLI3D){
  for (const cast of ['sempre', 'lobdrop']) for (const mode of ['cpu', 'schermo']){
    const g = await game({ cast, mascotte: cast === 'lobdrop' ? '3d' : 'codice' }), p = g.p;
    for (const server of ['player', 'opponent']){
      const r = await p.evaluate(async ({ mode, server }) => {
        const E = __natpfTennis, ui = E.natpfUi;
        ui.lobby.visible = false; E.hud.hideTitleModal?.(); ui.onboarding?.close?.();
        E.autoPlayMode = false; E.userHasInteracted = true;
        if (mode === 'schermo'){ E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' }; if (!E.natpfSplit.active) E.startSplit(); }
        E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = false;
        E.score.server = server; E._setupPointServe?.({ showBanner: false }); ui.onScore(E.score, E.matchConfig.gamesToWin);
        // qualche fotogramma vero (il ciclo del gioco è acceso): la scritta segue chi batte
        await new Promise(res => { let n = 0; const f = () => (++n > 20 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
        const box = el => { if (!el || el.classList.contains('hidden')) return null; const b = el.getBoundingClientRect(); return b.width > 0 ? { x: Math.round(b.left + b.width/2), y: Math.round(b.top + b.height/2), w: Math.round(b.width), h: Math.round(b.height), text: el.textContent.trim() } : null; };
        const who = server === 'opponent' ? E.opponent : E.player;
        const head = (cam, vp) => { const v = who.pos.clone(); v.y += 1.6; v.project(cam); return { x: Math.round(vp.x + (v.x*.5 + .5)*vp.w), y: Math.round(vp.y + (-v.y*.5 + .5)*vp.h) }; };
        const W = innerWidth, H = innerHeight;
        const sb = [...document.querySelectorAll('.sb-row')].filter(r => r.offsetParent).map(r => { const ball = r.querySelector('.sb-serve'), cs = ball && getComputedStyle(ball); return { side: r.dataset.sbRow, serving: r.classList.contains('serving'), look: r.dataset.sbLook || '', ball: !!ball && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > .5 && ball.getBoundingClientRect().width > 3}; });
        // (ciclo del gioco fermo fino alla schermata: la CPU batterebbe subito e la scritta sparirebbe)
        if (!E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
        const out = { phase: E.phase, server: E.score.server, looks: [E.player.natpfLook, E.opponent.natpfLook], sb, W, H };
        if (mode === 'schermo'){
          const S = E.natpfSplit, vp = (await import('/src/natpf/natpf_split.js')).splitViewports(S.size.x, S.size.y);
          out.tags = ['p1', 'p2'].map(id => box(document.getElementById(`server-tag-${id}`)));
          out.engineTag = box(document.getElementById('server-tag'));
          out.heads = [head(E.camera, vp.p1), head(S.cam2, vp.p2)];
        } else {
          out.tag = box(document.getElementById('server-tag'));
          out.head = head(E.camera, { x: 0, y: 0, w: W, h: H });
        }
        return out;
      }, { mode, server });
      const name = `${cast === 'lobdrop' ? 'Lob & Drop' : 'Classici'}, ${mode === 'cpu' ? 'contro la CPU' : 'stesso schermo'}, batte ${server === 'player' ? (mode === 'cpu' ? 'chi gioca' : 'il Player 1') : (mode === 'cpu' ? 'la CPU' : 'il Player 2')}`;
      // (righe del tabellone dal lato di chi guarda: «me» è chi gioca o il Player 1, «them» la CPU o il Player 2; nello
      // stesso schermo la stessa tabella anche nella metà del Player 2)
      const mine = server === 'player' ? 'me' : 'them', rows = r.sb.filter(x => x.side === mine), others = r.sb.filter(x => x.side !== mine);
      const sbOk = rows.length >= 1 && rows.every(x => x.serving && x.ball) && others.every(x => !x.serving && !x.ball);
      const looksOk = cast === 'lobdrop' ? r.looks.join() === 'drop,lob' : !r.looks.includes('drop');
      if (mode === 'cpu'){
        const near = r.tag && Math.abs(r.tag.x - r.head.x) < 90 && r.tag.y < r.head.y + 10 && r.head.y - r.tag.y < 160;
        check(`B35 ${name}: «Al servizio» sopra chi batte e pallina del tabellone sulla sua riga`, ['SERVE_STANCE', 'SERVE_TOSS'].includes(r.phase) && looksOk && near && /Al servizio/.test(r.tag?.text || '') && sbOk, JSON.stringify({ tag: r.tag, head: r.head, sb: r.sb, phase: r.phase, looks: r.looks }));
      } else {
        const inHalf = (t, k) => !!t && (k === 0 ? t.x < r.W/2 : t.x > r.W/2) && t.y > 0 && t.y < r.H && /Al servizio/.test(t.text);
        const over = (t, h) => !!t && !!h && Math.abs(t.x - h.x) < 110 && t.y < h.y + 10;
        check(`B35 ${name}: «Al servizio» in tutte e due le metà, sopra chi batte; pallina del tabellone sulla sua riga`, ['SERVE_STANCE', 'SERVE_TOSS'].includes(r.phase) && looksOk && inHalf(r.tags[0], 0) && inHalf(r.tags[1], 1) && over(r.tags[0], r.heads[0]) && over(r.tags[1], r.heads[1]) && !r.engineTag && sbOk, JSON.stringify({ tags: r.tags, heads: r.heads, engineTag: r.engineTag, sb: r.sb, looks: r.looks }));
      }
      await p.screenshot({ path: path.join(SHOTS, `b35-servizio-${cast}-${mode}-${server}.png`) });
      await p.evaluate(() => { const E = __natpfTennis; if (E.__frame0){ E._natpfFrame = E.__frame0; delete E.__frame0; } });
    }
    check(`B35 chi serve, ${cast} ${mode}: nessun errore`, !g.errs.length, g.errs.join(' | ').slice(0, 300));
    await g.ctx.close();
  }
  if (SERVIZIO){ await B.close(); summary(); process.exit(process.exitCode || 0); }
}

/* ---------- 5) costo: stesso fotogramma disegnato con i tre aspetti, fotogrammi al secondo ---------- */
{
  // finestra piccola: con la grafica in software del banco di prova il disegno è lento, e qui conta il confronto
  // la pagina parte con i modelli 3D già montati (poi il ciclo del gioco si ferma e non si monterebbero più)
  const g = await game({ cast: 'lobdrop', w: 640, h: 360, mascotte: '3d' }), p = g.p;
  // aspetto: 'sempre' (classici), 'lobdrop' (mascotte costruite nel codice), '3d' (modelli)
  const use = (p, v) => p.evaluate(v => { const E = __natpfTennis; E.natpfMascotMode(v === '3d' ? '3d' : 'codice'); E.natpfUi.lobby.setCast(v === 'sempre' ? 'sempre' : 'lobdrop'); }, v);
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
  for (const round of [1, 2, 3]) for (const cast of ['sempre', 'lobdrop', '3d']){
    await use(p, cast); const sc = await scene(p, `costo-${cast}-${round}`, SCENES.dritto);
    if (round === 1) check(`costo: aspetto ${cast} in scena`, cast === 'sempre' ? sc.looks.join() === 'p1,cpu' : sc.looks.join() === 'drop,lob' && sc.on3d.every(Boolean) === (cast === '3d'), `${sc.looks} ${sc.on3d}`);
    const d = await draw();
    cost[cast] = cost[cast] ? { ...d, ms: Math.min(d.ms, cost[cast].ms) } : d;
  }
  const A = cost.sempre, M = cost.lobdrop, T = cost['3d'];
  console.log(`disegno dello stesso fotogramma (il più breve di ${DRAW_N} disegni per 3 giri alternati): classici ${A.ms} ms, ${A.calls} chiamate, ${A.tris} triangoli · Lob & Drop ${M.ms} ms, ${M.calls} chiamate, ${M.tris} triangoli`);
  check('costo del disegno: chiamate e triangoli non più del 10% sopra i personaggi classici', M.calls <= A.calls*1.1 + 2 && M.tris <= A.tris*1.1, `chiamate ${A.calls} → ${M.calls}, triangoli ${A.tris} → ${M.tris}`);
  check('costo del disegno: tempo non peggiorato (entro il 12%, misura a macchina condivisa)', M.ms <= A.ms*1.12 + .5, `${A.ms} ms → ${M.ms} ms`);
  console.log(`  modelli 3D: ${T.ms} ms, ${T.calls} chiamate, ${T.tris} triangoli`);
  check('3D, costo del disegno: meno chiamate delle mascotte nel codice, triangoli non più dell\'1% sopra', T.calls <= M.calls && T.tris <= M.tris*1.01, `chiamate ${M.calls} → ${T.calls}, triangoli ${M.tris} → ${T.tris}`);
  check('3D, costo del disegno: tempo non peggiorato rispetto alle mascotte nel codice (entro il 12%)', T.ms <= M.ms*1.12 + .5, `${M.ms} ms → ${T.ms} ms`);
  // fotogrammi al secondo con il gioco che gira (scambio senza persone), due giri alternati
  const fps = cast => p.evaluate(async ({ cast, ms }) => {
    const E = __natpfTennis;
    E.natpfMascotMode(cast === '3d' ? '3d' : 'codice'); E.natpfUi.lobby.setCast(cast === 'sempre' ? 'sempre' : 'lobdrop');
    E.natpfSplit.active = false; E.natpfPaused = false; E.autoPlayMode = true; window.__seed(99); E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = true;
    E._natpfFrame = E.__frame0;
    await new Promise(r => setTimeout(r, 800));
    // tempo tra il primo e l'ultimo fotogramma diviso per i fotogrammi in mezzo (almeno 8): con la grafica in software
    // i fotogrammi sono pochi, e contarli in una finestra fissa sbaglierebbe di uno su pochi
    let n = 0, first = 0, last = 0; const t0 = performance.now();
    await new Promise(done => { const f = () => { last = performance.now(); if (!n++) first = last; if (last - t0 >= ms && n >= 9) done(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
    E._natpfFrame = () => 'paused';
    return { fps: +((n - 1)*1000/(last - first)).toFixed(2), frames: n, looks: [E.player.natpfLook, E.opponent.natpfLook], on3d: !!E.player.natpfMascot3dOn && !!E.opponent.natpfMascot3dOn };
  }, { cast, ms: FPS_MS });
  const f = { sempre: [], lobdrop: [], '3d': [] };
  for (const round of [1, 2]) for (const cast of ['sempre', 'lobdrop', '3d']){ const r = await fps(cast); f[cast].push(r.fps); if (cast !== 'sempre') check(`giro ${round}: in partita ci sono Drop e Lob${cast === '3d' ? ' dai modelli 3D' : ' costruiti nel codice'}`, r.looks.join() === 'drop,lob' && r.on3d === (cast === '3d'), `${r.looks} ${r.on3d}`); }
  const best = k => Math.max(...f[k]);
  console.log(`fotogrammi al secondo (grafica in software, ${FPS_MS} ms per misura): classici ${f.sempre.join(' e ')} · Lob & Drop nel codice ${f.lobdrop.join(' e ')} · modelli 3D ${f['3d'].join(' e ')}`);
  check('fotogrammi al secondo non peggiorati (il migliore dei due giri entro il 10% dei personaggi classici)', best('lobdrop') >= best('sempre')*.9, `classici ${best('sempre')}, Lob & Drop ${best('lobdrop')}`);
  check('3D, fotogrammi al secondo non peggiorati rispetto alle mascotte nel codice (il migliore dei due giri entro il 10%)', best('3d') >= best('lobdrop')*.9, `nel codice ${best('lobdrop')}, modelli 3D ${best('3d')}`);
  check('costo: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}
await B.close(); summary();
process.exit(process.exitCode || 0);   // il server del gioco (vite) resta acceso: senza questo la prova non finisce mai
