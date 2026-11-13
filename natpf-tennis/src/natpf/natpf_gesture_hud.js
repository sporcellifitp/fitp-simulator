// Etichetta del gesto sul computer, in basso al centro: dice a colpo d'occhio che il gesto del telefono è arrivato
// (rilevato), come è stato letto (dritto o rovescio, tipo di colpo, verso) e che cosa ne ha fatto il gioco
// (applicato): in attesa della palla, colpito con il voto, troppo presto / tardi, oppure ignorato e perché.
// Prima sul computer si vedeva solo l'esito dei colpi andati a segno: un gesto ignorato o in anticipo non lasciava
// nessun segno e sembrava «perso».
const SHOT = { topspin: 'Top spin', flat: 'Piatto', lob: 'Pallonetto', slice: 'Tagliato', drop: 'Palla corta', smash: 'Schiacciata' };
export const GESTURE_HUD = Object.freeze({ show: 1.6, wait: 1.2 });

// testo dell'etichetta (funzione pura, per i test): ev = evento del motore da natpfSwingToEngine, s = colpo del telefono
export function gestureLabel(ev = {}, s = {}){
  if (ev.ignored) return { arrow: '·', title: 'Gesto ignorato', sub: ev.ignored, state: 'ignored' };
  const shot = ev.natpf?.shot, side = ev.side === 'backhand' ? 'Rovescio' : ev.side === 'forehand' ? 'Dritto' : 'Colpo';
  const arrow = s.vert === 'up' || shot === 'lob' ? '↑' : s.dir === 1 ? '←' : s.dir === -1 ? '→' : '•';
  return { arrow, title: shot === 'smash' ? 'Schiacciata' : side, sub: shot && shot !== 'smash' ? SHOT[shot] || shot : '', state: 'read' };
}
// esito del colpo dal giro dell'aptica (kind, voto) e dall'anello (q: colore e scritta di natpf_shot_feedback)
// Colpo difensivo (molto fuori tempo, la palla resta in gioco): dal B18 arriva come «hit» con defensive (prima come
// «fault»); l'etichetta dice ancora «Molto in anticipo» / «Molto in ritardo» in rosso, o «Fuori · troppo presto» se esce
export function gestureOutcome(e = {}, q = null){
  // B37: in partita il fuori e la rete si dicono quando la palla tocca terra o la rete (lateOutcome); al colpo «Colpita»
  if (e.kind === 'hit' && q?.wait) return { state: 'mid', text: 'Colpita', wait: true };
  const defensive = e.kind === 'hit' && (!!e.defensive || /DEFENSIVE/.test(e.grade || ''));
  if (defensive && q?.color !== 'red') return { state: 'bad', text: /EARLY/.test(e.grade || '') ? 'Molto in anticipo' : 'Molto in ritardo' };
  if (e.kind === 'hit') return { state: q?.color === 'red' ? 'bad' : q?.color === 'green' ? 'ok' : 'mid', text: q?.text || q?.label || 'Colpita' };
  if (e.kind === 'whiff') return { state: 'bad', text: /EARLY/i.test(e.grade || '') ? 'Troppo presto' : 'Troppo tardi' };
  return null;
}

export class NatpfGestureHud {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.el = document.getElementById('natpf-gesture');
    this.cur = null;
    ui.phone?.onSwing?.((ev, s) => this.onGesture(ev, s));
  }
  onGesture(ev, s){
    if (!this.el || this.engine.autoPlayMode) return;
    const label = gestureLabel(ev, s);
    this.cur = { ...label, t: performance.now(), done: label.state === 'ignored' };
    this._paint();
    // dopo che il motore ha deciso (stesso giro): swing in attesa della palla?
    setTimeout(() => { if (this.cur && !this.cur.done && this.engine.pendingUserSwing){ this.cur = { ...this.cur, state: 'wait', status: 'aspetta la palla' }; this._paint(); } }, 0);
  }
  // esito dal giro dell'aptica del giocatore locale (natpf_ui.feedback)
  onFeedback(e, q){
    if (!this.cur || this.cur.done || performance.now() - this.cur.t > 1500) return;
    const out = gestureOutcome(e, q); if (!out) return;
    this.cur = { ...this.cur, state: out.state, status: out.text, done: true, t: performance.now(), wait: !!out.wait };
    this._paint();
  }
  // B37: verdetto arrivato con la palla a terra (natpf_shot_feedback.settle): l'etichetta del colpo che aspettava lo dice
  lateOutcome(q){
    if (!this.cur?.wait || !q) return;
    const out = gestureOutcome({ kind: 'hit' }, q); if (!out) return;
    this.cur = { ...this.cur, state: out.state, status: out.text, done: true, t: performance.now(), wait: false };
    this._paint();
  }
  update(){
    if (!this.cur || !this.el) return;
    const age = (performance.now() - this.cur.t)/1000;
    // nessun esito: lo swing in attesa è scaduto senza palla, o non c'era niente da colpire
    if (!this.cur.done && age > GESTURE_HUD.wait && !this.engine.pendingUserSwing){ this.cur = { ...this.cur, state: 'ignored', status: 'nessuna palla da colpire', done: true, t: performance.now() }; this._paint(); return; }
    if (this.cur.done && age > GESTURE_HUD.show){ this.cur = null; this.el.classList.add('hidden'); }
  }
  _paint(){
    const c = this.cur, el = this.el; if (!el) return;
    if (!c){ el.classList.add('hidden'); return; }
    el.classList.remove('hidden'); el.dataset.state = c.state;
    el.querySelector('[data-g="arrow"]').textContent = c.arrow;
    el.querySelector('[data-g="title"]').textContent = c.title;
    el.querySelector('[data-g="sub"]').textContent = [c.sub, c.status].filter(Boolean).join(' · ');
  }
}
