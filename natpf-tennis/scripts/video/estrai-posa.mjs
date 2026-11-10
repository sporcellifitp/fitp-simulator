// B17.1 · Misura del video dei gesti dell'utente con MediaPipe Pose e Hands (pacchetti già nel repository) in Chromium
// headless (Playwright di tools/e2e). Niente Python: i modelli girano nella pagina come nel gioco (stesso hands.js /
// pose.js serviti da node_modules), un fotogramma alla volta, in ordine, così il tracciamento tra fotogrammi funziona.
//
//   ffmpeg -i gesti-video.mp4 -vf scale=540:960 -q:v 2 -start_number 0 frames/f%04d.jpg
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/video/estrai-posa.mjs --frames=<cartella> --out=<file.json>
//        [--from=0 --to=1280 | --ranges=30-150,225-360] [--pose=2] [--hands=1] [--port=9671]
//
// Uscita (JSON): per fotogramma i 33 punti di Pose (x, y in pixel dell'immagine; z e visibilità di MediaPipe) e i punti
// «mondo» (m, origine tra le anche), le mani (21 punti, lato dichiarato dal modello, punteggio), e il telefono visto
// come macchia dello schermo acceso (blu) vicino al polso: baricentro, asse lungo (angolo nell'immagine), lunghezze
// lungo i due assi, numero di pixel. Pose e Hands girano in due pagine separate: il caricatore dei file di MediaPipe è
// globale e i due si sovrascrivono (natpf/webcam_body_follow.js).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../..');
const req = createRequire(path.join(GAME, 'package.json'));
const { chromium } = createRequire(path.resolve(GAME, '../tools/e2e/package.json'))('playwright-core');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const FRAMES = path.resolve(arg('frames', '')), OUT = path.resolve(arg('out', 'posa.json'));
const FROM = +arg('from', 0), TO = +arg('to', 1e9), POSE_CX = +arg('pose', 2), HANDS_CX = +arg('hands', 1), PORT = +arg('port', 9671);
// --ranges=30-150,225-360: più tratti di fotogrammi (indici inclusi) nello stesso processo; senza, --from/--to
const RANGES = arg('ranges', '').split(',').filter(Boolean).map(r => r.split('-').map(Number));
const inRange = n => RANGES.length ? RANGES.some(([a, b]) => n >= a && n <= b) : n >= FROM && n <= TO;
const files = fs.readdirSync(FRAMES).filter(f => /^f\d+\.jpg$/.test(f)).sort().filter(f => inRange(+f.slice(1, -4)));
if (!files.length) throw new Error('nessun fotogramma in ' + FRAMES);

const MIME = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.data': 'application/octet-stream', '.tflite': 'application/octet-stream', '.binarypb': 'application/octet-stream', '.jpg': 'image/jpeg', '.html': 'text/html', '.json': 'application/json' };
const MP = { pose: path.dirname(req.resolve('@mediapipe/pose/pose.js')), hands: path.dirname(req.resolve('@mediapipe/hands/hands.js')) };
const server = http.createServer((q, res) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  let file = null;
  if (u.startsWith('/mp/pose/')) file = path.join(MP.pose, u.slice(9));
  else if (u.startsWith('/mp/hands/')) file = path.join(MP.hands, u.slice(10));
  else if (u.startsWith('/frames/')) file = path.join(FRAMES, u.slice(8));
  else if (u === '/' || u === '/index.html'){ res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><meta charset="utf-8"><title>misura</title><canvas id="c"></canvas>'); return; }
  if (!file || !fs.existsSync(file)){ res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const B = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-features=WebAssemblySimd'] });
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);

async function page(){
  const ctx = await B.newContext({ viewport: { width: 600, height: 1000 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => log('pageerror', e.message));
  p.on('console', m => { if (m.type() === 'error') log('console', m.text().slice(0, 200)); });
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  return { ctx, p };
}
const loadScript = (p, src) => p.evaluate(src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('script ' + src)); document.head.appendChild(s); }), src);

// nella pagina: strumenti comuni (disegno del fotogramma, macchia blu dello schermo)
const TOOLS = `
  window.loadFrame = src => new Promise((ok, ko) => { const im = new Image(); im.onload = () => { const c = document.getElementById('c'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d', { willReadFrequently: true }).drawImage(im, 0, 0); ok([c.width, c.height]); }; im.onerror = () => ko(new Error('img ' + src)); im.src = src; });
  // macchia dello schermo acceso: pixel blu brillanti (lo schermo «Pronto» del telefono è blu con un anello verde) in un
  // riquadro attorno a un punto (cx, cy, raggio r px); componente connessa più grande per baricentro e assi principali
  window.blueBlob = (cx, cy, r) => {
    const c = document.getElementById('c'), W = c.width, H = c.height, x0 = Math.max(0, Math.round(cx - r)), y0 = Math.max(0, Math.round(cy - r));
    const w = Math.min(W, Math.round(cx + r)) - x0, h = Math.min(H, Math.round(cy + r)) - y0;
    if (w <= 0 || h <= 0) return null;
    const d = c.getContext('2d', { willReadFrequently: true }).getImageData(x0, y0, w, h).data, m = new Uint8Array(w*h);
    let n = 0;
    for (let i = 0; i < w*h; i++){ const R = d[4*i], G = d[4*i + 1], Bl = d[4*i + 2];
      // blu dello schermo «Pronto» (misurato sui fotogrammi: media (57, 103, 195), B fino a 255 con R ≤ 100) contro i
      // banner blu del fondo (medie (90, 110, 154) e (68, 87, 119), righe chiare con R alto): B ≥ 165, R ≤ 100, B − G ≥ 55;
      // oppure il verde-ciano dell'anello (G alto, R basso)
      if ((Bl >= 165 && R <= 100 && Bl - G >= 55) || (G >= 160 && R <= 110 && G - R >= 70)){ m[i] = 1; n++; } }
    if (n < 12) return null;
    // componenti connesse (4-vicini), la più grande
    const lab = new Int32Array(w*h).fill(-1); let best = null, k = 0;
    const stack = [];
    for (let s = 0; s < w*h; s++){ if (!m[s] || lab[s] >= 0) continue;
      let cnt = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, minx = 1e9, maxx = -1, miny = 1e9, maxy = -1; stack.push(s); lab[s] = k;
      while (stack.length){ const i = stack.pop(); const x = i % w, y = (i - x)/w; cnt++; sx += x; sy += y; sxx += x*x; syy += y*y; sxy += x*y;
        if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
        const nb = [i - 1, i + 1, i - w, i + w]; if (x === 0) nb[0] = -1; if (x === w - 1) nb[1] = -1;
        for (const j of nb) if (j >= 0 && j < w*h && m[j] && lab[j] < 0){ lab[j] = k; stack.push(j); } }
      if (!best || cnt > best.n){ const mx = sx/cnt, my = sy/cnt, vxx = sxx/cnt - mx*mx, vyy = syy/cnt - my*my, vxy = sxy/cnt - mx*my;
        const tr = vxx + vyy, det = vxx*vyy - vxy*vxy, disc = Math.sqrt(Math.max(0, tr*tr/4 - det)), l1 = tr/2 + disc, l2 = Math.max(0, tr/2 - disc);
        // asse maggiore: angolo nell'immagine (gradi, 0 = verso destra, positivo verso il basso come y dell'immagine)
        const ang = Math.atan2(l1 - vxx, vxy)*180/Math.PI;
        best = { n: cnt, cx: x0 + mx, cy: y0 + my, ang, len1: 4*Math.sqrt(l1), len2: 4*Math.sqrt(l2), box: [x0 + minx, y0 + miny, x0 + maxx, y0 + maxy] }; }
      k++; }
    return best;
  };
`;

const out = { source: 'gesti-video.mp4 (1080×1920, 30 fps) → fotogrammi 540×960', fps: 30, width: null, height: null, pose: { modelComplexity: POSE_CX }, hands: { modelComplexity: HANDS_CX }, frames: [] };
const byIdx = new Map();
const frameOf = f => { const n = +f.slice(1, -4); if (!byIdx.has(n)){ const o = { i: n, t: +(n/30).toFixed(4), file: f }; byIdx.set(n, o); out.frames.push(o); } return byIdx.get(n); };

// ---- Pose (e telefono) ----
{
  const { ctx, p } = await page();
  await p.evaluate(TOOLS);
  await loadScript(p, '/mp/pose/pose.js');
  await p.evaluate(async cx => {
    const pose = new window.Pose({ locateFile: f => '/mp/pose/' + f });
    pose.setOptions({ modelComplexity: cx, smoothLandmarks: false, enableSegmentation: false, minDetectionConfidence: .5, minTrackingConfidence: .5 });
    window.__last = null; pose.onResults(r => { window.__last = r; });
    await pose.initialize(); window.__pose = pose;
  }, POSE_CX);
  log('Pose pronto, complessità', POSE_CX, '·', files.length, 'fotogrammi');
  let t0 = Date.now();
  for (let k = 0; k < files.length; k++){
    const f = files[k], o = frameOf(f);
    const r = await p.evaluate(async src => {
      const [w, h] = await window.loadFrame(src);
      window.__last = null;
      const t = performance.now(); await window.__pose.send({ image: document.getElementById('c') }); const ms = performance.now() - t;
      const L = window.__last;
      const lm = L?.poseLandmarks ? L.poseLandmarks.map(q => [+(q.x*w).toFixed(2), +(q.y*h).toFixed(2), +(q.z*w).toFixed(2), +q.visibility.toFixed(3)]) : null;
      const wl = L?.poseWorldLandmarks ? L.poseWorldLandmarks.map(q => [+q.x.toFixed(4), +q.y.toFixed(4), +q.z.toFixed(4), +q.visibility.toFixed(3)]) : null;
      // telefono: macchia blu attorno ai due polsi (15 sinistro, 16 destro; raggio 0,1 h ≈ 100 px: il telefono è ~50 px a
      // questa scala) e, senza polsi, al centro dell'immagine (presa in primo piano)
      let phone = null;
      if (lm){ const cands = [16, 15].map(i => { const b = window.blueBlob(lm[i][0], lm[i][1], .1*h); return b && { ...b, nearWrist: i, distWrist: +Math.hypot(b.cx - lm[i][0], b.cy - lm[i][1]).toFixed(1) }; }).filter(Boolean);
        phone = cands.sort((a, b) => a.distWrist - b.distWrist)[0] || null; }
      if (!phone){ const b = window.blueBlob(w/2, h/2, Math.max(w, h)); if (b && b.n >= 40) phone = { ...b, nearWrist: null }; }
      if (phone) for (const k of ['cx', 'cy', 'ang', 'len1', 'len2']) phone[k] = +phone[k].toFixed(2);
      return { w, h, ms: +ms.toFixed(1), lm, wl, phone };
    }, '/frames/' + f);
    out.width = r.w; out.height = r.h;
    o.pose = r.lm; o.poseWorld = r.wl; o.poseMs = r.ms; o.phone = r.phone;
    if (k % 50 === 0 || k === files.length - 1) log(`pose ${k + 1}/${files.length} (${f}) ${r.ms} ms, telefono ${r.phone ? r.phone.n + ' px' : '—'} · ${((Date.now() - t0)/1000).toFixed(0)} s`);
  }
  await ctx.close();
}

// ---- Hands ----
{
  const { ctx, p } = await page();
  await p.evaluate(TOOLS);
  await loadScript(p, '/mp/hands/hands.js');
  await p.evaluate(async cx => {
    const hands = new window.Hands({ locateFile: f => '/mp/hands/' + f });
    hands.setOptions({ maxNumHands: 2, modelComplexity: cx, minDetectionConfidence: .3, minTrackingConfidence: .3 });
    window.__last = null; hands.onResults(r => { window.__last = r; });
    await hands.initialize(); window.__hands = hands;
  }, HANDS_CX);
  log('Hands pronto, complessità', HANDS_CX);
  let t0 = Date.now();
  for (let k = 0; k < files.length; k++){
    const f = files[k], o = frameOf(f);
    const r = await p.evaluate(async src => {
      const [w, h] = await window.loadFrame(src);
      window.__last = null;
      const t = performance.now(); await window.__hands.send({ image: document.getElementById('c') }); const ms = performance.now() - t;
      const L = window.__last;
      const hands = (L?.multiHandLandmarks || []).map((pts, i) => ({
        label: L.multiHandedness?.[i]?.label || null, score: +(L.multiHandedness?.[i]?.score ?? 0).toFixed(3),
        lm: pts.map(q => [+(q.x*w).toFixed(2), +(q.y*h).toFixed(2), +(q.z*w).toFixed(2)]),
        world: L.multiHandWorldLandmarks?.[i]?.map(q => [+q.x.toFixed(4), +q.y.toFixed(4), +q.z.toFixed(4)]) || null }));
      return { ms: +ms.toFixed(1), hands };
    }, '/frames/' + f);
    o.hands = r.hands; o.handsMs = r.ms;
    if (k % 50 === 0 || k === files.length - 1) log(`hands ${k + 1}/${files.length} (${f}) ${r.ms} ms, mani ${r.hands.length} · ${((Date.now() - t0)/1000).toFixed(0)} s`);
  }
  await ctx.close();
}
await B.close(); server.close();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
log('scritto', OUT, out.frames.length, 'fotogrammi');
