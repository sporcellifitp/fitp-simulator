// Riconoscimento del colpo dai sensori del telefono (giroscopio e accelerometro del browser). Senza DOM: testabile con Node.
// Si leggono solo grandezze che i sensori danno davvero:
//  - velocità di rotazione (gradi/s): quando supera la soglia parte un colpo, il picco dà la potenza;
//  - asse di rotazione al picco, confrontato con quello del dritto di prova: dritto o rovescio;
//  - accelerazione lungo la verticale (gravità stimata dal browser): colpo dal basso in alto (lift > 0) o dall'alto (< 0).
// Calibrazione: 0,8 s col telefono fermo (deriva del giroscopio e rumore), poi un dritto di prova (asse e forza abituale).
// Protezioni: durata minima, angolo minimo percorso, pausa dopo ogni colpo (il ritorno del braccio non è un secondo colpo).

const len = v => Math.hypot(v[0], v[1], v[2]);
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];

export const DEFAULTS = {
  on: 220,          // °/s: sopra questa velocità di rotazione può iniziare un colpo
  off: 120,         // °/s: sotto, il colpo è finito
  minPeak: 380,     // °/s: picco minimo per contare come colpo (sensibilità)
  minAngle: 32,     // gradi percorsi almeno durante il colpo
  minDur: 35,       // ms
  maxDur: 650,      // ms: oltre è un movimento lento, non un colpo
  refractory: 380,  // ms di pausa dopo un colpo
  stillMax: 30,     // °/s: rumore massimo accettato durante la calibrazione da fermo
  stillTime: 800,   // ms di calibrazione da fermo
};

export function createSwingDetector(opts = {}){
  const C = { ...DEFAULTS, ...opts };
  const cal = { bias: [0, 0, 0], fhAxis: null, ref: 1100 };
  let mode = 'idle';                 // idle | still | practice | ready
  let still = null, cur = null, lastEnd = -1e9, lastT = null;
  const listeners = { swing: [], status: [] };
  const emit = (k, v) => { for (const f of listeners[k]) f(v); };

  function status(s, extra = {}){ emit('status', { s, ...extra }); }

  // campione: { t (ms), rot: [a,b,g] °/s | null, acc: [x,y,z] m/s² senza gravità | null, accG: [x,y,z] con gravità | null }
  function feed(k){
    const dt = lastT == null ? 16 : Math.max(1, Math.min(60, k.t - lastT)); lastT = k.t;
    const w = k.rot ? [k.rot[0] - cal.bias[0], k.rot[1] - cal.bias[1], k.rot[2] - cal.bias[2]] : null;
    const mag = w ? len(w) : (k.acc ? len(k.acc)*30 : 0);        // senza giroscopio: accelerazione in scala simile
    if (mode === 'still') return feedStill(k, mag);
    if (mode !== 'practice' && mode !== 'ready') return;
    if (!cur){
      if (k.t - lastEnd < C.refractory || mag < C.on) return;
      cur = { t0: k.t, peak: 0, peakT: k.t, peakW: w || [0, 0, 0], angle: 0, up: 0, tot: 0, fired: false };
    }
    cur.angle += mag*dt/1000;
    if (mag > cur.peak){ cur.peak = mag; cur.peakT = k.t; if (w) cur.peakW = w; }
    // verso del colpo rispetto alla verticale, solo nella fase di spinta (fino al picco)
    if (k.acc && k.accG && !cur.fired){
      const g = [k.accG[0] - k.acc[0], k.accG[1] - k.acc[1], k.accG[2] - k.acc[2]], gl = len(g);
      if (gl > 5){ cur.up += dot(k.acc, g)/gl*dt; cur.tot += len(k.acc)*dt; }
    }
    // il colpo parte appena passato il picco (la racchetta è all'impatto): così il ritardo è minimo
    if (!cur.fired && cur.peak >= C.minPeak && mag < cur.peak*.82 && k.t - cur.t0 >= C.minDur && cur.angle >= C.minAngle){
      cur.fired = true; fire(k.t);
    }
    if (mag < C.off || k.t - cur.t0 > C.maxDur){ lastEnd = k.t; cur = null; }
  }
  function feedStill(k, mag){
    if (!still) still = { t0: k.t, n: 0, sum: [0, 0, 0], max: 0 };
    if (k.rot){ for (let i = 0; i < 3; i++) still.sum[i] += k.rot[i]; still.n++; still.max = Math.max(still.max, len(k.rot)); }
    if (still.max > C.stillMax){ still = null; status('move'); return; }       // si è mosso: si ricomincia
    if (k.t - still.t0 >= C.stillTime){
      if (still.n) cal.bias = still.sum.map(v => v/still.n);
      still = null; mode = 'practice'; status('practice');
    }
  }
  function fire(t){
    const c = cur, axis = len(c.peakW) > 1 ? c.peakW.map(v => v/len(c.peakW)) : null;
    const lift = c.tot > 0 ? Math.max(-1, Math.min(1, c.up/c.tot*1.6)) : 0;
    if (mode === 'practice'){
      // il dritto di prova fissa l'asse del dritto e la forza di riferimento
      cal.fhAxis = axis; cal.ref = Math.max(700, Math.min(2000, c.peak*1.3));
      mode = 'ready'; status('ready', { peak: Math.round(c.peak) });
      return;
    }
    const power = Math.max(0, Math.min(1, (c.peak - C.minPeak*.8)/(cal.ref - C.minPeak*.8)));
    const side = cal.fhAxis && axis ? (dot(axis, cal.fhAxis) >= 0 ? 'fh' : 'bh') : null;
    emit('swing', { power: +power.toFixed(3), lift: +lift.toFixed(3), side, peak: Math.round(c.peak), peakT: c.peakT, t });
  }

  return {
    cal, config: C,
    get mode(){ return mode; },
    on(k, f){ listeners[k].push(f); return this; },
    feed,
    calibrate(){ mode = 'still'; still = null; cur = null; cal.fhAxis = null; status('still'); },
    skipPractice(){ if (mode === 'practice'){ mode = 'ready'; status('ready', { peak: 0 }); } },
    setSensitivity(k){ C.minPeak = DEFAULTS.minPeak*k; C.on = DEFAULTS.on*k; },   // k < 1 più sensibile
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
