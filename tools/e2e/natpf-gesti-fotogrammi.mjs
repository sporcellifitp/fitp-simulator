// NATPF motore base (natpf-tennis/): fogli di controllo visivo dell'animazione dei gesti del tutorial (B9, ramo C;
// docs/b9/giudizio-animazione.md §5.6.2, nota docs/b9/animazione-c.md). Per ogni scheda (11 più incrociato e
// lungolinea) i momenti chiave disegnati da natpf_gesture_demo.js a 640×400 (modale), 448×280 (metà dello stesso
// schermo), 200×200 (esercizi, compatta) e 1600×1000 (ledwall), in fogli WebP in docs/b9/img/C-anim-*.webp; e le misure
// della lista di controllo calcolate sullo stesso disegno (telefono di taglio, mano+telefono all'impatto, palla alla
// cima, etichette dentro lo stadio e fuori dal soggetto, testi ≥ 12 px). I fogli vanno GUARDATI da chi integra.
// Più il costo del disegno per fotogramma a 640×400 (Chromium senza GPU, opzioni predefinite).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-gesti-fotogrammi.mjs   (GAME_PORT, OUT=cartella dei fogli)
//   SOLO=640x400 limita alle misure date; NOFOGLI=1 solo misure
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3141);
const OUT = process.env.OUT || path.resolve(here, '../../docs/b9/img'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, i = '') => { results.push(ok); console.log((ok ? 'OK  ' : 'KO  ') + n + (i ? ' — ' + i : '')); };
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/src/natpf/natpf_gesture_pose.js`));

// Chromium con le opzioni predefinite (senza GPU nel contenitore: il Canvas 2D va su CPU, come su un PC senza scheda)
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
  const D = await import('/src/natpf/natpf_gesture_demo.js'), GP = await import('/src/natpf/natpf_gesture_pose.js');
  window.__D = D; window.__GP = GP; window.__GRIP = new D.NatpfGestureDemo().grip;
});
check('modulo dell\'animazione caricato senza errori', errs.length === 0, errs.join(' | '));

// momenti chiave di ogni scheda (tempo reale del gesto)
const MOMENTS = await p.evaluate(() => {
  const GP = window.__GP, out = {};
  for (const id of GP.POSE_IDS){
    const P = GP.gesturePlan(id), T = P.T;
    if (id === 'grip') out[id] = [[1.5, 'Come la vedi tu'], [6, 'Di lato'], [3.75, 'Giro della camera']];
    else if (id === 'ready') out[id] = [[1, 'Ferma']];
    else if (P.kind === 'serve') out[id] = [[T.hold + .5, 'Carica'], [T.tossPeak, 'Lancio (palla lasciata)'], [T.tossEnd, 'Fine del lancio'], [T.hitStart, 'Braccio in alto'], [P.contact, 'Impatto'], [T.end + .02, 'Fine']];
    // «Fine»: la posa chiave della fine dell'accompagnamento (B13: tutte le articolazioni ferme, P.keys)
    else out[id] = [[T.inv, 'Carica'], [(T.inv + P.contact)/2, 'Colpo'], [P.contact, 'Impatto'], [P.keys.find(k => k.id === 'fine')?.t ?? T.end + .02, 'Fine'], [(T.back + T.home)/2, 'Ritorno']];
  }
  return out;
});

// misure della lista di controllo su un fotogramma (stesso disegno del gioco)
async function frameInfo(id, t, W, H, hand = 'right'){
  return p.evaluate(({ id, t, W, H, hand }) => {
    const GP = window.__GP, D = window.__D, st = document.getElementById('st');
    const d = window.__demo ||= new D.NatpfGestureDemo();
    st.style.width = W + 'px'; st.style.height = H + 'px'; d.mount(st); d.setSize(W, H); d.play(id, { hand }); d.show(t, { rate: 1 });
    const info = d.info, cam = info.cam, pose = info.pose, R = hand === 'left' ? { pos: GP.mirrorPos(pose.pos), q: GP.mirrorQ(pose.q) } : pose;
    const n = GP.qrot(R.q, [0, 0, 1]), view = GP.norm(GP.sub(cam.eye, R.pos)), edge = Math.asin(Math.min(1, Math.abs(GP.dot(n, view))))*180/Math.PI;
    const tip = cam.p(GP.add(R.pos, GP.qrot(R.q, [0, GP.PHONE.h/2, 0]))), base = cam.p(GP.add(R.pos, GP.qrot(R.q, [0, -GP.PHONE.h/2, 0])));
    const F = info.figure, dpr = d.st.dpr, fr = F ? { x0: F.rect.x/dpr, y0: F.rect.y/dpr, x1: (F.rect.x + F.rect.w)/dpr, y1: (F.rect.y + F.rect.h)/dpr } : null;
    // palla: distanza dalla cima del telefono (bordo alto) in raggi, nello spazio
    let ballTip = null;
    if (info.ball){ const l = GP.qrot(GP.qconj(R.q), GP.sub(info.ball, R.pos)), dx = Math.max(0, Math.abs(l[0]) - GP.PHONE.w/2), dy = GP.PHONE.h/2 - l[1], dz = Math.abs(l[2]); ballTip = (Math.hypot(dx, Math.max(0, dy), dz) - GP.BALL_R)/GP.BALL_R; }
    const labels = (info.ghosts || []).filter(g => g.labelBox).map(g => g.labelBox);
    const inStage = labels.every(b => b.x0 >= 0 && b.y0 >= 0 && b.x0 + b.w <= W && b.y0 + b.h <= H);
    // sovrapposizione delle etichette con il soggetto vivo (frazione dell'etichetta dentro la sagoma vera del telefono e del palmo,
    // su una griglia di 13×5 punti)
    const polys = [F?.phoneHull, F?.palmHull].filter(Boolean), in1 = (P, x, y) => { let k = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++){ const a = P[i], b = P[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x)*(y - a.y)/(b.y - a.y) + a.x) k = !k; } return k; };
    const inP = (x, y) => polys.some(P => in1(P, x, y));
    const over = labels.reduce((m, b) => { let n = 0; for (let i = 0; i <= 12; i++) for (let j = 0; j <= 4; j++) if (inP(b.x0 + b.w*i/12, b.y0 + b.h*j/4)) n++; return Math.max(m, n/65); }, 0);
    return { label: pose.label, phase: pose.phase, edge, phoneLen: Math.hypot(tip.x - base.x, tip.y - base.y), subjectH: fr ? (Math.min(H, fr.y1) - Math.max(0, fr.y0))/H : null, ballTip, labelsIn: inStage, labelOver: over, compact: d.compact, ms: 0 };
  }, { id, t, W, H, hand });
}

// foglio: righe = schede, colonne = momenti; ogni cella il canvas vero, con la didascalia sopra
async function sheet(name, rows, W, H, scale = 1){
  const cellW = Math.round(W*scale), cellH = Math.round(H*scale), cap = 22, cols = Math.max(...rows.map(r => r.moments.length));
  const url = await p.evaluate(async ({ rows, W, H, cellW, cellH, cap, cols }) => {
    const D = window.__D, st = document.getElementById('st'), d = window.__demo ||= new D.NatpfGestureDemo();
    const out = document.createElement('canvas'); out.width = cols*(cellW + 6) + 6; out.height = rows.length*(cellH + cap + 6) + 6;
    const o = out.getContext('2d'); o.fillStyle = '#0b0f1a'; o.fillRect(0, 0, out.width, out.height);
    st.style.width = W + 'px'; st.style.height = H + 'px'; d.mount(st); d.setSize(W, H);
    rows.forEach((r, i) => {
      d.grip = r.grip || window.__GRIP; d.play(r.id, { hand: r.hand || 'right' });
      r.moments.forEach(([t, txt], j) => {
        d.show(t, { rate: 1 });
        const x = 6 + j*(cellW + 6), y = 6 + i*(cellH + cap + 6);
        o.fillStyle = '#dfe6f7'; o.font = '600 14px Barlow, sans-serif'; o.textBaseline = 'top'; o.fillText(`${r.title} · ${txt} (${t.toFixed(2)} s)`, x, y + 3);
        o.drawImage(d.canvas, x, y + cap, cellW, cellH);
      });
    });
    // qualità scelta perché il foglio resti sotto i 150 KB
    let q = .86, url = out.toDataURL('image/webp', q);
    while (url.length*.75 > 146_000 && q > .2){ q -= .06; url = out.toDataURL('image/webp', q); }
    return url;
  }, { rows, W, H, cellW, cellH, cap, cols });
  const buf = Buffer.from(url.split(',')[1], 'base64'), file = path.join(OUT, `C-anim-${name}.webp`);
  writeFileSync(file, buf);
  check(`foglio ${path.basename(file)} ≤ 150 KB`, buf.length <= 150_000, `${(buf.length/1024).toFixed(0)} KB`);
}

const TITLES = { grip: 'Presa', ready: 'Posizione', forehand: 'Dritto', backhand: 'Rovescio', serve: 'Servizio', flat: 'Piatto', lob: 'Pallonetto', drop: 'Palla corta', slice: 'Tagliato', smash: 'Schiacciata', volley: 'Volée', cross: 'Incrociato', line: 'Lungolinea' };
const row = (id, hand = 'right', pick = null) => ({ id, hand, title: TITLES[id] + (hand === 'left' ? ' (mancino)' : ''), moments: pick ? MOMENTS[id].filter((_, i) => pick.includes(i)) : MOMENTS[id] });
const SIZES = (process.env.SOLO || '640x400,448x280,200x200,1600x1000').split(',').map(s => s.split('x').map(Number));

// il colpo resta nel quadro (brief §5.3): tempo con la cima del telefono fuori dallo stadio su tutto il ciclo, con la
// palla fuori vicino al contatto (−100…+50 ms: la palla arriva da 9 m e riparte veloce; servizio dal lancio al contatto)
// e punti della freccia della parte veloce che contiene il contatto fuori dallo stadio
async function inFrame(W, H){
  return p.evaluate(({ W, H }) => {
    const D = window.__D, GP = window.__GP, out = [];
    for (const id of GP.POSE_IDS){
      const P = GP.gesturePlan(id); if (P.still) continue;
      let tipOut = 0, ballOut = 0, arrowOut = 0, arrowN = 0;
      const M = D.motion(id), off = q => q.x < 0 || q.x > W || q.y < 0 || q.y > H*(W < D.COMPACT_W ? 1 : .8);
      for (let t = 0; t < P.total; t += 1/60){
        const cam = D.cameraAt(id, t, { W, H }), pose = GP.gesturePose(id, t), tip = cam.p(GP.add(pose.pos, GP.qrot(pose.q, [0, GP.PHONE.h/2, 0])));
        if (off(tip)) tipOut += 1000/60;
        const b = GP.gestureBall(id, t), near = P.kind === 'serve' ? t >= P.T.tossPeak && t <= P.contact + .05 : t >= P.contact - .1 && t <= P.contact + .05;
        if (b && near && off(cam.p(b))) ballOut += 1000/60;
        if (Math.abs(t - P.contact) < 1/120) for (const a of M.arrows.filter(a => a.t0 <= P.contact && a.t1 >= P.contact)) for (const q of a.pts){ arrowN++; if (off(cam.p(q))) arrowOut++; }
      }
      out.push({ id, tipOut, ballOut, arrowOut: arrowOut/Math.max(1, arrowN) });
    }
    return out;
  }, { W, H });
}

// misure della lista (§5.6.2) su tutte le schede e le misure
const KEY = { stroke: ['Carica', 'Impatto', 'Fine'], serve: ['Lancio (palla lasciata)', 'Braccio in alto', 'Impatto'] };
for (const [W, H] of SIZES){
  const bad = [], minLen = { v: Infinity, at: '' }, minSub = { v: Infinity, at: '' };
  for (const id of Object.keys(MOMENTS)) for (const hand of ['right', 'left']) for (const [t, txt] of MOMENTS[id]){
    const f = await frameInfo(id, t, W, H, hand), tag = `${id} ${hand} ${txt}`;
    const key = (KEY.stroke.includes(txt) && !['grip', 'ready'].includes(id) && id !== 'serve') || (id === 'serve' && KEY.serve.includes(txt)) || id === 'grip' && txt !== 'Giro della camera';
    if (key && f.edge < 25) bad.push(`${tag}: telefono di taglio (${f.edge.toFixed(0)}°)`);
    if (txt === 'Impatto'){
      if (f.label !== 'Impatto') bad.push(`${tag}: scritto «${f.label}»`);
      if (f.ballTip == null || f.ballTip > 1) bad.push(`${tag}: palla a ${f.ballTip?.toFixed(2)} raggi dalla cima`);
      if (f.subjectH < .28) bad.push(`${tag}: mano+telefono ${(f.subjectH*100).toFixed(0)}% dell'altezza`);
      if (f.subjectH < minSub.v){ minSub.v = f.subjectH; minSub.at = tag; }
      if (f.phoneLen < minLen.v){ minLen.v = f.phoneLen; minLen.at = tag; }
      if (W === 448 && f.phoneLen < 60) bad.push(`${tag}: telefono lungo ${f.phoneLen.toFixed(0)} px`);
    }
    if (!f.labelsIn) bad.push(`${tag}: etichetta fuori dallo stadio`);
    if (f.labelOver > .1) bad.push(`${tag}: etichetta sul telefono o sulla mano vivi (${(f.labelOver*100).toFixed(0)}%)`);
  }
  const fr = await inFrame(W, H), outB = fr.filter(r => r.tipOut > 100.001 || r.ballOut > 100.001 || r.arrowOut > .1);
  check(`${W}×${H}: il colpo resta nel quadro (cima e palla fuori ≤ 100 ms, freccia fuori ≤ 10%)`, outB.length === 0,
    fr.map(r => `${r.id} ${Math.round(r.tipOut)}/${Math.round(r.ballOut)} ms ${Math.round(r.arrowOut*100)}%`).join(', '));
  check(`${W}×${H}: lista di controllo (telefono non di taglio ≥ 25°, «Impatto», palla ≤ 1 raggio dalla cima, mano+telefono ≥ 28%, etichette)`, bad.length === 0,
    `impatto: telefono più corto ${minLen.v.toFixed(0)} px (${minLen.at}), soggetto più piccolo ${(minSub.v*100).toFixed(0)}% (${minSub.at})${bad.length ? '\n    ' + bad.join('\n    ') : ''}`);
}

if (!process.env.NOFOGLI){
  for (const [W, H] of SIZES){
    const sc = W >= 1000 ? .5 : 1, nm = `${W}x${H}`;
    const pickS = W >= 1000 ? [0, 2, 3] : null, pickV = W >= 1000 ? [1, 3, 4] : null;
    await sheet(`${nm}-1-colpi`, ['forehand', 'backhand', 'flat', 'slice'].map(id => row(id, 'right', pickS)), W, H, sc);
    await sheet(`${nm}-2-colpi`, ['lob', 'drop', 'smash', 'volley'].map(id => row(id, 'right', pickS)), W, H, sc);
    await sheet(`${nm}-3-servizio-presa`, [row('serve', 'right', pickV ? [1, 3, 4] : null), row('grip'), row('ready'), row('cross', 'right', [0, 2, 3]), row('line', 'right', [0, 2, 3])], W, H, sc);
    await sheet(`${nm}-4-mancino-martello`, [row('forehand', 'left', [0, 2, 3]), row('serve', 'left', [1, 3, 4]), row('grip', 'left', [0, 1]), { ...row('grip', 'right', [0, 1]), grip: 'martello', title: 'Presa a martello (rollback)' }, { ...row('forehand', 'right', [0, 2, 3]), grip: 'martello', title: 'Dritto a martello (rollback)' }], W, H, sc);
  }
}

// costo del disegno a 640×400 (densità 1 e 2): media su un ciclo di ciascuna scheda dopo un ciclo di riscaldamento
// (tabelle del moto, fantasmi e fondo già pronti). «Registrazione»: il tempo del codice di disegno (brief §5.6.3);
// «con la rasterizzazione»: getImageData dopo ogni fotogramma obbliga il canvas su CPU a riempire davvero i pixel
for (const dpr of [1, 2]){
  const c2 = await browser.newContext({ viewport: { width: 900, height: 600 }, deviceScaleFactor: dpr });
  const q = await c2.newPage();
  await q.goto(`http://127.0.0.1:${GAME_PORT}/src/natpf/natpf_gesture_pose.js`);
  const c = await q.evaluate(async () => {
    document.documentElement.innerHTML = '<body style="margin:0"><div id="st" style="width:640px;height:400px"></div></body>';
    const D = await import('/src/natpf/natpf_gesture_demo.js'), GP = await import('/src/natpf/natpf_gesture_pose.js');
    const d = new D.NatpfGestureDemo(); d.mount(document.getElementById('st')); d.setSize(640, 400);
    const run = flush => { let worst = 0, sum = 0, n = 0;
      for (const id of GP.POSE_IDS){
        d.play(id, { hand: 'right' }); d.stop(); const P = GP.gesturePlan(id);
        for (let i = 0; i < 120; i++) d.render(i/120*P.total);
        for (let i = 0; i < 120; i++){ const t0 = performance.now(); d.render(i/120*P.total); if (flush) d.ctx.getImageData(0, 0, 1, 1); const ms = performance.now() - t0; sum += ms; n++; worst = Math.max(worst, ms); }
      }
      return { mean: sum/n, worst }; };
    return { rec: run(false), full: run(true), real: d.st.dpr };
  });
  // densità 2 (schermi HiDPI, che su un PC vero hanno la GPU): gli strati dell'avambraccio e della mano si rasterizzano
  // già nella registrazione (drawImage di un canvas), quindi crescono con i pixel: si chiede metà fotogramma (8 ms)
  const rl = c.real === 1 ? 4 : 8;
  check(`640×400 densità ${c.real}: registrazione del disegno ≤ ${rl} ms per fotogramma (media su tutte le schede)`, c.rec.mean <= rl, `media ${c.rec.mean.toFixed(2)} ms, peggiore ${c.rec.worst.toFixed(1)} ms`);
  const lim = c.real === 1 ? 4 : Infinity;
  check(`640×400 densità ${c.real}: con la rasterizzazione su CPU${c.real === 1 ? ' ≤ 4 ms' : ' (solo misura)'}`, c.full.mean <= lim, `media ${c.full.mean.toFixed(2)} ms, peggiore ${c.full.worst.toFixed(1)} ms`);
  await c2.close();
}
check('nessun errore nella pagina', errs.length === 0, errs.join(' | '));
await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} verifiche superate`);
if (results.some(r => !r)) process.exitCode = 1;
process.exit();
