// pannello dello stand appena aperto, puntatore fermo nell'angolo: cosa cambia nei primi secondi (foglio, riga del registro)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const GAME = fileURLToPath(new URL('../../natpf-tennis', import.meta.url));
import { launch } from './th.mjs';
const PORT = +(process.env.GAME_PORT || 4279);
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const up = async url => { for (let i = 0; i < 160; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
await up(`http://127.0.0.1:${PORT}/`);
const d = new Date(), giorno = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const B = await launch();
try {
  for (const [w, h] of [[1920, 1080], [1280, 720]]){
    const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage();
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
    await p.addInitScript(c => { localStorage.setItem('natpf-tennis.cadute', c); localStorage.setItem('natpf-tennis.fiera', '1'); localStorage.setItem('natpf-tennis.chiosco', JSON.stringify({ enabled: true, limit: 45 })); localStorage.setItem('natpf-tennis.lancioAuto', '1'); localStorage.setItem('natpf-tennis.campoAperto', '1'); localStorage.setItem('natpf-tennis.scambioCaldo', '1'); },
      JSON.stringify({ giorno, p1: { n: 3, m: { silenzio: 2, 'telefono: pagina chiusa': 1 } }, p2: { n: 0, m: {} } }));
    await p.goto(`http://127.0.0.1:${PORT}/?intro=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.kiosk && __natpfTennis.player?.model, null, { timeout: 150000 });
    await p.evaluate(() => { const E = __natpfTennis; E.render = () => {}; const ui = E.natpfUi; ui.intro?.skip?.(); ui.kiosk.open(); });
    await p.mouse.move(2, 2);
    const t0 = Date.now(); let last = '';
    while (Date.now() - t0 < 6000){
      const m = await p.evaluate(() => { const s = document.querySelector('#natpf-staff .natpf-sheet'), r = s.getBoundingClientRect(), n = document.getElementById('staff-note'); return { top: Math.round(r.top*10)/10, h: Math.round(r.height), note: n.style.minHeight, reg: document.querySelector('.staff-registro-stato')?.textContent || '', key: __natpfTennis.natpfUi.kiosk._noteKey?.split('|')[0] }; });
      const k = JSON.stringify(m); if (k !== last){ console.log(`${w}x${h} +${Date.now() - t0} ms`, k); last = k; }
      await sleep(100);
    }
    await ctx.close();
  }
} finally { await B.close(); vite.kill(); }
process.exit(0);
