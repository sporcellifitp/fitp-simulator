// NATPF motore base (natpf-tennis/): CONFRONTO fotogramma per fotogramma tra il video dell'utente (08/11/2026, misurato nel
// passo A: docs/b17/gesti-video.json) e l'animazione dei gesti (natpf_gesture_demo.js) allo stesso istante del colpo
// (B17.1 passo C, piano docs/b17/analisi-e-piano.md §1.4 punto 5). Per dritto, rovescio a due mani, servizio, tagliato di
// dritto e di rovescio: ≥ 8 istanti (fermo, carica, tre nel colpo, impatto, accompagnamento, fine, dopo), tre colonne:
//   1. il fotogramma del video SPECCHIATO come la camera frontale dell'animazione (chi guarda vede il proprio braccio
//      destro a destra; nel video originale la destra di chi gioca sta a sinistra del quadro);
//   2. l'animazione con le coreografie DAL VIDEO (gesturePlan set 'video': camera frontale a tre quarti specchiata, profilo
//      per il servizio) a 640×400;
//   3. l'animazione del tutorial di OGGI (coreografie B13/B14, camera da dietro) allo stesso istante del colpo: è ciò che
//      l'utente vede finché non decide tra le scelte di docs/b17/posa-dal-video.md §4.
// L'istante del video → istante dell'animazione per tratti lineari tra le pose chiave (inizio → inizio della preparazione,
// carica → carica, impatto → impatto, fine → fine; servizio anche arrivo in alto → fine della salita). Misure per riga:
// polso nel campo (video ricostruito vs animazione), telefono di taglio e schermo in vista nell'animazione, fase scritta.
// Fogli docs/b17/img/VC-<colpo>.webp, da GUARDARE. Il video e i fotogrammi restano fuori dal repository.
//   cd tools/e2e && FRAMES=/cartella/frames30 CHROMIUM_PATH=/percorso/chrome GAME_PORT=3651 node natpf-gesti-video-confronto.mjs
//   IDS=forehand,serve  OUT=/cartella  SCALE=.75
// PREFIX=O (B17.1 passo B2): fogli docs/b17/img/O-<colpo>.webp a TRE colonne, video specchiato | posa ottimizzata (le
// coreografie di CHOREO_VIDEO trovate dall'ottimizzatore, scripts/video/ottimizza.mjs) con la camera della scheda | la stessa
// posa con una camera FISSA frontale a corpo intero come quella del video (specchiata, il polso del video segnato con una
// croce gialla: correzioni della revisione, la camera della scheda nascondeva la forma), stessi istanti del colpo
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3651);
const OUT = process.env.OUT || path.resolve(here, '../../docs/b17/img'); mkdirSync(OUT, { recursive: true });
const FRAMES = process.env.FRAMES || '';
const SCALE = +(process.env.SCALE || .75);
const PREFIX = process.env.PREFIX || 'VC', TWO = PREFIX === 'O';
const DATA = JSON.parse(readFileSync(path.resolve(here, '../../docs/b17/gesti-video.json'), 'utf8'));
const colpi = Object.fromEntries(DATA.colpi.map(c => [c.id, c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, i = '') => { results.push(ok); console.log((ok ? 'OK  ' : 'KO  ') + n + (i ? ' — ' + i : '')); };
check('fotogrammi del video disponibili (FRAMES)', !!FRAMES && existsSync(path.join(FRAMES, 'f0311.jpg')), FRAMES || 'cartella non indicata: i fogli avranno la colonna del video vuota');

// colpi confrontati: scheda dell'animazione ↔ tratto del video; i tempi del video dal json
const STROKES = (process.env.IDS ? process.env.IDS.split(',') : ['forehand', 'backhand', 'serve', 'slice', 'sliceBackhand']).map(id => ({
  id, src: { forehand: 'forehand', backhand: 'backhand', serve: 'serve2', slice: 'slice2', sliceBackhand: 'slice1' }[id],
  title: { forehand: 'Dritto', backhand: 'Rovescio a due mani', serve: 'Servizio', slice: 'Tagliato di dritto', sliceBackhand: 'Tagliato di rovescio' }[id] }));

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
    body { margin: 0; background: #000; } #st { position: absolute; left: 0; top: 0; width: 640px; height: 400px; }
    .gesture-demo-canvas { display: block; width: 100%; height: 100%; }</style></head><body><div id="st"></div></body>`;
  await Promise.all(['800 italic 20px "Barlow Condensed"', '500 12px Barlow', '600 12px Barlow', '700 12px Barlow'].map(f => document.fonts.load(f)));
  window.__D = await import('/src/natpf/natpf_gesture_demo.js'); window.__GP = await import('/src/natpf/natpf_gesture_pose.js');
  const d = window.__demo = new window.__D.NatpfGestureDemo(); d.mount(document.getElementById('st')); d.setSize(640, 400);
});
check('modulo dell\'animazione caricato senza errori', errs.length === 0, errs.join(' | '));

// istanti del video per colpo (s) e ancore video → animazione (per i due insiemi)
function instantsOf(st){
  const c = colpi[st.src], T = c.tempi;
  if (st.id === 'serve'){
    const alto = c.battuta.t_arrivo_in_alto;
    const seg = (a, b, u) => a + (b - a)*u;
    return { times: [T.inizio - .3, T.carica, seg(T.carica, alto, .5), alto, seg(alto, T.impatto, .33), seg(alto, T.impatto, .66), T.impatto, seg(T.impatto, T.fine, .5), T.fine, T.fine + .4],
      anchors: { inizio: T.inizio, carica: T.carica, alto, impatto: T.impatto, fine: T.fine } };
  }
  const seg = (a, b, u) => a + (b - a)*u;
  return { times: [T.inizio - .3, T.inizio, T.carica, seg(T.carica, T.impatto, .25), seg(T.carica, T.impatto, .5), seg(T.carica, T.impatto, .75), T.impatto, seg(T.impatto, T.fine, .5), T.fine, T.fine + .3],
    anchors: { inizio: T.inizio, carica: T.carica, impatto: T.impatto, fine: T.fine } };
}
// campione del json più vicino a un istante (polso ricostruito nel campo, al netto del bacino)
function sampleAt(st, t){
  const c = colpi[st.src]; let best = null;
  for (const s of c.campioni){ if (!best || Math.abs(s.t - t) < Math.abs(best.t - t)) best = s; }
  if (!best || Math.abs(best.t - t) > .04) return null;
  const b = best.bacino_dx_dz || [0, 0];
  return { t: best.t, i: best.i, W: [best.W[0] - b[0], best.W[1], best.W[2] - b[1]], E: [best.E[0] - b[0], best.E[1], best.E[2] - b[1]], S: [best.S[0] - b[0], best.S[1], best.S[2] - b[1]], tau: best.j?.tau, omega: best.omega_gs };
}
const frameUrl = t => { if (!FRAMES) return null; const f = path.join(FRAMES, `f${String(Math.round(t*30)).padStart(4, '0')}.jpg`); return existsSync(f) ? 'data:image/jpeg;base64,' + readFileSync(f).toString('base64') : null; };

// un colpo: righe = istanti; colonne = video specchiato (ritaglio 540×600 → 360×400), animazione dal video, tutorial di oggi
async function confronto(st){
  const { times, anchors } = instantsOf(st);
  const frames = times.map(frameUrl);
  const samples = times.map(t => sampleAt(st, t));
  const r = await p.evaluate(async ({ id, title, times, frames, samples, anchors, scale, two }) => {
    const D = window.__D, GP = window.__GP, d = window.__demo;
    // ancore dell'animazione per insieme
    const planAnchors = set => {
      const P = GP.gesturePlan(id, { set }), T = P.T, fine = P.keys.find(k => k.id === 'fine')?.t ?? T.back - .004;
      return P.kind === 'serve' ? { inizio: T.hold, carica: T.load, alto: T.tossEnd, impatto: P.contact, fine: T.back } : { inizio: T.hold, carica: T.inv, impatto: P.contact, fine };
    };
    const mapT = (t, A, B) => {
      const ks = Object.keys(A).filter(k => B[k] != null).sort((x, y) => A[x] - A[y]);
      if (t <= A[ks[0]]) return Math.max(0, B[ks[0]] - (A[ks[0]] - t));
      for (let i = 1; i < ks.length; i++) if (t <= A[ks[i]]){ const u = (t - A[ks[i - 1]])/(A[ks[i]] - A[ks[i - 1]]); return B[ks[i - 1]] + (B[ks[i]] - B[ks[i - 1]])*u; }
      return B[ks[ks.length - 1]] + (t - A[ks[ks.length - 1]]);
    };
    const AV = planAnchors('video'), AL = planAnchors('legacy');
    const load = src => new Promise(res => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    const imgs = await Promise.all(frames.map(load));
    const cw = Math.round(640*scale), ch = Math.round(400*scale), vw = Math.round(360*scale), cap = 24, gap = 6;
    const out = document.createElement('canvas'); out.width = vw + 2*cw + 4*gap; out.height = 44 + times.length*(ch + cap + gap);
    // camera fissa frontale (fogli O): davanti a chi gioca a 3,4 m, all'altezza del bacino, corpo intero, specchiata come il video
    const fixedCam = (W, H) => { const eye = [.05, 1.0, -3.4], target = [.05, 1.0, 0], fw = GP.norm(GP.sub(target, eye)), rr = GP.norm(GP.cross(fw, [0, 1, 0])), u = GP.cross(rr, fw), f = H*3.4/2.15, cx = W/2, cy = H/2;
      const cam = { eye, target, fw, r: rr, u, f, cx, cy, mirror: true, W, H };
      cam.depth = P => GP.dot(GP.sub(P, eye), fw);
      cam.p = P => { const dd = GP.sub(P, eye), z = Math.max(.02, GP.dot(dd, fw)), x = cx + f*GP.dot(dd, rr)/z; return { x: W - x, y: cy - f*GP.dot(dd, u)/z, z }; };
      cam.rad = (P, q) => cam.f*q/Math.max(.02, cam.depth(P)); return cam; };
    const o = out.getContext('2d'); o.fillStyle = '#0b0f1a'; o.fillRect(0, 0, out.width, out.height);
    o.fillStyle = '#f4f6fc'; o.font = '700 18px Barlow, sans-serif'; o.textBaseline = 'top';
    o.fillText(two ? `${title} · video dell'utente (specchiato) | posa ottimizzata` : `${title} · video dell'utente (specchiato come la camera) · animazione dalle coreografie del video · tutorial di oggi`, gap, 6);
    o.fillStyle = '#9aa7cf'; o.font = '500 12px Barlow, sans-serif';
    o.fillText(two ? 'sinistra: fotogramma 540×960 ritagliato e specchiato · destra: CHOREO_VIDEO (ottimizzatore), presa del video, camera frontale a tre quarti specchiata (servizio: profilo), istante mappato sulle pose chiave' : 'colonna 1: fotogramma 540×960 ritagliato, specchiato (il braccio destro a destra) · colonna 2: gesturePlan set video, camera frontale a tre quarti specchiata (servizio: profilo) · colonna 3: coreografie B13/B14, camera da dietro', gap, 28);
    const rows = [];
    // didascalia tagliata alla larghezza della sua colonna (prima quella del video finiva sopra quella dell'animazione)
    const fit = (text, x, y, w) => { let t = text; if (o.measureText(t).width > w){ while (t.length > 4 && o.measureText(t + '…').width > w) t = t.slice(0, -1); t += '…'; } o.fillText(t, x, y); };
    times.forEach((t, i) => {
      const y = 44 + i*(ch + cap + gap), row = { t };
      // 1. video specchiato
      const im = imgs[i];
      if (im){ o.save(); o.translate(gap + vw, y + cap); o.scale(-1, 1); o.drawImage(im, 0, 30, 540, 600, 0, 0, vw, ch); o.restore(); }
      else { o.fillStyle = '#1a2240'; o.fillRect(gap, y + cap, vw, ch); o.fillStyle = '#9aa7cf'; o.font = '500 12px Barlow'; o.fillText('fotogramma non disponibile', gap + 8, y + cap + 8); }
      const s = samples[i];
      o.fillStyle = '#dfe6f7'; o.font = '600 12px Barlow, sans-serif'; o.textBaseline = 'top';
      fit(`video ${t.toFixed(2)} s · f. ${Math.round(t*30)}${s ? ` · polso (${s.W.map(v => v.toFixed(2)).join('; ')})` : ''}`, gap, y + 4, vw);
      // 2 e 3: animazione
      [['video', AV, gap*2 + vw, two ? 'posa ottimizzata' : 'animazione dal video'], ...(two ? [['video', AV, gap*3 + vw + cw, 'camera fissa frontale', true]] : [['legacy', AL, gap*3 + vw + cw, 'tutorial di oggi']])].forEach(([set, A, x, lab, fixed]) => {
        if (fixed){ d._cam = () => fixedCam(640, 400); } else delete d._cam;
        const ta = mapT(t, anchors, A);
        d.play(id, { hand: 'right', set }); d.show(ta, { rate: 1 });
        const I = d.info, cam = I.cam, pose = I.pose, n = GP.qrot(pose.q, [0, 0, 1]), v = GP.sub(cam.eye, pose.pos);
        const edge = Math.asin(Math.min(1, Math.abs(GP.dot(n, GP.norm(v)))))*180/Math.PI, facing = GP.dot(n, v) > 0;
        const W = pose.chain?.W || pose.pos;
        o.drawImage(d.canvas, x, y + cap, cw, ch);
        if (fixed){
          delete d._cam;
          // polso ricostruito dal video, con la stessa camera: croce gialla
          if (s){ const q = fixedCam(640, 400).p(s.W), k = cw/640, qx = x + q.x*k, qy = y + cap + q.y*k; o.strokeStyle = '#ffe600'; o.lineWidth = 3; o.beginPath(); o.moveTo(qx - 8, qy - 8); o.lineTo(qx + 8, qy + 8); o.moveTo(qx + 8, qy - 8); o.lineTo(qx - 8, qy + 8); o.stroke(); }
          o.fillStyle = '#dfe6f7'; o.font = '600 12px Barlow, sans-serif';
          fit(`${lab} · croce gialla: polso del video${s ? ` · Δ ${(Math.hypot(...GP.sub(W, s.W))*100).toFixed(0)} cm` : ''}`, x, y + 4, cw);
          return;
        }
        o.fillStyle = '#dfe6f7'; o.font = '600 12px Barlow, sans-serif';
        fit(`${lab} · t = ${ta.toFixed(2)} s · ${pose.label || 'fermo'} · polso (${W.map(q => q.toFixed(2)).join('; ')}) · telefono ${edge.toFixed(0)}° ${facing ? 'schermo' : 'dorso'}`, x, y + 4, cw);
        row[set] = { ta, label: pose.label, W, edge, facing, dW: s ? Math.hypot(W[0] - s.W[0], W[1] - s.W[1], W[2] - s.W[2]) : null, dY: s ? W[1] - s.W[1] : null };
      });
      rows.push(row);
    });
    let q = .82, url = out.toDataURL('image/webp', q);
    while (url.length*.75 > 600_000 && q > .3){ q -= .06; url = out.toDataURL('image/webp', q); }
    return { url, rows };
  }, { id: st.id, title: st.title, times, frames, samples, anchors, scale: SCALE, two: TWO });
  const buf = Buffer.from(r.url.split(',')[1], 'base64'), file = path.join(OUT, `${PREFIX}-${st.id}.webp`);
  writeFileSync(file, buf);
  console.log(`\n${st.title}: foglio ${path.basename(file)} (${(buf.length/1024).toFixed(0)} KB)`);
  for (const row of r.rows){
    const f = v => v == null ? '—' : v.toFixed(2);
    console.log(`  video ${row.t.toFixed(2)} s → anim video ${row.video.ta.toFixed(2)} s (${row.video.label || 'fermo'}; polso Δ ${f(row.video.dW)} m, Δy ${f(row.video.dY)}; telefono ${row.video.edge.toFixed(0)}° ${row.video.facing ? 'schermo' : 'dorso'})` + (row.legacy ? ` · tutorial ${row.legacy.ta.toFixed(2)} s (${row.legacy.label || 'fermo'}; polso Δ ${f(row.legacy.dW)} m; telefono ${row.legacy.edge.toFixed(0)}° ${row.legacy.facing ? 'schermo' : 'dorso'})` : ''));
  }
  check(`${st.title}: foglio ≤ 600 KB`, buf.length <= 600_000, `${(buf.length/1024).toFixed(0)} KB`);
  // pose chiave: il polso dell'animazione dal video sta vicino a quello ricostruito dal video (le pose chiave sono risolte
  // sulle posizioni misurate: ≤ 0,12 m; rovescio a due mani e tagliato di rovescio: ricostruzione non attendibile, solo
  // misura). «Impatto» scritto all'istante dell'impatto in tutti e due gli insiemi
  const keyRows = r.rows.filter(row => [anchors.carica, anchors.alto, anchors.impatto, anchors.fine].filter(a => a != null).some(a => Math.abs(row.t - a) < 1e-6));
  // pose chiave del B9 §5.6.2 per il telefono non di taglio: colpi carica/impatto/fine; servizio lancio (= arrivo in alto qui) e impatto
  const edgeRows = st.id === 'serve' ? r.rows.filter(row => [anchors.alto, anchors.impatto].some(a => Math.abs(row.t - a) < 1e-6)) : keyRows;
  const reliable = !['backhand', 'sliceBackhand'].includes(st.id);
  // fogli O (passo B2): le coreografie ottimizzate si allontanano dal video dove la lettura lo chiede, misurato e dichiarato in
  // docs/b17/ottimizzazione.md: fine del tagliato di dritto 0,26 m (più alta e a destra), impatto del servizio 0,12–0,13 m
  const LIM_O = { slice: .27, serve: .13 }, lim = TWO ? (LIM_O[st.id] ?? .12) : .12;
  const far = keyRows.filter(row => row.video.dW != null && row.video.dW > lim);
  check(`${st.title}: polso dell'animazione dal video entro ${lim.toFixed(2).replace('.', ',')} m dal video alle pose chiave${reliable ? '' : ' (solo misura: ricostruzione del video non attendibile)'}${lim > .12 ? ' (LIMITE DICHIARATO, ottimizzazione.md)' : ''}`, !reliable || far.length === 0,
    keyRows.map(row => `${row.t.toFixed(2)} s Δ ${row.video.dW?.toFixed(2) ?? '—'} m`).join(', '));
  const imp = r.rows.find(row => Math.abs(row.t - anchors.impatto) < 1e-6);
  check(`${st.title}: «Impatto» scritto all'istante dell'impatto`, imp.video.label === 'Impatto' && (!imp.legacy || imp.legacy.label === 'Impatto'), `${imp.video.label} / ${imp.legacy?.label ?? '—'}`);
  // telefono mai di taglio nelle pose chiave dell'animazione dal video; limiti dichiarati dove la coreografia dal video non
  // lo permette (misurato: rovescio a due mani all'impatto, dalla ricostruzione a due mani sovrapposte)
  const LIM = { backhand: 'impatto: schermo a 70° dal bersaglio del video nella posa risolta (ricostruzione a due mani sovrapposte, docs/b17/gesti-dal-video.md)' };
  const edgeBad = edgeRows.filter(row => row.video.edge < 25);
  check(`${st.title}: telefono non di taglio (≥ 25°) nelle pose chiave del B9 dell'animazione dal video`, edgeBad.length === 0 || (LIM[st.id] && edgeBad.every(row => Math.abs(row.t - anchors.impatto) < 1e-6)),
    edgeRows.map(row => `${row.t.toFixed(2)} s ${row.video.edge.toFixed(0)}°`).join(', ') + (edgeBad.length && LIM[st.id] ? ` · LIMITE AMMESSO (dichiarato): ${LIM[st.id]}` : ''));
}
for (const st of STROKES) await confronto(st);
check('nessun errore nella pagina', errs.length === 0, errs.join(' | '));
await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} verifiche superate · fogli in ${OUT}`);
if (results.some(r => !r)) process.exitCode = 1;
process.exit();
