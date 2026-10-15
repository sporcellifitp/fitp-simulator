// Riconoscimento del colpo dai sensori del telefono (giroscopio e accelerometro del browser). Senza DOM: testabile con Node.
//
// Pipeline: campione → togli la deriva del giroscopio → modulo della velocità di rotazione → media mobile esponenziale
// leggera (circa 1 campione di ritardo, solo contro i picchi spuri) → inizio del colpo sopra la soglia «on» → il colpo
// parte appena passato il picco (o dopo 40 ms di velocità costante) → pausa breve (170 ms) contro i doppi picchi.
// Cosa si manda al gioco: l'istante del picco (è l'impatto), la potenza (picco rispetto al colpo tipico di chi gioca),
// la direzione (destra→sinistra o sinistra→destra, dall'asse di rotazione imparato in calibrazione) e il verso verticale.
// Non si cerca di distinguere apertura e colpo qui: il gioco sceglie lo swing più vicino all'arrivo della palla
// (match/arcade.js), quindi un'apertura o il ritorno del braccio non rubano il colpo.
// Le soglie vengono dal profilo di calibrazione (calibration.js): si adattano a chi gioca, non solo «più sensibile».

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
  stillTime: 600,   // ms di calibrazione da fermo
};
// profilo di chi gioca (dalla calibrazione): deriva, asse del colpo (+ = da destra a sinistra), colpo tipico, soglie
export const defaultProfile = () => ({ bias: [0, 0, 0], axis: null, ref: 600, on: DEFAULTS.on, minPeak: DEFAULTS.minPeak, minAngle: DEFAULTS.minAngle, lobLift: null, sens: 1 });

export function createSwingDetector(opts = {}){
  const C = { ...DEFAULTS, ...opts };
  let prof = defaultProfile();
  let mode = 'run', still = null, cur = null, lastFire = -1e9, lastT = null, sm = 0, last = null;
  const listeners = { swing: [], status: [], sample: [] };
  const emit = (k, v) => { for (const f of listeners[k]) f(v); };
  const thr = () => ({ on: prof.on*prof.sens, minPeak: prof.minPeak*prof.sens });

  // campione: { t (ms), rot: [α,β,γ] °/s | null, acc: [x,y,z] m/s² senza gravità | null, accG: con gravità | null }
  function feed(k){
    const dt = lastT == null ? 16 : Math.max(1, Math.min(60, k.t - lastT)); lastT = k.t;
    last = k;
    const w = k.rot ? [k.rot[0] - prof.bias[0], k.rot[1] - prof.bias[1], k.rot[2] - prof.bias[2]] : null;
    const mag = w ? len(w) : (k.acc ? len(k.acc)*30 : 0);       // senza giroscopio: accelerazione in scala simile
    sm = sm + (mag - sm)*C.smooth;
    if (mode === 'still') return feedStill(k);
    if (mode !== 'run') return;
    const T = thr();
    if (!cur){
      if (k.t - lastFire < C.refractory || sm < T.on) return;
      cur = { t0: k.t, peak: 0, peakT: k.t, peakW: w || [0, 0, 0], angle: 0, up: 0, tot: 0, fired: false };
    }
    cur.angle += mag*dt/1000;
    if (sm > cur.peak){ cur.peak = sm; cur.peakT = k.t; if (w) cur.peakW = w; }
    if (!cur.fired && k.acc && k.accG){
      const g = [k.accG[0] - k.acc[0], k.accG[1] - k.acc[1], k.accG[2] - k.acc[2]], gl = len(g);
      if (gl > 5){ cur.up += dot(k.acc, g)/gl*dt; cur.tot += len(k.acc)*dt; }
    }
    const ready = cur.peak >= T.minPeak && cur.angle >= prof.minAngle && k.t - cur.t0 >= C.minDur;
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
      const g = unit(still.g);
      still = null; mode = 'run'; emit('status', { s: 'still-ok', gravity: g });
    }
  }
  function fire(t){
    const c = cur, axis = unit(c.peakW);
    const lift = c.tot > 0 ? Math.max(-1, Math.min(1, c.up/c.tot*1.6)) : 0;
    const along = prof.axis ? dot(axis, prof.axis) : 0;
    const dir = !prof.axis ? 0 : along > .25 ? 1 : along < -.25 ? -1 : 0;   // +1 da destra a sinistra, -1 da sinistra a destra
    const power = Math.max(.3, Math.min(1, .3 + .45*c.peak/prof.ref));
    lastFire = c.peakT;
    const dur = t - c.t0;
    // Gestures compatti e controllati: palla corta. Taglio verso il basso: slice. Soglie iniziali da validare su hardware reale.
    const drop = dur <= .18 && power <= .55 && lift < .55;
    const slice = !drop && lift <= -.65;
    emit('swing', { peakT: c.peakT, t, peak: Math.round(c.peak), power: +power.toFixed(3), dir, along: +along.toFixed(2), axis, lift: +lift.toFixed(3), lob: prof.lobLift != null && lift >= prof.lobLift || lift >= .7, drop, slice, angle: Math.round(c.angle), dur });
  }

  return {
    config: C,
    get profile(){ return prof; },
    get mode(){ return mode; },
    get last(){ return last; },
    on(k, f){ listeners[k].push(f); return this; },
    feed,
    // telefono fermo: deriva e rumore del giroscopio, verso della gravità (come si tiene il telefono)
    still(){ mode = 'still'; still = null; cur = null; },
    setProfile(p){ prof = { ...defaultProfile(), ...p, bias: p.bias || prof.bias }; },
    setThresholds(t){ prof = { ...prof, ...t }; },
    setSensitivity(k){ prof = { ...prof, sens: k }; },      // k < 1 più sensibile
    stop(){ mode = 'off'; cur = null; },
    run(){ mode = 'run'; },
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
