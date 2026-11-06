// Prototipo B9 «motion design illustrato» — DISEGNO (Canvas 2D, vettoriale: ridisegnato a ogni fotogramma alla
// risoluzione dello schermo, nitido anche su ledwall).
//
// Il moto è quello di motion.js (verificato con il telefono simulato completo da verifica.mjs): qui si sceglie solo come
// mostrarlo. Il braccio, la mano e il telefono sono posati in 3D (rig.js) e proiettati con una camera prospettica per
// gesto; ogni parte è disegnata come forma morbida (capsule rastremate, palmo come inviluppo arrotondato) con contorno,
// luce «dipinta» a bande (toon) e luce di contorno fredda; il telefono è una lastra a spigoli arrotondati con il bordo
// metallico, il vetro e la schermata «Pronto». Strati didattici: fantasmi delle pose chiave, freccia del verso, scia della
// cima con dissolvenza, palla, lampo all'impatto, curva della velocità di rotazione con il picco = impatto.
import { gesturePose, plan, rotSpeed, strokeBall, serveBall, SHOULDER, PHONE, BALL_R, add, sub, mul, dot, cross, len, norm, qrot, qconj } from './motion.js';
import { rigPose, FOREARM_PROFILE, BAND, CUFF, HAND } from './rig.js';

/* ---------- schede ---------- */
const CARDS = [
  { id: 'grip', name: 'Presa', cue: { right: 'Il dorso del telefono appoggia sul palmo: il pollice lungo un bordo, le dita sull\'altro. Schermo verso di te.' } },
  { id: 'forehand', name: 'Dritto', cue: { right: 'Il tuo colpo normale: il braccio gira come una porta, da destra a sinistra. Polso fermo.', left: 'Il tuo colpo normale: il braccio gira come una porta, da sinistra a destra. Polso fermo.' } },
  { id: 'backhand', name: 'Rovescio', cue: { right: 'Dal fianco sinistro verso destra: il braccio attraversa il corpo. Polso fermo.', left: 'Dal fianco destro verso sinistra: il braccio attraversa il corpo. Polso fermo.' } },
  { id: 'serve', name: 'Servizio', cue: { right: 'Lancia: la mano sale. Poi braccio sopra la testa e giù deciso quando la palla è in cima.' } },
  { id: 'lob', name: 'Pallonetto', cue: { right: 'Dal basso verso l\'alto, come un lancio da sotto: la mano sale molto.' } },
  { id: 'drop', name: 'Palla corta', cue: { right: 'Una carezza: la mano scende piano e lo schermo si apre verso il cielo. Niente fretta.' } },
];
// direzione camera ← soggetto (campo: x a destra, y in alto, +z dietro chi gioca); la presa alterna due viste
// Le viste sono quasi perpendicolari all'avambraccio (che con q0 va indietro e a destra, verso il corpo): il braccio esce
// di lato dal quadro invece di puntare verso chi guarda. Colpi orizzontali: dall'alto e da dietro (l'arco si vede intero);
// colpi nel piano verticale: servizio di profilo (archi del lancio e della battuta interi), pallonetto di lato e dall'alto
// (lo schermo che guarda il cielo si vede anche in carica), palla corta da dietro a destra (lo schermo e la mano che
// scende; la palla resta oltre il telefono e non copre la mano).
let VIEWS = {
  grip: [[-.36, .78, .5], [.95, .3, -.12]],
  forehand: [[-.35, .62, 1]],
  backhand: [[.35, .62, 1]],
  serve: [[1, .2, .25]],
  lob: [[1, .5, -.35]],
  drop: [[.75, .55, .6]],
};
let DIST = { grip: 1.0 };                          // distanza della camera (m): prospettiva moderata (2,2 m per i colpi)
// servizio: il moto copre ~1 m in verticale; la camera segue la mano (media mobile di 0,9 s, ingrandimento fisso su
// 0,5 m): carrellata morbida come in una guida animata, la mano resta grande
let FOLLOW = { serve: .45 };
const HUD_H = .2;                                   // parte bassa dello stadio riservata alla curva della velocità

/* ---------- colori e luce dipinta ---------- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, u) => [a[0] + (b[0] - a[0])*u, a[1] + (b[1] - a[1])*u, a[2] + (b[2] - a[2])*u];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a)/(b - a))); return t*t*(3 - 2*t); };
const LINE = hex('#1d0f1f');
const MAT = {
  skin: { shadow: hex('#a8604f'), base: hex('#e2a081'), light: hex('#f3c2a3'), high: hex('#ffe2cf'), rim: hex('#a9c6ff') },
  band: { shadow: hex('#9aa3bf'), base: hex('#e4e8f2'), light: hex('#f7f9ff'), high: hex('#ffffff'), rim: hex('#a9c6ff') },
  sleeve: { shadow: hex('#172656'), base: hex('#26408e'), light: hex('#3557b4'), high: hex('#5d7fd6'), rim: hex('#7fa2ff') },
  nail: { shadow: hex('#d7a092'), base: hex('#f2c7b9'), light: hex('#ffe3da'), high: hex('#fff4ef'), rim: hex('#ffffff') },
};
const BALL = hex('#e3ff36'), WHITE = [255, 255, 255];
// luce nello spazio dello schermo (x a destra, y in basso, z verso chi guarda): dall'alto a sinistra, davanti
const LIGHT = norm([-.5, -.68, .54]);
function ramp(m, b){
  let c = mix(m.shadow, m.base, sstep(-.02, .1, b));
  c = mix(c, m.light, sstep(.56, .64, b));
  return mix(c, m.high, sstep(.9, .96, b)*.75);
}

/* ---------- camera prospettica ---------- */
function makeCam(eye, target, f, cx, cy, mirror, W){
  const fw = norm(sub(target, eye)), r = norm(cross(fw, [0, 1, 0])), u = cross(r, fw);
  const cam = { eye, target, fw, r, u, f, cx, cy, mirror, W };
  cam.depth = P => dot(sub(P, eye), fw);
  cam.p = P => {
    const d = sub(P, eye), z = Math.max(.02, dot(d, fw)), x = cx + f*dot(d, r)/z;
    return { x: mirror ? W - x : x, y: cy - f*dot(d, u)/z, z };
  };
  cam.rad = (P, rr) => cam.f*rr/Math.max(.02, cam.depth(P));
  return cam;
}
// inquadratura: la camera guarda il centro dei punti del moto da `dir`, alla distanza data; focale e centro scelti
// perché tutto il moto stia nel riquadro utile (margini compresi): composizione uguale per ogni gesto e ogni schermo
function frame(points, dir, dist, box){
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of points) for (let i = 0; i < 3; i++){ lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
  const target = mul(add(lo, hi), .5), eye = add(target, mul(norm(dir), dist));
  const c0 = makeCam(eye, target, 1, 0, 0, false, 0);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of points){ const q = c0.p(p); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
  const f = Math.min(box.w/(x1 - x0), box.h/(y1 - y0));
  return { eye, target, f, cx: box.x + box.w/2 - f*(x0 + x1)/2, cy: box.y + box.h/2 - f*(y0 + y1)/2 };
}

/* ---------- forme ---------- */
// capsula rastremata tra due cerchi (tangenti esterne)
function capsulePath(c, a, b, ra, rb){
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
  if (L < 1e-3 || L <= Math.abs(ra - rb) + 1e-3){ const big = ra >= rb ? a : b, r = Math.max(ra, rb); c.moveTo(big.x + r, big.y); c.arc(big.x, big.y, r, 0, 2*Math.PI); return; }
  const ang = Math.atan2(dy, dx), s = Math.asin((ra - rb)/L), t1 = ang + Math.PI/2 + s, t2 = ang + 3*Math.PI/2 - s;
  c.moveTo(a.x + ra*Math.cos(t1), a.y + ra*Math.sin(t1));
  c.arc(a.x, a.y, ra, t1, t2);
  c.lineTo(b.x + rb*Math.cos(t2), b.y + rb*Math.sin(t2));
  c.arc(b.x, b.y, rb, t2 - 2*Math.PI, t1);
  c.closePath();
}
// sfumatura di un cilindro visto dalla camera: bande di luce lungo la sezione + luce di contorno dal lato in ombra
function tubeGrad(c, a, b, R, m){
  const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy/l, ny = dx/l, mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
  const g = c.createLinearGradient(mx + nx*R, my + ny*R, mx - nx*R, my - ny*R), lp = Math.hypot(LIGHT[0], LIGHT[1]);
  for (let i = 0; i <= 12; i++){
    const s = 1 - i/6, nz = Math.sqrt(Math.max(0, 1 - s*s)), side = (nx*s*LIGHT[0] + ny*s*LIGHT[1]);
    let col = ramp(m, side + nz*LIGHT[2]);
    col = mix(col, m.rim, sstep(.8, .97, Math.abs(s))*sstep(0, .5, -side/lp)*.6);
    g.addColorStop(i/12, css(col));
  }
  return g;
}
function cross2(o, a, b){ return (a.x - o.x)*(b.y - o.y) - (a.y - o.y)*(b.x - o.x); }
function hull(pts){
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y), lo = [], up = [];
  for (const q of p){ while (lo.length >= 2 && cross2(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--){ const q = p[i]; while (up.length >= 2 && cross2(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function smoothPath(c, P, grow = 0){
  let cx = 0, cy = 0; for (const p of P){ cx += p.x; cy += p.y; } cx /= P.length; cy /= P.length;
  const Q = P.map(p => { const dx = p.x - cx, dy = p.y - cy, l = Math.hypot(dx, dy) || 1; return { x: p.x + dx/l*grow, y: p.y + dy/l*grow }; });
  const mid = (a, b) => ({ x: (a.x + b.x)/2, y: (a.y + b.y)/2 }), n = Q.length;
  const m0 = mid(Q[n - 1], Q[0]); c.moveTo(m0.x, m0.y);
  for (let i = 0; i < n; i++){ const m = mid(Q[i], Q[(i + 1)%n]); c.quadraticCurveTo(Q[i].x, Q[i].y, m.x, m.y); }
  c.closePath();
}
const circlePts = (o, r, n = 18) => Array.from({ length: n }, (_, i) => ({ x: o.x + r*Math.cos(i/n*2*Math.PI), y: o.y + r*Math.sin(i/n*2*Math.PI) }));

/* ---------- telefono ---------- */
const HW = PHONE.w/2, HH = PHONE.h/2, HD = PHONE.d/2;
function rrect(inset = 0){
  const w = HW - inset, h = HH - inset, r = Math.max(.0015, PHONE.r - inset), out = [];
  for (const [cx, cy, a0] of [[w - r, h - r, 0], [-w + r, h - r, 90], [-w + r, -h + r, 180], [w - r, -h + r, 270]])
    for (let i = 0; i <= 6; i++){ const a = (a0 + i*15)*Math.PI/180; out.push([cx + r*Math.cos(a), cy + r*Math.sin(a)]); }
  return out;
}
const RR = rrect(), RR_SCREEN = rrect(.0022);
const polyPath = (c, P) => { c.moveTo(P[0].x, P[0].y); for (let i = 1; i < P.length; i++) c.lineTo(P[i].x, P[i].y); c.closePath(); };

function drawPhone(c, cam, pose, st, flat){
  const T = v => add(pose.pos, qrot(pose.q, v));
  const front = RR.map(p => cam.p(T([p[0], p[1], HD]))), back = RR.map(p => cam.p(T([p[0], p[1], -HD])));
  const H = hull(front.concat(back)), ow = st.ow;
  c.beginPath(); polyPath(c, H); c.lineJoin = 'round'; c.lineWidth = ow*2; c.strokeStyle = flat ? flat.line : css(LINE); c.stroke();
  if (flat){ c.fillStyle = flat.fill; c.fill(); return H; }
  // bordo metallico (la lastra vista di taglio): gradiente lungo la luce
  const bb = bbox(H), g = c.createLinearGradient(bb.x0, bb.y0, bb.x1, bb.y1);
  g.addColorStop(0, '#dfe5f2'); g.addColorStop(.35, '#8d96ad'); g.addColorStop(.7, '#4a5268'); g.addColorStop(1, '#2a3043');
  c.fillStyle = g; c.fill();
  const facing = dot(qrot(pose.q, [0, 0, 1]), sub(cam.eye, pose.pos)) > 0;
  if (facing){
    c.beginPath(); polyPath(c, front); c.fillStyle = '#05070f'; c.fill();
    const scr = RR_SCREEN.map(p => cam.p(T([p[0], p[1], HD])));
    c.save(); c.beginPath(); polyPath(c, scr); c.clip();
    drawScreen(c, cam, T);
    // riflesso del vetro
    const b2 = bbox(scr), rg = c.createLinearGradient(b2.x0, b2.y0, b2.x1, b2.y1);
    rg.addColorStop(0, 'rgba(255,255,255,.16)'); rg.addColorStop(.33, 'rgba(255,255,255,.03)'); rg.addColorStop(.34, 'rgba(255,255,255,0)');
    rg.addColorStop(.52, 'rgba(255,255,255,0)'); rg.addColorStop(.53, 'rgba(255,255,255,.06)'); rg.addColorStop(.62, 'rgba(255,255,255,0)');
    c.fillStyle = rg; c.fillRect(b2.x0, b2.y0, b2.x1 - b2.x0, b2.y1 - b2.y0);
    c.restore();
  } else {
    c.beginPath(); polyPath(c, back);
    const b2 = bbox(back), bg = c.createLinearGradient(b2.x0, b2.y0, b2.x1, b2.y1);
    bg.addColorStop(0, '#3b4560'); bg.addColorStop(.5, '#232a3d'); bg.addColorStop(1, '#151a28'); c.fillStyle = bg; c.fill();
    // modulo fotocamera (in alto a sinistra guardando il dorso)
    const cm = rrectAt(.022, .058, .017, .02, .006).map(p => cam.p(T([p[0], p[1], -HD - .0012])));
    c.beginPath(); polyPath(c, cm); c.fillStyle = '#2d3550'; c.fill(); c.lineWidth = Math.max(1, ow*.6); c.strokeStyle = 'rgba(10,12,22,.9)'; c.stroke();
    for (const [x, y] of [[.017, .064], [.017, .052], [.027, .058]]){
      const o = cam.p(T([x, y, -HD - .0018])), r = cam.rad(T([x, y, 0]), .0034);
      c.beginPath(); c.arc(o.x, o.y, r, 0, 2*Math.PI); c.fillStyle = '#0a0d18'; c.fill(); c.lineWidth = Math.max(.8, r*.25); c.strokeStyle = '#6f7894'; c.stroke();
    }
  }
  return H;
}
function rrectAt(cx, cy, w, h, r){
  const out = [];
  for (const [x, y, a0] of [[cx + w/2 - r, cy + h/2 - r, 0], [cx - w/2 + r, cy + h/2 - r, 90], [cx - w/2 + r, cy - h/2 + r, 180], [cx + w/2 - r, cy - h/2 + r, 270]])
    for (let i = 0; i <= 4; i++){ const a = (a0 + i*22.5)*Math.PI/180; out.push([x + r*Math.cos(a), y + r*Math.sin(a)]); }
  return out;
}
function bbox(P){ let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of P){ x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); } return { x0, y0, x1, y1 }; }
// schermata «Pronto» della pagina del telefono, in mm sul piano dello schermo (trasformazione affine dai tre angoli)
function drawScreen(c, cam, T){
  const A = cam.p(T([-HW, -HH, HD])), B = cam.p(T([HW, -HH, HD])), C = cam.p(T([-HW, HH, HD])), O = cam.p(T([0, 0, HD]));
  let ax = (B.x - A.x)/(PHONE.w*1000), ay = (B.y - A.y)/(PHONE.w*1000);
  const bx = (C.x - A.x)/(PHONE.h*1000), by = (C.y - A.y)/(PHONE.h*1000);
  if (cam.mirror){ ax = -ax; ay = -ay; }                     // mancino: l'immagine è specchiata, la scritta no
  c.save(); c.transform(ax, ay, bx, by, O.x, O.y);
  const g = c.createLinearGradient(0, 80, 0, -80); g.addColorStop(0, '#1c2c9e'); g.addColorStop(1, '#0a1356');
  c.fillStyle = g; c.fillRect(-45, -90, 90, 180);
  // anello verde e scritta
  c.lineWidth = 2.2; c.strokeStyle = '#36e07a'; c.beginPath(); c.arc(0, 20, 21, 0, 2*Math.PI); c.stroke();
  c.fillStyle = 'rgba(54,224,122,.12)'; c.fill();
  c.save(); c.scale(1, -1);
  c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '700 8.5px Barlow, sans-serif'; c.fillText('Pronto', 0, -20);
  c.fillStyle = 'rgba(220,228,255,.75)'; c.font = '500 3.6px Barlow, sans-serif'; c.fillText('Guarda il computer per iniziare', 0, 9);
  c.restore();
  // tre pulsanti in basso
  c.lineWidth = .7; c.strokeStyle = 'rgba(160,180,255,.7)'; c.fillStyle = 'rgba(70,95,220,.55)';
  for (const x of [-24, 0, 24]){ c.beginPath(); c.roundRect(x - 10.5, -66, 21, 8, 4); c.fill(); c.stroke(); }
  c.restore();
}

/* ---------- la figura: braccio, mano e telefono ---------- */
// costruisce le parti (forme proiettate) e le divide tra «dietro il telefono» e «davanti», in ordine di profondità
function figure(cam, pose, short = false){
  const rig = rigPose(pose, SHOULDER), P = cam.p;
  const qi = qconj(pose.q), toLocal = X => qrot(qi, sub(X, pose.pos));
  const clampBox = l => [Math.max(-HW, Math.min(HW, l[0])), Math.max(-HH, Math.min(HH, l[1])), Math.max(-HD, Math.min(HD, l[2]))];
  const sideOf = X => { const B = add(pose.pos, qrot(pose.q, clampBox(toLocal(X)))); return cam.depth(X) < cam.depth(B) - .0015 ? 'front' : 'back'; };
  const R = (X, r) => cam.rad(X, r);
  const cap = (A, B, ra, rb, m, extra) => {
    const a = P(A), b = P(B), Ra = R(A, ra), Rb = R(B, rb);
    return { a, b, Ra, Rb, path: (c, g) => capsulePath(c, a, b, Ra + g, Rb + g), fill: c => tubeGrad(c, a, b, (Ra + Rb)/2, m), depth: cam.depth(mul(add(A, B), .5)), ...extra };
  };
  // gruppo «braccio e palmo» (un solo contorno): avambraccio rastremato, palmo, falangi prossimali, metacarpo del pollice
  const arm = [];
  const prof = FOREARM_PROFILE, along = u => add(rig.W, mul(sub(rig.E, rig.W), u));
  const rAt = u => { for (let i = 1; i < prof.length; i++) if (u <= prof[i][0]){ const k = (u - prof[i - 1][0])/(prof[i][0] - prof[i - 1][0]); return (prof[i - 1][1] + (prof[i][1] - prof[i - 1][1])*k)/1000; } return prof[prof.length - 1][1]/1000; };
  // pelle dal polso alla manica, poi manica lunga (più larga) fino al gomito e braccio superiore accennato
  const fe = short ? .3 : CUFF, NS = short ? 2 : 4;
  for (let i = 0; i < NS; i++){ const u0 = fe*i/NS, u1 = fe*(i + 1)/NS; arm.push(cap(along(u0), along(u1), rAt(u0), rAt(u1), MAT.skin, { kind: 'fore' })); }
  const sl = u => rAt(u) + .0065;
  for (let i = 0; i < (short ? 0 : 3); i++){ const u0 = CUFF + (1 - CUFF)*i/3, u1 = CUFF + (1 - CUFF)*(i + 1)/3; arm.push(cap(along(u0), along(u1), sl(u0), sl(u1), MAT.sleeve, { kind: 'sleeve' })); }
  const S2 = rig.E;
  const palmPts = [];
  palmPts.push(...circlePts(P(rig.W), R(rig.W, .024)));
  for (const h of rig.heel) palmPts.push(...circlePts(P(h.p), R(h.p, h.r)));
  for (const f of rig.fingers) palmPts.push(...circlePts(P(f.pts[0]), R(f.pts[0], f.r[0] + .0015), 10));
  palmPts.push(...circlePts(P(rig.thumb.pts[0]), R(rig.thumb.pts[0], rig.thumb.r[0]), 12));
  const palmHull = hull(palmPts), palmC = P(rig.heel[2].p), palmR = R(rig.heel[2].p, .055);
  const palm = { path: (c, g) => smoothPath(c, palmHull, g), fill: c => {
    const g = c.createRadialGradient(palmC.x + LIGHT[0]*palmR*.5, palmC.y + LIGHT[1]*palmR*.5, palmR*.1, palmC.x, palmC.y, palmR*1.15);
    g.addColorStop(0, css(MAT.skin.light)); g.addColorStop(.5, css(MAT.skin.base)); g.addColorStop(.86, css(mix(MAT.skin.base, MAT.skin.shadow, .6))); g.addColorStop(1, css(MAT.skin.shadow));
    return g; }, kind: 'palm' };
  arm.push(palm);
  for (const f of rig.fingers) arm.push(cap(f.pts[0], f.pts[1], f.r[0], f.r[1], MAT.skin, { kind: 'prox' }));
  arm.push(cap(rig.thumb.pts[0], rig.thumb.pts[1], rig.thumb.r[0], rig.thumb.r[1], MAT.skin, { kind: 'thumb0' }));
  const toCam = sub(cam.eye, pose.pos), screenSide = dot(qrot(pose.q, [0, 0, 1]), toCam) > 0;
  const armSide = screenSide ? 'back' : 'front';
  // dita: falangi media e distale separate (contorno proprio: si leggono le singole dita), con l'unghia se visibile
  const parts = [];
  const nailOf = (A, B, rr, dorsal) => {
    const vis = dot(norm(dorsal), norm(sub(cam.eye, B)));
    if (vis < .15) return null;
    const C = add(add(B, mul(sub(A, B), .3)), mul(norm(dorsal), rr*.62)), c0 = P(C), dir = P(add(C, mul(norm(sub(B, A)), .006)));
    return { c: c0, rx: R(C, rr*.62), ry: R(C, rr*.5)*(.45 + .55*vis), ang: Math.atan2(dir.y - c0.y, dir.x - c0.x) };
  };
  HAND.fingers.forEach((fd, i) => {
    const f = rig.fingers[i], k = norm(cross(norm(fd.dir), HAND.palmN));
    let ang = (fd.flex[0] + fd.flex[1])*Math.PI/180;
    for (let s = 1; s < 3; s++){
      const A = f.pts[s], B = f.pts[s + 1], part = cap(A, B, f.r[s], f.r[s + 1], MAT.skin, { kind: 'finger', group: 'f' + i });
      if (s === 2){ ang += fd.flex[2]*Math.PI/180; const dl = qrot(pose.q, rotLocal([0, 0, -1], k, ang)); part.nail = nailOf(A, B, f.r[3], dl); }
      part.side = sideOf(mul(add(A, B), .5)); parts.push(part);
    }
  });
  for (let s = 1; s < 3; s++){
    const t = rig.thumb, A = t.pts[s], B = t.pts[s + 1], part = cap(A, B, t.r[s], t.r[s + 1], MAT.skin, { kind: 'thumb', group: 'thumb' });
    if (s === 2) part.nail = nailOf(A, B, t.r[3], qrot(pose.q, [.25, 0, 1]));   // il dorso del pollice guarda il lato dello schermo
    part.side = sideOf(mul(add(A, B), .5)); parts.push(part);
  }
  // polsino: un cilindro corto (inviluppo dei due anelli di sezione proiettati), non una capsula: bordi diritti, l'orlo
  // visibile come ellisse, la riga colorata lungo la sezione di mezzo (solo la metà rivolta alla camera)
  const ax = norm(sub(rig.E, rig.W)), e1 = norm(cross(ax, Math.abs(ax[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), e2 = cross(ax, e1);
  const ring = (u, rr, n = 24) => { const C = along(u); return Array.from({ length: n }, (_, j) => { const a = j/n*2*Math.PI, nn = add(mul(e1, Math.cos(a)), mul(e2, Math.sin(a))), X = add(C, mul(nn, rr)); return { ...P(X), vis: dot(nn, sub(cam.eye, X)) > 0 }; }); };
  const bA = ring(BAND.from, rAt(BAND.from) + .0022), bB = ring(BAND.to, rAt(BAND.to) + .0022), bM = ring((BAND.from + BAND.to)/2, rAt((BAND.from + BAND.to)/2) + .0022);
  const endVis = dot(ax, sub(cam.eye, along(BAND.to))) > 0 ? bB : dot(mul(ax, -1), sub(cam.eye, along(BAND.from))) > 0 ? bA : null;
  const band = { a: P(along(BAND.from)), b: P(along(BAND.to)), Ra: R(along(BAND.from), rAt(BAND.from) + .0022), Rb: R(along(BAND.to), rAt(BAND.to) + .0022), hull: hull(bA.concat(bB)), mid: bM, end: endVis,
    // avambraccio verso la camera (gomito più vicino del polso): il polsino sta dietro la parte vicina dell'avambraccio
    under: cam.depth(rig.E) < cam.depth(rig.W) - .06 };
  const cuff = { c: P(along(CUFF)), r: R(along(CUFF), sl(CUFF)), d: P(along(CUFF + .05)) };
  // la manica sfuma verso la spalla (fuori quadro); mai sopra la mano, anche con l'avambraccio di scorcio
  const fc = P(rig.E), w = P(rig.W), fr = Math.min(R(rig.E, .11), .62*Math.hypot(fc.x - w.x, fc.y - w.y));
  // rettangolo occupato dalla figura (px del dispositivo): gli strati si puliscono e si compongono solo lì
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x, y, r) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
  for (const q of arm.concat(parts)) if (q.a){ grow(q.a.x, q.a.y, q.Ra); grow(q.b.x, q.b.y, q.Rb); }
  for (const q of palmHull) grow(q.x, q.y, 0);
  for (const v of [[-HW, HH], [HW, HH], [-HW, -HH], [HW, -HH]]){ const q = P(add(pose.pos, qrot(pose.q, [v[0], v[1], 0]))); grow(q.x, q.y, 0); }
  const m = 14, d = st.dpr, Wd = st.layer.width, Hd = st.layer.height;
  const rx = Math.max(0, Math.floor((x0 - m)*d)), ry = Math.max(0, Math.floor((y0 - m)*d));
  const rect = { x: rx, y: ry, w: Math.max(1, Math.min(Wd, Math.ceil((x1 + m)*d)) - rx), h: Math.max(1, Math.min(Hd, Math.ceil((y1 + m)*d)) - ry) };
  return { rig, arm, armSide, parts, band, cuff, upperFade: { c: fc, r: fr }, elbow: P(rig.E), rect };
}
const rotLocal = (v, k, ang) => { const c = Math.cos(ang), s = Math.sin(ang), d = dot(k, v), x = cross(k, v); return [v[0]*c + x[0]*s + k[0]*d*(1 - c), v[1]*c + x[1]*s + k[1]*d*(1 - c), v[2]*c + x[2]*s + k[2]*d*(1 - c)]; };

function drawShapes(c, shapes, st, flat){
  // contorno: ogni forma allargata, piena del colore della linea; poi i riempimenti: le forme si fondono senza linee interne
  c.fillStyle = flat ? flat.line : css(LINE);
  for (const s of shapes){ c.beginPath(); s.path(c, st.ow); c.fill(); }
  for (const s of shapes){ c.beginPath(); s.path(c, 0); c.fillStyle = flat ? flat.fill : s.fill(c); c.fill(); }
}
// le falangi dello stesso dito dalla stessa parte del telefono formano un'unità: prima tutti i contorni, poi tutti i
// riempimenti (un solo contorno: il dito si legge intero, non come una fila di capsule)
function unitsOf(parts){
  const m = new Map();
  for (const p of parts){ const k = p.group || p; if (!m.has(k)) m.set(k, []); m.get(k).push(p); }
  return [...m.values()].map(ps => ({ ps: ps.sort((a, b) => b.depth - a.depth), depth: Math.min(...ps.map(p => p.depth)) })).sort((a, b) => b.depth - a.depth);
}
function drawUnit(c, U, st, flat){
  c.fillStyle = flat ? flat.line : css(LINE);
  for (const p of U.ps){ c.beginPath(); p.path(c, st.ow); c.fill(); }
  for (const p of U.ps){ c.beginPath(); p.path(c, 0); c.fillStyle = flat ? flat.fill : p.fill(c); c.fill(); }
  if (!flat) for (const p of U.ps) if (p.nail) drawNail(c, p.nail, st);
}
function drawPart(c, p, st, flat){
  c.beginPath(); p.path(c, st.ow); c.fillStyle = flat ? flat.line : css(LINE); c.fill();
  c.beginPath(); p.path(c, 0); c.fillStyle = flat ? flat.fill : p.fill(c); c.fill();
  if (!flat && p.nail) drawNail(c, p.nail, st);
}
function drawNail(c, n, st){
  c.save(); c.translate(n.c.x, n.c.y); c.rotate(n.ang);
  c.beginPath(); c.ellipse(0, 0, n.rx, n.ry, 0, 0, 2*Math.PI);
  const g = c.createLinearGradient(-n.rx, -n.ry, n.rx, n.ry); g.addColorStop(0, css(MAT.nail.high)); g.addColorStop(.6, css(MAT.nail.base)); g.addColorStop(1, css(MAT.nail.shadow));
  c.fillStyle = g; c.fill(); c.lineWidth = Math.max(.6, st.ow*.45); c.strokeStyle = css(MAT.skin.shadow, .9); c.stroke(); c.restore();
}
// polsino: cilindro corto con l'orlo e la riga colorata
function drawBand(l, F, st){
  const b = F.band; l.save();
  l.beginPath(); polyPath(l, b.hull); l.lineJoin = 'round'; l.lineWidth = st.ow*2; l.strokeStyle = css(LINE); l.stroke();
  l.fillStyle = tubeGrad(l, b.a, b.b, (b.Ra + b.Rb)/2, MAT.band); l.fill();
  // orlo visibile (l'estremità rivolta alla camera) e riga colorata a metà, solo sul lato visibile
  if (b.end){ l.beginPath(); polyPath(l, b.end); l.lineWidth = Math.max(1, st.ow*.6); l.strokeStyle = css(MAT.band.shadow, .55); l.stroke(); }
  l.beginPath(); polyPath(l, b.hull); l.clip();
  const vis = b.mid.filter(q => q.vis);
  if (vis.length > 2){
    // la metà visibile dell'anello è contigua: si riparte dal primo punto dopo uno non visibile
    const n = b.mid.length, k0 = b.mid.findIndex((q, j) => q.vis && !b.mid[(j + n - 1)%n].vis), seq = [];
    for (let j = 0; j < n; j++){ const q = b.mid[(Math.max(0, k0) + j)%n]; if (!q.vis) break; seq.push(q); }
    l.beginPath(); seq.forEach((q, j) => j ? l.lineTo(q.x, q.y) : l.moveTo(q.x, q.y));
    l.lineCap = 'butt'; l.lineWidth = Math.max(1.2, (b.Ra + b.Rb)*.14); l.strokeStyle = 'rgba(47,107,255,.95)'; l.stroke();
  }
  l.restore();
}
// disegna la figura intera. flat = { fill, line } per i fantasmi (sagoma piatta)
function drawArmInto(l, F, st, flat){
  if (!flat && F.band.under) drawBand(l, F, st);
  drawShapes(l, F.arm, st, flat);
  if (!flat){
    if (!F.band.under) drawBand(l, F, st);
    l.save();
    // orlo della manica: un arco di sezione (ellisse vista di scorcio)
    const cf = F.cuff, ex = cf.d.x - cf.c.x, ey = cf.d.y - cf.c.y;
    l.translate(cf.c.x, cf.c.y); l.rotate(Math.atan2(ey, ex));
    l.beginPath(); l.ellipse(0, 0, Math.max(1.5, cf.r*.28), cf.r*.98, 0, -Math.PI/2, Math.PI/2); l.lineWidth = st.ow*1.1; l.strokeStyle = css(LINE); l.stroke();
    l.restore();
    // la manica si perde verso la spalla (fuori quadro)
    l.save(); l.globalCompositeOperation = 'destination-out';
    const fu = F.upperFade, g = l.createRadialGradient(fu.c.x, fu.c.y, 0, fu.c.x, fu.c.y, fu.r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.35, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = g; l.fillRect(fu.c.x - fu.r, fu.c.y - fu.r, fu.r*2, fu.r*2); l.restore();
  }
}
// disegna la figura intera. flat = { fill, line } per i fantasmi (sagoma piatta). Un solo strato fuori schermo, pulito e
// composto solo nel rettangolo della figura: dietro il telefono (braccio, dita, ombra del telefono sulla pelle), il
// telefono, poi davanti (ombra delle dita sul vetro, dita; braccio se è lui davanti)
function drawFigure(c, cam, pose, st, flat = null){
  const F = figure(cam, pose, !!flat), L = st.layer, l = L.getContext('2d'), R = F.rect;
  const clearL = () => { l.setTransform(1, 0, 0, 1, 0, 0); l.clearRect(R.x, R.y, R.w, R.h); l.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); };
  const blit = () => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(L, R.x, R.y, R.w, R.h, R.x, R.y, R.w, R.h); c.restore(); };
  const back = F.parts.filter(p => p.side === 'back'), front = F.parts.filter(p => p.side === 'front');
  if (F.armSide === 'back' || back.length){
    clearL();
    if (F.armSide === 'back') drawArmInto(l, F, st, flat);
    for (const U of unitsOf(back)) drawUnit(l, U, st, flat);
    if (!flat){
      // ombra morbida del telefono solo sulla pelle già disegnata (source-atop), senza filtri: due passate sfalsate
      const T = v => add(pose.pos, qrot(pose.q, v)), ph = hull(RR.map(p => cam.p(T([p[0], p[1], 0]))));
      l.globalCompositeOperation = 'source-atop';
      for (const [k, a] of [[1.1, .26], [1.9, .2]]){
        l.save(); l.translate(-LIGHT[0]*st.shadow*k, -LIGHT[1]*st.shadow*k);
        l.beginPath(); polyPath(l, ph); l.fillStyle = `rgba(40,6,30,${a})`; l.fill(); l.restore();
      }
      l.globalCompositeOperation = 'source-over';
    }
    blit();
  }
  const H = drawPhone(c, cam, pose, st, flat);
  if (!flat && front.length){
    c.save(); c.beginPath(); polyPath(c, H); c.clip(); c.fillStyle = 'rgba(2,4,16,.42)';
    c.translate(-LIGHT[0]*st.shadow, -LIGHT[1]*st.shadow);
    for (const p of front){ c.beginPath(); p.path(c, st.ow*.6); c.fill(); }
    c.restore();
  }
  if (F.armSide === 'front'){ clearL(); drawArmInto(l, F, st, flat); blit(); }
  for (const U of unitsOf(front)) drawUnit(c, U, st, flat);
  return F;
}

/* ---------- stato e scena ---------- */
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const state = { card: 0, hand: 'right', rateMode: 'alt', t: 0, cycle: 0, frozen: null, seen: new Set([0]) };
const st = { dpr: 1, W: 0, H: 0, ow: 2, shadow: 4, layer: document.createElement('canvas'), ghost: document.createElement('canvas'), frames: new Map() };
const card = () => CARDS[state.card];

// risoluzione adattiva: densità del canvas = quella dello schermo (max 2), ridotta a passi di 0,25 (fino a 1) se il
// disegno supera 12 ms per 40 fotogrammi di fila: su schermi lenti resta fluido, su ledwall (densità 1) resta nativo
const perf = { cap: 2, slow: 0 };
function resize(){
  const r = cv.getBoundingClientRect(), dpr = Math.max(1, Math.min(perf.cap, window.devicePixelRatio || 1));
  st.dpr = dpr; st.W = r.width; st.H = r.height;
  for (const k of [cv, st.layer, st.ghost]){ k.width = Math.round(r.width*dpr); k.height = Math.round(r.height*dpr); }
  st.frames.clear(); ghostCache.clear(); st.ghostRect = null;
}
// punti del moto per l'inquadratura (cima, base e angoli del telefono, polso, metà avambraccio, punte delle dita)
function motionPoints(id){
  const P = plan(id), pts = [], n = id === 'grip' ? 1 : Math.ceil(P.total*30);
  for (let i = 0; i < n; i++){
    const pose = gesturePose(id, i/30), T = v => add(pose.pos, qrot(pose.q, v)), rig = rigPose(pose, SHOULDER);
    pts.push(T([-HW, HH, 0]), T([HW, HH, 0]), T([-HW, -HH, 0]), T([HW, -HH, 0]), rig.W);
    if (id === 'grip') pts.push(add(rig.W, mul(sub(rig.E, rig.W), .3)));
    for (const f of rig.fingers) pts.push(f.pts[3]);
  }
  return pts;
}
function camFor(id, view, mirror){
  const key = `${id}|${view}|${st.W}x${st.H}`;
  if (!st.frames.has(key)){
    const W = st.W, H = st.H, box = id === 'grip' ? { x: W*.25, y: H*.12, w: W*.5, h: H*.72 } : { x: W*.14, y: H*.1, w: W*.72, h: H*(1 - HUD_H - .14) };
    st.frames.set(key, { ...frame(motionPoints(id), VIEWS[id][view], DIST[id] || 2.2, box), box });
  }
  const fr = st.frames.get(key);
  return makeCam(fr.eye, fr.target, fr.f, fr.cx, fr.cy, mirror, st.W);
}
function followCam(id, t, mirror){
  const base = camFor(id, 0, mirror), P = plan(id), D0 = len(sub(base.eye, base.target)), dir = norm(sub(base.eye, base.target));
  let m = [0, 0, 0]; const n = 24;
  for (let i = 0; i <= n; i++){ const tt = t + (i/n - .5)*.9, w = Math.sin(Math.PI*(i + .5)/(n + 1)); m = add(m, mul(gesturePose(id, ((tt % P.total) + P.total) % P.total).pos, w)); }
  let ws = 0; for (let i = 0; i <= n; i++) ws += Math.sin(Math.PI*(i + .5)/(n + 1));
  const target = mul(m, 1/ws), b = st.frames.get(`${id}|0|${st.W}x${st.H}`).box;
  return makeCam(add(target, mul(dir, D0)), target, b.h*D0/FOLLOW[id], b.x + b.w/2, b.y + b.h*.52, mirror, st.W);
}
// camera della presa: due viste ferme e un giro morbido tra le due (gira la camera, non la mano)
function gripCam(t, mirror){
  const P = 8, u = (t % P)/P, hold = .32, a = u < hold ? 0 : u < .5 ? sstep(hold, .5, u) : u < .5 + hold ? 1 : 1 - sstep(.5 + hold, 1, u);
  const A = camFor('grip', 0, mirror), B = camFor('grip', 1, mirror);
  if (a <= 0) return { cam: A, a }; if (a >= 1) return { cam: B, a };
  // interpolazione sferica della direzione e lineare degli altri parametri
  const dA = norm(sub(A.eye, A.target)), dB = norm(sub(B.eye, B.target)), ang = Math.acos(Math.max(-1, Math.min(1, dot(dA, dB))));
  const d = norm(add(mul(dA, Math.sin((1 - a)*ang)), mul(dB, Math.sin(a*ang)))), target = add(mul(A.target, 1 - a), mul(B.target, a));
  const dist = len(sub(A.eye, A.target))*(1 - a) + len(sub(B.eye, B.target))*a;
  return { cam: makeCam(add(target, mul(d, dist)), target, A.f*(1 - a) + B.f*a, A.cx*(1 - a) + B.cx*a, A.cy*(1 - a) + B.cy*a, mirror, st.W), a };
}

/* ---------- strati didattici ---------- */
const tipOf = (pose, k = 1) => add(pose.pos, qrot(pose.q, [0, HH*k, 0]));
// punto di contatto con la palla: davanti alla faccia del telefono che guarda la palla in arrivo (−z), verso la cima
function contactPoint(id){
  const P = plan(id), pose = gesturePose(id, P.contact), n = qrot(pose.q, [0, 0, 1]), s = dot(n, [0, 0, -1]) >= 0 ? 1 : -1;
  return add(add(pose.pos, qrot(pose.q, [0, HH*.72, 0])), mul(n, s*(HD + BALL_R)));
}
function drawBall(c, cam, X, spin, st){
  const p = cam.p(X), r = cam.rad(X, BALL_R);
  c.save();
  c.beginPath(); c.arc(p.x, p.y, r + st.ow, 0, 2*Math.PI); c.fillStyle = css(LINE); c.fill();
  const g = c.createRadialGradient(p.x + LIGHT[0]*r*.45, p.y + LIGHT[1]*r*.45, r*.1, p.x, p.y, r);
  g.addColorStop(0, '#f8ffa6'); g.addColorStop(.55, '#d9f22e'); g.addColorStop(1, '#8aa312');
  c.beginPath(); c.arc(p.x, p.y, r, 0, 2*Math.PI); c.fillStyle = g; c.fill();
  c.clip(); c.lineWidth = Math.max(1, r*.13); c.strokeStyle = 'rgba(255,255,240,.85)';
  c.translate(p.x, p.y); c.rotate(spin);
  c.beginPath(); c.arc(-r*1.05, 0, r*.78, -1.1, 1.1); c.stroke(); c.beginPath(); c.arc(r*1.05, 0, r*.78, Math.PI - 1.1, Math.PI + 1.1); c.stroke();
  c.restore();
}
function phaseLabel(id, ph, u){
  if (id === 'serve') return { ready: 'Pronto', prep: 'Pronto al lancio', toss: 'Lancio', link: 'Braccio in alto', swing: u < .5 ? 'Battuta' : 'Accompagna', follow: 'Accompagna', back: 'Ritorno', rest: 'Pronto' }[ph];
  return { ready: 'Pronto', prep: 'Carica', swing: u < .5 ? 'Colpo' : 'Accompagna', follow: 'Accompagna', back: 'Ritorno', rest: 'Pronto', still: 'Ferma' }[ph];
}
// curva della velocità di rotazione del telefono lungo il ciclo (precalcolata)
const curves = new Map();
function curveOf(id){
  if (!curves.has(id)){
    const P = plan(id), n = 360, v = [];
    for (let i = 0; i <= n; i++) v.push(rotSpeed(id, i/n*P.total));
    let k = 0; for (let i = 1; i <= n; i++) if (v[i] > v[k]) k = i;
    curves.set(id, { v, n, peakI: k, peak: v[k] });
  }
  return curves.get(id);
}
function roundRect(c, x, y, w, h, r){ c.beginPath(); c.roundRect(x, y, w, h, r); }
function pill(c, x, y, text, { bg = 'rgba(8,14,40,.82)', fg = '#f4f6fc', border = 'rgba(176,194,255,.4)', size = 12, align = 'center', num = null, numBg = BALL } = {}){
  c.save(); c.font = `700 ${size}px Barlow, sans-serif`; const tw = c.measureText(text).width, h = size*1.9, nw = num ? h : 0, w = tw + size*1.3 + nw;
  const x0 = align === 'center' ? x - w/2 : align === 'right' ? x - w : x;
  roundRect(c, x0, y - h/2, w, h, h/2); c.fillStyle = bg; c.fill(); c.lineWidth = 1; c.strokeStyle = border; c.stroke();
  if (num){ c.beginPath(); c.arc(x0 + h/2, y, h/2 - 2, 0, 2*Math.PI); c.fillStyle = css(numBg); c.fill(); c.fillStyle = '#0a1330'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(num, x0 + h/2, y + .5); }
  c.fillStyle = fg; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(text, x0 + nw + size*.65, y + .5);
  c.restore(); return { x0, w, h };
}

/* ---------- fotogramma ---------- */
function render(t){
  const W = st.W, H = st.H, c = ctx, id = card().id, mirror = state.hand === 'left';
  c.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); c.clearRect(0, 0, W, H);
  const k = W/760;                                   // scala dei testi: proporzionale allo stadio
  st.ow = Math.max(1.2, 2.1*Math.sqrt(W/900)); st.shadow = 5*W/1100;
  // il fondo (luce di scena e vignettatura) è il CSS dello stadio: il canvas disegna solo ciò che si muove
  if (id === 'grip') return renderGrip(c, t, mirror, k);
  const P = plan(id), cam = FOLLOW[id] ? followCam(id, t, mirror) : camFor(id, 0, mirror), pose = gesturePose(id, t);
  // fantasmi delle pose chiave: compaiono quando la mano ci passa, restano fino al ritorno, poi sfumano
  const ghosts = P.keys.map((key, i) => {
    // con la camera che segue (servizio) un fantasma rimasto sotto, nella banda della curva, si spegne
    const gy = cam.p(gesturePose(id, key.t).pos).y, low = 1 - sstep(st.H*(1 - HUD_H) - 40, st.H*(1 - HUD_H) + 10, gy);
    const a = t < key.t ? 0 : Math.min(1, (t - key.t)/.12)*(1 - sstep(P.T.home - .25, P.T.home + .1, t))*low;
    return { key, i, a };
  });
  const SK = window.__skip || {};
  for (const g of ghosts){ if (SK.ghost || g.a <= .01) continue; drawGhost(c, cam, gesturePose(id, g.key.t), g.a, FOLLOW[id] ? null : `${id}|${state.hand}|${g.i}|${st.W}x${st.H}@${st.dpr}`); }
  if (!SK.arrow) drawArrows(c, cam, id, P, t);
  if (!SK.trail) drawTrail(c, cam, id, t);
  // palla: dietro o davanti alla figura secondo la profondità
  const ballX = ballAt(id, t), spin = t*14;
  const ballFirst = ballX && cam.depth(ballX) > cam.depth(pose.pos);
  if (ballX && ballFirst) drawBall(c, cam, ballX, spin, st);
  if (!SK.figure) drawFigure(c, cam, pose, st);
  if (ballX && !ballFirst) drawBall(c, cam, ballX, spin, st);
  drawImpact(c, cam, id, P, t);
  // etichette dei fantasmi: oltre la cima, verso l'esterno dell'arco (lontano dalla spalla)
  // etichette dei fantasmi fuori dall'arco: dal centro del percorso della cima verso la cima del fantasma
  // l'etichetta si spegne mentre il telefono vivo passa sopra il suo fantasma (non copre mai il gesto)
  const ctr = pathCentre(cam, id, P), lc = cam.p(pose.pos), plen = Math.hypot(...['x', 'y'].map(a => cam.p(tipOf(pose))[a] - cam.p(tipOf(pose, -1))[a]));
  for (const g of ghosts){
    if (g.a <= .01) continue;
    const gp = gesturePose(id, g.key.t), gc = cam.p(gp.pos), near = sstep(.55, 1.1, Math.hypot(gc.x - lc.x, gc.y - lc.y)/Math.max(1, plen));
    const tp = cam.p(tipOf(gp, 1.1)), dx = tp.x - ctr.x, dy = tp.y - ctr.y, dl = Math.hypot(dx, dy) || 1;
    if (g.a*near <= .01) continue;
    // mai sopra la banda della curva né fuori dallo stadio
    const lx = Math.max(60*k, Math.min(st.W - 60*k, tp.x + dx/dl*40*k)), ly = Math.max(16*k, Math.min(st.H*(1 - HUD_H) - 22*k, tp.y + dy/dl*30*k));
    c.globalAlpha = g.a*near; pill(c, lx, ly, g.key.label, { num: String(g.i + 1), size: Math.round(11*k) }); c.globalAlpha = 1;
  }
  if (!SK.hud) drawHud(c, id, P, t, pose, k);
}
function pathCentre(cam, id, P){
  let x = 0, y = 0, n = 0;
  for (let i = 0; i <= 24; i++){ const p = cam.p(tipOf(gesturePose(id, P.T.load + (P.T.end - P.T.load)*i/24), 1)); x += p.x; y += p.y; n++; }
  for (const key of P.keys){ const p = cam.p(tipOf(gesturePose(id, key.t), 1)); x += p.x*4; y += p.y*4; n += 4; }
  return { x: x/n, y: y/n };
}
function ballAt(id, t){
  const P = plan(id);
  if (id === 'serve'){
    const rel = add(tipOf(gesturePose('serve', P.T.tossEnd), .6), [0, BALL_R*1.5, 0]);
    return serveBall(t, rel, contactPoint('serve'));
  }
  return strokeBall(id, t, contactPoint(id));
}
// ellisse a terra sotto la spalla: riferimento di prospettiva (dove sta chi gioca), molto tenue
function drawFloorRing(c, cam, id, P){
  const C = [SHOULDER[0], .0, SHOULDER[2]], pts = [];
  for (let i = 0; i <= 48; i++){ const a = i/48*2*Math.PI; pts.push(cam.p([C[0] + Math.cos(a)*.55, 0, C[2] + Math.sin(a)*.55])); }
  if (pts.some(p => p.z < .1)) return;
  c.save(); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
  c.strokeStyle = 'rgba(160,185,255,.10)'; c.lineWidth = 1.5; c.setLineDash([6, 6]); c.stroke(); c.restore();
}
// fantasma: sagoma piatta resa una volta in un ritaglio e poi riusata (camera ferma); con la camera che segue si ridisegna
const ghostCache = new Map();
function drawGhost(c, cam, pose, a, key){
  let g = key && ghostCache.get(key);
  if (!g){
    const G = st.ghost, x = G.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); if (st.ghostRect) x.clearRect(st.ghostRect.x, st.ghostRect.y, st.ghostRect.w, st.ghostRect.h);
    x.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    const R = drawFigure(x, cam, pose, st, { fill: 'rgba(120,150,235,1)', line: 'rgba(205,220,255,1)' }).rect;
    st.ghostRect = R;
    if (key){
      const cv2 = document.createElement('canvas'); cv2.width = R.w; cv2.height = R.h;
      cv2.getContext('2d').drawImage(G, R.x, R.y, R.w, R.h, 0, 0, R.w, R.h);
      g = { cv: cv2, x: R.x, y: R.y }; ghostCache.set(key, g);
    } else g = { cv: G, R };
  }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = .26*a;
  if (g.R) c.drawImage(g.cv, g.R.x, g.R.y, g.R.w, g.R.h, g.R.x, g.R.y, g.R.w, g.R.h); else c.drawImage(g.cv, g.x, g.y);
  c.restore();
}
// freccia del verso lungo il percorso della cima nella parte veloce (per il servizio: lancio e battuta)
function drawArrows(c, cam, id, P, t){
  const segs = id === 'serve' ? [[P.T.load, P.T.tossEnd], [P.T.hitStart, P.T.end]] : [[P.T.load, P.T.end]];
  const vis = 1 - sstep(P.T.back, P.T.home, t) + sstep(P.T.home + .15, P.total, t);
  for (const [t0, t1] of segs){
    const pts = []; for (let i = 0; i <= 40; i++) pts.push(cam.p(tipOf(gesturePose(id, t0 + (t1 - t0)*i/40), 1.38)));
    // il disegno della freccia cresce durante la preparazione, poi resta
    const grow = t < P.T.hold ? .0 : t < t0 ? sstep(P.T.hold, t0, t) : 1;
    const n = Math.max(2, Math.round(40*Math.max(.02, grow)));
    if (vis*grow <= .02) continue;
    c.save(); c.globalAlpha = .75*Math.min(1, vis); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); for (let i = 0; i < n; i++){ const p = pts[i]; i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
    c.lineWidth = st.ow*2.6; c.strokeStyle = 'rgba(5,10,28,.6)'; c.stroke();
    c.lineWidth = st.ow*1.2; c.setLineDash([st.ow*4, st.ow*3]); c.strokeStyle = 'rgba(240,245,255,.9)'; c.stroke(); c.setLineDash([]);
    const e = pts[n - 1], d = pts[n - 2], ang = Math.atan2(e.y - d.y, e.x - d.x), s = st.ow*6.5;
    c.translate(e.x, e.y); c.rotate(ang); c.beginPath(); c.moveTo(s*.9, 0); c.lineTo(-s*.6, s*.62); c.lineTo(-s*.3, 0); c.lineTo(-s*.6, -s*.62); c.closePath();
    c.fillStyle = css(BALL); c.fill(); c.lineWidth = st.ow*.8; c.strokeStyle = 'rgba(5,10,28,.8)'; c.stroke();
    c.restore();
  }
}
// scia della cima: nastro tra la cima e un punto più in basso sul telefono, negli ultimi 0,24 s del gesto, che si
// dissolve con l'età e con la velocità (compare solo nella parte veloce)
function drawTrail(c, cam, id, t){
  const N = 30, dt = .3/N, A = [], B = [], w = [];
  for (let i = 0; i <= N; i++){
    const tt = t - i*dt, pose = gesturePose(id, tt);
    A.push(cam.p(tipOf(pose, 1))); B.push(cam.p(tipOf(pose, .35))); w.push(sstep(110, 420, rotSpeed(id, tt)));
  }
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < N; i++){
    const age = i/N, a = (1 - age)**1.6*Math.min(w[i], w[i + 1]);
    if (a < .01) continue;
    c.beginPath(); c.moveTo(A[i].x, A[i].y); c.lineTo(A[i + 1].x, A[i + 1].y); c.lineTo(B[i + 1].x, B[i + 1].y); c.lineTo(B[i].x, B[i].y); c.closePath();
    c.fillStyle = css(mix(WHITE, BALL, Math.min(1, age*2)), .5*a); c.fill();
  }
  // filo luminoso della cima
  c.lineCap = 'round';
  for (let i = 0; i < N; i++){
    const age = i/N, a = (1 - age)**1.3*Math.min(w[i], w[i + 1]); if (a < .01) continue;
    c.beginPath(); c.moveTo(A[i].x, A[i].y); c.lineTo(A[i + 1].x, A[i + 1].y); c.lineWidth = st.ow*(2.2 - 1.6*age); c.strokeStyle = css(mix(WHITE, BALL, age), .9*a); c.stroke();
  }
  c.restore();
}
// lampo nell'istante del picco (= contatto): anello che si allarga e raggi corti
function drawImpact(c, cam, id, P, t){
  const dt = t - P.contact; if (dt < 0 || dt > .16) return;
  const u = dt/.16, X = contactPoint(id), p = cam.p(X), r0 = cam.rad(X, BALL_R);
  c.save(); c.globalCompositeOperation = 'lighter';
  c.beginPath(); c.arc(p.x, p.y, r0*(1.2 + 1.9*u), 0, 2*Math.PI); c.lineWidth = st.ow*2.4*(1 - u); c.strokeStyle = css(BALL, 1 - u); c.stroke();
  for (let i = 0; i < 8; i++){
    const a = i/8*2*Math.PI + .3, r1 = r0*(1.6 + 1.4*u), r2 = r0*(2.2 + 2*u);
    c.beginPath(); c.moveTo(p.x + Math.cos(a)*r1, p.y + Math.sin(a)*r1); c.lineTo(p.x + Math.cos(a)*r2, p.y + Math.sin(a)*r2);
    c.lineWidth = st.ow*1.4*(1 - u); c.strokeStyle = css(WHITE, .9*(1 - u)); c.stroke();
  }
  c.restore();
}
// banda bassa: fase corrente, curva della velocità di rotazione del telefono con il picco = impatto, testina
function drawHud(c, id, P, t, pose, k){
  const W = st.W, H = st.H, y0 = H*(1 - HUD_H), h = H*HUD_H, x0 = W*.03, x1 = W*.97;
  const g = c.createLinearGradient(0, y0 - h*.4, 0, H); g.addColorStop(0, 'rgba(5,10,28,0)'); g.addColorStop(.4, 'rgba(5,10,28,.78)'); g.addColorStop(1, 'rgba(5,10,28,.92)');
  c.fillStyle = g; c.fillRect(0, y0 - h*.4, W, h*1.4);
  const ph = phaseLabel(id, pose.phase, pose.u);
  c.save(); c.fillStyle = '#f4f6fc'; c.font = `italic 800 ${Math.round(30*k)}px "Barlow Condensed", sans-serif`; c.textBaseline = 'alphabetic';
  c.fillText(ph.toUpperCase(), x0, y0 + h*.5);
  c.fillStyle = '#b6c1e0'; c.font = `600 ${Math.round(12.5*k)}px Barlow, sans-serif`;
  c.fillText(state.rate === 1 ? 'Tempo reale' : `Rallentato ${String(state.rate).replace('.', ',')}×`, x0, y0 + h*.78);
  // curva
  const cx0 = W*.27, cx1 = x1, cy1 = y0 + h*.82, cy0 = y0 + h*.18, cu = curveOf(id), vmax = 820;
  const X = i => cx0 + (cx1 - cx0)*i/cu.n, Y = v => cy1 - (cy1 - cy0)*Math.min(1, v/vmax);
  c.beginPath(); c.moveTo(X(0), cy1); for (let i = 0; i <= cu.n; i++) c.lineTo(X(i), Y(cu.v[i])); c.lineTo(X(cu.n), cy1); c.closePath();
  const fg = c.createLinearGradient(0, cy1, 0, cy0); fg.addColorStop(0, 'rgba(47,107,255,.10)'); fg.addColorStop(1, 'rgba(227,255,54,.45)');
  c.fillStyle = fg; c.fill();
  c.beginPath(); for (let i = 0; i <= cu.n; i++){ const x = X(i), y = Y(cu.v[i]); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.lineWidth = 1.6*k; c.strokeStyle = 'rgba(227,255,54,.85)'; c.stroke();
  c.beginPath(); c.moveTo(cx0, cy1 + .5); c.lineTo(cx1, cy1 + .5); c.lineWidth = 1; c.strokeStyle = 'rgba(176,194,255,.3)'; c.stroke();
  c.fillStyle = '#7e8bb3'; c.font = `600 ${Math.round(11*k)}px Barlow, sans-serif`; c.textBaseline = 'top';
  c.fillText('Velocità di rotazione del telefono', cx0, cy1 + 4*k);
  // picco = impatto
  const px = X(cu.peakI), py = Y(cu.peak);
  c.beginPath(); c.moveTo(px, cy1); c.lineTo(px, py); c.setLineDash([3, 3]); c.strokeStyle = 'rgba(227,255,54,.6)'; c.stroke(); c.setLineDash([]);
  c.textAlign = px > cx1 - 160*k ? 'right' : 'left'; c.textBaseline = 'middle'; c.fillStyle = '#e3ff36'; c.font = `700 ${Math.round(12*k)}px Barlow, sans-serif`;
  c.fillText(`Picco = impatto · ${Math.round(cu.peak/10)*10} °/s`, px + (c.textAlign === 'right' ? -8 : 8)*k, py + 2*k);
  // testina
  const hi = Math.round(t/P.total*cu.n), hx = X(hi), hy = Y(cu.v[Math.min(cu.n, hi)]);
  c.beginPath(); c.moveTo(hx, cy0 - 4*k); c.lineTo(hx, cy1); c.lineWidth = 1.5*k; c.strokeStyle = 'rgba(244,246,252,.8)'; c.stroke();
  const near = Math.abs(t - P.contact) < .06;
  c.beginPath(); c.arc(hx, hy, (near ? 6.5 : 4.5)*k, 0, 2*Math.PI); c.fillStyle = near ? '#e3ff36' : '#f4f6fc'; c.fill();
  c.restore();
}
// presa: due viste e richiami (pollice, dita, palmo, schermo)
function renderGrip(c, t, mirror, k){
  const { cam, a } = gripCam(t, mirror), pose = gesturePose('grip', t);
  const F = drawFigure(c, cam, pose, st);
  const rig = F.rig, T = v => add(pose.pos, qrot(pose.q, v));
  // richiami: nella vista «come la vedi tu» pollice, dita e schermo; nella vista di lato il palmo sotto il telefono
  const notesA = [
    { X: rig.thumb.pts[2], text: 'Pollice lungo il bordo', dx: 1, dy: -.5 },
    { X: rig.fingers[1].pts[3], text: 'Dita sul bordo, non sullo schermo', dx: -1, dy: .35 },
    { X: T([0, .03, HD]), text: 'Schermo verso di te', dx: -1, dy: -.75 },
  ];
  const notesB = [
    { X: rig.heel[2].p, text: 'Dorso del telefono nel palmo', dx: 1, dy: .55 },
    { X: T([0, HH, 0]), text: 'Cima in avanti e in alto', dx: -1, dy: -.4 },
    { X: rig.fingers[0].pts[2], text: 'Le dita avvolgono il bordo', dx: -1, dy: .5 },
  ];
  const u = (t % 8)/8, showA = u < .32 ? sstep(.03, .09, u)*(1 - sstep(.28, .32, u)) : 0, showB = u > .5 && u < .82 ? sstep(.53, .59, u)*(1 - sstep(.78, .82, u)) : 0;
  for (const [notes, show] of [[notesA, showA], [notesB, showB]]){
    if (show <= .01) continue;
    c.save(); c.globalAlpha = show;
    notes.forEach((n, i) => {
      const p = cam.p(n.X), dx = (mirror ? -n.dx : n.dx), lx = p.x + dx*st.W*.17, ly = p.y + n.dy*st.H*.14;
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(lx - dx*6, ly); c.lineWidth = 1.5; c.strokeStyle = 'rgba(244,246,252,.75)'; c.stroke();
      c.beginPath(); c.arc(p.x, p.y, 4.5*k, 0, 2*Math.PI); c.fillStyle = '#e3ff36'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#0a1330'; c.stroke();
      pill(c, lx, ly, n.text, { size: Math.round(12*k), num: String(i + 1), align: dx > 0 ? 'left' : 'right' });
    });
    c.restore();
  }
  pill(c, st.W/2, st.H*.93, a < .5 ? 'Come la vedi tu' : 'Di lato: la cima in avanti', { size: Math.round(11*k), bg: 'rgba(8,14,40,.6)' });
}

/* ---------- interfaccia della modale ---------- */
const $ = id => document.getElementById(id);
function setCard(i){
  state.card = (i + CARDS.length) % CARDS.length; state.t = 0; state.cycle = 0; state.seen.add(state.card);
  const C = card();
  $('kicker').textContent = `Tutorial · ${state.card + 1} di ${CARDS.length}`;
  $('name').textContent = C.name;
  $('cue').textContent = C.cue[state.hand] || C.cue.right;
  $('prev').disabled = state.card === 0;
  $('dots').innerHTML = CARDS.map((_, j) => `<i class="${j === state.card ? 'on' : state.seen.has(j) ? 'seen' : ''}"></i>`).join('');
}
$('prev').onclick = () => setCard(state.card - 1);
$('next').onclick = () => setCard(state.card + 1);
$('hand').onclick = () => { state.hand = state.hand === 'right' ? 'left' : 'right'; $('hand').textContent = state.hand === 'right' ? 'Destro' : 'Mancino'; setCard(state.card); };
const RATES = { alt: 'Lento e reale', slow: 'Rallentato', real: 'Tempo reale' };
$('rate').onclick = () => { const ks = Object.keys(RATES); state.rateMode = ks[(ks.indexOf(state.rateMode) + 1) % ks.length]; $('rate').textContent = RATES[state.rateMode]; };
addEventListener('keydown', e => { if (e.key === 'ArrowRight') setCard(state.card + 1); if (e.key === 'ArrowLeft') setCard(state.card - 1); });
// ritmo: un ciclo rallentato (0,5×) e uno a tempo reale, alternati (la velocità è parte del gesto)
const rateOf = () => state.rateMode === 'slow' ? .5 : state.rateMode === 'real' ? 1 : (state.cycle % 2 ? 1 : .5);

let last = performance.now();
function loop(now){
  const dt = Math.min(.05, (now - last)/1000); last = now;
  if (!state.frozen){
    const P = plan(card().id); state.rate = rateOf(); state.t += dt*state.rate;
    if (state.t >= P.total){ state.t -= P.total; state.cycle++; }
  }
  const t0 = performance.now(); render(state.frozen ? state.frozen.t : state.t);
  if (!state.frozen){
    perf.slow = performance.now() - t0 > 12 ? perf.slow + 1 : 0;
    if (perf.slow > 40 && st.dpr > 1){ perf.cap = Math.max(1, st.dpr - .25); perf.slow = 0; resize(); }
  }
  requestAnimationFrame(loop);
}
new ResizeObserver(resize).observe(cv); resize();
setCard(0); state.rate = .5;
// fotogrammi per le prove: window.__show({ card, t, hand, rate }) disegna un istante fermo
window.__show = ({ card: id, t, hand = 'right', rate = 1 }) => {
  state.hand = hand; $('hand').textContent = hand === 'right' ? 'Destro' : 'Mancino';
  setCard(CARDS.findIndex(x => x.id === id)); state.rate = rate; state.frozen = { t }; render(t); return true;
};
window.__view = (id, dir, dist, i = 0) => { VIEWS[id] = VIEWS[id].slice(); VIEWS[id][i] = dir; if (dist) DIST[id] = dist; st.frames.clear(); return true; };
// costo di un fotogramma (ms) sullo stadio attuale: n fotogrammi in un ciclo intero
window.__bench = (id, n = 240) => {
  setCard(CARDS.findIndex(x => x.id === id)); state.frozen = { t: 0 }; const P = plan(id), t0 = performance.now();
  for (let i = 0; i < n; i++) render(i/n*P.total);
  return { ms: (performance.now() - t0)/n, W: st.W, H: st.H, dpr: st.dpr };
};
window.__plan = id => { const P = plan(id); return { total: P.total, contact: P.contact, T: P.T, keys: P.keys }; };
requestAnimationFrame(loop);
document.fonts?.ready.then(() => { window.__ready = true; });
