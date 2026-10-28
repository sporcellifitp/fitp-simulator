// Texture disegnate su canvas: logo SuperTennis, pareti viola, campo con le linee, pavimento esagonale, cielo, skyline.
// Tutto procedurale tranne il logo ESPORTS FITP (file ufficiale in assets/brand).
import * as THREE from 'three';

export const COLORS = {
  court: '#0b67ee',
  courtFar: '#0a5fe4',
  surround: '#3f8cea',
  line: '#f4fbff',
  wall: '#4a2fe2',
  wallLight: '#6a4af2',
  wallDark: '#3a20cf',
  logo: '#dfe3ff',
};

let rngSeed = 1234567;
export function rand() {
  rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
  return rngSeed / 4294967296;
}
export function seed(s) { rngSeed = s >>> 0; }

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function toTexture(c, { repeat = null, aniso = 8, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.needsUpdate = true;
  return t;
}

// ── logo SuperTennis ──────────────────────────────────────────────────────────
// Misure in unità di T (altezza delle maiuscole di TENNIS), prese dallo screenshot del muro di fondo:
// ogni scritta viene adattata al suo riquadro misurando il testo, così il risultato non dipende dal font.
export const SUPERTENNIS_RATIO = { w: 9.4, h: 1.95, hArena: 3.2 };

// Scrive `text` in modo che le maiuscole occupino esattamente il riquadro (x0..x1, top..base).
function fitText(ctx, text, font, x0, x1, top, base, skew = 0, spacing = 0) {
  ctx.save();
  ctx.font = font.replace('SIZE', '100px');
  ctx.letterSpacing = `${spacing}px`; // in unità del font a 100px
  const m = ctx.measureText(text);
  const capH = m.actualBoundingBoxAscent;
  const width = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const sy = (base - top) / capH;
  const sx = (x1 - x0) / width;
  ctx.translate(x0 + m.actualBoundingBoxLeft * sx, base);
  ctx.transform(sx, 0, -skew * sy, sy, 0, 0);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// Svolazzo: curva che parte sotto SUPER, passa sotto la R e sale come barra tra R e T, assottigliata agli estremi.
function swoosh(ctx, T) {
  const P = [[1.94, 1.83], [3.0, 1.66], [3.86, 1.22], [4.04, 0.0]];
  const pt = (t) => {
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return [0, 1].map((i) => k.reduce((acc, kk, j) => acc + kk * P[j][i], 0) * T);
  };
  const N = 40, left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = pt(Math.max(0, t - 0.01)), b = pt(Math.min(1, t + 0.01));
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const w = 0.042 * T * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.7) + 0.004 * T;
    const p = pt(t);
    left.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]);
    right.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
  }
  ctx.beginPath();
  left.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
}

export function drawSuperTennis(ctx, x, y, T, color, { arena = false } = {}) {
  // x,y: angolo in alto a sinistra del riquadro del logo
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  fitText(ctx, 'SUPER', 'italic 300 SIZE Kanit', 0, 3.22 * T, 0.56 * T, 1.33 * T);
  fitText(ctx, 'TENNIS', 'italic 900 SIZE Kanit', 3.9 * T, 9.3 * T, 0.89 * T, 1.89 * T, 0.06, 9);
  swoosh(ctx, T);
  if (arena) {
    fitText(ctx, 'ARENA', 'italic 200 SIZE Kanit', 4.9 * T, 8.75 * T, 2.35 * T, 3.1 * T, 0, 22);
  }
  ctx.restore();
}

export function superTennisCanvas(T = 120, color = COLORS.logo, opts = {}) {
  const r = SUPERTENNIS_RATIO;
  const c = canvas(Math.ceil(r.w * T), Math.ceil((opts.arena ? r.hArena : r.h) * T));
  drawSuperTennis(c.getContext('2d'), 0, 0, T, color, opts);
  return c;
}

// ── pareti viola con motivo a quadretti ───────────────────────────────────────
function pixelPattern(ctx, w, h, cell, base) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const shades = ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.09)', 'rgba(20,0,90,0.10)', 'rgba(20,0,90,0.16)'];
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      if (rand() < 0.45) {
        ctx.fillStyle = shades[(rand() * shades.length) | 0];
        const sw = cell * (1 + ((rand() * 3) | 0));
        ctx.fillRect(x, y, sw, cell);
      }
    }
  }
}

// Pannello di parete con loghi. layout: array di {kind:'st'|'esp', at: 0..1 (centro), size: frazione dell'altezza}
export function wallCanvas(lengthM, heightM, layout, { pxPerM = 96, esports = null } = {}) {
  const w = Math.min(4096, Math.round(lengthM * pxPerM));
  const h = Math.round(heightM * pxPerM * (w / (lengthM * pxPerM)));
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, COLORS.wallLight);
  g.addColorStop(0.12, COLORS.wall);
  g.addColorStop(1, COLORS.wallDark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  const cell = Math.max(6, Math.round(h / 9));
  const tmp = canvas(w, h);
  pixelPattern(tmp.getContext('2d'), w, h, cell, 'rgba(0,0,0,0)');
  ctx.drawImage(tmp, 0, 0);
  // filo chiaro in cima
  ctx.fillStyle = 'rgba(190,170,255,0.55)';
  ctx.fillRect(0, 0, w, Math.max(2, h * 0.025));
  for (const item of layout) {
    const cx = item.at * w;
    if (item.kind === 'st') {
      const T = (item.size * h) / SUPERTENNIS_RATIO.h;
      const lw = SUPERTENNIS_RATIO.w * T;
      drawSuperTennis(ctx, cx - lw / 2, (h - SUPERTENNIS_RATIO.h * T) / 2 + 0.06 * T, T, COLORS.logo);
    } else if (item.kind === 'esp' && esports) {
      const lh = item.size * h;
      const lw = lh * (esports.width / esports.height);
      ctx.drawImage(esports, cx - lw / 2, (h - lh) / 2, lw, lh);
    }
  }
  return c;
}

// ── pavimento: fuori campo, campo, linee e scritte ────────────────────────────
// Il campo è centrato in (0,0); x = larghezza, z = lunghezza. Il canvas copre [-hw,hw]×[-hl,hl].
export function groundCanvas(hw, hl, pxPerM = 72) {
  const W = Math.round(hw * 2 * pxPerM), H = Math.round(hl * 2 * pxPerM);
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const X = (x) => (x + hw) * pxPerM;
  const Z = (z) => (z + hl) * pxPerM;
  // fuori campo: azzurro con leggera sfumatura
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#3f86e6');
  g.addColorStop(0.5, COLORS.surround);
  g.addColorStop(1, '#3a84e8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // grana leggera
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,20,80,0.03)';
    ctx.fillRect(rand() * W, rand() * H, 2 + rand() * 6, 2 + rand() * 6);
  }
  // campo (doppio): blu acceso
  const CW = 5.485, CL = 11.885, SW = 4.115, SL = 6.4;
  const gc = ctx.createLinearGradient(0, Z(-CL), 0, Z(CL));
  gc.addColorStop(0, COLORS.courtFar);
  gc.addColorStop(0.5, '#0f6cf2');
  gc.addColorStop(1, COLORS.court);
  ctx.fillStyle = gc;
  ctx.fillRect(X(-CW), Z(-CL), (2 * CW) * pxPerM, (2 * CL) * pxPerM);
  // corridoi del doppio leggermente più scuri
  ctx.fillStyle = 'rgba(0,30,120,0.10)';
  ctx.fillRect(X(-CW), Z(-CL), (CW - SW) * pxPerM, 2 * CL * pxPerM);
  ctx.fillRect(X(SW), Z(-CL), (CW - SW) * pxPerM, 2 * CL * pxPerM);
  // linee (5 cm, fondo 10 cm)
  ctx.fillStyle = COLORS.line;
  const lw = 0.07 * pxPerM; // 5 cm reali, allargate per la leggibilità da lontano
  const hline = (x0, x1, z, t = lw) => ctx.fillRect(X(x0), Z(z) - t / 2, (x1 - x0) * pxPerM, t);
  const vline = (x, z0, z1, t = lw) => ctx.fillRect(X(x) - t / 2, Z(z0), t, (z1 - z0) * pxPerM);
  hline(-CW, CW, -CL, lw * 2);
  hline(-CW, CW, CL, lw * 2);
  vline(-CW, -CL, CL);
  vline(CW, -CL, CL);
  vline(-SW, -CL, CL);
  vline(SW, -CL, CL);
  hline(-SW, SW, -SL);
  hline(-SW, SW, SL);
  vline(0, -SL, SL);
  vline(0, -CL, -CL + 0.1);
  vline(0, CL - 0.1, CL);
  // filo bianco che delimita il fuori campo verso le pareti
  const m = 0.35;
  ctx.fillStyle = 'rgba(240,248,255,0.85)';
  ctx.fillRect(X(-hw + m), Z(-hl + m), lw * 1.4, (2 * hl - 2 * m) * pxPerM);
  ctx.fillRect(X(hw - m) - lw * 1.4, Z(-hl + m), lw * 1.4, (2 * hl - 2 * m) * pxPerM);
  // scritte SuperTennis ARENA dietro le linee di fondo (lette da chi sta dietro ciascun fondo)
  const T = 0.62 * pxPerM;
  const logo = superTennisCanvas(T, 'rgba(236,240,255,0.82)', { arena: true });
  const place = (zc, rot) => {
    ctx.save();
    ctx.translate(X(-0.4), Z(zc));
    ctx.rotate(rot);
    ctx.drawImage(logo, -logo.width / 2, -logo.height / 2);
    ctx.restore();
  };
  place(CL + 3.55, 0);
  place(-CL - 3.55, Math.PI);
  // scritta piccola specchiata a ridosso della parete di fondo (si vede capovolta dal lato opposto)
  const small = superTennisCanvas(0.32 * pxPerM, 'rgba(225,232,255,0.55)', { arena: true });
  ctx.save();
  ctx.translate(X(0), Z(-hl + 1.4));
  ctx.rotate(Math.PI);
  ctx.drawImage(small, -small.width / 2, -small.height / 2);
  ctx.restore();
  ctx.save();
  ctx.translate(X(0), Z(hl - 1.4));
  ctx.drawImage(small, -small.width / 2, -small.height / 2);
  ctx.restore();
  return c;
}

// ── pavimentazione esagonale esterna ──────────────────────────────────────────
export function hexCanvas(size = 512) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5d6fae';
  ctx.fillRect(0, 0, size, size);
  // griglia esagonale piastrellabile (esagoni con il lato piatto in alto): colonne a passo 1.5r, righe a passo √3·r
  const cols = 6; // pari, perché lo sfalsamento delle colonne si ripeta
  const stepX = size / cols;
  const rr = stepX / 1.5;
  const rows = Math.round(size / (Math.sqrt(3) * rr));
  const stepY = size / rows;
  const sy = stepY / (Math.sqrt(3) * rr);
  for (let i = -1; i <= cols + 1; i++) {
    for (let j = -1; j <= rows + 1; j++) {
      const cx = i * stepX;
      const cy = j * stepY + (i % 2 ? stepY / 2 : 0);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k;
        const px = cx + Math.cos(a) * (rr - 3);
        const py = cy + Math.sin(a) * (rr - 3) * sy;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const v = 0.85 + rand() * 0.25;
      ctx.fillStyle = `rgb(${(118 * v) | 0},${(126 * v) | 0},${(178 * v) | 0})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,30,90,0.55)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  return c;
}

// ── cielo al tramonto con nuvole ──────────────────────────────────────────────
export function skyCanvas(w = 2048, h = 1024) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  // h/2 = orizzonte (la sfera usa la metà superiore)
  g.addColorStop(0.0, '#3a3f8c');
  g.addColorStop(0.2, '#5a5aa6');
  g.addColorStop(0.34, '#8070ae');
  g.addColorStop(0.43, '#ac84ac');
  g.addColorStop(0.48, '#d99a9c');
  g.addColorStop(0.5, '#eaa88c');
  g.addColorStop(0.56, '#c49aa8');
  g.addColorStop(1.0, '#6c6aa0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // nuvole: ammassi di ellissi morbide, rosa-arancio in basso, lilla in alto
  const cloud = (cx, cy, s, col) => {
    for (let i = 0; i < 26; i++) {
      const x = cx + (rand() - 0.5) * s * 3.2;
      const y = cy + (rand() - 0.5) * s * 0.55;
      const r = s * (0.25 + rand() * 0.45);
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, col.replace('A', '0.30'));
      gr.addColorStop(1, col.replace('A', '0'));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.8, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  for (let i = 0; i < 46; i++) {
    const y = h * (0.14 + rand() * 0.33);
    const warm = y > h * 0.29;
    const col = warm ? 'rgba(255,165,140,A)' : 'rgba(215,160,205,A)';
    cloud(rand() * w, y, 50 + rand() * 110, col);
  }
  return c;
}

// ── skyline lontano ───────────────────────────────────────────────────────────
export function skylineCanvas(w = 4096, h = 512) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  let x = 0;
  while (x < w) {
    const bw = 40 + rand() * 120;
    const tall = rand() < 0.35;
    const bh = (tall ? 0.6 + rand() * 0.38 : 0.2 + rand() * 0.35) * h;
    if (rand() < 0.3) { x += bw * 0.6; continue; }
    const shade = 0.82 + rand() * 0.18;
    const g = ctx.createLinearGradient(0, h - bh, 0, h);
    g.addColorStop(0, `rgb(${(236 * shade) | 0},${(222 * shade) | 0},${(240 * shade) | 0})`);
    g.addColorStop(1, `rgb(${(186 * shade) | 0},${(166 * shade) | 0},${(206 * shade) | 0})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, h - bh, bw, bh);
    // fianco in ombra
    ctx.fillStyle = 'rgba(80,60,130,0.22)';
    ctx.fillRect(x + bw * 0.62, h - bh, bw * 0.38, bh);
    // finestre
    ctx.fillStyle = 'rgba(120,110,170,0.35)';
    for (let yy = h - bh + 8; yy < h - 6; yy += 9) {
      for (let xx = x + 5; xx < x + bw - 6; xx += 8) ctx.fillRect(xx, yy, 4, 4);
    }
    x += bw + rand() * 25;
  }
  return c;
}

// ── rete ──────────────────────────────────────────────────────────────────────
export function netCanvas(w = 512, h = 64) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(20,20,35,0.85)';
  ctx.lineWidth = 1.4;
  const step = 8;
  for (let x = 0; x <= w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  return c;
}

// ── tabelloni (velocità e punteggio) ──────────────────────────────────────────
export function boardCanvas(lines, w = 256, h = 160) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#05060c';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1b1f30';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    ctx.fillStyle = l.color || '#ffb21a';
    ctx.font = `${l.weight || 700} ${l.size || 64}px Kanit`;
    ctx.fillText(l.text, w / 2, h * (lines.length === 1 ? 0.5 : 0.36 + i * 0.36));
  });
  return c;
}
