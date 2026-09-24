// Allestimenti del torneo e elementi animati: fan zone (maxischermo, chioschi, info point, ombrelloni, bandiere),
// seggioloni con arbitro, getti della fontana, gabbiani. Allestimenti stilizzati, non la disposizione reale del 2026.
import * as THREE from 'three';
import { frame, clamp } from '../core/util.js';
import { isFree, addRect, colliders, occupied } from './collision.js';
import { box, mat } from './geom.js';
import { makeAvatar, pose } from '../entities/avatar.js';

function canvasPanel(w, h, pw, ph){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: tex }));
  m.userData.dynamic = true;
  return { c, ctx: c.getContext('2d'), tex, m };
}

export function buildProps(W){
  const { scene } = W.engine, L = W.layout, S = L.sites, { CF, P, DIM, groundH } = W.world;
  const dyn = [];          // aggiornati a ogni fotogramma
  const out = { fanZone: null, boardSpot: null, update(dt){ for (const d of dyn) d(dt); } };

  /* ---------- fan zone: un'area libera vicino al viale, dalla parte della fontana ---------- */
  const areaFree = (F, hw, hd) => { for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++){ const [x, z] = F.w(i*hw/2, j*hd); if (!isFree(x, z, 1.2)) return false; } return true; };
  if (S.viale){
    const v = S.viale, vf = frame(v);
    const fontEnd = S.fontana ? Math.sign(vf.l(S.fontana.x, S.fontana.z)[0]) || -1 : -1;
    search: for (let along = 30; along < v.len; along += 12) for (const side of [1, -1]) for (const off of [18, 26, 36]){
      const [x, z] = vf.w(fontEnd*(v.len/2 - along), side*(v.wid/2 + off));
      const rot = vf.rot + (side > 0 ? Math.PI : 0);          // lo schermo guarda verso il viale
      const F = frame({ x, z, rot });
      if (areaFree(F, 12, 7)){ out.fanZone = { x, z, rot }; break search; }
    }
  }
  if (!out.fanZone && S.fontana) out.fanZone = { x: S.fontana.x + 28, z: S.fontana.z + 20, rot: 0 };
  let screen = null;
  if (out.fanZone){
    const F = frame(out.fanZone), f = { f: F };
    // maxischermo su traliccio
    for (const sx of [-4.6, 4.6]) box(.35, 8.2, .35, 0x3a3f47, sx, 0, -6, { ...f, collide: true });
    box(9.6, 5.6, .5, 0x1d2430, 0, 3, -6, f);
    screen = canvasPanel(1024, 576, 8.8, 4.95);
    const [sx, sz] = F.w(0, -5.72); screen.m.position.set(sx, 5.8, sz); screen.m.rotation.y = F.rot; scene.add(screen.m);
    // chiosco delle granite e info point
    const kiosk = (lx, color, roof) => {
      box(4.2, 2.6, 2.6, 0xf6f1e7, lx, 0, 0, { ...f, collide: true });
      box(4.2, .9, .12, color, lx, 1.25, 1.34, f);
      box(4.8, .25, 3.3, roof, lx, 2.6, .2, f);
      box(3.6, .12, .6, 0xd3c5a8, lx, 1.05, 1.55, f);
    };
    kiosk(-8, 0xd8342c, 0xffffff); kiosk(8, 0x2f8f57, 0x0b2a5b);
    // tavolini con ombrelloni
    for (const [lx, lz] of [[-3.5, 4.5], [3.5, 4.5], [-6, 8], [6, 8]]){
      box(.08, 2.6, .08, 0xdfe3e6, lx, 0, lz, f); box(1.2, .06, 1.2, 0xffffff, lx, .78, lz, f);
      const u = new THREE.Mesh(new THREE.ConeGeometry(1.7, .7, 8), mat(0xc8643b)); const [ux, uz] = F.w(lx, lz); u.position.set(ux, 2.8, uz); u.castShadow = true; scene.add(u);
      addRect(colliders, ...F.w(lx, lz), .5, .5, F.rot);
    }
    // bandiere mosse dal vento
    const flagGeo = new THREE.PlaneGeometry(1.6, 1, 8, 1);
    for (const [lx, lz, c] of [[-11, -7, 0x1f4fa3], [11, -7, 0xd8342c], [-11, 9, 0x2f8f57], [11, 9, 0xf3c623]]){
      box(.12, 6, .12, 0xdfe3e6, lx, 0, lz, f);
      const g = flagGeo.clone(), fl = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
      const [x, z] = F.w(lx, lz); fl.position.set(x, 5.3, z); fl.rotation.y = F.rot; fl.userData.dynamic = true; scene.add(fl);
      const base = g.attributes.position.array.slice(), ph = Math.random()*6;
      dyn.push(() => { const a = g.attributes.position.array, t = W.engine.time*4 + ph; for (let i = 0; i < a.length; i += 3){ const u = (base[i] + .8)/1.6; a[i + 2] = Math.sin(t + u*4)*.18*u; a[i] = base[i] + .8; } g.attributes.position.needsUpdate = true; });
    }
    // bacheca dei tifosi di fronte allo schermo
    const [bx, bz] = F.w(0, 11);
    out.boardSpot = { x: bx, z: bz, rot: F.rot + Math.PI };
    addRect(colliders, bx, bz, 2.8, .3, F.rot);
    addRect(occupied, out.fanZone.x, out.fanZone.z, 13, 12, F.rot);
  }
  // maxischermo: punteggio della partita dal vivo sul Centrale (o di quella del giocatore)
  const drawScreen = s => {
    if (!screen) return;
    const x = screen.ctx, w = 1024, h = 576;
    x.fillStyle = '#0b2a5b'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#c8643b'; x.fillRect(0, 0, w, 86);
    x.fillStyle = '#fff'; x.font = 'bold 54px "Barlow Condensed", Arial Narrow, sans-serif';
    x.fillText(s ? (s.player ? 'LA TUA PARTITA' : 'IN DIRETTA · CAMPO CENTRALE') : 'FORO ITALICO WORLD', 32, 62);
    if (!s){ x.font = '44px Barlow, Arial, sans-serif'; x.fillText('Tra poco si gioca sul Centrale', 40, 300); screen.tex.needsUpdate = true; return; }
    for (let t = 0; t < 2; t++){
      const y = 200 + t*170;
      x.fillStyle = t === s.server ? '#f3c623' : 'rgba(255,255,255,.25)'; x.beginPath(); x.arc(56, y - 18, 14, 0, Math.PI*2); x.fill();
      x.fillStyle = '#fff'; x.font = 'bold 76px "Barlow Condensed", Arial Narrow, sans-serif'; x.fillText(String(s.names[t]).slice(0, 18), 92, y);
      x.fillStyle = '#f3c623'; x.fillText(String(s.games[t]), 760, y);
      x.fillStyle = '#fff'; x.fillText(String(s.points[t]), 880, y);
    }
    if (s.over){ x.fillStyle = '#f3c623'; x.font = 'bold 44px Barlow, Arial, sans-serif'; x.fillText('Partita finita', 40, 540); }
    screen.tex.needsUpdate = true;
  };
  drawScreen(null);
  W.bus.on('live:score', s => { if (s.venue === 'centrale') drawScreen(s); });

  /* ---------- seggioloni con arbitro sui campi delle partite dal vivo ---------- */
  const chair = (F, y0, halfW) => {
    const f = { f: F };
    box(.9, 2.1, .9, 0x2f4a3a, halfW + 1.5, y0, 0, { ...f, collide: true });
    box(1, .12, 1, 0x1d2430, halfW + 1.5, y0 + 2.1, 0, f);
    const u = makeAvatar({ shirt: 0x0b2a5b, shorts: 0x5b6678, hasCap: false, hair: 0x3a2a1c, hasRacket: false });
    const [x, z] = F.w(halfW + 1.5, 0); u.g.position.set(x, y0 + 2.2, z); u.g.rotation.y = F.rot - Math.PI/2; scene.add(u.g);
    dyn.push(() => pose(u, { state: 'sit', t: W.engine.time }));
  };
  chair(CF, 0, 5.49);
  if (P.pietr) chair(P.pietr.f, -P.pietr.D, 5.49);
  if (S.supertennis) chair(frame(S.supertennis), 0, 5.49);
  if (S.arena) chair(frame(S.arena), groundH(S.arena.x, S.arena.z), 5.49);

  /* ---------- getti della fontana ---------- */
  if (S.fontana){
    const n = 90, pos = new Float32Array(n*3), seeds = [];
    for (let i = 0; i < n; i++) seeds.push({ a: i/n*Math.PI*2, t: Math.random() });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe9f5, size: .22, transparent: true, opacity: .85, depthWrite: false }));
    pts.userData.dynamic = true; pts.frustumCulled = false; scene.add(pts);
    const f = S.fontana;
    dyn.push(dt => {
      const near = Math.hypot(W.player.pos.x - f.x, W.player.pos.z - f.z) < 150; pts.visible = near; if (!near) return;
      for (let i = 0; i < n; i++){
        const s = seeds[i]; s.t = (s.t + dt*.7) % 1;
        const r = 6.2 - s.t*3.6, y = .7 + Math.sin(s.t*Math.PI)*2.2;
        pos[i*3] = f.x + Math.cos(s.a)*r; pos[i*3 + 1] = y; pos[i*3 + 2] = f.z + Math.sin(s.a)*r;
      }
      g.attributes.position.needsUpdate = true;
    });
  }

  /* ---------- gabbiani sopra il Foro ---------- */
  {
    const hub = S.pietrangeli || S.centrale, birds = [];
    const wingGeo = new THREE.BoxGeometry(.9, .04, .22), bodyGeo = new THREE.BoxGeometry(.18, .14, .5), white = mat(0xf4f4f4), grey = mat(0x9aa3ab);
    for (let i = 0; i < 6; i++){
      const g = new THREE.Group(), wl = new THREE.Mesh(wingGeo, grey), wr = new THREE.Mesh(wingGeo, grey);
      wl.position.x = -.5; wr.position.x = .5; g.add(new THREE.Mesh(bodyGeo, white), wl, wr); g.userData.dynamic = true; scene.add(g);
      birds.push({ g, wl, wr, r: 40 + Math.random()*70, h: 28 + Math.random()*18, sp: .1 + Math.random()*.12, a: Math.random()*6, cx: hub.x + (Math.random() - .5)*120, cz: hub.z + (Math.random() - .5)*120 });
    }
    dyn.push(dt => {
      const t = W.engine.time;
      for (const b of birds){
        b.a += dt*b.sp; const x = b.cx + Math.cos(b.a)*b.r, z = b.cz + Math.sin(b.a)*b.r;
        b.g.position.set(x, b.h + Math.sin(t + b.a)*2, z); b.g.rotation.y = -b.a;
        const fl = Math.sin(t*6 + b.r)*.5; b.wl.rotation.z = fl; b.wr.rotation.z = -fl;
      }
    });
  }
  return out;
}
