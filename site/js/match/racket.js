// Il colpo con la racchetta, uguale per mouse, tastiera e telefono. Senza Three.js (testabile con node --test).
// Ogni comando manda uno «swing»: potenza (0..1), effetto verticale (lift, -1 dall'alto in basso … 1 dal basso in alto),
// pallonetto sì/no, mira facoltativa e l'istante in cui la racchetta passa nel punto d'impatto (at ± win secondi).
// Il tempo decide quasi tutto, come nel tennis vero (e come in Wii Sports): in anticipo la palla va incrociata,
// in ritardo lungolinea, molto fuori tempo si stecca o si manca la palla.
import { shotTarget } from './ai.js';
import { sideOf } from './physics.js';

export const S0 = .45;                 // punto d'impatto ideale: 45 cm davanti al giocatore
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// assi del giocatore: avanti (verso la rete) lungo z, destra lungo x
export const axes = p => ({ fz: p.team === 0 ? -1 : 1, rx: p.team === 0 ? 1 : -1 });
// la palla vista dal giocatore: s avanti, l a destra (il lato del dritto per un destro), h altezza
export function rel(p, b){ const { fz, rx } = axes(p); return { s: (b.z - p.z)*fz, l: (b.x - p.x)*rx, h: b.y }; }
export function inZone(p, r){
  return r.s >= -.5 && r.s <= p.reach && Math.abs(r.l) <= p.reach*1.05 && r.h >= .12 && r.h <= (p.y > .25 ? 3.2 : 2.45);
}
// un campione della palla si può colpire se l'ha toccata l'altra squadra, è già nel mio campo e il servizio è rimbalzato
export const legal = (p, k) => k.lh !== p.team && !k.srv && k.sh >= .22 && sideOf(k.z) === p.team;

// Giudica uno swing sui campioni recenti della palla [{t,x,y,z,vx,vy,vz,lh,srv,sh}].
// Restituisce null (troppo presto per dirlo), { miss: true } oppure { k: campione d'impatto, e: errore di tempo }.
// e > 0: la palla sarebbe arrivata dopo la racchetta (in anticipo); e < 0: in ritardo.
export function judgeSwing(p, sw, samples, now){
  const lo = sw.at - sw.win, hi = sw.at + sw.win, { fz } = axes(p);
  let best = null, bestD = Infinity, crossed = false;
  for (const k of samples){
    if (k.t < lo || k.t > hi || !legal(p, k)) continue;
    const r = rel(p, k);
    if (!inZone(p, r)) continue;
    if (r.s <= S0) crossed = true;
    const d = Math.abs(r.s - S0);
    if (d < bestD){ bestD = d; best = { k, r }; }
  }
  if (!best || (!crossed && now < hi)) return now >= hi ? (best ? pick(best) : { miss: true }) : null;
  return pick(best);
  function pick({ k, r }){
    const vin = Math.max(3, -k.vz*fz);                 // velocità con cui la palla viene verso il giocatore
    return { k, r, e: (k.t - sw.at) + (r.s - S0)/vin };
  }
}

export function timingLabel(u, mishit){
  if (mishit) return 'steccata';
  return Math.abs(u) < .35 ? 'perfetto' : u > 0 ? 'anticipo' : 'ritardo';
}

// Il colpo che esce dall'impatto. ball: { p, v } al momento del contatto; level: livello (errore di base).
export function racketShot(court, p, ball, sw, e, level){
  const u = clamp(e/sw.win, -1.8, 1.8), mishit = Math.abs(u) > 1;
  const r = rel(p, ball.p), fore = r.l >= 0;
  const power = clamp(sw.power ?? .6, 0, 1), lift = clamp(sw.lift ?? 0, -1, 1);
  let type = 'drive';
  if (sw.lob || lift > .65) type = 'lob';
  else if (ball.p.y > 2.05 && Math.abs(ball.p.z) < court.halfL*.75) type = 'smash';
  else if (power < .15) type = 'drop';
  // direzione dal tempo: col dritto in anticipo verso sinistra di chi colpisce (incrociato), in ritardo verso destra
  const pull = -u*.75*(fore ? 1 : -1), side = p.team === 0 ? 1 : -1;
  let target;
  if (sw.aim) target = { x: sw.aim.x + side*pull*(court.halfW - .75)*.7, z: sw.aim.z };
  else target = shotTarget(court, p.team, clamp(pull, -1.15, 1.15), .4 + .55*power, type);
  // errore (in metri, gaussiano): tempo, palla lontana dal corpo o troppo bassa, troppa forza, palla in arrivo veloce
  const stretch = Math.max(0, Math.abs(r.l) - .95)*.6 + Math.max(0, .45 - r.h)*.8;
  const pace = Math.hypot(ball.v.x, ball.v.z);
  let error = level.humanError*.5 + 1.25*u*u + stretch + Math.max(0, power - .78)*2.6 + pace/30*.3 + (type === 'smash' ? .15 : 0);
  let speed = type === 'lob' || type === 'drop' ? 1 : .72 + .6*power;
  let clearance = type === 'lob' ? 1.2 : type === 'smash' ? .15 : .28 + .4*Math.max(0, lift) - .08*Math.max(0, -lift);
  if (mishit){ error += 1.6; speed = .65; clearance = -.2 + Math.abs(u)*.6; }
  return { type, target, error, clearance, pace: speed, timing: u, label: timingLabel(u, mishit), mishit, fore, power };
}
