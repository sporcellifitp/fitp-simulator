// NATPF B37 (collaudo dell'utente del 13/11, punto 2): «quando uno deve battere, non basta mettergli "alza la mano"
// come testo. Evidenzialo con un selettore … o una zona colorata». Partita vera (ciclo del gioco acceso), al servizio:
//   • la gemma sopra chi batte (natpf_serve_marker.js): sopra la sua testa, nella vista di gioco e, nello stesso schermo,
//     in tutte e due le metà; con «Classici» e con «Lob & Drop» (modelli 3D come nel programma), batte chi gioca o la
//     CPU / il Player 1 o il Player 2;
//   • il riquadro di servizio a terra: nella metà di chi riceve, in diagonale rispetto a chi batte;
//   • la scritta «Al servizio» resta, sopra la gemma (secondaria);
//   • quando la palla parte, gemma e riquadro spariscono;
//   • costo del disegno con gemma e riquadro accesi e spenti (grafica in software del banco: il caso peggiore).
// Schermate in SP/chi-serve: 1920×1080 e un'area stretta (?area=0,0,640,800 in una finestra 1920×1080).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-chi-serve.mjs        (porta 3159)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3159), OUT = path.join(SP, 'chi-serve'); mkdirSync(OUT, { recursive: true });
const KEY = 'natpf-tennis.personaggi';
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const B = await launch();

async function game({ cast, w = 1920, h = 1080, query = 'intro=0' }){
  const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.addInitScript(({ KEY, cast }) => {
    try { localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); localStorage.setItem(KEY, cast); } catch {}
  }, { KEY, cast });
  await p.goto(`http://127.0.0.1:${GAME_PORT}/?${query}${cast === 'lobdrop' ? '&mascotte=3d' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.serveMark, null, { timeout: 120000 });
  if (cast === 'lobdrop') await p.waitForFunction(() => __natpfTennis.player.natpfMascot3dOn && __natpfTennis.opponent.natpfMascot3dOn, null, { timeout: 90000 }).catch(() => errs.push('modelli 3D non montati'));
  await p.waitForTimeout(800);
  return { ctx, p, errs };
}
// al servizio: partita vera, qualche fotogramma, poi ciclo fermo e misure (gemma, testa, scritta, riquadro, a schermo)
const atServe = (p, mode, server) => p.evaluate(async ({ mode, server }) => {
  const E = __natpfTennis, ui = E.natpfUi;
  if (E.__frame0){ E._natpfFrame = E.__frame0; delete E.__frame0; }
  ui.lobby.visible = false; E.hud.hideTitleModal?.(); ui.onboarding?.close?.();
  E.autoPlayMode = false; E.userHasInteracted = true;
  if (mode === 'schermo'){ E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' }; if (!E.natpfSplit.active) E.startSplit(); }
  E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = false;
  E.score.server = server; E._setupPointServe?.({ showBanner: false }); ui.onScore(E.score, E.matchConfig.gamesToWin);
  // (la CPU batterebbe da sola dopo 1,25 s: con la grafica in software i fotogrammi sono lenti; qui si aspetta ferma)
  E.persistentStateLock = true;
  await new Promise(res => { let n = 0; const f = () => (++n > 24 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  if (!E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
  const M = ui.serveMark, who = server === 'opponent' ? E.opponent : E.player, top = M.top(who);
  const { viewport } = await import('/src/natpf/natpf_screen.js'), { splitViewports } = await import('/src/natpf/natpf_split.js');
  const V = viewport(), S = E.natpfSplit, halves = mode === 'schermo' ? splitViewports(S.size.x, S.size.y) : null;
  const views = mode === 'schermo' ? [[E.camera, halves.p1], [S.cam2, halves.p2]] : [[E.camera, { x: 0, y: 0, w: V.w, h: V.h }]];
  const proj = (cam, vp, x, y, z) => { const v = new E.player.pos.constructor(x, y, z).project(cam); return { x: Math.round(vp.x + (v.x*.5 + .5)*vp.w), y: Math.round(vp.y + (-v.y*.5 + .5)*vp.h), on: v.z >= -1 && v.z <= 1 }; };
  const r = M.state.rect;
  const out = { phase: E.phase, state: { gem: M.gem.visible, box: M.box.visible, server: M.state.server }, rect: r, top: +top.toFixed(2), looks: [E.player.natpfLook, E.opponent.natpfLook], V,
    views: views.map(([cam, vp]) => ({ vp, gem: proj(cam, vp, M.gem.position.x, M.gem.position.y + .29, M.gem.position.z), head: proj(cam, vp, who.pos.x, top, who.pos.z), feet: proj(cam, vp, who.pos.x, 0, who.pos.z),
      box: r ? [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]].map(([x, z]) => proj(cam, vp, x, 0, z)) : null })),
    serverPos: [+who.pos.x.toFixed(2), +who.pos.z.toFixed(2)] };
  const box = el => { if (!el || el.classList.contains('hidden')) return null; const b = el.getBoundingClientRect(); return b.width > 0 ? { x: Math.round(b.left + b.width/2), y: Math.round(b.top + b.height/2), w: Math.round(b.width), h: Math.round(b.height), text: el.textContent.trim() } : null; };
  out.tags = mode === 'schermo' ? ['p1', 'p2'].map(id => box(document.getElementById(`server-tag-${id}`))) : [box(document.getElementById('server-tag'))];
  E.__render?.(); E.render();
  return out;
}, { mode, server });
// la palla parte: gemma e riquadro spariscono
const afterServe = p => p.evaluate(async () => {
  const E = __natpfTennis, M = E.natpfUi.serveMark;
  if (E.__frame0){ E._natpfFrame = E.__frame0; delete E.__frame0; }
  E.persistentStateLock = false;
  const who = E.score.server === 'opponent' ? E.opponent : E.player;
  E.phase = 'SERVE_TOSS'; E.ball.pos.set(who.pos.x, 2.6, who.pos.z); E.ball.vel.set(0, 0, 0);
  E._executeServeHit(who, { speed: 1.2 });
  await new Promise(res => { let n = 0; const f = () => (++n > 6 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  return { phase: E.phase, gem: M.gem.visible, box: M.box.visible };
});
// costo del disegno: 30 disegni con gemma e riquadro accesi, 30 spenti (alternati a blocchi)
const cost = p => p.evaluate(() => {
  const E = __natpfTennis, M = E.natpfUi.serveMark, run = on => { M.gem.visible = M.box.visible = on; const t0 = performance.now(); for (let i = 0; i < 10; i++) E.render(); return performance.now() - t0; };
  if (!E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
  run(true); run(false);
  let on = 0, off = 0; for (let k = 0; k < 3; k++){ on += run(true); off += run(false); }
  return { on: +(on/30).toFixed(2), off: +(off/30).toFixed(2) };
});

const rows = [];
for (const cast of ['sempre', 'lobdrop']) for (const mode of ['cpu', 'schermo']){
  const g = await game({ cast });
  for (const server of ['player', 'opponent']){
    const r = await atServe(g.p, mode, server);
    const name = `${cast === 'lobdrop' ? 'Lob & Drop' : 'Classici'}, ${mode === 'cpu' ? 'contro la CPU' : 'stesso schermo'}, batte ${server === 'player' ? (mode === 'cpu' ? 'chi gioca' : 'il Player 1') : (mode === 'cpu' ? 'la CPU' : 'il Player 2')}`;
    const file = `chi-serve-${cast}-${mode}-${server}.png`;
    await g.p.screenshot({ path: path.join(OUT, file) });
    const looksOk = cast === 'lobdrop' ? r.looks.join() === 'drop,lob' : !r.looks.includes('drop');
    const recv = server === 'player' ? -1 : 1, sx = Math.sign(r.serverPos[0]);
    // riquadro: nella metà di chi riceve (z), dall'altra parte del centro rispetto a chi batte (x)
    const rectOk = !!r.rect && Math.sign(r.rect.z0 + r.rect.z1) === recv && Math.sign(r.rect.x0 + r.rect.x1) === -sx;
    const gemOk = r.views.every(v => v.gem.on && v.head.on && v.gem.y < v.head.y && Math.abs(v.gem.x - v.head.x) < Math.max(40, v.vp.w*.04) && v.gem.x >= v.vp.x && v.gem.x <= v.vp.x + v.vp.w && v.gem.y >= v.vp.y);
    const tagOk = r.tags.every((t, i) => !!t && /Al servizio/.test(t.text) && t.y < r.views[i].gem.y + 6);
    const boxOn = r.views.every(v => !!v.box && v.box.some(c => c.on && c.x >= v.vp.x && c.x <= v.vp.x + v.vp.w && c.y >= 0 && c.y <= v.vp.y + v.vp.h));
    check(`B37 ${name}: gemma sopra la testa di chi batte${mode === 'schermo' ? ' in tutte e due le metà' : ''}, scritta sopra la gemma`, ['SERVE_STANCE', 'SERVE_TOSS'].includes(r.phase) && looksOk && r.state.gem && r.state.server === server && gemOk && tagOk,
      JSON.stringify({ phase: r.phase, state: r.state, top: r.top, views: r.views.map(v => ({ gem: v.gem, head: v.head })), tags: r.tags }));
    check(`B37 ${name}: riquadro di servizio a terra nella metà di chi riceve, in diagonale, in vista`, r.state.box && rectOk && boxOn, JSON.stringify({ rect: r.rect, server: r.serverPos, box: r.views.map(v => v.box) }));
    rows.push({ name, file, top: r.top });
    const a = await afterServe(g.p);
    check(`B37 ${name}: la palla parte, gemma e riquadro spariscono`, a.phase === 'RALLY' && !a.gem && !a.box, JSON.stringify(a));
  }
  if (cast === 'lobdrop' && mode === 'cpu'){ const c = await cost(g.p); console.log(`costo del disegno (Lob & Drop, 1920×1080, grafica in software): ${c.on} ms con gemma e riquadro, ${c.off} ms senza (${(100*(c.on - c.off)/c.off).toFixed(1)} %)`); rows.push({ cost: c }); check('B37 costo del disegno con gemma e riquadro: meno del 5 % in più', c.on <= c.off*1.05 + .3, JSON.stringify(c)); }
  check(`B37 chi serve, ${cast} ${mode}: nessun errore`, !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}
// area stretta (?area=…): contro la CPU con Lob & Drop e stesso schermo con i Classici
for (const [cast, mode] of [['lobdrop', 'cpu'], ['sempre', 'schermo']]){
  const g = await game({ cast, query: 'intro=0&area=0,0,640,800' });
  for (const server of ['player', 'opponent']){
    const r = await atServe(g.p, mode, server);
    await g.p.screenshot({ path: path.join(OUT, `chi-serve-stretta-${cast}-${mode}-${server}.png`), clip: { x: 0, y: 0, width: 640, height: 800 } });
    const gemOk = r.views.every(v => v.gem.on && v.gem.y < v.head.y && v.gem.x >= v.vp.x && v.gem.x <= v.vp.x + v.vp.w && v.gem.y >= v.vp.y);
    check(`B37 area stretta 640×800, ${cast === 'lobdrop' ? 'Lob & Drop' : 'Classici'} ${mode}, batte ${server}: gemma e riquadro in vista, scritta sopra la gemma`, r.V.w === 640 && r.V.h === 800 && r.state.gem && r.state.box && gemOk && r.tags.every((t, i) => !!t && t.y < r.views[i].gem.y + 6), JSON.stringify({ V: r.V, state: r.state, views: r.views.map(v => ({ vp: v.vp, gem: v.gem, head: v.head })), tags: r.tags }));
  }
  check(`B37 area stretta ${cast} ${mode}: nessun errore`, !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}
console.log(JSON.stringify(rows));
await B.close(); stop();
summary();
setTimeout(() => process.exit(), 300);
