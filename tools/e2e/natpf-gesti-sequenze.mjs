// NATPF motore base (natpf-tennis/): fotogrammi IN SEQUENZA dell'animazione dei gesti (revisione artistica B9 ramo C,
// docs/b9/animazione-c.md §6). Per ogni scheda N fotogrammi equidistanti su un ciclo (N ≥ 12) disegnati da
// natpf_gesture_demo.js, in fogli 4 colonne: per giudicare ritmo, easing, anticipazione, accompagnamento e scatti, oltre
// all'anatomia. Più le misure del moto a 60 fps sul disegno (salto massimo per fotogramma di cima del telefono,
// etichette dei fantasmi e camera) che i fogli fermi non mostrano.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome GAME_PORT=3811 OUT=/cartella node natpf-gesti-sequenze.mjs
//   SIZES=640x400,448x280  HANDS=right,left  N=16  IDS=forehand,serve  STRIP=1 (striscia 1600×1000)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3142);
const OUT = process.env.OUT || path.join(os.tmpdir(), 'natpf-gesti-sequenze'); mkdirSync(OUT, { recursive: true });
const N = Math.max(12, +(process.env.N || 16));
const SIZES = (process.env.SIZES || '640x400,448x280').split(',').map(s => s.split('x').map(Number));
const HANDS = (process.env.HANDS || 'right,left').split(',');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, i = '') => { results.push(ok); console.log((ok ? 'OK  ' : 'KO  ') + n + (i ? ' — ' + i : '')); };
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/src/natpf/natpf_gesture_pose.js`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1700, height: 1100 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.goto(`http://127.0.0.1:${GAME_PORT}/src/natpf/natpf_gesture_pose.js`);
await p.evaluate(async () => {
  document.documentElement.innerHTML = `<head><style>
    @font-face { font-family: "Barlow Condensed"; font-weight: 800; font-style: italic; src: url("/fonts/barlow-condensed-latin-800-italic.woff2") format("woff2"); }
    @font-face { font-family: "Barlow"; font-weight: 500; src: url("/fonts/barlow-latin-500-normal.woff2") format("woff2"); }
    @font-face { font-family: "Barlow"; font-weight: 600; src: url("/fonts/barlow-latin-600-normal.woff2") format("woff2"); }
    @font-face { font-family: "Barlow"; font-weight: 700; src: url("/fonts/barlow-latin-700-normal.woff2") format("woff2"); }
    body { margin: 0; background: #000; } #st { position: absolute; left: 0; top: 0; }
    .gesture-demo-canvas { display: block; width: 100%; height: 100%; }</style></head><body><div id="st"></div></body>`;
  await Promise.all(['800 italic 20px "Barlow Condensed"', '500 12px Barlow', '600 12px Barlow', '700 12px Barlow'].map(f => document.fonts.load(f)));
  window.__D = await import('/src/natpf/natpf_gesture_demo.js'); window.__GP = await import('/src/natpf/natpf_gesture_pose.js');
});
check('modulo caricato senza errori', errs.length === 0, errs.join(' | '));
const IDS = process.env.IDS ? process.env.IDS.split(',') : await p.evaluate(() => [...window.__GP.CARD_IDS]);
const TITLES = { grip: 'Presa', ready: 'Posizione', forehand: 'Dritto', backhand: 'Rovescio', serve: 'Servizio', flat: 'Piatto', lob: 'Pallonetto', drop: 'Palla corta', slice: 'Tagliato', smash: 'Schiacciata', volley: 'Volée', cross: 'Incrociato', line: 'Lungolinea' };

// foglio di una scheda: N fotogrammi equidistanti sul ciclo (tempo reale), 4 colonne, didascalia con t e fase
async function seqSheet(id, hand, W, H, scale, times = null){
  const url = await p.evaluate(({ id, hand, W, H, N, scale, times, title }) => {
    const D = window.__D, GP = window.__GP, st = document.getElementById('st'), d = window.__demo ||= new D.NatpfGestureDemo();
    st.style.width = W + 'px'; st.style.height = H + 'px'; d.mount(st); d.setSize(W, H); d.play(id, { hand });
    const P = GP.gesturePlan(id), T = times || Array.from({ length: N }, (_, i) => P.total*i/N);
    const cols = Math.min(4, T.length), cw = Math.round(W*scale), ch = Math.round(H*scale), cap = 20, rows = Math.ceil(T.length/cols);
    const out = document.createElement('canvas'); out.width = cols*(cw + 6) + 6; out.height = rows*(ch + cap + 6) + 6;
    const o = out.getContext('2d'); o.fillStyle = '#0b0f1a'; o.fillRect(0, 0, out.width, out.height);
    T.forEach((t, i) => {
      d.show(t, { rate: 1 });
      const x = 6 + (i % cols)*(cw + 6), y = 6 + Math.floor(i/cols)*(ch + cap + 6);
      o.fillStyle = '#dfe6f7'; o.font = '600 14px Barlow, sans-serif'; o.textBaseline = 'top';
      o.fillText(`${title} ${i + 1}/${T.length} · ${t.toFixed(2)} s · ${d.info.pose.label}${P.contact != null && Math.abs(t - P.contact) < .02 ? ' (contatto)' : ''}`, x, y + 2);
      o.drawImage(d.canvas, x, y + cap, cw, ch);
    });
    return out.toDataURL('image/webp', .82);
  }, { id, hand, W, H, N, scale, times, title: TITLES[id] + (hand === 'left' ? ' mancino' : '') });
  const file = path.join(OUT, `seq-${W}x${H}-${id}-${hand}.webp`);
  writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  return file;
}

// moto a 60 fps sul disegno: salto massimo per fotogramma (px, frazione della larghezza) di cima del telefono, centro
// della camera (cx, cy e bersaglio proiettato) ed etichette dei fantasmi (che non devono saltare: si spostano solo con
// il soggetto o restano ferme)
async function motionStats(id, hand, W, H){
  return p.evaluate(({ id, hand, W, H }) => {
    const D = window.__D, GP = window.__GP, st = document.getElementById('st'), d = window.__demo ||= new D.NatpfGestureDemo();
    st.style.width = W + 'px'; st.style.height = H + 'px'; d.mount(st); d.setSize(W, H); d.play(id, { hand });
    const P = GP.gesturePlan(id), dt = 1/60;
    let prev = null, tipJump = 0, camJump = 0, labJump = 0, labAt = null, labJumps = 0, tipAt = 0;
    for (let t = 0; t < P.total + dt; t += dt){
      d.show(t % P.total, { rate: 1 });
      const I = d.info, R = hand === 'left' ? { pos: GP.mirrorPos(I.pose.pos), q: GP.mirrorQ(I.pose.q) } : I.pose;
      const tip = I.cam.p(GP.add(R.pos, GP.qrot(R.q, [0, GP.PHONE.h/2, 0]))), tg = I.cam.p(GP.SHOULDER);
      const labs = new Map((I.ghosts || []).filter(g => g.labelBox).map(g => [g.i, g.labelBox]));
      if (prev){
        const j = Math.hypot(tip.x - prev.tip.x, tip.y - prev.tip.y); if (j > tipJump){ tipJump = j; tipAt = t; }
        camJump = Math.max(camJump, Math.hypot(tg.x - prev.tg.x, tg.y - prev.tg.y));
        for (const [i, b] of labs){ const a = prev.labs.get(i); if (!a) continue; const j = Math.hypot(b.x0 - a.x0, b.y0 - a.y0); if (j > 3) labJumps++; if (j > labJump){ labJump = j; labAt = `${t.toFixed(2)} n.${i + 1}`; } }
      }
      prev = { tip, tg, labs };
    }
    return { tipJump, tipAt, camJump, labJump, labAt, labJumps };
  }, { id, hand, W, H });
}

for (const [W, H] of SIZES) for (const hand of HANDS) for (const id of IDS){
  const scale = W >= 1000 ? .4 : 1;
  const f = await seqSheet(id, hand, W, H, scale);
  const m = await motionStats(id, hand, W, H);
  check(`${W}×${H} ${id} ${hand}: etichette dei fantasmi senza salti (≤ 2% della larghezza per fotogramma o 1,5× lo spostamento della camera che segue)`, m.labJump <= Math.max(.02*W, 1.5*m.camJump), `salto max ${m.labJump.toFixed(0)} px`);
  console.log(`    ${W}×${H} ${id} ${hand}: ${path.basename(f)} · cima max ${m.tipJump.toFixed(0)} px/fotogramma a ${m.tipAt.toFixed(2)} s · camera max ${m.camJump.toFixed(1)} px · etichette: salto max ${m.labJump.toFixed(0)} px (${m.labAt || '-'}), salti > 3 px ${m.labJumps}`);
}
if (process.env.STRIP){
  // striscia per il ledwall: dritto e servizio a 1600×1000, 6 momenti ciascuno (la fine è quella VERA dell'accompagnamento,
  // T.back: prima T.end + 0,02, 0,15–0,3 s prima)
  const T = await p.evaluate(() => { const GP = window.__GP, a = GP.gesturePlan('forehand'), b = GP.gesturePlan('serve');
    return { fh: [a.T.inv - .3, a.T.inv, (a.T.inv + a.contact)/2, a.contact, a.T.back - .004, (a.T.back + a.T.home)/2], sv: [b.T.hold + .5, b.T.tossPeak, b.T.tossEnd, b.T.hitStart, b.contact, b.T.back - .004] }; });
  for (const [id, t] of [['forehand', T.fh], ['serve', T.sv]]) console.log('    striscia', path.basename(await seqSheet(id, 'right', 1600, 1000, .4, t)));
}
check('nessun errore nella pagina', errs.length === 0, errs.join(' | '));
await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} verifiche superate · fogli in ${OUT}`);
if (results.some(r => !r)) process.exitCode = 1;
process.exit();
