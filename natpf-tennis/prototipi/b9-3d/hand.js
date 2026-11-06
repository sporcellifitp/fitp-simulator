// Prototipo B9 «3D realistico» — braccio, mano e dita costruiti dal codice (nessun modello scaricato).
//
// Tecnica: la mano è descritta come una funzione distanza con segno (SDF): falangi a «coni arrotondati», palmo,
// eminenze tenar e ipotenar, polso, avambraccio e braccio a sezione ellittica, fusi con un'unione morbida (smooth min)
// che dà il raccordo organico tra le parti. Le dita si chiudono da sole attorno al telefono (presa automatica: ogni
// articolazione si piega finché la falange tocca il telefono, con 0,6 mm di «carne schiacciata»). La superficie si estrae
// una volta sola con le surface nets su una griglia sparsa (solo i blocchi vicini alla superficie), i vertici si
// proiettano sulla superficie con un passo di Newton e le normali vengono dal gradiente della SDF (lisce anche con
// celle da 1,8 mm). Occlusione ambientale e colori della pelle si calcolano sui vertici dalla stessa SDF (anche il
// telefono fa ombra di contatto sulle dita). Poi la mesh diventa una SkinnedMesh con 6 ossa: braccio, avambraccio,
// tre ossa di torsione (prono-supinazione distribuita lungo l'avambraccio) e mano (solidale con il telefono).
//
// Riferimenti: telefono (y cima, +z schermo, +x bordo destro), mano destra nella presa nel palmo della foto
// docs/riferimenti/presa-palmo-utente-2026-11-04.webp: dorso del telefono sul palmo, quattro dita attorno al bordo
// sinistro nella metà bassa, pollice disteso lungo il bordo destro, tallone del palmo sotto l'angolo in basso a destra.

export const PHONE = Object.freeze({ w: .0790, h: .1620, d: .0086, corner: .0085, edge: .0026 });

/* ---------- vettori (array di 3) ---------- */
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0]*s, a[1]*s, a[2]*s];
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => { const l = len(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0])*t, a[1] + (b[1] - a[1])*t, a[2] + (b[2] - a[2])*t];
const rotAxis = (v, k, ang) => { const c = Math.cos(ang), s = Math.sin(ang), kv = cross(k, v), d = dot(k, v); return [0, 1, 2].map(j => v[j]*c + kv[j]*s + k[j]*d*(1 - c)); };
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const smoothstep = (a, b, x) => { const t = clamp((x - a)/(b - a), 0, 1); return t*t*(3 - 2*t); };
export const V3 = { add, sub, mul, dot, cross, len, norm, lerp3, rotAxis };

/* ---------- primitive SDF ---------- */
// cono arrotondato tra a (raggio ra) e b (raggio rb); se `flat` = [asse, rapporto] la sezione è ellittica: la
// coordinata lungo `asse` (perpendicolare al segmento) viene scalata (distanza approssimata, superficie esatta)
function roundCone(a, b, ra, rb, flat = null){
  const ba = sub(b, a), l2 = dot(ba, ba), rr = ra - rb, a2 = l2 - rr*rr, il2 = 1/l2;
  const fax = flat ? norm(sub(flat[0], mul(norm(ba), dot(flat[0], norm(ba))))) : null, fk = flat ? flat[1] : 1;
  const lo = [Math.min(a[0], b[0]) - Math.max(ra, rb)/Math.min(1, fk), Math.min(a[1], b[1]) - Math.max(ra, rb)/Math.min(1, fk), Math.min(a[2], b[2]) - Math.max(ra, rb)/Math.min(1, fk)];
  const c = lerp3(a, b, .5), R = Math.sqrt(l2)/2 + Math.max(ra, rb)/Math.min(1, fk);
  return { c, R, lo, f(px, py, pz){
    let x = px - a[0], y = py - a[1], z = pz - a[2];
    if (fax){ const t = (x*fax[0] + y*fax[1] + z*fax[2])*(fk - 1); x += fax[0]*t; y += fax[1]*t; z += fax[2]*t; }
    // iquilezles.org sdRoundCone (estremi arbitrari)
    const pax = x*ba[0] + y*ba[1] + z*ba[2];
    const qx = x*l2 - ba[0]*pax, qy = y*l2 - ba[1]*pax, qz = z*l2 - ba[2]*pax;
    const x2 = qx*qx + qy*qy + qz*qz, yy = pax - l2, y2 = yy*yy*l2, z2 = pax*pax*l2;
    const k = Math.sign(rr)*rr*rr*x2;
    let d;
    if (Math.sign(yy)*a2*y2 > k) d = Math.sqrt(x2 + y2)*il2 - rb;
    else if (Math.sign(pax)*a2*z2 < k) d = Math.sqrt(x2 + z2)*il2 - ra;
    else d = (Math.sqrt(x2*a2*il2) + pax*rr)*il2 - ra;
    return fax ? d*Math.min(1, 1/fk) : d;
  } };
}
// ellissoide con assi e1, e2, e3 (ortonormali) e semiassi r (distanza approssimata di iquilezles)
function ellipsoid(c, e1, e2, e3, r){
  const R = Math.max(r[0], r[1], r[2]);
  return { c, R, f(px, py, pz){
    const x = px - c[0], y = py - c[1], z = pz - c[2];
    const u = (x*e1[0] + y*e1[1] + z*e1[2]), v = (x*e2[0] + y*e2[1] + z*e2[2]), w = (x*e3[0] + y*e3[1] + z*e3[2]);
    const k0 = Math.hypot(u/r[0], v/r[1], w/r[2]), k1 = Math.hypot(u/(r[0]*r[0]), v/(r[1]*r[1]), w/(r[2]*r[2]));
    return k1 < 1e-12 ? -Math.min(...r) : k0*(k0 - 1)/k1;
  } };
}
const sphere = (c, r) => ({ c, R: r, f: (x, y, z) => Math.hypot(x - c[0], y - c[1], z - c[2]) - r });
// unione morbida polinomiale
const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0)/k; return Math.min(a, b) - h*h*k*.25; };

// telefono: rettangolo arrotondato estruso con i bordi smussati, nel suo riferimento
export function phoneSdf(px, py, pz){
  const { w, h, d, corner, edge } = PHONE;
  const bx = w/2 - edge, by = h/2 - edge, r2 = corner - edge;
  const qx = Math.abs(px) - (bx - r2), qy = Math.abs(py) - (by - r2);
  const d2 = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r2;
  const wz = Math.abs(pz) - (d/2 - edge);
  return Math.min(Math.max(d2, wz), 0) + Math.hypot(Math.max(d2, 0), Math.max(wz, 0)) - edge;
}

/* ---------- progetto della mano (riferimento del telefono) ---------- */
export const HAND = {
  alpha: 38,             // gradi: asse della mano (polso → nocca del medio) sopra la direzione −x del telefono
  press: .0006,          // carne schiacciata contro il telefono
  flex: 22,              // flessione del polso nella posa di riferimento (gradi): l'avambraccio arriva dal lato del palmo
  dev: -6,               // deviazione (gradi, + verso il pollice)
};
// dita: offset della nocca lungo v (radiale) e u (asse), lunghezze delle falangi, raggi (base, PIP, DIP, punta), ventaglio
// (ventaglio dimezzato il 06/11: nella foto della presa le dita stanno unite attorno al bordo, non aperte)
const FINGERS = [
  { name: 'indice', v: .0205, u: -.002, L: [.041, .024, .0195], r: [.0097, .0087, .0077, .0066], spread: 3.5 },
  { name: 'medio', v: 0, u: 0, L: [.045, .0275, .0205], r: [.0099, .0090, .0080, .0068], spread: .5 },
  { name: 'anulare', v: -.0188, u: -.0045, L: [.042, .026, .0200], r: [.0093, .0085, .0076, .0065], spread: -2.5 },
  { name: 'mignolo', v: -.0355, u: -.0135, L: [.0335, .0195, .0180], r: [.0083, .0075, .0068, .0058], spread: -7 },
];
const LIMITS = [[-25, 85], [0, 105], [0, 78]];

export function handDesign(){
  const D = Math.PI/180, a = HAND.alpha*D, zb = -PHONE.d/2;
  const u = [-Math.cos(a), Math.sin(a), 0], v = [Math.sin(a), Math.cos(a), 0], n = [0, 0, 1];
  const Mm = [-.0090, -.0345, zb - .0112];
  const W = add(add(Mm, mul(u, -.088)), mul(n, -.0035));
  // contatto di una catena di coni con il telefono: minimo di (distanza dal telefono − raggio) su punti campione
  const contact = (p0, p1, r0, r1) => { let m = 1; for (let i = 0; i <= 8; i++){ const t = i/8, p = lerp3(p0, p1, t); m = Math.min(m, phoneSdf(...p) - (r0 + (r1 - r0)*t)); } return m; };
  const fingers = FINGERS.map(F => {
    const base = add(add(Mm, mul(v, F.v)), mul(u, F.u));
    const s = F.spread*D, d0 = norm(add(mul(u, Math.cos(s)), mul(v, Math.sin(s))));
    const k = norm(cross(d0, n));            // asse di flessione: ruota d verso il palmo (+n, il telefono)
    const ang = [0, 0, 0];
    const chain = () => { const pts = [base]; let d = d0, acc = 0; for (let j = 0; j < 3; j++){ acc += ang[j]; const dj = rotAxis(d0, k, acc*D); pts.push(add(pts[j], mul(dj, F.L[j]))); d = dj; } return pts; };
    // presa automatica: ogni articolazione si chiude finché la sua falange tocca il telefono (o fino al limite)
    for (let j = 0; j < 3; j++){
      let best = LIMITS[j][0];
      for (let g = LIMITS[j][0]; g <= LIMITS[j][1]; g += .5){
        ang[j] = g; const p = chain();
        if (contact(p[j], p[j + 1], F.r[j], F.r[j + 1]) < -HAND.press) break;
        best = g;
      }
      ang[j] = best;
    }
    // un minimo di flessione naturale dove la falange è libera (non contro il telefono)
    const pts = chain();
    return { ...F, base, d0, k, ang: ang.slice(), pts };
  });
  // pollice: carpo-metacarpale vicino al polso dal lato radiale, metacarpo verso il bordo destro, falangi lungo il bordo
  const cmc = add(add(add(W, mul(v, .019)), mul(u, .013)), mul(n, -.002));
  const mcpT = [PHONE.w/2 + .0118, -.0385, -.0010];
  const thumbDir0 = norm([-.10, 1, .10]);
  const curl = norm([-1, 0, .25]);          // il pollice si piega verso il bordo del telefono
  const kT = norm(cross(thumbDir0, curl));
  const TL = [.0315, .0265], TR = [.0112, .0100, .0087];
  const tang = [0, 0];
  const tchain = () => { const pts = [mcpT]; let acc = 0; for (let j = 0; j < 2; j++){ acc += tang[j]; pts.push(add(pts[j], mul(rotAxis(thumbDir0, kT, acc*D), TL[j]))); } return pts; };
  for (let j = 0; j < 2; j++){
    let best = -10;
    for (let g = -10; g <= 40; g += .5){ tang[j] = g; const p = tchain(); if (contact(p[j], p[j + 1], TR[j], TR[j + 1]) < -HAND.press) break; best = g; }
    tang[j] = best;
  }
  const thumb = { cmc, pts: tchain(), r: TR, ang: tang.slice(), k: kT, d0: thumbDir0 };
  // direzione dell'avambraccio (gomito → polso) con il polso flesso di HAND.flex e deviato di HAND.dev
  let F = rotAxis(u, v, -HAND.flex*D);          // flessione: l'avambraccio arriva dal lato del palmo (+n)
  F = rotAxis(F, n, HAND.dev*D);
  return { u, v, n, W, Mm, fingers, thumb, forearmDir: norm(F) };
}

/* ---------- SDF del braccio intero nella posa di riferimento (coordinate del campo) ---------- */
// bind: { toWorld(p) e dirToWorld(d) dal riferimento del telefono, S, E, W (spalla, gomito, polso nel campo) }
export function armSdf(H, bind){
  const P = p => bind.toWorld(p), Dd = d => norm(bind.dirToWorld(d));
  const u = Dd(H.u), v = Dd(H.v), n = Dd(H.n);
  const W = bind.W, E = bind.E, S = bind.S;
  const prims = { palm: [], fingers: [], thumb: [], arm: [], nails: [] };
  // --- palmo: metacarpi (dal carpo alle nocche), cuscinetto palmare, dorso, ipotenar, tenar
  const carpus = add(W, mul(u, .016));
  H.fingers.forEach((f, i) => {
    const b0 = add(add(carpus, mul(v, f.v*.42)), mul(n, .001));
    prims.palm.push(roundCone(P(f.base).map((x, j) => x - n[j]*.0005), b0, f.r[0]*1.08, .0115));
  });
  const mid = lerp3(W, P(H.Mm), .52);
  prims.palm.push(ellipsoid(add(mid, mul(n, .0030)), u, v, n, [.040, .034, .0105]));            // cuscinetto del palmo
  prims.palm.push(ellipsoid(add(add(mid, mul(n, -.0062)), mul(v, -.002)), u, v, n, [.043, .037, .0098]));   // dorso
  prims.palm.push(ellipsoid(add(add(add(W, mul(u, .038)), mul(v, -.021)), mul(n, .0052)), u, v, n, [.030, .0125, .0118]));   // ipotenar
  const cmcW = P(H.thumb.cmc), mcpTW = P(H.thumb.pts[0]);
  const thAx = norm(sub(mcpTW, cmcW)), thSide = norm(cross(n, thAx));
  prims.thumb.push(roundCone(cmcW, mcpTW, .0150, .0118));                                         // metacarpo del pollice
  prims.palm.push(ellipsoid(add(add(lerp3(cmcW, mcpTW, .42), mul(n, .0060)), mul(thSide, .0040)), thAx, thSide, norm(cross(thAx, thSide)), [.026, .0150, .0135]));   // tenar
  // --- polso: sezione ellittica larga nel verso radio-ulnare (v)
  const F = norm(sub(W, E));
  prims.palm.push(roundCone(add(W, mul(u, .020)), add(W, mul(F, -.022)), .0240, .0262, [n, 1.45]));
  // --- dita: falangi, nocche dorsali, unghie
  const fingerGroup = (pts, r, k, d0, ang, nailW) => {
    const parts = [];
    for (let j = 0; j < pts.length - 1; j++) parts.push(roundCone(P(pts[j]), P(pts[j + 1]), r[j], r[j + 1]));
    // nocche (rilievo sul dorso) e unghia sull'ultima falange
    let acc = 0; const dirs = [];
    for (let j = 0; j < pts.length - 1; j++){ acc += ang[j]; dirs.push(Dd(rotAxis(d0, k, acc*Math.PI/180))); }
    const kw = Dd(k);
    for (let j = 1; j < pts.length - 1; j++){
      const dors = norm(cross(dirs[j], kw));
      parts.push(sphere(add(P(pts[j]), mul(dors, r[j]*.18)), r[j]*.92));
    }
    const last = pts.length - 2, dl = dirs[last], dors = norm(cross(dl, kw));
    const nc = add(add(P(pts[last]), mul(dl, len(sub(pts[last + 1], pts[last]))*.62)), mul(dors, r[last + 1]*.80));
    const nail = ellipsoid(nc, dl, kw, dors, [nailW*1.15, nailW, .0016]);
    return { parts, nail, tipDir: dl, dors };
  };
  H.fingers.forEach(f => {
    const g = fingerGroup(f.pts, f.r, f.k, f.d0, f.ang, f.r[3]*.78);
    prims.fingers.push(g); prims.nails.push(g.nail);
  });
  {
    const g = fingerGroup(H.thumb.pts, H.thumb.r, H.thumb.k, H.thumb.d0, H.thumb.ang, .0072);
    prims.thumb.push(...g.parts); prims.nails.push(g.nail); prims.thumbNail = g;
  }
  // --- avambraccio: due tronchi ellittici + massa muscolare prossimale (brachioradiale/estensori)
  const elbowAx = norm(cross(sub(E, S), sub(W, E)));        // asse di flessione del gomito
  const Lf = len(sub(W, E)), M1 = lerp3(W, E, .42);
  const wideW = v, wideE = elbowAx;
  const wideM = norm(lerp3(wideW, dot(wideW, wideE) < 0 ? mul(wideE, -1) : wideE, .45));
  const thinOf = (wide) => norm(cross(F, wide));
  prims.arm.push(roundCone(add(W, mul(F, -.012)), M1, .0262, .0310, [thinOf(wideW), 1.42]));
  prims.arm.push(roundCone(M1, add(E, mul(F, .010)), .0310, .0365, [thinOf(wideM), 1.18]));
  const radialSide = norm(sub(wideM, mul(F, dot(wideM, F))));
  prims.arm.push(ellipsoid(add(add(lerp3(W, E, .72), mul(radialSide, .010)), mul(thinOf(wideM), -.006)), F, radialSide, thinOf(wideM), [Lf*.30, .030, .028]));
  // --- gomito: epicondili, olecrano; braccio solo se richiesto (nel prototipo il braccio non si vede: senza omero non
  // c'è la piega del gomito, dove le surface nets creavano triangoli invertiti nella parte che sfuma)
  const inner = norm(sub(lerp3(S, W, .5), E));
  const U = norm(sub(S, E)), Lu = len(sub(S, E));
  if (bind.upperArm === false){
    prims.arm.push(sphere(add(E, mul(F, .012)), .0335));
  } else {
    prims.arm.push(sphere(E, .0330));
    prims.arm.push(sphere(add(add(E, mul(inner, -.016)), mul(elbowAx, 0)), .0215));       // olecrano
    prims.arm.push(sphere(add(E, mul(elbowAx, .024)), .0170));
    prims.arm.push(sphere(add(E, mul(elbowAx, -.022)), .0165));
    prims.arm.push(roundCone(E, add(E, mul(U, Lu*.80)), .0350, .0440));
    prims.arm.push(ellipsoid(add(add(E, mul(U, Lu*.38)), mul(inner, .012)), U, inner, elbowAx, [Lu*.27, .030, .031]));    // bicipite
    prims.arm.push(ellipsoid(add(add(E, mul(U, Lu*.45)), mul(inner, -.010)), U, inner, elbowAx, [Lu*.32, .031, .032]));   // tricipite
  }
  return { prims, F, U, elbowAx, inner };
}

// Valutazione: distanza e gruppo più vicino (0 palmo/polso, 1..4 dita, 5 pollice, 6 avambraccio/gomito/braccio, 7 unghia)
// sfera che contiene un gruppo di primitive (per saltare i gruppi lontani: la valutazione resta identica)
function bound(list){
  let c = [0, 0, 0]; list.forEach(p => { c = add(c, p.c); }); c = mul(c, 1/list.length);
  let R = 0; list.forEach(p => { R = Math.max(R, len(sub(p.c, c)) + p.R); });
  return { c, R };
}
const far = (b, x, y, z) => Math.hypot(x - b.c[0], y - b.c[1], z - b.c[2]) - b.R;
export function makeField(model){
  const { prims } = model;
  const KP = .011, KF = .0075, KA = .016, KW = .022, CUT = .03;
  const palm = prims.palm, fingers = prims.fingers, thumb = prims.thumb, arm = prims.arm, nails = prims.nails;
  const hb = bound([...palm, ...thumb, ...fingers.flatMap(f => f.parts)]), fb = fingers.map(f => bound(f.parts)), tb = bound(thumb);
  const out = { d: 0, g: 0 };
  return function field(x, y, z, wantGroup = false){
    let da = 1e9;
    for (const p of arm){ if (far(p, x, y, z) > da + CUT) continue; da = smin(da, p.f(x, y, z), KA); }
    let best = 1e9, g = 6;
    if (far(hb, x, y, z) < da + CUT){
      let dp = 1e9;
      for (const p of palm) dp = smin(dp, p.f(x, y, z), KP);
      best = dp; g = 0;
      // ogni dito si unisce al palmo per conto suo, poi minimo netto tra le dita (niente membrane tra un dito e l'altro)
      for (let i = 0; i < fingers.length; i++){
        if (far(fb[i], x, y, z) > dp + CUT) continue;
        let df = 1e9; for (const p of fingers[i].parts) df = smin(df, p.f(x, y, z), .0025);
        const m = smin(dp, df, KF);
        if (m < best){ best = m; g = df < dp ? 1 + i : 0; }
      }
      if (far(tb, x, y, z) < dp + CUT){
        let dt = 1e9; for (const p of thumb) dt = smin(dt, p.f(x, y, z), .004);
        const mt = smin(dp, dt, KP*1.1);
        if (mt < best){ best = mt; g = dt < dp ? 5 : 0; }
      }
      const before = best;
      best = smin(best, da, KW);
      if (da < before) g = 6;
      // unghie: lamina appena rilevata (unione netta)
      for (const p of nails){ if (far(p, x, y, z) > best + .01) continue; const dn = p.f(x, y, z); if (dn < best){ best = dn; g = 7; } }
    } else best = da;
    if (!wantGroup) return best;
    out.d = best; out.g = g; return out;
  };
}

/* ---------- surface nets su griglia sparsa ---------- */
export function polygonize(field, lo, hi, h){
  const B = 4, NB = [0, 1, 2].map(j => Math.ceil((hi[j] - lo[j])/(h*B)) + 1);
  const blocks = new Map();
  const key = (i, j, k) => i + NB[0]*(j + NB[1]*k);
  const half = h*B*.5*Math.sqrt(3);
  // 1) blocchi attivi: centro del blocco vicino alla superficie
  for (let k = 0; k < NB[2]; k++) for (let j = 0; j < NB[1]; j++) for (let i = 0; i < NB[0]; i++){
    const c = [lo[0] + (i + .5)*B*h, lo[1] + (j + .5)*B*h, lo[2] + (k + .5)*B*h];
    if (Math.abs(field(c[0], c[1], c[2])) < half*1.6 + h) blocks.set(key(i, j, k), { i, j, k, val: null, vid: null });
  }
  // 2) valori ai vertici della griglia di ogni blocco attivo ((B+1)³)
  const S1 = B + 1;
  for (const b of blocks.values()){
    const val = b.val = new Float32Array(S1*S1*S1);
    for (let z = 0; z < S1; z++) for (let y = 0; y < S1; y++) for (let x = 0; x < S1; x++)
      val[x + S1*(y + S1*z)] = field(lo[0] + (b.i*B + x)*h, lo[1] + (b.j*B + y)*h, lo[2] + (b.k*B + z)*h);
  }
  // 3) un vertice per ogni cella attraversata dalla superficie (media dei punti di attraversamento sugli spigoli)
  const pos = [], cellOf = [];
  const E12 = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (const b of blocks.values()){
    b.vid = new Int32Array(B*B*B).fill(-1);
    for (let z = 0; z < B; z++) for (let y = 0; y < B; y++) for (let x = 0; x < B; x++){
      let mask = 0;
      for (let c = 0; c < 8; c++){ const ox = c & 1, oy = (c >> 1) & 1, oz = (c >> 2) & 1; cv[c] = b.val[(x + ox) + S1*((y + oy) + S1*(z + oz))]; if (cv[c] < 0) mask |= 1 << c; }
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, m = 0;
      for (const [a, c] of E12){
        const va = cv[a], vc = cv[c];
        if ((va < 0) === (vc < 0)) continue;
        const t = va/(va - vc);
        sx += (a & 1) + ((c & 1) - (a & 1))*t; sy += ((a >> 1) & 1) + (((c >> 1) & 1) - ((a >> 1) & 1))*t; sz += ((a >> 2) & 1) + (((c >> 2) & 1) - ((a >> 2) & 1))*t; m++;
      }
      b.vid[x + B*(y + B*z)] = pos.length/3;
      pos.push(lo[0] + (b.i*B + x + sx/m)*h, lo[1] + (b.j*B + y + sy/m)*h, lo[2] + (b.k*B + z + sz/m)*h);
    }
  }
  // 4) quadrilateri: per ogni spigolo della griglia con cambio di segno, le quattro celle che lo condividono
  const vidAt = (gi, gj, gk) => { const b = blocks.get(key(Math.floor(gi/B), Math.floor(gj/B), Math.floor(gk/B))); if (!b) return -1; return b.vid[(gi - b.i*B) + B*((gj - b.j*B) + B*(gk - b.k*B))]; };
  const valAt = (b, x, y, z) => b.val[x + S1*(y + S1*z)];
  const idx = [];
  for (const b of blocks.values()) for (let z = 0; z < B; z++) for (let y = 0; y < B; y++) for (let x = 0; x < B; x++){
    if (b.vid[x + B*(y + B*z)] < 0) continue;
    const gi = b.i*B + x, gj = b.j*B + y, gk = b.k*B + z;
    const v0 = valAt(b, x, y, z);
    // spigoli dal vertice (x, y, z) della cella verso +x, +y, +z
    const ends = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (let e = 0; e < 3; e++){
      const v1 = valAt(b, x + ends[e][0], y + ends[e][1], z + ends[e][2]);
      if ((v0 < 0) === (v1 < 0)) continue;
      // celle attorno allo spigolo
      let c;
      if (e === 0) c = [[gi, gj, gk], [gi, gj - 1, gk], [gi, gj - 1, gk - 1], [gi, gj, gk - 1]];
      else if (e === 1) c = [[gi, gj, gk], [gi, gj, gk - 1], [gi - 1, gj, gk - 1], [gi - 1, gj, gk]];
      else c = [[gi, gj, gk], [gi - 1, gj, gk], [gi - 1, gj - 1, gk], [gi, gj - 1, gk]];
      const q = c.map(([a, bb, cc]) => vidAt(a, bb, cc));
      if (q.some(i => i < 0)) continue;
      if (v0 < 0) idx.push(q[0], q[1], q[2], q[0], q[2], q[3]);
      else idx.push(q[0], q[2], q[1], q[0], q[3], q[2]);
    }
  }
  return { pos: new Float32Array(pos), idx: pos.length/3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), blocks: blocks.size };
}

// proiezione sulla superficie (Newton) e normali dal gradiente
// Il passo di Newton è limitato (maxStep, ~mezza cella): dove il gradiente è debole (raccordi morbidi, asse mediale)
// un passo libero proietta il vertice sulla superficie sbagliata e crea triangoli lunghi e ripiegati («graffi»).
export function refine(field, pos, iters = 2, maxStep = .001){
  const e = .00025, nrm = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3){
    let x = pos[i], y = pos[i + 1], z = pos[i + 2], gx = 0, gy = 0, gz = 0;
    for (let it = 0; it <= iters; it++){
      const d = field(x, y, z);
      gx = field(x + e, y, z) - field(x - e, y, z); gy = field(x, y + e, z) - field(x, y - e, z); gz = field(x, y, z + e) - field(x, y, z - e);
      const g2 = gx*gx + gy*gy + gz*gz;
      if (it === iters || g2 < 1e-14) break;
      let s = d*(2*e)/g2*(2*e);
      const step = Math.abs(s)*Math.sqrt(g2)/(2*e);
      if (step > maxStep) s *= maxStep/step;
      x -= gx*s/(2*e); y -= gy*s/(2*e); z -= gz*s/(2*e);
    }
    const gl = Math.hypot(gx, gy, gz) || 1;
    pos[i] = x; pos[i + 1] = y; pos[i + 2] = z; nrm[i] = gx/gl; nrm[i + 1] = gy/gl; nrm[i + 2] = gz/gl;
  }
  return nrm;
}

// occlusione ambientale dalla SDF (pelle + telefono): campioni lungo la normale
export function bakeAO(fieldAll, pos, nrm){
  const ao = new Float32Array(pos.length/3);
  const steps = [.0025, .005, .009, .015, .024];
  for (let i = 0, v = 0; i < pos.length; i += 3, v++){
    let occ = 0, w = 1;
    for (const s of steps){
      const d = fieldAll(pos[i] + nrm[i]*s, pos[i + 1] + nrm[i + 1]*s, pos[i + 2] + nrm[i + 2]*s);
      occ += w*Math.max(0, s - d)/s; w *= .62;
    }
    ao[v] = clamp(1 - occ*.42, .18, 1);
  }
  return ao;
}

export { smoothstep, clamp };
