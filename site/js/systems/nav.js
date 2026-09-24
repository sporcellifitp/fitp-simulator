// Navigatore, come le indicazioni di Google Maps: strada calcolata sugli ostacoli (world/grid.js), linea blu a terra
// con frecce che scorrono verso la meta, colonna di luce sulla meta, riquadro in alto con la prossima manovra
// («Tra 40 m gira a destra»), distanza e tempo che mancano, ricalcolo se ci si allontana, strada sulla minimappa.
// Lo usano «Guidami» nel menu Vai a…, il Percorso del Foro (systems/route.js) e i personaggi che indicano un posto.
//
// set({ x, z, name, r?, at?, sub?, route?, onArrive?, onCancel? })
//   r: raggio d'arrivo; at(): posizione aggiornata di una meta che si sposta (il Trophy Tour);
//   onArrive(): all'arrivo (senza, una nota «Sei arrivato»); onCancel(): se il giocatore chiude o cambia meta.
import * as THREE from 'three';
import { $, show, esc, isTouch } from '../core/util.js';
import { colliders } from '../world/collision.js';
import { rasterize, findPath } from '../world/grid.js';
import { hud } from '../ui/hud.js';

const MAX_MARKS = 900, GAP = 2.6, RIBBON = .75;

// semplificazione di Douglas-Peucker: gli angolini della griglia non diventano manovre
function simplify(pts, tol){
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length){
    const [a, b] = st.pop(), [ax, az] = pts[a], [bx, bz] = pts[b], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
    let best = -1, bd = tol;
    for (let i = a + 1; i < b; i++){ const d = Math.abs((pts[i][0] - ax)*dz - (pts[i][1] - az)*dx)/L; if (d > bd){ bd = d; best = i; } }
    if (best >= 0){ keep[best] = 1; st.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const round5 = d => d >= 1000 ? (d/1000).toFixed(1).replace('.', ',') + ' km' : Math.max(5, Math.round(d/5)*5) + ' m';

// icone delle manovre (freccia ruotata; bandierina all'arrivo)
const ICON_ARROW = '<svg viewBox="0 0 24 24"><path d="M12 2.5l7 7.5h-4.5v11h-5V10H5z"/></svg>';
const ICON_FLAG = '<svg viewBox="0 0 24 24"><path d="M5 2h2v20H5zM8 3h11l-2.5 4L19 11H8z"/></svg>';

export function createNav(W){
  const scene = W.engine.scene, groundH = W.world.groundH;

  /* ---------- griglia degli ostacoli (1,5 m), costruita alla prima richiesta ---------- */
  let G = null;
  const grid = () => {
    if (!G){ const B = W.layout.bounds, cell = 1.5; G = rasterize(colliders, { x0: B.x0, z0: B.z0, nx: Math.ceil((B.x1 - B.x0)/cell), nz: Math.ceil((B.z1 - B.z0)/cell), cell, margin: .45, bounds: B }); }
    return G;
  };

  /* ---------- linea blu, frecce gialle, colonna di luce ---------- */
  const arrowGeo = k => { const s = new THREE.Shape(); s.moveTo(-.55*k, -.4*k); s.lineTo(0, .45*k); s.lineTo(.55*k, -.4*k); s.lineTo(.3*k, -.4*k); s.lineTo(0, .08*k); s.lineTo(-.3*k, -.4*k); s.closePath(); const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI/2); g.rotateY(Math.PI); return g; };
  const chev = new THREE.InstancedMesh(arrowGeo(1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .97, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), MAX_MARKS);
  chev.instanceMatrix.setUsage(THREE.DynamicDrawUsage); chev.count = 0; chev.frustumCulled = false; chev.userData.dynamic = true; chev.renderOrder = 3;
  chev.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_MARKS*3), 3); scene.add(chev);
  // la linea: due triangoli tra una freccia e la successiva, bordo blu scuro e centro blu FITP
  const ribbonMesh = (w, color, opacity, order, off) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_MARKS*18), 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: off, polygonOffsetUnits: off }));
    m.frustumCulled = false; m.userData.dynamic = true; m.renderOrder = order; m.userData.w = w; m.visible = false; scene.add(m); return m;
  };
  const edge = ribbonMesh(RIBBON + .22, 0x0b2a5b, .9, 1, -2), line = ribbonMesh(RIBBON, 0x2b6fd6, .92, 2, -3);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 70, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xf3c623, transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3, 40), new THREE.MeshBasicMaterial({ color: 0xf3c623, transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI/2;
  for (const o of [beam, ring]){ o.userData.dynamic = true; o.visible = false; scene.add(o); }

  let marks = [], corners = [], near = 0, shown = 0, seg = 0, endAt = null, lastPlan = 0, lastTxt = 0, lastHtml = '', target = null, tpos = null;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1), ZERO = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), C = new THREE.Color();
  const setMark = (i, on) => { const m = marks[i]; Q.setFromAxisAngle(UP, m.ang); M.compose(V.set(m.x, m.y + .02, m.z), Q, on ? ONE : ZERO); chev.setMatrixAt(i, M); };
  function lay(pts){
    marks = []; let carry = GAP/2;
    for (let k = 0; k + 1 < pts.length && marks.length < MAX_MARKS; k++){
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], len = Math.hypot(bx - ax, bz - az); if (len < .01) continue;
      const ang = Math.atan2(bx - ax, bz - az);
      for (let d = carry; d < len && marks.length < MAX_MARKS; d += GAP){ const x = ax + (bx - ax)*d/len, z = az + (bz - az)*d/len; marks.push({ x, z, y: groundH(x, z) + .06, ang }); }
      carry = (carry - len) % GAP; if (carry < 0) carry += GAP;
    }
    chev.count = marks.length; marks.forEach((_, i) => setMark(i, true)); chev.instanceMatrix.needsUpdate = true;
    for (const rb of [edge, line]){
      const a = rb.geometry.attributes.position.array, w = rb.userData.w; let o = 0;
      for (let i = 0; i + 1 < marks.length; i++){
        const p = marks[i], q = marks[i + 1];
        const lx = Math.cos(p.ang)*w, lz = -Math.sin(p.ang)*w, mx = Math.cos(q.ang)*w, mz = -Math.sin(q.ang)*w;
        a.set([p.x - lx, p.y, p.z - lz, p.x + lx, p.y, p.z + lz, q.x + mx, q.y, q.z + mz, p.x - lx, p.y, p.z - lz, q.x + mx, q.y, q.z + mz, q.x - mx, q.y, q.z - mz], o); o += 18;
      }
      rb.geometry.attributes.position.needsUpdate = true; rb.geometry.setDrawRange(0, Math.max(0, marks.length - 1)*6); rb.visible = marks.length > 1;
    }
    near = shown = 0;
  }
  function hideBehind(k){
    k = Math.max(0, Math.min(k, marks.length));
    if (k !== shown){ const a = Math.min(k, shown), b = Math.max(k, shown); for (let i = a; i < b; i++) setMark(i, i >= k); shown = k; chev.instanceMatrix.needsUpdate = true; }
    for (const rb of [edge, line]) rb.geometry.setDrawRange(k*6, Math.max(0, marks.length - 1 - k)*6);
  }
  const here = () => W.mode === 'drive' && W.carts.cart ? { x: W.carts.cart.x, z: W.carts.cart.z } : W.player.pos;

  function plan(){
    if (!target) return;
    const p = here(), t = tpos;
    const pts = findPath(grid(), p.x, p.z, t.x, t.z, Math.max(3, (target.r || 10) - 3)) || [[p.x, p.z], [t.x, t.z]];
    endAt = pts.partial ? pts.at(-1) : null;            // meta dentro un recinto: vale l'ultimo punto raggiungibile
    lay(pts); corners = simplify(pts, 2.5); seg = 0; lastPlan = performance.now();
    while (corners.length > 2 && Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]) < 5) corners.splice(1, 1);   // i primi metri non sono una manovra
    const y = groundH(t.x, t.z); beam.position.set(t.x, y + 35, t.z); ring.position.set(t.x, y + .1, t.z); beam.visible = ring.visible = true;
  }
  function hideAll(){ chev.count = 0; edge.visible = line.visible = beam.visible = ring.visible = false; marks = []; corners = []; show('#nav', false); document.body.classList.remove('navigating'); }

  /* ---------- la prossima manovra ---------- */
  function instruction(p){
    const n = corners.length;
    if (n < 2) return null;
    // segmento su cui ci si trova (si guarda solo avanti)
    let best = seg, bd = Infinity;
    for (let k = seg; k < Math.min(n - 1, seg + 4); k++){
      const [ax, az] = corners[k], [bx, bz] = corners[k + 1], dx = bx - ax, dz = bz - az, L2 = dx*dx + dz*dz || 1;
      const u = Math.max(0, Math.min(1, ((p.x - ax)*dx + (p.z - az)*dz)/L2)), d = Math.hypot(p.x - ax - dx*u, p.z - az - dz*u);
      if (d < bd - .5){ bd = d; best = k; }
    }
    seg = best;
    let dist = Math.hypot(corners[seg + 1][0] - p.x, corners[seg + 1][1] - p.z);
    let total = dist; for (let k = seg + 1; k < n - 1; k++) total += Math.hypot(corners[k + 1][0] - corners[k][0], corners[k + 1][1] - corners[k][1]);
    for (let j = seg + 1; j < n - 1; j++){
      const [ax, az] = corners[j - 1], [bx, bz] = corners[j], [cx, cz] = corners[j + 1];
      const d1x = bx - ax, d1z = bz - az, d2x = cx - bx, d2z = cz - bz;
      const ang = Math.atan2(d1x*d2z - d1z*d2x, d1x*d2x + d1z*d2z)*180/Math.PI;   // positivo = a destra (asse y in alto)
      if (Math.abs(ang) >= 28) return { dist, ang, total };
      dist += Math.hypot(d2x, d2z);
    }
    return { dist, ang: null, total };
  }
  function banner(p){
    const ins = instruction(p); if (!ins) return;
    const walk = W.mode === 'drive' ? 11 : (isTouch ? (W.input.sprinting ? 10.5 : 6.5) : 12);
    const secs = ins.total/walk, eta = secs < 45 ? 'meno di 1 min' : Math.round(secs/60) + ' min';
    let icon = ICON_ARROW, rot = 0, main;
    // prima di tutto, rispetto a quello che si vede: se la linea parte alle spalle o di lato, si dice di girarsi
    const ahead = marks[Math.min(marks.length - 1, near + 2)];
    let face = null;
    if (ahead){
      const fx = -Math.sin(W.player.cam.yaw), fz = -Math.cos(W.player.cam.yaw), dx = ahead.x - p.x, dz = ahead.z - p.z;
      if (Math.hypot(dx, dz) > 1.5 && W.mode !== 'drive') face = Math.atan2(fx*dz - fz*dx, fx*dx + fz*dz)*180/Math.PI;
    }
    if (face != null && Math.abs(face) > 55){
      const side = face > 0 ? 'destra' : 'sinistra';
      main = Math.abs(face) > 135 ? 'Girati e segui la linea blu' : `Vai verso ${side}`;
      rot = Math.abs(face) > 135 ? 180 : Math.sign(face)*90;
    } else if (ins.ang == null){
      if (ins.dist < 25){ icon = ICON_FLAG; main = `Arrivo tra ${round5(ins.dist)}`; }
      else main = `Prosegui dritto per ${round5(ins.dist)}`;
    } else {
      const a = Math.abs(ins.ang), side = ins.ang > 0 ? 'destra' : 'sinistra';
      const verb = a < 60 ? `tieni la ${side}` : a < 135 ? `gira a ${side}` : 'torna indietro';
      rot = Math.sign(ins.ang)*(a < 60 ? 45 : a < 135 ? 90 : 180);
      main = ins.dist > 12 ? `Tra ${round5(ins.dist)} ${verb}` : verb[0].toUpperCase() + verb.slice(1);
    }
    const sub = `${target.sub ? target.sub + ' · ' : ''}${target.name} · ${round5(ins.total)} · ${eta}${W.mode === 'drive' ? ' in golf car' : ' a piedi'}`;
    const html = `<i class="man" style="transform:rotate(${rot}deg)">${icon}</i><span><b>${esc(main)}</b><small>${esc(sub)}</small></span>`;
    if (html !== lastHtml){ lastHtml = html; $('#nav .navbody').innerHTML = html; }
  }

  const api = {
    get target(){ return target; },
    get path(){ return marks; },
    get remaining(){ return marks.slice(Math.max(0, near - 1)); },
    grid, plan,
    set(t){
      const prev = target;
      target = t; tpos = t.at ? t.at() : { x: t.x, z: t.z };
      if (prev && prev !== t && prev.onCancel && !(prev.route && t.route)) prev.onCancel(prev);   // da tappa a tappa non è un annullamento
      lastHtml = ''; show('#nav', true); document.body.classList.add('navigating');
      plan(); banner(here());
    },
    // chiusura: dal pulsante ✕ (il Percorso va in pausa) o in silenzio da chi ha impostato la meta
    clear(silent = false){
      const prev = target; target = null; hideAll();
      if (prev && !silent && prev.onCancel) prev.onCancel(prev);
    },
    update(dt = 1/60){
      if (!target) return;
      if (!(W.mode === 'explore' || W.mode === 'drive')) return;
      const p = here();
      if (target.at){ const q = target.at(); if (q && Math.hypot(q.x - tpos.x, q.z - tpos.z) > 3){ tpos = q; plan(); } }
      const r = (target.r || 10) + (W.mode === 'drive' ? 4 : 0);
      if (Math.hypot(p.x - tpos.x, p.z - tpos.z) < r || (endAt && Math.hypot(p.x - endAt[0], p.z - endAt[1]) < 5 + (W.mode === 'drive' ? 4 : 0))){
        const t = target; target = null; hideAll();
        if (t.onArrive) t.onArrive(t); else hud.note({ title: '✓ Sei arrivato', sub: t.name, ms: 3500 });
        return;
      }
      // freccia più vicina: la strada alle spalle sparisce; lontani dalla traccia si ricalcola
      let best = near, bd = Infinity;
      for (let k = Math.max(0, near - 5); k < Math.min(marks.length, near + 40); k++){ const m = marks[k], d = (m.x - p.x)**2 + (m.z - p.z)**2; if (d < bd){ bd = d; best = k; } }
      if (bd > 30*30) for (let k = 0; k < marks.length; k++){ const m = marks[k], d = (m.x - p.x)**2 + (m.z - p.z)**2; if (d < bd){ bd = d; best = k; } }
      near = best;
      if ((bd > 14*14 || !marks.length) && performance.now() - lastPlan > 1500){ $('#nav .navbody b') && ($('#nav .navbody b').textContent = 'Ricalcolo del percorso…'); plan(); }
      hideBehind(near - 1);
      const time = W.engine.time;
      for (let k = Math.max(0, near - 1); k < marks.length; k++){ const w = .5 + .5*Math.max(0, Math.sin((k - time*9)*.35)); C.setRGB(1, .8 + .2*w, .25 + .6*w); chev.setColorAt(k, C); }
      chev.instanceColor.needsUpdate = true;
      ring.rotation.z = time*.8; ring.scale.setScalar(1 + .08*Math.sin(time*3)); beam.material.opacity = .14 + .06*Math.sin(time*2.4);
      if (performance.now() - lastTxt > 150){ lastTxt = performance.now(); banner(p); }
    },
  };
  $('#nav button').addEventListener('click', () => api.clear());
  return api;
}
