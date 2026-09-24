// Griglia di occupazione del mondo e ricerca del percorso (A*). La usano il Trophy Tour, per trovare spazi liberi,
// e il Percorso del Foro, per disegnare a terra la strada fino alla tappa successiva.
// Ogni ostacolo segna solo le celle che tocca: poligoni a scansione, linee a timbri, rettangoli ed ellissi con la prova esatta.
import { clamp } from '../core/util.js';
import { hits, onBridge } from './collision.js';

export function rasterize(list, { x0, z0, nx, nz, cell = 1, margin = .6, bounds = null }){
  const grid = new Uint8Array(nx*nz);
  const cx = i => x0 + (i + .5)*cell, cz = j => z0 + (j + .5)*cell;
  if (bounds) for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++){
    const x = cx(i), z = cz(j); if (x < bounds.x0 + 2 || x > bounds.x1 - 2 || z < bounds.z0 + 2 || z > bounds.z1 - 2) grid[j*nx + i] = 1;
  }
  const I = x => Math.floor((x - x0)/cell), J = z => Math.floor((z - z0)/cell);
  const mark = (x, z) => { const i = I(x), j = J(z); if (i >= 0 && j >= 0 && i < nx && j < nz) grid[j*nx + i] = 1; };
  const step = Math.min(.7, cell*.7);
  const disk = (x, z, r) => { for (let dz = -r; dz <= r + 1e-6; dz += step) for (let dx = -r; dx <= r + 1e-6; dx += step) if (dx*dx + dz*dz <= r*r + .01) mark(x + dx, z + dz); };
  const trace = (pts, closed, r) => {
    const n = closed ? pts.length : pts.length - 1;
    for (let k = 0; k < n; k++){
      const [ax, az] = pts[k], [bx, bz] = pts[(k + 1) % pts.length], L = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.ceil(L/step));
      for (let t = 0; t <= m; t++) disk(ax + (bx - ax)*t/m, az + (bz - az)*t/m, r);
    }
  };
  const box = (c, pad) => [Math.max(0, I(c.bb[0] - pad)), Math.min(nx - 1, I(c.bb[1] + pad)), Math.max(0, J(c.bb[2] - pad)), Math.min(nz - 1, J(c.bb[3] + pad))];
  for (const c of list){
    if (c.bb[1] < x0 - 5 || c.bb[0] > x0 + nx*cell + 5 || c.bb[3] < z0 - 5 || c.bb[2] > z0 + nz*cell + 5) continue;
    if (c.t === 'p'){                                   // poligono: riempimento a scansione più il bordo
      const pts = c.pts, [, , j0, j1] = box(c, 0);
      for (let j = j0; j <= j1; j++){
        const z = cz(j), xs = [];
        for (let k = 0, q = pts.length - 1; k < pts.length; q = k++){ const [xi, zi] = pts[k], [xq, zq] = pts[q]; if ((zi > z) !== (zq > z)) xs.push(xi + (z - zi)*(xq - xi)/(zq - zi)); }
        xs.sort((u, v) => u - v);
        for (let k = 0; k + 1 < xs.length; k += 2){ const i0 = Math.max(0, I(xs[k])), i1 = Math.min(nx - 1, I(xs[k + 1])); for (let i = i0; i <= i1; i++) grid[j*nx + i] = 1; }
      }
      trace(pts, true, margin);
    } else if (c.t === 'o' || c.t === 'e'){             // rettangoli ed ellissi: prova esatta nel riquadro
      // prova con mezza diagonale di cella in più: un muro sottile e ruotato non deve passare tra i centri delle celle
      const m = margin + cell*.71, [i0, i1, j0, j1] = box(c, m + cell);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){ const k = j*nx + i; if (!grid[k] && hits(c, cx(i), cz(j), m)) grid[k] = 1; }
    } else if ((c.hw || 0) > 2){                         // fiume e argini larghi: ogni segmento vicino come una capsula
      const r = c.hw + margin, n = c.pts.length - 1, river = c.t === 'w';
      for (let k = 0; k < n; k++){
        const [ax, az] = c.pts[k], [bx, bz] = c.pts[k + 1];
        const i0 = Math.max(0, I(Math.min(ax, bx) - r)), i1 = Math.min(nx - 1, I(Math.max(ax, bx) + r));
        const j0 = Math.max(0, J(Math.min(az, bz) - r)), j1 = Math.min(nz - 1, J(Math.max(az, bz) + r));
        if (i0 > i1 || j0 > j1) continue;
        const dx = bx - ax, dz = bz - az, L2 = dx*dx + dz*dz || 1;
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){
          const x = cx(i), z = cz(j), u = clamp(((x - ax)*dx + (z - az)*dz)/L2, 0, 1), ex = x - ax - dx*u, ez = z - az - dz*u;
          if (ex*ex + ez*ez < r*r && !(river && onBridge(x, z))) grid[j*nx + i] = 1;
        }
      }
    } else trace(c.pts, false, (c.hw || 0) + margin);  // linee sottili con spessore
  }
  return {
    grid, x0, z0, nx, nz, cell,
    free(x, z){ const i = I(x), j = J(z); return i >= 0 && j >= 0 && i < nx && j < nz && !grid[j*nx + i]; },
    cellOf(x, z){ return [clamp(I(x), 0, nx - 1), clamp(J(z), 0, nz - 1)]; },
    center(i, j){ return [cx(i), cz(j)]; },
  };
}

// cella libera più vicina (ricerca ad anelli)
function nearestFree(G, i, j, maxR = 30){
  const { grid, nx, nz } = G;
  if (!grid[j*nx + i]) return [i, j];
  for (let r = 1; r <= maxR; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++){
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
    const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < nx && b < nz && !grid[b*nx + a]) return [a, b];
  }
  return null;
}

// A* a otto direzioni verso il punto (bx, bz): basta arrivare a una cella libera entro goalR metri
// (il centro di una fontana o di uno stadio è dentro un ostacolo). Restituisce punti già semplificati o null.
export function findPath(G, ax, az, bx, bz, goalR = 0, maxIter = 600000){
  const { grid, nx, nz, cell } = G;
  const s = nearestFree(G, ...G.cellOf(ax, az)), t = G.cellOf(bx, bz);
  if (!s) return null;
  const N = nx*nz, S = s[1]*nx + s[0], gr = Math.max(goalR/cell, 1.5);
  const goal = n => { const di = n % nx - t[0], dj = ((n / nx) | 0) - t[1]; return di*di + dj*dj <= gr*gr; };
  let Tn = -1;
  const g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = [], hf = [];                               // coda con priorità: nodi e costi stimati
  const push = (n, f) => { heap.push(n); hf.push(f); let k = heap.length - 1; while (k){ const p = (k - 1) >> 1; if (hf[p] <= hf[k]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; [hf[p], hf[k]] = [hf[k], hf[p]]; k = p; } };
  const pop = () => { const top = heap[0], ln = heap.pop(), lf = hf.pop(); if (heap.length){ heap[0] = ln; hf[0] = lf; let k = 0; for (;;){ const l = 2*k + 1, r = l + 1; let m = k; if (l < heap.length && hf[l] < hf[m]) m = l; if (r < heap.length && hf[r] < hf[m]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; [hf[m], hf[k]] = [hf[k], hf[m]]; k = m; } } return top; };
  const h = n => { const dx = Math.abs(n % nx - t[0]), dz = Math.abs(((n / nx) | 0) - t[1]); return Math.max(dx, dz) + .414*Math.min(dx, dz); };
  if (!grid.length) return null;
  g[S] = 0; push(S, h(S));
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let it = 0, found = false, bestN = S, bestH = Infinity;
  while (heap.length && it++ < maxIter){
    const n = pop(); if (closed[n]) continue; closed[n] = 1;
    if (goal(n)){ Tn = n; found = true; break; }
    const hn = h(n); if (hn < bestH){ bestH = hn; bestN = n; }
    const i = n % nx, j = (n / nx) | 0;
    for (const [di, dj, c] of D){
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const m = b*nx + a; if (grid[m] || closed[m]) continue;
      if (di && dj && (grid[j*nx + a] || grid[b*nx + i])) continue;   // niente scorciatoie sugli spigoli
      const ng = g[n] + c; if (ng < g[m]){ g[m] = ng; from[m] = n; push(m, ng + h(m)); }
    }
  }
  // meta chiusa (recinti, varchi stretti): ci si ferma al punto raggiungibile più vicino, se non è troppo lontano
  let partial = false;
  if (!found){ if (bestH*cell > 45) return null; Tn = bestN; partial = true; }
  const cells = []; for (let n = Tn; n !== -1; n = from[n]) cells.push(n); cells.reverse();
  // semplificazione: si tiene un punto solo quando il successivo non è più in linea di vista
  const sight = (p, q) => {
    let [x0, y0] = [p % nx, (p / nx) | 0]; const [x1, y1] = [q % nx, (q / nx) | 0];
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (;;){
      if (grid[y0*nx + x0]) return false; if (x0 === x1 && y0 === y1) return true;
      const e2 = 2*err, mx = e2 >= dy, my = e2 <= dx;
      if (mx && my && (grid[y0*nx + x0 + sx] || grid[(y0 + sy)*nx + x0])) return false;   // niente passaggi tra due celle piene che si toccano d'angolo
      if (mx){ err += dy; x0 += sx; } if (my){ err += dx; y0 += sy; }
    }
  };
  const keep = [cells[0]]; let a = 0;
  for (let k = 2; k < cells.length; k++) if (!sight(cells[a], cells[k])){ keep.push(cells[k - 1]); a = k - 1; }
  keep.push(cells.at(-1));
  const pts = keep.map(n => G.center(n % nx, (n / nx) | 0));
  pts[0] = [ax, az];
  pts.partial = partial;
  return pts;
}
