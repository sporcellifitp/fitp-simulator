// NATPF B37 (collaudo dell'utente del 13/11, punto 3): «nella modalità vs cpu compare un cerchietto bianco che non
// capisco cosa sia che segue la palla». Il segnale del momento giusto non cambia; le prime volte si spiega. Gioco vero
// con vite, livello «Adulto» (Evento: segnale acceso di base), palle della CPU verso chi gioca:
//   • nelle prime 3 palle della partita, con l'anello in vista, in basso la scritta «Colpisci quando il cerchio diventa
//     verde»; dalla quarta no; partita nuova: di nuovo; «Nuovo giocatore»: di nuovo;
//   • la guida (passo «Colpisci quando la palla arriva») dice le stesse parole;
//   • livello Pro (segnale spento di base): niente anello e niente scritta.
// Schermate in SP/segnale (1280×720 e 1920×1080).   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-segnale-spiegato.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3161), OUT = path.join(SP, 'segnale'); mkdirSync(OUT, { recursive: true });
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const B = await launch();

async function game(w, h){
  const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.addInitScript(() => { try { localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); localStorage.removeItem('natpf-tennis.segnaleTempo'); } catch {} });
  await p.goto(`http://127.0.0.1:${GAME_PORT}/?intro=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.cue, null, { timeout: 120000 });
  await p.waitForTimeout(500);
  return { ctx, p, errs };
}
// partita nuova al livello scelto (Evento = «Adulto»), ciclo del gioco fermo: si fa avanzare a mano
const start = (p, level) => p.evaluate(level => {
  const E = __natpfTennis, ui = E.natpfUi;
  ui.lobby.visible = false; E.hud.hideTitleModal?.(); ui.onboarding?.close?.();
  if (!E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
  E.autoPlayMode = false; E.userHasInteracted = true; E.hud.selectedDifficulty = level; E.matchConfig.difficulty = level; E._applyDifficultyTuning?.(level);
  E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = false;
  return { level: E.matchConfig.difficulty, enabled: ui.cue.enabled };
}, level);
// una palla della CPU verso chi gioca (nessuno la colpisce); shotAt: istante (s di volo) della schermata
const ball = (p, n, shotAt = null) => p.evaluate(async ({ n, shotAt }) => {
  const E = __natpfTennis, ui = E.natpfUi;
  E.phase = 'RALLY'; E.natpfPaused = false; E.ball.inPlay = true; E.ball.lastHitter = 'opponent'; E.ball.bounceCountOnCurrentSide = 0; E.ball.rallyStrokeCount = 2*n + 1;
  E.player.pos.set(.4, 0, 11.7); E.player.targetPos.copy(E.player.pos); E.player.vel.set(0, 0, 0);
  E.ball.pos.set(-.5, 1, -11); E._launchBallToTarget(E.ball.pos, new E.ball.pos.constructor(1.6, 0, 8.5), 1.05, { topspin: 14 }); E._natpfPlanPlayer?.();
  const el = () => document.getElementById('natpf-cue-hint'), vis = () => { const h = el(); return !!h && !h.classList.contains('hidden') && h.getBoundingClientRect().height > 0; };
  let ring = false, hint = false, text = '', box = null, shot = false;
  for (let t = 0; t < 1.7 && E.phase === 'RALLY'; t += 1/60){
    E.update(1/60);
    ring ||= !!ui.cue.view; if (vis()){ hint = true; text = el().textContent; const b = el().getBoundingClientRect(); box = { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; }
    if (shotAt != null && !shot && t >= shotAt && ui.cue.view){ shot = true; E.render(); window.__shotNow = true; return { ring, hint, text, box, paused: true }; }
  }
  E.phase = 'POINT_OVER'; E.ball.inPlay = false;
  for (let t = 0; t < 1; t += 1/60) ui.cue.update();
  return { ring, hint, text, box, after: vis() };
}, { n, shotAt });

const W = [[1280, 720], [1920, 1080]];
for (const [w, h] of W){
  const g = await game(w, h);
  const s = await start(g.p, 'evento');
  check(`${w}×${h}: livello «Adulto» (Evento): segnale del momento giusto acceso di base`, s.enabled, JSON.stringify(s));
  const res = [];
  for (let n = 0; n < 5; n++){
    // schermata della prima palla mentre l'anello si stringe (0,8 s di volo) e di una quarta (niente scritta)
    const shotAt = n === 0 || n === 3 ? .95 : null, r = await ball(g.p, n, shotAt);
    if (r.paused){ await g.p.screenshot({ path: path.join(OUT, `segnale-${w}x${h}-palla-${n + 1}.png`) }); const rest = await ball(g.p, n); res.push({ ...rest, hint: r.hint || rest.hint, text: r.text || rest.text, box: r.box || rest.box }); }
    else res.push(r);
  }
  console.log(JSON.stringify(res));
  check(`${w}×${h}: l'anello c'è su ogni palla della CPU`, res.every(r => r.ring));
  check(`${w}×${h}: scritta «Colpisci quando il cerchio diventa verde» nelle prime 3 palle, non dalla quarta; sparisce dopo la palla`,
    res.map(r => r.hint).join() === 'true,true,true,false,false' && res.slice(0, 3).every(r => /Colpisci quando il cerchio diventa verde/.test(r.text)) && res.every(r => !r.after), JSON.stringify(res.map(r => [r.hint, r.text, r.after])));
  const b = res[0].box;
  check(`${w}×${h}: la scritta sta tutta nello schermo, in basso al centro`, !!b && b.x >= 0 && b.x + b.w <= w && b.y + b.h <= h && b.y > h*.6 && Math.abs(b.x + b.w/2 - w/2) < 4, JSON.stringify(b));
  if (w === 1280){
    // partita nuova: di nuovo; «Nuovo giocatore»: di nuovo
    await start(g.p, 'evento'); const again = await ball(g.p, 10);
    await g.p.evaluate(() => __natpfTennis.natpfUi.newPlayer()); await start(g.p, 'evento');
    for (let n = 0; n < 3; n++) await ball(g.p, 20 + n);
    await g.p.evaluate(() => __natpfTennis.natpfUi.newPlayer()); const np = await ball(g.p, 30);
    check('partita nuova e «Nuovo giocatore»: la scritta si rivede', again.hint && np.hint, JSON.stringify({ again, np }));
    const pro = await start(g.p, 'pro'), off = await ball(g.p, 40);
    check('livello Pro (segnale spento di base): niente anello e niente scritta', !pro.enabled && !off.ring && !off.hint, JSON.stringify({ pro, off }));
    // la guida dice le stesse parole (passo «Colpisci quando la palla arriva»)
    const guide = await g.p.evaluate(async () => (await import('/src/natpf/natpf_onboarding.js')).GUIDE.find(s => s.id === 'hit')?.game || '');
    check('la guida dice le stesse parole', /colpisci quando il cerchio diventa verde/i.test(guide), guide);
  }
  check(`${w}×${h}: nessun errore`, !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}
await B.close(); stop();
summary();
setTimeout(() => process.exit(), 300);
