// Telefono come racchetta: dove e quando chi gioca colpisce la palla (docs/NATPF_RACCHETTA_VIRTUALE.md, P4, P6, P11).
//
//   • Movimento automatico: quando la CPU (o, nel 1v1, l'altro giocatore) colpisce, la traiettoria si prevede con la
//     stessa fisica del motore e chi gioca va dove prenderla. Dopo il rimbalzo all'altezza comoda; al volo se è avanti (volée) o se la palla è alta e
//     raggiungibile (schiacciata). Prima aspettava sempre 2,15 m dietro il rimbalzo: niente volée né schiacciate al
//     volo, e sulle palle corte e lente restava lontano (swing fatti un secondo prima).
//   • Finestra d'impatto: la palla si colpisce solo quando arriva al punto d'impatto, mai prima. Uno swing arrivato in
//     anticipo resta in attesa con il suo tempo vero; uno più forte arrivato dopo lo sostituisce (il primo era la
//     preparazione). All'arrivo della palla: dentro la finestra si colpisce, prima della finestra è un colpo a vuoto.
//     Dopo il punto d'impatto si colpisce ancora per poco (in ritardo).
//   • Dopo il colpo: chi è avanti resta a rete; dopo un attacco riuscito da metà campo si sale a rete; altrimenti si
//     torna in fondo al campo.
import { bounceSpin, eventLatency, holdSwingPrep, COURT } from './natpf_skill.js';
import { IMPACT, impactWindow, lateSpanOf } from './natpf_stroke_outcome.js';
import { skillLevel } from './natpf_skill.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

// stessa fisica della palla del motore (L in game_engine.js; il test confronta le due traiettorie)
export const PHYS = Object.freeze({ GRAVITY: 9.15, AIR_DRAG: .012, BOUNCE: .77, FRICTION: .86, DT: 1/120 });

export const PLAN = Object.freeze({
  side: .72,                 // m: palla di lato al corpo all'impatto (dritto o rovescio)
  comfort: [.5, 1.45],       // m: altezza comoda dopo il rimbalzo
  volley: [.5, 1.95], volleyMinZ: 2.2,   // volée: altezza e distanza minima dalla rete
  frontCourt: 8,             // m dalla rete: da qui in avanti si prende al volo
  smash: [1.9, 2.95], lobApex: 3.3, smashMinZ: 2.6,   // schiacciata al volo sulle palle che salgono oltre lobApex
  react: .12,                // s: prima di muoversi
  slackFull: .35,            // s di margine con cui si arriva sul punto d'impatto senza fretta; meno è un colpo in corsa
  runFrom: 2, runSpan: 4, runWeight: .7,   // m: una corsa lunga (oltre runFrom) è un colpo in corsa anche se si arriva
  stretchCost: .4,           // qualità che si perde arrivando al limite (un buon angolo dell'avversario costa)
  baseline: 11.74, maxBack: 13.4,
  netZ: 4.6,                 // m: posizione a rete
  letGo: .15,                // m: la palla che rimbalzerebbe fuori di almeno tanto si lascia andare (non si gioca al volo)
  // salita a rete dopo un colpo d'attacco da non oltre fromZ: qualità e (profondità e forza, oppure angolo)
  approach: Object.freeze({ quality: .8, depth: 9.2, power: .66, angle: 2.9, fromZ: 10.6 }),
});

// Traiettoria della palla da adesso: [{ t, x, y, z, vy, bounces }] (bounces: rimbalzi da adesso in poi)
export function predictBall(b, { maxT = 2.8, dt = PHYS.DT, stopZ = 14.5 } = {}){
  let x = finite(b.pos.x), y = finite(b.pos.y), z = finite(b.pos.z), vx = finite(b.vel.x), vy = finite(b.vel.y), vz = finite(b.vel.z);
  const sx = finite(b.spin?.x), sy = finite(b.spin?.y), bs = bounceSpin(sx), out = [];
  let bounces = 0;
  for (let t = dt; t <= maxT; t += dt){
    const d = Math.max(0, 1 - PHYS.AIR_DRAG*Math.hypot(vx, vy, vz)*dt);
    vx *= d; vy *= d; vz *= d; vy -= (PHYS.GRAVITY + sx*.14)*dt; vx += sy*.12*dt;
    x += vx*dt; y += vy*dt; z += vz*dt;
    if (y <= .075 && vy < 0){ y = .075; vy = -vy*PHYS.BOUNCE*bs.up; vx *= PHYS.FRICTION; vz *= PHYS.FRICTION*bs.along; bounces++; }
    out.push({ t, x, y, z, vy, bounces });
    if (Math.abs(z) > stopZ || bounces > 1) break;
  }
  return out;
}

// mano di chi gioca (una sola per tutto il gioco, natpf_hand.js); per il Player 2 del 1v1 quella del suo telefono
const handOf = (engine, actor) => (actor && actor === engine.opponent
  ? engine.natpfP2Hand || 'right'
  : engine.natpfUi?.hand?.hand || engine.natpfPhone?.hand || engine.motionController?.handPreference || 'right');
// piano in corso: di chi gioca qui (natpfPlan) o del Player 2 del 1v1 (natpfPlanP2)
const planKey = (engine, actor) => (actor && actor === engine.opponent ? 'natpfPlanP2' : 'natpfPlan');
export const planOf = (engine, actor = engine.player) => engine[planKey(engine, actor)] || null;

// Piano d'intercetto per chi gioca: nella propria metà campo (z positive per chi gioca qui, negative per il Player 2 del
// 1v1: tutto si calcola nel riferimento di chi colpisce). Imposta targetPos e il piano (planOf).
export function planPlayerIntercept(engine, actor){
  const b = engine.ball; if (!b || !actor) return null;
  const path = predictBall(b), speed = Math.max(4, finite(actor.maxSpeed, 9)), key = planKey(engine, actor);
  const half = Math.sign(actor.pos.z) || 1, Z = z => z*half;
  // lato del dritto in x: la destra di chi guarda verso −z (qui) è +x, di chi guarda verso +z (Player 2) è −x
  const fh = (handOf(engine, actor) === 'left' ? -1 : 1)*half;
  // dove stare per prendere la palla nel punto s: di lato (dal lato in cui arriva), poco dietro il punto d'impatto
  const stand = s => { const dx = s.x - actor.pos.x, side = Math.abs(dx) > .3 ? Math.sign(dx) : fh; return { side, x: clamp(s.x - side*PLAN.side, -COURT.SINGLES_X - 1.4, COURT.SINGLES_X + 1.4), z: half*clamp(Z(s.z) + IMPACT.contactAhead, 1.2, PLAN.maxBack) }; };
  const need = s => { const p = stand(s); return PLAN.react + Math.hypot(p.x - actor.pos.x, p.z - actor.pos.z)/speed; };
  const reachable = s => need(s) <= s.t;
  const before = path.filter(s => s.bounces === 0 && Z(s.z) > 0), after = path.filter(s => s.bounces === 1 && Z(s.z) <= PLAN.maxBack);
  const apex = before.reduce((m, s) => Math.max(m, s.y), 0);
  // palla che rimbalzerebbe fuori: si lascia andare (come fa chi gioca davvero), anche a rete
  const bounce = path.find(s => s.bounces === 1);
  if (bounce && Z(bounce.z) > 0 && (Math.abs(bounce.x) > COURT.OUT_X + PLAN.letGo || Z(bounce.z) > COURT.OUT_Z + PLAN.letGo)){
    engine[key] = { kind: 'letgo', side: 0, contact: { x: +bounce.x.toFixed(3), y: 0, z: +bounce.z.toFixed(3) }, t: +bounce.t.toFixed(3), at: finite(engine.elapsedTime), stretch: 0 };
    return engine[key];
  }
  let kind = null, s = null;
  // schiacciata al volo: palla alta che scende nella zona della schiacciata
  if (apex >= PLAN.lobApex) s = before.find(p => p.vy < 0 && p.y >= PLAN.smash[0] && p.y <= PLAN.smash[1] && Z(p.z) >= PLAN.smashMinZ && reachable(p)), kind = s ? 'smash' : null;
  // volée: chi è avanti prende la palla prima del rimbalzo
  if (!s && Z(actor.pos.z) <= PLAN.frontCourt) s = before.find(p => Z(p.z) >= PLAN.volleyMinZ && p.y >= PLAN.volley[0] && p.y <= PLAN.volley[1] && reachable(p)), kind = s ? 'volley' : null;
  // dopo il rimbalzo: il primo punto comodo (in discesa dopo il colmo, o al colmo se è basso) raggiungibile
  if (!s){
    const top = after.reduce((m, p) => Math.max(m, p.y), 0);
    s = after.find(p => p.y >= PLAN.comfort[0] && p.y <= PLAN.comfort[1] && (p.vy <= 0 || top <= PLAN.comfort[1]) && reachable(p))
      || after.find(p => p.y >= PLAN.comfort[0] && reachable(p))
      || after.find(p => reachable(p));
    kind = s ? 'ground' : null;
  }
  // nessun punto raggiungibile: verso il rimbalzo (o la fine della traiettoria), il più vicino possibile
  if (!s){ s = after[0] || path[path.length - 1]; kind = 'stretch'; }
  if (!s) return null;
  const p = stand(s);
  actor.targetPos.set(p.x, 0, p.z);
  // in corsa: poco margine tra quando si arriva e quando arriva la palla (o non ci si arriva)
  const run = Math.hypot(p.x - actor.pos.x, p.z - actor.pos.z);
  const stretch = kind === 'stretch' ? 1 : Math.max(clamp(1 - (s.t - need(s))/PLAN.slackFull, 0, 1), PLAN.runWeight*clamp((run - PLAN.runFrom)/PLAN.runSpan, 0, 1));
  engine[key] = { kind, side: p.side, contact: { x: +s.x.toFixed(3), y: +s.y.toFixed(3), z: +s.z.toFixed(3) }, t: +s.t.toFixed(3), at: finite(engine.elapsedTime), stretch: +stretch.toFixed(3) };
  return engine[key];
}

// Qualità che resta dopo la corsa sul piano in corso (1 se si è arrivati con calma)
export const stretchQuality = (engine, actor = engine.player) => 1 - PLAN.stretchCost*clamp(finite(planOf(engine, actor)?.stretch), 0, 1);

// Dopo il colpo di chi gioca: a rete o in fondo al campo (nella propria metà, anche per il Player 2 del 1v1)
export function recoverAfterShot(engine, actor, { landingX = 0, landingZ = -9, quality = 1, power = .6, contactZ = 11.5 } = {}){
  const A = PLAN.approach, depth = Math.abs(finite(landingZ, -9)), x = finite(landingX), half = Math.sign(actor.pos.z) || 1;
  const cz = Math.abs(finite(contactZ, 11.5)), atNet = cz <= PLAN.frontCourt + .2;
  const attack = !atNet && cz <= A.fromZ && finite(quality, 1) >= A.quality && ((depth >= A.depth && finite(power, .6) >= A.power) || Math.abs(x) >= A.angle);
  if (atNet || attack){ actor.targetPos.set(clamp(x*.3, -2.4, 2.4), 0, half*PLAN.netZ); return 'net'; }
  actor.targetPos.set(clamp(-x*.22, -1.6, 1.6), 0, half*PLAN.baseline);
  return 'baseline';
}

// Tempo (s) prima che la palla arrivi al punto d'impatto di chi colpisce (davanti al corpo); negativo se è già passata;
// null se la palla non arriva. Con il piano d'intercetto fresco si usa il suo istante (conta il rimbalzo).
export function timeToContact(engine, actor){
  const b = engine.ball; if (!b?.inPlay || !actor) return null;
  const toward = Math.sign(actor.pos.z) || 1, vz = finite(b.vel.z)*toward;
  if (vz <= .5) return null;
  const zc = actor.pos.z - toward*IMPACT.contactAhead, gap = (zc - b.pos.z)*toward;
  const plan = engine.natpfPlan, now = finite(engine.elapsedTime);
  if (plan && actor === engine.player && Number.isFinite(plan.t) && gap > 0){ const left = plan.at + plan.t - now; if (left > -.05 && left < 3) return left; }
  return gap/vz;
}

// Lo swing di chi gioca nello scambio: in attesa fino all'arrivo della palla (o subito, se è già passata da poco).
// Restituisce 'held' (in attesa), 'late' (colpito in ritardo adesso), 'whiff' (a vuoto) o null (nessuna palla in arrivo).
export function queueUserSwing(engine, e, actor){
  const W = impactWindow(engine.matchConfig?.difficulty), ttc = timeToContact(engine, actor);
  if (ttc == null) return null;
  const lat = eventLatency(e), lead = ttc + lat, now = finite(engine.elapsedTime);
  const lateSpan = lateSpanOf(engine.ball.vel.z, skillLevel(engine.matchConfig?.difficulty));
  const strength = finite(e.natpf?.peak, NaN) || finite(e.speed, 1)*600;
  if (ttc < 0){
    const b = engine.ball, toward = Math.sign(actor.pos.z) || 1, behind = (b.pos.z - (actor.pos.z - toward*IMPACT.contactAhead))*toward;
    const extra = W.lateExtra || IMPACT.lateExtra;
    if (lead >= -lateSpan*extra && behind <= IMPACT.lateBehind*extra + .2 && Math.abs(b.pos.x - actor.pos.x) <= IMPACT.reach && b.pos.y < 3.4){
      engine.pendingUserSwing = null;
      return engine._attemptPlayerRallyStrike({ ...e, natpfTau: lead, natpfLateSpan: lateSpan }, !1) ? 'late' : 'whiff';
    }
    return 'whiff';
  }
  const cand = { evt: { ...e, natpfTau: lead, natpfLateSpan: lateSpan }, lead, strength, actor, at: now, prep: !0, waitForSweetSpot: !0, natpfWindow: !0, expiresAt: now + ttc + lateSpan*(W.lateExtra || IMPACT.lateExtra) + .12 };
  const cur = engine.pendingUserSwing;
  const better = !cur || !cur.natpfWindow || strength >= cur.strength*1.15 || (Math.abs(lead) < Math.abs(cur.lead) && strength >= cur.strength*.6);
  if (better){ engine.pendingUserSwing = cand; holdSwingPrep(actor, e.side, ttc); }
  return 'held';
}

// A ogni passo, con la palla che arriva: lo swing in attesa si gioca quando la palla raggiunge il punto d'impatto.
// true se ha fatto qualcosa (colpo o colpo a vuoto).
export function resolvePending(engine, actor){
  const ps = engine.pendingUserSwing; if (!ps?.natpfWindow) return false;
  const b = engine.ball, W = impactWindow(engine.matchConfig?.difficulty), toward = Math.sign(actor.pos.z) || 1;
  const zc = actor.pos.z - toward*IMPACT.contactAhead, arrived = (b.pos.z - zc)*toward >= 0;
  if (arrived){
    engine.pendingUserSwing = null;
    // palla che va fuori: lo swing non la tocca (il punto è di chi gioca)
    if (planOf(engine, actor)?.kind === 'letgo') return true;
    if (ps.lead > W.early){ engine._natpfEarlyWhiff?.(ps); return true; }
    if (Math.abs(b.pos.x - actor.pos.x) > IMPACT.reach || b.pos.y >= 3.4){ engine._natpfEarlyWhiff?.({ ...ps, natpfWhy: 'portata' }); return true; }
    engine._attemptPlayerRallyStrike(ps.evt, !1);
    return true;
  }
  if (finite(engine.elapsedTime) > ps.expiresAt){ engine.pendingUserSwing = null; engine._natpfEarlyWhiff?.(ps); return true; }
  return false;
}
