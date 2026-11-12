// B18.2 · tappa 2, gruppo 3 · Colpo super spiegato (miglioramento 4 del rapporto B16, appendice M4).
// La barra della potenza dice «Fortissimo» molto più spesso di quanto il super scatti (5–32 volte su 100): il motivo non
// si vedeva, e il super sembrava casuale. Le condizioni del super NON cambiano (decisione dell'utente del 29/10,
// natpf_stroke_outcome.superShot): qui si dice solo perché non è scattato.
//   • la prima volta che un giocatore fa un gesto fortissimo (barra della potenza piena) senza il super: la regola in
//     una riga e il motivo di questa volta;
//   • le volte dopo, a ogni gesto fortissimo senza super: «Super mancato: …» con il motivo in poche parole.
// Niente scritta se il gesto non era fortissimo, se il colpo è fallito (lo dice già l'esito) o se il super è scattato
// («SUPER!» c'è già). Vale contro la CPU; nello stesso schermo e nella sfida tra due computer non cambia niente.
// «Nuovo giocatore» e il chiosco fanno ripartire la spiegazione lunga (reset).
import { SUPER, superStrength } from './natpf_stroke_outcome.js';

export const SUPER_RULE = 'Colpo super: gesto fortissimo, a tempo e da fermo, su una palla alta o lenta.';
export const SUPER_HINT = Object.freeze({ firstS: 5, shortS: 2.6 });
// motivo (natpf_stroke_outcome.superShot → why[0]) in poche parole; null: niente da dire
export function superReason(why = ''){
  const w = String(why || '');
  if (!w || w === 'colpo non riuscito' || w === 'gesto non abbastanza forte' || w === 'gesto fortissimo') return null;
  if (w.startsWith('palla né alta')) return 'la palla era bassa e veloce';
  if (w === 'fuori tempo') return 'eri fuori tempo';
  if (w.startsWith('in corsa')) return 'eri in corsa';
  if (w.startsWith('colpo innaturale')) return 'la palla era dal lato sbagliato';
  if (w === 'gesto poco chiaro') return 'il gesto era poco chiaro';
  if (w.startsWith('colpo ')) return 'vale solo con dritto, rovescio o schiacciata, non con i colpi tagliati o il pallonetto';
  return null;
}
// pura: la scritta per un colpo di chi gioca (engine.natpfLastRacket). first: è la prima volta per questo giocatore.
// null: niente scritta. { text, seconds, first }
export function superHint(shot, { first = false } = {}){
  if (!shot || shot.super || shot.out?.failed || shot.out?.weak || shot.out?.netFault) return null;
  const strong = Number.isFinite(shot.superRel) ? shot.superRel >= 1 : superStrength(shot.intent || {}) >= SUPER.power;
  if (!strong) return null;
  const why = superReason(Array.isArray(shot.superWhy) ? shot.superWhy[0] : shot.superWhy);
  if (!why) return null;
  return first ? { text: `${SUPER_RULE} Questa volta ${why}.`, seconds: SUPER_HINT.firstS, first: true }
    : { text: `Super mancato: ${why}.`, seconds: SUPER_HINT.shortS, first: false };
}

export class NatpfSuperHint {
  constructor(engine){
    this.engine = engine;
    this.seen = false;       // questo giocatore ha già visto la spiegazione lunga
    this.lastShot = null; this.until = 0; this.text = '';
    this.el = typeof document != 'undefined' && document.createElement ? this._build() : null;
  }
  _build(){
    const el = document.createElement('p');
    el.className = 'natpf-super-hint hidden'; el.id = 'natpf-super-hint'; el.setAttribute('role', 'status');
    (document.body || document.documentElement).appendChild(el);
    return el;
  }
  reset(){ this.seen = false; this.until = 0; this.text = ''; this.el?.classList.add('hidden'); }
  update(dt, now = this.engine.elapsedTime){
    const E = this.engine, shot = E.natpfLastRacket;
    const solo = !E.isMultiplayer && !E.natpfSplit?.active && E.playerRole !== 'p2' && !E.autoPlayMode;
    if (shot && shot !== this.lastShot){
      this.lastShot = shot;
      const h = solo && shot.who === 'player' ? superHint(shot, { first: !this.seen }) : null;
      if (h){ this.seen = true; this.text = h.text; this.until = (now || 0) + h.seconds; if (this.el){ this.el.textContent = h.text; this.el.classList.toggle('is-first', h.first); } }
    }
    const on = solo && !!this.text && (now || 0) < this.until && ['RALLY', 'POINT_OVER', 'SERVE_STANCE'].includes(E.phase);
    if (this.el && this.el.classList.contains('hidden') === on) this.el.classList.toggle('hidden', !on);
  }
}
