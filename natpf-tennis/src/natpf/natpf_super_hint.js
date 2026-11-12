// B18.2 · tappa 2, gruppo 3 · Colpo super spiegato (miglioramento 4 del rapporto B16, appendice M4).
// La barra della potenza dice «Fortissimo» molto più spesso di quanto il super scatti (5–32 volte su 100): il motivo non
// si vedeva, e il super sembrava casuale. Le condizioni del super NON cambiano (decisione dell'utente del 29/10,
// natpf_stroke_outcome.superShot): qui si dice solo perché non è scattato.
//   • la prima volta che un giocatore fa un gesto fortissimo (barra della potenza piena) senza il super: la regola in
//     una riga e il motivo di questa volta;
//   • le volte dopo: «Super mancato: …» con il motivo in poche parole, al massimo una volta a punto (revisione del
//     12/11: a chi colpisce forte usciva 0,9–1,7 volte a punto e restava quasi sempre a schermo).
// Niente scritta se il gesto non era fortissimo, se il colpo è fallito (lo dice già l'esito) o se il super è scattato
// («SUPER!» c'è già). Vale contro la CPU; nello stesso schermo e nella sfida tra due computer non cambia niente.
// «Nuovo giocatore» e il chiosco fanno ripartire la spiegazione lunga (reset).
// Il motivo è quello vero (revisione del 12/11, bloccante 2). superShot risponde «in corsa o in allungo» ogni volta che
// la qualità del colpo è sotto SUPER.quality, ma la qualità è il prodotto di sette voci (natpf_skill.situationParts,
// scritte dal motore in natpfLastRacket.sit): corsa e palla lontana, preparazione, allungo, palla veloce, palla colpita
// dietro la riga di fondo, rimbalzo sopra la spalla, scambio lungo. Prima la scritta diceva sempre «eri in corsa»: nel
// banco chi colpiva era fermo, e le cause vere erano la palla profonda, la racchetta non portata indietro e lo scambio lungo.
import { SUPER, superStrength } from './natpf_stroke_outcome.js';

export const SUPER_RULE = 'Colpo super: gesto fortissimo, a tempo e da fermo, su una palla alta o lenta.';
export const SUPER_HINT = Object.freeze({ firstS: 5, shortS: 2.6 });
// le voci della situazione in poche parole (sit: natpfLastRacket.sit)
export const SITUATION_WORDS = Object.freeze({
  prep: 'non hai portato indietro la racchetta',
  deep: 'la palla era troppo profonda',
  fast: 'la palla era troppo veloce',
  high: 'la palla era sopra la spalla',
  stretch: 'eri in allungo',
  reach: 'la palla era lontana',
  running: 'eri in corsa',
  pressure: 'lo scambio era lungo',
  unknown: 'la palla era difficile o non hai portato indietro la racchetta',
});
const SIT_KEYS = Object.freeze(['prep', 'deep', 'fast', 'high', 'stretch', 'reach', 'pressure']);
const part = (sit, k) => (Number.isFinite(sit?.[k]) ? Math.max(.01, Math.min(1, sit[k])) : 1);
// pura: la voce della situazione che ha tolto il super. Se bastava portare indietro la racchetta (senza quella voce la
// qualità sarebbe stata sufficiente) è quella: è l'unica che chi gioca può correggere. Altrimenti la voce più bassa.
// «in corsa» solo se chi colpiva correva davvero (oltre metà della sua velocità), se no «la palla era lontana».
// null: senza le voci (registrazioni vecchie) o se nessuna voce è sotto 1
export function situationCause(sit){
  if (!sit || typeof sit !== 'object') return null;
  const q = SIT_KEYS.reduce((a, k) => a*part(sit, k), 1), prep = part(sit, 'prep');
  if (prep < 1 && q/prep >= SUPER.quality) return 'prep';
  const low = SIT_KEYS.reduce((a, k) => (part(sit, k) < part(sit, a) ? k : a));
  if (part(sit, low) >= 1) return null;
  return low === 'reach' && Number.isFinite(sit.running) && sit.running > .5 ? 'running' : low;
}
// motivo (natpf_stroke_outcome.superShot → why[0]) in poche parole; sit: le voci della situazione del colpo
// (natpfLastRacket.sit); null: niente da dire
export function superReason(why = '', sit = null){
  const w = String(why || '');
  if (!w || w === 'colpo non riuscito' || w === 'gesto non abbastanza forte' || w === 'gesto fortissimo') return null;
  if (w.startsWith('palla né alta')) return 'la palla era bassa e veloce';
  if (w === 'fuori tempo') return 'eri fuori tempo';
  if (w.startsWith('in corsa')) return SITUATION_WORDS[situationCause(sit) || 'unknown'];
  if (w.startsWith('colpo innaturale')) return 'la palla era dal lato sbagliato';
  if (w === 'gesto poco chiaro') return 'il gesto era poco chiaro';
  // tipo di colpo: il super vale solo con dritto, rovescio (liftato o piatto) e schiacciata
  if (w === 'colpo lob') return 'era un pallonetto';
  if (w === 'colpo drop') return 'era una palla corta';
  if (w.startsWith('colpo ')) return 'il colpo era tagliato';
  return null;
}
// pura: la scritta per un colpo di chi gioca (engine.natpfLastRacket). first: è la prima volta per questo giocatore.
// null: niente scritta. { text, seconds, first }
export function superHint(shot, { first = false } = {}){
  if (!shot || shot.super || shot.out?.failed || shot.out?.weak || shot.out?.netFault) return null;
  const strong = Number.isFinite(shot.superRel) ? shot.superRel >= 1 : superStrength(shot.intent || {}) >= SUPER.power;
  if (!strong) return null;
  const why = superReason(Array.isArray(shot.superWhy) ? shot.superWhy[0] : shot.superWhy, shot.sit);
  if (!why) return null;
  return first ? { text: `${SUPER_RULE} Questa volta ${why}.`, seconds: SUPER_HINT.firstS, first: true }
    : { text: `Super mancato: ${why}.`, seconds: SUPER_HINT.shortS, first: false };
}

export class NatpfSuperHint {
  constructor(engine){
    this.engine = engine;
    this.seen = false;       // questo giocatore ha già visto la spiegazione lunga
    this.shown = 0;          // scritte mostrate (per le misure)
    this._inPoint = false; this._strokes = 0;   // in questo punto la scritta è già uscita (al massimo una a punto)
    this.lastShot = null; this.until = 0; this.text = '';
    this.el = typeof document != 'undefined' && document.createElement ? this._build() : null;
  }
  _build(){
    const el = document.createElement('p');
    el.className = 'natpf-super-hint hidden'; el.id = 'natpf-super-hint'; el.setAttribute('role', 'status');
    (document.body || document.documentElement).appendChild(el);
    return el;
  }
  reset(){ this.seen = false; this._inPoint = false; this.until = 0; this.text = ''; this.el?.classList.add('hidden'); }
  update(dt, now = this.engine.elapsedTime){
    const E = this.engine, shot = E.natpfLastRacket;
    const solo = !E.isMultiplayer && !E.natpfSplit?.active && E.playerRole !== 'p2' && !E.autoPlayMode;
    // punto nuovo (si torna a servire): la scritta può uscire di nuovo
    // (anche quando il conto dei colpi dello scambio riparte: riscaldamento e sfide con il lanciapalle, senza servizio)
    const strokes = E.ball?.rallyStrokeCount || 0;
    if (E.phase === 'SERVE_STANCE' || E.phase === 'SERVE_TOSS' || strokes < this._strokes) this._inPoint = false;
    this._strokes = strokes;
    if (shot && shot !== this.lastShot){
      this.lastShot = shot;
      const h = solo && shot.who === 'player' && !this._inPoint ? superHint(shot, { first: !this.seen }) : null;
      if (h){ this.seen = true; this._inPoint = true; this.shown++; this.text = h.text; this.until = (now || 0) + h.seconds; if (this.el){ this.el.textContent = h.text; this.el.classList.toggle('is-first', h.first); } }
    }
    const on = solo && !!this.text && (now || 0) < this.until && ['RALLY', 'POINT_OVER', 'SERVE_STANCE'].includes(E.phase);
    if (this.el && this.el.classList.contains('hidden') === on) this.el.classList.toggle('hidden', !on);
  }
}
