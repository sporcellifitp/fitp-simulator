// Partita automatica (il gioco colpisce da solo per il giocatore): controlla regole e stabilità.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, secs = '60', out = '/tmp', w = '390', h = '844'] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto('http://localhost:8765/public/index.html');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await p.evaluate(() => { window.__autoplay = true; });
await p.click('[data-a="cpu"]');
const log = [];
const t0 = Date.now(); let k = 0;
while (Date.now() - t0 < +secs * 1000) {
  await p.waitForTimeout(1500);
  const s = await p.evaluate(() => { const m = window.__game.match; return m && { st: m.state, now: +m.now.toFixed(1), g: m.score.games.join('-'), pt: m.score.points.join('-'), hits: m.rally?.hits || 0, ball: m.ball.p.map((x) => +x.toFixed(1)) }; });
  log.push(s);
  if (k < 12) await p.screenshot({ path: `${out}/a_${String(k).padStart(2, '0')}.png` });
  k++;
}
const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
console.log(JSON.stringify({ fps, log, errors: errors.slice(0, 10) }));
await b.close();
