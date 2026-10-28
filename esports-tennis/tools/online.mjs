// Due "telefoni" che si sfidano online sul server locale, entrambi in gioco automatico.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, secs = '60', out = '/tmp', base = 'http://localhost:8790'] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const mk = async (tag) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(`${tag}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(`${tag}: ${m.text()}`); });
  return p;
};
const A = await mk('A'), B = await mk('B');
await A.goto(base + '/');
await A.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await A.evaluate(() => { window.__autoplay = true; });
await A.click('[data-a="online"]');
await A.fill('.online .nm', 'Sergio');
await A.click('[data-a="create"]');
await A.waitForTimeout(500);
const url = A.url();
const code = new URL(url).searchParams.get('room');
await A.screenshot({ path: `${out}/o_wait.png` });
await B.goto(`${base}/?room=${code}`);
await B.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await B.evaluate(() => { window.__autoplay = true; });
await B.fill('.online .nm', 'Marco');
await B.click('[data-a="join"]');
const snap = (p) => p.evaluate(() => { const m = window.__game.match; return m && { st: m.state, me: m.me, now: +m.now.toFixed(1), g: m.score.games.join('-'), pt: m.score.points.join('-'), seq: m.pointSeq, shots: m.lastShotSeq, names: m.names }; });
const t0 = Date.now(); const log = []; let k = 0;
while (Date.now() - t0 < +secs * 1000) {
  await A.waitForTimeout(2500);
  log.push([await snap(A), await snap(B)]);
  if (k < 6) { await A.screenshot({ path: `${out}/o_A${k}.png` }); await B.screenshot({ path: `${out}/o_B${k}.png` }); }
  k++;
}
console.log(JSON.stringify({ code, log, errors: [...A.errors, ...B.errors].slice(0, 12) }, null, 0));
await b.close();
