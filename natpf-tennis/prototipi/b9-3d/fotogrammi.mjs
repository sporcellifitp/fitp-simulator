// Fotogrammi e misure del prototipo «3D realistico» con Chromium (WebGL software SwiftShader). Non entra nella build.
// Prima: server vite di natpf-tennis su una porta (es. `npx vite --port 5291 --strictPort --host 127.0.0.1`).
//
//   node fotogrammi.mjs <cartella> "<query>|<nome>" ...   fotogrammi PNG (W, H: dimensioni; PORT: porta)
//       es. node fotogrammi.mjs /tmp/out "g=forehand&t=0.972|dritto-impatto" "g=grip&t=0&pulito|presa"
//   node fotogrammi.mjs --misura                         costo per fotogramma (SIZES=640x400,1280x720 GS=forehand,serve
//                                                        Q=&qualita=bassa): 40 fotogrammi dopo 6 di riscaldamento
// Query utili: g=<grip|ready|forehand|backhand|serve|lob|drop|flat|slice|smash> t=<s> (fotogramma fisso) mano=sinistra
// vista=<dietro|treQuarti|lato|...> pulito (senza interfaccia) qualita=bassa. Tempi dei contatti: contactOf() di motion.js
// (dritto 0,972 s; rovescio 0,944; servizio 1,821; pallonetto 1,272; palla corta 0,878; tagliato 0,944).
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../tools/e2e/package.json', import.meta.url));
const { chromium } = require('playwright-core');

const PORT = process.env.PORT || 5291, BASE = `http://127.0.0.1:${PORT}/prototipi/b9-3d/index.html`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const args = process.argv.slice(2);
try {
  if (args[0] === '--misura'){
    const sizes = (process.env.SIZES || '640x400,1280x720,1920x1080').split(',').map(x => x.split('x').map(Number));
    for (const [W, H] of sizes){
      const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
      for (const g of (process.env.GS || 'forehand,serve,grip').split(',')){
        await page.goto(`${BASE}?g=${g}&misura=40&pulito${process.env.Q || ''}`);
        await page.waitForFunction(() => window.__p3d?.ready, null, { timeout: 300000 });
        const r = await page.evaluate(() => window.__p3d);
        const ms = r.perf.posaMs + r.perf.renderMs;
        console.log(`${W}x${H} ${g}: posa ${r.perf.posaMs.toFixed(2)} ms, disegno ${r.perf.renderMs.toFixed(1)} ms → ${(1000/ms).toFixed(1)} fps;`,
          `${r.info.calls} chiamate, ${r.info.triangles} triangoli; pelle ${r.skin.vertici} vertici, costruita in ${r.skin.ms.totale} ms`);
      }
      await page.close();
    }
  } else {
    const [out, ...specs] = args;
    const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 720) }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const s of specs){
      const [q, name] = s.split('|');
      await page.goto(`${BASE}?${q}`);
      await page.waitForFunction(() => window.__p3d?.ready, null, { timeout: 120000 });
      await page.screenshot({ path: `${out}/${name}.png` });
      console.log(name, JSON.stringify((await page.evaluate(() => window.__p3d)).arm || {}));
    }
    if (errors.length) console.log('errori nella pagina:\n' + errors.join('\n'));
  }
} finally { await browser.close(); }
