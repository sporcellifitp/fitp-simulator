// Calibrazione giocando (B28, 12/11/2026, richiesta dell'utente allo stand delle Nitto ATP Finals: «Se ho tanta gente, la
// calibrazione ogni volta me la rallenta… Per me la calibrazione deve avvenire direttamente giocando: si parte con qualche
// scambio, il software deve capire bene destra e sinistra, velocità ed i parametri necessari, e poi dopo circa 10-15
// secondi di scambi, parte il match vero»).
//
// Due cose, tutte e due pure (senza DOM né motore: le usano il gioco, il telefono simulato dei test e il banco
// scripts/audit/scambi-di-prova.mjs):
//
// 1. L'opzione dello stand «Calibrazione» (pannello dell'addetto, natpf_kiosk.js; salvata in localStorage):
//      'play'   Giocando (di base): il telefono parte subito con il profilo semplice (verso dalla gravità, tipo di colpo dalla
//               forma, forza dalla velocità vera: quello di «Salta») e a ogni partita nuova gli scambi di prova insegnano al
//               gioco il resto, da capo;
//      'gesti'  Con i gesti: la calibrazione di prima (fermo, un dritto e un rovescio a vuoto), prima della partita;
//      'none'   Nessuna: profilo semplice senza scambi di prova (il gioco impara dai primi colpi veri, come «Salta»).
//    Dall'indirizzo (?cal=giocando|gesti|nessuna) per le prove: comanda sulla scelta salvata, senza cambiarla.
//
// 2. Cosa si impara dagli scambi di prova (createTrialLearner). Il gioco SA da che parte manda ogni palla (alla destra o
//    alla sinistra di chi gioca): è l'informazione che i due gesti a vuoto davano chiedendo «dritto» e «rovescio». Da ogni
//    colpo di prova:
//      - il VERSO: un colpo su una palla a destra di chi gioca gira in senso antiorario visto dall'alto (+1: il dritto del
//        destro, il rovescio del mancino), su una palla a sinistra al contrario (−1). Vale per destri e mancini allo stesso
//        modo: la mano scelta nel gioco decide solo quale dei due si chiama dritto. Se il verso letto dal telefono (dalla
//        gravità: swing-detect.js, profilo semplice) non concorda con il lato delle palle, il segno si gira (sign = −1) e
//        il computer legge al contrario tutti i colpi di quel telefono (anche i colpi di prova già fatti); il verso atteso
//        mandato al telefono si gira anche lui, così il telefono resta coerente con se stesso (preparazioni, voti). Serve ai
//        browser che danno l'accelerazione con il segno opposto (motion-sign.js lo sa per iPhone e Android dal nome del
//        browser: questo lo misura);
//      - la FORZA di riferimento per verso (refs: mediana dei picchi; ref; rawRef sul picco vero), la SALITA abituale
//        (rises), il verso verticale del piatto (heads) e il CENTRO DELLA MIRA per verso (faceRef[verso].heading, che semina
//        natpf_gestures.createAimModel): gli stessi campi che la calibrazione con i gesti mette nel profilo
//        (site/js/tennis/calibration.js, review).
//    Livelli (level): 'full' almeno TRIAL.perSide colpi normali per verso · 'ok' almeno uno per verso (quanto i due gesti
//    di prima: un dritto e un rovescio) · 'partial' almeno due colpi ma da una parte sola (forza e salita valgono, l'altro
//    verso si impara dai primi colpi veri) · 'none' meno di due colpi: resta il profilo semplice. Con 'full', 'ok' e
//    'partial' il profilo non è più «semplice» (simple: false, trial: true).
//    Un colpo di prova conta se ha un verso, è un colpo normale (non un pallonetto o un tagliato) e non è debole rispetto
//    agli altri colpi di prova (una preparazione, un micro-movimento); per ogni palla conta il gesto più forte.

/* ---------- opzione dello stand ---------- */
export const CAL_MODE_KEY = 'natpf-tennis.calibrazione';
export const CAL_MODES = Object.freeze(['play', 'gesti', 'none']);
export const CAL_MODE_DEFAULT = 'play';
const CAL_ALIASES = Object.freeze({ play: 'play', giocando: 'play', gioco: 'play', gesti: 'gesti', gesto: 'gesti', none: 'none', nessuna: 'none', no: 'none' });
export const calModeOf = v => CAL_ALIASES[String(v ?? '').toLowerCase()] || CAL_MODE_DEFAULT;
const validMode = v => (Object.hasOwn(CAL_ALIASES, String(v ?? '').toLowerCase()) ? CAL_ALIASES[String(v).toLowerCase()] : null);
// dall'indirizzo (?cal=…): per le prove nel browser e le postazioni che lo vogliono fisso; null se non c'è
export function calModeFromUrl(search = typeof location !== 'undefined' ? location.search : ''){
  try { return validMode(new URLSearchParams(search || '').get('cal')); } catch { return null; }
}
let saved = null;
// la scelta salvata (pannello dello stand), senza l'indirizzo
export function readSavedCalMode(){
  if (saved) return saved;
  let v = null; try { v = localStorage.getItem(CAL_MODE_KEY); } catch {}
  return (saved = calModeOf(v));
}
// la scelta che vale adesso: l'indirizzo, se c'è, altrimenti quella salvata
export const readCalMode = search => calModeFromUrl(search) || readSavedCalMode();
export function writeCalMode(mode){ const v = calModeOf(mode); saved = v; try { localStorage.setItem(CAL_MODE_KEY, v); } catch {} return v; }
export const nextCalMode = (mode = readSavedCalMode()) => CAL_MODES[(CAL_MODES.indexOf(calModeOf(mode)) + 1) % CAL_MODES.length];
// per i test: dimentica la scelta letta
export const forgetCalMode = () => { saved = null; };
const CAL_LABEL = Object.freeze({ play: 'Giocando', gesti: 'Con i gesti', none: 'Nessuna' });
export const calModeButton = (mode = readSavedCalMode(), forced = false) => `${CAL_LABEL[calModeOf(mode)]}${forced ? ' (indirizzo)' : ''}`;
export function calModeToast(mode, forced = false){
  const m = calModeOf(mode);
  const t = m === 'play' ? 'Calibrazione giocando: niente gesti a vuoto; ogni partita comincia con circa 10 secondi di scambi di prova, poi il match da 0-0'
    : m === 'gesti' ? 'Calibrazione con i gesti: prima della partita telefono fermo, un dritto e un rovescio a vuoto, come prima'
    : 'Nessuna calibrazione: si gioca subito, il gioco impara dai primi colpi veri (forza meno precisa all’inizio)';
  return forced ? `Calibrazione salvata «${CAL_LABEL[m]}», ma in questa pagina comanda l’indirizzo (?cal=…)` : `${t}. Vale dalla prossima partita; resta salvata`;
}

/* ---------- scambi di prova: tempi e numeri ---------- */
// perSide: colpi normali per verso per il profilo «pieno»; balls: palle di base (due per lato, alternate); maxBalls: palle
// al massimo (le ultime vanno dal lato che ha meno colpi); maxS: tetto in secondi dalla prima palla (allo scadere il match
// parte comunque con quello che si è imparato); intro: s tra «Scambi di prova» e la prima palla; gap: s tra il colpo e la
// palla dopo; miss: s tra una palla persa e la palla dopo; outro: s di «Si comincia!» prima del match
export const TRIAL = Object.freeze({ perSide: 2, balls: 4, maxBalls: 6, maxS: 16, intro: 1.2, gap: .85, miss: .5, outro: 1.1,
  minTotal: 2, signMin: 2, signFlip: .25, signKeep: .75, weak: .5 });

const median = a => { const v = [...a].sort((x, y) => x - y), m = v.length >> 1; return v.length ? (v.length % 2 ? v[m] : (v[m - 1] + v[m])/2) : NaN; };
const wrapDeg = a => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
const circMedian = a => (a.length ? wrapDeg(a[0] + median(a.map(h => wrapDeg(h - a[0])))) : null);
const fin = Number.isFinite;

// lato della palla → verso atteso del colpo: palla alla destra di chi gioca +1, alla sinistra −1 (per destri e mancini)
export const wantOfBallSide = right => (right ? 1 : -1);
// lato chiesto ('forehand' | 'backhand') e mano → verso atteso: il dritto del destro è +1, quello del mancino −1
export const wantOfSide = (side, hand = 'right') => ((side === 'forehand') !== (hand === 'left') ? 1 : -1);

// Lato della palla numero i (da 0) degli scambi di prova: le prime TRIAL.balls alternate dritto, rovescio; poi dal lato
// che ha meno colpi imparati (counts: { forehand, backhand }), a parità alternando. Funzione pura
export function trialSide(i, counts = null){
  if (i < TRIAL.balls || !counts) return i % 2 ? 'backhand' : 'forehand';
  const f = counts.forehand || 0, b = counts.backhand || 0;
  return f < b ? 'forehand' : b < f ? 'backhand' : i % 2 ? 'backhand' : 'forehand';
}
// Gli scambi di prova sono finiti? balls: palle già giocate (colpite o perse); counts: colpi imparati per lato; t: secondi
// dalla prima palla. Finiti appena ci sono perSide colpi per lato (dopo almeno TRIAL.balls palle non serve aspettare),
// oppure a maxBalls palle, oppure a maxS secondi: non si resta mai fermi
export function trialDone({ balls = 0, counts = null, t = 0 } = {}){
  const f = counts?.forehand || 0, b = counts?.backhand || 0;
  if (f >= TRIAL.perSide && b >= TRIAL.perSide) return 'imparato';
  if (balls >= TRIAL.maxBalls) return 'palle';
  if (t >= TRIAL.maxS) return 'tempo';
  return null;
}

export function createTrialLearner(){
  // un campione per palla: { ball, raw (verso grezzo del telefono), want (verso atteso dal lato della palla), peak, rawPeak,
  // rise, heading, head, normal }
  let samples = [], sign = 1, flips = 0;
  const votes = () => { let agree = 0, against = 0; for (const x of samples) if (x.raw && x.want){ if (x.raw === x.want) agree++; else against++; } return { agree, against }; };
  const decide = () => {
    const { agree, against } = votes(), n = agree + against;
    if (n < TRIAL.signMin) return sign;
    const share = agree/n, next = share <= TRIAL.signFlip ? -1 : share >= TRIAL.signKeep ? 1 : sign;
    if (next !== sign){ sign = next; flips++; }
    return sign;
  };
  // colpi che insegnano i riferimenti: normali, con un verso, e non deboli rispetto agli altri (una preparazione letta
  // come colpo vale meno della metà del proprio colpo)
  const teaching = () => {
    const ok = samples.filter(x => x.normal && x.raw && fin(x.peak));
    const m = median(ok.map(x => x.peak));
    return ok.filter(x => !(x.peak < TRIAL.weak*m));
  };
  const byDir = () => { const by = { 1: [], '-1': [] }; for (const x of teaching()) by[sign*x.raw].push(x); return by; };
  return {
    reset(){ samples = []; sign = 1; flips = 0; },
    // segno da applicare al verso che arriva dal telefono (+1 com'è, −1 al contrario)
    get sign(){ return sign; },
    get flips(){ return flips; },
    get samples(){ return samples.map(x => ({ ...x })); },
    get votes(){ return votes(); },
    // Un colpo arrivato durante uno scambio di prova, prima di leggerlo: vota il verso. ball: numero della palla; want: verso
    // atteso (+1 palla a destra di chi gioca, −1 a sinistra, 0 non si sa); s: il colpo come arriva dal telefono (dir, peak,
    // rawPeak, heading, head, shape.rise). Per ogni palla resta il gesto più forte. Restituisce il segno da usare da subito
    vote({ ball = 0, want = 0, s = null } = {}){
      if (!s) return sign;
      const raw = s.dir === 1 ? 1 : s.dir === -1 ? -1 : 0, peak = fin(s.peak) ? s.peak : NaN;
      const x = { ball, raw, want: want === 1 ? 1 : want === -1 ? -1 : 0, peak, rawPeak: fin(s.rawPeak) ? s.rawPeak : null,
        rise: fin(s.shape?.rise) ? s.shape.rise : null, heading: fin(s.heading) ? s.heading : null, head: fin(s.head) ? s.head : null, normal: false };
      const i = samples.findIndex(y => y.ball === ball);
      if (i < 0) samples.push(x);
      else if (!(samples[i].peak >= peak)) samples[i] = x;
      else return sign;                                   // gesto più debole per la stessa palla: non conta
      return decide();
    },
    // … e dopo averlo letto: normal = colpo normale (topspin o piatto) non debole per il gioco
    mark(ball, normal){ const x = samples.find(y => y.ball === ball); if (x) x.normal = !!normal; },
    // colpi imparati per verso (già corretto) e per lato di chi gioca con quella mano
    counts(hand = 'right'){
      const by = byDir(), fh = hand === 'left' ? -1 : 1;
      return { 1: by[1].length, '-1': by[-1].length, forehand: by[fh].length, backhand: by[-fh].length, total: by[1].length + by[-1].length };
    },
    level(){
      const by = byDir(), a = by[1].length, b = by[-1].length;
      if (a >= TRIAL.perSide && b >= TRIAL.perSide) return 'full';
      if (a >= 1 && b >= 1) return 'ok';
      return a + b >= TRIAL.minTotal ? 'partial' : 'none';
    },
    // Il profilo imparato, sopra quello semplice del telefono (base); null se non basta (resta il profilo semplice)
    profile(base = null){
      const level = this.level(); if (level === 'none') return null;
      const by = byDir(), all = [...by[1], ...by[-1]];
      const med = (a, k) => median(a.map(x => x[k]).filter(fin));
      const ref = Math.max(60, med(all, 'peak'));
      const out = { ...(base || {}), simple: false, trial: true, trialLevel: level, trialN: { 1: by[1].length, '-1': by[-1].length }, trialSign: sign,
        ref: +ref.toFixed(1), refs: { 1: +(by[1].length ? med(by[1], 'peak') : ref).toFixed(1), '-1': +(by[-1].length ? med(by[-1], 'peak') : ref).toFixed(1) } };
      // colpo tipico con la velocità vera al picco, se tutti i colpi la portano (come la calibrazione con i gesti)
      if (all.every(x => fin(x.rawPeak))) out.rawRef = +Math.max(60, med(all, 'rawPeak')).toFixed(1);
      const rises = {}, heads = {}, faceRef = {};
      for (const d of [1, -1]){
        const r = by[d].map(x => x.rise).filter(fin); if (r.length) rises[d] = +median(r).toFixed(3);
        const h = by[d].map(x => x.head).filter(fin); if (h.length) heads[d] = +median(h).toFixed(3);
        const f = by[d].map(x => x.heading).filter(fin); if (f.length) faceRef[d] = { heading: +circMedian(f).toFixed(1) };
      }
      if (Object.keys(rises).length) out.rises = rises; else delete out.rises;
      if (Object.keys(heads).length) out.heads = heads; else delete out.heads;
      if (Object.keys(faceRef).length) out.faceRef = faceRef; else delete out.faceRef;
      return out;
    },
  };
}

// Soglie per il telefono dal profilo imparato (messaggio «pf», pagine del telefono dal B28: quelle di prima lo ignorano e
// restano con le soglie del profilo semplice): colpo tipico per verso e soglie d'inizio e di picco come le calcola la
// calibrazione con i gesti dal verso più debole (calibration.js, review, percorso rapido). null senza profilo imparato
export function phoneThresholds(profile, noise = 3){
  if (!profile || profile.simple || !profile.refs) return null;
  const a = profile.refs[1], b = profile.refs[-1]; if (!(a > 0) || !(b > 0)) return null;
  const base = Math.min(a, b), clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)), n = Math.max(1, noise || 3);
  return { ref: +profile.ref.toFixed(1), refs: { 1: +a.toFixed(1), '-1': +b.toFixed(1) },
    on: +Math.max(n*4, Math.min(clamp(.22*base, 22, 180), base*.18)).toFixed(1), minPeak: +Math.max(n*5, Math.min(clamp(.36*base, 35, 300), base*.28)).toFixed(1) };
}
