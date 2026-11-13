// Revisore B39 · prove mirate su HEAD 5a15bbd (2026-11-13.9), repository solo in lettura. Chromium headless, 1280×720.
// Input dello stand: page.mouse; la tastiera solo per Ctrl+Maiusc+K, che fa la stessa cosa di F9 del B37 e del
// «Pannello dell'addetto» del telecomando (kiosk.toggle / kiosk.open). Racchetta «mouse» (modalità prova, scritta in
// localStorage prima del caricamento) per avere una partita contro la CPU senza telefono.
// Fasi (PHASES): doppio, pannello, sotto, lag, chiosco.
const DIR = '/tmp/claude-0/-home-user/ba4c6b81-3eda-5b46-9643-f32c32c7e045/scratchpad/mouse/revisore';
process.env.OUT ||= DIR + '/e2e-out';
process.env.CHROMIUM_PATH ||= '/opt/pw-browsers/chromium';
import http from 'node:http';
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const E2E = '/home/user/foro-italico-world/tools/e2e/';
const { launch, page } = await import(E2E + 'th.mjs');
const req = createRequire(E2E + 'package.json');
const express = req('express'); const { ExpressPeerServer } = req('peer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = DIR + '/shots'; mkdirSync(SHOTS, { recursive: true });
const GAME = 'http://127.0.0.1:' + (process.env.GAME_PORT || 3561);
const PEER_PORT = +(process.env.PEER_PORT || 9561);
const PHASES = (process.env.PHASES || 'doppio,pannello,sotto,lag,chiosco').split(',');
const R = []; const T0 = Date.now(), t = () => ((Date.now() - T0)/1000).toFixed(1).padStart(6);
const note = (fase, passo, esito, info = '') => { const i = typeof info === 'string' ? info : JSON.stringify(info); R.push({ fase, passo, esito, info: i }); console.log(`[${t()}] ${esito.padEnd(6)} ${fase} · ${passo}${i ? ' — ' + i.slice(0, 700) : ''}`); writeFileSync(DIR + '/risultati3.json', JSON.stringify(R, null, 1)); };

const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));

const probe = (p, sel) => p.evaluate(sel => {
  const el = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) || document.querySelector(sel);
  if (!el) return { found: false };
  const r = el.getBoundingClientRect(), x = r.left + r.width/2, y = r.top + r.height/2;
  const top = r.width > 0 ? document.elementFromPoint(x, y) : null;
  const desc = e => e ? `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}` : null;
  const owner = top?.closest?.('[id]');
  return { found: true, x: Math.round(x), y: Math.round(y), w: Math.round(r.width), h: Math.round(r.height), hit: !!top && (top === el || el.contains(top)), top: desc(top), topOwner: owner ? '#' + owner.id : null, text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
}, sel);
async function click(p, sel, wait = 600){
  const pr = await probe(p, sel);
  if (!pr.found || !pr.hit) return { ok: false, pr };
  await p.mouse.move(pr.x, pr.y, { steps: 4 }); await p.mouse.click(pr.x, pr.y); await sleep(wait);
  return { ok: true, pr };
}
async function dbl(p, x, y, gap = 120){
  await p.mouse.move(x, y, { steps: 4 });
  await p.mouse.down({ clickCount: 1 }); await p.mouse.up({ clickCount: 1 });
  await sleep(gap);
  await p.mouse.down({ clickCount: 2 }); await p.mouse.up({ clickCount: 2 });
}
const st = p => p.evaluate(() => {
  const E = __natpfTennis, ui = E.natpfUi, L = ui.lobby, s = E.score || {};
  return { step: L.step, lobby: L.visible, phase: E.phase, auto: !!E.autoPlayMode, paused: !!E.natpfPaused, pause: !!ui.pause?.isOpen, staff: !!ui.kiosk?.isOpen,
    diag: !!document.querySelector('.natpf-diag:not(.hidden)'), cal: !!ui.calibra?.isOpen, t: +(E.elapsedTime || 0).toFixed(2),
    score: `${s.playerPoints ?? '-'}-${s.opponentPoints ?? '-'} game ${s.playerGames ?? '-'}-${s.opponentGames ?? '-'}`, ends: (window.__ends || []).length };
});
const shot = async (p, name) => { try { await p.evaluate(() => { try { __natpfTennis.__render?.(); } catch {} }); await p.screenshot({ path: `${SHOTS}/${name}.png` }); return name + '.png'; } catch (e){ return 'schermata non riuscita: ' + e.message; } };
const until = (p, fn, arg, ms = 20000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
const inField = p => until(p, () => !__natpfTennis.natpfUi.lobby.visible && !__natpfTennis.natpfUi.trial.active && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'].includes(__natpfTennis.phase), null, 40000);

async function openGame(B, init){
  const { p, errs } = await page(B, `${GAME}/?peer=127.0.0.1:${PEER_PORT}&intro=0`, { w: 1280, h: 720, init });
  await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 240000 });
  await p.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  await p.evaluate(() => { const E = __natpfTennis; if (!window.__ends){ window.__ends = []; const a = E._awardPoint.bind(E); E._awardPoint = (w, why) => { window.__ends.push(`${w}:${why}`); return a(w, why); }; } });
  return { p, errs };
}
const MOUSE_INIT = () => { try { localStorage.setItem('natpf-tennis.testInput', '1'); localStorage.setItem('natpf-tennis.controller', 'mouse'); } catch {} };
async function toConnect(p){
  await click(p, '[data-menu="play"]', 800);
  await click(p, '[data-mode="cpu"]', 1000);
  await click(p, '[data-page="controller"] [data-natpf-controller="mouse"]', 1000);
  return st(p);
}


const B = await launch();
try {
  const { p: g } = await openGame(B, MOUSE_INIT);
  const F = 'giroR1';
  const rec = () => g.evaluate(() => ({ rec: !!__natpfTennis.natpfUi.diag.recorder.active, btn: !!document.querySelector('.natpf-rec:not(.hidden)'), toast: (document.getElementById('natpf-toast')?.textContent || '').trim().slice(0, 90), training: !!__natpfTennis.natpfUi.training.active }));
  await toConnect(g);
  await click(g, '#lobby-next', 1500);
  await click(g, '#btn-start-match', 500);
  note(F, '1 partita (racchetta mouse)', (await inField(g)) ? 'OK' : 'KO', await st(g));
  await click(g, '#natpf-pause-btn', 800);
  await click(g, '[data-pause="diag"]', 1200);
  const a = await click(g, '.natpf-diag [data-diag="start"]', 2500);
  note(F, '2 Pausa → Diagnostica → «● Avvia registrazione»', (await rec()).rec ? 'OK' : 'KO', { clic: a.ok, r: await rec() });
  const x = await click(g, '.natpf-diag [data-diag="close"]', 600);
  await click(g, '#natpf-pause-btn', 800);
  const m = await click(g, '[data-pause="menu"]', 2000);
  let s = await st(g);
  note(F, '3 × della diagnostica, ❚❚ → «Torna al menu»', s.lobby ? 'OK' : 'KO', { x: x.ok, menu: m.ok, s, r: await rec() });
  await click(g, '[data-menu="play"]', 800); await click(g, '[data-mode="cpu"]', 1000);
  await click(g, '[data-page="controller"] [data-natpf-controller="phone"]', 1200);
  for (let i = 0; i < 4 && (await st(g)).step !== 'menu'; i++) await click(g, '#lobby-back', 900);
  s = await st(g);
  note(F, '4 racchetta «Smartphone» e di nuovo al menu principale', s.step === 'menu' ? 'OK' : 'KO', { s, ctrl: await g.evaluate(() => __natpfTennis.natpfUi.controller), r: await rec() });
  const rb = await click(g, '.natpf-rec', 1200);
  s = await st(g);
  note(F, '5 ● REC apre la diagnostica nel menu', s.diag ? 'OK' : 'KO', { clic: rb.ok, pr: rb.pr });
  const f = await click(g, '.natpf-diag [data-diag="stop"]', 4000);
  note(F, '6 «Ferma»', !(await rec()).rec ? 'OK' : 'KO', { clic: f.ok, r: await rec() });
  const pg = await click(g, '.natpf-diag [data-diag="protocol"]', 3000);
  const r = await rec();
  note(F, '7 «▶ Prova guidata dei colpi» col solo mouse', r.rec ? 'OK' : 'KO', { clic: pg.ok, pr: pg.pr, r, s: await st(g) });
  note(F, 'schermata', 'INFO', await shot(g, 'prova-guidata-giro-r1'));
} catch (e){ note('errore', 'eccezione', 'KO', e.stack || e.message); }
finally { await B.close(); peerServer.close(); }
process.exit(0);
