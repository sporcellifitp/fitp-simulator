// B41.3 difetto 8 · sonda del pannello dello stand: con il puntatore su ogni voce (e tra le voci) il foglio non si muove e
// non scorre? Per ogni misura e variante (modalità fiera, righe delle cadute 0/1/2, opzioni accese, ponte del programma
// Windows) misura la posizione del foglio, lo scorrimento e «Chiudi» in vista con il puntatore fuori, su ogni voce e su punti
// a griglia sopra il foglio.
//   GAME_PORT=4275 SIZES=720x720,1024x600 VARIANTS=all|quick OUT=<cartella> node natpf-stand-layout.mjs
// B74 (revisione, S1): misure di base anche 1280×720 e 1536×864 (con 21 voci il foglio scorreva lì, con le cadute e le
// opzioni accese; prima nessuna misura tra 801 e 900 px di altezza)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
const GAME = fileURLToPath(new URL('../../natpf-tennis', import.meta.url));
import { launch } from './th.mjs';
const PORT = +(process.env.GAME_PORT || 4275), OUT = process.env.OUT || '/tmp/panel-out';
mkdirSync(OUT, { recursive: true });
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const up = async url => { for (let i = 0; i < 160; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
console.log('vite', await up(`http://127.0.0.1:${PORT}/`));
const d = new Date(), giorno = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const CADUTE = {
  0: null,
  1: { giorno, p1: { n: 3, m: { silenzio: 2, 'telefono: pagina chiusa': 1 } }, p2: { n: 0, m: {} } },
  2: { giorno, p1: { n: 3, m: { silenzio: 3 } }, p2: { n: 12, m: { 'telefono: scollegato': 7, 'pagina del gioco ricaricata': 5 } } },
};
const sizes = (process.env.SIZES || '720x720,1024x600,1280x720,1366x657,1536x864,1920x540').split(',').map(s => s.split('x').map(Number));
const VARIANTS = [];
for (const fiera of [0, 1]) for (const cad of [0, 1, 2]) for (const opts of [0, 1]) for (const desk of [0, 1]) VARIANTS.push({ fiera, cad, opts, desk });
// (PICK=1:2:0:0,… solo quelle varianti: fiera:cadute:opzioni:programma)
const PICK = (process.env.PICK || '').split(',').filter(Boolean);
const pick0 = process.env.VARIANTS === "quick" ? VARIANTS.filter(v => v.opts === 1 && (v.cad === 0 || v.cad === 2) && v.desk === v.fiera) : process.env.VARIANTS === "cadute" ? VARIANTS.filter(v => v.cad > 0 && v.fiera === 1) : process.env.VARIANTS === "fiera" ? VARIANTS.filter(v => v.fiera === 1) : VARIANTS;
const pick = PICK.length ? pick0.filter(v => PICK.includes(`${v.fiera}:${v.cad}:${v.opts}:${v.desk}`)) : pick0;
const B = await launch();
const rows = [];
let bad = 0;
try {
  for (const [w, h] of sizes) for (const v of pick){
    const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
    await p.addInitScript(([c, v]) => {
      if (c) localStorage.setItem('natpf-tennis.cadute', c);
      if (v.fiera) localStorage.setItem('natpf-tennis.fiera', '1');
      if (v.opts){ localStorage.setItem('natpf-tennis.chiosco', JSON.stringify({ enabled: true, limit: 45 })); localStorage.setItem('natpf-tennis.lancioAuto', '1'); localStorage.setItem('natpf-tennis.campoAperto', '1'); localStorage.setItem('natpf-tennis.scambioCaldo', '1'); }
      if (v.desk){ const noop = () => {}; window.natpfDesktop = new Proxy({ displays: { get: async () => ({ current: { label: 'Monitor 2' }, list: [{}, {}] }), next: async () => ({}), list: async () => ({ current: { label: 'Monitor 2' }, list: [{}, {}] }), on: noop, onChange: noop } }, { get: (t, k) => (k in t ? t[k] : undefined) }); }
    }, [CADUTE[v.cad] ? JSON.stringify(CADUTE[v.cad]) : '', v]);
    await p.goto(`http://127.0.0.1:${PORT}/?intro=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.kiosk && __natpfTennis.player?.model, null, { timeout: 150000 });
    await p.evaluate(() => { const E = __natpfTennis; E.render = () => {}; const ui = E.natpfUi; ui.intro?.skip?.(); ui.kiosk.open(); });
    await p.mouse.move(2, 2); await sleep(700);
    // (il foglio entra con un'animazione, translateY 12 px e scala 0,98: sotto carico può durare più di 700 ms e la misura
    // «fuori» la prendeva a metà; si aspetta che finisca)
    await p.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'), null, { timeout: 10000 }).catch(() => {});
    await sleep(100);
    const measure = () => p.evaluate(() => {
      const s = document.querySelector('#natpf-staff .natpf-sheet'), r = s.getBoundingClientRect(), close = s.querySelector('[data-staff="close"]').getBoundingClientRect(), note = document.getElementById('staff-note');
      return { top: Math.round(r.top*10)/10, bottom: Math.round(r.bottom), scroll: s.scrollHeight - s.clientHeight, closeIn: close.top >= r.top - 0.5 && close.bottom <= Math.min(r.bottom, innerHeight) + 0.5, noteH: Math.round(note.getBoundingClientRect().height), note: note.textContent.slice(0, 40) };
    });
    const base = await measure();
    const tops = new Set([base.top]), issues = [];
    let maxScroll = base.scroll, maxNote = base.noteH;
    if (base.scroll > 0 || !base.closeIn) issues.push({ where: 'fuori', ...base });
    // ogni voce (centro e bordi) e una griglia di punti sopra il foglio
    const targets = await p.evaluate(() => {
      const s = document.querySelector('#natpf-staff .natpf-sheet'), out = [];
      for (const b of s.querySelectorAll('[data-staff]')){ const q = b.getBoundingClientRect(); if (!q.width || !q.height) continue; const k = b.dataset.staff; out.push({ k, x: q.left + q.width/2, y: q.top + q.height/2 }, { k: k + ':alto', x: q.left + q.width/2, y: q.top + 2 }, { k: k + ':basso', x: q.left + q.width/2, y: q.bottom - 2 }); }
      return out;
    });
    for (const t of targets){
      await p.mouse.move(t.x, t.y); await sleep(90);
      // qualche fotogramma: il foglio si muove sotto il puntatore fermo?
      const m = await p.evaluate(() => new Promise(res => { const s = document.querySelector('#natpf-staff .natpf-sheet'), seen = new Set(); let k = 0; const f = () => { seen.add(Math.round(s.getBoundingClientRect().top*10)/10); if (++k < 6) requestAnimationFrame(f); else res([...seen]); }; requestAnimationFrame(f); }));
      const r = await measure();
      for (const x of m) tops.add(x);
      maxScroll = Math.max(maxScroll, r.scroll); maxNote = Math.max(maxNote, r.noteH);
      if (m.length > 1 || r.top !== base.top || r.scroll > 0 || !r.closeIn) issues.push({ where: t.k, tops: m, ...r });
    }
    const name = `${w}x${h} fiera=${v.fiera} cadute=${v.cad} opzioni=${v.opts} programma=${v.desk}`;
    const ok = tops.size === 1 && maxScroll <= 0 && !issues.length && !errs.length;
    if (!ok) bad++;
    const line = `${ok ? 'OK' : 'KO'}  ${name}: top ${[...tops].join('/')} · scorrimento max ${maxScroll} · riga sotto le voci max ${maxNote} px · problemi ${issues.length}${issues.length ? ' ' + JSON.stringify(issues.slice(0, 3)) : ''}${errs.length ? ' errori ' + errs.slice(0, 2).join(' | ') : ''}`;
    console.log(line); rows.push(line);
    if (!ok || process.env.SHOTS === '1'){ await p.mouse.move(2, 2); await sleep(200); await p.screenshot({ path: `${OUT}/${w}x${h}-f${v.fiera}-c${v.cad}-o${v.opts}-d${v.desk}.png` }); }
    await ctx.close();
  }
} finally { await B.close(); vite.kill(); }
writeFileSync(`${OUT}/riassunto.txt`, rows.join('\n') + `\n${rows.length - bad}/${rows.length} senza problemi\n`);
console.log(`${rows.length - bad}/${rows.length} senza problemi`);
process.exitCode = bad ? 1 : 0;
