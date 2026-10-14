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
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
}
export async function page(browser, url, { w = 1280, h = 760, mobile = false, init = null } = {}){
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, userAgent: mobile ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' : undefined });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  if (three) await p.route(/cdn\.jsdelivr\.net\/npm\/three/, r => r.fulfill({ body: three, contentType: 'application/javascript' }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  if (init) await p.addInitScript(init);
  await p.goto(url.replace('http://127.0.0.1:8765', BASE));
  return { ctx, p, errs };
}
export const results = []; export const check = (n, ok, i = '') => { results.push(ok); console.log((ok ? 'OK  ' : 'KO  ') + n + (i ? ' — ' + i : '')); };
export const summary = () => { console.log(`\n${results.filter(Boolean).length}/${results.length} verifiche superate`); if (results.some(r => !r)) process.exitCode = 1; };
