// B41.3 difetto 4 · pagina della fiera in tutti i suoi stati alle sette misure: niente che scorre (pagina, .lobby-stage),
// niente fuori dallo schermo o sovrapposto, «Altre impostazioni» intera e non sotto la riga in basso («Gioca ›», spunte).
// Telefoni simulati abbinati dal foglio come in natpf-fiera-telefoni (Telefono 2 con la batteria al 15 %: avviso sulla pagina).
//   ROOT=<albero> GAME_PORT=4277 PEER_PORT=4278 OUT=<cartella> [SIZES=…] node fierapage.mjs
process.env.CAL ||= 'none';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const ROOT = process.env.ROOT, E2E = path.join(ROOT, 'tools/e2e'), GAME = path.join(ROOT, 'natpf-tennis');
const req = createRequire(path.join(E2E, 'package.json'));
const express = req('express'), { ExpressPeerServer } = req('peer');
const { launch, page } = await import(path.join(E2E, 'th.mjs'));
const PORT = +(process.env.GAME_PORT || 4277), PEER_PORT = +(process.env.PEER_PORT || 4278), OUT = process.env.OUT || '/tmp/fierapage';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = m => console.log(`[${((Date.now() - T0)/1000).toFixed(0).padStart(3)} s] ${m}`);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 160; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
log('vite ' + await up(`http://127.0.0.1:${PORT}/`));
const GAME_URL = `http://127.0.0.1:${PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`;
const sizes = (process.env.SIZES || '1280x720,1920x1080,1366x768,1024x600,720x720,1920x540,1024x1024').split(',').map(s => s.split('x').map(Number));
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = { emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 16 })); } };
  window.__hold = setInterval(() => window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]), 16);
  let hidden = false;
  Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
  window.__setHidden = h => { hidden = h; document.dispatchEvent(new Event('visibilitychange')); };
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { async request(){ const l = { released: false, addEventListener(){}, async release(){ l.released = true; } }; return l; } } });
};
const BATTERY_LOW = () => { Object.defineProperty(navigator, 'getBattery', { configurable: true, value: async () => ({ level: 0.15, charging: false, addEventListener(){} }) }); };
const until = (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
const MEASURE = sel => {
  const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0' && !el.closest('.hidden'); };
  const els = [...document.querySelectorAll(sel)].filter(vis);
  const R = el => el.getBoundingClientRect(), name = el => `${el.id || el.dataset?.fieraMode || el.dataset?.difficulty || el.className.toString().split(' ')[0] || el.tagName}:${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 22)}`;
  const out = els.filter(el => { const b = R(el); return b.left < -1 || b.top < -1 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1; }).map(name);
  const over = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++){
    const a = els[i], b = els[j]; if (a.contains(b) || b.contains(a)) continue;
    const p = R(a), q = R(b);
    const w = Math.min(p.right, q.right) - Math.max(p.left, q.left), h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
    if (w > 2 && h > 2) over.push(`${name(a)} × ${name(b)}`);
  }
  // «Altre impostazioni»: intera dentro il riquadro che scorre e senza niente sopra (punti sul bordo basso)
  const more = document.getElementById('match-more-btn'), stage = document.querySelector('#title-modal .lobby-stage');
  let moreOk = true, moreInfo = null;
  if (more && vis(more)){
    const m = more.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const hits = [0.2, 0.5, 0.8].map(f => { const e = document.elementFromPoint(m.left + m.width*f, m.bottom - 3); return e && (e === more || more.contains(e)) ? '' : (e?.id || e?.className?.toString().split(' ')[0] || e?.tagName || '?'); }).filter(Boolean);
    moreOk = m.top >= s.top - 1 && m.bottom <= s.bottom + 1 && m.bottom <= innerHeight && !hits.length;
    moreInfo = { more: [Math.round(m.top), Math.round(m.bottom)], stage: [Math.round(s.top), Math.round(s.bottom)], hits };
  }
  return { n: els.length, out, over, moreOk, moreInfo };
};
const PAGE_SEL = '#title-modal .lobby-top .lobby-brand, #title-modal [data-page="match"] button, #title-modal [data-page="match"] .lobby-title, #fiera-visitor b, #fiera-phones-text, #fiera-phones-how, #ready-go .rg-chip, #title-modal [data-difficulty], #title-modal .fiera-pname, #title-modal .lobby-label, #natpf-fiera-alert:not(.hidden), #lobby-match-note, #btn-start-match';
const B = await launch();
const rows = [];
let bad = 0;
async function state(g, tag, name){
  await g.evaluate(() => { try { __natpfTennis.__render?.(); } catch {} });
  await sleep(450);
  const m = await g.evaluate(sel => {
    const tm = document.getElementById('title-modal'), st = tm.querySelector('.lobby-stage'), pg = tm.querySelector('[data-page="match"]');
    return { fair: tm.dataset.fair, scroll: tm.scrollHeight - tm.clientHeight, stage: st.scrollHeight - st.clientHeight, page: pg.scrollHeight - pg.clientHeight, why: document.getElementById('fiera-phones-text')?.textContent || '', ...window.__measure(sel) };
  }, PAGE_SEL);
  const ok = m.fair === '1' && m.scroll <= 0 && m.stage <= 0 && m.page <= 0 && !m.out.length && !m.over.length && m.moreOk;
  if (!ok) bad++;
  const line = `${ok ? 'OK' : 'KO'}  ${tag} ${name}: scorre pagina ${m.scroll} · stage ${m.stage}${m.out.length ? ' · fuori ' + m.out.join(', ') : ''}${m.over.length ? ' · sovrapposti ' + m.over.join(' | ') : ''}${m.moreOk ? '' : ' · «Altre impostazioni» ' + JSON.stringify(m.moreInfo)} · «${m.why}»`;
  console.log(line); rows.push(line);
  await g.screenshot({ path: `${OUT}/${tag}-${name}.png` });
}
try {
  const { p: g, errs } = await page(B, GAME_URL, { w: 1920, h: 1080 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfUi?.fiera && window.__natpfTennis.player?.model, null, { timeout: 150000 });
  await g.evaluate(src => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; window.__measure = eval(src); }, `(${MEASURE})`);
  await g.keyboard.press('Control+Shift+KeyK'); await sleep(500);
  await g.click('#natpf-staff [data-staff="fiera"]');
  log('fiera ' + await until(g, () => __natpfTennis.natpfUi.fiera.on && !document.getElementById('natpf-fiera').classList.contains('hidden'), null, 5000));
  const phones = {};
  for (const slot of ['p1', 'p2']){
    const w = slot === 'p2' ? 'natpfPhone2' : 'natpfPhone';
    await g.click(`#natpf-fiera [data-fiera-act="pair"][data-slot="${slot}"]`);
    await until(g, w => !!__natpfTennis[w]?.standPairingUrl, w, 15000);
    const url = await g.evaluate(w => __natpfTennis[w].standPairingUrl, w);
    const { p } = await page(B, url, { w: 390, h: 844, mobile: true, init: slot === 'p2' ? `(${PHONE_INIT})();(${BATTERY_LOW})();` : `(${PHONE_INIT})();` });
    phones[slot] = p;
    await until(g, s => /numero/.test(__natpfTennis.natpfUi.fiera.status(s).word), slot, 20000);
    await sleep(400);
    await g.click(`#natpf-fiera [data-fiera-act="confirm"][data-slot="${slot}"]`);
    await until(g, w => __natpfTennis[w].connected, w, 20000);
    await until(p, () => !document.getElementById('enable').classList.contains('hidden'), null, 10000);
    await p.click('#enable');
    log(`${slot} pronto ` + await until(g, w => __natpfTennis[w].ready, w, 20000));
  }
  await g.click('#natpf-fiera [data-fiera-act="close"]'); await sleep(400);
  await g.click('#natpf-staff [data-staff="close"]'); await sleep(700);
  await g.mouse.move(1, 1);
  const ready = async () => { await until(g, () => [__natpfTennis.natpfPhone, __natpfTennis.natpfPhone2].every(P => P.ready && P.state?.vis !== false), null, 20000); await sleep(600); };
  const mode = async m => { await g.click(`[data-fiera-mode="${m}"]`); await until(g, m => __natpfTennis.natpfUi.lobby.mode === m, m, 8000); await sleep(700); };
  // stati: [nome, preparazione]
  const STATES = [
    ['cpu-pronto', async () => { await mode('cpu'); await ready(); }],
    ['cpu-nome-lungo-mancino', async () => { await g.evaluate(() => { __natpfTennis.natpfUi.events.nickname = 'Massimiliano Rossi'; }); await g.click('#fiera-hand [data-natpf-hand="left"]'); await sleep(300); }],
    ['cpu-t1-schermo-spento', async () => { await g.evaluate(() => { __natpfTennis.natpfUi.events.nickname = ''; }); await g.click('#fiera-hand [data-natpf-hand="right"]'); await phones.p1.evaluate(() => __setHidden(true)); await until(g, () => document.getElementById('btn-start-match').disabled, null, 15000); await sleep(900); }],
    ['due-t2-schermo-spento', async () => { await phones.p1.evaluate(() => __setHidden(false)); await mode('split'); await phones.p2.evaluate(() => __setHidden(true)); await until(g, () => document.getElementById('btn-start-match').disabled, null, 15000); await sleep(1200); }],
    ['due-tutti-e-due-spenti', async () => { await phones.p1.evaluate(() => __setHidden(true)); await sleep(1500); }],
    ['due-pronti', async () => { await phones.p1.evaluate(() => __setHidden(false)); await phones.p2.evaluate(() => __setHidden(false)); await ready(); await until(g, () => !document.getElementById('btn-start-match').disabled, null, 15000); await sleep(600); }],
    ['due-fasce-mani', async () => { await g.click('[data-fiera-band="p1:bambino"]'); await g.click('[data-fiera-hand="p2:left"]'); await g.click('[data-fiera-band="p2:ragazzo"]'); await sleep(400); }],
    // Telefono 1 scollegato (la scritta più lunga): il collegamento si chiude dal computer per un momento
    ['cpu-t1-scollegato', async () => { await g.click('[data-fiera-band="p1:adulto"]').catch(() => {}); await mode('cpu'); await g.evaluate(() => { const P = __natpfTennis.natpfPhone; P.__connected = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(P), 'connected'); Object.defineProperty(P, 'connected', { configurable: true, get: () => false }); }); await sleep(1300); }],
    ['due-t1-scollegato', async () => { await mode('split'); await sleep(900); }],
  ];
  for (const [W, H] of sizes){
    await g.setViewportSize({ width: W, height: H }); await sleep(700);
    for (const [name, prep] of STATES){ await prep(); await state(g, `${W}x${H}`, name); }
    // di nuovo come all'inizio
    await g.evaluate(() => { const P = __natpfTennis.natpfPhone; delete P.connected; });
    await g.click('[data-fiera-band="p2:adulto"]').catch(() => {}); await g.click('[data-fiera-hand="p2:right"]').catch(() => {});
    await mode('cpu');
  }
  if (errs.length) { bad++; rows.push('KO errori nella pagina: ' + errs.slice(0, 3).join(' | ')); }
} catch (e){ bad++; rows.push('KO sonda: ' + (e.stack || e)); console.log(e.stack || e); }
finally { await B.close().catch(() => {}); stop(); }
writeFileSync(`${OUT}/riassunto.txt`, rows.join('\n') + `\n${rows.length - bad}/${rows.length} senza problemi\n`);
console.log(`${rows.length - bad}/${rows.length} senza problemi`);
process.exit(0);
