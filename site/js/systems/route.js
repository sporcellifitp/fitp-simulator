// Percorso del Foro: itinerario guidato dal Fan Village a tutte le tappe del torneo.
// Parte da solo al primo ingresso (si compare nel Fan Village), si mette in pausa chiudendo il navigatore
// e riprende dal menu «Vai a…». La strada fino alla tappa successiva è calcolata sulla griglia degli ostacoli
// (world/grid.js) e disegnata a terra con frecce gialle che scorrono; sulla meta c'è una colonna di luce.
import * as THREE from 'three';
import { $, show, esc, frame } from '../core/util.js';
import { colliders, addRect } from '../world/collision.js';
import { rasterize, findPath } from '../world/grid.js';
import { canvasPlane, wrap } from '../world/canvas.js';
import { ROUTE, PHOTO_INFO } from '../content/percorso.js';
import { hud } from '../ui/hud.js';

const NAVY = '#0b2a5b', GOLD = '#f3c623', LOGO = 'assets/brand/fitp-logo-2023.png';
const MAX_CHEV = 700, GAP = 2.6;

export function createRoute(W){
  const scene = W.engine.scene, S = W.layout.sites, { P, CF, DIM, groundH } = W.world, PR = W.progress, st = PR.st;
  const L = DIM.centrale.l/2 + DIM.centrale.tiers*DIM.centrale.step;
  const esterni = W.pois.POIS.find(p => p.id === 'esterni');

  /* ---------- dove si arriva, tappa per tappa ---------- */
  const where = {
    village: () => W.village && { x: W.village.anchors.plaza[0], z: W.village.anchors.plaza[1], r: 12 },
    fontana: () => S.fontana && { x: S.fontana.x, z: S.fontana.z, r: 16 },
    viale: () => S.viale && { x: S.viale.x, z: S.viale.z, r: 18 },
    obelisco: () => S.obelisco && { x: S.obelisco.x, z: S.obelisco.z, r: 14 },
    marmi: () => P.marmi && (([x, z]) => ({ x, z, r: 14 }))(P.marmi.f.w(0, P.marmi.b + 3)),
    padel: () => W.venues.padel && (([x, z]) => ({ x, z, r: 12 }))(W.venues.padel.exit()),
    pietr: () => P.pietr && (([x, z]) => ({ x, z, r: 14 }))(P.pietr.f.w(0, P.pietr.hl + 3)),
    esterni: () => esterni && { x: esterni.x, z: esterni.z, r: 26 },
    centrale: () => (([x, z]) => ({ x, z, r: 14 }))(CF.w(0, L + 3)),
    st: () => S.supertennis && { x: S.supertennis.x, z: S.supertennis.z, r: 30 },
    tour: () => W.tour && { ...W.tour.entrance, r: 12 },
  };
  const stops = ROUTE.filter(s => where[s.id] && where[s.id]());
  const at = i => where[stops[i].id]();
  const credit = s => s.photo ? PHOTO_INFO[s.photo] : null;
  const photoUrl = s => s.photo && PHOTO_INFO[s.photo] ? 'assets/photos/' + s.photo : null;

  /* ---------- griglia per il calcolo della strada (1,5 m, costruita alla prima richiesta) ---------- */
  let G = null;
  const grid = () => {
    if (!G){ const B = W.layout.bounds, cell = 1.5; G = rasterize(colliders, { x0: B.x0, z0: B.z0, nx: Math.ceil((B.x1 - B.x0)/cell), nz: Math.ceil((B.z1 - B.z0)/cell), cell, margin: .45, bounds: B }); }
    return G;
  };

  /* ---------- frecce a terra, colonna di luce ---------- */
  // freccia gialla con il bordo blu FITP: si legge sia sul marmo chiaro sia sul prato
  const arrowGeo = k => { const s = new THREE.Shape(); s.moveTo(-.75*k, -.45*k); s.lineTo(0, .5*k); s.lineTo(.75*k, -.45*k); s.lineTo(.4*k, -.45*k); s.lineTo(0, .08*k); s.lineTo(-.4*k, -.45*k); s.closePath(); const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI/2); g.rotateY(Math.PI); return g; };
  const layer = (geo, color, order, off) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .96, depthWrite: false, polygonOffset: true, polygonOffsetFactor: off, polygonOffsetUnits: off }), MAX_CHEV);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false; m.userData.dynamic = true; m.renderOrder = order; scene.add(m); return m;
  };
  const chevBg = layer((() => { const g = arrowGeo(1.28); g.translate(0, 0, -.06); return g; })(), 0x0b2a5b, 2, -2);
  const chev = layer(arrowGeo(1), 0xffffff, 3, -4);
  chev.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_CHEV*3), 3);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 70, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xf3c623, transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3, 40), new THREE.MeshBasicMaterial({ color: 0xf3c623, transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI/2;
  for (const o of [beam, ring]){ o.userData.dynamic = true; o.visible = false; scene.add(o); }
  let marks = [], near = 0;                              // posizioni delle frecce e la più vicina al giocatore
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0), C = new THREE.Color();
  function layPath(pts){
    marks = [];
    let carry = GAP/2;
    for (let k = 0; k + 1 < pts.length && marks.length < MAX_CHEV; k++){
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], len = Math.hypot(bx - ax, bz - az); if (len < .01) continue;
      const ang = Math.atan2(bx - ax, bz - az);
      for (let d = carry; d < len && marks.length < MAX_CHEV; d += GAP){ const x = ax + (bx - ax)*d/len, z = az + (bz - az)*d/len; marks.push({ x, z, y: groundH(x, z) + .07, ang }); }
      carry = (carry - len) % GAP; if (carry < 0) carry += GAP;
    }
    chev.count = chevBg.count = marks.length; shown = 0;
    marks.forEach((m, i) => setMark(i, true));
    chev.instanceMatrix.needsUpdate = chevBg.instanceMatrix.needsUpdate = true; near = 0;
  }
  let shown = 0;                                          // le frecce prima di questo indice sono già alle spalle
  const ZERO = new THREE.Vector3(0, 0, 0);
  function setMark(i, on){ const m = marks[i]; Q.setFromAxisAngle(UP, m.ang); M.compose(V.set(m.x, m.y, m.z), Q, on ? SC : ZERO); chev.setMatrixAt(i, M); chevBg.setMatrixAt(i, M); }
  function hideBehind(k){
    k = Math.max(0, k);
    if (k === shown) return;
    const a = Math.min(k, shown), b = Math.max(k, shown);
    for (let i = a; i < b && i < marks.length; i++) setMark(i, i >= k);
    shown = k; chev.instanceMatrix.needsUpdate = chevBg.instanceMatrix.needsUpdate = true;
  }

  /* ---------- totem di tappa con la foto reale ---------- */
  const imgs = new Map();
  const img = url => { if (!imgs.has(url)) imgs.set(url, new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; })); return imgs.get(url); };
  const cover = (x, im, dx, dy, dw, dh) => { const r = Math.max(dw/im.width, dh/im.height), sw = dw/r, sh = dh/r; x.drawImage(im, (im.width - sw)/2, (im.height - sh)/2, sw, sh, dx, dy, dw, dh); };
  const contain = (x, im, dx, dy, dw, dh) => { const r = Math.min(dw/im.width, dh/im.height), w = im.width*r, h = im.height*r; x.drawImage(im, dx + (dw - w)/2, dy + (dh - h)/2, w, h); };
  const tric = (x, X, Y, w, h) => { x.fillStyle = '#2f8f57'; x.fillRect(X, Y, w/3, h); x.fillStyle = '#fff'; x.fillRect(X + w/3, Y, w/3, h); x.fillStyle = '#d8342c'; x.fillRect(X + 2*w/3, Y, w/3, h); };
  function totem(s, i){
    if (s.id === 'village' || s.id === 'tour') return;
    const t = at(i), prev = i ? at(i - 1) : t, G_ = grid();
    // accanto alla meta, sul lato da cui si arriva, in un punto libero
    const dx = prev.x - t.x, dz = prev.z - t.z, d = Math.hypot(dx, dz) || 1, ux = dx/d, uz = dz/d;
    let spot = null;
    // punti da lasciare liberi: dove compare la golf car noleggiata e l'ingresso del village
    const A = W.village && W.village.anchors, avoid = A ? [A.carSpawn.pos, A.entrance] : [];
    const clear = (x, z) => avoid.every(([ax, az]) => Math.hypot(x - ax, z - az) > 9) &&
      [0, 1, 2, 3, 4, 5, 6, 7].every(k => G_.free(x + Math.cos(k*Math.PI/4)*2.2, z + Math.sin(k*Math.PI/4)*2.2)) && G_.free(x, z);
    for (const [a, b] of [[t.r*.55, 4.5], [t.r*.55, -4.5], [t.r*.8, 5], [t.r*.8, -5], [t.r*.35, 4], [t.r, 6], [t.r, -6], [t.r*.55, 8], [t.r*.55, -8], [6, 0]]){
      const x = t.x + ux*a - uz*b, z = t.z + uz*a + ux*b;
      if (clear(x, z)){ spot = [x, z]; break; }
    }
    if (!spot) return;
    const rot = Math.atan2(ux, uz), F = frame({ x: spot[0], z: spot[1], rot }), y = groundH(spot[0], spot[1]);
    const g = new THREE.Group(); g.position.set(spot[0], y, spot[1]); g.rotation.y = rot; g.userData.dynamic = true; scene.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, .3, .5), new THREE.MeshLambertMaterial({ color: 0x0b2a5b })); base.position.y = .15; g.add(base);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.04, 3, .12), new THREE.MeshLambertMaterial({ color: 0x0b2a5b })); back.position.y = 1.8; g.add(back);
    const url = photoUrl(s);
    const face = canvasPlane(640, 940, 1.96, 2.88, () => {});
    const draw = (ph, logo) => face.redraw((x, w, h) => {
      x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
      x.fillStyle = NAVY; x.fillRect(0, 0, w, 150); tric(x, 0, 150, w, 10);
      x.fillStyle = GOLD; x.font = 'bold 34px Barlow, Arial, sans-serif'; x.fillText(`PERCORSO DEL FORO · TAPPA ${i + 1} DI ${stops.length}`, 26, 52);
      x.fillStyle = '#fff'; x.font = 'bold 52px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; x.fillText(s.name, 26, 118);
      if (ph && s.tall){ x.fillStyle = '#e9eef5'; x.fillRect(0, 160, w, 380); contain(x, ph, 0, 164, w, 372); }
      else if (ph) cover(x, ph, 0, 160, w, 380); else if (logo) contain(x, logo, 80, 190, w - 160, 320);
      let yy = 574;
      if (ph && credit(s)){ x.fillStyle = '#5b6678'; x.font = 'italic 19px Barlow, Arial, sans-serif'; x.fillText(credit(s), 22, yy); yy += 40; } else yy += 10;
      x.fillStyle = '#1d2430'; x.font = '27px Barlow, Arial, sans-serif';
      for (const ln of wrap(x, s.text, w - 48).slice(0, 10)){ x.fillText(ln, 24, yy); yy += 35; }
    });
    Promise.all([url ? img(url) : null, img(LOGO)]).then(([ph, logo]) => draw(ph, logo));
    face.position.set(0, 1.8, .07); g.add(face);
    addRect(colliders, spot[0], spot[1], 1.05, .3, rot);
    if (G) G.grid[(G.cellOf(spot[0], spot[1])[1])*G.nx + G.cellOf(spot[0], spot[1])[0]] = 1;
  }

  /* ---------- scheda della tappa (non blocca il gioco) ---------- */
  const card = $('#rcard');
  let cardT = 0;
  function showCard(i){
    const s = stops[i], url = photoUrl(s), next = stops[i + 1];
    card.innerHTML = `
      <div class="rtag">Percorso del Foro · tappa ${i + 1} di ${stops.length}</div>
      <h3>${esc(s.name)}</h3>
      ${url ? `<img src="${url}" alt="${esc(s.name)}"${s.tall ? ' class="tall"' : ''}><small class="credit">${esc(credit(s))} · Wikimedia Commons</small>` : ''}
      <p>${esc(s.text)}</p>
      <div class="rbtn">${s.play ? `<button class="primary" data-play="${s.play}">${esc(s.playLabel)}</button>` : ''}
        <button data-close="1">${next ? 'Avanti: ' + esc(next.name) : 'Chiudi'}</button></div>`;
    show(card, true); cardT = 18;
    card.querySelector('[data-close]').addEventListener('click', () => { show(card, false); });
    const pb = card.querySelector('[data-play]');
    if (pb) pb.addEventListener('click', () => { show(card, false); pause(true); W.activities.go(s.play); });
  }

  /* ---------- stato: tappa corrente, pausa, strada ---------- */
  st.route = st.route || { i: 0, done: {}, on: false };
  const R = st.route;
  let target = null, lastPlan = 0, endAt = null;
  const navName = i => `${i + 1}/${stops.length} · ${stops[i].name}`;
  function plan(){
    const t = at(R.i); if (!t) return;
    const p = W.mode === 'drive' && W.carts.cart ? { x: W.carts.cart.x, z: W.carts.cart.z } : W.player.pos;
    const pts = findPath(grid(), p.x, p.z, t.x, t.z, Math.max(3, t.r - 3)) || [[p.x, p.z], [t.x, t.z]];
    layPath(pts); lastPlan = performance.now();
    endAt = pts.partial ? pts.at(-1) : null;               // meta dentro un recinto: vale l'ultimo punto raggiungibile
    beam.visible = ring.visible = true;
    const y = groundH(t.x, t.z); beam.position.set(t.x, y + 35, t.z); ring.position.set(t.x, y + .1, t.z);
  }
  function goTo(i){
    R.i = i; PR.save();
    if (i >= stops.length){ finish(); return; }
    const t = at(i); target = { x: t.x, z: t.z, name: navName(i), keep: true, route: true };
    W.nav.set(target); plan();
  }
  function arrive(){
    const i = R.i, s = stops[i];
    if (!R.done[s.id]){ R.done[s.id] = 1; PR.save(); W.economy.earn(5, 'tappa del percorso'); }
    showCard(i);
    goTo(i + 1);
  }
  function finish(){
    target = null; W.nav.clear(); chev.count = chevBg.count = 0; beam.visible = ring.visible = false; R.on = false; R.finished = 1; PR.save();
    if (PR.badge('guida')) W.economy.earn(40, 'Percorso del Foro completato');
    hud.toast('Percorso del Foro completato: hai visto tutto il torneo!', 'gold');
  }
  function pause(quiet){
    R.on = false; PR.save(); target = null; chev.count = chevBg.count = 0; beam.visible = ring.visible = false;
    if (!quiet) hud.toast('Percorso in pausa: lo riprendi da «Vai a…», Percorso del Foro');
  }
  const api = {
    stops, get index(){ return R.i; }, get on(){ return R.on; },
    at, where,
    start(from = 0){
      R.on = true; if (R.finished && from === 0) R.done = {};
      show('#rcard', false);
      if (from === 0){ showCard(0); goTo(stops.length > 1 ? 1 : 0); R.done[stops[0].id] = 1; }
      else goTo(from);
    },
    resume(){ if (R.i >= stops.length || R.finished && R.i >= stops.length) api.start(0); else { R.on = true; goTo(Math.max(1, R.i)); } },
    pause, plan, arrive,
    get path(){ return marks; },
    get grid(){ return grid(); },
    build(){ stops.forEach((s, i) => totem(s, i)); },
    update(dt){
      if (cardT > 0 && (cardT -= dt) <= 0) show(card, false);
      if (!R.on || !target) return;
      // il giocatore ha chiuso il navigatore: pausa
      if (W.nav.target !== target){ pause(); return; }
      const t = at(R.i); if (!t) return;
      if (t.x !== target.x || t.z !== target.z){ target.x = t.x; target.z = t.z; plan(); }   // il Trophy Tour si è spostato
      const p = W.mode === 'drive' && W.carts.cart ? { x: W.carts.cart.x, z: W.carts.cart.z } : W.player.pos;
      const extra = W.mode === 'drive' ? 4 : 0;
      if (Math.hypot(p.x - t.x, p.z - t.z) < t.r + extra || (endAt && Math.hypot(p.x - endAt[0], p.z - endAt[1]) < 5 + extra)){ arrive(); return; }
      // freccia più vicina: quelle alle spalle spariscono; se ci si allontana dalla traccia si ricalcola
      let best = near, bd = Infinity;
      for (let k = Math.max(0, near - 5); k < Math.min(marks.length, near + 40); k++){ const m = marks[k], d = (m.x - p.x)**2 + (m.z - p.z)**2; if (d < bd){ bd = d; best = k; } }
      near = best;
      if ((bd > 22*22 || !marks.length) && performance.now() - lastPlan > 1500) plan();
      // onda di luce che corre verso la meta
      const time = W.engine.time;
      hideBehind(near - 1);
      for (let k = Math.max(0, near - 1); k < marks.length; k++){
        const w = .55 + .45*Math.max(0, Math.sin((k - time*9)*.35));
        C.setRGB(1, .62 + .26*w, .05*w); chev.setColorAt(k, C);
      }
      chev.instanceColor.needsUpdate = true;
      ring.rotation.z = time*.8; ring.scale.setScalar(1 + .08*Math.sin(time*3)); beam.material.opacity = .14 + .06*Math.sin(time*2.4);
    },
  };
  return api;
}
