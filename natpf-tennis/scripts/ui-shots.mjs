// Screenshot del percorso dell'interfaccia (intro → menu → modalità → collegamento → riscaldamento → sfide → risultato)
// con il Chromium di Playwright, per controllare a occhio il redesign senza telefono. Serve il server di sviluppo:
//   npm run dev   (in un altro terminale)
//   node scripts/ui-shots.mjs [--url http://127.0.0.1:3000/] [--out shots] [--mobile] [--only menu,mode]
// Playwright non è una dipendenza del progetto: si usa quello installato a livello di sistema (NODE_PATH globale).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL = arg('--url', 'http://127.0.0.1:3000/');
const OUT = path.resolve(arg('--out', 'shots'));
const MOBILE = process.argv.includes('--mobile');
const ONLY = arg('--only', '')?.split(',').filter(Boolean);
let playwright;
try { playwright = createRequire(import.meta.url)('playwright'); }
catch { playwright = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }

const viewport = MOBILE ? { width: 915, height: 412 } : { width: 1280, height: 720 };
fs.mkdirSync(OUT, { recursive: true });
const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async name => {
  if (ONLY.length && !ONLY.includes(name)) return;
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${MOBILE ? 'm-' : ''}${name}.png`), timeout: 120000 });
  console.log('screenshot', name);
};
const ui = (fn, a) => page.evaluate(fn, a);

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby, null, { timeout: 60000 });
await page.waitForTimeout(2500);
await shot('intro');
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
await shot('menu');
for (const step of ['mode', 'challenges', 'ranking', 'options', 'controller', 'connect', 'match']){
  await ui(s => window.__natpfTennis.natpfUi.lobby.go(s), step);
  await shot(step);
}
// riscaldamento con mouse e tastiera (nessun telefono nell'ambiente di prova)
await ui(() => { const U = window.__natpfTennis.natpfUi; U.testInput = true; U.setController?.('mouse'); U.controller = 'mouse'; U.lobby.go('menu'); U.lobby.setMode('training'); U.lobby.startWarmup?.() ?? U.lobby.startPractice(); });
await page.waitForTimeout(2500);
await shot('warmup');
await page.waitForTimeout(3000);
await shot('warmup-2');
for (const id of ['targets', 'machine', 'rally', 'radar']){
  const ok = await ui(i => { const U = window.__natpfTennis.natpfUi; if (!U.events.constructor.prototype || !U.events.start) return false; U.training.active && U.training.stop({ completed: false, silent: true }); U.events.start(i); return !!U.events.active; }, id);
  if (!ok) continue;
  await page.waitForTimeout(3500);
  await shot('challenge-' + id);
  await ui(() => window.__natpfTennis.natpfUi.events.finish());
  await page.waitForTimeout(1200);
  await shot('result-' + id);
}
console.log(errors.length ? 'Errori nella pagina:\n' + [...new Set(errors)].slice(0, 20).join('\n') : 'Nessun errore nella pagina');
await browser.close();
