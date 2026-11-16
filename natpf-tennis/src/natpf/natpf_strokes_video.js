// NATPF B53 · «Movimenti come nel video» sugli altri colpi (decisione dell'utente del 15/11/2026, dopo la prova del
// dritto del B23: «estendilo agli altri colpi»). Stesso interruttore del dritto (Opzioni, natpf_forehand_video.js),
// stesso metodo e stessi vincoli, in un modulo a parte così il dritto del B23 resta identico (docs/b53/colpi-dal-video.md).
//
// Colpi, con da dove vengono le pose:
//   • rovescio (topspin e piatto): dal trailer (natpf-desktop/media/trailer-aad6b9311db4.mp4, giocatore blu visto di
//     fronte tra 4,5 e 6 s): busto girato del tutto dalla parte libera, peso sulla gamba dietro e passo incrociato, due
//     mani sulla racchetta, impatto con il peso in avanti, finale alto sopra la spalla della racchetta (la mano libera si
//     apre: con le due mani lassù copriva la faccia delle mascotte).
//   • schiacciata: dal trailer (giocatore bianco tra 7 e 8 s): gambe piegate e busto di lato con il braccio libero alto
//     verso la palla, colpo con il corpo che si allunga in punta di piedi, poi il salto e l'atterraggio con le gambe
//     piegate e le braccia aperte. Nel trailer il colpo è in aria: qui il salto parte subito DOPO la zona dell'impatto
//     (all'impatto la racchetta è quella del motore, quindi il personaggio è a terra come prima).
//   • volée di dritto e di rovescio (a rete, natpf_forehand_video.atNet): non c'è nel trailer; nello stile del video ma
//     corta come una volée vera: poca rotazione, gambe piegate, passo avanti con il piede giusto, colpo secco, finale
//     breve, niente saltello. A rete il dritto del B23 e il rovescio qui sopra non si applicano.
//
// Vincoli (come il B23): la racchetta nell'intorno dell'impatto è quella di racket_kinematics.js (tra racketFree[0] e
// [1] dello swing non si tocca); tempi, fisica, esiti, gesti e movimento in campo non cambiano (solo trasformazioni di
// disegno); con l'interruttore su «No» svPre e svPost escono senza scrivere niente. Destri e mancini: pose nel
// riferimento del personaggio (racchetta a x < 0, rete verso +z), il mancino è specchiato dalla radice.
// Ordine con il dritto (player_body_animation.js): svPre prima di fvPre, svPost dopo fvPost (la mano libera torna alla
// posa di sempre in ordine inverso a come le pose la spostano).
import { forehandVideoEnabled, atNet } from './natpf_forehand_video.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (v, a, b) => { const t = clamp((v - a)/(b - a), 0, 1); return t*t*(3 - 2*t); };
const follow = (v, to, dt, tau) => v + (to - v)*(1 - Math.exp(-dt/tau));
const firstPerson = actor => { const h = actor.natpfFirstPersonHidden; return !!(h && h[0] && h[0].visible === false); };
const topOrFlat = T => T.swingShotType === 'topspin' || T.swingShotType === 'flat';

// Tempi comuni (gli stessi del dritto del B23, FV in natpf_forehand_video.js)
export const SV = Object.freeze({
  tau: Object.freeze({ coil: .07, uncoil: .05, drive: .035, finish: .055, still: .09, racket: .06, hop: .03, react: .16 }),
  coilRate: 4.5, handSpeed: 6, hold: .12, release: .32,
  // fuori dallo swing (la palla passa dall'altra parte e la preparazione si scioglie): più piano, sotto le soglie di
  // scatto del B23 fuori dallo swing (50 mm e 0,08 rad tra due fotogrammi). Quando la palla passa dal rovescio al dritto
  // la preparazione del dritto (B23) cresce nello stesso fotogramma e la rotazione del bacino va nello stesso verso: le
  // due insieme restano sotto la soglia solo se questa si scioglie in circa 0,4 s
  uncoilRest: .4, handSpeedRest: 1.6,
  charge: Object.freeze([.02, .5]),
  hop: Object.freeze({ from: .1, len: .3, up: .045 }),
  head: .85, headMax: 1.2,
  run: Object.freeze([.5, 2.6]),
});

// Colpi. Per ogni colpo: is(T) quando lo swing in corso è di quel colpo; side, il lato della preparazione
// (T.anticipationSide); contact e racketFree come il dritto; pose chiave coil/drive/finish (scostamenti, stesse chiavi del
// dritto: tw/pi/ro bacino, hx/hy/hz spostamento del bacino, b* piede dal lato della racchetta, f* l'altro piede); hands:
// per ogni posa dove va la mano libera ('racket' = sulla racchetta accanto alla mano che la tiene, { x, y, z } = un punto
// del personaggio come le pose del dritto, null = quella di sempre); racket: prep (scostamento della preparazione) e fin
// (posa del finale, null = quella di sempre), lontano dall'impatto; hop: saltello o salto dopo l'impatto (da quando, in s
// dopo l'impatto; durata; altezza in m), sempre dopo la fine della zona libera della racchetta.
export const SV_STROKES = Object.freeze({
  backhand: Object.freeze({
    is: T => !!(T && T.swingActive && T.swingSide === 'backhand' && !T.isServe && topOrFlat(T)),
    side: 'backhand', where: 'base',
    contact: .34,
    racketFree: Object.freeze([.2, .46]),
    // Lette dal trailer (giocatore blu, 4,5–6 s; il colpo è verso 5,2 s): spalle girate verso la parte libera (la schiena
    // quasi alla rete), peso sul piede dietro che è quello libero, piede della racchetta avanti e incrociato; impatto con
    // il bacino che torna e il tallone dietro che si alza; finale con il busto passato e in punta di piedi.
    pose: Object.freeze({
      coil:   Object.freeze({ tw: .78, pi: .07, ro: -.06, hx: .05, hy: -.07, hz: -.05,
        bx: .03, by: 0, bz: .12, brx: 0, bry: .3, fx: .07, fy: 0, fz: -.13, frx: 0, fry: .6 }),
      drive:  Object.freeze({ tw: -.08, pi: .1, ro: .04, hx: -.02, hy: -.04, hz: .07,
        bx: -.03, by: 0, bz: .13, brx: 0, bry: .12, fx: .04, fy: .035, fz: -.1, frx: .55, fry: .25 }),
      finish: Object.freeze({ tw: -.36, pi: -.05, ro: .03, hx: -.02, hy: .04, hz: .05,
        bx: 0, by: 0, bz: .03, brx: .2, bry: 0, fx: 0, fy: 0, fz: .03, frx: .25, fry: 0 }),
    }),
    hands: Object.freeze({ coil: 'racket', drive: 'racket', finish: null }),
    hop: Object.freeze({ from: .1, len: .3, up: .045 }),
    // racchetta: finale sopra la spalla della racchetta, avvolta all'indietro (posa); la preparazione è quella di sempre
    racket: Object.freeze({
      // (nessuno scostamento nella preparazione: chi gioca parte dall'impatto, a 0,24 dello swing, e lo scostamento che
      // spariva in quel fotogramma rendeva lo scatto della racchetta più grande di quello di sempre, 740 contro 624 mm)
      prep: Object.freeze({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }),
      fin:  Object.freeze({ x: -.42, y: 1.34, z: .08, rx: .1, ry: -.93, rz: 1.2 }),
    }),
  }),
  smash: Object.freeze({
    is: T => !!(T && T.swingActive && T.swingSide === 'overhead' && !T.isServe),
    side: 'overhead', where: 'any',
    contact: .34,                       // picco di velocità delle corde a 0,36 dello swing, come il dritto
    racketFree: Object.freeze([.2, .46]),
    // Lette dal trailer (giocatore bianco, 7–8 s): preparazione di lato con il lato della racchetta indietro, gambe
    // piegate e un po' all'indietro; impatto con il corpo che si allunga, in avanti, sulle punte; finale dell'atterraggio
    // con il busto passato, il bacino basso e i piedi larghi.
    pose: Object.freeze({
      coil:   Object.freeze({ tw: -.45, pi: -.06, ro: .04, hx: -.03, hy: -.07, hz: -.05,
        bx: -.05, by: 0, bz: -.14, brx: 0, bry: -.5, fx: .02, fy: 0, fz: .1, frx: 0, fry: -.2 }),
      drive:  Object.freeze({ tw: .15, pi: .12, ro: -.02, hx: .01, hy: .02, hz: .06,
        bx: -.03, by: .03, bz: -.08, brx: .5, bry: -.2, fx: .02, fy: .02, fz: .1, frx: .35, fry: 0 }),
      finish: Object.freeze({ tw: .4, pi: .18, ro: -.03, hx: .02, hy: -.06, hz: .08,
        bx: -.04, by: 0, bz: .02, brx: .1, bry: 0, fx: .05, fy: 0, fz: .06, frx: .1, fry: 0 }),
    }),
    // il braccio libero alto verso la palla lo fa già l'animazione di sempre; nel finale le braccia si aprono
    hands: Object.freeze({ coil: null, drive: null, finish: Object.freeze({ x: .46, y: .86, z: .2 }) }),
    // salto dopo l'impatto: parte quando la racchetta è già fuori dalla zona libera (0,46 dello swing, circa 0,04 s
    // dopo l'impatto)
    hop: Object.freeze({ from: .06, len: .44, up: .14 }),
    racket: Object.freeze({ prep: Object.freeze({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }), fin: null }),
  }),
  // Volée (B53.3): non è nel trailer. Corta: preparazione con poca rotazione e le gambe piegate, passo avanti con il
  // piede opposto al colpo (di dritto il piede libero, di rovescio quello della racchetta), impatto con il peso in avanti
  // e il tallone dietro alzato, finale breve senza saltello. La mano libera accompagna la racchetta nella preparazione.
  volleyF: Object.freeze({
    is: T => !!(T && T.swingActive && T.swingSide === 'forehand' && !T.isServe && topOrFlat(T)),
    side: 'forehand', where: 'net',
    contact: .34, racketFree: Object.freeze([.2, .46]),
    pose: Object.freeze({
      coil:   Object.freeze({ tw: -.25, pi: .05, ro: .02, hx: -.02, hy: -.05, hz: 0,
        bx: -.02, by: 0, bz: -.04, brx: 0, bry: -.3, fx: -.02, fy: 0, fz: .14, frx: 0, fry: -.15 }),
      drive:  Object.freeze({ tw: -.05, pi: .12, ro: 0, hx: 0, hy: -.06, hz: .08,
        bx: -.02, by: .02, bz: -.06, brx: .35, bry: -.15, fx: -.02, fy: 0, fz: .16, frx: 0, fry: -.1 }),
      finish: Object.freeze({ tw: 0, pi: .08, ro: 0, hx: 0, hy: -.04, hz: .06,
        bx: -.01, by: 0, bz: -.03, brx: .15, bry: 0, fx: -.02, fy: 0, fz: .12, frx: 0, fry: 0 }),
    }),
    hands: Object.freeze({ coil: 'racket', drive: null, finish: null }),
    hop: Object.freeze({ from: .1, len: .3, up: 0 }),
    racket: Object.freeze({ prep: Object.freeze({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }), fin: null }),
  }),
  volleyB: Object.freeze({
    is: T => !!(T && T.swingActive && T.swingSide === 'backhand' && !T.isServe && topOrFlat(T)),
    side: 'backhand', where: 'net',
    contact: .34, racketFree: Object.freeze([.2, .46]),
    pose: Object.freeze({
      coil:   Object.freeze({ tw: .35, pi: .05, ro: -.02, hx: .02, hy: -.05, hz: 0,
        bx: .02, by: 0, bz: .14, brx: 0, bry: .15, fx: .02, fy: 0, fz: -.04, frx: 0, fry: .3 }),
      drive:  Object.freeze({ tw: .08, pi: .12, ro: 0, hx: 0, hy: -.06, hz: .08,
        bx: .02, by: 0, bz: .16, brx: 0, bry: .1, fx: .02, fy: .02, fz: -.06, frx: .35, fry: .15 }),
      finish: Object.freeze({ tw: 0, pi: .08, ro: 0, hx: 0, hy: -.04, hz: .06,
        bx: .02, by: 0, bz: .12, brx: 0, bry: 0, fx: .01, fy: 0, fz: -.03, frx: .15, fry: 0 }),
    }),
    hands: Object.freeze({ coil: 'racket', drive: 'racket', finish: null }),
    hop: Object.freeze({ from: .1, len: .3, up: 0 }),
    racket: Object.freeze({ prep: Object.freeze({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }), fin: null }),
  }),
  // Servizio (B53.4): non è nel trailer; nello stesso stile del video (busto che gira, peso che passa, finale ampio). Solo
  // dentro e dopo lo swing del servizio: lancio e attesa restano quelli di sempre (nessuna preparazione prima, side 'serve'
  // non è mai quello della preparazione). Inizio dello swing di lato con le gambe piegate (la spinta), impatto con il corpo
  // allungato in alto e in avanti sulle punte, finale con il busto passato e il piede dietro che entra in campo; saltello in
  // avanti che parte dopo la zona libera della racchetta (all'impatto la racchetta è quella del motore, a terra). Il braccio
  // del lancio lo fa già l'animazione di sempre: mano libera mai toccata.
  serve: Object.freeze({
    is: T => !!(T && T.swingActive && T.isServe),
    side: 'serve', where: 'any',
    contact: .36, racketFree: Object.freeze([.2, .46]),
    pose: Object.freeze({
      coil:   Object.freeze({ tw: -.32, pi: -.06, ro: 0, hx: 0, hy: -.08, hz: -.03,
        bx: 0, by: 0, bz: -.05, brx: 0, bry: -.3, fx: 0, fy: 0, fz: .03, frx: 0, fry: -.15 }),
      drive:  Object.freeze({ tw: .1, pi: .14, ro: 0, hx: 0, hy: .02, hz: .06,
        bx: 0, by: .03, bz: 0, brx: .45, bry: 0, fx: 0, fy: .02, fz: .04, frx: .3, fry: 0 }),
      finish: Object.freeze({ tw: .35, pi: .16, ro: 0, hx: 0, hy: -.05, hz: .12,
        bx: .02, by: 0, bz: .12, brx: .2, bry: 0, fx: -.02, fy: 0, fz: .08, frx: 0, fry: 0 }),
    }),
    hands: Object.freeze({ coil: null, drive: null, finish: null }),
    hop: Object.freeze({ from: .06, len: .36, up: .07 }),
    racket: Object.freeze({ prep: Object.freeze({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }), fin: null }),
  }),
});
export const SV_KINDS = Object.freeze(Object.keys(SV_STROKES));
// dove sta la mano libera «sulla racchetta», rispetto alla mano che la tiene (come l'animazione di sempre nel rovescio)
const ON_RACKET = Object.freeze({ x: .04, y: .04, z: .02 });

// Pesi bersaglio delle tre pose (come fvTargets del dritto, con il contatto del colpo)
export function svTargets(out, def, charge, l, after){
  if (l != null){
    out.coil = 1 - ss(l, .14, .26);
    out.drive = ss(l, .16, def.contact)*(1 - ss(l, .4, .62));
    out.finish = ss(l, .38, .62);
  } else {
    out.coil = ss(charge, SV.charge[0], SV.charge[1]);
    out.drive = 0;
    out.finish = after != null ? 1 - ss(after, SV.hold, SV.hold + SV.release) : 0;
  }
  return out;
}
export const svRacketFinish = (def, l, after) => (l != null ? (l > def.racketFree[1] ? ss(l, .5, .74) : 0) : after != null ? 1 - ss(after, SV.hold, SV.hold + SV.release) : 0);
export const svRacketPrep = (def, l, atStart) => (l < def.racketFree[0] ? atStart*(1 - ss(l, .02, def.racketFree[0])) : 0);
export function svHop(t, H = SV.hop){
  const u = (t - H.from)/H.len;
  if (!(u > 0 && u < 1)) return 0;
  const s = Math.sin(Math.PI*u);
  return H.up*s*s;
}
// Il colpo della prova dello swing in corso (null se non è uno dei colpi di questo modulo)
// (where: 'base' lontano dalla rete, 'net' a rete, 'any' ovunque; actor facoltativo: senza, lontano dalla rete)
export const svHere = (def, net) => def.where === 'any' || (def.where === 'net') === !!net;
export const svKindOf = (T, actor = null) => { const net = atNet(actor); for (const k of SV_KINDS) if (svHere(SV_STROKES[k], net) && SV_STROKES[k].is(T)) return k; return null; };

/* ---------- stato: uno per personaggio e per colpo, creato una volta ---------- */
const newState = () => ({
  coil: 0, drive: 0, finish: 0, still: 1, hop: 0, rPrep: 0, rPrep0: 0, rFin: 0,
  swinging: false, after: null, hit: false, sinceHit: 0, live: false,
  ax: 0, ay: 0, az: 0, dt: 1/60, ox: NaN, oy: NaN, oz: NaN,
});
function rest(s){
  s.coil = s.drive = s.finish = s.hop = s.rPrep = s.rPrep0 = s.rFin = 0; s.still = 1;
  s.swinging = s.hit = s.live = false; s.after = null; s.sinceHit = 0; s.ox = s.oy = s.oz = NaN; s.ax = s.ay = s.az = 0;
}
// stato del personaggio: { any, hand, bx, by, bz, <colpo>: stato del colpo }
function stateOf(rig){
  let S = rig.natpfSv;
  if (!S){
    S = rig.natpfSv = { any: false, hand: false, bx: 0, by: 0, bz: 0, fax: 0, fay: 0, faz: 0 };
    for (const k of SV_KINDS) S[k] = newState();
  }
  return S;
}
/** Rimette lo stato della prova da capo (prove e sequenze ripetibili). */
export function svRest(rig){
  const S = rig?.natpfSv;
  if (!S) return;
  S.any = S.hand = false; S.bx = S.by = S.bz = 0; S.fax = S.fay = S.faz = 0;
  for (const k of SV_KINDS) rest(S[k]);
}
const TGT = { coil: 0, drive: 0, finish: 0 };

// Prima dell'animazione del corpo (dopo racket_kinematics, prima di fvPre): pesi e racchetta lontano dall'impatto.
export function svPre(actor, rig, dt){
  const S0 = rig.natpfSv;
  if (S0 && S0.hand){ rig.handLPivot.position.set(S0.bx, S0.by, S0.bz); S0.hand = false; }
  if (!forehandVideoEnabled()){ if (S0) for (const k of SV_KINDS){ const s = S0[k]; if (s.live || s.rPrep || s.after != null) rest(s); } return; }
  const T = actor.racketKinematics;
  if (!T) return;
  const S = stateOf(rig), busy = !!(rig.reaction && rig.reaction.active), kind = svKindOf(T, actor), net = atNet(actor);
  const fresh = T.swingActive && !S.any;
  S.any = !!T.swingActive;
  // il dritto del B23 ha scritto sulla racchetta in questo fotogramma: non ci si scrive sopra
  const F = rig.natpfFv, fvRacket = !!(F && (F.rPrep || F.rFin));
  const v = actor.vel ? Math.hypot(actor.vel.x, actor.vel.z) : 0, still = 1 - ss(v, SV.run[0], SV.run[1]);
  for (const k of SV_KINDS){
    const def = SV_STROKES[k], s = S[k], mine = kind === k, l = mine ? T.swingProgress : null;
    if (fresh){ s.hit = false; s.hop = 0; }
    if (mine){
      if (!s.swinging){ s.rPrep0 = s.rPrep; s.hit = false; }
      if (!s.hit && l >= def.contact){ s.hit = true; s.sinceHit = 0; }
      s.after = 0;
    } else if (s.after != null){
      s.after += dt;
      if (s.after > SV.hold + SV.release || busy) s.after = null;
    }
    s.swinging = mine;
    const H = def.hop || SV.hop;
    if (s.hit){ s.sinceHit += dt; if (s.sinceHit > H.from + H.len + .1) s.hit = false; }
    const charge = !mine && !busy && !T.swingActive && svHere(def, net) && T.anticipationSide === def.side ? T.anticipationCharge : 0;
    svTargets(TGT, def, charge, l, mine ? null : s.after);
    if (busy) TGT.coil = TGT.drive = TGT.finish = 0;
    s.coil = Math.min(follow(s.coil, TGT.coil, dt, busy ? SV.tau.react : TGT.coil > s.coil ? SV.tau.coil : T.swingActive ? SV.tau.uncoil : SV.uncoilRest), s.coil + SV.coilRate*dt);
    // (con lo scioglimento lento fuori dallo swing la coda è lunga: sotto 0,002, con il bersaglio a zero, si chiude; lo
    // scarto è di 1,6 millesimi di radiante, invisibile)
    if (!TGT.coil && s.coil < 2e-3) s.coil = 0;
    s.dt = dt;
    s.drive = follow(s.drive, TGT.drive, dt, busy ? SV.tau.react : SV.tau.drive);
    s.finish = follow(s.finish, TGT.finish, dt, busy ? SV.tau.react : SV.tau.finish);
    s.hop = follow(s.hop, s.hit ? svHop(s.sinceHit, H) : 0, dt, SV.tau.hop);
    s.still = follow(s.still, still, dt, SV.tau.still);
    // (B53.4: durante una reazione, l'esultanza, la coda della posa si chiude sotto l'1 %: il finale del servizio, che può
    // finire dentro l'esultanza dopo un ace, non resta per secondi in una coda invisibile; lo scarto è di pochi millesimi
    // di radiante)
    if (busy){ if (s.coil < .01) s.coil = 0; if (s.drive < .01) s.drive = 0; if (s.finish < .01) s.finish = 0; if (s.hop < 1e-3) s.hop = 0; }
    s.live = s.coil > 1e-4 || s.drive > 1e-4 || s.finish > 1e-4 || s.hop > 1e-5;
    if (!s.live && !TGT.coil && !TGT.drive && !TGT.finish) s.coil = s.drive = s.finish = s.hop = 0;
    // racchetta: preparazione e finale; niente nella zona dell'impatto e niente durante gli swing degli altri colpi
    const other = !mine && !!T.swingActive;
    s.rPrep = mine ? svRacketPrep(def, l, s.rPrep0) : other ? 0 : follow(s.rPrep, TGT.coil, dt, SV.tau.racket);
    if (s.rPrep < 1e-4 && !TGT.coil) s.rPrep = 0;
    s.rFin = !def.racket.fin ? 0 : mine ? svRacketFinish(def, l, null) : other || busy ? 0 : svRacketFinish(def, null, s.after);
    const rp = actor.racketPivot, a = s.rPrep, b = s.rFin;
    if (rp && (a || b) && !busy && !fvRacket && !firstPerson(actor)){
      const p = rp.position, r = rp.rotation, A = def.racket.prep, B = def.racket.fin;
      if (!(p.x === s.ox && p.y === s.oy && p.z === s.oz)){
        p.x += a*A.x; p.y += a*A.y; p.z += a*A.z; r.x += a*A.rx; r.y += a*A.ry; r.z += a*A.rz;
        if (B){ p.x += b*(B.x - p.x); p.y += b*(B.y - p.y); p.z += b*(B.z - p.z);
          r.x += b*(B.rx - r.x); r.y += b*(B.ry - r.y); r.z += b*(B.rz - r.z); }
        s.ox = p.x; s.oy = p.y; s.oz = p.z;
      }
    }
  }
}

// Dopo l'animazione del corpo (dopo fvPost): pose di bacino, piedi, testa, mano libera e saltello.
export function svPost(actor, rig){
  const S = rig.natpfSv;
  if (!S) return;
  if (!forehandVideoEnabled()){ for (const k of SV_KINDS) S[k].ax = S[k].ay = S[k].az = 0; return; }
  const hip = rig.hipPivot, neck = rig.neckPivot.rotation, fb = rig.footLPivot, ff = rig.footRPivot, h = rig.handLPivot.position;
  let saved = false;
  // quanto il dritto del B23 ha spostato la mano libera in questo fotogramma: fuori dallo swing la mano di questo modulo
  // usa solo la velocità che resta (alla palla che passa dal rovescio al dritto i due la spostavano nello stesso verso,
  // 66 mm in un fotogramma nello scambio della CPU; soglia del B23 fuori dallo swing 50 mm)
  const F = rig.natpfFv, fx = F ? F.ax : 0, fy = F ? F.ay : 0, fz = F ? F.az : 0;
  const fMove = Math.hypot(fx - S.fax, fy - S.fay, fz - S.faz);
  S.fax = fx; S.fay = fy; S.faz = fz;
  for (const k of SV_KINDS){
    const s = S[k];
    if (!s.live){ s.ax = s.ay = s.az = 0; continue; }
    const P = SV_STROKES[k].pose, wc = s.coil, wd = s.drive, wf = s.finish;
    const mix = key => wc*P.coil[key] + wd*P.drive[key] + wf*P.finish[key];
    const kk = s.still, kh = .35 + .65*kk, tw = mix('tw');
    hip.rotation.x += mix('pi'); hip.rotation.y += tw; hip.rotation.z += mix('ro');
    hip.position.x += mix('hx')*kh; hip.position.y += mix('hy')*kh; hip.position.z += mix('hz')*kh;
    neck.y = clamp(neck.y - tw*SV.head, -SV.headMax, SV.headMax);
    fb.position.x += mix('bx')*kk; fb.position.y += mix('by')*kk; fb.position.z += mix('bz')*kk;
    fb.rotation.x += mix('brx')*kk; fb.rotation.y += mix('bry')*kk;
    ff.position.x += mix('fx')*kk; ff.position.y += mix('fy')*kk; ff.position.z += mix('fz')*kk;
    ff.rotation.x += mix('frx')*kk; ff.rotation.y += mix('fry')*kk;
    // mano libera: sulla racchetta (accanto alla mano che la tiene) nella preparazione e all'impatto, come nel trailer; nel
    // finale si apre come nell'animazione di sempre (con le due mani sopra la spalla la mano passava davanti agli occhi
    // delle mascotte dalla testa grande, test/natpf-mascotte-3d.test.mjs). La posa di prima si tiene da parte una volta
    // sola per fotogramma (svPre la rimette)
    if (!saved){ S.bx = h.x; S.by = h.y; S.bz = h.z; S.hand = true; saved = true; }
    const Hd = SV_STROKES[k].hands, R = rig.handRPivot.position;
    let hw = 0, hx = 0, hy = 0, hz = 0;
    for (const [pose, wp] of [['coil', wc], ['drive', wd], ['finish', wf]]){
      const t = Hd[pose];
      if (!t || !(wp > 0)) continue;
      hw += wp;
      if (t === 'racket'){ hx += wp*(R.x + ON_RACKET.x); hy += wp*(R.y + ON_RACKET.y); hz += wp*(R.z + ON_RACKET.z); }
      else { hx += wp*t.x; hy += wp*t.y; hz += wp*t.z; }
    }
    const g = hw > 1 ? 1/hw : 1;
    let ax = g*(hx - hw*S.bx), ay = g*(hy - hw*S.by), az = g*(hz - hw*S.bz);
    const dx = ax - s.ax, dy = ay - s.ay, dz = az - s.az, d = Math.hypot(dx, dy, dz), lim = S.any ? SV.handSpeed*s.dt : Math.max(0, SV.handSpeedRest*s.dt - fMove);
    if (d > lim){ const q = lim/d; ax = s.ax + dx*q; ay = s.ay + dy*q; az = s.az + dz*q; }
    s.ax = ax; s.ay = ay; s.az = az;
    h.x += ax; h.y += ay; h.z += az;
    const up = firstPerson(actor) ? 0 : s.hop*kk;
    if (up > 0){
      actor.root.position.y += up; rig.verticalHopOffset += up;
      if (actor.shadowBlob) actor.shadowBlob.scale.setScalar(clamp(1 - rig.verticalHopOffset*.85, .72, 1.06));
    }
  }
}
