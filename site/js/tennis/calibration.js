// Calibrazione guidata del telefono-racchetta. Senza DOM: la usa la pagina del telefono, il computer ne mostra i passi.
// Passi: fermo (deriva del giroscopio) → impugnatura (telefono in verticale, dalla gravità) → 6 swing guidati
// (3 da destra a sinistra, 3 da sinistra a destra) con esito subito per ognuno → riepilogo → prova libera → conferma.
// Dagli swing veri escono le soglie su misura (colpo tipico, soglia d'inizio, picco minimo) e l'asse del colpo, che dice
// la direzione. Se non va (movimenti troppo piccoli, direzioni non distinguibili, nessun movimento) si spiega cosa fare
// e la partita col telefono non parte.
import { unit, dot } from './swing-detect.js';

export const PLAN = ['L', 'L', 'L', 'R', 'R', 'R'];      // L: da destra a sinistra (←), R: da sinistra a destra (→)
const SIGN = { L: 1, R: -1 };
export const CAL = {
  low: { on: 90, minPeak: 140, minAngle: 9 },  // soglie basse durante la calibrazione: si vedono anche i movimenti piccoli
  small: 200,                      // °/s: sotto, lo swing è troppo piccolo
  burst: 380,                      // ms: movimenti vicini sono un solo tentativo (apertura + colpo): vale il più forte
  maxTries: 3,                     // tentativi per swing prima di andare avanti segnando l'errore
  idleHint: 7000,                  // ms senza movimenti: suggerimento
  gripHold: 400,                   // ms in verticale per confermare l'impugnatura
};
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1)/2] : (s[s.length/2 - 1] + s[s.length/2])/2) : 0; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// telefono in verticale: la gravità sta lungo l'asse lungo del telefono (y)
export const upright = g => !!g && Math.abs(g[1])/Math.max(1e-6, Math.hypot(g[0], g[1], g[2])) >= .72;

export function createCalibration(det){
  const L = [];
  const S = { step: 'idle', idx: 0, tries: 0, attempts: [], axis: null, result: null, profile: null, burst: [], burstT: 0, idleT: 0, gripT: null, lastT: 0 };
  const emit = e => { for (const f of L) f({ ...e, step: S.step }); };

  det.on('status', s => {
    if (S.step !== 'still') return;
    if (s.s === 'move') emit({ kind: 'warn', why: 'move' });
    if (s.s === 'still-ok'){ S.step = 'grip'; S.gripT = null; emit({ kind: 'step', gravity: s.gravity, upright: upright(s.gravity) }); }
  });
  det.on('swing', sw => {
    if (S.step !== 'swings' && S.step !== 'free') return;
    S.burst.push(sw); S.burstT = sw.peakT; S.idleT = sw.peakT;
  });

  // un tentativo = il movimento più forte di un gruppo ravvicinato (così l'apertura non conta come colpo)
  function attempt(sw){
    const along = S.axis ? dot(sw.axis, S.axis) : null;
    if (S.step === 'free'){
      const dir = along == null ? 0 : along > .25 ? 1 : along < -.25 ? -1 : 0;
      emit({ kind: 'free', dir: dir > 0 ? 'L' : dir < 0 ? 'R' : '?', peak: sw.peak, strength: sw.peak/(S.profile ? S.profile.ref : 600), ok: sw.peak >= CAL.small && dir !== 0 });
      return;
    }
    const want = PLAN[S.idx];
    let dir = '?';
    if (!S.axis && S.idx === 0) { S.axis = sw.axis.slice(); dir = 'L'; }      // il primo swing (da destra a sinistra) fissa il verso
    else if (along != null) dir = along > .3 ? 'L' : along < -.3 ? 'R' : '?';
    const small = sw.peak < CAL.small, ok = !small && dir === want;
    const a = { want, dir, peak: sw.peak, lift: sw.lift, axis: sw.axis, ok, small };
    S.attempts.push(a);
    if (ok){
      // asse aggiornato con tutti gli swing riusciti (con il loro segno)
      const sum = [0, 0, 0];
      for (const x of S.attempts) if (x.ok) for (let i = 0; i < 3; i++) sum[i] += x.axis[i]*SIGN[x.want];
      S.axis = unit(sum);
    } else if (S.idx === 0 && small) S.axis = null;
    S.tries = ok ? 0 : S.tries + 1;
    const advance = ok || S.tries >= CAL.maxTries;
    emit({ kind: 'attempt', ...a, axis: undefined, idx: S.idx, tries: S.tries, why: ok ? null : small ? 'piccolo' : 'direzione' });
    if (advance){ S.idx++; S.tries = 0; if (S.idx >= PLAN.length) review(); else emit({ kind: 'next', idx: S.idx, want: PLAN[S.idx] }); }
  }
  function review(){
    const ok = S.attempts.filter(a => a.ok), okL = ok.filter(a => a.want === 'L'), okR = ok.filter(a => a.want === 'R');
    const medL = median(okL.map(a => a.peak)), medR = median(okR.map(a => a.peak)), base = Math.min(medL || 1e9, medR || 1e9);
    const pass = okL.length >= 2 && okR.length >= 2;
    const fails = S.attempts.filter(a => !a.ok);
    const why = pass ? null : fails.some(a => a.small) && fails.filter(a => a.small).length >= fails.length/2 ? 'piccolo' : 'direzione';
    S.profile = pass ? {
      bias: det.profile.bias, axis: S.axis, ref: Math.max(250, median(ok.map(a => a.peak))),
      on: clamp(.3*base, 100, 240), minPeak: clamp(.42*base, 150, 380), minAngle: 16,
      lobLift: ok.some(a => a.lift) ? Math.max(.7, median(ok.map(a => a.lift)) + .45) : null,
    } : null;
    S.result = { pass, why, okL: okL.length, okR: okR.length, medL: Math.round(medL), medR: Math.round(medR), attempts: S.attempts.map(a => ({ want: a.want, dir: a.dir, peak: a.peak, ok: a.ok })) };
    S.step = 'review';
    emit({ kind: 'review', ...S.result });
  }

  return {
    get state(){ return S; },
    on(f){ L.push(f); return this; },
    start(){
      Object.assign(S, { step: 'still', idx: 0, tries: 0, attempts: [], axis: null, result: null, profile: null, burst: [], idleT: S.lastT });
      det.setProfile({ bias: [0, 0, 0], ...CAL.low, axis: null }); det.still();
      emit({ kind: 'step' });
    },
    skipGrip(){ if (S.step === 'grip'){ S.step = 'swings'; S.idleT = S.lastT; emit({ kind: 'step', want: PLAN[0], idx: 0 }); } },
    retry(){ Object.assign(S, { step: 'swings', idx: 0, tries: 0, attempts: [], axis: null, result: null, profile: null, burst: [], idleT: S.lastT }); det.setThresholds({ ...CAL.low, axis: null }); emit({ kind: 'step', want: PLAN[0], idx: 0 }); },
    // prova libera con il profilo proposto: direzione e forza di ogni swing, prima di confermare
    tryFree(){ if (!S.profile) return; S.step = 'free'; det.setProfile(S.profile); emit({ kind: 'step' }); },
    confirm(){ if (!S.profile) return null; det.setProfile(S.profile); S.step = 'done'; emit({ kind: 'done', profile: S.profile }); return S.profile; },
    // da chiamare a ogni campione: impugnatura, gruppi di movimenti, suggerimenti se non arriva nulla
    tick(t, sample){
      S.lastT = t;
      if (S.step === 'grip'){
        const up = upright(sample && sample.accG);
        if (up){ if (S.gripT == null) S.gripT = t; if (t - S.gripT >= CAL.gripHold){ S.step = 'swings'; S.idleT = t; emit({ kind: 'step', want: PLAN[0], idx: 0 }); } }
        else if (S.gripT != null){ S.gripT = null; emit({ kind: 'grip', upright: false }); }
        if (!up && (t - (S.gripWarnT || 0) > 1000)){ S.gripWarnT = t; emit({ kind: 'grip', upright: false }); }
      }
      if (S.burst.length && t - S.burstT >= CAL.burst){
        const best = S.burst.reduce((a, s) => s.peak > a.peak ? s : a);
        S.burst = []; attempt(best);
      }
      if ((S.step === 'swings') && t - S.idleT > CAL.idleHint){ S.idleT = t; emit({ kind: 'idle' }); }
    },
  };
}
