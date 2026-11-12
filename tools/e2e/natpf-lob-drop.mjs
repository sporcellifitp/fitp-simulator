// NATPF motore base (natpf-tennis/): B24, Lob & Drop come personaggi in campo (src/natpf/natpf_lob_drop.js) e la loro
// opzione «Personaggi in campo: Di sempre · Lob & Drop» (src/natpf/natpf_personaggi.js, chiave natpf-tennis.personaggi,
// parametro ?personaggi=lobdrop|sempre). Prova nel browser:
//   1) scene ferme e ripetibili (ciclo del gioco fermo, sorteggi fissi, stesse pose): con «Di sempre» il disegno è
//      identico pixel per pixel a quello di prima del B24 (CONFRONTA=file.json con le impronte fatte sul commit di prima
//      con BASELINE=file.json e GAME=cartella del gioco di prima); con «Lob & Drop» cambia;
//   2) opzione e parametro: di base «Di sempre», clic su «Lob & Drop» → personaggi cambiati subito e scelta salvata,
//      resta dopo aver ricaricato; ?personaggi= vale per l'avvio senza toccare il valore salvato;
//   3) in campo contro la CPU e nello stesso schermo: chi gioca è Drop, l'altro è Lob, ritratti compresi; i pezzi del
//      tennista sono nascosti, la racchetta resta nella mano, anche per il mancino;
//   4) partita vera contro la CPU con le mascotte (chi gioca colpisce dalla tastiera del gioco): colpi di tutti e due;
//   5) costo: tempo del disegno dello stesso fotogramma con i due aspetti e fotogrammi al secondo (FPS_MS, DRAW_N).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-lob-drop.mjs
//   SHOTS=cartella (schermate; predefinita nella cartella temporanea) · GAME_PORT (3164) · GAME=cartella del gioco
//   BASELINE=file.json: solo la parte 1, scrive le impronte (da fare sul commit di prima) · CONFRONTA=file.json
//   SOLO=1: solo la parte 1 · COSTO=1: solo la parte 5 · FOGLI=cartella: solo i fogli di immagini (docs/b24/img)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, check, summary } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = process.env.GAME || path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3164), FPS_MS = +(process.env.FPS_MS || 6000), DRAW_N = +(process.env.DRAW_N || 40);
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
    await p.goto(`http://127.0.0.1:${GAME_PORT}/?${query}`, { waitUntil: 'domcontentloaded' });
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
  // 1) da vicino: davanti, dietro, di lato, accanto alla foto
  const near = await game({ cast: 'lobdrop', w: 560, h: 640 });
  const closeUp = async (actor, view, extra = {}) => { await scene(near.p, `v-${actor}-${view}`, { pose: 'fermo', ...extra, cam: { actor, ...NEAR[view] } }); return png(near.p); };
  for (const [actor, nome] of [['player', 'Drop'], ['opponent', 'Lob']]){
    const tiles = [{ src: photo, label: 'Foto di riferimento', dx: actor === 'player' ? -.2 : .2, dy: .06 }];
    for (const [v, l] of [['front', 'davanti'], ['side', 'di lato'], ['back', 'dietro']]) tiles.push({ src: await closeUp(actor, v), label: `${nome} nel gioco, ${l}` });
    await sheet(`${nome.toLowerCase()}-da-vicino.webp`, tiles, { cols: 4, w: 400, h: 460, title: `${nome}: foto di riferimento e personaggio nel gioco` });
  }
  // 2) i gesti da vicino: dritto, rovescio, servizio, esultanza (stesse animazioni del tennista)
  const gest = [];
  for (const [actor, nome] of [['player', 'Drop'], ['opponent', 'Lob']])
    for (const [pose, steps, l, view] of [['dritto', 6, 'dritto', 'front'], ['servizio', 5, 'servizio', 'front'], ['esultanza', 22, 'esultanza', 'front'], ['rovescio', 6, 'rovescio', 'back']])
      gest.push({ src: await closeUp(actor, view, { pose, steps, who: actor }), label: `${nome}: ${l}${view === 'back' ? ' (da dietro)' : ''}` });
  await sheet('gesti-da-vicino.webp', gest, { cols: 4, w: 380, h: 430, title: 'Lob & Drop: stesse animazioni dei personaggi di sempre' });
  await near.ctx.close();
  // 3) mancini: lo specchio, la scritta resta leggibile
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
  // 4) in campo dalla camera di gioco: fermo, dritto, servizio, esultanza; stesso schermo; «Di sempre» accanto
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
  for (const [cast, l] of [['sempre', 'Di sempre'], ['lobdrop', 'Lob & Drop']]){
    await setCast(court.p, cast);
    for (const n of ['fermo', 'split']){ await scene(court.p, `k-${cast}-${n}`, SCENES[n]); cmp.push({ src: await png(court.p), label: `${l}${n === 'split' ? ', stesso schermo' : ''}` }); }
  }
  await sheet('confronto-di-sempre.webp', cmp, { cols: 2, w: 640, h: 360, title: 'Opzioni → Personaggi in campo: «Di sempre» e «Lob & Drop»' });
  await court.ctx.close();
  await B.close(); summary(); process.exit(process.exitCode || 0);
}

const HUMAN = /^Natpf(Polo|Colletto|Abbottonatura|Bottoni|Pantaloncini|Collo|Testa|Capelli|Fascia|Orecchie|Naso|ManoDx|ManoSx|Scarpa|Suola|Manica|Orlo|Calza)/;
const MASCOT = /^Natpf(Drop|Lob)|^NatpfOcchio|^NatpfBoccaAperta|^NatpfLingua/;

/* ---------- 1) scene ferme: «Di sempre» identico a prima, «Lob & Drop» diverso, ritorno identico ---------- */
// Partita senza persone (le due parti giocano da sole) a passi fissi e sorteggi fissi: impronta di palla, giocatori e
// punteggio. Deve essere la stessa con i due valori dell'opzione e sul commit di prima (niente cambia nel gioco).
const play = (p, steps = 2400) => p.evaluate(steps => {
  const E = __natpfTennis;
  if (!E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
  E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.userHasInteracted = true; E.natpfPaused = false;
  for (const a of [E.player, E.opponent]){
    a.model.scale.setScalar(1.16); a.rig = null; E.bodyAnimator.setupArticulatedPlayerRig(a); a.racketKinematics = null; E.racketKinematics.initActor(a);
    a.natpfReach = null; if (a.userData) a.userData.natpfPrep = null; a.stridePhase = 0; a.swingTimer = 0; a.vel?.set(0, 0, 0);
  }
  E._natpfBackdropPose();
  window.__seed(4242); E.elapsedTime = 0; E.physicsAccumulator = 0; E.autoPlayMode = true;
  E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = true;
  let h = 0x811c9dc5, hits = 0, last = 0, pts = 0, score = '';
  const eat = v => { const n = Math.round(v*1000) | 0; for (let k = 0; k < 4; k++){ h ^= (n >>> (k*8)) & 255; h = Math.imul(h, 0x01000193) >>> 0; } };
  for (let i = 0; i < steps; i++){
    E.update(1/60);
    if (i % 300 === 0) E.render();                      // si disegna ogni tanto: i personaggi scelti sono in scena
    const b = E.ball, s = E.score;
    if (b.rallyStrokeCount !== last){ if (b.rallyStrokeCount > last) hits++; last = b.rallyStrokeCount; }
    const sc = `${s.playerPoints}-${s.opponentPoints}/${s.playerGames}-${s.opponentGames}`;
    if (sc !== score){ score = sc; pts++; }
    if (i % 6 === 0) for (const v of [b.pos.x, b.pos.y, b.pos.z, E.player.pos.x, E.player.pos.z, E.opponent.pos.x, E.opponent.pos.z, s.playerPoints, s.opponentPoints, s.playerGames, s.opponentGames]) eat(v);
  }
  E.autoPlayMode = false;
  return { hash: h.toString(16), hits, changes: pts - 1, score, looks: [E.player.natpfLook, E.opponent.natpfLook] };
}, steps);

const prints = {};
if (!process.env.COSTO){
  const g = await game({ cast: BASELINE ? null : 'sempre' }), p = g.p;
  const pa = await play(p), pb = await play(p);
  prints.partita = pa.hash;
  check('partita senza persone, sorteggi fissi: ripetibile (stessa impronta due volte)', pa.hash === pb.hash && pa.hits >= 8, `${pa.hash} / ${pb.hash}, ${pa.hits} colpi, punteggio ${pa.score} (${pa.changes} cambi)`);
  for (const [name, o] of Object.entries(SCENES)){
    const a = await scene(p, `${name}-a`, o), b = await scene(p, `${name}-b`, o);
    prints[name] = a.hash;
    check(`${name}: scena ripetibile (stessa impronta due volte)`, a.hash === b.hash && await diff(p, `${name}-a`, `${name}-b`) === 0, `${a.hash} / ${b.hash}, ${await where(p, `${name}-a`, `${name}-b`)}`);
    if (!BASELINE){
      check(`${name}: «Di sempre» → i personaggi di prima, nessun pezzo delle mascotte`, a.looks[0] === 'p1' && a.looks[1] === (o.multi ? 'p2' : 'cpu') && !a.seen.flat().some(n => MASCOT.test(n)) && a.seen[0].some(n => HUMAN.test(n)), JSON.stringify(a.looks));
      await shot(p, `b24-${name}-sempre`);
    }
  }
  check('«Di sempre»: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  if (BASELINE){
    writeFileSync(BASELINE, JSON.stringify(prints, null, 2));
    console.log(`impronte di riferimento scritte in ${BASELINE}`);
    await g.ctx.close(); await B.close(); summary(); process.exit(process.exitCode || 0);
  }
  if (CONFRONTA && existsSync(CONFRONTA)){
    const ref = JSON.parse(readFileSync(CONFRONTA, 'utf8'));
    for (const name of Object.keys(prints)) check(`${name}: «Di sempre» → ${name === 'partita' ? 'partita identica' : 'disegno identico'} a prima del B24`, ref[name] === prints[name], `${ref[name]} prima, ${prints[name]} ora`);
  } else console.log('(senza CONFRONTA=file.json: niente confronto con il commit di prima del B24)');

  // stessa pagina, «Lob & Drop» al volo: il disegno cambia, il gioco no; di nuovo «Di sempre»: disegno di prima
  await setCast(p, 'lobdrop');
  const pm = await play(p);
  check('partita con Lob & Drop: stessa impronta della partita con i personaggi di sempre (niente cambia nel gioco)', pm.hash === prints.partita && pm.looks.join() === 'drop,lob', `${pm.hash} / ${prints.partita}, in campo ${pm.looks}`);
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
    check(`${name}: tornati a «Di sempre» → disegno identico a prima`, a.hash === prints[name] && await diff(p, `${name}-a`, `${name}-r`) === 0, `${a.hash} / ${prints[name]}`);
  }
  check('cambio al volo: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
  if (process.env.SOLO){ await B.close(); summary(); process.exit(process.exitCode || 0); }
}

/* ---------- 2) opzione e parametro ---------- */
if (!process.env.COSTO){
  const def = await game({ cast: null }), p = def.p;
  const d0 = await p.evaluate(K => ({ saved: localStorage.getItem(K), looks: [__natpfTennis.player.natpfLook, __natpfTennis.opponent.natpfLook] }), KEY);
  check('niente di salvato: personaggi di sempre', d0.saved == null && d0.looks.join() === 'p1,cpu', JSON.stringify(d0));
  await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options'));
  await p.waitForSelector('[data-natpf-cast="lobdrop"]', { state: 'visible', timeout: 10000 });
  const row = await p.evaluate(() => { const b = document.querySelector('[data-natpf-cast="sempre"]'), r = b.closest('.lobby-row'), bb = r.getBoundingClientRect(), m = document.getElementById('title-modal').getBoundingClientRect();
    return { label: r.querySelector('.lobby-label').textContent.trim(), btns: [...r.querySelectorAll('[data-natpf-cast]')].map(x => x.textContent.trim() + (x.classList.contains('selected') ? '*' : '')), inside: bb.left >= m.left - 1 && bb.right <= m.right + 1 }; });
  check('Opzioni: riga «Personaggi in campo» con «Di sempre» (scelto) e «Lob & Drop»', row.label === 'Personaggi in campo' && row.btns.join(' | ') === 'Di sempre* | Lob & Drop' && row.inside, JSON.stringify(row));
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
  check('clic su «Di sempre»: tornano i personaggi di prima, ritratti compresi, scelta salvata', back && s3.saved === 'sempre' && s3.sel === 'sempre' && s3.por.every(l => l === 'p1' || l === 'cpu'), JSON.stringify(s3));
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
  check('?personaggi=sempre con «Lob & Drop» salvato: personaggi di sempre per questo avvio, il valore salvato resta', r2.saved === 'lobdrop' && r2.looks.join() === 'p1,cpu', JSON.stringify(r2));
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
  const g = await game({ cast: 'sempre' }), p = g.p;
  // tempo del disegno (con la grafica in software del banco di prova: conta il confronto, non il valore) e conti del
  // disegno: chiamate e triangoli per fotogramma
  const draw = () => p.evaluate(async N => {
    const E = __natpfTennis, gl = E.renderer.getContext(), px = new Uint8Array(4);
    const one = () => { const t = performance.now(); E.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return performance.now() - t; };
    for (let i = 0; i < 4; i++) one();
    const t = []; for (let i = 0; i < N; i++) t.push(one());
    t.sort((a, b) => a - b);
    const info = E.renderer.info.render;
    return { ms: +t[t.length >> 1].toFixed(2), calls: info.calls, tris: info.triangles };
  }, DRAW_N);
  const cost = {};
  for (const round of [1, 2]) for (const cast of ['sempre', 'lobdrop']){
    await setCast(p, cast); await scene(p, `costo-${cast}-${round}`, SCENES.dritto);
    const d = await draw();
    cost[cast] = cost[cast] ? { ...d, ms: Math.min(d.ms, cost[cast].ms) } : d;
  }
  const A = cost.sempre, M = cost.lobdrop;
  console.log(`disegno dello stesso fotogramma (mediana di ${DRAW_N}, il migliore di 2 giri): di sempre ${A.ms} ms, ${A.calls} chiamate, ${A.tris} triangoli · Lob & Drop ${M.ms} ms, ${M.calls} chiamate, ${M.tris} triangoli`);
  check('costo del disegno: chiamate e triangoli non più del 10% sopra i personaggi di sempre', M.calls <= A.calls*1.1 + 2 && M.tris <= A.tris*1.1, `chiamate ${A.calls} → ${M.calls}, triangoli ${A.tris} → ${M.tris}`);
  check('costo del disegno: tempo non peggiorato (entro il 12%, misura a macchina condivisa)', M.ms <= A.ms*1.12 + .5, `${A.ms} ms → ${M.ms} ms`);
  // fotogrammi al secondo con il gioco che gira (scambio senza persone), due giri alternati
  const fps = cast => p.evaluate(async ({ cast, ms }) => {
    const E = __natpfTennis;
    E.natpfUi.lobby.setCast(cast);
    E.natpfSplit.active = false; E.natpfPaused = false; E.autoPlayMode = true; window.__seed(99); E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = true;
    E._natpfFrame = E.__frame0;
    await new Promise(r => setTimeout(r, 800));
    let n = 0; const t0 = performance.now();
    await new Promise(done => { const f = () => { n++; if (performance.now() - t0 >= ms) done(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const dt = performance.now() - t0;
    E._natpfFrame = () => 'paused';
    return { fps: +(n*1000/dt).toFixed(1), looks: [E.player.natpfLook, E.opponent.natpfLook] };
  }, { cast, ms: FPS_MS });
  const f = { sempre: [], lobdrop: [] };
  for (const round of [1, 2]) for (const cast of ['sempre', 'lobdrop']){ const r = await fps(cast); f[cast].push(r.fps); if (cast === 'lobdrop') check(`giro ${round}: in partita ci sono Drop e Lob`, r.looks.join() === 'drop,lob', r.looks.join()); }
  const best = k => Math.max(...f[k]);
  console.log(`fotogrammi al secondo (grafica in software, ${FPS_MS} ms per misura): di sempre ${f.sempre.join(' e ')} · Lob & Drop ${f.lobdrop.join(' e ')}`);
  check('fotogrammi al secondo non peggiorati (entro il 10% dei personaggi di sempre)', best('lobdrop') >= best('sempre')*.9, `di sempre ${best('sempre')}, Lob & Drop ${best('lobdrop')}`);
  check('costo: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}
await B.close(); summary();
