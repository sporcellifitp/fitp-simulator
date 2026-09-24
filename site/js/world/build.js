// Costruzione del mondo statico a partire dalla planimetria (layout.json o schema interno).
import * as THREE from 'three';
import { frame, rand, clamp } from '../core/util.js';
import { colliders, occupied, addRect, addEll, addPoly, addLine, hits, bridgeFrames, onBridge } from './collision.js';
import { BOX, mat, box, flat, shapeOf, polyFlat, offsetLine, ribbon, clipPoly, instParts, canvasTex, courtTexture, mosaicTex, batchStatic, segRot } from './geom.js';

export function buildWorld(W){
  const { scene } = W.engine, LAYOUT = W.layout, S = LAYOUT.sites, BOUNDS = LAYOUT.bounds;
  const rect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  // lo spazio del fan village resta libero (alberi compresi): lo costruisce world/village.js
  if (LAYOUT.village){ const v = LAYOUT.village; addRect(occupied, v.x, v.z, v.w/2 + 3, v.l/2 + 3, v.rot || 0); }
  /* ---------- palette ---------- */
  const C = {
    grass:0x79a052, grass2:0x6b9449, trav:0xe4d8c0, trav2:0xd3c5a8, marble:0xf2ede3, clay:0xc4623a,
    water:0x4f7f86, navy:0x0b2a5b, blue:0x1f4fa3, sky:0x2b7bd6, trunk:0x7a5b3e, fence:0x2f4a3a, road:0x74767a,
  };

  /* ---------- impianti: dimensioni ---------- */
  const DIM = {
    centrale:    { w:18.3, l:36.6, tiers:12, step:1.25, rise:.9 },
    arena:       { w:18.3, l:36.6, tiers:9,  step:1.2,  rise:.8 },
    supertennis: { w:17,   l:34,   tiers:5,  step:1.2,  rise:.8 },
  };
  const P = {};
  if (S.pietrangeli){
    const p = P.pietr = { ...S.pietrangeli, w:17, l:34, n:4, step:1.6, rise:.55 };
    p.D = p.n*p.rise; p.hw = p.w/2 + p.n*p.step; p.hl = p.l/2 + p.n*p.step; p.f = frame(p);
  }
  if (S.marmi){
    const m = P.marmi = { ...S.marmi, n:6, step:2.2, rise:.5 };
    m.step = Math.min(m.step, (Math.min(m.a, m.b) - 26)/m.n);
    m.a0 = m.a - m.n*m.step; m.b0 = m.b - m.n*m.step; m.D = m.n*m.rise; m.f = frame(m);
  }
  if (S.olimpico){ const o = P.olimpico = { ...S.olimpico }; o.a0 = o.a*.62; o.b0 = o.b*.57; }
  const CF = frame(S.centrale);
  const PF = S.padel ? frame(S.padel) : null;

  /* ---------- altezza del terreno (impianti ribassati) ---------- */
  function groundH(x,z){
    const m = P.marmi;
    if (m){
      const [dx,dz] = m.f.l(x,z);
      if ((dx/m.a)**2 + (dz/m.b)**2 < 1){
        if ((dx/m.a0)**2 + (dz/m.b0)**2 < 1) return -m.D;
        for (let k=0;k<m.n;k++) if ((dx/(m.a0+(k+1)*m.step))**2 + (dz/(m.b0+(k+1)*m.step))**2 < 1) return -m.D + (k+1)*m.rise;
        return 0;
      }
    }
    const p = P.pietr;
    if (p){
      const [lx,lz] = p.f.l(x,z);
      if (Math.abs(lx) < p.hw && Math.abs(lz) < p.hl){
        const e = Math.max(Math.abs(lx) - p.w/2, Math.abs(lz) - p.l/2);
        return e <= 0 ? -p.D : -p.D + (Math.floor(e/p.step) + 1)*p.rise;
      }
    }
    return 0;
  }

  /* ---------- acqua: il Tevere come nastro con argini ---------- */
  const MARGIN = 200;
  const GB = { x0:BOUNDS.x0 - MARGIN, x1:BOUNDS.x1 + MARGIN, z0:BOUNDS.z0 - MARGIN, z1:BOUNDS.z1 + MARGIN };
  const rivers = (LAYOUT.water || []).filter(r => r.pts && r.pts.length > 1).map(r => {
    const poly = clipPoly(offsetLine(r.pts, r.w/2).concat(offsetLine(r.pts, -r.w/2).reverse()), GB.x0+10, GB.x1-10, GB.z0+10, GB.z1-10);
    return { ...r, poly };
  }).filter(r => r.poly.length > 2);

  /* ---------- terreno con i buchi di fiume e impianti ribassati ---------- */
  {
    const holes = rivers.map(r => r.poly);
    if (P.pietr){ const p = P.pietr; holes.push([[-p.hw,-p.hl],[p.hw,-p.hl],[p.hw,p.hl],[-p.hw,p.hl]].map(([a,b]) => p.f.w(a,b))); }
    const gs = shapeOf(rect(GB.x0, GB.x1, GB.z0, GB.z1), holes);
    if (P.marmi){ const m = P.marmi, eh = new THREE.Path(); eh.absellipse(m.x, -m.z, m.a, m.b, 0, Math.PI*2, false, m.rot || 0); gs.holes.push(eh); }
    const g = new THREE.ShapeGeometry(gs, 64); g.rotateX(-Math.PI/2);
    const ground = new THREE.Mesh(g, mat(C.grass)); ground.receiveShadow = true; scene.add(ground);
  }


  /* ---------- percorsi, strade, edifici ---------- */
  const pathMat = new THREE.MeshLambertMaterial({ color: C.trav });
  const roadMat = new THREE.MeshLambertMaterial({ color: C.road });
  if (S.viale){
    const v = S.viale, f = frame(v);
    flat(v.len, v.wid, v.x, 0.07, v.z, new THREE.MeshLambertMaterial({ map: mosaicTex([Math.max(1, Math.round(v.len/v.wid)), 1]) }), f.rot);
    addRect(occupied, v.x, v.z, v.len/2, v.wid/2, f.rot);
  }
  for (const pts of LAYOUT.paved || []){ polyFlat(pts, 0.05, pathMat); addPoly(occupied, pts); }
  for (const ln of LAYOUT.lines || []){
    if (!ln.pts || ln.pts.length < 2) continue;
    ribbon(ln.pts, ln.w, ln.kind === 'road' ? 0.045 : 0.055, ln.kind === 'road' ? roadMat : pathMat);
    addLine(occupied, ln.pts, ln.w/2);
  }
  {
    const tones = [0xe9e1cf, 0xdcd3bf, 0xefe8d8, 0xd9cdb4];
    for (const b of LAYOUT.buildings || []){
      const g = new THREE.ExtrudeGeometry(shapeOf(b.pts, b.holes || []), { depth: b.h, bevelEnabled:false }); g.rotateX(-Math.PI/2);
      const m = new THREE.Mesh(g, mat(tones[(Math.abs(Math.round(b.pts[0][0]*7 + b.pts[0][1]*3))) % tones.length]));
      m.castShadow = true; m.receiveShadow = true; scene.add(m);
      addPoly(colliders, b.pts); addPoly(occupied, b.pts);
    }
  }

  /* ---------- campi ---------- */
  const netMat = new THREE.MeshLambertMaterial({ color: 0x1f2a2e, transparent: true, opacity: .78 });
  function court(f, w, l, y){
    flat(w, l, f.x, y + 0.04, f.z, new THREE.MeshLambertMaterial({ map: courtTexture(w,l) }), f.rot);
    box(12.8, 0.92, 0.04, 0, 0, y, 0, { f, material: netMat });
    box(12.8, 0.07, 0.07, 0xffffff, 0, y + 0.9, 0, { f });
    box(0.1, 1.07, 0.1, 0x27352f, -6.4, y, 0, { f }); box(0.1, 1.07, 0.1, 0x27352f, 6.4, y, 0, { f });
    addRect(colliders, f.x, f.z, 6.45, .12, f.rot);
    addRect(occupied, f.x, f.z, w/2, l/2, f.rot);
  }

  /* ---------- stadi con gradoni (ingresso sul lato +z locale) ---------- */
  const crowd = [];
  const shirts = [0x1f4fa3, 0xffffff, 0xd8342c, 0xf3c623, 0x2b7bd6, 0x2f8f57, 0x0b2a5b, 0xf08a3c, 0xe9e2d0];
  function stadium(o){
    const { w, l, tiers, step, rise, colors, top, gap = 8, fill = 0.7, y0 = 0 } = o, f = frame(o);
    for (let i=0;i<tiers;i++){
      const off = i*step, h = (i+1)*rise, col = (i === tiers-1 && top) ? top : colors[i % colors.length];
      const outerW = w + 2*(off+step), sideL = l + 2*off;
      const zn = -l/2 - off - step/2, zs = l/2 + off + step/2, xe = w/2 + off + step/2;
      box(outerW, h, step, col, 0, y0, zn, { f, collide:true });
      const lMin = -outerW/2, lMax = -gap/2, lw = lMax - lMin, lc = (lMin+lMax)/2;
      box(lw, h, step, col, lc, y0, zs, { f, collide:true });
      box(lw, h, step, col, -lc, y0, zs, { f, collide:true });
      box(step, h, sideL, col, xe, y0, 0, { f, collide:true });
      box(step, h, sideL, col, -xe, y0, 0, { f, collide:true });
      const addRow = (x0,x1,z0,z1) => {
        const len = Math.hypot(x1-x0, z1-z0), n = Math.floor(len/0.95);
        for (let k=0;k<n;k++){
          if (Math.random() > fill) continue;
          const u = (k+.5)/n, px = x0 + (x1-x0)*u, pz = z0 + (z1-z0)*u;
          if (Math.abs(px) < gap/2 + .3 && pz > 0) continue;
          const [wx, wz] = f.w(px, pz);
          crowd.push({ x:wx, y:y0 + h, z:wz, ry:f.rot, c: shirts[(Math.random()*shirts.length)|0], k: Math.random() });
        }
      };
      addRow(-outerW/2 + .5, outerW/2 - .5, zn, zn);
      addRow(-outerW/2 + .5, outerW/2 - .5, zs, zs);
      addRow(xe, xe, -sideL/2 + .5, sideL/2 - .5);
      addRow(-xe, -xe, -sideL/2 + .5, sideL/2 - .5);
    }
    const R = w/2 + tiers*step, L = l/2 + tiers*step;
    addRect(occupied, o.x, o.z, R+1, L+1, f.rot);
    court(f, w, l, y0);
    return { f, R, L, top: y0 + tiers*rise };
  }
  {
    const c = stadium({ ...S.centrale, ...DIM.centrale, colors:[0xd4cdbd, 0xc2baa7], top: C.blue, fill: .78 });
    // tabellone sul lato opposto all'ingresso
    box(10, 3.2, 0.6, 0x0d1624, 0, c.top + .2, -c.L + .4, { f:c.f });
    box(9.2, 2.5, 0.1, 0x1f4fa3, 0, c.top + .55, -c.L + .75, { f:c.f, cast:false });
    if (S.supertennis) stadium({ ...S.supertennis, ...DIM.supertennis, colors:[0xd2cbbb, 0xbfb6a2], top: C.sky, fill: .5 });
  }

  /* ---------- Stadio Pietrangeli: campo ribassato tra gradoni e statue ---------- */
  const statues = [];
  if (P.pietr){
    const p = P.pietr, f = p.f;
    for (let k=0;k<p.n;k++){
      const top = (k+1)*p.rise, ihw = p.w/2 + k*p.step, ihl = p.l/2 + k*p.step, col = k % 2 ? C.trav : C.trav2;
      box(2*(ihw+p.step), top, p.step, col, 0, -p.D, -ihl - p.step/2, { f });
      box(2*(ihw+p.step), top, p.step, col, 0, -p.D, ihl + p.step/2, { f });
      box(p.step, top, 2*ihl, col, -ihw - p.step/2, -p.D, 0, { f });
      box(p.step, top, 2*ihl, col, ihw + p.step/2, -p.D, 0, { f });
    }
    court(f, p.w, p.l, -p.D);
    addRect(occupied, p.x, p.z, p.hw + 2, p.hl + 2, f.rot);
    // statue sul bordo
    const per = [];
    for (let i=0;i<5;i++) per.push([-p.hw + 3 + i*(2*p.hw-6)/4, -p.hl + .9]);
    for (let i=0;i<5;i++) per.push([-p.hw + 3 + i*(2*p.hw-6)/4, p.hl - .9]);
    for (let i=0;i<4;i++) per.push([-p.hw + .9, -p.hl + 8 + i*(2*p.hl-16)/3]);
    for (let i=0;i<4;i++) per.push([p.hw - .9, -p.hl + 8 + i*(2*p.hl-16)/3]);
    for (const [lx,lz] of per){ const [sx,sz] = f.w(lx,lz); statues.push({ x:sx, y:0, z:sz, ry: Math.atan2(p.x - sx, p.z - sz), s:.95, arm: Math.random() < .5 }); }
  }

  /* ---------- Stadio dei Marmi: anello ribassato con le statue e, dal 2026, l'arena al centro ---------- */
  let arena = null;
  if (P.marmi){
    const m = P.marmi, rot = m.rot || 0;
    for (let k=0;k<m.n;k++){
      const sh = new THREE.Shape(); sh.absellipse(0,0, m.a0+(k+1)*m.step, m.b0+(k+1)*m.step, 0, Math.PI*2, false);
      const hole = new THREE.Path(); hole.absellipse(0,0, m.a0+k*m.step, m.b0+k*m.step, 0, Math.PI*2, true); sh.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(sh, { depth:(k+1)*m.rise, bevelEnabled:false, curveSegments:72 });
      g.rotateX(-Math.PI/2);
      const mesh = new THREE.Mesh(g, mat(k % 2 ? C.marble : 0xe6dfd0));
      mesh.position.set(m.x, -m.D, m.z); mesh.rotation.y = rot; mesh.receiveShadow = true; mesh.castShadow = true; scene.add(mesh);
    }
    const disk = (a,b,col,y) => { const sh = new THREE.Shape(); sh.absellipse(0,0,a,b,0,Math.PI*2,false);
      const g = new THREE.ShapeGeometry(sh, 72); g.rotateX(-Math.PI/2);
      const mesh = new THREE.Mesh(g, mat(col)); mesh.position.set(m.x, y, m.z); mesh.rotation.y = rot; mesh.receiveShadow = true; scene.add(mesh); };
    disk(m.a0, m.b0, 0xb5533a, -m.D + .01);
    disk(m.a0-7, m.b0-7, C.grass2, -m.D + .02);
    for (let i=1;i<6;i++){
      const r = i*7/6, pts = new THREE.EllipseCurve(0,0, m.a0-7+r, m.b0-7+r, 0, Math.PI*2).getPoints(120);
      const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, 0, -p.y)));
      const line = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: 0xf4ede0, transparent:true, opacity:.8 }));
      line.position.set(m.x, -m.D + .04, m.z); line.rotation.y = rot; scene.add(line);
    }
    for (let i=0;i<60;i++){
      const t = i/60*Math.PI*2, [sx,sz] = m.f.w(Math.cos(t)*(m.a - m.step*.5), Math.sin(t)*(m.b - m.step*.5));
      statues.push({ x:sx, y:0, z:sz, ry: Math.atan2(m.x - sx, m.z - sz), s:1.05, arm: i % 3 === 0 });
    }
    addEll(occupied, m.x, m.z, m.a + 2, m.b + 2, rot);
  }
  if (S.arena){
    const y0 = groundH(S.arena.x, S.arena.z);
    arena = stadium({ ...S.arena, ...DIM.arena, y0, colors:[0xdcdcd6, 0xc9c9c2], top: 0x13795b, fill: .66 });
  }

  /* ---------- Stadio Olimpico, sullo sfondo ---------- */
  if (P.olimpico){
    const o = P.olimpico, rot = o.rot || 0, f = frame(o);
    const ring = (a,b,a0,b0,depth,col,y,op) => {
      const sh = new THREE.Shape(); sh.absellipse(0,0,a,b,0,Math.PI*2,false);
      const h = new THREE.Path(); h.absellipse(0,0,a0,b0,0,Math.PI*2,true); sh.holes.push(h);
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled:false, curveSegments:80 }); g.rotateX(-Math.PI/2);
      const material = op ? new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: op }) : mat(col);
      const mesh = new THREE.Mesh(g, material); mesh.position.set(o.x, y, o.z); mesh.rotation.y = rot; mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    };
    ring(o.a, o.b, o.a0, o.b0, 21, 0xe3ded4, 0);
    ring(o.a + 1.5, o.b + 1.5, o.a0 + 7, o.b0 + 7, .7, 0xffffff, 23.5, .9);
    for (let i=0;i<28;i++){ const t = i/28*Math.PI*2; box(.5, 2.6, .5, 0xcfd3d6, Math.cos(t)*(o.a+.8), 21, Math.sin(t)*(o.b+.8), { f, cast:false }); }
    addEll(colliders, o.x, o.z, o.a, o.b, rot);
    addEll(occupied, o.x, o.z, o.a + 4, o.b + 4, rot);
  }

  /* ---------- Fontana della Sfera ---------- */
  if (S.fontana){
    const f = S.fontana;
    const cyl = (rt,rb,h,col,y,seg=36) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), mat(col)); m.position.set(f.x,y,f.z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
    cyl(7, 7.2, .7, C.trav2, .35);
    cyl(6.5, 6.5, .1, 0x86bccb, .64);
    cyl(.9, 1.3, 1.3, C.marble, 1.3);
    const sp = new THREE.Mesh(new THREE.SphereGeometry(2.2, 28, 18), mat(0xf4efe6)); sp.position.set(f.x, 4.1, f.z); sp.castShadow = true; scene.add(sp);
    addEll(colliders, f.x, f.z, 7.3, 7.3);
    addEll(occupied, f.x, f.z, 9, 9);
  }

  /* ---------- obelisco all'inizio del viale (solo volume, senza iscrizioni) ---------- */
  if (S.obelisco){
    const o = S.obelisco;
    box(5, 2.4, 5, C.trav2, o.x, 0, o.z, { collide:true });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.85, 1.25, 17, 4, 1), mat(C.marble));
    shaft.rotation.y = Math.PI/4 + (S.viale ? frame(S.viale).rot : 0); shaft.position.set(o.x, 2.4 + 8.5, o.z); shaft.castShadow = true; scene.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.85, 1.6, 4), mat(C.marble));
    tip.rotation.y = shaft.rotation.y; tip.position.set(o.x, 2.4 + 17 + .8, o.z); tip.castShadow = true; scene.add(tip);
    addRect(occupied, o.x, o.z, 4, 4);
  }

  /* ---------- Tevere e ponti ---------- */
  const bridges = (LAYOUT.bridges || []).slice();
  if (S.ponte) bridges.unshift(S.ponte);
  for (const b of bridges){ const f = frame(b); f.len = b.len; f.wid = b.wid; bridgeFrames.push(f); }
  for (const r of rivers){
    const d = r.w/2;
    polyFlat(r.poly, -1.7, new THREE.MeshLambertMaterial({ color: C.water }));
    for (const side of [d, -d]){
      const bank = offsetLine(r.pts, side), rail = offsetLine(r.pts, side + Math.sign(side)*.6);
      for (let i = 0; i < bank.length - 1; i++){
        const [ax,az] = bank[i], [bx,bz] = bank[i+1], len = Math.hypot(bx-ax, bz-az), mx = (ax+bx)/2, mz = (az+bz)/2;
        if (mx < GB.x0 || mx > GB.x1 || mz < GB.z0 || mz > GB.z1) continue;
        const rot = segRot(ax,az,bx,bz);
        box(len + .4, 4, .8, C.trav2, mx, -4, mz, { rot, cast:false });
        // parapetto del lungotevere, interrotto sui ponti
        const [cx,cz] = rail[i], [ex,ez] = rail[i+1], steps = Math.max(1, Math.ceil(Math.hypot(ex-cx, ez-cz)/6));
        for (let k = 0; k < steps; k++){
          const u0 = k/steps, u1 = (k+1)/steps, px = cx + (ex-cx)*(u0+u1)/2, pz = cz + (ez-cz)*(u0+u1)/2;
          if (onBridge(px, pz) || px < BOUNDS.x0 - 60 || px > BOUNDS.x1 + 60 || pz < BOUNDS.z0 - 60 || pz > BOUNDS.z1 + 60) continue;
          box(Math.hypot(ex-cx, ez-cz)/steps + .05, 1, .6, C.trav, px, 0, pz, { rot, cast:false });
        }
      }
    }
    addLine(colliders, r.pts, d + .6, 'w');
    addLine(occupied, r.pts, d + 4);
  }
  for (const f of bridgeFrames){
    box(f.len + 2, .9, f.wid, C.trav, 0, -.9, 0, { f });
    box(f.len + 2, 1, .6, C.trav2, 0, 0, -f.wid/2 + .3, { f, collide:true });
    box(f.len + 2, 1, .6, C.trav2, 0, 0, f.wid/2 - .3, { f, collide:true });
    const nA = Math.max(1, Math.round(f.len/9));
    for (let i = 0; i < nA; i++) box(2.4, 1.2, f.wid - 1, C.trav2, -f.len/2 + (i+.5)*f.len/nA, -2.1, 0, { f, cast:false });
    addRect(occupied, f.x, f.z, f.len/2 + 2, f.wid/2 + 2, f.rot);
  }

  /* ---------- campi esterni con recinzione ---------- */
  for (const c of LAYOUT.courts || []){
    const w = 18.3, l = 36.6, h = 2.2, t = .15, open = 3, f = frame(c);
    court(f, w, l, 0);
    box(w, h, t, C.fence, 0, 0, -l/2, { f, collide:true });
    const seg = (w - open)/2;
    box(seg, h, t, C.fence, -w/2 + seg/2, 0, l/2, { f, collide:true });
    box(seg, h, t, C.fence, w/2 - seg/2, 0, l/2, { f, collide:true });
    box(t, h, l, C.fence, -w/2, 0, 0, { f, collide:true });
    box(t, h, l, C.fence, w/2, 0, 0, { f, collide:true });
    addRect(occupied, c.x, c.z, w/2 + 2, l/2 + 2, f.rot);
  }

  /* ---------- campi da padel: 10 x 20 m, pareti di vetro e rete metallica ---------- */
  const glassMat = new THREE.MeshLambertMaterial({ color: 0xd4eef7, transparent: true, opacity: .2, depthWrite: false });
  const meshMat = new THREE.MeshLambertMaterial({ color: 0x1b2328, transparent: true, opacity: .4, depthWrite: false });
  const padelTex = canvasTex(256, 512, (x, W, H) => {
    const s = W/10, Y = m => H/2 + m*s;
    x.fillStyle = '#1f5fae'; x.fillRect(0, 0, W, H);
    for (let i=0;i<4000;i++){ x.fillStyle = Math.random() < .5 ? 'rgba(0,20,60,.08)' : 'rgba(255,255,255,.05)'; x.fillRect(Math.random()*W, Math.random()*H, 2, 2); }
    x.fillStyle = '#f4f7fb';
    for (const z of [-6.95, 6.95]) x.fillRect(0, Y(z) - 2, W, 4);   // linee del servizio
    x.fillRect(W/2 - 2, Y(-6.95), 4, 13.9*s);                         // linea centrale
  });
  function padelCourt(c){
    const f = frame(c);
    flat(12, 22, c.x, .03, c.z, mat(0x4f6f8f), f.rot);
    flat(10, 20, c.x, .045, c.z, new THREE.MeshLambertMaterial({ map: padelTex }), f.rot);
    box(10, .88, .03, 0, 0, 0, 0, { f, material: netMat });
    box(10, .05, .06, 0xffffff, 0, .86, 0, { f });
    for (const x of [-5.05, 5.05]) box(.1, 1, .1, 0x1b2328, x, 0, 0, { f });
    addRect(colliders, c.x, c.z, 5, .1, f.rot);
    for (const z of [-10, 10]){
      box(10, 3, .12, 0, 0, 0, z, { f, material: glassMat, collide: true, cast: false });
      box(10, 1, .06, 0, 0, 3, z, { f, material: meshMat, cast: false });
    }
    for (const x of [-5, 5]) for (const sz of [-1, 1]){
      box(.12, 3, 2, 0, x, 0, sz*9, { f, material: glassMat, collide: true, cast: false });
      box(.12, 2, 2, 0, x, 0, sz*7, { f, material: glassMat, collide: true, cast: false });
      box(.08, 1, 2, 0, x, 2, sz*7, { f, material: meshMat, cast: false });
      box(.08, 3, 4.6, 0, x, 0, sz*3.7, { f, material: meshMat, collide: true, cast: false });  // porte aperte vicino alla rete
    }
    for (const x of [-5, 5]) for (const z of [-10, -8, -6, -1.4, 1.4, 6, 8, 10]) box(.1, z === 10 || z === -10 ? 4 : 3, .1, 0x1b2328, x, 0, z, { f });
    addRect(occupied, c.x, c.z, 7, 12, f.rot);
  }
  for (const c of (S.padel ? [S.padel] : []).concat(LAYOUT.padel || [])) padelCourt(c);

  /* ---------- sfondo ---------- */
  const cypresses = [];
  const hill = (x,z,r,sy,col) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), mat(col)); m.scale.set(r, r*sy, r*.8); m.position.set(x,-2,z); scene.add(m); };
  if (LAYOUT.backdrop){ // schema v0.1: la Farnesina e Monte Mario a nord
    box(170, 20, 26, 0xeae4d6, 40, 0, -225);
    for (const y of [5, 10, 15]) box(170.3, 1.3, 26.3, 0x8f877b, 40, y, -225, { cast:false });
    hill(-120,-300,110,.42,0x5f8a45); hill(40,-320,120,.5,0x587f40); hill(190,-300,90,.38,0x628d47); hill(-260,-150,90,.4,0x5f8a45);
    for (let x = -190; x <= 165; x += 7) cypresses.push({ x: x + rand(-2,2), z: rand(-196,-190), s: rand(.85,1.2), ry:0 });
    for (let i=0;i<40;i++) cypresses.push({ x: rand(-200,200), z: rand(-240,-205), s: rand(.9,1.3), ry:0 });
  } else { // con i dati OSM: Monte Mario a ovest, fuori dall'area percorribile
    const zc = (BOUNDS.z0 + BOUNDS.z1)/2, zs = (BOUNDS.z1 - BOUNDS.z0)/2;
    hill(BOUNDS.x0 - 160, zc - zs*.6, 150, .45, 0x5f8a45); hill(BOUNDS.x0 - 190, zc + zs*.2, 170, .5, 0x587f40); hill(BOUNDS.x0 - 120, BOUNDS.z0 - 120, 130, .4, 0x628d47);
  }

  /* ---------- alberi: pini a ombrello e cipressi ---------- */
  const trees = [];
  const blocked = (x,z,m) => occupied.some(c => hits(c,x,z,m)) || colliders.some(c => hits(c,x,z,m));
  const addPine = (x,z,s=1) => { trees.push({ x, z, s, ry: Math.random()*Math.PI, v: Math.random() }); addRect(colliders, x, z, .5, .5); };
  if (S.viale){ // due filari lungo il viale
    const v = S.viale, f = frame(v);
    for (let lx = -v.len/2 + 6; lx <= v.len/2 - 12; lx += 11){
      for (const side of [-1, 1]){ const [x,z] = f.w(lx + (side > 0 ? 5 : 0), side*(v.wid/2 + 2.5)); if (!blocked(x,z,.6)) addPine(x, z, rand(.9,1.1)); }
    }
  }
  for (const [x,z] of LAYOUT.trees || []) if (x > BOUNDS.x0 && x < BOUNDS.x1 && z > BOUNDS.z0 && z < BOUNDS.z1 && !blocked(x,z,.8)) addPine(x, z, rand(.8,1.15));
  {
    const area = (BOUNDS.x1 - BOUNDS.x0)*(BOUNDS.z1 - BOUNDS.z0);
    const target = LAYOUT.source === 'schematic' ? 190 : Math.round(area/1000*(LAYOUT.trees && LAYOUT.trees.length ? .25 : .9));
    let placed = 0;
    for (let i=0;i<target*16 && placed<target;i++){
      const x = rand(BOUNDS.x0 + 5, BOUNDS.x1 - 5), z = rand(BOUNDS.z0 + 12, BOUNDS.z1 - 5);
      if (!blocked(x,z,4.5)){ addPine(x, z, rand(.8,1.2)); placed++; }
    }
  }
  const greens = [0x3f6b34, 0x4a7a3a, 0x36602f, 0x557f3f];
  instParts(trees, [
    { size:[.6,7,.6], off:[0,3.5,0], color:C.trunk },
    { size:[.35,2.2,.35], off:[1.1,6.4,.2], color:C.trunk },
    { size:[7.5,1.5,7.5], off:[0,7.6,0], color: it => greens[(it.v*greens.length)|0] },
    { size:[5,1.1,5], off:[.9,8.6,-.6], color: it => greens[((it.v*7)|0) % greens.length] },
  ]);
  instParts(cypresses, [
    { size:[.4,1,.4], off:[0,.5,0], color:C.trunk },
    { size:[1.9,7.5,1.9], off:[0,4.5,0], color:0x2e4a2c },
    { size:[1.2,1.6,1.2], off:[0,9,0], color:0x2e4a2c },
  ]);

  /* ---------- bandiere lungo il viale ---------- */
  if (S.viale){
    const v = S.viale, f = frame(v);
    for (let lx = -v.len/2 + 17; lx <= v.len/2 - 15; lx += 32){
      for (const lz of [-v.wid/2 + .5, v.wid/2 - .5]){
        box(.16, 8, .16, 0xdfe3e6, lx, 0, lz, { f });
        box(.9, 1.5, .05, 0x1f8a4c, lx + .55, 6.3, lz, { f, cast:false });
        box(.9, 1.5, .05, 0xffffff, lx + 1.45, 6.3, lz, { f, cast:false });
        box(.9, 1.5, .05, 0xd8342c, lx + 2.35, 6.3, lz, { f, cast:false });
      }
    }
  }

  /* ---------- statue e pubblico ---------- */
  instParts(statues, [
    { size:[1.3,1.4,1.3], off:[0,.7,0], color:0xe7e0d2 },
    { size:[.62,1.15,.38], off:[0,1.98,0], color:C.marble },
    { size:[.82,1.0,.44], off:[0,3.05,0], color:C.marble },
    { size:[.22,.95,.24], off:[.52,2.95,0], color:C.marble, filter: s => !s.arm },
    { size:[.22,.95,.24], off:[-.52,2.95,0], color:C.marble },
    { size:[.22,1.0,.24], off:[.52,4.0,0], color:C.marble, filter: s => s.arm },
    { size:[.44,.48,.44], off:[0,3.8,0], color:C.marble },
  ]);
  const skins = [0xe8c2a0, 0xd6a67e, 0xb07a52, 0x8a5a3a, 0xf0d0b4];
  instParts(crowd, [
    { size:[.5,.72,.42], off:[0,.36,0], color: it => it.c },
    { size:[.3,.3,.3], off:[0,.88,0], color: it => skins[(it.k*skins.length)|0] },
  ], false);

  batchStatic();

  /* ---------- nuvole ---------- */
  const clouds = [];
  for (let i=0;i<14;i++){
    const g = new THREE.Group(), n = 2 + (Math.random()*3|0);
    for (let k=0;k<n;k++) box(rand(14,28), rand(3,5), rand(10,18), 0xffffff, k*rand(8,12), rand(-1,1), rand(-4,4), { parent:g, cast:false });
    g.position.set(rand(-350,350), rand(95,125), rand(-350,300)); scene.add(g); clouds.push(g);
  }

  return { C, DIM, P, CF, PF, groundH, GB, rivers, statues, crowd, arena, clouds, bridges, trees, netMat, glassMat, meshMat, padelTex, court, padelCourt, stadium };
}
