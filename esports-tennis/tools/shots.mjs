// Fotogrammi ravvicinati di una partita automatica contro la CPU, per controllare palla, indicatori e movimenti.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, out = '/tmp', n = '10', every = '700'] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:8765/public/index.html');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await p.evaluate(() => { window.__autoplay = true; });
await p.click('[data-a="cpu"]');
await p.waitForFunction(() => window.__game.match && window.__game.match.state === 'rally', null, { timeout: 120000 });
for (let i = 0; i < +n; i++) {
  await p.screenshot({ path: `${out}/s_${String(i).padStart(2, '0')}.png` });
  await p.waitForTimeout(+every);
}
console.log(JSON.stringify({ errors }));
await b.close();
