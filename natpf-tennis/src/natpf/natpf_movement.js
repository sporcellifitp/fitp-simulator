// B32 · Tappa 3.2 del rapporto docs/b16/rapporto-gameplay.md (miglioramento 7, M7, MOV-5 e MOV-9): movimento con
// accelerazione e frenata e colpi in corsa per chi gioca contro la CPU. Misure e scelte: docs/b32/movimento.md.
//
// Prima: il personaggio di chi gioca partiva a velocità piena nell'istante del colpo della CPU, cambiava verso
// all'istante, si fermava di colpo e aspettava fermo: arrivava su quasi tutto e non colpiva mai in corsa (la CPU invece
// accelera e frena da ottobre: natpf_skill.cpuStep, natpf_legend.legendStep). Ora, solo per chi gioca contro la CPU:
//   • primo passo: al colpo della CPU chi gioca fa lo split-step (frena, se stava correndo) per `split` secondi, più
//     `read` secondi quando la palla è veloce (da readFrom m/s, pieno readSpan m/s dopo): la palla veloce si legge dopo;
//   • poi accelera (`accel` m/s²) fino alla velocità massima di sempre e frena (`decel` m/s²) per fermarsi sul punto;
//     correre dalla parte sbagliata costa: prima si frena, poi si riparte (cambio di direzione);
//   • arriva «giusto in tempo»: sulla palla vicina va al passo (almeno `jog` m/s) e si ferma `settle` secondi prima del
//     colpo, invece di correre a tutta e aspettare fermo quasi un secondo;
//   • il piano d'intercetto (natpf_impact.planPlayerIntercept) usa gli stessi tempi (runTime): la palla angolata e
//     lontana diventa «in allungo» (il piano ha poco margine) o non raggiunta (piano «stretch»: la racchetta arriva solo
//     a `reach` m di lato, come il campo aperto dello stesso schermo, natpf_duo_rules.OPEN_COURT.reach);
//   • sulla palla lontana (corsa di almeno `throughFrom` m) senza il tempo di fermarsi (margine sotto `through` s) si
//     colpisce in corsa: niente frenata finale, si arriva sulla palla correndo. La corsa al contatto toglie qualità come
//     sempre (natpf_skill.reachQuality: fino a −15% a velocità piena; prima non capitava mai), la scritta dell'esito lo
//     dice («in corsa», «in allungo») e l'animazione lo mostra da sola (i piedi corrono finché il personaggio si muove,
//     anche durante il colpo: player_body_animation.js, i modelli 3D che la seguono, la prova del dritto dal video).
// Non cambia: il riconoscimento dei gesti, il movimento automatico verso la palla (il bersaglio lo decide sempre il
// piano), la CPU, il Player 2 (sfida tra due computer), lo stesso schermo (con il campo aperto spento e acceso), il
// doppio, l'allenamento, gli eventi e la demo, il livello Bambini (playerRun: null, movimento di prima). Revisione finale:
// vale anche a rete e verso la rete (prima entro 7 m dalla rete restava il «passo corto» del B31, nascosto nel piano).
// Valori per livello: SKILL_LEVELS[livello].playerRun in natpf_skill.js (Evento: media tra Casual e Pro come il resto).
// Niente oggetti creati a ogni fotogramma: runStep scrive solo numeri sull'attore.
import { skillLevel } from './natpf_skill.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

// Solo prove e banchi (scripts/audit/movimento.mjs --senza-b32, test): off = true rimette il movimento di prima per tutti
export const movementRules = { off: false };
export const moveOff = () => movementRules.off === true;
// distanza sotto cui il personaggio è arrivato (come il motore: game_engine._stepActorFootwork)
export const ARRIVE = .08;
// arrivo giusto in tempo: velocità media che serve × PACE (partenza e frenata fanno perdere un poco di strada)
export const PACE = 1.25;

// regole del movimento per questo personaggio, o null (movimento di prima)
export function runProfile(engine, actor){
  if (moveOff() || !engine || !actor || actor !== engine.player) return null;
  if (engine.isMultiplayer || engine.isDoubles || engine.versus?.active || engine.natpfSplit?.active) return null;
  if (engine.autoPlayMode || engine.natpfUi?.training?.active || engine.natpfUi?.events?.active || engine.natpfUi?.trial?.active) return null;
  // (Prima del B32 finale: a rete e verso la rete, entro 7 m, si teneva il «passo corto» del B31, che però c'era solo nel
  // piano d'intercetto: il personaggio correva a velocità piena e il gioco lo trattava come lento, una regola nascosta.
  // Revisione finale: il passo corto nascosto è tolto e anche a rete vale questo movimento, che si vede: split-step,
  // accelerazione e frenata. Vale anche per la corsa in avanti sulla palla corta della CPU. Misure:
  // docs/revisione-finale-2026-11-13.md)
  const R = skillLevel(engine.matchConfig?.difficulty).playerRun;
  return R && finite(R.accel) > 0 ? R : null;
}

// ritardo del primo passo (s) per la palla in arrivo: split-step più la lettura della palla veloce
export function firstStep(R, ballSpeed = 0){
  return finite(R?.split) + finite(R?.read)*clamp((finite(ballSpeed) - finite(R?.readFrom, 18))/Math.max(1, finite(R?.readSpan, 12)));
}
// velocità (lungo la direzione del bersaglio) che resta dopo `hold` secondi di frenata dello split-step
export const afterHold = (v0, R, hold) => Math.sign(v0)*Math.max(0, Math.abs(finite(v0)) - finite(R?.decel, 20)*Math.max(0, finite(hold)));

// Tempo (s) per coprire d metri in linea retta partendo con velocità v0 lungo quella direzione (negativa: si corre
// dalla parte opposta e prima si frena), accelerando fino a vmax; senza fermarsi in fondo (si può colpire in corsa)
export function runTime(d, v0, R, vmax){
  const A = Math.max(1, finite(R?.accel, 20)), D = Math.max(1, finite(R?.decel, 25)), V = Math.max(1, finite(vmax, 8));
  let t = 0, dist = Math.max(0, finite(d)), v = finite(v0);
  if (v < 0){ t += -v/D; dist += v*v/(2*D); v = 0; }
  v = Math.min(v, V);
  const dAcc = (V*V - v*v)/(2*A);
  if (dist <= dAcc) return t + (-v + Math.sqrt(v*v + 2*A*dist))/A;
  return t + (V - v)/A + (dist - dAcc)/V;
}

// Si colpisce in corsa? Corsa lunga (almeno throughFrom m) con poco margine (meno di `through` secondi tra quando si
// arriverebbe correndo e quando arriva la palla), o palla non raggiunta: non c'è il tempo di fermarsi e piazzarsi, si
// arriva sulla palla correndo. slack: margine del piano (s); run: metri da correre; reach: false se il piano non arriva
export const runThrough = (R, { slack = 1, run = 0, reached = true } = {}) => !!R && (!reached || (finite(run) >= finite(R.throughFrom, 2) && finite(slack) < finite(R.through, .3)));

// Piano nuovo di chi gioca (natpf_impact.planPlayerIntercept): split-step fino a now + hold (solo al colpo
// dell'avversario, non quando il piano si rifà) e arrivo «giusto in tempo» sul punto (x, z): settle secondi prima del
// contatto (t secondi da adesso), o proprio al contatto e senza fermarsi se through (runThrough). Solo numeri sull'attore
export function startHold(engine, actor, R, { hold = 0, t = 0, x = 0, z = 0, through = false } = {}){
  const now = finite(engine?.elapsedTime);
  if (hold > 0) actor.natpfRunHold = now + hold;
  actor.natpfRunBy = now + finite(t) - (through ? 0 : finite(R?.settle, .25)); actor.natpfRunX = x; actor.natpfRunZ = z;
  actor.natpfRunThrough = through ? 1 : 0;
  return actor.natpfRunBy;
}

// Un passo del movimento (al posto della velocità costante del motore). vmax: velocità massima di adesso (con stanchezza
// e palla super, natpf_skill.moveFactor). Come natpf_skill.cpuStep: velocità voluta piena lontano dal bersaglio, poi
// quella che permette di fermarsi frenando; accelerazione limitata (frenata più forte dell'accelerazione).
// Arrivo giusto in tempo: verso il punto del piano (natpfRunX/Z, finché il bersaglio è quello) la velocità voluta è quella
// che serve per arrivarci entro natpfRunBy (almeno R.jog, al più vmax): sulla palla vicina si va al passo e si arriva
// pronti; sulla palla lontana si corre al massimo e, se il tempo non basta, si colpisce ancora in corsa. Prima si partiva
// sempre a velocità piena e si aspettava fermi quasi un secondo
export function runStep(engine, a, dt, R, vmax){
  if (!(dt > 0)) return;
  const now = finite(engine?.elapsedTime), hold = finite(a.natpfRunHold, -1) > now;
  const dx = a.targetPos.x - a.pos.x, dz = a.targetPos.z - a.pos.z, d = Math.hypot(dx, dz);
  let cap = vmax, through = false;
  if (finite(a.natpfRunBy) > 0 && Math.abs(a.targetPos.x - finite(a.natpfRunX)) < .01 && Math.abs(a.targetPos.z - finite(a.natpfRunZ)) < .01){
    const left = a.natpfRunBy - now;
    // in corsa (natpfRunThrough): verso il punto alla velocità che serve per esserci al contatto, senza la frenata finale
    through = a.natpfRunThrough === 1 && left > -.15;
    if (left > .05) cap = Math.min(vmax, Math.max(finite(R.jog, 2.5), (through ? 1.05 : PACE)*Math.max(0, d - ARRIVE)/left));
  }
  const vDes = hold || d <= ARRIVE ? 0 : through ? cap : Math.min(cap, Math.sqrt(2*R.decel*Math.max(0, d - ARRIVE)));
  const wx = d > 1e-6 ? dx/d*vDes : 0, wz = d > 1e-6 ? dz/d*vDes : 0;
  let ax = wx - a.vel.x, az = wz - a.vel.z; const am = Math.hypot(ax, az);
  // frena quando la velocità voluta è più piccola di quella di adesso o va dall'altra parte
  const braking = vDes < Math.hypot(a.vel.x, a.vel.z) || a.vel.x*wx + a.vel.z*wz < 0;
  const lim = (braking ? R.decel : R.accel)*dt;
  if (am > lim){ ax *= lim/am; az *= lim/am; }
  a.vel.set(a.vel.x + ax, 0, a.vel.z + az);
  if (!vDes && Math.hypot(a.vel.x, a.vel.z) < .05) a.vel.set(0, 0, 0);
  const s = Math.hypot(a.vel.x, a.vel.z)*dt;
  a.pos.x += a.vel.x*dt; a.pos.z += a.vel.z*dt; a.stridePhase += s*4.4;
}

// come si è arrivati sulla palla, per la scritta dell'esito (natpf_shot_feedback.shotWhy) e il registro: 'corsa' (velocità
// al contatto oltre runSay della massima), 'allungo' (piano con poco margine o palla non raggiunta), null
export function moveTag(R, { running = 0, stretch = 0 } = {}){
  if (!R) return null;
  if (finite(running) >= finite(R.runSay, .5)) return 'corsa';
  if (finite(stretch) >= finite(R.stretchSay, .7)) return 'allungo';
  return null;
}
export const MOVE_WHY = Object.freeze({ corsa: 'in corsa', allungo: 'in allungo' });
