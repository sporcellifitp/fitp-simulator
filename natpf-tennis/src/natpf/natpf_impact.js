// Telefono come racchetta: dove e quando chi gioca colpisce la palla (docs/NATPF_RACCHETTA_VIRTUALE.md, P4, P6, P11).
//
//   • Movimento automatico: quando la CPU (o, nel 1v1, l'altro giocatore) colpisce, la traiettoria si prevede con la
//     stessa fisica del motore e chi gioca va dove prenderla. Dopo il rimbalzo all'altezza comoda; al volo se è avanti (volée) o se la palla è alta e
//     raggiungibile (schiacciata). Prima aspettava sempre 2,15 m dietro il rimbalzo: niente volée né schiacciate al
//     volo, e sulle palle corte e lente restava lontano (swing fatti un secondo prima).
//   • Finestra d'impatto: la palla si colpisce solo quando arriva al punto d'impatto, mai prima. Uno swing arrivato in
//     anticipo resta in attesa con il suo tempo vero; uno più forte arrivato dopo lo sostituisce (il primo era la
//     preparazione). All'arrivo della palla: dentro la finestra si colpisce, prima della finestra è un colpo a vuoto.
//     Dopo il punto d'impatto si colpisce ancora per poco (in ritardo). Un gesto debole rispetto ai propri colpi (WEAK)
//     in anticipo non colpisce da solo: si aspetta per poco il colpo vero, che può arrivare anche dopo il punto d'impatto.
//     Con un gesto morbido in attesa (SOFT) o un colpo a vuoto, all'arrivo della palla si aspettano ancora 65 ms: il colpo
//     vero arriva al computer 30–45 ms dopo il suo picco e prende il posto di quello in attesa.
//   • Dopo il colpo si torna verso il fondo se si fa in tempo prima del colpo dell'avversario; a rete si resta solo
//     quando una palla corta ha portato lì e non c'è il tempo di tornare. Avanti si va per prendere una palla che lo
//     chiede (corta, o al volo quando aspettare il rimbalzo costerebbe troppa strada). Prima chi colpiva da dentro il
//     campo andava e restava a rete (56–89% dei colpi nelle partite simulate), anche senza che la palla lo chiedesse.
import { bounceSpin, eventLatency, holdSwingPrep, COURT, moveFactor } from './natpf_skill.js';
import { IMPACT, impactWindow, lateSpanOf, directionSpan, slowFactor } from './natpf_stroke_outcome.js';
import { skillLevel } from './natpf_skill.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

// stessa fisica della palla del motore (L in game_engine.js; il test confronta le due traiettorie)
export const PHYS = Object.freeze({ GRAVITY: 9.15, AIR_DRAG: .012, BOUNCE: .77, FRICTION: .86, DT: 1/120 });

export const PLAN = Object.freeze({
  side: .72,                 // m: palla di lato al corpo all'impatto (dritto o rovescio)
  comfort: [.5, 1.45],       // m: altezza comoda dopo il rimbalzo
  // risposta al servizio: fino a 1,72 m (sotto la zona della schiacciata, natpf_stroke_outcome.smashAt): il servizio della
  // CPU rimbalza a 3,5–4,8 m dalla rete e a fondo campo è a 1,8–1,95 m; con l'altezza comoda dello scambio si andava a
  // prenderlo a metà campo
  returnTop: 1.72,
  volley: [.5, 1.95], volleyMinZ: 2.2,   // volée: altezza e distanza minima dalla rete
  // al volo solo se conviene: aspettare il rimbalzo costerebbe almeno volleySave secondi di corsa in più (chi è vicino
  // alla rete dovrebbe tornare indietro di metri) o il rimbalzo non si raggiunge. Prima bastava essere a meno di 8 m
  // dalla rete, e dopo una volée si restava a rete
  volleySave: .35,
  // schiacciata al volo sulle palle che salgono oltre lobApex (29/10: era 3,3 m; il pallonetto della CPU a Casual arriva
  // a 3,2 m e si prendeva dopo il rimbalzo: il gesto dall'alto diventava un piatto)
  smash: [1.9, 2.95], lobApex: 3.0, smashMinZ: 2.6,
  // a rete (entro netSmashZ dalla rete) anche senza pallonetto: ogni palla raggiungibile che passa sopra netSmashY.
  // Sessione del 28/10: a rete una palla a 2,7 m si giocava di volée a 1,67 m (sotto l'altezza della schiacciata) e la
  // schiacciata non partiva mai
  netSmashZ: 7, netSmashY: 2.05,
  react: .12,                // s: prima di muoversi
  slackFull: .35,            // s di margine con cui si arriva sul punto d'impatto senza fretta; meno è un colpo in corsa
  runFrom: 2, runSpan: 4, runWeight: .7,   // m: una corsa lunga (oltre runFrom) è un colpo in corsa anche se si arriva
  stretchCost: .4,           // qualità che si perde arrivando al limite (un buon angolo dell'avversario costa)
  // maxBack: fin dove si arretra per colpire; apexBack: fin dove si arretra per prendere la palla al colmo (contatto al
  // colmo: apexContactOn). apexVy: velocità verticale massima perché il punto valga «al colmo» (in salita lenta o in
  // discesa)
  baseline: 11.74, maxBack: 13.4, apexBack: 13.8, serviceLine: 6.4, apexVy: .8,
  // palla profonda e veloce che a maxBack (o apexBack) è ancora sotto l'altezza comoda: si arretra fino a deepBack e la
  // si prende nel punto più alto raggiungibile. Diagnostica del 29/10 (stesso schermo): tre palle forti del Player 2 a
  // 10,5–11,6 m, piano sul rimbalzo (palla a 7 cm da terra) e una finita in rete. deepBack resta prima della fine della
  // traiettoria prevista (predictBall, stopZ)
  deepBack: 14.3,
  netZ: 4.6,                 // m: posizione a rete (posizione d'attesa del doppio)
  letGo: .15,                // m: la palla che rimbalzerebbe fuori di almeno tanto si lascia andare (non si gioca al volo)
  // recupero dopo il colpo: tempo fino al colpo dell'avversario (volo del proprio colpo più oppTake, il tempo che
  // l'avversario impiega a prendere la palla dopo il rimbalzo); all'indietro si va più piano che avanti (recoverEff
  // della corsa piena: partenza, frenata, passi all'indietro). safeZ: profondità da cui si gioca comodi dopo il rimbalzo
  oppTake: .45, recoverEff: .55, safeZ: 10,
});

// Traiettoria della palla da adesso: [{ t, x, y, z, vy, bounces }] (bounces: rimbalzi da adesso in poi). Si ferma
// quando la palla è oltre stopZ dalla rete nel verso in cui va (oltre il fondo di chi la deve prendere), non dove parte:
// diagnostica del 29/10 (1v1), il Player 2 colpiva in ritardo da 15,4 m, la traiettoria finiva al primo passo e chi
// gioca correva a rete (piano «stretch» verso la palla dall'altra parte) e perdeva il punto
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
    if ((vz >= 0 ? z : -z) > stopZ || bounces > 1) break;
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
// Il piano vale solo per la palla per cui è stato fatto: la palla di adesso è dove la traiettoria prevista dice (entro
// 0,6 m). Una palla rimessa in gioco senza piano (lanciapalle, prove) o un piano vecchio non decidono tempo, palla fuori
// e corsa (prima un piano di meno di 3 s prima valeva per qualunque palla).
export function planMatches(plan, b, now){
  const tr = plan?.track; if (!tr?.length || !b?.pos) return false;
  const dt = finite(now) - finite(plan.at);
  if (dt < -.02 || dt > tr[tr.length - 1][0] + .1) return false;
  let k = 0; while (k < tr.length - 1 && tr[k + 1][0] <= dt) k++;
  const a = tr[k], c = tr[Math.min(tr.length - 1, k + 1)], u = c[0] > a[0] ? clamp((dt - a[0])/(c[0] - a[0]), 0, 1) : 0;
  return Math.hypot(a[1] + (c[1] - a[1])*u - b.pos.x, a[2] + (c[2] - a[2])*u - b.pos.z) <= .6;
}
// piano di questo attore valido per la palla di adesso, o null
export const livePlan = (engine, actor = engine.player) => { const P = planOf(engine, actor); return P && planMatches(P, engine.ball, engine.elapsedTime) ? P : null; };
const trackOf = path => path.filter((_, i) => i % 4 === 3 || i === path.length - 1).map(s => [+s.t.toFixed(3), +s.x.toFixed(2), +s.z.toFixed(2)]);

// Piano d'intercetto per chi gioca: nella propria metà campo (z positive per chi gioca qui, negative per il Player 2 del
// 1v1: tutto si calcola nel riferimento di chi colpisce). Imposta targetPos e il piano (planOf).
// Contatto al colmo dopo il rimbalzo (richiesta del 23/10, C1–C2: più tempo per il colpo). Nel banco (scripts/audit/
// rhythm.mjs) a Casual il tempo dal colpo della CPU all'impatto passa da 1,17 a circa 1,45 s; a Pro e Leggenda le palle
// della CPU sono più veloci e il colmo è quasi sempre oltre la posizione più arretrata, quindi cambia poco, e a Leggenda
// arretrare costa (le palle corte della CPU puniscono la posizione: +8 punti di game alla CPU contro il profilo
// «preciso»). Per questo: a Casual, Pro e 1v1 sì, a Leggenda no; ?ritmo=colmo lo accende a tutti i livelli e
// ?ritmo=prima lo spegne, per confrontare sullo stesso computer con la prova guidata
export function apexContactOn(engine){
  let q = null;
  try { q = engine?.params?.get?.('ritmo') ?? new URLSearchParams(globalThis.location?.search || '').get('ritmo'); } catch {}
  if (q === 'colmo') return true;
  if (q === 'prima') return false;
  return !skillLevel(engine?.matchConfig?.difficulty).cpuLegend;
}

// groundOnly: solo i punti dopo il rimbalzo (piano rifatto dopo una schiacciata o una volée mancata, missedPlan)
export function planPlayerIntercept(engine, actor, { groundOnly = false } = {}){
  const b = engine.ball; if (!b || !actor) return null;
  // velocità di corsa con la stanchezza e la palla super potente in arrivo (natpf_skill.moveFactor), come nel movimento
  const path = predictBall(b), speed = Math.max(4, finite(actor.maxSpeed, 9)*moveFactor(engine, actor)), key = planKey(engine, actor), apexOn = apexContactOn(engine), back = apexOn ? PLAN.apexBack : PLAN.maxBack;
  const half = Math.sign(actor.pos.z) || 1, Z = z => z*half;
  // lato del dritto in x: la destra di chi guarda verso −z (qui) è +x, di chi guarda verso +z (Player 2) è −x
  const fh = (handOf(engine, actor) === 'left' ? -1 : 1)*half;
  // dove stare per prendere la palla nel punto s: di lato (dal lato in cui arriva), poco dietro il punto d'impatto
  const stand = s => { const dx = s.x - actor.pos.x, side = Math.abs(dx) > .3 ? Math.sign(dx) : fh; return { side, x: clamp(s.x - side*PLAN.side, -COURT.SINGLES_X - 1.4, COURT.SINGLES_X + 1.4), z: half*clamp(Z(s.z) + IMPACT.contactAhead, 1.2, Math.max(back, Z(s.z) > back ? PLAN.deepBack + IMPACT.contactAhead : back)) }; };
  const need = s => { const p = stand(s); return PLAN.react + Math.hypot(p.x - actor.pos.x, p.z - actor.pos.z)/speed; };
  const reachable = s => need(s) <= s.t;
  const before = path.filter(s => s.bounces === 0 && Z(s.z) > 0), after = path.filter(s => s.bounces === 1 && Z(s.z) <= back);
  const apex = before.reduce((m, s) => Math.max(m, s.y), 0);
  // palla che rimbalzerebbe fuori: si lascia andare (come fa chi gioca davvero), anche a rete
  const bounce = path.find(s => s.bounces === 1);
  if (bounce && Z(bounce.z) > 0 && (Math.abs(bounce.x) > COURT.OUT_X + PLAN.letGo || Z(bounce.z) > COURT.OUT_Z + PLAN.letGo)){
    engine[key] = { kind: 'letgo', side: 0, contact: { x: +bounce.x.toFixed(3), y: 0, z: +bounce.z.toFixed(3) }, t: +bounce.t.toFixed(3), at: finite(engine.elapsedTime), stretch: 0, track: trackOf(path) };
    return engine[key];
  }
  let kind = null, s = null;
  // schiacciata al volo: palla alta che scende nella zona della schiacciata (un pallonetto; a rete ogni palla alta)
  const low = apex >= PLAN.lobApex ? PLAN.smash[0] : Z(actor.pos.z) <= PLAN.netSmashZ ? PLAN.netSmashY : Infinity;
  if (apex >= low && !groundOnly) s = before.find(p => p.vy < 0 && p.y >= low && p.y <= PLAN.smash[1] && Z(p.z) >= PLAN.smashMinZ && reachable(p)), kind = s ? 'smash' : null;
  if (!s){
    // dopo il rimbalzo: il punto comodo raggiungibile più vicino al colmo (a parità d'altezza quello in discesa), cioè il
    // più alto entro l'altezza comoda e entro maxBack (richiesta del 23/10, C1–C2: più tempo per il colpo e la palla più
    // alta). Prima il primo punto comodo: con il colmo oltre la posizione più arretrata era in salita, a 0,5 m, 0,12 s
    // dopo il rimbalzo
    // palla corta (rimbalzo prima della riga del servizio): si prende presto, avanzando, come prima (approccio; poi a rete
    // se il tempo non basta per tornare, e lì volée e schiacciate)
    const serve = finite(b.rallyStrokeCount) <= 1, top1 = serve ? PLAN.returnTop : PLAN.comfort[1];
    const comfy = after.filter(p => p.y >= PLAN.comfort[0] && p.y <= top1 && reachable(p));
    // nessun punto all'altezza comoda entro maxBack: il primo oltre (fino a deepBack) o, se nemmeno lì, il più alto
    // raggiungibile (prima: il primo raggiungibile, cioè il rimbalzo stesso)
    const deepPts = path.filter(p => p.bounces === 1 && Z(p.z) <= PLAN.deepBack && p.y <= top1 && reachable(p));
    const early = comfy[0] || after.find(p => p.y >= PLAN.comfort[0] && reachable(p)) || deepPts.find(p => p.y >= PLAN.comfort[0])
      || deepPts.reduce((b, p) => (!b || p.y > b.y + .01 ? p : b), null) || after.find(p => reachable(p));
    // anche la palla corta (rimbalzo prima della riga del servizio) si prende al colmo quando ci si arriva: più alta e con
    // più tempo per arrivare. 29/10 pomeriggio: presa sempre in salita a 0,5 m, vicino alla rete doveva risalire sopra il
    // nastro (niente chiusure né colpi potenti) e si arrivava di corsa (qualità .72)
    const deep = apexOn;
    // solo se il colmo (o la discesa) è davvero raggiungibile entro maxBack: altrimenti si arretrerebbe fino al limite per
    // colpire ancora in salita (pochi centesimi di secondo in più, a prezzo della posizione: a Leggenda le palle corte
    // della CPU lo punivano)
    const top = deep && comfy.length ? comfy.reduce((b, p) => (p.y > b.y + .02 || (p.y >= b.y - .02 && p.vy <= 0 && b.vy > 0) ? p : b)) : null;
    // risposta al servizio: il servizio rimbalza sempre nel riquadro, ma è veloce e arriva comodo fino in fondo: non è una
    // palla corta. Si prende dove arriva comodo con meno strada (a parità, più tardi: più tempo), cioè da dove si è,
    // avanzando solo quanto serve. Prima valeva la regola della palla corta (il primo punto comodo dopo il rimbalzo): chi
    // rispondeva correva in avanti di 5–6 m a ogni servizio, a tutti i livelli (banco: dalla riga di fondo a 5,5–6,5 m
    // dalla rete nel 100% delle risposte)
    const near = serve && comfy.length ? comfy.reduce((a, p) => (need(p) < need(a) - .02 || (need(p) <= need(a) + .02 && p.t > a.t) ? p : a)) : null;
    const ground = near || (top && top.vy <= PLAN.apexVy ? top : null) || early;
    // al volo: solo se aspettare il rimbalzo costa molto più strada (si è vicini alla rete) o il rimbalzo non si
    // raggiunge; nel punto prima del rimbalzo che costa meno corsa. Il confronto è con il primo punto comodo dopo il
    // rimbalzo (si può sempre prendere la palla presto): con quello vicino al colmo, più indietro, la volée sembrava
    // conveniente anche da metà campo
    const volley = before.filter(p => Z(p.z) >= PLAN.volleyMinZ && p.y >= PLAN.volley[0] && p.y <= PLAN.volley[1] && reachable(p)).reduce((b, p) => (!b || need(p) < need(b) ? p : b), null);
    const wait = serve ? ground : early;   // sulla risposta al servizio il confronto è con il punto scelto, da fondo campo
    if (volley && !groundOnly && (!wait || need(wait) - need(volley) >= PLAN.volleySave)) s = volley, kind = 'volley';
    else if (ground) s = ground, kind = 'ground';
  }
  // nessun punto raggiungibile: verso il rimbalzo (o la fine della traiettoria), il più vicino possibile; mai verso un
  // punto fuori dalla propria metà campo (la posizione verrebbe portata a rete: corsa a vuoto). Una palla che non arriva
  // nella propria metà non sposta chi gioca
  if (!s){ s = after[0] || [...path].reverse().find(p => Z(p.z) > 0); kind = 'stretch'; }
  if (!s){ engine[key] = null; return null; }
  const p = stand(s);
  actor.targetPos.set(p.x, 0, p.z);
  // in corsa: poco margine tra quando si arriva e quando arriva la palla (o non ci si arriva)
  const run = Math.hypot(p.x - actor.pos.x, p.z - actor.pos.z);
  const stretch = kind === 'stretch' ? 1 : Math.max(clamp(1 - (s.t - need(s))/PLAN.slackFull, 0, 1), PLAN.runWeight*clamp((run - PLAN.runFrom)/PLAN.runSpan, 0, 1));
  engine[key] = { kind, side: p.side, contact: { x: +s.x.toFixed(3), y: +s.y.toFixed(3), z: +s.z.toFixed(3) }, t: +s.t.toFixed(3), at: finite(engine.elapsedTime), stretch: +stretch.toFixed(3), track: trackOf(path), ...(groundOnly ? { replan: true } : {}) };
  return engine[key];
}

// Schiacciata o volée prevista e non colpita (diagnostiche del 30/10, C7): il piano si faceva solo al colpo
// dell'avversario e nessuno lo rifaceva quando il punto d'impatto era passato; chi gioca restava sotto il punto della
// schiacciata mentre la palla rimbalzava alle sue spalle (punto perso). true quando va rifatto il piano con i soli punti
// dopo il rimbalzo: piano «smash» o «volley» della palla di adesso, finestra in ritardo passata (lateSpanOf × lateExtra
// del livello), palla non colpita e ancora nella propria metà, non già rimbalzata due volte. Al massimo una volta per
// colpo: il piano rifatto è dopo il rimbalzo (o «stretch»/«letgo»), mai di nuovo «smash» o «volley».
export function missedPlan(engine, actor){
  const P = planOf(engine, actor), b = engine.ball;
  if (!P || (P.kind !== 'smash' && P.kind !== 'volley') || P.replan || !b?.inPlay || !actor) return false;
  if (b.lastHitter === (actor === engine.opponent ? 'opponent' : 'player')) return false;
  const half = Math.sign(actor.pos.z) || 1;
  if (finite(b.pos.z)*half <= 0 || finite(b.bounceCountOnCurrentSide) >= 2) return false;
  const now = finite(engine.elapsedTime), diff = engine.matchConfig?.difficulty;
  const late = lateSpanOf(b.vel.z, skillLevel(diff))*(impactWindow(diff).lateExtra || IMPACT.lateExtra);
  return now > P.at + P.t + late && planMatches(P, b, now);
}

// Qualità che resta dopo la corsa sul piano in corso (1 se si è arrivati con calma)
export const stretchQuality = (engine, actor = engine.player) => 1 - PLAN.stretchCost*clamp(finite(livePlan(engine, actor)?.stretch), 0, 1);

// Dopo il colpo di chi gioca (nella propria metà, anche per il Player 2 del 1v1): verso il fondo, di lato dalla parte
// opposta a dove va la palla, se si fa in tempo ad arrivare almeno a safeZ prima del colpo dell'avversario. Altrimenti
// (succede solo quando una palla corta ha portato vicino alla rete) si chiude a rete: presi a metà campo è peggio. Fin
// dove si arriva lo decide il tempo; il colpo dopo lo decide il piano nuovo, da lì. Prima: a rete da dentro il campo o
// dopo un attacco, anche con il tempo per tornare. Restituisce 'net' o 'baseline'.
export function recoverAfterShot(engine, actor, { landingX = 0, flight = 1, contactZ = 11.5 } = {}){
  const half = Math.sign(actor.pos.z) || 1, z = Math.abs(finite(contactZ, 11.5)), x = finite(landingX);
  const time = Math.max(0, finite(flight, 1) + PLAN.oppTake - PLAN.react);
  const back = z + Math.max(4, finite(actor.maxSpeed, 9))*PLAN.recoverEff*time;
  if (back < PLAN.safeZ){ actor.targetPos.set(clamp(x*.3, -2.4, 2.4), 0, half*Math.max(z, PLAN.netZ)); return 'net'; }
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
  // anche per il Player 2 del 1v1 (natpfPlanP2): prima solo per chi gioca qui, e lo swing del P2 sulla palla rimbalzata
  // aveva il tempo della palla in linea retta (diagnostica 142438, C2)
  const plan = actor === engine.player || actor === engine.opponent ? livePlan(engine, actor) : null, now = finite(engine.elapsedTime);
  if (plan && Number.isFinite(plan.t) && gap > 0){ const left = plan.at + plan.t - now; if (left > -.05 && left < 3) return left; }
  return gap/vz;
}

// Webcam (colpi dal movimento, webcam_motion.js): quando un movimento di chi gioca qui può essere un colpo, e da che lato.
// { kind: 'toss' } al proprio servizio prima del lancio, { kind: 'serve' } nel lancio, { kind: 'stroke', ttc, side } con
// la palla in arrivo a meno di ahead secondi dal punto d'impatto (o passata da meno di behind: colpo in ritardo); null
// altrimenti (la palla va via, è lontana, il punto è finito, partita in pausa). Il movimento da solo non dice dritto o
// rovescio: il lato è quello della palla rispetto a chi gioca, dal piano d'intercetto (dove sarà la palla all'impatto) o,
// senza, da dove cade. ahead: uno swing partito prima di così sarebbe un colpo a vuoto in anticipo (IMPACT: 0,40–0,50 s
// oltre il centro della finestra); è quasi sempre la preparazione o chi si sposta
export const GATE = Object.freeze({ ahead: .7, behind: .3 });
export function webcamGate(engine, hand = handOf(engine, engine?.localActor)){
  const E = engine, me = E?.localActor, b = E?.ball;
  if (!me || !b || E.natpfPaused || E.autoPlayMode) return null;
  const mine = E.playerRole === 'p2' ? 'opponent' : 'player';
  if (E.phase === 'SERVE_STANCE' || E.phase === 'SERVE_TOSS') return E.score?.server === mine ? { kind: E.phase === 'SERVE_STANCE' ? 'toss' : 'serve' } : null;
  if (E.phase !== 'RALLY' || b.lastHitter === mine) return null;
  const ttc = timeToContact(E, me);
  if (ttc == null || ttc > GATE.ahead || ttc < -GATE.behind) return null;
  const plan = livePlan(E, me), x = Number.isFinite(b.targetLanding?.x) ? b.targetLanding.x : b.pos.x;
  // + alla destra di chi gioca: chi sta nella metà positiva guarda verso −z (la sua destra è +x)
  const rel = (plan && plan.side ? plan.side : x - me.pos.x)*(Math.sign(me.pos.z) || 1);
  return { kind: 'stroke', ttc: +ttc.toFixed(3), side: (rel >= 0) !== (hand === 'left') ? 'forehand' : 'backhand' };
}

// Gesto debole rispetto ai propri colpi (natpf.typical: colpo tipico di chi gioca, °/s): la preparazione o un
// micro-movimento. Il 23/10 sette colpi veri (808–1269 °/s) arrivati 10–300 ms dopo l'arrivo della palla sono stati
// scartati perché la palla l'aveva già colpita il gesto debole di prima (71–286 °/s), con palle corte, fuori e schiacciate
// non volute. Ora un gesto debole in anticipo non colpisce da solo all'arrivo della palla: si aspetta per poco il colpo
// vero (wait, dentro la finestra del ritardo); se non arriva, un gesto ampio (oltre «ample» gradi: un braccio che si muove
// con il polso fermo ruota poco il telefono, 23/10 n. 77) si gioca lo stesso, un micro-movimento no e la palla passa,
// senza swing a vuoto a schermo. Al servizio
// un gesto debole prima del colmo aspetta il colpo vero fino a serveWait dopo il colmo. Senza colpo tipico (profilo
// semplice, webcam) nessun gesto è debole. Chi gioca con colpetti piccoli ha un colpo tipico piccolo: i suoi colpi non
// sono deboli.
export const WEAK = Object.freeze({ rel: .3, early: .08, wait: .22, serveWait: .3, ample: 25 });
export const KEEP = Object.freeze({ conf: .5, within: .45 });
// Servizio battuto da un gesto intermedio (diagnostica 20261030-142438 n. 101/102): un gesto da 732 °/s (0,68 del colpo
// tipico, 1082) 368 ms prima del colmo batteva subito, e la battuta vera (1022 °/s, 25 ms prima del colmo) arrivava dopo
// ed era scartata. Ora anche un gesto sotto «rel» del colpo tipico fatto prima del colmo aspetta la battuta vera, come
// quello debole (fino a WEAK.serveWait dopo il colmo; se non arriva vale lui, con il suo tempo); uno più forte lo
// sostituisce. Nelle due sessioni le battute vere erano tutte oltre 0,9 del colpo tipico
export const SERVE_MID = Object.freeze({ rel: .75 });
export function serveMidSwing(e = {}, tau = 0){
  if (!(finite(tau) > 0) || weakSwing(e)) return false;
  const peak = finite(e.natpf?.peak, NaN), typ = finite(e.natpf?.typical, NaN);
  return Number.isFinite(peak) && Number.isFinite(typ) && typ > 0 && peak < SERVE_MID.rel*typ;
}
// forza di un gesto per il confronto tra due gesti (picco del telefono, °/s; altrimenti dalla velocità del motore)
export const swingStrength = (e = {}) => finite(e.natpf?.peak, NaN) || finite(e.speed, 1)*600;
// Finestra del colpo a vuoto in anticipo (IMPACT.early del livello), allargata sulle palle lente come la finestra della
// direzione (slowFactor, fino a ×1,8 sotto 15 m/s). B17.4: sulle palle corte a rete i gesti fatti «quando la palla sembra lì»
// erano «VERY EARLY • WHIFF» (diagnostica q79f, 42,8 s: colpo a vuoto, poi il pallonetto vero 0,2 s dopo)
export const earlyWindow = engine => impactWindow(engine?.matchConfig?.difficulty).early*slowFactor(engine?.ball?.vel?.z);
// Attesa dello swing per attore: chi gioca qui (pendingUserSwing) e il Player 2 del 1v1, tra due computer o sullo stesso
// schermo (pendingP2Swing), con il suo colpo (_attemptP2RallyStrike). Diagnostiche 142317/142438 (C2): lo swing del P2
// passava dal percorso vecchio, con 0,22 s di attesa contro 0,45 s del P1 e senza la finestra in ritardo della palla.
// Al P2 tra due computer il ritardo pieno vale P2_LATE_MARGIN in più: l'età dei suoi colpi (relay, rete) è meno certa di
// quella del telefono collegato a questo computer. Sullo stesso schermo (versus.local) il suo telefono è collegato qui: niente
export const P2_LATE_MARGIN = .03;
const isP2 = (engine, actor) => !!actor && actor === engine.opponent;
export const lateMargin = (engine, actor) => (isP2(engine, actor) && !engine.versus?.local ? P2_LATE_MARGIN : 0);
const pendKey = (engine, actor) => (isP2(engine, actor) ? 'pendingP2Swing' : 'pendingUserSwing');
const strike = (engine, actor, evt) => (isP2(engine, actor) ? engine._attemptP2RallyStrike(evt) : engine._attemptPlayerRallyStrike(evt, !1));
// palla corta o pallonetto confermati dalla forma del colpo (natpf_stroke_intent.js)
export const deliberateSpecial = (e = {}, conf = .15) => ['drop', 'lob'].includes(e.natpf?.intent?.shot) && finite(e.natpf.intent.conf) >= conf && finite(e.natpf.angle) >= 15;
// Gesto morbido in attesa all'arrivo della palla (diagnostica 20261030-142317, 3 colpi su 13): una palla corta o un gesto
// lento fatto prima del colpo (la preparazione con la forma di una palla corta, 369 °/s con confidenza 1; un top spin
// da 478 °/s) era giocato all'arrivo della palla, e il colpo vero (1335–1394 °/s, quasi perfetto) arrivava al computer
// 13–32 ms dopo: scartato come «palla che si allontana», o mostrato dopo un «VERY EARLY • WHIFF». Ora con un gesto
// morbido (sotto rel del colpo tipico, o palla corta e pallonetto della forma: deliberateSpecial) e con ogni colpo a vuoto
// in anticipo la decisione aspetta «wait» secondi dopo l'arrivo della palla: uno swing almeno «replace» volte più forte
// arrivato intanto (queueUserSwing, in ritardo) prende il posto di quello in attesa; se non arriva niente si gioca quello
// in attesa con il suo tempo vero (il voto non cambia, la palla parte «wait» più tardi).
export const SOFT = Object.freeze({ rel: .5, wait: .065, replace: 1.15 });
export function softSwing(e = {}){
  if (deliberateSpecial(e)) return true;
  const peak = finite(e.natpf?.peak, NaN), typ = finite(e.natpf?.typical, NaN);
  return Number.isFinite(peak) && Number.isFinite(typ) && typ > 0 && peak < SOFT.rel*typ;
}
export function weakSwing(e = {}){
  // Palla corta e pallonetto confermati dalla forma sono volutamente lenti, non una preparazione da scartare (28/10 sera:
  // a rete un pallonetto da 356 °/s, 0,1 s dopo il punto d'impatto, era ignorato come il rientro della mano)
  if (deliberateSpecial(e)) return false;
  const peak = finite(e.natpf?.peak, NaN), typ = finite(e.natpf?.typical, NaN);
  return Number.isFinite(peak) && Number.isFinite(typ) && typ > 0 && peak < WEAK.rel*typ;
}

// Lo swing di chi gioca nello scambio: in attesa fino all'arrivo della palla (o subito, se è già passata da poco).
// Restituisce 'held' (in attesa), 'late' (colpito in ritardo adesso), 'whiff' (a vuoto), 'ignored' (gesto debole dopo il
// punto d'impatto: il rientro della mano, niente a schermo) o null (nessuna palla in arrivo).
export function queueUserSwing(engine, e, actor){
  const W = impactWindow(engine.matchConfig?.difficulty), ttc = timeToContact(engine, actor);
  if (ttc == null) return null;
  const lat = eventLatency(e), lead = ttc + lat, now = finite(engine.elapsedTime);
  const lateSpan = lateSpanOf(engine.ball.vel.z, skillLevel(engine.matchConfig?.difficulty)) + lateMargin(engine, actor), key = pendKey(engine, actor);
  const strength = swingStrength(e), weak = weakSwing(e);
  if (ttc < 0){
    if (weak) return 'ignored';
    // decisione rinviata su un gesto morbido in attesa (SOFT): lo sostituisce solo uno swing chiaramente più forte; la
    // palla corta o il pallonetto voluti e fatti in tempo restano anche qui (KEEP: il braccio che torna dall'altra parte).
    // Al posto di un colpo a vuoto in anticipo va bene ogni swing che prende la palla
    const cur = engine[key], deferred = !!cur?.natpfWindow && cur.softDefer;
    if (deferred && cur.lead <= earlyWindow(engine) && !cur.weak && (strength < cur.strength*SOFT.replace || keepsSpecial(engine, cur, e, now))) return 'ignored';
    const b = engine.ball, toward = Math.sign(actor.pos.z) || 1, behind = (b.pos.z - (actor.pos.z - toward*IMPACT.contactAhead))*toward;
    const extra = W.lateExtra || IMPACT.lateExtra;
    if (lead >= -lateSpan*extra && behind <= IMPACT.lateBehind*extra + .2 && Math.abs(b.pos.x - actor.pos.x) <= IMPACT.reach && b.pos.y < 3.4){
      engine[key] = null;
      return strike(engine, actor, { ...e, natpfTau: lead, natpfLateSpan: lateSpan }) ? 'late' : 'whiff';
    }
    return deferred ? 'ignored' : 'whiff';
  }
  const lateWin = lateSpan*(W.lateExtra || IMPACT.lateExtra);
  const cand = { evt: { ...e, natpfTau: lead, natpfLateSpan: lateSpan }, lead, strength, weak, lateWin, actor, at: now, prep: !0, waitForSweetSpot: !0, natpfWindow: !0, expiresAt: now + ttc + lateWin + .12 };
  const cur = engine[key];
  let better = !cur || !cur.natpfWindow || strength >= cur.strength*1.15 || (Math.abs(lead) < Math.abs(cur.lead) && strength >= cur.strength*.6);
  // un colpo vero sostituisce sempre un gesto debole in attesa, mai il contrario
  if (cur?.natpfWindow && !!cur.weak !== weak) better = !weak;
  // palla corta o pallonetto voluti in attesa (forma chiara: KEEP.conf) e subito dopo un gesto dall'altra parte: è il
  // braccio che torna, più veloce del colpo morbido. 28/10 sera: la palla corta di rovescio (451 °/s) sostituita 0,2 s
  // dopo dal rientro (1292 °/s), giocato come tagliato di dritto. La preparazione seguita dal colpo resta come prima: la
  // preparazione non ha la forma di una palla corta o di un pallonetto
  if (better && cur?.natpfWindow && deliberateSpecial(cur.evt, KEEP.conf) && cur.evt.side && e.side && e.side !== cur.evt.side && now - cur.at < KEEP.within) better = false;
  if (better){ engine[key] = cand; holdSwingPrep(actor, e.side, ttc); }
  return 'held';
}
// Durante il rinvio (SOFT) la regola KEEP vale solo per la palla corta o il pallonetto fatti in tempo (entro la finestra
// della direzione): fatti molto prima (142317 n. 81: palla corta 233 ms prima, confidenza 1) erano la preparazione, e il
// colpo forte dall'altra parte, quasi perfetto, è il colpo vero
function keepsSpecial(engine, cur, e, now){
  if (!deliberateSpecial(cur.evt, KEEP.conf) || !cur.evt.side || !e.side || e.side === cur.evt.side || now - cur.at >= KEEP.within) return false;
  const span = directionSpan(skillLevel(engine.matchConfig?.difficulty))*slowFactor(engine.ball?.vel?.z);
  return cur.lead <= span;
}

// A ogni passo, con la palla che arriva: lo swing in attesa si gioca quando la palla raggiunge il punto d'impatto.
// true se ha fatto qualcosa (colpo o colpo a vuoto).
export function resolvePending(engine, actor){
  const key = pendKey(engine, actor), ps = engine[key]; if (!ps?.natpfWindow) return false;
  const b = engine.ball, W = impactWindow(engine.matchConfig?.difficulty), toward = Math.sign(actor.pos.z) || 1;
  const zc = actor.pos.z - toward*IMPACT.contactAhead, arrived = (b.pos.z - zc)*toward >= 0, now = finite(engine.elapsedTime);
  // gesto debole in anticipo (WEAK): all'arrivo della palla si aspetta per poco il colpo vero (arriva da queueUserSwing,
  // in ritardo, e prende il posto di questo); se non arriva, la palla passa senza swing a vuoto a schermo
  if (arrived && ps.weak && ps.lead > WEAK.early){
    if (ps.deferUntil == null){ ps.deferUntil = now + Math.min(WEAK.wait, Math.max(.05, finite(ps.lateWin, WEAK.wait))); return false; }
    if (now < ps.deferUntil) return false;
    engine[key] = null;
    if (finite(ps.evt?.natpf?.angle) >= WEAK.ample && Math.abs(b.pos.x - actor.pos.x) <= IMPACT.reach && b.pos.y < 3.4) strike(engine, actor, ps.evt);
    else engine._natpfWeakDropped?.(ps);
    return true;
  }
  if (arrived){
    // palla che va fuori: lo swing non la tocca (il punto è di chi gioca)
    if (livePlan(engine, actor)?.kind === 'letgo'){ engine[key] = null; return true; }
    // gesto morbido o colpo a vuoto in anticipo: si aspetta SOFT.wait il colpo vero, che può arrivare al computer poco
    // dopo l'arrivo della palla (queueUserSwing lo gioca in ritardo al posto di questo)
    const early = earlyWindow(engine);
    if (ps.deferUntil == null && (ps.lead > early || softSwing(ps.evt))){ ps.deferUntil = now + SOFT.wait; ps.softDefer = true; return false; }
    if (ps.softDefer && now < ps.deferUntil) return false;
    engine[key] = null;
    if (ps.lead > early){ engine._natpfEarlyWhiff?.(ps); return true; }
    if (Math.abs(b.pos.x - actor.pos.x) > IMPACT.reach || b.pos.y >= 3.4){ engine._natpfEarlyWhiff?.({ ...ps, natpfWhy: 'portata' }); return true; }
    strike(engine, actor, ps.evt);
    return true;
  }
  if (now > ps.expiresAt){ engine[key] = null; if (ps.weak) engine._natpfWeakDropped?.(ps); else engine._natpfEarlyWhiff?.(ps); return true; }
  return false;
}
