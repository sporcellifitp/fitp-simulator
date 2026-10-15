// Giocatori comandati dall'IA e scelta dei colpi (condivisa con il giocatore umano). Senza Three.js.
import { predict, sideOf, aimShot, shotTime } from './physics.js';

export const LEVELS = {
  facile:  { skill: .42, speed: 4.3, reaction: .38, humanReach: 1.8, humanError: .25, label: 'Facile', assist: true },
  normale: { skill: .68, speed: 5.4, reaction: .26, humanReach: 1.35, humanError: .45, label: 'Normale' },
  esperto: { skill: .86, speed: 6.3, reaction: .16, humanReach: 1.2, humanError: .6, label: 'Esperto' },
};

// numero casuale gaussiano da un generatore uniforme
export const gauss = rng => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };

// punto d'arrivo nel campo avversario: aimX da -1 (sinistra di chi colpisce) a 1, depth da 0 (corta) a 1 (profonda)
export function shotTarget(court, team, aimX = 0, depth = .8, type = 'drive'){
  const dir = team === 0 ? -1 : 1;                           // verso il campo avversario
  const deep = court.sport === 'padel' ? court.halfL - 1.6 : court.halfL - 1.1;
  // Una palla corta deve cadere vicino alla rete, non semplicemente nella metà corta del campo.
  const z = type === 'drop' ? dir*2.1 : dir*(court.serviceZ*.45 + (deep - court.serviceZ*.45)*(type === 'lob' ? Math.max(depth, .8) : depth));
  // la sinistra di chi guarda verso -z (squadra 0) è x < 0; per la squadra 1 è x > 0
  const x = (team === 0 ? 1 : -1)*aimX*(court.halfW - .75);
  return { x, z };
}

// velocità della palla per un colpo verso un bersaglio, con l'errore di esecuzione
// pace: ritmo del colpo (1 normale, sopra 1 più veloce: la racchetta del giocatore lo sceglie con la potenza)
export function makeShot(court, from, target, type, error, rng, clearance = null, pace = 1){
  const t = { x: target.x + gauss(rng)*error, z: target.z + gauss(rng)*error*1.2 };
  const dist = Math.hypot(t.x - from.x, t.z - from.z);
  const v = aimShot(from, t, shotTime(court, type, dist)*(1 + gauss(rng)*.05)/pace, court, clearance ?? (type === 'lob' ? 1.2 : type === 'smash' ? .15 : .3));
  return { v, target: t };
}

// dove intercettare la palla: il primo punto raggiungibile, a un'altezza giocabile, prima del secondo rimbalzo
export function planIntercept(me, ball, court, rally, T = 2.6){
  const samples = predict(ball, court, T, 1/40);
  let fallback = null;
  for (const s of samples){
    if (s.bounces >= 2) break;
    if (sideOf(s.z) !== me.team) continue;
    if (rally.isServe && rally.state === 'live' && s.bounces === 0) continue;
    const high = me.canJump ? 2.9 : 2.25;
    if (s.y < .22 || s.y > high) continue;
    if (s.bounces === 0 && Math.abs(s.z) > court.serviceZ + 1.5 && court.sport === 'tennis') continue; // niente volée da fondo
    const reachT = Math.max(0, Math.hypot(s.x - me.x, s.z - me.z) - me.reach*.75)/me.speed;
    if (!fallback) fallback = s;
    if (reachT <= s.t + .03) return { ...s, reachable: true };
  }
  return fallback ? { ...fallback, reachable: false } : null;
}

// l'IA sceglie il colpo guardando la posizione degli avversari
export function chooseShot(court, me, ball, opponents, rng, rallyHits = 0){
  const netDist = Math.abs(ball.p.z);
  let type = 'drive';
  if (ball.p.y > 2.1 && netDist < court.halfL*.6) type = 'smash';
  else {
    const oppAtNet = opponents.some(o => Math.abs(o.z) < court.serviceZ*.7);
    const r = rng();
    if (oppAtNet && r < .35) type = 'lob';
    else if (court.sport === 'padel' && r < .12) type = 'lob';
    else if (!oppAtNet && r < .08 + (1 - me.skill)*.05) type = 'drop';
  }
  // mira lontano dall'avversario più vicino alla palla d'arrivo
  const avgX = opponents.reduce((s, o) => s + o.x, 0)/Math.max(1, opponents.length);
  const side = (me.team === 0 ? 1 : -1);
  let aimX = -Math.sign(avgX*side || (rng() - .5))*(.35 + rng()*.6);
  if (rng() < .3) aimX = (rng()*2 - 1)*.6;
  const depth = .55 + rng()*.45;
  const pressure = Math.min(1, Math.hypot(ball.v.x, ball.v.z)/30);
  const lowVolley = ball.p.y < court.netH + .25 && Math.abs(ball.p.z) < court.serviceZ ? .35 : 0;
  const error = (1 - me.skill)*1.3 + pressure*.35 + lowVolley + rallyHits*.025 + (type === 'smash' ? .2 : 0);
  const target = shotTarget(court, me.team, aimX, depth, type);
  // errore gratuito: più probabile per i meno bravi e negli scambi lunghi
  const pErr = (1 - me.skill)*.09 + rallyHits*.006 + lowVolley*.08;
  if (rng() < pErr){
    if (court.sport === 'padel' || rng() < .4) return { type, target: { x: target.x, z: Math.sign(target.z)*.4 }, error, clearance: -.35, unforced: true };
    const out = rng() < .5 ? { x: Math.sign(target.x || 1)*(court.halfW + .5 + rng()), z: target.z } : { x: target.x, z: Math.sign(target.z)*(court.halfL + .6 + rng()) };
    return { type, target: out, error: error*.5, unforced: true };
  }
  return { type, target, error };
}
