// Conferma in due passi con il solo mouse (B43, controllo «solo mouse» del B39: voci A5 e n. 15). Le voci che chiudono
// la partita in corso o tolgono il telefono a chi gioca non partono più al primo clic: pannello dello stand in partita
// («Nuovo giocatore», «Classifica a schermo intero», «Telefono: Scollega») e «Torna al menu» della pausa.
// Il primo clic «arma» il pulsante (bordo rosa, scritta «Sicuro? Clicca ancora»), il secondo esegue. Un doppio clic non
// basta: il secondo clic conta solo se arriva almeno CONFIRM.gapMs dopo il primo (un doppio clic di Windows sta sotto i
// 500 ms; la guardia del doppio clic del B39 dice 400–450 ms). Senza il secondo clic entro CONFIRM.holdMs, o con un clic su
// un altro pulsante, il pulsante torna com'era. Niente finestre di Windows (confirm()): sul ledwall, dal telecomando dello
// staff e con il solo mouse non si chiuderebbero (B39 n. 16). Solo i clic: le chiamate dal codice (run(), il telecomando
// con la sua conferma sul telefono, le prove) restano immediate.
export const CONFIRM = Object.freeze({ gapMs: 450, holdMs: 5000, text: 'Sicuro? Clicca ancora' });

// Regola pura. armed: { key, at } del pulsante armato (o null); key: la voce cliccata; now: ms
// → { go: esegui adesso, armed: il nuovo stato }
export function confirmStep(armed, key, now, { gapMs = CONFIRM.gapMs, holdMs = CONFIRM.holdMs } = {}){
  if (armed && armed.key === key && now - armed.at <= holdMs){
    // secondo clic troppo vicino al primo (doppio clic): non conta, il pulsante resta armato
    if (now - armed.at < gapMs) return { go: false, armed };
    return { go: true, armed: null };
  }
  return { go: false, armed: { key, at: now } };
}

// Un pulsante armato per volta in un foglio. La scritta cambia nel <b> del pulsante (voci del pannello: «Classifica» ·
// «A schermo intero») o nel pulsante intero («Nuovo giocatore», «Torna al menu»); classe .armed per il colore
export class TwoStep {
  constructor({ now = () => performance.now(), text = CONFIRM.text, gapMs = CONFIRM.gapMs, holdMs = CONFIRM.holdMs, onChange = null } = {}){
    Object.assign(this, { now, text, gapMs, holdMs, onChange });
    this.armed = null; this.btn = null; this.label = null; this.saved = ''; this.timer = null;
  }
  isArmed(key){ return !!this.armed && (key == null || this.armed.key === key); }
  // clic vero sul pulsante: true = esegui la voce
  click(btn, key){
    const r = confirmStep(this.armed, key, this.now(), this);
    if (r.go){ this.disarm(); return true; }
    if (r.armed !== this.armed){ this.disarm(); this._arm(btn, r.armed); }
    return false;
  }
  _arm(btn, armed){
    this.armed = armed; this.btn = btn;
    this.label = btn?.querySelector?.('b') || btn || null;
    if (this.label){ this.saved = this.label.textContent; this.label.textContent = this.text; }
    btn?.classList?.add('armed'); btn?.setAttribute?.('aria-live', 'polite');
    clearTimeout(this.timer); this.timer = setTimeout(() => this.disarm(), this.holdMs);
    this.onChange?.(true);
  }
  disarm(){
    clearTimeout(this.timer); this.timer = null;
    if (!this.armed) return;
    if (this.label && this.label.textContent === this.text) this.label.textContent = this.saved;
    this.btn?.classList?.remove('armed'); this.btn?.removeAttribute?.('aria-live');
    this.armed = null; this.btn = null; this.label = null; this.saved = '';
    this.onChange?.(false);
  }
}
