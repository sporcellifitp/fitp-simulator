// Calibrazione del telefono vista dal computer: una funzione pura degli eventi del telefono (calibration.js).
// Il telefono decide i passi (fermo → due gesti → verifica); il computer mostra sempre lo stesso passo, con la
// stessa freccia, nello stesso momento. Prima il computer aveva un suo percorso (palla lanciata, rallentata, «gesto
// armato») che partiva dall'ultimo evento ricevuto: se il telefono era già ai gesti quando si entrava in campo la
// palla non partiva mai, e un gesto fatto prima della palla colpiva la palla del gesto dopo dal lato sbagliato.
//
// vista = { stage: 'off' | 'still' | 'gesture' | 'review' | 'done', idx, total, want: 'L' | 'R' | null,
//           ready (mano ferma: il telefono accetta il gesto), note (perché il telefono aspetta), last (ultimo tentativo),
//           hits, pass, why, seq (cresce a ogni evento che cambia ciò che si vede) }
// total: gesti del percorso rapido (QUICK_PLAN di calibration.js) finché il telefono non lo dice con il primo passo
export const CAL_VIEW_EMPTY = Object.freeze({ stage: 'off', idx: 0, total: 2, want: null, ready: false, note: null, last: null, hits: 0, pass: null, why: null, seq: 0 });

export function calReduce(v = CAL_VIEW_EMPTY, e = {}){
  const next = patch => ({ ...v, ...patch, seq: v.seq + 1 });
  switch (e.kind){
    case 'step':
      if (e.step === 'still' || e.step === 'grip') return next({ ...CAL_VIEW_EMPTY, stage: 'still', total: v.total, seq: v.seq });
      if ((e.step === 'swings' || e.step === 'shots') && e.want) return next({ stage: 'gesture', idx: e.idx ?? 0, total: e.total ?? v.total, want: e.want, ready: false, note: null, last: e.idx ? v.last : null, hits: e.idx ? v.hits : 0, pass: null, why: null });
      if (e.step === 'free') return v.stage === 'review' ? v : next({ stage: 'review', ready: false });
      return v;
    case 'next': return next({ stage: 'gesture', idx: e.idx ?? v.idx + 1, total: e.total ?? v.total, want: e.want ?? v.want, ready: false, note: null });
    case 'ready': return v.stage === 'gesture' ? next({ ready: true, note: null, want: e.want ?? v.want }) : v;
    case 'settle': return v.stage === 'gesture' ? next({ ready: false, note: 'centro' }) : v;
    case 'warn':
      if (e.why === 'centro') return v.stage === 'gesture' ? next({ ready: false, note: 'centro' }) : v;
      if (e.why === 'move' && v.stage === 'still') return next({ note: 'fermo' });
      return v;
    case 'idle': return v.stage === 'gesture' ? next({ note: 'idle' }) : v;
    case 'attempt': {
      const last = { idx: e.idx ?? v.idx, want: e.want ?? v.want, ok: !!e.ok, why: e.why || null, dir: e.dir || null, tries: e.tries || 0 };
      return next({ ready: false, note: null, last, hits: v.hits + (e.ok ? 1 : 0) });
    }
    case 'review': return next({ stage: 'review', ready: false, pass: !!e.pass, why: e.why || null });
    case 'done': return next({ stage: 'done', ready: false });
    default: return v;
  }
}

// Che cosa dice il computer in ogni momento (testi del pannello in campo), dalla vista e dalla mano di chi gioca.
// side: 'forehand' | 'backhand' del gesto chiesto («L» = da destra a sinistra: dritto del destro, rovescio del mancino)
export const calSide = (want, hand = 'right') => ((want === 'L') !== (hand === 'left') ? 'forehand' : 'backhand');
const ARROW = { L: '←', R: '→' };
const WHY = { piccolo: 'Gesto troppo piccolo: un colpetto un po’ più deciso', direzione: 'Era nell’altro verso' };
export function calPrompt(v, hand = 'right'){
  if (v.stage === 'still') return { title: 'Tieni fermo il telefono', sub: v.note === 'fermo' ? 'Si è mosso: tienilo fermo ancora un attimo, in piedi nel pugno' : 'In piedi nel pugno come il manico di una racchetta, la cima in alto, il display di lato: misuro i sensori', state: 'wait', arrow: '', dir: null };
  if (v.stage === 'gesture'){
    const side = calSide(v.want, hand), title = side === 'forehand' ? 'Dritto' : 'Rovescio', arrow = ARROW[v.want] || '';
    const move = v.want === 'L' ? 'verso sinistra' : 'verso destra';
    const failed = v.last && !v.last.ok && v.last.idx === v.idx;
    const why = failed ? (v.last.why === 'direzione' ? `${WHY.direzione} (${ARROW[v.last.dir] || '?'}): muovi ${move} ${arrow}` : WHY[v.last.why] || 'Riprova') : null;
    if (!v.ready) return { title: `${title} ${arrow}`, sub: why || (v.note === 'idle' ? `Non sento movimenti: un colpetto ${move}` : 'Fermo un attimo al centro…'), state: why ? 'retry' : 'wait', arrow, dir: v.want, side };
    return { title: `${title} ${arrow}`, sub: why || `Ora: gesto naturale ${move}, con la stessa presa che userai in partita, poi fermati`, state: 'go', arrow, dir: v.want, side };
  }
  if (v.stage === 'review') return v.pass === false
    ? { title: 'Rifacciamo i gesti', sub: v.why === 'piccolo' ? 'Gesti troppo piccoli: più ampi e decisi' : v.why === 'squilibrio' ? 'Un gesto era molto più debole dell’altro: rifai i due con la stessa decisione' : 'Non ho distinto i due versi: fai i gesti davvero da una parte all’altra', state: 'retry', arrow: '', dir: null }
    : { title: 'Racchetta pronta ✓', sub: 'Ora le palle vere', state: 'ok', arrow: '', dir: null };
  if (v.stage === 'done') return { title: 'Racchetta pronta ✓', sub: 'Ora le palle vere', state: 'ok', arrow: '', dir: null };
  return { title: 'Collego il telefono…', sub: '', state: 'wait', arrow: '', dir: null };
}
