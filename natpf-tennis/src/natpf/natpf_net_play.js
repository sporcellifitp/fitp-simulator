// B31 (tappa 3, punto 1 del rapporto docs/b16/rapporto-gameplay.md: miglioramento 6, scheda M6 e punto 22): più gioco a
// rete per tutti e due. Misure e scelte: docs/b31/gioco-a-rete.md; banco: scripts/audit/rete.mjs (npm run audit:rete).
// Il riconoscimento dei gesti non cambia: qui ci sono solo movimento, esiti e scelte della CPU.
//   • Chi gioca (e il Player 2 nello stesso schermo, stessa regola) sale a rete dopo un attacco riuscito: un colpo
//     profondo e pulito giocato da dentro il campo (palla corta raggiunta, o un tagliato da poco dietro la riga del
//     servizio in su), e resta a rete dopo una volée o una schiacciata riuscite. Prima tornava sempre in fondo.
//   • A rete ci si muove meno in fretta (passo laterale corto e reazione un poco più lunga): la palla che passa lontana
//     (passante) o sopra la testa (pallonetto) può battere chi è salito male. Prima il movimento automatico arrivava su
//     tutto anche a rete, e andare a rete pagava sempre.
//   • La CPU sale a rete quando ha un colpo d'attacco (palla debole di chi gioca, palla corta raggiunta), gioca la volée
//     e schiaccia le palle alte (anche il pallonetto corto quando è in fondo); fa qualche rara palla corta, con un tetto
//     per game, e la scritta la dichiara.
//   • Il tagliato basso mette in difficoltà chi lo riceve da lontano (CPU in fondo); la palla rimbalza più bassa.
import { skillLevel, COURT } from './natpf_skill.js';
import { predictBall } from './natpf_impact.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const NET_PLAY = Object.freeze({
  // Chi gioca: attacco riuscito che porta a rete. z: colpito entro tanto dalla rete (dentro il campo, non dalla riga di
  // fondo); sliceZ: il tagliato porta a rete anche da un poco più indietro (palla bassa, buona per avvicinarsi); depth:
  // cade almeno a tanto dalla rete (un approccio corto lascia il passante facile); q: qualità minima del colpo; stay:
  // da entro tanto dalla rete (volée, schiacciata, palla corta presa vicino) un colpo riuscito tiene a rete; netZ: dove ci
  // si ferma a rete (m dalla rete).
  // drive: il colpo forte, profondo e pulito da poco dentro la riga di fondo (entro drive.z) porta a rete anche lui
  approach: Object.freeze({ z: 9.2, depth: 8, q: .6, y: .85, stay: 6.4, netZ: 5.2,
    slice: Object.freeze({ z: 11.2, depth: 7.5, q: .7 }), drive: Object.freeze({ z: 10.8, depth: 9.4, q: .85, power: .6 }) }),
  // A rete (entro zone m dalla rete): reazione in più (s) e velocità del passo (× velocità piena) per arrivare sulla palla
  netMove: Object.freeze({ zone: 7, react: .12, speed: .55 }),
  // La CPU (Casual, Pro, Evento; Bambini no). approach: probabilità di salire a rete dopo il suo colpo d'attacco (palla
  // debole di chi gioca, cpuReturnPlan 'attack') o dopo una palla presa da dentro il campo (entro inside m dalla rete);
  // netZ: dove si ferma; volleyY: sopra questa altezza la palla al volo si schiaccia (fino a smashY; più alta la scavalca
  // e la CPU torna indietro); lobSmash: il pallonetto di chi gioca che rimbalzerebbe entro tanto dalla rete la CPU lo
  // schiaccia al volo se ci arriva (react: la sua reazione, s)
  cpu: Object.freeze({
    approach: Object.freeze({ casual: .25, pro: .4, evento: [.25, .4], bambini: 0 }), inside: 7, attackZ: 9, netZ: 5.6,
    // open: sale solo se la sua palla cade ad almeno tanto (m, di lato) da chi gioca: un attacco che lo fa correre
    open: 3.5,
    // reach: portata laterale a rete × reach (la volée si gioca in allungo); al massimo una salita a rete per punto
    reach: 1.35,
    // volleyErr: errore della volée e della schiacciata della CPU (oltre a quelli di cpuReturnPlan), più paceErr con la
    // palla veloce (da paceFrom m/s, pieno a paceTo): metà in rete, il resto lunga o larga
    volleyErr: Object.freeze({ casual: .04, pro: .02, evento: [.04, .02], bambini: .04 }), paceErr: .03, paceFrom: 18, paceTo: 30,
    volleyY: 2.05, smashY: 3.05, lobSmash: 8.6, react: .25,
    // volée: verso il campo libero, corta e angolata (angle: quota delle volée così, x angleX, profondità angleZ) o
    // profonda (volleyZ), volo (s) per livello; schiacciata: smashZ, volo smashFlight
    volleyZ: Object.freeze([6.4, 9.6]), volleyFlight: Object.freeze({ casual: .95, pro: .72 }), angleFlight: Object.freeze({ casual: .8, pro: .55 }),
    angle: Object.freeze({ casual: .5, pro: .7 }), angleX: Object.freeze([3.2, 3.85]), angleZ: Object.freeze([3.6, 5.8]),
    smashZ: Object.freeze([7.2, 10.4]), smashFlight: Object.freeze({ casual: .62, pro: .5 }),
    // palla corta della CPU: rara e dichiarata (scritta «Palla corta della CPU»). Solo con chi gioca lontano (oltre farZ
    // dalla rete) e la CPU dentro il campo (entro fromZ), mai sul servizio né sulla risposta, al massimo perGame per game;
    // chance: probabilità in quella situazione; netErr: va in rete
    drop: Object.freeze({ chance: Object.freeze({ casual: .12, pro: .16, evento: [.12, .16], bambini: 0 }), farZ: 10.8, fromZ: 10.6, perGame: 1, netErr: .15, z: Object.freeze([2.3, 3.6]) }),
  }),
});
// Valore per livello di una tabella { casual, pro, evento: [da, a], bambini }: Evento va da casual a pro con cpuPro (k)
export function byLevel(T, difficulty){
  const key = String(difficulty || 'casual').toLowerCase(), v = T[key];
  if (Array.isArray(v)) return v[0] + (v[1] - v[0])*clamp(finite(skillLevel(key).cpuPro));
  return Number.isFinite(v) ? v : finite(T.casual);
}
const levelKey = d => (['pro', 'leggenda'].includes(String(d)) || (String(d) === 'evento' && finite(skillLevel('evento').cpuPro) >= .5) ? 'pro' : 'casual');

// L'esito del colpo (natpf_stroke_outcome.strokeOutcome) e da dove è partito portano chi colpisce a rete?
//   out: { shot, depth, q, failed, weak, netFault } · contactZ: distanza dalla rete al colpo (m, segno qualsiasi)
//   volley: palla presa al volo (volée o schiacciata)
//   power: forza del gesto (intenzione, 0…1) · contactY: altezza della palla all'impatto (m)
export function approachOf(out, contactZ, { volley = false, power = .5, contactY = 1 } = {}){
  if (!out || out.failed || out.weak || out.netFault) return false;
  const A = NET_PLAY.approach, z = Math.abs(finite(contactZ, 11.5)), shot = String(out.shot || '').toUpperCase();
  if (shot === 'LOB' || shot === 'DROP') return false;
  // già a rete: la volée o la schiacciata riuscita tiene lì (la palla corta raggiunta no: vale la regola dell'attacco)
  if (volley && z <= A.stay) return true;
  if (shot === 'SMASH') return false;
  const d = finite(out.depth), q = finite(out.q, 1);
  // palla corta raggiunta alta (da attaccare, non scavata da terra) e giocata in profondità
  if (z <= A.z && d >= A.depth && q >= A.q && finite(contactY, 1) >= A.y) return true;
  if (shot === 'SLICE') return z <= A.slice.z && d >= A.slice.depth && q >= A.slice.q;   // tagliato d'approccio
  return z <= A.drive.z && d >= A.drive.depth && q >= A.drive.q && finite(power) >= A.drive.power;
}

// Movimento a rete (natpf_impact.planPlayerIntercept): reazione in più e passo più corto entro netMove.zone dalla rete.
// { react, speed } da sommare alla reazione e da moltiplicare alla velocità; { 0, 1 } lontano dalla rete
export function netMoveOf(actorZ){
  const M = NET_PLAY.netMove;
  return Math.abs(finite(actorZ, 11.5)) < M.zone ? { react: M.react, speed: M.speed } : { react: 0, speed: 1 };
}

/* ---------- la CPU a rete ---------- */
// Stato: engine.natpfCpuNet = { at } quando la CPU è salita a rete (fino a quando torna in fondo); engine.natpfCpuOver =
// { kind: 'volley' | 'smash', at } per la palla in arrivo (piano del colpo al volo); engine.natpfCpuShot = { kind } del
// suo ultimo colpo (banco e scritte). La sfida tra due computer e lo stesso schermo non passano di qui (nessuna CPU).
export const cpuActive = e => !!e && !e.isMultiplayer && !e.isDoubles && !(e.autoPlayMode && !e.userHasInteracted);
// Dopo il colpo di chi gioca (_natpfPlanOpponent): la CPU a rete resta sulla linea e prende la palla al volo (volée, o
// schiacciata se passa alta); se la palla la scavalca torna indietro (piano di prima, dietro il rimbalzo) e lascia la
// rete. Dal fondo schiaccia al volo il pallonetto corto che può raggiungere. Restituisce il piano o null (piano di prima).
export function cpuOverheadPlan(e, cpu){
  e.natpfCpuOver = null;
  if (!cpuActive(e) || cpu !== e.opponent || !e.ball?.inPlay) return null;
  const K = NET_PLAY.cpu, path = predictBall(e.ball), before = path.filter(p => p.bounces === 0 && p.z < 0);
  if (!before.length) return null;
  const now = finite(e.elapsedTime), cz = Math.abs(cpu.pos.z), speed = Math.max(3, finite(cpu.maxSpeed, 5));
  const reach = p => K.react + Math.hypot(p.x - cpu.pos.x, Math.abs(p.z) - cz)/speed <= p.t;
  if (e.natpfCpuNet && cz < NET_PLAY.netMove.zone + .5){
    // dove la palla passa la linea della CPU (prima del rimbalzo)
    const p = before.find(q => Math.abs(q.z) >= cz);
    if (!p){ return null; }                                  // rimbalza prima: la prende dopo il rimbalzo, da dove è
    if (p.y > K.smashY){ e.natpfCpuNet = null; return null; }   // pallonetto che la scavalca: torna indietro
    const kind = p.y > K.volleyY ? 'smash' : 'volley';
    cpu.targetPos.set(Math.max(-COURT.SINGLES_X - .6, Math.min(COURT.SINGLES_X + .6, p.x + (p.x > cpu.pos.x ? -.45 : .45))), 0, -cz);
    return (e.natpfCpuOver = { kind, at: now, y: +p.y.toFixed(2) });
  }
  // dal fondo: il pallonetto corto (rimbalzo entro lobSmash) si schiaccia al volo se ci arriva
  const bounce = path.find(q => q.bounces === 1);
  if (String(e.ball.shotType).toUpperCase() !== 'LOB' || !bounce || Math.abs(bounce.z) > K.lobSmash) return null;
  const p = before.find(q => q.vy < 0 && q.y <= K.smashY && q.y >= K.volleyY && Math.abs(q.z) >= 2.6 && reach(q));
  if (!p) return null;
  cpu.targetPos.set(p.x + (p.x > cpu.pos.x ? -.45 : .45), 0, p.z - .3);
  return (e.natpfCpuOver = { kind: 'smash', at: now, y: +p.y.toFixed(2) });
}
// Altezza massima a cui la CPU colpisce la palla in arrivo: alta solo con la schiacciata pianificata
export const cpuReachY = (e, base) => (e?.natpfCpuOver?.kind === 'smash' ? NET_PLAY.cpu.smashY + .05 : base);
// Colpo al volo della CPU (volée o schiacciata) al posto della risposta normale. plan: cpuReturnPlan (gli errori della
// CPU restano: rete, largo, lungo). Restituisce null (risposta normale) o { kind, x, z, shot, flight, fromY }
export function cpuNetShot(e, cpu, plan, rng = Math.random){
  if (!cpuActive(e) || cpu !== e.opponent || !plan || ['net', 'wide', 'long'].includes(plan.kind)) return null;
  const b = e.ball, K = NET_PLAY.cpu, cz = Math.abs(cpu.pos.z), high = finite(b.pos.y) > K.volleyY;
  if (skillLevel(e.matchConfig?.difficulty).cpuLegend && !high) return null;   // Leggenda: solo la schiacciata (il resto lo sceglie natpf_legend)
  const air = finite(b.bounceCountOnCurrentSide) === 0 && (cz < NET_PLAY.netMove.zone + .5 || high);
  if (!air && !high) return null;
  const lk = levelKey(e.matchConfig?.difficulty), open = finite(e.player?.pos?.x) >= 0 ? -1 : 1;
  const side = v => Math.max(-COURT.SINGLES_X + .5, Math.min(COURT.SINGLES_X - .5, v)), R = (a, z) => a + rng()*(z - a);
  // errore della volée o della schiacciata: palla veloce e livello (la Leggenda sbaglia con le sue regole)
  const legend = !!skillLevel(e.matchConfig?.difficulty).cpuLegend, speed = finite(b.vel?.length?.(), 20);
  const pErr = legend ? 0 : byLevel(K.volleyErr, e.matchConfig?.difficulty) + K.paceErr*clamp((speed - K.paceFrom)/(K.paceTo - K.paceFrom));
  const err = rng() < pErr ? (rng() < .5 ? 'net' : rng() < .5 ? 'long' : 'wide') : null;
  const out = high ? { kind: 'smash', x: side(open*R(1.4, 3.2)), z: R(K.smashZ[0], K.smashZ[1]), shot: 'FLAT', power: .95, flight: K.smashFlight[lk], fromY: Math.min(2.9, finite(b.pos.y)) }
    : rng() < K.angle[lk] ? { kind: 'volley', x: Math.sign(open)*R(K.angleX[0], K.angleX[1]), z: R(K.angleZ[0], K.angleZ[1]), shot: 'FLAT', power: .75, flight: K.angleFlight[lk], fromY: finite(b.pos.y) }
    : { kind: 'volley', x: side(open*R(2.2, 3.4)), z: R(K.volleyZ[0], K.volleyZ[1]), shot: 'FLAT', power: .9, flight: K.volleyFlight[lk], fromY: finite(b.pos.y) };
  if (err === 'net') Object.assign(out, { err, z: 3.2 + rng()*1.6 });
  else if (err === 'long') Object.assign(out, { err, z: COURT.BASELINE_Z + .6 + rng()*1.2 });
  else if (err === 'wide') Object.assign(out, { err, x: (Math.sign(out.x) || 1)*(COURT.SINGLES_X + .6 + rng()*.8) });
  return out;
}
// Dopo il colpo della CPU: a rete o in fondo. plan: cpuReturnPlan; net: cpuNetShot (null se è stata una risposta normale).
// true: va a rete (targetPos già impostato). Resta a rete dopo una volée o una schiacciata; sale dopo il suo attacco o da
// una palla presa da dentro il campo, con la probabilità del livello.
export function cpuRecover(e, cpu, { plan = null, net = null, landingX = 0, rng = Math.random } = {}){
  if (!cpuActive(e) || cpu !== e.opponent || !plan || ['net', 'wide', 'long'].includes(plan.kind) || plan.kind === 'weak' || skillLevel(e.matchConfig?.difficulty).cpuLegend){ e.natpfCpuNet = null; return false; }
  const K = NET_PLAY.cpu, cz = Math.abs(cpu.pos.z), chance = byLevel(K.approach, e.matchConfig?.difficulty);
  const open = Math.abs(finite(landingX) - finite(e.player?.pos?.x)) >= K.open;
  const go = (!!net && !!e.natpfCpuNet) || (!e.natpfCpuNetTried && chance > 0 && open && ((plan.kind === 'attack' && cz <= K.attackZ) || cz <= K.inside) && rng() < chance);
  if (!go){ e.natpfCpuNet = null; return false; }
  e.natpfCpuNet = e.natpfCpuNet || { at: finite(e.elapsedTime) }; e.natpfCpuNetTried = true;
  cpu.targetPos.set(Math.max(-2, Math.min(2, finite(landingX)*.3)), 0, -Math.min(Math.max(cz, 2.4), K.netZ));
  return true;
}
// Palla corta della CPU: rara (tetto per game) e dichiarata. Restituisce null o { x, z, net, flight }
export function cpuDropShot(e, cpu, plan, rng = Math.random){
  if (!cpuActive(e) || cpu !== e.opponent || !plan || plan.kind !== 'ok' || skillLevel(e.matchConfig?.difficulty).cpuLegend) return null;
  const D = NET_PLAY.cpu.drop, b = e.ball, S = e.score || {};
  const chance = byLevel(D.chance, e.matchConfig?.difficulty);
  if (!(chance > 0) || finite(b.rallyStrokeCount) < 3 || Math.abs(finite(e.player?.pos?.z)) < D.farZ || Math.abs(cpu.pos.z) > D.fromZ || finite(b.bounceCountOnCurrentSide) === 0) return null;
  const game = `${finite(S.playerGames)}-${finite(S.opponentGames)}`, st = e.natpfCpuDrops || (e.natpfCpuDrops = { game, n: 0 });
  if (st.game !== game){ st.game = game; st.n = 0; }
  if (st.n >= D.perGame || rng() >= chance) return null;
  st.n++;
  const z = D.z[0] + rng()*(D.z[1] - D.z[0]), net = rng() < D.netErr;
  return { x: (rng() - .5)*3.6, z: net ? 3.2 + rng()*1.2 : z, net, flight: Math.max(1.32, (Math.abs(b.pos.z) + z)/10) };
}
// Portata laterale della CPU (× cpuReach): più lunga a rete
export const cpuNetReach = e => (e?.natpfCpuNet && e.opponent && Math.abs(e.opponent.pos.z) < NET_PLAY.netMove.zone + .5 ? NET_PLAY.cpu.reach : 1);
// B31 (punto 22): la schiacciata riuscita di chi gioca si prende solo vicino al corpo (portata al massimo SMASH_REACH m,
// e niente affondo della Leggenda): prima la Leggenda ne rimandava in gioco più di una su due, anche quelle colpite a rete
export const SMASH_REACH = .9;
export const smashIncoming = e => !!e && !e.isMultiplayer && e.ball?.lastHitter === 'player' && e.natpfSkill?.lastShot?.shot === 'SMASH' && !e.natpfLastRacket?.out?.failed && !e.natpfLastRacket?.out?.weak;
// portata della CPU (m) con la schiacciata in arrivo: al massimo SMASH_REACH; reach senza schiacciata
export const smashReach = (e, reach) => (smashIncoming(e) ? Math.min(reach, SMASH_REACH) : reach);
// … e appena rimbalzata, in salita e sotto SMASH_LOW m, non si prende (la schiacciata rimbalza alta e veloce: prima la
// CPU la rimandava presa a 0,1–0,5 m da terra subito dopo il rimbalzo)
export const SMASH_LOW = .9;
export const smashTooLow = e => smashIncoming(e) && finite(e.ball?.bounceCountOnCurrentSide) > 0 && finite(e.ball?.vel?.y) > 0 && finite(e.ball?.pos?.y) < SMASH_LOW;
