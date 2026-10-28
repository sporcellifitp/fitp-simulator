// Prova automatica di una partita contro la CPU in un telefono simulato (390x844): il "bot" scorre
// quando la palla sta arrivando. Uso: node play.mjs <secondi> <cartella screenshot>
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, secs = '40', out = '/tmp'] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
await p.goto('http://localhost:8765/public/index.html');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/g_menu.png` });
await p.click('[data-a="cpu"]');
const swipeUp = async (dx, len, ms) => {
  const x0 = 195, y0 = 640;
  await p.mouse.move(x0, y0); await p.mouse.down();
  const n = 6;
  for (let i = 1; i <= n; i++) { await p.mouse.move(x0 + (dx * i) / n, y0 - (len * i) / n); await p.waitForTimeout(ms / n); }
  await p.mouse.up();
};
const t0 = Date.now();
let shots = 0, lastPlanT = null, k = 0;
while (Date.now() - t0 < +secs * 1000) {
  const st = await p.evaluate(() => { const m = window.__game.match; if (!m) return null; return { state: m.state, now: m.now, plan: m.plan && m.plan.seat === m.me && !m.plan.none ? { t: m.plan.t, swiped: !!m.plan.swipe } : null, server: m.serveInfo?.server, me: m.me, score: m.score.games.join('-') + ' ' + m.score.points.join('-') }; });
  if (!st) break;
  if (st.state === 'serve-wait' && st.server === st.me) { await p.waitForTimeout(400); await swipeUp(40 - Math.random() * 80, 260, 160); shots++; }
  else if (st.state === 'rally' && st.plan && !st.plan.swiped && st.plan.t - st.now < 0.45 && st.plan.t !== lastPlanT) {
    lastPlanT = st.plan.t; await swipeUp(120 - Math.random() * 240, 150 + Math.random() * 150, 120); shots++;
  }
  if (k % 25 === 0) await p.screenshot({ path: `${out}/g_play_${String(k / 25).padStart(2, '0')}.png` });
  k++;
  await p.waitForTimeout(40);
}
const fin = await p.evaluate(() => { const m = window.__game.match; return m ? { state: m.state, games: m.score.games, points: m.score.points, hist: m.score.history } : null; });
console.log(JSON.stringify({ shots, fin, errors: errors.slice(0, 10) }));
await b.close();
