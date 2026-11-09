// B17.1 · Fogli di controllo della ricostruzione dal video (docs/b17/img/V-<colpo>.webp): per ogni colpo ≥ 10 fotogrammi
// del video con sopra i punti misurati (Pose in ciano, mano destra di Hands in verde, asse dello schermo in magenta) e la
// catena del gioco riproiettata (arancione), accanto alla ricostruzione 3D vista di fronte (come la camera: la destra di
// chi gioca a sinistra) e di lato (da destra di chi gioca: la rete a sinistra), con la scia del polso sul colpo.
// Vanno GUARDATI: dove lo scheletro è sbagliato si corregge la ricostruzione, non il foglio.
//
//   CHROMIUM_PATH=… node scripts/video/fogli.mjs --dati=docs/b17/gesti-video.json --mp=<mp.json[,…]> --frames=<cartella>
//        --out=docs/b17/img [--solo=forehand,serve1] [--n=12]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../..');
const { chromium } = createRequire(path.resolve(GAME, '../tools/e2e/package.json'))('playwright-core');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const DATI = JSON.parse(fs.readFileSync(path.resolve(arg('dati', '')), 'utf8'));
const FRAMES = path.resolve(arg('frames', '')), OUT = path.resolve(arg('out', 'docs/b17/img')), N = +arg('n', 12), PORT = +arg('port', 9681);
const SOLO = arg('solo', '').split(',').filter(Boolean);
const mp = new Map();
for (const p of arg('mp', '').split(',').filter(Boolean)) for (const f of JSON.parse(fs.readFileSync(path.resolve(p), 'utf8')).frames) mp.set(f.i, f);
fs.mkdirSync(OUT, { recursive: true });

const server = http.createServer((q, res) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/'){ res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><meta charset="utf-8"><title>fogli</title><canvas id="c"></canvas>'); return; }
  const file = u.startsWith('/frames/') ? path.join(FRAMES, u.slice(8)) : null;
  if (!file || !fs.existsSync(file)){ res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': 'image/jpeg' }); fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const B = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await B.newContext({ viewport: { width: 800, height: 600 } });
const page = await ctx.newPage();
page.on('pageerror', e => console.error('pageerror', e.message));
await page.goto(`http://127.0.0.1:${PORT}/`);

// scelta dei fotogrammi: N equidistanti tra inizio − 0,1 e fine + 0,1, con carica, impatto, fine (e lancio) sempre dentro
function pick(stroke){
  const S = stroke.campioni, keys = stroke.pose_chiave;
  if (!S?.length) return [];
  const t0 = stroke.lancio ? Math.min(stroke.tempi.inizio - .1, stroke.lancio.t_picco_mano_sinistra - .3) : stroke.tempi.inizio - .1, t1 = stroke.tempi.fine + .1;
  const want = []; for (let k = 0; k < N; k++) want.push(t0 + (t1 - t0)*k/(N - 1));
  const must = [keys.carica.t, keys.impatto.t, keys.fine.t, ...(stroke.lancio ? [stroke.lancio.t_picco_mano_sinistra] : [])];
  for (const m of must){ let bi = 0; for (let k = 1; k < want.length; k++) if (Math.abs(want[k] - m) < Math.abs(want[bi] - m)) bi = k; want[bi] = m; }
  const near = t => S.reduce((b, s) => Math.abs(s.t - t) < Math.abs(b.t - t) ? s : b, S[0]);
  const chosen = [...new Set(want.map(t => near(t).i))].sort((a, b) => a - b);
  const label = s => s.i === keys.carica.i ? 'CARICA' : s.i === keys.impatto.i ? 'IMPATTO' : s.i === keys.fine.i ? 'FINE' : stroke.lancio && Math.abs(s.t - stroke.lancio.t_picco_mano_sinistra) < .017 ? 'LANCIO' : '';
  return chosen.map(i => { const s = S.find(q => q.i === i); return { s, label: label(s) }; });
}

const CAMERA = DATI.metodo.camera;
const strokes = DATI.colpi.filter(s => !s.errore && (!SOLO.length || SOLO.includes(s.id)));
// presa in primo piano: fotogrammi del video con la mano di Hands (verde) e l'asse dello schermo (magenta), misure 2D
for (const st of strokes.filter(s => s.tipo === 'presa_2d')){
  const rows = st.campioni.filter(r => r.schermo_visto || r.mano_vista);
  const step = Math.max(1, Math.floor(rows.length/N)), chosen = rows.filter((_, k) => k % step === 0).slice(0, N);
  const frames = chosen.map(r => ({ r, mp: mp.get(r.i) || null }));
  if (!frames.length) continue;
  const dataUrl = await page.evaluate(async ({ st, frames, CAMERA }) => {
    const [W, H] = CAMERA.immagine, CW = 270, CH = 480, CAP = 48, PAD = 8, COLS = 4, ROWS = Math.ceil(frames.length/COLS), HEAD = 60;
    const loadImg = src => new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ko(new Error(src)); im.src = src; });
    const cv = document.getElementById('c'); cv.width = COLS*(CW + 2*PAD); cv.height = HEAD + ROWS*(CH + CAP + 2*PAD);
    const g = cv.getContext('2d'); g.fillStyle = '#0b1020'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#fff'; g.font = '700 22px sans-serif'; g.fillText(`${st.label} · video dell’utente, misure 2D (niente corpo per Pose nel primo piano)`, 16, 30);
    g.font = '14px sans-serif'; g.fillStyle = '#9fb3d9'; g.fillText(`verde = mano (Hands: polso, nocche, indice, medio, pollice) · magenta = asse lungo dello schermo acceso · mediane: asse schermo ${st.mediane.schermo_asse_deg}°, dita ${st.mediane.dita_deg}°, schermo−dita ${st.mediane.schermo_meno_dita_deg}°, normale del palmo verso la camera ${st.mediane.normale_palmo_verso_camera}`, 16, 52);
    const imgs = await Promise.all(frames.map(c => loadImg('/frames/f' + String(c.r.i).padStart(4, '0') + '.jpg')));
    const sc = CW/W, line = (a, b, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    frames.forEach((c, k) => {
      const ox = (k % COLS)*(CW + 2*PAD) + PAD, oy = HEAD + Math.floor(k/COLS)*(CH + CAP + 2*PAD) + PAD, T = ([x, y]) => [ox + x*sc, oy + y*sc];
      g.drawImage(imgs[k], 0, 0, W, H, ox, oy, CW, CH);
      const m = c.mp, h = (m?.hands || []).filter(x => x.score >= .5).sort((a, b) => b.score - a.score)[0];
      if (h) for (const [a, b] of [[0, 5], [5, 9], [9, 13], [13, 17], [0, 17], [5, 8], [9, 12], [0, 4], [4, 3], [3, 2]]) line(T(h.lm[a]), T(h.lm[b]), 'rgba(80,255,120,.95)', 2);
      if (m?.phone && m.phone.n >= 1500){ const ph = m.phone, a = ph.ang*Math.PI/180, c0 = T([ph.cx, ph.cy]), L = ph.len1/2*sc; line([c0[0] - Math.cos(a)*L, c0[1] - Math.sin(a)*L], [c0[0] + Math.cos(a)*L, c0[1] + Math.sin(a)*L], 'rgba(255,80,255,.95)', 3); }
      g.fillStyle = '#dfe6f5'; g.font = '700 14px sans-serif'; g.fillText(`t = ${c.r.t.toFixed(2)} s · fotogramma ${c.r.i}`, ox, oy + CH + 18);
      g.fillStyle = '#b8c4e0'; g.font = '12px sans-serif';
      g.fillText(`schermo ${c.r.schermo_visto ? c.r.schermo_asse_deg + '° (' + c.r.schermo_px + ' px)' : 'non visto'} · mano ${c.r.mano_vista ? 'dita ' + c.r.mano.dita_deg + '°, palmo→camera ' + (c.r.mano.normale_palmo_verso_camera ?? '—') : 'non vista'}${c.r.schermo_meno_dita_deg != null ? ' · schermo−dita ' + c.r.schermo_meno_dita_deg + '°' : ''}`, ox, oy + CH + 36);
    });
    return cv.toDataURL('image/webp', .82);
  }, { st, frames, CAMERA });
  const file = path.join(OUT, `V-${st.id}.webp`);
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.error('scritto', file, frames.length, 'fotogrammi');
}
for (const st of strokes.filter(s => s.tipo !== 'presa_2d')){
  const cells = st.kind === 'still' || st.posa ? st.campioni.slice(0, N).map(s => ({ s, label: '' })) : pick(st);
  if (!cells.length) continue;
  const frames = cells.map(c => ({ ...c, mp: mp.get(c.s.i) || null }));
  const dataUrl = await page.evaluate(async ({ st, frames, CAMERA, trail }) => {
    const [W, H] = CAMERA.immagine, F = CAMERA.f_px, DIST = CAMERA.distanza_m, OX = CAMERA.offset_m.x, OY = CAMERA.offset_m.y, PY = CAMERA.bacino_modello_y, HIPY = CAMERA.anche_y_m;
    const project = p => { const Zc = p[2] + DIST; return [W/2 + F*(-p[0] + OX)/Zc, H/2 + F*(-(p[1] - PY - HIPY) + OY)/Zc]; };
    const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
    const addm = (a, b, k) => [a[0] + b[0]*k, a[1] + b[1]*k, a[2] + b[2]*k];
    const phoneCorners = ph => { const right = cross(ph.cima, ph.schermo), c = ph.centro, hh = .081, hw = .0395;
      return [addm(addm(c, ph.cima, hh), right, -hw), addm(addm(c, ph.cima, hh), right, hw), addm(addm(c, ph.cima, -hh), right, hw), addm(addm(c, ph.cima, -hh), right, -hw)]; };
    const loadImg = src => new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ko(new Error(src)); im.src = src; });
    // riquadro del video: attorno a tutti i punti di Pose del colpo (più margine), rapporto 3:5
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (const c of frames){ const pts = [...(c.mp?.pose || []).filter(p => p[3] > .5).map(p => [p[0], p[1]]), project(c.s.W), project(c.s.E)]; for (const [x, y] of pts){ bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); } }
    if (!(bx1 > bx0)){ bx0 = 0; by0 = 0; bx1 = W; by1 = H; }
    let cw = Math.max(bx1 - bx0 + 80, 200), chh = Math.max(by1 - by0 + 80, 300); if (cw/chh < .6) cw = .6*chh; else chh = cw/.6;
    const ccx = (bx0 + bx1)/2, ccy = (by0 + by1)/2;
    const crop = { x: ccx - cw/2, y: ccy - chh/2, w: cw, h: chh };
    const VW = 300, VH = 500, SW = 230, PAD = 8, CAP = 64, CELL_W = VW + 2*SW + 4*PAD, CELL_H = VH + CAP + 2*PAD, COLS = 3, ROWS = Math.ceil(frames.length/COLS), HEAD = 60;
    const cv = document.getElementById('c'); cv.width = COLS*CELL_W; cv.height = HEAD + ROWS*CELL_H;
    const g = cv.getContext('2d');
    g.fillStyle = '#0b1020'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#fff'; g.font = '700 22px sans-serif'; g.fillText(`${st.label} · video dell’utente, ricostruzione con la catena del gioco`, 16, 30);
    g.font = '14px sans-serif'; g.fillStyle = '#9fb3d9';
    g.fillText(`ciano = Pose misurato · verde = mano destra (Hands) · magenta = asse dello schermo · arancione = catena del gioco riproiettata · scia = polso sul colpo · vista di fronte come la camera (destra di chi gioca a sinistra) · di lato da destra (rete a sinistra)`, 16, 52);
    const imgs = await Promise.all(frames.map(c => loadImg('/frames/f' + String(c.s.i).padStart(4, '0') + '.jpg')));
    const sc = VW/crop.w;
    const toV = ([x, y], ox, oy) => [ox + (x - crop.x)*sc, oy + (y - crop.y)*sc];
    // viste 3D: ortografiche, 1 m = K px, centro sul bacino a y = 1,25 m
    const K = 150;
    const front = (p, ox, oy) => [ox + SW/2 - p[0]*K, oy + VH*.62 - (p[1] - 1.25)*K];      // da davanti: x di chi gioca verso sinistra
    const side = (p, ox, oy) => [ox + SW/2 + p[2]*K, oy + VH*.62 - (p[1] - 1.25)*K];       // da destra di chi gioca: −z (rete) a sinistra
    const line = (a, b, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    const dotp = (a, col, r) => { g.fillStyle = col; g.beginPath(); g.arc(a[0], a[1], r, 0, 7); g.fill(); };
    const poly = (pts, fill, stroke) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); if (fill){ g.fillStyle = fill; g.fill(); } if (stroke){ g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); } };
    const drawBody = (s, T, viewDir) => {
      // busto: bacino, spalle, collo, testa (dalla posa: spalla destra S, l'altra specchiata rispetto al bacino traslato)
      const S = s.S, pelvis = s.busto.bacino, SL = s.busto.spalla_sx, neck = s.busto.collo, head = s.busto.testa;
      line(T(pelvis), T(neck), '#6b7fa6', 4); line(T(S), T(SL), '#6b7fa6', 4);
      g.strokeStyle = '#6b7fa6'; g.lineWidth = 3; g.beginPath(); const hp = T(head); g.arc(hp[0], hp[1], .105*K, 0, 7); g.stroke();
      line(T(S), T(s.E), '#ffb347', 6); line(T(s.E), T(s.W), '#ffb347', 6); dotp(T(S), '#fff', 4); dotp(T(s.E), '#fff', 4); dotp(T(s.W), '#fff', 4);
      const corners = phoneCorners(s.telefono).map(T), facing = (viewDir[0]*s.telefono.schermo[0] + viewDir[1]*s.telefono.schermo[1] + viewDir[2]*s.telefono.schermo[2]);
      poly(corners, facing > .15 ? 'rgba(80,120,255,.9)' : facing < -.15 ? 'rgba(40,40,50,.95)' : 'rgba(120,120,140,.9)', '#fff');
      // rete / schermo: freccia verso −z nella vista di lato
    };
    frames.forEach((c, k) => {
      const col = k % COLS, row = Math.floor(k/COLS), ox = col*CELL_W + PAD, oy = HEAD + row*CELL_H + PAD, s = c.s;
      g.fillStyle = '#141b33'; g.fillRect(ox - PAD + 1, oy - PAD + 1, CELL_W - 2, CELL_H - 2);
      // video
      g.save(); g.beginPath(); g.rect(ox, oy, VW, VH); g.clip();
      g.drawImage(imgs[k], crop.x, crop.y, crop.w, crop.h, ox, oy, VW, VH);
      const m = c.mp;
      if (m?.pose){
        const P = m.pose, pt = i => toV([P[i][0], P[i][1]], ox, oy);
        for (const [a, b] of [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]]) if (P[a][3] > .5 && P[b][3] > .5) line(pt(a), pt(b), 'rgba(0,230,255,.9)', 2);
        for (const i of [11, 12, 13, 14, 15, 16, 23, 24]) if (P[i][3] > .5) dotp(pt(i), i === 16 || i === 14 || i === 12 ? '#00e6ff' : 'rgba(0,230,255,.6)', 3);
        // mano destra (la più vicina al polso destro)
        if (m.hands?.length){ const w = P[16]; const h = m.hands.reduce((b, hh) => { const d = Math.hypot(hh.lm[0][0] - w[0], hh.lm[0][1] - w[1]); return !b || d < b.d ? { hh, d } : b; }, null);
          if (h && h.d < .07*H){ for (const [a, b] of [[0, 5], [5, 9], [9, 13], [13, 17], [0, 17], [5, 8], [9, 12], [0, 4]]) line(toV(h.hh.lm[a], ox, oy), toV(h.hh.lm[b], ox, oy), 'rgba(80,255,120,.9)', 1.5); } }
      }
      if (m?.phone && m.phone.nearWrist === 16){ const ph = m.phone, a = ph.ang*Math.PI/180, c0 = toV([ph.cx, ph.cy], ox, oy), L = ph.len1/2*sc;
        line([c0[0] - Math.cos(a)*L, c0[1] - Math.sin(a)*L], [c0[0] + Math.cos(a)*L, c0[1] + Math.sin(a)*L], 'rgba(255,80,255,.95)', 3); }
      // catena riproiettata
      const pS = toV(project(s.S), ox, oy), pE = toV(project(s.E), ox, oy), pW = toV(project(s.W), ox, oy);
      line(pS, pE, 'rgba(255,160,40,.95)', 3); line(pE, pW, 'rgba(255,160,40,.95)', 3); dotp(pS, '#ffb347', 4); dotp(pE, '#ffb347', 4); dotp(pW, '#ffb347', 4);
      poly(phoneCorners(s.telefono).map(p => toV(project(p), ox, oy)), null, 'rgba(255,200,80,.95)');
      g.restore();
      // viste 3D
      for (const [vi, T, dir] of [[0, (p => front(p, ox + VW + PAD, oy)), [0, 0, -1]], [1, (p => side(p, ox + VW + 2*PAD + SW, oy)), [1, 0, 0]]]){
        const vx = ox + VW + PAD + vi*(SW + PAD);
        g.fillStyle = '#0e1430'; g.fillRect(vx, oy, SW, VH);
        g.fillStyle = '#5b6b94'; g.font = '12px sans-serif'; g.fillText(vi ? 'di lato (da destra) · rete ←' : 'di fronte (dalla camera)', vx + 6, oy + 14);
        // scia del polso
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); trail.forEach((p, i) => { const q = T(p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke();
        drawBody(s, T, dir);
      }
      // didascalia
      g.fillStyle = c.label ? '#ffd166' : '#dfe6f5'; g.font = '700 15px sans-serif';
      g.fillText(`${c.label ? c.label + ' · ' : ''}t = ${s.t.toFixed(2)} s · fotogramma ${s.i}`, ox, oy + VH + 20);
      g.fillStyle = '#b8c4e0'; g.font = '12px sans-serif';
      const j = s.j;
      g.fillText(`busto ${j.tau}° · spalla p ${j.p}° e ${j.e}° r ${j.r}° · gomito ${j.b}° · pro ${j.pro}° · polso ${j.fl}°/${j.dv}°`, ox, oy + VH + 38);
      const q = s.qualita;
      g.fillText(`mano ${s.velocita_mano_ms} m/s (2D ${s.velocita_mano_2d_ms ?? '—'}) · telefono ${s.omega_gs} °/s · riproiezione ${q.riproiezione_px ?? '—'} px · mano vista ${q.mano} · schermo ${q.telefono}${q.interpolato ? ' · BRACCIO INTERPOLATO' : ''}${q.mano_interpolata ? ' · MANO INTERPOLATA (polso/pronazione dal fotogramma prima)' : ''}`, ox, oy + VH + 54);
    });
    return cv.toDataURL('image/webp', .82);
  }, { st, frames, CAMERA, trail: st.campioni.map(s => s.W) });
  const file = path.join(OUT, `V-${st.id}.webp`);
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.error('scritto', file, frames.length, 'fotogrammi');
}
await B.close(); server.close();
