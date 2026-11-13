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
const note = (fase, passo, esito, info = '') => { const i = typeof info === 'string' ? info : JSON.stringify(info); R.push({ fase, passo, esito, info: i }); console.log(`[${t()}] ${esito.padEnd(6)} ${fase} · ${passo}${i ? ' — ' + i.slice(0, 700) : ''}`); writeFileSync(DIR + '/risultati.json', JSON.stringify(R, null, 1)); };

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
let g = null;
try {
  ({ p: g } = await openGame(B, MOUSE_INIT));
  note('avvio', 'gioco caricato', 'INFO', await st(g));

  if (PHASES.includes('doppio')){
    const F = 'doppio';
    const s0 = await toConnect(g);
    const nx = await probe(g, '#lobby-next'), sm = await probe(g, '#btn-start-match');
    note(F, 'pagina «Collega» con racchetta mouse', s0.step === 'connect' ? 'OK' : 'KO', { step: s0.step, avanti: nx.text, rett: [nx.x, nx.y, nx.w, nx.h], gioca: [sm.x, sm.y, sm.w, sm.h, sm.found] });
    await dbl(g, nx.x, nx.y, 120);
    await sleep(2500);
    const s1 = await st(g);
    note(F, 'doppio clic (120 ms) su «' + nx.text + '»', !s1.lobby ? 'KO' : 'OK', `dopo: ${s1.lobby ? 'menu, pagina ' + s1.step : 'IN CAMPO, fase ' + s1.phase + ' (pagina «Pronto per la partita» saltata)'}`);
    note(F, 'schermata', 'INFO', await shot(g, 'doppio-alla-partita'));
    if (!s1.lobby){ await click(g, '#natpf-pause-btn', 800); await click(g, '[data-pause="menu"]', 1500); }
    else await click(g, '#lobby-back', 800);
    note(F, 'ritorno', 'INFO', await st(g));
  }

  if (PHASES.includes('pannello')){
    const F = 'pannello';
    let s = await st(g);
    if (!(s.lobby && s.step === 'menu')){ await g.evaluate(() => __natpfTennis.natpfUi.lobby.go('menu')); await sleep(500); }
    await toConnect(g);
    await click(g, '#lobby-next', 1500);
    s = await st(g);
    note(F, 'pagina «Pronto per la partita»', s.step === 'match' ? 'OK' : 'KO', s);
    await click(g, '#match-more-btn', 700);
    const sv = await click(g, '[data-natpf-serve="opponent"]', 500);
    note(F, '«Batte per primo: CPU» col mouse', sv.ok ? 'OK' : 'KO', sv.pr);
    await click(g, '#btn-start-match', 500);
    const ok = await inField(g);
    note(F, 'partita partita con «Gioca ›»', ok ? 'OK' : 'KO', await st(g));
    await sleep(3000);
    const a = await st(g);
    await g.keyboard.press('Control+Shift+KeyK');   // = F9 del B37, «Pannello dell'addetto» del telecomando
    await sleep(300);
    const b = await st(g);
    note(F, 'pannello aperto in partita (Ctrl+Maiusc+K = F9 B37)', b.staff ? 'OK' : 'KO', { prima: a, subito: b });
    await sleep(12000);
    const c = await st(g);
    note(F, 'dopo 12 s col pannello aperto', c.paused ? 'OK' : 'BUCO', `partita ferma: ${c.paused}; tempo di gioco ${b.t} → ${c.t} s; punti finiti ${b.ends} → ${c.ends}; punteggio ${b.score} → ${c.score}; fase ${c.phase}`);
    note(F, 'schermata', 'INFO', await shot(g, 'pannello-in-partita'));
  }

  if (PHASES.includes('sotto')){
    const F = 'sotto';
    let s = await st(g);
    if (s.staff){ const c = await click(g, '#natpf-staff [data-staff="close"]', 600); note(F, '«Chiudi» del pannello', c.ok ? 'OK' : 'KO', c.pr); }
    const pb = await click(g, '#natpf-pause-btn', 800);
    s = await st(g);
    note(F, 'pausa aperta con ❚❚', s.pause ? 'OK' : 'KO', { pr: pb.pr, s });
    await g.keyboard.press('Control+Shift+KeyK');
    await sleep(500);
    s = await st(g);
    const cl = await probe(g, '#natpf-staff [data-staff="close"]'), np = await probe(g, '#natpf-staff [data-staff="newplayer"]'), ai = await probe(g, '#natpf-staff [data-staff="aim"]');
    note(F, 'pannello aperto sopra la pausa?', cl.hit ? 'OK' : 'BUCO', { pannello: s.staff, pausa: s.pause, chiudi: { hit: cl.hit, sopra: cl.top, di: cl.topOwner }, nuovo: { hit: np.hit, sopra: np.top, di: np.topOwner }, mira: { hit: ai.hit, sopra: ai.top, di: ai.topOwner } });
    note(F, 'schermata', 'INFO', await shot(g, 'pannello-sotto-pausa'));
    await g.keyboard.press('Control+Shift+KeyK'); await sleep(300);
    note(F, 'pannello richiuso', 'INFO', await st(g));
  }

  if (PHASES.includes('lag')){
    const F = 'lag';
    let s = await st(g);
    if (!s.pause) await click(g, '#natpf-pause-btn', 800);
    const d = await click(g, '[data-pause="diag"]', 1200);
    s = await st(g);
    note(F, 'Pausa → Diagnostica', s.diag ? 'OK' : 'KO', { pr: d.pr, s });
    const sm = await click(g, '.natpf-diag details.diag-lag > summary', 600);
    const lag = await g.evaluate(() => { const i = document.querySelector('.natpf-diag input[data-lag]'); if (!i) return null; const r = i.getBoundingClientRect(); return { v: i.value, x: r.left, y: r.top, w: r.width, h: r.height }; });
    note(F, '«Ritardo dello schermo» aperto', lag ? 'OK' : 'KO', { summary: sm.ok, lag });
    if (lag){
      const x = Math.round(lag.x + lag.w - 7), y = Math.round(lag.y + lag.h*0.28);
      await g.mouse.move(x, y, { steps: 3 }); await sleep(200); await g.mouse.click(x, y); await sleep(300);
      const v1 = await g.evaluate(() => document.querySelector('.natpf-diag input[data-lag]')?.value);
      await g.mouse.click(x, y); await sleep(300);
      const v2 = await g.evaluate(() => document.querySelector('.natpf-diag input[data-lag]')?.value);
      note(F, 'freccia su del campo numerico col solo mouse (2 clic sul bordo destro)', +v2 > +lag.v ? 'OK' : 'KO', `valore ${lag.v} → ${v1} → ${v2}`);
      note(F, 'schermata', 'INFO', await shot(g, 'diag-ritardo-freccette'));
    }
    s = await st(g);
    note(F, 'partita con la diagnostica aperta', 'INFO', s);
    await click(g, '.natpf-diag [data-diag="close"]', 500);
  }

  if (PHASES.includes('chiosco')){
    const F = 'chiosco';
    const { p: k } = await openGame(B, () => { try { localStorage.setItem('natpf-tennis.chiosco', JSON.stringify({ enabled: true, limit: 30 })); } catch {} });
    await click(k, '[data-menu="options"]', 900);
    const c = await click(k, '[data-option="calibra"]', 1200);
    let s = await st(k);
    note(F, 'Opzioni → «Calibra lo schermo…» (chiosco acceso, 30 s)', s.cal ? 'OK' : 'KO', { pr: c.pr, s });
    const plus = await click(k, '#natpf-calibra [data-cal-step="1"]', 400);
    const val = await k.evaluate(() => document.getElementById('cal-edge-val')?.textContent);
    note(F, 'un clic su «+»', plus.ok ? 'OK' : 'KO', `bordo: ${val}`);
    // lo staff guarda i bordi sul ledwall: muove il mouse ma non clicca per 34 s
    for (let i = 0; i < 17; i++){ await k.mouse.move(300 + (i % 2)*200, 300 + (i % 3)*60, { steps: 6 }); await sleep(2000); }
    s = await st(k);
    note(F, 'dopo 34 s con il mouse che si muove (senza clic)', s.cal ? 'OK' : 'BUCO', `calibrazione aperta: ${s.cal}; pagina: ${s.step}`);
    note(F, 'schermata', 'INFO', await shot(k, 'chiosco-calibrazione'));
  }
} catch (e){ note('errore', 'eccezione', 'KO', e.stack || e.message); }
finally { await B.close(); peerServer.close(); }
console.log('\nFINE', R.filter(r => r.esito === 'BUCO').length, 'buchi,', R.filter(r => r.esito === 'KO').length, 'KO');
process.exit(0);
