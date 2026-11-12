// NATPF B23 · PROVA «Dritto come nel video». Dopo il trailer generato (11/11/2026) l'utente ha chiesto se il dritto in
// campo può avere quelle movenze: questa è la prova su UN colpo solo, facile da confrontare e da togliere
// (docs/b23/dritto-dal-video.md). Tutto il codice della prova sta qui; il resto del gioco la chiama in due punti di
// player_body_animation.js (fvPre, fvPost) e la accende o la spegne dal menu Opzioni (natpf_lobby.js).
//
// Che cosa fa: SOPRA l'animazione di sempre aggiunge al dritto (topspin e piatto, dal lato della racchetta) le pose
// lette a mano dai fotogrammi del trailer (misure in docs/b23): preparazione con il busto girato, il peso sulla gamba
// dietro, la mano libera che accompagna la racchetta e la racchetta alta; impatto con il peso in avanti e il tallone
// dietro che si alza; finale con il busto che passa, la racchetta sopra la spalla opposta, il braccio libero aperto
// all'indietro; poi i piedi si riuniscono con un saltello di recupero.
//
// Che cosa NON tocca (vincoli della prova):
//   • la racchetta nell'intorno dell'impatto: tra FV.racketFree[0] e [1] della durata dello swing (l'impatto è a
//     FV.contact) la racchetta è esattamente quella di racket_kinematics.js, quindi sta sulla palla come prima, anche con
//     il colpo in anticipo o in ritardo (lì cambia solo il lato o l'angolo, non questo modulo);
//   • tempi dello swing, fisica, esito dei colpi, riconoscimento dei gesti, movimento in campo: il modulo legge lo stato
//     dello swing e scrive solo trasformazioni di disegno (perni del corpo, perno della racchetta, altezza del salto);
//   • lo stato del corpo di sempre (molle di busto e testa, mano libera): l'animazione di base va avanti identica con la
//     prova accesa o spenta, quindi spegnerla a metà partita riporta subito al dritto di prima;
//   • con la prova spenta (Opzioni → «No», o ?dritto=prima) fvPre e fvPost escono senza scrivere niente: le pose sono
//     quelle di 9b8f9cb, osso per osso (test/natpf-dritto-video.test.mjs).
//
// Destri e mancini: il personaggio del mancino è specchiato dalla radice (natpf_hand.js), e tutte le pose qui sono nel
// riferimento del personaggio (racchetta a x < 0, rete verso +z): valgono per tutti e due senza casi a parte. Vale per
// chi gioca, per la CPU e per il Player 2 (stesso codice di animazione).
// Prestazioni: nessun oggetto creato per fotogramma (uno stato per personaggio, creato una volta); qualche decina di
// somme e sei esponenziali per personaggio e per fotogramma.

/* ---------- interruttore ---------- */
// Opzioni → «Dritto come nel video (prova): Sì · No», di base Sì, salvata. ?dritto=video|prima vale più della scelta
// salvata finché la pagina resta aperta con quell'indirizzo (per confrontare senza toccare il menu), e non la cambia.
export const FV_KEY = 'natpf-tennis.drittoVideo';
export const FV_PARAM = 'dritto';
export function forehandVideoParam(search = globalThis.location?.search){
  try { const v = new URLSearchParams(search || '').get(FV_PARAM); return v === 'video' ? true : v === 'prima' ? false : null; } catch { return null; }
}
export function readForehandVideo({ storage = globalThis.localStorage, search = globalThis.location?.search } = {}){
  const q = forehandVideoParam(search);
  if (q != null) return q;
  try { return storage?.getItem(FV_KEY) !== '0'; } catch { return true; }
}
export function writeForehandVideo(on, { storage = globalThis.localStorage } = {}){
  try { storage?.setItem(FV_KEY, on ? '1' : '0'); } catch {}
  return !!on;
}
let enabled = null;
export function forehandVideoEnabled(){ return enabled ?? (enabled = readForehandVideo()); }
export function setForehandVideo(on){ return (enabled = !!on); }
export const forehandVideoToast = on => (on ? 'Dritto come nel video (prova) acceso' : 'Dritto come nel video spento: il dritto è quello di prima');

/* ---------- tempi e pose ---------- */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (v, a, b) => { const t = clamp((v - a)/(b - a), 0, 1); return t*t*(3 - 2*t); };
export const FV = Object.freeze({
  contact: .34,                 // frazione dello swing con la racchetta sulla palla (racket_kinematics: picco a 0,34)
  racketFree: Object.freeze([.2, .46]),   // tra queste frazioni la racchetta non si tocca (chi gioca parte da 0,24)
  // prontezza delle pose del corpo (s): le pose seguono lo swing con un piccolo ritardo, senza scatti
  tau: Object.freeze({ coil: .07, uncoil: .05, drive: .035, finish: .055, still: .09, racket: .06, hop: .03 }),
  hold: .12, release: .32,      // s: dopo la fine dello swing il finale resta, poi si scioglie
  charge: Object.freeze([.02, .5]),   // carica della preparazione (racket_kinematics) tra cui la posa passa da 0 a 1: girati presto, come nel trailer
  hop: Object.freeze({ from: .1, len: .3, up: .055 }),   // saltello di recupero: da quando (s dopo l'impatto), durata, altezza (m)
  head: .85, headMax: 1.2,      // la testa resta sulla palla mentre il busto gira: quota della rotazione in più, limite (rad)
  run: Object.freeze([.5, 2.6]) // m/s: da fermo le gambe fanno la posa, in corsa restano quelle della corsa
});
// Pose chiave: scostamenti dall'animazione di sempre, nel riferimento del personaggio (unità del modello; x < 0 è il lato
// della racchetta, +z la rete). Lette dai fotogrammi del trailer (docs/b23/dritto-dal-video.md, tabella delle pose):
//   coil   = preparazione (fotogrammi 6–12): busto girato verso la racchetta, peso dietro, mano libera vicino alla racchetta;
//   drive  = impatto (17–18): peso in avanti, anche aperte, tallone dietro alzato, mano libera raccolta al fianco;
//   finish = finale (20–30): busto passato, in punta di piedi con i piedi vicini, braccio libero aperto dietro.
// tw/pi/ro: rotazione del bacino (verticale, avanti, laterale; rad) · hx/hy/hz: spostamento del bacino · b* piede dietro
// (lato racchetta), f* piede davanti: posizione, tallone alzato (rx), punta girata (ry) · l*: dove va la mano libera.
export const FV_POSE = Object.freeze({
  coil:   Object.freeze({ tw: -.6, pi: .06, ro: .06, hx: -.04, hy: -.06, hz: -.045,
    bx: -.07, by: 0, bz: -.13, brx: 0, bry: -.6, fx: .02, fy: 0, fz: .11, frx: 0, fry: -.3, lx: -.08, ly: 1, lz: .24 }),
  drive:  Object.freeze({ tw: .1, pi: .1, ro: -.04, hx: .02, hy: -.03, hz: .07,
    bx: -.04, by: .035, bz: -.1, brx: .55, bry: -.25, fx: .03, fy: 0, fz: .13, frx: 0, fry: -.12, lx: .3, ly: .98, lz: .1 }),
  finish: Object.freeze({ tw: .32, pi: -.05, ro: -.03, hx: .02, hy: .04, hz: .05,
    bx: 0, by: 0, bz: .03, brx: .25, bry: 0, fx: 0, fy: 0, fz: .03, frx: .2, fry: 0, lx: .5, ly: .8, lz: -.14 }),
});
// Racchetta (riferimento della radice, m e rad): solo lontano dall'impatto.
//   prep = scostamento della preparazione: racchetta alta accanto alla testa (fotogrammi 6–10);
//   fin  = posa del finale (non uno scostamento): mano alla spalla opposta, racchetta avvolta all'indietro sopra la
//          spalla (fotogrammi 58–66). La racchetta di sempre ci passa e torna subito in attesa; qui ci resta finché dura
//          il finale del corpo.
export const FV_RACKET = Object.freeze({
  prep: Object.freeze({ x: .02, y: .3, z: .02, rx: .25, ry: 0, rz: -.45 }),
  fin:  Object.freeze({ x: .4, y: 1.36, z: .1, rx: .1, ry: .93, rz: -1.2 }),
});

// Pesi «bersaglio» delle tre pose in un istante (prima del filtro). charge: carica della preparazione dal lato del
// dritto (0 se non si prepara un dritto); l: frazione dello swing di dritto in corso (null se non c'è); after: secondi
// dalla fine dell'ultimo dritto (null se è passato o non c'è stato). Scrive in out {coil, drive, finish} e lo restituisce.
export function fvTargets(out, charge, l, after){
  if (l != null){
    out.coil = 1 - ss(l, .14, .26);
    out.drive = ss(l, .16, FV.contact)*(1 - ss(l, .4, .62));
    out.finish = ss(l, .38, .62);
  } else {
    out.coil = ss(charge, FV.charge[0], FV.charge[1]);
    out.drive = 0;
    out.finish = after != null ? 1 - ss(after, FV.hold, FV.hold + FV.release) : 0;
  }
  return out;
}
// Peso della posa del finale della racchetta: dentro lo swing in funzione della sua frazione (zero fino alla fine della
// zona libera, piena quando la racchetta di sempre arriva al suo finale, a 0,72), poi resta e si scioglie con il finale
// del corpo (after: secondi dalla fine dello swing).
export const fvRacketFinish = (l, after) => (l != null ? (l > FV.racketFree[1] ? ss(l, .5, .74) : 0) : after != null ? 1 - ss(after, FV.hold, FV.hold + FV.release) : 0);
// Peso della preparazione della racchetta dentro lo swing: da quello che aveva alla partenza a zero prima della zona libera.
export const fvRacketPrep = (l, atStart) => (l < FV.racketFree[0] ? atStart*(1 - ss(l, .02, FV.racketFree[0])) : 0);
// Altezza del saltello di recupero (m) t secondi dopo l'impatto.
export function fvHop(t){
  const u = (t - FV.hop.from)/FV.hop.len;
  if (!(u > 0 && u < 1)) return 0;
  const s = Math.sin(Math.PI*u);
  return FV.hop.up*s*s;
}
// È un dritto della prova? Topspin (anche palla corta, che usa lo stesso swing) e piatto dal lato del dritto; non il
// tagliato, il pallonetto, la schiacciata e il servizio, che sono altri colpi.
export const fvIsForehand = T => !!(T && T.swingActive && T.swingSide === 'forehand' && !T.isServe && (T.swingShotType === 'topspin' || T.swingShotType === 'flat'));

/* ---------- stato per personaggio ---------- */
const newState = () => ({
  coil: 0, drive: 0, finish: 0, still: 1, hop: 0, rPrep: 0, rPrep0: 0, rFin: 0,   // pesi (filtrati)
  swinging: false, any: false, after: null, hit: false, sinceHit: 0,              // fase
  live: false, hand: false, bx: 0, by: 0, bz: 0,                                  // corpo: mano libera di base da rimettere
  ox: NaN, oy: NaN, oz: NaN,                                                      // racchetta: ultima posizione scritta
});
function rest(s){
  s.coil = s.drive = s.finish = s.hop = s.rPrep = s.rPrep0 = s.rFin = 0; s.still = 1;
  s.swinging = s.any = s.hit = s.live = false; s.after = null; s.sinceHit = 0; s.ox = s.oy = s.oz = NaN;
}
const TGT = { coil: 0, drive: 0, finish: 0 };
const follow = (v, to, dt, tau) => v + (to - v)*(1 - Math.exp(-dt/tau));
const firstPerson = actor => { const h = actor.natpfFirstPersonHidden; return !!(h && h[0] && h[0].visible === false); };

// Prima dell'animazione del corpo (dopo racket_kinematics): aggiorna i pesi e sposta la racchetta lontano dall'impatto.
export function fvPre(actor, rig, dt){
  let s = rig.natpfFv;
  // la mano libera dell'animazione di sempre riparte da dove l'aveva lasciata lei (il suo passo dipende dal precedente)
  if (s && s.hand){ rig.handLPivot.position.set(s.bx, s.by, s.bz); s.hand = false; }
  if (!forehandVideoEnabled()){ if (s && (s.live || s.rPrep || s.after != null)) rest(s); return; }
  const T = actor.racketKinematics;
  if (!T) return;
  if (!s) s = rig.natpfFv = newState();
  const fh = fvIsForehand(T), l = fh ? T.swingProgress : null, busy = !!(rig.reaction && rig.reaction.active);
  // ogni swing che parte (di qualunque colpo) trova il personaggio a terra: il saltello alza anche la racchetta, e
  // all'impatto la racchetta deve stare dov'era prima
  if (T.swingActive && !s.any){ s.hit = false; s.hop = 0; }
  s.any = !!T.swingActive;
  if (fh){
    if (!s.swinging){ s.rPrep0 = s.rPrep; s.hit = false; }
    if (!s.hit && l >= FV.contact){ s.hit = true; s.sinceHit = 0; }
    s.after = 0;
  } else if (s.after != null){
    s.after += dt;
    if (s.after > FV.hold + FV.release || busy) s.after = null;
  }
  s.swinging = fh;
  if (s.hit){ s.sinceHit += dt; if (s.sinceHit > FV.hop.from + FV.hop.len + .1) s.hit = false; }
  const charge = !fh && !busy && !T.swingActive && T.anticipationSide === 'forehand' ? T.anticipationCharge : 0;
  fvTargets(TGT, charge, l, fh ? null : s.after);
  if (busy) TGT.coil = TGT.drive = TGT.finish = 0;   // esultanza o delusione a fine punto: solo quelle
  s.coil = follow(s.coil, TGT.coil, dt, TGT.coil > s.coil ? FV.tau.coil : FV.tau.uncoil);
  s.drive = follow(s.drive, TGT.drive, dt, FV.tau.drive);
  s.finish = follow(s.finish, TGT.finish, dt, FV.tau.finish);
  s.hop = follow(s.hop, s.hit ? fvHop(s.sinceHit) : 0, dt, FV.tau.hop);
  const v = actor.vel ? Math.hypot(actor.vel.x, actor.vel.z) : 0;
  s.still = follow(s.still, 1 - ss(v, FV.run[0], FV.run[1]), dt, FV.tau.still);
  s.live = s.coil > 1e-4 || s.drive > 1e-4 || s.finish > 1e-4 || s.hop > 1e-5;
  if (!s.live && !TGT.coil && !TGT.drive && !TGT.finish) s.coil = s.drive = s.finish = s.hop = 0;
  // racchetta: preparazione alta (con un piccolo ritardo, come le pose) e finale avvolto; niente nella zona libera del
  // dritto e niente del tutto durante gli swing degli altri colpi (rovescio, servizio, schiacciata, tagliato,
  // pallonetto), che ritrovano la racchetta di sempre dal primo fotogramma
  const other = !fh && !!T.swingActive;
  s.rPrep = fh ? fvRacketPrep(l, s.rPrep0) : other ? 0 : follow(s.rPrep, TGT.coil, dt, FV.tau.racket);
  if (s.rPrep < 1e-4 && !TGT.coil) s.rPrep = 0;
  s.rFin = fh ? fvRacketFinish(l, null) : other || busy ? 0 : fvRacketFinish(null, s.after);
  const rp = actor.racketPivot, a = s.rPrep, b = s.rFin;
  if (rp && (a || b) && !busy && !firstPerson(actor)){
    const p = rp.position, r = rp.rotation, A = FV_RACKET.prep, B = FV_RACKET.fin;
    // una volta sola per posa calcolata da racket_kinematics (se nessuno l'ha riscritta, è già spostata)
    if (!(p.x === s.ox && p.y === s.oy && p.z === s.oz)){
      p.x += a*A.x; p.y += a*A.y; p.z += a*A.z; r.x += a*A.rx; r.y += a*A.ry; r.z += a*A.rz;
      p.x += b*(B.x - p.x); p.y += b*(B.y - p.y); p.z += b*(B.z - p.z);
      r.x += b*(B.rx - r.x); r.y += b*(B.ry - r.y); r.z += b*(B.rz - r.z);
      s.ox = p.x; s.oy = p.y; s.oz = p.z;
    }
  }
}

let wc = 0, wd = 0, wf = 0;
const mix = k => wc*FV_POSE.coil[k] + wd*FV_POSE.drive[k] + wf*FV_POSE.finish[k];
// Dopo l'animazione del corpo: aggiunge le pose a bacino, piedi, testa, mano libera e il saltello.
export function fvPost(actor, rig){
  const s = rig.natpfFv;
  if (!s || !s.live || !forehandVideoEnabled()) return;
  wc = s.coil; wd = s.drive; wf = s.finish;
  const k = s.still, kh = .35 + .65*k, hip = rig.hipPivot, tw = mix('tw');
  hip.rotation.x += mix('pi'); hip.rotation.y += tw; hip.rotation.z += mix('ro');
  hip.position.x += mix('hx')*kh; hip.position.y += mix('hy')*kh; hip.position.z += mix('hz')*kh;
  // la testa resta sulla palla: il collo riprende la rotazione in più del busto
  const neck = rig.neckPivot.rotation;
  neck.y = clamp(neck.y - tw*FV.head, -FV.headMax, FV.headMax);
  // piedi: dietro quello dal lato della racchetta (footLPivot del rig sta a x < 0), davanti l'altro; in corsa restano i passi
  const fb = rig.footLPivot, ff = rig.footRPivot;
  fb.position.x += mix('bx')*k; fb.position.y += mix('by')*k; fb.position.z += mix('bz')*k;
  fb.rotation.x += mix('brx')*k; fb.rotation.y += mix('bry')*k;
  ff.position.x += mix('fx')*k; ff.position.y += mix('fy')*k; ff.position.z += mix('fz')*k;
  ff.rotation.x += mix('frx')*k; ff.rotation.y += mix('fry')*k;
  // mano libera: dalla posizione dell'animazione di sempre (tenuta da parte per il fotogramma dopo) verso le pose
  const h = rig.handLPivot.position, sum = wc + wd + wf, g = sum > 1 ? 1/sum : 1;
  s.bx = h.x; s.by = h.y; s.bz = h.z; s.hand = true;
  h.x += g*(mix('lx') - sum*s.bx); h.y += g*(mix('ly') - sum*s.by); h.z += g*(mix('lz') - sum*s.bz);
  // saltello di recupero: tutto il personaggio (radice), ombra a terra compresa; non in prima persona (lì si vedono solo
  // racchetta e avambracci, che restano quelli di sempre)
  const up = firstPerson(actor) ? 0 : s.hop*k;
  if (up > 0){
    actor.root.position.y += up; rig.verticalHopOffset += up;
    if (actor.shadowBlob) actor.shadowBlob.scale.setScalar(clamp(1 - rig.verticalHopOffset*.85, .72, 1.06));
  }
}
