// Clip della guida «Come si gioca» (src/natpf/natpf_onboarding.js): fotogrammi del gioco vero, ripresi con Chromium
// mentre il gioco gira al rallentatore, rimpiccioliti e messi in fila in un'unica immagine (public/guide/<clip>.jpg)
// che il CSS anima. Da rifare solo se cambia l'aspetto del campo.
//   npm run dev  (in un altro terminale)   poi   node scripts/guide-clips.mjs [http://127.0.0.1:3000/]
// Serve Playwright con Chromium (PLAYWRIGHT_MODULE=percorso/di/playwright/index.mjs se non è tra le dipendenze).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/guide');
const URL_ = process.argv[2] || 'http://127.0.0.1:3000/';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRAMES = 12, W = 320, H = 180;
// la metà campo di chi gioca (la palla arriva, il colpo, l'anello e la partenza verso l'altra metà)
const CROP = { x: 240, y: 150, width: 800, height: 450 };
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(URL_);
await page.waitForTimeout(5000);
// riscaldamento con mouse e tastiera (niente calibrazione), interfaccia del riscaldamento nascosta
await page.evaluate(() => {
  const E = window.__natpfTennis, ui = E.natpfUi;
  if (!ui.testInput) ui.toggleTestInput();
  ui.selectController('mouse', { open: false });
  ui.lobby.go('warmup');
  const st = document.createElement('style');
  st.textContent = '#natpf-coach,#coach-gesture,#natpf-pause-btn,#natpf-toast,.center-banner-layer{display:none!important}';
  document.head.appendChild(st);
});
await page.waitForTimeout(2500);

// porta il gioco a un momento preciso: palla del lanciapalle verso il dritto o il rovescio
const feed = side => page.evaluate(side => { const T = window.__natpfTennis.natpfUi.training; T.wait = 0; T._feed(side); }, side);
const slow = k => page.evaluate(k => { window.__natpfTennis.natpfTimeScale = k; }, k);
// colpo del telefono con un anticipo (s) rispetto allo sweet spot: >0 incrociato, <0 lungolinea
const swingAt = (lead, extra = {}) => page.evaluate(([lead, extra]) => new Promise(done => {
  const E = window.__natpfTennis, until = performance.now() + 8000;
  const tick = () => {
    if (performance.now() > until) return done(false);
    const b = E.ball, l = (E.player.pos.z - .1 - b.pos.z)/Math.max(.5, b.vel.z);
    if (E.phase === 'RALLY' && b.lastHitter === 'opponent' && b.vel.z > .5 && l <= lead){
      E._handleUserSwingInput({ source: 'natpf-phone', speed: 1.3, dirX: 0, shotType: extra.shot || 'topspin', side: extra.side || 'forehand',
        natpf: { aim: 'swing', wrist: extra.wrist || 0, power: .7, latency: 0, hand: 'right', shot: extra.shot || 'topspin' } });
      return done(true);
    }
    requestAnimationFrame(tick);
  };
  tick();
}), [lead, extra]);
async function capture(name, during){
  const shots = [];
  const job = during();
  for (let i = 0; i < FRAMES; i++){ shots.push((await page.screenshot({ type: 'jpeg', quality: 85, clip: CROP })).toString('base64')); await page.waitForTimeout(90); }
  await job;
  const data = await page.evaluate(async ([shots, W, H]) => {
    const c = document.createElement('canvas'); c.width = W*shots.length; c.height = H;
    const g = c.getContext('2d');
    for (let i = 0; i < shots.length; i++){
      const img = new Image(); img.src = 'data:image/jpeg;base64,' + shots[i]; await img.decode();
      g.drawImage(img, 0, 0, img.width, img.height, i*W, 0, W, H);
    }
    return c.toDataURL('image/jpeg', .74).split(',')[1];
  }, [shots, W, H]);
  fs.writeFileSync(path.join(OUT, `${name}.jpg`), Buffer.from(data, 'base64'));
  console.log(`${name}.jpg`, Math.round(Buffer.from(data, 'base64').length/1024), 'KB');
}
const settle = () => page.waitForTimeout(1600);

// 1 il giocatore corre da solo verso la palla
await feed('backhand'); await slow(.3); await capture('run', async () => {}); await slow(1); await settle();
// 2 colpo al momento giusto: anello verde
await slow(1); await feed('forehand'); await page.waitForTimeout(500); await slow(.25);
await capture('hit', () => swingAt(0)); await slow(1); await settle();
// 3 direzione: in anticipo (incrociato), poi in ritardo (lungolinea)
await feed('forehand'); await page.waitForTimeout(500); await slow(.25);
await capture('aim', () => swingAt(.13, { wrist: -.4 })); await slow(1); await settle();
// 4 servizio: lancio e colpo
await page.evaluate(() => { const E = window.__natpfTennis; E.natpfUi.training.wait = 99; E.score.server = 'player'; E._setupPointServe({ showBanner: false }); });
await page.waitForTimeout(800); await slow(.35);
await capture('serve', async () => {
  await page.evaluate(() => window.__natpfTennis._handleUserTossInput({}));
  await page.waitForFunction(() => { const b = window.__natpfTennis.ball; return b.pos.y > 2 && b.vel.y < .6; }, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => window.__natpfTennis._handleUserSwingInput({ source: 'natpf-phone', speed: 1.4, dirX: 0 }));
});
await slow(1); await settle();
// 5 colpi speciali: lob
await page.evaluate(() => { window.__natpfTennis.natpfUi.training.wait = 0; });
await feed('forehand'); await page.waitForTimeout(500); await slow(.3);
await capture('shots', () => swingAt(0, { shot: 'lob' }));
await browser.close();
