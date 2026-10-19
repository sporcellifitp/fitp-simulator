// Riconoscimento del colpo dai sensori del telefono (giroscopio e accelerometro del browser). Senza DOM: testabile con Node.
//
// Pipeline: campione → togli la deriva del giroscopio → modulo della velocità di rotazione → media mobile esponenziale
// leggera (circa 1 campione di ritardo, solo contro i picchi spuri) → inizio del colpo sopra la soglia «on» → il colpo
// parte appena passato il picco (o dopo 40 ms di velocità costante) → pausa breve (170 ms) contro i doppi picchi.
// Cosa si manda al gioco: l'istante del picco (è l'impatto), la potenza (picco rispetto al colpo tipico di chi gioca),
// la direzione (destra→sinistra o sinistra→destra, dall'asse di rotazione imparato in calibrazione) e il verso verticale.
// La calibrazione raccoglie i candidati. In partita si filtra la preparazione con il profilo
// personale e si aspetta il recupero prima di accettare un nuovo colpo.
// Le soglie vengono dal profilo di calibrazione (calibration.js): si adattano a chi gioca, non solo «più sensibile».

import { gestureFloor, canonicalTwist } from './gesture-intent.js';
const len = v => Math.hypot(v[0], v[1], v[2]);
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const unit = v => { const l = len(v); return l > 1e-9 ? v.map(x => x/l) : [0, 0, 0]; };

export const DEFAULTS = {
  on: 140,          // °/s: sopra questa velocità di rotazione inizia un colpo
  minPeak: 230,     // °/s: picco minimo perché sia un colpo
  minAngle: 18,     // gradi percorsi almeno (scarta i tremolii)
  minDur: 30,       // ms
  maxDur: 700,      // ms: oltre è un movimento lento, non un colpo
  refractory: 170,  // ms dopo un colpo in cui non ne parte un altro (doppi picchi dello stesso gesto)
  plateau: 40,      // ms di velocità senza nuovo massimo: il picco è passato
  smooth: .55,      // peso del campione nuovo nella media mobile
  stillMax: 35,     // °/s di rumore accettato col telefono fermo
  stillTime: 600,
  recover: 300, quiet: 70, gap: 140,   // ms di calibrazione da fermo
  prepHold: 250,    // ms (modalità preparazione): un gesto nel verso opposto al colpo atteso aspetta così prima di valere
  prepMax: 700,     // ms: oltre, il gesto trattenuto vale comunque come colpo
};
// profilo di chi gioca (dalla calibrazione): deriva, asse del colpo (+ = da destra a sinistra), colpo tipico, soglie
export const defaultProfile = () => ({ bias: [0, 0, 0], axis: null, ref: 600, on: DEFAULTS.on, minPeak: DEFAULTS.minPeak, minAngle: DEFAULTS.minAngle, lobLift: null, sens: 1, refs: null, preparation: null, minAngles: null, intentGate: false });

// La durata è in millisecondi, come i timestamp del sensore.
export function classifySwingType({ power = .6, lift = 0, dur = 999 } = {}, lobLift = null){
  // A short/weak swing is not an intentional drop shot; select it on the phone.
  const drop = false;
  const slice = !drop && lift <= -.65;
  const lob = (lobLift != null && lift >= lobLift) || lift >= .7;
  return { drop, slice, lob };
}

export function createSwingDetector(opts = {}){
  const C = { ...DEFAULTS, ...opts };
  let prof = defaultProfile();
  let training = false, armed = true, recovering = false, quietSince = null, phase = 'ready';
  let context = 'play';
  // Modalità preparazione (facoltativa, la chiede il gioco): prima del colpo si porta indietro la racchetta, cioè ci si
  // muove nel verso opposto al colpo. Se il gioco dice da che parte arriva la palla (expect: +1/-1, verso del colpo
  // atteso), un gesto nel verso opposto non parte subito: se entro poco arriva il gesto nel verso giusto era una
  // preparazione (evento 'prep'), altrimenti vale come colpo con il suo istante del picco (il tempo resta giusto).
  let prepMode = false, expectDir = 0, held = null;
  let mode = 'run', still = null, cur = null, lastFire = -1e9, lastT = null, sm = 0, last = null;
  const listeners = { swing: [], status: [], sample: [], phase: [], prep: [] };
  const emit = (k, v) => { for (const f of listeners[k]) f(v); };
  const serving = () => context === 'serve' || context === 'toss';
  const thr = () => {
    const examples = (prof.templates || []).filter(t => !serving() || t.shot === 'serve');
    const ref = examples.length ? Math.min(...examples.map(t => t.peak)) : serving() ? prof.ref*.5 : Infinity;
    return { on: Math.max((prof.noise || 1)*4, Math.min(prof.on,ref*.2))*prof.sens,
      minPeak: Math.max((prof.noise || 1)*5,Math.min(prof.minPeak,ref*.28))*prof.sens };
  };

  const setPhase = value => { if (phase !== value){ phase = value; emit('phase', value); } };
  const reset = () => { cur = null; sm = 0; lastT = null; recovering = false; quietSince = null; held = null; setPhase('ready'); };

  // campione: { t (ms), rot: [α,β,γ] °/s | null, acc: [x,y,z] m/s² senza gravità | null, accG: con gravità | null }
  function feed(k){
    if (!k || !Number.isFinite(k.t) || (lastT != null && k.t <= lastT)) return;
    if (lastT != null && k.t - lastT > C.gap){ reset(); if (mode === 'still') still = null; }
    const dt = lastT == null ? 10 : Math.max(1, Math.min(60, k.t - lastT)); lastT = k.t;
    // gesto trattenuto: vale come colpo se non è arrivato il gesto opposto (si aspetta ancora se è in corso)
    if (held && k.t >= held.until){
      const pending = cur && !cur.fired && dot(unit(cur.peakW), held.sw.axis) < -.3 && k.t - held.sw.peakT < C.prepMax;
      if (!pending){ const h = held; held = null; commit(h.sw); }
    }
    last = k;
    const w = k.rot ? [k.rot[0] - prof.bias[0], k.rot[1] - prof.bias[1], k.rot[2] - prof.bias[2]] : null;
    const mag = w ? len(w) : (k.acc ? len(k.acc)*30 : 0);       // senza giroscopio: accelerazione in scala simile
    sm = sm + (mag - sm)*C.smooth;
    if (mode === 'still') return feedStill(k);
    if (mode !== 'run') return;
    const T = thr();
    if (recovering && !serving()){
      if (k.t-lastFire>100) setPhase('follow');
      if (sm < T.on*.65){ if (quietSince == null) quietSince = k.t; } else quietSince = null;
      if (quietSince == null || k.t - quietSince < C.quiet || k.t - lastFire < C.recover) return;
      recovering = false; setPhase('ready');
    }
    if (!training && prof.intentGate && !armed && !serving()) { cur = null; setPhase('preparation'); return; }
    if (cur && w && dot(unit(w), unit(cur.peakW)) < -.3 && mag > T.on){ cur = null; sm = mag*C.smooth; }
    if (!cur){
      if (k.t - lastFire < C.refractory || sm < T.on) return;
      setPhase('preparation');
      cur = { t0: k.t, peak: 0, peakT: k.t, peakW: w || [0, 0, 0], gravity: null, angle: 0, up: 0, tot: 0, fired: false };
    }
    cur.angle += mag*dt/1000;
    if (sm > cur.peak){ cur.peak = sm; cur.peakT = k.t; if (w) cur.peakW = w; if(k.accG) cur.gravity=unit(k.accG.map((v,i)=>v-(k.acc?.[i]||0))); }
    if (!cur.fired && k.acc && k.accG){
      const g = [k.accG[0] - k.acc[0], k.accG[1] - k.acc[1], k.accG[2] - k.acc[2]], gl = len(g);
      if (gl > 5){ cur.up += dot(k.acc, g)/gl*dt; cur.tot += len(k.acc)*dt; }
    }
    const minAngle = serving() ? Math.min(2.5,prof.minAngle) : Math.min(prof.minAngle,...(prof.templates||[]).map(t=>Math.max(2,t.angle*.35)));
    const ready = cur.peak >= T.minPeak && cur.angle >= minAngle && k.t - cur.t0 >= C.minDur;
    if (!cur.fired && ready && (sm < cur.peak*.9 || k.t - cur.peakT >= C.plateau)){ cur.fired = true; fire(k.t); }
    if (sm < T.on*.6 || k.t - cur.t0 > C.maxDur){ cur = null; }
  }
  function feedStill(k){
    if (!still) still = { t0: k.t, n: 0, sum: [0, 0, 0], max: 0, g: [0, 0, 0] };
    if (k.rot){ for (let i = 0; i < 3; i++) still.sum[i] += k.rot[i]; still.n++; still.max = Math.max(still.max, len(k.rot)); }
    if (k.accG) for (let i = 0; i < 3; i++) still.g[i] += k.accG[i];
    if (still.max > C.stillMax){ still = null; emit('status', { s: 'move' }); return; }
    if (k.t - still.t0 >= C.stillTime){
      if (still.n) prof.bias = still.sum.map(v => v/still.n);
      prof.noise = still.n ? Math.max(1, still.max - len(prof.bias)) : 5;
      const g = unit(still.g);
      prof.gravity = g;
      still = null; mode = 'run'; emit('status', { s: 'still-ok', gravity: g });
    }
  }
  function fire(t){
    const c = cur, axis = unit(c.peakW);
    const lift = c.tot > 0 ? Math.max(-1, Math.min(1, c.up/c.tot*1.6)) : 0;
    const along = prof.axis ? dot(axis, prof.axis) : 0;
    const dir = !prof.axis ? 0 : along > .25 ? 1 : along < -.25 ? -1 : 0;   // +1 da destra a sinistra, -1 da sinistra a destra
    const serveExamples=(prof.templates||[]).filter(t=>t.shot==='serve');
    const reference = prof.refs?.[dir] || prof.ref;
    const powerReference=serving() && serveExamples.length ? serveExamples.reduce((s,t)=>s+t.peak,0)/serveExamples.length:reference;
    const gravity=c.gravity||prof.gravity||[0,1,0];
    const dur = t - c.t0;
    const features={lift,tilt:Math.max(-1,Math.min(1,gravity[2]-(prof.gravity?.[2]||0))),twist:canonicalTwist(axis,prof.axis,gravity,dir),speed:c.peak/reference,duration:dur,travel:c.angle/(prof.refAngle||c.angle||1)};
    const intent=gestureFloor(prof,dir,features,context);
    const floor=prof.intentGate&&!serving()?thr().minPeak:Math.max(thr().minPeak,intent.floor*prof.sens);
    const minAngle=serving()?2:Math.min(prof.minAngles?.[dir]||prof.minAngle,...(prof.templates||[]).filter(t=>t.shot===intent.shot).map(t=>Math.max(2,t.angle*.35)));
    if (!training && ((prof.axis && dir === 0 && !serving() && !(context==='practice' && intent.shot==='serve')) || c.peak < floor || c.angle < minAngle)){
      setPhase('preparation');
      // movimento troppo piccolo per un colpo: in modalità preparazione è la racchetta che si carica
      if (prepMode && dir !== 0 && !serving()) emit('prep', { peakT: c.peakT, dir, peak: Math.round(c.peak), angle: Math.round(c.angle), small: true });
      return;
    }
    const power = Math.max(.3, Math.min(1, .3 + .45*c.peak/powerReference));
    // Soglie iniziali di palla corta e slice; la durata del sensore è in millisecondi.
    const special = classifySwingType({ power, lift, dur }, prof.lobLift);
    const sw = { phase: 'contact', peakT: c.peakT, t, peak: Math.round(c.peak), power: +power.toFixed(3), dir, along: +along.toFixed(2), axis, gravity, lift: +lift.toFixed(3), ...special, ...intent, features, angle: Math.round(c.angle), dur };
    if (prepMode && !training && !serving()){
      // un gesto trattenuto e ora quello opposto: il primo era la preparazione
      if (held && dir !== 0 && dir === -held.sw.dir){ emit('prep', { peakT: held.sw.peakT, dir: held.sw.dir, peak: held.sw.peak, angle: held.sw.angle }); held = null; }
      else if (held){ const h = held; held = null; commit(h.sw); }
      if (expectDir && dir === -expectDir){ held = { sw, until: c.peakT + C.prepHold }; setPhase('preparation'); return; }
    }
    commit(sw);
  }
  function commit(sw){
    lastFire = sw.peakT;
    if (!training){ recovering = !serving(); quietSince = null; setPhase('contact'); }
    emit('swing', sw);
  }

  return {
    config: C,
    get profile(){ return prof; },
    get mode(){ return mode; },
    get phase(){ return phase; },
    get context(){return context;},
    setContext(value){ const next=['serve','toss','practice'].includes(value)?value:'play';if(context!==next){context=next;reset();} },
    setTraining(v){ training = !!v; reset(); },
    setArmed(v){ armed = !!v; if (!armed) cur = null; },
    // modalità preparazione e verso del colpo atteso (+1 da destra a sinistra, -1 da sinistra a destra, 0 non si sa)
    setPrepMode(v){ prepMode = !!v; if (!prepMode){ expectDir = 0; held = null; } },
    setExpect(d){ expectDir = d === 1 ? 1 : d === -1 ? -1 : 0; },
    get prepMode(){ return prepMode; },
    get last(){ return last; },
    on(k, f){ listeners[k].push(f); return this; },
    feed,
    // telefono fermo: deriva e rumore del giroscopio, verso della gravità (come si tiene il telefono)
    still(){ mode = 'still'; still = null; cur = null; },
    setProfile(p){ prof = { ...defaultProfile(), ...p, bias: p.bias || prof.bias }; armed = !prof.intentGate; reset(); },
    setThresholds(t){ prof = { ...prof, ...t }; },
    setSensitivity(k){ prof = { ...prof, sens: k }; },      // k < 1 più sensibile
    stop(){ mode = 'off'; reset(); },
    run(){ mode = 'run'; reset(); },
  };
}

// dai dati di un evento devicemotion del browser a un campione per il rilevatore
export function sampleFromMotion(e, t){
  const r = e.rotationRate, a = e.acceleration, g = e.accelerationIncludingGravity;
  const ok3 = v => v && [v.x ?? v.alpha, v.y ?? v.beta, v.z ?? v.gamma].every(n => typeof n === 'number' && isFinite(n));
  return {
    t,
    rot: r && ok3(r) ? [r.alpha, r.beta, r.gamma] : null,
    acc: a && ok3(a) ? [a.x, a.y, a.z] : null,
    accG: g && ok3(g) ? [g.x, g.y, g.z] : null,
  };
}
export { len, dot, unit };
