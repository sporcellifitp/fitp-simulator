// Menu di pausa: in partita l'HUD mostra solo tabellone, game ed esito del colpo. Musica, voce, visuale, movimento
// della webcam, moviola, ricalibrazione del telefono, aiuto e ritorno al menu stanno qui (pulsante tondo ⏸ o Esc).
// I comandi riusano i pulsanti dell'HUD del motore base, che restano nel DOM ma non si vedono.
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const text = sel => (document.querySelector(sel)?.textContent || '').trim();

export class NatpfPause {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.el = $('natpf-pause');
    this.btn = $('natpf-pause-btn');
    this.btn?.addEventListener('click', e => { e.stopPropagation(); this.open(); });
    this.el?.addEventListener('pointerdown', e => e.stopPropagation());
    this.el?.addEventListener('click', e => {
      const b = e.target.closest('[data-pause]'); if (!b) return;
      e.stopPropagation(); this.run(b.dataset.pause);
    });
  }
  get isOpen(){ return !!this.el && !this.el.classList.contains('hidden'); }
  // in campo (lobby chiusa): partita, allenamento o P2 in una stanza
  get inGame(){ return document.documentElement.classList.contains('autoplay-mode') && !this.engine.autoPlayMode; }
  open(){ if (!this.el || !this.inGame) return; show(this.el); this.paint(); this.ui._syncPause(); this.el.querySelector('[data-pause="resume"]')?.focus(); }
  close(){ show(this.el, false); this.ui._syncPause(); }
  toggle(){ this.isOpen ? this.close() : this.open(); }
  run(cmd){
    const click = id => $(id)?.click();
    switch (cmd){
      case 'resume': this.close(); return;
      case 'music': click('btn-audio-toggle'); break;
      case 'voice': click('btn-voice-toggle'); break;
      case 'view': this.engine.setViewMode(this.engine.viewMode === 'first' ? 'third' : 'first'); break;
      case 'move': this.engine.natpfBody?.toggle(); break;
      case 'replay': this.close(); click('btn-replay-trigger'); return;
      case 'phone': this.close(); this.ui.openPhone(); return;
      case 'help': this.close(); this.ui.onboarding.open(); return;
      case 'menu': this.close(); this.ui.backToMenu(); return;
    }
    this.paint();
  }
  paint(){
    if (!this.isOpen) return;
    const set = (cmd, label, on) => { const b = this.el.querySelector(`[data-pause="${cmd}"]`); if (!b) return; b.querySelector('b').textContent = label; b.classList.toggle('on', !!on); };
    const audio = this.engine.audioEngine;
    const music = audio ? !audio.muted : true;
    set('music', music ? 'Sì' : 'No', music);
    const voice = audio?.voice ? !!audio.voice.enabled : !/no/i.test(text('[data-voice-label]'));
    set('voice', voice ? 'Sì' : 'No', voice);
    set('view', this.engine.viewMode === 'first' ? '1ª persona' : '3ª persona', true);
    const webcam = this.ui.controller === 'webcam';
    show(this.el.querySelector('[data-pause="move"]'), webcam && !!this.engine.natpfBody);
    if (webcam && this.engine.natpfBody) set('move', this.engine.natpfBody.enabled ? 'Segue il corpo' : 'Automatico', this.engine.natpfBody.enabled);
    show(this.el.querySelector('[data-pause="phone"]'), this.ui.controller === 'phone');
    show(this.el.querySelector('[data-pause="replay"]'), !this.ui.training?.active);
    const kicker = this.el.querySelector('.sheet-kicker'); if (kicker) kicker.textContent = this.ui.training?.active ? 'Allenamento in pausa' : 'Partita in pausa';
  }
}
