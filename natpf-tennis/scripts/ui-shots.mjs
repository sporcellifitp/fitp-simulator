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
// tutorial con uno smartphone simulato (nessun telefono vero qui): lezione, poi esercizi con l'animazione e il feedback
await ui(() => {
  const U = window.__natpfTennis.natpfUi, P = U.phone;
  U.training.active && U.training.stop({ completed: false, silent: true });
  // telefono collegato e calibrato, simulato (il pannello del QR non si apre)
  Object.defineProperty(P, 'connected', { get: () => true, configurable: true });
  P.state.phone = 'ready';
  U.controller = 'phone'; U.training.introSeen = {}; U.training.start({ intro: true });
});
await page.waitForTimeout(2500); await shot('lesson-1');
await ui(() => window.__natpfTennis.natpfUi.training.lessonAction('next')); await page.waitForTimeout(1500); await shot('lesson-2');
await ui(() => {
  const U = window.__natpfTennis.natpfUi, T = U.training;
  Object.defineProperty(U.phone, 'ready', { get: () => true, configurable: true });
  T.stop({ completed: false, silent: true }); T.start({});
  T.idx = T.drills.findIndex(d => d.id === 'lob');
  T.live = { ok: false, recognized: 'Dritto in topspin', tip: 'Era orizzontale: porta il telefono dal basso verso l’alto, in verticale', power: .7, until: performance.now() + 60000 };
});
await page.waitForTimeout(2500); await shot('drill-lob');
await ui(() => { const T = window.__natpfTennis.natpfUi.training; T.idx = 0; T.live = { ok: true, recognized: 'Dritto in topspin', tip: '', power: .85, until: performance.now() + 60000 }; });
await page.waitForTimeout(2000); await shot('drill-forehand');
await ui(() => { const U = window.__natpfTennis.natpfUi; U.training.stop({ completed: false, silent: true }); delete U.phone.ready; delete U.phone.connected; U.controller = 'mouse'; });
for (const id of ['rush', 'precision', 'combo', 'survival']){
  const ok = await ui(i => { const U = window.__natpfTennis.natpfUi; if (!U.events.constructor.prototype || !U.events.start) return false; U.training.active && U.training.stop({ completed: false, silent: true }); U.events.start(i); return !!U.events.active; }, id);
  if (!ok) continue;
  await page.waitForTimeout(4500);
  await shot('challenge-' + id);
  await ui(i => { const ev = window.__natpfTennis.natpfUi.events; ev.active.score = { rush: 720, precision: 510, combo: 260, survival: 22 }[i] || 0; ev.finish(); }, id);
  await page.waitForTimeout(1200);
  await shot('result-' + id);
}
// finestre: guida, pausa, telefono, vittoria
await ui(() => { const U = window.__natpfTennis.natpfUi; U.lobby.go('menu'); U.onboarding.open(); });
await shot('sheet-guide');
await ui(() => { const U = window.__natpfTennis.natpfUi; U.onboarding.close?.(); document.getElementById('natpf-onboarding')?.classList.add('hidden'); U.training.start({}); U.pause?.open?.() ?? U.pause?.toggle?.(); });
await shot('sheet-pause');
await ui(() => { const U = window.__natpfTennis.natpfUi; U.pause?.close?.(); document.getElementById('natpf-pause')?.classList.add('hidden'); U.training.stop({ completed: false, silent: true }); document.getElementById('natpf-phone-modal')?.classList.remove('hidden'); });
await shot('sheet-phone');
await ui(() => { document.getElementById('natpf-phone-modal')?.classList.add('hidden'); const E = window.__natpfTennis; E.hud.hideTitleModal?.(); E.hud.showVictoryModal?.({ playerWon: true, playerGames: 1, opponentGames: 0 }); document.getElementById('victory-modal')?.classList.remove('hidden'); });
await shot('victory');
console.log(errors.length ? 'Errori nella pagina:\n' + [...new Set(errors)].slice(0, 20).join('\n') : 'Nessun errore nella pagina');
await browser.close();
