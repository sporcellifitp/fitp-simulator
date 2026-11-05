// Prototipo B9 «3D realistico» — costruzione della pelle (una volta sola, in un worker): SDF del braccio nella posa di
// legame → surface nets → proiezione sulla superficie e normali dal gradiente → occlusione ambientale (anche del
// telefono) → colori della pelle → pesi delle 6 ossa e sfumatura dell'omero. Restituisce solo array (trasferibili).
import { armSdf, makeField, polygonize, refine, bakeAO, phoneSdf, V3, smoothstep } from './hand.js';
import { HD, ARM, TWIST_F } from './rig.js';
import { qrot } from './motion.js';

const { add, sub, mul, dot } = V3;
const conj = q => [-q[0], -q[1], -q[2], q[3]];
// Si vedono solo mano, polso e avambraccio (come nelle animazioni dei gesti degli orologi e dei visori): l'avambraccio
// sfuma verso il gomito (distanza dal gomito lungo l'avambraccio, m) e i triangoli del tutto trasparenti si scartano:
// niente gomito, omero e spalla visibili, quindi niente IK da giustificare. (Un taglio della SDF poco oltre il gomito
// creava triangoli ripiegati, visibili come graffi scuri nella parte trasparente: provato e tolto.)
export const FADE = Object.freeze({ from: .060, to: .150 });

export function buildArmMesh(bind, { h = .0019 } = {}){
  const t0 = Date.now(), A = bind.arm, P = bind.pos, Q = bind.q;
  const toWorld = p => add(qrot(Q, p), P), dirToWorld = v => qrot(Q, v);
  const model = armSdf(HD, { toWorld, dirToWorld, S: A.S, E: A.E, W: A.W, upperArm: false });
  const field = makeField(model);
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  const all = Object.values(model.prims).filter(Array.isArray).flat().flatMap(x => x.parts ? x.parts : [x]);
  for (const p of all) for (let j = 0; j < 3; j++){ lo[j] = Math.min(lo[j], p.c[j] - p.R); hi[j] = Math.max(hi[j], p.c[j] + p.R); }
  lo = lo.map(x => x - 2*h); hi = hi.map(x => x + 2*h);
  const m = polygonize(field, lo, hi, h);
  const t1 = Date.now();
  const nrm = refine(field, m.pos, 2, h*.55);
  const t2 = Date.now();
  const qi = conj(Q);
  const phoneW = (x, y, z) => { const p = qrot(qi, [x - P[0], y - P[1], z - P[2]]); return phoneSdf(p[0], p[1], p[2]); };
  const ao = bakeAO((x, y, z) => Math.min(field(x, y, z), phoneW(x, y, z)), m.pos, nrm);
  const t3 = Date.now();
  const n = m.pos.length/3;
  const color = new Float32Array(n*3), skinIndex = new Uint16Array(n*4), skinWeight = new Float32Array(n*4), fade = new Float32Array(n);
  const palmN = dirToWorld(HD.n);
  const joints = [...HD.fingers.flatMap(f => f.pts.slice(1)), ...HD.thumb.pts.slice(1)].map(toWorld);                      // normale del palmo (verso il telefono)
  const S = A.S, E = A.E, W = A.W, U = A.U, F = A.F, L2 = ARM.L2;
  const toS = mul(U, -1);
  // colori lineari (la pelle si scurisce nelle pieghe con una tinta calda: finto scattering sotto la superficie)
  const SKIN = [.50, .26, .165], SKIN_PALM = [.60, .33, .23], NAIL = [.72, .50, .44];
  for (let i = 0, v = 0; v < n; i += 3, v++){
    const p = [m.pos[i], m.pos[i + 1], m.pos[i + 2]], nv = [nrm[i], nrm[i + 1], nrm[i + 2]];
    const g = field(p[0], p[1], p[2], true).g;
    // --- colore
    let base;
    if (g === 7) base = NAIL;
    else {
      const palmSide = smoothstep(-.2, .7, dot(nv, palmN));
      base = SKIN.map((c, j) => c + (SKIN_PALM[j] - c)*palmSide*(g === 6 ? .35 : .8));
      if (g >= 1 && g <= 5){   // dita più rosate su nocche e polpastrelli (circolazione vicino alla superficie)
        let red = 0;
        for (const q of joints){ const dd = (p[0] - q[0])**2 + (p[1] - q[1])**2 + (p[2] - q[2])**2; red = Math.max(red, Math.exp(-dd/(.0085*.0085))); }
        base = base.map((c, j) => c*[1.03 + .10*red, .97 - .08*red, .96 - .08*red][j]);
      }
    }
    const a = ao[v];
    const tint = [Math.pow(a, .62), Math.pow(a, 1.12), Math.pow(a, 1.28)];
    color[i] = base[0]*tint[0]; color[i + 1] = base[1]*tint[1]; color[i + 2] = base[2]*tint[2];
    // --- pesi: 0 omero, 1..4 avambraccio (0, 1/3, 2/3, 1 dal gomito), 5 mano
    let wHand = 1, wUp = 0, fr = 1;
    if (g === 0 || g === 6){
      wHand = smoothstep(-.026, .010, dot(sub(p, W), F));
      const sU = dot(sub(p, E), toS), sF = dot(sub(p, E), F);
      wUp = smoothstep(-.028, .028, sU - sF);
      fr = Math.max(0, Math.min(1, sF/L2));
    }
    const k = Math.min(TWIST_F.length - 2, Math.floor(fr*3)), u = fr*3 - k;
    const wf = (1 - wUp)*(1 - wHand);
    const o = v*4;
    skinIndex[o] = 0; skinWeight[o] = wUp*(1 - wHand);
    skinIndex[o + 1] = 1 + k; skinWeight[o + 1] = wf*(1 - u);
    skinIndex[o + 2] = 2 + k; skinWeight[o + 2] = wf*u;
    skinIndex[o + 3] = 5; skinWeight[o + 3] = wHand;
    // --- sfumatura verso il gomito
    fade[v] = smoothstep(FADE.from, FADE.to, dot(sub(p, E), F));
  }
  // via i triangoli del tutto trasparenti (oltre la sfumatura); i pochi triangoli invertiti nelle pieghe strette delle
  // dita (normale geometrica opposta a quella della SDF) si girano
  const keep = [], P3 = m.pos;
  for (let i = 0; i < m.idx.length; i += 3){
    const a = m.idx[i], b = m.idx[i + 1], c = m.idx[i + 2];
    if (Math.max(fade[a], fade[b], fade[c]) <= .003) continue;
    const e1 = [P3[b*3] - P3[a*3], P3[b*3 + 1] - P3[a*3 + 1], P3[b*3 + 2] - P3[a*3 + 2]], e2 = [P3[c*3] - P3[a*3], P3[c*3 + 1] - P3[a*3 + 1], P3[c*3 + 2] - P3[a*3 + 2]];
    const gn = [e1[1]*e2[2] - e1[2]*e2[1], e1[2]*e2[0] - e1[0]*e2[2], e1[0]*e2[1] - e1[1]*e2[0]];
    const vn = [0, 1, 2].map(j => nrm[a*3 + j] + nrm[b*3 + j] + nrm[c*3 + j]);
    if (gn[0]*vn[0] + gn[1]*vn[1] + gn[2]*vn[2] < 0) keep.push(a, c, b); else keep.push(a, b, c);
  }
  const idx = n > 65535 ? new Uint32Array(keep) : new Uint16Array(keep);
  return { pos: m.pos, nrm, idx, color, skinIndex, skinWeight, fade,
    stats: { vertici: n, triangoli: idx.length/3, blocchi: m.blocks, ms: { superficie: t1 - t0, normali: t2 - t1, ao: t3 - t2, totale: Date.now() - t0 } } };
}
