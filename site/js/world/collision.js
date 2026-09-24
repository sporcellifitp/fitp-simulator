// Collisioni 2D del mondo: rettangoli orientati, ellissi, poligoni (edifici) e fiume, con l'eccezione dei ponti.
import { clamp } from '../core/util.js';

let BOUNDS = { x0: -1e9, x1: 1e9, z0: -1e9, z1: 1e9 };
export const setBounds = b => { BOUNDS = b; };
// il punto è libero per un corpo di raggio r?
export const isFree = (x, z, r = .6) => x > BOUNDS.x0 && x < BOUNDS.x1 && z > BOUNDS.z0 && z < BOUNDS.z1 &&
  !colliders.some(c => (c.t !== 'w' || !onBridge(x, z)) && hits(c, x, z, r));

/* ---------- forme per collisioni e aree occupate ---------- */
export const colliders = [];   // ostacoli per il giocatore
export const occupied = [];    // aree da non riempire di alberi
export function addRect(list, cx, cz, hw, hd, rot = 0){
  const c = Math.cos(rot), s = Math.sin(rot), ex = hw*Math.abs(c) + hd*Math.abs(s), ez = hw*Math.abs(s) + hd*Math.abs(c);
  list.push({ t:'o', cx, cz, hw, hd, c, s, bb:[cx-ex, cx+ex, cz-ez, cz+ez] });
}
export function addEll(list, x, z, a, b, rot = 0){
  const r = Math.max(a,b);
  list.push({ t:'e', x, z, a, b, c:Math.cos(rot), s:Math.sin(rot), bb:[x-r, x+r, z-r, z+r] });
}
export function bbOf(pts){ let x0=Infinity, x1=-Infinity, z0=Infinity, z1=-Infinity; for (const [x,z] of pts){ x0=Math.min(x0,x); x1=Math.max(x1,x); z0=Math.min(z0,z); z1=Math.max(z1,z); } return [x0,x1,z0,z1]; }
export const addPoly = (list, pts) => list.push({ t:'p', pts, bb: bbOf(pts) });
export function addLine(list, pts, hw, t = 'l'){ const b = bbOf(pts); list.push({ t, pts, hw, bb:[b[0]-hw, b[1]+hw, b[2]-hw, b[3]+hw] }); }

export function inPoly(pts, x, z){
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++){
    const [xi,zi] = pts[i], [xj,zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi)*(z - zi)/(zj - zi) + xi) inside = !inside;
  }
  return inside;
}
export function closestOn(pts, x, z, closed){ // punto più vicino su una spezzata
  let best = null, bd = Infinity;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++){
    const [ax,az] = pts[i], [bx,bz] = pts[(i+1) % pts.length], dx = bx-ax, dz = bz-az, L = dx*dx + dz*dz;
    const u = L ? clamp(((x-ax)*dx + (z-az)*dz)/L, 0, 1) : 0, px = ax + dx*u, pz = az + dz*u, d = (x-px)**2 + (z-pz)**2;
    if (d < bd){ bd = d; best = [px, pz, dx, dz]; }
  }
  return { x:best[0], z:best[1], dx:best[2], dz:best[3], d:Math.sqrt(bd) };
}
export const bridgeFrames = [];
export const onBridge = (x,z) => bridgeFrames.some(f => { const [lx,lz] = f.l(x,z); return Math.abs(lx) < f.len/2 && Math.abs(lz) < f.wid/2; });

// il punto (x,z), allargato di m, cade nella forma?
export function hits(c, x, z, m){
  if (x < c.bb[0]-m || x > c.bb[1]+m || z < c.bb[2]-m || z > c.bb[3]+m) return false;
  if (c.t === 'o'){ const dx = x-c.cx, dz = z-c.cz; return Math.abs(dx*c.c - dz*c.s) < c.hw+m && Math.abs(dx*c.s + dz*c.c) < c.hd+m; }
  if (c.t === 'e'){ const dx = x-c.x, dz = z-c.z, lx = dx*c.c - dz*c.s, lz = dx*c.s + dz*c.c; return (lx/(c.a+m))**2 + (lz/(c.b+m))**2 < 1; }
  if (c.t === 'p') return inPoly(c.pts, x, z) || closestOn(c.pts, x, z, true).d < m;
  return closestOn(c.pts, x, z, false).d < c.hw + m;
}


/* ---------- collisioni ---------- */
function pushRect(pos, c, R){ // rettangolo orientato: si lavora nel sistema locale
  const dx = pos.x - c.cx, dz = pos.z - c.cz;
  let lx = dx*c.c - dz*c.s, lz = dx*c.s + dz*c.c;
  if (Math.abs(lx) > c.hw + R || Math.abs(lz) > c.hd + R) return;
  const nx = clamp(lx, -c.hw, c.hw), nz = clamp(lz, -c.hd, c.hd), ex = lx - nx, ez = lz - nz, d2 = ex*ex + ez*ez;
  if (d2 >= R*R) return;
  if (d2 > 1e-8){ const d = Math.sqrt(d2); lx = nx + ex/d*R; lz = nz + ez/d*R; }
  else {
    const opts = [[-c.hw - R - lx, 0], [c.hw + R - lx, 0], [0, -c.hd - R - lz], [0, c.hd + R - lz]];
    opts.sort((a,b) => Math.abs(a[0]+a[1]) - Math.abs(b[0]+b[1])); lx += opts[0][0]; lz += opts[0][1];
  }
  pos.x = c.cx + lx*c.c + lz*c.s; pos.z = c.cz - lx*c.s + lz*c.c;
}
export function collide(pos, R = .42){
  for (const c of colliders){
    if (pos.x < c.bb[0] - R || pos.x > c.bb[1] + R || pos.z < c.bb[2] - R || pos.z > c.bb[3] + R) continue;
    if (c.t === 'o'){ pushRect(pos, c, R); continue; }
    if (c.t === 'e'){
      const dx = pos.x - c.x, dz = pos.z - c.z, lx = dx*c.c - dz*c.s, lz = dx*c.s + dz*c.c;
      const k = Math.sqrt((lx/(c.a+R))**2 + (lz/(c.b+R))**2);
      if (k < 1 && k > 1e-6){ const nx = lx/k, nz = lz/k; pos.x = c.x + nx*c.c + nz*c.s; pos.z = c.z - nx*c.s + nz*c.c; }
      continue;
    }
    if (c.t === 'p'){
      const q = closestOn(c.pts, pos.x, pos.z, true), inside = inPoly(c.pts, pos.x, pos.z);
      if (!inside && q.d >= R) continue;
      let ux, uz;
      if (q.d > 1e-6){ ux = (pos.x - q.x)/q.d; uz = (pos.z - q.z)/q.d; if (inside){ ux = -ux; uz = -uz; } }
      else { const L = Math.hypot(q.dx, q.dz) || 1; ux = q.dz/L; uz = -q.dx/L; if (inPoly(c.pts, q.x + ux*.01, q.z + uz*.01)){ ux = -ux; uz = -uz; } }
      pos.x = q.x + ux*R; pos.z = q.z + uz*R;
      continue;
    }
    // fiume: si attraversa solo sui ponti
    if (onBridge(pos.x, pos.z)) continue;
    const q = closestOn(c.pts, pos.x, pos.z, false), lim = c.hw + R;
    if (q.d >= lim) continue;
    let ux, uz;
    if (q.d > 1e-6){ ux = (pos.x - q.x)/q.d; uz = (pos.z - q.z)/q.d; }
    else { const L = Math.hypot(q.dx, q.dz) || 1; ux = q.dz/L; uz = -q.dx/L; }
    pos.x = q.x + ux*lim; pos.z = q.z + uz*lim;
  }
  pos.x = clamp(pos.x, BOUNDS.x0, BOUNDS.x1); pos.z = clamp(pos.z, BOUNDS.z0, BOUNDS.z1);
}

