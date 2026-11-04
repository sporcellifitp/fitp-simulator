// harness comune delle prove nel browser di Tennis 1 contro 1 (Playwright). Vedi README.md in questa cartella.
import { chromium } from 'playwright-core';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
export const SP = process.env.OUT || tmpdir() + '/tennis-e2e';           // schermate e file di prova
mkdirSync(SP, { recursive: true });
export const BASE = process.env.BASE || 'http://127.0.0.1:8765';
export const JSQR = here + 'node_modules/jsqr/dist/jsQR.js';
const threeFile = here + 'node_modules/three/build/three.module.min.js';
const three = existsSync(threeFile) ? readFileSync(threeFile) : null;     // facoltativo: Three.js locale invece del CDN
export async function launch(){
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
}
export async function page(browser, url, { w = 1280, h = 760, mobile = false, init = null, context = null } = {}){
  const ctx = context || await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, userAgent: mobile ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' : undefined });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  if (three) await p.route(/cdn\.jsdelivr\.net\/npm\/three/, r => r.fulfill({ body: three, contentType: 'application/javascript' }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  // la pagina del telefono chiede lo schermo intero a «Attiva i sensori»: il Chromium recente della CI lo concede e poi
  // setViewportSize fallisce («restore it to normal state first»). Nelle prove la richiesta riesce senza cambiare finestra
  await p.addInitScript(() => { try { Element.prototype.requestFullscreen = function(){ return Promise.resolve(); }; } catch {} });
  // Chromium recente (CI) ha DeviceMotionEvent.requestPermission come iPhone e in headless risponde «denied»: chi gioca
  // tocca «Consenti». Solo se esiste (resta il percorso Android); gli script che provano il rifiuto lo sovrascrivono dopo
  await p.addInitScript(() => { try { if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') DeviceMotionEvent.requestPermission = async () => 'granted'; } catch {} });
  if (init) await p.addInitScript(init);
  await p.goto(url.replace('http://127.0.0.1:8765', BASE), { waitUntil: 'domcontentloaded', timeout: 120000 });
  return { ctx, p, errs };
}
export const results = []; export const check = (n, ok, i = '') => { results.push(ok); console.log((ok ? 'OK  ' : 'KO  ') + n + (i ? ' — ' + i : '')); };
export const summary = () => { console.log(`\n${results.filter(Boolean).length}/${results.length} verifiche superate`); if (results.some(r => !r)) process.exitCode = 1; };

// Calibrazione rapida del telefono simulato (fermo, poi un gesto per verso, site/js/tennis/calibration.js QUICK_PLAN)
// fatta come una persona: prima di ogni gesto aspetta che il telefono sia pronto («Ora»), tenendolo fermo. Dal 29/10 il
// telefono vuole 0,6 s di quiete prima del primo gesto (CAL.firstSettle) e 1,5 s di preparazione dopo l'attivazione
// (CAL.lead): i tempi fissi di prima (0,5 s) facevano partire il gesto troppo presto. La pagina del telefono deve avere
// window.__up con still(ms), swing(segno) e back(segno), come negli script natpf-*.
export async function quickCalibrate(phone, plan, { timeout = 12000 } = {}){
  for (let i = 0; i < plan.length; i++){
    await phone.evaluate(async ({ i, timeout }) => {
      const t0 = performance.now(), R = window.__racchetta;
      while (!(R.state.step === 'swings' && R.cal.state.ready && R.cal.state.idx === i)){
        if (performance.now() - t0 > timeout) throw new Error(`telefono non pronto al gesto ${i + 1}: passo ${R.state.step}, pronto ${R.cal.state.ready}, gesto ${R.cal.state.idx}`);
        await window.__up.still(100);
      }
    }, { i, timeout });
    const s = plan[i] === 'R' ? -1 : 1;
    await phone.evaluate(s => __up.swing(s).then(() => __up.back(s)).then(() => __up.still(700)), s);
  }
}
// «Allenamento» dal menu apre prima la lezione (presa, mano, posizione): chi gioca la scorre con «Avanti» fino a
// «Calibra». Durante la lezione il computer non segue la calibrazione del telefono (natpf_training._onCal).
// Con il telefono, dal 04/11, al posto della lezione c'è la modale del tutorial: si chiude toccando «Tutto chiaro, ho
// capito» sul telefono (phone), come chi gioca; senza la pagina del telefono, con Esc come chi gestisce la postazione.
export async function finishLesson(game, max = 8, phone = null){
  for (let k = 0; k < max && await game.evaluate(() => !!window.__natpfTennis?.natpfUi?.training?.lesson); k++) await game.click('#coach-lesson-next');
  if (!await game.evaluate(() => !!window.__natpfTennis?.natpfUi?.training?.tutorialOpen)) return null;
  if (phone){
    await phone.waitForFunction(() => { const b = document.getElementById('tutOk'); return b && !b.classList.contains('hidden'); }, null, { timeout: 8000 });
    await phone.click('#tutOk');
  } else await game.keyboard.press('Escape');
  await game.waitForFunction(() => !window.__natpfTennis.natpfUi.training.tutorialOpen, null, { timeout: 8000 });
  return phone ? 'telefono' : 'esc';
}
