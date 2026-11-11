// NATPF motore base (natpf-tennis/): scia luminosa della palla (B22, src/natpf/natpf_ball_glow.js) e la sua opzione
// «Scia della palla: Sì · No» nelle Opzioni (natpf-tennis.sciaPalla). Prova nel browser:
//   1) scena ferma e ripetibile (stessa palla, stessa camera, ciclo del gioco fermo): con l'opzione accesa la scia c'è
//      (pixel diversi vicino alla palla), spenta il disegno è identico pixel per pixel a quello di prima del B22
//      (CONFRONTA=file.json con le impronte fatte sul commit di prima con BASELINE=file.json);
//   2) partita vera contro la CPU (chi gioca colpisce dalla tastiera del gioco): la scia si accende sui colpi di tutti e due;
//   3) opzione dal menu Opzioni: clic su «No», resta salvata dopo aver ricaricato la pagina, clic su «Sì»;
//   4) costo: tempo del disegno dello stesso fotogramma con e senza la scia, tempo del calcolo, fotogrammi al secondo
//      (FPS_MS millisecondi per misura, DRAW_N disegni per lato).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-scia-palla.mjs
//   SHOTS=cartella (schermate; predefinita nella cartella temporanea) · GAME_PORT (3162)
//   BASELINE=file.json: solo la parte 1, scrive le impronte dei fotogrammi (da fare sul commit di prima)
//   CONFRONTA=file.json: la parte 1 confronta le impronte con l'opzione spenta · SOLO=1: solo la parte 1
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, check, summary } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3162), FPS_MS = +(process.env.FPS_MS || 6000);
const SHOTS = process.env.SHOTS || path.join(tmpdir(), 'natpf-scia-palla'); mkdirSync(SHOTS, { recursive: true });
const BASELINE = process.env.BASELINE || '', CONFRONTA = process.env.CONFRONTA || '';
const KEY = 'natpf-tennis.sciaPalla';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const B = await launch();

// pagina del gioco pronta; trail: valore salvato dell'opzione prima dell'avvio ('1', '0' o null = niente di salvato)
async function game({ trail = null, query = 'intro=0', w = 1280, h = 720 } = {}){
  const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  // sorteggi ripetibili (pubblico, scintille): stesso generatore a ogni avvio
  await p.addInitScript(({ KEY, trail }) => {
    let a = 20261111; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
    // con il mouse: niente pannello «Telefono in pausa» sopra il campo
    try { localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); } catch {}
    // solo al primo avvio della pagina (una ricarica deve trovare quello che ha salvato il gioco)
    try { if (!sessionStorage.getItem('scia-prova')){ if (trail == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, trail); } sessionStorage.setItem('scia-prova', '1'); } catch {}
  }, { KEY, trail });
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

// Scena ferma: ciclo del gioco fermato, personaggi nascosti, palla in volo con la sua storia (passi della fisica
// a 1/120 s, un «fotogramma» ogni due passi), camera di gioco assestata, un disegno. Restituisce l'impronta dei pixel
// del canvas (FNV-1a) e tiene i pixel in window.__px[name] per i confronti.
const scene = (p, name, o) => p.evaluate(({ name, o }) => {
  const E = __natpfTennis;
  E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
  if (!E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
  for (const el of document.body.querySelectorAll('*')){ const cv = E.renderer.domElement; if (el !== cv && !el.contains(cv)) el.style.visibility = 'hidden'; }
  E.natpfSplit.active = false; E._natpfBackdropPose(); E.swingVfx?.clearAllTrails?.();
  // i personaggi respirano e sbattono gli occhi a ogni passo di animazione: nella scena ferma non si disegnano
  if (!E.__hidden){ E.__hidden = true; for (const a of [E.player, E.opponent, E.playerPartner, E.opponentPartner]) for (const o of [a?.root, a?.shadowBlob, a?.model, a?.swingArcMesh]) if (o) Object.defineProperty(o, 'visible', { get: () => false, set(){}, configurable: true }); }
  for (const s of E.starParticles || []){ s.active = false; if (s.mesh) s.mesh.visible = false; }
  E.phase = 'RALLY'; E.cameraMode = 'RALLY_CAM'; E.ball.inPlay = true; E.ball.isPowerShot = !!o.power; E.ball.shotType = o.shot || 'TOPSPIN';
  if (E.ball.mesh) E.ball.mesh.visible = true;
  E.ballTrail.clear(); E.ballTrail.setStyle(o.shot || 'TOPSPIN', !!o.power);
  const pos = E.ball.pos.set(...o.pos), vel = E.ball.vel.set(...o.vel), h = 1/120;
  E._updateEffects(0);
  for (let k = 0; k < o.steps; k++){
    vel.y -= 9.15*h; pos.addScaledVector(vel, h);
    if (pos.y < .033 && vel.y < 0){ pos.y = .033; vel.y *= -.77; }
    E.ballTrail.pushPoint(pos);
    if (k % 2 === 1) E._updateEffects(1/60);
  }
  E.natpfSplit.active = !!o.split;
  E._snapCameraImmediate(); E._updateEffects(0);
  if (o.split){ E.render(); E.render(); } else E.render();
  const gl = E.renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W*H*4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let hash = 0x811c9dc5; for (let i = 0; i < px.length; i++){ hash ^= px[i]; hash = Math.imul(hash, 0x01000193) >>> 0; }
  (window.__px ||= {})[name] = px;
  const G = E.natpfBallGlow;
  return { hash: hash.toString(16), W, H, glow: G ? { on: G.enabled, visible: !!G.mesh?.visible, segs: G.segments, level: +(+G.level).toFixed(3), len: +(+G.length).toFixed(2) } : null, speed: +vel.length().toFixed(1) };
}, { name, o });
// pixel diversi tra due scene (e quanti di quelli sono diventati più gialli: rosso e verde su, come la scia)
const diff = (p, a, b) => p.evaluate(({ a, b }) => {
  const A = __px[a], Bx = __px[b]; let n = 0, yellow = 0;
  for (let i = 0; i < A.length; i += 4){
    if (A[i] !== Bx[i] || A[i + 1] !== Bx[i + 1] || A[i + 2] !== Bx[i + 2]){ n++; if (Bx[i] > A[i] && Bx[i + 1] > A[i + 1]) yellow++; }
  }
  return { n, yellow };
}, { a, b });
const shot = (p, name) => p.locator('canvas').first().screenshot({ path: path.join(SHOTS, `${name}.png`) });

// scene: palla che va verso la CPU, palla che torna verso chi gioca, colpo potente, pallonetto lento, due viste
const SCENES = {
  andata:  { pos: [1.2, 1.0, 10.5], vel: [-3.5, 5.5, -27], steps: 54 },
  ritorno: { pos: [-1.0, 1.1, -10.5], vel: [2.4, 5.2, 25], steps: 60 },
  potente: { pos: [1.2, 1.0, 10.5], vel: [-3.5, 4.2, -33], steps: 48, power: true, shot: 'SMASH' },
  lento:   { pos: [0.5, 1.0, 9], vel: [-0.6, 9.5, -8.5], steps: 70, shot: 'LOB' },
  rimbalzo: { pos: [-0.8, 1.6, -4], vel: [1.5, -1.5, 22], steps: 46 },
  split:   { pos: [1.2, 1.0, 10.5], vel: [-3.5, 5.5, -27], steps: 54, split: true },
};

/* ---------- 1) scena ferma: accesa, spenta, confronto con il disegno di prima ---------- */
const prints = {};
{
  const off = await game({ trail: '0' });
  for (const [name, o] of Object.entries(SCENES)){
    const a = await scene(off.p, `${name}-a`, o), b = await scene(off.p, `${name}-b`, o);
    prints[name] = a.hash;
    const d = await diff(off.p, `${name}-a`, `${name}-b`);
    check(`${name}: scena ripetibile (stessa impronta due volte)`, a.hash === b.hash && d.n === 0, `${a.hash} / ${b.hash}, ${d.n} pixel diversi, palla a ${a.speed} m/s`);
    if (!BASELINE) check(`${name}: opzione spenta → scia nuova assente`, a.glow && !a.glow.on && !a.glow.visible, JSON.stringify(a.glow));
    await shot(off.p, `scia-${name}-spenta`);
  }
  check('opzione spenta: nessun errore', !off.errs.length, off.errs.join(' | ').slice(0, 300));
  if (BASELINE){
    writeFileSync(BASELINE, JSON.stringify(prints, null, 2));
    console.log(`impronte di riferimento scritte in ${BASELINE}`);
    await off.ctx.close(); await B.close(); summary(); process.exit(process.exitCode || 0);
  }
  if (CONFRONTA && existsSync(CONFRONTA)){
    const ref = JSON.parse(readFileSync(CONFRONTA, 'utf8'));
    for (const name of Object.keys(SCENES)) check(`${name}: opzione spenta → disegno identico a prima del B22`, ref[name] === prints[name], `${ref[name]} prima, ${prints[name]} ora`);
  } else console.log('(senza CONFRONTA=file.json: niente confronto con il disegno di prima del B22)');
  await off.ctx.close();

  const on = await game({ trail: '1' });
  for (const [name, o] of Object.entries(SCENES)){
    const a = await scene(on.p, `${name}-on`, o);
    await shot(on.p, `scia-${name}-accesa`);
    // stessa pagina, opzione spenta al volo: il confronto pixel per pixel dice dove sta la scia
    await on.p.evaluate(() => __natpfTennis.natpfBallGlow.setEnabled(false));
    const b = await scene(on.p, `${name}-off`, o);
    await on.p.evaluate(() => __natpfTennis.natpfBallGlow.setEnabled(true));
    const d = await diff(on.p, `${name}-off`, `${name}-on`);
    check(`${name}: spenta al volo → stesso disegno di prima`, b.hash === prints[name], `${b.hash} / ${prints[name]}`);
    if (name === 'lento') check(`${name}: palla lenta (${a.speed} m/s) → scia appena accennata o assente`, a.glow.level <= .25 && d.n < 1500, `livello ${a.glow.level}, ${d.n} pixel`);
    else check(`${name}: opzione accesa → scia visibile (pixel più gialli dietro la palla)`, a.glow.on && a.glow.visible && a.glow.segs > 3 && d.n > (name === 'ritorno' ? 120 : 400) && d.yellow > .8*d.n, `${JSON.stringify(a.glow)}, ${d.n} pixel diversi, ${d.yellow} più gialli, palla a ${a.speed} m/s`);
  }
  if (process.env.SOLO){ await on.ctx.close(); await B.close(); summary(); process.exit(process.exitCode || 0); }
  // opzione mai toccata: accesa di base
  check('opzione accesa: nessun errore', !on.errs.length, on.errs.join(' | ').slice(0, 300));
  await on.ctx.close();
  const def = await game({ trail: null });
  const d0 = await def.p.evaluate(K => ({ on: __natpfTennis.natpfBallGlow.enabled, saved: localStorage.getItem(K) }), KEY);
  check('niente di salvato: scia accesa di base', d0.on === true && d0.saved == null, JSON.stringify(d0));

  /* ---------- 3) opzione nelle Opzioni: clic, salvataggio, ricarica ---------- */
  const p = def.p;
  await p.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.go('options'); });
  await p.waitForSelector('[data-natpf-trail="0"]', { state: 'visible', timeout: 10000 });
  const row = await p.evaluate(() => { const b = document.querySelector('[data-natpf-trail="1"]'), r = b.closest('.lobby-row'); return { label: r.querySelector('.lobby-label').textContent.trim(), btns: [...r.querySelectorAll('[data-natpf-trail]')].map(x => `${x.textContent.trim()}${x.classList.contains('selected') ? '*' : ''}`) }; });
  check('Opzioni: riga «Scia della palla» con Sì (scelto) e No', row.label === 'Scia della palla' && row.btns.join(' ') === 'Sì* No', JSON.stringify(row));
  await p.screenshot({ path: path.join(SHOTS, 'scia-opzioni.png') });
  await p.click('[data-natpf-trail="0"]');
  const s1 = await p.evaluate(K => ({ on: __natpfTennis.natpfBallGlow.enabled, saved: localStorage.getItem(K), sel: document.querySelector('[data-natpf-trail].selected')?.dataset.natpfTrail, aria: document.querySelector('[data-natpf-trail="0"]').getAttribute('aria-checked') }), KEY);
  check('clic su «No»: scia spenta subito e salvata', s1.on === false && s1.saved === '0' && s1.sel === '0' && s1.aria === 'true', JSON.stringify(s1));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby && __natpfTennis.natpfBallGlow, null, { timeout: 60000 });
  await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options'));
  const s2 = await p.evaluate(K => ({ on: __natpfTennis.natpfBallGlow.enabled, saved: localStorage.getItem(K), sel: document.querySelector('[data-natpf-trail].selected')?.dataset.natpfTrail }), KEY);
  check('pagina ricaricata: resta «No»', s2.on === false && s2.saved === '0' && s2.sel === '0', JSON.stringify(s2));
  await p.click('[data-natpf-trail="1"]');
  const s3 = await p.evaluate(K => ({ on: __natpfTennis.natpfBallGlow.enabled, saved: localStorage.getItem(K), sel: document.querySelector('[data-natpf-trail].selected')?.dataset.natpfTrail }), KEY);
  check('clic su «Sì»: scia accesa e salvata', s3.on === true && s3.saved === '1' && s3.sel === '1', JSON.stringify(s3));
  check('Opzioni: nessun errore', !def.errs.length, def.errs.join(' | ').slice(0, 300));
  await def.ctx.close();
}

/* ---------- 2) partita vera contro la CPU: scia sui colpi di tutti e due ---------- */
// Una palla della CPU verso chi gioca, poi il motore va avanti da solo (CPU compresa); chi gioca colpisce dalla tastiera
// del gioco (motion_controls._emitSwing, come il tasto 1) quando la palla gli arriva. Senza disegno: con la grafica in
// software la partita andrebbe al rallentatore. Per ogni fotogramma con la palla in gioco: chi l'ha colpita, se la scia si vede.
{
  const g = await game({ trail: '1' }), p = g.p;
  await p.evaluate(() => {
    const E = __natpfTennis, U = E.natpfUi, G = E.natpfBallGlow;
    U.onboarding?.close?.(); if (!U.testInput) U.toggleTestInput(); U.selectController('mouse', { open: false });
    E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
    E.__render = E.render.bind(E); E.render = () => {};
    const S = window.__scia = { seen: { player: 0, opponent: 0 }, lit: { player: 0, opponent: 0 }, fast: 0, fastLit: 0, maxLevel: 0, maxLen: 0, hits: { player: 0, opponent: 0 }, points: 0, toss: 0, tossLit: 0 };
    const rally = () => {
      E.phase = 'RALLY'; E.phaseTimer = 0; E.natpfPaused = false; E.player.pos.set(0, 0, 11.4); E.player.targetPos.copy(E.player.pos);
      Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1 });
      E.ballTrail.clear(); E.ball.pos.set(-.5, 1, -11); E._launchBallToTarget(E.ball.pos, new E.ball.pos.constructor(1.4, 0, 8.6), 1.05, { topspin: 14 }); E._natpfPlanPlayer?.();
      S.points++;
    };
    let swung = -1, idle = 0, last = { n: 0, who: '' };
    const tick = () => {
      requestAnimationFrame(tick);
      const b = E.ball, live = E.phase === 'RALLY' && b.inPlay;
      if (live){
        idle = 0;
        const who = b.lastHitter === 'player' ? 'player' : 'opponent', v = b.vel.length(), on = G.mesh.visible && G.level > .05;
        if (b.rallyStrokeCount !== last.n || who !== last.who){ last = { n: b.rallyStrokeCount, who }; S.hits[who]++; }
        S.seen[who]++; if (on) S.lit[who]++;
        if (v > 14){ S.fast++; if (G.mesh.visible && G.level > .3) S.fastLit++; }
        S.maxLevel = Math.max(S.maxLevel, G.level); S.maxLen = Math.max(S.maxLen, G.length);
        // la palla della CPU sta arrivando: un gesto dalla tastiera del gioco, una volta per palla
        if (who === 'opponent' && b.vel.z > 0 && Math.hypot(b.pos.x - E.player.pos.x, b.pos.z - E.player.pos.z) < 4.2 && swung !== b.rallyStrokeCount){
          swung = b.rallyStrokeCount; E.motionController._emitSwing({ source: 'keyboard', shotType: 'topspin', speed: 1.18, dirX: 0, dirY: -.45 });
        }
      } else if (E.phase === 'SERVE_TOSS'){ S.toss++; if (G.mesh.visible && G.level > .05) S.tossLit++; }
      else if (++idle > 40 && !window.__sciaStop){ idle = 0; swung = -1; rally(); }
    };
    rally(); requestAnimationFrame(tick);
  });
  await p.waitForFunction(() => __scia.hits.player >= 3 && __scia.hits.opponent >= 4, null, { timeout: 90000 }).catch(() => {});
  const live = await p.evaluate(() => __scia);
  check('partita contro la CPU: scia accesa sui colpi di chi gioca e della CPU', live.hits.player >= 3 && live.lit.player > 10 && live.lit.opponent > 10 && live.fastLit >= .9*live.fast,
    `colpi: giocatore ${live.hits.player}, CPU ${live.hits.opponent} in ${live.points} punti; fotogrammi con la scia: dopo i colpi del giocatore ${live.lit.player}/${live.seen.player}, della CPU ${live.lit.opponent}/${live.seen.opponent}; palla oltre 14 m/s ${live.fastLit}/${live.fast}; livello massimo ${live.maxLevel.toFixed(2)}, lunghezza massima ${live.maxLen.toFixed(1)} m`);
  // un fotogramma vero della partita con la palla veloce (il disegno torna acceso)
  await p.waitForFunction(() => { const E = __natpfTennis; return E.phase === 'RALLY' && E.ball.inPlay && E.ball.lastHitter === 'player' && E.ball.pos.z < 6 && E.ball.pos.z > -2 && E.natpfBallGlow.level > .6; }, null, { timeout: 60000 }).catch(() => {});
  await p.evaluate(() => { const E = __natpfTennis; window.__sciaStop = true; E.natpfPaused = true; E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; E._snapCameraImmediate(); E._updateEffects(0); E.__render(); });
  await p.screenshot({ path: path.join(SHOTS, 'scia-partita.png') });
  check('partita contro la CPU: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}

/* ---------- 4) costo: tempo del disegno con e senza la scia, tempo del calcolo, fotogrammi al secondo ---------- */
{
  const g = await game({ trail: '1' }), p = g.p;
  await scene(p, 'costo', SCENES.andata);
  // a) stesso fotogramma disegnato 2×N volte, alternando scia accesa e spenta (gl.readPixels di un pixel: il disegno è finito)
  const draw = await p.evaluate(N => {
    const E = __natpfTennis, G = E.natpfBallGlow, gl = E.renderer.getContext(), px = new Uint8Array(4), t = { on: [], off: [] };
    for (let i = 0; i < 2*N + 4; i++){
      const on = i % 2 === 0; G.mesh.visible = on;
      const t0 = performance.now(); E.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const ms = performance.now() - t0;
      if (i >= 4) t[on ? 'on' : 'off'].push(ms);
    }
    G.mesh.visible = true;
    const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
    return { on: med(t.on), off: med(t.off), n: N };
  }, +(process.env.DRAW_N || 24));
  // b) calcolo della scia per fotogramma (due passi della fisica e un fotogramma), media su 20.000 giri
  const cpu = await p.evaluate(() => {
    const G = __natpfTennis.natpfBallGlow, pos = { x: 1, y: 1, z: 10 }, N = 20000;
    G.clear(); const t0 = performance.now();
    for (let i = 0; i < N; i++){ pos.z -= .11; if (pos.z < -11) pos.z = 10; G.sample(pos); pos.z -= .11; G.sample(pos); G.frame(pos, 26, 1/60, true); }
    const us = (performance.now() - t0)/N*1000; G.clear();
    return us;
  });
  const extra = draw.on - draw.off;
  check('disegno: la scia non costa più del 3% di un fotogramma (grafica in software, il caso peggiore)', extra <= Math.max(.03*draw.off, 1.5),
    `fotogramma con la scia ${draw.on.toFixed(1)} ms, senza ${draw.off.toFixed(1)} ms (mediana di ${draw.n}): ${extra >= 0 ? '+' : ''}${extra.toFixed(1)} ms, ${(100*extra/draw.off).toFixed(1)}%`);
  check('calcolo: meno di 0,05 ms a fotogramma', cpu < 50, `${cpu.toFixed(1)} µs a fotogramma (2 passi della fisica + nastro)`);
  // c) fotogrammi al secondo dal vivo con il ciclo vero (scena ferma ridisegnata a ogni fotogramma): accesa, spenta, accesa, spenta
  const fpsRun = (ms) => p.evaluate(ms => new Promise(res => {
    const E = __natpfTennis; let n = 0; const t0 = performance.now();
    const f = now => { E.render(); n++; if (now - t0 < ms) requestAnimationFrame(f); else res(n/((now - t0)/1000)); };
    requestAnimationFrame(f);
  }), ms);
  const fps = { on: [], off: [] };
  for (const on of [true, false, true, false]){ await p.evaluate(on => { __natpfTennis.natpfBallGlow.mesh.visible = on; }, on); fps[on ? 'on' : 'off'].push(await fpsRun(FPS_MS)); }
  const avg = a => a.reduce((x, y) => x + y, 0)/a.length, on = avg(fps.on), off = avg(fps.off);
  // senza GPU (WebGL in software) il campo va a pochi fotogrammi al secondo e la misura oscilla di qualche punto percentuale
  check('fotogrammi al secondo: con la scia non meno del 95% di quelli senza', on >= .95*off, `accesa ${fps.on.map(x => x.toFixed(2)).join(' e ')} (media ${on.toFixed(2)}), spenta ${fps.off.map(x => x.toFixed(2)).join(' e ')} (media ${off.toFixed(2)})`);
  writeFileSync(path.join(SHOTS, 'scia-misure.json'), JSON.stringify({ draw, cpuUs: cpu, fps }, null, 2));
  check('misure: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}
await B.close();
summary();
process.exit(process.exitCode || 0);
