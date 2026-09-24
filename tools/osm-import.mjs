#!/usr/bin/env node
// Importa la planimetria del Foro Italico da OpenStreetMap e scrive site/data/layout.json per il gioco.
//
//   node tools/osm-import.mjs --fetch        scarica da Overpass e poi importa
//   node tools/osm-import.mjs                importa data/osm/foro-italico.overpass.json (esportato a mano)
//   node tools/osm-import.mjs --in f.json --out g.json --overrides o.json
//
// Dati © OpenStreetMap contributors, licenza ODbL 1.0: l'attribuzione va mostrata nel gioco (lo fa index.html).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PATHS = {
  query: path.join(ROOT, 'tools/foro-italico.overpassql'),
  raw: path.join(ROOT, 'data/osm/foro-italico.overpass.json'),
  overrides: path.join(ROOT, 'data/osm/overrides.json'),
  out: path.join(ROOT, 'site/data/layout.json'),
};
export const ATTRIBUTION = '© OpenStreetMap contributors, ODbL';

/* ---------- geometria piana ---------- */
const R_EARTH = 6371008.8, DEG = Math.PI/180;
export function projector(lat0, lon0){
  const kx = R_EARTH*DEG*Math.cos(lat0*DEG), kz = R_EARTH*DEG;
  return {
    xz: (lat, lon) => [(lon - lon0)*kx, -(lat - lat0)*kz],
    latlon: (x, z) => [lat0 - z/kz, lon0 + x/kx],
  };
}
const r1 = v => Math.round(v*10)/10;
const r4 = v => Math.round(v*1e4)/1e4;
const dist = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1]);
const samePt = (a, b) => dist(a, b) < 0.05;

export function area(pts){ let s = 0; for (let i = 0, j = pts.length-1; i < pts.length; j = i++) s += (pts[j][0] + pts[i][0])*(pts[j][1] - pts[i][1]); return Math.abs(s)/2; }
export function centroid(pts){
  let a = 0, cx = 0, cz = 0;
  for (let i = 0, j = pts.length-1; i < pts.length; j = i++){
    const f = pts[j][0]*pts[i][1] - pts[i][0]*pts[j][1]; a += f; cx += (pts[j][0] + pts[i][0])*f; cz += (pts[j][1] + pts[i][1])*f;
  }
  if (Math.abs(a) < 1e-9){ const n = pts.length; return [pts.reduce((s,p) => s + p[0], 0)/n, pts.reduce((s,p) => s + p[1], 0)/n]; }
  return [cx/(3*a), cz/(3*a)];
}
export function inPoly(pts, x, z){
  let inside = false;
  for (let i = 0, j = pts.length-1; i < pts.length; j = i++){
    const [xi,zi] = pts[i], [xj,zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi)*(z - zi)/(zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function hull(pts){
  const p = [...pts].sort((a,b) => a[0]-b[0] || a[1]-b[1]), cross = (o,a,b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const lo = [], up = [];
  for (const q of p){ while (lo.length > 1 && cross(lo[lo.length-2], lo[lo.length-1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()){ while (up.length > 1 && cross(up[up.length-2], up[up.length-1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// rettangolo di area minima: centro, lato lungo, lato corto e direzione del lato lungo
export function minAreaRect(pts){
  const h = hull(pts); let best = null;
  for (let i = 0; i < h.length; i++){
    const a = h[i], b = h[(i+1) % h.length], L = dist(a, b); if (L < 1e-6) continue;
    const ux = (b[0]-a[0])/L, uz = (b[1]-a[1])/L;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const q of h){ const u = q[0]*ux + q[1]*uz, v = -q[0]*uz + q[1]*ux; u0 = Math.min(u0,u); u1 = Math.max(u1,u); v0 = Math.min(v0,v); v1 = Math.max(v1,v); }
    const ar = (u1-u0)*(v1-v0);
    if (!best || ar < best.ar - 1e-6){
      const cu = (u0+u1)/2, cv = (v0+v1)/2, cx = cu*ux - cv*uz, cz = cu*uz + cv*ux;
      best = (u1-u0) >= (v1-v0) ? { ar, cx, cz, len:u1-u0, wid:v1-v0, dir:[ux,uz] } : { ar, cx, cz, len:v1-v0, wid:u1-u0, dir:[-uz,ux] };
    }
  }
  if (!best){ const c = centroid(pts); best = { cx:c[0], cz:c[1], len:0, wid:0, dir:[1,0] }; }
  return best;
}
export function simplify(pts, tol){ // Douglas-Peucker
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length-1] = 1;
  const stack = [[0, pts.length-1]];
  while (stack.length){
    const [i0, i1] = stack.pop(), a = pts[i0], b = pts[i1], L = dist(a, b);
    let dm = -1, im = -1;
    for (let i = i0+1; i < i1; i++){
      const p = pts[i], d = L < 1e-9 ? dist(p, a) : Math.abs((b[0]-a[0])*(a[1]-p[1]) - (a[0]-p[0])*(b[1]-a[1]))/L;
      if (d > dm){ dm = d; im = i; }
    }
    if (dm > tol){ keep[im] = 1; stack.push([i0, im], [im, i1]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// unisce spezzate che condividono gli estremi (anelli dei multipoligoni, tratti del fiume)
export function joinLines(lines){
  const pool = lines.filter(l => l.length > 1).map(l => l.slice()), out = [];
  while (pool.length){
    let cur = pool.pop(), grew = true;
    while (grew){
      grew = false;
      for (let i = 0; i < pool.length; i++){
        const l = pool[i], a = cur[0], b = cur[cur.length-1];
        if (samePt(b, l[0])) cur = cur.concat(l.slice(1));
        else if (samePt(b, l[l.length-1])) cur = cur.concat(l.slice(0, -1).reverse());
        else if (samePt(a, l[l.length-1])) cur = l.concat(cur.slice(1));
        else if (samePt(a, l[0])) cur = l.slice(1).reverse().concat(cur);
        else continue;
        pool.splice(i, 1); grew = true; break;
      }
    }
    out.push(cur);
  }
  return out;
}
function segsCross(a, b, c, d){
  const o = (p,q,r) => Math.sign((q[0]-p[0])*(r[1]-p[1]) - (q[1]-p[1])*(r[0]-p[0]));
  return o(a,b,c) !== o(a,b,d) && o(c,d,a) !== o(c,d,b);
}
const lineCrosses = (l, m) => l.some((p, i) => i && m.some((q, j) => j && segsCross(l[i-1], p, m[j-1], q)));
const openRing = pts => pts.length > 1 && samePt(pts[0], pts[pts.length-1]) ? pts.slice(0, -1) : pts;
const normAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const toDeg = a => ((Math.round(a/DEG) % 360) + 360) % 360;

/* ---------- lettura degli elementi Overpass ---------- */
export function parseBBox(query){
  const m = /\[bbox:\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\]/.exec(query);
  if (!m) throw new Error('bbox non trovato nella query Overpass');
  const [s, w, n, e] = m.slice(1).map(Number);
  return { s, w, n, e };
}
function shapes(elements, P){
  const out = [];
  for (const el of elements){
    const tags = el.tags || {}, id = `${el.type}/${el.id}`;
    if (el.type === 'node'){ if (el.lat != null) out.push({ id, tags, kind:'point', pts:[P.xz(el.lat, el.lon)] }); continue; }
    if (el.type === 'way' && el.geometry){
      const pts = el.geometry.filter(Boolean).map(g => P.xz(g.lat, g.lon));
      const closed = pts.length > 3 && (el.nodes ? el.nodes[0] === el.nodes[el.nodes.length-1] : samePt(pts[0], pts[pts.length-1]));
      out.push(closed ? { id, tags, kind:'poly', pts:openRing(pts), holes:[] } : { id, tags, kind:'line', pts });
      continue;
    }
    if (el.type === 'relation' && el.members){
      const ring = role => joinLines(el.members.filter(m => m.type === 'way' && m.role === role && m.geometry)
        .map(m => m.geometry.filter(Boolean).map(g => P.xz(g.lat, g.lon)))).filter(r => r.length > 3 && samePt(r[0], r[r.length-1])).map(openRing);
      const outers = ring('outer').sort((a,b) => area(b) - area(a)), inners = ring('inner');
      if (outers.length) out.push({ id, tags, kind:'poly', pts:outers[0], holes:inners.filter(h => inPoly(outers[0], ...centroid(h))) });
    }
  }
  return out;
}

/* ---------- regole per riconoscere gli impianti ---------- */
const nameOf = t => [t.name, t['name:it'], t.official_name, t.alt_name, t.old_name].filter(Boolean).join(' | ');
const SITES = {
  olimpico:    { kind:'ellipse', test: t => /stadium|sports_centre/.test(t.leisure || '') && /olimpico/i.test(nameOf(t)) },
  marmi:       { kind:'ellipse', test: t => /stadium|track|pitch|sports_centre/.test(t.leisure || '') && /marmi/i.test(nameOf(t)) },
  centrale:    { kind:'stadium', test: t => /stadium|pitch/.test(t.leisure || '') && /centrale/i.test(nameOf(t)) },
  pietrangeli: { kind:'stadium', test: t => !!t.leisure && /pietrangeli|pallacorda/i.test(nameOf(t)) },
  supertennis: { kind:'stadium', test: t => !!t.leisure && /super\s?tennis/i.test(nameOf(t)) },
  arena:       { kind:'stadium', test: t => !!t.leisure && /bnp|grand\s?stand/i.test(nameOf(t)) },
  viale:       { kind:'rect', wid:20, test: t => /pedestrian|footway/.test(t.highway || t['area:highway'] || '') && /viale del foro italico|piazzale dell.impero/i.test(nameOf(t)) },
  ponte:       { kind:'rect', wid:12, test: t => /duca d.?aosta/i.test(nameOf(t)) && !!(t.bridge || t.man_made === 'bridge') },
  fontana:     { kind:'point', test: t => t.amenity === 'fountain' && /sfera/i.test(nameOf(t)) },
  obelisco:    { kind:'point', test: t => t.man_made === 'obelisk' || (!!t.historic && /obelisco|monolite/i.test(nameOf(t))) },
  padel:       { kind:'stadium', test: () => false },  // campo per il minigioco: il campo da padel più vicino al viale, o da overrides
};
const isTennis = t => t.leisure === 'pitch' && /(^|;)\s*tennis\s*($|;)/.test(t.sport || '');
const isPadel = t => t.leisure === 'pitch' && /padel/.test(t.sport || '');

// rot (rotation.y di Three.js) dalla direzione (ux,uz) dell'asse locale
const rotZ = ([ux, uz]) => Math.atan2(ux, uz);   // stadi e campi: asse z locale
const rotX = ([ux, uz]) => Math.atan2(-uz, ux);  // ellissi e rettangoli: asse x locale
// "bearing" in gradi da nord in senso orario, come in overrides.json
const rotFromBearing = (kind, deg) => kind === 'stadium' ? Math.PI - deg*DEG : Math.PI/2 - deg*DEG;
const bearingFromRot = (kind, rot) => toDeg(kind === 'stadium' ? Math.PI - rot : Math.PI/2 - rot);

/* ---------- trasformazione principale ---------- */
export function buildLayout(raw, { bbox, overrides = {}, now = new Date() } = {}){
  const lat0 = (bbox.s + bbox.n)/2, lon0 = (bbox.w + bbox.e)/2, P = projector(lat0, lon0);
  const [x0, z1] = P.xz(bbox.s, bbox.w), [x1, z0] = P.xz(bbox.n, bbox.e);
  const excluded = new Set(overrides.exclude || []);
  const all = shapes(raw.elements || [], P).filter(s => !excluded.has(s.id));
  const report = { sites:{}, missing:[], counts:{} };

  // impianti
  const sites = {}, sitePolys = [];
  for (const [key, rule] of Object.entries(SITES)){
    const cands = all.filter(s => rule.test(s.tags));
    if (!cands.length) continue;
    const polys = cands.filter(s => s.kind === 'poly').sort((a,b) => area(b.pts) - area(a.pts));
    if (rule.kind === 'point'){
      const s = cands.find(c => c.kind === 'point') || polys[0] || cands[0];
      const [x, z] = s.kind === 'poly' ? centroid(s.pts) : s.pts[0];
      sites[key] = { x:r1(x), z:r1(z) }; report.sites[key] = s.id; continue;
    }
    if (rule.kind === 'rect'){
      const src = polys[0] ? [polys[0]] : cands.filter(c => c.kind === 'line');
      if (!src.length) continue;
      const rr = minAreaRect(src.flatMap(s => s.pts));
      const wid = polys[0] ? rr.wid : (parseFloat(src[0].tags.width) || rule.wid);
      sites[key] = { x:r1(rr.cx), z:r1(rr.cz), rot:r4(rotX(rr.dir)), len:r1(rr.len), wid:r1(wid) };
      report.sites[key] = src.map(s => s.id).join(', '); continue;
    }
    const main = polys[0]; if (!main) continue;
    const rr = minAreaRect(main.pts);
    sitePolys.push({ key, pts:main.pts });
    if (rule.kind === 'ellipse'){
      sites[key] = { x:r1(rr.cx), z:r1(rr.cz), rot:r4(rotX(rr.dir)), a:r1(rr.len/2), b:r1(rr.wid/2) };
    } else {
      // il campo dentro lo stadio dà l'orientamento migliore
      const pitch = all.find(s => s.kind === 'poly' && isTennis(s.tags) && s !== main && inPoly(main.pts, ...centroid(s.pts)));
      const pr = pitch ? minAreaRect(pitch.pts) : rr;
      sites[key] = { x:r1(pitch ? pr.cx : rr.cx), z:r1(pitch ? pr.cz : rr.cz), rot:r4(rotZ(pr.dir)) };
    }
    report.sites[key] = main.id;
  }
  // l'arena del 2026 sta al centro dello Stadio dei Marmi: se OSM non ce l'ha ancora la si mette lì
  if (!sites.arena && sites.marmi){
    sites.arena = { x:sites.marmi.x, z:sites.marmi.z, rot:r4(normAngle(sites.marmi.rot + Math.PI/2)) };
    report.sites.arena = 'dedotta dallo Stadio dei Marmi';
  }
  // ingresso degli stadi rivolto verso il viale (o verso il centro dell'area)
  const aim = sites.viale || sites.fontana || { x:(x0+x1)/2, z:(z0+z1)/2 };
  for (const key of ['centrale', 'pietrangeli', 'supertennis', 'arena']){
    const s = sites[key]; if (!s) continue;
    if (Math.sin(s.rot)*(aim.x - s.x) + Math.cos(s.rot)*(aim.z - s.z) < 0) s.rot = r4(normAngle(s.rot + Math.PI));
  }
  // correzioni manuali
  for (const [key, o] of Object.entries(overrides.sites || {})){
    const rule = SITES[key]; if (!rule) continue;
    const s = sites[key] = { ...(sites[key] || {}) };
    if (o.lat != null && o.lon != null){ const [x, z] = P.xz(o.lat, o.lon); s.x = r1(x); s.z = r1(z); }
    if (o.bearing != null) s.rot = r4(normAngle(rotFromBearing(rule.kind, o.bearing)));
    for (const k of ['a', 'b', 'len', 'wid']) if (o[k] != null) s[k] = o[k];
    if (s.rot == null && rule.kind !== 'point') s.rot = 0;
    report.sites[key] = (report.sites[key] ? report.sites[key] + ' + ' : '') + 'overrides.json';
  }
  const insideSite = (x, z, pad = 0) => sitePolys.some(sp => inPoly(sp.pts, x, z)) ||
    ['centrale', 'pietrangeli', 'supertennis', 'arena'].some(k => sites[k] && Math.hypot(x - sites[k].x, z - sites[k].z) < 22 + pad);

  // campi da tennis e da padel fuori dagli stadi
  const courts = [], padel = [];
  for (const s of all){
    if (s.kind !== 'poly' || !(isTennis(s.tags) || isPadel(s.tags))) continue;
    const ar = area(s.pts), [cx, cz] = centroid(s.pts);
    if (ar < 150 || ar > 2000 || insideSite(cx, cz)) continue;
    const rr = minAreaRect(s.pts), c = { x:r1(rr.cx), z:r1(rr.cz), rot:r4(rotZ(rr.dir)) };
    (isPadel(s.tags) ? padel : courts).push(c);
  }
  if (!sites.padel && padel.length){
    const ref = sites.viale || sites.fontana || { x:0, z:0 };
    padel.sort((a, b) => Math.hypot(a.x - ref.x, a.z - ref.z) - Math.hypot(b.x - ref.x, b.z - ref.z));
    sites.padel = padel.shift(); report.sites.padel = 'campo da padel più vicino al viale';
  }
  for (const key of Object.keys(SITES)) if (!sites[key] || sites[key].x == null) { delete sites[key]; report.missing.push(key); }

  // fiume: linee d'asse del Tevere unite in un'unica spezzata
  const riverLines = all.filter(s => s.kind === 'line' && /river|canal/.test(s.tags.waterway || ''));
  const water = joinLines(riverLines.map(s => s.pts)).map(pts => ({
    pts: simplify(pts, 2).map(p => [r1(p[0]), r1(p[1])]),
    w: parseFloat(riverLines[0].tags.width) || 70,
  })).filter(w => w.pts.length > 1);

  // strade, percorsi e ponti
  const WIDTH = { motorway:14, trunk:14, primary:12, secondary:11, tertiary:10, residential:7, unclassified:7, living_street:6, service:5,
                  pedestrian:6, footway:3, path:2.5, cycleway:2.5, steps:3, bridleway:2.5, track:3 };
  const lines = [], paved = [], bridges = [];
  for (const s of all){
    const t = s.tags, hw = (t.highway || '').replace(/_link$/, '');
    if (SITES.viale.test(t) || SITES.ponte.test(t)) continue;
    if (t['area:highway'] && s.kind === 'poly'){ paved.push(s.pts); continue; }
    if (!hw || !(hw in WIDTH)) continue;
    if (t.tunnel && t.tunnel !== 'no' || t.covered === 'yes' || parseInt(t.layer || '0', 10) < 0) continue;
    if (s.kind === 'poly' && (t.area === 'yes' || hw === 'pedestrian')){ paved.push(s.pts); continue; }
    const pts = s.kind === 'poly' ? s.pts.concat([s.pts[0]]) : s.pts;
    const kind = ['pedestrian','footway','path','cycleway','steps','bridleway','track'].includes(hw) ? 'foot' : 'road';
    const w = parseFloat(t.width) || WIDTH[hw];
    if (t.bridge && t.bridge !== 'no' && water.some(wt => lineCrosses(pts, wt.pts))){
      const a = pts[0], b = pts[pts.length-1];
      bridges.push({ x:r1((a[0]+b[0])/2), z:r1((a[1]+b[1])/2), rot:r4(Math.atan2(-(b[1]-a[1]), b[0]-a[0])), len:r1(dist(a, b)), wid:r1(w + 2) });
      continue;
    }
    lines.push({ pts: simplify(pts, .5).map(p => [r1(p[0]), r1(p[1])]), w, kind });
  }
  if (sites.ponte){ // niente doppioni del ponte principale
    for (let i = bridges.length - 1; i >= 0; i--) if (Math.hypot(bridges[i].x - sites.ponte.x, bridges[i].z - sites.ponte.z) < sites.ponte.len/2) bridges.splice(i, 1);
  }

  // edifici (gli stadi sono disegnati dal gioco)
  const buildings = [];
  for (const s of all){
    const t = s.tags;
    if (s.kind !== 'poly' || !t.building || /^(roof|grandstand|stadium|construction|no)$/.test(t.building) || t['building:part']) continue;
    const [cx, cz] = centroid(s.pts);
    if (insideSite(cx, cz) || area(s.pts) < 12) continue;
    const h = parseFloat(t.height) || (parseFloat(t['building:levels']) ? parseFloat(t['building:levels'])*3.3 + 1 : 9);
    buildings.push({ pts: simplify(s.pts.concat([s.pts[0]]), .4).slice(0, -1).map(p => [r1(p[0]), r1(p[1])]),
      holes: (s.holes || []).map(hh => hh.map(p => [r1(p[0]), r1(p[1])])), h: r1(Math.min(45, Math.max(3, h))) });
  }

  // alberi
  const trees = [];
  for (const s of all){
    if (s.kind === 'point' && s.tags.natural === 'tree') trees.push(s.pts[0]);
    if (s.kind === 'line' && s.tags.natural === 'tree_row'){
      for (let i = 1; i < s.pts.length; i++){
        const a = s.pts[i-1], b = s.pts[i], n = Math.max(1, Math.floor(dist(a, b)/9));
        for (let k = 0; k < n; k++) trees.push([a[0] + (b[0]-a[0])*k/n, a[1] + (b[1]-a[1])*k/n]);
      }
    }
  }

  // punto di partenza: capo del viale verso il ponte, rivolti verso la fontana, con l'obelisco alle spalle ma non addosso
  let start;
  if (sites.viale){
    const v = sites.viale, ux = Math.cos(v.rot), uz = -Math.sin(v.rot), k = Math.max(0, v.len/2 - 24);
    const ends = [[v.x + ux*k, v.z + uz*k], [v.x - ux*k, v.z - uz*k]];
    const ref = sites.ponte || sites.obelisco || { x:x1, z:0 };
    ends.sort((a, b) => Math.hypot(a[0] - ref.x, a[1] - ref.z) - Math.hypot(b[0] - ref.x, b[1] - ref.z));
    const [sx, sz] = ends[0];
    start = { x:r1(sx), z:r1(sz), ry:r4(Math.atan2(v.x - sx, v.z - sz)) };
  } else if (sites.centrale){
    start = { x:r1(sites.centrale.x), z:r1(sites.centrale.z + 40), ry:Math.PI };
  }

  const pad = 15;
  let bounds = { x0:r1(x0 + pad), x1:r1(x1 - pad), z0:r1(z0 + pad), z1:r1(z1 - pad) };
  let pavedOut = paved.map(p => simplify(p.concat([p[0]]), .4).slice(0, -1).map(q => [r1(q[0]), r1(q[1])]));
  let treesOut = trees.map(p => [r1(p[0]), r1(p[1])]);
  let linesOut = lines, buildingsOut = buildings, courtsOut = courts, padelOut = padel, bridgesOut = bridges;

  // area giocabile ridotta al Foro (overrides.crop, in gradi): fuori resta solo lo sfondo entro 150 m
  if (overrides.crop){
    const c = overrides.crop, [cx0, cz0] = P.xz(c.north, c.west), [cx1, cz1] = P.xz(c.south, c.east);
    bounds = { x0: r1(Math.min(cx0, cx1)), x1: r1(Math.max(cx0, cx1)), z0: r1(Math.min(cz0, cz1)), z1: r1(Math.max(cz0, cz1)) };
    const inB = ([x, z], m) => x > bounds.x0 - m && x < bounds.x1 + m && z > bounds.z0 - m && z < bounds.z1 + m;
    buildingsOut = buildingsOut.filter(b => inB(centroid(b.pts), 150));
    linesOut = linesOut.filter(l => l.pts.some(q => inB(q, 150)));
    pavedOut = pavedOut.filter(q => inB(centroid(q), 150));
    treesOut = treesOut.filter(q => inB(q, 0));
    courtsOut = courtsOut.filter(q => inB([q.x, q.z], 0));
    padelOut = padelOut.filter(q => inB([q.x, q.z], 0));
    bridgesOut = bridgesOut.filter(q => inB([q.x, q.z], 150));
  }
  // spazio del fan village (overrides.village): lì si tolgono edifici, strade, alberi e campi di OSM
  let village = null;
  if (overrides.village){
    const v = overrides.village, [vx, vz] = P.xz(v.lat, v.lon), rot = normAngle(rotFromBearing('stadium', v.bearing ?? 0));
    village = { x: r1(vx), z: r1(vz), rot: r4(rot), w: v.w ?? 90, l: v.l ?? 64 };
    const c = Math.cos(rot), s = Math.sin(rot), m = 4;
    const inside = ([x, z]) => { const dx = x - vx, dz = z - vz; return Math.abs(dx*c - dz*s) < village.w/2 + m && Math.abs(dx*s + dz*c) < village.l/2 + m; };
    const touches = pts => pts.some(inside) || inside(centroid(pts));
    buildingsOut = buildingsOut.filter(b => !touches(b.pts));
    linesOut = linesOut.map(l => ({ ...l, pts: l.pts })).flatMap(l => {       // le strade si interrompono al bordo del village
      const parts = []; let cur = [];
      for (const q of l.pts){ if (inside(q)){ if (cur.length > 1) parts.push(cur); cur = []; } else cur.push(q); }
      if (cur.length > 1) parts.push(cur);
      return parts.map(pts => ({ ...l, pts }));
    });
    pavedOut = pavedOut.filter(q => !touches(q));
    treesOut = treesOut.filter(q => !inside(q));
    courtsOut = courtsOut.filter(q => !inside([q.x, q.z]));
    padelOut = padelOut.filter(q => !inside([q.x, q.z]));
  }
  const layout = {
    version: 1, source: 'osm', attribution: ATTRIBUTION, generated: now.toISOString(),
    origin: { lat:lat0, lon:lon0 }, bbox, bounds,
    start, sites, courts: courtsOut, padel: padelOut, paved: pavedOut,
    lines: linesOut, bridges: bridgesOut, water, buildings: buildingsOut, trees: treesOut.slice(0, 2500), backdrop: false, village,
  };
  report.counts = { campi:layout.courts.length, padel:layout.padel.length, edifici:layout.buildings.length, percorsi:layout.lines.length, aree_pavimentate:layout.paved.length,
    ponti:bridges.length + (sites.ponte ? 1 : 0), tratti_fiume:water.length, alberi:layout.trees.length };
  report.bearings = Object.fromEntries(Object.entries(sites).filter(([k, s]) => s.rot != null).map(([k, s]) => [k, bearingFromRot(SITES[k].kind, s.rot)]));
  return { layout, report };
}

/* ---------- download da Overpass ----------
   I server pubblici tagliano le richieste lunghe: si manda una richiesta per ogni istruzione della query
   e si uniscono i risultati. Con Node 22 dietro un proxy serve NODE_USE_ENV_PROXY=1. */
export const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
export function splitQuery(query){
  const q = query.replace(/\/\*[\s\S]*?\*\//g, '');
  const head = q.slice(0, q.indexOf('(')).trim(), body = q.slice(q.indexOf('(') + 1, q.lastIndexOf(')'));
  const out = q.slice(q.lastIndexOf(')') + 1).replace(/^\s*;/, '').trim();
  return body.split(';').map(x => x.trim()).filter(Boolean).map(st => `${head}\n(${st};);\n${out}`);
}
async function fetchOverpass(query){
  const endpoints = process.env.OVERPASS_URL ? [process.env.OVERPASS_URL] : ENDPOINTS, seen = new Map(), failed = [];
  const cacheDir = path.join(ROOT, 'data/osm/parts');
  await mkdir(cacheDir, { recursive:true });
  for (const [i, part] of splitQuery(query).entries()){
    const cache = path.join(cacheDir, `${String(i).padStart(2, '0')}.json`), first = part.split('\n')[1];
    if (existsSync(cache)){ // pezzo già scaricato in un tentativo precedente
      const c = JSON.parse(await readFile(cache, 'utf8'));
      if (c.part === part){ for (const el of c.elements) seen.set(`${el.type}/${el.id}`, el); console.log(`  ${first}  → dalla cache`); continue; }
    }
    let ok = false, last = '';
    for (let attempt = 0; attempt < 4 && !ok; attempt++){
      for (const ep of endpoints){
        try {
          const res = await fetch(ep, { method:'POST', body:'data=' + encodeURIComponent(part), signal: AbortSignal.timeout(90000),
            headers:{ 'content-type':'application/x-www-form-urlencoded', 'user-agent':'foro-italico-world/0.3 (FITP eSports prototype)', accept:'application/json' } });
          const text = await res.text();
          if (!res.ok) { last = `${new URL(ep).host} ${res.status}`; continue; }
          const elements = JSON.parse(text).elements || [];
          for (const el of elements) seen.set(`${el.type}/${el.id}`, el);
          await writeFile(cache, JSON.stringify({ part, elements }));
          ok = true; break;
        } catch (e) { last = `${new URL(ep).host} ${e.cause?.code || e.message}`; }
      }
      if (!ok) await new Promise(r => setTimeout(r, 3000*2**attempt));
    }
    if (!ok){ failed.push(first); console.log(`  ${first}  → NON SCARICATO (${last})`); continue; }
    console.log(`  ${first}  → ${seen.size} elementi in totale`);
  }
  if (failed.length) throw new Error(`mancano ${failed.length} pezzi (${failed.join(' ')}): rilancia --fetch, quelli già scaricati restano in data/osm/parts`);
  return { version:0.6, generator:'foro-italico-world', elements:[...seen.values()] };
}

/* ---------- riga di comando ---------- */
async function main(argv){
  const arg = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i+1] : def; };
  const query = await readFile(PATHS.query, 'utf8');
  const bbox = parseBBox(query);
  const rawPath = path.resolve(arg('--in', PATHS.raw));
  if (argv.includes('--fetch')){
    const raw = await fetchOverpass(query);
    await mkdir(path.dirname(rawPath), { recursive:true });
    await writeFile(rawPath, JSON.stringify(raw));
    console.log(`Dati grezzi salvati in ${path.relative(ROOT, rawPath)} (${raw.elements.length} elementi)`);
  }
  if (!existsSync(rawPath)) throw new Error(`Manca ${path.relative(ROOT, rawPath)}: usa --fetch oppure esporta la query di tools/foro-italico.overpassql da overpass-turbo.eu`);
  const raw = JSON.parse(await readFile(rawPath, 'utf8'));
  const ovPath = path.resolve(arg('--overrides', PATHS.overrides));
  const overrides = existsSync(ovPath) ? JSON.parse(await readFile(ovPath, 'utf8')) : {};
  const { layout, report } = buildLayout(raw, { bbox, overrides });

  console.log('\nImpianti trovati:');
  for (const [k, v] of Object.entries(report.sites)) console.log(`  ${k.padEnd(12)} ${v}${report.bearings[k] != null ? `  (bearing ${report.bearings[k]}°)` : ''}`);
  if (report.missing.length) console.log(`\nNon trovati: ${report.missing.join(', ')}. Aggiungili in data/osm/overrides.json (lat, lon, bearing).`);
  console.log('\nConteggi:', Object.entries(report.counts).map(([k, v]) => `${k} ${v}`).join(' · '));
  if (!layout.sites.centrale) throw new Error('Il Campo Centrale è indispensabile: aggiungilo in data/osm/overrides.json');

  const outPath = path.resolve(arg('--out', PATHS.out));
  await mkdir(path.dirname(outPath), { recursive:true });
  await writeFile(outPath, JSON.stringify(layout) + '\n');
  console.log(`\nScritto ${path.relative(ROOT, outPath)} (${Math.round(JSON.stringify(layout).length/1024)} kB). Ricorda l'attribuzione: ${ATTRIBUTION}.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href){
  main(process.argv.slice(2)).catch(e => { console.error('Errore: ' + e.message); process.exit(1); });
}
