// B73 · Passi veri delle mascotte 3D nella card di fine partita. Richiesta dell'utente del 16/11/2026 ripresa il 20/11
// («migliorare le movenze con i piedi: avanti, indietro, destra e sinistra», «falli»). Documento docs/b73/passi-mascotte.md.
// Prima (misura del 20/11): nessun movimento andava avanti o indietro; quelli che si spostavano di lato (salti 48 cm,
// trascinata 28 cm, passi incrociati 22 cm, robot 15 cm) facevano scivolare tutto il personaggio, piedi a terra compresi
// (fino a 36 cm di scivolata per giro), e anche nelle pose «ferme» i piedi seguivano quelli del tennista che salta (Aura:
// 66 cm per giro).
// Qui un PIANO DI PASSI: a ogni passo un piede si alza e si posa in un punto nuovo mentre l'altro resta fermo a terra; il
// corpo sta a metà fra i due piedi, quindi si sposta mentre il piede in aria va avanti e si ferma quando tutti e due sono
// a terra. I piedi sono descritti nel riferimento del SUOLO (fermi nel mondo mentre il personaggio si sposta:
// natpf_mascot_rig.poseMascotCard, legs.frame = 'ground'); at(u) sposta tutto il personaggio di quanto si è spostato il
// punto di mezzo dei piedi. Unità del modello (la mascotte è alta 1; in campo STEP_SCALE metri); x come le mani (lato
// della racchetta x < 0: per chi gioca di destro è la sinistra di chi guarda; il mancino è lo specchio), z verso chi
// guarda. Il giro (natpf_card_moves.CARD_LOOP, 2,05 s, 24 fotogrammi) è diviso in 8 battute.

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = t => { const x = clamp01(t); return x*x*(3 - 2*x); };
// scala della mascotte in campo (uguale a natpf_mascot_rig.MASCOT_SCALE: qui senza importare three.js, prova nel test)
export const STEP_SCALE = 1.6;
// parte del passo in cui il piede si alza senza ancora andare avanti (e alla fine scende senza più andare avanti): così
// non striscia per terra
export const STEP_LIFTOFF = 0.15;

// Piano: steps = [{ foot: 'a' | 'b', to: [dx, dz], beat, len = 1, lift? }] (a: lato della racchetta, b: l'altro; to:
// spostamento del piede dal punto in cui era). beats battute per giro; swing: parte del passo in aria (il resto: tutti e
// due a terra); lift: alzata del piede; hop: saltello (anche il piede fermo si stacca, in verticale, e tutto il
// personaggio sale: i passi saltellati); shift: quanto il bacino va sopra il piede fermo mentre l'altro è in aria;
// bob: quanto il bacino sale a metà passo. Il giro deve chiudersi: ogni piede torna al suo posto.
export function stepPlan(steps, { beats = 8, swing = 0.7, lift = 0.05, hop = 0, shift = 0.25, bob = 0.008 } = {}){
  const at = { a: [0, 0], b: [0, 0] };
  const list = steps.map(s => {
    const from = at[s.foot].slice(), to = [from[0] + s.to[0], from[1] + s.to[1]];
    at[s.foot] = to;
    const u0 = s.beat/beats, u1 = (s.beat + (s.len || 1))/beats;
    return Object.freeze({ foot: s.foot, from, to, u0, u1: u0 + swing*(u1 - u0), lift: s.lift ?? lift, hop: s.hop ?? hop });
  });
  const closed = Math.hypot(...at.a, ...at.b) < 1e-9;
  return Object.freeze({ steps: list, beats, swing, shift, bob, closed });
}

// Stato al tempo u del giro (in [0, 1)): piedi [x, alzata, z] nel riferimento del suolo, corpo [x, z] (punto di mezzo dei
// piedi), salto del corpo, piede in aria ('a', 'b' o null) e a che punto del passo (0 → 1), spostamento del bacino verso
// il piede fermo e sua salita (unità del modello, nel riferimento del corpo). Niente oggetti nuovi se si passa out.
export function stepsAt(plan, u0, out = { a: [0, 0, 0], b: [0, 0, 0], body: [0, 0], up: 0, air: null, t: 0, hips: [0, 0] }){
  const u = ((u0 % 1) + 1) % 1;
  out.air = null; out.t = 0; out.up = 0;
  for (const k of ['a', 'b']){
    // posizione del piede: quella dopo l'ultimo passo partito prima di u (prima del primo passo del giro: la fine del
    // giro, cioè il suo posto, perché il giro è chiuso)
    const F = out[k]; F[0] = 0; F[1] = 0; F[2] = 0;
    for (const s of plan.steps){
      if (s.foot !== k || s.u0 > u) continue;
      if (u >= s.u1){ F[0] = s.to[0]; F[2] = s.to[1]; continue; }
      const t = (u - s.u0)/(s.u1 - s.u0), e = ss((t - STEP_LIFTOFF)/(1 - 2*STEP_LIFTOFF)), arc = Math.sin(Math.PI*t);
      F[0] = s.from[0] + (s.to[0] - s.from[0])*e; F[2] = s.from[1] + (s.to[1] - s.from[1])*e; F[1] = s.lift*arc;
      out.air = k; out.t = t; out.up = s.hop*arc;
    }
  }
  // saltello: anche il piede fermo si stacca da terra in verticale (con tutto il personaggio)
  if (out.up > 0){ out.a[1] += out.up; out.b[1] += out.up; }
  out.body[0] = (out.a[0] + out.b[0])/2; out.body[1] = (out.a[2] + out.b[2])/2;
  // bacino sopra il piede fermo mentre l'altro è in aria, e un filo più su a metà passo
  const w = out.air ? Math.sin(Math.PI*out.t)**2 : 0, st = out.air === 'a' ? out.b : out.a;
  out.hips[0] = out.air ? plan.shift*w*(st[0] - out.body[0]) : 0;
  out.hips[1] = plan.bob*w;
  return out;
}

// Spostamento di tutto il personaggio (metri, nel riferimento di chi guarda) per natpf_card_moves.applyCardMove: il punto
// di mezzo dei piedi; footL/footR (alzata dei piedi del tennista, che nella card con la mascotte non si vede) dai piedi.
export function stepsMotion(plan, u, extra = null){
  const s = stepsAt(plan, u);
  return { right: STEP_SCALE*s.body[0], fwd: STEP_SCALE*s.body[1], up: STEP_SCALE*s.up, yaw: 0, footL: STEP_SCALE*s.a[1], footR: STEP_SCALE*s.b[1], ...(extra ? extra(s, u) : null) };
}
// Piedi per la posa (natpf_mascot_rig.poseMascotCard): nel riferimento del suolo, e il bacino che va sopra il piede fermo
export function stepsLegs(plan, u){
  const s = stepsAt(plan, u);
  return { legs: { frame: 'ground', a: s.a.slice(), b: s.b.slice() }, hipsX: s.hips[0], hipsY: s.hips[1], state: s };
}

// Piedi fermi a terra dove sono (pose sul posto: il personaggio si muove sopra i piedi, che non scivolano)
export const PLANTED = Object.freeze({ frame: 'ground', a: Object.freeze([0, 0, 0]), b: Object.freeze([0, 0, 0]) });

// ---------------------------------------------------------------------------------------------------------------
// I piani dei movimenti con i passi (natpf_card_moves.js)
// Vittoria · «Quattro passi di festa»: due passi avanti (verso chi guarda), due a destra, due indietro, due a sinistra
// (passo e chiudi: il primo piede va, l'altro lo raggiunge); il personaggio disegna un quadrato e torna al suo posto.
// Otto passi in un giro sono tre fotogrammi a passo (24 per giro): con il piede in aria per il 90 % della battuta due
// fotogrammi su tre lo mostrano staccato (con il 72 % uno solo, e il passo non si leggeva nella card)
export const FWD = 0.17, SIDE = 0.15;
export const PLAN_FESTA = stepPlan([
  { foot: 'b', to: [0, FWD], beat: 0 }, { foot: 'a', to: [0, FWD], beat: 1 },
  { foot: 'b', to: [SIDE, 0], beat: 2 }, { foot: 'a', to: [SIDE, 0], beat: 3 },
  { foot: 'a', to: [0, -FWD], beat: 4 }, { foot: 'b', to: [0, -FWD], beat: 5 },
  { foot: 'a', to: [-SIDE, 0], beat: 6 }, { foot: 'b', to: [-SIDE, 0], beat: 7 },
], { lift: 0.075, swing: 0.9, shift: 0.3, bob: 0.012 });
// Vittoria · «Salti di gioia e passi di lato»: quattro passi saltellati, due a destra e due a sinistra
export const HOP_SIDE = 0.15;
export const PLAN_SALTI = stepPlan([
  { foot: 'b', to: [HOP_SIDE, 0], beat: 0, len: 2 }, { foot: 'a', to: [HOP_SIDE, 0], beat: 2, len: 2 },
  { foot: 'a', to: [-HOP_SIDE, 0], beat: 4, len: 2 }, { foot: 'b', to: [-HOP_SIDE, 0], beat: 6, len: 2 },
], { lift: 0.05, hop: 0.045, swing: 0.62, shift: 0.15, bob: 0 });
// Sconfitta · «Testa bassa, passi trascinati di lato»: due passi lenti a destra e due a sinistra, il piede appena staccato
export const DRAG_SIDE = 0.13;
export const PLAN_TRASCINA = stepPlan([
  { foot: 'b', to: [DRAG_SIDE, 0], beat: 0, len: 2 }, { foot: 'a', to: [DRAG_SIDE, 0], beat: 2, len: 2 },
  { foot: 'a', to: [-DRAG_SIDE, 0], beat: 4, len: 2 }, { foot: 'b', to: [-DRAG_SIDE, 0], beat: 6, len: 2 },
], { lift: 0.022, swing: 0.8, shift: 0.3, bob: 0 });
// Sconfitta · «Passi indietro, a testa bassa»: due passi lenti indietro (lontano da chi guarda) e due avanti, per tornare
export const BACK = 0.13;
export const PLAN_INDIETRO = stepPlan([
  { foot: 'a', to: [0, -BACK], beat: 0, len: 2 }, { foot: 'b', to: [0, -BACK], beat: 2, len: 2 },
  { foot: 'b', to: [0, BACK], beat: 4, len: 2 }, { foot: 'a', to: [0, BACK], beat: 6, len: 2 },
], { lift: 0.03, swing: 0.78, shift: 0.3, bob: 0 });
